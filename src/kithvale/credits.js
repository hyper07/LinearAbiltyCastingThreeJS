/**
 * Everything third-party in Kithvale, for the Credits panel and the docs:
 * each pack with its site and licence, each CC BY model by name. Pure.
 */

/** polyfork models (CC BY 4.0): id → title, each credited by name with its page. */
export const POLYFORK_MODELS = [
  ['kite-kid-base', 'Kite kid'],
  ['halfling-hunter-base', 'Halfling hunter'],
  ['village-child-bef09e', 'Village child'],
  ['waving-child-dfada0', 'Waving Child'],
  ['ashigaru-foot-soldier-806707', 'Ashigaru Foot Soldier'],
  ['porter-e4e566', 'Porter'],
  ['farmer-363820', 'Farmer'],
  ['townswoman-5ca8b5', 'Townswoman'],
  ['buddhist-monk-39f498', 'Buddhist Monk'],
  ['village-gardener-9f7af6', 'Village gardener'],
  ['shopkeeper-be5547', 'Shopkeeper'],
  ['merchant-6f606b', 'Merchant'],
  ['villager-40255c', 'Male Villager'],
  ['crossing-keeper-e13207', 'Crossing Keeper'],
  ['daimyo-lord-78364a', 'Daimyo Lord']
];

/** ambientCG materials used as fine detail under the painted ground (CC0). */
export const AMBIENTCG = ['Grass004', 'Ground068', 'Ground106', 'PavingStones141', 'Rock051', 'Moss002'];

/** Mesh2Motion human clips the villagers and you borrow. */
export const CLIPS = ['jump', 'sprint', 'crouch walk and crouch idle', 'throw', 'kneel', 'pick up', 'glide', 'greeting', 'talking and listening', 'sweeping (farm work)', 'lantern', 'praying', 'sitting', 'harvesting', 'watering', 'victory'];

export const PACKS = [
  {
    name: 'polyfork',
    what: 'You, and the people of Lanternrest (rigged, animated low-poly models), recoloured for the vale',
    site: 'https://polyfork.dev',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    items: POLYFORK_MODELS.map(([id, title]) => ({ name: title, url: `https://polyfork.dev/asset/${id}` }))
  },
  {
    name: 'Mesh2Motion',
    what: `Every human motion borrowed onto the villagers and you: ${CLIPS.join(', ')}`,
    site: 'https://github.com/Mesh2Motion/mesh2motion-app',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'ambientCG',
    what: 'Photographed grass, earth, flagstones, rock and moss, used faintly as fine detail under the painted ground',
    site: 'https://ambientcg.com',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    items: AMBIENTCG.map((id) => ({ name: id, url: `https://ambientcg.com/view?id=${id}` }))
  },
  {
    name: 'Nunito',
    what: 'The lettering of the menus and the journal',
    site: 'https://github.com/googlefonts/nunito',
    licence: 'SIL Open Font License 1.1',
    licenceUrl: 'https://openfontlicense.org'
  },
  {
    name: 'three.js',
    what: 'The 3D engine, its post-processing, loaders and helpers',
    site: 'https://threejs.org',
    licence: 'MIT',
    licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE'
  }
];

/** Made here, owing no one. */
export const OWN = 'The six creatures (sculpted from smooth shapes in code, with their faces, fur and shells), the vale, its sky, grass, trees, water, the village and its gate, the shrine, the painted look, the icons, the music of the trust moment and every sound are made in code for this game — some of it shared with Gloamreach, Wyldhunt and AI Arcademia.';
