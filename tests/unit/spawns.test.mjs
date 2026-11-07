import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLevel, normalizeSpawn, pickSpawnPoint, spawnLimits, spawnTakes } from '../../src/levels/Level.js';

test('spawn points: old levels keep working, limits are cleaned up', () => {
  assert.deepEqual(normalizeSpawn({ x: 3, z: -4 }), { x: 3, z: -4, kinds: [], from: 1, to: 0 });
  assert.deepEqual(normalizeSpawn({ x: 1, z: 2, kinds: ['dragon', 'dragon', 'unicorn'], from: 5.4, to: 2 }), { x: 1, z: 2, kinds: ['dragon'], from: 5, to: 5 });
  const level = normalizeLevel({ spawns: [{ x: 18, z: 0, kinds: ['golem'], from: 3 }, { x: -18, z: 0 }] });
  assert.deepEqual(level.spawns, [{ x: 18, z: 0, kinds: ['golem'], from: 3, to: 0 }, { x: -18, z: 0, kinds: [], from: 1, to: 0 }]);
});

test('a spawn point takes only its monsters, only in its waves', () => {
  const gate = { x: 0, z: 20, kinds: ['dragon'], from: 5, to: 9 };
  assert.equal(spawnTakes(gate, 'dragon', 5), true);
  assert.equal(spawnTakes(gate, 'dragon', 4), false);
  assert.equal(spawnTakes(gate, 'dragon', 10), false);
  assert.equal(spawnTakes(gate, 'grunt', 6), false);
  assert.equal(spawnTakes({ x: 0, z: 0, kinds: [], from: 1, to: 0 }, 'grunt', 99), true);
  assert.equal(spawnLimits(gate, { dragon: 'Emberwyrm' }), 'Emberwyrm · waves 5–9');
  assert.equal(spawnLimits({ kinds: [], from: 3, to: 0 }), 'wave 3+');
  assert.equal(spawnLimits({ kinds: [], from: 1, to: 0 }), '');
});

test('a point that names a monster gets all of it; others use the open points; none: any point', () => {
  const north = { x: 0, z: 20, kinds: ['dragon'], from: 1, to: 0 };
  const south = { x: 0, z: -20, kinds: ['grunt', 'wisp'], from: 1, to: 0 };
  const east = { x: 20, z: 0, kinds: [], from: 3, to: 0 };
  const points = [north, south, east];
  const seen = (kind, wave) => new Set(Array.from({ length: 200 }, (_, i) => pickSpawnPoint(points, kind, wave, () => (i % 10) / 10)));
  assert.deepEqual([...seen('dragon', 1)], [north]);
  assert.deepEqual([...seen('grunt', 1)], [south]);
  // From wave 3 the east point is open to anything, but grunts still all come through the point that names them.
  assert.deepEqual([...seen('grunt', 3)], [south]);
  // A golem in wave 3: no point names it, so it takes the open one.
  assert.deepEqual([...seen('golem', 3)], [east]);
  // A brute in wave 1: no point takes it, so it uses any of them rather than none.
  assert.equal(seen('brute', 1).size, 3);
  assert.equal(pickSpawnPoint([], 'grunt', 1), null);
});
