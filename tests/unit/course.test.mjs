import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSES, planCourse, locate, buildGraph } from '../../src/city/course.js';

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

test('the Seoul courses are each round a place, with a name in English and Korean', () => {
  assert.ok(COURSES.length >= 4);
  for (const c of COURSES) assert.ok(c.id && c.name && c.ko && c.text && c.r > 0);
});
