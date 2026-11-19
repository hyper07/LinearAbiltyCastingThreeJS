/**
 * Kindlewatch — the opening map of a top-down action game in a hand-painted
 * style: a snowed-in fortress whose braziers you relight while you fight
 * through its courtyards to the frost giant on the Rime Throne.
 *
 *   const game = new KindlewatchGame(document.body, { onClose });
 *   await game.open();   …   game.close();
 *
 * Everything is painted in code when it loads (art/), lit in real time by
 * the fires (render.js), and played with keyboard and mouse, a gamepad or
 * touch. URL options: ?debug shows frame time and draw calls, ?touch forces
 * touch controls, ?fresh ignores the save, ?scale=0.75 renders smaller.
 */
import { PowerLoop } from '../shared/power.js';
import { HelpPanel, helpButton } from '../shared/helpPanel.js';
import { CONTROLS } from './controls.js';
import * as THREE from 'three';
import '@fontsource-variable/nunito/wght.css';
import './kindlewatch.css';
import { Atlas } from './atlas.js';
import { propJobs, paintAll } from './art/index.js';
import { wardenParts, runnerParts } from './art/heroes.js';
import { impParts, slimeParts, sentinelParts, archerParts, gorehornParts, jarlParts } from './art/foes.js';
import { fxJobs } from './art/fx.js';
import { Stage } from './render.js';
import { Level, groundTextures, maskTexture, shadowField, shadowTexture } from './world.js';
import { W, H, START, ROOMS, SPAWNS, BEACONS, roomAt, rng } from './map.js';
import { HEROES, ENEMIES, SLIME, inArc, hitStopFor, shakeFor, gainEnergy, ENERGY, splitSlime, migrateSave, newSave, POTIONS_MAX } from './rules.js';
import { Hero, Enemy, Projectile, Summon, Pickup, surface } from './actors.js';
import { Effects } from './fx.js';
import { Input } from './input.js';
import { KeepSound } from './audio.js';
import { Hud, Panels, Loading, TouchControls, el } from './hud.js';

const SAVE_KEY = 'kindlewatch.save';
const VIEW_H = 10.5;
const FIRE = [1, 0.37, 0.09];

const store = {
  load() {
    try {
      return migrateSave(localStorage.getItem(SAVE_KEY));
    } catch {
      return newSave();
    }
  },
  save(s) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* private mode: fine */
    }
  }
};

export class KindlewatchGame {
  constructor(host, { onClose, account } = {}) {
    this.host = host ?? document.body;
    this.onClose = onClose;
    this.root = el('div', 'kw');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Kindlewatch');
    this.host.append(this.root);
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('debug');
    this.touch = (window.matchMedia?.('(pointer: coarse)').matches ?? false) || this.params.has('touch');
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.save = this.params.has('fresh') ? newSave() : store.load();
    this.picked = this.save.hero;
    this.mode = 'loading';
    this.time = 0;
    this.rand = rng(1234);
    this.sound = new KeepSound();
    this.sound.setVolume(this.save.settings.sound);
    window.kindlewatch = this;
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const step = (label, k) => this.loading?.set(label, k);
    const t0 = performance.now();
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, depth: false });
    this.renderer = renderer;
    renderer.info.autoReset = false;
    renderer.domElement.className = 'kw-view';
    this.root.prepend(renderer.domElement);
    this.overlay = el('canvas', 'kw-over');
    this.root.append(this.overlay);
    this.og = this.overlay.getContext('2d');
    step('Laying out the keep', 0.03);
    await new Promise((r) => setTimeout(r, 0));
    this.level = new Level();
    const atlas = new Atlas(4096);
    const jobs = [...propJobs(), ...fxJobs(), ...[wardenParts, runnerParts, impParts, slimeParts, sentinelParts, archerParts, gorehornParts, jarlParts].map((f) => () => f())];
    await paintAll({ add: (b) => (Array.isArray(b) ? b.forEach((x) => atlas.add(x)) : atlas.add(b)) }, jobs, (k) => step(k < 0.5 ? 'Painting the stones' : k < 0.8 ? 'Inking the heroes and their foes' : 'Mixing the fire', 0.05 + k * 0.7));
    if (this.closed) return;
    atlas.pack();
    this.atlas = atlas;
    step('Laying snow and ice', 0.8);
    await new Promise((r) => setTimeout(r, 0));
    const ground = groundTextures();
    ground.mask = maskTexture(this.level.grid, this.level.masks);
    step('Casting the shadows', 0.9);
    await new Promise((r) => setTimeout(r, 0));
    this.sdf = shadowTexture(shadowField(this.level.grid, this.level.wallH, this.level.props, this.level.open));
    this.stage = new Stage(renderer, { atlas, ground, sdf: this.sdf, mapW: W, mapH: H });
    this.loadMs = Math.round(performance.now() - t0);
    this.fx = new Effects();
    this.input = new Input(this.root, { touch: this.touch });
    this.hud = new Hud(this.root, { touch: this.touch });
    // How to play (H or I, the ? in the corner, the pause menu): the keep waits while it's up.
    this.help = new HelpPanel({
      host: this.root,
      id: 'kindlewatch',
      table: CONTROLS,
      onOpen: () => {
        this.panels.close();
        this._helpFrom = this.mode;
        this.mode = 'help';
      },
      onClose: () => {
        this.mode = this._helpFrom === 'pause' ? 'play' : this._helpFrom ?? 'play';
        this.root.focus();
      }
    });
    helpButton(this.root, () => this.openHelp(), { style: 'top:auto;bottom:12px;left:12px' });
    this.panels = new Panels(this.root, this);
    if (this.touch) {
      this.touchUi = new TouchControls(this.root, this.input);
      this.touchUi.show(false);
    }
    this.resize();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.reset();
    this.menu();
    step('Ready', 1);
    this.loading.hide();
    this.loading = null;
    let last = performance.now();
    let frames = 0;
    let acc = 0;
    let cpu = 0;
    // Power: at most 60 frames a second (not the display's 120), and none at all in a hidden tab.
    this.loop = new PowerLoop((ms, now) => {
      const raw = Math.max(0, Math.min(100, now - last));
      last = now;
      const c0 = performance.now();
      this.frame(Math.min(0.05, raw / 1000));
      cpu += performance.now() - c0;
      frames++;
      acc += raw;
      if (acc > 500) {
        this.fps = Math.round((frames * 1000) / acc);
        this.frameMs = +(acc / frames).toFixed(1);
        this.cpuMs = +(cpu / frames).toFixed(1);
        frames = 0;
        acc = 0;
        cpu = 0;
      }
    }, { fps: 60 }).start();
    this.ready = true;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.loop?.stop();
    this._resize?.disconnect();
    this.input?.dispose();
    this.touchUi?.dispose();
    this.hud?.dispose();
    this.stage?.dispose();
    this.sdf?.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.kindlewatch === this) delete window.kindlewatch;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || innerWidth;
    const h = this.root.clientHeight || innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const scale = Number(this.params.get('scale')) || (ratio > 1.4 ? 0.75 : 1);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.stage.resize(w, h, ratio, scale);
    this.overlay.width = Math.round(w * Math.min(ratio, 2));
    this.overlay.height = Math.round(h * Math.min(ratio, 2));
    this.overlayScale = Math.min(ratio, 2);
    this.viewH = w < h ? VIEW_H * 0.82 : w < 800 ? VIEW_H * 0.9 : VIEW_H;
  }

  /* ================================================================ the run */

  /** Everything back as it was when you first came: foes, fires, doors. */
  reset() {
    const lv = this.level;
    for (const p of lv.props) {
      if (p.lit0 === undefined) p.lit0 = !!p.lit;
      else p.lit = p.lit0;
      p.hp = p.kind === 'barricade' ? 3 : p.breakable ? 1 : undefined;
      p.flash = 0;
      p.shake = 0;
    }
    const wasOpen = lv.open.size > 0;
    lv.resetDoors();
    if (wasOpen) this.rebuildShadows();
    this.enemies = [];
    for (const [room, list] of Object.entries(SPAWNS)) {
      for (const s of list) this.enemies.push(new Enemy(s.type, s.x, s.y, rng(Math.floor(s.x * 31 + s.y * 7)), { size: s.size, room }));
    }
    this.jarl = this.enemies.find((e) => e.type === 'jarl');
    this.projectiles = [];
    this.summons = [];
    this.pickups = [];
    this.telegraphs = [];
    if (this.fx) this.fx = new Effects();
    this.hud?.noteEl.classList.remove('on');
    this.gems = 0;
    this.kills = 0;
    this.runTime = 0;
    this.seenRooms = new Set(['yard']);
    this.room = 'yard';
    this.checkpoint = { x: START.x, y: START.y };
    this.hero = new Hero(this.picked, START.x, START.y);
    this.cam = { x: START.x, y: START.y + 3 };
    this.stopT = 0;
    this.shakeAmt = 0;
    this.hurtPulse = 0;
    this.gateOpen = false;
    this.won = false;
    this.cine = null;
    this.timers = [];
  }

  /** Run fn after `secs` of game time (paused and frozen time don't count). */
  after(secs, fn) {
    this.timers.push({ t: secs, fn });
  }

  menu() {
    this.mode = 'menu';
    this.hud.show(false);
    this.touchUi?.show(false);
    this.menuT = 0;
    // The start screen looks at the great brazier, the chosen hero beside it.
    this.hero.x = 41.2;
    this.hero.y = 35.6;
    this.hero.aim = -0.4;
    this.cam.x = 35.2;
    this.cam.y = 37.8;
    this.panels.start(this.atlas, this.picked, (id) => this.pick(id), () => this.begin(), () => this.close(), this.save.gems);
  }

  pick(id) {
    if (!HEROES[id]) return;
    this.picked = id;
    this.sound.start();
    this.sound.play('ui');
    const { x, y, aim } = this.hero;
    this.hero = new Hero(id, x, y);
    this.hero.aim = aim;
    this.save.hero = id;
    store.save(this.save);
  }

  begin(hero = this.picked) {
    this.sound.start();
    this.picked = hero;
    this.reset();
    this.panels.close();
    this.mode = 'play';
    this.hud.show(true);
    this.touchUi?.show(true);
    this.hud.toast('Gatehouse Yard', 'Kindlewatch Keep — light the three beacons to raise the Rime Gate', 4);
    this.help.openFirstTime();
    this.save.runs++;
    store.save(this.save);
    this.root.focus();
  }

  /** How to play (from play or the pause menu). */
  openHelp() {
    if (this.mode !== 'play' && this.mode !== 'pause') return;
    this.help.open();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.panels.pause({
      onResume: () => this.resume(),
      onRestart: () => this.begin(),
      onLeave: () => this.close()
    });
  }

  resume() {
    this.panels.close();
    this.mode = 'play';
    this.root.focus();
  }

  heroDied() {
    this.deadAt = this.time;
  }

  rise() {
    this.panels.close();
    const h = new Hero(this.picked, this.checkpoint.x, this.checkpoint.y);
    h.potions = Math.max(3, this.hero.potions);
    h.energy = this.hero.energy;
    this.hero = h;
    this.mode = 'play';
    this.fx.embers(h.x, h.y, 0.2, { n: 24, speed: 2 });
    this.fx.flash(h.x, h.y, { r: 6, i: 3, life: 0.8 });
    // foes in your room stand down to where they started
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hp = e.maxHp;
      e.x = e.home.x;
      e.y = e.home.y;
      e.brain.go('idle');
    }
    this.root.focus();
  }

  toast(text, secs = 2) {
    this.hud.note(text, secs);
  }

  /* ================================================================ frame */

  frame(dt) {
    const r = this.renderer;
    r.info.reset();
    this.time += dt;
    const inp = this.input.read(this.stage.toScreen(this.hero.x, this.hero.y + 0.6));
    if (this.mode === 'help') {
      if (inp.pause || inp.help) this.help.close();
    } else if (this.mode === 'play' && inp.help) this.openHelp();
    else if (this.mode === 'play' && inp.pause) {
      this.pause();
    } else if (this.mode === 'pause' && inp.pause) this.resume();
    if (this.mode === 'play' && this.hero.dead && this.time - this.deadAt > 1.6 && !this.panels.open) {
      this.mode = 'dead';
      this.panels.fallen(() => this.rise());
    }
    let simDt = this.mode === 'play' || this.mode === 'dead' ? dt : 0;
    if (this.mode === 'menu') {
      this.menuT += dt;
      simDt = 0;
      this.hero.update(dt, { mx: 0, my: 0, aim: -0.35 + Math.sin(this.menuT * 0.4) * 0.2 }, this);
    }
    // hit-stop freezes the world for a few frames
    if (this.stopT > 0) {
      this.stopT -= dt;
      simDt = 0;
    }
    if (this.freeze) simDt = 0;
    if (simDt > 0) this.simulate(simDt, inp);
    this.fx.update(this.freeze ? 0 : dt, this.stage.view, 0.15);
    this.camera(dt);
    this.draw();
    // HUD and overlay
    this.hud.update(this, this.time);
    this.overlayDraw();
    if (this.debug || this.params.has('perf')) this.hud.perf.textContent = `${this.fps ?? 0} fps · ${this.frameMs ?? 0} ms/frame · cpu ${this.cpuMs ?? 0} ms · ${r.info.render.calls} draws · ${this.stage.lightCount} lights · ${this.stage.sprites.count} sprites`;
    this.drawCalls = r.info.render.calls;
  }

  simulate(dt, inp) {
    const h = this.hero;
    this.runTime += dt;
    if (this.cine) {
      this.cine.t += dt;
      if (this.cine.t > this.cine.dur) this.cine = null;
    }
    if (this.timers.length) {
      for (const tm of this.timers) tm.t -= dt;
      const due = this.timers.filter((tm) => tm.t <= 0);
      this.timers = this.timers.filter((tm) => tm.t > 0);
      for (const tm of due) tm.fn();
    }
    // touch: blows aim at the nearest foe
    if (this.touch && (inp.attack || inp.ranged) && !inp.aim) {
      const f = this.nearestFoe(h.x, h.y, 7);
      if (f) inp.aim = Math.atan2(f.y - h.y, f.x - h.x);
    }
    if (this.cine) {
      inp = { mx: 0, my: 0, aim: null };
    }
    h.update(dt, inp, this);
    this.telegraphs.length = 0;
    for (const e of this.enemies) {
      if (!this.awake(e)) continue;
      e.update(dt, this);
    }
    // bodies push apart
    const bodies = [h, ...this.enemies.filter((e) => !e.dead && e.z < 0.4)];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d > 0.001 && d < min) {
          const push = (min - d) * 0.5;
          const ma = a === h ? 0.3 : 1 / (a.mass ?? 1);
          const mb = 1 / (b.mass ?? 1);
          const k = 1 / (ma + mb);
          if (!(a === h && h.anim === 'dash')) {
            a.x -= (dx / d) * push * ma * k;
            a.y -= (dy / d) * push * ma * k;
          }
          b.x += (dx / d) * push * mb * k;
          b.y += (dy / d) * push * mb * k;
        }
      }
    }
    for (const e of this.enemies) if (e.dead && e.deadT > 0.8) e.gone = true;
    this.enemies = this.enemies.filter((e) => !e.gone);
    for (const p of this.projectiles) p.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.gone);
    for (const s of this.summons) s.update(dt, this);
    this.summons = this.summons.filter((s) => !s.gone);
    for (const p of this.pickups) p.update(dt, this);
    this.pickups = this.pickups.filter((p) => !p.gone);
    for (const p of this.level.props) {
      if (p.flash) p.flash = Math.max(0, p.flash - dt * 6);
      if (p.shake) p.shake = Math.max(0, p.shake - dt * 3);
    }
    // rooms
    const rm = roomAt(h.x, h.y);
    if (rm && rm !== this.room) {
      this.room = rm;
      if (!this.seenRooms.has(rm)) {
        this.seenRooms.add(rm);
        const R = ROOMS.find((x) => x.id === rm);
        this.hud.toast(R.name, rm === 'throne' ? 'Hrimgar, the Rime Jarl, waits on his throne' : rm === 'garden' || rm === 'cloister' || rm === 'rampart' ? 'A beacon stands cold here' : '', 3);
      }
    }
    // ambient sound: the nearest fire
    let fire = 0;
    for (const p of this.level.lights) if (p.lit) fire = Math.max(fire, 1 - Math.hypot(p.x + 0.5 - h.x, p.y + 0.5 - h.y) / 7);
    this.sound.ambient(Math.max(0, fire), this.time);
    // a prompt by things you can light
    const near = this.nearLightable(h);
    this.hud.prompt(near && !h.dead ? `<kbd>E</kbd> ${near.lit ? 'Douse' : 'Light'}${near.beacon ? ' the beacon' : ''}` : null, near ? this.stage.toScreen(near.x + 0.5, near.y + (near.kind === 'torch' ? 2.2 : 2.4)) : null);
    this.hurtPulse = Math.max(0, this.hurtPulse - dt * 2.5);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.6);
    if (this.jarl?.dead && !this.won) {
      this.won = true;
      this.sound.play('victory');
      this.save.jarl = true;
      this.save.gems += this.gems;
      store.save(this.save);
      this.after(2.6, () => {
        if (this.closed) return;
        this.mode = 'victory';
        const s = Math.floor(this.runTime);
        this.panels.victory({ time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, gems: this.gems, kills: this.kills }, () => this.resume());
      });
    }
  }

  awake(e) {
    if (e.dead) return true;
    if (e.brain.state !== 'idle') return true;
    return Math.hypot(e.x - this.hero.x, e.y - this.hero.y) < 16;
  }

  nearestFoe(x, y, max) {
    let best = null;
    let bd = max;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /* ================================================================ camera and drawing */

  camera(dt) {
    const h = this.hero;
    let tx = h.x + Math.cos(h.aim) * 1.1;
    let ty = h.y + 0.7 + Math.sin(h.aim) * 0.8;
    let lerp = 6;
    if (this.mode === 'menu') {
      tx = 35.2 + Math.sin(this.menuT * 0.12) * 0.5;
      ty = 37.8;
      lerp = 2;
    }
    if (this.cine) {
      tx = this.cine.x;
      ty = this.cine.y;
      lerp = 2.5;
    }
    const k = 1 - Math.exp(-lerp * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const vh = this.viewH;
    const vw = vh * (this.stage.cssW / this.stage.cssH);
    this.cam.x = Math.max(vw / 2 + 1, Math.min(W - vw / 2 - 1, this.cam.x));
    this.cam.y = Math.max(vh / 2, Math.min(H - vh / 2, this.cam.y));
    const s = this.reduced || !this.save.settings.shake ? 0 : this.shakeAmt;
    const sx = s ? (Math.sin(this.time * 71) + Math.sin(this.time * 113)) * 0.5 * s : 0;
    const sy = s ? (Math.sin(this.time * 89) + Math.sin(this.time * 61)) * 0.5 * s : 0;
    this.stage.setView(this.cam.x + sx, this.cam.y + sy, vh);
  }

  /** Lights this frame: fires (flickering), summons, flying fire, flashes, the Veilrunner's lantern. */
  gatherLights() {
    const L = this.stage.lights;
    L.length = 0;
    const t = this.time;
    for (const p of this.level.lights) {
      if (!p.lit) continue;
      const fl = Math.sin(t * 11 + p.id) * 0.06 + Math.sin(t * 23.7 + p.id * 3) * 0.04;
      if (p.kind === 'torch') L.push({ x: p.x + 0.5, y: p.y + 0.92, h: 1.55, r: 7.5, c: [1, 0.55, 0.24], i: 2.0 * (1 + fl) });
      else if (p.kind === 'greatbrazier') L.push({ x: p.x + 0.5, y: p.y + 0.5, h: 2.7, r: 13, c: FIRE, i: 3.3 * (1 + fl) });
      else L.push({ x: p.x + 0.5, y: p.y + 0.5, h: 2.3, r: 10.5, c: FIRE, i: 2.7 * (1 + fl) });
    }
    for (const s of this.summons) L.push(s.light);
    for (const p of this.projectiles) {
      if (p.kind === 'ember' || p.kind === 'axe') L.push({ x: p.x, y: p.y, h: p.z + 0.3, r: 3.6, c: [1, 0.5, 0.18], i: 1.6, shadow: false });
      else if (p.kind === 'lance') L.push({ x: p.x, y: p.y, h: p.z + 0.3, r: 4.2, c: [1, 0.8, 0.45], i: 1.8, shadow: false });
    }
    for (const l of this.fx.lights) L.push({ x: l.x, y: l.y, h: l.h, r: l.r, c: l.c, i: l.i, shadow: false });
    const h = this.hero;
    if (h.kind === 'runner' && !h.dead) L.push({ x: h.x - (h.flip ? -0.12 : 0.12), y: h.y + 0.05, h: 0.45, r: 4.2, c: [1, 0.7, 0.35], i: 1.1 + Math.sin(t * 9) * 0.05, shadow: false });
    if (h.anim === 'charge') L.push({ x: h.x, y: h.y, h: 0.8, r: 2.5 + h.charge * 2, c: [1, 0.55, 0.2], i: 1.2 * h.charge, shadow: false });
    // the imps glow
    for (const e of this.enemies) if (e.type === 'imp' && !e.dead && Math.abs(e.x - this.cam.x) < 16) L.push({ x: e.x, y: e.y, h: 0.9, r: 2.6, c: [1, 0.45, 0.15], i: 0.9, shadow: false });
    if (this.jarl && !this.jarl.dead && this.room === 'throne') L.push({ x: this.jarl.x, y: this.jarl.y + 0.2, h: 3.4, r: 6, c: [0.45, 0.7, 1.0], i: 0.9, shadow: false });
  }

  draw() {
    const st = this.stage;
    const atlas = this.atlas;
    const t = this.time;
    this.gatherLights();
    const lit = this.level.props.filter((p) => p.beacon && p.lit).length;
    this.level.draw(st, atlas, st.view, t, lit);
    // fire on braziers and torches
    for (const p of this.level.lights) {
      if (!p.lit) continue;
      if (p.x < st.view.x - 3 || p.x > st.view.x + st.view.w + 3 || p.y < st.view.y - 4 || p.y > st.view.y + st.view.h + 2) continue;
      const great = p.kind === 'greatbrazier';
      const torch = p.kind === 'torch';
      const fx = p.x + 0.5;
      const fy = torch ? p.y + 1 + 1.12 : p.y + 0.48 + (great ? 1.72 : 1.42);
      const sc = torch ? 0.55 : great ? 1.55 : 1.15;
      const fr = Math.floor(t * 14 + p.id * 3) % 8;
      st.fxAdd.push(atlas.get('fx/glow'), fx, fy + 0.2 * sc, { w: 2.4 * sc, h: 2.0 * sc, color: [1.0, 0.42, 0.12], alpha: 0.3 });
      st.fxAdd.push(atlas.get(`fx/flame-${fr}`), fx - 0.1 * sc, fy, { w: 0.7 * sc, h: 1.1 * sc, oy: 0.08, color: [1.7, 0.85, 0.35], alpha: 0.85, flip: fr % 2 === 0 });
      st.fxAdd.push(atlas.get(`fx/flame-${(fr + 3) % 8}`), fx + 0.12 * sc, fy, { w: 0.6 * sc, h: 0.9 * sc, oy: 0.08, color: [1.7, 0.9, 0.4], alpha: 0.8, flip: fr % 2 === 1 });
      st.fxAdd.push(atlas.get(`fx/flame-${(fr + 5) % 8}`), fx, fy, { w: 0.85 * sc, h: 1.35 * sc, oy: 0.08, color: [2.0, 1.2, 0.55], alpha: 0.9 });
      if (this.mode !== 'pause' && this.fx.r() < (torch ? 0.25 : 0.6)) this.fx.embers(fx, fy - 0.2 * sc, 0.3, { n: 1, speed: 0.8 * sc, life: 1.4, size: 0.06 });
    }
    // shadows under bodies, stretched away from the nearest fire
    const shadow = atlas.get('shadow');
    const blob = (x, y, r, a = 0.8) => {
      let best = null;
      let bd = 9;
      for (const l of st.lights) {
        if (l.shadow === false || (l.i ?? 0) < 1.5) continue;
        const d = Math.hypot(l.x - x, l.y - y);
        if (d < bd && d < l.r * 0.8) {
          bd = d;
          best = l;
        }
      }
      st.decals.push(shadow, x, y, { sx: r * 3, sy: r * 3, flat: true, alpha: a });
      if (best) {
        const ang = Math.atan2(y - best.y, x - best.x);
        const k = Math.max(0, 1 - bd / (best.r * 0.8));
        st.decals.push(shadow, x + Math.cos(ang) * r * 1.4, y + Math.sin(ang) * r * 1.4, { sx: r * (2.6 + 2 * k), sy: r * 1.6, rot: ang, flat: true, alpha: 0.5 * k });
      }
    };
    this.fx.drawPrints(st, atlas);
    for (const k of this.fx.skids) st.decals.push(atlas.get('fx/spark'), k.x, k.y, { rot: k.rot, flat: true, sx: 1.4, sy: 0.9, alpha: Math.min(1, (k.life - k.t) / 1.5) * 0.7, tint: [0.95, 1, 1.05], gloss: 1 });
    const h = this.hero;
    if (!h.dead || this.mode === 'dead') blob(h.x, h.y, 0.32, h.dead ? 0.5 : 0.85);
    for (const e of this.enemies) {
      if (!this.onScreen(e.x, e.y)) continue;
      blob(e.x, e.y, e.r * (e.type === 'jarl' ? 1.3 : 1.05) * (1 - Math.min(0.5, e.z * 0.15)), e.dead ? Math.max(0, 0.8 - e.deadT) : 0.85);
    }
    for (const p of this.pickups) blob(p.x, p.y, 0.12, 0.5);
    for (const s of this.summons) if (s.kind === 'hound') blob(s.x, s.y, 0.3, 0.4);
    if (h.anim === 'charge') {
      const c = h.charge;
      st.fxAdd.push(atlas.get('fx/ring'), h.x, h.y + 0.02, { w: 1.6 + c * 1.4, h: (1.6 + c * 1.4) * 0.6, color: [1.6 * c, 0.8 * c, 0.25 * c], alpha: 0.5 + 0.4 * Math.sin(t * 24) * c });
      st.fxAdd.push(atlas.get('fx/glow'), h.x, h.y + 0.6, { w: 1.6 + c, h: 1.8 + c, color: [0.8 * c, 0.4 * c, 0.12 * c], alpha: 0.6 });
    }
    // telegraphs on the floor, then the bodies
    for (const tg of this.telegraphs) st.tele.push(tg.shape, tg.color);
    if (this.mode !== 'menu' || true) h.draw(st, atlas, t);
    for (const e of this.enemies) if (this.onScreen(e.x, e.y)) e.draw(st, atlas, t);
    for (const p of this.pickups) p.draw(st, atlas, t);
    for (const p of this.projectiles) p.draw(st, atlas);
    for (const s of this.summons) s.draw(st, atlas, t);
    this.fx.draw(st, atlas, t);
    const fu = st.finalMat.uniforms;
    fu.uHurt.value = this.hurtPulse * 0.6 + (h.dead ? 0.5 : 0) + (h.hp / h.maxHp < 0.25 && !h.dead ? 0.25 + 0.15 * Math.sin(t * 5) : 0);
    fu.uPulse.value = this.reduced ? 0 : this.pulse ?? 0;
    this.pulse = Math.max(0, (this.pulse ?? 0) - 0.05);
    st.render(t);
  }

  onScreen(x, y) {
    const v = this.stage.view;
    return x > v.x - 3 && x < v.x + v.w + 3 && y > v.y - 5 && y < v.y + v.h + 2;
  }

  overlayDraw() {
    const g = this.og;
    const s = this.overlayScale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.overlay.width, this.overlay.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    // foes' health, small and only once hurt
    for (const e of this.enemies) {
      if (e.dead || e.hp >= e.maxHp || e.type === 'jarl' || !this.onScreen(e.x, e.y)) continue;
      const [x, y] = this.stage.toScreen(e.x, e.y + e.z + (e.type === 'gorehorn' ? 1.9 : e.type === 'slime' ? 0.3 + e.size * 0.3 : 1.45));
      const w = 44;
      g.fillStyle = '#1a1222';
      g.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
      g.fillStyle = '#ff5a3a';
      g.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
      if (e.type === 'sentinel') {
        g.fillStyle = e.brain.broken > 0 ? '#ffd27a' : '#8ac0ff';
        g.fillRect(x - w / 2, y + 8, w * (e.brain.broken > 0 ? 1 : e.brain.guard / e.brain.guardMax), 3);
      }
    }
    this.fx.drawTexts(g, (x, y) => this.stage.toScreen(x, y), 1);
  }

  /* ================================================================ combat */

  telegraph(e, shape) {
    const frost = e.type === 'archer' || (e.type === 'jarl' && (e.brain.state === 'breath' || e.brain.state === 'shards')) || e.type === 'slime';
    const color = frost ? [0.45, 0.8, 1.0, 1] : shape.locked ? [1, 0.25, 0.1, 1] : [1, 0.42, 0.14, 1];
    if (shape.kind === 'fan') {
      for (let i = 0; i < shape.count; i++) {
        const a = shape.angle + (i / (shape.count - 1) - 0.5) * shape.spread;
        this.telegraphs.push({ shape: { kind: 'line', x: e.x + Math.cos(a) * 1.2, y: e.y + Math.sin(a) * 1.2, angle: a, len: shape.len, width: 0.3, k: shape.k }, color });
      }
      return;
    }
    const s = { ...shape, x: shape.x ?? e.x, y: shape.y ?? e.y };
    if (shape.kind === 'line') {
      s.x = e.x;
      s.y = e.y;
    }
    this.telegraphs.push({ shape: s, color });
  }

  hitStop(d) {
    this.stopT = Math.max(this.stopT, d);
  }

  shake(a) {
    this.shakeAmt = Math.min(0.5, Math.max(this.shakeAmt, a));
  }

  /** The hero's blade (or spear) lands: foes in the arc, pots and crates, barricades. */
  heroStrike(h, s) {
    const fx = this.fx;
    const z = 0.6;
    const smear = h.kind === 'warden' ? (s.heavy ? 2 : s.step === 2 ? 1 : 0) : s.heavy ? 3 : s.step === 1 ? 1 : 3;
    const dir = h.kind === 'warden' ? (s.step === 1 ? -1 : 1) : 1;
    const sm = { frame: smear, dir: h.flip ? -dir : dir, size: s.reach * 0.95, life: s.heavy ? 0.26 : 0.17, color: s.heavy ? [1.35, 1.0, 0.7] : [1.15, 1.08, 0.98], glow: s.heavy ? [0.55, 0.25, 0.08] : [0.28, 0.18, 0.1] };
    if (s.heavy && h.kind === 'warden') {
      // a whirl: two half-circles of blade, end to end
      for (const k of [0, Math.PI]) fx.smear(h.x, h.y, z, s.angle + k, { ...sm, frame: 1, size: s.reach * 0.9 });
      fx.ring(h.x, h.y, { r0: 0.6, r1: s.reach * 1.1, life: 0.3, color: [1.6, 0.9, 0.4], alpha: 0.6 });
    } else fx.smear(h.x, h.y, z, s.angle, sm);
    if (h.kind === 'runner' && (s.step === 0 || s.step === 2 || s.heavy)) {
      // the spear's thrust: a long streak of light
      for (let i = 0; i < 6; i++) fx.add('spark', h.x + Math.cos(s.angle) * (0.6 + i * 0.3), h.y + Math.sin(s.angle) * (0.6 + i * 0.3), { z, vx: Math.cos(s.angle) * 6, vy: Math.sin(s.angle) * 6, life: 0.14, size: 0.3, color: [2, 1.6, 0.9], drag: 6 });
    }
    let landed = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!inArc(h.x, h.y, s.angle, s.reach, s.arc, e.x, e.y, e.r)) continue;
      if (e.z > 1.2) continue;
      landed++;
      this.damageEnemy(e, { dmg: s.dmg, angle: Math.atan2(e.y - h.y, e.x - h.x), push: s.push, weight: s.weight, guardBreak: s.guardBreak }, h);
    }
    // things that break
    for (const p of this.level.props) {
      if (!p.breakable || this.level.broken.has(p.id) || this.level.open.has(p.id)) continue;
      const cx = p.x + 0.5;
      const cy = p.y + 0.5;
      if (!inArc(h.x, h.y, s.angle, s.reach + 0.2, s.arc, cx, cy, 0.4)) continue;
      this.hitProp(p, s);
      landed++;
    }
    if (s.shock) {
      const sx = h.x + Math.cos(s.angle) * 1.2;
      const sy = h.y + Math.sin(s.angle) * 1.2;
      fx.ring(sx, sy, { r0: 0.2, r1: s.shock, life: 0.3, color: [1.8, 1.4, 1.0] });
      fx.puff(sx, sy, { n: 10, speed: 3 });
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - sx, e.y - sy) > s.shock + e.r) continue;
        if (inArc(h.x, h.y, s.angle, s.reach, s.arc, e.x, e.y, e.r)) continue;
        this.damageEnemy(e, { dmg: Math.round(s.dmg * 0.4), angle: Math.atan2(e.y - sy, e.x - sx), push: 4, weight: 'light' }, h);
      }
      this.shake(shakeFor('heavy', this.reduced));
    }
    if (landed === 0) this.sound.play('swish');
  }

  damageEnemy(e, hit, source) {
    const res = e.hurt(hit, this);
    if (!res) return;
    const fx = this.fx;
    const z = e.type === 'jarl' ? 2 : e.type === 'gorehorn' ? 0.9 : 0.6;
    if (res.blocked) {
      this.sound.play('block');
      fx.sparks(e.x, e.y, z, { n: 12, angle: hit.angle + Math.PI, spread: 1.6, speed: 8, color: [1.6, 1.8, 2.4] });
      fx.text(e.x, e.y, z + 0.5, 'Guard', { color: '#9ac8ff', size: 20 });
      this.hitStop(0.05);
      this.shake(shakeFor('block', this.reduced));
      return;
    }
    if (res.broke) {
      this.sound.play('break-guard');
      fx.text(e.x, e.y, z + 0.9, 'Guard broken!', { color: '#ffd27a', size: 24, crit: true });
      fx.sparks(e.x, e.y, z, { n: 20, speed: 10, color: [2.6, 2.0, 0.9] });
    }
    const heavy = hit.weight === 'heavy';
    this.sound.play(heavy ? 'hit-heavy' : 'hit');
    fx.sparks(e.x, e.y, z, { n: heavy ? 18 : 10, angle: hit.angle, spread: 1.6, speed: heavy ? 11 : 8 });
    fx.add('glow', e.x, e.y, { z, life: 0.12, size: heavy ? 2.2 : 1.5, color: [2.4, 1.6, 0.8], alpha: 0.9 });
    fx.flash(e.x, e.y, { h: 1, r: heavy ? 4 : 2.8, i: heavy ? 2.2 : 1.4, life: 0.14 });
    if (e.type === 'slime') fx.frost(e.x, e.y, z * 0.6, { n: 6, speed: 3 });
    if (e.type === 'sentinel' || e.type === 'jarl') fx.debris(e.x, e.y, z, [0.75, 0.72, 0.65], { n: 3, speed: 3 });
    const crit = res.broke || res.back || heavy;
    fx.text(e.x, e.y, z + 0.4, res.damage, { color: crit ? '#ffb44a' : '#fff4e0', size: crit ? 34 : 26, crit });
    if (source === this.hero) this.hero.energy = gainEnergy(this.hero.energy, this.hero.def.energy, ENERGY.perHit);
    const kill = e.dead;
    this.hitStop(e.type === 'jarl' && kill ? 0.3 : hitStopFor(heavy ? 'heavy' : 'light', { kill }));
    this.shake(shakeFor(kill ? 'kill' : heavy ? 'heavy' : 'light', this.reduced));
    if (kill) this.killed(e, hit);
  }

  killed(e, hit) {
    this.kills++;
    const fx = this.fx;
    if (this.hero) this.hero.energy = gainEnergy(this.hero.energy, this.hero.def.energy, ENERGY.perKill);
    if (e.type === 'slime') {
      this.sound.play('slime-split');
      fx.frost(e.x, e.y, 0.3, { n: 14, speed: 4 });
      fx.puff(e.x, e.y, { n: 6, color: [0.6, 0.8, 1.1], speed: 2.5 });
      for (const c of splitSlime({ size: e.size, x: e.x, y: e.y }, hit.angle, () => this.fx.r())) {
        const s = new Enemy('slime', c.x, c.y, rng(Math.floor(this.time * 1000) + c.size), { size: c.size, room: e.room });
        if (this.level.isSolid(s.x, s.y)) {
          s.x = e.x;
          s.y = e.y;
        }
        s.vx = c.vx;
        s.vy = c.vy;
        s.brain.go('rest');
        s.brain.cool = 0.5;
        s.flash = 1;
        this.enemies.push(s);
      }
    } else if (e.type === 'imp') {
      fx.embers(e.x, e.y, 0.6, { n: 16, speed: 3 });
      fx.flash(e.x, e.y, { r: 4, i: 2, life: 0.3 });
      fx.add('smoke', e.x, e.y, { z: 0.6, vz: 0.6, life: 1.0, size: 0.6, size1: 1.4, color: [0.25, 0.22, 0.28], alpha: 0.7 });
    } else if (e.type === 'jarl') {
      this.sound.play('roar');
      fx.frost(e.x, e.y, 2, { n: 60, speed: 8, life: 1.2 });
      fx.ring(e.x, e.y, { r0: 0.5, r1: 7, life: 0.9, color: [1.2, 1.6, 2.4] });
      this.pulse = 1;
      this.shake(0.5);
      // the arena's fires come back
      for (const p of this.level.props) if (p.arena && !p.lit) this.setLit(p, true, false);
    } else {
      fx.debris(e.x, e.y, 0.6, e.type === 'sentinel' ? [0.8, 0.76, 0.68] : [0.45, 0.4, 0.42], { n: 10 });
      fx.puff(e.x, e.y, { n: 6 });
    }
    // drops
    const [a, b] = e.type === 'slime' ? [SLIME[e.size].gems, SLIME[e.size].gems] : e.def.gems;
    const n = a + Math.floor(this.fx.r() * (b - a + 1));
    for (let i = 0; i < n; i++) this.pickups.push(new Pickup('gem', e.x, e.y, () => this.fx.r()));
    if (this.fx.r() < (e.type === 'jarl' ? 1 : e.type === 'gorehorn' || e.type === 'sentinel' ? 0.5 : 0.15)) this.pickups.push(new Pickup('orb', e.x, e.y, () => this.fx.r()));
  }

  hitProp(p, s) {
    const fx = this.fx;
    p.hp = (p.hp ?? 1) - (s.heavy ? 3 : 1);
    p.flash = 1;
    p.shake = 1;
    const wood = p.kind !== 'pot';
    fx.debris(p.x + 0.5, p.y + 0.4, 0.5, wood ? [0.55, 0.36, 0.22] : [0.7, 0.36, 0.22], { n: 4, speed: 3 });
    this.sound.play('hit');
    this.hitStop(0.03);
    if (p.hp > 0) return;
    this.sound.play('break');
    fx.debris(p.x + 0.5, p.y + 0.4, 0.5, wood ? [0.55, 0.36, 0.22] : [0.7, 0.36, 0.22], { n: 14, speed: 5 });
    fx.puff(p.x + 0.5, p.y + 0.4, { n: 6 });
    this.shake(shakeFor('light', this.reduced));
    if (p.kind === 'barricade') {
      // the whole barricade line falls together
      for (const q of this.level.props) {
        if (q.kind !== 'barricade' || q.y !== p.y || Math.abs(q.x - p.x) > 4) continue;
        this.level.openProp(q);
        fx.debris(q.x + 0.5, q.y + 0.4, 0.5, [0.55, 0.36, 0.22], { n: 10, speed: 5 });
      }
      this.rebuildShadows();
      this.toast('The barricade gives way', 1.6);
    } else {
      this.level.broken.add(p.id);
      this.level.openProp(p);
      const n = p.kind === 'pot' ? 1 + Math.floor(this.fx.r() * 3) : 2 + Math.floor(this.fx.r() * 2);
      for (let i = 0; i < n; i++) this.pickups.push(new Pickup('gem', p.x + 0.5, p.y + 0.5, () => this.fx.r()));
      if (this.fx.r() < 0.3) this.pickups.push(new Pickup(this.fx.r() < 0.35 ? 'potion' : 'orb', p.x + 0.5, p.y + 0.5, () => this.fx.r()));
    }
  }

  rebuildShadows() {
    const f = shadowField(this.level.grid, this.level.wallH, this.level.props, this.level.open);
    this.sdf.image.data.set(f.data);
    this.sdf.needsUpdate = true;
  }

  heroThrow(h) {
    const D = h.def.ranged;
    this.sound.play('throw');
    this.spawnProjectile({ kind: D.id === 'axe' ? 'axe' : 'lance', team: 'hero', x: h.x + Math.cos(h.aim) * 0.4, y: h.y, z: 0.7, angle: h.aim, speed: D.speed, dmg: D.dmg, r: 0.2, life: D.range / D.speed, pierce: D.pierce, fire: true });
  }

  spawnProjectile(o) {
    this.projectiles.push(new Projectile(o));
  }

  projectileTouch(p) {
    // fire lights what it passes; frost puts it out
    for (const q of this.level.lights) {
      const d = Math.hypot(q.x + 0.5 - p.x, q.y + (q.kind === 'torch' ? 1 : 0.5) - p.y);
      if (d > 0.75) continue;
      if (p.fire && p.team === 'hero' && !q.lit) this.setLit(q, true);
      else if (p.fire && p.team === 'foe' && !q.lit && q.kind === 'torch') this.setLit(q, true);
      else if (p.frost && q.lit && !q.arena) this.setLit(q, false);
    }
    if (p.team === 'hero') {
      for (const e of this.enemies) {
        if (e.dead || p.hit.has(e) || e.z > 1.4) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) > e.r + p.r) continue;
        p.hit.add(e);
        this.damageEnemy(e, { dmg: p.dmg, angle: Math.atan2(p.vy, p.vx), push: 3, weight: 'light' }, this.hero);
        this.fx.embers(p.x, p.y, p.z, { n: 6, speed: 2 });
        if (!p.pierce) {
          p.gone = true;
          return;
        }
      }
      for (const q of this.level.props) {
        if (!q.breakable || this.level.broken.has(q.id) || this.level.open.has(q.id)) continue;
        if (Math.abs(q.x + 0.5 - p.x) < 0.55 && Math.abs(q.y + 0.5 - p.y) < 0.55) {
          this.hitProp(q, {});
          p.gone = true;
          return;
        }
      }
    } else {
      const h = this.hero;
      if (h.dead || Math.hypot(h.x - p.x, h.y - p.y) > h.r + p.r) return;
      if (h.hurt({ dmg: p.dmg, angle: Math.atan2(p.vy, p.vx), push: 3, chill: p.chill }, this)) {
        p.gone = true;
        if (p.fire) this.fx.embers(p.x, p.y, p.z, { n: 10, speed: 2 });
        if (p.frost) this.fx.frost(p.x, p.y, p.z, { n: 10 });
      }
    }
  }

  projectileHitsWall(p) {
    const fx = this.fx;
    if (p.fire) {
      fx.embers(p.x, p.y, p.z, { n: 10, speed: 2.5 });
      fx.flash(p.x, p.y, { r: 3, i: 1.5, life: 0.2 });
    } else {
      fx.frost(p.x, p.y, p.z, { n: 8 });
      fx.debris(p.x, p.y, p.z, [0.7, 0.85, 1.0], { n: 4, speed: 2 });
    }
    this.sound.play('hit');
  }

  /** The hero calls their summon. */
  summon(h) {
    const kind = h.def.summon.id;
    this.summons = this.summons.filter((s) => s.kind !== kind);
    const s = new Summon(kind, h);
    this.summons.push(s);
    this.sound.play('summon');
    this.fx.ring(s.x, s.y, { r0: 0.2, r1: 2.2, life: 0.5, color: [2.4, 1.4, 0.5] });
    this.fx.embers(s.x, s.y, 0.3, { n: 30, speed: 3, life: 1 });
    this.fx.flash(s.x, s.y, { r: 6, i: 3, life: 0.5 });
    this.hud.note(`${h.def.summon.name}: ${h.def.summon.blurb}`, 2.4);
  }

  summonHit(s, e, dmg, angle) {
    this.damageEnemy(e, { dmg, angle, push: 2.5, weight: 'light' }, s);
    this.fx.embers(e.x, e.y, 0.5, { n: 8, speed: 2.5 });
  }

  summonZap(s, e) {
    this.sound.play('zap');
    const fx = this.fx;
    // a crackling line of light from the moth to the foe
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      fx.add('ember', s.x + (e.x - s.x) * k + (fx.r() - 0.5) * 0.25, s.y + (e.y - s.y) * k, { z: s.z + (0.6 - s.z) * k + (fx.r() - 0.5) * 0.2, life: 0.18, size: 0.12, size1: 0.02, color: [2.6, 2.1, 1.0] });
    }
    this.damageEnemy(e, { dmg: 6, angle: Math.atan2(e.y - s.y, e.x - s.x), push: 1.5, weight: 'light' }, s);
  }

  slam(e, a) {
    const fx = this.fx;
    this.sound.play('slam');
    fx.ring(a.x, a.y, { r0: 0.3, r1: a.r * 1.15, life: 0.4, color: [1.4, 1.7, 2.2] });
    if (a.ring) fx.ring(a.x, a.y, { r0: a.r, r1: a.r * 2.2, life: 0.7, color: [1.0, 1.4, 2.0], alpha: 0.6 });
    fx.frost(a.x, a.y, 0.2, { n: 24, speed: 6 });
    fx.puff(a.x, a.y, { n: 16, speed: 5, size: 0.5 });
    fx.debris(a.x, a.y, 0.2, [0.6, 0.62, 0.72], { n: 12, speed: 6 });
    this.shake(shakeFor('boss', this.reduced));
    this.pulse = 0.6;
    const h = this.hero;
    const d = Math.hypot(h.x - a.x, h.y - a.y);
    if (d < a.r + h.r) h.hurt({ dmg: a.dmg, angle: Math.atan2(h.y - a.y, h.x - a.x), push: a.push }, this);
    for (const s of this.summons) if (Math.hypot(s.x - a.x, s.y - a.y) < a.r) s.life = Math.min(s.life, 0.2);
  }

  jarlBreath(e, b, dt) {
    const fx = this.fx;
    const mx = e.x + Math.cos(b.angle) * 1.0;
    const my = e.y + Math.sin(b.angle) * 1.0;
    for (let i = 0; i < 3; i++) {
      const a = b.angle + (fx.r() - 0.5) * b.spread;
      const s = 7 + fx.r() * 4;
      fx.add('puff', mx, my, { z: 2.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: -2, life: 0.7, size: 0.4, size1: 1.4, color: [0.62, 0.78, 1.05], alpha: 0.38, drag: 1.2 });
      if (i === 0) fx.add('frost', mx, my, { z: 2.4, vx: Math.cos(a) * s * 1.1, vy: Math.sin(a) * s * 1.1, vz: -2.5, life: 0.6, size: 0.12, size1: 0.04, color: [0.8, 1.2, 1.8], drag: 1 });
    }
    const h = this.hero;
    if (inArc(e.x, e.y, b.angle, b.r, b.spread, h.x, h.y, h.r)) {
      this.breathAcc = (this.breathAcc ?? 0) + b.dps * dt;
      if (this.breathAcc >= 7) {
        h.hurt({ dmg: Math.round(this.breathAcc), angle: b.angle, push: 2, chill: 1.2 }, this);
        this.breathAcc = 0;
      }
    }
    for (const p of this.level.lights) {
      if (!p.lit) continue;
      if (inArc(e.x, e.y, b.angle, b.r, b.spread, p.x + 0.5, p.y + 0.5, 0.4)) this.setLit(p, false);
    }
  }

  enemyEvent(e, ev) {
    if (ev.kind === 'land') {
      if (e.type === 'slime') {
        this.fx.puff(e.x, e.y, { n: 4 + e.size * 2, speed: 1.5 + e.size * 0.5 });
        this.sound.play('slime-hop', { size: e.size });
      } else if (e.type === 'jarl') this.fx.puff(e.x, e.y, { n: 24, speed: 6, size: 0.6 });
    } else if (ev.kind === 'crash') {
      this.sound.play('crash');
      this.fx.debris(e.x + Math.cos(e.face) * 0.7, e.y + Math.sin(e.face) * 0.7, 0.6, [0.5, 0.5, 0.62], { n: 12, speed: 4 });
      this.fx.puff(e.x, e.y, { n: 10, speed: 3 });
      this.fx.text(e.x, e.y, 1.8, 'Stunned!', { color: '#ffd27a', size: 22 });
      this.shake(shakeFor('heavy', this.reduced));
    } else if (ev.kind === 'wake' || ev.kind === 'phase') {
      this.sound.play('roar');
      this.shake(this.reduced ? 0 : 0.3);
      this.pulse = 0.8;
      if (ev.kind === 'wake') this.hud.toast('Hrimgar, the Rime Jarl', 'He rises from the throne', 3);
      else if (ev.phase === 2) this.hud.toast('The Jarl roars', 'His breath puts out the fires — light them again', 3);
      else this.hud.toast('The Jarl rages', 'He leaps — watch the shadow', 3);
    } else if (ev.kind === 'snuff') {
      for (const p of this.level.props) if (p.arena && p.lit) this.setLit(p, false, false);
      this.fx.frost(e.x, e.y, 2, { n: 40, speed: 7 });
    } else if (ev.kind === 'summon') {
      for (let i = 0; i < ev.count; i++) {
        const a = (i / ev.count) * Math.PI * 2 + 0.5;
        const s = new Enemy('slime', e.x + Math.cos(a) * 2.5, e.y + Math.sin(a) * 2, rng(i + Math.floor(this.time * 100)), { size: ev.size, room: e.room });
        if (this.level.isSolid(s.x, s.y)) {
          s.x = e.x;
          s.y = e.y - 1.5;
        }
        s.brain.go('rest');
        this.fx.frost(s.x, s.y, 0.3, { n: 12 });
        this.enemies.push(s);
      }
    } else if (ev.kind === 'enrage') {
      this.fx.ring(e.x, e.y, { r0: 0.5, r1: 5, life: 0.6, color: [1.2, 1.6, 2.4] });
    }
  }

  /* ================================================================ fire */

  nearLightable(h) {
    let best = null;
    let bd = 1.7;
    for (const p of this.level.lights) {
      const d = Math.hypot(p.x + 0.5 - h.x, p.y + (p.kind === 'torch' ? 0.9 : 0.5) - h.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  interact(h) {
    const p = this.nearLightable(h);
    if (!p) return;
    this.setLit(p, !p.lit);
    if (p.lit) this.checkpoint = { x: h.x, y: h.y };
  }

  /** Light or put out a fire (and count the beacons). */
  setLit(p, on, sound = true) {
    if (p.lit === on) return;
    p.lit = on;
    const fx = this.fx;
    const top = p.kind === 'torch' ? p.y + 2 : p.y + 0.5 + 1.5;
    if (on) {
      if (sound) this.sound.play('ignite');
      fx.embers(p.x + 0.5, top, 0.3, { n: 20, speed: 2.5 });
      fx.flash(p.x + 0.5, p.y + 0.5, { h: 2, r: 8, i: 3, life: 0.5 });
      fx.ring(p.x + 0.5, top, { r0: 0.2, r1: 1.6, life: 0.4, color: [2.4, 1.3, 0.5] });
    } else {
      if (sound) this.sound.play('snuff');
      fx.add('smoke', p.x + 0.5, top, { z: 0.2, vz: 0.8, life: 1.6, size: 0.4, size1: 1.6, color: [0.3, 0.3, 0.36], alpha: 0.8 });
      fx.frost(p.x + 0.5, top, 0.2, { n: 8 });
    }
    if (p.beacon) {
      const lit = this.level.props.filter((q) => q.beacon && q.lit).length;
      if (on) {
        this.hud.toast(`Beacon ${lit} of 3`, lit === 3 ? 'The Rime Gate stirs' : 'The gate in the Brazier Court remembers it', 3);
        this.checkpoint = { x: p.x + 0.5, y: p.y - 0.8 };
      }
      if (lit === 3 && !this.gateOpen) this.openGate();
    }
  }

  openGate() {
    this.gateOpen = true;
    const gate = this.level.props.find((p) => p.kind === 'gate');
    this.cine = { x: gate.x + 2, y: gate.y + 1, t: 0, dur: 3.2 };
    this.after(1.2, () => {
      if (this.closed) return;
      this.level.openProp(gate);
      this.rebuildShadows();
      this.sound.play('gate');
      this.shake(this.reduced ? 0 : 0.25);
      this.fx.puff(gate.x + 2, gate.y + 0.3, { n: 30, speed: 4, size: 0.6 });
      this.hud.toast('The Rime Gate rises', 'The throne room lies open', 3);
    });
  }

  collect(p) {
    if (p.kind === 'gem') {
      this.gems++;
      this.sound.play('gem');
      this.fx.add('star', p.x, p.y, { z: 0.3, life: 0.3, size: 0.5, color: [2.4, 1.6, 0.6], vr: 6 });
    } else if (p.kind === 'orb') {
      const h = this.hero;
      h.hp = Math.min(h.maxHp, h.hp + 14);
      this.sound.play('orb');
      this.fx.text(h.x, h.y, 1.3, '+14', { color: '#7aff9a', size: 22 });
    } else {
      const h = this.hero;
      if (h.potions < POTIONS_MAX) h.potions++;
      this.sound.play('potion');
      this.toast('A hearth draught', 1.2);
    }
  }

  /* ================================================================ for tests, covers and screenshots */

  /** Put the hero somewhere and look there (debugging and screenshots). */
  teleport(x, y) {
    this.hero.x = x;
    this.hero.y = y;
    this.cam.x = x;
    this.cam.y = y + 0.7;
    const rm = roomAt(x, y);
    if (rm) {
      this.room = rm;
      this.seenRooms.add(rm);
    }
  }

  /** Advance the world by n sixtieths of a second with the given controls (for screenshots and checks). */
  step(n = 1, inp = {}) {
    for (let i = 0; i < n; i++) {
      this.time += 1 / 60;
      this.simulate(1 / 60, { mx: 0, my: 0, aim: null, ...inp });
      this.fx.update(1 / 60, this.stage.view, 0.15);
      inp = { ...inp, attack: false, ranged: false, dash: false, summon: false, potion: false, interact: false };
    }
  }

  coverShot() {
    this.begin('warden');
    this.teleport(43.4, 35.2);
    this.hero.invuln = 99;
    const used = new Set();
    for (const [t, x, y] of [['imp', 41.5, 35.8], ['imp', 42.2, 37.4], ['slime', 47.6, 34.2], ['imp', 40.6, 34.2]]) {
      const e = this.enemies.find((q) => q.type === t && q.room === 'court' && !used.has(q));
      if (!e) continue;
      used.add(e);
      e.x = x;
      e.y = y;
      e.home = { x, y };
      e.brain.go('dart');
    }
    this.step(30);
    this.hero.aim = Math.atan2(35.8 - this.hero.y, 41.5 - this.hero.x);
    this.step(1, { attack: true, aim: this.hero.aim });
    this.step(7, { aim: this.hero.aim });
    this.cam.x = 42.6;
    this.cam.y = 36.2;
    this.freeze = true;
  }
}
