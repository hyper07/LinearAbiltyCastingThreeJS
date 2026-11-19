import { PowerKit } from '../shared/powerKit.js';
import { HelpPanel, helpButton, codesFor } from '../shared/helpPanel.js';
import { CONTROLS } from './controls.js';

const HELP_CODES = codesFor(CONTROLS, 'help');
import * as R from './rules.js';
import { StoneballView } from './view.js';
import { Hud, startScreen, endScreen, pauseScreen, el, esc } from './ui.js';
import { Sound } from './sound.js';
import './stoneball.css';

/**
 * Stoneball: three-a-side football for cavemen, with a stone. Pick your
 * tribe's leather, the rivals' leather, how well they play and how long;
 * then run, sprint, pass, shove, slide-tackle (C) and shoot (hold Space to wind up).
 *
 *   const game = new StoneballGame(document.body, { onClose, account });
 *   await game.open();   …   game.close();
 *
 * The match (rules, physics, AI, clock) is rules.js, ticking at a fixed
 * 60 Hz; view.js draws it; ui.js is the screens; sound.js the noises.
 */

const PREFS_KEY = 'stoneball.prefs';
const MOVE = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0]
};
const CHARGE_TIME = 0.9; // seconds to full power

const prefs = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
    } catch {
      return {};
    }
  },
  save(p) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
      /* private mode: choices just aren't kept */
    }
  }
};

export class StoneballGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'sb');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Stoneball');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this.pending = {};
    this.charging = false;
    this.chargeT = 0;
    this.acc = 0;
    this.fps = 0;
    this.closed = false;
    this.sound = new Sound();
    this._onKey = (e) => this._keyDown(e);
    this._onKeyUp = (e) => this._keyUp(e);
    this._onBlur = () => {
      this.keys.clear();
      if (this.charging) this._release();
    };
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.stoneball = this;
  }

  /* ================================================================ life */

  async open() {
    this.root.innerHTML = '<div class="sb-loading"><div class="sb-title__stone" aria-hidden="true"></div><p>Rolling out the stone…</p></div>';
    this.root.focus();
    const stage = el('div', 'sb-stage');
    this.root.prepend(stage);
    this.view = new StoneballView(stage);
    this._resize = new ResizeObserver(() => this.view?.resize());
    this._resize.observe(this.root);
    stage.addEventListener('pointerdown', () => {
      this.sound.wake();
      this.root.focus();
    });
    // A match between two AI tribes plays behind the start screen.
    this.match = this.demoMatch();
    await this.view.setMatch(this.match);
    if (this.closed) return;
    this.root.querySelector('.sb-loading')?.remove();
    this.hud = new Hud(this.root);
    this.hud.show(false);
    // Power: a capped loop (60 by default), stopped in a hidden tab, on demand behind the pause screen.
    this.power = new PowerKit('stoneball', { renderer: this.view.renderer, profile: { quietFps: 45 }, features: { grass: false, ao: false, rays: false, distance: false, bloom: false }, onChange: () => this.applyPower() });
    this.applyPower();
    // How to play (H or I, the ? in the corner, the pause screen): the match waits while it's up.
    this.help = new HelpPanel({
      host: this.root,
      id: 'stoneball',
      table: CONTROLS,
      onOpen: () => {
        this._helpFrom = this.mode;
        if (this.mode === 'play') this.mode = 'paused';
        this.keys.clear();
        this.power.setMenu('still');
      },
      onClose: () => {
        if (this._helpFrom === 'play' && this.mode === 'paused' && !this.root.querySelector('.sb-pause')) this.mode = 'play';
        this.power.setMenu(this.mode === 'menu' ? 'live' : this.mode === 'paused' ? 'still' : 'none');
        this.root.focus();
      }
    });
    helpButton(this.root, () => this.help.open(), { style: 'top:auto;bottom:12px;left:12px' });
    this.power.start((ms) => {
      this.fps = this.power.loop.fps;
      this.frame(Math.min(0.1, ms / 1000));
      this.power.showFps(this.root);
    });
    this.menu();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.power?.dispose();
    clearTimeout(this._endT);
    this._resize?.disconnect();
    window.removeEventListener('blur', this._onBlur);
    this.hud?.dispose();
    this.view?.dispose();
    this.sound.dispose();
    this.root.remove();
    if (window.stoneball === this) delete window.stoneball;
    this.onClose?.();
  }

  demoMatch() {
    const ids = R.LEATHERS.map((l) => l.id);
    const p = prefs.load();
    const a = ids.includes(p.mine) ? p.mine : 'tan';
    const b = ids.includes(p.rival) && p.rival !== a ? p.rival : ids.find((i) => i !== a);
    return R.createMatch({ seed: (Math.random() * 1e9) | 0, length: 600, teams: [{ leather: a, control: 'ai', skill: 'normal' }, { leather: b, control: 'ai', skill: 'normal' }] });
  }

  /** Graphics: frame cap and the sun's shadow (off / near: a smaller map / full). */
  applyPower() {
    const c = this.power.choices;
    const sun = this.view.sun;
    if (sun) {
      sun.castShadow = c.shadows !== 'off';
      const size = c.shadows === 'full' ? 2048 : 1024;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    }
    this.power.invalidate();
  }

  /** The start screen, over a match the AI plays. */
  menu() {
    clearTimeout(this._endT);
    this.root.querySelector('.sb-overlay')?.remove();
    this.mode = 'menu';
    this.power?.setMenu('live');
    this.hud?.show(false);
    if (!this.match || this.match.teams.some((t) => t.control === 'human')) {
      this.match = this.demoMatch();
      this.view.setMatch(this.match);
    }
    this.startEl = startScreen(this.root, prefs.load(), {
      onPlay: (choice) => this.start(choice),
      onClose: () => this.close()
    });
  }

  /** Kick off a real match. */
  async start(choice) {
    this.sound.wake();
    this.choice = choice;
    prefs.save(choice);
    const nick = String(this.account?.displayName ?? this.account?.name ?? this.account?.username ?? '').trim().slice(0, 12);
    this.match = R.createMatch({
      seed: (Math.random() * 1e9) | 0,
      length: choice.length,
      golden: true,
      teams: [
        { leather: choice.mine, control: 'human', skill: 'normal' },
        { leather: choice.rival, control: 'ai', skill: choice.skill }
      ]
    });
    if (nick) this.match.players[2].name = nick;
    this.mode = 'loading';
    await this.view.setMatch(this.match);
    if (this.closed) return;
    this.hud.setTeams(this.match.teams);
    this.hud.show(true);
    this.acc = 0;
    this.pending = {};
    this.charging = false;
    this.mode = 'play';
    this.power.setMenu('none');
    this.root.focus();
    this.hud.flash('Kick-off', { ms: 1300 });
    this.help.openFirstTime();
  }

  rematch() {
    if (this.choice) this.start(this.choice);
    else this.menu();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.keys.clear();
    this.charging = false;
    this.power.setMenu('still');
    pauseScreen(this.root, {
      graphics: this.power.menu(),
      onHelp: () => {
        // From the pause screen: back to the match when How to play closes.
        this.mode = 'play';
        this.help.open();
      },
      onResume: () => {
        this.mode = 'play';
        this.power.setMenu('none');
        this.root.focus();
      },
      onRestart: () => this.rematch(),
      onMenu: () => this.menu(),
      onClose: () => this.close()
    });
  }

  /* ================================================================ input */

  _keyDown(e) {
    e.stopPropagation();
    const code = e.code;
    if (this.help?.isOpen) {
      if (code === 'Escape' || HELP_CODES.includes(code)) this.help.close();
      return;
    }
    if (HELP_CODES.includes(code) && !e.repeat && this.mode !== 'loading') {
      this.help.open();
      return;
    }
    if (this.mode === 'menu' || this.mode === 'end') {
      if (code === 'Escape' && this.mode === 'menu') this.close();
      return;
    }
    if (this.mode === 'paused') {
      if (code === 'Escape') this.root.querySelector('.sb-pause [data-resume]')?.click();
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(code);
    this.sound.wake();
    if (this.mode !== 'play') return;
    if (code === 'Escape') this.pause();
    else if (code === 'Space') this._spaceDown();
    else if (code === 'KeyE') this.pending.pass = true;
    else if (code === 'KeyF') this.pending.tackle = true;
    else if (code === 'KeyC') this.pending.slide = true;
    else if (code === 'KeyQ') R.switchPlayer(this.match);
    else if (code === 'KeyM') this.hud.flash(this.sound.toggle() ? 'Sound off' : 'Sound on', { ms: 900 });
  }

  _keyUp(e) {
    e.stopPropagation();
    this.keys.delete(e.code);
    if (e.code === 'Space' && this.charging) this._release();
  }

  /** Space: wind up a shot if the stone is at your feet (or coming); otherwise shove whoever is close. */
  _spaceDown() {
    const m = this.match;
    const p = m.players[m.human.pid];
    const b = m.ball;
    const near = b.owner === p.id || (b.owner < 0 && Math.hypot(b.x - p.x, b.z - p.z) < 2.2);
    if (!near) {
      const opp = m.players.some((o) => o.team !== p.team && Math.hypot(o.x - p.x, o.z - p.z) < 2.8);
      if (opp) {
        this.pending.tackle = true;
        return;
      }
    }
    this.charging = true;
    this.chargeT = 0;
  }

  _release() {
    this.pending.shoot = Math.min(1, this.chargeT / CHARGE_TIME);
    this.charging = false;
    this.chargeT = 0;
  }

  _gamepad() {
    const pad = navigator.getGamepads?.()?.find((g) => g && g.connected);
    if (!pad) return null;
    const dead = (v) => (Math.abs(v) < 0.2 ? 0 : v);
    const btn = (i) => Boolean(pad.buttons[i]?.pressed);
    const prev = this._padPrev ?? [];
    const edge = (i) => btn(i) && !prev[i];
    if (this.mode === 'play') {
      if (edge(0)) this._spaceDown();
      if (!btn(0) && prev[0] && this.charging) this._release();
      if (edge(2)) this.pending.pass = true;
      if (edge(1)) this.pending.tackle = true;
      if (edge(3)) this.pending.slide = true;
      if (edge(5)) R.switchPlayer(this.match);
      if (edge(9)) this.pause();
    }
    this._padPrev = pad.buttons.map((b) => b.pressed);
    return { mx: dead(pad.axes[0] ?? 0), mz: dead(pad.axes[1] ?? 0), sprint: btn(7) || btn(4) };
  }

  /** The human's input for one tick. One-shot actions go once, then are spent. */
  _input() {
    let mx = 0, mz = 0;
    for (const k of this.keys) {
      const d = MOVE[k];
      if (d) {
        mx += d[0];
        mz += d[1];
      }
    }
    const pad = this._padInput;
    if (pad && (pad.mx || pad.mz)) [mx, mz] = [pad.mx, pad.mz];
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Boolean(pad?.sprint);
    const input = { mx, mz, sprint, charge: this.charging, ...this.pending };
    this.pending = {};
    return input;
  }

  /* ================================================================ the loop */

  frame(dt) {
    const m = this.match;
    if (!m || !this.view) return;
    this._padInput = this._gamepad();
    if (this.charging) this.chargeT += dt;
    let alpha = 1;
    const running = this.mode === 'play' || this.mode === 'menu' || this.mode === 'end';
    if (running) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= R.TICK && n < 8) {
        this.view.snapshot(m);
        const inputs = this.mode === 'play' && m.human ? { [m.human.pid]: this._input() } : {};
        const events = R.step(m, inputs);
        for (const e of events) this._event(e);
        this.acc -= R.TICK;
        n++;
      }
      if (n === 8) this.acc = 0;
      alpha = this.acc / R.TICK;
      // The demo never ends: when it would, start another.
      if (this.mode === 'menu' && m.phase === 'end') {
        this.match = this.demoMatch();
        this.view.setMatch(this.match);
        return;
      }
    }
    const me = m.human && this.mode === 'play' ? m.human.pid : null;
    const charge = Math.min(1, this.chargeT / CHARGE_TIME);
    this.view.render(this.mode === 'paused' ? 0 : dt, m, alpha, { me, charge: this.charging ? charge : 0, demo: this.mode === 'menu' });
    if (this.mode === 'play' || this.mode === 'end') {
      const p = m.human ? m.players[m.human.pid] : null;
      this.hud.update(m, { charge, charging: this.charging, stamina: p?.stamina ?? 1 });
    }
  }

  _event(e) {
    const m = this.match;
    this.view.event(e, m);
    const live = this.mode === 'play';
    switch (e.type) {
      case 'shot':
        this.sound.kick(Math.min(1, e.power / 28));
        break;
      case 'kick':
      case 'pass':
      case 'throw':
        this.sound.kick(0.3);
        break;
      case 'tackle':
      case 'hit':
        this.sound.thump();
        break;
      case 'wall':
      case 'post':
        this.sound.knock(e.power);
        break;
      case 'thud':
        this.sound.knock(e.power * 0.5);
        break;
      case 'save':
        if (live) {
          this.sound.roar(false);
          this.hud.flash(`Save!<small>${esc(m.players[e.pid].name)}</small>`, { colour: m.teams[e.team].colour, ms: 1200 });
        }
        break;
      case 'whistle':
        if (live) this.sound.whistle(e.kind === 'end' ? 3 : 1);
        break;
      case 'golden':
        if (live) this.hud.flash('Golden goal<small>Next goal wins</small>', { ms: 2400, big: true });
        break;
      case 'goal': {
        if (!live) break;
        this.sound.roar(true);
        const t = m.teams[e.team];
        const who = e.pid >= 0 ? esc(m.players[e.pid].name) : '';
        this.hud.flash(`GOAL!<small>${e.own ? `${who}, into his own net` : `${who} · ${esc(t.name)}`}</small>`, { colour: t.colour, ms: 2800, big: true });
        break;
      }
      case 'end':
        if (!live) break;
        this.mode = 'end';
        this.charging = false;
        this.hud.flash('Full time', { ms: 2000, big: true });
        this._endT = setTimeout(() => {
          if (this.closed || this.mode !== 'end') return;
          endScreen(this.root, m, { onRematch: () => this.rematch(), onMenu: () => this.menu(), onClose: () => this.close() });
        }, 2200);
        break;
    }
  }
}
