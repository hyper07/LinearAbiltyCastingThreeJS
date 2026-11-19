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
import { buildWorld } from './world.js';
import { Post } from './post.js';
import { SETTINGS, chooseTier, Governor } from './quality.js';
import { CameraAssist, loadAssist, cameraMenu, menuSections } from '../shared/cameraAssist.js';
import { PowerKit } from '../shared/powerKit.js';
import { WorldMap, Waypoint, WaypointCue, mapButton, MAP_KEY } from '../shared/worldMap.js';
import { WaypointBeam } from '../shared/waypointBeam.js';
import { HelpPanel, helpButton, codesFor, hintItems } from '../shared/helpPanel.js';
import { CONTROLS } from './controls.js';
import { powerSettings } from '../shared/power.js';
import { Effects } from './fx.js';
import { Vista } from './vista.js';
import { Life } from './life.js';
import { loadTemplate, FallbackActor } from './actors.js';
import { FighterActor } from './fighter.js';
import { GearRig, learnFrames } from './gearRig.js';
import { Monsters } from './monsters.js';
import { CombatFx } from './vfx.js';
import { Combat } from './combat.js';
import { CombatHud } from './combatHud.js';
import { Panels } from './panels.js';
import { ItemStudio, HeroPreview } from './icons.js';
import { Sfx } from './sfx.js';
import { loadSave, writeSave, profileFor } from './save.js';
import { merchantStock, makeItem } from './items.js';
import { buildItem } from './gearModels.js';
import { STALLS, toWorld } from './map.js';
import { Hero } from './hero.js';
import { FollowCamera } from './camera.js';
import { Sound } from './audio.js';
import { HEROES } from './cast.js';
import { START, AREAS, areaAt, OVERLOOK, EXTENT } from './map.js';
import { shared } from './materials.js';
import { paintMap, Minimap } from './minimap.js';
import { Loading, StartScreen, Hud, creditsPanel, pauseMenu, el } from './ui.js';
import './gloamreach.css';

const PREFS = 'gloamreach.prefs';
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
    const progress = (label, k) => this.loading?.set(label, k * 0.7);
    this.world = await buildWorld({ renderer, bank: this.bank, settings, onProgress: progress });
    if (this.closed) return;
    const scene = this.world.scene;
    this.scene = scene;
    this.effects = new Effects(this.bank, { fireflies: settings.fireflies });
    scene.add(this.effects.group);
    for (const [id, h] of Object.entries(this.world.spots.homes)) this.effects.addChimney(h.chimney, { rate: 1.6, size: 1.1, dark: 0.75 });
    this.effects.addChimney(this.world.spots.homes.smithy.forge.clone().add(new THREE.Vector3(0, 0.3, 0)), { rate: 3, size: 0.6, dark: 0.35, sparks: 0.5 });
    for (const [x, z, r] of [[0, -300, 9], [-10, -230, 14], [12, -265, 12], [-20, -190, 10], [30, -210, 8]]) this.effects.addWisp(new THREE.Vector3(x, this.world.grid.at(x, z), z), r, Math.random() < 0.5 ? [0.55, 0.85, 1] : [0.9, 0.6, 1]);
    this.loading?.set('Lighting the rift', 0.72);
    this.vista = new Vista();
    await this.vista.build(this.bank, this.effects);
    scene.add(this.vista.group);
    this.loading?.set('Waking the people', 0.78);
    this.life = new Life({ scene, world: this.world, bank: this.bank, effects: this.effects });
    await this.life.load((k) => this.loading?.set('Waking the people', 0.78 + k * 0.17));
    this.loading?.set('Calling the heroes', 0.96);
    this.heroTemplates = {};
    await Promise.all(HEROES.map(async (h) => (this.heroTemplates[h.id] = await loadTemplate(h.model, { detail: this.bank.noise(), borrow: HERO_CLIPS }))));
    if (this.closed) return;
    learnFrames(Object.values(this.heroTemplates));
    // The fight: its effects, the monsters, sounds, item pictures.
    this.loading?.set('Stirring the wilds', 0.965);
    this.vfx = new CombatFx(scene, this.bank, (x, z) => this.world.colliders.height(x, z));
    this.monsters = new Monsters({ scene, world: this.world, bank: this.bank, vfx: this.vfx });
    await this.monsters.load((k) => this.loading?.set('Stirring the wilds', 0.965 + k * 0.03));
    if (this.closed) return;
    this.sfx = new Sfx(this.sound);
    this.studio = new ItemStudio();
    this._armsStall();
    this.follow = new FollowCamera(this.camera, this.world.colliders);
    // , . turn the camera, [ ] tilt it, / puts it behind the hero; it eases back by itself after a quiet spell.
    this.follow.assist = new CameraAssist(loadAssist('gloamreach'), { id: 'gloamreach' });
    this.post = new Post(renderer);
    this.applyPower(true);
    this.minimapCanvas = paintMap(this.world.grid, this.world.scattered);
    this.setHero(this.picked);
    // Compile the shaders now, not at the first glance at something.
    this.menuCamera(0);
    this.world.update(0.016, 0, this.camera, this.heroFocus());
    renderer.compile(scene, this.camera);
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

  close() {
    if (this.closed) return;
    this.closed = true;
    this.power?.dispose();
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLock);
    if (this._onUpBtn) window.removeEventListener('pointerup', this._onUpBtn);
    if (document.pointerLockElement) document.exitPointerLock();
    this.life?.dispose();
    if (this.profile) writeSave(this.save);
    this.combat?.dispose();
    this.rig?.dispose();
    this.monsters?.dispose();
    this.vfx?.dispose();
    this.panels?.dispose();
    this.preview?.dispose();
    this.studio?.dispose();
    this.fightHud?.dispose();
    this.heroActor?.dispose();
    this.effects?.dispose();
    this.world?.dispose();
    this.post?.dispose();
    this.hud?.dispose();
    this.minimap?.dispose();
    this.worldMap?.dispose();
    this.help?.dispose();
    this.cue?.dispose();
    this.beam?.dispose();
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
    this.post.configure({ ao: s.ao, rays: s.rays, bloom: s.bloom, smaa: (s.smaa && (s.preset === 'ultra' || !s.msaa)) || !s.msaa, msaa: s.msaa, bloomHalf: s.bloomHalf }, s.scale);
    const lighting = this.world.lighting;
    if (!first && (prev.shadow !== s.shadow || prev.shadowBox !== s.shadowBox)) lighting.setShadow(s.shadow, s.shadowBox);
    lighting.sun.castShadow = s.shadowOn;
    this.renderer.shadowMap.needsUpdate = true;
    this.world.lights.setCount(s.lights);
    this.world.foliage.setDensity(s.grass, s.grassReach);
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
    else this.hero.place(1, 26, 0);
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
      get world() { return game.world; },
      get scene() { return game.scene; },
      get follow() { return game.follow; },
      get lastInput() { return game.lastInput; },
      get reducedMotion() { return game.reducedMotion; },
      hud: hudApi,
      teleport: (x, z, yaw) => game.teleport(x, z, yaw, { pitch: game.follow.pitch, dist: game.follow.wantDist }),
      onChange: () => game.gearChanged(),
      onSave: () => game.persist()
    };
    return this._api;
  }

  /** Gear or level changed: numbers, looks, the preview, the save. */
  gearChanged() {
    this.combat?.recalc();
    this.rig?.dress(this.profile.equip);
    this.preview?.dress(this.profile.equip);
    this.persist();
  }

  persist() {
    this._dirty = true;
  }

  /** The armsmonger's stall shows its wares: blades laid across the crates, a helm, a shield against the counter. */
  _armsStall() {
    const st = STALLS.find((s) => s.goods === 'arms');
    if (!st) return;
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
    this.hero.place(1, 26, 0);
    this.start = new StartScreen(this.root, {
      picked: this.picked,
      onPick: (id) => {
        this.sound.wake();
        this.sound.tick();
        this.setHero(id);
        this.hero.place(1, 26, 0);
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
    this.hero.place(START.x, START.z, START.yaw);
    this.follow.yaw = START.yaw + Math.PI;
    this.follow.pitch = 0.16;
    this.follow.pivot.set(0, 0, 0);
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
    this.hud = new Hud(this.root, { debug: this.debug, hint: hintItems(CONTROLS) });
    this.minimap = new Minimap(this.hud.el, this.minimapCanvas);
    // The full map (O, the pause menu's Map, or the minimap's button) and its waypoint.
    this.waypoint ??= new Waypoint();
    this.worldMap = new WorldMap({
      host: this.root,
      title: 'Gloamreach',
      base: this.minimapCanvas,
      extent: EXTENT,
      areas: AREAS,
      legend: [
        { shape: 'square', color: '#ffcf4a', label: 'Merchant' },
        { shape: 'dot', color: '#ffd77a', label: 'Villager' },
        { shape: 'dot', color: '#ff4a3a', label: 'Monster' },
        { shape: 'diamond', color: '#ff3a2a', label: 'Elite' },
        { shape: 'skull', color: '#f4e6d0', label: 'Boss' },
        { shape: 'square', color: '#c98a2a', label: 'Chest' },
        { shape: 'star', color: '#ff7a3a', label: 'Overlook' }
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
      merchantStock: () => {
        const lvl = this.profile.level;
        if (!this._stock || this._stock.level !== lvl || this._stock.cls !== this.picked) this._stock = { level: lvl, cls: this.picked, items: merchantStock({ level: lvl, cls: this.picked }) };
        return this._stock.items;
      }
    });
    this.mode = 'play';
    this.power.setMenu('none');
    this.area = null;
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
    out.push({ x: OVERLOOK.x, z: OVERLOOK.z, shape: 'star', color: '#ff7a3a', label: 'Cinder Rift Overlook' });
    return out;
  }

  /** Open the full map: the game waits (and the 3D stops drawing) while it's up. */
  openMap() {
    if (!this.worldMap || (this.mode !== 'play' && this.mode !== 'paused')) return;
    if (this.mode === 'paused') {
      this.pauseEl?.remove();
      this.pauseEl = null;
    }
    this.worldMap.open();
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
      graphics: menuSections(this.power.menu(), cameraMenu(this.follow.assist)),
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

  /** F: open the chest in reach, or trade with the armsmonger. */
  interact() {
    const c = this.combat.nearestChest();
    if (c) return this.combat.openChest(c);
    const m = this.nearMerchant();
    if (m) this.panels.toggle('shop', !this.panels.open.shop);
  }

  nearMerchant() {
    return this.life.people.find((b) => b.c.merchant && Math.hypot(b.x - this.hero.pos.x, b.z - this.hero.pos.z) < 5);
  }

  /** V: steer the camera with the mouse (aiming at the screen's centre), or have the pointer back. */
  toggleMouseLook() {
    const c = this.renderer.domElement;
    if (document.pointerLockElement) document.exitPointerLock();
    else c.requestPointerLock?.()?.catch?.(() => {});
  }

  mouseMove(e) {
    if (this.mode !== 'play') return;
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
    c.addEventListener('pointerdown', (e) => {
      this.sound.wake();
      if (this.mode !== 'play') return;
      this.pointer.on = true;
      if (BTN[e.button]) this.combat.press(BTN[e.button]);
      if (e.button === 1) e.preventDefault();
    });
    window.addEventListener('pointerup', (this._onUpBtn = (e) => {
      if (BTN[e.button]) this.combat?.release(BTN[e.button]);
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
      this.monsters.update(fdt, this.combat.t, { pos: this.hero.pos, alive: !this.combat.dead }, { hitHero: (m, a, o) => this.combat.hitHero(m, a, o), projectile: (m, a, f, to, off) => this.combat.monsterShot(m, a, f, to, off) }, this.camera);
      this.monsterEvents();
      // In a fight the camera holds still rather than swinging behind.
      // No swinging round on its own in a fight, while aiming or blocking, or in mouse-look.
      this.follow.pause = this.combat.inCombat > 0 || this.combat.aimHold > 0 || this.combat.blocking || Boolean(this._locked);
      this.follow.update(dt, this.hero, { sprinting: inp.sprint && this.hero.speed > 5, moving: this.hero.speed > 0.5 });
      this.shakeCamera(dt);
      this.rig?.update(fdt, this.hero.object);
      const t2 = this.combat.aimTarget;
      this.vfx.setReticle(this.pointer.on || this._locked ? this.combat.aim : null, t2 ? { radius: t2.r * 1.5 + 0.4, locked: true } : { radius: 0.8 });
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
    this.vista.update(dt, t, this.camera, { ...look, lightColor: this.world.lighting.sun.color });
    this.effects.update(dt, t, this.camera, { gloam: this.world.gloam, lightColor: this.world.lighting.sun.color, toLight: look.toLight, wind: { x: 0.8, y: 0.6 } });
    // Events: greetings, the smith's hammer, the drake.
    for (const ev of this.life.events) {
      if (ev.type === 'greet' && this.hud) this.hud.say(ev.who.c.id, ev.who.c.greet);
      if (ev.type === 'hammer') {
        this.effects.burst(ev.at, 10, [1, 0.6, 0.2], 3);
        this.sound.clang(ev.at.distanceTo(this.camera.position));
      }
    }
    for (const ev of this.vista.takeEvents()) if (ev.type === 'roar' || ev.type === 'drakeFire') this.sound.roar(ev.at.distanceTo(this.camera.position));
    const rift = THREE.MathUtils.smoothstep(focus.x, 70, 130) * (1 - this.world.gloam);
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
    const area = areaAt(hero.pos.x, hero.pos.z);
    if (area !== this.area) {
      const first = this.area === null;
      this.area = area;
      const a = AREAS.find((x) => x.id === area);
      if (a && (!first || area === 'village')) this.hud.showBanner(a.name, a.sub);
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
    if (chest) prompt = '<kbd>F</kbd> Open the chest';
    else if (this.nearMerchant()) prompt = this.panels.open.shop ? '<kbd>F</kbd> Done trading' : '<kbd>F</kbd> Trade with Dorrin';
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
      dots.push({ x: OVERLOOK.x + 4, z: OVERLOOK.z, color: '#ff7a3a', r: 2.2 });
      this.minimap.draw({ x: hero.pos.x, z: hero.pos.z, yawMap: Math.atan2(Math.cos(hero.yaw), Math.sin(hero.yaw)) + Math.PI / 2 }, this.follow.heading(), dots);
    }
    if (this.debug && (this._st = (this._st ?? 0) + dt) > 0.5) {
      this._st = 0;
      const s = this.post.stats ?? {};
      this.hud.setStats(`${this.fps} fps  ${(1000 / Math.max(1, this.fps)).toFixed(1)} ms\ndraws ${s.calls}  tris ${((s.triangles ?? 0) / 1e6).toFixed(2)}M\ntier ${this.tier}  res ${this.resTier}  ${this.gpu}\n${this.power.debugLine()}\npos ${hero.pos.x.toFixed(1)}, ${hero.pos.z.toFixed(1)}`);
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
