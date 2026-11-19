/**
 * The shape of Mistfall Gorge: one height function for the whole map. A
 * canyon floor that climbs from the camp to the falls' basin, walls of
 * stepped rock (ledges every few metres, where the moss gathers) a hundred
 * metres high, the river cut into the floor — shallow at the ford, a deep
 * slot under the rope bridge — and the plunge pools. Pure: the terrain mesh,
 * the grass, collision, the creatures and the tests all sample it.
 *
 *   heightAt(x, z)    the land (metres)
 *   groundAt(x, z)    what you stand on: the land, the bridge's deck, a stepping stone
 *   waterAt(x, z)     the water's surface there, or -Infinity
 *   surfaceAt(x, z)   'water' | 'shallow' | 'stone' | 'mud' | 'moss' | 'rock' | 'grass' | 'litter' | 'wood'
 *   canyonAt(x, z)    { d, s, e }: from the canyon's middle, along it, and past the floor's edge
 */
import { simplex2, fbm, smoothstep, clamp } from '../gloamreach/noise.js';
import { EXTENT, CANYON, RIVER, PATH, STREAMS, FALLS, CAMP, DEN, BRIDGE, FORD, PAVED, RUINS, halfWidthAt, floorAt, wallAt, riverHalfWidth, riverDepth, gorgeAt, nearestOnLine } from './map.js';

const N1 = simplex2(101);
const N2 = simplex2(203);
const N3 = simplex2(307);
const N4 = simplex2(409);

/* ------------------------------------------------------------------ distance fields */

/**
 * Distance to a line (and how far along it the nearest point is) on a grid,
 * stamped segment by segment out to `reach` metres — built once.
 */
function lineField(line, cell, reach) {
  const W = Math.ceil((EXTENT.x1 - EXTENT.x0) / cell) + 1;
  const H = Math.ceil((EXTENT.z1 - EXTENT.z0) / cell) + 1;
  const D = new Float32Array(W * H).fill(reach);
  const S = new Float32Array(W * H).fill(-1);
  const P = line.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i];
    const [bx, bz] = P[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const L2 = dx * dx + dz * dz || 1e-9;
    const L = Math.sqrt(L2);
    const gx0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach - EXTENT.x0) / cell));
    const gx1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + reach - EXTENT.x0) / cell));
    const gz0 = Math.max(0, Math.floor((Math.min(az, bz) - reach - EXTENT.z0) / cell));
    const gz1 = Math.min(H - 1, Math.ceil((Math.max(az, bz) + reach - EXTENT.z0) / cell));
    for (let gz = gz0; gz <= gz1; gz++) {
      const z = EXTENT.z0 + gz * cell;
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = EXTENT.x0 + gx * cell;
        let t = ((x - ax) * dx + (z - az) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
        const k = gz * W + gx;
        if (d < D[k]) {
          D[k] = d;
          S[k] = line.s[i] + L * t;
        }
      }
    }
  }
  return { W, H, D, S, cell, reach };
}

function sample(f, arr, x, z) {
  const fx = clamp((x - EXTENT.x0) / f.cell, 0, f.W - 1.001);
  const fz = clamp((z - EXTENT.z0) / f.cell, 0, f.H - 1.001);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const k = iz * f.W + ix;
  const a = arr[k] + (arr[k + 1] - arr[k]) * tx;
  const b = arr[k + f.W] + (arr[k + f.W + 1] - arr[k + f.W]) * tx;
  return a + (b - a) * tz;
}

/** The nearest-`s` of a cell, without blending across a fold (take the nearest sample's). */
function sampleS(f, x, z) {
  const ix = Math.round(clamp((x - EXTENT.x0) / f.cell, 0, f.W - 1));
  const iz = Math.round(clamp((z - EXTENT.z0) / f.cell, 0, f.H - 1));
  return f.S[iz * f.W + ix];
}

let F = null;
function fields() {
  if (F) return F;
  F = {
    canyon: lineField(CANYON, 2, 150),
    river: lineField(RIVER, 1, 26),
    path: lineField(PATH, 1, 10),
    streams: STREAMS.map((l) => lineField(l, 1, 8))
  };
  // The river's surface along it: below its lower bank, sunk in the gorge, never rising downstream.
  const n = RIVER.pts.length;
  const level = new Float32Array(n);
  F.level = null;
  for (let i = 0; i < n; i++) {
    const [x, z] = RIVER.pts[i];
    const s = RIVER.s[i];
    const j = Math.min(n - 1, i + 1);
    const yaw = Math.atan2(RIVER.pts[j][0] - RIVER.pts[Math.max(0, j - 1)][0], RIVER.pts[j][1] - RIVER.pts[Math.max(0, j - 1)][1]);
    const w = riverHalfWidth(s) + 2.5;
    const nx = Math.cos(yaw);
    const nz = -Math.sin(yaw);
    const bank = Math.min(heightDry(x + nx * w, z + nz * w), heightDry(x - nx * w, z - nz * w), heightDry(x, z) + 0.3);
    const sunk = 0.45 + 3.6 * gorgeAt(s);
    level[i] = bank - sunk;
    if (i === 0) level[0] = Math.min(level[0], poolLevel(FALLS[0]));
    if (i > 0) level[i] = Math.min(level[i], level[i - 1] - 0.004);
  }
  F.level = level;
  return F;
}

/** The river's surface height `s` metres down it. */
export function riverLevel(s) {
  const f = fields();
  const S = RIVER.s;
  const i = Math.max(0, Math.min(S.length - 2, Math.floor((s / RIVER.len) * (S.length - 1))));
  let j = i;
  while (j > 0 && S[j] > s) j--;
  while (j < S.length - 2 && S[j + 1] < s) j++;
  const t = clamp((s - S[j]) / Math.max(1e-6, S[j + 1] - S[j]), 0, 1);
  return f.level[j] + (f.level[j + 1] - f.level[j]) * t;
}

/** Where a point is on the canyon: distance from its middle, along it, and past the floor's edge (jagged). */
export function canyonAt(x, z) {
  const f = fields();
  const d = sample(f.canyon, f.canyon.D, x, z);
  const s = Math.max(0, sampleS(f.canyon, x, z));
  const jag = fbm(N1, x / 38, z / 38, 3) * 9 + N2(x / 11, z / 11) * 1.8;
  const W = halfWidthAt(s);
  // No islands of wall out in the floor: the jagged edge only wanders near the edge.
  let e = Math.min(d - W + jag, d - W + 10);
  // The Hollow: an alcove bitten into the west wall.
  const dd = Math.hypot(x - DEN.x, z - DEN.z);
  if (dd < 40) e -= 34 * smoothstep(40, 12, dd);
  // The side falls' pools sit in bays in the walls.
  for (const fl of FALLS) {
    if (fl.id === 'grand') continue;
    const dp = Math.hypot(x - fl.pool.x, z - fl.pool.z);
    if (dp < fl.pool.r * 2.4) e -= fl.pool.r * 0.9 * smoothstep(fl.pool.r * 2.4, fl.pool.r * 0.8, dp);
  }
  return { d, s, e };
}

/** The floor without the walls or water: what the path and the camp sit on. */
export function floorBase(x, z, s) {
  return floorAt(s) + fbm(N3, x / 34, z / 34, 3) * 1.5;
}

/* ------------------------------------------------------------------ the height */

/** The land before the river and the pools are cut into it. */
export function heightDry(x, z) {
  const f = fields();
  const { s, e } = canyonAt(x, z);
  const base = floorBase(x, z, s);
  let h = base + N4(x / 6, z / 6) * 0.22 + fbm(N2, x / 11, z / 11, 2) * 0.45;
  // The floor's edge rises in soft banks toward the walls.
  h += smoothstep(-18, 0, e) * 4;
  // The walls: stepped rock — ledges and risers — up to the rim, then a broken plateau.
  if (e > 0) {
    const Hw = wallAt(s) * (0.9 + 0.2 * fbm(N3, x / 60, z / 60, 2));
    const span = 30 + N2(x / 45, z / 45) * 10;
    const k = clamp(e / span, 0, 1);
    let rise = Hw * Math.pow(k, 0.8);
    const step = 7.5 + N1(x / 30, z / 30) * 2;
    const q = rise / step;
    const fl = Math.floor(q);
    const ter = (fl + smoothstep(0.5, 0.92, q - fl)) * step;
    rise = rise * 0.4 + ter * 0.6;
    rise += Math.max(0, e - span) * 0.2 + Math.abs(fbm(N4, x / 15, z / 15, 3)) * 7 * k;
    h += rise;
  }
  // The camp: a level ledge.
  const dc = Math.hypot(x - CAMP.x, z - CAMP.z);
  if (dc < 24) h += (floorBase(CAMP.x, CAMP.z, 50) + 0.4 - h) * smoothstep(24, 12, dc);
  // The Hollow's floor: a shallow bowl.
  const dd = Math.hypot(x - DEN.x, z - DEN.z);
  if (dd < DEN.r) h -= 1.2 * smoothstep(DEN.r, 0, dd);

  // The path: trodden flat on the floor (a little sunk).
  const dp = sample(f.path, f.path.D, x, z);
  if (dp < 5 && e < 2) h += (base - 0.1 - h) * smoothstep(5, 1.6, dp);

  // Streams from the side pools.
  for (const sf of f.streams) {
    const ds = sample(sf, sf.D, x, z);
    if (ds < 4) h = Math.min(h, h - 0.7 * smoothstep(4, 1, ds));
  }
  return h;
}

export function heightAt(x, z) {
  const f = fields();
  let h = heightDry(x, z);

  // The river: banks and a bed, deep in the gorge, shallow at the ford.
  const dr = sample(f.river, f.river.D, x, z);
  if (dr < 25) {
    const rs = Math.max(0, sampleS(f.river, x, z));
    const w = riverHalfWidth(rs);
    const deep = riverDepth(rs);
    const lvl = riverLevel(rs);
    const gorge = gorgeAt(rs);
    const bankSlope = 0.32 + gorge * 5;
    const inside = dr < w ? lvl - deep * Math.pow(1 - (dr / w) * (dr / w), 0.6) : lvl + (dr - w) * bankSlope - 0.1;
    if (inside < h) h = h + (inside - h) * smoothstep(25, w + 2, dr) + (inside - h) * (1 - smoothstep(25, w + 2, dr)) * 0;
    h = Math.min(h, inside + Math.max(0, dr - w) * 0.9);
  }
  // The plunge pools.
  for (const fl of FALLS) {
    const p = fl.pool;
    const dp2 = Math.hypot(x - p.x, z - p.z) / p.r;
    if (dp2 < 1.8) {
      const lvl = poolLevel(fl);
      const bowl = dp2 < 1 ? lvl - 2.8 * (1 - dp2 * dp2) : lvl + (dp2 - 1) * p.r * 0.35 - 0.1;
      h = Math.min(h, bowl);
    }
  }
  return h;
}

const poolLevels = new Map();
/** The water level of a fall's plunge pool. */
export function poolLevel(fl) {
  if (!poolLevels.has(fl.id)) {
    // Below the lowest of its rim (bar the river's way out), and never above the river it feeds.
    let lo = Infinity;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      lo = Math.min(lo, heightDry(fl.pool.x + Math.sin(a) * fl.pool.r * 1.1, fl.pool.z + Math.cos(a) * fl.pool.r * 1.1));
    }
    let lvl = lo - 0.35;
    poolLevels.set(fl.id, lvl);
  }
  return poolLevels.get(fl.id);
}

/* ------------------------------------------------------------------ water */

/** The water's surface at a point, or -Infinity where there is none. */
export function waterAt(x, z) {
  const f = fields();
  for (const fl of FALLS) {
    const p = fl.pool;
    if (Math.hypot(x - p.x, z - p.z) < p.r * 1.25) {
      const lvl = poolLevel(fl);
      if (heightAt(x, z) < lvl) return lvl;
    }
  }
  const dr = sample(f.river, f.river.D, x, z);
  if (dr < 22) {
    const rs = Math.max(0, sampleS(f.river, x, z));
    const lvl = riverLevel(rs);
    if (dr < riverHalfWidth(rs) + 3 && heightAt(x, z) < lvl) return lvl;
  }
  for (const sf of f.streams) {
    if (sample(sf, sf.D, x, z) < 1.6) return heightAt(x, z) + 0.12;
  }
  return -Infinity;
}

/* ------------------------------------------------------------------ the bridge and the stones */

const BR = (() => {
  const c = Math.cos(BRIDGE.yaw);
  const s = Math.sin(BRIDGE.yaw);
  return { c, s };
})();

/** The rope bridge's deck height at a point on it, or -Infinity off it. */
export function bridgeDeck(x, z) {
  const dx = x - BRIDGE.x;
  const dz = z - BRIDGE.z;
  // Along the bridge (its heading) and across it.
  const along = dx * BR.s + dz * BR.c;
  const across = dx * BR.c - dz * BR.s;
  const half = BRIDGE.length / 2;
  if (Math.abs(along) > half + 0.6 || Math.abs(across) > BRIDGE.width / 2 + 0.1) return -Infinity;
  const ends = bridgeEnds();
  const t = clamp((along + half) / BRIDGE.length, 0, 1);
  const sag = Math.sin(t * Math.PI) * 0.75;
  return ends.a + (ends.b - ends.a) * t - sag;
}

let _ends = null;
/** The heights the bridge is anchored at (the gorge's two lips). */
export function bridgeEnds() {
  if (_ends) return _ends;
  const half = BRIDGE.length / 2;
  const at = (k) => heightAt(BRIDGE.x + BR.s * k, BRIDGE.z + BR.c * k);
  _ends = { a: Math.max(at(-half), at(-half - 1.5)) + 0.25, b: Math.max(at(half), at(half + 1.5)) + 0.25 };
  return _ends;
}

/** The ford's stepping stones: [x, z, radius, top height]. */
export const STONES = (() => {
  const out = [];
  const ax = -28;
  const az = 176;
  const bx = -12;
  const bz = 198;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = ax + (bx - ax) * t + Math.sin(i * 2.1) * 0.8;
    const z = az + (bz - az) * t + Math.cos(i * 1.7) * 0.6;
    out.push([x, z, 0.75 + ((i * 37) % 5) * 0.06]);
  }
  return out;
})();

let _stoneTops = null;
export function stoneTops() {
  if (_stoneTops) return _stoneTops;
  _stoneTops = STONES.map(([x, z, r]) => {
    const w = waterAt(x, z);
    const top = (Number.isFinite(w) ? w : heightAt(x, z)) + 0.28;
    return [x, z, r, top];
  });
  return _stoneTops;
}

/** What you stand on: the land, or the bridge's deck, or a stepping stone, whichever is higher. */
export function groundAt(x, z) {
  let h = heightAt(x, z);
  const b = bridgeDeck(x, z);
  if (b > h - 3) h = Math.max(h, b);
  if (Math.abs(x - FORD.x) < FORD.r + 14 && Math.abs(z - FORD.z) < FORD.r + 14) {
    for (const [sx, sz, r, top] of stoneTops()) if (Math.hypot(x - sx, z - sz) < r) h = Math.max(h, top);
  }
  return h;
}

/** Rise per metre at a point. */
export function slopeAt(x, z, e = 0.4) {
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/** Distance to the hunters' path (metres; ≥ 10 means far from it). */
export function pathDistance(x, z) {
  const f = fields();
  return sample(f.path, f.path.D, x, z);
}

/** Distance to the river's middle (≥ 26 far), and its half-width there. */
export function riverDistance(x, z) {
  const f = fields();
  const d = sample(f.river, f.river.D, x, z);
  const rs = Math.max(0, sampleS(f.river, x, z));
  return { d, w: riverHalfWidth(rs), s: rs };
}

/** Is a stretch of path paved (the ruins' old stone)? */
export function pavedAt(x, z) {
  if (pathDistance(x, z) > 2.6) return false;
  const s = nearestOnLine(PATH, x, z).s;
  return PAVED.some(([a, b]) => s >= a && s <= b);
}

/** What the ground is underfoot, for footsteps, splashes and the splat map. */
export function surfaceAt(x, z) {
  if (bridgeDeck(x, z) > heightAt(x, z) - 0.5 && Number.isFinite(bridgeDeck(x, z))) return 'wood';
  const w = waterAt(x, z);
  const g = groundAt(x, z);
  if (w > g + 0.45) return 'water';
  if (w > g - 0.05) return 'shallow';
  const pd = pathDistance(x, z);
  if (pd < 2.2) return pavedAt(x, z) ? 'stone' : 'mud';
  if (slopeAt(x, z) > 0.9) return 'rock';
  const c = canyonAt(x, z);
  if (c.e > -4) return 'moss';
  if (riverDistance(x, z).d < 12) return 'mud';
  return N3(x / 18, z / 18) > 0.15 ? 'grass' : 'litter';
}

/** For the map's trees: 'floor' where the jungle may grow, 'rim' on the plateau above, else null. */
export function jungleGround(x, z) {
  const c = canyonAt(x, z);
  if (c.e > 34 && c.e < 70) return 'rim';
  if (c.e > -2) return null;
  return 'floor';
}

/** Where nothing tall may stand: the path, the river, the camp, pools, ruins, the bridge. */
export function isClear(x, z, gap = 1) {
  if (pathDistance(x, z) < 4 + gap) return false;
  const r = riverDistance(x, z);
  if (r.d < r.w + 2 + gap) return false;
  if (Math.hypot(x - CAMP.x, z - CAMP.z) < 22 + gap) return false;
  for (const fl of FALLS) if (Math.hypot(x - fl.pool.x, z - fl.pool.z) < fl.pool.r * 1.4 + gap) return false;
  if (Math.hypot(x - DEN.x, z - DEN.z) < DEN.r + gap) return false;
  for (const p of RUINS.pillars) if (Math.hypot(x - p.x, z - p.z) < 3 + gap) return false;
  for (const p of RUINS.colossi) if (Math.hypot(x - p.x, z - p.z) < p.w + 3 + gap) return false;
  if (Math.hypot(x - BRIDGE.x, z - BRIDGE.z) < BRIDGE.length / 2 + 4 + gap) return false;
  return true;
}
