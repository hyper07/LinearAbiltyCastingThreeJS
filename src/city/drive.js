/**
 * Driving and walking the streets of Seoul, as plain numbers: a car's
 * handling (`stepCar`) and going along a road (`follow`). No drawing here,
 * so the tests can drive a car into a wall without a browser.
 *
 * A car is { x, z, heading, travel, v, steer }: heading the way it points
 * (0 is north, −z, turning left as it grows — the game's yaw), travel the
 * way it is actually going (they part in a skid), v its speed along travel
 * in metres a second (negative in reverse).
 */

export const CAR = {
  top: 42, // 151 km/h
  reverse: 9,
  accel: 9.5,
  brake: 24,
  drag: 0.0028,
  roll: 1.4,
  steer: 0.62,
  wheelbase: 2.7,
  halfLength: 2.25,
  halfWidth: 0.95
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** The four corners and the nose of a car at a place, for asking the city whether they are inside a building. */
export function corners(x, z, heading) {
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const rx = -fz;
  const rz = fx;
  const L = CAR.halfLength;
  const W = CAR.halfWidth;
  return [[L, W], [L, -W], [-L, W], [-L, -W], [L + 0.2, 0]].map(([a, b]) => [x + fx * a + rx * b, z + fz * a + rz * b]);
}

/**
 * Move a car on by dt seconds. `input`: { throttle, brake, left, right,
 * handbrake } (true/false). `blocked(x, z)` says whether a point is inside
 * something solid. Returns what happened: { hit } when it struck something.
 */
export function stepCar(car, input, dt, blocked = () => false) {
  const { throttle, brake, left, right, handbrake } = input;
  // Engine, brakes, reverse.
  if (throttle) car.v += (car.v < 0 ? CAR.brake : CAR.accel * (1 - Math.max(0, car.v) / CAR.top)) * dt;
  if (brake) car.v -= (car.v > 0.5 ? CAR.brake : CAR.accel * 0.7) * dt;
  car.v = clamp(car.v, -CAR.reverse, CAR.top);
  // Rolling and air: slows a car left alone; a handbrake slows it more.
  const slow = (CAR.roll + CAR.drag * car.v * car.v + (handbrake ? 7 : 0)) * dt;
  if (!throttle && !brake) car.v = Math.abs(car.v) <= slow ? 0 : car.v - Math.sign(car.v) * slow;
  else if (handbrake) car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 7 * dt);
  // Steering: less lock at speed, eased in.
  const want = ((left ? 1 : 0) - (right ? 1 : 0)) * (CAR.steer / (1 + Math.abs(car.v) / 14));
  car.steer += (want - car.steer) * Math.min(1, dt * 6);
  const yawRate = (car.v * Math.tan(car.steer)) / CAR.wheelbase * (handbrake ? 1.5 : 1);
  car.heading += yawRate * dt;
  // The way it goes follows the way it points — slowly in a skid.
  const grip = handbrake ? 1.4 : 9;
  car.travel = (car.travel ?? car.heading) + turn(car.travel ?? car.heading, car.heading) * Math.min(1, dt * grip);
  car.drift = Math.abs(turn(car.travel, car.heading));
  const nx = car.x - Math.sin(car.travel) * car.v * dt;
  const nz = car.z - Math.cos(car.travel) * car.v * dt;
  if (corners(nx, nz, car.heading).some(([x, z]) => blocked(x, z))) {
    const hit = Math.abs(car.v);
    car.v *= -0.25;
    car.travel = car.heading;
    return { hit };
  }
  car.x = nx;
  car.z = nz;
  return { hit: 0 };
}

/**
 * Go `d` metres along a road (a flat [x0, z0, x1, z1, …] list) from a
 * place on it ({ i: segment, t: 0–1, dir: +1 forward, −1 back }). Returns
 * the new place and whether the road ran out ({ i, t, dir, end }).
 */
export function follow(pts, at, d) {
  let { i, t, dir } = at;
  const n = pts.length / 2 - 1;
  let left = d;
  while (left > 0) {
    const ax = pts[i * 2];
    const az = pts[i * 2 + 1];
    const len = Math.hypot(pts[i * 2 + 2] - ax, pts[i * 2 + 3] - az) || 0.001;
    const room = (dir > 0 ? 1 - t : t) * len;
    if (left < room) {
      t += (dir * left) / len;
      return { i, t, dir, end: false };
    }
    left -= room;
    if (dir > 0 ? i >= n - 1 : i <= 0) return { i, t: dir > 0 ? 1 : 0, dir, end: true };
    i += dir;
    t = dir > 0 ? 0 : 1;
  }
  return { i, t, dir, end: false };
}

/** Where a place on a road is, which way it heads (game yaw), and the point `side` metres to its right. */
export function pointOn(pts, { i, t, dir }, side = 0) {
  const ax = pts[i * 2];
  const az = pts[i * 2 + 1];
  const bx = pts[i * 2 + 2];
  const bz = pts[i * 2 + 3];
  const dx = (bx - ax) * dir;
  const dz = (bz - az) * dir;
  const len = Math.hypot(dx, dz) || 1;
  // Right of the way you go: (−dz, dx) turned to x east, z south.
  const rx = -dz / len;
  const rz = dx / len;
  return { x: ax + (bx - ax) * t + rx * side, z: az + (bz - az) * t + rz * side, heading: Math.atan2(-dx, -dz) };
}
