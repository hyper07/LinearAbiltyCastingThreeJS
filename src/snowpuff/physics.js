/**
 * The rider: one step of snowboard physics in course space (course.js).
 * Pure — no three.js, no DOM — so it runs the same for you, the AI rivals
 * and the tests, and an online guest's rider moves the way the host's would.
 *
 *   const r = newRider({ s: 4, lat: -2 });
 *   const events = step(r, { steer, tuck, jump, flip }, course, dt);
 *
 * Steering carves: hold a direction and the carve deepens — a sharper turn,
 * more spray, more speed lost. Tuck for speed. Hold jump to crouch, let go to
 * pop (higher the longer you held). In the air the steer keys spin and
 * up/down flip; land near a clean angle and the board snaps true for a short
 * boost. Barriers bounce you into a quick tumble — never a crash.
 */
import { frameAt, groundAt, kickerAt, between, BARRIERS } from './course.js';

export const G = 9.8;
export const VMAX = 34; // m/s, hard cap (≈ 120 km/h with a boost)
export const RIDER_R = 0.38;

/** How tall each barrier is: ride over it if you are this high above the snow. */
export const BARRIER_H = { hay: 1.0, snowman: 1.5, fence: 1.15, log: 0.7, rock: 1.6, pole: 2.0 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

/** A fresh rider at (s, lat). */
export function newRider({ s = 4, lat = 0, speed = 0 } = {}) {
  return {
    s, lat, y: 0, vy: 0, speed, yaw: 0,
    air: false, airTime: 0, grounded: true,
    carve: 0, tuck: 0, charge: 0, edge: 0,
    spin: 0, flip: 0, spinV: 0, flipV: 0,
    tumble: 0, spinout: 0, wobble: 0, boost: 0, invuln: 0, onIce: false,
    lastLand: null, finished: false
  };
}

/** Put the rider on the ground where it stands (after placing it). */
export function settle(r, course) {
  r.y = groundAt(course, r.s, r.lat);
  r.vy = 0;
  r.air = false;
}

const _f = {};

/** Is (s, lat) on an ice patch? */
export function onIce(course, s, lat) {
  for (const p of course.ice) {
    if (s < p.s - 1 || s > p.s + p.len + 1) continue;
    const u = (s - p.s - p.len * 0.5) / (p.len * 0.5), v = (lat - p.lat) / (p.w * 0.5);
    if (u * u + v * v < 1) return true;
  }
  return false;
}

/** Name a trick from its half-spins and flips ('' for a plain hop). */
export function trickName(halfSpins, flips) {
  const parts = [];
  if (halfSpins > 0) parts.push(String(halfSpins * 180));
  if (flips > 0) parts.push(flips > 1 ? `Double Front Flip` : 'Front Flip');
  if (flips < 0) parts.push(flips < -1 ? `Double Back Flip` : 'Back Flip');
  return parts.join(' + ');
}

/**
 * Advance one rider by dt seconds.
 * @param {object} r     rider state (mutated)
 * @param {object} inp   { steer −1..1, tuck bool, jump bool (held), flip −1..1 (↑ = +1) }
 * @param {object} course
 * @param {number} dt
 * @param {object} [o]   { pull: gravity multiplier (gentle rubber band), brake: slow to a stop }
 * @returns {object[]} events: jump, launch, land, bump, rail, finish-line crossings are race.js's
 */
export function step(r, inp, course, dt, o = {}) {
  const ev = [];
  const f = frameAt(course, r.s, _f);
  const W = f.width;
  const pull = o.pull ?? 1;
  let steer = clamp(inp.steer ?? 0, -1, 1);
  let tuckIn = inp.tuck ? 1 : 0;
  let jumpHeld = Boolean(inp.jump);
  const flipIn = clamp(inp.flip ?? 0, -1, 1);

  r.invuln = Math.max(0, r.invuln - dt);
  r.boost = Math.max(0, r.boost - dt);
  r.wobble = Math.max(0, r.wobble - dt);
  if (r.tumble > 0 || r.spinout > 0) {
    r.tumble = Math.max(0, r.tumble - dt);
    r.spinout = Math.max(0, r.spinout - dt);
    steer = 0;
    tuckIn = 0;
    jumpHeld = false;
    r.charge = 0;
  }
  if (o.brake) {
    tuckIn = 0;
    jumpHeld = false;
    r.charge = 0;
  }

  // Carve deepens while a direction is held, and lets go fast.
  const want = Math.abs(steer);
  r.carve += (want - r.carve) * Math.min(1, dt * (want > r.carve ? 2.6 : 7));
  r.tuck += (tuckIn - r.tuck) * Math.min(1, dt * 6);
  r.edge += (steer * (0.4 + 0.6 * r.carve) - r.edge) * Math.min(1, dt * 8);
  r.onIce = !r.air && onIce(course, r.s, r.lat);

  if (!r.air) {
    // ---- on the snow
    const ice = r.onIce;
    const turnRate = (0.6 + 1.55 * r.carve) * (1 - 0.4 * r.tuck) * (ice ? 0.45 : 1) * (r.wobble > 0 ? 0.6 : 1);
    r.yaw += steer * turnRate * dt;
    // Without a turn held, the board settles back down the fall line (gently on ice).
    const centre = ice ? 0.35 : 0.8 + (1 - want) * 1.5;
    r.yaw -= r.yaw * Math.min(1, dt * centre);
    if (r.spinout > 0) r.yaw += Math.sin(r.spinout * 9) * dt * 0.6;
    r.yaw = clamp(r.yaw, -1.15, 1.15);

    const slope = G * Math.sin(f.pitch) * Math.cos(r.yaw) * pull;
    const drag = 0.0052 * (1 - 0.42 * r.tuck) * r.speed * r.speed;
    const mu = (ice ? 0.008 : 0.035) * G * Math.cos(f.pitch);
    const carveLoss = r.carve * (ice ? 0.5 : 1.9) * Math.min(1.4, r.speed / 18);
    let acc = slope - drag - mu - carveLoss;
    if (r.boost > 0) acc += 7.5;
    if (r.tumble > 0) acc = -Math.max(2, r.speed * 1.4);
    if (r.spinout > 0) acc = Math.min(acc, -r.speed * 0.5);
    if (o.brake) acc = -Math.max(1.5, r.speed * 0.55);
    r.speed = clamp(r.speed + acc * dt, 0, VMAX + (r.boost > 0 ? 4 : 0));
    if (o.brake && r.speed < 0.6) r.speed = 0;

    // Crouch while jump is held; pop on release.
    if (jumpHeld) r.charge = Math.min(1, r.charge + dt / 0.55);
    const pop = !jumpHeld && r.charge > 0;
    const pc = r.charge;
    if (!jumpHeld) r.charge = 0;

    const s0 = r.s, lat0 = r.lat, y0 = r.y;
    const k0 = kickerAt(course, s0, lat0);
    r.s += r.speed * Math.cos(r.yaw) * dt;
    r.lat += r.speed * Math.sin(r.yaw) * dt;
    berm(r, W, dt, ev);
    const g1 = groundAt(course, r.s, r.lat);
    const vyGround = (g1 - y0) / Math.max(dt, 1e-4);
    const offLip = k0 && s0 <= k0.s + k0.len && r.s > k0.s + k0.len;
    if (k0 && (offLip || (pop && r.s > k0.s + k0.len * 0.55))) {
      // Off the lip: launched up along the ramp's angle.
      const launch = clamp(r.speed * 0.3, 4, 9.5) * k0.power;
      r.air = true;
      r.airTime = 0;
      r.vy = -r.speed * Math.sin(f.pitch) + launch + (pop ? 1.5 + 1.5 * pc : 0);
      r.y = g1;
      r.spin = r.flip = r.spinV = r.flipV = 0;
      ev.push({ type: 'launch', kicker: k0.id, power: launch });
    } else if (pop) {
      r.air = true;
      r.airTime = 0;
      r.vy = -r.speed * Math.sin(f.pitch) + 3.4 + 3.6 * pc;
      r.y = g1;
      r.spin = r.flip = r.spinV = r.flipV = 0;
      ev.push({ type: 'jump', charge: pc });
    } else {
      r.y = g1;
      r.vy = vyGround;
    }
  } else {
    // ---- in the air
    r.airTime += dt;
    r.vy -= G * dt;
    r.y += r.vy * dt;
    r.speed = Math.max(0, r.speed - 0.0035 * r.speed * r.speed * dt);
    r.s += r.speed * Math.cos(r.yaw) * dt;
    r.lat += r.speed * Math.sin(r.yaw) * dt;
    berm(r, W, dt, ev);
    // Spin with the steer keys, flip with up/down; let go and it eases toward a clean angle.
    const spinTarget = steer * 7.2;
    r.spinV += (spinTarget - r.spinV) * Math.min(1, dt * 11);
    if (Math.abs(steer) < 0.1) {
      const goal = Math.round(r.spin / Math.PI) * Math.PI;
      r.spinV += (goal - r.spin) * dt * 22;
    }
    r.spin += r.spinV * dt;
    const flipTarget = flipIn * 6.4;
    r.flipV += (flipTarget - r.flipV) * Math.min(1, dt * 10);
    if (Math.abs(flipIn) < 0.1) {
      const goal = Math.round(r.flip / TAU) * TAU;
      r.flipV += (goal - r.flip) * dt * 20;
    }
    r.flip += r.flipV * dt;
    r.charge = 0;
    const g1 = groundAt(course, r.s, r.lat);
    if (r.y <= g1) land(r, g1, f, ev);
  }
  r.grounded = !r.air;
  collide(r, course, ev);
  return ev;
}

/** Past the groomed edge the snow rises into a berm that turns you back; the fence stops you. */
function berm(r, W, dt, ev) {
  const a = Math.abs(r.lat);
  if (a > W - 0.3) {
    const over = a - (W - 0.3);
    const sign = Math.sign(r.lat);
    if (!r.air) {
      r.yaw -= sign * Math.min(0.9, over * 0.55) * dt * 3;
      r.speed *= 1 - Math.min(0.5, over * 0.12) * dt;
    }
    const wall = W + 3.0;
    if (a > wall) {
      r.lat = sign * wall;
      if (r.yaw * sign > 0) r.yaw = -r.yaw * 0.4;
      if (!r.air) r.speed *= 0.85;
      ev.push({ type: 'rail', side: sign });
    }
  }
}

function land(r, ground, f, ev) {
  const halfSpins = Math.round(Math.abs(r.spin) / Math.PI);
  const flips = Math.round(r.flip / TAU);
  const spinErr = Math.abs(r.spin - Math.round(r.spin / Math.PI) * Math.PI);
  const flipErr = Math.abs(r.flip - flips * TAU);
  const clean = spinErr < 0.62 && flipErr < 0.8;
  const impact = Math.max(0, -(r.vy + r.speed * Math.sin(f.pitch)));
  const name = trickName(halfSpins, flips);
  const tricks = halfSpins + Math.abs(flips) * 2;
  r.air = false;
  r.y = ground;
  r.vy = 0;
  if (clean) {
    if (tricks > 0) r.boost = Math.max(r.boost, 0.9 + 0.35 * Math.min(4, tricks));
  } else {
    r.wobble = 0.75;
    r.speed *= 0.82;
  }
  r.lastLand = { clean, name, tricks, airTime: r.airTime, impact };
  ev.push({ type: 'land', clean, name, tricks, halfSpins, flips, airTime: r.airTime, impact });
  r.spin = 0;
  r.flip = 0;
  r.spinV = 0;
  r.flipV = 0;
}

/** Barriers: a soft bounce, a poof and a quick tumble. Jump high enough and you clear them. */
function collide(r, course, ev) {
  if (r.invuln > 0 || r.tumble > 0) return;
  const near = between(course.obstacles, r.s - 2.2, r.s + 2.2);
  if (!near.length) return;
  const g = groundAt(course, r.s, r.lat);
  const above = r.y - g;
  for (const ob of near) {
    const ds = r.s - ob.s, dl = r.lat - ob.lat;
    if (Math.abs(ds) > ob.r + RIDER_R || Math.abs(dl) > ob.w + RIDER_R) continue;
    if (above > (BARRIER_H[ob.kind] ?? 1.2)) continue;
    // Pushed out sideways, slowed hard, tumbling for a moment.
    const side = Math.sign(dl) || 1;
    r.lat = ob.lat + side * (ob.w + RIDER_R + 0.15);
    r.s = Math.max(r.s, ob.s - ob.r - RIDER_R - 0.05);
    r.yaw = side * 0.35;
    r.speed = Math.max(3, r.speed * 0.42);
    r.tumble = ob.kind === 'pole' ? 0.55 : 0.95;
    r.invuln = 1.6;
    if (r.air) {
      r.air = false;
      r.y = g;
      r.vy = 0;
      r.spin = r.flip = r.spinV = r.flipV = 0;
    }
    ev.push({ type: 'bump', kind: ob.kind, id: ob.id, s: ob.s, lat: ob.lat });
    return;
  }
}

export { BARRIERS };
