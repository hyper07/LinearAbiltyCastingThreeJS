/**
 * Who is in Kithvale's first map: your three looks (a young adventurer, in
 * three outfits), and the people of Lanternrest — their names, a greeting
 * each, and what they spend the dusk doing. Pure data (no three.js).
 *
 * Villagers' `does`:
 *   idle    stand and look about (greet you when you come close)
 *   work    a task clip on a spot (`clip`), maybe holding something (`prop`)
 *   chat    talk with someone (`with`)
 *   sit     on a bench or the ground (`clip`)
 *   round   walk a loop of stops, pausing at each (`path`, `clip` at stops)
 *   play    a child's run round a loop (`path`)
 * Places are [x, z, facing].
 */

export const LOOKS = [
  {
    id: 'sprout',
    name: 'Sprout',
    blurb: 'A red hood, a spool of kite string and boots that have never stayed clean. Ready for anything with feathers or fur.',
    model: 'kite-kid-base',
    height: 1.42,
    accent: '#e0564a'
  },
  {
    id: 'wren',
    name: 'Wren',
    blurb: 'A rust-coloured cape, a little bow, braids tied back. Quiet feet, sharp eyes.',
    model: 'halfling-hunter-base',
    height: 1.4,
    accent: '#d88a4a'
  },
  {
    id: 'pip',
    name: 'Pip',
    blurb: 'Goggles up, a sunny coat buttoned wrong and a satchel full of notes about every creature ever.',
    model: 'village-child-bef09e',
    height: 1.38,
    accent: '#e8c040'
  }
];

export const VILLAGERS = [
  { id: 'hollen', name: 'Hollen', title: 'Gatekeeper', model: 'ashigaru-foot-soldier-806707', height: 1.74, at: [-2.7, -83.2, 2.8], does: 'idle', greet: 'Off into the vale? Walk soft near the shy ones — they come to quiet feet.' },
  { id: 'amasel', name: 'Old Amasel', title: 'Lantern Keeper', model: 'crossing-keeper-e13207', height: 1.58, does: 'round', clip: 'Lantern', prop: 'lantern', path: [[-3.6, -94, 1.57], [3.6, -108, -1.57], [-3.6, -122, 1.57], [3.6, -150, -1.57], [-3.6, -160, 1.57]], greet: 'Every lantern in Lanternrest gets lit by these hands. Fifty-one years, and not one missed.' },
  { id: 'toben', name: 'Toben', title: 'Sweeps the Lane', model: 'porter-e4e566', height: 1.72, at: [-6.6, -104, 1.2], does: 'work', clip: 'Sweep', prop: 'broom', greet: 'Petals, every evening. The blossom never knows when to stop.' },
  { id: 'mira', name: 'Mira', title: 'Weaver', model: 'townswoman-5ca8b5', height: 1.66, at: [-9.8, -129.6, 0.9], does: 'chat', with: 'dov', greet: 'A Tuftlet slept in my dye basket last spring. Green for a week, it was.' },
  { id: 'dov', name: 'Dov', title: 'Potter', model: 'merchant-6f606b', height: 1.76, at: [-7.6, -127.4, -2.4], does: 'chat', with: 'mira', greet: 'Pebblerolls love a smooth pot. Try a crystal, if you can find one.' },
  { id: 'suri', name: 'Suri', title: 'Fruit Seller', model: 'shopkeeper-be5547', height: 1.68, at: [-7.4, -119, 1.57], does: 'work', clip: 'Interact', greet: 'Sweetberries! The fawns in the Hushwood go mad for them.' },
  { id: 'nell', name: 'Nell', title: 'Runs Everywhere', model: 'waving-child-dfada0', height: 1.22, does: 'play', path: [[4, -124], [8, -131], [3, -136], [-4, -134], [-8, -127], [-2, -122]], greet: 'Have you seen the Puffwools on the Downs? They bounce!' },
  { id: 'ysolde', name: 'Ysolde', title: 'Kith Warden', model: 'village-gardener-9f7af6', height: 1.72, at: [27.5, -126.5, -1.4], does: 'work', clip: 'Water', greet: 'Offer what they love, then breathe with them. Friends wait here in the garden when three already follow you.' },
  { id: 'bao', name: 'Elder Bao', title: 'Head of the Hall', model: 'daimyo-lord-78364a', height: 1.74, at: [-4.2, -164.6, 0], does: 'sit', clip: 'SitChair', greet: 'Lanternrest has always kept company with the wild ones. Go and make some friends.' },
  { id: 'kemi', name: 'Kemi', title: 'Grows Sunheads', model: 'farmer-363820', height: 1.7, at: [24, -72, -2.2], does: 'work', clip: 'Harvest', greet: 'Sunseeds come from the tall heads in Hopgrass Meadow. Shake one and catch what falls.' },
  { id: 'osric', name: 'Brother Osric', title: 'Shrine Keeper', model: 'buddhist-monk-39f498', height: 1.72, at: [10, 205.5, 3.1], does: 'work', clip: 'Pray', greet: 'The moths come at dusk to dance round the bells. Be still, and they will come to you too.' },
  { id: 'tamsa', name: 'Tamsa', title: 'Fisher', model: 'villager-40255c', height: 1.74, at: [55.5, -32.5, 2.4], does: 'sit', clip: 'SitFloor', prop: 'rod', greet: 'Nothing biting. A Pebbleroll keeps stealing my bait, though.' }
];

/** One-line hints a villager may add once you have a friend with you. */
export const AFTER = {
  hollen: 'A friend at your heels already? The vale likes you.',
  ysolde: 'Each friend lends you something. Watch what they notice.',
  bao: 'Three friends at once, and the hall\'s doors stay open for you.'
};
