/**
 * Lanternwood — treasure chests, as pure rules (no three.js), so the tests
 * can check them.
 *
 * Placed chests stand in the realms; each opens once per journey (its id is
 * kept in the save) and then sinks away for good. Reward chests drop where a
 * hero monster (an elite) or a realm boss falls: one for each player, rolled
 * for that player's class when they open it — an elite's better than an
 * ordinary drop, a boss's the best and bigger. A reward chest stays until it
 * is opened, its realm is left, or CHEST_DESPAWN seconds pass; once opened it
 * gives its loot exactly once, and vanishes CHEST_VANISH seconds later.
 *
 *   const c = rewardChest({ elite: true }, { id, x, z, now });   // or null for an ordinary kill
 *   const r = openChest(c, now);       // { ok: true } the first time, { ok: false } after
 *   chestGone(c, now)                  // time to take it away (opened and sunk, or left too long)
 *   openPlaced(state.chests, id)       // true once per placed chest
 *   chestLoot(c, { level, cls }, rollLoot)
 */

/** Seconds an unopened reward chest waits before fading away. */
export const CHEST_DESPAWN = 300;
/** Seconds an opened chest stays (lid open, loot spilling) before it sinks away. */
export const CHEST_VANISH = 2.2;

/** What each kind of reward chest holds and looks like. `loot`: the loot table tier; `rolls`: how many times it is rolled. */
export const CHEST_TIERS = {
  elite: { loot: 'elite', rolls: 2, gold: [30, 60], scale: 1.0, rarity: 'epic' },
  boss: { loot: 'boss', rolls: 3, gold: [120, 220], scale: 1.45, rarity: 'legendary' }
};

/** The tier of chest a kill leaves (a boss's, a hero monster's), or null for an ordinary one. */
export function chestTierFor(kill) {
  if (!kill) return null;
  if (kill.boss) return 'boss';
  if (kill.elite && !kill.summoned) return 'elite';
  return null;
}

/** A reward chest for a kill, or null when the kill leaves none. */
export function rewardChest(kill, { id, x, z, now = 0 }) {
  const tier = chestTierFor(kill);
  if (!tier) return null;
  return { id, tier, x, z, born: now, opened: false, openedAt: null, despawnAt: now + CHEST_DESPAWN };
}

/** Open a chest: the first time it opens (and says so); every time after, nothing. */
export function openChest(chest, now = 0) {
  if (!chest || chest.opened) return { ok: false };
  chest.opened = true;
  chest.openedAt = now;
  return { ok: true };
}

/** Whether a reward chest should go now: opened and done, or never opened and left too long. */
export function chestGone(chest, now) {
  if (chest.opened) return now - chest.openedAt >= CHEST_VANISH;
  return now >= chest.despawnAt;
}

/** A placed chest opened: true the first time (its id goes into the save's list), false ever after. */
export function openPlaced(opened, id) {
  if (opened.includes(id)) return false;
  opened.push(id);
  return true;
}

/**
 * What a reward chest holds, rolled when it is opened (so for the class of
 * whoever opens it): items and consumables from the loot tables at its tier,
 * and some gold. `rollLoot` is items.js's.
 */
export function chestLoot(chest, { level, cls }, rollLoot, rand = Math.random) {
  const T = CHEST_TIERS[chest.tier];
  const items = [];
  const consumables = [];
  for (let i = 0; i < T.rolls; i++) {
    const r = rollLoot({ level, tier: T.loot, cls }, rand);
    items.push(...r.items);
    consumables.push(...r.consumables);
  }
  const gold = Math.round(T.gold[0] + (T.gold[1] - T.gold[0]) * rand() + level * (chest.tier === 'boss' ? 8 : 3));
  return { items, consumables, gold };
}
