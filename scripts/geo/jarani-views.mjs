/**
 * Kickrani's landmarks from the race camera, measured on the real map (data/geo/seoul): each course
 * planned as the game plans it, ridden point by point (every 8 m) with the chase camera as race.js
 * places it (CHASE: behind and above the rider, its pitch, the FOV at racing speed, a 16:9 screen, and
 * its look up toward a tall landmark ahead on a straight — skyline.js landmarkLookUp), and for every
 * skyline landmark (skyline.js SKYLINE, within its `range`) whether any of eight points up it is on
 * the screen with nothing in the way: a building of the register (its real height, on the ground,
 * only within the draw distance — `--reach`, 1300 m like the Medium view), the land itself (within
 * the draw distance, and the hills skyline.js draws under its landmarks further out). Prints the share
 * of the course (or of its run from line to line) each landmark is in view, and after the slash the
 * share it is in the frame at all (hidden or not).
 *
 *   node scripts/geo/jarani-views.mjs                 # every course
 *   node scripts/geo/jarani-views.mjs bukak namsan    # a few
 *   node scripts/geo/jarani-views.mjs --look 0        # without the look up
 *   JARANI_TRY='{"id":"x",…}' node scripts/geo/jarani-views.mjs x   (or JARANI_TRY=defs.json)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BIKE_COURSES, planCourse, finishCourse } from '../../src/city/course.js';
import { SKYLINE, landmarkParts, landmarkLookUp, courseBend, LOOK_BEND } from '../../src/city/skyline.js';
import { CHASE } from '../../src/city/race.js';
import { decodeTile, tileKey, tileOf, TILE } from '../../src/city/tiles.js';
import { seoulData, roadsNear, wallsNear, seoulTerrain, ORIGIN } from '../../tests/unit/seoulData.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data/geo/seoul/tiles');

/** The register's buildings round a place, in a 50 m grid: footprint, bounds, top (on the ground). */
function buildingsNear(cx, cz, reach, ground) {
  const cells = new Map();
  const [tx0, ty0] = tileOf(cx - reach + ORIGIN.x, -(cz + reach) + ORIGIN.y);
  const [tx1, ty1] = tileOf(cx + reach + ORIGIN.x, -(cz - reach) + ORIGIN.y);
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const f = join(DIR, `${tileKey(tx, ty)}.bin`);
      if (!existsSync(f)) continue;
      const b = readFileSync(f);
      const t = decodeTile(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
      const ox = tx * TILE - ORIGIN.x;
      const oz = -(ty * TILE - ORIGIN.y);
      for (const bd of t.buildings) {
        const n = bd.ring.length / 2;
        const xs = new Float64Array(n);
        const zs = new Float64Array(n);
        let minx = Infinity;
        let maxx = -Infinity;
        let minz = Infinity;
        let maxz = -Infinity;
        for (let i = 0; i < n; i++) {
          xs[i] = ox + bd.ring[i * 2];
          zs[i] = oz - bd.ring[i * 2 + 1];
          minx = Math.min(minx, xs[i]);
          maxx = Math.max(maxx, xs[i]);
          minz = Math.min(minz, zs[i]);
          maxz = Math.max(maxz, zs[i]);
        }
        const o = { xs, zs, minx, maxx, minz, maxz, top: ground((minx + maxx) / 2, (minz + maxz) / 2) + bd.height, skip: SKYLINE.some((l) => l.skip && l.skip === bd.name) };
        for (let i = Math.floor(minx / 50); i <= Math.floor(maxx / 50); i++) {
          for (let j = Math.floor(minz / 50); j <= Math.floor(maxz / 50); j++) {
            const k = `${i}|${j}`;
            if (!cells.has(k)) cells.set(k, []);
            cells.get(k).push(o);
          }
        }
      }
    }
  }
  return cells;
}

const inside = (o, x, z) => {
  let c = false;
  for (let i = 0, j = o.xs.length - 1; i < o.xs.length; j = i++) if ((o.zs[i] > z) !== (o.zs[j] > z) && x < ((o.xs[j] - o.xs[i]) * (z - o.zs[i])) / (o.zs[j] - o.zs[i]) + o.xs[i]) c = !c;
  return c;
};

/** Whether the straight line from a to b (x, y, z) is clear of buildings and land within the draw distance. */
function clear(cells, a, b, ground, reach, land) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const L = Math.hypot(dx, dz);
  let s = 1.5;
  while (s < L - 25) {
    const k = s / L;
    const x = a[0] + dx * k;
    const y = a[1] + dy * k;
    const z = a[2] + dz * k;
    if ((s < reach || land(x, z)) && ground(x, z) > y) return false;
    if (s < reach) {
      for (const o of cells.get(`${Math.floor(x / 50)}|${Math.floor(z / 50)}`) ?? []) {
        if (o.skip || y > o.top || x < o.minx || x > o.maxx || z < o.minz || z > o.maxz) continue;
        if (inside(o, x, z)) return false;
      }
    }
    s += s < 200 ? 1.5 : s < reach ? 4 : 25;
  }
  return true;
}

/**
 * The share of a planned course (`c`, finished) that each landmark within reach is in view from the race
 * camera: { [id]: { seen, framed } }, shares 0…1.
 */
export function landmarkViews(def, c, { ground, reach = 1300, look = true, fov = 66, every = 8 } = {}) {
  const near = SKYLINE.filter((l) => Math.hypot(l.x - def.x, l.z - def.z) < (l.range ?? 12000) + def.r);
  const out = {};
  if (!near.length) return out;
  const cells = buildingsNear(def.x, def.z, Math.min(reach, 2000) + def.r, ground);
  const pts = c.points;
  const n = pts.length;
  const i0 = c.open ? c.startI : 0;
  const i1 = c.open ? c.finishI : n;
  const seen = new Map(near.map((l) => [l.id, 0]));
  const framed = new Map(near.map((l) => [l.id, 0]));
  let total = 0;
  let carry = 0;
  const tanV = Math.tan(((fov / 2) * Math.PI) / 180);
  const tanH = tanV * (16 / 9);
  for (let i = i0; i < i1; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    carry += Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (carry < every) continue;
    carry = 0;
    total++;
    const f = pts[(i + 3) % n];
    const hd = Math.atan2(-(f[0] - p[0]), -(f[1] - p[1]));
    const fx = -Math.sin(hd);
    const fz = -Math.cos(hd);
    const y0 = ground(p[0], p[1]);
    const dist = CHASE.zoom + 1.2;
    const focus = [p[0] + fx * CHASE.ahead, y0 + CHASE.height, p[1] + fz * CHASE.ahead];
    const cam = [focus[0] - fx * Math.cos(CHASE.pitch) * dist, focus[1] - Math.sin(CHASE.pitch) * dist, focus[2] - fz * Math.cos(CHASE.pitch) * dist];
    // (the look up, on a straight, as race.js does it)
    const tilt = look && courseBend(pts, i, 50, c.open) < LOOK_BEND ? landmarkLookUp({ x: cam[0], y: cam[1], z: cam[2] }, hd, { pitch: CHASE.pitch, vfov: fov, groundAt: ground }) : 0;
    const pitch = CHASE.pitch + tilt;
    // the camera's axes: forward (pitched), right, up
    const F = [fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch)];
    const R = [-fz, 0, fx];
    const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    for (const l of near) {
      const d = Math.hypot(l.x - cam[0], l.z - cam[2]);
      if (d > (l.range ?? 12000)) continue;
      let inFrame = false;
      for (const pt of landmarkParts(l, ground)) {
        const v = [pt[0] - cam[0], pt[1] - cam[1], pt[2] - cam[2]];
        const zc = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
        if (zc <= 0) continue;
        const xc = v[0] * R[0] + v[1] * R[1] + v[2] * R[2];
        const yc = v[0] * U[0] + v[1] * U[1] + v[2] * U[2];
        if (Math.abs(xc / zc) > tanH * 0.96 || Math.abs(yc / zc) > tanV * 0.96) continue;
        inFrame = true;
        if (!clear(cells, cam, pt, ground, reach, (x, z) => l.hill && Math.hypot(x - l.hill.x, z - l.hill.z) < l.hill.r)) continue;
        seen.set(l.id, seen.get(l.id) + 1);
        break;
      }
      if (inFrame) framed.set(l.id, framed.get(l.id) + 1);
    }
  }
  for (const l of near) out[l.id] = { seen: seen.get(l.id) / Math.max(1, total), framed: framed.get(l.id) / Math.max(1, total) };
  return out;
}

async function main() {
  const data = seoulData();
  if (!data) {
    console.error('No Seoul map converted here (npm run geo:seoul).');
    process.exit(1);
  }
  const ground = seoulTerrain();
  const args = process.argv.slice(2);
  const opt = (k, d) => {
    const i = args.indexOf(k);
    return i >= 0 ? Number(args[i + 1]) : d;
  };
  const only = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const tries = process.env.JARANI_TRY;
  const defs = [...BIKE_COURSES, ...(tries ? [].concat(JSON.parse(/^\s*[[{]/.test(tries) ? tries : readFileSync(tries, 'utf8'))) : [])];
  const rows = [];
  for (const def of defs) {
    if (only.length && !only.includes(def.id)) continue;
    const reach = def.r * 4;
    const walls = wallsNear(def.x, def.z, reach);
    const planned = planCourse(roadsNear(data.all, def, reach), def, { bike: true, walls });
    if (!planned) continue;
    const c = finishCourse(planned, { walls });
    const v = landmarkViews(def, c, { ground, reach: opt('--reach', 1300), look: opt('--look', 1) !== 0, fov: opt('--fov', 66) });
    if (!Object.keys(v).length) continue;
    const row = { id: def.id, km: +(c.length / 1000).toFixed(2) };
    for (const [id, s] of Object.entries(v)) row[id] = `${Math.round(s.seen * 100)}% / ${Math.round(s.framed * 100)}%`;
    rows.push(row);
  }
  console.table(rows);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
