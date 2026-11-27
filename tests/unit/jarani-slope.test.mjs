import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RaceTraffic, laneAt, sitOn } from '../../src/city/traffic.js';
import { scooterOn, STEEPEST } from '../../src/city/plushRider.js';

/**
 * Kickrani on a hill (Bukak Skyway drops 143 m and climbs 77, up to ~24 %): vehicles and scooters sit
 * on the sloped, cambered road under their own tyres — nose up or down with the hill, tipped with the
 * camber, no tyre floating and none sunk — and a car driving up or down keeps its wheels on the road.
 */

// a road climbing north (−z) at `grade`, falling to the right (+x) at `camber`, 0.9 m over the land
const hill = (grade, camber = 0) => (x, z) => 100 + -z * grade - x * camber;

// a vehicle's tyre bottoms in the world, from its pose (yaw `heading`, then pitch, then roll: order YXZ)
function tyres(y, x, z, heading, pitch, roll, { front, rear, track }) {
  const o = new THREE.Object3D();
  o.rotation.order = 'YXZ';
  o.rotation.set(pitch, heading, roll);
  o.position.set(x, y, z);
  o.updateMatrixWorld();
  return [[-track, front], [track, front], [-track, rear], [track, rear]].map(([a, b]) => new THREE.Vector3(a, 0, b).applyMatrix4(o.matrixWorld));
}

test('a vehicle sits on a sloped, cambered road: nose up the hill, tipped with the camber, all four tyres on it', () => {
  const axles = { front: -1.35, rear: 1.4, track: 0.78 };
  for (const [grade, camber] of [[0.24, 0], [-0.2, 0.04], [0.12, -0.06], [0, 0.03]]) {
    const s = hill(grade, camber);
    for (const heading of [0, Math.PI, 0.7]) {
      const at = sitOn((x, z) => s(x, z), 10, -20, heading, axles);
      for (const p of tyres(at.y, 10, -20, heading, at.pitch, at.roll, axles)) {
        const gap = p.y - s(p.x, p.z);
        assert.ok(Math.abs(gap) < 0.01, `grade ${grade} camber ${camber} heading ${heading}: a tyre ${gap.toFixed(3)} m off the road`);
      }
      // going north up the hill, the nose up
      if (heading === 0) assert.ok(Math.abs(at.pitch - Math.atan(grade)) < 0.01);
    }
  }
});

test('on a twisted bit of road the lowest tyre touches and none sinks', () => {
  const axles = { front: -1.3, rear: 1.3, track: 0.8 };
  // a saddle: x·z twist
  const s = (x, z) => 50 + 0.06 * x * z;
  const at = sitOn(s, 0, 0, 0, axles);
  const gaps = tyres(at.y, 0, 0, 0, at.pitch, at.roll, axles).map((p) => p.y - s(p.x, p.z));
  assert.ok(Math.min(...gaps) > -0.005, `none sunk: ${gaps.map((g) => g.toFixed(3))}`);
  assert.ok(Math.min(...gaps) < 0.005, 'the lowest touching');
});

test('a scooter sits on the hill: its deck along the road, both tyres on it, a step too steep for a street not tipped up to', () => {
  const look = { front: -0.42, rear: 0.36 };
  for (const grade of [0.24, -0.24, 0.08]) {
    const s = hill(grade, 0.05);
    for (const heading of [0, Math.PI / 2, 2.5]) {
      const at = scooterOn((x, z) => s(x, z), 3, -7, heading, look);
      // the tyres' contacts, rotated with the deck about its middle
      const fx = -Math.sin(heading);
      const fz = -Math.cos(heading);
      for (const zl of [look.front * 1.24, look.rear * 1.24]) {
        const along = -zl;
        const x = 3 + fx * along * Math.cos(at.pitch);
        const z = -7 + fz * along * Math.cos(at.pitch);
        const y = at.y + Math.sin(at.pitch) * along;
        assert.ok(Math.abs(y - s(x, z)) < 0.01, `grade ${grade} heading ${heading.toFixed(1)}: a tyre ${(y - s(x, z)).toFixed(3)} m off`);
      }
    }
  }
  // the front tyre over a wall's top 0.6 m up: stood on the middle, tipped no more than the steepest street
  const wall = (x, z) => (z < -0.3 ? 0.6 : 0);
  const at = scooterOn(wall, 0, 0, 0, look);
  assert.ok(at.y === 0 && Math.abs(at.pitch - Math.atan(STEEPEST)) < 1e-9);
});

test('a car driving up and down a steep hill keeps its tyres on the road (no lag above or below it)', () => {
  const grade = 0.22;
  const s = hill(grade);
  const road = { pts: [0, 400, 0, -400], cls: 3, width: 8, oneway: false };
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 300, 0);
  cam.updateMatrixWorld();
  const game = { scene: new THREE.Scene(), camera: cam, roadsNear: () => [road], surfaceAt: (x, z) => s(x, z), groundAt: (x, z) => s(x, z) - 0.9, pos: { x: 0, z: 0 } };
  const t = new RaceTraffic(game, { course: null, racers: [], keepClear: () => false });
  t._make = (kind) => {
    const group = new THREE.Group();
    t.group.add(group);
    return { group, view: null, kind, size: [2.25, 0.9], model: 'box' };
  };
  t._view();
  // (far from the camera, and followed by it: sampled under each tyre every frame)
  for (const [dir, near] of [[1, false], [-1, false], [1, true], [-1, true]]) {
    const at = { i: 0, t: dir > 0 ? 0.3 : 0.7, dir };
    const q = laneAt(road.pts, at, 2);
    const v = { ...t._make('car'), road, at, lane: 2, lat: 2, top: 14, speed: 14, v: 14, y: s(q.x, q.z), box: { x: q.x, z: q.z, heading: q.heading, halfLength: 2.25, halfWidth: 0.9 }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
    t._born(v);
    let worst = 0;
    for (let k = 0; k < 60 * 6; k++) {
      if (near) cam.position.set(v.box.x + 6, 300, v.box.z);
      t._drive(v, 1 / 60);
      v.group.updateMatrixWorld();
      for (const p of tyres(v.group.position.y, v.box.x, v.box.z, v.box.heading, v.group.rotation.x, v.group.rotation.z, v.axles)) worst = Math.max(worst, Math.abs(p.y - s(p.x, p.z)));
    }
    assert.ok(worst < 0.02, `${dir > 0 ? 'up' : 'down'} the hill${near ? ', near' : ''}: a tyre ${worst.toFixed(3)} m off the road at worst`);
  }
});
