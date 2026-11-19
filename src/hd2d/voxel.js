/**
 * Pixel sprites made solid: every pixel of a character's drawing becomes a
 * little block, and each part of the body gets its own rounded depth — a
 * domed head with a nose and cheeks pushed out a little and hair standing
 * proud of it, round arms and legs, a body with soft edges — so the
 * characters stand in the world as 3D figures that turn, catch the
 * firelight on their sides and cast real shadows, not paper cut-outs.
 *
 * Detail: `step` sprite pixels a block. The sprites are drawn at 4× detail,
 * so step 1 keeps every pixel (used close to the camera); step 2 is the
 * cheaper far version (a quarter of the blocks).
 *
 * The front of the body is coloured from the front drawing, the back from
 * the back drawing (mirrored, as seen from behind), the sides from whichever
 * half they are on. Colours carry baked soft shading: corners tucked under a
 * prouder neighbour darken (ambient occlusion), slopes facing away darken,
 * undersides darken, and a figure darkens a touch toward its feet. Blocks of
 * a glowing material carry an `aGlow` attribute (0…1) the material lights.
 *
 *   const geo = voxelGeometry(sprite);              // whole figure, feet at y = 0, facing +Z
 *   const { parts, joints } = voxelParts(sprite);   // a person in jointed parts (rig.js)
 *   const p = voxelPieces(sprite, spec);            // any figure cut by a spec (beasts.js)
 *
 * A sprite may carry: `rows` (its letter map: lets bumps and glows follow
 * materials), `back` (its back view, with its own `rows`), `blink` (the
 * same figure with its eyes shut), `depth` (half its thickness at the
 * thickest, in metres; 0.3 by default), `profile` (drawn from the side,
 * like the wolf: the far flank is the same drawing, not a back), `glow`
 * (letters that glow: { E: 0.8 }).
 */
import * as THREE from 'three';
import { PXM } from './sprites.js';

const cache = new Map(); // `${step}` → WeakMap(sprite → geometry)
const tmp = new THREE.Color();
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function pixelsOf(sprite) {
  if (sprite._px) return sprite._px;
  const g = sprite.canvas.getContext('2d', { willReadFrequently: true });
  sprite._px = g.getImageData(0, 0, sprite.width, sprite.height).data;
  return sprite._px;
}

/** The blocks' grid from a sprite: filled or not, and the colour (linear RGB) of each. */
function sample(sprite, W, H, step, mirror = false) {
  const px = pixelsOf(sprite);
  const sw = sprite.width;
  const fill = new Uint8Array(W * H);
  const col = new Float32Array(W * H * 3);
  const probe = step === 1 ? [[0, 0]] : [[1, 1], [0, 0], [1, 0], [0, 1]];
  for (let j = 0; j < H; j++) {
    for (let i0 = 0; i0 < W; i0++) {
      const i = mirror ? W - 1 - i0 : i0;
      let best = -1;
      for (const [dx, dy] of probe) {
        const x = i * step + dx;
        const y = j * step + dy;
        if (x >= sw || y >= sprite.height) continue;
        const k = (y * sw + x) * 4;
        if (px[k + 3] > 120) {
          best = k;
          break;
        }
      }
      if (best < 0) continue;
      const at = j * W + i0;
      fill[at] = 1;
      tmp.setRGB(px[best] / 255, px[best + 1] / 255, px[best + 2] / 255, THREE.SRGBColorSpace);
      col[at * 3] = tmp.r;
      col[at * 3 + 1] = tmp.g;
      col[at * 3 + 2] = tmp.b;
    }
  }
  return { fill, col };
}

/** Chamfer distance of each filled block to the edge of its shape (in blocks, 1 at the edge). */
export function distanceField(fill, W, H) {
  const d = new Float32Array(W * H);
  const INF = 1e6;
  for (let k = 0; k < W * H; k++) d[k] = fill[k] ? INF : 0;
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : d[j * W + i]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    if (!d[k]) continue;
    d[k] = Math.min(d[k], at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + 1.41, at(i + 1, j - 1) + 1.41);
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
    const k = j * W + i;
    if (!d[k]) continue;
    d[k] = Math.min(d[k], at(i + 1, j) + 1, at(i, j + 1) + 1, at(i + 1, j + 1) + 1.41, at(i - 1, j + 1) + 1.41);
  }
  return d;
}

/**
 * Half the thickness (metres) of a column `d` blocks in from the edge of a
 * part whose deepest block is `maxD` in: 'dome' rounds over the whole part
 * (a head, a slime), 'box' rounds only the edges, `cap` thick in the middle.
 */
export function profileDepth(d, maxD, cap, round = 'dome', v = 1 / PXM) {
  const R = round === 'dome' ? Math.max(1, maxD) : Math.max(1, Math.min(maxD, (cap / v) * 1.1));
  const t = clamp01(d / R);
  return cap * Math.sqrt(1 - (1 - t) * (1 - t));
}

/** The letter (material) a block of a sprite lies in: 4× letters behind a 1-pixel outline; null off the map. */
function letterGrid(rows, W, H, step, mirror = false) {
  if (!rows) return null;
  const out = Array.from({ length: W * H }, () => null);
  const at = (c, r) => {
    const ch = rows[r]?.[c];
    return ch && ch !== '.' && ch !== ' ' ? ch : null;
  };
  for (let j = 0; j < H; j++) for (let i0 = 0; i0 < W; i0++) {
    const i = mirror ? W - 1 - i0 : i0;
    const x = i * step + step / 2 - 1;
    const y = j * step + step / 2 - 1;
    const c = Math.floor(x / 4), r = Math.floor(y / 4);
    // An outline pixel takes the letter it outlines.
    let ch = at(c, r);
    if (!ch) for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if ((ch = at(c + dc, r + dr))) break;
    out[j * W + i0] = ch ? { ch, c: x / 4, r: y / 4 } : null;
  }
  return out;
}

/**
 * Build the blocks of a sprite.
 *   step        sprite pixels a block (1 or 2)
 *   keep(i, j)  only these blocks (a part) — each part is rounded on its own
 *   cap, round  half thickness in metres and the profile ('dome' | 'box')
 *   bump(L)     extra depth for a letter cell L = { ch, c, r }: [front, back] metres
 *   glow        { letter: 0…1 } glowing materials
 *   shadow(y)   a multiplier for blocks at height y (metres) — under a chin, toward the feet
 *   thin        for a profile figure's legs: a fixed half thickness (metres)
 */
function buildVoxels(sprite, { step = 2, keep = null, cap = null, round = 'dome', bump = null, glow = null, shadow = null, thin = null } = {}) {
  const W = Math.floor(sprite.width / step);
  const H = Math.floor(sprite.height / step);
  const v = step / PXM; // a block's size in metres
  const front = sample(sprite, W, H, step);
  let back;
  if (sprite.back) back = sample(sprite.back, W, H, step, true);
  else if (sprite.profile) back = front;
  else {
    // No back drawing: each row's commonest colour (no eyes on the back of a slime).
    back = { fill: front.fill, col: new Float32Array(front.col) };
    for (let j = 0; j < H; j++) {
      const seen = new Map();
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (!front.fill[k]) continue;
        const key = `${front.col[k * 3].toFixed(2)},${front.col[k * 3 + 1].toFixed(2)},${front.col[k * 3 + 2].toFixed(2)}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const common = [...seen.entries()].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(Number);
      if (!common) continue;
      for (let i = 0; i < W; i++) if (front.fill[j * W + i]) back.col.set(common, (j * W + i) * 3);
    }
  }
  // The drawing's 1-pixel ink outline is for flat pixel art: solid, the blocks' own edges and shading
  // draw the outline, so blocks that lie wholly outside the letter map are left out.
  if (sprite.rows) {
    const inLetter = (x, y) => {
      const c = Math.floor((x - 1) / 4), r = Math.floor((y - 1) / 4);
      const ch = x >= 1 && y >= 1 ? sprite.rows[r]?.[c] : null;
      return Boolean(ch && ch !== '.' && ch !== ' ');
    };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (!front.fill[k]) continue;
      let any = false;
      for (let dy = 0; dy < step && !any; dy++) for (let dx = 0; dx < step && !any; dx++) any = inLetter(i * step + dx, j * step + dy);
      if (!any) front.fill[k] = 0;
    }
  }
  const lettersF = letterGrid(sprite.rows, W, H, step);
  const lettersB = sprite.back?.rows ? letterGrid(sprite.back.rows, W, H, step, true) : lettersF;
  const mine = (i, j) => i >= 0 && j >= 0 && i < W && j < H && front.fill[j * W + i] && (!keep || keep(i, j));
  // Each part rounds on its own: the distance field of just its blocks.
  const fill = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (mine(i, j)) fill[j * W + i] = 1;
  const dist = distanceField(fill, W, H);
  let maxD = 1;
  for (let k = 0; k < W * H; k++) if (dist[k] > maxD) maxD = dist[k];
  const capM = cap ?? sprite.depth ?? 0.3;
  // Front and back half-thickness of each column, in blocks (blocky: whole blocks).
  const hF = new Float32Array(W * H).fill(-1);
  const hB = new Float32Array(W * H).fill(-1);
  const glw = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) {
    if (!fill[k]) continue;
    const base = thin != null ? thin : profileDepth(dist[k], maxD, capM, round, v);
    const LF = lettersF?.[k], LB = lettersB?.[k];
    const [bf] = bump && LF ? bump(LF, 'front') : [0];
    const [, bb] = bump && LB ? bump(LB, 'back') : [0, 0];
    hF[k] = Math.max(0.5, Math.round((base + bf) / v - 0.5) + 0.5);
    hB[k] = Math.max(0.5, Math.round((base + (bb ?? 0)) / v - 0.5) + 0.5);
    if (glow && LF && glow[LF.ch]) glw[k] = glow[LF.ch];
  }
  const hAt = (arr, i, j) => (i < 0 || j < 0 || i >= W || j >= H || !fill[j * W + i] ? -1 : arr[j * W + i]);
  // Smooth normals (the smoothing pass): the blocks keep their stepped outline, but light falls on
  // them as on the rounded surface they stand for — from the slope of the (blurred) depth.
  const smoothField = (arr, sign) => {
    const R = Math.max(1, Math.round(0.045 / v));
    const hs = new Float32Array(W * H);
    const tmpH = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let sum = 0, n = 0;
      for (let d = -R; d <= R; d++) {
        const x = i + d;
        sum += x < 0 || x >= W || !fill[j * W + x] ? 0 : arr[j * W + x];
        n++;
      }
      tmpH[j * W + i] = sum / n;
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let sum = 0, n = 0;
      for (let d = -R; d <= R; d++) {
        const y = j + d;
        sum += y < 0 || y >= H ? 0 : tmpH[y * W + i];
        n++;
      }
      hs[j * W + i] = sum / n;
    }
    const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : hs[j * W + i]);
    const cell = new Float32Array(W * H * 3);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (!fill[k]) continue;
      const gx = (at(i + 1, j) - at(i - 1, j)) * 0.5;
      const gy = (at(i, j + 1) - at(i, j - 1)) * 0.5;
      const l = Math.hypot(gx, gy, 1);
      cell[k * 3] = -gx / l;
      cell[k * 3 + 1] = gy / l;
      cell[k * 3 + 2] = sign / l;
    }
    // At each grid corner: the average of the cells round it.
    const corner = new Float32Array((W + 1) * (H + 1) * 3);
    for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
      let x = 0, y = 0, z = 0;
      for (const [ci, cj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
        if (ci < 0 || cj < 0 || ci >= W || cj >= H || !fill[cj * W + ci]) continue;
        const k = (cj * W + ci) * 3;
        x += cell[k];
        y += cell[k + 1];
        z += cell[k + 2];
      }
      const l = Math.hypot(x, y, z) || 1;
      const o = (j * (W + 1) + i) * 3;
      corner[o] = x / l;
      corner[o + 1] = y / l;
      corner[o + 2] = z / l;
    }
    return corner;
  };
  const nF = smoothField(hF, 1);
  const nB = smoothField(hB, -1);

  const pos = [];
  const nor = [];
  const col = [];
  const gl = [];
  const idx = [];
  const x0 = -W / 2;
  const X = (i) => (i + x0) * v;
  const Y = (j) => (H - j) * v; // row 0 at the top
  const Z = (k) => k * v;
  const colour = (k, f) => (f ? front.col : back.col).subarray(k * 3, k * 3 + 3);
  // One quad: four corners (counter-clockwise seen from outside), a normal, a colour, a shade at each corner.
  const quad = (a, b, c, d, n, rgb, shades, g, field = null) => {
    const base = pos.length / 3;
    const pts = [a, b, c, d];
    for (let q = 0; q < 4; q++) {
      const p = pts[q];
      pos.push(p[0], p[1], p[2]);
      if (field) {
        const gi = Math.round(p[0] / v - x0), gj = Math.round(H - p[1] / v);
        const o = (Math.max(0, Math.min(H, gj)) * (W + 1) + Math.max(0, Math.min(W, gi))) * 3;
        // Mostly the smooth surface's normal, a little of the block's own (the steps still catch the light faintly).
        const nx = field[o] * 0.85 + n[0] * 0.15, ny = field[o + 1] * 0.85 + n[1] * 0.15, nz = field[o + 2] * 0.85 + n[2] * 0.15;
        const l = Math.hypot(nx, ny, nz) || 1;
        nor.push(nx / l, ny / l, nz / l);
      } else nor.push(n[0], n[1], n[2]);
      let s = shades[q];
      if (shadow) s *= shadow(p[1]);
      col.push(rgb[0] * s, rgb[1] * s, rgb[2] * s);
      gl.push(g);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // Ambient occlusion at a face corner: how much the neighbours around it stand prouder.
  const occ = (arr, i, j, ci, cj, h) => {
    let sum = 0;
    for (const [di, dj] of [[ci - 1, cj - 1], [ci, cj - 1], [ci - 1, cj], [ci, cj]]) {
      const nh = hAt(arr, i + di, j + dj);
      if (nh > h) sum += Math.min(1, ((nh - h) * v) / 0.05);
    }
    return 1 - 0.32 * Math.min(1, sum / 2);
  };
  // A faint "curvature" shade from the slope of the depth (the smooth normals do most of it): steep is a touch darker.
  const slope = (arr, i, j) => {
    const l = hAt(arr, i - 1, j), r = hAt(arr, i + 1, j), u = hAt(arr, i, j - 1), dn = hAt(arr, i, j + 1);
    const z = (x) => (x < 0 ? 0 : x);
    const gx = (z(r) - z(l)) * 0.5;
    const gy = (z(dn) - z(u)) * 0.5;
    const nz = 1 / Math.sqrt(1 + gx * gx * 0.25 + gy * gy * 0.25);
    return 0.93 + 0.07 * nz;
  };
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (!fill[k]) continue;
      const f = hF[k], b = hB[k];
      const xa = X(i), xb = X(i + 1), ya = Y(j + 1), yb = Y(j);
      bounds.minX = Math.min(bounds.minX, xa);
      bounds.maxX = Math.max(bounds.maxX, xb);
      bounds.minY = Math.min(bounds.minY, ya);
      bounds.maxY = Math.max(bounds.maxY, yb);
      const g = glw[k];
      const zf = Z(f), zb = Z(-b);
      // Front: corners (xa,ya) (xb,ya) (xb,yb) (xa,yb) → grid corners (i,j+1) (i+1,j+1) (i+1,j) (i,j).
      const sf = slope(hF, i, j);
      quad([xa, ya, zf], [xb, ya, zf], [xb, yb, zf], [xa, yb, zf], [0, 0, 1], colour(k, true),
        [occ(hF, i, j, 0, 1, f) * sf, occ(hF, i, j, 1, 1, f) * sf, occ(hF, i, j, 1, 0, f) * sf, occ(hF, i, j, 0, 0, f) * sf], g, nF);
      const sb = slope(hB, i, j);
      quad([xb, ya, zb], [xa, ya, zb], [xa, yb, zb], [xb, yb, zb], [0, 0, -1], colour(k, false),
        [occ(hB, i, j, 1, 1, b) * sb, occ(hB, i, j, 0, 1, b) * sb, occ(hB, i, j, 0, 0, b) * sb, occ(hB, i, j, 1, 0, b) * sb], g, nB);
      // The sides: only where they stand out past the neighbour, front half and back half apart.
      // Shade: darker toward the crease (where the neighbour's surface meets it), undersides dark.
      const sides = [
        [-1, 0, (z0, z1) => [[xa, ya, z0], [xa, ya, z1], [xa, yb, z1], [xa, yb, z0]], [-1, 0, 0], 0.92],
        [1, 0, (z0, z1) => [[xb, ya, z1], [xb, ya, z0], [xb, yb, z0], [xb, yb, z1]], [1, 0, 0], 0.92],
        [0, -1, (z0, z1) => [[xa, yb, z0], [xa, yb, z1], [xb, yb, z1], [xb, yb, z0]], [0, 1, 0], 1.06],
        [0, 1, (z0, z1) => [[xa, ya, z1], [xa, ya, z0], [xb, ya, z0], [xb, ya, z1]], [0, -1, 0], 0.62]
      ];
      for (const [di, dj, corners, n, lit] of sides) {
        const nf = hAt(hF, i + di, j + dj), nb = hAt(hB, i + di, j + dj);
        // Front half: from the neighbour's front surface (or the middle) out to ours.
        if (nf < f) {
          const inner = nf < 0 ? 0 : nf;
          const [a, bq, c, d] = corners(Z(inner), Z(f));
          const deep = nf < 0 ? 0.9 : 0.9;
          const zIn = (p) => (Math.abs(p[2] - Z(inner)) < 1e-6 ? deep : 1);
          quad(a, bq, c, d, n, colour(k, true), [a, bq, c, d].map((p) => zIn(p) * (nf < 0 ? lit : 1)), g, nF);
        }
        if (nb < b) {
          const inner = nb < 0 ? 0 : nb;
          const [a, bq, c, d] = corners(Z(-b), Z(-inner));
          const deep = nb < 0 ? 0.9 : 0.9;
          const zIn = (p) => (Math.abs(p[2] - Z(-inner)) < 1e-6 ? deep : 1);
          quad(a, bq, c, d, n, colour(k, false), [a, bq, c, d].map((p) => zIn(p) * (nb < 0 ? lit : 1)), g, nB);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(gl, 1));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return { geometry: geo, bounds, quads: idx.length / 6 };
}

/** A figure darkens a little toward its feet (it stands on the ground, not floats over it). */
const grounded = (y) => 0.8 + 0.2 * clamp01(y / 0.45);

/** The whole solid figure for a sprite (cached per detail): feet at y = 0, centred, facing +Z. */
export function voxelGeometry(sprite, step = 2) {
  if (!cache.has(step)) cache.set(step, new WeakMap());
  const c = cache.get(step);
  let geo = c.get(sprite);
  if (geo) return geo;
  geo = buildVoxels(sprite, { step, glow: sprite.glow, round: sprite.round ?? 'dome', shadow: grounded }).geometry;
  c.set(sprite, geo);
  return geo;
}

/** The average colour of each letter of a sprite (linear RGB): a hand's, a shoe's … */
export function letterPalette(sprite) {
  if (sprite._palette) return sprite._palette;
  const out = {};
  if (!sprite.rows) return (sprite._palette = out);
  const px = pixelsOf(sprite);
  const acc = {};
  sprite.rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.' || ch === ' ') return;
    for (let dy = 1; dy < 3; dy++) for (let dx = 1; dx < 3; dx++) {
      const k = ((1 + r * 4 + dy) * sprite.width + 1 + c * 4 + dx) * 4;
      if (px[k + 3] < 120) continue;
      const a = (acc[ch] ??= [0, 0, 0, 0]);
      tmp.setRGB(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255, THREE.SRGBColorSpace);
      a[0] += tmp.r;
      a[1] += tmp.g;
      a[2] += tmp.b;
      a[3]++;
    }
  }));
  for (const [ch, a] of Object.entries(acc)) out[ch] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
  return (sprite._palette = out);
}

/**
 * Any figure cut into parts by a spec (monsters in beasts.js):
 *   spec.partOf({ ch, c, r }) → part name (c, r in letter units, fractional), or null for 'body'
 *   spec.parts[name] = { pivot: 'top' | 'bottom' | 'left' | 'right' | 'center' | [x, y], cap, round, thin }
 * Returns { parts: { name: { geometry, pivot: [x, y, z], bounds } }, size } — each geometry
 * moved so its pivot is at the origin. Cached per sprite, spec and detail.
 */
const piecesCache = new WeakMap();
export function voxelPieces(sprite, spec, step = 2) {
  let per = piecesCache.get(sprite);
  if (!per) piecesCache.set(sprite, (per = new Map()));
  const key = `${spec.id ?? 'spec'}|${step}`;
  if (per.has(key)) return per.get(key);
  const W = Math.floor(sprite.width / step);
  const H = Math.floor(sprite.height / step);
  const letters = letterGrid(sprite.rows, W, H, step);
  const nameAt = Array.from({ length: W * H });
  for (let k = 0; k < W * H; k++) nameAt[k] = letters?.[k] ? spec.partOf(letters[k]) ?? 'body' : 'body';
  const v = step / PXM;
  const out = { parts: {}, size: { height: (H * v), width: W * v } };
  for (const [name, p] of Object.entries(spec.parts)) {
    const built = buildVoxels(sprite, {
      step,
      keep: (i, j) => nameAt[j * W + i] === name,
      cap: p.cap ?? sprite.depth,
      round: p.round ?? 'dome',
      thin: p.thin ?? null,
      glow: spec.glow ?? sprite.glow,
      bump: p.bump ?? null,
      shadow: spec.grounded === false ? null : grounded
    });
    if (!built.quads) continue;
    const b = built.bounds;
    const piv = Array.isArray(p.pivot) ? [p.pivot[0], p.pivot[1], 0]
      : p.pivot === 'top' ? [(b.minX + b.maxX) / 2, b.maxY - v, 0]
        : p.pivot === 'bottom' ? [(b.minX + b.maxX) / 2, b.minY, 0]
          : p.pivot === 'left' ? [b.minX + v, (b.minY + b.maxY) / 2, 0]
            : p.pivot === 'right' ? [b.maxX - v, (b.minY + b.maxY) / 2, 0]
              : p.pivot === 'inner' ? [(b.minX + b.maxX) / 2 > 0 ? b.minX + v : b.maxX - v, (b.minY + b.maxY) / 2, 0]
                : [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 0];
    built.geometry.translate(-piv[0], -piv[1], -piv[2]);
    out.parts[name] = { geometry: built.geometry, pivot: piv, bounds: b };
  }
  per.set(key, out);
  return out;
}

/* --------------------------------------------------------------- people */

/**
 * A person's face and hair standing out: hair proud of the head (front and
 * back), a nose and cheeks pushed out a little, a brow over the eyes.
 * People are 16 letters wide; the head is rows 0–9, the eyes on rows 6–7.
 */
function personBump(L, side) {
  const { ch, c, r } = L;
  if (r >= 10) return [0, 0];
  if (ch === 'H' || ch === 'D') return [0.03, 0.035];
  if (side === 'back') return [0, 0];
  let f = 0;
  // The nose: a soft bump below and between the eyes.
  const nd = Math.hypot((c - 8) / 0.9, (r - 8.4) / 0.8);
  if (nd < 1) f += 0.042 * (1 - nd * nd);
  if (ch === 'R') f += 0.016;
  // The brow over the eyes, and cheeks.
  if (r >= 5 && r < 6 && c > 4 && c < 11.5) f += 0.012;
  if (r >= 7.6 && r < 9 && (Math.abs(c - 5.5) < 1.6 || Math.abs(c - 10.5) < 1.6)) f += 0.012;
  return [f, 0];
}

/**
 * A person's figure in jointed parts, for the animation rig (rig.js): head,
 * body, the two arms and the two legs, each its own geometry with its joint
 * (neck, hip, shoulder) at the origin, and where that joint is on the
 * figure. A person's letter map: rows 0–9 the head, 10–15 the body with the
 * arms at its sides (columns 0–2 and 13–15), 16–18 the legs.
 *
 *   const { parts, joints, size, blinkHead, palette } = voxelParts(sprite, { step: 1 });
 *
 * `armNeg` / `legNeg` are on the −X side (the figure's right hand: it faces +Z).
 * The joints are the same at every detail, so a rig can swap detail on the fly.
 */
const partsCache = new Map(); // step → WeakMap
export function voxelParts(sprite, { headRows = 10, legRow = 16, armCols = 3, step = 2 } = {}) {
  if (!partsCache.has(step)) partsCache.set(step, new WeakMap());
  const pc = partsCache.get(step);
  let out = pc.get(sprite);
  if (out) return out;
  const cols = Math.round((sprite.width - 2) / 4);
  const partOf = (i, j) => {
    const c0 = Math.floor((i * step + step / 2 - 1) / 4);
    const r0 = Math.floor((j * step + step / 2 - 1) / 4);
    const c = Math.max(0, Math.min(cols - 1, c0));
    const r = Math.max(0, r0);
    if (r < headRows) return 'head';
    if (r >= legRow) return c < cols / 2 ? 'legNeg' : 'legPos';
    if (c < armCols) return 'armNeg';
    if (c >= cols - armCols) return 'armPos';
    return 'torso';
  };
  const names = ['head', 'torso', 'armNeg', 'armPos', 'legNeg', 'legPos'];
  const caps = { head: 0.33, torso: 0.27, armNeg: 0.14, armPos: 0.14, legNeg: 0.15, legPos: 0.15 };
  const rounds = { head: 'dome', torso: 'box', armNeg: 'dome', armPos: 'dome', legNeg: 'dome', legPos: 'dome' };
  const scale = (sprite.depth ?? 0.3) / 0.3;
  // Under the chin: the top of the body is in the head's shadow.
  const neckY = (sprite.height - 1 - headRows * 4) / PXM;
  const neck = (y) => grounded(y) * (y > neckY - 0.09 ? 0.7 + 0.3 * clamp01((neckY - y) / 0.09) : 1);
  const build = (s, n, st) => buildVoxels(s, {
    step: st,
    keep: (i, j) => partOf(i, j) === n,
    cap: caps[n] * scale,
    round: rounds[n],
    bump: s.rows ? personBump : null,
    glow: s.glow,
    shadow: n === 'torso' || n === 'armNeg' || n === 'armPos' ? neck : grounded
  });
  const built = Object.fromEntries(names.map((n) => [n, build(sprite, n, step)]));
  // Joints from the letter grid (the same at every detail): the neck at the bottom of the head,
  // the hip at the top of the legs, each shoulder at the top of its arm, each hip joint at the top of its leg.
  const px = (c) => (1 + c * 4 - sprite.width / 2) / PXM;
  const py = (r) => (sprite.height - 1 - r * 4) / PXM;
  const box = (n) => built[n].bounds;
  // Each part's columns and rows on the letter map (exact at any detail); the bounds when there is no map.
  const span = (n) => {
    if (!sprite.rows) return null;
    let c0 = Infinity, c1 = -Infinity, r1 = -Infinity;
    sprite.rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      const x = (1 + c * 4 + 2) / step, y = (1 + r * 4 + 2) / step;
      if (partOf(Math.floor(x), Math.floor(y)) !== n) return;
      c0 = Math.min(c0, c);
      c1 = Math.max(c1, c + 1);
      r1 = Math.max(r1, r + 1);
    }));
    return { cx: (px(c0) + px(c1)) / 2, bottom: py(r1) };
  };
  const midX = (n) => span(n)?.cx ?? (box(n).minX + box(n).maxX) / 2;
  const v = 2 / PXM;
  const joints = {
    head: [0, py(headRows), 0],
    torso: [0, py(legRow), 0],
    armNeg: [midX('armNeg'), py(headRows) - v, 0],
    armPos: [midX('armPos'), py(headRows) - v, 0],
    legNeg: [midX('legNeg'), py(legRow), 0],
    legPos: [midX('legPos'), py(legRow), 0]
  };
  const parts = {};
  for (const n of names) {
    const g = built[n].geometry;
    g.translate(-joints[n][0], -joints[n][1], -joints[n][2]);
    parts[n] = g;
  }
  let blinkHead = null;
  if (sprite.blink) {
    sprite.blink.depth = sprite.depth;
    blinkHead = build(sprite.blink, 'head', step).geometry;
    blinkHead.translate(-joints.head[0], -joints.head[1], 0);
  }
  out = {
    parts,
    joints,
    blinkHead,
    palette: letterPalette(sprite),
    quads: names.reduce((a, n) => a + built[n].quads, 0),
    size: { height: py(0) + 1 / PXM, armLength: py(headRows) - v - (span('armNeg')?.bottom ?? box('armNeg').minY) }
  };
  pc.set(sprite, out);
  return out;
}
