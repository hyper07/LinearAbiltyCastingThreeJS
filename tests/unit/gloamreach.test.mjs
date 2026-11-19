import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, slopeAt, surfaceAt, riftAt } from '../../src/gloamreach/heights.js';
import { CollisionWorld } from '../../src/gloamreach/collide.js';
import { chooseTier, Governor, TIERS, SETTINGS } from '../../src/gloamreach/quality.js';
import { START, PLAZA, GATE, CLIFF_X, BUILDINGS, EXTENT, scatterTrees, nearestRoad, gloamLamps, areaAt, gloamAt, footprint } from '../../src/gloamreach/map.js';
import { HEROES, PEOPLE, ANIMALS } from '../../src/gloamreach/cast.js';
import { PACKS, POLYFORK_MODELS } from '../../src/gloamreach/credits.js';

test('terrain: deterministic, finite everywhere, flat where people walk', () => {
  assert.equal(heightAt(12.3, -45.6), heightAt(12.3, -45.6));
  for (let x = EXTENT.x0; x <= EXTENT.x1; x += 17) for (let z = EXTENT.z0; z <= EXTENT.z1; z += 23) assert.ok(Number.isFinite(heightAt(x, z)), `height at ${x},${z}`);
  assert.ok(slopeAt(START.x, START.z) < 0.15, 'the start is level');
  assert.ok(slopeAt(PLAZA.x, PLAZA.z) < 0.05, 'the square is level');
  assert.equal(surfaceAt(PLAZA.x, PLAZA.z), 'cobble');
  assert.equal(surfaceAt(0, -240), 'wetcobble');
});

test('terrain: the ridge stands high beside a gate cut down to the road', () => {
  const floor = heightAt(0, (GATE.z0 + GATE.z1) / 2);
  assert.ok(Math.abs(floor - heightAt(0, -100)) < 3, 'the tunnel floor meets the road');
  assert.ok(heightAt(GATE.outerHalfWidth + 20, -142) > floor + 25, 'rock rises either side of the gatehouse');
});

test('terrain: the east cliff drops into the rift', () => {
  assert.ok(heightAt(CLIFF_X - 8, 0) > -2);
  assert.ok(heightAt(CLIFF_X + 8, 0) < -50);
  const r = riftAt(400, -40);
  assert.ok(r.h < -60 && r.lava >= 0 && r.lava <= 1);
});

test('collision: circles and turned boxes push out; rays hit them', () => {
  const w = new CollisionWorld({ height: () => 0, slope: () => 0 });
  w.circle(0, 0, 1);
  const [x, z] = w.pushOut(0.5, 0, 0.4);
  assert.ok(Math.hypot(x, z) >= 1.39);
  w.box(10, 0, 2, 1, Math.PI / 4);
  const [bx, bz] = w.pushOut(10, 0, 0.3);
  assert.ok(Math.hypot(bx - 10, bz) > 0.9, 'out of the box');
  const d = w.raycast(-5, 0.5, 0, 1, 0, 0, 20);
  assert.ok(Math.abs(d - 4) < 0.05, `ray stops at the trunk (${d})`);
  assert.equal(w.raycast(-5, 0.5, 5, 1, 0, 0, 3), 3, 'a clear ray goes its full length');
});

test('collision: the land is the wall — no walking off the cliff or up the hills', () => {
  const w = new CollisionWorld();
  // Toward the rift from the overlook.
  let [x, z] = [CLIFF_X - 6, 0];
  for (let i = 0; i < 60; i++) [x, z] = w.move(x, z, 0.3, 0, 0.4);
  assert.ok(heightAt(x, z) > -3, `stopped at the edge (x ${x.toFixed(1)})`);
  // Up the western hills.
  [x, z] = [-100, 0];
  for (let i = 0; i < 200; i++) [x, z] = w.move(x, z, -0.3, 0, 0.4);
  assert.ok(heightAt(x, z) < 20, 'the hills are too steep to climb far');
  // Through the gate's tunnel: the floor is walkable end to end.
  [x, z] = [0, -118];
  for (let i = 0; i < 160; i++) [x, z] = w.move(x, z, 0, -0.3, 0.4);
  assert.ok(z < -160, `through the Gate (z ${z.toFixed(1)})`);
});

test('quality: a first guess from the GPU, a governor that steps down and back up', () => {
  assert.equal(chooseTier({ gpu: 'Google SwiftShader' }), 'low');
  assert.equal(chooseTier({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620)' }), 'medium');
  assert.equal(chooseTier({ gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max)' }), 'ultra');
  assert.ok(TIERS.every((t) => SETTINGS[t].scale > 0 && SETTINGS[t].shadow >= 1024));
  const g = new Governor('high');
  let changed = null;
  for (let i = 0; i < 400 && !changed; i++) changed = g.frame(33);
  assert.equal(changed, 'medium');
  changed = null;
  for (let i = 0; i < 2000 && !changed; i++) changed = g.frame(6);
  assert.equal(changed, 'high');
});

test('map: buildings apart, trees off the roads, lamps both sides of the path', () => {
  for (const a of BUILDINGS) for (const b of BUILDINGS) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > (a.w + b.w) / 2 - 1, `${a.id} and ${b.id} overlap`);
  for (const b of BUILDINGS) assert.equal(footprint(b).length, 4);
  const trees = scatterTrees(5);
  assert.deepEqual(trees.slice(0, 3), scatterTrees(5).slice(0, 3), 'seeded');
  assert.ok(trees.length > 300);
  assert.ok(trees.every((t) => nearestRoad(t.x, t.z).d > 2), 'no tree on a road');
  const lamps = gloamLamps();
  assert.ok(lamps.length > 8);
  assert.ok(lamps.some((l) => l.x > 0) && lamps.some((l) => l.x < 0));
  assert.equal(areaAt(0, 0), 'village');
  assert.equal(areaAt(0, -142), 'gate');
  assert.equal(areaAt(0, -250), 'gloamwood');
  assert.equal(areaAt(126, 0), 'overlook');
  assert.equal(gloamAt(0), 0);
  assert.equal(gloamAt(-200), 1);
});

test('cast: every hero and person has a model, a name and words; every CC BY model is credited', () => {
  assert.equal(HEROES.length, 3);
  for (const p of PEOPLE) {
    assert.ok(p.name && p.model && p.greet, p.id);
    if (p.does === 'chat') assert.ok(PEOPLE.some((q) => q.id === p.with), `${p.id} talks to someone real`);
  }
  const credited = new Set(POLYFORK_MODELS.map(([id]) => id));
  for (const m of [...HEROES, ...PEOPLE, ...ANIMALS].map((x) => x.model)) assert.ok(credited.has(m), `${m} is credited`);
  for (const p of PACKS) assert.ok(p.site.startsWith('https://') && p.licence, p.name);
});
