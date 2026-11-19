/**
 * Everything third-party in Wyldhunt, for the Credits panel and the docs:
 * each pack with its site and licence, and each CC BY model by name. Pure.
 */
import { gameMusicPack } from '../shared/gameMusic.js';


/** polyfork models (CC BY 4.0): id → title, each credited by name with its page. */
export const POLYFORK_MODELS = [
  ['human-warrior-base', 'Human warrior'],
  ['slim-knight-base', 'Silver-Crested Order Knight'],
  ['dryad-hunter-base', 'Dryad hunter'],
  ['orc-hunter-base', 'Orc hunter'],
  ['dwarf-knight-base', 'Dwarf knight'],
  ['deer-base', 'Deer']
];

/** Poly Haven models used (CC0). */
export const POLYHAVEN_MODELS = ['fern_02', 'shrub_03', 'rock_moss_set_01', 'rock_moss_set_02', 'rock_face_01', 'rock_face_02', 'boulder_01', 'root_cluster_01', 'wooden_crate_01', 'wine_barrel_01', 'wicker_basket_01', 'wooden_lantern_01'];

/** ambientCG materials used (CC0). */
export const AMBIENTCG = ['Ground068', 'Ground106', 'Ground108', 'Bricks113A', 'Rock051', 'Rock063', 'Moss002', 'Grass004', 'WoodFloor041', 'Planks037A'];

export const PACKS = [
  {
    name: 'Mesh2Motion',
    what: 'The rigged, animated beasts our creatures are built from — the horse (Burrow the Shagmane), the T-Rex (the Gnarlhorn), the spider (the thornskitters) — and every human motion the hunters borrow: greatblade swings, bow draws, rolls, riding, gathering, carving, drinking',
    site: 'https://github.com/Mesh2Motion/mesh2motion-app',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'polyfork',
    what: 'The hunters\' bodies and the velvetbucks (rigged, animated low-poly models)',
    site: 'https://polyfork.dev',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    items: POLYFORK_MODELS.map(([id, title]) => ({ name: title, url: `https://polyfork.dev/asset/${id}` }))
  },
  {
    name: 'Poly Haven',
    what: 'Ferns, shrubs, mossy rocks, cliff faces, roots, crates, barrels, a basket and lanterns',
    site: 'https://polyhaven.com',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    items: POLYHAVEN_MODELS.map((id) => ({ name: id.replace(/_/g, ' '), url: `https://polyhaven.com/a/${id}` }))
  },
  {
    name: 'ambientCG',
    what: 'Photographed ground, mud, river pebbles, old flagstones, rock, mossy rock, moss, grass and timber',
    site: 'https://ambientcg.com',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    items: AMBIENTCG.map((id) => ({ name: id, url: `https://ambientcg.com/view?id=${id}` }))
  },
  {
    name: 'three.js',
    what: 'The 3D engine, its post-processing and loaders',
    site: 'https://threejs.org',
    licence: 'MIT',
    licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE'
  },
  // The background music (docs/music.md): ACE-Step 1.5, MIT, with the titles this game plays.
  gameMusicPack('wyldhunt')
];

/** Made here, owing no one: the land, water, falls, mist, rain, plants, ruins, camp, fur, armour and weapons (Gloamreach's, modelled in code), the sounds. */
export const OWN = 'The gorge, its river, falls, mist and rain, the palms, ferns, taro, bananas, vines and roots, the ruins, the camp, the fur, the tack, the horns and plates, the armour and weapons, the icons and every sound effect are made in code for this game (some of it shared with Gloamreach); the music is credited above.';
