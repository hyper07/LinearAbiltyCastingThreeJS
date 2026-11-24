/**
 * Riding an electric kick scooter, as plain numbers (no drawing, so the
 * tests can ride one into a kerb): the motor pulls up to Korea's legal cap
 * (25 km/h), a boost spends the battery gauge for a few seconds at about
 * 32 km/h, brakes, and steering by leaning — lean in and it curves (radius
 * v² / (g·tan lean)), turning by the bars when slow. Small solid wheels feel
 * the street: every paving joint is a bump (a jolt and a sliver of speed),
 * a kerb taken at an angle is a hop up, one met glancing scrubs along it and
 * wobbles you. Wet roads have less grip: less lean, longer braking, and the
 * back steps out — it slides.
 *
 * A scooter is { x, z, heading, travel, v, lean, steer, stamina (the boost
 * gauge, 0–1), … }: heading the way it points (0 is north, −z; turning left
 * as it grows — the game's yaw), travel the way it is going (they part in a
 * slide), v its speed in m/s, lean in radians (+ is leaning left).
 */

export const SCOOT = {
  cruise: 6.95, // 25 km/h: the motor's cap
  boostTop: 8.9, // 32 km/h on a boost
  accel: 2.6,
  boostAccel: 3.4,
  brake: 5.6,
  skidBrake: 3.6,
  roll: 0.14,
  drag: 0.0045,
  maxLean: 0.6, // about 34°: small wheels don't like more
  leanRate: 5.2,
  wheelbase: 0.82,
  wheel: 0.095, // wheel radius, metres
  drain: 0.2, // gauge a second while boosting: five seconds of it
  regen: 0.05, // a second while riding
  rest: 0.09, // a second while coasting or braking
  halfLength: 0.5,
  halfWidth: 0.3,
  grip: 1
};

/** Grip by surface: dry, wet (rain, a storm, fog's damp), snow. */
export const GRIP = { dry: 1, wet: 0.7, snow: 0.48 };

/** Joints in the street a small wheel feels, metres apart: paving slabs, an alley's concrete, worn asphalt. */
export const JOINTS = { paving: 0.42, concrete: 1.6, asphalt: 7.5, smooth: 0 };

/** Kerbs: below `low` it rolls over; up to `high` it is a hop if met at an angle (≥ `angle` rad from glancing); above that it's a wall. */
export const KERB = { low: 0.035, high: 0.2, angle: 0.4, hopV: 2.1 };

const G = 9.81;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** A scooter at rest at a place. */
export function newScoot(x, z, heading) {
  return { x, z, heading, travel: heading, v: 0, lean: 0, steer: 0, stamina: 1, roll: 0, skid: 0, boosting: false, sprinting: false, braking: false, tired: 0, bump: 0, joint: 0, air: 0, airV: 0, wobble: 0 };
}

/** The tightest turn at a speed on a surface, as a curvature (1 / radius in metres). */
export function maxCurvature(v, grip = 1, spec = SCOOT) {
  const lean = Math.min(spec.maxLean, Math.atan(grip * 0.95));
  // Slow, it steers by the bars (about a 1.8 m circle at walking pace); faster, by leaning.
  return Math.min(1 / 1.8, (G * Math.tan(lean)) / Math.max(1, v * v));
}

/**
 * What a kerb does to a scooter: `rise` metres up (negative: a step down),
 * met `cross` radians off glancing (0 = riding along it, π/2 = straight at it).
 *   'none'  nothing there to speak of
 *   'drop'  off a kerb: a thump on landing
 *   'hop'   up it, a hop (met at an angle, not too fast to be thrown)
 *   'scrub' met glancing: the front wheel grinds along it — a wobble, slowed, kept off it
 *   'wall'  too high to get up
 */
export function kerbHop(rise, cross) {
  if (rise <= -KERB.low) return 'drop';
  if (rise < KERB.low) return 'none';
  if (rise > KERB.high) return 'wall';
  return Math.abs(cross) >= KERB.angle ? 'hop' : 'scrub';
}

/**
 * Move a scooter on by dt seconds. `input`: { throttle, brake, left, right (or
 * steer −1…1), boost, free (a tailwind: boosting costs nothing), extra (m/s
 * more top speed), grade (rise over run), grip (GRIP.*), draft (0–1),
 * surface ('paving' | 'concrete' | 'asphalt' | 'smooth'), kerb ({ rise, cross })
 * }. `blocked(x, z)` says whether a point is inside something solid.
 * Returns { hit (speed it hit something at), jolt (a joint's bump, 0–1),
 * kerb (what a kerb did: kerbHop's word, or null), landed (thump, m/s) }.
 */
export function stepScoot(s, input, dt, blocked = () => false, spec = SCOOT) {
  const grip = clamp(input.grip ?? 1, 0.2, 1.1);
  const grade = clamp(input.grade ?? 0, -0.25, 0.25);
  const free = Boolean(input.free);
  const out = { hit: 0, jolt: 0, kerb: null, landed: 0 };
  // Boost: from the gauge (or a tailwind); run it dry and it needs a moment before it boosts again.
  s.tired = Math.max(0, (s.tired ?? 0) - dt);
  const canBoost = free || (s.stamina > 0.02 && s.tired <= 0);
  s.boosting = Boolean(input.boost && canBoost && !input.brake && s.v > -0.3);
  s.sprinting = s.boosting;
  const throttle = Boolean(input.throttle || s.boosting) && !input.brake;
  s.throttle = throttle;
  // The motor: pulls hard off the line and eases off toward its cap; uphill it holds less.
  const top = ((s.boosting ? spec.boostTop : spec.cruise) + (input.extra ?? 0)) * (grade > 0 ? Math.max(0.45, 1 - grade * 2.6) : 1);
  if (throttle) {
    const push = (s.boosting ? spec.boostAccel : spec.accel) * (1.3 - Math.min(1, Math.max(0, s.v) / top) * 1.0);
    if (s.v < top) s.v = Math.min(top, s.v + push * dt);
    else s.v -= Math.min(s.v - top, 1.4 * dt); // after a boost or a hill, back to the cap
  }
  // Brakes: firm on a dry road, much less on a wet one; stopped and still holding back, it rolls back a little.
  s.braking = Boolean(input.brake && s.v > 0.3);
  if (input.brake) {
    if (s.v > 0.3) s.v = Math.max(0, s.v - spec.brake * Math.min(1, grip * 1.05) * dt);
    else s.v = Math.max(-1, s.v - 1.6 * dt);
  } else if (s.v < 0) s.v = Math.min(0, s.v + 3 * dt);
  // Rolling resistance and air, more on rough paving; the hill.
  const rough = input.surface === 'paving' ? 1.8 : input.surface === 'concrete' ? 1.3 : 1;
  const slow = (spec.roll * rough + spec.drag * s.v * s.v * (1 - 0.35 * (input.draft ?? 0))) * dt;
  if (!throttle && s.v > 0) s.v = Math.max(0, s.v - slow);
  else if (s.v > 0) s.v -= slow * 0.4;
  s.v -= G * grade * 0.6 * dt;
  if (s.v > 0 && s.v < 0.05 && !throttle && grade >= 0) s.v = 0;
  s.v = clamp(s.v, -1, spec.boostTop + 3);
  // The gauge: spent boosting (not on a tailwind), back slowly riding, faster coasting or in a slipstream.
  if (s.boosting && !free) {
    s.stamina = Math.max(0, s.stamina - spec.drain * dt);
    if (s.stamina <= 0.02) {
      s.stamina = 0;
      s.tired = 1.2;
    }
  } else s.stamina = Math.min(1, s.stamina + (throttle ? spec.regen : spec.rest) * dt + (input.draft ?? 0) * 0.2 * dt);
  // Steering by leaning: the keys (or a bot's steer) ask for a lean, the grip says how far.
  const wheel = clamp(input.steer ?? (input.left ? 1 : 0) - (input.right ? 1 : 0), -1, 1);
  const maxLean = Math.min(spec.maxLean, Math.atan(grip * 0.95));
  const speedK = clamp(s.v / 3, 0, 1);
  s.lean += (wheel * maxLean * speedK - s.lean) * Math.min(1, dt * spec.leanRate);
  s.steer += (wheel - s.steer) * Math.min(1, dt * 8);
  const byLean = (G * Math.tan(s.lean)) / Math.max(1, s.v * s.v);
  const byBars = (Math.tan(s.steer * 0.6) / spec.wheelbase) * (1 - speedK);
  const curve = clamp(byLean + byBars, -1 / 1.8, 1 / 1.8);
  s.heading += curve * s.v * dt;
  // The way it goes follows the way it points; on a wet road, braking in a lean, the back steps out.
  const braking = input.brake && s.v > 2;
  const loose = braking ? Math.abs(s.lean) / Math.max(0.05, maxLean) : 0;
  const hold = (14 * grip) / (1 + loose * (grip < 0.9 ? 3.5 : 1.2));
  s.travel = (s.travel ?? s.heading) + turn(s.travel ?? s.heading, s.heading) * Math.min(1, dt * hold);
  s.skid = Math.abs(turn(s.travel, s.heading));
  // The wheels roll; joints in the street come by and each one is a bump.
  s.roll = (s.roll + (s.v / spec.wheel) * dt) % (Math.PI * 2);
  const gap = JOINTS[input.surface] ?? 0;
  if (gap > 0 && s.v > 0.5) {
    s.joint = (s.joint ?? 0) + s.v * dt;
    if (s.joint >= gap) {
      s.joint %= gap;
      // A small wheel feels it more the faster it goes; a slab joint less than a paver's edge.
      const k = clamp((s.v / spec.cruise) * (0.095 / spec.wheel) * (input.surface === 'asphalt' ? 0.55 : input.surface === 'concrete' ? 0.8 : 0.6), 0, 1.2);
      out.jolt = k;
      s.bump = Math.max(s.bump ?? 0, k);
      s.v = Math.max(0, s.v - 0.02 * k);
    }
  }
  s.bump = Math.max(0, (s.bump ?? 0) - dt * 6);
  s.wobble = Math.max(0, (s.wobble ?? 0) - dt * 1.3);
  // In the air after a hop: up and down again (the ground under you is the race's business).
  if (s.air > 0 || s.airV > 0) {
    s.airV -= G * dt;
    s.air += s.airV * dt;
    if (s.air <= 0) {
      out.landed = Math.max(0, -s.airV);
      s.air = 0;
      s.airV = 0;
      s.bump = Math.max(s.bump, Math.min(1, out.landed / 2.5));
    }
  }
  // A kerb ahead (the race measures it): hop up it, scrub along it, or stop at it.
  if (input.kerb && s.air <= 0 && s.v > 0.5) {
    const what = kerbHop(input.kerb.rise, input.kerb.cross);
    out.kerb = what === 'none' ? null : what;
    if (what === 'hop') {
      s.airV = KERB.hopV + Math.min(0.6, s.v * 0.05);
      s.air = 0.001;
      s.v *= 0.86;
    } else if (what === 'scrub') {
      s.wobble = Math.min(1, (s.wobble ?? 0) + 0.6);
      s.v *= 0.7;
      // turned a little off the kerb, toward lower ground
      s.heading += (input.kerb.away ?? 0) * 0.12;
    } else if (what === 'wall') {
      out.hit = Math.abs(s.v);
      s.v = 0;
      s.travel = s.heading;
      return out;
    } else if (what === 'drop') s.bump = Math.max(s.bump, 0.5);
  }
  const nx = s.x - Math.sin(s.travel) * s.v * dt;
  const nz = s.z - Math.cos(s.travel) * s.v * dt;
  const fx = -Math.sin(s.heading) * spec.halfLength;
  const fz = -Math.cos(s.heading) * spec.halfLength;
  if (blocked(nx + fx, nz + fz) || blocked(nx, nz)) {
    out.hit = Math.abs(s.v);
    s.v = 0;
    s.travel = s.heading;
    return out;
  }
  s.x = nx;
  s.z = nz;
  return out;
}
