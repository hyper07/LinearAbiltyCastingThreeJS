import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE, GRIP, newBike, stepBike, maxCurvature, boxGap, bikeGap, closeCall, slipstream } from '../../src/city/ride.js';

const ride = (b, input, seconds, blocked) => {
  let hit = 0;
  for (let i = 0; i < seconds * 60; i++) hit = Math.max(hit, stepBike(b, input, 1 / 60, blocked).hit);
  return hit;
};

test('pedalling holds a city cruise (6–12 m/s); a sprint goes faster and spends stamina', () => {
  const b = newBike(0, 0, 0);
  ride(b, { pedal: true }, 8);
  assert.ok(b.v > 8.5 && b.v <= BIKE.cruise + 1e-9, `cruising at ${b.v.toFixed(1)} m/s`);
  assert.ok(b.z < -40, 'heading 0 goes north (−z)');
  assert.equal(b.stamina, 1);
  ride(b, { pedal: true, sprint: true }, 2.5);
  assert.ok(b.v > 12 && b.v <= BIKE.sprint + 1e-9, `sprinting at ${b.v.toFixed(1)} m/s`);
  assert.ok(b.stamina < 0.6 && b.stamina > 0.4, `half the stamina gone (${b.stamina.toFixed(2)})`);
  assert.ok(b.standing, 'standing on the pedals to sprint');
  let dry = false;
  for (let i = 0; i < 240 && !dry; i++) {
    stepBike(b, { pedal: true, sprint: true }, 1 / 60);
    dry = b.stamina === 0;
  }
  assert.ok(dry, 'run dry');
  stepBike(b, { pedal: true, sprint: true }, 1 / 60);
  assert.ok(!b.sprinting && b.tired > 0, 'and must recover before sprinting again');
  ride(b, { pedal: true }, 4);
  assert.ok(b.v <= BIKE.cruise + 0.2, 'back to a cruise');
  assert.ok(b.stamina > 0.1, 'stamina comes back');
});

test('a tailwind sprints for free; a slipstream refills the gauge faster', () => {
  const a = newBike(0, 0, 0);
  ride(a, { pedal: true, sprint: true, free: true }, 5);
  assert.equal(a.stamina, 1);
  assert.ok(a.v > 12);
  const plain = newBike(0, 0, 0);
  const drafting = newBike(0, 0, 0);
  plain.stamina = drafting.stamina = 0.2;
  ride(plain, { pedal: true }, 2);
  ride(drafting, { pedal: true, draft: 1 }, 2);
  assert.ok(drafting.stamina > plain.stamina + 0.3, `${drafting.stamina.toFixed(2)} against ${plain.stamina.toFixed(2)}`);
});

test('brakes stop it within a few metres, longer on a wet road; coasting rolls on', () => {
  const stop = (grip) => {
    const b = newBike(0, 0, 0);
    b.v = 10;
    let i = 0;
    while (b.v > 0.3 && i++ < 600) stepBike(b, { brake: true, grip }, 1 / 60);
    return -b.z;
  };
  const dry = stop(GRIP.dry);
  const wet = stop(GRIP.wet);
  assert.ok(dry > 4 && dry < 10, `dry: ${dry.toFixed(1)} m`);
  assert.ok(wet > dry * 1.2, `wet takes longer: ${wet.toFixed(1)} m`);
  const coast = newBike(0, 0, 0);
  coast.v = 10;
  ride(coast, {}, 3);
  assert.ok(coast.v > 7, 'a bike rolls a long way on its own');
});

test('steering is leaning: left turns left, the lean is limited by grip, and fast means a wider turn', () => {
  const left = newBike(0, 0, 0);
  left.v = 8;
  ride(left, { pedal: true, left: true }, 1);
  assert.ok(left.heading > 0.3, 'turned left');
  assert.ok(left.lean > 0.3, 'leaning in');
  const right = newBike(0, 0, 0);
  right.v = 8;
  ride(right, { pedal: true, right: true }, 1);
  assert.ok(right.heading < -0.3 && right.lean < 0);
  const wet = newBike(0, 0, 0);
  wet.v = 8;
  ride(wet, { pedal: true, left: true, grip: GRIP.snow }, 1.5);
  assert.ok(wet.lean < left.lean, 'less lean on snow');
  assert.ok(maxCurvature(12) < maxCurvature(5), 'a wider turn at speed');
  assert.ok(1 / maxCurvature(5) < 4, 'an alley corner (4 m) is fine at 5 m/s');
  assert.ok(1 / maxCurvature(12) > 10, '…and not at 12 m/s');
});

test('the skid slides the back round: the bike points one way and goes another', () => {
  const b = newBike(0, 0, 0);
  b.v = 10;
  ride(b, { skid: true, left: true }, 0.6);
  assert.ok(b.skid > 0.2, `sliding (${b.skid.toFixed(2)})`);
  assert.ok(b.v < 10);
});

test('uphill is slower, downhill faster', () => {
  const up = newBike(0, 0, 0);
  const down = newBike(0, 0, 0);
  ride(up, { pedal: true, grade: 0.1 }, 8);
  ride(down, { pedal: true, grade: -0.1 }, 8);
  assert.ok(up.v < BIKE.cruise * 0.8, `up at ${up.v.toFixed(1)}`);
  assert.ok(down.v > BIKE.cruise, `down at ${down.v.toFixed(1)}`);
  assert.ok(up.standing, 'standing up to climb');
});

test('riding into a wall stops it and says how hard', () => {
  const b = newBike(0, 0, 0);
  b.v = 9;
  const hit = ride(b, { pedal: true }, 2, (x, z) => z < -5);
  assert.ok(hit > 8, `hit at ${hit.toFixed(1)}`);
  assert.ok(b.z > -5);
});

test('the gap to a car, touching, a close call and its slipstream', () => {
  const car = { x: 0, z: 0, heading: 0, halfLength: 2.25, halfWidth: 0.95 };
  assert.ok(Math.abs(boxGap(3, 0, car) - 2.05) < 1e-9, 'beside it');
  assert.ok(Math.abs(boxGap(0, -4, car) - 1.75) < 1e-9, 'ahead of it');
  assert.ok(boxGap(0, 0, car) < 0, 'inside');
  const touching = newBike(1.1, 0, 0);
  assert.ok(bikeGap(touching, car) < 0);
  const close = newBike(1.9, 0, 0);
  const gap = bikeGap(close, car);
  assert.ok(gap > 0 && closeCall(gap, 8), 'a close call at speed');
  assert.ok(!closeCall(gap, 2), 'not at walking pace');
  // Close behind a car going north (−z) is +z of it.
  assert.ok(slipstream(newBike(0, 4, 0), car, 10) > 0.5);
  assert.equal(slipstream(newBike(3, 4, 0), car, 10), 0, 'not off to the side');
  assert.equal(slipstream(newBike(0, -6, 0), car, 10), 0, 'not in front');
});
