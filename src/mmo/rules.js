import { CLASSES, ITEMS, SLOTS, XP_TO, MAX_LEVEL, BAG_SIZE, BANK_SIZE, STARTER, QUESTS, PROFESSIONS, SEED_GOLD, ATTR_ORDER, POINTS, NODES_OF } from './data.js';

import { cleanLook } from './looks.js';

/**
 * Hearthvale's formulas, shared by the server (which decides) and the
 * browser (which shows): a character's stats, experience, bags, quests.
 * A character is plain data, saved as it is.
 */

export const NAME_RE = /^[A-Za-z][A-Za-z' -]{1,15}$/;

/** A new character: level 1 in Hearthvale with its class's kit. */
export function newCharacter(name, cls, look = null) {
  const kit = STARTER[cls];
  const bag = new Array(BAG_SIZE).fill(null);
  kit.bag.forEach(([item, n], i) => (bag[i] = { item, n }));
  return {
    name, cls, look: cleanLook(cls, look), level: 1, xp: 0, gold: SEED_GOLD, seeded: true, zone: 'hearthvale', x: 60, z: 92, hp: null, mana: null,
    equip: { weapon: kit.weapon, chest: kit.chest },
    bag, bank: new Array(BANK_SIZE).fill(null),
    quests: { active: {}, done: [] },
    skills: Object.fromEntries(Object.keys(PROFESSIONS).map((k) => [k, 1])),
    bars: CLASSES[cls].skills.map((s) => s.id),
    attrs: Object.fromEntries(ATTR_ORDER.map((a) => [a, 0])),
    tree: freeNodes(cls)
  };
}

/* ---- attributes and the skill tree ---- */

/** What every character of a class knows from the start: its level-1 skills, at rank 1. */
export function freeNodes(cls) {
  return Object.fromEntries(Object.values(NODES_OF[cls]).filter((n) => n.free).map((n) => [n.id, 1]));
}

/** The rank a character has in a skill or a passive (0: not learned). */
export const rankOf = (ch, id) => ch.tree?.[id] ?? 0;

/** Attribute points not yet spent: five a level. */
export function attrPointsLeft(ch) {
  return (ch.level - 1) * POINTS.attrs - ATTR_ORDER.reduce((n, a) => n + (ch.attrs?.[a] ?? 0), 0);
}

/** Skill points not yet spent: one a level (the free level-1 skills cost nothing). */
export function skillPointsLeft(ch) {
  const nodes = NODES_OF[ch.cls];
  const spent = Object.entries(ch.tree ?? {}).reduce((n, [id, r]) => n + (nodes[id] ? r - (nodes[id].free ? 1 : 0) : 0), 0);
  return (ch.level - 1) * POINTS.skills - spent;
}

/** Why a node cannot take another rank right now, or null if it can. */
export function cannotLearn(ch, id) {
  const node = NODES_OF[ch.cls]?.[id];
  if (!node) return 'No such skill';
  if (rankOf(ch, id) >= node.max) return 'Already at its highest rank';
  if (node.level && ch.level < node.level) return `Needs level ${node.level}`;
  if (node.needs && !rankOf(ch, node.needs)) return `Learn ${NODES_OF[ch.cls][node.needs].name} first`;
  if (skillPointsLeft(ch) < 1) return 'No skill points — you earn one each level';
  return null;
}

/** Put a skill point in a node. Returns why not, or null when done. */
export function learn(ch, id) {
  const why = cannotLearn(ch, id);
  if (why) return why;
  ch.tree[id] = rankOf(ch, id) + 1;
  return null;
}

/** Put attribute points in one attribute. Returns why not, or null when done. */
export function raiseAttr(ch, attr, n = 1) {
  const k = Math.max(1, Math.min(50, n | 0));
  if (!ATTR_ORDER.includes(attr)) return 'No such attribute';
  if (attrPointsLeft(ch) < k) return 'No attribute points — you earn five each level';
  ch.attrs[attr] = (ch.attrs[attr] ?? 0) + k;
  return null;
}

/** What starting over costs: gold by level (free at level 1). */
export const respecCost = (ch) => (ch.level - 1) * POINTS.respec;

/** Take every skill and attribute point back, for gold. Returns why not, or null when done. */
export function respec(ch) {
  const cost = respecCost(ch);
  if (ch.gold < cost) return `Starting over costs ${cost} gold`;
  ch.gold -= cost;
  ch.attrs = Object.fromEntries(ATTR_ORDER.map((a) => [a, 0]));
  ch.tree = freeNodes(ch.cls);
  return null;
}

/** What the passives a character has learned add up to, by stat (in percent). */
export function passivesOf(ch) {
  const sum = {};
  for (const [id, r] of Object.entries(ch.tree ?? {})) {
    const node = NODES_OF[ch.cls]?.[id];
    if (node?.kind === 'passive') sum[node.stat] = (sum[node.stat] ?? 0) + node.per * r;
  }
  return sum;
}

/** How much more a skill does at the rank a character has it. */
export const rankMult = (ch, id) => 1 + Math.max(0, rankOf(ch, id) - 1) * POINTS.rank;

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
  const a = Object.fromEntries(ATTR_ORDER.map((k) => [k, ch.attrs?.[k] ?? 0]));
  const p = passivesOf(ch);
  const pct = (k) => 1 + (p[k] ?? 0) / 100;
  const main = CLASSES[ch.cls].main;
  const haste = Math.min(0.5, a.agi * 0.003 + (p.haste ?? 0) / 100);
  return {
    maxHp: Math.round((b.hp + b.hpL * l + gear.stamina * 10 + a.vit * 8) * pct('hpPct')),
    maxMana: Math.round((b.mana + b.manaL * l + a.int * 4) * pct('manaPct')),
    power: Math.round((b.power + b.powerL * l + gear.power + (a[main] ?? 0) * POINTS.mainPower) * pct('powerPct')),
    armor: Math.round((b.armor + b.armorL * l + gear.armor + a.str) * pct('armorPct')),
    range: b.range,
    swing: b.speed / (1 + haste),
    regen: (b.regen + a.int * 0.03) * pct('regenPct'),
    ranged: Boolean(CLASSES[ch.cls].ranged),
    crit: Math.min(0.6, 0.1 + a.agi * 0.0025 + (p.crit ?? 0) / 100),
    haste,
    costMult: Math.max(0.5, 1 - (p.costCut ?? 0) / 100),
    cdMult: Math.max(0.5, 1 - (p.cdCut ?? 0) / 100),
    healMult: pct('healPct'),
    leech: (p.leech ?? 0) / 100,
    threat: (CLASSES[ch.cls].threat ?? 1) * pct('threatPct')
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
  ch.look = cleanLook(ch.cls, raw.look);
  ch.gold = Math.max(0, Math.floor(Number(raw.gold) || 0));
  // Attributes: whole, not negative, and no more than the levels brought.
  ch.attrs = Object.fromEntries(ATTR_ORDER.map((a) => [a, Math.max(0, Math.floor(Number(raw.attrs?.[a]) || 0))]));
  if (attrPointsLeft(ch) < 0) ch.attrs = Object.fromEntries(ATTR_ORDER.map((a) => [a, 0]));
  // The tree. A character from before there was one knows every skill its level had opened.
  const nodes = NODES_OF[ch.cls];
  if (raw.tree && typeof raw.tree === 'object') {
    ch.tree = { ...freeNodes(ch.cls) };
    for (const [id, r] of Object.entries(raw.tree)) if (nodes[id]) ch.tree[id] = Math.max(nodes[id].free ? 1 : 0, Math.min(nodes[id].max, r | 0));
    for (const id of Object.keys(ch.tree)) if (!ch.tree[id]) delete ch.tree[id];
    if (skillPointsLeft(ch) < 0) ch.tree = freeNodes(ch.cls);
  } else {
    ch.tree = freeNodes(ch.cls);
    for (const n of Object.values(nodes).sort((x, y) => (x.level ?? 0) - (y.level ?? 0))) if (n.kind === 'skill' && !n.free && n.level <= ch.level && skillPointsLeft(ch) > 0) ch.tree[n.id] = 1;
  }
  // Characters made before seed money existed get it once.
  if (!raw.seeded) {
    ch.gold += SEED_GOLD;
    ch.seeded = true;
  }
  return ch;
}

export { XP_TO, MAX_LEVEL };

/** Wear what is in a bag slot (what was worn goes back there). Returns why not, or null when done. */
export function wear(ch, bagSlot) {
  const i = bagSlot | 0;
  const s = ch.bag[i];
  const it = s && ITEMS[s.item];
  if (!it?.slot) return 'That isn\'t something to wear';
  if ((it.level ?? 1) > ch.level) return `Needs level ${it.level}`;
  const old = ch.equip[it.slot];
  ch.equip[it.slot] = s.item;
  ch.bag[i] = old ? { item: old, n: 1 } : null;
  return null;
}

/** Take off what is worn in a slot, into the bag. Returns why not, or null when done. */
export function takeOff(ch, slot) {
  if (!SLOTS.includes(slot) || !ch.equip[slot]) return 'Nothing is worn there';
  if (!give(ch, ch.equip[slot], 1)) return 'Your bag is full';
  delete ch.equip[slot];
  return null;
}
