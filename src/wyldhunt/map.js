/**
 * Mistfall Gorge, as data: the canyon's winding floor, the river that runs
 * down it from the Grand Fall, the hunters' path, the three waterfalls, the
 * ruins, the camp, the gathering spots, where the herds graze and where the
 * Gnarlhorn walks. Pure — no three.js — so the tests and the land's height
 * function read the same numbers. North is −z; the camp is at the south end.
 *
 * Every line is a list of control points [x, z] made smooth by `sampleLine`
 * (Catmull–Rom, a point every couple of metres, with distances along it).
 */
import { rng } from '../gloamreach/noise.js';

/** The land the height grid covers (metres). Cliffs close it on every side. */
export const EXTENT = { x0: -220, x1: 220, z0: -480, z1: 470 };

/* ------------------------------------------------------------------ lines */

/** Catmull–Rom through `pts` ([x, z][]), a point every `step` metres: { pts, s (distance along), len }. */
export function sampleLine(ctrl, step = 2) {
  const out = [];
  const n = ctrl.length;
  const P = (i) => ctrl[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(segLen / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...ctrl[n - 1]]);
  const s = [0];
  for (let i = 1; i < out.length; i++) s.push(s[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, s, len: s[s.length - 1] };
}

/** Nearest point on a sampled line: { d (distance), s (along), i (segment), x, z, side (+1 left of travel) }. */
export function nearestOnLine(line, x, z) {
  const P = line.pts;
  let best = { d: Infinity, s: 0, i: 0, x: P[0][0], z: P[0][1], side: 1 };
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i];
    const [bx, bz] = P[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const L2 = dx * dx + dz * dz || 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { d, s: line.s[i] + Math.sqrt(L2) * t, i, x: px, z: pz, side: dx * (z - az) - dz * (x - ax) > 0 ? 1 : -1 };
  }
  return best;
}

/** The point `s` metres along a sampled line, with its heading (radians, 0 = +z). */
export function pointAt(line, s) {
  const S = line.s;
  s = Math.max(0, Math.min(line.len, s));
  let lo = 0;
  let hi = S.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (S[m] <= s) lo = m;
    else hi = m;
  }
  const t = (s - S[lo]) / Math.max(1e-9, S[hi] - S[lo]);
  const [ax, az] = line.pts[lo];
  const [bx, bz] = line.pts[hi];
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az) };
}

/* ------------------------------------------------------------------ the canyon */

/** The canyon's middle, from the camp's cleft (south) to the Grand Fall's basin (north). */
export const CANYON = sampleLine([
  [4, 404], [6, 360], [-6, 300], [-28, 238], [-50, 176], [-48, 116], [-20, 58], [16, 8], [40, -48], [34, -108], [6, -162], [-22, -214], [-16, -270], [6, -318], [12, -372], [10, -404]
], 2);

/**
 * How wide the canyon's floor is (half-width, metres) at a distance `s` along
 * it: a cleft at the camp, a wide valley for the ruins, a meadow, a narrow
 * gorge at the bridge, the great basin under the falls.
 */
const WIDTH_KEYS = [[0, 14], [30, 36], [90, 36], [170, 56], [260, 66], [330, 40], [400, 64], [470, 50], [540, 26], [600, 30], [680, 50], [760, 44], [800, 66], [830, 62], [850, 40], [862, 16]];
export function halfWidthAt(s) {
  return keyed(WIDTH_KEYS, s);
}

/** The floor's height along the canyon: the camp low, the Stair of Roots, the falls' basin high. */
const FLOOR_KEYS = [[0, 2], [60, 0], [150, 1.5], [250, 3], [320, 4.5], [380, 8], [420, 15], [470, 17], [560, 18.5], [640, 20], [720, 22], [800, 23.5], [900, 26]];
export function floorAt(s) {
  return keyed(FLOOR_KEYS, s);
}

/** How tall the walls stand above the floor along the canyon. */
const WALL_KEYS = [[0, 60], [80, 66], [200, 82], [330, 92], [450, 96], [560, 104], [700, 112], [820, 124], [900, 130]];
export function wallAt(s) {
  return keyed(WALL_KEYS, s);
}

/** Smooth (cosine) interpolation through [s, v] keys. */
function keyed(keys, s) {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      const t = (s - a) / (b - a);
      const k = (1 - Math.cos(t * Math.PI)) / 2;
      return va + (vb - va) * k;
    }
  }
  return keys[keys.length - 1][1];
}

/* ------------------------------------------------------------------ the river and the path */

/**
 * The river, from the Grand Fall's plunge pool down to the cleft by the camp
 * (where it slips away under the rocks). `w` its half-width, `deep` its depth.
 * It crosses the path twice: a shallow ford with stepping stones, and a
 * narrow gorge the rope bridge spans.
 */
export const RIVER = sampleLine([
  [12, -396], [14, -372], [18, -350], [30, -322], [26, -282], [6, -244], [-10, -206], [4, -170], [30, -138], [52, -104], [46, -76], [24, -64], [4, -40], [-14, -6], [-30, 30], [-50, 70], [-62, 110], [-58, 150], [-34, 176], [-8, 196], [10, 228], [20, 270], [26, 312], [24, 352], [14, 388]
], 2);

/** Where along the river the gorge is narrow and deep (the bridge), and the ford is shallow. */
export const BRIDGE = { x: 33, z: -68, yaw: 0, length: 19, width: 2.2 };
export const FORD = { x: -20, z: 186, r: 9 };

export function riverHalfWidth(s) {
  return keyed([[0, 10], [60, 8], [200, 7], [320, 7], [342, 4.5], [396, 4.5], [420, 6.5], [520, 7.5], [620, 8], [650, 9.5], [690, 9.5], [730, 8], [800, 7], [890, 8]], s);
}
export function riverDepth(s) {
  return keyed([[0, 1.0], [240, 0.85], [330, 0.9], [346, 3.2], [394, 3.2], [415, 0.9], [620, 0.8], [648, 0.38], [690, 0.38], [715, 0.8], [890, 1.0]], s);
}
/** How much of a gorge the river runs in `s` metres down it (1 under the bridge). */
export function gorgeAt(s) {
  const k = (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a)));
  const up = k(328, 348, s);
  const down = 1 - k(392, 410, s);
  return up * up * (3 - 2 * up) * down * down * (3 - 2 * down);
}

/** The hunters' path, camp to the falls (the mount follows it when told to). */
export const PATH = sampleLine([
  [2, 372], [4, 340], [-6, 300], [-14, 262], [-30, 220], [-20, 192], [-26, 160], [-34, 120], [-24, 86], [-6, 52], [12, 20], [26, -14], [30, -46], [33, -60], [33, -77], [26, -104], [14, -136], [-8, -168], [-30, -200], [-38, -232], [-28, -266], [-14, -296], [0, -318]
], 2);

/** Where the path is laid with old stone (ruins) rather than trodden earth: [from s, to s]. */
export const PAVED = [[150, 300], [330, 420], [560, 745]];

/* ------------------------------------------------------------------ places */

export const CAMP = { x: 4, z: 352, face: Math.PI, name: 'Lantern Camp' };
export const START = { x: 3, z: 340, yaw: Math.PI };

/**
 * The waterfalls: each pours off the canyon's rim into its plunge pool. `wall`
 * is the heading from the pool toward the cliff it falls down (the builder
 * walks that way to find the face and the lip); `width` the sheet's.
 */
export const FALLS = [
  { id: 'grand', name: 'The Grand Fall', width: 40, wall: Math.PI, pool: { x: 12, z: -398, r: 30 } },
  { id: 'veil', name: 'Veilfall', width: 15, wall: -Math.PI / 2 - 0.2, pool: { x: -88, z: 140, r: 12 } },
  { id: 'fern', name: 'Fernspill', width: 13, wall: Math.PI / 2 + 0.1, pool: { x: 70, z: -142, r: 11 } }
];

/** Streams from the two side falls' pools down to the river. */
export const STREAMS = [
  sampleLine([[-86, 140], [-74, 130], [-64, 126]], 2),
  sampleLine([[70, -142], [60, -128], [52, -112]], 2)
];

/** The Drowned Colonnade: two rows of pillars, a gate arch, fallen stones (pillar: h height, w width, tilt, broken). */
export const RUINS = (() => {
  const r = rng(808);
  const pillars = [];
  // The colonnade: an avenue of pillars either side of the old paved road.
  for (let k = 0; k < 10; k++) {
    const at = pointAt(PATH, 222 + k * 11);
    const nx = Math.cos(at.yaw);
    const nz = -Math.sin(at.yaw);
    for (const side of [-1, 1]) {
      const broken = r() < 0.36;
      const off = 7 + r() * 0.8;
      pillars.push({ x: at.x + nx * side * off, z: at.z + nz * side * off, h: broken ? 3 + r() * 6 : 11 + r() * 3, w: 1.6, tilt: (r() - 0.5) * (broken ? 0.14 : 0.05), broken, face: at.yaw, seed: Math.floor(r() * 1e5) });
    }
  }
  // Colossi in the falls' mist.
  const colossi = [
    { x: -22, z: -372, h: 58, w: 7.5, tilt: 0.03, seed: 1 },
    { x: 40, z: -384, h: 46, w: 6.5, tilt: -0.05, seed: 2, broken: true },
    { x: -40, z: -336, h: 34, w: 6, tilt: 0.08, seed: 3, broken: true },
    { x: 54, z: -340, h: 64, w: 8, tilt: -0.02, seed: 4 }
  ];
  const arches = [
    { x: -9, z: 47, face: 0.6, span: 10, h: 12, name: 'The Root Gate' },
    { x: -40, z: 116, face: 0.2, span: 13, h: 15, name: 'Colonnade arch' }
  ];
  const stair = { from: 380, to: 425 };
  return { pillars, colossi, arches, stair };
})();

/** The Gnarlhorn's places: where it drinks, prowls, and goes to ground to rest. */
export const DEN = { x: -86, z: -236, r: 16, name: 'Old Throne Hollow' };
export const MONSTER_AREAS = [
  { id: 'basin', x: 10, z: -312, r: 26 },
  { id: 'den', x: DEN.x + 10, z: DEN.z + 4, r: 12 },
  // It drinks in the shallows below its den now (the ford is below the Stair of Roots, another zone).
  { id: 'shallows', x: -20, z: -192, r: 12 },
  { id: 'meadow', x: 34, z: -30, r: 20 },
  { id: 'fern', x: 50, z: -124, r: 14 }
];

/** Herds of velvetbucks and the thornskitter nests. */
export const HERDS = [
  { x: 40, z: -34, r: 15, n: 6 },
  { x: -72, z: 176, r: 12, n: 5 },
  { x: -48, z: -192, r: 12, n: 4 }
];
export const NESTS = [
  { x: 60, z: -18, r: 7, n: 3 },
  { x: -70, z: 92, r: 6, n: 3 },
  { x: -40, z: -274, r: 7, n: 3 }
];

/** Named places, for the banner when you arrive. */
export const AREAS = [
  { id: 'camp', name: 'Lantern Camp', sub: 'Mistfall Gorge — the hunters\' camp', x: 4, z: 350, r: 30 },
  { id: 'cleft', name: 'The Green Cleft', sub: 'Mistfall Gorge', x: -14, z: 270, r: 40 },
  { id: 'colonnade', name: 'The Drowned Colonnade', sub: 'Ruins older than the river', x: -42, z: 160, r: 50 },
  { id: 'stair', name: 'The Stair of Roots', sub: 'Mistfall Gorge', x: 2, z: 40, r: 30 },
  { id: 'meadow', name: 'Velvet Meadow', sub: 'Where the herds graze', x: 34, z: -2, r: 40 },
  { id: 'bridge', name: 'Ropewalk Gorge', sub: 'Mind the drop', x: 33, z: -70, r: 26 },
  { id: 'fern', name: 'Fernspill', sub: 'A fall on the east wall', x: 62, z: -134, r: 28 },
  { id: 'hollow', name: 'Old Throne Hollow', sub: 'Bones, and something that sleeps', x: DEN.x, z: DEN.z, r: 34 },
  { id: 'basin', name: 'The Grand Fall', sub: 'Mistfall Gorge — the basin of the colossi', x: 12, z: -330, r: 70 }
];

/** The place a point is in (nearest whose circle holds it), or null. */
export function areaAt(x, z) {
  let best = null;
  let bd = Infinity;
  for (const a of AREAS) {
    const d = Math.hypot(x - a.x, z - a.z) / a.r;
    if (d < 1 && d < bd) [best, bd] = [a.id, d];
  }
  return best;
}

/* ------------------------------------------------------------------ gathering */

/**
 * Gathering spots: herbs, ore seams, bug logs and bone piles, each giving its
 * item a few times before it is spent (it grows back after a while).
 */
export const NODES = [
  ['herb', 14, 318], ['herb', -18, 248], ['herb', -36, 190], ['herb', -44, 134], ['herb', -12, 40], ['herb', 44, 8], ['herb', 18, -118], ['herb', -36, -178], ['herb', -30, -300], ['herb', -10, 330],
  ['ore', -24, 274], ['ore', -70, 170], ['ore', 30, -36], ['ore', -6, -152], ['ore', -40, -250], ['ore', 44, -330],
  ['bug', -26, 292], ['bug', -46, 96], ['bug', 50, 42], ['bug', 6, -150], ['bug', -24, -320],
  ['bone', -30, 214], ['bone', 46, -30], ['bone', -74, -228], ['bone', -60, -244], ['bone', -4, -280]
].map(([kind, x, z], i) => ({ id: `${kind}${i}`, kind, x, z }));

/* ------------------------------------------------------------------ trees */

/**
 * Where the jungle grows: kapok giants and strangler figs on the floor,
 * palms and tree ferns along the water and the path, and a fringe along the
 * rim above. `clear(x, z)` says where nothing may stand (path, river, camp).
 */
export function scatterJungle(clear, floorOk, seed = 5) {
  const r = rng(seed);
  const out = [];
  const try1 = (kind, x, z, s, gap) => {
    if (!clear(x, z, gap)) return;
    for (const t of out) if (Math.hypot(t.x - x, t.z - z) < gap + (t.gap ?? 2) * 0.6) return;
    out.push({ kind, x, z, s, gap, seed: Math.floor(r() * 1e6) });
  };
  for (let k = 0; k < 2600; k++) {
    const x = EXTENT.x0 + r() * (EXTENT.x1 - EXTENT.x0);
    const z = EXTENT.z0 + r() * (EXTENT.z1 - EXTENT.z0);
    const where = floorOk(x, z);
    if (where === 'floor') {
      const p = r();
      if (p < 0.34) try1('kapok', x, z, 0.8 + r() * 0.5, 7);
      else if (p < 0.72) try1('palm', x, z, 0.8 + r() * 0.45, 3.4);
      else try1('treefern', x, z, 0.75 + r() * 0.5, 2.8);
    } else if (where === 'rim') {
      try1(r() < 0.6 ? 'kapok' : 'palm', x, z, 0.9 + r() * 0.5, 6);
    }
  }
  return out;
}
