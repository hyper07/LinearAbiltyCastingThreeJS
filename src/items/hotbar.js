/**
 * The action bar on keys 1–9. Each key holds a learned skill (its element
 * id), a potion (`potion:health`, `potion:focus`) or nothing (null), and the
 * player arranges them freely: skills and potions can sit on any key.
 *
 * Kept per class with the skill ranks (Profile `progress[classId].slots`),
 * because each class has its own skills; the potions themselves are shared.
 */

export const POTION_KINDS = ['health', 'focus'];

/** What a potion looks like on a key. */
export const potionEntry = (kind) => `potion:${kind}`;

/** The potion kind on a key, or null when the key holds a skill or nothing. */
export function potionOf(entry) {
  if (typeof entry !== 'string' || !entry.startsWith('potion:')) return null;
  const kind = entry.slice(7);
  return POTION_KINDS.includes(kind) ? kind : null;
}

/** Does this key hold a skill (not a potion, not empty)? */
export const isSkillEntry = (entry) => typeof entry === 'string' && !entry.startsWith('potion:');

/** Where a new character's potions go: keys 6 and 7, right after the skills. */
export const DEFAULT_POTION_KEYS = { health: 5, focus: 6 };

/** Keys a new character's skills fill first (1–5, leaving 6 and 7 for the potions). */
export const SKILL_KEYS_FIRST = 5;
