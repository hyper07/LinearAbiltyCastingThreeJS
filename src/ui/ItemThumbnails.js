import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ELEMENT_META } from '../config/settings.js';
import { platform } from '../platform/index.js';
import { buildWeaponMesh } from '../entities/WeaponVisual.js';
import { buildGearMesh } from '../entities/GearVisual.js';
import { RARITIES, itemSize } from '../items/Items.js';
import { disposeObject } from '../utils/dispose.js';

/**
 * Pictures of items for the bag, the stash, the paper doll and the
 * merchant: each item's own 3D model (the same procedural weapon and gear
 * meshes the character holds and wears) rendered once into a small image and
 * cached.
 *
 * One small offscreen renderer with a studio light and reflections, so steel
 * reads as steel. Each picture is laid out for the cells it fills: a long
 * weapon stands upright in a tall slot and lies diagonally in a square one;
 * armor and shields face you; rings tip forward to show the stone.
 */

const PX_PER_CELL = 96; // rendered size per cell (drawn at ~44 px, so crisp on high-DPI screens)
const _box = new Box3();
const _size = new Vector3();
const _center = new Vector3();

class Thumbnails {
  constructor() {
    this.cache = new Map();
    this.failed = false;
  }

  _init() {
    if (this.renderer || this.failed) return Boolean(this.renderer);
    try {
      this.canvas = document.createElement('canvas');
      this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.scene = new Scene();
      const pmrem = new PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      this.scene.add(new AmbientLight(0xffffff, 0.35));
      const key = new DirectionalLight(0xffffff, 2.2);
      key.position.set(2, 3, 4);
      const rim = new DirectionalLight(0x9fc8ff, 1.2);
      rim.position.set(-3, 1, -2);
      this.scene.add(key, rim);
      this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
      this.camera.position.set(0, 0, 20);
      this.camera.lookAt(0, 0, 0);
      return true;
    } catch (error) {
      console.warn('[thumbnails] no WebGL for item pictures:', error.message);
      this.failed = true;
      return false;
    }
  }

  /** The cache key: what makes two items look the same. */
  _key(item, w, h) {
    const look =
      item.type === 'weapon' ? item.weapon
      : item.type === 'gear' ? `${item.base}:${item.rarity}`
      : item.type === 'book' ? item.element
      : item.type === 'bag' ? item.bag
      : item.type;
    return `${item.type}:${look}:${w}x${h}`;
  }

  /**
   * A picture of an item (a data URL), sized for `cells` ([columns, rows];
   * default the item's own size), or null when there is no WebGL.
   */
  of(item, cells = itemSize(item)) {
    const [w, h] = cells;
    const key = this._key(item, w, h);
    if (this.cache.has(key)) return this.cache.get(key);
    if (!this._init()) return null;
    const model = this._model(item);
    if (!model) {
      this.cache.set(key, null);
      return null;
    }
    const url = this._render(model, item, w, h);
    disposeObject(model);
    this.cache.set(key, url);
    return url;
  }

  _model(item) {
    if (item.type === 'weapon') {
      const weapon = platform.weapons.get(item.weapon);
      return weapon ? buildWeaponMesh(weapon) : null;
    }
    if (item.type === 'gear') return buildGearMesh(item);
    if (item.type === 'book') return buildBook(ELEMENT_META[item.element]?.accent ?? '#8a6ad8');
    if (item.type === 'bag') return buildSatchel(item.bag === 'pack' ? '#6a4a2e' : '#8a5a34', RARITIES[item.rarity]?.color);
    return null;
  }

  /** Lay the model out for a w×h slot, fit the camera to it, render. */
  _render(model, item, w, h) {
    const pose = new Group();
    const turn = new Group();
    const align = new Group();
    align.add(model);
    turn.add(align);
    pose.add(turn);

    if (item.type === 'weapon') {
      // Stand the longest side upright, give it a quarter-turn so it shows
      // some depth, then lay it down to suit the slot.
      _box.setFromObject(model).getSize(_size);
      if (_size.x >= _size.y && _size.x >= _size.z) align.rotation.z = Math.PI / 2;
      else if (_size.z >= _size.y && _size.z >= _size.x) align.rotation.x = Math.PI / 2;
      turn.rotation.y = 0.55;
      pose.rotation.z = h > w ? -0.08 : w > h ? -Math.PI / 2 + 0.1 : -Math.PI / 4;
    } else if (item.type === 'gear') {
      const k = item.kind;
      if (k === 'ring' || k === 'neck') {
        turn.rotation.x = k === 'ring' ? 0.9 : 0.25;
        pose.rotation.z = 0.2;
      } else if (k === 'offhand') {
        turn.rotation.y = -0.35;
        turn.rotation.x = 0.1;
      } else if (k === 'waist') {
        turn.rotation.x = 0.55;
      } else {
        turn.rotation.y = -0.6;
        turn.rotation.x = 0.22;
      }
    } else {
      turn.rotation.set(0.35, -0.55, 0);
    }

    this.scene.add(pose);
    pose.updateMatrixWorld(true);
    _box.setFromObject(pose);
    _box.getSize(_size);
    _box.getCenter(_center);
    // Fit the box into the slot's shape with a little margin.
    const aspect = w / h;
    let halfH = (_size.y / 2) * 1.12;
    let halfW = (_size.x / 2) * 1.12;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    const cam = this.camera;
    // The frustum is in the camera's own frame: centred on it, and the camera sits over the box.
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.position.set(_center.x, _center.y, _center.z + 20);
    cam.lookAt(_center.x, _center.y, _center.z);
    cam.updateProjectionMatrix();

    this.renderer.setSize(w * PX_PER_CELL, h * PX_PER_CELL, false);
    this.renderer.render(this.scene, cam);
    const url = this.canvas.toDataURL('image/png');
    this.scene.remove(pose);
    return url;
  }
}

/* — models for things that have none in the world — */

function buildBook(accent) {
  const g = new Group();
  const cover = new MeshStandardMaterial({ color: accent, roughness: 0.55, metalness: 0.1 });
  const pages = new MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9 });
  const gold = new MeshStandardMaterial({ color: '#e0b84a', metalness: 0.9, roughness: 0.3 });
  g.add(new Mesh(new BoxGeometry(0.62, 0.86, 0.06), cover));
  const back = new Mesh(new BoxGeometry(0.62, 0.86, 0.06), cover);
  back.position.z = -0.2;
  const block = new Mesh(new BoxGeometry(0.56, 0.8, 0.15), pages);
  block.position.set(0.02, 0, -0.1);
  const spine = new Mesh(new BoxGeometry(0.07, 0.86, 0.26), cover);
  spine.position.set(-0.3, 0, -0.1);
  const band1 = new Mesh(new BoxGeometry(0.075, 0.04, 0.27), gold);
  band1.position.set(-0.3, 0.3, -0.1);
  const band2 = band1.clone();
  band2.position.y = -0.3;
  const corner = new Mesh(new BoxGeometry(0.12, 0.12, 0.07), gold);
  corner.position.set(0.26, 0.38, 0.005);
  g.add(back, block, spine, band1, band2, corner);
  return g;
}

function buildSatchel(color, trim = '#ffd84a') {
  const g = new Group();
  const leather = new MeshStandardMaterial({ color, roughness: 0.75 });
  const dark = new MeshStandardMaterial({ color: '#3a2618', roughness: 0.8 });
  const metal = new MeshStandardMaterial({ color: trim, metalness: 0.85, roughness: 0.3, emissive: trim, emissiveIntensity: 0.15 });
  const body = new Mesh(new BoxGeometry(0.8, 0.6, 0.32), leather);
  const flap = new Mesh(new BoxGeometry(0.82, 0.32, 0.34), dark);
  flap.position.set(0, 0.16, 0.01);
  const clasp = new Mesh(new BoxGeometry(0.12, 0.1, 0.05), metal);
  clasp.position.set(0, 0.02, 0.18);
  const strap = new Mesh(new TorusGeometry(0.36, 0.035, 6, 24, Math.PI), dark);
  strap.position.y = 0.3;
  const roll = new Mesh(new CylinderGeometry(0.1, 0.1, 0.84, 12), leather);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, -0.36, 0.02);
  g.add(body, flap, clasp, strap, roll);
  return g;
}

/** The one shared picture maker. */
export const itemThumbnails = new Thumbnails();
