/**
 * Lanternwood — the realms: where everything stands in each world (named
 * places, paths, monster homes, chests, people, landmarks, the waystone that
 * links them), how a realm is unlocked, and the shared geometry (seeded
 * random, distance to a path, collision). Pure data and functions.
 *
 * Coordinates are metres on the ground plane: x east, z south.
 */

/** A small seeded random stream (mulberry32): the world must come out the same every time. */
export function seeded(seed = 1) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;

/** Distance from a point to a path polyline. */
export function distToPath(x, z, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/* -------------------------------------------------------- Lanternwood */

/**
 * The first realm: the night forest round Lanternwood camp (the hub). It was
 * 74 m across the walkable disc; it is now 118 m, with the Waystone Circle to
 * the south, Bramblehollow to the north-west and Mistmere to the north-east.
 */
export const WORLD = {
  id: 'lanternwood',
  radius: 118, // walkable
  forestTo: 136, // trees out to here
  fire: { x: 0, z: 0, r: 1.5 },
  start: { x: 0, z: 7.5, face: Math.PI }, // facing north (−z), toward the fire
  waystone: { x: 0, z: 50 },
  areas: {
    camp: { name: 'Lanternwood Camp', x: 0, z: 0, r: 15 },
    glade: { name: 'Glowmoss Glade', x: 2, z: -50, r: 14 },
    hollow: { name: 'Howling Hollow', x: 49, z: 18, r: 13 },
    ruins: { name: 'Greyvault Ruins', x: -47, z: 24, r: 15 },
    waystone: { name: 'Waystone Circle', x: 0, z: 50, r: 10 },
    bramble: { name: 'Bramblehollow', x: -66, z: -58, r: 15 },
    mere: { name: 'Mistmere', x: 68, z: -54, r: 14 }
  },
  paths: [
    [[0, -6], [0, -16], [-4, -28], [-1, -38], [2, -46]],
    [[6, 3], [16, 5], [28, 9], [38, 14], [46, 17]],
    [[-6, 4], [-16, 8], [-27, 15], [-37, 20], [-44, 23]],
    [[0, 8], [1, 20], [-1, 32], [0, 42]],
    [[-4, -40], [-20, -46], [-36, -52], [-54, -56]],
    [[52, 8], [58, -8], [62, -26], [66, -42]]
  ],
  tents: [
    { x: -7.5, z: -6.5, rot: 0.6, color: '#9a3c34', w: 3.4, d: 3.6, h: 2.5 },
    { x: 7.2, z: -7, rot: -0.7, color: '#c08a3a', w: 3.2, d: 3.4, h: 2.4 },
    { x: -11, z: 7.5, rot: 2.0, color: '#3e6e78', w: 3.6, d: 3.8, h: 2.6 },
    { x: 11.5, z: -1.2, rot: -1.5, color: '#7a5a8c', w: 3, d: 3.2, h: 2.3 }
  ],
  logs: [
    { x: -2.9, z: 1.6, rot: 1.0 },
    { x: 3.1, z: 1.2, rot: -1.1 },
    { x: 0.4, z: -3.3, rot: 0.1 }
  ],
  crates: [
    { x: 10.6, z: 4.6, kind: 'crate' }, { x: 11.3, z: 5.6, kind: 'barrel' }, { x: 9.6, z: 5.9, kind: 'crate' },
    { x: -5.4, z: -9.6, kind: 'barrel' }, { x: 5.6, z: 9.4, kind: 'crate' }, { x: -12.6, z: 3.4, kind: 'barrel' }
  ],
  cart: { x: 11.8, z: 7.8, rot: 0.9 },
  lanterns: [
    { x: 9.4, z: -9.4 }, { x: -9.6, z: -9.2 }, { x: -9.8, z: 10.2 }, { x: 9.8, z: 10.4 }
  ],
  torches: [
    { x: -2.2, z: -14.5 }, { x: 2.2, z: -14.5 }, { x: 14.4, z: 2.6 }, { x: -14.2, z: 5.2 }, { x: 6.5, z: 12.8 }
  ],
  braziers: [
    { id: 'b1', x: -53, z: 18 }, { id: 'b2', x: -40.5, z: 17.5 }, { id: 'b3', x: -47, z: 32 }
  ],
  pillars: [
    [-53.5, 25, 3.8], [-52, 31, 2.1], [-41, 29.5, 3.2], [-40, 24, 1.4], [-45, 15, 2.6], [-50, 14.5, 1.2], [-55, 21, 1.8], [-38.5, 20.5, 2.9],
    [-44, 33.5, 1.6], [-50.5, 34.5, 3.4]
  ],
  herbs: [
    [-3.5, -22], [3.8, -30], [-7.5, -33], [5.5, -41], [-6.5, -44], [12, -50], [-9.5, -55], [9, -59], [1.5, -63], [-12.8, -48]
  ],
  spawns: {
    slime: { area: 'glade', count: 8, ring: [3, 11] },
    wolf: { area: 'hollow', count: 7, ring: [2, 10] },
    wisp: { area: 'ruins', count: 6, ring: [5, 12] },
    thornling: { area: 'bramble', count: 10, ring: [2, 12] },
    mossback: { area: 'mere', count: 5, ring: [3, 11] }
  },
  elites: [
    { kind: 'wolf', area: 'hollow', name: 'Grimmaw', affixes: ['frenzied'] },
    { kind: 'mossback', area: 'mere', name: 'Old Bark', affixes: ['shielded', 'splitting'] }
  ],
  chests: [
    { id: 'lw1', x: 14, z: -60 }, { id: 'lw2', x: -56, z: 30 }, { id: 'lw3', x: -74, z: -64 }, { id: 'lw4', x: 76, z: -58 }, { id: 'lw5', x: 9, z: 54 }
  ],
  boss: { x: -47, z: 24 },
  rocks: [
    [17, -12, 1.4], [-18, -14, 1.2], [22, 22, 1.3], [-20, -2, 1.0], [36, 26, 1.6], [56, 12, 1.4], [44, 6, 1.2], [58, 26, 1.1],
    [-14, -40, 1.1], [14, -44, 1.2], [-30, 36, 1.3], [-58, 30, 1.2], [-36, 8, 1.0], [26, -30, 1.4],
    [-80, -40, 1.5], [-56, -72, 1.3], [80, -40, 1.4], [56, -70, 1.2], [20, 70, 1.5], [-26, 64, 1.3], [90, 20, 1.6], [-92, 10, 1.4]
  ]
};

/* ------------------------------------------------------------ realms */

/**
 * Every realm. `tier` sets monster and loot levels; `unlock` the quest that
 * opens it (null: always open); `look` the colours the 3D world is built in;
 * `spawns` monster homes by area; `elites` named hero monsters; `boss` the
 * realm boss and its arena; `gather` what can be picked; `landmarks` the big
 * set pieces (each solid, with a radius); `npcs` who lives at the hub.
 */
export const REALMS = {
  lanternwood: {
    id: 'lanternwood', name: 'Lanternwood', sub: 'The night forest · camp', tier: 1, levels: [1, 7], unlock: null,
    blurb: 'A night forest round a bonfire camp. Gloomslimes, ashwolves, lampwisps — and the Lampwight in Greyvault.',
    layout: WORLD
  },
  sunmeadow: {
    id: 'sunmeadow', name: 'Sunmeadow Hills', sub: 'Sunlit fields · day', tier: 2, levels: [7, 12], unlock: 'wolves',
    blurb: 'Rolling sunlit fields, a windmill hamlet, hornet woods and fairy rings. Old Gnarlroot sleeps in the north grove.',
    layout: {
      id: 'sunmeadow', radius: 150, forestTo: 166,
      start: { x: 0, z: 18, face: Math.PI }, waystone: { x: 0, z: 24 },
      areas: {
        hamlet: { name: 'Hollyhock Hamlet', x: 0, z: 0, r: 20 },
        barley: { name: 'Barley Fields', x: 62, z: -24, r: 24 },
        hive: { name: 'Hivewood', x: -62, z: -40, r: 20 },
        boarrun: { name: 'Boar Run', x: -58, z: 58, r: 22 },
        rings: { name: 'Fairy Rings', x: 62, z: 62, r: 18 },
        grove: { name: 'Gnarlroot Grove', x: 0, z: -104, r: 22 }
      },
      paths: [
        [[0, -14], [-4, -40], [4, -66], [0, -86]],
        [[14, -4], [32, -10], [48, -20]],
        [[-14, -6], [-34, -18], [-50, -32]],
        [[-12, 10], [-30, 30], [-46, 48]],
        [[12, 12], [30, 32], [50, 52]],
        [[0, 18], [0, 30]]
      ],
      spawns: {
        burrowmole: { area: 'barley', count: 8, ring: [3, 18] },
        hornet: { area: 'hive', count: 12, ring: [2, 15] },
        thornboar: { area: 'boarrun', count: 7, ring: [4, 17] },
        shroomkin: { area: 'rings', count: 5, ring: [3, 12] },
        shroomkin2: { kind: 'shroomkin', area: 'boarrun', count: 2, ring: [6, 12] },
        hornet2: { kind: 'hornet', area: 'barley', count: 5, ring: [10, 20] }
      },
      elites: [
        { kind: 'hornet', area: 'hive', name: 'Queen Zzara', affixes: ['frenzied', 'splitting'] },
        { kind: 'thornboar', area: 'boarrun', name: 'Bristleback', affixes: ['shielded'] },
        { kind: 'burrowmole', area: 'barley', name: 'Old Digger', affixes: ['burning'] }
      ],
      boss: { kind: 'gnarlroot', x: 0, z: -106, quest: 'gnarlroot' },
      gather: { kind: 'sunpetal', name: 'Sunpetal', points: [[48, 52], [70, 50], [74, 70], [54, 74], [-48, 50], [-66, 66], [-44, 70], [62, 40]] },
      chests: [{ id: 'sm1', x: 76, z: -30 }, { id: 'sm2', x: -72, z: -48 }, { id: 'sm3', x: -70, z: 66 }, { id: 'sm4', x: 72, z: 74 }, { id: 'sm5', x: 14, z: -112 }],
      landmarks: [
        { type: 'windmill', x: -24, z: 6, r: 3.4 }, { type: 'house', x: 16, z: -12, r: 3.6, rot: 0.3 }, { type: 'house', x: -14, z: -14, r: 3.6, rot: -0.4 },
        { type: 'house', x: 20, z: 10, r: 3.4, rot: 1.2 }, { type: 'stones', x: 62, z: 62, r: 0 }, { type: 'pond', x: 30, z: 40, r: 7 },
        { type: 'hay', x: 54, z: -14, r: 1.4 }, { type: 'hay', x: 70, z: -34, r: 1.4 }, { type: 'hay', x: 58, z: -40, r: 1.4 },
        { type: 'well', x: 4, z: -2, r: 1.2 }, { type: 'bigtree', x: 0, z: -106, r: 0 }
      ],
      npcs: ['bram', 'ivy', 'mabel', 'gus', 'tobin']
    }
  },
  frostpeak: {
    id: 'frostpeak', name: 'Frostpeak Hollows', sub: 'Snowfields · ice caverns', tier: 3, levels: [12, 17], unlock: 'gnarlroot',
    blurb: 'Deep snow under an aurora, a frozen lake and caverns of ice. The Rime Matron holds her throne in the north.',
    layout: {
      id: 'frostpeak', radius: 150, forestTo: 166,
      start: { x: 0, z: 18, face: Math.PI }, waystone: { x: 0, z: 24 },
      areas: {
        rimehold: { name: 'Rimehold', x: 0, z: 0, r: 18 },
        shards: { name: 'Shard Fields', x: 56, z: -40, r: 22 },
        garrison: { name: 'Frozen Garrison', x: -58, z: -38, r: 20 },
        lake: { name: 'Mirror Lake', x: 60, z: 52, r: 24 },
        caves: { name: 'Batwing Caverns', x: -60, z: 54, r: 20 },
        throne: { name: 'Matron’s Throne', x: 0, z: -106, r: 22 }
      },
      paths: [
        [[0, -12], [5, -40], [-4, -66], [0, -86]],
        [[12, -6], [30, -18], [44, -32]],
        [[-12, -6], [-30, -18], [-46, -30]],
        [[12, 10], [32, 28], [46, 42]],
        [[-12, 10], [-32, 30], [-48, 44]],
        [[0, 16], [0, 30]]
      ],
      spawns: {
        shardling: { area: 'shards', count: 8, ring: [4, 18] },
        rimeguard: { area: 'garrison', count: 6, ring: [3, 15] },
        icefang: { area: 'lake', count: 9, ring: [3, 20] },
        frostbat: { area: 'caves', count: 10, ring: [2, 16] },
        frostbat2: { kind: 'frostbat', area: 'shards', count: 4, ring: [10, 20] }
      },
      elites: [
        { kind: 'rimeguard', area: 'garrison', name: 'Captain Haldr', affixes: ['shielded', 'frenzied'] },
        { kind: 'icefang', area: 'lake', name: 'Whitemaw', affixes: ['chilling'] },
        { kind: 'shardling', area: 'shards', name: 'Glimmerheart', affixes: ['splitting', 'chilling'] }
      ],
      boss: { kind: 'matron', x: 0, z: -108, quest: 'matron' },
      gather: { kind: 'frostlily', name: 'Frost lily', points: [[-50, 60], [-68, 46], [-70, 64], [48, 64], [70, 40], [66, 70], [-40, -46], [40, -50]] },
      chests: [{ id: 'fp1', x: 70, z: -48 }, { id: 'fp2', x: -70, z: -44 }, { id: 'fp3', x: -72, z: 60 }, { id: 'fp4', x: 78, z: 56 }, { id: 'fp5', x: -14, z: -112 }],
      landmarks: [
        { type: 'lodge', x: -14, z: -8, r: 4.2, rot: 0.4 }, { type: 'lodge', x: 15, z: -6, r: 4.2, rot: -0.5 }, { type: 'icearch', x: -60, z: 54, r: 0 },
        { type: 'crystal', x: 56, z: -40, r: 2.2 }, { type: 'crystal', x: -30, z: -60, r: 1.6 }, { type: 'crystal', x: 30, z: 80, r: 1.8 },
        { type: 'lake', x: 60, z: 52, r: 0 }, { type: 'wall', x: -58, z: -38, r: 0 }, { type: 'throne', x: 0, z: -118, r: 2.6 }
      ],
      npcs: ['hroa', 'pip', 'yrsa', 'eiri', 'bjorn']
    }
  },
  emberfall: {
    id: 'emberfall', name: 'Emberfall Caldera', sub: 'Ash plains · lava', tier: 4, levels: [17, 22], unlock: 'matron',
    blurb: 'Black basalt and glowing lava under an ash sky. The Cinder Tyrant broods on the caldera’s crown.',
    layout: {
      id: 'emberfall', radius: 150, forestTo: 166,
      start: { x: 0, z: 18, face: Math.PI }, waystone: { x: 0, z: 24 },
      areas: {
        forge: { name: 'Cinderforge', x: 0, z: 0, r: 18 },
        vents: { name: 'Cinder Vents', x: 58, z: -36, r: 22 },
        quarry: { name: 'Golem Quarry', x: -58, z: -40, r: 22 },
        temple: { name: 'Ash Temple', x: -58, z: 52, r: 20 },
        flows: { name: 'Lava Flows', x: 58, z: 56, r: 22 },
        crown: { name: 'Caldera Crown', x: 0, z: -106, r: 24 }
      },
      paths: [
        [[0, -12], [-5, -40], [5, -66], [0, -84]],
        [[12, -6], [32, -18], [46, -28]],
        [[-12, -6], [-32, -20], [-46, -32]],
        [[-12, 10], [-32, 30], [-46, 44]],
        [[12, 10], [32, 32], [46, 46]],
        [[0, 16], [0, 30]]
      ],
      spawns: {
        cinderling: { area: 'vents', count: 12, ring: [2, 18] },
        golem: { area: 'quarry', count: 5, ring: [4, 16] },
        acolyte: { area: 'temple', count: 7, ring: [3, 15] },
        salamander: { area: 'flows', count: 7, ring: [4, 18] },
        cinderling2: { kind: 'cinderling', area: 'flows', count: 4, ring: [8, 18] }
      },
      elites: [
        { kind: 'golem', area: 'quarry', name: 'Slagheart', affixes: ['burning', 'shielded'] },
        { kind: 'acolyte', area: 'temple', name: 'High Acolyte Vex', affixes: ['frenzied', 'splitting'] },
        { kind: 'salamander', area: 'flows', name: 'Moltentail', affixes: ['burning', 'vampiric'] }
      ],
      boss: { kind: 'tyrant', x: 0, z: -108, quest: 'tyrant' },
      gather: { kind: 'emberstone', name: 'Emberstone', points: [[50, -48], [70, -30], [66, -50], [-48, -50], [-70, -34], [62, 70], [-66, 60], [40, 66]] },
      chests: [{ id: 'ef1', x: 74, z: -44 }, { id: 'ef2', x: -74, z: -48 }, { id: 'ef3', x: -72, z: 60 }, { id: 'ef4', x: 74, z: 66 }, { id: 'ef5', x: 16, z: -114 }],
      landmarks: [
        { type: 'forgehall', x: -12, z: -10, r: 4.6, rot: 0.3 }, { type: 'anvil', x: 9, z: -4, r: 1.0 }, { type: 'temple', x: -58, z: 44, r: 0 },
        { type: 'lava', x: 40, z: 40, r: 6 }, { type: 'lava', x: 74, z: 46, r: 5 }, { type: 'lava', x: 46, z: 74, r: 5.5 }, { type: 'lava', x: -26, z: -70, r: 6 },
        { type: 'lava', x: 30, z: -66, r: 5 }, { type: 'lava', x: -90, z: 10, r: 7 }, { type: 'lava', x: 92, z: 0, r: 7 },
        { type: 'spire', x: 26, z: 2, r: 1.6 }, { type: 'spire', x: -30, z: 14, r: 1.6 }, { type: 'spire', x: 0, z: -80, r: 1.4 }
      ],
      npcs: ['korra', 'sel', 'dunn', 'pim', 'coal']
    }
  }
};
export const REALM_ORDER = ['lanternwood', 'sunmeadow', 'frostpeak', 'emberfall'];
export const realmLayout = (id) => REALMS[id]?.layout ?? WORLD;

/** Is a realm open? Its unlock quest must be done (the first realm is always open). */
export function realmUnlocked(questLog, id) {
  const r = REALMS[id];
  if (!r) return false;
  if (!r.unlock) return true;
  return questLog?.[r.unlock]?.state === 'done';
}
export const unlockedRealms = (questLog) => REALM_ORDER.filter((id) => realmUnlocked(questLog, id));

/* ----------------------------------------------------------- geometry */

export const nearPathIn = (L, x, z, pad = 0) => L.paths.some((p) => distToPath(x, z, p) < 2.2 + pad);
export const inAreaIn = (L, x, z, pad = 0) => Object.values(L.areas).some((a) => dist2(x, z, a.x, a.z) < (a.r + pad) ** 2);

/** Which named area of a layout a point is in (or 'wilds'). */
export function areaIn(L, x, z) {
  for (const [id, a] of Object.entries(L.areas)) if (dist2(x, z, a.x, a.z) < (a.r + 2) ** 2) return id;
  return 'wilds';
}

/**
 * Push a circle of radius `r` at (x, z) out of every solid circle and back
 * inside the world (radius `bound`). Returns the corrected [x, z].
 */
export function resolveIn(x, z, r, solids, bound) {
  for (let pass = 0; pass < 2; pass++) {
    for (const s of solids) {
      const dx = x - s.x, dz = z - s.z;
      const min = r + s.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.0001;
      x = s.x + (dx / d) * min;
      z = s.z + (dz / d) * min;
    }
  }
  const d = Math.hypot(x, z);
  if (d > bound) {
    x *= bound / d;
    z *= bound / d;
  }
  return [x, z];
}

/** A grid of points for quick "anything near here?" checks while laying things out. */
function hashGrid(cell = 6) {
  const m = new Map();
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  return {
    add(p) {
      const k = key(p.x, p.z);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    },
    near(x, z, r) {
      const gx = Math.floor(x / cell), gz = Math.floor(z / cell), n = Math.ceil(r / cell);
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
        for (const p of m.get(`${gx + i},${gz + j}`) ?? []) if (dist2(x, z, p.x, p.z) < r * r) return true;
      }
      return false;
    }
  };
}

/**
 * The flora of a realm (not Lanternwood, whose forest rules.js lays out):
 * trees, placed once from a seed — a wall at the edge, groves in between —
 * never on paths, in the named places, on landmarks or on each other.
 * `density` 0…1 how wooded (the meadow is open, the caldera has few).
 */
export function layoutFlora(L, { seed = 7, density = 1, keep = [] } = {}) {
  const rand = seeded(seed);
  const trees = [];
  const grid = hashGrid(6);
  const keepOut = [
    ...L.landmarks.map((l) => [l.x, l.z, (l.r || 6) + 3]),
    ...(L.gather?.points ?? []).map(([x, z]) => [x, z, 2]),
    ...L.chests.map((c) => [c.x, c.z, 2.5]),
    [L.waystone.x, L.waystone.z, 6],
    ...keep
  ];
  const ok = (x, z, gap) => {
    if (Math.hypot(x, z) > L.forestTo) return false;
    if (inAreaIn(L, x, z, 2) || nearPathIn(L, x, z, 1.4)) return false;
    if (keepOut.some(([kx, kz, r]) => dist2(x, z, kx, kz) < r * r)) return false;
    return !grid.near(x, z, gap);
  };
  const place = (x, z, s) => {
    const t = { x, z, s, r: 0.55 * s };
    trees.push(t);
    grid.add(t);
  };
  for (let i = 0; i < 5000 && trees.length < 900; i++) {
    const a = rand() * Math.PI * 2;
    const r = L.radius - 4 + rand() * (L.forestTo - L.radius + 4);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (ok(x, z, 2.9)) place(x, z, 0.95 + rand() * 0.6);
  }
  const target = 900 + Math.round(1500 * density);
  for (let i = 0; i < 26000 && trees.length < target; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (L.radius - 3);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    // Groves: denser where a slow wave is high.
    const grove = Math.sin(x * 0.045 + 1.3) + Math.sin(z * 0.05 + x * 0.01);
    if (rand() > 0.3 + grove * 0.35) continue;
    if (ok(x, z, 3.2)) place(x, z, 0.75 + rand() * 0.6);
  }
  return trees;
}

/** Everything solid in a realm (not Lanternwood) as circles. */
export function realmSolidsOf(L, trees) {
  return [
    ...L.landmarks.filter((l) => l.r > 0).map((l) => ({ x: l.x, z: l.z, r: l.r })),
    { x: L.waystone.x, z: L.waystone.z, r: 1.1 },
    ...L.chests.map((c) => ({ x: c.x, z: c.z, r: 0.6 })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: t.r }))
  ];
}

/**
 * Monster homes for a layout: every spawn group spread round its area
 * (seeded), then the named elites. Each { kind, x, z, elite? }.
 */
export function spawnsOf(L, seed = 11) {
  const out = [];
  for (const [key, spec] of Object.entries(L.spawns)) {
    const kind = spec.kind ?? key;
    const area = L.areas[spec.area];
    const rand = seeded(seed + key.length * 97 + key.charCodeAt(0));
    for (let i = 0; i < spec.count; i++) {
      const a = (i / spec.count) * Math.PI * 2 + rand() * 0.6;
      const r = spec.ring[0] + rand() * (spec.ring[1] - spec.ring[0]);
      out.push({ kind, x: area.x + Math.cos(a) * r, z: area.z + Math.sin(a) * r });
    }
  }
  (L.elites ?? []).forEach((el, i) => {
    const area = L.areas[el.area];
    const a = i * 2.1 + 0.7;
    out.push({ kind: el.kind, x: area.x + Math.cos(a) * area.r * 0.35, z: area.z + Math.sin(a) * area.r * 0.35, elite: { name: el.name, affixes: el.affixes } });
  });
  return out;
}
