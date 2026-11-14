import * as THREE from 'three';
import { CLASSES, MOBS, NODES, ITEMS, RARITY_INFO } from './data.js';
import { ZONES, NPCS } from './world.js';
import { Landscape, heightFn } from './landscape.js';
import { dress } from './bodies.js';
import { lookOf } from './looks.js';

/**
 * Draws one Hearthvale zone: the ground, its houses, trees, rocks and
 * pillars, portals and crafting stations (our own shapes), and everyone in
 * it as an animated KayKit character (CC0, Kay Lousberg) — players, NPCs and
 * monsters — with name plates, the target ring and boss warning circles.
 * A third-person camera follows your character; it never changes the world.
 */

export class MmoView {
  constructor(host) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'hv__canvas';
    host.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 1200);
    this.yaw = Math.PI;
    this.pitch = 0.5;
    this.dist = 13;
    this.models = new Map();
    this.fx = [];
    this.floaters = [];
    this.zoneGroup = null;
    this.time = 0;
    const hemi = new THREE.HemisphereLight('#dceeff', '#46503a', 1.1);
    const sun = new THREE.DirectionalLight('#fff0d8', 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.4;
    this.scene.add(hemi, sun, sun.target);
    this.sun = sun;
    this.hemi = hemi;
    const glow = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.fxMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow, 200);
    this.fxMesh.frustumCulled = false;
    this.fxMesh.count = 0;
    this.scene.add(this.fxMesh);
    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, depthWrite: false }));
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
    this.teleGroup = new THREE.Group();
    this.scene.add(this.teleGroup);
    this.slashes = [];
    this.shakeAmt = 0;
  }

  /* -------------------------------------------------- blows and hits */

  /**
   * A blade's path through the air: an `arc`, a `wide` sweep, a `full` ring
   * (a spin, a shout, a shock on the ground) or a straight `stab`.
   */
  _slashMesh(shape) {
    const half = shape === 'wide' ? 2.1 : 1.25;
    const geo = shape === 'full' ? new THREE.RingGeometry(0.55, 1, 48, 1)
      : shape === 'stab' ? new THREE.PlaneGeometry(0.3, 1.1).translate(0, -0.65, 0)
        : new THREE.RingGeometry(0.55, 1, 36, 1, -Math.PI / 2 - half, half * 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uK: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') }, uMode: { value: shape === 'full' ? 1 : shape === 'stab' ? 2 : 0 }, uHalf: { value: half }, uIn: { value: 0.55 } },
      vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uK; uniform vec3 uColor; uniform float uMode; uniform float uHalf; uniform float uIn; varying vec2 vP;
        void main() {
          float r = length(vP);
          float fade = 1.0 - smoothstep(0.55, 1.0, uK);
          float light;
          if (uMode > 1.5) {
            // A thrust: a streak that shoots out and narrows to its point.
            float a = clamp((-vP.y - 0.1) / 1.1, 0.0, 1.0);
            float head = uK * 1.6;
            float width = 0.15 * (1.0 - a * 0.85);
            light = smoothstep(width, width * 0.2, abs(vP.x)) * smoothstep(head - 0.8, head, a) * step(a, head) * fade;
          } else {
            float edge = smoothstep(uIn, mix(uIn, 1.0, 0.5), r) * smoothstep(1.0, 0.9, r);
            // Along the arc, 0 to 1; the bright head runs ahead and a tail fades behind it.
            float a = clamp((atan(vP.y, vP.x) + 1.5708 + uHalf) / (2.0 * uHalf), 0.0, 1.0);
            float head = uK * 1.5;
            float tail = uMode > 0.5 ? 1.0 : smoothstep(head - 0.75, head, a) * step(a, head);
            light = edge * tail * fade;
          }
          gl_FragColor = vec4(uColor * light * 1.6 + vec3(1.0) * pow(light, 3.0) * 0.7, light);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.frustumCulled = false;
    const holder = new THREE.Group();
    holder.rotation.order = 'YXZ';
    holder.add(mesh);
    holder.visible = false;
    this.scene.add(holder);
    return { holder, mesh, shape, busy: false };
  }

  /**
   * Draw a blow in front of someone facing `a`. `shape`: arc, wide, full or
   * stab. `roll` tips an arc (0 flat, 1.3 a chop down), `flip` swings it the
   * other way, `thin` makes it a claw mark, `side` shifts it left or right,
   * `delay` holds it back a moment (the second stroke of a cross).
   */
  slash(x, z, a, { shape, full = false, roll = 0, flip = false, thin = false, side = 0, delay = 0, size = 2.6, color = '#6ecbff', dur = 0.26, y = 1.15 } = {}) {
    const kind = shape ?? (full ? 'full' : 'arc');
    let s = this.slashes.find((q) => !q.busy && q.shape === kind);
    if (!s) {
      if (this.slashes.length >= 40) return;
      s = this._slashMesh(kind);
      this.slashes.push(s);
    }
    Object.assign(s, { busy: true, t: -delay, dur, size, x: x + Math.cos(a) * side, z: z - Math.sin(a) * side, y });
    s.holder.rotation.set(0, a, roll);
    s.mesh.scale.set(flip ? -1 : 1, 1, 1);
    s.mesh.material.uniforms.uColor.value.set(color);
    s.mesh.material.uniforms.uIn.value = thin ? 0.68 : 0.55;
    s.mesh.material.uniforms.uK.value = 0;
    s.holder.visible = false;
  }

  /** Every stroke of a blow (blows.js). */
  blow(x, z, a, strokes) {
    for (const st of strokes) this.slash(x, z, a, st);
  }

  /** Someone is struck: they flinch away from the blow, and sparks fly. */
  hit(id, from, { strength = 1, color = '#fff0b0', x, z } = {}) {
    const m = this.models.get(id);
    if (m) {
      let dx = from ? x - from.x : 0;
      let dz = from ? z - from.z : 0;
      const d = Math.hypot(dx, dz) || 1;
      m.hitAt = this.time;
      m.hitDir = { x: dx / d, z: dz / d, s: Math.min(2, strength) };
      const busy = m.oneShot && this.time - m.oneShot.at < (m.oneShot.dur ?? 0.6);
      if (!busy) m.oneShot = { kind: 'hit', clip: strength > 1.2 ? 'Hit_B' : 'Hit_A', at: this.time, dur: 0.35 };
    }
    if (!Number.isFinite(x)) return;
    this.burst(x, z, 0.3 + 0.25 * strength, '#b8b8b8', 0.14, 1.2);
    this.burst(x, z, 0.7 + 0.45 * strength, new THREE.Color(color).multiplyScalar(0.32), 0.28, 1.2);
    const n = Math.round(5 + strength * 4);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const far = 0.9 + Math.random() * 1.4 * strength;
      if (this.fx.length > 190) this.fx.shift();
      this.fx.push({ from: { x, z }, to: { x: x + Math.cos(ang) * far, z: z + Math.sin(ang) * far }, y: 0.9 + Math.random() * 0.9, y1: 0.4 + Math.random() * 2, r0: 0.07 + Math.random() * 0.07, t: 0, dur: 0.22 + Math.random() * 0.18, color: new THREE.Color(color), fade: true });
    }
  }

  /* ---------------------------------------------------- loot on the ground */

  /** What lies on the ground for you: a turning gem under a beam of its rarity's colour. */
  _drops(list, me, dt) {
    this.dropModels ??= new Map();
    const mine = list.filter((d) => d.o === me.i);
    const seen = new Set();
    for (const d of mine) {
      seen.add(d.i);
      let g = this.dropModels.get(d.i);
      if (!g) {
        const rarity = ITEMS[d.item]?.slot ? ITEMS[d.item].rarity ?? 'common' : null;
        const color = new THREE.Color(RARITY_INFO[rarity]?.color ?? '#e8d9a8');
        const rank = Math.max(0, Object.keys(RARITY_INFO).indexOf(rarity));
        g = new THREE.Group();
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, flatShading: true, metalness: 0.3, roughness: 0.35 }));
        gem.castShadow = true;
        const tall = 2.2 + rank * 1.6;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05 + rank * 0.03, 0.16 + rank * 0.05, tall, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 + rank * 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.y = tall / 2;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
        ring.position.y = 0.06;
        g.add(gem, beam, ring);
        g.userData = { gem, born: this.time, item: d.item, x: d.x, z: d.z };
        this.scene.add(g);
        this.dropModels.set(d.i, g);
      }
      const age = this.time - g.userData.born;
      // It pops out of the monster and settles.
      const hop = age < 0.45 ? Math.sin((age / 0.45) * Math.PI) * 1.4 : 0;
      g.position.set(d.x, this.h(d.x, d.z), d.z);
      g.userData.gem.position.y = 0.55 + hop + Math.sin(this.time * 2.4 + d.i) * 0.08;
      g.userData.gem.rotation.y += dt * 1.8;
    }
    for (const [id, g] of this.dropModels) {
      if (seen.has(id)) continue;
      this.scene.remove(g);
      this.dropModels.delete(id);
    }
    this.myDrops = mine;
  }

  /** The drop under a screen point (its gem or its label), or null. */
  pickDrop(px, py) {
    let best = null;
    let bestD = 34;
    for (const d of this.myDrops ?? []) {
      for (const y of [0.6, 1.5]) {
        const p = this.toScreen(d.x, y, d.z);
        if (!p.front) continue;
        const dist = Math.hypot(p.x - px, (p.y - py) * 1.4);
        if (dist < bestD) {
          bestD = dist;
          best = d;
        }
      }
    }
    return best;
  }

  /** Jolt the camera (a heavy blow landed, or took one). */
  shake(amount) {
    this.shakeAmt = Math.min(0.6, Math.max(this.shakeAmt, amount));
  }

  /* ------------------------------------------------------------ the zone */

  /**
   * A new world copy (even of the same zone: a party's): everyone drawn so
   * far goes, since ids are per copy; the ground is rebuilt only for a new zone.
   */
  setZone(zone) {
    for (const g of this.dropModels?.values() ?? []) this.scene.remove(g);
    this.dropModels?.clear();
    this.myDrops = [];
    for (const m of this.models.values()) this.scene.remove(m.group);
    this.models.clear();
    if (this.zone === zone) return;
    this.zone = zone;
    if (this.zoneGroup) this.scene.remove(this.zoneGroup);
    const def = ZONES[zone];
    const [w, h] = def.size;
    const g = new THREE.Group();
    const indoor = def.kind === 'dungeon' || def.kind === 'raid';
    this.scene.background = new THREE.Color(indoor ? '#0d0f14' : '#9cc8e8');
    this.scene.fog = new THREE.Fog(indoor ? '#0d0f14' : '#b8d6ea', indoor ? 30 : 60, indoor ? 90 : 190);
    this.hemi.intensity = indoor ? 0.7 : 1.1;
    // Coming in from the night outside: indoor light is its own.
    this.sun.intensity = 2.2;
    this.sun.color.set('#fff0d8');
    // The ground: one painted picture, with a path through the middle.
    const S = 512;
    const cvs = document.createElement('canvas');
    cvs.width = S;
    cvs.height = Math.round((S * h) / w);
    const c = cvs.getContext('2d');
    c.fillStyle = def.ground;
    c.fillRect(0, 0, cvs.width, cvs.height);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + Math.random() * 0.05})`;
      c.beginPath();
      c.arc(Math.random() * cvs.width, Math.random() * cvs.height, 2 + Math.random() * 10, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = def.path;
    c.lineWidth = (indoor ? 18 : 7) * (S / w);
    c.lineCap = 'round';
    c.beginPath();
    const k = S / w;
    const pts = [def.spawn, ...def.portals.map((p) => p.at), ...(def.npcs.length ? [[w / 2, h / 2]] : [])];
    for (const p of def.portals) {
      c.moveTo(def.spawn[0] * k, def.spawn[1] * k);
      c.lineTo(p.at[0] * k, p.at[1] * k);
    }
    if (indoor) {
      c.moveTo((w / 2) * k, 0);
      c.lineTo((w / 2) * k, h * k);
    }
    c.stroke();
    void pts;
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    // The ground rolls (landscape.js): the same picture, laid over the hills.
    this.h = heightFn(zone);
    const geo = new THREE.PlaneGeometry(w, h, Math.round(w / 2), Math.round(h / 2)).rotateX(-Math.PI / 2).translate(w / 2, 0, h / 2);
    const gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, this.h(gp.getX(i), gp.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    ground.receiveShadow = true;
    g.add(ground);
    if (!indoor) {
      const beyond = new THREE.Mesh(new THREE.PlaneGeometry(w * 6, h * 6).rotateX(-Math.PI / 2).translate(w / 2, -3.2, h / 2), new THREE.MeshStandardMaterial({ color: def.ground, roughness: 1 }));
      g.add(beyond);
    } else {
      // Walls round a dungeon.
      const wallMat = new THREE.MeshStandardMaterial({ color: '#4a4f58', roughness: 0.9 });
      for (const [x, z, sx, sz] of [[w / 2, -1, w + 4, 2], [w / 2, h + 1, w + 4, 2], [-1, h / 2, 2, h], [w + 1, h / 2, 2, h]]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 8, sz), wallMat);
        wall.position.set(x, 4, z);
        wall.receiveShadow = true;
        g.add(wall);
      }
      for (let z = 10; z < h; z += 22) {
        for (const x of [3, w - 3]) {
          const torch = new THREE.PointLight(def.kind === 'raid' ? '#ff7a3a' : '#7fd0ff', 18, 26, 1.6);
          torch.position.set(x, 4, z);
          g.add(torch);
          (this.torches ??= []).push(torch);
        }
      }
    }
    this.torches = this.torches?.filter((t) => t.parent === g) ?? [];
    this.gates = [];
    const stand = (o) => {
      o.position.y += this.h(o.position.x, o.position.z);
      return o;
    };
    for (const wall of def.walls) g.add(stand(this._wallMesh(wall)));
    for (const s of def.stations) g.add(stand(this._station(s)));
    for (const p of def.portals) g.add(stand(this._portal(p)));
    // The living part: grass, water, birds, the sky (or, indoors, dust and torchlight).
    this.land?.dispose();
    this.land = Landscape(zone, this.h);
    g.add(this.land.group);
    // Scattered trees and rocks outside the paths, for the open zones.
    this.decor = [];
    if (def.kind === 'open') g.add(this._scatter(def, w, h));
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.castShadow || false;
        o.receiveShadow = true;
      }
    });
    this.zoneGroup = g;
    this.scene.add(g);
  }

  _wallMesh(wall) {
    const g = new THREE.Group();
    g.position.set(wall.x, 0, wall.z);
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
    if (wall.kind === 'house') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(wall.r * 1.4, 4.5, wall.r * 1.2), mat('#d8c8a8'));
      base.position.y = 2.25;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(wall.r * 1.15, 3.5, 4), mat('#8a4a3a'));
      roof.position.y = 6.2;
      roof.rotation.y = Math.PI / 4;
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), mat('#5a3a2a'));
      door.position.set(0, 1.1, wall.r * 0.61);
      g.add(base, roof, door);
    } else if (wall.kind === 'well') {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(wall.r * 0.7, wall.r * 0.8, 1.2, 14, 1, true), mat('#8c8a84'));
      ring.position.y = 0.6;
      const water = new THREE.Mesh(new THREE.CircleGeometry(wall.r * 0.68, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3f8fb8', roughness: 0.2 }));
      water.position.y = 0.5;
      g.add(ring, water);
    } else if (wall.kind === 'trees') {
      for (let i = 0; i < Math.round(wall.r * 1.2); i++) {
        const a = (i / Math.round(wall.r * 1.2)) * Math.PI * 2 + i;
        const d = (i % 3) * wall.r * 0.3;
        const tree = this._tree();
        tree.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        tree.scale.setScalar(0.9 + (i % 4) * 0.15);
        g.add(tree);
      }
    } else if (wall.kind === 'cliff' || wall.kind === 'giant') {
      // The landscape draws these (a waterfall, a giant tree); here they only block the way.
      return g;
    } else if (wall.kind === 'stall') {
      // A market stall: a counter, four posts, a striped awning, a painted sign.
      const wood = mat('#8a6a4a');
      const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 1.2), wood);
      counter.position.set(0, 0.55, 0.6);
      g.add(counter);
      for (const [x, z] of [[-1.9, -0.4], [1.9, -0.4], [-1.9, 1.1], [1.9, 1.1]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3, 0.18), wood);
        post.position.set(x, 1.5, z);
        g.add(post);
      }
      const awning = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 2.2), mat(wall.color ?? '#a8553a'));
      awning.position.set(0, 3.05, 0.35);
      awning.rotation.x = 0.18;
      g.add(awning);
      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 64;
      const c = cvs.getContext('2d');
      c.fillStyle = '#f1e2c0';
      c.fillRect(0, 0, 256, 64);
      c.strokeStyle = '#5a3a2a';
      c.lineWidth = 6;
      c.strokeRect(3, 3, 250, 58);
      c.fillStyle = '#3a2418';
      c.font = '700 34px Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(wall.sign ?? '', 128, 34);
      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
      sign.position.set(0, 3.6, 1.2);
      g.add(sign);
      // Goods on the counter.
      for (let i = 0; i < 4; i++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat(['#c8a060', '#9ac06a', '#c06a5a', '#6a9ac0'][i]));
        crate.position.set(-1.3 + i * 0.85, 1.3, 0.6);
        g.add(crate);
      }
      g.rotation.y = wall.face ?? 0;
    } else if (wall.kind === 'pillar') {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(wall.r * 0.7, wall.r * 0.8, 9, 10), mat('#6a6e78'));
      p.position.y = 4.5;
      g.add(p);
    } else {
      for (let i = 0; i < 4; i++) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(wall.r * (0.4 + (i % 2) * 0.2), 0), mat('#8a857a'));
        r.position.set(((i % 2) - 0.5) * wall.r * 0.7, wall.r * 0.25, (Math.floor(i / 2) - 0.5) * wall.r * 0.7);
        r.rotation.set(i, i * 2, i * 3);
        g.add(r);
      }
    }
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    return g;
  }

  _tree() {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.8, 6), new THREE.MeshStandardMaterial({ color: '#5a3f2c' }));
    trunk.position.y = 0.9;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.4, 7), new THREE.MeshStandardMaterial({ color: '#2f5f2c', flatShading: true }));
    crown.position.y = 3.8;
    t.add(trunk, crown);
    t.traverse((o) => o.isMesh && (o.castShadow = true));
    return t;
  }

  _scatter(def, w, h) {
    const g = new THREE.Group();
    let seed = w * 7 + h;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const x = rand() * w;
      const z = rand() * h;
      // Not on the walking paths, the spawns or the portals.
      if (def.portals.some((p) => Math.hypot(p.at[0] - x, p.at[1] - z) < 12) || Math.hypot(def.spawn[0] - x, def.spawn[1] - z) < 14) continue;
      if (def.spawns.some((s) => Math.hypot(s.at[0] - x, s.at[1] - z) < s.radius + 3)) continue;
      const t = rand() < 0.75 ? this._tree() : new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + rand(), 0), new THREE.MeshStandardMaterial({ color: '#8a857a', flatShading: true }));
      if ((this.h.ponds ?? []).some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 2)) continue;
      t.position.set(x, (t.isMesh ? 0.4 : 0) + this.h(x, z), z);
      if (!t.isMesh) (this.decor ??= []).push(t);
      g.add(t);
    }
    return g;
  }

  _station(s) {
    const g = new THREE.Group();
    g.position.set(s.at[0], 0, s.at[1]);
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: s.id === 'anvil' ? 0.6 : 0, flatShading: true });
    if (s.id === 'anvil') {
      const a = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.8), mat('#4a4e58'));
      a.position.y = 1;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), mat('#3a3e46'));
      b.position.y = 0.45;
      g.add(a, b);
    } else if (s.id === 'cauldron') {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), mat('#2a2a2e'));
      pot.position.y = 0.9;
      const brew = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7dffa8' }));
      brew.position.y = 1.35;
      g.add(pot, brew);
    } else {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1), mat('#8a6a4a'));
      top.position.y = 1;
      for (const [x, z] of [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), mat('#5a3f2c'));
        leg.position.set(x, 0.5, z);
        g.add(leg);
      }
      g.add(top);
    }
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    return g;
  }

  /**
   * A gateway: a stone arch carved with glowing runes around a whirling
   * oval of light, a rune circle turning on the ground, and sparks drawn
   * into it. Blue for a road, violet where a level is asked, ember-red
   * for a dungeon or a raid. It brightens as you come near.
   */
  _portal(p) {
    const g = new THREE.Group();
    g.position.set(p.at[0], 0, p.at[1]);
    const kind = ZONES[p.to]?.kind;
    const tone = new THREE.Color(kind === 'dungeon' || kind === 'raid' ? '#ff5a2a' : p.level ? '#a070ff' : '#4aa8ff');
    const stone = new THREE.MeshStandardMaterial({ color: '#77736b', roughness: 0.95, flatShading: true });
    const rune = new THREE.MeshBasicMaterial({ color: tone });
    // Two pillars of rough blocks and an arch of wedge stones over them.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.1 - i * 0.05, 1.05, 1.2 - i * 0.05), stone);
        block.position.set(side * 2.3, 0.52 + i * 1.05, 0);
        block.rotation.y = (i % 2 ? 0.08 : -0.06) * side;
        block.castShadow = true;
        g.add(block);
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.06), rune);
        mark.position.set(side * 2.3, 0.6 + i * 1.05, 0.62);
        mark.rotation.z = (i * 0.9 + side) % 1.2;
        g.add(mark);
      }
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.7), stone);
      foot.position.set(side * 2.3, 0.2, 0);
      g.add(foot);
    }
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 1.15), stone);
      wedge.position.set(Math.cos(a) * 2.3, 4.2 + Math.sin(a) * 1.9, 0);
      wedge.rotation.z = a - Math.PI / 2;
      wedge.castShadow = true;
      g.add(wedge);
    }
    const key = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), rune);
    key.position.set(0, 6.75, 0);
    g.add(key);
    // The whirl of light inside.
    const uniforms = { uTime: { value: 0 }, uTone: { value: tone }, uNear: { value: 0 } };
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 6.2), new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uTime; uniform vec3 uTone; uniform float uNear; varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          // Arms of light winding into the middle, two speeds over each other.
          float arms = sin(a * 3.0 + r * 9.0 - uTime * 3.2) * 0.5 + 0.5;
          float fine = sin(a * 7.0 - r * 16.0 + uTime * 2.1) * 0.5 + 0.5;
          float ripple = sin(r * 22.0 - uTime * 5.0) * 0.5 + 0.5;
          float edge = smoothstep(1.0, 0.72, r);
          float core = pow(max(0.0, 1.0 - r), 2.2);
          float light = (0.25 + arms * 0.55 + fine * 0.25 + ripple * 0.12) * edge + core * 1.6;
          vec3 col = mix(uTone, vec3(1.0), core * 0.85 + fine * 0.12) * light * (0.8 + uNear * 0.6);
          gl_FragColor = vec4(col, edge * (0.75 + uNear * 0.25));
        }`
    }));
    veil.position.y = 3.25;
    g.add(veil);
    // A circle of runes turning on the ground in front.
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 256;
    const c = cvs.getContext('2d');
    c.strokeStyle = '#fff';
    c.fillStyle = '#fff';
    c.lineWidth = 5;
    for (const r of [118, 96]) {
      c.beginPath();
      c.arc(128, 128, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.font = '700 22px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ'].forEach((ch, i, all) => {
      const a = (i / all.length) * Math.PI * 2;
      c.save();
      c.translate(128 + Math.cos(a) * 107, 128 + Math.sin(a) * 107);
      c.rotate(a + Math.PI / 2);
      c.fillText(ch, 0, 0);
      c.restore();
    });
    c.beginPath();
    for (let i = 0; i < 6; i++) c.lineTo(128 + Math.cos((i * 2.094) % 6.283 + i) * 90, 128 + Math.sin((i * 2.094) % 6.283 + i) * 90);
    c.closePath();
    c.lineWidth = 3;
    c.stroke();
    const circle = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cvs), color: tone, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    circle.position.set(0, 0.12, 2.2);
    g.add(circle);
    // Sparks, drawn in.
    const n = 46;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: tone.clone().lerp(new THREE.Color('#ffffff'), 0.5), size: 0.16, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false;
    g.add(sparks);
    const light = new THREE.PointLight(tone, 14, 22, 1.6);
    light.position.set(0, 3.2, 1.2);
    g.add(light);
    // Face the middle of the zone.
    const [w, h] = ZONES[this.zone].size;
    g.rotation.y = Math.atan2(w / 2 - p.at[0], h / 2 - p.at[1]);
    (this.gates ??= []).push({ at: p.at, uniforms, circle, sparks, light, key, seeds: Array.from({ length: n }, (_, i) => [i * 2.4, (i * 0.37) % 1, 0.5 + ((i * 0.61) % 1)]) });
    return g;
  }

  /** The gateways' own life: the whirl, the turning runes, the sparks; brighter as you near. */
  _gates(dt, me) {
    for (const gate of this.gates ?? []) {
      const d = Math.hypot(me.x - gate.at[0], me.z - gate.at[1]);
      const near = Math.max(0, Math.min(1, 1 - (d - 4) / 14));
      gate.uniforms.uTime.value = this.time;
      gate.uniforms.uNear.value += (near - gate.uniforms.uNear.value) * Math.min(1, dt * 4);
      gate.circle.rotation.y -= dt * (0.4 + near * 1.2);
      gate.key.rotation.y += dt * 2;
      gate.key.position.y = 6.75 + Math.sin(this.time * 2) * 0.15;
      gate.light.intensity = 10 + near * 16 + Math.sin(this.time * 6) * 1.5;
      const p = gate.sparks.geometry.attributes.position;
      gate.seeds.forEach(([a, ph, sp], i) => {
        const t = (this.time * 0.35 * sp + ph) % 1;
        const r = (1 - t) * 3.4;
        const ang = a + t * 7;
        p.setXYZ(i, Math.cos(ang) * r * 0.62, 3.25 + Math.sin(ang) * r * 0.9, 0.15 + (1 - t) * 1.6);
      });
      p.needsUpdate = true;
    }
  }

  /* ------------------------------------------------------- characters */

  _make(e) {
    let body;
    let entry_attack = null;
    let show = [];
    let tint = '#ffffff';
    let height = 2;
    let extra = {};
    if (e.k === 'p') {
      // A player wears the look they chose (looks.js).
      const l = lookOf(e.c, e.lk);
      body = l.body;
      show = l.show;
      tint = l.tint;
      extra = { hat: l.hat, cape: l.cape, wide: l.wide, tall: l.tall };
      entry_attack = l.attack;
    } else if (e.k === 'npc') {
      const n = NPCS[e.npc];
      body = n.body;
      show = n.show;
      tint = n.tint;
    } else if (e.k === 'm') {
      const m = MOBS[e.ty];
      body = m.body;
      show = m.show ?? [];
      tint = m.tint;
      height = 1.9 * (m.scale ?? 1);
    }
    const group = new THREE.Group();
    const entry = { group, mixer: null, actions: {}, act: null, height, kind: e.k };
    if (e.k === 'n') {
      const def = NODES[e.ty];
      const mesh = def.skill === 'logging'
        ? this._tree()
        : new THREE.Mesh(def.skill === 'mining' ? new THREE.DodecahedronGeometry(0.9, 0) : new THREE.ConeGeometry(0.5, 1, 6), new THREE.MeshStandardMaterial({ color: def.color, flatShading: true, emissive: def.color, emissiveIntensity: 0.25 }));
      if (mesh.isMesh) mesh.position.y = def.skill === 'mining' ? 0.5 : 0.5;
      group.add(mesh);
      entry.node = mesh;
      entry.height = def.skill === 'logging' ? 5 : 1.4;
      return entry;
    }
    entry.attack = entry_attack;
    dress({ body, show, tint, height, ...extra }).then((made) => {
      if (!made || !this.models.has(e.i)) return;
      group.add(made.model);
      entry.mixer = made.mixer;
      entry.actions = made.actions;
      entry.act = null;
    });
    return entry;
  }

  _play(m, name, once = false) {
    const next = m.actions[name] ?? m.actions.Idle;
    if (!next || m.current === next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.play();
    if (m.current) m.current.crossFadeTo(next, 0.15, false);
    m.current = next;
  }

  /** An attack or a cast to show, from the events: `clip` names the move, if not the usual one. */
  act(id, kind, clip = null, dur = 0.6) {
    const m = this.models.get(id);
    if (m) m.oneShot = { kind, clip, at: this.time, dur };
  }

  /* --------------------------------------------------------------- camera */

  orbit(dx, dy) {
    this.yaw -= dx * 0.006;
    this.pitch = Math.max(0.12, Math.min(1.35, this.pitch + dy * 0.005));
  }

  zoomBy(f) {
    this.dist = Math.max(5, Math.min(30, this.dist * f));
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.width = w;
    this.height = h;
  }

  /** Where a point `y` above the ground at (x, z) lands on screen. */
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y + (this.h?.(x, z) ?? 0), z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, front: v.z < 1 };
  }

  /** The entity under a screen point. */
  pick(ents, px, py) {
    let best = null;
    let bestD = Infinity;
    for (const e of ents) {
      if (e.k === 'n' && !e.ready) continue;
      const m = this.models.get(e.i);
      const h = (m?.height ?? 2) * 0.55;
      const p = this.toScreen(e.x, h, e.z);
      if (!p.front) continue;
      const top = this.toScreen(e.x, (m?.height ?? 2) * 1.05, e.z);
      const r = Math.max(16, Math.abs(top.y - p.y) * 1.1);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < r && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /* --------------------------------------------------------------- frame */

  render(state, me, dt) {
    this.time += dt;
    if (!state || !me) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // Camera behind the player.
    const tx = me.x;
    const tz = me.z;
    const cx = tx + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cz = tz + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    const gy = this.h(tx, tz);
    // The camera stays above the ground it is over, too.
    const cy = Math.max(gy + 1.6 + Math.sin(this.pitch) * this.dist, this.h(cx, cz) + 1.2);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(tx, gy + 1.8, tz);
    if (this.shakeAmt > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= Math.exp(-dt * 9);
    }
    this.sun.position.set(tx + 30, gy + 60, tz + 20);
    this.sun.target.position.set(tx, gy, tz);
    this.sun.target.updateMatrixWorld();
    this._gates(dt, me);
    // A tree standing between you and the camera steps out of the way.
    for (const t of this.decor ?? []) {
      const dx = cx - tx;
      const dz = cz - tz;
      const k = Math.max(0, Math.min(1, ((t.position.x - tx) * dx + (t.position.z - tz) * dz) / (dx * dx + dz * dz || 1)));
      t.visible = Math.hypot(t.position.x - (tx + dx * k), t.position.z - (tz + dz * k)) > 2.4;
    }
    // The landscape lives: wind, water, birds, the hour.
    const moving = this._meAt && Math.hypot(me.x - this._meAt.x, me.z - this._meAt.z) > 0.01;
    this._meAt = { x: me.x, z: me.z };
    const others = state.ents.filter((e) => (e.k === 'p' || e.k === 'm' || e.k === 'npc') && e.i !== me.i && !e.dead && Math.abs(e.x - me.x) < 40 && Math.abs(e.z - me.z) < 40)
      .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 7);
    this.land.update(dt, { x: me.x, z: me.z, moving }, others, { scene: this.scene, sun: this.sun, hemi: this.hemi, torches: this.torches });

    const seen = new Set();
    for (const e of state.ents) {
      seen.add(e.i);
      let m = this.models.get(e.i);
      if (!m) {
        m = this._make(e);
        this.models.set(e.i, m);
        this.scene.add(m.group);
      }
      const isMe = e.i === me.i;
      const x = isMe ? me.x : e.x;
      const z = isMe ? me.z : e.z;
      // Standing in a pond: sunk a little, wading.
      m.group.position.set(x, this.h(x, z), z);
      // Struck a moment ago: knocked back a little, and squashed.
      const since = m.hitAt != null ? this.time - m.hitAt : 9;
      if (since < 0.22 && e.k !== 'n') {
        const k = Math.sin((since / 0.22) * Math.PI);
        m.group.position.x += m.hitDir.x * 0.3 * m.hitDir.s * k;
        m.group.position.z += m.hitDir.z * 0.3 * m.hitDir.s * k;
        m.group.scale.set(1 + 0.1 * k, 1 - 0.1 * k, 1 + 0.1 * k);
      } else if (e.k !== 'n' && m.group.scale.y !== 1) m.group.scale.setScalar(1);
      if (e.k === 'n') {
        m.group.visible = true;
        if (m.node) m.node.visible = e.ready;
        m.group.scale.setScalar(e.ready ? 1 : 0.45);
        continue;
      }
      const a = isMe ? me.a : e.a;
      if (Number.isFinite(a)) m.group.rotation.y = a;
      if (!m.mixer) continue;
      const moving = m.last && Math.hypot(x - m.last.x, z - m.last.z) > 0.02;
      m.last = { x, z };
      // Villagers and idle monsters amble; everyone else runs (a sprint leans into it).
      let clip = moving ? (e.k === 'npc' || (e.k === 'm' && e.st === 'idle') ? 'Walking_A' : isMe && this.sprinting && m.actions.Running_B ? 'Running_B' : 'Running_A') : 'Idle';
      let once = false;
      if (e.dead) {
        clip = 'Death_A';
        once = true;
      } else if (e.cast) clip = e.cast.s === 'gather' ? 'Interact' : 'Spellcasting';
      else if (m.oneShot && this.time - m.oneShot.at < (m.oneShot.dur ?? 0.6)) {
        const usual = e.k === 'p' ? m.attack ?? CLASSES[e.c].attack : MOBS[e.ty]?.ranged ? 'Spellcast_Shoot' : '1H_Melee_Attack_Chop';
        clip = m.oneShot.kind === 'swing' || m.oneShot.kind === 'hit' ? usual : 'Spellcast_Shoot';
        if (m.oneShot.clip && m.actions[m.oneShot.clip]) clip = m.oneShot.clip;
        else if (m.oneShot.kind === 'hit') clip = moving ? 'Running_A' : 'Idle';
        once = clip !== 'Running_A' && clip !== 'Idle';
        if (m.playedShot !== m.oneShot) {
          m.playedShot = m.oneShot;
          m.current = null;
        }
      }
      this._play(m, clip, once);
      m.mixer.update(dt);
    }
    for (const [id, m] of this.models) {
      if (seen.has(id)) continue;
      this.scene.remove(m.group);
      this.models.delete(id);
    }
    this._drops(state.drops ?? [], me, dt);
    for (const o of this.zoneGroup?.children ?? []) o.traverse?.((c) => c.userData.spin && (c.rotation.z += dt * 0.7));

    // The target ring.
    const t = this.target != null ? state.ents.find((e) => e.i === this.target) : null;
    this.targetRing.visible = Boolean(t);
    if (t) {
      const isMe = t.i === me.i;
      const rx = isMe ? me.x : t.x;
      const rz = isMe ? me.z : t.z;
      this.targetRing.position.set(rx, this.h(rx, rz) + 0.12, rz);
      const s = t.k === 'm' ? (MOBS[t.ty].scale ?? 1) : 1;
      this.targetRing.scale.setScalar(s);
      this.targetRing.material.color.set(t.k === 'm' ? '#ff5a5a' : t.k === 'p' ? '#5affa0' : '#ffd166');
    }

    // Boss warnings: a growing red circle until it lands.
    while (this.teleGroup.children.length < state.tele.length) {
      const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0.35, depthWrite: false }));
      this.teleGroup.add(ring);
    }
    this.teleGroup.children.forEach((ring, i) => {
      const tl = state.tele[i];
      ring.visible = Boolean(tl);
      if (!tl) return;
      ring.position.set(tl.x, this.h(tl.x, tl.z) + 0.15, tl.z);
      ring.scale.setScalar(tl.r);
      ring.material.opacity = 0.25 + 0.35 * (1 - Math.min(1, tl.left / 2));
    });

    let fi = 0;
    const o = new THREE.Object3D();
    const color = new THREE.Color();
    this.fx = this.fx.filter((f) => (f.t += dt) < f.dur);
    for (const f of this.fx) {
      const k = f.t / f.dur;
      const x = f.from ? f.from.x + (f.to.x - f.from.x) * k : f.x;
      const z = f.from ? f.from.z + (f.to.z - f.from.z) * k : f.z;
      o.position.set(x, f.y + (f.y1 != null ? (f.y1 - f.y) * k - 2.2 * k * k : 0) + this.h(x, z), z);
      o.scale.setScalar(f.from ? f.r0 : f.r0 + (f.r1 - f.r0) * k);
      o.updateMatrix();
      this.fxMesh.setMatrixAt(fi, o.matrix);
      this.fxMesh.setColorAt(fi, color.copy(f.color).multiplyScalar(f.from && !f.fade ? 1 : 1 - k));
      fi++;
    }
    this.fxMesh.count = fi;
    this.fxMesh.instanceMatrix.needsUpdate = true;
    if (this.fxMesh.instanceColor) this.fxMesh.instanceColor.needsUpdate = true;
    for (const sl of this.slashes) {
      if (!sl.busy) continue;
      sl.t += dt;
      if (sl.t < 0) continue;
      sl.holder.visible = true;
      const k = sl.t / sl.dur;
      if (k >= 1) {
        sl.busy = false;
        sl.holder.visible = false;
        continue;
      }
      sl.holder.position.set(sl.x, this.h(sl.x, sl.z) + sl.y, sl.z);
      sl.holder.scale.setScalar(sl.size * (sl.shape === 'full' ? 0.35 + 0.65 * k : 0.85 + 0.15 * k));
      sl.mesh.material.uniforms.uK.value = k;
    }
    this.floaters = this.floaters.filter((f) => (f.t += dt) < (f.life ?? 1.1));
    this.renderer.render(this.scene, this.camera);
  }

  burst(x, z, r, color, dur = 0.5, y = 1) {
    if (this.fx.length > 180) this.fx.shift();
    this.fx.push({ x, z, y, r0: r * 0.2, r1: r, t: 0, dur, color: new THREE.Color(color) });
  }

  missile(from, to, color) {
    if (this.fx.length > 180) this.fx.shift();
    this.fx.push({ from: { x: from.x, z: from.z }, to: { x: to.x, z: to.z }, y: 1.4, r0: 0.25, t: 0, dur: 0.25, color: new THREE.Color(color) });
  }

  /** Name plates, health bars, cast bars and floating numbers. */
  drawOverlay(ctx, state, me, partyIds) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!state || !me) return;
    const dpr = ctx.canvas.width / Math.max(1, this.width);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.textAlign = 'center';
    for (const e of state.ents) {
      if (e.k === 'n') continue;
      const isMe = e.i === me.i;
      const x = isMe ? me.x : e.x;
      const z = isMe ? me.z : e.z;
      if (Math.hypot(x - me.x, z - me.z) > 45) continue;
      const m = this.models.get(e.i);
      const p = this.toScreen(x, (m?.height ?? 2) + 0.5, z);
      if (!p.front || p.x < -60 || p.x > this.width + 60 || p.y < -30 || p.y > this.height + 30) continue;
      if (e.k === 'npc') {
        const n = NPCS[e.npc];
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillStyle = '#ffe28a';
        ctx.fillText(n.name, p.x, p.y);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(`<${n.title}>`, p.x, p.y + 13);
        if (e.mark) {
          ctx.font = '900 20px system-ui, sans-serif';
          ctx.fillStyle = e.mark === '?' ? '#ffd24a' : '#ffd24a';
          ctx.fillText(e.mark, p.x, p.y - 16);
        }
        continue;
      }
      const name = e.k === 'p' ? e.n : `${MOBS[e.ty].name} (${e.l})`;
      ctx.font = `${e.i === this.target ? 800 : 600} 12px system-ui, sans-serif`;
      ctx.fillStyle = e.k === 'p' ? (isMe ? '#ffffff' : partyIds.has(e.i) ? '#7dd3ff' : '#9effa8') : MOBS[e.ty].elite ? '#ffb05c' : '#ff8a8a';
      ctx.fillText(name, p.x, p.y);
      if (e.dead) continue;
      const w = 58;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(p.x - w / 2 - 1, p.y + 4, w + 2, 6);
      ctx.fillStyle = e.k === 'p' ? '#3fbf5f' : '#d9473f';
      ctx.fillRect(p.x - w / 2, p.y + 5, w * Math.max(0, e.hp / Math.max(1, e.mh)), 4);
      if (e.cast && e.cast.total) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(p.x - w / 2 - 1, p.y + 11, w + 2, 5);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(p.x - w / 2, p.y + 12, w * (1 - e.cast.left / e.cast.total), 3);
      }
    }
    // Loot: each thing's name over it, in its rarity's colour.
    for (const d of this.myDrops ?? []) {
      if (Math.hypot(d.x - me.x, d.z - me.z) > 40) continue;
      const p = this.toScreen(d.x, 1.5, d.z);
      if (!p.front) continue;
      const it = ITEMS[d.item];
      const rarity = it?.slot ? it.rarity ?? 'common' : null;
      const name = it?.name ?? '?';
      ctx.font = '800 12px Nunito, system-ui, sans-serif';
      const w = ctx.measureText(name).width + 12;
      ctx.fillStyle = 'rgba(10, 8, 18, 0.78)';
      ctx.fillRect(p.x - w / 2, p.y - 12, w, 17);
      ctx.fillStyle = RARITY_INFO[rarity]?.color ?? '#e8d9a8';
      ctx.fillText(name, p.x, p.y + 1);
    }
    ctx.lineJoin = 'round';
    for (const f of this.floaters) {
      const life = f.life ?? 1.1;
      const p = this.toScreen(f.x, 2.6 + f.t * 2, f.z);
      if (!p.front) continue;
      // Numbers pop in big, settle, drift aside and fade.
      const pop = f.t < 0.12 ? 0.6 + (f.t / 0.12) * 0.75 : Math.max(1, 1.35 - (f.t - 0.12) * 2.2);
      const size = Math.round((f.size ?? 15) * pop);
      ctx.font = `900 ${size}px Nunito, system-ui, sans-serif`;
      ctx.globalAlpha = Math.max(0, Math.min(1, (life - f.t) / 0.4));
      const px = p.x + (f.dx ?? 0) * (0.4 + f.t);
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(20,10,30,0.85)';
      ctx.strokeText(f.text, px, p.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, px, p.y);
      if (f.tag) {
        ctx.font = `900 ${Math.round(size * 0.5)}px Nunito, system-ui, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeText(f.tag, px, p.y - size * 0.95);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f.tag, px, p.y - size * 0.95);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  dispose() {
    this.renderer.dispose();
    this.canvas.remove();
  }
}
