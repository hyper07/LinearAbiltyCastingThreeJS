import * as THREE from 'three';
import { CELL, STATS, TEAM_COLORS, TICK, FACTIONS } from './rules.js';
import { heightAt, rng, ROCK, WATER, FOREST, WATER_LEVEL } from './map.js';
import { unitGeometry, buildingGeometry, crystalGeometry, loadKitBuildings, loadModelSlots } from './models.js';

/**
 * Draws a Shardfront match (sim.js) for one seat: the terrain, crystals,
 * units (instanced, one draw per faction and type), buildings, shots and
 * blasts, selection rings, and the fog of war — black where that seat has
 * never looked, dim where it isn't looking now. It only reads the
 * simulation; input and the HUD are RtsGame's.
 */

const PITCH = 0.98; // camera tilt from flat, radians
const MIN_ZOOM = 24;
const MAX_ZOOM = 150;

/** Darken anything drawn with this material by the fog of war (a texture over the map). */
function fogify(material, fow) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFow = fow.texture;
    shader.uniforms.uFowSize = fow.size;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFowUv;\nuniform float uFowSize;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fowW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fowW = instanceMatrix * fowW;
        #endif
        fowW = modelMatrix * fowW;
        vFowUv = fowW.xz / uFowSize;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFowUv;\nuniform sampler2D uFow;')
      .replace('#include <dithering_fragment>', `
        float fow = texture2D(uFow, vFowUv).r;
        float shade = fow < 0.43 ? mix(0.07, 0.48, fow / 0.43) : mix(0.48, 1.0, (fow - 0.43) / 0.57);
        gl_FragColor.rgb *= shade;
        #include <dithering_fragment>`);
  };
  material.customProgramCacheKey = () => 'fow';
  return material;
}

export class RtsView {
  /**
   * @param {HTMLElement} host where the canvas goes
   * @param {import('./sim.js').Sim} sim
   * @param {number} seat whose eyes we see through
   */
  constructor(host, sim, seat) {
    this.sim = sim;
    this.seat = seat;
    this.n = sim.n;
    this.size = sim.map.size;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'rts__canvas';
    host.append(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0f14');
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 1200);
    this.target = new THREE.Vector3();
    this.zoom = 52;
    this.time = 0;
    this.selected = new Set();
    this.hover = null;
    this.effects = [];
    this.shots = [];
    this.floaters = [];

    // The fog of war: one byte a cell, drawn over everything.
    this.fowData = new Uint8Array(this.n * this.n);
    const tex = new THREE.DataTexture(this.fowData, this.n, this.n, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.fow = { texture: { value: tex }, size: { value: this.size } };
    this._fowTick = -1;

    this._lights();
    this._terrain();
    this._crystals();
    this._units();
    this._helpers();
    this.buildings = new Map();
    this.kit = {};
    this.slots = {};
    this.credits = [];
    // Your own models (library/my-models/shardfront.json), where there are any.
    this.ready = loadModelSlots().then(({ slots, credits }) => {
      for (const slot of Object.values(slots)) for (const part of slot.parts) part.material = fogify(Array.isArray(part.material) ? part.material[0].clone() : part.material.clone(), this.fow);
      this.slots = slots;
      this.credits = credits;
      for (const key of Object.keys(slots)) this._dropUnitMesh(key);
      for (const [id, b] of this.buildings) {
        if (slots[`${b.faction}:${b.type}`] && !b.slot) {
          this.scene.remove(b.group);
          this.buildings.delete(id);
        }
      }
    });
    loadKitBuildings().then((kit) => {
      this.kit = kit;
      for (const k of Object.values(kit)) k.traverse((o) => o.isMesh && (o.material = fogify(o.material.clone(), this.fow)));
      // Rebuild the League's buildings already standing with the kit's looks.
      for (const [id, b] of this.buildings) {
        if (b.faction === 'league' && kit[b.type] && !b.kit) {
          this.scene.remove(b.group);
          this.buildings.delete(id);
        }
      }
    });

    // Start looking between the base and its crystals.
    const start = sim.map.starts[seat];
    const site = sim.map.sites.find((s) => s.cx === start.cx && s.cz === start.cz);
    const field = (site?.nodes ?? []).map((i) => sim.map.nodes[i]);
    const fx = field.length ? field.reduce((n, nd) => n + nd.cx, 0) / field.length : start.cx;
    const fz = field.length ? field.reduce((n, nd) => n + nd.cz, 0) / field.length : start.cz;
    this.lookAt(((start.cx + fx) / 2 + 0.5) * CELL, ((start.cz + fz) / 2 + 0.5) * CELL);
  }

  /* ------------------------------------------------------------- set-up */

  _lights() {
    this.scene.add(new THREE.HemisphereLight('#cfe3ff', '#3b3524', 1.1));
    const sun = new THREE.DirectionalLight('#fff3dc', 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -90;
    s.right = 90;
    s.top = 90;
    s.bottom = -90;
    s.near = 1;
    s.far = 400;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.6;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  _terrain() {
    const { n, size } = this;
    const map = this.sim.map;
    const geo = new THREE.PlaneGeometry(size, size, n, n);
    geo.rotateX(-Math.PI / 2);
    geo.translate(size / 2, 0, size / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const rand = rng(`${this.sim.seed}:ground`);
    const grass = new THREE.Color('#5d7f3a');
    const grassHi = new THREE.Color('#8aa04e');
    const dirt = new THREE.Color('#7a6446');
    const rock = new THREE.Color('#6b665f');
    const forest = new THREE.Color('#2f4a24');
    const sand = new THREE.Color('#b9a477');
    const deep = new THREE.Color('#2e3b3a');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = Math.round(pos.getX(i) / CELL);
      const z = Math.round(pos.getZ(i) / CELL);
      const h = map.heights[z * (n + 1) + x];
      pos.setY(i, h);
      let rocks = 0;
      let trees = 0;
      let wet = 0;
      for (const [ox, oz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const cx = x + ox;
        const cz = z + oz;
        if (cx < 0 || cz < 0 || cx >= n || cz >= n) continue;
        const b = map.block[cz * n + cx];
        if (b === ROCK) rocks++;
        else if (b === FOREST) trees++;
        else if (b === WATER) wet++;
      }
      c.copy(grass).lerp(grassHi, Math.min(1, Math.max(0, (h + 2) / 8)));
      if (rand() < 0.25) c.lerp(dirt, 0.35);
      if (trees) c.lerp(forest, trees / 4);
      if (rocks) c.lerp(rock, 0.4 + rocks * 0.15);
      if (wet) c.lerp(wet === 4 ? deep : sand, wet === 4 ? 1 : 0.8);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), this.fow);
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.groundColors = colors;

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(size / 2, WATER_LEVEL, size / 2),
      fogify(new THREE.MeshStandardMaterial({ color: '#2f7fa8', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82 }), this.fow)
    );
    this.scene.add(water);
    // The world beyond the map's edge.
    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size * 4).rotateX(-Math.PI / 2).translate(size / 2, -3, size / 2), new THREE.MeshBasicMaterial({ color: '#06080b' }));
    this.scene.add(beyond);

    // Rocks and trees on the cells that can't be walked.
    const rockSpots = [];
    const treeSpots = [];
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const b = map.block[z * n + x];
        if (b === ROCK && rand() < 0.75) rockSpots.push([x, z]);
        else if (b === FOREST && rand() < 0.8) treeSpots.push([x, z]);
      }
    }
    const rockGeo = new THREE.DodecahedronGeometry(1.25, 0);
    const rocks = new THREE.InstancedMesh(rockGeo, fogify(new THREE.MeshStandardMaterial({ color: '#7d776d', roughness: 1, flatShading: true }), this.fow), rockSpots.length);
    const o = new THREE.Object3D();
    rockSpots.forEach(([x, z], i) => {
      const wx = (x + 0.5) * CELL + (rand() - 0.5);
      const wz = (z + 0.5) * CELL + (rand() - 0.5);
      o.position.set(wx, heightAt(map, wx, wz) + 0.2, wz);
      o.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      const s = 0.8 + rand() * 0.9;
      o.scale.set(s, s * (0.7 + rand() * 0.9), s);
      o.updateMatrix();
      rocks.setMatrixAt(i, o.matrix);
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.scene.add(rocks);

    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.2, 5).translate(0, 0.6, 0);
    const crown = new THREE.ConeGeometry(1.1, 2.8, 6).translate(0, 2.4, 0);
    const treeMat = fogify(new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.9, flatShading: true }), this.fow);
    const trunkMat = fogify(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 }), this.fow);
    const crowns = new THREE.InstancedMesh(crown, treeMat, treeSpots.length);
    const trunks = new THREE.InstancedMesh(trunk, trunkMat, treeSpots.length);
    const tint = new THREE.Color();
    treeSpots.forEach(([x, z], i) => {
      const wx = (x + 0.5) * CELL + (rand() - 0.5) * 1.2;
      const wz = (z + 0.5) * CELL + (rand() - 0.5) * 1.2;
      o.position.set(wx, heightAt(map, wx, wz), wz);
      o.rotation.set(0, rand() * 6, 0);
      const s = 0.8 + rand() * 0.6;
      o.scale.set(s, s * (0.9 + rand() * 0.4), s);
      o.updateMatrix();
      crowns.setMatrixAt(i, o.matrix);
      trunks.setMatrixAt(i, o.matrix);
      crowns.setColorAt(i, tint.setHSL(0.27 + rand() * 0.07, 0.45, 0.6 + rand() * 0.3));
    });
    crowns.castShadow = true;
    trunks.castShadow = true;
    this.scene.add(crowns, trunks);
  }

  _crystals() {
    const nodes = this.sim.nodes();
    const mat = fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.1, emissive: '#1f8fb0', emissiveIntensity: 0.6, flatShading: true }), this.fow);
    this.crystalMesh = new THREE.InstancedMesh(crystalGeometry(), mat, Math.max(1, nodes.length));
    this.crystalMesh.castShadow = true;
    this.crystalIds = nodes.map((nd) => nd.id);
    this.scene.add(this.crystalMesh);
  }

  _units() {
    this.unitMeshes = new Map(); // `${faction}:${type}` → { body, trim, cap, hover }
    this.unitMats = {
      body: fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25, flatShading: true }), this.fow),
      trim: fogify(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2, emissive: '#000000' }), this.fow)
    };
  }

  _unitMesh(faction, type, need) {
    const key = `${faction}:${type}`;
    let m = this.unitMeshes.get(key);
    if (m && m.cap >= need) return m;
    const cap = Math.max(32, 2 ** Math.ceil(Math.log2(need + 1)));
    this._dropUnitMesh(key);
    const slot = this.slots[key];
    const built = unitGeometry(faction, type);
    // A model of your own: its parts, and a ring in the player's colour under it.
    const parts = slot ? slot.parts : [{ geometry: built.body, material: this.unitMats.body }];
    const trimGeo = slot ? new THREE.TorusGeometry(STATS[faction][type].radius * 1.1, 0.09, 4, 24).rotateX(Math.PI / 2).translate(0, 0.08, 0) : built.trim;
    const meshes = parts.map((p) => new THREE.InstancedMesh(p.geometry, p.material, cap));
    const trim = new THREE.InstancedMesh(trimGeo, this.unitMats.trim, cap);
    for (const mesh of [...meshes, trim]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.scene.add(mesh);
    }
    trim.setColorAt(0, new THREE.Color());
    m = { meshes, trim, cap, hover: built.hover && !slot };
    this.unitMeshes.set(key, m);
    return m;
  }

  _dropUnitMesh(key) {
    const m = this.unitMeshes.get(key);
    if (!m) return;
    for (const mesh of [...m.meshes, m.trim]) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    this.unitMeshes.delete(key);
  }

  _helpers() {
    // Selection rings.
    const ring = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }), 600);
    this.rings.frustumCulled = false;
    this.rings.count = 0;
    this.rings.renderOrder = 2;
    this.scene.add(this.rings);
    // Shots and blasts: glowing balls, fading to nothing.
    const glow = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.shotMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow, 512);
    this.shotMesh.frustumCulled = false;
    this.shotMesh.count = 0;
    this.scene.add(this.shotMesh);
    this.fxMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow.clone(), 256);
    this.fxMesh.frustumCulled = false;
    this.fxMesh.count = 0;
    this.scene.add(this.fxMesh);
    // Where a building would go.
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.35, depthWrite: false }));
    this.ghost.visible = false;
    this.scene.add(this.ghost);
    // The pulse where an order was given.
    this.ping = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, depthWrite: false }));
    this.ping.visible = false;
    this.ping.renderOrder = 3;
    this.scene.add(this.ping);
    this.rally = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6).translate(0, 0.8, 0), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
    this.rally.visible = false;
    this.scene.add(this.rally);
  }

  /* ------------------------------------------------------------- camera */

  lookAt(x, z) {
    this.target.set(Math.max(0, Math.min(this.size, x)), 0, Math.max(0, Math.min(this.size, z)));
  }

  pan(dx, dz) {
    this.lookAt(this.target.x + dx, this.target.z + dz);
  }

  zoomBy(f) {
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * f));
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.width = w;
    this.height = h;
  }

  _placeCamera() {
    const y = heightAt(this.sim.map, this.target.x, this.target.z);
    this.target.y = y;
    this.camera.position.set(this.target.x, y + Math.sin(PITCH) * this.zoom, this.target.z + Math.cos(PITCH) * this.zoom);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    this.sun.position.set(this.target.x + 60, y + 120, this.target.z + 40);
    this.sun.target.position.copy(this.target);
    this.sun.target.updateMatrixWorld();
  }

  /** The ground point under a screen position (pixels), or null off the map. */
  groundAt(px, py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1), this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    if (d.y >= 0) return null;
    let lo = 0;
    let hi = (o.y - (WATER_LEVEL - 4)) / -d.y;
    // March, then halve the step.
    const step = 2;
    let t = 0;
    for (; t < hi; t += step) {
      const x = o.x + d.x * t;
      const z = o.z + d.z * t;
      if (o.y + d.y * t <= heightAt(this.sim.map, x, z)) break;
    }
    lo = Math.max(0, t - step);
    hi = t;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      const x = o.x + d.x * m;
      const z = o.z + d.z * m;
      if (o.y + d.y * m <= heightAt(this.sim.map, x, z)) hi = m;
      else lo = m;
    }
    const x = o.x + d.x * hi;
    const z = o.z + d.z * hi;
    if (x < 0 || z < 0 || x > this.size || z > this.size) return null;
    return { x, z };
  }

  /** Where a world point lands on screen (pixels), and whether it's in front. */
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, front: v.z < 1 };
  }

  /** Whether this seat can see the entity now (enemy buildings: once seen, remembered). */
  shows(e) {
    if (e.owner === this.seat || e.kind === 'node') return true;
    if (e.kind === 'building') return Boolean(e.seen & (1 << this.seat)) || this.sim.visible(this.seat, e);
    return this.sim.visible(this.seat, e);
  }

  /** The entity under a screen point, nearest first. */
  pick(px, py) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.sim.entities.values()) {
      if (e.dead || !this.shows(e)) continue;
      const y = heightAt(this.sim.map, e.x, e.z) + (e.kind === 'building' ? 1.5 : 0.8);
      const p = this.toScreen(e.x, y, e.z);
      if (!p.front) continue;
      const edge = this.toScreen(e.x + (e.kind === 'unit' ? e.radius + 0.6 : (e.size * CELL) / 2), y, e.z);
      const r = Math.max(10, Math.abs(edge.x - p.x));
      const d = Math.hypot(p.x - px, p.y - py);
      if (d <= r && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** This seat's units inside a screen rectangle. */
  inBox(x0, y0, x1, y1) {
    const out = [];
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    for (const e of this.sim.entities.values()) {
      if (e.dead || e.kind !== 'unit' || e.owner !== this.seat) continue;
      const p = this.toScreen(e.x, heightAt(this.sim.map, e.x, e.z) + 0.8, e.z);
      if (p.front && p.x >= ax && p.x <= bx && p.y >= ay && p.y <= by) out.push(e);
    }
    return out;
  }

  /** The ground corners of the screen, for the minimap's view box. */
  viewCorners() {
    return [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]].map(([x, y]) => this.groundAt(x, y) ?? this._planeAt(x, y));
  }

  _planeAt(px, py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1), this.camera);
    const t = (ray.ray.origin.y - 0) / Math.max(0.01, -ray.ray.direction.y);
    return { x: ray.ray.origin.x + ray.ray.direction.x * t, z: ray.ray.origin.z + ray.ray.direction.z * t };
  }

  /* ------------------------------------------------------------- effects */

  /** The simulation's news: shots, blasts, deaths. */
  absorb(events) {
    const seen = (x, z) => this.sim.players[this.seat].vision[this.sim.cellIndex(x, z)];
    for (const ev of events) {
      if (ev.type === 'shot') {
        if (!seen(ev.x, ev.z) && !seen(ev.tx, ev.tz)) continue;
        const look = FACTIONS[ev.faction]?.look;
        this.shots.push({ sx: ev.x, sz: ev.z, tx: ev.tx, tz: ev.tz, t: 0, dur: ev.dur, arc: ev.kind === 'siege', color: new THREE.Color(ev.kind === 'tower' ? '#ffd27a' : look?.glow ?? '#fff'), size: ev.kind === 'siege' ? 0.45 : 0.18 });
      } else if (ev.type === 'blast' && seen(ev.x, ev.z)) {
        this._fx(ev.x, ev.z, 0.6, ev.r, 0.45, '#ff9a3c');
      } else if (ev.type === 'hit' && seen(ev.x, ev.z)) {
        this._fx(ev.x, ev.z, 0.2, 0.9, 0.2, '#ffe6a0');
      } else if (ev.type === 'death' && !ev.quiet && seen(ev.x, ev.z)) {
        const big = ev.kind === 'building' ? ev.size * CELL * 0.6 : 1.6;
        this._fx(ev.x, ev.z, big * 0.3, big, ev.kind === 'building' ? 0.9 : 0.5, ev.kind === 'node' ? '#7ef0ff' : '#ff7a2c');
      } else if (ev.type === 'deliver' && ev.owner === this.seat) {
        this.floaters.push({ x: ev.x, z: ev.z, t: 0, text: `+${ev.amount}` });
      }
    }
  }

  _fx(x, z, r0, r1, dur, color) {
    if (this.effects.length > 240) this.effects.shift();
    this.effects.push({ x, z, y: heightAt(this.sim.map, x, z) + 0.6, r0, r1, t: 0, dur, color: new THREE.Color(color) });
  }

  /** Show the order pulse at a point. */
  pulse(x, z, color = '#4ade80') {
    this.ping.material.color.set(color);
    this.ping.position.set(x, heightAt(this.sim.map, x, z) + 0.15, z);
    this.ping.userData.t = 0;
    this.ping.visible = true;
  }

  /** Where a building would go: green if it can, red if it can't; null hides it. */
  showGhost(spot) {
    if (!spot) {
      this.ghost.visible = false;
      return;
    }
    const w = spot.size * CELL;
    const x = (spot.x0 + spot.size / 2) * CELL;
    const z = (spot.z0 + spot.size / 2) * CELL;
    this.ghost.scale.set(w, 2.5, w);
    this.ghost.position.set(x, heightAt(this.sim.map, x, z) + 1.25, z);
    this.ghost.material.color.set(spot.ok ? '#4ade80' : '#ef4444');
    this.ghost.visible = true;
  }

  /* --------------------------------------------------------------- frame */

  /**
   * Draw. `alpha` is how far we are between the last step and the next
   * (0..1), so movement is smooth at any frame rate.
   */
  render(dt, alpha) {
    this.time += dt;
    this._placeCamera();
    this._updateFow();
    const sim = this.sim;
    const map = sim.map;
    const o = new THREE.Object3D();
    const color = new THREE.Color();

    // Units.
    const groups = new Map();
    for (const e of sim.entities.values()) {
      if (e.dead || e.kind !== 'unit' || !this.shows(e)) continue;
      const key = `${sim.players[e.owner].faction}:${e.type}`;
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(e);
    }
    for (const [key, m] of this.unitMeshes) if (!groups.has(key)) for (const mesh of [...m.meshes, m.trim]) mesh.count = 0;
    for (const [key, list] of groups) {
      const [faction, type] = key.split(':');
      const m = this._unitMesh(faction, type, list.length);
      list.forEach((e, i) => {
        const x = e.px + (e.x - e.px) * alpha;
        const z = e.pz + (e.z - e.pz) * alpha;
        const moving = Math.abs(e.x - e.px) + Math.abs(e.z - e.pz) > 0.001;
        let y = heightAt(map, x, z);
        if (m.hover) y += 0.4 + Math.sin(this.time * 2.4 + e.id) * 0.15;
        else if (moving) y += Math.abs(Math.sin(this.time * 9 + e.id)) * 0.12;
        o.position.set(x, y, z);
        e.drawAngle = e.drawAngle == null ? e.angle : e.drawAngle + Math.atan2(Math.sin(e.angle - e.drawAngle), Math.cos(e.angle - e.drawAngle)) * Math.min(1, dt * 12);
        o.rotation.set(0, e.drawAngle + (type === 'raider' && faction === 'prism' ? this.time * 8 : 0), 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        for (const mesh of m.meshes) mesh.setMatrixAt(i, o.matrix);
        m.trim.setMatrixAt(i, o.matrix);
        m.trim.setColorAt(i, color.set(TEAM_COLORS[e.owner]));
        e.drawX = x;
        e.drawZ = z;
        e.drawY = y;
      });
      for (const mesh of [...m.meshes, m.trim]) {
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (m.trim.instanceColor) m.trim.instanceColor.needsUpdate = true;
    }

    // Buildings.
    const alive = new Set();
    for (const e of sim.entities.values()) {
      if (e.dead || e.kind !== 'building') continue;
      alive.add(e.id);
      let b = this.buildings.get(e.id);
      if (!b) b = this._building(e);
      b.group.visible = this.shows(e);
      const grow = e.built ? 1 : 0.15 + 0.85 * e.progress;
      b.group.scale.set(1, grow, 1);
      e.drawX = e.x;
      e.drawZ = e.z;
      e.drawY = b.group.position.y;
    }
    for (const [id, b] of this.buildings) {
      if (alive.has(id)) continue;
      this.scene.remove(b.group);
      this.buildings.delete(id);
    }

    // Crystals: smaller as they run out.
    let ci = 0;
    for (const id of this.crystalIds) {
      const nd = sim.get(id);
      if (!nd) continue;
      const k = 0.45 + 0.55 * (nd.amount / nd.max);
      o.position.set(nd.x, heightAt(map, nd.x, nd.z), nd.z);
      o.rotation.set(0, nd.id * 1.7, 0);
      o.scale.set(k, k, k);
      o.updateMatrix();
      this.crystalMesh.setMatrixAt(ci++, o.matrix);
    }
    this.crystalMesh.count = ci;
    this.crystalMesh.instanceMatrix.needsUpdate = true;

    // Selection rings: green for ours, red for theirs, yellow for crystals.
    let ri = 0;
    const ring = (e, c) => {
      if (ri >= 600) return;
      const r = e.kind === 'unit' ? e.radius + 0.35 : (e.size * CELL) / 2 * 1.05;
      const x = e.drawX ?? e.x;
      const z = e.drawZ ?? e.z;
      o.position.set(x, heightAt(map, x, z) + 0.12, z);
      o.rotation.set(0, 0, 0);
      o.scale.set(r, 1, r);
      o.updateMatrix();
      this.rings.setMatrixAt(ri, o.matrix);
      this.rings.setColorAt(ri, color.set(c));
      ri++;
    };
    for (const id of this.selected) {
      const e = sim.get(id);
      if (!e || !this.shows(e)) continue;
      ring(e, e.owner === this.seat ? '#4ade80' : e.kind === 'node' ? '#ffd166' : '#ef4444');
    }
    if (this.hover && !this.selected.has(this.hover.id) && !this.hover.dead && this.shows(this.hover)) ring(this.hover, this.hover.owner === this.seat ? '#bbf7d0' : this.hover.kind === 'node' ? '#fde68a' : '#fca5a5');
    this.rings.count = ri;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;

    // Rally flag of a selected building of ours.
    const rallied = [...this.selected].map((id) => sim.get(id)).find((e) => e?.kind === 'building' && e.owner === this.seat && e.rally);
    this.rally.visible = Boolean(rallied);
    if (rallied) this.rally.position.set(rallied.rally.x, heightAt(map, rallied.rally.x, rallied.rally.z), rallied.rally.z);

    // Shots in flight.
    let si = 0;
    this.shots = this.shots.filter((s) => (s.t += dt) < s.dur);
    for (const s of this.shots) {
      if (si >= 512) break;
      const k = s.t / s.dur;
      const x = s.sx + (s.tx - s.sx) * k;
      const z = s.sz + (s.tz - s.sz) * k;
      const y = heightAt(map, x, z) + 1.2 + (s.arc ? Math.sin(k * Math.PI) * 9 : 0);
      o.position.set(x, y, z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(s.size);
      o.updateMatrix();
      this.shotMesh.setMatrixAt(si, o.matrix);
      this.shotMesh.setColorAt(si, s.color);
      si++;
    }
    this.shotMesh.count = si;
    this.shotMesh.instanceMatrix.needsUpdate = true;
    if (this.shotMesh.instanceColor) this.shotMesh.instanceColor.needsUpdate = true;

    // Blasts.
    let fi = 0;
    this.effects = this.effects.filter((f) => (f.t += dt) < f.dur);
    for (const f of this.effects) {
      const k = f.t / f.dur;
      o.position.set(f.x, f.y, f.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(f.r0 + (f.r1 - f.r0) * k);
      o.updateMatrix();
      this.fxMesh.setMatrixAt(fi, o.matrix);
      this.fxMesh.setColorAt(fi, color.copy(f.color).multiplyScalar(1 - k));
      fi++;
    }
    this.fxMesh.count = fi;
    this.fxMesh.instanceMatrix.needsUpdate = true;
    if (this.fxMesh.instanceColor) this.fxMesh.instanceColor.needsUpdate = true;

    if (this.ping.visible) {
      const t = (this.ping.userData.t += dt);
      this.ping.scale.setScalar(0.6 + t * 3);
      this.ping.material.opacity = Math.max(0, 1 - t / 0.5);
      if (t > 0.5) this.ping.visible = false;
    }
    this.floaters = this.floaters.filter((f) => (f.t += dt) < 1);

    this.renderer.render(this.scene, this.camera);
  }

  _building(e) {
    const faction = this.sim.players[e.owner].faction;
    const group = new THREE.Group();
    const team = new THREE.Color(TEAM_COLORS[e.owner]);
    const slot = this.slots[`${faction}:${e.type}`];
    const kit = slot ? null : faction === 'league' ? this.kit[e.type] : null;
    if (slot) {
      for (const p of slot.parts) {
        const mesh = new THREE.Mesh(p.geometry, p.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
    if (kit || slot) {
      if (kit) group.add(kit.clone());
      // A band in the player's colour round its foot.
      const w = e.size * CELL * 0.96;
      const band = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, w), fogify(new THREE.MeshStandardMaterial({ color: team, roughness: 0.5 }), this.fow));
      band.position.y = 0.17;
      group.add(band);
    } else {
      const geo = buildingGeometry(faction, e.type);
      const body = new THREE.Mesh(geo.body, this.unitMats.body);
      const trim = new THREE.Mesh(geo.trim, fogify(new THREE.MeshStandardMaterial({ color: team, roughness: 0.4, metalness: 0.2 }), this.fow));
      body.castShadow = trim.castShadow = true;
      body.receiveShadow = true;
      group.add(body, trim);
    }
    group.position.set(e.x, this._footHeight(e), e.z);
    this.scene.add(group);
    const b = { group, faction, type: e.type, kit: Boolean(kit), slot: Boolean(slot) };
    this.buildings.set(e.id, b);
    return b;
  }

  /** The lowest ground under a building, so none of it floats. */
  _footHeight(e) {
    const half = (e.size * CELL) / 2;
    let low = Infinity;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) low = Math.min(low, heightAt(this.sim.map, e.x + dx * half, e.z + dz * half));
    return low;
  }

  _updateFow() {
    const p = this.sim.players[this.seat];
    if (this._fowTick === this.sim.tick) return;
    this._fowTick = this.sim.tick;
    const data = this.fowData;
    for (let i = 0; i < data.length; i++) data[i] = p.vision[i] ? 255 : p.explored[i] ? 110 : 0;
    this.fow.texture.value.needsUpdate = true;
  }

  /**
   * The 2D layer over the canvas: health bars (ours and anything hurt or
   * picked), building and training progress, and "+5" as shards come in.
   */
  drawOverlay(ctx) {
    const sim = this.sim;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const dpr = ctx.canvas.width / Math.max(1, this.width);
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const e of sim.entities.values()) {
      if (e.dead || e.kind === 'node' || !this.shows(e)) continue;
      const picked = this.selected.has(e.id) || this.hover === e;
      const hurt = e.hp < e.maxHp;
      const building = e.kind === 'building';
      if (!picked && !hurt && !(building && !e.built)) continue;
      const top = (e.drawY ?? heightAt(sim.map, e.x, e.z)) + (building ? 5.5 : 2.6);
      const p = this.toScreen(e.drawX ?? e.x, top, e.drawZ ?? e.z);
      if (!p.front || p.x < -40 || p.y < -20 || p.x > this.width + 40 || p.y > this.height + 20) continue;
      const w = building ? Math.min(90, 26 + e.size * 9) : 26;
      const x = p.x - w / 2;
      const y = p.y;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 1, y - 1, w + 2, 6);
      const k = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = k > 0.6 ? '#4ade80' : k > 0.3 ? '#facc15' : '#ef4444';
      ctx.fillRect(x, y, w * k, 4);
      if (building && !e.built) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 1, y + 6, w + 2, 5);
        ctx.fillStyle = '#7fd6ff';
        ctx.fillRect(x, y + 7, w * e.progress, 3);
      } else if (building && e.queue?.length && e.owner === this.seat) {
        const job = e.queue[0];
        const s = STATS[sim.players[e.owner].faction][job.type];
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 1, y + 6, w + 2, 5);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x, y + 7, w * Math.min(1, job.t / s.time), 3);
      }
      if (e.kind === 'unit' && e.carry && e.owner === this.seat) {
        ctx.fillStyle = '#7ef0ff';
        ctx.beginPath();
        ctx.arc(p.x + w / 2 + 5, y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const p = this.toScreen(f.x, heightAt(sim.map, f.x, f.z) + 2.5 + f.t * 2, f.z);
      if (!p.front) continue;
      ctx.fillStyle = `rgba(126, 240, 255, ${1 - f.t})`;
      ctx.fillText(f.text, p.x, p.y);
    }
    ctx.restore();
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
    });
    this.canvas.remove();
  }
}

export { TICK };
