import { STATS } from './life.js';
import { backdrop, figure, SPOTS } from './lifeArt.js';
import { confetti } from '../ui/pop.js';

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** You, as drawn in the little moments between scenes. */
const YOU = { hair: '#4a3a2a', skin: '#f0c8a0', top: '#ffc93c', style: 'short' };
/** The little moment each thing you do gets: how you move, and what floats up from it. */
const MOMENTS = {
  focus: ['typing', '💡'], steady: ['typing', '✅'], learn: ['typing', '📘'], project: ['typing', '🛠'], study: ['typing', '📝'], overtime: ['typing', '🌙'],
  help: ['nod', '🤝'], coast: ['sip', '☕'], rest: ['sleep', '💤'], exercise: ['run', '💦'], friends: ['laugh', '🍜'], cafe: ['sip', '🥐'], family: ['nod', '📞'], chores: ['nod', '🧺']
};
/** Photographs (or any pictures) to use in place of the drawings, if the server has some: see scripts/work/scene-images.mjs. */
let pictures = null;
const loadPictures = () => (pictures ??= fetch('./work-scenes/index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

/**
 * Work Life's "Life" tab: your days, drawn. A stage with a moving backdrop
 * (the office, your flat, the café…) and the people in a scene; their words
 * typed out a line at a time; your choices under it. Beside it what you are
 * and who you know; under it what to do with this part of the day.
 *
 * The server keeps the life and decides every step (server/work/index.js,
 * src/work/life.js); this only shows it and asks for the next step.
 */
export class LifeView {
  /** @param {{ call: (path: string, body?: object) => Promise<object>, say: (text: string, kind?: string) => void, share?: (card: object) => void }} deps */
  constructor({ call, say, share = null }) {
    this.call = call;
    this.say = say;
    this.share = share;
    this.life = null;
    this.line = 0; // which line of the scene (or of what came of it) is showing
    this.mode = 'idle'; // 'scene' (lines, then choices) · 'result' (what came of a choice) · 'idle'
  }

  async render(body) {
    this.body = body;
    if (!this.life) this.life = (await this.call('work/life')).life;
    this.pics = await loadPictures();
    this._enter();
    this._draw();
  }

  /** Decide what the stage is showing after the life changed. */
  _enter() {
    const l = this.life;
    // What you just did gets a moment of its own before anything else happens.
    if (this._fresh && l.last?.kind === 'activity' && !this._cutDone && !calm()) {
      this.mode = 'cut';
      this._cutDone = true;
      clearTimeout(this._cutTimer);
      this._cutTimer = setTimeout(() => {
        if (this.mode !== 'cut' || !this.body?.isConnected) return;
        this._fresh = Boolean(this.life.scene);
        this._enter();
        this._draw();
      }, 1900);
      return;
    }
    this._cutDone = false;
    if (l.scene) {
      this.mode = 'scene';
      this.line = 0;
      this._opening = true;
    } else if (l.last?.kind === 'scene' && this._fresh) {
      this.mode = 'result';
      this.line = 0;
    } else this.mode = 'idle';
    this._fresh = false;
  }

  async step(body) {
    if (this.busy) return;
    this.busy = true;
    try {
      const before = this.life.stats;
      this.life = (await this.call('work/life', body)).life;
      this._fresh = true;
      this._before = before;
      this._enter();
      this._draw();
      if (this.life.review) confetti(null, 120);
    } catch (error) {
      this.say(error.message, 'bad');
    } finally {
      this.busy = false;
    }
  }

  /* ----------------------------------------------------------------- draw */

  _draw() {
    const l = this.life;
    const root = el('div', 'lf');
    root.dataset.life = '';
    // The week, across the top.
    const head = el('header', 'lf__head');
    head.innerHTML = `<div class="lf__when"><b>${esc(l.weekday)}</b><span>Week ${l.week} · day ${l.seasonDay} of ${l.seasonLength} · season ${l.season}</span></div>
      <div class="lf__parts" aria-label="Parts of the day">${['Morning', 'Afternoon', 'Evening'].map((p, i) => `<i class="${i < l.part ? 'is-done' : i === l.part ? 'is-now' : ''}">${p}</i>`).join('')}</div>
      <div class="lf__job">${esc(l.job.title)} ${esc(l.job.role)} at <b>${esc(l.job.company)}</b></div>`;
    root.append(head);

    const main = el('div', 'lf__main');
    main.append(this._stage(), this._side());
    root.append(main);
    root.append(this._below());
    root.tabIndex = -1;
    root.addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.mode === 'scene' || this.mode === 'result') {
          e.preventDefault();
          this._advance();
        }
      } else if (/^[1-9]$/.test(e.key)) root.querySelector(`[data-choice="${Number(e.key) - 1}"]:not(:disabled)`)?.click();
    });
    this.body.replaceChildren(root);
    if (l.review) this.body.append(this._review());
    this._type();
    if (this.mode === 'scene' || this.mode === 'result') root.focus({ preventScroll: true });
  }

  /** A person on the stage: a photograph if the server has one for them (and how they feel), else the drawing. */
  _figure(c, mood) {
    const src = this.pics[`person-${c.id}-${mood}`] ?? this.pics[`person-${c.id}`];
    return src ? `<img class="lf__portrait" src="./work-scenes/${esc(src)}" alt="" draggable="false">` : figure(c.look, mood);
  }

  /** The stage: a place, the people there, and the words. */
  _stage() {
    const l = this.life;
    const stage = el('section', `lf__stage is-${this.mode}`);
    stage.dataset.stage = '';
    const scene = this.mode === 'scene' ? l.scene : null;
    const result = this.mode === 'result' ? l.last : null;
    const cut = this.mode === 'cut' ? l.last : null;
    const place = scene?.place ?? result?.place ?? (l.last?.kind === 'activity' ? l.last.place : 'home');
    const part = l.last?.kind === 'night' && this.mode === 'idle' ? 0 : Math.min(3, this.mode === 'idle' && l.part >= 3 ? 3 : Math.max(0, l.part - (scene || result || cut ? 1 : 0)));
    const id = scene?.id ?? result?.id ?? '';
    // The camera: everything in it drifts slowly, and leans a little with the pointer.
    const cam = el('div', 'lf__cam');
    const photo = this.pics[`${place}-${part}`] ?? this.pics[place];
    cam.innerHTML = photo ? `<img class="lf__photo" src="./work-scenes/${esc(photo)}" alt="" draggable="false">` : backdrop(place, part, { rain: id === 'sora-rain' });
    stage.append(cam);
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      stage.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    // Things in the room can be clicked: each has something to say, and some do something.
    cam.addEventListener('click', (e) => {
      const spot = e.target.closest?.('[data-spot]');
      if (!spot) return;
      const kind = spot.dataset.spot;
      this._spots ??= {};
      const says = SPOTS[kind] ?? [];
      const n = (this._spots[kind] = (this._spots[kind] ?? -1) + 1);
      if (kind === 'lamp') stage.classList.toggle('is-dim');
      if (kind === 'plant') stage.classList.add('has-flower');
      spot.classList.remove('is-poked');
      void spot.getBoundingClientRect();
      spot.classList.add('is-poked');
      const r = stage.getBoundingClientRect();
      const note = el('div', 'lf__note', says[n % Math.max(1, says.length)] ?? '');
      note.style.left = `${Math.min(r.width - 250, Math.max(10, e.clientX - r.left - 110))}px`;
      note.style.top = `${Math.max(10, e.clientY - r.top - 64)}px`;
      stage.querySelector('.lf__note')?.remove();
      stage.append(note);
      setTimeout(() => note.remove(), 2600);
    });
    const cast = scene?.cast ?? result?.cast ?? [];
    const lines = scene?.lines ?? result?.lines ?? [];
    const now = lines[this.line];
    if (cast.length) {
      const row = el('div', 'lf__cast');
      cast.forEach((c, i) => {
        // Each face shows how its owner last spoke; the one speaking steps forward and talks.
        const said = [...lines.slice(0, this.line + 1)].reverse().find((x) => x.who === c.id);
        const f = el('div', `lf__person ${now?.who === c.id ? 'is-speaking is-talking' : ''} ${i % 2 ? 'from-right' : 'from-left'} ${this.line === 0 && scene ? 'is-arriving' : ''}`);
        f.dataset.person = c.id;
        f.innerHTML = this._figure(c, said?.mood ?? 'neutral');
        row.append(f);
      });
      stage.append(row);
    }
    if (cut) {
      // A moment of you doing what you chose: a run, a nap, an hour at the keys.
      const [move, prop] = MOMENTS[cut.id] ?? ['nod', cut.icon];
      const you = el('div', `lf__you is-${move}`);
      you.innerHTML = `${figure(YOU, move === 'sleep' ? 'neutral' : 'happy')}<span class="lf__prop">${prop}</span><span class="lf__prop lf__prop--b">${prop}</span><span class="lf__prop lf__prop--c">${prop}</span>`;
      stage.append(you, el('div', 'lf__title', `${cut.icon} ${cut.name}`));
      return stage;
    }
    if (scene || result) {
      stage.append(el('div', 'lf__title', scene?.title ?? result.title));
      if (scene && this._opening) {
        // The scene opens on its name, large, then gets out of the way.
        stage.append(el('div', 'lf__card', scene.title));
        this._opening = false;
      }
      const box = el('div', `lf__say ${now?.who ? '' : 'is-thought'}`);
      box.dataset.say = '';
      if (now?.name) box.append(el('b', 'lf__speaker', now.name));
      const text = el('p', 'lf__text');
      text.dataset.text = now?.text ?? '';
      box.append(text);
      const more = this.line < lines.length - 1;
      const hint = el('button', 'lf__next', more ? 'Next ▸' : result ? 'Carry on ▸' : '');
      hint.type = 'button';
      hint.dataset.next = '';
      hint.hidden = !more && !result;
      hint.addEventListener('click', () => this._advance());
      box.append(hint);
      box.addEventListener('click', (e) => e.target === box || e.target === text ? this._advance() : null);
      stage.append(box);
      if (result && !more) stage.append(this._chips(result.done, 'lf__chips lf__chips--stage'));
      if (result && this.line === 0) this._burst(stage, result);
    } else {
      // Nothing happening: what you last did, and what it did to you.
      const a = l.last;
      const cap = el('div', 'lf__caption');
      if (a?.kind === 'activity') {
        cap.innerHTML = `<span class="lf__bigicon">${a.icon}</span><div><b>${esc(a.name)}</b><small>${esc(a.part)}${a.tired ? ' · worn out: you got less from it' : ''}</small></div>`;
        cap.append(this._chips(a.done));
      } else if (a?.kind === 'night') {
        cap.innerHTML = `<span class="lf__bigicon">🌅</span><div><b>A new day</b><small>${a.week ? `Rent paid: ${a.week.rent}. ` : ''}You slept.</small></div>`;
        cap.append(this._chips(a.done));
      } else if (l.part >= 3) cap.innerHTML = '<span class="lf__bigicon">🌙</span><div><b>The day is done</b><small>Sleep, and see what tomorrow brings.</small></div>';
      else cap.innerHTML = `<span class="lf__bigicon">☀️</span><div><b>${esc(l.partName)}</b><small>What will you do with it? (Try clicking things in the room.)</small></div>`;
      stage.append(cap);
    }
    return stage;
  }

  /** How a choice landed, shown: hearts and sparks when it went well, a jolt and a cloud when it did not. */
  _burst(stage, result) {
    if (calm()) return;
    const d = result.done ?? {};
    const feel = Object.values(d.people ?? {}).reduce((a, b) => a + b, 0) + (d.stats?.mood ?? 0);
    const hearts = Object.values(d.people ?? {}).some((v) => v >= 8);
    if (feel < 0) {
      stage.classList.add('is-jolt');
      stage.append(el('div', 'lf__cloud', '🌧'));
      return;
    }
    if (feel < 4) return;
    const marks = hearts ? ['💗', '💖', '✨'] : ['✨', '⭐', '🎵'];
    for (let i = 0; i < 12; i++) {
      const m = el('span', 'lf__spark', marks[i % marks.length]);
      m.style.left = `${12 + Math.random() * 76}%`;
      m.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
      m.style.fontSize = `${18 + Math.random() * 18}px`;
      stage.append(m);
    }
  }

  /** The words are typed out; a click finishes the line, another moves on. */
  _type() {
    clearInterval(this._typing);
    const text = this.body.querySelector('[data-text]');
    if (!text) return;
    const full = text.dataset.text;
    if (calm()) {
      text.textContent = full;
      return;
    }
    let i = 0;
    text.textContent = '';
    this._typing = setInterval(() => {
      i += 2;
      text.textContent = full.slice(0, i);
      if (i >= full.length) {
        clearInterval(this._typing);
        this.body.querySelector('.lf__person.is-talking')?.classList.remove('is-talking');
      }
    }, 22);
  }

  _advance() {
    const text = this.body.querySelector('[data-text]');
    if (text && text.textContent.length < text.dataset.text.length) {
      clearInterval(this._typing);
      text.textContent = text.dataset.text;
      this.body.querySelector('.lf__person.is-talking')?.classList.remove('is-talking');
      return;
    }
    const lines = (this.mode === 'scene' ? this.life.scene?.lines : this.life.last?.lines) ?? [];
    if (this.line < lines.length - 1) {
      this.line++;
      this._draw();
    } else if (this.mode === 'result') {
      this.mode = 'idle';
      this._draw();
    }
  }

  /** What changed, as chips: +4 Skill, −22 Energy, Mina ♥. */
  _chips(done = {}, className = 'lf__chips') {
    const box = el('div', className);
    for (const [k, v] of Object.entries(done.stats ?? {})) {
      const name = k === 'money' ? 'Money' : STATS[k]?.name ?? k;
      box.append(el('span', `lf__chip ${v > 0 ? 'is-up' : 'is-down'}`, `${v > 0 ? '+' : '−'}${Math.abs(v)} ${name}`));
    }
    for (const [id, v] of Object.entries(done.people ?? {})) {
      const p = this.life.people.find((x) => x.id === id);
      box.append(el('span', `lf__chip ${v > 0 ? 'is-heart' : 'is-down'}`, `${p?.name ?? id} ${v > 0 ? '♥' : '💔'} ${v > 0 ? '+' : '−'}${Math.abs(v)}`));
    }
    return box;
  }

  /** What you are, and who you know. */
  _side() {
    const l = this.life;
    const side = el('aside', 'lf__side');
    const stats = el('div', 'lf__stats');
    for (const [k, def] of Object.entries(STATS)) {
      const v = l.stats[k];
      const was = this._before?.[k] ?? v;
      const row = el('div', 'lf__stat');
      row.dataset.stat = k;
      row.innerHTML = `<span>${def.icon} ${def.name}</span><i><u style="width:${was}%;background:${def.color}"></u></i><b>${v}</b>`;
      // The bar slides from where it was to where it is.
      requestAnimationFrame(() => requestAnimationFrame(() => (row.querySelector('u').style.width = `${v}%`)));
      if (v < 25 && (k === 'energy' || k === 'health' || k === 'mood')) row.classList.add('is-low');
      stats.append(row);
    }
    const money = el('div', `lf__money ${l.stats.money < 0 ? 'is-low' : ''}`);
    money.dataset.stat = 'money';
    money.innerHTML = `<span>👛 Pocket money</span><b>${l.stats.money}</b>`;
    stats.append(money);
    side.append(el('h3', null, 'You'), stats, el('h3', null, 'People'));
    const people = el('div', 'lf__people');
    for (const p of l.people.filter((x) => x.met)) {
      const row = el('div', 'lf__friend');
      row.dataset.person = p.id;
      row.innerHTML = `<span class="lf__face">${figure(p.look, p.closeness >= 35 ? 'happy' : 'neutral')}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)} · ${esc(p.tier)}</small><i><u style="width:${p.closeness}%"></u></i></div>`;
      people.append(row);
    }
    side.append(people);
    this._before = null;
    return side;
  }

  /** Under the stage: your answers to a scene, or what to do with this part of the day. */
  _below() {
    const l = this.life;
    const box = el('section', 'lf__below');
    if (this.mode === 'scene') {
      const lines = l.scene.lines;
      const ready = this.line >= lines.length - 1;
      box.append(el('h3', null, ready ? 'What do you do?' : '…'));
      const list = el('div', 'lf__choices');
      l.scene.choices.forEach((c, i) => {
        const b = el('button', 'lf__choice');
        b.type = 'button';
        b.dataset.choice = String(i);
        b.disabled = !ready;
        b.innerHTML = `<kbd>${i + 1}</kbd><span>${esc(c.text)}</span>${c.hard ? '<em title="How this goes depends on what you have in you right now">depends on you</em>' : ''}`;
        b.addEventListener('click', () => this.step({ do: 'choose', choice: i }));
        list.append(b);
      });
      box.append(list);
      return box;
    }
    if (this.mode === 'result') {
      box.append(el('p', 'lf__hint', `You chose: “${l.last.choice}”${l.last.ok ? '' : ' — and it did not go the way you hoped.'}`));
      return box;
    }
    if (this.mode === 'cut') {
      box.append(el('p', 'lf__hint', '…'));
      return box;
    }
    const acts = l.activities;
    box.append(el('h3', null, acts.length ? `${l.partName}: what will you do?` : 'The day is done'));
    const list = el('div', 'lf__acts');
    for (const a of acts) {
      const b = el('button', 'lf__act');
      b.type = 'button';
      b.dataset.act = a.id;
      b.disabled = Boolean(a.locked);
      const fx = Object.entries(a.fx).filter(([k]) => k !== 'people').map(([k, v]) => `<i class="${v > 0 ? 'is-up' : 'is-down'}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${k === 'money' ? 'money' : STATS[k]?.name.toLowerCase() ?? k}</i>`).join('');
      b.innerHTML = `<span class="lf__act-icon">${a.icon}</span><b>${esc(a.name)}</b><small>${esc(a.locked ?? a.text)}</small><span class="lf__fx">${fx}${a.cost ? `<i class="is-down">−${a.cost} money</i>` : ''}</span>`;
      b.addEventListener('click', () => this.step({ do: 'act', id: a.id }));
      list.append(b);
    }
    box.append(list);
    const foot = el('div', 'lf__foot');
    const sleep = el('button', `mk__btn ${acts.length ? '' : 'mk__btn--primary'}`, acts.length ? '🌙 Call it a day' : '🌙 Sleep');
    sleep.type = 'button';
    sleep.dataset.sleep = '';
    sleep.disabled = !l.canSleep;
    sleep.addEventListener('click', () => this.step({ do: 'sleep' }));
    foot.append(sleep);
    if (l.seasons.length) foot.append(el('small', 'lf__hint', `Seasons so far: ${l.seasons.map((s) => s.title).join(' · ')}`));
    const again = el('button', 'lf__restart', 'Start a new life');
    again.type = 'button';
    again.dataset.restart = '';
    again.addEventListener('click', () => window.confirm('Start over from day one? This life is forgotten.') && this.step({ do: 'restart' }));
    foot.append(again);
    box.append(foot);
    return box;
  }

  /** A season's end: its name, what you were, who was with you. */
  _review() {
    const r = this.life.review;
    const veil = el('div', 'lf__veil');
    veil.dataset.review = '';
    const card = el('div', 'lf__review');
    const close = this.life.people.filter((p) => r.people[p.id] >= 35).map((p) => p.name);
    card.innerHTML = `<small>Season ${r.season} · 28 days</small><h2>${esc(r.title)}</h2><p>${esc(r.text)}</p>
      <div class="lf__review-stats">${Object.entries(STATS).map(([k, d]) => `<span>${d.icon} ${d.name} <b>${r.stats[k]}</b></span>`).join('')}<span>👛 <b>${r.stats.money}</b></span></div>
      <p class="lf__hint">${close.length ? `Close to you: ${esc(close.join(', '))}.` : 'Nobody close yet. There is next season.'}</p>`;
    const row = el('div', 'lf__foot');
    const next = el('button', 'mk__btn mk__btn--primary', 'On to the next season ▸');
    next.type = 'button';
    next.dataset.nextSeason = '';
    next.addEventListener('click', () => this.step({ do: 'next' }));
    row.append(next);
    if (this.share) {
      const share = el('button', 'mk__btn', '📣 Share');
      share.type = 'button';
      share.dataset.share = '';
      share.addEventListener('click', () => this.share({ kind: 'season', title: r.title, line: `Season ${r.season} of my Work Life: “${r.title}”.`, detail: r.text }));
      row.append(share);
    }
    card.append(row);
    veil.append(card);
    return veil;
  }
}
