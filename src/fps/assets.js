import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/**
 * What Breachline draws with, from the downloaded asset library
 * (`npm run library:fetch`, fetched on its own with `npm run dev` and
 * `npm run build`): photoscanned props from Poly Haven, surfaces from
 * ambientCG (both CC0), and the soldier (see soldier.js). Everything here
 * fails soft — without the library the map keeps its plain shapes.
 */

const LIB = './library/';

/** Surfaces: an ambientCG id, and how many metres one copy of the picture covers. */
export const SURFACES = {
  asphalt: { id: 'Asphalt031', tile: 6 },
  concrete: { id: 'Concrete049', tile: 4 },
  slab: { id: 'Concrete034', tile: 5 },
  wall: { id: 'Concrete047A', tile: 4 },
  brick: { id: 'Bricks105', tile: 3 },
  brickRed: { id: 'Bricks109A', tile: 3 },
  paving: { id: 'PavingStones142', tile: 3 },
  planks: { id: 'Planks037A', tile: 1.2 },
  steel: { id: 'CorrugatedSteel005', tile: 2.4 },
  metal: { id: 'Metal027', tile: 1 },
  plates: { id: 'MetalPlates006', tile: 2 },
  rust: { id: 'Metal063', tile: 2 },
  dirt: { id: 'Ground054', tile: 7 },
  gravel: { id: 'Gravel023', tile: 4 }
};

/** Props: their files in the library. Their sizes are real ones, in metres. */
export const PROPS = {
  barrel1: 'polyhaven/Barrel_01/Barrel_01_1k.gltf',
  barrel2: 'polyhaven/Barrel_02/Barrel_02_1k.gltf',
  barrel3: 'polyhaven/barrel_03/barrel_03_1k.gltf',
  propane: 'polyhaven/propane_tank/propane_tank_1k.gltf',
  bag: 'polyhaven/cement_bag/cement_bag_1k.gltf',
  militaryCrate: 'polyhaven/wooden_military_crate/wooden_military_crate_1k.gltf',
  jerrycan: 'polyhaven/metal_jerrycan_green/metal_jerrycan_green_1k.gltf',
  generator: 'polyhaven/portable_generator/portable_generator_1k.gltf',
  aircon: 'polyhaven/exterior_aircon_unit/exterior_aircon_unit_1k.gltf',
  utility: 'polyhaven/utility_box_02/utility_box_02_1k.gltf',
  powerBox: 'polyhaven/power_box_01/power_box_01_1k.gltf',
  trash: 'polyhaven/trashbag/trashbag_1k.gltf',
  tyre: 'polyhaven/old_tyre/old_tyre_1k.gltf',
  shutterDoor: 'polyhaven/rollershutter_door/rollershutter_door_1k.gltf',
  shutterWindow: 'polyhaven/rollershutter_window_02/rollershutter_window_02_1k.gltf',
  lamp: 'polyhaven/street_lamp_01/street_lamp_01_1k.gltf',
  pipes: 'polyhaven/modular_industrial_pipes_01/modular_industrial_pipes_01_1k.gltf',
  securityLight: 'polyhaven/security_light/security_light_1k.gltf',
  fireEscape: 'polyhaven/modular_fire_escape/modular_fire_escape_1k.gltf',
  trashCan: 'polyhaven/metal_trash_can/metal_trash_can_1k.gltf',
  handTruck: 'polyhaven/hand_truck/hand_truck_1k.gltf',
  factory: 'polyhaven/modular_factory_facade/modular_factory_facade_1k.gltf',
  apartments: 'polyhaven/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf'
};

const textures = new THREE.TextureLoader();
const gltfs = new GLTFLoader();
const surfaceCache = new Map();
const propCache = new Map();

/**
 * A material from an ambientCG surface. Its pictures repeat once a texture
 * unit (UVs are in tiles — see `worldBox`), and arrive when they arrive.
 * @param {keyof SURFACES} name
 * @param {{ color?: THREE.ColorRepresentation, metal?: boolean, roughness?: number }} [opts]
 */
export function surface(name, { color = '#ffffff', metal = false, roughness = 1 } = {}) {
  const key = `${name}|${color}|${metal}|${roughness}`;
  if (surfaceCache.has(key)) return surfaceCache.get(key);
  const { id } = SURFACES[name];
  const base = `${LIB}ambientcg/${id}/${id}_1K-JPG_`;
  const load = (part, srgb) => {
    const t = textures.load(`${base}${part}.jpg`, undefined, undefined, () => {});
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: load('Color', true),
    normalMap: load('NormalGL'),
    roughnessMap: load('Roughness'),
    roughness,
    metalness: metal ? 1 : 0,
    metalnessMap: metal ? load('Metalness') : null
  });
  surfaceCache.set(key, mat);
  return mat;
}

/**
 * A box whose pictures keep their size whatever the box's: UVs in tiles of
 * `tile` metres on every face. Its origin is its bottom centre.
 */
export function worldBox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + w / 2;
    const y = pos.getY(i) + h / 2;
    const z = pos.getZ(i) + d / 2;
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    if (ay > 0.5) uv.setXY(i, x / tile, z / tile);
    else if (ax > 0.5) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  g.translate(0, h / 2, 0);
  return g;
}

/** A prop's parts: [{ geometry, material, matrix }] relative to its origin, or null without the library. */
export function prop(name) {
  if (!propCache.has(name)) {
    propCache.set(
      name,
      gltfs
        .loadAsync(`${LIB}${PROPS[name]}`)
        .then((gltf) => {
          gltf.scene.updateMatrixWorld(true);
          const parts = [];
          gltf.scene.traverse((o) => {
            if (o.isMesh) parts.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() });
          });
          const box = new THREE.Box3().setFromObject(gltf.scene);
          return { parts, box, scene: gltf.scene };
        })
        .catch(() => null)
    );
  }
  return propCache.get(name);
}

/**
 * Many copies of props, drawn as one instanced mesh per part. `add` takes a
 * prop and a placement (position, turn about y, scale); `build` makes the
 * meshes once the props are loaded and puts them in `parent`.
 */
export class PropBatch {
  constructor(parent) {
    this.parent = parent;
    this.wanted = new Map(); // name → [Matrix4]
  }

  add(name, x, y, z, turn = 0, scale = 1) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn),
      typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale
    );
    if (!this.wanted.has(name)) this.wanted.set(name, []);
    this.wanted.get(name).push(m);
  }

  /** Resolves with how many props could be drawn. `flat` names props that cast no shadow (things on walls). */
  async build({ shadows = true, flat = new Set() } = {}) {
    let drawn = 0;
    await Promise.all(
      [...this.wanted].map(async ([name, list]) => {
        const p = await prop(name);
        if (!p) return;
        drawn += list.length;
        for (const part of p.parts) {
          const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length);
          list.forEach((m, i) => mesh.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, part.matrix)));
          mesh.castShadow = shadows && !flat.has(name);
          mesh.receiveShadow = true;
          mesh.computeBoundingSphere();
          this.parent.add(mesh);
        }
      })
    );
    return drawn;
  }
}

/** The sky: a real one (an HDR photograph) for the background and the light on shiny things. */
export function sky(renderer, scene) {
  return new HDRLoader()
    .loadAsync('./hdri/spruit_sunrise.hdr')
    .then((hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.background = hdr;
      scene.backgroundIntensity = 0.85;
      scene.environmentIntensity = 0.55;
      pmrem.dispose();
      return true;
    })
    .catch(() => false);
}
