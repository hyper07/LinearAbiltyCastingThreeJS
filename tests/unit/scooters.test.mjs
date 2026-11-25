import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCOOT, SCOOTERS, SCOOTER_ORDER, STAT_NAMES, newScoot, stepScoot, cornerSpeed, scooterStats, specFor } from '../../src/city/scoot.js';

/** Cornering at a held speed: the steady radius at full lean, the time to turn 45° from straight, and a flick (full left to 80% of full right's yaw). */
export function cornering(kmh, spec = SCOOT) {
  const v = kmh / 3.6;
  const dt = 1 / 120;
  const turned = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const held = (s, steer) => {
    stepScoot(s, { steer }, dt, undefined, spec);
    s.v = v;
  };
  const s = newScoot(0, 0, 0);
  s.v = v;
  for (let t = 0; t < 4; t += dt) held(s, 1);
  const h0 = s.heading;
  held(s, 1);
  const rate = turned(h0, s.heading) / dt;
  const a = newScoot(0, 0, 0);
  a.v = v;
  let t45 = 0;
  while (Math.abs(a.heading) < Math.PI / 4 && t45 < 10) {
    held(a, 1);
    t45 += dt;
  }
  let flick = 0;
  let last = s.heading;
  while (flick < 5) {
    held(s, -1);
    flick += dt;
    const r = turned(last, s.heading) / dt;
    last = s.heading;
    if (r < -rate * 0.8) break;
  }
  return { radius: v / rate, t45, flick };
}

test('scooter: cornering — tight at city speeds, quick to change direction, steady at 70', () => {
  // Before this pass: radius 6.1 / 16.9 / 33.1 m, 45° in 0.82 / 1.23 / 1.67 s, a flick 0.56 / 0.64 / 0.74 s.
  const at = Object.fromEntries([30, 50, 70].map((k) => [k, cornering(k)]));
  assert.ok(at[30].radius < 5 && at[50].radius < 12.5 && at[70].radius < 28 && at[70].radius > 20, JSON.stringify(at));
  assert.ok(at[30].t45 < 0.65 && at[50].t45 < 0.9 && at[70].t45 < 1.35, JSON.stringify(at));
  assert.ok(at[30].flick < 0.4 && at[50].flick < 0.45 && at[70].flick < 0.5, JSON.stringify(at));
  // A 90° city junction (about a 15 m line) at 45 km/h or more without the brakes or a drift.
  assert.ok(cornerSpeed(1 / 15) * 3.6 > 48, `${(cornerSpeed(1 / 15) * 3.6).toFixed(0)} km/h`);
  // Steady at 70: a tap (0.1 s) is a lane change — a few degrees, settled again — not a swerve.
  const s = newScoot(0, 0, 0);
  s.v = SCOOT.cruise;
  for (let t = 0; t < 0.1; t += 1 / 120) stepScoot(s, { throttle: true, left: true }, 1 / 120);
  for (let t = 0; t < 1.2; t += 1 / 120) stepScoot(s, { throttle: true }, 1 / 120);
  assert.ok(Math.abs(s.heading) < 0.12 && Math.abs(s.lean) < 0.01, `heading ${s.heading.toFixed(3)}, lean ${s.lean.toFixed(3)}`);
});

test('scooters: six of them, each with its own model and bars; more top speed costs cornering and shock absorption', () => {
  assert.ok(SCOOTER_ORDER.length >= 5 && SCOOTER_ORDER.every((id) => SCOOTERS[id].name && SCOOTERS[id].text));
  const st = Object.fromEntries(SCOOTER_ORDER.map((id) => [id, scooterStats(id)]));
  for (const s of Object.values(st)) for (const k of Object.keys(STAT_NAMES)) assert.ok(s[k] > 0 && s[k] <= 1, k);
  // the trade-off: the two fastest corner worse and soak up less than the two slowest
  const bySpeed = SCOOTER_ORDER.slice().sort((a, b) => st[b].speed - st[a].speed);
  for (const f of bySpeed.slice(0, 2)) for (const s of bySpeed.slice(-2)) assert.ok(st[f].corner < st[s].corner && st[f].shock < st[s].shock, `${f} vs ${s}`);
  assert.ok(st.racer.speed > st.city.speed && st.racer.corner < st.city.corner && st.racer.shock < st.city.shock);
  assert.ok(st.chunky.shock === Math.max(...Object.values(st).map((s) => s.shock)), 'the off-roader soaks up the most');
  assert.ok(st.kick.accel === Math.max(...Object.values(st).map((s) => s.accel)), 'the kick scooter is quickest off the line');
  // and they ride as their bars say
  const top = (id) => {
    const s = newScoot(0, 0, 0);
    for (let t = 0; t < 14; t += 1 / 60) stepScoot(s, { throttle: true }, 1 / 60, undefined, specFor(id));
    return s.v * 3.6;
  };
  assert.ok(top('racer') > top('city') + 4 && top('city') > top('chunky') + 3, `${top('racer')} ${top('city')} ${top('chunky')}`);
  assert.ok(cornering(50, specFor('racer')).radius > cornering(50, specFor('kick')).radius * 1.3);
  // a rider's own feel rides on any scooter (Mallow pulls a little harder on all of them)
  assert.ok(specFor('racer', { accel: 6.9 }).accel > specFor('racer').accel);
});

test('scooters: shock absorption matters — a steel road plate at speed shakes and slows a stiff racer more than the off-roader', () => {
  const over = (id) => {
    const s = newScoot(0, 0, 0);
    s.v = 18;
    const out = stepScoot(s, { bump: 0.8 }, 1 / 60, undefined, specFor(id));
    const calm = newScoot(0, 0, 0);
    calm.v = 18;
    stepScoot(calm, {}, 1 / 60, undefined, specFor(id));
    return { jolt: out.jolt, lost: calm.v - s.v, wobble: s.wobble };
  };
  const racer = over('racer');
  const chunky = over('chunky');
  assert.ok(racer.jolt > chunky.jolt * 1.6, `jolt ${racer.jolt.toFixed(2)} vs ${chunky.jolt.toFixed(2)}`);
  assert.ok(racer.lost > chunky.lost * 2 && racer.wobble > chunky.wobble, JSON.stringify({ racer, chunky }));
  // and an alley's concrete: joint after joint
  const cobbles = (id) => {
    const s = newScoot(0, 0, 0);
    s.v = 14;
    let shake = 0;
    for (let t = 0; t < 2; t += 1 / 60) shake += stepScoot(s, { throttle: true, surface: 'concrete' }, 1 / 60, undefined, specFor(id)).jolt;
    return shake;
  };
  assert.ok(cobbles('racer') > cobbles('chunky') * 1.6, `${cobbles('racer')} vs ${cobbles('chunky')}`);
});
