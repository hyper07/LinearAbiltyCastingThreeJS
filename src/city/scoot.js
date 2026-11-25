/**
 * Riding an electric racing scooter, as plain numbers (no drawing, so the
 * tests can ride one into a kerb): a race-tuned motor pulls to 70 km/h in
 * about four and a half seconds, a boost spends the battery gauge for a few
 * seconds at about 85 km/h, brakes, and steering by leaning — lean in and it
 * curves (radius v² / (g·tan lean), with racing tyres' extra bite), turning
 * by the bars when slow; fast, the same key leans it more gently. Small solid wheels feel
 * the street: every paving joint is a bump (a jolt and a sliver of speed),
 * a kerb taken at an angle is a hop up, one met glancing scrubs along it and
 * wobbles you. Wet roads have less grip: less lean, longer braking, and the
 * back steps out — it slides. And a drift on purpose (Shift held while
 * steering): the back wheel lets go, the scooter swings round faster than any
 * lean would turn it, an assist holds the slide's angle, and it scrubs off a
 * little speed (less than the brakes would) — the way round a 90° junction at
 * speed. Let go and it straightens.
 *
 * A scooter is { x, z, heading, travel, v, lean, steer, stamina (the boost
 * gauge, 0–1), … }: heading the way it points (0 is north, −z; turning left
 * as it grows — the game's yaw), travel the way it is going (they part in a
 * slide), v its speed in m/s, lean in radians (+ is leaning left).
 */

export const SCOOT = {
  cruise: 19.45, // 70 km/h: the motor's cap
  boostTop: 23.6, // 85 km/h on a boost
  accel: 6.3, // 0 → 70 km/h in about 4.5 s
  boostAccel: 7.4,
  brake: 9.5, // 70 → 0 in about 2 s on a dry road
  skidBrake: 6,
  roll: 0.14,
  drag: 0.0028,
  maxLean: 0.6, // about 34°: small wheels don't like more
  leanRate: 5.2,
  bite: 1.7, // racing tyres: how much more a lean turns than physics alone would (an arcade's grip)
  calm: 0.45, // at full speed the lean comes this much slower (speed-sensitive steering)
  wheelbase: 0.82,
  wheel: 0.095, // wheel radius, metres
  drain: 0.2, // gauge a second while boosting: five seconds of it
  regen: 0.05, // a second while riding
  rest: 0.09, // a second while coasting or braking
  halfLength: 0.5,
  halfWidth: 0.3,
  grip: 1
};

/**
 * A drift: how fast it swings round (rad/s at full lock, on top of the lean), how quickly the way it
 * goes follows the way it points while the back is out (the rear's grip), the slide angle the
 * assist holds it to, and the speed it scrubs off (m/s² — plus more the wider the slide).
 */
export const DRIFT = { yaw: 2.3, hold: 4.4, maxSlip: 0.72, scrub: 1.2, slipScrub: 3.6, minV: 5 };

/** Grip by surface: dry, wet (rain, a storm, fog's damp), snow. */
export const GRIP = { dry: 1, wet: 0.7, snow: 0.48 };

/** Joints in the street a small wheel feels, metres apart: paving slabs, an alley's concrete, worn asphalt. */
export const JOINTS = { paving: 0.42, concrete: 1.6, asphalt: 7.5, smooth: 0 };

/** Kerbs: below `low` it rolls over; up to `high` it is a hop if met at an angle (≥ `angle` rad from glancing); above that it's a wall. */
export const KERB = { low: 0.035, high: 0.2, angle: 0.4, hopV: 2.1 };

const G = 9.81;
/** A racer's circle against walls (walls.js RIDER_RADIUS). */
const RIDER_R = 0.42;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** A scooter at rest at a place. */
export function newScoot(x, z, heading) {
  return { x, z, heading, travel: heading, v: 0, lean: 0, steer: 0, stamina: 1, roll: 0, skid: 0, boosting: false, sprinting: false, braking: false, tired: 0, bump: 0, joint: 0, air: 0, airV: 0, wobble: 0 };
}

/** The tightest turn at a speed on a surface, as a curvature (1 / radius in metres). */
export function maxCurvature(v, grip = 1, spec = SCOOT) {
  const lean = leanLimit(grip, spec);
  // Slow, it steers by the bars (about a 1.8 m circle at walking pace); faster, by leaning.
  return Math.min(1 / 1.8, (G * Math.tan(lean) * (spec.bite ?? 1) * Math.min(1, grip)) / Math.max(1, v * v));
}

/** How far it can lean on a surface. */
export function leanLimit(grip = 1, spec = SCOOT) {
  return Math.min(spec.maxLean, Math.atan(grip * 0.8));
}

/** The fastest a turn of `curvature` (1 / radius) can be taken on a surface, m/s. */
export function cornerSpeed(curvature, grip = 1, spec = SCOOT) {
  return Math.sqrt((G * Math.tan(leanLimit(grip, spec)) * (spec.bite ?? 1) * Math.min(1, grip)) / Math.max(1e-4, curvature));
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
 * steer −1…1), drift (Shift held), boost, free (a tailwind: boosting costs nothing), extra (m/s
 * more top speed), grade (rise over run), grip (GRIP.*), draft (0–1),
 * surface ('paving' | 'concrete' | 'asphalt' | 'smooth'), kerb ({ rise, cross })
 * }. `blocked` is what is solid: a Walls (walls.js — the buildings' footprints and
 * the alleys' walls, met by a swept circle so nothing is ridden through at any
 * speed), or a function (x, z) → whether a point is inside something solid.
 * Returns { hit (speed it hit something head-on at), glance (radians it was
 * turned along a wall it met at a slant, or 0), jolt (a joint's bump, 0–1),
 * kerb (what a kerb did: kerbHop's word, or null), landed (thump, m/s) }.
 */
export function stepScoot(s, input, dt, blocked = () => false, spec = SCOOT) {
  const grip = clamp(input.grip ?? 1, 0.2, 1.1);
  const grade = clamp(input.grade ?? 0, -0.25, 0.25);
  const free = Boolean(input.free);
  const out = { hit: 0, glance: 0, jolt: 0, kerb: null, landed: 0 };
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
    else s.v -= Math.min(s.v - top, 3 * dt); // after a boost or a hill, back to the cap
  }
  // Brakes: firm on a dry road, much less on a wet one; stopped and still holding back, it rolls back a little.
  s.braking = Boolean(input.brake && s.v > 0.3);
  if (input.brake) {
    if (s.v > 0.3) s.v = Math.max(0, s.v - spec.brake * Math.min(1, grip * 1.05) * (grip < 0.9 ? 0.8 : 1) * dt);
    else s.v = Math.max(-1, s.v - 1.6 * dt);
  } else if (s.v < 0) s.v = Math.min(0, s.v + 3 * dt);
  // Rolling resistance and air, more on rough paving; the hill.
  const rough = input.surface === 'paving' ? 1.8 : input.surface === 'concrete' ? 1.3 : 1;
  const slow = (spec.roll * rough + spec.drag * s.v * s.v * (1 - 0.35 * (input.draft ?? 0))) * dt;
  if (!throttle && s.v > 0) s.v = Math.max(0, s.v - slow);
  else if (s.v > 0) s.v -= slow * 0.4;
  s.v -= G * grade * 0.6 * dt;
  if (s.v > 0 && s.v < 0.05 && !throttle && grade >= 0) s.v = 0;
  s.v = clamp(s.v, -1, spec.boostTop + 4);
  // The gauge: spent boosting (not on a tailwind), back slowly riding, faster coasting or in a slipstream.
  if (s.boosting && !free) {
    s.stamina = Math.max(0, s.stamina - spec.drain * dt);
    if (s.stamina <= 0.02) {
      s.stamina = 0;
      s.tired = 1.2;
    }
  } else s.stamina = Math.min(1, s.stamina + (throttle ? spec.regen : spec.rest) * dt + (input.draft ?? 0) * 0.2 * dt);
  // Steering by leaning: the keys (or a bot's steer) ask for a lean, the grip says how far; fast, it leans in
  // more gently (speed-sensitive steering), so a tap at 70 km/h is a lane change, not a swerve.
  const wheel = clamp(input.steer ?? (input.left ? 1 : 0) - (input.right ? 1 : 0), -1, 1);
  const maxLean = leanLimit(grip, spec);
  const speedK = clamp(s.v / 3, 0, 1);
  const fast = clamp(s.v / spec.cruise, 0, 1.2);
  s.lean += (wheel * maxLean * speedK - s.lean) * Math.min(1, dt * spec.leanRate * (1 - (spec.calm ?? 0) * fast * 0.8));
  s.steer += (wheel - s.steer) * Math.min(1, dt * 8);
  const bite = (spec.bite ?? 1) * Math.min(1, grip);
  const byLean = (G * Math.tan(s.lean) * bite) / Math.max(1, s.v * s.v);
  const byBars = (Math.tan(s.steer * 0.6) / spec.wheelbase) * (1 - speedK);
  const curve = clamp(byLean + byBars, -1 / 1.8, 1 / 1.8);
  s.heading += curve * s.v * dt;
  // A drift: Shift held, steering, going — the back steps out and it swings round (eased in and out).
  const drifting = Boolean(input.drift) && Math.abs(wheel) > 0.15 && s.v > DRIFT.minV && !(s.air > 0);
  s.drift = (s.drift ?? 0) + ((drifting ? 1 : 0) - (s.drift ?? 0)) * Math.min(1, dt * (drifting ? 6 : 7));
  if (s.drift < 0.01) s.drift = 0;
  const dk = s.drift;
  if (dk > 0) {
    if (drifting) s.driftSide = Math.sign(wheel);
    s.heading += wheel * DRIFT.yaw * dk * Math.min(1, grip * 1.1) * dt;
  }
  // The way it goes follows the way it points; on a wet road, braking in a lean — or leaning hard fast — the back steps out.
  const braking = input.brake && s.v > 2;
  const leanK = Math.abs(s.lean) / Math.max(0.05, maxLean);
  const loose = (braking ? leanK : 0) + (grip < 0.9 && s.v > spec.cruise * 0.55 ? leanK * leanK * 0.6 : 0);
  let hold = (14 * grip) / (1 + loose * (grip < 0.9 ? 3.5 : 1.2));
  if (dk > 0) hold += (DRIFT.hold * Math.min(1, grip * 1.1) - hold) * dk;
  s.travel = (s.travel ?? s.heading) + turn(s.travel ?? s.heading, s.heading) * Math.min(1, dt * hold);
  if (dk > 0) {
    // The assist: the slide held to its angle (no spinning round), and the speed it costs.
    const slip = turn(s.travel, s.heading);
    const cap = DRIFT.maxSlip * dk + 0.05;
    if (Math.abs(slip) > cap) s.heading = s.travel + Math.sign(slip) * cap;
    s.v = Math.max(0, s.v - (DRIFT.scrub + DRIFT.slipScrub * Math.abs(Math.sin(slip))) * dk * dt);
    // and the rider's weight goes the other way to the slide
    s.lean += (wheel * maxLean * 0.8 - s.lean) * Math.min(1, dt * 6) * dk;
  }
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
  if (blocked && typeof blocked.sweep === 'function') return moveSwept(s, input, dt, blocked, spec, out);
  const into = (dir) => {
    const nx = s.x - Math.sin(dir) * s.v * dt;
    const nz = s.z - Math.cos(dir) * s.v * dt;
    // (probed a little further than one frame's travel, so a wall met at speed is seen as a wall, not a gap)
    const px = s.x - Math.sin(dir) * Math.max(spec.halfLength, s.v * dt + 0.25);
    const pz = s.z - Math.cos(dir) * Math.max(spec.halfLength, s.v * dt + 0.25);
    return blocked(px, pz) || blocked(nx, nz) ? null : [nx, nz];
  };
  const go = into(s.travel);
  if (go) {
    s.x = go[0];
    s.z = go[1];
    return out;
  }
  // Something solid ahead. Met at a slant it is a glance: turned along it, scraping and slowed, still up.
  // Only met nearly head-on (more than GLANCE off its line) is it a hit.
  // (along the wall the way the rider is steering, if both ways are open: round a corner, not away from it)
  const pref = input.steer ?? (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const sides = pref < 0 ? [-1, 1] : [1, -1];
  for (let k = 1; k * 0.1 <= GLANCE + 1e-6; k++) {
    for (const sgn of sides) {
      const dir = s.travel + sgn * k * 0.1;
      if (!into(dir) || !into(dir + sgn * 0.12)) continue;
      const angle = k * 0.1;
      out.glance = angle;
      out.hit = 0;
      s.v *= Math.max(0.35, 1 - Math.sin(angle) * 1.1);
      s.travel = dir;
      s.heading += turn(s.heading, dir) * 0.85;
      s.wobble = Math.min(1, (s.wobble ?? 0) + 0.25 + angle);
      const ok = into(dir);
      if (ok) {
        s.x = ok[0];
        s.z = ok[1];
      }
      return out;
    }
  }
  out.hit = Math.abs(s.v);
  s.v = 0;
  s.travel = s.heading;
  return out;
}

/** How far off a wall's line (radians) a scooter can meet it and only glance off. */
export const GLANCE = 0.6;

/**
 * Moving on against real walls (walls.js): the rider's circle is swept along the way it is going.
 * A wall met at a slant (within GLANCE of its line) turns it along the wall, slowed by how square
 * it met it, and it rides on for the rest of the frame (a second wall too: into a corner); met
 * more squarely it stops — `hit` says how fast. However it got there, it ends clear of every wall.
 */
function moveSwept(s, input, dt, walls, spec, out) {
  const R = spec.radius ?? RIDER_R;
  let dist = s.v * dt;
  let dir = s.v >= 0 ? s.travel : s.travel + Math.PI;
  dist = Math.abs(dist);
  for (let round = 0; round < 3 && dist > 1e-6; round++) {
    const dx = -Math.sin(dir) * dist;
    const dz = -Math.cos(dir) * dist;
    const hit = walls.sweep(s.x, s.z, s.x + dx, s.z + dz, R);
    if (!hit) {
      s.x += dx;
      s.z += dz;
      break;
    }
    // Up to the wall (a hair short of it).
    const t = Math.max(0, hit.t - 0.002 / Math.max(dist, 1e-3));
    s.x += dx * t;
    s.z += dz * t;
    dist *= 1 - t;
    // How squarely: the angle between the way it goes and the wall's line.
    const ux = dx / Math.hypot(dx, dz);
    const uz = dz / Math.hypot(dx, dz);
    const into = -(ux * hit.nx + uz * hit.nz);
    if (into <= 0) continue;
    const angle = Math.asin(Math.min(1, into));
    if (angle > GLANCE || s.v < 0) {
      out.hit = Math.max(out.hit, Math.abs(s.v));
      out.glance = 0;
      s.v = 0;
      s.travel = s.heading;
      break;
    }
    // Along the wall, the way it was mostly going.
    let tx = ux + hit.nx * into;
    let tz = uz + hit.nz * into;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const along = Math.atan2(-tx, -tz);
    if (angle > 0.05) {
      out.glance = Math.max(out.glance, angle);
      s.v *= Math.max(0.35, 1 - Math.sin(angle) * 1.1);
      s.wobble = Math.min(1, (s.wobble ?? 0) + 0.25 + angle);
      s.heading += turn(s.heading, along) * 0.85;
    }
    s.travel = along;
    dir = along;
    dist *= Math.cos(angle);
  }
  // Never left in a wall (turning on the spot by one, a corner squeezed).
  const fix = walls.push(s.x, s.z, R);
  if (fix.moved > 1e-4) {
    s.x = fix.x;
    s.z = fix.z;
  }
  return out;
}
