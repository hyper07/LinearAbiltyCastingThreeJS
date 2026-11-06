/**
 * Per-character direct-attack kits.
 *
 * Each class gets 3–4 themed attacks from the shared catalog. The preview
 * picker and left-click combat both draw from this list.
 */

/** @type {Record<string, string[]>} */
export const CHARACTER_ATTACK_KITS = {
  caster: ['arcane-strike', 'staff-bash', 'force-push', 'slash'],

  /* Diablo II */
  'd2-amazon': ['jab', 'power-strike', 'charged-shot', 'rapid-strike'],
  'd2-assassin': ['shadow-step', 'fan-knives', 'palm-strike', 'roundhouse'],
  'd2-barbarian': ['cleave', 'maul', 'whirlwind', 'war-cry-strike'],
  'd2-druid': ['rake', 'mauling-swipe', 'slash', 'thrust'],
  'd2-necromancer': ['bone-spear', 'soul-drain', 'staff-bash', 'thrust'],
  'd2-paladin': ['smite', 'shield-bash', 'heavy-slash', 'thrust'],
  'd2-sorceress': ['arcane-strike', 'force-push', 'staff-bash', 'jab'],

  /* Diablo III */
  'd3-barbarian': ['cleave', 'maul', 'whirlwind', 'heavy-slash'],
  'd3-crusader': ['smite', 'shield-bash', 'heavy-slash', 'war-cry-strike'],
  'd3-demon-hunter': ['crossbow-bolt', 'fan-knives', 'rapid-strike', 'jab'],
  'd3-monk': ['palm-strike', 'roundhouse', 'rapid-strike', 'shadow-step'],
  'd3-necromancer': ['bone-spear', 'soul-drain', 'staff-bash', 'thrust'],
  'd3-witch-doctor': ['soul-drain', 'staff-bash', 'slash', 'force-push'],
  'd3-wizard': ['arcane-strike', 'force-push', 'staff-bash', 'thrust']
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
