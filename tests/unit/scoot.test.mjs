import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCOOT, GRIP, JOINTS, KERB, newScoot, stepScoot, maxCurvature, kerbHop } from '../../src/city/scoot.js';
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

test('scooter: the motor holds Korea\'s 25 km/h cap; a boost runs to about 32 and spends the gauge', () => {
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true }, 12);
  assert.ok(Math.abs(s.v * 3.6 - 25) < 0.6, `cruise ${(s.v * 3.6).toFixed(1)} km/h`);
  assert.ok(s.z < -50, 'it went north (−z)');
  const before = s.stamina;
  ride(s, { throttle: true, boost: true }, 3);
  assert.ok(s.v * 3.6 > 30 && s.v * 3.6 < 33.5, `boost ${(s.v * 3.6).toFixed(1)} km/h`);
  assert.ok(s.stamina < before - 0.5, 'the gauge went down');
  // run it dry: it stops boosting and needs a moment
  ride(s, { throttle: true, boost: true }, 4);
  assert.equal(s.boosting, false);
  ride(s, { throttle: true }, 6);
  assert.ok(Math.abs(s.v * 3.6 - 25) < 0.8, 'back to the cap after the boost');
});

test('scooter: brakes stop it, later on a wet road', () => {
  const stopIn = (grip) => {
    const s = newScoot(0, 0, 0);
    ride(s, { throttle: true }, 10, 1 / 60);
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
  assert.ok(dry < 6, `dry stop ${dry.toFixed(1)} m`);
  assert.ok(wet > dry * 1.3, `wet ${wet.toFixed(1)} m vs dry ${dry.toFixed(1)} m`);
});

test('scooter: lean-steer — it turns by leaning, tighter slow than fast; a wet road holds less lean', () => {
  assert.ok(maxCurvature(2) > maxCurvature(7) * 2);
  assert.ok(maxCurvature(7, GRIP.wet) < maxCurvature(7, GRIP.dry));
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
  assert.ok(g.wobble > 0.4 && g.v < 6, 'wobbling, slowed');
  assert.ok(KERB.high > 0.15);
});

test('scooter: something solid ahead stops it and says how hard', () => {
  const s = newScoot(0, 0, 0);
  ride(s, { throttle: true }, 6);
  const out = stepScoot(s, { throttle: true }, 1 / 60, (x, z) => z < -30);
  const { last } = ride(s, { throttle: true }, 10, 1 / 60, (x, z) => z < s.z - 0.1 && z < -20);
  assert.ok(out.hit >= 0 && last.hit >= 0);
  assert.equal(SCOOT.cruise < SCOOT.boostTop, true);
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
