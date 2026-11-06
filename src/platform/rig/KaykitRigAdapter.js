/**
 * KayKit Adventurers / Skeletons skeleton adapter.
 *
 * KayKit humanoids use Blender-style bone names (`hand.l`, `upperleg.r`, …).
 * This adapter exposes the same logical handles as `MixamoRigAdapter` so
 * locomotion, weapons and VFX can drive either rig.
 */

export const KAYKIT_LOGICAL_BONES = [
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
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand'
];

/** Logical Mixamo-style name → KayKit bone name (no dots — matches exported GLBs). */
export const KAYKIT_BONE_MAP = {
  Hips: 'hips',
  Spine: 'spine',
  Spine1: 'chest',
  Spine2: 'chest',
  Neck: 'head',
  Head: 'head',
  LeftUpLeg: 'upperlegl',
  LeftLeg: 'lowerlegl',
  LeftFoot: 'footl',
  RightUpLeg: 'upperlegr',
  RightLeg: 'lowerlegr',
  RightFoot: 'footr',
  LeftToeBase: 'toesl',
  RightToeBase: 'toesr',
  LeftShoulder: 'upperarml',
  LeftArm: 'upperarml',
  LeftForeArm: 'lowerarml',
  LeftHand: 'handl',
  RightShoulder: 'upperarmr',
  RightArm: 'upperarmr',
  RightForeArm: 'lowerarmr',
  RightHand: 'handr'
};

/** Logical parent → logical child (same keys as MixamoRigAdapter). */
export const KAYKIT_LIMB_CHILD = {
  LeftUpLeg: 'LeftLeg',
  LeftLeg: 'LeftFoot',
  LeftFoot: 'LeftToeBase',
  RightUpLeg: 'RightLeg',
  RightLeg: 'RightFoot',
  RightFoot: 'RightToeBase',
  LeftArm: 'LeftForeArm',
  LeftForeArm: 'LeftHand',
  RightArm: 'RightForeArm',
  RightForeArm: 'RightHand'
};

export const KAYKIT_ATTACH_POINTS = {
  handL: 'handl',
  handR: 'handr',
  head: 'head',
  hips: 'hips',
  footL: 'footl',
  footR: 'footr'
};

export function kaykitBoneName(name) {
  return name.split('.').pop();
}

export class KaykitRigAdapter {
  constructor(options = {}) {
    this.id = options.id ?? 'kaykit';
    this.boneNames = options.bones ?? KAYKIT_LOGICAL_BONES;
    this.boneMap = options.boneMap ?? KAYKIT_BONE_MAP;
    this.limbChild = options.limbChild ?? KAYKIT_LIMB_CHILD;
    this.attachPoints = options.attachPoints ?? KAYKIT_ATTACH_POINTS;
    this.wandSide = options.wandSide ?? 'Right';
    this._bones = new Map();
    this._actual = new Map();
  }

  /** @param {import('three').Object3D} model */
  bind(model) {
    this._bones.clear();
    this._actual.clear();

    /** @type {Map<string, import('three').Bone>} */
    const found = new Map();
    model.traverse((node) => {
      if (node.isBone) found.set(node.name, node);
    });

    const bones = new Map();
    for (const logical of this.boneNames) {
      const actual = this.boneMap[logical];
      const bone = actual ? found.get(actual) : null;
      if (bone) {
        bones.set(logical, bone);
        this._bones.set(logical, bone);
        this._actual.set(actual, bone);
      }
    }

    const missing = this.boneNames.filter((name) => !bones.has(name));
    if (missing.length) {
      console.warn(`[KaykitRigAdapter] missing ${missing.length} bone(s): ${missing.join(', ')}`);
    }

    return { bones, missing };
  }

  getAttachBone(bones, point) {
    const boneName = this.attachPoints[point] ?? point;
    return bones.get(boneName) ?? null;
  }
}

/** Shared singleton for KayKit humanoid rigs. */
export const kaykitRig = new KaykitRigAdapter();
