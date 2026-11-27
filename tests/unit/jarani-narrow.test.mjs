import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { isNarrow, narrowPoint, narrowRoad, NARROW } from '../../games/g_cv2yrhrpv2/alleys.js';
import { RaceTraffic } from '../../games/g_cv2yrhrpv2/traffic.js';

/**
 * Kickrani's narrow streets are people's only: no car, taxi, truck, bus or delivery scooter drives,
 * parks or stands in one. The rule (alleys.js isNarrow) and every way the race's traffic is put down.
 */

test('narrow: every alley, a residential lane under 7 m, a two-way main road under 6 m — not the wider ones', () => {
  // golmok, service lanes, living streets, market lanes, footways: always, however wide
  for (const cls of [6, 7]) for (const w of [2.6, 3.4, 5, 8]) assert.equal(isNarrow(cls, w), true, `class ${cls}, ${w} m`);
  // residential lanes (no markings): under 7 m narrow (the map's 6.2 m when it doesn't say)
  assert.equal(isNarrow(5, 6.2), true);
  assert.equal(isNarrow(5, 6.9), true);
  assert.equal(isNarrow(5, undefined), true, 'no width given: the 6.2 m default');
  assert.equal(isNarrow(5, NARROW.lane), false);
  assert.equal(isNarrow(5, 8), false);
  // main roads (marked): under 3 m a direction
  assert.equal(isNarrow(4, 4.85), true, 'one lane for both ways');
  assert.equal(isNarrow(4, 4.4), true, 'a two-way link');
  assert.equal(isNarrow(4, 8), false, 'a tertiary road');
  assert.equal(isNarrow(4, 6), false);
  assert.equal(isNarrow(4, 4.25, true), false, 'a one-lane one-way street');
  assert.equal(isNarrow(1, 18), false);
  assert.equal(isNarrow(undefined, 3), false, 'unknown class: not narrow');
  // roads and course points the same
  assert.equal(narrowRoad({ cls: 6, width: 4, oneway: false }), true);
  assert.equal(narrowRoad({ cls: 3, width: 11, oneway: false }), false);
  assert.equal(narrowPoint([0, 0, 6.2, 5, 0]), true, 'a 6 m Euljiro lane');
  assert.equal(narrowPoint([0, 0, 7.5, 5, 0]), false);
  assert.equal(narrowPoint([0, 0, 5, 4, 1]), false, 'a one-way main road');
  assert.equal(narrowPoint([0, 0, 5, 4, 0]), true);
});

/** A race's traffic beside a wide road and an alley; with `course`, a straight course up one of them. */
function scene({ on = 'alley', level = 'hard' } = {}) {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 3, 6);
  cam.lookAt(0, 1, -60);
  cam.updateMatrixWorld();
  const s = new THREE.Scene();
  s.fog = new THREE.Fog('#ffffff', 60, 200);
  const wide = { pts: [0, 600, 0, -600], cls: 3, width: 11, oneway: false };
  const alley = { pts: [40, 600, 40, -600], cls: 6, width: 4, oneway: false, small: true };
  const lane = { pts: [-40, 600, -40, -600], cls: 5, width: 6.2, oneway: false, small: true };
  const roads = [wide, alley, lane];
  const road = { wide, alley, lane }[on];
  const points = [];
  for (let z = 590; z >= -590; z -= 5) points.push([road.pts[0], z, road.width, road.cls, 0]);
  const sArr = points.map((_, i) => i * 5);
  const course = { def: { level }, points, s: sArr, length: sArr.at(-1), open: true, startI: 0, finishI: points.length - 1, shortcuts: [], walls: null };
  const game = { scene: s, camera: cam, roadsNear: () => roads, surfaceAt: () => 0, pos: { x: 0, z: 0 } };
  const race = { course, racers: [], keepClear: () => false };
  const t = new RaceTraffic(game, race);
  t._make = (kind) => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 4.5)));
    t.group.add(group);
    return { group, view: null, kind, size: [2.25, 0.9], model: 'box' };
  };
  t._ride = () => true;
  t._view();
  return { t, wide, alley, lane, course };
}

test('narrow: no vehicle of any kind is put down in an alley or a narrow lane, nor turns into one', () => {
  const { t, wide, alley, lane } = scene({ on: 'wide' });
  for (const kind of ['car', 'bus', 'scooter']) assert.deepEqual(t._roads(0, 0, kind), [wide], `${kind}: the wide road only`);
  const me = { x: 0, z: 0, heading: 0, me: true, idx: 100 };
  for (let k = 0; k < 600; k++) t._spawn(me, ['car', 'bus', 'scooter'][k % 3]);
  assert.ok(t.vehicles.length > 5, `${t.vehicles.length} put down`);
  for (const v of t.vehicles) {
    assert.equal(v.road, wide, `${v.kind} on the wide road`);
    assert.ok(Math.abs(v.box.x) < 8, `${v.kind} at x ${v.box.x.toFixed(1)}`);
  }
  // at the end of the road, the next one is never the alley nor the lane
  const v = t.vehicles[0];
  for (let k = 0; k < 40; k++) {
    const o = t._pickNext(v);
    assert.ok(!o || (o.r !== alley && o.r !== lane), 'never into a narrow street');
  }
});

test('narrow: where the course runs down a narrow street it has no traffic — none sent up or down it, none parked, no bus stopped', () => {
  for (const on of ['alley', 'lane']) {
    const { t } = scene({ on });
    assert.equal(t.spots.length, 0, `${on}: nothing parked`);
    const me = { x: t.race.course.points[20][0], z: t.race.course.points[20][1], heading: 0, me: true, idx: 20 };
    for (let k = 0; k < 300; k++) {
      t._spawnOncoming(me, k % 2 === 0);
      t._parked([me]);
      t._parkT = 0;
    }
    assert.equal(t.vehicles.filter((v) => v.oncoming || v.along || v.parked).length, 0, `${on}: none along it`);
  }
  // (on the wide road beside them, the same course has its parked cars and its stopped bus)
  const { t } = scene({ on: 'wide' });
  assert.ok(t.spots.length > 0, 'parked on the wide road');
});

test('narrow: a lane the map gives no width, measured 8 m between the buildings down a zig-zag course, takes traffic — one measured narrow does not', () => {
  for (const [room, narrow] of [[8, false], [6, true]]) {
    const { t, lane, alley } = scene({ on: 'lane' });
    // the course down the lane, as course.js measureRoom left it (the map's 6.2 m replaced by the room)
    for (const p of t.race.course.points) p[2] = room;
    // (and crossing the alley at a junction, which stays the alley's own: narrow)
    t.race.course.points.push([40, -600, room, 5, 0], [-40, -600, room, 5, 0]);
    t._courseLanes();
    assert.equal(t.laneNarrow.get(lane), narrow, `measured ${room} m`);
    assert.equal(t._narrow(lane), narrow);
    assert.equal(t._narrow(alley), true, 'the alley is still people only');
    assert.equal(t._roads(-40, 0, 'scooter').includes(lane), !narrow);
  }
});

test('narrow: in a race the narrow streets the course runs down are where some people go — never a short cut kept clear', async () => {
  const { StreetLife } = await import('../../games/g_cv2yrhrpv2/life.js');
  const wide = { pts: [0, 300, 0, -300], cls: 3, width: 11, oneway: false };
  const alley = { pts: [40, 300, 40, -300], cls: 6, width: 4, oneway: false, small: true };
  const cut = { pts: [80, 300, 80, -300], cls: 6, width: 3, oneway: false, small: true };
  const away = { pts: [400, 300, 400, -300], cls: 6, width: 4, oneway: false, small: true };
  const points = [];
  for (let z = 290; z >= -290; z -= 5) points.push([40, z, 4, 6, 0], [0, z, 11, 3, 0]);
  for (let z = 50; z >= -50; z -= 5) points.push([80, z, 3, 6, 0]);
  const life = { g: { mode: 'race', pos: { x: 20, z: 0 }, race: { course: { points }, scRoads: new Set([cut]) } }, time: 0 };
  const lanes = StreetLife.prototype._narrowLanes.call(life, [wide, alley, cut, away]);
  assert.deepEqual(lanes, [alley], "the course's own alley: not the main road, not the short cut, not one off the course");
  life.g.mode = 'walk';
  life._lanes = null;
  assert.deepEqual(StreetLife.prototype._narrowLanes.call(life, [wide, alley]), [], 'only in a race');
});
