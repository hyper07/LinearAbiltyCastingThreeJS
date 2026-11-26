import test from 'node:test';
import assert from 'node:assert/strict';
import { OIL, planSlick, oilAt, onSlick, slickGrow, spinAngle, spinSpeed } from '../../src/city/oil.js';
import { ITEMS, ITEM_ORDER, itemOdds } from '../../src/city/items.js';

/** A straight street running north (−z) along x = 0. */
const street = [[0, 30], [0, 10], [0, -10], [0, -30]];

/** The slick's extent (sampled): across (x) and along (z), and its area. */
function extent(s) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let area = 0;
  for (let x = s.x0; x <= s.x1; x += 0.05) {
    for (let z = s.z0; z <= s.z1; z += 0.05) {
      if (!onSlick(s, x, z)) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
      area += 0.0025;
    }
  }
  return { across: x1 - x0, along: z1 - z0, z0, z1, area };
}

test('oil: an item, more often for the leaders (spilled behind, it defends a lead); every place\'s odds add up to 1', () => {
  assert.ok(ITEM_ORDER.includes('oil') && ITEMS.oil.name && ITEMS.oil.text && ITEMS.oil.pop === 'OIL!');
  assert.ok(itemOdds(1, 4).oil > itemOdds(4, 4).oil * 1.5);
  for (const lean of [0, 0.5, 1]) {
    for (const o of [itemOdds(1, 4, lean), itemOdds(2, 4, lean), itemOdds(3, 4, lean), itemOdds(4, 4, lean), itemOdds(1, 1, lean)]) {
      assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9, JSON.stringify(o));
      assert.ok(Object.values(o).every((p) => p >= 0));
    }
  }
});

test('oil: a slick about 3–4 m across and 4–5 m along, behind the rider, irregular — not a box', () => {
  for (const seed of [1, 7, 42, 99, 1234]) {
    const s = planSlick({ x: 0, z: 0, heading: 0, seed });
    const e = extent(s);
    assert.ok(e.across > 2.6 && e.across < 4.4, `across ${e.across.toFixed(2)} (seed ${seed})`);
    assert.ok(e.along > 3.2 && e.along < 5.6, `along ${e.along.toFixed(2)} (seed ${seed})`);
    // behind (heading 0 rides to −z: behind is +z), from just behind the back wheel
    assert.ok(e.z0 > -0.6 && e.z1 > 3, `from ${e.z0.toFixed(2)} to ${e.z1.toFixed(2)}`);
    // a puddle, not a rectangle: well under the box round it
    assert.ok(e.area < e.across * e.along * 0.8, `area ${e.area.toFixed(1)} of ${(e.across * e.along).toFixed(1)}`);
    // the middle is in it, a soft field falling off to nothing outside
    assert.ok(onSlick(s, s.x, s.z));
    assert.equal(oilAt(s, s.x + 9, s.z), 0);
  }
});

test('oil: the same slick for everyone from the same seed; another seed, another shape', () => {
  const a = planSlick({ x: 5, z: -3, heading: 1, seed: 42 });
  const b = planSlick({ x: 5, z: -3, heading: 1, seed: 42 });
  const c = planSlick({ x: 5, z: -3, heading: 1, seed: 43 });
  assert.deepEqual(a.blobs, b.blobs);
  assert.notDeepEqual(a.blobs, c.blobs);
});

test('oil: kept in the street band it is spilled in (narrower in a narrow one)', () => {
  // a band 1.0…2.6 m right of the line (the half of a narrow golmok you ride in)
  const s = planSlick({ x: 1.8, z: 0, heading: 0, seed: 7, pts: street, lo: 1.0, hi: 2.6 });
  for (const [bx, , r] of s.blobs) assert.ok(bx >= 1.0 + r * 0.45 - 1e-6 && bx <= 2.6 - r * 0.45 + 1e-6, `blob at ${bx.toFixed(2)} r ${r.toFixed(2)}`);
  assert.ok(!onSlick(s, -1, s.z), 'the other half is clear');
  assert.ok(extent(s).across < 3);
});

test('oil: it spreads out in about half a second, and goes in its last second', () => {
  assert.equal(slickGrow(0, OIL.life), 0);
  assert.ok(slickGrow(OIL.spread / 2, OIL.life) > 0.6);
  assert.equal(slickGrow(OIL.spread, OIL.life), 1);
  assert.ok(slickGrow(5, OIL.fade / 2) < 0.6);
  assert.equal(slickGrow(5, 0), 0);
  assert.ok(OIL.life + OIL.spread >= 12 && OIL.life + OIL.spread <= 15, 'lasts about 12–15 s');
  assert.equal(OIL.riders, 3);
  // half spread: the middle is oily, the rim not yet
  const s = planSlick({ x: 0, z: 0, heading: 0, seed: 7 });
  assert.ok(onSlick(s, s.x, s.z, 0.5));
  assert.ok(extent({ ...s, blobs: s.blobs.map(([x, z, r]) => [x, z, r * 0.8]) }).area < extent(s).area);
});

test('oil: a spin-out is one full turn in about 1.2 s, and leaves most of the speed gone', () => {
  assert.ok(OIL.spin >= 1 && OIL.spin <= 1.5);
  assert.equal(spinAngle(0, 1), 0);
  assert.ok(Math.abs(spinAngle(OIL.spin, 1) - Math.PI * 2) < 1e-9);
  assert.ok(Math.abs(spinAngle(OIL.spin, -1) + Math.PI * 2) < 1e-9);
  assert.ok(spinAngle(OIL.spin / 2, 1) > Math.PI, 'quick at first');
  assert.ok(Math.abs(spinSpeed(20, OIL.spin) - 20 * OIL.keep) < 1e-9);
  assert.ok(spinSpeed(20, OIL.spin) < 20 * 0.5, 'most of the speed gone');
  assert.ok(spinSpeed(20, 0.6) < 20 && spinSpeed(20, 0.6) > spinSpeed(20, 1.2));
});
