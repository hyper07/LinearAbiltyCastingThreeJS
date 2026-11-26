import test from 'node:test';
import assert from 'node:assert/strict';
import { SMOKE, cloudShape, smokeAt, smokePuffs, puffAt, keepInStreet } from '../../src/city/smoke.js';
import { ITEMS, ITEM_ORDER, itemOdds, rollItem } from '../../src/city/items.js';

test('smoke: an item, more often for the leaders (dropped behind, it defends a lead); every place\'s odds still add up to 1', () => {
  assert.ok(ITEM_ORDER.includes('smoke') && ITEMS.smoke.name && ITEMS.smoke.text && ITEMS.smoke.ko && ITEMS.smoke.pop === 'SMOKE!');
  assert.ok(itemOdds(1, 4).smoke > itemOdds(4, 4).smoke * 1.5);
  for (const lean of [0, 0.5, 1]) {
    for (const rank of [1, 2, 3, 4]) {
      const o = itemOdds(rank, 4, lean);
      assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9, `odds add up (${rank}, ${lean})`);
      assert.ok(Object.values(o).every((p) => p > 0));
    }
  }
  let seed = 9;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let n = 0;
  for (let k = 0; k < 4000; k++) if (rollItem(1, 4, random) === 'smoke') n++;
  assert.ok(n > 450 && n < 750, `${n} smokes in 4000 rolls leading`);
});

test('smoke: billows out to about 10 m across and 3.5 m tall, lasts about 7 s, thinning slowly', () => {
  const early = cloudShape(0.3);
  const full = cloudShape(SMOKE.grow + 0.2);
  assert.ok(early.r < full.r, 'it grows');
  assert.ok(full.r * 2 >= 8 && full.r * 2 <= 12, `${(full.r * 2).toFixed(1)} m across`);
  assert.ok(full.h >= 3 && full.h <= 4, `${full.h.toFixed(1)} m tall`);
  assert.ok(SMOKE.life >= 6 && SMOKE.life <= 8);
  assert.ok(full.thick > 0.9, 'thick when full');
  // thinning: never thicker later on, and gone at the end
  let last = 1;
  for (let t = SMOKE.grow; t <= SMOKE.life; t += 0.25) {
    const k = cloudShape(t).thick;
    assert.ok(k <= last + 1e-9, `thinning at ${t}`);
    last = k;
  }
  assert.ok(cloudShape(SMOKE.life - 2).thick > 0.3, 'slowly: still there two seconds before the end');
  assert.equal(cloudShape(SMOKE.life + 0.01).thick, 0);
});

test('smoke: thick in the cloud\'s heart, nothing outside it or over its top', () => {
  const c = { x: 10, z: -20 };
  const t = 2.5;
  assert.ok(smokeAt(c, 10, -20, 1.3, t) > 0.8, 'in the heart');
  assert.ok(smokeAt(c, 12, -21, 2.5, t) > 0.7, 'a chase camera a couple of metres in');
  assert.equal(smokeAt(c, 10, -20 + 6, 1.3, t), 0, 'outside it');
  assert.equal(smokeAt(c, 10, -20, 6, t), 0, 'over its top');
  assert.ok(smokeAt(c, 10 + SMOKE.r * 0.85, -20, 1.3, t) < smokeAt(c, 10, -20, 1.3, t), 'thinner at the edge');
});

test('smoke: the same puffs for everyone from the same seed, a mound, inside the cloud', () => {
  const a = smokePuffs(1234);
  const b = smokePuffs(1234);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, smokePuffs(1235));
  const c = { x: 0, z: 0 };
  const at = a.map((p) => puffAt(c, p, 3)).filter(Boolean);
  assert.equal(at.length, a.length, 'all out by 3 s');
  const r = cloudShape(3).r;
  for (const q of at) {
    assert.ok(Math.hypot(q.x, q.z) < r, 'inside the cloud');
    assert.ok(q.up > 0.2 && q.up < cloudShape(3).h + 1, 'above the road, below its top');
  }
  // the high puffs heaped in the middle (a mound, not a box)
  const high = at.filter((q) => q.up > 2.4);
  const low = at.filter((q) => q.up < 1.6);
  const mean = (l) => l.reduce((s, q) => s + Math.hypot(q.x, q.z), 0) / l.length;
  assert.ok(high.length && low.length && mean(high) < mean(low));
});

test('smoke: kept in its street, never across the kerb', () => {
  const street = [[0, 30], [0, 10], [0, -10], [0, -30]];
  const cloud = { pts: street, lo: -3, hi: 3 };
  const p = keepInStreet(cloud, 9, 0, 0.5);
  assert.ok(Math.abs(p.x) <= 2.5 + 1e-9, `kept at x ${p.x}`);
  const q = keepInStreet(cloud, 1, 0, 0.5);
  assert.equal(q.x, 1);
});
