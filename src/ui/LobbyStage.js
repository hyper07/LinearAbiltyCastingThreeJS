import {
  AmbientLight,
  AnimationMixer,
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { applyCharacterColors, captureMaterialBases } from '../animation/CharacterAppearance.js';

/** Props built into the KayKit models (weapons, shields…): the lobby shows the people. */
const BUILT_IN_PROPS = /^(1H_|2H_)|shield|offhand|spellbook|^mug$|throwable|^knife$|crossbow|wand|staff/i;
const HEIGHT = 1.8;
const SPACING = 1.5;

const _box = new Box3();
const _size = new Vector3();
const _centre = new Vector3();
const _head = new Vector3();

/**
 * The lobby's stage: every player's chosen character standing side by side,
 * in the body and colours they picked, with their name over them. Idle while
 * they choose; a cheer when they press Ready. `turn` turns them (the lobby drags it).
 *
 * Its own small renderer (the lobby sits over the menu), drawing only while
 * the lobby is open.
 */
export class LobbyStage {
  /**
   * @param {HTMLElement} mount
   * @param {{ loadGLB: (url: string) => Promise<{ scene, animations }>, modelOf: (look: string) => string|null }} deps
   */
  constructor(mount, { loadGLB, modelOf }) {
    this.loadGLB = loadGLB;
    this.modelOf = modelOf;
    this.mount = mount;
    this.templates = new Map();
    /** member id → { key, root, mixer, idle, cheer, label, bases, ready } */
    this.slots = new Map();
    /** member id → the number of its latest `set` (older loads are dropped). */
    this._tickets = new Map();
    this._wanted = new Set();
    this.turn = 0.35;
    this._raf = 0;
    this._last = 0;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.domElement.className = 'lobby-stage__canvas';
    mount.appendChild(this.renderer.domElement);
    this.labels = document.createElement('div');
    this.labels.className = 'lobby-stage__labels';
    mount.appendChild(this.labels);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(32, 2, 0.1, 50);
    this.scene.add(new HemisphereLight('#cfe4ff', '#2a2230', 1.2));
    this.scene.add(new AmbientLight('#ffffff', 0.35));
    const key = new DirectionalLight('#fff2dc', 2.4);
    key.position.set(2.5, 4, 3.5);
    this.scene.add(key);
    const rim = new DirectionalLight('#7fb6ff', 1.4);
    rim.position.set(-3, 2.5, -3);
    this.scene.add(rim);
    this.group = new Group();
    this.scene.add(this.group);

  }

  /** Move the stage (its canvas and names) into another box: the lobby is rebuilt for each game. */
  attach(box) {
    box.append(this.renderer.domElement, this.labels);
    this.mount = box;
    this._w = this._h = 0;
  }

  async _template(look) {
    const url = this.modelOf(look);
    if (!url) return null;
    if (!this.templates.has(url)) this.templates.set(url, this.loadGLB(url).catch(() => null));
    return this.templates.get(url);
  }

  /**
   * Who stands on the stage.
   * @param {{ id: string, name: string, look: string, tint?: string, cloth?: string, ready: boolean, you?: boolean }[]} members
   */
  async set(members) {
    const want = new Set(members.map((m) => m.id));
    this._wanted = want;
    for (const [id, slot] of this.slots) {
      if (want.has(id)) continue;
      this._drop(slot);
      this.slots.delete(id);
    }
    await Promise.all(members.map((m, i) => this._place(m, i, members.length)));
    this._frameCamera(members.length);
  }

  async _place(member, index, count) {
    const key = member.look;
    // The latest call for a member wins: a look changed while a model was loading
    // must not leave the older model (and its name) standing on the stage.
    const ticket = (this._tickets.get(member.id) ?? 0) + 1;
    this._tickets.set(member.id, ticket);
    let slot = this.slots.get(member.id);
    if (!slot || slot.key !== key) {
      const template = await this._template(member.look);
      if (!template || this._tickets.get(member.id) !== ticket || !this._wanted.has(member.id)) return;
      slot = this.slots.get(member.id);
      if (!slot || slot.key !== key) {
        if (slot) this._drop(slot);
        slot = this._build(template, key);
        this.slots.set(member.id, slot);
      }
    }
    slot.holder.position.x = (index - (count - 1) / 2) * SPACING;
    // Colours on the model's own materials, from the copies taken when it was built.
    applyCharacterColors(slot.root, { tint: member.tint || '#ffffff', clothColor: member.cloth || null, skinColor: null }, slot.bases);
    slot.nameEl.textContent = `${member.name}${member.you ? ' (you)' : ''}`;
    slot.labelEl.classList.toggle('is-ready', member.ready);
    slot.badge.textContent = member.ready ? 'Ready' : 'choosing…';
    if (member.ready && !slot.ready && slot.cheer) {
      slot.cheer.reset().play();
      slot.idle?.crossFadeTo(slot.cheer, 0.2, false);
    }
    slot.ready = member.ready;
  }

  _build(template, key) {
    const root = cloneSkinned(template.scene);
    root.traverse((node) => {
      if (!node.isMesh) return;
      if (BUILT_IN_PROPS.test(node.name)) {
        node.visible = false;
        return;
      }
      node.material = Array.isArray(node.material) ? node.material.map((m) => m.clone()) : node.material.clone();
      node.frustumCulled = false;
    });
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
    _box.getSize(_size);
    root.scale.setScalar(HEIGHT / Math.max(0.1, _size.y));
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
    _box.getCenter(_centre);
    root.position.set(-_centre.x, -_box.min.y, -_centre.z);
    const holder = new Group();
    holder.add(root);
    const pad = new Mesh(new CircleGeometry(0.55, 40).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#fff3d6', roughness: 0.9 }));
    pad.position.y = 0.001;
    const ring = new Mesh(new RingGeometry(0.55, 0.6, 48).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#2b1d4e', emissive: new Color('#2b1d4e') }));
    ring.position.y = 0.003;
    holder.add(pad, ring);
    this.group.add(holder);

    const mixer = new AnimationMixer(root);
    const clip = (name) => template.animations.find((a) => a.name === name);
    const idle = clip('Idle') ? mixer.clipAction(clip('Idle')) : null;
    idle?.setLoop(LoopRepeat, Infinity).play();
    const cheer = clip('Cheer') ? mixer.clipAction(clip('Cheer')) : null;
    if (cheer) {
      cheer.setLoop(LoopOnce, 1);
      cheer.clampWhenFinished = false;
      mixer.addEventListener('finished', (e) => {
        if (e.action === cheer && idle) {
          idle.reset().play();
          cheer.crossFadeTo(idle, 0.3, false);
        }
      });
    }
    const label = document.createElement('div');
    label.className = 'lobby-stage__label';
    const badge = document.createElement('small');
    const name = document.createElement('span');
    label.append(name, badge);
    this.labels.append(label);
    return { key, holder, root, mixer, idle, cheer, bases: captureMaterialBases(root), ready: false, labelEl: label, nameEl: name, badge };
  }

  _drop(slot) {
    slot.mixer.stopAllAction();
    this.group.remove(slot.holder);
    slot.holder.traverse((node) => {
      if (!node.isMesh) return;
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) m.dispose?.();
      if (!node.isSkinnedMesh) node.geometry?.dispose?.();
    });
    slot.labelEl.remove();
  }

  _frameCamera(count) {
    const width = Math.max(1, count) * SPACING + 1.2;
    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(0.5, this.camera.aspect);
    const fit = Math.max(2.6 / (2 * Math.tan(fov / 2)), width / (2 * Math.tan(fov / 2) * aspect));
    this.camera.position.set(0, 1.35, fit + 0.8);
    this.camera.lookAt(0, 0.95, 0);
  }

  _resize() {
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    if (this._w === w && this._h === h) return;
    this._w = w;
    this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._frameCamera(this.slots.size);
  }

  show() {
    if (this._raf) return;
    this._last = performance.now();
    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this._resize();
      for (const slot of this.slots.values()) {
        slot.mixer.update(dt);
        slot.holder.rotation.y = this.turn;
      }
      this.renderer.render(this.scene, this.camera);
      // Names over heads.
      const w = this._w;
      const h = this._h;
      for (const slot of this.slots.values()) {
        _head.set(slot.holder.position.x, HEIGHT + 0.3, 0).project(this.camera);
        slot.labelEl.style.transform = `translate(${((_head.x + 1) / 2) * w}px, ${((1 - _head.y) / 2) * h}px) translate(-50%, -100%)`;
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  hide() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
}
