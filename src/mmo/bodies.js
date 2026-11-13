import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HAT, CAPE, lookOf } from './looks.js';

/**
 * Hearthvale's bodies: the KayKit Adventurers and Skeletons (CC0, Kay
 * Lousberg) from the asset library, dressed for who wears them — which
 * props they carry, hat and cape on or off, a tint, a build. Used by the
 * world (view.js) and by the character preview (CharacterStage below).
 */

const KIT = {
  Knight: 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb',
  Barbarian: 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb',
  Mage: 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb',
  Rogue: 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb',
  Rogue_Hooded: 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb',
  Skeleton_Mage: 'kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Mage.glb',
  Skeleton_Minion: 'kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Minion.glb',
  Skeleton_Warrior: 'kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb',
  Skeleton_Rogue: 'kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Rogue.glb'
};
/** Things a body can carry, hidden unless asked for. */
const PROPS = /^(1H_|2H_|Badge_Shield|Rectangle_Shield|Round_Shield|Spike_Shield|Barbarian_Round_Shield|Mug|Spellbook|Knife|Throwable)/;
const cache = new Map();

export function loadBody(body) {
  if (!cache.has(body)) cache.set(body, new GLTFLoader().loadAsync(`./library/${KIT[body]}`).catch(() => null));
  return cache.get(body);
}

/**
 * A body, dressed. Resolves `{ model, mixer, actions }`, or null when the
 * library isn't there.
 * @param {{ body: string, show?: string[], tint?: string, height?: number, hat?: boolean, cape?: boolean, wide?: number, tall?: number }} spec
 */
export async function dress(spec) {
  const gltf = await loadBody(spec.body);
  if (!gltf) return null;
  const model = SkeletonUtils.clone(gltf.scene);
  const color = new THREE.Color(spec.tint ?? '#ffffff');
  const show = spec.show ?? [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    if ((PROPS.test(o.name) && !show.includes(o.name)) || (spec.hat === false && HAT.test(o.name)) || (spec.cape === false && CAPE.test(o.name))) {
      o.visible = false;
      return;
    }
    o.castShadow = true;
    o.frustumCulled = false;
    o.material = o.material.clone();
    o.material.color.multiply(color);
  });
  const box = new THREE.Box3().setFromObject(model);
  const k = (spec.height ?? 2) / Math.max(0.1, box.max.y - box.min.y);
  model.scale.set(k * (spec.wide ?? 1), k * (spec.tall ?? 1), k * (spec.wide ?? 1));
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  return { model, mixer, actions };
}

/**
 * A small stage for one character: a round plinth, soft light, the body
 * standing easy and turning slowly; drag to turn it yourself. For choosing
 * and making characters.
 */
export class CharacterStage {
  constructor(host) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'hv-stage3d__canvas';
    host.append(this.canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 1.5, 6.4);
    this.camera.lookAt(0, 1.05, 0);
    this.scene.add(new THREE.HemisphereLight('#fff6e8', '#b8a8d8', 1.5));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -1 });
    this.scene.add(key);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 40), new THREE.MeshStandardMaterial({ color: '#fff0bf', roughness: 0.7 }));
    plinth.position.y = -0.15;
    plinth.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.06, 8, 48).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2b2140' }));
    this.scene.add(plinth, rim);
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.spin = 0.35;
    this.turn = -0.5; // facing you, a little to one side
    this.token = 0;
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      drag = e.clientX;
      this.spin = 0;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (drag == null) return;
      this.turn += (e.clientX - drag) * 0.012;
      drag = e.clientX;
    });
    this.canvas.addEventListener('pointerup', () => (drag = null));
    this._resize = new ResizeObserver(() => this.fit());
    this._resize.observe(host);
    this.host = host;
    this.fit();
    this._last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this.turn += this.spin * dt;
      this.pivot.rotation.y = this.turn;
      this.body?.mixer.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  fit() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Show a class in a look; `cheer` plays a little flourish (a new choice made). */
  async show(cls, look, { cheer = false } = {}) {
    const mine = ++this.token;
    const spec = lookOf(cls, look);
    const body = await dress({ ...spec, height: 2.1 });
    if (mine !== this.token) return;
    this.pivot.clear();
    this.body = body;
    this.shown = { cls, look: spec };
    if (!body) return;
    this.pivot.add(body.model);
    const idle = body.actions.Idle;
    idle?.play();
    const flourish = cheer ? body.actions[spec.attack] ?? body.actions.Cheer : null;
    if (flourish && idle) {
      flourish.reset().setLoop(THREE.LoopOnce, 1).play();
      flourish.crossFadeTo(idle, 0.9, false);
      idle.reset().play();
    }
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._resize.disconnect();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
