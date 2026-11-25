import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCOOT, GRIP, JOINTS, KERB, GLANCE, newScoot, stepScoot, maxCurvature, cornerSpeed, kerbHop } from '../../src/city/scoot.js';
import { CREW, CREW_ORDER, rider, botRiders } from '../../src/city/crew.js';

const ride = (s, input, secs, dt = 1 / 60, blocked) => {
  let last = null;
  const all = [];
  for (let t = 0; t < secs; t += dt) {
    last = stepScoot(s, input, dt, blocked);
    all.push(last);
  }
  return { last, all };
};

test('scooter: a racing motor — 70 km/h in about four and a half seconds; a boost runs to about 85 and spends the gauge', () => {
  const s = newScoot(0, 0, 0);
  let t = 0;
  while (s.v * 3.6 < 69 && t < 10) {
    stepScoot(s, { throttle: true }, 1 / 60);
    t += 1 / 60;
  }
  assert.ok(t > 3.5 && t < 5.5, `0–69 km/h in ${t.toFixed(2)} s`);
  ride(s, { throttle: true }, 6);
  assert.ok(Math.abs(s.v * 3.6 - 70) < 1, `cruise ${(s.v * 3.6).toFixed(1)} km/h`);
  assert.ok(s.z < -150, 'it went north (−z)');
  const before = s.stamina;
  ride(s, { throttle: true, boost: true }, 3);
  assert.ok(s.v * 3.6 > 80 && s.v * 3.6 < 86.5, `boost ${(s.v * 3.6).toFixed(1)} km/h`);
  assert.ok(s.stamina < before - 0.5, 'the gauge went down');
  // run it dry: it stops boosting and needs a moment
  ride(s, { throttle: true, boost: true }, 4);
  assert.equal(s.boosting, false);
  ride(s, { throttle: true }, 8);
  assert.ok(Math.abs(s.v * 3.6 - 70) < 1.2, 'back to the cap after the boost');
});

test('scooter: brakes stop it, later on a wet road', () => {
  const stopIn = (grip) => {
    const s = newScoot(0, 0, 0);
    ride(s, { throttle: true }, 10, 1 / 60);
    assert.ok(s.v * 3.6 > 68);
    const z0 = s.z;
    let t = 0;
    while (s.v > 0.05 && t < 10) {
      stepScoot(s, { brake: true, grip }, 1 / 60);
      t += 1 / 60;
    }
    return z0 - s.z;
  };
  const dry = stopIn(GRIP.dry);
  const wet = stopIn(GRIP.wet);
  // 70 km/h to a stop in about 20 m (two seconds) on a dry road
  assert.ok(dry > 12 && dry < 26, `dry stop ${dry.toFixed(1)} m`);
  assert.ok(wet > dry * 1.3, `wet ${wet.toFixed(1)} m vs dry ${dry.toFixed(1)} m`);
});

test('scooter: lean-steer — it turns by leaning, tighter slow than fast; a wet road holds less lean', () => {
  assert.ok(maxCurvature(5) > maxCurvature(19) * 2);
  assert.ok(maxCurvature(19, GRIP.wet) < maxCurvature(19, GRIP.dry) * 0.85);
  // a city junction (about a 15 m radius) is taken at 40–55 km/h dry: slower than flat out, faster than a real scooter
  const v = cornerSpeed(1 / 15) * 3.6;
  assert.ok(v > 40 && v < 56, `corner ${v.toFixed(0)} km/h`);
  assert.ok(cornerSpeed(1 / 15, GRIP.wet) < cornerSpeed(1 / 15) * 0.85);
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true }, 5);
  ride(s, { throttle: true, left: true }, 1.5);
  assert.ok(s.lean > 0.3, `leaning left ${s.lean.toFixed(2)}`);
  assert.ok(s.heading > 0.5, 'and it turned left');
  const w = newScoot(0, 0, 0);
  ride(w, { throttle: true, grip: GRIP.wet }, 5);
  ride(w, { throttle: true, left: true, grip: GRIP.wet }, 1.5);
  assert.ok(w.lean < s.lean, 'less lean in the wet');
});

test('scooter: speed-sensitive steering — the same tap leans in more gently at 70 than at 25', () => {
  const tap = (secs) => {
    const s = newScoot(0, 0, 0);
    ride(s, { throttle: true }, secs);
    const v = s.v;
    ride(s, { throttle: true, left: true }, 0.12);
    return { lean: s.lean, v };
  };
  const slow = tap(1.2);
  const fast = tap(8);
  assert.ok(slow.v < 9 && fast.v > 18);
  assert.ok(fast.lean < slow.lean * 0.85, `fast ${fast.lean.toFixed(3)} slow ${slow.lean.toFixed(3)}`);
});

test('scooter: leaning hard at speed on a wet road, the back steps out', () => {
  const run = (grip) => {
    const s = newScoot(0, 0, 0);
    ride(s, { throttle: true, grip }, 8);
    let most = 0;
    for (let k = 0; k < 60; k++) {
      stepScoot(s, { throttle: true, left: true, grip }, 1 / 60);
      most = Math.max(most, s.skid);
    }
    return most;
  };
  assert.ok(run(GRIP.wet) > run(GRIP.dry) * 1.5, `wet ${run(GRIP.wet).toFixed(3)} dry ${run(GRIP.dry).toFixed(3)}`);
});

test('scooter: braking hard in a lean on a wet road slides the back out', () => {
  const run = (grip) => {
    const s = newScoot(0, 0, 0);
    ride(s, { throttle: true, grip }, 6);
    ride(s, { throttle: true, left: true, grip }, 0.8);
    let most = 0;
    for (let k = 0; k < 30; k++) {
      stepScoot(s, { brake: true, left: true, grip }, 1 / 60);
      most = Math.max(most, s.skid);
    }
    return most;
  };
  assert.ok(run(GRIP.wet) > run(GRIP.dry) * 1.5, `wet ${run(GRIP.wet).toFixed(3)} dry ${run(GRIP.dry).toFixed(3)}`);
});

test('scooter: small wheels bump on paving joints — a jolt every slab, not on smooth asphalt', () => {
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true, surface: 'smooth' }, 6);
  const paving = ride(s, { throttle: true, surface: 'paving' }, 2).all.filter((o) => o.jolt > 0).length;
  const smooth = ride(s, { throttle: true, surface: 'smooth' }, 2).all.filter((o) => o.jolt > 0).length;
  // ~14 m in two seconds over 0.42 m slabs
  assert.ok(paving > 25, `${paving} joints`);
  assert.equal(smooth, 0);
  assert.ok(JOINTS.concrete > JOINTS.paving);
});

test('scooter: a kerb met at an angle is a hop; met glancing it scrubs and wobbles; too tall is a wall', () => {
  assert.equal(kerbHop(0.12, 0.8), 'hop');
  assert.equal(kerbHop(0.12, 0.15), 'scrub');
  assert.equal(kerbHop(0.3, 1.2), 'wall');
  assert.equal(kerbHop(0.01, 1), 'none');
  assert.equal(kerbHop(-0.12, 1), 'drop');
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true }, 6);
  const v0 = s.v;
  const out = stepScoot(s, { throttle: true, kerb: { rise: 0.13, cross: 0.9 } }, 1 / 60);
  assert.equal(out.kerb, 'hop');
  assert.ok(s.airV > 1.5 && s.v < v0, 'up in the air, a little slower');
  const { all } = ride(s, { throttle: true }, 1);
  assert.ok(all.some((o) => o.landed > 0), 'and down again');
  const g = newScoot(0, 0, 0);
  ride(g, { throttle: true }, 6);
  const out2 = stepScoot(g, { throttle: true, kerb: { rise: 0.13, cross: 0.1, away: 1 } }, 1 / 60);
  assert.equal(out2.kerb, 'scrub');
  assert.ok(g.wobble > 0.4 && g.v < SCOOT.cruise * 0.8, 'wobbling, slowed');
  assert.ok(KERB.high > 0.15);
});

test('scooter: something solid head-on stops it and says how hard', () => {
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true }, 6);
  const v0 = s.v;
  // a wall straight across the way
  const { all } = ride(s, { throttle: true }, 4, 1 / 60, (x, z) => z < -60);
  const hit = all.find((o) => o.hit > 0);
  assert.ok(hit && hit.hit > v0 * 0.8, `hit at ${hit?.hit.toFixed(1)}`);
  assert.equal(SCOOT.cruise < SCOOT.boostTop, true);
});

test('scooter: a wall met at a slant is a glance — turned along it, slowed, still riding', () => {
  // A wall along the line x = 3 (east of the rider), met at about 20° heading north-east.
  const s = newScoot(0, 0, -0.35);
  ride(s, { throttle: true }, 0.01);
  s.v = 18;
  let glanced = 0;
  let hit = 0;
  for (let k = 0; k < 120; k++) {
    const o = stepScoot(s, { throttle: true }, 1 / 60, (x) => x > 3);
    glanced = Math.max(glanced, o.glance);
    hit = Math.max(hit, o.hit);
  }
  assert.equal(hit, 0, 'no head-on hit');
  assert.ok(glanced > 0 && glanced <= GLANCE, `glanced ${glanced}`);
  assert.ok(s.x < 3 && s.z < -20, 'scraped along it and on up the street');
  assert.ok(s.v > 6, `still going (${s.v.toFixed(1)} m/s)`);
});

test('crew: Snowpuff\'s plush riders, girls and boys both; bots always mix them', () => {
  assert.ok(CREW_ORDER.length >= 6);
  const she = CREW_ORDER.filter((id) => CREW[id].she);
  assert.ok(she.length >= 3 && CREW_ORDER.length - she.length >= 3, 'three or more of each');
  for (const id of CREW_ORDER) {
    const r = rider(id);
    assert.ok(r.name && r.scooter && r.color, id);
  }
  for (let k = 0; k < 40; k++) {
    let seed = k + 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const mine of CREW_ORDER) {
      const bots = botRiders(mine, 3, random);
      assert.equal(bots.length, 3);
      assert.ok(!bots.includes(mine));
      assert.equal(new Set(bots).size, 3);
      const field = [mine, ...bots].map((id) => Boolean(CREW[id].she));
      assert.ok(field.includes(true) && field.includes(false), `${mine}: ${bots}`);
    }
  }
});
