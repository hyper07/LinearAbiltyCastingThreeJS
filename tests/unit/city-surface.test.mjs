import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceOf, segY, walkY } from '../../src/city/surface.js';

/**
 * A junction on a hill, laid as SeoulGame's _roadMesh lays it: two roads crossing, each in stretches
 * 10 m long that overlap through the crossing, each edge on the ground (0.9 m over it), and the
 * pavements either side cut where they meet the other road.
 */
const SLOPE = 0.06; // rising to the east
const ground = (x) => x * SLOPE;
const KERB = 0.14;

/** A road along a straight line, in 10 m stretches: { ax, ay, … } as _roadMesh records them. */
function road(ax, az, bx, bz, width, { draped = true } = {}) {
  const half = width / 2;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  const pts = [];
  for (let d = 0; d <= L + 1e-6; d += 10) {
    const x = ax + ux * d;
    const z = az + uz * d;
    const y = ground(x) + 0.9;
    // its edges (left of the way it runs, as _roadMesh: x − dz·half; right: x + dz·half) on the ground — or level with its middle
    pts.push({ x, z, y, L: draped ? ground(x - uz * half) + 0.9 : y, R: draped ? ground(x + uz * half) + 0.9 : y });
  }
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const s = { ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, half: half + 0.5 };
    if (draped) Object.assign(s, { w: half, aL: a.L, aR: a.R, bL: b.L, bR: b.R });
    segs.push(s);
  }
  return segs;
}

/** A pavement strip beside a road (3 m wide, a kerb up), from `t0` to `t1` metres along it. */
function pavement(ax, az, bx, bz, width, side, t0, t1) {
  const half = width / 2;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  // to the right of the line: (dz, −dx)
  const at = (t, off) => ground(ax + ux * t + uz * off * side) + 0.9 + KERB;
  return { ax: ax + ux * t0, az: az + uz * t0, bx: ax + ux * t1, bz: az + uz * t1, ya: at(t0, half), yb: at(t1, half), oa: at(t0, half + 3), ob: at(t1, half + 3), inner: half, outer: half + 3, side };
}

// East–west: 12 m wide along z = 0. North–south: 20 m wide along x = 0 (rising across it, west to east).
const EW = 12;
const NS = 20;
const roads = (draped = true) => [...road(-60, 0, 60, 0, EW, { draped }), ...road(0, -60, 0, 60, NS, { draped })];
// The north–south road's pavements, cut where the east–west road crosses them (and its own, where the other crosses).
const walks = [
  pavement(0, -60, 0, 60, NS, 1, 0, 60 - EW / 2),
  pavement(0, -60, 0, 60, NS, 1, 60 + EW / 2, 120),
  pavement(0, -60, 0, 60, NS, -1, 0, 60 - EW / 2),
  pavement(0, -60, 0, 60, NS, -1, 60 + EW / 2, 120),
  pavement(-60, 0, 60, 0, EW, 1, 0, 60 - NS / 2),
  pavement(-60, 0, 60, 0, EW, 1, 60 + NS / 2, 120)
];

/** Riding along a line through the junction: the height underfoot every 20 cm, each asked from the last. */
function ride(rs, ws, x0, z0, x1, z1) {
  const out = [];
  let y = null;
  const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.2);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    y = surfaceOf(ground(x), rs, ws, x, z, y == null ? Infinity : y + 0.3);
    out.push({ x, z, y });
  }
  return out;
}
/** The biggest jump between neighbouring samples beyond the hill's own climb. */
const worstStep = (samples) => Math.max(...samples.slice(1).map((p, i) => Math.abs(p.y - samples[i].y - (ground(p.x) - ground(samples[i].x)))));

test('a junction on a hill rides flat: the roads crossing it lie on one surface, the crossing pavements never in the road', () => {
  // Along the east–west road (crossing the 20 m road the hill rises across), in each lane and on the line.
  for (const z of [-4, -1.5, 0, 2, 4.5]) {
    const s = ride(roads(), walks, -40, z, 40, z);
    assert.ok(worstStep(s) < 0.02, `east-west at z ${z}: a step of ${worstStep(s).toFixed(3)} m`);
  }
  // Along the north–south road (across the 12 m one), and diagonally through the box (a corner cut).
  for (const x of [-8, 0, 8]) {
    const s = ride(roads(), walks, x, -40, x, 40);
    assert.ok(worstStep(s) < 0.02, `north-south at x ${x}: a step of ${worstStep(s).toFixed(3)} m`);
  }
  const d = ride(roads(), walks, -9, -5, 9, 5);
  assert.ok(worstStep(d) < 0.02, `across the box: ${worstStep(d).toFixed(3)} m`);
  // Flat across at each road's middle (as they were drawn), the 20 m road stood 0.6 m proud of the other at its edge.
  const flat = ride(roads(false), [], -40, 2, 40, 2);
  assert.ok(worstStep(flat) > 0.3, `the old ledge: ${worstStep(flat).toFixed(3)} m`);
});

test('the kerbs stay: the pavement beside a road is a step up from it, and on a slope it follows the ground', () => {
  // North of the junction, from the north–south road's east lane onto its east pavement.
  const s = ride(roads(), walks, 7, 30, 13, 30);
  const step = worstStep(s);
  assert.ok(Math.abs(step - KERB) < 0.02, `a kerb of ${step.toFixed(3)} m`);
  const on = surfaceOf(ground(12), roads(), walks, 12, 30, Infinity);
  assert.ok(Math.abs(on - (ground(12) + 0.9 + KERB)) < 0.01, 'on the pavement: its own height there');
  // A pavement strip's height across it, and a draped road's across it.
  assert.equal(walkY(walks[0], 12, -100), null, 'off its end');
  const r = road(0, -60, 0, 60, NS)[3];
  assert.ok(Math.abs(segY(r, -10, -25, 0.5) - (ground(-10) + 0.9)) < 1e-6 && Math.abs(segY(r, 10, -25, 0.5) - (ground(10) + 0.9)) < 1e-6, 'edges on the ground');
});

test('a crack between pavements at a junction corner is ridden over, not dropped into; a real drop off the edge stays', () => {
  // North of the crossing, east side: the north–south road’s pavement (from z = 12) two metres short of the east–west one’s (z 6–9).
  const gap = [pavement(0, -60, 0, 60, NS, 1, 72, 120), pavement(-60, 0, 60, 0, EW, -1, 60 + NS / 2, 120)];
  const s = ride(roads(), gap, 11.5, 16, 11.5, 7);
  assert.ok(worstStep(s) < 0.03, `over the crack: ${worstStep(s).toFixed(3)} m`);
  // Asked from nowhere (placing something), the crack is the ground.
  assert.ok(Math.abs(surfaceOf(ground(11.5), roads(), gap, 11.5, 10) - ground(11.5)) < 1e-6);
  // Well past a pavement's outer edge, the ground (a metre down): still a drop.
  const off = ride(roads(), walks, 11.5, 30, 16, 30);
  assert.ok(worstStep(off) > 0.8, `off the edge: ${worstStep(off).toFixed(3)} m`);
});

test('what is put down stands on what is drawn: no crack bridged, and a pavement round a bend by its drawn (mitred) corners', () => {
  // The crack between pavements: someone walking over it (asked from their height) is carried over; a
  // person, a sign or a bin put down in it (`exact`) stands on the ground drawn there.
  const gap = [pavement(0, -60, 0, 60, NS, 1, 72, 120), pavement(-60, 0, 60, 0, EW, -1, 60 + NS / 2, 120)];
  const from = ground(11.5) + 0.9 + KERB + 0.3;
  assert.ok(surfaceOf(ground(11.5), roads(), gap, 11.5, 10.5, from) > ground(11.5) + 0.9, 'walked over');
  assert.ok(Math.abs(surfaceOf(ground(11.5), roads(), gap, 11.5, 10.5, from, false, true) - ground(11.5)) < 1e-6, 'put down: the ground');
  // Just past a road's edge, where nothing is laid: a rider is carried on at its height, a thing put down is on the ground.
  const by = ground(-30) + 0.9 + 0.3;
  assert.ok(surfaceOf(ground(-30), roads(), [], -30, 6.3, by) > ground(-30) + 0.8, 'ridden: the road');
  assert.ok(Math.abs(surfaceOf(ground(-30), roads(), [], -30, 6.3, by, false, true) - ground(-30)) < 1e-6, 'put down: the ground');
  // A strip from (0, 0) to (10, 0), 2–5 m to its right (z −2 … −5), its far end mitred for a bend (the
  // outer corner 2 m on from square): on it by the drawn quad, not by the square.
  const y = 1;
  const q = [0, -2, y, 0, -5, y, 12, -5, y, 10, -2, y];
  const strip = { ax: 0, az: 0, bx: 10, bz: 0, ya: y, yb: y, oa: y, ob: y, inner: 2, outer: 5, side: 1, q };
  assert.equal(walkY({ ...strip, q: undefined }, 11.4, -4.6), null, 'square to its line: off its end');
  assert.equal(walkY(strip, 11.4, -4.6), y, 'as drawn: on it');
  assert.equal(walkY(strip, 9, -1), null, 'off its inner edge');
  assert.equal(walkY(strip, 5, -3.5), y, 'in its middle');
  // (within reach of it, as a crack is asked: by its line, as before)
  assert.ok(walkY(strip, 11, -1.5, 1.2) != null);
});
