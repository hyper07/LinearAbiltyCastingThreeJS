/**
 * The study worlds (maps). Every world holds the same seven floors of
 * lessons — floor n is floor n everywhere, so stars, coins, stickers and the
 * buddy go wherever the player goes — and dresses them its own way: the
 * Learning Mountain stacks them as terraces, the Great Tree as rings of
 * treehouses round a giant trunk, the Lagoon as islands, the Desert as oasis
 * towns along the Nile, the Moon as moonbases in craters, Mars as the
 * terraces of a giant red volcano (Olympus Mons), the Sky Castle as the
 * streets of a white castle town on a floating island.
 *
 * To add a world: give it an entry here with its floors' looks (the shape of
 * floors.js — `look` drives the buildings, landmark, critters, particles and
 * music mood), a `kind` the diorama knows how to build (world/World.js picks
 * the plan and scenery by kind), names in every language (ui.js `map.<id>`,
 * `map.<id>.what`, `map.<id>.whole`, its floor names; lesson.js for the lessons'
 * way back), and it shows in
 * the World Portal's picker.
 */
import { FLOORS } from './floors.js';
import { t } from './i18n/index.js';

/** Every ring's schools are grown by the tree (world/grown.js): a woven seed pod, a root hall, a star seed observatory. */
const GROWN = { math: 'seedpod', history: 'roothall', physics: 'starspire' };
const WOOD = { grown: true, stone: '#b88a5c', trim: '#fff3dc', wall: '#fbecd0', path: '#f0dcb4', rock: ['#9c7a5a', '#8a6a4c', '#b08e6c'] };

/** The Great Tree's rings, bottom to top: the same floors, in treehouse dress. */
export const TREE_FLOORS = [
  {
    icon: '🍄',
    look: {
      ...WOOD, theme: 'mushroom', grass: '#8fd6a0', grassDark: '#76c28a', roof: { math: '#ff7a5c', history: '#9b7be0', physics: '#4fb0c6' },
      shapes: GROWN, landmark: 'shrooms',
      tree: 'shroom', leaf: '#5fbf6a', flowers: ['#ffd166', '#ff8fa3', '#ffffff'], banner: '#9b7be0',
      critters: ['frog', 'hedgehog', 'mouse'], particles: 'spores', mood: 'crickets'
    }
  },
  {
    icon: '🌿',
    look: {
      ...WOOD, theme: 'meadow', grass: '#9fe38a', grassDark: '#86d474', roof: { math: '#4fbf6a', history: '#ffb347', physics: '#6fb8ff' },
      shapes: GROWN, landmark: 'windmill',
      tree: 'round', leaf: '#4fbf6a', flowers: ['#ffd166', '#c39bff', '#ffffff'], banner: '#ffb347',
      critters: ['bunny', 'mouse', 'duck'], particles: 'petals', mood: 'birds'
    }
  },
  {
    icon: '🏮',
    look: {
      ...WOOD, theme: 'desert', grass: '#b9e08a', grassDark: '#a3d074', roof: { math: '#ff9f4a', history: '#e98a4f', physics: '#ffcf5c' },
      shapes: GROWN, landmark: 'oasis',
      tree: 'round', leaf: '#62c46a', flowers: ['#ff9f4a', '#ff5f7e', '#ffd23f'], banner: '#ff5f5f',
      critters: ['fox', 'hedgehog', 'mouse'], particles: 'sparkles', mood: 'bells'
    }
  },
  {
    icon: '🌸',
    look: {
      ...WOOD, theme: 'cloud', grass: '#c9efb0', grassDark: '#b2e29a', roof: { math: '#ff9ed2', history: '#ff7aa8', physics: '#c39bff' },
      shapes: GROWN, landmark: 'rainbow',
      tree: 'candy', leaf: '#ff9ec7', flowers: ['#ffffff', '#ffd1e8', '#ffe066'], banner: '#ff7aa8',
      critters: ['bunny', 'puff', 'bunny'], particles: 'petals', mood: 'birds'
    }
  },
  {
    icon: '🪺',
    look: {
      ...WOOD, theme: 'harbor', grass: '#a6e8a0', grassDark: '#8fdc8a', roof: { math: '#3f7fd6', history: '#ff9a8a', physics: '#ffd23f' },
      shapes: GROWN, landmark: 'boat',
      tree: 'round', leaf: '#3fbf7a', flowers: ['#ffffff', '#ffd23f', '#7cc6ff'], banner: '#3f7fd6',
      critters: ['duck', 'puff', 'duck'], particles: 'sparkles', mood: 'wind'
    }
  },
  {
    icon: '🌼',
    look: {
      ...WOOD, theme: 'cloud', grass: '#d8f5c8', grassDark: '#c5ebb3', roof: { math: '#7cc6ff', history: '#ffd23f', physics: '#9b7be0' },
      shapes: GROWN, landmark: 'glowbloom',
      tree: 'round', leaf: '#7fd88a', flowers: ['#ffe066', '#9fe0ff', '#ffffff'], banner: '#ffb347',
      critters: ['puff', 'bunny', 'puff'], particles: 'sparkles', mood: 'chimes'
    }
  },
  {
    icon: '✨',
    look: {
      ...WOOD, theme: 'moon', grass: '#b8e6c8', grassDark: '#a2d8b4', roof: { math: '#7f8cff', history: '#ffb347', physics: '#5a6fd6' },
      shapes: GROWN, landmark: 'rocket',
      tree: 'round', leaf: '#5fc79a', flowers: ['#7ff7ff', '#c39bff', '#ffffff'], banner: '#7f8cff',
      critters: ['puff', 'robot', 'bunny'], particles: 'twinkles', mood: 'chimes'
    }
  }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of TREE_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`tree.floor.${f.n}`), enumerable: true });

/** The resort islands' looks: thatched villas on stilts, teak decks (world/resort.js). */
const RESORT = { resort: true, shapes: { math: 'villa', history: 'pavilion', physics: 'reeflab' }, stone: '#9a6b45', trim: '#fff6e6', wall: '#fbf1dc', path: '#f6e7c1', grass: '#9fdc8a', grassDark: '#86cc74', rock: ['#b9b2a3', '#a8a194', '#c9c3b6'], tree: 'palm' };
/**
 * The Lagoon's seven islands, the sea realm: their own floors, lessons
 * (content/sea.js), teachers, stories and bosses; ages as on the land.
 */
export const SEA_FLOORS = [
  { icon: '🐚', look: { ...RESORT, theme: 'harbor', roof: { math: '#ff8a7a', history: '#ffb347', physics: '#5fc4ea' }, landmark: 'sandcastle', leaf: '#4fbf6a', flowers: ['#ff8fa3', '#ffd166', '#ffffff'], banner: '#ff8fa3', critters: ['crab', 'seaturtle', 'crab'], particles: 'spray', mood: 'waves' } },
  { icon: '🪸', look: { ...RESORT, theme: 'harbor', roof: { math: '#ff7aa8', history: '#ff9a6b', physics: '#7cc6ff' }, landmark: 'rainbow', leaf: '#3fbf7a', flowers: ['#ff7aa8', '#ffb3c8', '#fff1dc'], banner: '#ff7aa8', critters: ['octopus', 'crab', 'duck'], particles: 'sparkles', mood: 'waves' } },
  { icon: '🐢', look: { ...RESORT, theme: 'harbor', roof: { math: '#3fbf9a', history: '#ffd23f', physics: '#4fb0c6' }, landmark: 'boat', leaf: '#4fbf6a', flowers: ['#ffd23f', '#ffffff', '#7ff7ff'], banner: '#3fbf9a', critters: ['seaturtle', 'seaturtle', 'duck'], particles: 'spray', mood: 'birds' } },
  { icon: '🗼', look: { ...RESORT, theme: 'harbor', roof: { math: '#e0453a', history: '#3f7fd6', physics: '#ffd23f' }, landmark: 'beacon', leaf: '#4fb37a', flowers: ['#ffffff', '#e0453a', '#7cc6ff'], banner: '#e0453a', critters: ['seal', 'penguin', 'seal'], particles: 'spray', mood: 'wind' } },
  { icon: '🦪', look: { ...RESORT, theme: 'cloud', roof: { math: '#b48cff', history: '#ff9ed2', physics: '#7ff7ff' }, landmark: 'clam', leaf: '#5fc79a', flowers: ['#fff8f0', '#ffd1e8', '#c39bff'], banner: '#b48cff', critters: ['octopus', 'crab', 'seal'], particles: 'sparkles', mood: 'bells' } },
  { icon: '🐋', look: { ...RESORT, theme: 'harbor', roof: { math: '#4f7fc8', history: '#7cc6ff', physics: '#ff9a6b' }, landmark: 'whale', leaf: '#3fbf7a', flowers: ['#bfe9ff', '#ffffff', '#ffd23f'], banner: '#4f7fc8', critters: ['seal', 'duck', 'penguin'], particles: 'spray', mood: 'waves' } },
  { icon: '🔱', look: { ...RESORT, theme: 'moon', roof: { math: '#ffd23f', history: '#5a6fd6', physics: '#3fd8ff' }, landmark: 'submarine', leaf: '#4fb39a', flowers: ['#7ff7ff', '#ffd23f', '#ffffff'], banner: '#ffd23f', critters: ['robot', 'octopus', 'seal'], particles: 'twinkles', mood: 'chimes' } }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of SEA_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`sea.floor.${f.n}`), enumerable: true });

/** The oasis towns' looks: sandstone schools on stone platforms, palm gardens (world/desert/). */
const DUNE = {
  sandstone: true, theme: 'desert', shapes: { math: 'pyramidschool', history: 'templeschool', physics: 'sunobservatory' },
  stone: '#d9a96e', trim: '#fff1d6', wall: '#f3d9a8', path: '#ecd3a2', grass: '#a6d16c', grassDark: '#86c45c', rock: ['#c99258', '#b98450', '#d8a46c'], tree: 'palm', leaf: '#5fae4a',
  /** The townsfolk dress for the sun (creatures/hats.js). */
  hats: ['none', 'sunhat', 'headscarf', 'sunhat', 'none', 'headscarf']
};
/**
 * The Desert of the Pyramids' seven oasis towns along the Nile, the desert realm
 * (its own lessons, teachers and stories: content/desert.js).
 */
export const DESERT_FLOORS = [
  { icon: '🦁', look: { ...DUNE, roof: { math: '#36bfc4', history: '#3460c0', physics: '#f2a03a' }, landmark: 'sphinxfountain', flowers: ['#ff8fa3', '#ffd166', '#ffffff'], banner: '#2fa8b4', critters: ['camel', 'fennec', 'meerkat'], particles: 'sand', mood: 'wind' } },
  { icon: '🐪', look: { ...DUNE, roof: { math: '#e0703f', history: '#2fa8b4', physics: '#f2c14e' }, landmark: 'caravan', flowers: ['#ff9f4a', '#ff5f7e', '#ffd23f'], banner: '#d9603b', critters: ['camel', 'jerboa', 'camel'], particles: 'sand', mood: 'bells' } },
  { icon: '⛵', look: { ...DUNE, roof: { math: '#3f7fd6', history: '#36bfc4', physics: '#ffb347' }, landmark: 'felucca', flowers: ['#ffffff', '#7cc6ff', '#ff9ec7'], banner: '#3460c0', critters: ['gecko', 'camel', 'meerkat'], particles: 'sparkles', mood: 'waves' } },
  { icon: '☀️', look: { ...DUNE, roof: { math: '#f2a03a', history: '#d9603b', physics: '#36bfc4' }, landmark: 'obelisk', flowers: ['#ffd23f', '#ff8a5c', '#ffffff'], banner: '#e8942f', critters: ['scarab', 'fennec', 'gecko'], particles: 'sand', mood: 'chimes' } },
  { icon: '🎈', look: { ...DUNE, roof: { math: '#ff7aa8', history: '#7cc6ff', physics: '#ffd23f' }, landmark: 'balloon', flowers: ['#ff9ec7', '#c39bff', '#ffffff'], banner: '#ff6f9a', critters: ['jerboa', 'meerkat', 'fennec'], particles: 'sparkles', mood: 'wind' } },
  { icon: '📜', look: { ...DUNE, roof: { math: '#7f5fd0', history: '#c9963f', physics: '#36bfc4' }, landmark: 'scrolls', flowers: ['#c39bff', '#ffd166', '#ffffff'], banner: '#7f5fd0', critters: ['scarab', 'gecko', 'jerboa'], particles: 'sparkles', mood: 'bells' } },
  { icon: '⛺', look: { ...DUNE, roof: { math: '#3460c0', history: '#f2c14e', physics: '#5a6fd6' }, landmark: 'startent', flowers: ['#7ff7ff', '#ffd23f', '#ffffff'], banner: '#3f4fb0', critters: ['fennec', 'meerkat', 'scarab'], particles: 'twinkles', mood: 'chimes' } }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of DESERT_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`desert.floor.${f.n}`), enumerable: true });

/** The moonbases' looks: white and silver toy habitats on landing pads, orange and teal trim (world/moon/). */
const LUNAR = {
  lunar: true, theme: 'moon', shapes: { math: 'domeschool', history: 'museummodule', physics: 'moonobservatory' },
  stone: '#c9ced8', trim: '#ffffff', wall: '#f2f4f8', path: '#dde1e8', grass: '#c3c5ce', grassDark: '#a9abb6', rock: ['#9c9ea9', '#8a8c97', '#b2b4be'], tree: 'none', leaf: '#6fcf7a',
  /** Everyone here wears a space suit (MAPS `suit`); under the helmet some townsfolk wear a comms headset (creatures/hats.js). */
  hats: ['headset', 'none', 'headset', 'none', 'beanie', 'none']
};
/**
 * The Moon's seven moonbases, each in its own crater, joined by glass tubes. Its realm is
 * 'moon': its own lessons (content/moon.js), teachers, stories and puzzle bosses.
 * The townsfolk are its own: water bears, luna moths, axolotls, hamsters, robot pups and moon jellies.
 */
export const MOON_FLOORS = [
  { icon: '🛬', look: { ...LUNAR, roof: { math: '#ff8a3d', history: '#2fb8c4', physics: '#5a7fe0' }, landmark: 'lander', flowers: ['#ffd23f', '#ff8a3d', '#ffffff'], banner: '#ff8a3d', critters: ['tardigrade', 'robopup', 'hamster'], particles: 'moondust', mood: 'space' } },
  { icon: '🚀', look: { ...LUNAR, roof: { math: '#2fb8c4', history: '#ff6f5c', physics: '#ffb23f' }, landmark: 'minirocket', flowers: ['#7ff7ff', '#ff6f5c', '#ffffff'], banner: '#2fb8c4', critters: ['axolotl', 'lunamoth', 'robopup'], particles: 'moondust', mood: 'beeps' } },
  { icon: '🚙', look: { ...LUNAR, roof: { math: '#ffb23f', history: '#5a7fe0', physics: '#ff6f9a' }, landmark: 'rovergarage', flowers: ['#ffd23f', '#7cc6ff', '#ffffff'], banner: '#ffb23f', critters: ['hamster', 'tardigrade', 'axolotl'], particles: 'moondust', mood: 'space' } },
  { icon: '📡', look: { ...LUNAR, roof: { math: '#5a7fe0', history: '#ffb23f', physics: '#2fb8c4' }, landmark: 'dish', flowers: ['#7cc6ff', '#ffffff', '#ffd23f'], banner: '#5a7fe0', critters: ['robopup', 'moonjelly', 'lunamoth'], particles: 'moondust', mood: 'beeps' } },
  { icon: '🌱', look: { ...LUNAR, roof: { math: '#5fc46a', history: '#ff8a3d', physics: '#c39bff' }, landmark: 'greenhouse', flowers: ['#7fd88a', '#ff9ed2', '#ffffff'], banner: '#5fc46a', critters: ['lunamoth', 'hamster', 'axolotl'], particles: 'moondust', mood: 'chimes' } },
  { icon: '💎', look: { ...LUNAR, roof: { math: '#c39bff', history: '#2fb8c4', physics: '#ff7aa8' }, landmark: 'crystals', flowers: ['#c39bff', '#7ff7ff', '#ffffff'], banner: '#9b7be0', critters: ['moonjelly', 'tardigrade', 'lunamoth'], particles: 'twinkles', mood: 'chimes' } },
  { icon: '🛰️', look: { ...LUNAR, roof: { math: '#3f6fd6', history: '#ffd23f', physics: '#ff8a3d' }, landmark: 'satellite', flowers: ['#7ff7ff', '#ffd23f', '#ffffff'], banner: '#3f6fd6', critters: ['moonjelly', 'robopup', 'axolotl'], particles: 'twinkles', mood: 'space' } }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of MOON_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`moon.floor.${f.n}`), enumerable: true });

/** Mars's terraces: habitats 3D-printed from red soil, white shells, teal and yellow trim, inflatable tents (world/mars/). */
const RED = {
  martian: true, theme: 'mars', shapes: { math: 'printdome', history: 'marsmuseum', physics: 'weatherlab' },
  stone: '#efc5a0', trim: '#ffffff', wall: '#fbf3ea', path: '#f7dcbc', rock: ['#9c4f36', '#8b4430', '#ab5d40'], tree: 'none', leaf: '#5fbf5a',
  /** Wind-blown drifts of paler dust on the terraces (terrain.js). */
  patch: { color: '#efbd93', k: 0.16, t: 0.38 },
  /** Under their space suits' helmets (maps.js `suit`) the townsfolk wear dust goggles or a beanie (creatures/hats.js). */
  hats: ['dustgoggles', 'none', 'dustgoggles', 'beanie', 'none', 'dustgoggles']
};
/**
 * Mars: seven terraces up Olympus Mons, the tallest volcano in the solar system, from the landing
 * site at its foot to the lookout on the caldera's rim. Its realm is 'mars': its own lessons
 * (content/mars.js), teachers (figures.js MARS_TEACHERS) and stories (quests.js MARS_WORLDS).
 * The townsfolk are its own: pikas, capybaras, sloths, armadillos, chinchillas and little rover-bots.
 */
export const MARS_FLOORS = [
  { icon: '🪂', look: { ...RED, grass: '#e59e6c', grassDark: '#da905f', roof: { math: '#2fb5ad', history: '#ffb83d', physics: '#3f8fd6' }, landmark: 'landingsite', flowers: ['#ffc83d', '#2fb5ad', '#ffffff'], banner: '#2fb5ad', critters: ['capybara', 'pika', 'roverbot'], particles: 'reddust', mood: 'mars' } },
  { icon: '🚙', look: { ...RED, grass: '#e39a69', grassDark: '#d78c5c', roof: { math: '#ffb83d', history: '#2fb5ad', physics: '#ff7a5c' }, landmark: 'marsgarage', flowers: ['#ffc83d', '#ff7a5c', '#ffffff'], banner: '#ffb83d', critters: ['roverbot', 'armadillo', 'chinchilla'], particles: 'reddust', mood: 'beeps' } },
  { icon: '🧊', look: { ...RED, grass: '#e49e6d', grassDark: '#d8905f', patch: { color: '#f8ece4', k: 0.14, t: 0.42 }, roof: { math: '#4fb8e0', history: '#ff8f6a', physics: '#2fb5ad' }, landmark: 'icedrill', flowers: ['#bfe9ff', '#ffffff', '#2fb5ad'], banner: '#4fb8e0', critters: ['pika', 'chinchilla', 'capybara'], particles: 'reddust', mood: 'wind' } },
  { icon: '🌱', look: { ...RED, grass: '#e19867', grassDark: '#d58a5a', roof: { math: '#5fc46a', history: '#ffb83d', physics: '#c38bff' }, landmark: 'greendome', flowers: ['#7fd88a', '#ff9ed2', '#ffffff'], banner: '#5fc46a', critters: ['sloth', 'capybara', 'pika'], particles: 'sparkles', mood: 'chimes' } },
  { icon: '🌡️', look: { ...RED, grass: '#df9565', grassDark: '#d38757', roof: { math: '#3f8fd6', history: '#2fb5ad', physics: '#ffb83d' }, landmark: 'weatherstation', flowers: ['#7cc6ff', '#ffffff', '#ffd23f'], banner: '#3f8fd6', critters: ['chinchilla', 'armadillo', 'roverbot'], particles: 'reddust', mood: 'mars' } },
  { icon: '🌪️', look: { ...RED, grass: '#dc9161', grassDark: '#cf8354', roof: { math: '#ff7a5c', history: '#3f8fd6', physics: '#2fb5ad' }, landmark: 'dustview', flowers: ['#ff9f6a', '#ffd23f', '#ffffff'], banner: '#ff7a5c', critters: ['armadillo', 'sloth', 'pika'], particles: 'reddust', mood: 'wind' } },
  { icon: '🌋', look: { ...RED, grass: '#d88b5d', grassDark: '#ca7d50', roof: { math: '#ffb83d', history: '#c38bff', physics: '#3f8fd6' }, landmark: 'calderalookout', flowers: ['#ffd23f', '#c39bff', '#ffffff'], banner: '#ffb83d', critters: ['sloth', 'roverbot', 'chinchilla'], particles: 'twinkles', mood: 'mars' } }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of MARS_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`mars.floor.${f.n}`), enumerable: true });

/** The Sky Castle's streets: white and cream stone, teal conical roofs with gold finials, pavilion tents (world/castle/). */
const ROYAL = {
  royal: true, theme: 'castle', shapes: { math: 'clocktower', history: 'libraryhall', physics: 'workshop' },
  stone: '#e9e1d0', trim: '#fffaf0', wall: '#f6f1e6', path: '#efe6d3', grass: '#8fd06a', grassDark: '#7fc460', rock: ['#b9c3cf', '#a9b4c2', '#c9d1dc'], tree: 'round', leaf: '#5fbf6a'
};
/**
 * The Sky Castle: seven streets winding up a white castle town on a floating island, from the gatehouse
 * market by the rim to the crown garden round the keep. Its realm is 'castle': its own lessons
 * (content/castle.js), teachers (figures.js CASTLE_TEACHERS) and stories (quests.js CASTLE_WORLDS).
 * The townsfolk are its own — badgers, goats, geese, ponies, ferrets, lambs and magpies — each floor's
 * critters in medieval outfits (`garb`, one to each critter in turn: figures.js GARB).
 */
export const CASTLE_FLOORS = [
  { icon: '⛲', look: { ...ROYAL, roof: { math: '#2fb3a6', history: '#3a8fd0', physics: '#26a29a' }, landmark: 'wishingwell', flowers: ['#ff8fa3', '#ffd166', '#ffffff'], banner: '#e0574f', critters: ['lamb', 'goose', 'badger'], garb: ['baker', 'goodwife', 'squire'], particles: 'blossom', mood: 'castle' } },
  { icon: '🎀', look: { ...ROYAL, roof: { math: '#3cc4c0', history: '#2fb3a6', physics: '#3a8fd0' }, landmark: 'maypole', flowers: ['#ff9ed2', '#c39bff', '#ffffff'], banner: '#ff6f9a', critters: ['goat', 'ferret', 'lamb'], garb: ['minstrel', 'jester', 'lady'], particles: 'blossom', mood: 'castle' } },
  { icon: '🐉', look: { ...ROYAL, roof: { math: '#26a29a', history: '#4fc9c0', physics: '#2f9fb8' }, landmark: 'stonedragon', flowers: ['#ffd23f', '#ff9f4a', '#ffffff'], banner: '#3f9a5a', critters: ['badger', 'magpie', 'pony'], garb: ['squire', 'copyist', 'wayfarer'], particles: 'feathers', mood: 'castle' } },
  { icon: '🔔', look: { ...ROYAL, roof: { math: '#2f9fb8', history: '#26a29a', physics: '#3cc4c0' }, landmark: 'belltower', flowers: ['#7cc6ff', '#ffffff', '#ffd23f'], banner: '#3a6fd0', critters: ['goose', 'pony', 'goat'], garb: ['lady', 'squire', 'goodwife'], particles: 'feathers', mood: 'castle' } },
  { icon: '☀️', look: { ...ROYAL, roof: { math: '#4fc9c0', history: '#3a8fd0', physics: '#2fb3a6' }, landmark: 'sundial', flowers: ['#ffd23f', '#ff8a5c', '#ffffff'], banner: '#e8a02f', critters: ['ferret', 'lamb', 'magpie'], garb: ['wayfarer', 'baker', 'minstrel'], particles: 'blossom', mood: 'castle' } },
  { icon: '🎈', look: { ...ROYAL, roof: { math: '#2fb3a6', history: '#4fc9c0', physics: '#2f9fb8' }, landmark: 'kitedock', flowers: ['#ff9ec7', '#7cc6ff', '#ffffff'], banner: '#8a5fd0', critters: ['pony', 'goat', 'ferret'], garb: ['wayfarer', 'minstrel', 'jester'], particles: 'feathers', mood: 'castle' } },
  { icon: '👑', look: { ...ROYAL, roof: { math: '#3a8fd0', history: '#2fb3a6', physics: '#26a29a' }, landmark: 'crowngarden', flowers: ['#ffd23f', '#c39bff', '#ffffff'], banner: '#c9963f', critters: ['magpie', 'badger', 'goose'], garb: ['copyist', 'squire', 'lady'], particles: 'sparkles', mood: 'castle' } }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of CASTLE_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`castle.floor.${f.n}`), enumerable: true });

/**
 * The worlds; names come from the current language (ui.js map.<id>, map.<id>.what).
 * `realm`: whose lessons, teachers, floors and stars — every world has its own (the mountain:
 * land, the Great Tree: forest, the Lagoon: sea, the Desert: desert, the Moon: moon, Mars: mars, the Sky
 * Castle: castle), so each map teaches something new.
 * `suit`: on the space maps everyone — the buddy, the townsfolk, the puzzle bosses, the teachers and
 * guides in the lesson rooms — wears a space suit ('moon' or 'mars': world/figures.js).
 */
export const MAPS = [
  { id: 'mountain', icon: '⛰️', kind: 'mountain', realm: 'land', floors: FLOORS, whole: 'hud.whole', wholeHint: 'hud.wholeHint', back: ['lesson.back', 'lesson.backAria'] },
  { id: 'tree', icon: '🌳', kind: 'tree', realm: 'forest', floors: TREE_FLOORS, whole: 'map.tree.whole', wholeHint: 'map.tree.wholeHint', back: ['lesson.back.tree', 'lesson.backAria.tree'] },
  { id: 'lagoon', icon: '🏝️', kind: 'lagoon', realm: 'sea', floors: SEA_FLOORS, whole: 'map.lagoon.whole', wholeHint: 'map.lagoon.wholeHint', back: ['lesson.back.lagoon', 'lesson.backAria.lagoon'] },
  { id: 'desert', icon: '🐪', kind: 'desert', realm: 'desert', floors: DESERT_FLOORS, whole: 'map.desert.whole', wholeHint: 'map.desert.wholeHint', back: ['lesson.back.desert', 'lesson.backAria.desert'] },
  { id: 'moon', icon: '🌙', kind: 'moon', realm: 'moon', floors: MOON_FLOORS, whole: 'map.moon.whole', wholeHint: 'map.moon.wholeHint', back: ['lesson.back.moon', 'lesson.backAria.moon'], suit: 'moon' },
  { id: 'mars', icon: '🔴', kind: 'mars', realm: 'mars', floors: MARS_FLOORS, whole: 'map.mars.whole', wholeHint: 'map.mars.wholeHint', back: ['lesson.back.mars', 'lesson.backAria.mars'], suit: 'mars' },
  { id: 'castle', icon: '🏰', kind: 'castle', realm: 'castle', floors: CASTLE_FLOORS, whole: 'map.castle.whole', wholeHint: 'map.castle.wholeHint', back: ['lesson.back.castle', 'lesson.backAria.castle'] }
];
for (const m of MAPS) {
  Object.defineProperty(m, 'name', { get: () => t(`map.${m.id}`), enumerable: true });
  Object.defineProperty(m, 'what', { get: () => t(`map.${m.id}.what`), enumerable: true });
}

export const mapById = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];
