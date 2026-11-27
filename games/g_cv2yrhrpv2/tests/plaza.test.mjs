import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAZAS, PLAZA_LIFT, plazaAt, plazaY, plazaRoads, plazaRings, plazaFolk, plazaBollards, inPlazaLane, toLine } from '../plaza.js';
import { FOUNTAIN, SHOW, showAt, jetHeight, patternHeight, fountainJets } from '../fountain.js';
import { BIKE_COURSES } from '../course.js';
import { SKYLINE } from '../skyline.js';
import { Walls } from '../walls.js';

const square = PLAZAS.find((p) => p.id === 'gwanghwamun');
const yi = SKYLINE.find((l) => l.id === 'yisunsin');

test('Gwanghwamun Square is paving at pavement height, between Sejong-daero and the buildings on its west', () => {
  const ground = () => 30;
  // on the square: by the fountain, by King Sejong; off it: on Sejong-daero's carriageways, past its ends
  assert.equal(plazaY(-105, -480, ground), 30 + PLAZA_LIFT);
  assert.equal(plazaY(-110, -700, ground), 30 + PLAZA_LIFT);
  for (const [x, z] of [[-60, -600], [-70, -700], [-100, -430], [-100, -1000], [-200, -700]]) assert.equal(plazaY(x, z, ground), null, `${x}, ${z}`);
  assert.equal(plazaAt(-105, -480)?.id, 'gwanghwamun');
  // the admiral and King Sejong stand on it
  assert.ok(plazaAt(yi.x, yi.z) && plazaAt(yi.sejong.x, yi.sejong.z));
  // Cheong Wa Dae's drive: along its lane, and on to the pavements of the road it leaves from
  assert.equal(plazaAt(-268, -2200)?.id, 'cheongwadae');
  assert.equal(plazaAt(-146, -1952)?.id, 'cheongwadae');
  assert.equal(plazaAt(-268, -2120), null, 'the lawn itself is not paved');
});

test('the square\'s racing lane runs past the fountain, round the admiral\'s plinth on its west and past King Sejong, clear of what stands there', () => {
  const lane = square.lane;
  // northward all the way, gently: no bend over 20° between its points
  for (let i = 1; i < lane.length; i++) assert.ok(lane[i][1] < lane[i - 1][1], `point ${i} north of the one before`);
  for (let i = 2; i < lane.length; i++) {
    const a = Math.atan2(lane[i - 1][0] - lane[i - 2][0], lane[i - 1][1] - lane[i - 2][1]);
    const b = Math.atan2(lane[i][0] - lane[i - 1][0], lane[i][1] - lane[i - 1][1]);
    assert.ok(Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) < 0.35, `bend at ${i}`);
  }
  // the plinths, planters and bollards: none in the lane (half its width, less a little room for the bollards at its edge)
  const walls = new Walls();
  for (const r of plazaRings('gwanghwamun')) walls.addRing(r.xs, r.zs);
  for (let z = lane[0][1]; z > lane.at(-1)[1]; z -= 2) {
    const { i, t } = toLine(lane, -100, z);
    const x = lane[i][0] + (lane[i + 1][0] - lane[i][0]) * t;
    const L = toLine(lane, x, z);
    assert.ok(L.d < 6);
    assert.ok(!walls.hits(x, z, 1), `the lane's middle clear at z ${z}`);
  }
  // within a few metres of the admiral's plinth (it goes round it), and the fountain's west row in the lane
  assert.ok(toLine(lane, yi.x - 6.5, yi.z).d < 10);
  assert.ok(toLine(lane, yi.x - FOUNTAIN.edge.x, yi.z + 35).d < square.width / 2);
  // the bollards line its edges, never in it
  const posts = plazaBollards(square);
  assert.ok(posts.length > 20);
  for (const [x, z] of posts) assert.ok(toLine(lane, x, z).d > square.width / 2, `a bollard at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  assert.ok(inPlazaLane(-104, -620) && !inPlazaLane(-60, -620));
  // people about its edges, out of the lane
  for (const f of plazaFolk('gwanghwamun')) assert.ok(!inPlazaLane(f.x, f.z), `someone in the lane at ${f.x}, ${f.z}`);
});

test('the squares\' lanes are streets for the planner, joined to the real roads at their ends', () => {
  // a stand-in for Jongno westbound and Sajik-ro, their points a little off where the joins ask
  const roads = [
    { pts: Float32Array.of(0, -445.3, -95.6, -445.1, -200, -444), width: 14, cls: 2, oneway: true },
    { pts: Float32Array.of(-300, -984, -95.2, -984.4, 0, -990), width: 10.75, cls: 2, oneway: true },
    { pts: Float32Array.of(-96, -428, 0, -428), width: 10.75, cls: 2, oneway: true },
    // (a footpath is never joined to)
    { pts: Float32Array.of(-101, -997, -102, -1010), width: 3.4, cls: 7 }
  ];
  const out = plazaRoads(roads, 'gwanghwamun');
  const lane = out.find((r) => r.pts.length > 4);
  assert.equal(lane.cls, 4);
  assert.equal(lane.width, square.width);
  // a point every 10 m at most
  for (let i = 2; i < lane.pts.length; i += 2) assert.ok(Math.hypot(lane.pts[i] - lane.pts[i - 2], lane.pts[i + 1] - lane.pts[i - 1]) <= 10.01);
  const joins = out.filter((r) => r !== lane);
  // onto the road's own point (so the graph joins them), from the lane's own
  assert.ok(joins.some((r) => r.pts[2] === roads[0].pts[2] && r.pts[3] === roads[0].pts[3] && r.pts[0] === square.lane[0][0]));
  assert.ok(joins.some((r) => r.pts[2] === roads[1].pts[2] && r.pts[3] === roads[1].pts[3] && r.pts[1] === square.lane.at(-1)[1]));
  assert.ok(!joins.some((r) => r.pts[2] === -101), 'not onto a footpath');
  // a course that rides the square says so, and its countdown sweeps round the admiral
  const runs = BIKE_COURSES.filter((c) => c.plaza?.includes('gwanghwamun'));
  assert.deepEqual(runs.map((c) => c.id).sort(), ['fountainrun', 'gyeongbok8']);
  for (const c of runs) assert.equal(c.sweep, 'yisunsin');
});

test('the fountain runs a show: every pattern in turn, cross-faded, the tall rows answering the field, a burst from the middle', () => {
  const jets = fountainJets();
  assert.equal(jets.filter((j) => j.kind === 'field').length, FOUNTAIN.field.cols * FOUNTAIN.field.rows);
  assert.equal(jets.filter((j) => j.kind === 'edge').length, FOUNTAIN.edge.rows * 2);
  // every pattern comes round, each for its step
  const seen = new Set();
  for (let t = 0; t < FOUNTAIN.step * SHOW.length; t += 1) seen.add(showAt(t).a);
  assert.deepEqual([...seen].sort(), [...SHOW].sort());
  // cross-faded: no jump between one second and the next
  for (const j of [jets[0], jets[40], jets.find((q) => q.kind === 'edge'), jets.at(-1)]) {
    for (let t = 0; t < 130; t += 0.05) assert.ok(Math.abs(jetHeight(j, t + 0.05) - jetHeight(j, t)) < 1.6, `${j.kind} at ${t.toFixed(2)}`);
  }
  // heights: the field low (under 4.5 m), the tall rows up to 9 m, the burst only in its own pattern, up to 12.5 m
  let field = 0;
  let edge = 0;
  let burst = 0;
  for (let t = 0; t < 120; t += 0.1) {
    for (const j of jets) {
      const h = jetHeight(j, t);
      assert.ok(h >= 0 && Number.isFinite(h));
      if (j.kind === 'field') field = Math.max(field, h);
      else if (j.kind === 'edge') edge = Math.max(edge, h);
      else burst = Math.max(burst, h);
    }
  }
  assert.ok(field > 3 && field < 4.5, `the field ${field.toFixed(1)} m`);
  assert.ok(edge > 7 && edge <= 9, `the tall rows ${edge.toFixed(1)} m`);
  assert.ok(burst > 10 && burst < 12.6, `the burst ${burst.toFixed(1)} m`);
  for (const p of SHOW.filter((q) => q !== 'burst')) assert.equal(patternHeight(p, { kind: 'burst' }, 1.3), 0);
  // a wave rolls down the field: the rows' heights differ at one moment
  const rows = jets.filter((j) => j.kind === 'field' && j.c === 3).map((j) => patternHeight('wave', j, 2));
  assert.ok(Math.max(...rows) - Math.min(...rows) > 2);
});
