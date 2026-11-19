/**
 * Everything in Kindlewatch that isn't made here, for the Credits panel and
 * the docs. Pure data.
 */
import { gameMusicPack } from '../shared/gameMusic.js';


export const PACKS = [
  {
    name: 'three.js',
    what: 'The WebGL renderer under the painted picture, and its bloom pass',
    site: 'https://threejs.org',
    licence: 'MIT',
    licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE'
  },
  {
    name: 'Nunito (via Fontsource)',
    what: 'The lettering of the menus, the HUD and the damage numbers',
    site: 'https://github.com/googlefonts/nunito',
    licence: 'SIL Open Font License 1.1',
    licenceUrl: 'https://openfontlicense.org'
  },
  // The background music (docs/music.md): ACE-Step 1.5, MIT, with the titles this game plays.
  gameMusicPack('kindlewatch')
];

/** Made here, owing no one. */
export const OWN =
  'Every picture in the keep is painted in code for this game, stroke by stroke, when it loads: the heroes and foes (cut-out puppets of inked, cel-shaded limbs), the walls, blocks, braziers, banners, the frozen fountain and garden, the ice throne, the flagstones, snow and ice, the effects and the HUD. Their normal maps come from their own shapes. The lighting, shadows and sound effects are made in code too; the music is generated with ACE-Step 1.5 (credited above). The colour ramps come from the platform\'s own pixel-art kit (src/pixel/art.js).';
