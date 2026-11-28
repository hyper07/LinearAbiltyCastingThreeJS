import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAZAS, PLAZA_LIFT, plazaAt, plazaY, plazaRoads, plazaRings, plazaFolk, plazaBollards, inPlazaLane, toLine } from '../plaza.js';
import { FOUNTAIN, SHOW, showAt, jetHeight, patternHeight, fountainJets } from '../fountain.js';
import { BIKE_COURSES } from '../course.js';
import { SKYLINE, MONUMENT_SCALE } from '../skyline.js';
import { SQUARE } from '../square.js';
import { Walls } from '../walls.js';

const square = PLAZAS.find((p) => p.id === 'gwanghwamun');
const yi = SKYLINE.find((l) => l.id === 'yisunsin');
const F = SQUARE.fountain;
/** A fountain jet's place on the map (its x, z are the fountain's own: from the walkway's middle, along it). */
const onMap = (j) => [F.x + j.x, (F.z0 + F.z1) / 2 + j.z];

test('Gwanghwamun Square is paving at pavement height, between Sejong-daero and the buildings on its west — about 60 m across and more', () => {
  const ground = () => 30;
  // on the square: by the fountain, by King Sejong; off it: on Sejong-daero's carriageways, past its ends
  assert.equal(plazaY(-105, -480, ground), 30 + PLAZA_LIFT);
  assert.equal(plazaY(-110, -700, ground), 30 + PLAZA_LIFT);
  for (const [x, z] of [[-60, -600], [-70, -700], [-100, -430], [-100, -1000], [-200, -700]]) assert.equal(plazaY(x, z, ground), null, `${x}, ${z}`);
  assert.equal(plazaAt(-105, -480)?.id, 'gwanghwamun');
  // the admiral and King Sejong stand on it
  assert.ok(plazaAt(yi.x, yi.z) && plazaAt(yi.sejong.x, yi.sejong.z));
  // wide: by the admiral, all along the fountain and by King Sejong, from the buildings to the kerb
  for (const z of [-520, -580, -610, -650, -700]) {
    // (out from the fountain's middle line to either edge)
    let w = F.x;
    while (w > -200 && plazaAt(w - 0.5, z)) w -= 0.5;
    let e = F.x;
    while (e < -40 && plazaAt(e + 0.5, z)) e += 0.5;
    assert.ok(e - w >= 55, `${Math.round(e - w)} m across at z ${z}`);
  }
  // the Sejong Center's forecourt paved too, out to its main hall
  assert.equal(plazaAt(-170, -650)?.id, 'gwanghwamun');
  // Cheong Wa Dae's drive: along its lane, and on to the pavements of the road it leaves from
  assert.equal(plazaAt(-268, -2200)?.id, 'cheongwadae');
  assert.equal(plazaAt(-146, -1952)?.id, 'cheongwadae');
  assert.equal(plazaAt(-268, -2120), null, 'the lawn itself is not paved');
});

test('the square\'s racing lane runs past the admiral\'s plinth on its west, up the fountain\'s walkway between its jets and round King Sejong, clear of what stands there', () => {
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
  // within a few metres of the admiral's (giant) plinth — it goes round it — and of King Sejong's pedestal
  assert.ok(toLine(lane, yi.x - 6.5 * MONUMENT_SCALE, yi.z).d < 10);
  assert.ok(toLine(lane, yi.sejong.x - 5.7 * MONUMENT_SCALE, yi.sejong.z).d < 15);
  // up the middle of the fountain's walkway, the tall rows either side just past its edges (their spray on you)
  for (let z = F.z0 - 15; z >= F.z1 + 10; z -= 5) {
    assert.ok(toLine(lane, F.x, z).d < 1.5, `the walkway's middle at z ${z}`);
    for (const s of [-1, 1]) {
      const d = toLine(lane, F.x + s * FOUNTAIN.edge.inner, z).d;
      assert.ok(d > square.width / 2 && d < square.width / 2 + 2.5, `the tall row ${d.toFixed(1)} m from the lane's middle at z ${z}`);
    }
  }
  // the bollards line its edges, never in it
  const posts = plazaBollards(square);
  assert.ok(posts.length > 20);
  for (const [x, z] of posts) assert.ok(toLine(lane, x, z).d > square.width / 2, `a bollard at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  assert.ok(inPlazaLane(-104, -620) && !inPlazaLane(-60, -620));
  // people about, out of the lane and on the paving — a dozen and more among the jets either side of the walkway
  const folk = plazaFolk('gwanghwamun');
  for (const f of folk) assert.ok(!inPlazaLane(f.x, f.z) && plazaAt(f.x, f.z), `someone in the lane, or off the square, at ${f.x}, ${f.z}`);
  const among = folk.filter((f) => f.z < F.z0 && f.z > F.z1 && Math.abs(f.x - F.x) > F.walk / 2 && Math.abs(f.x - F.x) < FOUNTAIN.field.outer);
  assert.ok(among.length >= 12 && among.some((f) => f.x < F.x) && among.some((f) => f.x > F.x), `${among.length} among the jets`);
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

test('the monuments larger than life, their solids to match; the fountain big, between the admiral and King Sejong, on the paving', () => {
  const S = MONUMENT_SCALE;
  assert.ok(S >= 2, `${S}× true size`);
  // the admiral 17 m at true size (6.5 m on a 10.5 m plinth), King Sejong 10.4 m: their sights as tall as drawn
  assert.equal(yi.height, 17 * S);
  assert.deepEqual(yi.sights.map((q) => q[2]), [17 * S, SQUARE.sejong.height * S]);
  const [plinth, ship, pedestal] = square.solids;
  assert.deepEqual([plinth.w, plinth.d, ship.w, ship.d, pedestal.w, pedestal.d], [13 * S, 13 * S, 3.2 * S, 6.4 * S, 11.4 * S, 10.6 * S]);
  assert.ok(Math.abs(ship.z - (yi.z + 9.6 * S)) < 1e-9, 'the turtle ship before him, as far out as drawn');
  // the fountain north of the admiral's plinth and south of King Sejong's pedestal: 60 m long and more, two
  // fields of many columns either side of a walkway the lane fits in, 45 m across and more
  assert.ok(F.z0 < plinth.z - plinth.d / 2 && F.z1 > pedestal.z + pedestal.d / 2);
  assert.ok(FOUNTAIN.length >= 60 && FOUNTAIN.field.cols >= 8 && F.walk >= square.width + 1 && 2 * FOUNTAIN.field.outer >= 45);
  const jets = fountainJets();
  for (const j of jets) {
    const [x, z] = onMap(j);
    assert.ok(plazaAt(x, z, 'gwanghwamun'), `a ${j.kind} jet off the paving at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(!square.solids.some((s) => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2), `a jet in a plinth at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
  // from afar only the coarse ones (listed first): under a third of them
  const coarse = jets.findIndex((j) => !j.coarse);
  assert.ok(coarse > 50 && coarse < jets.length / 3 && jets.slice(coarse).every((j) => !j.coarse));
});

test('the fountain runs a show: every pattern in turn, cross-faded, the tall rows answering the fields, a burst from the middle', () => {
  const jets = fountainJets();
  assert.equal(jets.filter((j) => j.kind === 'field').length, FOUNTAIN.field.cols * FOUNTAIN.field.rows * 2);
  assert.equal(jets.filter((j) => j.kind === 'edge').length, FOUNTAIN.edge.rows * 4);
  assert.equal(jets.filter((j) => j.kind === 'burst').length, 1);
  // every pattern comes round, each for its step
  const seen = new Set();
  for (let t = 0; t < FOUNTAIN.step * SHOW.length; t += 1) seen.add(showAt(t).a);
  assert.deepEqual([...seen].sort(), [...SHOW].sort());
  // cross-faded: no jump from one frame to the next (a twentieth of a second: under a tenth of the burst's height)
  const H = FOUNTAIN.heights;
  for (const j of [jets[0], jets[40], jets.find((q) => q.kind === 'edge'), jets.find((q) => q.kind === 'burst'), jets.at(-1)]) {
    for (let t = 0; t < 130; t += 0.05) assert.ok(Math.abs(jetHeight(j, t + 0.05) - jetHeight(j, t)) < H.burst / 10, `${j.kind} at ${t.toFixed(2)}`);
  }
  // heights (square.js's): the fields up to H.field, the tall rows up to H.tall, the burst only in its own pattern, up to H.burst
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
  assert.ok(H.field >= 5 && H.tall >= 15 && H.burst >= H.tall, 'big jets');
  assert.ok(field > H.field * 0.85 && field <= H.field + 1e-9, `the fields ${field.toFixed(1)} m`);
  assert.ok(edge > H.tall * 0.9 && edge <= H.tall + 1e-9, `the tall rows ${edge.toFixed(1)} m`);
  assert.ok(burst > H.burst * 0.9 && burst <= H.burst + 1e-9, `the burst ${burst.toFixed(1)} m`);
  for (const p of SHOW.filter((q) => q !== 'burst')) assert.equal(patternHeight(p, { kind: 'burst' }, 1.3), 0);
  // a wave rolls down the field: the rows' heights differ at one moment
  const rows = jets.filter((j) => j.kind === 'field' && j.c === 3).map((j) => patternHeight('wave', j, 2));
  assert.ok(Math.max(...rows) - Math.min(...rows) > 2);
});
