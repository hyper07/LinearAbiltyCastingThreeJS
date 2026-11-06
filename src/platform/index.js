/**
 * Platform module — reusable motion, character, skill and weapon definitions.
 *
 * @example
 * import { platform, createCharacter, createSkill, createMotionProfile } from './platform/index.js';
 *
 * platform.bootstrap();
 * platform.setCharacter('caster');
 */

export { Registry } from './Registry.js';
export { Platform, platform } from './Platform.js';

export {
  createMotionProfile,
  applyMotionProfile,
  extractMotionProfile,
  MOTION_KEYS,
  CASTING_KEYS
} from './motion/MotionProfile.js';
export { DEFAULT_MOTIONS, humanoidSprint, humanoidWalk, humanoidHeavy } from './motion/catalog.js';
export { createMotionDataset, locomotionClipUrl } from './motion/MotionDataset.js';
export { DEFAULT_MOTION_DATASETS, casterLocomotion, casterAltLocomotion, agileLocomotion, heavyLocomotion, monkLocomotion, kaykitLocomotion } from './motion/datasets.js';
export { applyModelManifest, CHARACTER_MODEL_SOURCES, characterModelPath } from './character/modelManifest.js';
export { kaykitRig, KaykitRigAdapter } from './rig/KaykitRigAdapter.js';

export { createCharacter, castClipUrl } from './character/CharacterDefinition.js';
export { DEFAULT_CHARACTERS, caster } from './character/catalog.js';
export { DIABLO_CHARACTERS, DIABLO_II_CHARACTERS, DIABLO_III_CHARACTERS } from './character/diablo.js';

export { createSkill } from './skill/SkillDefinition.js';
export { DEFAULT_SKILLS, SKILL_BY_ABILITY } from './skill/catalog.js';

export { createAttack } from './attack/AttackDefinition.js';
export { DEFAULT_ATTACKS } from './attack/catalog.js';
export { CHARACTER_ATTACK_KITS, attackKitForCharacter } from './attack/characterAttacks.js';

export {
  defaultAppearance,
  mergeAppearance,
  SKIN_MESH_PATTERNS,
  CLOTH_MESH_PATTERNS
} from './appearance/Appearance.js';

export { deriveCharacterStats } from './stats/deriveStats.js';
export { SKILL_TREE_BRANCHES, buildSkillTree, enrichSkillTree } from './skill/tree.js';

export { createWeapon, WEAPON_CATEGORIES, WEAPON_CATEGORY_META, categoryGlyph } from './weapon/WeaponDefinition.js';
export { WEAPON_ARSENAL } from './weapon/arsenal.js';
export { DEFAULT_WEAPONS } from './weapon/catalog.js';

export { createLoadout, skillAtSlot, abilityAtSlot } from './loadout/Loadout.js';
export { DEFAULT_LOADOUTS, casterDefault } from './loadout/catalog.js';

export {
  MixamoRigAdapter,
  mixamoRig,
  shortBoneName,
  MIXAMO_BONES,
  MIXAMO_LIMB_CHILD,
  MIXAMO_ATTACH_POINTS
} from './rig/MixamoRigAdapter.js';
