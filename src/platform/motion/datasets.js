import { createMotionDataset } from './MotionDataset.js';

/**
 * Default caster gait — Mixamo walk + run on the same skeleton as Idle.fbx.
 *
 * Export from Mixamo with **In Place** checked so root motion stays in the
 * clip and translation continues to come from `Locomotion.step`.
 */
export const casterLocomotion = createMotionDataset('caster-locomotion', {
  label: 'Caster — standard gait',
  clips: {
    walk: 'walk',
    run: 'run'
  },
  blend: {
    idleMaxSpeed: 0.12,
    walkSpeed: 1.45,
    runSpeed: 4.6,
    crossFade: 0.2,
    walkTimeScale: 1,
    runTimeScale: 1
  }
});

/** Heavier, slower character — same clips, different blend thresholds. */
export const casterAltLocomotion = createMotionDataset('caster-alt-locomotion', {
  label: 'Alt caster — deliberate gait',
  clips: {
    walk: 'walk',
    run: 'run'
  },
  blend: {
    idleMaxSpeed: 0.1,
    walkSpeed: 1.25,
    runSpeed: 3.8,
    crossFade: 0.26,
    walkTimeScale: 0.92,
    runTimeScale: 0.95
  }
});

/** Amazon, assassin, demon hunter — quicker cadence. */
export const agileLocomotion = createMotionDataset('agile-locomotion', {
  label: 'Agile — hunter gait',
  clips: { walk: 'walk', run: 'run' },
  blend: {
    idleMaxSpeed: 0.14,
    walkSpeed: 1.55,
    runSpeed: 5.1,
    crossFade: 0.16,
    walkTimeScale: 1.05,
    runTimeScale: 1.08
  }
});

/** Barbarian, paladin, crusader — armoured stride. */
export const heavyLocomotion = createMotionDataset('heavy-locomotion', {
  label: 'Heavy — armoured gait',
  clips: { walk: 'walk', run: 'run' },
  blend: {
    idleMaxSpeed: 0.08,
    walkSpeed: 1.15,
    runSpeed: 3.4,
    crossFade: 0.28,
    walkTimeScale: 0.88,
    runTimeScale: 0.9
  }
});

/** Monk — balanced martial footwork. */
export const monkLocomotion = createMotionDataset('monk-locomotion', {
  label: 'Monk — martial gait',
  clips: { walk: 'Walking_A', run: 'Running_A' },
  embedded: true,
  blend: {
    idleMaxSpeed: 0.11,
    walkSpeed: 1.38,
    runSpeed: 4.2,
    crossFade: 0.22,
    walkTimeScale: 0.98,
    runTimeScale: 1.02
  }
});

/** KayKit GLB — locomotion clips live inside the character file. */
export const kaykitLocomotion = createMotionDataset('kaykit-locomotion', {
  label: 'KayKit — embedded gait',
  clips: { walk: 'Walking_A', run: 'Running_A' },
  embedded: true,
  blend: {
    idleMaxSpeed: 0.12,
    walkSpeed: 1.45,
    runSpeed: 4.6,
    crossFade: 0.2,
    walkTimeScale: 1,
    runTimeScale: 1
  }
});

export const DEFAULT_MOTION_DATASETS = [
  casterLocomotion,
  casterAltLocomotion,
  agileLocomotion,
  heavyLocomotion,
  monkLocomotion,
  kaykitLocomotion
];
