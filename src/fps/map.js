/**
 * Breachline's map, "Foundry": our own layout, an old works yard. 144 metres
 * by 104. The Raiders start in the west yard, the Wardens in the east; three
 * lanes run between — north, the middle road, south — split by four brick
 * warehouses with a gap between each pair, and a pump house in front of the
 * Wardens' yard. Site A is in the north-east, site B in the south-east.
 *
 * Everything solid is a box: [x, z, wide, deep, tall, kind] with x east and
 * z south, in metres. `kind` only says how it looks (view.js): a `wall`, a
 * `building`, a shipping `container`, a stack of `crates`, `barrels`, gas
 * `tanks`, a pallet of `bags`. `NODES` and `EDGES` are the ways bots walk;
 * every edge is a clear line between two places (the tests check it).
 */

export const SIZE = [144, 104];
export const BOXES = [
  // The yard wall.
  [-1, -1, 146, 1, 6, 'wall'], [-1, 104, 146, 1, 6, 'wall'], [-1, 0, 1, 104, 6, 'wall'], [144, 0, 1, 104, 6, 'wall'],
  // Warehouses between the north lane and the middle road, with a gap at x 61–68…
  [32, 28, 29, 14, 8, 'building'], [68, 28, 26, 14, 9, 'building'],
  // …and between the middle road and the south lane, with a gap at x 52–63.
  [32, 62, 20, 14, 8, 'building'], [63, 62, 31, 14, 9, 'building'],
  // The pump house in front of the Wardens' yard.
  [101, 35, 6, 34, 6, 'building'],
  // The west yard.
  [4, 32, 2, 2, 1.2, 'barrels'], [4, 72, 2, 2, 1.2, 'barrels'], [22, 64, 6.1, 2.5, 2.6, 'container'], [18, 10, 2.4, 1.6, 1.3, 'crates'], [18, 94, 1.6, 2, 0.9, 'bags'],
  // The north lane.
  [44, 6, 2.4, 2.4, 1.3, 'crates'], [52, 10, 6.1, 2.5, 2.6, 'container'], [74, 3, 2, 2, 1.1, 'tanks'], [78, 20, 2.5, 6.1, 2.6, 'container'], [84, 6, 2.4, 2.4, 2.5, 'crates'],
  // The middle road.
  [40, 45, 2.4, 2.4, 1.3, 'crates'], [50, 56, 6.1, 2.5, 2.6, 'container'], [73, 44, 2.5, 6.1, 2.6, 'container'], [80, 55, 2.4, 2.4, 1.3, 'crates'], [88, 46, 2, 2, 1.1, 'barrels'],
  // The south lane.
  [44, 96, 2.4, 2.4, 1.3, 'crates'], [52, 90, 6.1, 2.5, 2.6, 'container'], [76, 78, 2.5, 6.1, 2.6, 'container'], [80, 96, 2.4, 2.4, 2.5, 'crates'], [62, 100, 1.6, 2, 0.9, 'bags'],
  // Site A and around it.
  [106, 8, 2.4, 2.4, 1.3, 'crates'], [116, 10, 6.1, 2.5, 2.6, 'container'], [108, 25, 2, 2, 1.2, 'barrels'], [128, 8, 2.4, 2.4, 2.5, 'crates'], [120, 2, 2, 2, 1.1, 'tanks'],
  // Site B and around it.
  [106, 94, 2.4, 2.4, 1.3, 'crates'], [116, 91.5, 6.1, 2.5, 2.6, 'container'], [108, 77, 2, 2, 1.2, 'barrels'], [128, 94, 2.4, 2.4, 2.5, 'crates'], [120, 100, 2, 2, 1.1, 'tanks'],
  // The Wardens' yard.
  [116, 40, 2.4, 2.4, 1.3, 'crates'], [116, 62, 2.4, 2.4, 1.3, 'crates'], [138, 32, 2, 2, 1.2, 'barrels'], [138, 70, 2, 2, 1.2, 'barrels']
];
export const SITES = { A: { x: 112, z: 17, r: 7 }, B: { x: 112, z: 87, r: 7 } };
export const SPAWNS = {
  atk: [[8, 46], [8, 52], [8, 58], [13, 49], [13, 55]],
  def: [[136, 46], [136, 52], [136, 58], [131, 49], [131, 55]]
};
export const NODES = {
  T: [14, 52], TN: [25, 17], TM: [29, 52], TS: [25, 87],
  N1: [43, 21], N2: [65, 17], N3: [90, 17], NC: [64.5, 35],
  M1: [43, 52], M2: [65, 52], M3: [95, 52], SC: [57.5, 69],
  S1: [40, 83], S2: [65, 87], S3: [90, 83],
  MA: [97, 31], MB: [97, 73], A: [112, 17], B: [112, 87], A2: [122, 24], B2: [122, 80],
  CA: [126, 31], CB: [126, 73], CT: [130, 52]
};
export const EDGES = [
  ['T', 'TN'], ['T', 'TM'], ['T', 'TS'], ['TN', 'N1'], ['N1', 'N2'], ['N2', 'N3'], ['N3', 'A'], ['N2', 'NC'], ['NC', 'M2'],
  ['TM', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'MA'], ['MA', 'A'], ['M3', 'MB'], ['MB', 'B'], ['M2', 'SC'], ['SC', 'S2'],
  ['TS', 'S1'], ['S1', 'S2'], ['S2', 'S3'], ['S3', 'B'], ['A', 'A2'], ['A2', 'CA'], ['CA', 'CT'], ['CT', 'CB'], ['CB', 'B2'], ['B2', 'B'],
  ['MA', 'CA'], ['MB', 'CB'], ['N3', 'MA'], ['S3', 'MB']
];
/** Where Wardens stand to watch each site, and where Raiders settle once the charge is set. */
export const HOLDS = { A: ['A', 'A2', 'MA', 'N3', 'CA'], B: ['B', 'B2', 'MB', 'S3', 'CB'], mid: ['M3', 'CT'] };
/**
 * What the bots need to know of the layout: the lanes each Raider would
 * rather not take (so they don't all walk in a line), where to keep an eye,
 * how near a site a sighting raises the alarm, and how far anyone can see.
 */
export const PLAN = {
  lanes: [['N2', 'S2'], ['M2'], ['M2', 'S2'], ['N2'], []],
  watch: { plant: [90, 52], guard: [130, 52], disarm: [72, 52], idle: [72, 52], hold: { A: [54, 21], B: [54, 83], mid: [54, 52] } },
  alarm: 45,
  sight: 140,
  /** Where Raiders gather before they hit a site, by the way they come (two ways to each). */
  stage: { A: ['N3', 'MA'], B: ['S3', 'MB'] },
  /** Where Raiders smoke off as they hit: the ways Wardens come back from their yard. */
  smokes: { A: [[121, 25], [124, 15]], B: [[121, 79], [124, 89]] },
  /** Where Wardens gather to take a site back, and where they smoke the Raiders' guard spots off. */
  retake: { A: 'CA', B: 'CB' },
  retakeSmokes: { A: [[101, 21]], B: [[101, 83]] }
};

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
