import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { growTree, woodGeometry, leafGeometry, leafTint, seoulSeason, LOD_RANGE } from '../../src/city/trees.js';
import { nearFade, NEAR_FADE } from '../../src/city/race.js';

test('Seoul street trees: a ginkgo is a tall narrow cone, a plane tree a broad dome on a short trunk', () => {
  const g = growTree('ginkgo', 1.3);
  const p = growTree('plane', 1.3);
  const spread = (t) => {
    const b = new THREE.Box3();
    for (const l of t.leaves) b.expandByPoint(l.c);
    return b.getSize(new THREE.Vector3());
  };
  const gs = spread(g);
  const ps = spread(p);
  assert.ok(gs.y > Math.max(gs.x, gs.z) * 0.9, `ginkgo crown taller than wide (${gs.x.toFixed(1)} × ${gs.y.toFixed(1)})`);
  assert.ok(Math.max(ps.x, ps.z) > Math.max(gs.x, gs.z), 'the plane tree spreads wider');
  for (const t of [g, p]) {
    assert.ok(t.branches.some((b) => b.level === 2) && t.branches.some((b) => b.level === 3), 'branches branch: limbs, twigs and shoots');
    assert.ok(t.leaves.length > 200, `a full crown of leaf cards (${t.leaves.length})`);
    // the crown starts above a rider's head: riders and people pass under it
    const low = Math.min(...t.leaves.map((l) => l.c.y));
    assert.ok(low > 2.0, `lowest leaves at ${low.toFixed(2)} m`);
  }
  // the same seed grows the same tree
  assert.equal(growTree('ginkgo', 1.3).leaves.length, g.leaves.length);
});

test('Seoul street trees: each level of detail is lighter than the one before', () => {
  for (const sp of ['ginkgo', 'plane']) {
    const t = growTree(sp, 4.2);
    const tris = (geo) => (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    const w = [woodGeometry(t), woodGeometry(t, { maxLevel: 2, sides: [6, 4, 3], step: 2 }), woodGeometry(t, { maxLevel: 1, sides: [5, 3], step: 3 })].map(tris);
    const l = [leafGeometry(t, sp), leafGeometry(t, sp, { every: 2, grow: 1.4 }), leafGeometry(t, sp, { every: 5, grow: 2.3 })].map(tris);
    assert.ok(w[0] > w[1] && w[1] > w[2], `${sp} wood ${w.join(' > ')}`);
    assert.ok(l[0] > l[1] && l[1] > l[2], `${sp} leaves ${l.join(' > ')}`);
    assert.ok(w[2] + l[2] < 900, `far trees are cheap (${w[2] + l[2]} triangles)`);
  }
  assert.ok(LOD_RANGE[0] < LOD_RANGE[1] && LOD_RANGE[1] < LOD_RANGE[2]);
});

test('Seoul street trees: ginkgo gold in autumn, green in summer; the season from the month in Seoul', () => {
  const hsl = (c) => c.getHSL({}, THREE.SRGBColorSpace);
  const autumn = hsl(leafTint('ginkgo', 'autumn', 0.37));
  const summer = hsl(leafTint('ginkgo', 'summer', 0.37));
  assert.ok(autumn.h > 0.09 && autumn.h < 0.19 && autumn.s > 0.7, 'gold');
  assert.ok(summer.h > 0.22 && summer.h < 0.33, 'green');
  assert.equal(seoulSeason(new Date('2026-11-10T03:00:00Z')), 'autumn');
  assert.equal(seoulSeason(new Date('2026-07-10T03:00:00Z')), 'summer');
  assert.equal(seoulSeason(new Date('2026-04-10T03:00:00Z')), 'spring');
  assert.equal(seoulSeason(new Date('2026-01-10T03:00:00Z')), 'winter');
});

test('Jarani camera: a rival by the camera or between it and you fades; one alongside you does not', () => {
  const cam = { x: 0, y: 2.5, z: 5 };
  const me = { x: 0, y: 0.9, z: 0 };
  assert.equal(nearFade(cam, { x: 0.3, y: 0.8, z: 4.2 }, me), 0, 'right by the camera: gone');
  assert.equal(nearFade(cam, { x: 0.1, y: 0.8, z: 1.6 }, me), 0, 'between the camera and you: gone');
  assert.equal(nearFade(cam, { x: 1.2, y: 0.8, z: 0 }, me), 1, 'beside you: whole');
  assert.equal(nearFade(cam, { x: 0, y: 0.8, z: -6 }, me), 1, 'ahead of you: whole');
  const mid = nearFade(cam, { x: 2.6, y: 0.8, z: 5 }, me);
  assert.ok(mid > 0 && mid < 1, 'fading in between');
  assert.ok(NEAR_FADE[0] < NEAR_FADE[1]);
});

test('Jarani credits: every source with a link and a licence; the truck credited without its maker', async () => {
  const { seoulCredits } = await import('../../src/city/credits.js');
  const list = seoulCredits();
  for (const c of list) {
    assert.match(c.site, /^https:\/\//, c.name);
    assert.ok(c.licence && /^https:\/\//.test(c.licenceUrl), `${c.name} has a licence link`);
    for (const i of c.items ?? []) assert.match(i.url, /^https:\/\//, i.name);
  }
  const text = JSON.stringify(list);
  for (const want of ['OpenStreetMap', 'KOGL', 'Copernicus', 'Rocketbox', 'yunho98', '1-ton truck', 'Daniel Zhabotinsky', 'Comrade1280', 'own.guest', 'Bark004', 'PavingStones152', 'Delivery Moped']) assert.ok(text.includes(want), want);
  assert.ok(!/Hyundai|Pother|Bongo/.test(text), 'no maker named on screen');
});
