import {
  AnimationMixer,
  Box3,
  Color,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3
} from 'three';
import { settings } from '../config/settings.js';
import { LAYER } from '../core/Layers.js';
import { disposeObject } from '../utils/dispose.js';
import { Locomotion } from './Locomotion.js';
import { LocomotionPlayback } from './LocomotionPlayback.js';
import { SecondaryMotion } from './SecondaryMotion.js';
import { platform } from '../platform/index.js';
import { castClipUrl } from '../platform/character/CharacterDefinition.js';
import { locomotionClipUrl } from '../platform/motion/MotionDataset.js';
import { mixamoRig, shortBoneName } from '../platform/rig/MixamoRigAdapter.js';
import { WeaponVisual, collectRigBones } from '../entities/WeaponVisual.js';
import { cloneSkinnedHierarchy } from '../utils/cloneSkinned.js';
import {
  applyCharacterColors,
  captureMaterialBases,
  copyMaterialBases
} from './CharacterAppearance.js';

/**
 * Loads the rigged FBX, normalises it for the scene and drives its animation.
 *
 * The character walks, runs, jumps, sits, turns to face where you are aiming,
 * and throws one of the cast clips when you fire. Locomotion gaits come from
 * authored walk/run clips blended by speed when `motionDataset` clips are
 * present; otherwise `Locomotion` generates a procedural overlay on idle.
 * Cast clips ship as separate Mixamo exports of the *same* skeleton, so only
 * their `AnimationClip` is kept: the mixer binds tracks by bone name.
 *
 * Which clip an ability throws comes from the platform skill definition
 * (`platform.getCastAnim`), editable live, which is why `playCast` takes the
 * name each time rather than caching one.
 */
export class CharacterController {
  /**
   * @param {import('../world/Environment.js').Environment} environment
   * @param {import('../platform/character/CharacterDefinition.js').CharacterDefinition} [definition]
   */
  constructor(environment, definition = null) {
    this.environment = environment;
    this.definition =
      definition ?? platform.getActiveCharacter() ?? platform.characters.get('caster');
    this.rig = platform.getRig(this.definition?.rig ?? 'mixamo');
    this.root = new Group();
    this.root.name = 'Character';

    // Three nested frames, so nothing ever fights over the same field:
    //
    //   root    world position and heading — where the character *is*
    //   motion  the vertical offset locomotion wants (step bob, seated drop)
    //   tilt    the cast lunge (a pitch and a shove, both transient)
    //
    // Collapsing any two of these means the walk bob and the cast recoil both
    // want to write one `position`, and whichever runs second wins.
    this.motion = new Group();
    this.motion.name = 'CharacterMotion';
    this.root.add(this.motion);

    this.tilt = new Group();
    this.tilt.name = 'CharacterTilt';
    this.motion.add(this.tilt);

    /** Walking, running, jumping and sitting. */
    this.locomotion = new Locomotion(this, { rig: this.rig });
    this.locomotion.wandSide = this.definition?.wandSide ?? 'Right';
    this.locomotionPlayback = new LocomotionPlayback(this);
    this.secondaryMotion = new SecondaryMotion();

    this.mixer = null;
    /** The looping breath, always running underneath a cast. */
    this.idle = null;
    /** name → one-shot cast action. */
    this.casts = new Map();
    /** The cast currently being thrown, null while idling. */
    this._cast = null;
    this.height = 1.8;
    this.headPosition = new Vector3(0, 1.5, 0);
    /** The rig's own forward, in model space — the axis a bank rotates about. */
    this.forwardAxis = new Vector3(0, 0, 1);

    /**
     * Yaw of the rig's own forward in model space. Bind poses are not
     * necessarily axis aligned, so `setFacing` subtracts this to make "0 faces
     * +Z" true for the caller regardless of how the FBX was authored.
     */
    this._forwardYaw = 0;
    /** 0..1 lunge envelope, decays on its own after `castLunge()`. */
    this._lunge = 0;
    this._rightAxis = new Vector3(1, 0, 0);
    this.weaponVisual = new WeaponVisual();
  }

  /**
   * @param {import('../loaders/AssetLoader.js').AssetLoader} assets
   * @param {import('../platform/character/CharacterDefinition.js').CharacterDefinition} [definition]
   */
  async reload(assets, definition = null) {
    if (definition) this.definition = definition;
    this.rig = platform.getRig(this.definition?.rig ?? 'mixamo');
    this.locomotion.rig = this.rig;
    this._clearModel();
    await this.load(assets);
    this.locomotion.reset();
    this.resetPlacement();
    return this;
  }

  _clearModel() {
    this.mixer?.removeEventListener('finished', this._onCastFinished);
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.idle = null;
    this.casts.clear();
    this._cast = null;

    if (this.model) {
      this.tilt.remove(this.model);
      disposeObject(this.model);
      this.model = null;
    }

    this.locomotionPlayback = new LocomotionPlayback(this);
    this.weaponVisual.clear();
  }

  /**
   * @param {import('../loaders/AssetLoader.js').AssetLoader} assets
   */
  async load(assets) {
    const def = this.definition;
    const modelCfg = def.model ?? {};
    const format = modelCfg.format ?? 'fbx';

    this.rig = platform.getRig(def.rig ?? 'mixamo');
    this.locomotion.rig = this.rig;

    if (format === 'glb') {
      await this._loadGLB(assets, def, modelCfg);
    } else {
      await this._loadFBX(assets, def, modelCfg);
    }

    return this;
  }

  /**
   * @param {import('../loaders/AssetLoader.js').AssetLoader} assets
   * @param {object} def
   * @param {object} modelCfg
   */
  async _loadFBX(assets, def, modelCfg) {
    const castClips = def.castClips ?? ['cast1', 'cast2', 'cast3'];
    const motionDataset = platform.getMotionDataset(def.motionDataset);
    this.locomotionPlayback.bind(motionDataset);

    const locoClipIds = [];
    if (motionDataset?.clips?.walk && !motionDataset.embedded) {
      locoClipIds.push(['walk', motionDataset.clips.walk]);
    }
    const runId = motionDataset?.clips?.run ?? motionDataset?.clips?.sprint;
    if (runId && !motionDataset?.embedded) locoClipIds.push(['run', runId]);

    const fbxScale = modelCfg.scale ?? 0.01;
    const targetHeight = modelCfg.targetHeight ?? 1.78;

    const [fbx, skin, ...extraFiles] = await Promise.all([
      assets.loadFBX(modelCfg.idle ?? './models/Idle.fbx'),
      modelCfg.texture ? assets.loadTexture(modelCfg.texture) : Promise.resolve(null),
      ...castClips.map((name) => assets.loadFBX(castClipUrl(name))),
      ...locoClipIds.map(([, clipId]) => this._loadLocomotionClipOptional(assets, clipId))
    ]);
    const castFiles = extraFiles.slice(0, castClips.length);
    const locoFiles = extraFiles.slice(castClips.length);
    await assets.settled();

    this._normalizeRoot(fbx, fbxScale, targetHeight);
    this._prepareMaterials(fbx, skin);
    this._captureAndApplyAppearance(fbx, def.id, modelCfg);
    this._finalizeModel(fbx, motionDataset);

    const idleClip = (fbx.animations ?? [])[0];
    if (!idleClip) {
      console.warn('[CharacterController] no idle clip found in the FBX');
    } else {
      this.idle = this.mixer.clipAction(idleClip);
      this.idle.setLoop(LoopRepeat, Infinity);
      this.idle.play();
      this.locomotionPlayback.setIdle(this.idle);
    }

    const bones = new Set();
    fbx.traverse((node) => bones.add(node.name));
    castClips.forEach((name, index) => this._registerCast(name, castFiles[index], bones));
    locoClipIds.forEach(([slot, clipId], index) => {
      this._registerLocomotionClip(slot, clipId, locoFiles[index], bones);
    });

    this._syncLocomotionMode(motionDataset);
    this._bindAnimatedBones();
    this._refreshWeaponBones();
    this.equipWeapon(platform.getActiveWeaponId());
  }

  /**
   * @param {import('../loaders/AssetLoader.js').AssetLoader} assets
   * @param {object} def
   * @param {object} modelCfg
   */
  async _loadGLB(assets, def, modelCfg) {
    const motionDataset = platform.getMotionDataset(def.motionDataset);
    this.locomotionPlayback.bind(motionDataset);

    const gltf = await assets.loadGLB(modelCfg.idle);
    await assets.settled();

    const root = gltf.scene;
    const animations = gltf.animations ?? [];
    const clips = modelCfg.animationClips ?? {};
    const targetHeight = modelCfg.targetHeight ?? 1.78;
    const importScale = modelCfg.scale ?? 1;

    this._normalizeRoot(root, importScale, targetHeight);
    this._prepareMaterials(root, null);
    this._captureAndApplyAppearance(root, def.id, modelCfg);
    this._finalizeModel(root, motionDataset);

    const idleName = clips.idle ?? 'Idle';
    const idleClip =
      animations.find((clip) => clip.name === idleName) ?? animations[0] ?? null;
    if (!idleClip) {
      console.warn(`[CharacterController] no idle clip "${idleName}" in ${modelCfg.idle}`);
    } else {
      this.idle = this.mixer.clipAction(idleClip);
      this.idle.setLoop(LoopRepeat, Infinity);
      this.idle.play();
      this.locomotionPlayback.setIdle(this.idle);
    }

    const bones = new Set();
    root.traverse((node) => bones.add(node.name));

    const castIds = def.castClips ?? ['cast1', 'cast2', 'cast3'];
    const castMap = clips.casts ?? {};
    castIds.forEach((id) => {
      const clipName = castMap[id] ?? id;
      this._registerEmbeddedClip(id, clipName, animations, bones, true);
    });

    if (motionDataset?.embedded) {
      if (motionDataset.clips?.walk) {
        this._registerEmbeddedClip(
          'walk',
          motionDataset.clips.walk,
          animations,
          bones,
          false,
          LoopRepeat
        );
      }
      if (motionDataset.clips?.run) {
        this._registerEmbeddedClip(
          'run',
          motionDataset.clips.run,
          animations,
          bones,
          false,
          LoopRepeat
        );
      }
    }

    this._syncLocomotionMode(motionDataset);
    this._bindAnimatedBones();
    this._refreshWeaponBones();
    this.equipWeapon(platform.getActiveWeaponId());
  }

  /**
   * @param {import('three').Object3D} root
   * @param {number} importScale
   * @param {number} targetHeight
   */
  _normalizeRoot(root, importScale, targetHeight) {
    root.scale.setScalar(importScale);
    root.updateMatrixWorld(true);

    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);

    root.scale.setScalar(importScale * (targetHeight / Math.max(0.001, size.y)));
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    box.getSize(size);
    box.getCenter(center);
    this.height = size.y;
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
  }

  /**
   * @param {import('three').Object3D} root
   * @param {import('../platform/motion/MotionDataset.js').MotionDataset|null} motionDataset
   */
  _finalizeModel(root, motionDataset) {
    this._measureFacing(root);
    this.locomotion.bind(root);
    this.secondaryMotion.bind(root);
    this.tilt.add(root);
    this.model = root;
    this.headPosition.set(0, this.height * 0.86, 0);

    this.mixer = new AnimationMixer(root);
    this.mixer.addEventListener('finished', this._onCastFinished);
  }

  /**
   * @param {import('three').Object3D} root
   * @param {string} characterId
   * @param {object} modelCfg
   */
  _captureAndApplyAppearance(root, characterId, modelCfg) {
    this._materialBases = captureMaterialBases(root);
    const stored = platform.getAppearance(characterId);
    const appearance = {
      ...stored,
      tint: stored.tint ?? modelCfg.tint ?? '#ffffff'
    };
    applyCharacterColors(root, appearance, this._materialBases);
  }

  /**
   * Re-apply stored colours — used from the main-menu appearance panel.
   *
   * @param {import('../platform/appearance/Appearance.js').CharacterAppearance} [appearance]
   */
  applyAppearance(appearance = platform.getAppearance(this.definition?.id)) {
    if (!this.model || !this._materialBases?.size) return;
    applyCharacterColors(this.model, appearance, this._materialBases);
  }

  /** @param {import('three').Object3D} root @param {string} [tint] @deprecated */
  _applyTint(root, tint) {
    if (!tint) return;
    const color = new Color(tint);
    root.traverse((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material?.color) material.color.multiply(color);
      }
    });
  }

  _bindAnimatedBones() {
    const animated = new Set();
    for (const action of this.mixer._actions ?? []) {
      for (const track of action._clip.tracks) animated.add(track.name);
    }
    if (this.idle) for (const track of this.idle._clip.tracks) animated.add(track.name);
    this.locomotion.setAnimatedBones(animated);
  }

  /**
   * @param {string} name
   * @param {string} clipName
   * @param {import('three').AnimationClip[]} animations
   * @param {Set<string>} bones
   * @param {boolean} oneShot
   * @param {number} [loopMode]
   */
  _registerEmbeddedClip(name, clipName, animations, bones, oneShot, loopMode = LoopRepeat) {
    const clip = animations.find((entry) => entry.name === clipName);
    if (!clip) {
      console.warn(`[CharacterController] clip "${clipName}" not found for "${name}"`);
      return;
    }

    if (!clip.tracks.some((track) => bones.has(track.name.split('.')[0]))) {
      console.warn(`[CharacterController] "${clipName}" does not match this skeleton`);
      return;
    }

    clip.name = name;
    const action = this.mixer.clipAction(clip);

    if (oneShot) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      this.casts.set(name, action);
      return;
    }

    if (name === 'walk' || name === 'run') {
      this.locomotionPlayback.register(name, action);
    }
  }

  /**
   * Clone an already-loaded character for the menu preview.
   *
   * Avoids a second trip through `AssetLoader` (which can hang on `settled()`
   * when the boot loader is reused).
   *
   * @param {CharacterController} source loaded game character
   */
  loadFromSource(source) {
    if (!source?.model || !source.mixer) {
      throw new Error('[CharacterController] loadFromSource requires a loaded character');
    }

    const fbx = cloneSkinnedHierarchy(source.model);

    // Start from the bind pose so the clone is not inheriting a half-updated frame
    // from whatever the live character was doing when the preview opened.
    fbx.traverse((node) => {
      if (node.isSkinnedMesh && node.skeleton) node.skeleton.pose();
    });
    fbx.updateWorldMatrix(true, true);

    this.height = source.height;
    this.headPosition.copy(source.headPosition);
    this._forwardYaw = source._forwardYaw;
    this.forwardAxis.copy(source.forwardAxis);
    this._rightAxis.copy(source._rightAxis);

    this.locomotion.bind(fbx);
    this.tilt.add(fbx);
    this.model = fbx;

    if (source._materialBases?.size) {
      this._materialBases = copyMaterialBases(source.model, source._materialBases, fbx);
      this.applyAppearance(platform.getAppearance(this.definition?.id));
    } else {
      this._materialBases = captureMaterialBases(fbx);
    }

    this.mixer = new AnimationMixer(fbx);
    this.mixer.addEventListener('finished', this._onCastFinished);

    if (source.idle) {
      const clip = source.idle._clip;
      this.idle = this.mixer.clipAction(clip);
      this.idle.setLoop(LoopRepeat, Infinity);
      this.idle.play();
    }

    for (const [name, action] of source.casts) {
      const clip = action._clip;
      const castAction = this.mixer.clipAction(clip);
      castAction.setLoop(LoopOnce, 1);
      castAction.clampWhenFinished = true;
      this.casts.set(name, castAction);
    }

    this.locomotionPlayback = new LocomotionPlayback(this);
    this.locomotionPlayback.bind(source.locomotionPlayback?.dataset ?? null);
    if (this.idle) this.locomotionPlayback.setIdle(this.idle);
    for (const slot of ['walk', 'run']) {
      const src = source.locomotionPlayback?.actions?.[slot];
      if (src) {
        this.locomotionPlayback.register(slot, this.mixer.clipAction(src._clip));
      }
    }
    this._syncLocomotionMode(source.locomotionPlayback?.dataset ?? null);

    this.secondaryMotion = new SecondaryMotion();
    this.secondaryMotion.bind(fbx);

    const animated = new Set();
    for (const action of this.mixer._actions ?? []) {
      for (const track of action._clip.tracks) animated.add(track.name);
    }
    this.locomotion.setAnimatedBones(animated);

    this._refreshWeaponBones();
    this.equipWeapon(platform.getActiveWeaponId());

    return this;
  }

  /** Map every bone in the loaded rig — used for weapon attachment. */
  _refreshWeaponBones() {
    this._weaponBones = collectRigBones(this.model);
  }

  /**
   * Attach or remove the procedural weapon mesh and apply motion overrides.
   *
   * @param {string} weaponId
   */
  equipWeapon(weaponId) {
    const weapon = platform.weapons.get(weaponId) ?? platform.weapons.get('unarmed');
    if (!weapon) return this;

    if (!this._weaponBones?.size) this._refreshWeaponBones();

    platform.setWeapon(weapon.id);
    this.weaponVisual.equip(weapon, this._weaponBones, this.rig, this.model);

    if (weapon.attachPoint === 'handL') this.locomotion.wandSide = 'Left';
    else if (weapon.attachPoint === 'handR') this.locomotion.wandSide = 'Right';
    else this.locomotion.wandSide = this.definition?.wandSide ?? 'Right';

    return this;
  }

  /**
   * Keep one cast file's clip and release the duplicate rig that came with it.
   *
   * @param {string} name                 the id used by `settings[element].castAnim`
   * @param {import('three').Group} file  the freshly loaded FBX
   * @param {Set<string>} bones           every node name in *this* rig
   */
  _registerCast(name, file, bones) {
    const clip = (file?.animations ?? [])[0];
    if (!clip) {
      console.warn(`[CharacterController] "${name}.fbx" carries no animation`);
      return;
    }

    // A clip authored against another export of this rig binds by bone name, so
    // a mismatch shows up as a track that resolves to nothing rather than as an
    // error — say so here instead of letting the cast silently do nothing.
    if (!clip.tracks.some((track) => bones.has(track.name.split('.')[0]))) {
      console.warn(`[CharacterController] "${name}.fbx" does not match this skeleton`);
      return;
    }

    clip.name = name;
    const action = this.mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    // Hold the last frame rather than snapping home; the fade back to the idle
    // is what actually ends the cast.
    action.clampWhenFinished = true;
    this.casts.set(name, action);

    disposeObject(file);
  }

  /**
   * @param {import('../loaders/AssetLoader.js').AssetLoader} assets
   * @param {string} clipId
   */
  async _loadLocomotionClipOptional(assets, clipId) {
    try {
      return await assets.loadFBX(locomotionClipUrl(clipId));
    } catch {
      console.warn(
        `[CharacterController] locomotion clip "${clipId}.fbx" missing — procedural gait fallback`
      );
      return null;
    }
  }

  /**
   * @param {'walk'|'run'} slot
   * @param {string} clipId
   * @param {import('three').Group|null} file
   * @param {Set<string>} bones
   */
  _registerLocomotionClip(slot, clipId, file, bones) {
    if (!file) return;

    const clip = (file?.animations ?? [])[0];
    if (!clip) {
      console.warn(`[CharacterController] "${clipId}.fbx" carries no animation`);
      disposeObject(file);
      return;
    }

    if (!clip.tracks.some((track) => bones.has(track.name.split('.')[0]))) {
      console.warn(`[CharacterController] "${clipId}.fbx" does not match this skeleton`);
      disposeObject(file);
      return;
    }

    clip.name = clipId;
    const action = this.mixer.clipAction(clip);
    this.locomotionPlayback.register(slot, action);
    disposeObject(file);
  }

  /** @param {import('../platform/motion/MotionDataset.js').MotionDataset|null} dataset */
  _syncLocomotionMode(dataset) {
    const hasWalk = !!this.locomotionPlayback.actions.walk;
    const hasRun = !!this.locomotionPlayback.actions.run;
    const hasClips = hasWalk && hasRun;
    const allowFallback = dataset?.proceduralFallback !== false;
    this.locomotion.useProceduralGait = !hasClips && allowFallback;

    if (hasClips) {
      this.locomotionPlayback.actions.walk?.play();
      this.locomotionPlayback.actions.run?.play();
      return;
    }

    if (dataset?.embedded && allowFallback) {
      console.warn(
        '[CharacterController] embedded walk/run clips missing — procedural gait fallback'
      );
    }
  }

  /**
   * Convert imported materials to PBR and hook them into the shadow system.
   *
   * @param {import('three').Object3D} root
   * @param {import('three').Texture} skin the character's colour map
   */
  _prepareMaterials(root, skin) {
    const converted = new Map();

    if (skin) skin.colorSpace = SRGBColorSpace;

    root.traverse((node) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;

      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
      node.layers.set(LAYER.WORLD);
      node.layers.enable(LAYER.CONTACT); // captured by the contact shadow pass

      const source = Array.isArray(node.material) ? node.material : [node.material];
      const result = source.map((material) => {
        if (!material) return material;
        if (converted.has(material)) return converted.get(material);

        // FBX gives us Phong/Lambert; move to Standard so IBL and CSM apply.
        // This export ships no texture of its own, so the skin loaded alongside
        // it is the colour map — but a file that *does* carry one embedded still
        // wins, since that map is authored against its own UVs. Exporters
        // disagree on which slot the normal map lands in, so both are passed
        // through and the empty one costs nothing.
        //
        // The tint is dropped with the map: an untextured FBX defaults to a flat
        // grey that would otherwise darken every texel of the skin.
        const standard = new MeshStandardMaterial({
          name: material.name,
          color: material.map ? (material.color ?? 0xffffff) : 0xffffff,
          map: material.map ?? skin ?? null,
          normalMap: material.normalMap ?? null,
          bumpMap: material.normalMap ? null : (material.bumpMap ?? null),
          roughness: 0.85,
          metalness: 0,
          transparent: material.transparent ?? false,
          opacity: material.opacity ?? 1,
          side: material.side
        });

        // Worth the samples: the character is the one thing on screen the camera
        // gets close to, and its texels sit at a grazing angle across the torso.
        for (const map of [standard.map, standard.normalMap, standard.bumpMap]) {
          if (map) map.anisotropy = 4;
        }

        this.environment.registerShadowCaster(standard);
        material.dispose(); // textures are shared with the new material, not owned
        converted.set(material, standard);
        return standard;
      });

      node.material = Array.isArray(node.material) ? result : result[0];
    });
  }

  /**
   * Derive the rig's own forward from the bind pose.
   *
   * The heel → toe vector is the most reliable indicator of facing on a bind
   * pose that may not be axis aligned, and everything that turns the body reads
   * the yaw it produces.
   */
  _measureFacing(root) {
    root.updateMatrixWorld(true);

    let foot = null;
    let toe = null;
    root.traverse((node) => {
      if (!node.isBone) return;
      // Exporters disagree on the namespace: "mixamorig:LeftFoot", "mixamorigLeftFoot".
      const short = shortBoneName(node.name);
      if (short === 'LeftFoot' && !foot) foot = node;
      else if (short === 'LeftToeBase' && !toe) toe = node;
    });

    if (foot && toe) {
      const heel = foot.getWorldPosition(new Vector3());
      const tip = toe.getWorldPosition(new Vector3()).sub(heel).setY(0);
      if (tip.lengthSq() > 1e-6) this.forwardAxis.copy(tip).normalize();
    }

    this._forwardYaw = Math.atan2(this.forwardAxis.x, this.forwardAxis.z);
    this._rightAxis.set(0, 1, 0).cross(this.forwardAxis).normalize();
  }

  /* ------------------------------------------------------------------ */
  /* cast clips                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Throw one cast clip over the idle, once.
   *
   * @param {string} [name] an id from `CAST_ANIMATIONS`; falls back to the first
   *   one so an ability configured with a clip that failed to load still moves.
   */
  playCast(name) {
    const castClips = this.definition?.castClips ?? ['cast1', 'cast2', 'cast3'];
    const next = this.casts.get(name) ?? this.casts.get(castClips[0]);
    if (!next || !this.idle) return;

    const previous = this._cast;
    this._cast = next;

    next.reset();
    next.setEffectiveTimeScale(1);
    next.play();

    // Fade from whatever is actually on screen — the idle on a first cast, the
    // clip still finishing on a re-cast — so the body never drops to the bind
    // pose for a frame in between two throws. Re-throwing the *same* clip only
    // restarts it: `reset()` has already left it at full weight.
    const from = previous ?? this.locomotionPlayback.getBaseAction() ?? this.idle;
    if (from !== next) next.crossFadeFrom(from, settings.character.castBlendIn, false);
  }

  /** True while a cast clip is playing. */
  get isCasting() {
    return this._cast !== null;
  }

  _onCastFinished = (event) => {
    // Anything else finishing is an older clip that a re-cast already faded out.
    if (event.action !== this._cast) return;
    this._cast = null;

    if (this.locomotionPlayback.hasClips) {
      this.locomotionPlayback.resumeAfterCast(
        event.action,
        settings.character.castBlendOut
      );
      return;
    }

    // The fade in disabled the idle once its weight hit zero; wake it back up
    // before asking it to come in again.
    this.idle.enabled = true;
    this.idle.setEffectiveTimeScale(1);
    this.idle.crossFadeFrom(event.action, settings.character.castBlendOut, false);
  };

  /* ------------------------------------------------------------------ */
  /* placement — driven by walk mode, inert otherwise                    */
  /* ------------------------------------------------------------------ */

  /** Heading, radians about world +Y. 0 faces +Z, whichever way the rig binds. */
  setFacing(yaw) {
    this.root.rotation.y = yaw - this._forwardYaw;
  }

  get facing() {
    return this.root.rotation.y + this._forwardYaw;
  }

  /**
   * Turn toward `yaw` over time rather than snapping.
   * @param {number} rate fraction of the angle gap left after one second
   */
  turnToward(yaw, rate, dt) {
    const current = this.facing;
    // Shortest way round, so aiming across the -Z seam does not spin the body.
    const delta = MathUtils.euclideanModulo(yaw - current + Math.PI, Math.PI * 2) - Math.PI;
    this.setFacing(current + delta * (1 - Math.pow(MathUtils.clamp(rate, 1e-6, 1), dt)));
  }

  /**
   * Punch the body forward, then let it settle.
   *
   * An accent laid over the cast clip rather than a substitute for it: a pitch
   * about the body's own right axis plus a shove back along its forward axis,
   * both riding on one decaying envelope. Applied to `tilt` rather than `root`
   * so it composes with the heading instead of fighting it, and turned off by
   * dropping `castLean` and `castRecoil` to zero when the clip says it all.
   */
  castLunge() {
    this._lunge = 1;
  }

  _applyLunge(dt) {
    const c = settings.character;
    if (this._lunge > 0) {
      this._lunge = Math.max(0, this._lunge - c.castSettle * dt);
    }
    // A short overshoot at the front of the envelope reads as a snap rather than
    // a slow bow.
    const envelope = this._lunge * this._lunge * (1 + 0.35 * Math.sin(this._lunge * Math.PI));
    this.tilt.quaternion.setFromAxisAngle(this._rightAxis, envelope * c.castLean);
    this.tilt.position.copy(this.forwardAxis).multiplyScalar(-envelope * c.castRecoil);
  }

  /** Put the character back on the floor, upright and facing where it was. */
  resetPlacement() {
    this.root.position.y = 0;
    this._lunge = 0;
    this.tilt.quaternion.identity();
    this.tilt.position.set(0, 0, 0);
    this.motion.position.set(0, 0, 0);
  }

  /** Drop everything and stand at the origin again. */
  resetToOrigin() {
    this.locomotion.reset();
    this.resetPlacement();
  }

  update(dt) {
    // Move first: the gait is driven by distance travelled, so the pose below
    // has to be posing *this* frame's displacement, not last frame's.
    this.locomotion.step(dt);

    // Driven by the *simulation* delta, and re-applied every frame even at
    // dt = 0: pausing mid-cast holds the lunge, and `castLean` stays a live
    // slider against that frozen pose.
    this._applyLunge(dt);

    if (!this.mixer) return;

    this.mixer.timeScale = settings.global.animationSpeed;
    this.locomotionPlayback.update(this.locomotion, dt);
    this.mixer.update(dt);

    // Procedural gait only when walk/run clips are unavailable.
    this.locomotion.applyPose();
    this.secondaryMotion.update(dt, {
      velocity: this.locomotion.velocity,
      facing: this.facing
    });
  }

  get position() {
    return this.root.position;
  }

  dispose() {
    this.mixer?.removeEventListener('finished', this._onCastFinished);
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.idle = null;
    this.casts.clear();
    this._cast = null;
    this.locomotionPlayback = null;
    this.secondaryMotion.dispose();
    this.weaponVisual.clear();
    disposeObject(this.root);
  }
}
