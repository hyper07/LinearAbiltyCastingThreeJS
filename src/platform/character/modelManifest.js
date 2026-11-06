/**
 * Per-character 3D model sources.
 *
 * Run `npm run fetch-characters` to download CC0 KayKit meshes into
 * `public/models/characters/<id>/model.glb`.
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
    cast3: '1H_Melee_Attack_Stab'
  }
};

export const KAYKIT_SKELETON_CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  casts: {
    cast1: '1H_Ranged_Shoot',
    cast2: '2H_Melee_Attack_Chop',
    cast3: '1H_Melee_Attack_Stab'
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

  'd2-amazon': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Rogue.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.76,
    tint: '#c45c8a'
  },
  'd2-assassin': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Rogue_Hooded.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.72,
    tint: '#4a5568'
  },
  'd2-barbarian': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Barbarian.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.9,
    tint: '#b84a32'
  },
  'd2-druid': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Mage.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.8,
    tint: '#3d7a46'
  },
  'd2-necromancer': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_SKEL}/Skeleton_Mage.glb`,
    animationClips: KAYKIT_SKELETON_CLIPS,
    targetHeight: 1.84,
    tint: '#6b5b7a'
  },
  'd2-paladin': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Knight.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.86,
    tint: '#d4af37'
  },
  'd2-sorceress': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Mage.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.74,
    tint: '#5b8fd4'
  },

  'd3-barbarian': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Barbarian.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.92,
    tint: '#8b2e1a'
  },
  'd3-crusader': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Knight.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.88,
    tint: '#e8c547'
  },
  'd3-demon-hunter': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Rogue.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.75,
    tint: '#8b1a1a'
  },
  'd3-monk': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_ADV}/Rogue_Hooded.glb`,
    animationClips: KAYKIT_ANIMATION_CLIPS,
    targetHeight: 1.78,
    tint: '#c9a227'
  },
  'd3-necromancer': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_SKEL}/Skeleton_Warrior.glb`,
    animationClips: KAYKIT_SKELETON_CLIPS,
    targetHeight: 1.82,
    tint: '#4a6741'
  },
  'd3-witch-doctor': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_SKEL}/Skeleton_Minion.glb`,
    animationClips: KAYKIT_SKELETON_CLIPS,
    targetHeight: 1.7,
    tint: '#7a4a9e'
  },
  'd3-wizard': {
    format: 'glb',
    rig: 'kaykit',
    downloadUrl: `${KAYKIT_SKEL}/Skeleton_Mage.glb`,
    animationClips: KAYKIT_SKELETON_CLIPS,
    targetHeight: 1.76,
    tint: '#4a90d9'
  }
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
