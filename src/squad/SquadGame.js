import { Game } from './sim.js';
import { SquadView } from './view.js';
import { MobaLink, Mirror } from '../moba/net.js';
import { CLASSES, CLASS_ORDER, FOES, UPGRADES, MEDKIT, DIFFICULTY, TICK, WAVES, upgradeCost } from './rules.js';
import { SIZE, WALLS, RIFTS, REACTOR_AT } from './map.js';
import './squad.css';
import './purge/purge.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BOT_NAMES = ['Kade', 'Mara', 'Osei', 'Lin'];
const SEATS = 4;

/**
 * Bastion Squad: hold Kestrel Outpost's reactor against fifteen waves of
 * the risen dead, a squad of four. Alone, with three bot soldiers; or with
 * up to three friends in a room (the host's browser runs the game; the
 * others send their orders and draw what it sends back).
 *
 * Right-click: move, or attack what you click. A then left-click: move,
 * fighting on the way. S stop, H hold. Q W E: your class's skills, aimed at
 * the cursor. F: a medkit. B: the armoury. Space: back to your soldier.
 */
export class SquadGame {
  constructor(host, { account = null, onClose = () => {}, onSwap = null } = {}) {
    this.host = host;
    this.account = account;
    this.onClose = onClose;
    this.onSwap = onSwap;
    this.pick = { cls: 'rifleman', difficulty: 'veteran' };
    try {
      this.pick.cls = CLASSES[localStorage.getItem('gamory.squad.class')] ? localStorage.getItem('gamory.squad.class') : 'rifleman';
    } catch {
      /* private mode */
    }
    this.keys = new Set();
    this.mouse = { x: 0, y: 0 };
    window.bastion = this;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.className = 'bs';
    this.root.tabIndex = -1;
    this.root.innerHTML = `
      <div class="bs__stage" data-stage><canvas class="bs__overlay" data-overlay></canvas></div>
      <div class="bs__hud" data-hud hidden>
        <div class="bs__top">
          <div class="bs__wave" data-wave></div>
          <div class="bs__reactor"><small>Reactor</small><div class="bs__bar"><i data-reactor></i></div></div>
          <div class="bs__lives" data-lives></div>
        </div>
        <div class="bs__boss" data-boss hidden><b data-boss-name></b><div class="bs__bar"><i data-boss-hp></i></div></div>
        <div class="bs__banner" data-banner hidden></div>
        <aside class="bs__squad" data-squad></aside>
        <canvas class="bs__mini" data-mini width="300" height="300"></canvas>
        <div class="bs__me" data-me></div>
        <div class="bs__shop" data-shop hidden></div>
        <div class="bs__aim" data-aim hidden></div>
      </div>
      <div class="bs__menu" data-menu></div>
      <button type="button" class="bs__x" data-close aria-label="Leave Bastion Squad">✕</button>`;
    this.host.append(this.root);
    this.$ = (q) => this.root.querySelector(q);
    this.view = new SquadView(this.$('[data-stage]'));
    this.overlay = this.$('[data-overlay]');
    this.octx = this.overlay.getContext('2d');
    this._resize = new ResizeObserver(() => this._fit());
    this._resize.observe(this.root);
    this._fit();
    this._bind();
    this._menu();
    // Behind the menu: the outpost at rest, a squad of bots holding it.
    this.demo = new Game({ difficulty: 'recruit', seed: 3, seats: CLASS_ORDER.map((cls, i) => ({ cls, name: BOT_NAMES[i], bot: true })) });
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
    if (window.bastion === this) delete window.bastion;
    if (!swap) this.onClose();
  }

  /* --------------------------------------------------------------- menus */

  _menu(note = '') {
    this.game = null;
    this.mirror = null;
    this.$('[data-hud]').hidden = true;
    const m = this.$('[data-menu]');
    m.hidden = false;
    const inRoom = this.link?.inRoom;
    const host = !inRoom || this.link.isHost;
    const lobby = this.lobby ?? null;
    m.innerHTML = `
      <div class="bs__card">
        ${this.onSwap ? '<div class="gp__modes"><button type="button" data-swap="purge">Grave Purge 3D</button><button type="button" data-swap="purge2d">Grave Purge 2D</button><button type="button" class="is-on">Hold the Outpost</button></div>' : ''}
        <h1>Bastion Squad</h1>
        <p class="bs__lead">Kestrel Outpost, a mining station on a dead world. The dead are climbing out of the rifts. Four soldiers hold the reactor through fifteen waves — every fifth ends with something worse. Fight together, heal each other, lift whoever falls; spend what you earn in the armoury.</p>
        <h3>Your soldier</h3>
        <div class="bs__classes">${CLASS_ORDER.map((id) => {
          const c = CLASSES[id];
          return `<button type="button" data-cls="${id}" class="${this.pick.cls === id ? 'is-on' : ''}" style="--c:${c.color}"><b>${c.name}</b><small>${esc(c.role)}</small><ul>${c.skills.map((s) => `<li><em>${s.key}</em> ${esc(s.name)}</li>`).join('')}</ul><span>${c.hp} health · ${c.armor} armour</span></button>`;
        }).join('')}</div>
        <div class="bs__row"><span>Difficulty</span>${Object.entries(DIFFICULTY).map(([id, d]) => `<button type="button" data-diff="${id}" class="${(lobby?.difficulty ?? this.pick.difficulty) === id ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${d.name}</button>`).join('')}</div>
        ${inRoom ? `
          <div class="bs__room"><b>Room <span data-code>${esc(this.link.code)}</span></b> — give friends the code (up to four). Bot soldiers take the empty places.
            <ul>${(lobby?.people ?? this.link.peers().map((p) => ({ id: p.id, name: p.name, cls: '…' }))).map((p) => `<li><i style="background:${CLASSES[p.cls]?.color ?? '#888'}"></i>${esc(p.name)} — ${esc(CLASSES[p.cls]?.name ?? 'choosing')}${p.id === this.link.session.host ? ' <em>host</em>' : ''}</li>`).join('')}</ul></div>
          <div class="bs__row">${host ? '<button type="button" class="bs__go" data-start>Deploy</button>' : '<span>Waiting for the host to deploy…</span>'}<button type="button" data-leave>Leave the room</button></div>` : `
          <div class="bs__row"><button type="button" class="bs__go" data-solo>Deploy with three bot soldiers</button></div>
          <div class="bs__row"><span>With friends</span><button type="button" data-make>Make a room</button><input data-code-in maxlength="5" placeholder="CODE" /><button type="button" data-join>Join</button></div>`}
        <p class="bs__note" data-note>${esc(note)}</p>
        <p class="bs__keys">Right-click move / attack · A + click attack-move · S stop · H hold · Q W E skills (at the cursor) · F medkit · B armoury · Space your soldier · wheel zoom · arrows or screen edge to look round</p>
      </div>`;
    for (const b of m.querySelectorAll('[data-cls]')) {
      b.onclick = () => {
        this.pick.cls = b.dataset.cls;
        try {
          localStorage.setItem('gamory.squad.class', this.pick.cls);
        } catch {
          /* private mode */
        }
        if (inRoom && !host) this.link.send({ t: 'bs-pick', cls: this.pick.cls });
        if (inRoom && host) this._hostLobby();
        else this._menu();
      };
    }
    for (const b of m.querySelectorAll('[data-diff]')) {
      b.onclick = () => {
        this.pick.difficulty = b.dataset.diff;
        if (inRoom) this._hostLobby();
        else this._menu();
      };
    }
    const $ = (q) => m.querySelector(q);
    for (const b of m.querySelectorAll('[data-swap]')) b.onclick = () => this.onSwap(b.dataset.swap);
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
    const name = this.account?.name ?? 'Soldier';
    link.on('bs-lobby', (msg) => {
      this.lobby = msg;
      if (!this.game && !this.mirror) this._menu();
    });
    link.on('bs-pick', (msg) => {
      if (!link.isHost) return;
      this.picks.set(msg.from, msg.cls);
      this._hostLobby();
    });
    link.on('bs-start', (msg) => this._guestStart(msg));
    link.on('bs-snap', (msg) => {
      if (link.isHost || !this.mirror) return;
      this.mirror.push(msg.s);
      this.pending.push(...(msg.s.ev ?? []));
    });
    link.on('bs-cmd', (msg) => {
      if (!link.isHost || !this.game) return;
      const slot = this.seatOf.get(msg.from);
      if (slot == null) return;
      if (!this.orders.has(slot)) this.orders.set(slot, []);
      this.orders.get(slot).push(msg.o);
    });
    link.on('peers', () => link.isHost && this._hostLobby());
    link.on('left', (id) => {
      // Someone left mid-game: a bot takes their soldier.
      const slot = this.seatOf?.get(id);
      if (slot != null && this.game) this.game.heroes[slot].bot = true;
      if (link.isHost) this._hostLobby();
    });
    link.on('closed', () => {
      this.link = null;
      this.lobby = null;
      this._menu('The room closed');
    });
    try {
      if (how === 'create') await link.create(name);
      else await link.join(code, name);
      this.picks = new Map([[link.id, this.pick.cls]]);
      if (link.isHost) this._hostLobby();
      else link.send({ t: 'bs-pick', cls: this.pick.cls });
      this._menu();
    } catch (e) {
      this.link = null;
      note(e?.message ?? 'Could not reach the room');
    }
  }

  _hostLobby() {
    const link = this.link;
    if (!link?.isHost) return;
    this.picks ??= new Map();
    this.picks.set(link.id, this.pick.cls);
    const people = link.peers().slice(0, SEATS).map((p) => ({ id: p.id, name: p.name, cls: this.picks.get(p.id) ?? 'rifleman' }));
    this.lobby = { people, difficulty: this.pick.difficulty };
    link.send({ t: 'bs-lobby', ...this.lobby });
    if (!this.game) this._menu();
  }

  /** The seats: the people first, then bots in the classes nobody took (a Medic first, if none). */
  _seats(people) {
    const seats = people.map((p) => ({ cls: p.cls, name: p.name, id: p.id }));
    const taken = new Set(seats.map((s) => s.cls));
    const want = ['medic', 'gunner', 'rifleman', 'engineer'].filter((c) => !taken.has(c));
    for (let i = seats.length; i < SEATS; i++) seats.push({ cls: want.shift() ?? CLASS_ORDER[i % 4], name: BOT_NAMES[i], bot: true });
    return seats;
  }

  startSolo() {
    this.link?.leave();
    this.link = null;
    const seats = this._seats([{ id: 'me', name: this.account?.name ?? 'You', cls: this.pick.cls }]);
    this._begin(new Game({ seats, difficulty: this.pick.difficulty, seed: (Math.random() * 2 ** 31) | 0 }), 0);
  }

  startRoom() {
    const link = this.link;
    if (!link?.isHost) return;
    const seats = this._seats(this.lobby.people);
    this.seatOf = new Map(seats.map((s, i) => [s.id, i]).filter(([id]) => id));
    const game = new Game({ seats, difficulty: this.pick.difficulty, seed: (Math.random() * 2 ** 31) | 0 });
    link.send({ t: 'bs-start', seats: seats.map((s, i) => ({ ...s, slot: i })) });
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
    this.$('[data-menu]').hidden = true;
    this.$('[data-hud]').hidden = false;
    this.$('[data-shop]').hidden = true;
    this.$('[data-banner]').hidden = true;
    this.state = null;
    this.follow = true;
    this.root.focus();
    this._sound();
  }

  /** Send an order for my soldier: straight in (alone or hosting), or to the host. */
  order(o) {
    if (this.game) {
      if (!this.orders.has(this.mySlot)) this.orders.set(this.mySlot, []);
      this.orders.get(this.mySlot).push(o);
    } else if (this.mirror && this.link) this.link.sendTo(this.link.session.host, { t: 'bs-cmd', o });
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
    on(stage, 'contextmenu', (e) => e.preventDefault());
    on(stage, 'mousemove', (e) => {
      const r = stage.getBoundingClientRect();
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
    });
    on(stage, 'mouseleave', () => (this.mouse.inside = false));
    on(stage, 'mousedown', (e) => {
      if (!this.state) return;
      const r = stage.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const ground = this.view.groundAt(px, py);
      if (!ground) return;
      if (e.button === 2) {
        const foe = this.view.pick(this.state, px, py, 'foe');
        if (foe) this.order({ t: 'attack', id: foe.i });
        else this.order({ t: 'move', x: ground.x, z: ground.z });
        this.view._ring(ground.x, ground.z, 0.8, foe ? '#ff5040' : '#7dffb0', 0.35);
        this.aimMode = null;
      } else if (e.button === 0 && this.aimMode === 'amove') {
        this.order({ t: 'amove', x: ground.x, z: ground.z });
        this.view._ring(ground.x, ground.z, 0.8, '#ffb040', 0.35);
        this.aimMode = null;
      }
      this.$('[data-aim]').hidden = !this.aimMode;
    });
    on(stage, 'wheel', (e) => {
      e.preventDefault();
      this.view.zoomBy(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
    on(window, 'keydown', (e) => {
      if (!this.root.isConnected || e.target?.matches?.('input')) return;
      if (!this.state) {
        if (e.key === 'Escape' && !this.$('[data-menu]').hidden) this.close();
        return;
      }
      const k = e.key.toLowerCase();
      this.keys.add(e.key);
      if (e.repeat) return;
      if (['q', 'w', 'e'].includes(k)) this._cast(['q', 'w', 'e'].indexOf(k));
      else if (k === 'a') {
        this.aimMode = 'amove';
        this.$('[data-aim]').hidden = false;
        this.$('[data-aim]').textContent = 'Attack-move: left-click where to go';
      } else if (k === 's') this.order({ t: 'stop' });
      else if (k === 'h') this.order({ t: 'hold' });
      else if (k === 'f') this.order({ t: 'medkit' });
      else if (k === 'b') this.toggleShop();
      else if (k === ' ') {
        e.preventDefault();
        this.follow = true;
      } else if (e.key === 'Escape') {
        this.aimMode = null;
        this.$('[data-aim]').hidden = true;
        this.toggleShop(false);
      }
    });
    on(window, 'keyup', (e) => this.keys.delete(e.key));
  }

  /** A skill, aimed where the cursor is (a Medic's Mend at the soldier under it, or themselves). */
  _cast(n) {
    const g = this.view.groundAt(this.mouse.x, this.mouse.y) ?? {};
    const def = CLASSES[this.me()?.cls]?.skills[n];
    if (!def) return;
    const ally = def.target === 'ally' ? this.view.pick(this.state, this.mouse.x, this.mouse.y, 'hero') : null;
    this.order({ t: 'skill', n, x: g.x, z: g.z, id: ally?.i });
  }

  me() {
    return this.state?.heroes[this.mySlot] ?? null;
  }

  toggleShop(open = this.$('[data-shop]').hidden) {
    this.$('[data-shop]').hidden = !open;
    this._shopKey = '';
  }

  _shop() {
    const me = this.me();
    if (!me) return;
    const key = `${me.credits}|${JSON.stringify(me.upg)}|${me.medkits}`;
    if (key === this._shopKey) return;
    this._shopKey = key;
    const shop = this.$('[data-shop]');
    shop.innerHTML = `<header><h2>Armoury</h2><span>${me.credits} credits</span><button type="button" data-shop-x>✕</button></header>
      ${Object.entries(UPGRADES).map(([k, u]) => {
        const lvl = me.upg[k];
        const cost = upgradeCost(k, lvl);
        const full = lvl >= u.max;
        return `<button type="button" data-buy="${k}" ${full || me.credits < cost ? 'disabled' : ''}><b>${esc(u.name)}</b><small>${esc(u.text)}</small><i>${'▮'.repeat(lvl)}${'▯'.repeat(u.max - lvl)}</i><em>${full ? 'full' : `${cost}`}</em></button>`;
      }).join('')}
      <button type="button" data-buy="medkit" ${me.medkits >= MEDKIT.carry || me.credits < MEDKIT.cost ? 'disabled' : ''}><b>Medkit</b><small>F heals half your health at once (carry ${MEDKIT.carry})</small><i>${'✚'.repeat(me.medkits)}</i><em>${MEDKIT.cost}</em></button>`;
    shop.querySelector('[data-shop-x]').onclick = () => this.toggleShop(false);
    for (const b of shop.querySelectorAll('[data-buy]')) b.onclick = () => this.order({ t: 'buy', key: b.dataset.buy });
  }

  /* -------------------------------------------------------------- frames */

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    let events = [];
    if (this.game) {
      // Fixed steps; orders go in with the first step after they came.
      this.acc += dt;
      while (this.acc >= TICK) {
        this.acc -= TICK;
        const ev = this.game.step(TICK, this.orders);
        this.orders = new Map();
        events.push(...ev);
        this.hostEvents.push(...ev);
      }
      this.state = this.game.snapshot();
      // Hosting: the others get the game ten times a second.
      this.sinceSnap += dt;
      if (this.link?.inRoom && this.sinceSnap >= 0.1) {
        this.sinceSnap = 0;
        this.link.send({ t: 'bs-snap', s: { ...this.state, ev: this.hostEvents.filter((e) => e.t !== 'hurt').slice(-200) } });
        this.hostEvents = [];
      }
    } else if (this.mirror) {
      const s = this.mirror.state(dt);
      if (s) this.state = s;
      events = this.pending.splice(0);
    } else {
      // The menu's backdrop.
      const ev = this.demo.step(dt);
      if (this.demo.over) this.demo = new Game({ difficulty: 'recruit', seed: (now | 0) + 1, seats: CLASS_ORDER.map((cls, i) => ({ cls, name: BOT_NAMES[i], bot: true })) });
      const s = this.demo.snapshot();
      this.view.absorb(ev, s);
      this.view.target.set(70 + Math.sin(now / 9000) * 14, 0, 74);
      this.view.render(s, dt);
      return;
    }
    if (!this.state) return;
    this._pan(dt);
    this.view.absorb(events, this.state);
    const mine = this.state.ents.find((e) => e.k === 'hero' && e.slot === this.mySlot);
    this.view.render(this.state, dt, { follow: this.follow ? mine : null });
    this.view.overlay(this.octx, this.state, this.mySlot);
    this._events(events);
    this._hud();
  }

  /** Arrow keys, or the cursor at the screen's edge, look round (and stop following your soldier). */
  _pan(dt) {
    const k = this.keys;
    let dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
    let dz = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
    if (this.mouse.inside && document.hasFocus()) {
      const edge = 14;
      if (this.mouse.x < edge) dx = -1;
      if (this.mouse.x > this.view.width - edge) dx = 1;
      if (this.mouse.y < edge) dz = -1;
      if (this.mouse.y > this.view.height - edge) dz = 1;
    }
    if (dx || dz) {
      this.follow = false;
      this.view.pan(dx * 40 * dt, dz * 40 * dt);
    }
  }

  _events(events) {
    const me = this.me();
    for (const e of events) {
      if (e.t === 'wave') this._banner(`Wave ${e.wave} of ${WAVES.length}`, e.boss ? `${FOES[e.boss].name} is coming` : 'They are climbing out of the rifts', 3);
      else if (e.t === 'cleared') this._banner(`Wave ${e.wave} held`, `+${e.bonus} credits each — B for the armoury`, 3);
      else if (e.t === 'boss') this._banner(FOES[e.kind].name, 'A boss is in the field', 3);
      else if (e.t === 'over') this._end(e);
      else if (e.t === 'down' && me && e.id === me.i) this._banner('You are down', 'A teammate can lift you — or wait for the next life', 3);
      else if (e.t === 'level' && me && e.id === me.i) this._banner(`Level ${e.level}`, 'Stronger, and more health', 1.6);
      if (e.t === 'shot' && this.audio) this._pop(e.sentry ? 0.04 : 0.06);
      if (e.t === 'blast' && this.audio) this._boom();
    }
  }

  _banner(title, text, seconds) {
    const b = this.$('[data-banner]');
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
    b.innerHTML = `<h2>${e.won ? 'Kestrel Outpost holds' : 'The outpost has fallen'}</h2>
      <p>${e.won ? `All ${WAVES.length} waves beaten on ${DIFFICULTY[s.difficulty]?.name ?? ''}.` : `${e.why === 'reactor' ? 'The reactor broke' : 'The whole squad fell'} after wave ${s.wave}.`}</p>
      <table><thead><tr><th>Soldier</th><th>Level</th><th>Kills</th><th>Healed</th></tr></thead><tbody>${s.heroes.map((h) => `<tr><td><i style="background:${CLASSES[h.cls].color}"></i>${esc(h.name)} <small>${CLASSES[h.cls].name}${h.bot ? ' · bot' : ''}</small></td><td>${h.level}</td><td>${h.kills}</td><td>${h.healed}</td></tr>`).join('')}</tbody></table>
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
    this.$('[data-wave]').innerHTML = s.phase === 'break'
      ? `<b>Next wave ${s.wave + 1}/${s.waves}</b><small>in ${Math.ceil(s.timer)} s — B for the armoury</small>`
      : `<b>Wave ${s.wave + 1}/${s.waves}</b><small>${s.left} left</small>`;
    this.$('[data-reactor]').style.width = `${(s.reactor.hp / s.reactor.max) * 100}%`;
    this.$('[data-lives]').innerHTML = `<small>Lives</small><b>${s.lives}</b>`;
    const boss = s.ents.find((e) => e.k === 'foe' && FOES[e.kind].boss);
    this.$('[data-boss]').hidden = !boss;
    if (boss) {
      this.$('[data-boss-name]').textContent = FOES[boss.kind].name;
      this.$('[data-boss-hp]').style.width = `${(boss.hp / boss.max) * 100}%`;
    }
    this.$('[data-squad]').innerHTML = s.heroes.map((h) => `<p class="${h.slot === this.mySlot ? 'is-me' : ''}${h.down ? ' is-down' : ''}"><i style="background:${CLASSES[h.cls].color}"></i><b>${esc(h.name)}</b><small>${CLASSES[h.cls].name} · ${h.level}${h.bot ? ' · bot' : ''}</small><span class="bs__bar"><i style="width:${Math.max(0, (h.hp / h.max) * 100)}%"></i></span></p>`).join('');
    if (me) {
      const def = CLASSES[me.cls];
      const key = `${me.hp}|${me.max}|${me.credits}|${me.cd.join()}|${me.medkits}|${me.level}|${me.xp}|${me.down}|${Object.keys(me.buffs).join()}`;
      if (key !== this._meKey) {
        this._meKey = key;
        this.$('[data-me]').innerHTML = `
          <div class="bs__who" style="--c:${def.color}"><b>${esc(def.name)}</b><small>Level ${me.level}</small></div>
          <div class="bs__stats">
            <div class="bs__bar bs__bar--hp"><i style="width:${Math.max(0, (me.hp / me.max) * 100)}%"></i><span>${Math.ceil(me.hp)} / ${me.max}</span></div>
            <div class="bs__bar bs__bar--xp"><i style="width:${(me.xp / me.next) * 100}%"></i></div>
            <p><b>${me.credits}</b> credits · ✚ ${me.medkits} (F)${Object.keys(me.buffs).length ? ` · <em>${Object.keys(me.buffs).join(' · ')}</em>` : ''}</p>
          </div>
          <div class="bs__skills">${def.skills.map((sk, n) => `<button type="button" data-skill="${n}" title="${esc(sk.text)}" class="${me.cd[n] > 0 ? 'is-cool' : ''}"><em>${sk.key}</em><b>${esc(sk.name)}</b>${me.cd[n] > 0 ? `<i>${Math.ceil(me.cd[n])}</i>` : ''}</button>`).join('')}<button type="button" data-open-shop><em>B</em><b>Armoury</b></button></div>`;
        for (const b of this.$('[data-me]').querySelectorAll('[data-skill]')) b.onclick = () => this._cast(Number(b.dataset.skill));
        this.$('[data-me]').querySelector('[data-open-shop]').onclick = () => this.toggleShop();
      }
    }
    if (!this.$('[data-shop]').hidden) this._shop();
    this._minimap();
  }

  /** The map: walls, rifts, the reactor, the dead in red, the squad in their colours, what the camera sees. */
  _minimap() {
    const c = this.$('[data-mini]');
    const g = c.getContext('2d');
    const k = c.width / SIZE;
    const s = this.state;
    g.fillStyle = '#1d1712';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#4a4f57';
    g.fillRect(50 * k, 50 * k, 40 * k, 40 * k);
    g.fillStyle = '#9aa0a8';
    for (const [x, z, w, d] of WALLS) g.fillRect(x * k, z * k, Math.max(2, w * k), Math.max(2, d * k));
    for (const r of RIFTS) {
      if (s.wave + 1 < r.from) continue;
      g.fillStyle = '#b060ff';
      g.beginPath();
      g.arc(r.x * k, r.z * k, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#5cd8ff';
    g.beginPath();
    g.arc(REACTOR_AT.x * k, REACTOR_AT.z * k, 6, 0, Math.PI * 2);
    g.fill();
    for (const e of s.ents) {
      if (e.k === 'foe') {
        g.fillStyle = FOES[e.kind].boss ? '#ffb020' : '#ff4a3a';
        const r = FOES[e.kind].boss ? 6 : 2.6;
        g.fillRect(e.x * k - r / 2, e.z * k - r / 2, r, r);
      } else if (e.k === 'sentry') {
        g.fillStyle = '#f5c518';
        g.fillRect(e.x * k - 3, e.z * k - 3, 6, 6);
      }
    }
    for (const e of s.ents) {
      if (e.k !== 'hero') continue;
      g.fillStyle = CLASSES[e.cls].color;
      g.strokeStyle = e.slot === this.mySlot ? '#ffffff' : '#000000';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(e.x * k, e.z * k, 6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // What the camera sees.
    const corners = [[0, 0], [this.view.width, 0], [this.view.width, this.view.height], [0, this.view.height]].map(([x, y]) => this.view.groundAt(x, y));
    if (corners.every(Boolean)) {
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
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
    if (!a || (this._lastPop && a.currentTime - this._lastPop < 0.03)) return;
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
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.35, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4);
    src.connect(f).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 0.4);
  }
}
