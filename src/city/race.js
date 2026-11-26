import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Session } from '../net/Session.js';
import { BIKE_COURSES, LEVELS, planCourse, finishCourse, locate, isSmall, courseStats } from './course.js';
import { Walls, tileRings, RIDER_RADIUS } from './walls.js';
import { TILE, decodeTile, tileKey, tileOf } from './tiles.js';
import { bikeGap, closeCall, slipstream, NEAR_MISS, wrongWay } from './ride.js';
import { SCOOT, GRIP, SCOOTER_ORDER, newScoot, stepScoot, cornerSpeed, specFor, cleanScooter } from './scoot.js';
import { Lobby } from './lobby.js';
import { JaraniStage } from './stage.js';
import { SpeedFx, speedFeel, windNoise } from './speedfx.js';
import { ringBell } from './bell.js';
import { THROW, branchModel, branchTarget, throwPlan, flightAt, snapSound, leafBurst, stepLeaves } from './branch.js';
import { CREW, CREW_ORDER, rider, botRiders } from './crew.js';
import { faceSvg } from '../snowpuff/riders.js';
import { PlushRider, sculptSpecies } from './plushRider.js';
import { Podium, PODIUM_SECONDS } from './podium.js';
import { PoliceStops, POLICE, policeTarget } from './police.js';
import { RaceTraffic } from './traffic.js';
import { ITEMS, rollItem, ItemBoxes, itemIcon, blobTexture } from './items.js';
import { MARBLE, MarbleField, pourMarbles, pourBand, corridorClamp, stepMarble, marbleFall, marblesAt, patchBounds, rattle } from './marbles.js';
import { HelmetDrops } from './helmet.js';
import { HillWood } from './hillwood.js';
import { loadProgress, saveProgress, recordRun } from './progress.js';
import { Fairground } from './fairground.js';
import { GlowTrail } from './trail.js';
import { RaceMinimap } from './minimap.js';
import { RivalPanel } from './rivalPanel.js';
import { ComicFx } from './comic.js';
import { Golmok } from './golmok.js';
import { Facades } from './facades.js';
import { raceSky, TIME_PICKS, WEATHER_PICKS, WEATHERS } from './weather.js';
import { WetFx } from './wetfx.js';
import { modeHint } from './controls.js';
import { laneBand, laneShares, gridSlots, behindStart, lateralOf, bikeContact, resolveBump } from './pack.js';

/**
 * Kickrani: an electric-scooter race through Seoul's streets and
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
 * (A D), drift (Shift, round the tight corners), brake (S), boost (F, on the
 * battery gauge), ring the bell (Space, or B), and use what the item boxes give you (1–3) — a branch thrown
 * into the wheel of the rider right ahead among them (branch.js). Riders bump and wobble off
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
/** How fast (m/s) a head-on wall knocks you off: about 38 km/h; slower is a bonk and a stop. */
const WALL_FALL = 10.5;
const DOWN = 1.55;
/**
 * The energy drink: a gulp, then `boost` seconds of boost at once (to the scooter's boost speed,
 * `extra` m/s over it, costing no gauge), and the gauge filled up again at `fill` a second — about
 * ten metres gained on a straight: worth having, not a win.
 */
export const DRINK = { boost: 3, extra: 0.4, fill: 1.5 };
/** Seconds the race stays open for the others once the first rider is home (then the rest are DNF). */
export const FINISH_WINDOW = 30;

export { botRiders };

/**
 * Scooters for the bots: all different where there are enough, a mix of fast and nimble — never
 * the whole field on the fastest.
 */
export function botScooters(n, random = Math.random) {
  const pool = SCOOTER_ORDER.slice().sort(() => random() - 0.5);
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

/** The nearest point of an open line of points to (x, z), searched between two indices; how far off its segments. */
function locateOn(pts, x, z, lo, hi) {
  const n = pts.length;
  let best = Math.max(0, Math.min(n - 1, lo));
  let bd = Infinity;
  for (let i = Math.max(0, lo); i <= Math.min(n - 1, hi); i++) {
    const d = Math.hypot(pts[i][0] - x, pts[i][1] - z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  let off = bd;
  for (const [a, b] of [[best - 1, best], [best, best + 1]]) {
    if (a < 0 || b >= n) continue;
    const P = pts[a];
    const Q = pts[b];
    const dx = Q[0] - P[0];
    const dz = Q[1] - P[1];
    const t = Math.max(0, Math.min(1, ((x - P[0]) * dx + (z - P[1]) * dz) / (dx * dx + dz * dz || 1)));
    off = Math.min(off, Math.hypot(x - P[0] - dx * t, z - P[1] - dz * t));
  }
  return { i: best, off };
}

/**
 * Which points of a course are out on a wooded hill: a small street (the park road) with no building
 * within 22 m either side. A flag per point, smoothed so a short gap in the woods (a hut by the road)
 * doesn't break the guard rail.
 */
export function wildStretches(c, walls) {
  const n = c.points.length;
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = c.points[i];
    const q = c.points[Math.min(n - 1, i + 1)] === p ? c.points[i - 1] : c.points[Math.min(n - 1, i + 1)];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const rx = -(q[1] - p[1]) / L;
    const rz = (q[0] - p[0]) / L;
    const reach = (p[2] ?? 6) / 2 + 22;
    raw[i] = isSmall(p[3] ?? 4) && (!walls || (walls.ray(p[0], p[1], rx, rz, reach) >= reach && walls.ray(p[0], p[1], -rx, -rz, reach) >= reach)) ? 1 : 0;
  }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) k += raw[j];
    out[i] = raw[i] || k >= 5 ? 1 : 0;
  }
  return out;
}

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
    this.scooter = 'city';
    try {
      this.scooter = cleanScooter(localStorage.getItem('gamory.jarani.scooter'));
    } catch {
      /* private mode */
    }
    this.picks = new Map();
    this._hud();
    this.lobby = new Lobby(this);
  }

  _saveChar() {
    try {
      localStorage.setItem('gamory.jarani.rider', this.char);
      localStorage.setItem('gamory.jarani.scooter', this.scooter);
    } catch {
      /* private mode */
    }
    if (this.session?.room) {
      if (this.session.isHost) {
        this.picks.set(this.session.id, { char: this.char, scooter: this.scooter });
        this.session.send({ t: 'race-picks', picks: [...this.picks] });
      } else this.session.send({ t: 'race-pick', char: this.char, scooter: this.scooter });
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
    this.scEl = el('race__sc');
    this.helmetEl = el('race__helmet');
    // after you are home: Enter or this skips the wait for the others (the host's, in a room)
    this.skipEl = el('race__skip', 'button');
    this.skipEl.type = 'button';
    this.skipEl.innerHTML = 'Skip <kbd>⏎</kbd>';
    this.skipEl.onclick = () => this.skipWait();
    this.minimap = new RaceMinimap(this.mapEl);
    // a click on the map: north up, or turning with you
    this.mapEl.onclick = () => this.minimap.toggle();
  }

  _show(on) {
    for (const n of [this.mapEl, this.posEl, this.lapEl, this.boardEl, this.speedEl, this.timeEl, this.itemsEl]) n.hidden = !on;
    if (!on) {
      this.turnEl.hidden = true;
      this.linesEl.hidden = true;
      this.helmetEl.hidden = true;
      this.skipEl.hidden = true;
      this.panel?.hide();
    }
    this.g.root.classList.toggle('is-racing', on);
  }

  /**
   * The race menus (lobby.js over the 3D stage, stage.js): rider → scooter → course → time and
   * weather → go, alone or together. `step` opens at one of them (the results' "Courses" opens on
   * the course).
   */
  menu(note = '', step = null) {
    this.phase = this.session?.room ? 'lobby' : 'menu';
    this._show(false);
    this.resultEl.hidden = true;
    this.lobby.open(step ?? this.lobby.step, note);
    // Plan the courses (and say how long) while the menu is up, one at a time — the one picked first.
    clearTimeout(this._planT);
    const todo = [BIKE_COURSES.find((c) => c.id === this.courseId), ...BIKE_COURSES.filter((c) => c.id !== this.courseId)].filter((c) => c && !this.plans.has(c.id));
    const next = async () => {
      const c = todo.shift();
      if (!c || this.phase === 'off') return;
      await this._plan(c.id);
      this._planT = setTimeout(next, 30);
    };
    this._planT = setTimeout(next, 50);
  }

  /** The level of the course picked (course.js LEVELS): its bots, traffic and item odds. */
  _level() {
    return LEVELS[BIKE_COURSES.find((c) => c.id === this.courseId)?.level ?? 'easy'] ?? LEVELS.easy;
  }

  /** The 3D stage behind the menus. */
  makeStage() {
    return new JaraniStage(this.g.renderer).build();
  }

  _note(text) {
    const n = this.menuEl.querySelector('[data-race-note]');
    if (n) n.textContent = text;
  }

  /** The host's picks (course, laps, time, weather), sent to the room; `redraw` the menu after. */
  _setup({ course = this.courseId, laps = this.laps, time = this.time, weather = this.weatherPick }, redraw = true) {
    Object.assign(this, { courseId: course, laps, time, weatherPick: weather });
    if (this.session?.room && this.session.isHost) this.session.send({ t: 'race-setup', course, laps, time, weather });
    if (redraw) this.menu();
  }

  /** The roads and small streets near a course. */
  _roadsNear(def, reach) {
    const roads = [];
    for (const list of this.g.roadTiles?.values() ?? []) for (const r of list) if (Math.abs(r.pts[0] - def.x) < reach && Math.abs(r.pts[1] - def.z) < reach) roads.push(r);
    return roads;
  }

  /**
   * The buildings round a course, as walls a bike can't ride through (walls.js): read from the
   * same map tiles the city stands up, all of them round the course at once (not only those in
   * view: a bot round the far side meets them too). Kept for the next race there.
   */
  async _walls(def, reach) {
    this.wallSets ??= new Map();
    const key = `${def.id}|${reach}`;
    if (this.wallSets.has(key)) return this.wallSets.get(key);
    const walls = new Walls();
    const O = this.g.origin;
    const [tx0, ty0] = tileOf(def.x - reach + O.x, -(def.z + reach) + O.y);
    const [tx1, ty1] = tileOf(def.x + reach + O.x, -(def.z - reach) + O.y);
    const jobs = [];
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        // (only the tiles the map has: none over the river or past the city's edge)
        if (this.g.index?.tiles && !this.g.index.tiles[tileKey(tx, ty)]) continue;
        jobs.push(fetch(`${this.g.base}${tileKey(tx, ty)}.bin`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((buf) => {
          if (!buf) return;
          for (const ring of tileRings(decodeTile(new Uint8Array(buf)), tx, ty, TILE, O)) walls.addRing(ring.xs, ring.zs);
        }).catch(() => {}));
      }
    }
    await Promise.all(jobs);
    this.wallSets.set(key, walls);
    return walls;
  }

  /**
   * A course, planned once on the real streets, between the real buildings (and started where a grid
   * of four fits), with its golmok short cuts. The same streets and buildings give everyone in a
   * room the same course.
   */
  _plan(id) {
    this.planning ??= new Map();
    if (this.plans.has(id)) return Promise.resolve(this.plans.get(id));
    if (this.planning.has(id)) return this.planning.get(id);
    const job = (async () => {
      const def = BIKE_COURSES.find((c) => c.id === id);
      if (!def || !this.g.roadTiles) return null;
      const walls = await this._walls(def, def.r * 4);
      let c = planCourse(this._roadsNear(def, def.r * 4), def, { bike: true, walls });
      // Without the small streets (or where they are thin), a wider loop on the big roads.
      if (!c) c = planCourse(this._roadsNear(def, def.r * 8), { ...def, r: def.r * 1.8 }, { bike: true, target: 2600, walls });
      if (!c) return null;
      c = finishCourse(c, { walls });
      c.def = def;
      c.walls = walls;
      // Out on a wooded hill (the downhill's park road): no building near on either side — guard rails and woods there.
      if (def.mountain) c.wild = wildStretches(c, walls);
      this.plans.set(id, c);
      this.lobby.planned(id);
      return c;
    })();
    this.planning.set(id, job);
    job.finally(() => this.planning.delete(id));
    return job;
  }

  _lenText(c) {
    const st = courseStats(c);
    const sc = c.shortcuts?.length ?? 0;
    return `${(c.length / 1000).toFixed(1)} km · ${Math.round(st.wide * 100)}% wide roads · ${st.sharp} sharp turn${st.sharp === 1 ? '' : 's'}${sc ? ` · ${sc} short cut${sc > 1 ? 's' : ''}` : ''}`;
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
      this.picks.set(msg.from, { char: msg.char, scooter: cleanScooter(msg.scooter) });
      // Everyone in the lobby sees who picked whom.
      this.session.send({ t: 'race-picks', picks: [...this.picks] });
      if (this.phase === 'lobby') this.menu();
      return;
    }
    const fromHost = msg.from === this.session?.host;
    if (msg.t === 'race-picks' && fromHost) {
      for (const [id, c] of msg.picks ?? []) {
        const pick = typeof c === 'string' ? { char: c, scooter: 'city' } : c;
        if (CREW[pick?.char] && id !== this.session.id) this.picks.set(id, { char: pick.char, scooter: cleanScooter(pick.scooter) });
      }
      if (this.phase === 'lobby') this.menu();
    } else if (msg.t === 'race-setup' && fromHost) {
      Object.assign(this, { courseId: msg.course, laps: msg.laps, time: msg.time ?? 'random', weatherPick: msg.weather ?? 'random' });
      if (this.phase === 'lobby') this.menu();
    } else if (msg.t === 'race-skip' && fromHost) {
      this._over(0.3);
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
        // (their helmet gone while they are still riding: it saved them — it flies off here too)
        const helmet = Boolean(flags & 8);
        if (r.helmet && !helmet && mode === 'ride') this._helmetSaved(r, false);
        r.helmet = helmet;
        r.tailwind = flags & 16 ? 1 : 0;
        r.drinkT = flags & 32 ? Math.max(r.drinkT ?? 0, 0.2) : 0;
        r.slip = flags & 64 ? 1 : Math.max(0, (r.slip ?? 0) - 0.1);
        if (mode !== r.mode) {
          r.mode = mode;
          r.crashT = 0;
          if (mode === 'tumble') this._crashFx(r);
        }
      }
    } else if (msg.t === 'race-branch') {
      const r = this.racers.find((q) => q.id === msg.id);
      if (r && r.owner !== this.session?.id && !this.branches?.some((b) => b.bid === msg.bid)) this._addBranch(r, msg.plan, msg.bid, msg.waste);
    } else if (msg.t === 'race-branch-gone') {
      const b = this.branches?.find((q) => q.bid === msg.bid);
      const v = this.racers.find((q) => q.id === msg.by);
      if (v && msg.fell) v.fallKind = 'wheel';
      if (b) this._snapBranch(b, v);
    } else if (msg.t === 'race-marbles') {
      const r = this.racers.find((q) => q.id === msg.id);
      if (r && r.owner !== this.session?.id && !this.patches?.some((p) => p.mid === msg.plan?.mid)) this._addPatch(msg.plan);
    } else if (msg.t === 'race-police') {
      const by = this.racers.find((q) => q.id === msg.id);
      const target = this.racers.find((q) => q.id === msg.target);
      if (by && target && by.owner !== this.session?.id) this._policeArrive(by, target, msg.side);
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
    const grid = [{ id: 'me', name: this.g.account?.name ?? 'You', owner: 'me', char: this.char, scooter: this.scooter }];
    const rides = botScooters(SEATS - 1);
    // (the bots as sharp as the course's level asks)
    const skills = this._level().bots;
    botRiders(this.char, SEATS - 1).forEach((c, i) => grid.push({ id: `bot${i}`, name: BOT_NAMES[i], owner: 'me', bot: true, skill: skills[i] ?? 0.9, char: c, scooter: rides[i] }));
    this.myId = 'me';
    this._begin(grid, raceSky(this.time, this.weatherPick));
  }

  startRoom() {
    const s = this.session;
    if (!s?.isHost) return;
    const people = [...s.peers.values()].slice(0, SEATS);
    this.picks.set(s.id, { char: this.char, scooter: this.scooter });
    const grid = people.map((p) => ({ id: p.id, name: p.name, owner: p.id, char: this.picks.get(p.id)?.char ?? 'fox', scooter: cleanScooter(this.picks.get(p.id)?.scooter) }));
    const bots = botRiders(grid[0]?.char ?? this.char, CREW_ORDER.length - 1).filter((c) => !grid.some((g) => g.char === c));
    const rides = botScooters(SEATS);
    const skills = this._level().bots;
    for (let i = grid.length; i < SEATS; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i - 1] ?? 'Bot', owner: s.id, bot: true, skill: (skills[i - 1] ?? 0.92) + 0.01, char: bots.shift() ?? CREW_ORDER[i % CREW_ORDER.length], scooter: rides[i] });
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
    this._note('Planning the course…');
    const course = await this._plan(this.courseId);
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
    // (a point-to-point course is one run)
    if (course.open) this.laps = 1;
    this._paths();
    this.myId = this.session?.id ?? 'me';
    this.menuEl.hidden = true;
    this.lobby.close();
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
      const ride = cleanScooter(g.scooter);
      const view = new PlushRider(char, { body, trim: twice ? ch.scooter : ch.trim, screen: g.id === this.myId, fur: 10, ride });
      this.g.scene.add(view.root);
      return {
        ...g,
        char,
        ch,
        color: body,
        scooter: ride,
        spec: specFor(ride, ch.spec),
        view,
        mine: g.owner === this.myId,
        me: g.id === this.myId,
        s: newScoot(x, z, hd),
        y: this.g.surfaceAt(x, z),
        idx: back,
        // (behind the line: a point-to-point course counts from its start line, a loop from its point 0)
        dist: course.open ? course.s[back] - course.s[course.startI] : course.s[back] - course.length,
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
        drinkT: 0,
        slip: 0,
        slips: 0,
        mode: 'ride',
        crashT: 0,
        safe: 0,
        crashes: 0,
        misses: 0,
        stuck: 0,
        net: null,
        sc: null,
        si: 0
      };
    });
    for (const r of this.racers) this._clear(r);
    this.me = this.racers.find((r) => r.me);
    this.fx = new ComicFx(this.g.scene);
    this.police = new PoliceStops(this.g.scene);
    this.traffic = new RaceTraffic(this.g, this);
    this.boxes = new ItemBoxes(this.g, course);
    this.patches = [];
    this.marbleField = new MarbleField(this.g.scene, blobTexture());
    this.helmetDrops = new HelmetDrops(this.g.scene);
    this.trails = new Map();
    this.minimap.layer = null;
    this.minimapT = 0;
    // The rival panel (rivalPanel.js): its snapshot rendered once now, while the lights count down.
    this.panel ??= new RivalPanel(this.g.renderer, this.g.root);
    this.panel.hooks = { aim: (o) => this._panelSpot(o), isolate: (on, o) => this._panelIsolate(on, o) };
    this.panel.hide();
    this._warmPanel = true;
    // The street along the course, and down each short cut's golmok (its walls solid: course.walls) —
    // each alley's mouth a dropped kerb where it crosses a road's pavement.
    // (the menus draw their own stage, not the city: its road lookup may not be made yet)
    this.g.roadHash ??= new Map();
    const lines = [course.points, ...(course.shortcuts ?? []).map((sc) => sc.points)];
    this.g.setMouths?.(lines);
    this.golmok = new Golmok(this.g, course, { open: Boolean(course.open), walls: course.walls, avoid: lines.slice(1), mountain: course.def?.mountain ? course.wild : null });
    this.golmoks = (course.shortcuts ?? []).map((sc, k) => new Golmok(this.g, { id: sc.id, points: sc.points }, { open: true, walls: course.walls, avoid: lines.filter((_, j) => j !== k + 1), shortcut: true }));
    this.facades = new Facades(this.g, course);
    this.wood = course.wild ? new HillWood(this.g, course, course.wild) : null;
    this.fair = course.def?.fair ? new Fairground(this.g, course) : null;
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

  /**
   * What the wheels go over on the way round: steel road plates over roadworks (common on Seoul's
   * roads), manhole covers, and on the narrower roads a painted speed bump — each in the racing
   * line's half of the street, the same for everyone (placed by the course's own points). Small
   * hard wheels feel them: scoot.js `bump`, softened by the suspension (shock absorption).
   */
  _plates() {
    const c = this.course;
    const n = c.points.length;
    const list = [];
    // (a point-to-point course: from just after its start line to just before its finish)
    let i = c.open ? c.startI + 30 : 40;
    let k = 0;
    while (i < (c.open ? c.finishI - 8 : n - 20)) {
      const p = c.points[i];
      const q = c.points[(i + 1) % n];
      const hd = heading(p, q);
      const w = p[2] ?? 8;
      const band = laneBand(w, isSmall(p[3] ?? 4), false, Boolean(p[4]));
      const kind = w < 9 && k % 3 === 2 ? 'hump' : k % 2 ? 'manhole' : 'plate';
      const lat = kind === 'hump' ? 0 : band.lo + (band.hi - band.lo) * (0.2 + ((k * 0.37) % 0.6));
      const half = kind === 'hump' ? { along: 0.45, across: Math.max(1.5, w / 2 - 0.4) } : kind === 'plate' ? { along: 1.2, across: 0.95 } : { along: 0.38, across: 0.38 };
      const x = p[0] + Math.cos(hd) * lat;
      const z = p[1] - Math.sin(hd) * lat;
      if (!c.walls?.hits(x, z, 1)) list.push({ id: list.length, x, z, hd, kind, half, k: kind === 'hump' ? 1 : kind === 'plate' ? 0.75 : 0.5, i });
      k++;
      i += 17 + ((k * 7) % 9);
    }
    this.plates = list;
    if (!list.length) return;
    const mk = (kind, geo, mat) => {
      const items = list.filter((pl) => pl.kind === kind);
      if (!items.length) return;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      const m = new THREE.Matrix4();
      const qn = new THREE.Quaternion();
      items.forEach((pl, j) => {
        qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.hd);
        const sx = kind === 'hump' ? pl.half.across * 2 : kind === 'plate' ? pl.half.across * 2 : 1;
        const sz = kind === 'hump' ? 1 : kind === 'plate' ? pl.half.along * 2 : 1;
        m.compose(new THREE.Vector3(pl.x, this.g.surfaceAt(pl.x, pl.z) + 0.012, pl.z), qn, new THREE.Vector3(sx, 1, sz));
        im.setMatrixAt(j, m);
      });
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.decor.add(im);
    };
    const tex = (draw) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      draw(cv.getContext('2d'));
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    // a steel plate: chequered tread, rusty at the edges
    const plateTex = tex((g) => {
      g.fillStyle = '#5d6168';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#7b8088';
      for (let y = 0; y < 128; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < 128; x += 10) g.fillRect(x, y, 6, 2);
      g.strokeStyle = 'rgba(140,80,40,0.7)';
      g.lineWidth = 8;
      g.strokeRect(0, 0, 128, 128);
    });
    const holeTex = tex((g) => {
      g.fillStyle = '#3c3e42';
      g.beginPath();
      g.arc(64, 64, 62, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#55585e';
      g.lineWidth = 4;
      for (let r = 14; r < 60; r += 12) {
        g.beginPath();
        g.arc(64, 64, r, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = '#8a8d93';
      g.font = '900 18px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('하수', 64, 70);
    });
    const humpTex = tex((g) => {
      for (let x = 0; x < 128; x += 32) {
        g.fillStyle = '#ffd23a';
        g.fillRect(x, 0, 16, 128);
        g.fillStyle = '#26272b';
        g.fillRect(x + 16, 0, 16, 128);
      }
    });
    humpTex.wrapS = THREE.RepeatWrapping;
    humpTex.repeat.set(3, 1);
    mk('plate', new THREE.BoxGeometry(1, 0.02, 1), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.45, metalness: 0.7 }));
    mk('manhole', new THREE.CylinderGeometry(0.38, 0.38, 0.016, 20), new THREE.MeshStandardMaterial({ map: holeTex, roughness: 0.6, metalness: 0.5 }));
    mk('hump', new RoundedBoxGeometry(1, 0.07, 0.9, 2, 0.03), new THREE.MeshStandardMaterial({ map: humpTex, roughness: 0.7 }));
  }

  /** Did a racer's front wheel just go over a plate, a manhole or a bump? How big (0–1), once each. */
  _plateHit(r) {
    if (!this.plates?.length || r.sc != null) return 0;
    const s = r.s;
    const fx = s.x - Math.sin(s.heading) * 0.5;
    const fz = s.z - Math.cos(s.heading) * 0.5;
    for (const pl of this.plates) {
      if (Math.abs(pl.i - r.idx) > 6 && Math.abs(pl.i - r.idx) < this.course.points.length - 6) continue;
      const dx = fx - pl.x;
      const dz = fz - pl.z;
      const along = Math.abs(-dx * Math.sin(pl.hd) - dz * Math.cos(pl.hd));
      const across = Math.abs(dx * Math.cos(pl.hd) - dz * Math.sin(pl.hd));
      const on = along < pl.half.along && across < pl.half.across;
      if (on && r.plate !== pl.id) {
        r.plate = pl.id;
        return pl.k;
      }
      if (!on && r.plate === pl.id && along > pl.half.along + 1) r.plate = null;
    }
    return 0;
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
    // (a point-to-point course: from its start line to its finish, never round from its end to its start)
    const from = c.open ? c.startI : 0;
    const to = c.open ? c.finishI : n;
    const count = Math.max(1, Math.floor((to - from) / every));
    this.chevrons = new THREE.InstancedMesh(geo, mat, count);
    this.chevrons.frustumCulled = false;
    this.chevrons.userData.at = [];
    for (let k = 0; k < count; k++) {
      const i = from + k * every;
      const p = c.points[i];
      const q = c.points[c.open ? Math.min(n - 1, i + 1) : (i + 1) % n];
      this.chevrons.userData.at.push({ x: p[0], z: p[1], heading: heading(p, q) });
    }
    this._lift(true);
    this.decor.add(this.chevrons);
    this._plates();
    const p = c.points[c.open ? c.startI : 0];
    const q = c.points[c.open ? c.startI + 1 : 1];
    const w = Math.max(6, (p[2] ?? 8) + 2);
    // A point-to-point course: a big gantry at its start (the tower plaza) and another over its finish line below.
    this.gate = this._gate(c.open ? c.startI : 0, 'START · 출발', Boolean(c.open));
    this.finishGate = c.open ? this._gate(c.finishI, 'FINISH · 결승', true) : null;
    this._turns();
    this._cornerBoards();
    this._shortcutSigns();
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

  /**
   * A gate over the course at point `i`: two posts, a chequered banner with `label`, the same painted
   * across the road. `big`: a race gantry — a truss across on tall legs, the banner both ways, a row
   * of lamps and the five start lights.
   */
  _gate(i, label, big = false) {
    const c = this.course;
    const n = c.points.length;
    const p = c.points[i];
    const q = c.points[Math.min(n - 1, i + 1)] === p ? c.points[i - 1] : c.points[Math.min(n - 1, i + 1)];
    const w = Math.max(6, (p[2] ?? 8) + 2) + (big ? 1.5 : 0);
    const gate = new THREE.Group();
    const post = (this._gatePost ??= new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.6, roughness: 0.4 }));
    const H = big ? 6.2 : 5;
    for (const sx of [-w / 2, w / 2]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.5 : 0.3, H, big ? 0.5 : 0.3), post);
      m.position.set(sx, H / 2, 0);
      m.castShadow = true;
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
    g.fillRect(108, 6, 296, 52);
    g.strokeStyle = '#1a1222';
    g.lineWidth = 5;
    g.strokeRect(108, 6, 296, 52);
    g.fillStyle = '#1a1222';
    g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 256, 33);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w, big ? 1.6 : 1.3), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.y = H - 0.6;
    gate.add(banner);
    if (big) {
      // the truss: top and bottom chords and diagonals, over the banner
      const chord = new THREE.BoxGeometry(w, 0.14, 0.14);
      for (const y of [H - 0.02, H + 0.75]) for (const z of [-0.35, 0.35]) {
        const m = new THREE.Mesh(chord, post);
        m.position.set(0, y, z);
        gate.add(m);
      }
      const diag = new THREE.BoxGeometry(0.08, 1.05, 0.08);
      for (let k = 0; k < Math.floor(w / 0.9); k++) for (const z of [-0.35, 0.35]) {
        const m = new THREE.Mesh(diag, post);
        m.position.set(-w / 2 + 0.45 + k * 0.9, H + 0.37, z);
        m.rotation.z = k % 2 ? 0.7 : -0.7;
        gate.add(m);
      }
      // the start lights: five red lamps in a row (they go out at GO), and a lamp at each end
      const lamp = (this._gateLamp ??= new THREE.MeshStandardMaterial({ color: '#3a0a0a', emissive: '#ff2a1a', emissiveIntensity: 2.2 }));
      lamp.emissive.set('#ff2a1a');
      for (let k = 0; k < 5; k++) {
        const m = new THREE.Mesh((this._lampGeo ??= new THREE.SphereGeometry(0.16, 12, 8)), lamp);
        m.position.set((k - 2) * 0.55, H + 1.05, 0.42);
        gate.add(m);
      }
      gate.userData.lamp = lamp;
    }
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -8 }));
    line.position.y = 0.05;
    gate.add(line);
    gate.position.set(p[0], this.g.surfaceAt(p[0], p[1]), p[1]);
    gate.rotation.y = heading(p, q);
    this.decor.add(gate);
    return gate;
  }

  /** The course's turns: where it bends (over 30 m) by more than about 30°, and which way. */
  _turns() {
    this.turnsList = this._turnsOf(this.course.points, Boolean(this.course.open));
  }

  /** The turns of a line of points (a loop, or open): { at, bend (+ left), from, total }. */
  _turnsOf(pts, open) {
    const n = pts.length;
    const at = (i) => pts[open ? Math.max(0, Math.min(n - 1, i)) : ((i % n) + n) % n];
    const dir = (i, j) => heading(at(i), at(j));
    const bendAt = (i) => turn(dir(i - 3, i), dir(i, i + 3));
    const list = [];
    let run = null;
    for (let i = 0; i <= n; i++) {
      const b = i < n && !(open && (i < 3 || i > n - 4)) ? bendAt(i) : 0;
      if (Math.abs(b) > 0.5 && i < n) {
        if (!run || Math.sign(b) !== Math.sign(run.bend)) {
          if (run) list.push(run);
          run = { at: i, bend: b, from: i };
        } else if (Math.abs(b) > Math.abs(run.bend)) Object.assign(run, { at: i, bend: b });
      } else if (run) {
        list.push(run);
        run = null;
      }
    }
    for (const t of list) t.total = Math.abs(turn(dir(t.from - 4, t.from), dir(t.at + 3, t.at + 6)));
    return list;
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

  /**
   * Each short cut marked on the street: a sign at its mouth ("SHORTCUT · 지름길", an arrow the
   * way it turns off), standing at the kerb on that side a little before it, facing riders coming
   * up; and its own arrows down the golmok, in cyan and further apart — a dotted line.
   */
  _shortcutSigns() {
    const c = this.course;
    this.scSigns = [];
    if (!this.paths?.length) return;
    const tex = (left) => {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 192;
      const g = cv.getContext('2d');
      g.fillStyle = '#0d2a33';
      g.fillRect(0, 0, 512, 192);
      g.strokeStyle = '#7ff0ff';
      g.lineWidth = 12;
      g.strokeRect(6, 6, 500, 180);
      g.fillStyle = '#7ff0ff';
      g.font = '900 64px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SHORTCUT', left ? 300 : 212, 70);
      g.fillStyle = '#ffd23a';
      g.font = '800 46px system-ui, sans-serif';
      g.fillText('지름길', left ? 300 : 212, 138);
      // the arrow: up and round the way it goes
      g.fillStyle = '#ffd23a';
      g.save();
      g.translate(left ? 80 : 432, 96);
      g.scale(left ? -1 : 1, 1);
      g.beginPath();
      g.moveTo(-34, 50);
      g.lineTo(-34, -6);
      g.quadraticCurveTo(-34, -30, -8, -30);
      g.lineTo(10, -30);
      g.lineTo(10, -58);
      g.lineTo(52, -16);
      g.lineTo(10, 26);
      g.lineTo(10, -2);
      g.lineTo(-6, -2);
      g.lineTo(-6, 50);
      g.closePath();
      g.fill();
      g.restore();
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    const post = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5, metalness: 0.4 });
    for (const p of this.paths) {
      const map = tex(p.side > 0);
      const mat = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.6, roughness: 0.5 });
      const i = Math.max(0, p.sc.from - 3);
      const a = c.points[Math.max(0, i - 2)];
      const b = c.points[i];
      const h = heading(a, b);
      const w = b[2] ?? 8;
      // at the kerb on the side it turns off (left: −right), a little in from the edge
      const off = (w / 2 + 0.4) * (p.side > 0 ? -1 : 1);
      let x = b[0] + Math.cos(h) * off;
      let z = b[1] - Math.sin(h) * off;
      const walls = c.walls;
      if (walls?.hits(x, z, 0.5)) {
        const out = walls.push(x, z, 0.55);
        x = out.x;
        z = out.z;
      }
      const sign = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.83), mat);
      face.position.y = 2.0;
      sign.add(face);
      const pole = new THREE.Mesh(this._postGeo ??= new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6).translate(0, 0.675, 0), post);
      pole.scale.y = 1.25;
      sign.add(pole);
      sign.rotation.y = h;
      sign.position.set(x, this.g.surfaceAt(x, z), z);
      sign.userData.at = { x, z };
      sign.userData.mat = mat;
      this.decor.add(sign);
      this.boards.push(sign);
      this.scSigns.push(sign);
      p.sign = { x, z };
    }
    // Cyan arrows down each golmok, every other point: a dotted line to follow.
    const chev = this.chevrons.geometry;
    const mat = new THREE.MeshBasicMaterial({ color: '#7ff0ff', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 });
    const at = [];
    for (const p of this.paths) {
      const pts = p.sc.points;
      for (let i = 1; i < pts.length - 1; i += 2) at.push({ x: pts[i][0], z: pts[i][1], heading: heading(pts[i], pts[i + 1]) });
    }
    if (!at.length) return;
    this.scArrows = new THREE.InstancedMesh(chev, mat, at.length);
    this.scArrows.frustumCulled = false;
    this.scArrows.userData.at = at;
    this.decor.add(this.scArrows);
  }

  /** The next turn ahead of a racer on its line: { left, sharp, metres, alley } within 120 m, or null. */
  _nextTurn(r) {
    const line = this._line(r);
    const L = line.open ? Infinity : this.course.length;
    let best = null;
    for (const t of line.turns ?? []) {
      let d = line.s[t.from] - line.s[line.i];
      if (d < -10 && Number.isFinite(L)) d += L;
      if (d < -10 || d > 120) continue;
      if (!best || d < best.metres) best = { left: t.bend > 0, sharp: t.total > 1.3, metres: Math.max(0, d), alley: isSmall(line.pts[t.at][3] ?? 4) && !(line.path ? 0 : this.course.wild?.[t.at]) };
    }
    return best;
  }

  /** The next short cut ahead on the course (within 160 m): { left, metres, saves }, or null. */
  _nextShortcut(r) {
    if (r.sc != null || !this.paths?.length) return null;
    const c = this.course;
    let best = null;
    for (const p of this.paths) {
      const d = c.s[p.sc.from] - c.s[r.idx];
      if (d < -4 || d > 160) continue;
      if (!best || d < best.metres) best = { left: p.side > 0, metres: Math.max(0, d), saves: p.sc.saves };
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
    const sa = this.scArrows;
    if (sa) {
      sa.userData.at.forEach((a, k) => {
        if (!all && Math.hypot(a.x - p.x, a.z - p.z) > 220) return;
        o.position.set(a.x, this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14) + 0.07, a.z);
        o.rotation.set(0, a.heading, 0);
        o.scale.set(0.8, 1, 0.8);
        o.updateMatrix();
        sa.setMatrixAt(k, o.matrix);
      });
      sa.instanceMatrix.needsUpdate = true;
      o.scale.set(1, 1, 1);
    }
    for (const b of this.boards ?? []) {
      const a = b.userData.at;
      if (all || Math.hypot(a.x - p.x, a.z - p.z) < 220) b.position.y = this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14);
    }
    for (const gt of [this.gate, this.finishGate]) if (gt && (all || Math.hypot(gt.position.x - p.x, gt.position.z - p.z) < 200)) gt.position.y = this.g.surfaceAt(gt.position.x, gt.position.z, this.g.groundAt(gt.position.x, gt.position.z) + 14);
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
    // The ceremony: the podium dances (podium.js); the race itself is over.
    if (this.podium) {
      this.podiumT += rawDt;
      this.podium.update(rawDt, { night: this.g.uniforms?.uNight.value ?? 0 });
      this.fx?.update(rawDt, this.g.camera);
      if (!this.resultsUp && this.podiumT > PODIUM_SECONDS) this._results();
      return;
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
        // (a gantry's start lights: red to green)
        this.gate?.userData.lamp?.emissive.set('#2bff6a');
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
    this._dt = dt;
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
      r.drinkT = Math.max(0, (r.drinkT ?? 0) - dt);
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
          else if (r.me && !this.autopilot) input = { throttle: key('KeyW', 'ArrowUp'), brake: key('KeyS', 'ArrowDown'), left: key('KeyA', 'ArrowLeft'), right: key('KeyD', 'ArrowRight'), boost: key('KeyF') || this.sprintTap, drift: key('ShiftLeft', 'ShiftRight') };
          else input = this._bot(r, dt);
        } else if (r.done != null) {
          // Home: a cool-down while the others finish — steered along the course, braking to a stop
          // over a few seconds (the downhill's run-out at once), never left to roll into the traffic.
          const steer = this._bot(r, dt).steer ?? 0;
          const cap = this.course.open ? 0 : Math.max(0, 9 - (this.clock - r.done) * 2.2);
          input = { steer: r.s.v > 0.5 ? steer : 0, throttle: false, brake: r.s.v > cap + 0.3 || (cap === 0 && r.s.v > 0.1) };
        }
        if (r.me) this.sprintTap = false;
        input.grip = Math.min(1.05, grip * (r.spec.grip ?? 1));
        input.free = r.tailwind > 0;
        input.extra = r.tailwind > 0 ? 0.9 : 0;
        // The energy drink: boosting by itself, free, while it lasts; the gauge filling back up.
        if (r.drinkT > 0 && racing && r.done == null) {
          input.boost = true;
          input.throttle = true;
          input.brake = false;
          input.free = true;
          input.extra = Math.max(input.extra, DRINK.extra);
        }
        // Pulled over by the police (police.js): hauled to a stop and held, a wobble, then let go.
        if (r.pulled) {
          r.pulled.t += dt;
          if (r.pulled.t >= 0) {
            Object.assign(input, { throttle: false, boost: false, drift: false, brake: true, free: false, extra: 0 });
            r.s.v *= Math.exp(-dt * 6);
            if (r.pulled.t < 0.4) r.wobble = Math.max(r.wobble ?? 0, 0.55);
          }
          if (r.pulled.t >= r.pulled.dur) {
            r.pulled = null;
            r.wobble = Math.max(r.wobble ?? 0, 0.25);
          }
        }
        if (r.fill) {
          r.s.stamina = Math.min(1, r.s.stamina + DRINK.fill * dt);
          if (r.s.stamina >= 1) r.fill = false;
        }
        input.grade = this._grade(r);
        input.draft = this._draft(r);
        input.surface = this._surface(r);
        input.kerb = this._kerb(r);
        input.bump = this._plateHit(r);
        // Marbles under the wheels: the grip goes, it slides and wobbles (and maybe throws you off).
        this._slip(r, input, dt);
        if (r.mode !== 'ride') continue;
        const out = this._step(r, input, dt);
        r.landed = out.landed;
        if (out.kerb === 'hop' && r.me) this.g.street?._thud?.(0.25);
        if (out.kerb === 'scrub') this._scrape(r, 0.2, false, 'kerb');
        // Into a wall head-on: off, if it was fast (about 30 km/h); slower, a bonk and a stop.
        r.hitV = out.hit;
        // (sliding into it sideways in a drift, the deck takes it: a harder knock before it throws you)
        if (out.hit > WALL_FALL * (1 + 0.45 * (r.s.drift ?? 0)) && racing) this._crash(r, 'wall');
        else if (out.hit > 2 && r.me) this._scrape(r, 0.6, false, 'bonk');
        else if (out.hit > 1 && r.me) this.g.street?._thud?.(Math.min(1, out.hit / 9));
        else if (out.glance > 0) this._scrape(r, out.glance, false, 'wall');
        // (a hard jolt shakes the camera: more on stiff springs — scoot.js already scaled it by the suspension)
        if (out.jolt > 0.35 && r.me) {
          this.shake = Math.max(this.shake ?? 0, 0.07 * out.jolt);
          if (input.bump) this.g.street?._thud?.(Math.min(0.6, out.jolt * 0.4));
        }
        if (r.me && racing) this._motorSound(r);
        if (r.me) this._squeal(r);
      } else if (r.net) {
        const kk = Math.min(1, dt * 10);
        r.s.x += (r.net.x - r.s.x) * kk;
        r.s.z += (r.net.z - r.s.z) * kk;
        r.s.heading += turn(r.s.heading, r.net.heading) * kk;
        // (where the network says they are, but never inside a building between two messages)
        this._clear(r);
        r.s.roll = ((r.s.roll ?? 0) + (r.s.v / r.spec.wheel) * dt) % (Math.PI * 2);
        if (r.mode !== 'ride') r.crashT += dt;
      }
    }
    // The street round the racers this browser rides.
    const anchors = this.racers.filter((r) => r.mine && !r.left).map((r) => ({ x: r.s.x, z: r.s.z, heading: r.s.heading, idx: r.idx, me: r.me }));
    this.traffic?.update(dt, anchors);
    if (racing) for (const r of this.racers) if (r.mine && !r.left && r.mode === 'ride') this._hits(r);
    this._branches(dt);
    this._marbles(dt);
    this.helmetDrops?.update(dt, (x, z) => this.g.surfaceAt(x, z, this.g.groundAt(x, z) + 14));
    this._bump();
    for (const r of this.racers) {
      if (r.left) continue;
      if (r.mine) this._progress(r);
      this._place(r, dt);
    }
    this.boxes?.update(dt, this.g.camera);
    if (racing) for (const r of this.racers) if (r.mine && !r.left && r.mode === 'ride') this._pickup(r);
    // Throttle held but going nowhere for two seconds: say how to get out.
    if (this.me && racing && this.me.done == null && this.me.mode === 'ride') {
      this.me.stuckT = key('KeyW') && Math.abs(this.me.s.v) < 1 ? (this.me.stuckT ?? 0) + dt : 0;
      if (this.me.stuckT > 2) {
        this.me.stuckT = -3;
        this._flash('Stuck? Press R', 2.5);
      }
    }
    // Lost well off the course (round the wrong side of a building, out in a square) for a few seconds:
    // back on it, as R would — a fair race isn't lost to a bad bounce.
    if (racing) {
      for (const r of this.racers) {
        if (!r.mine || r.left || r.mode !== 'ride' || r.done != null) continue;
        const w = this._at(this._line(r), 0)?.[2] ?? 6;
        r.lost = (r.off ?? 0) > Math.max(14, w / 2 + 9) ? (r.lost ?? 0) + dt : 0;
        if (r.lost > 2.5) {
          r.lost = 0;
          this._remount(r);
          if (r.me) this._flash('Back on the course', 1.2);
        }
      }
    }
    this.g.pos.set(this.me.s.x, this.me.y, this.me.s.z);
    this.g.speed = Math.abs(this.me.s.v);
    if (racing) this._finishCheck();
    this._send(dt);
    this._lift();
    this.golmok?.update(dt);
    for (const gm of this.golmoks ?? []) gm.update(dt);
    this.facades?.update();
    this.fair?.update(rawDt);
    this.fx?.update(rawDt, this.g.camera);
    this.police?.update(dt);
    const feel = this.me.mode === 'ride' ? speedFeel(Math.abs(this.me.s.v), this.me.spec.cruise) : 0;
    this.feel = feel;
    this.speedFx?.update(dt, { x: this.me.s.x, y: this.me.y, z: this.me.s.z, heading: this.me.s.travel ?? this.me.s.heading, v: Math.abs(this.me.s.v), k: feel });
    this._wetLights();
    this.wet?.update(dt);
    this._hudFrame();
    // The rival panel: who is coming up behind you (one still of them, taken after this frame is drawn).
    if (this.panel) {
      if (this._warmPanel) {
        this._warmPanel = false;
        this.panel.warm(this.g.scene, this.g.camera);
      }
      this.panel.update(dt, this.me, this.racers.filter((r) => r !== this.me), { active: this.phase === 'racing' && this.clock > 4 && this.me.done == null && !this.paused, scene: this.g.scene, exposure: this.g.renderer?.toneMappingExposure ?? 1 });
    }
  }

  /**
   * Where the rival panel's still of `o` is taken from: just in front of them looking back at their
   * face, at the first of a few spots with no wall, car, bus or street prop in the way (or between
   * them and it) — or null, and no still this time. A still taken from inside a bus or a wall was a
   * flat green or grey square sliding in and out at the left: the "blinking box".
   */
  _panelSpot(o) {
    const s = o.s;
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    const walls = this.course?.walls;
    const y = o.y + 1.35;
    const cars = (this.traffic?.vehicles ?? []).filter((v) => Math.hypot(v.box.x - s.x, v.box.z - s.z) < 14);
    const props = this._props(s.x, s.z, 6);
    for (const [a, side] of [[3, -0.8], [3, 0.8], [2.3, 0], [2.5, -1.5], [2.5, 1.5]]) {
      const x = s.x + fx * a - fz * side;
      const z = s.z + fz * a + fx * side;
      if (walls && (walls.sweep(s.x, s.z, x, z, 0.35) || walls.inside(x, z))) continue;
      let blocked = false;
      for (let k = 0.35; k <= 1 && !blocked; k += 0.325) {
        const px = s.x + (x - s.x) * k;
        const pz = s.z + (z - s.z) * k;
        const py = o.y + 0.9 + (y - o.y - 0.9) * k;
        blocked = cars.some((v) => inBox(v, px, py, pz, 0.5)) || props.some((p) => Math.hypot(p.x - px, p.z - pz) < (p.r ?? 0.3) + 0.45);
      }
      if (blocked) continue;
      return { pos: new THREE.Vector3(x, Math.max(y, this.g.surfaceAt(x, z, o.y) + 1.1), z), look: new THREE.Vector3(s.x + fx * 0.3, o.y + 0.85, s.z + fz * 0.3) };
    }
    return null;
  }

  /** For the rival panel's still: only the rider and the street (no traffic, people, effects or other riders). */
  _panelIsolate(on, o) {
    if (on) {
      const hide = [this.traffic?.group, this.g.life?.group, this.g.life?.folk?.group, this.fx?.group, this.boxes?.group, this.speedFx?.mesh, this.marbleField?.group, ...this.racers.filter((r) => r !== o).map((r) => r.view.root)].filter(Boolean);
      this._isoHidden = hide.filter((m) => m.visible);
      for (const m of this._isoHidden) m.visible = false;
    } else {
      for (const m of this._isoHidden ?? []) m.visible = true;
      this._isoHidden = null;
    }
  }

  /** After the city is drawn (SeoulGame): the rival panel's still, if one is due. */
  afterDraw() {
    this.panel?.draw();
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

  /**
   * Riding on for a frame against the walls (the buildings and the alleys' walls, walls.js): in
   * steps of at most 1/120 s, so a fast rider meets a wall where it is, whatever the frame rate.
   */
  _step(r, input, dt) {
    const walls = this.course.walls;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-6));
    const h = dt / steps;
    const all = { hit: 0, glance: 0, jolt: 0, kerb: null, landed: 0 };
    for (let k = 0; k < steps; k++) {
      // (a kerb is met once a frame, not once a step)
      const out = stepScoot(r.s, k ? { ...input, kerb: null } : input, h, walls ?? (() => false), r.spec);
      all.hit = Math.max(all.hit, out.hit);
      all.glance = Math.max(all.glance, out.glance);
      all.jolt = Math.max(all.jolt, out.jolt);
      all.landed = Math.max(all.landed, out.landed);
      all.kerb ??= out.kerb;
      if (out.hit > 0) break;
    }
    return all;
  }

  /** Never inside a building or a wall: a racer found in one (a spawn, a snap from the network) goes out the nearest way. */
  _clear(r) {
    const walls = this.course?.walls;
    if (!walls) return;
    const out = walls.push(r.s.x, r.s.z, RIDER_RADIUS);
    if (out.ok && out.moved < 6) {
      r.s.x = out.x;
      r.s.z = out.z;
      return;
    }
    // Deep in one: back on the line the racer is following, where it is clear.
    const line = this._line(r);
    for (let k = 0; k < 12; k++) {
      for (const sgn of [1, -1]) {
        const p = this._at(line, k * sgn);
        const fix = walls.push(p[0], p[1], RIDER_RADIUS);
        if (fix.ok) {
          r.s.x = fix.x;
          r.s.z = fix.z;
          return;
        }
      }
    }
  }

  /** Whether a racer is inside a building (counted by the end-to-end checks: it must never be). */
  _inside(r) {
    return Boolean(this.course?.walls?.inside(r.s.x, r.s.z));
  }

  /* ------------------------------------------------- lines: the course and its short cuts */

  /**
   * Each short cut as a line a racer follows: a little of the course before it, the golmok, and
   * the course after it — each point with how far round the course it counts as (`vs`: the
   * golmok's metres stand for the course's metres it cuts out, so the order of the riders is fair
   * whichever way they went), and the room between the walls at each.
   */
  _paths() {
    const c = this.course;
    const n = c.points.length;
    const E = 10;
    const X = 30;
    this.paths = (c.shortcuts ?? []).map((sc, k) => {
      const points = [];
      const vs = [];
      const room = [];
      for (let i = sc.from - E; i < sc.from; i++) {
        points.push(c.points[i]);
        vs.push(c.s[i]);
        room.push(c.room[i * 2], c.room[i * 2 + 1]);
      }
      const enter = points.length;
      for (let j = 0; j < sc.points.length - 1; j++) {
        points.push(sc.points[j]);
        vs.push(c.s[sc.from] + (sc.s[j] / sc.length) * sc.span);
        room.push(sc.room[j * 2], sc.room[j * 2 + 1]);
      }
      const leave = points.length;
      for (let m = 0; m < X; m++) {
        const i = (sc.to + m) % n;
        points.push(c.points[i]);
        vs.push(c.s[i] + (sc.to + m >= n ? c.length : 0));
        room.push(c.room[i * 2], c.room[i * 2 + 1]);
      }
      const s = [0];
      for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      // Which way it turns off the course (+ left).
      const a = c.points[sc.from - 2];
      const b = c.points[sc.from];
      const q = sc.points[Math.min(2, sc.points.length - 1)];
      const side = Math.sign(turn(heading(a, b), heading(b, q))) || 1;
      return { k, sc, points, vs, room: Float32Array.from(room), enter, leave, s, side, turns: this._turnsOf(points, true) };
    });
    this.scRoads = new Set((c.shortcuts ?? []).flatMap((sc) => [...(sc.roads ?? [])]));
    // Where the golmok are (for keeping people and traffic out of them): their segments by 20 m square.
    this.scGrid = new Map();
    // (not its first and last few metres: those are across the main road's lanes and pavement at its
    // mouths, where the traffic and the people going along the road belong)
    for (const p of this.paths) {
      for (let i = p.enter + 2; i < p.leave - 1; i++) {
        const a = p.points[i - 1];
        const b = p.points[i];
        const seg = [a[0], a[1], b[0], b[1], (b[2] ?? 4) / 2 + 0.9];
        for (const [x, z] of [[a[0], a[1]], [b[0], b[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]) {
          const key = `${Math.floor(x / 20)}|${Math.floor(z / 20)}`;
          if (!this.scGrid.has(key)) this.scGrid.set(key, new Set());
          this.scGrid.get(key).add(seg);
        }
      }
    }
  }

  /** What stands in the street near a point (planters, bins, parked scooters, poles): the course's and the short cuts'. */
  _props(x, z, r) {
    const out = this.golmok?.near(x, z, r) ?? [];
    for (const gm of this.golmoks ?? []) out.push(...gm.near(x, z, r));
    return out;
  }

  /**
   * Every place a golmok (the course's small streets, the short cuts) meets a main road: where its
   * line goes from the road or its pavement onto the alley's own surface. For each, the surface is
   * sampled along the line and to each side of it, every 20 cm for 10 m each way: a step of more
   * than 5 cm between samples, a sample with nothing under it (a hole), or the alley's surface laid
   * over the road's or the pavement's (two surfaces fighting) is flagged. Builds every stretch first.
   */
  junctionReport() {
    const g = this.g;
    this.golmok?.buildAll();
    for (const gm of this.golmoks ?? []) gm.buildAll();
    // (`over`: only an alley surface drawn level with or above the road's there — one tucked under it can't be seen)
    const alleyAt = (x, z, inset = 0, over = false) => {
      const cx = Math.floor(x / 40);
      const cz = Math.floor(z / 40);
      for (let i = cx - 1; i <= cx + 1; i++) {
        for (let j = cz - 1; j <= cz + 1; j++) {
          for (const s of g.roadHash?.get(`${i}_${j}`) ?? []) {
            if (!s.alley) continue;
            const dx = s.bx - s.ax;
            const dz = s.bz - s.az;
            // (round its ends too: a bend's corner is filled, golmok.js)
            const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
            if (Math.hypot(x - s.ax - dx * t, z - s.az - dz * t) > s.half - 0.2 - inset) continue;
            if (!over || s.ay + (s.by - s.ay) * t > g.surfaceAt(x, z, Infinity, true) - 0.015) return true;
          }
        }
      }
      return false;
    };
    const main = (x, z, inset = 0) => Boolean(g.onRoad(x, z, -inset) || (inset ? g.onWalk(x + inset, z) && g.onWalk(x - inset, z) && g.onWalk(x, z + inset) && g.onWalk(x, z - inset) : g.onWalk(x, z)));
    const out = { junctions: 0, steps: 0, gaps: 0, overlaps: 0, worst: [], list: [] };
    const lines = [{ name: 'course', pts: this.course.points, open: false }, ...(this.paths ?? []).map((p) => ({ name: p.sc.id, pts: p.sc.points, open: true }))];
    for (const line of lines) {
      const pts = line.pts;
      const n = pts.length;
      for (let i = 0; i < (line.open ? n - 1 : n); i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        if (!((a[3] ?? 4) >= 5 || (b[3] ?? 4) >= 5)) continue;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const ux = (b[0] - a[0]) / len;
        const uz = (b[1] - a[1]) / len;
        // where along it the road (or its pavement) gives way to the alley
        let at = -1;
        let prev = main(a[0], a[1]);
        for (let t = 0.25; t <= len; t += 0.25) {
          const now = main(a[0] + ux * t, a[1] + uz * t);
          if (now !== prev) {
            at = t;
            break;
          }
          prev = now;
        }
        if (at < 0) continue;
        out.junctions++;
        const w = Math.min(a[2] ?? 4, b[2] ?? 4);
        const J = { line: line.name, i, x: Math.round(a[0] + ux * at), z: Math.round(a[1] + uz * at), ux: Math.round(ux * 100) / 100, uz: Math.round(uz * 100) / 100, steps: 0, gaps: 0, overlaps: 0, maxStep: 0, maxRise: 0, flags: [] };
        const flag = (what, o, d, v = 0) => J.flags.length < 8 && J.flags.push(`${what} ${o.toFixed(1)}/${d.toFixed(1)}${v ? ` ${v.toFixed(2)}` : ''}`);
        for (const off of [-(w / 2 - 0.6), 0, w / 2 - 0.6]) {
          let y = null;
          let lastRise = null;
          let both = 0;
          // (a hole: nothing under a sample between two that have the road, the pavement or the alley under them)
          const under = [];
          for (let d = -10; d <= 10; d += 0.2) {
            const x = a[0] + ux * (at + d) - uz * off;
            const z = a[1] + uz * (at + d) + ux * off;
            const onMain = main(x, z);
            const onAlley = alleyAt(x, z);
            under.push(onMain || onAlley || Boolean(g.buildingAt(x, z)) || Boolean(this.course.walls?.inside(x, z)));
            both = main(x, z, 0.15) && alleyAt(x, z, 0.15, true) ? both + 0.2 : 0;
            if (both > 0.3) {
              J.overlaps++;
              flag('overlap', off, d);
              both = -1e9;
            }
            // (inside a building or a wall no one rides: the next step is counted from beyond it)
            if (this.course.walls?.hits(x, z, 0.1)) {
              y = null;
              continue;
            }
            // (a step from one surface to another: off them all is the land, a hole if anything — counted as one)
            if (!under.at(-1)) {
              y = null;
              continue;
            }
            const h = g.surfaceAt(x, z, y ?? g.surfaceAt(a[0], a[1]));
            // (a step: a jump in the surface, not a hill — the rise from the last sample unlike the one before it)
            const rise = y == null ? 0 : h - y;
            if (y != null && Math.abs(rise - (lastRise ?? rise)) > 0.05 && Math.abs(rise) > 0.05) {
              J.steps++;
              flag('step', off, d, rise);
              J.maxStep = Math.max(J.maxStep, Math.abs(h - y));
              // (up, the way the line is ridden: a step a wheel can catch — a step down is only a thump)
              J.maxRise = Math.max(J.maxRise, h - y);
            }
            lastRise = y == null ? null : rise;
            y = h;
          }
          for (let q = 0; q < under.length; q++) {
            if (under[q]) continue;
            let before = false;
            let after = false;
            for (let e = 1; e <= 15; e++) {
              before ||= under[q - e] === true;
              after ||= under[q + e] === true;
            }
            if (before && after) {
              J.gaps++;
              flag('gap', off, q * 0.2 - 10);
            }
          }
        }
        out.steps += J.steps;
        out.gaps += J.gaps;
        out.overlaps += J.overlaps;
        J.maxStep = Math.round(J.maxStep * 100) / 100;
        J.maxRise = Math.round(J.maxRise * 100) / 100;
        out.list.push(J);
      }
    }
    out.worst = out.list.filter((j) => j.steps || j.gaps || j.overlaps).slice(0, 12);
    return out;
  }

  /** Whether a point is in a short cut's golmok (nobody stands or drives there: it is a racing line). */
  keepClear(x, z) {
    if (!this.scGrid?.size || !this.course) return false;
    const ci = Math.floor(x / 20);
    const cj = Math.floor(z / 20);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        for (const [ax, az, bx, bz, half] of this.scGrid.get(`${i}|${j}`) ?? []) {
          const dx = bx - ax;
          const dz = bz - az;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
          if (Math.hypot(x - ax - dx * t, z - az - dz * t) < half) return true;
        }
      }
    }
    return false;
  }

  /** The line a racer is on: the course (a loop), or a short cut's (open) — and where on it. */
  _line(r) {
    const p = r.sc != null ? this.paths?.[r.sc] : null;
    if (p) return { pts: p.points, i: r.si, open: true, room: p.room, s: p.s, turns: p.turns, path: p };
    const c = this.course;
    return { pts: c.points, i: r.idx, open: Boolean(c.open), room: c.room, s: c.s, turns: this.turnsList };
  }

  /** The point `k` on from where a line's racer is (an open line stops at its ends). */
  _at(line, k = 0) {
    const n = line.pts.length;
    return line.pts[this._ix(line, k)] ?? line.pts[0];
  }

  _ix(line, k = 0) {
    const n = line.pts.length;
    return line.open ? Math.max(0, Math.min(n - 1, line.i + k)) : (((line.i + k) % n) + n) % n;
  }

  /** How far round the course (metres from the line) a racer is, short cut or not. */
  _vs(r) {
    const p = r.sc != null ? this.paths?.[r.sc] : null;
    return p ? p.vs[r.si] : this.course.s[r.idx];
  }

  /** The course point nearest a distance round it. */
  _idxAt(v) {
    const c = this.course;
    const L = c.length;
    const x = ((v % L) + L) % L;
    let lo = 0;
    let hi = c.s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (c.s[mid] <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
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
        // Run into it gently (a car stopped at the lights you rolled up to, one you drew level with):
        // a bump and a shove, matched to its speed — only a real knock (closing at over ~23 km/h) throws you off.
        const vx = -Math.sin(s.travel ?? s.heading) * s.v + Math.sin(b.heading) * v.v;
        const vz = -Math.cos(s.travel ?? s.heading) * s.v + Math.cos(b.heading) * v.v;
        const dl = Math.hypot(dx, dz) || 1;
        const closing = -(vx * dx + vz * dz) / dl;
        if (closing < 6.5) {
          const push = Math.max(0.05, -gap + 0.05);
          s.x += (dx / dl) * push;
          s.z += (dz / dl) * push;
          const ahead = -Math.sin(s.travel ?? s.heading) * -dx / dl + -Math.cos(s.travel ?? s.heading) * -dz / dl;
          if (ahead > 0.3) s.v = Math.min(s.v, Math.max(0, v.v * Math.cos(turn(s.travel ?? s.heading, b.heading))) + 0.5);
          this._scrape(r, 0.3, true, 'car');
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
    for (const o of this._props(s.x, s.z, 2) ?? []) {
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
      // The golden helmet takes it: a bounce off, no fall — and the helmet flies off, spinning.
      r.helmet = false;
      r.safe = 1.2;
      r.s.v *= what === 'marbles' ? 0.75 : 0.45;
      r.s.heading += (Math.random() - 0.5) * 0.4;
      (r.blocked ??= []).push(what);
      this._helmetSaved(r, true);
      return;
    }
    r.mode = 'tumble';
    r.crashT = 0;
    r.crashes++;
    (r.crashKinds ??= {})[what] = (r.crashKinds[what] ?? 0) + 1;
    // (where and how, for the end-to-end checks' tally of what knocks riders off)
    (this.crashLog ??= []).push({ id: r.id, what, x: Math.round(r.s.x * 10) / 10, z: Math.round(r.s.z * 10) / 10, v: Math.round(r.hitV ?? r.s.v), sc: r.sc, idx: r.idx, off: Math.round((r.off ?? 0) * 10) / 10, t: Math.round(this.clock), drift: Math.round((r.s.drift ?? 0) * 100) / 100, w: this._at(this._line(r), 0)?.[2], car: vehicle ? { rel: Math.round(Math.abs(turn(r.s.travel ?? r.s.heading, vehicle.box.heading)) * 100) / 100, v: Math.round(vehicle.v * 10) / 10, kind: vehicle.kind, ahead: Math.round(((vehicle.box.x - r.s.x) * -Math.sin(r.s.heading) + (vehicle.box.z - r.s.z) * -Math.cos(r.s.heading)) * 10) / 10, side: Math.round(((vehicle.box.x - r.s.x) * Math.cos(r.s.heading) - (vehicle.box.z - r.s.z) * Math.sin(r.s.heading)) * 10) / 10 } : null, bot: Boolean(r.bot || this.autopilot), dbg: r.dbg ? { ...r.dbg } : null, bend: Math.round(Math.abs(turn(heading(this._at(this._line(r), -2), this._at(this._line(r), 0)), heading(this._at(this._line(r), 0), this._at(this._line(r), 3)))) * 100) / 100 });
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

  /**
   * The golden helmet saving a rider: BLOCKED! and PING!, a ding, the helmet flying off their head,
   * spinning, and the badge saying so (`mine`: this browser decided it — else it is only shown).
   */
  _helmetSaved(r, mine = true) {
    const at = { x: r.s.x, y: r.y + 2.3, z: r.s.z, ride: r.s };
    const near = r.me || Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 70;
    this.fx?.pop('BLOCKED!', at, { color: '#ffd23a', size: r.me ? 1.3 : 1 });
    this.fx?.pop('PING!', { ...at, y: at.y + 0.9 }, { color: '#fff3a8', size: r.me ? 0.8 : 0.6 });
    if (near) this._ding(r.me ? 1568 : 1320, 2);
    if (r.view?.helmet?.visible) this.helmetDrops?.fling(r.view.helmet, { vx: -Math.sin(r.s.travel ?? r.s.heading) * r.s.v, vz: -Math.cos(r.s.travel ?? r.s.heading) * r.s.v });
    r.view?.setHelmet(false);
    this.saves = (this.saves ?? 0) + 1;
    if (r.me) {
      this.shake = Math.max(this.shake ?? 0, 0.15);
      this._helmetBlocked = 1.6;
    }
    if (mine) this.saveLog = [...(this.saveLog ?? []), { id: r.id, t: Math.round(this.clock * 10) / 10 }];
  }

  _crashFx(r, what = '') {
    if (what === 'marbles') {
      this.fx?.pop('WHOA!', { x: r.s.x, y: r.y + 2, z: r.s.z, ride: r.s }, { color: '#7ad8ff', size: r.me ? 1.5 : 1.1 });
      this.fx?.pop('SLIP!', { x: r.s.x, y: r.y + 3, z: r.s.z, ride: r.s }, { color: '#ffffff', size: r.me ? 0.9 : 0.7 });
    } else this.fx?.pop(what === 'bus' ? 'WHAM!' : what === 'person' ? 'OOF!' : 'BONK!', { x: r.s.x, y: r.y + 2, z: r.s.z, ride: r.s }, { color: '#ff5a3c', size: r.me ? 1.5 : 1.1 });
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
      const walls = this.course.walls;
      if (walls?.hits(r.s.x, r.s.z, RIDER_RADIUS * 0.8)) {
        r.s.x -= r.slide.vx * dt;
        r.s.z -= r.slide.vz * dt;
        r.slide.vx = r.slide.vz = 0;
        this._clear(r);
      }
    }
    if (r.mode === 'tumble' && r.crashT > TUMBLE) r.mode = 'dizzy';
    if (r.crashT > DOWN) this._remount(r);
  }

  /** Back on the bike, on the line where you were (the course, or the golmok of a short cut; to the right of its line), a moment safe. */
  _remount(r, on = 0) {
    const c = this.course;
    let line = this._line(r);
    if (!line.path) {
      const at = locate(c, r.s.x, r.s.z, r.idx);
      r.idx = at.off < 25 ? at.i : r.idx;
      if (on) {
        const before = c.s[r.idx];
        r.idx = c.open ? Math.min(c.points.length - 2, r.idx + on) : (r.idx + on) % c.points.length;
        // (the metres it was moved on count as ridden: the order stays fair, a little behind where it would have been)
        let d = c.s[r.idx] - before;
        if (d < 0) d += c.length;
        r.dist += d;
      }
      line = this._line(r);
    }
    const p = this._at(line, 0);
    const q = this._at(line, 1) === p ? this._at(line, -1) : this._at(line, 1);
    const hd = q === this._at(line, 1) ? heading(p, q) : heading(q, p);
    const i = this._ix(line, 0);
    const room = line.room ? Math.min(line.room[i * 2 + 1] - 0.6, (p[2] ?? 6) / 2 - 1) : (p[2] ?? 6) / 2 - 1;
    const side = Math.max(0, Math.min(1.2, room));
    Object.assign(r.s, { x: p[0] + Math.cos(hd) * side, z: p[1] - Math.sin(hd) * side, heading: hd, travel: hd, v: 0, lean: 0, steer: 0, air: 0, airV: 0, wobble: 0 });
    this._clear(r);
    r.mode = 'ride';
    r.crashT = 0;
    r.slide = null;
    r.safe = 1.5;
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
    // up a kerb at once (the hop carries it), down one quickly; a seam of a few centimetres eased over
    // in a tenth of a second rather than snapped to (it read as a jump)
    const dy = target - r.y;
    r.y += dy * Math.min(1, dt * (Math.abs(dy) < 0.12 ? 10 : dy > 0 ? 30 : 14));
    const night = this.g.uniforms?.uNight.value ?? 0;
    const won = r.done != null && this._rank(r) === 1 && s.v < 0.6;
    const v = r.view;
    v.root.position.set(s.x, r.y, s.z);
    v.root.visible = !(r.safe > 0 && r.mode === 'ride' && Math.floor(r.safe * 12) % 2);
    const mode = won ? 'win' : this.phase === 'grid' ? 'grid' : r.mode;
    if (Boolean(v.helmetOn) !== Boolean(r.helmet)) v.setHelmet(r.helmet);
    const boosted = s.boosting || r.tailwind > 0 || r.drinkT > 0;
    v.pose(dt, { heading: s.heading, speed: Math.abs(s.v), lean: s.lean, drift: (s.drift ?? 0) * (s.driftSide ?? 0), steer: s.steer, braking: s.braking, boost: boosted, bump: s.bump ?? 0, air: s.air ?? 0, landed: r.landed, wobble: Math.max(s.wobble ?? 0, r.wobble ?? 0, (r.slip ?? 0) * 0.8), mode, t: r.crashT, fallSide: r.fallSide ?? 1, fallKind: r.fallKind, throwK: r.throwT == null ? null : Math.min(1, r.throwT / 0.45), roll: s.roll, battery: s.stamina, night, glow: r.drinkT > 0 ? '#c8ff9a' : r.tailwind > 0 ? '#bdf0ff' : null });
    // The drink's boost: a ribbon of green light behind the back wheel.
    if (r.drinkT > 0 || this.trails?.has(r.id)) {
      let tr = this.trails.get(r.id);
      if (!tr) this.trails.set(r.id, (tr = new GlowTrail(this.g.scene, '#9ef07a')));
      tr.update(dt, { x: s.x + Math.sin(s.heading) * 0.45, y: r.y, z: s.z + Math.cos(s.heading) * 0.45 }, r.drinkT > 0 && r.mode === 'ride');
    }
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
    // A drift: a dark scuff off the back tyre on the road, and a puff now and then.
    if ((s.drift ?? 0) > 0.25 && s.v > 4 && r.mode === 'ride') {
      r.markT = (r.markT ?? 0) - dt;
      if (r.markT <= 0) {
        r.markT = 0.035;
        this._skidMark(s.x + Math.sin(s.heading) * 0.45, r.y, s.z + Math.cos(s.heading) * 0.45, s.travel ?? s.heading, Math.min(1, s.drift));
      }
      if (Math.random() < dt * 8) this.fx?.dust({ x: s.x + Math.sin(s.heading) * 0.5, y: r.y + 0.05, z: s.z + Math.cos(s.heading) * 0.5 }, 2);
    }
    this.splash?.(r, dt);
  }

  /** A scuff of rubber on the road (from a drift): one of a few hundred, the oldest reused. */
  _skidMark(x, y, z, hd, k) {
    if (!this.marks) {
      const geo = new THREE.PlaneGeometry(0.12, 0.34).rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: '#141416', transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 });
      this.marks = new THREE.InstancedMesh(geo, mat, 400);
      this.marks.frustumCulled = false;
      this.marks.count = 0;
      this.marks.userData.next = 0;
      this.g.scene.add(this.marks);
    }
    const m = this.marks;
    const o = this._markObj ??= new THREE.Object3D();
    o.position.set(x, this.g.surfaceAt(x, z, y + 0.3) + 0.03, z);
    o.rotation.set(0, hd, 0);
    o.scale.set(0.7 + k * 0.6, 1, 1);
    o.updateMatrix();
    const i = m.userData.next;
    m.setMatrixAt(i, o.matrix);
    m.userData.next = (i + 1) % 400;
    m.count = Math.max(m.count, i + 1);
    m.instanceMatrix.needsUpdate = true;
  }

  /** The tyre's squeal while you drift: a narrow band of noise, louder the wider the slide. */
  _squeal(r) {
    const a = this._audio();
    if (!a) return;
    if (!this._sq) {
      this._whoosh(0.001);
      const src = a.createBufferSource();
      src.buffer = this._nbuf;
      src.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 9;
      f.frequency.value = 1900;
      const f2 = a.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = 14;
      f2.frequency.value = 3100;
      const gain = a.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain);
      src.connect(f2).connect(gain);
      gain.connect(a.destination);
      src.start();
      this._sq = { src, f, f2, gain };
    }
    const k = r && r.mode === 'ride' && !this.paused ? Math.min(1, (r.s.drift ?? 0) * Math.min(1, r.s.v / 10) * (0.6 + r.s.skid)) : 0;
    const t = a.currentTime;
    this._sq.gain.gain.setTargetAtTime(k * 0.22, t, 0.04);
    this._sq.f.frequency.setTargetAtTime(1700 + k * 500 + Math.sin(t * 23) * 60, t, 0.05);
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
    const p = this._at(this._line(r), 0);
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
    // stretches meeting, a hill), not a kerb: ridden over, never hopped and never a wall. Only the
    // street's edge has kerbs (any step there still counts).
    {
      const p = this._at(this._line(r), 0);
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

  /**
   * How far round the course a racer has gone: following the nearest point of the line it is on,
   * laps counted at the line. Off the course into a short cut's golmok (a rider who turns in; a bot
   * that chose to), it follows the golmok, its metres counted as the course's it cuts out, until it
   * is back on the course.
   */
  _progress(r) {
    const c = this.course;
    const L = c.length;
    const n = c.points.length;
    const before = this._vs(r);
    if (r.sc != null && this.paths?.[r.sc]) {
      const p = this.paths[r.sc];
      const at = locateOn(p.points, r.s.x, r.s.z, r.si - 4, r.si + 14);
      r.off = at.off;
      if (at.i >= p.leave) {
        r.sc = null;
        r.idx = (p.sc.to + (at.i - p.leave)) % n;
      } else if (at.off > 30 || (at.i < p.enter && !r.bot)) {
        // Back out of it (or lost): on the course again.
        r.sc = null;
        const l = locate(c, r.s.x, r.s.z);
        r.idx = l.i;
        r.off = l.off;
      } else {
        r.si = at.i;
        r.idx = this._idxAt(p.vs[at.i]);
      }
    } else {
      r.sc = null;
      const loc = locate(c, r.s.x, r.s.z, r.idx);
      const width = c.points[loc.i][2] ?? 6;
      r.off = loc.off;
      if (loc.off < width / 2 + 20) r.idx = loc.i;
      // Turned into a short cut's golmok: following it now.
      for (const p of this.paths ?? []) {
        if (r.idx < p.sc.from - 3 || r.idx > p.sc.from + 5) continue;
        const at = locateOn(p.points, r.s.x, r.s.z, p.enter, p.enter + 5);
        const w = p.points[at.i][2] ?? 4;
        if (at.i > p.enter && at.off < w / 2 + 0.8 && at.off + 0.5 < loc.off) {
          r.sc = p.k;
          r.si = at.i;
          r.off = at.off;
          r.shortcuts = (r.shortcuts ?? 0) + 1;
          break;
        }
      }
      // A bot that means to take one: on its line from a little before it.
      if (r.bot && r.sc == null) {
        for (const p of this.paths ?? []) {
          const ahead = p.sc.from - r.idx;
          if (ahead < 1 || ahead > 8) continue;
          const key = `${p.k}|${r.lapsDone}`;
          if (r.scPick?.key !== key) r.scPick = { key, take: Math.random() < Math.max(0.12, Math.min(0.8, 0.15 + ((r.skill ?? 0.9) - 0.86) * 4.5)) };
          if (r.scPick.take) {
            r.sc = p.k;
            r.si = p.enter - ahead;
            r.shortcuts = (r.shortcuts ?? 0) + 1;
          }
          break;
        }
      }
    }
    let d = this._vs(r) - before;
    if (d > L / 2) d -= L;
    if (d < -L / 2) d += L;
    r.dist += d;
    const line = this._line(r);
    const p = this._at(line, 1);
    const q = this._at(line, 4);
    // (judged by the way it is going against the course a little ahead, held 1.5 s — never a blink: ride.js wrongWay)
    r.wrongW = wrongWay(r.wrongW, { mode: r.mode, travel: r.s.travel ?? r.s.heading, ahead: p !== q ? heading(p, q) : r.s.travel ?? r.s.heading, v: r.s.v, drift: r.s.drift ?? 0, safe: r.safe, shortcut: r.sc != null }, this._dt ?? 1 / 60);
    r.wrong = r.wrongW.on;
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
    const item = rollItem(this._rank(r), this.racers.length, Math.random, this._level().items);
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
    else if (item === 'marbles') this._pour(r);
    else if (item === 'drink') {
      // A gulp, and away: boosting at once for DRINK.boost seconds, the gauge filling up as you go.
      r.drinkT = DRINK.boost;
      r.fill = true;
      r.drinks = (r.drinks ?? 0) + 1;
    } else if (item === 'helmet') r.helmet = true;
    else if (item === 'tailwind') r.tailwind = 5;
    else if (item === 'police') this._callPolice(r);
  }

  /** What using an item looks and sounds like (for anyone's racer). */
  _itemFx(r, item) {
    const at = { x: r.s.x, y: r.y + 2.4, z: r.s.z, ride: r.s };
    const near = r.me || Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 80;
    if (item === 'police') {
      // (the patrol itself, and the pull-over, are _policeArrive's: sent to everyone as race-police)
      this.fx?.pop('POLICE!', at, { color: '#5a8bff', size: r.me ? 1.1 : 0.9 });
    } else if (item === 'drink') {
      this.fx?.pop('GULP!', at, { color: '#9ef07a', size: r.me ? 1.2 : 1 });
      this.fx?.pop('+BOOST', { ...at, y: at.y + 0.9 }, { color: '#ffd23a', size: r.me ? 0.85 : 0.7 });
      r.view?.drink();
      r.drinkT = Math.max(r.drinkT ?? 0, DRINK.boost);
      if (near) this._gulp(r.me ? 1 : 0.4);
      if (r.me) {
        this._drinkKick = 1;
        this.speedEl.classList.remove('is-gulp');
        void this.speedEl.offsetWidth;
        this.speedEl.classList.add('is-gulp');
      }
    } else if (item === 'marbles') {
      this.fx?.pop('MARBLES!', at, { color: '#7ad8ff', size: r.me ? 1.1 : 0.9 });
    } else if (item === 'helmet') {
      this.fx?.pop('HELMET ON!', at, { color: '#ffd23a', size: 1.1 });
      r.helmet = true;
      r.view?.setHelmet(true);
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

  /* ------------------------------------------------------------ police */

  /**
   * "Call the police": the caller's browser picks who (policeTarget: the nearest rider ahead, or if
   * you lead the one behind) and tells the room; everyone sees the patrol ride up beside them.
   * The gold helmet doesn't help: it takes crashes, and this isn't one.
   */
  _callPolice(r) {
    const target = policeTarget(r, this.racers);
    if (!target) return;
    const side = Math.random() < 0.5 ? 1 : -1;
    this._policeArrive(r, target, side);
    if (this.session?.room) this.session.send({ t: 'race-police', id: r.id, target: target.id, side });
  }

  /** A patrol rides up beside `target` and pulls it over (held where its browser rides it). */
  _policeArrive(by, target, side = 1) {
    this.police?.call(target, { side });
    target.policeStops = (target.policeStops ?? 0) + 1;
    if (target.mine) target.pulled = { t: -POLICE.arrive, dur: POLICE.hold, by: by.id };
    this.fx?.pop('PULL OVER!', { x: target.s.x, y: target.y + 2.5, z: target.s.z, ride: target.s }, { color: '#5a8bff', size: target.me ? 1.2 : 0.9 });
    const near = target.me || by.me || Math.hypot(target.s.x - this.g.pos.x, target.s.z - this.g.pos.z) < 90;
    if (near) this._siren(target.me || by.me ? 1 : 0.45);
  }

  /** A short siren whoop: two rising-and-falling sweeps (synthesised, nobody's recording). */
  _siren(k = 1) {
    const a = this._audio();
    if (!a) return;
    const t0 = a.currentTime;
    const o = a.createOscillator();
    o.type = 'sawtooth';
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06 * k, t0 + 0.05);
    for (let i = 0; i < 2; i++) {
      const t = t0 + i * 0.5;
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(1350, t + 0.22);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.48);
    }
    gain.gain.setValueAtTime(0.06 * k, t0 + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.05);
    o.connect(f).connect(gain).connect(a.destination);
    o.start(t0);
    o.stop(t0 + 1.1);
  }

  /* ----------------------------------------------------------- marbles */

  /**
   * Pour marbles out behind a racer (the pourer's browser plans it and tells the room): from the back
   * wheel, kept in the street they are poured in — on a narrow golmok, only across the half you
   * are riding, so it is never shut.
   */
  _pour(r) {
    const s = r.s;
    const line = this._line(r);
    const i = this._ix(line, 0);
    const here = this._at(line, 0);
    const next = this._at(line, 1) === here ? this._at(line, -1) : this._at(line, 1);
    const lat = lateralOf(s.x, s.z, here, next) * (next === this._at(line, 1) ? 1 : -1);
    const room = line.room ? [line.room[i * 2], line.room[i * 2 + 1]] : null;
    const band = pourBand(here[2] ?? 6, lat, room);
    const pts = [];
    for (let k = -6; k <= 9; k++) {
      const p = this._at(line, k);
      if (pts.length && pts.at(-1)[0] === Math.round(p[0] * 10) / 10 && pts.at(-1)[1] === Math.round(p[1] * 10) / 10) continue;
      pts.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
    }
    const plan = { mid: `${r.id}:m${(this._mid = (this._mid ?? 0) + 1)}`, owner: r.id, x: s.x, z: s.z, heading: s.travel ?? s.heading, v: Math.max(0, s.v), seed: (Math.random() * 2 ** 31) | 0, pts, lo: band.lo, hi: band.hi };
    this._addPatch(plan);
    if (this.session?.room) this.session.send({ t: 'race-marbles', id: r.id, plan });
  }

  /** A patch of marbles in the world: poured (simulated from the plan's seed), then lying a while. */
  _addPatch(plan) {
    const marbles = pourMarbles(plan);
    const pts = plan.pts;
    const walls = this.course?.walls;
    const keep = (x, z) => {
      const c = corridorClamp(pts, x, z, plan.lo, plan.hi);
      if (walls?.hits(c.x, c.z, MARBLE.r)) return { x: NaN, z: NaN, clamped: true };
      return c;
    };
    const p = { ...plan, marbles, keep, born: this.clock, until: this.clock + MARBLE.pour + MARBLE.life, acc: 0, x: plan.x, z: plan.z, r: 12 };
    (this.patches ??= []).push(p);
    this.poured = (this.poured ?? 0) + 1;
    const near = Math.hypot(plan.x - this.g.pos.x, plan.z - this.g.pos.z);
    if (near < 70) rattle(this._audio(), { gain: Math.max(0.12, 0.6 * (1 - near / 70)), pan: this._panOf(plan.x, plan.z), dur: 0.9, n: 34 });
    return p;
  }

  /** Where a point is, left (−1) to right (1), as heard from the camera. */
  _panOf(x, z) {
    const cam = this.g.camera.position;
    const dx = x - cam.x;
    const dz = z - cam.z;
    const yaw = this.g.yaw ?? 0;
    return Math.max(-0.9, Math.min(0.9, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(4, Math.hypot(dx, dz))));
  }

  /** Each frame: the marbles roll and settle (fixed steps, so every browser pours the same patch), and go in the end. */
  _marbles(dt) {
    const list = this.patches ?? [];
    for (const p of [...list]) {
      if (this.clock > p.until) {
        list.splice(list.indexOf(p), 1);
        continue;
      }
      p.acc += dt;
      while (p.acc >= 1 / 60) {
        p.acc -= 1 / 60;
        for (const m of p.marbles) {
          if (m.live && m.y <= 0 && m.vy === 0 && Math.abs(m.vx) + Math.abs(m.vz) < 0.01) continue;
          const keep = (x, z) => {
            const c = p.keep(x, z);
            // (against a wall: it stays where it was)
            return Number.isNaN(c.x) ? { x: m.x, z: m.z, clamped: true } : c;
          };
          stepMarble(m, 1 / 60, keep);
        }
      }
      const b = patchBounds(p);
      p.bx = b.x;
      p.bz = b.z;
      p.br = b.r;
      p.x = b.x;
      p.z = b.z;
      p.r = b.r;
    }
    this.marbleField?.update(list, (x, z) => this.g.surfaceAt(x, z, this.g.groundAt(x, z) + 14), this.clock);
  }

  /**
   * A racer this browser rides, on marbles: the wheels (front and back) over any marbles — and
   * if so the grip goes, it slides and wobbles and loses speed; the moment they reach them, too
   * fast or steering hard, they fall (the golden helmet takes the fall, not the slip).
   */
  _slip(r, input, dt) {
    const s = r.s;
    let n = 0;
    if (this.patches?.length && r.mode === 'ride' && !(s.air > 0)) {
      const fx = -Math.sin(s.heading);
      const fz = -Math.cos(s.heading);
      for (const p of this.patches) {
        if (this.clock - p.born < 0.15) continue;
        const k = marblesAt(p, s.x + fx * 0.45, s.z + fz * 0.45) + marblesAt(p, s.x - fx * 0.4, s.z - fz * 0.4);
        if (!k) continue;
        n += k;
        // ridden through, they scatter
        for (const m of p.marbles) {
          if (!m.live || Math.abs(m.x - s.x) > 0.8 || Math.abs(m.z - s.z) > 0.8) continue;
          const tr = s.travel ?? s.heading;
          const side = (Math.random() - 0.5) * 2.4;
          m.vx += -Math.sin(tr) * s.v * 0.35 + Math.cos(tr) * side;
          m.vz += -Math.cos(tr) * s.v * 0.35 - Math.sin(tr) * side;
          m.vy = 0.3 + Math.random() * 0.5;
        }
      }
    }
    if (n > 0) {
      if (!(r.onMarbles > 0)) this._onMarbles(r);
      r.onMarbles = 0.3;
      r.slip = 1;
    } else {
      r.onMarbles = Math.max(0, (r.onMarbles ?? 0) - dt);
      r.slip = Math.max(0, (r.slip ?? 0) - dt * 1.6);
    }
    if (r.slip > 0 && r.mode === 'ride') {
      input.grip = (input.grip ?? 1) * (1 - (1 - MARBLE.slipGrip) * r.slip);
      s.wobble = Math.max(s.wobble ?? 0, 0.85 * r.slip);
      s.v = Math.max(0, s.v - s.v * MARBLE.speedLoss * r.slip * dt);
      const j = Math.sin(this.clock * 23 + r.id.length * 1.7) + Math.sin(this.clock * 37.7 + r.id.length) * 0.6;
      s.heading += j * 1.4 * r.slip * dt;
      s.travel = (s.travel ?? s.heading) + j * 0.8 * r.slip * dt;
      input.boost = false;
    }
  }

  /** The moment a racer's wheels reach marbles: the clatter, SLIP!, and a fall if too fast or turning hard. */
  _onMarbles(r) {
    const s = r.s;
    r.slips = (r.slips ?? 0) + 1;
    const fall = marbleFall(Math.abs(s.v), s.steer ?? 0, s.lean ?? 0, r.spec.maxLean ?? 0.6);
    (this.slipLog ??= []).push({ id: r.id, v: Math.round(s.v * 36) / 10, steer: Math.round((s.steer ?? 0) * 100) / 100, fall, helmet: Boolean(r.helmet), t: Math.round(this.clock * 10) / 10 });
    const d = Math.hypot(s.x - this.g.pos.x, s.z - this.g.pos.z);
    if (d < 60) rattle(this._audio(), { gain: r.me ? 0.7 : Math.max(0.1, 0.5 * (1 - d / 60)), pan: r.me ? 0 : this._panOf(s.x, s.z), dur: 0.55, n: 22 });
    if (fall) {
      this._crash(r, 'marbles');
      if (r.mode === 'ride') this.fx?.pop('SLIP!', { x: s.x, y: r.y + 2.2, z: s.z, ride: s }, { color: '#7ad8ff', size: r.me ? 1 : 0.8 });
    } else {
      this.fx?.pop(r.me ? 'WOBBLE!' : 'SLIP!', { x: s.x, y: r.y + 2.2, z: s.z, ride: s }, { color: '#7ad8ff', size: r.me ? 0.9 : 0.7 });
      if (r.me) this.shake = Math.max(this.shake ?? 0, 0.12);
    }
  }

  /* ---------------------------------------------------------- branches */

  /**
   * Use a branch: it is for the rider right ahead of you (the nearest ahead round the course, in reach)
   * and only them — after a wind-up it is thrown and homes in on their front wheel. With nobody ahead
   * in reach it is still thrown, and wasted: it flies on and bursts into leaves. Never a trap behind.
   */
  _throwBranch(r) {
    const target = this._branchTarget(r);
    const bid = `${r.id}:${(this._bid = (this._bid ?? 0) + 1)}`;
    r.pendingBranch = { bid, target: target?.id ?? null, at: this.clock };
  }

  /** The rider a branch would be thrown at: the nearest one ahead round the course, in reach (branch.js); else null. */
  _branchTarget(r) {
    return branchTarget(r, this.racers);
  }

  /** The branch leaves the hand (the thrower's browser plans it and tells the room). */
  _launch(r, plan, bid, waste = false) {
    this._addBranch(r, plan, bid, waste);
    if (this.session?.room) this.session.send({ t: 'race-branch', id: r.id, bid, waste, plan });
  }

  /** A branch in the air: homing on its rider's wheel, or (wasted) flying on to burst. */
  _addBranch(r, plan, bid, waste) {
    const mesh = branchModel();
    this.g.scene.add(mesh);
    const b = { bid, owner: r.id, plan, t: 0, state: 'fly', waste: Boolean(waste || !plan.target), mesh, base: this.g.surfaceAt(plan.sx, plan.sz, r.y + 0.5) };
    (this.branches ??= []).push(b);
    this.thrown = (this.thrown ?? 0) + 1;
    if (b.waste) this.wasted = (this.wasted ?? 0) + 1;
    if (Math.hypot(r.s.x - this.g.pos.x, r.s.z - this.g.pos.z) < 60) this._whoosh(0.5);
    return b;
  }

  /** Where a rider's front wheel will be in `t` seconds (where a branch aimed at it comes down). */
  _wheelAhead(o, t) {
    const s = o.s;
    const tr = s.travel ?? s.heading;
    return { x: s.x - Math.sin(s.heading) * 0.45 - Math.sin(tr) * s.v * t, z: s.z - Math.cos(s.heading) * 0.45 - Math.cos(tr) * s.v * t };
  }

  /** Each frame: wind-ups let go, branches fly at their rider's wheel (or on, wasted) and burst. */
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
      const s = r.s;
      const hand = { x: s.x + Math.cos(s.heading) * 0.25, y: 1.7, z: s.z - Math.sin(s.heading) * 0.25 };
      // (the one right ahead when it was used, if still ahead — else whoever is now; never anyone
      // behind. Used with nobody ahead, it is wasted, whoever rides past in the wind-up.)
      const still = this.racers.find((o) => o.id === p.target && !o.left && o.done == null && o.dist > r.dist);
      const target = p.target ? still ?? this._branchTarget(r) : null;
      if (!target) {
        // nobody ahead: thrown on up the road, and wasted
        const fx = -Math.sin(s.heading);
        const fz = -Math.cos(s.heading);
        this._launch(r, { sx: hand.x, sy: hand.y, sz: hand.z, tx: s.x + fx * THROW.waste, tz: s.z + fz * THROW.waste, T: THROW.wasteT, target: null }, p.bid, true);
        continue;
      }
      // aimed at their front wheel, where it will be when the branch comes down
      const t = target.s;
      const vel = { x: -Math.sin(t.travel ?? t.heading) * t.v, z: -Math.cos(t.travel ?? t.heading) * t.v };
      this._launch(r, { ...throwPlan(hand, this._wheelAhead(target, 0), vel), target: target.id }, p.bid, false);
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
    for (const g of [...(this.leafBursts ?? [])]) if (!stepLeaves(g, dt)) this.leafBursts.splice(this.leafBursts.indexOf(g), 1);
    const list = this.branches ?? [];
    for (const b of [...list]) {
      b.t += dt;
      const m = b.mesh;
      if (b.state === 'wait') {
        // down at a wheel another browser rides: theirs to say if it caught (race-branch-gone); else it bursts
        const tg = this.racers.find((o) => o.id === b.plan.target);
        if (tg) m.position.set(tg.s.x - Math.sin(tg.s.heading) * 0.45, tg.y + 0.3, tg.s.z - Math.cos(tg.s.heading) * 0.45);
        if (b.t > 1) this._fizzle(b);
        continue;
      }
      // Homing: the landing spot follows the wheel it was thrown at all the way down — only a helmet saves them.
      const tg = !b.waste && b.plan.target ? this.racers.find((o) => o.id === b.plan.target && !o.left) : null;
      if (tg) {
        const w = this._wheelAhead(tg, Math.max(0, b.plan.T - b.t));
        b.plan.tx = w.x;
        b.plan.tz = w.z;
      }
      const f = flightAt(b.plan, Math.min(b.t, b.plan.T));
      const ground = this.g.surfaceAt(f.x, f.z, b.base + 2);
      m.position.set(f.x, ground + Math.max(0.05, f.y), f.z);
      m.rotation.set(f.spin, Math.atan2(b.plan.tx - b.plan.sx, b.plan.tz - b.plan.sz), f.spin * 0.3, 'YXZ');
      // down at the wheel (or at the end of its flight): theirs to catch — nobody else's
      const atWheel = tg && f.u > 0.55 && f.y < 1.3 && Math.hypot(f.x - b.plan.tx, f.z - b.plan.tz) < THROW.hitR;
      if (!atWheel && b.t < b.plan.T) continue;
      if (!tg) this._fizzle(b);
      else if (tg.mine && tg.done == null) this._branchCatch(b, tg);
      else if (tg.mine) this._fizzle(b);
      else {
        b.state = 'wait';
        b.t = 0;
      }
    }
  }

  /**
   * The branch at its rider's front wheel: caught (decided by the browser that rides them). Over the
   * bars — unless a gold helmet takes it (_crash), they are already down, or just caught one.
   */
  _branchCatch(b, r) {
    const fell = r.mode === 'ride' && r.branchSafe <= 0 && r.safe <= 0 && !r.helmet;
    if (r.mode === 'ride' && r.branchSafe <= 0 && r.safe <= 0) this._crash(r, 'branch');
    this._snapBranch(b, r);
    if (this.session?.room) this.session.send({ t: 'race-branch-gone', bid: b.bid, by: r.id, fell });
  }

  /** A branch caught (or ridden into by someone immune): CRACK, a burst of leaves, gone. */
  _snapBranch(b, r = null) {
    const at = b.mesh.position;
    const near = Math.hypot(at.x - this.g.pos.x, at.z - this.g.pos.z);
    this.fx?.pop('CRACK!', { x: at.x, y: at.y + 1.9, z: at.z }, { color: '#8bd450', size: r?.me ? 1.5 : 1.15 });
    this.fx?.dust({ x: at.x, y: at.y + 0.2, z: at.z }, 6);
    this._leaves(at, 14);
    if (near < 70) {
      const n = snapSound(this._audio(), Math.max(0.15, 1 - near / 70));
      this.snaps = (this.snaps ?? 0) + (n ? 1 : 0);
    }
    this.caught = (this.caught ?? 0) + 1;
    this._dropBranch(b);
  }

  /** A wasted branch (nobody ahead, or its rider gone): a soft poof of leaves where it came down, nobody hurt. */
  _fizzle(b) {
    const at = b.mesh.position;
    this.fx?.pop('POOF', { x: at.x, y: at.y + 1.2, z: at.z }, { color: '#b9e38f', size: 0.85 });
    this.fx?.dust({ x: at.x, y: at.y, z: at.z }, 3);
    this._leaves(at, 16);
    this.fizzled = (this.fizzled ?? 0) + 1;
    this._dropBranch(b);
  }

  /** Leaves flung out where a branch broke up (branch.js leafBurst), if anyone near could see them. */
  _leaves(at, n) {
    if (Math.hypot(at.x - this.g.pos.x, at.z - this.g.pos.z) > 120) return;
    const g = leafBurst({ x: at.x, y: at.y + 0.3, z: at.z }, n);
    this.g.scene.add(g);
    (this.leafBursts ??= []).push(g);
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
    // The line it follows: the course, or the short cut it chose.
    const line = this._line(r);
    const P = (k) => this._at(line, k);
    const s = r.s;
    const v = Math.max(0, s.v);
    // (in a narrow street it aims nearer, or it would cut the corners through the walls)
    const narrowK = Math.min(1, Math.max(0.35, ((P(0)?.[2] ?? 8) - 2) / 6));
    const ahead = Math.max(1, Math.round((4 + v * 0.6 * narrowK) / 6));
    let t = P(ahead);
    let t2 = P(ahead + 1);
    if (t === t2) t = P(ahead - 1);
    const hd = heading(t, t2 === t ? P(ahead + 1) : t2);
    // Its own line in the street: on a big road the right-hand half, in an alley all of it —
    // and round anyone slower in that line, on the side with more room — never nearer a wall than
    // its handlebars allow (the room the walls really leave, roomOf).
    const small = isSmall(t[3] ?? 4);
    const ti = this._ix(line, ahead);
    const fit = (b) => {
      if (!line.room) return b;
      const lo = Math.max(b.lo, -line.room[ti * 2] + 0.75);
      const hi = Math.min(b.hi, line.room[ti * 2 + 1] - 0.75);
      return lo <= hi ? { lo, hi } : { lo: (lo + hi) / 2, hi: (lo + hi) / 2 };
    };
    // (in a small street coming up to a corner, all of its width: the line through a square corner
    // swings out from the inside wall — keeping to its own side there runs it into the corner's building)
    let cornerSoon = false;
    if (small) for (let j = 1; j < 7 && !cornerSoon; j++) {
      const a = P(j - 2);
      const b = P(j);
      const c2 = P(j + 2);
      cornerSoon = Math.abs(turn(Math.atan2(b[0] - a[0], b[1] - a[1]), Math.atan2(c2[0] - b[0], c2[1] - b[1]))) > 0.45;
    }
    // (a short cut's residential lane has a raised pavement down its right (golmok.js): ridden clear of its kerb)
    const walk = line.path && (t[3] ?? 4) === 5 && (t[2] ?? 6) >= 5 ? (t[2] ?? 6) / 2 - 1.75 : Infinity;
    const offWalk = (b) => (b.hi > walk ? { lo: Math.min(b.lo, walk - 0.4), hi: walk } : b);
    const band = offWalk(fit(laneBand(t[2] ?? 6, small, cornerSoon, Boolean(t[4]))));
    const wide = offWalk(fit(laneBand(t[2] ?? 6, small, true, Boolean(t[4]))));
    r.laneK ??= 0.5;
    let want = band.lo + (band.hi - band.lo) * r.laneK;
    const here = P(0);
    const next = P(1) === here ? P(-1) : P(1);
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
    // A car parked at the kerb ahead in its line: round it on the middle side, in good time.
    for (const pv of this.traffic?.vehicles ?? []) {
      if (!pv.parked) continue;
      const dx = pv.box.x - s.x;
      const dz = pv.box.z - s.z;
      const along = dx * -Math.sin(s.heading) + dz * -Math.cos(s.heading);
      if (along < -pv.box.halfLength || along > 14 + v * 1.6) continue;
      const pLat = lateralOf(pv.box.x, pv.box.z, here, next);
      const clear = pLat - pv.box.halfWidth - 0.85;
      if (want > clear) want = Math.max(wide.lo, clear);
    }
    // Rung at from behind: give them the middle of the road for a moment.
    r.yieldT = Math.max(0, (r.yieldT ?? 0) - dt);
    if (r.yieldT > 0 && !passing) want = band.hi - 0.15;
    // Ease across (a bike drifts over, it doesn't jump).
    r.lat ??= myLat;
    r.lat += Math.max(-1.6 * dt, Math.min(1.6 * dt, want - r.lat));
    r.lane = r.lat;
    const aimX = t[0] + Math.cos(hd) * r.lat;
    const aimZ = t[1] - Math.sin(hd) * r.lat;
    let steer = Math.max(-1, Math.min(1, turn(s.heading, Math.atan2(-(aimX - s.x), -(aimZ - s.z))) * 2.2));
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
    // People: steered round, and someone right in the line is braked for (they may not step aside in time).
    let personAhead = Infinity;
    for (const p of this.g.life?.near(s.x, s.z, R) ?? []) {
      consider(p.x, p.z, isSmall(t[3] ?? 4) ? 0.25 : 0.4);
      const along = (p.x - s.x) * fx + (p.z - s.z) * fz;
      const side = Math.abs((p.x - s.x) * -fz + (p.z - s.z) * fx);
      if (along > 0 && side < 0.85) personAhead = Math.min(personAhead, along);
    }
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
    for (const o of this._props(s.x, s.z, 20) ?? []) consider(o.x, o.z, o.r);
    // Marbles in the road: seen (the sharper bots see more of them) — steered round, and if there is
    // no way round, crossed slowly and straight.
    let marblesAhead = Infinity;
    for (const p of this.patches ?? []) {
      if (p.owner === r.id && this.clock - p.born < 2) continue;
      const seen = (r.seenMarbles ??= {});
      seen[p.mid] ??= Math.random() < 0.45 + ((r.skill ?? 0.9) - 0.86) * 3;
      if (!seen[p.mid]) continue;
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const along = dx * fx + dz * fz;
      if (along < -p.r || along > R) continue;
      const side = Math.abs(dx * -fz + dz * fx);
      if (side > p.r + 1.2) continue;
      consider(p.x, p.z, p.r * 0.8);
      marblesAhead = Math.min(marblesAhead, Math.max(0, along - p.r));
    }
    // The walls (walls.js): feelers out ahead and to each side — one near on a side steers it away, one
    // straight ahead is a stop to brake for.
    let wallAhead = Infinity;
    const walls = this.course.walls;
    if (walls && v > 2) {
      const look = 3 + v * 0.75;
      const tr = s.travel ?? s.heading;
      for (const a of [0.6, 0.32, 0.14, 0, -0.14, -0.32, -0.6]) {
        const h = tr + a;
        const d = walls.ray(s.x, s.z, -Math.sin(h), -Math.cos(h), look);
        if (d >= look) continue;
        // where it is: how far ahead, and how far to the side of the way we're going
        const ahead2 = d * Math.cos(a);
        const lateral = d * Math.abs(Math.sin(a));
        // in our own path (a bike's width and a bit): a wall to brake for
        if (lateral < 0.9) wallAhead = Math.min(wallAhead, ahead2);
        // close beside the path ahead: ease away from it (a wall to the left (+a) pushes right: −)
        else if (lateral < 1.7) push -= Math.sign(a) * (1 - lateral / 1.7) * (1 - ahead2 / look) * 1.6;
      }
    }
    // Steering is + to the left; something on our right pushes us left.
    steer = Math.max(-1, Math.min(1, steer + push * r.skill));
    const grip = Math.min(1.05, this._grip() * (r.spec.grip ?? 1));
    let target = r.spec.boostTop;
    let straight = true;
    // Corners ahead (about 100 m of them): how fast each can be taken, and braking for it in time —
    // a tight one (a 90° junction) drifted, faster than any lean would take it.
    const decel = r.spec.brake * Math.min(1, grip) * 0.7;
    // (as fast as the street's width lets it swing round: a lane barely two cars wide, gently)
    const driftV = Math.min(12 + (r.skill - 0.86) * 28, Math.max(7.5, 1.6 + Math.min(P(0)?.[2] ?? 8, P(4)?.[2] ?? 8) * 1.15)) * Math.min(1, grip * 1.1);
    let driftNow = 0;
    for (let j = 1; j < 17; j++) {
      const a = P(j);
      const b = P(j + 3);
      const p0 = P(j - 3);
      if (a === b || a === p0) break;
      const bend = Math.abs(turn(Math.atan2(a[0] - p0[0], a[1] - p0[1]), Math.atan2(b[0] - a[0], b[1] - a[1])));
      if (j < 9 && bend > 0.25) straight = false;
      // (a road's corner is cut across its width: the line through it is wider than the kerb's)
      const w = Math.min(a[2] ?? 8, b[2] ?? 8);
      // (into or along a small street there is far less room to swing wide: a much tighter line)
      const tight = isSmall(b[3] ?? 4) || isSmall(a[3] ?? 4);
      let corner = cornerSpeed(Math.max(1e-3, bend / Math.min(30, tight ? 3 + w * 1.3 : 12 + w * 1.6)), grip, r.spec) * (0.78 + 0.14 * r.skill);
      if (bend > 0.9) {
        corner = Math.max(corner, driftV);
        // close to it and too quick to lean round: drift (the way it turns)
        if (j <= 2 && v > corner * 0.8 && !driftNow && Math.min(w, P(0)?.[2] ?? 8) >= 7) driftNow = Math.sign(turn(Math.atan2(a[0] - p0[0], a[1] - p0[1]), Math.atan2(b[0] - a[0], b[1] - a[1]))) || 0;
      }
      target = Math.min(target, Math.sqrt(corner * corner + 2 * decel * Math.max(0, j * 6 - 5)));
    }
    // Run wide off the course (a corner overcooked): slow, and back onto it.
    if ((r.off ?? 0) > (here[2] ?? 6) / 2 + 2.5) target = Math.min(target, 9);
    // Something in the way with no way round: slow to its speed in time.
    if (block < R && Math.abs(push) < 0.6) target = Math.min(target, blockV + Math.sqrt(2 * decel * Math.max(0, block - 5)));
    // (close, and steering round it may not be enough: slow down too)
    else if (block < 16) target = Math.min(target, blockV + 2 + Math.sqrt(2 * decel * Math.max(0, block - 3)));
    if (crossing < R) target = Math.min(target, Math.sqrt(2 * decel * Math.max(0, crossing - 6)));
    if (personAhead < R) target = Math.min(target, Math.max(2, Math.sqrt(2 * decel * Math.max(0, personAhead - 3))));
    // A wall straight ahead (a corner come too wide, a dead end of the map): brake for it in time.
    if (wallAhead < Infinity) target = Math.min(target, Math.max(3, Math.sqrt(2 * decel * Math.max(0, wallAhead - 2.5))));
    // marbles it can't steer round: down to a safe speed before them, and straight across
    const slow = MARBLE.steerV * 0.92;
    if (marblesAhead < Infinity && Math.abs(push) < 0.9) target = Math.min(target, Math.sqrt(slow * slow + 2 * decel * marblesAhead));
    if (r.slip > 0 || marblesAhead < 3) {
      target = Math.min(target, slow);
      steer = Math.max(-0.35, Math.min(0.35, steer));
    }
    // Down a golmok barely wider than the bars: steady, the walls an arm's length off.
    const pinch = Math.min(P(0)?.[2] ?? 8, P(3)?.[2] ?? 8);
    if (pinch < 4.4) target = Math.min(target, 12.5 + 3 * (r.skill - 0.88) * 10);
    // A narrow stretch of road (a slip road, a lane between kerbs): no faster than its width lets you steer.
    else if (pinch < 7.5) target = Math.min(target, 4 + pinch * 1.9);
    r.stuck = this.phase === 'racing' && v < 0.8 ? r.stuck + dt : 0;
    // Nose against a wall (a square corner run wide in a narrow street) and stopped: the rider walks the
    // scooter round toward the way on, a step back off the wall, and rides again — as you would.
    if (v < 1.2 && this.phase === 'racing' && (walls?.ray(s.x, s.z, -Math.sin(s.heading), -Math.cos(s.heading), 1.5) ?? 9) < 1.1) {
      const tgt = heading(P(1), P(4));
      const d = turn(s.heading, tgt);
      s.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, d));
      s.travel = s.heading;
      s.x += Math.sin(s.heading) * 0.5 * dt;
      s.z += Math.cos(s.heading) * 0.5 * dt;
      this._clear(r);
    }
    // (stuck a while — stopped, or getting nowhere, pressed into a corner: back on the course a few
    // metres on, past whatever held it, not the same spot again)
    if (this.phase === 'racing') {
      r.prog ??= { d: r.dist, t: 0 };
      r.prog.t += dt;
      // (on 4 m since — or put back, or anywhere else: counted afresh)
      if (Math.abs(r.dist - r.prog.d) > 4) r.prog = { d: r.dist, t: 0 };
    }
    // (home and cooling down: none of this — it is meant to stop, and it has nothing left to use)
    if (r.done != null) return { steer, throttle: false, brake: true };
    if (r.stuck > 2.5 || (r.prog?.t ?? 0) > 4.5) {
      r.prog = null;
      this._remount(r, 2);
    } else if (r.off > 30) this._remount(r);
    const has = (id) => r.items.indexOf(id);
    if (has('helmet') >= 0 && !r.helmet) this._use(r, has('helmet'));
    // the drink: on a straight with open road, not already boosting (it is three seconds of boost)
    if (has('drink') >= 0 && straight && block > 50 && v > 12 && !s.boosting && r.tailwind <= 0 && !(r.slip > 0)) this._use(r, has('drink'));
    if (has('marbles') >= 0) {
      // poured when someone is right behind (or after holding them a while)
      r.heldMarbles = (r.heldMarbles ?? 0) + dt;
      // (right behind and in its line — within a lane of its back wheel — so they will ride over them)
      const close = this.racers.some((o) => o !== r && !o.left && o.mode === 'ride' && r.dist - o.dist > 2 && r.dist - o.dist < 18 && Math.abs((o.s.x - s.x) * Math.cos(s.heading) - (o.s.z - s.z) * Math.sin(s.heading)) < 2.2);
      if (close || r.heldMarbles > 22) {
        r.heldMarbles = 0;
        this._use(r, has('marbles'));
      }
    }
    if (has('police') >= 0) {
      // Called on whoever is ahead — at a person only half the time, as with the branch (the bots are
      // rivals, not snipers); leading, on the one behind after holding it a while.
      r.heldPolice = (r.heldPolice ?? 0) + dt;
      const aim = policeTarget(r, this.racers);
      r.policeMercy ??= Math.random() < 0.5;
      const ahead = aim && aim.dist > r.dist;
      const spare = aim && !aim.bot && r.policeMercy;
      if (aim && ((ahead && !spare) || r.heldPolice > 14)) {
        r.heldPolice = 0;
        r.policeMercy = null;
        this._use(r, has('police'));
      }
    }
    if (has('tailwind') >= 0 && straight && block > 40 && v > 14) this._use(r, has('tailwind'));
    if (has('branch') >= 0 && !r.pendingBranch) {
      // Only at the rider right ahead, in reach (a throw with nobody there would be wasted) — and at a
      // person only half the time: the bots are rivals, not snipers (the other half they hold it for a
      // bot ahead, or think again after a while).
      r.heldBranch = (r.heldBranch ?? 0) + dt;
      const aim = this._branchTarget(r);
      r.mercy ??= Math.random() < 0.5;
      if (r.heldBranch > 20) {
        r.heldBranch = 0;
        r.mercy = null;
      }
      if (aim && aim.mode === 'ride' && (aim.bot || !r.mercy)) {
        r.heldBranch = 0;
        r.mercy = null;
        this._use(r, has('branch'));
      }
    }
    r.dbg = { block: Math.round(block * 10) / 10, push: Math.round(push * 100) / 100, target: Math.round(target * 10) / 10, steer: Math.round(steer * 100) / 100 };
    const wantBoost = straight && block > 40 && (s.stamina > 0.45 || r.tailwind > 0) && v > 10 && v < target - 0.3;
    // Something stopped close ahead (a car waiting at the junction it's turning through): no drift into it — brake.
    const tooClose = Math.min(block, crossing, personAhead) < 9 + v * 0.35;
    if (tooClose) driftNow = 0;
    // In a drift: held while the corner lasts, steered hard the way it turns (+ left, as steering is).
    r.driftT = driftNow ? 0.45 : tooClose ? 0 : Math.max(0, (r.driftT ?? 0) - dt);
    if (driftNow) r.driftSide = driftNow;
    const drift = r.driftT > 0 && v > 6;
    if (drift && Math.sign(steer) !== Math.sign(r.driftSide)) steer = r.driftSide * 0.4;
    if (drift) steer = Math.sign(steer || r.driftSide) * Math.max(Math.abs(steer), 0.75);
    return { throttle: v < target - 0.2, brake: v > target + 1.2 && (!drift || v > target + 5), steer, drift, boost: wantBoost && Math.random() < 0.4 + 0.6 * r.skill };
  }

  /** The order: finished first (by time), then by how far round. */
  _order() {
    return [...this.racers].filter((r) => !r.left).sort((a, b) => (a.done != null && b.done != null ? a.done - b.done : a.done != null ? -1 : b.done != null ? 1 : b.dist - a.dist));
  }

  _rank(r) {
    return this._order().indexOf(r) + 1;
  }

  /**
   * The finish: once the first rider is home the race stays open FINISH_WINDOW seconds for the
   * others; it ends when everyone is home or the window closes (whoever is still out is DNF, placed
   * by how far they got). Then the podium (_ceremony), then the results.
   */
  _finishCheck() {
    if (this.phase !== 'racing') return;
    const left = this.racers.filter((r) => !r.left);
    const first = Math.min(...left.map((r) => r.done ?? Infinity));
    this.windowEnd = Number.isFinite(first) ? first + FINISH_WINDOW : null;
    const all = left.length > 0 && left.every((r) => r.done != null);
    if (all || (this.windowEnd != null && this.clock >= this.windowEnd)) this._over(all ? 1.6 : 0.6);
  }

  /** The race is over: in `delay` seconds the podium. */
  _over(delay = 0.6) {
    if (this.phase !== 'racing') return;
    this.phase = 'done';
    this.skipEl.hidden = true;
    clearTimeout(this._overT);
    this._overT = setTimeout(() => this._ceremony(), delay * 1000);
  }

  /** Enter (or Skip) once you are home: straight to the podium — the host's call in a room. */
  skipWait() {
    const s = this.session;
    if (this.phase !== 'racing' || this.me?.done == null || (s?.room && !s.isHost)) return;
    if (s?.room) s.send({ t: 'race-skip' });
    this._over(0.3);
  }

  /** Keys the race takes before anything else: any key on the podium brings the results up; Enter skips the wait. */
  key(e) {
    if (this.g.mode !== 'race') return false;
    if (this.podium && !this.resultsUp && !['Escape', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight'].includes(e.code)) {
      this._results();
      return true;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && this.phase === 'racing' && this.me?.done != null) {
      this.skipWait();
      return true;
    }
    return false;
  }

  /**
   * The ceremony: the first three home (in time) on a podium just past the finish line, dancing;
   * the others gone from the street, the traffic out of sight; confetti, the fanfare and the
   * podium's music. The results come up over it after PODIUM_SECONDS, or on any key or click.
   */
  _ceremony() {
    if (this.phase !== 'done' || !this.course || this.podium) return;
    const top = this._order().filter((r) => r.done != null).slice(0, 3);
    if (!top.length) return this._results();
    const c = this.course;
    const n = c.points.length;
    const fi = c.open ? c.finishI : 0;
    // (a little short of the line, the riders facing back down the course: the camera sees the
    // finish gate's banner the right way round behind them)
    const k = c.open ? Math.max(0, fi - 2) : (fi - 2 + n) % n;
    const p = c.points[k];
    const q = c.points[c.open ? Math.min(n - 1, k + 1) : (k + 1) % n];
    const hd = heading(p, q) + Math.PI;
    const walls = c.walls;
    const y = this.g.surfaceAt(p[0], p[1]);
    this.podium = new Podium(this.g.scene, { x: p[0], y, z: p[1], heading: hd, sweep: (x0, z0, x1, z1) => walls?.sweep(x0, z0, x1, z1, 0.4)?.t ?? 1 });
    this.podium.stand(top.map((r) => ({ view: r.view, me: r.me })));
    this.podiumIds = top.map((r) => r.id);
    this.podiumT = 0;
    this.resultsUp = false;
    for (const r of this.racers) if (!top.includes(r)) r.view.root.visible = false;
    for (const t of this.trails?.values() ?? []) if (t.mesh) t.mesh.visible = false;
    if (this.traffic?.group) this.traffic.group.visible = false;
    this.police?.dispose();
    // the HUD away (the podium is the picture now)
    for (const el of [this.mapEl, this.posEl, this.lapEl, this.boardEl, this.speedEl, this.timeEl, this.itemsEl, this.turnEl, this.linesEl, this.helmetEl, this.warnEl, this.scEl, this.msgEl, this.skipEl, this.countEl, this.hintEl]) el.hidden = true;
    this._warnKey = this._scKey = this._turnKey = '';
    this.panel?.hide();
    if (this._hub) this._hub.gain.gain.value = 0;
    this._wind?.set(0);
    if (this._sq) this._sq.gain.gain.value = 0;
    this.g.pos.set(p[0], y, p[1]);
    this.g.speed = 0;
    this.g.music?.cue('victory');
    this._podiumClick = (e) => {
      if (e.target.closest?.('button, a, .race__results, .race__pause, [data-credits]')) return;
      this._results();
    };
    this.g.root.addEventListener('pointerdown', this._podiumClick);
  }

  _send(dt) {
    const s = this.session;
    if (!s?.room) return;
    this.sent += dt;
    if (this.sent < SEND_EVERY) return;
    this.sent = 0;
    const r2 = (v) => Math.round(v * 100) / 100;
    const flags = (r) => (r.s.boosting ? 1 : 0) | (r.s.throttle ? 2 : 0) | (r.s.braking ? 4 : 0) | (r.helmet ? 8 : 0) | (r.tailwind > 0 ? 16 : 0) | (r.drinkT > 0 ? 32 : 0) | (r.slip > 0.3 ? 64 : 0);
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
    // (the finish window: the seconds left for everyone still out, small, under the time)
    const leftS = this.phase === 'racing' && this.windowEnd != null ? Math.max(0, Math.ceil(this.windowEnd - this.clock)) : null;
    this.timeEl.innerHTML = `<b>${clock(this.phase === 'grid' ? 0 : me.done ?? this.clock)}</b>${me.best != null ? `<small>best lap ${clock(me.best)}</small>` : ''}${leftS != null ? `<small class="race__left" data-race-left>⏱ 0:${String(leftS).padStart(2, '0')}</small>` : ''}`;
    const canSkip = this.phase === 'racing' && me.done != null && (!this.session?.room || this.session.isHost);
    if (this.skipEl.hidden === canSkip) this.skipEl.hidden = !canSkip;
    const L = this.course.length * this.laps;
    this.boardEl.innerHTML = order.map((r, i) => `<p class="${r.me ? 'is-me' : ''}"><b>${i + 1}</b><i style="background:${r.color}"></i>${esc(r.ch.name)} <small>${esc(r.name)}${r.bot ? ' · bot' : ''}</small><span>${r.done != null ? clock(r.done) : `${Math.max(0, Math.round((L - r.dist) / 10) * 10)} m`}</span></p>`).join('');
    const kmh = Math.round(Math.abs(me.s.v) * 3.6);
    const st = me.s.stamina;
    const state = me.mode !== 'ride' ? 'OUCH' : me.slip > 0.2 ? 'SLIPPING!' : me.drinkT > 0 ? 'DRINK BOOST' : (me.s.drift ?? 0) > 0.3 ? 'DRIFT' : me.tailwind > 0 ? 'TAILWIND' : me.s.boosting ? 'BOOST' : me.s.tired > 0 ? 'CHARGING…' : me.draft > 0.2 ? 'SLIPSTREAM' : st >= 0.99 ? 'F · BOOST' : '';
    this.speedEl.innerHTML = `<b>${kmh}</b><small>km/h</small><div class="race__boost${st >= 0.99 ? ' is-full' : ''}${me.s.tired > 0 ? ' is-tired' : ''}${me.fill ? ' is-filling' : ''}"><i style="width:${Math.round(st * 100)}%"></i></div><span>${state}</span>`;
    this.speedEl.classList.toggle('is-drink', me.drinkT > 0);
    // The golden helmet's badge: on, and protecting you — or, the moment it saves you, BLOCKED!
    this._helmetBlocked = Math.max(0, (this._helmetBlocked ?? 0) - (this._hudDt ?? 0.016));
    const hk = me.helmet ? 'on' : this._helmetBlocked > 0 ? 'blocked' : '';
    if (hk !== this._helmetKey) {
      this._helmetKey = hk;
      this.helmetEl.hidden = !hk;
      this.helmetEl.className = `race__helmet${hk === 'blocked' ? ' is-blocked' : ''}`;
      if (hk) this.helmetEl.innerHTML = `<img src="${itemIcon('helmet')}" alt="" /><b>${hk === 'on' ? 'GOLD HELMET' : 'BLOCKED!'}</b><small>${hk === 'on' ? 'protected · takes the next fall' : 'the helmet took it'}</small>`;
    }
    // Speed lines round the edge of the screen: from about 55 km/h, stronger flat out and on a boost.
    const lines = me.mode === 'ride' ? Math.min(1, (this.feel ?? 0) * 0.75 + (me.s.boosting || me.tailwind > 0 || me.drinkT > 0 ? 0.35 : 0) + (me.drinkT > 0 ? 0.25 : 0)) : 0;
    this.linesEl.hidden = lines < 0.12;
    if (!this.linesEl.hidden) this.linesEl.style.opacity = lines.toFixed(2);
    // WRONG WAY: steady while it lasts (ride.js wrongWay holds it 1.5 s first), never flashed frame by frame.
    const wrong = Boolean(me.wrong && this.phase === 'racing' && me.done == null);
    if (wrong !== Boolean(this._wrongOn)) {
      this._wrongOn = wrong;
      this.wrongShows = (this.wrongShows ?? 0) + (wrong ? 1 : 0);
      if (wrong) {
        clearTimeout(this._msgT);
        this.msgEl.textContent = 'WRONG WAY';
        this.msgEl.hidden = false;
      } else if (this.msgEl.textContent === 'WRONG WAY') this.msgEl.hidden = true;
    }
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
    this._scHint(me);
    // the map: about twelve times a second
    const now = performance.now();
    if (now - (this.minimapT ?? 0) > 80) {
      this.minimap.draw(this, Math.min(0.3, (now - (this.minimapT || now)) / 1000) || 1 / 12);
      this.minimapT = now;
    }
  }

  /** A short cut coming up on the course: which side, how far, and what it saves; in it, a badge. */
  _scHint(me) {
    const sc = this.phase === 'racing' && me.done == null ? this._nextShortcut(me) : null;
    const inIt = me.sc != null && this.paths?.[me.sc];
    const key = inIt ? `in|${me.sc}` : sc ? `${sc.left}|${Math.round(sc.metres / 10)}` : '';
    if (key === this._scKey) return;
    this._scKey = key;
    this.scEl.hidden = !key;
    if (inIt) this.scEl.innerHTML = `<b>⤴</b><span>SHORTCUT · 지름길</span><small>tight walls — steady</small>`;
    else if (sc) this.scEl.innerHTML = `<b>${sc.left ? '⬉' : '⬈'}</b><span>SHORTCUT ${sc.left ? 'LEFT' : 'RIGHT'}</span><small>${sc.metres < 8 ? 'now' : `${Math.round(sc.metres / 10) * 10} m`} · saves ${Math.round(sc.saves / 10) * 10} m</small>`;
    this.scEl.classList.toggle('is-in', Boolean(inIt));
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
      for (const o of this._props(s.x, s.z, 80) ?? []) look(o.x, o.z, o.r, o.kind === 'pole' ? 'pole' : o.kind);
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

  _results() {
    if (this.phase !== 'done' || this.resultsUp) return;
    this.resultsUp = true;
    if (this._podiumClick) this.g.root.removeEventListener('pointerdown', this._podiumClick);
    this._podiumClick = null;
    const order = this._order();
    // Your finish kept in this browser: the best time and place on this course (the course step's
    // medals), and the next level opened.
    if (this.me?.done != null && this.course?.id) {
      saveProgress(recordRun(loadProgress(), this.course.id, { time: this.me.done, place: order.indexOf(this.me) + 1 }));
      this.lobby.progressChanged();
    }
    if (!this.podium && this.me?.done != null && order.indexOf(this.me) === 0) this.g.music?.cue('victory');
    const s = this.session;
    const host = !s?.room || s.isHost;
    this.resultEl.hidden = false;
    // (over the podium: smaller and low, so they keep dancing above it)
    this.resultEl.classList.toggle('is-podium', Boolean(this.podium));
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
      this.menu('', 'course');
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
      this.menu('', 'course');
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
    if (this.podium) {
      this.podium.aim(camera, { low: this.resultsUp });
      return;
    }
    // (a fixed view, for the end-to-end checks' close-ups of the junctions)
    if (this.debugCam) {
      const d = this.debugCam;
      camera.position.set(d.x, d.y, d.z);
      camera.lookAt(d.tx, d.ty, d.tz);
      camera.fov = d.fov ?? 55;
      camera.updateProjectionMatrix();
      return;
    }
    if (performance.now() - (g.dragAt ?? 0) > 1000) {
      const behind = r.mode === 'ride' ? r.s.travel ?? r.s.heading : g.yaw;
      g.yaw += turn(g.yaw, behind) * 0.1;
      // A little higher in the alleys, to see over the clutter round the next corner.
      const here = this._at(this._line(r), 0);
      const alley = isSmall(here?.[3] ?? 4) && (here?.[2] ?? 6) < 5;
      g.pitch += ((alley ? -0.36 : CHASE.pitch) - g.pitch) * 0.05;
    }
    const dir = new THREE.Vector3(-Math.sin(g.yaw) * Math.cos(g.pitch), Math.sin(g.pitch), -Math.cos(g.yaw) * Math.cos(g.pitch));
    // To the camera's side: left of the way it looks (toward the road's middle, riding on the right).
    const side = new THREE.Vector3(-Math.cos(g.yaw), 0, Math.sin(g.yaw)).multiplyScalar(CHASE.side);
    const focus = new THREE.Vector3(r.s.x - Math.sin(g.yaw) * CHASE.ahead, r.y + CHASE.height, r.s.z - Math.cos(g.yaw) * CHASE.ahead).addScaledVector(side, 0.3);
    // Never inside a building or through a wall: the camera comes in close (and a little up) instead —
    // swept out from the rider against the same walls the rider meets.
    let dist = (g.zoom ?? CHASE.zoom) + Math.min(1.5, Math.abs(r.s.v) * 0.07);
    const walls = this.course.walls;
    if (walls) {
      const cx = focus.x - dir.x * dist + side.x * 0.7;
      const cz = focus.z - dir.z * dist + side.z * 0.7;
      const hit = walls.sweep(r.s.x, r.s.z, cx, cz, 0.3);
      if (hit) dist = Math.max(1.4, dist * hit.t - 0.25);
    }
    // Nor inside a car or a bus beside you, nor through a lamp post or a pole (a grey slab across the
    // middle of the screen for a few frames): the camera comes in in front of it instead.
    const cars = (this.traffic?.vehicles ?? []).filter((v) => Math.hypot(v.box.x - r.s.x, v.box.z - r.s.z) < dist + 8);
    const poles = this.g.nightLights?.polesNear(r.s.x, r.s.z, dist + 2) ?? [];
    for (const p of this._props(r.s.x, r.s.z, dist + 2) ?? []) if (p.kind === 'pole') poles.push([p.x, p.z]);
    for (let d = 1.2; d <= dist; d += 0.4) {
      const x = focus.x - dir.x * d + side.x * 0.7 * (d / dist);
      const z = focus.z - dir.z * d + side.z * 0.7 * (d / dist);
      const y = focus.y - dir.y * d;
      if (cars.some((v) => inBox(v, x, y, z, 0.45))) {
        dist = Math.max(2.2, d - 0.5);
        break;
      }
      if (poles.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.42)) {
        dist = Math.max(1.3, d - 0.45);
        break;
      }
    }
    // (in at once when a wall comes between; back out slowly)
    this._camDist = this._camDist == null || dist < this._camDist ? dist : this._camDist + (dist - this._camDist) * 0.06;
    camera.position.copy(focus).addScaledVector(dir, -this._camDist).addScaledVector(side, 0.7);
    // pulled in close (a wall, a car), it rises to look over the rider rather than into their back
    camera.position.y += Math.max(0, 4 - this._camDist) * 0.5;
    camera.position.y = Math.max(camera.position.y, g.surfaceAt(camera.position.x, camera.position.z, r.y) + 0.9);
    // Last word: out of any wall it still touches (a corner behind you), the way the rider would be pushed.
    if (walls?.hits(camera.position.x, camera.position.z, 0.22)) {
      const out = walls.push(camera.position.x, camera.position.z, 0.25);
      camera.position.x = out.x;
      camera.position.z = out.z;
    }
    this.camInside = Boolean(walls?.inside(camera.position.x, camera.position.z));
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
    const fov = 58 + 13 * Math.min(1, Math.max(0, (v - 4) / 16)) + (r.s.boosting || r.tailwind > 0 || r.drinkT > 0 ? 6 : 0) + (r.drinkT > 0 ? 3 : 0);
    camera.fov += (fov - camera.fov) * 0.08;
    // the gulp: a quick kick of the FOV as the drink's boost goes in
    if (this._drinkKick > 0) {
      camera.fov += this._drinkKick * 0.9;
      this._drinkKick = Math.max(0, this._drinkKick - 1 / 20);
    }
    camera.updateProjectionMatrix();
    // The rivals' fade by the camera judged again from where the camera is now (the race step judged
    // it from last frame's): one put back on the course right by the camera, or swung past it as the
    // camera swings, never pops in whole for a frame.
    for (const o of this.racers) {
      if (o.me || o.left || !o.view) continue;
      const k = nearFade(camera.position, { x: o.s.x, y: o.y + 0.8, z: o.s.z, ride: o.s }, { x: r.s.x, y: r.y + 0.9, z: r.s.z });
      if (k < (o.view._fade ?? 1)) {
        o.view.fade(k);
        if (k < 0.03) o.view.root.visible = false;
      }
    }
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

  /**
   * R: back on the open road at once, wherever you are — wedged against a wall or a building,
   * mid-tumble, dazed. You go back on the course at the place you had reached, so it never skips ahead.
   */
  reset() {
    const me = this.me;
    if (!me || !['racing', 'done'].includes(this.phase) || this.paused || me.left || me.done != null) return;
    this._remount(me);
    me.stuckT = 0;
    this._flash('Back on the road', 1);
  }

  /** The bell (Space, or B): ring-ring — people just ahead step aside, slower riders and scooters ahead give you room. */
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

  /** A can opened and drunk: the ring pull's crack and hiss, then two quick gulps. */
  _gulp(k = 1) {
    const a = this._audio();
    if (!a) return;
    this._whoosh(0.001);
    const t = a.currentTime;
    // crack: a short bright snap of noise
    const crack = a.createBufferSource();
    crack.buffer = this._nbuf;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const cg = a.createGain();
    cg.gain.setValueAtTime(0.35 * k, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    crack.connect(hp).connect(cg).connect(a.destination);
    crack.start(t);
    crack.stop(t + 0.06);
    // the fizz
    const fizz = a.createBufferSource();
    fizz.buffer = this._nbuf;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 6000;
    bp.Q.value = 0.8;
    const fg = a.createGain();
    fg.gain.setValueAtTime(0.0001, t + 0.03);
    fg.gain.exponentialRampToValueAtTime(0.08 * k, t + 0.06);
    fg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    fizz.connect(bp).connect(fg).connect(a.destination);
    fizz.start(t + 0.03);
    fizz.stop(t + 0.5);
    // gulp, gulp: low thumps falling in pitch
    for (const at of [0.28, 0.5]) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(260, t + at);
      o.frequency.exponentialRampToValueAtTime(110, t + at + 0.12);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.3 * k, t + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + at + 0.16);
      o.connect(g).connect(a.destination);
      o.start(t + at);
      o.stop(t + at + 0.18);
    }
    this.gulps = (this.gulps ?? 0) + 1;
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
    clearTimeout(this._overT);
    if (this.paused) this.togglePause(false);
    // the ceremony down first (its riders go back to be disposed with the rest)
    if (this._podiumClick) this.g.root.removeEventListener('pointerdown', this._podiumClick);
    this._podiumClick = null;
    this.podium?.dispose();
    this.podium = null;
    this.podiumIds = null;
    this.resultsUp = false;
    this.windowEnd = null;
    this._wrongOn = false;
    this.resultEl.classList.remove('is-podium');
    for (const r of this.racers) {
      r.view.dispose();
      r.heldMesh?.removeFromParent();
    }
    this.racers = [];
    for (const b of [...(this.branches ?? [])]) this._dropBranch(b);
    for (const g of this.leafBursts ?? []) g.removeFromParent();
    this.leafBursts = [];
    this.patches = [];
    for (const t of this.trails?.values() ?? []) t.dispose();
    this.trails = new Map();
    this.panel?.hide();
    this._helmetKey = null;
    for (const f of this.fans ?? []) f.remove();
    this.fans = [];
    for (const k of ['traffic', 'boxes', 'golmok', 'facades', 'fx', 'police', 'wet', 'speedFx', 'marbleField', 'helmetDrops', 'wood', 'fair']) {
      this[k]?.dispose();
      this[k] = null;
    }
    for (const gm of this.golmoks ?? []) gm.dispose();
    this.golmoks = [];
    this.paths = [];
    this.scGrid = null;
    if (this.decor) this.g.scene.remove(this.decor);
    this.decor = null;
    this.plates = [];
    for (const t of this._boardTex ?? []) t.dispose();
    for (const m of this._boardMats ?? []) m.dispose();
    this.boards = [];
    this.chevrons = null;
    this.scArrows = null;
    for (const sg of this.scSigns ?? []) sg.userData.mat?.map?.dispose();
    this.scSigns = [];
    this.gate = null;
    this.finishGate = null;
    this.course = null;
    this.me = null;
    this._show(false);
    this.countEl.hidden = true;
    this.hintEl.hidden = true;
    this.warnEl.hidden = true;
    this._warnKey = '';
    this.scEl.hidden = true;
    this._scKey = '';
    this.msgEl.hidden = true;
    this.resultEl.hidden = true;
    if (this._hub) this._hub.gain.gain.value = 0;
    this._wind?.set(0);
    if (this._sq) this._sq.gain.gain.value = 0;
    if (this.course) this.g.setMouths?.(null);
    if (this.marks) {
      this.g.scene.remove(this.marks);
      this.marks.geometry.dispose();
      this.marks.material.dispose();
      this.marks = null;
    }
    this.g.raceSky?.(null);
  }

  /** Leave racing altogether: back to flying over Seoul. */
  quit() {
    this._end();
    this.session?.close();
    this.session = null;
    this.menuEl.hidden = true;
    this.lobby.close();
    this.phase = 'off';
    if (this.g.mode === 'race') this.g.setMode('fly', { fromRace: true });
  }

  dispose() {
    this.quit();
    this.stage?.dispose();
    this.stage = null;
    for (const n of [this.menuEl, this.mapEl, this.turnEl, this.posEl, this.lapEl, this.boardEl, this.speedEl, this.timeEl, this.itemsEl, this.countEl, this.msgEl, this.linesEl, this.resultEl, this.pauseEl, this.hintEl, this.warnEl, this.helmetEl, this.skipEl, this.scEl]) n.remove();
    this.panel?.dispose();
    this.panel = null;
  }
}
