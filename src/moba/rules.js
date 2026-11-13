/**
 * Lanebreak's rules: the champions (our own), their four abilities, the
 * items, and the numbers the match (sim.js) runs on. Pure data — the host,
 * the bots, the tests and the HUD all read this one table.
 *
 * Champions wear the KayKit adventurer and skeleton bodies (CC0, Kay
 * Lousberg); everything else — names, kits, numbers — is ours.
 *
 * Ability kinds:
 *   shot   a missile toward the cursor: the first enemy it meets (or all, `pierce`)
 *   area   a circle at the cursor, after `delay`; with `duration`, it lingers and ticks
 *   nova   a circle around the caster, now
 *   dash   a rush toward the cursor; `radius` hits around where it lands, else the first enemy met
 *   blink  a jump to the cursor
 *   target one unit: an enemy (damage, effects) or an ally (shield, heal)
 *   self   a buff on the caster
 * Effects: slow {amount, time}, stun, root, pull, shield, heal, buff {as, ms, ad, armor, lifesteal, time}.
 */

export const TICK = 0.05;
export const MAP = 200; // world units across
export const TEAMS = ['blue', 'red'];
export const TEAM_NAMES = { blue: 'Dawn', red: 'Dusk' };
export const TEAM_COLORS = { blue: '#3d8bff', red: '#ef4f4f' };
export const MAX_LEVEL = 18;
export const RESPAWN = (level) => 6 + level * 1.6;
export const WAVE_EVERY = 25;
export const FIRST_WAVE = 15;
export const PASSIVE_GOLD = 2; // a second, after the first wave
export const START_GOLD = 500;
export const SHOP_RANGE = 22;
export const XP_RANGE = 22;
export const RECALL_TIME = 6;
export const BLINK = { range: 7, cooldown: 120 };
export const MEND = { heal: 90, perLevel: 15, cooldown: 150 };

/** Experience to reach each level (index = level). */
export const XP_TO = [0, 0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440, 13020, 14700, 16480, 18360];

export const GOLD = { melee: 21, caster: 15, siege: 50, kill: 300, assist: 150, tower: 150, towerLocal: 100, camp: 45, warden: 120 };
export const XP = { melee: 60, caster: 30, siege: 90, kill: 220, killPerLevel: 40, camp: 90, warden: 200 };

export const MINIONS = {
  melee: { hp: 450, perWave: 18, damage: 12, range: 1.8, cooldown: 1.25, speed: 5.2, armor: 10, mr: 0, radius: 0.7, sight: 12 },
  caster: { hp: 290, perWave: 10, damage: 22, range: 8, cooldown: 1.6, speed: 5.2, armor: 0, mr: 0, radius: 0.6, sight: 12 },
  siege: { hp: 900, perWave: 40, damage: 40, range: 10, cooldown: 2, speed: 5.0, armor: 30, mr: 0, radius: 1, sight: 12 }
};

export const TOWERS = {
  outer: { hp: 3000, damage: 150, range: 12, armor: 60, mr: 60 },
  inner: { hp: 3300, damage: 170, range: 12, armor: 60, mr: 60 },
  base: { hp: 3300, damage: 180, range: 12, armor: 60, mr: 60 },
  core: { hp: 5000, damage: 0, range: 0, armor: 40, mr: 40 }
};

export const CAMPS = {
  wolf: { name: 'Thornback', hp: 800, damage: 26, armor: 15, mr: 15, range: 2, speed: 6, gold: 60, xp: 110, respawn: 90, body: 'Skeleton_Rogue', tint: '#9fb07a', scale: 1.1 },
  golem: { name: 'Moss Golem', hp: 1000, damage: 32, armor: 25, mr: 15, range: 2.2, speed: 5, gold: 75, xp: 140, respawn: 100, body: 'Skeleton_Warrior', tint: '#7d9a6b', scale: 1.35 },
  warden: { name: 'Riverwarden', hp: 4200, damage: 90, armor: 40, mr: 40, range: 3, speed: 5, gold: 120, xp: 300, respawn: 240, body: 'Skeleton_Warrior', tint: '#b07ae8', scale: 2.2, boon: { ad: 20, ap: 30, time: 120 } }
};

/** Growth with level for every stat a champion has. */
const ROLE_STATS = {
  tank: { hp: 640, hpL: 105, mana: 300, manaL: 40, ad: 62, adL: 3.5, armor: 36, armorL: 4.5, mr: 32, mrL: 2, as: 0.65, asL: 0.02, ms: 7.0, range: 2.2, regen: 9 },
  fighter: { hp: 610, hpL: 100, mana: 280, manaL: 35, ad: 66, adL: 4, armor: 33, armorL: 4, mr: 32, mrL: 1.5, as: 0.68, asL: 0.025, ms: 7.2, range: 2.2, regen: 8 },
  mage: { hp: 530, hpL: 90, mana: 420, manaL: 55, ad: 52, adL: 3, armor: 22, armorL: 4, mr: 30, mrL: 1.3, as: 0.64, asL: 0.015, ms: 6.9, range: 9, regen: 6, ranged: true },
  marksman: { hp: 560, hpL: 92, mana: 330, manaL: 40, ad: 60, adL: 3.4, armor: 26, armorL: 4, mr: 30, mrL: 1.3, as: 0.7, asL: 0.03, ms: 6.9, range: 10, regen: 6, ranged: true },
  assassin: { hp: 570, hpL: 95, mana: 300, manaL: 40, ad: 64, adL: 3.8, armor: 28, armorL: 4, mr: 32, mrL: 1.3, as: 0.68, asL: 0.025, ms: 7.4, range: 2.2, regen: 7 },
  support: { hp: 560, hpL: 92, mana: 400, manaL: 50, ad: 50, adL: 3, armor: 28, armorL: 4, mr: 30, mrL: 1.3, as: 0.62, asL: 0.015, ms: 7.0, range: 8.5, regen: 7, ranged: true }
};

const r5 = (a, b) => [0, 1, 2, 3, 4].map((i) => Math.round(a + ((b - a) * i) / 4));
const r3 = (a, b) => [0, 1, 2].map((i) => Math.round(a + ((b - a) * i) / 2));

/**
 * The champions. `body` is the KayKit model, `show` the weapon meshes it
 * carries, `tint` a colour over its texture, `attack`/`cast` its clips.
 */
export const CHAMPIONS = {
  brakka: {
    id: 'brakka', name: 'Brakka', title: 'the Unbroken Gate', role: 'tank', lane: 'top',
    blurb: 'A shield-wall of a woman who stops a charge cold and holds the line for everyone behind her.',
    body: 'Knight', show: ['1H_Sword', 'Badge_Shield'], tint: '#ffffff', attack: '1H_Melee_Attack_Chop', cast: 'Block_Attack',
    abilities: [
      { key: 'Q', name: 'Shield Bash', kind: 'target', team: 'enemy', range: 4, cd: r5(9, 6), cost: 40, damage: r5(70, 210), ad: 0.5, type: 'physical', stun: 1 },
      { key: 'W', name: 'Iron Hide', kind: 'self', cd: r5(16, 12), cost: 50, shield: r5(80, 240), ap: 0, hpRatio: 0.08, buff: { armor: 25, time: 3 } },
      { key: 'E', name: 'Ground Slam', kind: 'nova', radius: 5, cd: r5(10, 8), cost: 50, damage: r5(60, 180), ap: 0.4, type: 'magic', slow: { amount: 0.35, time: 2 } },
      { key: 'R', name: 'Earthbreaker', kind: 'area', range: 10, radius: 6, delay: 0.6, cd: r3(110, 80), cost: 100, damage: r3(200, 400), ap: 0.6, type: 'magic', stun: 1.4 }
    ]
  },
  torva: {
    id: 'torva', name: 'Torva', title: 'the Red Axe', role: 'fighter', lane: 'top',
    blurb: 'A mountain raider who gets stronger the longer the fight lasts — and harder to kill when it nearly ends.',
    body: 'Barbarian', show: ['2H_Axe', 'Barbarian_Hat'], tint: '#ffd9c2', attack: '2H_Melee_Attack_Chop', cast: '2H_Melee_Attack_Spin',
    abilities: [
      { key: 'Q', name: 'Cleave', kind: 'nova', radius: 4.5, cd: r5(7, 5), cost: 30, damage: r5(60, 200), ad: 0.9, type: 'physical', heal: r5(20, 60) },
      { key: 'W', name: 'Battle Cry', kind: 'self', cd: r5(18, 14), cost: 40, buff: { as: 0.4, ad: 15, time: 4 } },
      { key: 'E', name: 'Charge', kind: 'dash', range: 9, speed: 30, cd: r5(14, 10), cost: 50, damage: r5(50, 150), ad: 0.5, type: 'physical', stun: 0.75 },
      { key: 'R', name: 'Last Stand', kind: 'self', cd: r3(100, 70), cost: 0, heal: r3(150, 350), buff: { lifesteal: 0.35, armor: 30, time: 6 } }
    ]
  },
  sela: {
    id: 'sela', name: 'Sela', title: 'of the Ember Choir', role: 'mage', lane: 'mid',
    blurb: 'A fire-singer who turns any ground into a furnace and ends fights with falling stars.',
    body: 'Mage', show: ['2H_Staff', 'Mage_Hat'], tint: '#ffd2c2', attack: 'Spellcast_Shoot', cast: 'Spellcast_Long',
    abilities: [
      { key: 'Q', name: 'Spark Lance', kind: 'shot', range: 16, speed: 34, width: 1, cd: r5(5, 3.5), cost: 50, damage: r5(80, 240), ap: 0.65, type: 'magic' },
      { key: 'W', name: 'Ember Field', kind: 'area', range: 13, radius: 4, delay: 0.3, duration: 3, cd: r5(12, 9), cost: 70, damage: r5(30, 70), ap: 0.2, type: 'magic', slow: { amount: 0.2, time: 0.6 } },
      { key: 'E', name: 'Phase Step', kind: 'blink', range: 7, cd: r5(16, 12), cost: 60 },
      { key: 'R', name: 'Starfall', kind: 'area', range: 18, radius: 6.5, delay: 1, cd: r3(90, 60), cost: 100, damage: r3(250, 500), ap: 0.8, type: 'magic' }
    ]
  },
  nyla: {
    id: 'nyla', name: 'Nyla', title: 'the Winter Lantern', role: 'mage', lane: 'mid',
    blurb: 'A frost witch who slows the world to a crawl and freezes whoever is left standing in it.',
    body: 'Mage', show: ['1H_Wand', 'Spellbook'], tint: '#c9e6ff', attack: 'Spellcast_Shoot', cast: 'Spellcast_Raise',
    abilities: [
      { key: 'Q', name: 'Frost Orb', kind: 'shot', range: 15, speed: 26, width: 1.3, cd: r5(7, 5), cost: 55, damage: r5(70, 210), ap: 0.6, type: 'magic', slow: { amount: 0.4, time: 1.5 } },
      { key: 'W', name: 'Glacial Ring', kind: 'area', range: 12, radius: 3.5, delay: 0.75, cd: r5(14, 11), cost: 70, damage: r5(60, 160), ap: 0.5, type: 'magic', root: 1.2 },
      { key: 'E', name: 'Chill', kind: 'target', team: 'enemy', range: 10, cd: r5(8, 5), cost: 40, damage: r5(60, 180), ap: 0.5, type: 'magic', slow: { amount: 0.3, time: 2 } },
      { key: 'R', name: 'Blizzard', kind: 'area', range: 14, radius: 7, delay: 0.2, duration: 4, cd: r3(100, 75), cost: 120, damage: r3(50, 110), ap: 0.25, type: 'magic', slow: { amount: 0.5, time: 0.6 } }
    ]
  },
  kiro: {
    id: 'kiro', name: 'Kiro', title: 'the Long Eye', role: 'marksman', lane: 'bot',
    blurb: 'A crossbow scout who hits harder the faster she shoots, and can end a chase from across the map.',
    body: 'Rogue', show: ['2H_Crossbow'], tint: '#ffffff', attack: '2H_Ranged_Shoot', cast: '2H_Ranged_Shoot',
    abilities: [
      { key: 'Q', name: 'Rapid Fire', kind: 'self', cd: r5(12, 9), cost: 40, buff: { as: r5(30, 70).map((v) => v / 100), time: 4 } },
      { key: 'W', name: 'Piercing Bolt', kind: 'shot', range: 18, speed: 45, width: 1, pierce: true, cd: r5(9, 6), cost: 60, damage: r5(60, 220), ad: 1.0, type: 'physical' },
      { key: 'E', name: 'Tumble', kind: 'dash', range: 6, speed: 34, cd: r5(14, 10), cost: 40 },
      { key: 'R', name: 'Long Shot', kind: 'shot', range: 60, speed: 60, width: 1.6, cd: r3(90, 65), cost: 100, damage: r3(250, 550), ad: 1.2, type: 'physical' }
    ]
  },
  vex: {
    id: 'vex', name: 'Vex', title: 'the Quiet Knife', role: 'assassin', lane: 'mid',
    blurb: 'A hooded blade who slips in, finishes the weakest, and is gone before anyone turns.',
    body: 'Rogue_Hooded', show: ['Knife', 'Knife_Offhand'], tint: '#d8d0ff', attack: 'Dualwield_Melee_Attack_Stab', cast: 'Throw',
    abilities: [
      { key: 'Q', name: 'Shadow Dagger', kind: 'shot', range: 13, speed: 40, width: 0.9, cd: r5(6, 4), cost: 40, damage: r5(70, 230), ad: 0.7, type: 'physical' },
      { key: 'W', name: 'Smoke Step', kind: 'self', cd: r5(16, 12), cost: 50, buff: { ms: 0.4, time: 2.5 } },
      { key: 'E', name: 'Lunge', kind: 'dash', range: 8, speed: 36, cd: r5(12, 8), cost: 50, damage: r5(50, 170), ad: 0.6, type: 'physical' },
      { key: 'R', name: 'Execution', kind: 'target', team: 'enemy', range: 4, cd: r3(80, 50), cost: 100, damage: r3(150, 350), ad: 1.0, type: 'physical', missing: 0.4 }
    ]
  },
  maru: {
    id: 'maru', name: 'Maru', title: 'the Bone Oracle', role: 'support', lane: 'bot',
    blurb: 'An old soul in an older skeleton, who binds enemies in place and keeps friends on their feet.',
    body: 'Skeleton_Mage', show: [], tint: '#f2f0ff', attack: 'Spellcast_Shoot', cast: 'Spellcast_Summon',
    abilities: [
      { key: 'Q', name: 'Soul Bind', kind: 'shot', range: 14, speed: 28, width: 1.2, cd: r5(12, 9), cost: 60, damage: r5(60, 180), ap: 0.5, type: 'magic', root: 1.5 },
      { key: 'W', name: 'Mend Wave', kind: 'nova', radius: 9, team: 'ally', cd: r5(14, 10), cost: 80, heal: r5(60, 160), ap: 0.35 },
      { key: 'E', name: 'Ward of Bone', kind: 'target', team: 'ally', range: 10, cd: r5(12, 9), cost: 60, shield: r5(70, 200), ap: 0.4 },
      { key: 'R', name: 'Sanctuary', kind: 'area', range: 10, radius: 7, team: 'ally', delay: 0, cd: r3(100, 75), cost: 100, heal: r3(150, 300), ap: 0.5, buff: { armor: 30, time: 4 } }
    ]
  },
  rook: {
    id: 'rook', name: 'Rook', title: 'the Chain Warden', role: 'tank', lane: 'bot',
    blurb: 'A rattling jailer who drags his prisoners home — then knocks the rest of them flat.',
    body: 'Skeleton_Warrior', show: [], tint: '#e6e2d8', attack: '1H_Melee_Attack_Slice_Horizontal', cast: 'Throw',
    abilities: [
      { key: 'Q', name: 'Grapple', kind: 'shot', range: 15, speed: 32, width: 1.1, cd: r5(18, 13), cost: 80, damage: r5(80, 240), ap: 0.6, type: 'magic', pull: true, stun: 0.5 },
      { key: 'W', name: 'Overcharge', kind: 'self', cd: r5(14, 11), cost: 50, buff: { ms: 0.3, as: 0.3, time: 3 } },
      { key: 'E', name: 'Shockwave', kind: 'nova', radius: 4.5, cd: r5(10, 7), cost: 50, damage: r5(60, 180), ap: 0.5, type: 'magic', stun: 0.8 },
      { key: 'R', name: 'Iron Rain', kind: 'area', range: 12, radius: 7, delay: 0.8, cd: r3(100, 75), cost: 100, damage: r3(180, 380), ap: 0.6, type: 'magic', slow: { amount: 0.6, time: 2 } }
    ]
  }
};
export const CHAMPION_ORDER = ['brakka', 'torva', 'sela', 'nyla', 'kiro', 'vex', 'maru', 'rook'];

/** The base numbers for a champion at a level. */
export function baseStats(champId, level) {
  const role = ROLE_STATS[CHAMPIONS[champId].role];
  const l = level - 1;
  return {
    hp: role.hp + role.hpL * l,
    mana: role.mana + role.manaL * l,
    ad: role.ad + role.adL * l,
    ap: 0,
    armor: role.armor + role.armorL * l,
    mr: role.mr + role.mrL * l,
    as: role.as * (1 + role.asL * l),
    ms: role.ms,
    range: role.range,
    regen: role.regen + l * 0.6,
    manaRegen: 4 + l * 0.4,
    lifesteal: 0,
    haste: 0,
    ranged: Boolean(role.ranged)
  };
}

/** The shop. Finished items come from parts in a real game; here, one price each. */
export const ITEMS = {
  blade: { name: 'Long Blade', cost: 350, icon: '🗡', stats: { ad: 12 } },
  tome: { name: 'Spell Tome', cost: 400, icon: '📘', stats: { ap: 22 } },
  bow: { name: 'Quick Bow', cost: 300, icon: '🏹', stats: { as: 0.15 } },
  plate: { name: 'Iron Plate', cost: 300, icon: '🛡', stats: { armor: 18 } },
  cloak: { name: 'Hush Cloak', cost: 300, icon: '🧥', stats: { mr: 20 } },
  gem: { name: 'Vital Gem', cost: 400, icon: '❤', stats: { hp: 180 } },
  boots: { name: 'Swift Boots', cost: 450, icon: '👢', stats: { ms: 1.1 } },
  crystal: { name: 'Blue Crystal', cost: 350, icon: '💠', stats: { mana: 250, manaRegen: 2 } },
  reaver: { name: 'Bloodreaver', cost: 1500, icon: '⚔', stats: { ad: 45, lifesteal: 0.15 } },
  storm: { name: 'Stormcaller Staff', cost: 1600, icon: '🔱', stats: { ap: 80, haste: 15 } },
  bulwark: { name: 'Bulwark Mail', cost: 1400, icon: '🏰', stats: { hp: 350, armor: 45 } },
  windfury: { name: 'Windfury Bow', cost: 1500, icon: '🌪', stats: { as: 0.45, ad: 20, ms: 0.4 } },
  aegis: { name: 'Spirit Aegis', cost: 1400, icon: '✨', stats: { hp: 300, mr: 45, regen: 4 } },
  hourglass: { name: 'Sage Hourglass', cost: 1500, icon: '⌛', stats: { ap: 60, armor: 35, haste: 10 } }
};
export const ITEM_ORDER = ['blade', 'tome', 'bow', 'plate', 'cloak', 'gem', 'boots', 'crystal', 'reaver', 'storm', 'bulwark', 'windfury', 'aegis', 'hourglass'];

/** What a bot of each role buys, in order. */
export const BUILDS = {
  tank: ['boots', 'gem', 'plate', 'bulwark', 'aegis', 'gem'],
  fighter: ['boots', 'blade', 'reaver', 'plate', 'bulwark', 'aegis'],
  mage: ['boots', 'tome', 'crystal', 'storm', 'hourglass', 'storm'],
  marksman: ['boots', 'bow', 'blade', 'windfury', 'reaver', 'windfury'],
  assassin: ['boots', 'blade', 'reaver', 'plate', 'reaver', 'windfury'],
  support: ['boots', 'crystal', 'aegis', 'tome', 'hourglass', 'bulwark']
};

/** Which ability a bot ranks up at each point: R when it can, then its main one. */
export const SKILL_ORDER = [0, 1, 2, 0, 0, 3, 0, 1, 0, 1, 3, 1, 1, 2, 2, 3, 2, 2];

export const DIFFICULTIES = {
  easy: { name: 'Easy', think: 0.6, aim: 0.55, lastHit: 0.4, bravery: 0.7, abilities: 0.5 },
  normal: { name: 'Normal', think: 0.3, aim: 0.8, lastHit: 0.75, bravery: 1, abilities: 0.85 },
  hard: { name: 'Hard', think: 0.15, aim: 0.95, lastHit: 0.95, bravery: 1.15, abilities: 1 }
};
