import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RaceTraffic, STUCK, laneAt, overlaps } from '../traffic.js';
import { Junctions, SIGNAL, pathsMeet } from '../junctions.js';

/**
 * Kickrani's junctions without a browser: roads laid out by the test, vehicles as stand-in boxes (what is
 * under test is who goes into a junction and when, not their look). The camera looks north from just
 * behind the origin.
 */
function street(roads) {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 3, 6);
  cam.lookAt(0, 1, -60);
  cam.updateMatrixWorld();
  const scene = new THREE.Scene();
  const game = { scene, camera: cam, roadsNear: () => roads, surfaceAt: () => 0, pos: { x: 0, z: 0 } };
  const t = new RaceTraffic(game, { course: null, racers: [], keepClear: () => false });
  t._make = (kind) => {
    const group = new THREE.Group();
    t.group.add(group);
    return { group, view: null, kind: kind === 'scooter' ? 'car' : kind, size: [2.25, 0.9], model: 'box' };
  };
  t._spawn = () => false;
  t._spawnOncoming = () => false;
  t._view();
  return t;
}

/** A car on `road` at `along` m from its start going `dir`, in its lane, at `speed` (top `top`). */
function put(t, road, along, dir, { speed = 6, top = 10, stopFor = 0 } = {}) {
  const made = t._make('car');
  const len = Math.hypot(road.pts[2] - road.pts[0], road.pts[3] - road.pts[1]);
  const at = { i: 0, t: along / len, dir };
  const lane = t._lane(road, 'car');
  const q = laneAt(road.pts, at, lane);
  const v = { ...made, road, at, lane, lat: lane, top, speed, v: speed, y: 0, box: { x: q.x, z: q.z, heading: q.heading, halfLength: 2.25, halfWidth: 0.9 }, missed: new Set(), stopFor, waited: 0, roll: 0 };
  t._born(v);
  return v;
}

const L = 260;
/** A crossroads at the origin: four two-way roads running out from it, and `per` cars coming in on each. */
function crossroads({ cls = 3, width = 12, per = 3 } = {}) {
  const roads = [
    { pts: [0, 0, 0, -L], cls, width, oneway: false },
    { pts: [0, 0, L, 0], cls, width, oneway: false },
    { pts: [0, 0, 0, L], cls, width, oneway: false },
    { pts: [0, 0, -L, 0], cls, width, oneway: false }
  ];
  const t = street(roads);
  const cars = [];
  for (const r of roads) for (let k = 0; k < per; k++) cars.push(put(t, r, 40 + k * 14, -1));
  for (const v of cars) v.from = v.road;
  return { t, roads, cars };
}

/** The street run `secs` seconds (the lights and the driving): what it came to. */
function run(t, cars, secs) {
  const dt = 1 / 30;
  const j = t.junctions.list[0];
  const out = { overlaps: 0, locked: 0, through: new Set(), askew: 0, stuck: 0, longest: 0 };
  const stood = new Map();
  for (let k = 0; k < secs / dt; k++) {
    t.junctions.tick(dt);
    for (const v of cars) t._drive(v, dt);
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      stood.set(a, a.speed < 0.3 ? (stood.get(a) ?? 0) + dt : 0);
      out.longest = Math.max(out.longest, a.stuckT ?? 0);
      if (a.stuckT > STUCK) out.stuck++;
      if (a.road !== a.from) out.through.add(a);
      // (standing in its lane askew: more than 15° off the lane's way)
      if (stood.get(a) > 1 && !a.turn) {
        const h = laneAt(a.road.pts, a.at, 0).heading;
        if (Math.abs(Math.atan2(Math.sin(a.box.heading - h), Math.cos(a.box.heading - h))) > (15 * Math.PI) / 180) out.askew++;
      }
      for (let n = i + 1; n < cars.length; n++) {
        const b = cars[n];
        if (overlaps(a.box, b.box, 0.05)) out.overlaps++;
        // two standing 2 s and more in the box, across each other's way: the junction locked
        const inBox = (v) => Math.hypot(v.box.x - j.x, v.box.z - j.z) < j.r;
        if (stood.get(a) > 2 && stood.get(b) > 2 && inBox(a) && inBox(b) && Math.abs(Math.sin(a.box.heading - b.box.heading)) > 0.5) out.locked++;
      }
    }
  }
  return out;
}

test('junctions: found where the roads meet — one box at a crossroads (a divided road\'s carriageways too), its ways in, lights where main roads cross', () => {
  const { t } = crossroads();
  assert.equal(t.junctions.list.length, 1);
  const j = t.junctions.list[0];
  assert.ok(Math.hypot(j.x, j.z) < 0.01 && j.r >= 6 && j.r < 12, `at the crossing, its box ${j.r} m round`);
  assert.equal(j.arms.length, 4);
  assert.ok(j.sig, 'lights');
  assert.deepEqual(new Set(j.arms.map((a) => a.group)), new Set([0, 1]), 'north–south one green, east–west the other');
  // a divided avenue (two one-way carriageways 14 m apart) crossing a two-way road: one junction, not two
  const divided = new Junctions([
    { pts: [-7, 200, -7, -200], cls: 2, width: 10, oneway: true },
    { pts: [7, -200, 7, 200], cls: 2, width: 10, oneway: true },
    { pts: [-200, 0, -7, 0], cls: 3, width: 9, oneway: false },
    { pts: [-7, 0, 7, 0], cls: 3, width: 9, oneway: false },
    { pts: [7, 0, 200, 0], cls: 3, width: 9, oneway: false }
  ]);
  assert.equal(divided.list.length, 1, `${divided.list.length} junctions`);
  assert.ok(divided.list[0].r > 10, 'its box takes in both carriageways');
  // where one road just goes on into the next round a bend: no junction
  assert.equal(new Junctions([{ pts: [0, 0, 0, -100], cls: 3, width: 9 }, { pts: [0, -100, 100, -100], cls: 3, width: 9 }]).list.length, 0);
});

test('junctions: the lights change — green, all red to clear the box, the other way — sooner when nobody comes on the green, never past the longest green', () => {
  const { t } = crossroads({ per: 0 });
  const J = t.junctions;
  const j = J.list[0];
  const a = j.arms.find((x) => x.group === j.sig.g);
  const b = j.arms.find((x) => x.group !== j.sig.g);
  const g0 = j.sig.g;
  j.sig.t = 0;
  // both ways busy: the green held its longest, then all red, then the other
  let t0 = 0;
  for (; t0 < 30 && j.sig.state === 'green'; t0 += 0.1) {
    J.touch(j, a, false);
    J.touch(j, b, true);
    J.tick(0.1);
  }
  assert.ok(Math.abs(t0 - SIGNAL.maxGreen) < 0.25, `green ${t0.toFixed(1)} s`);
  assert.ok(!J.green(j, a) && !J.green(j, b), 'all red');
  for (let k = 0; k <= SIGNAL.clear * 10; k++) J.tick(0.1);
  assert.equal(j.sig.g, 1 - g0);
  assert.ok(J.green(j, b) && !J.green(j, a), 'the other way green');
  // nobody coming on the green, someone waiting on the red: changed at the shortest green
  let t1 = 0;
  for (; t1 < 30 && j.sig.state === 'green'; t1 += 0.1) {
    J.touch(j, a, true);
    J.tick(0.1);
  }
  assert.ok(t1 < SIGNAL.minGreen + 1, `changed after ${t1.toFixed(1)} s`);
});

test('junctions: two ways through a box meet if they come within their widths of each other — a left turn across the straight on, not two going straight past each other', () => {
  const line = (x0, z0, x1, z1) => {
    const pts = [];
    for (let k = 0; k <= 10; k++) pts.push(x0 + ((x1 - x0) * k) / 10, z0 + ((z1 - z0) * k) / 10);
    return { pts, hw: 0.9 };
  };
  // straight on each way, 3 m apart
  assert.equal(pathsMeet(line(1.5, 8, 1.5, -8), line(-1.5, -8, -1.5, 8)), false);
  // across
  assert.equal(pathsMeet(line(1.5, 8, 1.5, -8), line(-8, -1.5, 8, -1.5)), true);
});

test('junctions: cars from all four ways through a crossroads with lights — never two locked across each other in the box, never one in another, none stuck, none standing askew', () => {
  const { t, cars } = crossroads({ per: 4 });
  const out = run(t, cars, 60);
  assert.equal(out.overlaps, 0, 'never one in another');
  assert.equal(out.locked, 0, 'never locked in the box');
  assert.equal(out.stuck, 0, `none stuck (longest ${out.longest.toFixed(1)} s)`);
  assert.equal(out.askew, 0, 'none standing askew in its lane');
  assert.ok(out.through.size >= cars.length * 0.75, `${out.through.size} of ${cars.length} through`);
});

test('junctions: without lights (small streets crossing) the box takes turns — first at the line goes first, nobody stops in it, all get through', () => {
  const { t, cars } = crossroads({ cls: 4, width: 7, per: 3 });
  for (const j of t.junctions.list) j.sig = null;
  const out = run(t, cars, 60);
  assert.equal(out.overlaps, 0, 'never one in another');
  assert.equal(out.locked, 0, 'never locked in the box');
  assert.equal(out.stuck, 0, `none stuck (longest ${out.longest.toFixed(1)} s)`);
  assert.ok(out.through.size >= cars.length * 0.75, `${out.through.size} of ${cars.length} through`);
});

test('junctions: with the road out past the box full, a car waits at the line — it never stops in the box, and it is waiting, not stuck', () => {
  const { t, roads } = crossroads({ per: 0 });
  const j = t.junctions.list[0];
  j.sig = null;
  const [, east, , west] = roads;
  // a queue standing on the road out east, just past the box
  for (let k = 0; k < 2; k++) put(t, east, j.r + 3 + k * 7, 1, { speed: 0, top: 0, stopFor: 1e9 });
  // one coming from the west, going straight on east
  const v = put(t, west, 60, -1, { speed: 8 });
  t._pickNext = (w) => (w === v ? { r: east, at: { i: 0, t: 0, dir: 1 }, hd: -Math.PI / 2, bend: 0 } : null);
  for (let k = 0; k < 30 * 15; k++) {
    t.junctions.tick(1 / 30);
    t._drive(v, 1 / 30);
  }
  assert.ok(v.speed < 0.3, 'standing');
  assert.ok(Math.hypot(v.box.x - j.x, v.box.z - j.z) > j.r + 1, `at the line, not in the box (${Math.hypot(v.box.x, v.box.z).toFixed(1)} m from its middle)`);
  assert.equal(v.jWhy, 'exit');
  assert.equal(v.waitWhy, 'signal', 'waiting at a junction');
  assert.equal(v.stuckT ?? 0, 0, 'not stuck');
});

test('traffic: cars park only where they leave the lanes clear — along the kerb, never out in a lane', () => {
  const t = street([{ pts: [0, 600, 0, -600], cls: 2, width: 14, oneway: false }]);
  // a two-way street 7 m wide (a lane each way): no room to park
  assert.equal(t._kerbPlace({ r: { cls: 4, width: 7, oneway: false }, width: 7, heading: 0, s: 1 }, 'car'), null);
  // 11 m: at the right kerb, a car going by eases over a little in its own lane
  const p = t._kerbPlace({ r: { cls: 4, width: 11, oneway: false }, width: 11, heading: 0, s: 1 }, 'car');
  assert.ok(p && p.lat > 0 && Math.abs(p.lat + p.hw - (5.5 - 0.1)) < 1e-9, 'along the right kerb');
  // a one-way lane ridden against its way: parked facing the lane's own way, at a kerb clear of its lane
  const o = t._kerbPlace({ r: { cls: 5, width: 7, oneway: true }, width: 7, heading: Math.PI, s: -1 }, 'car');
  assert.ok(o && Math.abs(Math.sin(o.heading)) < 1e-9 && Math.cos(o.heading) > 0.99, 'facing the one-way street\'s way');
});
