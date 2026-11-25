import * as THREE from 'three';

/**
 * Seoul's street trees: ginkgos and plane trees, grown in code (our own
 * generator, in the manner of procedural tree tools): a flared, tapering
 * trunk and a real branch structure — a ginkgo's straight leader with
 * ascending side branches in a narrow cone, a plane tree's short trunk
 * forking into spreading limbs under a broad dome — each branch a tube with
 * bark on it (ambientCG Bark004 and Bark009, CC0), the foliage leaf cards
 * (sprigs of fan-shaped ginkgo leaves or five-lobed plane leaves, drawn in a
 * canvas) lit as one soft crown. Each tree stands in a cast-iron grate.
 *
 * Three variants of each species, each in three levels of detail (full near,
 * lighter further, a trunk and a few big cards far off), all instanced: a
 * few draws for every tree in the city, sorted by distance each frame.
 * Seasonal colour: spring's light green, summer's deep green, autumn's
 * ginkgo gold and plane-tree tan (from the month in Seoul, or `season`).
 *
 *   const trees = new StreetTrees(scene, wind);
 *   const id = trees.add([{ x, y, z, yaw, species: 'ginkgo' | 'plane', seed }]);
 *   trees.update(camera); trees.remove(id); trees.dispose();
 */

export const SPECIES = ['ginkgo', 'plane'];
const VARIANTS = 3;
/** Levels of detail: up to these distances (m). Beyond the last, not drawn. */
export const LOD_RANGE = [62, 210, 900];
const CAP = [192, 768, 3072];

/** A small seeded random. */
export function rand(seed) {
  let s = (Math.floor(seed * 9301 + 49297) >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * How each species grows. Level 0 is the trunk; `kids[l]` branches grow off a
 * level-l branch between `from[l]` and 1 of its length, `angle[l]` off it,
 * `len[l]` of its length long; leaves (cards of `leaf` m) on the levels in `leafy`.
 */
const GROWTH = {
  ginkgo: {
    height: [8.5, 11],
    radius: 0.17,
    kids: [18, 5, 2],
    from: [0.27, 0.3, 0.5],
    angle: [0.62, 0.58, 0.55],
    len: [0.33, 0.42, 0.5],
    cone: 0.75,
    up: [0.0, 0.05, 0.03, 0.02],
    gnarl: [0.025, 0.1, 0.16, 0.2],
    leafy: { 1: 4, 2: 5, 3: 4 },
    leaf: 0.85,
    bark: 'Bark004'
  },
  plane: {
    height: [3.0, 3.8],
    radius: 0.24,
    kids: [4, 6, 4],
    from: [0.8, 0.28, 0.35],
    angle: [0.62, 0.72, 0.7],
    len: [1.45, 0.55, 0.55],
    cone: 0,
    up: [0, 0.05, -0.02, -0.04],
    gnarl: [0.03, 0.12, 0.16, 0.2],
    leafy: { 2: 4, 3: 5 },
    leaf: 1.2,
    bark: 'Bark009'
  }
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** A unit vector at random. */
function randomUnit(R, out = new THREE.Vector3()) {
  const z = R() * 2 - 1;
  const t = R() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return out.set(s * Math.cos(t), z, s * Math.sin(t));
}

/** The skeleton of one tree: its branches (points, radii, level) and its leaf cards (centre, facing, size). */
export function growTree(species, seed) {
  const G = GROWTH[species];
  const R = rand(seed + (species === 'plane' ? 0.5 : 0));
  const branches = [];
  const leaves = [];
  const height = G.height[0] + R() * (G.height[1] - G.height[0]);
  const grow = (origin, dir, length, radius, level) => {
    const n = [9, 6, 4, 3][level] ?? 3;
    const pts = [origin.clone()];
    const rad = [radius * (level === 0 ? 1.4 : 1)];
    const d = dir.clone();
    const tip = level === 0 ? (species === 'ginkgo' ? 0.12 : 0.55) : 0.3;
    for (let i = 1; i <= n; i++) {
      d.addScaledVector(randomUnit(R, _a), G.gnarl[level]).addScaledVector(UP, G.up[level]).normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, length / n));
      rad.push(radius * (1 - (1 - tip) * (i / n)));
    }
    const b = { pts, rad, level, length };
    branches.push(b);
    // Leaves along the outer part of a leafy branch.
    const per = G.leafy[level];
    if (per) {
      for (let k = 0; k < per; k++) {
        const t = 0.35 + 0.65 * ((k + R()) / per);
        const c = at(pts, t).addScaledVector(randomUnit(R, _a), G.leaf * 0.3);
        leaves.push({ c, s: G.leaf * (0.8 + R() * 0.45), r: R(), cell: R() < 0.5 ? 0 : 1 });
      }
    }
    if (level >= 3) return;
    const kids = G.kids[level] ?? 0;
    for (let k = 0; k < kids; k++) {
      const t = G.from[level] + (1 - G.from[level]) * ((k + 0.3 + R() * 0.4) / kids);
      const p = at(pts, t);
      const r = radiusAt(rad, t);
      const pd = dirAt(pts, t);
      // turn off the parent by the angle, round it by the golden angle (a spiral of branches)
      const side = _b.crossVectors(pd, Math.abs(pd.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      const cd = pd.clone().applyAxisAngle(side, G.angle[level] * (0.8 + R() * 0.4)).applyAxisAngle(pd, k * 2.39996 + R() * 0.6 + seed);
      let len = length * G.len[level] * (0.8 + R() * 0.4);
      // a ginkgo's crown is a cone: long branches low, short ones high
      if (level === 0 && G.cone) len *= 1 - G.cone * (t - G.from[0]) / (1 - G.from[0]) + 0.1;
      if (level === 0 && species === 'plane') len = 4.2 + R() * 1.4;
      grow(p, cd, len, Math.max(0.025, r * (level === 0 ? 0.62 : 0.6)), level + 1);
    }
    // the plane tree's leader carries on up the middle as one more limb
    if (level === 0 && species === 'plane') grow(pts[n].clone(), dirAt(pts, 1).lerp(UP, 0.6).normalize(), 4.2, radius * 0.55, 1);
  };
  grow(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((R() - 0.5) * 0.06, 1, (R() - 0.5) * 0.06).normalize(), height + 0.3, G.radius * (0.9 + R() * 0.2), 0);
  // The crown's middle: each card lit as part of one soft crown (its normal from there outward).
  const mid = new THREE.Vector3();
  for (const l of leaves) mid.add(l.c);
  mid.divideScalar(Math.max(1, leaves.length));
  let reach = 0.1;
  for (const l of leaves) reach = Math.max(reach, l.c.distanceTo(mid));
  return { branches, leaves, mid, reach, height };
}

function at(pts, t) {
  const f = t * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  return pts[i].clone().lerp(pts[i + 1], f - i);
}
function radiusAt(rad, t) {
  const f = t * (rad.length - 1);
  const i = Math.min(rad.length - 2, Math.floor(f));
  return rad[i] + (rad[i + 1] - rad[i]) * (f - i);
}
function dirAt(pts, t) {
  const f = t * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  return pts[i + 1].clone().sub(pts[i]).normalize();
}

/** The wood of a tree as tubes (bark tiled 1.3 m), up to `maxLevel`, `sides` round (fewer on twigs). */
export function woodGeometry(tree, { maxLevel = 3, sides = [9, 6, 4, 3], step = 1 } = {}) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  for (const b of tree.branches) {
    if (b.level > maxLevel) continue;
    const s = sides[b.level] ?? 3;
    const pts = b.pts.filter((_, i) => i % step === 0 || i === b.pts.length - 1);
    const rad = b.rad.filter((_, i) => i % step === 0 || i === b.rad.length - 1);
    const base = pos.length / 3;
    let v = 0;
    const around = Math.max(1, Math.round((2 * Math.PI * rad[0]) / 1.3));
    pts.forEach((p, i) => {
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const prev = pts[Math.max(0, i - 1)];
      T.subVectors(next, prev).normalize();
      if (i === 0) N.crossVectors(T, Math.abs(T.y) > 0.9 ? _a.set(1, 0, 0) : UP).normalize();
      else N.addScaledVector(T, -N.dot(T)).normalize();
      B.crossVectors(T, N);
      if (i > 0) v += p.distanceTo(prev) / 1.3;
      for (let j = 0; j <= s; j++) {
        const a = (j / s) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const nx = N.x * ca + B.x * sa;
        const ny = N.y * ca + B.y * sa;
        const nz = N.z * ca + B.z * sa;
        pos.push(p.x + nx * rad[i], p.y + ny * rad[i], p.z + nz * rad[i]);
        nor.push(nx, ny, nz);
        uv.push((j / s) * around, v);
      }
    });
    for (let i = 0; i < pts.length - 1; i++) {
      for (let j = 0; j < s; j++) {
        const a = base + i * (s + 1) + j;
        const c = a + s + 1;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
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

/**
 * The foliage as leaf cards: every `every`th card, `grow` times bigger. Each card faces
 * out and up a little, its normal the crown's (soft, round lighting), darker inside the crown.
 */
export function leafGeometry(tree, species, { every = 1, grow = 1 } = {}) {
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const R = rand(tree.height * 7.13);
  const n = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const out = new THREE.Vector3();
  const cellBase = species === 'ginkgo' ? 0 : 2;
  tree.leaves.forEach((l, k) => {
    if (k % every) return;
    const s = l.s * grow;
    out.subVectors(l.c, tree.mid);
    const depth = Math.min(1, out.length() / tree.reach);
    out.normalize();
    n.copy(out).multiplyScalar(0.5).addScaledVector(UP, 0.45).add(randomUnit(R, a).multiplyScalar(0.7)).normalize();
    a.crossVectors(n, randomUnit(R, b)).normalize();
    b.crossVectors(n, a);
    // the crown's normal, tipped a little to the card's own facing
    const ln = out.clone().multiplyScalar(0.75).addScaledVector(n, 0.25).addScaledVector(UP, 0.2).normalize();
    const shade = 0.58 + 0.42 * depth ** 1.2;
    const cell = cellBase + l.cell;
    const u0 = cell / 4;
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      pos.push(l.c.x + (a.x * x + b.x * y) * s * 0.5, l.c.y + (a.y * x + b.y * y) * s * 0.5, l.c.z + (a.z * x + b.z * y) * s * 0.5);
      nor.push(ln.x, ln.y, ln.z);
      uv.push(u0 + ((x + 1) / 2) * 0.25, (y + 1) / 2);
      const j = 0.92 + l.r * 0.16;
      col.push(shade * j, shade * (0.96 + l.r * 0.08), shade * j);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/* ------------------------------------------------------------------ textures */

/** Four sprigs in a row: two of ginkgo (fan leaves in clusters on spur shoots), two of plane tree (five lobes). Pale, to take each tree's tint. */
function leafAtlas() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S * 4;
  c.height = S;
  const g = c.getContext('2d');
  const R = rand(4.2);
  const ginkgoLeaf = (x, y, ang, s) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    // the stalk
    g.strokeStyle = '#8c8a6a';
    g.lineWidth = s * 0.035;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -s * 0.42);
    g.stroke();
    // the fan, with its notch in the middle of the outer edge
    const P = -s * 0.4;
    const spread = 0.95 + R() * 0.25;
    const grad = g.createRadialGradient(0, P, s * 0.05, 0, P, s * 0.62);
    const v = 228 + Math.floor(R() * 27);
    grad.addColorStop(0, `rgb(${v - 26},${v - 22},${v - 30})`);
    grad.addColorStop(1, `rgb(${v},${v},${v - 6})`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, P);
    const L = s * 0.6;
    g.lineTo(Math.sin(-spread) * L * 0.55, P - Math.cos(spread) * L * 0.55);
    g.quadraticCurveTo(Math.sin(-spread) * L * 1.05, P - L * 0.85, -L * 0.12, P - L * 0.98);
    g.lineTo(0, P - L * 0.82);
    g.lineTo(L * 0.12, P - L * 0.98);
    g.quadraticCurveTo(Math.sin(spread) * L * 1.05, P - L * 0.85, Math.sin(spread) * L * 0.55, P - Math.cos(spread) * L * 0.55);
    g.closePath();
    g.fill();
    // fine fan veins
    g.strokeStyle = 'rgba(90,90,60,0.18)';
    g.lineWidth = 1;
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      g.moveTo(0, P);
      g.lineTo(Math.sin(k * 0.22) * L * 0.92, P - Math.cos(k * 0.22) * L * 0.92);
      g.stroke();
    }
    g.restore();
  };
  const planeLeaf = (x, y, ang, s) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.strokeStyle = '#8a8466';
    g.lineWidth = s * 0.03;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -s * 0.3);
    g.stroke();
    const C = -s * 0.3;
    const lobes = [[-1.45, 0.42], [-0.72, 0.78], [0, 0.95], [0.72, 0.78], [1.45, 0.42]];
    const v = 222 + Math.floor(R() * 33);
    g.fillStyle = `rgb(${v},${v},${v - 8})`;
    g.beginPath();
    lobes.forEach(([a, l], i) => {
      const tipX = Math.sin(a) * l * s * 0.62;
      const tipY = C - Math.cos(a) * l * s * 0.62;
      const prev = i ? lobes[i - 1][0] : a - 0.6;
      const m = (a + prev) / 2;
      const sinusX = Math.sin(m) * s * (i ? 0.26 : 0.12);
      const sinusY = C - Math.cos(m) * s * (i ? 0.26 : 0.12);
      if (!i) g.moveTo(sinusX, sinusY);
      else g.lineTo(sinusX, sinusY);
      g.quadraticCurveTo((sinusX + tipX) / 2 + Math.cos(a) * s * 0.06, (sinusY + tipY) / 2 + Math.sin(a) * s * 0.06, tipX, tipY);
    });
    g.lineTo(Math.sin(1.9) * s * 0.12, C - Math.cos(1.9) * s * 0.12);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(80,80,50,0.25)';
    g.lineWidth = 1.5;
    for (const [a, l] of lobes) {
      g.beginPath();
      g.moveTo(0, C);
      g.lineTo(Math.sin(a) * l * s * 0.55, C - Math.cos(a) * l * s * 0.55);
      g.stroke();
    }
    g.restore();
  };
  for (let cell = 0; cell < 4; cell++) {
    const ox = cell * S;
    const ginkgo = cell < 2;
    // the twig across the card
    g.strokeStyle = '#6f6455';
    g.lineWidth = 6;
    g.beginPath();
    const x0 = ox + S * 0.12;
    const y0 = S * 0.88;
    const x1 = ox + S * 0.86;
    const y1 = S * 0.16;
    g.moveTo(x0, y0);
    g.quadraticCurveTo(ox + S * (cell % 2 ? 0.7 : 0.3), S * 0.5, x1, y1);
    g.stroke();
    const n = ginkgo ? 7 : 6;
    for (let k = 0; k < n; k++) {
      const t = 0.12 + (k / (n - 1)) * 0.82;
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (ox + S * (cell % 2 ? 0.7 : 0.3)) + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * S * 0.5 + t * t * y1;
      if (ginkgo) {
        // a spur shoot: three to five leaves fanned out from one point
        const m = 3 + Math.floor(R() * 3);
        for (let j = 0; j < m; j++) ginkgoLeaf(bx, by, (j - (m - 1) / 2) * 0.55 + (R() - 0.5) * 0.4 + (k % 2 ? 0.7 : -0.7), S * (0.2 + R() * 0.06));
      } else planeLeaf(bx, by, (k % 2 ? 0.9 : -0.9) + (R() - 0.5) * 0.6, S * (0.34 + R() * 0.1));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A square cast-iron tree grate: rings of slots over dark soil, the trunk's hole in the middle. */
function grateTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#2e2a26';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#4a4540';
  g.fillRect(4, 4, S - 8, S - 8);
  g.fillStyle = '#1c1915';
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.17, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#191612';
  g.lineWidth = 5;
  for (let r = S * 0.23; r < S * 0.62; r += 13) {
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * Math.PI * 2 + 0.06 + r * 0.01;
      g.beginPath();
      g.arc(S / 2, S / 2, r, a0, a0 + Math.PI * 2 / 12 - 0.14);
      g.stroke();
    }
  }
  // the frame round the edge
  g.strokeStyle = '#57514a';
  g.lineWidth = 10;
  g.strokeRect(5, 5, S - 10, S - 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ------------------------------------------------------------------ seasons */

/** The season in Seoul now (KST): spring, summer, autumn or winter. */
export function seoulSeason(date = new Date()) {
  const m = new Date(date.getTime() + 9 * 3600e3).getUTCMonth();
  return m >= 2 && m <= 3 ? 'spring' : m >= 4 && m <= 8 ? 'summer' : m >= 9 && m <= 10 ? 'autumn' : 'winter';
}

/** A tree's leaf colour (linear), by species and season, varied a little by its seed. */
export function leafTint(species, season, seed, out = new THREE.Color()) {
  const r = (m) => (((seed * m) % 1) + 1) % 1;
  const turned = season === 'autumn' || season === 'winter';
  if (species === 'ginkgo') {
    if (turned) {
      // gold, a few still turning (yellow-green)
      if (r(5.17) < 0.15) out.setHSL(0.15 + r(1.3) * 0.03, 0.8, 0.48);
      else out.setHSL(0.12 + r(1.3) * 0.02, 1, 0.5 + r(2.1) * 0.06);
    } else if (season === 'spring') out.setHSL(0.24 + r(1.3) * 0.03, 0.6, 0.45);
    else out.setHSL(0.25 + r(1.3) * 0.04, 0.52, 0.32 + r(2.1) * 0.05);
  } else if (turned) out.setHSL(0.09 + r(1.3) * 0.04, 0.6 + r(2.7) * 0.15, 0.4 + r(2.1) * 0.06);
  else if (season === 'spring') out.setHSL(0.23 + r(1.3) * 0.03, 0.5, 0.42);
  else out.setHSL(0.24 + r(1.3) * 0.04, 0.42, 0.28 + r(2.1) * 0.05);
  return out;
}

/* ------------------------------------------------------------------ the street trees */

/** Trees in the wind: the higher, the more they sway; leaves flutter (more in a storm). */
function windy(material, wind, flutter) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uWind = wind.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3][0] * 0.071 + instanceMatrix[3][2] * 0.053;
        #else
          float ph = 0.0;
        #endif
        float hgt = max(0.0, transformed.y - 1.5);
        float gust = 0.65 + 0.35 * sin(uTime * 0.31 + ph * 0.4);
        float sway = (sin(uTime * 1.1 + ph) * 0.7 + sin(uTime * 2.1 + ph * 1.7) * 0.3) * gust;
        transformed.x += sway * uWind * hgt * hgt * 0.005;
        transformed.z += cos(uTime * 0.9 + ph * 1.3) * uWind * hgt * hgt * 0.003;
        float leaf = sin(uTime * 7.3 + position.x * 4.1 + position.y * 3.3 + position.z * 2.7 + ph) * ${flutter.toFixed(2)};
        transformed += normal * leaf * uWind * 0.05 * step(2.5, transformed.y);`);
  };
  return material;
}

export class StreetTrees {
  /** @param {THREE.Scene} scene @param {{ uTime: { value: number }, uWind: { value: number } }} wind @param {(id: string, part: string) => THREE.Texture} texture */
  constructor(scene, wind, texture) {
    this.scene = scene;
    this.season = seoulSeason();
    this.sets = new Map();
    this.nextId = 1;
    this.group = new THREE.Group();
    this.group.name = 'street-trees';
    scene.add(this.group);
    const leafMap = leafAtlas();
    const leaves = windy(new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: 0.42, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82, metalness: 0 }), wind, 1);
    // Leaves let light through: a little of their own colour glows back (so gold reads gold, not olive).
    const swayLeaves = leaves.onBeforeCompile;
    this.glow = { value: 0.16 };
    leaves.onBeforeCompile = (shader) => {
      swayLeaves(shader);
      shader.uniforms.uLeafGlow = this.glow;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLeafGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uLeafGlow;');
    };
    const bark = {};
    for (const sp of SPECIES) {
      const id = GROWTH[sp].bark;
      bark[sp] = windy(new THREE.MeshStandardMaterial({ map: texture(id, 'Color'), normalMap: texture(id, 'NormalGL'), color: sp === 'plane' ? '#d8d4c8' : '#b9b2a8', roughness: 0.95, metalness: 0 }), wind, 0.2);
    }
    this.materials = [leaves, ...Object.values(bark)];
    this.leafMap = leafMap;
    // Every species × variant × level of detail: wood and leaves, instanced.
    this.meshes = [];
    for (const sp of SPECIES) {
      for (let v = 0; v < VARIANTS; v++) {
        const tree = growTree(sp, v * 3.7 + 1.3);
        const lods = [
          [woodGeometry(tree), leafGeometry(tree, sp)],
          [woodGeometry(tree, { maxLevel: 2, sides: [6, 4, 3], step: 2 }), leafGeometry(tree, sp, { every: 2, grow: 1.4 })],
          [woodGeometry(tree, { maxLevel: 1, sides: [5, 3], step: 3 }), leafGeometry(tree, sp, { every: 5, grow: 2.3 })]
        ];
        lods.forEach(([wood, leaf], lod) => {
          const w = new THREE.InstancedMesh(wood, bark[sp], CAP[lod]);
          const l = new THREE.InstancedMesh(leaf, leaves, CAP[lod]);
          l.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP[lod] * 3), 3);
          for (const m of [w, l]) {
            m.count = 0;
            m.frustumCulled = false;
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            m.castShadow = lod === 0;
            m.receiveShadow = lod < 2;
            this.group.add(m);
          }
          this.meshes.push({ species: sp, variant: v, lod, wood: w, leaf: l, cap: CAP[lod] });
        });
      }
    }
    // The grates: near only.
    this.grates = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grateTexture(), roughness: 0.7, metalness: 0.45, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -10 }), 1024);
    this.grates.count = 0;
    this.grates.frustumCulled = false;
    this.grates.receiveShadow = true;
    this.group.add(this.grates);
    this._frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._sphere = new THREE.Sphere(new THREE.Vector3(), 8);
    this._tint = new THREE.Color();
    this.dirty = true;
  }

  /** A tile's trees: [{ x, y, z, yaw, species, seed }]. Returns an id to remove them by. */
  add(list) {
    const id = this.nextId++;
    const trees = list.map((t) => {
      const r = (m) => (((t.seed * m) % 1) + 1) % 1;
      const s = 0.85 + r(7.31) * 0.3;
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(UP, r(3.3) * Math.PI * 2), new THREE.Vector3(s, s * (0.92 + r(3.7) * 0.16), s));
      const grate = new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y + 0.03, t.z), new THREE.Quaternion().setFromAxisAngle(UP, t.yaw ?? 0), new THREE.Vector3(1, 1, 1));
      return { x: t.x, y: t.y, z: t.z, species: t.species, variant: Math.floor(r(11.7) * VARIANTS), seed: t.seed, matrix, grate };
    });
    this.sets.set(id, trees);
    this.dirty = true;
    return id;
  }

  remove(id) {
    if (this.sets.delete(id)) this.dirty = true;
  }

  /** Change the season (spring, summer, autumn, winter): the trees' colours. */
  setSeason(season) {
    this.season = season;
    this.dirty = true;
  }

  /** Sort the trees in view into their levels of detail (each frame the camera moves). */
  update(camera) {
    const p = camera.position;
    const moved = !this._last || this._last.distanceToSquared(p) > 0.04 || Math.abs(this._lastQ.angleTo(camera.quaternion)) > 0.004;
    if (!moved && !this.dirty) return;
    this._last = (this._last ?? new THREE.Vector3()).copy(p);
    this._lastQ = (this._lastQ ?? new THREE.Quaternion()).copy(camera.quaternion);
    this.dirty = false;
    camera.updateMatrixWorld();
    this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pv);
    const counts = new Map(this.meshes.map((m) => [m, 0]));
    const slot = {};
    for (const m of this.meshes) slot[`${m.species}|${m.variant}|${m.lod}`] = m;
    let grates = 0;
    const far2 = LOD_RANGE[2] ** 2;
    const near0 = LOD_RANGE[0] ** 2;
    const near1 = LOD_RANGE[1] ** 2;
    for (const list of this.sets.values()) {
      for (const t of list) {
        const dx = t.x - p.x;
        const dz = t.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > far2) continue;
        this._sphere.center.set(t.x, t.y + 5, t.z);
        if (!this._frustum.intersectsSphere(this._sphere)) continue;
        const lod = d2 < near0 ? 0 : d2 < near1 ? 1 : 2;
        const m = slot[`${t.species}|${t.variant}|${lod}`];
        const n = counts.get(m);
        if (n >= m.cap) continue;
        m.wood.setMatrixAt(n, t.matrix);
        m.leaf.setMatrixAt(n, t.matrix);
        m.leaf.setColorAt(n, leafTint(t.species, this.season, t.seed, this._tint));
        counts.set(m, n + 1);
        if (d2 < 120 * 120 && grates < 1024) this.grates.setMatrixAt(grates++, t.grate);
      }
    }
    for (const [m, n] of counts) {
      for (const mesh of [m.wood, m.leaf]) {
        mesh.count = n;
        mesh.visible = n > 0;
        if (!n) continue;
        mesh.instanceMatrix.clearUpdateRanges();
        mesh.instanceMatrix.addUpdateRange(0, n * 16);
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (n) {
        m.leaf.instanceColor.clearUpdateRanges();
        m.leaf.instanceColor.addUpdateRange(0, n * 3);
        m.leaf.instanceColor.needsUpdate = true;
      }
    }
    this.grates.count = grates;
    this.grates.visible = grates > 0;
    this.grates.instanceMatrix.needsUpdate = true;
    this.counts = [...counts].reduce((s, [m, n]) => ((s[m.lod] = (s[m.lod] ?? 0) + n), s), {});
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of this.meshes) {
      m.wood.geometry.dispose();
      m.leaf.geometry.dispose();
      m.wood.dispose();
      m.leaf.dispose();
    }
    this.grates.geometry.dispose();
    this.grates.material.map?.dispose();
    this.grates.dispose();
    for (const m of this.materials) m.dispose();
    this.leafMap.dispose();
    this.sets.clear();
  }
}
