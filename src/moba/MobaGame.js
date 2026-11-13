import { MobaSim } from './sim.js';
import { MobaView } from './view.js';
import { MobaLink, Mirror, pack, SNAP_EVERY } from './net.js';
import { makeSeats } from './seats.js';
import { Bot } from './bots.js';
import { TICK, MAP, CHAMPIONS, CHAMPION_ORDER, ITEMS, ITEM_ORDER, DIFFICULTIES, TEAM_NAMES, TEAM_COLORS, BLINK, MEND, RECALL_TIME } from './rules.js';
import { BASES } from './map.js';
import './moba.css';

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ROLE_ICONS = { tank: '🛡', fighter: '⚔', mage: '✦', marksman: '🏹', assassin: '🗡', support: '✚' };
const KIND_WORDS = { shot: 'Skillshot', area: 'Area', nova: 'Around you', dash: 'Dash', blink: 'Blink', target: 'Targeted', self: 'Self' };
const STORE = 'elemental-arena.lanebreak';
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
    /* private mode */
  }
};

/** What an ability does, for its tooltip. */
function describe(ab, rank = 1) {
  const r = (v) => (Array.isArray(v) ? v[Math.max(0, Math.min(v.length - 1, rank - 1))] : v);
  const bits = [KIND_WORDS[ab.kind]];
  if (ab.damage) bits.push(`${r(ab.damage)} ${ab.type} damage${ab.ad ? ` (+${Math.round(ab.ad * 100)}% AD)` : ''}${ab.ap ? ` (+${Math.round(ab.ap * 100)}% AP)` : ''}`);
  if (ab.heal) bits.push(`heals ${r(ab.heal)}`);
  if (ab.shield) bits.push(`shield ${r(ab.shield)}`);
  if (ab.stun) bits.push(`stuns ${ab.stun}s`);
  if (ab.root) bits.push(`roots ${ab.root}s`);
  if (ab.slow) bits.push(`slows ${Math.round(ab.slow.amount * 100)}%`);
  if (ab.pull) bits.push('pulls');
  if (ab.buff) bits.push(Object.entries(ab.buff).filter(([k]) => k !== 'time').map(([k, v]) => `+${k === 'as' || k === 'ms' || k === 'lifesteal' ? `${Math.round(r(v) * 100)}%` : r(v)} ${k}`).join(', ') + ` for ${ab.buff.time}s`);
  if (ab.missing) bits.push('more on the wounded');
  if (ab.duration) bits.push(`lasts ${ab.duration}s`);
  bits.push(`${ab.cost} mana · ${r(ab.cd)}s`);
  return bits.join(' · ');
}

/**
 * Lanebreak: a three-lane battle arena. Five against five — you and bots,
 * or friends in a party (one hosts the match, the others join by code).
 * Destroy the towers down a lane, then the enemy core.
 */
export class MobaGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'lb');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Lanebreak');
    host.append(this.root);
    this.keys = new Set();
    this.root.addEventListener('keydown', (e) => this._keydown(e));
    this.root.addEventListener('keyup', (e) => {
      e.stopPropagation();
      this.keys.delete(e.code);
      if (e.code === 'Tab') this._board(false);
      if (e.code === 'Space') this.spaceHeld = false;
    });
    window.lanebreak = this;
  }

  async open() {
    this.setup();
    this.root.focus();
  }

  close() {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    if (this._up) window.removeEventListener('pointerup', this._up);
    if (this.link) {
      if (this.role === 'host' && this.sim) this.link.send({ t: 'lb-end' });
      this.link.leave();
    }
    this.view?.dispose();
    this.root.remove();
    if (window.lanebreak === this) delete window.lanebreak;
    this.onClose?.();
  }

  /* ------------------------------------------------------------- set-up */

  setup() {
    cancelAnimationFrame(this._raf);
    this.view?.dispose();
    this.view = null;
    this.sim = null;
    const saved = remember();
    this.pick = {
      champ: CHAMPIONS[saved.champ] ? saved.champ : 'sela',
      team: saved.team === 'red' ? 'red' : 'blue',
      difficulty: DIFFICULTIES[saved.difficulty] ? saved.difficulty : 'normal',
      name: saved.name || this.account?.name || ''
    };
    const record = saved.record ?? { wins: 0, losses: 0 };
    this.root.innerHTML = `
      <div class="lb-setup">
        <header class="lb-setup__head">
          <div><h1>Lanebreak</h1><p>Five against five down three lanes. Take the towers, then the enemy core. Play with bots, or with friends.</p></div>
          <button type="button" class="lb__x" data-close aria-label="Back to the games">✕</button>
        </header>
        <section><h2>Your champion</h2><div class="lb-champs" data-champs role="radiogroup" aria-label="Champion"></div><div class="lb-kit" data-kit></div></section>
        <section class="lb-setup__row">
          <div><h2>Side</h2><div class="lb-seg" data-team role="radiogroup" aria-label="Side">
            <button type="button" class="lb-seg__opt" data-value="blue" role="radio"><span>Dawn</span><small>bottom-left</small></button>
            <button type="button" class="lb-seg__opt" data-value="red" role="radio"><span>Dusk</span><small>top-right</small></button></div></div>
          <div><h2>Bots</h2><div class="lb-seg" data-difficulty role="radiogroup" aria-label="Bot difficulty"></div></div>
        </section>
        <section class="lb-modes">
          <div class="lb-mode">
            <h2>Play alone</h2><p>You and nine bots.</p>
            <button type="button" class="lb-btn lb-btn--go" data-solo>Start a match</button>
          </div>
          <div class="lb-mode">
            <h2>Play with friends</h2><p>Up to four people in a party — bots fill the other seats. Pick sides: together, or against each other.</p>
            <label class="lb-field">Your name <input data-name maxlength="24" placeholder="Player" autocomplete="nickname"></label>
            <div class="lb-mode__row"><button type="button" class="lb-btn" data-host>Make a party</button>
              <input class="lb-code" data-code maxlength="5" placeholder="CODE" aria-label="Party code"><button type="button" class="lb-btn" data-join>Join</button></div>
            <p class="lb-mode__status" data-status role="status"></p>
          </div>
        </section>
        <footer class="lb-setup__foot"><span>${record.wins} won · ${record.losses} lost</span><span>Characters: KayKit Adventurers &amp; Skeletons by Kay Lousberg (CC0). Champions, names and abilities are Gamory's own.</span></footer>
        <details class="lb-help"><summary>How to play</summary><ul>
          <li><b>Move</b>: right-click the ground (hold to keep walking). <b>Attack</b>: right-click an enemy. <kbd>A</kbd> then click: attack-move. <kbd>S</kbd> stop.</li>
          <li><b>Abilities</b>: <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> cast at the cursor (a targeted one, at the unit under it). Each level gives a point: click a <b>+</b> or press <kbd>Ctrl</kbd>+the key. <kbd>R</kbd> opens at level 6.</li>
          <li><kbd>D</kbd> Blink · <kbd>F</kbd> Mend (heal) · <kbd>B</kbd> recall home · <kbd>P</kbd> shop (at home, or while dead) · <kbd>Tab</kbd> scores.</li>
          <li><b>Camera</b>: follows you; <kbd>Y</kbd> unlocks it (then the screen's edge or arrows move it), hold <kbd>Space</kbd> to look at yourself, the wheel zooms.</li>
          <li><b>Gold</b> comes from the last hit on a minion, kills, towers and jungle monsters. The Riverwarden in the river gives your whole side more damage for two minutes.</li>
        </ul></details>
      </div>`;
    const $ = (s) => this.root.querySelector(s);
    $('[data-close]').addEventListener('click', () => this.close());
    const grid = $('[data-champs]');
    for (const id of CHAMPION_ORDER) {
      const c = CHAMPIONS[id];
      const b = el('button', 'lb-champ');
      b.type = 'button';
      b.dataset.champ = id;
      b.setAttribute('role', 'radio');
      b.innerHTML = '<span class="lb-champ__icon" aria-hidden="true"></span><strong></strong><small></small>';
      b.querySelector('.lb-champ__icon').textContent = c.name[0];
      b.querySelector('strong').textContent = c.name;
      b.querySelector('small').textContent = `${ROLE_ICONS[c.role]} ${c.role} · ${c.lane}`;
      b.addEventListener('click', () => {
        this.pick.champ = id;
        paint();
        this._sendPick();
      });
      grid.append(b);
    }
    const diff = $('[data-difficulty]');
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      const b = el('button', 'lb-seg__opt');
      b.type = 'button';
      b.dataset.value = id;
      b.setAttribute('role', 'radio');
      b.innerHTML = '<span></span>';
      b.querySelector('span').textContent = d.name;
      b.addEventListener('click', () => {
        this.pick.difficulty = id;
        paint();
        this._lobbyBroadcast();
      });
      diff.append(b);
    }
    for (const b of $('[data-team]').children) {
      b.addEventListener('click', () => {
        this.pick.team = b.dataset.value;
        paint();
        this._sendPick();
      });
    }
    const name = $('[data-name]');
    name.value = this.pick.name;
    name.addEventListener('input', () => {
      this.pick.name = name.value.trim().slice(0, 24);
    });
    const paint = () => {
      for (const b of grid.children) b.setAttribute('aria-checked', String(b.dataset.champ === this.pick.champ));
      for (const b of $('[data-team]').children) b.setAttribute('aria-checked', String(b.dataset.value === this.pick.team));
      for (const b of diff.children) b.setAttribute('aria-checked', String(b.dataset.value === this.pick.difficulty));
      const c = CHAMPIONS[this.pick.champ];
      const kit = $('[data-kit]');
      kit.innerHTML = `<div class="lb-kit__head"><strong>${esc(c.name)}</strong> <span>${esc(c.title)}</span></div><p>${esc(c.blurb)}</p><ul>${c.abilities.map((a) => `<li><kbd>${a.key}</kbd> <b>${esc(a.name)}</b> — ${esc(describe(a))}</li>`).join('')}</ul>`;
      keep({ champ: this.pick.champ, team: this.pick.team, difficulty: this.pick.difficulty });
    };
    paint();
    $('[data-solo]').addEventListener('click', () => {
      const seats = makeSeats([{ name: this.pick.name || 'You', champ: this.pick.champ, team: this.pick.team, id: 'me' }], this.pick.difficulty);
      this.start({ seats, mySlot: seats.findIndex((s) => s.owner === 'me'), role: 'solo' });
    });
    $('[data-host]').addEventListener('click', () => this._party('host'));
    $('[data-join]').addEventListener('click', () => this._party('join', $('[data-code]').value));
  }

  /* -------------------------------------------------------------- party */

  async _party(how, code) {
    const status = this.root.querySelector('[data-status]');
    keep({ name: this.pick.name });
    try {
      status.textContent = how === 'host' ? 'Making a party…' : 'Joining…';
      this.link?.leave();
      this.link = new MobaLink();
      if (how === 'host') await this.link.create(this.pick.name || 'Host');
      else await this.link.join(code, this.pick.name || 'Player');
    } catch (error) {
      status.textContent = error.message || 'Could not reach the party server.';
      return;
    }
    this.role = this.link.isHost ? 'host' : 'guest';
    this.picks = new Map();
    this.picks.set(this.link.id, { name: this.pick.name || 'Player', champ: this.pick.champ, team: this.pick.team, ready: this.role === 'host' });
    this.link
      .on('lb-pick', (msg) => {
        if (this.role !== 'host') return;
        this.picks.set(msg.from, { name: String(msg.name ?? 'Player').slice(0, 24), champ: CHAMPIONS[msg.champ] ? msg.champ : 'brakka', team: msg.team === 'red' ? 'red' : 'blue', ready: Boolean(msg.ready) });
        this._lobbyBroadcast();
      })
      .on('lb-lobby', (msg) => {
        if (this.role !== 'guest') return;
        this.lobby = msg;
        this._lobbyPaint();
      })
      .on('lb-start', (msg) => {
        if (this.role !== 'guest') return;
        this.start({ seats: msg.seats, mySlot: msg.seats.findIndex((s) => s.owner === this.link.id), role: 'guest' });
      })
      .on('lb-cmd', (msg) => {
        if (this.role !== 'host' || !this.sim) return;
        const slot = this.seats.findIndex((s) => s.owner === msg.from);
        if (slot >= 0 && msg.c && typeof msg.c.type === 'string') this.sim.command(slot, msg.c);
      })
      .on('lb-snap', (msg) => {
        if (this.role !== 'guest' || !this.mirror) return;
        this.mirror.push(msg.s);
        if (Array.isArray(msg.ev)) this.inbox.push(...msg.ev);
      })
      .on('lb-end', () => this._hostGone())
      .on('closed', () => this._hostGone())
      .on('peers', () => this._lobbyBroadcast())
      .on('left', (id) => {
        if (this.role !== 'host') return;
        this.picks.delete(id);
        this._lobbyBroadcast();
        // In a match: a bot takes the seat.
        const slot = this.seats?.findIndex((s) => s.owner === id) ?? -1;
        if (slot >= 0 && this.sim) {
          const c = this.sim.seats[slot];
          c.bot = this.pick.difficulty;
          this.sim.bots.push(new Bot(this.sim, c));
          this._feed(`${c.name} left — a bot plays on`);
        }
      });
    if (this.role === 'guest') this._sendPick();
    this._lobbyPaint();
    this._lobbyBroadcast();
  }

  _sendPick(ready = this.picks?.get(this.link?.id)?.ready ?? false) {
    if (!this.link?.inRoom || this.sim) return;
    const me = { name: this.pick.name || 'Player', champ: this.pick.champ, team: this.pick.team, ready };
    this.picks?.set(this.link.id, me);
    if (this.role === 'host') this._lobbyBroadcast();
    else this.link.sendTo(this.link.session.host, { t: 'lb-pick', ...me });
    this._lobbyPaint();
  }

  _lobbyBroadcast() {
    if (this.role !== 'host' || !this.link?.inRoom || this.sim) return;
    const present = new Set(this.link.peers().map((p) => p.id));
    for (const id of [...this.picks.keys()]) if (!present.has(id)) this.picks.delete(id);
    for (const p of this.link.peers()) if (!this.picks.has(p.id)) this.picks.set(p.id, { name: p.name, champ: 'brakka', team: 'blue', ready: false });
    this.lobby = { t: 'lb-lobby', host: this.link.id, difficulty: this.pick.difficulty, players: [...this.picks.entries()].map(([id, p]) => ({ id, ...p })) };
    this.link.send(this.lobby);
    this._lobbyPaint();
  }

  _lobbyPaint() {
    const status = this.root.querySelector('[data-status]');
    if (!status || !this.link?.inRoom) return;
    const mode = status.closest('.lb-mode');
    let box = mode.querySelector('.lb-lobby');
    if (!box) {
      box = el('div', 'lb-lobby');
      mode.append(box);
    }
    const players = this.lobby?.players ?? [...(this.picks ?? new Map()).entries()].map(([id, p]) => ({ id, ...p }));
    status.textContent = `Party code: ${this.link.code} — friends join with it.`;
    const me = players.find((p) => p.id === this.link.id);
    box.innerHTML = `<ul class="lb-lobby__list">${players.map((p) => `<li><span class="lb-dot" style="background:${TEAM_COLORS[p.team]}"></span><b>${esc(p.name)}</b>${p.id === (this.lobby?.host ?? this.link.id) ? ' ★' : ''} — ${esc(CHAMPIONS[p.champ]?.name ?? '?')} · ${TEAM_NAMES[p.team]} ${p.ready ? '<em>ready</em>' : ''}</li>`).join('')}</ul>
      <div class="lb-mode__row">${this.role === 'host' ? '<button type="button" class="lb-btn lb-btn--go" data-start-party>Start for everyone</button>' : `<button type="button" class="lb-btn" data-ready>${me?.ready ? 'Not ready' : 'Ready'}</button>`}<button type="button" class="lb-btn" data-leave>Leave</button></div>
      <p class="lb-mode__hint">${this.role === 'host' ? `Bots: ${DIFFICULTIES[this.pick.difficulty].name}. Everyone picks a champion and a side above.` : 'Pick your champion and side above, then press Ready.'}</p>`;
    box.querySelector('[data-start-party]')?.addEventListener('click', () => this._hostStart());
    box.querySelector('[data-ready]')?.addEventListener('click', () => this._sendPick(!me?.ready));
    box.querySelector('[data-leave]')?.addEventListener('click', () => {
      this.link.leave();
      this.link = null;
      this.setup();
    });
  }

  _hostStart() {
    const people = [...this.picks.entries()].map(([id, p]) => ({ id, name: p.name, champ: p.champ, team: p.team }));
    const seats = makeSeats(people, this.pick.difficulty);
    this.link.send({ t: 'lb-start', seats });
    this.start({ seats, mySlot: seats.findIndex((s) => s.owner === this.link.id), role: 'host' });
  }

  _hostGone() {
    if (this.role !== 'guest') return;
    if (this.sim === null && this.mirror) {
      this._result(null, 'The host closed the match.');
      return;
    }
    const status = this.root.querySelector('[data-status]');
    if (status) status.textContent = 'The party ended.';
  }

  /* -------------------------------------------------------------- match */

  /**
   * @param {{ seats: object[], mySlot: number, role: 'solo'|'host'|'guest' }} options
   */
  start({ seats, mySlot, role }) {
    this.role = role;
    this.seats = seats;
    this.mySlot = mySlot;
    this.team = seats[mySlot].team;
    this.lock = true;
    this.mode = null;
    this.inbox = [];
    this.feed = [];
    this.over = null;
    this.mirror = new Mirror({ delay: role === 'guest' ? 0.12 : 0 });
    this.sim = role === 'guest' ? null : new MobaSim({ seats, seed: Math.floor(Math.random() * 1e9) });
    this.acc = 0;
    this.root.innerHTML = `
      <div class="lb-stage" data-stage><canvas class="lb__overlay" data-overlay></canvas></div>
      <header class="lb-top">
        <div class="lb-top__score"><span class="is-blue" data-kills-blue>0</span><span class="lb-top__time" data-time>0:00</span><span class="is-red" data-kills-red>0</span></div>
        <div class="lb-top__towers" data-towers></div>
        <div class="lb-top__actions"><button type="button" class="lb-btn" data-shop-open title="Shop (P)">Shop</button><button type="button" class="lb-btn" data-board-open title="Scores (Tab)">Scores</button><button type="button" class="lb__x" data-close aria-label="Leave the match">✕</button></div>
      </header>
      <div class="lb-feed" data-feed aria-live="polite"></div>
      <div class="lb-dead" data-dead hidden></div>
      <footer class="lb-hud" data-hud>
        <div class="lb-hud__me"><span class="lb-portrait" data-portrait></span><span class="lb-level" data-level>1</span></div>
        <div class="lb-hud__main">
          <div class="lb-abilities" data-abilities></div>
          <div class="lb-bars"><div class="lb-bar lb-bar--hp"><span data-hp-fill></span><b data-hp></b></div><div class="lb-bar lb-bar--mana"><span data-mana-fill></span><b data-mana></b></div><div class="lb-bar lb-bar--xp"><span data-xp-fill></span></div></div>
        </div>
        <div class="lb-hud__side">
          <div class="lb-items" data-items></div>
          <div class="lb-gold"><span>🪙 <b data-gold>0</b></span><span class="lb-stats" data-stats></span></div>
        </div>
        <canvas class="lb-mini" data-mini width="200" height="200" aria-label="Minimap"></canvas>
      </footer>
      <div class="lb-panel" data-shop hidden></div>
      <div class="lb-panel lb-panel--board" data-board hidden></div>
      <div class="lb-result" data-result hidden></div>`;
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    const stage = $('[data-stage]');
    this.view = new MobaView(stage, { team: this.team });
    this.overlay = $('[data-overlay]');
    this.octx = this.overlay.getContext('2d');
    this.mini = $('[data-mini]');
    this.mctx = this.mini.getContext('2d');
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
      if (this.over || window.confirm('Leave this match?')) {
        if (!this.over && role !== 'guest') this._record(false);
        this.close();
      }
    });
    $('[data-shop-open]').addEventListener('click', () => this._shop(!this.shopOpen));
    $('[data-board-open]').addEventListener('click', () => this._board(!this.boardOpen));
    this._abilityBar();
    this._mouse(stage);
    this._minimapInput();
    if (this.sim) {
      this.mirror.push(this.sim.snapshot());
      this.view.preload(this.sim.snapshot());
    }
    this._last = performance.now();
    this._hudAt = 0;
    this.root.focus();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this.frame(Math.min(0.1, (now - this._last) / 1000));
      this._last = now;
    };
    this._raf = requestAnimationFrame(loop);
  }

  /** Send a command for my champion: to the match here, or to the host. */
  send(cmd) {
    if (this.sim) this.sim.command(this.mySlot, cmd);
    else this.link?.sendTo(this.link.session.host, { t: 'lb-cmd', c: cmd });
  }

  frame(dt) {
    let alpha = null;
    if (this.sim) {
      if (!this.sim.over) {
        this.acc += dt;
        let steps = 0;
        const outgoing = [];
        while (this.acc >= TICK && steps < 6) {
          this.sim.step();
          this.acc -= TICK;
          steps++;
          const snap = this.sim.snapshot();
          this.mirror.push(snap);
          const events = this.sim.drainEvents();
          this.inbox.push(...events);
          if (this.role === 'host') {
            outgoing.push(...events);
            this.hostOut = (this.hostOut ?? []).concat(events);
            if (this.sim.tick % SNAP_EVERY === 0) {
              // Hits only where a champion is in them: the rest is noise on the wire.
              const champIds = new Set(this.sim.seats.map((c) => c.id));
              const ev = this.hostOut.filter((e) => e.type !== 'hit' || champIds.has(e.id) || champIds.has(e.by));
              this.link.send({ t: 'lb-snap', s: pack(snap), ev });
              this.hostOut = [];
            }
          }
        }
        if (steps === 6) this.acc = 0;
      }
      alpha = Math.min(1, this.acc / TICK);
    }
    const state = this.mirror.state(dt, alpha);
    this.state = state;
    if (!state) {
      this.view.render(null, dt);
      return;
    }
    if (!this.preloaded && this.role === 'guest') {
      this.preloaded = true;
      this.view.preload(state);
    }
    const events = this.inbox;
    this.inbox = [];
    this.view.absorb(events, state, this.mySlot);
    this._events(events, state);
    const me = state.champs[this.mySlot];
    const meEnt = state.ents.find((e) => e.i === me?.i);
    if (meEnt && (this.lock || this.spaceHeld)) this.view.lookAt(meEnt.x, meEnt.z + 4);
    this._pan(dt);
    this.view.render(state, dt);
    this.view.drawOverlay(this.octx, state, this.mySlot);
    this._hudAt -= dt;
    if (this._hudAt <= 0) {
      this._hudAt = 0.1;
      this._hud(state);
      this._minimap(state);
    }
    if (state.over && !this.over) this._result(state.over.winner);
  }

  _events(events, state) {
    for (const ev of events) {
      if (ev.type === 'kill') {
        const v = state.champs[ev.victim];
        const k = ev.killer != null ? state.champs[ev.killer] : null;
        this._feed(k ? `${k.name} ⚔ ${v.name}` : `${v.name} was slain`, ev.team === this.team ? 'good' : 'bad');
      } else if (ev.type === 'tower') {
        this._feed(`${TEAM_NAMES[ev.team]} lost a ${ev.tier === 'core' ? 'core' : `${ev.lane ?? 'base'} tower`}`, ev.team === this.team ? 'bad' : 'good');
      } else if (ev.type === 'boon') {
        this._feed(`${TEAM_NAMES[ev.team]} slew the Riverwarden`, ev.team === this.team ? 'good' : 'bad');
      } else if (ev.type === 'level' && ev.slot === this.mySlot) {
        this._feed(`Level ${ev.level} — a point to spend`, 'good');
      }
    }
  }

  _feed(text, kind = '') {
    const box = this.$?.('[data-feed]');
    if (!box) return;
    const line = el('div', `lb-feed__line ${kind ? `is-${kind}` : ''}`, text);
    box.prepend(line);
    while (box.children.length > 6) box.lastChild.remove();
    setTimeout(() => line.remove(), 7000);
  }

  _record(won) {
    const record = remember().record ?? { wins: 0, losses: 0 };
    if (won) record.wins++;
    else record.losses++;
    keep({ record });
  }

  _result(winner, note = '') {
    this.over = { winner };
    const won = winner === this.team;
    if (winner) this._record(won);
    const box = this.$('[data-result]');
    const s = this.state;
    box.innerHTML = `<div class="lb-result__card"><h2>${winner ? (won ? 'Victory' : 'Defeat') : 'Match over'}</h2>
      <p>${esc(note || (winner ? `${TEAM_NAMES[winner]} broke the enemy core${s ? ` at ${clock(s.t)}` : ''}.` : ''))}</p>
      ${s ? this._boardTable(s) : ''}
      <div class="lb-result__actions"><button type="button" class="lb-btn" data-again>Play again</button><button type="button" class="lb-btn lb-btn--go" data-home>Back to the games</button></div></div>`;
    box.hidden = false;
    box.querySelector('[data-again]').addEventListener('click', () => {
      this.link?.leave();
      this.link = null;
      this.setup();
    });
    box.querySelector('[data-home]').addEventListener('click', () => this.close());
  }

  /* ---------------------------------------------------------------- HUD */

  _abilityBar() {
    const box = this.$('[data-abilities]');
    const def = CHAMPIONS[this.seats[this.mySlot].champ];
    this.$('[data-portrait]').textContent = def.name[0];
    this.$('[data-portrait]').title = `${def.name}, ${def.title}`;
    const slots = [...def.abilities.map((a, i) => ({ key: a.key, name: a.name, slot: i, ab: a })), { key: 'D', name: 'Blink', summ: 'blink', tip: `Jump ${BLINK.range} toward the cursor · ${BLINK.cooldown}s` }, { key: 'F', name: 'Mend', summ: 'mend', tip: `Heal ${MEND.heal} + ${MEND.perLevel} a level, a burst of speed · ${MEND.cooldown}s` }, { key: 'B', name: 'Recall', summ: 'recall', tip: `Home after ${RECALL_TIME}s standing still; any hit stops it` }];
    for (const s of slots) {
      const b = el('button', `lb-ab${s.summ ? ' lb-ab--small' : ''}`);
      b.type = 'button';
      b.dataset.key = s.key;
      b.title = s.ab ? `${s.name} — ${describe(s.ab)}` : `${s.name} — ${s.tip}`;
      b.innerHTML = `<kbd>${s.key}</kbd><span class="lb-ab__name"></span><span class="lb-ab__cd" data-cd></span>${s.ab ? '<span class="lb-ab__ranks" data-ranks></span><span class="lb-ab__up" data-up role="button" aria-label="Rank up">+</span>' : ''}`;
      b.querySelector('.lb-ab__name').textContent = s.name;
      b.addEventListener('click', (e) => {
        if (s.ab && e.target.closest('[data-up]')) {
          this.send({ type: 'rank', slot: s.slot });
          return;
        }
        this._useKey(s.key);
      });
      if (s.ab) {
        b.addEventListener('pointerenter', () => {
          const meEnt = this._meEnt();
          this.view.showRange(meEnt, s.ab.range ?? s.ab.radius);
        });
        b.addEventListener('pointerleave', () => this.view.showRange(null));
      }
      box.append(b);
    }
  }

  _meEnt() {
    const me = this.state?.champs[this.mySlot];
    return this.state?.ents.find((e) => e.i === me?.i) ?? null;
  }

  _hud(state) {
    const me = state.champs[this.mySlot];
    if (!me) return;
    const $ = this.$;
    $('[data-kills-blue]').textContent = String(state.score.blue.kills);
    $('[data-kills-red]').textContent = String(state.score.red.kills);
    $('[data-time]').textContent = clock(state.t);
    $('[data-towers]').textContent = `Towers: ${TEAM_NAMES.blue} ${state.score.blue.towers} · ${TEAM_NAMES.red} ${state.score.red.towers}${state.boon[this.team] ? ` · Riverwarden's boon ${state.boon[this.team]}s` : ''}`;
    $('[data-level]').textContent = String(me.level);
    const bar = (fill, text, v, m) => {
      $(fill).style.width = `${Math.max(0, Math.min(1, v / Math.max(1, m))) * 100}%`;
      if (text) $(text).textContent = `${v} / ${m}`;
    };
    bar('[data-hp-fill]', '[data-hp]', me.hp, me.mh);
    bar('[data-mana-fill]', '[data-mana]', me.mana, me.mm);
    const xpFrom = [0, 0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440, 13020, 14700, 16480, 18360];
    const lo = xpFrom[me.level] ?? 0;
    const hi = xpFrom[me.level + 1] ?? lo + 1;
    $('[data-xp-fill]').style.width = `${me.level >= 18 ? 100 : Math.max(0, Math.min(1, (me.xp - lo) / (hi - lo))) * 100}%`;
    $('[data-gold]').textContent = String(me.gold);
    $('[data-stats]').textContent = `AD ${me.st.ad} · AP ${me.st.ap} · Armor ${me.st.armor} · MR ${me.st.mr} · AS ${me.st.as} · MS ${me.st.ms}`;
    const def = CHAMPIONS[me.champ];
    for (const b of $('[data-abilities]').children) {
      const key = b.dataset.key;
      const i = ['Q', 'W', 'E', 'R'].indexOf(key);
      let cd = 0;
      let off = false;
      if (i >= 0) {
        cd = me.cds[i];
        off = !me.ranks[i] || me.mana < def.abilities[i].cost;
        b.querySelector('[data-ranks]').textContent = '•'.repeat(me.ranks[i]) + '◦'.repeat((i === 3 ? 3 : 5) - me.ranks[i]);
        const maxR = i === 3 ? (me.level >= 16 ? 3 : me.level >= 11 ? 2 : me.level >= 6 ? 1 : 0) : Math.min(5, Math.ceil(me.level / 2));
        b.querySelector('[data-up]').hidden = !(me.points > 0 && me.ranks[i] < maxR);
      } else if (key === 'D') cd = me.blink;
      else if (key === 'F') cd = me.mend;
      else if (key === 'B') off = Boolean(me.recall);
      b.classList.toggle('is-off', off || cd > 0 || Boolean(me.respawn));
      b.querySelector('[data-cd]').textContent = cd > 0 ? String(Math.ceil(cd)) : '';
    }
    const items = $('[data-items]');
    const sig = me.items.join(',');
    if (items.dataset.sig !== sig) {
      items.dataset.sig = sig;
      items.replaceChildren(...Array.from({ length: 6 }, (_, k) => {
        const id = me.items[k];
        const s = el('span', 'lb-item', id ? ITEMS[id].icon : '');
        s.title = id ? `${ITEMS[id].name} — ${Object.entries(ITEMS[id].stats).map(([a, v]) => `+${v} ${a}`).join(', ')}` : 'Empty';
        return s;
      }));
    }
    const dead = $('[data-dead]');
    dead.hidden = !me.respawn;
    if (me.respawn) dead.textContent = `Back in ${me.respawn}s — the shop is open (P)`;
    if (me.recall) dead.hidden = false, dead.textContent = `Recalling… ${Math.ceil(me.recall)}`;
    if (this.shopOpen) this._shopPaint(me);
    if (this.boardOpen) this.$('[data-board]').innerHTML = this._boardTable(state);
  }

  _shop(open) {
    this.shopOpen = open;
    const box = this.$('[data-shop]');
    box.hidden = !open;
    if (open) this._shopPaint(this.state?.champs[this.mySlot], true);
  }

  _shopPaint(me, force = false) {
    if (!me) return;
    const box = this.$('[data-shop]');
    const sig = `${me.gold}|${me.items.join(',')}|${me.shop}`;
    if (!force && box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    box.innerHTML = `<div class="lb-panel__head"><h2>Shop</h2><span>🪙 ${me.gold}</span><button type="button" class="lb__x" data-shut aria-label="Close the shop">✕</button></div>
      <p class="lb-panel__note">${me.shop ? 'Click to buy. Selling gives back 60%.' : 'You can buy at home (your fountain) or while waiting to come back.'}</p>
      <div class="lb-shop">${ITEM_ORDER.map((id) => {
        const it = ITEMS[id];
        const can = me.shop && me.gold >= it.cost && me.items.length < 6;
        return `<button type="button" class="lb-shop__item" data-buy="${id}" ${can ? '' : 'disabled'}><span>${it.icon}</span><b>${esc(it.name)}</b><small>${Object.entries(it.stats).map(([k, v]) => `+${k === 'as' || k === 'lifesteal' ? `${Math.round(v * 100)}%` : v} ${k}`).join(' · ')}</small><em>🪙 ${it.cost}</em></button>`;
      }).join('')}</div>
      <h3>Yours</h3><div class="lb-shop__mine">${me.items.map((id, k) => `<button type="button" class="lb-btn" data-sell="${k}" ${me.shop ? '' : 'disabled'}>${ITEMS[id].icon} Sell ${esc(ITEMS[id].name)} (+${Math.floor(ITEMS[id].cost * 0.6)})</button>`).join('') || '<span>Nothing yet.</span>'}</div>`;
    box.querySelector('[data-shut]').addEventListener('click', () => this._shop(false));
    for (const b of box.querySelectorAll('[data-buy]')) b.addEventListener('click', () => this.send({ type: 'buy', item: b.dataset.buy }));
    for (const b of box.querySelectorAll('[data-sell]')) b.addEventListener('click', () => this.send({ type: 'sell', index: Number(b.dataset.sell) }));
  }

  _board(open) {
    this.boardOpen = open;
    const box = this.$('[data-board]');
    box.hidden = !open;
    if (open && this.state) box.innerHTML = this._boardTable(this.state);
  }

  _boardTable(state) {
    const rows = (team) => state.champs.filter((c) => c.team === team).map((c) => `<tr class="${c.s === this.mySlot ? 'is-me' : ''}"><td><span class="lb-dot" style="background:${TEAM_COLORS[team]}"></span>${esc(c.name)}</td><td>${esc(CHAMPIONS[c.champ].name)}</td><td>${c.level}</td><td>${c.kda.k} / ${c.kda.d} / ${c.kda.a}</td><td>${c.cs}</td><td>${c.items.map((i) => ITEMS[i].icon).join(' ')}</td></tr>`).join('');
    return `<table class="lb-table"><thead><tr><th>Player</th><th>Champion</th><th>Lv</th><th>K / D / A</th><th>CS</th><th>Items</th></tr></thead>
      <tbody><tr class="lb-table__team"><td colspan="6">${TEAM_NAMES.blue} — ${state.score.blue.kills} kills, ${state.score.blue.towers} towers</td></tr>${rows('blue')}
      <tr class="lb-table__team"><td colspan="6">${TEAM_NAMES.red} — ${state.score.red.kills} kills, ${state.score.red.towers} towers</td></tr>${rows('red')}</tbody></table>`;
  }

  /* -------------------------------------------------------------- input */

  _mouse(stage) {
    const canvas = this.view.canvas;
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.pointer = null;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.root.focus({ preventScroll: true });
      const p = at(e);
      if (e.button === 2) {
        this.rightHeld = true;
        this._rightClick(p, true);
        this._rightAt = performance.now();
        return;
      }
      if (e.button === 0 && this.mode === 'amove') {
        const g = this.view.groundAt(p.x, p.y);
        if (g) {
          this.send({ type: 'amove', x: g.x, z: g.z });
          this.view.pulse(g.x, g.z, '#ef4444');
        }
        this.mode = null;
        this.root.classList.remove('is-targeting');
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      this.pointer = at(e);
      if (this.rightHeld && performance.now() - this._rightAt > 180) {
        this._rightAt = performance.now();
        this._rightClick(this.pointer, false);
      }
      if (this.state) this.view.hover = this.view.pick(this.state, this.pointer.x, this.pointer.y);
    });
    window.addEventListener('pointerup', this._up = (e) => {
      if (e.button === 2) this.rightHeld = false;
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer = null;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.view.zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });
  }

  _rightClick(p, pulse) {
    if (!this.state) return;
    const hit = this.view.pick(this.state, p.x, p.y);
    if (hit && hit.tm !== this.team && !hit.dead) {
      this.send({ type: 'attack', target: hit.i });
      if (pulse) this.view.pulse(hit.x, hit.z, '#ef4444');
      return;
    }
    const g = this.view.groundAt(p.x, p.y);
    if (!g) return;
    this.send({ type: 'move', x: g.x, z: g.z });
    if (pulse) this.view.pulse(g.x, g.z);
  }

  /** A key on the ability bar (or its button): cast at the cursor. */
  _useKey(key) {
    const p = this.pointer ?? { x: this.view.width / 2, y: this.view.height / 2 };
    const g = this.view.groundAt(p.x, p.y) ?? { x: this.view.target.x, z: this.view.target.z };
    const i = ['Q', 'W', 'E', 'R'].indexOf(key);
    if (i >= 0) {
      const hit = this.state ? this.view.pick(this.state, p.x, p.y) : null;
      this.send({ type: 'cast', slot: i, x: g.x, z: g.z, target: hit?.i ?? null });
      return;
    }
    if (key === 'D') this.send({ type: 'blink', x: g.x, z: g.z });
    else if (key === 'F') this.send({ type: 'mend' });
    else if (key === 'B') this.send({ type: 'recall' });
  }

  _keydown(e) {
    e.stopPropagation();
    if (e.target instanceof HTMLInputElement) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (!this.view) {
      if (e.key === 'Escape') this.close();
      return;
    }
    const code = e.code;
    this.keys.add(code);
    if (code.startsWith('Arrow') || code === 'Tab' || code === 'Space') e.preventDefault();
    if (e.repeat && code !== 'Space') return;
    const letter = code.startsWith('Key') ? code.slice(3) : null;
    if ((e.ctrlKey || e.metaKey) && ['Q', 'W', 'E', 'R'].includes(letter)) {
      e.preventDefault();
      this.send({ type: 'rank', slot: ['Q', 'W', 'E', 'R'].indexOf(letter) });
      return;
    }
    if (['Q', 'W', 'E', 'R', 'D', 'F', 'B'].includes(letter)) {
      this._useKey(letter);
      return;
    }
    if (letter === 'S') this.send({ type: 'stop' });
    else if (letter === 'A') {
      this.mode = 'amove';
      this.root.classList.add('is-targeting');
    } else if (letter === 'P') this._shop(!this.shopOpen);
    else if (letter === 'Y') {
      this.lock = !this.lock;
      this._feed(this.lock ? 'Camera follows you' : 'Camera unlocked — move it with the screen\'s edge');
    } else if (code === 'Tab') this._board(true);
    else if (code === 'Space') this.spaceHeld = true;
    else if (e.key === 'Escape') {
      if (this.shopOpen) this._shop(false);
      else if (this.mode) {
        this.mode = null;
        this.root.classList.remove('is-targeting');
      }
    }
  }

  _pan(dt) {
    if (this.lock || this.spaceHeld) return;
    const speed = this.view.zoom * 1.6 * dt;
    let dx = 0;
    let dz = 0;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('ArrowUp')) dz -= 1;
    if (this.keys.has('ArrowDown')) dz += 1;
    const p = this.pointer;
    if (p && document.hasFocus()) {
      if (p.x < 14) dx -= 1;
      if (p.x > this.view.width - 14) dx += 1;
      if (p.y < 14) dz -= 1;
      if (p.y > this.view.height - 14) dz += 1;
    }
    if (dx || dz) this.view.pan(dx * speed, dz * speed);
  }

  /* ------------------------------------------------------------ minimap */

  _minimap(state) {
    const ctx = this.mctx;
    const W = this.mini.width;
    const k = W / MAP;
    ctx.drawImage(this.view.groundPicture, 0, 0, W, W);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const fow = this.view.fowData;
    for (let z = 0; z < 50; z++) for (let x = 0; x < 50; x++) if (!fow[z * 50 + x]) ctx.fillRect(x * 4 * k, z * 4 * k, 4 * k + 0.5, 4 * k + 0.5);
    const champs = new Map(state.champs.map((c) => [c.i, c]));
    for (const e of state.ents) {
      if (e.dead || !this.view.sees(state, e)) continue;
      const color = e.tm === 'neutral' ? '#e2c46a' : TEAM_COLORS[e.tm];
      if (e.k === 'tower') {
        ctx.fillStyle = color;
        const s = e.tier === 'core' ? 9 : 6;
        ctx.fillRect(e.x * k - s / 2, e.z * k - s / 2, s, s);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(e.x * k - s / 2, e.z * k - s / 2, s, s);
      } else if (e.k === 'champ') {
        const c = champs.get(e.i);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x * k, e.z * k, c?.s === this.mySlot ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c?.s === this.mySlot ? '#fff' : '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(e.x * k - 1.2, e.z * k - 1.2, 2.4, 2.4);
      }
    }
    // Where the camera looks.
    const corners = [[0, 0], [this.view.width, 0], [this.view.width, this.view.height], [0, this.view.height]].map(([x, y]) => this.view.groundAt(x, y) ?? { x: this.view.target.x, z: this.view.target.z });
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
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
      return { x: ((e.clientX - r.left) / r.width) * MAP, z: ((e.clientY - r.top) / r.height) * MAP };
    };
    let held = false;
    mini.addEventListener('contextmenu', (e) => e.preventDefault());
    mini.addEventListener('pointerdown', (e) => {
      const p = world(e);
      if (e.button === 2) {
        this.send({ type: 'move', x: p.x, z: p.z });
        return;
      }
      held = true;
      this.lock = false;
      mini.setPointerCapture(e.pointerId);
      this.view.lookAt(p.x, p.z);
    });
    mini.addEventListener('pointermove', (e) => held && this.view.lookAt(world(e).x, world(e).z));
    mini.addEventListener('pointerup', () => {
      held = false;
    });
  }
}

export { BASES };
