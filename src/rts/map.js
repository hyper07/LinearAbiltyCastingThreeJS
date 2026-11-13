import { CELL, MAP_SIZES, NODE_SHARDS } from './rules.js';

/**
 * Shardfront's maps: made from a seed, so the same seed is the same map on
 * every machine (what a replay or a shared match needs).
 *
 * The map is a grid of `n × n` cells, CELL world units each; the world runs
 * from 0 to n·CELL on x and z. Heights sit on the cell corners
 * ((n+1)² of them). `block` says what a cell is: 0 open ground, 1 rock,
 * 2 water, 3 forest — anything but 0 can't be walked or built on.
 *
 * `starts` are where each player's first base stands (the cell at the
 * centre of its 5×5 core), and `sites` every place a base fits next to a
 * crystal field — a start's own field first.
 */

export const OPEN = 0;
export const ROCK = 1;
export const WATER = 2;
export const FOREST = 3;
export const WATER_LEVEL = -1.2;

/** A small, fast seeded random generator (mulberry32). */
export function rng(seed) {
  let a = (typeof seed === 'number' ? seed : hashString(String(seed))) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Smooth value noise, several octaves, 0..1. */
function noise2(rand) {
  const SIZE = 64;
  const table = Float32Array.from({ length: SIZE * SIZE }, () => rand());
  const at = (x, z) => table[((z & (SIZE - 1)) * SIZE) + (x & (SIZE - 1))];
  const smooth = (t) => t * t * (3 - 2 * t);
  const one = (x, z) => {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const fx = smooth(x - x0);
    const fz = smooth(z - z0);
    const a = at(x0, z0) + (at(x0 + 1, z0) - at(x0, z0)) * fx;
    const b = at(x0, z0 + 1) + (at(x0 + 1, z0 + 1) - at(x0, z0 + 1)) * fx;
    return a + (b - a) * fz;
  };
  return (x, z, octaves = 4) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += one(x * f + o * 17.3, z * f - o * 9.1) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

/** Where the players start, as cell coordinates, for 2–4 players. */
function startSpots(n, players, rand) {
  const inset = 18;
  const far = n - 1 - inset;
  if (players === 2) {
    return rand() < 0.5 ? [[inset, inset], [far, far]] : [[inset, far], [far, inset]];
  }
  if (players === 4) return [[inset, inset], [far, far], [inset, far], [far, inset]];
  const out = [];
  const turn = rand() * Math.PI * 2;
  for (let i = 0; i < players; i++) {
    const a = turn + (i / players) * Math.PI * 2;
    out.push([Math.round(n / 2 + Math.cos(a) * (n / 2 - inset - 2)), Math.round(n / 2 + Math.sin(a) * (n / 2 - inset - 2))]);
  }
  return out;
}

/**
 * @param {{ seed?: number|string, size?: keyof MAP_SIZES, players?: number }} options
 */
export function generateMap({ seed = 1, size = 'huge', players = 2 } = {}) {
  const n = MAP_SIZES[size]?.cells ?? MAP_SIZES.huge.cells;
  players = Math.max(2, Math.min(4, players | 0));
  const rand = rng(`${seed}:${size}:${players}`);
  const hills = noise2(rand);
  const rocks = noise2(rand);
  const kinds = noise2(rand);
  const lakes = noise2(rand);

  const heights = new Float32Array((n + 1) * (n + 1));
  const block = new Uint8Array(n * n);
  const scale = 5 / 128; // features about the same size on every map

  for (let z = 0; z <= n; z++) {
    for (let x = 0; x <= n; x++) heights[z * (n + 1) + x] = (hills(x * scale, z * scale, 4) - 0.5) * 9;
  }
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = z * n + x;
      if (x < 2 || z < 2 || x >= n - 2 || z >= n - 2) {
        block[i] = ROCK;
        continue;
      }
      const lake = lakes(x * scale * 0.8 + 40, z * scale * 0.8 + 40, 3);
      const r = rocks(x * scale * 1.6, z * scale * 1.6, 4);
      if (lake < 0.3) block[i] = WATER;
      else if (r > 0.66) block[i] = kinds(x * scale * 2, z * scale * 2, 2) > 0.5 ? FOREST : ROCK;
    }
  }

  const center = (n - 1) / 2;
  const starts = startSpots(n, players, rand);
  const sites = [];
  const nodes = [];
  const taken = new Set();

  const clear = (cx, cz, radius, flatten = true) => {
    let sum = 0;
    let count = 0;
    for (let z = Math.max(2, cz - radius); z <= Math.min(n - 3, cz + radius); z++) {
      for (let x = Math.max(2, cx - radius); x <= Math.min(n - 3, cx + radius); x++) {
        if ((x - cx) ** 2 + (z - cz) ** 2 > radius * radius) continue;
        block[z * n + x] = OPEN;
        sum += heights[z * (n + 1) + x];
        count++;
      }
    }
    if (!flatten || !count) return;
    const level = Math.max(WATER_LEVEL + 1.4, sum / count);
    const outer = radius + 4;
    for (let z = Math.max(0, cz - outer); z <= Math.min(n, cz + outer); z++) {
      for (let x = Math.max(0, cx - outer); x <= Math.min(n, cx + outer); x++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d > outer) continue;
        const w = d <= radius - 2 ? 1 : 1 - (d - (radius - 2)) / (outer - (radius - 2));
        const k = z * (n + 1) + x;
        heights[k] = heights[k] * (1 - w) + level * w;
      }
    }
  };

  /** A crystal field: `count` nodes on an arc `dist` cells from (cx, cz), facing `dir`. */
  const field = (cx, cz, dir, dist, count) => {
    const ids = [];
    const [dx, dz] = dir;
    const px = -dz;
    const pz = dx;
    for (let i = 0; i < count; i++) {
      const t = i - (count - 1) / 2;
      const bend = (t * t) * -0.18;
      const x = Math.round(cx + dx * (dist + bend) + px * t * 1.6);
      const z = Math.round(cz + dz * (dist + bend) + pz * t * 1.6);
      const key = z * n + x;
      if (x < 3 || z < 3 || x > n - 4 || z > n - 4 || taken.has(key)) continue;
      taken.add(key);
      block[key] = OPEN;
      ids.push(nodes.length);
      nodes.push({ cx: x, cz: z, amount: NODE_SHARDS });
    }
    return ids;
  };

  const unit = (x, z) => {
    const l = Math.hypot(x, z) || 1;
    return [x / l, z / l];
  };

  for (const [sx, sz] of starts) {
    clear(sx, sz, 15);
    // The start's own field, on the side away from the middle of the map.
    const out = unit(sx - center, sz - center);
    const ids = field(sx, sz, out, 9, 8);
    sites.push({ cx: sx, cz: sz, nodes: ids, start: true });
  }

  // Expansions: a "natural" for each start toward the middle, then the middle and the sides.
  const spots = [];
  for (const [sx, sz] of starts) {
    const toward = unit(center - sx, center - sz);
    const swing = (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.3);
    const c = Math.cos(swing);
    const s = Math.sin(swing);
    const dir = [toward[0] * c - toward[1] * s, toward[0] * s + toward[1] * c];
    spots.push([Math.round(sx + dir[0] * 30), Math.round(sz + dir[1] * 30)]);
  }
  if (players !== 3) spots.push([Math.round(center), Math.round(center)]);
  if (n >= 160) {
    const edge = 20;
    for (const [x, z] of [[center, edge], [center, n - 1 - edge], [edge, center], [n - 1 - edge, center]]) spots.push([Math.round(x), Math.round(z)]);
  }
  if (n >= 224) {
    const q = Math.round(n / 4);
    for (const [x, z] of [[q, q], [n - 1 - q, q], [q, n - 1 - q], [n - 1 - q, n - 1 - q]]) spots.push([x, z]);
  }
  for (const [x0, z0] of spots) {
    const x = Math.max(16, Math.min(n - 17, x0));
    const z = Math.max(16, Math.min(n - 17, z0));
    // Not on top of a base already there.
    if (sites.some((s) => Math.hypot(s.cx - x, s.cz - z) < 22)) continue;
    clear(x, z, 11);
    const away = Math.hypot(x - center, z - center) < 4 ? unit(rand() - 0.5, rand() - 0.5) : unit(x - center, z - center);
    const ids = field(x, z, away, 8, 6);
    sites.push({ cx: x, cz: z, nodes: ids, start: false });
  }

  carvePaths(n, block, sites, taken);

  // Water lies low; dry land stays above it.
  for (let z = 0; z <= n; z++) {
    for (let x = 0; x <= n; x++) {
      let wet = 0;
      let cells = 0;
      for (const [ox, oz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const cx = x + ox;
        const cz = z + oz;
        if (cx < 0 || cz < 0 || cx >= n || cz >= n) continue;
        cells++;
        if (block[cz * n + cx] === WATER) wet++;
      }
      const k = z * (n + 1) + x;
      if (cells && wet === cells) heights[k] = Math.min(heights[k], WATER_LEVEL - 1.6);
      else heights[k] = Math.max(heights[k], WATER_LEVEL + 0.25);
    }
  }

  return { n, cell: CELL, size: n * CELL, seed, players, heights, block, starts: starts.map(([cx, cz]) => ({ cx, cz })), sites, nodes };
}

/**
 * Make sure every base site can be walked to from the first start: wherever
 * one can't, cut a path three cells wide to the middle, and from the middle to
 * the first start.
 */
function carvePaths(n, block, sites, nodeCells) {
  const open = (i) => block[i] === OPEN && !nodeCells.has(i);
  const reach = () => {
    const seen = new Uint8Array(n * n);
    const first = sites[0].cz * n + sites[0].cx;
    const queue = [first];
    seen[first] = 1;
    while (queue.length) {
      const i = queue.pop();
      const x = i % n;
      const z = (i / n) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        const j = nz * n + nx;
        if (!seen[j] && open(j)) {
          seen[j] = 1;
          queue.push(j);
        }
      }
    }
    return seen;
  };
  const cut = (x0, z0, x1, z1) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const z = Math.round(z0 + ((z1 - z0) * s) / steps);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = x + dx;
          const cz = z + dz;
          if (cx < 2 || cz < 2 || cx >= n - 2 || cz >= n - 2) continue;
          const i = cz * n + cx;
          if (!nodeCells.has(i)) block[i] = OPEN;
        }
      }
    }
  };
  const mid = Math.round((n - 1) / 2);
  for (let pass = 0; pass < 3; pass++) {
    const seen = reach();
    const lost = sites.filter((s) => !seen[s.cz * n + s.cx]);
    if (!lost.length) return;
    for (const s of lost) {
      cut(s.cx, s.cz, mid, mid);
      cut(mid, mid, sites[0].cx, sites[0].cz);
    }
  }
}

/** The ground's height at a world point (between the corner heights). */
export function heightAt(map, x, z) {
  const n = map.n;
  const gx = Math.max(0, Math.min(n - 0.001, x / CELL));
  const gz = Math.max(0, Math.min(n - 0.001, z / CELL));
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = gx - x0;
  const fz = gz - z0;
  const h = map.heights;
  const w = n + 1;
  const a = h[z0 * w + x0] + (h[z0 * w + x0 + 1] - h[z0 * w + x0]) * fx;
  const b = h[(z0 + 1) * w + x0] + (h[(z0 + 1) * w + x0 + 1] - h[(z0 + 1) * w + x0]) * fx;
  return a + (b - a) * fz;
}
