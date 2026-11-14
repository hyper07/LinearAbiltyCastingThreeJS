/**
 * Hearthvale's data: classes and their skills, monsters, items, quests,
 * gathering nodes and recipes. Pure data, read by the server (which runs
 * the worlds) and the browser (which draws them and fills the windows).
 * Everything here — names, classes, places, story — is our own; the bodies
 * are the KayKit Adventurers and Skeletons (CC0, Kay Lousberg).
 */

export const MAX_LEVEL = 20;
export const GCD = 1.0; // seconds between skills
/** The bag: a grid of cells; every item takes the room its shape needs (see `sizeOf`). `BAG_SIZE` is the most things it can hold, however small. */
export const BAG_W = 10;
export const BAG_H = 7;
export const BAG_SIZE = 48;
export const BANK_SIZE = 24;
export const RUN_SPEED = 7;
export const PARTY_MAX = 8;
/** Keys 1–8: skills, potions and food, set as the player likes. */
export const BAR_SIZE = 8;
/** Seconds before another draught of the same kind (health and mana each have their own). */
export const POTION_CD = 15;
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
    id: 'vanguard', name: 'Vanguard', role: 'Tank', resource: 'Resolve', main: 'str', threat: 1.5, melee: 'onehand',
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
    id: 'ranger', name: 'Ranger', role: 'Damage', resource: 'Focus', main: 'agi',
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
    id: 'arcanist', name: 'Arcanist', role: 'Damage', resource: 'Mana', main: 'int', caster: true,
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
    id: 'mender', name: 'Mender', role: 'Healer', resource: 'Mana', main: 'int', caster: true,
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
  },
  berserker: {
    id: 'berserker', name: 'Berserker', role: 'Damage', resource: 'Fury', main: 'str', melee: 'twohand',
    blurb: 'A great axe and no shield. Hits hardest when the fight is thickest, and drinks back what it spills.',
    body: 'Barbarian', show: ['2H_Axe'], tint: '#ffd0c0', attack: '2H_Melee_Attack_Chop',
    base: { hp: 120, hpL: 24, mana: 100, manaL: 0, power: 11, powerL: 2.9, armor: 8, armorL: 2.2, range: 2.8, speed: 2.6, regen: 8 },
    skills: [
      { id: 'cleaving', anim: '2H_Melee_Attack_Slice', fx: 'slash', name: 'Cleaving Blow', kind: 'strike', level: 1, cost: 12, cd: 0, damage: 16, coef: 1.1, icon: '🪓' },
      { id: 'warcry', anim: 'Cheer', fx: 'shout', name: 'War Cry', kind: 'aura', level: 2, cost: 10, cd: 25, buff: { more: 0.2, time: 10 }, icon: '😤' },
      { id: 'whirl', anim: '2H_Melee_Attack_Spin', fx: 'spin', name: 'Whirlwind', kind: 'nova', level: 4, cost: 22, cd: 6, damage: 14, coef: 0.8, radius: 5, icon: '🌪' },
      { id: 'leap', anim: 'Jump_Full_Long', name: 'Leap', kind: 'blink', level: 6, cost: 10, cd: 14, distance: 10, icon: '🦘' },
      { id: 'feast', anim: '2H_Melee_Attack_Chop', fx: 'slash', name: 'Blood Feast', kind: 'strike', level: 8, cost: 18, cd: 12, damage: 20, coef: 1.0, leech: 0.5, icon: '🩸' },
      { id: 'execute', anim: '2H_Melee_Attack_Chop', fx: 'bash', name: 'Executioner', kind: 'strike', level: 12, cost: 35, cd: 20, damage: 40, coef: 2.2, execute: 0.35, icon: '💀' }
    ]
  },
  shadowblade: {
    id: 'shadowblade', name: 'Shadowblade', role: 'Damage', resource: 'Energy', main: 'agi', melee: 'dual',
    blurb: 'Two knives and quick feet. Strikes fast, slips away, and is gone before the blow comes back.',
    body: 'Rogue_Hooded', show: ['Knife', 'Knife_Offhand'], tint: '#d8c8ff', attack: 'Dualwield_Melee_Attack_Slice',
    base: { hp: 100, hpL: 20, mana: 100, manaL: 0, power: 10, powerL: 2.6, armor: 6, armorL: 1.9, range: 2.4, speed: 1.7, regen: 14 },
    skills: [
      { id: 'twin', anim: 'Dualwield_Melee_Attack_Slice', fx: 'slash', name: 'Twin Fangs', kind: 'strike', level: 1, cost: 14, cd: 0, damage: 12, coef: 0.9, icon: '🗡' },
      { id: 'step', anim: 'Dodge_Forward', name: 'Shadowstep', kind: 'blink', level: 2, cost: 10, cd: 12, distance: 9, icon: '👣' },
      { id: 'cripple', anim: 'Dualwield_Melee_Attack_Stab', fx: 'slash', name: 'Crippling Cut', kind: 'strike', level: 4, cost: 16, cd: 8, damage: 8, coef: 0.6, slow: { amount: 0.5, time: 6 }, icon: '🦵' },
      { id: 'fan', anim: 'Throw', fx: 'spin', name: 'Fan of Knives', kind: 'nova', level: 6, cost: 25, cd: 8, damage: 12, coef: 0.7, radius: 6, icon: '✴' },
      { id: 'ambush', anim: 'Dualwield_Melee_Attack_Chop', fx: 'bash', name: 'Ambush', kind: 'strike', level: 8, cost: 30, cd: 14, damage: 26, coef: 1.6, stun: 1.5, icon: '🌑' },
      { id: 'dance', anim: 'Cheer', fx: 'guard', name: 'Blade Dance', kind: 'aura', level: 12, cost: 20, cd: 40, buff: { haste: 0.4, more: 0.1, time: 8 }, icon: '💃' }
    ]
  },
  stormcaller: {
    id: 'stormcaller', name: 'Stormcaller', role: 'Damage', resource: 'Mana', main: 'int', caster: true,
    blurb: 'Lightning that leaps from one foe to the next, and a wind to carry you out of trouble.',
    body: 'Mage', show: ['Spellbook_open'], tint: '#c8e4ff', attack: 'Spellcast_Shoot', ranged: true,
    base: { hp: 95, hpL: 19, mana: 150, manaL: 22, power: 11, powerL: 2.8, armor: 4, armorL: 1.5, range: 26, speed: 2.4, regen: 3 },
    skills: [
      { id: 'spark', name: 'Spark', kind: 'bolt', level: 1, cost: 10, cd: 0, cast: 1.2, range: 28, damage: 16, coef: 1.1, icon: '⚡' },
      { id: 'grip', name: 'Static Grip', kind: 'bolt', level: 2, cost: 16, cd: 10, range: 26, damage: 8, coef: 0.5, stun: 1.5, icon: '🧲' },
      { id: 'chain', name: 'Chain Lightning', kind: 'area', level: 4, cost: 28, cd: 6, cast: 1.5, range: 28, radius: 6, damage: 14, coef: 0.9, icon: '🌩' },
      { id: 'stormshield', anim: 'Spellcast_Raise', fx: 'guard', name: 'Storm Shield', kind: 'aura', level: 6, cost: 22, cd: 22, shield: 35, coef: 1.3, icon: '🌀' },
      { id: 'gale', anim: 'Dodge_Forward', name: 'Gale Step', kind: 'blink', level: 8, cost: 14, cd: 16, distance: 11, icon: '💨' },
      { id: 'tempest', anim: 'Spellcast_Raise', name: 'Tempest', kind: 'area', level: 12, cost: 55, cd: 22, cast: 2.4, range: 30, radius: 8, damage: 34, coef: 2.0, icon: '⛈' }
    ]
  },
  templar: {
    id: 'templar', name: 'Templar', role: 'Tank · Healer', resource: 'Mana', main: 'str', threat: 1.3, melee: 'onehand',
    blurb: 'Sword, shield and a prayer. Stands in front, mends who stands beside, and judges what stands against.',
    body: 'Knight', show: ['1H_Sword', 'Badge_Shield'], tint: '#fff2c0', attack: '1H_Melee_Attack_Chop',
    base: { hp: 120, hpL: 24, mana: 120, manaL: 12, power: 9, powerL: 2.4, armor: 11, armorL: 2.8, range: 2.6, speed: 2.3, regen: 4 },
    skills: [
      { id: 'righteous', anim: '1H_Melee_Attack_Slice_Diagonal', fx: 'slash', name: 'Righteous Blow', kind: 'strike', level: 1, cost: 12, cd: 0, damage: 13, coef: 1.0, threat: 1.4, icon: '⚔' },
      { id: 'holylight', anim: 'Spellcast_Raise', name: 'Holy Light', kind: 'heal', level: 2, cost: 20, cd: 0, cast: 1.5, range: 24, heal: 26, coef: 1.3, icon: '✨' },
      { id: 'consecrate', anim: 'Spellcast_Raise', fx: 'spin', name: 'Consecrate', kind: 'nova', level: 4, cost: 22, cd: 8, damage: 10, coef: 0.6, radius: 5, threat: 1.8, icon: '🔆' },
      { id: 'aegis', anim: 'Block', fx: 'guard', name: 'Aegis', kind: 'aura', level: 6, cost: 15, cd: 28, buff: { reduce: 0.3, time: 8 }, icon: '🛡' },
      { id: 'judge', anim: 'Block_Attack', fx: 'bash', name: 'Judgement', kind: 'strike', level: 8, cost: 20, cd: 14, damage: 20, coef: 1.2, stun: 2, threat: 2, icon: '⚖' },
      { id: 'bene', anim: 'Cheer', fx: 'shout', name: 'Benediction', kind: 'nova', level: 12, cost: 40, cd: 40, radius: 14, heal: 35, coef: 1.1, friendly: true, icon: '🕯' }
    ]
  }
};
export const CLASS_ORDER = ['vanguard', 'berserker', 'templar', 'shadowblade', 'ranger', 'arcanist', 'stormcaller', 'mender'];

/* ---------------------------------------------- attributes and the tree */

/**
 * Attributes, raised with the five points every level brings. Each does
 * something for everyone, and a class's `main` one adds to its power too.
 */
export const ATTRS = {
  str: { name: 'Strength', does: '+1 armor', icon: '💪' },
  agi: { name: 'Agility', does: '+0.25% critical chance, +0.3% attack speed', icon: '🏹' },
  int: { name: 'Intellect', does: '+4 mana, a little faster to return', icon: '🧠' },
  vit: { name: 'Vitality', does: '+8 health', icon: '❤' }
};
export const ATTR_ORDER = ['str', 'agi', 'int', 'vit'];
export const POINTS = { attrs: 5, skills: 2, mainPower: 0.4, skillMax: 5, passiveMax: 3, runeMax: 2, gate: 8, rank: 0.1, respec: 10 };

/** What a passive rank adds: [the stat it touches, how much a rank is worth, how to say it]. */
const P = {
  power: ['powerPct', 4, '+4% power'], hp: ['hpPct', 5, '+5% health'], armor: ['armorPct', 6, '+6% armor'], mana: ['manaPct', 8, '+8% mana'],
  crit: ['crit', 3, '+3% critical chance'], haste: ['haste', 4, '+4% attack speed'], cost: ['costCut', 5, 'skills cost 5% less'], cd: ['cdCut', 5, 'cooldowns 5% shorter'],
  heal: ['healPct', 6, '+6% healing done'], leech: ['leech', 2, '2% of your damage returns as health'], threat: ['threatPct', 15, '+15% threat'], regen: ['regenPct', 12, 'your resource returns 12% faster']
};
/** Each class's three paths: a skill, a passive it opens, a second skill, a second passive. */
const PATHS = {
  vanguard: [['Blade', 'strike', ['Honed Edge', 'power'], 'slam', ['Deep Cuts', 'crit']], ['Bulwark', 'taunt', ['Thick Hide', 'armor'], 'wall', ['Unbreakable', 'hp']], ['Command', 'cleave', ['Commanding Presence', 'threat'], 'rally', ['Second Wind', 'regen']]],
  berserker: [['Fury', 'cleaving', ['Rage', 'power'], 'whirl', ['Frenzy', 'haste']], ['Blood', 'warcry', ['Thick Blood', 'hp'], 'feast', ['Vampiric', 'leech']], ['Doom', 'leap', ['Brutal', 'crit'], 'execute', ['Relentless', 'cd']]],
  templar: [['Wrath', 'righteous', ['Zeal', 'power'], 'judge', ['Verdict', 'crit']], ['Shield', 'consecrate', ['Bastion', 'armor'], 'aegis', ['Stalwart', 'hp']], ['Mercy', 'holylight', ['Blessed Hands', 'heal'], 'bene', ['Faithful', 'mana']]],
  shadowblade: [['Fangs', 'twin', ['Sharpened', 'power'], 'ambush', ['Lethal', 'crit']], ['Shadow', 'step', ['Fleet', 'haste'], 'dance', ['Slippery', 'armor']], ['Knives', 'cripple', ['Thrift', 'cost'], 'fan', ['Bloodletter', 'leech']]],
  ranger: [['Marksman', 'quick', ['Steady Aim', 'crit'], 'aimed', ['Piercing', 'power']], ['Trapper', 'hamstring', ['Light Feet', 'haste'], 'roll', ['Survivor', 'hp']], ['Hunter', 'volley', ['Efficient', 'cost'], 'mark', ['Quick Reload', 'cd']]],
  arcanist: [['Fire', 'firebolt', ['Kindling', 'power'], 'ring', ['Wildfire', 'crit']], ['Frost', 'frost', ['Deep Chill', 'cost'], 'barrier', ['Ice Veins', 'hp']], ['Arcane', 'blink', ['Clear Mind', 'mana'], 'meteor', ['Overflow', 'cd']]],
  stormcaller: [['Lightning', 'spark', ['Charged', 'power'], 'chain', ['Overload', 'crit']], ['Wind', 'grip', ['Tailwind', 'cd'], 'gale', ['Squall', 'haste']], ['Tempest', 'stormshield', ['Deep Well', 'mana'], 'tempest', ['Eye of the Storm', 'cost']]],
  mender: [['Light', 'mend', ['Gentle Hands', 'heal'], 'radiance', ['Grace', 'cd']], ['Faith', 'smite', ['Zeal', 'power'], 'ward', ['Devotion', 'mana']], ['Life', 'renew', ['Wellspring', 'regen'], 'revive', ['Fortitude', 'hp']]]
};
/** What a rune does to its skill, a rank: [a word for its name, how much, how to say it]. */
export const RUNES = {
  dmg: ['Brutal', 15, '+15% damage'], leech: ['Draining', 8, 'returns 8% of its damage as health'], cd: ['Swift', 12, 'cooldown 12% shorter'],
  cost: ['Thrifty', 15, 'costs 15% less'], radius: ['Wide', 18, 'reaches 18% wider'], cast: ['Quick', 15, 'casts 15% faster'],
  last: ['Lasting', 25, 'lasts 25% longer'], shield: ['Thick', 20, 'its shield is 20% stronger'], heal: ['Blessed', 15, 'heals 15% more'],
  ward: ['Warding', 6, 'leaves you a shield worth 6% of your health'], stun: ['Stunning', 0.4, 'stuns 0.4s longer']
};
/** The two runes a skill gets, by what it is. */
function runesFor(k) {
  switch (k.kind) {
    case 'strike': return k.stun ? ['dmg', 'stun'] : k.slow ? ['dmg', 'last'] : k.leech ? ['dmg', 'cd'] : ['dmg', 'leech'];
    case 'bolt': return k.stun ? ['stun', 'cd'] : k.slow ? ['dmg', 'last'] : k.mark ? ['last', 'cd'] : k.cast ? ['dmg', 'cast'] : ['dmg', 'cost'];
    case 'area': return ['radius', 'dmg'];
    case 'nova': return k.friendly ? ['heal', 'radius'] : ['radius', 'dmg'];
    case 'aura': return k.shield ? ['shield', 'cd'] : ['last', 'cd'];
    case 'heal': return k.shield ? ['shield', 'cost'] : k.hot ? ['heal', 'last'] : ['heal', k.cast ? 'cast' : 'cost'];
    case 'revive': return ['cast', 'cd'];
    default: return ['cd', 'ward']; // blink, taunt
  }
}
/** What mastering a path gives, by which path it is. */
const MASTERY = [{ powerPct: 12 }, { hpPct: 10, armorPct: 10 }, { cdCut: 8, costCut: 8 }];
const MASTERY_TEXT = ['+12% power', '+10% health and armor', 'skills cost 8% less, cooldowns 8% shorter'];

/**
 * The skill trees: per class, three paths of ten nodes on a grid three wide
 * and five deep (`col`, `row`), each joined to the node it `needs`:
 *
 *        [skill A]                 A: the path's first skill
 *   [rune]       [passive]         a rune changes its skill; a passive is yours for good
 *   [rune] [skill B] [passive]
 *   [rune] [synergy]               the synergy strengthens both skills
 *   [rune] [mastery]               the mastery asks for eight points in the path
 *
 * A node needs a rank in the one it hangs from, and its own level. Skills go
 * to rank 5 (+10% a rank), runes to 2, passives and the synergy to 3, the
 * mastery to 1. Two points come with every level; level-1 skills are free.
 */
export const TREES = Object.fromEntries(Object.entries(PATHS).map(([cls, paths]) => [cls, paths.map(([name, a, pa, b, pb], bi) => {
  const skill = (id) => CLASSES[cls].skills.find((k) => k.id === id);
  const A = skill(a);
  const B = skill(b);
  const id = (key) => `${cls}.${bi}.${key}`;
  const active = (k) => ({ id: k.id, kind: 'skill', name: k.name, max: POINTS.skillMax, level: k.level, icon: k.icon, free: k.level === 1 });
  const passive = (key, [title, stat], level) => ({ id: id(key), kind: 'passive', name: title, max: POINTS.passiveMax, stat: P[stat][0], per: P[stat][1], text: `${P[stat][2]} a rank`, icon: '◆', level });
  const rune = (key, k, i, level) => {
    const effect = runesFor(k)[i];
    return { id: id(key), kind: 'rune', name: `${RUNES[effect][0]} ${k.name}`, max: POINTS.runeMax, skill: k.id, effect, per: RUNES[effect][1], text: `${k.name} ${RUNES[effect][2]} a rank`, icon: k.icon, level };
  };
  const late = Math.max(A.level, B.level);
  const nodes = [
    { ...active(A), col: 1, row: 0, needs: null },
    { ...rune('a1', A, 0, A.level + 1), col: 0, row: 1, needs: A.id },
    { ...passive('p1', pa, A.level + 1), col: 2, row: 1, needs: A.id },
    { ...rune('a2', A, 1, A.level + 3), col: 0, row: 2, needs: id('a1') },
    { ...active(B), col: 1, row: 2, needs: A.id },
    { ...passive('p2', pb, A.level + 4), col: 2, row: 2, needs: id('p1') },
    { ...rune('b1', B, 0, B.level + 1), col: 0, row: 3, needs: B.id },
    { id: id('syn'), kind: 'synergy', name: `${name} Synergy`, max: POINTS.passiveMax, skills: [A.id, B.id], per: 8, text: `${A.name} and ${B.name} do 8% more a rank`, icon: '∞', level: B.level + 1, col: 1, row: 3, needs: B.id },
    { ...rune('b2', B, 1, B.level + 3), col: 0, row: 4, needs: id('b1') },
    { id: id('m'), kind: 'mastery', name: `${name} Mastery`, max: 1, stats: MASTERY[bi], text: MASTERY_TEXT[bi], icon: '★', level: Math.min(MAX_LEVEL - 2, late + 3), gate: POINTS.gate, col: 1, row: 4, needs: id('syn') }
  ];
  nodes.forEach((n) => (n.branch = bi));
  return { name, nodes };
})]));
/** Every node of a class's tree, by id. */
export const NODES_OF = Object.fromEntries(Object.entries(TREES).map(([cls, paths]) => [cls, Object.fromEntries(paths.flatMap((p) => p.nodes).map((n) => [n.id, n]))]));

/* -------------------------------------------------------------- items */

/**
 * Items: `slot` for gear (stats: power, stamina, armor), `use` for
 * consumables, `mat` for materials. `value` is what a vendor pays (they sell at four times that).
 */
const FIXED_ITEMS = {
  // Gear
  rusty_sword: { name: 'Rusty Sword', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  oak_staff: { name: 'Oak Staff', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  worn_crossbow: { name: 'Worn Crossbow', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  apprentice_wand: { name: 'Apprentice Wand', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  chipped_axe: { name: 'Chipped Great Axe', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
  worn_daggers: { name: 'Worn Daggers', slot: 'weapon', level: 1, stats: { power: 2 }, value: 2 },
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

/* ------------------------------------------------- found gear (generated) */

/**
 * Gear that monsters drop is made, not listed: a base (what it is), a
 * rarity, a level and a seed, written into its id — `~sword.2.9.k3f` — and
 * everything else (name, stats, value) follows from those four, the same on
 * the server and in every browser. Nothing about an item can be forged: an
 * id either decodes to exactly what it always was, or to nothing.
 */
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'unique'];
export const RARITY_INFO = {
  common: { name: 'Common', mult: 1, affixes: 0, color: '#e8edf3' },
  uncommon: { name: 'Uncommon', mult: 1.25, affixes: 1, color: '#5fe07a' },
  rare: { name: 'Rare', mult: 1.55, affixes: 2, color: '#5aa7ff' },
  epic: { name: 'Epic', mult: 1.9, affixes: 3, color: '#c084fc' },
  unique: { name: 'Unique', mult: 2.3, affixes: 3, color: '#ff9a3c' }
};
/** What can be found: its slot, and how its worth is shared between stats. */
export const BASES = {
  sword: { name: 'Sword', slot: 'weapon', power: 1, size: [1, 3] }, axe: { name: 'Great Axe', slot: 'weapon', power: 1.05, size: [2, 3] }, daggers: { name: 'Daggers', slot: 'weapon', power: 0.95, size: [1, 2] },
  crossbow: { name: 'Crossbow', slot: 'weapon', power: 1, size: [2, 3] }, staff: { name: 'Staff', slot: 'weapon', power: 1, size: [1, 4] }, wand: { name: 'Wand', slot: 'weapon', power: 0.95, size: [1, 2] },
  helm: { name: 'Helm', slot: 'head', armor: 0.8, stamina: 0.3, size: [2, 2] }, hauberk: { name: 'Hauberk', slot: 'chest', armor: 1.3, stamina: 0.4, size: [2, 3] },
  greaves: { name: 'Greaves', slot: 'legs', armor: 0.9, stamina: 0.35, size: [2, 2] }, boots: { name: 'Boots', slot: 'feet', armor: 0.6, stamina: 0.25, size: [2, 2] },
  charm: { name: 'Charm', slot: 'trinket', power: 0.4, stamina: 0.35, size: [1, 1] }
};
/** The weapon each class would rather find. */
export const WEAPON_OF = { vanguard: 'sword', templar: 'sword', berserker: 'axe', shadowblade: 'daggers', ranger: 'crossbow', arcanist: 'staff', stormcaller: 'wand', mender: 'wand' };
/** Extra properties on better gear: [stat, share of the item's worth, a word before the name, a word after]. */
const AFFIXES = [
  ['stamina', 0.3, 'Stout', 'of the Bear'], ['power', 0.22, 'Fierce', 'of the Wolf'], ['armor', 0.35, 'Warded', 'of the Tortoise'],
  ['crit', 0.14, 'Keen', 'of the Hawk'], ['haste', 0.16, 'Swift', 'of the Hare'], ['stamina', 0.36, 'Hale', 'of the Ox'], ['power', 0.26, 'Savage', 'of the Boar']
];
const UNIQUE_NAMES = ['Hollow Sun', 'Widow\'s Promise', 'Last Ember', 'The Quiet Hour', 'Greywater', 'Oathkeeper\'s Burden', 'Thornmother', 'Winter\'s Tooth', 'The Long Road', 'Saltwind', 'Mirefang', 'Dawnbreaker\'s Rest', 'Cinderheart', 'The Ninth Bell', 'Stormglass', 'Barrowlight'];

/** The id of a found item. */
export const foundId = (base, rarity, level, seed) => `~${base}.${RARITIES.indexOf(rarity)}.${level}.${(seed >>> 0).toString(36)}`;
const FOUND_RE = /^~([a-z]+)\.([0-4])\.(\d{1,2})\.([0-9a-z]{1,7})$/;
const found = new Map();

function decodeFound(id) {
  if (found.has(id)) return found.get(id);
  const m = FOUND_RE.exec(id);
  const base = m && BASES[m[1]];
  const level = m ? Number(m[3]) : 0;
  if (!base || level < 1 || level > MAX_LEVEL) return undefined;
  const rarity = RARITIES[Number(m[2])];
  const info = RARITY_INFO[rarity];
  let seed = parseInt(m[4], 36) >>> 0;
  if (foundId(m[1], rarity, level, seed) !== id) return undefined; // one spelling per item
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const worth = (2 + level * 1.1) * info.mult * (0.9 + rand() * 0.2);
  const stats = {};
  const add = (k, v) => {
    const n = k === 'crit' || k === 'haste' ? Math.max(1, Math.round(v * 0.6)) : Math.max(1, Math.round(v));
    stats[k] = (stats[k] ?? 0) + n;
  };
  for (const k of ['power', 'armor', 'stamina']) if (base[k]) add(k, worth * base[k]);
  const words = [];
  const pool = [...AFFIXES];
  for (let i = 0; i < info.affixes; i++) {
    const [k, share, before, after] = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    add(k, worth * share * (rarity === 'unique' ? 1.25 : 1));
    words.push([before, after]);
  }
  const name = rarity === 'unique' ? `${UNIQUE_NAMES[Math.floor(rand() * UNIQUE_NAMES.length)]}, ${base.name}`
    : `${words[0] ? `${words[0][0]} ` : level >= 12 ? 'Tempered ' : level >= 6 ? 'Sturdy ' : 'Worn '}${base.name}${words[1] ? ` ${words[1][1]}` : ''}`;
  const item = Object.freeze({ name, slot: base.slot, level, stats: Object.freeze(stats), value: Math.max(1, Math.round(worth * info.mult * 0.7)), rarity, base: m[1], found: true });
  if (found.size > 20000) found.clear();
  found.set(id, item);
  return item;
}

/** Every item by id: the listed ones, and any found one (decoded from its id). */
export const ITEMS = new Proxy(FIXED_ITEMS, {
  get: (fixed, id) => (typeof id === 'string' && id.charCodeAt(0) === 126 ? decodeFound(id) : fixed[id]),
  has: (fixed, id) => (typeof id === 'string' && id.charCodeAt(0) === 126 ? Boolean(decodeFound(id)) : id in fixed)
});

/** The room a listed piece of gear takes, by where it is worn (a weapon's by what it is). */
const SLOT_SIZE = { head: [2, 2], chest: [2, 3], legs: [2, 2], feet: [2, 2], trinket: [1, 1] };
/**
 * How many cells of the bag an item takes: [wide, tall]. A charm, a draught
 * or a stack of ore is one cell; a sword is one wide and three tall; a great
 * axe, a crossbow or a hauberk two by three; a staff one by four.
 */
export function sizeOf(id) {
  const it = ITEMS[id];
  if (!it?.slot) return [1, 1];
  if (it.base) return BASES[it.base].size;
  if (it.slot !== 'weapon') return SLOT_SIZE[it.slot] ?? [1, 1];
  const name = it.name.toLowerCase();
  if (/axe|crossbow/.test(name)) return [2, 3];
  if (/staff|rod/.test(name)) return [1, 4];
  if (/wand|dagger/.test(name)) return [1, 2];
  return [1, 3];
}

/** How often a kill drops found gear, and how the rarities are weighed. */
/**
 * What a kill drops on the ground: a common piece of gear half the time,
 * and — on its own roll — a better one (`better`; always from an elite, two
 * from a boss), its rarity by `weights`. A drop lies there `lies` seconds,
 * for the one it fell for; walk over it or click it to pick it up.
 */
export const DROPS = { common: 0.5, better: 0.22, weights: { common: 58, uncommon: 28, rare: 10, epic: 3.2, unique: 0.8 }, lies: 180, reach: 4.5, most: 40, shelf: 30, shelfHours: 6 };
/** Holding Shift (or with "always run" on) you move this much faster. */
export const SPRINT = 1.5;

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
  mender: { weapon: 'apprentice_wand', chest: 'padded_vest', bag: [['minor_potion', 3], ['mana_tonic', 3]] },
  berserker: { weapon: 'chipped_axe', chest: 'padded_vest', bag: [['minor_potion', 3], ['bread', 4]] },
  shadowblade: { weapon: 'worn_daggers', chest: 'padded_vest', bag: [['minor_potion', 3], ['bread', 4]] },
  stormcaller: { weapon: 'apprentice_wand', chest: 'padded_vest', bag: [['minor_potion', 3], ['mana_tonic', 3]] },
  templar: { weapon: 'rusty_sword', chest: 'padded_vest', bag: [['minor_potion', 3], ['mana_tonic', 3]] }
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
