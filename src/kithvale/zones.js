/**
 * Kithvale as zones (shared/zones, docs/zones.md): Lanternrest, the walled
 * village (its hub: the plaza, the teahouse and the shop, the Kith Garden),
 * and the vale beyond the big gate, with the Windbell Shrine on its hill as
 * the rest stop. Pure data and rules: what belongs where, keepsakes and the
 * petals the shop trades in, and the migration from Kithvale's save.
 */
import { defineZone, inBounds } from '../shared/zones/zone.js';
import { newZoneSave, mark, restAt } from '../shared/zones/state.js';
import { TREATS, TREAT_ORDER, SATCHEL_MAX, SPECIES } from './rules.js';
import { GATE, SHRINE, CACHES } from './map.js';

export const ZONE_SAVE_KEY = 'kithvale.zones';

const LANTERNREST = {
  id: 'lanternrest',
  name: 'Lanternrest',
  sub: 'a village of lanterns and tile roofs',
  theme: 'lantern',
  bounds: { x0: -110, x1: 110, z0: -220, z1: -40 },
  terrain: { source: 'kithvale' },
  look: { lighting: 'dusk' },
  music: { calm: 'lantern-valley' },
  features: ['inside'],
  world: [0.3, 0.72],
  spawns: {
    default: { x: 0.6, z: -97, yaw: 0 },
    gate: { x: 0, z: -94, yaw: Math.PI }
  },
  portals: [
    { id: 'big-gate', name: 'The big gate', x: GATE.x, z: GATE.z + 2.6, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'vale', arrive: 'gate', veil: { x: GATE.x, z: GATE.z + 0.6, face: Math.PI, w: GATE.width, h: GATE.height } }
  ],
  pois: [
    { id: 'plaza', name: 'The plaza and the well', x: 0, z: -128, kind: 'place' },
    { id: 'teahouse', name: 'The Kettle Teahouse', x: -12.6, z: -100, kind: 'place' },
    { id: 'shop', name: 'Satchel & Seed', x: 12.6, z: -101, kind: 'place' },
    { id: 'garden', name: 'The Kith Garden', x: 31, z: -128, kind: 'place' },
    { id: 'hall', name: "The Elders' Hall", x: 0, z: -170, kind: 'place' }
  ],
  hub: {
    id: 'lanternrest-plaza',
    name: 'Lanternrest',
    x: 0,
    z: -124,
    r: 36,
    color: '#ffb070',
    posts: false,
    services: {
      waystone: { x: 6, z: -124 },
      map: { x: -6.5, z: -93 },
      info: { x: 6.5, z: -93 },
      stash: { x: 21, z: -124 },
      stats: { x: -20, z: -133, name: 'the journal stand' },
      merchant: { x: 8.6, z: -101, name: 'Satchel & Seed' },
      rest: { x: -8.6, z: -100, name: 'the Kettle Teahouse' }
    }
  },
  story: { hooks: [] },
  tips: [
    'Lanternrest is home: the Kith Garden keeps the friends who are not following you.',
    'Satchel & Seed trades treats for petals; keepsakes from buried caches fetch a good price.',
    'Through the big gate: the vale, its meadows, the Hushwood, Mirror Pond and the shrine on the hill.',
    'Rest at the teahouse to let the hour turn back to golden dusk.'
  ]
};

const VALE = {
  id: 'vale',
  name: 'The vale',
  sub: 'meadows, the Hushwood, the pond and the shrine on the hill',
  theme: 'meadow',
  bounds: { x0: -180, x1: 180, z0: -100, z1: 250 },
  terrain: { source: 'kithvale' },
  look: { lighting: 'dusk' },
  music: { rule: 'kithvale' },
  features: ['outside', 'vale'],
  world: [0.7, 0.3],
  spawns: {
    default: { x: 0, z: -76, yaw: 0 },
    gate: { x: 0, z: -76, yaw: 0 }
  },
  portals: [
    { id: 'big-gate-back', name: 'The big gate', x: GATE.x, z: GATE.z + 1.2, shape: { type: 'box', hw: 3, hd: 1.2 }, to: 'lanternrest', arrive: 'gate', veil: { x: GATE.x, z: GATE.z - 0.4, face: 0, w: GATE.width, h: GATE.height } }
  ],
  pois: [
    { id: 'field', name: "Kemi's sunhead field", x: 22, z: -70, kind: 'place' },
    { id: 'bridge', name: 'The Pebblerun bridge', x: 6, z: 42, kind: 'place' },
    { id: 'meadow', name: 'Hopgrass Meadow', x: 66, z: 80, kind: 'place' },
    { id: 'pond', name: 'Mirror Pond', x: 66, z: -46, kind: 'place' },
    { id: 'hushwood', name: 'The Hushwood', x: -108, z: 116, kind: 'place' },
    { id: 'crags', name: 'Cinder Crags', x: -122, z: -48, kind: 'place' },
    { id: 'downs', name: 'Puffcrown Downs', x: 116, z: 150, kind: 'place' },
    { id: 'shrine', name: 'Windbell Shrine', x: SHRINE.x, z: SHRINE.z, kind: 'place' }
  ],
  hub: {
    id: 'windbell-shrine',
    name: 'Windbell Shrine',
    x: 10,
    z: 202,
    r: 18,
    color: '#ffd27a',
    services: {
      waystone: { x: 10, z: 190 },
      map: { x: 0, z: 194 },
      info: { x: 20, z: 194 },
      stash: { x: -2, z: 202 },
      stats: { x: 22, z: 204, name: 'the journal stand' },
      merchant: { x: -1, z: 210, name: 'the peddler' },
      rest: { x: 21, z: 211, name: 'the lookout bench' }
    }
  },
  story: { hooks: [] },
  tips: [
    'The shrine is a rest stop: its waystone takes you home to Lanternrest in a breath.',
    'Creep (Ctrl) and toss the treat each creature loves; the journal (J) remembers what they thought.',
    'A Tuftlet friend sniffs out buried caches — keepsakes are buried with the treats.',
    'Mistfawns are shy: a calm friend helps. Emberkits light the stone lanterns up the shrine path.'
  ]
};

export const ZONES = [LANTERNREST, VALE].map(defineZone);
export const zoneById = (id) => ZONES.find((z) => z.id === id) ?? null;
export const HUB_IDS = ZONES.map((z) => z.hub.id);

/** Which zone a point belongs to: inside the walls (south of the gate) is Lanternrest; the rest is the vale. */
export const zoneAt = (x, z) => (z < GATE.z - 0.5 && Math.abs(x) < 60 ? 'lanternrest' : 'vale');
export const inZone = (zone, x, z) => zoneAt(x, z) === zone.id && inBounds(zone.bounds, x, z);

/* ------------------------------------------------------------------ keepsakes and petals */

/** Little things buried with the treats in each cache (one each). */
export const KEEPSAKES = {
  bell: { name: 'Tiny wind bell', icon: '🔔', price: 18, blurb: 'Rings at the faintest breath.' },
  shell: { name: 'Spiral pebble', icon: '🐚', price: 12, blurb: 'Worn smooth by the Pebblerun.' },
  feather: { name: 'Lumoth feather', icon: '🪶', price: 15, blurb: 'Still faintly warm.' },
  charm: { name: 'Paper charm', icon: '🧧', price: 20, blurb: 'A wish, folded small.' },
  acorn: { name: 'Gilded acorn', icon: '🌰', price: 25, blurb: 'Someone painted it gold, long ago.' },
  marble: { name: 'Glass marble', icon: '🔮', price: 16, blurb: 'A whole sky inside.' }
};
const KEEP_ORDER = Object.keys(KEEPSAKES);
/** Which keepsake a cache holds. */
export const keepsakeOf = (cacheId) => KEEP_ORDER[CACHES.findIndex((c) => c.id === cacheId) % KEEP_ORDER.length] ?? 'shell';

/** What the shop sells (petals each) and pays. */
export const TREAT_PRICE = { berry: 3, seed: 4, crystal: 6 };
export const REFILL_TO = 6;

/** A pouch or stash entry: a treat stack { treat, n } or a keepsake { keep, n }. */
export const entryName = (e) => (e.treat ? TREATS[e.treat].name : KEEPSAKES[e.keep]?.name ?? '?');
export const entryKey = (e) => (e.treat ? `0${TREAT_ORDER.indexOf(e.treat)}` : `1${e.keep}`);

/** The satchel's treats and the pouch's keepsakes as one list of slots (the stash screen's "bag"). */
export function carried(satchel, pouch, size = 12) {
  const out = TREAT_ORDER.filter((t) => satchel[t] > 0).map((t) => ({ treat: t, n: satchel[t] }));
  for (const e of pouch) if (e) out.push(e);
  return Array.from({ length: size }, (_, i) => out[i] ?? null);
}

/** Slots back into the satchel and the pouch. */
export function uncarry(slots, satchel) {
  for (const t of TREAT_ORDER) satchel[t] = 0;
  const pouch = [];
  for (const e of slots) {
    if (!e) continue;
    if (e.treat) satchel[e.treat] = Math.min(SATCHEL_MAX, satchel[e.treat] + e.n);
    else pouch.push(e);
  }
  return pouch;
}

/** Stacking for the stash: treats up to the satchel's limit, keepsakes up to 9. */
export const STACK = { stack: (a, b) => (a.treat ? a.treat === b.treat : a.keep === b.keep), max: SATCHEL_MAX, count: (e) => e.n, setCount: (e, n) => (e.n = n) };

/** A kept entry from a save, checked. */
export function cleanEntry(e) {
  if (e?.treat && TREATS[e.treat] && e.n > 0) return { treat: e.treat, n: Math.min(SATCHEL_MAX, Math.floor(e.n)) };
  if (e?.keep && KEEPSAKES[e.keep] && e.n > 0) return { keep: e.keep, n: Math.min(9, Math.floor(e.n)) };
  return null;
}

export function cleanKeeper(raw) {
  const pouch = Array.isArray(raw?.pouch) ? raw.pouch.map(cleanEntry).filter(Boolean).slice(0, 9) : [];
  return { pouch, petals: Math.max(0, Math.floor(Number(raw?.petals) || 0)) };
}

/**
 * The first world save, from Kithvale's save (rules.js v1): befriended
 * species count in the vale's records, dug caches and broken boulders as its
 * gathered spots (each cache's keepsake goes into the pouch); everyone starts
 * in Lanternrest, its plaza reached and rested at, with 20 petals.
 */
export function migrateLegacy(state) {
  const save = newZoneSave({ zone: 'lanternrest', hub: 'lanternrest-plaza', stashSize: 24 });
  restAt(save, 'lanternrest-plaza');
  const pouch = [];
  for (const sp of state?.befriended ?? []) if (SPECIES[sp]) mark(save, 'vale', 'friends', sp);
  for (const id of state?.caches ?? []) {
    mark(save, 'vale', 'nodes', `cache:${id}`);
    const k = keepsakeOf(id);
    const has = pouch.find((e) => e.keep === k);
    if (has) has.n++;
    else pouch.push({ keep: k, n: 1 });
  }
  for (const id of state?.boulders ?? []) mark(save, 'vale', 'nodes', `boulder:${id}`);
  if (state?.hollow) mark(save, 'vale', 'pois', 'hollow');
  save.game = { pouch: pouch.slice(0, 9), petals: 20 };
  return save;
}
