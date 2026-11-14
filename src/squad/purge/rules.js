/**
 * Grave Purge — Bastion Squad's second operation, in the co-op "raise your
 * squad" style: four players start in a camp in the corner of a land the
 * dead have taken. Every kill pays ore; ore buys Recruits at the barracks,
 * and at the Forge a soldier is raised up a ladder of ranks — Recruit,
 * Veteran, Vanguard, Phantom, Paragon. Every crypt, spire and shrine out
 * there is a fight and a payday. Break the six shrines and the six soul
 * nodes, then the Heart of the Grave they guard, then the king it wakes —
 * before the clock runs out. Our own game: our own names, units and land.
 */

export const TICK = 1 / 20;
export const SEATS = 4;
export const SUPPLY = 24; // most soldiers a player can field
export const BOT_NAMES = ['Kade', 'Mara', 'Osei', 'Lin'];
export const COLORS = ['#4f8cff', '#ff5a4f', '#3ddc84', '#f5c518'];

/**
 * The ranks. `gun`: damage a shot, shots a second, reach in metres
 * (`splash`: a burst that hurts all round where it lands). `scale` is how
 * big the soldier is drawn; `weapon` the gun in hand. A rank above Recruit
 * is made at the Forge from what is listed in `from`; `one` ranks are one
 * to a player at a time.
 */
export const RANKS = {
  recruit: { name: 'Recruit', hp: 90, armor: 0, speed: 5, gun: { dmg: 9, rate: 1.6, range: 9 }, scale: 1, weapon: 'vantage', cost: 150, tier: 0 },
  veteran: { name: 'Veteran', hp: 340, armor: 2, speed: 5.4, gun: { dmg: 24, rate: 2, range: 10 }, scale: 1.12, weapon: 'anvil', from: { recruit: 1 }, ore: 1200, tier: 1 },
  vanguard: { name: 'Vanguard', hp: 950, armor: 5, speed: 5.6, gun: { dmg: 58, rate: 2.2, range: 11 }, scale: 1.24, weapon: 'falcon', from: { veteran: 1 }, ore: 3500, tier: 2 },
  phantom: { name: 'Phantom', hp: 2000, armor: 8, speed: 6, gun: { dmg: 80, rate: 3, range: 12 }, scale: 1.3, weapon: 'ironpeak', from: { vanguard: 1, veteran: 2 }, ore: 9000, relics: 4, tier: 3, one: true },
  paragon: { name: 'Paragon', hp: 4600, armor: 12, speed: 6.2, gun: { dmg: 170, rate: 2.5, range: 13, splash: 2.6 }, scale: 1.3, weapon: 'falcon', from: { phantom: 1 }, ore: 22000, relics: 10, tier: 4, one: true },
  /**
   * The hidden rank: shown as "???" at the Forge until its secret is
   * found — Weapons upgraded all the way. A flying gunship: it crosses the
   * ridges, and launches attack drones when the dead come near.
   */
  dreadnought: { name: 'Dreadnought', hp: 22000, armor: 20, speed: 5.5, gun: { dmg: 380, rate: 2, range: 15, splash: 3.5 }, scale: 1, from: { vanguard: 10, phantom: 1, paragon: 1 }, ore: 60000, relics: 16, tier: 5, one: true, hidden: true, unlock: { weapons: 30 }, flying: true, drones: { count: 4, every: 12, reach: 16 } },
  /**
   * The Engineer (the workers of the classic maps): cheap and unarmed. Left
   * standing on the Exchange it turns your points into ore; it builds
   * bunkers. Bought at the barracks (T).
   */
  engineer: { name: 'Engineer', hp: 70, armor: 0, speed: 5.4, gun: { dmg: 0, rate: 0, range: 0 }, scale: 0.95, weapon: 'sidearm', cost: 75, tier: 0, worker: true },
  /** The Dreadnought's drones: fast, light, gone after a while. */
  drone: { name: 'Drone', hp: 420, armor: 4, speed: 10, gun: { dmg: 45, rate: 3, range: 8 }, scale: 1, tier: 0, flying: true, life: 25, summoned: true }
};
export const RANK_ORDER = ['recruit', 'veteran', 'vanguard', 'phantom', 'paragon', 'dreadnought'];

/**
 * How each rank looks, so they are told apart at a glance: the soldier's
 * uniform washed in its rank's colour (khaki, green, blue, black with a
 * violet glow), and the Paragon a war robot in gold.
 */
export const LOOKS = {
  recruit: { paint: '#efe4c8', label: 'khaki' },
  veteran: { paint: '#8fbf6a', label: 'green' },
  vanguard: { paint: '#7aa4ff', label: 'blue' },
  phantom: { paint: '#4a3c68', glow: '#a070ff', label: 'black' },
  paragon: { paint: '#e8b840', glow: '#ffc040', robot: true, label: 'a war robot' },
  dreadnought: { paint: '#5a606a', glow: '#ff6030', ship: 'big', label: 'a flying gunship' },
  engineer: { paint: '#f0a030', label: 'hi-vis orange' },
  drone: { paint: '#a8b0ba', glow: '#60d0ff', ship: 'small', label: 'a drone' }
};

/** The Forge: where soldiers stand to be raised (metres from its middle). */
export const FORGE_REACH = 7;

/** Upgrades, for all of one player's soldiers: each level costs more. */
export const UPGRADES = {
  weapons: { name: 'Weapons', text: '+8% damage a level, for all your soldiers', max: 30, cost: 400, step: 300 },
  armor: { name: 'Plating', text: '+1 armour a level (each hit taken down by 1)', max: 20, cost: 400, step: 350 }
};
export const upgradeCost = (key, level) => UPGRADES[key].cost + UPGRADES[key].step * level;

/** What you can give a teammate at once (G). */
export const GIFTS = [500, 2000, 8000];

/**
 * The dead. Guards stand in camps across the land and wake when soldiers
 * come near (or one of their camp is hit); `tier` (1 near the camp to 4 in
 * the far south-east) multiplies health, damage and bounty.
 */
export const FOES = {
  husk: { name: 'Husk', body: 'Skeleton_Minion', size: 1.7, hp: 70, dmg: 7, rate: 1.1, range: 1.5, speed: 4.4, armor: 0, bounty: 20 },
  ravager: { name: 'Ravager', body: 'Skeleton_Rogue', size: 1.8, hp: 55, dmg: 7, rate: 1.6, range: 1.5, speed: 6.4, armor: 0, bounty: 22 },
  hexer: { name: 'Hexer', body: 'Skeleton_Mage', size: 1.9, hp: 90, dmg: 12, rate: 0.8, range: 9, speed: 3.8, armor: 0, bounty: 30, ranged: true },
  brute: { name: 'Brute', body: 'Skeleton_Warrior', size: 2.6, hp: 380, dmg: 22, rate: 0.8, range: 2, speed: 3.5, armor: 3, bounty: 70 },
  wight: { name: 'Wight', body: 'Skeleton_Warrior', size: 2.2, hp: 420, dmg: 22, rate: 1, range: 1.8, speed: 4.8, armor: 4, bounty: 110 },
  bonecaller: { name: 'Bonecaller', body: 'Skeleton_Mage', size: 2.2, hp: 320, dmg: 20, rate: 0.9, range: 11, speed: 3.6, armor: 2, bounty: 120, ranged: true }
};
export const TIER = { 1: { hp: 1, dmg: 1, bounty: 1 }, 2: { hp: 2, dmg: 1.6, bounty: 2 }, 3: { hp: 3.5, dmg: 2.2, bounty: 4 }, 4: { hp: 6, dmg: 3, bounty: 7 } };

/** Named guardians: one at each soul node, and more. Big, and worth a lot. */
export const GUARDIANS = {
  marrow: { name: 'Marrow Knight', body: 'Skeleton_Warrior', size: 3.4, hp: 5200, dmg: 60, rate: 0.9, range: 2.5, speed: 4.4, armor: 6, bounty: 3000, tint: '#d8c8a0' },
  ash: { name: 'Ash Witch', body: 'Skeleton_Mage', size: 3.2, hp: 4200, dmg: 55, rate: 0.9, range: 12, speed: 4, armor: 3, bounty: 3000, tint: '#a080e0', ranged: true },
  hound: { name: 'The Pale Hound', body: 'Skeleton_Rogue', size: 3, hp: 4600, dmg: 48, rate: 1.8, range: 2, speed: 7, armor: 4, bounty: 3500, tint: '#e8e8f0' },
  bishop: { name: 'Hollow Bishop', body: 'Skeleton_Mage', size: 3.6, hp: 9000, dmg: 90, rate: 0.8, range: 13, speed: 3.8, armor: 6, bounty: 6000, tint: '#80d0c0', ranged: true, summon: { kind: 'husk', count: 5, every: 10 } },
  rotfather: { name: 'Rotfather', body: 'Skeleton_Warrior', size: 4.4, hp: 16000, dmg: 140, rate: 0.7, range: 3.5, speed: 3.6, armor: 10, bounty: 9000, tint: '#90a060', slam: { radius: 6, dmg: 120, every: 7 } },
  cinder: { name: 'Cinder Lich', body: 'Skeleton_Mage', size: 4.2, hp: 14000, dmg: 120, rate: 0.9, range: 14, speed: 3.8, armor: 8, bounty: 9000, tint: '#ff8040', ranged: true, summon: { kind: 'wight', count: 3, every: 12 } },
  // Woken by the Heart's fall: the last fight.
  king: { name: 'The Grave King', body: 'Skeleton_Warrior', size: 6.4, hp: 70000, dmg: 200, rate: 0.7, range: 4.5, speed: 4, armor: 16, bounty: 50000, tint: '#f0d080', slam: { radius: 7, dmg: 140, every: 7 }, summon: { kind: 'wight', count: 4, every: 11 }, king: true }
};

/**
 * What the dead have built. `shoots`: a tower's gun. `spawns`: a crypt
 * raises guards (up to `keep` alive near it). `relics`: what breaking it
 * gives every player (the Forge's top ranks need them).
 */
export const BUILDINGS = {
  spire: { name: 'Bone Spire', hp: 700, armor: 2, r: 1.4, bounty: 120, shoots: { dmg: 14, rate: 1, range: 9 } },
  barrow: { name: 'Barrow', hp: 1200, armor: 1, r: 1.8, bounty: 160 },
  crypt: { name: 'Crypt', hp: 2600, armor: 3, r: 2.8, bounty: 500, spawns: { kinds: ['husk', 'ravager', 'hexer'], every: 30, keep: 5 } },
  ossuary: { name: 'Ossuary', hp: 5200, armor: 5, r: 3.2, bounty: 1200, spawns: { kinds: ['brute', 'wight', 'bonecaller'], every: 40, keep: 4 } },
  cache: { name: 'Relic Cache', hp: 300, armor: 0, r: 1, bounty: 2500, relics: 1, loot: true },
  node: { name: 'Soul Node', hp: 9000, armor: 6, r: 2.2, bounty: 6000, relics: 2, key: true, shoots: { dmg: 40, rate: 0.8, range: 11 } },
  shrine: { name: 'Shrine of Bones', hp: 14000, armor: 8, r: 3, bounty: 10000, relics: 3, key: true },
  heart: { name: 'Heart of the Grave', hp: 60000, armor: 12, r: 5, bounty: 40000, relics: 0, heart: true, shoots: { dmg: 90, rate: 1.2, range: 14 } }
};
/** Buildings take tier scaling too, but less than guards. */
export const BUILD_TIER = { 1: 1, 2: 1.7, 3: 2.6, 4: 3.8 };

/** Each shrine broken makes every Veteran and above stronger. */
export const SHRINE_GIFTS = [
  { at: 1, text: '+1 reach for Veterans and up', range: 1 },
  { at: 2, text: '+15% health for Veterans and up', hp: 0.15 },
  { at: 3, text: '+1 reach for Veterans and up', range: 1 },
  { at: 4, text: '+15% damage for Veterans and up', dmg: 0.15 },
  { at: 5, text: '+20% health for Veterans and up', hp: 0.2 },
  { at: 6, text: '+1 reach and +15% damage for Veterans and up', range: 1, dmg: 0.15 }
];

/** How hard: the dead's health and damage, the time you have (minutes), and raids. */
export const DIFFICULTY = {
  casual: { name: 'Casual', hp: 0.75, dmg: 0.7, minutes: 90, raid: 420 },
  hard: { name: 'Hard', hp: 1, dmg: 1, minutes: 75, raid: 300 },
  hell: { name: 'Hell', hp: 1.5, dmg: 1.4, minutes: 60, raid: 220 }
};

/**
 * Stragglers: every so often a few of the weakest dead wander into the camp
 * from the land's near edges — easy kills, easy ore, for whoever is home.
 * The camp's guns leave them to the soldiers (for `grace` seconds once they
 * are in). More of them, and tougher, as time goes on; `cap` at once.
 */
export const STRAGGLERS = { every: 30, first: 45, count: 4, grow: 1 / 8, kinds: ['husk', 'husk', 'ravager'], bonus: 1.5, cap: 12, grace: 12 };

/** How fast the game runs (the host's to set). */
export const SPEEDS = [1, 1.5, 2, 3];

/** Money: what you start with, and the stipend every minute (it grows by `grow` a minute played). */
export const ECON = { start: 600, stipend: 300, grow: 25, every: 60, heroesOnly: { bonus: 3000 } };

/** The camp: its healing pad (a share of health a second — paid for, see HEAL) and its guns. */
export const CAMP = { padHeal: 0.18, padReach: 7, gun: { dmg: 30, rate: 2, range: 13 }, gunHp: 6000 };

/** Healing is paid for: ore for every point of health the pad gives back. */
export const HEAL = { orePerHp: 0.2 };

/**
 * Kills pay points, not ore. Points become ore only at the Exchange in the
 * camp, while one of yours stands on it (an Engineer is cheapest): `ratio`
 * points make one ore.
 */
export const EXCHANGE = { reach: 4, ratio: 10 };

/**
 * Bunkers: six seats; those inside fight on (a little further) and cannot
 * be hit. Each player has one in front of the camp that cannot be broken —
 * until the time runs out and they all fall. Engineers build more (these
 * can be broken), two each.
 */
export const BUNKER = { seats: 6, reach: 1.5, r: 1.8, built: { hp: 2600, armor: 5, cost: 1500, time: 8, max: 2 } };

/** When the time runs out: the bunkers fall, and the dead come every minute, more each time. */
export const LAST_STAND = { every: 60, first: 20, count: 8, grow: 2, cap: 26 };

/**
 * The combinations, as words: for the board by the Forge and the
 * objectives. A hidden rank reads "???" until `upg` has found its secret.
 */
export function recipes(upg = null) {
  return RANK_ORDER.map((rank) => {
    const d = RANKS[rank];
    if (!d.from) return { rank, name: d.name, text: `the barracks · ${d.cost} ore` };
    const open = !d.unlock || (upg && Object.entries(d.unlock).every(([k, n]) => (upg[k] ?? 0) >= n));
    if (!open) return { rank, name: '???', text: '???', secret: true };
    const from = Object.entries(d.from).map(([k, n]) => `${n > 1 ? `${n} ` : ''}${RANKS[k].name}${n > 1 ? 's' : ''}`).join(' + ');
    return { rank, name: d.name, text: `${from} + ${d.ore.toLocaleString('en')} ore${d.relics ? ` + ${d.relics} relics` : ''}${d.one ? ' · one' : ''}` };
  });
}
