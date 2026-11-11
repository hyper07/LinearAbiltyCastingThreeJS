import { settings, ELEMENT_META } from '../config/settings.js';
import { SKILL_MAX_RANK, SKILL_RANK } from '../items/Items.js';

/**
 * How fast a character can cast, and what it costs — by character level and
 * skill rank. One place for the numbers, so the game, the skill tree and the
 * HUD all agree.
 *
 *   - **Mana.** Every class but the Rage ones spends mana. A skill costs mana by
 *     the effect it is built on (big spells cost more); a higher rank costs a
 *     little more, as it hits much harder. Max mana and regeneration grow with
 *     character level. The Mana Potion gives back half.
 *   - **Cooldowns** are the skill's own × a level factor (2.2 at level 1,
 *     shrinking 1.5% a level, never below 1.2) × the rank discount (3% a rank)
 *     × gear.
 *   - **The pause between casts** (a global cooldown on every skill key): 0.9 s
 *     at level 1, shorter each level, never under 0.45 s. No more chaining casts.
 */

export const PROGRESSION = {
  /** Mana by the effect a skill is built on (forged skills use their base's). */
  manaCost: {
    ice: 10, thunder: 12, meteor: 18, beam: 22, snare: 16, glacier: 24, chain: 16, orb: 26, hail: 34, blink: 14,
    slam: 10, rampage: 14, roar: 18, leap: 16, tempest: 20, quake: 26
  },
  /** Extra mana per rank above 1, as a share of the cost. */
  manaPerRank: 0.04,
  baseMana: 100,
  manaPerLevel: 6,
  baseRegen: 5,
  regenPerLevel: 0.25,
  cooldownScale: 2.2,
  cooldownPerLevel: 0.015,
  cooldownFloor: 1.2,
  globalCooldown: 0.9,
  globalPerLevel: 0.015,
  globalFloor: 0.45,
  /** The Mana Potion: this share of max mana back. */
  potionMana: 0.5
};

const baseOf = (element) => ELEMENT_META[element]?.base ?? element;

/** Mana a skill costs at a rank (0 for a class that fights with Rage). */
export function manaCost(element, rank = 1, { rage = false } = {}) {
  if (rage) return 0;
  const base = PROGRESSION.manaCost[baseOf(element)] ?? 15;
  return Math.round(base * (1 + Math.max(0, Math.min(SKILL_MAX_RANK, rank) - 1) * PROGRESSION.manaPerRank));
}

export const maxMana = (level = 1) => PROGRESSION.baseMana + (Math.max(1, level) - 1) * PROGRESSION.manaPerLevel;
export const manaRegen = (level = 1) => PROGRESSION.baseRegen + (Math.max(1, level) - 1) * PROGRESSION.regenPerLevel;

/** The level part of every cooldown. */
export function levelCooldownFactor(level = 1) {
  const p = PROGRESSION;
  return Math.max(p.cooldownFloor, p.cooldownScale * (1 - (Math.max(1, level) - 1) * p.cooldownPerLevel));
}

/**
 * A skill's cooldown, seconds.
 * @param {string} element
 * @param {{ level?: number, rank?: number, gear?: number }} [at] `gear`: the profile's cooldown multiplier without the rank part
 */
export function cooldownFor(element, { level = 1, rank = 1, gear = 1 } = {}) {
  const base = settings[element]?.cooldown ?? 1;
  const rankFactor = 1 - Math.max(0, Math.min(SKILL_MAX_RANK, rank) - 1) * (SKILL_RANK.cooldown / 100);
  return base * levelCooldownFactor(level) * rankFactor * gear;
}

/** The pause after any cast before the next one, seconds. */
export function globalCooldown(level = 1) {
  const p = PROGRESSION;
  return Math.max(p.globalFloor, p.globalCooldown * (1 - (Math.max(1, level) - 1) * p.globalPerLevel));
}
