/**
 * Everything third-party in Kickrani, for its Credits panel (behind the
 * small Credits button on the menus and the pause screen, never over a live
 * race): each source with its site and licence, each CC BY model by name and
 * author. docs/third-party.md keeps the same list with the models' full
 * titles. Pure data.
 */
import { VEHICLES, ROCKETBOX, sketchfabPage } from './streetAssets.js';

const CC_BY = { licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' };
const CC0 = { licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };

/** ambientCG surfaces in the city: id → what it is. */
export const AMBIENTCG = [
  ['Asphalt031', 'the roads'],
  ['PavingStones152', 'the brick-block pavements'],
  ['Concrete034', 'kerbs, slabs and garden walls'],
  ['Bricks101', 'red villa brick'],
  ['Bricks105', 'red-brick villas close up'],
  ['Granite001A', 'beige granite panels'],
  ['Granite002A', 'grey granite panels'],
  ['Tiles107', 'white tile'],
  ['Tiles133A', 'small tiles'],
  ['Plaster001', 'render'],
  ['CorrugatedSteel005', 'shop shutters'],
  ['Bark004', 'the ginkgos’ bark'],
  ['Bark009', 'the plane trees’ bark']
];

/** What a street model is called on screen (a maker's name stays off it: the truck is a 1-ton truck). */
export const onScreenTitle = (v) => v.screen ?? v.title;

/** The credits, by source: { name, what, site, licence, licenceUrl, items?: [{ name, url, by }] }. */
export function seoulCredits({ alleys = true, terrain = true } = {}) {
  return [
    {
      name: '국토교통부 GIS건물통합정보',
      what: 'Every building in Seoul at its true place and height: the national building register (Ministry of Land, Infrastructure and Transport)',
      site: 'https://www.data.go.kr/data/15083092/fileData.do',
      licence: '공공누리 제1유형 (KOGL type 1), source credited',
      licenceUrl: 'https://www.kogl.or.kr/info/licenseType1.do'
    },
    terrain && {
      name: 'Copernicus DEM GLO-30',
      what: 'The land: hills and the Han. © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA',
      site: 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM',
      licence: 'Copernicus DEM licence (free, with this credit)',
      licenceUrl: 'https://registry.opendata.aws/copernicus-dem/'
    },
    {
      name: 'OpenStreetMap',
      what: `The roads${alleys ? ', and the small streets and alleys round the bike courses' : ''}. © OpenStreetMap contributors`,
      site: 'https://www.openstreetmap.org/copyright',
      licence: 'ODbL 1.0',
      licenceUrl: 'https://opendatacommons.org/licenses/odbl/'
    },
    {
      name: 'Sketchfab models (via the Objaverse mirror)',
      what: 'The cars, the truck and the buses in traffic, repainted in Seoul’s colours; no makers’ badges',
      site: 'https://sketchfab.com',
      ...CC_BY,
      items: VEHICLES.map((v) => ({ name: onScreenTitle(v), url: sketchfabPage(v.uid), by: v.author }))
    },
    {
      name: 'Car Concept',
      what: 'The car you drive in the city, by Eric Chadwick (Darmstadt Graphics Group) for the Khronos Group; the Khronos emblem left off',
      site: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
      ...CC_BY
    },
    {
      name: 'polyfork',
      what: 'The delivery scooters in traffic',
      site: 'https://polyfork.dev',
      ...CC_BY,
      items: [{ name: 'Delivery Moped', url: 'https://polyfork.dev/asset/delivery-moped-1aa2ce', by: 'polyfork.dev' }]
    },
    {
      name: 'Microsoft Rocketbox Avatar Library',
      what: 'The people on the pavements near you, and their motion-captured walks, idles and cheers',
      site: ROCKETBOX.page,
      licence: 'MIT',
      licenceUrl: 'https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md'
    },
    {
      name: 'three.js examples',
      what: 'Mina and Jun, the people you walk as in the city: Michelle (made with Mixamo) and a Ready Player Me avatar',
      site: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf',
      licence: 'free to use in a game',
      licenceUrl: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf'
    },
    {
      name: 'ambientCG',
      what: 'Photographed surfaces: asphalt, paving, brick, granite, tile, render, concrete, shutters and bark',
      site: 'https://ambientcg.com',
      ...CC0,
      items: AMBIENTCG.map(([id, what]) => ({ name: `${id} — ${what}`, url: `https://ambientcg.com/view?id=${id}` }))
    },
    {
      name: 'Bagel Fat One',
      what: 'The Kickrani 킥라니 logo: a font by the Bagel Fat Project Authors (JAMO), via Fontsource',
      site: 'https://github.com/JAMO-TYPEFACE/BagelFat',
      licence: 'SIL Open Font License 1.1',
      licenceUrl: 'https://openfontlicense.org'
    }
  ].filter(Boolean);
}
