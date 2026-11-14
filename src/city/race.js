import * as THREE from 'three';
import { Session } from '../net/Session.js';
import { loadCar, makeCar } from './cars.js';
import { stepCar, RACE, CAR } from './drive.js';
import { COURSES, planCourse, planRun, locate } from './course.js';
import { GARAGE, GARAGE_ORDER, ratings } from './garage.js';
import { loadPerson, Person } from './people.js';

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
    this.car = { id: 'solenne', paint: 0 };
    try {
      const saved = JSON.parse(localStorage.getItem('gamory.drift.car') ?? 'null');
      if (GARAGE[saved?.id]) this.car = { id: saved.id, paint: Math.max(0, Math.min(3, saved.paint | 0)) };
    } catch {
      /* private mode */
    }
    this.picks = new Map();
    this._hud();
  }

  _saveCar() {
    try {
      localStorage.setItem('gamory.drift.car', JSON.stringify(this.car));
    } catch {
      /* private mode */
    }
    if (this.session?.room) {
      if (this.session.isHost) this.picks.set(this.session.id, { ...this.car });
      else this.session.send({ t: 'race-pick', ...this.car });
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
    this.turnEl = el('race__turn');
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
    if (!on) this.turnEl.hidden = true;
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
      <div class="race__courses">${COURSES.map((c) => `<button type="button" data-course="${c.id}" class="${c.id === this.courseId ? 'is-on' : ''}" ${host ? '' : 'disabled'}><b>${esc(c.name)}</b><span>${esc(c.ko)}${c.run ? ' · <strong>RUN</strong>' : c.long ? ' · <strong>LONG</strong>' : ''}</span><small>${esc(c.text)}</small><em data-len="${c.id}">${this.plans.get(c.id) ? `${(this.plans.get(c.id).length / 1000).toFixed(1)} km ${this.plans.get(c.id).open ? `· ${this.plans.get(c.id).checkpoints.length} checkpoints` : 'a lap'}` : c.run ? 'planning…' : ''}</em></button>`).join('')}</div>
      <h3 class="race__label">Your car</h3>
      <div class="race__garage">${GARAGE_ORDER.map((id) => {
        const c = GARAGE[id];
        const r = ratings(id);
        const bar = (name, v) => `<span class="race__stat"><small>${name}</small><i><b style="width:${Math.round(Math.max(0.08, Math.min(1, v)) * 100)}%"></b></i></span>`;
        return `<button type="button" data-car="${id}" class="${this.car.id === id ? 'is-on' : ''}"><b>${esc(c.name)}</b><em>${esc(c.kind)}</em><small>${esc(c.text)}</small>${bar('Speed', r.speed)}${bar('Pick-up', r.pickup)}${bar('Grip', r.grip)}${bar('Drift', r.drift)}</button>`;
      }).join('')}</div>
      <div class="race__row race__paints"><span>Paint</span>${GARAGE[this.car.id].paints.map((c, i) => `<button type="button" data-paint="${i}" class="${this.car.paint === i ? 'is-on' : ''}" style="background:${c}" aria-label="Paint ${i + 1}"></button>`).join('')}</div>
      ${COURSES.find((c) => c.id === this.courseId)?.run ? '<div class="race__row"><span>A run: start to finish, one go — checkpoints in every district on the way.</span></div>' : `<div class="race__row"><span>Laps</span>${[1, 2, 3, 5].map((n) => `<button type="button" data-laps="${n}" class="${n === this.laps ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${n}</button>`).join('')}</div>`}
      ${s?.room ? `
        <div class="race__room"><b>Room <span data-race-code>${esc(s.room)}</span></b> — give friends this code (up to four). Bots take any empty seats.
          <ul>${[...s.peers.values()].map((p) => { const pick = p.id === s.id ? this.car : this.picks.get(p.id); return `<li>${pick ? `<i style="background:${GARAGE[pick.id].paints[pick.paint]}"></i>` : ''}${esc(p.name)}${pick ? ` — ${esc(GARAGE[pick.id].name)}` : ''}${p.id === s.host ? ' <em>host</em>' : ''}${p.id === s.id ? ' <em>you</em>' : ''}</li>`; }).join('')}</ul>
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
    for (const b of m.querySelectorAll('[data-car]')) b.onclick = () => {
      this.car = { id: b.dataset.car, paint: 0 };
      this._saveCar();
      this.menu();
    };
    for (const b of m.querySelectorAll('[data-paint]')) b.onclick = () => {
      this.car.paint = Number(b.dataset.paint);
      this._saveCar();
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
    // Plan the courses' lengths while the menu is up.
    for (const c of COURSES) this._plan(c.id);
  }

  _note(text) {
    const n = this.menuEl.querySelector('[data-race-note]');
    if (n) n.textContent = text;
  }

  _setup({ course = this.courseId, laps = this.laps }) {
    // A long course is a single lap unless asked otherwise.
    const def = COURSES.find((c) => c.id === course);
    if (course !== this.courseId && def?.laps) laps = def.laps;
    else if (course !== this.courseId && !def?.long && this.laps === 1) laps = 3;
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
    let c = null;
    if (def.run) {
      for (const list of this.g.roadTiles?.values() ?? []) roads.push(...list);
      const where = new Map((this.g.index?.districts ?? []).map((d) => [d.name, { name: d.name, x: d.x - 198050, z: -(d.y - 551860) }]));
      const stops = def.stops.map((n) => where.get(n)).filter(Boolean);
      c = roads.length && stops.length === def.stops.length ? planRun(roads, stops) : null;
    } else {
      for (const list of this.g.roadTiles?.values() ?? []) for (const r of list) if (Math.abs(r.pts[0] - def.x) < def.r * 4 && Math.abs(r.pts[1] - def.z) < def.r * 4) roads.push(r);
      c = roads.length ? planCourse(roads, def) : null;
    }
    if (c) {
      this.plans.set(id, c);
      const len = this.menuEl.querySelector(`[data-len="${id}"]`);
      if (len) len.textContent = `${(c.length / 1000).toFixed(1)} km ${c.open ? `· ${c.checkpoints.length} checkpoints` : 'a lap'}`;
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
    this.picks = new Map();
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
      this._saveCar();
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
    if (msg.t === 'race-pick' && this.session?.isHost && GARAGE[msg.car ?? msg.id]) {
      this.picks.set(msg.from, { id: msg.id, paint: Math.max(0, Math.min(3, msg.paint | 0)) });
      if (this.phase === 'lobby') this.menu();
      return;
    }
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
    const grid = [{ id: 'me', name: this.g.account?.name ?? 'You', owner: 'me', car: this.car.id, color: GARAGE[this.car.id].paints[this.car.paint] }];
    for (let i = 0; i < SEATS - 1; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i], owner: 'me', bot: true, skill: 0.9 + i * 0.035, ...this._botCar(i) });
    this.myId = 'me';
    this._begin(grid);
  }

  startRoom() {
    const s = this.session;
    if (!s?.isHost) return;
    const people = [...s.peers.values()].slice(0, SEATS);
    this.picks.set(s.id, { ...this.car });
    const grid = people.map((p) => {
      const pick = this.picks.get(p.id) ?? { id: 'solenne', paint: 0 };
      return { id: p.id, name: p.name, owner: p.id, car: pick.id, color: GARAGE[pick.id].paints[pick.paint] };
    });
    for (let i = grid.length; i < SEATS; i++) grid.push({ id: `bot${i}`, name: BOT_NAMES[i - 1] ?? 'Bot', owner: s.id, bot: true, skill: 0.92 + i * 0.03, ...this._botCar(i) });
    s.send({ t: 'race-go', course: this.courseId, laps: this.laps, grid });
    this._begin(grid);
  }

  /** A bot's car: any from the garage, in one of its paints. */
  _botCar(i) {
    const id = GARAGE_ORDER[(i * 2 + Math.floor(Math.random() * 5)) % GARAGE_ORDER.length];
    return { car: id, color: GARAGE[id].paints[Math.floor(Math.random() * 4)] };
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
    // A run starts at a gate a little way in (the grid lines up before it) and finishes at its end.
    this.open = Boolean(course.open);
    this.gateAt = this.open ? 12 : 0;
    this.goal = this.open ? L - course.s[this.gateAt] : this.laps * L;
    if (this.open) this.laps = 1;
    this.cpFirst = new Map();
    this.racers = grid.map((g, i) => {
      // Two by two behind the line.
      const back = this.open ? Math.max(0, this.gateAt - 3 - Math.floor(i / 2) * 2) : (n - 3 - Math.floor(i / 2) * 2 + n) % n;
      const p = course.points[back];
      const q = course.points[(back + 1) % n];
      const heading = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      const side = (i % 2 ? 1 : -1) * Math.min(3, (p[2] ?? 10) / 4);
      const x = p[0] + Math.cos(heading) * side;
      const z = p[1] - Math.sin(heading) * side;
      const model = GARAGE[g.car] ?? GARAGE.solenne;
      const color = g.color ?? LUXURY[i % LUXURY.length].color;
      const car = makeCar(kind, color, { lite: g.id !== this.myId, look: model.look });
      this.g.scene.add(car.group);
      const mine = g.owner === this.myId;
      return {
        ...g,
        color,
        model,
        spec: { ...RACE, ...model.spec },
        car,
        mine,
        me: g.id === this.myId,
        s: { x, z, heading, travel: heading, v: 0, steer: 0 },
        y: this.g.surfaceAt(x, z),
        pitch: 0,
        idx: back,
        dist: this.open ? course.s[back] - course.s[this.gateAt] : course.s[back] - L,
        cp: 0,
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
    const every = c.open ? 3 : 2; // a chevron every 12 m (18 on a run)
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
    // The start: two posts and a chequered banner across the road (and for a run, another at its end).
    if (c.open) this._gate(c.points.length - 2, 'FINISH');
    const p = c.points[this.gateAt ?? 0];
    const q = c.points[(this.gateAt ?? 0) + 1];
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
    g.fillText(c.open ? 'START' : 'START · FINISH', 256, 33);
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
    this._turnSigns();
    this._crowdSpots();
    this.g.scene.add(this.decor);
  }

  /**
   * The course's turns: where it bends (over 60 m) by more than about 25°,
   * which way, and how hard. Each gets an arrow board on the outside of the
   * bend, facing the cars coming, and is named on screen as it comes up.
   */
  _turnSigns() {
    const c = this.course;
    const pts = c.points;
    const n = pts.length;
    const dir = (i, j) => {
      const a = pts[((i % n) + n) % n];
      const b = pts[((j % n) + n) % n];
      return Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
    };
    const bendAt = (i) => turn(dir(i - 5, i), dir(i, i + 5));
    this.turns = [];
    let run = null;
    for (let i = 0; i <= n; i++) {
      const b = i < n ? bendAt(i) : 0;
      if (Math.abs(b) > 0.45 && i < n) {
        if (!run || Math.sign(b) !== Math.sign(run.bend)) {
          if (run) this.turns.push(run);
          run = { at: i, bend: b, from: i };
        } else if (Math.abs(b) > Math.abs(run.bend)) Object.assign(run, { at: i, bend: b });
      } else if (run) {
        this.turns.push(run);
        run = null;
      }
    }
    // A bend split by the loop's join is one bend.
    for (const t of this.turns) t.total = Math.abs(turn(dir(t.from - 5, t.from), dir(t.at + 5, t.at + 10)));
    const boards = new Map();
    const board = (left, sharp) => {
      const k = `${left}|${sharp}`;
      if (boards.has(k)) return boards.get(k);
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 160;
      const g = cv.getContext('2d');
      g.fillStyle = sharp ? '#c4161c' : '#16181f';
      g.fillRect(0, 0, 256, 160);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 6;
      g.strokeRect(6, 6, 244, 148);
      g.fillStyle = sharp ? '#ffffff' : '#ff8a2a';
      // Chevrons pointing the way to turn.
      for (let k2 = 0; k2 < (sharp ? 3 : 2); k2++) {
        const x = 70 + k2 * 58;
        g.beginPath();
        g.moveTo(x + 30, 30);
        g.lineTo(x - 10, 80);
        g.lineTo(x + 30, 130);
        g.lineTo(x + 52, 130);
        g.lineTo(x + 12, 80);
        g.lineTo(x + 52, 30);
        g.closePath();
        g.fill();
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (!left) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.x = -1; // mirrored: pointing right
      }
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      boards.set(k, mat);
      return mat;
    };
    const post = new THREE.MeshStandardMaterial({ color: '#2a2c33', metalness: 0.6, roughness: 0.4 });
    for (const t of this.turns) {
      const left = t.bend > 0;
      const sharp = t.total > 1.2;
      // On the outside of the bend at its apex, square to the cars coming in.
      const p = pts[t.at];
      const approach = dir(t.at - 8, t.at - 2);
      const w = (p[2] ?? 12) / 2 + 2.5;
      // Outside: right of the way in for a left turn, left of it for a right.
      const side = left ? 1 : -1;
      const fx = -Math.sin(approach);
      const fz = -Math.cos(approach);
      const x = p[0] + -fz * side * w + fx * 6;
      const z = p[1] + fx * side * w + fz * 6;
      const sign = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), board(left, sharp));
      panel.position.y = 3.3;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), post);
      pole.position.y = 1.7;
      sign.add(panel, pole);
      sign.position.set(x, this.g.surfaceAt(x, z, this.g.groundAt(x, z) + 14), z);
      sign.rotation.y = approach; // its face to the cars coming
      sign.userData.at = { x, z };
      this.decor.add(sign);
      t.sign = sign;
    }
  }

  /**
   * Where the crowds stand: both sides of the start, the outside of every
   * turn, and every half kilometre along the straights — behind a barrier,
   * facing the road. The people themselves come and go as you near them.
   */
  _crowdSpots() {
    const c = this.course;
    const pts = c.points;
    const n = pts.length;
    const at = new Set(c.open ? [this.gateAt + 2, n - 6] : [2, n - 8]);
    const big = new Set(at);
    for (const cp of c.checkpoints ?? []) {
      at.add(cp.i);
      big.add(cp.i);
    }
    for (const t of this.turns ?? []) at.add(t.at);
    for (let i = 0; i < n; i += Math.round((c.open ? 800 : 500) / 6)) at.add(i);
    const spots = [];
    const used = [];
    for (const i of [...at].sort((a, b) => a - b)) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      const heading = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      const turnHere = this.turns?.find((t) => t.at === i);
      const sides = big.has(i) ? [1, -1] : turnHere ? [turnHere.bend > 0 ? 1 : -1] : [i % 2 ? 1 : -1];
      for (const side of sides) {
        const w = (p[2] ?? 12) / 2 + 2.6;
        const x = p[0] + Math.cos(heading) * side * w;
        const z = p[1] - Math.sin(heading) * side * w;
        if (used.some(([ux, uz]) => Math.hypot(ux - x, uz - z) < 25)) continue;
        if (this.g.buildingAt?.(x, z)) continue;
        used.push([x, z]);
        // A run of barriers along the kerb (built when you come near): white, banded red.
        const fence = [];
        for (let k = -3; k <= 3; k++) fence.push({ x: x - Math.sin(heading) * k * 2, z: z - Math.cos(heading) * k * 2, yaw: heading, kind: k % 2 ? 'red' : 'white' });
        spots.push({ x, z, heading, side, fence, people: [], count: big.has(i) ? 10 : turnHere ? 7 : 5, cheerAt: 0 });
      }
    }
    this.spots = spots;
    // Cones down the inside of every turn.
    this.coneSets = (this.turns ?? []).map((t) => {
      const p = pts[t.at];
      const q = pts[(t.at + 1) % n];
      const heading = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      const inner = t.bend > 0 ? -1 : 1;
      const w = (p[2] ?? 12) / 2 - 0.8;
      const list = [];
      for (let k = -2; k <= 2; k++) {
        const along = k * 4;
        list.push({ x: p[0] + Math.cos(heading) * inner * w - Math.sin(heading) * along, z: p[1] - Math.sin(heading) * inner * w - Math.cos(heading) * along, yaw: heading, kind: 'cone' });
      }
      return { x: p[0], z: p[1], fence: list, cones: true };
    });
  }

  /* ------------------------------------------------- barriers and cones */

  /**
   * The things at the roadside you can hit: barrier blocks and cones, built
   * as you come near and cleared as you leave. A car that hits one sends it
   * flying (and loses a little speed); it falls, tumbles and comes to rest
   * where it lands. The crowd behind a barrier that is hit jumps back.
   */
  _blocks(dt) {
    this.blocks ??= [];
    const me = this.me;
    this.blockMats ??= {
      white: new THREE.MeshStandardMaterial({ color: '#ececec', roughness: 0.55 }),
      red: new THREE.MeshStandardMaterial({ color: '#d8241c', roughness: 0.55 }),
      cone: new THREE.MeshStandardMaterial({ color: '#ff6a10', roughness: 0.5 }),
      band: new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.4, emissive: '#666', emissiveIntensity: 0.4 })
    };
    const make = (b) => {
      let mesh;
      if (b.kind === 'cone') {
        mesh = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.75, 14), this.blockMats.cone);
        body.position.y = 0.375;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.12, 14), this.blockMats.band);
        band.position.y = 0.42;
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), this.blockMats.cone);
        foot.position.y = 0.025;
        mesh.add(body, band, foot);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.38).translate(0, 0.45, 0), this.blockMats[b.kind]);
      }
      mesh.traverse((o) => (o.castShadow = Boolean(o.isMesh)));
      this.g.scene.add(mesh);
      return mesh;
    };
    // Build what is near; clear what is far (unless still flying).
    for (const set of [...(this.spots ?? []), ...(this.coneSets ?? [])]) {
      const d = Math.hypot(set.x - me.s.x, set.z - me.s.z);
      if (d < 260 && !set.built) {
        set.built = set.fence.map((f) => {
          const b = { ...f, set, y: this.g.surfaceAt(f.x, f.z, this.g.groundAt(f.x, f.z) + 14), vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, spin: [0, 0, 0], flying: false, half: f.kind === 'cone' ? [0.28, 0.28] : [0.95, 0.19] };
          b.ground = b.y;
          b.mesh = make(b);
          this.blocks.push(b);
          return b;
        });
      } else if (d > 380 && set.built && !set.built.some((b) => b.flying)) {
        for (const b of set.built) this.g.scene.remove(b.mesh);
        this.blocks = this.blocks.filter((b) => b.set !== set);
        set.built = null;
      }
    }
    // Cars against blocks.
    for (const r of this.racers) {
      if (r.left || (!r.mine && !r.net)) continue;
      const s = r.s;
      if (Math.hypot(s.x - me.s.x, s.z - me.s.z) > 280) continue;
      const fx = -Math.sin(s.heading);
      const fz = -Math.cos(s.heading);
      for (const b of this.blocks) {
        if (Math.abs(b.x - s.x) > 4 || Math.abs(b.z - s.z) > 4) continue;
        // The car as two circles, nose and tail; the block as a box turned with the road.
        for (const along of [1.25, -1.25]) {
          const cx = s.x + fx * along;
          const cz = s.z + fz * along;
          const dx = cx - b.x;
          const dz = cz - b.z;
          const lx = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw);
          const lz = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
          const px = Math.max(-b.half[0], Math.min(b.half[0], lx));
          const pz = Math.max(-b.half[1], Math.min(b.half[1], lz));
          if (Math.hypot(lx - px, lz - pz) > 1.05) continue;
          const speed = Math.abs(s.v);
          if (speed < 1.5 && !b.flying) {
            // Nudged at walking pace: it slides.
            b.x += -dx * 0.05;
            b.z += -dz * 0.05;
            continue;
          }
          if (b.hitBy === r && b.flying) continue;
          // Hit: off it goes, the way the car was going, up and turning; the car loses a little.
          const tx = -Math.sin(s.travel ?? s.heading);
          const tz = -Math.cos(s.travel ?? s.heading);
          const away = Math.hypot(dx, dz) || 1;
          const light = b.kind === 'cone' ? 1.4 : 1;
          b.vx = (tx * speed * 0.85 - (dx / away) * 2) * light;
          b.vz = (tz * speed * 0.85 - (dz / away) * 2) * light;
          b.vy = (2.5 + speed * 0.16) * light;
          b.spin = [(Math.random() - 0.5) * speed * 0.6, (Math.random() - 0.5) * speed * 0.4, (Math.random() - 0.5) * speed * 0.6];
          b.flying = true;
          b.hitBy = r;
          if (r.mine) s.v *= b.kind === 'cone' ? 0.97 : 0.86;
          if (r.me) this._clatter(Math.min(1, speed / 30), b.kind === 'cone');
          if (b.set.people) b.set.scatter = this.clock + 2.5;
          break;
        }
      }
    }
    // The crowd is solid: a car that gets through the barriers stops against the people, who scatter.
    for (const spot of this.spots ?? []) {
      if (!spot.people.length || Math.hypot(spot.x - me.s.x, spot.z - me.s.z) > 60) continue;
      for (const r of this.racers) {
        if (r.left || !r.mine) continue;
        const s = r.s;
        for (const p of spot.people) {
          const px = p.group.position.x;
          const pz = p.group.position.z;
          for (const along of [1.3, -1.3]) {
            const cx = s.x - Math.sin(s.heading) * along;
            const cz = s.z - Math.cos(s.heading) * along;
            const d = Math.hypot(cx - px, cz - pz);
            if (d > 1.35) continue;
            // Pushed back out, stopped; everyone near jumps clear.
            s.x += ((cx - px) / (d || 1)) * (1.35 - d);
            s.z += ((cz - pz) / (d || 1)) * (1.35 - d);
            if (Math.abs(s.v) > 2 && r.me) this._clatter(Math.min(1, Math.abs(s.v) / 30), false);
            s.v *= -0.15;
            spot.scatter = this.clock + 3;
          }
        }
      }
    }
    // Flying blocks: fall, bounce, tumble, rest.
    for (const b of this.blocks) {
      if (b.flying) {
        b.vy -= 18 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.rx += b.spin[0] * dt;
        b.yaw += b.spin[1] * dt;
        b.rz += b.spin[2] * dt;
        const ground = this.g.surfaceAt(b.x, b.z, b.y + 1);
        if (b.y <= ground) {
          b.y = ground;
          b.vy = Math.abs(b.vy) * 0.3;
          b.vx *= 0.6;
          b.vz *= 0.6;
          b.spin = b.spin.map((v) => v * 0.6);
          if (Math.hypot(b.vx, b.vz) < 0.6 && b.vy < 1) {
            b.flying = false;
            b.vy = 0;
            // Settle lying on a side (or upright, for a cone that lands well).
            b.rx = Math.round(b.rx / (Math.PI / 2)) * (Math.PI / 2);
            b.rz = Math.round(b.rz / (Math.PI / 2)) * (Math.PI / 2);
            b.hitBy = null;
          }
        }
      }
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.set(b.rx, b.yaw, b.rz, 'YXZ');
    }
  }

  /** The bang and rattle of hitting a barrier (a lighter tock for a cone). */
  _clatter(volume, light) {
    const a = this.g.street?._audio?.();
    if (!a) return;
    const o = a.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(light ? 420 : 160, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(light ? 200 : 60, a.currentTime + 0.18);
    const g = a.createGain();
    g.gain.setValueAtTime(0.35 * volume, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.3);
    this.g.street?._thud?.(volume * (light ? 0.3 : 0.8));
  }

  /** Bring the crowds near you to life, let the far ones go, and have them cheer as cars come by. */
  _crowds(dt) {
    if (!this.spots) return;
    const me = this.me;
    let alive = 0;
    for (const s of this.spots) alive += s.people.length;
    for (const s of this.spots) {
      const d = Math.hypot(s.x - me.s.x, s.z - me.s.z);
      if (d > 330 && s.people.length) {
        for (const p of s.people) this.g.scene.remove(p.group);
        alive -= s.people.length;
        s.people = [];
      } else if (d < 220 && !s.people.length && !s.loading && alive < 70) {
        s.loading = true;
        Promise.all([loadPerson('mina'), loadPerson('jun')]).then(([a, b]) => {
          s.loading = false;
          if (!a || !b || !this.course || Math.hypot(s.x - this.me.s.x, s.z - this.me.s.z) > 330) return;
          for (let k = 0; k < s.count; k++) {
            const person = new Person(k % 2 ? a : b);
            const along = (k - (s.count - 1) / 2) * 1.35;
            const back = 1.1 + (k % 3) * 0.8;
            // In a ragged line behind the barrier, facing the road.
            const x = s.x - Math.sin(s.heading) * along + Math.cos(s.heading) * s.side * back;
            const z = s.z - Math.cos(s.heading) * along - Math.sin(s.heading) * s.side * back;
            person.group.position.set(x, this.g.surfaceAt(x, z, this.g.groundAt(x, z) + 14), z);
            person.group.rotation.y = s.heading + (s.side > 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.4;
            person.phase = Math.random() * 3;
            this.g.scene.add(person.group);
            s.people.push(person);
          }
        });
      }
      if (!s.people.length) continue;
      // A car close: they go wild. Otherwise a little restless.
      let near = Infinity;
      for (const r of this.racers) if (!r.left) near = Math.min(near, Math.hypot(r.s.x - s.x, r.s.z - s.z));
      const scared = (s.scatter ?? 0) > this.clock;
      const cheer = scared ? 0 : near < 45 ? 1 : 0.15;
      // Startled: everyone steps back from the barrier, then comes back to it.
      for (const p of s.people) {
        p.home ??= p.group.position.clone();
        const back = scared ? 1.8 : 0;
        p.away = (p.away ?? 0) + (back - (p.away ?? 0)) * Math.min(1, dt * (scared ? 8 : 1.5));
        p.group.position.set(p.home.x + Math.cos(s.heading) * s.side * p.away, p.home.y, p.home.z - Math.sin(s.heading) * s.side * p.away);
      }
      if (d < 30 && near < 30 && this.clock - s.cheerAt > 6 && this.phase === 'racing') {
        s.cheerAt = this.clock;
        this._roar();
      }
      const every = d < 90 ? 1 : 4;
      s.tick = (s.tick ?? 0) + 1;
      if (s.tick % every) continue;
      for (const p of s.people) p.update(dt * every, 0, cheer * (0.7 + 0.3 * Math.sin(this.clock * 2 + p.phase)));
    }
  }

  /** A crowd's roar and whistles as you go by. */
  _roar() {
    const a = this.g.street?._audio?.();
    if (!a) return;
    const len = a.sampleRate * 1.6;
    this.roarBuf ??= (() => {
      const b = a.createBuffer(1, len, a.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();
    const src = a.createBufferSource();
    src.buffer = this.roarBuf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100;
    f.Q.value = 0.6;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.001, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, a.currentTime + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.6);
    src.connect(f).connect(gain).connect(a.destination);
    src.start();
    src.stop(a.currentTime + 1.6);
    for (let k = 0; k < 2; k++) {
      const o = a.createOscillator();
      const g = a.createGain();
      const t = a.currentTime + 0.2 + k * 0.35 + Math.random() * 0.2;
      o.frequency.setValueAtTime(1800 + Math.random() * 500, t);
      o.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 600, t + 0.25);
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.32);
    }
  }

  /** The next turn ahead of a car: { left, sharp, hairpin, metres } within 300 m, or null. */
  _nextTurn(r) {
    if (!this.turns?.length) return null;
    const c = this.course;
    const L = c.length;
    let best = null;
    for (const t of this.turns) {
      let d = c.s[t.from] - c.s[r.idx];
      if (d < -10 && !c.open) d += L;
      if (d < -10 || d > 300) continue;
      if (!best || d < best.metres) best = { left: t.bend > 0, sharp: t.total > 1.2, hairpin: t.total > 2, metres: Math.max(0, d) };
    }
    return best;
  }

  /** Another gate across the road at point i (a run's finish). */
  _gate(i, words) {
    const c = this.course;
    const p = c.points[i];
    const q = c.points[Math.min(c.points.length - 1, i + 1)];
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
    g.fillStyle = 'rgba(0,0,0,0.7)';
    g.fillRect(170, 10, 172, 44);
    g.fillStyle = '#ffd400';
    g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(words, 256, 33);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.y = 6.2;
    gate.add(banner);
    gate.position.set(p[0], this.g.surfaceAt(p[0], p[1], this.g.groundAt(p[0], p[1]) + 14), p[1]);
    gate.rotation.y = heading;
    gate.userData.at = { x: p[0], z: p[1] };
    this.finishGate = gate;
    this.decor.add(gate);
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
    // The turn boards, likewise.
    for (const t of this.turns ?? []) {
      const a = t.sign?.userData.at;
      if (!a) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      t.sign.visible = d < 700;
      if (all || d < 400) t.sign.position.y = this.g.surfaceAt(a.x, a.z, this.g.groundAt(a.x, a.z) + 14);
    }
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
        const { hit } = stepCar(r.s, input, dt, blocked, r.spec);
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
    this._crowds(dt);
    this._blocks(dt);
    this._hudFrame();
  }

  /** Sliding through a corner: points while it lasts, and boost. */
  _drift(r, dt, racing) {
    const sliding = racing && r.s.drift > 0.22 && Math.abs(r.s.v) > 12;
    if (sliding) {
      r.combo += dt * Math.abs(r.s.v) * (1 + r.s.drift) * 3;
      r.comboIdle = 0;
      r.boost = Math.min(1, r.boost + dt * 0.2 * (r.model?.drift ?? 1));
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
      if (!c.open && d > L / 2) d -= L;
      if (!c.open && d < -L / 2) d += L;
      r.dist += d;
      r.idx = loc.i;
      // Going the wrong way along the course?
      const q = c.points[(loc.i + 1) % c.points.length];
      const p = c.points[loc.i];
      const way = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      r.wrong = Math.abs(turn(r.s.heading, way)) > 2 && r.s.v > 4;
    }
    if (c.open) return this._runProgress(r);
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

  /** A run: checkpoints passed (with a split against whoever passed first), and the finish. */
  _runProgress(r) {
    const c = this.course;
    if (this.phase !== 'racing') return;
    const at = r.dist + c.s[this.gateAt];
    while (r.cp < c.checkpoints.length && at >= c.s[c.checkpoints[r.cp].i]) {
      const cp = c.checkpoints[r.cp];
      const first = this.cpFirst.get(r.cp);
      if (first == null) this.cpFirst.set(r.cp, this.clock);
      if (r.me) {
        const gap = first == null ? 'first through' : `+${(this.clock - first).toFixed(1)} s on the leader`;
        this._flash(`Checkpoint ${r.cp + 1}/${c.checkpoints.length} · ${cp.name} · ${clock(this.clock)} · ${gap}`, 3);
        this._roar();
      }
      r.cp++;
    }
    if (r.dist >= this.goal && r.done == null) {
      r.done = this.clock;
      r.best = this.clock;
      if (r.me) this._flash(`Finished ${ordinal(this._rank(r))} · ${clock(r.done)}`, 4);
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
    const top = r.spec.top * r.skill;
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
    if (this.phase === 'racing' && (all || (Number.isFinite(first) && this.clock - first > (this.open ? 150 : 45)) || (this.me.done != null && left.filter((r) => !r.bot).every((r) => r.done != null)))) {
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
    if (this.open) {
      const c = this.course;
      const next = c.checkpoints[me.cp];
      const km = (v) => `${Math.max(0, v / 1000).toFixed(1)} km`;
      const toNext = next ? c.s[next.i] - (me.dist + c.s[this.gateAt]) : 0;
      this.posEl.innerHTML = `<b>${ordinal(rank)}</b><small>of ${order.length}</small><span>CP ${Math.min(me.cp + 1, c.checkpoints.length)}/${c.checkpoints.length}${next ? ` · ${esc(next.name)} in ${km(toNext)}` : ''}</span><i>${clock(me.done ?? (this.phase === 'grid' ? 0 : this.clock))}</i><em>${km(this.goal - me.dist)} to the finish</em>`;
      this.boardEl.innerHTML = order.map((r, i) => `<p class="${r.me ? 'is-me' : ''}"><b>${i + 1}</b><i style="background:${r.color}"></i>${esc(r.name)}${r.bot ? ' <small>bot</small>' : ''}<span>${r.done != null ? clock(r.done) : km(this.goal - r.dist)}</span></p>`).join('');
    }
    if (!this.open) this.posEl.innerHTML = `<b>${ordinal(rank)}</b><small>of ${order.length}</small><span>LAP ${lap}/${this.laps}</span><i>${clock(this.phase === 'grid' ? 0 : me.done ?? this.clock - me.lapStart)}</i><em>best ${clock(me.best)} · total ${clock(me.done ?? (this.phase === 'grid' ? 0 : this.clock))}</em>`;
    if (!this.open) this.boardEl.innerHTML = order.map((r, i) => `<p class="${r.me ? 'is-me' : ''}"><b>${i + 1}</b><i style="background:${r.color}"></i>${esc(r.name)}${r.bot ? ' <small>bot</small>' : ''}<span>${r.done != null ? clock(r.done) : `lap ${Math.min(this.laps, Math.max(1, Math.floor(r.dist / this.course.length) + 1))}`}</span></p>`).join('');
    const kmh = Math.round(Math.abs(me.s.v) * 3.6);
    this.speedEl.innerHTML = `<b>${kmh}</b><small>km/h</small><div class="race__boost"><i style="width:${Math.round(me.boost * 100)}%"></i></div><span>${me.boosting ? 'BOOST' : me.s.drift > 0.22 && Math.abs(me.s.v) > 12 ? 'DRIFT' : me.s.v < -0.3 ? 'R' : ''}</span>`;
    if (me.wrong && this.phase === 'racing') this._flash('WRONG WAY', 0.4);
    // The next turn, named as it comes up.
    const next = this.phase !== 'done' && me.done == null ? this._nextTurn(me) : null;
    this.turnEl.hidden = !next;
    if (next) {
      const arrow = next.hairpin ? (next.left ? '⮌' : '⮎') : next.left ? '⬅' : '➡';
      const what = next.hairpin ? 'HAIRPIN' : next.sharp ? 'SHARP' : '';
      const key = `${arrow}|${what}|${Math.round(next.metres / 10)}`;
      if (key !== this._turnKey) {
        this._turnKey = key;
        this.turnEl.className = `race__turn${next.sharp ? ' is-sharp' : ''}${next.metres < 60 ? ' is-near' : ''}`;
        this.turnEl.innerHTML = `<b>${arrow}</b><span>${what ? `${what} ` : ''}${next.left ? 'LEFT' : 'RIGHT'}</span><small>${next.metres < 15 ? 'now' : `${Math.round(next.metres / 10) * 10} m`}</small>`;
      }
    }
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
    if (n < 1500) {
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
    } else for (let k = -120; k <= 220; k++) {
      const p = pts[Math.max(0, Math.min(n - 1, me.idx + k))];
      if (k > -120) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    g.strokeStyle = '#ff8a2a';
    g.lineWidth = 13;
    g.beginPath();
    for (let k = 0; k < 90; k++) {
      const p = pts[this.open ? Math.min(n - 1, me.idx + k) : (me.idx + k) % n];
      if (k) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    // The line.
    g.fillStyle = '#ffffff';
    g.beginPath();
    const line = pts[this.open ? n - 1 : 0];
    g.arc(line[0], line[1], 9, 0, Math.PI * 2);
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
      ${order.map((r, i) => `<tr class="${r.me ? 'is-me' : ''}"><td>${i + 1}</td><td><i style="background:${r.color}"></i>${esc(r.name)}${r.bot ? ' <small>bot</small>' : ''} <small>${esc(r.model?.name ?? '')}</small></td><td>${r.done != null ? clock(r.done) : 'DNF'}</td><td>${clock(r.best)}</td><td>${r.driftScore + Math.round(r.combo || 0)}</td></tr>`).join('')}
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
      // Behind the car always — backing up included, so the controls never seem to flip.
      const behind = r.s.v < -1 ? r.s.heading : r.s.travel ?? r.s.heading;
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
    for (const b of this.blocks ?? []) this.g.scene.remove(b.mesh);
    this.blocks = [];
    this.coneSets = null;
    for (const s of this.spots ?? []) for (const p of s.people) this.g.scene.remove(p.group);
    this.spots = null;
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
    for (const n of [this.menuEl, this.mapEl, this.turnEl, this.posEl, this.boardEl, this.speedEl, this.countEl, this.driftEl, this.msgEl, this.resultEl]) n.remove();
  }
}
