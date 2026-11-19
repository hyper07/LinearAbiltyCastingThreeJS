/**
 * Kindlewatch's image maths, pure (typed arrays in, typed arrays out — no
 * canvas, no DOM), so the painted sprites and the shadow field can be built
 * anywhere and tested in Node:
 *
 *   - an exact Euclidean distance transform (Felzenszwalb & Huttenlocher),
 *   - height from a painted shape's alpha (a soft dome: the distance to its
 *     edge, eased), then normals from that height (central differences),
 *   - a signed distance field of the blocks that cast shadows,
 *   - a dilated mask, for the thick ink outline round a whole sprite.
 *
 * Conventions: images are row-major, y down (canvas order). Normals are
 * returned in world terms — x right, y *north* (up the screen), z out of the
 * ground toward the camera — so a pixel on the lower edge of a dome faces
 * south (ny < 0) and catches a light standing south of it.
 */

const INF = 1e20;

/** 1D squared distance transform of a sampled function (in place into d). */
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/**
 * Distance (in pixels) from every pixel to the nearest seed pixel.
 * @param {ArrayLike<boolean|number>} seed truthy where a seed is
 * @returns {Float32Array}
 */
export function distanceTransform(seed, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = seed[i] ? 0 : INF;
  // Columns, then rows.
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** Distance from each inside pixel (alpha ≥ threshold) to the nearest outside one; 0 outside. Pixels past the image edge count as outside. */
export function insideDistance(alpha, w, h, threshold = 128) {
  // Pad by one so the image border is "outside".
  const pw = w + 2;
  const ph = h + 2;
  const seed = new Uint8Array(pw * ph).fill(1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) seed[(y + 1) * pw + x + 1] = alpha[y * w + x] >= threshold ? 0 : 1;
  const dist = distanceTransform(seed, pw, ph);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = dist[(y + 1) * pw + x + 1];
  return out;
}

/**
 * Height (0…1) of a painted shape: a dome that rises over `radius` pixels
 * from its edge and is flat on top after that. `profile` 'round' (a
 * quarter circle: soft bodies, slimes), 'bevel' (straight: stone, metal) or
 * 'pillow' (eased: cloth, fur).
 */
export function heightFromAlpha(alpha, w, h, { radius = 12, profile = 'round', threshold = 128 } = {}) {
  const d = insideDistance(alpha, w, h, threshold);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (alpha[i] < threshold) continue;
    const t = Math.min(1, d[i] / Math.max(1, radius));
    out[i] = profile === 'bevel' ? t : profile === 'pillow' ? t * t * (3 - 2 * t) : Math.sqrt(1 - (1 - t) * (1 - t));
  }
  return out;
}

/**
 * Normals from a height field: central differences, scaled by `strength`
 * (bigger = steeper-looking edges). Returns xyz triples in world terms
 * (x right, y north, z up), unit length.
 */
export function normalsFromHeight(height, w, h, strength = 2) {
  const out = new Float32Array(w * h * 3);
  const at = (x, y) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5; // canvas y grows downward (south)
      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 3;
      out[i] = nx / len;
      out[i + 1] = ny / len;
      out[i + 2] = nz / len;
    }
  }
  return out;
}

/** Normals packed into bytes (x, y → 0…255; z is rebuilt in the shader), with `extra` in the third byte and `alpha` in the fourth. */
export function packNormals(normals, w, h, { extra = null, alpha = null, out = null } = {}) {
  const data = out ?? new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = Math.round((normals[i * 3] * 0.5 + 0.5) * 255);
    data[i * 4 + 1] = Math.round((normals[i * 3 + 1] * 0.5 + 0.5) * 255);
    data[i * 4 + 2] = extra ? extra[i] : 0;
    data[i * 4 + 3] = alpha ? alpha[i] : 255;
  }
  return data;
}

/** Decode one packed normal (for tests and the CPU side). */
export function unpackNormal(r, g) {
  const x = (r / 255) * 2 - 1;
  const y = (g / 255) * 2 - 1;
  return [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
}

/**
 * Signed distance (pixels) to the edge of the solid cells: positive outside
 * a solid, negative inside.
 */
export function signedDistance(solid, w, h) {
  const out = distanceTransform(solid, w, h);
  const inv = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inv[i] = solid[i] ? 0 : 1;
  const inside = distanceTransform(inv, w, h);
  const sdf = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) sdf[i] = solid[i] ? -(inside[i] - 0.5) : out[i] - 0.5;
  return sdf;
}

/** A mask grown by `r` pixels (alpha ≥ threshold counts as in): for the ink line round a sprite. Soft-edged (0…255) over the last pixel. */
export function dilate(alpha, w, h, r, threshold = 100) {
  const seed = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) seed[i] = alpha[i] >= threshold ? 1 : 0;
  const d = distanceTransform(seed, w, h);
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.round(Math.max(0, Math.min(1, r + 0.5 - d[i])) * 255);
  return out;
}

/** The biggest value within `r` pixels (a square max filter, separable): "how tall is the nearest block". */
export function maxFilter(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.max(m, src[y * w + k]);
      tmp[y * w + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.max(m, tmp[k * w + x]);
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Float to IEEE half (for the half-float shadow field), without three.js. */
export function toHalf(val) {
  const f = new Float32Array(1);
  const i = new Int32Array(f.buffer);
  f[0] = val;
  const x = i[0];
  let bits = (x >> 16) & 0x8000;
  let m = (x >> 12) & 0x07ff;
  const e = (x >> 23) & 0xff;
  if (e < 103) return bits;
  if (e > 142) {
    bits |= 0x7c00;
    bits |= (e === 255 ? 0 : 1) && x & 0x007fffff;
    return bits;
  }
  if (e < 113) {
    m |= 0x0800;
    bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
    return bits;
  }
  bits |= ((e - 112) << 10) | (m >> 1);
  bits += m & 1;
  return bits;
}
