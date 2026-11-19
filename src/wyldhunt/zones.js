/**
 * Wyldhunt as zones (shared/zones, docs/zones.md): the guild's base camp, a
 * small hub of its own, and Mistfall Gorge, the hunting ground beyond the
 * Hunters' Gate, with a forward camp at its mouth. A second trail south of
 * the camp waits for the next hunting ground ("coming soon").
 *
 * Pure: which nodes, herds, nests and ruins belong where, and the save Wyldhunt
 * starts from (it kept only the hunter's look before; the bag and coins are
 * kept from now on, beside the world).
 */
import { defineZone, inBounds } from '../shared/zones/zone.js';
import { newZoneSave, restAt } from '../shared/zones/state.js';
import { newKit, BAG_SIZE, ITEMS } from './rules.js';

export const ZONE_SAVE_KEY = 'wyldhunt.zones';
/** The palisade across the gorge, its gate on the path. */
export const PALISADE = { z: 300, x0: -50, x1: 38, gate: { x: -6, half: 3 } };

const BASE_CAMP = {
  id: 'base-camp',
  name: 'Lantern Camp',
  sub: "the hunters' base camp",
  theme: 'lantern',
  bounds: { x0: -110, x1: 110, z0: 270, z1: 470 },
  terrain: { source: 'wyldhunt' },
  look: { lighting: 'jungle' },
  music: { calm: 'jungle' },
  features: ['camp', 'water', 'flora', 'palisade'],
  world: [0.3, 0.7],
  spawns: {
    default: { x: 3, z: 340, yaw: Math.PI },
    gate: { x: -5, z: 312, yaw: 0 }
  },
  portals: [
    { id: 'hunters-gate', name: "The Hunters' Gate", x: -6, z: 299.5, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'mistfall-gorge', arrive: 'gate', veil: { x: -6, z: 300, face: 0, w: 5.6, h: 5.4 } },
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
    "Through the Hunters' Gate lies Mistfall Gorge and the Gnarlhorn's haunts.",
    'Whistle (X) for Burrow anywhere: your Shagmane comes along through every gate.'
  ]
};

const GORGE = {
  id: 'mistfall-gorge',
  name: 'Mistfall Gorge',
  sub: 'the hunting ground',
  theme: 'jungle',
  bounds: { x0: -170, x1: 170, z0: -440, z1: 312 },
  terrain: { source: 'wyldhunt' },
  look: { lighting: 'jungle' },
  music: { calm: 'jungle' },
  features: ['water', 'flora', 'ruins', 'palisade', 'hunt'],
  world: [0.7, 0.32],
  spawns: {
    default: { x: -8, z: 288, yaw: Math.PI },
    gate: { x: -8, z: 288, yaw: Math.PI }
  },
  portals: [
    { id: 'hunters-gate-back', name: "The Hunters' Gate", x: -6, z: 300.5, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'base-camp', arrive: 'gate', veil: { x: -6, z: 300, face: Math.PI, w: 5.6, h: 5.4 } }
  ],
  pois: [
    { id: 'forward', name: 'The forward camp', x: -10, z: 274, kind: 'place' },
    { id: 'colonnade', name: 'The Drowned Colonnade', x: -42, z: 160, kind: 'place' },
    { id: 'ford', name: 'The ford', x: -20, z: 186, kind: 'place' },
    { id: 'rootgate', name: 'The Root Gate', x: -9, z: 47, kind: 'place' },
    { id: 'meadow', name: 'Velvet Meadow', x: 34, z: -2, kind: 'place' },
    { id: 'bridge', name: 'Ropewalk Gorge', x: 33, z: -70, kind: 'place' },
    { id: 'fern', name: 'Fernspill', x: 62, z: -134, kind: 'place' },
    { id: 'hollow', name: 'Old Throne Hollow', x: -86, z: -236, kind: 'place' },
    { id: 'grandfall', name: 'The Grand Fall', x: 12, z: -360, kind: 'place' }
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
    "The forward camp is safe: the Gnarlhorn won't follow you inside its lanterns.",
    'Walk over three of its footprints and the scout flies lead you to it.',
    'Break its horns and sever its tail club for rarer carves.',
    'Below green sharpness the greatblade bounces off its back plates: whetstone (7).'
  ]
};

const EMBERWILDS = { id: 'emberwilds', name: 'The Emberwilds', sub: 'the next hunting ground', stub: true, world: [0.08, 0.32] };

export const ZONES = [BASE_CAMP, GORGE, EMBERWILDS].map(defineZone);
export const zoneById = (id) => ZONES.find((z) => z.id === id) ?? null;
export const HUB_IDS = ZONES.filter((z) => z.hub).map((z) => z.hub.id);

/** Which zone a point of the old single map belongs to: the camp south of the palisade, the gorge north of it. */
export const zoneAt = (x, z) => (z > PALISADE.z ? 'base-camp' : 'mistfall-gorge');
export const inZone = (zone, x, z) => zoneAt(x, z) === zone.id && inBounds(zone.bounds, x, z);

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
