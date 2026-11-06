/**
 * Gear: everything you wear, as opposed to the weapon in your hand.
 *
 * Eleven places to wear something (GEAR_SLOTS), and every piece belongs to an
 * item class that decides what it is good at:
 *
 *   armor (head, body, hands, legs, feet)
 *     cloth     spells: faster cooldowns, more spell damage, little armor
 *     leather   skirmish: move speed and critical chance
 *     mail      the middle: armor, health, slow mending
 *     plate     the front line: the most armor and health, but heavy (slower)
 *   off-hand
 *     shield    blocks hits; needs a free hand (no two-handed weapon)
 *     focus     spell power; needs a free hand
 *     quiver    weapon damage; works with any weapon, even a bow
 *   belt, cloak, amulet, ring — no class, each kind has its own leaning.
 *
 * A piece's class gives it fixed **base properties** (its implicit stats,
 * scaled by how much of the body it covers); rarity adds random **affixes** on
 * top, the same way weapons get theirs. Wearing several pieces of one armor
 * class adds a **set bonus** (3 and 5 pieces), and each character class is
 * proficient in one armor class (+25% from those pieces' base properties).
 */

/** Where things are worn, in paper-doll order. `kind` is what the slot takes. */
export const GEAR_SLOTS = [
  { id: 'head', kind: 'head', label: 'Head' },
  { id: 'neck', kind: 'neck', label: 'Amulet' },
  { id: 'back', kind: 'back', label: 'Cloak' },
  { id: 'chest', kind: 'chest', label: 'Body' },
  { id: 'offhand', kind: 'offhand', label: 'Off-hand' },
  { id: 'hands', kind: 'hands', label: 'Hands' },
  { id: 'waist', kind: 'waist', label: 'Belt' },
  { id: 'legs', kind: 'legs', label: 'Legs' },
  { id: 'feet', kind: 'feet', label: 'Feet' },
  { id: 'ring1', kind: 'ring', label: 'Ring' },
  { id: 'ring2', kind: 'ring', label: 'Ring' }
];
export const GEAR_SLOT_IDS = GEAR_SLOTS.map((s) => s.id);

export const KIND_LABELS = {
  head: 'Helmet',
  chest: 'Body armor',
  hands: 'Gloves',
  legs: 'Leg armor',
  feet: 'Boots',
  waist: 'Belt',
  back: 'Cloak',
  offhand: 'Off-hand',
  neck: 'Amulet',
  ring: 'Ring'
};

/** The armor pieces: how much of a class's base properties each one carries. */
const ARMOR_COVER = { chest: 1, legs: 0.8, head: 0.7, hands: 0.5, feet: 0.5 };
/** Every pair of boots is quicker, every pair of gloves hits harder, whatever they are made of. */
const KIND_EXTRA = { feet: { speed: 3 }, hands: { attack: 4 } };

/**
 * The four armor classes. `base` is for a full-cover piece (body armor);
 * smaller pieces get a share (ARMOR_COVER).
 */
export const ARMOR_CLASSES = {
  cloth: {
    label: 'Cloth',
    color: '#b89cff',
    blurb: 'Spellcaster’s wear: faster cooldowns and stronger spells, but little armor.',
    base: { armor: 1.5, cooldown: 3, damage: 5 },
    sets: [
      { pieces: 3, stats: { cooldown: 6 } },
      { pieces: 5, stats: { damage: 12, regen: 1 } }
    ]
  },
  leather: {
    label: 'Leather',
    color: '#d0955a',
    blurb: 'Skirmisher’s wear: lighter on your feet, sharper hits.',
    base: { armor: 3, speed: 2, crit: 2 },
    sets: [
      { pieces: 3, stats: { speed: 5 } },
      { pieces: 5, stats: { crit: 6, attack: 12 } }
    ]
  },
  mail: {
    label: 'Mail',
    color: '#9fb4c8',
    blurb: 'The middle way: solid armor, more health, and wounds that close by themselves.',
    base: { armor: 5, health: 9, regen: 0.5 },
    sets: [
      { pieces: 3, stats: { regen: 1.5 } },
      { pieces: 5, stats: { health: 30, block: 6 } }
    ]
  },
  plate: {
    label: 'Plate',
    color: '#e4e8ee',
    blurb: 'Front-line wear: the most armor and health, but it slows you down.',
    base: { armor: 7, health: 14, speed: -2.5 },
    sets: [
      { pieces: 3, stats: { armor: 4 } },
      { pieces: 5, stats: { thorns: 20, health: 25 } }
    ]
  }
};
export const ARMOR_CLASS_IDS = Object.keys(ARMOR_CLASSES);

/** Off-hand classes. `freeHand`: does it need the left hand empty? */
export const OFFHAND_CLASSES = {
  shield: { label: 'Shield', color: '#c8a46a', freeHand: true, blurb: 'Blocks hits outright. Needs a free hand: no two-handed weapons.' },
  focus: { label: 'Focus', color: '#7fd0ff', freeHand: true, blurb: 'Held in the off hand to steady spells. Needs a free hand.' },
  quiver: { label: 'Quiver', color: '#a8d878', freeHand: false, blurb: 'Worn on the back: works with any weapon, bows included.' }
};

/** Bonus per extra percent of proficiency (a class's favored armor). */
export const PROFICIENCY = 0.25;

const ARMOR_NAMES = {
  head: { cloth: 'Silk Hood', leather: 'Leather Cap', mail: 'Chain Coif', plate: 'Great Helm' },
  chest: { cloth: 'Spellweave Robe', leather: 'Hide Jerkin', mail: 'Hauberk', plate: 'Breastplate' },
  hands: { cloth: 'Silk Gloves', leather: 'Leather Bracers', mail: 'Chain Mitts', plate: 'Gauntlets' },
  legs: { cloth: 'Wrapped Leggings', leather: 'Leather Breeches', mail: 'Chain Leggings', plate: 'Greaves' },
  feet: { cloth: 'Soft Slippers', leather: 'Ranger Boots', mail: 'Chain Boots', plate: 'Sabatons' }
};

/**
 * Every base item: `{ id, label, kind, group, implicit }`. `group` is the item
 * class (an armor class, an off-hand class, or the kind itself for jewelry,
 * belts and cloaks).
 */
export const GEAR_BASES = [];
const round = (key, v) => (key === 'regen' ? Math.round(v * 10) / 10 : Math.round(v));

for (const [kind, cover] of Object.entries(ARMOR_COVER)) {
  for (const [cls, def] of Object.entries(ARMOR_CLASSES)) {
    const implicit = {};
    for (const [key, v] of Object.entries(def.base)) {
      const value = round(key, v * cover);
      if (value) implicit[key] = value;
    }
    for (const [key, v] of Object.entries(KIND_EXTRA[kind] ?? {})) implicit[key] = (implicit[key] ?? 0) + v;
    GEAR_BASES.push({ id: `${cls}-${kind}`, label: ARMOR_NAMES[kind][cls], kind, group: cls, implicit });
  }
}

GEAR_BASES.push(
  /* shields */
  { id: 'buckler', label: 'Buckler', kind: 'offhand', group: 'shield', implicit: { block: 10, armor: 3 } },
  { id: 'kite-shield', label: 'Kite Shield', kind: 'offhand', group: 'shield', implicit: { block: 17, armor: 6, health: 10 } },
  { id: 'tower-shield', label: 'Tower Shield', kind: 'offhand', group: 'shield', implicit: { block: 26, armor: 10, speed: -4 } },
  { id: 'spiked-shield', label: 'Spiked Shield', kind: 'offhand', group: 'shield', implicit: { block: 13, armor: 4, thorns: 12 } },
  /* foci */
  { id: 'crystal-focus', label: 'Crystal Focus', kind: 'offhand', group: 'focus', implicit: { damage: 8, cooldown: 4 } },
  { id: 'spirit-totem', label: 'Spirit Totem', kind: 'offhand', group: 'focus', implicit: { regen: 1.2, health: 12 } },
  { id: 'rune-tablet', label: 'Rune Tablet', kind: 'offhand', group: 'focus', implicit: { cooldown: 7, crit: 2 } },
  /* quivers */
  { id: 'quiver', label: 'Hunter’s Quiver', kind: 'offhand', group: 'quiver', implicit: { attack: 10, crit: 3 } },
  { id: 'bandolier', label: 'Bandolier', kind: 'offhand', group: 'quiver', implicit: { attack: 14, speed: 2 } },
  /* belts */
  { id: 'sash', label: 'Silk Sash', kind: 'waist', group: 'waist', implicit: { cooldown: 3, health: 6 } },
  { id: 'war-belt', label: 'War Belt', kind: 'waist', group: 'waist', implicit: { health: 18, armor: 2 } },
  { id: 'pouch-belt', label: 'Pouch Belt', kind: 'waist', group: 'waist', implicit: { gold: 15, regen: 0.5 } },
  /* cloaks */
  { id: 'travel-cloak', label: 'Traveler’s Cloak', kind: 'back', group: 'back', implicit: { speed: 4 } },
  { id: 'warded-mantle', label: 'Warded Mantle', kind: 'back', group: 'back', implicit: { armor: 4, cooldown: 2 } },
  { id: 'shadow-cloak', label: 'Shadow Cloak', kind: 'back', group: 'back', implicit: { crit: 4, speed: 2 } },
  /* amulets */
  { id: 'amulet', label: 'Amulet', kind: 'neck', group: 'neck', implicit: { damage: 6 } },
  { id: 'talisman', label: 'Talisman', kind: 'neck', group: 'neck', implicit: { cooldown: 4 } },
  { id: 'torc', label: 'War Torc', kind: 'neck', group: 'neck', implicit: { attack: 8 } },
  { id: 'pendant', label: 'Heart Pendant', kind: 'neck', group: 'neck', implicit: { health: 15 } },
  /* rings */
  { id: 'band', label: 'Band', kind: 'ring', group: 'ring', implicit: { crit: 3 } },
  { id: 'signet', label: 'Signet', kind: 'ring', group: 'ring', implicit: { gold: 12 } },
  { id: 'loop', label: 'Mending Loop', kind: 'ring', group: 'ring', implicit: { regen: 0.6 } },
  { id: 'seal', label: 'Iron Seal', kind: 'ring', group: 'ring', implicit: { armor: 2, attack: 3 } }
);

export const GEAR_BASE_BY_ID = Object.fromEntries(GEAR_BASES.map((b) => [b.id, b]));

/** The item class of a group, for labels and colours. */
export function gearClassOf(group) {
  return ARMOR_CLASSES[group] ?? OFFHAND_CLASSES[group] ?? null;
}

/** "Plate helmet", "Shield", "Ring"… */
export function gearTypeLabel(item) {
  const cls = gearClassOf(item.group);
  if (ARMOR_CLASSES[item.group]) return `${cls.label} ${KIND_LABELS[item.kind].toLowerCase()}`;
  if (cls) return cls.label;
  return KIND_LABELS[item.kind] ?? 'Gear';
}

/** Named uniques: a fixed base and fixed, stronger affixes. */
export const GEAR_UNIQUES = [
  { name: 'Crown of the Ember Keep', base: 'plate-head', stats: { armor: 6, health: 40, meteor: 25 } },
  { name: 'Stormstride Boots', base: 'leather-feet', stats: { speed: 10, thunder: 30, crit: 5 } },
  { name: 'The Last Bastion', base: 'tower-shield', stats: { block: 10, armor: 8, thorns: 25 } },
  { name: 'Veil of Quiet Stars', base: 'cloth-chest', stats: { cooldown: 10, damage: 18, orb: 30 } },
  { name: 'Wyrmscale Hauberk', base: 'mail-chest', stats: { armor: 6, health: 50, regen: 2 } },
  { name: 'Ring of Second Dawn', base: 'loop', stats: { regen: 2, health: 25, crit: 5 } },
  { name: 'Gravewind Cloak', base: 'shadow-cloak', stats: { speed: 8, crit: 6, blink: 30 } },
  { name: 'Hearthstone Amulet', base: 'pendant', stats: { damage: 14, cooldown: 8, gold: 40 } },
  { name: 'Fists of the Mountain', base: 'plate-hands', stats: { attack: 22, slam: 30, thorns: 10 } },
  { name: 'Moonhunter’s Quiver', base: 'quiver', stats: { attack: 15, crit: 8, speed: 5 } }
];

/** Gear affixes, beyond the ones weapons roll too. Shields alone roll block. */
export const GEAR_ONLY_STATS = ['armor', 'block', 'regen', 'thorns'];

/**
 * Which hands does a weapon take? Two-handed: rifles, heavy weapons,
 * polearms, staves, heavy blades, bows (but not a hand crossbow or a sling),
 * and anything wielded in pairs.
 * @param {import('../platform/weapon/WeaponDefinition.js').WeaponDefinition|null} weapon
 */
export function isTwoHanded(weapon) {
  if (!weapon) return false;
  if (weapon.attachSecondary) return true;
  const c = weapon.category;
  if (c === 'rifle' || c === 'heavy' || c === 'polearm') return true;
  if (c === 'bow') return weapon.id !== 'hand-crossbow' && weapon.id !== 'sling';
  if (c === 'magic') return String(weapon.visual).startsWith('staff');
  if (c === 'sword' || c === 'axe') return weapon.weight === 'heavy';
  return false;
}

/**
 * Does an equipped piece count right now? Only a shield or a focus can be
 * switched off — by a weapon that needs both hands.
 */
export function gearActive(item, twoHanded) {
  if (!item || item.kind !== 'offhand') return Boolean(item);
  return !(twoHanded && OFFHAND_CLASSES[item.group]?.freeHand);
}

/** How many pieces of each armor class are worn (active pieces only). */
export function armorCounts(gear) {
  const counts = {};
  for (const id of GEAR_SLOT_IDS) {
    const item = gear?.[id];
    if (item && ARMOR_CLASSES[item.group]) counts[item.group] = (counts[item.group] ?? 0) + 1;
  }
  return counts;
}

/** The set bonuses that apply, as `[{ cls, pieces, stats }]`. */
export function activeSetBonuses(gear) {
  const out = [];
  for (const [cls, n] of Object.entries(armorCounts(gear))) {
    for (const tier of ARMOR_CLASSES[cls].sets) if (n >= tier.pieces) out.push({ cls, ...tier });
  }
  return out;
}

/**
 * What one worn piece adds, as plain stats: base properties (with
 * proficiency) plus affixes.
 */
export function pieceStats(item, favored) {
  const out = {};
  const scale = favored && item.group === favored ? 1 + PROFICIENCY : 1;
  for (const [key, v] of Object.entries(item.implicit ?? {})) out[key] = round(key, v * (v > 0 ? scale : 1));
  for (const [key, v] of Object.entries(item.stats ?? {})) out[key] = round(key, (out[key] ?? 0) + v);
  return out;
}
