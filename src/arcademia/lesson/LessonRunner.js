/**
 * Inside a building: the lobby (pick a quest, or play an arcade game), then
 * a lesson told as a quest —
 *
 *   story → learn (reading cards) → the hands-on part → challenge → rewards
 *
 * The hands-on part is the subject's own: Professor Hoot's chalkboard and a
 * manipulative (math); a chat with a guide, a timeline to fix and a
 * treasure to turn (history); guess-then-test with an experiment (physics).
 * The challenge has a combo meter, a hint after a miss, the worked answer
 * after two, and Professor Hoot (Plus) on call. Every reading, answer and
 * finished lesson goes to progress.js; coins, XP and stickers to gamestate.js.
 */
import * as THREE from 'three';
import { el, button, sparkle, confetti, SUBJECT_ICON } from '../ui/dom.js';
import { FLOORS } from '../floors.js';
import { lessonsOn, quizFor, lessonById } from '../content/index.js';
import { makeProblem } from '../content/math.js';
import { questFor } from '../quests.js';
import { buildClassroom, buildHall, buildLab } from '../world/interiors.js';
import { makeCreature, TEACHERS } from '../world/figures.js';
import { Chalkboard } from './chalkboard.js';
import { mountPractice } from './practice.js';
import { createSim } from './sims.js';
import { bubblePop, feedMonster, launch, whoSaid } from './minigames.js';
import { TutorPanel, tutorStatus } from '../ui/tutor.js';
import { speech } from '../sound.js';
import { levelOf } from '../gamestate.js';

const ROOMS = { math: buildClassroom, history: buildHall, physics: buildLab };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openBuilding(game, { subject, floor, lesson = null }) {
  const r = new Runner(game, subject, floor);
  r.lobby(lesson);
  return r;
}

class Runner {
  constructor(game, subject, floor) {
    this.game = game;
    this.subject = subject;
    this.floor = floor;
    this.look = FLOORS[floor - 1];
    this.teacher = TEACHERS[subject];
    game._rooms ??= new Map();
    const key = `${subject}:${floor}`;
    if (!game._rooms.has(key)) game._rooms.set(key, ROOMS[subject](this.look.look));
    this.room = game._rooms.get(key);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    this.camAt = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.shot('wide', true);
    game.stage.show(this.room.scene, this.camera);
    game.stage.setGlow(0);
    // The player's buddy comes inside too, to cheer and wobble along.
    this.buddy = makeCreature({ ...(game.gs.buddy ?? { species: 'fox' }), scale: 1.0 });
    const spot = { math: [-3.0, 0, -2.8, 0.7], history: [-4.2, 0, -2.6, 0.5], physics: [-2.6, 0, 0.4, 0.5] }[subject];
    this.buddy.group.position.set(spot[0], spot[1], spot[2]);
    this.buddy.group.rotation.y = spot[3];
    this.room.scene.add(this.buddy.group);
    this.voice = game.prefs.voice ?? floor <= 2;
    this.time = 0;
    this._ui();
    this.resize(game.root.clientWidth, game.root.clientHeight);
  }

  /* ---------------------------------------------------------------- frame */

  _ui() {
    const t = this.teacher;
    this.root = el('div', `arc-lesson arc-lesson--${this.subject}`);
    const top = el('div', 'arc-lesson__top');
    this.backBtn = button('arc-chip arc-chip--btn', '⬅ Mountain', () => this.leave(), { 'aria-label': 'Back to the mountain' });
    this.titleEl = el('div', 'arc-lesson__title');
    this.stepsEl = el('ol', 'arc-lesson__steps', null, { 'aria-label': 'Quest steps' });
    this.voiceBtn = button('arc-chip arc-chip--btn', this.voice ? '🗣️ Voice on' : '🔇 Voice off', () => {
      this.voice = !this.voice;
      this.game.prefs.voice = this.voice;
      this.game.savePrefs();
      this.voiceBtn.textContent = this.voice ? '🗣️ Voice on' : '🔇 Voice off';
      this.voiceBtn.setAttribute('aria-pressed', String(this.voice));
      if (!this.voice) speech.stop();
    }, { 'aria-pressed': String(this.voice), hidden: !speech.available });
    this.hootBtn = button('arc-chip arc-chip--btn arc-hoot', null, () => this.tutor.open(), { 'aria-label': 'Ask Professor Hoot' });
    this.hootBtn.append(el('span', null, '🦉 Ask Hoot'), el('span', 'arc-plus', 'Plus'));
    tutorStatus().then((st) => {
      this.hootBtn.classList.toggle('is-locked', !st.allowed);
      this.hootBtn.querySelector('.arc-plus').textContent = st.allowed ? 'AI' : '🔒 Plus';
      this.hootBtn.title = st.allowed ? 'Ask Professor Hoot (AI tutor)' : 'Professor Hoot the AI tutor is part of Plus — tap for the free hints';
    });
    top.append(this.backBtn, this.titleEl, this.stepsEl, this.voiceBtn, this.hootBtn);
    this.main = el('div', 'arc-lesson__main');
    this.sayEl = el('div', 'arc-say', null, { 'aria-live': 'polite' });
    this.sayEl.append(el('span', 'arc-say__who', t.emoji, { 'aria-hidden': 'true' }), el('p', 'arc-say__text', ''));
    this.sayEl.hidden = true;
    this.combo = el('div', 'arc-combo', null, { hidden: true, 'aria-live': 'polite' });
    this.root.append(top, this.main, this.sayEl, this.combo);
    this.game.root.append(this.root);
    this.tutor = new TutorPanel(this.root, {
      lessonId: () => this.lesson?.id ?? lessonsOn(this.floor, this.subject)[0].id,
      context: () => this.ctx ?? { step: this.lesson?.title ?? '' },
      voice: () => this.voice
    });
  }

  frame(dt) {
    this.time += dt;
    // Ease the camera to the current shot.
    this.camera.position.lerp(this.camAt.pos, Math.min(1, dt * 3));
    this._look ??= this.camAt.look.clone();
    this._look.lerp(this.camAt.look, Math.min(1, dt * 3));
    this.camera.lookAt(this._look);
    this.room.update(dt, this.time);
    this.buddy.update(dt, {});
    this.board?.update(dt);
    this.sim?.frame(dt);
  }

  resize(w, h) {
    if (!w || !h) return;
    this.camera.aspect = w / h;
    // Narrow screens: pull back so the room still fits.
    this.camera.fov = w / h < 1 ? 62 : 46;
    this.camera.updateProjectionMatrix();
  }

  shot(name, instant = false) {
    const s = this.room.shots[name] ?? this.room.shots.wide;
    this.camAt.pos.set(...s.pos);
    this.camAt.look.set(...s.look);
    if (instant) {
      this.camera.position.copy(this.camAt.pos);
      this._look = this.camAt.look.clone();
      this.camera.lookAt(this._look);
    }
  }

  key(e) {
    if (e.key === 'Escape') {
      if (!this.tutor.root.hidden) this.tutor.close();
      else this.leave();
    }
  }

  /** The teacher (or a guide) speaks: a bubble, and the voice if it is on. */
  say(text, who = null) {
    this.sayEl.hidden = false;
    this.sayEl.querySelector('.arc-say__who').textContent = who ?? this.teacher.emoji;
    this.sayEl.querySelector('.arc-say__text').textContent = text;
    this.sayEl.classList.remove('is-pop');
    void this.sayEl.offsetWidth;
    this.sayEl.classList.add('is-pop');
    (this.room.teacher ?? this.room.tock)?.talk(Math.min(4, 0.8 + text.length * 0.04));
    if (this.voice) speech.say(text);
  }
  hush() {
    this.sayEl.hidden = true;
    speech.stop();
  }

  steps(list, at) {
    this.stepsEl.replaceChildren(...list.map((s, i) => el('li', i < at ? 'is-done' : i === at ? 'is-now' : '', s, i === at ? { 'aria-current': 'step' } : {})));
  }

  clear() {
    this.board = null;
    this.sim = null;
    this.ctx = null;
    this.combo.hidden = true;
    this.main.replaceChildren();
  }

  /* ---------------------------------------------------------------- lobby */

  lobby(start = null) {
    this.clear();
    this.lesson = null;
    this.shot('wide');
    this.titleEl.textContent = `${SUBJECT_ICON[this.subject]} ${this.teacher.name}`;
    this.stepsEl.replaceChildren();
    if (start) return this.run(start);
    const list = lessonsOn(this.floor, this.subject);
    const card = el('section', 'arc-card arc-lobby');
    card.append(el('h2', null, `${this.teacher.emoji} Pick a quest!`));
    const grid = el('div', 'arc-lobby__grid');
    for (const l of list) {
      const q = questFor(l);
      const stars = this.game.progress.stars[l.id] ?? 0;
      const b = button('arc-quest-card', null, () => this.run(l));
      b.append(el('span', 'arc-quest-card__stars', '★'.repeat(stars) + '☆'.repeat(3 - stars), { 'aria-label': `${stars} of 3 stars` }), el('strong', null, q.title), el('span', null, l.title));
      grid.append(b);
    }
    const arcade = button('arc-quest-card arc-quest-card--arcade', null, () => this.arcade());
    arcade.append(el('span', 'arc-quest-card__stars', '🕹️'), el('strong', null, ARCADE_NAMES[this.subject](this.floor)), el('span', null, 'Arcade practice · quick and fun'));
    grid.append(arcade);
    card.append(grid);
    this.main.append(card);
    this.say(this.subject === 'math' ? 'Hoo-hoo! Welcome to my classroom. Which puzzle shall we solve?' : this.subject === 'history' ? 'Tick-tock, welcome to the Hall of Time! Where shall we travel?' : 'Welcome to my lab! Goggles on. What shall we test today?');
  }

  async arcade() {
    this.clear();
    this.hush();
    this.titleEl.textContent = `🕹️ ${ARCADE_NAMES[this.subject](this.floor)}`;
    this.shot(this.subject === 'physics' ? 'screen' : 'wide');
    const frame = el('div', 'arc-card arc-arcade');
    this.main.append(frame);
    const ctx = { floor: this.floor, sound: this.game.sound, reducedMotion: this.game.reducedMotion };
    let score;
    if (this.subject === 'math') score = this.floor <= 2 && Math.random() < 0.5 ? await feedMonster(frame, ctx) : await bubblePop(frame, ctx);
    else if (this.subject === 'physics') score = await launch(frame, ctx);
    else score = await whoSaid(frame, { ...ctx, lessons: lessonsOn(this.floor, 'history') });
    if (!this.root.isConnected) return;
    const got = this.game.gs.event('arcade', { game: `${this.subject}-${this.floor}`, score });
    this.buddy.cheer(1.6);
    this.game.sound.fanfare();
    this.clear();
    const card = el('section', 'arc-card arc-results');
    card.append(el('h2', null, `🕹️ ${score} points!`), rewardsLine(got));
    const row = el('div', 'arc-row');
    row.append(button('arc-btn arc-btn--primary', '🔁 Play again', () => this.arcade()), button('arc-btn', '📋 Quests', () => this.lobby()), button('arc-btn', '⬅ Mountain', () => this.leave()));
    card.append(row);
    this.main.append(card);
    this.celebrateRewards(got, card);
  }

  /* ---------------------------------------------------------------- one lesson */

  async run(lesson) {
    this.lesson = lesson;
    this.quest = questFor(lesson);
    this.titleEl.textContent = `${SUBJECT_ICON[lesson.subject]} ${this.quest.title}`;
    const S = this.quest.steps;
    this.score = 0;
    this.comboN = 0;
    try {
      this.steps(S, 0);
      await this.story();
      this.steps(S, 1);
      await this.reading();
      if (lesson.subject === 'math') {
        this.steps(S, 2);
        await this.boardStep();
        this.steps(S, 3);
        await this.practiceStep();
        this.steps(S, 4);
      } else if (lesson.subject === 'history') {
        this.steps(S, 2);
        await this.chatStep();
        this.steps(S, 3);
        await this.timelineStep();
        this.steps(S, 4);
        await this.artifactStep();
        this.steps(S, 5);
      } else {
        this.steps(S, 2);
        await this.simStep();
        this.steps(S, 4);
      }
      await this.challenge();
      this.steps(S, S.length);
      this.results();
    } catch (error) {
      if (error !== LEFT) throw error;
    }
  }

  /** A promise that resolves when `b` is pressed; leaving rejects it. */
  until(...buttons) {
    return new Promise((resolve, reject) => {
      this._reject = reject;
      buttons.forEach((b, i) => b.addEventListener('click', () => resolve(i), { once: true }));
    });
  }

  async story() {
    this.clear();
    this.shot(this.subject === 'math' ? 'teacher' : 'wide');
    const card = el('section', 'arc-card arc-story');
    const go = button('arc-btn arc-btn--primary arc-btn--big', 'Let’s go! ▶', null);
    card.append(el('div', 'arc-story__who', this.teacher.emoji, { 'aria-hidden': 'true' }), el('p', 'arc-story__kicker', `Floor ${this.floor} quest · ${this.teacher.name}`), el('h2', null, this.quest.title), el('p', 'arc-story__text', this.quest.intro), go);
    this.main.append(card);
    this.say(this.quest.intro);
    this.room.teacher?.wave(1.5);
    go.focus();
    await this.until(go);
    this.game.sound.tap();
  }

  async reading() {
    const cards = this.lesson.reading;
    let i = 0;
    for (;;) {
      this.clear();
      this.shot('wide');
      const c = cards[i];
      const card = el('section', 'arc-card arc-read');
      card.append(el('div', 'arc-read__emoji', c.emoji ?? '📘', { 'aria-hidden': 'true' }), el('h2', null, c.title), el('p', 'arc-read__text', c.text));
      const dots = el('div', 'arc-dots', null, { 'aria-label': `Card ${i + 1} of ${cards.length}` });
      cards.forEach((_, k) => dots.append(el('i', k === i ? 'is-on' : '')));
      const row = el('div', 'arc-row');
      const back = button('arc-btn', '◀ Back', null, { disabled: i === 0 });
      const read = button('arc-btn', '🔊 Read to me', () => speech.say(`${c.title}. ${c.text}`), { hidden: !speech.available });
      const next = button('arc-btn arc-btn--primary arc-btn--big', i === cards.length - 1 ? 'Got it! ✔' : 'Next ▶', null);
      row.append(back, read, next);
      card.append(dots, row);
      this.main.append(card);
      this.hush();
      if (this.voice) speech.say(`${c.title}. ${c.text}`);
      next.focus();
      const pick = await this.until(back, next);
      this.game.sound.page();
      if (pick === 0) i = Math.max(0, i - 1);
      else if (i === cards.length - 1) break;
      else i++;
    }
    speech.stop();
    this.game.progress.reading_(this.lesson.id);
    this.game.gs.event('reading');
  }

  /* ---- math ---- */

  async boardStep() {
    this.clear();
    this.shot('board');
    const wrap = el('section', 'arc-boardwrap');
    const canvas = el('canvas', 'arc-board', null, { role: 'img', 'aria-label': 'Chalkboard with a worked example' });
    const caption = el('p', 'arc-board__caption', '', { 'aria-live': 'polite' });
    const row = el('div', 'arc-row');
    const replay = button('arc-btn', '🔁 Again', null);
    const another = button('arc-btn', '✨ Another example', null);
    const ready = button('arc-btn arc-btn--primary arc-btn--big', 'I’m ready! ▶', null);
    row.append(replay, another, ready);
    wrap.append(canvas, caption, row);
    this.main.append(wrap);
    this.board = new Chalkboard(canvas, {
      mirror: this.room.boardCanvas ? { canvas: this.room.boardCanvas, texture: this.room.boardTex } : null,
      sound: this.game.sound,
      reducedMotion: this.game.reducedMotion,
      onSay: (s) => {
        caption.textContent = `🦉 ${s}`;
        this.room.teacher?.talk(1.2);
        if (this.voice) speech.say(s);
      }
    });
    let seed = (Math.random() * 1e6) | 0;
    const play = () => {
      const p = makeProblem(this.lesson.board.gen, seed);
      this.ctx = { step: `Worked example: ${p.q}`, hint: p.hint, worked: p.explain };
      this.board.play(p.board);
    };
    play();
    replay.addEventListener('click', play);
    another.addEventListener('click', () => {
      seed++;
      play();
    });
    await this.until(ready);
    this.board.finish();
    speech.stop();
  }

  async practiceStep() {
    for (let round = 0; round < 2; round++) {
      this.clear();
      this.shot('wide');
      const p = makeProblem(this.lesson.practice.gen, (Math.random() * 1e6) | 0);
      this.ctx = { step: `Practice: ${p.q}`, hint: p.hint, worked: p.explain };
      const card = el('section', 'arc-card arc-practice');
      card.append(el('p', 'arc-card__kicker', `Try it yourself · ${round + 1} of 2`), el('h2', 'arc-q', p.q.replace(/\s*[🍎⭐🐟🌸🍪🎈🐞🦆]{2,}/u, '')));
      const area = el('div', 'arc-practice__area');
      card.append(area);
      const w = mountPractice(this.lesson.practice.kind, p, area, { sound: this.game.sound });
      const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
      const next = button('arc-btn arc-btn--primary', round ? 'On to the challenge! ▶' : 'Next one ▶', null, { hidden: true });
      if (w.value) {
        const check = button('arc-btn arc-btn--primary arc-btn--big', '✔ Check', () => {
          if (w.value() === w.right) {
            this.good(check, fb, p.explain);
            check.hidden = true;
            next.hidden = false;
          } else this.oops(check, fb, p.hint);
        });
        card.append(check);
      } else card.append(this.choices(p, fb, () => (next.hidden = false), { practice: true }));
      card.append(fb, next);
      this.main.append(card);
      this.say(round ? 'One more! You can do it.' : 'Your turn! Play with it, then pick the answer.');
      await this.until(next);
    }
  }

  /* ---- history ---- */

  async chatStep() {
    this.clear();
    const d = this.lesson.dialogue;
    const guide = this.room.setGuide(d.npc.look, this.lesson.id.length + this.floor);
    this.shot('guide');
    const name = d.npc.name;
    const box = el('section', 'arc-dialog');
    const who = el('div', 'arc-dialog__who');
    who.append(el('strong', null, name), el('span', null, d.npc.role));
    if (d.npc.portrayal === 'portrayal') who.append(el('span', 'arc-dialog__tag', 'An educational portrayal'));
    const line = el('p', 'arc-dialog__line', '', { 'aria-live': 'polite' });
    const opts = el('div', 'arc-dialog__opts');
    box.append(who, line, opts);
    this.main.append(box);
    this.hush();
    const speak = async (text) => {
      line.textContent = '';
      guide.talk(Math.min(5, 0.6 + text.length * 0.035));
      if (this.voice) speech.say(text);
      if (this.game.reducedMotion) line.textContent = text;
      else for (let i = 0; i <= text.length; i += 2) {
        line.textContent = text.slice(0, i);
        await wait(14);
        if (!this.root.isConnected) throw LEFT;
      }
      line.textContent = text;
    };
    await speak(d.intro);
    const asked = new Set();
    this.ctx = { step: `Talking with ${name}`, hint: 'Ask every question — the answers help in the challenge!' };
    while (asked.size < d.topics.length) {
      opts.replaceChildren();
      const bs = d.topics.map((t, i) => button(`arc-dialog__opt${asked.has(i) ? ' is-asked' : ''}`, `${asked.has(i) ? '✔ ' : '💬 '}${t.ask}`, null));
      opts.append(...bs);
      bs.find((b, i) => !asked.has(i))?.focus();
      const i = await this.until(...bs);
      asked.add(i);
      this.game.sound.tap();
      await speak(d.topics[i].answer);
      guide[i % 2 ? 'wave' : 'hop']();
    }
    // The guide's own question.
    const c = d.challenge;
    await speak(`Now a question for you! ${c.q}`);
    const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    opts.replaceChildren();
    const next = button('arc-btn arc-btn--primary', 'Thank you! ▶', null, { hidden: true });
    opts.append(this.choices({ ...c, hint: c.hint ?? 'Think about what they told you.' }, fb, () => (next.hidden = false), { practice: true }), fb, next);
    await this.until(next);
    await speak(d.farewell);
    guide.wave(2);
    await wait(this.game.reducedMotion ? 200 : 1200);
  }

  async timelineStep() {
    this.clear();
    this.shot('timeline');
    const t = this.lesson.timeline;
    const right = [...t.events].sort((a, b) => a.year - b.year);
    let tray = [...t.events].sort(() => Math.random() - 0.5);
    if (tray.every((e, i) => e === right[i])) tray.reverse();
    const placed = Array(right.length).fill(null);
    const okSet = new Set();
    let held = null;
    const card = el('section', 'arc-card arc-timeline');
    card.append(el('p', 'arc-card__kicker', 'Fix the timeline'), el('h2', null, t.title), el('p', 'arc-hint', 'Tap a card, then tap its spot. Oldest goes on the left!'));
    const slotsEl = el('ol', 'arc-tl__slots');
    const trayEl = el('div', 'arc-tl__tray');
    const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    const check = button('arc-btn arc-btn--primary arc-btn--big', '✔ Check my timeline', null);
    card.append(slotsEl, trayEl, check, fb);
    this.main.append(card);
    this.say('Oh no, my timeline got jumbled! Can you put it back in order?', TEACHERS.history.emoji);
    this.ctx = { step: `Timeline: ${t.title}`, hint: 'Look for clues like "first", "later", or very old things like stone tools.', worked: right.map((e) => `${e.when}: ${e.label}`).join(' → ') };
    const draw = () => {
      slotsEl.replaceChildren();
      placed.forEach((e, i) => {
        const s = button(`arc-tl__slot${e ? ' is-full' : ''}`, e ? e.label : `${i + 1}`, () => {
          if (held) {
            if (placed[i]) tray.push(placed[i]);
            placed[i] = held;
            tray = tray.filter((x) => x !== held);
            held = null;
          } else if (placed[i]) {
            tray.push(placed[i]);
            placed[i] = null;
          }
          this.game.sound.tap();
          draw();
        }, { 'aria-label': e ? `Spot ${i + 1}: ${e.label}. Tap to take it back` : `Empty spot ${i + 1}` });
        if (e && okSet.has(e)) s.classList.add('is-right');
        const li = el('li');
        li.append(s);
        slotsEl.append(li);
      });
      trayEl.replaceChildren();
      for (const e of tray) trayEl.append(button(`arc-tl__card${held === e ? ' is-held' : ''}`, e.label, () => {
        held = held === e ? null : e;
        this.game.sound.tap();
        draw();
      }, { 'aria-pressed': String(held === e) }));
    };
    draw();
    for (;;) {
      await this.until(check);
      if (placed.some((e) => !e)) {
        fb.textContent = 'Put every card on the line first!';
        continue;
      }
      const wrong = placed.filter((e, i) => e !== right[i]);
      if (!wrong.length) {
        placed.forEach((e) => okSet.add(e));
        draw();
        const years = el('div', 'arc-tl__years');
        right.forEach((e) => years.append(el('span', null, e.when)));
        card.insertBefore(years, trayEl);
        this.good(check, fb, 'Perfect order! History is back on track.');
        check.hidden = true;
        const next = button('arc-btn arc-btn--primary', 'Next ▶', null);
        card.append(next);
        await this.until(next);
        return;
      }
      // Send the wrong ones back to the tray.
      placed.forEach((e, i) => {
        if (e !== right[i]) {
          tray.push(e);
          placed[i] = null;
        } else okSet.add(e);
      });
      this.oops(check, fb, `${wrong.length} ${wrong.length === 1 ? 'card is' : 'cards are'} in the wrong spot — try again!`);
      draw();
    }
  }

  async artifactStep() {
    this.clear();
    const a = this.lesson.artifact;
    this.room.setArtifact(a.model);
    this.shot('artifact');
    const card = el('section', 'arc-card arc-artifact');
    card.append(el('p', 'arc-card__kicker', '🧰 Treasure found!'), el('h2', null, a.name), el('p', 'arc-read__text', a.text));
    const row = el('div', 'arc-row');
    row.append(button('arc-btn', '⟲ Turn', () => this.room.spinBy(-0.6)), button('arc-btn', '⟳ Turn', () => this.room.spinBy(0.6)));
    const next = button('arc-btn arc-btn--primary arc-btn--big', 'To the challenge! ▶', null);
    row.append(next);
    card.append(row);
    this.main.append(card);
    // Drag on the 3D view to turn it.
    const canvas = this.game.stage.renderer.domElement;
    let lastX = null;
    const move = (e) => {
      if (lastX == null) return;
      this.room.spinBy((e.clientX - lastX) * 0.012);
      lastX = e.clientX;
    };
    const down = (e) => (lastX = e.clientX);
    const up = () => (lastX = null);
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this.say(`Look what we found: ${a.name}! Drag to turn it around.`, TEACHERS.history.emoji);
    try {
      await this.until(next);
    } finally {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
  }

  /* ---- physics ---- */

  async simStep() {
    this.clear();
    this.shot('screen');
    const s = this.lesson.sim;
    const wrap = el('section', 'arc-simwrap');
    const canvas = el('canvas', 'arc-sim', null, { role: 'img', 'aria-label': 'Experiment' });
    const controls = el('div', 'arc-sim__controls');
    const panel = el('div', 'arc-card arc-predict');
    wrap.append(canvas, panel);
    this.main.append(wrap);
    this.sim = createSim(s.id, s.setup ?? {}, { canvas, controls, sound: this.game.sound });
    // 1. Guess.
    panel.append(el('p', 'arc-card__kicker', '🤔 Guess first!'), el('h2', 'arc-q', s.predict.q));
    const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    let guess = -1;
    const opts = el('div', 'arc-choices');
    const bs = s.predict.choices.map((c, i) => button('arc-choice', c, () => {
      guess = i;
      for (const b of bs) b.disabled = true;
      bs[i].classList.add('is-picked');
    }));
    opts.append(...bs);
    panel.append(opts, fb);
    this.say('What do you think will happen? Make a guess — scientists always guess first!');
    if (this.voice) speech.say(s.predict.q);
    this.ctx = { step: `Predict: ${s.predict.q}`, hint: 'Think about what you read on the cards.', worked: s.predict.explain };
    await this.until(...bs);
    this.game.sound.tap();
    // 2. Watch.
    fb.textContent = '👀 Let’s test it!';
    this.say('Let’s test it! Watch closely…');
    await this.sim.watch();
    if (!this.root.isConnected) throw LEFT;
    const ok = guess === s.predict.answer;
    fb.textContent = `${ok ? '🎉 You guessed right! ' : '😮 Surprise! '}${s.predict.explain}`;
    bs[s.predict.answer].classList.add('is-right');
    if (ok) {
      this.game.sound.right();
      this.buddy.cheer(1.4);
    } else this.buddy.sad(1);
    this.say(ok ? 'Great guess! ' + s.predict.explain : 'Wow, surprising! ' + s.predict.explain);
    // 3. Play.
    this.steps(this.quest.steps, 3);
    const play = button('arc-btn arc-btn--primary', 'Now I try it! 🔧', null);
    panel.append(play);
    await this.until(play);
    panel.replaceChildren(el('p', 'arc-card__kicker', '🔧 Your experiment'), el('p', 'arc-hint', 'Change things and test again. What happens?'), controls);
    const done = button('arc-btn arc-btn--primary arc-btn--big', 'To the challenge! ▶', null);
    panel.append(done);
    await this.until(done);
  }

  /* ---------------------------------------------------------------- the challenge */

  /**
   * Answer buttons for one question: right → cheer; first miss → the hint;
   * second miss → the answer and why. `done()` once it is settled.
   * In the challenge, `record` logs every attempt.
   */
  choices(q, fb, done, { practice = false, onResult = null } = {}) {
    const box = el('div', 'arc-choices');
    this.current = q;
    let misses = 0;
    const bs = q.choices.map((c, i) => button('arc-choice', c, () => {
      if (i === q.answer) {
        for (const b of bs) b.disabled = true;
        bs[i].classList.add('is-right');
        this.good(bs[i], fb, q.explain);
        onResult?.(true, misses);
        done();
      } else {
        misses++;
        bs[i].disabled = true;
        bs[i].classList.add('is-wrong');
        onResult?.(false, misses);
        if (misses >= 2 || bs.filter((b) => !b.disabled).length <= 1) {
          for (const b of bs) b.disabled = true;
          bs[q.answer].classList.add('is-right');
          this.oops(bs[i], fb, `The answer is “${q.choices[q.answer]}”. ${q.explain}`);
          done();
        } else this.oops(bs[i], fb, `💡 Hint: ${q.hint}`);
      }
    }));
    box.append(...bs);
    return box;
  }

  good(from, fb, text) {
    fb.className = 'arc-feedback is-good';
    fb.textContent = `🎉 ${PRAISE[Math.floor(Math.random() * PRAISE.length)]} ${text ?? ''}`;
    this.game.sound.right();
    sparkle(from);
    this.buddy.cheer(1.4);
  }
  oops(from, fb, text) {
    fb.className = 'arc-feedback is-oops';
    fb.textContent = text;
    this.game.sound.wrong();
    from?.classList.remove('is-shake');
    void from?.offsetWidth;
    from?.classList.add('is-shake');
    this.buddy.sad(1.1);
  }

  async challenge() {
    const qs = quizFor(this.lesson, (Math.random() * 1e6) | 0);
    this.combo.hidden = false;
    this.comboN = 0;
    this.drawCombo();
    for (let i = 0; i < qs.length; i++) {
      this.clear();
      this.combo.hidden = false;
      this.shot(this.subject === 'math' ? 'board' : this.subject === 'history' ? 'wide' : 'screen');
      const q = qs[i];
      this.ctx = { step: `Challenge question: ${q.q} Choices: ${q.choices.join(' / ')}`, hint: q.hint, worked: q.explain };
      const card = el('section', 'arc-card arc-quiz');
      const dots = el('div', 'arc-dots', null, { 'aria-label': `Question ${i + 1} of ${qs.length}` });
      qs.forEach((_, k) => dots.append(el('i', k < i ? 'is-done' : k === i ? 'is-on' : '')));
      card.append(dots, el('p', 'arc-card__kicker', `⚔️ Challenge ${i + 1} of ${qs.length}`), el('h2', 'arc-q', q.q));
      const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
      const next = button('arc-btn arc-btn--primary arc-btn--big', i === qs.length - 1 ? 'Finish! 🏁' : 'Next ▶', null, { hidden: true });
      const help = el('div', 'arc-row arc-quiz__help');
      const hintBtn = button('arc-btn arc-btn--ghost', '💡 Hint', () => {
        fb.className = 'arc-feedback';
        fb.textContent = `💡 ${q.hint}`;
        if (this.voice) speech.say(q.hint);
      });
      const how = button('arc-btn arc-btn--ghost', '📖 Show me how', () => {
        fb.className = 'arc-feedback';
        fb.textContent = `📖 ${q.explain}`;
        if (q.board?.length) this.miniBoard(card, q.board);
      });
      help.append(hintBtn, how);
      card.append(this.choices(q, fb, () => {
        next.hidden = false;
        how.disabled = false;
        next.focus();
      }, {
        onResult: (right, misses) => {
          this.game.progress.answer(this.lesson.id, right);
          if (right && misses === 0) {
            this.score++;
            this.comboN++;
            const got = this.game.gs.event('right', { combo: this.comboN });
            this.flashCoins(got);
          } else if (!right) this.comboN = 0;
          this.drawCombo();
        }
      }), fb, help, next);
      this.main.append(card);
      if (this.voice) speech.say(q.q);
      await this.until(next);
    }
    this.combo.hidden = true;
  }

  /** A small chalkboard with the worked answer of a generated question. */
  miniBoard(card, steps) {
    if (card.querySelector('.arc-miniboard')) return;
    const c = el('canvas', 'arc-board arc-miniboard', null, { role: 'img', 'aria-label': 'Worked answer on the chalkboard' });
    card.append(c);
    this.board = new Chalkboard(c, { sound: this.game.sound, reducedMotion: this.game.reducedMotion });
    this.board.play(steps);
  }

  drawCombo() {
    const n = this.comboN;
    this.combo.replaceChildren(el('span', 'arc-combo__flame', n >= 5 ? '☄️' : n >= 3 ? '🔥' : '✨', { 'aria-hidden': 'true' }), el('strong', null, `Combo ×${n}`), el('i', 'arc-combo__bar'));
    this.combo.querySelector('.arc-combo__bar').style.setProperty('--k', String(Math.min(1, n / 5)));
    this.combo.classList.toggle('is-hot', n >= 3);
    if (n >= 2) {
      this.combo.classList.remove('is-bump');
      void this.combo.offsetWidth;
      this.combo.classList.add('is-bump');
    }
  }

  flashCoins(got) {
    if (!got.coins) return;
    const f = el('div', 'arc-coinpop', `+${got.coins} 🪙`, { 'aria-hidden': 'true' });
    this.root.append(f);
    setTimeout(() => f.remove(), 1100);
    this.game.refreshGame();
  }

  /* ---------------------------------------------------------------- rewards */

  results() {
    this.clear();
    this.hush();
    const l = this.lesson;
    const before = this.game.progress.stars[l.id] ?? 0;
    const stars = this.game.progress.finish(l.id, this.score);
    const got = this.game.gs.event('lesson', { stars, newStars: Math.max(0, stars - before), subject: l.subject });
    this.game.refreshGame();
    this.shot('wide');
    const card = el('section', 'arc-card arc-results');
    const row = el('div', 'arc-results__stars', null, { 'aria-label': `${stars} of 3 stars` });
    for (let i = 0; i < 3; i++) row.append(el('span', `arc-bigstar${i < stars ? ' is-on' : ''}`, '★'));
    card.append(el('p', 'arc-card__kicker', 'Quest complete!'), el('h2', null, stars === 3 ? 'Amazing! Perfect score!' : stars === 2 ? 'Great job!' : 'You did it!'), row, el('p', 'arc-results__score', `${this.score} of ${quizLength(l)} right on the first try`), rewardsLine(got));
    const lv = levelOf(this.game.gs.s.xp);
    const xp = el('div', 'arc-xp', null, { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(lv.need), 'aria-valuenow': String(lv.into), 'aria-label': `Level ${lv.level}` });
    xp.append(el('span', null, `Level ${lv.level}`), el('i', null));
    xp.querySelector('i').style.setProperty('--k', String(lv.into / lv.need));
    card.append(xp);
    const next = this.nextLesson();
    const btns = el('div', 'arc-row');
    btns.append(button('arc-btn', '🔁 Play again', () => this.run(l)));
    if (next) btns.append(button('arc-btn arc-btn--primary arc-btn--big', `Next quest ▶`, () => this.run(next)));
    btns.append(button('arc-btn', '⬅ Mountain', () => this.leave()));
    card.append(btns);
    this.main.append(card);
    this.say(stars === 3 ? 'Hoo-ray! Three stars! You are a superstar!' : stars === 2 ? 'Wonderful work! Can you get three stars next time?' : 'Well done for finishing! Practice makes perfect.');
    this.buddy.cheer(2.5);
    this.game.sound.fanfare();
    confetti(this.root, stars * 40);
    [...row.children].forEach((s, i) => i < stars && setTimeout(() => {
      s.classList.add('is-pop');
      this.game.sound.star(i * 2);
      sparkle(s);
    }, 400 + i * 380));
    this.celebrateRewards(got, card);
  }

  celebrateRewards(got, card) {
    if (got.levelUp) {
      const b = el('div', 'arc-levelup', null, { role: 'status' });
      b.append(el('strong', null, `⬆️ Level ${got.levelUp}!`), el('span', null, 'Your buddy grew stronger!'));
      card.prepend(b);
      setTimeout(() => this.game.sound.fanfare(), 1500);
    }
    if (got.stickers?.length) {
      const s = el('div', 'arc-stickers-new');
      s.append(el('span', null, 'New sticker!'));
      for (const st of got.stickers) s.append(el('span', 'arc-sticker', st.emoji, { title: st.name, 'aria-label': `Sticker: ${st.name}` }));
      card.append(s);
    }
  }

  nextLesson() {
    const list = lessonsOn(this.floor, this.subject);
    const i = list.findIndex((l) => l.id === this.lesson.id);
    return list.slice(i + 1).find((l) => true) ?? list.find((l) => !(this.game.progress.stars[l.id] > 0) && l.id !== this.lesson.id) ?? null;
  }

  leave() {
    this._reject?.(LEFT);
    this.game.leaveLesson();
  }

  dispose() {
    speech.stop();
    this._reject?.(LEFT);
    this.tutor.dispose();
    this.room.scene.remove(this.buddy.group);
    this.root.remove();
  }
}

const LEFT = Symbol('left the lesson');
const PRAISE = ['Yes!', 'Brilliant!', 'You got it!', 'Super!', 'Hoo-ray!', 'Correct!', 'Awesome!', 'Nailed it!'];
const ARCADE_NAMES = { math: (f) => (f <= 2 ? 'Bubble Pop & Hungry Monster' : 'Bubble Pop'), physics: () => 'Launch to the Basket', history: () => 'Who Said It?' };
function quizLength(l) {
  return Array.isArray(l.quiz) ? l.quiz.length : l.quiz.count;
}
function rewardsLine(got) {
  const p = el('p', 'arc-rewards');
  if (got.coins) p.append(el('span', 'arc-rewards__coins', `+${got.coins} 🪙`));
  if (got.xp) p.append(el('span', 'arc-rewards__xp', `+${got.xp} XP`));
  return p;
}
export { lessonById };
