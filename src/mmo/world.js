/**
 * Hearthvale's places. Every zone is a flat field with things on it:
 * `walls` (circles nobody walks through: houses, rocks, pillars), `spawns`
 * (monsters: where, how many, how far they wander), `nodes` (things to
 * gather), `npcs`, crafting `stations`, and `portals` to other zones.
 *
 * Open zones get a copy per party (or per player alone); the dungeon and
 * the raid a copy per party, with a size limit and a level to enter.
 */

export const NPCS = {
  marla: { name: 'Marla Thistle', title: 'Warden of the Greenfold', body: 'Knight', show: ['1H_Sword'], tint: '#ffe6c8' },
  brannoc: { name: 'Brannoc', title: 'Smith — Weapons & Armor', body: 'Barbarian', show: ['1H_Axe'], tint: '#ffd0b0', vendor: true },
  ysolde: { name: 'Ysolde', title: 'Healer & Alchemist', body: 'Mage', show: ['Spellbook'], tint: '#e8fff0' },
  osric: { name: 'Captain Osric', title: 'Road Watch', body: 'Knight', show: ['1H_Sword', 'Round_Shield'], tint: '#d8e4ff' },
  aldric: { name: 'Elder Aldric', title: 'Keeper of Old Seals', body: 'Mage', show: ['2H_Staff'], tint: '#e6d8ff' },
  pell: { name: 'Pell', title: 'Provisioner — Food & Draughts', body: 'Rogue', show: [], tint: '#fff0c8', vendor: true },
  tamsin: { name: 'Tamsin', title: 'Banker', body: 'Rogue_Hooded', show: [], tint: '#d8f0ff', bank: true },
  fenwick: { name: 'Fenwick', title: 'Guild Registrar', body: 'Mage', show: ['Spellbook_open'], tint: '#ffe0f0', guild: true },
  // Villagers who go about their day (something to say, nothing to sell).
  hob: { name: 'Hob', title: 'Farmer', body: 'Barbarian', show: [], tint: '#e8d8b0', says: ['Rattlebones in my turnips again. Third time this month.', 'The Greenfold used to be quiet, you know.'] },
  linnet: { name: 'Linnet', title: 'Courier', body: 'Rogue_Hooded', show: [], tint: '#d0f0d8', says: ['Letters for the Road Watch! Mind your feet!', 'Captain Osric pays well for bandit trouble.'] },
  gareth: { name: 'Gareth', title: 'Town Guard', body: 'Knight', show: ['1H_Sword', 'Round_Shield'], tint: '#c8d8ff', says: ['Keep to the roads after dark.', 'The north gate leads to the Greenfold. Bring potions.'] },
  mira: { name: 'Mira', title: 'Traveling Scholar', body: 'Mage', show: ['Spellbook'], tint: '#f0e0ff', says: ['They say the Sunken Crypt hums at night.', 'Elder Aldric knows more about the old seals than he lets on.'] }
};

export const ZONES = {
  hearthvale: {
    name: 'Hearthvale', kind: 'town', size: [120, 120], ground: '#6f8f4a', path: '#b49a6a', safe: true,
    spawn: [60, 92], graveyard: [60, 92],
    walls: [
      { x: 30, z: 30, r: 8, kind: 'house' }, { x: 90, z: 30, r: 8, kind: 'house' }, { x: 26, z: 80, r: 7, kind: 'house' },
      { x: 95, z: 92, r: 7, kind: 'house' }, { x: 60, z: 60, r: 4, kind: 'well' }, { x: 40, z: 100, r: 6, kind: 'house' },
      { x: 52, z: 80.6, r: 2.2, kind: 'stall', sign: 'Provisioner', color: '#3f8f4a', face: 0 },
      { x: 68, z: 80.6, r: 2.2, kind: 'stall', sign: 'Bank', color: '#3a5fa8', face: 0 },
      { x: 78, z: 48.6, r: 2.2, kind: 'stall', sign: 'Smithy', color: '#a8553a', face: 0 },
      { x: 87.4, z: 68, r: 2.2, kind: 'stall', sign: 'Guild Hall', color: '#8a3aa8', face: -Math.PI / 2 },
      { x: 42, z: 66.6, r: 2.2, kind: 'stall', sign: 'Healer', color: '#3aa89a', face: 0 }
    ],
    walkers: [
      { id: 'hob', route: [[46, 92], [46, 78], [34, 88]] },
      { id: 'linnet', route: [[60, 18], [60, 50], [74, 66], [60, 86]] },
      { id: 'gareth', route: [[54, 12], [66, 12], [66, 24], [54, 24]] },
      { id: 'mira', route: [[64, 54], [72, 62], [64, 70], [56, 62]] }
    ],
    npcs: [
      { id: 'marla', at: [52, 66] }, { id: 'brannoc', at: [78, 52] }, { id: 'ysolde', at: [42, 70] }, { id: 'osric', at: [70, 74] },
      { id: 'aldric', at: [60, 42] }, { id: 'pell', at: [52, 84] }, { id: 'tamsin', at: [68, 84] }, { id: 'fenwick', at: [84, 68] }
    ],
    stations: [{ id: 'anvil', name: 'Anvil', at: [82, 56] }, { id: 'cauldron', name: 'Cauldron', at: [38, 74] }, { id: 'bench', name: 'Workbench', at: [86, 60] }],
    portals: [
      { id: 'to_greenfold', name: 'North Gate — the Greenfold', at: [60, 6], to: 'greenfold', arrive: [120, 226] },
      { id: 'to_ashfen', name: 'East Road — the Ashfen (level 10)', at: [114, 60], to: 'ashfen', arrive: [14, 120], level: 10 }
    ],
    spawns: [], nodes: []
  },
  greenfold: {
    name: 'The Greenfold', kind: 'open', size: [240, 240], ground: '#5d8a3c', path: '#a68a5f', levels: '1–10',
    spawn: [120, 222], graveyard: [120, 214],
    walls: [
      { x: 60, z: 200, r: 7, kind: 'rock' }, { x: 180, z: 205, r: 6, kind: 'trees' }, { x: 40, z: 120, r: 9, kind: 'trees' },
      { x: 150, z: 120, r: 8, kind: 'rock' }, { x: 205, z: 140, r: 10, kind: 'trees' }, { x: 90, z: 95, r: 6, kind: 'rock' },
      { x: 60, z: 60, r: 7, kind: 'trees' }, { x: 140, z: 30, r: 7, kind: 'rock' }, { x: 200, z: 60, r: 8, kind: 'trees' },
      { x: 120, z: 140, r: 5, kind: 'rock' }, { x: 30, z: 30, r: 9, kind: 'trees' }, { x: 225, z: 215, r: 8, kind: 'trees' }
    ],
    spawns: [
      { mob: 'rattler', at: [100, 185], radius: 18, count: 8 },
      { mob: 'rattler', at: [150, 190], radius: 14, count: 5 },
      { mob: 'grave_archer', at: [50, 160], radius: 16, count: 6 },
      { mob: 'bandit', at: [175, 165], radius: 16, count: 7 },
      { mob: 'cutthroat', at: [205, 95], radius: 16, count: 6 },
      { mob: 'barrow_mage', at: [110, 62], radius: 15, count: 6 },
      { mob: 'barrow_knight', at: [75, 42], radius: 14, count: 6 },
      { mob: 'gravelord', at: [100, 22], radius: 2, count: 1, respawn: 300 }
    ],
    nodes: [
      { type: 'copper', at: [[70, 180], [130, 160], [40, 140], [165, 140], [95, 125], [190, 120]] },
      { type: 'sunleaf', at: [[90, 205], [140, 200], [60, 170], [120, 170], [170, 185], [30, 100]] },
      { type: 'ash', at: [[45, 128], [200, 135], [65, 70], [195, 70], [140, 95]] },
      { type: 'iron', at: [[90, 30], [60, 50]] }
    ],
    npcs: [], stations: [],
    portals: [
      { id: 'to_town', name: 'South Road — Hearthvale', at: [120, 234], to: 'hearthvale', arrive: [60, 14] },
      { id: 'to_crypt', name: 'The Sunken Crypt (party of up to 5, level 8)', at: [190, 30], to: 'crypt', arrive: [30, 188], level: 8, party: 5 }
    ]
  },
  ashfen: {
    name: 'The Ashfen', kind: 'open', size: [240, 240], ground: '#4f6a45', path: '#8a7a5a', levels: '10–18',
    spawn: [20, 120], graveyard: [24, 120],
    walls: [
      { x: 70, z: 70, r: 9, kind: 'trees' }, { x: 120, z: 200, r: 8, kind: 'rock' }, { x: 160, z: 100, r: 10, kind: 'trees' },
      { x: 90, z: 140, r: 6, kind: 'rock' }, { x: 210, z: 180, r: 9, kind: 'rock' }, { x: 40, z: 30, r: 8, kind: 'trees' }
    ],
    spawns: [
      { mob: 'fen_lurker', at: [70, 180], radius: 20, count: 9 },
      { mob: 'mire_hexer', at: [150, 150], radius: 18, count: 8 },
      { mob: 'ash_reaver', at: [190, 60], radius: 18, count: 8 }
    ],
    nodes: [
      { type: 'iron', at: [[60, 110], [110, 90], [130, 170], [180, 120], [200, 40]] },
      { type: 'ghostcap', at: [[50, 200], [100, 170], [140, 130], [170, 165], [90, 210]] },
      { type: 'ash', at: [[80, 60], [150, 60], [110, 30]] }
    ],
    npcs: [], stations: [],
    portals: [
      { id: 'to_town', name: 'West Road — Hearthvale', at: [6, 120], to: 'hearthvale', arrive: [106, 60] },
      { id: 'to_spire', name: 'The Ember Spire (raid of up to 8, level 16)', at: [222, 22], to: 'spire', arrive: [40, 150], level: 16, party: 8 }
    ]
  },
  crypt: {
    name: 'The Sunken Crypt', kind: 'dungeon', size: [60, 200], ground: '#3d4a52', path: '#56636b', party: 5, levels: '10–12',
    spawn: [30, 188], graveyard: [30, 190], noRespawn: true,
    walls: [{ x: 12, z: 150, r: 4, kind: 'pillar' }, { x: 48, z: 150, r: 4, kind: 'pillar' }, { x: 12, z: 70, r: 4, kind: 'pillar' }, { x: 48, z: 70, r: 4, kind: 'pillar' }],
    spawns: [
      { mob: 'crypt_guard', at: [30, 160], radius: 4, count: 2 }, { mob: 'crypt_caller', at: [30, 156], radius: 3, count: 1 },
      { mob: 'crypt_guard', at: [24, 132], radius: 3, count: 1 }, { mob: 'crypt_caller', at: [36, 132], radius: 3, count: 2 },
      { mob: 'kessa', at: [30, 108], radius: 1, count: 1 },
      { mob: 'crypt_guard', at: [30, 80], radius: 4, count: 2 }, { mob: 'crypt_caller', at: [30, 58], radius: 4, count: 2 },
      { mob: 'drowned_king', at: [30, 24], radius: 1, count: 1 }
    ],
    nodes: [], npcs: [], stations: [],
    portals: [{ id: 'out', name: 'Back to the Greenfold', at: [30, 196], to: 'greenfold', arrive: [186, 40] }]
  },
  spire: {
    name: 'The Ember Spire', kind: 'raid', size: [80, 170], ground: '#4a3530', path: '#6a4a3a', party: 8, levels: '18–20',
    spawn: [40, 158], graveyard: [40, 162], noRespawn: true,
    walls: [{ x: 18, z: 110, r: 5, kind: 'pillar' }, { x: 62, z: 110, r: 5, kind: 'pillar' }, { x: 18, z: 60, r: 5, kind: 'pillar' }, { x: 62, z: 60, r: 5, kind: 'pillar' }],
    spawns: [
      { mob: 'ember_guard', at: [40, 130], radius: 5, count: 2 }, { mob: 'ember_guard', at: [40, 90], radius: 5, count: 3 },
      { mob: 'cinderwing', at: [40, 30], radius: 1, count: 1 }
    ],
    nodes: [], npcs: [], stations: [],
    portals: [{ id: 'out', name: 'Back to the Ashfen', at: [40, 167], to: 'ashfen', arrive: [214, 30] }]
  }
};

/** Whether a point in a zone can be stood on (inside the field, outside the walls). */
export function walkableIn(zone, x, z, pad = 0.6) {
  const [w, h] = ZONES[zone].size;
  if (x < 1 || z < 1 || x > w - 1 || z > h - 1) return false;
  for (const wall of ZONES[zone].walls) if (Math.hypot(wall.x - x, wall.z - z) < wall.r + pad) return false;
  return true;
}
