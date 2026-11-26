import test from 'node:test';
import assert from 'node:assert/strict';
import { MARBLE, pourMarbles, stepMarble, corridorClamp, pourBand, marbleFall, marblesAt, patchBounds, seeded } from '../../src/city/marbles.js';
import { ITEMS, ITEM_ORDER, itemOdds } from '../../src/city/items.js';
import { DRINK } from '../../src/city/race.js';
import { levelFor, levelShows, fitView, ZOOM, COURSE_COLORS, LANDMARKS } from '../../src/city/coursemap.js';
import { BIKE_COURSES } from '../../src/city/course.js';

/** A straight street running north (−z) along x = 0, 60 m of it. */
const street = [[0, 30], [0, 10], [0, -10], [0, -30]];

/** Pour and let them roll and settle (fixed steps, as the race does). */
function settle(plan, lo, hi, seconds = MARBLE.pour + 5) {
  const ms = pourMarbles(plan);
  const keep = (x, z) => corridorClamp(street, x, z, lo, hi);
  for (let t = 0; t < seconds; t += 1 / 60) for (const m of ms) stepMarble(m, 1 / 60, keep);
  return ms;
}

test('marbles: an item, more often for the leaders (poured behind, they defend a lead)', () => {
  assert.ok(ITEM_ORDER.includes('marbles') && ITEMS.marbles.name && ITEMS.marbles.text);
  assert.ok(itemOdds(1, 4).marbles > itemOdds(4, 4).marbles * 1.3);
  for (const o of [itemOdds(1, 4), itemOdds(3, 4), itemOdds(4, 4)]) assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('marbles: a pour is the same for everyone from the same seed', () => {
  const a = settle({ x: 0, z: 0, heading: 0, v: 19, seed: 42 }, -3, 3);
  const b = settle({ x: 0, z: 0, heading: 0, v: 19, seed: 42 }, -3, 3);
  assert.deepEqual(a.map((m) => [m.x, m.z]), b.map((m) => [m.x, m.z]));
  const c = settle({ x: 0, z: 0, heading: 0, v: 19, seed: 43 }, -3, 3);
  assert.notDeepEqual(a.map((m) => m.x), c.map((m) => m.x));
  assert.ok(seeded(1)() !== seeded(2)());
});

test('marbles: poured behind a rider at speed they lie in a patch on the road, a few metres long, settled', () => {
  const ms = settle({ x: 0, z: 0, heading: 0, v: 19, seed: 7 }, -4, 4);
  assert.equal(ms.length, MARBLE.count);
  assert.ok(ms.every((m) => m.live && m.y === 0 && Math.hypot(m.vx, m.vz) < 0.05), 'all down and still');
  const b = patchBounds({ x: 0, z: 0, marbles: ms });
  assert.ok(b.r > 1.5 && b.r < 12, `patch radius ${b.r.toFixed(1)}`);
  // laid along the way the rider went (north, −z), not left in a heap where it was used
  assert.ok(Math.min(...ms.map((m) => m.z)) < -3);
});

test('marbles: never off the street, never past its ends', () => {
  const ms = settle({ x: 1, z: 0, heading: 0, v: 22, seed: 11 }, -2.5, 2.5);
  for (const m of ms) {
    assert.ok(m.x >= -2.5 - 1e-6 && m.x <= 2.5 + 1e-6, `across: ${m.x}`);
    assert.ok(m.z <= 30 + 1e-6 && m.z >= -30 - 1e-6, `along: ${m.z}`);
  }
});

test('marbles: a narrow golmok keeps half its width clear, so a short cut is never shut', () => {
  const right = pourBand(3.4, 0.5);
  assert.ok(right.lo >= 0.2 && right.hi <= 1.7, JSON.stringify(right));
  const left = pourBand(3.4, -0.4);
  assert.ok(left.hi <= -0.2 && left.lo >= -1.7, JSON.stringify(left));
  // the walls' room is respected too
  const tight = pourBand(10, 0, [1.2, 6]);
  assert.ok(tight.lo >= -0.9 - 1e-9 && tight.lo < -0.85);
  // a wide road: across most of it
  const wide = pourBand(14, 0);
  assert.ok(wide.lo < -6 && wide.hi > 6);
  // and settled marbles keep to the half they were poured in
  const ms = settle({ x: 0.8, z: 0, heading: 0, v: 14, seed: 5 }, right.lo, right.hi);
  assert.ok(ms.every((m) => m.x >= right.lo - 1e-6), 'the left half of the lane is clear');
});

test('marbles: too fast, or steering hard at speed, is a fall; slow and straight gets through', () => {
  assert.equal(marbleFall(19.4, 0, 0), true, 'flat out at 70 km/h');
  assert.equal(marbleFall(MARBLE.fallV + 0.5, 0, 0), true);
  assert.equal(marbleFall(11, 0.9, 0), true, 'steering hard at 40 km/h');
  assert.equal(marbleFall(11, 0, 0.55, 0.6), true, 'leaning hard at 40 km/h');
  assert.equal(marbleFall(11, 0.1, 0.05), false, 'straight at 40 km/h');
  assert.equal(marbleFall(7, 1, 0.6), false, 'slow, even steering');
});

test('marbles: found under a wheel only where they lie', () => {
  const ms = settle({ x: 0, z: 0, heading: 0, v: 19, seed: 9 }, -3, 3);
  const patch = { x: 0, z: 0, r: 20, marbles: ms };
  const m = ms[10];
  assert.ok(marblesAt(patch, m.x, m.z) >= 1);
  assert.equal(marblesAt(patch, 30, 30), 0);
});

test('drink: the only boost — an instant three to four seconds of it, useful, not a win button', () => {
  assert.ok(DRINK.boost >= 3 && DRINK.boost <= 4);
  assert.ok(DRINK.extra < 1.5, 'a little over boost speed at most');
  assert.equal(DRINK.fill, undefined, 'no gauge to fill');
});

test('course map: zoom levels, what each shows, fitting a box, every course coloured', () => {
  assert.equal(levelFor(1 / 64), 0);
  assert.ok(levelFor(2) >= 7);
  assert.equal(levelFor(1000), 8);
  assert.ok(levelShows(0).cls <= 1 && !levelShows(0).buildings && !levelShows(0).small);
  assert.ok(levelShows(7).buildings && levelShows(7).small && levelShows(7).cls === 4);
  const v = fitView(0, 0, 2000, 1000, 800, 500, 0);
  assert.ok(Math.abs(v.cx - 1000) < 1e-9 && Math.abs(v.cz - 500) < 1e-9 && Math.abs(v.s - 0.4) < 1e-9);
  assert.ok(fitView(0, 0, 1e7, 1e7, 800, 500).s === ZOOM.min);
  for (const c of BIKE_COURSES) assert.match(COURSE_COLORS[c.id], /^#[0-9a-f]{6}$/i);
  assert.ok(['N Seoul Tower', 'Gyeongbokgung', 'Jamsil Sky Tower', '63 Building'].every((n) => LANDMARKS.some((l) => l.name === n && l.big)));
});
