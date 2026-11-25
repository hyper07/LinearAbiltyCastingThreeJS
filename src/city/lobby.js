import { BIKE_COURSES, courseStats } from './course.js';
import { CREW, CREW_ORDER, rider } from './crew.js';
import { SCOOTERS, SCOOTER_ORDER, STAT_NAMES, scooterStats, cleanScooter } from './scoot.js';
import { SCOOTER_LOOKS } from './scooter.js';
import { TIME_PICKS, WEATHER_PICKS, WEATHERS } from './weather.js';
import { faceSvg } from '../snowpuff/riders.js';

/**
 * Kickrani's pre-race flow, over the 3D stage (stage.js): rider →
 * scooter → course → time and weather → go, with Back at every step. The
 * shape is Snowpuff Peaks' (src/snowpuff/hud.js riders/mountains and
 * worldMap.js, only read): a big name card and a READY button over the
 * turntable, ◀ ▶ either side, a strip of faces to jump to; a toy map with a
 * pin for every course whose card previews it; cards for the sky. Keyboard
 * (← → to browse, ↑ ↓ for the weather, Enter for next, Esc or Backspace for
 * back), mouse (click a rider or a scooter on the stage, hover a pin or a
 * sky card to preview it) and touch (tap, swipe the stage) all work.
 *
 * In a room the host's course, laps, time and weather show for everyone;
 * each player's rider and scooter go to the others (race.js race-pick).
 */

export const STEPS = ['rider', 'scooter', 'course', 'weather'];
const STEP_NAMES = { rider: 'Rider', scooter: 'Scooter', course: 'Course', weather: 'Time & weather' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The Han through Seoul (world metres, west to east) and the hills: a toy map, not an atlas. */
const HAN = [[-15720, -2100], [-11740, -980], [-9090, 690], [-7330, 1580], [-6450, 2800], [-4240, 3470], [-2910, 3690], [-2030, 4360], [-1760, 5470], [180, 6020], [1600, 5800], [2830, 4360], [5040, 3140], [6810, 3360], [7700, 4250], [9460, 4800], [10790, 4350], [11500, 3580], [12290, 2360], [13880, 1240], [16970, 130]];
const HILLS = [{ name: 'Namsan', x: 907, z: 1673, r: 700 }, { name: 'Inwangsan', x: -1300, z: -2300, r: 700 }, { name: 'Bugaksan', x: 0, z: -3900, r: 800 }];
const VIEW = { x0: -8200, z0: -4600, w: 22000, h: 13400 };
const MX = (x) => ((x - VIEW.x0) / VIEW.w) * 1000;
const MZ = (z) => ((z - VIEW.z0) / VIEW.h) * (1000 * (VIEW.h / VIEW.w));
const MAP_H = 1000 * (VIEW.h / VIEW.w);

/** A smooth line through points (the river). */
function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  const L = pts.at(-1);
  return `${d} L${L[0].toFixed(1)} ${L[1].toFixed(1)}`;
}

/** A soft blob round points (the city's land): their hull, pushed out and rounded. */
function hullBlob(pts, pad) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of p.slice().reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
    upper.push(q);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const cx = hull.reduce((t, q) => t + q[0], 0) / hull.length;
  const cz = hull.reduce((t, q) => t + q[1], 0) / hull.length;
  const out = hull.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    return [x + ((x - cx) / d) * pad, z + ((z - cz) / d) * pad];
  });
  const n = out.length;
  const mid = (a, b) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M${mid(out[n - 1], out[0])}`;
  for (let i = 0; i < n; i++) d += ` Q${out[i][0].toFixed(1)} ${out[i][1].toFixed(1)} ${mid(out[i], out[(i + 1) % n])}`;
  return `${d}Z`;
}

/** A scooter seen from the side, small (the scooter chips): its own deck, stem and wheels. */
export function scooterChip(id, colour = '#2ec4d6', size = 64) {
  const L = SCOOTER_LOOKS[id] ?? SCOOTER_LOOKS.city;
  const k = 70;
  const x = (z) => 48 + z * k;
  const y = (h) => 50 - h * k;
  const wr = L.wheel * k;
  const front = x(L.front);
  const rear = x(L.rear);
  const deckY = y(L.deckTop);
  const barX = front - Math.sin(L.rake) * (L.bar - 0.2) * k;
  const tyre = L.whiteTyres ? '#e9e6df' : '#1d1e22';
  const wheel = (cx) => `<circle cx="${cx}" cy="${50 - wr}" r="${wr}" fill="${tyre}"/><circle cx="${cx}" cy="${50 - wr}" r="${Math.max(2, wr - L.tyre * k * 1.6)}" fill="${L.whitewall ? '#f6f2ea' : '#b9bec6'}"/>${L.knobs ? `<circle cx="${cx}" cy="${50 - wr}" r="${wr}" fill="none" stroke="#1d1e22" stroke-width="2.4" stroke-dasharray="2 2"/>` : ''}`;
  const body = L.carbon ? '#1c1d21' : colour;
  return `<svg viewBox="0 0 96 56" width="${size}" height="${(size * 56) / 96}" aria-hidden="true">
    <line x1="${front}" y1="${y(0.2)}" x2="${barX}" y2="${y(L.bar)}" stroke="${L.chrome ? '#dfe4ea' : body}" stroke-width="${L.twin ? 5 : 3.4}" stroke-linecap="round"/>
    <line x1="${barX - 6}" y1="${y(L.bar)}" x2="${barX + 6}" y2="${y(L.bar)}" stroke="#2c2f35" stroke-width="3" stroke-linecap="round"/>
    ${L.shield ? `<path d="M${front + 1} ${deckY} Q${front - 8} ${deckY - 10} ${front + 2} ${y(0.45)}" stroke="${colour}" stroke-width="7" fill="none" stroke-linecap="round"/>` : ''}
    ${L.basket ? `<rect x="${barX - 12}" y="${y(L.bar) + 3}" width="10" height="8" rx="2" fill="none" stroke="#c9cdd3" stroke-width="1.6"/>` : ''}
    <rect x="${x(-L.deckLen / 2)}" y="${deckY}" width="${L.deckLen * k}" height="${Math.max(3, L.deckT * k)}" rx="2" fill="${body}"/>
    ${L.stripe ? `<rect x="${x(-L.deckLen / 2) + 3}" y="${deckY + 1}" width="${L.deckLen * k - 6}" height="1.6" fill="${colour}"/>` : ''}
    ${L.fin ? `<path d="M${rear - 2} ${deckY} l10 -9 l3 0 l-4 9z" fill="${colour}"/>` : ''}
    ${L.springs ? `<path d="M${front + 1} ${y(0.15)} l2 3 l-4 3 l4 3 l-4 3" stroke="#ffcc33" stroke-width="1.6" fill="none"/>` : ''}
    ${wheel(front)}${wheel(rear)}
  </svg>`;
}

export class Lobby {
  /** @param {import('./race.js').Race} race */
  constructor(race) {
    this.race = race;
    this.step = 'rider';
    this.hoverCourse = null;
    this.prevSky = null;
  }

  get g() {
    return this.race.g;
  }

  /** The stage behind the menus (built the first time). */
  stage() {
    const r = this.race;
    if (!r.stage && this.g.renderer) {
      r.stage = r.makeStage();
      r.stage.pickRider(r.char, false);
      r.stage.setScooter(r.scooter, false);
    }
    return r.stage;
  }

  open(step = this.step, note = '') {
    const r = this.race;
    this.step = STEPS.includes(step) ? step : 'rider';
    this.note = note;
    const st = this.stage();
    if (st) {
      st.setView(this.step);
      st.pickRider(r.char, false);
      st.setScooter(r.scooter, false);
      st.setSky(r.time, r.weatherPick);
    }
    r.stageOn = Boolean(st);
    this.g.root.classList.add('is-menu');
    this.render();
  }

  close() {
    this.race.stageOn = false;
    this.race.menuEl.classList.remove('jl');
    this.g.root.classList.remove('is-menu');
  }

  host() {
    const s = this.race.session;
    return !s?.room || s.isHost;
  }

  /* ------------------------------------------------------------ drawing */

  render() {
    const r = this.race;
    const m = r.menuEl;
    m.hidden = false;
    m.classList.add('jl');
    m.dataset.step = this.step;
    const s = r.session;
    const i = STEPS.indexOf(this.step);
    m.innerHTML = `
      <div class="jl__bar">
        <b class="jl__logo kr-logo" aria-label="Kickrani 킥라니"><span class="kr-logo__word">Kickrani</span><small class="kr-logo__ko">킥라니</small></b>
        <ol class="jl__steps">${STEPS.map((k, j) => `<li><button type="button" data-goto="${k}" class="${j === i ? 'is-on' : j < i ? 'is-done' : ''}">${j + 1}. ${STEP_NAMES[k]}</button></li>`).join('')}</ol>
        ${s?.room ? `<span class="jl__room">Room <b data-race-code>${esc(s.room)}</b> · ${s.peers.size} here${s.isHost ? ' · you host' : ''}</span>` : ''}
        <button type="button" class="jl__ghost" data-race-credits>ⓒ Credits</button>
        <button type="button" class="jl__x" data-race-x aria-label="Close">✕</button>
      </div>
      <div class="jl__hit" data-hit></div>
      <div class="jl__body">${this[`_${this.step}`]()}</div>
      <p class="jl__note" data-race-note>${esc(this.note)}</p>
      <p class="jl__keys">${this._keys()}</p>`;
    this._wire();
  }

  _keys() {
    return {
      rider: '← → choose · click a rider · Enter ready · Esc close',
      scooter: '← → choose · click a scooter · Enter next · Esc back',
      course: '← → choose · hover a pin to preview · Enter next · Esc back',
      weather: '← → time · ↑ ↓ weather · Enter race · Esc back'
    }[this.step];
  }

  _nav(next = 'Next ›', cls = '') {
    return `<div class="jl__nav ${cls}">${this.step !== 'rider' ? '<button type="button" class="jl__back" data-back>‹ Back</button>' : ''}<button type="button" class="jl__go" data-next>${next}</button></div>`;
  }

  _arrows(label) {
    return `<button type="button" class="jl__arrow jl__arrow--l" data-step-dir="-1" aria-label="Previous ${label}">◀</button><button type="button" class="jl__arrow jl__arrow--r" data-step-dir="1" aria-label="Next ${label}">▶</button>`;
  }

  _portrait(id, size = 64) {
    return faceSvg(id, size).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  /* Rider: the turntable, a name card, READY. */
  _rider() {
    const r = this.race;
    const c = rider(r.char);
    const picks = this._roomPicks();
    return `
      ${this._arrows('rider')}
      <section class="jl__card jl__card--rider" data-card>
        <div class="jl__face">${this._portrait(r.char, 84)}</div>
        <h2>${esc(c.name)} <span>${esc(c.ko)}</span></h2>
        <p class="jl__nick">“${esc(c.nick)}”</p>
        <p>${esc(c.text)}</p>
        ${this._nav('READY ›', 'jl__nav--big')}
      </section>
      <div class="jl__strip" role="listbox" aria-label="Riders">${CREW_ORDER.map((id) => {
        const k = rider(id);
        const taken = picks.get(id);
        return `<button type="button" role="option" data-char="${id}" aria-selected="${id === r.char}" class="${id === r.char ? 'is-on' : ''}" title="${esc(k.name)}">${this._portrait(id, 46)}<small>${esc(k.name)}</small>${taken ? `<em>${esc(taken)}</em>` : ''}</button>`;
      }).join('')}</div>`;
  }

  /* Scooter: the showroom, the bars. */
  _scooter() {
    const r = this.race;
    const sc = SCOOTERS[r.scooter];
    const st = scooterStats(r.scooter);
    const col = rider(r.char).scooter;
    return `
      ${this._arrows('scooter')}
      <section class="jl__card jl__card--scooter" data-card>
        <div class="jl__chipbig">${scooterChip(r.scooter, col, 150)}</div>
        <h2>SSAENG ${esc(sc.name)} <span>${esc(sc.ko)}</span></h2>
        <p>${esc(sc.text)}</p>
        <div class="jl__stats">${Object.entries(STAT_NAMES).map(([k, n]) => `<div class="jl__stat" data-stat="${k}"><small>${n}</small><i><b style="--w:${Math.round(st[k] * 100)}%"></b></i></div>`).join('')}</div>
        ${this._nav()}
      </section>
      <div class="jl__strip jl__strip--scooters" role="listbox" aria-label="Scooters">${SCOOTER_ORDER.map((id) => `<button type="button" role="option" data-scooter="${id}" aria-selected="${id === r.scooter}" class="${id === r.scooter ? 'is-on' : ''}" title="${esc(SCOOTERS[id].name)}">${scooterChip(id, col, 64)}<small>${esc(SCOOTERS[id].name)}</small></button>`).join('')}</div>`;
  }

  /* Course: the map of Seoul with a pin for each course, and its card. */
  _course() {
    const r = this.race;
    const host = this.host();
    const dists = (this.g.index?.districts ?? []).map((d) => ({ name: d.name, x: d.x - this.g.origin.x, z: -(d.y - this.g.origin.y) }));
    const land = dists.length ? hullBlob(dists.map((d) => [MX(d.x), MZ(d.z)]), 60) : '';
    const river = smooth(HAN.map(([x, z]) => [MX(x), MZ(z)]));
    const pins = BIKE_COURSES.map((c) => `<g class="jl__pin ${c.id === r.courseId ? 'is-on' : ''}" data-pin="${c.id}" transform="translate(${MX(c.x).toFixed(1)} ${MZ(c.z).toFixed(1)})" tabindex="0" role="button" aria-label="${esc(c.name)}"><circle class="jl__pin-halo" r="22"/><g data-route="${c.id}" class="jl__pin-route"></g><circle class="jl__pin-dot" r="9"/><text y="-28">${esc(c.name)}</text></g>`).join('');
    return `
      <div class="jl__map">
        <svg viewBox="0 0 1000 ${MAP_H.toFixed(0)}" preserveAspectRatio="xMidYMid meet" aria-label="Map of Seoul with the courses">
          <rect width="1000" height="${MAP_H.toFixed(0)}" class="jl__sea"/>
          <path d="${land}" class="jl__land"/>
          ${HILLS.map((h) => `<ellipse cx="${MX(h.x).toFixed(1)}" cy="${MZ(h.z).toFixed(1)}" rx="${((h.r / VIEW.w) * 1000).toFixed(1)}" ry="${((h.r / VIEW.w) * 800).toFixed(1)}" class="jl__hill"/><text x="${MX(h.x).toFixed(1)}" y="${(MZ(h.z) + 4).toFixed(1)}" class="jl__hilltext">${h.name}</text>`).join('')}
          <path d="${river}" class="jl__han"/><text x="${MX(-6200).toFixed(0)}" y="${(MZ(2300) + 46).toFixed(0)}" class="jl__hantext">한강 Han River</text>
          ${dists.map((d) => `<text x="${MX(d.x).toFixed(1)}" y="${MZ(d.z).toFixed(1)}" class="jl__gu">${esc(d.name)}</text>`).join('')}
          ${pins}
        </svg>
      </div>
      <section class="jl__card jl__card--course" data-card data-course-card></section>
      <div class="jl__strip jl__strip--courses" role="listbox" aria-label="Courses">${BIKE_COURSES.map((c) => `<button type="button" role="option" data-course="${c.id}" class="${c.id === r.courseId ? 'is-on' : ''}" ${host ? '' : 'disabled'}><b>${esc(c.name)}</b><small>${esc(c.ko)} · ${esc(c.kind ?? '')}</small><em data-len="${c.id}">${this.race.plans.has(c.id) ? this.race._lenText(this.race.plans.get(c.id)) : 'planning…'}</em></button>`).join('')}</div>`;
  }

  /** The course card: its shape large, a dot riding round it, and its numbers. */
  _courseCard(id) {
    const r = this.race;
    const def = BIKE_COURSES.find((c) => c.id === id) ?? BIKE_COURSES[0];
    const plan = r.plans.get(def.id);
    let shape = '<div class="jl__planning">Planning the course on the real streets…</div>';
    let facts = '';
    if (plan) {
      const st = courseStats(plan);
      const xs = plan.points.map((p) => p[0]);
      const zs = plan.points.map((p) => p[1]);
      const x0 = Math.min(...xs);
      const z0 = Math.min(...zs);
      const S = 220 / Math.max(Math.max(...xs) - x0, Math.max(...zs) - z0);
      const P = (p) => `${(10 + (p[0] - x0) * S).toFixed(1)} ${(10 + (p[1] - z0) * S).toFixed(1)}`;
      const d = `M${plan.points.map(P).join(' L')} Z`;
      const scs = (plan.shortcuts ?? []).map((sc) => `<path d="M${sc.points.map(P).join(' L')}" class="jl__sc"/>`).join('');
      const turns = st.turns.filter((t) => t.angle > Math.PI / 3).map((t) => `<circle cx="${P(plan.points[t.i]).split(' ')[0]}" cy="${P(plan.points[t.i]).split(' ')[1]}" r="6" class="jl__turn"/>`).join('');
      const secs = Math.round(plan.length / 16);
      shape = `<svg class="jl__shape" viewBox="0 0 240 240" aria-label="The course's shape"><path d="${d}" class="jl__road"/><path d="${d}" class="jl__line" id="jl-route-${def.id}"/>${scs}${turns}<circle r="9" class="jl__start" cx="${P(plan.points[0]).split(' ')[0]}" cy="${P(plan.points[0]).split(' ')[1]}"/><circle r="7" class="jl__rider"><animateMotion dur="${Math.max(5, secs / 18).toFixed(1)}s" repeatCount="indefinite" path="${d}"/></circle></svg>`;
      facts = `<dl class="jl__facts">
        <div><dt>Length</dt><dd>${(plan.length / 1000).toFixed(1)} km</dd></div>
        <div><dt>Lap</dt><dd>~${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</dd></div>
        <div><dt>Sharp turns</dt><dd>${st.sharp}</dd></div>
        <div><dt>Wide roads</dt><dd>${Math.round(st.wide * 100)}%</dd></div>
        <div><dt>Short cuts</dt><dd>${plan.shortcuts?.length ?? 0}</dd></div>
        <div><dt>First corner</dt><dd>${Math.round(st.firstCorner)} m</dd></div>
      </dl>`;
    }
    const host = this.host();
    return `<h2>${esc(def.name)} <span>${esc(def.ko)}</span></h2><p class="jl__kind">${esc(def.kind ?? '')}</p>${shape}<p>${esc(def.text)}</p>${facts}
      <div class="jl__laps"><span>Laps</span>${[1, 2, 3].map((n) => `<button type="button" data-laps="${n}" class="${n === r.laps ? 'is-on' : ''}" ${host ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      ${this._nav()}`;
  }

  /* Time and weather: cards, previewed live on the stage; then go. */
  _weather() {
    const r = this.race;
    const host = this.host();
    const s = r.session;
    const timeCard = (k, t) => `<button type="button" class="jl__sky jl__sky--${k} ${k === r.time ? 'is-on' : ''}" data-time="${k}" ${host ? '' : 'disabled'}><span class="jl__art" aria-hidden="true"><i></i></span><b>${t.icon} ${esc(t.name)}</b></button>`;
    const wxCard = (k) => {
      const w = WEATHERS[k];
      const name = k === 'random' ? 'Random' : k === 'snow' ? 'Snow (winter)' : w.name;
      const icon = k === 'random' ? '🎲' : k === 'clear' ? '☀️' : w.icon;
      return `<button type="button" class="jl__wx jl__wx--${k} ${k === r.weatherPick ? 'is-on' : ''}" data-weather="${k}" ${host ? '' : 'disabled'}><span class="jl__art" aria-hidden="true"><i></i></span><b>${icon} ${esc(name)}</b></button>`;
    };
    const go = s?.room
      ? `<div class="jl__roombox"><b>Room ${esc(s.room)}</b> — give friends this code (up to four). Bots take any empty seats.
          <ul>${[...s.peers.values()].map((p) => {
            const pick = p.id === s.id ? { char: r.char, scooter: r.scooter } : r.picks.get(p.id);
            return `<li>${pick ? this._portrait(pick.char, 28) : ''}${esc(p.name)}${pick ? ` — ${esc(rider(pick.char).name)} · ${esc(SCOOTERS[cleanScooter(pick.scooter)].name)}` : ''}${p.id === s.host ? ' <em>host</em>' : ''}${p.id === s.id ? ' <em>you</em>' : ''}</li>`;
          }).join('')}</ul></div>
        <div class="jl__nav"><button type="button" class="jl__back" data-back>‹ Back</button>${host ? '<button type="button" class="jl__go" data-race-start>Start the race ›</button>' : '<span>Waiting for the host to start…</span>'}<button type="button" class="jl__ghost" data-race-leave>Leave the room</button></div>`
      : `<div class="jl__nav jl__nav--big"><button type="button" class="jl__back" data-back>‹ Back</button><button type="button" class="jl__go" data-race-solo>Race three bots ›</button></div>
        <div class="jl__together"><span>With friends</span><button type="button" data-race-make>Make a room</button><input data-race-code-in maxlength="5" placeholder="CODE" aria-label="Room code" /><button type="button" data-race-join>Join</button></div>`;
    const c = BIKE_COURSES.find((x) => x.id === r.courseId);
    const sc = SCOOTERS[r.scooter];
    return `
      <section class="jl__card jl__card--weather" data-card>
        <h2>Time and weather</h2>
        <p class="jl__sum">${this._portrait(r.char, 30)} ${esc(rider(r.char).name)} on the ${esc(sc.name)} · ${esc(c?.name ?? '')} · ${r.laps} lap${r.laps > 1 ? 's' : ''}</p>
        <h3>Time of day</h3>
        <div class="jl__skies">${Object.entries(TIME_PICKS).map(([k, t]) => timeCard(k, t)).join('')}</div>
        <h3>Weather</h3>
        <div class="jl__skies">${WEATHER_PICKS.map(wxCard).join('')}</div>
        <p class="jl__hint">Rain and snow make the roads slippery: brake earlier.</p>
        ${go}
      </section>`;
  }

  /** Who has picked which rider in the room (rider id → player name), others only. */
  _roomPicks() {
    const s = this.race.session;
    const out = new Map();
    if (!s?.room) return out;
    for (const p of s.peers.values()) {
      if (p.id === s.id) continue;
      const pick = this.race.picks.get(p.id);
      if (pick?.char) out.set(pick.char, p.name);
    }
    return out;
  }

  /* ------------------------------------------------------------ input */

  _wire() {
    const r = this.race;
    const m = r.menuEl;
    const $ = (q) => m.querySelector(q);
    const on = (q, fn) => {
      for (const b of m.querySelectorAll(q)) b.onclick = (e) => fn(b, e);
    };
    $('[data-race-x]').onclick = () => r.quit();
    on('[data-race-credits]', () => this.g.toggleCredits(true));
    on('[data-goto]', (b) => this.go(b.dataset.goto));
    on('[data-next]', () => this.next());
    on('[data-back]', () => this.back());
    on('[data-step-dir]', (b) => this.browse(Number(b.dataset.stepDir)));
    on('[data-char]', (b) => this.pickRider(b.dataset.char));
    on('[data-scooter]', (b) => this.pickScooter(b.dataset.scooter));
    on('[data-course]', (b) => this.pickCourse(b.dataset.course));
    on('[data-laps]', (b) => r._setup({ laps: Number(b.dataset.laps) }, false) || this._refreshCourse());
    on('[data-time]', (b) => this.pickSky(b.dataset.time, null));
    on('[data-weather]', (b) => this.pickSky(null, b.dataset.weather));
    on('[data-race-solo]', () => r.startSolo());
    on('[data-race-make]', () => r._room('create'));
    on('[data-race-start]', () => r.startRoom());
    on('[data-race-leave]', () => r._leaveRoom());
    const join = $('[data-race-join]');
    if (join) {
      const go = () => r._room('join', $('[data-race-code-in]').value.trim().toUpperCase());
      join.onclick = go;
      $('[data-race-code-in]').onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') go();
      };
    }
    // The sky cards preview on the stage as you point at them.
    for (const b of m.querySelectorAll('[data-time], [data-weather]')) {
      b.onpointerenter = () => r.stage?.setSky(b.dataset.time ?? r.time, b.dataset.weather ?? r.weatherPick);
      b.onpointerleave = () => r.stage?.setSky(r.time, r.weatherPick);
    }
    // The map: hovering a pin previews its course; clicking picks it.
    for (const p of m.querySelectorAll('[data-pin]')) {
      p.onpointerenter = () => this._preview(p.dataset.pin);
      p.onpointerleave = () => this._preview(null);
      p.onclick = () => this.pickCourse(p.dataset.pin);
      p.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.pickCourse(p.dataset.pin);
        }
      };
    }
    if (this.step === 'course') {
      this._refreshCourse();
      this._routes();
    }
    // The stage: a tap picks what is under it, a swipe browses.
    const hit = $('[data-hit]');
    let down = null;
    hit.onpointerdown = (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      hit.setPointerCapture?.(e.pointerId);
    };
    hit.onpointerup = (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const moved = Math.hypot(dx, e.clientY - down.y);
      down = null;
      if (moved > 40 && Math.abs(dx) > 30) return this.browse(dx < 0 ? 1 : -1);
      if (moved > 8 || !r.stage) return;
      const what = r.stage.pick(e.clientX, e.clientY, this.g.canvas.getBoundingClientRect());
      if (what?.char && this.step === 'rider') this.pickRider(what.char);
      else if (what?.scooter && this.step === 'scooter') this.pickScooter(what.scooter);
    };
    hit.onpointercancel = () => (down = null);
    setTimeout(() => m.querySelector('[data-next], [data-race-solo], [data-race-start]')?.focus({ preventScroll: true }), 30);
  }

  /** Keys while the menus are up (SeoulGame hands them here first): true if used. */
  key(e) {
    if (e.target?.matches?.('input, textarea')) return false;
    const r = this.race;
    if (!['menu', 'lobby'].includes(r.phase) || r.menuEl.hidden) return false;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      const d = e.code === 'ArrowLeft' ? -1 : 1;
      if (this.step === 'weather') this._cycleSky('time', d);
      else this.browse(d);
      return true;
    }
    if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && this.step === 'weather') {
      e.preventDefault();
      this._cycleSky('weather', e.code === 'ArrowUp' ? -1 : 1);
      return true;
    }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      // (Enter on a focused button presses it: leave that to the button)
      if (document.activeElement?.closest?.('.race__menu button, .race__menu [data-pin]')) return false;
      e.preventDefault();
      this.next();
      return true;
    }
    if (e.code === 'Escape' || e.code === 'Backspace') {
      e.preventDefault();
      if (this.step === 'rider') {
        if (e.code === 'Escape') r.quit();
      } else this.back();
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ moves */

  go(step) {
    if (!STEPS.includes(step)) return;
    this.open(step, '');
  }

  next() {
    const i = STEPS.indexOf(this.step);
    if (i < STEPS.length - 1) return this.go(STEPS[i + 1]);
    const r = this.race;
    if (r.session?.room) {
      if (r.session.isHost) r.startRoom();
    } else r.startSolo();
  }

  back() {
    const i = STEPS.indexOf(this.step);
    if (i > 0) this.go(STEPS[i - 1]);
  }

  browse(d) {
    const r = this.race;
    if (this.step === 'rider') this.pickRider(CREW_ORDER[(CREW_ORDER.indexOf(r.char) + d + CREW_ORDER.length) % CREW_ORDER.length]);
    else if (this.step === 'scooter') this.pickScooter(SCOOTER_ORDER[(SCOOTER_ORDER.indexOf(r.scooter) + d + SCOOTER_ORDER.length) % SCOOTER_ORDER.length]);
    else if (this.step === 'course' && this.host()) {
      const ids = BIKE_COURSES.map((c) => c.id);
      this.pickCourse(ids[(ids.indexOf(r.courseId) + d + ids.length) % ids.length]);
    }
  }

  pickRider(id) {
    const r = this.race;
    if (!CREW[id]) return;
    r.char = id;
    r._saveChar();
    r.stage?.pickRider(id, true);
    this.render();
  }

  pickScooter(id) {
    const r = this.race;
    if (!SCOOTERS[id]) return;
    r.scooter = id;
    r._saveChar();
    r.stage?.setScooter(id, true);
    this.render();
    // the bars grow from nothing each time (CSS animates --w)
    for (const b of r.menuEl.querySelectorAll('.jl__stat b')) {
      b.classList.remove('is-grow');
      void b.offsetWidth;
      b.classList.add('is-grow');
    }
  }

  pickCourse(id) {
    if (!this.host()) return;
    this.race._setup({ course: id }, false);
    for (const b of this.race.menuEl.querySelectorAll('[data-course]')) b.classList.toggle('is-on', b.dataset.course === id);
    for (const p of this.race.menuEl.querySelectorAll('[data-pin]')) p.classList.toggle('is-on', p.dataset.pin === id);
    this._refreshCourse();
  }

  pickSky(time, weather) {
    if (!this.host()) return;
    const r = this.race;
    r._setup({ time: time ?? r.time, weather: weather ?? r.weatherPick }, false);
    r.stage?.setSky(r.time, r.weatherPick);
    for (const b of r.menuEl.querySelectorAll('[data-time]')) b.classList.toggle('is-on', b.dataset.time === r.time);
    for (const b of r.menuEl.querySelectorAll('[data-weather]')) b.classList.toggle('is-on', b.dataset.weather === r.weatherPick);
  }

  _cycleSky(which, d) {
    const r = this.race;
    if (which === 'time') {
      const ks = Object.keys(TIME_PICKS);
      this.pickSky(ks[(ks.indexOf(r.time) + d + ks.length) % ks.length], null);
    } else this.pickSky(null, WEATHER_PICKS[(WEATHER_PICKS.indexOf(r.weatherPick) + d + WEATHER_PICKS.length) % WEATHER_PICKS.length]);
  }

  /** The card for the course shown (hovered, or picked). */
  _refreshCourse() {
    const card = this.race.menuEl.querySelector('[data-course-card]');
    if (!card) return;
    const id = this.hoverCourse ?? this.race.courseId;
    card.innerHTML = this._courseCard(id);
    card.classList.toggle('is-preview', Boolean(this.hoverCourse && this.hoverCourse !== this.race.courseId));
    for (const b of card.querySelectorAll('[data-laps]')) b.onclick = () => (this.race._setup({ laps: Number(b.dataset.laps) }, false), this._refreshCourse());
    for (const b of card.querySelectorAll('[data-next]')) b.onclick = () => this.next();
    for (const b of card.querySelectorAll('[data-back]')) b.onclick = () => this.back();
  }

  _preview(id) {
    this.hoverCourse = id;
    for (const p of this.race.menuEl.querySelectorAll('[data-pin]')) p.classList.toggle('is-hover', p.dataset.pin === id);
    this._refreshCourse();
  }

  /** Each planned course's loop drawn at its pin (to scale with the map), as the plans come in. */
  _routes() {
    for (const g of this.race.menuEl.querySelectorAll('[data-route]')) {
      const plan = this.race.plans.get(g.dataset.route);
      if (!plan || g.childElementCount) continue;
      const def = BIKE_COURSES.find((c) => c.id === g.dataset.route);
      // (a little larger than true scale, so the shape reads)
      const k = (1000 / VIEW.w) * 2.2;
      const d = `M${plan.points.filter((_, i) => i % 3 === 0).map((p) => `${((p[0] - def.x) * k).toFixed(1)} ${((p[1] - def.z) * k).toFixed(1)}`).join(' L')} Z`;
      g.innerHTML = `<path d="${d}"/>`;
    }
  }

  /** A plan came in (race._plan): its numbers on the chips, its card, its loop on the map. */
  planned(id) {
    const el = this.race.menuEl.querySelector(`[data-len="${id}"]`);
    if (el) el.textContent = this.race._lenText(this.race.plans.get(id));
    if (this.step === 'course') {
      this._routes();
      if ((this.hoverCourse ?? this.race.courseId) === id) this._refreshCourse();
    }
  }
}

