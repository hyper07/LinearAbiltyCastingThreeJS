import { BUILDINGS, FOES, GUARDIANS } from './rules.js';

/**
 * The Gravefield: Grave Purge's land, our own layout. 256 metres square;
 * x east, z south. The squad's camp is in the north-west corner. Four
 * broken rings of ridges, centred on the camp's corner, cut the land into
 * bands that get harder the further out they are (tier 1 to 4); each ring
 * has gaps to pass through. Past the last ring, in the far south-east, the
 * Heart of the Grave sits in its sanctum, one way in.
 *
 * Everything is placed from a fixed seed, so every browser in a room has
 * the same land without sending it: buildings and guards have fixed ids.
 * Walking goes over a grid of 2-metre cells (`Grid`): ridges, rocks and
 * standing buildings block it.
 */

export const SIZE = 256;
export const CELL = 2;
export const N = SIZE / CELL;

/** The camp: where soldiers are made, raised and healed. */
export const BASE = { x0: 0, z0: 0, x1: 48, z1: 38 };
export const BARRACKS = { x: 14, z: 9, r: 3 };
export const ARMORY = { x: 34, z: 9, r: 2.6 };
/** The Forge: on the camp's left side, ringed with blue crystals. Soldiers walked into its ring are raised. */
export const FORGE = { x: 8, z: 20, r: 2.4 };
export const PAD = { x: 26, z: 22 };
/** The board by the Forge, the combinations written on it (its middle, along the ground). */
export const BOARD = { x: 12.5, z: 33.5, w: 11 };
export const SPAWN = { x: 22, z: 15 };
/** The Exchange: points become ore while one of yours stands here. */
export const EXCHANGE_AT = { x: 40, z: 30 };
/** Each player's own bunker, inside the camp: three along its east side, one in its south-east corner. */
export const BUNKERS = [{ x: 42, z: 9 }, { x: 42, z: 16 }, { x: 42, z: 23 }, { x: 32, z: 31 }];
export const inBase = (x, z) => x >= BASE.x0 && x <= BASE.x1 && z >= BASE.z0 && z <= BASE.z1;

/** The rings: radius from the camp's corner, and the arcs (in degrees, 0 = east, 90 = south) that are ridge. */
const RINGS = [
  { r: 100, arcs: [[6, 26], [36, 54], [64, 84]] },
  { r: 165, arcs: [[0, 17], [27, 47], [57, 77], [86, 90]] },
  { r: 225, arcs: [[8, 30], [40, 62], [72, 90]] },
  { r: 285, arcs: [[28, 41], [49, 62]] }
];
const RIDGE_WIDTH = 7;

/** Each ridge as a line of points (every 3 m). */
export const RIDGES = [];
for (const ring of RINGS) {
  for (const [a0, a1] of ring.arcs) {
    const pts = [];
    const steps = Math.max(2, Math.ceil(((a1 - a0) * Math.PI * ring.r) / 180 / 3));
    for (let i = 0; i <= steps; i++) {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      const x = Math.cos(a) * ring.r;
      const z = Math.sin(a) * ring.r;
      if (x < -2 || z < -2 || x > SIZE + 2 || z > SIZE + 2) continue;
      pts.push([x, z]);
    }
    if (pts.length > 1) RIDGES.push({ pts, w: RIDGE_WIDTH });
  }
}

/** How far out a place is: 1 (near the camp) to 4 (the far south-east). */
export function tierAt(x, z) {
  const r = Math.hypot(x, z);
  return r < 100 ? 1 : r < 165 ? 2 : r < 225 ? 3 : 4;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const polar = (r, deg) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];

const nearRidge = (x, z, pad) => {
  for (const { pts, w } of RIDGES) for (const [px, pz] of pts) if (Math.hypot(x - px, z - pz) < w / 2 + pad) return true;
  return false;
};

/* ------------------------------------------------------------- the layout */

const rand = rng(20261114);
/** Boulders in the bands: [x, z, r]. */
export const ROCKS = [];
/** Every building: { id, type, x, z, tier, guard? (a guardian's kind) }. */
export const STRUCTURES = [];
/** Every guard: { id, kind, x, z, tier, camp, boss? }. */
export const GUARDS = [];
let nextId = 1;
const taken = [];
const free = (x, z, r) => x > r + 3 && z > r + 3 && x < SIZE - r - 3 && z < SIZE - r - 3 && !(x < BASE.x1 + 12 && z < BASE.z1 + 12) && !nearRidge(x, z, r + 2) && taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > r + tr + 3);

function build(type, x, z, extra = {}) {
  const def = BUILDINGS[type];
  const b = { id: nextId++, type, x: +x.toFixed(1), z: +z.toFixed(1), tier: type === 'heart' ? 4 : tierAt(x, z), ...extra };
  STRUCTURES.push(b);
  taken.push([x, z, def.r + 1]);
  return b;
}

/** A camp of guards round a point. */
let campId = 0;
function camp(x, z, kinds, count, spread = 4) {
  const id = campId++;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand();
    const d = spread * (0.5 + rand() * 0.6);
    const gx = x + Math.cos(a) * d;
    const gz = z + Math.sin(a) * d;
    GUARDS.push({ id: nextId++, kind: kinds[Math.floor(rand() * kinds.length)], x: +gx.toFixed(1), z: +gz.toFixed(1), tier: tierAt(x, z), camp: id });
  }
  taken.push([x, z, spread]);
  return id;
}

/** Somewhere free in a band (between two radii), between two angles. */
function spot(r0, r1, a0, a1, r) {
  for (let tries = 0; tries < 400; tries++) {
    const [x, z] = polar(r0 + rand() * (r1 - r0), a0 + rand() * (a1 - a0));
    if (free(x, z, r)) return [x, z];
  }
  return null;
}

// Boulders first, so the rest keeps clear of them.
for (let i = 0; i < 46; i++) {
  const p = spot(60, 330, 0, 90, 3);
  if (!p) continue;
  const r = 1.6 + rand() * 2.2;
  ROCKS.push([+p[0].toFixed(1), +p[1].toFixed(1), +r.toFixed(1)]);
  taken.push([p[0], p[1], r]);
}

// The six shrines and the six soul nodes (each node with its guardian), and the Heart.
const SHRINES = [[135, 22], [135, 68], [196, 12], [196, 78], [250, 24], [250, 66]];
const NODES = [[135, 45, 'marrow'], [140, 5, 'ash'], [140, 85, 'hound'], [200, 33, 'bishop'], [200, 57, 'cinder'], [264, 45, 'rotfather']];
export const HEART = { x: 232, z: 232 };
build('heart', HEART.x, HEART.z);
camp(HEART.x - 9, HEART.z - 9, ['wight', 'bonecaller'], 8, 5);
for (const [r, a] of SHRINES) {
  const [x, z] = polar(r, a);
  build('shrine', x, z);
  const t = tierAt(x, z);
  camp(x + 7, z + 5, t > 2 ? ['wight', 'bonecaller', 'brute'] : ['brute', 'hexer', 'husk'], 6, 4);
}
for (const [r, a, guard] of NODES) {
  const [x, z] = polar(r, a);
  build('node', x, z, { guard });
  GUARDS.push({ id: nextId++, kind: guard, x: +(x - 5).toFixed(1), z: +(z - 4).toFixed(1), tier: tierAt(x, z), camp: campId, boss: true });
  const t = tierAt(x, z);
  camp(x - 5, z - 4, t > 2 ? ['wight', 'bonecaller'] : ['brute', 'hexer', 'ravager'], 5, 5);
}
// The sanctum round the Heart: towers and ossuaries.
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + 0.4;
  const x = HEART.x + Math.cos(a) * 15;
  const z = HEART.z + Math.sin(a) * 15;
  if (free(x, z, 1.4)) build(i % 2 ? 'spire' : 'ossuary', x, z);
}
// Relic caches, out at the edges.
for (const [x, z] of [[8, 118], [118, 8], [10, 196], [196, 10], [150, 150], [70, 240], [240, 120], [96, 96]]) {
  const p = free(x, z, 1) ? [x, z] : spot(Math.hypot(x, z) - 10, Math.hypot(x, z) + 10, (Math.atan2(z, x) * 180) / Math.PI - 6, (Math.atan2(z, x) * 180) / Math.PI + 6, 1);
  if (p) build('cache', p[0], p[1]);
}
// The rest, band by band: [inner, outer radius, spires, barrows, crypts, ossuaries, camps, the guards they keep].
const BANDS = [
  [52, 95, 6, 6, 2, 0, 12, ['husk', 'husk', 'ravager', 'hexer'], [4, 6]],
  [106, 160, 10, 9, 4, 1, 14, ['husk', 'ravager', 'hexer', 'brute', 'mire'], [5, 7]],
  [171, 220, 12, 8, 3, 3, 13, ['brute', 'hexer', 'wight', 'bonecaller', 'wraith', 'mire'], [4, 6]],
  [231, 340, 12, 6, 2, 3, 13, ['wight', 'bonecaller', 'brute', 'wraith'], [4, 6]]
];
for (const [r0, r1, spires, barrows, crypts, ossuaries, camps, kinds, [c0, c1]] of BANDS) {
  for (const [type, n] of [['crypt', crypts], ['ossuary', ossuaries], ['spire', spires], ['barrow', barrows]]) {
    for (let i = 0; i < n; i++) {
      const p = spot(r0, r1, 0, 90, BUILDINGS[type].r);
      if (p) build(type, p[0], p[1]);
    }
  }
  for (let i = 0; i < camps; i++) {
    const p = spot(r0, r1, 0, 90, 4);
    if (p) camp(p[0], p[1], kinds, c0 + Math.floor(rand() * (c1 - c0 + 1)));
  }
}
export const FIRST_DYNAMIC = 100000;

/** The things that must fall before the Heart can be hurt. */
export const KEYS = STRUCTURES.filter((s) => BUILDINGS[s.type].key).map((s) => s.id);

/* ---------------------------------------------------------------- walking */

/**
 * Where you can walk: a grid of 2-metre cells over the land. Ridges and
 * rocks block for good; a building blocks while it stands (`free(id)`
 * opens its cells when it falls).
 */
export class Grid {
  constructor(structures = STRUCTURES) {
    this.block = new Uint8Array(N * N);
    const mark = (x, z, r, add) => {
      const c0 = Math.max(0, Math.floor((x - r) / CELL));
      const c1 = Math.min(N - 1, Math.floor((x + r) / CELL));
      const r0 = Math.max(0, Math.floor((z - r) / CELL));
      const r1 = Math.min(N - 1, Math.floor((z + r) / CELL));
      for (let j = r0; j <= r1; j++) {
        for (let i = c0; i <= c1; i++) {
          if (Math.hypot((i + 0.5) * CELL - x, (j + 0.5) * CELL - z) <= r + 0.4) this.block[j * N + i] += add;
        }
      }
    };
    this.mark = mark;
    for (const { pts, w } of RIDGES) for (const [x, z] of pts) mark(x, z, w / 2, 1);
    for (const [x, z, r] of ROCKS) mark(x, z, r, 1);
    for (const s of structures) mark(s.x, s.z, BUILDINGS[s.type].r, 1);
    this.structures = new Map(structures.map((s) => [s.id, s]));
  }

  /** A building fell: its ground is open. */
  free(id) {
    const s = this.structures.get(id);
    // Kept per grid (not on the shared map), so one game's ruins never leak into the next.
    this.freed ??= new Set();
    if (!s || this.freed.has(id)) return;
    this.freed.add(id);
    this.mark(s.x, s.z, BUILDINGS[s.type].r, -1);
  }

  blocked(x, z) {
    const i = Math.floor(x / CELL);
    const j = Math.floor(z / CELL);
    if (i < 0 || j < 0 || i >= N || j >= N) return true;
    return this.block[j * N + i] > 0;
  }

  /** Is the straight walk from a to b open all the way? */
  line(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5));
    for (let k = 1; k <= n; k++) if (this.blocked(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n)) return false;
    return true;
  }

  /** The nearest open cell's middle to a point. */
  open(x, z) {
    if (!this.blocked(x, z)) return [x, z];
    for (let d = 1; d < 12; d++) {
      for (let k = 0; k < 8 * d; k++) {
        const a = (k / (8 * d)) * Math.PI * 2;
        const px = x + Math.cos(a) * d * CELL;
        const pz = z + Math.sin(a) * d * CELL;
        if (!this.blocked(px, pz)) return [px, pz];
      }
    }
    return [x, z];
  }

  /**
   * A way from a to b round what blocks it (A* over the cells, then the
   * corners cut where the straight line is open). Null if there is none.
   */
  path(ax, az, bx, bz) {
    if (this.line(ax, az, bx, bz)) return [[bx, bz]];
    [bx, bz] = this.open(bx, bz);
    const start = Math.floor(az / CELL) * N + Math.floor(ax / CELL);
    const goal = Math.floor(bz / CELL) * N + Math.floor(bx / CELL);
    if (start < 0 || start >= N * N || goal < 0 || goal >= N * N) return null;
    const g = new Float32Array(N * N).fill(Infinity);
    const from = new Int32Array(N * N).fill(-1);
    const shut = new Uint8Array(N * N);
    const heap = new Heap();
    const gi = goal % N;
    const gj = (goal / N) | 0;
    const h = (c) => {
      const dx = Math.abs((c % N) - gi);
      const dz = Math.abs(((c / N) | 0) - gj);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    g[start] = 0;
    heap.push(start, h(start));
    let found = false;
    let expanded = 0;
    while (heap.size) {
      const c = heap.pop();
      if (shut[c]) continue;
      shut[c] = 1;
      if (c === goal) {
        found = true;
        break;
      }
      if (++expanded > 9000) break;
      const ci = c % N;
      const cj = (c / N) | 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
          const n = nj * N + ni;
          if (shut[n] || (this.block[n] && n !== goal)) continue;
          // No cutting a blocked corner.
          if (di && dj && (this.block[cj * N + ni] || this.block[nj * N + ci])) continue;
          const cost = g[c] + (di && dj ? 1.414 : 1);
          if (cost < g[n]) {
            g[n] = cost;
            from[n] = c;
            heap.push(n, cost + h(n));
          }
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== start && c >= 0; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => [((c % N) + 0.5) * CELL, (((c / N) | 0) + 0.5) * CELL]);
    pts[pts.length - 1] = [bx, bz];
    // Cut corners: from each point, jump to the furthest one in a straight open line.
    const out = [];
    let at = [ax, az];
    let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = Math.min(pts.length - 1, k + 24); m > k; m--) {
        if (this.line(at[0], at[1], pts[m][0], pts[m][1])) {
          far = m;
          break;
        }
      }
      out.push(pts[far]);
      at = pts[far];
      k = far + 1;
    }
    return out;
  }
}

class Heap {
  constructor() {
    this.items = [];
    this.keys = [];
  }

  get size() {
    return this.items.length;
  }

  push(item, key) {
    const a = this.items;
    const k = this.keys;
    a.push(item);
    k.push(key);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      [k[p], k[i]] = [k[i], k[p]];
      i = p;
    }
  }

  pop() {
    const a = this.items;
    const k = this.keys;
    const top = a[0];
    const last = a.pop();
    const lk = k.pop();
    if (a.length) {
      a[0] = last;
      k[0] = lk;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && k[l] < k[m]) m = l;
        if (r < a.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return top;
  }
}

/** A guard's stats (a camp guard, a spawned one, or a guardian). */
export const foeDef = (kind) => FOES[kind] ?? GUARDIANS[kind];
