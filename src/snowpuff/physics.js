/**
 * The rider: one step of snowboard physics in course space (course.js).
 * Pure — no three.js, no DOM — so it runs the same for you, the AI rivals
 * and the tests, and an online guest's rider moves the way the host's would.
 *
 *   const r = newRider({ s: 4, lat: -2 });
 *   const events = step(r, { steer, tuck, jump, flip }, course, dt);
 *
 * A real board: it has a heading and a velocity. Steering (ramped in and out)
 * turns the board and tips it on its edge; a tipped edge grips, so the
 * velocity follows the board in a clean carve, while a flat or crossed board
 * slips sideways — a skid that scrubs speed and throws spray. Gravity pulls
 * along the real slope under the board (pitch, rollers, banks, kickers). Tuck
 * for speed. Jump pops the moment it's pressed; holding it lifts a little
 * higher. Kickers launch from their lip with the ramp's own upward speed.
 * In the air the steer keys spin and up/down flip; land near a clean angle
 * for a short boost. Barriers bounce you into a quick tumble — never a crash.
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
    s, lat, y: 0, vy: 0, speed, yaw: 0, head: 0, steerR: 0, skid: 0, latAcc: 0, compress: 0, jumpWas: false, lift: 0, kickerCharge: 0, vyG: null,
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
  for (const p of course.dynIce?.length ? [...course.ice, ...course.dynIce] : course.ice) {
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
 * @param {object} [o]   { pull: gravity multiplier (gentle rubber band), brake: slow to a stop, draft: drag factor behind another rider }
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
  if (r.head == null) r.head = r.yaw;

  r.invuln = Math.max(0, r.invuln - dt);
  r.boost = Math.max(0, r.boost - dt);
  r.wobble = Math.max(0, r.wobble - dt);
  r.charge = Math.max(0, r.charge - dt * 4);
  if (r.tumble > 0 || r.spinout > 0) {
    r.tumble = Math.max(0, r.tumble - dt);
    r.spinout = Math.max(0, r.spinout - dt);
    steer = 0;
    tuckIn = 0;
    jumpHeld = false;
  }
  if (o.brake) {
    tuckIn = 0;
    jumpHeld = false;
  }
  const pressed = jumpHeld && !r.jumpWas;
  r.jumpWas = jumpHeld;

  // Steering ramps in and out quickly (~65 ms: keys are on/off, so they need a short ramp; a stick
  // or a touch drag stays proportional); the carve deepens while a direction is held.
  const ramp = Math.abs(steer) > Math.abs(r.steerR ?? 0) ? 15 : 18;
  const flipping = steer !== 0 && Math.sign(steer) !== Math.sign(r.steerR ?? 0) && Math.abs(r.steerR ?? 0) > 0.3;
  r.steerR = (r.steerR ?? 0) + clamp(steer - (r.steerR ?? 0), -ramp * dt, ramp * dt);
  const want = Math.abs(r.steerR);
  r.carve += (want - r.carve) * Math.min(1, dt * (want > r.carve ? 9 : 12));
  const tuckWas = r.tuck;
  r.tuck += (tuckIn - r.tuck) * Math.min(1, dt * 6);
  r.onIce = !r.air && onIce(course, r.s, r.lat);
  r.unweight = Math.max(0, (r.unweight ?? 0) - dt);
  r.skidT = Math.max(0, (r.skidT ?? 0) - dt);

  if (!r.air) {
    // ---- on the snow: a board with a heading, a velocity, an edge
    const ice = r.onIce;
    // edge to edge (heelside ↔ toeside): a tiny unweight hop lets the board swing through quickly
    if (flipping && r.unweight <= 0 && r.speed > 5) {
      r.unweight = 0.2;
      r.compress = -0.5;
      ev.push({ type: 'edge' });
    }
    // a hard turn just as you come out of a tuck: a sharp, sprayey skid turn
    if (want > 0.8 && tuckIn === 0 && tuckWas > 0.55 && r.speed > 12 && r.skidT <= 0) r.skidT = 0.4;
    // edge angle: how hard the board is tipped onto its edge (more at speed), almost at once
    const edgeGoal = r.steerR * (0.55 + 0.45 * clamp(r.speed / 10, 0, 1)) * (r.wobble > 0 ? 0.5 : 1);
    r.edge += (edgeGoal - r.edge) * Math.min(1, dt * (r.unweight > 0 ? 30 : 18));
    // the board turns with the steer — fastest at low and mid speed; let go and it lines up with
    // its motion and the fall line
    const speedK = clamp(1.32 - r.speed / 45, 0.78, 1.25);
    const turnMax = (1.05 + 1.5 * r.carve) * speedK * (1 - 0.3 * r.tuck) * (ice ? 0.5 : 1) * (r.wobble > 0 ? 0.6 : 1) * (r.unweight > 0 ? 2.6 : 1) * (r.skidT > 0 ? 1.35 : 1);
    const slow = 1 - clamp(r.speed / 6, 0, 1);
    r.head += r.steerR * turnMax * (1 - slow * 0.6) * dt;
    // nearly stopped, a board swings back down the fall line (no getting stuck crossways)
    r.head -= r.head * Math.min(1, dt * slow * 3);
    r.head += (r.yaw - r.head) * Math.min(1, dt * (0.25 + (1 - want) * 2.8));
    r.head -= r.head * Math.min(1, dt * (1 - want) * (ice ? 0.4 : 2.4));
    if (r.spinout > 0) r.head += Math.sin(r.spinout * 9) * dt * 1.2;
    r.head = clamp(r.head, -1.35, 1.35);
    // velocity in course space
    let vs = r.speed * Math.cos(r.yaw), vl = r.speed * Math.sin(r.yaw);
    // gravity along the real slope under the board (pitch, rollers, kickers, banks)
    const gs = (groundAt(course, r.s + 0.5, r.lat) - groundAt(course, r.s - 0.5, r.lat));
    const gl = (groundAt(course, r.s, r.lat + 0.5) - groundAt(course, r.s, r.lat - 0.5));
    vs += (-G * gs / Math.sqrt(1 + gs * gs)) * pull * dt;
    vl += (-G * gl / Math.sqrt(1 + gl * gl)) * dt;
    // into the board's frame: forward and sideways
    const hx = Math.cos(r.head), hy = Math.sin(r.head);
    let vF = vs * hx + vl * hy, vL = -vs * hy + vl * hx;
    // edge grip: a carving edge holds (little slip); a flat or crossed board skids and scrubs
    const slip = Math.atan2(Math.abs(vL), Math.max(0.5, Math.abs(vF)));
    const edgeGrip = Math.abs(r.edge);
    // a carving edge grips hard, so the motion follows the board almost at once; a crossed board at
    // high speed, a skid turn or the unweight moment let it slide
    let grip = ice ? 1.6 + edgeGrip * 1.8 : 4 + 17 * edgeGrip * (1 - 0.6 * smooth01((slip - 0.32) / 0.6) * smooth01((r.speed - 18) / 10));
    if (r.skidT > 0) grip *= 0.3;
    if (r.unweight > 0) grip *= 0.7;
    r.skid = clamp(smooth01((slip - 0.18) / 0.5) + (ice ? 0.15 : 0), 0, 1);
    const vL0 = vL;
    vL *= Math.exp(-grip * dt);
    // the scrubbed sideways speed is lost into the snow (a skid slows you; a clean carve barely)
    const scrub = Math.abs(vL0) - Math.abs(vL);
    // forward: drag, snow friction, the edge's bite, boosts
    const sp = Math.hypot(vF, vL);
    const drag = 0.0052 * (1 - 0.42 * r.tuck) * sp * sp * (o.draft ?? 1);
    const mu = (ice ? 0.008 : 0.035) * G;
    let dec = drag + mu + edgeGrip * (ice ? 0.12 : 0.3) * Math.min(1.4, sp / 18) + (scrub / Math.max(dt, 1e-4)) * 0.012;
    if (r.tumble > 0) dec = Math.max(2, sp * 1.4);
    if (r.spinout > 0) dec = Math.max(dec, sp * 0.5);
    if (o.brake) dec = Math.max(1.5, sp * 0.55);
    vF = Math.sign(vF) * Math.max(0, Math.abs(vF) - dec * dt);
    if (r.boost > 0) vF += 7.5 * dt;
    vs = vF * hx - vL * hy;
    vl = vF * hy + vL * hx;
    let v = Math.hypot(vs, vl);
    const cap = VMAX + (r.boost > 0 ? 4 : 0);
    if (v > cap) {
      vs *= cap / v;
      vl *= cap / v;
      v = cap;
    }
    if (o.brake && v < 0.6) {
      vs = vl = v = 0;
    }
    const yaw0 = r.yaw;
    r.speed = v;
    if (v > 0.05) r.yaw = clamp(Math.atan2(vl, Math.max(0.05, vs)), -1.3, 1.3);
    // lean from the turn (lateral acceleration), for the rider's roll
    const latAcc = (v * (r.yaw - yaw0)) / Math.max(dt, 1e-4);
    r.latAcc = (r.latAcc ?? 0) + (latAcc - (r.latAcc ?? 0)) * Math.min(1, dt * 20);

    const s0 = r.s, lat0 = r.lat, y0 = r.y;
    const k0 = kickerAt(course, s0, lat0);
    r.s += vs * dt;
    r.lat += vl * dt;
    berm(r, W, dt, ev);
    const g1 = groundAt(course, r.s, r.lat);
    const vyGround = (g1 - y0) / Math.max(dt, 1e-4);
    // knees: compression from the ground's vertical acceleration (rollers, landings)
    const ay = (vyGround - (r.vyG ?? vyGround)) / Math.max(dt, 1e-4);
    r.compress = clamp((r.compress ?? 0) + (clamp(ay / 40, -0.6, 1) - (r.compress ?? 0)) * Math.min(1, dt * 10), -0.6, 1);
    const crest = r.vyG != null && r.vyG - vyGround > G * 1.6 * dt && v > 16 && Math.abs(r.yaw) < 0.45 && want < 0.5 && !k0;
    // jump: crouch the moment it's pressed; a tap pops at once, holding lifts higher
    if (pressed) r.charge = 1;
    if (k0 && jumpHeld) r.kickerCharge = Math.min(1, (r.kickerCharge ?? 0) + dt / 0.4);
    const offLip = k0 && s0 <= k0.s + k0.len && r.s > k0.s + k0.len;
    if (offLip) {
      // Off the lip: the ramp's own upward speed carries on (no snap), plus the kicker's kick.
      const kick = clamp(v * 0.24, 3, 7) * k0.power + (r.kickerCharge ?? 0) * 2;
      r.air = true;
      r.airTime = 0;
      r.vy = Math.max(vyGround, (r.vyG ?? 0)) + kick;
      r.y = g1;
      r.lift = jumpHeld ? 0.2 : 0;
      r.spin = r.flip = r.spinV = r.flipV = 0;
      r.trickable = true;
      ev.push({ type: 'launch', kicker: k0.id, power: kick });
      r.kickerCharge = 0;
    } else if (pressed && !k0) {
      r.air = true;
      r.airTime = 0;
      r.vy = Math.max(vyGround, -v * Math.sin(f.pitch)) + 3.4;
      r.y = g1;
      r.lift = 0.3;
      r.spin = r.flip = r.spinV = r.flipV = 0;
      r.trickable = true;
      ev.push({ type: 'jump', charge: 0 });
    } else if (crest) {
      // the ground falls away faster than gravity: a little natural air off a roller
      r.air = true;
      r.airTime = 0;
      r.vy = r.vyG;
      r.y = g1;
      r.lift = 0;
      r.spin = r.flip = r.spinV = r.flipV = 0;
      r.trickable = false;
      ev.push({ type: 'pop' });
    } else {
      r.y = g1;
      r.vy = vyGround;
    }
    if (!k0) r.kickerCharge = 0;
    r.vyG = vyGround;
  } else {
    // ---- in the air
    r.airTime += dt;
    // holding jump just after take-off lifts a little higher
    if (jumpHeld && r.lift > 0) r.vy += 13 * dt;
    r.lift = jumpHeld ? Math.max(0, (r.lift ?? 0) - dt) : 0;
    r.vy -= G * dt;
    r.y += r.vy * dt;
    r.speed = Math.max(0, r.speed - 0.0035 * r.speed * r.speed * dt);
    r.s += r.speed * Math.cos(r.yaw) * dt;
    r.lat += r.speed * Math.sin(r.yaw) * dt;
    r.edge *= Math.exp(-dt * 4);
    r.latAcc = (r.latAcc ?? 0) * Math.exp(-dt * 4);
    r.compress = (r.compress ?? 0) * Math.exp(-dt * 6);
    berm(r, W, dt, ev);
    // Spin with the steer keys, flip with up/down; let go and it eases toward a clean angle.
    // (A little air off a roller isn't a trick: the steer just nudges your line.)
    if (!r.trickable) {
      r.yaw = clamp(r.yaw + steer * 0.6 * dt, -1.3, 1.3);
      steer = 0;
    }
    const spinTarget = steer * 7.2;
    r.spinV += (spinTarget - r.spinV) * Math.min(1, dt * 11);
    if (Math.abs(steer) < 0.1) {
      const goal = Math.round(r.spin / Math.PI) * Math.PI;
      r.spinV += (goal - r.spin) * dt * 22;
    }
    r.spin += r.spinV * dt;
    const flipTarget = (r.trickable ? flipIn : 0) * 6.4;
    r.flipV += (flipTarget - r.flipV) * Math.min(1, dt * 10);
    if (Math.abs(flipIn) < 0.1) {
      const goal = Math.round(r.flip / TAU) * TAU;
      r.flipV += (goal - r.flip) * dt * 20;
    }
    r.flip += r.flipV * dt;
    // the board lines up with the motion while airborne
    r.head += (r.yaw - r.head) * Math.min(1, dt * 3);
    const g1 = groundAt(course, r.s, r.lat);
    if (r.y <= g1) {
      land(r, g1, f, ev);
      r.vyG = null;
      r.compress = Math.min(1, 0.3 + (r.lastLand?.impact ?? 0) * 0.08);
    }
  }
  r.grounded = !r.air;
  collide(r, course, ev);
  // a bell arch: jump through it high enough and it rings (a little boost)
  if (course.bells?.length) {
    for (const b of course.bells) {
      if (r.lastS == null || r.lastS > b.s || r.s < b.s) continue;
      if (Math.abs(r.lat - b.lat) > b.w / 2) continue;
      const above = r.y - groundAt(course, r.s, r.lat);
      if (above > 0.9 && above < b.h + 0.5) {
        r.boost = Math.max(r.boost, 0.8);
        ev.push({ type: 'bell', id: b.id });
      }
    }
  }
  r.lastS = r.s;
  return ev;
}

const smooth01 = (t) => {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
};

/** Past the groomed edge the snow rises into a berm that turns you back; the fence stops you. */
function berm(r, W, dt, ev) {
  const a = Math.abs(r.lat);
  if (a > W - 0.3) {
    const over = a - (W - 0.3);
    const sign = Math.sign(r.lat);
    if (!r.air) {
      r.yaw -= sign * Math.min(0.5, over * 0.25) * dt * 2;
      r.speed *= 1 - Math.min(0.4, over * 0.08) * dt;
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
    if (course.burst?.has(ob.id)) continue;
    if (ob.kind === 'snowman') {
      // ride right through it: a big poof of snow and only a tiny slow-down
      course.burst?.add(ob.id);
      r.speed *= 0.9;
      ev.push({ type: 'burst', kind: ob.kind, id: ob.id, s: ob.s, lat: ob.lat });
      continue;
    }
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
