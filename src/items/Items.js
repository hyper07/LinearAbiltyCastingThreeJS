import { ELEMENT_META } from '../config/settings.js';
import { platform } from '../platform/index.js';
import { GEAR_BASES, GEAR_BASE_BY_ID, GEAR_ONLY_STATS, GEAR_UNIQUES, gearClassOf, gearTypeLabel, pieceStats } from './Gear.js';

/**
 * Items: what drops, what it does, what it is worth.
 *
 * Every item is a small plain object, so the bag can be saved as JSON:
 *
 *   { uid, type: 'weapon'|'gear'|'book'|'potion'|'gold', rarity, name, value,
 *     weapon?, stats?, element?, potion?, amount?,
 *     base?, kind?, group?, implicit? }      // gear: see items/Gear.js
 *
 * Weapons come from the game's own armory and carry bonus stats by rarity;
 * gear (helmets, armor, shields, boots, rings…) carries its item class's base
 * properties plus the same kind of bonus stats; skill books raise one spell's
 * rank; potions go to the belt; gold goes to the purse.
 */

export const RARITIES = {
  common: { label: 'Common', color: '#d8dde6', affixes: 0, weight: 60, value: 1 },
  magic: { label: 'Magic', color: '#5aa9ff', affixes: 1, weight: 28, value: 2.5 },
  rare: { label: 'Rare', color: '#ffd84a', affixes: 2, weight: 9, value: 6 },
  epic: { label: 'Epic', color: '#c27bff', affixes: 3, weight: 2.6, value: 14 },
  unique: { label: 'Unique', color: '#ff9a3c', affixes: 0, weight: 0.4, value: 30 }
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'epic', 'unique'];

export const ELEMENT_NAMES = {
  ice: 'Frost Lance',
  thunder: 'Storm Lance',
  meteor: 'Cinder Fall',
  beam: 'Nova Beam',
  snare: 'Voltaic Snare',
  glacier: 'Glacial Crown',
  chain: 'Arc Chain',
  orb: 'Void Orb',
  hail: 'Hailstorm',
  blink: 'Blink Strike',
  slam: 'Earthsplitter',
  rampage: 'Rampage',
  roar: 'Battle Roar',
  leap: 'Skybreaker Leap',
  tempest: 'Iron Tempest',
  quake: 'Worldbreaker'
};

/** Physical skills (built-in or forged on a physical base) come in manuals, spells in tomes. */
const isPhysical = (element) => Boolean(ELEMENT_META[element]?.physical);
export const bookTitle = (element) => `${isPhysical(element) ? 'Manual' : 'Tome'} of ${ELEMENT_NAMES[element]}`;

/** Bonus stats. Ranges per rarity tier: [magic, rare, epic] × [min, max]. */
export const STATS = {
  damage: { label: (v) => `+${v}% spell damage`, ranges: [[4, 9], [8, 15], [12, 22]] },
  cooldown: { label: (v) => `−${v}% cooldowns`, ranges: [[3, 6], [5, 9], [8, 14]] },
  health: { label: (v) => `${v < 0 ? '−' + -v : '+' + v} max health`, ranges: [[8, 18], [15, 30], [25, 45]] },
  speed: { label: (v) => `${v < 0 ? '−' + -v : '+' + v}% move speed`, ranges: [[3, 6], [5, 9], [8, 12]] },
  crit: { label: (v) => `+${v}% critical chance`, ranges: [[2, 4], [3, 6], [5, 9]] },
  gold: { label: (v) => `+${v}% gold found`, ranges: [[10, 20], [18, 35], [30, 60]] },
  attack: { label: (v) => `+${v}% weapon damage`, ranges: [[5, 10], [8, 15], [12, 22]] },
  armor: { label: (v) => `+${v}% armor (less damage taken)`, ranges: [[1, 3], [2, 4], [3, 6]] },
  block: { label: (v) => `+${v}% chance to block a hit`, ranges: [[3, 6], [5, 9], [8, 12]] },
  regen: { label: (v) => `+${v} health per second`, ranges: [[0.4, 0.9], [0.8, 1.6], [1.4, 2.6]], step: 0.1 },
  thorns: { label: (v) => `${v} damage back to whatever hits you`, ranges: [[5, 10], [8, 16], [14, 25]] },
  ice: { label: (v) => `+${v}% Frost Lance damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  thunder: { label: (v) => `+${v}% Storm Lance damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  meteor: { label: (v) => `+${v}% Cinder Fall damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  beam: { label: (v) => `+${v}% Nova Beam damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  snare: { label: (v) => `+${v}% Voltaic Snare damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  glacier: { label: (v) => `+${v}% Glacial Crown damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  chain: { label: (v) => `+${v}% Arc Chain damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  orb: { label: (v) => `+${v}% Void Orb damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  hail: { label: (v) => `+${v}% Hailstorm damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  blink: { label: (v) => `+${v}% Blink Strike damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  slam: { label: (v) => `+${v}% Earthsplitter damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  rampage: { label: (v) => `+${v}% Rampage damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  roar: { label: (v) => `+${v}% Battle Roar damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  leap: { label: (v) => `+${v}% Skybreaker Leap damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  tempest: { label: (v) => `+${v}% Iron Tempest damage`, ranges: [[10, 18], [16, 26], [24, 40]] },
  quake: { label: (v) => `+${v}% Worldbreaker damage`, ranges: [[10, 18], [16, 26], [24, 40]] }
};

/** Named uniques: a fixed weapon and fixed, stronger bonuses. */
export const UNIQUES = [
  { name: 'Glacierheart', weapon: 'frost-wand', stats: { ice: 45, glacier: 35, cooldown: 10 } },
  { name: 'Ashen Requiem', weapon: 'ember-wand', stats: { meteor: 50, damage: 15, health: 30 } },
  { name: 'Tempest Sceptre', weapon: 'scepter', stats: { thunder: 45, snare: 35, speed: 10 } },
  { name: 'Dawnspire', weapon: 'holy-wand', stats: { beam: 50, crit: 10, health: 25 } },
  { name: 'The Hollow Crown', weapon: 'void-orb', stats: { damage: 25, cooldown: 12, gold: 50 } },
  { name: 'Wardenblade', weapon: 'claymore', stats: { health: 60, speed: 12, damage: 12 } }
];

/**
 * Spell ranks: 0 = not learned, 1 = learned (base power), up to 10. One book
 * per rank. Each rank past the first: +10% damage, −3% cooldown on that spell.
 */
export const SKILL_MAX_RANK = 10;
export const SKILL_RANK = { damage: 10, cooldown: 3 };

export const POTIONS = {
  health: { name: 'Health Potion', color: '#ff4a5a', price: 25, text: 'Restores 45% of your health. (R)' },
  focus: { name: 'Focus Potion', color: '#4ad2ff', price: 40, text: 'Every spell is ready again. (Z)' }
};

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const between = ([lo, hi], rng, step = 1) => Math.round((lo + (hi - lo) * rng()) / step) * step;
/** Roll `count` different affixes from `keys` at a rarity tier. */
function rollAffixes(keys, count, tier, rng, into = {}) {
  for (let i = 0; i < count; i++) {
    let key = pick(keys, rng);
    for (let tries = 0; key in into && tries < 8; tries++) key = pick(keys, rng);
    const stat = STATS[key];
    into[key] = Math.round(between(stat.ranges[tier], rng, stat.step ?? 1) * 10) / 10;
  }
  return into;
}

export function rollRarity(rng = Math.random, boost = 0) {
  const weights = RARITY_ORDER.map((r, i) => RARITIES[r].weight * (1 + boost * i));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_ORDER[i];
  }
  return 'common';
}

function weaponPool() {
  return platform.weapons.all().filter((w) => w.category !== 'unarmed');
}

export function makeWeapon(rarity = 'common', rng = Math.random) {
  if (rarity === 'unique') {
    const u = pick(UNIQUES, rng);
    const base = platform.weapons.get(u.weapon) ?? pick(weaponPool(), rng);
    return { uid: uid(), type: 'weapon', rarity, name: u.name, weapon: base.id, baseName: base.label, stats: { ...u.stats }, value: 0 };
  }
  // Magic weapons a little more often: this is a spellcaster's game.
  const pool = weaponPool();
  const magic = pool.filter((w) => w.category === 'magic');
  const base = rng() < 0.45 ? pick(magic, rng) : pick(pool, rng);
  const tier = RARITY_ORDER.indexOf(rarity) - 1; // magic 0, rare 1, epic 2
  const stats = rollAffixes(WEAPON_AFFIXES, RARITIES[rarity].affixes, tier, rng);
  const prefix = { common: '', magic: pick(['Gleaming', 'Charged', 'Keen', 'Warded', 'Swift'], rng), rare: pick(['Storm-Touched', 'Runed', 'Ember-Forged', 'Frostbound', 'Duskwoven'], rng), epic: pick(['Starfallen', 'Sovereign', 'Abyssal', 'Radiant', 'Wyrmbone'], rng) }[rarity];
  const item = { uid: uid(), type: 'weapon', rarity, name: prefix ? `${prefix} ${base.label}` : base.label, weapon: base.id, baseName: base.label, stats, value: 0 };
  return item;
}

const WEAPON_AFFIXES = Object.keys(STATS).filter((k) => !GEAR_ONLY_STATS.includes(k));
const SKILL_AFFIXES = Object.keys(STATS).filter((k) => k in ELEMENT_NAMES);
/** Gear rolls the general stats more often than one skill's. */
const GEAR_GENERAL = ['damage', 'cooldown', 'health', 'speed', 'crit', 'gold', 'attack', 'armor', 'regen', 'thorns'];

const GEAR_PREFIX = {
  magic: ['Sturdy', 'Fine', 'Warded', 'Swift', 'Gleaming'],
  rare: ['Runed', 'Stormbound', 'Ember-Forged', 'Frostbound', 'Duskwoven'],
  epic: ['Starfallen', 'Sovereign', 'Abyssal', 'Radiant', 'Wyrmbone']
};

/**
 * A piece of gear: a random base (or one of `kind`, or the base `baseId`),
 * its item class's base properties, and affixes by rarity.
 * @param {string} [rarity]
 * @param {() => number} [rng]
 * @param {{ kind?: string, base?: string }} [options]
 */
export function makeGear(rarity = 'common', rng = Math.random, { kind = null, base: baseId = null } = {}) {
  if (rarity === 'unique') {
    const pool = GEAR_UNIQUES.filter((u) => (!kind || GEAR_BASE_BY_ID[u.base].kind === kind) && (!baseId || u.base === baseId));
    const u = pick(pool.length ? pool : GEAR_UNIQUES, rng);
    const base = GEAR_BASE_BY_ID[u.base];
    return gearItem(base, 'unique', u.name, { ...u.stats });
  }
  const pool = baseId ? [GEAR_BASE_BY_ID[baseId]] : GEAR_BASES.filter((b) => !kind || b.kind === kind);
  const base = pick(pool, rng);
  const tier = RARITY_ORDER.indexOf(rarity) - 1;
  const keys = rng() < 0.75 ? GEAR_GENERAL : SKILL_AFFIXES;
  const stats = {};
  // A shield's first affix is often more block; everything else draws freely.
  if (tier >= 0 && base.group === 'shield' && rng() < 0.5) rollAffixes(['block'], 1, tier, rng, stats);
  rollAffixes(keys, RARITIES[rarity].affixes - Object.keys(stats).length, tier, rng, stats);
  const prefix = GEAR_PREFIX[rarity] ? pick(GEAR_PREFIX[rarity], rng) : '';
  return gearItem(base, rarity, prefix ? `${prefix} ${base.label}` : base.label, stats);
}

function gearItem(base, rarity, name, stats) {
  return { uid: uid(), type: 'gear', rarity, name, base: base.id, baseName: base.label, kind: base.kind, group: base.group, implicit: { ...base.implicit }, stats, value: 0 };
}

/**
 * A skill book. With a `pool` (the reader's class tree), three books in four
 * are for spells that class can actually learn; the rest are for selling.
 */
export function makeBook(element, rng = Math.random, pool = null) {
  element ??= pool?.length && rng() < 0.75 ? pick(pool, rng) : pick(Object.keys(ELEMENT_NAMES), rng);
  return { uid: uid(), type: 'book', rarity: 'rare', name: bookTitle(element), element, value: 0 };
}

export function makePotion(kind = 'health') {
  return { uid: uid(), type: 'potion', rarity: 'common', name: POTIONS[kind].name, potion: kind, value: 0 };
}

export function makeGold(amount) {
  return { uid: uid(), type: 'gold', rarity: 'common', name: `${amount} Gold`, amount, value: amount };
}

/** What a merchant pays for it; buying costs four times as much. */
export function itemValue(item) {
  if (item.type === 'gold') return item.amount;
  if (item.type === 'potion') return Math.round(POTIONS[item.potion].price / 4);
  if (item.type === 'book') return 40;
  const statSum = Object.values(item.stats ?? {}).reduce((a, b) => a + Math.abs(b), 0);
  const baseSum = Object.values(item.implicit ?? {}).reduce((a, b) => a + Math.abs(b), 0);
  return Math.round((8 + statSum * 1.5 + baseSum * 0.5) * RARITIES[item.rarity].value);
}

export function describeItem(item) {
  const lines = [];
  if (item.type === 'weapon') {
    lines.push(`${RARITIES[item.rarity].label} ${item.baseName ?? ''}`.trim());
    for (const [key, value] of Object.entries(item.stats ?? {})) lines.push(statLabel(key, value));
  } else if (item.type === 'gear') {
    lines.push(`${RARITIES[item.rarity].label} ${gearTypeLabel(item)}`);
    for (const [key, value] of Object.entries(item.implicit ?? {})) lines.push(`  ${statLabel(key, value)}`);
    const affixes = Object.entries(item.stats ?? {});
    if (affixes.length) for (const [key, value] of affixes) lines.push(`★ ${statLabel(key, value)}`);
    const cls = gearClassOf(item.group);
    if (cls?.blurb) lines.push(cls.blurb);
  } else if (item.type === 'book') {
    lines.push(isPhysical(item.element) ? 'Skill manual' : 'Skill book');
    lines.push(`Teaches ${ELEMENT_NAMES[item.element]}, or raises it one rank (max ${SKILL_MAX_RANK}).`);
    lines.push(`Each rank after the first: +${SKILL_RANK.damage}% damage, −${SKILL_RANK.cooldown}% cooldown.`);
    lines.push('Only classes with this skill in their skill tree can read it.');
  } else if (item.type === 'potion') lines.push(POTIONS[item.potion].text);
  else if (item.type === 'gold') lines.push('Gold');
  return lines;
}

/** One stat in words: "+12 max health", "+3% Frost Lance damage"… */
export function statLabel(key, value) {
  return STATS[key]?.label(value) ?? `${value > 0 ? '+' : ''}${value}% ${ELEMENT_NAMES[key] ?? key}`;
}

/** What a worn piece adds, in words (with the wearer's proficiency). */
export function describePiece(item, favored) {
  return Object.entries(pieceStats(item, favored)).map(([k, v]) => statLabel(k, v));
}

export function itemColor(item) {
  if (item.type === 'potion') return POTIONS[item.potion].color;
  if (item.type === 'gold') return '#ffd24a';
  return RARITIES[item.rarity]?.color ?? '#ffffff';
}

/* ---------------------------------------------------------------------- */
/* Loot tables                                                             */
/* ---------------------------------------------------------------------- */

/** Per monster kind: chance of any drop, how many rolls, how lucky. */
const TABLES = {
  grunt: { chance: 0.38, rolls: [1, 1], boost: 0, gold: [3, 9] },
  wisp: { chance: 0.45, rolls: [1, 1], boost: 0.2, gold: [5, 12] },
  brute: { chance: 0.75, rolls: [1, 2], boost: 0.5, gold: [12, 30] },
  golem: { chance: 1, rolls: [2, 3], boost: 1.2, gold: [40, 80], guarantee: 'rare', book: 0.5 },
  dragon: { chance: 1, rolls: [4, 5], boost: 2.5, gold: [150, 300], guarantee: 'epic', book: 2 }
};

/**
 * @param {string} kind monster kind
 * @param {{ wave?: number, goldFind?: number, rng?: () => number, bookPool?: string[] }} [options]
 *   `bookPool`: the spells in the player's class tree, so books mostly fit.
 * @returns {object[]} items to drop
 */
export function rollLoot(kind, { wave = 1, goldFind = 0, rng = Math.random, bookPool = null } = {}) {
  const table = TABLES[kind] ?? TABLES.grunt;
  if (rng() > table.chance) return [];
  const drops = [];
  const rolls = between(table.rolls, rng);
  const boost = table.boost + Math.min(1, (wave - 1) * 0.06);
  for (let i = 0; i < rolls; i++) {
    const r = rng();
    if (r < 0.42) drops.push(makeGold(Math.max(1, Math.round(between(table.gold, rng) * (1 + wave * 0.08) * (1 + goldFind / 100)))));
    else if (r < 0.58) drops.push(makePotion(rng() < 0.7 ? 'health' : 'focus'));
    else if (r < 0.72) drops.push(makeWeapon(rollRarity(rng, boost), rng));
    else if (r < 0.91) drops.push(makeGear(rollRarity(rng, boost), rng));
    else drops.push(makeBook(null, rng, bookPool)); // books: about one roll in eleven
  }
  if (table.guarantee) {
    const floor = RARITY_ORDER.indexOf(table.guarantee);
    let rarity = rollRarity(rng, boost);
    if (RARITY_ORDER.indexOf(rarity) < floor) rarity = table.guarantee;
    drops.push(rng() < 0.5 ? makeWeapon(rarity, rng) : makeGear(rarity, rng));
  }
  // `book`: a whole number is that many books, a fraction is a chance of one.
  for (let n = table.book ?? 0; n > 0; n--) if (n >= 1 || rng() < n) drops.push(makeBook(null, rng, bookPool));
  return drops;
}

/** A merchant's shelf: potions always, plus weapons, gear and two books. */
export function merchantStock(rng = Math.random, wave = 1, bookPool = null) {
  const stock = [makePotion('health'), makePotion('focus')];
  for (let i = 0; i < 3; i++) stock.push(makeWeapon(rollRarity(rng, 0.4 + wave * 0.05), rng));
  for (let i = 0; i < 4; i++) stock.push(makeGear(rollRarity(rng, 0.4 + wave * 0.05), rng));
  stock.push(makeBook(null, rng, bookPool), makeBook(null, rng, bookPool));
  return stock;
}

export function buyPrice(item) {
  if (item.type === 'potion') return POTIONS[item.potion].price;
  if (item.type === 'book') return 150;
  return itemValue(item) * 4;
}
