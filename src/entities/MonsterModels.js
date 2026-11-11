import { AnimationMixer, Box3, Color, LoopOnce, LoopRepeat, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Monsters as real animated models instead of shapes built in code.
 *
 * Each monster kind has a look: one or more rigged models (the KayKit
 * skeletons and adventurers that ship in public/models/characters, all on the
 * same rig with ~76–95 authored clips each), the props it keeps in hand, the
 * weapons it holds (from the KayKit skeleton pack in the 3D library, when it
 * is downloaded), and which clip plays for each thing it does. The monster's
 * brain (Monster.js) is unchanged: it decides; this body plays the clip.
 *
 * Kinds without a look (the dragon), or whose model did not load, keep the
 * hand-built body.
 */

const CHARACTERS = './models/characters';
const SKELETON = { idle: ['Idle_Combat', 'Idle'], walk: ['Walking_D_Skeletons', 'Walking_A'], run: ['Running_C', 'Running_A'], hit: ['Hit_A', 'Hit_B'], death: ['Death_C_Skeletons', 'Death_A'], spawn: ['Spawn_Ground_Skeletons', 'Spawn_Ground'] };
const ADVENTURER = { idle: ['Idle'], walk: ['Walking_A'], run: ['Running_A'], hit: ['Hit_A'], death: ['Death_A'], spawn: [] };

/** kind → how it looks and moves. Speeds are the clips' own, metres a second at 1.8 m tall. */
export const MONSTER_LOOKS = {
  grunt: {
    variants: [{ model: `${CHARACTERS}/skeleton-minion/model.glb`, weapons: { right: 'Skeleton_Axe' } }],
    height: 1.75,
    clips: { ...SKELETON, attack: ['1H_Melee_Attack_Chop'] }
  },
  wisp: {
    variants: [{ model: `${CHARACTERS}/skeleton-mage/model.glb`, weapons: { right: 'Skeleton_Staff' } }],
    height: 1.8,
    clips: { ...SKELETON, attack: ['Spellcast_Shoot', '1H_Ranged_Shoot'] }
  },
  brute: {
    variants: [{ model: `${CHARACTERS}/skeleton-warrior/model.glb`, weapons: { right: 'Skeleton_Blade', left: 'Skeleton_Shield_Small_A' } }],
    height: 1.85,
    clips: { ...SKELETON, attack: ['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop'] }
  },
  golem: {
    variants: [{ model: `${CHARACTERS}/skeleton-warrior/model.glb`, weapons: { right: 'Skeleton_Axe' }, tint: '#9cc8e0' }],
    height: 1.85,
    clips: { ...SKELETON, walk: ['Walking_A'], attack: ['2H_Melee_Attack_Chop'] }
  },
  rival: {
    variants: [
      { model: `${CHARACTERS}/rogue-hooded/model.glb`, props: ['1H_Crossbow'] },
      { model: `${CHARACTERS}/mage/model.glb`, props: ['2H_Staff'] },
      { model: `${CHARACTERS}/barbarian/model.glb`, props: ['1H_Axe', 'Barbarian_Round_Shield'] }
    ],
    height: 1.8,
    clips: { ...ADVENTURER, attack: ['1H_Ranged_Shoot', 'Spellcast_Shoot'] }
  }
};

/** Props built into the adventurer models: hidden unless a look keeps them. */
const BUILT_IN_PROPS = /^(1H_|2H_)|shield|offhand|spellbook|^mug$|throwable|^knife$|crossbow|wand|staff/i;
const WALK_SPEED = 1.3;
const RUN_SPEED = 3.9;

const _box = new Box3();
const _size = new Vector3();
const _centre = new Vector3();

export class MonsterModelLibrary {
  /**
   * @param {(url: string) => Promise<{ scene, animations }>} loadGLB
   * @param {(name: string) => string|null} [propUrl] a weapon's file in the 3D library, by name
   */
  constructor(loadGLB, propUrl = () => null) {
    this.loadGLB = loadGLB;
    this.propUrl = propUrl;
    /** model url → { scene, animations } */
    this.templates = new Map();
    /** weapon name → scene */
    this.props = new Map();
    this._loading = new Map();
  }

  _load(url) {
    if (!this._loading.has(url)) {
      this._loading.set(
        url,
        this.loadGLB(url).then(
          (gltf) => this.templates.set(url, { scene: gltf.scene, animations: gltf.animations ?? [] }),
          (error) => console.warn(`[MonsterModels] ${url}: ${error?.message ?? error}`)
        )
      );
    }
    return this._loading.get(url);
  }

  _loadProp(name) {
    const key = `prop:${name}`;
    if (!this._loading.has(key)) {
      const url = this.propUrl(name);
      this._loading.set(
        key,
        url
          ? this.loadGLB(url).then(
              (gltf) => this.props.set(name, gltf.scene),
              () => {}
            )
          : Promise.resolve()
      );
    }
    return this._loading.get(key);
  }

  /** Load what these kinds need (in the background is fine: until then they keep their built bodies). */
  preload(kinds = Object.keys(MONSTER_LOOKS)) {
    const jobs = [];
    for (const kind of kinds) {
      for (const v of MONSTER_LOOKS[kind]?.variants ?? []) {
        jobs.push(this._load(v.model));
        for (const name of Object.values(v.weapons ?? {})) jobs.push(this._loadProp(name));
      }
    }
    return Promise.all(jobs);
  }

  has(kind) {
    return (MONSTER_LOOKS[kind]?.variants ?? []).some((v) => this.templates.has(v.model));
  }

  /** A new body for one monster of `kind`, or null (no look, or not loaded). */
  build(kind, rng = Math.random) {
    const look = MONSTER_LOOKS[kind];
    const ready = (look?.variants ?? []).filter((v) => this.templates.has(v.model));
    if (!ready.length) return null;
    const variant = ready[Math.floor(rng() * ready.length) % ready.length];
    return new MonsterBody(this.templates.get(variant.model), look, variant, this.props);
  }
}

/**
 * One monster's model: the cloned rig, its own materials (so a hit flash or a
 * dissolve touches only this body), a mixer, and one action per role.
 */
export class MonsterBody {
  constructor(template, look, variant, props) {
    this.root = cloneSkinned(template.scene);
    this.root.name = 'MonsterModel';
    this.materials = [];
    const keep = new Set(variant.props ?? []);
    const tint = variant.tint ? new Color(variant.tint) : null;
    this.root.traverse((node) => {
      if (!node.isMesh) return;
      if (BUILT_IN_PROPS.test(node.name) && !keep.has(node.name)) {
        node.visible = false;
        return;
      }
      node.castShadow = true;
      node.receiveShadow = false;
      node.frustumCulled = false;
      node.material = this._own(node.material, tint);
    });

    // Weapons from the library, held in the hand slots the rig provides.
    for (const [side, name] of Object.entries(variant.weapons ?? {})) {
      const prop = props.get(name);
      const bone = this.root.getObjectByName(side === 'left' ? 'handslot.l' : 'handslot.r');
      if (!prop || !bone) continue;
      const held = prop.clone(true);
      held.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.material = this._own(node.material, tint);
      });
      bone.add(held);
    }

    // The same height for every model, standing on y = 0, centred on its feet.
    this.root.updateMatrixWorld(true);
    _box.setFromObject(this.root);
    _box.getSize(_size);
    const scale = look.height / Math.max(0.1, _size.y);
    this.root.scale.setScalar(scale);
    this.root.updateMatrixWorld(true);
    _box.setFromObject(this.root);
    _box.getCenter(_centre);
    this.root.position.set(-_centre.x, -_box.min.y, -_centre.z);
    this.height = look.height;

    this.mixer = new AnimationMixer(this.root);
    this.actions = {};
    this.durations = {};
    for (const [role, names] of Object.entries(look.clips)) {
      const clip = names.map((n) => template.animations.find((a) => a.name === n)).find(Boolean);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      const once = role === 'attack' || role === 'hit' || role === 'death' || role === 'spawn';
      action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
      action.clampWhenFinished = once;
      this.actions[role] = action;
      this.durations[role] = clip.duration;
    }
    this.current = null;
    this.role = null;
  }

  _own(material, tint) {
    const list = Array.isArray(material) ? material : [material];
    const owned = list.map((m) => {
      const copy = m.clone();
      if (tint && copy.color) copy.color.multiply(tint);
      if (copy.emissive) copy.userData.baseEmissive = copy.emissive.clone();
      this.materials.push(copy);
      return copy;
    });
    return Array.isArray(material) ? owned : owned[0];
  }

  /**
   * Play a role's clip: looping roles cross-fade, one-shots restart.
   * @param {'idle'|'walk'|'run'|'attack'|'hit'|'death'|'spawn'} role
   * @param {{ timeScale?: number, fade?: number, restart?: boolean }} [options]
   */
  play(role, { timeScale = 1, fade = 0.18, restart = false } = {}) {
    const action = this.actions[role] ?? (role === 'run' ? this.actions.walk : role === 'walk' ? this.actions.run : null) ?? this.actions.idle;
    if (!action) return;
    action.setEffectiveTimeScale(timeScale);
    if (action === this.current && !restart) return;
    action.reset();
    action.setEffectiveWeight(1);
    action.play();
    if (this.current && this.current !== action) this.current.crossFadeTo(action, fade, false);
    this.current = action;
    this.role = role;
  }

  /** How fast a moving role's clip should run for this ground speed. */
  pace(role, speed, scale) {
    const nominal = (role === 'run' ? RUN_SPEED : WALK_SPEED) * (this.height / 1.8) * scale;
    return Math.min(2.2, Math.max(0.4, speed / Math.max(0.1, nominal)));
  }

  /** A hit flash, a freeze or a burn, as an emissive colour and its strength. */
  setGlow(color, strength) {
    for (const m of this.materials) {
      if (!m.emissive) continue;
      m.emissive.copy(m.userData.baseEmissive ?? m.emissive).lerp(color, Math.min(1, strength));
    }
  }

  /** Fading out (dissolve 0 → 1). */
  setFade(amount) {
    const fading = amount > 0.001;
    for (const m of this.materials) {
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = 1 - amount;
      m.depthWrite = !fading;
    }
  }

  reset() {
    this.mixer.stopAllAction();
    this.current = null;
    this.role = null;
    this.setFade(0);
  }

  update(dt) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
  }
}
