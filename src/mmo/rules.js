import { CLASSES, ITEMS, SLOTS, XP_TO, MAX_LEVEL, BAG_SIZE, BANK_SIZE, STARTER, QUESTS, PROFESSIONS, SEED_GOLD } from './data.js';

/**
 * Hearthvale's formulas, shared by the server (which decides) and the
 * browser (which shows): a character's stats, experience, bags, quests.
 * A character is plain data, saved as it is.
 */

export const NAME_RE = /^[A-Za-z][A-Za-z' -]{1,15}$/;

/** A new character: level 1 in Hearthvale with its class's kit. */
export function newCharacter(name, cls) {
  const kit = STARTER[cls];
  const bag = new Array(BAG_SIZE).fill(null);
  kit.bag.forEach(([item, n], i) => (bag[i] = { item, n }));
  return {
    name, cls, level: 1, xp: 0, gold: SEED_GOLD, seeded: true, zone: 'hearthvale', x: 60, z: 92, hp: null, mana: null,
    equip: { weapon: kit.weapon, chest: kit.chest },
    bag, bank: new Array(BANK_SIZE).fill(null),
    quests: { active: {}, done: [] },
    skills: Object.fromEntries(Object.keys(PROFESSIONS).map((k) => [k, 1])),
    bars: CLASSES[cls].skills.map((s) => s.id)
  };
}

/** Everything that follows from level and gear. */
export function statsOf(ch) {
  const b = CLASSES[ch.cls].base;
  const l = ch.level - 1;
  const gear = { power: 0, stamina: 0, armor: 0 };
  for (const slot of SLOTS) {
    const id = ch.equip?.[slot];
    if (!id || !ITEMS[id]?.stats) continue;
    for (const [k, v] of Object.entries(ITEMS[id].stats)) gear[k] = (gear[k] ?? 0) + v;
  }
  return {
    maxHp: Math.round(b.hp + b.hpL * l + gear.stamina * 10),
    maxMana: Math.round(b.mana + b.manaL * l),
    power: Math.round(b.power + b.powerL * l + gear.power),
    armor: Math.round(b.armor + b.armorL * l + gear.armor),
    range: b.range,
    swing: b.speed,
    regen: b.regen,
    ranged: Boolean(CLASSES[ch.cls].ranged)
  };
}

/** Experience for a kill: less for weaker monsters, none five levels down. */
export function killXp(mobLevel, playerLevel, elite = false) {
  const diff = mobLevel - playerLevel;
  if (diff <= -5) return 0;
  const base = 40 + mobLevel * 12;
  return Math.round(base * Math.max(0.2, 1 + diff * 0.15) * (elite ? 2.5 : 1));
}

/** Add experience; returns the levels gained. */
export function addXp(ch, amount) {
  let gained = 0;
  if (ch.level >= MAX_LEVEL) return 0;
  ch.xp += Math.max(0, Math.round(amount));
  while (ch.level < MAX_LEVEL && ch.xp >= XP_TO[ch.level + 1]) {
    ch.level++;
    gained++;
  }
  if (ch.level >= MAX_LEVEL) ch.xp = XP_TO[MAX_LEVEL];
  return gained;
}

/* ---- bags ---- */

export function countOf(ch, item) {
  return ch.bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
}

/** Put `n` of an item in the bag (stacking); returns how many fit. */
export function give(ch, item, n = 1, list = 'bag') {
  const slots = ch[list];
  const max = ITEMS[item]?.stack ?? 1;
  let left = n;
  for (const s of slots) {
    if (left <= 0) break;
    if (s && s.item === item && s.n < max) {
      const k = Math.min(left, max - s.n);
      s.n += k;
      left -= k;
    }
  }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i]) continue;
    const k = Math.min(left, max);
    slots[i] = { item, n: k };
    left -= k;
  }
  return n - left;
}

/** Take `n` of an item from the bag; false (and nothing taken) if there aren't that many. */
export function take(ch, item, n = 1) {
  if (countOf(ch, item) < n) return false;
  let left = n;
  for (let i = ch.bag.length - 1; i >= 0 && left > 0; i--) {
    const s = ch.bag[i];
    if (!s || s.item !== item) continue;
    const k = Math.min(left, s.n);
    s.n -= k;
    left -= k;
    if (!s.n) ch.bag[i] = null;
  }
  return true;
}

export function freeSlots(ch, list = 'bag') {
  return ch[list].filter((s) => !s).length;
}

/* ---- quests ---- */

/** What an NPC offers this character: quests to take, and quests to hand in. */
export function questsAt(ch, npc) {
  const offer = [];
  const hand = [];
  for (const [id, q] of Object.entries(QUESTS)) {
    if (q.to === npc && ch.quests.active[id] != null && questDone(ch, id)) hand.push(id);
    else if (q.from === npc && ch.quests.active[id] == null && !ch.quests.done.includes(id) && ch.level >= q.level - 1 && (!q.after || ch.quests.done.includes(q.after))) offer.push(id);
  }
  return { offer, hand };
}

export function questDone(ch, id) {
  const q = QUESTS[id];
  const have = ch.quests.active[id];
  if (have == null) return false;
  if (q.goal.kill) return have >= q.goal.count;
  if (q.goal.gather) return countOf(ch, q.goal.gather) >= q.goal.count;
  return true;
}

/** A tidy, safe copy of a character as loaded (fills anything an older save lacks). */
export function normalize(raw) {
  const ch = { ...newCharacter(raw.name, CLASSES[raw.cls] ? raw.cls : 'vanguard'), ...raw };
  ch.bag = Array.from({ length: BAG_SIZE }, (_, i) => (raw.bag?.[i]?.item && ITEMS[raw.bag[i].item] ? { item: raw.bag[i].item, n: Math.max(1, raw.bag[i].n | 0) } : null));
  ch.bank = Array.from({ length: BANK_SIZE }, (_, i) => (raw.bank?.[i]?.item && ITEMS[raw.bank[i].item] ? { item: raw.bank[i].item, n: Math.max(1, raw.bank[i].n | 0) } : null));
  ch.equip = Object.fromEntries(SLOTS.filter((s) => ITEMS[raw.equip?.[s]]?.slot === s).map((s) => [s, raw.equip[s]]));
  ch.quests = { active: { ...(raw.quests?.active ?? {}) }, done: [...(raw.quests?.done ?? [])] };
  ch.skills = { ...newCharacter('x', ch.cls).skills, ...(raw.skills ?? {}) };
  ch.level = Math.max(1, Math.min(MAX_LEVEL, raw.level | 0 || 1));
  ch.gold = Math.max(0, Math.floor(Number(raw.gold) || 0));
  // Characters made before seed money existed get it once.
  if (!raw.seeded) {
    ch.gold += SEED_GOLD;
    ch.seeded = true;
  }
  return ch;
}

export { XP_TO, MAX_LEVEL };
