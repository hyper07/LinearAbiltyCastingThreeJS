/**
 * Character definition schema.
 *
 * A character is data + asset paths, not a class. The runtime entity
 * (`CharacterController`) loads whatever definition you hand it.
 */

/**
 * @typedef {object} CharacterModelAssets
 * @property {string} idle      path to the rigged idle FBX
 * @property {string} [texture] diffuse map when the FBX ships without one
 * @property {number} [scale]   import scale (Mixamo = 0.01)
 * @property {number} [targetHeight] normalised height in metres
 */

/**
 * @typedef {object} CharacterDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} rig          rig adapter id (`mixamo`, …)
 * @property {CharacterModelAssets} model
 * @property {string[]} [castClips] animation clip ids to load from `./models/<id>.fbx`
 * @property {string} motion        motion profile id (speed, cadence, lean tuning)
 * @property {string} [motionDataset] locomotion clip set id (idle / walk / run blend)
 * @property {string} [defaultLoadout] loadout id
 * @property {'fbx'|'glb'} [model.format]
 * @property {object} [model.animationClips] clip names inside a GLB (`Idle`, `Walking_A`, …)
 * @property {string} [model.tint] hex colour multiplier for class variants
 * @property {string} [series]        franchise grouping for the character picker
 * @property {string} [tagline]       short flavor line in the menu
 * @property {string} [icon]          emoji / glyph shown on the character card
 * @property {Record<string, string>} [attachPoints] override rig attach map
 * @property {string} [wandSide]   `'Left'` | `'Right'`
 * @property {object} [casting]    cast blend / lunge overrides
 * @property {string[]} [attacks]  direct-attack ids (see `platform.attacks`)
 */

/**
 * @param {string} id
 * @param {Partial<CharacterDefinition>} data
 * @returns {CharacterDefinition}
 */
export function createCharacter(id, data) {
  return {
    id,
    label: data.label ?? id,
    rig: data.rig ?? 'mixamo',
    model: data.model ?? {},
    castClips: data.castClips ?? ['cast1', 'cast2', 'cast3'],
    motion: data.motion ?? 'humanoid-sprint',
    defaultLoadout: data.defaultLoadout ?? 'caster-default',
    attachPoints: data.attachPoints,
    wandSide: data.wandSide ?? 'Right',
    casting: data.casting ?? {},
    ...data
  };
}

/** Resolve a cast clip URL from its id. */
export function castClipUrl(clipId) {
  return `./models/${clipId}.fbx`;
}
