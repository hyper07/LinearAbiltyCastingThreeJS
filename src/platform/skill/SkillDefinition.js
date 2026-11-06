/**
 * Skill definition schema.
 *
 * Skills are the gameplay-facing layer above raw abilities. A skill points at
 * an ability implementation (`abilityId` → `IceAbility` + `settings.ice`) and
 * carries presentation data (label, hotkey, cast animation, target shape).
 * Characters equip skills through loadouts.
 */

/**
 * @typedef {object} SkillDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} abilityId     maps to ability class + settings block
 * @property {string} [castAnim]    body clip id (`cast1`, …)
 * @property {string} [castShape]   `'line'` | `'zone'`
 * @property {string} [accent]      UI colour
 * @property {string} [key]         hotkey label
 * @property {string} [hint]        tooltip
 */

/**
 * @param {string} id
 * @param {Partial<SkillDefinition>} data
 * @returns {SkillDefinition}
 */
export function createSkill(id, data) {
  return {
    id,
    label: data.label ?? id,
    abilityId: data.abilityId ?? id,
    castAnim: data.castAnim,
    castShape: data.castShape ?? 'line',
    accent: data.accent,
    key: data.key,
    hint: data.hint,
    ...data
  };
}
