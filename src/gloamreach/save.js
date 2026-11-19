/**
 * Saving a Gloamreach hero to localStorage: versioned (SAVE_VERSION), every
 * read and write wrapped in try/catch (private windows, full storage, old or
 * broken saves all come back as "no save" rather than an error), and checked
 * on the way in so a bad entry can't break the game. Each class keeps its own
 * hero: level, experience, gold, bag, equipment and the chests it has opened.
 */
import { BASES, POTIONS, SLOTS, BAG_SIZE, STACK_MAX, RARITIES, slotsFor, newProfile } from './items.js';
import { MAX_LEVEL } from './rules.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'gloamreach.save';
const CLASSES = ['knight', 'ranger', 'mage'];

/** An item from a save, checked (or null if it is not one we know). */
function cleanItem(it) {
  if (!it || typeof it !== 'object' || !BASES[it.base] || !RARITIES[it.rarity]) return null;
  const stats = {};
  for (const [k, v] of Object.entries(it.stats ?? {})) if (Number.isFinite(v)) stats[k] = v;
  return {
    uid: String(it.uid ?? `s${Math.random().toString(36).slice(2)}`),
    base: it.base,
    rarity: it.rarity,
    ilvl: Math.max(1, it.ilvl | 0),
    req: Math.max(1, it.req | 0),
    name: String(it.name ?? BASES[it.base].name).slice(0, 80),
    stats,
    affixes: Array.isArray(it.affixes) ? it.affixes.map(String) : [],
    look: { metal: 'steel', cloth: '#5a4a3a', leather: '#5a3a24', gem: null, seed: 1, ...(it.look ?? {}) }
  };
}

/** A bag or stash entry from a save, checked (an item, a potion stack, or null). */
export function cleanEntry(e) {
  if (!e) return null;
  if (e.base) return cleanItem(e);
  if (POTIONS[e.kind] && e.n > 0) return { kind: e.kind, n: Math.min(STACK_MAX, e.n | 0) };
  return null;
}

/** A hero profile from a save, checked; a fresh one when it is missing or broken. */
export function cleanProfile(cls, p) {
  if (!p || typeof p !== 'object') return newProfile(cls);
  const out = newProfile(cls);
  out.level = Math.min(MAX_LEVEL, Math.max(1, p.level | 0));
  out.xp = Math.max(0, p.xp | 0);
  out.gold = Math.max(0, p.gold | 0);
  const bag = Array.isArray(p.bag) ? p.bag : [];
  out.bag = Array.from({ length: BAG_SIZE }, (_, i) => cleanEntry(bag[i]));
  out.equip = Object.fromEntries(SLOTS.map((s) => {
    const it = cleanItem(p.equip?.[s]);
    return [s, it && slotsFor(it).includes(s) ? it : null];
  }));
  out.opened = Array.isArray(p.opened) ? p.opened.map(String).slice(0, 200) : [];
  return out;
}

/** A new save holding one profile per class. */
export const newSave = () => ({ v: SAVE_VERSION, profiles: {} });

/** The save as text. */
export function serialize(save) {
  return JSON.stringify({ v: SAVE_VERSION, at: Date.now(), profiles: save.profiles ?? {} });
}

/**
 * Text from storage → a save, or null when it isn't one: not JSON, a newer
 * version than this game knows, or no version at all. Older versions would be
 * migrated here (there are none yet).
 */
export function parseSave(text) {
  if (typeof text !== 'string' || !text) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.v)) return null;
  if (raw.v > SAVE_VERSION || raw.v < 1) return null;
  const save = newSave();
  for (const cls of CLASSES) if (raw.profiles?.[cls]) save.profiles[cls] = cleanProfile(cls, raw.profiles[cls]);
  return save;
}

/** Read the save (a new one if there is none or it can't be read). */
export function loadSave(storage = globalThis.localStorage) {
  try {
    return parseSave(storage?.getItem(SAVE_KEY)) ?? newSave();
  } catch {
    return newSave();
  }
}

/** Write the save; false when storage refuses (private mode, full). */
export function writeSave(save, storage = globalThis.localStorage) {
  try {
    storage.setItem(SAVE_KEY, serialize(save));
    return true;
  } catch {
    return false;
  }
}

/** A class's profile from the save (made fresh the first time). */
export function profileFor(save, cls) {
  if (!save.profiles[cls]) save.profiles[cls] = newProfile(cls);
  return save.profiles[cls];
}
