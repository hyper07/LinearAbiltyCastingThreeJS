/**
 * The rivals' brains, pure: each one picks a line down the run, steers
 * round barriers, goes for stars and snowball piles, pops over low logs,
 * spins off kickers, and throws snowballs at whoever is just ahead. Three
 * personalities — careful, reckless, thrower — and a little skill noise so
 * they don't ride like robots. The input they return is the same one a
 * player's keys make (physics.step).
 */
import { between, frameAt, kickerAt } from './course.js';
import { BARRIER_H } from './physics.js';
import { pickTarget, canThrow } from './race.js';

export const PERSONALITIES = {
  careful: { skill: 0.92, tuck: 0.6, risk: 0.15, throwRate: 0.25, trick: 0.35, wander: 0.35 },
  reckless: { skill: 0.78, tuck: 0.95, risk: 0.9, throwRate: 0.35, trick: 0.9, wander: 0.7 },
  thrower: { skill: 0.85, tuck: 0.75, risk: 0.45, throwRate: 1.0, trick: 0.5, wander: 0.5 }
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** A brain for one rival. `rand` is a seeded () => [0,1). */
export function newBrain(kind, rand) {
  const p = PERSONALITIES[kind] ?? PERSONALITIES.careful;
  return { kind, p, rand, phase: rand() * 100, lineBias: (rand() * 2 - 1) * 0.5, plan: null, jumpHold: 0, throwWait: 1 + rand() * 2, shieldWait: 0 };
}

const _f = {};

/**
 * Decide this frame's input for an AI racer.
 * @returns {{ steer, tuck, jump, flip, throw, shield }}
 */
export function think(brain, racer, course, racers, dt) {
  const r = racer.rider;
  const p = brain.p;
  const out = { steer: 0, tuck: false, jump: false, flip: 0, throw: false, shield: false };
  if (racer.finished) return out;
  const f = frameAt(course, r.s, _f);
  const W = f.width;
  const look = 10 + r.speed * 1.1;

  // ---- in the air: a planned spin (and sometimes a flip), released early so it lands clean
  if (r.air) {
    if (!brain.plan) {
      const big = r.vy > 4.5 || r.airTime < 0.05;
      const go = brain.rand() < p.trick * (big ? 1 : 0.3);
      brain.plan = go ? { spin: (brain.rand() < 0.5 ? -1 : 1) * Math.PI * (big ? (brain.rand() < 0.5 ? 2 : 1) : 1), flip: big && brain.rand() < p.trick * 0.25 ? (brain.rand() < 0.5 ? 1 : -1) : 0 } : { spin: 0, flip: 0 };
    }
    const left = brain.plan.spin - r.spin;
    if (Math.abs(left) > 0.75) out.steer = Math.sign(left);
    const fl = brain.plan.flip * Math.PI * 2 - r.flip;
    if (brain.plan.flip && Math.abs(fl) > 0.9) out.flip = Math.sign(fl) * 1;
    return out;
  }
  brain.plan = null;

  // ---- choose where to be: a wandering line, pulled toward stars, piles and kickers
  brain.phase += dt;
  let target = clamp(Math.sin(r.s / 90 + brain.phase * 0.05) * W * 0.45 * p.wander + brain.lineBias * W * 0.4, -W + 2, W - 2);
  let pull = 0;
  for (const st of between(course.stars, r.s + 4, r.s + look * 1.4)) {
    if (racer.taken.has(st.id) || (st.risky && brain.rand() > p.risk + 0.3)) continue;
    if (Math.abs(st.lat - r.lat) > 9) continue;
    target = st.lat;
    pull = 1;
    break;
  }
  if (racer.ammo < 3 && !pull) {
    for (const pl of between(course.piles, r.s + 4, r.s + look * 1.5)) {
      if (racer.taken.has(pl.id) || Math.abs(pl.lat - r.lat) > 11) continue;
      target = pl.lat;
      pull = 1;
      break;
    }
  }
  if (p.risk > 0.4 && !pull) {
    for (const k of course.kickers) {
      if (k.s < r.s + 6 || k.s > r.s + look * 2) continue;
      if (Math.abs(k.lat - r.lat) < 12) target = k.lat;
      break;
    }
  }

  // ---- steer round barriers in the way (or hop the low ones)
  const predLat = r.lat + Math.sin(r.yaw) * r.speed * 0.45;
  let danger = false;
  for (const ob of between(course.obstacles, r.s + 1, r.s + look)) {
    const t = (ob.s - r.s) / Math.max(4, r.speed);
    const latAt = r.lat + Math.sin(r.yaw) * r.speed * t;
    const clear = ob.w + 1.4;
    if (Math.abs(latAt - ob.lat) > clear + 0.6 && Math.abs(target - ob.lat) > clear) continue;
    danger = true;
    if ((BARRIER_H[ob.kind] ?? 2) < 0.8 && ob.s - r.s < 7 + r.speed * 0.25 && ob.s - r.s > 2) {
      out.jump = brain.jumpHold < 0.25;
    }
    // pass on the side with more room
    const leftRoom = ob.lat - ob.w - (-W);
    const rightRoom = W - (ob.lat + ob.w);
    const side = Math.abs(latAt - ob.lat) > 0.3 ? Math.sign(latAt - ob.lat) : rightRoom > leftRoom ? 1 : -1;
    const want = ob.lat + side * (clear + 0.8);
    target = clamp(want, -W + 1, W - 1);
    break;
  }
  if (out.jump) brain.jumpHold += dt;
  else brain.jumpHold = 0;
  // A kicker under the board: crouch, then pop at the lip for extra air.
  const k = kickerAt(course, r.s + r.speed * 0.25, r.lat);
  if (k && p.risk > 0.3) out.jump = r.s < k.s + k.len * 0.8;

  // ---- steering: a damped pursuit of the target line, with a little skill noise
  const noise = (1 - p.skill) * Math.sin(brain.phase * 2.3 + r.s * 0.05) * 0.6;
  const err = target - predLat;
  out.steer = clamp(err * 0.32 - r.yaw * 1.1 + noise, -1, 1);
  if (Math.abs(out.steer) < 0.08) out.steer = 0;
  out.tuck = !danger && Math.abs(out.steer) < 0.35 && brain.rand() < p.tuck + 0.2;

  // ---- snowballs
  brain.throwWait -= dt;
  if (canThrow(racer) && brain.throwWait <= 0) {
    const tgt = pickTarget(racer, racers);
    if (tgt) {
      out.throw = true;
      brain.throwWait = (2.2 + brain.rand() * 3.5) / p.throwRate;
    } else brain.throwWait = 0.4;
  }
  if (racer.shieldItem) {
    brain.shieldWait += dt;
    if (brain.shieldWait > 3 + brain.rand() * 6) {
      out.shield = true;
      brain.shieldWait = 0;
    }
  }
  return out;
}
