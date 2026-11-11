import { LoopRepeat, MathUtils } from 'three';

import { settings } from '../config/settings.js';
import { saturate } from '../utils/math.js';

/**
 * 1D locomotion blend tree — idle ↔ walk ↔ run by ground speed.
 *
 * This is how most third-person games handle naturalistic movement: each gait
 * is a separate authored clip (mocap or hand-keyed), and runtime code only
 * picks weights and syncs playback rate to displacement. Joint angles for walk
 * and run are never derived from the idle pose.
 *
 * Foot IK and terrain adaptation are a separate pass layered on top of the
 * blended clip output (not implemented here yet). Cloth and capes are simulated
 * on secondary bone chains after the skeleton pose is final — see
 * `SecondaryMotion.js`.
 */
export class LocomotionPlayback {
  /**
   * @param {import('./CharacterController.js').CharacterController} character
   */
  constructor(character) {
    this.character = character;
    /** @type {import('../platform/motion/MotionDataset.js').MotionDataset|null} */
    this.dataset = null;
    this.idle = null;
    /**
     * The gaits: forward walk and run, and — when the clip set has them —
     * walking backwards, strafing left and right, and the in-air pose.
     * @type {Record<'walk'|'run'|'back'|'left'|'right'|'air', import('three').AnimationAction|null>}
     */
    this.actions = { walk: null, run: null, back: null, left: null, right: null, air: null };
    this._weights = { idle: 1, walk: 0, run: 0, back: 0, left: 0, right: 0, air: 0 };
  }

  get hasClips() {
    return !!(this.actions.walk && this.actions.run);
  }

  /**
   * @param {import('../platform/motion/MotionDataset.js').MotionDataset|null} dataset
   */
  bind(dataset) {
    this.dataset = dataset;
  }

  /** @param {import('three').AnimationAction} idleAction */
  setIdle(idleAction) {
    this.idle = idleAction;
  }

  /**
   * @param {'walk'|'run'} name
   * @param {import('three').AnimationAction} action
   */
  register(name, action) {
    if (!(name in this.actions)) return;
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    action.setEffectiveWeight(0);
    this.actions[name] = action;
  }

  /**
   * @param {import('./Locomotion.js').Locomotion} locomotion
   * @param {number} dt
   */
  update(locomotion, dt) {
    if (!this.hasClips || !this.idle || this.character.isCasting) return;

    const blend = this.dataset?.blend ?? {};
    const cfg = settings.character;
    // Velocity ramps in over a few frames; blend from intent too so legs start
    // moving the moment a movement key is held instead of sliding in idle.
    const intentSpeed =
      locomotion.intent.length() * cfg.moveSpeed * locomotion.gearMultiplier;
    const speed = Math.max(locomotion.speed, intentSpeed * 0.7);
    const walkNominal = blend.walkSpeed ?? cfg.moveSpeed * cfg.walkMultiplier;
    const runNominal = blend.runSpeed ?? cfg.moveSpeed * cfg.sprintMultiplier;
    const idleMax = blend.idleMaxSpeed ?? 0.12;

    let targetIdle;
    let targetWalk;
    let targetRun;

    if (speed < idleMax || locomotion.isSitting) {
      targetIdle = 1;
      targetWalk = 0;
      targetRun = 0;
    } else if (locomotion.walking) {
      const span = Math.max(0.01, walkNominal - idleMax);
      const t = saturate((speed - idleMax) / span);
      targetIdle = 1 - t;
      targetWalk = t;
      targetRun = 0;
    } else {
      const walkFloor = walkNominal * 0.55;
      const span = Math.max(0.01, runNominal - walkFloor);
      const t = saturate((speed - walkFloor) / span);
      targetIdle = 0;
      targetWalk = 1 - t;
      targetRun = t;
    }

    /*
     * Which way the body moves against the way it faces. Aiming turns the
     * body to the target, so moving sideways or away is common: playing the
     * forward run then is what makes feet skate. The moving share of the
     * blend is split by direction (squared, so the shares add to one):
     * forward → walk/run, backward → walking backwards, sideways → strafes.
     */
    const a = this.actions;
    let targetBack = 0;
    let targetLeft = 0;
    let targetRight = 0;
    const moving = targetWalk + targetRun;
    if (moving > 0 && locomotion.speed > idleMax && (a.back || a.left || a.right)) {
      const rel = Math.atan2(locomotion.velocity.x, locomotion.velocity.z) - this.character.facing;
      const f = Math.cos(rel);
      const side = Math.sin(rel); // + is the body's left
      let fwd = Math.max(0, f) ** 2;
      let back = a.back ? Math.max(0, -f) ** 2 : 0;
      let left = a.left ? Math.max(0, side) ** 2 : 0;
      let right = a.right ? Math.max(0, -side) ** 2 : 0;
      // A share whose clip is missing goes back to the forward gait.
      fwd += (a.back ? 0 : Math.max(0, -f) ** 2) + (a.left ? 0 : Math.max(0, side) ** 2) + (a.right ? 0 : Math.max(0, -side) ** 2);
      const sum = fwd + back + left + right || 1;
      targetWalk *= fwd / sum;
      targetRun *= fwd / sum;
      targetBack = (moving * back) / sum;
      targetLeft = (moving * left) / sum;
      targetRight = (moving * right) / sum;
    }
    // In the air: the airborne pose over everything.
    const targetAir = a.air && !locomotion.grounded ? 1 : 0;
    if (targetAir) {
      targetIdle = targetWalk = targetRun = targetBack = targetLeft = targetRight = 0;
    }

    const smooth = 1 - Math.exp(-dt / Math.max(0.04, blend.crossFade ?? 0.2));
    const w = this._weights;
    w.idle += (targetIdle - w.idle) * smooth;
    w.walk += (targetWalk - w.walk) * smooth;
    w.run += (targetRun - w.run) * smooth;
    w.back += (targetBack - w.back) * smooth;
    w.left += (targetLeft - w.left) * smooth;
    w.right += (targetRight - w.right) * smooth;
    w.air += (targetAir - w.air) * (1 - Math.exp(-dt / 0.08));

    this.idle.setEffectiveWeight(w.idle);
    a.walk.setEffectiveWeight(w.walk);
    a.run.setEffectiveWeight(w.run);
    a.back?.setEffectiveWeight(w.back);
    a.left?.setEffectiveWeight(w.left);
    a.right?.setEffectiveWeight(w.right);
    a.air?.setEffectiveWeight(w.air);
    // Backwards is a walk clip (no one runs backwards well): sped up to match the ground.
    a.back?.setEffectiveTimeScale(MathUtils.clamp(speed / Math.max(0.01, walkNominal), 0.5, 2.2));
    // The strafes are running clips.
    for (const side of [a.left, a.right]) side?.setEffectiveTimeScale(MathUtils.clamp(speed / Math.max(0.01, runNominal * 0.8), 0.55, 1.8));

    this.idle.setEffectiveTimeScale(1);

    if (this._weights.walk > 0.02) {
      const scale = (speed / Math.max(0.01, walkNominal)) * (blend.walkTimeScale ?? 1);
      this.actions.walk.setEffectiveTimeScale(MathUtils.clamp(scale, 0.45, 1.85));
    } else {
      this.actions.walk.setEffectiveTimeScale(1);
    }

    if (this._weights.run > 0.02) {
      const scale = (speed / Math.max(0.01, runNominal)) * (blend.runTimeScale ?? 1);
      this.actions.run.setEffectiveTimeScale(MathUtils.clamp(scale, 0.55, 2.1));
    } else {
      this.actions.run.setEffectiveTimeScale(1);
    }
  }

  /** Dominant locomotion action — used as the crossfade source for casts. */
  getBaseAction() {
    if (!this.hasClips) return this.idle;
    if (this._weights.run >= this._weights.walk && this._weights.run > 0.08) {
      return this.actions.run;
    }
    if (this._weights.walk > 0.08) return this.actions.walk;
    return this.idle;
  }

  /** Wake the blend tree after a cast clip finishes. */
  resumeAfterCast(finishedAction, blendOut) {
    this.idle.enabled = true;
    this.idle.play();
    for (const action of Object.values(this.actions)) action?.play();
    this.idle.crossFadeFrom(finishedAction, blendOut, false);
  }
}
