import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMap } from './map.js';
import { TEAM, PLAYER, WEAPONS } from './rules.js';
import { surface, worldBox, PropBatch, sky } from './assets.js';
import { loadSoldier, Soldier } from './soldier.js';
import { gunModel } from './guns.js';

/**
 * Draws a match of Breachline: the works yard (brick warehouses, shipping
 * containers, crates, barrels and gas tanks — photoscanned props and
 * surfaces from the asset library, see assets.js), the players as animated
 * soldiers in their team's colours (soldier.js), the weapon in your hands
 * (guns.js), shots as streaks of light, the charge. It only reads the
 * match; it changes nothing in it. Without the asset library it still
 * draws: plain textured shapes and plain figures.
 */

/** A wash over each team's uniforms, on top of their arm bands. */
const TINT = { atk: '#f3d7b4', def: '#95acc9' };
const CONTAINER_COLORS = ['#8c3a2a', '#2c5a86', '#3f6a46', '#b3a383', '#c0682c', '#5b6066'];

/** A small seeded random, so the yard is dressed the same way every time. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class FpsView {
  /** @param {HTMLElement} host @param {any} [map] a map from map.js (Foundry when left out) */
  constructor(host, map = getMap('foundry')) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'bl__canvas';
    host.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#b9cad8');
    this.scene.fog = new THREE.Fog('#c3cfd9', 110, 360);
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 900);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.fov = 74;
    this.scene.add(new THREE.HemisphereLight('#e6efff', '#8a8072', 1.15));
    const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this._charge0();
    this.setMap(map);
    this._viewModel();
    sky(this.renderer, this.scene).then(() => {
      this.vmScene.environment = this.scene.environment;
      this.vmScene.environmentIntensity = 0.8;
    });
    this.bodies = new Map();
    this.tracers = [];
    this.sparks = [];
    this.recoil = 0;
    this.bob = 0;
    this.time = 0;
  }

  /* ----------------------------------------------------------------- map */

  /** Build a map's world (and take down the last one's). */
  setMap(map) {
    if (this.mapDef?.id === map.id) return;
    if (this.yard) {
      this.scene.remove(this.yard);
      this.yard.traverse((o) => o.geometry?.dispose?.());
    }
    this.mapDef = map;
    const [W, D] = map.SIZE;
    this.center = [W / 2, D / 2];
    // The sun's shadows cover the whole map.
    const reach = Math.max(W, D) / 2 + 22;
    this.sun.position.set(this.center[0] + 70, 95, this.center[1] - 40);
    this.sun.target.position.set(this.center[0], 0, this.center[1]);
    Object.assign(this.sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10, far: 320 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this._map();
  }

  _map() {
    const { BOXES, SITES, SPAWNS, look = {} } = this.mapDef;
    const CENTER = this.center;
    const yard = new THREE.Group();
    this.yard = yard;
    this.scene.add(yard);
    this.props = new PropBatch(yard);
    const rand = seeded(1307);
    const mesh = (geo, mat, x, y, z, { shadow = true } = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = shadow;
      m.receiveShadow = true;
      yard.add(m);
      return m;
    };
    // The ground: asphalt everywhere, worn concrete pads at the sites, paving in the two starting yards.
    const flat = (w, d, tile) => {
      const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
      return g;
    };
    const paved = look.ground === 'paving';
    mesh(flat(700, 700, paved ? 3 : 6), paved ? surface('paving', { color: '#a49f96' }) : surface('asphalt', { color: '#858585' }), CENTER[0], 0, CENTER[1], { shadow: false });
    for (const s of Object.values(SITES)) mesh(flat(s.r * 2 + 6, s.r * 2 + 6, 5), surface('slab', { color: '#6e6b66' }), s.x, 0.012, s.z, { shadow: false });
    for (const side of ['atk', 'def']) {
      const xs = SPAWNS[side].map((p) => p[0]);
      const x = (Math.min(...xs) + Math.max(...xs)) / 2;
      if (!paved) mesh(flat(14, 22, 3), surface('paving', { color: '#b3aea5' }), x, 0.012, CENTER[1], { shadow: false });
    }
    // Lines painted on the road.
    const paint = new THREE.MeshStandardMaterial({ color: '#e9e4d2', roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    if (look.lines != null) for (let x = 18; x < this.mapDef.SIZE[0] - 46; x += 6) mesh(new THREE.PlaneGeometry(3, 0.16).rotateX(-Math.PI / 2), paint, x, 0.02, look.lines, { shadow: false });
    // The sites: a painted ring and a letter on the ground.
    for (const [name, s] of Object.entries(SITES)) {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d');
      g.strokeStyle = '#ffcf3a';
      g.lineWidth = 16;
      g.setLineDash([46, 26]);
      g.beginPath();
      g.arc(256, 256, 236, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#ffcf3a';
      g.font = '900 300px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, 256, 272);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.9, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4 });
      mesh(new THREE.PlaneGeometry(s.r * 2, s.r * 2).rotateX(-Math.PI / 2), mat, s.x, 0.03, s.z, { shadow: false });
    }
    // The solid things.
    const crates = { body: [], frame: [] };
    BOXES.forEach(([x, z, w, d, h, kind = 'crates'], i) => {
      const cx = x + w / 2;
      const cz = z + d / 2;
      if (kind === 'wall') {
        mesh(worldBox(w, h, d, 4), surface('wall'), cx, 0, cz);
        mesh(worldBox(w + 0.3, 0.25, d + 0.3, 2), surface('concrete'), cx, h, cz);
      } else if (kind === 'building') this._building(yard, mesh, x, z, w, d, h, i, rand);
      else if (kind === 'container') this._container(mesh, x, z, w, d, h, i);
      else if (kind === 'crates') this._crates(crates, x, z, w, d, h);
      else this._pile(mesh, kind, x, z, w, d, h, rand);
    });
    const plank = surface('planks');
    const frameWood = surface('planks', { color: '#8e7356' });
    if (crates.body.length) mesh(mergeGeometries(crates.body), plank, 0, 0, 0);
    if (crates.frame.length) mesh(mergeGeometries(crates.frame), frameWood, 0, 0, 0);
    this._scenery(rand);
    this.props.build({ flat: new Set(['shutterWindow', 'shutterDoor', 'pipes', 'securityLight', 'fireEscape', 'lamp', 'aircon', 'bag']) }).then((n) => (this.propsDrawn = n));
  }

  /** The charge: a case with a light that blinks faster as its time runs out. */
  _charge0() {
    this.chargeMesh = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.5, metalness: 0.4 }));
    box.position.y = 0.11;
    box.castShadow = true;
    this.chargeLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
    this.chargeLight.position.set(0.12, 0.25, 0);
    this.chargeMesh.add(box, this.chargeLight);
    this.chargeMesh.visible = false;
    this.scene.add(this.chargeMesh);
  }

  /** A brick warehouse: a concrete plinth and cornice, roller doors, shuttered windows, pipes, units on the walls. */
  _building(yard, mesh, x, z, w, d, h, i, rand) {
    const cx = x + w / 2;
    const cz = z + d / 2;
    const walls = this.mapDef.look?.walls ?? ['brick', 'brickRed'];
    mesh(worldBox(w, h, d, 3), surface(walls[i % walls.length]), cx, 0, cz);
    mesh(worldBox(w + 0.12, 0.8, d + 0.12, 3), surface('concrete'), cx, 0, cz);
    mesh(worldBox(w + 0.5, 0.45, d + 0.5, 3), surface('concrete'), cx, h - 0.2, cz);
    mesh(worldBox(w - 1, 0.6, d - 1, 4), surface('slab', { color: '#6d6a64' }), cx, h + 0.1, cz);
    // Each face: [start, end along it, the point at its start, its outward normal].
    const faces = [
      [x, x + w, (t) => [t, z], [0, -1]],
      [x, x + w, (t) => [t, z + d], [0, 1]],
      [z, z + d, (t) => [x, t], [-1, 0]],
      [z, z + d, (t) => [x + w, t], [1, 0]]
    ];
    faces.forEach(([a, b, at, [nx, nz]], f) => {
      const turn = Math.atan2(nx, nz);
      const len = b - a;
      const put = (name, t, y, out = 0, scale = 1) => {
        const [px, pz] = at(t);
        this.props.add(name, px + nx * out, y, pz + nz * out, turn, scale);
      };
      // Along each tangent, `t` runs with the face; models line up with their own x, which a turn may flip.
      const flip = nz > 0 || nx < 0 ? -1 : 1;
      if (len > 10) {
        for (let t = a + 5; t < b - 5; t += 11) put('shutterDoor', t - flip * 1.0, 0, 0.02);
        for (let t = a + 3; t < b - 4; t += 5.5) put('shutterWindow', t - flip * 1.0, h - 3.2, 0.02);
        put('pipes', a + 0.9, h - 2.4, 0.15, 1.2);
        put('securityLight', a + len * 0.5, h - 1.6, 0.02);
      }
      if (len > 20 && f % 2 === i % 2) put('aircon', a + len * 0.66, 3.1, 0.25);
      if (len > 25 && f === (i % 4)) put('fireEscape', a + len * 0.3, 3.6, 0.8);
      // A little clutter at the foot of the wall.
      if (len > 12) {
        const k = rand();
        put(k < 0.35 ? 'utility' : k < 0.6 ? 'trash' : k < 0.8 ? 'jerrycan' : 'tyre', a + 1.5 + rand() * (len - 3), k > 0.8 ? 0.3 : 0, 0.3);
      }
    });
  }

  /** A shipping container: corrugated steel in a paint colour, corner posts and rails, locking bars on its doors. */
  _container(mesh, x, z, w, d, h, i) {
    const cx = x + w / 2;
    const cz = z + d / 2;
    const paint = CONTAINER_COLORS[i % CONTAINER_COLORS.length];
    mesh(worldBox(w - 0.06, h - 0.1, d - 0.06, 1.2), surface('steel', { color: paint, roughness: 0.9 }), cx, 0.05, cz);
    const frame = surface('metal', { color: new THREE.Color(paint).multiplyScalar(0.8).getStyle() });
    const parts = [];
    for (const [px, pz] of [[x, z], [x + w, z], [x, z + d], [x + w, z + d]]) parts.push(worldBox(0.16, h, 0.16, 1).translate(px + (px > cx ? -0.08 : 0.08), 0, pz + (pz > cz ? -0.08 : 0.08)));
    for (const y of [0, h - 0.14]) {
      parts.push(worldBox(w, 0.14, 0.12, 1).translate(cx, y, z + 0.06), worldBox(w, 0.14, 0.12, 1).translate(cx, y, z + d - 0.06));
      parts.push(worldBox(0.12, 0.14, d, 1).translate(x + 0.06, y, cz), worldBox(0.12, 0.14, d, 1).translate(x + w - 0.06, y, cz));
    }
    // The doors are on a short end; four locking bars stand on them.
    const long = w > d;
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * (Math.min(w, d) / 4.6);
      parts.push(long ? worldBox(0.05, h - 0.35, 0.05, 1).translate(x + w + 0.03, 0.17, cz + off) : worldBox(0.05, h - 0.35, 0.05, 1).translate(cx + off, 0.17, z + d + 0.03));
    }
    mesh(mergeGeometries(parts), frame, 0, 0, 0);
  }

  /** A stack of wooden crates, framed in darker boards, fitted to the box. */
  _crates(out, x, z, w, d, h) {
    const nx = Math.max(1, Math.round(w / 1.2));
    const nz = Math.max(1, Math.round(d / 1.2));
    const ny = Math.max(1, Math.round(h / 1.2));
    const [uw, ud, uh] = [w / nx, d / nz, h / ny];
    const t = 0.07;
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++)
        for (let j = 0; j < ny; j++) {
          const cx = x + uw * (i + 0.5);
          const cz = z + ud * (k + 0.5);
          const y = uh * j;
          out.body.push(worldBox(uw - 0.04, uh - 0.02, ud - 0.04, 1.2).translate(cx, y, cz));
          // The frame: twelve edges, a little proud of the boards.
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) out.frame.push(worldBox(t, uh - 0.02, t, 1.2).translate(cx + sx * (uw / 2 - 0.02 - t / 2 + 0.01), y, cz + sz * (ud / 2 - 0.02 - t / 2 + 0.01)));
          for (const yy of [y, y + uh - 0.02 - t]) {
            for (const sz of [-1, 1]) out.frame.push(worldBox(uw - 0.02, t, t, 1.2).translate(cx, yy, cz + sz * (ud / 2 - 0.02 - t / 2 + 0.01)));
            for (const sx of [-1, 1]) out.frame.push(worldBox(t, t, ud - 0.02, 1.2).translate(cx + sx * (uw / 2 - 0.02 - t / 2 + 0.01), yy, cz));
          }
          // A diagonal brace on the two long faces.
          const diag = Math.hypot(uw, uh) - 0.2;
          for (const sz of [-1, 1]) {
            const g = worldBox(diag, t * 0.8, t * 0.6, 1.2).translate(0, -t * 0.4, 0);
            g.rotateZ(Math.atan2(uh, uw)).translate(cx, y + uh / 2, cz + sz * (ud / 2 - 0.005));
            out.frame.push(g);
          }
        }
  }

  /** Barrels, gas bottles on a pallet, or sacks of cement on a pallet — real props, with a plain shape until they arrive. */
  _pile(mesh, kind, x, z, w, d, h, rand) {
    const cx = x + w / 2;
    const cz = z + d / 2;
    if (kind === 'barrels') {
      const n = Math.max(1, Math.floor(w / 0.64));
      const m = Math.max(1, Math.floor(d / 0.64));
      const k = Math.min(1.35, h / 0.9);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++) {
          const pick = ['barrel1', 'barrel2', 'barrel3'][Math.floor(rand() * 3)];
          this.props.add(pick, x + (w / n) * (i + 0.5), 0, z + (d / m) * (j + 0.5), rand() * 6.3, k);
        }
      return;
    }
    // A pallet under the rest.
    mesh(worldBox(w, 0.14, d, 1.2), surface('planks', { color: '#b59a76' }), cx, 0, cz);
    if (kind === 'tanks') {
      const n = Math.max(1, Math.floor(w / 0.66));
      const m = Math.max(1, Math.floor(d / 0.66));
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) this.props.add('propane', x + (w / n) * (i + 0.5), 0.14, z + (d / m) * (j + 0.5), rand() * 6.3, 1.75);
      return;
    }
    // Cement: rows across, then along, layer on layer.
    const layers = Math.max(1, Math.round((h - 0.14) / 0.18));
    for (let l = 0; l < layers; l++) {
      const across = l % 2 === 0;
      const [bw, bd] = across ? [0.46, 0.7] : [0.7, 0.46];
      const n = Math.max(1, Math.floor(w / (bw + 0.02)));
      const m = Math.max(1, Math.floor(d / (bd + 0.02)));
      for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++) this.props.add('bag', x + (w / n) * (i + 0.5), 0.14 + l * 0.18, z + (d / m) * (j + 0.5), (across ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.12, 1);
    }
  }

  /** Beyond the yard wall: factory fronts and blocks of flats; inside it, lamps and odds and ends. */
  _scenery(rand) {
    const [W, D] = this.mapDef.SIZE;
    // Blocks beyond the wall, each a few storeys of brick or concrete with shuttered windows facing the yard.
    const blocks = [];
    for (let x = -14; x < W + 14; ) {
      const w = 14 + rand() * 16;
      blocks.push([x, -8 - rand() * 10, w, 0], [x, D + 8 + rand() * 10, w, Math.PI]);
      x += w + 2 + rand() * 6;
    }
    for (let z = 0; z < D; ) {
      const w = 14 + rand() * 14;
      blocks.push([-8 - rand() * 10, z, w, Math.PI / 2], [W + 8 + rand() * 10, z, w, -Math.PI / 2]);
      z += w + 2 + rand() * 6;
    }
    const looks = [surface('brick'), surface('brickRed'), surface('wall'), surface('concrete', { color: '#b8b2a6' })];
    // Far away, a window is a pane in a frame: all of them in two meshes.
    const panes = [];
    const frames = [];
    for (const [x, z, w, turn] of blocks) {
      const floors = 2 + Math.floor(rand() * 4);
      const h = floors * 3.4 + 1;
      const deep = 12;
      // `x, z` is where the block's front starts; it runs `w` along the wall and `deep` away from the yard.
      const along = [Math.cos(turn), -Math.sin(turn)];
      const back = [-Math.sin(turn), -Math.cos(turn)];
      const cx = x + along[0] * (w / 2) + back[0] * (deep / 2);
      const cz = z + along[1] * (w / 2) + back[1] * (deep / 2);
      const body = new THREE.Mesh(worldBox(w, h, deep, 3), looks[Math.floor(rand() * looks.length)]);
      body.position.set(cx, 0, cz);
      body.rotation.y = turn;
      body.receiveShadow = true;
      this.yard.add(body);
      const cap = new THREE.Mesh(worldBox(w + 0.4, 0.5, deep + 0.4, 3), surface('concrete', { color: '#9c978e' }));
      cap.position.set(cx, h, cz);
      cap.rotation.y = turn;
      this.yard.add(cap);
      for (let f = 0; f < floors; f++)
        for (let t = 2.2; t < w - 2.5; t += 3.6) {
          const px = x + along[0] * t;
          const pz = z + along[1] * t;
          frames.push(new THREE.BoxGeometry(1.7, 1.9, 0.12).rotateY(turn).translate(px, 2.2 + f * 3.4, pz));
          panes.push(new THREE.PlaneGeometry(1.4, 1.6).rotateY(turn).translate(px - back[0] * 0.07, 2.2 + f * 3.4, pz - back[1] * 0.07));
        }
    }
    if (frames.length) {
      this.yard.add(new THREE.Mesh(mergeGeometries(frames), new THREE.MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.8 })));
      this.yard.add(new THREE.Mesh(mergeGeometries(panes), new THREE.MeshStandardMaterial({ color: '#28323c', roughness: 0.08, metalness: 0.6 })));
    }
    // Lamps along the yard wall, facing in.
    for (let x = 18; x < W - 6; x += 40) {
      this.props.add('lamp', x, 0, 0.5, 0, 1);
      this.props.add('lamp', x + 20, 0, D - 0.5, Math.PI, 1);
    }
    // Odds and ends where nobody walks: by the yard wall.
    const things = ['trash', 'tyre', 'jerrycan', 'generator', 'handTruck', 'trashCan', 'militaryCrate'];
    for (let i = 0; i < 26; i++) {
      const name = things[Math.floor(rand() * things.length)];
      const along = 6 + rand() * (W - 12);
      const north = rand() < 0.5;
      this.props.add(name, along, name === 'tyre' ? 0.3 : 0, north ? 0.7 : D - 0.7, (north ? 0 : Math.PI) + (rand() - 0.5) * 0.6, 1);
    }
  }

  /* ---------------------------------------------------------- people */

  /** A plain figure: while the soldier loads, or if it can't. */
  _plain(side) {
    const color = new THREE.Color(TEAM[side].color);
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.45), roughness: 0.8 });
    const g = new THREE.Group();
    const part = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    part(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), cloth, 0, 1.05, 0);
    part(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), dark, -0.14, 0.4, 0);
    part(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), dark, 0.14, 0.4, 0);
    part(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: '#d9a988', roughness: 0.8 }), 0, 1.6, 0);
    return g;
  }

  _body(p, side) {
    const b = { group: new THREE.Group(), side, fall: 0, soldier: null, weapon: null, gone: false };
    b.plain = this._plain(side);
    b.group.add(b.plain);
    this.scene.add(b.group);
    loadSoldier().then((gltf) => {
      if (!gltf || b.gone) return;
      b.weapon = b.wantWeapon ?? 'sidearm';
      b.soldier = new Soldier(gltf, TEAM[side].color, TINT[side], gunModel(b.weapon));
      b.group.remove(b.plain);
      b.group.add(b.soldier.group);
    });
    return b;
  }

  _people(match, viewer, dt) {
    this.time += dt;
    for (const p of match.players) {
      const side = match.sideOf(p.squad);
      let b = this.bodies.get(p.id);
      if (b && b.side !== side) {
        b.gone = true;
        b.soldier?.dispose();
        this.scene.remove(b.group);
        b = null;
      }
      if (!b) {
        b = this._body(p, side);
        this.bodies.set(p.id, b);
      }
      const visible = !(p === viewer && p.alive);
      b.group.visible = visible;
      b.group.position.set(p.x, p.y, p.z);
      // The body turns smoothly to where its owner looks; the walk shows while moving, without flickering on and off.
      b.yaw = b.yaw == null || !p.alive ? p.yaw : b.yaw + Math.atan2(Math.sin(p.yaw - b.yaw), Math.cos(p.yaw - b.yaw)) * Math.min(1, dt * 14);
      b.group.rotation.y = b.yaw;
      b.moveFor = p.moving ? 0.2 : Math.max(0, (b.moveFor ?? 0) - dt);
      // The dead fall back and lie still.
      b.fall = p.alive ? 0 : Math.min(1, b.fall + dt * 2.6);
      const ease = 1 - (1 - b.fall) ** 3;
      b.group.rotation.x = ease * (Math.PI / 2) * 0.97;
      b.group.position.y = p.y + ease * 0.12;
      const weapon = match.weaponOf(p);
      b.wantWeapon = weapon;
      if (b.soldier && visible) {
        if (b.weapon !== weapon) {
          b.weapon = weapon;
          b.soldier.hold(gunModel(weapon));
        }
        b.soldier.update(dt, { moving: b.moveFor > 0, slow: p.scoped || p.using > 0, pitch: p.pitch, alive: p.alive });
      }
    }
  }

  /* ---------------------------------------------------- the gun in hand */

  /** The weapon in your hands is drawn in its own pass, so it never sinks into a wall. */
  _viewModel() {
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    this.vmScene.add(this.vmCamera);
    this.vmScene.add(new THREE.HemisphereLight('#eef4ff', '#6b6457', 1.3));
    const key = new THREE.DirectionalLight('#fff1dc', 2.2);
    key.position.set(1, 2, 1);
    this.vmScene.add(key);
    const g = new THREE.Group();
    this.gun = g;
    this.vmCamera.add(g);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(this.flash);
    // Gloved hands and sleeves.
    const glove = new THREE.MeshStandardMaterial({ color: '#2a2926', roughness: 0.85 });
    this.sleeve = new THREE.MeshStandardMaterial({ color: '#3d4234', roughness: 0.95 });
    const hand = () => {
      const h = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.085, 0.1), glove);
      const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.08), glove);
      fingers.position.set(0, 0.03, -0.05);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.22, 16), this.sleeve);
      arm.rotation.x = Math.PI / 2;
      arm.position.z = 0.15;
      h.add(palm, fingers, arm);
      g.add(h);
      return h;
    };
    this.hands = [hand(), hand()];
  }

  /** Put the weapon `id` in your hands. */
  holding(id) {
    if (this.held === id) return;
    this.held = id;
    if (this.heldModel) this.gun.remove(this.heldModel);
    const model = gunModel(id);
    const { grip, fore, muzzle } = model.userData;
    const slot = WEAPONS[id].slot;
    const pistol = slot === 2;
    const inHand = slot >= 3; // the knife or a grenade: one hand, held low
    // Where the right hand sits in front of the eye.
    const at = inHand ? new THREE.Vector3(0.2, -0.16, -0.5) : pistol ? new THREE.Vector3(0.13, -0.17, -0.42) : new THREE.Vector3(0.21, -0.235, -0.64);
    model.position.copy(at).sub(grip);
    this.gun.add(model);
    this.heldModel = model;
    this.flash.position.copy(muzzle).add(model.position);
    const [right, left] = this.hands;
    right.position.copy(grip).add(model.position);
    right.rotation.set(inHand ? 0.15 : 0.6, inHand ? 0.05 : 0.25, 0);
    left.visible = !inHand;
    left.position.copy(fore).add(model.position).add(new THREE.Vector3(-0.01, -0.02, 0));
    left.rotation.set(0.95, pistol ? -0.2 : -0.35, pistol ? 0 : 0.35);
    this.draw = 0.3; // it comes up into view
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    for (const c of [this.camera, this.vmCamera]) {
      c.aspect = w / Math.max(1, h);
      c.updateProjectionMatrix();
    }
  }

  /** What just happened, shown: streaks for shots, sparks where they land, a kick for your own. */
  show(events, match, viewer) {
    for (const e of events) {
      if (e.type === 'shot') {
        const mine = e.id === viewer?.id && viewer.alive;
        const from = new THREE.Vector3(...e.from);
        if (mine) {
          // From just below the eye, roughly where the muzzle is on screen.
          from.copy(this.camera.position).add(new THREE.Vector3(0.12, -0.12, -0.6).applyQuaternion(this.camera.quaternion));
          this.recoil = Math.min(1, this.recoil + 0.45);
          this.flash.material.opacity = 1;
          this.flash.rotation.z = Math.random() * 6;
        } else {
          const b = this.bodies.get(e.id);
          const muzzle = b?.soldier?.gun?.userData.muzzle;
          if (muzzle && b.group.visible) from.copy(b.soldier.gun.localToWorld(muzzle.clone()));
        }
        const to = new THREE.Vector3(...e.to);
        const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: mine ? '#fff3c4' : '#ffe2a0', transparent: true, opacity: mine ? 0.5 : 0.75 }));
        this.scene.add(line);
        this.tracers.push({ line, t: 0 });
        const spark = new THREE.Mesh(new THREE.SphereGeometry(e.hit != null ? 0.11 : 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: e.hit != null ? '#c4261a' : '#ffe9b0', transparent: true }));
        spark.position.copy(to);
        this.scene.add(spark);
        this.sparks.push({ mesh: spark, t: 0 });
        // A puff of dust where a shot meets a wall.
        if (e.hit == null) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#b8ae9c', transparent: true, opacity: 0.6, depthWrite: false }));
          puff.position.copy(to);
          this.scene.add(puff);
          this.sparks.push({ mesh: puff, t: 0, grow: 5, life: 0.5 });
        }
      } else if (e.type === 'slash' && e.id === viewer?.id) {
        this.swing = 1;
      } else if (e.type === 'blast') {
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0.95 }));
        flash.position.set(e.x, e.y + 0.4, e.z);
        this.scene.add(flash);
        this.sparks.push({ mesh: flash, t: 0, grow: 18, life: 0.35 });
        // Dust and smoke thrown up: soft puffs that rise, swell and thin.
        for (let i = 0; i < 9; i++) {
          const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._puffTexture(), color: i < 3 ? '#4a4038' : '#8a8279', transparent: true, depthWrite: false, opacity: 0.85 }));
          const a = Math.random() * Math.PI * 2;
          puff.position.set(e.x + Math.cos(a) * 0.6, e.y + 0.4 + Math.random() * 0.8, e.z + Math.sin(a) * 0.6);
          puff.scale.setScalar(1.2);
          this.scene.add(puff);
          this.sparks.push({ mesh: puff, t: 0, grow: 2.2, life: 1.2 + Math.random() * 0.6, rise: 0.8 + Math.random() });
        }
      } else if (e.type === 'boom') {
        const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
        blast.position.set(e.x, 1, e.z);
        this.scene.add(blast);
        this.sparks.push({ mesh: blast, t: 0, grow: 22, life: 1.1 });
        const smoke = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#3d3a36', transparent: true, opacity: 0.7, depthWrite: false }));
        smoke.position.set(e.x, 2, e.z);
        this.scene.add(smoke);
        this.sparks.push({ mesh: smoke, t: 0, grow: 9, life: 3 });
      }
    }
  }

  /**
   * Draw a frame: through `viewer`'s eyes if they are alive, else from
   * behind a living teammate.
   */
  render(match, viewer, dt, { zoom = false } = {}) {
    if (match.map && match.map.id !== this.mapDef.id) this.setMap(match.map);
    this._people(match, viewer, dt);
    const eye = viewer?.alive ? viewer : match.players.find((p) => p.alive && p.squad === viewer?.squad) ?? match.players.find((p) => p.alive) ?? viewer;
    const first = eye === viewer && viewer?.alive;
    this.watching = first ? null : eye;
    if (first) {
      this.bob = viewer.moving && viewer.y <= 0 ? this.bob + dt * 10 : this.bob;
      this.camera.position.set(viewer.x, viewer.y + PLAYER.eye + (viewer.moving ? Math.sin(this.bob) * 0.035 : 0), viewer.z);
      this.camera.rotation.set(viewer.pitch + this.recoil * 0.035, viewer.yaw, 0);
    } else if (eye) {
      // Watching someone: the camera follows behind them, easing after their moves and turns rather than copying each twitch.
      const w = this.spec;
      if (!w || w.id !== eye.id) this.spec = { id: eye.id, x: eye.x, y: eye.y, z: eye.z, yaw: eye.yaw };
      else {
        const k = Math.min(1, dt * 7);
        w.x += (eye.x - w.x) * k;
        w.y += (eye.y - w.y) * k;
        w.z += (eye.z - w.z) * k;
        w.yaw += Math.atan2(Math.sin(eye.yaw - w.yaw), Math.cos(eye.yaw - w.yaw)) * Math.min(1, dt * 3.5);
      }
      const s = this.spec;
      const back = 3.4;
      this.camera.position.set(s.x + Math.sin(s.yaw) * back, s.y + 2.4, s.z + Math.cos(s.yaw) * back);
      this.camera.rotation.set(-0.2, s.yaw, 0);
    }
    const w = viewer && WEAPONS[match.weaponOf(viewer)];
    const want = first && zoom && w?.zoom ? w.zoom : 74;
    this.fov += (want - this.fov) * Math.min(1, dt * 14);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    // The gun in hand: kicks back when fired, dips while reloading, hides through a scope.
    this.gun.visible = Boolean(first) && this.fov > 50;
    if (first) {
      this.holding(match.weaponOf(viewer));
      
      this.recoil = Math.max(0, this.recoil - dt * 6);
      this.draw = Math.max(0, (this.draw ?? 0) - dt);
      const down = (viewer.reloading > 0 ? 0.14 : 0) + this.draw * 0.6;
      const sway = viewer.moving ? Math.cos(this.bob * 0.5) * 0.008 : Math.sin(this.time * 1.3) * 0.002;
      this.gun.position.set(sway, -down + (viewer.moving ? Math.abs(Math.sin(this.bob)) * 0.01 : 0), this.recoil * 0.05);
      this.swing = Math.max(0, (this.swing ?? 0) - dt * 4);
      const cut = Math.sin(this.swing * Math.PI);
      this.gun.rotation.set(this.recoil * 0.1 - down * 1.2 - cut * 0.6, cut * 0.9, (viewer.reloading > 0 ? 0.3 : 0) + cut * 0.5);
    }
    this._fade(dt);
    this._charge(match);
    this._grenades(match, dt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (this.gun.visible) {
      this.renderer.clearDepth();
      this.renderer.render(this.vmScene, this.vmCamera);
    }
  }

  _fade(dt) {
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 16);
    this.tracers = this.tracers.filter((t) => {
      t.t += dt;
      t.line.material.opacity = Math.max(0, 0.7 - t.t * 7);
      if (t.t < 0.1) return true;
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      return false;
    });
    this.sparks = this.sparks.filter((s) => {
      s.t += dt;
      const life = s.life ?? 0.25;
      s.mesh.material.opacity = Math.max(0, (s.mesh.material.userData.from ??= s.mesh.material.opacity) * (1 - s.t / life));
      s.mesh.scale.setScalar((s.mesh.isSprite ? 1.2 : 1) * (1 + s.t * (s.grow ?? 4)));
      if (s.rise) s.mesh.position.y += s.rise * dt;
      if (s.t < life) return true;
      this.scene.remove(s.mesh);
      s.mesh.geometry?.dispose();
      if (s.mesh.isSprite) s.mesh.material.dispose();
      return false;
    });
  }

  /** A soft round puff, drawn once, for every smoke. */
  _puffTexture() {
    if (this.puff) return this.puff;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(235,235,232,0.95)');
    grad.addColorStop(0.5, 'rgba(215,215,212,0.6)');
    grad.addColorStop(1, 'rgba(200,200,198,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.puff = new THREE.CanvasTexture(c);
    this.puff.colorSpace = THREE.SRGBColorSpace;
    return this.puff;
  }

  /** Grenades in the air, and smoke where it hangs: a cloud of puffs that swells, drifts and thins. */
  _grenades(match, dt) {
    this.nadeMeshes ??= [];
    const list = match.nades ?? [];
    while (this.nadeMeshes.length < list.length) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#4b5a3a', roughness: 0.6 }));
      m.castShadow = true;
      this.scene.add(m);
      this.nadeMeshes.push(m);
    }
    this.nadeMeshes.forEach((m, i) => {
      m.visible = i < list.length;
      if (!m.visible) return;
      m.position.set(list[i].x, list[i].y, list[i].z);
      m.material.color.set(list[i].kind === 'frag' ? '#4b5a3a' : '#8a8d92');
    });
    this.clouds ??= new Map();
    const live = new Set();
    for (const s of match.smokes ?? []) {
      const key = `${s.x}|${s.z}|${s.at}`;
      live.add(key);
      let cloud = this.clouds.get(key);
      if (!cloud) {
        cloud = new THREE.Group();
        const rand = seeded(Math.round(s.x * 100 + s.z * 7));
        for (let i = 0; i < 26; i++) {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._puffTexture(), color: '#d9d9d6', transparent: true, depthWrite: false, opacity: 0 }));
          const a = rand() * Math.PI * 2;
          const r = Math.sqrt(rand());
          sprite.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.2 + rand() * 0.75, size: 0.7 + rand() * 0.6, spin: (rand() - 0.5) * 0.3 };
          cloud.add(sprite);
        }
        cloud.position.set(s.x, 0, s.z);
        this.scene.add(cloud);
        this.clouds.set(key, cloud);
      }
      const age = match.time - s.at;
      const grow = Math.min(1, age / 1.2);
      const thin = Math.max(0, Math.min(1, (s.until - match.time) / 2.5));
      for (const sprite of cloud.children) {
        const u = sprite.userData;
        const r = s.r * grow;
        sprite.position.set(u.x * r, u.y * 3.2 * grow + Math.sin(age * 0.3 + u.x) * 0.15, u.z * r);
        sprite.scale.setScalar(s.r * u.size * (0.5 + 0.5 * grow) * 1.15);
        sprite.material.opacity = 0.92 * thin * Math.min(1, age * 2);
        sprite.material.rotation += u.spin * dt;
      }
    }
    for (const [key, cloud] of this.clouds) {
      if (live.has(key)) continue;
      this.scene.remove(cloud);
      for (const sp of cloud.children) sp.material.dispose();
      this.clouds.delete(key);
    }
  }

  /** The charge: on the ground where it was dropped or set. */
  _charge(match) {
    const c = match.charge;
    this.chargeMesh.visible = Boolean(c && (c.state === 'dropped' || c.state === 'planted' || c.state === 'safe'));
    if (this.chargeMesh.visible) {
      this.chargeMesh.position.set(c.x, 0, c.z);
      const rate = c.state === 'planted' ? 2 + (1 - Math.max(0, match.timer) / 35) * 9 : 0;
      this.chargeLight.visible = c.state === 'safe' ? false : rate ? Math.sin(this.time * rate * Math.PI) > 0 : true;
      this.chargeLight.material.color.set(c.state === 'dropped' ? '#ffd24a' : '#ff3b30');
    }
  }

  /** The menu's backdrop: a slow turn high above the yard, the gun put away. */
  overview(match, t, dt) {
    if (match.map && match.map.id !== this.mapDef.id) this.setMap(match.map);
    this.gun.visible = false;
    this._people(match, null, dt);
    this.camera.fov = this.fov = 55;
    this.camera.updateProjectionMatrix();
    const [cx, cz] = this.center;
    const [W, D] = this.mapDef.SIZE;
    this.camera.position.set(cx + Math.sin(t * 0.05) * W * 0.66, Math.max(W, D) * 0.4, cz + Math.cos(t * 0.05) * D * 0.78);
    this.camera.lookAt(cx + 10, 0, cz);
    this._fade(dt);
    this._charge(match);
    this._grenades(match, dt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const b of this.bodies.values()) {
      b.gone = true;
      b.soldier?.dispose();
    }
    this.renderer.dispose();
    this.canvas.remove();
  }
}
