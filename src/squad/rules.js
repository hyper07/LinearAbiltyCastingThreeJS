/**
 * Bastion Squad's numbers: the four soldiers, the dead that come for them,
 * the fifteen waves, what credits buy, how hard each difficulty is. Our own
 * game in the co-op "special forces" style: a squad holds a frontier
 * outpost's reactor against the risen dead, wave after wave.
 */

export const TICK = 1 / 20;

/**
 * The soldiers. `gun` is their weapon (damage a shot, shots a second, reach
 * in metres); `skills` are Q, W and E. Every class can heal a little — the
 * Medic most of all — and everyone can lift a downed teammate.
 */
export const CLASSES = {
  rifleman: {
    name: 'Rifleman',
    role: 'Steady damage at range',
    color: '#4f8cff',
    weapon: 'vantage',
    hp: 230,
    armor: 2,
    speed: 6,
    gun: { dmg: 15, rate: 6, range: 15 },
    skills: [
      { id: 'focus', name: 'Focus Fire', key: 'Q', cd: 18, target: 'self', text: 'Fire half again as fast for 6 s.' },
      { id: 'frag', name: 'Frag Grenade', key: 'W', cd: 9, target: 'ground', range: 15, radius: 4.5, power: 70, text: 'A grenade: 70 damage across 4.5 m.' },
      { id: 'sprint', name: 'Sprint', key: 'E', cd: 14, target: 'self', text: 'Run 60% faster for 4 s.' }
    ]
  },
  medic: {
    name: 'Medic',
    role: 'Keeps the squad standing',
    color: '#3ddc84',
    weapon: 'wasp',
    hp: 210,
    armor: 1,
    speed: 6.2,
    gun: { dmg: 9, rate: 5, range: 12 },
    // Between shots, the Medic heals the most hurt soldier within reach.
    aura: { heal: 14, range: 9 },
    skills: [
      { id: 'mend', name: 'Mend', key: 'Q', cd: 6, target: 'ally', range: 12, power: 130, text: 'Heal one soldier (or yourself) by 130 at once.' },
      { id: 'field', name: 'Restoration Field', key: 'W', cd: 20, target: 'ground', range: 12, radius: 6, power: 28, text: 'Ground that heals 28 a second for 7 s.' },
      { id: 'revive', name: 'Revive Pulse', key: 'E', cd: 45, target: 'self', radius: 10, text: 'Lift every downed soldier within 10 m, at half health.' }
    ]
  },
  gunner: {
    name: 'Gunner',
    role: 'Holds the line, soaks the hits',
    color: '#ff8a2a',
    weapon: 'anvil',
    hp: 340,
    armor: 4,
    speed: 5,
    gun: { dmg: 8, rate: 12, range: 13 },
    skills: [
      { id: 'lockdown', name: 'Lockdown', key: 'Q', cd: 20, target: 'self', text: 'Plant your feet for 6 s: +8 armour, +50% damage, no moving.' },
      { id: 'rocket', name: 'Rocket', key: 'W', cd: 11, target: 'ground', range: 20, radius: 3.5, power: 130, text: 'A rocket down a line: 130 damage where it bursts.' },
      { id: 'taunt', name: 'Taunt', key: 'E', cd: 16, target: 'self', radius: 11, text: 'Everything within 11 m comes for you for 4 s.' }
    ]
  },
  engineer: {
    name: 'Engineer',
    role: 'Turrets, mines and repairs',
    color: '#f5c518',
    weapon: 'hornet',
    hp: 220,
    armor: 2,
    speed: 6,
    gun: { dmg: 11, rate: 7, range: 13 },
    skills: [
      { id: 'turret', name: 'Sentry Turret', key: 'Q', cd: 15, target: 'ground', range: 8, text: 'Build a sentry (two at most) for 45 s.' },
      { id: 'mines', name: 'Mine Field', key: 'W', cd: 14, target: 'ground', range: 12, radius: 3, power: 90, text: 'Three mines: 90 damage each.' },
      { id: 'repair', name: 'Repair', key: 'E', cd: 22, target: 'self', radius: 12, power: 260, text: 'Mend the reactor, sentries and soldiers near you.' }
    ]
  }
};
export const CLASS_ORDER = ['rifleman', 'medic', 'gunner', 'engineer'];

/** The dead. `body` is the KayKit skeleton drawn; `size` how tall. */
export const FOES = {
  husk: { name: 'Husk', body: 'Skeleton_Minion', size: 1.7, hp: 42, dmg: 7, rate: 1.1, range: 1.5, speed: 4.2, armor: 0, bounty: 4, xp: 3 },
  ravager: { name: 'Ravager', body: 'Skeleton_Rogue', size: 1.8, hp: 34, dmg: 6, rate: 1.6, range: 1.5, speed: 6.6, armor: 0, bounty: 5, xp: 4 },
  brute: { name: 'Brute', body: 'Skeleton_Warrior', size: 2.6, hp: 240, dmg: 20, rate: 0.8, range: 2, speed: 3.3, armor: 3, bounty: 18, xp: 12 },
  hexer: { name: 'Hexer', body: 'Skeleton_Mage', size: 1.9, hp: 64, dmg: 11, rate: 0.8, range: 11, speed: 3.6, armor: 0, bounty: 10, xp: 7, ranged: true },
  // Bosses: a wave's end.
  colossus: { name: 'Bone Colossus', body: 'Skeleton_Warrior', size: 5.2, hp: 4200, dmg: 48, rate: 0.6, range: 3.5, speed: 3, armor: 6, bounty: 400, xp: 300, boss: true, slam: { radius: 6, dmg: 60, every: 7 } },
  lich: { name: 'Pit Lich', body: 'Skeleton_Mage', size: 4.4, hp: 3300, dmg: 32, rate: 0.9, range: 14, speed: 3.2, armor: 3, bounty: 500, xp: 350, boss: true, ranged: true, summon: { kind: 'husk', count: 6, every: 9 } },
  graveking: { name: 'Grave King', body: 'Skeleton_Warrior', size: 6, hp: 9500, dmg: 60, rate: 0.7, range: 4, speed: 3.4, armor: 8, bounty: 1200, xp: 900, boss: true, slam: { radius: 7, dmg: 80, every: 6 }, summon: { kind: 'ravager', count: 5, every: 12 } }
};

/**
 * The waves: what comes (kind × how many), from which rifts. The SE rift
 * opens at wave 8. Every fifth wave ends with a boss.
 */
export const WAVES = [
  { husk: 18 },
  { husk: 24, ravager: 6 },
  { husk: 26, ravager: 10, hexer: 4 },
  { husk: 30, ravager: 12, brute: 2, hexer: 6 },
  { husk: 20, ravager: 10, brute: 3, colossus: 1 },
  { husk: 34, ravager: 16, brute: 4, hexer: 8 },
  { husk: 30, ravager: 22, brute: 6, hexer: 10 },
  { husk: 40, ravager: 18, brute: 8, hexer: 12 },
  { husk: 36, ravager: 26, brute: 10, hexer: 14 },
  { husk: 30, ravager: 20, brute: 8, hexer: 10, lich: 1 },
  { husk: 46, ravager: 30, brute: 12, hexer: 16 },
  { husk: 44, ravager: 34, brute: 14, hexer: 18 },
  { husk: 52, ravager: 36, brute: 16, hexer: 20 },
  { husk: 56, ravager: 40, brute: 20, hexer: 24 },
  { husk: 40, ravager: 30, brute: 16, hexer: 18, graveking: 1 }
];

/** How long the quiet between waves lasts (to buy and heal), and the first one. */
export const BREAK = { first: 25, between: 18 };

/**
 * What credits buy, for one soldier: each upgrade has levels, each level
 * costs more. Medkits are carried (F uses one).
 */
export const UPGRADES = {
  damage: { name: 'Weapon damage', text: '+12% damage a level', max: 12, cost: 90, step: 45 },
  rate: { name: 'Rate of fire', text: '+8% shots a second a level', max: 10, cost: 110, step: 55 },
  armor: { name: 'Armour', text: '+1 armour a level (each takes a hit down by 1)', max: 12, cost: 80, step: 40 },
  vitality: { name: 'Vitality', text: '+12% most health a level', max: 12, cost: 80, step: 40 },
  power: { name: 'Skill power', text: '+12% to what skills do a level', max: 10, cost: 100, step: 50 },
  haste: { name: 'Quick hands', text: '−7% skill cooldowns a level', max: 6, cost: 140, step: 70 }
};
export const MEDKIT = { cost: 60, heal: 0.5, carry: 3 };

/** How hard: the dead's health and damage, and the squad's lives. */
export const DIFFICULTY = {
  recruit: { name: 'Recruit', hp: 0.7, dmg: 0.7, lives: 8 },
  veteran: { name: 'Veteran', hp: 1, dmg: 1, lives: 6 },
  elite: { name: 'Elite', hp: 1.35, dmg: 1.25, lives: 4 },
  nightmare: { name: 'Nightmare', hp: 1.8, dmg: 1.5, lives: 3 }
};

export const REACTOR = { hp: 4000 };
export const HERO = { level: { max: 20, xp: (n) => 40 + n * 30, growth: 0.06 }, respawn: (wave) => 8 + wave * 0.6, bleed: 20, liftTime: 2.5 };
export const SENTRY = { hp: 320, gun: { dmg: 10, rate: 5, range: 14 }, life: 45, max: 2 };
export const HEAL_PAD = { heal: 30, radius: 4 };

/** What a level of an upgrade costs. */
export const upgradeCost = (key, level) => UPGRADES[key].cost + UPGRADES[key].step * level;
