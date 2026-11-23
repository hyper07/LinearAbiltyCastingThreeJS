/**
 * Steering responsiveness, measured on the real rider physics (physics.js):
 *   rise63   time from a steer key going down until the turn rate reaches 63 % of where it settles
 *   swap     time from a full left→right swap until the sideways velocity changes sign
 *   head63   the same as rise63, for the board's visible heading (what the rider model shows)
 * at about 60 km/h on a clear stretch of Marshmallow Hill. Shared by the unit
 * test (limits) and by `node tests/unit/steering.harness.mjs` (prints the numbers).
 */
import { buildCourse, between } from '../../src/snowpuff/course.js';
import { mountainById } from '../../src/snowpuff/mountains.js';
import { newRider, step, settle } from '../../src/snowpuff/physics.js';

const DT = 1 / 120;

export function measureSteering({ speed = 16.7, mountain = 'marshmallow' } = {}) {
  const c = buildCourse(mountainById(mountain));
  let s0 = 220;
  while (between(c.obstacles, s0 - 5, s0 + 90).length || c.kickers.some((k) => k.s > s0 - 10 && k.s < s0 + 100) || Math.abs(c.curvature[Math.round(s0)]) > 1 / 300) s0 += 3;
  const fresh = () => {
    const r = newRider({ s: s0, lat: 0, speed });
    settle(r, c);
    // keep the speed steady so we measure steering, not acceleration
    return r;
  };
  // ---- rise: yaw rate of the travel direction and of the board heading
  const rateOf = (key) => {
    const r = fresh();
    const out = [];
    let prev = r[key];
    for (let t = 0; t < 1.5; t += DT) {
      step(r, { steer: 1 }, c, DT);
      r.speed = speed;
      out.push([t + DT, (r[key] - prev) / DT]);
      prev = r[key];
    }
    const settled = Math.max(...out.map((x) => x[1]));
    const hit = out.find((x) => x[1] >= 0.63 * settled);
    return { t63: hit ? hit[0] : Infinity, peak: settled };
  };
  const rise = rateOf('yaw');
  const head = rateOf('head');
  // ---- swap: carve left (for `hold` seconds), then full right: time until sideways velocity flips
  const swapAfter = (hold) => {
    const r = fresh();
    for (let t = 0; t < hold; t += DT) {
      step(r, { steer: -1 }, c, DT);
      r.speed = speed;
    }
    const lat0 = Math.sign(Math.sin(r.yaw)) || -1;
    for (let t = 0; t < 2; t += DT) {
      step(r, { steer: 1 }, c, DT);
      r.speed = speed;
      if (Math.sign(Math.sin(r.yaw)) !== lat0 && Math.sin(r.yaw) !== 0) return t + DT;
    }
    return Infinity;
  };
  const swap = swapAfter(1);
  const slalom = swapAfter(0.35);
  return { rise63: rise.t63, peakYawRate: rise.peak, head63: head.t63, swap, slalom };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const v of [8.3, 16.7, 25]) {
    const m = measureSteering({ speed: v });
    console.log(`${Math.round(v * 3.6)} km/h  rise63 ${(m.rise63 * 1000).toFixed(0)} ms  head63 ${(m.head63 * 1000).toFixed(0)} ms  swap ${(m.swap * 1000).toFixed(0)} ms (after 1 s full lock)  slalom swap ${(m.slalom * 1000).toFixed(0)} ms (after 0.35 s)  peak yaw rate ${m.peakYawRate.toFixed(2)} rad/s`);
  }
}
