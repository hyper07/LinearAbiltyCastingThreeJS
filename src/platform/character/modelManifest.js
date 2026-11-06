/**
 * Per-character 3D model sources.
 *
 * The class bodies are CC0 KayKit meshes committed in
 * `public/models/characters/<look>/model.glb`; `npm run fetch-characters`
 * downloads them again.
 */

const KAYKIT_ADV =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf';
const KAYKIT_SKEL =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf';

/** @typedef {'mixamo' | 'kaykit'} CharacterRigId */
/** @typedef {'fbx' | 'glb'} CharacterModelFormat */

/**
 * @typedef {object} CharacterModelSource
 * @property {CharacterModelFormat} format
 * @property {CharacterRigId} rig
 * @property {string} [downloadUrl] remote URL for `fetch-characters`
 * @property {string} [localPath]    `./models/characters/<id>/model.glb`
 * @property {object} [animationClips] clip names inside the GLB
 * @property {number} [scale]
 * @property {number} [targetHeight]
 * @property {string} [tint] hex colour multiplier for class variants
 */

/** KayKit cast / locomotion clip names bundled in every Adventurer GLB. */
export const KAYKIT_ANIMATION_CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  casts: {
    cast1: '1H_Ranged_Shoot',
    cast2: '2H_Melee_Attack_Chop',
    cast3: '1H_Melee_Attack_Stab',
    // Physical skills (Barbarian).
    slam: '2H_Melee_Attack_Chop',
    charge: '2H_Melee_Attack_Stab',
    cheer: 'Cheer',
    leap: 'Jump_Full_Long',
    spin: '2H_Melee_Attack_Spinning',
    // Weapons.
    shoot1: '1H_Ranged_Shoot',
    shoot2: '2H_Ranged_Shoot',
    throw: 'Throw',
    reload1: '1H_Ranged_Reload',
    reload2: '2H_Ranged_Reload'
  }
};

export const KAYKIT_SKELETON_CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  casts: {
    cast1: '1H_Ranged_Shoot',
    cast2: '2H_Melee_Attack_Chop',
    cast3: '1H_Melee_Attack_Stab',
    slam: '2H_Melee_Attack_Chop',
    charge: '2H_Melee_Attack_Stab',
    cheer: 'Taunt',
    leap: '1H_Melee_Attack_Jump_Chop',
    spin: '2H_Melee_Attack_Spinning',
    shoot1: '1H_Ranged_Shoot',
    shoot2: '2H_Ranged_Shoot',
    throw: 'Throw',
    reload1: '1H_Ranged_Reload',
    reload2: '2H_Ranged_Reload'
  }
};

/** @type {Record<string, CharacterModelSource>} */
export const CHARACTER_MODEL_SOURCES = {
  caster: {
    format: 'fbx',
    rig: 'mixamo',
    localPath: './models/Idle.fbx',
    texture: './models/diffuse.png',
    scale: 0.01,
    targetHeight: 1.78
  },

  /* Class bodies (see classes.js LOOKS). `npm run fetch-characters` re-downloads them. */
  knight: { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_ADV}/Knight.glb`, animationClips: KAYKIT_ANIMATION_CLIPS },
  mage: { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_ADV}/Mage.glb`, animationClips: KAYKIT_ANIMATION_CLIPS },
  barbarian: { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_ADV}/Barbarian.glb`, animationClips: KAYKIT_ANIMATION_CLIPS },
  rogue: { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_ADV}/Rogue.glb`, animationClips: KAYKIT_ANIMATION_CLIPS },
  'rogue-hooded': { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_ADV}/Rogue_Hooded.glb`, animationClips: KAYKIT_ANIMATION_CLIPS },
  'skeleton-warrior': { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_SKEL}/Skeleton_Warrior.glb`, animationClips: KAYKIT_SKELETON_CLIPS },
  'skeleton-mage': { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_SKEL}/Skeleton_Mage.glb`, animationClips: KAYKIT_SKELETON_CLIPS },
  'skeleton-rogue': { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_SKEL}/Skeleton_Rogue.glb`, animationClips: KAYKIT_SKELETON_CLIPS },
  'skeleton-minion': { format: 'glb', rig: 'kaykit', downloadUrl: `${KAYKIT_SKEL}/Skeleton_Minion.glb`, animationClips: KAYKIT_SKELETON_CLIPS }
};

/** Resolve the on-disk model path for a character id. */
export function characterModelPath(characterId, format = 'glb') {
  if (characterId === 'caster') return './models/Idle.fbx';
  return `./models/characters/${characterId}/model.${format}`;
}

/** Merge manifest defaults into a character definition's `model` block. */
export function applyModelManifest(character) {
  const source = CHARACTER_MODEL_SOURCES[character.id];
  if (!source) return character;

  const format = source.format ?? 'glb';
  return {
    ...character,
    rig: source.rig ?? character.rig,
    model: {
      format,
      idle: source.localPath ?? characterModelPath(character.id, format),
      texture: source.texture ?? character.model?.texture,
      scale: source.scale ?? (format === 'glb' ? 1 : 0.01),
      targetHeight: source.targetHeight ?? character.model?.targetHeight ?? 1.78,
      tint: source.tint,
      animationClips: source.animationClips,
      ...character.model
    },
    motionDataset: source.animationClips
      ? `${source.rig}-locomotion`
      : character.motionDataset
  };
}
