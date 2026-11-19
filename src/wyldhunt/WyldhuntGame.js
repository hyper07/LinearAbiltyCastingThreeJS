/**
 * Wyldhunt: the opening hunting ground of a monster-hunting game — Mistfall
 * Gorge, a jungle canyon of mossy walls, three waterfalls and their mist,
 * a river with a ford and a rope bridge, ruins older than the river, and
 * Lantern Camp at its mouth — with its characters: the hunter (three looks,
 * a greatblade and a bow), Burrow the Shagmane, two companions, herds,
 * thornskitters, and the Gnarlhorn. Ride, gather, track it, fight it, carve
 * it. No story yet.
 *
 *   const game = new WyldhuntGame(document.body, { onClose, account });
 *   await game.open();   …   game.close();
 *
 * Pure (tested): map.js, heights.js, quality.js, rules.js, brains.js,
 * cast.js, credits.js, weather.js's cycle. The scene: world.js and its
 * parts (terrain, sky, water, flora, cover, ruins, camp). The living:
 * hunter.js, mount.js, monster.js, wildlife.js, companions.js, combat.js.
 * The picture: post.js. The sound: audio.js. The screens: ui.js.
 */
import * as THREE from 'three';
import { TextureBank } from '../gloamreach/textures.js';
import { CombatFx } from '../gloamreach/vfx.js';
import { Sfx } from '../gloamreach/sfx.js';
import { FollowCamera } from '../gloamreach/camera.js';
import { shared } from '../gloamreach/materials.js';
import { buildWorld } from './world.js';
import { Post } from './post.js';
import { SETTINGS, chooseTier, Governor } from './quality.js';
import { CameraAssist, loadAssist, cameraMenu, menuSections } from '../shared/cameraAssist.js';
import { PowerKit } from '../shared/powerKit.js';
import { WorldMap, Waypoint, WaypointCue, mapButton, MAP_KEY } from '../shared/worldMap.js';
import { WaypointBeam } from '../shared/waypointBeam.js';
import { HelpPanel, helpButton, codesFor } from '../shared/helpPanel.js';
import { CONTROLS } from './controls.js';
import { powerSettings } from '../shared/power.js';
import { START, FALLS, CAMP, PATH, DEN, MONSTER_AREAS, AREAS, NODES, EXTENT, areaAt, nearestOnLine, pointAt } from './map.js';
import { poolLevel, canyonAt, slopeAt, groundAt, waterAt, riverDistance, surfaceAt } from './heights.js';
import { Waters } from './water.js';
import { buildFlora } from './flora.js';
import { buildRuins } from './ruins.js';
import { buildCamp } from './camp.js';
import { coverMount } from './cover.js';
import { Rain, rainAt } from './weather.js';
import { loadRig } from './beasts.js';
import { Mount } from './mount.js';
import { Gnarlhorn } from './monster.js';
import { MonsterBrain, Tracker, MountBrain, wrap, TRACK_GOAL } from './brains.js';
import { LOOKS, MOUNT_INFO, COMPANIONS } from './cast.js';
import { loadLook, Kit, Hunter } from './hunter.js';
import { HuntCombat } from './combat.js';
import { Wildlife } from './wildlife.js';
import { Companions } from './companions.js';
import { Nodes, Tracks } from './nodes.js';
import { JungleSound } from './audio.js';
import { GNARLHORN, MONSTER_ATTACKS, ITEMS, newKit, addItem, count, restock, gather, regrow, carve, CARVES, damagePart, GATHER } from './rules.js';
import { Loading, StartScreen, Hud, paintMap, bagPanel, creditsPanel, pauseMenu, el } from './ui.js';
import './wyldhunt.css';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PREFS = 'wyldhunt.prefs';
const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
/** The bar's items on 5–8 (controls.js): numbers for items, never Q or E. */
const ITEM_KEYS = Object.fromEntries(codesFor(CONTROLS, 'items').map((c, i) => [c, i]));
const HELP_CODES = codesFor(CONTROLS, 'help');
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

/** Quiet runs at 30 while you track and gather, and rises to 60 the moment the hunt is on. */
const POWER_PROFILE = { quietFps: 30, urgentFps: 60 };

export class WyldhuntGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'wh');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Wyldhunt');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this.closed = false;
    this.t = 0;
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('debug');
    this.sound = new JungleSound();
    this.prefs = prefs.load();
    this.picked = LOOKS.some((l) => l.id === this.prefs.look) ? this.prefs.look : 'ironbark';
    this.pointer = { x: 0, y: 0, on: false, moved: -99 };
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.weatherT = 20;
    this.riding = false;
    this._onKey = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keyUp(e);
    this._onBlur = () => {
      this.keys.clear();
      this.follow?.assist.clear();
    };
    this._onMouse = (e) => this.mouseMove(e);
    this._onLock = () => this.hud?.crosshair(Boolean(document.pointerLockElement));
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLock);
    window.wyldhunt = this;
    this.THREE = THREE;
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const step = (label, k) => this.loading?.set(label, k);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer = renderer;
    renderer.domElement.className = 'wh-view';
    this.root.prepend(renderer.domElement);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    const q = this.params.get('quality');
    const guess = SETTINGS[q] ? q : chooseTier({ gpu, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, pixels: screen.width * screen.height * devicePixelRatio ** 2, mobile: /Mobi|Android/i.test(navigator.userAgent) });
    this.gpu = gpu;
    // `resTier`: the resolution this machine always had (lowered only if frames really run slow);
    // `tier`: the detail, kept by the power governor within the Graphics preset.
    this.quality = SETTINGS[q] ? q : null;
    this.resTier = guess;
    this.governor = new Governor(guess, { max: q || 'ultra' });
    this.power = new PowerKit('wyldhunt', { renderer, profile: POWER_PROFILE, detail: this.quality ? null : guess, onChange: () => this.applyPower() });
    this.tier = this._detailTier();
    this.settings = { ...powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE }), msaa: guess === 'low' ? 0 : 4 };
    // The sun's shadow is redrawn when due (every few frames on the lighter presets).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
    this.resize();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.bank = new TextureBank(renderer, { size: this.settings.texSize });
    const parts = {
      list: [
        ['Filling the river', 0.28, (world, { bank, settings }) => {
          const w = new Waters(bank, settings);
          world.scene.add(w.group);
          world.waters = w;
          world.updaters.push((dt, t, cam, focus, look) => w.update(look, world.lighting, world.rain));
          world.disposers.push(() => w.dispose());
        }],
        ['Growing the jungle', 0.4, buildFlora],
        ['Raising the ruins', 0.52, buildRuins],
        ['Pitching the camp', 0.58, buildCamp]
      ]
    };
    this.world = await buildWorld({ renderer, bank: this.bank, settings: this.settings, parts, onProgress: (l, k) => step(l, k * 0.6) });
    if (this.closed) return;
    const world = this.world;
    const scene = world.scene;
    this.scene = scene;
    const H = (x, z) => world.colliders.height(x, z);
    this.rain = new Rain({ count: this.settings.rain, heightTex: world.heightTex, roofs: world.roofs ?? [], renderer });
    scene.add(this.rain.mesh);
    this.vfx = new CombatFx(scene, this.bank, H);
    this.sfx = new Sfx(this.sound);
    this.nodes = new Nodes(scene, this.bank);
    // The camp's fire: a flickering light, flames, embers and smoke.
    const fire = world.spots.camp?.fire;
    if (fire) {
      this.fireLight = new THREE.PointLight(0xff8a3a, 26, 18, 1.6);
      this.fireLight.position.copy(fire).add(V(0, 0.7, 0));
      scene.add(this.fireLight);
    }
    this.tracks = new Tracks(scene, this.bank);
    step('Waking the beasts', 0.64);
    const [horse, trex] = await Promise.all([loadRig('horse'), loadRig('trex')]);
    if (this.closed) return;
    if (horse) {
      this.mount = { brain: new MountBrain(), view: new Mount(horse, { scene, furLayers: this.settings.furShells }) };
      scene.add(this.mount.view.object);
    }
    if (trex) {
      this.monster = { brain: new MonsterBrain({ areas: MONSTER_AREAS, den: DEN, start: 0 }), view: new Gnarlhorn(trex, { furLayers: this.settings.furShells }), parts: {}, broken: [], carves: CARVES, tailCarves: 0, drops: [] };
      scene.add(this.monster.view.object);
    }
    this.tracker = new Tracker();
    // Old sign along the path up the gorge, pointing north to its haunts.
    for (const s of [205, 300, 395, 470]) {
      const p = pointAt(PATH, s);
      this.tracker.add(p.x + Math.cos(p.yaw) * 3, p.z - Math.sin(p.yaw) * 3, { yaw: p.yaw + Math.PI, kind: 'print' });
    }
    step('Calling the hunters', 0.72);
    const detail = this.bank.noise();
    this.templates = {};
    await Promise.all(LOOKS.map(async (l) => (this.templates[l.id] = await loadLook(l, detail))));
    if (this.closed) return;
    this.companions = new Companions({ scene, colliders: world.colliders, detail });
    this.wildlife = new Wildlife({ scene, colliders: world.colliders, detail, vfx: this.vfx });
    step('The herds and the nests', 0.82);
    await Promise.all([this.companions.load(), this.wildlife.load()]);
    if (this.closed) return;
    this.bag = newKit().bag;
    this.follow = new FollowCamera(this.camera, world.colliders);
    // , . turn the camera, [ ] tilt it, / puts it behind the hunter; it eases back by itself after a quiet spell.
    this.follow.assist = new CameraAssist(loadAssist('wyldhunt'), { id: 'wyldhunt' });
    this.follow.fovBase = 52;
    this.post = new Post(renderer);
    this.post.mist = FALLS.map((f) => ({ x: f.pool.x, y: poolLevel(f), z: f.pool.z, r: f.pool.r * (f.id === 'grand' ? 2.0 : 1.6), density: f.id === 'grand' ? 0.011 : 0.01, height: 0.5 }));
    this.applyPower(true);
    this.minimapCanvas = paintMap(world.grid);
    this.setLook(this.picked);
    step('Lighting the mist', 0.94);
    this.menuCamera(0);
    world.update(0.016, 0, this.camera, this.hunter.pos);
    renderer.compile(scene, this.camera);
    this.camera.layers.set(1);
    renderer.compile(scene, this.camera);
    this.camera.layers.set(0);
    step('Ready', 1);
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
    this.combat?.dispose();
    this.kit?.dispose();
    this.companions?.dispose();
    this.wildlife?.dispose();
    this.mount?.view.dispose();
    this.monster?.view.dispose();
    this.nodes?.dispose();
    this.tracks?.dispose();
    this.rain?.dispose();
    this.world?.dispose();
    this.post?.dispose();
    this.hud?.dispose();
    this.worldMap?.dispose();
    this.help?.dispose();
    this.cue?.dispose();
    this.beam?.dispose();
    this.bank?.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.wyldhunt === this) delete window.wyldhunt;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings?.maxDpr ?? 1.5));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post?.resize();
    this.power?.invalidate();
  }

  /** The detail level: fixed by ?quality=, the old rule on Ultra, else the power governor's. */
  _detailTier() {
    if (this.quality || this.power.preset === 'ultra') return this.resTier;
    return this.power.detail(this.resTier);
  }

  /** Apply the Graphics choice now (no reload): shadows, effects, grass, rain, draw distances, mist. Resolution stays the machine's own. */
  applyPower(first = false) {
    const prev = this.settings;
    this.tier = this._detailTier();
    const s = { ...powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE }), msaa: this.settings.msaa };
    this.settings = s;
    this.resize();
    this.post.configure({ ao: s.ao, rays: s.rays, bloom: s.bloom, smaa: (s.smaa && (s.preset === 'ultra' || !s.msaa)) || !s.msaa, msaa: s.msaa, refract: s.refract, bloomHalf: s.bloomHalf }, s.scale);
    const lighting = this.world.lighting;
    if (!first && (prev.shadow !== s.shadow || prev.shadowBox !== s.shadowBox)) lighting.setShadow(s.shadow, s.shadowBox);
    lighting.sun.castShadow = s.shadowOn;
    this.renderer.shadowMap.needsUpdate = true;
    this.world.cover?.setDensity(s.grass, s.grassReach);
    this.world.limits.treeFar = s.treeFar;
    this.world.limits.far = s.far;
    if (this.wildlife) Object.assign(this.wildlife, { drawFar: s.far, animNear: s.animNear });
    if (this.rain) this.rain.mesh.geometry.instanceCount = Math.min(this.rain.count, s.rain);
    this.power.invalidate();
  }

  /** Kept for tests and the console: force a detail level. */
  applyTier(tier) {
    this.quality = tier;
    this.resTier = tier;
    this.applyPower();
  }

  /* ================================================================ the hunter */

  setLook(id) {
    const look = LOOKS.find((l) => l.id === id) ?? LOOKS[0];
    this.picked = look.id;
    const tpl = this.templates[look.id];
    const old = this.hunter;
    const weapon = this.kit?.weapon ?? 'greatblade';
    if (this.kit) {
      this.scene.remove(this.kit.actor.object);
      this.kit.dispose();
    }
    if (!tpl) return;
    this.kit = new Kit(tpl, look, { scene: this.scene, weapon });
    this.scene.add(this.kit.actor.object);
    this.hunter = new Hunter(this.kit.actor, {
      colliders: this.world.colliders,
      onStep: (surface, speed, p) => this.footstep(surface, speed, p)
    });
    if (old) this.hunter.place(old.pos.x, old.pos.z, old.yaw);
    else this.hunter.place(START.x, START.z, START.yaw);
    const prev = this.combat;
    this.combat = new HuntCombat(this);
    if (prev) {
      this.combat.hp = prev.hp;
      this.combat.sharp = prev.sharp;
      prev.dispose();
    }
  }

  footstep(surface, speed, p) {
    this.sound.step(surface === 'stone' ? 'cobble' : surface === 'shallow' ? 'water' : surface === 'litter' ? 'grass' : surface, speed);
    if (surface === 'water' || surface === 'shallow') {
      const y = waterAt(p.x, p.z);
      const at = V(p.x, Number.isFinite(y) ? y + 0.02 : p.y, p.z);
      this.vfx.burst(at, 6 + Math.round(speed), [1.6, 1.8, 1.9], { speed: 2 + speed * 0.3, life: 0.45, size: 0.07, gravity: 9, up: 1.2 });
      this.vfx.ring(at, { radius: 0.6 + speed * 0.06, color: [0.6, 0.7, 0.75], life: 0.5, width: 0.08 });
    } else if (surface === 'mud' && speed > 5) this.vfx.smokeAt(p, 1, [0.32, 0.27, 0.2], { size: 0.25, life: 0.6, speed: 0.4, up: 0.3, alpha: 0.35 });
  }

  /** What can be aimed at and struck. */
  targets() {
    const out = [];
    const m = this.monster;
    if (m?.brain.alive) {
      const c = m.view.centre();
      out.push({ x: m.brain.x, z: m.brain.z, r: 4, alive: true, y: c.y - 1.5, aimPoint: () => m.view.centre(), monster: true });
    }
    for (const t of this.wildlife?.targets ?? []) out.push(t);
    return out;
  }

  hudNumber(p, v, kind) {
    if (!this.hud) return;
    const s = p.clone().project(this.camera);
    if (s.z > 1) return;
    this.hud.number((s.x * 0.5 + 0.5) * this.root.clientWidth, (-s.y * 0.5 + 0.5) * this.root.clientHeight, v, kind);
  }

  bark(moment, force = false) {
    const b = this.companions?.bark(moment, force);
    if (b) this.hud?.say(b.who, b.text);
  }

  /* ================================================================ screens */

  menu() {
    this.mode = 'menu';
    this.power.setMenu('live');
    this.hunter.place(CAMP.x + 1.5, CAMP.z - 1.5, CAMP.face + Math.PI - 0.3);
    if (this.mount) {
      const b = this.mount.brain;
      const hp = this.world.spots.camp?.hitch ?? V(CAMP.x + 6, 0, CAMP.z - 4);
      b.state = 'waiting';
      b.x = hp.x;
      b.z = hp.z;
      b.yaw = CAMP.face + 1.4;
      b.y = groundAt(b.x, b.z);
    }
    this.companions.place(CAMP.x - 7, CAMP.z + 6, CAMP.face + Math.PI);
    this.start = new StartScreen(this.root, {
      picked: this.picked,
      onPick: (id) => {
        this.sound.wake();
        this.sound.tick();
        this.setLook(id);
        this.hunter.place(CAMP.x + 1.5, CAMP.z - 1.5, CAMP.face + Math.PI - 0.3);
        this.prefs.look = id;
        prefs.save(this.prefs);
      },
      onBegin: () => this.begin(),
      onCredits: () => this.credits(),
      onClose: () => this.close()
    });
    this.root.focus();
  }

  menuCamera(t) {
    const p = this.hunter?.pos ?? V(CAMP.x, 1, CAMP.z);
    const face = this.hunter?.yaw ?? 0;
    const a = face + Math.sin(t * 0.1) * 0.18 - 0.35;
    this.camera.position.set(p.x + Math.sin(a) * 4.0, p.y + 1.45, p.z + Math.cos(a) * 4.0);
    const side = V(Math.cos(face), 0, -Math.sin(face));
    this.camera.lookAt(p.x - side.x * 0.9, p.y + 1.2, p.z - side.z * 0.9);
    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();
  }

  begin() {
    this.sound.wake();
    this.sound.tick();
    this.start?.hide();
    this.start = null;
    this.hunter.place(START.x, START.z, START.yaw);
    this.follow.yaw = START.yaw + Math.PI;
    this.follow.pitch = 0.18;
    this.follow.pivot.set(0, 0, 0);
    this.follow.wantDist = this.follow.dist = this.follow.cur = 5;
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.hud = new Hud(this.root, { name: LOOKS.find((l) => l.id === this.picked).name, party: COMPANIONS.map((c) => ({ id: c.id, name: c.name, color: c.color })), debug: this.debug });
    this.hud.minimap.map = this.minimapCanvas;
    // The full map (O, the pause menu's Map, or the minimap's button) and its waypoint.
    this.waypoint ??= new Waypoint();
    this.worldMap = new WorldMap({
      host: this.root,
      title: 'Mistfall Gorge',
      base: this.minimapCanvas,
      extent: EXTENT,
      areas: AREAS,
      legend: [
        { shape: 'tent', color: '#ffb35a', label: 'Camp' },
        { shape: 'dot', color: '#9ae04a', label: 'Herbs' },
        { shape: 'dot', color: '#9ad0ff', label: 'Ore' },
        { shape: 'dot', color: '#ffe070', label: 'Bugs' },
        { shape: 'dot', color: '#f0e8d8', label: 'Bones' },
        { shape: 'heart', color: '#7ad0ff', label: 'Companions' },
        { shape: 'diamond', color: '#d8b07a', label: 'Your mount' },
        { shape: 'skull', color: '#ff6a4a', label: 'The Gnarlhorn (tracked or near)' },
        { shape: 'dot', color: '#7aff6a', label: 'Tracks to read' }
      ],
      markers: () => this.mapMarkers(),
      player: () => {
        const b = this.riding ? this.mount.brain : null;
        return { x: b ? b.x : this.hunter.pos.x, z: b ? b.z : this.hunter.pos.z, yaw: b ? b.yaw : this.hunter.yaw };
      },
      waypoint: this.waypoint,
      onOpen: () => this._mapOpened(),
      onClose: () => this._mapClosed()
    });
    mapButton(this.hud.minimap.el, () => this.openMap());
    // How to play (H, the ? by the minimap, the pause menu): opens by itself the first time.
    this.help = new HelpPanel({ host: this.root, id: 'wyldhunt', table: CONTROLS, onOpen: () => this._holdOpened('help'), onClose: () => this._mapClosed() });
    helpButton(this.hud.minimap.el, () => this.openHelp(), { style: 'left:-4px;top:-4px;width:30px;height:30px;font-size:15px' });
    this.cue = new WaypointCue(this.hud.el ?? this.root);
    this.beam ??= new WaypointBeam(this.scene);
    this.companions.place(START.x, START.z + 3, START.yaw);
    this.mode = 'play';
    this.power.setMenu('none');
    this.area = null;
    this.root.focus();
    setTimeout(() => this.bark('start', true), 2500);
    this.help.openFirstTime();
  }

  /** What the full map shows besides you: the camp, gather nodes, your companions and mount, tracks, and the beast when tracked or near. */
  mapMarkers() {
    const out = [{ x: CAMP.x, z: CAMP.z, shape: 'tent', color: '#ffb35a', r: 1.3, label: 'Lantern Camp' }];
    const NODE = { herb: '#9ae04a', ore: '#9ad0ff', bug: '#ffe070', bone: '#f0e8d8' };
    for (const n of this.nodes.list) if ((n.left ?? 1) > 0) out.push({ x: n.x, z: n.z, color: NODE[n.kind] ?? '#fff', r: 0.75 });
    for (const mk of this.tracker.marks) if (!mk.found) out.push({ x: mk.x, z: mk.z, color: '#7aff6a', r: 0.6 });
    for (const c of this.companions.list) out.push({ x: c.x, z: c.z, shape: 'heart', color: c.c.color, label: c.c.name });
    if (this.mount && !this.riding && this.mount.brain.state !== 'away') out.push({ x: this.mount.brain.x, z: this.mount.brain.z, shape: 'diamond', color: '#d8b07a', label: 'Mount' });
    const m = this.monster;
    const p = this.hunter.pos;
    if (m && m.brain.alive !== false && (this.tracker.tracked || Math.hypot(m.brain.x - p.x, m.brain.z - p.z) < 50)) out.push({ x: m.brain.x, z: m.brain.z, shape: 'skull', color: '#ff6a4a', r: 1.4, label: 'Gnarlhorn' });
    return out;
  }

  /** Open the full map: the hunt waits (and the 3D stops drawing) while it's up. */
  openMap() {
    if (!this.worldMap || (this.mode !== 'play' && this.mode !== 'paused')) return;
    if (this.mode === 'paused') {
      this.pauseEl?.remove();
      this.pauseEl = null;
    }
    this.panel?.close();
    this.worldMap.open();
  }

  /** How to play: the hunt waits while it's up. */
  openHelp() {
    if (!this.help || (this.mode !== 'play' && this.mode !== 'paused')) return;
    if (this.mode === 'paused') {
      this.pauseEl?.remove();
      this.pauseEl = null;
    }
    this.panel?.close();
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

  credits() {
    this.sound.tick();
    this.panel?.close();
    this.panel = creditsPanel(this.root, () => {
      this.panel = null;
      this.power.invalidate();
      this.root.focus();
    });
    this.power.invalidate();
  }

  toggleBag() {
    if (this.panel) {
      this.panel.close();
      return;
    }
    this.sound.tick();
    this.panel = bagPanel(this.root, this.bag, () => {
      this.panel = null;
      this.root.focus();
    });
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    // Nothing moves behind the pause menu: draw only when something changes.
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
      if (e.code === 'Escape' || HELP_CODES.includes(e.code)) this.help.close();
      return;
    }
    if (e.code === 'Escape') {
      if (this.panel) this.panel.close();
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
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      if (HELP_CODES.includes(e.code)) {
        this.openHelp();
        return;
      }
      if (e.code === 'Space') {
        if (this.riding) this.rideJump = true;
        else this.combat.press('Space');
      }
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyX') this.whistle();
      if (e.code === 'KeyF' && !this.riding && !this.combat.busy) {
        this.kit.sheathe(!this.kit.sheathed);
        this.kit.actor.act('Sheathe', { loop: false, upper: true, speed: 1.6, fade: 0.1 });
      }
      if (e.code === 'Tab' && !this.riding && !this.combat.busy) {
        this.kit.setWeapon(this.kit.weapon === 'greatblade' ? 'bow' : 'greatblade');
        this.sfx.raise?.();
      }
      if (e.code === 'KeyB' || e.code === 'KeyI') this.toggleBag();
      if (e.code === 'KeyV') this.toggleMouseLook();
      if (e.code in ITEM_KEYS) {
        const id = newKit().bar[ITEM_KEYS[e.code]];
        this.combat.use(id);
      }
    }
    this.keys.add(e.code);
  }

  keyUp(e) {
    this.keys.delete(e.code);
    this.follow?.assist.key(e.code, false);
  }

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
    if (document.pointerLockElement === this.renderer.domElement || e.buttons & 4) this.follow.look(e.movementX, e.movementY);
  }

  bindPointer() {
    if (this._bound) return;
    this._bound = true;
    const c = this.renderer.domElement;
    const BTN = { 0: 'LMB', 2: 'RMB' };
    c.addEventListener('pointerdown', (e) => {
      this.sound.wake();
      if (this.mode !== 'play' || this.panel) return;
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
    let x = 0;
    let z = 0;
    for (const code of this.keys) {
      const v = KEYS[code];
      if (v === 'f') z += 1;
      if (v === 'b') z -= 1;
      if (v === 'l') x -= 1;
      if (v === 'r') x += 1;
    }
    const has = (c) => this.keys.has(c);
    return { x: Math.sign(x), z: Math.sign(z), sprint: has('ShiftLeft') || has('ShiftRight'), walk: has('ControlLeft') || has('ControlRight'), auto: has('KeyR') };
  }

  /* ================================================================ interacting */

  /** E: carve, mount, gather, read a track, take from the supply box — whichever is near. */
  interact() {
    const p = this.hunter.pos;
    if (this.riding) return this.dismount();
    const what = this.nearInteract();
    if (!what) return;
    if (what.type === 'carve') {
      this.combat.doing('Carve', 1.4, () => {
        const from = what.tail ? 'tail' : 'body';
        const got = carve(from);
        addItem(this.bag, got.item, got.n);
        this.hud.log(got.item, got.n, 'Carved');
        this.sfx.pickup('rare');
        if (what.tail) this.monster.tailCarves--;
        else this.monster.carves--;
        if (this.monster.carves === 0 && !what.tail) this.hud.banner('Carving done', 'The gorge is quiet. Ride back to camp, or roam.', { secs: 5 });
      }, 1.2);
    } else if (what.type === 'mount') this.mountUp();
    else if (what.type === 'node') {
      const n = what.node;
      const clip = n.kind === 'bone' ? 'PickUp' : 'Gather';
      this.combat.doing(clip, n.kind === 'ore' ? 1.3 : 0.95, () => {
        const got = gather(n, n.kind);
        if (!got) return;
        const fit = addItem(this.bag, got.item, got.n);
        this.hud.log(got.item, fit || got.n, fit ? '' : 'Bag full');
        this.sfx.pickup(n.kind === 'ore' ? 'uncommon' : 'common');
        if ((n.left ?? 1) <= 0) this.nodes.setSpent(n, true);
        if (!this._gatheredOnce) {
          this._gatheredOnce = true;
          this.bark('gather', true);
        }
      }, n.kind === 'ore' ? 1.6 : 1.3);
      void p;
    } else if (what.type === 'supply') {
      const got = restock(this.bag);
      if (!got.length) this.hud.log('potion', 0, 'Already full');
      for (const [id, n] of got) this.hud.log(id, n);
      this.sfx.chest();
    }
  }

  nearInteract() {
    const p = this.hunter.pos;
    const m = this.monster;
    if (m && !m.brain.alive && m.carves > 0 && Math.hypot(m.brain.x - p.x, m.brain.z - p.z) < 7) return { type: 'carve', label: `Carve the ${GNARLHORN.name} (${m.carves} left)` };
    if (m?.tailPiece && m.tailCarves > 0 && m.tailPiece.position.distanceTo(p) < 3) return { type: 'carve', tail: true, label: 'Carve the severed tail club' };
    if (this.mount && this.mount.brain.canMount(p.x, p.z)) return { type: 'mount', label: `Mount ${MOUNT_INFO.name}` };
    const n = this.nodes.nearest(p.x, p.z, 2.4);
    if (n) return { type: 'node', node: n, label: `${GATHER[n.kind].label}: ${{ herb: 'Sunleaf', ore: 'Ore seam', bug: 'Bug log', bone: 'Bone pile' }[n.kind]}` };
    const sup = this.world.spots.camp?.supply;
    if (sup && sup.distanceTo(p) < 2.6) return { type: 'supply', label: 'Supply box: restock' };
    return null;
  }

  whistle() {
    if (!this.mount || this.riding) return;
    this.sound.whistle();
    if (!this.combat.busy) this.kit.actor.act('Whistle', { loop: false, upper: true, speed: 1.6, fade: 0.1 });
    const h = this.hunter;
    this.mount.brain.call(h.pos.x, h.pos.z, h.yaw);
    if (!this._calledOnce) {
      this._calledOnce = true;
      setTimeout(() => this.bark('mount', true), 1500);
    }
  }

  mountUp() {
    const mb = this.mount.brain;
    mb.mount();
    this.riding = true;
    this.combat.state = 'free';
    this.kit.sheathe(true);
    this.kit.actor.act('Ride', { loop: true, fade: 0.2 });
    this.follow.wantDist = 7.2;
    this.follow.pitch = Math.max(this.follow.pitch, 0.2);
    this.sfx.raise?.();
  }

  dismount(thrown = false) {
    const mb = this.mount.brain;
    if (!mb.dismount()) return;
    this.riding = false;
    const side = mb.yaw + Math.PI / 2;
    let x = mb.x + Math.sin(side) * 1.6;
    let z = mb.z + Math.cos(side) * 1.6;
    if (slopeAt(x, z) > 0.9) {
      x = mb.x - Math.sin(side) * 1.6;
      z = mb.z - Math.cos(side) * 1.6;
    }
    this.hunter.place(x, z, mb.yaw);
    this.kit.actor.rest(0.2);
    this.follow.wantDist = 5;
    if (thrown) this.kit.actor.act('Knock', { loop: false, fade: 0.05 });
  }

  backToCamp() {
    if (this.riding) this.dismount();
    this.hunter.place(START.x, START.z, START.yaw);
    this.follow.yaw = START.yaw + Math.PI;
    this.companions.place(START.x, START.z + 3, START.yaw);
    restock(this.bag);
  }

  /* ================================================================ the monster */

  /** A blow on the monster, from combat.js: part damage, breaks, its mind's reaction. */
  monsterHit(part, amount, p, { bounce = false } = {}) {
    const m = this.monster;
    const st = { parts: m.parts, broken: m.broken };
    const broke = damagePart(st, part, amount);
    for (const b of broke) {
      const piece = m.view.breakPart(b);
      if (piece) {
        this.scene.add(piece);
        m.drops.push({ obj: piece, v: V((Math.random() - 0.5) * 3, 5, (Math.random() - 0.5) * 3), spin: V(Math.random() * 6, Math.random() * 6, 0), settled: false });
        if (b === 'tail') {
          m.tailPiece = piece;
          m.tailCarves = 1;
        }
      }
      this.vfx.explode(p, 2.5, { color: 'dust' });
      this.sound.thud(5, 1.4);
      this.hud.banner(b === 'head' ? 'Broke its horns!' : 'Severed its tail club!', '', { secs: 2.5 });
      this.bark(b === 'head' ? 'horn' : 'tailcut', true);
      if (b === 'head') addItem(this.bag, 'gnarlHorn', 1), this.hud.log('gnarlHorn', 1, 'Part broken');
    }
    const ev = m.brain.damage(amount, { stagger: broke.length > 0 });
    this.monsterEvents(ev);
    void bounce;
  }

  monsterEvents(evs) {
    const m = this.monster;
    const b = m.brain;
    const h = this.hunter.pos;
    const dist = Math.hypot(b.x - h.x, b.z - h.z);
    for (const ev of evs) {
      switch (ev.type) {
        case 'track':
          this.tracker.add(ev.x, ev.z, { yaw: ev.yaw });
          break;
        case 'notice':
          if (dist < 70) {
            this.tracker.spotted = true;
            this.bark('spotted');
          }
          break;
        case 'windup': {
          const A = MONSTER_ATTACKS[ev.attack];
          const fwd = V(Math.sin(b.yaw), 0, Math.cos(b.yaw));
          const k = b.enraged ? 1 / 1.25 : 1;
          // A faint mark on the ground; the beast's own wind-up is the real tell.
          const mark = (o) => {
            const d = this.vfx.telegraph(o);
            d.mesh.material.uniforms.uAlpha.value = 0.28;
          };
          if (ev.attack === 'bite') mark({ x: b.x + fwd.x * 2, z: b.z + fwd.z * 2, radius: A.reach + 1, yaw: b.yaw, arc: A.arc * 1.3, time: A.windup * k, color: '#c84a2a' });
          else if (ev.attack === 'tail') {
            mark({ x: b.x, z: b.z, radius: A.reach, time: A.windup * k, color: '#c84a2a' });
            if (dist < 20) this.bark('tail');
          } else if (ev.attack === 'charge') {
            mark({ x: b.x + fwd.x * 9, z: b.z + fwd.z * 9, radius: 12, yaw: b.yaw, arc: 0.5, time: A.windup * k, color: '#c83a1a' });
            if (dist < 40) this.bark('charge');
          } else if (ev.attack === 'roar' && dist < 30) this.bark('roar');
          this.threat = { x: b.x + fwd.x * 3, z: b.z + fwd.z * 3, r: ev.attack === 'tail' ? A.reach : ev.attack === 'charge' ? 5 : A.reach * 0.7, until: this.t + A.windup * k + 0.4, attack: ev.attack };
          break;
        }
        case 'strike':
          this._strikeNow = { attack: ev.attack, t: 0, done: false };
          if (ev.attack === 'roar') {
            this.sound.bellow(dist, 1.2);
            this.vfx.ring(V(b.x, groundAt(b.x, b.z) + 3, b.z), { radius: 16, color: [1.2, 1.1, 0.9], life: 0.9, width: 0.15, flat: false });
            if (dist < 30) this.combat._shake(0.7);
          } else if (ev.attack === 'bite') this.sound.thud(dist, 0.8);
          break;
        case 'enrage':
          this.bark('rage', true);
          this.vfx.smokeAt(m.view.head(), 10, [0.9, 0.9, 0.9], { size: 0.8, life: 1.4, speed: 1.2, alpha: 0.4 });
          break;
        case 'flee':
          this.bark('limp', true);
          break;
        case 'sleep':
          if (dist < 80) this.bark('sleep', true);
          break;
        case 'stagger':
          this.sound.thud(dist, 1.6);
          this.vfx.smokeAt(V(b.x, groundAt(b.x, b.z), b.z), 12, [0.45, 0.4, 0.32], { size: 1.2, grow: 3, life: 1.4, speed: 2, alpha: 0.45 });
          break;
        case 'death':
          this.sound.bellow(dist, 0.8);
          setTimeout(() => this.sound.thud(dist, 2), 1800);
          this.hud.banner('HUNT COMPLETE', `${GNARLHORN.name} slain — carve it (E)`, { big: true, secs: 6 });
          this.bark('win', true);
          break;
        default:
          break;
      }
    }
  }

  /** Each frame of a strike in progress: does it reach the hunter? */
  _resolveStrike(dt) {
    const s = this._strikeNow;
    const m = this.monster;
    if (!s || s.done || !m) return;
    const b = m.brain;
    s.t += dt;
    const A = MONSTER_ATTACKS[s.attack];
    const h = this.hunter.pos;
    const dx = h.x - b.x;
    const dz = h.z - b.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.abs(wrap(Math.atan2(dx, dz) - b.yaw));
    const from = { x: b.x, z: b.z };
    const enraged = b.enraged;
    if (s.attack === 'bite') {
      if (d < A.reach + 1.5 && ang < A.arc) this.combat.hit('bite', { enraged, from });
      s.done = true;
    } else if (s.attack === 'tail') {
      if (s.t > 0.25) {
        if (d < A.reach) this.combat.hit('tail', { enraged, from });
        s.done = true;
      }
    } else if (s.attack === 'charge') {
      if (b.attack?.id !== 'charge' || b.attack.phase !== 'active') s.done = true;
      else if (d < 4.2) {
        this.combat.hit('charge', { enraged, from });
        s.done = true;
      }
    } else if (s.attack === 'roar') {
      if (d < A.reach) this.combat.hit('roar', { from });
      s.done = true;
    }
  }

  /* ================================================================ frame */

  frame(dt, rawMs = 16) {
    this.bindPointer();
    this.t += dt;
    const t = this.t;
    const playing = this.mode === 'play';
    const world = this.world;
    if (playing) {
      const inp = this.input();
      this.lastInput = inp;
      this.combat.setAim(this.aimPoint());
      const wdt = this.combat.update(dt);
      this._ride(wdt, inp);
      if (!this.riding) this.hunter.update(wdt, inp, this.follow.heading());
      this.kit.update(wdt, this.kit.actor.object);
      this._living(wdt);
      if (this.combat.aiming && this.kit.weapon === 'bow' && !this.riding) {
        this.follow.wantDist += (2.6 - this.follow.wantDist) * Math.min(1, dt * 6);
        this.follow.shoulder = 0.85;
      } else this.follow.shoulder = 0.55;
      // No swinging round on its own mid-fight, while the bow is drawn, or in mouse-look.
      this.follow.pause = Boolean(this.combat.busy) || this.monster?.brain.state === 'engage' || Boolean(this.combat.aiming) || Boolean(document.pointerLockElement);
      const proxy = this.riding ? this._rideProxy() : this.hunter;
      this.follow.update(dt, proxy, { sprinting: (inp.sprint && this.hunter.speed > 5) || (this.riding && this.mount.brain.gait === 3), moving: proxy.speed > 0.5 });
      this.shakeCamera();
      this.vfx.setReticle(this.kit.weapon === 'bow' && (this.pointer.on || document.pointerLockElement) ? this.combat.aim : null, { radius: 0.7 });
      this.vfx.update(dt, this.camera);
    } else if (this.mode === 'menu') {
      this.kit.actor.move(0);
      this.kit.actor.update(dt);
      this.kit.update(dt, this.kit.actor.object);
      this._living(dt, true);
      this.menuCamera(t);
    } else {
      this.kit.actor.update(0);
    }
    // Weather.
    this.weatherT += dt;
    const forced = this.params.get('rain');
    world.rain = forced != null ? Number(forced) : rainAt(this.weatherT);
    shared.uPlayer.value.copy(this.hunter.pos);
    if (this.mount) coverMount.value.set(this.mount.brain.x, this.mount.brain.y, this.mount.brain.z);
    shared.uWind.value.set(0.8, 0.6, 0.9 + world.rain * 0.6, 0.3 + 0.3 * Math.sin(t * 0.13) + world.rain * 0.4);
    const focus = this.riding ? V(this.mount.brain.x, this.mount.brain.y, this.mount.brain.z) : this.hunter.pos;
    const look = world.update(dt, t, this.camera, focus);
    this.rain.update(this.camera, world.rain, world.lighting.sun.color);
    this.nodes.update(dt, t, focus);
    const fire = world.spots.camp?.fire;
    if (fire && this.camera.position.distanceTo(fire) < 90) {
      this.fireLight.intensity = 22 + Math.sin(t * 13) * 3 + Math.sin(t * 7.3) * 4 + Math.random() * 2;
      if ((this._fireT = (this._fireT ?? 0) - dt) <= 0) {
        this._fireT = 0.05;
        this.vfx.fire(fire, 2, { size: 0.42, speed: 1.1, life: 0.7 });
        if (Math.random() < 0.3) this.vfx.burst(fire.clone().add(V(0, 0.3, 0)), 1, [3, 1.2, 0.3], { speed: 1.5, life: 1.6, size: 0.04, gravity: -1.5, up: 2 });
        if (Math.random() < 0.25) this.vfx.smokeAt(fire.clone().add(V(0, 0.9, 0)), 1, [0.35, 0.33, 0.32], { size: 0.5, grow: 2.5, life: 3, speed: 0.2, up: 0.9, alpha: 0.25 });
      }
      if (this.mode !== 'play') this.vfx.update(dt, this.camera);
    }
    // Sound by place.
    let falls = Infinity;
    for (const f of FALLS) falls = Math.min(falls, Math.hypot(f.pool.x - focus.x, f.pool.z - focus.z) - f.pool.r);
    this.sound.update(dt, { falls, river: riverDistance(focus.x, focus.z).d, rain: world.rain, fight: this.monster?.brain.state === 'engage' ? 1 : 0 });
    // The sun's shadow: redrawn when due (every frame on High and Ultra; every few, or when the view moves, below).
    const s = this.settings;
    const cp = this.camera.position;
    this.renderer.shadowMap.needsUpdate = s.shadowOn && (this.renderer.shadowMap.needsUpdate || this.power.shadowDue(s.shadowEvery, cp.x, cp.z, this.follow.yaw ?? 0));
    // A little more mist on the nearer draw distances, so where detail stops reads as distance.
    this.power.gpuBegin();
    this.post.render(this.scene, this.camera, { ...look, fogDensity: look.fogDensity * s.fog, lightColor: world.lighting.sun.color, gloam: world.rain, fade: 0, ground: focus.y - 3, bloom: 0.36, mist: (1 + world.rain * 0.4) * s.fog });
    this.power.gpuEnd();
    // The waypoint: its beam in the world, the cue toward it.
    const wp = this.waypoint?.point;
    this.beam?.update(wp, wp ? groundAt(wp.x, wp.z) : 0, t);
    if (playing) this.cue?.update(this.waypoint, focus.x, focus.z, this.follow.heading());
    if (playing) this.power.setUrgent(Boolean(this.combat.busy) || ['engage', 'attack', 'alert', 'stagger'].includes(this.monster?.brain.state));
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

  /** The mount: its mind and body; when ridden, the hunter sits the saddle. */
  _ride(dt, inp) {
    const m = this.mount;
    if (!m) return;
    const b = m.brain;
    const h = this.hunter;
    let pathHeading = null;
    if (this.riding && inp.auto) {
      // Ahead along the path, in whichever direction it is already facing.
      const n = nearestOnLine(PATH, b.x, b.z);
      const ahead = pointAt(PATH, n.s + 14);
      const behind = pointAt(PATH, Math.max(0, n.s - 14));
      const fwdYaw = Math.atan2(ahead.x - b.x, ahead.z - b.z);
      const backYaw = Math.atan2(behind.x - b.x, behind.z - b.z);
      pathHeading = Math.abs(wrap(fwdYaw - b.yaw)) < Math.abs(wrap(backYaw - b.yaw)) ? fwdYaw : backYaw;
      if (n.d > 6) pathHeading = Math.atan2(n.x - b.x, n.z - b.z);
    }
    // Steering is camera-relative: W goes where the camera looks.
    let forward = inp.z;
    let steer = 0;
    if (this.riding && !inp.auto) {
      const cy = this.follow.heading();
      if (Math.hypot(inp.x, inp.z) > 0.1) {
        const want = Math.atan2(-inp.x * Math.cos(cy) + inp.z * Math.sin(cy), inp.x * Math.sin(cy) + inp.z * Math.cos(cy));
        const d = wrap(want - b.yaw);
        steer = -Math.max(-1, Math.min(1, d * 1.6));
        forward = inp.z < -0.1 && Math.abs(d) < 0.5 ? -1 : 1;
        if (inp.z < -0.1 && Math.abs(d) > 2.4) forward = 0.6;
      } else forward = 0;
    }
    const ev = b.update(dt, {
      h: { x: h.pos.x, z: h.pos.z },
      input: { forward, steer, gallop: inp.sprint, jump: this.rideJump, auto: inp.auto },
      pathHeading,
      ground: (x, z) => groundAt(x, z),
      walkable: (x, z) => slopeAt(x, z) < 0.72 && canyonAt(x, z).e < 2 && waterAt(x, z) - groundAt(x, z) < 1.1
    });
    this.rideJump = false;
    for (const e of ev) {
      if (e.type === 'arrive') {
        m.view.beast.play('Rear', { speed: 1.4, fade: 0.2 });
        this.sound.thud(Math.hypot(b.x - h.pos.x, b.z - h.pos.z), 0.6);
      }
      if (e.type === 'land') this.sound.thud(3, 0.6 + e.hard);
      if (e.type === 'jump') this.sfx.swing(0.6);
    }
    if (m.view.beast.overlay === 'Rear' && m.view.beast.progress() > 0.97) m.view.beast.rest(0.3);
    m.view.sync(dt, b, (x, z) => groundAt(x, z), { airborne: b.air });
    // Hooves: dust, splashes, sound.
    m.hoofT = (m.hoofT ?? 0) - dt * Math.max(0, b.speed);
    if (b.speed > 1 && m.hoofT <= 0 && !b.air) {
      m.hoofT = 1.1;
      const s = surfaceAt(b.x, b.z);
      this.sound.hoof(s, b.speed);
      if (s === 'water' || s === 'shallow') {
        const at = V(b.x, waterAt(b.x, b.z) + 0.02, b.z);
        this.vfx.burst(at, 12, [1.6, 1.8, 1.9], { speed: 3 + b.speed * 0.25, life: 0.55, size: 0.08, gravity: 9, up: 1.4 });
        this.vfx.ring(at, { radius: 1.2, color: [0.6, 0.7, 0.75], life: 0.6, width: 0.1 });
      } else if (b.speed > 8) this.vfx.smokeAt(V(b.x, b.y, b.z), 2, [0.36, 0.3, 0.22], { size: 0.5, life: 0.8, speed: 0.6, up: 0.3, alpha: 0.3 });
    }
    if (this.riding) {
      // Sit the saddle: put the hips on the seat.
      const seat = m.view.seat.getWorldPosition(V());
      const a = this.kit.actor;
      const o = a.object;
      o.rotation.set(0, b.yaw, 0);
      h.tilt.rotation.set(m.view.pitch * 0.6, 0, m.view.lean * 0.8);
      a.move(0);
      a.update(dt);
      const hips = a.bones.Hips?.getWorldPosition(V()) ?? o.position.clone().add(V(0, 0.9, 0));
      const off = hips.clone().sub(o.position);
      o.position.set(seat.x - off.x, seat.y - off.y + 0.06, seat.z - off.z);
      h.pos.copy(o.position);
      h.pos.y = groundAt(b.x, b.z);
      h.yaw = b.yaw;
      h.speed = b.speed;
    }
  }

  _rideProxy() {
    const b = this.mount.brain;
    this._proxy ??= { object: new THREE.Object3D(), yaw: 0, speed: 0 };
    this._proxy.object.position.set(b.x, b.y + 0.9, b.z);
    this._proxy.yaw = b.yaw;
    this._proxy.speed = b.speed;
    return this._proxy;
  }

  /** Monster, wildlife, companions, tracks and flies. */
  _living(dt, menu = false) {
    const h = this.hunter;
    const m = this.monster;
    if (m) {
      const b = m.brain;
      const ev = b.update(dt, {
        hunter: menu ? null : { x: h.pos.x, z: h.pos.z, alive: !this.combat.dead },
        walkable: (x, z) => slopeAt(x, z) < 0.85 && canyonAt(x, z).e < -1 && waterAt(x, z) - groundAt(x, z) < 2.5
      });
      if (!menu) this.monsterEvents(ev);
      else for (const e of ev) if (e.type === 'track') this.tracker.add(e.x, e.z, { yaw: e.yaw });
      m.view.sync(dt, b, (x, z) => groundAt(x, z));
      if (!menu) this._resolveStrike(dt);
      // Its tread.
      m.stepT = (m.stepT ?? 0) - dt * Math.max(0, b.speed);
      if (b.speed > 0.8 && m.stepT <= 0) {
        m.stepT = 2.6;
        this.sound.thud(Math.hypot(b.x - h.pos.x, b.z - h.pos.z), b.speed > 8 ? 1.4 : 0.8);
        if (surfaceAt(b.x, b.z) === 'shallow' || surfaceAt(b.x, b.z) === 'water') this.vfx.burst(V(b.x, waterAt(b.x, b.z), b.z), 20, [1.6, 1.8, 1.9], { speed: 4, life: 0.7, size: 0.12, gravity: 9, up: 1.4 });
      }
      // Keep the hunter out of its body.
      if (b.alive && !this.riding) {
        const d = Math.hypot(h.pos.x - b.x, h.pos.z - b.z);
        if (d < 2.6 && d > 0.01) {
          h.pos.x = b.x + ((h.pos.x - b.x) / d) * 2.6;
          h.pos.z = b.z + ((h.pos.z - b.z) / d) * 2.6;
        }
      }
      // Dropped pieces fall and settle.
      for (const d of m.drops) {
        if (d.settled) continue;
        d.v.y -= 18 * dt;
        d.obj.position.addScaledVector(d.v, dt);
        d.obj.rotation.x += d.spin.x * dt;
        d.obj.rotation.y += d.spin.y * dt;
        const g = groundAt(d.obj.position.x, d.obj.position.z) + 0.3;
        if (d.obj.position.y < g) {
          d.obj.position.y = g;
          d.settled = true;
          this.sound.thud(Math.hypot(d.obj.position.x - h.pos.x, d.obj.position.z - h.pos.z), 0.8);
        }
      }
      // Rage: steaming breath.
      if (b.enraged && b.alive && Math.random() < dt * 3) this.vfx.smokeAt(m.view.head(), 1, [0.85, 0.85, 0.85], { size: 0.5, grow: 2, life: 1.0, speed: 0.4, up: 0.6, alpha: 0.3 });
    }
    if (!menu) {
      this.wildlife.update(dt, { hunter: { x: h.pos.x, z: h.pos.z }, hunterAlive: !this.combat.dead, mount: this.mount?.brain, hurt: (s, dmg) => this.combat.hit('bite', { from: s, damage: dmg }) });
      for (const e of this.wildlife.takeEvents()) {
        if (e.type === 'skitter' && Math.random() < 0.5) this.hud?.say('Doran', 'Thornskitters! Mind their bite.');
      }
    }
    const fight = m && m.brain.alive && ['engage', 'attack', 'alert', 'stagger'].includes(m.brain.state) ? { x: m.brain.x, z: m.brain.z, alive: true, engaged: true } : null;
    if (this.threat && this.t > this.threat.until) this.threat = null;
    this.companions.update(dt, {
      h: { x: h.pos.x, z: h.pos.z, yaw: this.riding ? this.mount.brain.yaw : h.yaw, speed: this.riding ? this.mount.brain.speed : h.speed, riding: this.riding },
      fight: menu ? null : fight,
      threat: this.threat,
      camera: this.camera,
      shoot: (c) => this._allyShot(c),
      jab: (c) => this._allyJab(c)
    });
    // Tracks underfoot: walking over one reads it.
    this.tracks.sync(this.tracker.marks, groundAt);
    if (!menu) {
      const mk = this.tracker.nearest(h.pos.x, h.pos.z, this.riding ? 3.5 : 2.6);
      if (mk) {
        const done = this.tracker.collect(mk);
        this.hud?.log('gnarlScale', 1, done ? 'Tracked!' : `Footprint ${this.tracker.found}/${TRACK_GOAL}`);
        this.sfx.pickup('uncommon');
        if (done) {
          this.bark('tracked', true);
          this.hud?.banner('Gnarlhorn tracked', 'The scout flies know the way', { secs: 3.5 });
        } else this.bark('track');
      }
    }
    const lead = this.tracker.lead(h.pos.x, h.pos.z, m?.brain.alive ? m.brain : null);
    this.tracks.update(dt, this.t, h.pos, lead, Boolean(lead && Math.hypot(lead.x - h.pos.x, lead.z - h.pos.z) < 20));
    // Spent gathering spots grow back.
    for (const n of this.nodes.list) if (regrow(n, n.kind, dt)) this.nodes.setSpent(n, false);
  }

  _allyShot(c) {
    const m = this.monster;
    if (!m?.brain.alive) return;
    const from = c.actor.object.position.clone().add(V(0, 1.5, 0));
    const to = m.view.centre();
    const arrow = this.vfx.arrowMesh();
    arrow.position.copy(from);
    arrow.lookAt(to);
    this.scene.add(arrow);
    const dur = from.distanceTo(to) / 60;
    const t0 = this.t;
    const tick = () => {
      const k = Math.min(1, (this.t - t0) / dur);
      arrow.position.lerpVectors(from, to, k);
      if (k < 1 && !this.closed) requestAnimationFrame(tick);
      else {
        arrow.removeFromParent();
        if (m.brain.alive) {
          this.vfx.hit(to, { blood: [1.2, 0.15, 0.08] });
          this.monsterHit('body', 14 + Math.round(Math.random() * 6), to);
        }
      }
    };
    tick();
  }

  _allyJab(c) {
    const m = this.monster;
    if (!m?.brain.alive) return;
    const p = c.actor.object.position.clone().add(V(Math.sin(c.yaw) * 2.5, 1.4, Math.cos(c.yaw) * 2.5));
    const hit = m.view.partAt(p, 2.5);
    if (hit && !hit.miss) {
      this.vfx.hit(p, { blood: [1.2, 0.15, 0.08] });
      this.sfx.impact('beast');
      this.monsterHit(hit.part === 'head' ? 'neck' : hit.part, 20 + Math.round(Math.random() * 8), p);
    }
  }

  /** The ground under the pointer (or the screen's centre in mouse-look). */
  aimPoint() {
    const locked = Boolean(document.pointerLockElement);
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!locked && !this.pointer.on && this.t - this.pointer.moved > 20) return null;
    const nx = locked ? 0 : (this.pointer.x / w) * 2 - 1;
    const ny = locked ? 0 : -(this.pointer.y / h) * 2 + 1;
    const ray = (this._ray ??= new THREE.Raycaster());
    ray.setFromCamera({ x: nx, y: ny }, this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    // The monster's body first (aim at it, not the ground behind).
    const m = this.monster;
    if (m?.brain.alive) {
      const c = m.view.centre();
      const oc = c.clone().sub(o);
      const tc = oc.dot(d);
      if (tc > 0) {
        const miss = oc.clone().addScaledVector(d, -tc).length();
        if (miss < 3.2) {
          const p = o.clone().addScaledVector(d, tc);
          return { x: p.x, y: p.y, z: p.z };
        }
      }
    }
    const Hf = (x, z) => this.world.colliders.height(x, z);
    let prev = 0;
    for (let s = 0.5; s < 120; s *= 1.08) {
      const x = o.x + d.x * s;
      const z = o.z + d.z * s;
      const y = o.y + d.y * s;
      if (y <= Hf(x, z)) {
        let a = prev;
        let b = s;
        for (let i = 0; i < 8; i++) {
          const mm = (a + b) / 2;
          if (o.y + d.y * mm <= Hf(o.x + d.x * mm, o.z + d.z * mm)) b = mm;
          else a = mm;
        }
        return { x: o.x + d.x * b, y: o.y + d.y * b, z: o.z + d.z * b };
      }
      prev = s;
    }
    const k = 40;
    return { x: this.hunter.pos.x + d.x * k, y: this.hunter.pos.y + 1.4 + d.y * k, z: this.hunter.pos.z + d.z * k };
  }

  shakeCamera() {
    const k = this.combat.shake;
    if (k <= 0.001) return;
    const a = k * k * 0.3;
    const t = this.t * 47;
    this.camera.position.x += (Math.sin(t) + Math.sin(t * 2.3)) * a * 0.5;
    this.camera.position.y += (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.1)) * a * 0.5;
  }

  hudFrame(dt) {
    const h = this.hunter;
    const p = this.riding ? V(this.mount.brain.x, 0, this.mount.brain.z) : h.pos;
    const area = areaAt(p.x, p.z);
    if (area !== this.area) {
      const first = this.area === null;
      this.area = area;
      const a = AREAS.find((x) => x.id === area);
      if (a && (!first || area === 'camp')) this.hud.banner(a.name, a.sub);
    }
    // The monster's name, when it's near and in view.
    const m = this.monster;
    let mon = null;
    if (m) {
      const b = m.brain;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      const v = m.view.centre().project(this.camera);
      const inView = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      if ((inView && d < 60) || (d < 45 && b.state !== 'linger' && b.state !== 'roam')) {
        if (!this.tracker.spotted && b.alive) {
          this.tracker.spotted = true;
          this.bark('spotted');
        }
        const notes = [];
        if (!b.alive) notes.push('Slain');
        else if (b.state === 'rest') notes.push('Asleep');
        else if (b.limping) notes.push('Limping');
        if (b.enraged && b.alive) notes.push('Enraged');
        if (m.view.hidden.head) notes.push('Horns broken');
        if (m.view.hidden.tail) notes.push('Tail severed');
        mon = { name: GNARLHORN.name.toUpperCase(), title: GNARLHORN.title, note: notes.join(' · ') };
      }
    }
    // What E would do here.
    let prompt = null;
    this.hud.setHint(this.riding);
    if (!this.riding) {
      const what = this.nearInteract();
      if (what) prompt = `<kbd>E</kbd> ${what.label}`;
    }
    const party = this.companions.list.map((c) => ({ id: c.c.id, frac: c.hp }));
    const bar = newKit().bar.map((id, i) => ({ id, n: count(this.bag, id), key: String(i + 5) }));
    this.hud.update(dt, {
      ...this.combat.vitals(),
      party,
      weapon: { id: this.kit.weapon, name: this.kit.weapon === 'bow' ? 'Thornwood Bow' : 'Mossfang Greatblade', sharp: this.combat.sharp, sheathed: this.kit.sheathed, charge: this.combat.state === 'draw' || this.combat.state === 'charge' ? this.combat.chargeLv : 0 },
      items: bar,
      monster: mon,
      prompt
    });
    // The minimap, every other frame.
    if ((this._mm = !this._mm)) {
      const dots = [{ x: CAMP.x, z: CAMP.z, kind: 'camp' }];
      for (const n of this.nodes.list) if ((n.left ?? 1) > 0) dots.push({ x: n.x, z: n.z, kind: 'node', color: { herb: '#9ae04a', ore: '#9ad0ff', bug: '#ffe070', bone: '#f0e8d8' }[n.kind] });
      for (const c of this.companions.list) dots.push({ x: c.x, z: c.z, kind: 'ally', color: c.c.color });
      if (this.mount && !this.riding && this.mount.brain.state !== 'away') dots.push({ x: this.mount.brain.x, z: this.mount.brain.z, kind: 'mount' });
      if (m && (this.tracker.tracked || Math.hypot(m.brain.x - p.x, m.brain.z - p.z) < 50)) dots.push({ x: m.brain.x, z: m.brain.z, kind: 'monster' });
      for (const mk of this.tracker.marks) if (!mk.found) dots.push({ x: mk.x, z: mk.z, kind: 'track' });
      if (this.waypoint?.point) dots.push({ x: this.waypoint.point.x, z: this.waypoint.point.z, kind: 'pin', color: '#ff5ad9' });
      const yaw = this.riding ? this.mount.brain.yaw : h.yaw;
      this.hud.minimap.draw({ x: p.x, z: p.z, yawMap: Math.atan2(Math.cos(yaw), Math.sin(yaw)) + Math.PI / 2 }, this.follow.heading(), dots);
    }
    if (this.debug && (this._st = (this._st ?? 0) + dt) > 0.5) {
      this._st = 0;
      const s = this.post.stats ?? {};
      this.hud.setStats(`${this.fps} fps  ${(1000 / Math.max(1, this.fps)).toFixed(1)} ms  draws ${s.calls}  tris ${((s.triangles ?? 0) / 1e6).toFixed(2)}M  tier ${this.tier}  res ${this.resTier}\n${this.power.debugLine()}\npos ${p.x.toFixed(1)}, ${p.z.toFixed(1)}  monster ${m?.brain.state} ${Math.round((m?.brain.frac ?? 0) * 100)}%`);
    }
  }

  /* ================================================================ for tests and shots */

  /** Frame time with the GPU waited for (ms, mean of `n` frames) and the draw counts. */
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

  /** Put the hunter somewhere, facing `yaw`, the camera behind. */
  teleport(x, z, yaw = Math.PI, { pitch = 0.16, dist = 5 } = {}) {
    if (this.riding) {
      const b = this.mount.brain;
      b.x = x;
      b.z = z;
      b.yaw = yaw;
      b.y = groundAt(x, z);
    } else this.hunter.place(x, z, yaw);
    this.follow.yaw = yaw + Math.PI;
    this.follow.pitch = pitch;
    this.follow.wantDist = this.follow.dist = this.follow.cur = dist;
    this.follow.pivot.set(0, 0, 0);
    this.companions.place(x, z, yaw);
    this.follow.update(0.016, this.riding ? this._rideProxy() : this.hunter, {});
  }

  /** A point along the hunters' path (for shots and tests). */
  _pathAt(s) {
    return pointAt(PATH, s);
  }

  /** The cover shot: riding up the old stair through the colonnade, toward the Root Gate. */
  coverShot() {
    const b = this.mount.brain;
    b.state = 'waiting';
    b.x = 2;
    b.z = 60;
    this.mountUp();
    this.teleport(2, 60, Math.PI * 1.1, { pitch: 0.16, dist: 6.4 });
    this.keys.add('KeyR');
    this.weatherT = 10;
    // The beast asleep in its den, out of the picture.
    this.placeMonster(DEN.x, DEN.z, 0.5, 'linger');
  }

  /** Put the monster somewhere, in a state (for shots and tests). */
  placeMonster(x, z, yaw = 0, state = 'linger') {
    const b = this.monster.brain;
    b.x = x;
    b.z = z;
    b.yaw = yaw;
    b.state = state;
    b.stateT = 0;
    b.lingerFor = 999;
  }
}
