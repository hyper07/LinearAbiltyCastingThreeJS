/**
 * Seoul's small streets round the bike courses: the residential lanes, the
 * golmok (alleys, often under 4 m), the market lanes and pedestrian streets
 * the main road file leaves out — fetched from OpenStreetMap (© OpenStreetMap
 * contributors, ODbL) through the Overpass API, only in the boxes round the
 * neighbourhoods the bike race visits (course.js BIKE_COURSES), so it stays
 * small.
 *
 * Out: alleys.bin beside roads.bin, in the same format (magic "SEOR", an
 * origin, then each street as a class, flags and points in decimetres). The
 * classes go on from the main roads': 5 a residential street, 6 an alley
 * (living street, service lane), 7 a pedestrian street or path. For these
 * the top four bits of the flags are the street's width in half metres (0:
 * not known), where for main roads they are the lane count.
 *
 *   node scripts/geo/seoul-alleys.mjs            # (also run by npm run geo:seoul)
 *   node scripts/geo/seoul-alleys.mjs --offline  # from the cached download only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toGrid, toLonLat } from './tm.mjs';
import { BIKE_COURSES } from '../../src/city/course.js';

/** Where the game's world begins (SeoulGame ORIGIN): City Hall, in the grid. */
const ORIGIN = { x: 198050, y: 551860 };
export const ALLEY_CLASSES = { residential: 5, unclassified: 5, living_street: 6, service: 6, pedestrian: 7, footway: 7, path: 7, cycleway: 7 };
export const ALLEY_CREDIT = '골목 small streets: © OpenStreetMap contributors (ODbL)';

/** The boxes to fetch: round each bike course, a little wider than it reaches. */
export function alleyBoxes(courses = BIKE_COURSES) {
  return courses.map((c) => {
    const reach = c.r * 1.6 + 250;
    const x0 = ORIGIN.x + c.x - reach;
    const x1 = ORIGIN.x + c.x + reach;
    const y0 = ORIGIN.y - (c.z + reach);
    const y1 = ORIGIN.y - (c.z - reach);
    return { id: c.id, x0, x1, y0, y1 };
  });
}

/** Should this way be a street to ride? Not pavements beside a road, crossings, car-park aisles, private drives, tunnels. */
export function keepWay(tags = {}) {
  const kind = tags.highway;
  if (!(kind in ALLEY_CLASSES)) return false;
  if (tags.area === 'yes' || tags.tunnel === 'yes' || tags.covered === 'yes' || tags.indoor === 'yes') return false;
  if (['private', 'no'].includes(tags.access)) return false;
  if (kind === 'footway' && ['sidewalk', 'crossing', 'traffic_island'].includes(tags.footway)) return false;
  if (kind === 'service' && ['parking_aisle', 'driveway', 'drive-through', 'emergency_access'].includes(tags.service)) return false;
  if (tags.steps === 'yes' || tags.highway === 'steps') return false;
  return true;
}

/** Write the ways (Overpass JSON elements) as alleys.bin. Returns the number of streets. */
export function encodeAlleys(elements, boxes) {
  const x0 = Math.floor(Math.min(...boxes.map((b) => b.x0)));
  const y0 = Math.floor(Math.min(...boxes.map((b) => b.y0)));
  const parts = [];
  const seen = new Set();
  for (const way of elements) {
    if (way.type !== 'way' || !way.geometry || seen.has(way.id) || !keepWay(way.tags)) continue;
    seen.add(way.id);
    const cls = ALLEY_CLASSES[way.tags.highway];
    const pts = way.geometry.map((p) => toGrid(p.lon, p.lat));
    if (pts.length < 2 || pts.length > 65535) continue;
    const width = parseFloat(String(way.tags.width ?? '').replace(',', '.'));
    const halves = Number.isFinite(width) && width > 0.8 ? Math.max(1, Math.min(15, Math.round(width * 2))) : 0;
    const oneway = way.tags.oneway === 'yes' || way.tags.oneway === '1';
    const b = Buffer.alloc(4 + pts.length * 8);
    b.writeUInt8(cls, 0);
    b.writeUInt8((way.tags.bridge && way.tags.bridge !== 'no' ? 2 : 0) | (oneway ? 4 : 0) | (halves << 4), 1);
    b.writeUInt16LE(pts.length, 2);
    pts.forEach(([x, y], i) => {
      b.writeInt32LE(Math.round((x - x0) * 10), 4 + i * 8);
      b.writeInt32LE(Math.round((y - y0) * 10), 8 + i * 8);
    });
    parts.push(b);
  }
  const head = Buffer.alloc(16);
  head.writeUInt32LE(0x524f4553, 0); // "SEOR", as roads.bin
  head.writeInt32LE(x0, 4);
  head.writeInt32LE(y0, 8);
  head.writeUInt32LE(parts.length, 12);
  return { buffer: Buffer.concat([head, ...parts]), count: parts.length };
}

/** Fetch (once) and write alleys.bin into `out`. Returns the number of streets, or 0. */
export async function buildAlleys(out, { offline = false, src = join(out, '..', 'src') } = {}) {
  mkdirSync(src, { recursive: true });
  const boxes = alleyBoxes();
  const cache = join(src, 'alleys.json');
  const fresh = existsSync(cache) && statSync(cache).size > 1000 && JSON.parse(readFileSync(cache, 'utf8')).boxes === boxes.map((b) => b.id).join(',');
  if (!fresh && !offline) {
    const bbox = (b) => {
      const [w, s] = toLonLat(b.x0, b.y0);
      const [e, n] = toLonLat(b.x1, b.y1);
      return `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;
    };
    const kinds = Object.keys(ALLEY_CLASSES).join('|');
    const query = `[out:json][timeout:240];(${boxes.map((b) => `way["highway"~"^(${kinds})$"](${bbox(b)});`).join('')});out geom qt;`;
    console.log(`[seoul] downloading the small streets round ${boxes.length} bike courses…`);
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'User-Agent': 'geo-build/1.0' } });
      if (!r.ok) throw new Error(String(r.status));
      const osm = await r.json();
      writeFileSync(cache, JSON.stringify({ boxes: boxes.map((b) => b.id).join(','), elements: osm.elements ?? [] }));
    } catch (e) {
      console.warn(`[seoul] small streets not downloaded: ${e.message}`);
    }
  }
  if (!existsSync(cache)) return 0;
  const { elements } = JSON.parse(readFileSync(cache, 'utf8'));
  const { buffer, count } = encodeAlleys(elements, boxes);
  writeFileSync(join(out, 'alleys.bin'), buffer);
  console.log(`[seoul] small streets: ${count.toLocaleString()} round the bike courses`);
  return count;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.env.SEOUL_OUT ?? 'data/geo/seoul/tiles');
  if (!existsSync(join(out, 'index.json'))) {
    console.error(`[seoul] no map in ${out}: run npm run geo:seoul first`);
    process.exit(1);
  }
  await buildAlleys(out, { offline: process.argv.includes('--offline') });
}
