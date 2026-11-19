/**
 * What a player's world remembers, zone by zone: where they are, the hubs
 * they've reached (their waystones), the last hub they rested at (where they
 * wake after falling), and per zone the chests opened, elites and bosses
 * defeated, gathering spots used, creatures befriended and places found —
 * plus the stash, shared by every hub, and flags for locks and story hooks.
 *
 * Versioned (ZONE_SAVE_VERSION) and checked on the way in: a bad or newer
 * save comes back as null, unknown fields are dropped, lists are trimmed.
 * Each game keeps it under its own key ('<game>.zones') and, the first time,
 * builds it from that game's older save with a migration of its own (see the
 * game's zones.js). Pure: tests/unit/zones.test.mjs.
 */

export const ZONE_SAVE_VERSION = 1;
export const RECORDS = ['chests', 'elites', 'bosses', 'nodes', 'friends', 'pois'];
const LIST_MAX = 400;

const clean = (list, max = LIST_MAX) => (Array.isArray(list) ? [...new Set(list.filter((x) => typeof x === 'string' && x.length < 120))].slice(0, max) : []);

/** A fresh world: in `zone`, at its hub. */
export function newZoneSave({ zone, hub = null, stashSize = 24 } = {}) {
  return {
    v: ZONE_SAVE_VERSION,
    zone,
    at: null,
    lastHub: hub,
    hubs: hub ? [hub] : [],
    visited: zone ? [zone] : [],
    zones: {},
    stash: Array.from({ length: stashSize }, () => null),
    flags: {},
    game: {}
  };
}

/** One zone's records (made on first use). */
export function zoneRecord(save, id) {
  save.zones[id] ??= Object.fromEntries(RECORDS.map((k) => [k, []]));
  return save.zones[id];
}

/** Note something done in a zone (a chest, an elite, a node…): true the first time. */
export function mark(save, zoneId, kind, id) {
  if (!RECORDS.includes(kind)) throw new Error(`unknown record "${kind}"`);
  const r = zoneRecord(save, zoneId);
  if (r[kind].includes(id)) return false;
  r[kind].push(id);
  if (r[kind].length > LIST_MAX) r[kind].shift();
  return true;
}

export const has = (save, zoneId, kind, id) => Boolean(save.zones[zoneId]?.[kind]?.includes(id));

/** Arrived in a zone (it counts as visited from now on). */
export function enterZone(save, zoneId) {
  save.zone = zoneId;
  if (!save.visited.includes(zoneId)) save.visited.push(zoneId);
}

/** Reached a hub: its waystone joins the network. True the first time. */
export function reachHub(save, hubId) {
  if (save.hubs.includes(hubId)) return false;
  save.hubs.push(hubId);
  return true;
}

/** Rested at a hub: it's where you wake if you fall. */
export function restAt(save, hubId) {
  reachHub(save, hubId);
  save.lastHub = hubId;
}

/**
 * Text → a zone save (or null: not JSON, not one, a version this game can't
 * read). `zones` (ids) and `hubs` (ids) keep out what no longer exists;
 * `upgrade(raw)` first maps a save made for an older layout of the game's
 * zones onto the current one (a zone split in two, say), before anything
 * unknown is dropped.
 */
export function parseZoneSave(text, { zones = null, hubs = null, stashSize = 24, cleanItem = (x) => x, cleanGame = (g) => g ?? {}, upgrade = null } = {}) {
  if (typeof text !== 'string' || !text) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (upgrade && raw && typeof raw === 'object') raw = upgrade(raw) ?? raw;
  return cleanZoneSave(raw, { zones, hubs, stashSize, cleanItem, cleanGame });
}

/** `cleanGame(raw.game)` checks the game's own kept things (a bag, coins); unknown fields elsewhere are dropped. */
export function cleanZoneSave(raw, { zones = null, hubs = null, stashSize = 24, cleanItem = (x) => x, cleanGame = (g) => (g && typeof g === 'object' ? g : {}) } = {}) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.v) || raw.v < 1 || raw.v > ZONE_SAVE_VERSION) return null;
  const okZone = (id) => typeof id === 'string' && (!zones || zones.includes(id));
  const okHub = (id) => typeof id === 'string' && (!hubs || hubs.includes(id));
  const out = newZoneSave({ zone: okZone(raw.zone) ? raw.zone : zones?.[0] ?? null, stashSize });
  out.hubs = clean(raw.hubs).filter(okHub);
  out.lastHub = okHub(raw.lastHub) ? raw.lastHub : out.hubs[0] ?? null;
  out.visited = clean(raw.visited).filter(okZone);
  if (out.zone && !out.visited.includes(out.zone)) out.visited.push(out.zone);
  if (raw.at && Number.isFinite(raw.at.x) && Number.isFinite(raw.at.z)) out.at = { x: raw.at.x, z: raw.at.z, yaw: Number.isFinite(raw.at.yaw) ? raw.at.yaw : 0 };
  for (const [id, r] of Object.entries(raw.zones ?? {})) {
    if (!okZone(id) || !r || typeof r !== 'object') continue;
    out.zones[id] = Object.fromEntries(RECORDS.map((k) => [k, clean(r[k])]));
  }
  const stash = Array.isArray(raw.stash) ? raw.stash : [];
  out.stash = Array.from({ length: stashSize }, (_, i) => (stash[i] == null ? null : cleanItem(stash[i]) ?? null));
  out.game = cleanGame(raw.game) ?? {};
  for (const [k, v] of Object.entries(raw.flags ?? {})) if (typeof k === 'string' && k.length < 60 && (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string')) out.flags[k] = v;
  return out;
}

export function serializeZoneSave(save) {
  return JSON.stringify({ ...save, v: ZONE_SAVE_VERSION, savedAt: Date.now() });
}

/**
 * The found-so-far counters for the Info board: for each kind the zone
 * knows a total of, how many are done. `totals` e.g. { chests: 3, elites: 1, pois: 5 }.
 */
export function counters(save, zoneId, totals) {
  const r = save.zones[zoneId] ?? {};
  return Object.entries(totals)
    .filter(([, n]) => n > 0)
    .map(([kind, total]) => ({ kind, done: Math.min(total, r[kind]?.length ?? 0), total }));
}

/* ------------------------------------------------------------------ storage */

/** Read a game's zone save; when there is none, `migrate()` builds one from its older save. */
export function loadZoneSave(key, { migrate, ...opts }) {
  let text = null;
  try {
    text = localStorage.getItem(key);
  } catch {
    /* private mode */
  }
  const parsed = parseZoneSave(text, opts);
  if (parsed) return parsed;
  const fresh = migrate?.() ?? null;
  const { upgrade, ...rest } = opts;
  return fresh ? cleanZoneSave(fresh, rest) ?? fresh : null;
}

export function writeZoneSave(key, save) {
  try {
    localStorage.setItem(key, serializeZoneSave(save));
    return true;
  } catch {
    return false;
  }
}
