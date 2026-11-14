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
export const TIME = { buy: 12, round: 100, fuse: 35, plant: 3, defuse: 6, defuseKit: 3, after: 4 };
export const MONEY = { start: 800, max: 12000, kill: 300, win: 3000, lose: 1400, loseMore: 500, loseMost: 3400, plant: 300, defuse: 300 };
export const PLAYER = { radius: 0.4, eye: 1.62, speed: 5.4, jump: 4.6, gravity: 14, hp: 100 };

/**
 * Weapons. `dmg` a hit to the body; a head is `head` times that. `rpm`
 * rounds a minute (`auto` holds the trigger). `spread` degrees standing
 * still, more when moving or firing fast (`kick` added a shot, lost over
 * time). `pellets` for a shotgun. `zoom` field of view through a scope.
 */
export const WEAPONS = {
  sidearm: { name: 'P9 Sidearm', slot: 2, price: 0, dmg: 26, head: 3.6, rpm: 380, auto: false, mag: 12, reload: 1.6, spread: 1.1, kick: 0.9, move: 1, range: 60 },
  ram: { name: 'Ram .50', slot: 2, price: 700, dmg: 52, head: 3.2, rpm: 200, auto: false, mag: 7, reload: 2.1, spread: 1.3, kick: 2.6, move: 0.98, range: 70 },
  wasp: { name: 'Wasp SMG', slot: 1, price: 1200, dmg: 22, head: 3.4, rpm: 820, auto: true, mag: 30, reload: 2.2, spread: 1.9, kick: 0.5, move: 0.97, range: 45 },
  gavel: { name: 'Gavel 12', slot: 1, price: 1300, dmg: 15, head: 1.6, rpm: 70, auto: false, mag: 6, reload: 2.8, spread: 4.2, kick: 3.5, pellets: 8, move: 0.93, range: 22 },
  vantage: { name: 'Vantage Rifle', slot: 1, price: 2700, dmg: 34, head: 4, rpm: 600, auto: true, mag: 30, reload: 2.4, spread: 0.9, kick: 0.62, move: 0.9, range: 120 },
  kestrel: { name: 'Kestrel Carbine', slot: 1, price: 2900, dmg: 30, head: 4, rpm: 680, auto: true, mag: 30, reload: 2.5, spread: 0.7, kick: 0.45, move: 0.92, range: 120 },
  longwatch: { name: 'Longwatch', slot: 1, price: 4500, dmg: 108, head: 2.4, rpm: 42, auto: false, mag: 5, reload: 3.2, spread: 0.08, unscoped: 5, kick: 4, move: 0.82, range: 240, zoom: 22 }
};
/** Things to wear or carry: a vest takes half of each hit until it is used up; a helmet makes a head worth less. */
export const GEAR = {
  vest: { name: 'Vest', price: 650, text: '100 armor: takes half of each hit' },
  helmet: { name: 'Vest + helmet', price: 1000, text: 'armor, and heads are hit less hard' },
  kit: { name: 'Disarming kit', price: 400, text: 'Wardens only: disarm in 3 s, not 6', team: 'def' }
};
export const BUY_ORDER = ['ram', 'wasp', 'gavel', 'vantage', 'kestrel', 'longwatch', 'vest', 'helmet', 'kit'];

/** How good the bots are: how long before they shoot, and how far off they aim (degrees). */
export const SKILL = {
  easy: { name: 'Easy', react: 0.7, error: 5.5, burst: 3 },
  normal: { name: 'Normal', react: 0.42, error: 3.2, burst: 4 },
  hard: { name: 'Hard', react: 0.26, error: 1.8, burst: 5 }
};

/** What a loss pays: more for each lost in a row. */
export const lossPay = (streak) => Math.min(MONEY.loseMost, MONEY.lose + MONEY.loseMore * Math.max(0, streak - 1));
