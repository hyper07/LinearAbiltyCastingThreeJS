/**
 * Sculpting Lanternwood's figures from signed distance shapes — the soft
 * vinyl-toy method of AI Arcademia's creatures (src/arcademia/world/creatures/
 * sculpt.js, copied here and adapted so the two games can change apart).
 *
 * A recipe is a list of shapes (spheres, ellipsoids, capsules, tapered cones,
 * rounded boxes, discs), each blended into the body with a smooth union (or
 * carved out with `sub`) and tied to a bone, plus "paint" shapes that only
 * colour the surface. `sculpt()` samples the field on a grid, polygonises it
 * with surface nets, pulls every vertex onto the true surface, takes its
 * normal from the field's gradient, and gives it two-to-four bone weights
 * from the shapes nearest to it.
 *
 * What differs from Arcademia: colours are *slots*, not baked colours. A
 * shape's `col` is a slot name the recipe lists (`skin`, `hair`, `cloth` … or
 * `body`, `belly`, `dark` …) or a fixed '#hex'. Each vertex keeps how much of
 * each of up to eight slots it shows (aSlotA, aSlotB), the rest being its own
 * fixed colour, so one sculpted mesh serves every palette — a hero's armour
 * colour, a villager's coat, an elite's tint — set per figure as uniforms
 * (material.js). Each vertex also keeps a tone (darker or lighter folds), a
 * sheen (metal, gloss) and a glow (eyes, cores, magma cracks).
 *
 * Pure geometry: three.js only for BufferGeometry.
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

/** A 3×3 rotation (row-major) undoing Euler XYZ, or null. */
function rotation(rot, order = 'XYZ') {
  if (!rot || (!rot[0] && !rot[1] && !rot[2])) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], order)).invert().elements;
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

/**
 * Compile one shape into { d(x,y,z), box }.
 *   { s: 'sph', c, r }                  sphere
 *   { s: 'ell', c, r: [rx,ry,rz], rot } ellipsoid
 *   { s: 'cap', a, b, r }               capsule
 *   { s: 'taper', a, b, r: [ra, rb] }   a capsule whose radius goes from ra to rb
 *   { s: 'box', c, r: [hx,hy,hz], round, rot }  rounded box
 *   { s: 'disc', c, r: [radius, half-thickness], rot } a rounded disc (wings, plates)
 * `rot` is Euler angles [x, y, z] in `order` (default 'XYZ').
 */
export function compileShape(sh) {
  const R = rotation(sh.rot, sh.order);
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
    const bax = bx - ax, bay = by - ay, baz = bz - az, bb = bax * bax + bay * bay + baz * baz || 1e-9;
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
      return Math.hypot(Math.max(q, 0), pz) - th;
    };
    const m = rad + th;
    box = [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m];
  } else throw new Error(`unknown shape ${sh.s}`);
  return { d, box };
}

/* ---------------------------------------------------------------- a compiled recipe */

/**
 * recipe = {
 *   slots: ['skin', 'hair', …]                            up to eight palette names
 *   bones: [[name, parent|null, x, y, z], …]              rest positions (feet at y = 0, facing +z)
 *   parts: [{ …shape, k, bone, col, tone, sheen, glow, sub }]  the body
 *   paint: [{ …shape, col, tone, sheen, glow, soft }]      colour only: wins where the surface is inside it
 *   blend                                                 how far colours mix across a seam (m)
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
  const gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
  const l = Math.hypot(gx, gy, gz) || 1;
  out[0] = gx / l; out[1] = gy / l; out[2] = gz / l;
  return out;
}

/** March from `o` along unit `dir` to the surface; the hit point or null. */
export function trace(sdf, o, dir, max = 3) {
  let t = 0;
  for (let i = 0; i < 200 && t < max; i++) {
    const x = o[0] + dir[0] * t, y = o[1] + dir[1] * t, z = o[2] + dir[2] * t;
    const d = sdf(x, y, z);
    if (d < 0.0005) return [x, y, z];
    t += Math.max(d * 0.8, 0.001);
  }
  return null;
}

/* ---------------------------------------------------------------- polygonise */

/** How a shape's colour reads: a slot index (0–7) or a fixed colour. */
function colourOf(col, slots, cache) {
  if (col == null) return { slot: 0 };
  if (typeof col === 'number') return { slot: col };
  const i = slots.indexOf(col);
  if (i >= 0) return { slot: i };
  if (!cache.has(col)) cache.set(col, { fixed: new THREE.Color(col) });
  return cache.get(col);
}

/**
 * The figure's skinned geometry. `res` is the number of grid cells along the
 * longest side. Attributes: position, normal, color (the fixed colour),
 * aSlotA / aSlotB (weights of slots 0–3 and 4–7), aTone (brightness, sheen),
 * aGlow, skinIndex, skinWeight.
 */
export function sculpt(model, { res = 56 } = {}) {
  const { parts, paint, sdf, box, recipe } = model;
  const slots = recipe.slots ?? [];
  const pad = 0.04;
  const min = [box[0] - pad, box[1] - pad, box[2] - pad];
  const size = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]) + pad * 2;
  const h = size / res;
  const nx = Math.ceil((box[3] - box[0] + pad * 2) / h) + 1, ny = Math.ceil((box[4] - box[1] + pad * 2) / h) + 1, nz = Math.ceil((box[5] - box[2] + pad * 2) / h) + 1;
  const N = nx * ny * nz;
  const field = new Float32Array(N).fill(1e3);
  const at = (i, j, k) => i + nx * (j + ny * k);
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
  const CORNERS = Array.from({ length: 8 }, (_, c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1]);
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
      if (v[c0] < 0 === v[c1] < 0) continue;
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
    if (f0 !== field[at(i + 1, j, k)] < 0) quad(cellVert[at(i, j - 1, k - 1)], cellVert[at(i, j, k - 1)], cellVert[at(i, j, k)], cellVert[at(i, j - 1, k)], !f0);
    if (f0 !== field[at(i, j + 1, k)] < 0) quad(cellVert[at(i - 1, j, k - 1)], cellVert[at(i - 1, j, k)], cellVert[at(i, j, k)], cellVert[at(i, j, k - 1)], !f0);
    if (f0 !== field[at(i, j, k + 1)] < 0) quad(cellVert[at(i - 1, j - 1, k)], cellVert[at(i, j - 1, k)], cellVert[at(i, j, k)], cellVert[at(i - 1, j, k)], !f0);
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
  // Colour slots, tone, sheen, glow and bone weights from the shapes.
  const boneIndex = new Map(recipe.bones.map((b, i) => [b[0], i]));
  const cache = new Map();
  const pc = parts.map((p) => colourOf(p.col, slots, cache));
  const qc = paint.map((p) => colourOf(p.col, slots, cache));
  const colors = new Float32Array(count * 3), slotA = new Float32Array(count * 4), slotB = new Float32Array(count * 4);
  const tone = new Float32Array(count * 2), glow = new Float32Array(count);
  const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
  const blend = recipe.blend ?? 0.012;
  const boneW = new Float32Array(recipe.bones.length);
  const ds = new Float32Array(parts.length);
  const sw = new Float32Array(9); // eight slots, then the fixed colour
  const order = [];
  for (let vi = 0; vi < count; vi++) {
    const x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
    let best = 1e9;
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].sub) {
        ds[i] = parts[i].d(x, y, z);
        continue;
      }
      // A carve hides the shapes listed before it (as it does in the field), so they do not colour its hollow.
      const dc = -parts[i].d(x, y, z);
      ds[i] = 1e9;
      for (let j = 0; j < i; j++) if (!parts[j].sub && dc > ds[j]) ds[j] = dc;
    }
    for (let i = 0; i < parts.length; i++) if (ds[i] < best) best = ds[i];
    sw.fill(0);
    boneW.fill(0);
    let fr = 0, fg = 0, fb = 0, W = 0, tn = 0, sh = 0, gl = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.sub) continue;
      const w = Math.exp(-(ds[i] - best) / blend);
      if (w > 1e-4) {
        const c = pc[i];
        if (c.fixed) {
          sw[8] += w;
          fr += w * c.fixed.r; fg += w * c.fixed.g; fb += w * c.fixed.b;
        } else sw[c.slot] += w;
        W += w;
        tn += w * (p.tone ?? 1);
        sh += w * (p.sheen ?? 0);
        gl += w * (p.glow ?? 0);
      }
      if (p.bone != null) boneW[boneIndex.get(p.bone)] += Math.exp(-Math.max(0, ds[i] - best) / (p.k * 0.15 + 0.006));
    }
    for (let s = 0; s < 9; s++) sw[s] /= W || 1;
    let r = sw[8] ? fr / (sw[8] * W) : 1, gg = sw[8] ? fg / (sw[8] * W) : 1, b = sw[8] ? fb / (sw[8] * W) : 1;
    tn /= W || 1; sh /= W || 1; gl /= W || 1;
    // Paint: crisp but anti-aliased over a hair of distance.
    for (let i = 0; i < paint.length; i++) {
      const p = paint[i];
      const d = p.d(x, y, z);
      const soft = p.soft ?? 0.008;
      if (d > soft) continue;
      const a = clamp(0.5 - d / (2 * soft), 0, 1);
      if (a <= 0) continue;
      for (let s = 0; s < 9; s++) sw[s] *= 1 - a;
      const c = qc[i];
      if (c.fixed) {
        const wf = sw[8];
        r = (r * wf + c.fixed.r * a) / (wf + a); gg = (gg * wf + c.fixed.g * a) / (wf + a); b = (b * wf + c.fixed.b * a) / (wf + a);
        sw[8] += a;
      } else sw[c.slot] += a;
      if (p.tone != null) tn += (p.tone - tn) * a;
      if (p.sheen != null) sh += (p.sheen - sh) * a;
      if (p.glow != null) gl += (p.glow - gl) * a;
    }
    colors[vi * 3] = r; colors[vi * 3 + 1] = gg; colors[vi * 3 + 2] = b;
    for (let s = 0; s < 4; s++) {
      slotA[vi * 4 + s] = sw[s];
      slotB[vi * 4 + s] = sw[s + 4];
    }
    tone[vi * 2] = tn; tone[vi * 2 + 1] = sh;
    glow[vi] = gl;
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
  geo.setAttribute('aSlotA', new THREE.BufferAttribute(slotA, 4));
  geo.setAttribute('aSlotB', new THREE.BufferAttribute(slotB, 4));
  geo.setAttribute('aTone', new THREE.BufferAttribute(tone, 2));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
