import { CLASS_SPECS } from '../character/classes.js';

/**
 * Per-character direct-attack kits.
 *
 * Each class gets 3–4 themed attacks from the shared catalog. The preview
 * picker and left-click combat both draw from this list.
 */

/** @type {Record<string, string[]>} */
export const CHARACTER_ATTACK_KITS = {
  caster: ['arcane-strike', 'staff-bash', 'force-push', 'slash'],

  /* Classes (see character/classes.js) */
  ...Object.fromEntries(CLASS_SPECS.map((c) => [c.id, c.attacks]))
};

/** Fallback when a character has no explicit kit. */
export const DEFAULT_ATTACK_KIT = ['slash', 'thrust', 'heavy-slash'];

/**
 * @param {string} characterId
 * @returns {string[]}
 */
export function attackKitForCharacter(characterId) {
  return CHARACTER_ATTACK_KITS[characterId] ?? DEFAULT_ATTACK_KIT;
}
