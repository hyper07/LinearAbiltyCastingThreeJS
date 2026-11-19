/**
 * Who lives in Gloamreach's starting map: the three heroes a player can be,
 * the people of Brindlewick and the Gloamwood (names, models, a greeting
 * each, and what they spend the day doing), the animals and the spirits.
 * Pure data — no three.js — so tests can read it.
 */

export const HEROES = [
  {
    id: 'knight',
    name: 'Knight',
    title: 'Oathsworn of the Gilded Acorn',
    model: 'human-knight-base',
    height: 1.86,
    cape: true,
    blurb: 'Plate polished for the road, a kite shield and an arming sword. Steady on their feet; nothing hurries them.',
    accent: '#d9b25a'
  },
  {
    id: 'ranger',
    name: 'Ranger',
    title: 'Pathfinder of the Gloamwood',
    model: 'elf-hunter-base',
    height: 1.84,
    cape: true,
    blurb: 'A green hood, a longbow and soft boots. Light and quick; the woods part for them.',
    accent: '#8fc36a'
  },
  {
    id: 'mage',
    name: 'Mage',
    title: 'Keeper of the Violet Lamp',
    model: 'elf-mage-base',
    height: 1.8,
    cape: false,
    blurb: 'Robes of dusk-dyed silk and a staff that hums. The Gloamwood remembers their name.',
    accent: '#b58ae8'
  }
];

/**
 * The people. `does`: what they do —
 *   idle (stand, look about), work (a task clip at a spot), sit, chat (with `with`),
 *   stroll (walk a loop), jog (run a long loop), patrol (walk a path back and forth).
 * Places are [x, z] (and a facing in radians where it matters).
 */
export const PEOPLE = [
  { id: 'oswin', name: 'Oswin Tallow', title: 'Innkeeper', model: 'tradesman-1707b9', at: 'innPorch', does: 'work', clip: 'Interact', greet: 'Mind the step, friend — the Acorn\'s stew is still hot.' },
  { id: 'brann', name: 'Brann Coalhand', title: 'Smith', model: 'black-smith-base', at: 'smithy', does: 'work', clip: 'Hammer', greet: 'Steel remembers every blow. So do I. Mind the sparks.' },
  { id: 'pell', name: 'Pell Marrow', title: 'Fruit Seller', model: 'merchant-6f606b', at: 'stall0', does: 'work', clip: 'Interact', greet: 'Apples from the edge of the Gloamwood — sweeter than they ought to be.' },
  { id: 'wren', name: 'Wren Ashby', title: 'Weaver', model: 'halfling-hunter-base', at: 'stall1', does: 'work', clip: 'Interact', greet: 'Dusk-dyed wool, never fades. I\'d swear on it, if I swore.' },
  { id: 'hollis', name: 'Hollis Bramble', title: 'Farmer', model: 'farmer-base', at: 'stall2', does: 'idle', greet: 'Biggest pumpkins this side of the ridge. Don\'t ask what I feed them.' },
  { id: 'idra', name: 'Captain Idra Vane', title: 'Village Watch', model: 'village-guard-5f0f6f', at: [2.5, 9.5, -2.2], does: 'chat', with: 'aldous', greet: 'Keep to the lamplit path past the Gate, and you\'ll keep your boots.' },
  { id: 'aldous', name: 'Brother Aldous', title: 'Lantern Chapel', model: 'human-priest-base', at: [0.6, 8.1, 0.9], does: 'chat', with: 'idra', greet: 'The light here never quite sets. We give thanks for that, mostly.' },
  { id: 'nan', name: 'Old Nan Thistle', title: 'Storyteller', model: 'forest-witch-base', at: 'bench0', does: 'sit', clip: 'SitChair', greet: 'The Gate hums at night. Always has. Sit a while, and you\'ll hear it.' },
  { id: 'tobin', name: 'Tobin Reed', title: 'Miller\'s Lad', model: 'villager-40255c', does: 'stroll', path: [[-14, 30], [-4, 18], [10, 20], [24, 4], [16, -10], [-6, -12], [-20, 4]], greet: 'Have you seen the bear? It\'s friendly. Mostly. It likes apples.' },
  { id: 'mirela', name: 'Mirela Fenn', title: 'Herbalist', model: 'dryad-hunter-base', does: 'stroll', path: [[-40, 18], [-60, 26], [-78, 32], [-70, 44], [-52, 36]], greet: 'Poppies for sleep, marigolds for luck. The meadow gives both.' },
  { id: 'sela', name: 'Sela Dunmore', title: 'Washerwoman', model: 'shopper-base', at: 'bench1', does: 'sit', clip: 'SitChair', greet: 'Sun\'s been just about to set for as long as I can remember. Good drying weather.' },
  { id: 'tamsin', name: 'Tamsin Hale', title: 'Adventurer', model: 'crossbowman-base', does: 'jog', route: 'grand', offset: 0, greet: 'No time — we\'re for the Gloamwood before the lamps go out!' },
  { id: 'rook', name: 'Rook', title: 'Adventurer', model: 'human-assassin-base', does: 'jog', route: 'grand', offset: 9, greet: 'Keep up, or keep out of the way.' },
  { id: 'garrick', name: 'Garrick Ashveil', title: 'Adventurer', model: 'human-warrior-base', does: 'jog', route: 'grand', offset: 16, greet: 'Race you to the Gate!' },
  { id: 'kesh', name: 'Kesh Ardent', title: 'Cliff Warden', model: 'slim-knight-base', at: [124, 6, 1.6], does: 'idle', greet: 'Watch the sky over the rift. Vaelthrax circles at this hour.' },
  // The Gloamwood.
  { id: 'sylwen', name: 'Sylwen', title: 'Keeper of Lamps', model: 'dryad-priest-base', at: [6, -248, -1.2], does: 'work', clip: 'Cast', greet: 'Each lamp holds a little of the moon. I only remind them to shine.' },
  { id: 'tumbleroot', name: 'Tumbleroot', title: 'Moss-Elder', model: 'mushroom-druid-base', at: 'root0', does: 'idle', greet: 'Shh. The trees are listening, and they do love to gossip.' },
  { id: 'ithrel', name: 'Ithrel Nightbough', title: 'Warden of the Gloamwood', model: 'elf-assassin-base', does: 'patrol', path: [[-2, -172], [-9, -200], [-6, -226], [8, -250], [2, -282], [-2, -298]], greet: 'You came through the Gate. Few do, at this hour that never ends.' },
  { id: 'liora', name: 'Liora', title: 'Starkeeper', model: 'elf-mage-base', at: 'root1', does: 'sit', clip: 'SitFloor', greet: 'Count the stars with me? There\'s one more than yesterday.' },
  { id: 'fennick', name: 'Fennick', title: 'Moonwell Tender', model: 'hooded-staff-acolyte-base', at: [4.5, -300, 3.6], does: 'work', clip: 'Interact', greet: 'Drink if you like. It tastes of evenings.' }
];

/** Long loops the adventurers jog (x, z). */
export const ROUTES = {
  grand: [[1, 92], [2, 60], [0, 30], [-4, 12], [-2, -14], [-2, -30], [4, -54], [6, -76], [2, -100], [0, -118], [-3, -100], [-8, -66], [-12, -40], [-22, -22], [-38, -14], [-34, 6], [-16, 18], [-4, 34], [1, 60]]
};

/** Animals: model, where they roam (centre, radius), how they move. */
export const ANIMALS = [
  { id: 'bear', name: 'Bramble', title: 'the Village Bear', model: 'bear-base', at: [-13, -14], roam: 7, height: 1.45, walk: 1.0, greet: '*a contented, apple-scented huff*' },
  { id: 'deer1', model: 'deer-base', at: [-84, 52], roam: 14, height: 1.35, walk: 1.1, shy: 9 },
  { id: 'deer2', model: 'deer-base', at: [-74, 58], roam: 12, height: 1.25, walk: 1.0, shy: 9 },
  { id: 'deer3', model: 'deer-base', at: [86, 40], roam: 14, height: 1.3, walk: 1.0, shy: 9 },
  { id: 'fox1', model: 'fox-base', at: [-56, -52], roam: 16, height: 0.55, walk: 1.4, shy: 7 },
  { id: 'fox2', model: 'fox-base', at: [44, -184], roam: 14, height: 0.55, walk: 1.4, shy: 7 },
  { id: 'cat', model: 'cat-base', at: [-24.5, -5.5], roam: 2, height: 0.32, walk: 0.6 },
  { id: 'dog', model: 'dog-base', at: [6, 20], roam: 10, height: 0.62, walk: 1.6 },
  { id: 'hen1', model: 'chicken-base', at: [-36, 28], roam: 4, height: 0.42, walk: 0.5 },
  { id: 'hen2', model: 'chicken-base', at: [-38, 30], roam: 4, height: 0.4, walk: 0.5 },
  { id: 'hen3', model: 'chicken-base', at: [-33, 31], roam: 4, height: 0.44, walk: 0.5 },
  { id: 'stag', name: 'The Pale Stag', title: 'Spirit of the Gloamwood', model: 'spectral-stag-base', at: [10, -296], roam: 14, height: 2.4, walk: 0.9, spirit: true, greet: '*the stag regards you with eyes like moonlight*' },
  { id: 'rabbit1', model: 'rabbit-base', at: [-20, -230], roam: 10, height: 0.32, walk: 0.8, shy: 5 },
  { id: 'rabbit2', model: 'rabbit-base', at: [30, -280], roam: 10, height: 0.3, walk: 0.8, shy: 5 }
];

/** The drake that circles above the Cinder Rift. */
export const DRAKE = { name: 'Vaelthrax', title: 'the Ember Drake', model: 'red-fire-dragon-base', centre: [340, -30], radius: 150, altitude: 18, length: 38 };
