import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_COURSES, planCourse, locate, buildGraph, isSmall } from '../../src/city/course.js';
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

test('a bike course is 1.4–3.4 km, never on a motorway, and goes through small streets as well as big roads', () => {
  const roads = town();
  // A motorway straight through the middle: a bike must never use it.
  const m = [];
  for (let t = -1500; t <= 1500; t += 50) m.push(t, 100);
  roads.push({ pts: Float32Array.from(m), width: 22, cls: 0 });
  const c = planCourse(roads, { id: 'b', x: 0, z: 0, r: 320 }, { bike: true });
  assert.ok(c, 'a course was planned');
  assert.ok(c.length >= 1400 && c.length <= 3400, `length ${Math.round(c.length)} m`);
  for (const p of c.points) assert.equal(p.length, 4, 'each point says its width and class');
  assert.ok(!c.points.some((p) => p[3] === 0), 'no motorway');
  const small = c.points.filter((p) => isSmall(p[3])).length / c.points.length;
  assert.ok(small > 0.15, `some of it in the small streets (${Math.round(small * 100)}%)`);
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
