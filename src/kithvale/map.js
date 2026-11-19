/**
 * Kithvale's starting map, as data: the village of Lanternrest behind its
 * timber gate, the road that winds out of it across the valley — over the
 * Pebblerun on a little bridge, past Hopgrass Meadow, up to the Windbell
 * Shrine on its hill — Mirror Pond where the stream ends, the Hushwood, the
 * Cinder Crags, Puffcrown Downs, and the ridges that close the valley in.
 * Where each creature lives, where treats grow and hide. Pure: no three.js.
 *
 * Coordinates are metres; +z runs north, out of the gate and up the valley.
 */

export const EXTENT = { x0: -200, x1: 200, z0: -220, z1: 260 };

/** A Catmull-Rom line through `ctrl` ([x, z] pairs), resampled every `step` m, with arc length. */
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

/** The nearest point of a sampled line to (x, z): distance, arc length, the point, which side. */
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

/** The point `s` metres along a line, and the way it runs there (yaw, 0 = +z). */
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

/* ------------------------------------------------------------------ the village */

/** Lanternrest: a walled village on a flat terrace; its gate opens north onto the valley. */
export const VILLAGE = { x0: -50, x1: 50, z0: -180, z1: -86, level: 2 };
/** The gate: centre of the opening, its clear width and height. Faces +z (out). */
export const GATE = { x: 0, z: -86, width: 6.2, height: 5.0 };
/** The market lane, gate to the elders' hall; the cross street through the plaza. */
export const LANE = { x: 0, z0: -168, z1: -86, half: 3.2 };
export const PLAZA = { x: 0, z: -128, r: 10 };
export const CROSS = { z: -128, x0: -44, x1: 22, half: 2.6 };
export const WELL = { x: -6.5, z: -131.5, r: 1.3 };
/** Where you begin, just inside the gate, facing out. */
export const START = { x: 0.6, z: -97, yaw: 0 };

/**
 * The houses: centre, width (along the front), depth, the way the front faces
 * (yaw), storeys, roof colour, what it is. Fronts face the lane or the street.
 */
const E = Math.PI / 2;
export const HOUSES = [
  { id: 'teahouse', x: -12.6, z: -100, w: 9, d: 7, face: E, floors: 2, roof: 'clay', kind: 'teahouse', name: 'The Kettle Teahouse' },
  { id: 'w2', x: -12.4, z: -113, w: 8, d: 7, face: E, floors: 1, roof: 'slate', kind: 'house' },
  { id: 'w3', x: -13, z: -145, w: 10, d: 8, face: E, floors: 2, roof: 'clay', kind: 'house' },
  { id: 'w4', x: -12.4, z: -160, w: 8, d: 7, face: E, floors: 1, roof: 'slate', kind: 'house' },
  { id: 'e1', x: 12.6, z: -101, w: 8, d: 7, face: -E, floors: 1, roof: 'clay', kind: 'shop', name: 'Satchel & Seed' },
  { id: 'e2', x: 12.6, z: -114, w: 9, d: 7, face: -E, floors: 2, roof: 'slate', kind: 'house' },
  { id: 'e3', x: 13, z: -146, w: 10, d: 8, face: -E, floors: 2, roof: 'clay', kind: 'house' },
  { id: 'e4', x: 12.6, z: -161, w: 8, d: 7, face: -E, floors: 1, roof: 'clay', kind: 'house' },
  { id: 'hall', x: 0, z: -172.5, w: 14, d: 9, face: 0, floors: 2, roof: 'clay', kind: 'hall', name: "Elders' Hall" },
  { id: 'nw', x: -30, z: -116, w: 8, d: 7, face: Math.PI, floors: 1, roof: 'slate', kind: 'house' },
  { id: 'ne', x: 30, z: -115, w: 8, d: 7, face: Math.PI, floors: 1, roof: 'clay', kind: 'house' },
  { id: 'sw', x: -31, z: -141, w: 9, d: 7, face: 0, floors: 1, roof: 'clay', kind: 'house' },
  { id: 'se', x: 31, z: -141, w: 9, d: 7, face: 0, floors: 2, roof: 'slate', kind: 'house' },
  { id: 'barn', x: -32, z: -163, w: 10, d: 7, face: E, floors: 1, roof: 'thatch', kind: 'barn' },
  { id: 'store', x: 33, z: -164, w: 8, d: 6, face: -E, floors: 1, roof: 'slate', kind: 'house' }
];

/** Market stalls along the lane near the plaza: where they stand, which way they face, what they sell. */
export const STALLS = [
  { x: -5.6, z: -119, face: E, goods: 'fruit', cloth: '#c8553a' },
  { x: 5.6, z: -121, face: -E, goods: 'pots', cloth: '#3a6a8a' },
  { x: -5.6, z: -139, face: E, goods: 'cloth', cloth: '#d8a23a' },
  { x: 5.6, z: -137, face: -E, goods: 'greens', cloth: '#5a8a4a' }
];

/** The Kith Garden: where befriended creatures wait when three already follow you. */
export const GARDEN = { x: 31, z: -128, r: 9 };

/* ------------------------------------------------------------------ the valley */

/** The road: out of the gate, across the valley, over the bridge, up to the shrine. */
export const ROAD = sampleLine([
  [0, -178], [0, -150], [0, -120], [0, -86], [0, -70], [-2.5, -52], [1.5, -28], [8, -4], [9.5, 20], [6, 42], [0, 62], [-9, 88], [-9, 116], [1, 146], [9, 172], [11, 192], [10, 200]
]);
/** A footpath from the road to Mirror Pond, and one into the Hushwood. */
export const TRAILS = [
  sampleLine([[2, -26], [20, -30], [40, -38], [52, -42]]),
  sampleLine([[-6, 74], [-30, 86], [-56, 98], [-80, 108]])
];
export const ROAD_HALF = 2.3;

/** The Pebblerun: a spring in the Hushwood, down across the valley under the bridge, into Mirror Pond. */
export const STREAM = sampleLine([
  [-122, 134], [-112, 120], [-98, 104], [-72, 82], [-44, 64], [-18, 52], [6, 42], [30, 30], [50, 12], [60, -10], [64, -30]
]);
export const POND = { x: 66, z: -46, r: 17 };
export const BRIDGE = { x: 6, z: 42, length: 12, width: 3.2 };

/** The shrine on its hill, the view back over the valley. */
export const SHRINE = { x: 10, z: 212, face: Math.PI, name: 'Windbell Shrine' };
/** Stone lanterns along the shrine's last climb (an Emberkit can kindle them). */
export const STONE_LANTERNS = [[4, 166], [15, 172], [5, 182], [16, 188], [6, 196], [15, 199]];

/** The places, for banners and the minimap. */
export const AREAS = [
  { id: 'village', name: 'Lanternrest', sub: 'a village of lanterns and tile roofs', x: 0, z: -132, r: 60 },
  { id: 'shrine', name: 'Windbell Shrine', sub: 'the view over the whole vale', x: 10, z: 205, r: 34 },
  { id: 'pond', name: 'Mirror Pond', sub: 'where the Pebblerun comes to rest', x: 66, z: -46, r: 30 },
  { id: 'forest', name: 'The Hushwood', sub: 'step softly — the fawns are shy', x: -108, z: 116, r: 56 },
  { id: 'meadow', name: 'Hopgrass Meadow', sub: 'wildflowers and something hopping', x: 66, z: 80, r: 46 },
  { id: 'crags', name: 'Cinder Crags', sub: 'warm stones, little flames', x: -122, z: -48, r: 36 },
  { id: 'downs', name: 'Puffcrown Downs', sub: 'clouds that graze', x: 116, z: 150, r: 50 },
  { id: 'stream', name: 'The Pebblerun', sub: 'a chattering stream', line: true }
];

/** Gentle hills that shape the vale (centre, height, radius). */
export const HILLS = [
  { x: -46, z: -46, h: 15, r: 26 }, // Gate Hill, right of the road as you leave
  { x: -66, z: -10, h: 9, r: 30 },
  { x: 10, z: 214, h: 26, r: 44 }, // the shrine's hill
  { x: 116, z: 152, h: 15, r: 46 }, // Puffcrown Downs
  { x: 150, z: 95, h: 11, r: 40 },
  { x: 92, z: 196, h: 10, r: 36 },
  { x: -124, z: -48, h: 12, r: 32 }, // the crags' knoll
  { x: -112, z: 118, h: 6, r: 60 }, // the wood's rise
  { x: -150, z: 30, h: 12, r: 42 },
  { x: 120, z: -10, h: 8, r: 40 },
  { x: 40, z: 130, h: 5, r: 30 }
];

/** Areas for scenery and habitats. */
export const FOREST = { x: -108, z: 116, rx: 58, rz: 50 };
export const MEADOW = { x: 66, z: 80, r: 46 };
export const CRAGS = { x: -122, z: -48, r: 32 };
export const DOWNS = { x: 116, z: 150, r: 50 };

/** Rocky outcrops (centre, size, seed): the crags' jumble and a few loners about the vale. */
export const OUTCROPS = [
  { x: -118, z: -44, s: 3.4, n: 7, seed: 1 },
  { x: -132, z: -58, s: 2.8, n: 6, seed: 2 },
  { x: -108, z: -62, s: 2.2, n: 5, seed: 3 },
  { x: -138, z: -32, s: 2.6, n: 5, seed: 4 },
  { x: 38, z: 112, s: 2.4, n: 4, seed: 5 },
  { x: -44, z: 150, s: 2.6, n: 5, seed: 6 },
  { x: 134, z: 46, s: 2.8, n: 5, seed: 7 },
  { x: 88, z: -86, s: 2.2, n: 4, seed: 8 },
  { x: -34, z: 24, s: 1.8, n: 3, seed: 9 },
  { x: 46, z: 176, s: 2.4, n: 4, seed: 10 },
  { x: 150, z: 160, s: 2.2, n: 4, seed: 11 }
];

/* ------------------------------------------------------------------ the living and the hidden */

/** Where each species lives: home points (x, z) and how far it roams. */
export const HABITATS = {
  tuftlet: { homes: [[56, 72], [84, 96], [44, 54]], roam: 14 },
  pebbleroll: { homes: [[-40, 66], [34, 24], [56, -4]], roam: 9, onStream: true },
  lumoth: { homes: [[4, 196], [24, 214], [-8, 216]], roam: 8, fly: true },
  mistfawn: { homes: [[-96, 106], [-126, 132]], roam: 12 },
  puffwool: { homes: [[110, 150], [124, 122], [96, 172]], roam: 16 },
  emberkit: { homes: [[-111, -51], [-127, -37]], roam: 8 }
};

/** Treat bushes and plants: berries on bushes, seeds on tall sunheads, crystals glinting in rock. */
export const FORAGE = [
  ...[[-20, -60], [18, -40], [-14, 30], [26, 58], [-30, 100], [-70, 70], [-112, 92], [-90, 140], [30, 150], [-20, 180], [110, 20], [76, -20]].map(([x, z]) => ({ x, z, kind: 'berry' })),
  ...[[50, 64], [70, 92], [88, 70], [44, 90], [98, 120], [118, 140], [24, 4], [-8, 136]].map(([x, z]) => ({ x, z, kind: 'seed' })),
  ...[[-114, -36], [-128, -66], [-102, -56], [40, 116], [-40, 156], [138, 50], [44, 180]].map(([x, z]) => ({ x, z, kind: 'crystal' }))
];

/** Treat caches buried in the vale: only a Tuftlet's nose finds them. */
export const CACHES = [
  { id: 'c1', x: 32, z: 6, treat: 'seed', n: 3 },
  { id: 'c2', x: 74, z: 112, treat: 'berry', n: 3 },
  { id: 'c3', x: -58, z: 34, treat: 'crystal', n: 2 },
  { id: 'c4', x: -96, z: 84, treat: 'berry', n: 4 },
  { id: 'c5', x: 100, z: 166, treat: 'seed', n: 4 },
  { id: 'c6', x: -18, z: 196, treat: 'crystal', n: 2 },
  { id: 'c7', x: 92, z: -60, treat: 'berry', n: 3 },
  { id: 'c8', x: -146, z: 6, treat: 'crystal', n: 3 },
  { id: 'c9', x: 20, z: -64, treat: 'seed', n: 2 }
];

/** Cracked boulders a Pebbleroll can roll through (crystals inside). */
export const BOULDERS = [
  { id: 'b1', x: -110, z: -50, n: 3 },
  { id: 'b2', x: 40, z: 106, n: 2 },
  { id: 'b3', x: -50, z: 146, n: 3 },
  { id: 'b4', x: 128, z: 40, n: 2 },
  { id: 'b5', x: 84, z: -80, n: 2 }
];

/** The Hollow: a dark root cave in the Hushwood. An Emberkit's light shows what's inside. */
export const HOLLOW = { x: -134, z: 150, r: 5, treat: 'crystal', n: 4 };

/** Which area a point is in (the nearest one whose circle holds it; the stream by its banks). */
export function areaAt(x, z, streamDist = Infinity) {
  let best = null;
  let bestK = Infinity;
  for (const a of AREAS) {
    if (a.line) continue;
    const k = Math.hypot(x - a.x, z - a.z) / a.r;
    if (k < 1 && k < bestK) {
      best = a.id;
      bestK = k;
    }
  }
  if (!best && streamDist < 7) return 'stream';
  return best ?? 'vale';
}
