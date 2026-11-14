import { Purge, forgeCheck } from './sim.js';
import { FlatView } from './flat.js';
import { MobaLink, Mirror } from '../../moba/net.js';
import { TICK, SEATS, BOT_NAMES, COLORS, RANKS, RANK_ORDER, UPGRADES, upgradeCost, DIFFICULTY, SPEEDS, GIFTS, BUILDINGS, GUARDIANS, SUPPLY, SHRINE_GIFTS } from './rules.js';
import { SIZE, RIDGES, ROCKS, STRUCTURES, BASE, FORGE, PAD, HEART } from './map.js';
import '../squad.css';
import './purge.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Grave Purge: Bastion Squad's "raise your squad" operation. Each player
 * commands their own soldiers: buy Recruits at the barracks, raise them at
 * the Forge, upgrade at the armoury, and take the Gravefield back — every
 * crypt, spire and camp pays ore. Break the six shrines and six soul nodes,
 * then the Heart, then the king it wakes, before time runs out. Alone with
 * three bot players, or with up to three friends (the host's browser runs
 * the game; the others send orders and draw what it sends back).
 *
 * Keys, the classic way: left-click or drag selects; right-click moves or
 * attacks. A attack · M move · P patrol (then click) · S stop · H hold ·
 * E heal (to the pad) · W to the Forge · Ctrl/Alt+0–9 save a group, Shift+
 * 0–9 add to it, 0–9 pick it (twice: look at it) · Tab or F2 all soldiers ·
 * Space the last alert · Backspace the camp · Shift+F5–F8 save a view,
 * F5–F8 go to it · R Recruit (Shift: five) · F Forge · U upgrades · G give
 * · +/− speed · F1 or ? keys.
 */
export class PurgeGame {
  constructor(host, { account = null, onClose = () => {}, onSwap = null, flat = false } = {}) {
    this.host = host;
    this.flat = flat;
    this.account = account;
    this.onClose = onClose;
    this.onSwap = onSwap;
    this.pick = { difficulty: 'hard', heroesOnly: false };
    this.keys = new Set();
    this.mouse = { x: 0, y: 0 };
    this.selected = new Set();
    this.groups = new Map();
    this.panel = null;
    this.pings = [];
    window.gravePurge = this;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.className = 'bs gp';
    this.root.tabIndex = -1;
    this.root.innerHTML = `
      <div class="bs__stage" data-stage><canvas class="bs__overlay" data-overlay></canvas></div>
      <div class="bs__hud" data-hud hidden>
        <div class="bs__top gp__top" data-top></div>
        <div class="bs__boss" data-boss hidden><b data-boss-name></b><div class="bs__bar"><i data-boss-hp></i></div></div>
        <div class="bs__banner" data-banner hidden></div>
        <aside class="gp__team" data-team></aside>
        <canvas class="bs__mini gp__mini" data-mini width="360" height="360"></canvas>
        <div class="gp__bar" data-bar></div>
        <div class="gp__panel" data-panel hidden></div>
        <div class="bs__aim" data-aim hidden></div>
        <div class="gp__feed" data-feed></div>
        <div class="gp__fps" data-fps></div>
        <div class="gp__groups" data-groups></div>
        <div class="gp__help" data-help hidden></div>
      </div>
      <div class="bs__menu" data-menu></div>
      <button type="button" class="bs__x" data-close aria-label="Leave Grave Purge">✕</button>`;
    this.host.append(this.root);
    this.$ = (q) => this.root.querySelector(q);
    // 2D: plain canvas shapes. 3D: three.js (loaded only when wanted).
    const View = this.flat ? FlatView : (await import('./view.js')).PurgeView;
    this.view = new View(this.$('[data-stage]'));
    this.fps = { frames: 0, at: performance.now(), value: 0, worst: 0, slow: 0 };
    this.view.selected = this.selected;
    this.overlay = this.$('[data-overlay]');
    this.octx = this.overlay.getContext('2d');
    this._resize = new ResizeObserver(() => this._fit());
    this._resize.observe(this.root);
    this._fit();
    this._bind();
    this._menu();
    this._mapLayer();
    // Behind the menu: four bots at work.
    this.demo = new Purge({ difficulty: 'casual', seed: 3, seats: BOT_NAMES.map((name) => ({ name, bot: true })) });
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
    this.root.focus();
  }

  _fit() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.view.resize(w, h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.overlay.width = Math.round(w * dpr);
    this.overlay.height = Math.round(h * dpr);
  }

  close(swap = false) {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    for (const [t, type, fn, opt] of this._listeners ?? []) t.removeEventListener(type, fn, opt);
    this.link?.leave();
    this.view?.dispose();
    this.audio?.close?.();
    this.root?.remove();
    if (window.gravePurge === this) delete window.gravePurge;
    if (!swap) this.onClose();
  }

  /* --------------------------------------------------------------- menus */

  _menu(note = '') {
    this.game = null;
    this.mirror = null;
    this.state = null;
    this.$('[data-hud]').hidden = true;
    const m = this.$('[data-menu]');
    m.hidden = false;
    const inRoom = this.link?.inRoom;
    const host = !inRoom || this.link.isHost;
    const lobby = this.lobby ?? null;
    const diff = lobby?.difficulty ?? this.pick.difficulty;
    const heroes = lobby?.heroesOnly ?? this.pick.heroesOnly;
    m.innerHTML = `
      <div class="bs__card gp__card">
        ${this.onSwap ? `<div class="gp__modes"><button type="button" class="${this.flat ? '' : 'is-on'}" ${this.flat ? 'data-swap-to="purge"' : ''}>Grave Purge 3D</button><button type="button" class="${this.flat ? 'is-on' : ''}" ${this.flat ? '' : 'data-swap-to="purge2d"'}>Grave Purge 2D</button><button type="button" data-swap-to="hold">Hold the Outpost</button></div>` : ''}
        <h1>Bastion Squad · Grave Purge${this.flat ? ' <small class="gp__tag">2D</small>' : ''}</h1>
        <p class="bs__lead">The dead hold the Gravefield. Four commanders start in a camp in its corner with a few Recruits each. Every kill pays ore: buy Recruits at the barracks and raise them at the Forge — Recruit, Veteran, Vanguard, Phantom, Paragon. Break the six Shrines of Bones (each makes your Veterans stronger) and the six Soul Nodes, then the Heart of the Grave, then the king it wakes — before the clock runs out.</p>
        <ol class="gp__ladder">${RANK_ORDER.map((r) => {
          const d = RANKS[r];
          const from = d.from ? Object.entries(d.from).map(([k, n]) => `${n > 1 ? `${n} ` : ''}${RANKS[k].name}${n > 1 ? 's' : ''}`).join(' + ') : 'the barracks';
          return `<li><b>${d.name}</b><small>${d.from ? `${from} + ${d.ore.toLocaleString()} ore${d.relics ? ` + ${d.relics} relics` : ''}${d.one ? ' · one each' : ''}` : `${d.cost} ore at ${from}`}</small></li>`;
        }).join('')}</ol>
        <div class="bs__row"><span>Difficulty</span>${Object.entries(DIFFICULTY).map(([id, d]) => `<button type="button" data-diff="${id}" class="${diff === id ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${d.name} <small>${d.minutes} min</small></button>`).join('')}</div>
        <div class="bs__row"><span>Mode</span><button type="button" data-heroes class="${heroes ? 'is-on' : ''}" ${host ? '' : 'disabled'}>Heroes only</button><small class="gp__hint">${heroes ? 'No Recruits: the barracks sells Veterans; +3,000 ore to start.' : 'Start with four Recruits each.'}</small></div>
        ${inRoom ? `
          <div class="bs__room"><b>Room <span data-code>${esc(this.link.code)}</span></b> — give friends the code (up to four). Bot commanders take the empty places.
            <ul>${(lobby?.people ?? this.link.peers()).map((p, i) => `<li><i style="background:${COLORS[i] ?? '#888'}"></i>${esc(p.name)}${p.id === this.link.session.host ? ' <em>host</em>' : ''}</li>`).join('')}</ul></div>
          <div class="bs__row">${host ? '<button type="button" class="bs__go" data-start>Start</button>' : '<span>Waiting for the host to start…</span>'}<button type="button" data-leave>Leave the room</button></div>` : `
          <div class="bs__row"><button type="button" class="bs__go" data-solo>Play with three bot commanders</button></div>
          <div class="bs__row"><span>With friends</span><button type="button" data-make>Make a room</button><input data-code-in maxlength="5" placeholder="CODE" /><button type="button" data-join>Join</button></div>`}
        <p class="bs__note" data-note>${esc(note)}</p>
        <p class="bs__keys">Drag or click to select · right-click move / attack · A attack · M move · P patrol · S stop · H hold · E heal · W to the Forge · Ctrl/Alt+0–9 save a group, 0–9 pick it · Tab all · Space last alert · Backspace camp · R Recruit · F Forge · U upgrades · G give · F1 all the keys</p>
      </div>`;
    const $ = (q) => m.querySelector(q);
    for (const b of m.querySelectorAll('[data-diff]')) {
      b.onclick = () => {
        this.pick.difficulty = b.dataset.diff;
        if (inRoom) this._hostLobby();
        else this._menu();
      };
    }
    if ($('[data-heroes]')) $('[data-heroes]').onclick = () => {
      this.pick.heroesOnly = !this.pick.heroesOnly;
      if (inRoom) this._hostLobby();
      else this._menu();
    };
    for (const b of m.querySelectorAll('[data-swap-to]')) b.onclick = () => this.onSwap(b.dataset.swapTo);
    if ($('[data-solo]')) $('[data-solo]').onclick = () => this.startSolo();
    if ($('[data-make]')) $('[data-make]').onclick = () => this._room('create');
    if ($('[data-join]')) {
      const join = () => this._room('join', $('[data-code-in]').value);
      $('[data-join]').onclick = join;
      $('[data-code-in]').onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') join();
      };
    }
    if ($('[data-start]')) $('[data-start]').onclick = () => this.startRoom();
    if ($('[data-leave]')) $('[data-leave]').onclick = () => {
      this.link.leave();
      this.link = null;
      this.lobby = null;
      this._menu();
    };
  }

  /* --------------------------------------------------------------- rooms */

  async _room(how, code = '') {
    const note = (t) => {
      const n = this.$('[data-note]');
      if (n) n.textContent = t;
    };
    if (how === 'join' && code.trim().length !== 5) return note('A room code has five letters');
    note('Connecting…');
    this.link?.leave();
    const link = new MobaLink();
    this.link = link;
    link.on('gp-lobby', (msg) => {
      this.lobby = msg;
      if (!this.game && !this.mirror) this._menu();
    });
    link.on('gp-start', (msg) => this._guestStart(msg));
    link.on('gp-snap', (msg) => {
      if (link.isHost || !this.mirror) return;
      this.mirror.push(msg.s);
      this.pending.push(...(msg.s.ev ?? []));
    });
    link.on('gp-cmd', (msg) => {
      if (!link.isHost || !this.game) return;
      const slot = this.seatOf.get(msg.from);
      if (slot == null) return;
      if (!this.orders.has(slot)) this.orders.set(slot, []);
      this.orders.get(slot).push(msg.o);
    });
    link.on('peers', () => link.isHost && this._hostLobby());
    link.on('left', (id) => {
      // Someone left mid-game: a bot takes over their soldiers.
      const slot = this.seatOf?.get(id);
      if (slot != null && this.game) this.game.players[slot].bot = true;
      if (link.isHost) this._hostLobby();
    });
    link.on('closed', () => {
      this.link = null;
      this.lobby = null;
      this._menu('The room closed');
    });
    try {
      if (how === 'create') await link.create(this.account?.name ?? 'Commander');
      else await link.join(code, this.account?.name ?? 'Commander');
      if (link.isHost) this._hostLobby();
      this._menu();
    } catch (e) {
      this.link = null;
      note(e?.message ?? 'Could not reach the room');
    }
  }

  _hostLobby() {
    const link = this.link;
    if (!link?.isHost) return;
    const people = link.peers().slice(0, SEATS).map((p) => ({ id: p.id, name: p.name }));
    this.lobby = { people, difficulty: this.pick.difficulty, heroesOnly: this.pick.heroesOnly };
    link.send({ t: 'gp-lobby', ...this.lobby });
    if (!this.game) this._menu();
  }

  _seats(people) {
    const seats = people.map((p) => ({ name: p.name, id: p.id }));
    for (let i = seats.length; i < SEATS; i++) seats.push({ name: BOT_NAMES[i], bot: true });
    return seats;
  }

  startSolo() {
    this.link?.leave();
    this.link = null;
    const seats = this._seats([{ id: 'me', name: this.account?.name ?? 'You' }]);
    this._begin(new Purge({ seats, difficulty: this.pick.difficulty, heroesOnly: this.pick.heroesOnly, seed: (Math.random() * 2 ** 31) | 0 }), 0);
  }

  startRoom() {
    const link = this.link;
    if (!link?.isHost) return;
    const seats = this._seats(this.lobby.people);
    this.seatOf = new Map(seats.map((s, i) => [s.id, i]).filter(([id]) => id));
    const game = new Purge({ seats, difficulty: this.pick.difficulty, heroesOnly: this.pick.heroesOnly, seed: (Math.random() * 2 ** 31) | 0 });
    link.send({ t: 'gp-start', seats: seats.map((s, i) => ({ ...s, slot: i })) });
    this._begin(game, this.seatOf.get(link.id));
  }

  _guestStart(msg) {
    const mine = msg.seats.find((s) => s.id === this.link.id);
    this.game = null;
    this.mirror = new Mirror({ delay: 0.12 });
    this.pending = [];
    this._show(mine?.slot ?? 0);
  }

  _begin(game, slot) {
    this.game = game;
    this.orders = new Map();
    this.acc = 0;
    this.sinceSnap = 0;
    this.hostEvents = [];
    this.mirror = null;
    this._show(slot);
  }

  _show(slot) {
    this.mySlot = slot;
    this.view.mySlot = slot;
    this.selected.clear();
    this.groups.clear();
    this.$('[data-menu]').hidden = true;
    this.$('[data-hud]').hidden = false;
    this.$('[data-banner]').hidden = true;
    this.$('[data-banner]').classList.remove('is-end');
    this.$('[data-feed]').innerHTML = '';
    this._panel(null);
    this.state = null;
    this.view.target.set(PAD.x, 0, PAD.z + 6);
    this.root.focus();
    this._sound();
    this._banner('Grave Purge', 'Drag to select, right-click to send. R buys Recruits; W walks them to the Forge (left of the camp, blue crystals) to be raised; E sends the hurt to the healing pad. F1: all the keys.', 6);
  }

  /** An order for my soldiers: straight in (alone or hosting), or to the host. */
  order(o) {
    if (this.game) {
      if (!this.orders.has(this.mySlot)) this.orders.set(this.mySlot, []);
      this.orders.get(this.mySlot).push(o);
    } else if (this.mirror && this.link) this.link.sendTo(this.link.session.host, { t: 'gp-cmd', o });
  }

  /* -------------------------------------------------------------- controls */

  _bind() {
    this._listeners = [];
    const on = (t, type, fn, opt) => {
      t.addEventListener(type, fn, opt);
      this._listeners.push([t, type, fn, opt]);
    };
    this.$('[data-close]').onclick = () => this.close();
    const stage = this.$('[data-stage]');
    const at = (e) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    on(stage, 'contextmenu', (e) => e.preventDefault());
    on(stage, 'mousemove', (e) => {
      const p = at(e);
      this.mouse = { ...p, inside: true };
      if (this.drag) {
        this.drag.x1 = p.x;
        this.drag.y1 = p.y;
        if (Math.hypot(p.x - this.drag.x0, p.y - this.drag.y0) > 6) this.view.box = this.drag;
      }
    });
    on(stage, 'mouseleave', () => (this.mouse.inside = false));
    on(stage, 'mousedown', (e) => {
      if (!this.state) return;
      const p = at(e);
      const ground = this.view.groundAt(p.x, p.y);
      if (e.button === 2) {
        if (!ground) return;
        const ids = this._mine();
        if (!ids.length) return;
        const foe = this.view.pick(this.state, p.x, p.y, 'foe');
        if (foe) this.order({ t: 'attack', ids, id: foe.i });
        else this.order({ t: 'move', ids, x: ground.x, z: ground.z });
        this.view._ring(foe?.x ?? ground.x, foe?.z ?? ground.z, foe ? 1.4 : 0.8, foe ? '#ff5040' : '#7dffb0', 0.35);
        this._aim(null);
      } else if (e.button === 0) {
        if (this.aimMode && ground) {
          const ids = this._mine();
          if (ids.length) this.order({ t: this.aimMode, ids, x: ground.x, z: ground.z });
          this.view._ring(ground.x, ground.z, 0.8, this.aimMode === 'move' ? '#7dffb0' : this.aimMode === 'patrol' ? '#80c0ff' : '#ffb040', 0.35);
          this._aim(null);
          return;
        }
        this.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, shift: e.shiftKey };
      }
    });
    on(window, 'mouseup', (e) => {
      if (e.button !== 0 || !this.drag || !this.state) return;
      const d = this.drag;
      this.drag = null;
      this.view.box = null;
      let ids;
      if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 6) ids = this.view.boxed(this.state, d.x0, d.y0, d.x1, d.y1, this.mySlot);
      else {
        const one = this.view.pick(this.state, d.x0, d.y0, 'troop', this.mySlot);
        ids = one ? [one.i] : [];
        // A double-click: every soldier of that rank on screen.
        if (one && this._lastClick && performance.now() - this._lastClick.t < 350 && this._lastClick.id === one.i) {
          ids = this.view.boxed(this.state, 0, 0, this.view.width, this.view.height, this.mySlot).filter((i) => this.state.ents.find((x) => x.i === i)?.rank === one.rank);
        }
        this._lastClick = { t: performance.now(), id: one?.i };
      }
      if (!d.shift) this.selected.clear();
      for (const i of ids) this.selected.add(i);
    });
    on(stage, 'wheel', (e) => {
      e.preventDefault();
      this.view.zoomBy(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
    const mini = this.$('[data-mini]');
    on(mini, 'mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = mini.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * SIZE;
      const z = ((e.clientY - r.top) / r.height) * SIZE;
      if (e.button === 2) {
        const ids = this._mine();
        if (ids.length) this.order({ t: this.aimMode ?? 'move', ids, x, z });
        this._aim(null);
      } else {
        this.view.target.set(x, 0, z);
        this.follow = false;
      }
    });
    on(mini, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', (e) => {
      if (!this.root.isConnected || e.target?.matches?.('input')) return;
      if (!this.state) {
        if (e.key === 'Escape' && !this.$('[data-menu]').hidden) this.close();
        return;
      }
      if (this._key(e)) e.preventDefault();
    });
    on(window, 'keyup', (e) => this.keys.delete(e.key));
  }

  /** One key: true when the game used it. */
  _key(e) {
    const k = e.key.toLowerCase();
    this.keys.add(e.key);
    if (e.repeat) return /^[0-9]$/.test(e.key) || e.key === 'Tab';
    const digit = /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) : /^[0-9]$/.test(e.key) ? e.key : null;
    if (digit != null) {
      if (e.ctrlKey || e.metaKey || e.altKey) this._saveGroup(digit, false);
      else if (e.shiftKey) this._saveGroup(digit, true);
      else this._pickGroup(digit);
      return true;
    }
    const fkey = /^F([5-8])$/.exec(e.key);
    if (fkey) {
      this.views ??= new Map();
      if (e.shiftKey || e.ctrlKey || e.altKey) {
        this.views.set(fkey[1], { x: this.view.target.x, z: this.view.target.z });
        this._feed(`View saved to F${fkey[1]}`);
      } else if (this.views.has(fkey[1])) {
        const v = this.views.get(fkey[1]);
        this.view.target.set(v.x, 0, v.z);
      }
      return true;
    }
    const ids = () => this._mine();
    switch (k) {
      case 'tab':
      case 'f2':
        this.selected.clear();
        for (const t of this.state.ents) if (t.k === 'troop' && t.o === this.mySlot) this.selected.add(t.i);
        return true;
      case 'a':
        this._aim('amove');
        return true;
      case 'm':
        this._aim('move');
        return true;
      case 'p':
        this._aim('patrol');
        return true;
      case 's':
        this.order({ t: 'stop', ids: ids() });
        return true;
      case 'h':
        this.order({ t: 'hold', ids: ids() });
        return true;
      case 'e':
        if (ids().length) {
          this.order({ t: 'heal', ids: ids() });
          this._feed('To the healing pad');
        }
        return true;
      case 'w':
        if (ids().length) {
          this.order({ t: 'toForge', ids: ids() });
          this._feed(this.me()?.autoForge ? 'To the Forge — they are raised there when you have the ore' : 'To the Forge');
        }
        return true;
      case 'r':
        this.order({ t: 'buy', n: e.shiftKey ? 5 : 1 });
        return true;
      case 'f':
        this._panel(this.panel === 'forge' ? null : 'forge');
        return true;
      case 'u':
        this._panel(this.panel === 'armory' ? null : 'armory');
        return true;
      case 'g':
        this._panel(this.panel === 'give' ? null : 'give');
        return true;
      case ' ':
        // The last alert (a wave), if recent; else your selection.
        if (this.alert && performance.now() - this.alert.t < 15000) this.view.target.set(this.alert.x, 0, this.alert.z);
        else this._centre();
        return true;
      case 'backspace':
        this.view.target.set(PAD.x, 0, PAD.z + 4);
        return true;
      case 'f1':
      case '?':
        this._help();
        return true;
      case 'escape':
        this._aim(null);
        this._panel(null);
        this.$('[data-help]').hidden = true;
        return true;
      case '+':
      case '=':
      case '-':
        if (this.game) {
          const n = SPEEDS.indexOf(this.game.speed) + (k === '-' ? -1 : 1);
          this.game.speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, n))];
        }
        return true;
      default:
        return false;
    }
  }

  /** Save the selection as group n (or add it to the group). */
  _saveGroup(n, add) {
    const now = this._mine();
    if (!now.length && !add) return;
    const list = add ? [...new Set([...(this.groups.get(n) ?? []), ...now])] : now;
    this.groups.set(n, list);
    this._feed(`Group ${n}: ${list.length} soldier${list.length === 1 ? '' : 's'}`);
    this._groupKey = '';
  }

  /** Pick group n; picked again quickly, look at it. */
  _pickGroup(n) {
    const alive = new Set(this.state.ents.filter((e) => e.k === 'troop' && e.o === this.mySlot).map((e) => e.i));
    const list = (this.groups.get(n) ?? []).filter((i) => alive.has(i));
    this.groups.set(n, list);
    if (!list.length) return;
    this.selected.clear();
    for (const i of list) this.selected.add(i);
    const now = performance.now();
    if (this._lastGroup?.n === n && now - this._lastGroup.t < 350) this._centre();
    this._lastGroup = { n, t: now };
  }

  _help() {
    const h = this.$('[data-help]');
    h.hidden = !h.hidden;
    if (h.hidden) return;
    const rows = [
      ['Select', 'Left-click · drag a box · double-click: that rank on screen · Shift adds'],
      ['Move / attack', 'Right-click the ground / the dead (the map too)'],
      ['A', 'Attack: click where — they fight on the way'], ['M', 'Move: click where — they do not stop to fight'], ['P', 'Patrol: back and forth to where you click'],
      ['S · H', 'Stop · hold position'], ['E', 'Heal: off to the healing pad (fast healing; the camp heals slowly)'],
      ['W', 'To the Forge: walked into its ring, a soldier is raised a rank when you have the ore'],
      ['Ctrl/Alt + 0–9', 'Save the selection as a group'], ['Shift + 0–9', 'Add the selection to a group'], ['0–9', 'Pick a group (twice quickly: look at it)'],
      ['Tab · F2', 'All your soldiers'], ['Space', 'The last alert (else your soldiers)'], ['Backspace', 'Back to the camp'],
      ['Shift+F5–F8 · F5–F8', 'Save a view · go to it'], ['R · Shift+R', 'A Recruit · five'], ['F · U · G', 'Forge · armoury · give ore'], ['+ −', 'Game speed (the host)'], ['F1 · ?', 'These keys']
    ];
    h.innerHTML = `<header><h2>Keys</h2><button type="button" data-help-x>✕</button></header><table>${rows.map(([key, what]) => `<tr><th>${esc(key)}</th><td>${esc(what)}</td></tr>`).join('')}</table><p class="gp__hint">On Windows, Ctrl+number may switch browser tabs — use Alt+number to save a group.</p>`;
    h.querySelector('[data-help-x]').onclick = () => (h.hidden = true);
  }

  _aim(mode) {
    this.aimMode = mode;
    const aim = this.$('[data-aim]');
    aim.hidden = !mode;
    const say = { amove: 'Attack: left-click where to go — they fight on the way', move: 'Move: left-click where to go', patrol: 'Patrol: left-click the far end' };
    if (mode) aim.textContent = `${say[mode]} (right-click the map works too) · Esc cancels`;
  }

  /** My selected soldiers that still stand. */
  _mine() {
    const alive = new Set(this.state?.ents.filter((e) => e.k === 'troop' && e.o === this.mySlot).map((e) => e.i));
    for (const i of this.selected) if (!alive.has(i)) this.selected.delete(i);
    return [...this.selected];
  }

  _centre() {
    const mine = this.state.ents.filter((e) => e.k === 'troop' && e.o === this.mySlot && (this.selected.size ? this.selected.has(e.i) : true));
    if (!mine.length) return this.view.target.set(PAD.x, 0, PAD.z + 6);
    this.view.target.set(mine.reduce((s, e) => s + e.x, 0) / mine.length, 0, mine.reduce((s, e) => s + e.z, 0) / mine.length + 4);
  }

  me() {
    return this.state?.players[this.mySlot] ?? null;
  }

  /* -------------------------------------------------------------- panels */

  _panel(which) {
    this.panel = which;
    this._panelKey = '';
    this.$('[data-panel]').hidden = !which;
  }

  _drawPanel() {
    const me = this.me();
    const el = this.$('[data-panel]');
    if (!me || !this.panel) return;
    const mineAll = this.state.ents.filter((e) => e.k === 'troop');
    const key = `${this.panel}|${me.ore}|${me.relics}|${me.autoForge}|${JSON.stringify(me.upg)}|${mineAll.filter((e) => e.o === this.mySlot).map((e) => `${e.rank}${Math.round(e.x / 2)},${Math.round(e.z / 2)}`).join()}`;
    if (key === this._panelKey) return;
    this._panelKey = key;
    if (this.panel === 'forge') {
      el.innerHTML = `<header><h2>The Forge</h2><span>${me.ore.toLocaleString()} ore · ${me.relics} relics</span><button type="button" data-x>✕</button></header>
        <p class="gp__hint">The Forge is on the camp's left side, ringed with blue crystals. Walk soldiers into the ring (select them, <b>W</b>): ${me.autoForge ? 'each is raised a rank by itself as soon as you have the ore — one rank a visit (walk it out and back in for the next)' : 'then raise them here'}. Relics come from breaking shrines, soul nodes and relic caches — everyone gets them.</p>
        <div class="bs__row"><span>Raise in the ring by itself</span><button type="button" data-auto class="${me.autoForge ? 'is-on' : ''}">${me.autoForge ? 'On' : 'Off'}</button></div>
        ${RANK_ORDER.filter((r) => RANKS[r].from).map((r) => {
          const d = RANKS[r];
          const can = forgeCheck(mineAll, this.mySlot, me.ore, me.relics, r);
          const from = Object.entries(d.from).map(([k, n]) => `${n > 1 ? `${n} ` : ''}${RANKS[k].name}${n > 1 ? 's' : ''}`).join(' + ');
          return `<button type="button" data-forge="${r}" class="${can.ok ? 'is-ok' : ''}"><b>${d.name}</b><small>${from} + ${d.ore.toLocaleString()} ore${d.relics ? ` + ${d.relics} relics` : ''}${d.one ? ' · one each' : ''}</small><i>${d.hp} health · ${d.gun.dmg} × ${d.gun.rate}/s · reach ${d.gun.range}${d.gun.splash ? ' · bursts' : ''}</i><em>${can.ok ? 'Raise' : esc(can.why)}</em></button>`;
        }).join('')}
        <div class="bs__row"><button type="button" data-send-forge>Send selected to the Forge (W)</button></div>`;
      for (const b of el.querySelectorAll('[data-forge]')) b.onclick = () => this.order({ t: 'forge', rank: b.dataset.forge });
      el.querySelector('[data-auto]').onclick = () => this.order({ t: 'autoForge', on: !me.autoForge });
      el.querySelector('[data-send-forge]').onclick = () => {
        const ids = this._mine();
        if (ids.length) this.order({ t: 'toForge', ids });
      };
    } else if (this.panel === 'armory') {
      el.innerHTML = `<header><h2>Armoury</h2><span>${me.ore.toLocaleString()} ore</span><button type="button" data-x>✕</button></header>
        ${Object.entries(UPGRADES).map(([k, u]) => {
          const lvl = me.upg[k];
          const cost = upgradeCost(k, lvl);
          const full = lvl >= u.max;
          return `<button type="button" data-up="${k}" ${full || me.ore < cost ? 'disabled' : ''}><b>${esc(u.name)} · ${lvl}/${u.max}</b><small>${esc(u.text)}</small><em>${full ? 'full' : `${cost.toLocaleString()} ore`}</em></button>`;
        }).join('')}
        <p class="gp__hint">Shrines broken: ${this.state.shrines}/6 — ${SHRINE_GIFTS.filter((g) => g.at <= this.state.shrines).map((g) => esc(g.text)).join(' · ') || 'none yet'}</p>`;
      for (const b of el.querySelectorAll('[data-up]')) b.onclick = () => this.order({ t: 'upgrade', key: b.dataset.up });
    } else if (this.panel === 'give') {
      el.innerHTML = `<header><h2>Give ore</h2><span>${me.ore.toLocaleString()} ore</span><button type="button" data-x>✕</button></header>
        ${this.state.players.filter((p) => p.slot !== this.mySlot).map((p) => `<div class="bs__row"><span><i class="gp__dot" style="background:${p.color}"></i>${esc(p.name)}${p.bot ? ' · bot' : ''}</span>${GIFTS.map((n) => `<button type="button" data-give="${p.slot}" data-n="${n}" ${me.ore < n ? 'disabled' : ''}>${n.toLocaleString()}</button>`).join('')}</div>`).join('')}`;
      for (const b of el.querySelectorAll('[data-give]')) b.onclick = () => this.order({ t: 'give', to: Number(b.dataset.give), n: Number(b.dataset.n) });
    }
    el.querySelector('[data-x]').onclick = () => this._panel(null);
  }

  /* -------------------------------------------------------------- frames */

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._meter(now, now - this._last);
    this._last = now;
    let events = [];
    if (this.game) {
      this.acc += dt * this.game.speed;
      let steps = 0;
      while (this.acc >= TICK && steps++ < 10) {
        this.acc -= TICK;
        const ev = this.game.step(TICK, this.orders);
        this.orders = new Map();
        events.push(...ev);
        this.hostEvents.push(...ev);
      }
      if (this.acc > TICK * 10) this.acc = 0;
      this.state = this.game.snapshot();
      this.sinceSnap += dt;
      if (this.link?.inRoom && this.sinceSnap >= 0.1) {
        this.sinceSnap = 0;
        this.link.send({ t: 'gp-snap', s: { ...this.state, ev: this.hostEvents.filter((e) => e.t !== 'ore' || e.o !== this.mySlot).slice(-160) } });
        this.hostEvents = [];
      }
    } else if (this.mirror) {
      const s = this.mirror.state(dt);
      if (s) this.state = s;
      events = this.pending.splice(0);
    } else {
      // The menu's backdrop: the bots, from above the camp.
      for (let k = 0; k < 2; k++) this.view.absorb(this.demo.step(TICK), this.demo.snapshot());
      const s = this.demo.snapshot();
      if (this.demo.over) this.demo = new Purge({ difficulty: 'casual', seed: (now | 0) + 1, seats: BOT_NAMES.map((name) => ({ name, bot: true })) });
      const lead = s.ents.find((e) => e.k === 'troop' && !BASE_HAS(e));
      this.view.render(s, dt, { follow: lead ?? { x: PAD.x, z: PAD.z } });
      return;
    }
    if (!this.state) return;
    this._pan(dt);
    this.view.absorb(events, this.state);
    this.view.render(this.state, dt);
    this.view.overlay(this.octx, this.state, this.mySlot);
    this._events(events);
    this._hud();
  }

  /** Frames a second (and the slowest frame) over each half second, for comparing 2D and 3D. */
  _meter(now, ms) {
    const f = this.fps;
    f.frames++;
    f.worst = Math.max(f.worst, ms);
    if (now - f.at < 500) return;
    f.value = Math.round((f.frames * 1000) / (now - f.at));
    f.slowest = Math.round(f.worst);
    f.frames = 0;
    f.worst = 0;
    f.at = now;
    const el = this.$('[data-fps]');
    const baking = this.flat && this.view.progress < 1 && !this.view.sprites;
    if (el) el.textContent = `${this.flat ? '2D' : '3D'} · ${f.value} fps · slowest frame ${f.slowest} ms${baking ? ` · painting sprites ${Math.round(this.view.progress * 100)}%` : ''}`;
  }

  _pan(dt) {
    const k = this.keys;
    let dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
    let dz = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
    if (this.mouse.inside && document.hasFocus() && !this.drag) {
      const edge = 12;
      if (this.mouse.x < edge) dx = -1;
      if (this.mouse.x > this.view.width - edge) dx = 1;
      if (this.mouse.y < edge) dz = -1;
      if (this.mouse.y > this.view.height - edge) dz = 1;
    }
    if (dx || dz) this.view.pan(dx * (24 + this.view.zoom) * dt, dz * (24 + this.view.zoom) * dt);
  }

  _events(events) {
    for (const e of events) {
      if (e.t === 'shrine') this._banner(`Shrine of Bones broken (${e.n}/6)`, e.text, 3.5);
      else if (e.t === 'fall' && e.type === 'node') this._banner('A Soul Node is broken', `${this.state.keysLeft} of the Heart's wards left`, 3);
      else if (e.t === 'fall' && e.type === 'cache') this._feed(`Relic cache opened: +1 relic each`);
      else if (e.t === 'heart') this._banner('The Heart of the Grave is open', 'Every ward is broken — it can be hurt now (far south-east)', 4);
      else if (e.t === 'king') this._banner(GUARDIANS.king.name, 'The Heart is broken — and the king rises from it', 4);
      else if (e.t === 'guardian') this._feed(`${GUARDIANS[e.kind]?.name ?? 'A guardian'} is slain`);
      else if (e.t === 'raid') {
        this._banner(`Wave ${e.wave}`, `${e.n} of the dead are coming for the camp`, 3);
        this.pings.push({ x: e.x, z: e.z, t: performance.now() });
        this.alert = { x: e.x, z: e.z, t: performance.now() };
      }
      else if (e.t === 'wrath') {
        this._banner('The dead answer', `${e.n} are coming from the crypts nearby, to where the ${BUILDINGS[e.type]?.name ?? 'building'} fell`, 3);
        this.pings.push(...e.from.map(([x, z]) => ({ x, z, t: performance.now() })), { x: e.x, z: e.z, t: performance.now() });
        this.alert = { x: e.from[0][0], z: e.from[0][1], t: performance.now() };
      }
      else if (e.t === 'forge') {
        this._feed(`${e.o === this.mySlot ? 'You' : this.state.players[e.o]?.name} raised a ${RANKS[e.rank].name}`);
        // The raised soldier takes the place of what it was made from, in the selection and in groups.
        if (e.o === this.mySlot && e.from?.length) {
          const was = new Set(e.from);
          if (e.from.some((i) => this.selected.has(i))) this.selected.add(e.id);
          for (const [n, list] of this.groups) if (list.some((i) => was.has(i))) this.groups.set(n, [...list.filter((i) => !was.has(i)), e.id]);
          for (const i of e.from) this.selected.delete(i);
          this._groupKey = '';
        }
      }
      else if (e.t === 'give') this._feed(`${this.state.players[e.o]?.name} gave ${this.state.players[e.to]?.name} ${e.n.toLocaleString()} ore`);
      else if (e.t === 'stipend') this._feed(`Supply drop: +${e.n} ore each`);
      else if (e.t === 'over') this._end(e);
      if (e.t === 'shot' && this.audio) this._pop(e.big ? 0.05 : 0.035);
      if ((e.t === 'blast' || e.t === 'fall') && this.audio) this._boom();
    }
  }

  _feed(text) {
    const f = this.$('[data-feed]');
    const p = document.createElement('p');
    p.textContent = text;
    f.prepend(p);
    while (f.children.length > 5) f.lastChild.remove();
    setTimeout(() => p.remove(), 7000);
  }

  _banner(title, text, seconds) {
    const b = this.$('[data-banner]');
    if (b.classList.contains('is-end')) return;
    b.innerHTML = `<h2>${esc(title)}</h2><p>${esc(text)}</p>`;
    b.hidden = false;
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => (b.hidden = true), seconds * 1000);
  }

  _end(e) {
    const s = this.state;
    const b = this.$('[data-banner]');
    clearTimeout(this._bannerT);
    b.hidden = false;
    b.classList.add('is-end');
    const used = DIFFICULTY[s.difficulty].minutes * 60 - s.left;
    b.innerHTML = `<h2>${e.won ? 'The Gravefield is purged' : 'Time is up'}</h2>
      <p>${e.won ? `The Grave King is dead, in ${clock(used)} on ${DIFFICULTY[s.difficulty].name}.` : `The dead still hold ${s.keysLeft ? `${s.keysLeft} of the Heart's wards` : 'the Heart'}.`}</p>
      <table><thead><tr><th>Commander</th><th>Kills</th><th>Ore earned</th><th>Soldiers</th></tr></thead><tbody>${s.players.map((p) => `<tr><td><i style="background:${p.color}"></i>${esc(p.name)}${p.bot ? ' <small>bot</small>' : ''}</td><td>${p.kills}</td><td>${p.earned.toLocaleString()}</td><td>${p.army}</td></tr>`).join('')}</tbody></table>
      <div class="bs__row"><button type="button" class="bs__go" data-again>Again</button><button type="button" data-menu-back>Menu</button></div>`;
    b.querySelector('[data-again]').onclick = () => {
      b.classList.remove('is-end');
      b.hidden = true;
      if (this.link?.inRoom) this.startRoom();
      else this.startSolo();
    };
    b.querySelector('[data-menu-back]').onclick = () => {
      b.classList.remove('is-end');
      b.hidden = true;
      this._menu();
    };
  }

  _hud() {
    const s = this.state;
    const me = this.me();
    const host = Boolean(this.game);
    const topKey = `${Math.floor(s.left)}|${s.shrines}|${s.nodes}|${s.keysLeft}|${s.speed}|${Math.floor(s.raidIn)}`;
    if (topKey !== this._topKey) {
      this._topKey = topKey;
      this.$('[data-top]').innerHTML = `
        <div class="bs__wave"><small>Time left</small><b class="${s.left < 300 ? 'gp__late' : ''}">${clock(s.left)}</b></div>
        <div class="bs__wave"><small>Shrines</small><b>${s.shrines}/6</b></div>
        <div class="bs__wave"><small>Soul nodes</small><b>${s.nodes}/6</b></div>
        <div class="bs__wave"><small>The Heart</small><b>${s.keysLeft ? 'sealed' : 'open'}</b></div>
        <div class="bs__wave"><small>Wave ${s.raids + 1} in</small><b>${clock(Math.max(0, s.raidIn))}</b></div>
        <div class="gp__speed">${SPEEDS.map((n) => `<button type="button" data-speed="${n}" class="${s.speed === n ? 'is-on' : ''}" ${host ? '' : 'disabled'}>×${n}</button>`).join('')}</div>`;
      for (const b of this.$('[data-top]').querySelectorAll('[data-speed]')) b.onclick = () => this.game && (this.game.speed = Number(b.dataset.speed));
    }
    const boss = s.ents.find((e) => e.k === 'foe' && GUARDIANS[e.kind] && e.hp < e.max);
    this.$('[data-boss]').hidden = !boss;
    if (boss) {
      this.$('[data-boss-name]').textContent = GUARDIANS[boss.kind].name;
      this.$('[data-boss-hp]').style.width = `${(boss.hp / boss.max) * 100}%`;
    }
    this.$('[data-team]').innerHTML = s.players.map((p) => `<p class="${p.slot === this.mySlot ? 'is-me' : ''}"><i style="background:${p.color}"></i><b>${esc(p.name)}</b><small>${p.bot ? 'bot · ' : ''}${p.army} soldiers · ${p.kills} kills</small><span>${p.ore.toLocaleString()} ore</span></p>`).join('');
    if (me) {
      const mine = s.ents.filter((e) => e.k === 'troop' && e.o === this.mySlot);
      const sel = mine.filter((e) => this.selected.has(e.i));
      const count = (list) => RANK_ORDER.map((r) => [r, list.filter((e) => e.rank === r).length]).filter(([, n]) => n);
      const key = `${me.ore}|${me.relics}|${mine.length}|${sel.length}|${count(sel).join()}|${count(mine).join()}|${this.panel}`;
      if (key !== this._barKey) {
        this._barKey = key;
        const recruit = s.heroesOnly ? `Veteran · ${(RANKS.veteran.ore + RANKS.recruit.cost).toLocaleString()}` : `Recruit · ${RANKS.recruit.cost}`;
        this.$('[data-bar]').innerHTML = `
          <div class="gp__purse"><b>${me.ore.toLocaleString()}</b><small>ore</small><b>${me.relics}</b><small>relics</small><b>${mine.length}/${SUPPLY}</b><small>soldiers</small></div>
          <div class="gp__sel">${sel.length ? `<b>${sel.length} selected</b><small>${count(sel).map(([r, n]) => `${n} ${RANKS[r].name}`).join(' · ')}</small>` : `<b>Nothing selected</b><small>${count(mine).map(([r, n]) => `${n} ${RANKS[r].name}`).join(' · ') || 'No soldiers — buy some (R)'} · Tab selects all</small>`}</div>
          <div class="gp__cmds">
            <button type="button" data-key="m" ${sel.length ? '' : 'disabled'}><em>M</em><b>Move</b></button>
            <button type="button" data-key="s" ${sel.length ? '' : 'disabled'}><em>S</em><b>Stop</b></button>
            <button type="button" data-key="a" ${sel.length ? '' : 'disabled'}><em>A</em><b>Attack</b></button>
            <button type="button" data-key="p" ${sel.length ? '' : 'disabled'}><em>P</em><b>Patrol</b></button>
            <button type="button" data-key="h" ${sel.length ? '' : 'disabled'}><em>H</em><b>Hold</b></button>
            <button type="button" data-key="e" class="gp__heal" ${sel.length ? '' : 'disabled'}><em>E</em><b>Heal</b></button>
            <button type="button" data-key="w" class="gp__forge" ${sel.length ? '' : 'disabled'}><em>W</em><b>To Forge</b></button>
            <button type="button" data-buy="1"><em>R</em><b>${recruit}</b></button>
            <button type="button" data-open="forge" class="${this.panel === 'forge' ? 'is-on' : ''}"><em>F</em><b>Forge</b></button>
            <button type="button" data-open="armory" class="${this.panel === 'armory' ? 'is-on' : ''}"><em>U</em><b>Upgrade</b></button>
            <button type="button" data-open="give" class="${this.panel === 'give' ? 'is-on' : ''}"><em>G</em><b>Give</b></button>
            <button type="button" data-key="?"><em>F1</em><b>Keys</b></button>
          </div>`;
        for (const b of this.$('[data-bar]').querySelectorAll('[data-key]')) b.onclick = () => this._key({ key: b.dataset.key, code: '', repeat: false });
        for (const b of this.$('[data-bar]').querySelectorAll('[data-buy]')) b.onclick = () => this.order({ t: 'buy', n: Number(b.dataset.buy) });
        for (const b of this.$('[data-bar]').querySelectorAll('[data-open]')) b.onclick = () => this._panel(this.panel === b.dataset.open ? null : b.dataset.open);
      }
    }
    if (this.panel) this._drawPanel();
    this._groupBar();
    this._minimap();
  }

  /** The saved groups, 1 to 0: click to pick, right-click to save the selection there. */
  _groupBar() {
    const alive = new Map(this.state.ents.filter((e) => e.k === 'troop' && e.o === this.mySlot).map((e) => [e.i, e]));
    const slots = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const key = slots.map((n) => (this.groups.get(n) ?? []).filter((i) => alive.has(i)).length).join();
    if (key === this._groupKey) return;
    this._groupKey = key;
    const el = this.$('[data-groups]');
    el.innerHTML = slots.map((n) => {
      const list = (this.groups.get(n) ?? []).filter((i) => alive.has(i));
      const top = list.map((i) => alive.get(i)).sort((a, b) => RANKS[b.rank].tier - RANKS[a.rank].tier)[0];
      return `<button type="button" data-group="${n}" class="${list.length ? 'is-set' : ''}" title="${list.length ? `Group ${n}: ${list.length} — click to pick` : `Right-click (or Ctrl/Alt+${n}) to save your selection as group ${n}`}"><em>${n}</em>${list.length ? `<b>${list.length}</b><small>${RANKS[top.rank].name}</small>` : ''}</button>`;
    }).join('');
    for (const b of el.querySelectorAll('[data-group]')) {
      b.onclick = (e) => (e.shiftKey ? this._saveGroup(b.dataset.group, true) : this._pickGroup(b.dataset.group));
      b.oncontextmenu = (e) => {
        e.preventDefault();
        this._saveGroup(b.dataset.group, false);
      };
    }
  }

  /** The land drawn once for the map: ridges, rocks, the camp. */
  _mapLayer() {
    const c = document.createElement('canvas');
    c.width = c.height = 360;
    const g = c.getContext('2d');
    const k = c.width / SIZE;
    const band = ['#3a3230', '#34292c', '#2e2430', '#2a1f2e'];
    for (let r = 4; r >= 1; r--) {
      g.fillStyle = band[r - 1];
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, ([0, 100, 165, 225, 400][r]) * k, 0, Math.PI / 2);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#7a6e66';
    g.lineCap = 'round';
    for (const { pts, w } of RIDGES) {
      g.lineWidth = w * k;
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
      g.stroke();
    }
    g.fillStyle = '#7a6e66';
    for (const [x, z, r] of ROCKS) {
      g.beginPath();
      g.arc(x * k, z * k, r * k, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#4a5560';
    g.fillRect(BASE.x0 * k, BASE.z0 * k, (BASE.x1 - BASE.x0) * k, (BASE.z1 - BASE.z0) * k);
    g.fillStyle = '#40c0ff';
    g.beginPath();
    g.arc(FORGE.x * k, FORGE.z * k, 4, 0, Math.PI * 2);
    g.fill();
    this.mapLayer = c;
  }

  _minimap() {
    const c = this.$('[data-mini]');
    const g = c.getContext('2d');
    const k = c.width / SIZE;
    const s = this.state;
    g.drawImage(this.mapLayer, 0, 0);
    const down = new Set(s.down);
    for (const b of STRUCTURES) {
      if (down.has(b.id)) continue;
      const def = BUILDINGS[b.type];
      g.fillStyle = def.heart ? (s.keysLeft ? '#8040c0' : '#ff2040') : b.type === 'shrine' ? '#ffb030' : b.type === 'node' ? '#40e0ff' : b.type === 'cache' ? '#ffe070' : '#b05050';
      const r = def.heart ? 9 : def.key ? 7 : b.type === 'cache' ? 4 : 3.4;
      g.fillRect(b.x * k - r / 2, b.z * k - r / 2, r, r);
    }
    for (const e of s.ents) {
      if (e.k !== 'foe') continue;
      g.fillStyle = GUARDIANS[e.kind] ? '#ff9020' : '#ff4a3a';
      const r = GUARDIANS[e.kind] ? 6 : 2.6;
      g.fillRect(e.x * k - r / 2, e.z * k - r / 2, r, r);
    }
    for (const e of s.ents) {
      if (e.k !== 'troop') continue;
      g.fillStyle = COLORS[e.o];
      const r = 2.4 + RANKS[e.rank].tier * 0.8;
      g.beginPath();
      g.arc(e.x * k, e.z * k, r, 0, Math.PI * 2);
      g.fill();
      if (e.o === this.mySlot && this.selected.has(e.i)) {
        g.strokeStyle = '#fff';
        g.lineWidth = 1;
        g.stroke();
      }
    }
    // Where waves come from: red rings, for a few seconds.
    const now = performance.now();
    this.pings = this.pings.filter((p) => now - p.t < 5000);
    for (const p of this.pings) {
      const age = ((now - p.t) % 1000) / 1000;
      g.strokeStyle = `rgba(255,70,50,${1 - age})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(p.x * k, p.z * k, 4 + age * 14, 0, Math.PI * 2);
      g.stroke();
    }
    const corners = [[0, 0], [this.view.width, 0], [this.view.width, this.view.height], [0, this.view.height]].map(([x, y]) => this.view.groundAt(x, y));
    if (corners.every(Boolean)) {
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 1.5;
      g.beginPath();
      corners.forEach((p, i) => (i ? g.lineTo(p.x * k, p.z * k) : g.moveTo(p.x * k, p.z * k)));
      g.closePath();
      g.stroke();
    }
  }

  /* ---------------------------------------------------------------- sound */

  _sound() {
    if (this.audio) return;
    try {
      this.audio = new (window.AudioContext || window.webkitAudioContext)();
      const len = this.audio.sampleRate * 0.4;
      this.noise = this.audio.createBuffer(1, len, this.audio.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.audio = null;
    }
  }

  _pop(volume) {
    const a = this.audio;
    if (!a || (this._lastPop && a.currentTime - this._lastPop < 0.04)) return;
    this._lastPop = a.currentTime;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const gain = a.createGain();
    gain.gain.setValueAtTime(volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.07);
    src.connect(f).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 0.08);
  }

  _boom() {
    const a = this.audio;
    if (!a || (this._lastBoom && a.currentTime - this._lastBoom < 0.1)) return;
    this._lastBoom = a.currentTime;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.3, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4);
    src.connect(f).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 0.4);
  }
}

const BASE_HAS = (e) => e.x <= BASE.x1 && e.z <= BASE.z1;
export { HEART };
