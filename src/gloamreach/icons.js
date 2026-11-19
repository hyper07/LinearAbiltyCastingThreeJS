/**
 * Pictures of items made from their own 3D models: each item is posed in a
 * small studio (soft key, cool rim, a studio environment for the metal to
 * reflect), rendered once offscreen and kept as an image, so the bag shows
 * the very sword the hero will hold. And the character panel's preview: the
 * hero in their gear, turning on a plinth (drag to turn them).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BASES, RARITIES } from './items.js';
import { buildItem } from './gearModels.js';
import { FighterActor } from './fighter.js';
import { GearRig } from './gearRig.js';

const SIZE = 128;

function studio(renderer) {
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  const key = new THREE.DirectionalLight('#fff1dc', 2.4);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight('#9ab8ff', 1.6);
  rim.position.set(-3, 1.5, -3);
  const fill = new THREE.HemisphereLight('#b8b0a0', '#2a2420', 0.5);
  scene.add(key, rim, fill);
  return scene;
}

export class ItemStudio {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(SIZE, SIZE, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.scene = studio(this.renderer);
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.001, 50);
    this.cache = new Map();
  }

  key(item) {
    const l = item.look ?? {};
    return [item.base, item.rarity, l.metal, l.cloth, l.leather, l.gem, l.seed].join('|');
  }

  /** The item's picture (a data URL), made the first time it's asked for. */
  icon(item) {
    if (!item?.base) return '';
    const k = this.key(item);
    if (this.cache.has(k)) return this.cache.get(k);
    const base = BASES[item.base];
    const g = buildItem(item);
    const holder = new THREE.Group();
    holder.add(g);
    if (base.slot === 'mainhand') g.rotation.set(0, 0.35, base.wtype === 'bow' ? -0.6 : -Math.PI / 4);
    else if (base.slot === 'head') g.rotation.set(0.15, 0.55, 0);
    else if (base.slot === 'offhand') g.rotation.set(0, base.kind === 'quiver' ? 0.2 : 0.4, base.kind === 'quiver' ? -0.5 : 0);
    else if (base.slot === 'trinket') g.rotation.set(0.3, 0.3, 0);
    else g.rotation.set(0.1, 0.45, 0);
    this.scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y) * 0.5 + size.z * 0.15;
    const d = r / Math.tan(THREE.MathUtils.degToRad(13)) * 1.08;
    this.camera.position.set(c.x, c.y, c.z + d);
    this.camera.near = d * 0.05;
    this.camera.far = d * 4;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(holder);
    this.cache.set(k, url);
    return url;
  }

  dispose() {
    this.renderer.dispose();
  }
}

/** The hero on a plinth, in what they wear, for the character panel. */
export class HeroPreview {
  constructor(template, hero, height) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.scene = studio(this.renderer);
    const key = this.scene.children.find((o) => o.isDirectionalLight);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.6, metalness: 0.2 }));
    plinth.position.y = -0.06;
    plinth.receiveShadow = true;
    this.scene.add(plinth);
    this.actor = new FighterActor(template, { height });
    this.scene.add(this.actor.object);
    this.rig = new GearRig(this.actor, template, { hero, preview: true, scene: this.scene });
    this.camera = new THREE.PerspectiveCamera(28, 0.72, 0.1, 20);
    this.camera.position.set(0, 1.15, 4.1);
    this.camera.lookAt(0, 0.95, 0);
    this.yaw = 0.35;
    this.el = this.renderer.domElement;
    this.el.className = 'gr-preview__canvas';
    let drag = null;
    this.el.addEventListener('pointerdown', (e) => {
      drag = e.clientX;
      this.el.setPointerCapture(e.pointerId);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (drag == null) return;
      this.yaw += (e.clientX - drag) * 0.012;
      drag = e.clientX;
    });
    this.el.addEventListener('pointerup', () => (drag = null));
  }

  dress(equip) {
    this.rig.dress(equip);
    this.rig.settle();
  }

  frame(dt) {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (w && h && (this._w !== w || this._h !== h)) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this._w = w;
      this._h = h;
    }
    this.actor.object.rotation.y = this.yaw;
    this.actor.move(0);
    this.actor.update(dt);
    this.actor.object.updateMatrixWorld(true);
    this.rig.update(dt, this.actor.object);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.rig.dispose();
    this.actor.dispose();
    this.renderer.dispose();
  }
}

export const rarityColor = (r) => RARITIES[r]?.color ?? '#ddd';
