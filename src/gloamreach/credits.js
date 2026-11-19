/**
 * Everything third-party in Gloamreach, for the Credits panel and the docs:
 * each pack with its website and licence, and each CC BY model by name.
 * Pure data.
 */
import { gameMusicPack } from '../shared/gameMusic.js';


/** polyfork models (CC BY 4.0): id → title. Each is credited by name, with its page. */
export const POLYFORK_MODELS = [
  ['human-knight-base', 'Human knight'],
  ['elf-hunter-base', 'Elf hunter'],
  ['elf-mage-base', 'Elf mage'],
  ['tradesman-1707b9', 'Tradesman'],
  ['black-smith-base', 'Black smith'],
  ['merchant-6f606b', 'Merchant'],
  ['halfling-hunter-base', 'Halfling hunter'],
  ['farmer-base', 'Farmer'],
  ['village-guard-5f0f6f', 'Village Guard'],
  ['human-priest-base', 'Human priest'],
  ['forest-witch-base', 'Leaf-Shawled Forest Witch'],
  ['villager-40255c', 'Male Villager'],
  ['dryad-hunter-base', 'Dryad hunter'],
  ['shopper-base', 'Shopper'],
  ['crossbowman-base', 'Crossbowman'],
  ['human-assassin-base', 'Human assassin'],
  ['human-warrior-base', 'Human warrior'],
  ['slim-knight-base', 'Silver-Crested Order Knight'],
  ['dryad-priest-base', 'Dryad priest'],
  ['mushroom-druid-base', 'Mushroom druid'],
  ['elf-assassin-base', 'Elf assassin'],
  ['hooded-staff-acolyte-base', 'Hooded staff acolyte'],
  ['bear-base', 'Bear'],
  ['deer-base', 'Deer'],
  ['fox-base', 'Fox'],
  ['cat-base', 'Cat'],
  ['dog-base', 'Dog'],
  ['chicken-base', 'Chicken'],
  ['spectral-stag-base', 'Spectral stag'],
  ['rabbit-base', 'Rabbit'],
  ['dwarf-knight-base', 'Dwarf knight'],
  // The monsters.
  ['wolf-base', 'Wolf'],
  ['thorn-boar-base', 'Thorn-Backed Boar'],
  ['tarantula-base', 'Tarantula'],
  ['iridescent-treegolem-base', 'Star-Barked Tree Golem'],
  ['fungus-host-base', 'Pit-Eyed Fungus Host'],
  ['root-colossus-base', 'Root colossus'],
  ['ashen-troll-base', 'Ember-Cracked Troll'],
  ['red-fire-dragon-base', 'Red fire dragon']
];

export const PACKS = [
  {
    name: 'polyfork',
    what: 'The heroes, the villagers, the Gloamwood folk, the animals and the monsters — wolves, boars, spiders, treants, gloomcaps, the ash-troll and Cindermaw (rigged and animated low-poly models)',
    site: 'https://polyfork.dev',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    items: POLYFORK_MODELS.map(([id, title]) => ({ name: title, url: `https://polyfork.dev/asset/${id}` }))
  },
  {
    name: 'Mesh2Motion',
    what: 'Animations borrowed onto every person (talking, sitting, greeting, hammering, jumping, sprinting…) and every fight (sword combos, shield bash and block, bow draws, spell casts, rolls, hits and deaths, the treants\' ground pounds), the eagles and Vaelthrax the drake; human base rig by Quaternius',
    site: 'https://github.com/Mesh2Motion/mesh2motion-app',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'ambientCG',
    what: 'Photographed ground, cobble, rock, moss, roof-tile, timber, brick and lava materials',
    site: 'https://ambientcg.com',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'Poly Haven',
    what: 'Lanterns, barrels, crates, buckets, baskets, tables, ferns, shrubs, nettles, mossy rocks and cliff faces',
    site: 'https://polyhaven.com',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'three.js',
    what: 'The 3D engine, its post-processing and loaders',
    site: 'https://threejs.org',
    licence: 'MIT',
    licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE'
  },
  // The background music (docs/music.md): ACE-Step 1.5, MIT, with the titles this game plays.
  gameMusicPack('gloamreach')
];
