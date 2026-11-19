/**
 * Wyldhunt as zones (shared/zones, docs/zones.md): the guild's base camp, a
 * small hub of its own, and Mistfall Gorge beyond the Hunters' Gate, played as
 * two hunting grounds joined at the Stair of Roots:
 *
 *   Lantern Camp     the base camp, behind the palisade
 *   Veilfall Reach   the lower gorge: the Green Cleft, the Drowned Colonnade,
 *                    the ford, Veilfall, the Root Gate — the forward camp at
 *                    its mouth
 *   Hollow Heights   above the stair: Velvet Meadow, Ropewalk Gorge,
 *                    Fernspill, Old Throne Hollow, the Grand Fall and its
 *                    colossi — Kestrel Lookout at the stair's head
 *
 * The Gnarlhorn lives in the Hollow Heights (its den and every haunt are
 * there); below, its old prints lead up the path, and once it's tracked the
 * scout flies lead to the way up (each zone's `huntWay`). A second trail south
 * of the camp waits for the next hunting ground ("coming soon").
 *
 * Pure: which nodes, herds, nests and ruins belong where, and the save Wyldhunt
 * starts from (it kept only the hunter's look before; the bag and coins are
 * kept from now on, beside the world), and how a save from the single gorge
 * maps onto the two.
 */
import { defineZone, inBounds } from '../shared/zones/zone.js';
import { newZoneSave, restAt, RECORDS } from '../shared/zones/state.js';
import { newKit, BAG_SIZE, ITEMS } from './rules.js';
import { NODES } from './map.js';

export const ZONE_SAVE_KEY = 'wyldhunt.zones';
/** The palisade across the gorge, its gate on the path. */
export const PALISADE = { z: 300, x0: -50, x1: 38, gate: { x: -6, half: 3 } };

/**
 * The Stair of Roots, where the gorge is split: a wall of great roots spilling
 * down the step in the canyon's floor from wall to wall (x0–x1), and the Root
 * Stair — an arch of two roots over the old stone steps — the one way through.
 * `line(x)` is the wall's line (z): below it (larger z) the Reach, above it the
 * Heights. The gate stands where the path crosses it.
 */
export const ROOTWALL = {
  x0: -78,
  x1: 80,
  z: 24,
  wave: 3,
  gate: { x: 9.27, z: 25.36, half: 2.9, face: 2.648 }
};
export const rootLine = (x) => ROOTWALL.z + ROOTWALL.wave * Math.sin(x / 19);

const BASE_CAMP = {
  id: 'base-camp',
  name: 'Lantern Camp',
  sub: "the hunters' base camp",
  theme: 'lantern',
  bounds: { x0: -110, x1: 110, z0: 270, z1: 470 },
  terrain: { source: 'wyldhunt' },
  look: { lighting: 'jungle' },
  music: { rule: 'wyldhunt' },
  features: ['camp', 'water', 'flora', 'palisade'],
  world: [0.34, 0.66],
  huntWay: 'hunters-gate',
  spawns: {
    default: { x: 3, z: 340, yaw: Math.PI },
    gate: { x: -5, z: 312, yaw: 0 }
  },
  portals: [
    { id: 'hunters-gate', name: "The Hunters' Gate", x: -6, z: 299.5, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'veilfall-reach', arrive: 'gate', veil: { x: -6, z: 300, face: 0, w: 5.6, h: 5.4 } },
    { id: 'south-trail', name: 'The Southern Trail', x: 4, z: 392, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'emberwilds', soon: true, soonText: 'A second hunting ground, coming soon', arch: { x: 4, z: 393, face: 0 } }
  ],
  pois: [
    { id: 'camp', name: 'Lantern Camp', x: 4, z: 350, kind: 'place' },
    { id: 'gate', name: "The Hunters' Gate", x: -6, z: 304, kind: 'door' },
    { id: 'trail', name: 'The Southern Trail', x: 4, z: 388, kind: 'door' }
  ],
  hub: {
    id: 'lantern-camp',
    name: 'Lantern Camp',
    x: 4,
    z: 348,
    r: 22,
    color: '#ffc46a',
    services: {
      map: { x: -1, z: 348, name: 'the map table' },
      rest: { x: 9.5, z: 353, name: 'the tent' },
      stash: { x: 14, z: 345 },
      info: { x: -10, z: 352 },
      stats: { x: 15, z: 337 },
      merchant: { x: -11, z: 340 },
      waystone: { x: 12, z: 331 }
    }
  },
  story: { hooks: [] },
  tips: [
    'The camp is safe: nothing from the gorge comes past the palisade.',
    'The supply box restocks your draughts and rations for free; the provisioner buys what you gather and carve.',
    "Through the Hunters' Gate lies Veilfall Reach; the Gnarlhorn's haunts are higher, above the Stair of Roots.",
    'Whistle (X) for Burrow anywhere: your Shagmane comes along through every gate, and if you ride through, you arrive riding.'
  ]
};

const REACH = {
  id: 'veilfall-reach',
  name: 'Veilfall Reach',
  sub: 'the lower gorge: ruins, the ford, a fall off the west wall',
  theme: 'jungle',
  bounds: { x0: -165, x1: 110, z0: 12, z1: 312 },
  terrain: { source: 'wyldhunt' },
  look: { lighting: 'jungle' },
  music: { rule: 'wyldhunt' },
  features: ['water', 'flora', 'ruins', 'palisade', 'rootwall'],
  world: [0.55, 0.43],
  huntWay: 'root-stair',
  spawns: {
    default: { x: -8, z: 288, yaw: Math.PI },
    gate: { x: -8, z: 288, yaw: Math.PI },
    stair: { x: 1.5, z: 39, yaw: -0.5 }
  },
  portals: [
    { id: 'hunters-gate-back', name: "The Hunters' Gate", x: -6, z: 300.5, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'base-camp', arrive: 'gate', veil: { x: -6, z: 300, face: Math.PI, w: 5.6, h: 5.4 } },
    // Through the Root Stair's arch, a step up the stair past the roots.
    { id: 'root-stair', name: 'The Stair of Roots', x: 10.65, z: 22.7, shape: { type: 'box', hw: 3, hd: 1.3, face: 2.648 }, to: 'hollow-heights', arrive: 'stair' }
  ],
  pois: [
    { id: 'forward', name: 'The forward camp', x: -10, z: 274, kind: 'place' },
    { id: 'colonnade', name: 'The Drowned Colonnade', x: -42, z: 160, kind: 'place' },
    { id: 'ford', name: 'The ford', x: -20, z: 186, kind: 'place' },
    { id: 'veilfall', name: 'Veilfall', x: -80, z: 136, kind: 'place' },
    { id: 'rootgate', name: 'The Root Gate', x: -9, z: 47, kind: 'place' },
    { id: 'rootstair', name: 'The Stair of Roots', x: 4, z: 34, kind: 'door' }
  ],
  hub: {
    id: 'forward-camp',
    name: 'The forward camp',
    x: -10,
    z: 274,
    r: 15,
    color: '#ffc46a',
    services: {
      waystone: { x: 0, z: 268 },
      map: { x: -20, z: 282 },
      info: { x: -22, z: 272 },
      stash: { x: -20, z: 264 },
      stats: { x: 2, z: 280 },
      merchant: { x: -2, z: 264 },
      rest: { x: 3, z: 275 }
    }
  },
  story: { hooks: [] },
  tips: [
    'The forward camp is safe: nothing from the gorge follows you inside its lanterns.',
    "The Gnarlhorn's old prints run up the path: read three and the scout flies lead you to the Stair of Roots.",
    'Thornskitters nest by the colonnade; velvetbucks graze across the ford.',
    'The Stair of Roots climbs to the Hollow Heights, where the Gnarlhorn haunts the meadow, the falls and its den.'
  ]
};

const HEIGHTS = {
  id: 'hollow-heights',
  name: 'Hollow Heights',
  sub: 'above the Stair of Roots: the meadow, the falls, the Gnarlhorn\'s den',
  theme: 'mist',
  bounds: { x0: -165, x1: 125, z0: -440, z1: 38 },
  terrain: { source: 'wyldhunt' },
  look: { lighting: 'jungle' },
  music: { rule: 'wyldhunt' },
  features: ['water', 'flora', 'ruins', 'hunt', 'rootwall', 'lookout'],
  world: [0.78, 0.18],
  lookout: { x: 40, z: 8.5 },
  spawns: {
    default: { x: 17, z: 9, yaw: Math.PI * 0.86 },
    stair: { x: 17, z: 9, yaw: Math.PI * 0.86 }
  },
  portals: [
    { id: 'root-stair-down', name: 'The Stair of Roots', x: 7.83, z: 28.0, shape: { type: 'box', hw: 3, hd: 1.3, face: 2.648 }, to: 'veilfall-reach', arrive: 'stair' }
  ],
  pois: [
    { id: 'lookout', name: 'Kestrel Lookout', x: 28, z: 4, kind: 'place' },
    { id: 'meadow', name: 'Velvet Meadow', x: 34, z: -24, kind: 'place' },
    { id: 'bridge', name: 'Ropewalk Gorge', x: 33, z: -70, kind: 'place' },
    { id: 'fern', name: 'Fernspill', x: 62, z: -134, kind: 'place' },
    { id: 'hollow', name: 'Old Throne Hollow', x: -86, z: -236, kind: 'place' },
    { id: 'grandfall', name: 'The Grand Fall', x: 12, z: -360, kind: 'place' }
  ],
  hub: {
    id: 'kestrel-lookout',
    name: 'Kestrel Lookout',
    x: 28,
    z: 4,
    r: 14,
    color: '#ffd27a',
    services: {
      waystone: { x: 22, z: 12.5 },
      rest: { x: 30, z: 13.5 },
      map: { x: 36.5, z: 11 },
      info: { x: 39, z: 1 },
      stash: { x: 35.5, z: -5 },
      merchant: { x: 27, z: -7.5 },
      stats: { x: 32, z: 2 }
    }
  },
  story: { hooks: [] },
  tips: [
    "Kestrel Lookout is safe: the Gnarlhorn won't follow you inside its lanterns.",
    'Walk over three of its footprints and the scout flies lead you to it.',
    'Break its horns and sever its tail club for rarer carves.',
    'Below green sharpness the greatblade bounces off its back plates: whetstone (7).'
  ]
};

const EMBERWILDS = { id: 'emberwilds', name: 'The Emberwilds', sub: 'the next hunting ground', stub: true, world: [0.14, 0.84] };

export const ZONES = [BASE_CAMP, REACH, HEIGHTS, EMBERWILDS].map(defineZone);
export const zoneById = (id) => ZONES.find((z) => z.id === id) ?? null;
export const HUB_IDS = ZONES.filter((z) => z.hub).map((z) => z.hub.id);
/** The zone the Gnarlhorn lives in. */
export const HUNT_ZONE = 'hollow-heights';

/** Which zone a point of the old single map belongs to: the camp south of the palisade, the Reach up to the root wall, the Heights above. */
export function zoneAt(x, z) {
  if (z > PALISADE.z) return 'base-camp';
  return z > rootLine(x) ? 'veilfall-reach' : 'hollow-heights';
}
export const inZone = (zone, x, z) => zoneAt(x, z) === zone.id && inBounds(zone.bounds, x, z);

/* ------------------------------------------------------------------ saves from the single gorge */

/** The ids the gorge had as one zone, and its points of interest by where they are now. */
const OLD_GORGE = 'mistfall-gorge';
const OLD_POIS = { forward: 'veilfall-reach', colonnade: 'veilfall-reach', ford: 'veilfall-reach', rootgate: 'veilfall-reach', meadow: 'hollow-heights', bridge: 'hollow-heights', fern: 'hollow-heights', hollow: 'hollow-heights', grandfall: 'hollow-heights' };

/**
 * A zone save from before the split (one "mistfall-gorge"), raw from JSON,
 * mapped onto the two zones: each gathering spot's record to the zone that
 * holds the spot, places to theirs, hunts to the Heights, where you stood to
 * the zone that holds it (the Reach if unknown), visited to whichever the
 * records show. The forward camp keeps its id, so the waystones and the last
 * hub rested at carry over as they are. Anything else passes through.
 */
export function upgradeSave(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const old = raw.zones?.[OLD_GORGE];
  const wasThere = raw.zone === OLD_GORGE || (Array.isArray(raw.visited) && raw.visited.includes(OLD_GORGE));
  if (!old && !wasThere) return raw;
  const out = { ...raw, zones: { ...(raw.zones ?? {}) } };
  delete out.zones[OLD_GORGE];
  const rec = (id) => (out.zones[id] ??= Object.fromEntries(RECORDS.map((k) => [k, []])));
  const put = (id, kind, v) => {
    const r = rec(id);
    if (!Array.isArray(r[kind])) r[kind] = [];
    if (!r[kind].includes(v)) r[kind].push(v);
  };
  const nodeZone = new Map(NODES.map((n) => [n.id, zoneAt(n.x, n.z)]));
  for (const kind of RECORDS) {
    for (const v of Array.isArray(old?.[kind]) ? old[kind] : []) {
      if (typeof v !== 'string') continue;
      if (kind === 'nodes') put(nodeZone.get(v) === 'hollow-heights' ? 'hollow-heights' : 'veilfall-reach', kind, v);
      else if (kind === 'pois') put(OLD_POIS[v] ?? 'veilfall-reach', kind, v);
      else if (kind === 'bosses' || kind === 'elites') put('hollow-heights', kind, v);
      else put('veilfall-reach', kind, v);
    }
  }
  const at = raw.at && Number.isFinite(raw.at.x) && Number.isFinite(raw.at.z) ? raw.at : null;
  if (raw.zone === OLD_GORGE) out.zone = at ? zoneAt(at.x, at.z) : 'veilfall-reach';
  if (out.zone === 'base-camp' && raw.zone === OLD_GORGE) out.zone = 'veilfall-reach';
  const visited = (Array.isArray(raw.visited) ? raw.visited : []).filter((v) => v !== OLD_GORGE);
  const add = (id) => !visited.includes(id) && visited.push(id);
  if (wasThere) add('veilfall-reach');
  if (out.zone === 'hollow-heights' || Object.values(out.zones['hollow-heights'] ?? {}).some((l) => Array.isArray(l) && l.length)) add('hollow-heights');
  out.visited = visited;
  return out;
}

/* ------------------------------------------------------------------ the hunter's things */

/** Coins the provisioner pays for one of each gathered or carved thing. */
export const SELL = { sunleaf: 6, dewcap: 7, ironvein: 9, mistquartz: 18, lampbug: 8, thunderbug: 12, oldbone: 7, gnarlScale: 40, gnarlHide: 45, gnarlFang: 60, gnarlHorn: 120, gnarlClub: 90, mossPlate: 55, raw: 5, chitin: 22 };
/** What the provisioner sells (coins each). */
export const BUY = { potion: 12, mega: 40, ration: 10 };

/** A bag as fixed slots (for the stash screen) and back to the game's compact list. */
export const toSlots = (bag) => Array.from({ length: BAG_SIZE }, (_, i) => bag[i] ?? null);
export const fromSlots = (slots) => slots.filter(Boolean);

/** Sell all of one item: coins earned. */
export function sellAll(bag, id) {
  const price = SELL[id];
  if (!price) return 0;
  let n = 0;
  for (let i = bag.length - 1; i >= 0; i--) {
    if (bag[i].id !== id) continue;
    n += bag[i].n;
    bag.splice(i, 1);
  }
  return n * price;
}

/** Top the draughts and rations back up to the kit's counts for coins: { coins left, bought, cost }. */
export function refill(bag, coins, add) {
  let cost = 0;
  const bought = {};
  for (const k of newKit().bag) {
    if (!BUY[k.id]) continue;
    const have = bag.filter((s) => s.id === k.id).reduce((a, s) => a + s.n, 0);
    let want = Math.max(0, k.n - have);
    while (want > 0 && coins - cost >= BUY[k.id]) {
      if (!add(k.id, 1)) break;
      cost += BUY[k.id];
      bought[k.id] = (bought[k.id] ?? 0) + 1;
      want--;
    }
  }
  return { coins: coins - cost, bought, cost };
}

/** The hunter's kept things (in the zone save's `game`): the field bag and the coins, checked. */
export function cleanHunter(raw) {
  const bag = Array.isArray(raw?.bag) ? raw.bag.filter((s) => s && ITEMS[s.id] && Number.isFinite(s.n) && s.n > 0).map((s) => ({ id: s.id, n: Math.min(ITEMS[s.id].stack, Math.floor(s.n)) })).slice(0, BAG_SIZE) : null;
  return { bag, coins: Math.max(0, Math.floor(Number(raw?.coins) || 0)) };
}

/**
 * The first world save, from what Wyldhunt kept before zones: only the
 * hunter's look (wyldhunt.prefs), which stays where it is. Everyone starts
 * at Lantern Camp, its waystone lit and rested at, with the starting kit and
 * 60 coins.
 */
export function migrateLegacy(prefs = {}) {
  const save = newZoneSave({ zone: 'base-camp', hub: 'lantern-camp', stashSize: BAG_SIZE });
  restAt(save, 'lantern-camp');
  save.game = { bag: newKit().bag, coins: 60, look: typeof prefs?.look === 'string' ? prefs.look : null };
  return save;
}
