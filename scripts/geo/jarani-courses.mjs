/**
 * Kickrani's courses, measured on the real map (data/geo/seoul): each
 * course planned as the game plans it (course.js), then its level, length,
 * how much of it runs on roads with two or more lanes each way, on small
 * streets, on local streets (course.js isLocal), its turns sharper than 60° and 80°, how often a corner
 * turns the other way from the one before (L/R: the zig-zag), the longest straight, the run
 * to the first corner, its short cuts, and its hills (metres climbed and
 * dropped over a lap, and the steepest 30 m). A point-to-point course is
 * measured from its start line to its finish.
 *
 *   node scripts/geo/jarani-courses.mjs              # every course
 *   node scripts/geo/jarani-courses.mjs euljiro      # one (or a few)
 *   node scripts/geo/jarani-courses.mjs --level hard # one level
 *   JARANI_TRY='{"id":"x","x":0,"z":0,"r":350,"level":"hard"}' node scripts/geo/jarani-courses.mjs x
 */
import { readFileSync } from 'node:fs';
import { BIKE_COURSES, planCourse, finishCourse, courseStats } from '../../games/g_cv2yrhrpv2/course.js';
import { seoulData, roadsNear, wallsNear, seoulTerrain } from '../../tests/unit/seoulData.mjs';

const data = seoulData();
if (!data) {
  console.error('No Seoul map converted here (npm run geo:seoul).');
  process.exit(1);
}
const ground = seoulTerrain();
const args = process.argv.slice(2);
const li = args.indexOf('--level');
const level = li >= 0 ? args[li + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && (li < 0 || i !== li + 1));
const defs = [...BIKE_COURSES, ...(process.env.JARANI_TRY ? [].concat(JSON.parse(/^\s*[[{]/.test(process.env.JARANI_TRY) ? process.env.JARANI_TRY : readFileSync(process.env.JARANI_TRY, 'utf8'))) : [])];

/** Up and down over the course (from start line to finish line, or a lap): climbed, dropped, the steepest 30 m (%). */
export function hills(c, at) {
  if (!at) return null;
  const i0 = c.open ? c.startI : 0;
  const i1 = c.open ? c.finishI : c.points.length;
  const h = [];
  for (let i = i0; i <= i1; i++) {
    const p = c.points[i % c.points.length];
    h.push(at(p[0], p[1]));
  }
  // (smoothed over a few points: the land's grid is 25 m)
  const sm = h.map((_, i) => {
    let t = 0;
    let n = 0;
    for (let k = -2; k <= 2; k++) if (h[i + k] != null) (t += h[i + k]), n++;
    return t / n;
  });
  let up = 0;
  let down = 0;
  let steep = 0;
  for (let i = 1; i < sm.length; i++) {
    const d = sm[i] - sm[i - 1];
    if (d > 0) up += d;
    else down -= d;
    if (i >= 5) steep = Math.max(steep, Math.abs(sm[i] - sm[i - 5]) / 30);
  }
  return { up: Math.round(up), down: Math.round(down), steep: Math.round(steep * 100), top: Math.round(Math.max(...sm)), bottom: Math.round(Math.min(...sm)) };
}

const rows = [];
for (const def of defs) {
  if (only.length && !only.includes(def.id)) continue;
  if (level && (def.level ?? 'easy') !== level) continue;
  const t0 = Date.now();
  const reach = def.r * 4;
  const walls = wallsNear(def.x, def.z, reach);
  const why = [];
  let planned = planCourse(roadsNear(data.all, def, reach), def, { bike: true, walls, why });
  if (!planned && !def.via) planned = planCourse(roadsNear(data.all, def, def.r * 8), { ...def, r: def.r * 1.8 }, { bike: true, target: 2600, walls });
  if (!planned) {
    rows.push({ id: def.id, level: def.level ?? 'easy', note: `not planned: ${[...new Set(why)].slice(0, 4).join(', ')}` });
    continue;
  }
  const c = finishCourse(planned, { walls });
  const st = courseStats(c);
  const hl = hills(c, ground);
  rows.push({ id: def.id, level: def.level ?? 'easy', km: +(c.length / 1000).toFixed(2), wide: `${Math.round(st.wide * 100)}%`, small: `${Math.round(st.small * 100)}%`, local: `${Math.round(st.local * 100)}%`, 'turns>60': st.sharp, 'turns>80': st.square, 'L/R': st.switches, straight: Math.round(st.longest), first: Math.round(st.firstCorner), shortcuts: c.shortcuts.length, up: hl?.up, down: hl?.down, 'steep%': hl?.steep, ends: c.open ? 'A→B' : 'loop', ms: Date.now() - t0 });
}
console.table(rows);
