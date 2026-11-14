/**
 * Hearthvale's data: classes and their skills, monsters, items, quests,
 * gathering nodes and recipes. Pure data, read by the server (which runs
 * the worlds) and the browser (which draws them and fills the windows).
 * Everything here — names, classes, places, story — is our own; the bodies
 * are the KayKit Adventurers and Skeletons (CC0, Kay Lousberg).
 */

export const MAX_LEVEL = 20;
export const GCD = 1.0; // seconds between skills
export const BAG_SIZE = 20;
export const BANK_SIZE = 24;
export const RUN_SPEED = 7;
export const PARTY_MAX = 8;
export const XP_TO = Array.from({ length: MAX_LEVEL + 1 }, (_, l) => (l <= 1 ? 0 : Math.round(80 * (l - 1) ** 1.9 + 120 * (l - 1))));
export const SLOTS = ['weapon', 'head', 'chest', 'legs', 'feet', 'trinket'];

/* ------------------------------------------------------------- classes */

/**
 * Skill kinds: `strike` (melee, needs a hostile target in reach), `bolt`
 * (ranged, hostile target), `heal` (friendly target, or yourself), `aura`
 * (yourself), `nova` (around you), `area` (around your target), `blink`,
 * `taunt`, `revive`. `cast` is seconds standing still (0 = instant).
 * `anim` is the move the body makes (else its usual attack), `fx` what is
 * drawn with it: a `slash`, a `spin`, a shield `bash`, a `guard`, a `shout`.
 */

/**
 * Fighting in a row: every hit within COMBO.keep seconds of the last adds
 * to a combo (each worth `per` more damage, up to `cap` hits), and every
 * third basic attack in a row is a finisher.
 */
export const COMBO = { keep: 4, per: 0.02, cap: 10, finisher: 1.4, chain: 3, close: 3.2 };
/** What a body does for the 1st, 2nd and 3rd basic melee attack in a row. */
export const MELEE_CHAIN = ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal'];
export const CLASSES = {
  vanguard: {
    id: 'vanguard', name: 'Vanguard', role: 'Tank', resource: 'Resolve',
    blurb: 'A shield for the party: holds the monsters\' attention and takes the hits.',
    body: 'Knight', show: ['1H_Sword', 'Round_Shield'], tint: '#ffffff', attack: '1H_Melee_Attack_Chop',
    base: { hp: 130, hpL: 26, mana: 100, manaL: 0, power: 8, powerL: 2.2, armor: 12, armorL: 3, range: 2.6, speed: 2.2, regen: 7 },
    skills: [
      { id: 'strike', anim: '1H_Melee_Attack_Slice_Diagonal', fx: 'slash', name: 'Heavy Strike', kind: 'strike', level: 1, cost: 12, cd: 0, damage: 14, coef: 1.0, threat: 1.6, icon: '⚔' },
      { id: 'taunt', anim: 'Cheer', fx: 'shout', name: 'Challenge', kind: 'taunt', level: 2, cost: 8, cd: 8, range: 20, icon: '📣' },
      { id: 'cleave', anim: '2H_Melee_Attack_Spin', fx: 'spin', name: 'Cleave', kind: 'nova', level: 4, cost: 20, cd: 6, damage: 12, coef: 0.7, radius: 5, threat: 1.8, icon: '🌀' },
      { id: 'wall', anim: 'Block', fx: 'guard', name: 'Shield Wall', kind: 'aura', level: 6, cost: 15, cd: 30, buff: { reduce: 0.4, time: 8 }, icon: '🛡' },
      { id: 'slam', anim: 'Block_Attack', fx: 'bash', name: 'Shield Slam', kind: 'strike', level: 8, cost: 18, cd: 12, damage: 18, coef: 0.8, stun: 2, threat: 2, icon: '💥' },
      { id: 'rally', anim: 'Cheer', fx: 'shout', name: 'Rallying Cry', kind: 'nova', level: 12, cost: 25, cd: 45, radius: 15, heal: 40, coef: 1.2, friendly: true, icon: '🎺' }
    ]
  },
  ranger: {
    id: 'ranger', name: 'Ranger', role: 'Damage', resource: 'Focus',
    blurb: 'A crossbow and patience. Strikes from far away and slows whatever gives chase.',
    body: 'Rogue', show: ['2H_Crossbow'], tint: '#ffffff', attack: '2H_Ranged_Shoot', ranged: true,
    base: { hp: 105, hpL: 21, mana: 100, manaL: 0, power: 10, powerL: 2.6, armor: 6, armorL: 2, range: 26, speed: 2.4, regen: 12 },
    skills: [
      { id: 'quick', name: 'Quick Shot', kind: 'bolt', level: 1, cost: 15, cd: 0, range: 28, damage: 12, coef: 0.9, icon: '➶' },
      { id: 'aimed', name: 'Aimed Shot', kind: 'bolt', level: 2, cost: 25, cd: 6, cast: 1.8, range: 32, damage: 30, coef: 1.8, icon: '🎯' },
      { id: 'hamstring', name: 'Crippling Bolt', kind: 'bolt', level: 4, cost: 20, cd: 10, range: 28, damage: 8, coef: 0.5, slow: { amount: 0.5, time: 6 }, icon: '🦶' },
      { id: 'roll', anim: 'Dodge_Backward', name: 'Evasive Roll', kind: 'blink', level: 6, cost: 10, cd: 15, distance: -9, icon: '↩' },
      { id: 'volley', name: 'Volley', kind: 'area', level: 8, cost: 40, cd: 14, cast: 1.2, range: 30, radius: 6, damage: 16, coef: 1.0, icon: '🌧' },
      { id: 'mark', anim: 'Throw', name: 'Hunter\'s Mark', kind: 'bolt', level: 12, cost: 15, cd: 30, range: 34, damage: 0, coef: 0, mark: { more: 0.15, time: 20 }, icon: '🔻' }
    ]
  },
  arcanist: {
    id: 'arcanist', name: 'Arcanist', role: 'Damage', resource: 'Mana',
    blurb: 'Fire and frost from behind the line. Fragile, and the hardest hitter in any party.',
    body: 'Mage', show: ['2H_Staff'], tint: '#ffe2d0', attack: 'Spellcast_Shoot', ranged: true,
    base: { hp: 95, hpL: 19, mana: 150, manaL: 22, power: 11, powerL: 2.9, armor: 4, armorL: 1.5, range: 26, speed: 2.4, regen: 3 },
    skills: [
      { id: 'firebolt', name: 'Firebolt', kind: 'bolt', level: 1, cost: 12, cd: 0, cast: 1.6, range: 28, damage: 20, coef: 1.4, icon: '🔥' },
      { id: 'frost', name: 'Frost Lash', kind: 'bolt', level: 2, cost: 15, cd: 6, range: 26, damage: 12, coef: 0.8, slow: { amount: 0.4, time: 4 }, icon: '❄' },
      { id: 'barrier', anim: 'Spellcast_Raise', name: 'Arcane Barrier', kind: 'aura', level: 4, cost: 25, cd: 25, shield: 40, coef: 1.5, icon: '🔮' },
      { id: 'ring', anim: 'Spellcast_Raise', name: 'Flame Ring', kind: 'nova', level: 6, cost: 30, cd: 10, radius: 6, damage: 16, coef: 1.0, icon: '⭕' },
      { id: 'blink', anim: 'Dodge_Forward', name: 'Blink', kind: 'blink', level: 8, cost: 15, cd: 18, distance: 11, icon: '✨' },
      { id: 'meteor', anim: 'Spellcast_Raise', name: 'Meteor', kind: 'area', level: 12, cost: 50, cd: 20, cast: 2.6, range: 30, radius: 6, damage: 40, coef: 2.4, icon: '☄' }
    ]
  },
  mender: {
    id: 'mender', name: 'Mender', role: 'Healer', resource: 'Mana',
    blurb: 'Keeps everyone standing. Heals, shields, brings the fallen back — and smites when it must.',
    body: 'Mage', show: ['1H_Wand', 'Spellbook'], tint: '#fff6d8', attack: 'Spellcast_Shoot', ranged: true,
    base: { hp: 100, hpL: 20, mana: 160, manaL: 24, power: 10, powerL: 2.6, armor: 5, armorL: 1.8, range: 24, speed: 2.4, regen: 3.5 },
    skills: [
      { id: 'mend', name: 'Mend', kind: 'heal', level: 1, cost: 18, cd: 0, cast: 1.5, range: 28, heal: 30, coef: 1.6, icon: '✚' },
      { id: 'smite', name: 'Smite', kind: 'bolt', level: 1, cost: 12, cd: 0, cast: 1.5, range: 26, damage: 14, coef: 1.0, icon: '☀' },
      { id: 'renew', name: 'Renew', kind: 'heal', level: 3, cost: 15, cd: 3, range: 28, hot: { heal: 8, coef: 0.4, time: 10 }, icon: '🌿' },
      { id: 'ward', name: 'Ward', kind: 'heal', level: 5, cost: 22, cd: 10, range: 28, shield: 35, coef: 1.4, icon: '💠' },
      { id: 'radiance', anim: 'Spellcast_Raise', name: 'Radiance', kind: 'nova', level: 8, cost: 45, cd: 12, cast: 2, radius: 18, heal: 25, coef: 1.0, friendly: true, icon: '🌟' },
      { id: 'revive', name: 'Revive', kind: 'revive', level: 10, cost: 50, cd: 30, cast: 4, range: 20, icon: '🕊' }
    ]
  }
};
export const CLASS_ORDER = ['vanguard', 'ranger', 'arcanist', 'mender'];

/* -------------------------------------------------------------- items */

/**
 * Items: `slot` for gear (stats: power, stamina, armor), `use` for
 * consumables, `mat` for materials. `value` is what a vendor pays (they sell at four times that).
 */
export const ITEMS = {
  // Gear
  rusty_sword: { name: 'Rusty Sword', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  oak_staff: { name: 'Oak Staff', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  worn_crossbow: { name: 'Worn Crossbow', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  apprentice_wand: { name: 'Apprentice Wand', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  padded_vest: { name: 'Padded Vest', slot: 'chest', level: 1, stats: { armor: 3, stamina: 1 }, value: 2 },
  copper_blade: { name: 'Copper Blade', slot: 'weapon', level: 5, stats: { power: 6, stamina: 1 }, value: 12, rarity: 'common' },
  copper_helm: { name: 'Copper Helm', slot: 'head', level: 5, stats: { armor: 6, stamina: 2 }, value: 10 },
  iron_blade: { name: 'Iron Blade', slot: 'weapon', level: 10, stats: { power: 12, stamina: 3 }, value: 30, rarity: 'uncommon' },
  iron_plate: { name: 'Iron Breastplate', slot: 'chest', level: 10, stats: { armor: 16, stamina: 5 }, value: 28, rarity: 'uncommon' },
  ash_bow: { name: 'Ashwood Crossbow', slot: 'weapon', level: 8, stats: { power: 10, stamina: 2 }, value: 22, rarity: 'uncommon' },
  ash_staff: { name: 'Ashwood Staff', slot: 'weapon', level: 8, stats: { power: 10, stamina: 2 }, value: 22, rarity: 'uncommon' },
  leather_boots: { name: 'Leather Boots', slot: 'feet', level: 1, stats: { armor: 3, stamina: 1 }, value: 4 },
  traveler_leggings: { name: 'Traveler\'s Leggings', slot: 'legs', level: 4, stats: { armor: 4, stamina: 2 }, value: 6 },
  bone_charm: { name: 'Bone Charm', slot: 'trinket', level: 6, stats: { power: 3, stamina: 2 }, value: 15, rarity: 'uncommon' },
  gravelord_crown: { name: 'Gravelord\'s Crown', slot: 'head', level: 10, stats: { armor: 10, stamina: 6, power: 4 }, value: 60, rarity: 'rare' },
  marsh_cloak: { name: 'Fen-Stalker Vest', slot: 'chest', level: 14, stats: { armor: 18, stamina: 7, power: 4 }, value: 50, rarity: 'uncommon' },
  kessa_band: { name: 'Kessa\'s Signet', slot: 'trinket', level: 11, stats: { power: 8, stamina: 4 }, value: 80, rarity: 'rare' },
  drowned_blade: { name: 'Blade of the Drowned King', slot: 'weapon', level: 12, stats: { power: 20, stamina: 6 }, value: 120, rarity: 'rare' },
  drowned_greaves: { name: 'Tidebound Greaves', slot: 'legs', level: 12, stats: { armor: 14, stamina: 8 }, value: 100, rarity: 'rare' },
  ember_crest: { name: 'Ember Crest', slot: 'head', level: 18, stats: { armor: 22, stamina: 12, power: 10 }, value: 300, rarity: 'epic' },
  cinder_edge: { name: 'Cinderwing\'s Edge', slot: 'weapon', level: 20, stats: { power: 40, stamina: 12 }, value: 500, rarity: 'epic' },
  ashen_treads: { name: 'Ashen Treads', slot: 'feet', level: 16, stats: { armor: 12, stamina: 8, power: 6 }, value: 90, rarity: 'uncommon' },
  // Brannoc's stock: plain gear for every class, three tiers
  militia_sword: { name: 'Militia Sword', slot: 'weapon', level: 1, stats: { power: 4 }, value: 5 },
  hunting_crossbow: { name: 'Hunting Crossbow', slot: 'weapon', level: 1, stats: { power: 4 }, value: 5 },
  willow_staff: { name: 'Willow Staff', slot: 'weapon', level: 1, stats: { power: 4 }, value: 5 },
  cloth_hood: { name: 'Cloth Hood', slot: 'head', level: 1, stats: { armor: 2, stamina: 1 }, value: 3 },
  wooden_charm: { name: 'Carved Charm', slot: 'trinket', level: 1, stats: { power: 1, stamina: 1 }, value: 4 },
  ring_vest: { name: 'Ringmail Vest', slot: 'chest', level: 5, stats: { armor: 8, stamina: 3 }, value: 12 },
  scout_boots: { name: 'Scout Boots', slot: 'feet', level: 5, stats: { armor: 5, stamina: 2 }, value: 10 },
  ring_leggings: { name: 'Ringmail Leggings', slot: 'legs', level: 6, stats: { armor: 7, stamina: 3 }, value: 12 },
  steel_sword: { name: 'Steel Longsword', slot: 'weapon', level: 9, stats: { power: 11, stamina: 2 }, value: 28 },
  steel_crossbow: { name: 'Steel Crossbow', slot: 'weapon', level: 9, stats: { power: 11, stamina: 2 }, value: 28 },
  oak_rod: { name: 'Carved Oak Rod', slot: 'weapon', level: 9, stats: { power: 11, stamina: 2 }, value: 28 },
  scale_vest: { name: 'Scale Hauberk', slot: 'chest', level: 10, stats: { armor: 14, stamina: 5 }, value: 30 },
  scale_helm: { name: 'Scale Coif', slot: 'head', level: 10, stats: { armor: 9, stamina: 4 }, value: 26 },
  // Consumables
  minor_potion: { name: 'Minor Healing Draught', use: { heal: 80 }, stack: 20, value: 2 },
  mana_tonic: { name: 'Mana Tonic', use: { mana: 80 }, stack: 20, value: 2 },
  greater_potion: { name: 'Greater Healing Draught', use: { heal: 240 }, stack: 20, value: 8 },
  bread: { name: 'Hearth Bread', use: { heal: 40, mana: 40 }, stack: 20, value: 1 },
  // Materials
  copper_ore: { name: 'Copper Ore', mat: true, stack: 40, value: 1 },
  iron_ore: { name: 'Iron Ore', mat: true, stack: 40, value: 3 },
  sunleaf: { name: 'Sunleaf', mat: true, stack: 40, value: 1 },
  ghostcap: { name: 'Ghostcap', mat: true, stack: 40, value: 3 },
  ash_log: { name: 'Ash Log', mat: true, stack: 40, value: 1 },
  bone_dust: { name: 'Bone Dust', mat: true, stack: 40, value: 1 },
  ember_shard: { name: 'Ember Shard', mat: true, stack: 40, value: 10 }
};

/** Hearthvale's stores: Pell's supplies, Brannoc's weapons and armor. A store sells at four times an item's value and buys at its value. */
export const VENDORS = {
  pell: ['bread', 'minor_potion', 'mana_tonic', 'greater_potion'],
  brannoc: [
    'militia_sword', 'hunting_crossbow', 'willow_staff', 'cloth_hood', 'padded_vest', 'leather_boots', 'traveler_leggings', 'wooden_charm',
    'copper_blade', 'ash_bow', 'ash_staff', 'copper_helm', 'ring_vest', 'scout_boots', 'ring_leggings',
    'steel_sword', 'steel_crossbow', 'oak_rod', 'scale_helm', 'scale_vest'
  ]
};
/** Every item any store sells (for checks that don't care which). */
export const VENDOR = [...new Set(Object.values(VENDORS).flat())];
/** Money a new character starts with (and a one-time gift to older characters). */
export const SEED_GOLD = 100;

/** The starting kit for each class. */
export const STARTER = {
  vanguard: { weapon: 'rusty_sword', chest: 'padded_vest', bag: [['minor_potion', 3], ['bread', 4]] },
  ranger: { weapon: 'worn_crossbow', chest: 'padded_vest', bag: [['minor_potion', 3], ['bread', 4]] },
  arcanist: { weapon: 'oak_staff', chest: 'padded_vest', bag: [['minor_potion', 3], ['mana_tonic', 3]] },
  mender: { weapon: 'apprentice_wand', chest: 'padded_vest', bag: [['minor_potion', 3], ['mana_tonic', 3]] }
};

/* ------------------------------------------------------------ monsters */

/**
 * `loot`: [item, chance] pairs rolled for everyone who fought it; `gold`
 * coins each. `boss` mechanics: `slam` (a telegraphed circle on a player
 * after `windup`), `summon` (adds), `enrage` (below a share of health),
 * `nova` (around itself).
 */
export const MOBS = {
  rattler: { name: 'Rattlebones', level: [1, 3], hp: 55, damage: 6, speed: 4, range: 2.4, body: 'Skeleton_Minion', tint: '#e8e2d0', loot: [['bone_dust', 0.5], ['leather_boots', 0.04]], gold: [1, 3] },
  grave_archer: { name: 'Grave Archer', level: [3, 5], hp: 70, damage: 7, speed: 4, range: 20, ranged: true, body: 'Skeleton_Rogue', tint: '#d8d0c0', loot: [['bone_dust', 0.6], ['traveler_leggings', 0.04]], gold: [2, 4] },
  bandit: { name: 'Rust Bandit', level: [4, 6], hp: 95, damage: 9, speed: 4.5, range: 2.6, body: 'Barbarian', show: ['1H_Axe'], tint: '#d88a7a', loot: [['bread', 0.3], ['copper_helm', 0.04], ['minor_potion', 0.15]], gold: [3, 6] },
  cutthroat: { name: 'Bandit Cutthroat', level: [6, 8], hp: 110, damage: 12, speed: 4.8, range: 2.4, body: 'Rogue_Hooded', show: ['Knife', 'Knife_Offhand'], tint: '#c47a7a', loot: [['minor_potion', 0.2], ['bone_charm', 0.03]], gold: [4, 8] },
  barrow_mage: { name: 'Barrow Mage', level: [6, 8], hp: 90, damage: 13, speed: 4, range: 22, ranged: true, body: 'Skeleton_Mage', tint: '#b8c8ff', loot: [['bone_dust', 0.6], ['mana_tonic', 0.2]], gold: [4, 7] },
  barrow_knight: { name: 'Barrow Knight', level: [8, 10], hp: 160, damage: 15, speed: 4, range: 2.8, body: 'Skeleton_Warrior', tint: '#c8c8d8', loot: [['bone_dust', 0.6], ['iron_ore', 0.2], ['bone_charm', 0.04]], gold: [6, 10] },
  gravelord: { name: 'Old Gravelord', level: [10, 10], elite: true, hp: 900, damage: 24, speed: 4, range: 3, body: 'Skeleton_Warrior', tint: '#a8ffd0', scale: 1.6, loot: [['gravelord_crown', 1], ['bone_charm', 0.3]], gold: [30, 40], boss: { slam: { every: 9, windup: 1.6, radius: 5, damage: 60 } } },
  fen_lurker: { name: 'Fen Lurker', level: [10, 13], hp: 210, damage: 18, speed: 4.2, range: 2.6, body: 'Skeleton_Minion', tint: '#8fbf7a', loot: [['ghostcap', 0.3], ['greater_potion', 0.08]], gold: [8, 12] },
  mire_hexer: { name: 'Mire Hexer', level: [12, 15], hp: 190, damage: 21, speed: 4, range: 22, ranged: true, body: 'Skeleton_Mage', tint: '#9fd890', loot: [['ghostcap', 0.3], ['mana_tonic', 0.3]], gold: [9, 14] },
  ash_reaver: { name: 'Ash Reaver', level: [15, 18], hp: 280, damage: 26, speed: 4.4, range: 2.8, body: 'Skeleton_Warrior', tint: '#ff9a7a', loot: [['ember_shard', 0.25], ['ashen_treads', 0.03], ['marsh_cloak', 0.03]], gold: [12, 18] },
  // The Sunken Crypt
  crypt_guard: { name: 'Drowned Guard', level: [10, 11], elite: true, hp: 420, damage: 20, speed: 4, range: 2.8, body: 'Skeleton_Warrior', tint: '#7fb6c8', loot: [['bone_dust', 0.8], ['iron_ore', 0.3]], gold: [8, 12] },
  crypt_caller: { name: 'Tide Caller', level: [10, 11], elite: true, hp: 300, damage: 22, speed: 4, range: 22, ranged: true, body: 'Skeleton_Mage', tint: '#7fd8e8', loot: [['mana_tonic', 0.4]], gold: [8, 12] },
  kessa: { name: 'Warden Kessa', level: [11, 11], elite: true, boss: { summon: { every: 18, mob: 'rattler', count: 3 }, slam: { every: 10, windup: 1.5, radius: 5, damage: 70 } }, hp: 2200, damage: 30, speed: 4, range: 3, body: 'Skeleton_Rogue', tint: '#9fe0ff', scale: 1.7, loot: [['kessa_band', 0.6], ['greater_potion', 1]], gold: [40, 60] },
  drowned_king: { name: 'The Drowned King', level: [12, 12], elite: true, boss: { nova: { every: 14, windup: 2.2, radius: 9, damage: 90 }, slam: { every: 8, windup: 1.4, radius: 4.5, damage: 80 }, enrage: { below: 0.25, more: 0.5 } }, hp: 3400, damage: 34, speed: 4, range: 3.4, body: 'Skeleton_Warrior', tint: '#6fd0ff', scale: 2.1, loot: [['drowned_blade', 0.5], ['drowned_greaves', 0.5], ['greater_potion', 1]], gold: [80, 110] },
  // The Ember Spire
  ember_guard: { name: 'Ember Sentinel', level: [19, 19], elite: true, hp: 1400, damage: 45, speed: 4, range: 3, body: 'Skeleton_Warrior', tint: '#ff8a50', loot: [['ember_shard', 1]], gold: [20, 30] },
  cinderwing: { name: 'Cinderwing, the Ash Colossus', level: [20, 20], elite: true, boss: { slam: { every: 7, windup: 1.6, radius: 6, damage: 140 }, nova: { every: 20, windup: 2.6, radius: 13, damage: 160 }, summon: { every: 25, mob: 'ember_guard', count: 2 }, enrage: { below: 0.3, more: 0.6 } }, hp: 16000, damage: 70, speed: 4, range: 4, body: 'Skeleton_Warrior', tint: '#ff6a3a', scale: 3.2, loot: [['cinder_edge', 0.35], ['ember_crest', 0.5], ['ember_shard', 1]], gold: [200, 300] }
};

/* ----------------------------------------------- gathering and crafting */

export const PROFESSIONS = { mining: 'Mining', herbalism: 'Herbalism', logging: 'Logging', smithing: 'Smithing', alchemy: 'Alchemy', woodcraft: 'Woodcraft' };

export const NODES = {
  copper: { name: 'Copper Vein', skill: 'mining', need: 1, item: 'copper_ore', time: 2, respawn: 45, color: '#c87a3a' },
  iron: { name: 'Iron Vein', skill: 'mining', need: 25, item: 'iron_ore', time: 2.5, respawn: 60, color: '#9aa0a8' },
  sunleaf: { name: 'Sunleaf', skill: 'herbalism', need: 1, item: 'sunleaf', time: 1.6, respawn: 40, color: '#f2d24a' },
  ghostcap: { name: 'Ghostcap', skill: 'herbalism', need: 25, item: 'ghostcap', time: 2, respawn: 55, color: '#b8e0ff' },
  ash: { name: 'Ash Tree', skill: 'logging', need: 1, item: 'ash_log', time: 2.2, respawn: 50, color: '#8a6a4a' }
};

/** Recipes, made at a station in Hearthvale: anvil (smithing), cauldron (alchemy), bench (woodcraft). */
export const RECIPES = {
  r_potion: { name: 'Minor Healing Draught', skill: 'alchemy', need: 1, station: 'cauldron', makes: ['minor_potion', 2], uses: [['sunleaf', 2]] },
  r_tonic: { name: 'Mana Tonic', skill: 'alchemy', need: 10, station: 'cauldron', makes: ['mana_tonic', 2], uses: [['sunleaf', 1], ['bone_dust', 1]] },
  r_greater: { name: 'Greater Healing Draught', skill: 'alchemy', need: 30, station: 'cauldron', makes: ['greater_potion', 1], uses: [['ghostcap', 2], ['sunleaf', 1]] },
  r_copper_blade: { name: 'Copper Blade', skill: 'smithing', need: 1, station: 'anvil', makes: ['copper_blade', 1], uses: [['copper_ore', 6]] },
  r_copper_helm: { name: 'Copper Helm', skill: 'smithing', need: 10, station: 'anvil', makes: ['copper_helm', 1], uses: [['copper_ore', 5]] },
  r_iron_blade: { name: 'Iron Blade', skill: 'smithing', need: 30, station: 'anvil', makes: ['iron_blade', 1], uses: [['iron_ore', 6], ['copper_ore', 2]] },
  r_iron_plate: { name: 'Iron Breastplate', skill: 'smithing', need: 40, station: 'anvil', makes: ['iron_plate', 1], uses: [['iron_ore', 8]] },
  r_ash_bow: { name: 'Ashwood Crossbow', skill: 'woodcraft', need: 1, station: 'bench', makes: ['ash_bow', 1], uses: [['ash_log', 6], ['copper_ore', 1]] },
  r_ash_staff: { name: 'Ashwood Staff', skill: 'woodcraft', need: 1, station: 'bench', makes: ['ash_staff', 1], uses: [['ash_log', 6], ['sunleaf', 2]] }
};

/* -------------------------------------------------------------- quests */

/**
 * Quests: `kill` (mob type, count), `gather` (item, count — taken on
 * turn-in), `talk` (an NPC). `from`/`to` are NPC ids. `after` chains them.
 */
export const QUESTS = {
  q_rattle: { name: 'Rattling in the Fields', from: 'marla', to: 'marla', level: 1, goal: { kill: 'rattler', count: 6 }, text: 'The dead are walking the Greenfold again. Put six of the Rattlebones back in the ground.', reward: { xp: 180, gold: 5, item: 'leather_boots' } },
  q_supplies: { name: 'Ore for the Forge', from: 'brannoc', to: 'brannoc', level: 2, goal: { gather: 'copper_ore', count: 5 }, text: 'My forge is cold. Bring me five Copper Ore from the veins in the Greenfold, and I\'ll teach you a thing or two.', reward: { xp: 160, gold: 4, skill: ['smithing', 5] } },
  q_herbs: { name: 'Sunleaf for the Sick', from: 'ysolde', to: 'ysolde', level: 2, goal: { gather: 'sunleaf', count: 4 }, text: 'Fever in the lower town. Four Sunleaf, and quickly.', reward: { xp: 160, gold: 4, item: 'minor_potion', skill: ['alchemy', 5] } },
  q_archers: { name: 'Arrows from the Graves', from: 'marla', to: 'marla', level: 3, after: 'q_rattle', goal: { kill: 'grave_archer', count: 5 }, text: 'Something taught the dead to shoot. Five Grave Archers, please.', reward: { xp: 320, gold: 8, item: 'traveler_leggings' } },
  q_bandits: { name: 'Rust on the Road', from: 'osric', to: 'osric', level: 4, goal: { kill: 'bandit', count: 6 }, text: 'Bandits are robbing the road to the Fen. Six of them won\'t be robbing anyone.', reward: { xp: 420, gold: 12 } },
  q_cutthroats: { name: 'The Knives in the Dark', from: 'osric', to: 'osric', level: 6, after: 'q_bandits', goal: { kill: 'cutthroat', count: 5 }, text: 'Their leaders hide in the eastern woods. End them.', reward: { xp: 640, gold: 18, item: 'bone_charm' } },
  q_barrow: { name: 'The Barrow Stirs', from: 'marla', to: 'marla', level: 7, after: 'q_archers', goal: { kill: 'barrow_mage', count: 5 }, text: 'The mages of the barrow are raising them. Stop the raisers.', reward: { xp: 760, gold: 20 } },
  q_gravelord: { name: 'The Old Gravelord', from: 'marla', to: 'marla', level: 9, after: 'q_barrow', goal: { kill: 'gravelord', count: 1 }, text: 'At the heart of the barrow sits the Old Gravelord. Bring friends.', reward: { xp: 1400, gold: 40 } },
  q_crypt: { name: 'Beneath the Water', from: 'aldric', to: 'aldric', level: 10, goal: { kill: 'drowned_king', count: 1 }, text: 'The Sunken Crypt under the lake was sealed for a reason. Something broke the seal. Take a party of up to five and end the Drowned King.', reward: { xp: 2600, gold: 80 } },
  q_fen: { name: 'Lights in the Fen', from: 'osric', to: 'osric', level: 11, goal: { kill: 'mire_hexer', count: 6 }, text: 'Hexers in the Ashfen draw travelers into the mud. Six of them.', reward: { xp: 2000, gold: 40 } },
  q_ghostcap: { name: 'Pale Mushrooms', from: 'ysolde', to: 'ysolde', level: 12, goal: { gather: 'ghostcap', count: 6 }, text: 'Ghostcap only grows where the Fen is quiet. I need six for the strong draughts.', reward: { xp: 1600, gold: 30, item: 'greater_potion', skill: ['alchemy', 10] } },
  q_reavers: { name: 'Ash on the Wind', from: 'aldric', to: 'aldric', level: 15, goal: { kill: 'ash_reaver', count: 8 }, text: 'Reavers come down from the Ember Spire. Thin them out.', reward: { xp: 3600, gold: 70 } },
  q_spire: { name: 'The Ash Colossus', from: 'aldric', to: 'aldric', level: 18, after: 'q_reavers', goal: { kill: 'cinderwing', count: 1 }, text: 'At the top of the Ember Spire waits Cinderwing. Gather eight of the bravest.', reward: { xp: 8000, gold: 300 } }
};
