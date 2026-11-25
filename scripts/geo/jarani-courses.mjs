/**
 * Gangnam Jarani's courses, measured on the real map (data/geo/seoul): each
 * course planned as the game plans it (course.js), then its length, how much
 * of the main loop runs on roads with two or more lanes each way, its turns
 * sharper than 60°, the longest straight, the run to the first corner and its
 * short cuts.
 *
 *   node scripts/geo/jarani-courses.mjs            # every course
 *   node scripts/geo/jarani-courses.mjs seongsu    # one
 */
import { BIKE_COURSES, planCourse, finishCourse, courseStats } from '../../src/city/course.js';
import { seoulData, roadsNear, wallsNear } from '../../tests/unit/seoulData.mjs';

const data = seoulData();
if (!data) {
  console.error('No Seoul map converted here (npm run geo:seoul).');
  process.exit(1);
}
const only = process.argv.slice(2);
const rows = [];
for (const def of BIKE_COURSES) {
  if (only.length && !only.includes(def.id)) continue;
  const t0 = Date.now();
  const reach = def.r * 4;
  const walls = wallsNear(def.x, def.z, reach);
  let planned = planCourse(roadsNear(data.all, def, reach), def, { bike: true, walls });
  if (!planned) planned = planCourse(roadsNear(data.all, def, def.r * 8), { ...def, r: def.r * 1.8 }, { bike: true, target: 2600, walls });
  if (!planned) {
    rows.push({ id: def.id, note: 'not planned' });
    continue;
  }
  const c = finishCourse(planned, { walls });
  const st = courseStats(c);
  rows.push({ id: def.id, km: +(c.length / 1000).toFixed(2), wide: `${Math.round(st.wide * 100)}%`, small: `${Math.round(st.small * 100)}%`, 'turns>60': st.sharp, 'turns>80': st.square, straight: Math.round(st.longest), first: Math.round(st.firstCorner), shortcuts: c.shortcuts.length, ms: Date.now() - t0 });
}
console.table(rows);
