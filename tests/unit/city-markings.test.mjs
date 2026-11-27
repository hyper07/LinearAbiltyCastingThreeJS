import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JC, JL, JR, endKey, inJunction, lineRules, paintRuns } from '../../games/g_cv2yrhrpv2/markings.js';

/**
 * Seoul's road paint (markings.js): a road's lines stop inside another road crossing it, not on the far
 * side of a T, and a road lying over another yields its paint to the wider one; narrow streets have
 * fewer lines. Roads as SeoulGame's roadArea stretches: [ax, az, bx, bz, half, id, bridge].
 */
function roads(list) {
  const segs = [];
  const ends = new Map();
  for (const [id, pts, half, bridge = false] of list) {
    for (let i = 1; i < pts.length; i++) {
      const s = [pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], half, id, bridge];
      segs.push(s);
      for (const [x, z] of [[s[0], s[1]], [s[2], s[3]]]) {
        const k = endKey(x, z);
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push(s);
      }
    }
  }
  return { segs, ends, near: () => segs };
}

/** The flags at `at` metres along a road's runs. */
const flags = (runs, at) => runs.find((r) => at >= r[0] && at < r[1])?.[2] ?? -1;

// An 8 m road east along z = 0 from x −50 to 50 (two stretches, meeting at the middle).
const A = [1, [[-50, 0], [0, 0], [50, 0]], 4];

test('road paint: at a crossing every line of both roads stops in the middle and runs on past it', () => {
  const { segs, ends, near } = roads([A, [2, [[0, -50], [0, 0]], 4], [3, [[0, 0], [0, 50]], 4]]);
  const runs = paintRuns(A[1], 4, 1, near, ends);
  assert.equal(flags(runs, 50), JC | JL | JR, 'in the crossing: no lines');
  assert.equal(flags(runs, 40), 0, 'before it: all of them');
  assert.equal(flags(runs, 60), 0, 'after it');
  const into = runs.find((r) => r[2] === (JC | JL | JR));
  assert.ok(Math.abs(into[0] - 46.1) < 0.1 && Math.abs(into[1] - 53.9) < 0.1, `stops at the other road's edge: ${into[0].toFixed(2)}–${into[1].toFixed(2)}`);
  // the side road (north–south, its way split at the crossing) stops where it meets ours too
  const b = paintRuns([[0, -50], [0, 0]], 4, 2, near, ends);
  assert.equal(flags(b, 48), JC | JL | JR);
  assert.equal(inJunction(segs, ends, 0, 0, 1, 0, 1, 4), true);
});

test('road paint: at a T the road running on keeps its middle line and its far edge — only the near edge stops at the side road', () => {
  const { ends, near } = roads([A, [2, [[0, -50], [0, 0]], 4]]);
  const runs = paintRuns(A[1], 4, 1, near, ends);
  // (the side road comes from −z: on A's right going east)
  assert.equal(flags(runs, 50), JR);
  // the side road's own lines stop at the edge of the road it meets
  const b = paintRuns([[0, -50], [0, 0]], 4, 2, near, ends);
  assert.equal(flags(b, 47), JC | JL | JR);
  assert.equal(flags(b, 40), 0);
});

test('road paint: the next stretch of the same street, a road beside it and a bridge over it are no junction', () => {
  // the street's way split in two at x = 0, the other carriageway 9 m off, a bridge across
  const { ends, near } = roads([[1, [[-50, 0], [0, 0]], 4], [2, [[0, 0], [50, 0]], 4], [3, [[-50, 9], [50, 9]], 4], [4, [[10, -50], [10, 50]], 5, true]]);
  const runs = paintRuns([[-50, 0], [0, 0]], 4, 1, near, ends);
  assert.deepEqual(runs.map((r) => r[2]), [0]);
  const over = paintRuns([[0, 0], [50, 0]], 4, 2, near, ends);
  assert.deepEqual(over.map((r) => r[2]), [0], 'under the bridge: its lines run on');
});

test('road paint: where a narrower road lies over a wider one (a slip road, a road drawn twice), the narrower one yields its lines', () => {
  const { ends, near } = roads([[1, [[-50, 0], [50, 0]], 3], [2, [[-20, 1], [20, 1]], 6]]);
  const narrow = paintRuns([[-50, 0], [50, 0]], 3, 1, near, ends);
  assert.equal(flags(narrow, 50) & JC, JC, 'the narrow one: no lines over the wide one');
  assert.equal(flags(narrow, 10), 0, 'and its own away from it');
  const wide = paintRuns([[-20, 1], [20, 1]], 6, 2, near, ends);
  assert.deepEqual(wide.map((r) => r[2]), [0], 'the wide one keeps them');
});

test('road paint: a street too narrow has fewer lines — none under 4 m, no middle line on a two-way one under 5.5 m', () => {
  assert.deepEqual(lineRules(3.6, false), { edges: false, centre: false, yellow: false });
  assert.deepEqual(lineRules(5, false), { edges: true, centre: false, yellow: false });
  assert.deepEqual(lineRules(7, false), { edges: true, centre: true, yellow: false });
  assert.deepEqual(lineRules(12, false), { edges: true, centre: true, yellow: true });
  assert.equal(lineRules(4.25, true).yellow, true, 'a one-way carriageway: yellow on its median side');
});
