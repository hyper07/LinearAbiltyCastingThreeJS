import { CHAMPIONS, CHAMPION_ORDER } from './rules.js';

/** Each side's five places, in seat order. */
export const LANES = ['top', 'jungle', 'mid', 'bot', 'bot'];
/** Who fits each place, best first (for bots). */
const FIT = {
  top: ['brakka', 'torva', 'rook'],
  jungle: ['vex', 'torva', 'rook', 'brakka'],
  mid: ['sela', 'nyla', 'vex'],
  bot: ['kiro', 'maru', 'rook', 'nyla']
};

/**
 * The ten seats of a match: Dawn (blue) 0–4, Dusk (red) 5–9. People sit on
 * the side they chose (in the place their champion suits, if it's free);
 * bots take every other seat, with champions that fit and that nobody on
 * their side already plays.
 *
 * @param {Array<{ id?: string, name: string, champ: string, team: 'blue'|'red' }>} people
 * @param {string} difficulty the bots'
 * @returns {Array<{ champ, team, lane, name, bot, owner }>}
 */
export function makeSeats(people, difficulty = 'normal') {
  const seats = new Array(10).fill(null);
  for (const team of ['blue', 'red']) {
    const base = team === 'blue' ? 0 : 5;
    const mine = people.filter((p) => p.team === team).slice(0, 5);
    for (const p of mine) {
      const champ = CHAMPIONS[p.champ] ? p.champ : 'brakka';
      const want = CHAMPIONS[champ].lane;
      let i = LANES.findIndex((lane, k) => lane === want && !seats[base + k]);
      if (i < 0) i = LANES.findIndex((_, k) => !seats[base + k]);
      seats[base + i] = { champ, team, lane: LANES[i], name: p.name, bot: null, owner: p.id ?? null };
    }
    for (let k = 0; k < 5; k++) {
      if (seats[base + k]) continue;
      const taken = new Set(seats.slice(base, base + 5).filter(Boolean).map((s) => s.champ));
      const lane = LANES[k];
      const champ = FIT[lane].find((c) => !taken.has(c)) ?? CHAMPION_ORDER.find((c) => !taken.has(c));
      seats[base + k] = { champ, team, lane, name: `${CHAMPIONS[champ].name} (bot)`, bot: difficulty, owner: null };
    }
  }
  return seats;
}
