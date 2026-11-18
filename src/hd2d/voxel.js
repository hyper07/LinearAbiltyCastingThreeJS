/**
 * Pixel sprites made solid: every pixel of a character's drawing becomes a
 * little block, and the body gets depth — rounded, thickest in the middle of
 * each shape and thin at its edges (a big round head, round arms and legs) —
 * so the characters stand in the world as 3D figures that turn, catch the
 * firelight on their sides and cast real shadows, not paper cut-outs.
 *
 * The front of the body is coloured from the front drawing, the back from
 * the back drawing (mirrored, as seen from behind), the sides and top from
 * whichever half they are on.
 *
 *   const geo = voxelGeometry(sprite);   // cached on the sprite; feet at y = 0, facing +Z
 *
 * A sprite may carry: `back` (its back view), `depth` (half its thickness at
 * the thickest, in metres; 0.3 by default), `profile` (it is drawn from the
 * side, like the wolf: the far flank is the same drawing, not a back).
 */
import * as THREE from 'three';
import { PXM } from './sprites.js';

const STEP = 2; // sprite pixels per block (the sprites are drawn at 4× detail)
const cache = new WeakMap();
const tmp = new THREE.Color();

function pixelsOf(sprite) {
  const g = sprite.canvas.getContext('2d');
  return g.getImageData(0, 0, sprite.width, sprite.height).data;
}

/** The blocks' grid from a sprite: filled or not, and the colour (linear RGB) of each. */
function sample(sprite, W, H, mirror = false) {
  const px = pixelsOf(sprite);
  const sw = sprite.width;
  const fill = new Uint8Array(W * H);
  const col = new Float32Array(W * H * 3);
  for (let j = 0; j < H; j++) {
    for (let i0 = 0; i0 < W; i0++) {
      const i = mirror ? W - 1 - i0 : i0;
      // The pixel in the middle of the block if it is there, else any of the block's.
      let best = -1;
      for (const [dx, dy] of [[1, 1], [0, 0], [1, 0], [0, 1]]) {
        const x = i * STEP + dx;
        const y = j * STEP + dy;
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

/** How far each filled block is from the edge of its shape (in blocks, 1 at the edge). */
function distances(fill, W, H) {
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
 * The solid figure for a sprite (cached): one geometry of block faces, with
 * colours; its feet at y = 0, centred, facing +Z.
 */
export function voxelGeometry(sprite) {
  let geo = cache.get(sprite);
  if (geo) return geo;
  geo = buildVoxels(sprite).geometry;
  cache.set(sprite, geo);
  return geo;
}

/** The letter-map cell (column, row) a block lies in: sprites are drawn 4× with a 1-pixel outline. */
const cellOf = (i, j) => [Math.floor((i * STEP + 1 - 1) / 4), Math.floor((j * STEP + 1 - 1) / 4)];

/**
 * A person's figure in jointed parts, for the animation rig (rig.js): head,
 * body, the two arms and the two legs, each its own geometry with its joint
 * (neck, hip, shoulder) at the origin, and where that joint is on the
 * figure. A person's letter map: rows 0–9 the head, 10–15 the body with the
 * arms at its sides (columns 0–2 and 13–15), 16–18 the legs.
 *
 *   const { parts, joints, size } = voxelParts(sprite);   // parts.head, parts.armNeg …
 *
 * `armNeg` / `legNeg` are on the −X side (the figure's right hand: it faces +Z).
 */
const partsCache = new WeakMap();
export function voxelParts(sprite, { headRows = 10, legRow = 16, armCols = 3 } = {}) {
  let out = partsCache.get(sprite);
  if (out) return out;
  const cols = Math.round((sprite.width - 2) / 4);
  const partOf = (i, j) => {
    const [c0, r0] = cellOf(i, j);
    const c = Math.max(0, Math.min(cols - 1, c0));
    const r = Math.max(0, r0);
    if (r < headRows) return 'head';
    if (r >= legRow) return c < cols / 2 ? 'legNeg' : 'legPos';
    if (c < armCols) return 'armNeg';
    if (c >= cols - armCols) return 'armPos';
    return 'torso';
  };
  const names = ['head', 'torso', 'armNeg', 'armPos', 'legNeg', 'legPos'];
  const built = Object.fromEntries(names.map((n) => [n, buildVoxels(sprite, (i, j) => partOf(i, j) === n)]));
  const v = STEP / PXM;
  const box = (n) => built[n].bounds;
  // Joints: the neck at the bottom middle of the head, the hip at the top of the legs, each
  // shoulder at the top of its arm, each hip joint at the top middle of its leg.
  const joints = {
    head: [0, box('head').minY, 0],
    torso: [0, box('legNeg').maxY, 0],
    armNeg: [(box('armNeg').minX + box('armNeg').maxX) / 2, box('armNeg').maxY - v, 0],
    armPos: [(box('armPos').minX + box('armPos').maxX) / 2, box('armPos').maxY - v, 0],
    legNeg: [(box('legNeg').minX + box('legNeg').maxX) / 2, box('legNeg').maxY, 0],
    legPos: [(box('legPos').minX + box('legPos').maxX) / 2, box('legPos').maxY, 0]
  };
  const parts = {};
  for (const n of names) {
    const g = built[n].geometry;
    g.translate(-joints[n][0], -joints[n][1], -joints[n][2]);
    parts[n] = g;
  }
  out = { parts, joints, size: { height: box('head').maxY, armLength: box('armNeg').maxY - box('armNeg').minY } };
  partsCache.set(sprite, out);
  return out;
}

/** The blocks of a sprite (only those `keep(i, j)` allows, each part closed on its own). */
function buildVoxels(sprite, keep = null) {
  let geo;
  const W = Math.floor(sprite.width / STEP);
  const H = Math.floor(sprite.height / STEP);
  const v = STEP / PXM; // a block's size in metres
  const front = sample(sprite, W, H);
  // The back: the back drawing seen from behind; for a side drawing, the same drawing;
  // with no back drawing, each row's commonest colour (no eyes on the back of a slime).
  let back;
  if (sprite.back) back = sample(sprite.back, W, H, true);
  else if (sprite.profile) back = front;
  else {
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
  const fill = front.fill;
  const dist = distances(fill, W, H);
  // Half the thickness of each column, in blocks: rounded, thickest in the middle of a shape.
  const cap = Math.max(1, Math.round((sprite.depth ?? 0.3) / v));
  const half = new Int16Array(W * H).fill(-1);
  for (let k = 0; k < W * H; k++) {
    if (!fill[k]) continue;
    const t = Math.min(1, dist[k] / cap);
    half[k] = Math.max(1, Math.round(cap * (1 - (1 - t) * (1 - t))));
  }
  const pos = [];
  const nor = [];
  const col = [];
  const x0 = -W / 2;
  const X = (i) => (i + x0) * v;
  const Y = (j) => (H - j) * v; // row 0 at the top
  const Z = (k) => k * v;
  const colour = (k, front_) => (front_ ? front.col : back.col).subarray(k * 3, k * 3 + 3);
  // One quad: four corners (counter-clockwise seen from outside), a normal, a colour.
  const quad = (a, b, c, d, n, rgb) => {
    for (const p of [a, b, c, a, c, d]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      col.push(rgb[0], rgb[1], rgb[2]);
    }
  };
  const mine = (i, j) => !keep || keep(i, j);
  const hAt = (i, j) => (i < 0 || j < 0 || i >= W || j >= H || !mine(i, j) ? -1 : half[j * W + i]);
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const h = half[k];
      if (h < 0 || !mine(i, j)) continue;
      const xa = X(i), xb = X(i + 1), ya = Y(j + 1), yb = Y(j);
      bounds.minX = Math.min(bounds.minX, xa);
      bounds.maxX = Math.max(bounds.maxX, xb);
      bounds.minY = Math.min(bounds.minY, ya);
      bounds.maxY = Math.max(bounds.maxY, yb);
      const za = Z(-h - 0.5), zb = Z(h + 0.5);
      // Front and back.
      quad([xa, ya, zb], [xb, ya, zb], [xb, yb, zb], [xa, yb, zb], [0, 0, 1], colour(k, true));
      quad([xb, ya, za], [xa, ya, za], [xa, yb, za], [xb, yb, za], [0, 0, -1], colour(k, false));
      // The sides, top and bottom: only where they stand out past the neighbour; front half and back half apart.
      const sides = [
        [hAt(i - 1, j), (z0, z1) => [[xa, ya, z0], [xa, ya, z1], [xa, yb, z1], [xa, yb, z0]], [-1, 0, 0]],
        [hAt(i + 1, j), (z0, z1) => [[xb, ya, z1], [xb, ya, z0], [xb, yb, z0], [xb, yb, z1]], [1, 0, 0]],
        [hAt(i, j - 1), (z0, z1) => [[xa, yb, z0], [xa, yb, z1], [xb, yb, z1], [xb, yb, z0]], [0, 1, 0]],
        [hAt(i, j + 1), (z0, z1) => [[xa, ya, z1], [xa, ya, z0], [xb, ya, z0], [xb, ya, z1]], [0, -1, 0]]
      ];
      for (const [nh, corners, n] of sides) {
        if (nh >= h) continue;
        // Exposed: z from the neighbour's edge out to ours, on both sides.
        const inner = nh < 0 ? -0.5 : nh + 0.5;
        const spans = nh < 0 ? [[-h - 0.5, 0, false], [0, h + 0.5, true]] : [[-h - 0.5, -inner, false], [inner, h + 0.5, true]];
        for (const [z0, z1, isFront] of spans) {
          if (z1 - z0 < 0.01) continue;
          const [a, b, c, d] = corners(Z(z0), Z(z1));
          quad(a, b, c, d, n, colour(k, isFront));
        }
      }
    }
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return { geometry: geo, bounds };
}
