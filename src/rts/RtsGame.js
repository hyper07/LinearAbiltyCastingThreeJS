import { Sim } from './sim.js';
import { RtsView } from './view.js';
import {
  TICK, CELL, STATS, FACTIONS, FACTION_ORDER, MAP_SIZES, DIFFICULTIES, TEAM_COLORS, BUILD_KEYS, TRAIN_KEYS, BUILDING_ORDER, trainsOf
} from './rules.js';
import { ROCK, WATER, FOREST } from './map.js';
import './rts.css';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const ICONS = { worker: '⛏', light: '✦', raider: '➤', heavy: '⬢', siege: '✸', core: '⌂', depot: '▣', barracks: '⚑', workshop: '⚙', tower: '♜', node: '◆' };
const SPEEDS = [1, 1.5, 2, 3];
const STORE = 'elemental-arena.rts';
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const remember = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? 'null') ?? {};
  } catch {
    return {};
  }
};
const keep = (data) => {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...remember(), ...data }));
  } catch {
    /* private mode: fine */
  }
};
const ORDER_WORDS = { idle: 'Idle', hold: 'Holding position', move: 'Moving', amove: 'Attack-moving', attack: 'Attacking', gather: 'Mining shards', return: 'Carrying shards home', build: 'Going to build', construct: 'Building', repair: 'Repairing' };

/**
 * Shardfront: a real-time strategy game on big maps. You and up to three
 * computer players start with a base and five workers; mine shards, build,
 * train an army, and destroy every enemy building.
 *
 * Opens over the home page (like the stock and work games); `onClose` goes
 * back to it. The match itself is sim.js; the 3D view is view.js.
 */
export class RtsGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'rts');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Shardfront');
    host.append(this.root);
    this.sim = null;
    this.view = null;
    this._keys = new Set();
    this._raf = 0;
    this._onKey = (e) => this._key(e);
    this._onKeyUp = (e) => {
      e.stopPropagation();
      this._keys.delete(e.code);
    };
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('keyup', this._onKeyUp);
    window.rts = this;
  }

  async open() {
    this.setup();
    this.root.focus();
  }

  close() {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    this.view?.dispose();
    this.view = null;
    this.sim = null;
    this.root.remove();
    if (window.rts === this) delete window.rts;
    this.onClose?.();
  }

  /* ------------------------------------------------------------- set-up */

  setup() {
    cancelAnimationFrame(this._raf);
    this.view?.dispose();
    this.view = null;
    this.sim = null;
    const saved = remember();
    const choice = {
      faction: FACTIONS[saved.faction] ? saved.faction : 'league',
      size: MAP_SIZES[saved.size] ? saved.size : 'huge',
      rivals: [1, 2, 3].includes(saved.rivals) ? saved.rivals : 1,
      difficulty: DIFFICULTIES[saved.difficulty] ? saved.difficulty : 'normal',
      teams: Boolean(saved.teams)
    };
    const record = saved.record ?? { wins: 0, losses: 0 };
    this.root.innerHTML = `
      <div class="rts-setup">
        <header class="rts-setup__head">
          <div><h1>Shardfront</h1><p>Mine shards, build a base, raise an army, and wipe every enemy building off a big map.</p></div>
          <button type="button" class="rts__x" data-close aria-label="Back to the games">✕</button>
        </header>
        <section><h2>Your faction</h2><div class="rts-factions" data-factions role="radiogroup" aria-label="Faction"></div></section>
        <section class="rts-setup__row">
          <div><h2>Map</h2><div class="rts-seg" data-size role="radiogroup" aria-label="Map size"></div></div>
          <div><h2>Opponents</h2><div class="rts-seg" data-rivals role="radiogroup" aria-label="Opponents"></div></div>
          <div><h2>Computer</h2><div class="rts-seg" data-difficulty role="radiogroup" aria-label="Difficulty"></div></div>
        </section>
        <label class="rts-check" data-teams-row><input type="checkbox" data-teams> The computers team up against me</label>
        <footer class="rts-setup__foot">
          <span class="rts-setup__record">${record.wins} won · ${record.losses} lost</span>
          <button type="button" class="rts-btn rts-btn--go" data-start>Start the match</button>
        </footer>
        <p class="rts-credits" data-credits>Frontier League buildings: KayKit Space Base Bits by Kay Lousberg (CC0). Every other unit and building: Gamory's own designs.</p>
        <details class="rts-help"><summary>How to play</summary>
          <ul>
            <li><b>Select</b>: click a unit, or drag a box around several. Shift adds; double-click picks every one of that kind on screen.</li>
            <li><b>Orders</b>: right-click the ground to move, an enemy to attack, crystals to mine. <kbd>A</kbd> then click: attack-move (fight anything on the way).</li>
            <li><b>Build</b>: select a worker, press <kbd>B</kbd>, pick a building, click where it goes. Buildings train units: select one and use its buttons (<kbd>Q</kbd> <kbd>W</kbd>).</li>
            <li><b>Camera</b>: arrow keys, the screen's edge, middle-drag or the minimap; the wheel zooms. <kbd>Space</kbd> jumps home or to the last alert.</li>
            <li><b>Groups</b>: <kbd>Ctrl</kbd>+<kbd>1</kbd>…<kbd>9</kbd> saves the selection, <kbd>1</kbd>…<kbd>9</kbd> picks it again. <kbd>P</kbd> pauses.</li>
          </ul>
        </details>
      </div>`;
    const $ = (s) => this.root.querySelector(s);
    $('[data-close]').addEventListener('click', () => this.close());
    // Credits for your own models (library/my-models/shardfront.json), as their licences ask.
    fetch('./library/my-models/shardfront.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        const lines = Object.entries(list?.slots ?? {}).filter(([, s]) => s?.credit).map(([key, s]) => {
          const [f, t] = key.split(':');
          return `${STATS[f]?.[t]?.name ?? key}: ${String(s.credit).slice(0, 200)}`;
        });
        if (lines.length) $('[data-credits]')?.append(document.createElement('br'), `Models: ${lines.join(' · ')}`);
      })
      .catch(() => {});

    const factions = $('[data-factions]');
    for (const id of FACTION_ORDER) {
      const f = FACTIONS[id];
      const card = el('button', 'rts-faction');
      card.type = 'button';
      card.dataset.faction = id;
      card.setAttribute('role', 'radio');
      card.style.setProperty('--f-body', f.look.body);
      card.style.setProperty('--f-accent', f.look.accent);
      card.innerHTML = `<span class="rts-faction__swatch" aria-hidden="true"></span><strong></strong><span class="rts-faction__passive"></span><p></p><span class="rts-faction__units"></span>`;
      card.querySelector('strong').textContent = f.name;
      card.querySelector('.rts-faction__passive').textContent = f.passive;
      card.querySelector('p').textContent = f.blurb;
      card.querySelector('.rts-faction__units').textContent = Object.values(f.units).map((u) => u.name).join(' · ');
      card.addEventListener('click', () => {
        choice.faction = id;
        paint();
      });
      factions.append(card);
    }
    const seg = (host, entries, key) => {
      for (const [value, label, note] of entries) {
        const b = el('button', 'rts-seg__opt');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.dataset.value = String(value);
        b.innerHTML = `<span></span>${note ? '<small></small>' : ''}`;
        b.querySelector('span').textContent = label;
        if (note) b.querySelector('small').textContent = note;
        b.addEventListener('click', () => {
          choice[key] = value;
          paint();
        });
        host.append(b);
      }
    };
    seg($('[data-size]'), Object.entries(MAP_SIZES).map(([id, m]) => [id, m.name, m.note]), 'size');
    seg($('[data-rivals]'), [[1, '1', '1 vs 1'], [2, '2', 'three-way'], [3, '3', 'four-way']], 'rivals');
    seg($('[data-difficulty]'), Object.entries(DIFFICULTIES).map(([id, d]) => [id, d.name]), 'difficulty');
    const teams = $('[data-teams]');
    teams.checked = choice.teams;
    teams.addEventListener('change', () => {
      choice.teams = teams.checked;
    });
    const paint = () => {
      for (const c of factions.children) c.setAttribute('aria-checked', String(c.dataset.faction === choice.faction));
      for (const [sel, key] of [['[data-size]', 'size'], ['[data-rivals]', 'rivals'], ['[data-difficulty]', 'difficulty']]) {
        for (const b of $(sel).children) b.setAttribute('aria-checked', String(b.dataset.value === String(choice[key])));
      }
      $('[data-teams-row]').hidden = choice.rivals < 2;
    };
    paint();
    $('[data-start]').addEventListener('click', () => {
      keep({ faction: choice.faction, size: choice.size, rivals: choice.rivals, difficulty: choice.difficulty, teams: choice.teams });
      this.start(choice);
    });
  }

  /* -------------------------------------------------------------- match */

  /**
   * @param {{ faction: string, size: string, rivals: number, difficulty: string, teams?: boolean, seed?: number }} choice
   */
  start(choice) {
    const others = FACTION_ORDER.filter((f) => f !== choice.faction);
    const players = [{ faction: choice.faction, team: 0, name: this.account?.name ?? 'You', ai: null }];
    for (let i = 0; i < choice.rivals; i++) {
      players.push({ faction: i === 0 ? others[0] : others[(i + 1) % others.length], team: choice.teams && choice.rivals > 1 ? 1 : i + 1, name: `Computer ${i + 1}`, ai: choice.difficulty });
    }
    this.choice = choice;
    this.seat = 0;
    this.sim = new Sim({ seed: choice.seed ?? Math.floor(Math.random() * 1e9), size: choice.size, players });
    this.sim.recordEvents = true;
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.mode = null; // { kind: 'build', type } | { kind: 'target', order: 'amove'|'move'|'attack'|'rally' }
    this.card = 'main';
    this.groups = {};
    this.lastAlert = null;

    this.root.innerHTML = `
      <div class="rts-stage" data-stage>
        <canvas class="rts__overlay" data-overlay></canvas>
        <div class="rts__box" data-box hidden></div>
      </div>
      <header class="rts-top">
        <div class="rts-top__title">Shardfront</div>
        <div class="rts-top__res"><span title="Shards">◆ <b data-shards>0</b></span><span title="Supply: used / most">⚑ <b data-supply>0/0</b></span><span title="Match time">⏱ <b data-time>0:00</b></span></div>
        <div class="rts-top__actions">
          <button type="button" class="rts-btn" data-speed title="Game speed">1×</button>
          <button type="button" class="rts-btn" data-pause title="Pause (P)">Pause</button>
          <button type="button" class="rts-btn" data-surrender title="Give up this match">Surrender</button>
          <button type="button" class="rts__x" data-close aria-label="Leave the match">✕</button>
        </div>
      </header>
      <div class="rts-alerts" data-alerts role="status" aria-live="polite"></div>
      <footer class="rts-panel">
        <canvas class="rts-mini" data-mini width="200" height="200" aria-label="Minimap"></canvas>
        <div class="rts-info" data-info></div>
        <div class="rts-card" data-card></div>
      </footer>
      <div class="rts-result" data-result hidden></div>`;
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    const stage = $('[data-stage]');
    this.view = new RtsView(stage, this.sim, this.seat);
    stage.prepend(this.view.canvas);
    this.overlay = $('[data-overlay]');
    this.octx = this.overlay.getContext('2d');
    this.mini = $('[data-mini]');
    this.mctx = this.mini.getContext('2d');
    this._miniBase();

    const fit = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      this.view.resize(w, h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.overlay.width = Math.round(w * dpr);
      this.overlay.height = Math.round(h * dpr);
    };
    this._resize = new ResizeObserver(fit);
    this._resize.observe(stage);
    fit();

    $('[data-close]').addEventListener('click', () => {
      if (this.sim?.over || window.confirm('Leave this match? It will count as a loss.')) {
        if (!this.sim?.over) this._record(false);
        this.close();
      }
    });
    $('[data-surrender]').addEventListener('click', () => {
      if (window.confirm('Surrender this match?')) this.sim.command(this.seat, { type: 'surrender' });
    });
    $('[data-pause]').addEventListener('click', () => this.togglePause());
    $('[data-speed]').addEventListener('click', () => {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      $('[data-speed]').textContent = `${this.speed}×`;
    });
    this._mouse(stage);
    this._minimapInput();
    this.selection = [];
    // Start with the base in view and its workers picked.
    this.select(this.sim.unitsOf(this.seat));
    this.root.focus();
    this._last = performance.now();
    this._hudAt = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this.frame(Math.min(0.1, (now - this._last) / 1000));
      this._last = now;
    };
    this._raf = requestAnimationFrame(loop);
  }

  togglePause() {
    this.paused = !this.paused;
    this.$('[data-pause]').textContent = this.paused ? 'Resume' : 'Pause';
    this.alert(this.paused ? 'Paused' : 'Resumed');
  }

  frame(dt) {
    const sim = this.sim;
    if (!sim) return;
    if (!this.paused && !sim.over) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= TICK && steps < 12) {
        sim.step();
        this.acc -= TICK;
        steps++;
      }
      if (steps === 12) this.acc = 0;
    }
    this._events(sim.drainEvents());
    this._pan(dt);
    const alpha = this.paused || sim.over ? 1 : Math.min(1, this.acc / TICK);
    // Drop picks that died.
    if (this.selection.some((id) => !sim.get(id))) this.select(this.selection.map((id) => sim.get(id)).filter(Boolean), { keepCard: true });
    this.view.render(dt, alpha);
    this.view.drawOverlay(this.octx);
    this._hudAt -= dt;
    if (this._hudAt <= 0) {
      this._hudAt = 0.1;
      this._hud();
      this._minimap();
    }
  }

  _events(events) {
    this.view.absorb(events);
    for (const ev of events) {
      if (ev.type === 'alert' && ev.seat === this.seat) {
        this.lastAlert = { x: ev.x, z: ev.z, at: performance.now() };
        this.alert(ev.what === 'building' ? 'Your base is under attack' : 'Your units are under attack', 'warn');
      } else if (ev.type === 'built' && ev.owner === this.seat) {
        this.alert(`${STATS[this.sim.players[this.seat].faction][ev.building].name} is ready`);
      } else if (ev.type === 'cant-build' && ev.owner === this.seat) {
        this.alert('Can\'t build there', 'warn');
      } else if (ev.type === 'eliminated') {
        const p = this.sim.players[ev.seat];
        this.alert(ev.seat === this.seat ? 'You have been defeated' : `${p.name} is out`, ev.seat === this.seat ? 'warn' : '');
      } else if (ev.type === 'over') {
        this._result();
      }
    }
  }

  alert(text, kind = '') {
    const box = this.$('[data-alerts]');
    const line = el('div', `rts-alert ${kind ? `is-${kind}` : ''}`, text);
    box.append(line);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => line.remove(), 4000);
  }

  _record(won) {
    const record = remember().record ?? { wins: 0, losses: 0 };
    if (won) record.wins++;
    else record.losses++;
    keep({ record });
  }

  _result() {
    const sim = this.sim;
    const won = sim.over.winners.includes(this.seat);
    this._record(won);
    const box = this.$('[data-result]');
    const rows = sim.players.map((p) => `<tr><td><span class="rts-dot" style="background:${TEAM_COLORS[p.seat]}"></span>${esc(p.name)}</td><td>${esc(FACTIONS[p.faction].name)}</td><td>${p.stats.gathered}</td><td>${p.stats.made}</td><td>${p.stats.killed}</td><td>${p.stats.lost}</td></tr>`).join('');
    box.innerHTML = `<div class="rts-result__card">
        <h2>${won ? 'Victory' : 'Defeat'}</h2>
        <p>${won ? 'Every enemy base is gone.' : 'Your last building fell.'} The match lasted ${clock(sim.seconds)}.</p>
        <table class="rts-table"><thead><tr><th>Player</th><th>Faction</th><th>Shards mined</th><th>Units made</th><th>Destroyed</th><th>Lost</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="rts-result__actions"><button type="button" class="rts-btn" data-watch>Look around</button><button type="button" class="rts-btn" data-again>Play again</button><button type="button" class="rts-btn rts-btn--go" data-home>Back to the games</button></div>
      </div>`;
    box.hidden = false;
    box.querySelector('[data-again]').addEventListener('click', () => this.setup());
    box.querySelector('[data-home]').addEventListener('click', () => this.close());
    box.querySelector('[data-watch]').addEventListener('click', () => {
      box.hidden = true;
    });
  }

  /* ---------------------------------------------------------- selection */

  /** Pick these: ours if any (units before buildings), else one other thing to look at. */
  select(list, { add = false, keepCard = false } = {}) {
    let picked = list.filter((e) => e && !e.dead);
    const mine = picked.filter((e) => e.owner === this.seat);
    if (mine.length) {
      const units = mine.filter((e) => e.kind === 'unit');
      picked = units.length ? units : mine.filter((e) => e.kind === 'building');
    } else {
      picked = picked.slice(0, 1);
    }
    if (add) {
      const ids = new Set(this.selection);
      for (const e of picked) {
        if (ids.has(e.id) && picked.length === 1) ids.delete(e.id);
        else ids.add(e.id);
      }
      picked = [...ids].map((id) => this.sim.get(id)).filter(Boolean);
      const ours = picked.filter((e) => e.owner === this.seat);
      picked = ours.length ? ours : picked.slice(0, 1);
    }
    this.selection = picked.slice(0, 120).map((e) => e.id);
    this.view.selected = new Set(this.selection);
    if (!keepCard) this.card = 'main';
    if (!keepCard && this.mode?.kind === 'build') this.setMode(null);
    this._hud();
  }

  get picked() {
    return this.selection.map((id) => this.sim.get(id)).filter(Boolean);
  }

  get mine() {
    return this.picked.filter((e) => e.owner === this.seat);
  }

  setMode(mode) {
    this.mode = mode;
    this.view.showGhost(null);
    this.root.classList.toggle('is-targeting', Boolean(mode));
    this._hud();
  }

  order(cmd) {
    this.sim.command(this.seat, cmd);
  }

  /* -------------------------------------------------------------- input */

  _mouse(stage) {
    const canvas = this.view.canvas;
    const box = this.$('[data-box]');
    let drag = null;
    let pan = null;
    let lastClick = 0;
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this._pointer = null;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.root.focus({ preventScroll: true });
      const p = at(e);
      if (e.button === 1) {
        pan = { ...p };
        e.preventDefault();
        return;
      }
      if (e.button === 2) {
        if (this.mode) {
          this.setMode(null);
          return;
        }
        this._rightClick(p);
        return;
      }
      if (e.button !== 0) return;
      if (this.mode) {
        this._modeClick(p, e.shiftKey);
        return;
      }
      drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, shift: e.shiftKey };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = at(e);
      this._pointer = p;
      if (pan) {
        const k = this.view.zoom / 400;
        this.view.pan(-(p.x - pan.x) * k, -(p.y - pan.y) * k);
        pan = { ...p };
        return;
      }
      if (drag) {
        drag.x1 = p.x;
        drag.y1 = p.y;
        if (Math.abs(drag.x1 - drag.x0) + Math.abs(drag.y1 - drag.y0) > 6) {
          box.hidden = false;
          Object.assign(box.style, { left: `${Math.min(drag.x0, drag.x1)}px`, top: `${Math.min(drag.y0, drag.y1)}px`, width: `${Math.abs(drag.x1 - drag.x0)}px`, height: `${Math.abs(drag.y1 - drag.y0)}px` });
        }
        return;
      }
      this.view.hover = this.mode?.kind === 'build' ? null : this.view.pick(p.x, p.y);
      if (this.mode?.kind === 'build') this._ghost(p);
    });
    canvas.addEventListener('pointerleave', () => {
      this._pointer = null;
      this.view.hover = null;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 1) {
        pan = null;
        return;
      }
      if (!drag || e.button !== 0) return;
      const d = drag;
      drag = null;
      box.hidden = true;
      if (Math.abs(d.x1 - d.x0) + Math.abs(d.y1 - d.y0) > 6) {
        this.select(this.view.inBox(d.x0, d.y0, d.x1, d.y1), { add: d.shift });
        return;
      }
      const hit = this.view.pick(d.x0, d.y0);
      const now = performance.now();
      if (hit && now - lastClick < 320 && hit.owner === this.seat) {
        // Double-click: every one of that kind on screen.
        const same = this.view.inBox(0, 0, this.view.width, this.view.height).filter((u) => u.type === hit.type);
        this.select(hit.kind === 'unit' ? same : [hit], { add: d.shift });
      } else {
        this.select(hit ? [hit] : [], { add: d.shift && Boolean(hit) });
      }
      lastClick = now;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.view.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
  }

  _rightClick(p) {
    const mine = this.mine;
    if (!mine.length) return;
    const hit = this.view.pick(p.x, p.y);
    const g = this.view.groundAt(p.x, p.y);
    if (!hit && !g) return;
    const target = hit && this.view.shows(hit) ? hit : null;
    const x = target?.x ?? g.x;
    const z = target?.z ?? g.z;
    this.order({ type: 'smart', ids: mine.map((e) => e.id), x, z, target: target?.id ?? null });
    const hostile = target && target.owner >= 0 && this.sim.hostile(this.seat, target.owner);
    this.view.pulse(x, z, hostile ? '#ef4444' : target?.kind === 'node' ? '#7ef0ff' : '#4ade80');
  }

  _modeClick(p, shift) {
    const mode = this.mode;
    const g = this.view.groundAt(p.x, p.y);
    if (mode.kind === 'build') {
      const spot = this._spot(p);
      if (!spot) return;
      if (!spot.ok) {
        this.alert(spot.why, 'warn');
        return;
      }
      const workers = this.mine.filter((e) => e.type === 'worker');
      const cx = (spot.x0 + spot.size / 2) * CELL;
      const cz = (spot.z0 + spot.size / 2) * CELL;
      workers.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
      const w = workers.find((u) => u.order.type !== 'build') ?? workers[0];
      if (!w) return;
      this.order({ type: 'build', ids: [w.id], building: mode.type, cx: spot.x0, cz: spot.z0 });
      this.view.pulse(cx, cz);
      if (!shift) {
        this.setMode(null);
        this.card = 'main';
      }
      return;
    }
    const hit = this.view.pick(p.x, p.y);
    const target = hit && this.view.shows(hit) && hit.kind !== 'node' ? hit : null;
    if (!g && !target) return;
    const x = target?.x ?? g.x;
    const z = target?.z ?? g.z;
    const ids = this.mine.map((e) => e.id);
    if (mode.order === 'rally') this.order({ type: 'rally', ids, x, z, node: hit?.kind === 'node' ? hit.id : null });
    else if (mode.order === 'amove' && target && this.sim.hostile(this.seat, target.owner)) this.order({ type: 'attack', ids, target: target.id });
    else this.order({ type: mode.order, ids, x, z });
    this.view.pulse(x, z, mode.order === 'amove' ? '#ef4444' : '#4ade80');
    if (!shift) this.setMode(null);
  }

  /** Where the building under the pointer would go, and whether it can. */
  _spot(p) {
    const g = this.view.groundAt(p.x, p.y);
    if (!g || this.mode?.kind !== 'build') return null;
    const type = this.mode.type;
    const s = STATS[this.sim.players[this.seat].faction][type];
    const x0 = Math.round(g.x / CELL - s.size / 2);
    const z0 = Math.round(g.z / CELL - s.size / 2);
    const me = this.sim.players[this.seat];
    let ok = this.sim.canPlace(this.seat, type, x0, z0);
    let why = ok ? '' : 'Can\'t build there';
    const c = this.sim.cellIndex(g.x, g.z);
    if (ok && !me.explored[c]) {
      ok = false;
      why = 'You haven\'t explored there';
    }
    if (ok && me.shards < s.cost) {
      ok = false;
      why = `Not enough shards (${s.cost})`;
    }
    return { x0, z0, size: s.size, ok, why };
  }

  _ghost(p) {
    this.view.showGhost(this._spot(p));
  }

  _key(e) {
    // Keys stay in the game (the platform's own shortcuts don't fire under it).
    e.stopPropagation();
    if (!this.sim) {
      if (e.key === 'Escape') this.close();
      return;
    }
    if (e.target instanceof HTMLInputElement) return;
    const code = e.code;
    this._keys.add(code);
    if (code.startsWith('Arrow')) {
      e.preventDefault();
      return;
    }
    const digit = /^Digit([1-9])$/.exec(code)?.[1];
    if (digit) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        this.groups[digit] = [...this.selection];
        this.alert(`Group ${digit} saved`);
      } else if (this.groups[digit]) {
        const again = this._lastGroup === digit && performance.now() - this._lastGroupAt < 400;
        this.select(this.groups[digit].map((id) => this.sim.get(id)).filter(Boolean));
        if (again && this.picked[0]) this.view.lookAt(this.picked[0].x, this.picked[0].z);
        this._lastGroup = digit;
        this._lastGroupAt = performance.now();
      }
      return;
    }
    if (e.key === 'Escape') {
      if (this.mode) this.setMode(null);
      else if (this.card !== 'main') {
        this.card = 'main';
        this._hud();
      } else this.select([]);
      return;
    }
    if (code === 'Space') {
      e.preventDefault();
      if (this.lastAlert && performance.now() - this.lastAlert.at < 15000) this.view.lookAt(this.lastAlert.x, this.lastAlert.z);
      else {
        const home = this.sim.buildingsOf(this.seat).find((b) => b.type === 'core') ?? this.picked[0];
        if (home) this.view.lookAt(home.x, home.z);
      }
      return;
    }
    if (code === 'KeyP' || code === 'Pause') {
      this.togglePause();
      return;
    }
    if (code === 'Period') {
      // The next idle worker.
      const idle = this.sim.unitsOf(this.seat).filter((u) => u.type === 'worker' && u.order.type === 'idle');
      if (idle.length) {
        this._idleAt = ((this._idleAt ?? -1) + 1) % idle.length;
        const w = idle[this._idleAt];
        this.select([w]);
        this.view.lookAt(w.x, w.z);
      }
      return;
    }
    // The command card's own keys.
    const button = [...this.$('[data-card]').querySelectorAll('button[data-key]')].find((b) => b.dataset.key === e.key.toUpperCase());
    if (button && !button.disabled) {
      e.preventDefault();
      button.click();
    }
  }

  _pan(dt) {
    if (!this.view) return;
    const speed = this.view.zoom * 1.4 * dt;
    let dx = 0;
    let dz = 0;
    if (this._keys.has('ArrowLeft')) dx -= 1;
    if (this._keys.has('ArrowRight')) dx += 1;
    if (this._keys.has('ArrowUp')) dz -= 1;
    if (this._keys.has('ArrowDown')) dz += 1;
    const p = this._pointer;
    if (p && document.hasFocus()) {
      const edge = 14;
      if (p.x < edge) dx -= 1;
      if (p.x > this.view.width - edge) dx += 1;
      if (p.y < edge) dz -= 1;
      if (p.y > this.view.height - edge) dz += 1;
    }
    if (dx || dz) this.view.pan(dx * speed, dz * speed);
  }

  /* ---------------------------------------------------------------- hud */

  _hud() {
    if (!this.sim) return;
    const sim = this.sim;
    const me = sim.players[this.seat];
    this.$('[data-shards]').textContent = String(me.shards);
    const supply = this.$('[data-supply]');
    supply.textContent = `${me.used}/${me.cap}`;
    supply.classList.toggle('is-full', me.used >= me.cap);
    this.$('[data-time]').textContent = clock(sim.seconds);
    this._info();
    this._card();
  }

  _info() {
    const box = this.$('[data-info]');
    const picked = this.picked;
    const key = picked.map((e) => `${e.id}:${Math.ceil(e.hp)}:${e.order?.type ?? ''}:${e.queue?.length ?? ''}:${e.built ?? ''}:${e.amount ?? ''}`).join(',');
    if (key === this._infoKey && !picked.some((e) => e.queue?.length || (e.kind === 'building' && !e.built))) return;
    this._infoKey = key;
    box.replaceChildren();
    if (!picked.length) {
      const idle = this.sim.unitsOf(this.seat).filter((u) => u.type === 'worker' && u.order.type === 'idle').length;
      box.append(el('p', 'rts-info__hint', idle ? `${idle} idle worker${idle > 1 ? 's' : ''} — press . to find them` : 'Click a unit or drag a box to select.'));
      return;
    }
    if (picked.length === 1) {
      const e = picked[0];
      const head = el('div', 'rts-info__head');
      const icon = el('span', 'rts-info__icon', ICONS[e.type] ?? '?');
      if (e.owner >= 0) icon.style.color = TEAM_COLORS[e.owner];
      head.append(icon);
      const titles = el('div');
      if (e.kind === 'node') {
        titles.append(el('strong', null, 'Shard crystal'), el('small', null, `${e.amount} shards left`));
        head.append(titles);
        box.append(head);
        return;
      }
      const p = this.sim.players[e.owner];
      const s = STATS[p.faction][e.type];
      titles.append(el('strong', null, s.name), el('small', null, `${FACTIONS[p.faction].name}${e.owner === this.seat ? '' : ` · ${p.name}`}`));
      head.append(titles);
      box.append(head);
      const hp = el('div', 'rts-info__hp');
      hp.append(el('span', 'rts-bar'), el('small', null, `${Math.ceil(e.hp)} / ${e.maxHp}${e.armor ? ` · armor ${e.armor}` : ''}`));
      hp.firstChild.style.setProperty('--k', String(Math.max(0, e.hp / e.maxHp)));
      box.append(hp);
      if (e.kind === 'unit') {
        const facts = [s.damage ? `${s.damage} damage` : '', s.range > 2 ? `range ${s.range}` : 'up close', `speed ${s.speed}`, s.splash ? 'splash' : ''].filter(Boolean).join(' · ');
        box.append(el('p', 'rts-info__line', facts));
        if (e.owner === this.seat) box.append(el('p', 'rts-info__line', ORDER_WORDS[e.order.type] ?? ''));
      } else if (!e.built) {
        box.append(el('p', 'rts-info__line', `Building… ${Math.floor(e.progress * 100)}%${FACTIONS[p.faction].builds === 'attend' && e.attended < this.sim.tick - 2 ? ' — needs a worker (right-click it with one)' : ''}`));
      } else if (e.owner === this.seat && e.queue.length) {
        const q = el('div', 'rts-queue');
        e.queue.forEach((job, i) => {
          const js = STATS[p.faction][job.type];
          const b = el('button', 'rts-queue__item', ICONS[job.type]);
          b.type = 'button';
          b.title = `${js.name}${i === e.queue.length - 1 ? ' — click to cancel' : ''}`;
          if (i === 0) b.style.setProperty('--k', String(Math.min(1, job.t / js.time)));
          b.addEventListener('click', () => this.order({ type: 'cancel', building: e.id }));
          q.append(b);
        });
        box.append(q);
      } else {
        box.append(el('p', 'rts-info__line', s.blurb));
      }
      return;
    }
    const grid = el('div', 'rts-tiles');
    for (const e of picked.slice(0, 40)) {
      const t = el('button', 'rts-tile', ICONS[e.type]);
      t.type = 'button';
      t.title = STATS[this.sim.players[e.owner].faction][e.type].name;
      t.style.setProperty('--k', String(Math.max(0, e.hp / e.maxHp)));
      t.addEventListener('click', (ev) => this.select([e], { add: ev.shiftKey }));
      grid.append(t);
    }
    box.append(grid);
    if (picked.length > 40) box.append(el('small', 'rts-info__more', `and ${picked.length - 40} more`));
  }

  _card() {
    const box = this.$('[data-card]');
    const mine = this.mine;
    const me = this.sim.players[this.seat];
    const stats = STATS[me.faction];
    const buttons = [];
    const add = (key, icon, label, { onClick, disabled = false, why = '', cost = null, active = false } = {}) => buttons.push({ key, icon, label, onClick, disabled, why, cost, active });
    const units = mine.filter((e) => e.kind === 'unit');
    const building = mine.length && !units.length ? mine[0] : null;
    if (units.length) {
      const workers = units.filter((u) => u.type === 'worker');
      if (this.card === 'build' && workers.length) {
        for (const type of BUILDING_ORDER) {
          const s = stats[type];
          const locked = !this.sim.unlocked(this.seat, type);
          const poor = me.shards < s.cost;
          add(BUILD_KEYS[type], ICONS[type], s.name, {
            cost: s.cost,
            disabled: locked || poor,
            why: locked ? `Needs a ${stats[s.needs].name}` : poor ? 'Not enough shards' : s.blurb,
            active: this.mode?.kind === 'build' && this.mode.type === type,
            onClick: () => this.setMode({ kind: 'build', type })
          });
        }
        add('ESCAPE', '↩', 'Back', { onClick: () => { this.card = 'main'; this.setMode(null); } });
      } else {
        add('M', '➜', 'Move', { active: this.mode?.order === 'move', onClick: () => this.setMode({ kind: 'target', order: 'move' }) });
        add('S', '■', 'Stop', { onClick: () => this.order({ type: 'stop', ids: units.map((u) => u.id) }) });
        add('H', '⛊', 'Hold', { onClick: () => this.order({ type: 'hold', ids: units.map((u) => u.id) }) });
        add('A', '⚔', 'Attack', { active: this.mode?.order === 'amove', onClick: () => this.setMode({ kind: 'target', order: 'amove' }) });
        if (workers.length) add('B', '⚒', 'Build', { onClick: () => { this.card = 'build'; this._hud(); } });
      }
    } else if (building && building.built) {
      trainsOf(building.type).forEach((type, i) => {
        const s = stats[type];
        const locked = !this.sim.unlocked(this.seat, type);
        const full = me.used + s.supply > me.cap;
        const poor = me.shards < s.cost;
        add(TRAIN_KEYS[i], ICONS[type], s.name, {
          cost: s.cost,
          disabled: locked || poor || full || building.queue.length >= 5,
          why: locked ? 'Locked' : poor ? 'Not enough shards' : full ? 'Not enough supply: build more supply' : building.queue.length >= 5 ? 'The queue is full' : `${s.blurb} (${s.supply} supply)`,
          onClick: () => {
            for (const b of mine.filter((m) => m.type === building.type && m.built).sort((a, c) => a.queue.length - c.queue.length).slice(0, 1)) this.order({ type: 'train', building: b.id, unit: type });
          }
        });
      });
      if (trainsOf(building.type).length) add('Y', '⚐', 'Rally', { active: this.mode?.order === 'rally', onClick: () => this.setMode({ kind: 'target', order: 'rally' }) });
      if (building.queue.length) add('X', '✕', 'Cancel', { onClick: () => this.order({ type: 'cancel', building: building.id }) });
    } else if (building) {
      add('X', '✕', 'Cancel', { why: 'Stop building it: most of its cost back', onClick: () => this.order({ type: 'cancel', building: building.id }) });
    }
    const sig = buttons.map((b) => `${b.key}${b.disabled}${b.active}`).join('|');
    if (sig === this._cardSig) return;
    this._cardSig = sig;
    box.replaceChildren();
    for (const b of buttons) {
      const btn = el('button', `rts-cmd${b.active ? ' is-active' : ''}`);
      btn.type = 'button';
      btn.dataset.key = b.key;
      btn.disabled = b.disabled;
      btn.title = `${b.label}${b.key === 'ESCAPE' ? ' (Esc)' : ` (${b.key})`}${b.why ? ` — ${b.why}` : ''}`;
      btn.setAttribute('aria-label', btn.title);
      btn.innerHTML = '<span class="rts-cmd__icon" aria-hidden="true"></span><span class="rts-cmd__label"></span><kbd></kbd>';
      btn.querySelector('.rts-cmd__icon').textContent = b.icon;
      btn.querySelector('.rts-cmd__label').textContent = b.label;
      btn.querySelector('kbd').textContent = b.key === 'ESCAPE' ? 'Esc' : b.key;
      if (b.cost != null) {
        const c = el('small', 'rts-cmd__cost', `◆${b.cost}`);
        btn.append(c);
      }
      btn.addEventListener('click', () => {
        b.onClick?.();
        this._cardSig = null;
        this._hud();
      });
      box.append(btn);
    }
  }

  /* ------------------------------------------------------------ minimap */

  _miniBase() {
    const { n, block } = this.sim.map;
    const img = new ImageData(n, n);
    const heights = this.sim.map.heights;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        const b = block[i];
        const h = heights[z * (n + 1) + x];
        let c = [86 + h * 4, 118 + h * 4, 58];
        if (b === ROCK) c = [104, 99, 92];
        else if (b === FOREST) c = [44, 74, 36];
        else if (b === WATER) c = [42, 104, 140];
        img.data.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    this._miniImg = img;
    this._fogImg = new ImageData(n, n);
    this._miniCanvas = Object.assign(document.createElement('canvas'), { width: n, height: n });
    this._fogCanvas = Object.assign(document.createElement('canvas'), { width: n, height: n });
    this._miniCanvas.getContext('2d').putImageData(img, 0, 0);
  }

  _minimap() {
    const ctx = this.mctx;
    const sim = this.sim;
    const W = this.mini.width;
    const k = W / sim.map.size;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._miniCanvas, 0, 0, W, W);
    const me = sim.players[this.seat];
    const fog = this._fogImg.data;
    for (let i = 0; i < me.vision.length; i++) fog[i * 4 + 3] = me.vision[i] ? 0 : me.explored[i] ? 120 : 235;
    this._fogCanvas.getContext('2d').putImageData(this._fogImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._fogCanvas, 0, 0, W, W);
    for (const e of sim.entities.values()) {
      if (e.dead || !this.view.shows(e)) continue;
      if (e.kind === 'node') {
        if (!me.explored[sim.cellIndex(e.x, e.z)]) continue;
        ctx.fillStyle = '#7ef0ff';
        ctx.fillRect(e.x * k - 1, e.z * k - 1, 2, 2);
        continue;
      }
      ctx.fillStyle = TEAM_COLORS[e.owner];
      const s = e.kind === 'building' ? Math.max(3, e.size * CELL * k) : 2.5;
      ctx.fillRect(e.x * k - s / 2, e.z * k - s / 2, s, s);
    }
    if (this.lastAlert && performance.now() - this.lastAlert.at < 3000) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.lastAlert.x * k, this.lastAlert.z * k, 6 + ((performance.now() / 120) % 6), 0, Math.PI * 2);
      ctx.stroke();
    }
    const corners = this.view.viewCorners();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    corners.forEach((c, i) => (i ? ctx.lineTo(c.x * k, c.z * k) : ctx.moveTo(c.x * k, c.z * k)));
    ctx.closePath();
    ctx.stroke();
  }

  _minimapInput() {
    const mini = this.mini;
    const world = (e) => {
      const r = mini.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * this.sim.map.size, z: ((e.clientY - r.top) / r.height) * this.sim.map.size };
    };
    let held = false;
    mini.addEventListener('contextmenu', (e) => e.preventDefault());
    mini.addEventListener('pointerdown', (e) => {
      const p = world(e);
      if (e.button === 2) {
        const mine = this.mine;
        if (mine.length) this.order({ type: 'smart', ids: mine.map((m) => m.id), x: p.x, z: p.z, target: null });
        return;
      }
      if (this.mode?.kind === 'target') {
        this.order(this.mode.order === 'rally' ? { type: 'rally', ids: this.mine.map((m) => m.id), x: p.x, z: p.z } : { type: this.mode.order, ids: this.mine.map((m) => m.id), x: p.x, z: p.z });
        this.setMode(null);
        return;
      }
      held = true;
      mini.setPointerCapture(e.pointerId);
      this._centerOn(p);
    });
    mini.addEventListener('pointermove', (e) => held && this._centerOn(world(e)));
    mini.addEventListener('pointerup', () => {
      held = false;
    });
  }

  /** Put a ground point in the middle of the screen (the camera looks at a point a little above it). */
  _centerOn(p) {
    this.view.lookAt(p.x, p.z);
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
