/**
 * Turn the national building register's Seoul file into map tiles the game
 * can stream.
 *
 *   node scripts/geo/seoul-build.mjs [folder-with-the-shp] [out-folder]
 *
 * In:  국토교통부 GIS건물통합정보, 서울특별시 (AL_D010_11_<date>.shp/.dbf/.prj),
 *      KOGL type 1 (free to use with attribution). Looked for in
 *      library/Seoul_Map.zip/, library/, data/geo/seoul/ unless a folder is given.
 * Out: data/geo/seoul/tiles/<tx>_<ty>.bin (src/city/tiles.js) and index.json:
 *      the tiles there are, the districts and where they are, the tallest
 *      named buildings. Git-ignored; nothing from the register is committed.
 *
 * Only footprints, heights (the register's, else from floors), uses and
 * building names are kept from the register. The land and the main roads
 * come from open data this downloads itself (seoul-extras.mjs; `--offline`
 * skips that, and the ground is then flat).
 */
import { openSync, readSync, closeSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TILE, tileKey, tileOf, encodeTile, simplify, area2, heightOf, useOf } from '../../src/city/tiles.js';
import { buildExtras } from './seoul-extras.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const offline = process.argv.includes('--offline');
const find = () => {
  for (const dir of [args[0], 'library/Seoul_Map.zip', 'library', 'data/geo/seoul'].filter(Boolean)) {
    if (!existsSync(dir)) continue;
    const shp = readdirSync(dir).find((f) => /^AL_D010_11_\d+\.shp$/i.test(f));
    if (shp) return join(dir, shp.replace(/\.shp$/i, ''));
  }
  return null;
};
const base = find();
if (!base) {
  console.error('No Seoul building file found. Download 국토교통부 GIS건물통합정보 for 서울특별시 (AL_D010_11_<date>) and put the .shp, .dbf and .prj in library/Seoul_Map.zip/ or data/geo/seoul/.');
  process.exit(1);
}
const out = resolve(args[1] ?? 'data/geo/seoul/tiles');
const prj = existsSync(`${base}.prj`) ? readFileSync(`${base}.prj`, 'utf8') : '';
if (!/5186|Central_Belt_2010/.test(prj)) console.warn('[seoul] The .prj is not EPSG:5186 (Korea 2000 Central Belt 2010) — the tiles may be misplaced.');
/** Seoul, generously, in the source's grid: a few records carry coordinates from elsewhere. */
const BOUNDS = { x0: 176000, x1: 220000, y0: 533000, y1: 570000 };

/* ---- the attribute table (.dbf) ---- */
const dbf = openSync(`${base}.dbf`, 'r');
const head = Buffer.alloc(32);
readSync(dbf, head, 0, 32, 0);
const total = head.readUInt32LE(4);
const headLen = head.readUInt16LE(8);
const recLen = head.readUInt16LE(10);
const fieldBuf = Buffer.alloc(headLen - 32);
readSync(dbf, fieldBuf, 0, fieldBuf.length, 32);
const fields = {};
for (let o = 0, at = 1; fieldBuf[o] !== 0x0d && o + 32 <= fieldBuf.length; o += 32) {
  const name = fieldBuf.subarray(o, o + 11).toString('latin1').replace(/\0.*$/, '');
  fields[name] = [at, fieldBuf[o + 16]];
  at += fieldBuf[o + 16];
}
for (const need of ['A4', 'A8', 'A16', 'A24', 'A26']) if (!fields[need]) throw new Error(`The .dbf has no ${need} column — is this the building register?`);
const korean = new TextDecoder('euc-kr');
const text = (rec, f) => korean.decode(rec.subarray(fields[f][0], fields[f][0] + fields[f][1])).replace(/\0/g, '').trim();
const number = (rec, f) => Number(rec.subarray(fields[f][0], fields[f][0] + fields[f][1]).toString('latin1').trim()) || 0;

/* ---- the shapes (.shp) and the table, read side by side in big blocks ---- */
const shp = openSync(`${base}.shp`, 'r');
const reader = (fd, start) => {
  let buf = Buffer.alloc(0);
  let pos = start;
  return (n) => {
    if (buf.length < n) {
      const more = Buffer.alloc(Math.max(n, 8 << 20));
      const got = readSync(fd, more, 0, more.length, pos);
      pos += got;
      buf = Buffer.concat([buf, more.subarray(0, got)]);
      if (buf.length < n) return null;
    }
    const piece = buf.subarray(0, n);
    buf = buf.subarray(n);
    return piece;
  };
};
const nextShape = reader(shp, 100);
const nextRow = reader(dbf, headLen);

/** Towers the register lists by their base building: what to call them, and how tall the whole is (metres). */
const MASTS = { 서울타워: { label: 'N서울타워 (남산타워)', height: 237 } };
const tiles = new Map();
const districts = new Map();
const landmarks = [];
let kept = 0;
let dropped = 0;
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const sh = nextShape(8);
  const row = nextRow(recLen);
  if (!sh || !row) break;
  const body = nextShape(sh.readUInt32BE(4) * 2);
  if (!body || body.readInt32LE(0) !== 5) {
    dropped++;
    continue;
  }
  const parts = body.readInt32LE(36);
  const points = body.readInt32LE(40);
  // The biggest ring is the footprint (courtyards and odd extra parts are left out).
  let ring = null;
  let ringArea = 0;
  for (let p = 0; p < parts; p++) {
    const from = body.readInt32LE(44 + p * 4);
    const to = p + 1 < parts ? body.readInt32LE(44 + (p + 1) * 4) : points;
    const r = [];
    for (let k = from; k < to - 1; k++) r.push(body.readDoubleLE(44 + parts * 4 + k * 16), body.readDoubleLE(44 + parts * 4 + k * 16 + 8));
    const a = Math.abs(area2(r)) / 2;
    if (a > ringArea || !ring) {
      ringArea = a;
      ring = r;
    }
  }
  // A few towers are in the register as a bare point or their base only: the game draws the mast, to this height.
  const mast = MASTS[text(row, 'A24')];
  if (mast && ring?.length >= 2) landmarks.push({ name: mast.label, height: mast.height, x: Math.round(ring[0]), y: Math.round(ring[1]), place: text(row, 'A4').split(/\s+/).slice(1, 3).join(' '), tower: true });
  if (!ring || ring.length < 6 || ringArea < 6 || ring[0] < BOUNDS.x0 || ring[0] > BOUNDS.x1 || ring[1] < BOUNDS.y0 || ring[1] > BOUNDS.y1) {
    dropped++;
    continue;
  }
  ring = simplify(ring, 0.4);
  if (ring.length > 160) ring = simplify(ring, 1.5);
  if (area2(ring) < 0) {
    // Counter-clockwise, always: the browser builds walls facing out from that.
    const flipped = [];
    for (let k = ring.length - 2; k >= 0; k -= 2) flipped.push(ring[k], ring[k + 1]);
    ring = flipped;
  }
  let cx = 0;
  let cy = 0;
  for (let k = 0; k < ring.length; k += 2) {
    cx += ring[k];
    cy += ring[k + 1];
  }
  cx /= ring.length / 2;
  cy /= ring.length / 2;
  const height = heightOf(number(row, 'A16'), number(row, 'A26'));
  const name = text(row, 'A24').slice(0, 60) || undefined;
  const address = text(row, 'A4').split(/\s+/); // 서울특별시 종로구 세종로
  const gu = address[1] ?? '';
  const [tx, ty] = tileOf(cx, cy);
  const key = tileKey(tx, ty);
  let tile = tiles.get(key);
  if (!tile) tiles.set(key, (tile = { tx, ty, buildings: [], places: new Map() }));
  tile.buildings.push({ ring, height, use: useOf(text(row, 'A8')), name: name && (height >= 20 || ringArea >= 1500) ? name : undefined });
  const place = address.slice(1, 3).join(' ');
  if (place) tile.places.set(place, (tile.places.get(place) ?? 0) + 1);
  if (gu) {
    const d = districts.get(gu) ?? { name: gu, x: 0, y: 0, count: 0 };
    d.x += cx;
    d.y += cy;
    d.count++;
    districts.set(gu, d);
  }
  if (name && height >= 60 && !mast) landmarks.push({ name, height: Math.round(height), x: Math.round(cx), y: Math.round(cy), place });
  kept++;
  if (i % 100000 === 0 && i) console.log(`[seoul] ${i.toLocaleString()} of ${total.toLocaleString()} read…`);
}
closeSync(shp);
closeSync(dbf);

/* ---- write ---- */
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const index = {};
let bytes = 0;
for (const [key, tile] of tiles) {
  const place = [...tile.places].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  // At most 65,535 names a tile; in practice a few dozen.
  const data = encodeTile(tile.tx, tile.ty, tile.buildings, { place });
  writeFileSync(join(out, `${key}.bin`), data);
  bytes += data.length;
  index[key] = tile.buildings.length;
}
// One landmark a name: the tallest of a complex's towers stands for it.
const seen = new Map();
for (const l of landmarks.sort((a, b) => b.height - a.height)) {
  const key = `${l.name.replace(/\s*\S*동$/, '').replace(/[\s\d]+$/, '')}|${l.place}`;
  if (!seen.has(key)) seen.set(key, { ...l, name: l.name.replace(/\s+\S{1,6}동$/, '') });
}
const extras = await buildExtras(out, index, { offline });
writeFileSync(join(out, 'index.json'), JSON.stringify({
  terrain: extras.terrain,
  roads: extras.roads,
  credits: extras.credits,
  tile: TILE,
  crs: 'EPSG:5186',
  source: '국토교통부 GIS건물통합정보 (서울특별시)',
  license: '공공누리 제1유형: 출처표시',
  file: base.split('/').pop(),
  buildings: kept,
  tiles: index,
  districts: [...districts.values()].filter((d) => d.count > 200).map((d) => ({ name: d.name, x: Math.round(d.x / d.count), y: Math.round(d.y / d.count), count: d.count })).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  landmarks: [...[...seen.values()].filter((l) => l.tower), ...[...seen.values()].filter((l) => !l.tower).slice(0, 400)]
}));
console.log(`[seoul] ${kept.toLocaleString()} buildings in ${tiles.size} tiles (${(bytes / 1048576).toFixed(1)} MB) → ${out}; ${dropped.toLocaleString()} left out (tiny, broken or outside Seoul); ${((Date.now() - t0) / 1000).toFixed(1)}s`);
