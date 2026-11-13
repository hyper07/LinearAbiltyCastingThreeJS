import { MAP } from './rules.js';

/**
 * Lanebreak's map: one square field, 200 units across, the same for every
 * match. Dawn (blue) lives in the bottom-left corner, Dusk (red) in the
 * top-right; three lanes join them — top (up the left side and along the
 * top), mid (the diagonal) and bot (along the bottom and up the right) —
 * with a river crossing the middle the other way and jungle between.
 *
 * The map is mirrored through its centre, so both sides are the same.
 * x runs right, z runs down (toward the bottom of the screen).
 */

export const mirror = ([x, z]) => [MAP - x, MAP - z];

export const BASES = {
  blue: { core: [20, 180], fountain: [8, 192], spawn: [12, 188] },
  red: { core: [180, 20], fountain: [192, 8], spawn: [188, 12] }
};

/** Lane paths, from Dawn's base to Dusk's. */
export const LANES = {
  top: [[26, 170], [22, 140], [22, 40], [28, 28], [40, 22], [140, 22], [170, 26]],
  mid: [[30, 170], [100, 100], [170, 30]],
  bot: [[30, 174], [60, 178], [160, 178], [172, 172], [178, 160], [178, 60], [174, 30]]
};
export const LANE_ORDER = ['top', 'mid', 'bot'];

function lengths(path) {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return out;
}
const LANE_LEN = Object.fromEntries(Object.entries(LANES).map(([k, p]) => [k, lengths(p)]));

/** The point `t` (0 at Dawn's end, 1 at Dusk's) along a lane. */
export function lanePoint(lane, t) {
  const path = LANES[lane];
  const len = LANE_LEN[lane];
  const want = Math.max(0, Math.min(1, t)) * len[len.length - 1];
  for (let i = 1; i < path.length; i++) {
    if (len[i] >= want) {
      const k = (want - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k];
    }
  }
  return [...path[path.length - 1]];
}

/** How far along a lane (0..1) a point is, and how far off it. */
export function laneT(lane, x, z) {
  const path = LANES[lane];
  const len = LANE_LEN[lane];
  let best = { t: 0, off: Infinity };
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const px = ax + dx * k;
    const pz = az + dz * k;
    const off = Math.hypot(x - px, z - pz);
    if (off < best.off) best = { t: (len[i - 1] + Math.sqrt(l2) * k) / len[len.length - 1], off };
  }
  return best;
}

/** Towers: two in each lane for each side, two guarding each core, and the core. */
export function towerSpots() {
  const out = [];
  for (const lane of LANE_ORDER) {
    out.push({ team: 'blue', lane, tier: 'outer', at: lanePoint(lane, 0.34) });
    out.push({ team: 'blue', lane, tier: 'inner', at: lanePoint(lane, 0.19) });
    out.push({ team: 'red', lane, tier: 'outer', at: lanePoint(lane, 0.66) });
    out.push({ team: 'red', lane, tier: 'inner', at: lanePoint(lane, 0.81) });
  }
  for (const at of [[28, 164], [36, 172]]) {
    out.push({ team: 'blue', lane: null, tier: 'base', at });
    out.push({ team: 'red', lane: null, tier: 'base', at: mirror(at) });
  }
  out.push({ team: 'blue', lane: null, tier: 'core', at: BASES.blue.core });
  out.push({ team: 'red', lane: null, tier: 'core', at: BASES.red.core });
  return out;
}

/** Jungle camps: two on each side, and the Riverwarden in the river. */
export const CAMP_SPOTS = [
  { kind: 'wolf', at: [62, 116], side: 'blue' },
  { kind: 'golem', at: [92, 152], side: 'blue' },
  { kind: 'wolf', at: mirror([62, 116]), side: 'red' },
  { kind: 'golem', at: mirror([92, 152]), side: 'red' },
  { kind: 'warden', at: [126, 126], side: null }
];

/* ---- walls: rocks and trees in the jungle, the same every match ---- */

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Circles that can't be walked through: `{ x, z, r, kind }`. */
export const WALLS = (() => {
  const rand = seeded(2026);
  const half = [];
  const keepClear = (x, z, r) => {
    for (const lane of LANE_ORDER) if (laneT(lane, x, z).off < r + 7) return false;
    if (Math.abs(x - z) / Math.SQRT2 < r + 5) return false; // the river
    for (const c of CAMP_SPOTS) if (Math.hypot(c.at[0] - x, c.at[1] - z) < r + 9) return false;
    for (const b of Object.values(BASES)) if (Math.hypot(b.core[0] - x, b.core[1] - z) < r + 26) return false;
    if (x < 6 || z < 6 || x > MAP - 6 || z > MAP - 6) return false;
    return true;
  };
  // Only Dawn's half (below the river): Dusk's is the mirror.
  for (let tries = 0; tries < 900 && half.length < 46; tries++) {
    const x = 10 + rand() * 180;
    const z = 10 + rand() * 180;
    if (z <= x) continue;
    const r = 2.5 + rand() * 3.5;
    if (!keepClear(x, z, r)) continue;
    if (half.some((w) => Math.hypot(w.x - x, w.z - z) < w.r + r - 1.5)) continue;
    half.push({ x, z, r, kind: rand() < 0.55 ? 'trees' : 'rock' });
  }
  return [...half, ...half.map((w) => {
    const [x, z] = mirror([w.x, w.z]);
    return { ...w, x, z };
  })];
})();

/* ---- the walking grid and paths ---- */

export const NAV_CELL = 2;
export const NAV_N = MAP / NAV_CELL;
const UNIT_PAD = 0.9;

export const BLOCKED = (() => {
  const g = new Uint8Array(NAV_N * NAV_N);
  for (let z = 0; z < NAV_N; z++) {
    for (let x = 0; x < NAV_N; x++) {
      const cx = (x + 0.5) * NAV_CELL;
      const cz = (z + 0.5) * NAV_CELL;
      if (cx < 2 || cz < 2 || cx > MAP - 2 || cz > MAP - 2) g[z * NAV_N + x] = 1;
      for (const w of WALLS) if (Math.hypot(w.x - cx, w.z - cz) < w.r + UNIT_PAD) g[z * NAV_N + x] = 1;
    }
  }
  return g;
})();

const cellOf = (v) => Math.max(0, Math.min(NAV_N - 1, Math.floor(v / NAV_CELL)));
export const walkable = (x, z) => !BLOCKED[cellOf(z) * NAV_N + cellOf(x)];

/** Whether a straight walk from a to b stays off the walls. */
export function clearLine(ax, az, bx, bz) {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (NAV_CELL * 0.5));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    if (!walkable(ax + (bx - ax) * k, az + (bz - az) * k)) return false;
  }
  return true;
}

/** The nearest walkable point to (x, z). */
export function nearestWalkable(x, z) {
  if (walkable(x, z)) return [x, z];
  for (let r = 1; r < 20; r++) {
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const pz = z + Math.sin((a / 16) * Math.PI * 2) * r;
      if (walkable(px, pz)) return [px, pz];
    }
  }
  return [x, z];
}

const heapIdx = new Int32Array(NAV_N * NAV_N * 4);
const heapKey = new Float32Array(NAV_N * NAV_N * 4);
const gScore = new Float32Array(NAV_N * NAV_N);
const cameFrom = new Int32Array(NAV_N * NAV_N);
const stamp = new Int32Array(NAV_N * NAV_N);
let searchId = 0;

/**
 * A walking path from a to b (A* on the grid, then the corners pulled
 * straight): a list of points ending at b, or a straight line when the
 * way is clear.
 */
export function findPath(ax, az, bx, bz) {
  [bx, bz] = nearestWalkable(bx, bz);
  if (clearLine(ax, az, bx, bz)) return [[bx, bz]];
  const n = NAV_N;
  const start = cellOf(az) * n + cellOf(ax);
  const goal = cellOf(bz) * n + cellOf(bx);
  searchId++;
  let size = 0;
  const h = (i) => {
    const dx = Math.abs((i % n) - (goal % n));
    const dz = Math.abs(((i / n) | 0) - ((goal / n) | 0));
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const push = (i, k) => {
    let at = size++;
    while (at > 0) {
      const up = (at - 1) >> 1;
      if (heapKey[up] <= k) break;
      heapIdx[at] = heapIdx[up];
      heapKey[at] = heapKey[up];
      at = up;
    }
    heapIdx[at] = i;
    heapKey[at] = k;
  };
  const pop = () => {
    const top = heapIdx[0];
    const li = heapIdx[--size];
    const lk = heapKey[size];
    let at = 0;
    for (;;) {
      let c = at * 2 + 1;
      if (c >= size) break;
      if (c + 1 < size && heapKey[c + 1] < heapKey[c]) c++;
      if (heapKey[c] >= lk) break;
      heapIdx[at] = heapIdx[c];
      heapKey[at] = heapKey[c];
      at = c;
    }
    heapIdx[at] = li;
    heapKey[at] = lk;
    return top;
  };
  stamp[start] = searchId;
  gScore[start] = 0;
  cameFrom[start] = -1;
  push(start, h(start));
  let found = false;
  let closest = start;
  let closestH = h(start);
  while (size > 0 && size < heapIdx.length - 8) {
    const i = pop();
    if (i === goal) {
      found = true;
      break;
    }
    const x = i % n;
    const z = (i / n) | 0;
    const gi = gScore[i];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        const j = nz * n + nx;
        if (BLOCKED[j] && j !== goal) continue;
        if (dx && dz && (BLOCKED[z * n + nx] || BLOCKED[nz * n + x])) continue;
        const g = gi + (dx && dz ? 1.414 : 1);
        if (stamp[j] === searchId && g >= gScore[j]) continue;
        stamp[j] = searchId;
        gScore[j] = g;
        cameFrom[j] = i;
        const hj = h(j);
        if (hj < closestH) {
          closestH = hj;
          closest = j;
        }
        push(j, g + hj);
      }
    }
  }
  const end = found ? goal : closest;
  const cells = [];
  for (let c = end; c !== -1 && c !== start; c = cameFrom[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map((c) => [((c % n) + 0.5) * NAV_CELL, (((c / n) | 0) + 0.5) * NAV_CELL]);
  if (found) pts[pts.length - 1] = [bx, bz];
  // Pull the string: keep only the corners that matter.
  const out = [];
  let from = [ax, az];
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(from[0], from[1], pts[j][0], pts[j][1])) j--;
    out.push(pts[j]);
    from = pts[j];
    i = j + 1;
  }
  return out.length ? out : [[bx, bz]];
}
