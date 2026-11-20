/**
 * Who lives in Gloamreach's starting map: the three heroes a player can be,
 * the people of Brindlewick and the Gloamwood (names, models, a greeting
 * each, and what they spend the day doing), the animals and the spirits.
 * Pure data — no three.js — so tests can read it.
 *
 * `folk`: a Quaternius body for this person (folk.js recipe pins: sex,
 * hairstyle and colour, skin, beard, outfit and its texture, a cloth tint,
 * hood; a robe and its make: trim, pattern, sleeves, collar, open, over,
 * overColour, sash, inner — folk.js robeStyle; or, for knights, guards and
 * captains, a cloak: cloak, cloakTrim, cloakFur, emblem, cloakBack — folk.js
 * cloakStyle; a hero's shows only while a cape is worn); `model` is the polyfork
 * character used when the packs aren't there.
 */

export const HEROES = [
  {
    id: 'knight',
    name: 'Knight',
    title: 'Oathsworn of the Gilded Acorn',
    model: 'human-knight-base',
    folk: { sex: 'male', hair: 'SimpleParted', hairColour: '#4a3020', skin: '#e0b08e', outfit: 'ranger', variant: 3, hood: true, cloak: '#2e4a8a', cloakTrim: '#c9a24a', cloakFur: null, emblem: true },
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
    folk: { sex: 'female', hair: 'Long', hairColour: '#d0aa6a', skin: '#f0d2bc', outfit: 'ranger', variant: 1, hood: true, cloak: '#2f6a3c', cloakTrim: '#a8743e', cloakFur: null },
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
    folk: { sex: 'female', hair: 'Buns', hairColour: '#e2ded6', skin: '#d9a982', outfit: 'peasant', variant: 2, robe: '#4a3a8a', cowl: '#5a48a0', trim: '#c9a24a', pattern: 'runes', sleeves: 'angel', collar: 'v', open: true, over: 'mantle', sash: '#c9a24a', inner: '#c8b898', cloak: '#4a3a8a', cloakTrim: '#c9a24a', cloakFur: null },
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
  { id: 'oswin', name: 'Oswin Tallow', title: 'Innkeeper', model: 'tradesman-1707b9', folk: { sex: 'male', outfit: 'peasant', beard: true }, at: 'innPorch', does: 'work', clip: 'Interact', greet: 'Mind the step, friend — the Acorn\'s stew is still hot.' },
  { id: 'brann', name: 'Brann Coalhand', title: 'Smith', model: 'black-smith-base', folk: { sex: 'male', hair: 'Buzzed', hairColour: '#8a3a1e', beard: true, skin: '#a8714d', outfit: 'peasant', variant: 1 }, at: 'smithy', does: 'work', clip: 'Hammer', greet: 'Steel remembers every blow. So do I. Mind the sparks.' },
  { id: 'pell', name: 'Pell Marrow', title: 'Fruit Seller', model: 'merchant-6f606b', folk: { sex: 'male', hair: 'SimpleParted', hairColour: '#7a5230', beard: false, skin: '#e6bf9f', outfit: 'peasant', variant: 2 }, at: 'stall0', does: 'work', clip: 'Interact', greet: 'Apples from the edge of the Gloamwood — sweeter than they ought to be.' },
  { id: 'wren', name: 'Wren Ashby', title: 'Weaver', height: 1.6, model: 'halfling-hunter-base', folk: { sex: 'female', outfit: 'peasant', cowl: '#6a4a7a' }, at: 'stall1', does: 'work', clip: 'Interact', greet: 'Dusk-dyed wool, never fades. I\'d swear on it, if I swore.' },
  { id: 'hollis', name: 'Hollis Bramble', title: 'Farmer', model: 'farmer-base', folk: { sex: 'male', outfit: 'peasant', variant: 1 }, at: 'stall2', does: 'idle', greet: 'Biggest pumpkins this side of the ridge. Don\'t ask what I feed them.' },
  { id: 'idra', name: 'Captain Idra Vane', title: 'Village Watch', model: 'village-guard-5f0f6f', folk: { sex: 'female', hair: 'BuzzedFemale', hairColour: '#20160f', skin: '#86563a', outfit: 'ranger', variant: 1, cloak: '#2e4a6a', cloakTrim: '#c9a24a', cloakFur: null, emblem: true }, at: [2.5, 9.5, -2.2], does: 'chat', with: 'aldous', greet: 'Keep to the lamplit path past the Gate, and you\'ll keep your boots.' },
  { id: 'aldous', name: 'Brother Aldous', title: 'Lantern Chapel', model: 'human-priest-base', folk: { sex: 'male', hair: 'Buzzed', outfit: 'peasant', robe: '#d8cfb8', trim: '#c9a24a', pattern: 'key', sleeves: 'bell', collar: 'round', open: false, over: 'stole', overColour: '#7a1e22', sash: '#c9a24a' }, at: [0.6, 8.1, 0.9], does: 'chat', with: 'idra', greet: 'The light here never quite sets. We give thanks for that, mostly.' },
  { id: 'nan', name: 'Old Nan Thistle', title: 'Storyteller', model: 'forest-witch-base', folk: { sex: 'female', age: 'elder', hair: 'Long', hairColour: '#c8c4bc', skin: '#e6bf9f', outfit: 'peasant', variant: 1, cowl: '#7a6a4a', robe: '#5a5a3e', trim: '#a8743e', pattern: 'leaves', sleeves: 'bell', collar: 'v', open: false, over: 'none', sash: '#6a3a24', inner: '#c8b898', stoop: 0.55, cane: true }, at: 'bench0', does: 'sit', clip: 'SitChair', greet: 'The Gate hums at night. Always has. Sit a while, and you\'ll hear it.' },
  { id: 'tobin', name: 'Tobin Reed', title: 'Miller\'s Lad', model: 'villager-40255c', folk: { sex: 'male', outfit: 'peasant', beard: false }, does: 'stroll', path: [[-14, 30], [-4, 18], [10, 20], [24, 4], [16, -10], [-6, -12], [-20, 4]], greet: 'Have you seen the bear? It\'s friendly. Mostly. It likes apples.' },
  { id: 'mirela', name: 'Mirela Fenn', title: 'Herbalist', model: 'dryad-hunter-base', folk: { sex: 'female', outfit: 'peasant', cowl: '#4a6a3a' }, does: 'stroll', path: [[-40, 18], [-60, 26], [-78, 32], [-70, 44], [-52, 36]], greet: 'Poppies for sleep, marigolds for luck. The meadow gives both.' },
  { id: 'sela', name: 'Sela Dunmore', title: 'Washerwoman', model: 'shopper-base', folk: { sex: 'female', outfit: 'peasant' }, at: 'bench1', does: 'sit', clip: 'SitChair', greet: 'Sun\'s been just about to set for as long as I can remember. Good drying weather.' },
  { id: 'tamsin', name: 'Tamsin Hale', title: 'Adventurer', model: 'crossbowman-base', folk: { sex: 'female', outfit: 'ranger' }, does: 'jog', route: 'grand', offset: 0, greet: 'No time — we\'re for the Gloamwood before the lamps go out!' },
  { id: 'rook', name: 'Rook', title: 'Adventurer', model: 'human-assassin-base', folk: { sex: 'male', outfit: 'ranger', variant: 3, hood: true }, does: 'jog', route: 'grand', offset: 9, greet: 'Keep up, or keep out of the way.' },
  { id: 'garrick', name: 'Garrick Ashveil', title: 'Adventurer', model: 'human-warrior-base', folk: { sex: 'male', outfit: 'ranger', variant: 1, beard: true, cloak: '#4a2a22', cloakTrim: '#a8743e', cloakFur: '#6a5240' }, does: 'jog', route: 'grand', offset: 16, greet: 'Race you to the Gate!' },
  { id: 'kesh', name: 'Kesh Ardent', title: 'Cliff Warden', model: 'slim-knight-base', folk: { sex: 'female', outfit: 'ranger', variant: 3, cloak: '#5a2a22', cloakTrim: '#c4c8d0', cloakFur: '#8a8278' }, at: [124, 6, 1.6], does: 'idle', greet: 'Watch the sky over the rift. North on the old ledge the Cinder Stair goes down — her brood nests below.' },
  { id: 'dorrin', name: 'Dorrin Anvilborn', title: 'Armsmonger', height: 1.5, model: 'dwarf-knight-base', folk: { sex: 'male', hair: 'Buzzed', beard: true, outfit: 'peasant', variant: 2 }, at: 'stall3', does: 'work', clip: 'Interact', merchant: true, shop: { title: "Dorrin's Arms", sub: 'Armsmonger of Brindlewick', lead: '“Steel for the woods, and coin for what you drag back out of them.”' }, greet: 'Blades, bows and good boots! Press F to trade — I buy what the woods leave you, too.' },
  // The Gloamwood.
  { id: 'sylwen', name: 'Sylwen', title: 'Keeper of Lamps', model: 'dryad-priest-base', folk: { sex: 'female', hair: 'Long', outfit: 'peasant', robe: '#3a4a7a', cowl: '#2a3a6a', trim: '#c4c8d0', pattern: 'stars', sleeves: 'angel', collar: 'high', open: true, over: 'none', sash: '#c4c8d0', inner: '#d8dce8' }, at: [6, -248, -1.2], does: 'work', clip: 'Cast', greet: 'Each lamp holds a little of the moon. I only remind them to shine.' },
  { id: 'tumbleroot', name: 'Tumbleroot', title: 'Moss-Elder', model: 'mushroom-druid-base', folk: { sex: 'male', age: 'elder', hair: 'Long', beard: true, outfit: 'peasant', robe: '#4a5a3a', trim: '#a8743e', pattern: 'vine', sleeves: 'bell', collar: 'v', open: false, over: 'mantle', overColour: '#5a4a2e', sash: '#6a3a24', inner: '#a89878', stoop: 0.3 }, at: 'root0', does: 'idle', greet: 'Shh. The trees are listening, and they do love to gossip.' },
  { id: 'ithrel', name: 'Ithrel Nightbough', title: 'Warden of the Gloamwood', model: 'elf-assassin-base', folk: { sex: 'male', outfit: 'ranger', variant: 3, hood: true }, does: 'patrol', path: [[-2, -172], [-9, -200], [-6, -226], [8, -250], [2, -282], [-2, -298]], greet: 'You came through the Gate. Few do, at this hour that never ends.' },
  { id: 'liora', name: 'Liora', title: 'Starkeeper', model: 'elf-mage-base', folk: { sex: 'female', hair: 'Long', hairColour: '#e2ded6', outfit: 'peasant', robe: '#2e2a5a', trim: '#d8b45a', pattern: 'stars', sleeves: 'angel', collar: 'v', open: true, over: 'stole', overColour: '#1e1a3e', sash: '#d8b45a', inner: '#e8e0cc' }, at: 'root1', does: 'sit', clip: 'SitFloor', greet: 'Count the stars with me? There\'s one more than yesterday.' },
  // The hubs' merchants: the Keepers' Grove (Gloamwood) and Ashward Outpost (the Cinder Rift).
  { id: 'ysolde', name: 'Ysolde Fernwick', title: 'Grove Keeper', model: 'dryad-hunter-base', folk: { sex: 'female', outfit: 'ranger', variant: 1 }, at: [3, -199, 0], does: 'idle', merchant: true, shop: { title: "Ysolde's Satchel", sub: "Keeper of the Grove's stores", lead: '“Lamp oil, arrows, a blade or two the wood gave back.”' }, greet: 'Rest under the blue lamps — nothing from the dark crosses them. Press F to trade.' },
  { id: 'varra', name: 'Varra Cinderhand', title: 'Quartermaster', model: 'village-guard-5f0f6f', folk: { sex: 'female', hair: 'BuzzedFemale', outfit: 'ranger', variant: 3, cloak: '#6a2a1e', cloakTrim: '#a8743e', cloakFur: '#6a5240' }, at: [172.5, -56, -1.5], does: 'idle', merchant: true, shop: { title: 'Ashward Stores', sub: 'Quartermaster of the outpost', lead: '“Fireproofed, mostly. Coin for anything that survived the drake.”' }, greet: 'Stay inside the banners and the heat can\'t reach you. Press F to trade.' },
  { id: 'fennick', name: 'Fennick', title: 'Moonwell Tender', model: 'hooded-staff-acolyte-base', folk: { sex: 'male', outfit: 'peasant', robe: '#5a6a8a', cowl: '#4a5a7a', trim: '#e2d6b6', pattern: 'plain', sleeves: 'bell', collar: 'round', open: false, over: 'scapular', overColour: '#3a4a6a', sash: '#2a2a3a' }, at: [4.5, -300, 3.6], does: 'work', clip: 'Interact', greet: 'Drink if you like. It tastes of evenings.' }
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
