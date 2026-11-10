/**
 * Layouts: where things stand in the arena. The fight is a flat circle of
 * radius 25 m around the start point (0, 0); monsters arrive from about 20 m
 * out. A layout places spawn points, helper slots, portals and monsters that
 * are already standing there. Helpers always turn to face the middle.
 *
 * Fields
 *   name, blurb, words   as in genres.js
 *   spawns    [{ x, z, boss? }]   where waves walk in; `boss` = only the boss uses it
 *             (empty = all around the arena)
 *   helpers   [{ x, z }]          slots for NPCs, filled in order
 *   portals   [[a, b]]            teleport pairs: each a { x, z } (step in one, out the other)
 *   sentries  [{ x, z }]          monsters already standing there (the roster's main kind)
 */
export const LAYOUTS = {
  'open-field': {
    name: 'Open field',
    blurb: 'open ground, monsters from every side',
    words: /open|field|plain|meadow|everywhere|all sides/,
    spawns: [],
    helpers: [{ x: 0, z: 7 }, { x: -5, z: 5 }, { x: 5, z: 5 }, { x: 0, z: -7 }],
    portals: [],
    sentries: []
  },
  crossroads: {
    name: 'Crossroads',
    blurb: 'four roads in, one from each direction',
    words: /cross|four|roads|junction|square/,
    spawns: [{ x: 0, z: 20 }, { x: 20, z: 0 }, { x: 0, z: -20 }, { x: -20, z: 0 }],
    helpers: [{ x: 4, z: 4 }, { x: -4, z: 4 }, { x: 4, z: -4 }, { x: -4, z: -4 }],
    portals: [],
    sentries: []
  },
  gauntlet: {
    name: 'Gauntlet',
    blurb: 'everything comes from the north, hold the line',
    words: /gauntlet|line|wall|gate|front|corridor|bridge|pass/,
    spawns: [{ x: -7, z: 20 }, { x: 0, z: 21 }, { x: 7, z: 20 }],
    helpers: [{ x: 0, z: -8 }, { x: -5, z: -7 }, { x: 5, z: -7 }, { x: 0, z: -12 }],
    portals: [],
    sentries: [{ x: -6, z: 12 }, { x: 6, z: 12 }]
  },
  'village-square': {
    name: 'Village square',
    blurb: 'helpers around a plaza, monsters from east and west',
    words: /plaza|market|village square|town square|camp|square/,
    spawns: [{ x: 20, z: 3 }, { x: -20, z: -3 }],
    helpers: [{ x: 0, z: 9 }, { x: -7, z: 6 }, { x: 7, z: 6 }, { x: 0, z: -9 }],
    portals: [],
    sentries: []
  },
  'twin-gates': {
    name: 'Twin gates',
    blurb: 'two monster gates and a pair of teleport portals',
    words: /portal|teleport|gates|twin|magic door/,
    spawns: [{ x: -14, z: 15 }, { x: 14, z: 15 }],
    helpers: [{ x: 0, z: -8 }, { x: -4, z: -6 }, { x: 4, z: -6 }, { x: 0, z: 6 }],
    portals: [[{ x: -15, z: -6 }, { x: 15, z: -6 }]],
    sentries: []
  },
  'boss-lair': {
    name: 'Boss lair',
    blurb: 'guards from the sides, the boss from the far north',
    words: /lair|throne|nest|den|boss room/,
    spawns: [{ x: 0, z: 22, boss: true }, { x: -19, z: 6 }, { x: 19, z: 6 }],
    helpers: [{ x: 0, z: -9 }, { x: -5, z: -8 }, { x: 5, z: -8 }, { x: 0, z: -13 }],
    portals: [],
    sentries: [{ x: -4, z: 14 }, { x: 4, z: 14 }]
  }
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);
