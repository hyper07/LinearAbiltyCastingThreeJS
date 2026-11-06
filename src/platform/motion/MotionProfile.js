/**
 * Reusable locomotion + gait data.
 *
 * Motion profiles are the "asset" form of everything `Locomotion` reads each
 * frame. They can be shared across characters, swapped at runtime, or forked
 * per weapon. The live editor still mutates `settings.character`; applying a
 * profile copies its values there so sliders keep working.
 */

/** Keys owned by a motion profile (subset of `settings.character`). */
export const MOTION_KEYS = [
  'moveSpeed',
  'walkMultiplier',
  'sprintMultiplier',
  'acceleration',
  'friction',
  'airControl',
  'moveTurnRate',
  'radius',
  'jumpHeight',
  'gravity',
  'coyoteTime',
  'jumpBufferTime',
  'cadenceWalk',
  'cadenceRun',
  'gaitDecay',
  'strideBias',
  'ankleExtend',
  'legExtend',
  'dropWalk',
  'dropRun',
  'stanceWalk',
  'stanceRun',
  'footRollWalk',
  'footRollRun',
  'legSwing',
  'kneeBend',
  'swingLinger',
  'kneeContact',
  'stanceKnee',
  'flightRise',
  'armSwing',
  'armForwardReach',
  'armCarry',
  'armTuck',
  'elbowWalk',
  'elbowRun',
  'elbowSwing',
  'handRoll',
  'handRollCast',
  'handCurl',
  'hipSwayWalk',
  'hipSwayRun',
  'bodyBob',
  'runLean',
  'accelLean',
  'pelvisTwist',
  'shoulderTwist',
  'chestBounce',
  'pelvisList',
  'spineBend',
  'spineLag',
  'shoulderDrop',
  'gaitBlend',
  'sitDrop',
  'sitBlend',
  'sitFold',
  'sitSplay'
];

/** Keys for cast accent (character-level, not gait). */
export const CASTING_KEYS = [
  'castBlendIn',
  'castBlendOut',
  'turnToAim',
  'turnRate',
  'castLean',
  'castRecoil',
  'castSettle'
];

/**
 * Build a motion profile from a plain object.
 *
 * @param {string} id
 * @param {string} [label]
 * @param {object} data gait + locomotion params
 */
export function createMotionProfile(id, label, data = {}) {
  if (typeof label === 'object' && data === undefined) {
    data = label;
    label = id;
  }
  const profile = { id, label: label ?? id, ...data };
  return profile;
}

/**
 * Copy a profile's motion keys into a live tuning object (usually
 * `settings.character`).
 *
 * @param {object} profile
 * @param {object} target
 * @param {string[]} [keys]
 */
export function applyMotionProfile(profile, target, keys = MOTION_KEYS) {
  if (!profile || !target) return target;
  for (const key of keys) {
    if (profile[key] !== undefined) target[key] = profile[key];
  }
  return target;
}

/**
 * Extract motion keys from a live object into a new profile.
 *
 * @param {string} id
 * @param {object} source
 */
export function extractMotionProfile(id, source) {
  const data = {};
  for (const key of MOTION_KEYS) {
    if (source[key] !== undefined) data[key] = source[key];
  }
  return createMotionProfile(id, data);
}
