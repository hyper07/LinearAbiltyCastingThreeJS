/**
 * The Desert of the Pyramids in 3D: warm dunes with wind ripples rolling
 * away to flat-topped mesas, the Nile winding west to east (blue-green,
 * reedy banks, feluccas sailing), and along its south bank seven oasis
 * towns in palm gardens: a paved plaza with a sun mosaic, a colonnade walk
 * round it, raised stone paths out to the platforms, a lotus pool. Raised
 * causeways cross the sand from town to town (the first an avenue of
 * sphinxes) with a gate at the start of each. Across the river from the
 * first town lie the three pyramids of Giza, the queens' pyramids and the
 * Great Sphinx, big enough to see from everywhere.
 *
 * What you walk on (every stone top, all at one height with the same
 * world-aligned flagstones, so where two meet nothing flickers) is kept in
 * `walk`, so clicks find it; each town's parts are grouped so a locked
 * oasis can be greyed.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, leafGeo, limb, mat, seeded, sphere, toonRamp, vcMat } from '../kit.js';
import { lampMat } from '../buildings.js';
import { buildGate } from '../structures.js';
import { noise, fbm } from '../layout.js';
import { patchCutout } from '../cutout.js';
import { DESERT, GIZA, PADS, riverLine, dirOf } from './plan.js';
import { SAND, painted, tmat, tile, blocks, blocksDark, frustum, pyramidGeo, sphinx, obelisk, lantern, feluccaBoat } from './buildings.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------------------------------------------------------------- stone you walk on */

let flagMat = null;
/** The flagstones every walking top shares: texture laid in world space, so overlaps match exactly. */
function flagstones() {
  if (!flagMat) flagMat = new THREE.MeshToonMaterial({ map: painted('flag', '#ecd3a2'), gradientMap: toonRamp() });
  return flagMat;
}
/** A flat walking top: a geometry lying in XZ, placed in the world, its UVs from world x and z. */
function top(parent, geo, y) {
  geo.translate(0, y, 0);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6);
  const m = new THREE.Mesh(geo, flagstones());
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const disc = (cx, cz, r, seg = 48) => {
  const g = new THREE.CircleGeometry(r, seg);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
};
const ringGeo = (cx, cz, r0, r1, seg = 160) => {
  const g = new THREE.RingGeometry(r0, r1, seg, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
};
/** A strip from a to b, `w` wide, lying in XZ. */
const strip = (ax, az, bx, bz, w) => {
  const len = Math.hypot(bx - ax, bz - az);
  const g = new THREE.PlaneGeometry(w, len);
  g.rotateX(-Math.PI / 2);
  g.rotateY(Math.atan2(bx - ax, bz - az));
  g.translate((ax + bx) / 2, 0, (az + bz) / 2);
  return g;
};
/** The sides of a sloping block (no top, no bottom), origin at the bottom's middle, long along Z. */
function walls(w0, w1, len, h) {
  const g = frustum(w0, len, w1, len, h);
  const idx = Array.from(g.index.array);
  g.setIndex([...idx.slice(0, 12), ...idx.slice(24)]);
  return tile(g, Math.max(1, len / 3), Math.max(0.4, h / 1.3));
}
/** A stone body under a straight top, from y0 up to y. */
function body(parent, ax, az, bx, bz, w, y, y0, spread = 0) {
  const len = Math.hypot(bx - ax, bz - az);
  add(parent, walls(w + spread, w, len, y - y0), blocks(), [(ax + bx) / 2, y0, (az + bz) / 2], [0, Math.atan2(bx - ax, bz - az), 0]);
}
/** A round stone drum (open cylinder) from y0 up to y. */
function drum(parent, cx, cz, r, y, y0, seg = 48) {
  add(parent, tile(new THREE.CylinderGeometry(r, r + 0.06, y - y0, seg, 1, true), Math.max(2, Math.round((TAU * r) / 3)), Math.max(0.4, (y - y0) / 1.3)), blocks(), [cx, (y + y0) / 2, cz]);
}
let insideMat = null;
/** Block courses seen from inside a ring (the colonnade walk's inner wall). */
function blocksInside() {
  if (!insideMat) insideMat = new THREE.MeshToonMaterial({ map: painted('blocks', SAND.stone), gradientMap: toonRamp(), side: THREE.BackSide });
  return insideMat;
}
/** Coloured inlay lying on a walking top (drawn on top of it, never fighting it). */
function inlay(color, map = null) {
  return new THREE.MeshToonMaterial({ color, map, gradientMap: toonRamp(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
}

/* ---------------------------------------------------------------- the ground */

/** Distances the ground needs: to the oases, the causeways, the river, Giza. */
function groundField(plan) {
  const river = riverLine(4);
  const rz = (x) => {
    const i = Math.max(0, Math.min(river.length - 2, Math.floor((x + 900) / 4)));
    const t = (x + 900) / 4 - i;
    return river[i][1] + (river[i + 1][1] - river[i][1]) * t;
  };
  const rDist = (x, z) => {
    const slope = (rz(x + 2) - rz(x - 2)) / 4;
    return Math.abs(z - rz(x)) / Math.sqrt(1 + slope * slope);
  };
  const segs = plan.stairs.flatMap((s) => s.segs);
  const segDist = (x, z) => {
    let best = Infinity;
    for (const L of segs) {
      const ox = x - L.ax, oz = z - L.az;
      const a = Math.max(0, Math.min(L.len, ox * L.dx + oz * L.dz));
      best = Math.min(best, Math.hypot(ox - L.dx * a, oz - L.dz * a));
    }
    return best;
  };
  const oDist = (x, z) => {
    let best = Infinity;
    for (const f of plan.floors) best = Math.min(best, Math.hypot(x - f.centre.x, z - f.centre.z) - DESERT.gardenR);
    return best;
  };
  const gDist = (x, z) => Math.max(z + 140, -400 - z, -440 - x, x + 90);
  const { half } = DESERT.river;
  /** The sand's height at a point, and what the point is (garden, bank, water). */
  function at(x, z) {
    const dO = oDist(x, z), dC = segDist(x, z), dR = rDist(x, z), dG = gDist(x, z);
    const garden = 1 - smooth(-5, 3, dO);
    const near = Math.min(dO, dC - 3, dR - half - 10, dG + 6);
    const far = smooth(380, 1100, Math.hypot(x, (z + 80) * 1.4));
    const m = smooth(10, 85, near);
    const swell = Math.max(0, fbm(x * 0.0042 + 11, z * 0.0042 - 3) + 0.3);
    const crest = Math.pow(1 - Math.abs(noise(x * 0.011 + z * 0.004 + 5, z * 0.016 - 2)), 3);
    let y = garden * DESERT.gardenY + m * (swell * (16 + far * 34) + crest * (4 + far * 8));
    const bank = smooth(half - 5, half + 8, dR);
    y = y * bank + (1 - bank) * -2.2;
    return { y, garden, dR, dune: m, crest };
  }
  return { at, rz, rDist };
}

function ground(plan, field) {
  // A grid that is fine round the oases and the river and grows coarse far away.
  const NX = 620, NZ = 380;
  const g = new THREE.PlaneGeometry(2, 2, NX, NZ);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  const colors = new Float32Array(p.count * 3);
  const C = (h) => new THREE.Color(h);
  const sandLo = C('#dfa462'), sandHi = C('#f3cd8e'), shade = C('#cf9455'), wet = C('#b98e5e'), reed = C('#8bb45a'), bed = C('#5f8a78');
  const grass = [C('#86c45c'), C('#a6d16c'), C('#6fb352')];
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getZ(i);
    const x = 520 * u + 1250 * u ** 7, z = -110 + 320 * v + 980 * v ** 7;
    const s = field.at(x, z);
    p.setXYZ(i, x, s.y, z);
    const k = 0.5 + 0.5 * fbm(x * 0.02, z * 0.02);
    const half = DESERT.river.half;
    col.copy(sandLo).lerp(sandHi, Math.min(1, k * 0.8 + s.crest * 0.35 + Math.min(0.3, s.y * 0.012)));
    col.lerp(shade, Math.max(0, -fbm(x * 0.05 + 3, z * 0.05)) * 0.35 * s.dune);
    col.lerp(wet, (1 - smooth(half, half + 12, s.dR)) * 0.8);
    col.lerp(reed, (1 - smooth(half + 3, half + 16, s.dR)) * smooth(half - 1, half + 3, s.dR) * 0.7);
    col.lerp(bed, 1 - smooth(half - 3, half + 1, s.dR));
    if (s.garden > 0) {
      const gk = 0.5 + 0.5 * noise(x * 0.15, z * 0.15);
      col.lerp(gk < 0.4 ? grass[2] : gk < 0.7 ? grass[0] : grass[1], s.garden);
    }
    colors.set([col.r, col.g, col.b], i * 3);
    // Ripples follow the wind (from the west-north-west).
    uv.setXY(i, (x * 0.93 + z * 0.37) / 9, (z * 0.93 - x * 0.37) / 9);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ripple = painted('ripples');
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: ripple }));
  m.receiveShadow = true;
  m.name = 'desert-sand';
  return m;
}

/* ---------------------------------------------------------------- water */

const WATER_FRAG = `uniform float uTime; uniform float uNight; uniform float uHalf; uniform float uShore; uniform float uPool; uniform vec3 cEdge; uniform vec3 cMid; uniform vec3 cDeep;
  varying vec2 vUv; varying vec2 vP;
  #include <fog_pars_fragment>
  void main() {
    float d = uPool > 0.5 ? uShore * 0.5 : abs(vUv.y - 0.5) * 2.0 * uHalf;
    vec3 col = mix(cDeep, cMid, smoothstep(2.0, uShore * 0.7, d));
    col = mix(col, cEdge, smoothstep(uShore * 0.55, uShore, d));
    // Ripples drifting downstream, sun glints, a foam line at the bank.
    float flow = vP.x + uTime * 1.6;
    float r1 = sin(flow * 0.55 + sin(vP.y * 0.4) * 1.5) * sin(vP.y * 0.9 - uTime * 0.7);
    float r2 = sin((flow + vP.y) * 0.31) * sin((flow - vP.y) * 0.27 + uTime * 0.5);
    col += 0.05 * smoothstep(0.5, 1.0, r1) + 0.09 * smoothstep(0.86, 1.0, r1 * r2 + 0.4);
    col = mix(col, vec3(1.0, 0.98, 0.9), (1.0 - uPool) * smoothstep(uShore - 1.6, uShore - 0.3, d) * (0.35 + 0.25 * sin(uTime * 1.4 + vP.x * 0.3)));
    col = mix(col, col * vec3(0.2, 0.28, 0.5) + vec3(0.02, 0.03, 0.08) * smoothstep(0.6, 1.0, r1), uNight);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
function waterMaterial(half, edge, mid, deep, { shore = half, pool = false } = {}) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uNight: { value: 0 }, uHalf: { value: half }, uShore: { value: shore }, uPool: { value: pool ? 1 : 0 },
    cEdge: { value: new THREE.Color(edge) }, cMid: { value: new THREE.Color(mid) }, cDeep: { value: new THREE.Color(deep) }
  }]);
  return new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: `varying vec2 vUv; varying vec2 vP;
      #include <fog_pars_vertex>
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: WATER_FRAG
  });
}

/** The Nile: a ribbon of water along the river line, its edges buried in the banks. */
function nile() {
  const { half } = DESERT.river;
  const W = half + 7;
  const pts = riverLine(6);
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const [tx, tz] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(tx, tz);
    const nx = -tz / L, nz = tx / L;
    for (const s of [-1, 1]) {
      pos.push(pts[i][0] + nx * W * s, -0.45, pts[i][1] + nz * W * s);
      uvs.push(i / (pts.length - 1), s < 0 ? 0 : 1);
    }
    if (i) {
      const k = i * 2;
      idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, waterMaterial(W, '#9fe6cf', '#3fb7b4', '#1f8aa0', { shore: half + 3.5 }));
  m.name = 'nile';
  m.frustumCulled = false;
  return m;
}

/* ---------------------------------------------------------------- plants */

/** A date palm: a ringed, gently curved trunk, a crown of fronds, clusters of dates. */
function datePalm(deco, x, y, z, seed, leafColor = '#5fae4a', size = 1) {
  const r = seeded(seed);
  const h = (6 + r() * 2.6) * size;
  const a = r() * TAU, lean = 0.08 + r() * 0.16;
  const dir = [Math.sin(a), Math.cos(a)];
  const topP = [x + dir[0] * h * lean * 1.4, y + h, z + dir[1] * h * lean * 1.4];
  const pts = [[x, y - 0.2, z], [x + dir[0] * h * lean * 0.25, y + h * 0.4, z + dir[1] * h * lean * 0.25], [x + dir[0] * h * lean * 0.85, y + h * 0.78, z + dir[1] * h * lean * 0.85], topP];
  add(deco, limb(pts, 0.34 * size, 0.24 * size, { segs: 14, radial: 7 }), mat('#a07a4e', { rough: 0.95 }));
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  for (let i = 1; i < 9; i++) {
    const p = curve.getPointAt(i / 9);
    add(deco, new THREE.TorusGeometry((0.31 - i * 0.012) * size, 0.05 * size, 4, 10), mat('#7d5e3e'), [p.x, p.y, p.z], [Math.PI / 2, 0, 0]);
  }
  const leaf = vcMat({ side: THREE.DoubleSide, key: 'leaf' });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const m = add(deco, leafGeo((3.2 + r() * 1.0) * size, 0.7 * size, { color: leafColor, droop: 1.35, cup: 0.2, segL: 10 }), leaf, topP);
    m.rotation.order = 'YXZ';
    m.rotation.set(0.1 + r() * 0.35, (i / n) * TAU + r() * 0.3, 0);
  }
  for (let i = 0; i < 3; i++) {
    const ang = i * 2.1 + r();
    add(deco, sphere(0.32 * size, 8, 6), mat(i % 2 ? '#e0873a' : '#b8602a'), [topP[0] + Math.sin(ang) * 0.38 * size, topP[1] - 0.5 * size, topP[2] + Math.cos(ang) * 0.38 * size], [0, 0, 0], [1, 1.3, 1]);
  }
  return topP;
}

/** A clump of reeds and papyrus at the water's edge. */
function reeds(deco, x, y, z, seed) {
  const r = seeded(seed);
  const stalk = mat('#6fa84a'), stalk2 = mat('#88b958'), head = mat('#b9d06a');
  const n = 4 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const h = 1.6 + r() * 1.8;
    const ox = (r() - 0.5) * 1.6, oz = (r() - 0.5) * 1.6;
    const tilt = [(r() - 0.5) * 0.35, 0, (r() - 0.5) * 0.35];
    add(deco, cone(0.07, h, 4), i % 2 ? stalk : stalk2, [x + ox, y + h / 2, z + oz], tilt);
    if (r() > 0.55) add(deco, cone(0.38, 0.4, 7), head, [x + ox + tilt[2] * -h * 0.5, y + h + 0.05, z + oz + tilt[0] * h * 0.5], [Math.PI, 0, 0]);
  }
}

/** A mesa: a flat-topped hill of striped rock on the horizon. */
function mesa(parent, x, z, r, h, seed) {
  const rnd = seeded(seed);
  const tones = ['#d08a5a', '#c27a4e', '#dd9d6a', '#b86e45'].map((c) => mat(c, { rough: 1 }));
  let y = -2, rr = r * 1.25;
  const layers = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < layers; i++) {
    const lh = (h / layers) * (0.8 + rnd() * 0.4);
    const r1 = rr * (0.88 + rnd() * 0.06);
    add(parent, new THREE.CylinderGeometry(r1, rr, lh, 9 + (seed % 3), 1), tones[(i + seed) % tones.length], [x, y + lh / 2, z], [0, rnd() * TAU, 0]);
    y += lh;
    rr = r1;
  }
  add(parent, new THREE.CylinderGeometry(rr * 0.98, rr, 0.6, 9 + (seed % 3)), mat('#e9b27e', { rough: 1 }), [x, y + 0.3, z]);
}

/* ---------------------------------------------------------------- an oasis town */

function oasis(w, deco, pools, f, look, plan) {
  const { plazaR, walkR, walkW, deck: y, gardenY } = DESERT;
  const { x: cx, z: cz } = f.centre;
  // The plaza: a drum of blocks, the flagstones, a sun mosaic.
  drum(w, cx, cz, plazaR, y, 0, 64);
  top(w, disc(cx, cz, plazaR, 64), y);
  add(deco, new THREE.CircleGeometry(plazaR - 2.2, 64), inlay('#ffffff', painted('mosaic', '#f0d9ac', look.banner)), [cx, y + 0.004, cz], [-Math.PI / 2, 0, 0]);
  add(deco, new THREE.RingGeometry(plazaR - 0.8, plazaR - 0.35, 96), inlay(SAND.turquoise), [cx, y + 0.004, cz], [-Math.PI / 2, 0, 0]);
  // The colonnade walk: a ring of flagstones on a wall, a ledge outside for the columns.
  const r0 = walkR - walkW / 2, r1 = walkR + walkW / 2, ledge = r1 + 0.9;
  drum(w, cx, cz, ledge, y, 0, 128);
  add(w, tile(new THREE.CylinderGeometry(r0, r0, y - gardenY + 0.1, 128, 1, true), 40, 0.6), blocksInside(), [cx, (y + gardenY - 0.1) / 2, cz]);
  top(w, ringGeo(cx, cz, r0, ledge), y);
  // Gaps in the colonnade where paths and causeways leave.
  const gaps = [...PADS.map((p) => ({ a: p.a * D2R, half: 2.6 / ledge })), { a: 90 * D2R, half: 3.3 / ledge }, { a: 270 * D2R, half: 3.3 / ledge }];
  const gap = (a) => gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g.a), Math.cos(a - g.a))) < g.half);
  const R = r1 + 0.45, N = 44;
  const shaft = mat(SAND.cream), lotus = mat(SAND.green), abacus = mat(SAND.light), band = mat(look.banner), lap = mat(SAND.lapis);
  const lintel = (a0, a1) => {
    const [x0, z0] = [cx + Math.sin(a0) * R, cz - Math.cos(a0) * R], [x1, z1] = [cx + Math.sin(a1) * R, cz - Math.cos(a1) * R];
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.7;
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    add(deco, box(0.62, 0.42, len), abacus, [(x0 + x1) / 2, y + 3.62, (z0 + z1) / 2], [0, yaw, 0]);
    add(deco, box(0.64, 0.14, len), band, [(x0 + x1) / 2, y + 3.36, (z0 + z1) / 2], [0, yaw, 0]);
  };
  const cols = [];
  for (let i = 0; i < N; i++) cols.push(gap((i / N) * TAU) ? null : (i / N) * TAU);
  cols.forEach((a, i) => {
    if (a == null) return;
    const x = cx + Math.sin(a) * R, z = cz - Math.cos(a) * R;
    add(deco, cyl(0.36, 0.4, 0.2, 10), abacus, [x, y + 0.1, z]);
    add(deco, cyl(0.24, 0.29, 2.75, 10), shaft, [x, y + 1.55, z]);
    add(deco, cyl(0.3, 0.3, 0.14, 10), lap, [x, y + 0.6, z]);
    add(deco, cyl(0.3, 0.3, 0.12, 10), band, [x, y + 2.55, z]);
    add(deco, cyl(0.42, 0.24, 0.45, 10), lotus, [x, y + 3.12, z]);
    if (i % 4 === 0) add(deco, cyl(0.12, 0.12, 0.26, 8), lampMat, [x - Math.sin(a) * 0.45, y + 2.95, z + Math.cos(a) * 0.45]);
    const b = cols[(i + 1) % N];
    if (b != null) lintel(a, i + 1 === N ? b + TAU : b);
  });

  // The paths: from the plaza out to the colonnade, and from it to every platform.
  for (const L of f.links) {
    const trimA = L.to ? r1 : 0, trimB = L.to ? 0 : r0;
    const ax = L.ax + L.dx * (L.to ? trimA - walkR : 0), az = L.az + L.dz * (L.to ? trimA - walkR : 0);
    const bx = L.to ? L.bx : L.ax + L.dx * (trimB - (plazaR - 1)), bz = L.to ? L.bz : L.az + L.dz * (trimB - (plazaR - 1));
    top(w, strip(L.ax, L.az, L.bx, L.bz, L.width), y);
    body(w, ax, az, bx, bz, L.width, y - 0.002, gardenY - 0.1);
    // Lanterns along the spokes in from the plaza.
    if (!L.to) for (const s of [-1, 1]) lantern(deco, [(ax + bx) / 2 + L.dz * s * (L.width / 2 + 0.35), y, (az + bz) / 2 - L.dx * s * (L.width / 2 + 0.35)], 1.6);
  }
  // The platforms: stone drums, flagstones, a turquoise band at the rim.
  for (const id in f.pads) {
    const p = f.pads[id];
    drum(w, p.x, p.z, p.pr, y, gardenY - 0.1, 40);
    top(w, disc(p.x, p.z, p.pr, 40), y);
    add(deco, new THREE.RingGeometry(p.pr - 0.5, p.pr - 0.25, 48), inlay(SAND.turquoise), [p.x, y + 0.004, p.z], [-Math.PI / 2, 0, 0]);
  }
  // The lotus pool north of the plaza (between the spokes), a stone rim round it.
  const outer = (rr, half) => {
    const s = new THREE.Shape();
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const a = (-half + (2 * half * i) / n) * D2R;
      s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr[1], Math.cos(a) * rr[1]);
    }
    for (let i = 0; i <= n; i++) {
      const a = (half - (2 * half * i) / n) * D2R;
      s.lineTo(Math.sin(a) * rr[0], Math.cos(a) * rr[0]);
    }
    return s;
  };
  const rimShape = outer([15.2, 23.2], 44);
  const water = outer([15.9, 22.5], 41.5);
  rimShape.holes.push(new THREE.Path(water.getPoints()));
  const rim = new THREE.ExtrudeGeometry(rimShape, { depth: 0.45, bevelEnabled: false });
  rim.rotateX(-Math.PI / 2);
  add(deco, rim, mat(SAND.light), [cx, gardenY - 0.1, cz]);
  const wg = new THREE.ShapeGeometry(water, 4);
  wg.rotateX(-Math.PI / 2);
  // Shape y is "north" here (the rotation maps shape y to −z).
  const pm = new THREE.Mesh(wg, pools.material);
  pm.position.set(cx, gardenY + 0.22, cz);
  pools.add(pm);
  const lily = mat('#5fae4a'), pink = mat('#ff9ec7'), white = mat('#fff6f0');
  const rr = seeded(f.n * 7);
  for (let i = 0; i < 11; i++) {
    const a = (-36 + rr() * 72) * D2R, d = 17 + rr() * 4.6;
    const x = cx + Math.sin(a) * d, z = cz - Math.cos(a) * d;
    add(deco, cyl(0.55 + rr() * 0.25, 0.55, 0.04, 10), lily, [x, gardenY + 0.25, z]);
    if (i % 2 === 0) add(deco, cone(0.2, 0.28, 6), i % 4 ? pink : white, [x + 0.1, gardenY + 0.4, z], [Math.PI, 0, 0]);
  }
  // Palms, bushes and flowers in the garden: wherever no stone, pool or rim is.
  const clear = (x, z, d) => {
    for (const [ox, oz] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d * 0.7, d * 0.7], [-d * 0.7, d * 0.7], [d * 0.7, -d * 0.7], [-d * 0.7, -d * 0.7]]) if (plan.surfaces(x + ox, z + oz).length) return false;
    const r = Math.hypot(x - cx, z - cz), a = Math.atan2(x - cx, -(z - cz)) / D2R;
    if (r > 14.6 && r < 23.8 && Math.abs(a) < 46) return false;
    if (Math.abs(r - (walkR + walkW / 2 + 0.9)) < d + 0.2) return false;
    return true;
  };
  const r = seeded(f.n * 101);
  const palms = [];
  for (let tries = 0; tries < 900 && palms.length < 30; tries++) {
    const a = r() * TAU, d = 14.5 + r() * 32;
    const x = cx + Math.sin(a) * d, z = cz - Math.cos(a) * d;
    if (!clear(x, z, 1.8) || palms.some((q) => Math.hypot(q[0] - x, q[1] - z) < 5.2)) continue;
    // Keep the south side (where the camera stands, looking north) clear of tall palms.
    const compass = ((Math.atan2(x - cx, -(z - cz)) / D2R) + 360) % 360;
    if (compass > 105 && compass < 255 && d < 45) continue;
    palms.push([x, z]);
  }
  for (const [i, [x, z]] of palms.entries()) datePalm(deco, x, gardenY, z, f.n * 1000 + i, look.leaf, 0.9 + (i % 3) * 0.12);
  const flowers = look.flowers.map((c) => mat(c));
  const bush = [mat('#5fa64a'), mat('#4f9a46'), mat('#79b85a')];
  for (let i = 0, n = 0; i < 700 && n < 70; i++) {
    const a = r() * TAU, d = 13.6 + r() * 33;
    const x = cx + Math.sin(a) * d, z = cz - Math.cos(a) * d;
    if (!clear(x, z, 0.9)) continue;
    n++;
    const s = 0.5 + r() * 0.6;
    add(deco, ico(s, 1), bush[n % 3], [x, gardenY + s * 0.55, z], [r(), r(), 0], [1, 0.75, 1]);
    if (n % 2) for (let k = 0; k < 4; k++) add(deco, ico(0.12), flowers[(n + k) % flowers.length], [x + Math.sin(k * 1.7) * s * 0.7, gardenY + s * 1.0, z + Math.cos(k * 1.7) * s * 0.7]);
  }
  return palms.map(([x, z]) => ({ x, y: gardenY + 3, z }));
}

/* ---------------------------------------------------------------- causeways */

function causeway(w, deco, st, look) {
  const { deck: y, walkR, walkW } = DESERT;
  for (const L of st.segs) {
    top(w, strip(L.ax, L.az, L.bx, L.bz, L.width), y);
    body(w, L.ax, L.az, L.bx, L.bz, L.width, y - 0.002, -0.8, 3.6);
  }
  // Round knuckles where the causeway bends, so its sides stay closed.
  for (let i = 1; i < st.pts.length - 1; i++) {
    const [x, z] = st.pts[i];
    top(w, disc(x, z, st.width / 2, 24), y);
    add(w, new THREE.CylinderGeometry(st.width / 2, st.width / 2 + 1.8, y + 0.8, 24, 1, true), blocks(), [x, (y - 0.8) / 2, z]);
  }
  // Low parapets along both sides, off the colonnade at each end; lanterns and the avenue beside them.
  const total = st.segs.reduce((s, L) => s + L.len, 0);
  const startAt = walkW / 2 + 2.4, endAt = total - (walkW / 2 + 2.4);
  let run = 0;
  const kerb = mat(SAND.light), kerbTop = mat(look.banner);
  const things = [];
  for (const L of st.segs) {
    const a0 = Math.max(0, startAt - run), a1 = Math.min(L.len, endAt - run);
    if (a1 > a0) for (const s of [-1, 1]) {
      const ox = L.dz * s * (L.width / 2 + 0.18), oz = -L.dx * s * (L.width / 2 + 0.18);
      const ax = L.ax + L.dx * a0 + ox, az = L.az + L.dz * a0 + oz, bx = L.ax + L.dx * a1 + ox, bz = L.az + L.dz * a1 + oz;
      const len = a1 - a0, yaw = Math.atan2(L.dx, L.dz);
      add(deco, box(0.34, 0.42, len), kerb, [(ax + bx) / 2, y + 0.21, (az + bz) / 2], [0, yaw, 0]);
      add(deco, box(0.38, 0.06, len), kerbTop, [(ax + bx) / 2, y + 0.44, (az + bz) / 2], [0, yaw, 0]);
    }
    for (let d = 0; d < L.len; d += 1) {
      const g = run + d;
      if (g < startAt + 3 || g > endAt - 2) continue;
      things.push({ x: L.ax + L.dx * d, z: L.az + L.dz * d, dx: L.dx, dz: L.dz, g });
    }
    run += L.len;
  }
  const every = st.avenue === 'sphinx' ? 7 : st.avenue === 'obelisk' ? 12 : 10;
  let next = startAt + 4, lamp = 0;
  for (const p of things) {
    if (p.g < next) continue;
    next = p.g + every;
    lamp++;
    for (const s of [-1, 1]) {
      const off = st.width / 2 + 2.9;
      const x = p.x + p.dz * s * off, z = p.z - p.dx * s * off;
      if (st.avenue === 'sphinx') {
        // Facing the road, across it from each other.
        const face = Math.atan2(-p.dz * s, p.dx * s);
        add(deco, box(1.7, y + 0.5, 3.2), blocksDark(), [x, (y + 0.5) / 2 - 0.15, z], [0, face, 0]);
        sphinx(deco, [x, y + 0.35, z], 1.1, { yaw: face, base: false, cloth: lamp % 2 ? [SAND.lapis, SAND.gold] : [SAND.turquoise, SAND.cream] });
      } else if (st.avenue === 'obelisk') {
        obelisk(deco, [x, 0, z], 6.2, { yaw: Math.atan2(-p.dz * s, p.dx * s) });
      } else datePalm(deco, x, 0, z, st.k * 100 + lamp * 2 + (s > 0 ? 1 : 0), look.leaf, 0.95);
      if (lamp % 2 === 0 || st.avenue === 'palm') lantern(deco, [p.x + p.dz * s * (st.width / 2 + 0.18), y + 0.42, p.z - p.dx * s * (st.width / 2 + 0.18)], 1.3);
    }
  }
}

/* ---------------------------------------------------------------- Giza */

function giza(group) {
  const g = new THREE.Group();
  const stoneTone = (id) => (id === 'great' ? '#d6a260' : id === 'middle' ? '#d09a58' : id === 'small' ? '#c99352' : '#d4a061');
  for (const p of GIZA.pyramids) {
    const capH = p.cap ? p.h * 0.12 : 0;
    const bodyH = p.h - capH;
    const w1 = p.base * (capH / p.h);
    const geo = tile(frustum(p.base, p.base, w1, w1, bodyH), Math.max(2, p.base / 7), Math.max(2, p.h / 3.2));
    add(g, geo, tmat('blocks', stoneTone(p.id)), [p.x, -0.3, p.z]);
    if (p.cap === 'gold') add(g, pyramidGeo(w1 * 1.02, capH + 0.2), mat(SAND.gold, { rough: 0.25, metal: 0.8 }), [p.x, bodyH - 0.4, p.z]);
    else if (p.cap === 'casing') add(g, pyramidGeo(w1 * 1.02, capH + 0.2), mat('#f6ead2'), [p.x, bodyH - 0.4, p.z]);
    // A skirt of drifted sand round the foot.
    add(g, new THREE.CylinderGeometry(p.base * 0.62, p.base * 0.78, 0.8, 4, 1, true), mat('#eccd96', { rough: 1 }), [p.x, -0.1, p.z], [0, Math.PI / 4, 0]);
  }
  const S = GIZA.sphinx;
  const yaw = Math.atan2(-324 - S.x, 0 - S.z);
  sphinx(g, [S.x, -0.2, S.z], S.scale, { yaw, body: '#e2b070', cloth: [SAND.lapis, SAND.gold] });
  // Two obelisks flank the Sphinx's paws.
  for (const sx of [-1, 1]) obelisk(g, [S.x + Math.sin(yaw) * 16 + Math.cos(yaw) * sx * 24, 0, S.z + Math.cos(yaw) * 16 - Math.sin(yaw) * sx * 24], 14, { yaw });
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  group.add(batch(g));
}

/* ---------------------------------------------------------------- the whole desert */

/**
 * Build the desert for a plan and the oases' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, water, update(t, night) }}
 */
export function buildDesertWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'desert';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  const field = groundField(plan);
  group.add(ground(plan, field));
  const river = nile();
  group.add(river);
  // Pools share one water material.
  const pools = new THREE.Group();
  pools.material = waterMaterial(4, '#8fe8e0', '#3fc6cf', '#2aa7bd', { shore: 4, pool: true });
  group.add(pools);
  giza(group);

  // Mesas on the horizon, and the river's reeds, papyrus and palms.
  const far = new THREE.Group();
  const r = seeded(77);
  for (let i = 0; i < 22; i++) {
    const a = -1.9 + (i / 21) * 3.8 + (r() - 0.5) * 0.12;
    const d = 640 + r() * 300;
    mesa(far, Math.sin(a) * d * 1.25, -80 - Math.cos(a) * d, 30 + r() * 60, 26 + r() * 46, i + 3);
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.PI + (i - 3.5) * 0.34 + (r() - 0.5) * 0.1;
    const d = 760 + r() * 200;
    mesa(far, Math.sin(a) * d * 1.2, -80 - Math.cos(a) * d, 30 + r() * 50, 20 + r() * 30, i + 40);
  }
  far.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  group.add(batch(far));
  const banks = new THREE.Group();
  const { half } = DESERT.river;
  for (let x = -620; x <= 620; x += 6.5) for (const s of [-1, 1]) {
    if (r() < 0.25) continue;
    const z = field.rz(x) + s * (half + 0.8 + r() * 3.6);
    reeds(banks, x + (r() - 0.5) * 3, field.at(x, z).y - 0.2, z, Math.round(x * 7 + s * 3));
  }
  for (let x = -600; x <= 600; x += 13) for (const s of [-1, 1]) {
    if (r() < 0.45) continue;
    const z = field.rz(x) + s * (half + 9 + r() * 10);
    if (plan.floors.some((f) => Math.hypot(f.centre.x - x, f.centre.z - z) < DESERT.gardenR + 6)) continue;
    datePalm(banks, x, field.at(x, z).y - 0.1, z, Math.round(x * 3 + s), '#5fae4a', 1.05);
  }
  banks.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  group.add(batch(banks));

  // The oasis towns.
  const tiers = [];
  const fireflySpots = [];
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    const w = new THREE.Group(), deco = new THREE.Group();
    fireflySpots.push(...oasis(w, deco, pools, f, look, plan));
    for (const id in f.pads) fireflySpots.push({ x: f.pads[id].x, y: DESERT.deck, z: f.pads[id].z });
    batch(w);
    batch(deco);
    patchCutout(deco);
    w.userData.floor = f.n;
    walk.add(w);
    group.add(deco);
    tiers.push({ walk: w, deco });
  }
  // The causeways between the towns, a gate at the start of each.
  const links = new THREE.Group(), linkWalk = new THREE.Group();
  const gates = [];
  for (const s of plan.stairs) {
    causeway(linkWalk, links, s, floors[s.from - 1].look);
    const gate = buildGate({ a: s.a, b: s.b, width: s.width }, { ...floors[s.from - 1].look, stone: SAND.mid });
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
  }
  batch(links);
  batch(linkWalk);
  patchCutout(links);
  walk.add(linkWalk);
  group.add(links);

  // Feluccas sailing slowly downstream (east), round again.
  const boats = [];
  for (let i = 0; i < 9; i++) {
    const b = feluccaBoat([SAND.red, SAND.lapis, SAND.turquoise, SAND.gold][i % 4], 1.25);
    b.userData.s = -640 + i * 150 + r() * 40;
    b.userData.lane = (r() - 0.5) * 9;
    b.userData.speed = 1.4 + r() * 1.4;
    b.userData.phase = r() * 10;
    batch(b);
    group.add(b);
    boats.push(b);
  }
  const placeBoat = (b, t) => {
    let s = b.userData.s + t * b.userData.speed;
    s = ((s + 700) % 1400 + 1400) % 1400 - 700;
    const z = field.rz(s) + b.userData.lane;
    const ahead = field.rz(s + 4) + b.userData.lane;
    b.position.set(s, -0.42 + Math.sin(t * 1.2 + b.userData.phase) * 0.06, z);
    b.rotation.set(Math.sin(t * 0.8 + b.userData.phase) * 0.03, Math.atan2(4, ahead - z), Math.sin(t * 1.0 + b.userData.phase) * 0.04);
  };
  boats.forEach((b) => placeBoat(b, 0));
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots,
    water: river,
    update(t, night) {
      for (const m of [river.material, pools.material]) {
        m.uniforms.uTime.value = t;
        m.uniforms.uNight.value = night;
      }
      for (const b of boats) placeBoat(b, t);
    }
  };
}
