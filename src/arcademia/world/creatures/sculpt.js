/**
 * Sculpting soft-vinyl-toy creatures from signed distance shapes.
 *
 * A recipe is a list of shapes (spheres, ellipsoids, capsules, tapered cones,
 * rounded boxes), each blended into the body with a smooth union and tied to a
 * bone, plus "paint" shapes that only colour the surface (a white muzzle, dark
 * ear tips, a belly). `sculpt()` samples the field on a grid, polygonises it
 * with surface nets, then pulls every vertex onto the true surface and takes
 * its normal from the field's gradient, so the result is smooth at any
 * resolution. Each vertex also gets its colour and two-to-four bone weights
 * from the shapes nearest to it (the shapes are known, so the weights come out
 * clean).
 *
 * The method follows knowledge/assets-guide.md §5.3 (the SDF fox proof).
 */
import * as THREE from 'three';

/* ---------------------------------------------------------------- shapes */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** Polynomial smooth minimum (blend radius k). */
export const smin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);

/** A 3×3 rotation (row-major) from Euler XYZ, or null. */
function rotation(rot) {
  if (!rot || (!rot[0] && !rot[1] && !rot[2])) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])).invert().elements;
  // column-major → apply as p' = M p
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

/**
 * Compile one shape into { d(x,y,z), box: [minx,miny,minz,maxx,maxy,maxz] }.
 *   { s: 'sph', c, r }                  sphere
 *   { s: 'ell', c, r: [rx,ry,rz], rot } ellipsoid (approximate distance, fine for sculpting)
 *   { s: 'cap', a, b, r }               capsule
 *   { s: 'taper', a, b, r: [ra, rb] }   a capsule whose radius goes from ra to rb
 *   { s: 'box', c, r: [hx,hy,hz], round, rot }  rounded box
 *   { s: 'disc', c, r: [radius, half-thickness], rot } a rounded disc (wings, plates)
 */
export function compileShape(sh) {
  const R = rotation(sh.rot);
  const local = (x, y, z, c) => {
    let px = x - c[0], py = y - c[1], pz = z - c[2];
    if (R) {
      const qx = R[0] * px + R[1] * py + R[2] * pz, qy = R[3] * px + R[4] * py + R[5] * pz, qz = R[6] * px + R[7] * py + R[8] * pz;
      px = qx; py = qy; pz = qz;
    }
    return [px, py, pz];
  };
  let d, box;
  if (sh.s === 'sph') {
    const [cx, cy, cz] = sh.c, r = sh.r;
    d = (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r;
    box = [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r];
  } else if (sh.s === 'ell') {
    const c = sh.c, [rx, ry, rz] = sh.r;
    d = (x, y, z) => {
      const [px, py, pz] = local(x, y, z, c);
      const k0 = Math.hypot(px / rx, py / ry, pz / rz);
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
    };
    const m = Math.max(rx, ry, rz);
    box = R ? [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m] : [c[0] - rx, c[1] - ry, c[2] - rz, c[0] + rx, c[1] + ry, c[2] + rz];
  } else if (sh.s === 'cap' || sh.s === 'taper') {
    const [ax, ay, az] = sh.a, [bx, by, bz] = sh.b;
    const ra = sh.s === 'cap' ? sh.r : sh.r[0], rb = sh.s === 'cap' ? sh.r : sh.r[1];
    const bax = bx - ax, bay = by - ay, baz = bz - az, bb = bax * bax + bay * bay + baz * baz;
    d = (x, y, z) => {
      const pax = x - ax, pay = y - ay, paz = z - az;
      const h = clamp((pax * bax + pay * bay + paz * baz) / bb, 0, 1);
      return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
    };
    const m = Math.max(ra, rb);
    box = [Math.min(ax, bx) - m, Math.min(ay, by) - m, Math.min(az, bz) - m, Math.max(ax, bx) + m, Math.max(ay, by) + m, Math.max(az, bz) + m];
  } else if (sh.s === 'box') {
    const c = sh.c, [hx, hy, hz] = sh.r, rr = sh.round ?? 0.05;
    d = (x, y, z) => {
      const [px, py, pz] = local(x, y, z, c);
      const qx = Math.abs(px) - hx + rr, qy = Math.abs(py) - hy + rr, qz = Math.abs(pz) - hz + rr;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr;
    };
    const m = Math.hypot(hx, hy, hz);
    box = [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m];
  } else if (sh.s === 'disc') {
    const c = sh.c, [rad, th] = sh.r;
    d = (x, y, z) => {
      const [px, py, pz] = local(x, y, z, c);
      const q = Math.hypot(px, py) - rad;
      return Math.hypot(Math.max(q, 0), pz) + Math.min(q, 0) * 0 - th;
    };
    const m = rad + th;
    box = [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m];
  } else throw new Error(`unknown shape ${sh.s}`);
  return { d, box };
}

/* ---------------------------------------------------------------- a compiled recipe */

/**
 * recipe = {
 *   bones: [[name, parent|null, x, y, z], …]            rest positions (world, feet at y = 0)
 *   parts: [{ …shape, k (blend), bone, col, sub? }, …]   the body; col: 'body' | 'dark' | 'light' | '#hex'
 *   paint: [{ …shape, col, soft? }, …]                    colour only: wins where the surface is inside it
 * }
 */
export function compile(recipe) {
  const parts = recipe.parts.map((p) => ({ ...p, ...compileShape(p), k: p.k ?? 0.06 }));
  const paint = (recipe.paint ?? []).map((p) => ({ ...p, ...compileShape(p) }));
  const sdf = (x, y, z) => {
    let acc = 1e9;
    for (const p of parts) {
      const d = p.d(x, y, z);
      acc = p.sub ? smax(acc, -d, p.k) : smin(acc, d, p.k);
    }
    return acc;
  };
  const box = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const p of parts) if (!p.sub) for (let i = 0; i < 3; i++) {
    box[i] = Math.min(box[i], p.box[i]);
    box[i + 3] = Math.max(box[i + 3], p.box[i + 3]);
  }
  return { recipe, parts, paint, sdf, box };
}

/** Unit gradient of the field at a point (tetrahedral differences). */
export function gradient(sdf, x, y, z, e = 0.002, out = [0, 0, 0]) {
  const a = sdf(x + e, y - e, z - e), b = sdf(x - e, y - e, z + e), c = sdf(x - e, y + e, z - e), d = sdf(x + e, y + e, z + e);
  let gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
  const l = Math.hypot(gx, gy, gz) || 1;
  out[0] = gx / l; out[1] = gy / l; out[2] = gz / l;
  return out;
}

/** March from `o` along unit `dir` to the surface; the hit point or null. */
export function trace(sdf, o, dir, max = 3) {
  let t = 0;
  for (let i = 0; i < 160 && t < max; i++) {
    const x = o[0] + dir[0] * t, y = o[1] + dir[1] * t, z = o[2] + dir[2] * t;
    const d = sdf(x, y, z);
    if (d < 0.0005) return [x, y, z];
    t += Math.max(d * 0.8, 0.001);
  }
  return null;
}

/* ---------------------------------------------------------------- polygonise */

/**
 * The creature's skinned geometry: position, normal, color, tint (how much of
 * the body colour shows, and how bright), skinIndex, skinWeight.
 * `res` is the number of grid cells along the longest side.
 */
export function sculpt(model, { res = 72 } = {}) {
  const { parts, paint, sdf, box, recipe } = model;
  const pad = 0.04;
  const min = [box[0] - pad, box[1] - pad, box[2] - pad];
  const size = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]) + pad * 2;
  const h = size / res;
  const nx = Math.ceil((box[3] - box[0] + pad * 2) / h) + 1, ny = Math.ceil((box[4] - box[1] + pad * 2) / h) + 1, nz = Math.ceil((box[5] - box[2] + pad * 2) / h) + 1;
  const N = nx * ny * nz;
  const field = new Float32Array(N).fill(1e3);
  const at = (i, j, k) => i + nx * (j + ny * k);
  // Every shape writes into the voxels of its own box (plus its blend radius): exact near the surface.
  for (const p of parts) {
    const m = p.k + h * 2;
    const i0 = Math.max(0, Math.floor((p.box[0] - m - min[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((p.box[3] + m - min[0]) / h));
    const j0 = Math.max(0, Math.floor((p.box[1] - m - min[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((p.box[4] + m - min[1]) / h));
    const k0 = Math.max(0, Math.floor((p.box[2] - m - min[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((p.box[5] + m - min[2]) / h));
    for (let k = k0; k <= k1; k++) {
      const z = min[2] + k * h;
      for (let j = j0; j <= j1; j++) {
        const y = min[1] + j * h;
        let idx = at(i0, j, k);
        for (let i = i0; i <= i1; i++, idx++) {
          const d = p.d(min[0] + i * h, y, z);
          field[idx] = p.sub ? smax(field[idx], -d, p.k) : smin(field[idx], d, p.k);
        }
      }
    }
  }
  // Surface nets: one vertex per cell the surface crosses, one quad per crossed grid edge.
  const cellVert = new Int32Array(N).fill(-1);
  const pos = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const corner = (c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  const CORNERS = Array.from({ length: 8 }, (_, c) => corner(c));
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const [a, b, e] = CORNERS[c];
      v[c] = field[at(i + a, j + b, k + e)];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [c0, c1] of EDGES) {
      const in0 = v[c0] < 0, in1 = v[c1] < 0;
      if (in0 === in1) continue;
      const t = v[c0] / (v[c0] - v[c1]);
      const A = CORNERS[c0], B = CORNERS[c1];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t;
      n++;
    }
    cellVert[at(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
  }
  const index = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = field[at(i, j, k)] < 0;
    // edge along x from (i,j,k): cells around it in y,z
    if (i < nx - 1 && f0 !== field[at(i + 1, j, k)] < 0) quad(cellVert[at(i, j - 1, k - 1)], cellVert[at(i, j, k - 1)], cellVert[at(i, j, k)], cellVert[at(i, j - 1, k)], !f0);
    if (j < ny - 1 && f0 !== field[at(i, j + 1, k)] < 0) quad(cellVert[at(i - 1, j, k - 1)], cellVert[at(i - 1, j, k)], cellVert[at(i, j, k)], cellVert[at(i, j, k - 1)], !f0);
    if (k < nz - 1 && f0 !== field[at(i, j, k + 1)] < 0) quad(cellVert[at(i - 1, j - 1, k)], cellVert[at(i, j - 1, k)], cellVert[at(i, j, k)], cellVert[at(i - 1, j, k)], !f0);
  }
  // Onto the true surface, with the field's own normals.
  const count = pos.length / 3;
  const P = new Float32Array(pos), Nrm = new Float32Array(count * 3);
  const g = [0, 0, 0], e = h * 0.35;
  for (let vi = 0; vi < count; vi++) {
    let x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
    for (let it = 0; it < 3; it++) {
      const d = sdf(x, y, z);
      if (Math.abs(d) < 1e-5) break;
      gradient(sdf, x, y, z, e, g);
      const step = clamp(d, -h, h);
      x -= g[0] * step; y -= g[1] * step; z -= g[2] * step;
    }
    gradient(sdf, x, y, z, e, g);
    P[vi * 3] = x; P[vi * 3 + 1] = y; P[vi * 3 + 2] = z;
    Nrm[vi * 3] = g[0]; Nrm[vi * 3 + 1] = g[1]; Nrm[vi * 3 + 2] = g[2];
  }
  // Wind every triangle to face along the field's normal.
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
    const nx2 = Nrm[a] + Nrm[b] + Nrm[c], ny2 = Nrm[a + 1] + Nrm[b + 1] + Nrm[c + 1], nz2 = Nrm[a + 2] + Nrm[b + 2] + Nrm[c + 2];
    if (cx * nx2 + cy * ny2 + cz * nz2 < 0) {
      const tmp = index[t + 1];
      index[t + 1] = index[t + 2];
      index[t + 2] = tmp;
    }
  }
  // Colour, body tint and bone weights from the shapes.
  const boneIndex = new Map(recipe.bones.map((b, i) => [b[0], i]));
  const colors = new Float32Array(count * 3), tint = new Float32Array(count * 2);
  const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
  const TONE = { body: [1, 1], dark: [1, 0.68], light: [1, 1.18], deep: [1, 0.48] };
  const fixed = new Map();
  const colorOf = (c) => {
    if (!fixed.has(c)) fixed.set(c, new THREE.Color(c));
    return fixed.get(c);
  };
  const boneW = new Float32Array(recipe.bones.length);
  const ds = new Float32Array(parts.length);
  const order = [];
  for (let vi = 0; vi < count; vi++) {
    const x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
    let best = 1e9;
    for (let i = 0; i < parts.length; i++) {
      ds[i] = parts[i].sub ? 1e9 : parts[i].d(x, y, z);
      if (ds[i] < best) best = ds[i];
    }
    // colour: a soft mix of the nearest shapes (body tones are coloured in the shader) …
    let tw = 0, tl = 0, fr = 0, fg = 0, fb = 0, fw = 0;
    boneW.fill(0);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.sub) continue;
      const w = Math.exp(-(ds[i] - best) / 0.012);
      if (w > 1e-4) {
        const tone = TONE[p.col ?? 'body'];
        if (tone) {
          tw += w;
          tl += w * tone[1];
        } else {
          const c = colorOf(p.col);
          fr += w * c.r; fg += w * c.g; fb += w * c.b; fw += w;
        }
      }
      // bones: inverse-distance falloff to each shape, summed per bone
      if (p.bone != null) boneW[boneIndex.get(p.bone)] += Math.exp(-Math.max(0, ds[i] - best) / (p.k * 0.15 + 0.006));
    }
    let tintW = tw / (tw + fw || 1), tintL = tw ? tl / tw : 1;
    let r = fw ? fr / fw : 1, gg = fw ? fg / fw : 1, b = fw ? fb / fw : 1;
    // … then paint, crisp but anti-aliased over a hair of distance.
    for (const p of paint) {
      const d = p.d(x, y, z);
      const s2 = p.soft ?? 0.008;
      if (d > s2) continue;
      const a2 = clamp(0.5 - d / (2 * s2), 0, 1);
      const tone = TONE[p.col];
      if (tone) {
        tintL += (tone[1] - tintL) * a2;
        tintW += (1 - tintW) * a2;
      } else {
        const c = colorOf(p.col);
        r += (c.r - r) * a2; gg += (c.g - gg) * a2; b += (c.b - b) * a2;
        tintW *= 1 - a2;
      }
    }
    colors[vi * 3] = r; colors[vi * 3 + 1] = gg; colors[vi * 3 + 2] = b;
    tint[vi * 2] = tintW; tint[vi * 2 + 1] = tintL;
    order.length = 0;
    for (let i = 0; i < boneW.length; i++) if (boneW[i] > 0) order.push(i);
    order.sort((a3, b3) => boneW[b3] - boneW[a3]);
    if (order.length > 4) order.length = 4;
    let sum = 0;
    for (const o of order) sum += boneW[o];
    for (let n = 0; n < 4; n++) {
      skinIndex[vi * 4 + n] = order[n] ?? 0;
      skinWeight[vi * 4 + n] = n < order.length && sum ? boneW[order[n]] / sum : 0;
    }
    if (!order.length) skinWeight[vi * 4] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(Nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
