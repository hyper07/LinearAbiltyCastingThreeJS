import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinEnds, levelNetwork, BAND } from '../../games/g_cv2yrhrpv2/roadLevel.js';
import { densify, roadPieces } from '../../games/g_cv2yrhrpv2/bridges.js';

/** A street from points [[x, z], …] (keys at its points, as roads.bin's), `half` wide each side. */
const street = (points, half = 4, reach = half + 3, pave = 3) => {
  const d = densify(Float32Array.from(points.flat()));
  d.keys = new Array(d.at.length).fill(null);
  d.vert.forEach((i, j) => (d.keys[i] = `${points[j][0]}|${points[j][1]}`));
  return Object.assign(d, { half, reach, pave });
};
/** Each point's level along a line: [x, z, h]. */
const pts = (l) => l.h.map ? Array.from(l.h, (h, i) => [l.xz[i * 2], l.xz[i * 2 + 1], h]) : [];

test('a street across a hillside lies level across, never under the land anywhere across it and its pavements', () => {
  // The land rises 30 in 100 to the north (−z): a street running east–west across it.
  const ground = (x, z) => -z * 0.3;
  const l = street([[0, 0], [200, 0]]);
  levelNetwork([l], ground);
  for (const [x, z, h] of pts(l)) {
    for (const o of [-l.reach, -l.half, 0, l.half, l.reach]) assert.ok(h >= ground(x, z + o) - 1e-6, `the land pokes through at ${o} m across: ${h} < ${ground(x, z + o)}`);
    // (on the downhill side, a drop: the street stands over the land there)
    assert.ok(h - ground(x, z + l.reach) > 3, 'a drop beside it on the downhill side');
  }
});

test('up a bumpy hill: smoothed along — no bump, no kink — and never more than the band over the land', () => {
  // A 12 % climb with 1.5 m bumps every 30 m on it.
  const ground = (x) => x * 0.12 + Math.sin(x / 30 * Math.PI * 2) * 1.5;
  const l = street([[0, 0], [600, 0]], 3, 3.5, 0.5);
  levelNetwork([l], ground);
  const p = pts(l);
  let worstKink = 0;
  for (let i = 2; i < p.length; i++) {
    const g0 = (p[i - 1][2] - p[i - 2][2]) / (p[i - 1][0] - p[i - 2][0]);
    const g1 = (p[i][2] - p[i - 1][2]) / (p[i][0] - p[i - 1][0]);
    worstKink = Math.max(worstKink, Math.abs(g1 - g0));
  }
  // (the land's own grade swings ±31 % between its bumps)
  assert.ok(worstKink < 0.1, `the grade changes by at most 10 % from one 10 m stretch to the next: ${worstKink}`);
  for (const [x, , h] of p) {
    assert.ok(h >= ground(x) - 1e-6, 'never under the land');
    assert.ok(h - ground(x) <= BAND + 1.6, 'never far over it');
  }
});

test('on the flat it stays down on the land', () => {
  const l = street([[0, 0], [300, 0]]);
  levelNetwork([l], () => 20);
  for (const [, , h] of pts(l)) assert.ok(Math.abs(h - 20) < 0.01, `${h}`);
});

test('where streets meet on a slope: one flat plate over the crossing street and its pavement, the streets easing into it', () => {
  const ground = (x, z) => x * 0.1 + z * 0.06;
  const a = street([[-200, 0], [0, 0], [200, 0]], 5);
  const b = street([[0, -200], [0, 0], [0, 200]], 4);
  levelNetwork([a, b], ground);
  const at0 = (l) => pts(l).find(([x, z]) => x === 0 && z === 0)[2];
  assert.equal(at0(a), at0(b), 'the same level at the junction');
  // Every point of either within the plate (the other's half-width and pavement) is that level.
  for (const [l, R] of [[a, 4 + 3], [b, 5 + 3]]) {
    for (const [x, z, h] of pts(l)) if (Math.hypot(x, z) <= R + 0.01) assert.equal(h, at0(a), `${x}, ${z}: on the plate`);
  }
});

test('an alley coming out onto a road between its points is joined to it there: the same level', () => {
  const ground = (x) => x * 0.08;
  const road = street([[0, 0], [300, 0]], 6);
  // (its end at the road's middle line, 137 m along — no point of the road's there)
  const alley = street([[137, 60], [137.3, 0.4]], 1.5, 2.5, 0.5);
  alley.keys = alley.keys.map(() => null);
  joinEnds([road, alley]);
  levelNetwork([road, alley], ground);
  const end = alley.h[alley.h.length - 1];
  const i = road.keys.findIndex((k) => k != null && k === alley.keys[alley.keys.length - 1]);
  assert.ok(i > 0, 'a point put in the road where the alley meets it');
  assert.equal(road.h[i], end);
});

test('roadPieces levels the roads when it knows the land: each piece carries its level', () => {
  const road = (points) => ({ road: { pts: Float32Array.from(points.flat()), width: 10, bridge: false, cls: 3 }, keys: points.map(([x, z]) => `${x}|${z}`) });
  const all = [road([[0, 0], [400, 0]])];
  const map = roadPieces(all, { water: () => false, tile: () => 't', ground: (x) => x * 0.05 });
  const piece = map.get('t')[0];
  assert.ok(piece.level && piece.level.length === piece.line.length / 3);
  assert.ok(all[0].road.level.h.length > 10);
});
