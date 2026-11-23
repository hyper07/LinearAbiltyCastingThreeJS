/**
 * Everything in Snowpuff Peaks that isn't made here, for the Credits panel
 * and docs/third-party.md. Pure data.
 */
import { gameMusicPack } from '../shared/gameMusic.js';
import { POLYFORK } from './assets.js';

export const PACKS = [
  {
    name: 'three.js',
    what: 'WebGPURenderer and its node materials (TSL), the render pipeline and its GTAO, TRAA, SMAA, FXAA and bloom nodes, the glTF and HDR loaders',
    site: 'https://threejs.org',
    licence: 'MIT',
    licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE'
  },
  {
    name: 'polyfork',
    what: 'The props on the mountains (each by name below): trees, lift towers and chairs, chalets, huts, snowmen, hay bales, fences, rocks, lanterns',
    site: 'https://polyfork.dev',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    items: Object.values(POLYFORK).map(([id, title]) => ({ name: title, url: `https://polyfork.dev/asset/${id}` }))
  },
  {
    name: 'Poly Haven',
    what: 'The sky light (HDRIs): Kloofendal 48d Partly Cloudy (Pure Sky) and Spruit Sunrise',
    site: 'https://polyhaven.com/hdris',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    name: 'Nunito (via Fontsource)',
    what: 'The lettering of the menus and the HUD',
    site: 'https://github.com/googlefonts/nunito',
    licence: 'SIL Open Font License 1.1',
    licenceUrl: 'https://openfontlicense.org'
  },
  // The background music (docs/music.md): ACE-Step 1.5, MIT, with the titles this game plays.
  gameMusicPack('snowpuff')
];

/** Made here, owing no one. */
export const OWN =
  'The plush riders (Pip the fox, Mallow the bunny, Toffee, Mochi, Pickle, Peaches and Pebble) are original characters, sculpted in code from soft shapes with the platform\'s sculptor (from AI Arcademia) and dressed in fur and plush made here. The snow, the trails, the kickers, the gift boxes, bells, fences, flags, poles, gates and arches, the sky and aurora, every effect and every sound are made in code for this game.';
