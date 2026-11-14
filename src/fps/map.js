/**
 * Breachline's map, "Foundry": our own layout. Eighty metres by sixty; the
 * Raiders start in the west, the Wardens in the east; three lanes run
 * between (north, middle, south) with two doors across; site A is in the
 * north-east and site B in the south-east.
 *
 * Everything solid is a box: [x, z, wide, deep, tall] with x east and z
 * south, in metres. `NODES` and `EDGES` are the ways bots walk; every edge
 * is a clear line between two places (the tests check it).
 */

export const SIZE = [80, 60];
export const BOXES = [
  // The outer walls.
  [-1, -1, 82, 1, 5], [-1, 60, 82, 1, 5], [-1, 0, 1, 60, 5], [80, 0, 1, 60, 5],
  // Between the north lane and the middle, with a door at x 34–38.
  [18, 16, 16, 8, 4.2], [38, 16, 14, 8, 4.2],
  // Between the middle and the south lane, with a door at x 29–35.
  [18, 36, 11, 8, 4.2], [35, 36, 17, 8, 4.2],
  // The long wall in front of the Wardens' start.
  [56, 20, 4, 20, 4.2],
  // Cover: low crates you can shoot over, tall ones you cannot.
  [26, 6, 2, 2, 1.25], [46, 4.5, 2, 2, 2.3], [28, 26, 2, 2, 1.25], [44, 32.4, 2, 3, 2.3], [24, 51, 2, 2, 1.25], [44, 50, 2.4, 2, 2.3],
  [58, 5, 2, 2, 1.25], [63, 14, 2.4, 2.4, 2.3], [66, 4, 3, 1.4, 1.25],
  [59, 53, 2, 2, 1.25], [63, 44, 2.4, 2.4, 2.3], [66, 54.5, 3, 1.4, 1.25],
  [4, 18, 2, 2, 1.25], [4, 40, 2, 2, 1.25], [76, 20, 2, 2, 1.25], [76, 38, 2, 2, 1.25]
];
export const SITES = { A: { x: 62, z: 10, r: 5.5 }, B: { x: 62, z: 50, r: 5.5 } };
export const SPAWNS = {
  atk: [[6, 26], [6, 30], [6, 34], [9, 28], [9, 32]],
  def: [[74, 26], [74, 30], [74, 34], [71, 28], [71, 32]]
};
export const NODES = {
  T: [8, 30], TN: [14, 10], TM: [16, 30], TS: [14, 50],
  N1: [24, 12], N2: [36, 10], N3: [50, 10], NC: [36, 20],
  M1: [24, 30], M2: [36, 30], M3: [53, 30], SC: [32, 40],
  S1: [22, 48], S2: [36, 50], S3: [50, 48],
  MA: [54, 18], MB: [54, 42], A: [62, 10], B: [62, 50], A2: [68, 14], B2: [68, 46],
  CA: [70, 18], CB: [70, 42], CT: [72, 30]
};
export const EDGES = [
  ['T', 'TN'], ['T', 'TM'], ['T', 'TS'], ['TN', 'N1'], ['N1', 'N2'], ['N2', 'N3'], ['N3', 'A'], ['N2', 'NC'], ['NC', 'M2'],
  ['TM', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'MA'], ['MA', 'A'], ['M3', 'MB'], ['MB', 'B'], ['M2', 'SC'], ['SC', 'S2'],
  ['TS', 'S1'], ['S1', 'S2'], ['S2', 'S3'], ['S3', 'B'], ['A', 'A2'], ['A2', 'CA'], ['CA', 'CT'], ['CT', 'CB'], ['CB', 'B2'], ['B2', 'B'],
  ['MA', 'CA'], ['MB', 'CB'], ['N3', 'MA'], ['S3', 'MB']
];
/** Where Wardens stand to watch each site, and where Raiders settle once the charge is set. */
export const HOLDS = { A: ['A', 'A2', 'MA', 'N3', 'CA'], B: ['B', 'B2', 'MB', 'S3', 'CB'], mid: ['M3', 'CT'] };

const links = new Map(Object.keys(NODES).map((k) => [k, []]));
for (const [a, b] of EDGES) {
  const d = Math.hypot(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]);
  links.get(a).push([b, d]);
  links.get(b).push([a, d]);
}

/** The node nearest a point. */
export function nearestNode(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const [k, [nx, nz]] of Object.entries(NODES)) {
    const d = Math.hypot(nx - x, nz - z);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

/** The shortest way from one node to another, as node names (both ends included). `avoid` makes some nodes cost more (to vary routes). */
export function route(from, to, avoid = null) {
  const dist = new Map([[from, 0]]);
  const prev = new Map();
  const open = new Set([from]);
  while (open.size) {
    let cur = null;
    for (const k of open) if (cur == null || dist.get(k) < dist.get(cur)) cur = k;
    open.delete(cur);
    if (cur === to) break;
    for (const [n, d] of links.get(cur)) {
      const nd = dist.get(cur) + d + (avoid?.has(n) ? 30 : 0);
      if (nd < (dist.get(n) ?? Infinity)) {
        dist.set(n, nd);
        prev.set(n, cur);
        open.add(n);
      }
    }
  }
  const path = [to];
  while (path[0] !== from && prev.has(path[0])) path.unshift(prev.get(path[0]));
  return path[0] === from ? path : [from];
}

/** Whether a flat circle at a point is clear of every box that reaches up past `above` metres. */
export function clear(x, z, r = 0.4, above = 0.2) {
  for (const [bx, bz, w, d, h] of BOXES) {
    if (h <= above) continue;
    const cx = Math.max(bx, Math.min(bx + w, x));
    const cz = Math.max(bz, Math.min(bz + d, z));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
  }
  return true;
}

/**
 * How far a ray goes before it meets a box: from a point (x, y up, z) along
 * a direction, at most `far`. Returns the distance (or `far`).
 */
export function rayBoxes(ox, oy, oz, dx, dy, dz, far = 300) {
  let best = far;
  for (const [bx, bz, w, d, h] of BOXES) {
    let t0 = 0;
    let t1 = best;
    let hit = true;
    for (const [o, v, lo, hi] of [[ox, dx, bx, bx + w], [oy, dy, 0, h], [oz, dz, bz, bz + d]]) {
      if (Math.abs(v) < 1e-9) {
        if (o < lo || o > hi) {
          hit = false;
          break;
        }
      } else {
        let a = (lo - o) / v;
        let b = (hi - o) / v;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
        if (t0 > t1) {
          hit = false;
          break;
        }
      }
    }
    if (hit && t0 < best) best = t0;
  }
  return best;
}

/** Whether one eye can see another (nothing solid between them). */
export function sees(ax, ay, az, bx, by, bz) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1e-9;
  return rayBoxes(ax, ay, az, dx / len, dy / len, dz / len, len) >= len - 0.01;
}
