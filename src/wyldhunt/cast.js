/**
 * Who is in Mistfall Gorge: the hunter's three looks (each a body and a
 * set of armour), the two hunters who come along, the mount, and what the
 * companions say (subtitled). Pure data.
 */

/**
 * The hunter's looks. `equip`: what they wear, as Gloamreach item bases with
 * the colours fixed here (metal, cloth, leather), so the armour is the look.
 */
export const LOOKS = [
  {
    id: 'ironbark',
    name: 'Ironbark',
    blurb: 'Heavy plate over quilted green, a fur-trimmed mantle. Built to stand in front of something that bites.',
    model: 'human-warrior-base',
    height: 1.84,
    rig: 'knight',
    equip: { head: 'bascinet', chest: 'plate', hands: 'gauntlets', legs: 'cuisses', feet: 'sabatons', cape: 'mantle' },
    colors: { metal: 'blackened', cloth: '#2f5a3a', leather: '#4a3020' },
    accent: '#8fb06a'
  },
  {
    id: 'mosscale',
    name: 'Mosscale',
    blurb: 'A brigandine of bronze scales on moss-dyed cloth, a nasal helm and riding boots. The guild\'s field kit.',
    model: 'slim-knight-base',
    height: 1.8,
    rig: 'knight',
    equip: { head: 'nasal', chest: 'brigandine', hands: 'bracers', legs: 'chausses', feet: 'boots', cape: 'cloak' },
    colors: { metal: 'bronze', cloth: '#3e5a2a', leather: '#6a4428' },
    accent: '#c8a050'
  },
  {
    id: 'fernstalker',
    name: 'Fernstalker',
    blurb: 'Oiled leather, a deep hood and soft shoes. Light on the stone, quiet in the ferns.',
    model: 'dryad-hunter-base',
    height: 1.78,
    rig: 'ranger',
    equip: { head: 'hood', chest: 'jerkin', hands: 'gloves', legs: 'leggings', feet: 'boots', cape: 'cloak' },
    colors: { metal: 'iron', cloth: '#2a4a3a', leather: '#5a3a24' },
    accent: '#6ac0a0'
  }
];

/** The two weapons every hunter carries: a heavy blade and a bow. */
export const ARMS = {
  greatblade: { base: 'greatsword', metal: 'steel', rarity: 'rare' },
  bow: { base: 'longbow', metal: 'bronze', rarity: 'uncommon' }
};

/** The mount: a shaggy, long-legged runner of the gorges. */
export const MOUNT_INFO = { species: 'Shagmane', name: 'Burrow', blurb: 'A shaggy runner, sure-footed on wet stone. Whistle and it comes.' };

/** The hunters who come along, and their weapons. */
export const COMPANIONS = [
  { id: 'yara', name: 'Yara', title: 'Bowyer', model: 'orc-hunter-base', height: 1.86, weapon: 'bow', equip: { chest: 'jerkin', hands: 'bracers', feet: 'boots', cape: 'cloak' }, colors: { metal: 'iron', cloth: '#6a3a2a', leather: '#4a3020' }, color: '#e8a060', offset: [-3.6, 1.2] },
  { id: 'doran', name: 'Doran', title: 'Spear', model: 'dwarf-knight-base', height: 1.5, weapon: 'spear', equip: { chest: 'brigandine', legs: 'chausses', feet: 'boots' }, colors: { metal: 'steel', cloth: '#6a4a2a', leather: '#3a2a22' }, color: '#8ab0ff', offset: [3.4, 0.2] }
];

/** What the companions say, by moment. One is picked; the same line isn't said twice running. */
export const BARKS = {
  start: [['yara', 'Tracks were fresh at the ford this morning. Let\'s find it before the rain does.'], ['doran', 'Supply box is stocked. Take what you need, then we move.']],
  track: [['yara', 'Footprints — deep ones. It came through here.'], ['doran', 'Scratches on the bark. Big. Head height on me, belly height on it.'], ['yara', 'Still warm. We\'re close.']],
  tracked: [['yara', 'Got its scent! The flies know where it is now.'], ['doran', 'That\'s enough sign. Follow the flies.']],
  spotted: [['yara', 'There! The Gnarlhorn!'], ['doran', 'Look at the size of it. Easy now.']],
  roar: [['doran', 'Cover your ears!'], ['yara', 'Hold your ground!']],
  tail: [['doran', 'Watch the tail!'], ['yara', 'Tail — get clear!']],
  charge: [['yara', 'It\'s charging! Roll!'], ['doran', 'Out of its way!']],
  rage: [['yara', 'It\'s angry now. Its eyes...'], ['doran', 'Here it comes, faster!']],
  horn: [['doran', 'Its horn broke! Good hit!'], ['yara', 'The horn\'s off!']],
  tailcut: [['yara', 'Tail\'s off! Carve it later!'], ['doran', 'That\'s the club gone!']],
  limp: [['yara', 'It\'s limping. It\'ll run for its den.'], ['doran', 'It\'s weak — don\'t let it rest!']],
  sleep: [['yara', 'It\'s asleep in the hollow. Make the first hit count.']],
  down: [['doran', 'Up you get! Drink something!'], ['yara', 'Are you hurt? Heal up!']],
  win: [['doran', 'It\'s down! Carve what you can.'], ['yara', 'We did it. Mistfall\'s quiet again.']],
  gather: [['yara', 'I\'ll put what you gather in your field bag — look later.'], ['doran', 'Good find.']],
  mount: [['doran', 'Burrow knows the way. Hold R and let it run the path.']]
};
