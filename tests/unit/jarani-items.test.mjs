import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_ORDER, rollItem, itemOdds } from '../../src/city/items.js';
import { THROW, throwPlan, flightAt } from '../../src/city/branch.js';
import { RING, DOME } from '../../src/city/bell.js';
import { speedFeel } from '../../src/city/speedfx.js';
import { cornerZones } from '../../src/city/golmok.js';

test('items: the branch is one of them, and riders further back get more branches (and tailwinds)', () => {
  assert.ok(ITEM_ORDER.includes('branch') && ITEMS.branch.name && ITEMS.branch.text);
  const first = itemOdds(1, 4);
  const last = itemOdds(4, 4);
  assert.ok(last.branch > first.branch && last.tailwind > first.tailwind);
  for (const o of [first, last, itemOdds(2, 4)]) assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'odds add up');
  let seed = 3;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = { first: 0, last: 0 };
  for (let k = 0; k < 4000; k++) {
    if (rollItem(1, 4, random) === 'branch') n.first++;
    if (rollItem(4, 4, random) === 'branch') n.last++;
  }
  assert.ok(n.last > n.first * 2, `last ${n.last} vs first ${n.first}`);
});

test('branch: thrown where the rider ahead will be, up in an arc and down on the road', () => {
  const from = { x: 0, y: 1.7, z: 0 };
  const target = { x: 0, z: -30 };
  // they ride on north at 19 m/s: the branch leads them
  const p = throwPlan(from, target, { x: 0, z: -19 });
  assert.ok(p.T >= THROW.min && p.T <= THROW.max);
  assert.ok(p.tz < -30 - 19 * p.T * 0.9, `led to ${p.tz.toFixed(1)}`);
  const a = flightAt(p, 0);
  const mid = flightAt(p, p.T / 2);
  const end = flightAt(p, p.T);
  assert.ok(Math.abs(a.y - 1.7) < 1e-9 && a.x === 0 && a.z === 0, 'from the hand');
  assert.ok(mid.y > 1.7, 'up in an arc');
  assert.ok(Math.abs(end.y) < 1e-9 && Math.abs(end.z - p.tz) < 1e-9, 'down where it was aimed');
  assert.ok(end.spin > Math.PI * 2, 'turning end over end');
  // a standing target: no lead
  const q = throwPlan(from, target);
  assert.equal(q.tz, -30);
});

test('bell: a two-strike ring-ring of inharmonic partials that die away fast', () => {
  assert.equal(RING.rings.length, 2);
  assert.ok(RING.rings[1] - RING.rings[0] > 0.15 && RING.rings[1] - RING.rings[0] < 0.5);
  assert.ok(RING.base > 1800 && RING.base < 4500, 'a bright little bell');
  // not a chord of whole-number harmonics: a bell's partials are inharmonic, the highest dying first
  assert.ok(DOME.some(([r]) => Math.abs(r - Math.round(r)) > 0.2));
  for (let i = 1; i < DOME.length; i++) assert.ok(DOME[i][2] <= DOME[i - 1][2]);
});

test('speed feel: nothing at city pace, full at 70 km/h, a little more on a boost', () => {
  assert.equal(speedFeel(25 / 3.6), 0);
  assert.ok(Math.abs(speedFeel(70 / 3.6) - 1) < 0.02);
  assert.ok(speedFeel(85 / 3.6) > 1);
});

test('alley props: none in the 40 m before a corner, nor just after it', () => {
  // a straight north, a right-angle turn east at point 30, a straight on
  const pts = [];
  for (let i = 0; i <= 30; i++) pts.push([0, -i * 6, 4, 6]);
  for (let i = 1; i <= 30; i++) pts.push([i * 6, -180, 4, 6]);
  const calm = cornerZones(pts);
  for (let i = 24; i <= 31; i++) assert.equal(calm[i], 1, `clear at ${i}`);
  assert.equal(calm[10], 0);
  assert.equal(calm[50], 0);
});
