/**
 * The asset library's vocabulary — shared by the indexer (Node) and the game
 * (browser), so the categories the AI is told about are exactly the ones the
 * catalog was filed under. No three.js imports here on purpose.
 */

export const SOURCES_LIST = ['polyhaven', 'kaykit', 'polygonalmind', 'ambientcg', 'inbox', 'procedural'];

/**
 * Every model lands in exactly one category. `size` is the default height
 * range in metres the map composer scales a model of this category into, so a
 * photoscanned 8 m boulder and a 2-unit stylised rock both come out sensible.
 */
export const CATEGORIES = {
  tree: { label: 'trees', size: [4, 11], footprint: 9 },
  bush: { label: 'bushes and shrubs', size: [0.6, 2.2], footprint: 3.5 },
  plant: { label: 'plants, flowers, grass tufts', size: [0.2, 1.2], footprint: 1.5 },
  rock: { label: 'rocks and boulders', size: [0.4, 3.5], footprint: 5 },
  cliff: { label: 'cliffs, mountains, big rock formations', size: [6, 22], footprint: 30 },
  building: { label: 'houses, towers, castles, shops, skyscrapers', size: [5, 18], footprint: 24 },
  wall: { label: 'walls, fences, gates, barricades', size: [1.2, 4], footprint: 6 },
  ruin: { label: 'ruins, broken columns, debris', size: [1, 6], footprint: 6 },
  structure: { label: 'bridges, wells, tents, stalls, docks, towers', size: [2.5, 9], footprint: 10 },
  tile: { label: 'ground tiles and hex tiles', size: [0.2, 1.5], footprint: 4 },
  prop: { label: 'barrels, crates, carts, signs, small props', size: [0.4, 1.6], footprint: 2.5 },
  furniture: { label: 'tables, chairs, beds, shelves', size: [0.5, 2], footprint: 3 },
  light: { label: 'lamps, torches, lanterns, braziers', size: [1, 3.5], footprint: 1.5 },
  vehicle: { label: 'cars, trucks, ships, aircraft, tanks', size: [1.5, 5], footprint: 9 },
  weapon: { label: 'swords, bows, guns, shields', size: [0.6, 1.6], footprint: 1.8 },
  character: { label: 'rigged humanoid characters', size: [1.6, 2.0], footprint: 1.2 },
  creature: { label: 'rigged monsters and animals', size: [0.8, 3.5], footprint: 5 },
  misc: { label: 'everything else', size: [0.5, 2.5], footprint: 3 }
};

/** First match wins, so the more specific rules come first. */
const RULES = [
  // Hex-map terrain pieces (KayKit's hexagon pack) are tiles, whatever they depict.
  ['tile', /^hex\b|\bhex (grass|water|sand|stone|road|river|coast|forest|dirt|tile)\b/],
  ['tile', /\bhexagon\b.*\b(hill|hills|mountain|mountains|water|coast|river|road|tile)\b|\b(hill|hills|mountain|mountains|water|coast|river|road|tile)\b.*\bhexagon\b/],
  ['weapon', /\b(sword|axe|bow|crossbow|dagger|spear|staff|wand|shield|hammer|mace|rifle|pistol|gun|blade|arrow|quiver)s?\b/],
  ['vehicle', /\b(car|truck|bus|van|tank|ship|boat|plane|aircraft|jet|helicopter|cart|wagon|train|tram|rocket|spaceship|vehicle|tractor|bike|bicycle|submarine)s?\b/],
  ['tree', /\b(tree|trees|pine|oak|birch|palm|fir|spruce|willow|maple|trunk|stump|conifer|deadtree|dead_tree)\b|tree_/],
  ['bush', /\b(bush|bushes|shrub|hedge|fern|ivy)\b/],
  ['plant', /\b(plant|flower|grass|weed|mushroom|cactus|reed|clover|dandelion|ground cover|groundcover|leaves|foliage|crop|wheat|corn)s?\b/],
  ['cliff', /\b(cliff|mountain|mesa|canyon|crag|rock_formation|rockformation|outcrop|boulder_large|large_rock)s?\b/],
  ['rock', /\b(rock|rocks|stone|stones|boulder|pebble|pebbles|cobble)s?\b/],
  ['ruin', /\b(ruin|ruins|rubble|debris|broken|destroyed|wreck|column|pillar)s?\b/],
  ['wall', /\b(wall|walls|fence|gate|barricade|palisade|railing|hedge_wall|battlement)s?\b/],
  ['light', /\b(lamp|lantern|torch|brazier|candle|streetlight|street_light|light|fire|campfire)s?\b/],
  ['building', /\b(building|house|home|tower|castle|church|chapel|shop|store|tavern|inn|barracks|blacksmith|mill|windmill|skyscraper|apartment|office|factory|warehouse|temple|pagoda|pyramid|cabin|hut|mansion|keep|fortress|base|hangar|station)s?\b/],
  ['structure', /\b(bridge|well|tent|stall|booth|dock|pier|scaffold|stairs|staircase|arch|gazebo|platform|statue|monument|fountain|obelisk|totem|shrine|altar|gravestone|grave|gravemarker|tomb|coffin|crypt)s?\b/],
  ['tile', /\b(tile|tiles|hex|floor|road|path|ground|terrain|water_tile|block)s?\b/],
  ['furniture', /\b(table|chair|bench|bed|shelf|shelves|cabinet|desk|sofa|couch|stool|wardrobe|dresser|bookcase|counter|furniture|kitchencabinet|kitchencounter|kitchentable|fridge|stove|oven|sink|cabinet)s?\b/],
  ['prop', /\b(barrel|crate|box|chest|sack|bag|bucket|pot|vase|jar|sign|post|pole|bin|basket|log|logs|plank|anvil|cart|pallet|bottle|keg|trap|prop|props|banner|flag|coin|coins|key|keyring|bone|bones|bowl|can|mug|plate|food|dumpster|hydrant|firehydrant|door|doors|trashcan|mailbox|bench)s?\b/]
];

const CREATURE = /\b(skeleton|zombie|monster|creature|animal|dragon|spider|wolf|bear|slime|bat|goblin|orc|troll|demon|ghost|beast|dinosaur|dog|cat|horse|cow|pig|chicken|sheep|bird|fish|deer|fox|rat|snake|golem|xyz)s?\b/;

/**
 * Split identifiers into words: `building_A_withoutBase` → `building a without base`,
 * `tree1` → `tree 1`, so word-boundary rules see what a person would read.
 */
export function normalizeWords(raw) {
  return String(raw)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d+)/g, ' $1 ')
    .replace(/[_\-./\\|,:;()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * @param {string} words normalised name, pack, tags and path (see normalizeWords)
 * @param {{ rigged: boolean, size: number[] }} facts from the glTF
 */
export function categorize(words, facts) {
  if (facts.rigged) return CREATURE.test(words) ? 'creature' : 'character';
  for (const [category, re] of RULES) if (re.test(words)) return category;
  if (CREATURE.test(words)) return 'creature';
  return 'misc';
}

/** Broad settings a model suits. A model can carry several. */
export const THEMES = {
  forest: /\b(forest|woodland|pine|oak|fern|moss|mushroom|nature|tree)\b/,
  desert: /\b(desert|cactus|sand|dune|mesa|egypt|pyramid|tomb)\b/,
  snow: /\b(snow|ice|winter|frozen|christmas|arctic)\b/,
  city: /\b(city|urban|street|building|skyscraper|apartment|office|road|car|bus|traffic|park)\b/,
  medieval: /\b(medieval|castle|knight|tavern|blacksmith|keep|hexagon|village|fair|barracks)\b/,
  dungeon: /\b(dungeon|crypt|torch|chest|skeleton|prison|cell)\b/,
  scifi: /\b(scifi|sci-fi|space|robot|futur|neon|station|aero|cyber|transit)\b/,
  halloween: /\b(halloween|pumpkin|grave|ghost|spooky|witch|coffin|zombie)\b/,
  industrial: /\b(industrial|factory|pipe|barrel|crate|container|pallet|machine|warehouse|shed)\b/,
  farm: /\b(farm|barn|hay|wheat|crop|fence|windmill|cow|sheep|chicken|tractor)\b/,
  coast: /\b(coast|beach|sea|ocean|dock|pier|boat|ship|lighthouse|smuggler|cove|harbor|harbour|palm)\b/,
  ruins: /\b(ruin|ruins|rubble|broken|column|pillar|ancient|temple)\b/,
  interior: /\b(furniture|table|chair|bed|shelf|kitchen|restaurant|interior|room|lamp)\b/,
  // Art-installation packs (galleries, museum sets, avatar booths): only on request.
  gallery: /\b(abm|towers|chromatic chaos|trash polka|avatar show|cryptoavatars|retro booth|aero system|ca world)\b/
};

/** Themes a model is only used for when the plan asks for them by name. */
export const OPT_IN_THEMES = new Set(['gallery']);

export function themesFor(words) {
  return Object.entries(THEMES)
    .filter(([, re]) => re.test(words))
    .map(([theme]) => theme);
}

/** Terrain surfaces for ambientCG materials. */
export const SURFACES = ['grass', 'snow', 'sand', 'rock', 'dirt', 'mud', 'gravel', 'moss', 'ice', 'lava', 'paving', 'asphalt', 'bricks', 'wood', 'roof'];

export function surfaceFor(tags = []) {
  const words = tags.join(' ').toLowerCase();
  const map = [
    ['lava', /lava|magma/],
    ['ice', /\bice\b|frozen/],
    ['snow', /snow/],
    ['sand', /sand|dune/],
    ['moss', /moss/],
    ['grass', /grass|lawn|meadow/],
    ['mud', /mud/],
    ['gravel', /gravel|pebble/],
    ['paving', /paving|cobble|tiles/],
    ['asphalt', /asphalt|road/],
    ['bricks', /brick/],
    ['roof', /roof/],
    ['wood', /plank|wood/],
    ['rock', /rock|cliff|stone/],
    ['dirt', /dirt|ground|soil|forest floor/]
  ];
  return map.find(([, re]) => re.test(words))?.[0] ?? 'dirt';
}
