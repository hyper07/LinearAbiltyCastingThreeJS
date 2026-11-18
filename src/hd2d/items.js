/**
 * Lanternwood — items: what there is (bases), how good it is (rarity, item
 * level, affixes), what monsters and chests drop, the bag (stacks, a size
 * limit), equipment slots, stat totals, comparisons, buying and selling, and
 * how a set of equipment looks on the hero (gearLook → the rig's parts).
 * Pure: no three.js, no DOM.
 */
import { CLASSES } from './classes.js';

export const BAG_SIZE = 40;
export const STACK_MAX = 20;

export const SLOTS = ['weapon', 'offhand', 'head', 'chest', 'hands', 'feet', 'ring', 'amulet'];
export const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off hand', head: 'Head', chest: 'Chest', hands: 'Hands', feet: 'Feet', ring: 'Ring', amulet: 'Amulet' };

export const RARITIES = {
  common: { name: 'Common', color: '#d8d2c4', mult: 1, affixes: 0, glow: null, value: 1 },
  uncommon: { name: 'Uncommon', color: '#62d65a', mult: 1.15, affixes: 1, glow: null, value: 2 },
  rare: { name: 'Rare', color: '#4aa0ff', mult: 1.35, affixes: 2, glow: '#6ab8ff', value: 4 },
  epic: { name: 'Epic', color: '#b866ff', mult: 1.6, affixes: 3, glow: '#c88aff', value: 8 },
  legendary: { name: 'Legendary', color: '#ff9a2a', mult: 2.0, affixes: 4, glow: '#ffb04a', value: 16 }
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Stats an item can carry, with how they read. */
export const STAT_NAMES = { atk: 'Attack', def: 'Defence', hp: 'Health', mp: 'Mana', crit: 'Critical %', speed: 'Speed %', spell: 'Spell power %', block: 'Block %', leech: 'Life steal %' };

/**
 * Item bases. `stats` at item level 1 (they grow with the level), `cls` the
 * classes that can use it, `weight` for armour, `wtype` the weapon type (its
 * combo and its shape on the rig), `shape` for shields and hats, `colors` the
 * colours it comes in.
 */
export const BASES = {
  // weapons
  shortsword: { slot: 'weapon', name: 'Short sword', wtype: 'shortsword', stats: { atk: 6 }, cls: ['blade', 'warden'], colors: ['#d8e2ea', '#c8a070', '#b8c8d8'] },
  longsword: { slot: 'weapon', name: 'Longsword', wtype: 'longsword', twoHanded: true, stats: { atk: 10 }, cls: ['blade'], colors: ['#dfe8f0', '#a8b8d0'] },
  dagger: { slot: 'weapon', name: 'Dagger', wtype: 'dagger', stats: { atk: 4, crit: 4 }, cls: ['blade', 'ranger', 'seer'], colors: ['#d0d8e0', '#8a9aaa'] },
  axe: { slot: 'weapon', name: 'Hand axe', wtype: 'axe', stats: { atk: 8 }, cls: ['blade', 'warden'], colors: ['#c8d0d8', '#a89070'] },
  mace: { slot: 'weapon', name: 'Mace', wtype: 'mace', shape: 'mace', stats: { atk: 7, def: 1 }, cls: ['warden'], colors: ['#b8c0c8', '#9a8a6a'] },
  hammer: { slot: 'weapon', name: 'War hammer', wtype: 'mace', shape: 'hammer', stats: { atk: 9 }, cls: ['warden'], colors: ['#a8b0b8', '#8a7a6a'] },
  spear: { slot: 'weapon', name: 'Spear', wtype: 'spear', stats: { atk: 8 }, cls: ['blade', 'warden'], colors: ['#d0d8e0', '#c0a878'] },
  staff: { slot: 'weapon', name: 'Staff', wtype: 'staff', stats: { atk: 5, spell: 10, mp: 8 }, cls: ['seer'], colors: ['#7a5a3a', '#5a4a6a', '#8a7a5a'] },
  bow: { slot: 'weapon', name: 'Bow', wtype: 'bow', stats: { atk: 7 }, cls: ['ranger'], colors: ['#8a5a32', '#6a4a2a', '#a07040'] },
  // off hands
  buckler: { slot: 'offhand', name: 'Buckler', kind: 'shield', shape: 'buckler', stats: { def: 3, block: 8 }, cls: ['blade', 'warden'], colors: ['#8a5a32', '#7a3a2a', '#4a5a7a'] },
  kite: { slot: 'offhand', name: 'Kite shield', kind: 'shield', shape: 'kite', stats: { def: 5, block: 12 }, cls: ['warden'], colors: ['#2a5a9a', '#9a2a2a', '#3a7a4a', '#e0d8c8'] },
  tower: { slot: 'offhand', name: 'Tower shield', kind: 'shield', shape: 'tower', stats: { def: 9, block: 16, speed: -4 }, cls: ['warden'], colors: ['#5a6a7a', '#6a4a2a', '#2a4a6a'] },
  tome: { slot: 'offhand', name: 'Tome', kind: 'tome', shape: 'tome', stats: { mp: 14, spell: 8 }, cls: ['seer'], colors: ['#6a2a4a', '#2a3a6a', '#2a5a4a'] },
  quiver: { slot: 'offhand', name: 'Quiver', kind: 'quiver', shape: 'quiver', stats: { crit: 4, atk: 2 }, cls: ['ranger'], colors: ['#7a4a2a', '#5a3a2a'] },
  // heads
  hood: { slot: 'head', name: 'Hood', shape: 'hood', weight: 'light', hidesHair: true, stats: { def: 1, crit: 2 }, cls: ['blade', 'seer', 'ranger', 'warden'], colors: ['#3a4a3a', '#4a3a5a', '#6a2a2a', '#5a4a3a'] },
  cap: { slot: 'head', name: 'Feathered cap', shape: 'cap', weight: 'light', stats: { def: 1, speed: 3 }, cls: ['ranger', 'blade'], colors: ['#3a6a3a', '#8a3a2a', '#3a4a8a'] },
  wizard: { slot: 'head', name: 'Wizard hat', shape: 'wizard', weight: 'light', stats: { mp: 8, spell: 5 }, cls: ['seer'], colors: ['#3a4a9a', '#5a2a7a', '#2a6a7a', '#7a2a3a'] },
  circlet: { slot: 'head', name: 'Circlet', shape: 'circlet', weight: 'light', stats: { mp: 6, spell: 6 }, cls: ['seer', 'ranger'], colors: ['#f0c040', '#d8e0e8'] },
  openhelm: { slot: 'head', name: 'Open helm', shape: 'open', weight: 'medium', stats: { def: 3 }, cls: ['blade', 'warden', 'ranger'], colors: ['#a8b4c0', '#c0a060'] },
  hornhelm: { slot: 'head', name: 'Horned helm', shape: 'horned', weight: 'heavy', stats: { def: 4, atk: 1 }, cls: ['warden', 'blade'], colors: ['#8a929a', '#7a6a5a'] },
  greathelm: { slot: 'head', name: 'Great helm', shape: 'full', weight: 'heavy', hidesHair: true, stats: { def: 6 }, cls: ['warden'], colors: ['#b8c0c8', '#c8a860'] },
  // chests
  tunic: { slot: 'chest', name: 'Tunic', weight: 'light', stats: { def: 2, hp: 6 }, cls: ['blade', 'warden', 'seer', 'ranger'], colors: ['#8a6a3a', '#5a6a7a', '#7a3a3a'] },
  robe: { slot: 'chest', name: 'Robe', weight: 'light', robe: true, stats: { def: 1, mp: 12, spell: 6 }, cls: ['seer'], colors: ['#3c5aa8', '#5a3a8a', '#2a6a7a', '#8a2a3a'] },
  jerkin: { slot: 'chest', name: 'Leather jerkin', weight: 'light', cape: true, stats: { def: 3, crit: 2 }, cls: ['blade', 'ranger'], colors: ['#7a4a2a', '#5a3a24', '#6a5a3a'] },
  mail: { slot: 'chest', name: 'Chainmail', weight: 'medium', cape: true, stats: { def: 5, hp: 10 }, cls: ['blade', 'warden', 'ranger'], colors: ['#8a96a4', '#9aa0a8'] },
  plate: { slot: 'chest', name: 'Plate armour', weight: 'heavy', pauldrons: true, cape: true, stats: { def: 9, hp: 16, speed: -3 }, cls: ['warden'], colors: ['#b8c2cc', '#c8a860', '#6a7280'] },
  // hands, feet
  gloves: { slot: 'hands', name: 'Gloves', weight: 'light', stats: { def: 1, crit: 2 }, cls: ['blade', 'warden', 'seer', 'ranger'], colors: ['#6a4a2a', '#3a3a4a', '#7a2a2a'] },
  gauntlets: { slot: 'hands', name: 'Gauntlets', weight: 'heavy', stats: { def: 3, atk: 1 }, cls: ['warden', 'blade'], colors: ['#a8b0b8', '#8a7a5a'] },
  boots: { slot: 'feet', name: 'Boots', weight: 'light', stats: { def: 1, speed: 4 }, cls: ['blade', 'warden', 'seer', 'ranger'], colors: ['#5a3a24', '#3a2a24', '#4a4a3a'] },
  greaves: { slot: 'feet', name: 'Greaves', weight: 'heavy', stats: { def: 3, hp: 4 }, cls: ['warden', 'blade'], colors: ['#a0a8b0', '#7a6a5a'] },
  // jewellery
  ring: { slot: 'ring', name: 'Ring', stats: { crit: 3 }, cls: ['blade', 'warden', 'seer', 'ranger'], colors: ['#f0c040', '#d8e0e8', '#e08a5a'] },
  amulet: { slot: 'amulet', name: 'Amulet', stats: { hp: 10, mp: 6 }, cls: ['blade', 'warden', 'seer', 'ranger'], colors: ['#f0c040', '#7ad8ff', '#ff7a8a'] }
};

/** Affixes: a prefix or a suffix to the name, and the stats they add (at item level 1). */
export const AFFIXES = {
  mighty: { name: 'Mighty', pre: true, stats: { atk: 3 }, slots: ['weapon', 'hands', 'ring', 'amulet'] },
  keen: { name: 'Keen', pre: true, stats: { crit: 4 }, slots: ['weapon', 'hands', 'ring', 'head'] },
  sturdy: { name: 'Sturdy', pre: true, stats: { def: 3 }, slots: ['offhand', 'head', 'chest', 'hands', 'feet'] },
  swift: { name: 'Swift', pre: true, stats: { speed: 5 }, slots: ['feet', 'chest', 'ring', 'amulet'] },
  arcane: { name: 'Arcane', pre: true, stats: { spell: 8, mp: 6 }, slots: ['weapon', 'offhand', 'head', 'ring', 'amulet', 'chest'] },
  vital: { name: 'Vital', pre: true, stats: { hp: 14 }, slots: ['chest', 'head', 'amulet', 'offhand', 'feet'] },
  bear: { name: 'of the Bear', stats: { hp: 18, def: 1 }, slots: ['chest', 'head', 'offhand', 'amulet', 'feet'] },
  fox: { name: 'of the Fox', stats: { crit: 3, speed: 3 }, slots: ['weapon', 'hands', 'feet', 'ring'] },
  embers: { name: 'of Embers', stats: { atk: 2, spell: 6 }, slots: ['weapon', 'ring', 'amulet', 'offhand'] },
  owl: { name: 'of the Owl', stats: { mp: 12 }, slots: ['head', 'amulet', 'ring', 'offhand', 'chest'] },
  warding: { name: 'of Warding', stats: { def: 2, block: 5 }, slots: ['offhand', 'chest', 'head'] },
  leech: { name: 'of the Leech', stats: { leech: 3 }, slots: ['weapon', 'ring', 'amulet'] }
};

const LEGEND_NAMES = {
  weapon: ['Dawnbreaker', 'Hearthfang', 'Whisper of Greyvault', 'The Last Lantern'],
  offhand: ['Bulwark of Odile', 'The Moonward', 'Emberheart Aegis'],
  head: ['Crown of Cinders', 'Frostwatch Visor', 'Lanternkeeper’s Hood'],
  chest: ['Mantle of the Hearth', 'Rimeforged Plate', 'Starlit Raiment'],
  hands: ['Grips of the Smith', 'Glowmoss Gloves'],
  feet: ['Wayfarer’s Stride', 'Ashwalkers'],
  ring: ['Ring of a Thousand Wicks', 'Band of the Howl'],
  amulet: ['Heart of the Hearthlight', 'Tear of the Rime Matron']
};

/* ---------------------------------------------------------- consumables */

/** Stackable things in the bag. Potions have NO cooldown: every use drinks one. */
export const CONSUMABLES = {
  hp: { name: 'Health potion', icon: 'potion', color: '#ff5a6a', price: 12, desc: 'Restores about half your health at once.' },
  mp: { name: 'Mana potion', icon: 'potion', color: '#5a8aff', price: 10, desc: 'Restores most of your mana (or energy) at once.' },
  bread: { name: 'Hearth bread', icon: 'bread', color: '#d8a050', price: 6, desc: 'Restores 40 % health over 8 seconds.' },
  stew: { name: 'Hunter’s stew', icon: 'stew', color: '#b0603a', price: 15, desc: 'Restores 80 % health over 10 seconds.' },
  'scroll-return': { name: 'Scroll of return', icon: 'scroll', color: '#e8d8a8', price: 20, desc: 'Takes you back to this realm’s waystone.' },
  'scroll-fury': { name: 'Scroll of fury', icon: 'scroll', color: '#ff7a3a', price: 25, desc: '+30 % attack for 30 seconds.' },
  'scroll-ward': { name: 'Scroll of warding', icon: 'scroll', color: '#7ad8ff', price: 25, desc: '+40 % defence for 30 seconds.' }
};

/* ------------------------------------------------------------- making */

let uidCounter = 1;
/** A fresh item id (unique within a save; the save keeps the counter going). */
export const newUid = () => `i${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
export const setUidCounter = (n) => (uidCounter = Math.max(uidCounter, n | 0));

const scale = (ilvl) => 1 + (Math.max(1, ilvl) - 1) * 0.14;

/**
 * An item: its base, rarity and level decide its stats; affixes add more.
 * `rand` a 0…1 stream (seeded in tests).
 */
export function makeItem(baseId, rarity = 'common', ilvl = 1, rand = Math.random) {
  const base = BASES[baseId];
  if (!base) return null;
  const r = RARITIES[rarity] ? rarity : 'common';
  const R = RARITIES[r];
  const k = scale(ilvl) * R.mult;
  const stats = {};
  for (const [s, v] of Object.entries(base.stats)) stats[s] = v < 0 ? v : Math.max(1, Math.round(v * k * (0.9 + rand() * 0.2)));
  const pool = Object.entries(AFFIXES).filter(([, a]) => a.slots.includes(base.slot));
  const affixes = [];
  for (let i = 0; i < R.affixes && pool.length; i++) {
    const [id, a] = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    affixes.push(id);
    for (const [s, v] of Object.entries(a.stats)) stats[s] = (stats[s] ?? 0) + Math.max(1, Math.round(v * scale(ilvl) * (0.85 + rand() * 0.3)));
  }
  const pre = affixes.find((a) => AFFIXES[a].pre);
  const suf = affixes.find((a) => !AFFIXES[a].pre);
  let name = [pre && AFFIXES[pre].name, base.name, suf && AFFIXES[suf].name].filter(Boolean).join(' ');
  if (r === 'legendary') {
    const names = LEGEND_NAMES[base.slot];
    name = names[Math.floor(rand() * names.length)];
  }
  const color = base.colors[Math.floor(rand() * base.colors.length)];
  return { uid: newUid(), base: baseId, rarity: r, ilvl: Math.max(1, ilvl | 0), name, color, stats, affixes };
}

/** What an item sells for (a vendor buys it for this); a vendor asks four times as much. */
export const sellPrice = (item) => (item?.base ? Math.max(1, Math.round((3 + item.ilvl * 2) * RARITIES[item.rarity].value)) : Math.max(1, Math.round((CONSUMABLES[item?.kind]?.price ?? 4) / 3)));
export const buyPrice = (item) => (item?.base ? sellPrice(item) * 4 : CONSUMABLES[item?.kind]?.price ?? 10);

/* --------------------------------------------------------------- loot */

/** Rarity weights by the tier of what dropped it: better tiers, better odds. */
export const RARITY_WEIGHTS = {
  normal: { common: 64, uncommon: 28, rare: 7, epic: 1, legendary: 0 },
  elite: { common: 10, uncommon: 36, rare: 36, epic: 15, legendary: 3 },
  chest: { common: 22, uncommon: 44, rare: 26, epic: 7, legendary: 1 },
  boss: { common: 0, uncommon: 0, rare: 44, epic: 42, legendary: 14 }
};
/** How many items a kill drops: the chance of one (normal), or a fixed count. */
export const DROP_COUNT = { normal: 0.16, elite: 2, chest: 2, boss: 3 };

/** Pick a rarity by weight. */
export function rollRarity(tier = 'normal', rand = Math.random) {
  const w = RARITY_WEIGHTS[tier] ?? RARITY_WEIGHTS.normal;
  const total = RARITY_ORDER.reduce((a, r) => a + w[r], 0);
  let x = rand() * total;
  for (const r of RARITY_ORDER) {
    if ((x -= w[r]) < 0) return r;
  }
  return 'common';
}

/**
 * What drops: { items, consumables }. `level` the item level, `tier` normal /
 * elite / chest / boss, `cls` the hero's class — two drops in three are things
 * the hero can use.
 */
export function rollLoot({ level = 1, tier = 'normal', cls = 'blade' } = {}, rand = Math.random) {
  const n = DROP_COUNT[tier] ?? 0;
  const count = n < 1 ? (rand() < n ? 1 : 0) : n;
  const items = [];
  const usable = Object.keys(BASES).filter((b) => BASES[b].cls.includes(cls));
  const all = Object.keys(BASES);
  for (let i = 0; i < count; i++) {
    const pool = rand() < 0.67 ? usable : all;
    const base = pool[Math.floor(rand() * pool.length)];
    items.push(makeItem(base, rollRarity(tier, rand), level + (tier === 'boss' ? 2 : tier === 'elite' ? 1 : 0), rand));
  }
  const consumables = [];
  const c = tier === 'normal' ? 0.1 : 0.7;
  if (rand() < c) consumables.push({ kind: rand() < 0.55 ? 'hp' : 'mp', n: 1 });
  if (rand() < c * 0.4) consumables.push({ kind: ['bread', 'stew', 'scroll-fury', 'scroll-ward', 'scroll-return'][Math.floor(rand() * 5)], n: 1 });
  return { items, consumables };
}

/* ---------------------------------------------------------------- bag */

/** The bag: an array of entries, each an item ({ uid, base, … }) or a stack ({ kind, n }). */
export const bagFull = (bag) => bag.length >= BAG_SIZE;

/**
 * Put something in the bag. Stacks fill up (to STACK_MAX) before a new stack
 * starts; a full bag takes nothing more. Returns { ok, added, reason }.
 */
export function addToBag(bag, entry) {
  if (!entry) return { ok: false, added: 0, reason: 'nothing' };
  if (entry.base) {
    if (bagFull(bag)) return { ok: false, added: 0, reason: 'Your bag is full.' };
    bag.push(entry);
    return { ok: true, added: 1 };
  }
  if (!CONSUMABLES[entry.kind]) return { ok: false, added: 0, reason: 'unknown' };
  let left = Math.max(0, entry.n | 0);
  for (const s of bag) {
    if (!left) break;
    if (s.kind !== entry.kind || s.n >= STACK_MAX) continue;
    const take = Math.min(left, STACK_MAX - s.n);
    s.n += take;
    left -= take;
  }
  while (left > 0 && !bagFull(bag)) {
    const take = Math.min(left, STACK_MAX);
    bag.push({ kind: entry.kind, n: take });
    left -= take;
  }
  const added = (entry.n | 0) - left;
  return left ? { ok: added > 0, added, reason: 'Your bag is full.' } : { ok: true, added };
}

/** How many of a consumable are in the bag. */
export const countOf = (bag, kind) => bag.reduce((a, s) => a + (s.kind === kind ? s.n : 0), 0);

/** Take n of a consumable out (from the last stack first). Returns how many were taken. */
export function takeFromBag(bag, kind, n = 1) {
  let left = n;
  for (let i = bag.length - 1; i >= 0 && left > 0; i--) {
    const s = bag[i];
    if (s.kind !== kind) continue;
    const take = Math.min(left, s.n);
    s.n -= take;
    left -= take;
    if (s.n <= 0) bag.splice(i, 1);
  }
  return n - left;
}

/* ----------------------------------------------------------- equipment */

export const emptyEquip = () => Object.fromEntries(SLOTS.map((s) => [s, null]));

/** Can this class wear or wield this item? */
export function canUse(item, cls) {
  const base = BASES[item?.base];
  if (!base) return false;
  if (!base.cls.includes(cls)) return false;
  const c = CLASSES[cls];
  if (base.weight && !c.armour.includes(base.weight)) return false;
  return true;
}

/** Every stat from what is worn, added up. */
export function gearTotals(equip) {
  const t = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0, speed: 0, spell: 0, block: 0, leech: 0 };
  for (const s of SLOTS) {
    const it = equip?.[s];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats ?? {})) t[k] = (t[k] ?? 0) + v;
  }
  return t;
}

/** The change if `item` replaced what is worn in its slot: { stat: delta } (only non-zero). */
export function compareItem(item, equip) {
  const base = BASES[item?.base];
  if (!base) return {};
  const worn = equip?.[base.slot];
  const keys = new Set([...Object.keys(item.stats), ...Object.keys(worn?.stats ?? {})]);
  const out = {};
  for (const k of keys) {
    const d = (item.stats[k] ?? 0) - (worn?.stats?.[k] ?? 0);
    if (d) out[k] = d;
  }
  // A two-handed weapon also takes the off hand off.
  if (base.twoHanded && equip?.offhand) for (const [k, v] of Object.entries(equip.offhand.stats)) out[k] = (out[k] ?? 0) - v;
  return out;
}

/**
 * Wear the item at bag index `i`: what was in the slot goes back to the bag
 * (and the off hand too, for a two-handed weapon). Returns { ok, reason }.
 */
export function equipFromBag(hero, i) {
  const item = hero.bag[i];
  const base = BASES[item?.base];
  if (!base) return { ok: false, reason: 'That cannot be worn.' };
  if (!canUse(item, hero.cls)) return { ok: false, reason: 'Your class cannot use that.' };
  const slot = base.slot;
  const out = [];
  if (hero.equip[slot]) out.push(hero.equip[slot]);
  if (base.twoHanded && hero.equip.offhand) out.push(hero.equip.offhand);
  if (slot === 'offhand' && BASES[hero.equip.weapon?.base]?.twoHanded) out.push(hero.equip.weapon);
  if (hero.bag.length - 1 + out.length > BAG_SIZE) return { ok: false, reason: 'Your bag is full.' };
  hero.bag.splice(i, 1);
  for (const o of out) {
    for (const s of SLOTS) if (hero.equip[s] === o) hero.equip[s] = null;
    hero.bag.push(o);
  }
  hero.equip[slot] = item;
  return { ok: true, slot };
}

/** Take off what is in a slot, into the bag. */
export function unequip(hero, slot) {
  const it = hero.equip[slot];
  if (!it) return { ok: false, reason: 'Nothing there.' };
  if (bagFull(hero.bag)) return { ok: false, reason: 'Your bag is full.' };
  hero.equip[slot] = null;
  hero.bag.push(it);
  return { ok: true };
}

/** Sell the bag entry at i (a whole stack at once). Returns the gold. */
export function sellFromBag(hero, i) {
  const e = hero.bag[i];
  if (!e) return 0;
  const gold = e.base ? sellPrice(e) : sellPrice(e) * e.n;
  hero.bag.splice(i, 1);
  hero.gold += gold;
  return gold;
}

/** Buy an entry from a vendor's stock (an item, or one of a consumable). */
export function buyEntry(hero, entry) {
  const price = buyPrice(entry);
  if (hero.gold < price) return { ok: false, reason: 'Not enough gold.' };
  const add = entry.base ? { ...entry, uid: newUid() } : { kind: entry.kind, n: 1 };
  const r = addToBag(hero.bag, add);
  if (!r.ok) return r;
  hero.gold -= price;
  return { ok: true, price };
}

/**
 * A vendor's gear for sale: a few items for the hero's class, regenerated
 * each time the stock refreshes (seeded, so it is the same within a visit).
 */
export function vendorStock({ level = 1, cls = 'blade', smith = false, count = 6 }, rand = Math.random) {
  const usable = Object.keys(BASES).filter((b) => BASES[b].cls.includes(cls) && (!smith || ['weapon', 'offhand', 'head', 'chest', 'hands', 'feet'].includes(BASES[b].slot)));
  const out = [];
  for (let i = 0; i < count; i++) {
    const base = usable[Math.floor(rand() * usable.length)];
    out.push(makeItem(base, rand() < 0.3 ? 'rare' : rand() < 0.6 ? 'uncommon' : 'common', level, rand));
  }
  return out;
}

/* --------------------------------------------------------------- looks */

/** Where each piece of gear hangs on the rig (rig.js joint names). */
export const ATTACH = {
  weapon: 'armNeg', // the right hand (the figure faces +Z; −X is its right)
  bow: 'armPos', // a bow is held in the left hand, drawn with the right
  shield: 'armPos',
  tome: 'armPos',
  quiver: 'torso',
  head: 'head',
  pauldronR: 'armNeg',
  pauldronL: 'armPos',
  cape: 'torso'
};

const glowOf = (item) => RARITIES[item?.rarity]?.glow ?? null;

/**
 * How a set of equipment looks on the hero: what is drawn on the rig, in
 * what shape and colour, with a glint for rare and better, plus the colours
 * the figure's own drawing takes (chest, gloves, boots, a hood over the hair).
 * `parts` lists each attachment as "name@joint" — the tests read it.
 */
export function gearLook(equip = {}) {
  const look = { weapon: null, offhand: null, head: null, chest: null, cape: null, hands: null, feet: null, parts: [] };
  const add = (name, joint) => look.parts.push(`${name}@${joint}`);
  const w = equip.weapon;
  if (w && BASES[w.base]) {
    const b = BASES[w.base];
    look.weapon = { type: b.wtype, shape: b.shape ?? b.wtype, color: w.color, rarity: w.rarity, glow: glowOf(w), twoHanded: Boolean(b.twoHanded) };
    add(`weapon:${b.shape ?? b.wtype}`, b.wtype === 'bow' ? ATTACH.bow : ATTACH.weapon);
  }
  const o = equip.offhand;
  if (o && BASES[o.base]) {
    const b = BASES[o.base];
    look.offhand = { kind: b.kind, shape: b.shape, color: o.color, rarity: o.rarity, glow: glowOf(o) };
    add(`${b.kind}:${b.shape}`, ATTACH[b.kind]);
  }
  const h = equip.head;
  if (h && BASES[h.base]) {
    const b = BASES[h.base];
    look.head = { shape: b.shape, color: h.color, rarity: h.rarity, glow: glowOf(h), hidesHair: Boolean(b.hidesHair) };
    add(`head:${b.shape}`, ATTACH.head);
  }
  const c = equip.chest;
  if (c && BASES[c.base]) {
    const b = BASES[c.base];
    look.chest = { color: c.color, weight: b.weight, robe: Boolean(b.robe), rarity: c.rarity, glow: glowOf(c) };
    if (b.pauldrons) {
      add('pauldron', ATTACH.pauldronR);
      add('pauldron', ATTACH.pauldronL);
    }
    if (b.cape) {
      // The cape is the armour's colour; rare and better get a hem in the rarity's colour.
      look.cape = { color: c.color, hem: RARITIES[c.rarity].glow ? RARITIES[c.rarity].color : null, glow: glowOf(c) };
      add('cape', ATTACH.cape);
    }
  }
  if (equip.hands && BASES[equip.hands.base]) look.hands = equip.hands.color;
  if (equip.feet && BASES[equip.feet.base]) look.feet = equip.feet.color;
  return look;
}

/** A compact version of a look for the network (other players draw your gear from it). */
export function lookKey(look) {
  return JSON.stringify([look.weapon && [look.weapon.shape, look.weapon.color, look.weapon.rarity], look.offhand && [look.offhand.shape, look.offhand.color, look.offhand.rarity], look.head && [look.head.shape, look.head.color, look.head.rarity], look.chest && [look.chest.color, look.chest.weight, look.chest.rarity], look.hands, look.feet]);
}
