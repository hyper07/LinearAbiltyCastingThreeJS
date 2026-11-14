import { Match } from './sim.js';
import { Mirror } from './net.js';
import { FpsView } from './view.js';
import { MAPS, MAP_ORDER, getMap } from './map.js';
import { TEAM, TIME, WEAPONS, GEAR, SHOP, SKILL, WIN_ROUNDS, MONEY } from './rules.js';
import './fps.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const REASON = { eliminated: 'the other side is down', defused: 'the charge was disarmed', detonated: 'the charge went off', time: 'time ran out' };

/**
 * Breachline: a tactical first-person shooter of our own. Two squads of
 * five, short rounds, a pause to buy before each; the Raiders carry a
 * charge to one of two sites, the Wardens stop them or disarm it.
 *
 * Alone, the match runs in this browser (sim.js) with nine bots. Together —
 * up to four people — it runs on the server (server/fps), and this screen
 * shows a mirror of it (net.js). The screen is the same either way.
 *
 * Keys: W A S D to walk, the mouse to look, left button to fire, right to
 * step a scope's zoom in (and out), R reload, 1 and 2 weapons, 3 the blade, 4 and 5
 * grenades, B to buy, E to set or
 * disarm the charge, Space to jump, Tab for the scores, Enter to talk.
 */
export class FpsGame {
  /** @param {HTMLElement} host @param {{ account?: { name: string }|null, onClose?: () => void }} [options] */
  constructor(host, { account = null, onClose = () => {} } = {}) {
    this.host = host;
    this.account = account;
    this.onClose = onClose;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.press = { shoot: false, jump: false, reload: false };
    this.mouse = { fire: false };
    this.zoomLevel = 0; // right-click steps through a scope's zoom, and out
    this.pick = { side: 'atk', skill: 'normal', map: 'foundry' };
    this.feed = [];
    this.queue = [];
    this.sens = 0.0022;
    try {
      this.name = localStorage.getItem('gamory.breachline.name') ?? '';
      this.sens = Number(localStorage.getItem('gamory.breachline.sens')) || 0.0022;
      this.pick.map = MAPS[localStorage.getItem('gamory.breachline.map')] ? localStorage.getItem('gamory.breachline.map') : 'foundry';
    } catch {
      this.name = '';
    }
    window.breachline = this;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.className = 'bl';
    this.root.tabIndex = -1;
    this.root.innerHTML = `
      <div class="bl__stage" data-stage></div>
      <div class="bl__hud" data-hud hidden>
        <div class="bl__top">
          <span class="bl__score" data-score-mine>0</span>
          <span class="bl__clock"><b data-clock>0:00</b><small data-round>Round 1</small></span>
          <span class="bl__score" data-score-theirs>0</span>
        </div>
        <div class="bl__alive" data-alive></div>
        <canvas class="bl__radar" data-radar width="200" height="150"></canvas>
        <div class="bl__feed" data-feed></div>
        <div class="bl__cross" data-cross><i></i><i></i><i></i><i></i><b data-hit></b></div>
        <div class="bl__scope" data-scope hidden></div>
        <div class="bl__hurt" data-hurt></div>
        <div class="bl__banner" data-banner hidden></div>
        <div class="bl__tip" data-tip hidden></div>
        <div class="bl__bar" data-use hidden><i data-use-fill></i><span data-use-text></span></div>
        <div class="bl__vitals">
          <span class="bl__vital"><small>Health</small><b data-hp>100</b></span>
          <span class="bl__vital"><small>Armor</small><b data-armor>0</b></span>
        </div>
        <div class="bl__money" data-money>$800</div>
        <div class="bl__gun">
          <span data-charge-mark hidden title="You carry the charge">◆ charge</span>
          <small data-nades class="bl__nades"></small>
          <small data-weapon>Sidearm</small>
          <b data-ammo>12</b>
        </div>
        <div class="bl__chat" data-chat hidden>
          <div class="bl__lines" data-lines></div>
          <input data-say type="text" maxlength="160" placeholder="Enter to send — /all for everyone" hidden />
        </div>
        <div class="bl__shop" data-shop hidden></div>
        <div class="bl__board" data-board hidden></div>
        <div class="bl__pause" data-pause hidden>
          <div class="bl__card">
            <h2>Breachline</h2>
            <p>Click to take aim again.</p>
            <label class="bl__sens">Mouse speed <input data-sens type="range" min="0.0008" max="0.005" step="0.0002" /></label>
            <div class="bl__row"><button type="button" class="bl__btn" data-resume>Back to the match</button><button type="button" class="bl__btn bl__btn--quiet" data-leave>Leave the match</button></div>
          </div>
        </div>
      </div>
      <div class="bl__menu" data-menu></div>
      <button type="button" class="bl__x" data-close aria-label="Leave Breachline">✕</button>`;
    this.host.append(this.root);
    this.$ = (q) => this.root.querySelector(q);
    this.view = new FpsView(this.$('[data-stage]'));
    this._resize = new ResizeObserver(() => this.view.resize(this.root.clientWidth, this.root.clientHeight));
    this._resize.observe(this.root);
    this.view.resize(this.root.clientWidth, this.root.clientHeight);
    this._bind();
    this._menu();
    // Behind the menu: a match of bots to look at.
    this.demo = new Match({ human: false, seed: (Math.random() * 1e9) | 0, map: this.pick.map });
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
    this.root.focus();
  }

  close() {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    for (const [target, type, fn, opt] of this._listeners ?? []) target.removeEventListener(type, fn, opt);
    if (document.pointerLockElement === this.view?.canvas) document.exitPointerLock?.();
    this.ws?.close();
    this.view?.dispose();
    this.audio?.close?.();
    this.root?.remove();
    if (window.breachline === this) delete window.breachline;
    this.onClose();
  }

  /* ------------------------------------------------------------- the menu */

  _menu(note = '') {
    this.match = null;
    this.me = null;
    this.$('[data-hud]').hidden = true;
    const menu = this.$('[data-menu]');
    menu.hidden = false;
    const room = this.room;
    if (room) return this._roomMenu(note);
    menu.innerHTML = `
      <div class="bl__card bl__card--wide">
        <h1>Breachline</h1>
        <p class="bl__lead">Five against five. Raiders carry a charge to site A or B and set it; Wardens hold the sites, or disarm it in time. First to ${WIN_ROUNDS} rounds — you change ends after six. Everyone starts with $${MONEY.start.toLocaleString()} and a knife.</p>
        <div class="bl__pick" data-side>
          ${Object.entries(TEAM).map(([id, t]) => `<button type="button" data-value="${id}" style="--c:${t.color}"><b>${t.name}</b><small>${id === 'atk' ? 'Attack first: set the charge' : 'Defend first: hold the sites'}</small></button>`).join('')}
        </div>
        <h3 class="bl__label">Map</h3>
        ${this._mapCards(this.pick.map)}
        <div class="bl__seg" data-skill><span>Bots</span>${Object.entries(SKILL).map(([id, s]) => `<button type="button" data-value="${id}">${s.name}</button>`).join('')}</div>
        <div class="bl__row"><button type="button" class="bl__btn bl__btn--go" data-solo>Play alone, with bots</button></div>
        <div class="bl__together">
          <h3>With friends — up to four</h3>
          <label>Your name <input data-name type="text" maxlength="24" value="${esc(this.account?.name ?? this.name)}" ${this.account ? 'disabled' : ''} placeholder="Player" /></label>
          <div class="bl__row">
            <button type="button" class="bl__btn" data-make>Make a room</button>
            <span class="bl__or">or</span>
            <input data-code type="text" maxlength="5" placeholder="CODE" autocapitalize="characters" spellcheck="false" />
            <button type="button" class="bl__btn" data-join>Join</button>
          </div>
          <p class="bl__note" data-note role="status">${esc(note)}</p>
        </div>
        <p class="bl__keys">W A S D walk · mouse look · click fire · right-click zoom (again: closer, again: out) · R reload · 1 2 weapons · 3 melee · 4 frag · 5 smoke · B buy · E charge · Space jump · Tab scores</p>
      </div>`;
    const mark = () => {
      for (const b of menu.querySelectorAll('[data-side] button')) b.classList.toggle('is-on', b.dataset.value === this.pick.side);
      for (const b of menu.querySelectorAll('[data-skill] button')) b.classList.toggle('is-on', b.dataset.value === this.pick.skill);
    };
    for (const b of menu.querySelectorAll('[data-side] button')) b.onclick = () => ((this.pick.side = b.dataset.value), mark());
    for (const b of menu.querySelectorAll('[data-skill] button')) b.onclick = () => ((this.pick.skill = b.dataset.value), mark());
    for (const b of menu.querySelectorAll('[data-map]')) {
      b.onclick = () => {
        this.pick.map = b.dataset.map;
        try {
          localStorage.setItem('gamory.breachline.map', this.pick.map);
        } catch {
          /* private mode */
        }
        for (const o of menu.querySelectorAll('[data-map]')) o.classList.toggle('is-on', o === b);
        // The backdrop shows the map chosen.
        this.demo = new Match({ human: false, seed: (Math.random() * 1e9) | 0, map: this.pick.map });
      };
    }
    this._thumbs(menu);
    mark();
    menu.querySelector('[data-solo]').onclick = () => this.playSolo();
    const name = () => {
      this.name = menu.querySelector('[data-name]').value.trim();
      try {
        localStorage.setItem('gamory.breachline.name', this.name);
      } catch {
        /* private mode */
      }
      return this.name || 'Player';
    };
    menu.querySelector('[data-make]').onclick = () => this._net({ t: 'create', name: name(), skill: this.pick.skill, side: this.pick.side, map: this.pick.map });
    const join = () => {
      const code = menu.querySelector('[data-code]').value.trim().toUpperCase();
      if (code.length !== 5) return (menu.querySelector('[data-note]').textContent = 'A room code has five letters');
      this._net({ t: 'join', code, name: name() });
    };
    menu.querySelector('[data-join]').onclick = join;
    menu.querySelector('[data-code]').onkeydown = (e) => e.key === 'Enter' && join();
  }

  /** The room, before a match and between matches: who is in, on which squad. */
  _roomMenu(note = '') {
    const room = this.room;
    const menu = this.$('[data-menu]');
    const host = room.host === room.you;
    const sides = [room.side, room.side === 'atk' ? 'def' : 'atk'];
    const mine = room.members.find((m) => m.id === room.you);
    menu.innerHTML = `
      <div class="bl__card bl__card--wide">
        <h1>Room <span class="bl__code" data-room-code>${esc(room.code)}</span></h1>
        <p class="bl__lead">Give friends this code — up to four people. Bots fill the other seats.${this.last ? ` <b>${esc(this.last)}</b>` : ''}</p>
        <div class="bl__squads">
          ${[0, 1].map((s) => `<div class="bl__squad${mine?.squad === s ? ' is-mine' : ''}" style="--c:${TEAM[sides[s]].color}">
            <h3>${TEAM[sides[s]].name} <small>${sides[s] === 'atk' ? 'attack first' : 'defend first'}</small></h3>
            <ul>${room.members.filter((m) => m.squad === s).map((m) => `<li>${esc(m.name)}${m.id === room.host ? ' <em>host</em>' : ''}${m.id === room.you ? ' <em>you</em>' : ''}</li>`).join('') || '<li class="bl__none">bots only</li>'}</ul>
            ${mine?.squad === s || room.playing ? '' : `<button type="button" class="bl__btn bl__btn--quiet" data-squad="${s}">Join ${TEAM[sides[s]].name}</button>`}
          </div>`).join('')}
        </div>
        <h3 class="bl__label">Map${host ? ' — you choose' : ` — ${esc(MAPS[room.map]?.name ?? 'Foundry')}, chosen by the host`}</h3>
        ${this._mapCards(room.map ?? 'foundry', !host || room.playing)}
        <div class="bl__seg" data-skill><span>Bots</span>${Object.entries(SKILL).map(([id, s]) => `<button type="button" data-value="${id}" class="${room.skill === id ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${s.name}</button>`).join('')}</div>
        <div class="bl__row">
          ${host ? `<button type="button" class="bl__btn bl__btn--go" data-start>${this.last ? 'Play again' : 'Start the match'}</button>` : '<span class="bl__wait">Waiting for the host to start…</span>'}
          <button type="button" class="bl__btn bl__btn--quiet" data-leave-room>Leave the room</button>
        </div>
        <p class="bl__note" data-note role="status">${esc(note)}</p>
        <div class="bl__lines bl__lines--room" data-room-lines>${this.feedChat()}</div>
        <input data-room-say type="text" maxlength="160" placeholder="Say something to the room" />
      </div>`;
    for (const b of menu.querySelectorAll('[data-squad]')) b.onclick = () => this._send({ t: 'squad', squad: Number(b.dataset.squad) });
    for (const b of menu.querySelectorAll('[data-skill] button')) b.onclick = () => this._send({ t: 'skill', skill: b.dataset.value });
    for (const b of menu.querySelectorAll('[data-map]')) b.onclick = () => this._send({ t: 'map', map: b.dataset.map });
    this._thumbs(menu);
    if (room.map && this.demo?.map.id !== room.map) this.demo = new Match({ human: false, seed: (Math.random() * 1e9) | 0, map: room.map });
    const start = menu.querySelector('[data-start]');
    if (start) start.onclick = () => this._send({ t: 'start' });
    menu.querySelector('[data-leave-room]').onclick = () => this._leaveRoom();
    const say = menu.querySelector('[data-room-say]');
    say.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter' || !say.value.trim()) return;
      this._send({ t: 'say', text: say.value, all: true });
      say.value = '';
    };
  }

  /** The maps to choose from: name, a line about it, and a plan seen from above. `chosen` is ticked; `locked` (not the host) only shows. */
  _mapCards(chosen, locked = false) {
    return `<div class="bl__maps" data-maps>${MAP_ORDER.map((id) => {
      const m = MAPS[id];
      return `<button type="button" data-map="${id}" class="${id === chosen ? 'is-on' : ''}" ${locked ? 'disabled' : ''}><canvas data-thumb="${id}" width="132" height="96"></canvas><b>${esc(m.name)}</b><small>${esc(m.text)}</small><em>${m.SIZE[0]} × ${m.SIZE[1]} m</em></button>`;
    }).join('')}</div>`;
  }

  /** Draw each map card's plan: walls and cover, the two sites, the two starts. */
  _thumbs(root) {
    for (const c of root.querySelectorAll('[data-thumb]')) {
      const m = MAPS[c.dataset.thumb];
      const g = c.getContext('2d');
      const k = Math.min(c.width / m.SIZE[0], c.height / m.SIZE[1]);
      g.fillStyle = m.look?.ground === 'paving' ? '#4a463f' : '#3a3f47';
      g.fillRect(0, 0, c.width, c.height);
      g.save();
      g.translate((c.width - m.SIZE[0] * k) / 2, (c.height - m.SIZE[1] * k) / 2);
      for (const [x, z, w, d, h, kind] of m.BOXES) {
        g.fillStyle = kind === 'building' || kind === 'wall' ? '#b9a98f' : kind === 'container' ? '#6f8fb3' : '#8a7356';
        if (h > 0.5) g.fillRect(x * k, z * k, Math.max(1, w * k), Math.max(1, d * k));
      }
      g.fillStyle = 'rgba(255,207,58,0.5)';
      g.font = `800 ${Math.round(10)}px system-ui`;
      for (const [name, st] of Object.entries(m.SITES)) {
        g.beginPath();
        g.arc(st.x * k, st.z * k, st.r * k, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffcf3a';
        g.fillText(name, st.x * k - 3, st.z * k + 4);
        g.fillStyle = 'rgba(255,207,58,0.5)';
      }
      for (const [side, color] of [['atk', TEAM.atk.color], ['def', TEAM.def.color]]) {
        g.fillStyle = color;
        for (const [x, z] of m.SPAWNS[side]) g.fillRect(x * k - 1, z * k - 1, 3, 3);
      }
      g.restore();
    }
  }

  feedChat() {
    return (this.said ?? []).slice(-6).map((l) => `<p><b style="color:${l.color}">${esc(l.name)}${l.all ? '' : ' (squad)'}</b> ${esc(l.text)}</p>`).join('');
  }

  /* ----------------------------------------------------------- the server */

  _net(first) {
    const note = (text) => {
      const n = this.$('[data-note]');
      if (n) n.textContent = text;
    };
    note('Connecting…');
    const url = new URL('fps', document.baseURI);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws?.close();
    const ws = new WebSocket(url.href);
    this.ws = ws;
    this.said = [];
    this.last = '';
    ws.onopen = () => ws.send(JSON.stringify(first));
    ws.onerror = () => note('Could not reach the server');
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.room) {
        this.room = null;
        this._unlock();
        this._menu('The connection to the room was lost');
      }
    };
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this._heard(msg);
    };
  }

  _send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  _leaveRoom() {
    const ws = this.ws;
    this.ws = null;
    this.room = null;
    ws?.close();
    this._unlock();
    this._menu();
  }

  _heard(msg) {
    if (msg.t === 'room') {
      this.room = msg;
      if (!this.match || this.match.over) this._menu();
    } else if (msg.t === 'error') {
      const n = this.$('[data-note]');
      if (n) n.textContent = msg.text;
      if (!this.room) {
        this.ws?.close();
        this.ws = null;
      }
    } else if (msg.t === 'begin') {
      this.myId = msg.you;
      this._begin(new Mirror(), false);
    } else if (msg.t === 'snap') {
      if (!(this.match instanceof Mirror)) return;
      this.match.apply(msg.s, this.myId);
      this.me = this.match.players[this.myId] ?? null;
      if (!this._aimed && this.me) {
        // Start out looking the way the server faced me.
        this.yaw = this.me.to.yaw;
        this.pitch = 0;
        this._aimed = true;
      }
      this.queue.push(...msg.ev);
    } else if (msg.t === 'note') this._tip(msg.text, 1.6);
    else if (msg.t === 'said') {
      const m = this.room?.members.find((x) => x.id === msg.from);
      const sides = this.room ? [this.room.side, this.room.side === 'atk' ? 'def' : 'atk'] : ['atk', 'def'];
      this.said.push({ name: msg.name, text: msg.text, all: msg.all, color: TEAM[sides[m?.squad ?? 0]].color, at: performance.now() });
      const lines = this.$('[data-room-lines]');
      if (lines) lines.innerHTML = this.feedChat();
      this._chatLines();
    }
  }

  /* ------------------------------------------------------------- a match */

  playSolo() {
    const match = new Match({ seed: (Math.random() * 2 ** 31) | 0, team: this.pick.side, skill: this.pick.skill, name: this.account?.name ?? (this.name || 'You'), map: this.pick.map });
    this.myId = 0;
    this._begin(match, true);
    this.me = match.me;
    this.yaw = this.me.yaw;
    this.pitch = 0;
    this.queue.push({ type: 'phase', phase: 'buy', round: 1 });
  }

  _begin(match, solo) {
    this.match = match;
    this.solo = solo;
    this.me = null;
    this._aimed = false;
    this.feed = [];
    this.queue = [];
    this.slotKey = null;
    this.$('[data-menu]').hidden = true;
    this.$('[data-hud]').hidden = false;
    this.$('[data-banner]').hidden = true;
    this.$('[data-shop]').hidden = true;
    this.$('[data-pause]').hidden = true;
    this.$('[data-chat]').hidden = solo;
    this.$('[data-feed]').innerHTML = '';
    this.root.focus();
    this._lock();
  }

  /** Leave the match: back to the room (it plays on without you only if you leave the room), or the menu. */
  leaveMatch() {
    this._unlock();
    if (this.solo || !this.room) {
      this.match = null;
      this._menu();
    } else this._leaveRoom();
  }

  _lock() {
    try {
      const p = this.view.canvas.requestPointerLock?.();
      p?.catch?.(() => {});
    } catch {
      /* no pointer lock here: the keys still work */
    }
  }

  _unlock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  get playing() {
    return Boolean(this.match && !this.$('[data-hud]').hidden);
  }

  /* ------------------------------------------------------------ controls */

  _bind() {
    this._listeners = [];
    const on = (target, type, fn, opt) => {
      target.addEventListener(type, fn, opt);
      this._listeners.push([target, type, fn, opt]);
    };
    this.$('[data-close]').addEventListener('click', () => this.close());
    this.$('[data-resume]').addEventListener('click', () => this._lock());
    this.$('[data-leave]').addEventListener('click', () => this.leaveMatch());
    const sens = this.$('[data-sens]');
    sens.value = String(this.sens);
    sens.addEventListener('input', () => {
      this.sens = Number(sens.value);
      try {
        localStorage.setItem('gamory.breachline.sens', String(this.sens));
      } catch {
        /* private mode */
      }
    });
    on(document, 'pointerlockchange', () => {
      const locked = document.pointerLockElement === this.view.canvas;
      this.locked = locked;
      if (!locked) this.mouse.fire = false;
      // Losing the mouse in a match (Escape) is a pause; the shop and the chat take it on purpose.
      if (this.playing && !this.match.over) this.$('[data-pause]').hidden = locked || !this.$('[data-shop]').hidden || this.typing;
    });
    on(document, 'mousemove', (e) => {
      if (!this.locked || !this.playing) return;
      // Slower through a scope, the more so the closer it is.
      const k = this.sens * (this.zooming ? this.view.fov / 74 : 1);
      this.yaw -= e.movementX * k;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * k));
    });
    on(this.view.canvas, 'mousedown', (e) => {
      if (!this.playing) return;
      if (!this.locked) {
        this.$('[data-shop]').hidden = true;
        return this._lock();
      }
      this._sound();
      if (e.button === 0) {
        this.mouse.fire = true;
        this.press.shoot = true;
      } else if (e.button === 2) {
        const zoom = this.me?.alive && WEAPONS[this.match.weaponOf(this.me)]?.zoom;
        this.zoomLevel = zoom ? (this.zoomLevel + 1) % (zoom.length + 1) : 0;
        if (zoom) this._beep(this.zoomLevel ? 1200 : 900, 0.03);
      }
    });
    on(document, 'mouseup', (e) => {
      if (e.button === 0) this.mouse.fire = false;
    });
    on(this.root, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', (e) => {
      if (!this.root.isConnected || e.target?.matches?.('input, textarea, select')) return;
      if (!this.playing) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['Tab', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === ' ') this.press.jump = true;
      else if (k === 'r') this.press.reload = true;
      else if (['1', '2', '3', '4', '5'].includes(k)) this.slotKey = { slot: Number(k), until: performance.now() + 300 };
      else if (k === 'b') this.toggleShop();
      else if (k === 'Tab') this._board(true);
      else if (k === 'Enter' && !this.solo) this._type();
      else if (k === 'Escape' && !this.$('[data-shop]').hidden) this.toggleShop(false);
    }, true);
    on(window, 'keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
      if (k === 'Tab') this._board(false);
    }, true);
    on(window, 'blur', () => this.keys.clear());
    const say = this.$('[data-say]');
    say.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && say.value.trim()) {
        const all = /^\/all\s+/i.test(say.value);
        this._send({ t: 'say', text: say.value.replace(/^\/all\s+/i, ''), all });
      }
      if (e.key === 'Enter' || e.key === 'Escape') {
        say.value = '';
        say.hidden = true;
        this.typing = false;
        this.root.focus();
        this._lock();
      }
    });
  }

  _type() {
    this.typing = true;
    this.keys.clear();
    this._unlock();
    const say = this.$('[data-say]');
    say.hidden = false;
    say.focus();
  }

  _chatLines() {
    const lines = this.$('[data-lines]');
    const now = performance.now();
    lines.innerHTML = (this.said ?? []).filter((l) => now - l.at < 12000).slice(-5).map((l) => `<p><b style="color:${l.color}">${esc(l.name)}${l.all ? '' : ' (squad)'}</b> ${esc(l.text)}</p>`).join('');
  }

  /** What my keys and mouse ask for, this frame. */
  _input() {
    const k = this.keys;
    const free = !this.typing && this.$('[data-shop]').hidden;
    const input = {
      f: free ? (k.has('w') || k.has('ArrowUp') ? 1 : 0) - (k.has('s') || k.has('ArrowDown') ? 1 : 0) : 0,
      s: free ? (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0) : 0,
      yaw: this.yaw,
      pitch: this.pitch,
      fire: free && this.mouse.fire,
      shoot: free && this.press.shoot,
      reload: free && this.press.reload,
      use: free && k.has('e'),
      jump: free && this.press.jump,
      scope: free ? this.zoomLevel : 0,
      slot: this.slotKey && performance.now() < this.slotKey.until ? this.slotKey.slot : undefined
    };
    // The scope comes off with a weapon change, a reload or a fall.
    const zoom = this.me?.alive && WEAPONS[this.match.weaponOf(this.me)]?.zoom;
    if (!zoom || this.me.reloading > 0 || this.held !== this.match.weaponOf(this.me)) this.zoomLevel = 0;
    this.held = this.me && this.match.weaponOf(this.me);
    input.scope = free ? this.zoomLevel : 0;
    this.zooming = Boolean(input.scope && zoom);
    return input;
  }

  /* --------------------------------------------------------------- frames */

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (!this.match) {
      // The menu's backdrop: bots at it, seen from above a site.
      const demo = this.demo;
      if (demo.over) this.demo = new Match({ human: false, seed: (now | 0) + 7, map: demo.map.id });
      const events = demo.step(dt);
      this.view.show(events, demo, null);
      this.view.overview(demo, now / 1000, dt);
      return;
    }
    const input = this._input();
    let events;
    if (this.solo) {
      events = this.queue.splice(0).concat(this.match.step(dt, input));
      Object.assign(this.press, { shoot: false, jump: false, reload: false });
    } else {
      if (this.me) this.match.frame(dt, this.myId, input);
      if (now - (this._sent ?? 0) > 30) {
        this._sent = now;
        this._send({ t: 'in', ...input });
        Object.assign(this.press, { shoot: false, jump: false, reload: false });
      }
      events = this.queue.splice(0);
    }
    if (!this.me) return;
    this._events(events);
    this.view.show(events, this.match, this.me);
    this.view.render(this.match, this.me, dt, { zoom: input.scope });
    this._hud(dt);
  }

  nameOf(id) {
    const p = this.match.players[id];
    return p ? `<b style="color:${TEAM[this.match.sideOf(p.squad)].color}">${esc(p.name)}</b>` : '?';
  }

  _events(events) {
    const m = this.match;
    const me = this.me;
    for (const e of events) {
      if (e.type === 'shot') this._bang(e.id === me.id ? 1 : this._near(e.from[0], e.from[2]), WEAPONS[e.weapon]);
      else if (e.type === 'slash') this._swish(e.id === me.id ? 0.5 : 0.15);
      else if (e.type === 'blast') this._bang(this._near(e.x, e.z) * 1.8, { dmg: 200 }, 0.6);
      else if (e.type === 'smoke') this._hiss(this._near(e.x, e.z));
      else if (e.type === 'throw' && e.id === me.id) this._tip(e.kind === 'frag' ? 'Frag out' : 'Smoke out', 1);
      else if (e.type === 'hurt') {
        if (e.id === me.id) {
          this.hurt = Math.min(1, (this.hurt ?? 0) + 0.25 + e.amount / 80);
        } else if (e.by === me.id) this.hitMark = e.head ? 0.4 : 0.22;
      } else if (e.type === 'kill') {
        this._feed(`${this.nameOf(e.by)} <span>${esc(WEAPONS[e.weapon]?.name ?? '')}${e.head ? ' ◎' : ''}</span> ${this.nameOf(e.who)}`);
        if (e.by === me.id) this._tip(`You dropped ${m.players[e.who].name}${e.head ? ' — a head shot' : ''}`, 1.8);
      } else if (e.type === 'plant') {
        this._feed(`${this.nameOf(e.id)} set the charge at <b>${e.site}</b>`);
        this._banner(`The charge is set at ${e.site}`, m.sideOf(me.squad) === 'def' ? 'Get to it and hold E to disarm' : 'Keep them off it', 2.6);
        this._beep(520, 0.2);
      } else if (e.type === 'defused') this._feed(`${this.nameOf(e.id)} disarmed the charge`);
      else if (e.type === 'boom') this._bang(1, { dmg: 200 }, 0.9);
      else if (e.type === 'pickup' && e.id === me.id) this._tip('You have the charge — take it to A or B', 2.5);
      else if (e.type === 'half') this._banner('Change ends', 'You swap sides; money starts again', 3);
      else if (e.type === 'phase' && e.phase === 'buy') {
        const side = m.sideOf(me.squad);
        this._banner(`Round ${e.round ?? m.round} — you are ${TEAM[side].name}`, side === 'atk' ? 'Set the charge at A or B, or drop every Warden' : 'Hold the sites, disarm the charge, or drop every Raider', 3.2);
        this._tip('B to buy', TIME.buy - 0.5);
        this.slotKey = null;
      } else if (e.type === 'phase' && e.phase === 'live') {
        this.toggleShop(false);
        this.tipLeft = Math.min(this.tipLeft ?? 0, 0.01);
        this._beep(760, 0.12);
      } else if (e.type === 'round') {
        const won = e.winner === me.squad;
        this._banner(won ? 'Round won' : 'Round lost', `${TEAM[e.side].name}: ${REASON[e.reason] ?? e.reason}`, TIME.after);
      } else if (e.type === 'over') this._over(e);
    }
  }

  _over(e) {
    const won = e.winner === this.me.squad;
    const score = `${e.score[this.me.squad]} – ${e.score[1 - this.me.squad]}`;
    this._unlock();
    this.toggleShop(false);
    if (!this.solo && this.room) {
      // Back to the room, with the result on it; the host can start another.
      this.last = `${won ? 'You won' : 'You lost'} ${score}.`;
      setTimeout(() => this.room && this.match?.over && this._menu(), 3500);
      return this._banner(won ? 'Match won' : 'Match lost', score, 4);
    }
    const b = this.$('[data-banner]');
    b.hidden = false;
    this.bannerLeft = Infinity;
    b.innerHTML = `<h2>${won ? 'Match won' : 'Match lost'}</h2><p>${score}</p><div class="bl__row"><button type="button" class="bl__btn bl__btn--go" data-again>Play again</button><button type="button" class="bl__btn bl__btn--quiet" data-menu-back>Menu</button></div>`;
    b.classList.add('is-over');
    b.querySelector('[data-again]').onclick = () => (b.classList.remove('is-over'), this.playSolo());
    b.querySelector('[data-menu-back]').onclick = () => (b.classList.remove('is-over'), this._menu());
  }

  _banner(title, text, seconds) {
    const b = this.$('[data-banner]');
    b.classList.remove('is-over');
    b.innerHTML = `<h2>${esc(title)}</h2><p>${esc(text)}</p>`;
    b.hidden = false;
    this.bannerLeft = seconds;
  }

  _tip(text, seconds) {
    const t = this.$('[data-tip]');
    t.textContent = text;
    t.hidden = false;
    this.tipLeft = seconds;
  }

  _feed(html) {
    const feed = this.$('[data-feed]');
    const p = document.createElement('p');
    p.innerHTML = html;
    feed.append(p);
    while (feed.children.length > 5) feed.firstChild.remove();
    setTimeout(() => p.remove(), 6000);
  }

  /* ------------------------------------------------------------------ HUD */

  _set(q, text) {
    const n = this.$(q);
    if (n.textContent !== String(text)) n.textContent = text;
  }

  _hud(dt) {
    const m = this.match;
    const me = this.me;
    const side = m.sideOf(me.squad);
    const w = WEAPONS[m.weaponOf(me)];
    this._set('[data-hp]', me.alive ? Math.ceil(me.hp) : 0);
    this._set('[data-armor]', `${Math.ceil(me.armor)}${me.helmet ? ' ⛑' : ''}`);
    this._set('[data-money]', `$${me.money}`);
    this._set('[data-weapon]', me.reloading > 0 ? `${w.name} — reloading` : w.name);
    const held = m.weaponOf(me);
    this._set('[data-ammo]', WEAPONS[held].melee ? '—' : WEAPONS[held].throw ? `×${me.nades?.[held] ?? 0}` : me.ammo?.[held] ?? 0);
    this._set('[data-nades]', `${me.nades?.frag ? '● frag ' : ''}${me.nades?.smoke ? '◌ smoke' : ''}`);
    this.$('[data-charge-mark]').hidden = !me.hasCharge;
    this._set('[data-clock]', clock(m.timer));
    this.$('[data-clock]').classList.toggle('is-hot', m.phase === 'planted');
    this._set('[data-round]', m.phase === 'buy' ? 'Buy' : m.phase === 'planted' ? 'Charge set' : `Round ${m.round}`);
    const mine = this.$('[data-score-mine]');
    const theirs = this.$('[data-score-theirs]');
    this._set('[data-score-mine]', m.score[me.squad]);
    this._set('[data-score-theirs]', m.score[1 - me.squad]);
    mine.style.color = TEAM[side].color;
    theirs.style.color = TEAM[side === 'atk' ? 'def' : 'atk'].color;
    this._set('[data-alive]', `${m.players.filter((p) => p.alive && p.squad === me.squad).length} alive  ·  ${m.players.filter((p) => p.alive && p.squad !== me.squad).length} against`);
    // The crosshair opens with movement and fire; a mark when a shot lands.
    const cross = this.$('[data-cross]');
    cross.hidden = !me.alive || this.view.fov < 50;
    cross.style.setProperty('--gap', `${6 + (me.moving ? 7 : 0) + (me.y > 0 ? 8 : 0) + this.view.recoil * 10}px`);
    this.hitMark = Math.max(0, (this.hitMark ?? 0) - dt);
    this.$('[data-hit]').style.opacity = this.hitMark > 0 ? 1 : 0;
    this.$('[data-scope]').hidden = !(me.alive && this.view.fov < 50);
    this.hurt = Math.max(0, (this.hurt ?? 0) - dt * 1.4);
    this.$('[data-hurt]').style.opacity = me.alive ? this.hurt : 0.55;
    // Setting or disarming: a bar that fills.
    const bar = this.$('[data-use]');
    const total = side === 'atk' ? TIME.plant : me.kit ? TIME.defuseKit : TIME.defuse;
    bar.hidden = !(me.alive && me.using > 0);
    if (!bar.hidden) {
      this.$('[data-use-fill]').style.width = `${Math.min(100, (me.using / total) * 100)}%`;
      this._set('[data-use-text]', side === 'atk' ? 'Setting the charge…' : 'Disarming…');
    }
    // What to do, when it isn't obvious.
    if (me.alive && !(me.using > 0) && (m.phase === 'live' || m.phase === 'planted')) {
      const inSite = Object.values(m.map.SITES).some((s) => Math.hypot(me.x - s.x, me.z - s.z) < s.r);
      const byCharge = m.charge?.state === 'planted' && Math.hypot(me.x - m.charge.x, me.z - m.charge.z) < 1.7;
      if (side === 'atk' && me.hasCharge && inSite && m.phase === 'live') this._tip('Hold E to set the charge', 0.2);
      else if (side === 'def' && byCharge) this._tip('Hold E to disarm', 0.2);
    }
    if (!me.alive && m.phase !== 'after' && !m.over) this._tip(this.view.watching ? `Down — watching ${this.view.watching.name}` : 'Down', 0.2);
    for (const [key, q] of [['bannerLeft', '[data-banner]'], ['tipLeft', '[data-tip]']]) {
      if (this[key] > 0) {
        this[key] -= dt;
        if (this[key] <= 0) this.$(q).hidden = true;
      }
    }
    if (!this.$('[data-shop]').hidden) this._shop();
    if (!this.$('[data-board]').hidden) this._board(true);
    if (!this.solo && (this.said?.length ?? 0)) this._chatLines();
    this._radar();
  }

  /** The radar: the walls, the sites, my squad, the charge when it lies or ticks — north up. */
  _radar() {
    const c = this.$('[data-radar]');
    const g = c.getContext('2d');
    const m = this.match;
    const me = this.me;
    const { SIZE, SITES, BOXES } = m.map;
    // The radar keeps the map's own shape.
    const tall = Math.round((c.width * SIZE[1]) / SIZE[0]);
    if (c.height !== tall) {
      c.height = tall;
      c.style.height = `${tall}px`;
    }
    const k = c.width / SIZE[0];
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(12,16,24,0.62)';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,210,74,0.2)';
    g.font = '700 11px system-ui';
    for (const [name, s] of Object.entries(SITES)) {
      g.beginPath();
      g.arc(s.x * k, s.z * k, s.r * k, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffd24a';
      g.fillText(name, s.x * k - 4, s.z * k + 4);
      g.fillStyle = 'rgba(255,210,74,0.2)';
    }
    g.fillStyle = 'rgba(200,210,225,0.55)';
    for (const [x, z, w, d, h] of BOXES) if (h > 1.4) g.fillRect(x * k, z * k, Math.max(1, w * k), Math.max(1, d * k));
    const side = m.sideOf(me.squad);
    for (const p of m.players) {
      if (!p.alive || p.squad !== me.squad) continue;
      g.save();
      g.translate(p.x * k, p.z * k);
      g.rotate(-p.yaw);
      g.fillStyle = p === me ? '#ffffff' : TEAM[side].color;
      g.beginPath();
      g.moveTo(0, -5);
      g.lineTo(3.6, 4);
      g.lineTo(-3.6, 4);
      g.closePath();
      g.fill();
      g.restore();
      if (p.hasCharge) {
        g.fillStyle = '#ffd24a';
        g.fillRect(p.x * k + 4, p.z * k - 6, 4, 4);
      }
    }
    g.fillStyle = 'rgba(220,220,220,0.55)';
    for (const sm of m.smokes ?? []) {
      g.beginPath();
      g.arc(sm.x * k, sm.z * k, sm.r * k, 0, Math.PI * 2);
      g.fill();
    }
    const ch = m.charge;
    if (ch && (ch.state === 'planted' || (ch.state === 'dropped' && side === 'atk'))) {
      g.fillStyle = ch.state === 'planted' && Math.floor(m.time * 4) % 2 ? '#ff3b30' : '#ffd24a';
      g.fillRect(ch.x * k - 3, ch.z * k - 3, 6, 6);
    }
  }

  /** The shop: weapons and gear, open only in the pause before a round. */
  toggleShop(open = this.$('[data-shop]').hidden) {
    const shop = this.$('[data-shop]');
    if (open && (this.match?.phase !== 'buy' || !this.me?.alive)) return this._tip('You can buy only before the round starts', 1.6);
    if (shop.hidden === !open) return;
    shop.hidden = !open;
    this._shopKey = '';
    if (open) {
      this._unlock();
      this._shop();
    } else if (this.playing && !this.match.over) {
      this.$('[data-pause]').hidden = true;
      this._lock();
    }
  }

  _shop() {
    const m = this.match;
    const me = this.me;
    const side = m.sideOf(me.squad);
    const key = `${me.money}|${me.primary}|${me.secondary}|${me.melee}|${me.armor}|${me.helmet}|${me.kit}|${me.nades?.frag}|${me.nades?.smoke}|${side}`;
    if (key === this._shopKey) return;
    this._shopKey = key;
    const row = (id) => {
      const it = WEAPONS[id] ?? GEAR[id];
      const w = WEAPONS[id];
      const have = w?.throw ? me.nades?.[id] >= 1 : w?.melee ? (me.melee ?? 'knife') === id : w ? me.primary === id || me.secondary === id : id === 'kit' ? me.kit : id === 'helmet' ? me.helmet && me.armor >= 100 : me.armor >= 100;
      const price = it.price - (id === 'helmet' && me.armor >= 100 && !me.helmet ? GEAR.vest.price : 0);
      const no = have || me.money < price || (it.team && it.team !== side);
      const text = w?.melee ? `${w.dmg} a blow · ${w.back} from behind · ${w.rpm} a minute · ${w.range} m reach` : w?.throw ? (id === 'frag' ? `up to ${w.dmg} damage within ${w.radius} m` : `a cloud ${w.radius * 2} m wide for ${w.last} s — nobody sees through it`) : w ? `${w.dmg}${w.pellets ? `×${w.pellets}` : ''} damage · ${w.rpm} a minute · ${w.mag} rounds${w.zoom ? ` · scope ×${w.zoom.length}` : ''}` : it.text;
      return `<button type="button" data-buy="${id}" ${no ? 'disabled' : ''} class="${have ? 'is-have' : ''}"><b>${esc(it.name)}</b><small>${esc(text)}</small><em>${have ? 'yours' : `$${price}`}</em></button>`;
    };
    const shop = this.$('[data-shop]');
    shop.innerHTML = `
      <header><h2>Buy</h2><span>$${me.money}</span><button type="button" data-shop-close aria-label="Close">✕</button></header>
      <div class="bl__goods">${SHOP.map((shelf) => `<div><h3>${shelf.name}</h3>${shelf.items.map(row).join('')}</div>`).join('')}</div>
      <p class="bl__hint">B or click outside to close. What you carry is kept if you live through the round. Kills pay more with an SMG ($600), a shotgun ($900) or a blade ($1000–1500). A blade bought takes the knife's place on 3.</p>`;
    shop.querySelector('[data-shop-close]').onclick = () => this.toggleShop(false);
    for (const b of shop.querySelectorAll('[data-buy]')) b.onclick = () => this.buy(b.dataset.buy);
  }

  buy(item) {
    if (this.solo) {
      const no = this.match.buy(this.me, item);
      if (no) this._tip(no, 1.6);
    } else this._send({ t: 'buy', item });
    this._beep(640, 0.05);
  }

  _board(show) {
    const board = this.$('[data-board]');
    board.hidden = !show;
    if (!show) return;
    const m = this.match;
    const squads = [this.me.squad, 1 - this.me.squad];
    board.innerHTML = squads.map((s) => {
      const side = m.sideOf(s);
      const rows = m.players.filter((p) => p.squad === s).sort((a, b) => b.kills - a.kills).map((p) => `<tr class="${p.alive ? '' : 'is-down'}${p === this.me ? ' is-me' : ''}"><td>${esc(p.name)}${p.bot ? ' <small>bot</small>' : ''}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${s === this.me.squad ? `$${p.money}` : ''}</td></tr>`).join('');
      return `<table style="--c:${TEAM[side].color}"><thead><tr><th>${TEAM[side].name} — ${m.score[s]}</th><th>Kills</th><th>Deaths</th><th>${s === this.me.squad ? 'Money' : ''}</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');
  }

  /* ---------------------------------------------------------------- sound */

  _sound() {
    if (this.audio) return;
    try {
      this.audio = new (window.AudioContext || window.webkitAudioContext)();
      const len = this.audio.sampleRate * 0.5;
      this.noise = this.audio.createBuffer(1, len, this.audio.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.audio = null;
    }
  }

  /** How loud something at (x, z) is to me: 1 beside me, fading with distance. */
  _near(x, z) {
    const eye = this.me?.alive ? this.me : this.view.watching ?? this.me;
    return eye ? Math.max(0.04, 1 - Math.hypot(x - eye.x, z - eye.z) / 60) * 0.55 : 0.2;
  }

  _bang(volume, weapon, long = 0.16) {
    const a = this.audio;
    if (!a) return;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = (weapon?.dmg ?? 30) > 60 ? 900 : 2400;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.32 * volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + long);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + long);
  }

  /** A knife through the air. */
  _swish(volume) {
    const a = this.audio;
    if (!a) return;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const filter = a.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, a.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3800, a.currentTime + 0.12);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.25 * volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 0.16);
  }

  /** Smoke pouring out. */
  _hiss(volume) {
    const a = this.audio;
    if (!a) return;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = a.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.12 * volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.8);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 1.9);
  }

  _beep(freq, long) {
    const a = this.audio;
    if (!a) return;
    const o = a.createOscillator();
    const gain = a.createGain();
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + long);
    o.connect(gain).connect(a.destination);
    o.start();
    o.stop(a.currentTime + long);
  }
}
