/**
 * Breachline's numbers: the weapons, what things cost, how money is earned
 * and how long each part of a round lasts. Pure data, read by the game's
 * rules (sim.js), its bots and its screens.
 *
 * The game is our own: two teams of five — Raiders, who carry a charge to
 * one of two sites and set it, and Wardens, who stop them or disarm it —
 * over short rounds with a buying pause before each. The names, the map and
 * the weapons are invented.
 */

export const TEAM = { atk: { name: 'Raiders', color: '#ff8a3c' }, def: { name: 'Wardens', color: '#38c6d9' } };
export const TEAM_SIZE = 5;
/** First to this many rounds wins; the teams change ends after HALF rounds. */
export const WIN_ROUNDS = 7;
export const HALF = 6;
export const TIME = { buy: 12, round: 115, fuse: 35, plant: 3, defuse: 6, defuseKit: 3, after: 4 };
export const MONEY = { start: 4000, max: 16000, kill: 300, win: 3250, lose: 1900, loseMore: 500, loseMost: 3400, plant: 300, defuse: 300 };
export const PLAYER = { radius: 0.4, eye: 1.62, speed: 5.4, jump: 4.6, gravity: 14, hp: 100 };

/**
 * Weapons. `slot` 1 a main weapon, 2 a sidearm, 3 the knife, 4 and 5
 * grenades. `dmg` a hit to the body; a head is `head` times that. `rpm`
 * rounds a minute (`auto` holds the trigger). `spread` degrees standing
 * still, more when moving or firing fast (`kick` added a shot, lost over
 * time). `pellets` for a shotgun. `zoom` the fields of view through a scope,
 * one for each step of zoom (right-click steps in, and out again).
 * `bounty` what a kill with it pays (instead of MONEY.kill). The knife is
 * `melee` (`back` for a blow from behind; one bought replaces the knife on
 * key 3); grenades are thrown (`throw`).
 */
export const WEAPONS = {
  knife: { name: 'Knife', slot: 3, price: 0, melee: true, dmg: 40, back: 150, rpm: 100, range: 1.9, mag: 0, move: 1.1, bounty: 1500 },
  karambit: { name: 'Karambit', slot: 3, price: 300, melee: true, dmg: 34, back: 150, rpm: 150, range: 1.7, mag: 0, move: 1.13, bounty: 1500 },
  machete: { name: 'Machete', slot: 3, price: 250, melee: true, dmg: 55, back: 150, rpm: 85, range: 2.2, mag: 0, move: 1.08, bounty: 1300 },
  hatchet: { name: 'Hatchet', slot: 3, price: 400, melee: true, dmg: 68, back: 160, rpm: 70, range: 2.1, mag: 0, move: 1.05, bounty: 1200 },
  fireaxe: { name: 'Fire Axe', slot: 3, price: 650, melee: true, dmg: 96, back: 200, rpm: 45, range: 2.5, mag: 0, move: 0.98, bounty: 1000 },
  sidearm: { name: 'P9 Sidearm', slot: 2, price: 0, dmg: 26, head: 3.6, rpm: 380, auto: false, mag: 12, reload: 1.6, spread: 1.1, kick: 0.9, move: 1, range: 60 },
  viper: { name: 'Viper Machine Pistol', slot: 2, price: 500, dmg: 17, head: 3.4, rpm: 900, auto: true, mag: 18, reload: 1.9, spread: 1.7, kick: 0.45, move: 1, range: 40 },
  ram: { name: 'Ram .50', slot: 2, price: 700, dmg: 52, head: 3.2, rpm: 200, auto: false, mag: 7, reload: 2.1, spread: 1.3, kick: 2.6, move: 0.98, range: 70 },
  badger: { name: 'Badger SMG', slot: 1, price: 1050, dmg: 27, head: 3, rpm: 600, auto: true, mag: 25, reload: 2.3, spread: 2.1, kick: 0.6, move: 0.96, range: 40, bounty: 600 },
  wasp: { name: 'Wasp SMG', slot: 1, price: 1200, dmg: 22, head: 3.4, rpm: 820, auto: true, mag: 30, reload: 2.2, spread: 1.9, kick: 0.5, move: 0.97, range: 45, bounty: 600 },
  hornet: { name: 'Hornet PDW', slot: 1, price: 1500, dmg: 23, head: 3.4, rpm: 950, auto: true, mag: 40, reload: 2.4, spread: 1.6, kick: 0.42, move: 0.98, range: 50, bounty: 600 },
  gavel: { name: 'Gavel 12', slot: 1, price: 1300, dmg: 15, head: 1.6, rpm: 70, auto: false, mag: 6, reload: 2.8, spread: 4.2, kick: 3.5, pellets: 8, move: 0.93, range: 22, bounty: 900 },
  ripsaw: { name: 'Ripsaw Auto 12', slot: 1, price: 2000, dmg: 13, head: 1.6, rpm: 240, auto: false, mag: 7, reload: 3, spread: 4.6, kick: 2.6, pellets: 6, move: 0.9, range: 20, bounty: 900 },
  sparrow: { name: 'Sparrow Rifle', slot: 1, price: 2000, dmg: 29, head: 3.9, rpm: 640, auto: true, mag: 30, reload: 2.3, spread: 1.3, kick: 0.62, move: 0.92, range: 100 },
  vantage: { name: 'Vantage Rifle', slot: 1, price: 2700, dmg: 34, head: 4, rpm: 600, auto: true, mag: 30, reload: 2.4, spread: 0.9, kick: 0.62, move: 0.9, range: 120 },
  kestrel: { name: 'Kestrel Carbine', slot: 1, price: 2900, dmg: 30, head: 4, rpm: 680, auto: true, mag: 30, reload: 2.5, spread: 0.7, kick: 0.45, move: 0.92, range: 120 },
  bulwark: { name: 'Bulwark Battle Rifle', slot: 1, price: 3100, dmg: 44, head: 3.6, rpm: 450, auto: true, mag: 20, reload: 2.8, spread: 0.85, kick: 0.95, move: 0.86, range: 140 },
  heron: { name: 'Heron Scout', slot: 1, price: 1700, dmg: 88, head: 2.6, rpm: 48, auto: false, mag: 10, reload: 2.8, spread: 0.1, unscoped: 3.5, kick: 3, move: 0.97, range: 220, zoom: [40, 18], bounty: 300 },
  marksman: { name: 'Marksman DMR', slot: 1, price: 3800, dmg: 72, head: 2.8, rpm: 170, auto: false, mag: 10, reload: 2.9, spread: 0.15, unscoped: 3, kick: 2.2, move: 0.85, range: 200, zoom: [38] },
  longwatch: { name: 'Longwatch', slot: 1, price: 4500, dmg: 108, head: 2.4, rpm: 42, auto: false, mag: 5, reload: 3.2, spread: 0.08, unscoped: 5, kick: 4, move: 0.82, range: 240, zoom: [40, 15], bounty: 100 },
  falcon: { name: 'Falcon Auto-Sniper', slot: 1, price: 5000, dmg: 80, head: 3, rpm: 230, auto: false, mag: 20, reload: 3.4, spread: 0.12, unscoped: 4.5, kick: 2.6, move: 0.78, range: 240, zoom: [40, 18], bounty: 150 },
  ironpeak: { name: 'Ironpeak .50', slot: 1, price: 6000, dmg: 150, head: 2, rpm: 30, auto: false, mag: 5, reload: 4, spread: 0.06, unscoped: 6, kick: 5, move: 0.74, range: 300, zoom: [35, 12], bounty: 100 },
  anvil: { name: 'Anvil LMG', slot: 1, price: 5200, dmg: 32, head: 3.6, rpm: 760, auto: true, mag: 100, reload: 5.2, spread: 1.4, kick: 0.5, move: 0.78, range: 120 },
  frag: { name: 'Frag grenade', slot: 4, price: 300, throw: true, dmg: 98, radius: 7, fuse: 1.8, rpm: 60, mag: 0, move: 1 },
  smoke: { name: 'Smoke grenade', slot: 5, price: 300, throw: true, radius: 4.8, last: 16, fuse: 1.4, rpm: 60, mag: 0, move: 1 }
};
/** Things to wear or carry: a vest takes half of each hit until it is used up; a helmet makes a head worth less. */
export const GEAR = {
  vest: { name: 'Vest', price: 650, text: '100 armor: takes half of each hit' },
  helmet: { name: 'Vest + helmet', price: 1000, text: 'armor, and heads are hit less hard' },
  kit: { name: 'Disarming kit', price: 400, text: 'Wardens only: disarm in 3 s, not 6', team: 'def' }
};
/** The shop's shelves, in order. */
export const SHOP = [
  { name: 'Pistols', items: ['viper', 'ram'] },
  { name: 'SMGs', items: ['badger', 'wasp', 'hornet'] },
  { name: 'Shotguns', items: ['gavel', 'ripsaw'] },
  { name: 'Rifles', items: ['sparrow', 'vantage', 'kestrel', 'bulwark'] },
  { name: 'Snipers', items: ['heron', 'marksman', 'falcon', 'longwatch', 'ironpeak'] },
  { name: 'Heavy', items: ['anvil'] },
  { name: 'Melee', items: ['karambit', 'machete', 'hatchet', 'fireaxe'] },
  { name: 'Grenades', items: ['frag', 'smoke'] },
  { name: 'Gear', items: ['vest', 'helmet', 'kit'] }
];
export const BUY_ORDER = SHOP.flatMap((s) => s.items);

/** What a player has in their hands, by the slot they hold (1 main, 2 sidearm, 3 knife, 4 frag, 5 smoke). */
export function weaponIn(p) {
  if (p.slot === 1 && p.primary) return p.primary;
  if (p.slot === 3) return p.melee ?? 'knife';
  if (p.slot === 4 && p.nades?.frag > 0) return 'frag';
  if (p.slot === 5 && p.nades?.smoke > 0) return 'smoke';
  return p.secondary;
}

/** Whether a player can take a slot in hand. */
export function canHold(p, slot) {
  if (slot === 1) return Boolean(p.primary);
  if (slot === 4) return p.nades?.frag > 0;
  if (slot === 5) return p.nades?.smoke > 0;
  return slot === 2 || slot === 3;
}

/** How good the bots are: how long before they shoot, how far off they aim (degrees), how fast they turn (degrees a second), how often they go for the head. */
export const SKILL = {
  easy: { name: 'Easy', react: 0.7, error: 5.5, burst: 3, turn: 300, head: 0.15 },
  normal: { name: 'Normal', react: 0.42, error: 3.2, burst: 4, turn: 420, head: 0.3 },
  hard: { name: 'Hard', react: 0.26, error: 1.8, burst: 5, turn: 560, head: 0.55 }
};

/** What a loss pays: more for each lost in a row. */
export const lossPay = (streak) => Math.min(MONEY.loseMost, MONEY.lose + MONEY.loseMore * Math.max(0, streak - 1));
