/**
 * Gloamreach: the starting map of a fantasy RPG — the golden-hour village
 * of Brindlewick, the carved Warden's Gate, the violet Gloamwood beyond, and
 * the Cinder Rift seen from the cliffs — with its people and creatures, and
 * its monsters: fight them with each hero's skills, gather what they drop,
 * wear it (and look it), trade at the armsmonger's stall. No quests yet.
 *
 *   const game = new GloamreachGame(document.body, { onClose, account });
 *   await game.open();   …   game.close();
 *
 * map.js / heights.js / collide.js / quality.js / cast.js / rules.js /
 * skills.js / items.js / bestiary.js / chests.js / save.js are pure (tested);
 * world.js builds the scene; life.js runs the people; monsters.js the
 * monsters; hero.js, fighter.js, gearRig.js and camera.js the player;
 * combat.js the fight; vfx.js its look; post.js the picture; audio.js and
 * sfx.js the sound; ui.js, combatHud.js and panels.js the screens.
 */
import * as THREE from 'three';
import { TextureBank } from './textures.js';
import { buildWorld, prewarm, zoneTreeKinds } from './world.js';
import { treeMaterials } from './trees.js';
import { Post } from './post.js';
import { SETTINGS, chooseTier, Governor } from './quality.js';
import { CameraAssist, loadAssist, cameraMenu, menuSections } from '../shared/cameraAssist.js';
import { PowerKit } from '../shared/powerKit.js';
import { GameMusic, musicMenu, gloamreachTrack } from '../shared/gameMusic.js';
import { WorldMap, Waypoint, WaypointCue, mapButton, MAP_KEY } from '../shared/worldMap.js';
import { WaypointBeam } from '../shared/waypointBeam.js';
import { HelpPanel, helpButton, codesFor, hintItems } from '../shared/helpPanel.js';
import { PressDrag } from '../shared/cameraAssist.js';
import { CONTROLS } from './controls.js';
import { powerSettings } from '../shared/power.js';
import { Effects } from './fx.js';
import { Vista } from './vista.js';
import { Life } from './life.js';
import { loadTemplate, FallbackActor, loadFile, polyUrl } from './actors.js';
import { folkRecipe } from './folk.js';
import { loadFolk } from './folkModels.js';
import { FighterActor } from './fighter.js';
import { GearRig, learnFrames } from './gearRig.js';
import { Monsters } from './monsters.js';
import { CombatFx } from './vfx.js';
import { Combat } from './combat.js';
import { CombatHud } from './combatHud.js';
import { Panels } from './panels.js';
import { ItemStudio, HeroPreview } from './icons.js';
import { Sfx } from './sfx.js';
import { loadSave, writeSave, profileFor, cleanEntry } from './save.js';
import { merchantStock, makeItem, compareItem, POTIONS, RARITIES, RARITY_ORDER, STAT_NAMES, STACK_MAX } from './items.js';
import { spawnList, monsterDef } from './bestiary.js';
import { CHESTS } from './chests.js';
import { ZoneManager } from '../shared/zones/manager.js';
import { loadZoneSave, writeZoneSave, mark, counters } from '../shared/zones/state.js';
import { keepOut, monsterRule, arrivalAt } from '../shared/zones/hub.js';
import { serviceNear, inBounds, portalNear, SERVICE_NAMES } from '../shared/zones/zone.js';
import { disposeTree, compileReady } from '../shared/zones/dispose.js';
import { hubKit, portalVeil, portalArch } from '../shared/zones/props.js';
import { SafeBadge, infoPanel, waystoneMenu, stashPanel } from '../shared/zones/hubUi.js';
import { move as stashMove, sortSlots, moveAll } from '../shared/zones/stash.js';
import { ZONES, ZONE_SAVE_KEY, HUB_IDS, inZone, migrateLegacy } from './zones.js';
import { RIFT_AREAS, riftAreaAt, lavaAt, riftOutside } from './rift.js';
import { buildItem } from './gearModels.js';
import { STALLS, toWorld, nearestRoad } from './map.js';
import { Hero } from './hero.js';
import { FollowCamera } from './camera.js';
import { Sound } from './audio.js';
import { HEROES } from './cast.js';
import { START, AREAS, areaAt } from './map.js';
import { shared } from './materials.js';
import { paintMap, Minimap } from './minimap.js';
import { Loading, StartScreen, Hud, creditsPanel, pauseMenu, el } from './ui.js';
import './gloamreach.css';

const PREFS = 'gloamreach.prefs';
/** The stash's slots (the same chest in every hub). */
const STASH_SIZE = 48;
/** A door's veil, by the colours of where it leads. */
const THEME_VEILS = { golden: ['#ffd27a', '#c86a2a'], dusk: ['#a9c8ff', '#7a3cff'], ember: ['#ffb04a', '#d2361a'] };
/** A monster in one of these states is after you (monsters.js): the music goes to battle. */
const FIGHTING = new Set(['alert', 'chase', 'windup', 'strike', 'recover']);
/** Quiet runs at 30 while you explore and rises to 60 the moment a fight starts. */
const POWER_PROFILE = { quietFps: 30, urgentFps: 60 };
/** Monster voices by kind (elites borrow their base's). */
const MONSTER_VOICE = { wolf: 'wolf', greymane: 'wolf', boar: 'boar', spider: 'spider', webmother: 'spider', wisp: 'wisp', treant: 'treant', hollowroot: 'treant', gloomcap: 'shroom', grummoch: 'treant', cindermaw: 'drake' };
const prefs = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(PREFS)) ?? {};
    } catch {
      return {};
    }
  },
  save(p) {
    try {
      localStorage.setItem(PREFS, JSON.stringify(p));
    } catch {
      /* private mode */
    }
  }
};

const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
const HERO_CLIPS = ['JumpStart', 'JumpAir', 'JumpLand', 'Sprint', 'Slash1', 'Slash2', 'Slash3', 'Block', 'Bash', 'Charge', 'Whirl', 'Slam', 'Shoot', 'Draw', 'SkyShot', 'Roll', 'Cast', 'CastBig', 'Nova', 'Hit', 'Die'];
const BAR_CODES = { Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4' };
/** Potions on 5 and 6 (controls.js), never Q or E. */
const KEY = { hp: codesFor(CONTROLS, 'hpPotion'), mp: codesFor(CONTROLS, 'mpPotion'), help: codesFor(CONTROLS, 'help'), interact: codesFor(CONTROLS, 'interact'), bag: codesFor(CONTROLS, 'bag'), hero: codesFor(CONTROLS, 'hero'), look: codesFor(CONTROLS, 'mouseLook') };

export class GloamreachGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'gr');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Gloamreach');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this.closed = false;
    this.debug = new URLSearchParams(location.search).has('debug');
    this.sound = new Sound();
    this.prefs = prefs.load();
    this.picked = HEROES.some((h) => h.id === this.prefs.hero) ? this.prefs.hero : 'knight';
    this.t = 0;
    this.area = null;
    this._onKey = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keyUp(e);
    this._onBlur = () => {
      this.keys.clear();
      this.follow?.assist.clear();
    };
    this._onMouse = (e) => this.mouseMove(e);
    this.pointer = { x: 0, y: 0, on: false, moved: -99 };
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.save = loadSave();
    this._saveT = 0;
    this._onLock = () => this.lockChanged();
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLock);
    window.gloamreach = this;
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer = renderer;
    renderer.domElement.className = 'gr-view';
    this.root.prepend(renderer.domElement);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // A first guess at what this machine can draw; the governor refines it.
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    const q = new URLSearchParams(location.search).get('quality');
    const guess = SETTINGS[q] ? q : chooseTier({ gpu, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, pixels: screen.width * screen.height * devicePixelRatio ** 2, mobile: /Mobi|Android/i.test(navigator.userAgent) });
    this.gpu = gpu;
    // Two levels: `resTier` keeps the resolution this machine always had (the
    // old governor still lowers it only if frames really run slow); `tier` is
    // the detail, which the power governor keeps within the Graphics preset.
    this.quality = SETTINGS[q] ? q : null;
    this.resTier = guess;
    this.governor = new Governor(guess, { max: q ? q : 'ultra' });
    this.power = new PowerKit('gloamreach', { renderer, profile: POWER_PROFILE, detail: this.quality ? null : guess, onChange: () => this.applyPower() });
    this.tier = this._detailTier();
    const settings = { ...powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE }), msaa: guess === 'low' ? 0 : 4 };
    this.settings = settings;
    // The sun's shadow is redrawn when due (power: every few frames on the lighter presets), not every frame.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
    this.resize();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);

    this.bank = new TextureBank(renderer, { size: this.tier === 'low' ? 512 : 1024 });
    // What lives across zones: the heroes, the fight's sounds, item pictures, the camera, the picture.
    this.loading?.set('Calling the heroes', 0.03);
    this.heroTemplates = {};
    // Quaternius bodies (folkModels.js) when the packs are in library/inbox, else polyfork's.
    await Promise.all(HEROES.map(async (h) => {
      const folk = h.folk ? await loadFolk(folkRecipe(h.id, h.folk), { detail: this.bank.noise(), borrow: HERO_CLIPS }) : null;
      this.heroTemplates[h.id] = folk ?? (await loadTemplate(h.model, { detail: this.bank.noise(), borrow: HERO_CLIPS }));
    }));
    if (this.closed) return;
    // Where hands hold things: learnt from polyfork's heroes (gear anchors carry it onto the Quaternius bodies).
    learnFrames((await Promise.all(HEROES.map((h) => loadFile(polyUrl(h.model))))).filter(Boolean).map((gltf) => ({ gltf })));
    this.sfx = new Sfx(this.sound);
    this.studio = new ItemStudio();
    this.follow = new FollowCamera(this.camera, null);
    // , . turn the camera, [ ] tilt it, / puts it behind the hero; it eases back by itself after a quiet spell.
    this.follow.assist = new CameraAssist(loadAssist('gloamreach'), { id: 'gloamreach' });
    this.post = new Post(renderer);
    // The world, zone by zone (zones.js): one loaded at a time, the rest not built at all.
    this.zoneSave = loadZoneSave(ZONE_SAVE_KEY, { migrate: () => migrateLegacy(this.save), zones: ZONES.map((z) => z.id), hubs: HUB_IDS, stashSize: STASH_SIZE, cleanItem: cleanEntry });
    this.zones = new ZoneManager({
      game: 'gloamreach',
      zones: ZONES,
      save: this.zoneSave,
      host: this.root,
      adapter: {
        load: (zone, at, progress) => this._loadZone(zone, at, progress),
        unload: (zone) => this._unloadZone(zone),
        preload: (zone) => this._preloadZone(zone),
        teleport: (at) => this.teleport(at.x, at.z, at.yaw ?? 0, { pitch: this.follow.pitch, dist: this.follow.wantDist }),
        persist: () => this.persistZones()
      },
      on: {
        leave: () => this._tripStart(),
        arrive: () => this._tripEnd(),
        enter: (zone, via) => this._entered(zone, via),
        hub: (inside, zone) => this.safeBadge?.set(inside, zone.hub?.name),
        message: (text) => this.fightHud?.toast(text, 'muted'),
        poi: (p) => this.fightHud?.toast(`Found: ${p.name}`, 'item')
      }
    });
    const startZone = this.zones.zone(this.zoneSave.zone) ?? this.zones.zones[0];
    await this.zones.enter(startZone.id, this._menuSpot(startZone), { via: 'load' });
    if (this.closed) return;
    this.applyPower(true);
    this.loading.set('Ready', 1);
    this.loading.hide();
    this.loading = null;
    this.menu();
    // The loop: capped (60 by default), stopped in a hidden tab, on demand behind the pause menu.
    this.power.start((raw) => {
      this.fps = this.power.loop.fps;
      this.frame(Math.min(0.05, raw / 1000), raw);
    });
    this.ready = true;
  }

  /* ================================================================ zones */

  /** Where the hero stands on the start screen (and starts) in a zone: Brindlewick's lane, or a hub's middle. */
  _menuSpot(zone) {
    if (zone.id === 'brindlewick') return { x: 1, z: 26, yaw: 0 };
    return arrivalAt(zone);
  }

  /** Build a zone: its land and sky, people, monsters, hub and doors; the hero moved into it at `at`. */
  async _loadZone(zone, at, progress) {
    this.zoneReady = false;
    const t0 = performance.now();
    // How long each part took (for ?debug and the trip measurements).
    this.loadSteps = [];
    let tStep = t0;
    const report = (label, k) => {
      const now = performance.now();
      const last = this.loadSteps.at(-1);
      if (!last || last[0] !== label) this.loadSteps.push([label, 0]);
      if (last) last[1] += Math.round(now - tStep);
      tStep = now;
      return this.loading ? this.loading.set(label, 0.08 + k * 0.9) : progress(label, k);
    };
    const settings = this.settings;
    this.world = await buildWorld({ renderer: this.renderer, bank: this.bank, settings, zone, onProgress: (l, k) => report(l, k * 0.62) });
    if (this.closed) return;
    const world = this.world;
    const scene = world.scene;
    this.scene = scene;
    this.zone = zone;
    const has = (f) => zone.features.includes(f);
    this.effects = new Effects(this.bank, { fireflies: settings.fireflies });
    scene.add(this.effects.group);
    if (world.spots.homes) {
      for (const h of Object.values(world.spots.homes)) this.effects.addChimney(h.chimney, { rate: 1.6, size: 1.1, dark: 0.75 });
      this.effects.addChimney(world.spots.homes.smithy.forge.clone().add(new THREE.Vector3(0, 0.3, 0)), { rate: 3, size: 0.6, dark: 0.35, sparks: 0.5 });
    }
    if (has('gloamwood')) for (const [x, z, r] of [[0, -300, 9], [-10, -230, 14], [12, -265, 12], [-20, -190, 10], [30, -210, 8]]) this.effects.addWisp(new THREE.Vector3(x, world.grid.at(x, z), z), r, Math.random() < 0.5 ? [0.55, 0.85, 1] : [0.9, 0.6, 1]);
    this.vista = null;
    if (has('vista')) {
      report('Lighting the rift', 0.64);
      this.vista = new Vista({ inRift: world.rift, avoid: world.rift ? (x, z) => riftOutside(x, z) < 12 : () => false });
      await this.vista.build(this.bank, this.effects);
      scene.add(this.vista.group);
    }
    report('Waking the people', 0.7);
    this.life = new Life({ scene, world, bank: this.bank, effects: this.effects, keep: world.keep });
    await this.life.load((k) => report('Waking the people', 0.7 + k * 0.12));
    this.vfx = new CombatFx(scene, this.bank, (x, z) => this.world.colliders.height(x, z));
    report('Stirring the wilds', 0.84);
    this.monsters = new Monsters({ scene, world, bank: this.bank, vfx: this.vfx, spawns: spawnList().filter((s) => world.keep(s.x, s.z)), fence: (x, z, r) => keepOut(zone, x, z, r) });
    await this.monsters.load((k) => report('Stirring the wilds', 0.84 + k * 0.1));
    if (this.closed) return;
    this.follow.colliders = world.colliders;
    // The hero: made the first time, moved in after.
    if (!this.heroActor) this.setHero(this.picked);
    else this._rehome();
    this.minimapCanvas = paintMap(world.grid, world.scattered, { keep: world.keep, lava: world.rift ? lavaAt : null });
    this._buildHub(zone);
    this._buildDoors(zone);
    this._armsStall();
    if (this.minimap) {
      this.minimap.map = this.minimapCanvas;
      this.minimap.extent = world.extent;
      this.minimap.area = null;
    }
    this.worldMap?.setZone(this._mapData(zone));
    this.waypoint?.clear();
    this.beam = new WaypointBeam(scene);
    this.applyPower(true);
    this.hero.place(at.x, at.z, at.yaw ?? 0);
    this.teleport(at.x, at.z, at.yaw ?? 0, { pitch: this.follow.pitch ?? 0.16, dist: this.follow.wantDist ?? 4.6 });
    this.area = null;
    // Compile now, not at the first glance at something.
    this.world.update(0.016, this.t, this.camera, this.hero.pos);
    // Compile now (waiting for the GPU to finish, so a quick trip on doesn't pull programs out from under it).
    await compileReady(this.renderer, scene, this.camera);
    this.renderer.shadowMap.needsUpdate = true;
    report('Ready', 1);
    this.zoneReady = true;
    this.lastLoadMs = Math.round(performance.now() - t0);
  }

  /** Let go of the zone: everything in its scene, its people and monsters, the fight's leftovers; the hero is kept. */
  _unloadZone() {
    this.zoneReady = false;
    this.panels?.closeAll();
    this.hubPanel?.close();
    if (this.worldMap?.isOpen) this.worldMap.close();
    if (this.combat) this._vitals = { hp: this.combat.hp, res: this.combat.res, ward: this.combat.ward };
    const keep = [this.heroActor?.object, this.rig?.cape?.mesh].filter(Boolean);
    for (const o of keep) o.removeFromParent();
    // Everything in the zone's scene first (a module's own dispose takes things out of the scene, and would hide them from this walk).
    if (this.scene) disposeTree(this.scene);
    this.combat?.dispose();
    this.combat = null;
    this.monsters?.dispose();
    this.life?.dispose();
    this.vista?.dispose();
    this.vfx?.dispose();
    this.effects?.dispose();
    this.hubProps?.dispose();
    if (this.mannequin) {
      this.mannequin.rig.dispose();
      this.mannequin.actor.dispose();
    }
    this.beam?.dispose();
    this.world?.dispose();
    this.renderer.renderLists.dispose();
    this.monsters = this.life = this.vista = this.vfx = this.effects = this.hubProps = this.mannequin = this.beam = null;
    this.doors = [];
    this.world = null;
    this.scene = null;
  }

  /** Near a door: warm the next zone's land (and its monsters' models) in idle time. */
  async _preloadZone(zone) {
    prewarm(zone);
    // Paint its trees' bark and leaves now, one kind per idle moment, so the trip doesn't.
    for (const kind of zoneTreeKinds(zone)) {
      await new Promise((r) => (globalThis.requestIdleCallback ? requestIdleCallback(r, { timeout: 2000 }) : setTimeout(r, 50)));
      if (this.closed) return;
      const m = treeMaterials(this.bank, kind, { msaa: (this.settings.msaa ?? 0) > 0 });
      for (const x of Object.values(m)) x.dispose();
    }
    const keep = (x, z) => inZone(zone, x, z);
    const models = new Set(spawnList().filter((s) => keep(s.x, s.z)).map((s) => monsterDef(s.type).model).filter(Boolean));
    await Promise.all([...models].map((m) => loadTemplate(m, { detail: this.bank.noise(), rim: 0.5 }).catch(() => null)));
  }

  /** The hero moves into the new zone's scene: their actor, cape, collisions; a fresh fight with the same health. */
  _rehome() {
    this.scene.add(this.heroActor.object);
    if (this.rig) {
      this.rig.scene = this.scene;
      if (this.rig.cape) this.scene.add(this.rig.cape.mesh);
    }
    this.hero.colliders = this.world.colliders;
    this.combat = new Combat(this.fightApi(), this.profile);
    if (this._vitals) {
      this.combat.hp = Math.max(1, Math.min(this.combat.stats.maxHp, this._vitals.hp));
      this.combat.res = Math.min(this.combat.stats.maxRes, this._vitals.res);
    }
  }

  /** A hub's props (its edge, waystone, boards, stash, the hero's stand) and the stand's mannequin. */
  _buildHub(zone) {
    const hub = zone.hub;
    const H = (x, z) => this.world.colliders.height(x, z);
    const blocked = (x, z) => !this.world.colliders.walkable(x, z, x, z) || this.world.colliders.pushOut(x, z, 0.6)[0] !== x || nearestRoad(x, z).d < 0.5;
    // Brindlewick rests at the inn; every Gloamreach hub's merchant is a person with a stall or a pack.
    const skip = zone.id === 'brindlewick' ? ['rest', 'merchant'] : ['merchant'];
    const kit = hubKit({ hub, height: H, color: hub.color, style: 'timber', skip, blocked, label: zone.name, sub: hub.name, mapImage: this.minimapCanvas, mapExtent: this.world.extent, reached: () => this.zoneSave.hubs.includes(hub.id) });
    this.scene.add(kit.group);
    for (const c of kit.colliders) this.world.colliders.circle(c.x, c.z, c.r, -100, 4);
    this.hubProps = kit;
    for (const [id, s] of Object.entries(hub.services)) if (id === 'waystone' || id === 'rest') this.world.lights.add(new THREE.Vector3(s.x, H(s.x, s.z) + 2.2, s.z), { color: hub.color, intensity: 6, distance: 10, flicker: 0.15, glow: 1.1, glowSize: 1.2 });
    // The stand shows the hero as they are dressed now.
    this._standMannequin();
  }

  /** Doors: a swirling veil in the gate's tunnel, or an arch standing alone. */
  _buildDoors(zone) {
    const H = (x, z) => this.world.colliders.height(x, z);
    this.doors = [];
    const theme = (to) => THEME_VEILS[this.zones.zone(to)?.theme] ?? THEME_VEILS.golden;
    for (const p of zone.portals) {
      const [a, b] = theme(p.to);
      if (p.veil) {
        const v = portalVeil({ w: p.veil.w, h: p.veil.h, a, b, round: true });
        v.mesh.position.set(p.veil.x, H(p.veil.x, p.veil.z) + 0.1, p.veil.z);
        v.mesh.rotation.y = p.veil.face;
        this.scene.add(v.mesh);
        this.doors.push(v);
      }
      if (p.arch) {
        const arch = portalArch({ x: p.arch.x, y: H(p.arch.x, p.arch.z), z: p.arch.z, face: p.arch.face, w: 3.2, h: 4.4, a, b, glow: a });
        this.scene.add(arch.group);
        this.doors.push(arch);
        const c = Math.cos(p.arch.face);
        const sn = Math.sin(p.arch.face);
        for (const k of [-1, 1]) this.world.colliders.circle(p.arch.x + c * k * 2.05, p.arch.z - sn * k * 2.05, 0.65, -100, 8);
      }
      this.world.lights.add(new THREE.Vector3(p.x, H(p.x, p.z) + 2.5, p.z), { color: a, intensity: 10, distance: 14, flicker: 0.1, glow: 0.8, glowSize: 1.6 });
    }
  }

  /** A trip begins (a door, a waystone, waking after a fall): the game holds still. */
  _tripStart() {
    this._modeBefore = this.mode === 'menu' ? 'menu' : 'play';
    this.mode = 'travel';
    this.keys.clear();
    this.follow?.assist.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.power?.setMenu('live');
  }

  _tripEnd() {
    if (this.closed) return;
    this.mode = this._modeBefore ?? 'play';
    this.power?.setMenu(this.mode === 'menu' ? 'live' : 'none');
    this.root.focus();
  }

  /** Arrived in a zone: the save, the banner, the music. */
  _entered(zone, via) {
    this.zoneSave.at = null;
    this.persistZones();
    if (via !== 'load' && this.hud) this.hud.bigBanner(zone.name, zone.sub);
    if (this.music && via !== 'load') this.music.jump(this.musicArea(), { fade: 2 });
  }

  persistZones() {
    writeZoneSave(ZONE_SAVE_KEY, this.zoneSave);
  }

  /** The full map's data for a zone (its painted base, bounds, names). */
  _mapData(zone) {
    return { title: `Gloamreach — ${zone.name}`, base: this.minimapCanvas, extent: this.world.extent, areas: this._areas(zone) };
  }

  _areas(zone) {
    if (this.world?.rift) return RIFT_AREAS;
    return AREAS.filter((a) => inBounds(zone.bounds, a.x, a.z) && (zone.id !== 'brindlewick' || a.id !== 'gloamwood') && (zone.id !== 'gloamwood' || a.id === 'gloamwood' || a.id === 'gate'));
  }

  /** Where the hero stands: the area id (banners, the minimap, the music). */
  areaHere(x, z) {
    return this.world?.rift ? riftAreaAt(x, z) : areaAt(x, z);
  }

  /** In the hub's ring nothing is fought. */
  isSafe() {
    return Boolean(this.hero && this.zone && this.zones?.safeAt(this.hero.pos.x, this.hero.pos.z));
  }

  peaceful() {
    if (this.t - (this._peaceT ?? -9) < 3) return;
    this._peaceT = this.t;
    this.fightHud?.toast(`No fighting in ${this.zone?.hub?.name ?? 'the hub'}.`, 'muted');
  }

  /** Fallen: wake at the last hub rested at (maybe another zone). */
  respawnHero() {
    this.zones.respawn().catch(() => {});
  }

  chestHere(c) {
    return Boolean(this.zone && inZone(this.zone, c.x, c.z));
  }

  onChest(c) {
    if (this.zone && mark(this.zoneSave, this.zone.id, 'chests', c.id)) this.persistZones();
  }

  onKill(m) {
    if (!this.zone || (!m.elite && !m.boss)) return;
    if (mark(this.zoneSave, this.zone.id, m.boss ? 'bosses' : 'elites', m.type)) this.persistZones();
  }

  /* ================================================================ hub services */

  /** The hub service (or merchant) within reach, for the prompt and F. */
  nearService() {
    if (!this.zone || !this.hero) return null;
    const s = serviceNear(this.zone, this.hero.pos.x, this.hero.pos.z, 2.6);
    if (!s || s.id === 'merchant') return null;
    return s;
  }

  serviceLabel(s) {
    const zone = this.zone;
    switch (s.id) {
      case 'map': return 'Read the map board';
      case 'info': return 'Read the notices';
      case 'stash': return 'Open the stash';
      case 'stats': return 'Look at yourself on the stand';
      case 'rest': return `Rest${s.name ? ` at ${s.name}` : ''}`;
      case 'waystone': return 'Touch the waystone';
      default: return SERVICE_NAMES[s.id] ?? s.id;
    }
    void zone;
  }

  useService(id) {
    const zone = this.zone;
    const accent = zone.hub.color;
    const hold = { onOpen: () => this._holdOpened('hub'), onClose: () => this._mapClosed(), accent };
    this.sound.tick();
    if (id === 'map') return this.openMap({ world: true });
    if (id === 'stats') {
      this.panels.toggle('char', true);
      return;
    }
    if (id === 'rest') {
      this.combat.recalc(true);
      this.combat.dots = [];
      this.zones.rest();
      this.vfx.ring(this.hero.pos, { radius: 2.4, color: [2.6, 2.2, 1.2], life: 0.9 });
      this.fightHud.toast(`Rested at ${zone.hub.name} — fully healed. You'll wake here if you fall.`, 'gold');
      this.sfx.potion?.();
      return;
    }
    if (id === 'waystone') {
      this.hubPanel = waystoneMenu(this.root, { rows: this.zones.waystones(), onPick: (hub) => this.zones.fastTravel(hub), ...hold });
      return;
    }
    if (id === 'info') {
      const r = this.zoneSave.zones[zone.id];
      const chests = CHESTS.filter((c) => inZone(zone, c.x, c.z)).length;
      const spawns = spawnList().filter((s) => inZone(zone, s.x, s.z));
      const elites = new Set(spawns.filter((s) => monsterDef(s.type).elite).map((s) => s.type));
      const bosses = new Set(spawns.filter((s) => monsterDef(s.type).boss).map((s) => s.type));
      const kinds = [...new Set(spawns.map((s) => monsterDef(s.type).name))];
      this.hubPanel = infoPanel(this.root, {
        zone: zone.name,
        sub: zone.sub,
        about: `${zone.hub.name} is safe ground: no monster crosses its ring and no blow lands inside it. ${zone.portals.map((p) => `${p.name} leads to ${this.zones.zone(p.to)?.name}.`).join(' ')}`,
        counters: counters(this.zoneSave, zone.id, { chests, elites: elites.size, bosses: bosses.size, pois: zone.pois.length }),
        contents: [
          { label: 'What prowls here', items: kinds },
          { label: 'Places', items: zone.pois.map((p) => (r?.pois?.includes(p.id) ? p.name : '?')) }
        ],
        tips: zone.tips ?? [],
        story: zone.story.hooks
      }, hold);
      return;
    }
    if (id === 'stash') {
      // The chest's lid swings open while you use it.
      this.hubProps?.setChest?.(true);
      hold.onClose = () => {
        this.hubProps?.setChest?.(false);
        this._mapClosed();
      };
      const p = this.profile;
      const rules = { stack: (a, b) => Boolean(a.kind) && a.kind === b.kind, max: STACK_MAX, count: (e) => (e.kind ? e.n : 1), setCount: (e, n) => (e.n = n) };
      const lists = { bag: () => p.bag, stash: () => this.zoneSave.stash };
      const key = (e) => (e.kind ? `0${e.kind}` : `1${RARITY_ORDER.length - RARITY_ORDER.indexOf(e.rarity)}${e.name}`);
      const done = () => {
        this.gearChanged();
        this.persistZones();
      };
      this.hubPanel = stashPanel(this.root, {
        title: `Stash — ${zone.hub.name}`,
        bag: lists.bag,
        stash: lists.stash,
        view: (e) => (e.kind ? { icon: '🧪', count: e.n, name: POTIONS[e.kind].name, color: POTIONS[e.kind].color, tip: POTIONS[e.kind].desc } : { icon: this.studio.icon(e), name: e.name, color: RARITIES[e.rarity]?.color, tip: `${RARITIES[e.rarity]?.name ?? ''} · item level ${e.ilvl} · needs level ${e.req}\n${Object.entries(e.stats).map(([k, v]) => `${STAT_NAMES[k] ?? k} ${v > 0 ? '+' : ''}${v}`).join(' · ')}` }),
        compare: (e) => {
          if (!e.base) return '';
          const d = compareItem(e, p.equip);
          const keys = Object.keys(d);
          return keys.length ? `If worn: ${keys.map((k) => `${STAT_NAMES[k] ?? k} ${d[k] > 0 ? '+' : ''}${d[k]}`).join(' · ')}` : 'If worn: the same as what you wear.';
        },
        move: (side, i) => {
          const r = side === 'bag' ? stashMove(p.bag, i, this.zoneSave.stash, rules) : stashMove(this.zoneSave.stash, i, p.bag, rules);
          done();
          return r.ok ? null : side === 'bag' ? 'The stash is full.' : 'Your bag is full.';
        },
        sort: (side) => {
          sortSlots(side === 'bag' ? p.bag : this.zoneSave.stash, key);
          done();
        },
        storeAll: () => {
          const n = moveAll(p.bag, this.zoneSave.stash, rules, (e) => Boolean(e.kind));
          done();
          return `Stored ${n} thing${n === 1 ? '' : 's'} (potions stay in your bag).`;
        },
        takeAll: () => {
          const n = moveAll(this.zoneSave.stash, p.bag, rules);
          done();
          return `Took ${n} thing${n === 1 ? '' : 's'}.`;
        },
        ...hold
      });
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.music?.dispose();
    this.power?.dispose();
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLock);
    if (this._onUpBtn) window.removeEventListener('pointerup', this._onUpBtn);
    if (this._onDrag) window.removeEventListener('pointermove', this._onDrag);
    if (this._onCancel) window.removeEventListener('pointercancel', this._onCancel);
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.profile) writeSave(this.save);
    if (this.zoneSave) this.persistZones();
    if (this.world) this._unloadZone();
    this.zones?.dispose();
    this.rig?.dispose();
    this.panels?.dispose();
    this.preview?.dispose();
    this.studio?.dispose();
    this.fightHud?.dispose();
    this.heroActor?.dispose();
    this.post?.dispose();
    this.hud?.dispose();
    this.safeBadge?.dispose();
    this.minimap?.dispose();
    this.worldMap?.dispose();
    this.help?.dispose();
    this.cue?.dispose();
    this.bank?.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.gloamreach === this) delete window.gloamreach;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings?.maxDpr ?? 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post?.resize();
    this.power?.invalidate();
  }

  /** The detail level: fixed by ?quality=, the old rule on Ultra (as much as stays smooth), else the power governor's. */
  _detailTier() {
    if (this.quality) return this.resTier;
    if (this.power.preset === 'ultra') return this.resTier;
    return this.power.detail(this.resTier);
  }

  /**
   * Apply the Graphics choice and the levels now (no reload): shadows, post
   * effects, grass, lights, draw distances, haze. The resolution is the
   * machine's own (resTier), never lowered by a preset.
   */
  applyPower(first = false) {
    const prev = this.settings;
    this.tier = this._detailTier();
    const s = { ...powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE }), msaa: this.settings.msaa };
    this.settings = s;
    this.resize();
    this.post?.configure({ ao: s.ao, rays: s.rays, bloom: s.bloom, smaa: (s.smaa && (s.preset === 'ultra' || !s.msaa)) || !s.msaa, msaa: s.msaa, bloomHalf: s.bloomHalf }, s.scale);
    if (!this.world) return;
    const lighting = this.world.lighting;
    if (!first && (prev.shadow !== s.shadow || prev.shadowBox !== s.shadowBox)) lighting.setShadow(s.shadow, s.shadowBox);
    else if (first && (lighting.sun.shadow.mapSize.x !== s.shadow || lighting.box !== s.shadowBox)) lighting.setShadow(s.shadow, s.shadowBox);
    lighting.sun.castShadow = s.shadowOn;
    this.renderer.shadowMap.needsUpdate = true;
    this.world.lights.setCount(s.lights);
    this.world.foliage?.setDensity(s.grass, s.grassReach);
    this.world.limits.treeFar = s.treeFar;
    this.world.limits.far = s.far;
    if (this.life) this.life.limits = { far: s.far, animNear: s.animNear };
    if (this.monsters) this.monsters.drawFar = s.far;
    this.power.invalidate();
  }

  /** Kept for tests and the console: force a detail level. */
  applyTier(tier) {
    this.quality = tier;
    this.resTier = tier;
    this.applyPower();
  }

  /* ================================================================ heroes */

  setHero(id) {
    this.picked = id;
    const def = HEROES.find((h) => h.id === id);
    const tpl = this.heroTemplates[id];
    const old = this.hero;
    if (this.heroActor) {
      this.scene.remove(this.heroActor.object);
      this.heroActor.dispose();
    }
    this.heroActor = tpl ? new FighterActor(tpl, { height: def.height, name: def.name }) : new FallbackActor(def.accent);
    this.scene.add(this.heroActor.object);
    this.hero = new Hero(this.heroActor, {
      colliders: this.world.colliders,
      height: def.height,
      onStep: (surface, speed, p) => {
        this.sound.step(surface, speed);
        if (surface === 'dirt' && speed > 4) this.effects.dust(p, 2, [0.7, 0.6, 0.45]);
      },
      onLand: (hard, surface) => {
        this.sound.step(surface, 6, 1 + hard);
        this.effects.dust(this.hero.pos, 4 + Math.round(hard * 8));
      }
    });
    // Capes need their shoulder height in the model's own units.
    if (this.hero.capeU && tpl) this.hero.capeU.value.w = (tpl.natural ?? 1.8) * 0.8;
    if (old && this.mode === 'play') this.hero.place(old.pos.x, old.pos.z, old.yaw);
    else {
      const m = this._menuSpot(this.zone ?? ZONES[0]);
      this.hero.place(m.x, m.z, m.yaw);
    }
    // What this hero carries and wears (each class keeps its own), and their side of the fight.
    this.profile = profileFor(this.save, id);
    this.rig?.dispose();
    this.rig = tpl ? new GearRig(this.heroActor, tpl, { hero: id, scene: this.scene }) : null;
    this.rig?.dress(this.profile.equip);
    this.combat?.dispose();
    this.combat = new Combat(this.fightApi(), this.profile);
    this.preview?.dispose();
    this.preview = null;
    if (this.fightHud) {
      this.fightHud.cls = id;
      this.fightHud._buildBar();
    }
    if (this.mannequin && this.mannequin.cls !== id) this._standMannequin();
  }

  /** The hub stand's figure: the hero as they're dressed now (rebuilt when the hero changes). */
  _standMannequin() {
    if (this.mannequin) {
      this.mannequin.rig.dispose();
      this.mannequin.actor.object.removeFromParent();
      this.mannequin.actor.dispose();
      this.mannequin = null;
    }
    const hub = this.zone?.hub;
    const s = hub?.services.stats;
    const tpl = this.heroTemplates[this.picked];
    if (!s || !tpl || !this.scene) return;
    const H = (x, z) => this.world.colliders.height(x, z);
    const def = HEROES.find((h) => h.id === this.picked);
    const actor = new FighterActor(tpl, { height: def.height * 0.94, name: 'stand' });
    const rig = new GearRig(actor, tpl, { hero: this.picked, scene: this.scene });
    const face = Math.atan2(hub.x - s.x, hub.z - s.z);
    actor.object.position.set(s.x + Math.sin(face) * 0.9, H(s.x, s.z) + 0.02, s.z + Math.cos(face) * 0.9);
    actor.object.rotation.y = face;
    this.scene.add(actor.object);
    rig.dress(this.profile?.equip ?? {});
    rig.settle();
    actor.move(0);
    actor.update(0.016);
    this.mannequin = { actor, rig, cls: this.picked };
  }

  /** What the fight, the HUD and the panels see of the game. */
  fightApi() {
    if (this._api) return this._api;
    const game = this;
    const hudApi = {
      number: (at, v, kind) => game.fightHud?.number(at, v, kind),
      toast: (text, kind, item, color) => game.fightHud?.toast(text, kind, item, color),
      hurt: (k) => game.fightHud?.hurt(k),
      death: (on) => game.fightHud?.death(on),
      banner: (a, b, big) => game.hud?.bigBanner(a, b, big)
    };
    this._api = {
      get hero() { return game.hero; },
      get actor() { return game.heroActor; },
      get rig() { return game.rig; },
      get monsters() { return game.monsters; },
      get vfx() { return game.vfx; },
      get sfx() { return game.sfx; },
      get music() { return game.music; },
      get world() { return game.world; },
      get scene() { return game.scene; },
      get follow() { return game.follow; },
      get lastInput() { return game.lastInput; },
      get reducedMotion() { return game.reducedMotion; },
      hud: hudApi,
      teleport: (x, z, yaw) => game.teleport(x, z, yaw, { pitch: game.follow.pitch, dist: game.follow.wantDist }),
      onChange: () => game.gearChanged(),
      onSave: () => game.persist(),
      // Zones: the hub keeps the peace; chests and kills are remembered per zone; a fall wakes you at the last hub.
      safe: () => game.isSafe(),
      peaceful: () => game.peaceful(),
      respawn: () => game.respawnHero(),
      chestHere: (c) => game.chestHere(c),
      onChest: (c) => game.onChest(c),
      onKill: (m) => game.onKill(m)
    };
    return this._api;
  }

  /** Gear or level changed: numbers, looks, the preview, the save. */
  gearChanged() {
    this.combat?.recalc();
    this.rig?.dress(this.profile.equip);
    this.preview?.dress(this.profile.equip);
    if (this.mannequin) {
      this.mannequin.rig.dress(this.profile.equip);
      this.mannequin.rig.settle();
    }
    this.persist();
  }

  persist() {
    this._dirty = true;
  }

  /** The armsmonger's stall shows its wares: blades laid across the crates, a helm, a shield against the counter. */
  _armsStall() {
    const st = STALLS.find((s) => s.goods === 'arms');
    if (!st || !this.world.spots.stalls) return;
    const r = () => 0.5;
    const y0 = this.world.grid.at(st.x, st.z);
    // [base, rarity, local x, height, local z, laid flat across?, scale]
    const ware = [['longsword', 'uncommon', -1.1, 1.3, 0.62, true], ['axe', 'common', 0.05, 1.3, 0.55, true], ['greathelm', 'rare', 1.05, 1.42, 0.62, false, 0.13], ['kite', 'rare', -1.0, 0.5, 1.22, false], ['bow', 'common', 1.0, 0.75, 1.15, false]];
    for (const [base, rarity, lx, y, lz, flat, sc] of ware) {
      const g = buildItem(makeItem(base, rarity, 3, r));
      if (sc) g.scale.setScalar(sc);
      const [x, z] = toWorld(st, lx, lz);
      g.position.set(x, y0 + y, z);
      if (flat) g.rotation.set(Math.PI / 2, st.face, -Math.PI / 2, 'YXZ');
      else g.rotation.set(base === 'kite' || base === 'bow' ? -0.22 : 0, st.face + (base === 'greathelm' ? 0.5 : 0), base === 'bow' ? 0.15 : 0, 'YXZ');
      this.scene.add(g);
    }
  }

  heroFocus() {
    return this.hero ? this.hero.pos.clone() : new THREE.Vector3(START.x, 0, START.z);
  }

  /* ================================================================ screens */

  menu() {
    this.mode = 'menu';
    this.power.setMenu('live');
    // The soundtrack (docs/music.md): First Light on the start screen; the game's own Sound switch silences it too.
    this.music ??= new GameMusic('gloamreach', { moods: { battle: 'battle', boss: 'boss' }, muted: () => !this.sound.enabled, hold: 5 });
    this.music.jump('title');
    const spot = this._menuSpot(this.zone);
    this.hero.place(spot.x, spot.z, spot.yaw);
    this.start = new StartScreen(this.root, {
      picked: this.picked,
      onPick: (id) => {
        this.sound.wake();
        this.sound.tick();
        this.setHero(id);
        this.hero.place(spot.x, spot.z, spot.yaw);
        this.prefs.hero = id;
        prefs.save(this.prefs);
      },
      onBegin: () => this.begin(),
      onCredits: () => this.credits(),
      onClose: () => this.close()
    });
    this.root.focus();
  }

  menuCamera(t) {
    // In front of the hero in the square, the Elder Oak and the houses behind.
    const a = Math.sin(t * 0.12) * 0.22;
    const p = this.hero.pos;
    this.camera.position.set(p.x + Math.sin(a) * 4.6 + 0.8, p.y + 1.45, p.z + Math.cos(a) * 4.6);
    this.camera.lookAt(p.x - 0.9, p.y + 1.2, p.z - 1);
    this.camera.fov = 45;
    this.camera.updateProjectionMatrix();
  }

  begin() {
    this.sound.wake();
    this.sound.tick();
    this.start?.hide();
    this.start = null;
    // Brindlewick starts on the lane south of the square; another zone at its hub.
    const at = this.zone.id === 'brindlewick' ? START : arrivalAt(this.zone);
    this.hero.place(at.x, at.z, at.yaw);
    this.follow.yaw = at.yaw + Math.PI;
    this.follow.pitch = 0.16;
    this.follow.pivot.set(0, 0, 0);
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
    this.hud = new Hud(this.root, { debug: this.debug, hint: hintItems(CONTROLS) });
    this.minimap = new Minimap(this.hud.el, this.minimapCanvas, this.world.extent);
    this.minimap.areaOf = (x, z) => this.areaHere(x, z);
    this.minimap.nameOf = (id) => (this.world?.rift ? RIFT_AREAS : AREAS).find((a) => a.id === id)?.name;
    this.safeBadge = new SafeBadge(this.hud.el);
    this.safeBadge.set(this.isSafe(), this.zone.hub.name);
    // The full map (O, the pause menu's Map, or the minimap's button) and its waypoint; its World tab shows every zone.
    this.waypoint ??= new Waypoint();
    this.worldMap = new WorldMap({
      host: this.root,
      ...this._mapData(this.zone),
      world: () => this.zones.world(),
      legend: [
        { shape: 'pin', color: '#7ee08f', label: 'Hub (safe)' },
        { shape: 'tent', color: '#b98cff', label: 'Portal' },
        { shape: 'square', color: '#ffcf4a', label: 'Merchant' },
        { shape: 'dot', color: '#ffd77a', label: 'Villager' },
        { shape: 'dot', color: '#ff4a3a', label: 'Monster' },
        { shape: 'diamond', color: '#ff3a2a', label: 'Elite' },
        { shape: 'skull', color: '#f4e6d0', label: 'Boss' },
        { shape: 'square', color: '#c98a2a', label: 'Chest' },
        { shape: 'star', color: '#ff7a3a', label: 'Place' }
      ],
      markers: () => this.mapMarkers(),
      player: () => ({ x: this.hero.pos.x, z: this.hero.pos.z, yaw: this.hero.yaw }),
      waypoint: this.waypoint,
      onOpen: () => this._mapOpened(),
      onClose: () => this._mapClosed()
    });
    mapButton(this.minimap.el, () => this.openMap());
    // How to play (H, the ? by the minimap, the pause menu): opens by itself the first time.
    this.help = new HelpPanel({ host: this.root, id: 'gloamreach', table: CONTROLS, onOpen: () => this._holdOpened('help'), onClose: () => this._mapClosed() });
    helpButton(this.minimap.el, () => this.openHelp(), { style: 'left:-4px;top:-4px;width:30px;height:30px;font-size:15px' });
    this.cue = new WaypointCue(this.hud.el);
    this.beam ??= new WaypointBeam(this.scene);
    this.fightHud = new CombatHud(this.hud, { cls: this.picked, studio: this.studio });
    const game = this;
    this.panels = new Panels(this.root, {
      get profile() { return game.profile; },
      get preview() { return game.heroPreview(); },
      get heroName() { return HEROES.find((h) => h.id === game.picked)?.name ?? 'Hero'; },
      studio: this.studio,
      sfx: { tick: () => this.sound.tick(), coins: () => this.sfx.coins(), denied: () => this.sfx.denied(), equip: () => this.sfx.raise() },
      vitals: () => this.combat.vitals(),
      stats: () => this.combat.stats,
      drink: (k) => this.combat.drink(k),
      toast: (t, k, i, c) => this.fightHud.toast(t, k, i, c),
      onChange: () => this.gearChanged(),
      get merchant() { return game._shopBy?.c.shop ?? null; },
      merchantStock: () => {
        const lvl = this.profile.level;
        if (!this._stock || this._stock.level !== lvl || this._stock.cls !== this.picked) this._stock = { level: lvl, cls: this.picked, items: merchantStock({ level: lvl, cls: this.picked }) };
        return this._stock.items;
      }
    });
    this.mode = 'play';
    this.power.setMenu('none');
    this.area = null;
    this.music.jump(this.musicArea(), { fade: 2.5 });
    this.root.focus();
    this.help.openFirstTime();
  }

  /** What the full map shows besides you: merchants, villagers, monsters (elites, the boss), chests, the overlook. */
  mapMarkers() {
    const out = [];
    for (const b of this.life.people) out.push(b.c.merchant ? { x: b.x, z: b.z, shape: 'square', color: '#ffcf4a', label: b.c.name } : { x: b.x, z: b.z, color: '#ffd77a', r: 0.7 });
    for (const m of this.monsters.list) {
      if (!m.alive) continue;
      if (m.boss) out.push({ x: m.x, z: m.z, shape: 'skull', color: '#f4e6d0', r: 1.3, label: m.def?.name });
      else if (m.elite) out.push({ x: m.x, z: m.z, shape: 'diamond', color: '#ff3a2a', label: m.def?.name });
      else out.push({ x: m.x, z: m.z, color: '#ff4a3a', r: 0.75 });
    }
    for (const c of this.combat.chests) if (!c.opened) out.push({ x: c.x, z: c.z, shape: 'square', color: '#c98a2a', r: 0.8 });
    // The hub, its services, the doors and the places found.
    const z = this.zone;
    if (z) {
      out.push({ x: z.hub.x, z: z.hub.z, shape: 'pin', color: '#7ee08f', r: 1.3, label: `${z.hub.name} (safe)` });
      for (const [id, s] of Object.entries(z.hub.services)) if (id !== 'merchant') out.push({ x: s.x, z: s.z, color: '#9fe8a8', r: 0.55, label: SERVICE_NAMES[id] });
      for (const p of z.portals) out.push({ x: p.x, z: p.z, shape: 'tent', color: '#b98cff', r: 1.2, label: `${p.name} → ${this.zones.zone(p.to)?.name ?? '?'}` });
      const found = this.zoneSave.zones[z.id]?.pois ?? [];
      for (const p of z.pois) if (found.includes(p.id) && p.kind !== 'door') out.push({ x: p.x, z: p.z, shape: 'star', color: '#ff7a3a', r: 0.8, label: p.name });
    }
    return out;
  }

  /** Open the full map (`world`: on the World tab, from a hub's map board): the game waits while it's up. */
  openMap({ world = false } = {}) {
    if (!this.worldMap || (this.mode !== 'play' && this.mode !== 'paused')) return;
    if (this.mode === 'paused') {
      this.pauseEl?.remove();
      this.pauseEl = null;
    }
    if (world) this.worldMap.openWorld();
    else this.worldMap.open();
  }

  /** How to play: the game waits while it's up. */
  openHelp() {
    if (!this.help || (this.mode !== 'play' && this.mode !== 'paused')) return;
    if (this.mode === 'paused') {
      this.pauseEl?.remove();
      this.pauseEl = null;
    }
    this.help.open();
  }

  _holdOpened(mode) {
    this._mapOpened();
    this.mode = mode;
  }

  _mapOpened() {
    this.mode = 'map';
    this.keys.clear();
    this.follow.assist.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.power.setMenu('still');
  }

  _mapClosed() {
    this.mode = 'play';
    this.power.setMenu('none');
    this.root.focus();
  }

  /** The character panel's hero on a plinth (made when first shown). */
  heroPreview() {
    if (!this.preview && this.heroTemplates[this.picked]) {
      const def = HEROES.find((h) => h.id === this.picked);
      this.preview = new HeroPreview(this.heroTemplates[this.picked], this.picked, def.height);
      this.preview.dress(this.profile.equip);
    }
    return this.preview;
  }

  credits() {
    this.sound.tick();
    this.creditsOpen = creditsPanel(this.root, () => {
      this.creditsOpen = null;
      this.power.invalidate();
      this.root.focus();
    });
    this.power.invalidate();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    // Nothing moves behind the pause menu: draw only when something changes (a graphics choice, a resize).
    this.power.setMenu('still');
    this.pauseEl = pauseMenu(this.root, {
      graphics: menuSections(this.power.menu(), musicMenu(), cameraMenu(this.follow.assist)),
      onMap: () => this.openMap(),
      onHelp: () => this.openHelp(),
      soundOn: this.sound.enabled,
      onResume: () => this.resume(),
      onCredits: () => this.credits(),
      onSound: () => {
        this.sound.setEnabled(!this.sound.enabled);
        return this.sound.enabled;
      },
      onLeave: () => this.close()
    });
  }

  resume() {
    this.pauseEl?.remove();
    this.pauseEl = null;
    this.mode = 'play';
    this.power.setMenu('none');
    this.root.focus();
  }

  /* ================================================================ input */

  keyDown(e) {
    if (this.closed) return;
    if (this.mode === 'map') {
      if (e.code === 'Escape' || e.code === MAP_KEY) this.worldMap.close();
      return;
    }
    if (this.mode === 'help') {
      if (e.code === 'Escape' || KEY.help.includes(e.code)) this.help.close();
      return;
    }
    if (this.mode === 'hub') {
      if (e.code === 'Escape') this.hubPanel?.close();
      return;
    }
    if (this.mode === 'travel') return;
    if (e.code === 'Escape') {
      if (this.creditsOpen) this.creditsOpen.close();
      else if (this.mode === 'play' && this.panels?.any) this.panels.closeAll();
      else if (this.mode === 'play') this.pause();
      else if (this.mode === 'paused') this.resume();
      return;
    }
    if (this.mode !== 'play') return;
    if (this.follow.assist.key(e.code, true)) {
      e.preventDefault();
      return;
    }
    // Q / E turn the camera too (held: read each frame).
    if (e.code === 'KeyQ' || e.code === 'KeyE') {
      this.keys.add(e.code);
      this.follow.assist.input();
      e.preventDefault();
      return;
    }
    if (e.code === MAP_KEY && !e.repeat) {
      this.openMap();
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (KEY.help.includes(e.code) && !e.repeat) {
      this.openHelp();
      return;
    }
    if (!e.repeat) {
      if (BAR_CODES[e.code]) this.combat.press(BAR_CODES[e.code]);
      if (KEY.hp.includes(e.code)) this.combat.drink('hp');
      if (KEY.mp.includes(e.code)) this.combat.drink('mp');
      if (KEY.interact.includes(e.code)) this.interact();
      if (KEY.bag.includes(e.code)) this.panels.toggle('bag');
      if (KEY.hero.includes(e.code)) this.panels.toggle('char');
      if (KEY.look.includes(e.code)) this.toggleMouseLook();
    }
    this.keys.add(e.code);
  }

  keyUp(e) {
    this.keys.delete(e.code);
    this.follow?.assist.key(e.code, false);
    if (BAR_CODES[e.code]) this.combat?.release(BAR_CODES[e.code]);
  }

  /** F: open the chest in reach, use the hub's service at hand, or trade with its merchant. */
  interact() {
    const c = this.combat.nearestChest();
    if (c) return this.combat.openChest(c);
    const s = this.nearService();
    if (s) return this.useService(s.id);
    const m = this.nearMerchant();
    if (m) {
      this._shopBy = m;
      this.panels.toggle('shop', !this.panels.open.shop);
    }
  }

  nearMerchant() {
    return this.life?.people.find((b) => b.c.merchant && Math.hypot(b.x - this.hero.pos.x, b.z - this.hero.pos.z) < 5);
  }

  /** V: steer the camera with the mouse (aiming at the screen's centre), or have the pointer back. */
  toggleMouseLook() {
    const c = this.renderer.domElement;
    if (document.pointerLockElement) document.exitPointerLock();
    else c.requestPointerLock?.()?.catch?.(() => {});
  }

  mouseMove(e) {
    if (this.mode !== 'play') return;
    // While a left-drag turns the camera the aim stays where it was (the reticle hides).
    if (this.lmb?.dragging) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = e.clientX - r.left;
    this.pointer.y = e.clientY - r.top;
    this.pointer.moved = this.t;
    // Mouse-look, or a middle-button drag, turns the camera.
    if (document.pointerLockElement === this.renderer.domElement || e.buttons & 4) this.follow.look(e.movementX, e.movementY);
  }

  lockChanged() {
    this._locked = Boolean(document.pointerLockElement);
    this.fightHud?.crosshair(this._locked);
  }

  bindPointer() {
    const c = this.renderer.domElement;
    if (this._bound) return;
    this._bound = true;
    const BTN = { 0: 'LMB', 2: 'RMB' };
    // Left mouse (or a finger): a click attacks, a press held still is a held attack, a press that moves
    // first turns the camera like Kithvale's and fires nothing (shared/cameraAssist.js PressDrag).
    // In mouse-look it attacks at once, as before.
    this.lmb = new PressDrag();
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => {
      this.sound.wake();
      if (this.mode !== 'play') return;
      this.pointer.on = true;
      if (e.button === 0 && !this._locked) {
        const r = c.getBoundingClientRect();
        this.pointer.x = e.clientX - r.left;
        this.pointer.y = e.clientY - r.top;
        this.pointer.moved = this.t;
        this.lmb.down(e.clientX, e.clientY, performance.now());
        return;
      }
      if (BTN[e.button]) this.combat.press(BTN[e.button]);
      if (e.button === 1) e.preventDefault();
    });
    window.addEventListener('pointermove', (this._onDrag = (e) => {
      if (!this.lmb.active || this.mode !== 'play') return;
      const m = this.lmb.move(e.clientX, e.clientY, performance.now());
      if (m.kind === 'drag') this.follow.look(m.dx, m.dy);
      else if (m.kind === 'hold' && !this.combat.held.has('LMB')) this.combat.press('LMB');
    }));
    window.addEventListener('pointerup', (this._onUpBtn = (e) => {
      if (e.button === 0 && this.lmb.active) {
        const k = this.lmb.up(performance.now());
        if (k === 'click' || k === 'release-late') {
          this.combat?.press('LMB');
          this.combat?.release('LMB');
        } else if (k === 'release') this.combat?.release('LMB');
        return;
      }
      if (BTN[e.button]) this.combat?.release(BTN[e.button]);
    }));
    window.addEventListener('pointercancel', (this._onCancel = () => {
      if (this.lmb.state === 'hold') this.combat?.release('LMB');
      this.lmb.cancel();
    }));
    c.addEventListener('pointerenter', () => (this.pointer.on = true));
    c.addEventListener('pointerleave', () => (this.pointer.on = false));
    c.addEventListener('wheel', (e) => {
      if (this.mode === 'play') this.follow.zoom(e.deltaY);
    }, { passive: true });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  input() {
    const k = this.keys;
    const has = (c) => k.has(c);
    let x = 0;
    let z = 0;
    for (const code of k) {
      const v = KEYS[code];
      if (v === 'f') z += 1;
      if (v === 'b') z -= 1;
      if (v === 'l') x -= 1;
      if (v === 'r') x += 1;
    }
    return { x: Math.sign(x), z: Math.sign(z), sprint: has('ShiftLeft') || has('ShiftRight'), walk: has('ControlLeft') || has('ControlRight'), jump: has('Space') };
  }

  /* ================================================================ frame */

  frame(dt, rawMs) {
    // Between zones (or while one builds) nothing moves and nothing is drawn: the trip's card covers the view.
    if (this.mode === 'travel' || !this.zoneReady) return;
    this.bindPointer();
    this.t += dt;
    const t = this.t;
    const playing = this.mode === 'play';
    let fdt = dt;
    if (playing) {
      const inp = this.input();
      this.lastInput = inp;
      this.combat.setAim(this.aimPoint());
      fdt = this.combat.update(dt);
      this.hero.update(fdt, inp, this.follow.heading());
      this.zones.update(dt, this.hero.pos.x, this.hero.pos.z);
      if (this.mode === 'travel' || !this.zoneReady) return;
      // Monsters give up on a hero in the hub (they go home past its edge, and can't step inside).
      const rule = monsterRule(this.zone, this.hero.pos.x, this.hero.pos.z);
      this.monsters.update(fdt, this.combat.t, { pos: this.hero.pos, alive: !this.combat.dead && rule.chase }, { hitHero: (m, a, o) => this.combat.hitHero(m, a, o), projectile: (m, a, f, to, off) => this.combat.monsterShot(m, a, f, to, off) }, this.camera);
      this.monsterEvents();
      // In a fight the camera holds still rather than swinging behind.
      // No swinging round on its own in a fight, while aiming or blocking, or in mouse-look.
      this.follow.pause = this.combat.inCombat > 0 || this.combat.aimHold > 0 || this.combat.blocking || Boolean(this._locked);
      // A left press held still becomes a held attack (keep shooting); Q / E turn the camera.
      if (this.lmb?.tick(performance.now()) === 'hold') this.combat.press('LMB');
      this.follow.extraLeft = this.keys.has('KeyQ');
      this.follow.extraRight = this.keys.has('KeyE');
      this.follow.update(dt, this.hero, { sprinting: inp.sprint && this.hero.speed > 5, moving: this.hero.speed > 0.5 });
      this.shakeCamera(dt);
      this.rig?.update(fdt, this.hero.object);
      const t2 = this.combat.aimTarget;
      this.vfx.setReticle((this.pointer.on || this._locked) && !this.lmb?.dragging ? this.combat.aim : null, t2 ? { radius: t2.r * 1.5 + 0.4, locked: true } : { radius: 0.8 });
      if (t2) this.vfx.placeDecal(this.vfx.reticle, t2.x, t2.z, 0, t2.r * 1.5 + 0.4);
      this.vfx.update(dt, this.camera);
      if (this.panels.open.char) this.preview?.frame(dt);
      if ((this._saveT += dt) > 15 && this._dirty) {
        this._saveT = 0;
        this._dirty = false;
        writeSave(this.save);
      }
    } else if (this.mode === 'menu') {
      this.hero.actor.move(0);
      this.hero.actor.update(dt);
      this.menuCamera(t);
    } else {
      this.hero.actor.update(0);
    }
    void fdt;
    shared.uPlayer.value.copy(this.hero.pos);
    const focus = this.hero.pos;
    const look = this.world.update(dt, t, this.camera, focus);
    shared.uRimColor.value.copy(this.world.lighting.sun.color).multiplyScalar(0.6);
    shared.uWind.value.set(0.8, 0.6, 1, 0.3 + 0.3 * Math.sin(t * 0.13));
    this.life.update(dt, t, this.camera, playing ? this.hero : null);
    this.vista?.update(dt, t, this.camera, { ...look, lightColor: this.world.lighting.sun.color });
    this.effects.update(dt, t, this.camera, { gloam: this.world.gloam, lightColor: this.world.lighting.sun.color, toLight: look.toLight, wind: { x: 0.8, y: 0.6 } });
    // Events: greetings, the smith's hammer, the drake.
    for (const ev of this.life.events) {
      if (ev.type === 'greet' && this.hud) this.hud.say(ev.who.c.id, ev.who.c.greet);
      if (ev.type === 'hammer') {
        this.effects.burst(ev.at, 10, [1, 0.6, 0.2], 3);
        this.sound.clang(ev.at.distanceTo(this.camera.position));
      }
    }
    for (const d of this.doors ?? []) d.update(t);
    this.hubProps?.update(t, dt);
    if (this.mannequin) {
      this.mannequin.actor.move(0);
      this.mannequin.actor.update(dt);
      this.mannequin.rig.update(dt, this.mannequin.actor.object);
    }
    for (const ev of this.vista?.takeEvents() ?? []) if (ev.type === 'roar' || ev.type === 'drakeFire') this.sound.roar(ev.at.distanceTo(this.camera.position));
    const rift = this.world.rift ? 1 : THREE.MathUtils.smoothstep(focus.x, 70, 130) * (1 - this.world.gloam);
    this.sound.update(dt, { gloam: this.world.gloam, rift });
    look.bloom = 0.3 + this.world.gloam * 0.12;
    // The sun's shadow: redrawn when due (every frame on High and Ultra; every few, or when the view moves, below).
    const cam = this.camera.position;
    const s = this.settings;
    this.renderer.shadowMap.needsUpdate = s.shadowOn && (this.renderer.shadowMap.needsUpdate || this.power.shadowDue(s.shadowEvery, cam.x, cam.z, this.follow.yaw ?? 0));
    // The haze thickens a little on the nearer draw distances, so where detail stops reads as distance.
    this.power.gpuBegin();
    this.post.render(this.scene, this.camera, { ...look, fogDensity: look.fogDensity * s.fog, lightColor: this.world.lighting.sun.color, gloam: this.world.gloam, fade: 0 });
    this.power.gpuEnd();
    if (playing) this.power.setUrgent(this.combat.inCombat > 0 || Boolean(this.combat.aimTarget));
    if (playing) this.musicFrame(dt);
    // The waypoint: its beam in the world, the cue toward it.
    const wp = this.waypoint?.point;
    this.beam?.update(wp, wp ? this.world.colliders.height(wp.x, wp.z) : 0, t);
    if (playing) this.cue?.update(this.waypoint, this.hero.pos.x, this.hero.pos.z, this.follow.heading());
    if (playing && this.hud) this.hudFrame(dt);
    this.power.showFps(this.root);
    // Quality: the power governor keeps detail within the preset's GPU budget;
    // the old one still lowers the resolution if frames really run slow.
    if (playing && rawMs > 0 && rawMs < 500) {
      const cap = this.power.cap;
      const res = this.governor.frame(cap && cap < 60 ? rawMs * (cap / 60) : rawMs);
      const lvl = this.power.sample(rawMs);
      if (res && res !== this.resTier) {
        this.resTier = res;
        this.applyPower();
      } else if (lvl && lvl !== this.tier && !this.quality) this.applyPower();
    }
  }

  /** Where the music thinks you are: the hearth among the houses, the fields, the Gloamwood, the drake's ledge. */
  musicArea() {
    const p = this.hero.pos;
    return gloamreachTrack({ area: this.areaHere(p.x, p.z), x: p.x, z: p.z, gloam: this.world?.gloam ?? 0 });
  }

  /**
   * The soundtrack's mood: Steel Rain the moment a monster comes for you
   * (alert, chasing, striking, within 40 m), Crown of Cinders for Cindermaw,
   * back to the place's own track 5 s after the last one breaks off.
   */
  musicFrame(dt) {
    const h = this.hero.pos;
    let fight = false;
    let boss = false;
    if (!this.combat.dead) {
      for (const m of this.monsters.list) {
        if (!m.alive || !FIGHTING.has(m.state)) continue;
        const d = Math.hypot(m.x - h.x, m.z - h.z);
        if (d < 40) fight = true;
        if (m.boss && d < 50) boss = true;
      }
    }
    this.music.update(dt, { area: this.musicArea(), fight, boss });
  }

  /** The ground under the pointer (or the screen's centre in mouse-look): a ray marched over the land. */
  aimPoint() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const nx = this._locked ? 0 : (this.pointer.x / w) * 2 - 1;
    const ny = this._locked ? 0 : -(this.pointer.y / h) * 2 + 1;
    if (!this._locked && !this.pointer.on && this.t - this.pointer.moved > 20) return null;
    const ray = (this._ray ??= new THREE.Raycaster());
    ray.setFromCamera({ x: nx, y: ny }, this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    const H = (x, z) => this.world.colliders.height(x, z);
    let prev = 0;
    for (let s = 0.5; s < 90; s *= 1.08) {
      const x = o.x + d.x * s;
      const z = o.z + d.z * s;
      const y = o.y + d.y * s;
      if (y <= H(x, z)) {
        // Refine between the last two steps.
        let a = prev;
        let b = s;
        for (let i = 0; i < 8; i++) {
          const m = (a + b) / 2;
          if (o.y + d.y * m <= H(o.x + d.x * m, o.z + d.z * m)) b = m;
          else a = m;
        }
        return { x: o.x + d.x * b, y: o.y + d.y * b, z: o.z + d.z * b };
      }
      prev = s;
    }
    // Looking at the sky: a point far out at the hero's height.
    const k = 30;
    return { x: this.hero.pos.x + d.x * k, y: this.hero.pos.y, z: this.hero.pos.z + d.z * k };
  }

  shakeCamera(dt) {
    const k = this.combat.shake;
    if (k <= 0.001) return;
    const a = k * k * 0.28;
    const t = this.t * 47;
    this.camera.position.x += (Math.sin(t) + Math.sin(t * 2.3)) * a * 0.5;
    this.camera.position.y += (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.1)) * a * 0.5;
    this.camera.position.z += Math.sin(t * 1.3 + 2) * a * 0.5;
    void dt;
  }

  /** What the monsters did this frame: sounds, the look of their blows, burning. */
  monsterEvents() {
    const cam = this.camera.position;
    for (const ev of this.monsters.takeEvents()) {
      const m = ev.m;
      const dist = Math.hypot(m.x - cam.x, m.z - cam.z);
      const voice = m.def.voice ?? MONSTER_VOICE[m.type] ?? 'beast';
      if (ev.type === 'aggro') this.sfx.voice(voice, 'aggro', dist);
      else if (ev.type === 'death') {
        this.sfx.voice(voice, 'death', dist);
        this.vfx.burst(ev.at, 16, m.def.family === 'fey' || m.def.family === 'spider' ? [2, 0.8, 3] : [2.4, 1.2, 0.4], { speed: 3, life: 0.8, size: 0.12, gravity: -1 });
      } else if (ev.type === 'windup') {
        if (m.boss || m.elite || ev.attack.kind === 'charge') this.sfx.voice(voice, 'windup', dist);
        if (m.wisp) this.vfx.burst(this.monsters.centre(m), 8, [2, 0.6, 3], { speed: 2, life: 0.4, size: 0.1, gravity: 0 });
      } else if (ev.type === 'strike' && ev.attack.kind === 'melee') {
        const p = this.monsters.centre(m).add(new THREE.Vector3(Math.sin(m.yaw), 0, Math.cos(m.yaw)).multiplyScalar(m.r + 0.6));
        this.vfx.slash(p, m.yaw, { radius: ev.attack.range * 0.8 + m.r * 0.5, arc: ev.attack.arc, color: [2.4, 0.6, 0.4], life: 0.16, tilt: 0.5 });
        this.sfx.swing(0.8);
      } else if (ev.type === 'aoe') {
        const a = ev.attack;
        this.vfx.explode(ev.at.clone().add(new THREE.Vector3(0, 0.3, 0)), a.radius * 0.8, { color: a.fire ? 'fire' : a.poison ? 'poison' : m.def.family === 'fey' ? 'arcane' : 'dust' });
        this.vfx.smokeAt(ev.at, 8, a.poison ? [0.3, 0.6, 0.2] : [0.5, 0.45, 0.4], { size: 0.7, grow: 2, life: 1.2, speed: 2.5, up: 0.4 });
        if (Math.hypot(ev.at.x - this.hero.pos.x, ev.at.z - this.hero.pos.z) < a.radius + 6) this.combat._shake(m.boss ? 0.5 : 0.25);
        this.sfx.boom(m.boss ? 1 : 0.6);
      } else if (ev.type === 'breath') {
        const head = this.monsters.centre(m).add(new THREE.Vector3(Math.sin(m.yaw), 0.4, Math.cos(m.yaw)).multiplyScalar(m.r * 1.4));
        for (let i = 0; i < 14; i++) {
          const spread = (Math.random() - 0.5) * m.attack.arc;
          const dir = new THREE.Vector3(Math.sin(m.yaw + spread), -0.12 + Math.random() * 0.1, Math.cos(m.yaw + spread));
          this.vfx.parts.push({ p: head.clone(), v: dir.multiplyScalar(10 + Math.random() * 6), life: 0, max: 0.8, size: 0.5 + Math.random() * 0.5, color: Math.random() < 0.5 ? [3.4, 1.3, 0.25] : [2.8, 0.7, 0.1], gravity: -2, drag: 1.4, grow: 2.2 });
        }
        this.vfx.flash(head, 0xff7a2a, 30, 0.2, 14);
        if (Math.random() < 0.4) this.sfx.fire();
      } else if (ev.type === 'burn') {
        if (!m.alive) continue;
        const died = this.monsters.damage(m, { amount: ev.amount, from: { x: m.x, z: m.z } }, null);
        this.fightHud.number(this.monsters.centre(m), ev.amount, 'dmg');
        this.vfx.fire(this.monsters.centre(m), 3);
        if (died) this.combat._killed(m);
      }
    }
  }

  hudFrame(dt) {
    const hero = this.hero;
    // The place's banner.
    const area = this.areaHere(hero.pos.x, hero.pos.z);
    if (area !== this.area) {
      const first = this.area === null;
      this.area = area;
      const a = (this.world.rift ? RIFT_AREAS : AREAS).find((x) => x.id === area);
      if (a && !first) this.hud.showBanner(a.name, a.sub);
    }
    // Name plates over the nearest people.
    const plates = [];
    const v = new THREE.Vector3();
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    for (const { b, d } of this.life.near(hero.pos, 12).slice(0, 4)) {
      const head = b.actor.object.position.clone();
      const box = b.c.height ?? 1.8;
      head.y += (b.state === 'sit' ? box * 0.75 : box) + 0.35;
      v.copy(head).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      plates.push({ id: b.c.id, name: b.c.name ?? '', title: b.c.title ?? '', x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, d });
    }
    // At most two plates, the farther nudged up if they'd overlap.
    const shown = plates.filter((p) => p.name).slice(0, 2);
    if (shown.length === 2 && Math.abs(shown[0].x - shown[1].x) < 170 && Math.abs(shown[0].y - shown[1].y) < 50) shown[1].y = Math.min(shown[1].y, shown[0].y) - 52;
    this.hud.update(dt, shown);
    // The fight's HUD.
    const ms = this.monsters.list;
    for (const m of ms) {
      m.top = this.monsters.top(m);
      m.dist = Math.hypot(m.x - hero.pos.x, m.z - hero.pos.z);
    }
    const boss = ms.find((m) => m.boss && m.alive && m.engaged > 0 && !['idle', 'patrol', 'return'].includes(m.state) && m.dist < 45);
    // Draw the camera back for the boss, so the whole drake is in the picture.
    if (boss && this.follow.wantDist < 8) this.follow.wantDist += (8 - this.follow.wantDist) * Math.min(1, dt * 2);
    let prompt = null;
    const chest = this.combat.nearestChest();
    const service = this.nearService();
    const merchant = this.nearMerchant();
    const door = portalNear(this.zone, hero.pos.x, hero.pos.z, 5);
    if (chest) prompt = '<kbd>F</kbd> Open the chest';
    else if (service) prompt = `<kbd>F</kbd> ${this.serviceLabel(service)}`;
    else if (merchant) prompt = this.panels.open.shop ? '<kbd>F</kbd> Done trading' : `<kbd>F</kbd> Trade with ${merchant.c.name.split(' ')[0]}`;
    else if (door) prompt = `${door.portal.name} — to ${this.zones.zone(door.portal.to)?.name ?? '?'}`;
    let target = this.combat.aimTarget ?? (this.combat.lastHit?.alive && this.combat.t - this.combat.lastHitT < 4 ? this.combat.lastHit : null);
    if (target && target === boss) target = null; // the boss has its own great bar
    this.fightHud.update(dt, { vitals: this.combat.vitals(), bar: this.combat.bar(), target, boss, camera: this.camera, w, h, monsters: ms, prompt });
    // The minimap, every other frame.
    if ((this._mm = !this._mm)) {
      const dots = [];
      for (const b of this.life.people) dots.push({ x: b.x, z: b.z, color: '#ffd77a', r: 1.8 });
      for (const b of this.life.animals) dots.push({ x: b.x, z: b.z, color: '#e8e8e8', r: 1.4 });
      for (const m of this.monsters.list) {
        if (!m.alive) continue;
        if (m.boss) dots.push({ x: m.x, z: m.z, shape: 'skull' });
        else if (m.elite) dots.push({ x: m.x, z: m.z, color: '#ff3a2a', shape: 'elite', r: 2.6 });
        else dots.push({ x: m.x, z: m.z, color: '#ff4a3a', r: 1.7, ring: true });
      }
      for (const c of this.combat.chests) if (!c.opened) dots.push({ x: c.x, z: c.z, shape: 'chest' });
      const wp = this.waypoint?.point;
      if (wp) dots.push({ x: wp.x, z: wp.z, color: '#ff5ad9', r: 3, ring: true });
      for (const p of this.zone.portals) dots.push({ x: p.x, z: p.z, color: '#b98cff', r: 3, ring: true });
      dots.push({ x: this.zone.hub.x, z: this.zone.hub.z, color: '#7ee08f', r: 2.4 });
      this.minimap.draw({ x: hero.pos.x, z: hero.pos.z, yawMap: Math.atan2(Math.cos(hero.yaw), Math.sin(hero.yaw)) + Math.PI / 2 }, this.follow.heading(), dots);
    }
    if (this.debug && (this._st = (this._st ?? 0) + dt) > 0.5) {
      this._st = 0;
      const s = this.post.stats ?? {};
      this.hud.setStats(`${this.fps} fps  ${(1000 / Math.max(1, this.fps)).toFixed(1)} ms\ndraws ${s.calls}  tris ${((s.triangles ?? 0) / 1e6).toFixed(2)}M\ntier ${this.tier}  res ${this.resTier}  ${this.gpu}\n${this.power.debugLine()}\npos ${hero.pos.x.toFixed(1)}, ${hero.pos.z.toFixed(1)}  zone ${this.zone.id}`);
    }
  }

  /* ================================================================ for tests and cover shots */

  /** Frame time with the GPU waited for (ms, mean of `n` frames) and the draw counts — for ?debug and tests. */
  bench(n = 30) {
    const gl = this.renderer.getContext();
    this.frame(1 / 60, 16);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      this.frame(1 / 60, 16);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
    const ms = (performance.now() - t0) / n;
    return { ms: Math.round(ms * 100) / 100, calls: this.post.stats?.calls, triangles: this.post.stats?.triangles, tier: this.tier };
  }

  /** Put the hero somewhere, facing `yaw`, the camera behind (pitch, distance optional). */
  teleport(x, z, yaw = Math.PI, { pitch = 0.16, dist = 4.6 } = {}) {
    this.hero.place(x, z, yaw);
    this.rig?.settle();
    this.follow.yaw = yaw + Math.PI;
    this.follow.pitch = pitch;
    this.follow.wantDist = this.follow.dist = this.follow.cur = dist;
    this.follow.pivot.set(0, 0, 0);
    this.follow.update(0.016, this.hero, {});
  }
}
