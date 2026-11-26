/**
 * Bridges that join the roads they belong to.
 *
 * OpenStreetMap draws a bridge as its own road (or several: the Yanghwa and
 * Dongjak bridges come in four pieces), meeting the roads before and after it
 * at shared points. Each point gets one height that every road through it
 * agrees on:
 *
 *   - a road that is no bridge lies on the ground;
 *   - a bridge's end that meets such a road comes down to the ground, on a
 *     ramp, so you drive straight on;
 *   - where bridge pieces meet each other, they meet at the deck's height —
 *     one deck height for all the pieces of one bridge (high over water, lower
 *     over a road);
 *   - a bridge end that meets another bridge partway along (a ramp joining
 *     the deck) takes that bridge's height there.
 *
 * Then every road is cut into pieces of about 300 m, each drawn with the
 * tile its middle is in — so a 3 km bridge never vanishes under you because
 * its first tile is out of view.
 */

/** Deck heights above the ground, in metres: over water, and over land or a road. */
export const DECK_WATER = 11;
export const DECK_LAND = 5;
const STEP = 10; // metres between points along a road (each edge laid on the ground: 20 m apart, two roads drawn over a junction parted by up to 20 cm)
const PIECE = 29; // points in a piece (≈ 300 m)

const smooth = (t) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

/** A road's points no more than STEP apart: `{ xz: [x, z, …], at: metres along each, vert: point index of each original vertex }`. */
export function densify(pts) {
  const xz = [];
  const at = [];
  const vert = [];
  let d = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2];
    const z = pts[i * 2 + 1];
    if (i === 0) {
      xz.push(x, z);
      at.push(0);
      vert.push(0);
      continue;
    }
    const ax = pts[i * 2 - 2];
    const az = pts[i * 2 - 1];
    const len = Math.hypot(x - ax, z - az);
    const steps = Math.max(1, Math.ceil(len / STEP));
    for (let s = 1; s <= steps; s++) {
      xz.push(ax + ((x - ax) * s) / steps, az + ((z - az) * s) / steps);
      at.push(d + (len * s) / steps);
    }
    d += len;
    vert.push(at.length - 1);
  }
  return { xz, at, vert };
}

/** A point added to a densified line `d` metres along it (unless one is within half a metre). */
export function addPoint(line, d) {
  const { xz, at, vert } = line;
  const i = at.findIndex((a) => a >= d);
  if (i <= 0 || at[i] - d < 0.5 || d - at[i - 1] < 0.5) return;
  const t = (d - at[i - 1]) / (at[i] - at[i - 1]);
  xz.splice(i * 2, 0, xz[i * 2 - 2] + (xz[i * 2] - xz[i * 2 - 2]) * t, xz[i * 2 - 1] + (xz[i * 2 + 1] - xz[i * 2 - 1]) * t);
  at.splice(i, 0, d);
  for (let k = 0; k < vert.length; k++) if (vert[k] >= i) vert[k]++;
}

/**
 * @param {{ road: { pts: Float32Array, width: number, bridge: boolean, cls: number }, keys: string[] }[]} all
 *   every road, with a key for each of its points (the same key where roads meet)
 * @param {{ water: (x: number, z: number) => boolean, tile: (x: number, z: number) => string }} world
 * @returns {Map<string, { line: Float32Array, along: number, width: number, cls: number, bridge: boolean }[]>}
 *   pieces by tile; `line` is x, z, height above the ground, for each point
 */
export function roadPieces(all, { water, tile }) {
  // Which points bridges pass through, and what else touches them.
  const bridgeKeys = new Set();
  for (const { road, keys } of all) if (road.bridge) for (const k of keys) bridgeKeys.add(k);
  /** key → { ground: a road that is no bridge passes here (wide: the widest), ways: the bridges that do } */
  const touch = new Map();
  all.forEach(({ road, keys }, w) => {
    for (const k of keys) {
      if (!bridgeKeys.has(k)) continue;
      let t = touch.get(k);
      if (!t) touch.set(k, (t = { ground: false, wide: 0, ways: [] }));
      if (road.bridge) t.ways.push(w);
      else {
        t.ground = true;
        t.wide = Math.max(t.wide, road.width || 0);
      }
    }
  });

  // The pieces of one bridge: bridge roads that share a point.
  const parent = all.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  for (const t of touch.values()) for (let i = 1; i < t.ways.length; i++) parent[find(t.ways[i])] = find(t.ways[0]);

  /**
   * How far a bridge's end that comes down to a road stays level with it before it climbs: across
   * the road it meets and its pavement (the ramp starting at the junction's middle was a ledge in
   * the crossing — half a metre up within the width of the road it met).
   */
  const holdAt = (key) => {
    const t = touch.get(key);
    return t?.ground ? t.wide / 2 + 3 : 0;
  };
  const lines = all.map(({ road }) => densify(road.pts));
  // (a point where each level end gives way to the climb, so the climb doesn't start at the junction's middle)
  all.forEach(({ road, keys }, w) => {
    if (!road.bridge) return;
    const L = lines[w].at[lines[w].at.length - 1];
    const h0 = Math.min(holdAt(keys[0]), L / 3);
    const h1 = Math.min(holdAt(keys[keys.length - 1]), L / 3);
    if (h0 > 0) addPoint(lines[w], h0);
    if (h1 > 0) addPoint(lines[w], L - h1);
  });
  // A bridge any of whose pieces crosses water stands high.
  const wet = new Set();
  all.forEach(({ road }, w) => {
    if (!road.bridge) return;
    const { xz } = lines[w];
    for (let i = 0; i < xz.length; i += 2) {
      if (water(xz[i], xz[i + 1])) {
        wet.add(find(w));
        break;
      }
    }
  });
  const deckOf = (w) => (wet.has(find(w)) ? DECK_WATER : DECK_LAND);

  /** What an end of a bridge road comes to: the ground (0) or the deck. */
  const endTarget = (w, key, x, z) => {
    const t = touch.get(key);
    if (!t || t.ground) return 0;
    // Nothing else here: a road cut off at the map's edge stays up over water, else it comes down.
    if (t.ways.length < 2) return water(x, z) ? deckOf(w) : 0;
    return deckOf(w);
  };

  const lifts = new Array(all.length);
  const liftOf = (w, a, b, ha = 0, hb = 0) => {
    const { at } = lines[w];
    const L = at[at.length - 1] || 1;
    const D = deckOf(w);
    // (the level stretches never more than a third of the bridge each)
    const h0 = a === 0 ? Math.min(ha, L / 3) : 0;
    const h1 = b === 0 ? Math.min(hb, L / 3) : 0;
    const R = Math.max(25, Math.min(150, (L - h0 - h1) * 0.35));
    return at.map((d) => D - (D - a) * (1 - smooth((d - h0) / R)) - (D - b) * (1 - smooth((L - d - h1) / R)));
  };
  // First pass: each bridge on its own.
  all.forEach(({ road, keys }, w) => {
    if (!road.bridge) return;
    const { xz } = lines[w];
    const m = xz.length - 2;
    const k0 = keys[0];
    const k1 = keys[keys.length - 1];
    lifts[w] = liftOf(w, endTarget(w, k0, xz[0], xz[1]), endTarget(w, k1, xz[m], xz[m + 1]), holdAt(k0), holdAt(k1));
  });
  // The height a bridge has where another bridge's end meets it partway along.
  const midway = new Map();
  all.forEach(({ road, keys }, w) => {
    if (!road.bridge) return;
    for (let i = 1; i < keys.length - 1; i++) midway.set(keys[i], lifts[w][lines[w].vert[i]]);
  });
  // Second pass: ends that meet a bridge partway take its height there.
  all.forEach(({ road, keys }, w) => {
    if (!road.bridge) return;
    const { xz } = lines[w];
    const m = xz.length - 2;
    const a = midway.has(keys[0]) && endTarget(w, keys[0], xz[0], xz[1]) > 0 ? midway.get(keys[0]) : null;
    const b = midway.has(keys[keys.length - 1]) && endTarget(w, keys[keys.length - 1], xz[m], xz[m + 1]) > 0 ? midway.get(keys[keys.length - 1]) : null;
    if (a == null && b == null) return;
    const first = lifts[w];
    lifts[w] = liftOf(w, a ?? first[0], b ?? first[first.length - 1], holdAt(keys[0]), holdAt(keys[keys.length - 1]));
  });

  // Cut into pieces, each with the tile its middle is in.
  const out = new Map();
  all.forEach(({ road }, w) => {
    const { xz, at } = lines[w];
    const n = xz.length / 2;
    const lift = lifts[w];
    for (let s = 0; s < n - 1; s += PIECE - 1) {
      const e = Math.min(n - 1, s + PIECE - 1);
      const line = new Float32Array((e - s + 1) * 3);
      for (let i = s; i <= e; i++) {
        line[(i - s) * 3] = xz[i * 2];
        line[(i - s) * 3 + 1] = xz[i * 2 + 1];
        line[(i - s) * 3 + 2] = lift ? lift[i] : 0;
      }
      const mid = (s + e) >> 1;
      const key = tile(xz[mid * 2], xz[mid * 2 + 1]);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push({ line, along: at[s], width: road.width, cls: road.cls, bridge: road.bridge, oneway: Boolean(road.oneway), total: at[at.length - 1] });
    }
  });
  return out;
}
