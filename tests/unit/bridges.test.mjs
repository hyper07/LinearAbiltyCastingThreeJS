import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roadPieces, densify, DECK_WATER, DECK_LAND } from '../../games/g_cv2yrhrpv2/bridges.js';

/** A road from points [[x, z], …]; keys from the rounded points, as the game makes them. */
const road = (points, bridge = false) => ({
  road: { pts: Float32Array.from(points.flat()), width: 15, bridge, cls: 2 },
  keys: points.map(([x, z]) => `${Math.round(x * 10)}|${Math.round(z * 10)}`)
});
/** A river from x = 200 to x = 1400. */
const world = { water: (x) => x > 200 && x < 1400, tile: (x, z) => `${Math.floor(x / 500)}_${Math.floor(z / 500)}` };
const pieces = (all) => [...roadPieces(all, world).values()].flat();
/** The height at a point, from every piece that passes through it. */
const heightsAt = (list, x, z) => {
  const out = [];
  for (const p of list) for (let i = 0; i < p.line.length; i += 3) if (Math.hypot(p.line[i] - x, p.line[i + 1] - z) < 0.01) out.push(p.line[i + 2]);
  return out;
};

test('a bridge over the river comes down to the roads on both banks, and stands high over the water', () => {
  const list = pieces([road([[-400, 0], [0, 0]]), road([[0, 0], [1600, 0]], true), road([[1600, 0], [2000, 0]])]);
  assert.deepEqual([...new Set(heightsAt(list, 0, 0))], [0], 'the south end meets the road at its height');
  assert.deepEqual([...new Set(heightsAt(list, 1600, 0))], [0], 'and the north end');
  assert.ok(Math.abs(heightsAt(list, 800, 0)[0] - DECK_WATER) < 0.01, 'over the middle of the river: the deck');
  // Never a step: neighbours along the deck differ by little.
  for (const p of list) for (let i = 3; i < p.line.length; i += 3) assert.ok(Math.abs(p.line[i + 2] - p.line[i - 1]) < 2.6, 'a ramp, not a wall');
});

test('a bridge in pieces (split at an island) stays level where the pieces meet', () => {
  const list = pieces([road([[-200, 0], [0, 0]]), road([[0, 0], [700, 0]], true), road([[700, 0], [1600, 0]], true), road([[1600, 0], [1800, 0]])]);
  const mid = heightsAt(list, 700, 0);
  assert.equal(mid.length >= 2, true);
  assert.ok(mid.every((h) => Math.abs(h - DECK_WATER) < 0.01), `no dip into the river: ${mid}`);
  // A dry piece of the same bridge stands as high as the rest.
  const dry = pieces([road([[-600, 0], [-300, 0]]), road([[-300, 0], [100, 0]], true), road([[100, 0], [1600, 0]], true), road([[1600, 0], [1800, 0]])]);
  assert.ok(heightsAt(dry, 100, 0).every((h) => Math.abs(h - DECK_WATER) < 0.01));
});

test('an overpass on land is lower; a slip road meeting a deck partway takes its height there', () => {
  const list = pieces([road([[-3000, 0], [-2600, 0]]), road([[-2600, 0], [-2000, 0]], true), road([[-2000, 0], [-1600, 0]])]);
  assert.ok(Math.abs(Math.max(...list.flatMap((p) => [...p.line].filter((_, i) => i % 3 === 2))) - DECK_LAND) < 0.01);
  // A ramp from the bank joining the main bridge at x = 300, close to its end (still climbing).
  const all = [road([[-400, 0], [0, 0]]), road([[0, 0], [300, 0], [1600, 0]], true), road([[1600, 0], [2000, 0]]), road([[0, 300], [300, 0]], true), road([[-100, 400], [0, 300]])];
  const two = pieces(all);
  const at = heightsAt(two, 300, 0);
  assert.ok(Math.max(...at) - Math.min(...at) < 0.01, `the slip road and the bridge agree: ${at}`);
});

test('long roads are cut into pieces of about 300 m that join end to end', () => {
  const map = roadPieces([road([[0, 2000], [3000, 2000]])], world);
  const list = [...map.values()].flat().sort((a, b) => a.along - b.along);
  assert.ok(list.length >= 10);
  assert.ok(map.size >= 6, 'drawn with the tiles they pass through');
  for (let k = 1; k < list.length; k++) {
    const prev = list[k - 1].line;
    assert.equal(prev[prev.length - 3], list[k].line[0], 'each starts where the last ended');
  }
  assert.deepEqual(densify(Float32Array.from([0, 0, 50, 0])).at, [0, 10, 20, 30, 40, 50]);
});
