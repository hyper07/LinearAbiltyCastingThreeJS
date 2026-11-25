import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Walls, sweepSegment, RIDER_RADIUS } from '../../src/city/walls.js';
import { newScoot, stepScoot, GLANCE, SCOOT } from '../../src/city/scoot.js';
import { BIKE_COURSES, planCourse, finishCourse, centreLine } from '../../src/city/course.js';
import { seoulData, roadsNear, wallsNear } from './seoulData.mjs';

/** A square building, `size` m across, its middle at (x, z). */
function block(walls, x, z, size = 20) {
  const h = size / 2;
  walls.addRing([x - h, x + h, x + h, x - h], [z - h, z - h, z + h, z + h]);
}

const RIDE = (s, input, seconds, dt, walls, each) => {
  const outs = [];
  for (let t = 0; t < seconds; t += dt) {
    const o = stepScoot(s, input, dt, walls);
    outs.push(o);
    each?.(s, o);
  }
  return outs;
};

test('walls: a circle swept at a wall touches it, never passes it — even a whole frame past it', () => {
  // A wall along x = 5, a circle of 0.4 moving from x = 0 to x = 20 in one step.
  const h = sweepSegment(0, 0, 20, 0, 0.4, 5, -10, 5, 10);
  assert.ok(h, 'it is met');
  assert.ok(Math.abs(h.t * 20 - 4.6) < 1e-6, `stopped a radius short (${(h.t * 20).toFixed(3)})`);
  assert.ok(h.nx < -0.99, 'the face points back at it');
  // Moving away from a wall it touches is free.
  assert.equal(sweepSegment(4.7, 0, -3, 0, 0.4, 5, -10, 5, 10), null);
  // A wall's end is round: grazing past it misses.
  assert.equal(sweepSegment(0, 10.5, 20, 0, 0.4, 5, -10, 5, 10), null);
  const w = new Walls();
  block(w, 30, 0);
  assert.ok(w.inside(30, 0) && !w.inside(19, 0), 'inside a footprint, and not');
  assert.ok(Math.abs(w.ray(0, 0, 1, 0, 100) - 20) < 1e-6, 'a ray meets its face');
  const out = w.push(29, 1, 0.4);
  assert.ok(out.ok && !w.inside(out.x, out.z) && !w.hits(out.x, out.z, 0.39), `pushed out of it to ${out.x.toFixed(2)}, ${out.z.toFixed(2)}`);
});

test('walls: ridden straight at a building at 85 km/h it stops (and says how hard) — never inside, at 120 Hz or 10 fps', () => {
  for (const dt of [1 / 120, 1 / 60, 0.1]) {
    const w = new Walls();
    block(w, 0, -60, 20); // its near face at z = −50
    const s = newScoot(0, 0, 0); // heading north (−z), straight at it
    s.v = SCOOT.boostTop;
    let hit = 0;
    RIDE(s, { boost: true, throttle: true }, 4, dt, w, (q, o) => {
      hit = Math.max(hit, o.hit);
      assert.ok(!w.inside(q.x, q.z), `never inside (dt ${dt}): at ${q.x.toFixed(2)}, ${q.z.toFixed(2)}`);
      assert.ok(q.z > -50 + RIDER_RADIUS - 0.01, `never into the wall (z ${q.z.toFixed(3)})`);
    });
    assert.ok(hit > 8.3, `a head-on hit, hard enough to come off (${hit.toFixed(1)} m/s, dt ${dt})`);
  }
});

test('walls: met at a slant at 85 km/h it slides along the face, slowed, still riding — never inside', () => {
  const w = new Walls();
  // A long wall along x = 4, from z = 10 to z = −300 (a row of buildings).
  for (let z = 0; z > -300; z -= 20) block(w, 14, z - 10, 20);
  const s = newScoot(0, 0, -0.3); // north-east, about 17° into it
  s.v = SCOOT.boostTop;
  let glance = 0;
  let hit = 0;
  RIDE(s, { throttle: true, boost: true }, 3, 1 / 120, w, (q, o) => {
    glance = Math.max(glance, o.glance);
    hit = Math.max(hit, o.hit);
    assert.ok(!w.inside(q.x, q.z) && q.x < 4 - RIDER_RADIUS + 0.01, `outside the wall (x ${q.x.toFixed(3)})`);
  });
  assert.equal(hit, 0, 'no head-on hit');
  assert.ok(glance > 0 && glance <= GLANCE, `glanced off (${glance.toFixed(2)} rad)`);
  assert.ok(s.z < -40, 'on up the street');
  assert.ok(s.v > 8, `still going (${(s.v * 3.6).toFixed(0)} km/h)`);
});

test('walls: into a corner between two buildings, it stops in the corner, not through either', () => {
  const w = new Walls();
  block(w, 15, -10, 20); // east of x = 5
  block(w, -5, -30, 20); // north of z = −20
  const s = newScoot(0, 0, -0.6);
  s.v = 20;
  RIDE(s, { throttle: true }, 3, 1 / 60, w, (q) => assert.ok(!w.hits(q.x, q.z, RIDER_RADIUS - 0.02), `clear of both at ${q.x.toFixed(2)}, ${q.z.toFixed(2)}`));
});

test('walls: a thin garden wall is solid both ways', () => {
  const w = new Walls();
  w.addSegment(-10, -20, 10, -20);
  for (const [z0, hd] of [[0, 0], [-40, Math.PI]]) {
    const s = newScoot(0, z0, hd);
    s.v = SCOOT.boostTop;
    RIDE(s, { throttle: true }, 3, 0.1, w);
    assert.ok(Math.sign(s.z + 20) === Math.sign(z0 + 20), `stayed on its side (z ${s.z.toFixed(2)})`);
  }
});

test('course: an alley line the map drew through a building is moved into the gap beside it', () => {
  const w = new Walls();
  // Two rows of buildings with a 4 m gap between x = −1 and x = 3: the map's line runs at x = −2.
  for (let z = 0; z > -120; z -= 12) {
    w.addRing([-30, -1, -1, -30], [z, z, z - 10, z - 10]);
    w.addRing([3, 30, 30, 3], [z, z, z - 10, z - 10]);
  }
  const pts = [];
  for (let z = 0; z > -120; z -= 6) pts.push([-2, z, 4, 6, 0]);
  const moved = centreLine(pts, w, { open: true });
  for (let i = 1; i < moved.length - 1; i++) {
    assert.ok(!w.inside(moved[i][0], moved[i][1]), `point ${i} out of the buildings`);
    assert.ok(Math.abs(moved[i][0] - 1) < 0.6, `in the middle of the gap (x ${moved[i][0].toFixed(2)})`);
  }
});

/** Rides a course the way a bot does (aim a few points ahead, slow for corners), with the real walls. */
function followCourse(course, walls, seconds = 90) {
  const pts = course.points;
  const n = pts.length;
  const p0 = pts[0];
  const p1 = pts[1];
  const s = newScoot(p0[0], p0[1], Math.atan2(-(p1[0] - p0[0]), -(p1[1] - p0[1])));
  let idx = 0;
  let inside = 0;
  let hits = 0;
  const dt = 1 / 120;
  for (let t = 0; t < seconds; t += dt) {
    // nearest point a little behind and ahead of where it was
    let best = idx;
    let bd = Infinity;
    for (let k = -5; k < 30; k++) {
      const q = pts[(((idx + k) % n) + n) % n];
      const d = Math.hypot(q[0] - s.x, q[1] - s.z);
      if (d < bd) {
        bd = d;
        best = (((idx + k) % n) + n) % n;
      }
    }
    idx = best;
    const aim = pts[(idx + 2) % n];
    const want = Math.atan2(-(aim[0] - s.x), -(aim[1] - s.z));
    const off = Math.atan2(Math.sin(want - s.heading), Math.cos(want - s.heading));
    const a = pts[(idx + 3) % n];
    const b = pts[(idx + 6) % n];
    const bend = Math.abs(Math.atan2(Math.sin(Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.atan2(a[0] - pts[idx][0], a[1] - pts[idx][1])), Math.cos(Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.atan2(a[0] - pts[idx][0], a[1] - pts[idx][1]))));
    const top = bend > 0.5 ? 7 : bend > 0.25 ? 11 : 19;
    const o = stepScoot(s, { throttle: s.v < top, brake: s.v > top + 1.5, steer: Math.max(-1, Math.min(1, off * 2.4)) }, dt, walls);
    if (o.hit > 0) {
      hits++;
      // back on the course, as the race puts a rider back after a fall
      const q = pts[(idx + 1) % n];
      Object.assign(s, { x: q[0], z: q[1], v: 0, heading: want, travel: want });
      const fix = walls.push(s.x, s.z, RIDER_RADIUS);
      s.x = fix.x;
      s.z = fix.z;
    }
    if (walls.inside(s.x, s.z)) inside++;
  }
  return { inside, hits, idx };
}

const data = seoulData();
test('course: on Seoul\'s real streets a rider following each course never ends up inside a building', { skip: !data && 'no Seoul map converted here' }, () => {
  for (const def of BIKE_COURSES) {
    const walls = wallsNear(def.x, def.z, def.r * 4);
    const planned = planCourse(roadsNear(data.all, def, def.r * 4), def, { bike: true, walls });
    assert.ok(planned, `${def.id} planned`);
    const c = finishCourse(planned, { walls });
    // The course's own line is clear of the buildings (bar a corner clipped at a junction).
    let through = 0;
    for (let i = 0; i < c.points.length; i++) {
      const p = c.points[i];
      const q = c.points[(i + 1) % c.points.length];
      if (walls.insideAlong(p[0], p[1], q[0], q[1]) > 1.5) through++;
    }
    assert.ok(through <= 2, `${def.id}: ${through} stretches of the line run through a building`);
    const ride = followCourse(c, walls, 40);
    assert.equal(ride.inside, 0, `${def.id}: frames inside a building`);
    for (const sc of c.shortcuts) {
      assert.ok(sc.saves >= 15 && sc.width <= 4.7, `${sc.id}: saves ${sc.saves.toFixed(0)} m, ${sc.width} m wide`);
      for (const p of sc.points.slice(1, -1)) assert.ok(!walls.inside(p[0], p[1]), `${sc.id}: its line is out of the buildings`);
    }
  }
});

test('course: most courses have a golmok short cut that joins the course at both ends and saves real distance', { skip: !data && 'no Seoul map converted here' }, () => {
  let withOne = 0;
  for (const def of BIKE_COURSES) {
    const walls = wallsNear(def.x, def.z, def.r * 4);
    const c = finishCourse(planCourse(roadsNear(data.all, def, def.r * 4), def, { bike: true, walls }), { walls });
    if (c.shortcuts.length) withOne++;
    for (const sc of c.shortcuts) {
      const a = c.points[sc.from];
      const b = c.points[sc.to];
      assert.ok(Math.hypot(sc.points[0][0] - a[0], sc.points[0][1] - a[1]) < 0.01 && Math.hypot(sc.points.at(-1)[0] - b[0], sc.points.at(-1)[1] - b[1]) < 0.01, 'joins the course at both ends');
      assert.ok(sc.from > 5 && sc.to > sc.from && sc.to < c.points.length - 5, 'never across the start line');
      assert.ok(sc.length < sc.span - 15, `${sc.id}: shorter than the course it cuts out (${sc.length.toFixed(0)} vs ${sc.span.toFixed(0)} m)`);
    }
  }
  assert.ok(withOne >= 4, `${withOne} of ${BIKE_COURSES.length} courses have a short cut`);
});
