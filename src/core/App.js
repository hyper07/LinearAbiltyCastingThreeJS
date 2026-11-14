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
import { POTION_KINDS, isSkillEntry, potionOf } from '../items/hotbar.js';
import { POTIONS, XP_FOR, makeBagRowOffer, makeBook, makeGear, makeGold, makePotion, makeWeapon, merchantStock, rollLoot } from '../items/Items.js';
import { NpcSystem, NPC_ROLES } from '../npc/Npcs.js';
import { NpcBrain } from '../npc/NpcBrain.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { InventoryPanel } from '../ui/InventoryPanel.js';
import { SkillTreePanel } from '../ui/SkillTreePanel.js';
import { ClassForgePanel } from '../ui/ClassForgePanel.js';
import { GameBuilderPanel } from '../ui/GameBuilderPanel.js';
import { PlatformHome } from '../ui/PlatformHome.js';
import { HeroesPanel } from '../ui/HeroesPanel.js';
import { RosterPicker } from '../ui/RosterPicker.js';
import { GameLobby } from '../ui/GameLobby.js';
import { games } from '../platform/gamesClient.js';
import { GameBuilder } from '../ai/GameBuilder.js';
import { compileGame, describeHero } from '../blueprints/index.js';
import { CLASS_SPECS } from '../platform/character/classes.js';
import { WeaponFire } from '../game/WeaponFire.js';
import { fireProfileOf } from '../platform/weapon/fire.js';
import { designClass, normalizeDesign } from '../ai/ClassDesigner.js';
import { registerForgedClass, unregisterForgedClass, listForgedClasses, loadForgedClass, saveForgedClass, deleteForgedClass, skillIds } from '../forge/ClassForge.js';
import { library, OFFICIAL_AUTHOR } from '../library/Library.js';
import { LibraryPanel } from '../ui/LibraryPanel.js';
import { itemThumbnails } from '../ui/ItemThumbnails.js';
import { Party } from '../net/Party.js';
import { Account } from '../net/Account.js';
import { Profile } from '../items/Profile.js';
import { ProfileSync } from '../net/ProfileSync.js';
import { LootSystem } from '../items/Loot.js';

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
import { GameDirector, RunState, isRivalTarget } from '../game/GameDirector.js';
import { DamageNumbers } from '../game/DamageNumbers.js';

import { HUD, LoadingScreen } from '../ui/HUD.js';
import { GameHUD } from '../ui/GameHUD.js';
import { ScopeOverlay } from '../ui/ScopeOverlay.js';
import { WeaponPanel } from '../ui/WeaponPanel.js';
import { MainMenu } from '../ui/MainMenu.js';
import { GameMenuButton } from '../ui/GameMenuButton.js';
import { Editor } from '../ui/Editor.js';

import { getColor } from '../utils/color.js';
import { BuffAuras } from '../effects/BuffAuras.js';
import { RoyaleMode } from '../game/royale/RoyaleMode.js';
import { MonsterModelLibrary } from '../entities/MonsterModels.js';
import { PROGRESSION, globalCooldown, levelCooldownFactor, manaCost, manaRegen, maxMana } from '../game/progression.js';
import { DecalType } from '../effects/GroundDecals.js';
import { settings, ELEMENTS, ELEMENT_META, CastShape, castShapeOf } from '../config/settings.js';
import { platform, classArmor, classBonuses, LOOKS, treeSpells, treeFor } from '../platform/index.js';
import { CUSTOM_LOOKS, lookModel, lookRig, registerCustomLooks, saveLook, savedLook } from '../platform/character/classes.js';

const HDR_URL = './hdri/spruit_sunrise.hdr';

/** Seconds before the same kind of potion can be drunk again. */
const POTION_COOLDOWN = 2;
/** Below this share of health the health potion's key pulses… */
const LOW_HEALTH = 0.35;
/** …and below this, with auto-drink on, one is drunk for you. */
const AUTO_DRINK_AT = 0.3;
// Storage keys keep the game's first name (Elemental Arena).
const AUTO_DRINK_KEY = 'elemental-arena.autoDrink';

/** A remembered on/off choice in this browser (off when storage is unavailable). */
function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Hand the page back for one frame, so the loading veil can repaint. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const _scopeLook = new Vector3();
const _scopeAhead = new Vector3();
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
    /** When each potion can be drunk again (game seconds). */
    this._potionReadyAt = {};
    this.autoDrink = readFlag(AUTO_DRINK_KEY);
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
    /**
     * Rage, for classes that fight with it (tree `resource: 'rage'`): built by
     * landing hits — melee swings and the tier-1 skills — and by being hit;
     * spent by the big skills; drains away out of combat.
     */
    this.rage = 0;
    this._rageIdle = 0;
    /** Mana: what spells cost (game/progression.js). Rage classes do without. */
    this.maxMana = maxMana(1);
    this.mana = this.maxMana;
    /** The pause after a cast before the next, and how long it was. */
    this._gcd = 0;
    this._gcdTotal = 1;
    /** Battle Roar's damage buff runs until this time (this.elapsed). */
    this._roarUntil = 0;
    /** Iron Tempest: re-throw the spin clip until this time. */
    this._spinUntil = 0;
    this._spinNext = 0;
    /** A charge or leap in progress: the body is moved by the App, not by input. */
    this._dashState = null;

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
    /** Team buffs (Battle Roar): an aura on everyone it reached, for as long as it lasts. */
    this.auras = new BuffAuras(this.scene);
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
    /** The classes players made, as designs (Class forge): id → design. Offered as heroes by the Game builder. */
    this.forgedDesigns = new Map();
    /** The game builder's unsaved chapters (playDraftGame). */
    this.drafts = { levels: new Map(), campaign: [] };
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
      damageMultiplier: (element) => this.profile.damageMultiplier(element) * this._buffMultiplier(),
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
    /** Guns, bows and throwing weapons: what left click fires (game/WeaponFire.js). */
    this.weaponFire = new WeaponFire({
      scene: this.scene,
      combat: this.combat,
      monsters: this.monsters,
      particles: this.particles,
      bursts: this.bursts,
      decals: this.decals,
      lights: this.lights,
      shake: this.shake
    });
    /** Rounds left in the magazine, per weapon; reload countdown. */
    this._ammo = new Map();
    this._reloadLeft = 0;

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
    this.scopeOverlay = new ScopeOverlay(hudRoot);
    /** 0..1 how far the player is looking through a scope (hold V). */
    this._scope = 0;
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
      onOpenStash: () => this.inventory.openStash(),
      onOpenLibrary: () => this.libraryPanel.toggle(true),
      onOpenEditor: (options) => this.openEditor(options),
      onLookChange: (characterId, lookId) => this.setLook(characterId, lookId),
      onMyModelsChanged: async () => {
        await this.catalog.refresh();
        this._registerMyModels();
      },
      onOpenForge: () => this.forge.toggle(true),
      onOpenBuilder: () => this.builder.toggle(true),
      onHome: () => this.openHome()
    });
    /* ---- the Class forge: AI-designed classes, saved in public/classes ---- */
    this.forge = new ClassForgePanel(hudRoot, {
      design: (text) => designClass(text),
      normalize: (design) => normalizeDesign(design, { id: design.id }),
      save: async (design, { share = true } = {}) => {
        registerForgedClass(design, { abilities: this.abilities });
        this.forgedDesigns.set(design.id, design);
        await saveForgedClass(design);
        await this.mainMenu.refreshCharacters();
        // Into the shared library: the class, and the skills it made (reused ones are counted, not copied).
        return library.publishClass(design, skillIds(design), share ? 'shared' : 'draft');
      },
      similar: (kind, fingerprint, options) => library.similar(kind, fingerprint, options),
      getAsset: (id) => library.get(id),
      list: () => listForgedClasses(),
      load: async (id) => normalizeDesign(await loadForgedClass(id), { id }),
      remove: async (id) => {
        await deleteForgedClass(id);
        unregisterForgedClass(id);
        this.forgedDesigns.delete(id);
        library.remove(`class:${id}`);
        await this.mainMenu.refreshCharacters(this.mainMenu._characterId === id ? 'knight' : null);
      },
      select: (id) => this.mainMenu.refreshCharacters(id)
    });
    this._forgedReady = this._loadForgedClasses();
    /* ---- the Game builder: a sentence or a few menu picks → a whole game (src/blueprints) ---- */
    const gameBuilder = new GameBuilder();
    // The classes players made (Class forge, saved in the class store and the library) are
    // heroes too: in the menu, in the keywords ("with my Stormbound Corsair") and for the AI.
    const made = async () => {
      await this._forgedReady;
      return [...this.forgedDesigns.values()].reverse().map(describeHero);
    };
    // The built-in classes (the forge adds its own to CLASS_SPECS as it registers them), then yours.
    const heroes = async () => [...CLASS_SPECS.filter((c) => !c.forged).map((c) => ({ id: c.id, name: c.label })), ...(await made())];
    const madeIds = async () => (await made()).map((h) => h.id);
    this.builder = new GameBuilderPanel(hudRoot, {
      status: () => gameBuilder.status(),
      quick: async (text) => gameBuilder.quick(text, { heroes: await made() }),
      build: async (text, options) => gameBuilder.build(text, { ...options, heroes: await made() }),
      heroes,
      compile: async (spec, seed) => compileGame(spec, { seed, taken: new Set((await this.levels.list()).map((e) => e.id)), heroes: await madeIds() }),
      play: (levels) => this.playDraftGame(levels),
      // Publish: a game record on the platform (server/gamesStore.js), on the home page at once.
      save: async (levels, spec, roster = []) => {
        // The game's own copy of each class it offers: a class made in the forge goes in with its design.
        const entries = roster.map((id) => (this.forgedDesigns.has(id) ? { id, design: this.forgedDesigns.get(id) } : { id }));
        const game = await games.publish({ title: spec?.name ?? levels[0].name, levels, spec, roster: entries, author: this.account.user?.name });
        if (this.home.isVisible) this.home.refresh();
        return game;
      },
      edit: async (levels) => {
        this.drafts.levels = new Map(levels.map((level) => [level.id, level]));
        this.drafts.campaign = levels.map((level) => ({ id: level.id, name: level.name }));
        this.mainMenu.hide();
        this.home.hide();
        await this.openEditor({ id: levels[0].id });
      }
    });
    this.libraryPanel = new LibraryPanel(hudRoot, {
      selectClass: (id) => this.mainMenu.refreshCharacters(id),
      playLevel: (id) => this.playCampaignLevel(id),
      equipWeapon: (id) => this.selectWeapon(id),
      // A class shared by someone else: save it here and make it playable.
      installClass: async (design) => {
        const clean = normalizeDesign(design, { id: design.id });
        registerForgedClass(clean, { abilities: this.abilities });
        await saveForgedClass(clean).catch(() => {});
        await this.mainMenu.refreshCharacters();
      }
    });
    /* ---- the platform's front page: every game as a card (ui/PlatformHome.js) ---- */
    /** Which menu screen shows between games: the platform's 'home', or the action RPG's 'hero' menu. */
    this._menuView = 'home';
    this.home = new PlatformHome(hudRoot, {
      list: (params) => games.list(params),
      get: (id) => games.get(id),
      play: (id) => this.openLobby(id),
      remove: (id) => games.remove(id),
      create: () => this.builder.toggle(true),
      openHero: (panel) => this.openHero(panel),
      openHeroes: () => this.heroesPanel.open(),
      openForge: () => this.forge.toggle(true),
      openEditor: () => {
        this.home.hide();
        this.openEditor({});
      },
      openLibrary: () => this.libraryPanel.toggle(true),
      heroes,
      heroOf: (id) => this.heroOf(id),
      rosterHeroes: (roster) => this.rosterHeroes(roster),
      account: () => this.account?.user ?? null
    });
    /** "My heroes": the games you have a hero in; a hero's bag and gear, by game. */
    this.heroesPanel = new HeroesPanel(hudRoot, {
      account: () => this.account?.user ?? null,
      heroes: () => this.allHeroes(),
      game: (id) => games.get(id),
      className: (classId) => {
        const spec = CLASS_SPECS.find((c) => c.id === classId);
        const design = this.forgedDesigns?.get(classId);
        return { name: spec?.label ?? design?.name ?? platform.characters.get(classId)?.name ?? `${classId.charAt(0).toUpperCase()}${classId.slice(1)}`, icon: spec?.icon ?? design?.icon };
      },
      arena: () => this.arenaHero(),
      openArena: () => this.openHero('loadout'),
      openBag: (gameId, classId) => this.editHero(gameId, classId),
      play: (gameId) => this.openLobby(gameId)
    });
    /** "Choose your character" the first time a player joins a game. */
    this.rosterPicker = new RosterPicker(hudRoot);
    /** A game's lobby: your character in it (one per class), and who you play with. */
    this.lobby = new GameLobby(hudRoot, {
      party: () => this.party,
      heroes: (roster) => this.rosterHeroes(roster),
      characters: (gameId) => this.charactersIn(gameId),
      modelOf: (look) => LOOKS[look]?.path ?? null,
      loadGLB: (url) => this._assets.loadGLB(url),
      looks: (classId) => {
        const spec = CLASS_SPECS.find((c) => c.id === classId);
        const ids = [...new Set([...(spec?.looks ?? []), ...Object.keys(LOOKS)])];
        return ids.filter((id) => LOOKS[id]).map((id) => ({ id, label: LOOKS[id].label }));
      },
      custom: (gameId, classId) => this._customOf(this.scopeOf(gameId, classId)),
      lastHero: (gameId) => this.heroOf(gameId),
      start: (game, choice, options) => this.startFromLobby(game, choice, options),
      closed: () => {}
    });
    // Someone joined or left the party: the lobby shows it (and the host tells newcomers the game).
    queueMicrotask(() => this.party?.on('change', () => this.lobby.onPartyChange()));
    this.story = new StoryPanel(hudRoot);
    this.goalPill = document.createElement('div');
    this.goalPill.className = 'level-goal';
    this.goalPill.hidden = true;
    hudRoot.appendChild(this.goalPill);

    /* ---- items, portals, NPCs ---- */
    this.labels = new WorldLabels(hudRoot);
    this.profile = new Profile();
    this.profile.on('stats', () => this._applyProfileStats());
    this.profile.on('slots', () => this._syncSlots());
    this.profile.on('change', () => this.hud.setPotions(this.profile.potions));
    this.hud.setPotions(this.profile.potions);
    // Rage: tier-1 physical skills build it per monster they hit; being hit does too.
    this.combat.on('hit', (_monster, _amount, info) => {
      const gain = info.element === 'weapon' ? 2 : ELEMENT_META[info.element]?.rage ?? 0;
      if (gain > 0) this._gainRage(gain);
    });
    this.monsters.on('playerHit', (_amount, source) => {
      // A rival's shot at another rival is nobody's here; in a party, a hit on someone else is theirs.
      if (isRivalTarget(source?.playerId)) return;
      if (source?.playerId && this.party?.id && source.playerId !== this.party.id) return;
      this._gainRage(4);
      // Thorns: whatever hits you in melee takes some back.
      const thorns = this.profile.stats.thorns;
      if (thorns > 0 && source?.monster && !source.ranged) this.combat.thorns(source.monster, thorns);
    });
    this.profile.on('level', ({ level, bagGrew }) => {
      this.hud.showToast(`Level ${level}!${bagGrew ? ' Your bag grew a row.' : ''}`, 3200);
      this.flash.trigger?.(getColor('#ffe27a'), 0.3);
    });
    this.profile.on('bag', () => this.inventory.isOpen && this.inventory.render());
    // Worn gear shows on the character (helmet, shield, cloak, quiver).
    this.profile.on('gear', () => this._wearGear());
    this.mainMenu.setProfile(this.profile);
    this.loot = new LootSystem(this.scene, this.labels);
    this.loot.onPickup = (item) => {
      // Signed in: loot is the server's. The bag takes it at once (the same
      // rules run here), and the server decides whether it is really ours.
      if (this.sync?.active) {
        if (!item.srv) return { ok: false, message: "This loot is not recorded on the server (the host isn't signed in)" };
        const can = this.profile.canPickUp(item);
        if (!can.ok) {
          this.hud.showToast(can.message);
          return can;
        }
        const result = this.profile.pickUp(item);
        this.sync.take(item.uid).then((r) => {
          if (r.ok) this.party.send({ t: 'taken', uid: item.uid, by: this.party.id });
          else this.hud.showToast(r.error ?? 'Someone else got there first', 2200);
        });
        if (item.type !== 'gold' && item.type !== 'potion') (window.requestIdleCallback ?? setTimeout)(() => itemThumbnails.of(item));
        this._pickedUp(item, result);
        return result;
      }
      // In a party the host hands out the loot: a guest asks, and hears back.
      if (this.party.isGuest) {
        const can = this.profile.canPickUp(item);
        if (!can.ok) {
          this.hud.showToast(can.message);
          return can;
        }
        this.party.requestTake(item);
        return { ok: true, message: '' };
      }
      const result = this.profile.pickUp(item);
      // Draw its picture for the bag now, while nothing is happening, not when the bag opens.
      if (result.ok && item.type !== 'gold' && item.type !== 'potion') (window.requestIdleCallback ?? setTimeout)(() => itemThumbnails.of(item));
      if (result.ok) this.party.announceTaken(item.uid);
      this._pickedUp(item, result);
      return result;
    };
    this.portals = new PortalSystem(this.scene, this.labels);
    this.portals.onEnter = (portal) => this._enterPortal(portal);
    this.npcs = new NpcSystem(this.scene, this.labels, this.catalog);
    this.npcBrain = new NpcBrain();
    this.dialogue = new DialoguePanel(hudRoot);
    this.inventory = new InventoryPanel(hudRoot, this.profile, {
      onEquip: (item, slotId) => this._equipItem(item, slotId),
      onUnequip: (slotId, at) => this._unequipGear(slotId, at),
      onRead: (item) => this.hud.showToast((item.type === 'bag' ? this.profile.useBagUpgrade(item.uid) : this.profile.read(item.uid)).message, 2600),
      onMessage: (text) => this.hud.showToast(text, 2400),
      onOpenBag: () => (this.phase === 'playing' ? this._openPanel('inventory') : this.inventory.toggle(true)),
      // A hero's bag opened from "My heroes": closing it puts the arena's hero back, and that page.
      onToggle: (open) => {
        if (open || !this._editing) return;
        const { gameId } = this._editing;
        this._editing = null;
        this.leaveGameScope().then(() => {
          this.openHome();
          this.heroesPanel.open(gameId);
        });
      },
      // Dragging something out of the bag drops it at your feet — only in a fight, where there is ground.
      canDrop: () => this.phase === 'playing',
      onDrop: (item) => {
        const removed = this.profile.remove(item.uid, { worn: true });
        if (removed && this.sync?.active) this.sync.drop(item.uid);
        if (removed && this.phase === 'playing') this.loot.drop([removed], this.character.position, (x, z) => this.world.heightAt?.(x, z) ?? 0, { byPlayer: true });
      }
    });
    this.skillPanel = new SkillTreePanel(hudRoot, this.profile, {
      onMessage: (text) => this.hud.showToast(text, 2400)
    });
    this.talkPrompt = document.createElement('div');
    this.talkPrompt.className = 'talk-prompt';
    this.talkPrompt.hidden = true;
    hudRoot.appendChild(this.talkPrompt);
    this.gameMenu = new GameMenuButton(hudRoot, {
      onPause: () => this.togglePause(),
      onExit: () => this.exitToMenu(),
      onAutoDrink: (on) => this.setAutoDrink(on)
    });
    this.gameMenu.setAutoDrink(this.autoDrink);
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

    /* ---- playing together ----
       One player hosts the fight; the others play in it. See net/Party.js. */
    this.party = new Party(this);

    /* ---- accounts: signed in, the character is the server's (net/ProfileSync.js) ---- */
    this.account = new Account();
    this.sync = new ProfileSync(this.profile);
    this.sync.on('blocked', (message) => {
      this.hud.showToast(message, 8000);
      this._signedOut();
    });
    this.sync.on('signedOut', () => this._signedOut());
    this.mainMenu.bindAccount(this.account, {
      signIn: (name, password) => this._signIn('login', name, password),
      signUp: (name, password) => this._signIn('register', name, password),
      signOut: async () => {
        await this.account.logout();
        this._signedOut();
      },
      history: () => this.account.history()
    });
    this.mainMenu.bindParty(this.party);
    this.gameHud.onChat = (text) => this.party.say(text);
    this.monsters.on('attack', (monster, attack, target) => {
      if (this.party.isHost) this.party.send({ t: 'a', id: monster.id, sp: attack.splash ?? 0, r: attack.ranged ? 1 : 0, tx: Math.round(target.x * 100) / 100, tz: Math.round(target.z * 100) / 100 });
    });
    // The host's monsters hit a guest: tell them; their own game takes the damage.
    this.monsters.on('playerHit', (amount, source) => {
      if (!this.party.isHost || !source?.playerId || source.playerId === this.party.id || isRivalTarget(source.playerId)) return;
      this.party.sendTo(source.playerId, { t: 'hit', a: Math.round(amount * 10) / 10, x: source.position?.x, z: source.position?.z, r: source.ranged ? 1 : 0, b: source.burning ? 1 : 0, m: source.monster?.id ?? null });
    });
    this.profile.on('gear', () => this.party.sendMeta());

    this._bindEvents();
    this.selectAbility(ELEMENTS[0], { silent: true });
    // Whoever the platform starts as, their spells go on the bar.
    const startId = platform.getActiveCharacter()?.id ?? 'caster';
    this.profile.setClass(startId, classBonuses(startId), classArmor(startId));

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
    this.hud.onEmptySlot = () => {
      if (this.phase === 'playing') this._openPanel('skills');
    };
    // The action bar: potions on keys, keys swapped by dragging, a picker per key.
    this.hud.onPotion = (kind) => this.phase === 'playing' && this._drink(kind);
    this.hud.onMoveSlot = (from, to) => {
      const entry = this.profile.slots[from];
      if (entry) this.profile.setSlot(to, entry);
    };
    this.hud.onSetSlot = (index, entry) => this.profile.setSlot(index, entry);
    this.hud.onClearSlot = (index) => this.profile.clearSlot(index);
    this.hud.getSlotChoices = () =>
      treeSpells(this.profile.classId)
        .filter((el) => this.profile.knows(el))
        .map((el) => ({ element: el, label: ELEMENT_META[el]?.label ?? el, accent: ELEMENT_META[el]?.accent }));

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

    locomotion.onFootstep = (position, speed) => this._footstep(position, speed);

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

  /** Dust under a foot — yours, or another player's. */
  _footstep(position, speed) {
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
  }

  /** The run's events → the run's readout. Nothing else listens to these. */
  _bindRun() {
    this.director.on('kill', (monster) => {
      // Only the host's director kills; the party hears about it from there.
      this.party.onLocalKill(monster);
      const wave = this.director.wave || 1;
      // The same experience the server will grant, so the bar moves now.
      this.profile.addXp(Math.round((XP_FOR[monster.kind] ?? 6) * (1 + (wave - 1) * 0.05)));
      if (this.sync.active) this._serverLoot(monster, wave);
      else this._dropLoot(monster);
      if (this.npcs.onKill(monster.kind)) this._updateGoalPill();
      this._onRunEvent('kill', monster);
    });
    this.director.on('waveCleared', (wave) => {
      this._onRunEvent('waveCleared', wave);
      this.party.announceRun('cleared', { w: wave });
    });
    this.director.on('wave', (wave) => this._onRunEvent('wave', wave));
    this.director.on('wave', (wave, count) => {
      this.gameHud.setWave(wave);
      this.gameHud.showBanner(`Wave ${wave}`, `${count} incoming`);
      this.party.announceRun('wave', { w: wave, n: count });
    });

    this.director.on('breather', (next, seconds) => {
      this.gameHud.showBanner('Clear', `Wave ${next} in ${Math.round(seconds)}s`, 2.0);
      this.party.announceRun('breather', { w: next, s: Math.round(seconds) });
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
      this.party.announceRun('boss', { label: monster.label });
    });
  }

  _handleAction(action, slot) {
    // The editor reads the keyboard itself; nothing here may fire while it is open.
    if (this.phase === 'editor') return;
    if (this.phase === 'menu' && action !== 'toggleWeapons' && action !== 'cancel') return;

    switch (action) {
      case 'ability': {
        const element = this.profile.slots[slot];
        if (!element) {
          this.hud.showToast(`Key ${slot + 1} is empty — click it on the bar to put a skill or a potion there`, 2400);
          break;
        }
        const potion = potionOf(element);
        if (potion) {
          if (this.phase === 'playing') this._drink(potion);
          break;
        }
        // Pressing the *same* key again puts an armed cast away, as it does in a
        // MOBA; pressing a different one swaps the slot without disarming.
        if (this.aim.isArmed && element === this.element) this.aim.cancel();
        else this.armAbility(element);
        break;
      }
      case 'cancel':
        if (this.weaponPanel.isVisible) this.weaponPanel.hide();
        else if (this.skillPanel.isOpen) this.skillPanel.toggle(false);
        else if (this.inventory.isOpen) this.inventory.toggle(false);
        else this.aim.cancel();
        break;
      case 'jump':
        this.character.locomotion.jump();
        this.party.jumped();
        break;
      case 'chat':
        if (this.phase === 'playing' && this.party.inParty) this.gameHud.focusChat();
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
        if (this.party.canSpawn) this.director.nextWave();
        break;
      case 'summon':
        if (this.party.canSpawn) this.monsters.spawn(this.monsters.randomKind());
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
        if (this.phase === 'playing') this._openPanel('inventory');
        return;
      case 'reload':
        if (this.phase === 'playing') this._reload();
        return;
      case 'toggleSkills':
        if (this.phase === 'playing') this._openPanel('skills');
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

  /** The fire profile of the weapon in hand (null: a melee weapon). */
  get currentFire() {
    return fireProfileOf(platform.getActiveWeapon());
  }

  /**
   * Pull the trigger (or throw): ammo, reload, aim, animation. Left click
   * calls it; holding the button keeps an automatic weapon firing.
   */
  _fireWeapon(fire = this.currentFire) {
    if (!fire || this._attackCooldown > 0 || this._reloadLeft > 0) return;
    const weaponId = platform.getActiveWeaponId();
    const mag = fire.mag ?? 0;
    if (mag > 0) {
      const left = this._ammo.get(weaponId) ?? mag;
      if (left <= 0) return this._reload(fire);
      this._ammo.set(weaponId, left - 1);
    }
    this.character.locomotion.toggleSit(false);
    const lock = this._scope > 0.7 && this._scopeTarget?.isTargetable ? this._scopeTarget : null;
    const aim = () => {
      const p = this.character.position;
      const yaw = lock ? Math.atan2(lock.position.x - p.x, lock.position.z - p.z) : this.aim.facing;
      const direction = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      // From the hands: a gun at chest height, a throw from the shoulder.
      const muzzle = this.character.position.clone().addScaledVector(direction, 0.6);
      muzzle.x += Math.cos(yaw) * 0.12;
      muzzle.z -= Math.sin(yaw) * 0.12;
      muzzle.y = fire.anim === 'throw' ? 1.55 : 1.3;
      // How far the cursor is: lobbed grenades and bombs land there.
      const hit = lock ? lock.position : this.aim._hit;
      const distance = Math.hypot(hit.x - this.character.position.x, hit.z - this.character.position.z);
      return { muzzle, direction, yaw, distance };
    };
    const shot = aim();
    this.character.setFacing(shot.yaw);
    // Through a steady scope a shot goes exactly where the crosshair is.
    const steady = this._scope > 0.7 ? { ...fire, spread: 0 } : fire;
    this.weaponFire.fire(shot.muzzle, shot.direction, steady, aim, shot.distance);
    this.party.sendShot(shot.muzzle, shot.direction, weaponId, shot.distance, this._scope > 0.7);
    this._attackCooldown = fire.cooldown + (fire.burst > 1 ? (fire.burst - 1) * 0.07 : 0);
    // A held automatic does not restart the clip every round.
    if (!fire.auto || !this.character.isCasting) this.character.playCast(fire.anim ?? 'shoot2');
    if (mag > 0 && this._ammo.get(weaponId) <= 0) this._reload(fire);
  }

  _reload(fire = this.currentFire) {
    if (!fire?.mag || this._reloadLeft > 0) return;
    if ((this._ammo.get(platform.getActiveWeaponId()) ?? fire.mag) >= fire.mag) return;
    this._reloadLeft = fire.reload ?? 1.5;
    this._reloadFor = platform.getActiveWeaponId();
    this.character.playCast(fire.anim === 'shoot1' ? 'reload1' : 'reload2');
  }

  /** Reload countdown and held-trigger fire, every frame. */
  _updateWeapon(dt) {
    if (this._reloadLeft > 0) {
      this._reloadLeft -= dt;
      if (this._reloadFor !== platform.getActiveWeaponId()) this._reloadLeft = 0;
      else if (this._reloadLeft <= 0) this._ammo.set(this._reloadFor, this.currentFire?.mag ?? 0);
    }
    const fire = this.currentFire;
    if (fire?.auto && this.input.attackHeld && !this.paused && !this.weaponPanel.isVisible && !this.dialogue.isOpen) this._fireWeapon(fire);
  }

  /**
   * Hold V with a scoped weapon (sniper rifle, DMR, musket, railgun,
   * longbow…): the view zooms and slides out to the cursor, shots go exactly
   * where the crosshair is (no spread), and you move at half speed.
   */
  _updateScope(dt) {
    const fire = this.phase === 'playing' ? this.currentFire : null;
    const want =
      Boolean(fire?.scope) && this.input.keys.has('KeyV') && !this.paused &&
      !this.weaponPanel.isVisible && !this.dialogue.isOpen && !this.inventory.isOpen && !this.skillPanel.isOpen;
    this._scope = MathUtils.clamp(this._scope + (want ? dt : -dt) / 0.16, 0, 1);
    const zoom = fire?.scope ?? this._scopeZoom ?? 1;
    if (fire?.scope) this._scopeZoom = fire.scope;
    // Scoping in zooms onto the spot the cursor points at, and the view then
    // holds still so the reticle moves over it. Pushing the cursor toward the
    // edge of the scope pans, gently. (A view that tracked the cursor would
    // throw the target past it with every small move at 3× zoom.)
    const ptr = this.input.pointer;
    const me = this.character.position;
    if (want && !this._scopeHeld) {
      this._scopeCenter = (this._scopeCenter ?? new Vector3()).copy(this.aim._hit);
      this._scopeCenter.y = 0;
    }
    this._scopeHeld = want;
    if (want && this._scopeCenter) {
      const edge = Math.max(0, Math.hypot(ptr.x, ptr.y) - 0.6);
      if (edge > 0) {
        _scopeAhead.copy(this.aim._hit).setY(0).sub(this._scopeCenter);
        const len = _scopeAhead.length();
        if (len > 0.01) this._scopeCenter.addScaledVector(_scopeAhead, Math.min(1, (edge * 28 * dt) / len));
      }
      // Never further out than the weapon reaches.
      _scopeAhead.copy(this._scopeCenter).sub(me).setY(0);
      const far = (fire?.range ?? 40) * 1.05;
      if (_scopeAhead.length() > far) this._scopeCenter.copy(me).setY(0).addScaledVector(_scopeAhead.normalize(), far);
    }
    this.rig.setScope(this._scope, this._scopeCenter ?? me, zoom);
    if (this.character?.locomotion) this.character.locomotion.speedBonus = (this._speedBonus ?? 1) * (1 - 0.5 * this._scope);
    if (this._scope > 0.5) {
      const t = this._scopeTarget;
      this.character.setFacing(t ? Math.atan2(t.position.x - this.character.position.x, t.position.z - this.character.position.z) : this.aim.facing);
    }

    const at = { x: ((ptr.x + 1) / 2) * innerWidth, y: ((1 - ptr.y) / 2) * innerHeight };
    const hit = this.aim._hit;
    // What is under the crosshair: the monster whose body is nearest the
    // cursor on screen. Through a long, low view the ground under the cursor
    // lies far behind whatever it is pointing at, so a scoped shot aims at
    // the body itself.
    let target = null;
    this._scopeTarget = null;
    if (this._scope > 0.02) {
      const toScreen = (v) => ({ x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight, behind: v.z > 1 });
      let best = Infinity;
      for (const m of this.monsters.active) {
        if (!m.isTargetable) continue;
        // The body on screen, feet to head, and how wide it looks there.
        const r = m.hitRadius ?? 0.6;
        const feet = toScreen(_scopeLook.copy(m.position).project(this.camera));
        const head = toScreen(_scopeLook.copy(m.position).setY(m.position.y + r * 2.6).project(this.camera));
        if (feet.behind || head.behind) continue;
        const side = toScreen(_scopeLook.copy(m.position).addScaledVector(_scopeAhead.set(1, 0, 0), r).project(this.camera));
        const width = Math.max(18, Math.hypot(side.x - feet.x, side.y - feet.y) * 1.2);
        const sx = head.x - feet.x, sy = head.y - feet.y;
        const t = MathUtils.clamp(((at.x - feet.x) * sx + (at.y - feet.y) * sy) / Math.max(1, sx * sx + sy * sy), 0, 1);
        const d = Math.hypot(feet.x + sx * t - at.x, feet.y + sy * t - at.y) / width;
        if (d < 1 && d < best) {
          best = d;
          this._scopeTarget = m;
        }
      }
      const m = this._scopeTarget;
      if (m) target = `${m.config?.label ?? m.kind}${m.maxHealth ? ` · ${Math.max(0, Math.round((m.health / m.maxHealth) * 100))}%` : ''}`;
    }
    this.scopeOverlay.update(this._scope, at, {
      zoom,
      distance: this._scopeTarget ? me.distanceTo(this._scopeTarget.position) : Math.hypot(hit.x - me.x, hit.z - me.z),
      range: fire?.range ?? 99,
      target,
      reloading: this._reloadLeft > 0
    });
  }

  /** Left click — direct attack toward the cursor. */
  _confirmAttack(pointer) {
    if (this.phase !== 'playing' || this.paused) return;
    if (this.weaponPanel.isVisible) return;
    // A gun, bow or throwing weapon fires; a melee weapon swings below.
    const fire = this.currentFire;
    if (fire) {
      this.aim.point(pointer);
      this.aim.cancel();
      this._fireWeapon(fire);
      return;
    }
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
    this.party.sendAttack(yaw, attack.castAnim ?? 'cast2');

    _castPoint.copy(this.character.position).setY(0);
    const hits = this.combat.melee(_castPoint, _castDirection, attack);
    this._attackCooldown = attack.cooldown ?? 0.42;

    if (hits > 0) {
      this.hud.showToast(attack.label);
      this._gainRage(Math.min(18, hits * 6));
    }
  }

  /** Right click on the arena — arm (if needed) and fire the selected ability. */
  _confirmCast(pointer) {
    if (this.phase !== 'playing' || this.paused) return;
    if (this.weaponPanel.isVisible) return;

    this.aim.point(pointer);
    if (!this.aim.isArmed && castShapeOf(this.element) === CastShape.SELF) {
      if (this._canCast(this.element)) this._fireSelf(this.element);
      return;
    }
    if (!this.aim.isArmed && this._rageCost(this.element) > this.rage) {
      this._canCast(this.element);
      return;
    }
    if (!this.aim.isArmed) {
      if ((this.cooldowns.get(this.element) ?? 0) > 0) {
        this.hud.showToast('Not ready');
        return;
      }
      this.aim.arm();
    }
    this.aim.confirm();
  }

  /** Register every saved forged class, then show them in the menu. */
  async _seedLibrary() {
    try {
      await this._forgedReady;
      const seeded = await library.seedOfficial(this.levels);
      if (!seeded) return;
      for (const entry of await listForgedClasses()) {
        if (!(await library.get(`class:${entry.id}`)).error) continue;
        const design = normalizeDesign(await loadForgedClass(entry.id), { id: entry.id });
        await library.publishClass({ ...design, author: design.author ?? OFFICIAL_AUTHOR }, skillIds(design), 'shared');
      }
    } catch (error) {
      console.warn('[library]', error.message);
    }
  }

  async _loadForgedClasses() {
    for (const entry of await listForgedClasses()) {
      try {
        const design = normalizeDesign(await loadForgedClass(entry.id), { id: entry.id });
        registerForgedClass(design, { abilities: this.abilities });
        this.forgedDesigns.set(entry.id, design);
      } catch (error) {
        console.warn(`[forge] ${entry.id}: ${error.message}`);
      }
    }
    this.mainMenu._buildCharacters();
  }

  /** Cooldown and Rage both allow it; says why not if they don't. */
  _canCast(element) {
    // The short pause after any cast: quietly not yet.
    if (this._gcd > 0) return false;
    if ((this.cooldowns.get(element) ?? 0) > 0) {
      this.hud.showToast('Not ready');
      return false;
    }
    const mana = this._manaCost(element);
    if (mana > this.mana) {
      this.hud.showToast(`Needs ${mana} mana — wait, or drink a mana potion (Z)`);
      return false;
    }
    const cost = this._rageCost(element);
    if (cost > this.rage) {
      this.hud.showToast(`Needs ${cost} Rage — land hits to build it`);
      return false;
    }
    return true;
  }

  /** Mana a skill costs this character now (0 for a Rage class). */
  _manaCost(element) {
    return this.usesRage ? 0 : manaCost(element, this.profile.rank(element), { rage: false });
  }

  /** Rage a skill costs (0 for builders and every spell). */
  _rageCost(element) {
    const rage = ELEMENT_META[element]?.rage ?? 0;
    return rage < 0 ? -rage : 0;
  }

  /** Does the class being played fight with Rage? */
  get usesRage() {
    return treeFor(this.profile.classId).resource === 'rage';
  }

  _gainRage(amount) {
    if (!this.usesRage || amount <= 0 || this.phase !== 'playing') return;
    this.rage = Math.min(100, this.rage + amount);
    this._rageIdle = 0;
  }

  /** Battle Roar: everything you do hits harder for a few seconds. */
  _buffMultiplier() {
    return this._roarUntil > this.elapsed ? 1 + (this._roarBuff ?? 0) / 100 : 1;
  }

  /** A self cast: on the body, facing where it faces. */
  _fireSelf(element) {
    const yaw = this.character.facing;
    const origin = this.character.position.clone().setY(0);
    const direction = origin.clone().set(Math.sin(yaw), 0, Math.cos(yaw));
    this._fire(element, origin, direction, 0, yaw);
  }

  /**
   * Something was taken off the ground. It goes in the bag and stays there
   * — nothing is put on for you; the Bag button counts what is new until
   * the bag is opened. A full bag leaves it on the ground (items/Loot.js).
   */
  _pickedUp(item, result) {
    const toBag = result.ok && item.type !== 'gold' && item.type !== 'potion';
    if (toBag) {
      this.inventory.markNew();
      this.hud.showToast(`${item.name} — in your bag (Tab)`, 1800);
    } else if (result.message) this.hud.showToast(result.message, result.ok ? 1600 : 3200);
  }

  /** The bag (Tab) and the skill tree (K) share the screen: one at a time. */
  _openPanel(which) {
    const panel = which === 'skills' ? this.skillPanel : this.inventory;
    const other = which === 'skills' ? this.inventory : this.skillPanel;
    other.toggle(false);
    panel.toggle();
  }

  /**
   * What is on keys 1–9 changed (class switch, a book read, a key set or
   * moved): rebuild the bar, and if the armed spell left it, move to one
   * that is on it.
   */
  _syncSlots() {
    const slots = this.profile.slots;
    this.hud.setPotions(this.profile.potions);
    this.hud.setSlots(slots);
    this.inventory?.renderBelt();
    if (!slots.includes(this.element)) {
      if (this.aim.isArmed) this.aim.cancel();
      const first = slots.find(isSkillEntry);
      if (first) this.selectAbility(first, { silent: true });
    }
  }

  togglePause() {
    if (this.phase !== 'playing') return;
    // A party's fight runs on the host's clock; nobody can stop it for the others.
    if (this.party.inParty) return this.hud.showToast("Can't pause while playing together", 2000);
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
    this.gameMenu.setPaused(this.paused);
    this.hud.showToast(this.paused ? 'Paused' : 'Resumed');
  }

  /** Apply main-menu selections and start the run. */
  async enterGame({ characterId: forced = null, keepRun = false, fromParty = false } = {}) {
    // A guest joins the host's fight; they do not start their own.
    if (this.party.isGuest && !fromParty) return this.party.requestStart();
    const { characterId, weaponId } = this.mainMenu.getSelection();
    // The monsters' models, if they are still on their way (never more than a few seconds).
    await Promise.race([this.monsterModelsReady, new Promise((r) => setTimeout(r, 8000))]);
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
    this.rage = 0;
    this._roarUntil = 0;
    this.auras.clear();
    this._gcd = 0;
    this._spinUntil = 0;
    this._dashState = null;

    this.phase = 'playing';
    this.input.enabled = true;
    this.mainMenu.hide();
    this.hud.setGameplayVisible(true);
    this.gameHud.setVisible(true);
    this.gameMenu.show();
    document.body.classList.remove('is-menu');
    this.hud.showToast('Fight!');
    this.party.onEnterGame({ fromParty, keepRun, level: this.world === this.composed ? this.composed.level : null });
    // Signed in: the server opens this fight so it can check what happens in it.
    // A guest joins the host's instead (the host sends its id).
    if (this.sync.active && !this.party.isGuest) {
      // An unsaved level (a play test, a builder draft) is not on the server: play it on the open rules.
      const level = this.run && !this.run.fromEditor && !this.run.draft ? this.run.level.id : null;
      this.sync.startRun(level).then((r) => {
        if (r.ok) this.party.setRunId(r.runId);
        else this.hud.showToast(`The server could not open this game: ${r.error}`, 3000);
      });
    }
  }

  /** Leave the arena and return to loadout selection (or to the editor, after a play test). */
  exitToMenu({ fromParty = false } = {}) {
    this.auras.clear();
    // Back to the arena's character, unless the game goes straight on (next chapter, play again).
    if (!fromParty) this.leaveGameScope();
    this.royale?.stop();
    const backToEditor = this.run?.fromEditor;
    this.party.onExitGame({ fromParty });
    if (this.sync.active) this.sync.endRun();
    this._endRun();
    this.inventory.setBeltVisible(false);
    this.inventory.toggle(false);
    this.skillPanel.toggle(false);
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
    this._showMenuView();
  }

  /** Between games: the home page, or the hero menu if that is where the player was. */
  _showMenuView() {
    if (this._menuView === 'hero') {
      this.home.hide();
      this.mainMenu.show();
    } else {
      this.mainMenu.hide();
      this.home.show();
    }
  }

  /** The platform's front page. */
  openHome() {
    this._menuView = 'home';
    this._showMenuView();
  }

  /**
   * The action RPG's own menu — class, weapon, skills, parties, account — at a panel.
   * @param {'loadout'|'party'|'account'|'campaign'|'create'} [panel]
   */
  openHero(panel = 'loadout') {
    this._menuView = 'hero';
    this._showMenuView();
    this.mainMenu._switchPanel(panel);
  }

  /**
   * Play a game from the home page: an official one (a level file, and the
   * campaign after it), or a published one (its levels from the database).
   * @param {string} id a game id (server/gamesStore.js)
   * @param {{ heroId?: string|null }} [options] the class to play, unless the game sets one
   */
  async playGame(id, { hero = null, custom = null } = {}) {
    const game = await games.get(id);
    // This game's own character for the class: chosen in the lobby (or here, the first time).
    if (!(await this.enterGameScope({ id, title: game.title, roster: game.roster ?? [], hero, custom }))) return;
    games.play(id);
    if (game.official) return this.playCampaignLevel(game.levels[0]);
    const levels = game.levels;
    // Published levels are on the server too, so a signed-in run checks their rewards (not a draft).
    this.drafts = { levels: new Map(levels.map((level) => [level.id, level])), campaign: levels.map((level) => ({ id: level.id, name: level.name })), saved: true };
    await this.playCampaignLevel(levels[0].id);
  }

  /* ---- a character per game, per class ---- */

  /** Where a character lives: the arena, or `<game>#<class>` — each class its own character in each game. */
  scopeOf(gameId, classId) {
    return gameId === 'arena' ? 'arena' : `${gameId}#${classId}`;
  }

  /** How a player customized a class in a game (body, colours), or null. */
  _customOf(scope) {
    try {
      return JSON.parse(localStorage.getItem(`elemental-arena.look@${scope}`) ?? 'null');
    } catch {
      return null;
    }
  }

  _saveCustom(scope, custom) {
    try {
      localStorage.setItem(`elemental-arena.look@${scope}`, JSON.stringify(custom ?? {}));
    } catch {
      /* private mode */
    }
  }

  /** Put a customization on a class (the body, two colours), without making it the arena's. */
  async _applyCustom(classId, custom) {
    if (!custom) return;
    if (custom.look && LOOKS[custom.look]) await this.setLook(classId, custom.look, { remember: false });
    const patch = {};
    if (custom.tint) patch.tint = custom.tint;
    if (custom.cloth) patch.clothColor = custom.cloth;
    if (Object.keys(patch).length) {
      const next = platform.setAppearance(patch, classId);
      if (platform.getActiveCharacter()?.id === classId) this.character.applyAppearance(next);
    }
  }

  /** Every hero this player has in any game: from the server signed in, else from this browser. */
  async allHeroes() {
    if (this.sync.active) {
      const response = await fetch('./api/game/heroes');
      return response.ok ? (await response.json()).heroes ?? [] : [];
    }
    const out = [];
    const prefix = `${Profile.storageKey('arena')}@`;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const scope = key.slice(prefix.length);
        const at = scope.lastIndexOf('#');
        if (at < 1 || scope.startsWith('draft#')) continue;
        const data = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (!data) continue;
        out.push({ game: scope.slice(0, at), classId: scope.slice(at + 1), level: data.level ?? 1, gold: data.gold ?? 0, worn: Object.values(data.gear ?? {}).filter((g) => g?.name).map((g) => g.name), bag: Array.isArray(data.bag) ? data.bag.length : 0 });
      }
    } catch {
      /* private mode: nothing kept */
    }
    return out;
  }

  /** The free-play arena's hero, for "My heroes". */
  arenaHero() {
    const p = this.profile.scope === 'arena' ? this.profile : null;
    return { classId: this.mainMenu.getSelection().characterId, level: p?.level ?? 1, gold: p?.gold ?? 0, worn: p ? Object.values(p.gear ?? {}).filter((g) => g?.name).map((g) => g.name) : [] };
  }

  /**
   * Open the bag of one of your heroes from "My heroes": become that game's
   * character (its own bag and gear, never another game's), show the bag;
   * closing it comes back (the inventory's `onToggle`).
   */
  async editHero(gameId, classId) {
    const game = await games.get(gameId).catch(() => null);
    if (!(await this.enterGameScope({ id: gameId, title: game?.title ?? '', roster: game?.roster ?? [], hero: classId }))) return;
    this._editing = { gameId, classId };
    this.home.hide();
    this.inventory.toggle(true);
  }

  /** This player's characters in a game, one per class: from the server signed in, else this browser. */
  async charactersIn(gameId) {
    if (this.sync.active) {
      const response = await fetch(`./api/game/characters?game=${encodeURIComponent(gameId)}`);
      return response.ok ? (await response.json()).characters ?? [] : [];
    }
    const out = [];
    for (const spec of CLASS_SPECS) {
      try {
        const data = JSON.parse(localStorage.getItem(Profile.storageKey(this.scopeOf(gameId, spec.id))) ?? 'null');
        if (data) out.push({ classId: spec.id, level: data.level ?? 1, gold: data.gold ?? 0 });
      } catch {
        /* skip */
      }
    }
    return out;
  }

  /** The home page's Play: the game's lobby. */
  async openLobby(id) {
    const game = await games.get(id);
    if (game.engine === 'market') return this.openMarket(game);
    if (game.engine === 'work') return this.openWork(game);
    if (game.engine === 'rts') return this.openRts(game);
    if (game.engine === 'moba') return this.openMoba(game);
    if (game.engine === 'mmo') return this.openMmo(game);
    if (game.engine === 'city') return this.openCity(game);
    if (game.engine === 'fps') return this.openFps(game);
    if (game.engine === 'squad') return this.openSquad(game);
    await this.lobby.open({ id, title: game.title, roster: game.roster ?? [], genre: game.genre });
  }

  /** The stock market game: its own screen over the home page (loaded the first time). */
  async openMarket(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { MarketGame } = await import('../market/MarketGame.js');
    this.home.closePage();
    const view = new MarketGame(document.body, { account: this.account?.user ?? null, onClose: () => this.home.refresh?.() });
    await view.open();
    return view;
  }

  /** Work Life: its own screen over the home page (loaded the first time). */
  async openWork(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { WorkGame } = await import('../work/WorkGame.js');
    this.home.closePage();
    const view = new WorkGame(document.body, { account: this.account?.user ?? null, onClose: () => this.home.refresh?.() });
    await view.open();
    return view;
  }

  /**
   * Shardfront, the strategy game: its own screen and its own 3D view over
   * the home page (loaded the first time). The platform's own drawing stops
   * while it is open, so the two don't share the GPU.
   */
  async openRts(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { RtsGame } = await import('../rts/RtsGame.js');
    this.home.closePage();
    this.stop();
    const view = new RtsGame(document.body, {
      account: this.account?.user ?? null,
      onClose: () => {
        this.start();
        this.home.refresh?.();
      }
    });
    await view.open();
    return view;
  }

  /** Lanebreak, the battle arena: its own screen and 3D view, like Shardfront. */
  async openMoba(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { MobaGame } = await import('../moba/MobaGame.js');
    this.home.closePage();
    this.stop();
    const view = new MobaGame(document.body, {
      account: this.account?.user ?? null,
      onClose: () => {
        this.start();
        this.home.refresh?.();
      }
    });
    await view.open();
    return view;
  }

  /** Hearthvale, the online RPG: its own screen and 3D view; the server runs its worlds. */
  async openMmo(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { MmoGame } = await import('../mmo/MmoGame.js');
    this.home.closePage();
    this.stop();
    const view = new MmoGame(document.body, {
      account: this.account?.user ?? null,
      onClose: () => {
        this.start();
        this.home.refresh?.();
      }
    });
    await view.open();
    return view;
  }

  /** Gangnam Drift (Seoul, for real): its own screen and 3D view, streaming the city's buildings as you move. */
  async openCity(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { SeoulGame } = await import('../city/SeoulGame.js');
    this.home.closePage();
    this.stop();
    const view = new SeoulGame(document.body, {
      account: this.account?.user ?? null,
      onClose: () => {
        this.start();
        this.home.refresh?.();
      }
    });
    await view.open();
    return view;
  }

  /** Bastion Squad: co-op against the dead, its own screen — Grave Purge (raise a squad, clear the land) or Hold the Outpost (waves). */
  async openSquad(game, mode = 'purge') {
    games.play?.(game.id)?.catch?.(() => {});
    const { SquadGame } = await import('../squad/SquadGame.js');
    const { PurgeGame } = await import('../squad/purge/PurgeGame.js');
    this.home.closePage();
    this.stop();
    const open = async (which) => {
      const Screen = which === 'hold' ? SquadGame : PurgeGame;
      const view = new Screen(document.body, {
        account: this.account?.user ?? null,
        onClose: () => {
          this.start();
          this.home.refresh?.();
        },
        onSwap: (next) => {
          view.close(true);
          open(next);
        }
      });
      await view.open();
      return view;
    };
    return open(mode);
  }

  /** Breachline: a first-person shooter with its own screen, alone or in a room of four. */
  async openFps(game) {
    games.play?.(game.id)?.catch?.(() => {});
    const { FpsGame } = await import('../fps/FpsGame.js');
    this.home.closePage();
    this.stop();
    const view = new FpsGame(document.body, {
      account: this.account?.user ?? null,
      onClose: () => {
        this.start();
        this.home.refresh?.();
      }
    });
    await view.open();
    return view;
  }

  /** The lobby's Start (the host's, or a player alone). */
  async startFromLobby(game, choice, { rivals = null } = {}) {
    this._saveCustom(this.scopeOf(game.id, choice.classId), choice.custom);
    this._royaleRivals = rivals;
    if (this.party.isHost) this.party.send({ t: 'lobby-close' });
    await this.playGame(game.id, { hero: choice.classId, custom: choice.custom });
  }

  /** The character this browser chose for a game, or null (first time there). */
  heroOf(scope) {
    try {
      return localStorage.getItem(`elemental-arena.hero@${scope}`);
    } catch {
      return null;
    }
  }

  _rememberHero(scope, id) {
    try {
      localStorage.setItem(`elemental-arena.hero@${scope}`, id);
    } catch {
      /* private mode: asked again next time */
    }
  }

  /**
   * What a game lets players be, as picker cards. `[]` means the built-in
   * classes; a class made in the forge comes with its design, registered here
   * for this game (copied into it when the game was made).
   */
  rosterHeroes(roster = []) {
    const entries = roster.length ? roster : CLASS_SPECS.filter((c) => !c.forged).map((c) => ({ id: c.id }));
    const heroes = [];
    for (const entry of entries) {
      if (entry.design && !platform.characters.get(entry.id)) {
        try {
          registerForgedClass(normalizeDesign(entry.design, { id: entry.id }), { abilities: this.abilities });
        } catch {
          continue;
        }
      }
      if (!platform.characters.get(entry.id)) continue;
      const spec = CLASS_SPECS.find((c) => c.id === entry.id);
      const design = entry.design ?? this.forgedDesigns.get(entry.id);
      heroes.push({ id: entry.id, name: spec?.label ?? design?.name ?? entry.id, icon: spec?.icon ?? design?.icon, tagline: spec?.tagline ?? design?.tagline });
    }
    return heroes;
  }

  /**
   * Become a player of this game: its own character, never another game's.
   * The first time, the player chooses who to be from the game's roster.
   * @param {{ id: string, title?: string, roster?: object[], hero?: string|null }} game `hero`: play as this, no question
   * @returns {Promise<boolean>} false when the player backed out of choosing
   */
  async enterGameScope({ id, title = '', roster = [], hero = null, custom = null }) {
    const heroes = this.rosterHeroes(roster);
    let chosen = hero ?? this.heroOf(id);
    if (!chosen || (!hero && !heroes.some((h) => h.id === chosen))) {
      chosen = heroes.length === 1 ? heroes[0].id : await this.rosterPicker.choose({ title, heroes });
      if (!chosen) return false;
    }
    if (id !== 'draft') this._rememberHero(id, chosen);
    if (this.profile.scope === 'arena') {
      // The arena's own body and colours, to put back afterwards.
      this._arenaHero = this.mainMenu.getSelection().characterId;
      this._arenaLooks = new Map(CLASS_SPECS.map((c) => [c.id, { look: savedLook(c.id), appearance: { ...platform.getAppearance(c.id) } }]));
    }
    const scope = this.scopeOf(id, chosen);
    await this._switchScope(scope);
    await this.mainMenu.refreshCharacters(chosen);
    await this._applyCustom(chosen, custom ?? this._customOf(scope));
    this.currentGame = { id, title, roster };
    this.home?.updateAccount();
    return true;
  }

  /** Back to the open arena's character (the home page and the hero menu are the arena's). */
  async leaveGameScope() {
    this.currentGame = null;
    if (this.profile.scope === 'arena') return;
    await this._switchScope('arena');
    // The arena's body and colours back on every class a game changed.
    for (const [classId, saved] of this._arenaLooks ?? []) {
      if (saved.look) await this.setLook(classId, saved.look, { remember: false });
      platform.setAppearance(saved.appearance, classId);
    }
    if (this._arenaHero) await this.mainMenu.refreshCharacters(this._arenaHero);
    this.character.applyAppearance?.(platform.getAppearance(platform.getActiveCharacter()?.id));
  }

  async _switchScope(scope) {
    if (this.profile.scope === scope) return;
    if (this.sync.active) {
      // Signed in, the server keeps every game's character: finish this one's, fetch that one's.
      await this.sync.settled();
      this.profile.scope = scope;
      await this.sync.refresh({ force: true });
    } else {
      this.profile.useScope(scope);
    }
    this._applyProfileStats({ refill: true });
    this._syncSlots();
    if (this.inventory?.isOpen) this.inventory.render();
  }

  showMainMenu() {
    this.inventory.setBeltVisible(false);
    this.inventory.toggle(false);
    this.skillPanel.toggle(false);
    this.phase = 'menu';
    this.input.enabled = false;
    this.hud.setGameplayVisible(false);
    this.gameHud.setVisible(false);
    this.gameMenu.hide();
    document.body.classList.add('is-menu');
    this._showMenuView();
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
    this.profile?.setClass(characterId, classBonuses(characterId), classArmor(characterId));

    if (reloadMesh && this._assets && this.character) {
      await this.character.reload(this._assets, character);
      this.character.applyAppearance(platform.getAppearance(characterId));
    }

    if (this.character?.locomotion && character?.wandSide) {
      this.character.locomotion.wandSide = character.wandSide;
    }
    this.party?.sendMeta();
  }

  /** Make "My models" characters wearable, and put saved custom looks back on. */
  _registerMyModels() {
    registerCustomLooks(this.catalog.custom ?? []);
    for (const character of platform.characters.all()) {
      const look = character.classSpec ? savedLook(character.id) : null;
      if (look && CUSTOM_LOOKS[look]) {
        character.look = look;
        character.model = lookModel(look, character.model?.tint);
        Object.assign(character, lookRig(look));
      }
    }
  }

  /**
   * Dress a class in another body (any of the nine KayKit looks), remembered
   * per class in this browser. Reloads the mesh if it is the one on screen.
   */
  /** @param {{ remember?: boolean }} [options] false: just for now (a game's customization), not the arena's choice */
  async setLook(characterId, lookId, { remember = true } = {}) {
    const character = platform.characters.get(characterId);
    if (!character || !character.classSpec || !(LOOKS[lookId] || CUSTOM_LOOKS[lookId])) return;
    character.look = lookId;
    character.model = lookModel(lookId, character.model?.tint);
    Object.assign(character, lookRig(lookId));
    if (remember) saveLook(characterId, lookId);
    if (platform.getActiveCharacter()?.id === characterId && this._assets) {
      await this.character.reload(this._assets, character);
      this.character.applyAppearance(platform.getAppearance(characterId));
    }
    this.party?.sendMeta();
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
    // A two-handed weapon puts a shield or focus away.
    this.profile?.setWeapon(weapon);
    this.weaponPanel.setEquipped(weaponId);
    if (this.phase === 'playing') {
      this.hud.showToast(`${weapon?.label ?? weaponId} equipped`);
    }
    this.party?.sendMeta();
  }

  /** Select an ability and arm it, unless it is still cooling down. */
  armAbility(element = this.element) {
    if (!this.profile.slots.includes(element)) {
      this.hud.showToast(`${ELEMENT_META[element]?.label ?? 'That spell'} is not on your keys — open the skill tree (K)`);
      return;
    }
    if (!this._canCast(element)) return;
    // A shout or a spin needs no aiming: it goes off around you now.
    if (castShapeOf(element) === CastShape.SELF) {
      if (element !== this.element) this.selectAbility(element, { silent: true });
      this.aim.cancel();
      this._fireSelf(element);
      return;
    }
    // Selecting before arming means the arrow is already drawn to the new
    // ability's range on the frame it appears.
    if (element !== this.element) this.selectAbility(element);
    this.aim.arm();
  }

  /**
   * Battle Roar lifts the whole team: everyone within its circle (the caster
   * always) deals more damage for a few seconds, and gets an aura that shows it.
   * Each player's game runs this for every roar — its own, and a teammate's
   * through the party — so the buff lands on whoever was really close, and
   * every screen shows the same auras.
   *
   * @param {string} element a roar, or a forged skill built on it
   * @param {{ x: number, z: number }} origin where the shout went off
   * @param {{ caster?: import('../net/RemotePlayer.js').RemotePlayer|null }} [options] null = this player roared
   */
  _teamRoar(element, origin, { caster = null } = {}) {
    const c = settings[element] ?? settings.roar;
    const seconds = c.buffSeconds ?? 6;
    const buff = c.buffDamage ?? 25;
    const reach = (c.zoneRadius ?? 6.5) + 0.5;
    const look = { color: c.colorGlow ?? '#ff4d3d', seconds };
    const near = (p) => p && Math.hypot(p.x - origin.x, p.z - origin.z) <= reach;
    if (!caster || (near(this.character.position) && !this.director.isDowned)) {
      this._roarUntil = this.elapsed + seconds;
      this._roarBuff = buff;
      this.auras.show('me', this.character, look);
      if (caster) this.hud.showToast(`${caster.name || 'A teammate'} roared: +${buff}% damage for ${seconds} s`, 2200);
    }
    for (const [id, remote] of this.party.remotes) {
      if (remote === caster || near(remote.position)) this.auras.show(`player:${id}`, remote, look);
    }
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

    // Generated skills are built on one of the hand-made ones (`base`) and
    // behave like it: a skill based on Rampage charges, one based on the
    // roar buffs, and so on.
    const kind = ELEMENT_META[element]?.base ?? element;
    if (kind === 'blink') distance = this._blinkTo(origin, direction, distance);
    // The body really travels: a charge along the ground, a leap through the air.
    if (kind === 'rampage') distance = this._dash(element, origin, direction, distance, 0);
    if (kind === 'leap') distance = this._dash(element, origin, direction, distance, settings[element].height ?? 3);
    const ability = this.abilities.cast(origin, direction, distance, element);
    const strike = this.combat.open(element, origin, direction, distance);
    // Chain leaps and orb zaps are decided by Combat; the effect draws them.
    if (strike && ability) strike.fx = { ability, serial: ability.castSerial };

    // Rage: big skills spend it, a shout gives it.
    this.rage = Math.max(0, this.rage - this._rageCost(element));
    this._gainRage(ELEMENT_META[element]?.rageOnCast ?? 0);
    if (kind === 'roar') this._teamRoar(element, origin);
    if (kind === 'tempest') {
      // The spin stays on the body as it moves.
      if (strike) strike.followTarget = this.character.position;
      if (ability) ability.follow = this.character.position;
      this._spinUntil = this.elapsed + (settings.combat[element]?.lasts ?? 2.6);
      this._spinNext = this.elapsed + 0.7;
    }
    // Mana, the cooldown and the pause before the next cast (game/progression.js).
    this.mana = Math.max(0, this.mana - this._manaCost(element));
    this.cooldowns.set(element, Math.max(0, settings[element].cooldown * levelCooldownFactor(this.profile.level) * this.profile.cooldownMultiplier(element)));
    this._gcd = this._gcdTotal = globalCooldown(this.profile.level);

    // Snap onto the shot and throw the body into it. Which clip that is belongs
    // to the ability, so each spell can be cast with its own gesture.
    this.character.setFacing(facing);
    this.character.playCast(platform.getCastAnim(element));
    this.character.castLunge();
    // The party sees the spell; the damage stays yours to resolve.
    this.party.sendCast(element, origin, direction, distance, facing, platform.getCastAnim(element));
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
    if (id) level = await this._expandLevel(await this._loadLevel(id));
    else if (fromCurrentMap && this.composed.level) {
      level = normalizeLevel({ ...this.composed.level, name: this.composed.plan?.name ?? this.composed.level.name });
      level.world.terrain = this.composed.terrain.serialize();
    }
    await this.levelEditor.enter(level);
  }

  async playCampaignLevel(id) {
    const campaign = await this._campaignOf(id);
    const index = campaign.findIndex((entry) => entry.id === id);
    const level = await this._loadLevel(id);
    await this.playLevel(level, { campaign, index });
  }

  /**
   * A level from the game builder carries a map plan and no objects yet:
   * scatter them from the library now, with the level's own seed, so the same
   * file always builds the same map (and a party gets the finished level).
   */
  async _expandLevel(level) {
    if (level.objects.length || !level.plan) return level;
    await this.catalog.ready;
    return this.composed.levelFromPlan(level.plan, { seed: level.world.seed, base: level });
  }

  /** A saved level, or one of the builder's unsaved chapters. */
  async _loadLevel(id) {
    const draft = this.drafts.levels.get(id);
    return draft ? normalizeLevel(structuredClone(draft)) : this.levels.load(id);
  }

  async _campaignOf(id) {
    return this.drafts.levels.has(id) ? this.drafts.campaign : this.levels.list();
  }

  /**
   * Play a built game without saving it: its chapters live here until the
   * page reloads, and "Next" walks through them like a campaign.
   * @param {object[]} levels the compiled chapters, in order
   */
  async playDraftGame(levels) {
    // A play test: its own throwaway character, as whoever is chosen now.
    await this.enterGameScope({ id: 'draft', title: 'Play test', hero: levels[0].character ?? this.mainMenu.getSelection().characterId });
    this.drafts = { levels: new Map(levels.map((level) => [level.id, level])), campaign: levels.map((level) => ({ id: level.id, name: level.name })), saved: false };
    await this.playCampaignLevel(levels[0].id);
  }

  /**
   * Play a level: its character, world, rules, story and goal.
   * @param {object} level
   * @param {{ fromEditor?: boolean, campaign?: {id: string, name: string}[], index?: number }} [options]
   */
  async playLevel(level, { fromEditor = false, campaign = null, index = -1, fromParty = false } = {}) {
    level = await this._expandLevel(normalizeLevel(level));
    // Playing together: the host picks the level and the party follows.
    if (this.party.isGuest && !fromParty) return this.party.requestStart();
    if (this.party.isHost && !fromParty && !fromEditor) this.party.broadcastStart({ level, campaign, index, game: this.currentGame });
    this.lobby?.close({ tell: false });
    if (fromEditor) this.levelEditor.suspend();
    else {
      this.mainMenu.hide();
      this.home.hide();
    }

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
        { label: this.party.isGuest ? 'Join the fight' : 'Start', value: 'start', primary: true }
      ]
    });
    // The party moved on while this card was up: the new start takes over.
    if (choice === 'party') return;
    if (choice === 'back') {
      if (fromEditor) this.levelEditor.resume();
      else {
        this.useClassicWorld();
        this.leaveGameScope();
        this.showMainMenu();
      }
      return;
    }

    this.run = { level, fromEditor, campaign, index, kills: 0, wave: 0, studied: 0, done: false, draft: this.drafts.levels.has(level.id) && !this.drafts.saved };
    this._applyRules(level);
    await this.enterGame({ characterId: level.character, keepRun: true, fromParty: true });
    // Monsters already standing in the level wait for the director's reset.
    // A calm level (a study level for young players) has none at all.
    const V = this.character.position.constructor;
    if (!level.rules.calm && this.party.canSpawn) for (const m of level.monsters) this.monsters.spawn(m.kind, new V(m.x, 0, m.z));
    const heightAt = (x, z) => this.composed.heightAt(x, z);
    this.portals.setPortals(level.portals, heightAt);
    this.npcs.setNpcs(level.npcs, heightAt);
    // NPCs are solid: monsters and the caster walk around them.
    this.composed.obstacles.push(...this.npcs.obstacles);
    // A battle royale: the storm, the rivals, the last one standing (game/royale).
    if (level.rules.goal === 'royale') {
      this.royale ??= new RoyaleMode(this);
      // The lobby's choice of how many AI rivals fill the empty places.
      if (this._royaleRivals != null) level.rules.royale = { ...(level.rules.royale ?? {}), rivals: this._royaleRivals };
      // The rivals are adventurers: their models load the first time a match needs them.
      await Promise.race([this.monsterModels?.preload(['rival']).then(() => this.monsters.useModels(this.monsterModels)), new Promise((r) => setTimeout(r, 8000))]);
      this.royale.start(level);
    }
    this._updateGoalPill();
  }

  /** The level's wave rules over the global ones, remembered for restoring. */
  _applyRules(level) {
    const waves = settings.waves;
    const kinds = settings.monsters.kinds;
    this._rulesBackup = {
      waves: { enabled: waves.enabled, baseCount: waves.baseCount, growth: waves.growth, bossEvery: waves.bossEvery, dragonEvery: waves.dragonEvery },
      weights: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.weight]))
    };
    const r = level.rules;
    Object.assign(waves, { baseCount: r.baseCount, growth: r.growth, bossEvery: r.bossEvery, dragonEvery: r.dragonEvery });
    // "Defeat the boss": the Emberwyrm arrives on wave `count`.
    if (r.goal === 'boss') waves.dragonEvery = r.count;
    // Calm: no waves — explore, talk and study. A battle royale has no waves either: the rivals are all there from the start.
    if (r.calm || r.goal === 'royale') waves.enabled = false;
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
      r.goal === 'royale' ? this.royale?.statusText() ?? ''
      : r.goal === 'waves' ? `Wave ${Math.min(run.wave, r.count)} / ${r.count} cleared`
      : r.goal === 'kills' ? `${Math.min(run.kills, r.count)} / ${r.count} defeated`
      : r.goal === 'study' ? `${Math.min(run.studied, r.count)} / ${r.count} questions right`
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
    if (this.party.isGuest) {
      // A guest keeps count for the pill; the host decides when the goal is met.
      if (type === 'kill') run.kills += 1;
      if (type === 'waveCleared') run.wave = payload;
      if (type === 'wave') run.wave = Math.max(run.wave, payload - 1);
      if (type === 'study') run.studied += 1;
      this._updateGoalPill();
      return;
    }
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
    if (type === 'study') {
      run.studied += 1;
      if (r.goal === 'study' && run.studied >= r.count) return this._winLevel();
    }
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
    this.party.announceRun('win', { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, yaw: heading + Math.PI });
  }

  /** Walked into the exit portal: the ending, then the next level. */
  async _finishLevel({ fromParty = false } = {}) {
    const run = this.run;
    if (!run || run.finishing) return;
    // A guest stepping through takes the whole party: the host ends the level.
    if (this.party.isGuest && !fromParty) {
      this.party.sendTo(this.party.session.host, { t: 'exit' });
      return this.hud.showToast('Leaving with the party…', 2000);
    }
    run.finishing = true;
    this.party.announceRun('finish');
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
      buttons: this.party.isGuest
        ? [{ label: 'Main menu', value: 'menu' }]
        : [
            { label: run.fromEditor ? 'Back to editor' : 'Main menu', value: 'menu' },
            ...(next ? [{ label: `Next: ${next.name}`, value: 'next', primary: true }] : [])
          ]
    });
    // The host moved the party on: the start message takes it from here.
    if (choice === 'party') return;
    if (choice === 'next' && next) {
      // Not an "end" for the party: the next level's start follows at once.
      this.exitToMenu({ fromParty: true });
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
      // In a party the host leads the way; a guest asks them to.
      if (this.party.isGuest) {
        this.party.sendTo(this.party.session.host, { t: 'travel', level: target.level });
        return this.hud.showToast('Asking the host to take the party through…', 2200);
      }
      return this._travelTo(target.level);
    }
    this.hud.showToast('This portal is dormant');
  }

  /** Through a level portal: load the level and play it (the party follows). */
  async _travelTo(levelId) {
    if (this.phase !== 'playing') return;
    if (this.run?.fromEditor) return this.hud.showToast(`Leads to level “${levelId}” — works in the campaign`);
    const campaign = await this._campaignOf(levelId);
    const index = campaign.findIndex((entry) => entry.id === levelId);
    let level;
    try {
      level = await this._loadLevel(levelId);
    } catch {
      return this.hud.showToast('This portal leads nowhere');
    }
    this.flash.trigger?.(getColor('#bfe6ff'), 0.6);
    this.director.stop();
    this.clearEffects();
    this._endRun();
    await this.playLevel(level, { campaign, index });
  }

  /* ------------------------------------------------------------------ */
  /* Playing together: what the host tells a guest                       */
  /* ------------------------------------------------------------------ */

  /** A monster died in the host's world: the experience and the quest count are everyone's. */
  _onPartyKill(msg) {
    if (this.phase !== 'playing') return;
    this.director.kills += 1;
    this.profile.addXp(Math.round((XP_FOR[msg.k] ?? 6) * (1 + ((msg.w || 1) - 1) * 0.05)));
    // Signed in, the server checks the kill really happened in the host's game.
    if (this.sync.active && this.sync.runId) this.sync.partyKill(msg.id);
    if (this.npcs.onKill(msg.k)) this._updateGoalPill();
    this._onRunEvent('kill', { kind: msg.k });
  }

  /** The run's numbers, with every snapshot. */
  _applyPartyRun(run) {
    if (!run) return;
    const d = this.director;
    if (typeof run.w === 'number') d.wave = run.w;
    if (typeof run.k === 'number') d.kills = run.k;
    if (typeof run.sc === 'number' && run.sc !== d.score) {
      d.score = run.sc;
      this.gameHud.setScore(run.sc);
    }
    if (typeof run.w === 'number') this.gameHud.setWave(run.w);
  }

  /** A run event: a wave, a boss, the win, the ending. */
  _onPartyRun(msg) {
    if (this.phase !== 'playing') return;
    switch (msg.ev) {
      case 'wave':
        this.director.wave = msg.w;
        this.gameHud.setWave(msg.w);
        this.gameHud.showBanner(`Wave ${msg.w}`, `${msg.n} incoming`);
        this._onRunEvent('wave', msg.w);
        return;
      case 'cleared':
        this._onRunEvent('waveCleared', msg.w);
        return;
      case 'breather':
        this.gameHud.showBanner('Clear', `Wave ${msg.w} in ${msg.s}s`, 2.0);
        return;
      case 'boss':
        this.gameHud.showBanner(msg.label ?? 'A boss', 'is here', 3.2);
        this.shake.add(0.8 * settings.global.cameraShake, 1.6, 10);
        return;
      case 'win':
        return this._applyPartyWin(msg);
      case 'finish':
        return this._finishLevel({ fromParty: true });
      default:
        return;
    }
  }

  /** The host reached the goal: the same gold portal opens here. */
  _applyPartyWin(msg) {
    const run = this.run;
    if (!run || run.done) return;
    run.done = true;
    this.director.stop();
    this.hud.showToast('Victory! A portal has opened');
    if (!run.fromEditor) progress.complete(run.level.id);
    this.portals.add(
      { id: '__exit', x: msg.x, z: msg.z, yaw: msg.yaw, color: 'gold', label: 'The way onward', target: { type: 'exit' } },
      (px, pz) => this.composed.heightAt(px, pz)
    );
    this._updateGoalPill();
  }

  /**
   * Blink Strike: jump the caster down the aimed line, stopping short of
   * anything solid and inside the arena. Returns the distance actually covered.
   */
  _blinkTo(origin, direction, distance) {
    const d = this._landingDistance(origin, direction, distance);
    if (d <= 0.5) return distance; // nowhere to land: a strike without the jump
    const position = this.character.position;
    this._teleport(origin.x + direction.x * d + (position.x - origin.x), origin.z + direction.z * d + (position.z - origin.z));
    return d;
  }

  /** How far down a line the body can land: short of anything solid, inside the arena. */
  _landingDistance(origin, direction, distance) {
    const locomotion = this.character.locomotion;
    const body = 0.45;
    const blocked = (x, z) =>
      locomotion.obstacles.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < (o.radius + body) ** 2) ||
      (locomotion.props ?? []).some((p) => p.alive && (x - p.position.x) ** 2 + (z - p.position.z) ** 2 < (p.radius + body) ** 2) ||
      x * x + z * z > locomotion.bounds * locomotion.bounds;
    let d = distance;
    while (d > 0.5 && blocked(origin.x + direction.x * d, origin.z + direction.z * d)) d -= 0.25;
    return d;
  }

  /**
   * Rampage and Skybreaker Leap: carry the body down the line at the skill's
   * own speed (so it arrives exactly when the strike does), along the ground
   * or up through an arc `height` metres high. Returns the distance covered.
   */
  _dash(element, origin, direction, distance, height) {
    const d = this._landingDistance(origin, direction, distance);
    if (d <= 0.5) return distance;
    const position = this.character.position;
    const speed = Math.max(1, settings[element].speed * settings.global.speed);
    this._dashState = {
      from: position.clone().setY(0),
      to: position.clone().setY(0).addScaledVector(direction, d),
      t: 0,
      duration: d / speed,
      height
    };
    return d;
  }

  /** Advance a charge or leap; runs after the locomotion step, so it wins. */
  _updateDash(dt) {
    const s = this._dashState;
    if (!s) return;
    s.t = Math.min(1, s.t + dt / Math.max(0.05, s.duration));
    const position = this.character.position;
    position.x = s.from.x + (s.to.x - s.from.x) * s.t;
    position.z = s.from.z + (s.to.z - s.from.z) * s.t;
    position.y = s.height * 4 * s.t * (1 - s.t);
    this.character.locomotion.velocity.set(0, 0, 0);
    if (s.t >= 1) {
      position.y = 0;
      this._dashState = null;
    }
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

  /**
   * Signed in: the server hears of the kill, checks it, rolls the loot and
   * names every item; what it rolled falls where the monster died.
   */
  _serverLoot(monster, wave) {
    const at = { x: monster.position.x, z: monster.position.z };
    this.sync.kill(monster.id, monster.kind, wave).then((r) => {
      if (!r.ok || !r.drops?.length || this.phase !== 'playing') return;
      const targets = LootSystem.scatter(at, r.drops.length);
      this.loot.drop(r.drops, at, (x, z) => this.world.heightAt?.(x, z) ?? 0, { targets });
      this.party.announceLoot(r.drops, at, targets);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Accounts                                                            */
  /* ------------------------------------------------------------------ */

  async _signIn(kind, name, password) {
    const r = kind === 'register' ? await this.account.register(name, password) : await this.account.login(name, password);
    if (!r.ok) return r;
    this.sync.attach(r.character);
    this._afterAccountChange();
    return r;
  }

  /** The server says who is signed in (a cookie from an earlier visit). */
  async _restoreAccount() {
    const r = await this.account.me();
    if (r.ok && r.account && r.character) {
      this.sync.attach(r.character);
      this._afterAccountChange();
    }
  }

  /** Signed out (or blocked): back to this browser's own character. */
  _signedOut() {
    if (this.account.user) this.account._set(null);
    if (this.sync.active) this.sync.detach();
    this._afterAccountChange();
  }

  _afterAccountChange() {
    this._applyProfileStats();
    this._wearGear();
    this._syncSlots();
    if (this.mainMenu.isVisible) this.mainMenu.show();
    this.home?.updateAccount();
    // The party socket says who you are when it connects: reconnect as the new you.
    if (!this.party.inParty) this.party.session.close();
  }

  _dropLoot(monster) {
    // In a party the books come from everyone's trees, not just the host's.
    const bookPool = this.party.inParty ? this.party.bookPool() : treeSpells(this.profile.classId);
    const items = rollLoot(monster.kind, { wave: this.director.wave || 1, goldFind: this.profile.stats.gold, bookPool });
    if (!items.length) return;
    const targets = LootSystem.scatter(monster.position, items.length);
    this.loot.drop(items, monster.position, (x, z) => this.world.heightAt?.(x, z) ?? 0, { targets });
    this.party.announceLoot(items, monster.position, targets);
  }

  /** Gear → max health, move speed. `refill` tops health up (start of a run). */
  _applyProfileStats({ refill = false } = {}) {
    const stats = this.profile.stats;
    const director = this.director;
    const ratio = director.maxHealth ? director.health / director.maxHealth : 1;
    director.maxHealth = Math.max(40, settings.combat.playerHealth + stats.health);
    director.armor = stats.armor / 100;
    director.block = stats.block / 100;
    director.regen = stats.regen;
    director.health = refill ? director.maxHealth : Math.max(1, Math.round(director.maxHealth * ratio));
    // Mana grows with the character's level (game/progression.js).
    const manaRatio = this.maxMana ? this.mana / this.maxMana : 1;
    this.maxMana = maxMana(this.profile.level);
    this.mana = refill ? this.maxMana : Math.min(this.maxMana, this.maxMana * manaRatio);
    this._speedBonus = 1 + stats.speed / 100;
    this.character.locomotion.speedBonus = this._speedBonus;
  }

  _equipItem(item, slotId = null) {
    const equipped = this.profile.equip(item.uid, slotId);
    if (!equipped) {
      if (this.profile._lastError) this.hud.showToast(this.profile._lastError, 2400);
      this.profile._lastError = null;
      return;
    }
    if (equipped.type === 'weapon') this.selectWeapon(equipped.weapon);
    const idle = equipped.type === 'gear' && !this.profile.isActive(equipped);
    this.hud.showToast(idle ? `${equipped.name} worn — but it needs a free hand (your weapon takes both)` : `${equipped.name} equipped`, idle ? 3200 : 1800);
  }

  /** Take off a piece of gear or the weapon in hand (`slotId` 'weapon'), into the bag at `at` if given. */
  _unequipGear(slotId, at = null) {
    const item = slotId === 'weapon' ? this.profile.equipped : this.profile.gear[slotId];
    if (!item) return;
    const [x, y] = at ?? [null, null];
    const ok = slotId === 'weapon' ? this.profile.unequip(x, y) : this.profile.unequipGear(slotId, x, y);
    this.hud.showToast(ok ? `${item.name} taken off` : 'Your bag is full — drag it out of the bag to drop it instead');
  }

  _wearGear() {
    this.character?.wearGear(this.profile.gear, (item) => this.profile.isActive(item));
  }

  /**
   * Drink a potion (its key, R/Z, or auto-drink). A short cooldown after
   * each, per kind, so a double press or a held-down auto-drink never
   * spends two.
   */
  _drink(kind, { auto = false } = {}) {
    if (this.director.isDowned) return false;
    const wait = (this._potionReadyAt[kind] ?? 0) - this.elapsed;
    if (wait > 0) {
      if (!auto) this.hud.showToast(`${POTIONS[kind].name} — ready in ${wait.toFixed(1)}s`, 900);
      return false;
    }
    if (kind === 'health' && this.director.health >= this.director.maxHealth && !auto) {
      this.hud.showToast('Already at full health', 1000);
      return false;
    }
    if (!this.profile.usePotion(kind)) {
      if (!auto) this.hud.showToast(`No ${POTIONS[kind].name.toLowerCase()}s left`);
      return false;
    }
    this._potionReadyAt[kind] = this.elapsed + POTION_COOLDOWN;
    if (kind === 'health') {
      this.director.health = Math.min(this.director.maxHealth, this.director.health + this.director.maxHealth * 0.45);
      this.flash.trigger?.(getColor('#ff6b7a'), 0.25);
    } else {
      // The Mana Potion: half your mana back.
      this.mana = Math.min(this.maxMana, this.mana + this.maxMana * PROGRESSION.potionMana);
      this.flash.trigger?.(getColor('#6f8dff'), 0.25);
    }
    this.hud.showToast(auto ? `${POTIONS[kind].name} — drunk automatically` : POTIONS[kind].name);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* NPCs                                                                */
  /* ------------------------------------------------------------------ */

  _talkTo(npc) {
    // Alone, a conversation pauses the fight. In a party the world goes on.
    if (this.party.inParty) {
      this._pausedForTalk = false;
    } else {
      this._pausedForTalk = !this.paused;
      this.paused = true;
    }
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
        gear: Object.values(this.profile.gear).filter(Boolean).map((g) => g.name),
        skills: this.profile.skills
      }
    };
  }

  _rewardItem(rarity) {
    if (rarity === 'none') return null;
    return Math.random() < 0.5 ? makeWeapon(rarity) : makeGear(rarity);
  }

  _npcActions(npc) {
    const local = this._localNpcActions(npc);
    return this.sync.active ? this._serverNpcActions(npc, local) : local;
  }

  /**
   * Signed in, everything an NPC gives is made by the server, checked
   * against the level file: a gift once, a quest reward only when the
   * server counted the kills, a study reward at a human pace, and the
   * merchant's goods and prices are the server's.
   */
  _serverNpcActions(npc, local) {
    const sync = this.sync;
    const id = npc.data.id;
    const describe = (given) => {
      if (!given) return '';
      if (given.dropped) this.loot.drop([given.item], this.character.position, (x, z) => this.world.heightAt?.(x, z) ?? 0);
      return given.dropped ? `${given.item.name} (dropped at your feet — your bag is full)` : given.item.name;
    };
    const failed = (r) => r.error ?? 'The server said no';
    return {
      ...local,
      takeGift: () => {
        const g = npc.data.gift;
        if (!g || g.type === 'none' || npc.state.gifted) return null;
        npc.state.gifted = true;
        return sync.npc(id, 'gift').then((r) => (r.ok && r.given ? `${npc.data.name} gives you ${describe(r.given)}.` : r.ok ? null : failed(r)));
      },
      completeQuest: () => {
        npc.state.questTurnedIn = true;
        this.npcs.refreshMarks();
        this._updateGoalPill();
        return sync.npc(id, 'quest').then((r) => {
          if (!r.ok) {
            npc.state.questTurnedIn = false;
            this.npcs.refreshMarks();
            return failed(r);
          }
          return `Quest complete! You receive ${r.gold} gold${r.given ? ` and ${describe(r.given)}` : ''}.`;
        });
      },
      study: local.study && {
        ...local.study,
        answer: (given) => {
          const result = npc.study.answer(given);
          if (!result.correct) return result;
          const wasDone = this.run?.done;
          this._onRunEvent('study');
          const reward = sync.npc(id, 'study').then((r) => {
            if (!r.ok) return failed(r);
            const parts = [r.gold ? `+${r.gold} gold` : '', r.given ? `${r.count} right answers — a bonus: ${describe(r.given)}` : ''].filter(Boolean);
            if (this.run?.done && !wasDone) parts.push('You did it! The way onward is open.');
            return parts.join(' · ');
          });
          return { ...result, reward };
        }
      },
      stock: () =>
        (npc.state.serverStock ??= sync.shop(id, this.director.wave || 1).then((r) => {
          if (!r.ok) npc.state.serverStock = null;
          return r.ok ? r.stock : [];
        })),
      buy: (item) =>
        sync.buy(id, item.uid).then((r) => {
          // A bag row's price moves after each one: ask again next time.
          if (item.type === 'service') npc.state.serverStock = null;
          return r.ok ? r.message : failed(r);
        })
    };
  }

  _localNpcActions(npc) {
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
          : g.type === 'book' ? makeBook(null, Math.random, treeSpells(profile.classId))
          : g.type === 'gear' ? makeGear(g.rarity === 'none' ? 'magic' : g.rarity)
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
        profile.addXp(40 + q.count * 6);
        const reward = this._rewardItem(q.rarity);
        const got = reward ? ` and ${give(reward)}` : '';
        this.npcs.refreshMarks();
        this._updateGoalPill();
        return `Quest complete! You receive ${q.gold} gold${got}.`;
      },
      study: npc.study && {
        available: () => npc.study.hasQuestions,
        next: () => npc.study.next(),
        correct: () => npc.study.correct,
        help: (kind, question) => this.npcBrain.studyHelp(npc, kind, question),
        answer: (given) => {
          const result = npc.study.answer(given);
          if (!result.correct) return result;
          // A right answer pays; every few right answers bring a bonus.
          const st = npc.data.study;
          const rewards = [];
          if (st.gold > 0) {
            profile.gold += st.gold;
            profile.save();
            rewards.push(`+${st.gold} gold`);
          }
          if (result.bonus) {
            const bonus = st.bonus === 'book' ? makeBook(null, Math.random, treeSpells(profile.classId)) : makePotion(st.bonus);
            rewards.push(`${npc.study.correct} right answers — a bonus: ${give(bonus)}`);
          }
          const wasDone = this.run?.done;
          this._onRunEvent('study');
          if (this.run?.done && !wasDone) rewards.push('You did it! The way onward is open.');
          return { ...result, reward: rewards.join(' · ') };
        }
      },
      stock: () => {
        npc.state.stock ??= npc.data.role === 'healer' ? [makePotion('health'), makePotion('focus')] : merchantStock(Math.random, this.director.wave || 1, treeSpells(profile.classId));
        // Merchants also sell bag rows — the price is live, so it is not in the cached stock.
        return npc.data.role === 'merchant' ? [...npc.state.stock, makeBagRowOffer(profile.rowsBought)] : npc.state.stock;
      },
      bag: () => profile.bag,
      openStash: () => {
        this.dialogue.close();
        this.inventory.openStash();
      },
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
    this.weaponFire?.clear();
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

    // The monsters' animated models load in the background (MonsterModels.js); weapons come
    // from the KayKit skeleton pack in the 3D library when it is there.
    this.monsterModels = new MonsterModelLibrary(
      (url) => assets.loadGLB(url),
      (name) => {
        const model = this.catalog.models.find((m) => m.id.endsWith(`/${name}`) && /Skeletons/.test(m.id));
        return model ? this.catalog.url(model.file) : null;
      }
    );
    this.monsterModelsReady = this.catalog.ready
      .then(() => this.monsterModels.preload(['grunt', 'wisp', 'brute', 'golem']))
      .then(() => this.monsters.useModels(this.monsterModels))
      .catch((error) => console.warn('[monsters] models:', error));

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

    await this.catalog.ready;
    this._registerMyModels();

    this.loading.setProgress(0.6, 'Loading character…');
    await this.character.load(assets);
    this._wearGear();

    this.loading.setProgress(0.65, 'Waking the horde…');
    this.monsters.warmUp();

    await this._precompile(0.7, 0.99);

    this.loading.setProgress(1, 'Ready');
    this.loading.hide();
    // The shared library learns the game's own content (and any forged
    // classes it has not seen) — in the background, it is not needed to play.
    this._seedLibrary();

    // The contact card waits for the veil to start clearing before its entrance
    // plays — calling reveal here lands it just after the fade.
    this.hud.reveal();

    this.showMainMenu();
    this.start();
    // Signed in from an earlier visit? Then the character is the server's.
    this._restoreAccount();
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
    this._updateDash(dt);

    if (this.phase === 'playing') {
      // Rage drains once you stop fighting.
      this._rageIdle += raw;
      if (this._rageIdle > 4 && this.rage > 0) this.rage = Math.max(0, this.rage - 8 * raw);
      // Iron Tempest: keep the body spinning while it lasts.
      if (this._spinUntil > this.elapsed && this.elapsed >= this._spinNext) {
        this.character.playCast('spin');
        this._spinNext = this.elapsed + 0.7;
      }
      // Mana refills over time, faster at higher levels; the pause between casts runs down.
      if (!this.usesRage && this.mana < this.maxMana) this.mana = Math.min(this.maxMana, this.mana + manaRegen(this.profile.level) * raw);
      if (this._gcd > 0) this._gcd = Math.max(0, this._gcd - raw);
      for (const [element, remaining] of this.cooldowns) {
        if (remaining > 0) this.cooldowns.set(element, Math.max(0, remaining - raw));
      }
      if (this._attackCooldown > 0) {
        this._attackCooldown = Math.max(0, this._attackCooldown - raw);
      }

      this.ground.update(this.elapsed);
      // Who is walking where: the living landscape answers (grass bends, birds fly, logs roll).
      if (this.world === this.composed && this.composed.life) {
        const me = this.character.position;
        const moving = this._lifeAt ? Math.hypot(me.x - this._lifeAt.x, me.z - this._lifeAt.z) > 0.005 : false;
        this._lifeAt = { x: me.x, z: me.z };
        const near = (this.monsters?.active ?? []).filter((m) => m.position && Math.hypot(m.position.x - me.x, m.position.z - me.z) < 30).slice(0, 7);
        this.composed.actors = [{ x: me.x, z: me.z, moving }, ...near.map((m) => ({ x: m.position.x, z: m.position.z }))];
      }
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
      this.weaponFire.owner = this.character.position;
      this.weaponFire.update(dt);
      this._updateWeapon(raw);
      this.particles.flush();
      this.decals.update(dt);
      this.fissures.update(dt);
      this.bursts.update(dt);
      this.auras.update(this.elapsed);
      this.royale?.update(dt);
      this.lights.update(dt);
    } else {
      this.ground.update(this.elapsed);
      this.dust.update(this.elapsed, this.character.position);
    }

    // Playing together: the other players' bodies, and what goes over the wire.
    this.party.update(dt);

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
    this._updateScope(raw);
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
    if (this.phase !== 'playing' || this._dashState) {
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

  /**
   * Potion keys: the cooldown sweep, the health key pulsing when health is
   * low (and there is a potion to drink), and auto-drink when it is on.
   */
  _updatePotions() {
    for (const kind of POTION_KINDS) this.hud.setPotionCooldown(kind, Math.max(0, (this._potionReadyAt[kind] ?? 0) - this.elapsed), POTION_COOLDOWN);
    const d = this.director;
    const fighting = this.phase === 'playing' && !this.paused && !d.isDowned;
    const ratio = d.maxHealth ? d.health / d.maxHealth : 1;
    this.hud.setLowHealth(fighting && ratio < LOW_HEALTH && this.profile.potions.health > 0);
    if (fighting && this.autoDrink && ratio < AUTO_DRINK_AT && d.health > 0 && this.profile.potions.health > 0) this._drink('health', { auto: true });
  }

  /** Auto-drink a health potion when health falls low: a per-browser choice. */
  setAutoDrink(on) {
    this.autoDrink = Boolean(on);
    try {
      localStorage.setItem(AUTO_DRINK_KEY, this.autoDrink ? '1' : '0');
    } catch {
      /* not remembered: fine */
    }
    this.gameMenu?.setAutoDrink(this.autoDrink);
    this.hud.showToast(this.autoDrink ? `Auto-drink on: a health potion below ${Math.round(AUTO_DRINK_AT * 100)}% health` : 'Auto-drink off', 2200);
  }

  /** Everything DOM. Driven by real time so it keeps moving while paused. */
  _updateReadouts(dt) {
    const gl = this.renderer.gl;

    for (const element of this.hud.cards.keys()) {
      // A key shows its own cooldown, or the pause after the last cast, whichever is longer.
      const own = this.cooldowns.get(element) ?? 0;
      const total = settings[element].cooldown * levelCooldownFactor(this.profile.level) * this.profile.cooldownMultiplier(element);
      if (this._gcd > own) this.hud.setCooldown(element, this._gcd, this._gcdTotal);
      else this.hud.setCooldown(element, own, total);
      this.hud.setStarved(element, this._rageCost(element) > this.rage || this._manaCost(element) > this.mana);
    }
    this._updatePotions();
    this.gameHud.setRage(this.rage / 100, this.rage, this.usesRage && this.phase === 'playing', this._roarUntil > this.elapsed);
    this.gameHud.setMana(this.mana / Math.max(1, this.maxMana), this.mana, this.maxMana, !this.usesRage && this.phase === 'playing');
    // Anyone a roar reached (not just the Barbarian) sees what it gives and for how long.
    this.gameHud.setBuff(this.phase === 'playing' && this._roarUntil > this.elapsed ? { text: `+${this._roarBuff ?? 25}% damage`, seconds: this._roarUntil - this.elapsed } : null);
    const fire = this.phase === 'playing' ? this.currentFire : null;
    this.gameHud.setAmmo(
      !fire ? null
      : this._reloadLeft > 0 ? 'RELOADING…'
      : (fire.mag > 0 ? `${platform.getActiveWeapon()?.label ?? ''} · ${this._ammo.get(platform.getActiveWeaponId()) ?? fire.mag} / ${fire.mag}`
        : `${platform.getActiveWeapon()?.label ?? ''} · ∞`) + (fire.scope && this._scope < 0.5 ? ' · hold V to scope' : '')
    );
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
    this.party.dispose();
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
