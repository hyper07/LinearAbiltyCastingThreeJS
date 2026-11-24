/**
 * Snowpuff Peaks — a cute, fast snowboard race for kids. Pick a plush rider
 * and a mountain, then race the others down: carve, tuck, jump the kickers,
 * spin and flip, open gift boxes, bonk rivals with snowballs and giant
 * snowballs, shove and draft, burst snowmen and ring bells. Alone against
 * computer riders, or with up to three friends in a room (net.js).
 *
 *   const game = new SnowpuffGame(document.body, { onClose });
 *   await game.open();   …   game.close();
 *
 * Rendering is WebGPURenderer + TSL node materials throughout (render/), with
 * its own WebGL2 fallback. The rules are pure modules (course, physics,
 * race, ai, netproto) shared by the tests. URL options: ?quality=high|medium|low,
 * ?debug (frame time), ?touch (touch controls), ?webgl (force the WebGL2 backend).
 */
import * as THREE from 'three/webgpu';
import '@fontsource-variable/nunito/wght.css';
import './snowpuff.css';
import { PowerLoop } from '../shared/power.js';
import { HelpPanel, helpButton, codesFor } from '../shared/helpPanel.js';
import { GameMusic } from '../shared/gameMusic.js';
import { CONTROLS } from './controls.js';
import { MOUNTAINS, mountainById } from './mountains.js';
import { SPECIES, SELECTABLE, ALL_SPECIES } from './riders.js';
import { buildCourse, frameAt, groundAt, toWorld, rng, cleanMode } from './course.js';
import { placeGeysers } from './landmarks.js';
import { newRider, step, settle, SLIP } from './physics.js';
import { separate, newRacer, standings, rubberBand, checkFinish, pickups, pickTarget, canThrow, makeThrow, hittable, applyHit, tickRacer, flyProjectile, projectilePos, estimateFinish, checkLap, tickLift, LIFT, LIFT_SKIP, useSlot, giveItem, newGiant, rollGiant, giantHits, applyBowl, GIANT_LIFE, dropIce, meltIce, draftFactor } from './race.js';
import { newBrain, think } from './ai.js';
import { makeRenderer, Pipeline, TIERS, TIER_ORDER, backendName } from './render/pipeline.js';
import { Sky, distantPeaks } from './render/sky.js';
import { SnowTrails } from './render/snow.js';
import { RiderModel } from './render/riderModel.js';
import { instance } from './render/models.js';
import { World } from './world.js';
import { Effects } from './fx.js';
import { SnowSound } from './audio.js';
import { Stage } from './stage.js';
import { Hud, Menus, Loading, TouchControls, el } from './hud.js';
import { OnlineRace } from './net.js';
import { SideMirror } from './sideMirror.js';
import { cleanName, randomName } from './names.js';
import { loadGoggles, saveGoggles, randomGoggle, cleanGoggle } from './goggleList.js';
import { goggleRack } from './render/goggles.js';
import { loadBoard, saveBoard, randomBoard, cleanBoard, boardInfo } from './boardList.js';
import { boardRack } from './render/boards.js';

const SAVE_KEY = 'snowpuff.save';
const ITEM_NAMES = { snowballs: 'Snowballs!', giant: 'Giant snowball!', shield: 'Snow shield!', boost: 'Rocket sled!', ice: 'Ice patch!' };
const STEP = 1 / 120;
const VIS_KEYS = ['s', 'lat', 'y', 'yaw', 'head', 'spin', 'flip', 'edge', 'latAcc', 'compress', 'tuck', 'charge', 'speed', 'carve', 'skid', 'vy'];
/** Keep a racer's state before a physics step (for drawing in between). */
function snap(rc) {
  const p = (rc.prevState ??= {});
  for (const k of VIS_KEYS) p[k] = rc.rider[k] ?? 0;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
    return { rider: SELECTABLE.includes(s.rider) ? s.rider : 'fox', mountain: MOUNTAINS.some((m) => m.id === s.mountain) ? s.mountain : 'marshmallow', best: s.best ?? {}, quality: s.quality ?? 'auto', sound: s.sound !== false, name: s.name ?? '', length: cleanMode(s.length) };
  } catch {
    return { rider: 'fox', mountain: 'marshmallow', best: {}, quality: 'auto', sound: true, name: '', length: 'quick' };
  }
}

/* ---------------------------------------------------------------- input */

class Input {
  constructor(root) {
    this.root = root;
    this.keys = new Set();
    this.pressed = new Set();
    this.touch = {};
    this.touchSteer = 0;
    this.touchFlip = 0;
    this.codes = {};
    for (const g of CONTROLS.groups) for (const r of g.rows) this.codes[r.id] = codesFor(CONTROLS, r.id);
    this.down = (e) => {
      if (e.target?.tagName === 'INPUT') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this.up = (e) => this.keys.delete(e.code);
    this.blur = () => this.keys.clear();
    this.mouse = (e) => {
      if (e.button === 0 && e.target?.classList?.contains('sp-view')) this.pressed.add('throw');
    };
    root.addEventListener('keydown', this.down);
    root.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
    root.addEventListener('pointerdown', this.mouse);
  }

  held(id) {
    return this.codes[id].some((c) => this.keys.has(c));
  }

  hit(id) {
    return this.codes[id].some((c) => this.pressed.has(c));
  }

  pad() {
    const p = navigator.getGamepads?.()?.find?.((g) => g && g.connected);
    if (!p) return null;
    const b = (i) => Boolean(p.buttons[i]?.pressed);
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    const now = { a: b(0), x: b(2), y: b(3), start: b(9), rt: b(7) };
    const was = this.padWas ?? {};
    this.padWas = now;
    return { steer: dz(p.axes[0] ?? 0), flip: -dz(p.axes[1] ?? 0), jump: now.a, tuck: now.rt, throw: now.x && !was.x, shield: now.y && !was.y, pause: now.start && !was.start };
  }

  /** This frame's riding input. */
  read() {
    const pad = this.pad();
    const L = this.held('steer') && (this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const R = this.held('steer') && (this.keys.has('KeyD') || this.keys.has('ArrowRight'));
    let steer = (R ? 1 : 0) - (L ? 1 : 0) + this.touchSteer + (pad?.steer ?? 0);
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const flip = (up ? 1 : 0) - (down ? 1 : 0) + this.touchFlip + (pad?.flip ?? 0);
    return {
      steer: clamp(steer, -1, 1),
      flip: clamp(flip, -1, 1),
      tuck: this.held('tuck') || Boolean(this.touch.tuck) || Boolean(pad?.tuck),
      jump: this.held('jump') || Boolean(this.touch.jump) || Boolean(pad?.jump),
      throw: this.hit('item1') || this.pressed.has('throw') || Boolean(pad?.throw),
      shield: this.hit('item2') || this.pressed.has('item2') || Boolean(pad?.shield),
      skip: this.hit('jump') || this.pressed.has('throw') || Boolean(this.touch.jump),
      help: this.hit('help'),
      pause: this.hit('pause') || Boolean(pad?.pause)
    };
  }

  endFrame() {
    this.pressed.clear();
  }

  dispose() {
    this.root.removeEventListener('keydown', this.down);
    this.root.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.blur);
    this.root.removeEventListener('pointerdown', this.mouse);
  }
}

/* ---------------------------------------------------------------- the game */

export class SnowpuffGame {
  constructor(host, { onClose, account } = {}) {
    this.host = host ?? document.body;
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'sp');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Snowpuff Peaks');
    this.host.append(this.root);
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('debug');
    this.touch = (window.matchMedia?.('(pointer: coarse)').matches ?? false) || this.params.has('touch');
    if (this.touch) this.root.classList.add('touch');
    this.save = loadSave();
    this.picked = this.save.rider;
    this.goggles = loadGoggles();
    this.boardId = loadBoard();
    this.mountainId = this.save.mountain;
    this.mode = 'loading';
    this.screen = 'title';
    this.sound = new SnowSound();
    this.sound.setVolume(this.save.sound ? 0.8 : 0);
    this.time = 0;
    window.snowpuff = this;
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ rider: this.picked, mountain: this.mountainId, best: this.save.best, quality: this.save.quality, sound: this.save.sound, name: this.save.name, length: this.save.length }));
    } catch {
      /* private mode */
    }
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const step = (l, k) => this.loading?.set(l, k);
    step('Waking up the snow…', 0.05);
    const t0 = performance.now();
    this.renderer = await makeRenderer(this.root, { forceWebGL: this.params.has('webgl') });
    if (this.closed) return;
    this.backend = backendName(this.renderer);
    const q = this.params.get('quality') ?? this.save.quality;
    this.tierName = TIERS[q] ? q : 'high';
    this.autoTier = !TIERS[q];
    this.tier = TIERS[this.tierName];
    step('Sculpting the plush riders…', 0.15);
    await new Promise((r) => setTimeout(r, 0));
    this.stage = new Stage(this.renderer, { fur: this.tier.fur });
    await this.stage.build();
    if (this.closed) return;
    this.stagePipe = new Pipeline(this.renderer, this.stage.scene, this.stage.camera, this.tier);
    this.stagePipe.setGrade({ saturation: 1.08, warm: [1.02, 1, 0.98], cool: [0.97, 0.99, 1.04], vignette: 0.22, exposure: 1 });
    this.stage.pick(this.picked);
    this.stage.setGoggles(this.goggles);
    this.stage.setBoard(this.boardId);
    this.stage.setMountain(this.mountainId);
    step('Warming up the paint…', 0.7);
    this.resize();
    // every pair of goggles drawn once now, so trying them on never hitches
    const rack = goggleRack();
    rack.add(boardRack());
    rack.position.copy(this.stage.camera.position).add(new THREE.Vector3(0, -0.3, -4).applyQuaternion(this.stage.camera.quaternion));
    rack.quaternion.copy(this.stage.camera.quaternion);
    this.stage.scene.add(rack);
    try {
      await this.renderer.compileAsync(this.stage.scene, this.stage.camera);
    } catch {
      /* compiled on first frame instead */
    }
    this.stagePipe.render();
    await new Promise((r) => requestAnimationFrame(() => r()));
    this.stagePipe.render();
    rack.removeFromParent();
    rack.traverse((o) => o.isMesh && o.geometry.dispose());
    this.input = new Input(this.root);
    this.hud = new Hud(this.root, { touch: this.touch });
    this.hud.onUse = (i) => this.input.pressed.add(i ? 'item2' : 'throw');
    this.menus = new Menus(this.root, this);
    this.help = new HelpPanel({
      host: this.root,
      id: 'snowpuff',
      table: CONTROLS,
      onOpen: () => {
        if (this.mode === 'help') return;
        this._helpFrom = this.mode;
        this.mode = 'help';
      },
      onClose: () => {
        const back = this._helpFrom ?? 'race';
        this.mode = back === 'pause' ? 'race' : back;
        if (back === 'pause') this.menus.clear();
        this.root.focus({ preventScroll: true });
      }
    });
    this.helpBtn = helpButton(this.root, () => this.openHelp(), { style: 'top:auto;bottom:14px;left:14px;width:42px;height:42px;font-size:20px' });
    this.helpBtn.style.display = 'none';
    if (this.touch) {
      this.touchUi = new TouchControls(this.root, this.input);
      this.touchUi.show(false);
    }
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.loadMs = Math.round(performance.now() - t0);
    this.music = new GameMusic('snowpuff', { muted: () => !this.save.sound });
    this.music.jump('playful');
    let last = performance.now();
    let frames = 0, acc = 0;
    this.loop = new PowerLoop((ms, now) => {
      const raw = Math.max(0, Math.min(100, now - last));
      last = now;
      this.frame(Math.min(0.05, raw / 1000));
      frames++;
      acc += raw;
      if (acc > 500) {
        this.fps = Math.round((frames * 1000) / acc);
        this.frameMs = +(acc / frames).toFixed(1);
        frames = 0;
        acc = 0;
      }
    }, { fps: 60 }).start();
    this.loading.hide();
    this.loading = null;
    this.loadingEl = new Loading(this.root);
    this.loadingEl.el.style.display = 'none';
    this.showTitle();
    this.root.focus({ preventScroll: true });
    const wake = () => this.sound.wake();
    this.root.addEventListener('pointerdown', wake);
    this.root.addEventListener('keydown', wake);
    this.ready = true;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.mirror?.dispose();
    this.music?.dispose();
    this.loop?.stop();
    this._resize?.disconnect();
    this.input?.dispose();
    this.touchUi?.dispose();
    this.hud?.dispose();
    this.help?.dispose();
    this.net?.close();
    this.disposeRace();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.snowpuff === this) delete window.snowpuff;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || innerWidth;
    const h = this.root.clientHeight || innerHeight;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(devicePixelRatio || 1, this.tier.dpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  setTier(name) {
    this.tierName = name;
    this.tier = TIERS[name];
    this.resize();
    this.stagePipe?.setTier(this.tier);
    this.pipe?.setTier(this.tier);
    this.sky?.setShadowSize(this.tier.shadow);
  }

  cycleQuality() {
    const order = ['auto', 'high', 'medium', 'low'];
    const next = order[(order.indexOf(this.save.quality) + 1) % order.length];
    this.save.quality = next;
    this.autoTier = next === 'auto';
    if (next !== 'auto') this.setTier(next);
    this.persist();
    return next === 'auto' ? `auto (${this.tierName})` : next;
  }

  toggleSound() {
    this.save.sound = !this.save.sound;
    this.sound.setVolume(this.save.sound ? 0.8 : 0);
    this.persist();
    return this.save.sound;
  }

  /* ================================================================ menus */

  showTitle() {
    this.mode = 'menu';
    this.screen = 'title';
    this.stage.focus('title');
    this.hud.show(false);
    this.helpBtn.style.display = 'none';
    this.menus.title({
      onRace: () => this.showRiders(),
      onFriends: () => this.showLobby(),
      onHelp: () => this.help.open(),
      onCredits: () => this.menus.credits(),
      onLeave: () => this.close(),
      quality: this.save.quality === 'auto' ? `auto (${this.tierName})` : this.save.quality,
      onQuality: () => this.cycleQuality(),
      soundOn: this.save.sound,
      onSound: () => this.toggleSound()
    });
  }

  /** Your nickname (cleaned; your rider's name until you pick one). */
  nickname() {
    return cleanName(this.save.name, SPECIES[this.picked].name);
  }

  setNickname(raw) {
    const clean = String(raw ?? '').trim() ? cleanName(raw, '') : '';
    this.save.name = clean;
    this.persist();
    this.net?.setName(this.nickname());
    return clean;
  }

  showRiders(after = () => this.showMountains()) {
    this.mode = 'menu';
    this.screen = 'riders';
    this.stage.focus('riders');
    this.menus.riders({
      name: this.save.name,
      onName: (v) => this.setNickname(v),
      onDice: () => this.setNickname(randomName()),
      goggles: this.goggles,
      onGoggles: (id) => this.pickGoggles(id),
      board: this.boardId,
      onBoard: (id) => this.pickBoard(id),
      picked: this.picked,
      onPick: (id) => {
        this.picked = id;
        this.stage.pick(id);
        this.net?.setSpecies(id);
        this.persist();
      },
      onNext: after,
      onBack: () => (this.net?.active ? this.showLobby() : this.showTitle())
    });
  }

  /** Try on a pair: on the turntable at once, remembered on this device, sent to the room. */
  pickGoggles(id) {
    this.goggles = cleanGoggle(id);
    saveGoggles(this.goggles);
    this.stage.setGoggles(this.goggles, true);
    this.net?.setGoggles(this.goggles);
    this.sound.tryOn?.();
    return this.goggles;
  }

  /** Swap boards (cosmetic only): the rider hops and the new one slides in. */
  pickBoard(id) {
    this.boardId = cleanBoard(id);
    saveBoard(this.boardId);
    this.stage.setBoard(this.boardId, true);
    this.net?.setBoard(this.boardId);
    this.sound.boardSwap?.();
    return this.boardId;
  }

  showMountains() {
    this.mode = 'menu';
    this.screen = 'mountains';
    this.stage.focus('mountains');
    this.menus.mountains({
      picked: this.mountainId,
      best: this.save.best,
      board: this.boardId,
      onPick: (id) => {
        this.mountainId = id;
        this.stage.setMountain(id);
        this.persist();
      },
      mode: this.save.length,
      onMode: (k) => {
        this.save.length = cleanMode(k);
        this.persist();
        return this.save.length;
      },
      onGo: () => this.startRace({ mountain: this.mountainId }),
      onBack: () => this.showRiders()
    });
  }

  showLobby() {
    this.mode = 'menu';
    this.screen = 'lobby';
    this.stage.focus('lobby');
    this.net ??= new OnlineRace({
      name: this.nickname(),
      species: this.picked,
      goggles: this.goggles,
      board: this.boardId,
      onChange: () => this.screen === 'lobby' && this.mode === 'menu' && this.renderLobby(),
      onGo: (g) => this.startRace({ mountain: g.mountain, mode: g.mode, slots: g.slots, online: true }),
      onMessage: (m) => this.netMessage(m),
      onClosed: () => this.netClosed()
    });
    this.renderLobby();
  }

  renderLobby() {
    const n = this.net;
    this.menus.lobby(n.state(), {
      onCreate: () => n.create(),
      onJoin: (code) => n.join(code),
      onStart: () => {
        const total = Math.max(n.members.size, mountainById(n.mountain).rivals + 1);
        const slots = n.start(total);
        this.startRace({ mountain: n.mountain, mode: n.mode, slots, online: true });
      },
      onBack: () => {
        if (n.active) n.leave();
        else this.showTitle();
      },
      onMountain: (id) => n.setMountain(id),
      onMode: (k) => n.setMode(k)
    });
    this.stage.pick(this.picked);
  }

  openHelp() {
    if (this.help.isOpen) return;
    this.help.open();
  }

  /** e2e and the cover: start a race at once with the saved rider and mountain. */
  begin() {
    return this.startRace({ mountain: this.mountainId });
  }

  /* ================================================================ the race */

  disposeRace() {
    if (!this.race) return;
    this.world?.dispose();
    this.trails?.dispose();
    this.pipe?.dispose();
    this.race = null;
    this.scene = null;
    this.world = null;
  }

  async startRace({ mountain, mode = this.save.length, slots = null, online = false }) {
    if (this.mode === 'loading') return;
    this.sound.wake();
    this.mode = 'loading';
    this.menus.clear();
    this.loadingEl.show('Building the mountain…');
    const m = mountainById(mountain);
    this.mountainId = m.id;
    this.disposeRace();
    await new Promise((r) => setTimeout(r, 30));
    const course = buildCourse(m, { mode: cleanMode(mode) });
    // Yellowstone's geysers: on the run, on a timer (deterministic, so every player has the same ones)
    course.geysers = placeGeysers(course, m);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, this.w / this.h, 0.25, m.peak ? 7000 : 5200);
    this.camera = camera;
    this.scene = scene;
    const sky = new Sky(scene, m, course);
    this.sky = sky;
    sky.setShadowSize(this.tier.shadow);
    this.loadingEl.set('Lighting the sky…', 0.05);
    await sky.environment(this.renderer);
    const trails = this.tier.trails && !this.params.has('notrails') ? new SnowTrails(this.renderer) : null;
    this.trails = trails;
    const world = new World({ scene, course, mountain: m, tier: this.tier, trails, sky });
    this.world = world;
    world.camera = camera;
    await world.build((l, k) => this.loadingEl.set(l, 0.1 + k * 0.7));
    scene.add(distantPeaks(course, m, rng(m.seed + 1)));
    this.fx = new Effects(scene, { scale: this.tier.particles });
    // the riders
    this.loadingEl.set('Lining up the riders…', 0.85);
    await new Promise((r) => setTimeout(r, 0));
    const mySlot = online ? this.net.mySlot() : 0;
    if (!slots) {
      const others = ALL_SPECIES.filter((s) => s !== this.picked);
      const kinds = ['careful', 'reckless', 'thrower', 'careful', 'reckless'];
      slots = [{ slot: 0, id: 'me', name: this.nickname(), species: this.picked, goggles: this.goggles, board: this.boardId, human: true }];
      for (let i = 0; i < m.rivals; i++) slots.push({ slot: i + 1, id: `ai${i + 1}`, name: null, species: others[i % others.length], goggles: randomGoggle(), board: randomBoard(), human: false, kind: kinds[i] });
    }
    const rand = rng(course.seed + 99);
    const n = slots.length;
    const racers = slots.map((sl, i) => {
      const lat = (i - (n - 1) / 2) * Math.min(2.8, (frameAt(course, 6).width * 1.6) / n);
      const rider = newRider({ s: 6 - (i % 2) * 2.5, lat });
      settle(rider, course);
      const name = sl.name ?? SPECIES[sl.species].name;
      const r = newRacer({ slot: sl.slot, id: sl.id, name, species: sl.species, human: sl.human, rider });
      r.me = sl.slot === mySlot;
      r.local = r.me || (!sl.human && (!online || this.net.isHost));
      r.remote = !r.local;
      if (!sl.human) r.brain = newBrain(sl.kind ?? 'careful', rand);
      const fur = r.me ? this.tier.fur : this.tier.rivalFur;
      r.goggles = r.me ? this.goggles : cleanGoggle(sl.goggles);
      r.board = r.me ? this.boardId : cleanBoard(sl.board);
      r.model = new RiderModel(sl.species, { fur, res: r.me ? 110 : 90, goggles: r.goggles, board: r.board, label: name });
      scene.add(r.model.root);
      r.shieldMesh = this.fx.shieldMesh();
      r.model.root.add(r.shieldMesh);
      r.shieldMesh.position.y = 0.6;
      r.prev = { s: rider.s, lat: rider.lat };
      r.pos = { x: 0, y: 0, z: 0 };
      r.last = {};
      return r;
    });
    this.me = racers.find((r) => r.me);
    this.racers = racers;
    this.race = { course, mountain: m, online, clock: 0, count: 3.2, projectiles: [], giants: [], dumps: [], pid: 0, finishedAt: null, results: null, finAt: new Map(), passT: 0, shake: 0, fov: 60, camPos: null, camLook: new THREE.Vector3(), passed: new Set() };
    this.hud.start(racers, course, this.me.slot);
    // the post chain
    this.pipe = new Pipeline(this.renderer, scene, camera, this.tier);
    this.pipe.setGrade(m.grade);
    this.updateRiders(0);
    this.placeCamera(0, true);
    this.loadingEl.set('Warming up…', 0.92);
    try {
      await this.renderer.compileAsync(scene, camera);
    } catch {
      /* first frames compile */
    }
    await this.warmUp();
    if (this.closed) return;
    this.loadingEl.hide();
    this.hud.show(true);
    this.helpBtn.style.display = '';
    this.touchUi?.show(true);
    this.music.jump(m.music ?? 'playful');
    this.mode = 'countdown';
    this.race.countN = 4;
    // the key hint shows for the first race's opening seconds only
    const hint = this.root.querySelector('.sp-hint');
    if (hint) {
      hint.style.display = this.racesRun ? 'none' : '';
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => (hint.style.display = 'none'), 6000);
    }
    this.racesRun = (this.racesRun ?? 0) + 1;
    this.probe = { t: 0, frames: 0, acc: 0 };
    this.root.focus({ preventScroll: true });
    // How to play, the first time (it holds the countdown while it's up)
    if (!online) this.help.openFirstTime();
  }

  /**
   * Draw everything once behind the loading card — every section, every
   * effect pool, the snowballs and shields, off-screen things too — so no
   * shader or pipeline is first built mid-race (the hitch before a jump was
   * the sparkle and snow-puff pipelines being made on first use).
   */
  async warmUp() {
    const culled = [];
    this.scene.traverse((o) => {
      if ((o.isMesh || o.isPoints) && o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
    const cam = this.camera.position;
    const fx = this.fx;
    // several each: a pool drawn with one particle and with many are different pipelines
    for (const pool of [fx.powder, fx.sparkle, fx.motes, fx.confetti]) for (let i = 0; i < 4; i++) pool.add(cam.x + i * 0.3, cam.y - 0.5, cam.z - 6, 0, 0, 0, { life: 5, size: 0.2 });
    fx.update(0.001);
    fx.balls.forEach((b, i) => {
      b.visible = true;
      b.position.set(cam.x + i * 0.2, cam.y, cam.z - 6);
    });
    for (const rc of this.racers) rc.shieldMesh.visible = true;
    // every pair of goggles (a rival's random pick, or swapped on later) is built and drawn once now
    const rack = goggleRack();
    rack.add(boardRack());
    rack.position.set(cam.x, cam.y - 0.5, cam.z - 5);
    // the chairlift between laps, drawn once now
    if (this.race.course.laps > 1) {
      this.liftChair?.removeFromParent();
      this.liftChair = this.makeLiftChair();
      this.liftChair.position.set(cam.x, cam.y - 1, cam.z - 7);
    }
    this.scene.add(rack);
    // the things made on first use: a giant snowball, a dropped ice patch, a falling clump of snow
    fx.giant(0, cam.x, cam.y - 1, cam.z - 8, 1, 0, 0);
    const c = this.race.course;
    const s0 = this.me.rider.s + 6;
    this.world.syncIce([{ id: 'warm', s: s0, lat: 0, len: 6, w: 4 }]);
    this.world.dropSnow(0, { t: 0.2, landed: false }, { x: cam.x, y: cam.y - 9, z: cam.z - 8 });
    const keepShadow = this.sky.sun.shadow.camera.right;
    // a wide shadow box too, so every caster's shadow pipeline is made now
    // real frames apart: the scene pass draws once per frame, however often it is asked
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    this.sky.follow(new THREE.Vector3(cam.x, cam.y, cam.z), 900);
    await nextFrame();
    this.pipe.render();
    // the rival panel's snapshot camera has its own pipelines (another target, another buffer set)
    this.mirror?.dispose();
    this.mirror = new SideMirror(this.renderer, this.hud.el);
    await nextFrame();
    this.mirror.warm(this.scene, this.camera);
    this.sky.follow(new THREE.Vector3(cam.x, cam.y, cam.z), keepShadow);
    await nextFrame();
    this.pipe.render();
    for (const o of culled) o.frustumCulled = true;
    rack.removeFromParent();
    rack.traverse((o) => o.isMesh && o.geometry.dispose());
    if (this.liftChair) this.liftChair.visible = false;
    fx.clear();
    this.world.syncIce(c.dynIce);
    this.world.dropSnow(-1);
    for (const rc of this.racers) rc.shieldMesh.visible = false;
    await nextFrame();
    this.pipe.render();
  }

  /* ---------------------------------------------------------------- per frame */

  frame(dt) {
    this.time += dt;
    const inp = this.input?.read() ?? {};
    if (this.mode === 'menu' || this.mode === 'loading' && !this.race) {
      if (this.mode === 'menu' && inp.pause) {
        if (this.screen === 'riders') this.showTitle();
        else if (this.screen === 'mountains') this.showRiders();
        else if (this.screen === 'results') this.showMountains();
      }
      this.stage.update(dt, this.w / this.h);
      this.hud?.tags([]);
      this.stagePipe.render();
      this.input?.endFrame();
      return;
    }
    if (!this.race || this.mode === 'loading') {
      this.hud?.tags([]);
      // building or warming up a race: its own code draws behind the loading card
      this.input?.endFrame();
      return;
    }
    if (this.mode === 'results') {
      this.stage.update(dt, this.w / this.h);
      this.podiumTags();
      this.stagePipe.render();
      this.input?.endFrame();
      return;
    }
    const online = this.race.online;
    // help and pause
    if (this.mode === 'help') {
      if (!online) {
        this.renderRace(0);
        this.input.endFrame();
        return;
      }
    } else if (this.mode === 'pause') {
      if (inp.pause) this.resume();
      if (!online) {
        this.renderRace(0);
        this.input.endFrame();
        return;
      }
    } else if ((this.mode === 'race' || this.mode === 'countdown' || this.mode === 'finish') && inp.help) {
      this.openHelp();
    } else if ((this.mode === 'race' || this.mode === 'countdown' || this.mode === 'finish') && inp.pause) {
      this.pause();
    }
    const live = this.mode === 'race' || this.mode === 'finish' || ((this.mode === 'pause' || this.mode === 'help') && online && this.race.started);
    if (this.mode === 'countdown') this.countdown(dt);
    if (live) this.simulate(dt, this.mode === 'race' ? inp : {});
    this.renderRace(dt);
    this.tierProbe(dt);
    this.input.endFrame();
  }

  countdown(dt) {
    const r = this.race;
    r.count -= dt;
    const n = Math.ceil(r.count - 0.2);
    if (n !== r.countN && n <= 3) {
      r.countN = n;
      if (n > 0) {
        this.hud.say(String(n), 'count');
        this.sound.beep(false);
      } else {
        this.hud.say('GO!', 'go');
        this.sound.beep(true);
      }
    }
    // hold still, but let the board settle
    for (const rc of this.racers) {
      settle(rc.rider, r.course);
      snap(rc);
    }
    this.updateRiders(dt);
    if (r.count <= 0) {
      this.mode = 'race';
      r.started = true;
      for (const rc of this.racers) if (rc.local) rc.rider.speed = 4;
    }
  }

  /**
   * Physics at a fixed 120 Hz, whatever the frame rate: the frame's time is cut
   * into equal steps, and drawing interpolates between the last two (vis()),
   * so motion is smooth at 30, 60 or 144 frames a second.
   */
  simulate(dt, inp) {
    const r = this.race;
    r.acc = Math.min(0.25, (r.acc ?? 0) + dt);
    let first = true;
    while (r.acc >= STEP) {
      for (const rc of this.racers) if (rc.local) snap(rc);
      this.tick(STEP, inp, first);
      first = false;
      r.acc -= STEP;
    }
    r.alpha = r.acc / STEP;
    for (const rc of this.racers) if (!rc.local) {
      this.applyRemote(rc);
      snap(rc);
    }
    // online: send states; the host closes the race
    if (r.online && this.net?.active) {
      this.net.tick(dt, this.me, this.racers.filter((x) => x.local && !x.human));
      if (this.net.isHost) this.hostFinishCheck();
    }
    if (!r.online) this.localFinishCheck();
  }

  tick(dt, inp, first) {
    const r = this.race;
    const c = r.course;
    r.clock += dt;
    const me = this.me;
    const online = r.online;
    const order = standings(this.racers);
    const placeOf = (rc) => (this.racers.length > 1 ? order.indexOf(rc) / (this.racers.length - 1) : 0.5);
    // ---- you
    if (me.liftT > 0) {
      // on the chairlift between laps (Space or a tap skips it after a few seconds)
      if (tickLift(me, dt, Boolean(first && inp.skip))) this.respawn(me);
    } else if (!me.finished) {
      const ev = step(me.rider, { steer: inp.steer ?? 0, tuck: inp.tuck, jump: inp.jump, flip: inp.flip ?? 0 }, c, dt, { draft: draftFactor(me, this.racers), geysers: c.geysers, t: r.clock });
      this.riderEvents(me, ev);
      if (first && inp.throw) this.useItem(me, 0);
      if (first && inp.shield) this.useItem(me, 1);
      for (const e of pickups(me, c, r.clock, placeOf(me))) this.pickupEvent(me, e);
      if (checkLap(me, c)) this.onLap(me);
      else if (checkFinish(me, c, r.clock)) this.onFinish(me);
    } else {
      step(me.rider, {}, c, dt, { brake: true });
    }
    tickRacer(me, dt);
    // ---- the AI riders I run (single player, or the host)
    const humanS = online ? Math.max(...this.racers.filter((x) => x.human).map((x) => x.rider.s)) : me.rider.s;
    for (const rc of this.racers) {
      if (rc === me || !rc.local) continue;
      if (rc.liftT > 0) {
        if (tickLift(rc, dt)) this.respawn(rc);
        continue;
      }
      if (rc.finished) {
        step(rc.rider, {}, c, dt, { brake: true });
        continue;
      }
      const ai = think(rc.brain, rc, c, this.racers, dt);
      const ev = step(rc.rider, ai, c, dt, { pull: rubberBand(rc.rider.s, humanS), draft: draftFactor(rc, this.racers), geysers: c.geysers, t: r.clock });
      this.riderEvents(rc, ev);
      if (ai.use != null) this.useItem(rc, ai.use);
      for (const e of pickups(rc, c, r.clock, placeOf(rc))) if (e.type === 'gift' && this.near(rc, 40)) this.fx.giftBurst(rc.pos.x, rc.pos.y + 0.8, rc.pos.z);
      tickRacer(rc, dt);
      if (checkLap(rc, c)) this.onLap(rc);
      else if (checkFinish(rc, c, r.clock)) this.onFinish(rc);
    }
    // ---- shoves between riders side by side (the harder carver wins)
    for (const [a, b, winner] of separate(this.racers, (x) => x.local && !x.finished)) {
      const loser = winner === a ? b : a;
      if (this.time - (loser._shoveT ?? 0) < 0.8) continue;
      loser._shoveT = this.time;
      loser.bumps += 1;
      if (this.near(loser, 45)) {
        this.fx.poof((a.pos.x + b.pos.x) / 2, loser.pos.y + 0.3, (a.pos.z + b.pos.z) / 2, { n: 8, size: 0.3, speed: 1.6, up: 1 });
        this.sound.shove(this.near(loser, 12) ? 1 : 0.4);
        loser.model.react('ouch');
        winner.model.react('laugh');
        this.emote(loser, ['Hey!', 'Whoa!', 'Oof!'][Math.floor(Math.random() * 3)]);
        this.emote(winner, 'Hee hee!', 0.25);
      }
      if (loser.me) this.race.shake = Math.max(this.race.shake, 0.25);
    }
    // ---- drafting: wind lines and a word when you tuck in behind someone
    if (me.draftBehind && !me.rider.air) {
      me.draftT = (me.draftT ?? 0) + dt;
      if (me.draftT > 0.6 && !me.draftTold) {
        me.draftTold = true;
        this.hud.say('Drafting!', 'trick');
      }
    } else {
      me.draftT = 0;
      me.draftTold = false;
    }
    // ---- snowballs
    for (let i = r.projectiles.length - 1; i >= 0; i--) {
      const p = r.projectiles[i];
      if (flyProjectile(p, dt) === 'arrived') {
        r.projectiles.splice(i, 1);
        this.arrive(p);
      }
    }
    // ---- giant snowballs: roll on, bowl riders over (only the host decides, online)
    for (let i = r.giants.length - 1; i >= 0; i--) {
      const g = r.giants[i];
      const alive = rollGiant(g, c, dt);
      if (!online || this.net?.isHost) {
        for (const rc of giantHits(g, this.racers, c)) {
          if (online && this.net?.active) this.net.sendHit(g.id, rc.slot, true, 'giant');
          this.resolveBowl(g.from, rc);
        }
      }
      if (!alive) {
        r.giants.splice(i, 1);
        this.giantBurst(g);
      }
    }
    // ---- the mountain: ice melts, chairlift chairs drop snow on Aurora Peak
    meltIce(c, r.clock);
    if (this.world.syncIce) this.world.syncIce(c.dynIce);
    if (r.mountain.id === 'aurora') this.snowDumps(dt);
  }

  /** Is this racer within `d` metres of the camera? */
  near(rc, d) {
    return Math.hypot(rc.pos.x - this.camera.position.x, rc.pos.z - this.camera.position.z) < d;
  }

  /** A little word bubble over a rider (shoves, hits, waves). */
  emote(rc, text, delay = 0) {
    if (!this.near(rc, 30) || rc.liftT > 0 || this.me?.liftT > 0) return;
    setTimeout(() => {
      const at = this.toScreen(rc.pos.x, rc.pos.y + 1.9, rc.pos.z);
      if (at) this.hud.bubble(at[0], at[1], text);
    }, delay * 1000);
  }

  /** Use the item in slot i (key 1 or 2; the AI too). */
  useItem(rc, i) {
    const res = useSlot(rc, i);
    if (!res) return;
    const r = this.race;
    const p = rc.pos;
    if (res.kind === 'snowball') this.tryThrow(rc);
    else if (res.kind === 'giant') {
      const g = newGiant(rc, `${rc.slot}-g${++r.pid}`);
      r.giants.push(g);
      if (r.online && this.net?.active) this.net.sendItem({ k: 'giant', id: g.id, from: rc.slot, s: g.s, lat: g.lat, v: g.v, vl: g.vl });
      if (rc.me) this.hud.say('Giant snowball!', 'trick');
      if (this.near(rc, 50)) this.sound.rumble();
    } else if (res.kind === 'ice') {
      const ice = dropIce(r.course, rc, r.clock, `${rc.slot}-i${++r.pid}`);
      if (r.online && this.net?.active) this.net.sendItem({ k: 'ice', id: ice.id, from: rc.slot, s: ice.s, lat: ice.lat, until: ice.until });
      if (this.near(rc, 40)) this.sound.iceDrop();
      if (rc.me) this.hud.say('Slippery!', 'info');
    } else if (res.kind === 'boost') {
      if (this.near(rc, 50)) {
        this.fx.boostBurst(p.x, p.y, p.z);
        this.sound.boost();
      }
      if (rc.me) this.hud.say('Rocket sled!', 'boost');
      if (r.online && this.net?.active) this.net.sendItem({ k: 'boost', from: rc.slot });
    } else if (res.kind === 'shield') {
      if (this.near(rc, 40)) {
        this.fx.shieldBurst(p.x, p.y, p.z);
        this.sound.shieldOn();
      }
    }
  }

  resolveBowl(fromSlot, rc) {
    const shielded = rc.shieldT > 0;
    if (rc.local) applyBowl(rc, fromSlot);
    else if (!shielded) rc.bonks += 1;
    const from = this.racers.find((x) => x.slot === fromSlot);
    if (from && !shielded) from.hits += 1;
    const p = rc.pos;
    if (this.near(rc, 50)) {
      this.fx.poof(p.x, p.y + 0.6, p.z, { n: 30, size: 0.5, speed: 4, up: 3 });
      this.sound.bonk(1);
      const at = this.toScreen(p.x, p.y + 1.6, p.z);
      if (at) this.hud.bonk(at[0], at[1], shielded ? 'BLOCKED!' : 'SQUASHED!', from?.me);
      if (!shielded) {
        rc.model.react('ouch');
        this.emote(rc, rc.me ? 'Waaah!' : 'Nooo!', 0.2);
      }
    }
    if (rc.me) this.race.shake = 0.55;
  }

  giantBurst(g) {
    const r = this.race;
    const w = toWorld(r.course, g.s, g.lat, g.rad, {});
    if (g.burstOn) r.course.burst.add(g.burstOn.id);
    if (Math.hypot(w.x - this.camera.position.x, w.z - this.camera.position.z) < 80) {
      this.fx.poof(w.x, w.y - g.rad * 0.5, w.z, { n: 40, size: 0.7, speed: 5, up: 3.5 });
      this.sound.bump();
    }
  }

  /** Aurora Peak: chairs on the lifts crossing the run drop clumps of snow (a soft hazard). */
  snowDumps(dt) {
    const r = this.race;
    const c = r.course;
    r.dumps ??= [];
    const period = 2.6;
    const k = Math.floor(r.clock / period);
    if (k !== r.dumpK) {
      r.dumpK = k;
      for (const lf of c.lifts) {
        if (lf.kind !== 'cross') continue;
        const W = frameAt(c, lf.s).width;
        const u = ((Math.imul(k + 1, 2654435761) ^ Math.imul(lf.id, 40503)) >>> 0) / 4294967296;
        r.dumps.push({ s: lf.s, lat: (u * 2 - 1) * (W - 1.5), t: 0, landed: false, hit: new Set() });
      }
    }
    for (let i = r.dumps.length - 1; i >= 0; i--) {
      const d = r.dumps[i];
      d.t += dt;
      const w = toWorld(c, d.s, d.lat, 0, {});
      if (!d.landed && d.t > 0.9) {
        d.landed = true;
        if (Math.hypot(w.x - this.camera.position.x, w.z - this.camera.position.z) < 70) {
          this.fx.poof(w.x, w.y, w.z, { n: 18, size: 0.5, speed: 2.5, up: 1.5 });
          this.sound.splat();
        }
      }
      if (d.landed && d.t < 3.5) {
        for (const rc of this.racers) {
          if (!rc.local || d.hit.has(rc.slot) || rc.rider.air) continue;
          if (Math.abs(rc.rider.s - d.s) < 1.4 && Math.abs(rc.rider.lat - d.lat) < 1.4) {
            d.hit.add(rc.slot);
            rc.rider.wobble = Math.max(rc.rider.wobble, 0.5);
            rc.rider.speed *= 0.82;
            this.fx.poof(rc.pos.x, rc.pos.y + 0.3, rc.pos.z, { n: 12, size: 0.35, speed: 2, up: 1.5 });
            if (rc.me) this.hud.say('Splat!', 'info');
          }
        }
      }
      this.world.dropSnow?.(i, d, w);
      if (d.t > 3.5) {
        r.dumps.splice(i, 1);
        this.world.dropSnow?.(-1);
      }
    }
  }

  /** A racer's state for drawing: between the last two physics steps. */
  vis(rc) {
    const a = rc.prevState, b = rc.rider;
    const v = (rc.visState ??= {});
    const t = this.race?.alpha ?? 1;
    for (const k of VIS_KEYS) {
      const x = b[k] ?? 0;
      v[k] = a && a[k] != null ? a[k] + (x - a[k]) * t : x;
    }
    v.air = b.air;
    v.tumble = b.tumble;
    v.spinout = b.spinout;
    v.wobble = b.wobble;
    v.boost = b.boost;
    v.slip = b.slip ?? 0;
    v.flat = b.flat ?? 0;
    v.tumbleSoft = Boolean(b.tumbleSoft);
    v.tumbleLen = b.tumbleLen ?? 0.95;
    return v;
  }

  /** Copy a remote racer's interpolated state into its rider (for drawing, the strip and aiming). */
  applyRemote(rc) {
    const st = this.net?.sample(rc.slot);
    if (!st) return;
    const rd = rc.rider;
    const wasTumble = rd.tumble > 0, wasAir = rd.air;
    rd.s = st.s; rd.lat = st.lat; rd.y = st.y; rd.yaw = st.yaw; rd.speed = st.speed; rd.air = st.air;
    rd.spin = st.spin; rd.flip = st.flip; rd.edge = st.edge; rd.charge = st.charge; rd.tuck = st.tuck ? 1 : 0;
    rd.tumble = st.tumble ? Math.max(rd.tumble, 0.01) : 0;
    rd.spinout = st.spinout ? Math.max(rd.spinout, 0.01) : 0;
    rd.slip = st.slip ? Math.max(rd.slip ?? 0, 0.5) : 0;
    rd.flat = st.flat ? Math.max(rd.flat ?? 0, 0.5) : 0;
    rd.tumbleSoft = Boolean(st.plant);
    rd.wobble = st.wobble ? 0.3 : 0;
    rd.boost = st.boost ? 0.2 : 0;
    rd.carve = Math.abs(st.edge);
    rc.shieldT = st.shield ? 1 : 0;
    rc.lap = st.lap ?? 1;
    rc.liftT = st.lift ? Math.max(rc.liftT ?? 0, 0.01) : 0;
    rc.gifts = st.gifts;
    rc.ammo = st.ammo;
    if (st.finished && !rc.finished) {
      rc.finished = true;
      rc.time = st.time;
      rd.finished = true;
    }
    if (st.tumble && !wasTumble) this.fx.poof(rc.pos.x, rc.pos.y, rc.pos.z);
    if (wasAir && !st.air) rc.model.squashT = 0.5;
  }

  riderEvents(rc, ev) {
    const near = rc.me || Math.hypot(rc.pos.x - this.camera.position.x, rc.pos.z - this.camera.position.z) < 50;
    for (const e of ev) {
      if (e.type === 'jump') {
        if (rc.me) this.sound.jump(e.charge);
        if (near) this.fx.poof(rc.pos.x, rc.pos.y, rc.pos.z, { n: 8, size: 0.3, speed: 1.5, up: 1 });
      } else if (e.type === 'launch') {
        if (rc.me) this.sound.whoosh(0, 1.2);
        if (near) this.fx.poof(rc.pos.x, rc.pos.y, rc.pos.z, { n: 14, size: 0.35, speed: 2, up: 2 });
      } else if (e.type === 'land') {
        rc.landed = Math.min(6, e.impact);
        if (near) this.fx.poof(rc.pos.x, rc.pos.y, rc.pos.z, { n: 10 + Math.min(20, e.impact * 2), size: 0.4, speed: 2.5, up: 1.4 });
        if (e.clean && e.tricks > 0) {
          rc.tricks += 1;
          rc.model.trickLanded();
          rc.trickNow = true;
          if (near) this.fx.boostBurst(rc.pos.x, rc.pos.y, rc.pos.z);
          // a wave and a cheer when you land one with others around
          if (this.racers.some((o) => o !== rc && !o.gone && Math.hypot(o.pos.x - rc.pos.x, o.pos.z - rc.pos.z) < 16)) {
            rc.model.react('wave');
            this.emote(rc, ['Woo!', 'Yay!', 'Ta-da!'][rc.tricks % 3], 0.15);
          }
          if (rc.me) this.world.cheer?.(rc.rider.s, 2.5);
          if (rc.me) {
            this.hud.say(e.name || 'Nice!', 'trick');
            this.hud.say('Boost!', 'boost');
            this.sound.trick(e.tricks);
            this.sound.boost();
            this.race.shake = Math.max(this.race.shake, 0.15);
          }
        } else if (rc.me) {
          this.sound.land(e.clean, e.impact);
          if (!e.clean) this.hud.say('Wobble!', 'info');
          this.race.shake = Math.max(this.race.shake, Math.min(0.35, e.impact * 0.04));
        }
      } else if (e.type === 'bump') {
        if (near) this.fx.poof(rc.pos.x, rc.pos.y + 0.3, rc.pos.z, { n: 22, size: 0.42, speed: 3.5, up: 2.4 });
        rc.model.react('ouch');
        if (rc.me) {
          this.sound.bump();
          this.hud.say(['Boing!', 'Oopsie!', 'Bumpity!'][Math.floor(Math.random() * 3)], 'info');
          this.race.shake = 0.5;
        }
      } else if (e.type === 'slip') {
        // onto ice: a spin round — a scrape and a glint of ice
        if (near) {
          this.fx.sparkles(rc.pos.x, rc.pos.y + 0.15, rc.pos.z, { n: 10, col: new THREE.Color('#d8f6ff'), speed: 2.5, life: 0.5, size: 0.14 });
          this.sound.iceScrape(rc.me ? 1 : 0.5);
        }
        this.emote(rc, ['Whoa!', 'Wheee!', 'Slippy!'][Math.floor(Math.random() * 3)], 0.1);
        if (rc.me) this.hud.say('Ice!', 'info');
      } else if (e.type === 'geyser') {
        // up on a geyser's steam: a whoosh of warm mist and a boost
        if (near) {
          this.fx.poof(rc.pos.x, rc.pos.y + 0.4, rc.pos.z, { n: 36, size: 0.8, speed: 3, up: 6 });
          this.sound.boost?.();
        }
        this.emote(rc, ['Wheee!', 'Steamy!', 'Up we go!'][Math.floor(Math.random() * 3)], 0.1);
        if (rc.me) this.hud.say('Geyser lift!', 'boost');
      } else if (e.type === 'popup') {
        // popping back up after being squashed flat by a giant snowball
        if (near) {
          this.fx.poof(rc.pos.x, rc.pos.y + 0.6, rc.pos.z, { n: 44, size: 0.6, speed: 5, up: 3.6 });
          this.sound.snowmanPoof(rc.me ? 1 : 0.5);
        }
        rc.model.react('laugh');
        if (rc.me) this.race.shake = Math.max(this.race.shake, 0.25);
      } else if (e.type === 'burst') {
        this.world.burstSnowman?.(e.id);
        if (near) {
          this.fx.poof(rc.pos.x, rc.pos.y + 0.6, rc.pos.z, { n: 46, size: 0.6, speed: 5, up: 4 });
          this.fx.sparkles(rc.pos.x, rc.pos.y + 1, rc.pos.z, { n: 10, col: new THREE.Color('#ffffff'), speed: 3 });
          this.sound.snowmanPoof(rc.me ? 1 : 0.5);
        }
        if (rc.me) {
          this.hud.say('POOF!', 'trick');
          this.race.shake = Math.max(this.race.shake, 0.3);
        }
        rc.model.react('laugh');
      } else if (e.type === 'bell') {
        this.world.ringBell?.(e.id);
        if (near) this.sound.bell(rc.me ? 1 : 0.45);
        if (rc.me) this.hud.say('Ding! Boost!', 'boost');
      } else if (e.type === 'rail' && rc.me) {
        if (!this._railT || this.time - this._railT > 0.4) {
          this.sound.rail(e.side);
          this._railT = this.time;
        }
      }
    }
  }

  pickupEvent(rc, e) {
    const p = rc.pos;
    const at = this.toScreen(p.x, p.y + 1.2, p.z);
    if (e.type === 'gift') {
      this.world.take(e.id);
      this.fx.giftBurst(p.x, p.y + 0.8, p.z);
      this.sound.gift();
      if (at) this.hud.fly(e.kind, at[0], at[1]);
      this.hud.say(ITEM_NAMES[e.kind], 'trick');
      if (!this.race.told?.[e.kind]) {
        this.race.told = { ...this.race.told, [e.kind]: true };
        const i = rc.slots.findIndex((x) => x.kind === e.kind) + 1;
        this.hud.toast(this.touch ? `${ITEM_NAMES[e.kind]} — tap its button to use it.` : `${ITEM_NAMES[e.kind]} — press ${i || 1} to use it.`);
      }
    } else if (e.type === 'pile') {
      this.world.take(e.id);
      this.sound.pile();
      this.fx.poof(p.x, p.y, p.z, { n: 12, size: 0.35, speed: 2, up: 2 });
      if (at) this.hud.fly('snowballs', at[0], at[1]);
      if (!this.race.ammoTold) {
        this.race.ammoTold = true;
        const i = rc.slots.findIndex((x) => x.kind === 'snowballs') + 1;
        this.hud.toast(this.touch ? 'Snowballs! Tap the snowball button to throw.' : `Snowballs! Press ${i || 1} (or click) to throw at the rider ahead.`);
      }
    }
  }

  tryThrow(rc) {
    if (!canThrow(rc)) return;
    const target = pickTarget(rc, this.racers);
    const p = makeThrow(rc, target, `${rc.slot}-${++this.race.pid}-${Math.floor(this.time * 1000) % 100000}`);
    this.race.projectiles.push(p);
    if (rc.me || Math.hypot(rc.pos.x - this.camera.position.x, rc.pos.z - this.camera.position.z) < 40) this.sound.throwBall();
    if (rc.me && !target) this.hud.say('Nobody ahead!', 'info');
    if (this.race.online && this.net?.active) this.net.sendThrow(p);
  }

  /** A snowball lands: hit or miss. Online, only the host decides; everyone else waits for its word. */
  arrive(p) {
    const r = this.race;
    const tgt = p.target >= 0 ? this.racers.find((x) => x.slot === p.target) : null;
    const at = projectilePos(p, this.racers, r.course, {});
    const w = toWorld(r.course, at.s, at.lat, 0, {});
    const decide = !r.online || this.net?.isHost;
    if (!tgt) {
      this.fx.poof(w.x, at.y, w.z, { n: 10, size: 0.3, speed: 1.5, up: 1.5 });
      return;
    }
    if (!decide) return;
    const ok = hittable(tgt, r.course);
    const shielded = tgt.shieldT > 0;
    if (r.online && this.net?.active) this.net.sendHit(p.id, tgt.slot, ok || shielded);
    this.resolveHit(p.from, tgt, ok, shielded);
  }

  resolveHit(fromSlot, tgt, ok, shielded) {
    const p = tgt.pos;
    if (shielded) {
      if (tgt.local) tgt.shieldT = 0;
      this.fx.shieldBurst(p.x, p.y, p.z);
      this.sound.shieldPop();
      return;
    }
    if (!ok) {
      this.fx.poof(p.x, p.y + 0.6, p.z, { n: 8, size: 0.25 });
      return;
    }
    if (tgt.local) applyHit(tgt, fromSlot);
    else tgt.bonks += 1;
    const from = this.racers.find((x) => x.slot === fromSlot);
    if (from) from.hits += 1;
    this.fx.poof(p.x, p.y + 0.8, p.z, { n: 30, size: 0.45, speed: 3.5, up: 2.5 });
    this.fx.sparkles(p.x, p.y + 1, p.z, { n: 10, col: new THREE.Color('#ffffff'), speed: 3 });
    const near = Math.hypot(p.x - this.camera.position.x, p.z - this.camera.position.z);
    this.sound.bonk(clamp(1.4 - near / 40, 0.2, 1));
    const sp = this.toScreen(p.x, p.y + 1.6, p.z);
    if (sp) this.hud.bonk(sp[0], sp[1], tgt.me ? 'BONK! Spin!' : 'BONK!', from?.me);
    tgt.model.react('ouch');
    this.emote(tgt, ['Hey!!', 'Grrr!', 'Ow ow!'][Math.floor(Math.random() * 3)], 0.3);
    if (from) from.model.react('laugh');
    if (tgt.me) this.race.shake = 0.45;
  }

  netMessage(m) {
    const r = this.race;
    if (m.t === 'throw' && r) {
      if (!r.projectiles.some((p) => p.id === m.p.id)) r.projectiles.push(m.p);
      this.sound.throwBall();
    } else if (m.t === 'item' && r) {
      const it = m.it;
      const from = this.racers.find((x) => x.slot === it.from);
      if (it.k === 'giant' && from) r.giants.push({ id: it.id, from: it.from, s: it.s, lat: it.lat, vl: it.vl, v: it.v, rad: 0.85, t: 0, life: GIANT_LIFE, hit: new Set(), y: null, vy: 0, air: false, dist: 0, bump: 0 });
      else if (it.k === 'ice') r.course.dynIce.push({ id: it.id, s: it.s, lat: it.lat, len: 7, w: 4.5, until: it.until, from: it.from });
      else if (it.k === 'boost' && from && this.near(from, 50)) this.fx.boostBurst(from.pos.x, from.pos.y, from.pos.z);
    } else if (m.t === 'hit' && r && m.kind === 'giant') {
      const tgt = this.racers.find((x) => x.slot === m.target);
      const g = r.giants.find((x) => x.id === m.p);
      if (tgt) this.resolveBowl(g?.from ?? -1, tgt);
    } else if (m.t === 'hit' && r) {
      const tgt = this.racers.find((x) => x.slot === m.target);
      if (!tgt) return;
      const shielded = tgt.me ? tgt.shieldT > 0 : tgt.shieldT > 0;
      if (tgt.me) {
        if (shielded) this.resolveHit(-1, tgt, false, true);
        else if (m.ok) this.resolveHit(-1, tgt, true, false);
      } else if (m.ok) this.resolveHit(-1, tgt, !shielded, shielded);
    } else if (m.t === 'fin' && r && this.net?.isHost) {
      r.finAt.set(m.slot, m.time);
      const rc = this.racers.find((x) => x.slot === m.slot);
      if (rc && !rc.finished) {
        rc.finished = true;
        rc.time = m.time;
      }
    } else if (m.t === 'result' && r) {
      this.showResults(m.order);
    } else if (m.t === 'left' && r) {
      // a friend left mid-race: they stop where they are
      const rc = this.racers.find((x) => x.human && !x.me && x.remote && x.id === m.id);
      if (rc) {
        rc.gone = true;
        rc.model.root.visible = false;
      }
    }
  }

  netClosed() {
    if (this.race?.online) {
      // the host left: finish this race alone with what we have
      this.race.online = false;
      for (const rc of this.racers) if (rc.remote) {
        rc.gone = true;
        rc.model.root.visible = false;
      }
      this.racers = this.racers.filter((rc) => !rc.gone);
      this.hud.toast('The host left — finishing the run on your own.');
    } else if (this.screen === 'lobby' && this.mode === 'menu') this.renderLobby();
  }

  onFinish(rc) {
    const r = this.race;
    if (rc.me) {
      this.mode = 'finish';
      r.finishedAt = r.clock;
      const place = standings(this.racers).indexOf(rc) + 1;
      this.hud.say(place === 1 ? 'You won!' : `Finish! ${place}${['st', 'nd', 'rd'][place - 1] ?? 'th'}`, 'trick');
      this.sound.cheer(1);
      this.fx.confettiBurst(rc.pos.x, rc.pos.y + 3, rc.pos.z);
      this.music.cue(place <= 3 ? 'victory' : 'level-up');
      if (r.online && this.net?.active) {
        if (this.net.isHost) r.finAt.set(rc.slot, rc.time);
        else this.net.sendFinish(rc.slot, rc.time);
      }
    }
  }

  localFinishCheck() {
    const r = this.race;
    if (r.finishedAt == null || r.results) return;
    const done = this.racers.every((x) => x.finished);
    if (done || r.clock - r.finishedAt > 7) {
      const order = standings(this.racers).map((x) => ({ slot: x.slot, time: x.finished ? x.time : estimateFinish(x, r.course, r.clock) }));
      this.showResults(order);
    }
  }

  hostFinishCheck() {
    const r = this.race;
    if (r.results) return;
    const humans = this.racers.filter((x) => x.human && !x.gone);
    const humansDone = humans.every((x) => x.finished);
    const first = Math.min(...humans.filter((x) => x.finished).map((x) => x.time), Infinity);
    const all = this.racers.every((x) => x.finished || x.gone);
    if (all || (humansDone && r.clock - (r.finishedAt ?? r.clock) > 6) || (Number.isFinite(first) && r.clock - first > 30)) {
      const order = standings(this.racers.filter((x) => !x.gone)).map((x) => ({ slot: x.slot, time: x.finished ? x.time : estimateFinish(x, r.course, r.clock) }));
      order.sort((a, b) => a.time - b.time);
      this.net.sendResult(order);
      this.showResults(order);
    }
  }

  showResults(order) {
    const r = this.race;
    if (!r || r.results) return;
    r.results = order;
    const rows = order.map((o) => {
      const rc = this.racers.find((x) => x.slot === o.slot);
      return rc ? { slot: rc.slot, name: rc.name, species: rc.species, board: rc.board, me: rc.me, human: rc.human, time: o.time, gifts: rc.gifts, tricks: rc.tricks, hits: rc.hits, bumps: rc.bumps } : null;
    }).filter(Boolean);
    const meRow = rows.find((x) => x.me) ?? rows[0];
    const place = rows.indexOf(meRow) + 1;
    const m = r.mountain;
    // best times per mountain and race length (Quick keeps the mountain's own key)
    const bk = r.course.mode === 'quick' ? m.id : `${m.id}:${r.course.mode}`;
    const old = this.save.best[bk];
    const newBest = !old || meRow.time < old.time;
    if (newBest) this.save.best[bk] = { time: meRow.time, place };
    else if (place < old.place) this.save.best[bk] = { ...old, place };
    this.persist();
    this.mode = 'results';
    this.screen = 'results';
    this.hud.show(false);
    this.helpBtn.style.display = 'none';
    this.touchUi?.show(false);
    this.sound.quiet();
    this.stage.setPodium(rows.map((x) => this.racers.find((y) => y.slot === x.slot)), this.me.slot);
    this.stage.focus('podium', true);
    this.stagePipe.render();
    this.music.jump('playful', { fade: 3 });
    const idx = MOUNTAINS.findIndex((x) => x.id === m.id);
    const next = MOUNTAINS[(idx + 1) % MOUNTAINS.length];
    this.menus.results({
      rows, mountain: m, me: { place, time: meRow.time, tricks: meRow.tricks, hits: meRow.hits, newBest }, online: r.online,
      nextName: next.name,
      onRetry: () => this.startRace({ mountain: m.id }),
      onNext: () => {
        this.mountainId = next.id;
        this.stage.setMountain(next.id);
        this.persist();
        this.startRace({ mountain: next.id });
      },
      onMenu: () => {
        this.disposeRace();
        if (r.online && this.net?.active) this.showLobby();
        else this.showMountains();
      }
    });
    setTimeout(() => {
      this.stageConfetti();
      this.sound.cheer(0.6);
    }, 300);
  }

  stageConfetti() {
    // confetti on the podium uses the stage's own little burst
    this.stage.confetti?.();
  }

  pause() {
    if (this.mode !== 'race' && this.mode !== 'countdown' && this.mode !== 'finish') return;
    this._pauseFrom = this.mode;
    this.mode = 'pause';
    this.sound.quiet();
    this.menus.pause({
      onResume: () => this.resume(),
      onRestart: () => this.startRace({ mountain: this.mountainId }),
      onHelp: () => {
        this.menus.clear();
        this._pausedForHelp = true;
        this.help.open();
      },
      onCredits: () => this.menus.credits(),
      onLeave: () => {
        this.disposeRace();
        if (this.net?.active) this.net.leave();
        this.showTitle();
      },
      onQuality: () => this.cycleQuality(),
      quality: this.save.quality === 'auto' ? `auto (${this.tierName})` : this.save.quality,
      onSound: () => this.toggleSound(),
      soundOn: this.save.sound,
      online: this.race?.online
    });
  }

  resume() {
    if (this.mode !== 'pause') return;
    this.menus.clear();
    this.mode = this._pauseFrom ?? 'race';
    this.root.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- drawing */

  updateRiders(dt) {
    const c = this.race.course;
    const strokes = [];
    const cam = this.camera.position;
    for (const rc of this.racers) {
      const rd = this.vis(rc);
      const f = frameAt(c, rd.s, rc.f ??= {});
      const x = f.x + f.rx * rd.lat, z = f.z + f.rz * rd.lat;
      rc.pos.x = x;
      rc.pos.y = rd.y;
      rc.pos.z = z;
      const root = rc.model.root;
      root.position.set(x, rd.y, z);
      root.rotation.order = 'YXZ';
      // the board follows its own heading (a skid shows as the board crossing its line)
      // lean: the turn's sideways pull, plus the edge itself so the tilt starts the instant you steer
      const lean = clamp(Math.atan2(rd.latAcc, 9.8) * 0.7 + rd.edge * 0.32, -0.47, 0.47) * (rd.air ? 0.3 : 1);
      const head = rd.head ?? rd.yaw;
      const yawRate = dt > 0 ? (head - (rc.lastHead ?? head)) / dt : 0;
      rc.lastHead = head;
      // a glance: at a rider right alongside, else at a gift box just ahead
      let lookYaw = 0;
      for (const o of this.racers) {
        if (o === rc || o.gone) continue;
        const ds = o.rider.s - rd.s, dl = o.rider.lat - rd.lat;
        if (Math.abs(ds) < 3 && Math.abs(dl) < 4 && Math.abs(dl) > 0.6) {
          lookYaw = -Math.atan2(dl, Math.max(0.5, ds + 1)) - head;
          break;
        }
      }
      if (!lookYaw && rc.me && this.world.items) {
        const gf = this.world.nextGift?.(rd.s, rd.lat);
        if (gf) lookYaw = clamp(-Math.atan2(gf.lat - rd.lat, gf.s - rd.s) - head, -0.6, 0.6) * 0.8;
      }
      const ps = (rc.poseState ??= {});
      ps.heading = f.heading; ps.yaw = head; ps.spin = rd.spin; ps.flip = rd.flip; ps.edge = rd.edge; ps.lean = lean;
      ps.compress = rd.compress; ps.skid = rd.skid; ps.tuck = rd.tuck; ps.charge = rd.charge; ps.speed = rd.speed; ps.air = rd.air;
      ps.tumbleK = rd.tumble > 0 ? clamp(rd.tumble / (rd.tumbleLen || 0.95), 0, 1) : 0;
      ps.slipK = rd.slip > 0 ? clamp(rd.slip / SLIP, 0, 1) : 0;
      ps.flat = rd.flat > 0; ps.plant = rd.tumble > 0 && Boolean(rd.tumbleSoft); ps.spinoutK = rd.spinout > 0 ? clamp(rd.spinout / 1.2, 0, 1) : 0;
      ps.wobble = rd.wobble; ps.landed = rc.landed ?? 0; ps.steerIn = rc.rider.steerIn ?? 0; ps.steer = rc.rider.steerR ?? 0;
      ps.unweight = rc.rider.unweight ?? 0; ps.spinV = rc.rider.spinV ?? 0; ps.latAcc = rd.latAcc; ps.yawRate = yawRate; ps.lookYaw = lookYaw;
      ps.idle = this.mode === 'countdown';
      ps.boost = rd.boost > 0;
      // on the chairlift: sitting on a chair, boards dangling (only yours is shown, the others are up there too)
      const lifting = rc.liftT > 0;
      ps.menu = lifting;
      if (lifting && rc.me && this.liftChair) {
        root.position.copy(this.liftChair.position).add(this.liftSeat);
        root.rotation.set(0, this.liftChair.rotation.y, 0);
      }
      rc.model.furLod(rc.me ? 0 : Math.hypot(rc.pos.x - this.camera.position.x, rc.pos.y - this.camera.position.y, rc.pos.z - this.camera.position.z));
      rc.model.pose(dt, ps);
      // the glove dragging in the snow on a hard toeside carve leaves a little spray
      if (rc.model.handDrag > 0.4 && this.near(rc, 40) && Math.random() < rc.model.handDrag * 0.9) {
        const hp = rc.model.handPos;
        this.fx.powder.add(hp.x, hp.y, hp.z, (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5, { life: 0.45, size: 0.12, grow: 2.2, alpha: 0.8, drag: 3, grav: -3 });
      }
      // pitch with the snow underfoot (rollers, kickers), with the flight path in the air — eased, never snapped
      let pitchGoal;
      if (rd.air) pitchGoal = Math.atan2(rd.vy, Math.max(4, rd.speed)) * 0.7;
      else {
        const gs = groundAt(c, rd.s + 0.6, rd.lat) - groundAt(c, rd.s - 0.6, rd.lat);
        pitchGoal = Math.atan2(gs, 1.2);
      }
      rc.pitchVis = (rc.pitchVis ?? pitchGoal) + (pitchGoal - (rc.pitchVis ?? pitchGoal)) * Math.min(1, dt * (rd.air ? 5 : 14));
      root.rotation.x = rc.pitchVis;
      rc.justLanded = rc.landed;
      rc.landed = 0;
      rc.shieldMesh.visible = rc.shieldT > 0;
      if (rc.shieldT > 0) rc.shieldMesh.rotation.y += dt * 1.5;
      if (!rc.me) root.visible = !rc.gone;
      // spray and trails (only on the snow, moving)
      if (!rd.air && rd.speed > 3 && !rc.gone) {
        const yawW = f.heading + rd.yaw;
        const fwd = [Math.sin(yawW), -Math.cos(yawW)];
        const right = [-fwd[1], fwd[0]];
        // a carve throws from the downhill edge; a skid sprays from the sliding tail
        const side = rd.skid > 0.3 ? -Math.sign((rd.head ?? 0) - rd.yaw || 1) : Math.sign(rd.edge || 0.0001);
        const camD = Math.hypot(x - cam.x, z - cam.z);
        if (camD < 70) this.fx.spray(x, rd.y, z, [right[0] * side, right[1] * side], fwd, rd.speed, Math.max(rd.carve * 0.7, rd.skid), dt);
        strokes.push({ s0: rc.prev.s, lat0: rc.prev.lat, s1: rd.s, lat1: rd.lat, width: 0.15 + Math.abs(rd.edge) * 0.1 + rd.skid * 0.12 });
      }
      // the fun boards' trails (cosmetic, near you only)
      if (!rc.gone && rc.board && rc.board !== 'classic' && Math.hypot(x - cam.x, z - cam.z) < 45) {
        const yawW = f.heading + rd.yaw;
        this.fx.boardTrail(rc.board, x, rd.y, z, [Math.sin(yawW), -Math.cos(yawW)], { speed: rd.speed, air: rd.air, boost: rd.boost > 0, carve: Math.abs(rd.edge ?? 0), landed: rc.justLanded, trick: rc.trickNow, holder: rc }, dt);
      }
      rc.trickNow = false;
      rc.prev.s = rd.s;
      rc.prev.lat = rd.lat;
    }
    this.strokes = strokes;
  }

  /**
   * The chase camera: a damped spring behind you, looking ahead along the run's
   * own direction, banking a little into turns, easing (never snapping) into
   * jumps and out of them, and keeping clear of other riders.
   */
  placeCamera(dt, snapCam = false) {
    const r = this.race;
    const me = this.me;
    if (me.liftT > 0 && this.liftChair) return this.liftCamera(dt);
    const rd = this.vis(me);
    const c = r.course;
    const f = frameAt(c, rd.s, {});
    const speed = rd.speed;
    const k = clamp((speed - 8) / 22, 0, 1);
    r.airK = (r.airK ?? 0) + ((rd.air ? 1 : 0) - (r.airK ?? 0)) * Math.min(1, dt * 2.5);
    // follow the run's direction and, more, the rider's own (turns should look quick)
    const steerR = me.rider.steerR ?? 0;
    const yawW = f.heading + rd.yaw * 0.55 + steerR * 0.08;
    const fx = Math.sin(yawW), fz = -Math.cos(yawW);
    const dist = 4.3 + k * 0.9 + r.airK * 0.7;
    const height = 1.7 + k * 0.25 + r.airK * 0.35;
    const target = new THREE.Vector3(me.pos.x, me.pos.y + 0.85, me.pos.z);
    const behindS = rd.s - dist * 0.95;
    const groundBehind = groundAt(c, Math.max(0, behindS), rd.lat * 0.9);
    const desired = new THREE.Vector3(target.x - fx * dist, Math.max(target.y + height - (target.y - groundBehind) * 0.15, groundBehind + 1.1), target.z - fz * dist);
    // keep clear of riders close to the lens
    for (const o of this.racers) {
      if (o === me || o.gone) continue;
      const dx = desired.x - o.pos.x, dy = desired.y - (o.pos.y + 0.6), dz = desired.z - o.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 2.2 && d > 1e-3) desired.addScaledVector(new THREE.Vector3(dx, Math.max(dy, 0.4), dz).normalize(), (2.2 - d) * 0.8);
    }
    if (snapCam || !r.camPos) {
      r.camPos = desired.clone();
      r.camVel = new THREE.Vector3();
      r.prevDesired = null;
      r.desiredVel = null;
      r.camLook.copy(target);
      r.roll = 0;
    }
    // critically damped spring that also matches the target's own velocity (no lag that grows with speed,
    // no snapping, no overshoot)
    const dv = r.prevDesired && dt > 0 ? desired.clone().sub(r.prevDesired).divideScalar(dt) : new THREE.Vector3();
    r.prevDesired = desired.clone();
    r.desiredVel = (r.desiredVel ?? dv.clone()).lerp(dv, 1 - Math.exp(-dt * 12));
    // stiffer sideways than up and down: it swings round with you, but bumps stay soft
    const acc = new THREE.Vector3();
    for (const [k, w] of [['x', 9.5], ['y', 6.5], ['z', 9.5]]) acc[k] = (desired[k] - r.camPos[k]) * w * w + (r.desiredVel[k] - r.camVel[k]) * 2 * w;
    r.camVel.addScaledVector(acc, dt);
    r.camPos.addScaledVector(r.camVel, dt);
    // look ahead along the run itself
    const ahead = frameAt(c, rd.s + 10 + speed * 0.25, {});
    // look ahead along the run, nudged toward where you're steering
    const latLook = rd.lat * 0.7 + steerR * 2.5 + Math.sin(rd.yaw) * 4;
    const la = new THREE.Vector3(ahead.x + ahead.rx * latLook, me.pos.y + 0.4 - k * 0.3 + (r.mountain.peak ? 1.1 : 0), ahead.z + ahead.rz * latLook);
    const look = target.clone().lerp(la, 0.55);
    r.camLook.lerp(look, 1 - Math.exp(-dt * 11));
    // keep your own rider framed (bottom-centre third) through berms and tight turns
    const camP = r.camPos;
    const toRider = Math.atan2(target.x - camP.x, -(target.z - camP.z));
    const toLook = Math.atan2(r.camLook.x - camP.x, -(r.camLook.z - camP.z));
    let off = Math.atan2(Math.sin(toLook - toRider), Math.cos(toLook - toRider));
    const lim = 0.2;
    if (Math.abs(off) > lim) {
      const want = toRider + Math.sign(off) * lim;
      const d = Math.hypot(r.camLook.x - camP.x, r.camLook.z - camP.z);
      r.camLook.x = camP.x + Math.sin(want) * d;
      r.camLook.z = camP.z - Math.cos(want) * d;
    }
    // shake: a hum at top speed, kicks on bumps and landings
    r.shake = Math.max(0, r.shake - dt * 1.8);
    const hum = k > 0.6 ? (k - 0.6) * 0.04 : 0;
    const sh = hum + r.shake * 0.16;
    const t = this.time;
    const cam = this.camera;
    cam.position.set(r.camPos.x + Math.sin(t * 37) * sh, r.camPos.y + Math.sin(t * 43 + 1) * sh, r.camPos.z + Math.cos(t * 31) * sh);
    // bank a touch into the turn
    const rollGoal = clamp(-rd.latAcc / 9.8, -0.5, 0.5) * 0.09;
    r.roll += (rollGoal - r.roll) * Math.min(1, dt * 3);
    cam.up.set(Math.sin(r.roll) * Math.cos(yawW), Math.cos(r.roll), Math.sin(r.roll) * Math.sin(yawW));
    cam.lookAt(r.camLook);
    // a debug camera close at the rider's 3/4 side (for checking the body animation)
    if (this.debugCam === 'side') {
      const hd = f.heading + rd.yaw;
      const fx2 = Math.sin(hd), fz2 = -Math.cos(hd), rx = -fz2, rz = fx2;
      const sd = this.debugSide ?? 1;
      cam.up.set(0, 1, 0);
      cam.position.set(me.pos.x + rx * 2.6 * sd + fx2 * 1.4, me.pos.y + 1.05, me.pos.z + rz * 2.6 * sd + fz2 * 1.4);
      cam.lookAt(me.pos.x + fx2 * 0.3, me.pos.y + 0.55, me.pos.z + fz2 * 0.3);
    }
    // …and one ahead of the rider at a 3/4, close on the face (checking the goggles)
    if (this.debugCam === 'face') {
      const hd = f.heading + rd.yaw;
      const fx2 = Math.sin(hd), fz2 = -Math.cos(hd), rx = -fz2, rz = fx2;
      const sd = -(this.debugSide ?? 1);
      cam.up.set(0, 1, 0);
      cam.position.set(me.pos.x + fx2 * 1.9 - rx * 1.1 * sd, me.pos.y + 1.0, me.pos.z + fz2 * 1.9 - rz * 1.1 * sd);
      cam.lookAt(me.pos.x + fx2 * 0.1, me.pos.y + 0.72, me.pos.z + fz2 * 0.1);
    }
    if (this.debugCam === 'hero' && this.world.hero) {
      const b = this.world.hero.userData.place;
      cam.up.set(0, 1, 0);
      cam.position.set(me.pos.x, me.pos.y + 40, me.pos.z);
      cam.lookAt(b.x, b.y + b.height * 0.5, b.z);
    }
    // FOV widens with speed: 60 → 78
    const fov = 60 + 18 * clamp((speed - 6) / 24, 0, 1) + (rd.boost > 0 ? 4 : 0);
    r.fov += (fov - r.fov) * (1 - Math.exp(-dt * 3));
    if (Math.abs(cam.fov - r.fov) > 0.01) {
      cam.fov = r.fov;
      cam.updateProjectionMatrix();
    }
    this.pipe.u.speed.value = clamp((speed - 22) / 10, 0, 1) * 0.9 + (rd.boost > 0 ? 0.25 : 0);
    this.hud.drawLines(clamp((speed - 16) / 14, 0, 1) + (rd.boost > 0 ? 0.3 : 0), this.w, this.h, Math.min(2, devicePixelRatio || 1));
  }

  /** Whooshes as poles, flags, gates, towers and arches flash past close by. */
  passBy() {
    const r = this.race;
    const rd = this.me.rider;
    const c = r.course;
    const s0 = this.me.prev.s, s1 = rd.s;
    if (s1 <= s0) return;
    const W = frameAt(c, s1, {}).width;
    // piste poles every 10 m at the edges
    for (let s = Math.ceil((s0 - 5) / 10) * 10 + 5; s <= s1; s += 10) {
      for (const sd of [-1, 1]) {
        const d = Math.abs(rd.lat - sd * (W + 0.9));
        if (d < 7) this.sound.whoosh(sd * 0.8, 1 - d / 7);
      }
    }
    for (const a of c.arches) if (a.s > s0 && a.s <= s1) this.sound.whoosh(0, 1.5);
    for (const g of c.gates) if (g.s > s0 && g.s <= s1 && Math.abs(g.lat - rd.lat) < 6) this.sound.whoosh(Math.sign(g.lat - rd.lat) * 0.6, 1);
    for (const lf of c.lifts) if (lf.kind === 'cross' && lf.s > s0 && lf.s <= s1) this.sound.whoosh(0, 1.3);
  }

  /** A lap done (3 Laps): up the chairlift; gifts restocked. */
  onLap(rc) {
    rc.rider.speed = 0;
    if (rc.me) {
      this.world.resetPickups?.();
      this.world.lapVariant?.(rc.lap);
      this.hud.say(`Lap ${rc.lap}!`, 'trick');
      this.sound.bell?.(1);
      this.liftChair ??= this.makeLiftChair();
      this.liftChair.visible = true;
      this.race.liftCam = null;
    }
  }

  /** Back at the top after the chairlift. */
  respawn(rc) {
    const c = this.race.course;
    const i = this.racers.indexOf(rc), n = this.racers.length;
    const lat = (i - (n - 1) / 2) * Math.min(2.8, (frameAt(c, 6).width * 1.6) / n);
    const fresh = newRider({ s: 6 - (i % 2) * 2.5, lat });
    for (const k of Object.keys(rc.rider)) if (!(k in fresh)) delete rc.rider[k];
    Object.assign(rc.rider, fresh);
    settle(rc.rider, c);
    rc.prev = { s: rc.rider.s, lat: rc.rider.lat };
    rc.prevState = null;
    rc.model.root.visible = true;
    if (rc.me) {
      if (this.liftChair) this.liftChair.visible = false;
      this.hud.lift(null);
      this.race.camPos = null;
      this.hud.say('Go!', 'boost');
    }
  }

  /** The chair you ride between laps (a real chairlift chair, from the mountain's own kit). */
  makeLiftChair() {
    const K = this.world.kits;
    const g = new THREE.Group();
    if (K.chair) g.add(instance(K.chair, [{ x: 0, y: 0, z: 0, s: 1.25 }]));
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 400, 5).rotateX(Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: '#30343c', roughness: 0.4 }));
    cable.position.y = (K.chair?.size.y ?? 2) * 1.25;
    g.add(cable);
    this.scene.add(g);
    this.liftSeat = new THREE.Vector3(0, 0.5, 0);
    return g;
  }

  /** The chairlift ride: the chair climbs beside the run; the camera looks past you at the view. */
  liftCamera(dt) {
    const r = this.race, c = r.course, me = this.me;
    const u = 1 - me.liftT / LIFT;
    const W = frameAt(c, 60).width;
    const a = toWorld(c, 190, -(W + 16), 9, {}), b = toWorld(c, 15, -(W + 16), 24, {});
    const ch = this.liftChair;
    ch.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
    const dx = a.x - b.x, dz = a.z - b.z;
    // facing out over the run toward the view (downhill)
    ch.rotation.y = Math.atan2(-dx, -dz) + Math.PI;
    const l = Math.hypot(dx, dz) || 1;
    // the seat: up on the chair and forward of its back, facing the view
    this.liftSeat.set((dx / l) * 0.32, 0.62, (dz / l) * 0.32);
    const cam = this.camera;
    cam.up.set(0, 1, 0);
    // a slow swing from the front to the side: your rider on the chair, board dangling, the mountainside beyond
    const ang = 0.45 + u * 1.0;
    const fx = dx / l, fz = dz / l, sx = -fz, sz = fx;
    cam.position.set(ch.position.x + (fx * Math.cos(ang) + sx * Math.sin(ang)) * 5.2, ch.position.y + this.liftSeat.y + 1.5, ch.position.z + (fz * Math.cos(ang) + sz * Math.sin(ang)) * 5.2);
    cam.lookAt(ch.position.x + this.liftSeat.x, ch.position.y + this.liftSeat.y + 0.55, ch.position.z + this.liftSeat.z);
    if (Math.abs(cam.fov - 58) > 0.01) {
      cam.fov = 58;
      cam.updateProjectionMatrix();
    }
    this.hud.lift({ lap: me.lap, laps: c.laps, order: standings(this.racers), canSkip: LIFT - me.liftT >= LIFT_SKIP });
  }

  /**
   * Keep riders out of the lens: one right by the camera, or close and off
   * to the side or below it (where a fuzzy plush would fill a corner of the
   * screen), is hidden until it is clear again.
   */
  keepOutOfLens() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const v = (this._lens ??= new THREE.Vector3());
    for (const rc of this.racers) {
      if (rc.liftT > 0 && !rc.me) {
        rc.model.root.visible = false;
        continue;
      }
      if (rc.me || rc.gone) continue;
      v.set(rc.pos.x, rc.pos.y + 0.55, rc.pos.z);
      const d = v.distanceTo(cam.position);
      let show = d > 2.4;
      if (show && d < 5) {
        v.project(cam);
        // behind the lens, or near an edge or the bottom of the frame
        show = v.z < 1 && Math.abs(v.x) < 0.62 && v.y > -0.45 && v.y < 0.7;
      }
      rc.model.root.visible = show;
    }
  }

  renderRace(dt) {
    const r = this.race;
    const simDt = this.mode === 'race' || this.mode === 'finish' || this.mode === 'countdown' ? dt : 0;
    if (simDt > 0 && this.mode !== 'countdown') this.updateRiders(simDt);
    if (simDt > 0) {
      this.placeCamera(simDt);
      this.keepOutOfLens();
      this.passBy();
      // snowballs in the air
      r.projectiles.forEach((p, i) => {
        const at = projectilePos(p, this.racers, r.course, {});
        const w = toWorld(r.course, at.s, at.lat, 0, {});
        this.fx.ball(i, w.x, at.y, w.z);
      });
      this.fx.hideBalls(r.projectiles.length);
      // giant snowballs: rolling over the snow (spinning exactly as far as they roll), growing, a
      // little wobble, a groove behind and spray off their sides; a rumble and a shake when close
      let rumble = 0;
      r.giants.forEach((g, i) => {
        const w = toWorld(r.course, g.s, g.lat, 0, {});
        const y = (g.y ?? w.y) + g.rad * 0.92;
        const wob = Math.sin(g.t * 9) * 0.05 * g.rad;
        const f = frameAt(r.course, g.s);
        const sp = Math.hypot(g.v, g.vl ?? 0);
        this.fx.giant(i, w.x + f.rx * wob, y, w.z + f.rz * wob, g.rad, f.heading + Math.atan2(g.vl ?? 0, g.v), (simDt * sp) / Math.max(0.5, g.rad));
        if (!g.air && Math.random() < 0.8) {
          this.fx.poof(w.x - f.rx * g.rad * 0.8, w.y, w.z - f.rz * g.rad * 0.8, { n: 2, size: 0.45, speed: 1.8, up: 1.4 });
          this.fx.poof(w.x + f.rx * g.rad * 0.8, w.y, w.z + f.rz * g.rad * 0.8, { n: 2, size: 0.45, speed: 1.8, up: 1.4 });
        }
        if (!g.air) (this.giantStrokes ??= []).push({ s0: g.ps ?? g.s, lat0: g.pl ?? g.lat, s1: g.s, lat1: g.lat, width: g.rad * 0.75 });
        g.ps = g.s;
        g.pl = g.lat;
        // a thump off a fence or a landing
        if (g.bump > (g.bumpSeen ?? 0)) {
          g.bumpSeen = g.bump;
          this.fx.poof(w.x, (g.y ?? w.y), w.z, { n: 14, size: 0.6, speed: 3.5, up: 2.4 });
          if (this.near({ pos: w }, 45)) this.sound.bump();
        }
        const d = Math.hypot(w.x - this.me.pos.x, w.z - this.me.pos.z);
        rumble = Math.max(rumble, Math.max(0, 1 - d / 45) * Math.min(1, g.rad));
      });
      this.fx.hideGiants(r.giants.length);
      this.sound.rumble?.(rumble);
      if (rumble > 0.4) r.shake = Math.max(r.shake, (rumble - 0.4) * 0.25);
      // drafting: wind lines streaming past you
      if (this.me.draftBehind && !this.me.rider.air) {
        const hd = frameAt(r.course, this.me.rider.s).heading + this.me.rider.yaw;
        this.fx.draftLines(this.me.pos.x, this.me.pos.y, this.me.pos.z, [Math.sin(hd), -Math.cos(hd)], this.me.rider.speed, simDt);
      }
      const fwd = [Math.sin(frameAt(r.course, this.me.rider.s).heading), 0, -Math.cos(frameAt(r.course, this.me.rider.s).heading)];
      this.fx.speedMotes(this.camera.position, fwd, this.me.rider.speed, simDt, r.mountain.time === 'night');
      // snow cannons near you blow their plumes
      for (const cn of this.world.cannons ?? []) if (Math.abs(cn.s - this.me.rider.s) < 160) this.fx.plume(cn, simDt);
      this.fx.update(simDt);
      this.sound.ride(this.me.rider.speed, Math.abs(this.me.rider.edge), !this.me.rider.air, this.mode !== 'countdown', this.me.rider.skid ?? 0);
    } else if (!r.camPos) this.placeCamera(0, true);
    this.world.clock = this.race.clock;
    this.world.update(simDt, this.me.rider.s, this.me.pos);
    this.sky.follow(new THREE.Vector3(this.me.pos.x, this.me.pos.y, this.me.pos.z), 24);
    if (this.trails && simDt > 0) {
      const strokes = this.giantStrokes?.length ? (this.strokes ?? []).concat(this.giantStrokes) : this.strokes ?? [];
      this.trails.update(this.me.rider.s - 60, strokes);
    }
    if (this.giantStrokes) this.giantStrokes.length = 0;
    const st = standings(this.racers);
    const place = st.indexOf(this.me) + 1;
    this.nameTags();
    this.hud.update(simDt, { racers: this.racers, me: this.me, place, total: this.racers.length, time: r.clock, speed: this.me.rider.speed, slots: this.me.slots, course: r.course, world: this.world });
    // the side mirror: a rear view on the left while someone is right behind you or passing
    this.mirror ??= new SideMirror(this.renderer, this.hud.el);
    const heading = frameAt(r.course, this.me.rider.s).heading + this.me.rider.yaw;
    const others = (this._others ??= []);
    others.length = 0;
    for (const x of this.racers) if (x !== this.me && !x.gone) others.push(x);
    this.mirror.update(dt, { pos: this.me.pos, heading }, others, { active: this.mode === 'race' && !(this.me.liftT > 0), scene: this.scene, exposure: (r.mountain.grade?.exposure ?? 1) * 0.82 });
    this.pipe.render();
    if (this.mirror.wantSnap) {
      // the panel's still looks back at riders the main camera hides (they are right by its lens)
      for (const x of others) x.model.root.visible = true;
      this.mirror.draw();
      this.keepOutOfLens();
    }
  }

  /**
   * Name tags over the other riders near you (yours shows on the podium and on
   * your friends' screens, not over your own head while you ride). Tags that
   * would sit on top of each other: the farther one is lifted and faded.
   */
  nameTags() {
    const list = [];
    for (const rc of this.racers) {
      if (rc.me || rc.gone || !rc.model.root.visible) continue;
      const d = Math.hypot(rc.pos.x - this.camera.position.x, rc.pos.z - this.camera.position.z);
      if (d > 45) continue;
      const at = this.toScreen(rc.pos.x, rc.pos.y + 1.55, rc.pos.z);
      if (!at) continue;
      list.push({ key: rc.slot, name: rc.name, x: at[0], y: at[1], d, alpha: Math.min(1, (45 - d) / 15) });
    }
    list.sort((a, b) => a.d - b.d);
    const placed = [];
    for (const t of list) {
      for (let tries = 0; tries < 3; tries++) {
        const hit = placed.find((p) => Math.abs(p.x - t.x) < 70 && Math.abs(p.y - t.y) < 20);
        if (!hit) break;
        t.y = hit.y - 22;
        t.alpha *= 0.7;
      }
      placed.push(t);
    }
    this.hud.tags(placed);
  }

  /** Name tags over the podium. */
  podiumTags() {
    const cam = this.stage.camera;
    const list = [];
    const v = new THREE.Vector3();
    (this.stage.podiumRiders ?? []).forEach((m, i) => {
      m.root.getWorldPosition(v);
      v.y += 1.25 * m.root.scale.y;
      v.project(cam);
      if (v.z > 1) return;
      list.push({ key: `pod${i}`, name: m.label ?? '', x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, me: m.me });
    });
    this.hud.tags(list);
  }

  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    return [(v.x * 0.5 + 0.5) * this.w, (-v.y * 0.5 + 0.5) * this.h];
  }

  /** Pick the quality from the first seconds of riding (auto only), stepping down if frames run long. */
  tierProbe(dt) {
    if (!this.autoTier || !this.probe || this.mode !== 'race') return;
    const p = this.probe;
    p.t += dt;
    p.frames++;
    p.acc += dt;
    if (p.t < 1) {
      p.frames = 0;
      p.acc = 0;
      return;
    }
    if (p.t > 3.5) {
      const avg = (p.acc / Math.max(1, p.frames)) * 1000;
      const i = TIER_ORDER.indexOf(this.tierName);
      if (avg > 24 && i > 0) {
        this.setTier(TIER_ORDER[i - 1]);
        this.hud.toast(`Smoother quality: ${this.tierName}`, 2);
        this.probe = { t: 0, frames: 0, acc: 0 };
      } else this.probe = null;
    }
  }

  /* ---------------------------------------------------------------- test and cover hooks */

  /** Put you at (s, lat) at a speed (for screenshots and checks). */
  debugPlace({ s = 120, lat = 0, speed = 22, yaw = 0, edge = 0 } = {}) {
    const rd = this.me.rider;
    rd.s = s;
    rd.lat = lat;
    rd.speed = speed;
    rd.yaw = yaw;
    rd.edge = edge;
    rd.head = yaw;
    settle(rd, this.race.course);
    snap(this.me);
    this.me.prev = { s, lat };
    this.race.camPos = null;
    // bring the rivals near so they're in the picture
    this.racers.filter((x) => !x.me).forEach((x, i) => {
      x.rider.s = s + 12 + i * 7;
      x.rider.lat = clamp(lat + (i % 2 ? 1 : -1) * (3.5 + i), -frameAt(this.race.course, s).width + 1, frameAt(this.race.course, s).width - 1);
      x.rider.speed = speed;
      x.rider.head = x.rider.yaw;
      settle(x.rider, this.race.course);
      snap(x);
      x.prev = { s: x.rider.s, lat: x.rider.lat };
    });
  }

  /** Put rival i at (your s + ds, your lat + dl), on the snow (for staged screenshots and videos). */
  debugPin(i, ds, dl, speed = null) {
    const o = this.racers.filter((x) => !x.me)[i];
    if (!o) return;
    const me = this.me.rider, rd = o.rider;
    rd.s = me.s + ds;
    rd.lat = me.lat + dl;
    rd.speed = speed ?? me.speed;
    rd.yaw = me.yaw;
    rd.head = me.head;
    rd.tumble = rd.spinout = 0;
    rd.air = false;
    rd.vyG = null;
    settle(rd, this.race.course);
    snap(o);
    o.prev = { s: rd.s, lat: rd.lat };
  }

  /** Throw a snowball from you at the rider just ahead (for the hit screenshot). */
  debugBonk() {
    const tgt = this.racers.find((x) => !x.me && x.local) ?? this.racers.find((x) => !x.me);
    if (!tgt) return false;
    tgt.rider.invuln = 0;
    tgt.rider.s = this.me.rider.s + 9;
    tgt.rider.lat = this.me.rider.lat + 1;
    if (!this.me.ammo) giveItem(this.me, 'snowballs', 1);
    this.tryThrow(this.me);
    return true;
  }

  /** Jump straight to the results (finishing everyone in order). */
  debugFinish() {
    const r = this.race;
    this.racers.forEach((x, i) => {
      x.finished = true;
      x.time = r.clock + 60 + i * 1.7 + (x.me ? -0.5 : 0);
    });
    const order = standings(this.racers).map((x) => ({ slot: x.slot, time: x.time }));
    this.showResults(order);
  }

  coverShot() {
    this.debugPlace({ s: 260, lat: -4, speed: 24, edge: 0.6, yaw: 0.2 });
    this.hud.show(false);
  }
}
