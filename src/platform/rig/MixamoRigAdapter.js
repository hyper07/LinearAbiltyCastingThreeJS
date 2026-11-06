/**
 * Mixamo skeleton adapter.
 *
 * Mixamo rigs share bone naming (`mixamorig:Hips`, `mixamorigLeftFoot`, …).
 * This adapter normalizes names and exposes the bone map any motion layer
 * needs, so the same gait profile works on every Mixamo export of the same
 * skeleton.
 */

/** Bones the procedural gait drives. Missing bones are skipped. */
export const MIXAMO_BONES = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'LeftToeBase',
  'RightToeBase',
  'LeftToe_End',
  'RightToe_End',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand'
];

/** Which bone each driven segment points at. */
export const MIXAMO_LIMB_CHILD = {
  LeftUpLeg: 'LeftLeg',
  LeftLeg: 'LeftFoot',
  LeftFoot: 'LeftToeBase',
  RightUpLeg: 'RightLeg',
  RightLeg: 'RightFoot',
  RightFoot: 'RightToeBase',
  LeftArm: 'LeftForeArm',
  LeftForeArm: 'LeftHand',
  RightArm: 'RightForeArm',
  RightForeArm: 'RightHand',
  LeftToeBase: 'LeftToe_End',
  RightToeBase: 'RightToe_End'
};

/** Default attach points for weapons and VFX. */
export const MIXAMO_ATTACH_POINTS = {
  handL: 'LeftHand',
  handR: 'RightHand',
  head: 'Head',
  hips: 'Hips',
  footL: 'LeftFoot',
  footR: 'RightFoot'
};

/** Mixamo exports the prefix with or without a colon depending on the tool. */
export function shortBoneName(name) {
  return name.split(':').pop().replace(/^mixamorig/i, '');
}

export class MixamoRigAdapter {
  constructor(options = {}) {
    this.id = options.id ?? 'mixamo';
    this.boneNames = options.bones ?? MIXAMO_BONES;
    this.limbChild = options.limbChild ?? MIXAMO_LIMB_CHILD;
    this.attachPoints = options.attachPoints ?? MIXAMO_ATTACH_POINTS;
    this.wandSide = options.wandSide ?? 'Right';
  }

  /** @param {import('three').Object3D} model */
  bind(model) {
    /** @type {Map<string, import('three').Bone>} */
    const bones = new Map();
    model.traverse((node) => {
      if (!node.isBone) return;
      const short = shortBoneName(node.name);
      if (this.boneNames.includes(short) && !bones.has(short)) {
        bones.set(short, node);
      }
    });

    const missing = this.boneNames.filter((name) => !bones.has(name));
    if (missing.length) {
      console.warn(`[MixamoRigAdapter] missing ${missing.length} bone(s): ${missing.join(', ')}`);
    }

    return { bones, missing };
  }

  /** @param {Map<string, import('three').Bone>} bones @param {string} point */
  getAttachBone(bones, point) {
    const boneName = this.attachPoints[point] ?? point;
    return bones.get(boneName) ?? null;
  }
}

/** Shared singleton for the default humanoid rig. */
export const mixamoRig = new MixamoRigAdapter();
