import { Vector3, MathUtils } from 'three';

import { Renderer } from './Renderer.js';
import { Time } from './Time.js';
import { CameraRig } from './CameraRig.js';
import { frame } from './FrameUniforms.js';

import { Environment } from '../world/Environment.js';
import { Ground } from '../world/Ground.js';
import { DustMotes } from '../world/DustMotes.js';
import { ContactShadows } from '../world/ContactShadows.js';
import { Ruins } from '../world/Ruins.js';
import { ComposedWorld } from '../world/ComposedWorld.js';
import { Catalog } from '../library/Catalog.js';
import { ModelLibrary } from '../library/ModelLibrary.js';
import { MapPlanner } from '../ai/MapPlanner.js';
import { LevelEditor } from '../editor/LevelEditor.js';
import { LevelStore, progress } from '../levels/LevelStore.js';
import { describeGoal, normalizeLevel } from '../levels/Level.js';
import { StoryPanel } from '../ui/StoryPanel.js';
import { WorldLabels } from '../ui/WorldLabels.js';
import { PortalSystem } from '../world/Portals.js';
import { Profile } from '../items/Profile.js';
import { LootSystem } from '../items/Loot.js';
import { POTIONS, makeBook, makeGold, makePotion, makeWeapon, merchantStock, rollLoot } from '../items/Items.js';
import { NpcSystem, NPC_ROLES } from '../npc/Npcs.js';
import { NpcBrain } from '../npc/NpcBrain.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { InventoryPanel } from '../ui/InventoryPanel.js';

import { AssetLoader } from '../loaders/AssetLoader.js';
import { CharacterController } from '../animation/CharacterController.js';

import { InputManager } from '../input/InputManager.js';
import { AimController } from '../input/AimController.js';

import { ParticleEngine } from '../particles/ParticleEngine.js';
import { LightPool } from '../effects/LightPool.js';
import { DecalSystem } from '../effects/GroundDecals.js';
import { FissureSystem } from '../effects/GroundFissures.js';
import { BurstSystem } from '../effects/BurstSphere.js';
import { CameraShake } from '../effects/CameraShake.js';
import { ScreenFlash } from '../effects/ScreenFlash.js';

import { AbilityManager } from '../abilities/AbilityManager.js';
import { PostProcessing } from '../postprocessing/PostProcessing.js';

import { MonsterManager } from '../entities/MonsterManager.js';
import { Combat } from '../game/Combat.js';
import { GameDirector, RunState } from '../game/GameDirector.js';
import { DamageNumbers } from '../game/DamageNumbers.js';

import { HUD, LoadingScreen } from '../ui/HUD.js';
import { GameHUD } from '../ui/GameHUD.js';
import { WeaponPanel } from '../ui/WeaponPanel.js';
import { MainMenu } from '../ui/MainMenu.js';
import { GameMenuButton } from '../ui/GameMenuButton.js';
import { Editor } from '../ui/Editor.js';

import { getColor } from '../utils/color.js';
import { DecalType } from '../effects/GroundDecals.js';
import { settings, ELEMENTS } from '../config/settings.js';
import { platform, classBonuses, LOOKS } from '../platform/index.js';
import { lookModel, saveLook } from '../platform/character/classes.js';

const HDR_URL = './hdri/spruit_sunrise.hdr';

/** Hand the page back for one frame, so the loading veil can repaint. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const _castPoint = new Vector3();
const _castDirection = new Vector3();

/**
 * Application root: owns every subsystem and the frame loop.
 *
 * The wiring is deliberately one-directional — App builds the systems, hands the
 * ability manager a context object of the shared services, and then does nothing
 * but order the per-frame updates. No subsystem reaches back into App.
 *
 * There are two ways to fire an ability, and both funnel into `_fire`:
 *
 *   - **The mouse.** Right-click arms and confirms through `AimController`.
 *   - **The keyboard.** Number keys select abilities; right-click casts.
 * results from one event — `AbilityManager.cast()` makes the picture and
 * `Combat.open()` makes the consequences. Neither knows about the other, and no
 * ability class has any idea that monsters exist.
 */
export class App {
  constructor(canvas) {
    platform.bootstrap();

    this.canvas = canvas;
    this.time = new Time();
    this.elapsed = 0;
    this.paused = false;
    this._raf = 0;
    /** @type {'menu'|'playing'} */
    this.phase = 'menu';

    /**
     * Seconds left before each ability can be armed again. Per element, so
     * spending one slot never locks the other out.
     */
    this.cooldowns = new Map(ELEMENTS.map((element) => [element, 0]));
    /** Seconds until the next direct attack can fire. */
    this._attackCooldown = 0;

    /* ---- core ---- */
    this.renderer = new Renderer(canvas);
    this.rig = new CameraRig(canvas);
    this.camera = this.rig.camera;

    this.environment = new Environment(this.renderer, this.camera);
    this.scene = this.environment.scene;

    /* ---- shared VFX services ----
       Built before the world, because the ruins want an ember emitter. */
    this.particles = new ParticleEngine(this.scene);
    this.lights = new LightPool(this.scene);
    this.decals = new DecalSystem(this.scene);
    this.fissures = new FissureSystem(this.scene);
    this.bursts = new BurstSystem(this.scene);
    this.shake = new CameraShake(this.rig);
    this.flash = new ScreenFlash();

    /* ---- world ---- */
    this.ground = new Ground(this.environment);
    this.dust = new DustMotes();
    this.contactShadows = new ContactShadows(this.renderer, { size: 2.6, height: 2.4, blur: 2.0 });
    this.ruins = new Ruins(this.environment, { particles: this.particles });
    /* The downloaded asset library (npm run library:fetch) and the AI-built map
       made from it. `world` is whichever of the keep and the composed map the
       fight is standing in; everything that collides or breaks asks it. */
    this.catalog = new Catalog();
    this.modelLibrary = new ModelLibrary(this.catalog);
    this.composed = new ComposedWorld(this.environment, { catalog: this.catalog, library: this.modelLibrary });
    this.mapPlanner = new MapPlanner(this.catalog);
    this.world = this.ruins;
    /* Levels: files in public/levels/, the campaign that plays them, and the
       editor that makes them (created on first use). */
    this.levels = new LevelStore();
    this.levelEditor = null;
    /** The level being played, with its goal progress; null in free play. */
    this.run = null;

    this.scene.add(
      this.ground.mesh,
      this.dust.points,
      this.contactShadows.group,
      this.ruins.group,
      this.composed.group
    );
    this.dust.setPixelRatio(this.renderer.gl.getPixelRatio());

    this.abilities = new AbilityManager({
      scene: this.scene,
      camera: this.camera,
      environment: this.environment,
      particles: this.particles,
      lights: this.lights,
      decals: this.decals,
      fissures: this.fissures,
      bursts: this.bursts,
      shake: this.shake,
      flash: this.flash
    });

    /* ---- character ---- */
    this.character = new CharacterController(this.environment);
    this.scene.add(this.character.root);

    /* ---- the fight ---- */
    this.monsters = new MonsterManager({
      scene: this.scene,
      camera: this.camera,
      particles: this.particles,
      decals: this.decals,
      bursts: this.bursts,
      fissures: this.fissures,
      shake: this.shake,
      flash: this.flash
    });
    this.monsters.obstacles = this.ruins.obstacles;

    this.combat = new Combat({
      damageMultiplier: (element) => this.profile.damageMultiplier(element),
      critBonus: () => this.profile.stats.crit / 100,
      monsters: this.monsters,
      ruins: this.ruins,
      particles: this.particles,
      decals: this.decals,
      bursts: this.bursts,
      fissures: this.fissures,
      shake: this.shake,
      flash: this.flash
    });

    /* ---- input & targeting ---- */
    this.input = new InputManager(canvas);
    this.aim = new AimController(this.camera);
    this.scene.add(this.aim.object3D);

    /* ---- post ---- */
    this.post = new PostProcessing(this.renderer, this.scene, this.camera);

    /* ---- UI ---- */
    this.loading = new LoadingScreen();
    const hudRoot = document.getElementById('hud');
    this.hud = new HUD(hudRoot);
    this.gameHud = new GameHUD(hudRoot);
    this.numbers = new DamageNumbers(hudRoot);
    this.weaponPanel = new WeaponPanel(hudRoot, (weaponId) => this.selectWeapon(weaponId));
    this.mainMenu = new MainMenu(hudRoot, {
      onStart: () => this.enterGame(),
      onCharacterChange: (characterId) =>
        this.selectCharacter(characterId, { reloadMesh: true }),
      getCharacter: () => this.character,
      getEnvironment: () => this.environment,
      onGenerateWorld: (description) => this.generateWorld(description),
      onClassicWorld: () => this.useClassicWorld(),
      getLibrary: () => this.catalog,
      getLevels: () => this.levels,
      onPlayLevel: (id) => this.playCampaignLevel(id),
      onOpenEditor: (options) => this.openEditor(options),
      onLookChange: (characterId, lookId) => this.setLook(characterId, lookId)
    });
    this.story = new StoryPanel(hudRoot);
    this.goalPill = document.createElement('div');
    this.goalPill.className = 'level-goal';
    this.goalPill.hidden = true;
    hudRoot.appendChild(this.goalPill);

    /* ---- items, portals, NPCs ---- */
    this.labels = new WorldLabels(hudRoot);
    this.profile = new Profile();
    this.profile.on('stats', () => this._applyProfileStats());
    this.loot = new LootSystem(this.scene, this.labels);
    this.loot.onPickup = (item) => {
      const result = this.profile.pickUp(item);
      this.hud.showToast(result.message);
      return result;
    };
    this.portals = new PortalSystem(this.scene, this.labels);
    this.portals.onEnter = (portal) => this._enterPortal(portal);
    this.npcs = new NpcSystem(this.scene, this.labels, this.catalog);
    this.npcBrain = new NpcBrain();
    this.dialogue = new DialoguePanel(hudRoot);
    this.inventory = new InventoryPanel(hudRoot, this.profile, {
      onEquip: (item) => this._equipItem(item),
      onRead: (item) => this.hud.showToast(this.profile.read(item.uid).message),
      onDrop: (item) => {
        const removed = this.profile.remove(item.uid);
        if (removed && this.phase === 'playing') this.loot.drop([removed], this.character.position, (x, z) => this.world.heightAt?.(x, z) ?? 0);
      }
    });
    this.talkPrompt = document.createElement('div');
    this.talkPrompt.className = 'talk-prompt';
    this.talkPrompt.hidden = true;
    hudRoot.appendChild(this.talkPrompt);
    this.gameMenu = new GameMenuButton(hudRoot, {
      onPause: () => this.togglePause(),
      onExit: () => this.exitToMenu()
    });
    this.editor = new Editor({
      onClear: () => this.clearEffects(),
      onToast: (message) => this.hud.showToast(message)
    });

    this.director = new GameDirector({
      monsters: this.monsters,
      combat: this.combat,
      ruins: this.ruins,
      character: this.character,
      shake: this.shake,
      flash: this.flash,
      decals: this.decals,
      particles: this.particles,
      numbers: this.numbers
    });

    this._bindEvents();
    this.selectAbility(ELEMENTS[0], { silent: true });

    this._focusPoint = new Vector3();
    /** Reused each frame by `readMovement`; movement is polled, not evented. */
    this._move = { x: 0, z: 0, sprint: false, walk: false, active: false };
    /** Same, for the arrow keys that swing the camera. */
    this._look = { yaw: 0, pitch: 0, active: false };
  }

  /** The ability currently in the slot. */
  get element() {
    return this.abilities.selected;
  }

  /* ------------------------------------------------------------------ */

  _bindEvents() {
    this.renderer.onResize((width, height, pixelRatio) => {
      this.rig.resize(width, height);
      this.post.setSize(width, height, pixelRatio);
      this.dust.setPixelRatio(pixelRatio);
    });

    this.input.on('pointer:move', (pointer) => this.aim.point(pointer));
    this.input.on('pointer:attack', (pointer) => this._confirmAttack(pointer));
    this.input.on('pointer:cast', (pointer) => this._confirmCast(pointer));
    this.input.on('action', (action, slot) => this._handleAction(action, slot));

    this.aim.on('cast', (origin, direction, distance) =>
      this._fire(this.element, origin, direction, distance, this.aim.facing)
    );
    this.aim.on('reject', () => this.hud.showToast('Too close — aim further out'));

    this.hud.onAbility = (element) => this.armAbility(element);

    this._bindRun();
    this._bindLocomotion();
  }

  /**
   * The two moments a footstep has to be felt: each footfall, and a landing.
   *
   * Both are emitted by `Locomotion` on the *event* rather than on a timer, so
   * the dust is under the foot that made it however fast the body is going.
   */
  _bindLocomotion() {
    const locomotion = this.character.locomotion;
    locomotion.obstacles = this.ruins.obstacles;
    locomotion.props = this.ruins.props;
    locomotion.bounds = settings.ruins.wallRadius - 1.2;

    locomotion.onFootstep = (position, speed) => {
      this.particles
        .get('step-dust', { capacity: 500, additive: false, lit: true })
        .emit(speed > settings.character.moveSpeed ? 5 : 3, {
          position: _castPoint.set(position.x, 0.05, position.z),
          radius: 0.18,
          direction: { x: 0, y: 1, z: 0 },
          speed: 0.45,
          speedVariance: 0.7,
          spread: 0.7,
          size: 0.13,
          sizeVariance: 0.5,
          life: 0.55,
          lifeVariance: 0.4,
          tint: getColor('#6a6558'),
          time: this.elapsed
        });
    };

    locomotion.onLand = (position, impact) => {
      // Scaled by how hard the landing was: stepping off a kerb should not
      // shake the camera, and a jump from the apex should.
      const force = MathUtils.clamp(impact / 8, 0, 1);
      if (force < 0.2) return;
      this.shake.add(0.22 * force * settings.global.cameraShake, 3.0, 26);
      this.decals.spawn(DecalType.DUSTRING, position, {
        radius: 0.9 + force * 0.6,
        life: 0.55,
        colorA: getColor('#8b8477'),
        colorB: getColor('#6a6558'),
        intensity: 0.7,
        width: 0.3,
        growth: 1.1
      });
      this.particles.get('step-dust', { capacity: 500, additive: false, lit: true }).emit(
        Math.round(6 + force * 12),
        {
          position: _castPoint.set(position.x, 0.06, position.z),
          radius: 0.32,
          speed: 1.6 * force,
          speedVariance: 0.8,
          spread: 1,
          size: 0.16,
          life: 0.7,
          tint: getColor('#6a6558'),
          time: this.elapsed
        }
      );
    };
  }

  /** The run's events → the run's readout. Nothing else listens to these. */
  _bindRun() {
    this.director.on('kill', (monster) => {
      this._dropLoot(monster);
      if (this.npcs.onKill(monster.kind)) this._updateGoalPill();
      this._onRunEvent('kill', monster);
    });
    this.director.on('waveCleared', (wave) => this._onRunEvent('waveCleared', wave));
    this.director.on('wave', (wave) => this._onRunEvent('wave', wave));
    this.director.on('wave', (wave, count) => {
      this.gameHud.setWave(wave);
      this.gameHud.showBanner(`Wave ${wave}`, `${count} incoming`);
    });

    this.director.on('breather', (next, seconds) => {
      this.gameHud.showBanner('Clear', `Wave ${next} in ${Math.round(seconds)}s`, 2.0);
    });

    this.director.on('score', (total) => this.gameHud.setScore(total));
    this.director.on('combo', (count) => this.gameHud.setCombo(count));

    this.director.on('playerDamage', (amount) => {
      this.gameHud.hurt(amount / Math.max(1, this.director.maxHealth));
    });

    this.director.on('downed', () => {
      this.gameHud.setDowned(true);
    });

    this.director.on('revived', () => {
      this.gameHud.setDowned(false);
      this.gameHud.showBanner('Back up', 'Nearby hostiles thrown clear', 1.6);
    });

    this.director.on('boss', (monster) => {
      this.gameHud.showBanner(monster.label, 'is here', 3.2);
      this.shake.add(0.8 * settings.global.cameraShake, 1.6, 10);
    });
  }

  _handleAction(action, slot) {
    // The editor reads the keyboard itself; nothing here may fire while it is open.
    if (this.phase === 'editor') return;
    if (this.phase === 'menu' && action !== 'toggleWeapons' && action !== 'cancel') return;

    switch (action) {
      case 'ability': {
        const element = ELEMENTS[slot] ?? this.element;
        // Pressing the *same* key again puts an armed cast away, as it does in a
        // MOBA; pressing a different one swaps the slot without disarming.
        if (this.aim.isArmed && element === this.element) this.aim.cancel();
        else this.armAbility(element);
        break;
      }
      case 'cancel':
        if (this.weaponPanel.isVisible) this.weaponPanel.hide();
        else this.aim.cancel();
        break;
      case 'jump':
        this.character.locomotion.jump();
        break;
      case 'sit': {
        const locomotion = this.character.locomotion;
        locomotion.toggleSit();
        this.hud.showToast(
          locomotion.sitting ? 'Meditating — recovering faster' : 'On your feet'
        );
        break;
      }
      case 'nextWave':
        this.director.nextWave();
        break;
      case 'summon':
        this.monsters.spawn(this.monsters.randomKind());
        break;
      case 'toggleRunHud':
        this._runHudVisible = !(this._runHudVisible ?? true);
        this.gameHud.setVisible(this._runHudVisible);
        break;
      case 'interact':
        if (this.phase === 'playing' && this.npcs.nearest && !this.dialogue.isOpen) this._talkTo(this.npcs.nearest);
        return;
      case 'potionHealth':
        if (this.phase === 'playing') this._drink('health');
        return;
      case 'potionFocus':
        if (this.phase === 'playing') this._drink('focus');
        return;
      case 'toggleInventory':
        if (this.phase === 'playing') this.inventory.toggle();
        return;
      case 'toggleWeapons':
        this.weaponPanel.toggle();
        break;
      case 'toggleHelp':
        this.hud.toggleHelp();
        break;
      case 'toggleEditor':
        this.editor.toggle();
        break;
      case 'clear':
        this.clearEffects();
        this.hud.showToast('Effects cleared');
        break;
      case 'togglePause':
        this.togglePause();
        break;
      default:
        break;
    }
  }

  /** Left click — direct attack toward the cursor. */
  _confirmAttack(pointer) {
    if (this.phase !== 'playing' || this.paused) return;
    if (this.weaponPanel.isVisible) return;
    if (this._attackCooldown > 0) {
      this.hud.showToast('Not ready');
      return;
    }

    const attack = platform.pickRandomAttack();
    if (!attack) return;

    this.aim.point(pointer);
    this.aim.cancel();

    const yaw = this.aim.facing;
    _castDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
    this.character.setFacing(yaw);
    this.character.playCast(attack.castAnim ?? 'cast2');
    this.character.castLunge();

    _castPoint.copy(this.character.position).setY(0);
    const hits = this.combat.melee(_castPoint, _castDirection, attack);
    this._attackCooldown = attack.cooldown ?? 0.42;

    if (hits > 0) {
      this.hud.showToast(attack.label);
    }
  }

  /** Right click on the arena — arm (if needed) and fire the selected ability. */
  _confirmCast(pointer) {
    if (this.phase !== 'playing' || this.paused) return;
    if (this.weaponPanel.isVisible) return;

    this.aim.point(pointer);
    if (!this.aim.isArmed) {
      if ((this.cooldowns.get(this.element) ?? 0) > 0) {
        this.hud.showToast('Not ready');
        return;
      }
      this.aim.arm();
    }
    this.aim.confirm();
  }

  togglePause() {
    if (this.phase !== 'playing') return;
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
    this.gameMenu.setPaused(this.paused);
    this.hud.showToast(this.paused ? 'Paused' : 'Resumed');
  }

  /** Apply main-menu selections and start the run. */
  async enterGame({ characterId: forced = null, keepRun = false } = {}) {
    const { characterId, weaponId } = this.mainMenu.getSelection();
    await this.selectCharacter(forced ?? characterId, { reloadMesh: true });
    this.selectWeapon(weaponId);
    // Free play from the menu is not a level.
    if (!keepRun) this._endRun();

    this.clearEffects();
    this.character.locomotion.reset();
    this.character.setFacing(0);
    this.paused = false;
    this.hud.setPaused(false);
    this.gameMenu.setPaused(false);

    if (settings.combat.enabled && settings.waves.enabled) this.director.start();
    // A weapon from the bag beats the loadout pick; gear sets health and speed.
    if (this.profile.equipped) this.selectWeapon(this.profile.equipped.weapon);
    this._applyProfileStats({ refill: true });
    this.inventory.setBeltVisible(true);

    this.phase = 'playing';
    this.input.enabled = true;
    this.mainMenu.hide();
    this.hud.setGameplayVisible(true);
    this.gameHud.setVisible(true);
    this.gameMenu.show();
    document.body.classList.remove('is-menu');
    this.hud.showToast('Fight!');
  }

  /** Leave the arena and return to loadout selection (or to the editor, after a play test). */
  exitToMenu() {
    const backToEditor = this.run?.fromEditor;
    this._endRun();
    this.inventory.setBeltVisible(false);
    this.inventory.toggle(false);
    this.aim.cancel();
    this.weaponPanel.hide();
    this.clearEffects();
    this.director.stop();
    this.character.locomotion.reset();
    this.character.setFacing(0);
    this.paused = false;
    this.hud.setPaused(false);
    this.gameMenu.setPaused(false);
    this.input.releaseAll();

    this.phase = 'menu';
    this.input.enabled = false;
    this.hud.setGameplayVisible(false);
    this.gameHud.setVisible(false);
    this.gameMenu.hide();
    if (backToEditor) {
      this.levelEditor.resume();
      return;
    }
    document.body.classList.add('is-menu');
    this.mainMenu.show();
  }

  showMainMenu() {
    this.inventory.setBeltVisible(false);
    this.inventory.toggle(false);
    this.phase = 'menu';
    this.input.enabled = false;
    this.hud.setGameplayVisible(false);
    this.gameHud.setVisible(false);
    this.gameMenu.hide();
    document.body.classList.add('is-menu');
    this.mainMenu.show();
  }

  /**
   * Put an ability in the slot. The aim indicator and the HUD both follow,
   * because `range` and `minRange` are the ability's, not the app's.
   */
  selectAbility(element, options = {}) {
    if (!ELEMENTS.includes(element)) return;
    this.abilities.select(element);
    this.aim.setElement(element);
    this.hud.setElement(element, options);
  }

  /**
   * Swap the active motion profile and reload the mesh when the class changes.
   *
   * @param {string} characterId registered in `platform.characters`
   * @param {{ reloadMesh?: boolean }} [options]
   */
  async selectCharacter(characterId, { reloadMesh = false } = {}) {
    const character = platform.characters.get(characterId);
    if (!character) return;

    platform.setCharacter(characterId);
    this.profile?.setClass(classBonuses(characterId));

    if (reloadMesh && this._assets && this.character) {
      await this.character.reload(this._assets, character);
      this.character.applyAppearance(platform.getAppearance(characterId));
    }

    if (this.character?.locomotion && character?.wandSide) {
      this.character.locomotion.wandSide = character.wandSide;
    }
  }

  /**
   * Dress a class in another body (any of the nine KayKit looks), remembered
   * per class in this browser. Reloads the mesh if it is the one on screen.
   */
  async setLook(characterId, lookId) {
    const character = platform.characters.get(characterId);
    if (!character || !LOOKS[lookId] || character.rig !== 'kaykit') return;
    character.look = lookId;
    character.model = lookModel(lookId, character.model?.tint);
    saveLook(characterId, lookId);
    if (platform.getActiveCharacter()?.id === characterId && this._assets) {
      await this.character.reload(this._assets, character);
      this.character.applyAppearance(platform.getAppearance(characterId));
    }
  }

  /**
   * Swap skill slots and weapon without reloading the character mesh.
   *
   * @param {string} loadoutId registered in `platform.loadouts`
   */
  selectLoadout(loadoutId) {
    platform.setLoadout(loadoutId);
  }

  /** Apply a motion profile onto the live character tuning sliders. */
  selectMotion(motionId) {
    platform.applyMotion(motionId);
  }

  /** Equip a weapon from the armory — updates mesh, motion, and cast accent. */
  selectWeapon(weaponId) {
    platform.setWeapon(weaponId);
    this.character.equipWeapon(weaponId);

    if (this.phase === 'menu' && this.mainMenu.isVisible) {
      this.mainMenu._weaponId = weaponId;
      this.mainMenu.preview.setWeapon(weaponId);
      this.mainMenu._renderWeapons();
      this.mainMenu._updateSummary();
    }

    const weapon = platform.getActiveWeapon();
    this.weaponPanel.setEquipped(weaponId);
    if (this.phase === 'playing') {
      this.hud.showToast(`${weapon?.label ?? weaponId} equipped`);
    }
  }

  /** Select an ability and arm it, unless it is still cooling down. */
  armAbility(element = this.element) {
    if ((this.cooldowns.get(element) ?? 0) > 0) {
      this.hud.showToast('Not ready');
      return;
    }
    // Selecting before arming means the arrow is already drawn to the new
    // ability's range on the frame it appears.
    if (element !== this.element) this.selectAbility(element);
    this.aim.arm();
  }

  /**
   * The one place a cast happens.
   *
   * Three things come out of it, in this order: the effect, the damage, and the
   * animation. They are independent — an ability that failed to load its shader
   * would still deal its damage, and turning `settings.combat.enabled` off
   * leaves the sandbox exactly as it was before there was a game in it.
   */
  _fire(element, origin, direction, distance, facing) {
    // Casting stands you up. Throwing a meteor cross-legged is not a pose this
    // rig has, and silently ignoring the cast would be worse than standing.
    this.character.locomotion.toggleSit(false);

    this.abilities.cast(origin, direction, distance, element);
    this.combat.open(element, origin, direction, distance);
    this.cooldowns.set(element, Math.max(0, settings[element].cooldown * this.profile.cooldownMultiplier(element)));

    // Snap onto the shot and throw the body into it. Which clip that is belongs
    // to the ability, so each spell can be cast with its own gesture.
    this.character.setFacing(facing);
    this.character.playCast(platform.getCastAnim(element));
    this.character.castLunge();
  }

  /* ------------------------------------------------------------------ */
  /* AI-built maps                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Plan a map from a sentence (LM Studio if it is up, keywords if not) and
   * build it from the asset library. Only between runs — the menu calls it.
   *
   * @returns {Promise<{ plan: object, source: string, note?: string, stats: object }>}
   */
  async generateWorld(description) {
    await this.catalog.ready;
    const result = await this.mapPlanner.plan(description);
    const stats = await this.buildWorld(result.plan);
    return { ...result, stats };
  }

  /** Build a given MapPlan (already normalised) and stand the fight in it. */
  async buildWorld(plan, { seed } = {}) {
    await this.catalog.ready;
    this.clearEffects();
    const stats = await this.composed.build(plan, { seed });
    this._useWorld(this.composed);
    // New library materials compile here, not on the first frame of the fight.
    try {
      await this.renderer.gl.compileAsync(this.scene, this.camera);
    } catch {
      /* compile is an optimisation; a failure just means a hitch later */
    }
    return stats;
  }

  /* ------------------------------------------------------------------ */
  /* Levels: the editor and the campaign                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Open the level editor.
   * @param {{ id?: string, fromCurrentMap?: boolean }} [options] a saved level, or the map on screen
   */
  async openEditor({ id = null, fromCurrentMap = false } = {}) {
    this.levelEditor ??= new LevelEditor(this);
    let level = null;
    if (id) level = await this.levels.load(id);
    else if (fromCurrentMap && this.composed.level) {
      level = normalizeLevel({ ...this.composed.level, name: this.composed.plan?.name ?? this.composed.level.name });
      level.world.terrain = this.composed.terrain.serialize();
    }
    await this.levelEditor.enter(level);
  }

  async playCampaignLevel(id) {
    const campaign = await this.levels.list();
    const index = campaign.findIndex((entry) => entry.id === id);
    const level = await this.levels.load(id);
    await this.playLevel(level, { campaign, index });
  }

  /**
   * Play a level: its character, world, rules, story and goal.
   * @param {object} level
   * @param {{ fromEditor?: boolean, campaign?: {id: string, name: string}[], index?: number }} [options]
   */
  async playLevel(level, { fromEditor = false, campaign = null, index = -1 } = {}) {
    level = normalizeLevel(level);
    if (fromEditor) this.levelEditor.suspend();
    else this.mainMenu.hide();

    await this.catalog.ready;
    this.clearEffects();
    await this.composed.buildLevel(level);
    this._useWorld(this.composed);
    try {
      await this.renderer.gl.compileAsync(this.scene, this.camera);
    } catch {
      /* optimisation only */
    }

    const intro = level.story.intro;
    const choice = await this.story.show({
      eyebrow: campaign && index >= 0 ? `Level ${index + 1} of ${campaign.length}` : fromEditor ? 'Play test' : 'Level',
      title: intro.title || level.name,
      speaker: intro.speaker,
      text: intro.text,
      goal: `Goal: ${describeGoal(level.rules)}`,
      buttons: [
        { label: fromEditor ? 'Back to editor' : 'Back', value: 'back' },
        { label: 'Start', value: 'start', primary: true }
      ]
    });
    if (choice === 'back') {
      if (fromEditor) this.levelEditor.resume();
      else {
        this.useClassicWorld();
        this.showMainMenu();
      }
      return;
    }

    this.run = { level, fromEditor, campaign, index, kills: 0, wave: 0, done: false };
    this._applyRules(level);
    await this.enterGame({ characterId: level.character, keepRun: true });
    // Monsters already standing in the level wait for the director's reset.
    const V = this.character.position.constructor;
    for (const m of level.monsters) this.monsters.spawn(m.kind, new V(m.x, 0, m.z));
    const heightAt = (x, z) => this.composed.heightAt(x, z);
    this.portals.setPortals(level.portals, heightAt);
    this.npcs.setNpcs(level.npcs, heightAt);
    // NPCs are solid: monsters and the caster walk around them.
    this.composed.obstacles.push(...this.npcs.obstacles);
    this._updateGoalPill();
  }

  /** The level's wave rules over the global ones, remembered for restoring. */
  _applyRules(level) {
    const waves = settings.waves;
    const kinds = settings.monsters.kinds;
    this._rulesBackup = {
      waves: { baseCount: waves.baseCount, growth: waves.growth, bossEvery: waves.bossEvery, dragonEvery: waves.dragonEvery },
      weights: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.weight]))
    };
    const r = level.rules;
    Object.assign(waves, { baseCount: r.baseCount, growth: r.growth, bossEvery: r.bossEvery, dragonEvery: r.dragonEvery });
    // "Defeat the boss": the Emberwyrm arrives on wave `count`.
    if (r.goal === 'boss') waves.dragonEvery = r.count;
    for (const [kind, config] of Object.entries(kinds)) {
      if (kind in r.kinds && !config.boss) config.weight = r.kinds[kind];
    }
    // A level with every kind switched off still needs someone to fight.
    if (!Object.entries(kinds).some(([, c]) => !c.boss && c.weight > 0)) kinds.grunt.weight = 1;
    this.monsters.spawnPoints = level.spawns.length ? level.spawns : null;
  }

  _endRun() {
    if (this._rulesBackup) {
      Object.assign(settings.waves, this._rulesBackup.waves);
      for (const [kind, weight] of Object.entries(this._rulesBackup.weights)) settings.monsters.kinds[kind].weight = weight;
      this._rulesBackup = null;
    }
    this.monsters.spawnPoints = null;
    this.run = null;
    this.goalPill.hidden = true;
    this.portals.clear();
    this.npcs.clear();
    this.dialogue.close();
    this.talkPrompt.hidden = true;
  }

  _updateGoalPill() {
    const run = this.run;
    if (!run) {
      this.goalPill.hidden = true;
      return;
    }
    const r = run.level.rules;
    const progressText =
      r.goal === 'waves' ? `Wave ${Math.min(run.wave, r.count)} / ${r.count} cleared`
      : r.goal === 'kills' ? `${Math.min(run.kills, r.count)} / ${r.count} defeated`
      : run.wave < r.count ? `The boss arrives on wave ${r.count}` : 'Defeat the Emberwyrm!';
    const quests = this.npcs.activeQuests().map((q) =>
      q.done ? `${q.quest.title}: return to ${q.npc.data.name}` : `${q.quest.title}: ${q.progress}/${q.quest.count}`
    );
    this.goalPill.textContent = [run.done ? `${run.level.name} — goal reached, take the portal` : `${run.level.name} — ${progressText}`, ...quests].join('   ·   ');
    this.goalPill.hidden = false;
  }

  _onRunEvent(type, payload) {
    const run = this.run;
    if (!run || run.done || this.phase !== 'playing') return;
    const r = run.level.rules;
    if (type === 'kill') {
      run.kills += 1;
      if (r.goal === 'kills' && run.kills >= r.count) return this._winLevel();
      if (r.goal === 'boss' && payload?.kind === 'dragon') return this._winLevel();
    }
    if (type === 'waveCleared') {
      run.wave = payload;
      if (r.goal === 'waves' && run.wave >= r.count) return this._winLevel();
    }
    if (type === 'wave') run.wave = Math.max(run.wave, payload - 1);
    this._updateGoalPill();
  }

  /** Goal reached: stop the waves and open the way out — a gold portal. */
  _winLevel() {
    const run = this.run;
    run.done = true;
    this.director.stop();
    this.hud.showToast('Victory! A portal has opened');
    if (!run.fromEditor) progress.complete(run.level.id);
    const p = this.character.position;
    // A few metres ahead of the caster as the camera sees it, facing the
    // camera — so it is in view and seen face-on, never edge-on.
    const heading = this.rig.yaw;
    // Try straight ahead first, then fan out: never on top of a gate or an NPC.
    const taken = [...this.portals.portals.map((q) => q.position), ...this.npcs.npcs.map((n) => n.position)];
    let x = p.x;
    let z = p.z;
    for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI]) {
      let cx = p.x + Math.sin(heading + turn) * 4.5;
      let cz = p.z + Math.cos(heading + turn) * 4.5;
      const r = Math.hypot(cx, cz);
      if (r > 21) {
        cx *= 21 / r;
        cz *= 21 / r;
      }
      x = cx;
      z = cz;
      if (taken.every((t) => Math.hypot(t.x - cx, t.z - cz) > 4.2)) break;
    }
    this.portals.add(
      { id: '__exit', x, z, yaw: heading + Math.PI, color: 'gold', label: 'The way onward', target: { type: 'exit' } },
      (px, pz) => this.composed.heightAt(px, pz)
    );
    this._updateGoalPill();
  }

  /** Walked into the exit portal: the ending, then the next level. */
  async _finishLevel() {
    const run = this.run;
    if (!run || run.finishing) return;
    run.finishing = true;
    this.flash.trigger?.(getColor('#fff2c4'), 0.6);
    this.monsters.despawnAll();
    this.input.enabled = false;
    const next = run.campaign && run.index >= 0 ? run.campaign[run.index + 1] : null;
    const outro = run.level.story.outro;
    const choice = await this.story.show({
      eyebrow: 'Level complete',
      title: outro.title || 'Victory',
      speaker: outro.speaker,
      text: outro.text,
      buttons: [
        { label: run.fromEditor ? 'Back to editor' : 'Main menu', value: 'menu' },
        ...(next ? [{ label: `Next: ${next.name}`, value: 'next', primary: true }] : [])
      ]
    });
    if (choice === 'next' && next) {
      this.exitToMenu();
      this.mainMenu.hide();
      await this.playCampaignLevel(next.id);
      return;
    }
    this.exitToMenu();
    if (!run.fromEditor) this.useClassicWorld();
  }

  /* ------------------------------------------------------------------ */
  /* Portals                                                             */
  /* ------------------------------------------------------------------ */

  async _enterPortal(portal) {
    if (this.phase !== 'playing') return;
    const target = portal.data.target ?? { type: 'none' };
    if (target.type === 'exit') return this._finishLevel();
    if (target.type === 'portal') {
      const other = this.portals.get(target.portal);
      if (!other) return this.hud.showToast('This portal leads nowhere');
      other.cooldown = 1.6;
      // Step out a couple of metres in front of the other portal.
      const yaw = other.group.rotation.y;
      this._teleport(other.position.x + Math.sin(yaw) * 2, other.position.z + Math.cos(yaw) * 2);
      this.flash.trigger?.(getColor('#bfe6ff'), 0.35);
      this.shake.add(0.4 * settings.global.cameraShake, 0.5, 10);
      return;
    }
    if (target.type === 'level') {
      if (this.run?.fromEditor) return this.hud.showToast(`Leads to level “${target.level}” — works in the campaign`);
      const campaign = await this.levels.list();
      const index = campaign.findIndex((entry) => entry.id === target.level);
      let level;
      try {
        level = await this.levels.load(target.level);
      } catch {
        return this.hud.showToast('This portal leads nowhere');
      }
      this.flash.trigger?.(getColor('#bfe6ff'), 0.6);
      this.director.stop();
      this.clearEffects();
      this._endRun();
      await this.playLevel(level, { campaign, index });
      return;
    }
    this.hud.showToast('This portal is dormant');
  }

  /** Move the caster (and the camera with them) without a walk. */
  _teleport(x, z) {
    const position = this.character.position;
    const dx = x - position.x;
    const dz = z - position.z;
    position.x = x;
    position.z = z;
    this.rig.camera.position.x += dx;
    this.rig.camera.position.z += dz;
    this.rig.controls.target.x += dx;
    this.rig.controls.target.z += dz;
    // Not locomotion.reset(): that also re-centres the caster on the origin.
    this.character.locomotion.velocity.set(0, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */

  _dropLoot(monster) {
    const items = rollLoot(monster.kind, { wave: this.director.wave || 1, goldFind: this.profile.stats.gold });
    if (items.length) this.loot.drop(items, monster.position, (x, z) => this.world.heightAt?.(x, z) ?? 0);
  }

  /** Gear → max health, move speed. `refill` tops health up (start of a run). */
  _applyProfileStats({ refill = false } = {}) {
    const stats = this.profile.stats;
    const director = this.director;
    const ratio = director.maxHealth ? director.health / director.maxHealth : 1;
    director.maxHealth = Math.max(40, settings.combat.playerHealth + stats.health);
    director.armor = stats.armor / 100;
    director.health = refill ? director.maxHealth : Math.max(1, Math.round(director.maxHealth * ratio));
    this.character.locomotion.speedBonus = 1 + stats.speed / 100;
  }

  _equipItem(item) {
    const equipped = this.profile.equip(item.uid);
    if (!equipped) return;
    this.selectWeapon(equipped.weapon);
    this.hud.showToast(`${equipped.name} equipped`);
  }

  _drink(kind) {
    if (!this.profile.usePotion(kind)) return this.hud.showToast(`No ${POTIONS[kind].name.toLowerCase()}s left`);
    if (kind === 'health') {
      this.director.health = Math.min(this.director.maxHealth, this.director.health + this.director.maxHealth * 0.45);
      this.flash.trigger?.(getColor('#ff6b7a'), 0.25);
    } else {
      for (const element of this.cooldowns.keys()) this.cooldowns.set(element, 0);
      this.flash.trigger?.(getColor('#7fd6ff'), 0.25);
    }
    this.hud.showToast(POTIONS[kind].name);
  }

  /* ------------------------------------------------------------------ */
  /* NPCs                                                                */
  /* ------------------------------------------------------------------ */

  _talkTo(npc) {
    this._pausedForTalk = !this.paused;
    this.paused = true;
    this.input.enabled = false;
    this.talkPrompt.hidden = true;
    this.dialogue.open(npc, this._npcActions(npc));
  }

  _npcContext(npc) {
    const run = this.run;
    const level = run?.level ?? null;
    const r = level?.rules;
    const monsters = r
      ? Object.entries(r.kinds).filter(([, w]) => w > 0).map(([k]) => settings.monsters.kinds[k]?.label ?? k).join(', ')
      : 'imps, wisps, brutes and golems';
    const q = npc.data.quest;
    return {
      level,
      goal: r ? describeGoal(r) : 'survive',
      progress: run ? (run.done ? 'goal reached' : `${run.kills} defeated, wave ${run.wave}`) : 'free play',
      monsters,
      quest: q ? `${q.title} — defeat ${q.count} ${q.target === 'any' ? 'monsters' : settings.monsters.kinds[q.target]?.label ?? q.target} (${npc.state.progress}/${q.count}${npc.state.questAccepted ? ', accepted' : ', not yet accepted'})` : null,
      player: {
        healthPct: Math.round((this.director.health / Math.max(1, this.director.maxHealth)) * 100),
        gold: this.profile.gold,
        potions: this.profile.potions,
        weapon: this.profile.equipped?.name ?? platform.getActiveWeapon()?.label ?? 'bare hands',
        skills: this.profile.skills
      }
    };
  }

  _rewardItem(rarity) {
    return rarity === 'none' ? null : makeWeapon(rarity);
  }

  _npcActions(npc) {
    const profile = this.profile;
    const give = (item) => {
      const result = profile.pickUp(item);
      if (!result.ok) this.loot.drop([item], this.character.position, (x, z) => this.world.heightAt?.(x, z) ?? 0);
      return result.ok ? item.name : `${item.name} (dropped at your feet — ${result.message.toLowerCase()})`;
    };
    return {
      scripted: () => this.npcBrain.scripted(npc),
      ask: (text) => this.npcBrain.reply(npc, text, this._npcContext(npc)),
      gold: () => profile.gold,
      takeGift: () => {
        const g = npc.data.gift;
        if (!g || g.type === 'none' || npc.state.gifted) return null;
        npc.state.gifted = true;
        const item =
          g.type === 'gold' ? makeGold(g.amount)
          : g.type === 'health' || g.type === 'focus' ? makePotion(g.type)
          : g.type === 'book' ? makeBook()
          : makeWeapon(g.rarity === 'none' ? 'magic' : g.rarity);
        return `${npc.data.name} gives you ${give(item)}.`;
      },
      questState: () => {
        const q = npc.data.quest;
        const s = npc.state;
        if (!q || s.questTurnedIn) return null;
        const what = q.target === 'any' ? 'monsters' : `${settings.monsters.kinds[q.target]?.label ?? q.target}s`;
        return {
          title: q.title,
          offer: !s.questAccepted,
          active: s.questAccepted && !s.questDone,
          ready: s.questDone,
          progress: `${s.progress}/${q.count} ${what}`
        };
      },
      acceptQuest: () => {
        const q = npc.data.quest;
        npc.state.questAccepted = true;
        this.npcs.refreshMarks();
        this._updateGoalPill();
        const what = q.target === 'any' ? 'monsters' : `${settings.monsters.kinds[q.target]?.label ?? q.target}s`;
        return `Quest accepted: ${q.title} — defeat ${q.count} ${what}. Reward: ${q.gold} gold${q.rarity !== 'none' ? ` and a ${q.rarity} item` : ''}.`;
      },
      completeQuest: () => {
        const q = npc.data.quest;
        npc.state.questTurnedIn = true;
        profile.gold += q.gold;
        profile.save();
        const reward = this._rewardItem(q.rarity);
        const got = reward ? ` and ${give(reward)}` : '';
        this.npcs.refreshMarks();
        this._updateGoalPill();
        return `Quest complete! You receive ${q.gold} gold${got}.`;
      },
      stock: () => (npc.state.stock ??= npc.data.role === 'healer' ? [makePotion('health'), makePotion('focus')] : merchantStock(Math.random, this.director.wave || 1)),
      bag: () => profile.bag,
      buy: (item) => profile.buy(item).message,
      sell: (item) => `Sold ${item.name} for ${profile.sell(item.uid)} gold`,
      heal: () => {
        this.director.health = this.director.maxHealth;
        return `${npc.data.name} mends your wounds. Full health.`;
      },
      onClose: () => {
        if (this._pausedForTalk) this.paused = false;
        this.input.enabled = this.phase === 'playing';
      }
    };
  }

  /** Back to the hand-built ruined keep. */
  useClassicWorld() {
    this.clearEffects();
    this.composed.clear();
    this._useWorld(this.ruins);
  }

  _useWorld(world) {
    this.world = world;
    const classic = world === this.ruins;
    this.ruins.group.visible = classic;
    this.ground.mesh.visible = classic;
    this.composed.group.visible = !classic;
    this.combat.ctx.ruins = world;
    this.director.ctx.ruins = world;
    this.monsters.obstacles = world.obstacles;
    const locomotion = this.character.locomotion;
    locomotion.obstacles = world.obstacles;
    locomotion.props = world.props;
  }

  clearEffects() {
    this.loot?.clear();
    this.aim.cancel();
    this.abilities.clear();
    this.combat.reset();
    this.monsters.despawnAll();
    this.world.restoreProps();
    this.particles.reset();
    this.decals.clear();
    this.fissures.clear();
    this.bursts.clear();
    this.lights.reset();
    this.shake.reset();
    this.flash.reset();
    this.numbers.clear();
  }

  /* ------------------------------------------------------------------ */

  /** Load assets, warm the shader cache, then start the loop. */
  async load() {
    const assets = new AssetLoader();
    this._assets = assets;

    this.loading.setProgress(0.05, 'Loading environment…');
    const hdr = await assets.loadHDR(HDR_URL);
    await this.environment.loadEnvironment(hdr);
    frame.uEnvMap.value = this.environment.equirect;

    this.loading.setProgress(0.3, 'Loading floor…');
    await this.ground.loadTextures(assets);

    this.loading.setProgress(0.45, 'Raising the keep…');
    // The keep borrows the floor's stone, so it has to be built after the maps
    // land — and before the shader warm-up below, or its first frame stutters.
    this.ruins.useStoneTextures(this.ground.textures);
    this.ruins.build();
    this.monsters.obstacles = this.ruins.obstacles;

    this.loading.setProgress(0.6, 'Loading character…');
    await this.character.load(assets);

    this.loading.setProgress(0.65, 'Waking the horde…');
    this.monsters.warmUp();

    await this._precompile(0.7, 0.99);

    this.loading.setProgress(1, 'Ready');
    this.loading.hide();

    // The contact card waits for the veil to start clearing before its entrance
    // plays — calling reveal here lands it just after the fade.
    this.hud.reveal();

    this.showMainMenu();
    this.start();
  }

  /**
   * Build every ability and compile everything it draws, behind the loading
   * veil, so the first cast of a session costs what the fiftieth does.
   *
   * This used to be a single `WebGLRenderer#compileAsync` over the scene, and it
   * was doing close to nothing, for three separate reasons.
   *
   * The first is that **the abilities were not in the scene yet.** Their pools
   * are lazy, so at that point not one ability object existed and there was
   * nothing of theirs to compile. They are all built first now.
   *
   * The second is that **three keys a program on the render target bound when
   * it is built.** Tone mapping and output colour space both differ between the
   * canvas and the composer's HDR target, which is the only place the scene is
   * ever drawn, so every program it produced was keyed for a render that never
   * happens. `PostProcessing#compileAsync` binds the right target.
   *
   * The third is that **the shadow type changed under it.** See the note in
   * `Renderer` — until that was fixed, a program compiled before the first
   * shadow render could never be reused, whatever else was right.
   *
   * With those fixed the background compile covers the main pass, on the
   * driver's worker threads, while the veil keeps animating. What it cannot
   * predict — the depth prepass's override material, the distortion pass's
   * light-free variants, the shadow casters — is paid by one real frame of the
   * real pipeline afterwards, which also uploads every vertex buffer.
   *
   * @param {number} from progress ratio to start the labels at
   * @param {number} to   progress ratio to finish on
   */
  async _precompile(from, to) {
    const span = to - from;

    this.loading.setProgress(from, 'Building abilities…');
    // Building blocks the main thread, so yield first or the label never shows.
    await nextFrame();

    // Impact-only shaders: these are built on the first decal, shell or crack
    // of each kind, which is a second hitch a moment after the first cast's.
    const releaseDecals = this.decals.prewarm();
    const releaseBursts = this.bursts.prewarm();
    // One crack network per meteor still burning, at the fastest recast.
    const meteor = settings.meteor;
    const releaseFissures = this.fissures.prewarm(
      Math.min(8, Math.ceil(meteor.fissureLife / Math.max(0.1, meteor.cooldown)))
    );

    // The arrow and the zone circle are hidden until the first arm, so they
    // would otherwise compile on the first press of Q.
    const roots = [this.aim.object3D];
    for (const element of this.abilities.elements) {
      for (const ability of this.abilities.prewarm(element)) roots.push(ability.group);
    }

    this.loading.setProgress(from + span * 0.1, 'Compiling shaders…');
    await this.post.compileAsync();

    this.loading.setProgress(from + span * 0.9, 'Warming up…');
    await nextFrame();
    this._warmDraw(roots);

    releaseDecals();
    releaseBursts();
    releaseFissures();
  }

  /**
   * One full pipeline frame with `roots` forced visible.
   *
   * Visibility and frustum culling are both overridden, because three skips an
   * invisible subtree outright and a culled mesh never reaches `setProgram` —
   * either one would leave a shader for the first cast to compile. Only what
   * this call changed is put back, so a mesh that was hidden by its own
   * constructor stays hidden.
   *
   * @param {THREE.Object3D[]} roots
   */
  _warmDraw(roots) {
    const hidden = [];
    const culled = [];

    for (const root of roots) {
      root.traverse((node) => {
        if (node.visible === false) {
          node.visible = true;
          hidden.push(node);
        }
        if (node.frustumCulled === true) {
          node.frustumCulled = false;
          culled.push(node);
        }
      });
    }

    // Same order as `frame()`, so every pass sees what it will see in flight.
    this.contactShadows.render(this.scene);
    this.renderer.gl.shadowMap.needsUpdate = true;
    this.post.sync(this.elapsed, this.flash);
    this.post.render();

    for (const node of hidden) node.visible = false;
    for (const node of culled) node.frustumCulled = true;
  }

  start() {
    this.time.reset();
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this.frame();
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this._raf);
  }

  /* ------------------------------------------------------------------ */

  frame() {
    const gl = this.renderer.gl;
    gl.info.reset();

    const raw = this.time.tick();
    // Three multipliers, and they mean different things: `timeScale` is the
    // editor's slow-mo, `director.timeScale` is the hit-stop the fight buys
    // itself on a heavy impact, and `paused` stops the simulation without
    // stopping the UI.
    const dt = this.paused ? 0 : raw * settings.global.timeScale * this.director.timeScale;
    this.elapsed += dt;

    /* ---- shared uniforms ---- */
    frame.uTime.value = this.elapsed;
    frame.uDelta.value = dt;
    frame.uShaderIntensity.value = settings.global.shaderIntensity;
    frame.uGlobalGlow.value = settings.global.glow;
    frame.uCameraNear.value = this.camera.near;
    frame.uCameraFar.value = this.camera.far;

    /* ---- simulation ---- */
    this.renderer.syncSettings();

    if (this.phase === 'editor') {
      this.levelEditor.update(raw);
      this.environment.setFocus(this.levelEditor.focus.x, this.levelEditor.focus.z);
    } else {
      this.environment.setFocus(this.character.position.x, this.character.position.z);
    }
    this.environment.update();

    // Targeting runs on *real* time so the arrow keeps sweeping and animating
    // while the sandbox is paused — pausing freezes the effects, not the UI.
    this.aim.setOrigin(this.character.position);
    this.aim.update(raw);

    this._lookDt = raw;
    this._readMovement();

    // Face the cursor while playing so mouse aim and WASD share one heading.
    // Movement is character-relative, so W always means "forward" for the body.
    const locomotion = this.character.locomotion;
    if (this.phase === 'playing' && !this.paused) {
      if (settings.character.turnToAim) {
        this.character.turnToward(this.aim.facing, settings.character.turnRate, raw);
      } else if (locomotion.isMoving) {
        this.character.turnToward(locomotion.heading, settings.character.moveTurnRate, raw);
      }
    }

    this.character.update(dt);

    if (this.phase === 'playing') {
      for (const [element, remaining] of this.cooldowns) {
        if (remaining > 0) this.cooldowns.set(element, Math.max(0, remaining - raw));
      }
      if (this._attackCooldown > 0) {
        this._attackCooldown = Math.max(0, this._attackCooldown - raw);
      }

      this.ground.update(this.elapsed);
      this.world.update(dt, this.elapsed);
      this.dust.update(this.elapsed, this.character.position);

      /* ---- the fight ----
         Order matters: strikes advance before the bodies move, so a monster is
         hit where the effect actually reached it rather than where it walked to
         during the same frame. */
      this.monsters.target.copy(this.character.position);
      this.combat.update(dt, this.elapsed);
      this.monsters.update(dt, this.elapsed);
      this.director.update(raw, this.elapsed);

      this.abilities.update(dt);
      this.particles.flush();
      this.decals.update(dt);
      this.fissures.update(dt);
      this.bursts.update(dt);
      this.lights.update(dt);
    } else {
      this.ground.update(this.elapsed);
      this.dust.update(this.elapsed, this.character.position);
    }

    /* ---- camera ---- */
    // Something the size of the Emberwyrm does not fit in a framing built for a
    // caster and a few imps, so the rig backs off while one is alive. It is a
    // bias on the player's own zoom, not a replacement for it.
    const boss = this.monsters.active.some((monster) => monster.config.boss && monster.isAlive);
    this.rig.setDistanceBias(boss ? settings.camera.bossZoom : 1, raw);

    const focus = this.abilities.focus;
    if (focus) this.rig.lookAt(focus.position, MathUtils.clamp(1 - focus.u * 0.4, 0, 1));
    if (this.phase !== 'editor') this.rig.setAnchor(this.character.position.x, 0, this.character.position.z);
    this.shake.update(raw);
    this.flash.update(raw);
    this.rig.update(raw);

    // Items, portals and NPCs run on real time, so they keep breathing through
    // pauses (and through a conversation, which pauses the fight).
    if (this.phase === 'playing') {
      const player = this.character.position;
      this.portals.update(raw, this.elapsed, this.paused ? null : player);
      this.loot.update(raw, this.elapsed, this.paused ? null : player);
      const near = this.npcs.update(raw, player);
      const showPrompt = Boolean(near) && !this.dialogue.isOpen && !this.paused;
      this.talkPrompt.hidden = !showPrompt;
      if (showPrompt) this.talkPrompt.textContent = `F  Talk to ${near.data.name} (${NPC_ROLES[near.data.role]?.label ?? 'Guide'})`;
    }
    this.labels.setVisible(this.phase === 'playing' || this.phase === 'editor');
    this.labels.update(this.camera);

    this.contactShadows.setPosition(this.character.position.x, this.character.position.z);
    this.contactShadows.render(this.scene);

    /* ---- render ---- */
    // Exactly one cascade shadow update per frame (see Renderer).
    gl.shadowMap.needsUpdate = true;
    this.post.sync(this.elapsed, this.flash);
    this.post.render();

    /* ---- readouts ---- */
    this._updateReadouts(raw);
  }

  /**
   * Poll the movement keys and hand the character a *world-space* intent.
   *
   * Movement is polled rather than evented because it is continuous: a held key
   * fires one `keydown` and then nothing, while the frame loop needs an answer
   * every frame. The input layer reports the stick in the character's frame and
   * this rotates it into the world, which is what makes W mean "where the body
   * is facing" after the mouse has steered it.
   */
  _readMovement() {
    if (this.phase !== 'playing') {
      this.character.locomotion.setIntent(0, 0, false);
      return;
    }

    // The camera stick. Read here rather than in the camera block below so the
    // heading the movement is rotated into is *this* frame's, not last frame's
    // — otherwise swinging the view while running makes the body wobble.
    const look = this.input.readCamera(this._look);
    if (look.active) {
      const cam = settings.camera;
      this.rig.addOrbit(
        look.yaw * cam.keyOrbitSpeed * this._lookDt,
        look.pitch * cam.keyPitchSpeed * this._lookDt
      );
    }

    const move = this.input.readMovement(this._move);
    const yaw = this.character.facing;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    // character forward = (sin, 0, cos); character right = (cos, 0, -sin)
    this.character.locomotion.setIntent(
      -move.x * cos + move.z * sin,
      move.z * cos + move.x * sin,
      move.sprint,
      move.walk
    );
  }

  /** Everything DOM. Driven by real time so it keeps moving while paused. */
  _updateReadouts(dt) {
    const gl = this.renderer.gl;

    for (const element of ELEMENTS) {
      this.hud.setCooldown(element, this.cooldowns.get(element) ?? 0, settings[element].cooldown * this.profile.cooldownMultiplier(element));
    }
    this.hud.setArmed(this.aim.isArmed);
    this.hud.update(dt, () => ({
      particles: this.particles.countLive(this.elapsed),
      calls: gl.info.render.calls,
      spikes: this.abilities.active.reduce((total, ability) => total + ability.instanceCount, 0),
      abilities: this.abilities.active.length
    }));

    this.gameHud.setHealth(this.director.healthRatio, this.director.health);
    this.gameHud.setCounts(this.monsters.aliveCount, this.director.kills);
    this.gameHud.update(dt);
    if (this.director.state === RunState.DOWNED) {
      this.gameHud.setDownedTimer(this.director.downedRemaining);
    }

    this.numbers.update(dt, this.camera, window.innerWidth, window.innerHeight);
  }

  /* ------------------------------------------------------------------ */

  dispose() {
    this.stop();
    this.input.dispose();
    this.aim.dispose();
    this.abilities.dispose();
    this.director.dispose();
    this.combat.dispose();
    this.monsters.dispose();
    this.ruins.dispose();
    this.composed.dispose();
    this.particles.dispose();
    this.decals.dispose();
    this.fissures.dispose();
    this.bursts.dispose();
    this.lights.dispose();
    this.character.dispose();
    this.ground.dispose();
    this.dust.dispose();
    this.contactShadows.dispose();
    this.post.dispose();
    this.environment.dispose();
    this.numbers.dispose();
    this.gameHud.dispose();
    this.gameMenu.dispose();
    this.mainMenu.dispose();
    this.editor.dispose();
    this.rig.dispose();
    this.renderer.dispose();
  }
}
