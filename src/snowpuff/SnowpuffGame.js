/**
 * Snowpuff Peaks — a cute, fast snowboard race for kids. Pick a plush rider
 * and a mountain, then race the others down: carve, tuck, jump the kickers,
 * spin and flip, grab stars, bonk rivals with snowballs. Alone against
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
import { buildCourse, frameAt, groundAt, toWorld, rng } from './course.js';
import { newRider, step, settle } from './physics.js';
import { newRacer, standings, rubberBand, checkFinish, pickups, pickTarget, canThrow, makeThrow, hittable, applyHit, useShield, tickRacer, flyProjectile, projectilePos, estimateFinish } from './race.js';
import { newBrain, think } from './ai.js';
import { makeRenderer, Pipeline, TIERS, TIER_ORDER, backendName } from './render/pipeline.js';
import { Sky, distantPeaks } from './render/sky.js';
import { SnowTrails } from './render/snow.js';
import { RiderModel } from './render/riderModel.js';
import { World } from './world.js';
import { Effects } from './fx.js';
import { SnowSound } from './audio.js';
import { Stage } from './stage.js';
import { Hud, Menus, Loading, TouchControls, el } from './hud.js';
import { OnlineRace } from './net.js';

const SAVE_KEY = 'snowpuff.save';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
    return { rider: SELECTABLE.includes(s.rider) ? s.rider : 'fox', mountain: MOUNTAINS.some((m) => m.id === s.mountain) ? s.mountain : 'marshmallow', best: s.best ?? {}, quality: s.quality ?? 'auto', sound: s.sound !== false, name: s.name ?? '' };
  } catch {
    return { rider: 'fox', mountain: 'marshmallow', best: {}, quality: 'auto', sound: true, name: '' };
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
    return this.codes[id].some((c) => this.pressed.has(c)) || (id === 'throw' && this.pressed.has('throw'));
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
      throw: this.hit('throw') || Boolean(pad?.throw),
      shield: this.hit('shield') || Boolean(pad?.shield),
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({ rider: this.picked, mountain: this.mountainId, best: this.save.best, quality: this.save.quality, sound: this.save.sound, name: this.save.name }));
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
    this.stage.setMountain(this.mountainId);
    step('Warming up the paint…', 0.7);
    this.resize();
    try {
      await this.renderer.compileAsync(this.stage.scene, this.stage.camera);
    } catch {
      /* compiled on first frame instead */
    }
    this.stagePipe.render();
    this.input = new Input(this.root);
    this.hud = new Hud(this.root, { touch: this.touch });
    this.hud.onThrow = () => this.input.pressed.add('throw');
    this.hud.onShield = () => this.input.pressed.add('Digit2');
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

  showRiders(after = () => this.showMountains()) {
    this.mode = 'menu';
    this.screen = 'riders';
    this.stage.focus('riders');
    this.menus.riders({
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

  showMountains() {
    this.mode = 'menu';
    this.screen = 'mountains';
    this.stage.focus('mountains');
    this.menus.mountains({
      picked: this.mountainId,
      best: this.save.best,
      onPick: (id) => {
        this.mountainId = id;
        this.stage.setMountain(id);
        this.persist();
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
      name: this.save.name || SPECIES[this.picked].name,
      species: this.picked,
      onChange: () => this.screen === 'lobby' && this.mode === 'menu' && this.renderLobby(),
      onGo: (g) => this.startRace({ mountain: g.mountain, slots: g.slots, online: true }),
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
        this.startRace({ mountain: n.mountain, slots, online: true });
      },
      onBack: () => {
        if (n.active) n.leave();
        else this.showTitle();
      },
      onMountain: (id) => n.setMountain(id)
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

  async startRace({ mountain, slots = null, online = false }) {
    if (this.mode === 'loading') return;
    this.sound.wake();
    this.mode = 'loading';
    this.menus.clear();
    this.loadingEl.show('Building the mountain…');
    const m = mountainById(mountain);
    this.mountainId = m.id;
    this.disposeRace();
    await new Promise((r) => setTimeout(r, 30));
    const course = buildCourse(m);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, this.w / this.h, 0.25, 5200);
    this.camera = camera;
    this.scene = scene;
    const sky = new Sky(scene, m);
    this.sky = sky;
    sky.setShadowSize(this.tier.shadow);
    this.loadingEl.set('Lighting the sky…', 0.05);
    await sky.environment(this.renderer);
    const trails = this.tier.trails && !this.params.has('notrails') ? new SnowTrails(this.renderer) : null;
    this.trails = trails;
    const world = new World({ scene, course, mountain: m, tier: this.tier, trails, sky });
    this.world = world;
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
      slots = [{ slot: 0, id: 'me', name: SPECIES[this.picked].name, species: this.picked, human: true }];
      for (let i = 0; i < m.rivals; i++) slots.push({ slot: i + 1, id: `ai${i + 1}`, name: null, species: others[i % others.length], human: false, kind: kinds[i] });
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
      r.model = new RiderModel(sl.species, { fur, res: r.me ? 74 : 60 });
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
    this.race = { course, mountain: m, online, clock: 0, count: 3.2, projectiles: [], pid: 0, finishedAt: null, results: null, finAt: new Map(), passT: 0, shake: 0, fov: 60, camPos: null, camLook: new THREE.Vector3(), passed: new Set() };
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
    for (let i = 0; i < 2; i++) this.pipe.render();
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
      this._hintT = setTimeout(() => (hint.style.display = 'none'), 14000);
    }
    this.racesRun = (this.racesRun ?? 0) + 1;
    this.probe = { t: 0, frames: 0, acc: 0 };
    this.root.focus({ preventScroll: true });
    // How to play, the first time (it holds the countdown while it's up)
    if (!online) this.help.openFirstTime();
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
      this.stagePipe.render();
      this.input?.endFrame();
      return;
    }
    if (!this.race) {
      this.input?.endFrame();
      return;
    }
    if (this.mode === 'results') {
      this.stage.update(dt, this.w / this.h);
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
    for (const rc of this.racers) settle(rc.rider, r.course);
    this.updateRiders(dt);
    if (r.count <= 0) {
      this.mode = 'race';
      r.started = true;
      for (const rc of this.racers) if (rc.local) rc.rider.speed = 4;
    }
  }

  simulate(dt, inp) {
    const r = this.race;
    const c = r.course;
    r.clock += dt;
    const me = this.me;
    const online = r.online;
    // ---- you
    if (!me.finished) {
      const ev = step(me.rider, { steer: inp.steer ?? 0, tuck: inp.tuck, jump: inp.jump, flip: inp.flip ?? 0 }, c, dt);
      this.riderEvents(me, ev);
      if (inp.throw) this.tryThrow(me);
      if (inp.shield && useShield(me)) {
        this.sound.shieldOn();
        this.fx.shieldBurst(me.pos.x, me.pos.y, me.pos.z);
      }
      for (const e of pickups(me, c, r.clock)) this.pickupEvent(me, e);
      if (checkFinish(me, c, r.clock)) this.onFinish(me);
    } else {
      step(me.rider, {}, c, dt, { brake: true });
    }
    tickRacer(me, dt);
    // ---- the AI riders I run (single player, or the host)
    for (const rc of this.racers) {
      if (rc === me) continue;
      if (rc.local) {
        if (rc.finished) {
          step(rc.rider, {}, c, dt, { brake: true });
          continue;
        }
        const ai = think(rc.brain, rc, c, this.racers, dt);
        const humanS = online ? Math.max(...this.racers.filter((x) => x.human).map((x) => x.rider.s)) : me.rider.s;
        const ev = step(rc.rider, ai, c, dt, { pull: rubberBand(rc.rider.s, humanS) });
        this.riderEvents(rc, ev);
        if (ai.throw) this.tryThrow(rc);
        if (ai.shield && useShield(rc)) this.fx.shieldBurst(rc.pos.x, rc.pos.y, rc.pos.z);
        pickups(rc, c, r.clock);
        tickRacer(rc, dt);
        if (checkFinish(rc, c, r.clock)) this.onFinish(rc);
      } else {
        this.applyRemote(rc);
      }
    }
    // ---- snowballs
    for (let i = r.projectiles.length - 1; i >= 0; i--) {
      const p = r.projectiles[i];
      if (flyProjectile(p, dt) === 'arrived') {
        r.projectiles.splice(i, 1);
        this.arrive(p);
      }
    }
    // ---- online: send states; the host closes the race
    if (online && this.net?.active) {
      this.net.tick(dt, me, this.racers.filter((x) => x.local && !x.human));
      if (this.net.isHost) this.hostFinishCheck();
    }
    if (!online) this.localFinishCheck();
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
    rd.wobble = st.wobble ? 0.3 : 0;
    rd.boost = st.boost ? 0.2 : 0;
    rd.carve = Math.abs(st.edge);
    rc.shieldT = st.shield ? 1 : 0;
    rc.stars = st.stars;
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
          if (near) this.fx.boostBurst(rc.pos.x, rc.pos.y, rc.pos.z);
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
        if (near) this.fx.poof(rc.pos.x, rc.pos.y + 0.3, rc.pos.z, { n: 34, size: 0.55, speed: 4, up: 3 });
        if (rc.me) {
          this.sound.bump();
          this.hud.say(['Boing!', 'Oopsie!', 'Bumpity!'][Math.floor(Math.random() * 3)], 'info');
          this.race.shake = 0.5;
        }
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
    if (e.type === 'star') {
      this.world.take(e.id);
      this.fx.starBurst(p.x, p.y + 0.8, p.z);
      this.sound.star(Math.min(8, rc.streak.length * 2));
    } else if (e.type === 'streak') {
      this.hud.say('Star streak! Boost!', 'boost');
      this.sound.boost();
      this.fx.boostBurst(p.x, p.y, p.z);
    } else if (e.type === 'pile') {
      this.world.take(e.id);
      this.sound.pile();
      this.fx.poof(p.x, p.y, p.z, { n: 12, size: 0.35, speed: 2, up: 2 });
      if (!this.race.ammoTold) {
        this.race.ammoTold = true;
        this.hud.toast(this.touch ? 'Snowballs! Tap the snowball button to throw.' : 'Snowballs! Press 1 (or click) to throw at the rider ahead.');
      }
    } else if (e.type === 'shield-item') {
      this.world.take(e.id);
      this.sound.shieldItem();
      this.fx.shieldBurst(p.x, p.y, p.z);
      this.hud.toast(this.touch ? 'A snow shield! Tap the blue button.' : 'A snow shield! Press 2 to put it up.');
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
    if (tgt.local) applyHit(tgt);
    else tgt.bonks += 1;
    const from = this.racers.find((x) => x.slot === fromSlot);
    if (from) from.hits += 1;
    this.fx.poof(p.x, p.y + 0.8, p.z, { n: 30, size: 0.45, speed: 3.5, up: 2.5 });
    this.fx.sparkles(p.x, p.y + 1, p.z, { n: 10, col: new THREE.Color('#ffffff'), speed: 3 });
    const near = Math.hypot(p.x - this.camera.position.x, p.z - this.camera.position.z);
    this.sound.bonk(clamp(1.4 - near / 40, 0.2, 1));
    const sp = this.toScreen(p.x, p.y + 1.6, p.z);
    if (sp) this.hud.bonk(sp[0], sp[1], tgt.me ? 'BONK! Spin!' : 'BONK!', from?.me);
    if (tgt.me) this.race.shake = 0.45;
  }

  netMessage(m) {
    const r = this.race;
    if (m.t === 'throw' && r) {
      if (!r.projectiles.some((p) => p.id === m.p.id)) r.projectiles.push(m.p);
      this.sound.throwBall();
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
      return rc ? { slot: rc.slot, name: rc.name, species: rc.species, me: rc.me, human: rc.human, time: o.time, stars: rc.stars, tricks: rc.tricks, bonks: rc.hits } : null;
    }).filter(Boolean);
    const meRow = rows.find((x) => x.me) ?? rows[0];
    const place = rows.indexOf(meRow) + 1;
    const m = r.mountain;
    const old = this.save.best[m.id];
    const newBest = !old || meRow.time < old.time;
    if (newBest) this.save.best[m.id] = { time: meRow.time, place };
    else if (place < old.place) this.save.best[m.id] = { ...old, place };
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
      rows, mountain: m, me: { place, time: meRow.time, stars: meRow.stars, newBest }, online: r.online,
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
    for (const rc of this.racers) {
      const rd = rc.rider;
      const f = frameAt(c, rd.s, rc.f ??= {});
      const x = f.x + f.rx * rd.lat, z = f.z + f.rz * rd.lat;
      rc.pos.x = x;
      rc.pos.y = rd.y;
      rc.pos.z = z;
      const root = rc.model.root;
      root.position.set(x, rd.y, z);
      // tilt the rider with the slope underfoot
      root.rotation.order = 'YXZ';
      rc.model.pose(dt, {
        heading: f.heading, yaw: rd.yaw, spin: rd.spin, flip: rd.flip, edge: rd.edge, tuck: rd.tuck, charge: rd.charge, speed: rd.speed, air: rd.air,
        tumbleK: rd.tumble > 0 ? clamp(rd.tumble / 0.95, 0, 1) : 0, spinoutK: rd.spinout > 0 ? clamp(rd.spinout / 1.2, 0, 1) : 0, wobble: rd.wobble, landed: rc.landed ?? 0
      });
      root.rotation.x = rd.air ? 0 : -f.pitch * 0.85;
      rc.landed = 0;
      rc.shieldMesh.visible = rc.shieldT > 0;
      if (rc.shieldT > 0) rc.shieldMesh.rotation.y += dt * 1.5;
      // spray and trails (only on the snow, moving)
      if (!rd.air && rd.speed > 3 && !rc.gone) {
        const side = Math.sign(rd.edge || 0.0001);
        const yawW = f.heading + rd.yaw;
        const fwd = [Math.sin(yawW), -Math.cos(yawW)];
        const right = [-fwd[1], fwd[0]];
        const camD = Math.hypot(x - this.camera.position.x, z - this.camera.position.z);
        if (camD < 70) this.fx.spray(x, rd.y, z, [right[0] * side, right[1] * side], fwd, rd.speed, rd.carve, dt);
        strokes.push({ s0: rc.prev.s, lat0: rc.prev.lat, s1: rd.s, lat1: rd.lat, width: 0.17 + rd.carve * 0.14 });
      }
      rc.prev.s = rd.s;
      rc.prev.lat = rd.lat;
    }
    this.strokes = strokes;
  }

  placeCamera(dt, snap = false) {
    const r = this.race;
    const me = this.me;
    const rd = me.rider;
    const c = r.course;
    const f = frameAt(c, rd.s, {});
    const speed = rd.speed;
    const k = clamp((speed - 8) / 22, 0, 1);
    const yawW = f.heading + rd.yaw * 0.35;
    const fx = Math.sin(yawW), fz = -Math.cos(yawW);
    const dist = 4.4 + k * 0.9 + (rd.air ? 0.8 : 0);
    const height = 1.75 + k * 0.25 + (rd.air ? 0.4 : 0);
    const target = new THREE.Vector3(me.pos.x, me.pos.y + 0.85, me.pos.z);
    const behindS = rd.s - dist * 0.95;
    const groundBehind = groundAt(c, Math.max(0, behindS), rd.lat * 0.9);
    const desired = new THREE.Vector3(target.x - fx * dist, Math.max(target.y + height - (target.y - groundBehind) * 0.15, groundBehind + 1.1), target.z - fz * dist);
    if (snap || !r.camPos) {
      r.camPos = desired.clone();
      r.camLook.copy(target);
    }
    const kp = 1 - Math.exp(-dt * (rd.air ? 4 : 7.5));
    r.camPos.lerp(desired, kp);
    const look = new THREE.Vector3(target.x + fx * 7, target.y - 0.4 - k * 0.3, target.z + fz * 7);
    r.camLook.lerp(look, 1 - Math.exp(-dt * 9));
    // shake: a hum at top speed, kicks on bumps and landings
    r.shake = Math.max(0, r.shake - dt * 1.8);
    const hum = k > 0.6 ? (k - 0.6) * 0.05 : 0;
    const s = hum + r.shake * 0.18;
    const t = this.time;
    const cam = this.camera;
    cam.position.set(r.camPos.x + Math.sin(t * 37) * s, r.camPos.y + Math.sin(t * 43 + 1) * s, r.camPos.z + Math.cos(t * 31) * s);
    cam.lookAt(r.camLook);
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

  renderRace(dt) {
    const r = this.race;
    const simDt = this.mode === 'race' || this.mode === 'finish' || this.mode === 'countdown' ? dt : 0;
    if (simDt > 0 && this.mode !== 'countdown') this.updateRiders(simDt);
    if (simDt > 0) {
      this.placeCamera(simDt);
      this.passBy();
      // snowballs in the air
      r.projectiles.forEach((p, i) => {
        const at = projectilePos(p, this.racers, r.course, {});
        const w = toWorld(r.course, at.s, at.lat, 0, {});
        this.fx.ball(i, w.x, at.y, w.z);
      });
      this.fx.hideBalls(r.projectiles.length);
      const fwd = [Math.sin(frameAt(r.course, this.me.rider.s).heading), 0, -Math.cos(frameAt(r.course, this.me.rider.s).heading)];
      this.fx.speedMotes(this.camera.position, fwd, this.me.rider.speed, simDt, r.mountain.time === 'night');
      this.fx.update(simDt);
      this.sound.ride(this.me.rider.speed, this.me.rider.carve, !this.me.rider.air, this.mode !== 'countdown');
    } else if (!r.camPos) this.placeCamera(0, true);
    this.world.update(simDt, this.me.rider.s, this.me.pos);
    this.sky.follow(new THREE.Vector3(this.me.pos.x, this.me.pos.y, this.me.pos.z), 24);
    if (this.trails && simDt > 0) this.trails.update(this.me.rider.s - 60, this.strokes ?? []);
    const st = standings(this.racers);
    const place = st.indexOf(this.me) + 1;
    this.hud.update(simDt, { racers: this.racers, me: this.me, place, total: this.racers.length, time: r.clock, speed: this.me.rider.speed, ammo: this.me.ammo, shieldItem: this.me.shieldItem, course: r.course, world: this.world });
    this.pipe.render();
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
    settle(rd, this.race.course);
    this.me.prev = { s, lat };
    this.race.camPos = null;
    // bring the rivals near so they're in the picture
    this.racers.filter((x) => !x.me).forEach((x, i) => {
      x.rider.s = s + 6 + i * 5;
      x.rider.lat = lat + (i % 2 ? 3 : -3) * (1 + i * 0.3);
      x.rider.speed = speed;
      settle(x.rider, this.race.course);
      x.prev = { s: x.rider.s, lat: x.rider.lat };
    });
  }

  /** Throw a snowball from you at the rider just ahead (for the hit screenshot). */
  debugBonk() {
    const tgt = this.racers.find((x) => !x.me && x.local) ?? this.racers.find((x) => !x.me);
    if (!tgt) return false;
    tgt.rider.invuln = 0;
    tgt.rider.s = this.me.rider.s + 9;
    tgt.rider.lat = this.me.rider.lat + 1;
    this.me.ammo = Math.max(1, this.me.ammo);
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
