/**
 * Treasure chests, as pure rules (adapted from Lanternwood's): chests placed
 * about the map open once for each hero (the id goes into their save) and
 * then sink away for good; reward chests appear where an elite or the boss
 * falls, open once, and vanish a moment later (or after a long wait unopened).
 */

/** Seconds an opened chest stays (lid up, loot spilling) before it sinks away. */
export const CHEST_VANISH = 2.4;
/** Seconds an unopened reward chest waits before fading. */
export const CHEST_DESPAWN = 300;

/** Placed chests: id, where, which way it faces, the loot tier it rolls. */
export const CHESTS = [
  { id: 'c-westwood', x: -88, z: -66, face: 0.6, tier: 'chest' },
  { id: 'c-southwood', x: 30, z: 92, face: 2.8, tier: 'chest' },
  { id: 'c-eastmeadow', x: 96, z: 44, face: -1.2, tier: 'chest' },
  { id: 'c-webhollow', x: -60, z: -224, face: 1.2, tier: 'chest' },
  { id: 'c-rootdeep', x: 72, z: -296, face: -2.2, tier: 'chest' },
  { id: 'c-ledge', x: 132, z: -60, face: -2.6, tier: 'elite' }
];

/** Open a chest: the first time it opens (true); every time after, nothing (false). */
export function openChest(chest, now = 0) {
  if (!chest || chest.opened) return false;
  chest.opened = true;
  chest.openedAt = now;
  return true;
}

/** A placed chest for a hero: true the first time (its id is kept), false ever after. */
export function openPlaced(opened, id) {
  if (opened.includes(id)) return false;
  opened.push(id);
  return true;
}

/** A reward chest where an elite or boss fell (null for anything else). */
export function rewardChest(kill, { id, x, z, now = 0 }) {
  if (!kill?.boss && !kill?.elite) return null;
  return { id, tier: kill.boss ? 'boss' : 'elite', x, z, born: now, opened: false, openedAt: null, reward: true };
}

/** Should the chest go now: opened and done, or a reward left unopened too long? */
export function chestGone(chest, now) {
  if (chest.opened) return now - chest.openedAt >= CHEST_VANISH;
  return Boolean(chest.reward) && now - chest.born >= CHEST_DESPAWN;
}
