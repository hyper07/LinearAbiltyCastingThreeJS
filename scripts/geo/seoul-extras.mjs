/**
 * The land under Seoul's buildings, and its main roads — from open data that
 * anyone may download, so this script fetches it itself:
 *
 * - Terrain: Copernicus DEM GLO-30 (ESA / European Union; free with credit),
 *   two one-degree tiles from its public bucket. It is a surface model (it
 *   includes buildings a little), so the bumps narrower than a city block are
 *   smoothed away and the hills kept. Where it is perfectly flat and low, it
 *   is water: that is how the Han is found.
 * - Roads: OpenStreetMap (© OpenStreetMap contributors, ODbL), the motorways
 *   down to tertiary roads inside Seoul's bounds, from the Overpass API.
 *
 * Out, beside the building tiles: terrain.bin (a grid of heights and a water
 * mask) and roads.bin (every road as a line). Sources are kept in
 * data/geo/seoul/src/ and not downloaded twice. No elevation figure is ever
 * shown in the game; the heights only shape the ground.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openDem } from './tiff.mjs';
import { toGrid, toLonLat } from './tm.mjs';
import { TILE } from '../../src/city/tiles.js';

export const CELL = 25;
const DEM = ['Copernicus_DSM_COG_10_N37_00_E126_00_DEM', 'Copernicus_DSM_COG_10_N37_00_E127_00_DEM'];
const ROADS_QUERY = '[out:json][timeout:240][bbox:37.41,126.76,37.71,127.19];way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"];out geom qt;';
export const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
export const CREDITS = ['지형 terrain: Copernicus DEM GLO-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA', '도로 roads: © OpenStreetMap contributors (ODbL)'];

async function download(url, file, init = {}) {
  console.log(`[seoul] downloading ${url.slice(0, 90)}…`);
  const r = await fetch(url, { ...init, headers: { 'User-Agent': 'geo-build/1.0', ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

/** Fetch what is missing into `src`. Returns what is there: { dem: boolean, roads: boolean }. */
export async function fetchSources(src, { offline = false } = {}) {
  mkdirSync(src, { recursive: true });
  const have = (f) => existsSync(join(src, f)) && statSync(join(src, f)).size > 1000;
  if (!offline) {
    for (const name of DEM) {
      if (!have(`${name}.tif`)) await download(`https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif`, join(src, `${name}.tif`)).catch((e) => console.warn(`[seoul] terrain not downloaded: ${e.message}`));
    }
    if (!have('roads.json')) {
      await download('https://overpass-api.de/api/interpreter', join(src, 'roads.json'), { method: 'POST', body: new URLSearchParams({ data: ROADS_QUERY }) }).catch((e) => console.warn(`[seoul] roads not downloaded: ${e.message}`));
    }
  }
  return { dem: DEM.every((n) => have(`${n}.tif`)), roads: have('roads.json') };
}

/** A min (or max) of every cell's neighbourhood: one pass along rows, one along columns. */
function spread(grid, cols, rows, r, pick) {
  const tmp = new Float32Array(grid.length);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let v = grid[y * cols + x];
      for (let k = Math.max(0, x - r); k <= Math.min(cols - 1, x + r); k++) v = pick(v, grid[y * cols + k]);
      tmp[y * cols + x] = v;
    }
  }
  const out = new Float32Array(grid.length);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let v = tmp[y * cols + x];
      for (let k = Math.max(0, y - r); k <= Math.min(rows - 1, y + r); k++) v = pick(v, tmp[k * cols + x]);
      out[y * cols + x] = v;
    }
  }
  return out;
}

function blur(grid, cols, rows, r) {
  let a = grid;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(a.length);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let s = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const i = pass ? y + k : x + k;
          if (i < 0 || i >= (pass ? rows : cols)) continue;
          s += pass ? a[i * cols + x] : a[y * cols + i];
          n++;
        }
        b[y * cols + x] = s / n;
      }
    }
    a = b;
  }
  return a;
}

/**
 * Make terrain.bin and roads.bin beside the building tiles.
 * @param {string} out the tiles folder
 * @param {Record<string, number>} tiles the building tiles there are (their keys bound the terrain)
 * @returns {Promise<{ terrain: boolean, roads: number, credits: string[] }>}
 */
export async function buildExtras(out, tiles, { offline = false, src = resolve('data/geo/seoul/src') } = {}) {
  const have = await fetchSources(src, { offline });
  const result = { terrain: false, roads: 0, credits: [] };
  const keys = Object.keys(tiles).map((k) => k.split('_').map(Number));
  const x0 = (Math.min(...keys.map((k) => k[0])) - 2) * TILE;
  const y0 = (Math.min(...keys.map((k) => k[1])) - 2) * TILE;
  const x1 = (Math.max(...keys.map((k) => k[0])) + 3) * TILE;
  const y1 = (Math.max(...keys.map((k) => k[1])) + 3) * TILE;
  if (have.dem) {
    const dems = DEM.map((n) => openDem(join(src, `${n}.tif`)));
    const cols = Math.round((x1 - x0) / CELL) + 1;
    const rows = Math.round((y1 - y0) / CELL) + 1;
    const raw = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const [lon, lat] = toLonLat(x0 + i * CELL, y0 + j * CELL);
        const dem = dems.find((d) => d.contains(lon, lat));
        raw[j * cols + i] = dem ? Math.max(0, dem.sample(lon, lat)) : 0;
      }
    }
    for (const d of dems) d.close();
    // Water: low, and exactly level with everything around it (the model flattens rivers and lakes).
    const water = new Uint8Array(cols * rows);
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const h = raw[j * cols + i];
        if (h > 40) continue;
        let flat = true;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
          const v = raw[Math.max(0, Math.min(rows - 1, j + dj)) * cols + Math.max(0, Math.min(cols - 1, i + di))];
          if (Math.abs(v - h) > 0.02) {
            flat = false;
            break;
          }
        }
        if (flat) water[j * cols + i] = 1;
      }
    }
    // Ground: take the buildings back out of the surface model (bumps narrower than ~150 m), then soften.
    const opened = spread(spread(raw, cols, rows, 3, Math.min), cols, rows, 3, Math.max);
    const smooth = blur(opened, cols, rows, 2);
    const head = Buffer.alloc(24);
    head.writeUInt32LE(0x544f4553, 0); // "SEOT"
    head.writeInt32LE(x0, 4);
    head.writeInt32LE(y0, 8);
    head.writeUInt16LE(CELL, 12);
    head.writeUInt16LE(cols, 14);
    head.writeUInt16LE(rows, 16);
    const heights = Buffer.alloc(cols * rows * 2);
    let top = 0;
    for (let k = 0; k < cols * rows; k++) {
      const h = water[k] ? raw[k] : smooth[k];
      top = Math.max(top, h);
      heights.writeUInt16LE(Math.max(0, Math.min(65535, Math.round(h * 10))), k * 2);
    }
    writeFileSync(join(out, 'terrain.bin'), Buffer.concat([head, heights, Buffer.from(water)]));
    result.terrain = true;
    result.credits.push(CREDITS[0]);
    console.log(`[seoul] terrain: ${cols} × ${rows} cells of ${CELL} m, ${Math.round((water.reduce((n, v) => n + v, 0) * CELL * CELL) / 1e6)} km² of water`);
  } else console.warn('[seoul] no terrain: the ground will be flat (run again online to download it)');
  if (have.roads) {
    const osm = JSON.parse(readFileSync(join(src, 'roads.json'), 'utf8'));
    const parts = [];
    let count = 0;
    for (const way of osm.elements ?? []) {
      if (way.type !== 'way' || !way.geometry || way.tags?.tunnel === 'yes' || way.tags?.covered === 'yes') continue;
      const kind = String(way.tags?.highway ?? '');
      const cls = ROAD_CLASSES.indexOf(kind.replace(/_link$/, ''));
      if (cls < 0) continue;
      const pts = way.geometry.map((p) => toGrid(p.lon, p.lat)).filter(([x, y]) => x > x0 && x < x1 && y > y0 && y < y1);
      if (pts.length < 2 || pts.length > 65535) continue;
      const b = Buffer.alloc(4 + pts.length * 8);
      b.writeUInt8(cls, 0);
      b.writeUInt8((kind.endsWith('_link') ? 1 : 0) | (way.tags?.bridge && way.tags.bridge !== 'no' ? 2 : 0), 1);
      b.writeUInt16LE(pts.length, 2);
      pts.forEach(([x, y], i) => {
        b.writeInt32LE(Math.round((x - x0) * 10), 4 + i * 8);
        b.writeInt32LE(Math.round((y - y0) * 10), 8 + i * 8);
      });
      parts.push(b);
      count++;
    }
    const head = Buffer.alloc(16);
    head.writeUInt32LE(0x524f4553, 0); // "SEOR"
    head.writeInt32LE(x0, 4);
    head.writeInt32LE(y0, 8);
    head.writeUInt32LE(count, 12);
    writeFileSync(join(out, 'roads.bin'), Buffer.concat([head, ...parts]));
    result.roads = count;
    result.credits.push(CREDITS[1]);
    console.log(`[seoul] roads: ${count.toLocaleString()} (motorways to tertiary)`);
  } else console.warn('[seoul] no roads (run again online to download them)');
  return result;
}
