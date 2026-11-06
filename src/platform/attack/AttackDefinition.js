/**
 * Direct (melee / close-range) attack schema.
 *
 * Attacks reuse cast body clips for now — each entry picks a gesture and
 * carries its own reach, damage, and timing.
 */

/**
 * @typedef {object} AttackDefinition
 * @property {string} id
 * @property {string} label
 * @property {number} damage
 * @property {number} range          metres, from the caster's feet
 * @property {number} [arc]          total sweep in radians (default ~120°)
 * @property {number} [knockback]
 * @property {number} [cooldown]     seconds
 * @property {string} [castAnim]     body clip id (`cast1`, …)
 * @property {string} [accent]       hit VFX tint
 * @property {string} [hint]         short tooltip
 */

/**
 * @param {string} id
 * @param {Partial<AttackDefinition>} data
 * @returns {AttackDefinition}
 */
export function createAttack(id, data) {
  return {
    id,
    label: data.label ?? id,
    damage: data.damage ?? 10,
    range: data.range ?? 2.2,
    arc: data.arc ?? Math.PI * 0.66,
    knockback: data.knockback ?? 0.6,
    cooldown: data.cooldown ?? 0.42,
    castAnim: data.castAnim ?? 'cast2',
    accent: data.accent ?? '#ffb070',
    hint: data.hint,
    ...data
  };
}
