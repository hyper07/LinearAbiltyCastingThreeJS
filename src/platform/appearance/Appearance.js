/**
 * Per-character appearance — colors and equipped clothing slots.
 */

/** @typedef {'head'|'chest'|'back'|'waist'} ClothingSlot */

/**
 * @typedef {object} CharacterAppearance
 * @property {string} tint       whole-body colour multiplier
 * @property {string|null} skinColor  per-part skin (skeleton / named meshes)
 * @property {string|null} clothColor per-part cloth / armor regions
 * @property {Record<ClothingSlot, string|null>} clothes slot → clothing id
 */

/** Mesh name patterns for per-part colouring. */
export const SKIN_MESH_PATTERNS = [
  /body/i,
  /head/i,
  /skull/i,
  /jaw/i,
  /arm/i,
  /leg/i,
  /eye/i,
  /hand/i,
  /foot/i,
  /toe/i,
  /face/i,
  /skin/i
];

export const CLOTH_MESH_PATTERNS = [/hat/i, /cape/i, /robe/i, /cloth/i, /armor/i, /mail/i, /hood/i];

/**
 * @param {import('../character/CharacterDefinition.js').CharacterDefinition|null} character
 * @returns {CharacterAppearance}
 */
export function defaultAppearance(character) {
  const model = character?.model ?? {};
  return {
    tint: model.tint ?? '#ffffff',
    skinColor: model.skinColor ?? null,
    clothColor: model.clothColor ?? null,
    clothes: {
      head: null,
      chest: null,
      back: null,
      waist: null
    }
  };
}

/**
 * @param {CharacterAppearance} appearance
 * @param {Partial<CharacterAppearance>} patch
 * @returns {CharacterAppearance}
 */
export function mergeAppearance(appearance, patch) {
  return {
    ...appearance,
    ...patch,
    clothes: {
      ...appearance.clothes,
      ...(patch.clothes ?? {})
    }
  };
}
