/**
 * Clothing item schema — bone-attached gear (capes, hoods, belts, …).
 */

/** @typedef {'head'|'chest'|'back'|'waist'|'shoulders'} ClothingSlotId */
/** @typedef {'head'|'chest'|'hips'|'handL'|'handR'} ClothingAttachId */

/**
 * @typedef {object} ClothingDefinition
 * @property {string} id
 * @property {string} label
 * @property {ClothingSlotId} slot
 * @property {ClothingAttachId} attachPoint rig attach id
 * @property {string} [visual] procedural mesh recipe id
 * @property {string} [color] default hex
 * @property {string} [icon] menu glyph
 * @property {string} [description]
 */

/**
 * @param {string} id
 * @param {Partial<ClothingDefinition>} data
 * @returns {ClothingDefinition}
 */
export function createClothing(id, data) {
  return {
    id,
    label: data.label ?? id,
    slot: data.slot ?? 'chest',
    attachPoint: data.attachPoint ?? 'chest',
    visual: data.visual ?? id,
    color: data.color,
    icon: data.icon ?? '◆',
    description: data.description ?? '',
    ...data
  };
}
