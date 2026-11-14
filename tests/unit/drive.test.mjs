import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAR, stepCar, follow, pointOn, corners } from '../../src/city/drive.js';

const drive = (car, input, seconds, blocked) => {
  let hit = 0;
  for (let i = 0; i < seconds * 60; i++) hit = Math.max(hit, stepCar(car, input, 1 / 60, blocked).hit);
  return hit;
};
const fresh = () => ({ x: 0, z: 0, heading: 0, v: 0, steer: 0 });

test('a car speeds up to its top speed and no further, and rolls to a stop when let go', () => {
  const car = fresh();
  drive(car, { throttle: true }, 5);
  assert.ok(car.v > 20 && car.v < CAR.top, `about 100 km/h after five seconds (${(car.v * 3.6).toFixed(0)})`);
  assert.ok(car.z < -50, 'heading 0 goes north (−z)');
  drive(car, { throttle: true }, 60);
  assert.ok(car.v <= CAR.top + 1e-9);
  drive(car, {}, 60);
  assert.equal(car.v, 0);
});

test('brakes stop it and hold it a moment; held on, it reverses; the handbrake slows it too', () => {
  const car = fresh();
  car.v = 20;
  drive(car, { brake: true }, 1);
  assert.ok(car.v < 0.5 && car.v >= 0, 'stopped, not yet backing up');
  drive(car, { brake: true }, 0.2);
  assert.ok(car.v >= -0.01, 'a short hold stays stopped');
  drive(car, { brake: true }, 3);
  assert.ok(car.v < 0 && car.v >= -CAR.reverse, 'reversing');
  const b = fresh();
  b.v = 20;
  drive(b, { handbrake: true }, 1);
  assert.ok(b.v < 15);
});

test('steering turns it left and right, less sharply at speed; a handbrake turn skids', () => {
  const left = fresh();
  left.v = 10;
  drive(left, { throttle: true, left: true }, 1);
  assert.ok(left.heading > 0.3, 'left turns the heading up');
  const right = fresh();
  right.v = 10;
  drive(right, { throttle: true, right: true }, 1);
  assert.ok(right.heading < -0.3);
  const skid = fresh();
  skid.v = 25;
  drive(skid, { left: true, handbrake: true }, 0.6);
  assert.ok(skid.drift > 0.1, 'it slides: the way it goes lags the way it points');
});

test('a wall stops a car and pushes it back; it never ends up inside', () => {
  const wall = (x, z) => z < -30;
  const car = fresh();
  const hit = drive(car, { throttle: true }, 6, wall);
  assert.ok(hit > 5, 'it struck the wall');
  assert.ok(corners(car.x, car.z, car.heading).every(([x, z]) => !wall(x, z)));
  assert.ok(car.v <= 0.5);
});

test('following a road: along its points, round its corners, to its end', () => {
  const road = [0, 0, 10, 0, 10, 10];
  let at = { i: 0, t: 0, dir: 1 };
  at = follow(road, at, 5);
  assert.deepEqual([at.i, at.t, at.end], [0, 0.5, false]);
  at = follow(road, at, 10);
  assert.equal(at.i, 1);
  assert.ok(Math.abs(at.t - 0.5) < 1e-9);
  at = follow(road, at, 50);
  assert.equal(at.end, true);
  // Back the other way.
  const back = follow(road, { i: 1, t: 1, dir: -1 }, 15);
  assert.equal(back.i, 0);
  assert.ok(Math.abs(back.t - 0.5) < 1e-9);
});

test('keeping right: a lane to the right of the way you go, heading the right way', () => {
  const east = pointOn([0, 0, 10, 0], { i: 0, t: 0.5, dir: 1 }, 2);
  assert.deepEqual([east.x, east.z], [5, 2], 'going east, the right is south (+z)');
  assert.ok(Math.abs(east.heading + Math.PI / 2) < 1e-9);
  const west = pointOn([0, 0, 10, 0], { i: 0, t: 0.5, dir: -1 }, 2);
  assert.deepEqual([west.x, west.z], [5, -2], 'coming back, the other side');
});
