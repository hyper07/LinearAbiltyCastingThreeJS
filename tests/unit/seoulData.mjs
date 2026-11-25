/**
 * Seoul's converted map from disk (data/geo/seoul/tiles), read the way
 * SeoulGame reads it in the browser: the roads, the small streets, and the
 * building footprints round a place — for the tests and tools that plan and
 * ride real courses. Returns null when the map isn't converted here.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAlleys, readRoads } from '../../src/city/alleys.js';
import { decodeTile, tileKey, tileOf, TILE } from '../../src/city/tiles.js';
import { Walls, tileRings } from '../../src/city/walls.js';

export const ORIGIN = { x: 198050, y: 551860 };
const DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data/geo/seoul/tiles');

export function seoulData() {
  if (!existsSync(join(DIR, 'roads.bin'))) return null;
  const buf = (name) => {
    const b = readFileSync(join(DIR, name));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const roads = readRoads(buf('roads.bin'), ORIGIN).map((r) => r.road);
  const alleys = existsSync(join(DIR, 'alleys.bin')) ? readAlleys(buf('alleys.bin'), ORIGIN) : [];
  return { roads, alleys, all: roads.concat(alleys) };
}

/** The roads (and small streets) that start near a place, as race.js _roadsNear picks them. */
export function roadsNear(all, def, reach) {
  return all.filter((r) => Math.abs(r.pts[0] - def.x) < reach && Math.abs(r.pts[1] - def.z) < reach);
}

/** The footprints of every building within `reach` of a place, as a Walls. */
export function wallsNear(x, z, reach) {
  const walls = new Walls();
  const [tx0, ty0] = tileOf(x - reach + ORIGIN.x, -(z + reach) + ORIGIN.y);
  const [tx1, ty1] = tileOf(x + reach + ORIGIN.x, -(z - reach) + ORIGIN.y);
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const f = join(DIR, `${tileKey(tx, ty)}.bin`);
      if (!existsSync(f)) continue;
      const b = readFileSync(f);
      for (const r of tileRings(decodeTile(new Uint8Array(b.buffer, b.byteOffset, b.byteLength)), tx, ty, TILE, ORIGIN)) walls.addRing(r.xs, r.zs);
    }
  }
  return walls;
}

/** The lie of the land (terrain.bin, read as SeoulGame reads it): a groundAt(x, z) in metres, or null without it. */
export function seoulTerrain() {
  const f = join(DIR, 'terrain.bin');
  if (!existsSync(f)) return null;
  const b = readFileSync(f);
  const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const v = new DataView(buf);
  if (v.getUint32(0, true) !== 0x544f4553) return null;
  const cols = v.getUint16(14, true);
  const rows = v.getUint16(16, true);
  const t = { x0: v.getInt32(4, true) - ORIGIN.x, y0: v.getInt32(8, true) - ORIGIN.y, cell: v.getUint16(12, true), cols, rows, h: new Uint16Array(buf, 24, cols * rows) };
  return (x, z) => {
    const fx = Math.max(0, Math.min(t.cols - 1.001, (x - t.x0) / t.cell));
    const fy = Math.max(0, Math.min(t.rows - 1.001, (-z - t.y0) / t.cell));
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const w = fy - j;
    const at = (a, c) => t.h[c * t.cols + a];
    return (at(i, j) * (1 - u) * (1 - w) + at(i + 1, j) * u * (1 - w) + at(i, j + 1) * (1 - u) * w + at(i + 1, j + 1) * u * w) / 10;
  };
}
