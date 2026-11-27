import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laneBand, laneShares, gridSlots, behindStart, lateralOf, bikeContact, resolveBump, BIKE_RADIUS } from '../../games/g_cv2yrhrpv2/pack.js';

const rider = (x, z, heading = 0, v = 0) => ({ x, z, heading, travel: heading, v });

test('pack: riders that overlap are pushed apart, never left inside each other', () => {
  // side by side, half overlapping
  const a = rider(0, 0, 0, 6);
  const b = rider(0.3, 0, 0, 6);
  const hit = bikeContact(a, b);
  assert.ok(hit && hit.depth > 0.2, 'they touch');
  resolveBump(a, b, hit);
  const after = bikeContact(a, b);
  assert.ok(!after || after.depth < 1e-6, 'apart after one push');
  assert.ok(b.x - a.x >= BIKE_RADIUS * 2 - 1e-6);
  // nose to tail: the one behind loses what it ran in with, the one ahead is nudged
  const c = rider(0, 0, 0, 8);
  const d = rider(0, -0.9, 0, 4);
  const h2 = bikeContact(c, d);
  assert.ok(h2, 'nose touches tail');
  const k = resolveBump(c, d, h2);
  assert.ok(k > 2, `a knock of ${k.toFixed(1)} m/s`);
  assert.ok(c.v < 8 && d.v > 4, 'behind slowed, ahead nudged on');
  // exactly on top of each other: still separated
  const e = rider(5, 5);
  const f = rider(5, 5);
  resolveBump(e, f, bikeContact(e, f));
  assert.ok(Math.hypot(e.x - f.x, e.z - f.z) > 0.5);
  // far apart: nothing
  assert.equal(bikeContact(rider(0, 0), rider(3, 0)), null);
});

test('pack: only the riders this browser rides are moved', () => {
  const a = rider(0, 0, 0, 6);
  const b = rider(0.3, 0, 0, 6);
  resolveBump(a, b, bikeContact(a, b), [true, false]);
  assert.equal(b.x, 0.3);
  assert.ok(a.x < -0.2, 'a took the whole push');
});

test('pack: a side knock turns each a little away from the other (a wobble, not a spin)', () => {
  const a = rider(0, 0, 0, 7);
  const b = rider(0.5, 0, -0.5, 7);
  const before = [a.heading, b.heading];
  resolveBump(a, b, bikeContact(a, b));
  assert.ok(Math.abs(a.heading - before[0]) <= 0.12 + 1e-9 && Math.abs(b.heading - before[1]) <= 0.12 + 1e-9);
});

test('pack: lanes — on a road the right-hand half clear of the kerb and the centre line; an alley all across', () => {
  const road = laneBand(12, false);
  assert.ok(road.lo > 0.3, 'right of the centre line');
  assert.ok(road.hi <= 12 / 2 - 0.8, 'clear of the kerb');
  const pass = laneBand(12, false, true);
  assert.ok(pass.lo < road.lo, 'overtaking widens toward the middle');
  const alley = laneBand(4, true);
  assert.ok(alley.lo < 0 && alley.hi > 0 && alley.hi <= 4 / 2 - 0.7, 'an alley: either side, off the walls');
  // one carriageway of a one-way road (ridden with its traffic): all of it is yours, off the median and the kerb
  const one = laneBand(7.5, false, false, true);
  assert.ok(one.lo < -2 && one.hi > 2 && one.hi <= 7.5 / 2 - 0.9 && one.lo >= -7.5 / 2 + 0.9);
  const shares = laneShares(4);
  assert.equal(shares.length, 4);
  assert.equal(new Set(shares.map((x) => x.toFixed(3))).size, 4, 'each rider its own line');
  assert.ok(shares.every((x) => x > 0 && x < 1));
});

test('pack: a staggered grid — two across, each half a row behind the one beside it', () => {
  const g = gridSlots(4);
  assert.deepEqual(g.map((s) => s.col), [0, 1, 0, 1]);
  for (let i = 1; i < g.length; i++) assert.ok(g[i].back > g[i - 1].back, 'each further back');
  assert.ok(g[1].back - g[0].back >= 1.2, 'staggered, not side by side');
  // behind the line of a straight course running north
  const pts = [];
  // a loop: up the west side (north, −z) from the start, round and back down the east
  for (let k = 0; k < 40; k++) pts.push([0, -k * 6, 10, 3]);
  for (let k = 0; k <= 43; k++) pts.push([30, -234 + k * 6, 10, 3]);
  for (let k = 1; k <= 5; k++) pts.push([30 - k * 6, 24, 10, 3]);
  const course = { points: pts };
  const at = behindStart(course, 9);
  assert.ok(at.z > 0, 'behind the start (south of it)');
  assert.ok(Math.abs(at.heading) < 1e-6, 'facing up the course');
  assert.ok(Math.abs(lateralOf(1.5, 0, pts[0], pts[1]) - 1.5) < 1e-9, 'lateral is metres to the right');
  assert.ok(Math.abs(lateralOf(-2, 0, pts[0], pts[1]) + 2) < 1e-9);
});
