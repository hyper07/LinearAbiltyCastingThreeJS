/**
 * Breachline's maps, our own layouts. Each is the same kind of thing: two
 * sides start at opposite ends, two sites (A and B) to set the charge in,
 * and the ways between.
 *
 * Everything solid is a box: [x, z, wide, deep, tall, kind] with x east and
 * z south, in metres. `kind` only says how it looks (view.js): a `wall`, a
 * `building`, a shipping `container`, a stack of `crates`, `barrels`, gas
 * `tanks`, a pallet of `bags`. `NODES` and `EDGES` are the ways bots walk;
 * every edge is a clear line between two places (the tests check it, on
 * every map). `PLAN` is what the bots know of a map's tactics.
 */

/**
 * Foundry: an old works yard, 144 by 104. Four brick warehouses split it into
 * a north lane, a middle road and a south lane, with a gap between each pair;
 * a pump house stands in front of the Wardens' yard.
 */
const FOUNDRY = {
  id: 'foundry',
  name: 'Foundry',
  text: 'An old works yard: three lanes between brick warehouses, two gaps across. Long sightlines down the middle road.',
  look: { ground: 'asphalt', walls: ['brick', 'brickRed'], lines: 52 },
  SIZE: [144, 104],
  BOXES: [
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
],
  SITES: { A: { x: 112, z: 17, r: 7 }, B: { x: 112, z: 87, r: 7 } },
  SPAWNS: {
  atk: [[8, 46], [8, 52], [8, 58], [13, 49], [13, 55]],
  def: [[136, 46], [136, 52], [136, 58], [131, 49], [131, 55]]
},
  NODES: {
  T: [14, 52], TN: [25, 17], TM: [29, 52], TS: [25, 87],
  N1: [43, 21], N2: [65, 17], N3: [90, 17], NC: [64.5, 35],
  M1: [43, 52], M2: [65, 52], M3: [95, 52], SC: [57.5, 69],
  S1: [40, 83], S2: [65, 87], S3: [90, 83],
  MA: [97, 31], MB: [97, 73], A: [112, 17], B: [112, 87], A2: [122, 24], B2: [122, 80],
  CA: [126, 31], CB: [126, 73], CT: [130, 52]
},
  EDGES: [
  ['T', 'TN'], ['T', 'TM'], ['T', 'TS'], ['TN', 'N1'], ['N1', 'N2'], ['N2', 'N3'], ['N3', 'A'], ['N2', 'NC'], ['NC', 'M2'],
  ['TM', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'MA'], ['MA', 'A'], ['M3', 'MB'], ['MB', 'B'], ['M2', 'SC'], ['SC', 'S2'],
  ['TS', 'S1'], ['S1', 'S2'], ['S2', 'S3'], ['S3', 'B'], ['A', 'A2'], ['A2', 'CA'], ['CA', 'CT'], ['CT', 'CB'], ['CB', 'B2'], ['B2', 'B'],
  ['MA', 'CA'], ['MB', 'CB'], ['N3', 'MA'], ['S3', 'MB']
],
  /** Where Wardens stand to watch each site, and where Raiders settle once the charge is set. */
  HOLDS: { A: ['A', 'A2', 'MA', 'N3', 'CA'], B: ['B', 'B2', 'MB', 'S3', 'CB'], mid: ['M3', 'CT'] },
  /**
   * What the bots need to know of the layout: the lanes each Raider would
 * rather not take (so they don't all walk in a line), where to keep an eye,
 * how near a site a sighting raises the alarm, and how far anyone can see.
 */
  PLAN: {
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
}
};

/**
 * Harbor: a container port, 136 by 96. One long warehouse fills the middle,
 * cut through by a narrow corridor — the only way across the middle. The
 * north and south quays are a maze of containers, some stacked two high.
 */
const HARBOR = {
  id: 'harbor',
  name: 'Harbor',
  text: 'A container port: stacked containers on two quays, and one tight corridor through the warehouse in the middle.',
  look: { ground: 'asphalt', walls: ['brickRed', 'brickRed'], lines: null },
  SIZE: [136, 96],
  BOXES: [
    [-1, -1, 138, 1, 6, 'wall'], [-1, 96, 138, 1, 6, 'wall'], [-1, 0, 1, 96, 6, 'wall'], [136, 0, 1, 96, 6, 'wall'],
    // The warehouse, split by the corridor (z 46–50).
    [50, 32, 36, 14, 10, 'building'], [50, 50, 36, 14, 10, 'building'],
    // The office in front of the Wardens' quay.
    [94, 36, 6, 24, 6, 'building'],
    // The west yard.
    [4, 28, 2, 2, 1.2, 'barrels'], [4, 66, 2, 2, 1.2, 'barrels'], [18, 58, 2.4, 2.4, 1.3, 'crates'],
    // The north quay.
    [30, 26, 6.1, 2.5, 5.2, 'container'], [40, 8, 6.1, 2.5, 2.6, 'container'], [56, 20, 6.1, 2.5, 2.6, 'container'], [64, 14, 2.4, 2.4, 1.3, 'crates'],
    [70, 6, 6.1, 2.5, 2.6, 'container'], [80, 22, 2.5, 6.1, 2.6, 'container'], [46, 26, 2, 2, 1.1, 'tanks'], [76, 9, 2.5, 6.1, 2.6, 'container'],
    // The south quay.
    [30, 67.5, 6.1, 2.5, 5.2, 'container'], [40, 85.5, 6.1, 2.5, 2.6, 'container'], [56, 73.5, 6.1, 2.5, 2.6, 'container'], [64, 79.6, 2.4, 2.4, 1.3, 'crates'],
    [70, 87.5, 6.1, 2.5, 5.2, 'container'], [80, 67.9, 2.5, 6.1, 2.6, 'container'], [46, 68, 1.6, 2, 0.9, 'bags'], [76, 80.9, 2.5, 6.1, 2.6, 'container'],
    // Out of the corridor.
    [86.5, 40, 2, 2, 1.2, 'barrels'],
    // Site A.
    [102, 8, 2.4, 2.4, 1.3, 'crates'], [112, 22, 6.1, 2.5, 2.6, 'container'], [118, 8, 2, 2, 1.1, 'tanks'],
    // Site B.
    [102, 85.6, 2.4, 2.4, 1.3, 'crates'], [112, 69.5, 6.1, 2.5, 2.6, 'container'], [118, 86, 1.6, 2, 0.9, 'bags'],
    // The Wardens' quay.
    [126, 28, 2.4, 2.4, 1.3, 'crates'], [126, 66, 2.4, 2.4, 1.3, 'crates']
  ],
  SITES: { A: { x: 104, z: 16, r: 7 }, B: { x: 104, z: 80, r: 7 } },
  SPAWNS: {
    atk: [[8, 42], [8, 48], [8, 54], [13, 45], [13, 51]],
    def: [[128, 42], [128, 48], [128, 54], [123, 45], [123, 51]]
  },
  NODES: {
    T: [12, 48], TN: [24, 16], TM: [36, 48], TS: [24, 80],
    N1: [38, 18], N2: [67, 19], N3: [90, 16],
    M1: [44, 48], M2: [68, 48], M3: [90, 48],
    S1: [38, 78], S2: [67, 77], S3: [90, 80],
    MA: [92, 30], MB: [92, 66], A: [104, 16], B: [104, 80], A2: [120, 18], B2: [120, 78],
    CA: [122, 34], CB: [122, 62], CT: [128, 48]
  },
  EDGES: [
    ['T', 'TN'], ['T', 'TM'], ['T', 'TS'], ['TN', 'N1'], ['N1', 'N2'], ['N2', 'N3'], ['N3', 'A'],
    ['TM', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'MA'], ['MA', 'A'], ['M3', 'MB'], ['MB', 'B'],
    ['TS', 'S1'], ['S1', 'S2'], ['S2', 'S3'], ['S3', 'B'], ['A', 'A2'], ['A2', 'CA'], ['CA', 'CT'], ['CT', 'CB'], ['CB', 'B2'], ['B2', 'B'],
    ['MA', 'CA'], ['MB', 'CB'], ['N3', 'MA'], ['S3', 'MB']
  ],
  // Nobody holds the corridor's mouth: a Warden there would close the middle for good.
  HOLDS: { A: ['A', 'A2', 'MA', 'N3', 'CA'], B: ['B', 'B2', 'MB', 'S3', 'CB'], mid: ['CT', 'CA'] },
  PLAN: {
    lanes: [['N2', 'S2'], ['M2'], ['M2', 'S2'], ['N2'], []],
    watch: { plant: [80, 48], guard: [128, 48], disarm: [64, 48], idle: [64, 48], hold: { A: [44, 18], B: [44, 78], mid: [44, 48] } },
    alarm: 40,
    sight: 140,
    stage: { A: ['N3', 'MA'], B: ['S3', 'MB'] },
    smokes: { A: [[118, 28], [121, 13]], B: [[118, 68], [121, 83]] },
    retake: { A: 'CA', B: 'CB' },
    retakeSmokes: { A: [[96, 20]], B: [[96, 76]] }
  }
};

/**
 * Old Town: streets between blocks of houses, 120 by 104. A north street, a
 * wide main street and a south street run east; two alleys cross between
 * them; the sites are squares at the east end, with market crates.
 */
const OLDTOWN = {
  id: 'oldtown',
  name: 'Old Town',
  text: 'Narrow streets between blocks of houses, two alleys across, market squares for sites. Close fights, many corners.',
  look: { ground: 'paving', walls: ['brick', 'wall', 'brickRed'], lines: null },
  SIZE: [120, 104],
  BOXES: [
    [-1, -1, 122, 1, 6, 'wall'], [-1, 104, 122, 1, 6, 'wall'], [-1, 0, 1, 104, 6, 'wall'], [120, 0, 1, 104, 6, 'wall'],
    // The blocks: north of the main street, and south of it; alleys at x 48–56 and 74–82.
    [30, 18, 18, 26, 8, 'building'], [56, 18, 18, 26, 9, 'building'], [82, 18, 10, 26, 7, 'building'],
    [30, 56, 18, 26, 8, 'building'], [56, 56, 18, 26, 9, 'building'], [82, 56, 10, 26, 7, 'building'],
    // The fountain house at the end of the main street, in front of the Wardens' square.
    [101, 43, 5, 14, 5, 'building'],
    // The west square.
    [4, 26, 2, 2, 1.2, 'barrels'], [4, 74, 2, 2, 1.2, 'barrels'],
    // The north street.
    [30, 2, 2.4, 2.4, 1.3, 'crates'], [44, 14, 2, 2, 1.1, 'tanks'], [60, 14, 1.6, 2, 0.9, 'bags'], [72, 2, 2, 2, 1.2, 'barrels'],
    // The main street.
    [44, 45.6, 2.4, 2.4, 1.3, 'crates'], [70, 52.5, 2, 2, 1.2, 'barrels'], [84, 45, 2.4, 2.4, 2.5, 'crates'],
    // The south street.
    [30, 99.6, 2.4, 2.4, 1.3, 'crates'], [44, 88, 2, 2, 1.1, 'tanks'], [60, 86, 1.6, 2, 0.9, 'bags'], [72, 100, 2, 2, 1.2, 'barrels'],
    // Square A.
    [100, 4, 2.4, 2.4, 1.3, 'crates'], [108, 22, 2.4, 2.4, 2.5, 'crates'], [114, 4, 2, 2, 1.2, 'barrels'],
    // Square B.
    [100, 97.6, 2.4, 2.4, 1.3, 'crates'], [108, 79.6, 2.4, 2.4, 2.5, 'crates'], [114, 98, 2, 2, 1.2, 'barrels'],
    // The Wardens' square.
    [116, 42, 2.4, 2.4, 1.3, 'crates'], [116, 60, 2.4, 2.4, 1.3, 'crates']
  ],
  SITES: { A: { x: 106, z: 14, r: 7 }, B: { x: 106, z: 90, r: 7 } },
  SPAWNS: {
    atk: [[8, 44], [8, 50], [8, 56], [13, 47], [13, 53]],
    def: [[113, 47], [113, 53], [108, 44], [108, 50], [108, 56]]
  },
  NODES: {
    T: [12, 50], TN: [20, 9], TM: [22, 50], TS: [20, 93],
    N1: [38, 9], X1: [52, 10], N2: [65, 9], X2: [78, 10], N3: [90, 10],
    M1: [38, 50], Y1: [52, 50], M2: [65, 50], Y2: [78, 50], M3: [95, 50],
    S1: [38, 93], Z1: [52, 93], S2: [65, 93], Z2: [78, 93], S3: [90, 93],
    MA: [100, 30], MB: [100, 74], A: [106, 14], B: [106, 90], A2: [114, 22], B2: [114, 82],
    CA: [112, 36], CB: [112, 68], CT: [112, 52]
  },
  EDGES: [
    ['T', 'TN'], ['T', 'TM'], ['T', 'TS'], ['TN', 'N1'], ['N1', 'X1'], ['X1', 'N2'], ['N2', 'X2'], ['X2', 'N3'], ['N3', 'A'],
    ['TM', 'M1'], ['M1', 'Y1'], ['Y1', 'M2'], ['M2', 'Y2'], ['Y2', 'M3'], ['M3', 'MA'], ['MA', 'A'], ['M3', 'MB'], ['MB', 'B'],
    ['TS', 'S1'], ['S1', 'Z1'], ['Z1', 'S2'], ['S2', 'Z2'], ['Z2', 'S3'], ['S3', 'B'],
    ['X1', 'Y1'], ['Y1', 'Z1'], ['X2', 'Y2'], ['Y2', 'Z2'],
    ['A', 'A2'], ['A2', 'CA'], ['CA', 'CT'], ['CT', 'CB'], ['CB', 'B2'], ['B2', 'B'], ['MA', 'CA'], ['MB', 'CB'], ['N3', 'MA'], ['S3', 'MB']
  ],
  HOLDS: { A: ['A', 'A2', 'MA', 'N3', 'CA'], B: ['B', 'B2', 'MB', 'S3', 'CB'], mid: ['M3', 'CT'] },
  PLAN: {
    lanes: [['X1', 'Z1'], ['Y1', 'Z1'], ['X1', 'Y2'], ['Z2'], []],
    watch: { plant: [90, 50], guard: [112, 52], disarm: [65, 50], idle: [65, 50], hold: { A: [52, 10], B: [52, 93], mid: [52, 50] } },
    alarm: 38,
    sight: 130,
    stage: { A: ['N3', 'MA'], B: ['S3', 'MB'] },
    smokes: { A: [[112, 27], [115, 12]], B: [[112, 77], [115, 92]] },
    retake: { A: 'CA', B: 'CB' },
    retakeSmokes: { A: [[96, 16]], B: [[96, 88]] }
  }
};

/** A map, ready to play: its data, and the questions the game asks of it (which way, is it clear, what does a ray meet). */
function makeMap(def) {
  const { NODES, EDGES, BOXES } = def;
  const links = new Map(Object.keys(NODES).map((k) => [k, []]));
  for (const [a, b] of EDGES) {
    const d = Math.hypot(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]);
    links.get(a).push([b, d]);
    links.get(b).push([a, d]);
  }
  /** The node nearest a point. */
  function nearestNode(x, z) {
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
  function route(from, to, avoid = null) {
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
  function clear(x, z, r = 0.4, above = 0.2) {
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
  function rayBoxes(ox, oy, oz, dx, dy, dz, far = 300) {
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
  function sees(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1e-9;
    return rayBoxes(ax, ay, az, dx / len, dy / len, dz / len, len) >= len - 0.01;
  }
  return { ...def, nearestNode, route, clear, rayBoxes, sees };
}

export const MAPS = Object.fromEntries([FOUNDRY, HARBOR, OLDTOWN].map((d) => [d.id, makeMap(d)]));
export const MAP_ORDER = ['foundry', 'harbor', 'oldtown'];
/** A map by its id (Foundry if there is no such map). */
export const getMap = (id) => MAPS[id] ?? MAPS.foundry;

// Foundry's, as before, for code that only ever knew one map.
export const { SIZE, BOXES, SITES, SPAWNS, NODES, EDGES, HOLDS, PLAN, nearestNode, route, clear, rayBoxes, sees } = MAPS.foundry;
