/**
 * Gloamreach's items, as pure rules (no three.js, no DOM): what there is
 * (bases), how good each one is (rarity, item level, affixes, the level it
 * needs), what drops, the bag (a grid of slots, stacks of potions), the ten
 * equipment slots and who may wear what, comparisons, the merchant's trade,
 * and how an item looks (metal, cloth, gem, glow) for gear.js to model.
 *
 *   const it = makeItem('longsword', 'rare', 6, rand);
 *   equipFromBag(profile, 3)          // { ok } or { ok: false, reason }
 *   rollLoot({ tier: 'elite', level: 5, cls: 'knight', family: 'beast' }, rand)
 */

export const BAG_SIZE = 36;
export const BAG_COLS = 6;
export const STACK_MAX = 20;

export const SLOTS = ['head', 'chest', 'hands', 'legs', 'feet', 'cape', 'mainhand', 'offhand', 'trinket1', 'trinket2'];
export const SLOT_NAMES = { head: 'Head', chest: 'Chest', hands: 'Hands', legs: 'Legs', feet: 'Feet', cape: 'Cape', mainhand: 'Main hand', offhand: 'Off-hand', trinket1: 'Trinket', trinket2: 'Trinket' };

export const RARITIES = {
  common: { name: 'Common', color: '#d6d0c2', mult: 1, affixes: 0, value: 1 },
  uncommon: { name: 'Uncommon', color: '#6ed35e', mult: 1.18, affixes: 1, value: 2 },
  rare: { name: 'Rare', color: '#4f9dff', mult: 1.4, affixes: 2, value: 4 },
  epic: { name: 'Epic', color: '#b86bff', mult: 1.65, affixes: 3, value: 9 },
  legendary: { name: 'Legendary', color: '#ff9b2e', mult: 2.0, affixes: 4, value: 20 }
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const STAT_NAMES = { atk: 'Attack', spell: 'Spell power', armour: 'Armour', hp: 'Health', mp: 'Mana / energy', crit: 'Critical strike %', critdmg: 'Critical damage %', speed: 'Move speed %', block: 'Block %', leech: 'Life steal %', regen: 'Health regen /s' };

/** Who wears what weight of armour. */
export const CLASS_ARMOUR = { knight: ['heavy', 'medium', 'light'], ranger: ['medium', 'light'], mage: ['light'] };

/**
 * Item bases. `stats` at item level 1 (they grow with level and rarity);
 * `cls` who can use it; `hands` 2 for two-handed weapons; `weight` for armour;
 * `look` the model gear.js builds; `hidesHair` for helmets and hoods.
 */
export const BASES = {
  // weapons
  shortsword: { slot: 'mainhand', kind: 'weapon', wtype: 'sword', hands: 1, name: 'Arming sword', look: 'shortsword', stats: { atk: 8 }, cls: ['knight', 'ranger'] },
  longsword: { slot: 'mainhand', kind: 'weapon', wtype: 'sword', hands: 1, name: 'Longsword', look: 'longsword', stats: { atk: 11 }, cls: ['knight'] },
  greatsword: { slot: 'mainhand', kind: 'weapon', wtype: 'great', hands: 2, name: 'Greatsword', look: 'greatsword', stats: { atk: 18, crit: 2 }, cls: ['knight'] },
  axe: { slot: 'mainhand', kind: 'weapon', wtype: 'axe', hands: 1, name: 'Bearded axe', look: 'axe', stats: { atk: 10, crit: 3 }, cls: ['knight', 'ranger'] },
  mace: { slot: 'mainhand', kind: 'weapon', wtype: 'mace', hands: 1, name: 'Flanged mace', look: 'mace', stats: { atk: 10, armour: 3 }, cls: ['knight'] },
  dagger: { slot: 'mainhand', kind: 'weapon', wtype: 'dagger', hands: 1, name: 'Rondel dagger', look: 'dagger', stats: { atk: 6, crit: 7 }, cls: ['knight', 'ranger', 'mage'] },
  spear: { slot: 'mainhand', kind: 'weapon', wtype: 'spear', hands: 2, name: 'Winged spear', look: 'spear', stats: { atk: 15 }, cls: ['knight', 'ranger'] },
  bow: { slot: 'mainhand', kind: 'weapon', wtype: 'bow', hands: 2, name: 'Recurve bow', look: 'bow', stats: { atk: 10 }, cls: ['ranger'] },
  longbow: { slot: 'mainhand', kind: 'weapon', wtype: 'bow', hands: 2, name: 'Yew longbow', look: 'longbow', stats: { atk: 13, crit: 2 }, cls: ['ranger'] },
  staff: { slot: 'mainhand', kind: 'weapon', wtype: 'staff', hands: 2, name: 'Rootwood staff', look: 'staff', stats: { atk: 5, spell: 16, mp: 12 }, cls: ['mage'] },
  wand: { slot: 'mainhand', kind: 'weapon', wtype: 'wand', hands: 1, name: 'Crystal wand', look: 'wand', stats: { atk: 3, spell: 10 }, cls: ['mage'] },
  // off-hands
  buckler: { slot: 'offhand', kind: 'shield', name: 'Round buckler', look: 'buckler', stats: { armour: 4, block: 10 }, cls: ['knight', 'ranger'] },
  heater: { slot: 'offhand', kind: 'shield', name: 'Heater shield', look: 'heater', stats: { armour: 6, block: 13 }, cls: ['knight'] },
  kite: { slot: 'offhand', kind: 'shield', name: 'Kite shield', look: 'kite', stats: { armour: 8, block: 15, speed: -3 }, cls: ['knight'] },
  tome: { slot: 'offhand', kind: 'focus', name: 'Grimoire', look: 'tome', stats: { spell: 8, mp: 14 }, cls: ['mage'] },
  orb: { slot: 'offhand', kind: 'focus', name: 'Seeing orb', look: 'orb', stats: { spell: 10, crit: 3 }, cls: ['mage'] },
  quiver: { slot: 'offhand', kind: 'quiver', name: 'Quiver', look: 'quiver', stats: { atk: 3, crit: 4 }, cls: ['ranger'] },
  // heads
  greathelm: { slot: 'head', kind: 'armour', weight: 'heavy', name: 'Great helm', look: 'greathelm', hidesHair: true, stats: { armour: 10 }, cls: ['knight'] },
  bascinet: { slot: 'head', kind: 'armour', weight: 'heavy', name: 'Visored bascinet', look: 'bascinet', hidesHair: true, stats: { armour: 9, crit: 1 }, cls: ['knight'] },
  nasal: { slot: 'head', kind: 'armour', weight: 'medium', name: 'Nasal helm', look: 'nasal', hidesHair: true, stats: { armour: 6 }, cls: ['knight', 'ranger'] },
  hood: { slot: 'head', kind: 'armour', weight: 'light', name: 'Hood', look: 'hood', hidesHair: true, stats: { armour: 3, crit: 2 }, cls: ['knight', 'ranger', 'mage'] },
  circlet: { slot: 'head', kind: 'armour', weight: 'light', name: 'Circlet', look: 'circlet', stats: { spell: 4, mp: 6 }, cls: ['ranger', 'mage'] },
  // chests
  plate: { slot: 'chest', kind: 'armour', weight: 'heavy', name: 'Plate cuirass', look: 'plate', stats: { armour: 18, hp: 10, speed: -2 }, cls: ['knight'] },
  brigandine: { slot: 'chest', kind: 'armour', weight: 'medium', name: 'Brigandine', look: 'brigandine', stats: { armour: 12, hp: 6 }, cls: ['knight', 'ranger'] },
  jerkin: { slot: 'chest', kind: 'armour', weight: 'light', name: 'Leather jerkin', look: 'jerkin', stats: { armour: 8, crit: 2 }, cls: ['knight', 'ranger'] },
  robe: { slot: 'chest', kind: 'armour', weight: 'light', name: 'Spellwoven robe', look: 'robe', stats: { armour: 4, mp: 14, spell: 6 }, cls: ['mage'] },
  // hands
  gauntlets: { slot: 'hands', kind: 'armour', weight: 'heavy', name: 'Plate gauntlets', look: 'gauntlets', stats: { armour: 6, atk: 1 }, cls: ['knight'] },
  bracers: { slot: 'hands', kind: 'armour', weight: 'medium', name: 'Studded bracers', look: 'bracers', stats: { armour: 4, crit: 2 }, cls: ['knight', 'ranger'] },
  gloves: { slot: 'hands', kind: 'armour', weight: 'light', name: 'Silk gloves', look: 'gloves', stats: { armour: 2, spell: 3 }, cls: ['knight', 'ranger', 'mage'] },
  // legs
  cuisses: { slot: 'legs', kind: 'armour', weight: 'heavy', name: 'Plate cuisses', look: 'cuisses', stats: { armour: 9, hp: 6 }, cls: ['knight'] },
  chausses: { slot: 'legs', kind: 'armour', weight: 'medium', name: 'Padded chausses', look: 'chausses', stats: { armour: 6, hp: 4 }, cls: ['knight', 'ranger'] },
  leggings: { slot: 'legs', kind: 'armour', weight: 'light', name: 'Woven leggings', look: 'leggings', stats: { armour: 3, speed: 3 }, cls: ['knight', 'ranger', 'mage'] },
  // feet
  sabatons: { slot: 'feet', kind: 'armour', weight: 'heavy', name: 'Sabatons', look: 'sabatons', stats: { armour: 5, hp: 4 }, cls: ['knight'] },
  boots: { slot: 'feet', kind: 'armour', weight: 'medium', name: 'Riding boots', look: 'boots', stats: { armour: 3, speed: 4 }, cls: ['knight', 'ranger'] },
  slippers: { slot: 'feet', kind: 'armour', weight: 'light', name: 'Soft shoes', look: 'slippers', stats: { armour: 1, speed: 6 }, cls: ['knight', 'ranger', 'mage'] },
  // capes
  cloak: { slot: 'cape', kind: 'cape', name: 'Travelling cloak', look: 'cloak', stats: { armour: 2, hp: 6 }, cls: ['knight', 'ranger', 'mage'] },
  mantle: { slot: 'cape', kind: 'cape', name: 'Fur-trimmed mantle', look: 'mantle', stats: { armour: 3, regen: 1 }, cls: ['knight', 'ranger', 'mage'] },
  // trinkets
  ring: { slot: 'trinket', kind: 'trinket', name: 'Signet ring', look: 'ring', stats: { crit: 3 }, cls: ['knight', 'ranger', 'mage'] },
  amulet: { slot: 'trinket', kind: 'trinket', name: 'Amulet', look: 'amulet', stats: { hp: 12, mp: 8 }, cls: ['knight', 'ranger', 'mage'] },
  charm: { slot: 'trinket', kind: 'trinket', name: 'Woodland charm', look: 'charm', stats: { regen: 1, speed: 3 }, cls: ['knight', 'ranger', 'mage'] }
};

/** Affixes: a prefix or suffix to the name, and what they add (at item level 1). */
export const AFFIXES = {
  keen: { name: 'Keen', pre: true, stats: { crit: 4 }, slots: ['mainhand', 'hands', 'trinket', 'head'] },
  brutal: { name: 'Brutal', pre: true, stats: { atk: 4 }, slots: ['mainhand', 'hands', 'trinket'] },
  warded: { name: 'Warded', pre: true, stats: { armour: 5 }, slots: ['offhand', 'head', 'chest', 'hands', 'legs', 'feet', 'cape'] },
  fleet: { name: 'Fleet', pre: true, stats: { speed: 5 }, slots: ['feet', 'legs', 'trinket', 'cape'] },
  arcane: { name: 'Arcane', pre: true, stats: { spell: 7, mp: 6 }, slots: ['mainhand', 'offhand', 'head', 'trinket', 'chest', 'hands'] },
  hale: { name: 'Hale', pre: true, stats: { hp: 16 }, slots: ['chest', 'head', 'legs', 'offhand', 'cape', 'trinket'] },
  bear: { name: 'of the Bear', stats: { hp: 20, armour: 2 }, slots: ['chest', 'head', 'offhand', 'legs', 'feet', 'cape'] },
  hawk: { name: 'of the Hawk', stats: { crit: 3, critdmg: 12 }, slots: ['mainhand', 'hands', 'head', 'trinket'] },
  embers: { name: 'of Embers', stats: { atk: 3, spell: 5 }, slots: ['mainhand', 'trinket', 'offhand', 'hands'] },
  owl: { name: 'of the Owl', stats: { mp: 14 }, slots: ['head', 'trinket', 'offhand', 'chest', 'cape'] },
  bulwark: { name: 'of the Bulwark', stats: { block: 6, armour: 3 }, slots: ['offhand', 'chest', 'legs'] },
  leech: { name: 'of the Leech', stats: { leech: 3 }, slots: ['mainhand', 'trinket'] },
  dawn: { name: 'of Dawn', stats: { regen: 1.5, hp: 8 }, slots: ['chest', 'cape', 'trinket', 'feet'] }
};

const LEGENDS = {
  mainhand: ['Dawnbreaker', 'Emberfang', 'Gloamsong', 'Oath of Brindlewick', 'Vaelthrax\'s Tooth'],
  offhand: ['The Lantern Aegis', 'Moonwall', 'Hearthguard'],
  head: ['Crown of the Warden', 'Ashen Visage', 'Starwatch Helm'],
  chest: ['Heart of the Elder Oak', 'Cinderplate', 'Raiment of Dusk'],
  hands: ['Grips of the Gatewright', 'Embergrasp'],
  legs: ['Strides of the Ridge', 'Moonwell Greaves'],
  feet: ['Ashwalkers', 'Wayfarer\'s Last Steps'],
  cape: ['Mantle of the Never-Setting Sun', 'Gloamweave'],
  trinket: ['Tear of the Moonwell', 'Ring of a Thousand Lamps', 'The Rift-Eye']
};

/* ------------------------------------------------------------------ looks */

/** Metals an item can be made of, by rarity: commoner things are iron and bronze, the best gilded. */
export const METALS = {
  iron: { color: '#8e9399', rough: 0.5 },
  steel: { color: '#c7ccd4', rough: 0.3 },
  bronze: { color: '#b98a52', rough: 0.36 },
  silver: { color: '#e6e9ef', rough: 0.2 },
  blackened: { color: '#55565c', rough: 0.34 },
  moonsteel: { color: '#bccdf0', rough: 0.18 },
  gilded: { color: '#e8b552', rough: 0.22 }
};
const METAL_BY_RARITY = { common: ['iron', 'steel', 'bronze'], uncommon: ['steel', 'bronze', 'iron'], rare: ['steel', 'silver'], epic: ['blackened', 'moonsteel'], legendary: ['gilded'] };
/** Dyed cloth and leather colours. */
export const CLOTHS = ['#2e4a8a', '#8a2a2a', '#2f6a3c', '#6a3a7a', '#a87a2a', '#3a3a44', '#d8ccb0', '#2a6a6a'];
export const LEATHERS = ['#6a4428', '#4a3020', '#8a5a34', '#3a2a22', '#7a5a3e'];
/** Gem colour and glow by rarity (common has none). */
export const GEMS = { common: null, uncommon: '#5ad46a', rare: '#3f8cff', epic: '#b45cff', legendary: '#ff8a1e' };
/** Does an item of this rarity glow on the hero (and trail its swings)? */
export const glows = (rarity) => rarity === 'epic' || rarity === 'legendary';

/* ------------------------------------------------------------------ making */

let uidCounter = 1;
export const newUid = () => `g${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

const growth = (ilvl) => 1 + (Math.max(1, ilvl) - 1) * 0.16;
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length) % arr.length];

/** The level an item of item-level `ilvl` needs. */
export const levelReq = (ilvl) => Math.max(1, Math.floor(ilvl) - 1);

/**
 * An item: its base, rarity and level decide its stats; affixes add more and
 * name it; legendaries have names of their own. The look (metal, cloth,
 * leather, gem, a seed for its shape) is rolled too. `rand` a 0…1 stream.
 */
export function makeItem(baseId, rarity = 'common', ilvl = 1, rand = Math.random) {
  const base = BASES[baseId];
  if (!base) return null;
  const r = RARITIES[rarity] ? rarity : 'common';
  const R = RARITIES[r];
  const lvl = Math.max(1, Math.floor(ilvl));
  const k = growth(lvl) * R.mult;
  const stats = {};
  for (const [s, v] of Object.entries(base.stats)) stats[s] = v < 0 ? v : Math.max(1, Math.round(v * k * (0.92 + rand() * 0.16)));
  const pool = Object.entries(AFFIXES).filter(([, a]) => a.slots.includes(base.slot));
  const affixes = [];
  for (let i = 0; i < R.affixes && pool.length; i++) {
    const [id, a] = pool.splice(Math.floor(rand() * pool.length) % pool.length, 1)[0];
    affixes.push(id);
    for (const [s, v] of Object.entries(a.stats)) stats[s] = Math.round(((stats[s] ?? 0) + v * growth(lvl) * (0.85 + rand() * 0.3)) * 10) / 10;
  }
  for (const s of Object.keys(stats)) if (s !== 'regen') stats[s] = Math.round(stats[s]);
  const pre = affixes.find((a) => AFFIXES[a].pre);
  const suf = affixes.find((a) => !AFFIXES[a].pre);
  let name = [pre && AFFIXES[pre].name, base.name, suf && AFFIXES[suf].name].filter(Boolean).join(' ');
  if (r === 'legendary') name = pick(LEGENDS[base.slot] ?? LEGENDS.trinket, rand);
  const look = {
    metal: pick(METAL_BY_RARITY[r], rand),
    cloth: pick(CLOTHS, rand),
    leather: pick(LEATHERS, rand),
    gem: GEMS[r],
    seed: Math.floor(rand() * 1e6)
  };
  return { uid: newUid(), base: baseId, rarity: r, ilvl: lvl, req: levelReq(lvl), name, stats, affixes, look };
}

/** What a merchant pays for an item (or a stack); they ask four times as much. */
export function sellPrice(entry) {
  if (!entry) return 0;
  if (entry.base) return Math.max(1, Math.round((4 + entry.ilvl * 2.5) * RARITIES[entry.rarity].value));
  return Math.max(1, Math.round((POTIONS[entry.kind]?.price ?? 6) / 4)) * (entry.n ?? 1);
}
export const buyPrice = (entry) => (entry?.base ? sellPrice(entry) * 4 : POTIONS[entry?.kind]?.price ?? 15);

/* ------------------------------------------------------------------ potions */

/** Potions: drunk at once, no cooldown (each press drinks one). */
export const POTIONS = {
  hp: { name: 'Healing draught', color: '#e8404e', restore: 0.45, price: 14, key: 'Q', desc: 'Restores 45 % of your health at once.' },
  mp: { name: 'Mana tonic', color: '#4a7cff', restore: 0.6, price: 12, key: 'R', desc: 'Restores 60 % of your mana, energy or stamina at once.' }
};

/* ------------------------------------------------------------------ loot */

/** Rarity odds by where a drop comes from. */
export const RARITY_WEIGHTS = {
  normal: { common: 62, uncommon: 28, rare: 8, epic: 1.8, legendary: 0.2 },
  elite: { common: 6, uncommon: 34, rare: 40, epic: 17, legendary: 3 },
  chest: { common: 20, uncommon: 42, rare: 28, epic: 8.5, legendary: 1.5 },
  boss: { common: 0, uncommon: 0, rare: 40, epic: 45, legendary: 15 }
};
/** Items per drop: a chance of one (normal) or a count. */
export const DROP_COUNT = { normal: 0.24, elite: 2, chest: 2, boss: 4 };
export const GOLD = { normal: [2, 7], elite: [28, 55], chest: [30, 70], boss: [160, 260] };
const POTION_DROPS = { normal: 0.2, elite: 2, chest: 2, boss: 4 };

/** Monster families lean toward some kinds of item. */
export const FAMILY_BIAS = {
  beast: { armour: 1.6, cape: 1.4 },
  spider: { trinket: 1.8, weapon: 1.2 },
  fey: { focus: 2.2, trinket: 2, weapon: 0.8 },
  wood: { weapon: 1.6, shield: 1.6 },
  fire: { weapon: 1.5, trinket: 1.5 }
};

/** Pick a rarity by weight. */
export function rollRarity(tier = 'normal', rand = Math.random) {
  const w = RARITY_WEIGHTS[tier] ?? RARITY_WEIGHTS.normal;
  const total = RARITY_ORDER.reduce((a, r) => a + w[r], 0);
  let x = rand() * total;
  for (const r of RARITY_ORDER) if ((x -= w[r]) < 0) return r;
  return 'common';
}

/** A base for a drop: two in three for the hero's class, weighted by the family's taste. */
export function pickBase({ cls = 'knight', family = null } = {}, rand = Math.random) {
  const usable = rand() < 0.67;
  const bias = FAMILY_BIAS[family] ?? {};
  const list = Object.entries(BASES).filter(([, b]) => !usable || b.cls.includes(cls));
  const weights = list.map(([, b]) => bias[b.kind] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rand() * total;
  for (let i = 0; i < list.length; i++) if ((x -= weights[i]) < 0) return list[i][0];
  return list[list.length - 1][0];
}

/**
 * What drops: { items, potions: [{ kind, n }], gold }. `tier` normal / elite /
 * chest / boss; `level` the monster's (elites drop a level higher, bosses two).
 */
export function rollLoot({ tier = 'normal', level = 1, cls = 'knight', family = null } = {}, rand = Math.random) {
  const n = DROP_COUNT[tier] ?? 0;
  const count = n < 1 ? (rand() < n ? 1 : 0) : n;
  const ilvl = level + (tier === 'boss' ? 2 : tier === 'elite' ? 1 : 0);
  const items = [];
  for (let i = 0; i < count; i++) items.push(makeItem(pickBase({ cls, family }, rand), rollRarity(tier, rand), ilvl + (rand() < 0.3 ? 1 : 0), rand));
  const potions = [];
  const p = POTION_DROPS[tier] ?? 0;
  const pc = p < 1 ? (rand() < p ? 1 : 0) : p;
  for (let i = 0; i < pc; i++) potions.push({ kind: rand() < 0.6 ? 'hp' : 'mp', n: 1 });
  const [g0, g1] = GOLD[tier] ?? GOLD.normal;
  const gold = Math.round((g0 + (g1 - g0) * rand()) * (1 + (level - 1) * 0.15));
  return { items, potions, gold };
}

/* ------------------------------------------------------------------ the bag */

export const emptyBag = () => Array(BAG_SIZE).fill(null);
export const freeSlots = (bag) => bag.reduce((a, e) => a + (e ? 0 : 1), 0);
export const countOf = (bag, kind) => bag.reduce((a, e) => a + (e && e.kind === kind ? e.n : 0), 0);

/**
 * Put something in the bag. Potions fill existing stacks (to STACK_MAX), then
 * new ones; items take the first empty slot (or `at`, if empty).
 * Returns { ok, added, reason }.
 */
export function addToBag(bag, entry, at = -1) {
  if (!entry) return { ok: false, added: 0, reason: 'Nothing to take.' };
  if (entry.base) {
    const i = at >= 0 && !bag[at] ? at : bag.indexOf(null);
    if (i < 0) return { ok: false, added: 0, reason: 'Your bag is full.' };
    bag[i] = entry;
    return { ok: true, added: 1, index: i };
  }
  if (!POTIONS[entry.kind]) return { ok: false, added: 0, reason: 'Unknown.' };
  let left = Math.max(0, entry.n | 0);
  for (const s of bag) {
    if (!left) break;
    if (!s || s.kind !== entry.kind || s.n >= STACK_MAX) continue;
    const take = Math.min(left, STACK_MAX - s.n);
    s.n += take;
    left -= take;
  }
  while (left > 0) {
    const i = bag.indexOf(null);
    if (i < 0) break;
    const take = Math.min(left, STACK_MAX);
    bag[i] = { kind: entry.kind, n: take };
    left -= take;
  }
  const added = (entry.n | 0) - left;
  return left ? { ok: added > 0, added, reason: 'Your bag is full.' } : { ok: true, added };
}

/** Drink one: takes a potion out of the last stack of its kind. Returns true if there was one. */
export function takePotion(bag, kind) {
  for (let i = bag.length - 1; i >= 0; i--) {
    const s = bag[i];
    if (!s || s.kind !== kind) continue;
    s.n -= 1;
    if (s.n <= 0) bag[i] = null;
    return true;
  }
  return false;
}

/**
 * Move within the bag: into an empty slot; onto a stack of the same potion
 * (it fills, the rest stays behind); otherwise the two swap.
 */
export function moveInBag(bag, from, to) {
  if (from === to || from < 0 || to < 0 || from >= bag.length || to >= bag.length) return false;
  const a = bag[from];
  const b = bag[to];
  if (!a) return false;
  if (b && !a.base && !b.base && a.kind === b.kind) {
    const take = Math.min(a.n, STACK_MAX - b.n);
    b.n += take;
    a.n -= take;
    if (a.n <= 0) bag[from] = null;
    return true;
  }
  bag[to] = a;
  bag[from] = b ?? null;
  return true;
}

/** Tidy the bag: items by slot and rarity, then potions, empties last. */
export function sortBag(bag) {
  const order = (e) => (e.base ? SLOTS.indexOf(BASES[e.base].slot === 'trinket' ? 'trinket1' : BASES[e.base].slot) * 10 - RARITY_ORDER.indexOf(e.rarity) : 1000 + (e.kind === 'hp' ? 0 : 1));
  const full = bag.filter(Boolean).sort((a, b) => order(a) - order(b));
  for (let i = 0; i < bag.length; i++) bag[i] = full[i] ?? null;
}

/* ------------------------------------------------------------------ equipment */

export const emptyEquip = () => Object.fromEntries(SLOTS.map((s) => [s, null]));

/** The equipment slots an item can go in. */
export function slotsFor(item) {
  const b = BASES[item?.base];
  if (!b) return [];
  return b.slot === 'trinket' ? ['trinket1', 'trinket2'] : [b.slot];
}

/** Can this hero wear this item? { ok, reason }. */
export function canEquip(item, { cls, level }) {
  const b = BASES[item?.base];
  if (!b) return { ok: false, reason: 'That cannot be worn.' };
  if (!b.cls.includes(cls)) return { ok: false, reason: `A ${cls} cannot use that.` };
  if (b.weight && !(CLASS_ARMOUR[cls] ?? []).includes(b.weight)) return { ok: false, reason: `Too heavy for a ${cls}.` };
  if ((item.req ?? 1) > level) return { ok: false, reason: `Needs level ${item.req}.` };
  return { ok: true };
}

export const isTwoHanded = (item) => BASES[item?.base]?.hands === 2;

/** Can this off-hand be held with this main-hand weapon? Two-handers leave no hand free — but a quiver rides on the back, beside a bow. */
export function pairs(main, off) {
  if (!main || !off || !isTwoHanded(main)) return true;
  return BASES[off.base]?.kind === 'quiver' && BASES[main.base]?.wtype === 'bow';
}

/**
 * Wear the item at bag index `i` (in `slot`, for a trinket; else its own).
 * What it replaces goes back into the bag (the freed slot first); a two-handed
 * weapon takes the off-hand off too, and an off-hand takes a two-hander off.
 * Returns { ok, slot } or { ok: false, reason }.
 */
export function equipFromBag(p, i, slot = null) {
  const item = p.bag[i];
  const can = canEquip(item, p);
  if (!can.ok) return can;
  const slots = slotsFor(item);
  const target = slot && slots.includes(slot) ? slot : slots.find((s) => !p.equip[s]) ?? slots[0];
  const out = [];
  if (p.equip[target]) out.push(target);
  if (target === 'mainhand' && p.equip.offhand && !pairs(item, p.equip.offhand)) out.push('offhand');
  if (target === 'offhand' && p.equip.mainhand && !pairs(p.equip.mainhand, item)) out.push('mainhand');
  // Room: the item's own slot frees up, plus every empty one.
  if (out.length > 1 + freeSlots(p.bag)) return { ok: false, reason: 'Your bag is full.' };
  p.bag[i] = null;
  const freed = [i];
  for (const s of out) {
    const at = freed.shift() ?? p.bag.indexOf(null);
    p.bag[at] = p.equip[s];
    p.equip[s] = null;
  }
  p.equip[target] = item;
  return { ok: true, slot: target };
}

/** Take off what is in `slot`, into the bag (at `to`, if that is empty). */
export function unequip(p, slot, to = -1) {
  const it = p.equip[slot];
  if (!it) return { ok: false, reason: 'Nothing there.' };
  const at = to >= 0 && !p.bag[to] ? to : p.bag.indexOf(null);
  if (at < 0) return { ok: false, reason: 'Your bag is full.' };
  p.equip[slot] = null;
  p.bag[at] = it;
  return { ok: true, index: at };
}

/** Every stat from what is worn, added up. */
export function gearTotals(equip) {
  const t = {};
  for (const s of SLOTS) {
    const it = equip?.[s];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats ?? {})) t[k] = (t[k] ?? 0) + v;
  }
  return t;
}

/**
 * The change if `item` were worn instead of what is in its slot (a trinket
 * against the weaker or an empty one; a two-hander also loses the off-hand):
 * { stat: delta }, only the non-zero ones.
 */
export function compareItem(item, equip) {
  const b = BASES[item?.base];
  if (!b) return {};
  const slots = slotsFor(item);
  const score = (it) => (it ? Object.values(it.stats).reduce((a, v) => a + v, 0) : -1);
  const slot = slots.length > 1 ? slots.reduce((a, s) => (score(equip?.[s]) < score(equip?.[a]) ? s : a), slots[0]) : slots[0];
  const worn = [equip?.[slot]];
  if (slot === 'mainhand' && equip?.offhand && !pairs(item, equip.offhand)) worn.push(equip.offhand);
  if (slot === 'offhand' && equip?.mainhand && !pairs(equip.mainhand, item)) worn.push(equip.mainhand);
  const out = {};
  for (const [k, v] of Object.entries(item.stats)) out[k] = (out[k] ?? 0) + v;
  for (const w of worn) if (w) for (const [k, v] of Object.entries(w.stats)) out[k] = (out[k] ?? 0) - v;
  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] * 10) / 10;
    if (!out[k]) delete out[k];
  }
  return out;
}

/* ------------------------------------------------------------------ trade */

/** Sell the bag entry at `i` (a whole stack at once). Returns the gold it fetched. */
export function sellFromBag(p, i) {
  const e = p.bag[i];
  if (!e) return 0;
  const gold = sellPrice(e);
  p.bag[i] = null;
  p.gold += gold;
  return gold;
}

/** Buy from a merchant's stock: an item (it leaves the stock) or one potion. */
export function buy(p, entry, stock = null) {
  const price = buyPrice(entry);
  if (p.gold < price) return { ok: false, reason: 'Not enough gold.' };
  const r = addToBag(p.bag, entry.base ? entry : { kind: entry.kind, n: 1 });
  if (!r.ok) return r;
  p.gold -= price;
  if (entry.base && stock) {
    const k = stock.indexOf(entry);
    if (k >= 0) stock.splice(k, 1);
  }
  return { ok: true, price };
}

/** A merchant's wares for this hero: a few items for their class near their level. */
export function merchantStock({ level = 1, cls = 'knight', count = 8 } = {}, rand = Math.random) {
  const usable = Object.keys(BASES).filter((b) => BASES[b].cls.includes(cls));
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    out.push(makeItem(usable[Math.floor(rand() * usable.length) % usable.length], r < 0.12 ? 'rare' : r < 0.5 ? 'uncommon' : 'common', Math.max(1, level + Math.round(rand() * 2 - 0.6)), rand));
  }
  return out;
}

/* ------------------------------------------------------------------ the start */

/** What each hero starts with (common gear, the look of the hero as drawn). */
export const STARTER = {
  knight: [['longsword', { metal: 'steel', leather: '#4a3020' }], ['nasal', { metal: 'steel' }], ['kite', { metal: 'steel', cloth: '#2e4a8a' }], ['plate', { metal: 'steel' }], ['gauntlets', { metal: 'steel' }], ['cuisses', { metal: 'steel' }], ['sabatons', { metal: 'steel' }], ['cloak', { cloth: '#2e4a8a' }]],
  ranger: [['bow', { leather: '#6a4428' }], ['quiver', { leather: '#6a4428' }], ['hood', { cloth: '#2f6a3c' }], ['jerkin', { leather: '#6a4428', cloth: '#2f6a3c' }], ['bracers', { leather: '#5a3a24' }], ['leggings', { cloth: '#3a3a30' }], ['boots', { leather: '#5a3a24' }], ['cloak', { cloth: '#2f6a3c' }]],
  mage: [['staff', { leather: '#4a3020' }], ['robe', { cloth: '#4a3a8a' }], ['gloves', { cloth: '#3a2f5a' }], ['leggings', { cloth: '#3a2f5a' }], ['slippers', { cloth: '#3a2f5a' }]]
};

/** A starter item: common, level 1, the hero's own colours. */
export function starterItem(baseId, look = {}, rand = () => 0.5) {
  const it = makeItem(baseId, 'common', 1, rand);
  Object.assign(it.look, look);
  it.name = BASES[baseId].name;
  return it;
}

/** A new hero's profile: level 1, a little gold, starting gear, potions. */
export function newProfile(cls) {
  const p = { cls, level: 1, xp: 0, gold: 40, bag: emptyBag(), equip: emptyEquip(), opened: [] };
  for (const [id, look] of STARTER[cls] ?? []) {
    const it = starterItem(id, look);
    const slot = slotsFor(it)[0];
    if (slot === 'offhand' && !pairs(p.equip.mainhand, it)) continue;
    p.equip[slot] = it;
  }
  addToBag(p.bag, { kind: 'hp', n: 5 });
  addToBag(p.bag, { kind: 'mp', n: 3 });
  return p;
}
