/**
 * Gloamreach as zones (shared/zones, docs/zones.md): three medium maps in one
 * coordinate frame, each built on its own, joined by doors.
 *
 *   Brindlewick    the village (its hub: the square), the fields, the woods round it,
 *                  the overlook — and the Cinder Stair down from the old ledge.
 *   The Gloamwood  through the Warden's Gate tunnel; the Keepers' Grove at its mouth.
 *   The Cinder Rift  down the stair: Ashward Outpost at the cliff's foot, the lava
 *                  floor, and Cindermaw on Emberfall Ledge.
 *
 * Pure data and rules (tests/unit/zones.test.mjs): which spawns, chests,
 * people and features belong to which zone, and the migration from the save
 * Gloamreach kept before it had zones.
 */
import { defineZone, inBounds } from '../shared/zones/zone.js';
import { newZoneSave, mark, restAt } from '../shared/zones/state.js';
import { RIFT } from './rift.js';
import { CLIFF_X } from './map.js';

export const ZONE_SAVE_KEY = 'gloamreach.zones';

const BRINDLEWICK = {
  id: 'brindlewick',
  name: 'Brindlewick',
  sub: 'a village at the turn of the light',
  theme: 'golden',
  bounds: { x0: -148, x1: 150, z0: -166, z1: 134 },
  terrain: { source: 'gloamreach' },
  look: { lighting: 'village', fog: 'golden' },
  music: { rule: 'gloamreach' },
  features: ['village', 'gate', 'overlook', 'vista', 'elders', 'meadow'],
  world: [0.28, 0.66],
  spawns: {
    default: { x: 1.5, z: 40, yaw: Math.PI },
    gate: { x: 0, z: -118, yaw: 0 },
    stair: { x: 121, z: -45, yaw: -Math.PI / 2 }
  },
  portals: [
    { id: 'warden-gate', name: "The Warden's Gate", x: 0, z: -146, shape: { type: 'box', hw: 4.8, hd: 4 }, to: 'gloamwood', arrive: 'gate', veil: { x: 0, z: -151, face: 0, w: 10.5, h: 12.5 } },
    { id: 'cinder-stair', name: 'The Cinder Stair', x: 131, z: -45, shape: { type: 'circle', r: 1.7 }, to: 'cinder-rift', arrive: 'stair', arch: { x: 132, z: -45, face: -Math.PI / 2 } }
  ],
  pois: [
    { id: 'square', name: 'The square', x: 1, z: 2, kind: 'place' },
    { id: 'acorn', name: 'The Gilded Acorn', x: -32, z: -8, kind: 'place' },
    { id: 'smithy', name: "Brann's smithy", x: 49, z: -8, kind: 'place' },
    { id: 'millpond', name: 'The millpond', x: -86, z: 34, kind: 'place' },
    { id: 'gate', name: "The Warden's Gate", x: 0, z: -132, kind: 'door' },
    { id: 'overlook', name: 'Cinder Rift Overlook', x: 126, z: 0, kind: 'view' },
    { id: 'stairhead', name: 'The Cinder Stair', x: 124, z: -44, kind: 'door' }
  ],
  hub: {
    id: 'brindlewick-square',
    name: 'Brindlewick Square',
    x: 2,
    z: 4,
    r: 44,
    edge: 'lanterns',
    color: '#ffb25a',
    services: {
      waystone: { x: 4, z: -10 },
      map: { x: 9, z: -19 },
      info: { x: -11, z: -18 },
      stash: { x: -21, z: -16 },
      stats: { x: -13, z: 24 },
      merchant: { x: -12.5, z: 9.5, npc: 'dorrin' },
      rest: { x: -24.5, z: -4.5, name: 'the Gilded Acorn' }
    }
  },
  story: { hooks: [] },
  tips: [
    'The square is safe: nothing follows you past its lanterns.',
    'Wolves hunt in packs west and south; Greymane leads the western pack.',
    "Through the Warden's Gate the dusk never ends — the Gloamwood is harder.",
    'North of the overlook, the Cinder Stair goes down into the rift.'
  ]
};

const GLOAMWOOD = {
  id: 'gloamwood',
  name: 'The Gloamwood',
  sub: 'where the dusk never ends',
  theme: 'dusk',
  bounds: { x0: -150, x1: 150, z0: -390, z1: -110 },
  terrain: { source: 'gloamreach' },
  look: { lighting: 'gloam', fog: 'violet' },
  music: { rule: 'gloamreach' },
  features: ['gate', 'gloamwood'],
  world: [0.28, 0.2],
  spawns: {
    default: { x: 0, z: -172, yaw: Math.PI },
    gate: { x: 0, z: -172, yaw: Math.PI }
  },
  portals: [
    { id: 'warden-gate-south', name: "The Warden's Gate", x: 0, z: -138, shape: { type: 'box', hw: 4.8, hd: 4 }, to: 'brindlewick', arrive: 'gate', veil: { x: 0, z: -133, face: Math.PI, w: 10.5, h: 12.5 } }
  ],
  pois: [
    { id: 'grove', name: "Keepers' Grove", x: 0, z: -186, kind: 'place' },
    { id: 'webhollow', name: 'The web hollow', x: -62, z: -210, kind: 'place' },
    { id: 'roothouse', name: 'The root houses', x: -27, z: -212, kind: 'place' },
    { id: 'lamps', name: "Sylwen's lamps", x: 6, z: -248, kind: 'place' },
    { id: 'moonwell', name: 'The moonwell', x: 0, z: -306, kind: 'place' }
  ],
  hub: {
    id: 'keepers-grove',
    name: "Keepers' Grove",
    x: 0,
    z: -186,
    r: 17,
    edge: 'runes',
    color: '#7ad8ff',
    services: {
      waystone: { x: 6, z: -184 },
      map: { x: -10, z: -175 },
      info: { x: 9, z: -175 },
      stash: { x: -11, z: -191 },
      stats: { x: 11, z: -192 },
      merchant: { x: 3, z: -197, npc: 'ysolde' },
      rest: { x: -3, z: -199 }
    }
  },
  story: { hooks: [] },
  tips: [
    "The Keepers' Grove is safe: the wood's things keep out of its blue ring.",
    'Gloam spiders spit venom that slows; drink a draught (5) when it bites.',
    'Mother Vethra keeps to the west; Hollowroot stands deep in the east.',
    'The moonwell is at the end of the lamplit path.'
  ]
};

const CINDER_RIFT = {
  id: 'cinder-rift',
  name: 'The Cinder Rift',
  sub: 'seventy metres down, between rivers of fire',
  theme: 'ember',
  bounds: { x0: 104, x1: 330, z0: -236, z1: 24 },
  terrain: { source: 'rift' },
  look: { lighting: 'village', fog: 'ember' },
  music: { rule: 'gloamreach' },
  features: ['rift', 'vista'],
  world: [0.72, 0.6],
  spawns: {
    default: { x: 151, z: -46, yaw: Math.PI / 2 },
    stair: { x: 151, z: -46, yaw: Math.PI / 2 }
  },
  portals: [
    { id: 'cinder-stair-up', name: 'The Cinder Stair', x: RIFT.stair.x + 0.5, z: RIFT.stair.z, shape: { type: 'circle', r: 1.7 }, to: 'brindlewick', arrive: 'stair', arch: { x: RIFT.stair.x - 0.5, z: RIFT.stair.z, face: Math.PI / 2 } }
  ],
  pois: [
    { id: 'outpost', name: 'Ashward Outpost', x: RIFT.outpost.x, z: RIFT.outpost.z, kind: 'place' },
    { id: 'spires', name: 'The basalt spires', x: 214, z: -110, kind: 'view' },
    { id: 'ledge', name: 'Emberfall Ledge', x: RIFT.ledge.x, z: RIFT.ledge.z, kind: 'place' }
  ],
  hub: {
    id: 'ashward-outpost',
    name: 'Ashward Outpost',
    x: RIFT.outpost.x,
    z: RIFT.outpost.z,
    r: RIFT.outpost.r,
    edge: 'banners',
    color: '#ff8a3a',
    services: {
      waystone: { x: 166, z: -52 },
      map: { x: 150, z: -60 },
      info: { x: 152, z: -66 },
      stash: { x: 155, z: -69 },
      stats: { x: 168, z: -68 },
      merchant: { x: 171, z: -56, npc: 'varra' },
      rest: { x: 163, z: -71 }
    }
  },
  story: { hooks: [] },
  tips: [
    'Ashward Outpost is safe; the lava is not. Nothing walks on it, you included.',
    'Grummoch the Ash-Troll roams the floor between the outpost and the ledge.',
    'Cindermaw waits on Emberfall Ledge, up the ramp to the north. Bring draughts.',
    'Its breath burns while you stand in it; its roar stuns; step out of the embers.'
  ]
};

export const ZONES = [BRINDLEWICK, GLOAMWOOD, CINDER_RIFT].map(defineZone);
export const zoneById = (id) => ZONES.find((z) => z.id === id) ?? null;
export const HUB_IDS = ZONES.map((z) => z.hub.id);

/** Which zone a point of the old single map (spawns, chests, people) belongs to. */
export function zoneAt(x, z) {
  if (x > CLIFF_X + 2) return 'cinder-rift';
  if (z < -150) return 'gloamwood';
  return 'brindlewick';
}

/** Does a thing at (x, z) belong to `zone` (and stand inside its bounds)? */
export const inZone = (zone, x, z) => zoneAt(x, z) === zone.id && inBounds(zone.bounds, x, z);

/**
 * The world save built from Gloamreach's save before zones (save.js v1):
 * the chests each hero opened are counted in their zone's records; everyone
 * starts in Brindlewick, its square reached and rested at.
 */
export function migrateLegacy(oldSave) {
  const save = newZoneSave({ zone: 'brindlewick', hub: 'brindlewick-square', stashSize: 48 });
  restAt(save, 'brindlewick-square');
  const LEGACY_CHESTS = { 'c-westwood': 'brindlewick', 'c-southwood': 'brindlewick', 'c-eastmeadow': 'brindlewick', 'c-webhollow': 'gloamwood', 'c-rootdeep': 'gloamwood', 'c-ledge': 'cinder-rift' };
  for (const p of Object.values(oldSave?.profiles ?? {})) {
    for (const id of p?.opened ?? []) if (LEGACY_CHESTS[id]) mark(save, LEGACY_CHESTS[id], 'chests', id);
  }
  return save;
}
