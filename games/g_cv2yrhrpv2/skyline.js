import * as THREE from 'three';
import { bronzeMaterial } from './admiral.js';
import { yiStatue, goldMaterial } from './yiStatue.js';
import { sejongStatue, sejongMaterial } from './sejongStatue.js';
import { Fountain } from './fountain.js';
import { PlazaView, PLAZA_LIFT } from './plaza.js';

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

/**
 * The landmarks: where (world metres from City Hall: x east, z south), how tall, which model, and how far
 * off it is still drawn (`range`: the towers over the whole city, the palace, the statues and Cheong Wa
 * Dae only from the streets round them). `sights`: the points the race camera looks for ([x, z, height]
 * — jarani-views.mjs and the camera's look-up). `hill`: the hill it stands under or on, drawn from beyond
 * the draw distance (where the land isn't loaded). `skipAt`: the register's own blocks at the spot (low
 * boxes where the palace's halls stand), left out of their tiles — as `skip` is, by name.
 */
export const SKYLINE = [
  { id: 'skytower', name: 'Jamsil Sky Tower', ko: '잠실 타워', x: 11012, z: 5953, height: 555, model: 'tower', range: 16000, icon: 'tower' },
  // (the 63 Building's tower over the north-west part of its plot, its podium along the rest; its long face toward the river)
  { id: 'yeouido63', name: '63 Building', ko: '63빌딩', x: -3393, z: 5160, height: 249.6, model: 'sixtythree', plot: { x: -3378, z: 5181, len: 150, wide: 36, angle: Math.atan2(110, 104) }, skip: '63한화생명빌딩', range: 12000, icon: 'gold' },
  // (the register has the tower only as a point: 236.7 m, on Namsan's summit)
  { id: 'namsantower', name: 'Namsan Tower', ko: '남산타워', x: 897, z: 1682, height: 237, model: 'namsan', range: 14000, icon: 'tower', hill: { x: 880, z: 1640, r: 1150 } },
  // (Gwanghwamun and Geunjeongjeon on the palace's axis, where the register has their low blocks; Bugaksan behind)
  {
    id: 'gyeongbokgung', name: 'Gyeongbokgung', ko: '경복궁', x: -85, z: -1220, height: 24, model: 'palace', range: 2600, icon: 'palace',
    gate: { x: -87, z: -1084 }, hall: { x: -83, z: -1363 },
    sights: [[-87, -1084, 19.5], [-83, -1363, 24]], skipAt: [[-87, -1084], [-83, -1363]],
    hill: { x: -370, z: -2990, r: 1300 }
  },
  // (Cheong Wa Dae's main hall: not in the register; at the foot of Bugaksan, north of the palace)
  { id: 'cheongwadae', name: 'Cheong Wa Dae', ko: '청와대', x: -268, z: -2250, height: 22, model: 'bluehouse', range: 2600, icon: 'bluehouse' },
  // (on Gwanghwamun Square, west of Sejong-daero's carriageways: the admiral, and King Sejong behind him)
  {
    id: 'yisunsin', name: 'Admiral Yi Sun-sin', ko: '이순신 장군 동상', x: -92, z: -517, height: 17, model: 'statues', range: 1600, icon: 'statue',
    sejong: { x: -92, z: -691 }, sights: [[-92, -517, 17], [-92, -691, 10.5]]
  }
];

/** Points up a landmark the race camera looks for: eight up each of its `sights` (or up its middle). */
export function landmarkParts(l, groundAt = () => 0) {
  const out = [];
  for (const [x, z, h] of l.sights ?? [[l.x, l.z, l.height]]) {
    const base = groundAt(x, z) ?? 0;
    for (let k = 1; k <= 8; k++) out.push([x, base + (h * k) / 8.4, z]);
  }
  return out;
}

/** The most the race camera looks up toward a tall landmark ahead (radians, over its usual pitch). */
export const LOOK_MAX = 0.2;

/**
 * How far the race camera should look up (radians, 0 … LOOK_MAX) to bring a tall landmark ahead into
 * the picture: one within its range, a few hundred metres off or more, within about half the screen's
 * width of straight ahead, whose top is above the top of the frame at the camera's usual
 * `pitch`. From a street under the Sky Tower or below Namsan the tower is 20–35° up — over the top of
 * the chase view (10–15° above the horizon) — though it stands clear over the rooftops there.
 */
export function landmarkLookUp(cam, yaw, { pitch = -0.36, vfov = 66, aspect = 16 / 9, groundAt = () => 0, landmarks = SKYLINE } = {}) {
  const half = ((vfov / 2) * Math.PI) / 180;
  const hHalf = Math.atan(Math.tan(half) * aspect);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const top = pitch + half - 0.05;
  let want = 0;
  for (const l of landmarks) {
    if (l.height < 100) continue;
    const dx = l.x - cam.x;
    const dz = l.z - cam.z;
    const d = Math.hypot(dx, dz);
    if (d < 250 || d > (l.range ?? 12000)) continue;
    const off = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
    if (off > hHalf * 0.6) continue;
    const base = groundAt(l.x, l.z) ?? 0;
    // (its top just inside the top of the frame)
    const up = Math.atan2(base + l.height - cam.y, d);
    want = Math.max(want, Math.min(LOOK_MAX, up - top));
  }
  return want;
}

/** The look up only on a straight: the course turning less than this (radians) over the next 50 m. */
export const LOOK_BEND = 0.3;

/** How much a course's heading changes over the next `ahead` metres from its point `i` (radians, the most). */
export function courseBend(pts, i, ahead = 50, open = false) {
  const n = pts.length;
  const at = (k) => pts[open ? Math.max(0, Math.min(n - 1, k)) : ((k % n) + n) % n];
  const hd = (a, b) => Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
  const h0 = hd(at(i), at(i + 2));
  let worst = 0;
  let s = 0;
  for (let k = i + 2; s < ahead && k < i + n; k++) {
    s += Math.hypot(at(k + 1)[0] - at(k)[0], at(k + 1)[1] - at(k)[1]);
    const h = hd(at(k), at(k + 2)) - h0;
    worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(h), Math.cos(h))));
    if (open && k >= n - 3) break;
  }
  return worst;
}

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

/**
 * A hanok roof (hipped, the tiles' surface concave: nearly flat at the eaves, steep to the ridge), its
 * eaves `w` × `d` and `h` high at the ridge, the corners swept up by `lift`. Open underneath: its top is
 * the tiles (front faces, u along the eaves and v up the slope in metres), its underside the painted
 * rafters (the same surface's back faces).
 */
export function hanokRoof(w, d, h, { lift = 1, ridge = 0.55, us = 10, vs = 5 } = {}) {
  const rl = Math.max(0.5, w - d) * ridge + Math.max(0, w - d) * (1 - ridge) * 0.6;
  const pos = [];
  const uv = [];
  const idx = [];
  const eaveY = (u) => lift * Math.pow(Math.abs(2 * u - 1), 3);
  // four faces: each a grid from its eave (s = 0) to the ridge (s = 1); `len` the eave's length
  const faces = [
    // front (+z) and back (−z): eave the whole width, up to the ridge line
    [w, (u, s) => [(-w / 2 + u * w) * (1 - s) + (-rl / 2 + u * rl) * s, eaveY(u), (d / 2) * (1 - s)]],
    [w, (u, s) => [(w / 2 - u * w) * (1 - s) + (rl / 2 - u * rl) * s, eaveY(u), (-d / 2) * (1 - s)]],
    // the ends (±x): up to the ridge's end
    [d, (u, s) => [(w / 2) * (1 - s) + (rl / 2) * s, eaveY(u), (d / 2 - u * d) * (1 - s)]],
    [d, (u, s) => [(-w / 2) * (1 - s) + (-rl / 2) * s, eaveY(u), (-d / 2 + u * d) * (1 - s)]]
  ];
  const slope = Math.hypot(d / 2, h);
  for (const [len, f] of faces) {
    const base = pos.length / 3;
    for (let j = 0; j <= vs; j++) {
      const s = j / vs;
      for (let i = 0; i <= us; i++) {
        const u = i / us;
        const [x, y0, z] = f(u, s);
        pos.push(x, y0 + (h - y0) * Math.pow(s, 1.7), z);
        uv.push(((u - 0.5) * len * (1 - s * 0.5)) / 0.9, s * slope);
      }
    }
    for (let j = 0; j < vs; j++) {
      for (let i = 0; i < us; i++) {
        const a = base + j * (us + 1) + i;
        const b = a + 1;
        const c = a + us + 1;
        const e = c + 1;
        idx.push(a, b, c, b, e, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.ridge = rl;
  return g;
}

/** A canvas texture, repeating. */
function canvasTex(w, h, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Roof tiles: rows of round-backed tiles running down the slope (one a 0.9 m repeat across), the eave's end-tiles pale. */
function tileTexture(color = '#4b505a') {
  const t = canvasTex(32, 64, (x, w, h) => {
    const c = new THREE.Color(color);
    x.fillStyle = `#${c.clone().multiplyScalar(0.72).getHexString()}`;
    x.fillRect(0, 0, w, h);
    // the round tiles' backs: a light stripe, shaded to either side
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `#${c.clone().multiplyScalar(0.65).getHexString()}`);
    g.addColorStop(0.5, `#${c.clone().multiplyScalar(1.25).getHexString()}`);
    g.addColorStop(1, `#${c.clone().multiplyScalar(0.65).getHexString()}`);
    x.fillStyle = g;
    x.fillRect(6, 0, 20, h);
    // the courses' joints across
    x.fillStyle = `#${c.clone().multiplyScalar(0.55).getHexString()}`;
    for (let k = 0; k < 4; k++) x.fillRect(0, k * 16, w, 2);
  });
  return t;
}

/** Dancheong, the painted eaves and beams: green rafters, the ends of each ringed in blue, red, white and gold. */
function dancheongTexture() {
  return canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = '#2f7a64';
    x.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      // a rafter: a darker line down the slope, its round end a ringed flower
      x.fillStyle = '#245f4f';
      x.fillRect(k * 16 + 6, 0, 4, h);
      const cx = k * 16 + 8;
      for (const [r, col] of [[6.5, '#e9e3d0'], [5, '#c8432f'], [3.5, '#2a5aa8'], [1.8, '#f0c04a']]) {
        x.fillStyle = col;
        x.beginPath();
        x.arc(cx, 8, r, 0, Math.PI * 2);
        x.fill();
      }
    }
    // the red band at the eave line
    x.fillStyle = '#b2392a';
    x.fillRect(0, 0, w, 2);
  });
}

/** Granite: a light grey of squared blocks, coursed. */
function stoneTexture(color = '#d2cbbb') {
  return canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(90, 84, 74, 0.35)';
    x.lineWidth = 1;
    for (let r = 0; r < 4; r++) {
      x.beginPath();
      x.moveTo(0, r * 16 + 0.5);
      x.lineTo(w, r * 16 + 0.5);
      x.stroke();
      for (let k = 0; k < 3; k++) {
        const vx = ((k * 24 + (r % 2) * 12) % w) + 0.5;
        x.beginPath();
        x.moveTo(vx, r * 16);
        x.lineTo(vx, r * 16 + 16);
        x.stroke();
      }
    }
    for (let k = 0; k < 120; k++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,56,50'}, 0.08)`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

/** A hall's walls between its columns: lattice doors and windows (or, `light`, white walls and tall windows). */
function wallTexture({ light = false } = {}) {
  const t = canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = light ? '#f4f1ea' : '#d8c39a';
    x.fillRect(0, 0, w, h);
    if (light) {
      // tall windows, two a bay
      for (const ox of [8, 36]) {
        x.fillStyle = '#7f98ad';
        x.fillRect(ox, 14, 20, 40);
        x.fillStyle = '#e8edf2';
        x.fillRect(ox + 9, 14, 2, 40);
      }
    } else {
      // two leaves of a lattice door, a bay
      for (const ox of [4, 34]) {
        x.fillStyle = '#b89463';
        x.fillRect(ox, 10, 26, 50);
        x.strokeStyle = '#6b4a2c';
        x.lineWidth = 1;
        for (let r = 14; r < 60; r += 4) {
          x.beginPath();
          x.moveTo(ox, r + 0.5);
          x.lineTo(ox + 26, r + 0.5);
          x.stroke();
        }
        for (let c = ox + 3; c < ox + 26; c += 4) {
          x.beginPath();
          x.moveTo(c + 0.5, 10);
          x.lineTo(c + 0.5, 60);
          x.stroke();
        }
      }
    }
    // the painted beam along the top (dancheong; pale on Cheong Wa Dae)
    x.fillStyle = light ? '#c9d3dc' : '#2f7a64';
    x.fillRect(0, 0, w, 8);
    x.fillStyle = light ? '#9fb0c0' : '#e0b04a';
    for (let k = 0; k < 8; k++) x.fillRect(k * 8 + 2, 2, 4, 4);
  });
  return t;
}

/** A box of walls (no top or bottom) `w` × `h` × `d`, its texture one bay every `per` metres round it and once up it. */
function wallBox(w, h, d, mat, per = 4) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const along = Math.abs(Math.abs(p.getX(i)) - w / 2) < 1e-3 ? p.getZ(i) + d / 2 : p.getX(i) + w / 2;
    uv.setXY(i, along / per, (p.getY(i) + h / 2) / h);
  }
  return new THREE.Mesh(g, mat);
}

/** A box whose texture repeats every `per` metres on its faces (stone courses). */
function stoneBox(w, h, d, mat, per = 3) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const p = g.attributes.position;
  const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    const a = ny > 0.5 ? p.getX(i) : nx > 0.5 ? p.getZ(i) : p.getX(i);
    const b = ny > 0.5 ? p.getZ(i) : p.getY(i);
    uv.setXY(i, a / per, b / per);
  }
  return new THREE.Mesh(g, mat);
}

/**
 * Namsan Tower on the summit: a white concrete shaft rising from its round plaza building, a flare up to
 * the observation pod — a drum of glass two floors high (lit after dark) under a white roof ring — then
 * the steel mast banded red and white with two galleries, a red light at its tip. 236.7 m. No company's
 * name or lighting; after dark the shaft glows softly white.
 */
function namsanTower(H) {
  const white = new THREE.MeshPhongMaterial({ color: '#eceeee', specular: '#ffffff', shininess: 25, emissive: '#dfe8ff', emissiveIntensity: 0, fog: false });
  const glass = new THREE.MeshPhongMaterial({ color: '#5f7890', specular: '#ffffff', shininess: 90, emissive: '#ffe2a8', emissiveMap: bandTexture(4, '#fff0cf'), emissiveIntensity: 0, fog: false });
  const red = new THREE.MeshLambertMaterial({ color: '#d8493c', fog: false });
  const grey = new THREE.MeshLambertMaterial({ color: '#9aa3ad', fog: false });
  const tip = new THREE.MeshLambertMaterial({ color: '#ff5a4a', emissive: '#ff3b2e', emissiveIntensity: 0, fog: false });
  const g = new THREE.Group();
  const s = H / 236.7;
  const v = (r, y) => new THREE.Vector2(r * s, y * s);
  // the plaza building round its foot, the shaft (a slight taper), the flare under the pod
  const body = new THREE.LatheGeometry([v(0, 0), v(21, 0), v(21, 7), v(18, 8), v(18, 13), v(9, 14), v(8.2, 22), v(7.4, 60), v(6.6, 104), v(6.4, 116), v(8, 121), v(12.5, 126.5), v(14, 128.5)], 40);
  g.add(new THREE.Mesh(body, white));
  // the pod: two floors of glass, a white band between, the roof ring stepping in to the mast's foot
  const drum = new THREE.LatheGeometry([v(14, 128.5), v(14.8, 131.5), v(14.8, 135)], 40);
  wrapUV(drum, 135 * s, 1);
  g.add(new THREE.Mesh(drum, glass));
  g.add(new THREE.Mesh(new THREE.LatheGeometry([v(14.8, 135), v(15.4, 135.4), v(15.4, 136.6), v(14.8, 137)], 40), white));
  const drum2 = new THREE.LatheGeometry([v(14.8, 137), v(14.8, 141), v(14.2, 142.5)], 40);
  wrapUV(drum2, 142.5 * s, 1);
  g.add(new THREE.Mesh(drum2, glass));
  g.add(new THREE.Mesh(new THREE.LatheGeometry([v(14.2, 142.5), v(15.6, 143.5), v(15.6, 145), v(11, 147.5), v(6, 150), v(4.4, 152), v(0, 152)], 40), white));
  // the mast: a grey lattice-coloured foot, then bands of red and white, thinning, two galleries on it
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * s, 3.8 * s, 14 * s, 16), grey);
  foot.position.y = 159 * s;
  g.add(foot);
  const bands = 8;
  for (let k = 0; k < bands; k++) {
    const y0 = 166 + (k * 66) / bands;
    const y1 = 166 + ((k + 1) * 66) / bands;
    const r0 = 3.0 - (k * 2.2) / bands;
    const r1 = 3.0 - ((k + 1) * 2.2) / bands;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1 * s, r0 * s, (y1 - y0) * s, 12), k % 2 ? white : red);
    m.position.y = ((y0 + y1) / 2) * s;
    g.add(m);
  }
  for (const [y, r] of [[172, 4.8], [190, 3.6]]) {
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(r * s, r * s, 1.4 * s, 16), white);
    gal.position.y = y * s;
    g.add(gal);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.8 * s, 4.7 * s, 8), tip);
  top.position.y = 234.4 * s;
  g.add(top);
  return { group: g, mats: [white, glass, red, grey], windows: glass, glow: tip, soft: white, base: [new THREE.Color('#eceeee'), new THREE.Color('#5f7890'), new THREE.Color('#d8493c'), new THREE.Color('#9aa3ad')] };
}

/** The palace's materials, shared: tiles (and their painted undersides), red columns, walls, granite. */
function hanokMats({ tiles = '#4b505a', light = false } = {}) {
  const tex = tileTexture(tiles);
  return {
    tiles: new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide }),
    under: new THREE.MeshLambertMaterial({ map: dancheongTexture(), side: THREE.BackSide, emissive: '#ffcf8a', emissiveIntensity: 0 }),
    walls: new THREE.MeshLambertMaterial({ map: wallTexture({ light }), emissive: light ? '#fff2d0' : '#ffcf8a', emissiveIntensity: 0 }),
    column: new THREE.MeshLambertMaterial({ color: light ? '#e9ebee' : '#a8392b' }),
    beam: new THREE.MeshLambertMaterial({ map: canvasTex(64, 16, (x, w, h) => {
      x.fillStyle = light ? '#cfd8e0' : '#2f7a64';
      x.fillRect(0, 0, w, h);
      x.fillStyle = light ? '#9fb0c0' : '#c8432f';
      for (let k = 0; k < 4; k++) x.fillRect(k * 16 + 4, 4, 8, 8);
      x.fillStyle = light ? '#ffffff' : '#f0c04a';
      for (let k = 0; k < 4; k++) x.fillRect(k * 16 + 6, 6, 4, 4);
    }) }),
    stone: new THREE.MeshLambertMaterial({ map: stoneTexture() }),
    ridge: new THREE.MeshLambertMaterial({ color: '#34383f' }),
    mortar: new THREE.MeshLambertMaterial({ color: '#e6e1d6' })
  };
}

/** A roof with its painted underside and its ridge (a dark cap on white mortar, its ends turned up). */
function roofOn(g, m, w, d, h, y, { lift = 1.4, ridge = 0.55 } = {}) {
  const geo = hanokRoof(w, d, h, { lift, ridge });
  const top = new THREE.Mesh(geo, m.tiles);
  const under = new THREE.Mesh(geo, m.under);
  top.position.y = under.position.y = y;
  g.add(top, under);
  const rl = geo.userData.ridge;
  const mortar = new THREE.Mesh(new THREE.BoxGeometry(rl + 0.6, 0.7, 0.8), m.mortar);
  mortar.position.y = y + h + 0.1;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(rl + 1, 0.5, 1), m.ridge);
  cap.position.y = y + h + 0.6;
  g.add(mortar, cap);
  for (const sx of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 1.1), m.ridge);
    end.position.set(sx * (rl / 2 + 0.3), y + h + 1, 0);
    end.rotation.z = -sx * 0.25;
    g.add(end);
  }
}

/** A storey of a hall: its walls set back behind a ring of round columns, a painted beam over them. */
function storey(g, m, w, d, h, y, { bay = 4 } = {}) {
  const wall = wallBox(w - 1.2, h, d - 1.2, m.walls, bay);
  wall.position.y = y + h / 2;
  g.add(wall);
  const col = new THREE.CylinderGeometry(0.32, 0.36, h, 8);
  const nx = Math.max(2, Math.round(w / bay));
  const nz = Math.max(2, Math.round(d / bay));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue;
      const c = new THREE.Mesh(col, m.column);
      c.position.set(-w / 2 + (i * w) / nx, y + h / 2, -d / 2 + (j * d) / nz);
      g.add(c);
    }
  }
  const beam = wallBox(w + 0.4, 0.8, d + 0.4, m.beam, 4);
  beam.position.y = y + h + 0.4;
  g.add(beam);
}

/** A stone terrace `w` × `d`, `h` high, a balustrade round its edge and steps up its middle in front (+z). */
function terrace(g, m, w, d, h, y, { rail = true, steps = true } = {}) {
  const t = stoneBox(w, h, d, m.stone);
  t.position.y = y + h / 2;
  g.add(t);
  if (rail) {
    const posts = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 6);
    for (const [ax, len, off] of [['x', w, d / 2], ['x', w, -d / 2], ['z', d, w / 2], ['z', d, -w / 2]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(ax === 'x' ? len : 0.25, 0.18, ax === 'x' ? 0.25 : len), m.stone);
      if (ax === 'x') r.position.set(0, y + h + 0.8, off - Math.sign(off) * 0.2);
      else r.position.set(off - Math.sign(off) * 0.2, y + h + 0.8, 0);
      g.add(r);
      for (let k = 0; k <= Math.floor(len / 2.4); k++) {
        const p = new THREE.Mesh(posts, m.stone);
        const a = -len / 2 + k * 2.4;
        if (ax === 'x') p.position.set(a, y + h + 0.45, off - Math.sign(off) * 0.2);
        else p.position.set(off - Math.sign(off) * 0.2, y + h + 0.45, a);
        g.add(p);
      }
    }
  }
  if (steps) {
    for (let k = 0; k < 4; k++) {
      const st = stoneBox(5, (h * (k + 1)) / 4, 0.7, m.stone);
      st.position.set(0, y + (h * (k + 1)) / 8, d / 2 + 0.35 + (3 - k) * 0.7);
      g.add(st);
    }
  }
}

/**
 * Gyeongbokgung: the Gwanghwamun gate — its coursed granite base with three arched gateways (the middle
 * one the king's, the widest), a low parapet round the top, and the two-storey pavilion of red columns
 * and painted beams under two hipped roofs of grey tiles — and, up the palace's axis, Geunjeongjeon,
 * the throne hall: a two-tier granite terrace with stone balustrades and steps, the hall's two storeys of
 * red columns and lattice doors, its double roof swept up at the corners, the eaves painted beneath.
 * Both face south. Drawn where the register has only their low blocks (skipAt).
 */
function palace(l, ground) {
  const m = hanokMats();
  const dark = new THREE.MeshLambertMaterial({ color: '#2a2624' });
  const g = new THREE.Group();
  const base = ground(l.x, l.z);
  // the gate
  const gate = new THREE.Group();
  const block = stoneBox(34, 7.5, 14, m.stone);
  block.position.y = 3.75;
  gate.add(block);
  for (const ax of [-9.5, 0, 9.5]) {
    const wide = ax === 0 ? 5 : 4.2;
    for (const face of [1, -1]) {
      // an arched gateway: the dark way through, its top a half circle, a lighter stone frame round it
      const frame = new THREE.Mesh(new THREE.CircleGeometry(wide / 2 + 0.6, 16, 0, Math.PI), m.mortar);
      const frameLo = new THREE.Mesh(new THREE.PlaneGeometry(wide + 1.2, 4.2), m.mortar);
      const arch = new THREE.Mesh(new THREE.PlaneGeometry(wide, 4.2), dark);
      const top = new THREE.Mesh(new THREE.CircleGeometry(wide / 2, 16, 0, Math.PI), dark);
      frameLo.position.set(ax, 2.1, face * 7.02);
      frame.position.set(ax, 4.2, face * 7.02);
      arch.position.set(ax, 2.1, face * 7.04);
      top.position.set(ax, 4.2, face * 7.04);
      for (const o of [frame, frameLo, arch, top]) if (face < 0) o.rotation.y = Math.PI;
      gate.add(frameLo, frame, arch, top);
    }
  }
  // the parapet round the top of the base
  for (const [w, d, x, z] of [[34, 0.6, 0, 6.7], [34, 0.6, 0, -6.7], [0.6, 14, 16.7, 0], [0.6, 14, -16.7, 0]]) {
    const p = stoneBox(w, 1.1, d, m.stone);
    p.position.set(x, 8.05, z);
    gate.add(p);
  }
  const pav = new THREE.Group();
  storey(pav, m, 19, 7.5, 3.4, 0, { bay: 3.8 });
  roofOn(pav, m, 24, 12, 1.6, 3.6, { lift: 0.8, ridge: 1 });
  storey(pav, m, 15, 5.5, 2.6, 4.6, { bay: 3.8 });
  roofOn(pav, m, 23, 11.5, 3.6, 8, { lift: 1.2 });
  pav.position.y = 7.5;
  gate.add(pav);
  gate.position.set(l.gate.x - l.x, ground(l.gate.x, l.gate.z) - base, l.gate.z - l.z);
  // the throne hall on its terrace
  const hallG = new THREE.Group();
  terrace(hallG, m, 50, 40, 1.5, 0);
  terrace(hallG, m, 41, 31, 1.5, 1.5);
  storey(hallG, m, 30, 21, 6.4, 3, { bay: 5 });
  roofOn(hallG, m, 37, 28, 2.2, 9.6, { lift: 1.2, ridge: 1 });
  storey(hallG, m, 25, 16, 3.6, 10.6, { bay: 5 });
  roofOn(hallG, m, 36, 26, 7.2, 14.6, { lift: 1.8 });
  hallG.position.set(l.hall.x - l.x, ground(l.hall.x, l.hall.z) - base, l.hall.z - l.z);
  g.add(gate, hallG);
  return { group: g, mats: [], base: [], lit: [m.walls, m.under], fogged: true };
}

/**
 * Cheong Wa Dae's main hall: two storeys of white walls and tall windows behind pale square pillars on a
 * granite terrace with steps, under a great hipped roof of glazed blue tiles — the "blue house", the roof
 * half the building's height — and a lower wing either side joined to it, under blue roofs too; facing
 * south over its lawn, Bugaksan behind.
 */
function blueHouse() {
  const m = hanokMats({ tiles: '#2f67b4', light: true });
  m.ridge.color.set('#21497f');
  m.under.map = canvasTex(32, 32, (x, w, h) => {
    x.fillStyle = '#dfe5ea';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#b9c6d2';
    for (let k = 0; k < 4; k++) x.fillRect(k * 8 + 3, 0, 2, h);
  });
  const g = new THREE.Group();
  const main = new THREE.Group();
  terrace(main, m, 58, 30, 1.6, 0);
  storey(main, m, 44, 20, 4.4, 1.6, { bay: 4 });
  storey(main, m, 44, 20, 4.2, 6.8, { bay: 4 });
  roofOn(main, m, 54, 30, 10, 11.4, { lift: 1.8 });
  g.add(main);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group();
    terrace(wing, m, 24, 22, 1.2, 0, { steps: false });
    storey(wing, m, 18, 15, 5.6, 1.2, { bay: 4 });
    roofOn(wing, m, 25, 21, 6, 7.4, { lift: 1.3 });
    wing.position.x = sx * 41;
    g.add(wing);
    // the low corridor joining it to the main hall
    const link = new THREE.Group();
    storey(link, m, 8, 6, 3.6, 1.2, { bay: 4 });
    roofOn(link, m, 10, 8.5, 2.2, 5.2, { lift: 0.6, ridge: 1 });
    link.position.x = sx * 27;
    g.add(link);
  }
  return { group: g, mats: [], base: [], lit: [m.walls], fogged: true };
}

/** A turtle ship in bronze: its hull, the spiked shell of a deck, the dragon's head at the bow. */
function turtleShip(mat) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.9, 6, 10, 1), mat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1, 1, 0.5);
  hull.position.y = 0.6;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  shell.scale.set(1, 0.6, 2.4);
  shell.position.y = 1;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), mat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 1.2, 3.4);
  g.add(hull, shell, head);
  return g;
}

/** The inscription down the plinth's face: the statue's name in a column of carved characters, dark on the granite. */
function inscription() {
  return canvasTex(64, 512, (x, w, h) => {
    x.fillStyle = '#cfc9bc';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#4a463e';
    x.font = 'bold 44px serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    // (忠武公李舜臣將軍像: "the statue of Admiral Yi Sun-sin, Lord Chungmu")
    [...'忠武公李舜臣將軍像'].forEach((ch, i) => x.fillText(ch, w / 2, 34 + i * 54));
  }, { repeat: false });
}

/**
 * Gwanghwamun Square's statues: Admiral Yi Sun-sin, gilded (yiStatue.js: the supplied sculpture) on
 * his tall pale granite plinth (17 m in all) with the inscription down its face, a bronze turtle ship on a
 * low stone base before it; the fountain's long pool down the square in front of him (fountain.js), lit
 * after dark; and behind him King Sejong on his throne and pedestal (sejongStatue.js: a photo scan of the
 * real monument). Both face south, down the square. After dark both are lit softly from below (emissive).
 */
function statues(l, ground) {
  const m = hanokMats();
  const granite = m.stone;
  const bronze = bronzeMaterial();
  const g = new THREE.Group();
  const base = ground(l.x, l.z);
  const yi = new THREE.Group();
  // the plinth: three broad steps, the tall shaft, its cornice
  const steps = [[13, 0.6, 13], [11, 0.6, 11], [9, 0.6, 9], [5.6, 7.8, 4.4], [6.4, 0.9, 5.2]];
  let y = 0;
  steps.forEach(([w, h, d]) => {
    const o = stoneBox(w, h, d, granite);
    o.position.y = y + h / 2;
    o.castShadow = true;
    o.receiveShadow = true;
    yi.add(o);
    y += h;
  });
  const words = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 7.2), new THREE.MeshLambertMaterial({ map: inscription() }));
  words.position.set(0, 1.8 + 3.9, 2.21);
  yi.add(words);
  // the admiral, gilded, on the cornice
  const yiGold = goldMaterial();
  const admiral = yiStatue(yiGold);
  admiral.position.y = y;
  yi.add(admiral);
  // the turtle ship on its low stone base, south of the plinth
  const shipBase = stoneBox(3.2, 0.6, 6.4, granite);
  shipBase.position.set(0, 0.3, 9.6);
  const ship = turtleShip(bronze);
  ship.scale.setScalar(0.85);
  ship.position.set(0, 0.6, 9.6);
  yi.add(shipBase, ship);
  // the fountain down the middle of the square before him, on its paving as it slopes (fountain.js)
  const fountain = new Fountain(yi, { y: (x, z) => ground(l.x + x, l.z + z) - base });
  g.add(yi);
  // King Sejong: the scanned monument, his pedestal and all
  const sejongMat = sejongMaterial();
  const sj = sejongStatue(sejongMat);
  sj.position.set(l.sejong.x - l.x, ground(l.sejong.x, l.sejong.z) - base, l.sejong.z - l.z);
  g.add(sj);
  // (on the square's paving, a kerb's height over the land: plaza.js)
  return { group: g, mats: [], base: [], lit: [], fogged: true, anim: fountain, under: [bronze, yiGold, sejongMat], lift: PLAZA_LIFT };
}

/**
 * The hill under a landmark (Namsan, Bugaksan), for where the land isn't loaded: the real land's shape
 * every 40 m in a disc, sunk 4 m (the land wins where it is drawn) and pushed back in the depth test, its
 * rim dropped out of sight. Wooded green; hazed like the landmarks.
 */
function hillPatch(hill, ground) {
  const step = 40;
  const n = Math.ceil(hill.r / step);
  const pos = [];
  const idx = [];
  const at = new Map();
  let low = Infinity;
  const base = ground(hill.x, hill.z);
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) low = Math.min(low, ground(hill.x + i * step, hill.z + j * step));
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const d = Math.hypot(i, j) * step;
      if (d > hill.r + step) continue;
      const x = i * step;
      const z = j * step;
      const rim = d > hill.r - step;
      at.set(`${i},${j}`, pos.length / 3);
      // (heights from the hill's middle: the patch is placed there, on the ground)
      pos.push(x, (rim ? low - 30 : ground(hill.x + x, hill.z + z) - 4) - base, z);
    }
  }
  for (let j = -n; j < n; j++) {
    for (let i = -n; i < n; i++) {
      const a = at.get(`${i},${j}`);
      const b = at.get(`${i + 1},${j}`);
      const c = at.get(`${i},${j + 1}`);
      const e = at.get(`${i + 1},${j + 1}`);
      if (a == null || b == null || c == null || e == null) continue;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: '#56704a', fog: false, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 6 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, mat));
  return { group, mats: [mat], base: [new THREE.Color('#56704a')], hill: true };
}

const MODELS = {
  tower: (l) => skyTower(l.height),
  sixtythree: (l) => sixtyThree(l.height, l.plot),
  namsan: (l) => namsanTower(l.height),
  palace: (l, ground) => palace(l, ground),
  bluehouse: () => blueHouse(),
  statues: (l, ground) => statues(l, ground)
};

export class Skyline {
  /** @param {object} game  SeoulGame: its scene, camera, groundAt */
  constructor(game) {
    this.g = game;
    this.items = [];
    const ground = (x, z) => game.groundAt?.(x, z) ?? 0;
    const add = (l, m, at, range) => {
      const holder = new THREE.Group();
      holder.add(m.group);
      const pos = new THREE.Vector3(at.x, ground(at.x, at.z) + (m.lift ?? 0), at.z);
      holder.position.copy(pos);
      // (the palace, Cheong Wa Dae and the statues cast the sun's shadows and take them, as the streets round them do)
      holder.traverse((o) => {
        // (not the fountain's water and lights: see-through, they cast nothing)
        if (o.isMesh && !o.userData.noShadow) {
          o.castShadow = Boolean(m.fogged);
          o.receiveShadow = Boolean(m.fogged);
        }
      });
      game.scene.add(holder);
      this.items.push({ l, m, holder, pos, range });
    };
    for (const l of SKYLINE) {
      const m = MODELS[l.model](l, ground);
      if (l.plot) m.group.rotation.y = -l.plot.angle;
      add(l, m, l.plot ?? l, l.range ?? 12000);
      // the hill it stands on (or under), seen from wherever its land isn't loaded
      if (l.hill) add(l, hillPatch(l.hill, ground), l.hill, Math.max(l.range ?? 12000, 12000));
    }
    // the squares the courses ride through: Gwanghwamun Square's paving, planters and bollards, Cheong Wa Dae's drive
    this.plazas = new PlazaView(game.scene, ground);
    this._fog = new THREE.Color();
  }

  /**
   * The fountain's spray on the lens (0…1): a light mist and a few beads over the picture — no words, nothing
   * to read; gone in a second or so once you are out of it.
   */
  _lens(amount) {
    const root = this.g.root;
    if (!root || typeof document === 'undefined') return;
    if (!this._spray) {
      if (amount < 0.02) return;
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      const beads = Array.from({ length: 14 }, (_, k) => {
        const x = (k * 37 + 11) % 100;
        const y = (k * 53 + 7) % 100;
        const r = 10 + ((k * 17) % 22);
        return `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.55) 0, rgba(220,240,255,0.25) ${r * 0.35}px, rgba(255,255,255,0) ${r}px)`;
      });
      el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 0.25s;background:${beads.join(',')},radial-gradient(ellipse at 50% 60%, rgba(235,245,255,0.18), rgba(235,245,255,0.42));backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px)`;
      root.appendChild(el);
      this._spray = el;
    }
    const o = Math.min(0.85, amount * 1.1);
    if (Math.abs(o - (this._sprayO ?? 0)) > 0.02) {
      this._spray.style.opacity = o.toFixed(2);
      this._sprayO = o;
    }
  }

  /**
   * Each frame: drawn at its place, or (past the far plane) as its smaller copy; hazed; lit after dark.
   * One beyond its range isn't drawn; the palace, the statues and Cheong Wa Dae are in the scene's own fog
   * like the streets round them.
   */
  update(camera, { night = 0, thick = 0, fog = null } = {}) {
    const cam = camera.position;
    this.plazas?.update(camera);
    const reach = camera.far * NEAR_SHARE;
    // (hazed toward a silhouette a little darker than the haze itself: a white tower still reads against a pale sky)
    if (fog) this._fog.copy(fog.color).multiplyScalar(0.8 + 0.2 * Math.min(1, thick * 3));
    for (const it of this.items) {
      const d = cam.distanceTo(it.pos);
      if (d > it.range) {
        it.holder.visible = false;
        continue;
      }
      if (d > reach) {
        const k = reach / d;
        it.holder.position.copy(cam).addScaledVector(it.pos.clone().sub(cam), k);
        it.holder.scale.setScalar(k);
      } else {
        it.holder.position.copy(it.pos);
        it.holder.scale.setScalar(1);
      }
      if (it.m.fogged) {
        for (const mat of it.m.lit) mat.emissiveIntensity = night * 0.5;
        // (the admiral lit softly from below after dark; the fountain's jets and lights)
        for (const mat of it.m.under ?? []) mat.emissiveIntensity = night * 0.7;
        it.m.anim?.update(performance.now() / 1000, night, d, cam);
        if (it.m.anim) this._lens(it.m.anim.spray ?? 0);
        it.holder.visible = true;
        continue;
      }
      const h = skylineHaze(d, { thick, fogNear: fog?.near, fogFar: fog?.far }) * (it.m.hill && thick < 0.05 ? 0.7 : 1);
      it.m.mats.forEach((mat, i) => {
        if (!it.m.base[i]) return;
        mat.color.copy(it.m.base[i]).lerp(this._fog, h);
      });
      // after dark: windows lit (dimmed by the haze), the crown glowing (seen from afar)
      if (it.m.windows) it.m.windows.emissiveIntensity = night * 0.85 * (1 - h * 0.6);
      // (Namsan Tower's shaft lit softly white after dark, as it is floodlit)
      if (it.m.soft) it.m.soft.emissiveIntensity = night * 0.35 * (1 - h * 0.5);
      if (it.m.glow) it.m.glow.emissiveIntensity = night * 2.2 * (1 - h * 0.4) * (1 - Math.min(1, thick * 3) * 0.8);
      it.holder.visible = h < 0.995;
    }
  }
}
