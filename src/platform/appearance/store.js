import { defaultAppearance, mergeAppearance } from './Appearance.js';

/** @type {Map<string, import('./Appearance.js').CharacterAppearance>} */
const appearances = new Map();

/**
 * @param {string} characterId
 * @param {import('../character/CharacterDefinition.js').CharacterDefinition|null} character
 */
export function getStoredAppearance(characterId, character) {
  if (!appearances.has(characterId)) {
    appearances.set(characterId, defaultAppearance(character));
  }
  return appearances.get(characterId);
}

/**
 * @param {string} characterId
 * @param {import('../character/CharacterDefinition.js').CharacterDefinition|null} character
 * @param {Partial<import('./Appearance.js').CharacterAppearance>} patch
 */
export function patchStoredAppearance(characterId, character, patch) {
  const next = mergeAppearance(getStoredAppearance(characterId, character), patch);
  appearances.set(characterId, next);
  return next;
}

export function resetStoredAppearance(characterId, character) {
  const next = defaultAppearance(character);
  appearances.set(characterId, next);
  return next;
}
