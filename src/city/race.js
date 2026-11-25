import * as THREE from 'three';
import { Session } from '../net/Session.js';
import { BIKE_COURSES, planCourse, locate, startOnBigRoad, isSmall } from './course.js';
import { bikeGap, closeCall, slipstream, NEAR_MISS } from './ride.js';
import { SCOOT, GRIP, newScoot, stepScoot, cornerSpeed } from './scoot.js';
import { SpeedFx, speedFeel, windNoise } from './speedfx.js';
import { ringBell } from './bell.js';
import { THROW, branchModel, throwPlan, flightAt, snapSound } from './branch.js';
import { CREW, CREW_ORDER, rider, botRiders } from './crew.js';
import { faceSvg } from '../snowpuff/riders.js';
import { PlushRider, sculptSpecies } from './plushRider.js';
import { RaceTraffic } from './traffic.js';
import { ITEMS, rollItem, ItemBoxes, itemIcon } from './items.js';
import { ComicFx } from './comic.js';
import { Golmok } from './golmok.js';
import { Facades } from './facades.js';
import { raceSky, TIME_PICKS, WEATHER_PICKS, WEATHERS } from './weather.js';
import { WetFx } from './wetfx.js';
import { modeHint } from './controls.js';
import { laneBand, laneShares, gridSlots, behindStart, lateralOf, bikeContact, resolveBump } from './pack.js';

/**
 * Gangnam Jarani: an electric-scooter race through Seoul's streets and
 * alleys, for four of Snowpuff Peaks' plush animals (plushRider.js) on hire
 * scooters (scooter.js, handling in scoot.js) in the real 3D city.
 * Alone against three bots, or up to four people in a room (by code, over
 * the party server), with bots in the empty seats.
 *
 * The streets stay open: cars, buses and delivery scooters keep to their
 * own side and cross at the junctions (traffic.js); people walk the
 * pavements and the alleys (life.js). Hit something square and you are off
 * the scooter — a tumble, dizzy stars, and back on a second and a half later;
 * met at a slant (a wall, a car's flank, a bin) it is only a scrape. Pass
 * close at speed and the boost gauge fills. Throttle (W, to 70 km/h), lean
 * (A D), brake (S), boost (Space, on the battery gauge), ring the bell
 * (Shift, or B), and use what the item boxes give you (1–3) — a branch thrown
 * into a rival's wheel among them (branch.js). Riders bump and wobble off
 * each other (pack.js); kerbs met at an angle are hopped, paving joints
 * rattle. Corners are marked with chevron boards, and anything standing in
 * your line ahead with a warning at the top of the screen.
 *
 * Each browser rides its own scooter (the host also rides the bots) and tells
 * the room where it is fifteen times a second; everyone plans the same
 * course from the same streets, and works out the order from what they hear.
 * Each race starts at a time of day and in weather of its own (random, or
 * picked in the menu), sent with the start so everyone has the same.
 */

const BOT_NAMES = ['Haneul', 'Doyun', 'Seoyeon', 'Jiho'];
const SEATS = 4;
/** The chase camera: how far back (m, plus a little with speed), its pitch, where it looks (m ahead, m up) and how far to the left it sits. */
export const CHASE = { zoom: 4.4, pitch: -0.36, ahead: 1.1, height: 0.72, side: 0.9 };
/** A rival nearer the camera than this (m) fades out (gone at the first, whole at the second). */
export const NEAR_FADE = [2.1, 3.3];

/**
 * How much of a rival to draw (0–1): fading as it comes within NEAR_FADE of the camera, or into
 * the line from the camera to you (within about a metre of it, on the camera's side of you).
 */
/** Whether a point is inside a vehicle in traffic (grown by `pad` m): its box on the ground, and its height. */
function inBox(v, x, y, z, pad) {
  const b = v.box;
  const dx = x - b.x;
  const dz = z - b.z;
  const along = Math.abs(-dx * Math.sin(b.heading) - dz * Math.cos(b.heading));
  const across = Math.abs(dx * Math.cos(b.heading) - dz * Math.sin(b.heading));
  const top = (v.y ?? 0) + (v.view?.size?.height ?? (v.kind === 'bus' ? 3.2 : 1.6)) + pad;
  return along < b.halfLength + pad && across < b.halfWidth + pad && y < top;
}

export function nearFade(cam, rival, me) {
  const dx = rival.x - cam.x, dy = rival.y - cam.y, dz = rival.z - cam.z;
  const d = Math.hypot(dx, dy, dz);
  const fx = me.x - cam.x, fy = me.y - cam.y, fz = me.z - cam.z;
  const ff = fx * fx + fy * fy + fz * fz;
  const t = ff > 0 ? (dx * fx + dy * fy + dz * fz) / ff : 1;
  // (a rival behind you, down in a corner of the frame, fades from a little further off)
  const [a, b] = t < 0.9 ? [NEAR_FADE[0] + 0.5, NEAR_FADE[1] + 1] : NEAR_FADE;
  let k = Math.min(1, Math.max(0, (d - a) / (b - a)));
  if (t > 0 && t < 0.85) {
    const lat = Math.hypot(dx - fx * t, dy - fy * t, dz - fz * t);
    k = Math.min(k, Math.min(1, Math.max(0, (lat - 0.75) / 0.6)));
  }
  return k;
}
const SEND_EVERY = 1 / 15;
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (t) => (t == null || !Number.isFinite(t) ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`);
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;
const heading = (p, q) => Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
/** A crash: the tumble, then sitting dazed and getting up, then back on — seconds. */
const TUMBLE = 0.7;
/** How fast (m/s) a head-on wall knocks you off: about 30 km/h; slower is a bonk and a stop. */
const WALL_FALL = 8.3;
const DOWN = 1.55;

export { botRiders };

export class Race {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.racers = [];
    this.course = null;
    this.phase = 'off'; // off · menu · lobby · grid · racing · done
    this.laps = 1;
    this.courseId = BIKE_COURSES[0].id;
    this.time = 'random';
    this.weatherPick = 'random';
    this.plans = new Map();
    this.char = 'bunny';
    try {
      const saved = localStorage.getItem('gamory.jarani.rider');
      if (CREW[saved]) this.char = saved;
    } catch {
      /* private mode */
    }
    this.picks = new Map();
    this._hud();
  }

  _saveChar() {
    try {
      localStorage.setItem('gamory.jarani.rider', this.char);
    } catch {
      /* private mode */
    }
    if (this.session?.room) {
      if (this.session.isHost) this.picks.set(this.session.id, this.char);
      else this.session.send({ t: 'race-pick', char: this.char });
    }
  }

  /* ----------------------------------------------------------- screens */

  _hud() {
    const root = this.g.root;
    const el = (cls, tag = 'div') => {
      const n = document.createElement(tag);
      n.className = cls;
      n.hidden = true;
      root.append(n);
      return n;
    };
    this.menuEl = el('race__menu');
    this.mapEl = el('race__map', 'canvas');
    this.mapEl.width = this.mapEl.height = 440;
    this.turnEl = el('race__turn');
    this.posEl = el('race__pos');
    this.lapEl = el('race__lap');
    this.boardEl = el('race__board');
    this.speedEl = el('race__speed');
    this.timeEl = el('race__time');
    this.itemsEl = el('race__items');
    this.countEl = el('race__count');
    this.msgEl = el('race__msg');
    this.linesEl = el('race__lines');
    this.resultEl = el('race__results');
    this.pauseEl = el('race__pause');
    this.hintEl = el('race__hint');
    this.warnEl = el('race__warn');
  }

  _show(on) {
    for (const n of [this.mapEl, this.posEl, this.lapEl, this.boardEl, this.speedEl, this.timeEl, this.itemsEl]) n.hidden = !on;
    if (!on) {
      this.turnEl.hidden = true;
      this.linesEl.hidden = true;
    }
    this.g.root.classList.toggle('is-racing', on);
  }

  /** The race menu: a course, a rider, laps, the time and weather, alone or together. */
  menu(note = '') {
    this.phase = this.session?.room ? 'lobby' : 'menu';
    this._show(false);
    this.resultEl.hidden = true;
    const s = this.session;
    const host = !s?.room || s.isHost;
    const m = this.menuEl;
    m.hidden = false;
    const bar = (name, v) => `<span class="race__stat"><small>${name}</small><i><b style="width:${Math.round(Math.max(0.08, Math.min(1, v)) * 100)}%"></b></i></span>`;
    const stats = (c) => {
      const sp = { ...SCOOT, ...c.spec };
      return bar('Speed', (sp.boostTop - 22.8) / 2.4 + 0.2) + bar('Pick-up', (sp.accel - 5.4) / 1.8) + bar('Handling', (sp.maxLean * sp.leanRate - 2.6) / 1.6) + bar('Grip', (sp.grip ?? 1) - 0.4);
    };
    // Portraits: each plush face, drawn small.
    this._portraits ??= new Map(CREW_ORDER.map((id) => [id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(faceSvg(id, 132).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`]));
    const len = (id) => {
      const c = this.plans.get(id);
      return c ? `${(c.length / 1000).toFixed(1)} km · ${Math.round((c.points.filter((p) => isSmall(p[3] ?? 4)).length / c.points.length) * 100)}% alleys` : '';
    };
    m.innerHTML = `
      <header><h2>🛴 Gangnam Jarani</h2><button type="button" data-race-x aria-label="Close">✕</button></header>
      <p class="race__lead">Snowpuff's plush friends race electric scooters through Seoul's real streets and alleys — and the streets are open: weave through cars, buses, delivery scooters and people. Throttle with <b>W</b> to 70 km/h, lean with <b>A D</b>, boost with <b>Space</b> while the battery gauge lasts, ring your bell with <b>Shift</b>, grab item boxes and use them with <b>1 2 3</b> — a branch in a rival's front wheel sends them over the bars. Pass close to traffic to charge your boost; glance off a wall and you scrape, hit something square and you're off.</p>
      <div class="race__courses">${BIKE_COURSES.map((c) => `<button type="button" data-course="${c.id}" class="${c.id === this.courseId ? 'is-on' : ''}" ${host ? '' : 'disabled'}><b>${esc(c.name)}</b><span>${esc(c.ko)}</span><small>${esc(c.text)}</small><em data-len="${c.id}">${len(c.id)}</em></button>`).join('')}</div>
      <h3 class="race__label">Your rider</h3>
      <div class="race__garage">${CREW_ORDER.map((id) => {
        const c = rider(id);
        return `<button type="button" data-char="${id}" class="${this.char === id ? 'is-on' : ''}"><img src="${this._portraits.get(id)}" alt="" /><b>${esc(c.name)} <span>${esc(c.ko)}</span></b><small>${esc(c.text)}</small>${stats(c)}</button>`;
      }).join('')}</div>
      <div class="race__row"><span>Laps</span>${[1, 2, 3].map((n) => `<button type="button" data-laps="${n}" class="${n === this.laps ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      <div class="race__row"><span>Time</span>${Object.entries(TIME_PICKS).map(([k, t]) => `<button type="button" data-time="${k}" class="${k === this.time ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${t.icon} ${t.name}</button>`).join('')}</div>
      <div class="race__row"><span>Weather</span>${WEATHER_PICKS.map((k) => `<button type="button" data-weather="${k}" class="${k === this.weatherPick ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${k === 'random' ? '🎲 Random' : `${WEATHERS[k].icon} ${WEATHERS[k].name}`}</button>`).join('')}</div>
      ${s?.room ? `
        <div class="race__room"><b>Room <span data-race-code>${esc(s.room)}</span></b> — give friends this code (up to four). Bots take any empty seats.
          <ul>${[...s.peers.values()].map((p) => { const pick = p.id === s.id ? this.char : this.picks.get(p.id); return `<li>${pick ? `<img src="${this._portraits.get(pick)}" alt="" />` : ''}${esc(p.name)}${pick ? ` — ${esc(rider(pick).name)}` : ''}${p.id === s.host ? ' <em>host</em>' : ''}${p.id === s.id ? ' <em>you</em>' : ''}</li>`; }).join('')}</ul>
        </div>
        <div class="race__row">${host ? '<button type="button" class="race__go" data-race-start>Start the race</button>' : '<span>Waiting for the host to start…</span>'}<button type="button" data-race-leave>Leave the room</button></div>` : `
        <div class="race__row"><button type="button" class="race__go" data-race-solo>Race three bots</button></div>
        <div class="race__row race__together"><span>With friends</span><button type="button" data-race-make>Make a room</button><input data-race-code-in maxlength="5" placeholder="CODE" /><button type="button" data-race-join>Join</button></div>`}
      <p class="race__note" data-race-note>${esc(note)}</p>
      <p class="race__keys">W throttle · S brake · A D lean · Space boost · Shift bell · 1 2 3 items · R back on the course · Esc pause · H how to play <button type="button" class="race__credits" data-race-credits>ⓒ Credits</button></p>`;
    const $ = (q) => m.querySelector(q);
    $('[data-race-x]').onclick = () => this.quit();
    $('[data-race-credits]').onclick = () => this.g.toggleCredits(true);
    for (const b of m.querySelectorAll('[data-course]')) b.onclick = () => this._setup({ course: b.dataset.course });
    for (const b of m.querySelectorAll('[data-laps]')) b.onclick = () => this._setup({ laps: Number(b.dataset.laps) });
    for (const b of m.querySelectorAll('[data-time]')) b.onclick = () => this._setup({ time: b.dataset.time });
    for (const b of m.querySelectorAll('[data-weather]')) b.onclick = () => this._setup({ weather: b.dataset.weather });
    for (const b of m.querySelectorAll('[data-char]')) b.onclick = () => {
      this.char = b.dataset.char;
      this._saveChar();
      this.menu();
    };
    if ($('[data-race-solo]')) $('[data-race-solo]').onclick = () => this.startSolo();
    if ($('[data-race-make]')) $('[data-race-make]').onclick = () => this._room('create');
    if ($('[data-race-join]')) {
      const join = () => this._room('join', $('[data-race-code-in]').value.trim().toUpperCase());
      $('[data-race-join]').onclick = join;
      $('[data-race-code-in]').onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') join();
      };
    }
    if ($('[data-race-start]')) $('[data-race-start]').onclick = () => this.startRoom();
    if ($('[data-race-leave]')) $('[data-race-leave]').onclick = () => this._leaveRoom();
    // Plan the courses (and say how long) while the menu is up, one at a time.
    clearTimeout(this._planT);
    const todo = BIKE_COURSES.filter((c) => !this.plans.has(c.id));
    const next = () => {
      const c = todo.shift();
      if (!c || this.phase === 'off') return;
      this._plan(c.id);
      this._planT = setTimeout(next, 30);
    };
    this._planT = setTimeout(next, 50);
  }

  _note(text) {
    const n = this.menuEl.querySelector('[data-race-note]');
    if (n) n.textContent = text;
  }

  _setup({ course = this.courseId, laps = this.laps, time = this.time, weather = this.weatherPick }) {
    Object.assign(this, { courseId: course, laps, time, weatherPick: weather });
    if (this.session?.room && this.session.isHost) this.session.send({ t: 'race-setup', course, laps, time, weather });
    this.menu();
  }

  /** The roads and small streets near a course. */
  _roadsNear(def, reach) {
    const roads = [];
    for (const list of this.g.roadTiles?.values() ?? []) for (const r of list) if (Math.abs(r.pts[0] - def.x) < reach && Math.abs(r.pts[1] - def.z) < reach) roads.push(r);
    return roads;
  }

  /** A course, planned once on the real streets (and started where a grid of four fits). */
  _plan(id) {
    if (this.plans.has(id)) return this.plans.get(id);
    const def = BIKE_COURSES.find((c) => c.id === id);
    if (!def || !this.g.roadTiles) return null;
    let c = planCourse(this._roadsNear(def, def.r * 4), def, { bike: true });
    // Without the small streets (or where they are thin), a wider loop on the big roads.
    if (!c) c = planCourse(this._roadsNear(def, def.r * 8), { ...def, r: def.r * 1.8 }, { bike: true, target: 2600 });
    if (!c) return null;
    c = startOnBigRoad(c);
    c.def = def;
    this.plans.set(id, c);
    const el = this.menuEl.querySelector(`[data-len="${id}"]`);
    if (el) el.textContent = `${(c.length / 1000).toFixed(1)} km · ${Math.round((c.points.filter((p) => isSmall(p[3] ?? 4)).length / c.points.length) * 100)}% alleys`;
    return c;
  }

  /* -------------------------------------------------------- the room */

  async _room(how, code) {
    if (how === 'join' && (!code || code.length !== 5)) return this._note('A room code has five letters');
    this._note('Connecting…');
    this.session?.close();
    const s = new Session();
    this.session = s;
    const name = this.g.account?.name ?? 'Rider';
    s.on('message', (msg) => this._heard(msg));
    this.picks = new Map();
    s.on('peer', () => this.phase === 'lobby' && this.menu());
    s.on('left', (id) => {
      const r = this.racers.find((x) => x.owner === id);
      if (r && this.phase !== 'lobby') {
        r.left = true;
        r.view.root.visible = false;
      }
      if (this.phase === 'lobby') this.menu();
    });
    s.on('closed', () => this._roomGone('The host closed the room'));
    s.on('disconnected', () => this._roomGone('The connection to the room was lost'));
    try {
      await (how === 'create' ? s.create(name) : s.join(code, name));
      this._saveChar();
      this.menu();
    } catch (e) {
      this.session = null;
      this._note(e?.message ?? 'Could not reach the room');
    }
  }

  _roomGone(text) {
    if (!this.session) return;
    this.session = null;
    this._end();
    this.menu(text);
  }

  _leaveRoom() {
    const s = this.session;
    this.session = null;
    s?.close();
    this.menu();
  }

  _heard(msg) {
    if (msg.t === 'race-pick' && this.session?.isHost && CREW[msg.char]) {
      this.picks.set(msg.from, msg.char);
      // Everyone in the lobby sees who picked whom.
      this.session.send({ t: 'race-picks', picks: [...this.picks] });
      if (this.phase === 'lobby') this.menu();
      return;
    }
    const fromHost = msg.from === this.session?.host;
    if (msg.t === 'race-picks' && fromHost) {
      for (const [id, c] of msg.picks ?? []) if (CREW[c] && id !== this.session.id) this.picks.set(id, c);
      if (this.phase === 'lobby') this.menu();
    } else if (msg.t === 'race-setup' && fromHost) {
      Object.assign(this, { courseId: msg.course, laps: msg.laps, time: msg.time ?? 'random', weatherPick: msg.weather ?? 'random' });
      if (this.phase === 'lobby') this.menu();
    } else if (msg.t === 'race-go' && fromHost) {
      this.courseId = msg.course;
      this.laps = msg.laps;
      this._begin(msg.grid, msg.sky);
    } else if (msg.t === 'race-bikes') {
      for (const [id, x, z, hd, v, lean, y, dist, done, best, roll, flags, mode, crashes, misses] of msg.bikes) {
        const r = this.racers.find((q) => q.id === id);
        if (!r || r.owner === this.session?.id) continue;
        Object.assign(r, { net: { x, z, heading: hd, y }, dist, done: done < 0 ? null : done, best: best < 0 ? null : best, crashes, misses });
        Object.assign(r.s, { v, lean, roll, boosting: Boolean(flags & 1), throttle: Boolean(flags & 2), braking: Boolean(flags & 4) });
        r.helmet = Boolean(flags & 8);
        r.tailwind = flags & 16 ? 1 : 0;
        if (mode !== r.mode) {
          r.mode = mode;
          r.crashT = 0;
          if (mode === 'tumble') this._crashFx(r);
        }
      }
    } else if (msg.t === 'race-branch') {
      const r = this.racers.find((q) => q.id === msg.id);
      if (r && r.owner !== this.session?.id && !this.branches?.some((b) => b.bid === msg.bid)) this._addBranch(r, msg.plan, msg.bid, msg.drop);
    } else if (msg.t === 'race-branch-gone') {
      const b = this.branches?.find((q) => q.bid === msg.bid);
      const v = this.racers.find((q) => q.id === msg.by);
      if (v && msg.fell) v.fallKind = 'wheel';
      if (b) this._snapBranch(b, v);
    } else if (msg.t === 'race-bell') {
      const r = this.racers.find((q) => q.id === msg.id);
      if (r && r.owner !== this.session?.id) this.ringBell(r, true);
    } else if (msg.t === 'race-item') {
      const r = this.racers.find((q) => q.id === msg.id);
      if (r && r.owner !== this.session?.id) this._itemFx(r, msg.item);
    }
  }

  /* ----------------------------------------------------------- races */

  startSolo() {
    this.session?.close();
    this.session = null;
    const grid = [{ id: 'me', name: this.g.account?.name ?? 'You', owner: 'me', char: this.char }];
    botRiders(this.char, SEATS - 1).forEach((c, i) => grid.push({ id: `bot${i}`, name: BOT_NAMES[i], owner: 'me', bot: true, skill: 0.88 + i * 0.045, char: c }));
    this.myId = 'me';
    this._begin(grid, raceSky(this.time, this.weatherPick));
  }

  startRoom() {
    const s = this.session;
    if (!s?.isHost) return;
    const people = [...s.peers.values()].slice(0, SEATS);
    this.picks.set(s.id, this.char);
    const grid = people.map((p) => ({ id: p.id, name: p.name, owner: p.id, char: this.picks.get(p.id) ?? 'fox' }));
    const bots = botRiders(grid[0]?.char ?? this.char, CREW_ORDER.length - 1).filter((c) => !grid.some((g) => g.char === c));
    for (let i = grid.length; i < SEATS; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i - 1] ?? 'Bot', owner: s.id, bot: true, skill: 0.9 + i * 0.03, char: bots.shift() ?? CREW_ORDER[i % CREW_ORDER.length] });
    const sky = raceSky(this.time, this.weatherPick);
    s.send({ t: 'race-go', course: this.courseId, laps: this.laps, grid, sky });
    this._begin(grid, sky);
  }

  /**
   * Sculpt each species once (a moment the first time; the bodies are kept for
   * the next race), a few at a time so the page keeps breathing.
   */
  async _sculpt(ids) {
    const todo = [...new Set(ids)].filter((id) => !this._sculpted?.has(id));
    if (!todo.length) return;
    this._note('Getting the riders ready…');
    this._sculpted ??= new Set();
    for (const id of todo) {
      await new Promise((ok) => setTimeout(ok, 0));
      sculptSpecies(id, 96);
      this._sculpted.add(id);
    }
  }

  /** Line the grid up behind the line, set the sky, and count down. */
  async _begin(grid, sky) {
    const course = this._plan(this.courseId);
    if (!course) return this._note('That course could not be planned here — try another');
    // The riders (sculpted the first time); a rider picked twice rides a scooter in other colours.
    const used = new Map();
    const looks = grid.map((g, i) => {
      const char = CREW[g.char] ? g.char : CREW_ORDER[i % CREW_ORDER.length];
      const twice = used.get(char) ?? 0;
      used.set(char, twice + 1);
      return { char, twice };
    });
    await this._sculpt(looks.map((l) => l.char));
    if (this._starting === grid) return;
    this._starting = grid;
    this._end();
    this.course = course;
    this.myId = this.session?.id ?? 'me';
    this.menuEl.hidden = true;
    this.resultEl.hidden = true;
    this._show(true);
    this.g.street?.hide();
    this.sky = sky ?? raceSky('random', 'random');
    this.g.raceSky?.(this.sky.hour, this.sky.weather);
    const n = course.points.length;
    // A staggered grid, two across on the right-hand side of the road; you start in the second row,
    // with riders beside and ahead of you.
    const slots = gridSlots(grid.length);
    const order = grid.map((_, i) => i);
    const mine = grid.findIndex((g) => g.id === this.myId || (this.myId === 'me' && g.id === 'me'));
    if (mine >= 0 && grid.length > 2 && !this.session?.room) [order[mine], order[2]] = [order[2], order[mine]];
    const shares = laneShares(grid.length);
    this.racers = grid.map((g, i) => {
      const slot = slots[order.indexOf(i)];
      const at = behindStart(course, slot.back);
      const band = laneBand(at.width, isSmall(at.cls), false, at.oneway);
      const side = band.lo + (band.hi - band.lo) * (slot.col ? 0.78 : 0.3);
      const hd = at.heading;
      const back = at.i;
      const x = at.x + Math.cos(hd) * side;
      const z = at.z - Math.sin(hd) * side;
      const { char, twice } = looks[i];
      const ch = rider(char);
      const body = twice ? '#2b2d33' : ch.scooter;
      const view = new PlushRider(char, { body, trim: twice ? ch.scooter : ch.trim, screen: g.id === this.myId, fur: 10 });
      this.g.scene.add(view.root);
      return {
        ...g,
        char,
        ch,
        color: body,
        spec: { ...SCOOT, ...ch.spec },
        view,
        mine: g.owner === this.myId,
        me: g.id === this.myId,
        s: newScoot(x, z, hd),
        y: this.g.surfaceAt(x, z),
        idx: back,
        dist: course.s[back] - course.length,
        laneK: shares[i],
        lat: side,
        wobble: 0,
        lapsDone: 0,
        lapStart: 0,
        lapTimes: [],
        best: null,
        done: null,
        items: [null, null, null],
        helmet: false,
        tailwind: 0,
        mode: 'ride',
        crashT: 0,
        safe: 0,
        crashes: 0,
        misses: 0,
        stuck: 0,
        net: null
      };
    });
    this.me = this.racers.find((r) => r.me);
    this.fx = new ComicFx(this.g.scene);
    this.traffic = new RaceTraffic(this.g, this);
    this.boxes = new ItemBoxes(this.g, course);
    this.golmok = new Golmok(this.g, course);
    this.facades = new Facades(this.g, course);
    this.wet = new WetFx(this.g);
    this.speedFx = new SpeedFx(this.g.scene);
    this._decor();
    this.phase = 'grid';
    this.count = 3.99;
    this.clock = 0;
    this.sent = 0;
    this.stop = 0;
    this.g.setMode('race');
    this.g.zoom = CHASE.zoom;
    this.g.yaw = this.me.s.heading;
    this.g.pitch = CHASE.pitch;
    // (Every rider able to fade once, while the lights count down: no stall when one first comes close.)
    for (const r of this.racers) if (!r.me) r.view.fade(0.999);
    this._renderItems();
    this._starting = null;
  }

  /** The course on the road: arrows along it, a banner over the start, fans at the line. */
  _decor() {
    this.decor = new THREE.Group();
    const c = this.course;
    const n = c.points.length;
    const chev = new THREE.Shape();
    chev.moveTo(-0.7, -0.3);
    chev.lineTo(0, 0.35);
    chev.lineTo(0.7, -0.3);
    chev.lineTo(0.7, -0.62);
    chev.lineTo(0, 0.02);
    chev.lineTo(-0.7, -0.62);
    chev.closePath();
    const geo = new THREE.ShapeGeometry(chev).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 });
    const every = 3; // an arrow every 18 m
    const count = Math.floor(n / every);
    this.chevrons = new THREE.InstancedMesh(geo, mat, count);
    this.chevrons.frustumCulled = false;
    this.chevrons.userData.at = [];
    for (let k = 0; k < count; k++) {
      const i = k * every;
      const p = c.points[i];
      const q = c.points[(i + 1) % n];
      this.chevrons.userData.at.push({ x: p[0], z: p[1], heading: heading(p, q) });
    }
    this._lift(true);
    this.decor.add(this.chevrons);
    const p = c.points[0];
    const q = c.points[1];
    const w = Math.max(6, (p[2] ?? 8) + 2);
    const gate = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.6, roughness: 0.4 });
    for (const sx of [-w / 2, w / 2]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), post);
      m.position.set(sx, 2.5, 0);
      gate.add(m);
    }
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 64;
    const g = cv.getContext('2d');
    for (let x = 0; x < 512; x += 32) for (let y = 0; y < 64; y += 32) {
      g.fillStyle = (x + y) % 64 ? '#111' : '#f5f5f5';
      g.fillRect(x, y, 32, 32);
    }
    g.fillStyle = '#ffd23a';
    g.fillRect(118, 6, 276, 52);
    g.strokeStyle = '#1a1222';
    g.lineWidth = 5;
    g.strokeRect(118, 6, 276, 52);
    g.fillStyle = '#1a1222';
    g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('START · 출발', 256, 33);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.y = 4.4;
    gate.add(banner);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -8 }));
    line.position.y = 0.05;
    gate.add(line);
    gate.position.set(p[0], this.g.surfaceAt(p[0], p[1]), p[1]);
    gate.rotation.y = heading(p, q);
    this.gate = gate;
    this.decor.add(gate);
    this._turns();
    this._cornerBoards();
    this.g.scene.add(this.decor);
    this.fans = [];
    if (this.g.life) {
      const hd = heading(p, q);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 6; k++) {
          const along = (k - 2.5) * 1.1;
          const off = w / 2 + 0.8 + (k % 2) * 0.6;
          const x = p[0] - Math.sin(hd) * along + Math.cos(hd) * side * off;
          const z = p[1] - Math.cos(hd) * along - Math.sin(hd) * side * off;
          if (this.g.buildingAt?.(x, z)) continue;
          this.fans.push(this.g.life.addFan({ x, y: this.g.surfaceAt(x, z) + 0.14, z, heading: hd + (side > 0 ? Math.PI / 2 : -Math.PI / 2) }));
        }
      }
    }
  }

  /** The course's turns: where it bends (over 30 m) by more than about 30°, and which way. */
  _turns() {
    const pts = this.course.points;
    const n = pts.length;
    const dir = (i, j) => heading(pts[((i % n) + n) % n], pts[((j % n) + n) % n]);
    const bendAt = (i) => turn(dir(i - 3, i), dir(i, i + 3));
    this.turnsList = [];
    let run = null;
    for (let i = 0; i <= n; i++) {
      const b = i < n ? bendAt(i) : 0;
      if (Math.abs(b) > 0.5 && i < n) {
        if (!run || Math.sign(b) !== Math.sign(run.bend)) {
          if (run) this.turnsList.push(run);
          run = { at: i, bend: b, from: i };
        } else if (Math.abs(b) > Math.abs(run.bend)) Object.assign(run, { at: i, bend: b });
      } else if (run) {
        this.turnsList.push(run);
        run = null;
      }
    }
    for (const t of this.turnsList) t.total = Math.abs(turn(dir(t.from - 4, t.from), dir(t.at + 3, t.at + 6)));
  }

  /**
   * Chevron boards at the corners, like a race track's: black, with bright yellow arrows the way
   * the course turns, glowing a little (reflective), standing across the end of each sharp corner's
   * approach — the wall you would ride into is marked from a hundred metres off.
   */
  _cornerBoards() {
    const pts = this.course.points;
    const n = pts.length;
    const at = (i) => pts[((i % n) + n) % n];
    const tex = (left) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 96;
      const g = c.getContext('2d');
      g.fillStyle = '#121214';
      g.fillRect(0, 0, 256, 96);
      g.fillStyle = '#ffd21a';
      for (let k = 0; k < 3; k++) {
        const x = 40 + k * 72;
        g.beginPath();
        const d = left ? -1 : 1;
        g.moveTo(x - 22 * d, 12);
        g.lineTo(x + 26 * d, 48);
        g.lineTo(x - 22 * d, 84);
        g.lineTo(x - 2 * d, 84);
        g.lineTo(x + 46 * d, 48);
        g.lineTo(x - 2 * d, 12);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = '#f2f2f2';
      g.lineWidth = 6;
      g.strokeRect(3, 3, 250, 90);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    this._boardTex = [tex(true), tex(false)];
    const mats = this._boardTex.map((map) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.55, roughness: 0.5 }));
    const post = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5, metalness: 0.4 });
    this.boards = [];
    for (const t of this.turnsList ?? []) {
      if (t.total < 0.9) continue;
      const left = t.bend > 0;
      const a = at(t.from - 3);
      const b = at(t.from);
      const h = heading(a, b);
      const fx = -Math.sin(h);
      const fz = -Math.cos(h);
      const apex = at(t.at);
      const wNext = at(t.at + 3)[2] ?? 6;
      const wIn = b[2] ?? 6;
      // across the far side of the junction, a little to the outside of the turn
      const out = left ? 1 : -1;
      const x = apex[0] + fx * (wNext / 2 + 0.9) + Math.cos(h) * out * wIn * 0.2;
      const z = apex[1] + fz * (wNext / 2 + 0.9) - Math.sin(h) * out * wIn * 0.2;
      const board = new THREE.Group();
      const face = new THREE.Mesh(this._boardGeo ??= new THREE.PlaneGeometry(2.4, 0.9), mats[left ? 0 : 1]);
      face.position.y = 1.35;
      board.add(face);
      for (const sx of [-0.95, 0.95]) {
        const p = new THREE.Mesh(this._postGeo ??= new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6).translate(0, 0.675, 0), post);
        p.position.x = sx;
        board.add(p);
      }
      // facing back down the approach
      board.rotation.y = h;
      board.position.set(x, this.g.surfaceAt(x, z), z);
      board.userData.at = { x, z };
      this.decor.add(board);
      this.boards.push(board);
    }
    this._boardMats = mats;
  }

  /** The next turn ahead of a racer: { left, sharp, metres, alley } within 120 m, or null. */
  _nextTurn(r) {
    const c = this.course;
    let best = null;
    for (const t of this.turnsList ?? []) {
      let d = c.s[t.from] - c.s[r.idx];
      if (d < -10) d += c.length;
      if (d < -10 || d > 120) continue;
      if (!best || d < best.metres) best = { left: t.bend > 0, sharp: t.total > 1.3, metres: Math.max(0, d), alley: isSmall(c.points[t.at][3] ?? 4) };
    }
    return best;
  }

  /** Sit the arrows on the road near you (roads load as you go). */
  _lift(all = false) {
    const m = this.chevrons;
    if (!m) return;
    const p = this.g.pos;
    const o = new THREE.Object3D();
    m.userData.at.forEach((a, k) => {
      if (!all && Math.hypot(a.x - p.x, a.z - p.z) > 220) return;
      o.position.set(a.x, this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14) + 0.06, a.z);
      o.rotation.set(0, a.heading, 0);
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    for (const b of this.boards ?? []) {
      const a = b.userData.at;
      if (all || Math.hypot(a.x - p.x, a.z - p.z) < 220) b.position.y = this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14);
    }
    if (this.gate && (all || Math.hypot(this.gate.position.x - p.x, this.gate.position.z - p.z) < 200)) this.gate.position.y = this.g.surfaceAt(this.gate.position.x, this.gate.position.z, this.g.groundAt(this.gate.position.x, this.gate.position.z) + 14);
  }

  /* ---------------------------------------------------------- a frame */

  update(rawDt) {
    if (!this.course || this.phase === 'menu' || this.phase === 'lobby' || this.phase === 'off') return;
    // Paused: the race stands still (in a room with friends it can't: your rider just coasts).
    if (this.paused && !this.session?.room) return;
    // Hit-stop: a crash freezes the world for a beat.
    let dt = rawDt;
    if (this.stop > 0) {
      this.stop -= rawDt;
      dt = rawDt * 0.06;
    }
    const k = this.g.keys;
    const key = (...codes) => codes.some((c) => k.has(c));
    if (this.phase === 'grid') {
      const was = Math.ceil(this.count);
      this.count -= dt;
      const now = Math.ceil(this.count);
      this.countEl.hidden = false;
      this.countEl.textContent = this.count > 0 ? String(now) : 'GO!';
      this.countEl.classList.toggle('is-go', this.count <= 0);
      // The keys, while the lights count down (from the same table How to play lists).
      if (this.hintEl.hidden) {
        this.hintEl.textContent = modeHint('race');
        this.hintEl.hidden = false;
      }
      if (was !== now) this._beep(now > 0 ? 520 : 1040);
      if (this.count <= 0) {
        this.phase = 'racing';
        this.clock = 0;
        for (const r of this.racers) r.lapStart = 0;
      }
    } else if (this.count > -0.8) {
      this.count -= dt;
      if (this.count <= -0.8) {
        this.countEl.hidden = true;
        this.hintEl.hidden = true;
      }
    }
    const racing = this.phase === 'racing' || this.phase === 'done';
    if (racing) this.clock += dt;
    const grip = this._grip();
    for (const r of this.racers) {
      if (r.left) continue;
      r.safe = Math.max(0, r.safe - dt);
      r.branchSafe = Math.max(0, (r.branchSafe ?? 0) - dt);
      if (r.throwT != null) {
        r.throwT += dt;
        if (r.throwT > 0.5) r.throwT = null;
      }
      r.tailwind = Math.max(0, r.tailwind - dt);
      if (r.mine) {
        if (r.mode !== 'ride') {
          this._down(r, dt);
          if (r.me) this._wind?.set(0);
          continue;
        }
        let input = {};
        if (racing && r.done == null) {
          // (autopilot: the bot's riding for you — the end-to-end checks use it.)
          if (r.me && this.paused) input = {};
          else if (r.me && !this.autopilot) input = { throttle: key('KeyW', 'ArrowUp'), brake: key('KeyS', 'ArrowDown'), left: key('KeyA', 'ArrowLeft'), right: key('KeyD', 'ArrowRight'), boost: key('Space') || this.sprintTap };
          else input = this._bot(r, dt);
        } else if (r.done != null) input = { throttle: r.s.v < 2, brake: r.s.v > 3 };
        if (r.me) this.sprintTap = false;
        input.grip = Math.min(1.05, grip * (r.spec.grip ?? 1));
        input.free = r.tailwind > 0;
        input.extra = r.tailwind > 0 ? 0.9 : 0;
        input.grade = this._grade(r);
        input.draft = this._draft(r);
        input.surface = this._surface(r);
        input.kerb = this._kerb(r);
        const out = stepScoot(r.s, input, dt, (x, z) => this._blocked(r, x, z), r.spec);
        r.landed = out.landed;
        if (out.kerb === 'hop' && r.me) this.g.street?._thud?.(0.25);
        if (out.kerb === 'scrub') this._scrape(r, 0.2, false, 'kerb');
        // Into a wall head-on: off, if it was fast (about 30 km/h); slower, a bonk and a stop.
        if (out.hit > WALL_FALL && racing) this._crash(r, 'wall');
        else if (out.hit > 2 && r.me) this._scrape(r, 0.6, false, 'bonk');
        else if (out.hit > 1 && r.me) this.g.street?._thud?.(Math.min(1, out.hit / 9));
        else if (out.glance > 0) this._scrape(r, out.glance, false, 'wall');
        if (out.jolt > 0.4 && r.me) this.shake = Math.max(this.shake ?? 0, 0.04 * out.jolt);
        if (r.me && racing) this._motorSound(r);
      } else if (r.net) {
        const kk = Math.min(1, dt * 10);
        r.s.x += (r.net.x - r.s.x) * kk;
        r.s.z += (r.net.z - r.s.z) * kk;
        r.s.heading += turn(r.s.heading, r.net.heading) * kk;
        r.s.roll = ((r.s.roll ?? 0) + (r.s.v / SCOOT.wheel) * dt) % (Math.PI * 2);
        if (r.mode !== 'ride') r.crashT += dt;
      }
    }
    // The street round the racers this browser rides.
    const anchors = this.racers.filter((r) => r.mine && !r.left).map((r) => ({ x: r.s.x, z: r.s.z, heading: r.s.heading, idx: r.idx, me: r.me }));
    this.traffic?.update(dt, anchors);
    if (racing) for (const r of this.racers) if (r.mine && !r.left && r.mode === 'ride') this._hits(r);
    this._branches(dt);
    this._bump();
    for (const r of this.racers) {
      if (r.left) continue;
      if (r.mine) this._progress(r);
      this._place(r, dt);
    }
    this.boxes?.update(dt, this.g.camera);
    if (racing) for (const r of this.racers) if (r.mine && !r.left && r.mode === 'ride') this._pickup(r);
    if (this.me && racing && key('KeyR') && !this._rHeld && this.me.mode === 'ride') this._remount(this.me);
    // Lost well off the course (round the wrong side of a building, out in a square) for a few seconds:
    // back on it, as R would — a fair race isn't lost to a bad bounce.
    if (racing) {
      for (const r of this.racers) {
        if (!r.mine || r.left || r.mode !== 'ride' || r.done != null) continue;
        const w = this.course.points[r.idx]?.[2] ?? 6;
        r.lost = (r.off ?? 0) > Math.max(14, w / 2 + 9) ? (r.lost ?? 0) + dt : 0;
        if (r.lost > 2.5) {
          r.lost = 0;
          this._remount(r);
          if (r.me) this._flash('Back on the course', 1.2);
        }
      }
    }
    this._rHeld = key('KeyR');
    this.g.pos.set(this.me.s.x, this.me.y, this.me.s.z);
    this.g.speed = Math.abs(this.me.s.v);
    if (racing) this._finishCheck();
    this._send(dt);
    this._lift();
    this.golmok?.update(dt);
    this.facades?.update();
    this.fx?.update(rawDt, this.g.camera);
    const feel = this.me.mode === 'ride' ? speedFeel(Math.abs(this.me.s.v), this.me.spec.cruise) : 0;
    this.feel = feel;
    this.speedFx?.update(dt, { x: this.me.s.x, y: this.me.y, z: this.me.s.z, heading: this.me.s.travel ?? this.me.s.heading, v: Math.abs(this.me.s.v), k: feel });
    this._wetLights();
    this.wet?.update(dt);
    this._hudFrame();
  }

  /** How much grip the street has: dry, wet, or snow (from the weather as it is now). */
  _grip() {
    const w = this.g.weather;
    if (!w) return GRIP.dry;
    if (w.level.snow > 0.4) return GRIP.snow;
    return GRIP.dry + (GRIP.wet - GRIP.dry) * Math.min(1, w.level.wet);
  }

  /** The slope ahead of a racer (rise over run), from the lie of the land, smoothed (road decks and kerbs aren't hills). */
  _grade(r) {
    const fx = -Math.sin(r.s.heading) * 6;
    const fz = -Math.cos(r.s.heading) * 6;
    const a = this.g.groundAt(r.s.x + fx, r.s.z + fz);
    const b = this.g.groundAt(r.s.x - fx, r.s.z - fz);
    const g = Math.max(-0.12, Math.min(0.12, (a - b) / 12));
    r.grade = (r.grade ?? g) + (g - (r.grade ?? g)) * 0.1;
    return r.grade;
  }

  /** Riding in a slipstream: close behind a car, a bus or another racer. */
  _draft(r) {
    let best = 0;
    for (const o of this.racers) if (o !== r && !o.left && o.mode === 'ride') best = Math.max(best, slipstream(r.s, { x: o.s.x, z: o.s.z, heading: o.s.heading, halfLength: 0.9, halfWidth: 0.35 }, r.s.v) * 0.7);
    for (const v of this.traffic?.near(r.s.x, r.s.z, 16) ?? []) best = Math.max(best, slipstream(r.s, v.box, r.s.v));
    r.draft = best;
    return best;
  }

  /** Walls stop a bike — but not inside the street the course runs down (the map's walls and its streets don't quite agree). */
  _blocked(r, x, z) {
    if (!this.g.buildingAt(x, z)) return false;
    const c = this.course;
    const n = c.points.length;
    const at = locate(c, x, z, r.idx);
    // How far off the course's line (its segments, not just its points, 6 m apart).
    let off = at.off;
    for (const [a, b] of [[at.i - 1, at.i], [at.i, at.i + 1]]) {
      const p = c.points[(a + n) % n];
      const q = c.points[(b + n) % n];
      const dx = q[0] - p[0];
      const dz = q[1] - p[1];
      const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz || 1)));
      off = Math.min(off, Math.hypot(x - p[0] - dx * t, z - p[1] - dz * t));
    }
    const w = c.points[at.i][2] ?? 6;
    return off > w / 2 - 0.2;
  }

  /** Hitting traffic or people, or riding close past them. */
  _hits(r) {
    const s = r.s;
    for (const v of this.traffic?.near(s.x, s.z, 9) ?? []) {
      const gap = bikeGap(s, v.box, r.spec);
      if (gap < 0) {
        if (r.safe > 0) continue;
        // Brushing down a car's side, going its way (or the other): a scrape and a shove, not a fall.
        const b = v.box;
        const dx = s.x - b.x;
        const dz = s.z - b.z;
        const across = dx * Math.cos(b.heading) - dz * Math.sin(b.heading);
        const along = -dx * Math.sin(b.heading) - dz * Math.cos(b.heading);
        const rel = Math.abs(turn(s.travel ?? s.heading, b.heading));
        if ((rel < 0.45 || rel > Math.PI - 0.45) && Math.abs(along) < b.halfLength - 0.15 && Math.abs(across) > b.halfWidth - 0.2) {
          const out = Math.sign(across) * (b.halfWidth + 0.42) - across;
          s.x += Math.cos(b.heading) * out;
          s.z -= Math.sin(b.heading) * out;
          this._scrape(r, 0.35, true, 'car');
          continue;
        }
        this._crash(r, v.kind, v);
        return;
      }
      // Close and fast between you: a close call fills the sprint gauge.
      const closing = Math.hypot(-Math.sin(s.travel) * s.v + Math.sin(v.box.heading) * v.v, -Math.cos(s.travel) * s.v + Math.cos(v.box.heading) * v.v);
      if (!v.missed.has(r.id) && closeCall(gap, closing)) {
        v.missed.add(r.id);
        r.s.stamina = Math.min(1, r.s.stamina + NEAR_MISS.stamina);
        r.misses++;
        if (r.me) {
          this.fx.pop('WHOOSH!', { x: s.x, y: r.y + 2.4, z: s.z, ride: s }, { color: '#8fd8ff', size: 0.9 });
          this._whoosh();
        }
      }
    }
    // Things standing in an alley: a planter, bins, a parked scooter, a pole.
    for (const o of this.golmok?.near(s.x, s.z, 2) ?? []) {
      const d = Math.min(Math.hypot(o.x - s.x, o.z - s.z), Math.hypot(o.x - (s.x - Math.sin(s.heading) * 0.7), o.z - (s.z - Math.cos(s.heading) * 0.7)));
      if (d > o.r + 0.28) continue;
      // Clipped with the edge of the bars, it glances off; only ridden into square is it a fall.
      const side = (o.x - s.x) * Math.cos(s.travel ?? s.heading) - (o.z - s.z) * Math.sin(s.travel ?? s.heading);
      // (a pole stands tight to the edge, where the wall is: it only ever scrapes)
      if (s.v > 4.5 && r.safe <= 0 && Math.abs(side) < o.r * 0.32 && o.kind !== 'pole') {
        this._crash(r, o.kind);
        return;
      }
      if (s.v > 4.5 && r.safe <= 0) {
        s.heading -= Math.sign(side) * 0.14;
        s.travel = (s.travel ?? s.heading) - Math.sign(side) * 0.14;
        s.v *= 0.8;
        s.wobble = Math.min(1, (s.wobble ?? 0) + 0.45);
        this._scrape(r, 0.3, false, 'thing');
      }
      // Pushed off it: slowed a little at speed (a glance), stopped when slow.
      const k = (o.r + 0.28 - d) / (d || 1);
      s.x += (s.x - o.x) * k;
      s.z += (s.z - o.z) * k;
      s.v *= s.v > 4.5 ? 0.97 : 0.5;
    }
    for (const p of this.g.life?.near(s.x, s.z, 3) ?? []) {
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      const fd = Math.hypot(p.x - (s.x - Math.sin(s.heading) * 0.7), p.z - (s.z - Math.cos(s.heading) * 0.7));
      if (Math.min(d, fd) < 0.5 && s.v > 2.5 && r.safe <= 0) {
        this.g.life.bump(p, s.x, s.z);
        // Brushed past (a shoulder, a bag): they stagger, you wobble. Only someone square in your path takes you off.
        const side = (p.x - s.x) * Math.cos(s.travel ?? s.heading) - (p.z - s.z) * Math.sin(s.travel ?? s.heading);
        if (Math.abs(side) > 0.28) {
          s.heading -= Math.sign(side) * 0.1;
          s.v *= 0.85;
          s.wobble = Math.min(1, (s.wobble ?? 0) + 0.5);
          this._scrape(r, 0.2, false, 'person');
          continue;
        }
        this._crash(r, 'person');
        return;
      }
    }
  }

  /** A glance off a wall, a car's flank or a bin: sparks, a scrape, a wobble and some speed gone — still riding. */
  _scrape(r, angle, shove = false, what = '') {
    const s = r.s;
    if (shove) {
      s.v *= 0.8;
      s.wobble = Math.min(1, (s.wobble ?? 0) + 0.5);
      r.safe = Math.max(r.safe, 0.35);
    }
    if (this.clock - (r.scrapeAt ?? -9) < 0.5) return;
    r.scrapeAt = this.clock;
    r.scrapes = (r.scrapes ?? 0) + 1;
    (r.scrapeKinds ??= {})[what] = (r.scrapeKinds[what] ?? 0) + 1;
    this.fx?.dust({ x: s.x, y: r.y + 0.3, z: s.z, ride: s }, 4);
    if (r.me) {
      this.fx?.pop('SCRAPE!', { x: s.x, y: r.y + 2, z: s.z, ride: s }, { color: '#ffb86a', size: 0.7 });
      this.shake = Math.max(this.shake ?? 0, 0.12 + angle * 0.2);
      this.g.street?._thud?.(0.3 + angle * 0.4);
    }
  }

  /** Off the bike: the tumble, stars, back on. */
  _crash(r, what, vehicle = null) {
    if (r.mode !== 'ride') return;
    if (r.helmet) {
      // The golden helmet takes it: a bounce off, no fall.
      r.helmet = false;
      r.safe = 1.2;
      r.s.v *= 0.45;
      r.s.heading += (Math.random() - 0.5) * 0.4;
      this.fx?.pop('BONK!', { x: r.s.x, y: r.y + 2.2, z: r.s.z, ride: r.s }, { color: '#ffd23a', size: r.me ? 1.2 : 0.9 });
      if (r.me) this._clang();
      return;
    }
    r.mode = 'tumble';
    r.crashT = 0;
    r.crashes++;
    // A branch in the front wheel: it stops dead and pitches you over the bars; then a moment no branch can catch you.
    r.fallKind = what === 'branch' ? 'wheel' : null;
    if (what === 'branch') r.branchSafe = THROW.immune;
    r.fallSide = r.s.lean > 0.05 ? 1 : r.s.lean < -0.05 ? -1 : Math.random() < 0.5 ? 1 : -1;
    r.slide = { vx: -Math.sin(r.s.travel) * r.s.v * 0.55, vz: -Math.cos(r.s.travel) * r.s.v * 0.55 };
    if (vehicle) vehicle.stopFor = 2.5;
    r.s.v = 0;
    r.s.stamina = Math.max(0, r.s.stamina - 0.15);
    this._crashFx(r, what);
    if (r.me) this.stop = 0.13;
  }

  _crashFx(r, what = '') {
    this.fx?.pop(what === 'bus' ? 'WHAM!' : what === 'person' ? 'OOF!' : 'BONK!', { x: r.s.x, y: r.y + 2, z: r.s.z, ride: r.s }, { color: '#ff5a3c', size: r.me ? 1.5 : 1.1 });
    this.fx?.dust({ x: r.s.x, y: r.y, z: r.s.z }, 10);
    if (r.me || Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 40) this.g.street?._thud?.(r.me ? 1 : 0.4);
    if (r.me) this.shake = 0.35;
  }

  /** While down: sliding to a stop, sitting dazed, getting up, then back on the bike on the course. */
  _down(r, dt) {
    r.crashT += dt;
    if (r.slide) {
      r.s.x += r.slide.vx * dt;
      r.s.z += r.slide.vz * dt;
      r.slide.vx *= Math.max(0, 1 - dt * 4);
      r.slide.vz *= Math.max(0, 1 - dt * 4);
      if (this._blocked(r, r.s.x, r.s.z)) {
        r.s.x -= r.slide.vx * dt;
        r.s.z -= r.slide.vz * dt;
        r.slide.vx = r.slide.vz = 0;
      }
    }
    if (r.mode === 'tumble' && r.crashT > TUMBLE) r.mode = 'dizzy';
    if (r.crashT > DOWN) this._remount(r);
  }

  /** Back on the bike, on the course where you were (to the right of its line), a moment safe. */
  _remount(r) {
    const c = this.course;
    const at = locate(c, r.s.x, r.s.z, r.idx);
    const i = at.off < 25 ? at.i : r.idx;
    const p = c.points[i];
    const q = c.points[(i + 1) % c.points.length];
    const hd = heading(p, q);
    const side = Math.max(0, Math.min(1.2, (p[2] ?? 6) / 2 - 1));
    Object.assign(r.s, { x: p[0] + Math.cos(hd) * side, z: p[1] - Math.sin(hd) * side, heading: hd, travel: hd, v: 0, lean: 0, steer: 0, air: 0, airV: 0, wobble: 0 });
    r.mode = 'ride';
    r.crashT = 0;
    r.slide = null;
    r.safe = 1.5;
    r.idx = i;
    r.stuck = 0;
  }

  /**
   * Racers that touch: bikes are capsules (wheel to wheel, bar-wide). They push apart, the one
   * behind loses the speed it ran in with, both wobble — and a hard knock from the side throws
   * the lighter-held one off. Only the racers this browser rides are moved.
   */
  _bump() {
    const list = this.racers.filter((r) => !r.left && r.mode === 'ride');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a.mine && !b.mine) continue;
        const hit = bikeContact(a.s, b.s);
        if (!hit) continue;
        const knock = resolveBump(a.s, b.s, hit, [a.mine, b.mine]);
        for (const r of [a, b]) if (r.mine) r.wobble = Math.min(1, Math.max(r.wobble ?? 0, 0.35 + knock * 0.12));
        if (knock > 1.2 && this.clock - (this._bumpAt ?? -9) > 0.4 && (a.me || b.me)) {
          this._bumpAt = this.clock;
          const me = a.me ? a : b;
          this.fx?.pop('BUMP!', { x: me.s.x, y: me.y + 2.2, z: me.s.z, ride: me.s }, { color: '#ffb86a', size: 0.7 });
          this.g.street?._thud?.(Math.min(0.6, knock / 8));
        }
      }
    }
  }

  _place(r, dt) {
    const s = r.s;
    const target = r.net && !r.mine ? r.net.y : this.g.surfaceAt(s.x, s.z, r.y + 0.3);
    // up a kerb at once (the hop carries it), down one quickly
    r.y += (target - r.y) * Math.min(1, dt * (target > r.y ? 30 : 14));
    const night = this.g.uniforms?.uNight.value ?? 0;
    const won = r.done != null && this._rank(r) === 1 && s.v < 0.6;
    const v = r.view;
    v.root.position.set(s.x, r.y, s.z);
    v.root.visible = !(r.safe > 0 && r.mode === 'ride' && Math.floor(r.safe * 12) % 2);
    const mode = won ? 'win' : this.phase === 'grid' ? 'grid' : r.mode;
    v.pose(dt, { heading: s.heading, speed: Math.abs(s.v), lean: s.lean, steer: s.steer, braking: s.braking, boost: s.boosting || r.tailwind > 0, bump: s.bump ?? 0, air: s.air ?? 0, landed: r.landed, wobble: Math.max(s.wobble ?? 0, r.wobble ?? 0), mode, t: r.crashT, fallSide: r.fallSide ?? 1, fallKind: r.fallKind, throwK: r.throwT == null ? null : Math.min(1, r.throwT / 0.45), roll: s.roll, battery: s.stamina, night, glow: r.helmet ? '#ffd86a' : r.tailwind > 0 ? '#bdf0ff' : null });
    r.landed = 0;
    r.wobble = Math.max(0, (r.wobble ?? 0) - dt * 1.4);
    const cam = this.g.camera.position;
    const camD = Math.hypot(cam.x - s.x, cam.y - r.y - 0.8, cam.z - s.z);
    v.furLod(camD);
    // A rival right by the camera (a big furry head filling a corner), or between it and you, fades away.
    if (!r.me && this.me) v.fade(nearFade(cam, { x: s.x, y: r.y + 0.8, z: s.z, ride: s }, { x: this.me.s.x, y: this.me.y + 0.9, z: this.me.s.z }));
    if (!r.me && (v._fade ?? 1) < 0.03) v.root.visible = false;
    if (r.tailwind > 0 && Math.random() < dt * 14) this.fx?.streak({ x: s.x, y: r.y + 0.6 + Math.random() * 1.0, z: s.z }, s.heading);
    if (s.skid > 0.25 && s.v > 3 && Math.random() < dt * 20) this.fx?.dust({ x: s.x + Math.sin(s.heading) * 0.5, y: r.y, z: s.z + Math.cos(s.heading) * 0.5 }, 1);
    this.splash?.(r, dt);
  }

  /** On a wet road: spray off the back wheel. */
  splash(r) {
    const s = r.s;
    if (r.mode !== 'ride' || (s.air ?? 0) > 0.05) return;
    this.wet?.spray(s.x + Math.sin(s.heading) * 0.45, r.y, s.z + Math.cos(s.heading) * 0.45, s.travel ?? s.heading, Math.abs(s.v), 1);
  }

  /** The lights a wet road mirrors: every scooter's LEDs, and the lamps of the traffic near you (lit at night and in the rain). */
  _wetLights() {
    const fx = this.wet;
    if (!fx || (this.g.weather?.level.wet ?? 0) < 0.05) return;
    const night = this.g.uniforms?.uNight.value ?? 0;
    const cam = this.g.camera.position;
    // The street and alley lamps nearest you, streaking down the wet road.
    if (night > 0.3) for (const l of (this.g.nightLights?.near ?? []).slice(0, 12)) fx.light(l.x, l.y, l.z, '#ffc888', 2.4 * night, l.ground);
    for (const r of this.racers) {
      if (r.left || r.mode !== 'ride') continue;
      const s = r.s;
      const fx2 = -Math.sin(s.heading);
      const fz2 = -Math.cos(s.heading);
      fx.light(s.x + fx2 * 0.5, r.y + 0.55, s.z + fz2 * 0.5, '#f2f6ff', 0.55 + night * 0.5);
      fx.light(s.x - fx2 * 0.5, r.y + 0.22, s.z - fz2 * 0.5, '#ff2a1a', s.braking ? 1 : 0.35);
    }
    for (const v of this.traffic?.vehicles ?? []) {
      const b = v.box;
      if (Math.hypot(b.x - cam.x, b.z - cam.z) > 80) continue;
      const fx2 = -Math.sin(b.heading);
      const fz2 = -Math.cos(b.heading);
      const rx = Math.cos(b.heading);
      const rz = -Math.sin(b.heading);
      const hw = b.halfWidth - 0.3;
      const ly = v.y + (v.kind === 'bus' ? 0.85 : 0.7);
      for (const s of [-1, 1]) {
        if (v.kind !== 'scooter') {
          fx.light(b.x + fx2 * b.halfLength + rx * hw * s, ly, b.z + fz2 * b.halfLength + rz * hw * s, '#fff1d6', 0.9);
          fx.light(b.x - fx2 * b.halfLength + rx * hw * s, ly + 0.1, b.z - fz2 * b.halfLength + rz * hw * s, '#ff2414', v.braking ? 1.1 : 0.45);
        } else if (s > 0) fx.light(b.x + fx2 * 0.8, v.y + 0.9, b.z + fz2 * 0.8, '#fff1d6', 0.6);
      }
      // and the spray off their tyres
      if (v.speed > 3 && Math.hypot(b.x - cam.x, b.z - cam.z) < 45) for (const s of [-1, 1]) fx.spray(b.x - fx2 * (b.halfLength - 0.7) + rx * hw * s, v.y, b.z - fz2 * (b.halfLength - 0.7) + rz * hw * s, b.heading, v.speed, v.kind === 'bus' ? 2.2 : v.kind === 'scooter' ? 0.8 : 1.6);
    }
  }

  /** What the wheels are on: paving on a pavement or a market lane, an alley's concrete, worn asphalt. */
  _surface(r) {
    const c = this.course;
    const p = c.points[r.idx];
    const w = p?.[2] ?? 6;
    if ((r.off ?? 0) > w / 2 + 0.3) return 'paving';
    const cls = p?.[3] ?? 4;
    if (cls === 7) return 'paving';
    if (isSmall(cls)) return 'concrete';
    return 'asphalt';
  }

  /** A kerb just ahead of the front wheel: how high, and how squarely met (from the ground's heights). */
  _kerb(r) {
    const s = r.s;
    if (s.v < 0.6) return null;
    const fx = -Math.sin(s.travel ?? s.heading);
    const fz = -Math.cos(s.travel ?? s.heading);
    const here = this.g.surfaceAt(s.x, s.z, r.y + 0.3);
    const ahead = this.g.surfaceAt(s.x + fx * 0.55, s.z + fz * 0.55, r.y + 0.3);
    const rise = ahead - here;
    if (Math.abs(rise) < 0.035 || Math.abs(rise) > 0.6) return null;
    // Within the street the course runs down, a step in the surface is a seam or a steep bit (two road
    // meshes meeting, a hill), not a kerb: ridden over, never a wall.
    if (rise > 0.12) {
      const p = this.course.points[r.idx];
      if (p && Math.hypot(s.x + fx * 0.55 - p[0], s.z + fz * 0.55 - p[1]) < (p[2] ?? 6) / 2 + 2.5 && (r.off ?? 0) < (p[2] ?? 6) / 2 - 0.3) return null;
    }
    // the kerb's line from the slope across it: sample a little to each side of the step
    const sx = -fz;
    const sz = fx;
    const l = this.g.surfaceAt(s.x + fx * 0.45 + sx * 0.5, s.z + fz * 0.45 + sz * 0.5, r.y + 0.3);
    const rt = this.g.surfaceAt(s.x + fx * 0.45 - sx * 0.5, s.z + fz * 0.45 - sz * 0.5, r.y + 0.3);
    // gradient across travel (side) vs along it (rise): met squarely, the side difference is small
    const side = (l - rt) / 1.0;
    const cross = Math.atan2(Math.abs(rise) / 0.55, Math.abs(side) + 1e-4);
    return { rise, cross, away: side > 0 ? -1 : 1 };
  }

  /** How far round the course a racer has gone: following the nearest point, laps counted at the line. */
  _progress(r) {
    const c = this.course;
    const L = c.length;
    const loc = locate(c, r.s.x, r.s.z, r.idx);
    const width = c.points[loc.i][2] ?? 6;
    r.off = loc.off;
    if (loc.off < width / 2 + 20) {
      let d = c.s[loc.i] - c.s[r.idx];
      if (d > L / 2) d -= L;
      if (d < -L / 2) d += L;
      r.dist += d;
      r.idx = loc.i;
      const q = c.points[(loc.i + 1) % c.points.length];
      const p = c.points[loc.i];
      r.wrong = Math.abs(turn(r.s.heading, heading(p, q))) > 2 && r.s.v > 3;
    }
    const laps = Math.floor(r.dist / L);
    if (this.phase === 'racing' && laps > r.lapsDone) {
      const lap = this.clock - r.lapStart;
      r.lapTimes.push(lap);
      r.best = r.best == null ? lap : Math.min(r.best, lap);
      if (r.me && laps < this.laps) this._flash(`Lap ${laps + 1} of ${this.laps} · ${clock(lap)}`);
      r.lapsDone = laps;
      r.lapStart = this.clock;
      if (laps >= this.laps && r.done == null) {
        r.done = this.clock;
        if (r.me) {
          const rank = this._rank(r);
          this._flash(`Finished ${ordinal(rank)} · ${clock(r.done)}`, 3);
          this.fx.pop(rank === 1 ? 'WINNER!' : 'FINISH!', { x: r.s.x, y: r.y + 2.6, z: r.s.z, ride: r.s }, { color: rank === 1 ? '#ffd23a' : '#9ef07a', size: 1.6 });
          this._fanfare(rank === 1);
        }
      }
    }
  }

  /* ------------------------------------------------------------ items */

  _pickup(r) {
    const slot = r.items.indexOf(null);
    if (slot < 0) return;
    const got = this.boxes?.take(r.s.x, r.s.z);
    if (got == null) return;
    const item = rollItem(this._rank(r), this.racers.length, Math.random);
    r.items[slot] = item;
    if (r.me) {
      this._renderItems(slot);
      this._ding(1320);
      this.fx.pop(ITEMS[item].pop, { x: r.s.x, y: r.y + 2.3, z: r.s.z, ride: r.s }, { color: ITEMS[item].color, size: 0.8 });
    }
  }

  /** Use the item in a slot (0–2). */
  _use(r, slot) {
    const item = r.items[slot];
    if (!item) return;
    r.items[slot] = null;
    this._apply(r, item);
    this._itemFx(r, item);
    if (r.me) this._renderItems();
    if (this.session?.room) this.session.send({ t: 'race-item', id: r.id, item });
  }

  _apply(r, item) {
    const s = r.s;
    if (item === 'branch') this._throwBranch(r);
    else if (item === 'drink') s.stamina = 1;
    else if (item === 'helmet') r.helmet = true;
    else if (item === 'tailwind') r.tailwind = 5;
    else if (item === 'horn') {
      // Everyone ahead clears out: people step aside, scooters pull over, cars stop.
      this.traffic?.airHorn(s.x, s.z, s.heading, 45);
      this.g.life?.shoo(s.x, s.z, s.heading, 40, true);
    }
  }

  /** What using an item looks and sounds like (for anyone's racer). */
  _itemFx(r, item) {
    const at = { x: r.s.x, y: r.y + 2.4, z: r.s.z, ride: r.s };
    const near = r.me || Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 80;
    if (item === 'horn') {
      this.fx?.pop('BWAAMP!', at, { color: '#ff7aa8', size: 1.4 });
      this.fx?.ring(at, '#ff7aa8');
      if (near) this.g.street?._horn?.(0.5, 233);
    } else if (item === 'drink') {
      this.fx?.pop('ZAP!', at, { color: '#9ef07a', size: 1.1 });
      if (r.me) this._ding(880);
    } else if (item === 'helmet') {
      this.fx?.pop('SAFE!', at, { color: '#ffd23a', size: 1.1 });
      r.helmet = true;
      if (r.me) this._ding(1100);
    } else if (item === 'tailwind') {
      this.fx?.pop('ZOOM!', at, { color: '#8fd8ff', size: 1.3 });
      r.tailwind = 5;
      if (r.me) this._whoosh(1.4);
    } else if (item === 'branch') {
      // the wind-up: the arm goes back with the branch over the shoulder (the throw itself is _branches')
      r.throwT = 0;
    }
  }

  /* ---------------------------------------------------------- branches */

  /**
   * Use a branch: at the nearest rival ahead within reach (and roughly where you are pointing) it is
   * thrown — after a wind-up, aimed where they will be when it comes down; with nobody ahead it is
   * dropped behind you, across the road, as a trap.
   */
  _throwBranch(r) {
    const s = r.s;
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    const target = this._branchTarget(r);
    const bid = `${r.id}:${(this._bid = (this._bid ?? 0) + 1)}`;
    if (target) {
      r.pendingBranch = { bid, target: target.id, at: this.clock };
      return;
    }
    // dropped: down behind the back wheel
    this._launch(r, { sx: s.x - fx * 1.1, sy: 0.9, sz: s.z - fz * 1.1, tx: s.x - fx * 1.7, tz: s.z - fz * 1.7, T: 0.3 }, bid, true);
  }

  /** The rival a branch would be thrown at: the nearest one ahead along the course, in reach and in front. */
  _branchTarget(r) {
    const s = r.s;
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    let best = null;
    for (const o of this.racers) {
      if (o === r || o.left || o.mode !== 'ride' || o.done != null) continue;
      const dx = o.s.x - s.x;
      const dz = o.s.z - s.z;
      const d = Math.hypot(dx, dz);
      const ahead = o.dist - r.dist;
      if (ahead < 4 || ahead > THROW.reach || d > THROW.reach || (dx * fx + dz * fz) / (d || 1) < 0.55) continue;
      if (!best || d < best.d) best = { o, d };
    }
    return best?.o ?? null;
  }

  /** The branch leaves the hand (the thrower's browser plans it and tells the room). */
  _launch(r, plan, bid, drop = false) {
    this._addBranch(r, plan, bid, drop);
    if (this.session?.room) this.session.send({ t: 'race-branch', id: r.id, bid, drop, plan });
  }

  /** A branch in the world: flying (or falling, dropped) and then lying in the road. */
  _addBranch(r, plan, bid, drop) {
    const mesh = branchModel();
    this.g.scene.add(mesh);
    const b = { bid, owner: r.id, plan, t: 0, state: 'fly', drop, mesh, life: THROW.lie, base: this.g.surfaceAt(plan.sx, plan.sz, r.y + 0.5) };
    (this.branches ??= []).push(b);
    this.thrown = (this.thrown ?? 0) + (drop ? 0 : 1);
    if (!drop && Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 60) this._whoosh(0.5);
    return b;
  }

  /** Each frame: wind-ups let go, branches fly and land, and catch whoever rides into them. */
  _branches(dt) {
    // Wind-ups: the branch held up over the shoulder; at the top of the swing it goes.
    for (const r of this.racers) {
      const p = r.pendingBranch;
      if (!p) continue;
      if (r.mode !== 'ride') {
        r.pendingBranch = null;
        continue;
      }
      if (this.clock - p.at < THROW.windup) continue;
      r.pendingBranch = null;
      const target = this.racers.find((o) => o.id === p.target);
      const s = r.s;
      if (!target || target.mode !== 'ride') {
        this._launch(r, { sx: s.x, sy: 1.2, sz: s.z, tx: s.x + Math.sin(s.heading) * 1.6, tz: s.z + Math.cos(s.heading) * 1.6, T: 0.35 }, p.bid, true);
        continue;
      }
      // aimed at their front wheel, where it will be when the branch comes down
      const t = target.s;
      const vel = { x: -Math.sin(t.travel ?? t.heading) * t.v, z: -Math.cos(t.travel ?? t.heading) * t.v };
      const aim = { x: t.x - Math.sin(t.heading) * 0.45, z: t.z - Math.cos(t.heading) * 0.45 };
      const hand = { x: s.x + Math.cos(s.heading) * 0.25, y: 1.7, z: s.z - Math.sin(s.heading) * 0.25 };
      this._launch(r, { ...throwPlan(hand, aim, vel), target: target.id }, p.bid, false);
    }
    // The one in a wind-up: held over the thrower's shoulder.
    for (const r of this.racers) {
      if (!r.pendingBranch || r.mode !== 'ride') continue;
      r.heldMesh ??= branchModel();
      if (!r.heldMesh.parent) this.g.scene.add(r.heldMesh);
      const k = Math.min(1, (this.clock - r.pendingBranch.at) / THROW.windup);
      const s = r.s;
      r.heldMesh.position.set(s.x + Math.cos(s.heading) * 0.3 + Math.sin(s.heading) * 0.3 * k, r.y + 1.45 + k * 0.45, s.z - Math.sin(s.heading) * 0.3 + Math.cos(s.heading) * 0.3 * k);
      r.heldMesh.rotation.set(0.9 * k, s.heading + Math.PI / 2, 0.6, 'YXZ');
    }
    for (const r of this.racers) if (r.heldMesh?.parent && (!r.pendingBranch || r.mode !== 'ride')) r.heldMesh.removeFromParent();
    const list = this.branches ?? [];
    for (const b of [...list]) {
      b.t += dt;
      const m = b.mesh;
      if (b.state === 'fly') {
        // It homes in a little on the wheel it was thrown at (a hard swerve can still make it miss).
        const tg = b.plan.target ? this.racers.find((o) => o.id === b.plan.target) : null;
        if (tg && tg.mode === 'ride' && b.t < b.plan.T) {
          const ts = tg.s;
          const left = b.plan.T - b.t;
          const wx = ts.x - Math.sin(ts.heading) * 0.45 - Math.sin(ts.travel ?? ts.heading) * ts.v * left;
          const wz = ts.z - Math.cos(ts.heading) * 0.45 - Math.cos(ts.travel ?? ts.heading) * ts.v * left;
          const dx = wx - b.plan.tx;
          const dz = wz - b.plan.tz;
          const d = Math.hypot(dx, dz);
          const step = Math.min(d, THROW.home * dt);
          if (d > 1e-3) {
            b.plan.tx += (dx / d) * step;
            b.plan.tz += (dz / d) * step;
          }
        }
        const f = flightAt(b.plan, b.t);
        const ground = this.g.surfaceAt(f.x, f.z, b.base + 2);
        m.position.set(f.x, ground + Math.max(0.05, f.y), f.z);
        m.rotation.set(f.spin, Math.atan2(b.plan.tx - b.plan.sx, b.plan.tz - b.plan.sz), f.spin * 0.3, 'YXZ');
        // low enough to catch a wheel (or a rider) on the way down
        if (f.u > 0.55 && f.y < 1.3 && this._branchCatch(b, f.x, f.z, THROW.hitR)) continue;
        if (b.t >= b.plan.T) {
          b.state = 'lie';
          b.x = b.plan.tx;
          b.z = b.plan.tz;
          b.t = 0;
          m.position.set(b.x, this.g.surfaceAt(b.x, b.z, ground + 1) + 0.06, b.z);
          // across the road, mostly: a twist off the way it flew
          m.rotation.set(0, Math.atan2(b.plan.tx - b.plan.sx, b.plan.tz - b.plan.sz) + Math.PI / 2 + (b.bid.length % 5) * 0.12 - 0.24, 0.08);
          this.fx?.dust({ x: b.x, y: m.position.y, z: b.z }, 3);
        }
      } else {
        // lying in the road: a trap for the next front wheel; gone after a while
        if (this._branchCatch(b, b.x, b.z, THROW.trapR)) continue;
        if (b.t > b.life) this._dropBranch(b);
      }
    }
  }

  /** Whoever's front wheel is at the branch: caught (decided by the browser that rides them). */
  _branchCatch(b, x, z, reach) {
    for (const r of this.racers) {
      if (!r.mine || r.left || r.mode !== 'ride') continue;
      // the thrower can't catch their own on the way out
      if (r.id === b.owner && (b.state === 'fly' || b.t < 1)) continue;
      const s = r.s;
      const wx = s.x - Math.sin(s.heading) * 0.45;
      const wz = s.z - Math.cos(s.heading) * 0.45;
      if (Math.min(Math.hypot(wx - x, wz - z), Math.hypot(s.x - x, s.z - z)) > reach) continue;
      // (a golden helmet takes it — _crash — and so does a moment's immunity after the last one)
      const fell = r.branchSafe <= 0 && r.safe <= 0 && !r.helmet;
      if (r.branchSafe <= 0 && r.safe <= 0) this._crash(r, 'branch');
      this._snapBranch(b, r);
      if (this.session?.room) this.session.send({ t: 'race-branch-gone', bid: b.bid, by: r.id, fell });
      return true;
    }
    return false;
  }

  /** A branch caught (or ridden over by someone immune): CRACK, a burst of leaves, gone. */
  _snapBranch(b, r = null) {
    const at = b.mesh.position;
    const near = Math.hypot(at.x - this.g.pos.x, at.z - this.g.pos.z);
    this.fx?.pop('CRACK!', { x: at.x, y: at.y + 1.9, z: at.z }, { color: '#8bd450', size: r?.me ? 1.5 : 1.15 });
    this.fx?.dust({ x: at.x, y: at.y + 0.2, z: at.z }, 6);
    if (near < 70) {
      const n = snapSound(this._audio(), Math.max(0.15, 1 - near / 70));
      this.snaps = (this.snaps ?? 0) + (n ? 1 : 0);
    }
    this.caught = (this.caught ?? 0) + 1;
    this._dropBranch(b);
  }

  _dropBranch(b) {
    b.mesh.removeFromParent();
    const list = this.branches ?? [];
    const i = list.indexOf(b);
    if (i >= 0) list.splice(i, 1);
  }

  /** The three slots, bottom centre: an item's sticker in each, and its key. */
  _renderItems(fresh = -1) {
    const r = this.me;
    if (!r) return;
    this.itemsEl.innerHTML = r.items.map((it, i) => `<div class="race__slot${it ? ' is-full' : ''}${i === fresh ? ' is-new' : ''}"><kbd>${i + 1}</kbd>${it ? `<img src="${itemIcon(it)}" alt="${esc(ITEMS[it].name)}" title="${esc(ITEMS[it].name)} — ${esc(ITEMS[it].text)}" /><small>${esc(ITEMS[it].name)}</small>` : ''}</div>`).join('');
  }

  /* ------------------------------------------------------------- bots */

  /**
   * A bot: ride a line on the right of the street, a little ahead on the
   * course; slow for the corners it sees coming; steer round cars, scooters
   * and people ahead (and brake if there's no way round); sprint on
   * straights; use its items when they help.
   */
  _bot(r, dt) {
    r.skill ??= 0.97;
    const c = this.course;
    const n = c.points.length;
    const s = r.s;
    const v = Math.max(0, s.v);
    // (in a narrow street it aims nearer, or it would cut the corners through the walls)
    const narrowK = Math.min(1, Math.max(0.35, ((c.points[r.idx]?.[2] ?? 8) - 2) / 6));
    const ahead = Math.max(1, Math.round((4 + v * 0.6 * narrowK) / 6));
    const t = c.points[(r.idx + ahead) % n];
    const t2 = c.points[(r.idx + ahead + 1) % n];
    const hd = heading(t, t2);
    // Its own line in the street: on a big road the right-hand half, in an alley all of it —
    // and round anyone slower in that line, on the side with more room.
    const small = isSmall(t[3] ?? 4);
    const band = laneBand(t[2] ?? 6, small, false, Boolean(t[4]));
    const wide = laneBand(t[2] ?? 6, small, true, Boolean(t[4]));
    r.laneK ??= 0.5;
    let want = band.lo + (band.hi - band.lo) * r.laneK;
    const here = c.points[r.idx];
    const next = c.points[(r.idx + 1) % n];
    const myLat = lateralOf(s.x, s.z, here, next);
    let passing = null;
    for (const o of this.racers) {
      if (o === r || o.left || o.mode !== 'ride') continue;
      const dx = o.s.x - s.x;
      const dz = o.s.z - s.z;
      const along = dx * -Math.sin(s.heading) + dz * -Math.cos(s.heading);
      if (along < -1.2 || along > 9 + v * 0.4) continue;
      const oLat = lateralOf(o.s.x, o.s.z, here, next);
      if (Math.abs(oLat - want) > 1.25 && Math.abs(oLat - myLat) > 1.1) continue;
      // Slower, or just in the way: go round (the middle side first, the way you overtake here).
      if (along > 0 && o.s.v < v + 0.8 && (!passing || along < passing.along)) passing = { along, lat: oLat };
    }
    if (passing) {
      const inner = passing.lat - 1.35;
      const outer = passing.lat + 1.35;
      const roomIn = inner - wide.lo;
      const roomOut = band.hi - outer;
      r.passSide ??= roomIn >= 0 || roomIn > roomOut ? -1 : 1;
      want = r.passSide < 0 ? Math.max(wide.lo, inner) : Math.min(band.hi, outer);
    } else r.passSide = null;
    // Rung at from behind: give them the middle of the road for a moment.
    r.yieldT = Math.max(0, (r.yieldT ?? 0) - dt);
    if (r.yieldT > 0 && !passing) want = band.hi - 0.15;
    // Ease across (a bike drifts over, it doesn't jump).
    r.lat ??= myLat;
    r.lat += Math.max(-1.6 * dt, Math.min(1.6 * dt, want - r.lat));
    r.lane = r.lat;
    const aimX = t[0] + Math.cos(hd) * r.lat;
    const aimZ = t[1] - Math.sin(hd) * r.lat;
    let steer = Math.max(-1, Math.min(1, turn(s.heading, Math.atan2(-(aimX - s.x), -(aimZ - s.z))) * 2.6));
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    let block = Infinity;
    let blockV = 0;
    let crossing = Infinity;
    let push = 0;
    // How far ahead it looks: about two and a half seconds at speed.
    const R = 22 + v * 1.4;
    const consider = (x, z, half, ownV = 0, ownHd = 0) => {
      const dx = x - s.x;
      const dz = z - s.z;
      const along = dx * fx + dz * fz;
      const side = dx * -fz + dz * fx; // + is to our right
      if (along < 0 || along > R) return;
      const tt = along / Math.max(2, v);
      const side2 = side + (Math.sin(ownHd) * fz - Math.cos(ownHd) * fx) * ownV * Math.min(1.6, tt);
      if (Math.abs(side2) < half + 0.9) {
        if (along < block) {
          block = along;
          // (how fast it is going our way: a car ahead going on is less of a wall than one stopped)
          blockV = Math.max(0, ownV * (-Math.sin(ownHd) * fx - Math.cos(ownHd) * fz));
        }
        // Something crossing our way (a car out of a side street): no steering round that — brake for it.
        const across = Math.abs(Math.sin(turn(s.heading, ownHd)));
        if (ownV > 1.5 && across > 0.55) crossing = Math.min(crossing, along);
        push += (side2 > 0 ? 1 : -1) * (1 - along / R) * 1.6;
      }
    };
    for (const veh of this.traffic?.near(s.x, s.z, R + 6) ?? []) consider(veh.box.x, veh.box.z, veh.box.halfWidth + 0.3, veh.v, veh.box.heading);
    const before = block;
    for (const p of this.g.life?.near(s.x, s.z, R) ?? []) consider(p.x, p.z, isSmall(t[3] ?? 4) ? 0.1 : 0.4);
    if (block < before && block < 30 && this.clock - (r.rang ?? -9) > 3) {
      r.rang = this.clock;
      this.ringBell(r);
    }
    for (const o of this.racers) if (o !== r && !o.left && o.mode !== 'ride') consider(o.s.x, o.s.z, 0.8);
    // A rider right in front, close: ease off rather than ride into their back wheel.
    for (const o of this.racers) {
      if (o === r || o.left || o.mode !== 'ride') continue;
      const dx = o.s.x - s.x;
      const dz = o.s.z - s.z;
      const along = dx * -Math.sin(s.heading) + dz * -Math.cos(s.heading);
      const side = Math.abs(dx * Math.cos(s.heading) - dz * Math.sin(s.heading));
      if (along > 0.5 && along < 3.2 + v * 0.15 && side < 0.75 && along + 4.2 < block) {
        block = along + 4.2;
        blockV = o.s.v;
      }
    }
    for (const o of this.golmok?.near(s.x, s.z, 20) ?? []) consider(o.x, o.z, o.r);
    // Steering is + to the left; something on our right pushes us left.
    steer = Math.max(-1, Math.min(1, steer + push * r.skill));
    const grip = Math.min(1.05, this._grip() * (r.spec.grip ?? 1));
    let target = r.spec.boostTop;
    let straight = true;
    // Corners ahead (about 100 m of them): how fast each can be taken, and braking for it in time.
    const decel = r.spec.brake * Math.min(1, grip) * 0.7;
    for (let j = 1; j < 17; j++) {
      const a = c.points[(r.idx + j) % n];
      const b = c.points[(r.idx + j + 3) % n];
      const p0 = c.points[(r.idx + j - 3 + n) % n];
      const bend = Math.abs(turn(Math.atan2(a[0] - p0[0], a[1] - p0[1]), Math.atan2(b[0] - a[0], b[1] - a[1])));
      if (j < 9 && bend > 0.25) straight = false;
      // (a road's corner is cut across its width: the line through it is wider than the kerb's)
      const w = Math.min(a[2] ?? 8, b[2] ?? 8);
      const corner = cornerSpeed(Math.max(1e-3, bend / Math.min(30, 12 + w * 1.6)), grip, r.spec) * (0.78 + 0.14 * r.skill);
      target = Math.min(target, Math.sqrt(corner * corner + 2 * decel * Math.max(0, j * 6 - 5)));
    }
    // Run wide off the course (a corner overcooked): slow, and back onto it.
    if ((r.off ?? 0) > (here[2] ?? 6) / 2 + 2.5) target = Math.min(target, 9);
    // Something in the way with no way round: slow to its speed in time.
    if (block < R && Math.abs(push) < 0.6) target = Math.min(target, blockV + Math.sqrt(2 * decel * Math.max(0, block - 5)));
    if (crossing < R) target = Math.min(target, Math.sqrt(2 * decel * Math.max(0, crossing - 6)));
    r.stuck = this.phase === 'racing' && v < 0.8 ? r.stuck + dt : 0;
    if (r.stuck > 2.5 || r.off > 30) this._remount(r);
    const has = (id) => r.items.indexOf(id);
    if (has('helmet') >= 0 && !r.helmet) this._use(r, has('helmet'));
    if (has('drink') >= 0 && s.stamina < 0.25) this._use(r, has('drink'));
    if (has('horn') >= 0 && block < 30) this._use(r, has('horn'));
    if (has('tailwind') >= 0 && straight && block > 40 && v > 14) this._use(r, has('tailwind'));
    if (has('branch') >= 0 && !r.pendingBranch) {
      // At a rival ahead in reach; else dropped when someone is close behind (or after holding it a while).
      r.heldBranch = (r.heldBranch ?? 0) + dt;
      const behind = this.racers.some((o) => o !== r && !o.left && o.mode === 'ride' && r.dist - o.dist > 3 && r.dist - o.dist < 28);
      if (this._branchTarget(r) || behind || r.heldBranch > 18) {
        r.heldBranch = 0;
        this._use(r, has('branch'));
      }
    }
    r.dbg = { block: Math.round(block * 10) / 10, push: Math.round(push * 100) / 100, target: Math.round(target * 10) / 10, steer: Math.round(steer * 100) / 100 };
    const wantBoost = straight && block > 40 && (s.stamina > 0.45 || r.tailwind > 0) && v > 10 && v < target - 0.3;
    return { throttle: v < target - 0.2, brake: v > target + 1.2, steer, boost: wantBoost && Math.random() < 0.4 + 0.6 * r.skill };
  }

  /** The order: finished first (by time), then by how far round. */
  _order() {
    return [...this.racers].filter((r) => !r.left).sort((a, b) => (a.done != null && b.done != null ? a.done - b.done : a.done != null ? -1 : b.done != null ? 1 : b.dist - a.dist));
  }

  _rank(r) {
    return this._order().indexOf(r) + 1;
  }

  _finishCheck() {
    const left = this.racers.filter((r) => !r.left);
    const first = Math.min(...left.map((r) => r.done ?? Infinity));
    const all = left.every((r) => r.done != null);
    // Everyone home — or thirty seconds after the winner — and it is over.
    if (this.phase === 'racing' && (all || (Number.isFinite(first) && this.clock - first > 30) || (this.me.done != null && left.filter((r) => !r.bot).every((r) => r.done != null) && this.clock - this.me.done > 4))) {
      this.phase = 'done';
      setTimeout(() => this._results(), all ? 1600 : 400);
    }
  }

  _send(dt) {
    const s = this.session;
    if (!s?.room) return;
    this.sent += dt;
    if (this.sent < SEND_EVERY) return;
    this.sent = 0;
    const r2 = (v) => Math.round(v * 100) / 100;
    const flags = (r) => (r.s.boosting ? 1 : 0) | (r.s.throttle ? 2 : 0) | (r.s.braking ? 4 : 0) | (r.helmet ? 8 : 0) | (r.tailwind > 0 ? 16 : 0);
    s.send({ t: 'race-bikes', bikes: this.racers.filter((r) => r.mine && !r.left).map((r) => [r.id, r2(r.s.x), r2(r.s.z), r2(r.s.heading), r2(r.s.v), r2(r.s.lean), r2(r.y), r2(r.dist), r.done ?? -1, r.best ?? -1, r2(r.s.roll), flags(r), r.mode, r.crashes, r.misses]) });
  }

  /* -------------------------------------------------------------- HUD */

  _flash(text, seconds = 2) {
    this.msgEl.textContent = text;
    this.msgEl.hidden = false;
    clearTimeout(this._msgT);
    this._msgT = setTimeout(() => (this.msgEl.hidden = true), seconds * 1000);
  }

  _hudFrame() {
    const me = this.me;
    const order = this._order();
    const rank = order.indexOf(me) + 1;
    const lap = Math.min(this.laps, Math.max(1, me.lapsDone + 1));
    const pk = `${rank}|${order.length}`;
    if (pk !== this._posKey) {
      this._posKey = pk;
      this.posEl.innerHTML = `<b>${ordinal(rank)}</b><small>/ ${order.length}</small>`;
      this.posEl.classList.remove('is-bump');
      void this.posEl.offsetWidth;
      this.posEl.classList.add('is-bump');
    }
    this.lapEl.innerHTML = `<small>LAP</small><b>${lap}</b><small>/ ${this.laps}</small>`;
    this.timeEl.innerHTML = `<b>${clock(this.phase === 'grid' ? 0 : me.done ?? this.clock)}</b>${me.best != null ? `<small>best lap ${clock(me.best)}</small>` : ''}`;
    const L = this.course.length * this.laps;
    this.boardEl.innerHTML = order.map((r, i) => `<p class="${r.me ? 'is-me' : ''}"><b>${i + 1}</b><i style="background:${r.color}"></i>${esc(r.ch.name)} <small>${esc(r.name)}${r.bot ? ' · bot' : ''}</small><span>${r.done != null ? clock(r.done) : `${Math.max(0, Math.round((L - r.dist) / 10) * 10)} m`}</span></p>`).join('');
    const kmh = Math.round(Math.abs(me.s.v) * 3.6);
    const st = me.s.stamina;
    const state = me.mode !== 'ride' ? 'OUCH' : me.tailwind > 0 ? 'TAILWIND' : me.s.boosting ? 'BOOST' : me.s.tired > 0 ? 'CHARGING…' : me.draft > 0.2 ? 'SLIPSTREAM' : st >= 0.99 ? 'SPACE · BOOST' : '';
    this.speedEl.innerHTML = `<b>${kmh}</b><small>km/h</small><div class="race__boost${st >= 0.99 ? ' is-full' : ''}${me.s.tired > 0 ? ' is-tired' : ''}"><i style="width:${Math.round(st * 100)}%"></i></div><span>${state}</span>${me.helmet ? '<em class="race__shield">golden helmet on</em>' : ''}`;
    // Speed lines round the edge of the screen: from about 55 km/h, stronger flat out and on a boost.
    const lines = me.mode === 'ride' ? Math.min(1, (this.feel ?? 0) * 0.75 + (me.s.boosting || me.tailwind > 0 ? 0.35 : 0)) : 0;
    this.linesEl.hidden = lines < 0.12;
    if (!this.linesEl.hidden) this.linesEl.style.opacity = lines.toFixed(2);
    if (me.wrong && this.phase === 'racing') this._flash('WRONG WAY', 0.4);
    const next = this.phase !== 'done' && me.done == null ? this._nextTurn(me) : null;
    this.turnEl.hidden = !next;
    if (next) {
      const arrow = next.left ? '⬅' : '➡';
      const what = next.sharp ? 'SHARP ' : '';
      const k2 = `${arrow}|${what}|${Math.round(next.metres / 10)}|${next.alley}`;
      if (k2 !== this._turnKey) {
        this._turnKey = k2;
        this.turnEl.className = `race__turn${next.sharp ? ' is-sharp' : ''}${next.metres < 30 ? ' is-near' : ''}`;
        this.turnEl.innerHTML = `<b>${arrow}</b><span>${what}${next.left ? 'LEFT' : 'RIGHT'}${next.alley ? ' · ALLEY' : ''}</span><small>${next.metres < 8 ? 'now' : `${Math.round(next.metres / 10) * 10} m`}</small>`;
      }
    }
    this._warn(me);
    this._minimap();
  }

  /**
   * Something standing in your line ahead (a bin, a planter, a parked scooter) or a car stopped
   * across it: a warning arrow at the top, which way to go round, from about 70 m off.
   */
  _warn(me) {
    let hit = null;
    if (me.mode === 'ride' && this.phase === 'racing' && me.s.v > 6) {
      const s = me.s;
      const h = s.travel ?? s.heading;
      const fx = -Math.sin(h);
      const fz = -Math.cos(h);
      const look = (x, z, r, what) => {
        const along = (x - s.x) * fx + (z - s.z) * fz;
        const side = (x - s.x) * -fz + (z - s.z) * fx;
        if (along < 6 || along > 25 + s.v * 2.5 || Math.abs(side) > r + 0.7) return;
        if (!hit || along < hit.along) hit = { along, side, what };
      };
      for (const o of this.golmok?.near(s.x, s.z, 80) ?? []) look(o.x, o.z, o.r, o.kind === 'pole' ? 'pole' : o.kind);
      for (const v of this.traffic?.near(s.x, s.z, 80) ?? []) if (v.v < 2) look(v.box.x, v.box.z, v.box.halfWidth, v.kind);
    }
    const key = hit ? `${hit.side > 0 ? 'L' : 'R'}|${hit.what}|${Math.round(hit.along / 10)}` : '';
    if (key === this._warnKey) return;
    this._warnKey = key;
    this.warnEl.hidden = !hit;
    if (hit) {
      const name = { planter: 'PLANTER', pots: 'POTS', bin: 'BINS', scooter: 'PARKED SCOOTER', pole: 'POLE', car: 'CAR STOPPED', bus: 'BUS STOPPED' }[hit.what] ?? 'IN THE WAY';
      // it is on the right: go left (and the other way)
      this.warnEl.innerHTML = `<b>⚠</b><span>${name} · ${hit.side > 0 ? '⬅ KEEP LEFT' : 'KEEP RIGHT ➡'}</span><small>${Math.round(hit.along / 10) * 10} m</small>`;
    }
  }

  /** The map in the top left: the streets, the course ahead, traffic, item boxes, everyone; the way you face is up. */
  _minimap() {
    const cv = this.mapEl;
    const g = cv.getContext('2d');
    const W = cv.width;
    const R = W / 2;
    const me = this.me;
    const scale = 1.3; // pixels a metre: about 170 m to the edge
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(20, 18, 34, 0.84)';
    g.fillRect(0, 0, W, W);
    g.translate(R, R * 1.2);
    g.rotate(me.s.heading);
    g.scale(scale, scale);
    g.translate(-me.s.x, -me.s.z);
    g.strokeStyle = 'rgba(160, 170, 195, 0.5)';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const reach = 240;
    const cell = 40;
    const seen = new Set();
    for (let i = Math.floor((me.s.x - reach) / cell); i <= Math.floor((me.s.x + reach) / cell); i++) {
      for (let j = Math.floor((me.s.z - reach) / cell); j <= Math.floor((me.s.z + reach) / cell); j++) {
        for (const s of this.g.roadHash?.get(`${i}_${j}`) ?? []) {
          if (seen.has(s)) continue;
          seen.add(s);
          g.lineWidth = Math.max(2.5, s.half * 1.6);
          g.beginPath();
          g.moveTo(s.ax, s.az);
          g.lineTo(s.bx, s.bz);
          g.stroke();
        }
      }
    }
    const pts = this.course.points;
    const n = pts.length;
    g.strokeStyle = 'rgba(255, 210, 58, 0.35)';
    g.lineWidth = 7;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.stroke();
    g.strokeStyle = '#ffd23a';
    g.lineWidth = 10;
    g.beginPath();
    for (let k = 0; k < 40; k++) {
      const p = pts[(me.idx + k) % n];
      if (k) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(pts[0][0], pts[0][1], 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff7aa8';
    for (const b of this.boxes?.live() ?? []) {
      g.beginPath();
      g.arc(b.x, b.z, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    for (const v of this.traffic?.vehicles ?? []) {
      g.save();
      g.translate(v.box.x, v.box.z);
      g.rotate(-v.box.heading);
      g.fillStyle = v.kind === 'bus' ? '#7fd1ff' : v.kind === 'scooter' ? '#ffb02e' : '#e8e8ee';
      g.fillRect(-v.box.halfWidth, -v.box.halfLength, v.box.halfWidth * 2, v.box.halfLength * 2);
      g.restore();
    }
    for (const r of this.racers) {
      if (r === me || r.left) continue;
      g.fillStyle = r.color;
      g.strokeStyle = '#fff';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(r.s.x, r.s.z, 6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
    g.fillStyle = '#ffd23a';
    g.strokeStyle = '#1a1222';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(R, R * 1.2 - 15);
    g.lineTo(R + 10, R * 1.2 + 11);
    g.lineTo(R, R * 1.2 + 5);
    g.lineTo(R - 10, R * 1.2 + 11);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.stroke();
  }

  _results() {
    if (this.phase !== 'done') return;
    const order = this._order();
    if (this.me?.done != null && order.indexOf(this.me) === 0) this.g.music?.cue('victory');
    const s = this.session;
    const host = !s?.room || s.isHost;
    this.resultEl.hidden = false;
    this.resultEl.innerHTML = `
      <h2>${this.me.done != null ? `You finished ${ordinal(order.indexOf(this.me) + 1)}` : 'Race over'}</h2>
      <table><thead><tr><th></th><th>Rider</th><th>Time</th><th>Best lap</th><th>Falls</th><th>Close calls</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'is-me' : ''}"><td>${i + 1}</td><td><i style="background:${r.color}"></i>${esc(r.ch.name)} <small>${esc(r.name)}${r.bot ? ' · bot' : ''}</small></td><td>${r.done != null ? clock(r.done) : 'DNF'}</td><td>${clock(r.best)}</td><td>${r.crashes}</td><td>${r.misses}</td></tr>`).join('')}
      </tbody></table>
      <div class="race__row">${host ? '<button type="button" class="race__go" data-race-again>Race again</button>' : '<span>The host can start another.</span>'}<button type="button" data-race-menu>Courses</button><button type="button" data-race-quit>Back to Seoul</button><button type="button" class="race__credits" data-race-credits>ⓒ Credits</button></div>`;
    const $ = (q) => this.resultEl.querySelector(q);
    $('[data-race-credits]').onclick = () => this.g.toggleCredits(true);
    if ($('[data-race-again]')) $('[data-race-again]').onclick = () => (s?.room ? this.startRoom() : this.startSolo());
    $('[data-race-menu]').onclick = () => {
      this._end();
      this.menu();
    };
    $('[data-race-quit]').onclick = () => this.quit();
  }

  /**
   * Pause (Esc or P during a race): the race stands still behind a small panel — resume,
   * start again, the courses, back to Seoul, and the credits.
   */
  togglePause(on = !this.paused) {
    if (!this.course || !['grid', 'racing'].includes(this.phase)) on = false;
    this.paused = on;
    this.g.keys.clear();
    this.g.root.classList.toggle('is-paused', on);
    const p = this.pauseEl;
    p.hidden = !on;
    // (not caught mid-blink after a knock)
    if (this.me) this.me.view.root.visible = true;
    if (this._hub && on) this._hub.gain.gain.value = 0;
    if (on) this._wind?.set(0);
    if (!on) {
      this.g.toggleCredits(false);
      return;
    }
    const room = Boolean(this.session?.room);
    p.innerHTML = `<h2>Paused</h2>${room ? '<p class="race__note">The race goes on for your friends: your scooter coasts.</p>' : ''}
      <div class="race__col">
        <button type="button" class="race__go" data-pause-resume>Resume <small>Esc</small></button>
        ${room ? '' : '<button type="button" data-pause-restart>Start again</button>'}
        <button type="button" data-pause-menu>Courses</button>
        <button type="button" data-pause-quit>Back to Seoul</button>
        <button type="button" class="race__credits" data-credits-open-race>ⓒ Credits</button>
      </div>`;
    const $ = (q) => p.querySelector(q);
    $('[data-pause-resume]').onclick = () => this.togglePause(false);
    if ($('[data-pause-restart]')) $('[data-pause-restart]').onclick = () => {
      this.togglePause(false);
      this.startSolo();
    };
    $('[data-pause-menu]').onclick = () => {
      this.togglePause(false);
      this._end();
      this.menu();
    };
    $('[data-pause-quit]').onclick = () => {
      this.togglePause(false);
      this.quit();
    };
    $('[data-credits-open-race]').onclick = () => this.g.toggleCredits(true);
  }

  /**
   * The chase camera: behind the rider and a little up and to the left (a three-quarter view, so
   * the scooter's deck, stem and wheels show past the rider, and the road ahead stays in view),
   * swinging after them; wider when sprinting. Left-drag looks round.
   */
  camera(camera) {
    const g = this.g;
    const r = this.me;
    if (!r) return;
    if (performance.now() - (g.dragAt ?? 0) > 1000) {
      const behind = r.mode === 'ride' ? r.s.travel ?? r.s.heading : g.yaw;
      g.yaw += turn(g.yaw, behind) * 0.1;
      // A little higher in the alleys, to see over the clutter round the next corner.
      const alley = isSmall(this.course.points[r.idx]?.[3] ?? 4) && (this.course.points[r.idx]?.[2] ?? 6) < 5;
      g.pitch += ((alley ? -0.36 : CHASE.pitch) - g.pitch) * 0.05;
    }
    const dir = new THREE.Vector3(-Math.sin(g.yaw) * Math.cos(g.pitch), Math.sin(g.pitch), -Math.cos(g.yaw) * Math.cos(g.pitch));
    // To the camera's side: left of the way it looks (toward the road's middle, riding on the right).
    const side = new THREE.Vector3(-Math.cos(g.yaw), 0, Math.sin(g.yaw)).multiplyScalar(CHASE.side);
    const focus = new THREE.Vector3(r.s.x - Math.sin(g.yaw) * CHASE.ahead, r.y + CHASE.height, r.s.z - Math.cos(g.yaw) * CHASE.ahead).addScaledVector(side, 0.3);
    // Never inside a building: in a turning alley the camera comes in close (and a little up) instead.
    let dist = (g.zoom ?? CHASE.zoom) + Math.min(1.5, Math.abs(r.s.v) * 0.07);
    // (Where the map's buildings overlap the alley itself, the rider is "inside" one: no pulling in then.)
    const inside = g.buildingAt(r.s.x, r.s.z);
    // Nor inside a car or a bus beside you: the camera comes in over it instead.
    const cars = (this.traffic?.vehicles ?? []).filter((v) => Math.hypot(v.box.x - r.s.x, v.box.z - r.s.z) < dist + 8);
    for (let d = 1.2; d <= dist; d += 0.4) {
      const x = focus.x - dir.x * d + side.x * 0.7 * (d / dist);
      const z = focus.z - dir.z * d + side.z * 0.7 * (d / dist);
      const y = focus.y - dir.y * d;
      if ((!inside && g.buildingAt(x, z)) || cars.some((v) => inBox(v, x, y, z, 0.45))) {
        dist = Math.max(2.2, d - 0.5);
        break;
      }
    }
    this._camDist = this._camDist == null ? dist : this._camDist + (dist - this._camDist) * (dist < this._camDist ? 0.5 : 0.06);
    camera.position.copy(focus).addScaledVector(dir, -this._camDist).addScaledVector(side, 0.7);
    // pulled in close (a wall, a car), it rises to look over the rider rather than into their back
    camera.position.y += Math.max(0, 4 - this._camDist) * 0.5;
    camera.position.y = Math.max(camera.position.y, g.surfaceAt(camera.position.x, camera.position.z, r.y) + 0.9);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - 1 / 60);
      camera.position.x += (Math.random() - 0.5) * this.shake * 0.6;
      camera.position.y += (Math.random() - 0.5) * this.shake * 0.4;
    }
    // At speed a gentle buzz (a centimetre or two, two unrelated sines; more on rough paving), never a jolt.
    const feel = r.mode === 'ride' ? this.feel ?? 0 : 0;
    if (feel > 0) {
      const t = performance.now() / 1000;
      const rough = r.s.bump ?? 0;
      const a = 0.012 * feel + rough * 0.01;
      camera.position.x += (Math.sin(t * 41) + Math.sin(t * 27.3) * 0.6) * a;
      camera.position.y += (Math.sin(t * 37.1) + Math.sin(t * 19.7) * 0.5) * a * 0.8;
    }
    camera.lookAt(focus);
    // The FOV opens with speed (58° standing, about 71° flat out) and kicks wider on a boost.
    const v = Math.abs(r.s.v);
    const fov = 58 + 13 * Math.min(1, Math.max(0, (v - 4) / 16)) + (r.s.boosting || r.tailwind > 0 ? 6 : 0);
    camera.fov += (fov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------ sound */

  _audio() {
    return this.g.street?._audio?.();
  }

  _beep(freq) {
    const a = this._audio();
    if (!a) return;
    const o = a.createOscillator();
    const gain = a.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
    o.connect(gain).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.32);
  }

  /** The bell (Shift, or B): ring-ring — people just ahead step aside, slower riders and scooters ahead give you room. */
  bell() {
    const me = this.me;
    if (!me || me.mode !== 'ride' || this.paused) return;
    if (this.clock - (me.rang ?? -9) < 0.45) return;
    me.rang = this.clock;
    this.ringBell(me);
  }

  /**
   * Any racer's bell: its sound (yours full; a rival's from where they are, if near), people ahead
   * stepping aside, slower riders and delivery scooters ahead easing to the side. Online, your own
   * racers' rings go to the room.
   */
  ringBell(r, heard = false) {
    const s = r.s;
    this._bellSound(r);
    if (r.mine) {
      this.g.life?.shoo(s.x, s.z, s.heading, 18, false);
      this.traffic?.bell?.(s.x, s.z, s.heading, 22);
      // riders ahead and slower in your line drift over a little
      for (const o of this.racers) {
        if (o === r || o.left || o.mode !== 'ride') continue;
        const dx = o.s.x - s.x;
        const dz = o.s.z - s.z;
        const along = dx * -Math.sin(s.heading) + dz * -Math.cos(s.heading);
        const side = dx * Math.cos(s.heading) - dz * Math.sin(s.heading);
        if (along > 0 && along < 16 && Math.abs(side) < 1.6 && o.s.v < s.v + 1) o.yieldT = 1.4;
      }
      if (this.session?.room && !heard) this.session.send({ t: 'race-bell', id: r.id });
    }
    if (r.me) this.fx?.pop('RING RING!', { x: s.x, y: r.y + 2.3, z: s.z, ride: s }, { color: '#ffd23a', size: 0.75 });
  }

  /** The bell's sound for a racer: yours as it is, anyone else's quieter with distance and to their side. */
  _bellSound(r) {
    const a = this._audio();
    if (!a) return 0;
    const cam = this.g.camera;
    let gain = 1;
    let pan = 0;
    if (!r.me) {
      const dx = r.s.x - cam.position.x;
      const dz = r.s.z - cam.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 70) return 0;
      gain = 0.85 / (1 + d / 9);
      const yaw = this.g.yaw ?? 0;
      pan = Math.max(-0.9, Math.min(0.9, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(4, d)));
    }
    // each rider's bell a little different
    const pitch = 0.94 + ((r.id.length * 7 + r.id.charCodeAt(r.id.length - 1)) % 9) * 0.015;
    const n = ringBell(a, { gain, pan, pitch });
    this.bells = (this.bells ?? 0) + 1;
    this.lastBell = { id: r.id, sources: n, at: a.currentTime, gain };
    return n;
  }

  _ding(freq, times = 1) {
    const a = this._audio();
    if (!a) return;
    for (let k = 0; k < times; k++) {
      const t = a.currentTime + k * 0.16;
      for (const [f, v] of [[freq, 0.12], [freq * 2.76, 0.04]]) {
        const o = a.createOscillator();
        const gain = a.createGain();
        o.frequency.value = f;
        gain.gain.setValueAtTime(v, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(gain).connect(a.destination);
        o.start(t);
        o.stop(t + 0.52);
      }
    }
  }

  _whoosh(k = 1) {
    const a = this._audio();
    if (!a) return;
    this._nbuf ??= (() => {
      const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();
    const src = a.createBufferSource();
    src.buffer = this._nbuf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(2600, a.currentTime + 0.4 * k);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.001, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, a.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.45 * k);
    src.connect(f).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 0.5 * k);
  }

  _clang() {
    this._ding(660, 1);
    this.g.street?._thud?.(0.5);
  }

  _fanfare(win) {
    const a = this._audio();
    if (!a) return;
    (win ? [523, 659, 784, 1047] : [523, 659, 784]).forEach((f, i) => {
      const t = a.currentTime + i * 0.13;
      const o = a.createOscillator();
      const gain = a.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(gain).connect(a.destination);
      o.start(t);
      o.stop(t + 0.42);
    });
  }

  /** The hub motor's whine, rising with speed (higher on a boost); the tyres' hiss. */
  _motorSound(r) {
    const a = this._audio();
    if (!a) return;
    if (!this._hub) {
      const o = a.createOscillator();
      o.type = 'triangle';
      const o2 = a.createOscillator();
      o2.type = 'sine';
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 1.2;
      const gain = a.createGain();
      gain.gain.value = 0;
      o.connect(f);
      o2.connect(f);
      f.connect(gain).connect(a.destination);
      o.start();
      o2.start();
      this._hub = { o, o2, gain };
    }
    const t = a.currentTime;
    const v = Math.abs(r.s.v);
    const f0 = 170 + v * 30 + (r.s.boosting ? 90 : 0);
    this._hub.o.frequency.setTargetAtTime(f0, t, 0.08);
    this._hub.o2.frequency.setTargetAtTime(f0 * 1.5, t, 0.08);
    this._hub.gain.gain.setTargetAtTime(v < 0.3 ? 0 : r.s.throttle ? 0.016 + (r.s.boosting ? 0.01 : 0) : 0.006, t, 0.12);
    // and the wind, opening up with speed (a gust in a near miss or a boost)
    this._wind ??= windNoise(a);
    this._wind.set(r.mode === 'ride' ? this.feel ?? 0 : 0, r.s.boosting || r.tailwind > 0 ? 0.6 : 0);
  }

  horn() {
    this.bell();
  }

  /** 1, 2, 3: use the item in that slot (from the key handler, so a quick tap counts). */
  useSlot(i) {
    const me = this.me;
    if (!me || this.phase !== 'racing' || me.mode !== 'ride' || me.done != null) return;
    this._use(me, i);
  }

  /** Take the race down (riders, course, street dressing, HUD), keeping the room. */
  _end() {
    clearTimeout(this._planT);
    if (this.paused) this.togglePause(false);
    for (const r of this.racers) {
      r.view.dispose();
      r.heldMesh?.removeFromParent();
    }
    this.racers = [];
    for (const b of [...(this.branches ?? [])]) this._dropBranch(b);
    for (const f of this.fans ?? []) f.remove();
    this.fans = [];
    for (const k of ['traffic', 'boxes', 'golmok', 'facades', 'fx', 'wet', 'speedFx']) {
      this[k]?.dispose();
      this[k] = null;
    }
    if (this.decor) this.g.scene.remove(this.decor);
    this.decor = null;
    for (const t of this._boardTex ?? []) t.dispose();
    for (const m of this._boardMats ?? []) m.dispose();
    this.boards = [];
    this.chevrons = null;
    this.gate = null;
    this.course = null;
    this.me = null;
    this._show(false);
    this.countEl.hidden = true;
    this.hintEl.hidden = true;
    this.warnEl.hidden = true;
    this._warnKey = '';
    this.msgEl.hidden = true;
    this.resultEl.hidden = true;
    if (this._hub) this._hub.gain.gain.value = 0;
    this._wind?.set(0);
    this.g.raceSky?.(null);
  }

  /** Leave racing altogether: back to flying over Seoul. */
  quit() {
    this._end();
    this.session?.close();
    this.session = null;
    this.menuEl.hidden = true;
    this.phase = 'off';
    if (this.g.mode === 'race') this.g.setMode('fly', { fromRace: true });
  }

  dispose() {
    this.quit();
    for (const n of [this.menuEl, this.mapEl, this.turnEl, this.posEl, this.lapEl, this.boardEl, this.speedEl, this.timeEl, this.itemsEl, this.countEl, this.msgEl, this.linesEl, this.resultEl, this.pauseEl, this.hintEl, this.warnEl]) n.remove();
  }
}
