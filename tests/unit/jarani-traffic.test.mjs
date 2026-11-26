import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RaceTraffic, FADE, fadeStep, brakesFor } from '../../src/city/traffic.js';
import { pointOn } from '../../src/city/drive.js';

/**
 * Kickrani's traffic without a browser: a straight two-way road running north (−z) through the
 * camera, which looks north from just behind the origin. Vehicles are plain boxes (one material each,
 * so a fade can be seen on it).
 */
function street() {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 3, 6);
  cam.lookAt(0, 1, -60);
  cam.updateMatrixWorld();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#ffffff', 140, 1000);
  const road = { pts: [0, 600, 0, -600], cls: 2, width: 14, oneway: false };
  const game = { scene, camera: cam, roadsNear: () => [road], surfaceAt: () => 0, pos: { x: 0, z: 0 } };
  const race = { course: null, racers: [], keepClear: () => false };
  const t = new RaceTraffic(game, race);
  t._make = () => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#888' });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 4.5), mat);
    body.castShadow = true;
    group.add(body);
    t.group.add(group);
    return { group, view: null, kind: 'car', size: [2.25, 0.9], model: 'box', mat, body };
  };
  t._view();
  return { t, race, road, cam };
}

/** A car on the road at `z`, going north (dir 1) or south (dir −1), in its lane. */
function car(t, road, z, dir = 1, top = 12) {
  const made = t._make('car');
  const at = { i: 0, t: (600 - z) / 1200, dir };
  const lane = 3.5;
  const q = pointOn(road.pts, at, lane);
  const v = { ...made, road, at, lane, top, speed: top, v: top, y: 0, box: { x: q.x, z: q.z, heading: q.heading, halfLength: 2.25, halfWidth: 0.9 }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
  t._born(v);
  return v;
}

const rider = (x, z, heading, extra = {}) => ({ id: 'r', s: { x, z, heading, travel: heading, v: 8 }, mode: 'ride', ...extra });

test('traffic: a fade comes in over about half a second where it is seen, at once where it is not', () => {
  let a = 0;
  let n = 0;
  while (a < 1 && n < 100) (a = fadeStep(a, 1, 1 / 60, true)), n++;
  assert.ok(Math.abs(n / 60 - FADE.time) < 0.05, `${n} frames`);
  assert.equal(fadeStep(0, 1, 1 / 60, false), 1);
  assert.equal(fadeStep(1, 0, 1 / 60, false), 0);
  assert.ok(FADE.far > FADE.back && FADE.back > 230, 'drawn out past where vehicles are sent in');
});

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
  const lat0 = v.lat ?? v.lane;
  for (let k = 0; k < 30; k++) t._drive(v, 1 / 60);
  assert.ok(v.speed >= 11.9, `speed ${v.speed}`);
  assert.ok(Math.abs((v.lat ?? v.lane) - lat0) < 1e-9 && v.lane === 3.5, 'no swerve');
  assert.equal(v.braking, false);
  // …but one going its way just in front: it follows, braking
  const w = car(t, road, -300, 1, 12);
  race.racers.length = 0;
  race.racers.push(rider(w.box.x + -Math.sin(w.box.heading) * 9, w.box.z + -Math.cos(w.box.heading) * 9, w.box.heading));
  for (let k = 0; k < 30; k++) t._drive(w, 1 / 60);
  assert.ok(w.speed < 10, `follows: ${w.speed}`);
});

test('traffic: nothing pops in — put down in view it fades in; out of view it is simply there; its own material back after', () => {
  const { t, road } = street();
  const ahead = car(t, road, -120);
  assert.equal(ahead.alpha, 0, 'in view: starts invisible');
  assert.notEqual(ahead.body.material, ahead.mat, 'wearing a see-through copy while it fades');
  const behind = car(t, road, 120);
  assert.equal(behind.alpha, 1, 'behind the camera: there at once');
  let frames = 0;
  while (ahead.alpha < 1 && frames < 120) {
    t._fade(ahead, 1 / 60);
    frames++;
    if (ahead.alpha < 1) assert.ok(ahead.body.material.transparent && Math.abs(ahead.body.material.opacity - ahead.alpha) < 1e-9);
  }
  assert.ok(frames >= 25 && frames <= 35, `${frames} frames`);
  assert.equal(ahead.body.material, ahead.mat, 'the shared material back on');
  assert.equal(ahead.body.castShadow, true);
});

test('traffic: nothing pops out — gone in view it fades out first (nothing to hit meanwhile); past FADE.far it fades, and back in nearer', () => {
  const { t, road } = street();
  const v = car(t, road, -100);
  for (let k = 0; k < 40; k++) t._fade(v, 1 / 60);
  t._retire(v);
  assert.ok(!t.vehicles.includes(v) && t.leaving.includes(v), 'leaving, not on the street');
  for (let k = 0; k < 40 && t.leaving.length; k++) t.update(1 / 60, [{ x: 0, z: 0, heading: 0, me: true }]);
  assert.ok(!t.leaving.includes(v) && !t.group.children.includes(v.group), 'faded out, then gone');
  // out of view: gone at once
  const back = car(t, road, 150);
  t._retire(back);
  assert.ok(!t.leaving.includes(back) && !t.group.children.includes(back.group));
  // far down the road: faded out (not a hard cut), and in again as it comes back
  const far = car(t, road, -(FADE.far + 20));
  assert.equal(far.alpha, 0);
  for (let k = 0; k < 40; k++) t._fade(far, 1 / 60);
  assert.equal(far.alpha, 0);
  assert.equal(far.group.visible, false);
  Object.assign(far.box, { z: -(FADE.back - 20) });
  t._fade(far, 1 / 60);
  assert.ok(far.alpha > 0 && far.alpha < 0.1, 'fading back in, not popped');
});
