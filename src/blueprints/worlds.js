/**
 * Worlds: the settings a game can take place in. Each is a ready-made map
 * plan (world/MapPlan.js), so the AI never has to describe ground, fog and
 * scenery layers. It names a world id and the composer does the rest from the
 * asset library.
 *
 * Fields
 *   name, blurb   builder label and the AI's one-line menu entry
 *   words         regex for the keyword builder
 *   theme         the MapPlan preset it starts from (keywordPlan)
 *   plan          overrides on top of that preset (ground, relief, edge, timeOfDay, fog, layers, landmarks)
 *   foes          the monsters that fit, when the spec does not say
 *   place         how the story names it ("the village of Thistlebrook")
 *   names         names for its helpers, in order
 *   kid           good for young children (the builder lists these first for study genres)
 */
export const WORLDS = {
  'storybook-village': {
    name: 'Storybook village',
    blurb: 'cosy medieval village, sunny day',
    words: /village|fairy|storybook|cottage|kingdom|castle|medieval|town/,
    theme: 'medieval',
    plan: { timeOfDay: 'day', fog: 0.2 },
    foes: 'imps',
    place: 'the village of Thistlebrook',
    names: ['Granny Bramble', 'Tobin the Baker', 'Mayor Pell', 'Wren'],
    kid: true
  },
  'enchanted-forest': {
    name: 'Enchanted forest',
    blurb: 'deep green woods, misty dawn',
    words: /forest|wood|grove|elf|fairy forest|jungle|tree/,
    theme: 'forest',
    plan: { timeOfDay: 'dawn', fog: 0.45 },
    foes: 'spirits',
    place: 'the Whispering Wood',
    names: ['Old Oak', 'Fern', 'Moss the Ranger', 'Pip'],
    kid: true
  },
  'frozen-north': {
    name: 'Frozen north',
    blurb: 'snowy mountain pass, cold dawn',
    words: /snow|ice|frozen|winter|arctic|north|glacier|mountain/,
    theme: 'snow',
    plan: { timeOfDay: 'dawn', fog: 0.5 },
    foes: 'brutes',
    place: 'Frostpeak Pass',
    names: ['Sigrun', 'Old Bjorn', 'Kari', 'Tove']
  },
  'desert-ruins': {
    name: 'Desert ruins',
    blurb: 'sand, cliffs and old temples, hot day',
    words: /desert|sand|dune|pyramid|egypt|oasis|canyon/,
    theme: 'desert',
    plan: { timeOfDay: 'day', fog: 0.15 },
    foes: 'golems',
    place: 'the Sunken Sands',
    names: ['Amira', 'Old Zahir', 'Nadia', 'Kofi']
  },
  'haunted-graveyard': {
    name: 'Haunted graveyard',
    blurb: 'graves, dead trees and fog at night',
    words: /haunted|grave|cemetery|ghost|spooky|halloween|zombie|crypt/,
    theme: 'halloween',
    plan: { timeOfDay: 'night', fog: 0.75 },
    foes: 'spirits',
    place: 'Hollowmere Graveyard',
    names: ['The Gravekeeper', 'Lantern Lise', 'Brother Amos', 'Mags']
  },
  'dragon-dungeon': {
    name: 'Dragon dungeon',
    blurb: 'stone halls, torches and pillars, dark',
    words: /dungeon|cave|underground|catacomb|cavern|keep|lair/,
    theme: 'dungeon',
    plan: { timeOfDay: 'night', fog: 0.65 },
    foes: 'brutes',
    place: 'the Dragon\'s Deep',
    names: ['Torch-bearer Ida', 'Grim', 'Old Rook', 'Sly Penn']
  },
  'pirate-coast': {
    name: 'Pirate coast',
    blurb: 'beach, docks and palm trees at sunset',
    words: /pirate|coast|beach|island|harbou?r|sea|ocean|ship|port/,
    theme: 'coast',
    plan: { timeOfDay: 'dusk', fog: 0.3 },
    foes: 'imps',
    place: 'Saltwind Cove',
    names: ['Captain Marlo', 'Nell', 'Old Barnacle', 'Finn'],
    kid: true
  },
  'sci-fi-outpost': {
    name: 'Sci-fi outpost',
    blurb: 'space base, containers and lights at night',
    words: /sci-?fi|space|robot|alien|future|planet|station|cyber|neon/,
    theme: 'scifi',
    plan: { timeOfDay: 'night', fog: 0.45 },
    foes: 'golems',
    place: 'Outpost Kepler',
    names: ['Commander Vey', 'Unit 7', 'Dr. Osei', 'Juno']
  },
  'city-streets': {
    name: 'City streets',
    blurb: 'downtown roads, cars and buildings at dusk',
    words: /city|street|urban|downtown|road|traffic|skyscraper/,
    theme: 'city',
    plan: { timeOfDay: 'dusk', fog: 0.4 },
    foes: 'mixed',
    place: 'Downtown Brightwater',
    names: ['Officer Diaz', 'Sam', 'Ms. Chen', 'Leo']
  },
  'farm-fields': {
    name: 'Farm fields',
    blurb: 'barns, crops and fences on a bright day',
    words: /farm|barn|field|countryside|meadow|crop|animal/,
    theme: 'farm',
    plan: { timeOfDay: 'day', fog: 0.15 },
    foes: 'imps',
    place: 'Sunny Acres Farm',
    names: ['Farmer Rosa', 'Hank', 'Little Bea', 'Grandpa Joe'],
    kid: true
  },
  'ancient-temple': {
    name: 'Ancient temple',
    blurb: 'broken columns and ruins under the stars',
    words: /temple|ruin|ancient|column|lost city|abandoned/,
    theme: 'ruins',
    plan: { timeOfDay: 'night', fog: 0.4 },
    foes: 'golems',
    place: 'the Temple of Echoes',
    names: ['Keeper Ilsa', 'Scholar Ren', 'Old Tam', 'Ayo']
  },
  'lava-wastes': {
    name: 'Lava wastes',
    blurb: 'lava ground, rocks and ruins at dusk',
    words: /lava|volcan|fire|magma|inferno|ember|burning/,
    theme: 'ruins',
    plan: { ground: 'lava', relief: 'canyon', edge: 'cliffs', timeOfDay: 'dusk', fog: 0.35 },
    foes: 'imps',
    place: 'the Ember Wastes',
    names: ['Ashwalker Kai', 'Cinder', 'Old Flint', 'Rhea']
  }
};

export const WORLD_IDS = Object.keys(WORLDS);
