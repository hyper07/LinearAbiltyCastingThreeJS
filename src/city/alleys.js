/**
 * Seoul's small streets (alleys.bin, from scripts/geo/seoul-alleys.mjs): the
 * residential lanes, golmok and market lanes round the bike courses. Read as
 * plain roads, { pts, width, cls, oneway, small: true }, in world metres
 * (x east, z south) like roads.bin's — so the course planner can use both.
 */

/** A small street's width when the map does not say: a lane, an alley, a market lane. */
export const SMALL_WIDTH = { 5: 6.2, 6: 3.6, 7: 3.4 };

/**
 * Read alleys.bin. `origin` is where the world begins in the grid (City
 * Hall). Returns [] for anything that is not an alleys file.
 */
export function readAlleys(buf, origin) {
  const v = new DataView(buf);
  if (buf.byteLength < 16 || v.getUint32(0, true) !== 0x524f4553) return [];
  const x0 = v.getInt32(4, true) - origin.x;
  const y0 = v.getInt32(8, true) - origin.y;
  const count = v.getUint32(12, true);
  const out = [];
  let o = 16;
  for (let k = 0; k < count && o + 4 <= buf.byteLength; k++) {
    const cls = v.getUint8(o);
    const flags = v.getUint8(o + 1);
    const n = v.getUint16(o + 2, true);
    const pts = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      pts[i * 2] = x0 + v.getInt32(o + 4 + i * 8, true) / 10;
      pts[i * 2 + 1] = -(y0 + v.getInt32(o + 8 + i * 8, true) / 10);
    }
    o += 4 + n * 8;
    const halves = flags >> 4;
    // Wider than the map says is wider than a bike race wants: a little narrower than given.
    const width = halves ? Math.max(2.6, Math.min(8, halves / 2)) : SMALL_WIDTH[cls] ?? 4;
    out.push({ pts, width, cls, oneway: Boolean(flags & 4), bridge: Boolean(flags & 2), lanes: 0, small: true });
  }
  return out;
}

/** Road widths in metres by class (motorway … tertiary); a link road is narrower. */
export const ROAD_WIDTH = [22, 18, 15, 11, 8];
/** A one-way carriageway (half of a big road) of no known lane count. */
export const ONE_WAY_WIDTH = [11.5, 10, 8.5, 7.5, 6];

/**
 * Read roads.bin (the main roads): each { road: { pts, width, bridge, cls, oneway, lanes }, keys }
 * — keys being where each point is, to the decimetre (where roads meet: the same point).
 * Returns null for anything that is not a roads file.
 */
export function readRoads(buf, origin) {
  const v = new DataView(buf);
  if (buf.byteLength < 16 || v.getUint32(0, true) !== 0x524f4553) return null;
  const x0 = v.getInt32(4, true) - origin.x;
  const y0 = v.getInt32(8, true) - origin.y;
  const count = v.getUint32(12, true);
  const all = [];
  let o = 16;
  for (let k = 0; k < count; k++) {
    const cls = v.getUint8(o);
    const flags = v.getUint8(o + 1);
    const n = v.getUint16(o + 2, true);
    const pts = new Float32Array(n * 2);
    const keys = new Array(n);
    for (let i = 0; i < n; i++) {
      const xi = v.getInt32(o + 4 + i * 8, true);
      const yi = v.getInt32(o + 8 + i * 8, true);
      pts[i * 2] = x0 + xi / 10;
      pts[i * 2 + 1] = -(y0 + yi / 10); // world Z
      keys[i] = `${xi}|${yi}`;
    }
    o += 4 + n * 8;
    // As wide as its lanes (3.25 m each, and the shoulders), where the map says how many; else by its class.
    const lanes = flags >> 4;
    const oneway = Boolean(flags & 4);
    const width = lanes ? lanes * 3.25 + (oneway ? 1.0 : 1.6) : (oneway ? ONE_WAY_WIDTH[cls] : ROAD_WIDTH[cls]) * (flags & 1 ? 0.55 : 1);
    all.push({ road: { pts, width, bridge: Boolean(flags & 2), cls, oneway, lanes }, keys });
  }
  return all;
}
