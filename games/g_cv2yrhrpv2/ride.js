/**
 * Riding a bicycle, as plain numbers (no drawing, so tests can ride one into
 * a wall): pedalling up to a cruise, a sprint that spends stamina, brakes,
 * a skid, and steering by leaning — the way a bike really turns: lean in and
 * the bike curves (radius v² / (g·tan lean)), so a sharp alley corner wants
 * you slow. Wet roads and snow have less grip: you can lean less, braking
 * takes longer and a skid slides further. Hills pull you back or let you run.
 *
 * A bike is { x, z, heading, travel, v, lean, stamina, … }: heading the way
 * it points (0 is north, −z; turning left as it grows — the game's yaw),
 * travel the way it is going (they part in a skid), v its speed in metres a
 * second, lean in radians (+ is leaning left), stamina 0–1.
 */

export const BIKE = {
  cruise: 9.6, // what steady pedalling holds: about 35 km/h
  sprint: 13.6, // flat out, standing on the pedals: about 49 km/h
  accel: 3.1,
  sprintAccel: 4.6,
  brake: 7.2,
  skidBrake: 4.2,
  roll: 0.18,
  drag: 0.0042,
  maxLean: 0.74, // about 42°, on a dry road
  leanRate: 4.2,
  wheelbase: 1.06,
  wheel: 0.34, // wheel radius, metres
  gear: 2.8, // wheel turns per crank turn
  drain: 0.2, // stamina a second while sprinting: five seconds of it
  regen: 0.055, // a second while riding steadily
  rest: 0.11, // a second while coasting or braking
  halfLength: 0.9,
  halfWidth: 0.32
};

/** Grip by surface: dry, wet (rain, a storm, fog's damp), snow. */
export const GRIP = { dry: 1, wet: 0.72, snow: 0.5 };
const G = 9.81;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** A bike at rest at a place. */
export function newBike(x, z, heading) {
  return { x, z, heading, travel: heading, v: 0, lean: 0, steer: 0, stamina: 1, crank: 0, roll: 0, skid: 0, sprinting: false, standing: false, pedalling: false, tired: 0 };
}

/** The tightest turn a bike can make at a speed on a surface, as a curvature (1 / radius in metres). */
export function maxCurvature(v, grip = 1, spec = BIKE) {
  const lean = Math.min(spec.maxLean, Math.atan(grip * 0.95));
  // Slow, it steers by the bars (about a 2.2 m circle at walking pace); faster, by leaning.
  return Math.min(1 / 2.2, (G * Math.tan(lean)) / Math.max(1, v * v));
}

/**
 * Move a bike on by dt seconds. `input`: { pedal, brake, left, right (or
 * steer −1…1), sprint, skid, free (a tailwind: sprinting costs nothing),
 * grade (the slope ahead, rise over run), grip (GRIP.*), draft (0–1: riding
 * in something's slipstream) }. `blocked(x, z)` says whether a point is
 * inside something solid. Returns { hit } — the speed it hit something at.
 */
export function stepBike(b, input, dt, blocked = () => false, spec = BIKE) {
  const grip = input.grip ?? 1;
  const grade = clamp(input.grade ?? 0, -0.25, 0.25);
  const free = Boolean(input.free);
  // Sprint: from stamina (or a tailwind), standing up; run dry and you must recover a little first.
  b.tired = Math.max(0, (b.tired ?? 0) - dt);
  const canSprint = free || (b.stamina > 0.02 && b.tired <= 0);
  b.sprinting = Boolean(input.sprint && input.pedal !== false && canSprint && !input.brake && b.v > -0.5);
  const pedalling = Boolean(input.pedal || b.sprinting);
  b.pedalling = pedalling && !input.brake;
  // Uphill the legs hold less speed (a 10% hill: about two thirds of it).
  const top = ((b.sprinting ? spec.sprint : spec.cruise) + (input.boost ?? 0)) * (grade > 0 ? Math.max(0.35, 1 - grade * 3.4) : 1);
  if (b.pedalling) {
    // Pedalling: quick off the line, easing off towards the speed it holds; a sprint pulls harder.
    const push = (b.sprinting ? spec.sprintAccel : spec.accel) * (1.25 - Math.min(1, Math.max(0, b.v) / top) * 0.95);
    if (b.v < top) b.v = Math.min(top, b.v + push * dt);
    else b.v -= Math.min(b.v - top, 1.2 * dt); // after a sprint or downhill, back to a cruise
  }
  // Brakes: hard on a dry road, a lot less on a wet one. The skid (rear wheel locked) sheds less but slides.
  if (input.brake) {
    if (b.v > 0.3) b.v = Math.max(0, b.v - spec.brake * Math.min(1, grip * 1.05) * dt);
    else {
      // Stopped and still holding back: walk it backwards.
      b.v = Math.max(-1.2, b.v - 2 * dt);
    }
  } else if (b.v < 0) b.v = Math.min(0, b.v + 3 * dt);
  const skidding = Boolean(input.skid) && b.v > 2;
  if (skidding) b.v = Math.max(0, b.v - spec.skidBrake * grip * dt);
  // Rolling resistance and air; and the hill (half of it — a rider shifts gear).
  const slow = (spec.roll + spec.drag * b.v * b.v * (1 - 0.35 * (input.draft ?? 0))) * dt;
  if (!b.pedalling && b.v > 0) b.v = Math.max(0, b.v - slow);
  else if (b.v > 0) b.v -= slow * 0.4;
  b.v -= G * grade * 0.55 * dt;
  if (b.v > 0 && b.v < 0.05 && !b.pedalling && grade >= 0) b.v = 0;
  b.v = clamp(b.v, -1.2, spec.sprint + 3.5);
  // Stamina: spent sprinting (not on a tailwind), back slowly while riding, faster coasting or in a slipstream.
  if (b.sprinting && !free) {
    b.stamina = Math.max(0, b.stamina - spec.drain * dt);
    if (b.stamina <= 0.02) {
      b.stamina = 0;
      b.tired = 1.4;
    }
  } else b.stamina = Math.min(1, b.stamina + (b.pedalling ? spec.regen : spec.rest) * dt + (input.draft ?? 0) * 0.22 * dt);
  b.standing = b.sprinting || (b.pedalling && grade > 0.07);
  // Steering by leaning: the keys (or a bot's steer) ask for a lean, the grip says how far.
  const wheel = clamp(input.steer ?? (input.left ? 1 : 0) - (input.right ? 1 : 0), -1, 1);
  const maxLean = Math.min(spec.maxLean, Math.atan(grip * 0.95));
  const speedK = clamp(b.v / 4, 0, 1); // standing still there is nothing to lean into
  b.lean += (wheel * maxLean * speedK - b.lean) * Math.min(1, dt * spec.leanRate);
  b.steer += (wheel - b.steer) * Math.min(1, dt * 8);
  // How sharply it turns: by the lean when moving, by the bars when slow.
  const byLean = (G * Math.tan(b.lean)) / Math.max(1, b.v * b.v);
  const byBars = (Math.tan(b.steer * 0.55) / spec.wheelbase) * (1 - speedK);
  let curve = clamp(byLean + byBars, -1 / 2.2, 1 / 2.2);
  if (skidding) curve *= 1.45; // a skid swings the back round: a sharper turn, sliding
  b.heading += curve * b.v * dt;
  // The way it goes follows the way it points; on a skid, or on a slippery road, it lags.
  const hold = skidding ? 2.2 * grip : 14 * grip;
  b.travel = (b.travel ?? b.heading) + turn(b.travel ?? b.heading, b.heading) * Math.min(1, dt * hold);
  b.skid = Math.abs(turn(b.travel, b.heading)) + (skidding ? 0.15 : 0);
  // The wheels roll; the cranks go round only while pedalling (it freewheels).
  b.roll = (b.roll + (b.v / spec.wheel) * dt) % (Math.PI * 2);
  if (b.pedalling) b.crank = (b.crank + (Math.max(1.5, b.v) / spec.wheel / spec.gear) * dt * (b.sprinting ? 1.12 : 1)) % (Math.PI * 2);
  const nx = b.x - Math.sin(b.travel) * b.v * dt;
  const nz = b.z - Math.cos(b.travel) * b.v * dt;
  const fx = -Math.sin(b.heading) * spec.halfLength;
  const fz = -Math.cos(b.heading) * spec.halfLength;
  if (blocked(nx + fx, nz + fz) || blocked(nx, nz)) {
    const hit = Math.abs(b.v);
    b.v = 0;
    b.travel = b.heading;
    return { hit };
  }
  b.x = nx;
  b.z = nz;
  return { hit: 0 };
}

/**
 * How far a point is outside a box turned on the ground (a car, a bus: { x,
 * z, heading, halfLength, halfWidth }), in metres; negative inside.
 */
export function boxGap(px, pz, box) {
  const dx = px - box.x;
  const dz = pz - box.z;
  const along = -dx * Math.sin(box.heading) - dz * Math.cos(box.heading);
  const side = dx * Math.cos(box.heading) - dz * Math.sin(box.heading);
  const ox = Math.abs(along) - box.halfLength;
  const oz = Math.abs(side) - box.halfWidth;
  return ox > 0 || oz > 0 ? Math.hypot(Math.max(0, ox), Math.max(0, oz)) : Math.max(ox, oz);
}

/** How close a bike (its front and back wheels) comes to a box: below its own half width, they touch. */
export function bikeGap(b, box, spec = BIKE) {
  const fx = -Math.sin(b.heading) * spec.halfLength * 0.85;
  const fz = -Math.cos(b.heading) * spec.halfLength * 0.85;
  return Math.min(boxGap(b.x + fx, b.z + fz, box), boxGap(b.x - fx, b.z - fz, box), boxGap(b.x, b.z, box)) - spec.halfWidth;
}

/**
 * A close call: something passed within `near` metres without touching, at
 * a speed between the two of at least `fast`. Riding through traffic like
 * that tops up the sprint (the race gives `NEAR_MISS` of stamina for each).
 */
export const NEAR_MISS = { near: 1.1, fast: 5, stamina: 0.12 };
export function closeCall(gap, closing) {
  return gap > 0 && gap < NEAR_MISS.near && closing >= NEAR_MISS.fast;
}

/** The slipstream behind a box (or a rider): 0–1, strongest close behind, inside a narrow wedge, when moving. */
export function slipstream(b, box, speed) {
  if (speed < 6) return 0;
  const dx = b.x - box.x;
  const dz = b.z - box.z;
  const behind = dx * Math.sin(box.heading) + dz * Math.cos(box.heading) - (box.halfLength ?? 0.9);
  const side = Math.abs(dx * Math.cos(box.heading) - dz * Math.sin(box.heading));
  if (behind < 0.3 || behind > 12) return 0;
  if (side > (box.halfWidth ?? 0.4) + 0.4) return 0;
  return clamp(1 - behind / 12, 0, 1) * clamp(speed / 12, 0, 1);
}

/** How long (s) a rider must keep going against the course before WRONG WAY shows, and how far off (rad). */
export const WRONG_WAY = { hold: 1.5, angle: 2.2, speed: 3, clear: 0.6 };

/**
 * Riding the wrong way, judged so it never blinks: by the way the scooter is actually going
 * (`travel`), against the course's direction a few points ahead (`ahead`, so a corner or the point
 * where the index ticks over doesn't flip it), only while riding (not tumbling, dizzy, drifting, just
 * put back, or down a short cut), and only once it has lasted WRONG_WAY.hold seconds; it clears once
 * you have been going the right way for WRONG_WAY.clear seconds.
 * `w` { t, ok, on } carried between frames; returns it, `on` true while WRONG WAY should show.
 */
export function wrongWay(w = { t: 0, ok: 0, on: false }, { mode = 'ride', travel = 0, ahead = 0, v = 0, drift = 0, safe = 0, shortcut = false } = {}, dt = 1 / 60) {
  const off = Math.abs(Math.atan2(Math.sin(travel - ahead), Math.cos(travel - ahead)));
  const judged = mode === 'ride' && !shortcut && drift < 0.15 && safe <= 0;
  const against = judged && v > WRONG_WAY.speed && off > WRONG_WAY.angle;
  if (against) {
    w.t += dt;
    w.ok = 0;
  } else {
    w.ok += dt;
    // (going the right way wears it down twice as fast as going the wrong way builds it)
    w.t = w.ok >= WRONG_WAY.clear || !judged ? 0 : Math.max(0, w.t - dt * 2);
  }
  if (w.t >= WRONG_WAY.hold) w.on = true;
  else if (w.ok >= WRONG_WAY.clear || !judged) w.on = false;
  return w;
}
