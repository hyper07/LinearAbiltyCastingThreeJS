/**
 * Kithvale: the starting map and characters of a creature-befriending
 * adventure — Lanternrest, a walled village of tile roofs and lanterns, and
 * the vale beyond its gate at golden dusk: a winding road, a stream with a
 * bridge, a meadow, a wood, a pond, warm crags, grassy downs, a hilltop
 * shrine. Six wild species live there. Creep up quietly, toss a treat it
 * loves, breathe with it in time, and it follows you home — up to three at
 * once, each lending you something. No story yet.
 *
 *   const game = new KithvaleGame(document.body, { onClose });
 *   await game.open();   …   game.close();
 *
 * Pure (tested): map.js, heights.js, rules.js, brains.js, quality.js,
 * cast.js, credits.js. The scene: world.js and its parts (terrain, sky,
 * grass, trees, water, village, landmarks, nature). The living: player.js,
 * villagers.js, fauna.js, creatures/. The picture: post.js. The sound:
 * audio.js. The screens: ui.js, touch.js.
 */
import * as THREE from 'three';
import { TextureBank } from '../gloamreach/textures.js';
import { CombatFx } from '../gloamreach/vfx.js';
import { FollowCamera } from '../gloamreach/camera.js';
import { shared } from '../gloamreach/materials.js';
import { Cards } from '../gloamreach/fx.js';
import { buildWorld, zoneGrid } from './world.js';
import { ZONES, ZONE_SAVE_KEY, HUB_IDS, inZone, migrateLegacy, cleanEntry, cleanKeeper, KEEPSAKES, keepsakeOf, TREAT_PRICE, REFILL_TO, carried, uncarry, STACK, entryKey } from './zones.js';
import { ZoneManager } from '../shared/zones/manager.js';
import { loadZoneSave, writeZoneSave, counters, mark } from '../shared/zones/state.js';
import { arrivalAt } from '../shared/zones/hub.js';
import { serviceNear, portalNear, SERVICE_NAMES } from '../shared/zones/zone.js';
import { disposeTree, compileReady } from '../shared/zones/dispose.js';
import { hubKit, portalVeil } from '../shared/zones/props.js';
import { SafeBadge, infoPanel, waystoneMenu, stashPanel, shopPanel } from '../shared/zones/hubUi.js';
import { move as stashMove, sortSlots, moveAll } from '../shared/zones/stash.js';
import { Post } from './post.js';
import { SETTINGS, chooseTier, Governor, startTier } from './quality.js';
import { CameraAssist, loadAssist, cameraMenu, menuSections } from '../shared/cameraAssist.js';
import { PowerKit } from '../shared/powerKit.js';
import { WorldMap, Waypoint, WaypointCue, mapButton, MAP_KEY } from '../shared/worldMap.js';
import { WaypointBeam } from '../shared/waypointBeam.js';
import { HelpPanel, helpButton, codesFor } from '../shared/helpPanel.js';
import { GameMusic, musicMenu, kithvaleTrack, duskAt } from '../shared/gameMusic.js';
import { CONTROLS } from './controls.js';

/** Treats on 5–7 and How to play on H / I (controls.js). */
const TREAT_CODES = codesFor(CONTROLS, 'treats');
const HELP_CODES = codesFor(CONTROLS, 'help');
import { powerSettings } from '../shared/power.js';
import { START, GATE, SHRINE, GARDEN, STONE_LANTERNS, HOLLOW, AREAS, areaAt, HABITATS } from './map.js';
import { groundAt, waterAt, streamDistance, depthAt, inVillage } from './heights.js';
import { LOOKS, VILLAGERS, AFTER } from './cast.js';
import { loadLook, Player, makeActor } from './player.js';
import { Villagers } from './villagers.js';
import { Fauna } from './fauna.js';
import { makeCreature } from './creatures/body.js';
import * as R from './rules.js';
import { ValeSound } from './audio.js';
import { Loading, StartScreen, Hud, paintMap, MAP_POIS, nameCard, journalPanel, creditsPanel, pauseMenu, el, treatIcon } from './ui.js';
import { TouchControls } from './touch.js';
import './kithvale.css';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };

const store = {
  load() {
    try {
      return R.deserialize(localStorage.getItem(R.SAVE_KEY));
    } catch {
      return R.newState();
    }
  },
  save(state) {
    try {
      localStorage.setItem(R.SAVE_KEY, R.serialize(state));
      return true;
    } catch {
      return false;
    }
  },
  has() {
    try {
      return Boolean(localStorage.getItem(R.SAVE_KEY));
    } catch {
      return false;
    }
  }
};

/** A heart, painted, for the bursts. */
function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 34);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, 20);
  g.bezierCurveTo(-34, -2, -18, -30, 0, -12);
  g.bezierCurveTo(18, -30, 34, -2, 0, 20);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** A calm game: Quiet runs at 45 frames a second. */
const POWER_PROFILE = { quietFps: 45 };

export class KithvaleGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'kv');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Kithvale');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this.closed = false;
    this.t = 0;
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('debug');
    this.touch = (window.matchMedia?.('(pointer: coarse)').matches ?? false) || this.params.has('touch');
    this.sound = new ValeSound();
    this.hadSave = store.has();
    this.state = store.load();
    if (this.params.has('fresh')) this.state = R.newState();
    this.picked = LOOKS.some((l) => l.id === this.state.look) ? this.state.look : 'sprout';
    this.chosen = 'berry';
    this.hearts = [];
    this.tossQ = [];
    this.sneakToggle = false;
    this._onKey = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keyUp(e);
    this._onBlur = () => {
      this.keys.clear();
      this.follow?.assist.clear();
    };
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.kithvale = this;
    this.THREE = THREE;
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const step = (label, k) => this.loading?.set(label, k);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer = renderer;
    renderer.domElement.className = 'kv-view';
    this.root.prepend(renderer.domElement);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    const q = this.params.get('quality');
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const guess = chooseTier({ gpu, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, pixels: screen.width * screen.height * devicePixelRatio ** 2, mobile });
    const first = SETTINGS[q] ? q : startTier(guess, { mobile, touch: this.touch });
    this.gpu = gpu;
    // `resTier`: the resolution this device always had (lowered only if frames really run slow);
    // `tier`: the detail, kept by the power governor within the Graphics preset.
    this.quality = SETTINGS[q] ? q : null;
    this.resTier = first;
    this.governor = new Governor(first, { max: q || (mobile ? 'medium' : 'ultra') });
    this.power = new PowerKit('kithvale', { renderer, profile: POWER_PROFILE, detail: this.quality ? null : first, features: { rays: true }, onChange: () => this.applyPower() });
    this.tier = this._detailTier();
    this.settings = { ...powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE }), msaa: first === 'low' ? 0 : 4 };
    // The sun's shadow is redrawn when due (every few frames on the lighter presets).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2500);
    this.resize();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.bank = new TextureBank(renderer, { size: this.settings.texSize });
    // What lives across zones: the looks, the friends' portraits, the camera, the picture.
    step('Calling the villagers', 0.03);
    const detail = this.bank.noise();
    this.templates = {};
    await Promise.all(LOOKS.map(async (l) => (this.templates[l.id] = await loadLook(l, detail))));
    if (this.closed) return;
    this.heartCards = new Cards(300, heartTexture(), { blend: 'alpha' });
    this.follow = new FollowCamera(this.camera, null);
    // , . turn the camera, [ ] tilt it, / puts it behind you; it eases back by itself after a quiet spell.
    this.follow.assist = new CameraAssist(loadAssist('kithvale'), { id: 'kithvale' });
    this.follow.fovBase = 50;
    this.post = new Post(renderer);
    this.hour = this.state.hour ?? R.DUSK;
    // The world as zones (zones.js): Lanternrest and the vale, one built at a time.
    this.zoneSave = loadZoneSave(ZONE_SAVE_KEY, { migrate: () => migrateLegacy(this.state), zones: ZONES.map((z) => z.id), hubs: HUB_IDS, stashSize: 24, cleanItem: cleanEntry, cleanGame: cleanKeeper });
    this.zoneSave.game.pouch ??= [];
    this.zoneSave.game.petals ??= 20;
    this.zones = new ZoneManager({
      game: 'kithvale',
      zones: ZONES,
      save: this.zoneSave,
      host: this.root,
      adapter: {
        load: (zone, at, progress) => this._loadZone(zone, at, progress),
        unload: () => this._unloadZone(),
        preload: (zone) => zoneGrid(zone),
        teleport: (at) => this.teleport(at.x, at.z, at.yaw ?? 0, { pitch: this.follow.pitch, dist: this.follow.wantDist }),
        persist: () => this.persistZones()
      },
      on: {
        leave: () => this._tripStart(),
        arrive: () => this._tripEnd(),
        enter: (zone, via) => this._entered(zone, via),
        hub: (inside, zone) => this.safeBadge?.set(inside, zone.hub?.name),
        message: (text) => this.hud?.toast(text),
        poi: (p) => this.hud?.toast(`Found: ${p.name}`)
      }
    });
    const startZone = this.zones.zone(this.zoneSave.zone) ?? this.zones.zones[0];
    await this.zones.enter(startZone.id, this._menuSpot(startZone), { via: 'load' });
    if (this.closed) return;
    step('Painting portraits', 0.95);
    this.portraits = this.paintPortraits();
    step('Ready', 1);
    this.loading.hide();
    this.loading = null;
    this.bindPointer();
    this.menu();
    // The loop: capped (60 by default, 45 on Quiet), stopped in a hidden tab, on demand behind the pause menu.
    this.power.start((raw) => {
      this.fps = this.power.loop.fps;
      this.frame(Math.min(0.05, raw / 1000), raw);
    });
    this.ready = true;
  }

  /* ================================================================ zones */

  _menuSpot(zone) {
    if (zone.id === 'lanternrest') return { x: START.x, z: START.z - 1, yaw: Math.PI };
    return arrivalAt(zone);
  }

  /** Build a zone: the land and its painted sky, the village's inside or the vale, the villagers and creatures, the hub. */
  async _loadZone(zone, at, progress) {
    this.zoneReady = false;
    const t0 = performance.now();
    const step = (label, k) => (this.loading ? this.loading.set(label, 0.06 + k * 0.86) : progress(label, k));
    this.world = await buildWorld({ renderer: this.renderer, bank: this.bank, settings: this.settings, save: this.state, zone, onProgress: (l, k) => step(l, k * 0.6) });
    if (this.closed) return;
    const world = this.world;
    const scene = world.scene;
    this.scene = scene;
    this.zone = zone;
    this.vfx = new CombatFx(scene, this.bank, (x, z) => world.ground(x, z));
    scene.add(this.heartCards.mesh);
    // Restore what the save says is done.
    if (world.landmarks) for (const i of this.state.lanterns) this.kindle(i, true);
    if (this.state.hollow && !world.hollow.stub) this.lightHollow(true);
    const detail = this.bank.noise();
    this.villagers = new Villagers({ scene, detail, keep: world.keep });
    await this.villagers.load();
    if (this.closed) return;
    step('Waking the wild ones', 0.72);
    const slope = (x, z) => Math.hypot(world.grid.at(x + 0.5, z) - world.grid.at(x - 0.5, z), world.grid.at(x, z + 0.5) - world.grid.at(x, z - 0.5));
    this.fauna = new Fauna({ scene, settings: this.settings, ground: world.ground, colliders: world.colliders, slope, vfx: this.vfx, keep: world.keep });
    await this.fauna.build(async (sp) => {
      step(`Sculpting the ${R.SPECIES[sp].name}s`, 0.72 + R.SPECIES_ORDER.indexOf(sp) * 0.025);
      await new Promise((r) => setTimeout(r, 0));
    });
    if (this.closed) return;
    // Friends who follow come along; the rest wait in the Kith Garden (in Lanternrest).
    for (const f of this.state.friends) {
      if (f.follow) this.fauna.adopt(f.species, { uid: f.uid, name: f.name, follow: true, x: at.x + 1, z: at.z - 2 });
      else if (zone.id === 'lanternrest') this.fauna.adopt(f.species, { uid: f.uid, name: f.name, follow: false });
    }
    this.follow.colliders = world.colliders;
    this.applyPower(true);
    this.minimapCanvas = paintMap(world.grid, world.trees);
    if (this.hud) {
      this.hud.minimap.map = this.minimapCanvas;
      this.hud.minimap.extent = world.extent;
    }
    this.setLook(this.picked);
    this.lumoLight = new THREE.PointLight(0xffc070, 0, 10, 1.6);
    scene.add(this.lumoLight);
    this._buildHub(zone);
    this._buildDoors(zone);
    this.worldMap?.setZone(this._mapData(zone));
    this.waypoint?.clear();
    this.beam = new WaypointBeam(scene, { color: '#ff8ad8' });
    this.teleport(at.x, at.z, at.yaw ?? 0, { pitch: this.follow.pitch ?? 0.1, dist: this.follow.wantDist ?? 4.4 });
    this.area = null;
    world.update(0.016, this.t ?? 0, this.camera, this.player.pos, this.hour);
    // Compile now (waiting for the GPU to finish, so a quick trip on doesn't pull programs out from under it).
    await compileReady(this.renderer, scene, this.camera);
    this.camera.layers.set(1);
    await compileReady(this.renderer, scene, this.camera);
    this.camera.layers.set(0);
    this.renderer.shadowMap.needsUpdate = true;
    this.zoneReady = true;
    this.lastLoadMs = Math.round(performance.now() - t0);
  }

  _unloadZone() {
    this.zoneReady = false;
    if (this.trust) this.endTrust?.('cancel');
    this.panel?.close?.();
    this.hubPanel?.close();
    if (this.worldMap?.isOpen) this.worldMap.close();
    this.heartCards.mesh.removeFromParent();
    // Everything in the zone's scene first (a module's own dispose takes things out of the scene, and would hide them from this walk).
    if (this.scene) disposeTree(this.scene, { keep: new Set([this.heartCards.mesh]) });
    if (this.actor) {
      this.actor.object.removeFromParent();
      this.actor.dispose();
      this.actor = null;
    }
    this.villagers?.dispose();
    this.fauna?.dispose();
    this.vfx?.dispose?.();
    this.hubProps?.dispose();
    this.beam?.dispose();
    this.world?.dispose();
    this.renderer.renderLists.dispose();
    this.villagers = this.fauna = this.vfx = this.hubProps = this.beam = null;
    this.player = null;
    this.doors = [];
    this.world = this.scene = null;
  }

  _buildHub(zone) {
    const hub = zone.hub;
    const H = (x, z) => this.world.ground(x, z);
    const blocked = (x, z) => !this.world.colliders.walkable(x, z, x, z) || this.world.colliders.pushOut(x, z, 0.6)[0] !== x;
    // Lanternrest's teahouse and shop are its own; its walls and lanterns are its edge.
    const skip = zone.id === 'lanternrest' ? ['rest', 'merchant', 'stats'] : ['stats'];
    const kit = hubKit({ hub, height: H, color: hub.color, skip, blocked, posts: hub.posts !== false, label: zone.name, wood: '#7a4a32', stone: '#8a7a6a' });
    this.scene.add(kit.group);
    for (const c of kit.colliders) this.world.colliders.circle(c.x, c.z, c.r, -100, 4);
    this.hubProps = kit;
    // The journal's stand: a lectern with the book open.
    const s = hub.services.stats;
    if (s) {
      const g = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.9 });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 8), wood);
      post.position.y = 0.55;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.5), wood);
      top.position.y = 1.12;
      top.rotation.x = -0.4;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.42), new THREE.MeshStandardMaterial({ color: 0xf0e2c0, roughness: 0.8, emissive: 0x3a2a10, emissiveIntensity: 0.3 }));
      book.position.set(0, 1.16, 0.01);
      book.rotation.x = -0.4;
      g.add(post, top, book);
      g.position.set(s.x, H(s.x, s.z), s.z);
      g.rotation.y = Math.atan2(hub.x - s.x, hub.z - s.z);
      kit.group.add(g);
      this.world.colliders.circle(s.x, s.z, 0.4, -100, 2);
    }
  }

  _buildDoors(zone) {
    const H = (x, z) => this.world.ground(x, z);
    this.doors = [];
    for (const p of zone.portals) {
      if (!p.veil) continue;
      const v = portalVeil({ w: p.veil.w, h: p.veil.h, a: '#ffe0a8', b: '#e07a5a', round: false, opacity: 0.75 });
      v.mesh.position.set(p.veil.x, H(p.veil.x, p.veil.z), p.veil.z);
      v.mesh.rotation.y = p.veil.face;
      this.scene.add(v.mesh);
      this.doors.push(v);
    }
  }

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

  _entered(zone, via) {
    this.persistZones();
    if (via !== 'load' && this.hud) this.hud.banner(zone.name, zone.sub);
  }

  persistZones() {
    writeZoneSave(ZONE_SAVE_KEY, this.zoneSave);
  }

  _mapData(zone) {
    return { title: `Kithvale — ${zone.name}`, base: this.minimapCanvas, extent: this.world.extent, areas: AREAS.filter((a) => !a.line && inZone(zone, a.x, a.z)) };
  }

  /** In a hub's ring (Kithvale has no fights; the label still tells you where home is). */
  isSafe() {
    return Boolean(this.player && this.zone && this.zones?.safeAt(this.player.pos.x, this.player.pos.z));
  }

  serviceLabel(s) {
    return { map: 'Read the map board', info: 'Read the notice board', stash: 'Open the stash chest', stats: 'Open the journal', merchant: `Trade at ${s.name ?? 'the stall'}`, rest: `Rest at ${s.name ?? 'the bench'}`, waystone: 'Touch the waystone' }[s.id] ?? s.id;
  }

  useService(id) {
    const zone = this.zone;
    const hold = { onOpen: () => this._holdOpened('hub'), onClose: () => this._mapClosed(), accent: zone.hub.color };
    const G = this.zoneSave.game;
    const sat = this.state.satchel;
    this.sound.tick?.();
    if (id === 'map') return this.openMap({ world: true });
    if (id === 'stats') return this.journal();
    if (id === 'rest') {
      this.zones.rest();
      if (this.state.cycle) this.hour = R.DUSK;
      this.hud.banner('A good rest', `${zone.hub.name}: you'll come back here when you're lost.`);
      return;
    }
    if (id === 'waystone') {
      this.hubPanel = waystoneMenu(this.root, { rows: this.zones.waystones(), onPick: (hub) => this.zones.fastTravel(hub), ...hold });
      return;
    }
    if (id === 'info') {
      const r = this.zoneSave.zones[zone.id];
      const species = Object.entries(R.SPECIES).filter(([sp]) => zone.id === 'vale').map(([, s]) => s.name);
      this.hubPanel = infoPanel(this.root, {
        zone: zone.name,
        sub: zone.sub,
        about: `${zone.hub.name} is a hub: a waystone, a stash for treats and keepsakes, a map board and a place to rest. ${zone.portals.map((p) => `${p.name} leads to ${this.zones.zone(p.to)?.name}.`).join(' ')}`,
        counters: counters(this.zoneSave, zone.id, { friends: zone.id === 'vale' ? R.SPECIES_ORDER.length : 0, nodes: zone.id === 'vale' ? 14 : 0, pois: zone.pois.length }),
        contents: [
          { label: 'Creatures', items: species },
          { label: 'Places', items: zone.pois.map((p) => (r?.pois?.includes(p.id) ? p.name : '?')) }
        ],
        tips: zone.tips ?? [],
        story: zone.story.hooks
      }, hold);
      return;
    }
    if (id === 'merchant') {
      const sections = () => [
        { label: 'Buy treats', rows: R.TREAT_ORDER.map((t) => ({ id: `buy:${t}`, name: R.TREATS[t].name, sub: `In your satchel: ${sat[t]}`, price: TREAT_PRICE[t], verb: 'Buy', disabled: G.petals < TREAT_PRICE[t] || sat[t] >= R.SATCHEL_MAX })) },
        { label: 'Refill', rows: [{ id: 'refill', name: `Fill the satchel to ${REFILL_TO} of each`, sub: 'Petals for what is missing', verb: 'Refill' }] },
        { label: 'Sell keepsakes', rows: G.pouch.map((e, i) => ({ id: `sell:${i}`, name: `${KEEPSAKES[e.keep].name} ×${e.n}`, sub: KEEPSAKES[e.keep].blurb, price: KEEPSAKES[e.keep].price, verb: 'Sell one' })) }
      ];
      this.hubPanel = shopPanel(this.root, {
        title: zone.hub.services.merchant.name ?? 'The shop',
        coinsLabel: 'Petals',
        coins: () => G.petals,
        sections,
        act: (rid) => {
          const [verb, k] = rid.split(':');
          let msg = '';
          if (verb === 'buy') {
            if (G.petals < TREAT_PRICE[k] || !R.addTreat(sat, k, 1)) return 'Not now.';
            G.petals -= TREAT_PRICE[k];
            msg = `+1 ${R.TREATS[k].name}`;
          } else if (verb === 'refill') {
            let cost = 0;
            for (const t of R.TREAT_ORDER) while (sat[t] < REFILL_TO && G.petals - cost >= TREAT_PRICE[t]) {
              R.addTreat(sat, t, 1);
              cost += TREAT_PRICE[t];
            }
            G.petals -= cost;
            msg = cost ? `Refilled for ${cost} petals.` : 'Your satchel is already full enough.';
          } else if (verb === 'sell') {
            const e = G.pouch[Number(k)];
            if (!e) return '';
            G.petals += KEEPSAKES[e.keep].price;
            msg = `Sold a ${KEEPSAKES[e.keep].name}.`;
            if (--e.n <= 0) G.pouch.splice(Number(k), 1);
          }
          this.refreshHud();
          this.saveSoon();
          this.persistZones();
          return msg;
        },
        ...hold
      });
      return;
    }
    if (id === 'stash') {
      const commit = (slots) => {
        G.pouch = uncarry(slots, sat);
        this.refreshHud();
        this.saveSoon();
        this.persistZones();
      };
      this.hubPanel = stashPanel(this.root, {
        title: `Stash — ${zone.hub.name}`,
        note: 'Treats from your satchel and keepsakes from your pouch on the left; the stash, the same chest in every hub, on the right.',
        bag: () => carried(sat, G.pouch),
        stash: () => this.zoneSave.stash,
        view: (e) => (e.treat ? { icon: treatIcon(e.treat, 40), count: e.n, name: R.TREATS[e.treat].name, color: R.TREATS[e.treat].color, tip: R.TREATS[e.treat].blurb } : { icon: KEEPSAKES[e.keep].icon, count: e.n, name: KEEPSAKES[e.keep].name, tip: `${KEEPSAKES[e.keep].blurb} The shop pays ${KEEPSAKES[e.keep].price} petals.` }),
        move: (side, i) => {
          const slots = carried(sat, G.pouch);
          const r = side === 'bag' ? stashMove(slots, i, this.zoneSave.stash, STACK) : stashMove(this.zoneSave.stash, i, slots, STACK);
          commit(slots);
          return r.ok ? null : side === 'bag' ? 'The stash is full.' : 'Your satchel is full.';
        },
        sort: (side) => {
          if (side === 'bag') commit(sortSlots(carried(sat, G.pouch), entryKey));
          else sortSlots(this.zoneSave.stash, entryKey);
          this.persistZones();
        },
        storeAll: () => {
          const slots = carried(sat, G.pouch);
          const n = moveAll(slots, this.zoneSave.stash, STACK, (e) => Boolean(e.treat));
          commit(slots);
          return `Stored ${n} keepsake${n === 1 ? '' : 's'} (treats stay in your satchel).`;
        },
        takeAll: () => {
          const slots = carried(sat, G.pouch);
          const n = moveAll(this.zoneSave.stash, slots, STACK);
          commit(slots);
          return `Took ${n}.`;
        },
        ...hold
      });
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.music?.dispose();
    this.saveNow();
    if (this.zoneSave) this.persistZones();
    this.power?.dispose();
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    if (this._onUp) window.removeEventListener('pointerup', this._onUp);
    if (this._onMove) window.removeEventListener('pointermove', this._onMove);
    if (document.pointerLockElement) document.exitPointerLock();
    this.touchUi?.dispose();
    if (this.world) this._unloadZone();
    this.zones?.dispose();
    this.post?.dispose();
    this.hud?.dispose();
    this.safeBadge?.dispose();
    this.worldMap?.dispose();
    this.help?.dispose();
    this.cue?.dispose();
    this.bank?.dispose();
    this.heartCards?.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.kithvale === this) delete window.kithvale;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings?.maxDpr ?? 1.5));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Tall phone screens: widen the view a little so the vale still fits.
    this.camera.fov = (this.follow?.fovBase ?? 50) + (w < h ? 14 : 0);
    this.camera.updateProjectionMatrix();
    this.post?.resize();
    this.power?.invalidate();
  }

  /** The detail level: fixed by ?quality=, the old rule on Ultra, else the power governor's. */
  _detailTier() {
    if (this.quality || this.power.preset === 'ultra') return this.resTier;
    return this.power.detail(this.resTier);
  }

  /** Apply the Graphics choice now (no reload): shadows, effects, grass, distances, haze. Resolution stays the device's own. */
  applyPower(first = false) {
    const prev = this.settings;
    this.tier = this._detailTier();
    const p = powerSettings(SETTINGS, { state: this.power.state, detail: this.tier, res: this.resTier, profile: POWER_PROFILE });
    const s = { ...p, msaa: prev.msaa, sculpt: prev.sculpt, texSize: prev.texSize, trees: prev.trees };
    this.settings = s;
    this.resize();
    this.post.configure({ ao: s.ao, rays: s.rays, bloom: s.bloom, smaa: (s.smaa && (s.preset === 'ultra' || !s.msaa)) || !s.msaa, msaa: s.msaa, refract: true, paint: s.paint, outline: s.outline, bloomHalf: s.bloomHalf }, s.scale);
    const lighting = this.world.lighting;
    if (!first && (prev.shadow !== s.shadow || prev.shadowBox !== s.shadowBox)) lighting.setShadow(s.shadow, s.shadowBox);
    lighting.sun.castShadow = s.shadowOn;
    this.renderer.shadowMap.needsUpdate = true;
    // The grass by density and reach; flowers follow the grass choice.
    this.world.grass.setDensity(s.grass, s.flowers * (s.grass / Math.max(0.01, SETTINGS[this.tier].grass)), s.grassReach);
    if (!first && prev.fur !== s.fur) this.fauna.setFur(s.fur);
    // The vale is a bowl: its ridge woods are the skyline, so trees are culled by view, not distance.
    Object.assign(this.world.limits, { far: s.far, shadowDist: s.shadowBox * 0.75 });
    if (this.fauna) this.fauna.drawFar = s.far;
    if (this.villagers) this.villagers.drawFar = s.far;
    this.power.invalidate();
  }

  /** Kept for tests and the console: force a detail level. */
  applyTier(tier) {
    this.quality = tier;
    this.resTier = tier;
    this.applyPower();
  }

  /** Portraits of each species for the journal and the HUD (rendered once, softly lit). */
  paintPortraits() {
    const r = this.renderer;
    const out = {};
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff4e8', '#b8a090', 1.6));
    const key = new THREE.DirectionalLight('#fff0dc', 2.4);
    key.position.set(-1.5, 2.5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd0a0', 1.4);
    rim.position.set(2, 1, -2);
    scene.add(rim);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
    const S = 192;
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    const c2 = document.createElement('canvas');
    c2.width = c2.height = S;
    const g = c2.getContext('2d');
    const prevShadow = r.shadowMap.enabled;
    for (const sp of R.SPECIES_ORDER) {
      const c = makeCreature(sp, { res: this.settings.sculpt, fur: 4, outline: true });
      c.group.rotation.y = 0.45;
      c.update(0.016, { state: 'ready', speed: 0 });
      c.update(0.5, { state: 'idle', speed: 0, perch: true });
      scene.add(c.group);
      c.group.updateMatrixWorld(true);
      const head = c.headWorld(V());
      const h = c.height;
      const focus = sp === 'lumoth' ? head.clone().add(V(0, -0.1, 0)) : V(head.x * 0.5, Math.max(h * 0.55, head.y * 0.85), head.z * 0.5);
      const dist = Math.max(1.1, h * 2.1) + (sp === 'mistfawn' ? 0.6 : 0);
      cam.position.copy(focus).add(V(0.15, 0.12, dist));
      cam.lookAt(focus);
      r.shadowMap.enabled = false;
      r.setScissorTest(true);
      r.setViewport(0, 0, S / pr, S / pr);
      r.setScissor(0, 0, S / pr, S / pr);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(scene, cam);
      g.clearRect(0, 0, S, S);
      g.drawImage(r.domElement, 0, r.domElement.height - S, S, S, 0, 0, S, S);
      out[sp] = c2.toDataURL();
      scene.remove(c.group);
      c.dispose();
    }
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
    r.setClearColor(0x000000, 1);
    r.shadowMap.enabled = prevShadow;
    return out;
  }

  /* ================================================================ you */

  setLook(id) {
    const look = LOOKS.find((l) => l.id === id) ?? LOOKS[0];
    this.picked = look.id;
    const tpl = this.templates[look.id];
    const old = this.player;
    if (this.actor) {
      this.scene.remove(this.actor.object);
      this.actor.dispose();
    }
    if (!tpl) return;
    this.actor = makeActor(tpl, look);
    this.scene.add(this.actor.object);
    this.player = new Player(this.actor, {
      colliders: this.world.colliders,
      onStep: (surface, speed, p) => this.footstep(surface, speed, p),
      onLand: (hard, surface) => this.sound.step(surface === 'cobble' ? 'cobble' : surface === 'wood' ? 'wood' : 'dirt', 4 + hard * 6, 1.4)
    });
    if (old) this.player.place(old.pos.x, old.pos.z, old.yaw);
    else {
      const m = this._menuSpot(this.zone ?? ZONES[0]);
      this.player.place(m.x, m.z, m.yaw);
    }
  }

  footstep(surface, speed, p) {
    const s = { cobble: 'cobble', wood: 'wood', dirt: 'dirt', grass: 'grass', moss: 'moss', rock: 'rock', shallow: 'water', water: 'water' }[surface] ?? 'grass';
    this.sound.step(s, speed, this.player.sneaking ? 0.25 : 1);
    if (surface === 'shallow' || surface === 'water') {
      const y = waterAt(p.x, p.z);
      const at = V(p.x, Number.isFinite(y) ? y + 0.02 : p.y, p.z);
      this.vfx.burst(at, 5 + Math.round(speed), [1.6, 1.7, 1.8], { speed: 1.8 + speed * 0.3, life: 0.4, size: 0.06, gravity: 9, up: 1.2 });
      this.vfx.ring(at, { radius: 0.5 + speed * 0.06, color: [0.6, 0.65, 0.7], life: 0.5, width: 0.08 });
    } else if (surface === 'dirt' && speed > 5.5) this.vfx.smokeAt(p, 1, [0.6, 0.5, 0.4], { size: 0.25, life: 0.6, speed: 0.4, up: 0.3, alpha: 0.25 });
  }

  /* ================================================================ screens */

  menu() {
    this.mode = 'menu';
    this.power.setMenu('live');
    // The soundtrack (docs/music.md): Lantern Valley in Lanternrest and at dusk, Sunlit Meadow out in the
    // valley by day, Treasure Found when a creature joins; the game's own Sound switch silences it too.
    this.music ??= new GameMusic('kithvale', { muted: () => !this.sound.enabled, settle: 2.5 });
    this.music.jump('lantern-valley');
    const spot = this._menuSpot(this.zone);
    this.player.place(spot.x, spot.z, spot.yaw);
    this.start = new StartScreen(this.root, {
      picked: this.picked,
      hasSave: this.state.friends.length > 0,
      onPick: (id) => {
        this.sound.wake();
        this.sound.tick();
        this.setLook(id);
        this.player.place(spot.x, spot.z, spot.yaw);
        this.state.look = id;
        this.saveSoon();
      },
      onBegin: () => this.begin(),
      onCredits: () => this.credits(),
      onClose: () => this.close()
    });
    this.root.focus();
  }

  menuCamera(t) {
    const p = this.player?.pos ?? V(START.x, 2, START.z);
    // In front of you, the gate and the vale behind.
    const wide = this.root.clientWidth > this.root.clientHeight;
    const a = Math.PI + Math.sin(t * 0.12) * 0.08 + (wide ? -0.32 : 0);
    const d = wide ? 4.2 : 5.2;
    this.camera.position.set(p.x + Math.sin(a) * d, p.y + 1.25, p.z + Math.cos(a) * d);
    // You on the right of the picture (the panel is on the left), the gate and the vale behind.
    this.camera.lookAt(p.x + (wide ? 1.3 : 0), p.y + (wide ? 1.35 : 0.6), p.z + 2);
    this.camera.fov = 40;
    this.camera.updateProjectionMatrix();
  }

  begin() {
    this.sound.wake();
    this.sound.tick();
    this.start?.hide();
    this.start = null;
    const at = this.zone.id === 'lanternrest' ? START : arrivalAt(this.zone);
    this.player.place(at.x, at.z, at.yaw);
    this.follow.yaw = at.yaw + Math.PI;
    this.follow.pitch = 0.1;
    this.follow.pivot.set(0, 0, 0);
    this.follow.wantDist = this.follow.dist = this.follow.cur = 4.4;
    this.resize();
    this.hud = new Hud(this.root, { touch: this.touch, debug: this.debug, portraits: this.portraits });
    this.hud.minimap.map = this.minimapCanvas;
    this.hud.minimap.extent = this.world.extent;
    this.safeBadge = new SafeBadge(this.hud.el ?? this.root);
    this.safeBadge.set(this.isSafe(), this.zone.hub.name);
    // The full map (O, the pause menu's Map, the minimap's button or ⟲'s neighbour 🗺 on touch) and its waypoint; its World tab shows every zone.
    this.waypoint ??= new Waypoint();
    this.worldMap = new WorldMap({
      host: this.root,
      ...this._mapData(this.zone),
      world: () => this.zones.world(),
      legend: [
        { shape: 'pin', color: '#7ee08f', label: 'Hub' },
        { shape: 'square', color: '#b98cff', label: 'Gate' },
        { shape: 'star', color: '#fff3d0', label: 'Gate · shrine · pond · garden' },
        { shape: 'heart', color: '#ff9ac0', label: 'Your friends' },
        { shape: 'dot', color: '#c8e070', label: 'Creatures you have met' },
        { shape: 'dot', color: '#8a8478', label: 'Creatures not met yet' },
        { shape: 'dot', color: '#ffb050', label: 'Stone lantern (lit)' },
        { shape: 'dot', color: '#6a6460', label: 'Stone lantern (dark)' },
        { shape: 'square', color: '#c98a2a', label: 'Buried cache' },
        { shape: 'dot', color: '#ffe0b0', label: 'Villager' }
      ],
      markers: () => this.mapMarkers(),
      player: () => ({ x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw }),
      waypoint: this.waypoint,
      onOpen: () => this._mapOpened(),
      onClose: () => this._mapClosed()
    });
    mapButton(this.hud.minimap.el, () => this.openMap());
    // How to play (H or I, the ? by the minimap, the pause menu): opens by itself the first time.
    this.help = new HelpPanel({ host: this.root, id: 'kithvale', table: CONTROLS, text: { close: 'Close (H)' }, onOpen: () => this._holdOpened('help'), onClose: () => this._mapClosed() });
    helpButton(this.hud.minimap.el, () => this.openHelp(), { style: 'left:-4px;top:-4px;width:30px;height:30px;font-size:15px' });
    this.cue = new WaypointCue(this.hud.el);
    this.beam ??= new WaypointBeam(this.scene, { color: '#ff8ad8' });
    this.hud.onPickTreat = (k) => this.pickTreat(k);
    if (this.touch) {
      this.touchUi = new TouchControls(this.root, {
        onButton: (id, down) => this.touchButton(id, down),
        onLook: (dx, dy) => this.follow.look(dx, dy),
        onZoom: (d) => this.follow.zoom(d)
      });
    }
    for (const f of this.fauna.friends) f.brain.x = at.x + (Math.random() - 0.5) * 2, (f.brain.z = at.z - 2);
    this.mode = 'play';
    this.power.setMenu('none');
    this.area = null;
    this.music.jump(this.musicArea());
    this.root.focus();
    this.hud.banner(this.zone.name, this.zone.id === 'lanternrest' ? (this.state.friends.length ? 'welcome back' : 'the vale is waiting beyond the gate') : this.zone.sub, 4.5);
    this.help.openFirstTime();
    this.refreshHud();
  }

  refreshHud() {
    if (!this.hud) return;
    if (!this.state.satchel[this.chosen]) this.chosen = R.TREAT_ORDER.find((k) => this.state.satchel[k] > 0) ?? this.chosen;
    this.hud.setSatchel(this.state.satchel, this.chosen);
    this.hud.setFriends(R.party(this.state));
  }

  /** What the full map shows besides you: the vale's places, your friends, the creatures (met by kind, the rest as unknowns), lanterns, caches, villagers. */
  mapMarkers() {
    const zone = this.zone;
    const out = MAP_POIS.filter((p) => inZone(zone, p.x, p.z)).map((p) => ({ x: p.x, z: p.z, shape: 'star', color: '#fff3d0', r: 1.2, label: p.name }));
    out.push({ x: zone.hub.x, z: zone.hub.z, shape: 'pin', color: '#7ee08f', r: 1.3, label: `${zone.hub.name} (hub)` });
    for (const [id, sv] of Object.entries(zone.hub.services)) out.push({ x: sv.x, z: sv.z, color: '#9fe8a8', r: 0.55, label: SERVICE_NAMES[id] });
    for (const d of zone.portals) out.push({ x: d.x, z: d.z, shape: 'square', color: '#b98cff', r: 1.1, label: `${d.name} → ${this.zones.zone(d.to)?.name}` });
    for (const v of this.villagers?.list ?? []) if (Number.isFinite(v.x)) out.push({ x: v.x, z: v.z, color: '#ffe0b0', r: 0.6 });
    if (this.world.landmarks) STONE_LANTERNS.forEach(([x, z], i) => out.push({ x, z, color: this.state.lanterns.includes(i) ? '#ffb050' : '#6a6460', r: 0.7 }));
    for (const c of this.world.caches.list) if (c.found && !c.dug) out.push({ x: c.x, z: c.z, shape: 'square', color: '#c98a2a', r: 0.8 });
    for (const w of this.fauna.wild) {
      if (!w.brain.present) continue;
      const met = this.state.seen.includes(w.species);
      out.push(met ? { x: w.brain.x, z: w.brain.z, color: R.SPECIES[w.species].color, label: R.SPECIES[w.species].name } : { x: w.brain.x, z: w.brain.z, color: '#8a8478', r: 0.8, label: '?' });
    }
    for (const f of this.fauna.friends) out.push({ x: f.brain.x, z: f.brain.z, shape: 'heart', color: R.SPECIES[f.species].color, label: f.name });
    return out;
  }

  /** Open the full map: the vale waits (and the 3D stops drawing) while it's up. */
  openMap({ world = false } = {}) {
    if (!this.worldMap || (this.mode !== 'play' && this.mode !== 'paused') || this.trust) return;
    if (this.mode === 'paused') {
      this.pauseEl?.close();
      this.pauseEl = null;
    }
    this.panel?.close();
    if (world) this.worldMap.openWorld();
    else this.worldMap.open();
  }

  /** How to play: the vale waits while it's up. */
  openHelp() {
    if (!this.help || (this.mode !== 'play' && this.mode !== 'paused') || this.trust) return;
    if (this.mode === 'paused') {
      this.pauseEl?.close();
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

  journal() {
    this.sound.tick();
    if (this.panel) {
      this.panel.close();
      return;
    }
    const open = () => {
      this.panel = journalPanel(this.root, {
        state: this.state,
        portraits: this.portraits,
        onFollow: (uid, follow) => {
          if (R.setFollow(this.state, uid, follow)) {
            this.fauna.setFollow(uid, follow);
            this.saveSoon();
            this.refreshHud();
          } else this.hud?.toast(`Three friends already follow you — ask one to rest first.`);
          this.panel.close();
          open();
        },
        onClose: () => {
          this.panel = null;
          this.root.focus();
        }
      });
    };
    open();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    // Nothing moves behind the pause menu: draw only when something changes.
    this.power.setMenu('still');
    this.pauseEl = pauseMenu(this.root, {
      graphics: menuSections(this.power.menu(), musicMenu(), cameraMenu(this.follow.assist)),
      onMap: () => this.openMap(),
      onHelp: () => this.openHelp(),
      soundOn: this.sound.enabled,
      cycleOn: this.state.cycle,
      onResume: () => this.resume(),
      onJournal: () => {
        this.resume();
        this.journal();
      },
      onCredits: () => this.credits(),
      onSound: () => {
        this.sound.setEnabled(!this.sound.enabled);
        return this.sound.enabled;
      },
      onCycle: () => {
        this.state.cycle = !this.state.cycle;
        if (!this.state.cycle) this.hour = R.DUSK;
        this.saveSoon();
        return this.state.cycle;
      },
      onLeave: () => this.close()
    });
  }

  resume() {
    this.pauseEl?.close();
    this.pauseEl = null;
    this.mode = 'play';
    this.power.setMenu('none');
    this.root.focus();
  }

  /* ================================================================ input */

  keyDown(e) {
    if (this.closed) return;
    if (e.target?.tagName === 'INPUT') return;
    if (this.mode === 'map') {
      if (e.code === 'Escape' || e.code === MAP_KEY) this.worldMap.close();
      return;
    }
    if (this.mode === 'help') {
      if (e.code === 'Escape' || HELP_CODES.includes(e.code)) this.help.close();
      return;
    }
    if (this.mode === 'hub') {
      if (e.code === 'Escape') this.hubPanel?.close();
      return;
    }
    if (this.mode === 'travel') return;
    if (e.code === 'Escape') {
      if (this.trust) this.endTrust(null);
      else if (this.panel) this.panel.close();
      else if (this.mode === 'play') this.pause();
      else if (this.mode === 'paused') this.resume();
      return;
    }
    if (this.mode !== 'play') return;
    if (this.follow.assist.key(e.code, true)) {
      e.preventDefault();
      return;
    }
    if (e.code === MAP_KEY && !e.repeat && !this.trust) {
      this.openMap();
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.sound.wake();
      if (this.trust && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) {
        this.trustPress();
        return;
      }
      if (HELP_CODES.includes(e.code)) {
        this.openHelp();
        return;
      }
      if (e.code === 'Space') this.jumpQ = true;
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyQ') this.toss();
      if (e.code === 'KeyJ') this.journal();
      if (e.code === 'KeyC') this.sneakToggle = !this.sneakToggle;
      if (e.code === 'KeyV') this.toggleMouseLook();
      const treat = TREAT_CODES.indexOf(e.code);
      if (treat >= 0) this.pickTreat(['berry', 'seed', 'crystal'][treat]);
    }
    this.keys.add(e.code);
  }

  keyUp(e) {
    this.keys.delete(e.code);
    this.follow?.assist.key(e.code, false);
  }

  touchButton(id, down) {
    this.sound.wake();
    if (!down) return;
    if (this.trust && (id === 'act' || id === 'jump')) return this.trustPress();
    if (id === 'jump') this.jumpQ = true;
    if (id === 'act') this.interact();
    if (id === 'toss') this.toss();
    if (id === 'menu') this.mode === 'play' ? this.pause() : this.resume();
    if (id === 'journal') this.journal();
    if (id === 'recenter') this.follow.assist.recenter();
    if (id === 'map') this.openMap();
  }

  toggleMouseLook() {
    const c = this.renderer.domElement;
    if (document.pointerLockElement) document.exitPointerLock();
    else c.requestPointerLock?.()?.catch?.(() => {});
  }

  bindPointer() {
    const c = this.renderer.domElement;
    this.drag = null;
    c.addEventListener('pointerdown', (e) => {
      this.sound.wake();
      if (this.mode !== 'play' || this.panel) return;
      if (e.pointerType === 'touch') {
        if (this.trust) this.trustPress();
        return;
      }
      if (this.trust) {
        this.trustPress();
        return;
      }
      if (e.button === 2) this.toss();
      else this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    window.addEventListener('pointermove', (this._onMove = (e) => {
      if (this.mode !== 'play' || e.pointerType === 'touch') return;
      if (document.pointerLockElement === c) this.follow.look(e.movementX, e.movementY);
      else if (this.drag && e.buttons & 1) {
        this.follow.look(e.clientX - this.drag.x, e.clientY - this.drag.y);
        this.drag.moved += Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y);
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
    }));
    window.addEventListener('pointerup', (this._onUp = () => (this.drag = null)));
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
    if (this.touchUi) {
      x += this.touchUi.move.x;
      z += this.touchUi.move.z;
    }
    const m = Math.hypot(x, z);
    if (m > 1) {
      x /= m;
      z /= m;
    }
    if (this.coverRun > 0) z = 1;
    const jump = this.jumpQ;
    this.jumpQ = false;
    return {
      x,
      z,
      sprint: has('ShiftLeft') || has('ShiftRight') || (this.touchUi && Math.hypot(this.touchUi.move.x, this.touchUi.move.z) > 0.98 && false),
      sneak: has('ControlLeft') || has('ControlRight') || this.sneakToggle || Boolean(this.touchUi?.sneak),
      jump,
      jumpHeld: has('Space') || Boolean(this.touchUi?.held.has('jump'))
    };
  }

  pickTreat(k) {
    if (!R.TREATS[k]) return;
    this.chosen = k;
    this.sound.tick();
    this.refreshHud();
    if (!this.state.satchel[k]) this.hud?.toast(`No ${R.TREATS[k].name} left — gather some in the vale.`);
  }

  /* ================================================================ treats */

  /** Toss the chosen treat ahead — toward the creature you're facing, if there is one. */
  toss() {
    if (this.mode !== 'play' || this.trust || this.player.busy > 0) return;
    const k = this.chosen;
    if (!R.takeTreat(this.state.satchel, k)) {
      this.hud?.toast(`Your satchel has no ${R.TREATS[k].name}.`);
      return;
    }
    const p = this.player.pos;
    const yaw = this.follow.heading();
    // Aim assist: the nearest wild creature in front, within 14 m.
    let target = null;
    let best = 1e9;
    for (const w of this.fauna.wild) {
      if (!w.brain.present) continue;
      const dx = w.brain.x - p.x;
      const dz = w.brain.z - p.z;
      const d = Math.hypot(dx, dz);
      const off = Math.abs(R.SPECIES && Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw)));
      if (d < 14 && off < 0.6 && d + off * 6 < best) {
        best = d + off * 6;
        target = w;
      }
    }
    let land;
    if (target) {
      const dx = target.brain.x - p.x;
      const dz = target.brain.z - p.z;
      const d = Math.hypot(dx, dz);
      const k2 = Math.max(0.3, (d - 1.4) / d);
      land = V(p.x + dx * k2, 0, p.z + dz * k2);
    } else land = V(p.x + Math.sin(yaw) * 6, 0, p.z + Math.cos(yaw) * 6);
    land.y = this.world.ground(land.x, land.z);
    this.player.yaw = Math.atan2(land.x - p.x, land.z - p.z);
    this.player.perform('Throw', 0.55, 1.5);
    this.sound.toss();
    this.tossQ.push({ t: 0.32, kind: k, land });
    this.refreshHud();
    this.saveSoon();
  }

  _releaseToss(q) {
    const hand = this.actor.bones.RightHand?.getWorldPosition(V()) ?? this.player.pos.clone().add(V(0, 1.3, 0));
    const T = 0.75;
    const v = V((q.land.x - hand.x) / T, (q.land.y - hand.y) / T + 0.5 * 16 * T, (q.land.z - hand.z) / T);
    this.fauna.toss(q.kind, hand, v);
  }

  /* ================================================================ E: whatever is near */

  nearInteract() {
    const p = this.player.pos;
    // A creature that trusts you.
    const ready = this.fauna.nearest(p.x, p.z, 3.6, (w) => w.brain.state === 'ready');
    if (ready) return { type: 'trust', w: ready, label: `Breathe with the ${R.SPECIES[ready.species].name}` };
    // A hub's service (it stands still; people come and go).
    const sv = serviceNear(this.zone, p.x, p.z, 2.6);
    if (sv) return { type: 'service', id: sv.id, label: this.serviceLabel(sv) };
    // A villager.
    const vn = this.nearVillager;
    if (vn && vn.d < 2.6) return { type: 'talk', p: vn.p, label: `Talk to ${vn.p.v.name}` };
    // Something to gather.
    const f = this.world.forage.nearest(p.x, p.z, 2.4);
    if (f) return { type: 'forage', f, label: { berry: 'Pick Sweetberries', seed: 'Shake out Sunseeds', crystal: 'Prise out Glimmer crystals' }[f.kind] };
    const cache = this.world.caches.list.find((c) => c.found && !c.dug && Math.hypot(c.x - p.x, c.z - p.z) < 2.2);
    if (cache) return { type: 'dig', cache, label: 'Dig where your friend sniffed' };
    const roller = this.friendWith('roll');
    const boulder = this.world.boulders.list.find((b) => !b.broken && Math.hypot(b.x - p.x, b.z - p.z) < 3.4);
    if (boulder) return roller ? { type: 'roll', boulder, f: roller, label: `Ask ${roller.name} to roll into the cracked boulder` } : { type: 'note', label: 'A cracked boulder. Something heavy and round could break it.' };
    const ember = this.friendWith('ember');
    const li = STONE_LANTERNS.findIndex(([x, z], i) => !this.state.lanterns.includes(i) && Math.hypot(x - p.x, z - p.z) < 2.6);
    if (li >= 0) return ember ? { type: 'kindle', i: li, f: ember, label: `Ask ${ember.name} to kindle the stone lantern` } : { type: 'note', label: 'A cold stone lantern. It wants a little flame.' };
    const hm = this.world.hollow.mouth;
    if (Math.hypot(hm.x - p.x, hm.z - p.z) < 4) {
      if (!this.state.hollow) return ember ? { type: 'hollow', f: ember, label: `Ask ${ember.name} to light the Hollow` } : { type: 'note', label: 'The Hollow is pitch dark. You can\'t see a thing.' };
      if (!this.state.hollowTaken) return { type: 'hollowTake', label: 'Gather the crystals in the Hollow' };
    }
    return null;
  }

  friendWith(ability) {
    const f = this.fauna.friends.find((x) => R.SPECIES[x.species].ability.id === ability);
    return f ? { ...f, name: f.name } : null;
  }

  interact() {
    if (this.mode !== 'play' || this.player.busy > 0) return;
    const what = this.nearInteract();
    if (!what) return;
    const s = this.state.satchel;
    switch (what.type) {
      case 'trust':
        this.startTrust(what.w);
        break;
      case 'talk': {
        const v = what.p.v;
        this.hud.say(v.name, v.title, this.state.friends.length && AFTER[v.id] ? AFTER[v.id] : v.greet);
        what.p.actor.act('Talk', { loop: false, fade: 0.2 }) || what.p.actor.act('Greet', { loop: false, fade: 0.2 });
        break;
      }
      case 'forage': {
        const f = what.f;
        this.player.perform(f.kind === 'seed' ? 'Wave' : 'PickUp', 1.0, 1.4);
        setTimeout(() => {
          const n = R.addTreat(s, f.kind, f.kind === 'crystal' ? 2 : 3);
          this.world.forage.setReady(f, false);
          f.regrow = 75 + Math.random() * 40;
          this.sound.pick();
          this.vfx.burst(V(f.x, f.top, f.z), 10, f.kind === 'berry' ? [2, 0.4, 0.6] : f.kind === 'seed' ? [2, 1.6, 0.4] : [0.8, 2, 2.4], { speed: 2, life: 0.7, size: 0.07, gravity: 3, up: 1 });
          this.hud.toast(n ? `<img src="${treatIcon(f.kind, 40)}" alt=""> +${n} ${R.TREATS[f.kind].name}` : 'Your satchel is full of those.');
          this.refreshHud();
          this.saveSoon();
        }, 550);
        break;
      }
      case 'dig': {
        const c = what.cache;
        this.player.perform('Dig', 1.6, 1.2);
        this.sound.dig();
        setTimeout(() => {
          c.dug = true;
          c.mesh.visible = false;
          this.state.caches.push(c.id);
          const n = R.addTreat(s, c.treat, c.n);
          this.vfx.smokeAt(V(c.x, groundAt(c.x, c.z), c.z), 6, [0.55, 0.42, 0.3], { size: 0.4, life: 1, speed: 0.6, up: 0.6, alpha: 0.4 });
          // A keepsake was buried with the treats.
          const k = keepsakeOf(c.id);
          const G = this.zoneSave.game;
          const has = G.pouch.find((e) => e.keep === k);
          if (has) has.n = Math.min(9, has.n + 1);
          else if (G.pouch.length < 9) G.pouch.push({ keep: k, n: 1 });
          mark(this.zoneSave, this.zone.id, 'nodes', `cache:${c.id}`);
          this.persistZones();
          this.hud.toast(`<img src="${treatIcon(c.treat, 40)}" alt=""> A buried cache! +${n} ${R.TREATS[c.treat].name} and a keepsake: ${KEEPSAKES[k].icon} ${KEEPSAKES[k].name}`);
          this.sound.pick();
          this.refreshHud();
          this.saveSoon();
        }, 1200);
        break;
      }
      case 'roll': {
        const b = what.boulder;
        const f = this.fauna.friends.find((x) => x.uid === what.f.uid);
        this.hud.toast(`${what.f.name} tucks in and rolls…`);
        f.brain.doAt(b.x + (this.player.pos.x - b.x) * 0.25, b.z + (this.player.pos.z - b.z) * 0.25, 'roll', () => this.breakBoulder(b));
        break;
      }
      case 'kindle': {
        const [x, z] = STONE_LANTERNS[what.i];
        const f = this.fauna.friends.find((y) => y.uid === what.f.uid);
        f.brain.doAt(x + 0.9, z + 0.9, 'kindle', () => this.kindle(what.i));
        break;
      }
      case 'hollow': {
        const f = this.fauna.friends.find((y) => y.uid === what.f.uid);
        const m = this.world.hollow.mouth;
        f.brain.doAt(m.x, m.z, 'kindle', () => this.lightHollow());
        break;
      }
      case 'hollowTake': {
        this.player.perform('PickUp', 1.0, 1.3);
        this.state.hollowTaken = true;
        const n = R.addTreat(s, 'crystal', HOLLOW.n);
        this.world.hollow.inside.visible = false;
        this.hud.toast(`<img src="${treatIcon('crystal', 40)}" alt=""> +${n} Glimmer crystals from the Hollow`);
        this.sound.pick();
        this.refreshHud();
        this.saveSoon();
        break;
      }
      case 'note':
        this.hud.toast(what.label);
        break;
      case 'service':
        this.useService(what.id);
        break;
      default:
        break;
    }
  }

  breakBoulder(b) {
    b.broken = true;
    b.mesh.visible = false;
    if (b.collider) b.collider.r = 0;
    this.state.boulders.push(b.id);
    if (mark(this.zoneSave, this.zone.id, 'nodes', `boulder:${b.id}`)) this.persistZones();
    const at = V(b.x, groundAt(b.x, b.z) + 0.8, b.z);
    this.sound.shatter();
    this.vfx.smokeAt(at, 14, [0.62, 0.58, 0.56], { size: 0.9, grow: 2.4, life: 1.6, speed: 2, up: 1, alpha: 0.5 });
    this.vfx.burst(at, 26, [0.7, 0.66, 0.62], { speed: 6, life: 0.9, size: 0.14, gravity: 14, up: 0.8 });
    this.vfx.burst(at, 14, [0.8, 2.2, 2.6], { speed: 3, life: 1.4, size: 0.08, gravity: 2, up: 1.4 });
    const n = R.addTreat(this.state.satchel, 'crystal', b.n);
    this.hud.toast(`<img src="${treatIcon('crystal', 40)}" alt=""> The boulder cracks open! +${n} Glimmer crystals`);
    this.refreshHud();
    this.saveSoon();
  }

  kindle(i, quiet = false) {
    if (!this.world.landmarks) return;
    const fire = this.world.landmarks.fires[i];
    fire.emissiveIntensity = 2.4;
    fire.color.set('#ffd8a0');
    if (!this.state.lanterns.includes(i)) this.state.lanterns.push(i);
    const p = this.world.landmarks.lanterns[i];
    this.world.lamps.push(p);
    if (quiet) return;
    this.sound.kindle();
    this.vfx.fire(p, 10, { size: 0.3, speed: 1, life: 0.8 });
    this.vfx.burst(p, 12, [3, 1.4, 0.4], { speed: 1.5, life: 1.2, size: 0.05, gravity: -1, up: 2 });
    const lit = this.state.lanterns.length;
    if (lit === STONE_LANTERNS.length) {
      this.hud.banner('The shrine path is lit', 'the wind bells ring for you');
      this.sound.bells(2);
      setTimeout(() => this.sound.bells(2), 800);
      R.addTreat(this.state.satchel, 'berry', 4);
      R.addTreat(this.state.satchel, 'seed', 4);
      this.hud.toast('The shrine keeper left you a gift: +4 Sweetberries, +4 Sunseeds');
      this.refreshHud();
    } else this.hud.toast(`Stone lantern lit (${lit}/${STONE_LANTERNS.length})`);
    this.saveSoon();
  }

  lightHollow(quiet = false) {
    const h = this.world.hollow;
    if (h.stub) return;
    h.light.intensity = 9;
    h.dark.material.color.set('#3a2418');
    h.inside.visible = !this.state.hollowTaken;
    this.state.hollow = true;
    if (quiet) return;
    this.sound.kindle();
    this.hud.toast('Warm light fills the Hollow — crystals glitter inside!');
    this.saveSoon();
  }

  /* ================================================================ the trust moment */

  startTrust(w) {
    const s = R.SPECIES[w.species];
    w.brain.set('trust');
    this.trust = { w, t: -s.breath * 1.1, breath: s.breath, beats: s.beats, grades: [], cue: -1, flash: 0, calm: R.hasAbility(this.state, 'calm') };
    this.player.yaw = Math.atan2(w.brain.x - this.player.pos.x, w.brain.z - this.player.pos.z);
    this.actor.act('CrouchIdle', { loop: true, fade: 0.4 });
    this.player.busy = 999;
    this.follow.wantDist = 3.6;
    this.follow.yaw = this.player.yaw + Math.PI - 0.5;
    this.follow.pitch = 0.22;
    this.sound.voice(w.species, 'hi', 2);
    this.hud.toast(`Breathe with the ${s.name}: press <kbd>Space</kbd> / tap as the ring fills the circle.`, 4);
  }

  trustPress() {
    const tr = this.trust;
    if (!tr || tr.result) return;
    if (tr.t < 0) {
      this.hud.toast('Watch the first breath — then press as the ring fills the circle.');
      return;
    }
    const k = Math.round(tr.t / tr.breath - 0.5);
    if (k < 0 || k >= tr.beats || tr.grades[k]) return;
    const grade = R.gradeBeat(R.breathError(tr.t, tr.breath), tr.calm);
    tr.grades[k] = grade;
    tr.flash = grade === 'miss' ? 0 : 1;
    this.sound.beat(grade, k);
    const head = tr.w.body.headWorld(V());
    if (grade !== 'miss') this.vfx.burst(head.add(V(0, 0.2, 0)), grade === 'perfect' ? 10 : 5, [2.4, 1.8, 1.0], { speed: 1.2, life: 0.9, size: 0.06, gravity: -0.5, up: 1 });
    tr.label = grade === 'perfect' ? 'Perfect' : grade === 'good' ? 'Good' : 'Too soon… too late';
    tr.labelT = 0.8;
  }

  updateTrust(dt) {
    const tr = this.trust;
    tr.t += dt;
    tr.flash = Math.max(0, tr.flash - dt * 2.5);
    tr.labelT = (tr.labelT ?? 0) - dt;
    // A soft bell at the top of each breath.
    const peak = Math.floor(tr.t / tr.breath + 0.5);
    if (peak !== tr.cue && tr.t > 0 && (tr.t / tr.breath) % 1 > 0.5 && peak - 1 < tr.beats) {
      tr.cue = peak;
    }
    // Breaths that passed without a press are misses.
    for (let k = 0; k < tr.beats; k++) if (!tr.grades[k] && tr.t > (k + 0.5 + 0.3) * tr.breath) tr.grades[k] = 'miss';
    const w = tr.w;
    // You and it stay put, face to face.
    this.player.yaw = Math.atan2(w.brain.x - this.player.pos.x, w.brain.z - this.player.pos.z);
    w.brain.set('trust');
    const ph = ((tr.t / tr.breath) % 1 + 1) % 1;
    const breathing = R.breathSize(tr.t, tr.breath);
    if (!tr.result && (tr.grades.filter(Boolean).length >= tr.beats || tr.t > (tr.beats + 0.4) * tr.breath)) {
      tr.result = R.trustResult(tr.grades, tr.beats);
      tr.resultT = 0;
      if (tr.result.success) this.trustWon();
      else this.trustLost();
    }
    if (tr.result) {
      tr.resultT += dt;
      if (tr.resultT > (tr.result.success ? 1.6 : 1.2) && !tr.naming) this.endTrust(tr.result);
    }
    const head = w.body.headWorld(V()).add(V(0, 0.05, 0));
    const s = head.clone().project(this.camera);
    const label = tr.result ? (tr.result.success ? '♥ Trust ♥' : 'Not quite…') : tr.t < 0 ? 'Watch it breathe…' : tr.labelT > 0 ? tr.label : ph < 0.5 ? 'Breathe in…' : '…and out';
    this.hud.ring(tr.result?.success && tr.resultT > 0.6 ? null : { x: (s.x * 0.5 + 0.5) * this.root.clientWidth, y: (-s.y * 0.5 + 0.5) * this.root.clientHeight, t: tr.t, breath: tr.breath, beats: tr.beats, grades: tr.grades, flash: tr.flash, label });
    return breathing;
  }

  trustWon() {
    const tr = this.trust;
    const w = tr.w;
    const head = w.body.headWorld(V());
    this.sound.friend();
    this.sound.voice(w.species, 'happy', 2);
    w.body.cheer(1.6);
    w.body.emote('love', 2);
    this.heartBurst(head, 26);
    this.actor.act('Cheer', { loop: false, fade: 0.2 });
    if (mark(this.zoneSave, this.zone.id, 'friends', w.species)) this.persistZones();
  }

  trustLost() {
    const w = this.trust.w;
    this.sound.shy();
    w.body.emote('dislike', 1.5);
    w.body.shake(0.8);
  }

  endTrust(result) {
    const tr = this.trust;
    if (!tr) return;
    this.hud.ring(null);
    const w = tr.w;
    this.player.busy = 0;
    this.actor.rest(0.3);
    this.follow.wantDist = 4.4;
    if (result?.success) {
      tr.naming = true;
      const taken = this.state.friends.map((f) => f.name);
      const name = R.pickName(w.species, taken);
      this.mode = 'naming';
      this.panel = nameCard(this.root, {
        species: w.species,
        name,
        portrait: this.portraits[w.species],
        onDone: (typed) => {
          this.panel = null;
          this.mode = 'play';
          const friend = R.befriend(this.state, { species: w.species, name: R.cleanName(typed, name), uid: `k${Date.now().toString(36)}` });
          this.fauna.befriend(w, { uid: friend.uid, name: friend.name, follow: friend.follow });
          for (const o of this.fauna.friends) if (o.uid !== friend.uid) o.body.cheer(1.2);
          this.music?.cue('discovery');
          this.hud.banner(`${friend.name} joined you!`, friend.follow ? R.SPECIES[w.species].ability.desc : 'Three friends already follow you — they\'ll wait in the Kith Garden.', 5);
          this.heartBurst(w.body.headWorld(V()), 14);
          this.refreshHud();
          this.saveNow();
          this.trust = null;
          this.root.focus();
        }
      });
    } else {
      if (result) {
        w.brain.shaken();
        this.hud.toast(`The ${R.SPECIES[w.species].name} isn't sure yet. Give it a moment, and try again.`);
      } else w.brain.set('curious');
      this.trust = null;
    }
  }

  heartBurst(at, n = 20) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 2.2;
      this.hearts.push({ p: at.clone(), v: V(Math.cos(a) * s, 2.2 + Math.random() * 2.4, Math.sin(a) * s), life: 0, max: 1.4 + Math.random() * 0.8, size: 0.16 + Math.random() * 0.14, rot: (Math.random() - 0.5) * 0.6, c: Math.random() < 0.7 ? [1.6, 0.42, 0.62] : [1.8, 1.2, 1.3] });
    }
    this.vfx.ring(at, { radius: 1.6, color: [2.2, 1.0, 1.3], life: 0.6, width: 0.12, flat: false });
  }

  /* ================================================================ frame */

  frame(dt, rawMs = 16) {
    // Between zones nothing moves and nothing is drawn: the trip's card covers the view.
    if (this.mode === 'travel' || !this.zoneReady) return;
    this.t += dt;
    const t = this.t;
    const playing = this.mode === 'play';
    const world = this.world;
    this.hour = R.advanceHour(this.hour, dt, playing && this.state.cycle);
    if (this.coverRun > 0) this.coverRun -= dt;
    this.state.hour = this.hour;
    let breath = 0;
    if (playing || this.mode === 'naming') {
      const inp = this.trust ? { x: 0, z: 0, jump: false } : this.input();
      for (const q of this.tossQ) q.t -= dt;
      for (const q of this.tossQ.filter((x) => x.t <= 0)) this._releaseToss(q);
      this.tossQ = this.tossQ.filter((x) => x.t > 0);
      const abilities = { float: R.hasAbility(this.state, 'float') };
      this.player.update(dt, inp, this.follow.heading(), abilities);
      if (!this.trust && this.mode === 'play') {
        this.zones.update(dt, this.player.pos.x, this.player.pos.z);
        if (this.mode === 'travel' || !this.zoneReady) return;
      }
      if (this.trust) breath = this.updateTrust(dt);
      // No swinging round on its own while befriending, on a fixed shot, or in mouse-look.
      this.follow.pause = Boolean(this.trust) || Boolean(this.camFix) || Boolean(document.pointerLockElement);
      this.follow.update(dt, this.player, { sprinting: inp.sprint && this.player.speed > 5, moving: this.player.speed > 0.5 });
      if (this.camFix) {
        // A fixed camera (for shots and tests).
        this.camera.position.copy(this.camFix.pos);
        this.camera.lookAt(this.camFix.look);
      }
      this.vfx.update(dt, this.camera);
      this.living(dt, breath);
    } else if (this.mode === 'menu') {
      this.actor.move(0);
      this.actor.update(dt);
      this.living(dt, 0, true);
      this.menuCamera(t);
      this.vfx.update(dt, this.camera);
    } else this.actor.update(0);
    shared.uPlayer.value.copy(this.player.pos);
    shared.uWind.value.set(0.8, 0.5, 0.75, 0.3 + 0.3 * Math.sin(t * 0.13));
    const focus = this.player.pos;
    const mood = world.update(dt, t, this.camera, focus, this.hour);
    this.heartsFrame(dt);
    // Sound by place and hour.
    const dark = THREE.MathUtils.smoothstep(Math.abs(((this.hour - 12 + 24) % 24) - 12), 4.8, 6.6);
    this.sound.update(dt, { stream: streamDistance(focus.x, focus.z).d, dusk: dark, shrine: Math.hypot(SHRINE.x - focus.x, SHRINE.z - focus.z), wind: inVillage(focus.x, focus.z) ? 0.6 : 1 });
    this._dusk = duskAt(this.hour, this._dusk);
    if (playing || this.mode === 'naming') {
      this.music.update(dt, { area: this.musicArea() });
      // Softer under the trust moment's breathing bells.
      const lvl = this.trust ? 0.5 : 1;
      if (this.music.level !== lvl) this.music.setLevel(lvl, { fade: 1.2 });
    }
    // The sun's shadow: redrawn when due (every frame on High and Ultra; every few, or when the view moves, below).
    const s = this.settings;
    const cp = this.camera.position;
    this.renderer.shadowMap.needsUpdate = s.shadowOn && (this.renderer.shadowMap.needsUpdate || this.power.shadowDue(s.shadowEvery, cp.x, cp.z, this.follow.yaw ?? 0));
    // The haze a little thicker on the nearer draw distances, so where detail stops reads as distance.
    this.power.gpuBegin();
    this.post.render(this.scene, this.camera, { ...mood, fogDensity: mood.fogDensity * s.fog, ground: focus.y - 6, bloom: 0.42, paint: 0.8, ink: 0.42 });
    this.power.gpuEnd();
    if (playing && this.hud) this.hudFrame(dt);
    this.power.showFps(this.root);
    // The waypoint: its beam in the world, the cue toward it.
    const wp = this.waypoint?.point;
    this.beam?.update(wp, wp ? groundAt(wp.x, wp.z) : 0, t);
    if (playing) this.cue?.update(this.waypoint, focus.x, focus.z, this.follow.heading());
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
    if (playing && (this._saveT = (this._saveT ?? 0) + dt) > 30) {
      this._saveT = 0;
      this.saveNow();
    }
  }

  heartsFrame(dt) {
    const hc = this.heartCards;
    hc.begin();
    this.hearts = this.hearts.filter((h) => (h.life += dt) < h.max);
    for (const h of this.hearts) {
      h.v.y -= 2.2 * dt;
      h.v.multiplyScalar(Math.exp(-1.6 * dt));
      h.p.addScaledVector(h.v, dt);
      const k = h.life / h.max;
      const a = Math.min(1, h.life * 8) * (1 - k * k);
      hc.push(h.p.x, h.p.y, h.p.z, h.size * (1 + Math.sin(h.life * 9) * 0.08), h.c[0], h.c[1], h.c[2], a, h.rot);
    }
    hc.end();
  }

  /** Villagers, creatures, friends, abilities. */
  living(dt, breath, menu = false) {
    const p = this.player;
    const camera = this.camera;
    const near = this.villagers.update(dt, { player: { x: p.pos.x, z: p.pos.z }, camera, active: !menu });
    this.nearVillager = near[0] ?? null;
    if (!menu && this.hud) {
      for (const n of near) {
        if (n.p.justGreeted) {
          n.p.justGreeted = false;
          this.hud.say(n.p.v.name, n.p.v.title, this.state.friends.length && AFTER[n.p.v.id] ? AFTER[n.p.v.id] : n.p.v.greet);
        }
      }
      // Name plates over the nearest few.
      const plates = [];
      for (const n of near.slice(0, 3)) {
        const head = n.p.actor.object.position.clone().add(V(0, n.p.v.height + 0.35, 0));
        const s = head.project(camera);
        if (s.z > 1 || Math.abs(s.x) > 1.1 || Math.abs(s.y) > 1.1) continue;
        plates.push({ id: n.p.v.id, name: n.p.v.name, title: n.p.v.title, x: (s.x * 0.5 + 0.5) * this.root.clientWidth, y: (-s.y * 0.5 + 0.5) * this.root.clientHeight, k: Math.min(1, (4.2 - n.d) / 1.2) });
      }
      this.hud.setPlates(plates);
    }
    const noise = R.noiseLevel(p.speed, { sneaking: p.sneaking, airborne: !p.grounded });
    const head = p.pos.clone().add(V(0, 1.25, 0));
    const ev = this.fauna.update(dt, {
      player: menu ? { x: p.pos.x, z: p.pos.z, yaw: p.yaw, speed: 0, noise: 0, sneaking: true } : { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, speed: p.speed, noise, sneaking: p.sneaking, floating: p.floating },
      hour: this.hour,
      calm: R.hasAbility(this.state, 'calm'),
      camera,
      look: head,
      breath,
      breathLen: this.trust?.breath
    });
    if (!menu) this.creatureEvents(ev);
    if (!menu) this.abilities(dt);
    for (const s of this.world.forage.update(dt)) void s;
  }

  creatureEvents(evs) {
    const p = this.player.pos;
    for (const e of evs) {
      const w = e.w;
      if (!w && !e.t) continue;
      const d = w ? Math.hypot(w.brain.x - p.x, w.brain.z - p.z) : 0;
      switch (e.type) {
        case 'startle':
          w.body.emote('alarm', 1.2);
          if (d < 30) this.sound.voice(w.species, 'alarm', d);
          if (d < 25 && !this._startleHint && !this.player.sneaking) {
            this._startleHint = true;
            this.hud?.toast('Too loud! Creep up quietly — hold <kbd>Ctrl</kbd> (or 🐾).', 4);
          }
          break;
        case 'curious':
          w.body.emote('curious', 1.4);
          if (d < 20) this.sound.voice(w.species, 'hi', d);
          break;
        case 'eat': {
          const t = this.fauna.treats.find((x) => x.id === e.id);
          if (t) this.fauna.removeTreat(t);
          this.sound.crunch();
          R.learn(this.state, w.species, e.treat);
          const name = R.SPECIES[w.species].name;
          if (e.reaction === 'love') {
            w.body.emote('love', 1.8);
            w.body.cheer(1.2);
            this.heartBurst(w.body.headWorld(V()), 8);
            this.sound.voice(w.species, 'happy', d);
            this.hud?.toast(`The ${name} loves ${R.TREATS[e.treat].name}!`);
          } else if (e.reaction === 'like') {
            w.body.emote('like', 1.5);
            this.sound.voice(w.species, 'hi', d);
            this.hud?.toast(`The ${name} likes ${R.TREATS[e.treat].name}.`);
          } else {
            w.body.emote('dislike', 1.5);
            w.body.shake(0.9);
            this.sound.voice(w.species, 'no', d);
            this.hud?.toast(`The ${name} won't eat ${R.TREATS[e.treat].name}.`);
          }
          this.saveSoon();
          break;
        }
        case 'ready':
          w.body.emote('ready', 2);
          this.hud?.toast(`The ${R.SPECIES[w.species].name} trusts you. Go close and press <kbd>E</kbd> to breathe with it.`, 4.5);
          break;
        case 'land':
          if (e.t && e.t.mesh.position.distanceTo(p) < 30) this.sound.plop();
          break;
        case 'splash':
          this.sound.splash();
          break;
        default:
          break;
      }
    }
  }

  /** What your friends do for you. */
  abilities(dt) {
    const p = this.player.pos;
    const st = this.state;
    // Seen: a wild creature in view and near enough to make out joins the journal.
    if ((this._seenT = (this._seenT ?? 0) - dt) < 0) {
      this._seenT = 0.5;
      for (const w of this.fauna.wild) {
        if (!w.brain.present || st.seen.includes(w.species)) continue;
        const d = Math.hypot(w.brain.x - p.x, w.brain.z - p.z);
        if (d > 22) continue;
        const s = w.body.group.position.clone().add(V(0, 0.5, 0)).project(this.camera);
        if (s.z < 1 && Math.abs(s.x) < 0.95 && Math.abs(s.y) < 0.95) {
          R.see(st, w.species);
          this.hud?.toast(`New in your journal: <b>${R.SPECIES[w.species].name}</b> — ${R.SPECIES[w.species].habitat}`, 3.5);
          this.saveSoon();
        }
      }
    }
    // A Tuftlet's nose: caches within 24 m sparkle and show on the map.
    const sniffer = this.fauna.friends.find((f) => f.species === 'tuftlet');
    if (sniffer && (this._sniffT = (this._sniffT ?? 0) - dt) < 0) {
      this._sniffT = 1.5;
      for (const c of this.world.caches.list) {
        if (c.found || c.dug || Math.hypot(c.x - p.x, c.z - p.z) > 24) continue;
        c.found = true;
        c.mesh.visible = true;
        sniffer.brain.doAt(c.x + 0.8, c.z + 0.8, 'sniff', () => sniffer.body.cheer(1));
        this.hud?.toast(`${sniffer.name} smells something buried nearby!`);
        this.sound.voice('tuftlet', 'happy', 4);
        break;
      }
    }
    if ((this._sparkT = (this._sparkT ?? 0) - dt) < 0) {
      this._sparkT = 0.25;
      for (const c of this.world.caches.list) if (c.found && !c.dug && Math.hypot(c.x - p.x, c.z - p.z) < 50) this.vfx.burst(V(c.x + (Math.random() - 0.5) * 0.6, groundAt(c.x, c.z) + 0.2, c.z + (Math.random() - 0.5) * 0.6), 1, [2.6, 2.2, 0.8], { speed: 0.5, life: 1.0, size: 0.07, gravity: -1.5, up: 1.5 });
    }
    // Friends notice the world: a wild creature nearby (one of their own kind is a joy), water an Emberkit won't touch, the dark a Lumoth loves.
    if (this.fauna.friends.length && (this._reactT = (this._reactT ?? 5) - dt) < 0) {
      this._reactT = 4 + Math.random() * 5;
      const f = this.fauna.friends[Math.floor(Math.random() * this.fauna.friends.length)];
      const w = this.fauna.nearest(f.brain.x, f.brain.z, 12);
      const darkNow = THREE.MathUtils.smoothstep(Math.abs(((this.hour - 12 + 24) % 24) - 12), 4.8, 6.6);
      if (w) {
        f.body.emote(w.species === f.species ? 'love' : 'curious', 1.4);
        this.sound.voice(f.species, 'hi', 7);
      } else if (f.species === 'emberkit' && depthAt(f.brain.x, f.brain.z) > 0.03) {
        f.body.emote('dislike', 1.2);
        f.body.shake(0.6);
        this.vfx.smokeAt(f.body.group.position.clone().add(V(0, 0.2, 0)), 4, [0.85, 0.85, 0.88], { size: 0.25, grow: 1, life: 1, speed: 0.3, up: 1, alpha: 0.35 });
      } else if (f.species === 'lumoth' && darkNow > 0.6) f.body.emote('like', 1.2);
      else if (Math.random() < 0.35) {
        f.body.hop();
        f.body.emote('like', 1.1);
      }
    }
    // A Lumoth's glow at night, and its guiding toward creatures you haven't met.
    const moth = this.fauna.friends.find((f) => f.species === 'lumoth');
    const dark = THREE.MathUtils.smoothstep(Math.abs(((this.hour - 12 + 24) % 24) - 12), 4.8, 6.6);
    if (moth) {
      this.lumoLight.position.copy(moth.body.headWorld(V()));
      this.lumoLight.intensity = 3 + dark * 9;
      if ((this._guideT = (this._guideT ?? 0) - dt) < 0) {
        this._guideT = 2;
        let best = null;
        let bd = 1e9;
        for (const w of this.fauna.wild) {
          if (!w.brain.present || st.befriended.includes(w.species)) continue;
          const d = Math.hypot(w.brain.x - p.x, w.brain.z - p.z);
          const k = d * (st.seen.includes(w.species) ? 1.6 : 1);
          if (k < bd) {
            bd = k;
            best = w;
          }
        }
        this.guide = best ? { x: best.brain.x, z: best.brain.z } : null;
      }
    } else {
      this.lumoLight.intensity = 0;
      this.guide = null;
    }
  }

  hudFrame(dt) {
    const p = this.player.pos;
    const sd = streamDistance(p.x, p.z).d;
    const area = areaAt(p.x, p.z, sd);
    if (area !== this.area) {
      const first = this.area === null;
      this.area = area;
      const a = AREAS.find((x) => x.id === area);
      if (a && !first) this.hud.banner(a.name, a.sub, 3.5);
    }
    // The prompt.
    let prompt = null;
    if (!this.trust && !this.panel) {
      const what = this.nearInteract();
      const door = portalNear(this.zone, p.x, p.z, 5);
      if (what) prompt = `${this.touch ? '✋' : '<kbd>E</kbd>'} ${what.label}`;
      else if (door) prompt = `${door.portal.name} — to ${this.zones.zone(door.portal.to)?.name}`;
      else if (this.player.sneaking) prompt = '🐾 Creeping quietly';
    }
    this.hud.prompt(prompt);
    this.hud.update(dt);
    // The minimap, every other frame.
    if ((this._mm = !this._mm)) {
      const dots = [...MAP_POIS];
      for (const f of this.fauna.friends) dots.push({ x: f.brain.x, z: f.brain.z, kind: 'friend', color: R.SPECIES[f.species].color });
      for (const w of this.fauna.wild) {
        if (!w.brain.present || !this.state.seen.includes(w.species)) continue;
        if (Math.hypot(w.brain.x - p.x, w.brain.z - p.z) < 45) dots.push({ x: w.brain.x, z: w.brain.z, kind: 'wild', color: R.SPECIES[w.species].color });
      }
      for (const c of this.world.caches.list) if (c.found && !c.dug) dots.push({ x: c.x, z: c.z, kind: 'cache' });
      STONE_LANTERNS.forEach(([x, z], i) => dots.push({ x, z, kind: 'lantern', lit: this.state.lanterns.includes(i) }));
      if (this.guide) dots.push({ x: this.guide.x, z: this.guide.z, kind: 'guide' });
      if (this.waypoint?.point) dots.push({ x: this.waypoint.point.x, z: this.waypoint.point.z, kind: 'pin' });
      this.hud.minimap.draw({ x: p.x, z: p.z, yaw: this.player.yaw, stream: sd }, this.follow.heading(), dots);
    }
    if (this.debug && (this._st = (this._st ?? 0) + dt) > 0.5) {
      this._st = 0;
      const s = this.post.stats ?? {};
      this.hud.setStats(`${this.fps} fps  draws ${s.calls}  tris ${((s.triangles ?? 0) / 1e6).toFixed(2)}M  tier ${this.tier}  res ${this.resTier}  hour ${this.hour.toFixed(1)}\n${this.power.debugLine()}\npos ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    }
  }

  /* ================================================================ saving */

  saveSoon() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 800);
  }

  saveNow() {
    clearTimeout(this._saveTimer);
    if (this.params.has('nosave')) return;
    this.state.look = this.picked;
    store.save(this.state);
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

  /** Put yourself somewhere, facing `yaw`, the camera behind. */
  teleport(x, z, yaw = 0, { pitch = 0.12, dist = 4.4 } = {}) {
    this.player.place(x, z, yaw);
    this.follow.yaw = yaw + Math.PI;
    this.follow.pitch = pitch;
    this.follow.wantDist = this.follow.dist = this.follow.cur = dist;
    this.follow.pivot.set(0, 0, 0);
    for (const f of this.fauna.friends) {
      f.brain.x = x - Math.sin(yaw) * 2 + (Math.random() - 0.5) * 2;
      f.brain.z = z - Math.cos(yaw) * 2 + (Math.random() - 0.5) * 2;
    }
    this.follow.update(0.016, this.player, {});
  }

  /** The cover: running out through the gate toward the hills, a Tuftlet at your heels. */
  coverShot() {
    if (!this.fauna.friends.length) this.befriendNow('tuftlet', 'Sprig');
    this.teleport(0.5, -93.5, 0, { pitch: 0.12, dist: 3.5 });
    this.coverRun = 0.55;
  }

  /** Lantern Valley in the village and at dusk, Sunlit Meadow out in the valley by day. */
  musicArea() {
    const p = this.player.pos;
    return kithvaleTrack({ village: inVillage(p.x, p.z), dusk: this._dusk ?? duskAt(this.hour) });
  }

  /** The wild creature of a species nearest its first home (for shots and tests). */
  wildOf(species) {
    return this.fauna.wild.find((w) => w.species === species);
  }

  /** Befriend a species at once (for tests and shots): it joins as if the trust moment went well. */
  befriendNow(species, name = null) {
    let w = this.wildOf(species);
    if (!w) w = this.fauna.spawn(species, HABITATS[species].homes[0], 8, 999);
    const friend = R.befriend(this.state, { species, name: name ?? R.pickName(species, this.state.friends.map((f) => f.name)), uid: `k${Math.random().toString(36).slice(2, 8)}` });
    this.fauna.befriend(w, { uid: friend.uid, name: friend.name, follow: friend.follow });
    this.music?.cue('discovery');
    this.refreshHud();
    return friend;
  }
}
