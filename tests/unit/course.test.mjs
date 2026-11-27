import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_COURSES, LEVELS, planCourse, finishCourse, locate, buildGraph, isSmall, sharpTurns, courseStats, turnCost, isLocal, ZIG_MIN_WIDTH, OPEN_LEAD, OPEN_RUNOUT } from '../../src/city/course.js';
import { behindStart } from '../../src/city/pack.js';
import { coasterTrack, coasterSpeed } from '../../src/city/fairground.js';
import { woodSpots } from '../../src/city/hillwood.js';
import { seoulData, roadsNear, wallsNear, seoulTerrain } from './seoulData.mjs';
import { readAlleys, SMALL_WIDTH } from '../../src/city/alleys.js';
import { encodeAlleys, keepWay } from '../../scripts/geo/seoul-alleys.mjs';
import { toLonLat } from '../../scripts/geo/tm.mjs';

/** A town of straight roads every 200 m (one through 0, 0), big ones every 600 m, 3 km across. */
function grid() {
  const roads = [];
  for (let k = -1400; k <= 1400; k += 200) {
    const cls = k % 600 === 0 ? 1 : 3;
    const line = (pts) => roads.push({ pts: Float32Array.from(pts), width: cls === 1 ? 18 : 11, cls });
    const along = [];
    const across = [];
    for (let t = -1500; t <= 1500; t += 50) {
      along.push(t, k);
      across.push(k, t);
    }
    line(along);
    line(across);
  }
  return roads;
}

const turnAt = (pts, i) => {
  const n = pts.length;
  const [a, b, c] = [pts[(i - 2 + n) % n], pts[i], pts[(i + 2) % n]];
  const t = Math.atan2(c[0] - b[0], c[1] - b[1]) - Math.atan2(b[0] - a[0], b[1] - a[1]);
  return Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
};

test('the road network joins where roads cross', () => {
  const nodes = buildGraph(grid(), 0, 0, 1000);
  const crossing = nodes.find((n) => n.x === 0 && n.z === 0);
  assert.ok(crossing, 'a node where two roads cross');
  assert.equal(crossing.adj.length, 4, 'four ways out of a crossroads');
});

test('a course is a closed loop on the roads, of a raceable length, that never turns round on itself', () => {
  const c = planCourse(grid(), { id: 'test', x: 0, z: 0, r: 600 });
  assert.ok(c, 'a course was planned');
  assert.ok(c.length > 1800 && c.length < 9000, `length ${c.length.toFixed(0)} m`);
  const n = c.points.length;
  // Points evenly spaced along the way (a little closer across a corner), and the end joins the start.
  for (let i = 1; i < n; i++) {
    const gap = Math.hypot(c.points[i][0] - c.points[i - 1][0], c.points[i][1] - c.points[i - 1][1]);
    assert.ok(gap > 3.5 && gap < 6.5, `points ${i - 1}–${i} are ${gap.toFixed(1)} m apart`);
  }
  assert.ok(Math.hypot(c.points[0][0] - c.points[n - 1][0], c.points[0][1] - c.points[n - 1][1]) < 12, 'it closes');
  for (let i = 0; i < n; i++) assert.ok(turnAt(c.points, i) < 2.3, `no turning round at point ${i}`);
  // On roads: every point on a grid line (or cutting a corner by a few metres, as a racing line does).
  for (const [x, z] of c.points) assert.ok(Math.min(Math.abs(((x % 200) + 200) % 200), 200 - Math.abs(((x % 200) + 200) % 200), Math.abs(((z % 200) + 200) % 200), 200 - Math.abs(((z % 200) + 200) % 200)) < 4, `${x},${z} is off the roads`);
  // No street driven twice.
  const seen = new Set();
  let again = 0;
  for (const [x, z] of c.points) {
    const k = `${Math.round(x)}|${Math.round(z)}`;
    if (seen.has(k)) again++;
    seen.add(k);
  }
  assert.ok(again < n * 0.05, `points driven twice: ${again}`);
});

test('the same roads always give the same course (so a room plans the same one everywhere)', () => {
  const a = planCourse(grid(), { id: 't', x: 100, z: -200, r: 700 });
  const b = planCourse(grid(), { id: 't', x: 100, z: -200, r: 700 });
  assert.deepEqual(a.points, b.points);
});

test('following a car round: the nearest point, searched ahead of the last, even past the line', () => {
  const c = planCourse(grid(), { id: 'test', x: 0, z: 0, r: 600 });
  const n = c.points.length;
  const p = c.points[10];
  const at = locate(c, p[0] + 1, p[1], 5);
  assert.equal(at.i, 10);
  assert.ok(at.off < 2);
  const end = c.points[n - 2];
  const wrapped = locate(c, c.points[2][0], c.points[2][1], n - 3);
  assert.equal(wrapped.i, 2, 'from the last points to the first, round the join');
  assert.equal(locate(c, end[0], end[1]).i, n - 2, 'with no hint, the whole course is searched');
});

test('the bike courses are short loops round Seoul neighbourhoods, named in English and Korean', () => {
  assert.ok(BIKE_COURSES.length >= 5);
  const ids = new Set();
  for (const c of BIKE_COURSES) {
    assert.ok(c.id && c.name && c.ko && c.text, c.id);
    assert.ok(c.r > 150 && c.r < 600, `${c.id}: a neighbourhood, not a district`);
    assert.ok(!c.run && !c.long, `${c.id}: no long runs in the bike race`);
    ids.add(c.id);
  }
  assert.equal(ids.size, BIKE_COURSES.length);
});

/** The grid, with a small street (an alley) every 100 m between its roads. */
function town() {
  const roads = grid();
  for (let k = -1300; k <= 1300; k += 200) {
    const along = [];
    const across = [];
    for (let t = -1500; t <= 1500; t += 50) {
      along.push(t, k);
      across.push(k, t);
    }
    roads.push({ pts: Float32Array.from(along), width: 3.6, cls: 6, small: true }, { pts: Float32Array.from(across), width: 3.6, cls: 6, small: true });
  }
  return roads;
}

test('a bike course is 1.4–3.4 km, never on a motorway, mostly on roads wide enough to race', () => {
  const roads = town();
  // A motorway straight through the middle: a bike must never use it.
  const m = [];
  for (let t = -1500; t <= 1500; t += 50) m.push(t, 100);
  roads.push({ pts: Float32Array.from(m), width: 22, cls: 0 });
  const c = planCourse(roads, { id: 'b', x: 0, z: 0, r: 320 }, { bike: true });
  assert.ok(c, 'a course was planned');
  assert.ok(c.length >= 1400 && c.length <= 3400, `length ${Math.round(c.length)} m`);
  // the main loop keeps to the roads: not one point down an alley (they are for the short cuts)
  assert.equal(c.points.filter((p) => isSmall(p[3])).length, 0);
  for (const p of c.points) assert.equal(p.length, 5, 'each point says its width, class and one-way');
  assert.ok(!c.points.some((p) => p[3] === 0), 'no motorway');
  const small = c.points.filter((p) => isSmall(p[3])).length / c.points.length;
  // At 70 km/h: mostly the roads (here every alley is a narrow one running beside a road, so none is a short cut).
  assert.ok(small < 0.45, `mostly roads (${Math.round(small * 100)}% small streets)`);
  assert.ok(sharpTurns(c.points) <= 8, `few hard corners (${sharpTurns(c.points)})`);
  for (let i = 0; i < c.points.length; i++) assert.ok(turnAt(c.points, i) < 2.3, `no turning round at ${i}`);
  // The same streets, the same course: everyone in a room plans it alike.
  assert.deepEqual(planCourse(roads, { id: 'b', x: 0, z: 0, r: 320 }, { bike: true }).points, c.points);
});

test('the small streets file: kept ways, written and read back in world metres', () => {
  assert.equal(keepWay({ highway: 'service', service: 'alley' }), true);
  assert.equal(keepWay({ highway: 'living_street' }), true);
  assert.equal(keepWay({ highway: 'footway', footway: 'sidewalk' }), false, 'a pavement beside a road is not a street');
  assert.equal(keepWay({ highway: 'service', service: 'parking_aisle' }), false);
  assert.equal(keepWay({ highway: 'residential', access: 'private' }), false);
  assert.equal(keepWay({ highway: 'primary' }), false, 'main roads are in roads.bin');
  // Two ways near City Hall: an alley 3 m wide, and a lane of no known width.
  const O = { x: 198050, y: 551860 };
  const geo = (pts) => pts.map(([x, y]) => toLonLat(O.x + x, O.y + y)).map(([lon, lat]) => ({ lon, lat }));
  const elements = [
    { type: 'way', id: 1, tags: { highway: 'service', service: 'alley', width: '3' }, geometry: geo([[0, 0], [40, 0], [40, 30]]) },
    { type: 'way', id: 2, tags: { highway: 'residential' }, geometry: geo([[-100, 50], [-100, 150]]) },
    { type: 'way', id: 3, tags: { highway: 'footway', footway: 'crossing' }, geometry: geo([[0, 0], [5, 5]]) }
  ];
  const { buffer, count } = encodeAlleys(elements, [{ x0: O.x - 500, x1: O.x + 500, y0: O.y - 500, y1: O.y + 500 }]);
  assert.equal(count, 2);
  const back = readAlleys(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), O);
  assert.equal(back.length, 2);
  assert.equal(back[0].cls, 6);
  assert.equal(back[0].width, 3);
  assert.equal(back[1].width, SMALL_WIDTH[5]);
  // North is −z in the world.
  assert.ok(Math.abs(back[0].pts[4] - 40) < 0.5 && Math.abs(back[0].pts[5] + 30) < 0.5, `${back[0].pts[4]},${back[0].pts[5]}`);
  assert.deepEqual(readAlleys(new ArrayBuffer(8), O), []);
});

test('turning costs a racer: a straight run is free, a 90° corner dear, a turn-round never', () => {
  assert.equal(turnCost(0), 0);
  assert.ok(turnCost(0.3) < 5);
  assert.ok(turnCost(Math.PI / 2) > 150 && turnCost(Math.PI / 2) > turnCost(0.9) * 3);
  assert.ok(turnCost(2.6) > 1e4);
});

const seoul = seoulData();
test('the bike courses on Seoul\'s real streets, by level: boulevards (Easy), avenues and corners (Medium), tight streets and square corners (Hard)', { skip: !seoul && 'no Seoul map converted here' }, () => {
  const kinds = new Set();
  const byLevel = { easy: [], medium: [], hard: [] };
  for (const def of BIKE_COURSES) {
    const walls = wallsNear(def.x, def.z, def.r * 4);
    const planned = planCourse(roadsNear(seoul.all, def, def.r * 4), def, { bike: true, walls });
    assert.ok(planned, `${def.id}: planned`);
    const c = finishCourse(planned, { walls });
    const st = courseStats(c);
    kinds.add(def.kind);
    byLevel[def.level].push(def.id);
    // one-way roads only with their traffic
    assert.equal(c.points.filter((p) => p[4] === -1).length, 0, `${def.id}: against a one-way road`);
    if (def.zigzag) {
      // a zig-zag: through the local streets, corner after corner, left and right in turn
      if (c.open) assert.ok(c.length > 1500 && c.length < 3300, `${def.id}: ${Math.round(c.length)} m`);
      else assert.ok(c.length > 1700 && c.length < 3600, `${def.id}: ${Math.round(c.length)} m`);
      if (def.roads !== 'avenues') assert.ok(st.local >= 0.6, `${def.id}: ${Math.round(st.local * 100)}% on local streets`);
      // (a hill road's are linked bends more than square corners: ten or more over 30°, counted on their own below)
      if (def.mountain) assert.ok(st.turns.filter((t) => t.angle > Math.PI / 6).length >= 8, `${def.id}: ${st.turns.length} bends`);
      else assert.ok(st.switches >= 4, `${def.id}: ${st.switches} left/right switches`);
      if (def.roads !== 'avenues' && !def.mountain) assert.ok(st.sharp + st.switches >= 10, `${def.id}: ${st.sharp} sharp turns, ${st.switches} switches`);
      // never down a golmok narrower than ZIG_MIN_WIDTH (but for a course drawn along one on purpose)
      if (!def.minRoad) assert.equal(c.points.filter((p) => isSmall(p[3]) && (p[2] ?? 6) < ZIG_MIN_WIDTH - 0.01).length, 0, `${def.id}: down a golmok`);
    } else if (def.level === 'easy') {
      assert.ok(c.length > 1800 && c.length < 3300, `${def.id}: ${Math.round(c.length)} m`);
      assert.equal(st.small, 0, `${def.id}: no residential lanes on the main loop`);
      // (the hill road is one lane each way by nature; every other course two or more, most of the way)
      if (def.kind !== 'Hill') assert.ok(st.wide >= 0.72, `${def.id}: ${Math.round(st.wide * 100)}% on roads two lanes or more each way`);
      assert.ok(st.sharp <= 4, `${def.id}: ${st.sharp} turns sharper than 60°`);
      assert.ok(st.firstCorner >= 250, `${def.id}: ${Math.round(st.firstCorner)} m to the first corner`);
    } else if (def.level === 'medium') {
      assert.ok(c.length > 1800 && c.length < 3600, `${def.id}: ${Math.round(c.length)} m`);
      assert.ok(st.wide <= 0.8, `${def.id}: avenues, not boulevards (${Math.round(st.wide * 100)}% wide)`);
      assert.ok(st.small <= 0.35, `${def.id}: a little of the residential lanes at most (${Math.round(st.small * 100)}%)`);
      assert.ok(st.sharp >= 6 && st.sharp <= 10, `${def.id}: ${st.sharp} turns sharper than 60° (6–10)`);
      assert.ok(st.firstCorner >= 150, `${def.id}: ${Math.round(st.firstCorner)} m to the first corner`);
    } else if (c.open) {
      // a point-to-point run: down a hill, its finish well below its start
      assert.ok(c.length > 1500 && c.length < 3200, `${def.id}: ${Math.round(c.length)} m`);
      assert.ok(c.finishI > c.startI && c.s[c.finishI] - c.s[c.startI] === c.length, `${def.id}: raced from its start line to its finish line`);
    } else {
      assert.ok(c.length > 1500 && c.length < 3300, `${def.id}: ${Math.round(c.length)} m`);
      assert.ok(st.wide <= 0.5, `${def.id}: tight streets (${Math.round(st.wide * 100)}% wide)`);
      assert.ok(st.sharp >= 8 && st.square >= 6, `${def.id}: ${st.sharp} turns over 60°, ${st.square} over 80°`);
      assert.ok(st.firstCorner >= 120, `${def.id}: ${Math.round(st.firstCorner)} m to the first corner`);
    }
  }
  for (const k of ['River', 'Avenue', 'Market', 'Hill', 'Towers', 'Fairground', 'Downhill']) assert.ok(kinds.has(k), k);
  for (const [level, ids] of Object.entries(byLevel)) assert.ok(ids.length >= 3, `${level}: ${ids.join(', ')}`);
  assert.ok(BIKE_COURSES.length >= 12 && BIKE_COURSES.length <= 24);
});

test('the hill roads (Hard, one way like the Bukak Skyway): roads cars use, on real slopes, linked bends, a run of about three minutes', { skip: !seoul && 'no Seoul map converted here' }, () => {
  const ground = seoulTerrain();
  const hillRoads = BIKE_COURSES.filter((c) => c.mountain && c.zigzag);
  assert.deepEqual(hillRoads.map((c) => c.id), ['bukak', 'inwangsan']);
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lines = new Map();
  for (const def of hillRoads) {
    assert.equal(def.level, 'hard', def.id);
    assert.ok(def.open && def.name && /[가-힣]/.test(def.ko) && def.text, def.id);
    const walls = wallsNear(def.x, def.z, def.r * 4);
    const c = finishCourse(planCourse(roadsNear(seoul.all, def, def.r * 4), def, { bike: true, walls }), { walls });
    const st = courseStats(c);
    const run = c.points.slice(c.startI, c.finishI + 1);
    lines.set(def.id, run);
    // 2.2–3.0 km from line to line (about three minutes at a hill road's pace)
    assert.ok(c.length > 2200 && c.length < 3000, `${def.id}: ${Math.round(c.length)} m`);
    // on the roads cars use, one lane each way (or a two-lane one-way street in a village): never a boulevard, never down a
    // golmok, never against a one-way road
    assert.ok(st.wide <= 0.2, `${def.id}: ${Math.round(st.wide * 100)}% on roads two lanes or more each way`);
    assert.ok(run.every((p) => p[3] >= 3 && p[3] <= 5 && (p[2] ?? 8) >= 7), `${def.id}: off the secondary, tertiary and residential roads`);
    assert.equal(run.filter((p) => p[4] === -1).length, 0, `${def.id}: against a one-way road`);
    // bends: eight or more over 30°, one of them past 57°
    const bends = st.turns.filter((t) => t.angle > Math.PI / 6);
    assert.ok(bends.length >= 8, `${def.id}: ${bends.length} bends over 30°`);
    assert.ok(bends.some((t) => t.angle > 1), `${def.id}: a bend over 57°`);
    // on real slopes: 120 m or more up and down between the start and the finish, a 15 % stretch or steeper
    if (ground) {
      const h = run.filter((_, i) => i % 5 === 0).map((p) => ground(p[0], p[1]));
      let up = 0;
      let down = 0;
      let steep = 0;
      for (let i = 1; i < h.length; i++) (h[i] > h[i - 1] ? (up += h[i] - h[i - 1]) : (down += h[i - 1] - h[i]));
      for (let i = 2; i < h.length; i++) steep = Math.max(steep, Math.abs(h[i] - h[i - 2]) / Math.max(1, c.s[c.startI + i * 5] - c.s[c.startI + (i - 2) * 5]));
      assert.ok(up + down >= 120, `${def.id}: ${Math.round(up)} m up, ${Math.round(down)} m down`);
      assert.ok(steep >= 0.15, `${def.id}: the steepest stretch ${Math.round(steep * 100)} %`);
    }
  }
  // each in a place of its own: no two share more than a junction's worth of road
  const ids = [...lines.keys()];
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const A = lines.get(ids[a]);
      const B = lines.get(ids[b]);
      const shared = A.filter((p, i) => i % 3 === 0 && B.some((q) => near(p, q) < 12)).length * 3 * 6;
      assert.ok(shared < 120, `${ids[a]} and ${ids[b]} share ${shared} m`);
    }
  }
});

test('a zig-zag through a grid of local streets: one lane each way, corner after corner, left and right in turn — never down the golmok, the arterial only to cross', () => {
  // residential streets (8.5 m) every 100 m, golmok (3.6 m) between them, an eight-lane boulevard through the middle
  const roads = [];
  for (let k = -800; k <= 800; k += 50) {
    const along = [];
    const across = [];
    for (let t = -900; t <= 900; t += 25) {
      along.push(t, k);
      across.push(k, t);
    }
    const lane = k % 100 === 0;
    roads.push({ pts: Float32Array.from(along), width: lane ? 8.5 : 3.6, cls: lane ? 5 : 6, small: true }, { pts: Float32Array.from(across), width: lane ? 8.5 : 3.6, cls: lane ? 5 : 6, small: true });
  }
  const boulevard = [];
  for (let t = -900; t <= 900; t += 25) boulevard.push(t, 0);
  roads.push({ pts: Float32Array.from(boulevard), width: 27, cls: 2, lanes: 8 });
  // a staircase up to the north-east and back down the other side
  const via = [[-400, 300], [-300, 200], [-200, 100], [-100, -100], [0, -200], [100, -300], [300, -300], [300, 100], [200, 300]];
  const c = planCourse(roads, { id: 'zz', x: 0, z: 0, r: 300, level: 'medium', zigzag: true, via }, { bike: true });
  assert.ok(c, 'planned');
  const st = courseStats(c);
  assert.ok(st.switches >= 4, `${st.switches} left/right switches`);
  assert.ok(st.sharp >= 6, `${st.sharp} sharp corners`);
  assert.equal(c.points.filter((p) => p[2] < ZIG_MIN_WIDTH).length, 0, 'no golmok on the main line');
  assert.ok(st.local > 0.9, `${Math.round(st.local * 100)}% local`);
  assert.ok(isLocal([0, 0, 8.5, 5, 0]) && !isLocal([0, 0, 27, 2, 0]) && !isLocal([0, 0, 3.6, 6, 0]));
  // its traffic: lighter than its level's on the avenues, kept off the level tabs
  assert.ok(LEVELS['medium-local'].oncoming < LEVELS.medium.oncoming && LEVELS['hard-local'].parked < LEVELS.hard.parked);
  assert.deepEqual(Object.keys(LEVELS), ['easy', 'medium', 'hard']);
});

test('a point-to-point course: from its first point to its last, its start line a little in, its finish a run-out short of the end', () => {
  const roads = grid();
  const def = { id: 'down', x: 0, z: 0, r: 500, level: 'hard', open: true, via: [[-1200, -400], [200, -400], [200, 400], [800, 400]] };
  const planned = planCourse(roads, def, { bike: true });
  assert.ok(planned?.open, 'planned, with ends');
  const c = finishCourse(planned);
  assert.ok(Math.hypot(c.points[0][0] + 1200, c.points[0][1] + 400) < 2, 'it starts at the first point');
  assert.ok(Math.hypot(c.points.at(-1)[0] - 800, c.points.at(-1)[1] - 400) < 8, 'it ends at the last');
  assert.ok(c.s[c.startI] >= OPEN_LEAD && c.s[c.startI] < OPEN_LEAD + 7, 'the start line a grid\'s length in');
  assert.ok(c.total - c.s[c.finishI] >= OPEN_RUNOUT - 7, 'room past the finish to stop');
  assert.equal(c.length, c.s[c.finishI] - c.s[c.startI]);
  assert.equal(c.shortcuts.length, 0);
  const st = courseStats(c);
  assert.equal(st.square, 2, 'its two corners, and no turn from its end back round to its start');
  // the grid behind the start line, on the course's own road
  const at = behindStart(c, 6);
  assert.ok(Math.abs(Math.hypot(at.x - c.points[c.startI][0], at.z - c.points[c.startI][1]) - 6) < 1, 'six metres back from the line');
});

test('the fairground\'s coaster climbs a lift hill, drops, and comes home', () => {
  const track = coasterTrack();
  const ys = Array.from({ length: 200 }, (_, i) => track.getPointAt(i / 200).y);
  assert.ok(Math.max(...ys) > 18, `a lift hill (${Math.max(...ys).toFixed(1)} m)`);
  assert.ok(Math.min(...ys) < 3.5, 'down to the ground');
  assert.ok(track.getPointAt(0).distanceTo(track.getPointAt(0.999)) < 2, 'a closed track');
  assert.ok(coasterSpeed(20, true) < 4 && coasterSpeed(3, false) > 15, 'slow up the chain, fast at the bottom of the drop');
});

test('the woods on a hill keep off the road', () => {
  const points = [];
  for (let i = 0; i < 100; i++) points.push([i * 6, 0, 7, 6, 0]);
  const wild = new Uint8Array(100).fill(1);
  const trees = woodSpots(points, wild);
  assert.ok(trees.length > 100, `${trees.length} trees`);
  for (const t of trees) assert.ok(Math.abs(t.z) > 3.5 + 1.5, `a tree ${t.z.toFixed(1)} m from the middle of a 7 m road`);
  assert.equal(woodSpots(points, new Uint8Array(100)).length, 0, 'none where the course is not out on the hill');
});
