/**
 * The realistic people and vehicles on Kickrani's streets: what the
 * library fetches for them (scripts/library/streetfolk.mjs, on dev and build)
 * and what the game credits in its Credits panel (credits.js). Pure data.
 *
 * People: the Microsoft Rocketbox Avatar Library (MIT): rigged, textured
 * adults in everyday clothes, one 81-bone biped skeleton for all, so one set
 * of motion-captured clips (walk, idle, phone, looking about) plays on any.
 *
 * Vehicles: ordinary cars, a 1-tonne truck and a town bus (also the small
 * green 마을버스, the same model smaller) published on Sketchfab under CC BY 4.0 (each licence checked on the model's API page,
 * api.sketchfab.com/v3/models/<uid>), fetched as GLB from the Objaverse
 * dataset's public mirror of them on Hugging Face (allenai/objaverse).
 */

export const ROCKETBOX = {
  base: 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets/',
  license: 'MIT',
  author: 'Microsoft (Rocketbox Avatar Library)',
  page: 'https://github.com/microsoft/Microsoft-Rocketbox'
};

/** The people: [id, texture prefix, she, has hair cards (an opacity texture)]. Everyday street clothes, women and men both. */
export const PEOPLE = [
  ['Female_Adult_01', 'f001', true, true],
  ['Female_Adult_02', 'f002', true, true],
  ['Female_Adult_05', 'f005', true, true],
  ['Female_Adult_08', 'f008', true, true],
  ['Female_Adult_12', 'f012', true, true],
  ['Female_Adult_14', 'f017', true, true],
  ['Male_Adult_02', 'm003', false, true],
  ['Male_Adult_07', 'm013', false, true],
  ['Male_Adult_08', 'm014', false, true],
  ['Male_Adult_09', 'm017', false, true],
  ['Male_Adult_13', 'm010', false, false],
  ['Male_Adult_16', 'm019', false, false]
];

/** Motion clips (one skeleton for all): [our name, file under Animations/]. */
export const CLIPS = [
  ['walkF', 'all_animations_max_motextr_xy/f_walk_neutral_01.max.fbx'],
  ['walkM', 'all_animations_max_motextr_xy/m_walk_neutral_01.max.fbx'],
  ['idleF', 'all_animations_max_motextr_static/f_idle_neutral_01.max.fbx'],
  ['idleM', 'all_animations_max_motextr_static/m_idle_neutral_01.max.fbx'],
  ['phoneF', 'all_animations_max_motextr_static/f_cell_phone_textmessage.max.fbx'],
  ['phoneM', 'all_animations_max_motextr_static/m_cell_phone_textmessage.max.fbx'],
  ['lookF', 'all_animations_max_motextr_static/f_idle_look_around_01.max.fbx'],
  ['lookM', 'all_animations_max_motextr_static/m_idle_look_around_01.max.fbx'],
  ['cheerF', 'all_animations_max_motextr_static/f_cheer_01.max.fbx'],
  ['cheerM', 'all_animations_max_motextr_static/m_cheer_01.max.fbx']
];

/**
 * Vehicles: Sketchfab uid, its path in the Objaverse mirror, our file, and the
 * credit. `parts` (for packs of several) names the bodies we take.
 */
export const VEHICLES = [
  { id: 'sedan', uid: '7fd6e15785fa4aa9bfd6e31eb7c97ba6', glb: 'glbs/000-107/7fd6e15785fa4aa9bfd6e31eb7c97ba6.glb', title: "Kiri '10 - Low poly model", author: 'Daniel Zhabotinsky', what: 'an everyday saloon; also the taxis' },
  { id: 'hatch', uid: '055ff8a21b8d4d279debca089e2fafcd', glb: 'glbs/000-125/055ff8a21b8d4d279debca089e2fafcd.glb', title: "Ace '11 - Low Poly model", author: 'Daniel Zhabotinsky', what: 'a city hatchback' },
  { id: 'pack', uid: '20f9af9b8a404d5cb022ac6fe87f21f5', glb: 'glbs/000-102/20f9af9b8a404d5cb022ac6fe87f21f5.glb', title: 'Generic passenger car pack', author: 'Comrade1280', what: 'the people carrier, small SUV, compact and estate', parts: ['minivan body', 'Compact Body', 'Hatchback Body', 'Offroad Body', 'Sedan Body'] },
  // (its full title is in docs/third-party.md; on screen it is a 1-ton truck, with no maker's name or badge)
  { id: 'truck', uid: '3869c5bc8dff40ad97ee165ba31e0ee1', glb: 'glbs/000-132/3869c5bc8dff40ad97ee165ba31e0ee1.glb', title: 'Hyundai - Pother II (Bongo III)', screen: '1-ton truck', author: 'yunho98', what: 'the one-tonne box truck' },
  { id: 'bus', uid: '14fe03d792914d51b6c6250b393c44fd', glb: 'glbs/000-154/14fe03d792914d51b6c6250b393c44fd.glb', title: 'Generic Town Bus', author: 'own.guest', what: 'the city buses, in route colours, and the small green town buses' }
];

/** The delivery moped (polyfork.dev, CC BY 4.0; fetched with the polyfork set, scripts/library/sources.mjs): its file and length in metres. */
export const MOPED = { file: './library/polyfork/delivery-moped-1aa2ce.glb', length: 1.85, page: 'https://polyfork.dev/asset/delivery-moped-1aa2ce' };

export const OBJAVERSE = 'https://huggingface.co/datasets/allenai/objaverse/resolve/main/';
export const sketchfabPage = (uid) => `https://sketchfab.com/3d-models/${uid}`;
