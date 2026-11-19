/**
 * Gloamreach's combat arithmetic, as pure functions (no three.js, no DOM) so
 * every number is unit-tested: how hard a blow lands (variance, critical
 * strikes, armour), the hero classes' stats and how they grow by level,
 * experience and levelling, and skill cooldowns.
 *
 *   const hit = rollDamage({ base: 24, mult: 1.8, critChance: 0.1, armour: 30, attackerLevel: 4 });
 *   const s = heroStats('knight', 5, gearTotals(equip));   // maxHp, atk, armour, crit…
 *   const ups = addXp(profile, 140);                       // the levels gained, if any
 *   const cd = new Cooldowns(); cd.start('bash', 6, now); cd.left('bash', now + 1) → 5
 */

/** The highest level a hero reaches. */
export const MAX_LEVEL = 30;

/** Experience from one level to the next. */
export const xpToNext = (level) => Math.round(70 * level ** 1.5 + 50 * level);

/** Give experience: levels gained come back as a list (and the profile is changed). */
export function addXp(profile, amount) {
  const ups = [];
  if (!(amount > 0)) return ups;
  profile.xp = (profile.xp ?? 0) + Math.round(amount);
  while (profile.level < MAX_LEVEL && profile.xp >= xpToNext(profile.level)) {
    profile.xp -= xpToNext(profile.level);
    profile.level++;
    ups.push(profile.level);
  }
  if (profile.level >= MAX_LEVEL) profile.xp = 0;
  return ups;
}

/** Experience a kill is worth: more for a stronger foe, less for one far below the hero. */
export function xpForKill(monsterLevel, heroLevel, { elite = false, boss = false } = {}) {
  const base = 18 + monsterLevel * 9;
  const gap = monsterLevel - heroLevel;
  const k = gap >= 0 ? 1 + Math.min(gap, 5) * 0.12 : Math.max(0.1, 1 + gap * 0.2);
  return Math.max(1, Math.round(base * k * (boss ? 12 : elite ? 4 : 1)));
}

/**
 * The hero classes: their resource (what skills cost), starting stats and
 * growth per level. `crit` in percent; `armour` flat; `regen` per second.
 */
export const CLASS_STATS = {
  knight: { resource: 'stamina', hp: 150, hpL: 18, res: 100, resL: 2, resRegen: 9, atk: 12, atkL: 2.4, spell: 0, armour: 14, armourL: 2.2, crit: 5, hpRegen: 1.4 },
  ranger: { resource: 'energy', hp: 115, hpL: 13, res: 100, resL: 2, resRegen: 12, atk: 11, atkL: 2.3, spell: 0, armour: 8, armourL: 1.4, crit: 9, hpRegen: 1.1 },
  mage: { resource: 'mana', hp: 95, hpL: 11, res: 140, resL: 9, resRegen: 6, atk: 7, atkL: 1.2, spell: 14, spellL: 2.6, armour: 5, armourL: 1, crit: 6, hpRegen: 0.9 }
};

/** What each resource is called and coloured on the HUD. */
export const RESOURCES = {
  stamina: { name: 'Stamina', color: '#e2b04a' },
  energy: { name: 'Energy', color: '#9ad35a' },
  mana: { name: 'Mana', color: '#5a8cff' }
};

/**
 * A hero's numbers at a level wearing gear (`totals` from items.gearTotals):
 * { maxHp, maxRes, atk, spell, armour, crit (0…1), critMult, speed (×), block (0…1), leech (0…1), hpRegen, resRegen }.
 */
export function heroStats(cls, level, totals = {}) {
  const c = CLASS_STATS[cls] ?? CLASS_STATS.knight;
  const L = Math.max(1, level) - 1;
  const t = (k) => totals[k] ?? 0;
  return {
    resource: c.resource,
    maxHp: Math.round(c.hp + c.hpL * L + t('hp')),
    maxRes: Math.round(c.res + c.resL * L + t('mp')),
    atk: Math.round(c.atk + c.atkL * L + t('atk')),
    spell: Math.round((c.spell ?? 0) + (c.spellL ?? 0) * L + t('spell')),
    armour: Math.round(c.armour + c.armourL * L + t('armour')),
    crit: Math.min(0.75, (c.crit + t('crit')) / 100),
    critMult: 1.6 + t('critdmg') / 100,
    speed: Math.max(0.7, Math.min(1.4, 1 + t('speed') / 100)),
    block: Math.min(0.8, t('block') / 100),
    leech: Math.min(0.2, t('leech') / 100),
    hpRegen: c.hpRegen * (1 + L * 0.08) + t('regen'),
    resRegen: c.resRegen
  };
}

/** A monster's numbers at its level, from its definition (bestiary.js). */
export function monsterStats(def, level) {
  const L = Math.max(1, level) - 1;
  // Elites and the boss are sized for where they stand, so they grow less with level.
  const g = def.boss || def.elite ? 0.06 : 0.22;
  return {
    maxHp: Math.round(def.hp * (1 + g * L)),
    atk: Math.round(def.atk + def.atk * 0.16 * L),
    armour: Math.round((def.armour ?? 0) + (def.armour ?? 0) * 0.18 * L + L * 1.5),
    crit: def.crit ?? 0.05
  };
}

/**
 * How much armour takes off a blow from an attacker of `attackerLevel`:
 * 0 with none, rising and flattening toward 75 %.
 */
export function armourReduction(armour, attackerLevel = 1) {
  if (!(armour > 0)) return 0;
  const r = armour / (armour + 45 + 14 * Math.max(1, attackerLevel));
  return Math.min(0.75, r);
}

/**
 * One blow: { amount (whole, at least 1), crit, raw }.
 * base × mult, ±variance, a critical strike multiplies, armour takes its share.
 * `rand` is a 0…1 stream (seeded in tests).
 */
export function rollDamage({ base, mult = 1, critChance = 0, critMult = 1.6, armour = 0, attackerLevel = 1, variance = 0.1, bonus = 0, rand = Math.random }) {
  let raw = Math.max(0, base) * mult * (1 + (rand() * 2 - 1) * variance) * (1 + bonus);
  const crit = rand() < critChance;
  if (crit) raw *= critMult;
  const amount = Math.max(1, Math.round(raw * (1 - armourReduction(armour, attackerLevel))));
  return { amount, crit, raw };
}

/**
 * A blow on a hero who may be blocking (the knight's shield, from the front:
 * within `arc` of where they face), with the shield's block chance on top.
 * Returns the damage after the block and whether it was blocked.
 */
export function blockedDamage(amount, { blocking = false, facing = 0, from = 0, arc = 2.2, block = 0, rand = Math.random } = {}) {
  let d = from - facing;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const front = Math.abs(d) <= arc / 2;
  if (blocking && front) return { amount: Math.max(0, Math.round(amount * 0.2)), blocked: true };
  if (front && block > 0 && rand() < block) return { amount: Math.round(amount * 0.5), blocked: true };
  return { amount, blocked: false };
}

/**
 * Cooldowns on an absolute clock (seconds), so they hold through pauses and
 * hit-stops when the clock does.
 */
export class Cooldowns {
  constructor() {
    this.until = new Map();
    this.length = new Map();
  }

  start(id, seconds, now) {
    this.until.set(id, now + seconds);
    this.length.set(id, seconds);
  }

  left(id, now) {
    return Math.max(0, (this.until.get(id) ?? 0) - now);
  }

  ready(id, now) {
    return this.left(id, now) <= 0;
  }

  /** 0 (ready) … 1 (just used), for the HUD's sweep. */
  frac(id, now) {
    const len = this.length.get(id) ?? 0;
    return len > 0 ? Math.min(1, this.left(id, now) / len) : 0;
  }

  clear() {
    this.until.clear();
    this.length.clear();
  }
}

/** Can a skill go now? `{ ok, reason }` — 'cooldown', 'resource', 'stunned', 'level'. */
export function canUseSkill(skill, { resource = 0, now = 0, cooldowns = null, stunned = false, level = 1 } = {}) {
  if (!skill) return { ok: false, reason: 'unknown' };
  if (stunned) return { ok: false, reason: 'stunned' };
  if ((skill.level ?? 1) > level) return { ok: false, reason: 'level' };
  if (cooldowns && !cooldowns.ready(skill.id, now)) return { ok: false, reason: 'cooldown' };
  if (resource < (skill.cost ?? 0)) return { ok: false, reason: 'resource' };
  return { ok: true };
}
