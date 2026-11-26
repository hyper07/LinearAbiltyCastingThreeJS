import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_ORDER, rollItem, itemOdds } from '../../src/city/items.js';
import { THROW, throwPlan, flightAt, branchTarget } from '../../src/city/branch.js';
import { RING, DOME } from '../../src/city/bell.js';
import { speedFeel } from '../../src/city/speedfx.js';
import { cornerZones } from '../../src/city/golmok.js';
import { policeTarget, POLICE } from '../../src/city/police.js';

test('items: the branch is one of them, and riders further back get more branches; no tailwind — the drink is the only boost', () => {
  assert.ok(ITEM_ORDER.includes('branch') && ITEMS.branch.name && ITEMS.branch.text);
  assert.ok(!ITEM_ORDER.includes('tailwind') && !ITEMS.tailwind, 'no tailwind');
  const first = itemOdds(1, 4);
  const last = itemOdds(4, 4);
  assert.ok(last.branch > first.branch);
  // boosts aren't rare: the drink is about a third of the boxes or more, all the way down the field
  for (const o of [first, itemOdds(2, 4), itemOdds(3, 4), last, itemOdds(4, 4, 1)]) assert.ok(o.drink >= 0.3, `drink ${o.drink}`);
  for (const o of [first, last, itemOdds(2, 4), itemOdds(4, 4, 1)]) assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'odds add up');
  let seed = 3;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = { first: 0, last: 0 };
  for (let k = 0; k < 4000; k++) {
    if (rollItem(1, 4, random) === 'branch') n.first++;
    if (rollItem(4, 4, random) === 'branch') n.last++;
  }
  // (about twice as many: the odds say 2×, a sample of 4000 wanders a little either side)
  assert.ok(n.last > n.first * 1.7, `last ${n.last} vs first ${n.first}`);
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

test('branch: only the rider right ahead — nobody behind, wasted when you lead or the next is out of reach', () => {
  const me = { id: 'me', dist: 400 };
  const behind = { id: 'b', dist: 396 };
  const ahead = { id: 'a', dist: 430 };
  const further = { id: 'f', dist: 470 };
  // the nearest ahead by race distance, whatever order they come in
  assert.equal(branchTarget(me, [further, behind, me, ahead]), ahead);
  // in 1st: nobody (it is wasted) — never the rider right behind
  assert.equal(branchTarget(me, [me, behind, { id: 'c', dist: 100 }]), null);
  // the next one ahead too far on: wasted, not thrown at anyone else
  assert.equal(branchTarget(me, [me, behind, { id: 'far', dist: 400 + THROW.reach + 1 }]), null);
  assert.ok(THROW.reach >= 100 && THROW.reach <= 200);
  // finished or gone don't count; level with you isn't ahead
  assert.equal(branchTarget(me, [me, { id: 'x', dist: 410, done: 99 }, { id: 'y', dist: 405, left: true }, { id: 'z', dist: 400 }, further]), further);
  // a rider down a short cut alongside counts by their race distance
  assert.equal(branchTarget(me, [me, { id: 'sc', dist: 402, sc: 1 }, ahead]).id, 'sc');
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

test('items: no air horn any more; calling the police is one, more common further back', () => {
  assert.ok(!ITEM_ORDER.includes('horn') && !ITEMS.horn);
  assert.ok(ITEM_ORDER.includes('police') && /police/i.test(ITEMS.police.name) && ITEMS.police.ko === '경찰 호출');
  assert.ok(itemOdds(4, 4).police > itemOdds(1, 4).police * 2);
});

test('police: the nearest rider ahead; leading, the nearest behind; never one home or gone', () => {
  const me = { id: 'me', dist: 500 };
  const riders = [me, { id: 'far', dist: 900 }, { id: 'near', dist: 560 }, { id: 'back', dist: 420 }, { id: 'home', dist: 520, done: 80 }, { id: 'gone', dist: 510, left: true }];
  assert.equal(policeTarget(me, riders).id, 'near');
  const lead = { id: 'lead', dist: 1000 };
  assert.equal(policeTarget(lead, [lead, ...riders.slice(1)]).id, 'far');
  assert.equal(policeTarget(me, [me]), null);
  assert.equal(POLICE.hold, 5, 'stopped for five seconds');
  assert.ok(POLICE.arrive < 1 && POLICE.leave < 2, 'up beside them quickly, gone soon after');
  assert.match(ITEMS.police.text, /five seconds/);
});
