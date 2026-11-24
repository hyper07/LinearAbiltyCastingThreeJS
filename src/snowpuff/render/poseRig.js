/**
 * The riders' full-body animation, pure (no three.js): layered procedural
 * poses driven by the physics state, then a spring per joint for overlap
 * and follow-through. RiderModel applies the joint values to its bones.
 *
 *   layers   stance (3/4 side-on, knees bent, arms out)
 *          + turn   (head → shoulders → hips lead into the new direction from
 *                    the raw steer input; lean; toeside forward with the rear
 *                    hand dragging in the snow; heelside sitting back, arms
 *                    forward; up-and-over at an edge change; counter-rotation)
 *          + state  (tuck, skid, air and spins, landing, tumble, idle)
 *          + look   (a glance at a rider alongside or a gift ahead)
 *   springs  head fastest, shoulders, hips slower; arms a little underdamped
 *            so they overshoot and settle; nothing snaps.
 *
 * Body space: the rider faces +z and stands side-on to the board. In a race
 * the body is turned `bodyYaw` = stance × (π/2 + OPEN) about y (regular:
 * left foot forward, chest toward the toe edge, opened 0.55 rad toward the
 * nose — the 3/4 compromise that reads from the chase camera). Angles follow
 * three.js: rotation.y > 0 turns the face toward +x… counter-clockwise from above.
 *
 * update() allocates nothing: the joints live in Float32Arrays.
 */

/** The ice spin and the face-plant play for this long (s) — the physics' SLIP and the race's TUMBLE. */
export const SPIN_T = 1.1, PLANT_T = 0.85;

/** Ice: how far round the rider has spun t s into a slip — two whole turns, easing in and out, ending square. */
export function iceSpin(t) {
  const u = Math.max(0, Math.min(1, t / SPIN_T));
  return Math.PI * 4 * u * u * (3 - 2 * u);
}

/** A snowball face-plant: the forward pitch (rad) t s in — over the nose fast, a beat in the snow, a springy pop back (a little past upright, then square). */
export function plantPitch(t) {
  const u = Math.max(0, Math.min(1, t / PLANT_T));
  if (u < 0.22) return Math.sin(((u / 0.22) * Math.PI) / 2) * 1.25;
  if (u < 0.6) return 1.25;
  // ease-out-back: past upright a touch, then square
  const w = (u - 0.6) / 0.4 - 1, c1 = 1.70158;
  return 1.25 * -((c1 + 1) * w * w * w + c1 * w * w);
}

export const J = Object.freeze({
  headYaw: 0, headPitch: 1, headRoll: 2,
  chestYaw: 3, chestPitch: 4, chestRoll: 5,
  hipsYaw: 6, hipsDrop: 7,
  armLRaise: 8, armLSwing: 9, armRRaise: 10, armRSwing: 11,
  lean: 12, hop: 13, eyes: 14, drag: 15
});
const N = 16;

/** Spring stiffness (ω, rad/s) and damping ratio per joint. */
const OMEGA = [34, 26, 20, 20, 16, 16, 13, 16, 15, 15, 15, 15, 20, 22, 18, 14];
const ZETA = [1, 0.9, 0.9, 0.85, 0.85, 0.85, 0.9, 0.75, 0.55, 0.55, 0.55, 0.55, 0.9, 0.6, 1, 1];

export const OPEN = 0.3; // how far the hips open toward the nose from straight side-on (a little: truly sideways, feet across the board)
export const MAX_LEAN = 0.47; // ~27°

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class PoseRig {
  /** @param {{ stance?: 1 | -1 }} o  1 = regular (left foot forward), −1 = goofy */
  constructor({ stance = 1 } = {}) {
    this.stance = stance;
    this.bodyYaw = stance * (Math.PI / 2 + OPEN);
    // where "along the run" points, as a head yaw in body space
    this.travelYaw = stance * (Math.PI / 2 - OPEN);
    // which arm leads (is on the nose side): the one on the travel side of the body
    // (in body space the L bones sit at −x, R at +x; travel lies toward +x for regular)
    this.leadIsR = stance > 0;
    this.target = new Float32Array(N);
    this.value = new Float32Array(N);
    this.vel = new Float32Array(N);
    this.t = 0;
    this.headLook = 0;
  }

  /**
   * One frame. `s` (read only, not kept):
   *   menu, idle, cheer, speed, steerIn (raw input −1..1), steer (ramped), edge,
   *   latAcc, tuck, charge, air, spinV, flipV, skid, compress, unweight, landed,
   *   tumbleK, spinoutK, wobble, lookYaw (extra head yaw toward something, body space)
   * Returns this.value (same array every frame).
   */
  update(dt, s) {
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const t = this.t;
    const T = this.target;
    const st = this.stance;
    const menu = Boolean(s.menu);
    const speed = s.speed || 0;
    const edge = s.edge || 0;
    const steerIn = clamp(s.steerIn || 0, -1, 1);
    const sp01 = clamp(speed / 14, 0, 1);
    // toeside when the edge tips toward the chest side (regular: turning right)
    const toe = clamp(edge * st, -1, 1);
    const toeK = Math.max(0, toe), heelK = Math.max(0, -toe);
    const tuck = s.tuck || 0;
    const air = Boolean(s.air);
    const skid = s.skid || 0;
    const lean = clamp(s.lean != null ? s.lean : edge * 0.4, -MAX_LEAN, MAX_LEAN);

    if (menu || s.idle) {
      // ---- idle: breathing, little bounces, looking around
      const look = menu ? Math.sin(t * 0.6) * 0.25 + Math.sin(t * 1.7) * 0.06 : this.travelYaw * 0.6 + Math.sin(t * 0.8) * 0.45;
      T[J.headYaw] = look;
      T[J.headPitch] = Math.sin(t * 1.3) * 0.05;
      T[J.headRoll] = Math.sin(t * 0.9) * 0.06;
      T[J.chestYaw] = look * 0.25;
      T[J.chestPitch] = Math.sin(t * 2.3) * 0.02;
      T[J.chestRoll] = 0;
      T[J.hipsYaw] = 0;
      T[J.hipsDrop] = 0.15 + Math.max(0, Math.sin(t * 3.1)) * (s.idle ? 0.25 : 0.08);
      const cheer = Boolean(s.cheer);
      T[J.armLRaise] = cheer ? 2.2 + Math.sin(t * 9) * 0.4 : 0.25 + Math.sin(t * 1.4) * 0.05;
      T[J.armRRaise] = cheer ? 2.2 + Math.sin(t * 9 + 1) * 0.4 : 0.25 + Math.sin(t * 1.4 + 0.5) * 0.05;
      T[J.armLSwing] = cheer ? 0 : Math.sin(t * 1.1) * 0.15;
      T[J.armRSwing] = cheer ? 0 : -Math.sin(t * 1.1) * 0.15;
      T[J.lean] = 0;
      T[J.hop] = s.idle ? Math.max(0, Math.sin(t * 3.1)) * 0.04 : 0;
      T[J.eyes] = 1;
      T[J.drag] = 0;
    } else {
      // ---- stance + turn: the head leads, straight from the input (no waiting for physics)
      const lead = steerIn * 0.55 + (s.steer || 0) * 0.15;
      const glance = clamp(s.lookYaw || 0, -0.9, 0.9);
      this.headLook += (glance - this.headLook) * Math.min(1, dt * 6);
      const spinLead = air ? clamp(-(s.spinV || 0) * 0.09, -0.7, 0.7) : 0;
      T[J.headYaw] = this.travelYaw - lead + this.headLook + spinLead;
      T[J.headPitch] = 0.06 - toeK * 0.2 + heelK * 0.1 - tuck * 0.25 + (air ? -0.1 : 0); // the head stays up, eyes on the line
      T[J.headRoll] = -lean * 0.35;
      // shoulders and hips follow the head, each a beat later (their springs are slower);
      // in quick slaloms the shoulders counter-rotate a little against the hips
      T[J.chestYaw] = -lead * 0.55 + spinLead * 0.6 - (s.steer || 0) * 0.12 * st;
      T[J.hipsYaw] = -(s.steer || 0) * 0.32 + spinLead * 0.3;
      // toeside: forward over the toes; heelside: sitting back
      T[J.chestPitch] = toeK * 0.2 - heelK * 0.24 + tuck * 0.42 - skid * 0.3;
      T[J.chestRoll] = -lean * 0.15;
      // knees: flex with the edge and the tuck, soak up compression; up-and-over at an edge change
      const flex = 0.25 + Math.abs(edge) * 0.45 * sp01 + tuck * 0.75 + (s.charge || 0) * 0.6 + Math.max(0, s.compress || 0) * 0.6 + heelK * 0.2;
      const over = s.unweight > 0 ? -0.35 : 0;
      T[J.hipsDrop] = clamp(flex + over - Math.max(0, -(s.compress || 0)) * 0.3, -0.4, 1.3);
      T[J.hop] = s.unweight > 0 ? 0.06 : 0;
      T[J.lean] = lean;
      // arms: the leading hand points the way, the trailing arm balances behind;
      // toeside — the rear hand reaches down to drag in the snow; heelside — both arms forward
      const leadRaise = 1.05 + Math.abs(lean) * 0.4;
      const rearRaise = 0.8 - toeK * 1.15 + heelK * 0.2;
      const leadSwing = 0.25 + toeK * 0.45 + heelK * 0.7;
      const rearSwing = -0.45 + toeK * 1.0 + heelK * 1.15;
      const drag = toeK > 0.62 && speed > 9 && !air ? clamp((toeK - 0.62) / 0.25, 0, 1) : 0;
      T[J.drag] = drag;
      let lR = leadRaise, lS = leadSwing, rR = rearRaise - drag * 0.25, rS = rearSwing;
      if (tuck > 0.3) {
        // tuck: compact, both arms tucked in front
        const k = clamp((tuck - 0.3) / 0.5, 0, 1);
        lR += (0.15 - lR) * k; rR += (0.15 - rR) * k;
        lS += (1.15 - lS) * k; rS += (1.15 - rS) * k;
      }
      if (skid > 0.3) {
        // skid: leaning back, arms flailing, a surprised face
        const k = clamp((skid - 0.3) / 0.4, 0, 1);
        lR += (1.6 + Math.sin(t * 17) * 0.5 - lR) * k;
        rR += (1.5 + Math.sin(t * 19 + 1) * 0.5 - rR) * k;
      }
      if (air) {
        // air: arms out and up, knees up
        lR = 1.35 + Math.sin(t * 6) * 0.1; rR = 1.3 + Math.sin(t * 6 + 1) * 0.1;
        lS = 0.2; rS = -0.1;
        T[J.hipsDrop] = 0.7;
      }
      if (s.plant) {
        // a face-plant: both arms thrown forward over the head, legs kicked up behind
        lR = 2.5 + Math.sin(t * 20) * 0.2; rR = 2.5 + Math.sin(t * 20 + 2) * 0.2;
        lS = 0.9; rS = 0.9;
        T[J.hipsDrop] = 0.4;
      } else if (s.tumbleK > 0 || s.spinoutK > 0) {
        lR = 1.5 + Math.sin(t * 18) * 0.6; rR = 1.5 + Math.sin(t * 18 + 2) * 0.6;
        T[J.headYaw] += Math.sin(t * 14) * 0.4;
      }
      if (s.slipK > 0) {
        // spinning round on ice: arms straight out like a figure skater, a little wobble, eyes wide
        lR = 1.55 + Math.sin(t * 9) * 0.12; rR = 1.55 + Math.sin(t * 9 + Math.PI) * 0.12;
        lS = 0; rS = 0;
        T[J.chestPitch] -= 0.12;
      }
      if (s.flat) {
        // squashed flat: arms and legs splayed out on the snow
        lR = 1.6; rR = 1.6; lS = 0.2; rS = 0.2;
        T[J.hipsDrop] = 0.2;
      }
      if (s.wobble > 0) {
        lR += Math.sin(t * 15) * 0.5 * s.wobble;
        rR += Math.sin(t * 13 + 1) * 0.5 * s.wobble;
      }
      // in body space the lead arm is R for regular, L for goofy
      if (this.leadIsR) {
        T[J.armRRaise] = lR; T[J.armRSwing] = lS; T[J.armLRaise] = rR; T[J.armLSwing] = rS;
      } else {
        T[J.armLRaise] = lR; T[J.armLSwing] = lS; T[J.armRRaise] = rR; T[J.armRSwing] = rS;
      }
      T[J.eyes] = skid > 0.5 || s.slipK > 0 ? 1.35 : 1;
    }
    // a landing: compress, then the arms flap to rebalance
    if (s.landed) {
      const k = Math.min(1.5, 0.4 + s.landed * 0.15);
      this.vel[J.hipsDrop] += 6 * k;
      this.vel[J.armLRaise] += 9 * k;
      this.vel[J.armRRaise] -= 7 * k;
    }
    // springs
    const V = this.value, W = this.vel;
    for (let i = 0; i < N; i++) {
      const w = OMEGA[i], z = ZETA[i];
      const a = (T[i] - V[i]) * w * w - 2 * z * w * W[i];
      W[i] += a * dt;
      V[i] += W[i] * dt;
      if (!Number.isFinite(V[i])) {
        V[i] = T[i] || 0;
        W[i] = 0;
      }
    }
    return V;
  }

  /** Snap every joint to its target (a teleport, a menu change). */
  settle() {
    this.value.set(this.target);
    this.vel.fill(0);
  }
}

/** Stance per species: a mix of regular and goofy riders. */
export const STANCE = { fox: 1, bunny: -1, bear: 1, cat: -1, frog: 1, pig: -1, penguin: 1 };
