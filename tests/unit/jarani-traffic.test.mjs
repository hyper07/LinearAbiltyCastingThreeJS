import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MAX_STEER, PARK_RESIT, RaceTraffic, SIGHT, STUCK, brakesFor, giveWay, laneAt, onScreen, overlapDepth, overlaps } from '../../games/g_cv2yrhrpv2/traffic.js';
import { fleetKindFor, LOD } from '../../games/g_cv2yrhrpv2/fleet.js';
import { pointOn } from '../../games/g_cv2yrhrpv2/drive.js';

/**
 * Kickrani's traffic without a browser: a straight two-way road running north (−z) through the
 * camera, which looks north from just behind the origin. With `boxes`, vehicles are stand-in boxes made
 * by the test (the logic under test is where and when they come and go, not their look).
 */
function street({ boxes = true, roads = null } = {}) {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 3, 6);
  cam.lookAt(0, 1, -60);
  cam.updateMatrixWorld();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#ffffff', 140, 1000);
  const road = { pts: [0, 600, 0, -600], cls: 2, width: 14, oneway: false };
  const game = { scene, camera: cam, roadsNear: () => roads ?? [road], surfaceAt: () => 0, pos: { x: 0, z: 0 } };
  const race = { course: null, racers: [], keepClear: () => false };
  const t = new RaceTraffic(game, race);
  if (boxes) {
    t._make = (kind) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: '#888' });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 4.5), mat);
      group.add(body);
      t.group.add(group);
      return { group, view: null, kind: kind === 'scooter' ? 'car' : kind, size: [2.25, 0.9], model: 'box', mat, body };
    };
  }
  t._view();
  return { t, race, road, cam, game };
}

/** A car on the road at `z`, going north (dir 1) or south (dir −1), in its lane. */
function car(t, road, z, dir = 1, top = 12) {
  const made = t._make('car');
  const at = { i: 0, t: dir > 0 ? (600 - z) / 1200 : (600 - z) / 1200, dir };
  const lane = 3.5;
  const q = laneAt(road.pts, at, lane);
  const v = { ...made, road, at, lane, lat: lane, top, speed: top, v: top, y: 0, box: { x: q.x, z: q.z, heading: q.heading, halfLength: 2.25, halfWidth: 0.9 }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
  t._born(v);
  return v;
}

const rider = (x, z, heading, extra = {}) => ({ id: 'r', s: { x, z, heading, travel: heading, v: 8 }, mode: 'ride', ...extra });
const me = { x: 0, z: 0, heading: 0, me: true };

test('traffic: drivers brake for a rider going their way in front, or one standing still (held by the police, in a jam) — never one riding at them or across', () => {
  assert.equal(brakesFor(0, rider(0, 0, 0)), true, 'following');
  assert.equal(brakesFor(0, rider(0, 0, Math.PI)), false, 'head-on');
  assert.equal(brakesFor(0, rider(0, 0, Math.PI / 2)), false, 'across');
  assert.equal(brakesFor(0, rider(0, 0, Math.PI, { pulled: { t: 1 } })), true, 'pulled over by the police');
  assert.equal(brakesFor(0, { s: { x: 0, z: 0, heading: Math.PI / 2, v: 0.4 } }), true, 'standing still across the road');
  assert.equal(brakesFor(0, rider(0, 0, 0, { left: true })), false, 'gone');
});

test('traffic: an oncoming car holds its lane and its speed with a rider right in front of it', () => {
  const { t, race, road } = street();
  const v = car(t, road, -100, 1, 12);
  // a rider 16 m ahead in the car's own lane, coming at it
  const fx = -Math.sin(v.box.heading);
  const fz = -Math.cos(v.box.heading);
  race.racers.push(rider(v.box.x + fx * 16, v.box.z + fz * 16, v.box.heading + Math.PI));
  for (let k = 0; k < 30; k++) t._drive(v, 1 / 60);
  assert.ok(v.speed >= 11.9, `speed ${v.speed}`);
  assert.ok(Math.abs(v.lat - 3.5) < 1e-9 && v.lane === 3.5, 'no swerve');
  assert.equal(v.braking, false);
  // …but one going its way just in front: it follows, braking
  const w = car(t, road, -300, 1, 12);
  race.racers.length = 0;
  race.racers.push(rider(w.box.x + -Math.sin(w.box.heading) * 9, w.box.z + -Math.cos(w.box.heading) * 9, w.box.heading));
  for (let k = 0; k < 30; k++) t._drive(w, 1 / 60);
  assert.ok(w.speed < 10, `follows: ${w.speed}`);
});

test('traffic: no vehicle is put down where the camera can see it — it is put down out of sight and drives in; none at all if there is nowhere hidden', () => {
  const { t } = street();
  let made = 0;
  for (let k = 0; k < 400 && made < 30; k++) if (t._spawn(me, 'car')) made++;
  assert.ok(made >= 10, `${made} put down`);
  for (const v of t.vehicles) {
    assert.equal(t._seen(v.box.x, 0, v.box.z, v.box.halfLength + 1, true, v.box.halfLength, v.box.heading), false, `seen at z ${v.box.z.toFixed(0)}`);
    assert.equal(v.alpha, undefined, 'no fading: solid from the start');
    assert.equal(v.body.material, v.mat, 'its own material');
  }
  // With the camera high over the road looking down on all of it (nothing behind it, none too small to
  // see), nothing hidden on the road: nobody comes.
  const { t: t2, cam } = street();
  cam.fov = 100;
  cam.up.set(0, 0, -1);
  cam.position.set(0, 300, 0);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  t2._view();
  let none = 0;
  for (let k = 0; k < 200; k++) if (t2._spawn(me, 'car')) none++;
  assert.equal(none, 0, 'waits rather than pop one up in view');
});

test('traffic: nothing goes in view — one done with but still seen drives on, solid, until it is out of sight', () => {
  const { t, road, cam } = street();
  const v = car(t, road, -100);
  t._retire(v);
  assert.ok(t.vehicles.includes(v) && v.going && t.group.children.includes(v.group), 'still on the street, going');
  const z0 = v.box.z;
  for (let k = 0; k < 30; k++) t._drive(v, 1 / 60);
  assert.ok(v.box.z < z0 - 5, 'driving on');
  // the camera turns away: gone at the next look
  cam.lookAt(0, 1, 60);
  cam.updateMatrixWorld();
  t._view();
  t._retire(v);
  assert.ok(!t.vehicles.includes(v) && !t.group.children.includes(v.group), 'gone out of sight');
  // behind the camera: gone at once
  cam.lookAt(0, 1, -60);
  cam.updateMatrixWorld();
  t._view();
  const back = car(t, road, 150);
  t._retire(back);
  assert.ok(!t.vehicles.includes(back));
  // never cut at a distance in clear air while it can be made out: one 380 m off in plain view is still
  // drawn; one so far down the road that it is a dot smaller than SIGHT.px goes
  const far = car(t, road, -380);
  t.update(1 / 60, [me]);
  assert.ok(onScreen(cam, 720, far.box.x, far.box.z, 2.25, far.box.heading) > SIGHT.px, 'big enough to see');
  assert.ok(far.group.visible && t.vehicles.includes(far), 'drawn far off');
  const dot = car(t, road, -590);
  assert.ok(onScreen(cam, 720, dot.box.x, dot.box.z, 2.25, dot.box.heading) < SIGHT.px, 'a dot');
  t._retire(dot);
  assert.ok(!t.vehicles.includes(dot), 'gone past seeing');
});

test('traffic: nothing is put down until a real model is there (no built stand-in, ever)', () => {
  const { t } = street({ boxes: false });
  assert.equal(fleetKindFor('taxi'), null, 'no model loaded here');
  assert.equal(t._make('car'), null);
  assert.equal(t._make('bus'), null);
  assert.equal(t._make('scooter'), null);
  let made = 0;
  for (let k = 0; k < 50; k++) if (t._spawn(me, 'car') || t._spawn(me, 'scooter')) made++;
  assert.equal(made, 0);
  assert.ok(LOD.far > LOD.near && LOD.near >= 40, 'far copy only well off');
});

test('traffic: a lane round a bend is continuous — no jump where two stretches of road meet', () => {
  // a road bending 40° at its middle corner
  const a = (40 * Math.PI) / 180;
  const pts = [0, 0, 0, -50, 50 * Math.sin(a), -50 - 50 * Math.cos(a)];
  const before = { i: 0, t: 0.9999, dir: 1 };
  const after = { i: 1, t: 0.0001, dir: 1 };
  for (const side of [-4, 4]) {
    const p = laneAt(pts, before, side);
    const q = laneAt(pts, after, side);
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) < 0.05, `side ${side}: ${Math.hypot(p.x - q.x, p.z - q.z)}`);
    // (the plain offset square to each stretch jumps)
    const p0 = pointOn(pts, before, side);
    const q0 = pointOn(pts, after, side);
    assert.ok(Math.hypot(p0.x - q0.x, p0.z - q0.z) > 2);
  }
  // and the other way along it, still on its own right
  const back = laneAt(pts, { i: 0, t: 0.5, dir: -1 }, 3);
  assert.ok(back.x < -2.9, 'right of the way it goes (west, going south)');
});

test('traffic: across a junction one gives way and the other goes — never both waiting, never one already in the crossing', () => {
  // a going north toward (0, −20); b going west toward it from the east
  const a = { x: 0, z: 0, heading: 0, speed: 10, halfLength: 2.25, halfWidth: 0.9 };
  const b = { x: 20, z: -20, heading: Math.PI / 2, speed: 10, halfLength: 2.25, halfWidth: 0.9 };
  const ab = giveWay(a, b);
  const ba = giveWay(b, a);
  assert.ok((ab == null) !== (ba == null), `exactly one waits: ${ab} ${ba}`);
  // b on a's right (east, going north): a waits for it, b goes
  assert.ok(ab != null && ab < 20 && ba == null);
  // one already in the crossing doesn't wait; the other does
  const inside = { ...b, x: 1, z: -20 };
  assert.ok(giveWay(inside, a) == null && giveWay(a, inside) != null);
  // one well ahead of the other gets there first: the later one waits whichever side
  const late = { ...a, z: 5 };
  const early = { ...b, x: 8, heading: Math.PI / 2 };
  assert.ok(giveWay(late, early) != null && giveWay(early, late) == null);
  // the same way or head on: nothing to give way about
  assert.equal(giveWay(a, { ...a, z: -10 }), null);
  assert.equal(giveWay(a, { ...a, z: -30, heading: Math.PI }), null);
});

test('traffic: driving through a junction onto the next road — no teleport, its nose the way it goes, wheels turning, blinking through the turn', () => {
  // north up one road, then east along the next (a right turn), the two meeting at (0, −100)
  const r1 = { pts: [0, 0, 0, -100], cls: 2, width: 14, oneway: false };
  const r2 = { pts: [0, -100, 200, -100], cls: 4, width: 7, oneway: false };
  const { t } = street({ roads: [r1, r2] });
  t._lane = (r) => (r === r1 ? 4.2 : 1.75);
  const v = car(t, r1, 0);
  Object.assign(v, { road: r1, at: { i: 0, t: 0.6, dir: 1 }, lane: 4.2, lat: 4.2, top: 12, speed: 12 });
  const q = laneAt(r1.pts, v.at, 4.2);
  Object.assign(v.box, { x: q.x, z: q.z, heading: q.heading });
  let rolled = 0;
  v.view = { size: { wheel: 0.33 }, wheels: (r) => (rolled += r), lights() {}, near() {}, indicate() {} };
  let maxStep = 0;
  let maxSlip = 0;
  let blinked = false;
  let turned = false;
  for (let k = 0; k < 60 * 12; k++) {
    const x0 = v.box.x;
    const z0 = v.box.z;
    t._drive(v, 1 / 60);
    const dx = v.box.x - x0;
    const dz = v.box.z - z0;
    const step = Math.hypot(dx, dz);
    maxStep = Math.max(maxStep, step);
    if (step > 0.03) maxSlip = Math.max(maxSlip, Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - v.box.heading), Math.cos(Math.atan2(-dx, -dz) - v.box.heading))));
    if (v.road === r1 && v.signal === 'right') blinked = true;
    if (v.road === r2) turned = true;
  }
  assert.ok(turned, 'onto the next road');
  assert.ok(blinked, 'blinked right before the turn');
  assert.ok(maxStep < (12 / 60) * 1.6, `no jump: largest step ${maxStep.toFixed(3)} m`);
  assert.ok(maxSlip < 0.35, `nose along its track: ${maxSlip.toFixed(2)} rad off at most`);
  assert.ok(rolled > 10, 'wheels turning');
  assert.ok(Math.abs(v.box.z - (-100 + 1.75)) < 0.3, `in its lane on the new road (${v.box.z.toFixed(2)})`);
});

test('traffic: at a dead end a car turns round in the road (blinking left) and drives back on the other side — never flipped on the spot', () => {
  const road = { pts: [0, 0, 0, -100], cls: 4, width: 7, oneway: false };
  const { t } = street({ roads: [road] });
  const v = car(t, road, -40);
  Object.assign(v, { at: { i: 0, t: 0.4, dir: 1 }, lane: 1.75, lat: 1.75, top: 10, speed: 10 });
  const q = laneAt(road.pts, v.at, 1.75);
  Object.assign(v.box, { x: q.x, z: q.z, heading: q.heading });
  let maxStep = 0;
  let maxTurn = 0;
  let blinked = false;
  for (let k = 0; k < 60 * 14; k++) {
    const x0 = v.box.x;
    const z0 = v.box.z;
    const h0 = v.box.heading;
    t._drive(v, 1 / 60);
    maxStep = Math.max(maxStep, Math.hypot(v.box.x - x0, v.box.z - z0));
    maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(v.box.heading - h0), Math.cos(v.box.heading - h0))));
    if (v.signal === 'left') blinked = true;
  }
  assert.equal(v.at.dir, -1, 'going back the other way');
  assert.ok(v.box.z > -60 && v.box.x < -1, `back down the road on its own side (${v.box.x.toFixed(1)}, ${v.box.z.toFixed(1)})`);
  assert.ok(blinked, 'blinked left');
  assert.ok(maxStep < (10 / 60) * 1.6, `no jump: ${maxStep.toFixed(3)} m`);
  assert.ok(maxTurn < 0.2, `no flip: ${maxTurn.toFixed(3)} rad in a frame at most`);
});

test('traffic: pulling away and braking are gentle — no jump in speed', () => {
  const { t, road } = street();
  const v = car(t, road, -100, 1, 12);
  v.speed = 0;
  let last = 0;
  let most = 0;
  for (let k = 0; k < 120; k++) {
    t._drive(v, 1 / 60);
    most = Math.max(most, (v.speed - last) * 60);
    last = v.speed;
  }
  assert.ok(most <= 3.01, `pulls away at ${most.toFixed(2)} m/s² at most`);
  // something stopped 30 m ahead in its lane: it slows to a stop behind it, braking no harder than it must
  const w = car(t, road, -300, 1, 12);
  const block = car(t, road, -335, 1, 0);
  block.speed = 0;
  block.stopFor = 999;
  let hardest = 0;
  last = w.speed;
  for (let k = 0; k < 60 * 6; k++) {
    t._drive(w, 1 / 60);
    t._drive(block, 1 / 60);
    hardest = Math.max(hardest, (last - w.speed) * 60);
    last = w.speed;
  }
  const gap = Math.abs(block.box.z - w.box.z) - 4.5;
  assert.ok(w.speed < 0.2 && gap > 1 && gap < 6, `stopped ${gap.toFixed(1)} m behind`);
  assert.ok(hardest <= 9.01, `braked at ${hardest.toFixed(1)} m/s² at most`);
});

/** A vehicle standing on the road at `z` (in the northbound lane, or across it with `heading`), going nowhere. */
function standing(t, road, z, { parked = false, heading = null, x = null } = {}) {
  const v = car(t, road, z, 1, 0);
  Object.assign(v, { speed: 0, v: 0, parked, stopFor: parked ? 0 : 1e9 });
  if (heading != null) v.box.heading = heading;
  if (x != null) v.box.x = x;
  return v;
}

const offRoad = (v) => Math.abs(Math.atan2(Math.sin(v.box.heading - (v.at.dir > 0 ? 0 : Math.PI)), Math.cos(v.box.heading - (v.at.dir > 0 ? 0 : Math.PI))));

test('traffic: a parked car put down before the road under it came in is sat on the road once it has — not left a metre into it', () => {
  const { t, road, game } = street();
  // (its land not in yet: the surface lookup has only the bare ground)
  game.surfaceAt = () => 0;
  const p = standing(t, road, -120, { parked: true });
  t._place(p, 0);
  assert.equal(p.group.position.y, 0);
  // the road comes in, laid 0.9 m over the land
  game.surfaceAt = () => 0.9;
  for (let k = 0; k <= PARK_RESIT; k++) t._place(p, 0);
  assert.ok(Math.abs(p.group.position.y - 0.9) < 1e-6, `on the road: ${p.group.position.y}`);
});

test('traffic: behind a parked car with a car coming the other way, a car waits back from it, then pulls out round it and on — never into either, never turning its nose across the road', () => {
  // a two-way street 7 m wide: a lane each way, the parked car half in ours
  const road = { pts: [0, 600, 0, -600], cls: 4, width: 7, oneway: false };
  const { t } = street({ roads: [road] });
  const inLane = (v, lane) => {
    const q = laneAt(road.pts, v.at, lane);
    Object.assign(v, { road, lane, lat: lane });
    Object.assign(v.box, { x: q.x, z: q.z, heading: q.heading });
    return v;
  };
  const p = inLane(standing(t, road, -150, { parked: true }), 2.4);
  const v = inLane(car(t, road, -110, 1, 10), 1.75);
  const other = inLane(car(t, road, -205, -1, 6), 1.75);
  let touched = 0;
  let worst = 0;
  let waited = false;
  for (let k = 0; k < 60 * 20; k++) {
    t._drive(other, 1 / 60);
    t._drive(v, 1 / 60);
    if (overlaps(v.box, p.box) || overlaps(v.box, other.box)) touched++;
    if (v.speed < 0.3 && v.box.z > -150) waited = true;
    worst = Math.max(worst, offRoad(v));
  }
  assert.ok(waited, 'waited behind it while the other came by');
  assert.equal(touched, 0, 'never into the parked car nor the one coming');
  assert.ok(v.box.z < -175, `out round it and on (${v.box.z.toFixed(1)})`);
  assert.ok(worst <= MAX_STEER + 1e-6, `nose ${worst.toFixed(2)} rad off the road's way at most`);
});

test('traffic: one standing across the lane is never driven through, however long; stuck for good, both go once out of sight — never in view', () => {
  const { t, road, cam } = street();
  t._spawn = () => false;
  t._spawnOncoming = () => false;
  const across = standing(t, road, -140, { heading: Math.PI / 2 });
  const v = car(t, road, -100, 1, 10);
  let touched = 0;
  for (let k = 0; k < 60 * (STUCK + 8); k++) {
    t.update(1 / 60, [me]);
    if (overlaps(v.box, across.box)) touched++;
  }
  assert.equal(touched, 0, 'never through it');
  assert.ok(v.speed < 0.3 && v.box.z > -140, 'waits behind it');
  assert.ok(t.vehicles.includes(v) && t.vehicles.includes(across), 'still there while the camera sees them');
  cam.lookAt(0, 1, 60);
  cam.updateMatrixWorld();
  for (let k = 0; k < 30; k++) t.update(1 / 60, [me]);
  assert.ok(!t.vehicles.includes(v) && !t.vehicles.includes(across), 'cleared away once out of sight');
});

test('traffic: wherever a move really takes it (its lane, its nose turning), never into another — not even one coming the other way that strays into its lane', () => {
  // (two coming at each other, each in its own lane but the lanes too close: their corners meet)
  const road = { pts: [0, 600, 0, -600], cls: 4, width: 3, oneway: false };
  const { t } = street({ roads: [road] });
  const put = (v, lane) => {
    const q = laneAt(road.pts, v.at, lane);
    Object.assign(v, { road, lane, lat: lane });
    Object.assign(v.box, { x: q.x, z: q.z, heading: q.heading });
    return v;
  };
  const a = put(car(t, road, -110, 1, 8), 0.4);
  const b = put(car(t, road, -140, -1, 8), 0.4);
  let worst = -Infinity;
  for (let k = 0; k < 60 * 6; k++) {
    t._drive(a, 1 / 60);
    t._drive(b, 1 / 60);
    worst = Math.max(worst, overlapDepth(a.box, b.box));
  }
  assert.ok(worst <= 1e-3, `never one in the other (${worst.toFixed(2)} m in)`);
});

test('traffic: two going the same way queue — the one behind never runs into the one in front, at any speed', () => {
  const { t, road } = street();
  const front = car(t, road, -140, 1, 4);
  const back = car(t, road, -110, 1, 14);
  let touched = 0;
  for (let k = 0; k < 60 * 20; k++) {
    t._drive(front, 1 / 60);
    t._drive(back, 1 / 60);
    if (overlaps(back.box, front.box)) touched++;
  }
  assert.equal(touched, 0);
  assert.ok(Math.abs(back.speed - front.speed) < 1, `following at its speed (${back.speed.toFixed(1)} vs ${front.speed.toFixed(1)})`);
});
