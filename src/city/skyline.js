import * as THREE from 'three';

/**
 * Seoul's skyline landmarks, modelled by hand and always on the skyline: the Jamsil Sky Tower (our name
 * for the 555 m tower by Seokchon Lake — the building register has no footprint for it) and the golden
 * 63 Building on Yeouido (in the register, but as one 250 m slab over its whole plot: drawn here instead,
 * its tile's walls and roof left out — SeoulGame SKYLINE_SKIP). No company's name, logo or crest.
 *
 * Never dropped by tile streaming or the draw distance: past the camera's far plane each is drawn as a
 * scaled-down copy on the same line of sight (the same size on the screen), so the tower stands over the
 * east of the city from the Han, Olympic Park, Gangnam and the bridges. Through ordinary haze it greys
 * to a pale silhouette (never quite gone); in a fog bank it fades like everything else. After dark the
 * windows light and the tower's crown glows.
 */

/** The landmarks: where (world metres from City Hall), how tall, and which model. */
export const SKYLINE = [
  { id: 'skytower', name: 'Jamsil Sky Tower', ko: '잠실 타워', x: 11012, z: 5953, height: 555, model: 'tower' },
  // (the 63 Building's tower over the north-west part of its plot, its podium along the rest; its long face toward the river)
  { id: 'yeouido63', name: '63 Building', ko: '63빌딩', x: -3393, z: 5160, height: 249.6, model: 'sixtythree', plot: { x: -3378, z: 5181, len: 150, wide: 36, angle: Math.atan2(110, 104) }, skip: '63한화생명빌딩' }
];

/** How far a landmark may be before it is drawn as its smaller copy: this share of the camera's far plane. */
const NEAR_SHARE = 0.8;

/**
 * The haze over a landmark `d` metres away: 0 clear … `cap` (a pale silhouette, never gone) — and in a
 * fog bank (`thick` 0 … 1) all the way, past the scene fog's far.
 */
export function skylineHaze(d, { thick = 0, fogNear = 400, fogFar = 2200 } = {}) {
  const air = Math.min(0.72, 1 - Math.exp(-Math.max(0, d - 300) / 5200));
  const bank = Math.max(0, Math.min(1, (d - fogNear) / Math.max(1, fogFar - fogNear)));
  const k = Math.max(0, Math.min(1, thick * 3));
  return air * (1 - k) + bank * k;
}

/** The Sky Tower's half-width at a height share `t` (0 foot … 1 tip): a square, curving in as it rises. */
export function towerHalf(t) {
  return 34.5 * (1 - 0.66 * Math.pow(t, 1.25)) + 1.2;
}

/** A tapering square with rounded corners, `seg` points a side, from height bands `ts` (shares of H). */
function taperedSquare(H, ts, half, { seg = 4, round = 0.32, split = null } = {}) {
  const pos = [];
  const idx = [];
  const ring = (t) => {
    const h = half(t);
    const r = h * round;
    const pts = [];
    // four corners, each an arc of `seg` points
    for (let c = 0; c < 4; c++) {
      const cx = (c === 0 || c === 3 ? 1 : -1) * (h - r);
      const cz = (c < 2 ? 1 : -1) * (h - r);
      for (let k = 0; k <= seg; k++) {
        const a = (c * Math.PI) / 2 + (k / seg) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
      }
    }
    return pts;
  };
  const rings = ts.map((t) => ring(t).map(([x, z]) => [x, t * H, z]));
  const n = rings[0].length;
  rings.forEach((rg) => rg.forEach((p) => pos.push(...p)));
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = j * n + ((i + 1) % n);
      const c = (j + 1) * n + i;
      const d = (j + 1) * n + ((i + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
  }
  // the top, closed
  const top = (rings.length - 1) * n;
  const mid = pos.length / 3;
  pos.push(0, ts.at(-1) * H, 0);
  for (let i = 0; i < n; i++) idx.push(top + i, mid, top + ((i + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The tower's two crown blades: the split top, from `t0` of the height to the tip. */
function crown(H, t0, half) {
  const pos = [];
  const idx = [];
  const blade = (side) => {
    const base = pos.length / 3;
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const t = t0 + ((1 - t0) * k) / steps;
      const h = half(t);
      const gap = 1.6 + 2.4 * ((t - t0) / (1 - t0));
      // a blade: the half of the square beyond the gap, thinning to an edge at the tip
      const w = Math.max(0.3, h * (1 - 0.92 * ((t - t0) / (1 - t0))));
      pos.push(side * gap, t * H, -w, side * (gap + w * 1.6), t * H, -w * 0.4, side * (gap + w * 1.6), t * H, w * 0.4, side * gap, t * H, w);
    }
    for (let k = 0; k < steps; k++) {
      for (let i = 0; i < 4; i++) {
        const a = base + k * 4 + i;
        const b = base + k * 4 + ((i + 1) % 4);
        const c = a + 4;
        const d = b + 4;
        if (side > 0) idx.push(a, b, c, b, d, c);
        else idx.push(a, c, b, b, c, d);
      }
    }
  };
  blade(1);
  blade(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Window bands on glass (a light texture: rows of panes, lit at night through the emissive map). */
function bandTexture(rows = 64, color = '#ffe9b8') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 64, 256);
  x.fillStyle = color;
  for (let r = 0; r < rows; r++) for (let k = 0; k < 8; k++) if ((r * 7 + k * 13) % 5) x.fillRect(k * 8 + 1, (r * 256) / rows + 1, 6, 256 / rows - 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Planar u (round the tower) and v (up it) for a lathe-like geometry: the window bands' coordinates. */
function wrapUV(g, H, repeatV) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (Math.atan2(p.getZ(i), p.getX(i)) / (Math.PI * 2) + 0.5) * 6;
    uv[i * 2 + 1] = (p.getY(i) / H) * repeatV;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** The Jamsil Sky Tower: one mesh near, a lighter one far (an LOD), its crown a mesh of its own (it glows). */
function skyTower(H) {
  const glass = new THREE.MeshPhongMaterial({ color: '#d9e3ea', specular: '#ffffff', shininess: 70, emissive: '#fff4d6', emissiveMap: bandTexture(96), emissiveIntensity: 0, fog: false });
  const ts = [];
  for (let k = 0; k <= 22; k++) ts.push((k / 22) * 0.86);
  const near = taperedSquare(H, ts, towerHalf, { seg: 4 });
  wrapUV(near, H, 30);
  const far = taperedSquare(H, [0, 0.3, 0.6, 0.86], towerHalf, { seg: 1 });
  wrapUV(far, H, 30);
  const lod = new THREE.LOD();
  lod.addLevel(new THREE.Mesh(near, glass), 0);
  lod.addLevel(new THREE.Mesh(far, glass), 3500);
  const crownMat = new THREE.MeshPhongMaterial({ color: '#eef3f7', emissive: '#bfe3ff', emissiveIntensity: 0, fog: false, side: THREE.DoubleSide });
  const top = new THREE.Mesh(crown(H, 0.86, towerHalf), crownMat);
  const g = new THREE.Group();
  g.add(lod, top);
  return { group: g, mats: [glass, crownMat], glow: crownMat, windows: glass, base: [new THREE.Color('#d9e3ea'), new THREE.Color('#eef3f7')] };
}

/**
 * The 63 Building: a gold glass tower (its plan a long, narrow wedge, stepping in toward the top at both
 * ends — the shape that reads from across the river) on a low podium over the rest of its plot.
 */
function sixtyThree(H, plot) {
  const gold = new THREE.MeshPhongMaterial({ color: '#d4a63c', specular: '#fff1c2', shininess: 90, emissive: '#ffd27a', emissiveMap: bandTexture(60, '#fff0c8'), emissiveIntensity: 0, fog: false });
  const stone = new THREE.MeshLambertMaterial({ color: '#b9ad96', fog: false });
  const g = new THREE.Group();
  // the tower: 62 m long, 26 m deep at its foot; each long end steps in (the "wedge") above a third of its height
  const L = 62;
  const D = 26;
  const pos = [];
  const idx = [];
  const levels = [0, 0.34, 0.5, 0.64, 0.76, 0.86, 0.94, 1];
  const shrink = (t) => (t < 0.34 ? 0 : (t - 0.34) * 0.55);
  levels.forEach((t) => {
    const l = (L / 2) * (1 - shrink(t));
    const d = D / 2 * (1 - shrink(t) * 0.35);
    pos.push(-l, t * H, -d, l, t * H, -d, l, t * H, d, -l, t * H, d);
  });
  for (let j = 0; j < levels.length - 1; j++) {
    for (let i = 0; i < 4; i++) {
      const a = j * 4 + i;
      const b = j * 4 + ((i + 1) % 4);
      idx.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const t0 = (levels.length - 1) * 4;
  idx.push(t0, t0 + 2, t0 + 1, t0, t0 + 3, t0 + 2);
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + p.getZ(i)) / 8;
    uv[i * 2 + 1] = (p.getY(i) / H) * 20;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const tower = new THREE.Mesh(geo, gold);
  // over the north-west part of the plot, its long side along it
  tower.position.set(-plot.len * 0.22, 0, 0);
  const podium = new THREE.Mesh(new THREE.BoxGeometry(plot.len * 0.98, 14, plot.wide * 0.92), stone);
  podium.position.y = 7;
  g.add(tower, podium);
  return { group: g, mats: [gold, stone], windows: gold, base: [new THREE.Color('#d4a63c'), new THREE.Color('#b9ad96')] };
}

export class Skyline {
  /** @param {object} game  SeoulGame: its scene, camera, groundAt */
  constructor(game) {
    this.g = game;
    this.items = [];
    for (const l of SKYLINE) {
      const m = l.model === 'tower' ? skyTower(l.height) : sixtyThree(l.height, l.plot);
      const holder = new THREE.Group();
      holder.add(m.group);
      if (l.plot) m.group.rotation.y = -l.plot.angle;
      const at = l.plot ?? l;
      const base = game.groundAt?.(at.x, at.z) ?? 0;
      this.items.push({ l, m, holder, pos: new THREE.Vector3(at.x, base, at.z) });
      holder.position.copy(this.items.at(-1).pos);
      holder.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
        }
      });
      game.scene.add(holder);
    }
    this._fog = new THREE.Color();
  }

  /** Each frame: drawn at its place, or (past the far plane) as its smaller copy; hazed; lit after dark. */
  update(camera, { night = 0, thick = 0, fog = null } = {}) {
    const cam = camera.position;
    const reach = camera.far * NEAR_SHARE;
    if (fog) this._fog.copy(fog.color);
    for (const it of this.items) {
      const d = cam.distanceTo(it.pos);
      if (d > reach) {
        const k = reach / d;
        it.holder.position.copy(cam).addScaledVector(it.pos.clone().sub(cam), k);
        it.holder.scale.setScalar(k);
      } else {
        it.holder.position.copy(it.pos);
        it.holder.scale.setScalar(1);
      }
      const h = skylineHaze(d, { thick, fogNear: fog?.near, fogFar: fog?.far });
      it.m.mats.forEach((mat, i) => {
        if (!it.m.base[i]) return;
        mat.color.copy(it.m.base[i]).lerp(this._fog, h);
      });
      // after dark: windows lit (dimmed by the haze), the crown glowing (seen from afar)
      it.m.windows.emissiveIntensity = night * 0.85 * (1 - h * 0.6);
      if (it.m.glow) it.m.glow.emissiveIntensity = night * 2.2 * (1 - h * 0.4) * (1 - Math.min(1, thick * 3) * 0.8);
      it.holder.visible = h < 0.995;
    }
  }
}
