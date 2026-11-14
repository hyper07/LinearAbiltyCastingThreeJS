import * as THREE from 'three';
import { Session } from '../net/Session.js';
import { loadCar, makeCar } from './cars.js';
import { stepCar, RACE, CAR } from './drive.js';
import { COURSES, planCourse, locate } from './course.js';

/**
 * Gangnam Drift: night racing for four cars on a loop of real Seoul roads.
 * Alone, against three bots; or up to four people in a room (by code, over
 * the party server), with bots in any empty seats. Drift to fill the boost
 * (Shift spends it). The map in the top left shows the course ahead.
 *
 * Each browser drives its own car (the host also drives the bots) and tells
 * the room where it is fifteen times a second; everyone plans the same
 * course from the same roads, and works out the order from what they hear.
 */

const LUXURY = [
  { color: '#f4f4f2', name: 'Pearl' },
  { color: '#141518', name: 'Obsidian' },
  { color: '#8f1622', name: 'Crimson' },
  { color: '#1f3566', name: 'Midnight' },
  { color: '#e0791c', name: 'Sunset' },
  { color: '#6c7178', name: 'Graphite' }
];
const BOT_NAMES = ['Haneul', 'Doyun', 'Seoyeon', 'Jiho'];
const SEATS = 4;
const SEND_EVERY = 1 / 15;
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (t) => (t == null || !Number.isFinite(t) ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`);
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

export class Race {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.racers = [];
    this.course = null;
    this.phase = 'off'; // off · menu · grid · racing · done
    this.laps = 3;
    this.courseId = COURSES[0].id;
    this.plans = new Map();
    this._hud();
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
    this.posEl = el('race__pos');
    this.boardEl = el('race__board');
    this.speedEl = el('race__speed');
    this.countEl = el('race__count');
    this.driftEl = el('race__drift');
    this.msgEl = el('race__msg');
    this.resultEl = el('race__results');
  }

  _show(on) {
    for (const n of [this.mapEl, this.posEl, this.boardEl, this.speedEl]) n.hidden = !on;
    this.g.root.classList.toggle('is-racing', on);
  }

  /** The race menu: a course, how many laps, alone or together. */
  menu(note = '') {
    this.phase = this.session?.room ? 'lobby' : 'menu';
    this._show(false);
    this.resultEl.hidden = true;
    const s = this.session;
    const host = !s?.room || s.isHost;
    const m = this.menuEl;
    m.hidden = false;
    m.innerHTML = `
      <header><h2>🏁 Gangnam Drift</h2><button type="button" data-race-x aria-label="Close">✕</button></header>
      <p class="race__lead">Four cars, a loop of real Seoul streets at night. Drift through the corners to fill your boost, then <b>Shift</b> to spend it. First over the line after the last lap wins.</p>
      <div class="race__courses">${COURSES.map((c) => `<button type="button" data-course="${c.id}" class="${c.id === this.courseId ? 'is-on' : ''}" ${host ? '' : 'disabled'}><b>${esc(c.name)}</b><span>${esc(c.ko)}</span><small>${esc(c.text)}</small><em data-len="${c.id}">${this.plans.get(c.id) ? `${(this.plans.get(c.id).length / 1000).toFixed(1)} km a lap` : ''}</em></button>`).join('')}</div>
      <div class="race__row"><span>Laps</span>${[1, 2, 3, 5].map((n) => `<button type="button" data-laps="${n}" class="${n === this.laps ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      ${s?.room ? `
        <div class="race__room"><b>Room <span data-race-code>${esc(s.room)}</span></b> — give friends this code (up to four). Bots take any empty seats.
          <ul>${[...s.peers.values()].map((p) => `<li>${esc(p.name)}${p.id === s.host ? ' <em>host</em>' : ''}${p.id === s.id ? ' <em>you</em>' : ''}</li>`).join('')}</ul>
        </div>
        <div class="race__row">${host ? '<button type="button" class="race__go" data-race-start>Start the race</button>' : '<span>Waiting for the host to start…</span>'}<button type="button" data-race-leave>Leave the room</button></div>` : `
        <div class="race__row"><button type="button" class="race__go" data-race-solo>Race three bots</button></div>
        <div class="race__row race__together"><span>With friends</span><button type="button" data-race-make>Make a room</button><input data-race-code-in maxlength="5" placeholder="CODE" /><button type="button" data-race-join>Join</button></div>`}
      <p class="race__note" data-race-note>${esc(note)}</p>
      <p class="race__keys">W go · S brake · A D steer · Space handbrake (drift) · Shift boost · R back on the course · H horn</p>`;
    const $ = (q) => m.querySelector(q);
    $('[data-race-x]').onclick = () => this.quit();
    for (const b of m.querySelectorAll('[data-course]')) b.onclick = () => this._setup({ course: b.dataset.course });
    for (const b of m.querySelectorAll('[data-laps]')) b.onclick = () => this._setup({ laps: Number(b.dataset.laps) });
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
    // Plan the courses' lengths while the menu is up.
    for (const c of COURSES) this._plan(c.id);
  }

  _note(text) {
    const n = this.menuEl.querySelector('[data-race-note]');
    if (n) n.textContent = text;
  }

  _setup({ course = this.courseId, laps = this.laps }) {
    this.courseId = course;
    this.laps = laps;
    if (this.session?.room && this.session.isHost) this.session.send({ t: 'race-setup', course, laps });
    this.menu();
  }

  /** A course, planned once on the real roads. */
  _plan(id) {
    if (this.plans.has(id)) return this.plans.get(id);
    const def = COURSES.find((c) => c.id === id);
    const roads = [];
    for (const list of this.g.roadTiles?.values() ?? []) for (const r of list) if (Math.abs(r.pts[0] - def.x) < def.r * 4 && Math.abs(r.pts[1] - def.z) < def.r * 4) roads.push(r);
    const c = roads.length ? planCourse(roads, def) : null;
    if (c) {
      this.plans.set(id, c);
      const len = this.menuEl.querySelector(`[data-len="${id}"]`);
      if (len) len.textContent = `${(c.length / 1000).toFixed(1)} km a lap`;
    }
    return c;
  }

  /* -------------------------------------------------------- the room */

  async _room(how, code) {
    if (how === 'join' && (!code || code.length !== 5)) return this._note('A room code has five letters');
    this._note('Connecting…');
    this.session?.close();
    const s = new Session();
    this.session = s;
    const name = this.g.account?.name ?? 'Driver';
    s.on('message', (msg) => this._heard(msg));
    s.on('peer', () => this.phase === 'lobby' && this.menu());
    s.on('left', (id) => {
      const r = this.racers.find((x) => x.owner === id);
      if (r && this.phase !== 'lobby') {
        r.left = true;
        r.car.group.visible = false;
      }
      if (this.phase === 'lobby') this.menu();
    });
    s.on('closed', () => this._roomGone('The host closed the room'));
    s.on('disconnected', () => this._roomGone('The connection to the room was lost'));
    try {
      await (how === 'create' ? s.create(name) : s.join(code, name));
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
    if (msg.t === 'race-setup' && msg.from === this.session?.host) {
      this.courseId = msg.course;
      this.laps = msg.laps;
      if (this.phase === 'lobby') this.menu();
    } else if (msg.t === 'race-go' && msg.from === this.session?.host) {
      this.courseId = msg.course;
      this.laps = msg.laps;
      this._begin(msg.grid);
    } else if (msg.t === 'race-cars') {
      for (const [id, x, z, heading, v, steer, y, dist, done, best, drift] of msg.cars) {
        const r = this.racers.find((q) => q.id === id);
        if (!r || r.owner === this.session?.id) continue;
        Object.assign(r, { net: { x, z, heading, y }, dist, done: done < 0 ? null : done, best: best < 0 ? null : best, driftScore: drift });
        r.s.v = v;
        r.s.steer = steer;
      }
    }
  }

  /* ----------------------------------------------------------- races */

  startSolo() {
    this.session?.close();
    this.session = null;
    const grid = [{ id: 'me', name: this.g.account?.name ?? 'You', owner: 'me' }];
    for (let i = 0; i < SEATS - 1; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i], owner: 'me', bot: true, skill: 0.9 + i * 0.035 });
    this.myId = 'me';
    this._begin(grid.map((g, i) => ({ ...g, paint: i })));
  }

  startRoom() {
    const s = this.session;
    if (!s?.isHost) return;
    const people = [...s.peers.values()].slice(0, SEATS);
    const grid = people.map((p, i) => ({ id: p.id, name: p.name, owner: p.id, paint: i }));
    for (let i = grid.length; i < SEATS; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i - 1] ?? 'Bot', owner: s.id, bot: true, skill: 0.92 + i * 0.03, paint: i });
    s.send({ t: 'race-go', course: this.courseId, laps: this.laps, grid });
    this._begin(grid);
  }

  /** Line up the grid on the course, and count down. */
  async _begin(grid) {
    const course = this._plan(this.courseId);
    const kind = await loadCar();
    if (!course || !kind) return this._note(!course ? 'That course could not be planned here — try another' : 'The cars are still loading — try again in a moment');
    this._end();
    this.course = course;
    this.kind = kind;
    this.myId = this.session?.id ?? 'me';
    this.menuEl.hidden = true;
    this.resultEl.hidden = true;
    this._show(true);
    this.g.street?.hide();
    this.hourBefore ??= this.g.hour;
    this.g.setHour(21.5);
    const n = course.points.length;
    const L = course.length;
    this.racers = grid.map((g, i) => {
      // Two by two behind the line.
      const back = (n - 3 - Math.floor(i / 2) * 2 + n) % n;
      const p = course.points[back];
      const q = course.points[(back + 1) % n];
      const heading = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      const side = (i % 2 ? 1 : -1) * Math.min(3, (p[2] ?? 10) / 4);
      const x = p[0] + Math.cos(heading) * side;
      const z = p[1] - Math.sin(heading) * side;
      const paint = LUXURY[(g.paint ?? i) % LUXURY.length];
      const car = makeCar(kind, paint.color, { lite: g.id !== this.myId });
      this.g.scene.add(car.group);
      const mine = g.owner === this.myId;
      return {
        ...g,
        color: paint.color,
        car,
        mine,
        me: g.id === this.myId,
        s: { x, z, heading, travel: heading, v: 0, steer: 0 },
        y: this.g.surfaceAt(x, z),
        pitch: 0,
        idx: back,
        dist: course.s[back] - L,
        lapsDone: 0,
        lapStart: 0,
        lapTimes: [],
        best: null,
        done: null,
        boost: 0.35,
        driftScore: 0,
        combo: 0,
        comboIdle: 0,
        stuck: 0,
        reverse: 0,
        net: null
      };
    });
    this.me = this.racers.find((r) => r.me);
    this._decor();
    this.phase = 'grid';
    this.count = 3.99;
    this.clock = 0;
    this.sent = 0;
    this.g.setMode('race');
    this.g.zoom = 7.5;
    this.g.yaw = this.me.s.heading;
    this.g.pitch = -0.18;
  }

  /** The course on the road: glowing chevrons along it, and a gate over the start. */
  _decor() {
    this.decor = new THREE.Group();
    const c = this.course;
    const n = c.points.length;
    const chev = new THREE.Shape();
    // Pointing the way to go (after the turn onto the ground, shape +y is the car's forward).
    chev.moveTo(-1.1, -0.5);
    chev.lineTo(0, 0.5);
    chev.lineTo(1.1, -0.5);
    chev.lineTo(1.1, -0.95);
    chev.lineTo(0, 0.05);
    chev.lineTo(-1.1, -0.95);
    chev.closePath();
    const geo = new THREE.ShapeGeometry(chev).rotateX(-Math.PI / 2).scale(1.6, 1, 1.6);
    const mat = new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 });
    const every = 2; // a chevron every 12 m
    const count = Math.floor(n / every);
    this.chevrons = new THREE.InstancedMesh(geo, mat, count);
    this.chevrons.frustumCulled = false;
    this.chevrons.userData.at = [];
    for (let k = 0; k < count; k++) {
      const i = k * every;
      const p = c.points[i];
      const q = c.points[(i + 1) % n];
      this.chevrons.userData.at.push({ x: p[0], z: p[1], heading: Math.atan2(-(q[0] - p[0]), -(q[1] - p[1])) });
    }
    this._lift(true);
    this.decor.add(this.chevrons);
    // The start: two posts and a chequered banner across the road.
    const p = c.points[0];
    const q = c.points[1];
    const heading = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
    const w = Math.max(14, (p[2] ?? 12) + 4);
    const gate = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.6, roughness: 0.4 });
    for (const sx of [-w / 2, w / 2]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), post);
      m.position.set(sx, 3.5, 0);
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
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(150, 10, 212, 44);
    g.fillStyle = '#ff7a1a';
    g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('START · FINISH', 256, 33);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.y = 6.2;
    gate.add(banner);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -8 }));
    line.position.y = 0.05;
    gate.add(line);
    gate.position.set(p[0], this.g.surfaceAt(p[0], p[1]), p[1]);
    gate.rotation.y = heading;
    this.gate = gate;
    this.decor.add(gate);
    this.g.scene.add(this.decor);
  }

  /** Sit the chevrons on the road surface near you (roads and bridges load as you go). */
  _lift(all = false) {
    const m = this.chevrons;
    if (!m) return;
    const p = this.g.pos;
    const o = new THREE.Object3D();
    m.userData.at.forEach((a, k) => {
      if (!all && Math.hypot(a.x - p.x, a.z - p.z) > 400) return;
      o.position.set(a.x, this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14) + 0.22, a.z);
      o.rotation.set(0, a.heading, 0);
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------------------------------------------- a frame */

  update(dt) {
    if (!this.course || this.phase === 'menu' || this.phase === 'lobby' || this.phase === 'off') return;
    const k = this.g.keys;
    const key = (...codes) => codes.some((c) => k.has(c));
    if (this.phase === 'grid') {
      // 3, 2, 1 — GO.
      const was = Math.ceil(this.count);
      this.count -= dt;
      const now = Math.ceil(this.count);
      this.countEl.hidden = false;
      this.countEl.textContent = this.count > 0 ? String(now) : 'GO!';
      if (was !== now) this._beep(now > 0 ? 440 : 880);
      if (this.count <= 0) {
        this.phase = 'racing';
        this.clock = 0;
        for (const r of this.racers) r.lapStart = 0;
      }
    } else if (this.count > -0.8) {
      this.count -= dt;
      if (this.count <= -0.8) this.countEl.hidden = true;
    }
    const racing = this.phase === 'racing' || this.phase === 'done';
    if (racing) this.clock += dt;
    for (const r of this.racers) {
      if (r.left) continue;
      if (r.mine) {
        let input = {};
        if (racing && r.done == null) {
          if (r.me) input = { throttle: key('KeyW', 'ArrowUp'), brake: key('KeyS', 'ArrowDown'), left: key('KeyA', 'ArrowLeft'), right: key('KeyD', 'ArrowRight'), handbrake: key('Space'), boost: key('ShiftLeft', 'ShiftRight') && r.boost > 0.02 };
          else input = this._bot(r, dt);
        } else if (r.done != null) input = { brake: r.s.v > 0.5 };
        if (input.boost) r.boost = Math.max(0, r.boost - dt * 0.28);
        const blocked = (x, z) => Boolean(this.g.buildingAt(x, z));
        const { hit } = stepCar(r.s, input, dt, blocked, RACE);
        if (hit > 6 && r.me) this.g.street?._thud?.(Math.min(1, hit / 30));
        r.braking = input.brake && r.s.v > 0.5;
        r.boosting = Boolean(input.boost);
        this._drift(r, dt, racing);
        if (r.me) this.g.street?._engine?.(1, r.s.v, input.throttle);
      } else if (r.net) {
        // Someone else's car: glide to where they said they were.
        const kk = Math.min(1, dt * 10);
        r.s.x += (r.net.x - r.s.x) * kk;
        r.s.z += (r.net.z - r.s.z) * kk;
        r.s.heading += turn(r.s.heading, r.net.heading) * kk;
      }
    }
    this._bump();
    for (const r of this.racers) {
      if (r.left) continue;
      this._place(r, dt);
      if (r.mine) this._progress(r);
    }
    // Respawn on the course: R, or a bot well off it for a while.
    if (this.me && racing && key('KeyR') && !this._rHeld) this._respawn(this.me);
    this._rHeld = key('KeyR');
    this.g.pos.set(this.me.s.x, this.me.y, this.me.s.z);
    this.g.speed = Math.abs(this.me.s.v);
    if (racing) this._finishCheck();
    this._send(dt);
    this._lift();
    this._hudFrame();
  }

  /** Sliding through a corner: points while it lasts, and boost. */
  _drift(r, dt, racing) {
    const sliding = racing && r.s.drift > 0.22 && Math.abs(r.s.v) > 12;
    if (sliding) {
      r.combo += dt * Math.abs(r.s.v) * (1 + r.s.drift) * 3;
      r.comboIdle = 0;
      r.boost = Math.min(1, r.boost + dt * 0.2);
    } else if (r.combo > 0) {
      r.comboIdle += dt;
      if (r.comboIdle > 0.7) {
        r.driftScore += Math.round(r.combo);
        if (r.me) this._driftPop(Math.round(r.combo), true);
        r.combo = 0;
      }
    }
    if (r.me && sliding) this._driftPop(Math.round(r.combo), false);
  }

  _driftPop(points, banked) {
    const e = this.driftEl;
    e.hidden = points < 30;
    e.classList.toggle('is-banked', banked);
    e.textContent = banked ? `DRIFT +${points}` : `DRIFT ${points}`;
    clearTimeout(this._driftT);
    this._driftT = setTimeout(() => (e.hidden = true), banked ? 1200 : 400);
  }

  /** Cars that touch push apart (only the ones this browser drives are moved). */
  _bump() {
    const list = this.racers.filter((r) => !r.left);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.s.x - a.s.x;
        const dz = b.s.z - a.s.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.4 || d < 1e-3) continue;
        const push = (2.4 - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        if (a.mine) {
          a.s.x -= nx * push * (b.mine ? 1 : 2);
          a.s.z -= nz * push * (b.mine ? 1 : 2);
          a.s.v *= 0.985;
        }
        if (b.mine) {
          b.s.x += nx * push * (a.mine ? 1 : 2);
          b.s.z += nz * push * (a.mine ? 1 : 2);
          b.s.v *= 0.985;
        }
      }
    }
  }

  _place(r, dt) {
    const s = r.s;
    const fx = -Math.sin(s.heading) * CAR.halfLength;
    const fz = -Math.cos(s.heading) * CAR.halfLength;
    const target = r.net && !r.mine ? r.net.y : this.g.surfaceAt(s.x, s.z, r.y);
    r.y += (target - r.y) * Math.min(1, dt * 12);
    const yf = this.g.surfaceAt(s.x + fx, s.z + fz, r.y);
    const yb = this.g.surfaceAt(s.x - fx, s.z - fz, r.y);
    r.pitch += (Math.atan2(yf - yb, CAR.halfLength * 2) - r.pitch) * Math.min(1, dt * 8);
    const g = r.car.group;
    g.position.set(s.x, r.y, s.z);
    g.rotation.order = 'YXZ';
    g.rotation.set(r.pitch, s.heading, 0);
    r.car.wheels(s.steer ?? 0, (s.v * dt) / (this.kind.radius || 0.34));
    r.car.near(r.me || Math.hypot(s.x - this.g.pos.x, s.z - this.g.pos.z) < 140);
    r.car.lights(1, r.braking);
  }

  /** How far round the course a car has gone: following the nearest point of it, laps counted at the line. */
  _progress(r) {
    const c = this.course;
    const L = c.length;
    const loc = locate(c, r.s.x, r.s.z, r.idx);
    const width = c.points[loc.i][2] ?? 12;
    r.off = loc.off;
    if (loc.off < width / 2 + 30) {
      let d = c.s[loc.i] - c.s[r.idx];
      if (d > L / 2) d -= L;
      if (d < -L / 2) d += L;
      r.dist += d;
      r.idx = loc.i;
      // Going the wrong way along the course?
      const q = c.points[(loc.i + 1) % c.points.length];
      const p = c.points[loc.i];
      const way = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      r.wrong = Math.abs(turn(r.s.heading, way)) > 2 && r.s.v > 4;
    }
    // Laps done: the grid is just behind the line, so the first crossing starts lap one.
    const laps = Math.floor(r.dist / L);
    if (this.phase === 'racing' && laps > r.lapsDone) {
      const lap = this.clock - r.lapStart;
      r.lapTimes.push(lap);
      r.best = r.best == null ? lap : Math.min(r.best, lap);
      if (r.me && laps < this.laps) this._flash(`Lap ${laps + 1} of ${this.laps} · ${clock(lap)}${r.best === lap && laps > 1 ? ' · best!' : ''}`);
      r.lapsDone = laps;
      r.lapStart = this.clock;
      if (laps >= this.laps && r.done == null) {
        r.done = this.clock;
        if (r.me) this._flash(`Finished ${ordinal(this._rank(r))} · ${clock(r.done)}`, 3);
      }
    }
  }

  _respawn(r) {
    const c = this.course;
    const p = c.points[r.idx];
    const q = c.points[(r.idx + 1) % c.points.length];
    Object.assign(r.s, { x: p[0], z: p[1], heading: Math.atan2(-(q[0] - p[0]), -(q[1] - p[1])), v: 0, steer: 0 });
    r.s.travel = r.s.heading;
    r.y = this.g.surfaceAt(p[0], p[1], this.g.groundAt(p[0], p[1]) + 14);
  }

  /** A bot: aim a little ahead on the course, slow for the corners it can see coming, slide the hard ones. */
  _bot(r, dt) {
    const c = this.course;
    const n = c.points.length;
    const v = Math.max(0, r.s.v);
    if (r.reverse > 0) {
      r.reverse -= dt;
      return { brake: true, steer: r.unstick };
    }
    const ahead = Math.round(Math.min(26, Math.max(2, (9 + v * 0.65) / 6)));
    const t = c.points[(r.idx + ahead) % n];
    let steer = Math.max(-1, Math.min(1, turn(r.s.heading, Math.atan2(-(t[0] - r.s.x), -(t[1] - r.s.z))) * 2.4));
    // A car just ahead: go round it.
    for (const o of this.racers) {
      if (o === r || o.left) continue;
      const dx = o.s.x - r.s.x;
      const dz = o.s.z - r.s.z;
      const along = -dx * Math.sin(r.s.heading) - dz * Math.cos(r.s.heading);
      const side = dx * Math.cos(r.s.heading) - dz * Math.sin(r.s.heading);
      if (along > 0 && along < 10 && Math.abs(side) < 2.2) steer = Math.max(-1, Math.min(1, steer + (side > 0 ? 0.45 : -0.45)));
    }
    // The fastest it can take what is coming: for each bend ahead, the speed for its sharpness, plus what braking can shed before it.
    const top = RACE.top * r.skill;
    let target = top;
    let sharpest = 0;
    for (let j = 2; j < 32; j += 2) {
      const a = c.points[(r.idx + j) % n];
      const b = c.points[(r.idx + j + 5) % n];
      const p0 = c.points[(r.idx + j - 5 + n) % n];
      const bend = Math.abs(turn(Math.atan2(a[0] - p0[0], a[1] - p0[1]), Math.atan2(b[0] - a[0], b[1] - a[1])));
      sharpest = Math.max(sharpest, j < 10 ? bend : 0);
      const radius = 30 / Math.max(0.02, bend);
      const corner = Math.sqrt(10 * r.skill * radius);
      target = Math.min(target, Math.sqrt(corner * corner + 2 * 22 * Math.max(0, j * 6 - 8)));
    }
    // Stuck against something: back off and turn away.
    r.stuck = this.phase === 'racing' && v < 1.5 ? r.stuck + dt : 0;
    if (r.stuck > 1.3) {
      r.stuck = 0;
      r.reverse = 1.1;
      r.unstick = -Math.sign(steer || 1);
    }
    if (r.off > 60) {
      r.lost = (r.lost ?? 0) + dt;
      if (r.lost > 4) {
        r.lost = 0;
        this._respawn(r);
      }
    } else r.lost = 0;
    return {
      throttle: v < target - 0.5,
      brake: v > target + 3,
      steer,
      handbrake: sharpest > 0.9 && v > 18 && Math.abs(steer) > 0.6,
      boost: r.boost > 0.4 && sharpest < 0.15 && v > 25 && Math.abs(steer) < 0.2
    };
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
    // Everyone home — or forty-five seconds after the winner — and it is over.
    if (this.phase === 'racing' && (all || (Number.isFinite(first) && this.clock - first > 45) || (this.me.done != null && left.filter((r) => !r.bot).every((r) => r.done != null)))) {
      this.phase = 'done';
      setTimeout(() => this._results(), all ? 1200 : 0);
    }
  }

  _send(dt) {
    const s = this.session;
    if (!s?.room) return;
    this.sent += dt;
    if (this.sent < SEND_EVERY) return;
    this.sent = 0;
    const r2 = (v) => Math.round(v * 100) / 100;
    s.send({ t: 'race-cars', cars: this.racers.filter((r) => r.mine && !r.left).map((r) => [r.id, r2(r.s.x), r2(r.s.z), r2(r.s.heading), r2(r.s.v), r2(r.s.steer), r2(r.y), r2(r.dist), r.done ?? -1, r.best ?? -1, r.driftScore]) });
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
    this.posEl.innerHTML = `<b>${ordinal(rank)}</b><small>of ${order.length}</small><span>LAP ${lap}/${this.laps}</span><i>${clock(this.phase === 'grid' ? 0 : me.done ?? this.clock - me.lapStart)}</i><em>best ${clock(me.best)} · total ${clock(me.done ?? (this.phase === 'grid' ? 0 : this.clock))}</em>`;
    this.boardEl.innerHTML = order.map((r, i) => `<p class="${r.me ? 'is-me' : ''}"><b>${i + 1}</b><i style="background:${r.color}"></i>${esc(r.name)}${r.bot ? ' <small>bot</small>' : ''}<span>${r.done != null ? clock(r.done) : `lap ${Math.min(this.laps, Math.max(1, Math.floor(r.dist / this.course.length) + 1))}`}</span></p>`).join('');
    const kmh = Math.round(Math.abs(me.s.v) * 3.6);
    this.speedEl.innerHTML = `<b>${kmh}</b><small>km/h</small><div class="race__boost"><i style="width:${Math.round(me.boost * 100)}%"></i></div><span>${me.boosting ? 'BOOST' : me.s.drift > 0.22 && Math.abs(me.s.v) > 12 ? 'DRIFT' : me.s.v < -0.3 ? 'R' : ''}</span>`;
    if (me.wrong && this.phase === 'racing') this._flash('WRONG WAY', 0.4);
    this._minimap();
  }

  /** The map in the top left: the course ahead in orange over the streets, everyone on it; the way you face is up. */
  _minimap() {
    const cv = this.mapEl;
    const g = cv.getContext('2d');
    const W = cv.width;
    const R = W / 2;
    const me = this.me;
    const scale = 0.72; // pixels a metre: about 300 m to the edge
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.roundRect(0, 0, W, W, 28);
    g.clip();
    g.fillStyle = 'rgba(12, 14, 22, 0.86)';
    g.fillRect(0, 0, W, W);
    g.translate(R, R * 1.25); // you sit a little below the middle, to see more ahead
    g.rotate(me.s.heading);
    g.scale(scale, scale);
    g.translate(-me.s.x, -me.s.z);
    // The streets.
    g.strokeStyle = 'rgba(150, 160, 180, 0.45)';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const reach = 420;
    const cell = 40;
    const seen = new Set();
    for (let i = Math.floor((me.s.x - reach) / cell); i <= Math.floor((me.s.x + reach) / cell); i++) {
      for (let j = Math.floor((me.s.z - reach) / cell); j <= Math.floor((me.s.z + reach) / cell); j++) {
        for (const s of this.g.roadHash?.get(`${i}_${j}`) ?? []) {
          if (seen.has(s)) continue;
          seen.add(s);
          g.lineWidth = Math.max(4, s.half * 1.4);
          g.beginPath();
          g.moveTo(s.ax, s.az);
          g.lineTo(s.bx, s.bz);
          g.stroke();
        }
      }
    }
    // The course: the whole loop faint, the next stretch bright.
    const pts = this.course.points;
    const n = pts.length;
    g.strokeStyle = 'rgba(255, 122, 26, 0.35)';
    g.lineWidth = 9;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.stroke();
    g.strokeStyle = '#ff8a2a';
    g.lineWidth = 13;
    g.beginPath();
    for (let k = 0; k < 90; k++) {
      const p = pts[(me.idx + k) % n];
      if (k) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    // The line.
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(pts[0][0], pts[0][1], 9, 0, Math.PI * 2);
    g.fill();
    // The others.
    for (const r of this.racers) {
      if (r === me || r.left) continue;
      g.fillStyle = r.color;
      g.strokeStyle = '#fff';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(r.s.x, r.s.z, 9, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
    // You.
    g.fillStyle = '#ffd400';
    g.beginPath();
    g.moveTo(R, R * 1.25 - 16);
    g.lineTo(R + 11, R * 1.25 + 12);
    g.lineTo(R, R * 1.25 + 6);
    g.lineTo(R - 11, R * 1.25 + 12);
    g.closePath();
    g.fill();
  }

  _results() {
    if (this.phase !== 'done') return;
    const order = this._order();
    const s = this.session;
    const host = !s?.room || s.isHost;
    this.resultEl.hidden = false;
    this.resultEl.innerHTML = `
      <h2>${this.me.done != null ? `You finished ${ordinal(order.indexOf(this.me) + 1)}` : 'Race over'}</h2>
      <table><thead><tr><th></th><th>Driver</th><th>Time</th><th>Best lap</th><th>Drift</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'is-me' : ''}"><td>${i + 1}</td><td><i style="background:${r.color}"></i>${esc(r.name)}${r.bot ? ' <small>bot</small>' : ''}</td><td>${r.done != null ? clock(r.done) : 'DNF'}</td><td>${clock(r.best)}</td><td>${r.driftScore + Math.round(r.combo || 0)}</td></tr>`).join('')}
      </tbody></table>
      <div class="race__row">${host ? '<button type="button" class="race__go" data-race-again>Race again</button>' : '<span>The host can start another.</span>'}<button type="button" data-race-menu>Courses</button><button type="button" data-race-quit>Back to Seoul</button></div>`;
    const $ = (q) => this.resultEl.querySelector(q);
    if ($('[data-race-again]')) $('[data-race-again]').onclick = () => (s?.room ? this.startRoom() : this.startSolo());
    $('[data-race-menu]').onclick = () => {
      this._end();
      this.menu();
    };
    $('[data-race-quit]').onclick = () => this.quit();
  }

  /** The chase camera: low behind the car, swinging after it, wider when fast or boosting. */
  camera(camera) {
    const g = this.g;
    const r = this.me;
    if (!r) return;
    if (performance.now() - (g.dragAt ?? 0) > 1000) {
      const behind = r.s.v < -1 ? r.s.heading + Math.PI : r.s.travel ?? r.s.heading;
      g.yaw += turn(g.yaw, behind) * 0.12;
      g.pitch += (-0.16 - g.pitch) * 0.08;
    }
    const dir = new THREE.Vector3(-Math.sin(g.yaw) * Math.cos(g.pitch), Math.sin(g.pitch), -Math.cos(g.yaw) * Math.cos(g.pitch));
    const focus = new THREE.Vector3(r.s.x, r.y + 1.2, r.s.z);
    camera.position.copy(focus).addScaledVector(dir, -((g.zoom ?? 7.5) + Math.abs(r.s.v) * 0.04));
    camera.position.y = Math.max(camera.position.y, g.surfaceAt(camera.position.x, camera.position.z, r.y) + 0.7);
    camera.lookAt(focus);
    const fov = 60 + Math.min(16, Math.abs(r.s.v) * 0.25) + (r.boosting ? 8 : 0);
    camera.fov += (fov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
  }

  _beep(freq) {
    const a = this.g.street?._audio?.();
    if (!a) return;
    const o = a.createOscillator();
    const gain = a.createGain();
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
    o.connect(gain).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.36);
  }

  horn() {
    this.g.street?._horn?.(0.35, 415);
  }

  /** Take the race down (cars, course, HUD), keeping the room. */
  _end() {
    for (const r of this.racers) this.g.scene.remove(r.car.group);
    this.racers = [];
    if (this.decor) this.g.scene.remove(this.decor);
    this.decor = null;
    this.chevrons = null;
    this.course = null;
    this.me = null;
    this._show(false);
    this.countEl.hidden = true;
    this.msgEl.hidden = true;
    this.driftEl.hidden = true;
    this.resultEl.hidden = true;
    this.g.street?._engine?.(0);
  }

  /** Leave racing altogether: back to flying over Seoul. */
  quit() {
    this._end();
    this.session?.close();
    this.session = null;
    this.menuEl.hidden = true;
    this.phase = 'off';
    if (this.hourBefore != null) this.g.setHour(this.hourBefore);
    this.hourBefore = null;
    if (this.g.mode === 'race') this.g.setMode('fly', { fromRace: true });
  }

  dispose() {
    this.quit();
    for (const n of [this.menuEl, this.mapEl, this.posEl, this.boardEl, this.speedEl, this.countEl, this.driftEl, this.msgEl, this.resultEl]) n.remove();
  }
}
