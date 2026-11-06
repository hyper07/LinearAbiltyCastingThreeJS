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
    /** @type {{ walk: import('three').AnimationAction|null, run: import('three').AnimationAction|null }} */
    this.actions = { walk: null, run: null };
    this._weights = { idle: 1, walk: 0, run: 0 };
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
    if (name !== 'walk' && name !== 'run') return;
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

    const smooth = 1 - Math.exp(-dt / Math.max(0.04, blend.crossFade ?? 0.2));
    this._weights.idle += (targetIdle - this._weights.idle) * smooth;
    this._weights.walk += (targetWalk - this._weights.walk) * smooth;
    this._weights.run += (targetRun - this._weights.run) * smooth;

    this.idle.setEffectiveWeight(this._weights.idle);
    this.actions.walk.setEffectiveWeight(this._weights.walk);
    this.actions.run.setEffectiveWeight(this._weights.run);

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
    this.actions.walk?.play();
    this.actions.run?.play();
    this.idle.crossFadeFrom(finishedAction, blendOut, false);
  }
}
