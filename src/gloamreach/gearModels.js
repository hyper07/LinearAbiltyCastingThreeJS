/**
 * Gloamreach's arms and armour, modelled from code: every weapon, shield,
 * helmet and armour piece built from real shapes — blades with a lens
 * cross-section, a polished edge bevel, a fuller and a ridge; crossguards
 * swept along curves with flared quillons; grips wrapped in leather cord with
 * ferrules; wheel and scent-stopper pommels with gem insets; bearded axe heads
 * and flanged maces with bevelled edges; recurve limbs; shields with bent
 * faces, painted arms, rims, bosses and rivets; helmets with visors, breaths,
 * brow bands and crests; layered pauldrons, gauntlet cuffs, knee cops and
 * sabatons. Pieces that share a material are merged, so an item is a handful
 * of draws.
 *
 * Conventions: weapons hold their grip (where the hand closes) at the origin
 * with the blade or head along +Y and the edges along ±X; shields face +Z with
 * the grip at the origin; helmets sit round a head of radius 1 centred at the
 * origin, facing +Z (gearRig scales them to the hero).
 *
 *   const group = buildItem(item);         // any item, for a hand, a bone or an icon
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BASES, METALS, glows } from './items.js';
import { gearMaterial, heraldryMaterial } from './gearMaterials.js';
import { rng } from './noise.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ building */

/** Collects geometry by material, then merges each material's into one mesh. */
class Build {
  /** `unit`: the real size of one model unit (helmets are built round a head of radius 1). */
  constructor(unit = 1) {
    this.parts = new Map();
    this.unit = unit;
  }

  add(material, geo, m = null) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g === geo) g = geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    if (m) g.applyMatrix4(m);
    // A plain 0…1 mapping stretched over a big piece: tile the detail so leather and mail keep their real size.
    const uv = g.attributes.uv;
    let mx = 0;
    for (let i = 0; i < uv.count; i++) mx = Math.max(mx, Math.abs(uv.getX(i)), Math.abs(uv.getY(i)));
    if (mx <= 1.01 && material.userData?.gear && material.userData.gear !== 'glow') {
      g.computeBoundingSphere();
      const k = Math.min(14, Math.max(1, (g.boundingSphere.radius * this.unit) / 0.035));
      if (k > 1.2) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
    }
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }

  group(name = '') {
    const out = new THREE.Group();
    out.name = name;
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      out.add(mesh);
    }
    return out;
  }
}

const M4 = () => new THREE.Matrix4();
const tf = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => M4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), typeof s === 'number' ? V(s, s, s) : s);

/**
 * A tube along `path` whose cross-section is an ellipse (rx, ry from
 * `radius(t)`, t 0…1 along it), with analytic normals and capped ends.
 */
export function sweep(path, radius, { segs = 12, closed = false, caps = true, up = null } = {}) {
  const n = path.length;
  const T = [];
  for (let i = 0; i < n; i++) {
    const a = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    T.push(b.clone().sub(a).normalize());
  }
  // Parallel-transported frames.
  const N = [];
  const B = [];
  let ref = up ? up.clone() : Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  let nn = ref.clone().sub(T[0].clone().multiplyScalar(ref.dot(T[0]))).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const axis = T[i - 1].clone().cross(T[i]);
      const s = axis.length();
      if (s > 1e-6) nn.applyAxisAngle(axis.normalize(), Math.asin(Math.min(1, s)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
      nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize();
    }
    N.push(nn.clone());
    B.push(T[i].clone().cross(nn).normalize());
  }
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  let len = 0;
  const L = [0];
  for (let i = 1; i < n; i++) L.push((len += path[i].distanceTo(path[i - 1])));
  const ring = segs + 1;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const r = radius(t, i);
    const [rx, ry] = Array.isArray(r) ? r : [r, r];
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const p = path[i].clone().addScaledVector(N[i], c * rx).addScaledVector(B[i], s * ry);
      const q = N[i].clone().multiplyScalar(c * ry).addScaledVector(B[i], s * rx).normalize();
      pos.push(p.x, p.y, p.z);
      nor.push(q.x, q.y, q.z);
      uv.push(j / segs, L[i] / Math.max(1e-6, len) * Math.max(1, len / 0.12));
    }
  }
  const rows = closed ? n : n - 1;
  for (let i = 0; i < rows; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < segs; j++) {
      const a = i * ring + j;
      const b = i2 * ring + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  if (caps && !closed) {
    for (const [end, dir] of [[0, -1], [n - 1, 1]]) {
      const r = radius(end / Math.max(1, n - 1), end);
      const [rx] = Array.isArray(r) ? r : [r];
      if (rx < 1e-5) continue;
      const centre = pos.length / 3;
      const p = path[end];
      const tn = T[end].clone().multiplyScalar(dir);
      pos.push(p.x, p.y, p.z);
      nor.push(tn.x, tn.y, tn.z);
      uv.push(0.5, 0.5);
      for (let j = 0; j <= segs; j++) {
        const k = end * ring + j;
        pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
        nor.push(tn.x, tn.y, tn.z);
        uv.push(0.5 + Math.cos((j / segs) * Math.PI * 2) * 0.5, 0.5 + Math.sin((j / segs) * Math.PI * 2) * 0.5);
      }
      for (let j = 0; j < segs; j++) {
        if (dir > 0) idx.push(centre, centre + 1 + j, centre + 2 + j);
        else idx.push(centre, centre + 2 + j, centre + 1 + j);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** A lathe from [radius, y] pairs, smooth, `segs` round. */
function lathe(profile, segs = 20, phi0 = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), segs, phi0, phiLen);
  g.computeVertexNormals();
  return g;
}

/** A shape (pts [x, y]) extruded `depth` along z, centred, with a bevel. */
function plate(pts, depth, bevel = 0.004, curveSegs = 6) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curveSegs });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Points along a quadratic or polyline outline, subdivided. */
function smoothOutline(pts, steps = 6) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let k = 0; k < steps; k++) out.push([a[0] + (b[0] - a[0]) * (k / steps), a[1] + (b[1] - a[1]) * (k / steps)]);
  }
  return out;
}

/* ------------------------------------------------------------------ blades */

/**
 * A blade along +Y from y = 0: a lens cross-section with a polished edge
 * bevel, flats, and a fuller down the middle (or a raised ridge), tapering
 * to a point. Returns { polish, flat, fuller } geometries.
 */
export function bladeGeometry({ len = 0.8, w = 0.024, taper = 0.25, tip = 0.14, thick = 0.0055, bevel = 0.38, fuller = { from: 0.02, to: 0.68, w: 0.32, depth: 0.0028 }, ridge = 0, leaf = 0, stations = 30 }) {
  const strips = { polish: [], flat: [], fuller: [] };
  const ys = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    // More stations toward the point.
    ys.push(len * (1 - (1 - t) ** 1.35));
  }
  const halfW = (y) => {
    const t = y / len;
    let hw = w * (1 - taper * t) * (1 + leaf * Math.sin(Math.min(1, t / 0.75) * Math.PI) * 0.6);
    const tipStart = len - tip;
    if (y > tipStart) {
      const k = (y - tipStart) / tip;
      hw *= Math.max(0, 1 - k ** 1.15) ** 0.55;
    }
    return hw;
  };
  const section = (y) => {
    const hw = halfW(y);
    const t = y / len;
    const tf = thick * (1 - t * 0.55) * Math.min(1, (hw / w) * 1.4 + 0.15);
    const inF = fuller && t > fuller.from && t < fuller.to;
    const fk = inF ? Math.min(1, (t - fuller.from) / 0.03, (fuller.to - t) / 0.05) : 0;
    const fw = hw * (fuller?.w ?? 0.3) * Math.max(0.05, fk);
    const fd = (fuller?.depth ?? 0) * fk;
    const bw = hw * (1 - bevel);
    const rz = ridge * tf;
    // Top face from −x to +x: edge, bevel top, fuller edge, fuller dip, centre…
    const top = [[-hw, 0.0004], [-bw, tf * 0.9], [-fw, tf], [-fw * 0.5, tf - fd * 0.75], [0, tf - fd + rz], [fw * 0.5, tf - fd * 0.75], [fw, tf], [bw, tf * 0.9], [hw, 0.0004]];
    return top;
  };
  const kinds = ['polish', 'flat', 'fuller', 'fuller', 'fuller', 'fuller', 'flat', 'polish'];
  for (const side of [1, -1]) {
    for (let s = 0; s < 8; s++) {
      const pos = [];
      const uv = [];
      for (const y of ys) {
        const sec = section(y);
        const a = sec[s];
        const b = sec[s + 1];
        pos.push(a[0], y, a[1] * side, b[0], y, b[1] * side);
        uv.push((a[0] / w + 1) / 2, y / (w * 4), (b[0] / w + 1) / 2, y / (w * 4));
      }
      const idx = [];
      for (let i = 0; i < ys.length - 1; i++) {
        const a = i * 2;
        if (side > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      strips[kinds[s]].push(g);
    }
  }
  const out = {};
  for (const [k, list] of Object.entries(strips)) {
    const geos = list.map((g) => g.toNonIndexed());
    out[k] = mergeGeometries(geos, false);
    for (const g of [...list, ...geos]) g.dispose();
  }
  return out;
}

/* ------------------------------------------------------------------ the item's palette */

/** The materials an item is made of, from its look and rarity. */
export function palette(item) {
  const look = item.look ?? {};
  const metal = METALS[look.metal] ?? METALS.steel;
  const g = glows(item.rarity) ? look.gem : null;
  const rare = item.rarity === 'rare' || g;
  return {
    metal: gearMaterial('metal', metal.color, { rough: metal.rough + 0.12 }),
    polish: gearMaterial('polish', metal.color),
    engraved: gearMaterial(rare ? 'engraved' : 'metal', metal.color, { rough: metal.rough + 0.05 }),
    fuller: gearMaterial('dark', metal.color, { glow: g, glowK: item.rarity === 'legendary' ? 1.3 : 1 }),
    trim: gearMaterial('polish', item.rarity === 'legendary' ? METALS.gilded.color : item.rarity === 'epic' ? METALS.silver.color : metal.color),
    leather: gearMaterial('leather', look.leather ?? '#5a3a24'),
    wrap: gearMaterial('wrap', look.leather ?? '#4a3020'),
    wood: gearMaterial('wood', '#8a6440'),
    darkwood: gearMaterial('wood', '#4e3524'),
    cloth: gearMaterial('cloth', look.cloth ?? '#5a4a3a', { side: THREE.DoubleSide }),
    mail: gearMaterial('mail', metal.color),
    gem: look.gem ? gearMaterial('gem', look.gem, { glow: g, glowK: item.rarity === 'legendary' ? 1.6 : 1 }) : null,
    glow: g ? gearMaterial('glow', g, { glowK: item.rarity === 'legendary' ? 1.2 : 0.9 }) : null,
    slit: gearMaterial('default', '#050505', { rough: 0.9 }),
    shell: gearMaterial(rare ? 'engraved' : 'metal', metal.color, { rough: metal.rough + 0.08, side: THREE.DoubleSide }),
    shellLeather: gearMaterial('leather', look.leather ?? '#5a3a24', { side: THREE.DoubleSide }),
    seed: look.seed ?? 1,
    rarity: item.rarity,
    g
  };
}

/* ------------------------------------------------------------------ hilts */

function guard(b, P, { half = 0.1, curve = 0.025, r = [0.011, 0.014], ends = 'ball', y = 0, block = true }) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const x = -half + (2 * half * i) / 16;
    pts.push(V(x, y + curve * (x / half) ** 2, 0));
  }
  b.add(P.engraved, sweep(pts, (t) => {
    const e = Math.abs(t - 0.5) * 2;
    const k = 1 + e ** 3 * 0.35;
    return [r[0] * k, r[1] * k];
  }, { segs: 10 }));
  for (const s of [-1, 1]) {
    const x = s * half;
    const yy = y + curve;
    if (ends === 'ball') b.add(P.polish, new THREE.SphereGeometry(r[1] * 1.45, 14, 10), tf(x, yy, 0));
    else if (ends === 'scroll') b.add(P.polish, new THREE.TorusGeometry(r[1] * 1.3, r[0] * 0.55, 8, 16), tf(x + s * r[1] * 0.6, yy + r[1] * 1.3, 0));
    else b.add(P.polish, new THREE.BoxGeometry(r[1] * 2.2, r[1] * 2.6, r[1] * 2.4), tf(x, yy, 0, 0, 0, s * 0.3));
  }
  if (block) {
    // The écusson: a diamond plate at the centre, over the blade's root.
    b.add(P.engraved, plate([[0, 0.034], [0.022, 0.008], [0, -0.012], [-0.022, 0.008]], r[1] * 2.2, 0.003), tf(0, y + 0.004, 0));
    if (P.gem) b.add(P.gem, new THREE.OctahedronGeometry(0.008, 0), tf(0, y + 0.012, r[1] * 1.15, 0, 0, 0, V(1, 1.3, 0.5)));
  }
}

function grip(b, P, { y0 = -0.06, y1 = 0.06, r = 0.015, swell = 0.12 }) {
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    prof.push([r * (1 + Math.sin(t * Math.PI) * swell), y0 + (y1 - y0) * t]);
  }
  const g = lathe(prof, 18);
  // The wrap's texture runs round and along: scale its uv to the grip's size.
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * ((y1 - y0) / 0.04));
  b.add(P.wrap, g);
  for (const y of [y0, y1]) b.add(P.trim, new THREE.TorusGeometry(r * 1.05, r * 0.28, 8, 20), tf(0, y, 0, Math.PI / 2));
}

function pommel(b, P, kind, y, s = 1) {
  if (kind === 'wheel') {
    const g = lathe([[0.001, -0.012], [0.026, -0.012], [0.031, -0.006], [0.031, 0.006], [0.026, 0.012], [0.001, 0.012]], 24);
    b.add(P.engraved, g, tf(0, y - 0.03 * s, 0, Math.PI / 2, 0, 0, s));
    if (P.gem) for (const z of [1, -1]) b.add(P.gem, new THREE.SphereGeometry(0.011, 14, 10), tf(0, y - 0.03 * s, z * 0.011 * s, 0, 0, 0, V(s, s, 0.45 * s)));
    else for (const z of [1, -1]) b.add(P.polish, new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), tf(0, y - 0.03 * s, z * 0.0115 * s, Math.PI / 2, 0, 0, s));
    b.add(P.polish, new THREE.SphereGeometry(0.008, 10, 8), tf(0, y - 0.062 * s, 0, 0, 0, 0, s));
  } else if (kind === 'scent') {
    b.add(P.engraved, lathe([[0.001, 0], [0.012, -0.004], [0.02, -0.016], [0.024, -0.03], [0.02, -0.046], [0.01, -0.056], [0.001, -0.058]], 18), tf(0, y, 0, 0, 0, 0, s));
    if (P.gem) b.add(P.gem, new THREE.OctahedronGeometry(0.012, 1), tf(0, y - 0.062 * s, 0, 0, 0, 0, s));
  } else if (kind === 'disc') {
    b.add(P.engraved, new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), tf(0, y - 0.008, 0, Math.PI / 2, 0, 0, s));
    b.add(P.polish, new THREE.TorusGeometry(0.03, 0.003, 6, 24), tf(0, y - 0.008, 0, 0, 0, 0, s));
    if (P.gem) b.add(P.gem, new THREE.SphereGeometry(0.01, 12, 10), tf(0, y - 0.008, 0.007, 0, 0, 0, V(s, s, 0.5 * s)));
  } else {
    b.add(P.polish, new THREE.SphereGeometry(0.022, 16, 12), tf(0, y - 0.018, 0, 0, 0, 0, s));
  }
}

function addBlade(b, P, opts, y = 0) {
  const g = bladeGeometry(opts);
  const m = tf(0, y, 0);
  b.add(P.polish, g.polish, m);
  b.add(P.metal, g.flat, m);
  b.add(P.fuller, g.fuller, m);
  // Runes down the fuller of an epic or legendary blade: a thin glowing line.
  if (P.glow && opts.fuller) {
    const len = opts.len * (opts.fuller.to - opts.fuller.from) * 0.85;
    const y0 = y + opts.len * opts.fuller.from + 0.02;
    for (const z of [1, -1]) {
      const strip = new THREE.PlaneGeometry(0.0022, len, 1, 1);
      b.add(P.glow, strip, tf(0, y0 + len / 2, z * (opts.thick - (opts.fuller.depth ?? 0) * 0.9 + 0.0003), 0, z > 0 ? 0 : Math.PI, 0));
    }
  }
}

/* ------------------------------------------------------------------ weapons */

function sword(P, kind) {
  const b = new Build();
  const r = rng(P.seed);
  const spec = {
    shortsword: { blade: { len: 0.62, w: 0.026, taper: 0.28, tip: 0.13, thick: 0.0058, fuller: { from: 0.02, to: 0.62, w: 0.3, depth: 0.0026 } }, grip: 0.1, guard: 0.085, pommel: 'wheel', curve: 0.012 },
    longsword: { blade: { len: 0.84, w: 0.024, taper: 0.32, tip: 0.17, thick: 0.0056, fuller: { from: 0.02, to: 0.7, w: 0.28, depth: 0.0026 } }, grip: 0.13, guard: 0.11, pommel: r() < 0.5 ? 'wheel' : 'scent', curve: 0.03 },
    greatsword: { blade: { len: 1.12, w: 0.03, taper: 0.3, tip: 0.2, thick: 0.007, fuller: { from: 0.12, to: 0.62, w: 0.26, depth: 0.003 } }, grip: 0.26, guard: 0.16, pommel: 'scent', curve: 0.04, ricasso: true }
  }[kind];
  const gy = spec.grip / 2;
  // Two-handers are held near the guard; the rest mid-grip.
  const hold = kind === 'greatsword' ? gy - 0.06 : 0;
  grip(b, P, { y0: -gy - hold, y1: gy - hold, r: kind === 'greatsword' ? 0.017 : 0.0155 });
  guard(b, P, { half: spec.guard, curve: spec.curve, y: gy - hold + 0.008, ends: kind === 'shortsword' ? 'block' : r() < 0.5 ? 'ball' : 'scroll', r: kind === 'greatsword' ? [0.013, 0.017] : [0.011, 0.014] });
  pommel(b, P, spec.pommel, -gy - hold, kind === 'greatsword' ? 1.2 : 1);
  const by = gy - hold + 0.018;
  if (spec.ricasso) {
    // An unsharpened stretch above the guard, with parrying lugs.
    b.add(P.metal, new THREE.BoxGeometry(spec.blade.w * 1.5, 0.11, spec.blade.thick * 2), tf(0, by + 0.055, 0));
    for (const s of [-1, 1]) b.add(P.polish, sweep([V(s * spec.blade.w * 0.75, by + 0.1, 0), V(s * spec.blade.w * 1.9, by + 0.1, 0), V(s * spec.blade.w * 2.4, by + 0.08, 0)], (t) => 0.006 * (1 - t * 0.5), { segs: 8 }));
    addBlade(b, P, spec.blade, by + 0.11);
  } else addBlade(b, P, spec.blade, by);
  return b.group(kind);
}

function dagger(P) {
  const b = new Build();
  grip(b, P, { y0: -0.05, y1: 0.05, r: 0.013 });
  // Rondels: discs at the guard and the pommel.
  for (const [y, rad] of [[0.058, 0.032], [-0.058, 0.028]]) {
    b.add(P.engraved, new THREE.CylinderGeometry(rad, rad, 0.009, 24), tf(0, y, 0));
    b.add(P.polish, new THREE.TorusGeometry(rad, 0.003, 6, 24), tf(0, y, 0, Math.PI / 2));
  }
  if (P.gem) b.add(P.gem, new THREE.SphereGeometry(0.009, 12, 10), tf(0, -0.066, 0, 0, 0, 0, V(1, 0.5, 1)));
  addBlade(b, P, { len: 0.27, w: 0.014, taper: 0.55, tip: 0.1, thick: 0.007, bevel: 0.45, fuller: null, ridge: 0.6 }, 0.062);
  return b.group('dagger');
}

function axe(P) {
  const b = new Build();
  const r = rng(P.seed);
  // The haft: ash, a gentle curve, a wrapped grip near its foot.
  const haft = [];
  for (let i = 0; i <= 12; i++) {
    const y = -0.12 + i * 0.06;
    haft.push(V(Math.sin(i / 12 * Math.PI) * -0.012, y, 0));
  }
  b.add(P.wood, sweep(haft, (t) => [0.016 - t * 0.003, 0.019 - t * 0.003], { segs: 12 }));
  grip(b, P, { y0: -0.1, y1: 0.06, r: 0.0175, swell: 0.05 });
  b.add(P.trim, new THREE.CylinderGeometry(0.019, 0.021, 0.022, 14), tf(-0.002, -0.125, 0));
  // The head: a bearded blade (edge toward +x), a socket, langets down the haft.
  const top = 0.6;
  const beard = r() < 0.5 ? 0.13 : 0.09;
  const head = [[-0.03, top + 0.035], [0.05, top + 0.03], [0.11, top + 0.07], [0.15, top + 0.075], [0.162, top + 0.02], [0.158, top - 0.06], [0.145, top - beard], [0.12, top - beard - 0.02], [0.09, top - beard + 0.01], [0.055, top - 0.05], [0.03, top - 0.04], [-0.03, top - 0.04]];
  const hp = plate(head, 0.014, 0.004, 4);
  b.add(P.engraved, hp);
  // The bright, honed edge: a thin bevelled band along the front.
  const edge = [V(0.15, top + 0.075, 0), V(0.162, top + 0.02, 0), V(0.158, top - 0.06, 0), V(0.145, top - beard, 0), V(0.12, top - beard - 0.02, 0)];
  b.add(P.polish, sweep(edge, () => [0.004, 0.0105], { segs: 8 }));
  b.add(P.metal, lathe([[0.022, -0.05], [0.025, -0.04], [0.025, 0.04], [0.022, 0.05]], 14), tf(-0.002, top, 0));
  // A back spike for the rarer ones.
  if (P.rarity !== 'common') b.add(P.polish, new THREE.ConeGeometry(0.012, 0.07, 4), tf(-0.055, top, 0, 0, 0, Math.PI / 2));
  for (const z of [1, -1]) b.add(P.metal, new THREE.BoxGeometry(0.012, 0.12, 0.003), tf(-0.002, top - 0.1, z * 0.018));
  for (const [x, y] of [[0.005, top + 0.01], [0.05, top - 0.005]]) for (const z of [1, -1]) b.add(P.polish, new THREE.SphereGeometry(0.004, 8, 6), tf(x, y, z * 0.009));
  if (P.gem) b.add(P.gem, new THREE.OctahedronGeometry(0.011, 0), tf(0.07, top + 0.01, 0, 0, 0, 0, V(1, 1, 0.9)));
  return b.group('axe');
}

function mace(P) {
  const b = new Build();
  const shaft = [V(0, -0.14, 0), V(0, 0.46, 0)];
  b.add(P.metal, sweep(shaft, () => 0.014, { segs: 12 }));
  grip(b, P, { y0: -0.12, y1: 0.06, r: 0.017, swell: 0.06 });
  pommel(b, P, 'ball', -0.12, 0.8);
  for (const y of [0.15, 0.3]) b.add(P.trim, new THREE.TorusGeometry(0.0155, 0.004, 6, 16), tf(0, y, 0, Math.PI / 2));
  // The head: a core and seven flanges with bevelled, honed edges.
  const y0 = 0.46;
  b.add(P.metal, lathe([[0.016, y0 - 0.03], [0.03, y0], [0.034, y0 + 0.06], [0.026, y0 + 0.12], [0.012, y0 + 0.15], [0.001, y0 + 0.16]], 18));
  const flange = [[0, 0], [0.05, 0.02], [0.062, 0.07], [0.05, 0.12], [0, 0.15]];
  const fl = plate(flange, 0.008, 0.003, 4);
  const n = 7;
  for (let i = 0; i < n; i++) b.add(P.engraved, fl, tf(0, y0 - 0.01, 0, 0, (i / n) * Math.PI * 2, 0));
  b.add(P.polish, new THREE.ConeGeometry(0.014, 0.05, 8), tf(0, y0 + 0.18, 0));
  if (P.gem) b.add(P.gem, new THREE.OctahedronGeometry(0.014, 1), tf(0, y0 + 0.155, 0));
  return b.group('mace');
}

function spear(P) {
  const b = new Build();
  const haft = [V(0, -0.62, 0), V(0, 1.22, 0)];
  b.add(P.wood, sweep(haft, (t) => 0.0175 - t * 0.003, { segs: 12 }));
  grip(b, P, { y0: -0.12, y1: 0.12, r: 0.0185, swell: 0.03 });
  b.add(P.trim, new THREE.CylinderGeometry(0.02, 0.018, 0.05, 12), tf(0, -0.63, 0));
  // Socket, wings, and a leaf blade.
  b.add(P.metal, lathe([[0.019, 1.2], [0.021, 1.24], [0.014, 1.33], [0.01, 1.35]], 14));
  for (const s of [-1, 1]) b.add(P.engraved, plate([[0, 0], [0.05, 0.012], [0.054, 0.024], [0.01, 0.03]], 0.006, 0.002, 2), tf(s * 0.012, 1.25, 0, 0, s > 0 ? 0 : Math.PI, 0));
  addBlade(b, P, { len: 0.34, w: 0.026, taper: 0.1, tip: 0.2, thick: 0.006, leaf: 0.35, bevel: 0.42, fuller: null, ridge: 0.7 }, 1.34);
  for (let i = 0; i < 3; i++) b.add(P.cloth, new THREE.PlaneGeometry(0.02, 0.16), tf(0.01 + i * 0.006, 1.16, 0.01, 0, 0.4 * i, 0.15));
  return b.group('spear');
}

function bow(P, long = false) {
  const b = new Build();
  const H = long ? 0.86 : 0.66;
  // Limbs: from the riser out and back (recurve: the tips turn away from the archer, toward +x).
  const limb = (s) => {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const y = s * (0.07 + t * (H - 0.07));
      const bend = long ? -0.11 * t * t : -0.12 * t * t + 0.14 * Math.max(0, t - 0.78) ** 2 * 18;
      pts.push(V(bend, y, 0));
    }
    return pts;
  };
  for (const s of [1, -1]) {
    b.add(long ? P.wood : P.darkwood, sweep(limb(s), (t) => [0.016 * (1 - t * 0.62), 0.011 * (1 - t * 0.5)], { segs: 10 }));
    // Horn nocks at the tips.
    const tip = limb(s)[18];
    b.add(P.trim, new THREE.ConeGeometry(0.008, 0.035, 8), tf(tip.x, tip.y + s * 0.014, 0, s > 0 ? 0 : Math.PI, 0, 0));
  }
  // The riser and its wrapped grip; an arrow shelf.
  b.add(P.darkwood, sweep([V(0.004, -0.12, 0), V(-0.004, 0, 0), V(0.004, 0.12, 0)], (t) => [0.02, 0.016 + Math.sin(t * Math.PI) * 0.004], { segs: 12 }));
  grip(b, P, { y0: -0.055, y1: 0.055, r: 0.021, swell: 0.05 });
  b.add(P.leather, new THREE.BoxGeometry(0.012, 0.008, 0.01), tf(-0.022, 0.062, 0));
  // Bands, and a gem in the riser for the rarer ones.
  for (const y of [0.08, -0.08]) b.add(P.trim, new THREE.TorusGeometry(0.018, 0.003, 6, 16), tf(0, y, 0, Math.PI / 2));
  if (P.gem) b.add(P.gem, new THREE.OctahedronGeometry(0.011, 1), tf(0.02, 0.1, 0));
  // The string, nock to nock, on the archer's side.
  const top = limb(1)[18];
  const bot = limb(-1)[18];
  const sx = Math.min(top.x, bot.x) - 0.004;
  b.add(gearMaterial('default', '#e8e0c8', { rough: 0.7 }), sweep([V(top.x - 0.004, top.y, 0), V(sx - 0.002, 0, 0), V(bot.x - 0.004, bot.y, 0)], () => 0.0018, { segs: 5 }));
  if (P.glow) for (const s of [1, -1]) b.add(P.glow, sweep(limb(s).slice(3, 15).map((p) => p.clone().add(V(0.009, 0, 0))), () => 0.0016, { segs: 4 }));
  return b.group(long ? 'longbow' : 'bow');
}

function staff(P) {
  const b = new Build();
  const r = rng(P.seed);
  // A gnarled shaft of root-wood.
  const pts = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    pts.push(V(Math.sin(t * 9 + 1) * 0.008 + (r() - 0.5) * 0.004, -0.72 + t * 1.72, Math.cos(t * 7) * 0.007));
  }
  b.add(P.darkwood, sweep(pts, (t, i) => 0.017 + Math.sin(i * 1.7) * 0.0025 + (t > 0.9 ? (t - 0.9) * 0.12 : 0), { segs: 10 }));
  grip(b, P, { y0: -0.08, y1: 0.12, r: 0.019, swell: 0.04 });
  b.add(P.trim, new THREE.ConeGeometry(0.02, 0.05, 10), tf(0, -0.74, 0, Math.PI, 0, 0));
  // The head: roots that twist up round a crystal.
  const top = 1.0;
  const crystal = P.gem ? P.gem : gearMaterial('gem', '#9ad8ff', { glow: '#9ad8ff', glowK: 0.5 });
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2;
    const root = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const a = a0 + t * 1.6;
      const rad = 0.02 + Math.sin(t * Math.PI) * 0.055;
      root.push(V(Math.cos(a) * rad, top + t * 0.24, Math.sin(a) * rad));
    }
    b.add(P.darkwood, sweep(root, (t) => 0.011 * (1 - t * 0.75), { segs: 8 }));
  }
  b.add(crystal, new THREE.OctahedronGeometry(0.04, 0), tf(0, top + 0.13, 0, 0, 0.4, 0, V(0.85, 1.9, 0.85)));
  b.add(P.trim, new THREE.TorusGeometry(0.024, 0.005, 8, 18), tf(0, top - 0.005, 0, Math.PI / 2));
  b.add(P.trim, new THREE.TorusGeometry(0.02, 0.004, 8, 18), tf(0, top - 0.05, 0, Math.PI / 2));
  // A few leaves still on the wood.
  for (let i = 0; i < 4; i++) b.add(gearMaterial('paint', '#5a7a3a', { side: THREE.DoubleSide }), new THREE.CircleGeometry(0.018, 6), tf(0.02, top - 0.12 - i * 0.04, 0.01, 0.4, i * 1.7, 0.8, V(0.6, 1.3, 1)));
  return b.group('staff');
}

function wand(P) {
  const b = new Build();
  const prof = [[0.001, -0.09], [0.012, -0.088], [0.015, -0.07], [0.013, -0.05], [0.015, -0.03], [0.012, 0.0], [0.011, 0.04], [0.009, 0.15], [0.007, 0.26], [0.009, 0.27], [0.001, 0.275]];
  b.add(P.darkwood, lathe(prof, 14));
  for (const y of [-0.06, -0.02, 0.05]) b.add(P.trim, new THREE.TorusGeometry(0.013, 0.003, 6, 16), tf(0, y, 0, Math.PI / 2));
  b.add(P.trim, lathe([[0.006, 0.26], [0.014, 0.275], [0.012, 0.29], [0.004, 0.292]], 10));
  for (let k = 0; k < 3; k++) b.add(P.trim, new THREE.ConeGeometry(0.003, 0.03, 4), tf(Math.cos(k * 2.1) * 0.01, 0.3, Math.sin(k * 2.1) * 0.01, Math.sin(k * 2.1) * 0.3, 0, -Math.cos(k * 2.1) * 0.3));
  const crystal = P.gem ?? gearMaterial('gem', '#c0a0ff', { glow: '#c0a0ff', glowK: 0.4 });
  b.add(crystal, new THREE.OctahedronGeometry(0.018, 0), tf(0, 0.31, 0, 0, 0.3, 0, V(0.8, 1.7, 0.8)));
  return b.group('wand');
}

/* ------------------------------------------------------------------ shields and off-hands */

/** Bend a shield's points back at the sides (a cylinder's curve). */
const bend = (g, k) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - k * p.getX(i) ** 2);
  g.computeVertexNormals();
  return g;
};

function shield(P, kind) {
  const b = new Build();
  let outline;
  let bendK = 1.2;
  if (kind === 'kite') {
    outline = [];
    for (let i = 0; i <= 10; i++) outline.push([-0.25 + i * 0.05, 0.4 + Math.sin((i / 10) * Math.PI) * 0.035]);
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      outline.push([0.25 * Math.cos(t * Math.PI / 2) ** 0.7 * (1 - t * 0.15), 0.4 - t * 0.95]);
    }
    for (let i = 11; i >= 1; i--) {
      const t = i / 12;
      outline.push([-0.25 * Math.cos(t * Math.PI / 2) ** 0.7 * (1 - t * 0.15), 0.4 - t * 0.95]);
    }
  } else if (kind === 'heater') {
    outline = [[-0.24, 0.32], [0.24, 0.32]];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      outline.push([0.24 * Math.cos(t * Math.PI / 2) ** 0.8, 0.32 - t * 0.72]);
    }
    for (let i = 11; i >= 1; i--) {
      const t = i / 12;
      outline.push([-0.24 * Math.cos(t * Math.PI / 2) ** 0.8, 0.32 - t * 0.72]);
    }
  } else {
    outline = [];
    for (let i = 0; i < 40; i++) outline.push([Math.cos((i / 40) * Math.PI * 2) * 0.24, Math.sin((i / 40) * Math.PI * 2) * 0.24]);
    bendK = 1.6;
  }
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const face = new THREE.ShapeGeometry(shape, 12);
  // Subdivide the flat face so the bend reads: rebuild it as a grid clipped to the outline.
  const fp = face.attributes.position;
  const uv = face.attributes.uv;
  for (let i = 0; i < fp.count; i++) uv.setXY(i, (fp.getX(i) - x0) / (x1 - x0), (fp.getY(i) - y0) / (y1 - y0));
  const dense = tessellate(face, 4);
  const domed = kind === 'buckler';
  const shapeZ = (x, y) => -bendK * x * x * 0.55 - (domed ? 1.4 * (x * x + y * y) : 0);
  const pz = dense.attributes.position;
  for (let i = 0; i < pz.count; i++) pz.setZ(i, 0.012 + shapeZ(pz.getX(i), pz.getY(i)));
  dense.computeVertexNormals();
  const field = P.metal && kind !== 'buckler' ? heraldryMaterial(P.seed, { field: P.cloth?.color ? `#${P.cloth.color.getHexString()}` : null }) : null;
  b.add(field ?? gearMaterial('paint', P.cloth?.color ? `#${P.cloth.color.getHexString()}` : '#6a2020'), dense);
  // The back: planks, behind.
  const back = dense.clone();
  const bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) - 0.024);
  flipWinding(back);
  back.computeVertexNormals();
  b.add(P.darkwood, back);
  // The rim, bent to match, and rivets round it.
  const rimPts = smoothOutline(outline, 3).map(([x, y]) => V(x, y, shapeZ(x, y)));
  b.add(P.rarity === 'common' ? P.metal : P.engraved, sweep(rimPts, () => [0.015, 0.011], { segs: 8, closed: true }));
  const per = Math.max(10, Math.round(rimPts.length / 3));
  for (let i = 0; i < per; i++) {
    const p = rimPts[Math.floor((i / per) * rimPts.length)];
    const inward = V(-p.x, -p.y, 0).normalize().multiplyScalar(0.03);
    b.add(P.polish, new THREE.SphereGeometry(0.0055, 8, 6), tf(p.x + inward.x, p.y + inward.y, shapeZ(p.x + inward.x, p.y + inward.y) + 0.013));
  }
  if (domed) {
    // A buckler's boss and rings.
    b.add(P.polish, lathe([[0.07, 0], [0.068, 0.012], [0.05, 0.03], [0.025, 0.045], [0.001, 0.05]], 24), tf(0, 0, 0.012, Math.PI / 2));
    for (const rr of [0.12, 0.18]) {
      const ring = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        ring.push(V(x, y, shapeZ(x, y) + 0.014));
      }
      b.add(P.trim, sweep(ring, () => 0.004, { segs: 6, closed: true }));
    }
  } else {
    // A small boss at the grip, and for rarer shields a gem.
    b.add(P.trim, lathe([[0.045, 0], [0.04, 0.012], [0.02, 0.022], [0.001, 0.025]], 20), tf(0, 0.0, 0.012, Math.PI / 2));
    if (P.gem) b.add(P.gem, new THREE.SphereGeometry(0.016, 14, 10), tf(0, 0, 0.038, 0, 0, 0, V(1, 1, 0.6)));
  }
  // The grip and arm strap behind.
  b.add(P.leather, new THREE.BoxGeometry(0.03, 0.12, 0.014), tf(0, 0, -0.03));
  b.add(P.leather, new THREE.BoxGeometry(0.16, 0.035, 0.008), tf(0, 0.12, -0.026));
  return b.group(kind);
}

/** Split each triangle into 4^levels (so a flat face can bend smoothly). */
function tessellate(geo, levels = 3) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (let l = 0; l < levels; l++) {
    const p = g.attributes.position;
    const u = g.attributes.uv;
    const P = [];
    const U = [];
    const get = (i) => [V(p.getX(i), p.getY(i), p.getZ(i)), new THREE.Vector2(u.getX(i), u.getY(i))];
    for (let i = 0; i < p.count; i += 3) {
      const [a, ua] = get(i);
      const [b, ub] = get(i + 1);
      const [c, uc] = get(i + 2);
      const ab = a.clone().add(b).multiplyScalar(0.5);
      const bc = b.clone().add(c).multiplyScalar(0.5);
      const ca = c.clone().add(a).multiplyScalar(0.5);
      const uab = ua.clone().add(ub).multiplyScalar(0.5);
      const ubc = ub.clone().add(uc).multiplyScalar(0.5);
      const uca = uc.clone().add(ua).multiplyScalar(0.5);
      for (const [x, y, z, ux, uy, uz] of [[a, ab, ca, ua, uab, uca], [ab, b, bc, uab, ub, ubc], [ca, bc, c, uca, ubc, uc], [ab, bc, ca, uab, ubc, uca]]) {
        P.push(x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z);
        U.push(ux.x, ux.y, uy.x, uy.y, uz.x, uz.y);
      }
    }
    g.dispose();
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  }
  g.computeVertexNormals();
  return g;
}

function flipWinding(g) {
  const p = g.attributes.position;
  const u = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, u].filter(Boolean)) {
      const n = a.itemSize;
      for (let k = 0; k < n; k++) {
        const t = a.array[(i + 1) * n + k];
        a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k];
        a.array[(i + 2) * n + k] = t;
      }
    }
  }
}

function tome(P) {
  const b = new Build();
  b.add(P.leather, new THREE.BoxGeometry(0.17, 0.23, 0.012), tf(0, 0, 0.024));
  b.add(P.leather, new THREE.BoxGeometry(0.17, 0.23, 0.012), tf(0, 0, -0.024));
  b.add(P.leather, new THREE.CylinderGeometry(0.03, 0.03, 0.23, 12, 1, false, Math.PI, Math.PI), tf(-0.083, 0, 0));
  b.add(gearMaterial('paint', '#e8dcc0', { rough: 0.9 }), new THREE.BoxGeometry(0.155, 0.215, 0.038), tf(0.004, 0, 0));
  for (const [x, y] of [[0.075, 0.105], [0.075, -0.105], [-0.075, 0.105], [-0.075, -0.105]]) for (const z of [0.031, -0.031]) b.add(P.trim, new THREE.BoxGeometry(0.03, 0.03, 0.004), tf(x, y, z, 0, 0, Math.PI / 4));
  b.add(P.trim, new THREE.BoxGeometry(0.03, 0.022, 0.07), tf(0.087, 0, 0));
  b.add(P.engraved, new THREE.TorusGeometry(0.035, 0.004, 8, 24), tf(0, 0.01, 0.031));
  b.add(P.gem ?? P.trim, new THREE.OctahedronGeometry(0.016, 0), tf(0, 0.01, 0.034, 0, 0, 0, V(1, 1.3, 0.5)));
  if (P.glow) b.add(P.glow, new THREE.TorusGeometry(0.05, 0.0016, 4, 32), tf(0, 0.01, 0.0312));
  return b.group('tome');
}

function orb(P) {
  const b = new Build();
  const c = P.gem ?? gearMaterial('gem', '#8ab8ff', { glow: '#8ab8ff', glowK: 0.5 });
  b.add(c, new THREE.SphereGeometry(0.06, 24, 18), tf(0, 0.11, 0));
  b.add(P.darkwood, lathe([[0.001, -0.05], [0.016, -0.045], [0.014, 0.0], [0.02, 0.04], [0.03, 0.06], [0.001, 0.062]], 14));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const claw = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const rad = 0.03 + Math.sin(t * Math.PI * 0.8) * 0.04;
      claw.push(V(Math.cos(a) * rad, 0.055 + t * 0.1, Math.sin(a) * rad));
    }
    b.add(P.trim, sweep(claw, (t) => 0.006 * (1 - t * 0.7), { segs: 6 }));
  }
  return b.group('orb');
}

function quiver(P) {
  const b = new Build();
  b.add(P.leather, lathe([[0.001, -0.3], [0.04, -0.3], [0.045, -0.26], [0.05, 0.0], [0.055, 0.2], [0.05, 0.21], [0.045, 0.21]], 18));
  for (const y of [-0.24, 0.17]) b.add(P.trim, new THREE.TorusGeometry(0.05, 0.004, 6, 20), tf(0, y, 0, Math.PI / 2));
  b.add(P.leather, new THREE.BoxGeometry(0.02, 0.5, 0.006), tf(0.05, -0.04, 0));
  const shaft = gearMaterial('wood', '#b08a5a');
  const fletch = gearMaterial('paint', '#e8e0d0', { side: THREE.DoubleSide });
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    const rr = 0.025 * Math.sqrt((k + 1) / 9);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const h = 0.26 + (k % 3) * 0.02;
    b.add(shaft, new THREE.CylinderGeometry(0.0035, 0.0035, 0.3, 5), tf(x, h - 0.08, z));
    for (let f = 0; f < 3; f++) b.add(fletch, new THREE.PlaneGeometry(0.014, 0.07), tf(x + Math.cos(f * 2.1) * 0.006, h + 0.02, z + Math.sin(f * 2.1) * 0.006, 0, f * 2.1, 0));
  }
  return b.group('quiver');
}

/* ------------------------------------------------------------------ helmets (a head of radius 1) */

function helmet(P, kind) {
  const b = new Build(0.12);
  const r = rng(P.seed);
  const bandMat = P.rarity === 'common' ? P.metal : P.engraved;
  if (kind === 'greathelm') {
    const prof = [[1.08, -1.2], [1.14, -0.9], [1.16, -0.2], [1.14, 0.45], [1.1, 0.75], [0.95, 0.95], [0.6, 1.08], [0.001, 1.12]];
    const g = lathe(prof, 32);
    // Flatten the face a little, as a great helm's front plate.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) * 0.93);
    g.computeVertexNormals();
    b.add(P.metal, g);
    const shell = (y, a = 1.16) => V(0, y, a * 0.93 + 0.01);
    // Eye slits and breaths.
    for (const s of [-1, 1]) b.add(P.slit, new THREE.BoxGeometry(0.42, 0.07, 0.06), tf(s * 0.3, 0.1, 1.06, 0, s * 0.28, 0));
    for (let i = 0; i < 8; i++) b.add(P.slit, new THREE.CircleGeometry(0.03, 8), tf(0.24 + (i % 4) * 0.1, -0.35 - Math.floor(i / 4) * 0.12, 1.05 - (i % 4) * 0.035, 0, 0.3, 0));
    // A cross of reinforcing strips over the face, and a brow band round it.
    b.add(bandMat, new THREE.BoxGeometry(0.11, 1.05, 0.05), tf(0, -0.4, 1.085));
    const brow = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI * 0.62 + (i / 24) * Math.PI * 1.24;
      brow.push(V(Math.sin(a) * 1.17, 0.24, Math.cos(a) * 1.17 * (Math.cos(a) > 0 ? 0.94 : 1)));
    }
    b.add(bandMat, sweep(brow, () => [0.06, 0.035], { segs: 6 }));
    void shell;
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI * 0.6 + (i / 8) * Math.PI * 1.2;
      b.add(P.polish, new THREE.SphereGeometry(0.035, 8, 6), tf(Math.sin(a) * 1.2, 0.24, Math.cos(a) * 1.2 * (Math.cos(a) > 0 ? 0.94 : 1)));
    }
    crest(b, P, r, 1.12);
  } else if (kind === 'bascinet') {
    // A pointed skull, a houndskull visor, and a mail aventail.
    const prof = [[1.1, -0.45], [1.13, 0.0], [1.08, 0.5], [0.85, 0.95], [0.45, 1.3], [0.001, 1.5]];
    const g = lathe(prof, 32);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - Math.max(0, p.getY(i) - 0.6) * 0.18);
    g.computeVertexNormals();
    b.add(P.metal, g);
    const visor = new THREE.SphereGeometry(1.0, 28, 18, 0, Math.PI * 2, 0, Math.PI);
    const vp = visor.attributes.position;
    for (let i = 0; i < vp.count; i++) {
      const x = vp.getX(i);
      const y = vp.getY(i);
      let z = vp.getZ(i);
      if (z > 0) z = z * 1.05 + Math.max(0, z - 0.2) ** 2 * 1.2 * Math.max(0, 1 - Math.abs(y + 0.15) * 0.8);
      vp.setXYZ(i, x * 1.08, y * 0.62 - 0.12, z);
    }
    visor.computeVertexNormals();
    const front = new THREE.Group();
    void front;
    b.add(P.polish, visor, tf(0, 0, 0.04));
    for (const s of [-1, 1]) b.add(P.slit, new THREE.BoxGeometry(0.36, 0.055, 0.12), tf(s * 0.3, 0.08, 1.03, 0, s * 0.42, 0));
    for (let i = 0; i < 10; i++) b.add(P.slit, new THREE.CircleGeometry(0.028, 8), tf(-0.3 + (i % 5) * 0.15, -0.3 - Math.floor(i / 5) * 0.12, 1.3 - Math.abs(-0.3 + (i % 5) * 0.15) * 0.4, 0, 0, 0));
    for (const s of [-1, 1]) b.add(P.trim, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), tf(s * 1.1, 0.05, 0.1, 0, 0, Math.PI / 2));
    b.add(P.mail, lathe([[1.12, -0.42], [1.25, -0.9], [1.6, -1.35], [1.75, -1.5]], 28, Math.PI * 0.15, Math.PI * 1.7), tf(0, 0, 0, 0, Math.PI, 0));
  } else if (kind === 'nasal') {
    const prof = [[1.1, -0.15], [1.12, 0.05], [1.08, 0.45], [0.88, 0.85], [0.5, 1.12], [0.001, 1.2]];
    b.add(P.metal, lathe(prof, 32));
    const band = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      band.push(V(Math.sin(a) * 1.14, -0.05, Math.cos(a) * 1.14));
    }
    b.add(bandMat, sweep(band, () => [0.08, 0.04], { segs: 6, closed: true }));
    b.add(bandMat, new THREE.BoxGeometry(0.12, 0.55, 0.05), tf(0, -0.3, 1.13, -0.12, 0, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      b.add(bandMat, sweep([V(Math.sin(a) * 1.12, 0, Math.cos(a) * 1.12), V(Math.sin(a) * 0.9, 0.85, Math.cos(a) * 0.9), V(0, 1.21, 0)], () => [0.05, 0.03], { segs: 5 }));
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.add(P.polish, new THREE.SphereGeometry(0.035, 8, 6), tf(Math.sin(a) * 1.18, -0.05, Math.cos(a) * 1.18));
    }
    if (P.rarity !== 'common') for (const s of [-1, 1]) b.add(P.metal, lathe([[1.08, 0], [1.1, -0.5], [1.02, -0.85]], 10, s > 0 ? Math.PI * 0.18 : Math.PI * 1.58, Math.PI * 0.26));
    if (P.rarity === 'epic' || P.rarity === 'legendary') for (const s of [-1, 1]) b.add(P.trim, sweep([V(s * 1.0, 0.4, 0.2), V(s * 1.5, 0.7, 0), V(s * 1.7, 1.3, -0.2)], (t) => 0.1 * (1 - t), { segs: 8 }));
  } else if (kind === 'hood') {
    // A cowl: a shell round the head with the face open, a point at the back, draping to the shoulders.
    const g = new THREE.SphereGeometry(1.22, 32, 20, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);
      if (y < -0.2) {
        const k = (-0.2 - y) / 1.0;
        x *= 1 + k * 0.9;
        z *= 1 + k * 0.6;
        y -= k * 0.5;
      }
      if (z < 0 && y > 0.2) z -= (y - 0.2) * 0.35 * Math.max(0, -z);
      p.setXYZ(i, x, y + 0.08, z - 0.04);
    }
    g.computeVertexNormals();
    b.add(P.cloth, g);
    // A turned-back edge framing the face.
    const hem = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const th = t * Math.PI * 0.8;
      const side = t < 0.5 ? -1 : 1;
      void side;
      const phi = Math.PI * 0.82;
      const R = 1.22;
      hem.push(V(-Math.cos(phi) * Math.sin(th) * R, Math.cos(th) * R + 0.08, Math.sin(phi) * Math.sin(th) * R - 0.04));
    }
    b.add(P.cloth, sweep(hem, () => 0.06, { segs: 6 }));
    b.add(P.cloth, sweep(hem.map((v) => V(-v.x, v.y, v.z)), () => 0.06, { segs: 6 }));
  } else if (kind === 'circlet') {
    const ring = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ring.push(V(Math.sin(a) * 1.07, 0.3 + Math.max(0, Math.cos(a)) * 0.06, Math.cos(a) * 1.1));
    }
    b.add(P.trim, sweep(ring, () => [0.05, 0.022], { segs: 6, closed: true }));
    for (const s of [-1, 1]) b.add(P.trim, sweep([V(s * 0.1, 0.38, 1.12), V(s * 0.32, 0.55, 1.05), V(s * 0.5, 0.46, 0.98)], (t) => 0.035 * (1 - t), { segs: 6 }));
    b.add(P.gem ?? gearMaterial('gem', '#9ae0ff', { glowK: 0.5 }), new THREE.OctahedronGeometry(0.12, 0), tf(0, 0.42, 1.14, 0, 0, 0, V(0.8, 1.2, 0.5)));
  }
  return b.group(kind);
}

/** A great helm's crest: a fan of horsehair in the cloth's colour, or a torse and gilt crown for the best. */
function crest(b, P, r, top) {
  if (P.rarity === 'common') return;
  const hair = gearMaterial('cloth', `#${P.cloth.color.getHexString()}`, { side: THREE.DoubleSide, rough: 0.8 });
  const n = P.rarity === 'uncommon' ? 9 : 16;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z0 = 0.5 - t * 1.0;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const s = k / 8;
      pts.push(V((r() - 0.5) * 0.08, top + 0.05 + Math.sin(s * Math.PI * 0.6) * 0.7 - s * s * (0.4 + t * 0.8), z0 - s * (0.6 + t * 0.7)));
    }
    b.add(hair, sweep(pts, (s) => [0.07 * (1 - s * 0.7), 0.025 * (1 - s * 0.5)], { segs: 5 }));
  }
  b.add(P.trim, sweep([V(0, top - 0.02, 0.55), V(0, top + 0.06, 0), V(0, top - 0.02, -0.55)], () => [0.06, 0.12], { segs: 6 }));
  if (P.rarity === 'legendary') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.add(P.trim, new THREE.ConeGeometry(0.08, 0.26, 4), tf(Math.sin(a) * 0.95, 0.95, Math.cos(a) * 0.95));
    }
  }
}

/* ------------------------------------------------------------------ armour pieces (for gearRig) */

/** A shoulder: layered lames over the joint, the arm along +x, up +y. `s` is the shoulder's radius. */
export function pauldron(P, heavy = true, s = 0.07) {
  const b = new Build();
  const mat = heavy ? P.shell : P.shellLeather;
  const rim = heavy ? P.polish : P.trim;
  const lames = heavy ? 4 : 2;
  for (let i = lames - 1; i >= 0; i--) {
    // Each lame a shallow dome, tilted further down the arm, the first the largest.
    const R = s * (i === 0 ? 1.45 : 1.32 - i * 0.08);
    const th = Math.PI * 0.32;
    const g = new THREE.SphereGeometry(R, 28, 8, 0, Math.PI * 2, 0, th);
    const m = tf(s * (0.05 + i * 0.4), s * (0.3 - i * 0.24) - R * Math.cos(th) * 0.55, 0, 0, 0, -(0.45 + i * 0.3), V(1, 0.58, 1.15));
    b.add(mat, g, m);
    const ring = new THREE.TorusGeometry(R * Math.sin(th), s * 0.05, 6, 32);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, R * Math.cos(th), 0);
    b.add(rim, ring, m);
    const rivets = heavy ? 6 : 4;
    for (let k = 0; k < rivets; k++) {
      const a = (k / rivets) * Math.PI * 2 + 0.3;
      const p = V(Math.cos(a) * R * Math.sin(th) * 0.9, R * Math.cos(th) + s * 0.03, Math.sin(a) * R * Math.sin(th) * 0.9).applyMatrix4(m);
      b.add(heavy ? P.polish : P.trim, new THREE.SphereGeometry(s * 0.06, 8, 6), tf(p.x, p.y, p.z));
    }
  }
  if (P.gem && heavy) b.add(P.gem, new THREE.SphereGeometry(s * 0.16, 12, 10), tf(s * 0.32, s * 0.48, 0, 0, 0, -0.45, V(1, 0.55, 1)));
  if (P.rarity === 'legendary' && heavy) for (let i = 0; i < 3; i++) b.add(P.trim, new THREE.ConeGeometry(s * 0.12, s * 0.7, 6), tf(s * (-0.3 + i * 0.3), s * 1.25, -s * 0.4, -0.4, 0, -0.3));
  return b.group('pauldron');
}

/** A cuff round a limb along +x from x0 to x1 (radius r0 → r1): a gauntlet's flare or a bracer. */
export function cuff(P, kind, { x0, x1, r0, r1 }) {
  const b = new Build();
  if (kind === 'gauntlets') {
    const g = lathe([[r0 * 1.05, 0], [r0 * 1.12, (x1 - x0) * 0.4], [r1 * 1.4, x1 - x0]], 20);
    b.add(P.rarity === 'common' ? P.metal : P.engraved, g, tf(x0, 0, 0, 0, 0, -Math.PI / 2));
    b.add(P.polish, new THREE.TorusGeometry(r1 * 1.4, r1 * 0.12, 6, 22), tf(x1, 0, 0, 0, Math.PI / 2, 0));
    if (P.gem) b.add(P.gem, new THREE.SphereGeometry(r1 * 0.3, 10, 8), tf((x0 + x1) / 2, r1 * 1.25, 0, 0, 0, 0, V(1, 0.5, 1)));
  } else if (kind === 'bracers') {
    const g = lathe([[r0 * 1.1, 0], [r0 * 1.15, (x1 - x0) * 0.5], [r1 * 1.18, x1 - x0]], 18);
    b.add(P.leather, g, tf(x0, 0, 0, 0, 0, -Math.PI / 2));
    for (let i = 0; i < 4; i++) b.add(P.trim, new THREE.SphereGeometry(r1 * 0.12, 6, 5), tf(x0 + (x1 - x0) * (0.2 + i * 0.2), r1 * 1.18, 0));
    for (const t of [0.05, 0.95]) b.add(P.trim, new THREE.TorusGeometry(r0 + (r1 - r0) * t, r0 * 0.08, 5, 18), tf(x0 + (x1 - x0) * t, 0, 0, 0, Math.PI / 2, 0, V(1.17, 1.17, 1)));
  } else {
    b.add(P.cloth, new THREE.TorusGeometry(r1 * 1.05, r1 * 0.22, 6, 18), tf(x1, 0, 0, 0, Math.PI / 2, 0));
  }
  return b.group('cuff');
}

/** A knee: a cop over the joint (front +z), a side wing, and a plate up the thigh. Leg along −y. */
export function knee(P, heavy, r = 0.06) {
  const b = new Build();
  const mat = heavy ? (P.rarity === 'common' ? P.metal : P.engraved) : P.leather;
  const cop = new THREE.SphereGeometry(r * 1.25, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  cop.rotateX(Math.PI / 2);
  b.add(mat, cop, tf(0, 0, r * 0.35));
  if (heavy) {
    b.add(P.polish, new THREE.SphereGeometry(r * 0.12, 8, 6), tf(0, 0, r * 1.62));
    const wing = new THREE.CircleGeometry(r * 0.75, 16);
    b.add(mat, wing, tf(r * 1.0, 0, r * 0.45, 0, Math.PI / 2 - 0.3, 0, V(1, 1.3, 1)));
    if (P.gem) b.add(P.gem, new THREE.SphereGeometry(r * 0.22, 10, 8), tf(0, 0, r * 1.62));
  } else {
    for (const a of [-0.6, 0, 0.6]) b.add(P.trim, new THREE.SphereGeometry(r * 0.1, 6, 5), tf(Math.sin(a) * r * 1.2, 0, Math.cos(a) * r * 1.3));
  }
  return b.group('knee');
}

/** A cuisse: a plate down the front of the thigh (radius r, the thigh's length), hip at the origin, leg along −y. */
export function cuisse(P, r, len) {
  const b = new Build();
  const mat = P.rarity === 'common' ? P.shell : P.shell;
  const g = new THREE.CylinderGeometry(r * 1.12, r * 1.02, len * 0.62, 18, 3, true, -Math.PI * 0.42, Math.PI * 0.84);
  b.add(mat, g, tf(0, -len * 0.55, r * 0.06));
  for (const y of [-len * 0.24, -len * 0.86]) b.add(P.polish, new THREE.TorusGeometry(y > -len * 0.5 ? r * 1.12 : r * 1.02, r * 0.06, 5, 16, Math.PI * 0.84), tf(0, y, r * 0.06, Math.PI / 2, 0, Math.PI * 0.08));
  return b.group('cuisse');
}

/** A foot: sabaton lames from the ankle to the toes (+z), or a boot's turned-down cuff. */
export function foot(P, heavy, { len = 0.2, w = 0.05, h = 0.07 } = {}) {
  const b = new Build();
  if (heavy) {
    const mat = P.rarity === 'common' ? P.metal : P.engraved;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const g = new THREE.CylinderGeometry(w * 1.2, w * 1.2, len / n + 0.012, 16, 1, true, -Math.PI / 2, Math.PI);
      g.rotateX(Math.PI / 2);
      g.rotateZ(Math.PI / 2);
      g.scale(1, (h * (1.1 - t * 0.5)) / (w * 1.2), 1);
      b.add(mat, g, tf(0, -h * 0.25 - t * h * 0.35, len * (0.05 + t * 0.85)));
    }
    b.add(P.polish, new THREE.SphereGeometry(w * 1.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), tf(0, -h * 0.7, len * 0.92, Math.PI / 2, 0, 0, V(0.95, 0.55, 0.5)));
  } else {
    b.add(P.leather, new THREE.CylinderGeometry(w * 1.55, w * 1.35, h * 0.9, 16, 1, true), tf(0, h * 1.6, 0));
    b.add(P.trim, new THREE.TorusGeometry(w * 1.55, w * 0.07, 5, 16), tf(0, h * 2.05, 0, Math.PI / 2));
  }
  return b.group('foot');
}

/** A gorget: a collar of plate round the neck (radius r), worn with heavy chests. */
export function gorget(P, r = 0.075) {
  const b = new Build();
  b.add(P.rarity === 'common' ? P.metal : P.engraved, lathe([[r * 1.55, -r * 0.5], [r * 1.35, 0], [r * 1.12, r * 0.55], [r * 1.08, r * 0.7]], 24));
  b.add(P.polish, new THREE.TorusGeometry(r * 1.1, r * 0.06, 5, 24), tf(0, r * 0.7, 0, Math.PI / 2));
  b.add(P.polish, new THREE.TorusGeometry(r * 1.55, r * 0.06, 5, 24), tf(0, -r * 0.5, 0, Math.PI / 2));
  return b.group('gorget');
}

/* ------------------------------------------------------------------ trinkets */

function trinket(P, kind) {
  const b = new Build();
  const gem = P.gem ?? gearMaterial('gem', '#c83a3a', { glowK: 0.3 });
  if (kind === 'ring') {
    b.add(P.trim, new THREE.TorusGeometry(0.1, 0.022, 12, 40));
    b.add(P.engraved, new THREE.CylinderGeometry(0.045, 0.05, 0.03, 16), tf(0, 0.11, 0));
    b.add(gem, new THREE.OctahedronGeometry(0.04, 1), tf(0, 0.14, 0, 0, 0, 0, V(1, 0.7, 1)));
    for (let i = 0; i < 4; i++) b.add(P.polish, new THREE.ConeGeometry(0.008, 0.03, 4), tf(Math.cos(i * 1.57) * 0.04, 0.14, Math.sin(i * 1.57) * 0.04));
  } else if (kind === 'amulet') {
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 0.15 + (i / 17) * Math.PI * 0.7;
      b.add(P.trim, new THREE.TorusGeometry(0.012, 0.003, 5, 10), tf(Math.cos(a) * 0.16, 0.06 + Math.sin(a) * 0.16, 0, 0, i % 2 ? Math.PI / 2 : 0, a));
    }
    b.add(P.engraved, new THREE.CylinderGeometry(0.07, 0.07, 0.018, 24), tf(0, -0.06, 0, Math.PI / 2));
    b.add(P.polish, new THREE.TorusGeometry(0.07, 0.008, 6, 24), tf(0, -0.06, 0));
    b.add(gem, new THREE.SphereGeometry(0.035, 16, 12), tf(0, -0.06, 0.012, 0, 0, 0, V(1, 1, 0.6)));
  } else {
    b.add(P.wood, new THREE.CylinderGeometry(0.07, 0.07, 0.022, 7), tf(0, 0, 0, Math.PI / 2));
    b.add(P.leather, new THREE.TorusGeometry(0.075, 0.006, 5, 7), tf(0, 0, 0));
    for (let i = 0; i < 3; i++) b.add(gearMaterial('paint', '#5a8a3a', { side: THREE.DoubleSide }), new THREE.CircleGeometry(0.03, 5), tf(Math.cos(i * 2) * 0.05, -0.07 - i * 0.02, 0.01, 0, 0, i, V(0.6, 1.4, 1)));
    b.add(gem, new THREE.SphereGeometry(0.022, 10, 8), tf(0, 0, 0.012));
  }
  return b.group(kind);
}

/* ------------------------------------------------------------------ capes (for icons; the hero's cape is cloth, in gearRig) */

function capeIcon(P, kind) {
  const b = new Build();
  const g = new THREE.PlaneGeometry(0.6, 0.9, 12, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setXYZ(i, x * (1 + (0.45 - y) * 0.5), y, Math.sin(x * 14) * 0.03 - x * x * 0.4);
  }
  g.computeVertexNormals();
  b.add(heraldryMaterial(P.seed, { field: `#${P.cloth.color.getHexString()}`, cloth: true }), g);
  b.add(P.trim, new THREE.TorusGeometry(0.035, 0.01, 6, 16), tf(-0.24, 0.43, 0.02));
  b.add(P.trim, new THREE.TorusGeometry(0.035, 0.01, 6, 16), tf(0.24, 0.43, 0.02));
  if (kind === 'mantle') b.add(gearMaterial('cloth', '#d8cfc0', { rough: 1 }), sweep([V(-0.32, 0.45, 0), V(0, 0.5, 0.05), V(0.32, 0.45, 0)], () => [0.06, 0.05], { segs: 8 }));
  return b.group(kind);
}

/** An armour item shown alone (an icon, a loot drop): its pieces laid out. */
function armourDisplay(P, base) {
  const look = base.look;
  const g = new THREE.Group();
  if (base.slot === 'chest') {
    // A torso: broad chest, narrow waist, a skirt of lames or cloth; pauldrons and a gorget for the armoured ones.
    const b = new Build();
    const prof = [[0.15, -0.3], [0.145, -0.2], [0.16, -0.06], [0.195, 0.08], [0.2, 0.17], [0.16, 0.24], [0.085, 0.28], [0.07, 0.3]];
    const torso = lathe(prof, 32);
    torso.scale(1, 1, 0.68);
    const plate = look === 'plate';
    const mat = plate ? P.shell : look === 'robe' ? P.cloth : P.shellLeather;
    b.add(mat, torso);
    if (plate) {
      b.add(P.polish, sweep([V(0, -0.29, 0.1), V(0, -0.1, 0.115), V(0, 0.1, 0.14), V(0, 0.25, 0.1)], () => 0.007, { segs: 6 }));
      for (let i = 0; i < 3; i++) {
        const r0 = 0.155 + i * 0.012;
        b.add(P.shell, lathe([[r0, -0.3 - i * 0.05], [r0 + 0.012, -0.35 - i * 0.05]], 32), tf(0, 0, 0, 0, 0, 0, V(1, 1, 0.7)));
        b.add(P.polish, new THREE.TorusGeometry(r0 + 0.012, 0.004, 5, 32), tf(0, -0.35 - i * 0.05, 0, Math.PI / 2, 0, 0, V(1, 0.7, 1)));
      }
      if (P.gem) b.add(P.gem, new THREE.SphereGeometry(0.02, 12, 10), tf(0, 0.12, 0.14, 0, 0, 0, V(1, 1, 0.5)));
    } else if (look === 'brigandine') {
      for (let i = 0; i < 35; i++) {
        const a = -0.9 + (i % 7) * 0.3;
        const y = -0.22 + Math.floor(i / 7) * 0.1;
        const rr = 0.16 + Math.max(0, y) * 0.2;
        b.add(P.trim, new THREE.SphereGeometry(0.008, 6, 5), tf(Math.sin(a) * rr, y, Math.cos(a) * rr * 0.7));
      }
      b.add(P.cloth, lathe([[0.15, -0.3], [0.17, -0.42]], 32), tf(0, 0, 0, 0, 0, 0, V(1, 1, 0.7)));
    } else if (look === 'robe') {
      b.add(P.cloth, lathe([[0.15, -0.3], [0.2, -0.5], [0.26, -0.72], [0.27, -0.74]], 32), tf(0, 0, 0, 0, 0, 0, V(1, 1, 0.75)));
      b.add(P.trim, new THREE.TorusGeometry(0.15, 0.012, 6, 32), tf(0, -0.22, 0, Math.PI / 2, 0, 0, V(1, 0.68, 1)));
      b.add(P.trim, sweep([V(-0.07, 0.28, 0.06), V(0, 0.0, 0.13), V(0.07, 0.28, 0.06)], () => 0.008, { segs: 6 }));
      if (P.glow) b.add(P.glow, new THREE.TorusGeometry(0.255, 0.003, 4, 48), tf(0, -0.7, 0, Math.PI / 2, 0, 0, V(1, 0.75, 1)));
    } else {
      b.add(P.trim, new THREE.TorusGeometry(0.15, 0.012, 6, 32), tf(0, -0.18, 0, Math.PI / 2, 0, 0, V(1, 0.68, 1)));
      for (let i = 0; i < 5; i++) b.add(P.trim, new THREE.BoxGeometry(0.02, 0.006, 0.01), tf(0.03, 0.18 - i * 0.07, 0.13));
      b.add(P.leather, lathe([[0.15, -0.3], [0.165, -0.4]], 32), tf(0, 0, 0, 0, 0, 0, V(1, 1, 0.7)));
    }
    g.add(b.group('chest'));
    if (look === 'plate' || look === 'brigandine' || look === 'jerkin') {
      for (const s of look === 'jerkin' ? [1] : [-1, 1]) {
        const pd = pauldron(P, look === 'plate', 0.07);
        pd.position.set(s * 0.17, 0.2, 0);
        pd.scale.set(s, 1, 1);
        g.add(pd);
      }
    }
    if (plate) {
      const go = gorget(P, 0.065);
      go.position.y = 0.28;
      go.scale.set(1, 1, 0.8);
      g.add(go);
    }
  } else if (base.slot === 'hands') {
    // One gauntlet (or glove), fingers together, the cuff flared.
    const b = new Build();
    const mat = look === 'gauntlets' ? P.shell : look === 'bracers' ? P.shellLeather : P.cloth;
    b.add(mat, new THREE.SphereGeometry(0.05, 18, 12), tf(0, 0.0, 0, 0, 0, 0, V(0.95, 1.05, 0.45)));
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < (look === 'gauntlets' ? 3 : 1); j++) {
        const geo = look === 'gauntlets' ? new THREE.CylinderGeometry(0.011, 0.012, 0.028, 10) : new THREE.CapsuleGeometry(0.011, 0.06, 4, 8);
        b.add(mat, geo, tf(-0.033 + k * 0.022, 0.06 + j * 0.03 + (look === 'gauntlets' ? 0 : 0.02) - Math.abs(k - 1.5) * 0.008, 0.004, 0.08 * j, 0, 0));
      }
    }
    b.add(mat, new THREE.CapsuleGeometry(0.012, 0.04, 4, 8), tf(0.055, 0.01, 0.01, 0, 0, -0.7));
    if (look === 'gauntlets') for (let k = 0; k < 3; k++) b.add(P.polish, new THREE.TorusGeometry(0.048 - k * 0.002, 0.003, 5, 20, Math.PI), tf(0, 0.03 - k * 0.022, 0.01, 0, 0, 0, V(1, 1, 0.5)));
    g.add(b.group('hand'));
    const c = cuff(P, look, { x0: 0, x1: 0.12, r0: 0.04, r1: 0.036 });
    c.rotation.z = Math.PI / 2;
    c.position.set(0, -0.17, 0);
    g.add(c);
  } else if (base.slot === 'legs') {
    for (const s of [-1, 1]) {
      const b = new Build();
      b.add(look === 'cuisses' ? P.mail : look === 'chausses' ? P.shellLeather : P.cloth, lathe([[0.055, -0.36], [0.062, -0.1], [0.075, 0.12], [0.085, 0.3]], 20));
      const leg = b.group('leg');
      leg.position.x = s * 0.1;
      g.add(leg);
      if (look !== 'leggings') {
        const k = knee(P, look === 'cuisses', 0.055);
        k.position.set(s * 0.1, -0.08, 0.03);
        g.add(k);
      }
    }
  } else if (base.slot === 'feet') {
    for (const s of [-1, 1]) {
      const b = new Build();
      const mat = look === 'sabatons' ? P.shell : look === 'boots' ? P.shellLeather : P.cloth;
      b.add(mat, lathe([[0.042, 0.0], [0.045, 0.1], [0.05, 0.2], [0.055, 0.22]], 18));
      const sole = new THREE.CapsuleGeometry(0.045, 0.1, 6, 14);
      sole.rotateX(Math.PI / 2);
      sole.scale(1, 0.62, 1);
      b.add(mat, sole, tf(0, -0.005, 0.05));
      b.add(look === 'slippers' ? P.cloth : P.leather, new THREE.BoxGeometry(0.085, 0.012, 0.2), tf(0, -0.03, 0.05));
      const f = b.group('boot');
      f.position.set(s * 0.075, 0, 0);
      g.add(f);
      if (look === 'sabatons') {
        const fp = foot(P, true, { len: 0.15, w: 0.046, h: 0.055 });
        fp.position.set(s * 0.075, 0.05, -0.005);
        g.add(fp);
      } else if (look === 'boots') {
        const fp = foot(P, false, { len: 0.15, w: 0.034, h: 0.08 });
        fp.position.set(s * 0.075, 0.0, 0);
        g.add(fp);
      }
    }
  }
  return g;
}

/* ------------------------------------------------------------------ any item */

const built = new Map();

/**
 * The model of an item, built once per look (base, metal, cloth, leather,
 * gem, seed, rarity) and cloned after. A THREE.Group.
 */
export function buildItem(item) {
  const base = BASES[item?.base];
  if (!base) return new THREE.Group();
  const l = item.look ?? {};
  const key = [item.base, item.rarity, l.metal, l.cloth, l.leather, l.gem, l.seed].join('|');
  if (!built.has(key)) built.set(key, makeItem(item, base));
  const g = built.get(key).clone();
  g.userData.item = item;
  return g;
}

function makeItem(item, base) {
  const P = palette(item);
  const look = base.look;
  switch (look) {
    case 'shortsword':
    case 'longsword':
    case 'greatsword':
      return sword(P, look);
    case 'dagger':
      return dagger(P);
    case 'axe':
      return axe(P);
    case 'mace':
      return mace(P);
    case 'spear':
      return spear(P);
    case 'bow':
      return bow(P, false);
    case 'longbow':
      return bow(P, true);
    case 'staff':
      return staff(P);
    case 'wand':
      return wand(P);
    case 'kite':
    case 'heater':
    case 'buckler':
      return shield(P, look);
    case 'tome':
      return tome(P);
    case 'orb':
      return orb(P);
    case 'quiver':
      return quiver(P);
    case 'greathelm':
    case 'bascinet':
    case 'nasal':
    case 'hood':
    case 'circlet':
      return helmet(P, look);
    case 'ring':
    case 'amulet':
    case 'charm':
      return trinket(P, look);
    case 'cloak':
    case 'mantle':
      return capeIcon(P, look);
    default:
      return armourDisplay(P, base);
  }
}

/** The palette of an item, for gearRig's attached pieces. */
export const itemPalette = (item) => palette(item);
