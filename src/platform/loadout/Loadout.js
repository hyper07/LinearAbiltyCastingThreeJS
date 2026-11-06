/**
 * Loadout — which skills and weapon a character brings into a session.
 *
 * Slot order maps to the number-row hotkeys. Replacing a loadout is how you
 * customise a character without touching ability code.
 */

/**
 * @typedef {object} LoadoutDefinition
 * @property {string} id
 * @property {string} [label]
 * @property {string[]} skills   skill ids, one per slot
 * @property {string|null} [weapon] weapon id, or null for empty hands
 */

/**
 * @param {string} id
 * @param {Partial<LoadoutDefinition>} data
 * @returns {LoadoutDefinition}
 */
export function createLoadout(id, data) {
  return {
    id,
    label: data.label ?? id,
    skills: data.skills ?? [],
    weapon: data.weapon ?? null,
    ...data
  };
}

/** Resolve a slot index to a skill id, clamped. */
export function skillAtSlot(loadout, slot) {
  if (!loadout?.skills?.length) return null;
  return loadout.skills[slot] ?? null;
}

/** Resolve a slot index to an ability id via the skill registry. */
export function abilityAtSlot(loadout, slot, skills) {
  const skillId = skillAtSlot(loadout, slot);
  if (!skillId) return null;
  return skills.get(skillId)?.abilityId ?? null;
}
