/**
 * Trees, grown here from a seed: a trunk that flares into buttress roots,
 * surface roots that sink into the ground, limbs that fork three or four
 * times, and crowns of leaf-cluster cards. Bark is painted to tile round the
 * trunk; leaf cards carry rounded normals (so a crown shades like a cloud of
 * leaves, not a heap of planes), light through them toward the sun, and
 * wind that sways limbs by their reach and flutters the leaves.
 *
 * Kinds: 'elder' (Brindlewick's giants), 'oak' and 'birch' (the woods),
 * 'gloam' and 'gloamGiant' (the Gloamwood's twisted violet trees).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './noise.js';
import { addWind, addTranslucency, windDepthMaterial, addRegionTint } from './materials.js';

const UP = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------------ tubes */

/**
 * A tube along `pts` (Vector3[]) with radii `rad` (one per point), `seg`
 * sides; `shape(θ, i, t)` scales each ring's radius (buttresses, lobes).
 * UVs: u round the tube (repeating every ~uWorld metres), v along it.
 * `flex(i)` gives each ring's wind flex; `phase` its sway phase.
 */
function tube(pts, rad, seg, { shape = null, uWorld = 1.6, vWorld = 3.2, flex = () => 0, phase = 0, color = null, capEnd = true } = {}) {
  const n = pts.length;
  const T = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    T.push(b.clone().sub(a).normalize());
  }
  // Parallel-transported frames.
  const N = [];
  const B = [];
  let nrm = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(T[0]).normalize() : new THREE.Vector3(1, 0, 0).cross(T[0]).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const axis = T[i - 1].clone().cross(T[i]);
      const s = axis.length();
      if (s > 1e-6) {
        const ang = Math.asin(Math.min(1, s));
        nrm.applyAxisAngle(axis.normalize(), T[i - 1].dot(T[i]) < 0 ? Math.PI - ang : ang);
      }
    }
    N.push(nrm.clone());
    B.push(T[i].clone().cross(nrm).normalize());
  }
  const circ = 2 * Math.PI * rad[0];
  const uRep = Math.max(1, Math.round(circ / uWorld));
  const cols = seg + 1;
  const pos = new Float32Array(n * cols * 3);
  const uv = new Float32Array(n * cols * 2);
  const wind = new Float32Array(n * cols * 2);
  const col = new Float32Array(n * cols * 3);
  let along = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) along += pts[i].distanceTo(pts[i - 1]);
    const t = i / (n - 1);
    const f = flex(i, t);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const k = shape ? shape(th, i, t) : 1;
      const r = rad[i] * k;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const x = pts[i].x + (N[i].x * c + B[i].x * s) * r;
      const y = pts[i].y + (N[i].y * c + B[i].y * s) * r;
      const z = pts[i].z + (N[i].z * c + B[i].z * s) * r;
      const v = i * cols + j;
      pos[v * 3] = x;
      pos[v * 3 + 1] = y;
      pos[v * 3 + 2] = z;
      uv[v * 2] = (j / seg) * uRep;
      uv[v * 2 + 1] = along / vWorld;
      wind[v * 2] = phase;
      wind[v * 2 + 1] = f;
      const cc = color ? color(i, t, th, y) : [1, 1, 1];
      col.set(cc, v * 3);
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aWind', new THREE.BufferAttribute(wind, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Weld the seam's normals.
  const nr = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * cols;
    const b = a + seg;
    const x = (nr.getX(a) + nr.getX(b)) / 2;
    const y = (nr.getY(a) + nr.getY(b)) / 2;
    const z = (nr.getZ(a) + nr.getZ(b)) / 2;
    const l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l);
    nr.setXYZ(b, x / l, y / l, z / l);
  }
  void capEnd;
  return g;
}

/** Points along a growing limb: starts at `p0` heading `dir`, bends toward `pull` and wanders. */
function limb(p0, dir, length, steps, r, { pull = UP, bend = 0.4, wander = 0.25, twist = 0 } = {}) {
  const pts = [p0.clone()];
  const d = dir.clone().normalize();
  const p = p0.clone();
  const seg = length / steps;
  const side = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
  for (let i = 0; i < steps; i++) {
    const w = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.5, r() - 0.5).multiplyScalar(wander);
    if (twist) w.add(side.clone().applyAxisAngle(UP, i * twist).multiplyScalar(twist * 0.6));
    d.addScaledVector(pull, bend / steps).add(w.multiplyScalar(1 / steps * 3)).normalize();
    p.addScaledVector(d, seg);
    pts.push(p.clone());
  }
  return pts;
}

/* ------------------------------------------------------------------ species */

export const SPECIES = {
  elder: {
    bark: { seed: 31, palette: ['#2a1a10', '#6a4a30', '#a07a52', '#4a5a28'], mossy: 0.35, twist: 0.08 },
    leaves: ['#3e5a1e', '#5a7a26', '#7a8e2a', '#a59a34', '#6a7a22'],
    leafShape: 'oak',
    trunkFrac: 0.42, lobes: 7, lobeAmp: 0.5, limbs: 5, depth: 3, spread: 0.95, cardSize: 3.4, clusterR: 3.6, cards: 16, leafTint: [1, 1, 1]
  },
  oak: {
    bark: { seed: 32, palette: ['#2a1c12', '#5e4430', '#8e6e50', '#4a5a2a'], mossy: 0.3, twist: 0.05 },
    leaves: ['#36521c', '#4f6e22', '#6e8a2a', '#8f9a30'],
    leafShape: 'oak',
    trunkFrac: 0.38, lobes: 5, lobeAmp: 0.3, limbs: 4, depth: 3, spread: 0.85, cardSize: 2.6, clusterR: 2.6, cards: 12, leafTint: [1, 1, 1]
  },
  birch: {
    bark: { seed: 33, palette: ['#3a3430', '#d8d0c0', '#efe8da', '#7a7a5a'], mossy: 0.1, twist: 0.0 },
    leaves: ['#8a8a24', '#b4a02a', '#d2b43a', '#c08a28'],
    leafShape: 'round',
    trunkFrac: 0.55, lobes: 0, lobeAmp: 0, limbs: 3, depth: 3, spread: 0.55, cardSize: 1.9, clusterR: 1.9, cards: 10, leafTint: [1, 1, 1]
  },
  gloam: {
    bark: { seed: 34, palette: ['#140a1c', '#3a2440', '#6a4a6a', '#1e5a5a'], mossy: 0.45, twist: 0.3 },
    leaves: ['#5a1e6a', '#8a2a8e', '#b03aa8', '#d45ac0', '#3a6a7a'],
    leafShape: 'round',
    trunkFrac: 0.5, lobes: 6, lobeAmp: 0.4, limbs: 4, depth: 3, spread: 1.0, cardSize: 2.8, clusterR: 3.0, cards: 12, twist: 0.35, leafTint: [1, 1, 1]
  },
  gloamGiant: {
    bark: { seed: 35, palette: ['#120818', '#38203e', '#6e4c6c', '#1a5e5a'], mossy: 0.5, twist: 0.45 },
    leaves: ['#4e1a62', '#7e2486', '#a8349e', '#cc56bc', '#2e5e6e'],
    leafShape: 'round',
    trunkFrac: 0.5, lobes: 8, lobeAmp: 0.65, limbs: 5, depth: 3, spread: 1.15, cardSize: 3.8, clusterR: 4.2, cards: 16, twist: 0.55, leafTint: [1, 1, 1]
  }
};

/**
 * Grow one tree. Returns { wood, leaves } geometries (in the tree's own
 * space, base at the origin) and its crown's centre and radius.
 */
export function growTree(kind, { seed = 1, height = 20, radius = 0.6, detail = 1, roots = true } = {}) {
  const sp = SPECIES[kind];
  const r = rng(seed);
  const wood = [];
  const leafQuads = [];
  const giant = kind === 'elder' || kind === 'gloamGiant';
  const twist = sp.twist ?? 0;
  const lobePhase = r() * Math.PI * 2;
  const lobes = sp.lobes;
  const trunkH = height * sp.trunkFrac;
  const segTrunk = Math.max(10, Math.round((giant ? 40 : 18) * detail));
  // The trunk: a gently leaning, twisting spline.
  const lean = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(giant ? 0.12 : 0.2);
  const steps = giant ? 26 : 12;
  const trunkPts = [];
  const trunkRad = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // More rings near the base, where the flare is.
    const tt = Math.pow(t, 1.35);
    const y = tt * trunkH;
    const sway = twist * Math.sin(tt * 3.2 + seed) * radius * 1.4;
    trunkPts.push(new THREE.Vector3(lean.x * y + sway * Math.cos(tt * 2), y - (giant ? 0.6 : 0.3), lean.z * y + sway * Math.sin(tt * 2)));
    const flare = 1 + (giant ? 1.1 : 0.55) * Math.exp(-y / (radius * (giant ? 0.85 : 0.7)));
    trunkRad.push(radius * flare * (1 - 0.32 * tt));
  }
  const shape = (th, i, t) => {
    const y = trunkPts[i].y;
    const lobe = lobes ? sp.lobeAmp * Math.exp(-Math.max(0, y) / (radius * 1.4)) * (Math.pow(Math.max(0, Math.cos(lobes * (th + twist * y * 0.08) + lobePhase)), 2) - 0.35) : 0;
    const fib = 0.035 * Math.sin(th * 13 + y * 0.35 + seed) + 0.02 * Math.sin(th * 29 - y * 0.9);
    return 1 + lobe + fib;
  };
  const trunkColor = (i, t, th, y) => {
    // Darker at the foot and in the buttresses' folds; green damp low on one side.
    const k = 0.55 + Math.min(1, (y + 0.6) / (radius * 3)) * 0.45;
    const moss = Math.max(0, Math.cos(th - 1.2)) * Math.exp(-Math.max(0, y) / 3) * 0.35;
    return [k * (1 - moss * 0.4), k * (1 + moss * 0.1), k * (1 - moss * 0.5)];
  };
  wood.push(tube(trunkPts, trunkRad, segTrunk, { shape, uWorld: giant ? 2.2 : 1.4, vWorld: giant ? 4.5 : 2.8, flex: (i, t) => t * t * 0.08, color: trunkColor }));

  // Surface roots: out from the buttresses, down into the ground.
  if (roots) {
    const nRoots = giant ? lobes || 6 : Math.max(3, Math.round(lobes * 0.7));
    for (let k = 0; k < nRoots; k++) {
      const a = (k / nRoots) * Math.PI * 2 - lobePhase / Math.max(1, lobes) + (r() - 0.5) * 0.3;
      const out = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      // Align with a lobe: cos(lobes*th + phase) = 1 at th = (2πk − phase)/lobes.
      const th = lobes ? ((k * 2 * Math.PI - lobePhase) / lobes) : a;
      out.set(Math.cos(th), 0, Math.sin(th));
      // Express in the trunk's base frame (frame N/B ~ x/z at the base for a vertical trunk).
      // Gnarled, arching roots: up out of the trunk, over, and down into the soil.
      const start = out.clone().multiplyScalar(radius * (giant ? 0.7 : 0.6)).add(new THREE.Vector3(0, radius * (giant ? 0.45 : 0.3), 0));
      const len = radius * (giant ? 2.7 : 2.0) * (0.75 + r() * 0.5);
      const dir = out.clone().add(new THREE.Vector3(0, -0.12, 0));
      const pts = limb(start, dir, len, giant ? 12 : 7, r, { pull: new THREE.Vector3(0, -1, 0), bend: 0.75, wander: 0.22, twist: twist * 0.3 });
      const rr = pts.map((_, i) => {
        const t = i / (pts.length - 1);
        return radius * (giant ? 0.42 : 0.3) * Math.pow(1 - t, 1.05) + 0.06;
      });
      wood.push(tube(pts, rr, giant ? 12 : 7, { uWorld: 1.2, vWorld: 2.5, color: (i, t) => [0.55 + t * 0.1, 0.56 + t * 0.12, 0.5 + t * 0.05] }));
    }
  }

  // Limbs, forking.
  const crownC = new THREE.Vector3(0, trunkH + (height - trunkH) * 0.5, 0);
  const crownR = (height - trunkH) * 0.55 * sp.spread + height * 0.08;
  const grow = (p0, dir, len, rad, depth, phase) => {
    const n = Math.max(4, Math.round((giant ? 10 : 7) * detail * (1 - depth * 0.15)));
    const pts = limb(p0, dir, len, n, r, { pull: UP, bend: depth === 0 ? 0.25 : 0.55, wander: 0.35 + twist * 0.5, twist: twist * 0.5 });
    const rad0 = rad;
    const rads = pts.map((_, i) => Math.max(0.025, rad0 * (1 - (i / n) * 0.72)));
    const sides = Math.max(5, Math.round((rad > 0.6 ? 16 : rad > 0.25 ? 10 : 6) * detail));
    const flexBase = 0.12 + depth * 0.22;
    wood.push(tube(pts, rads, sides, { uWorld: 1.2, vWorld: 2.4, flex: (i, t) => flexBase + t * 0.2, phase, color: () => [0.9, 0.88, 0.85] }));
    if (depth >= 1) {
      // Leaf clusters along the outer part of the limb, one at its tip.
      const count = depth === sp.depth ? 4 : depth === 2 ? 3 : 2;
      for (let c = 0; c < count; c++) {
        const t = c === count - 1 ? 1 : 0.4 + (c / count) * 0.6 + r() * 0.08;
        const at = pts[Math.min(n, Math.round(t * n))];
        const rcl = sp.clusterR * (0.7 + r() * 0.5) * (height / 34 + 0.45) * (depth === 1 ? 1.25 : 1);
        leafQuads.push({ c: at.clone().add(new THREE.Vector3((r() - 0.5) * rcl * 0.5, (r() - 0.1) * rcl * 0.4, (r() - 0.5) * rcl * 0.5)), r: rcl, flex: flexBase + 0.35, phase });
      }
    }
    if (depth >= sp.depth) return;
    const kids = depth === 0 ? 0 : 2 + (r() < 0.5 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const t = 0.45 + (k / kids) * 0.5 + r() * 0.08;
      const i = Math.min(n - 1, Math.round(t * n));
      const pd = pts[Math.min(n, i + 1)].clone().sub(pts[i]).normalize();
      const az = k * 2.39996 + r() * 0.6;
      const perp = new THREE.Vector3().crossVectors(pd, Math.abs(pd.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0)).normalize().applyAxisAngle(pd, az);
      const ang = (0.55 + r() * 0.45) * sp.spread;
      const cd = pd.clone().multiplyScalar(Math.cos(ang)).addScaledVector(perp, Math.sin(ang)).normalize();
      grow(pts[i], cd, len * (0.55 + r() * 0.15), rads[i] * (0.58 + r() * 0.1), depth + 1, phase + r() * 2);
    }
  };
  const top = trunkPts[trunkPts.length - 1];
  const topR = trunkRad[trunkRad.length - 1];
  const limbs = sp.limbs;
  for (let k = 0; k < limbs; k++) {
    const az = (k / limbs) * Math.PI * 2 + r() * 0.5;
    const up = 0.55 + r() * 0.35;
    const dir = new THREE.Vector3(Math.cos(az) * (1 - up * 0.6) * sp.spread, up, Math.sin(az) * (1 - up * 0.6) * sp.spread).normalize();
    const start = trunkPts[Math.round(trunkPts.length * (0.8 + r() * 0.15)) - 1] ?? top;
    grow(start, dir, (height - trunkH) * (0.55 + r() * 0.2), topR * (0.55 + r() * 0.15), 1, r() * 6);
  }
  // A leader up the middle.
  grow(top, new THREE.Vector3(lean.x, 1, lean.z), (height - trunkH) * 0.7, topR * 0.6, 2, r() * 6);

  // Leaf cards.
  const leaves = leafCards(leafQuads, crownC, crownR, sp, r, detail, giant);
  const woodGeo = mergeGeometries(wood, false);
  for (const g of wood) g.dispose();
  return { wood: woodGeo, leaves, crown: { c: crownC, r: crownR }, height };
}

/** Cards in clusters: random facing, rounded normals, darker toward the inside and bottom. */
function leafCards(clusters, crownC, crownR, sp, r, detail, giant) {
  const perOf = (cl) => Math.max(3, Math.round(sp.cards * detail * Math.min(3.2, Math.pow(cl.r / sp.clusterR, 1.6))));
  let total = 0;
  for (const cl of clusters) total += perOf(cl);
  const pos = new Float32Array(total * 4 * 3);
  const nor = new Float32Array(total * 4 * 3);
  const uv = new Float32Array(total * 4 * 2);
  const col = new Float32Array(total * 4 * 3);
  const wind = new Float32Array(total * 4 * 2);
  const idx = new Uint32Array(total * 6);
  let q = 0;
  const tmpN = new THREE.Vector3();
  const ax = new THREE.Vector3();
  const ay = new THREE.Vector3();
  for (const cl of clusters) {
    const per = perOf(cl);
    for (let k = 0; k < per; k++) {
      // A point in the cluster, biased to its outside.
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const rr = cl.r * (0.35 + Math.pow(r(), 0.5) * 0.65);
      const p = new THREE.Vector3(s * Math.cos(th) * rr, u * rr * 0.75, s * Math.sin(th) * rr).add(cl.c);
      const size = sp.cardSize * (0.75 + r() * 0.6) * Math.pow(cl.r / sp.clusterR, 0.55) * (giant ? 1.05 : 0.95);
      // A random plane, tilted toward facing outward.
      const out = p.clone().sub(crownC).normalize();
      const n = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().lerp(out, 0.35).normalize();
      ax.crossVectors(n, Math.abs(n.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
      ay.crossVectors(n, ax).normalize();
      const rot = r() * Math.PI * 2;
      const ca = Math.cos(rot);
      const sa = Math.sin(rot);
      const X = ax.clone().multiplyScalar(ca).addScaledVector(ay, sa).multiplyScalar(size / 2);
      const Y = ay.clone().multiplyScalar(ca).addScaledVector(ax, -sa).multiplyScalar(size / 2);
      const atlas = Math.floor(r() * 4);
      const ox = (atlas % 2) * 0.5;
      const oy = Math.floor(atlas / 2) * 0.5;
      // Shading normal: from the crown's centre (a cloud of leaves), a little from the cluster.
      const sn = p.clone().sub(crownC).normalize().multiplyScalar(0.75).add(p.clone().sub(cl.c).normalize().multiplyScalar(0.45)).normalize();
      const depthIn = Math.min(1, p.distanceTo(crownC) / (crownR * 1.2));
      const below = THREE.MathUtils.clamp((p.y - crownC.y) / crownR * 0.5 + 0.5, 0, 1);
      const shade = 0.45 + depthIn * 0.35 + below * 0.3;
      const tint = 0.9 + r() * 0.2;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let c = 0; c < 4; c++) {
        const [cx, cy] = corners[c];
        const v = q * 4 + c;
        const vp = p.clone().addScaledVector(X, cx).addScaledVector(Y, cy);
        pos.set([vp.x, vp.y, vp.z], v * 3);
        tmpN.copy(sn);
        nor.set([tmpN.x, tmpN.y, tmpN.z], v * 3);
        uv.set([ox + (cx * 0.5 + 0.5) * 0.5, oy + (cy * 0.5 + 0.5) * 0.5], v * 2);
        col.set([shade * tint, shade * tint, shade * (0.95 + r() * 0.1)], v * 3);
        wind.set([cl.phase + k * 0.3, cl.flex + 0.15], v * 2);
      }
      idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6);
      q++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, q * 12), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, q * 12), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, q * 8), 2));
  g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, q * 12), 3));
  g.setAttribute('aWind', new THREE.BufferAttribute(wind.subarray(0, q * 8), 2));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, q * 6), 1));
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ materials */

/** A leaf atlas: four cluster variants in a 2×2 grid. */
function leafAtlas(bank, kind) {
  const sp = SPECIES[kind];
  const key = `atlas:${kind}`;
  if (bank.cache.has(key)) return bank.cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const t = bank.leaves(900 + i * 17 + kind.length, sp.leaves, { shape: sp.leafShape, count: kind === 'birch' ? 90 : 75 });
    g.drawImage(t.image, (i % 2) * 512, Math.floor(i / 2) * 512, 512, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = bank.aniso;
  bank.all.push(tex);
  bank.cache.set(key, tex);
  return tex;
}

export function treeMaterials(bank, kind, { msaa = true } = {}) {
  const sp = SPECIES[kind];
  const bark = bank.bark(sp.bark.seed, sp.bark.palette, { mossy: sp.bark.mossy, twist: sp.bark.twist });
  const wood = addWind(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.92, vertexColors: true }));
  const atlas = leafAtlas(bank, kind);
  const glow = kind.startsWith('gloam');
  const leaves = new THREE.MeshStandardMaterial({
    map: atlas,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.78,
    vertexColors: true,
    alphaToCoverage: msaa,
    emissive: glow ? new THREE.Color('#5a1060') : new THREE.Color(0),
    emissiveMap: glow ? atlas : null,
    emissiveIntensity: glow ? 0.35 : 0
  });
  addWind(leaves, { flutter: 0.06 });
  addTranslucency(leaves, glow ? 1.4 : 1.1, glow ? new THREE.Color(1, 0.7, 1) : new THREE.Color(1, 0.92, 0.55));
  if (glow) {
    addRegionTint(leaves);
    addRegionTint(wood, new THREE.Color(0.7, 0.55, 1.05));
  }
  const leafDepth = windDepthMaterial({ map: atlas, alphaTest: 0.42, flutter: 0.06 });
  const woodDepth = windDepthMaterial();
  return { wood, leaves, leafDepth, woodDepth };
}

/**
 * A forest of ordinary trees from a few grown variants per kind, instanced,
 * with a near and a far level of detail; which instance draws at which
 * level (or not at all, past the fog) is decided every few frames.
 */
export class TreeField {
  constructor(bank, trees, heightAt, { variants = 4, lod = 1, msaa = true } = {}) {
    this.group = new THREE.Group();
    this.kinds = {};
    const byKind = {};
    for (const t of trees) (byKind[t.kind] ??= []).push(t);
    for (const [kind, list] of Object.entries(byKind)) {
      const mats = treeMaterials(bank, kind, { msaa });
      const sizes = { oak: [17, 0.55], birch: [15, 0.32], gloam: [22, 0.75] }[kind] ?? [18, 0.55];
      const vars = [];
      for (let v = 0; v < variants; v++) {
        const near = growTree(kind, { seed: 500 + v * 31 + kind.length, height: sizes[0] * (0.85 + v * 0.1), radius: sizes[1] * (0.9 + v * 0.08), detail: 0.8 * lod });
        const far = growTree(kind, { seed: 500 + v * 31 + kind.length, height: sizes[0] * (0.85 + v * 0.1), radius: sizes[1] * (0.9 + v * 0.08), detail: 0.38 * lod, roots: false });
        const mk = (geo, mat, depth, max) => {
          const m = new THREE.InstancedMesh(geo, mat, max);
          m.customDepthMaterial = depth;
          m.castShadow = true;
          m.receiveShadow = true;
          m.count = 0;
          m.frustumCulled = false;
          this.group.add(m);
          return m;
        };
        const max = list.length;
        // Only the near trees cast shadows: the shadow box reaches no farther than they do.
        const farSet = [mk(far.wood, mats.wood, mats.woodDepth, max), mk(far.leaves, mats.leaves, mats.leafDepth, max)];
        for (const m of farSet) m.castShadow = false;
        vars.push({
          near: [mk(near.wood, mats.wood, mats.woodDepth, max), mk(near.leaves, mats.leaves, mats.leafDepth, max)],
          far: farSet,
          radius: near.crown.r + 4,
          height: near.height
        });
        far.wood.dispose?.();
      }
      const items = list.map((t, i) => {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromAxisAngle(UP, (t.seed % 628) / 100);
        const y = heightAt(t.x, t.z);
        m.compose(new THREE.Vector3(t.x, y, t.z), q, new THREE.Vector3(t.s, t.s * (0.9 + (t.seed % 20) / 100), t.s));
        return { t, m, v: i % variants };
      });
      this.kinds[kind] = { vars, items, mats };
    }
    this._frame = 0;
    this._frustum = new THREE.Frustum();
    this._pm = new THREE.Matrix4();
    this._sphere = new THREE.Sphere();
  }

  /** Re-sort instances into near / far / hidden for this camera. */
  update(camera, focus, { nearDist = 70, farDist = 420, shadowDist = 70 } = {}) {
    if (this._frame++ % 4) return;
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pm);
    for (const k of Object.values(this.kinds)) {
      for (const v of k.vars) for (const m of [...v.near, ...v.far]) m.count = 0;
      for (const it of k.items) {
        const v = k.vars[it.v];
        const dx = it.t.x - camera.position.x;
        const dz = it.t.z - camera.position.z;
        const d = Math.hypot(dx, dz);
        if (d > farDist) continue;
        this._sphere.center.set(it.t.x, camera.position.y * 0 + v.height * 0.5 * it.t.s, it.t.z);
        this._sphere.radius = v.radius * it.t.s + v.height * 0.5;
        const fd = Math.hypot(it.t.x - focus.x, it.t.z - focus.z);
        if (!this._frustum.intersectsSphere(this._sphere) && fd > shadowDist) continue;
        const set = d < nearDist ? v.near : v.far;
        for (const m of set) m.setMatrixAt(m.count++, it.m);
      }
      for (const v of k.vars) for (const m of [...v.near, ...v.far]) m.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
  }
}

/** One giant, its own mesh (they're the scenery's heroes). */
export function giantTree(bank, kind, spec, heightAt, { msaa = true, detail = 1 } = {}) {
  const mats = treeMaterials(bank, kind, { msaa });
  const t = growTree(kind, { seed: spec.seed, height: spec.h, radius: spec.r, detail });
  const group = new THREE.Group();
  const wood = new THREE.Mesh(t.wood, mats.wood);
  const leaves = new THREE.Mesh(t.leaves, mats.leaves);
  wood.customDepthMaterial = mats.woodDepth;
  leaves.customDepthMaterial = mats.leafDepth;
  for (const m of [wood, leaves]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  group.add(wood, leaves);
  group.position.set(spec.x, heightAt(spec.x, spec.z), spec.z);
  group.rotation.y = (spec.seed % 7) * 0.9;
  return { group, crown: t.crown, mats };
}
