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
 *
 * Voices (voice/player.js) are played by line id with the voice on: a real
 * person's recording, else the character's generated voice, else just the
 * text. On floors 1–2 the voice is on by default (prefs.voice).
 */
import * as THREE from 'three';
import { el, button, sparkle, confetti, SUBJECT_ICON } from '../ui/dom.js';
import { FLOORS } from '../floors.js';
import { lessonsOn, quizFor, lessonById, teachingRealm } from '../content/index.js';
import { makeProblem } from '../content/math.js';
import { questFor } from '../quests.js';
import { buildClassroom, buildHall, buildLab } from '../world/interiors.js';
import { makeCreature, TEACHERS, teachersIn } from '../world/figures.js';
import { Chalkboard } from './chalkboard.js';
import { mountPractice } from './practice.js';
import { createSim } from './sims.js';
import { bubblePop, feedMonster, launch, whoSaid } from './minigames.js';
import { TutorPanel, tutorStatus } from '../ui/tutor.js';
import { speech } from '../sound.js';
import { levelOf } from '../gamestate.js';
import { t as tr, localizeLesson } from '../i18n/index.js';
import { REALM_TEACHER_OF } from '../voice/script.js';

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
    this.look = (game.floors ?? FLOORS)[floor - 1];
    /** The way back out: to the mountain, the tree… (maps.js) */
    this.back = game.map?.back ?? ['lesson.back', 'lesson.backAria'];
    /** The realm's teachers: the land's, or the sea islands' (maps.js). */
    this.realm = teachingRealm(game.map?.realm ?? 'land');
    this.teacher = teachersIn(this.realm)[subject];
    game._rooms ??= new Map();
    const key = `${game.map?.id ?? 'mountain'}:${subject}:${floor}`;
    // On the space maps the teachers and guides wear space suits too (maps.js `suit`).
    this.suit = game.map?.suit ?? null;
    if (!game._rooms.has(key)) game._rooms.set(key, ROOMS[subject](this.look.look, this.teacher.species, { suit: this.suit }));
    this.room = game._rooms.get(key);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    this.camAt = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.shot('wide', true);
    game.stage.show(this.room.scene, this.camera);
    game.stage.setGlow(0);
    // The player's buddy comes inside too, to cheer and wobble along.
    this.buddy = makeCreature({ ...(game.gs.buddy ?? { species: 'fox' }), scale: 1.0, suit: this.suit });
    const spot = { math: [2.4, 0, -1.6, -0.45], history: [3.4, 0, -1.2, -0.5], physics: [3.0, 0, -2.0, -0.5] }[subject];
    this.buddy.group.position.set(spot[0], spot[1], spot[2]);
    this.buddy.group.rotation.y = spot[3];
    this.room.scene.add(this.buddy.group);
    this.voice = game.prefs.voice ?? floor <= 2;
    this.teacherChar = REALM_TEACHER_OF[this.realm][subject];
    this.buddyChar = `buddy-${game.gs.buddy?.species ?? 'fox'}`;
    this.time = 0;
    this._ui();
    this.resize(game.root.clientWidth, game.root.clientHeight);
  }

  /* ---------------------------------------------------------------- frame */

  _ui() {
    const t = this.teacher;
    this.root = el('div', `arc-lesson arc-lesson--${this.subject}`);
    const top = el('div', 'arc-lesson__top');
    this.backBtn = button('arc-chip arc-chip--btn', tr(this.back[0]), () => this.leave(), { 'aria-label': tr(this.back[1]) });
    this.titleEl = el('div', 'arc-lesson__title');
    this.stepsEl = el('ol', 'arc-lesson__steps', null, { 'aria-label': tr('lesson.stepsAria') });
    this.voiceBtn = button('arc-chip arc-chip--btn', tr(this.voice ? 'lesson.voiceOn' : 'lesson.voiceOff'), () => {
      this.voice = !this.voice;
      this.game.prefs.voice = this.voice;
      this.game.savePrefs();
      this.voiceBtn.textContent = tr(this.voice ? 'lesson.voiceOn' : 'lesson.voiceOff');
      this.voiceBtn.setAttribute('aria-pressed', String(this.voice));
      if (!this.voice) speech.stop();
    }, { 'aria-pressed': String(this.voice), hidden: !speech.available });
    this.hootBtn = button('arc-chip arc-chip--btn arc-hoot', null, () => this.tutor.open(), { 'aria-label': tr('lesson.askHootAria', { name: TEACHERS.math.name }) });
    this.hootBtn.append(el('span', null, tr('lesson.askHoot')), el('span', 'arc-plus', tr('lesson.badgePlus')));
    tutorStatus().then((st) => {
      this.hootBtn.classList.toggle('is-locked', !st.allowed);
      this.hootBtn.querySelector('.arc-plus').textContent = tr(st.allowed ? 'lesson.badgeAi' : 'lesson.badgeLocked');
      this.hootBtn.title = tr(st.allowed ? 'lesson.hootTitle' : 'lesson.hootLockedTitle', { name: TEACHERS.math.name });
    });
    top.append(this.backBtn, this.titleEl, this.stepsEl, this.voiceBtn, this.hootBtn);
    this.main = el('div', 'arc-lesson__main');
    this.sayEl = el('div', 'arc-say', null, { 'aria-live': 'polite' });
    this.sayEl.append(el('span', 'arc-say__who arc-portrait', t.emoji, { 'aria-hidden': 'true', 'data-who': 'teacher' }), el('p', 'arc-say__text', ''));
    this.sayEl.hidden = true;
    this.combo = el('div', 'arc-combo', null, { hidden: true, 'aria-live': 'polite' });
    this.root.append(top, this.main, this.sayEl, this.combo);
    this.game.root.append(this.root);
    this.tutor = new TutorPanel(this.root, {
      lessonId: () => this.lesson?.id ?? lessonsOn(this.floor, this.subject, this.realm)[0].id,
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

  /**
   * The speaker's face, live: the teacher (or the history guide) drawn up close
   * into the little frame by their speech bubble, so they are always in view,
   * talking and reacting, whatever the room camera shows.
   */
  portrait(renderer) {
    const frames = [...this.root.querySelectorAll('.arc-portrait')].filter((f) => f.offsetParent && !f.closest('[hidden]'));
    if (!frames.length) return;
    const canvas = renderer.domElement.getBoundingClientRect();
    this._pcam ??= new THREE.PerspectiveCamera(28, 1, 0.05, 60);
    const v = new THREE.Vector3(), fwd = new THREE.Vector3();
    const size = renderer.getSize(new THREE.Vector2());
    const kx = size.x / Math.max(1, canvas.width), ky = size.y / Math.max(1, canvas.height);
    renderer.setScissorTest(true);
    for (const f of frames) {
      const who = f.dataset.who === 'guide' ? this.room.guide : this.room.teacher ?? this.room.tock;
      if (!who?.bones) continue;
      const r = f.getBoundingClientRect();
      const x = (r.left - canvas.left) * kx, y = (canvas.bottom - r.bottom) * ky, w = r.width * kx, h = r.height * ky;
      if (w < 8 || h < 8) continue;
      f.textContent = '';
      f.classList.add('is-live');
      const scale = who.group.children[0]?.scale.x ?? 1;
      who.bones.head.getWorldPosition(v);
      who.group.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const look = v.clone().add(new THREE.Vector3(0, 0.24 * scale, 0));
      this._pcam.aspect = w / h;
      this._pcam.updateProjectionMatrix();
      this._pcam.position.copy(look).addScaledVector(fwd, 2.0 * scale).add(new THREE.Vector3(0, 0.18 * scale, 0));
      this._pcam.lookAt(look);
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.clearDepth();
      renderer.render(this.room.scene, this._pcam);
      // Inside an opaque card the canvas can't show through: copy the face into the frame's own picture.
      if (f.dataset.copy) {
        let pic = f.querySelector('canvas');
        if (!pic) f.append((pic = document.createElement('canvas')));
        const pr = renderer.getPixelRatio();
        pic.width = Math.round(w * pr);
        pic.height = Math.round(h * pr);
        const H = renderer.domElement.height;
        pic.getContext('2d').drawImage(renderer.domElement, x * pr, H - (y + h) * pr, w * pr, h * pr, 0, 0, pic.width, pic.height);
      }
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
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

  /**
   * The teacher speaks: a bubble, and their recorded voice for `line` if it
   * is on and someone recorded it (the text stays either way).
   * `opts`: { line, who (an emoji for the bubble), char }.
   */
  say(text, opts = {}) {
    const { who = null, line = null, char = this.teacherChar } = typeof opts === 'string' ? { who: opts } : opts;
    this.sayEl.hidden = false;
    this.sayEl.querySelector('.arc-say__who').textContent = who ?? this.teacher.emoji;
    this.sayEl.querySelector('.arc-say__text').textContent = text;
    this.sayEl.classList.remove('is-pop');
    void this.sayEl.offsetWidth;
    this.sayEl.classList.add('is-pop');
    const speaker = this.room.teacher ?? this.room.tock;
    speaker?.talk(Math.min(4, 0.8 + text.length * 0.04));
    this.speak(line ?? text, { char, face: speaker, bubble: this.sayEl });
  }
  /** A recorded line, if the voice is on: `face` lip-syncs, `bubble` lights up. Silent without a recording. */
  speak(lineOrText, { char = this.teacherChar, face = this.room.teacher ?? this.room.tock, bubble = null, queue = false } = {}) {
    if (!this.voice) return false;
    speech.say(lineOrText, { char, face, bubble, queue });
    return true;
  }
  /** The teacher's recorded line when there is one, else the buddy's (both silent without recordings). */
  react(teacherLine, buddyLine, { queue = false } = {}) {
    if (!this.voice) return;
    if (teacherLine && speech.has(teacherLine, this.teacherChar)) this.speak(teacherLine, { queue });
    else if (buddyLine) this.bark(buddyLine, { queue });
  }
  /** The buddy says something (a bark), after what is playing. */
  bark(line, { queue = true } = {}) {
    if (this.voice) speech.say(line, { char: this.buddyChar, face: this.buddy, queue });
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
    const list = lessonsOn(this.floor, this.subject, this.realm);
    const card = el('section', 'arc-card arc-lobby');
    card.append(el('h2', null, tr('lesson.pick', { emoji: this.teacher.emoji })));
    const grid = el('div', 'arc-lobby__grid');
    for (const l of list.map((x) => localizeLesson(x))) {
      const q = questFor(l);
      const stars = this.game.progress.stars[l.id] ?? 0;
      const b = button('arc-quest-card', null, () => this.run(l));
      b.append(el('span', 'arc-quest-card__stars', '★'.repeat(stars) + '☆'.repeat(3 - stars), { 'aria-label': tr('lesson.starsAria', { n: stars }) }), el('strong', null, q.title), el('span', null, l.title));
      grid.append(b);
    }
    const arcade = button('arc-quest-card arc-quest-card--arcade', null, () => this.arcade());
    arcade.append(el('span', 'arc-quest-card__stars', '🕹️'), el('strong', null, ARCADE_NAMES[this.subject](this.floor)), el('span', null, tr('lesson.arcadeSub')));
    grid.append(arcade);
    card.append(grid);
    this.main.append(card);
    // Each realm's teacher greets in their own words (lesson.js lesson.hello.* on the mountain, <realm>.hello.* elsewhere).
    const hello = this.realm === 'land' ? `lesson.hello.${this.subject}` : `${this.realm}.hello.${this.subject}`;
    this.say(tr(hello), { line: `t.${hello}` });
    speech.preloadFloor(this.floor, this.buddyChar);
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
    else score = await whoSaid(frame, { ...ctx, lessons: lessonsOn(this.floor, 'history', this.realm) });
    if (!this.root.isConnected) return;
    const got = this.game.gs.event('arcade', { game: `${this.subject}-${this.floor}`, score });
    this.buddy.cheer(1.6);
    this.bark('t.voice.buddy.end', { queue: false });
    this.game.celebrate ? this.game.celebrate('level-up') : this.game.sound.fanfare();
    this.clear();
    const card = el('section', 'arc-card arc-results');
    card.append(el('h2', null, tr('lesson.points', { count: score })), rewardsLine(got));
    const row = el('div', 'arc-row');
    row.append(button('arc-btn arc-btn--primary', tr('lesson.playAgain'), () => this.arcade()), button('arc-btn', tr('lesson.quests'), () => this.lobby()), button('arc-btn', tr(this.back[0]), () => this.leave()));
    card.append(row);
    this.main.append(card);
    this.celebrateRewards(got, card);
  }

  /* ---------------------------------------------------------------- one lesson */

  async run(lesson) {
    // The lesson in the player's language (it keeps that language until it is left).
    speech.preloadLesson(lesson, this.buddyChar);
    lesson = localizeLesson(lesson);
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
    const go = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.go'), null);
    card.append(el('div', 'arc-story__who', this.teacher.emoji, { 'aria-hidden': 'true' }), el('p', 'arc-story__kicker', tr('lesson.storyKicker', { floor: this.floor, teacher: this.teacher.name })), el('h2', null, this.quest.title), el('p', 'arc-story__text', this.quest.intro), go);
    this.main.append(card);
    this.say(this.quest.intro, { line: this.quest.introLine });
    this.bark('t.voice.buddy.start');
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
      const dots = el('div', 'arc-dots', null, { 'aria-label': tr('lesson.cardOf', { n: i + 1, total: cards.length }) });
      cards.forEach((_, k) => dots.append(el('i', k === i ? 'is-on' : '')));
      const row = el('div', 'arc-row');
      const back = button('arc-btn', tr('lesson.prev'), null, { disabled: i === 0 });
      const line = `l.${this.lesson.id}.reading.${i}`;
      const read = button('arc-btn', tr('lesson.readToMe'), () => speech.say(line, { char: this.teacherChar, face: this.room.teacher ?? this.room.tock, bubble: card }), { hidden: !speech.available || !speech.has(line, this.teacherChar) });
      const next = button('arc-btn arc-btn--primary arc-btn--big', tr(i === cards.length - 1 ? 'lesson.gotIt' : 'lesson.next'), null);
      row.append(back, read, next);
      card.append(dots, row);
      this.main.append(card);
      this.hush();
      this.speak(line, { bubble: card });
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
    const canvas = el('canvas', 'arc-board', null, { role: 'img', 'aria-label': tr('lesson.boardAria') });
    const caption = el('p', 'arc-board__caption', '', { 'aria-live': 'polite' });
    const row = el('div', 'arc-row');
    const replay = button('arc-btn', tr('lesson.again'), null);
    const another = button('arc-btn', tr('lesson.another'), null);
    const ready = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.ready'), null);
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
        // Worked examples are generated, so there is no recorded line for them (text only).
        this.speak(s);
      }
    });
    let seed = (Math.random() * 1e6) | 0;
    const play = () => {
      const p = makeProblem(this.lesson.board.gen, seed);
      this.ctx = { step: tr('lesson.ctxWorked', { q: p.q }), hint: p.hint, worked: p.explain };
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
      this.ctx = { step: tr('lesson.ctxPractice', { q: p.q }), hint: p.hint, worked: p.explain };
      const card = el('section', 'arc-card arc-practice');
      card.append(el('p', 'arc-card__kicker', tr('lesson.tryKicker', { n: round + 1, total: 2 })), el('h2', 'arc-q', p.q.replace(/\s*[🍎⭐🐟🌸🍪🎈🐞🦆]{2,}/u, '')));
      const area = el('div', 'arc-practice__area');
      card.append(area);
      const w = mountPractice(this.lesson.practice.kind, p, area, { sound: this.game.sound });
      const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
      const next = button('arc-btn arc-btn--primary', tr(round ? 'lesson.toChallenge' : 'lesson.nextOne'), null, { hidden: true });
      if (w.value) {
        const check = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.check'), () => {
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
      this.say(tr(round ? 'lesson.oneMore' : 'lesson.yourTurn'), { line: round ? 't.lesson.oneMore' : 't.lesson.yourTurn' });
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
    who.append(el('span', 'arc-dialog__face arc-portrait', null, { 'aria-hidden': 'true', 'data-who': 'guide', 'data-copy': '1' }), el('strong', null, name), el('span', null, d.npc.role));
    if (d.npc.portrayal === 'portrayal') who.append(el('span', 'arc-dialog__tag', tr('lesson.portrayal')));
    const line = el('p', 'arc-dialog__line', '', { 'aria-live': 'polite' });
    const opts = el('div', 'arc-dialog__opts');
    box.append(who, line, opts);
    this.main.append(box);
    this.hush();
    const at = `l.${this.lesson.id}.dialogue`;
    const guideChar = `guide-${this.lesson.id}`;
    const speak = async (text, id = null) => {
      line.textContent = '';
      guide.talk(Math.min(5, 0.6 + text.length * 0.035));
      this.speak(id ?? text, { char: guideChar, face: guide, bubble: box });
      if (this.game.reducedMotion) line.textContent = text;
      else for (let i = 0; i <= text.length; i += 2) {
        line.textContent = text.slice(0, i);
        await wait(14);
        if (!this.root.isConnected) throw LEFT;
      }
      line.textContent = text;
    };
    await speak(d.intro, `${at}.intro`);
    const asked = new Set();
    this.ctx = { step: tr('lesson.ctxTalking', { name }), hint: tr('lesson.chatHint') };
    while (asked.size < d.topics.length) {
      opts.replaceChildren();
      const bs = d.topics.map((t, i) => button(`arc-dialog__opt${asked.has(i) ? ' is-asked' : ''}`, `${asked.has(i) ? '✔ ' : '💬 '}${t.ask}`, null));
      opts.append(...bs);
      bs.find((b, i) => !asked.has(i))?.focus();
      const i = await this.until(...bs);
      asked.add(i);
      this.game.sound.tap();
      await speak(d.topics[i].answer, `${at}.topics.${i}.answer`);
      guide[i % 2 ? 'wave' : 'hop']();
    }
    // The guide's own question.
    const c = d.challenge;
    await speak(tr('lesson.guideAsks', { q: c.q }), `${at}.challenge`);
    const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    opts.replaceChildren();
    const next = button('arc-btn arc-btn--primary', tr('lesson.thanks'), null, { hidden: true });
    opts.append(this.choices({ ...c, hint: c.hint ?? tr('lesson.thinkHint') }, fb, () => (next.hidden = false), { practice: true }), fb, next);
    await this.until(next);
    await speak(d.farewell, `${at}.farewell`);
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
    card.append(el('p', 'arc-card__kicker', tr('lesson.tlKicker')), el('h2', null, t.title), el('p', 'arc-hint', tr('lesson.tlHow')));
    const slotsEl = el('ol', 'arc-tl__slots');
    const trayEl = el('div', 'arc-tl__tray');
    const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    const check = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.tlCheck'), null);
    card.append(slotsEl, trayEl, check, fb);
    this.main.append(card);
    this.say(tr('lesson.tlSay'), { who: this.teacher.emoji, line: 't.lesson.tlSay' });
    this.ctx = { step: tr('lesson.ctxTimeline', { title: t.title }), hint: tr('lesson.tlHint'), worked: right.map((e) => `${e.when}: ${e.label}`).join(' → ') };
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
        }, { 'aria-label': e ? tr('lesson.tlSpot', { n: i + 1, label: e.label }) : tr('lesson.tlEmpty', { n: i + 1 }) });
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
        fb.textContent = tr('lesson.tlFill');
        continue;
      }
      const wrong = placed.filter((e, i) => e !== right[i]);
      if (!wrong.length) {
        placed.forEach((e) => okSet.add(e));
        draw();
        const years = el('div', 'arc-tl__years');
        right.forEach((e) => years.append(el('span', null, e.when)));
        card.insertBefore(years, trayEl);
        this.good(check, fb, tr('lesson.tlPerfect'));
        check.hidden = true;
        const next = button('arc-btn arc-btn--primary', tr('lesson.next'), null);
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
      this.oops(check, fb, tr('lesson.tlWrong', { count: wrong.length }));
      draw();
    }
  }

  async artifactStep() {
    this.clear();
    const a = this.lesson.artifact;
    this.room.setArtifact(a.model);
    this.shot('artifact');
    const card = el('section', 'arc-card arc-artifact');
    card.append(el('p', 'arc-card__kicker', tr('lesson.treasure')), el('h2', null, a.name), el('p', 'arc-read__text', a.text));
    const row = el('div', 'arc-row');
    row.append(button('arc-btn', tr('lesson.turnLeft'), () => this.room.spinBy(-0.6)), button('arc-btn', tr('lesson.turnRight'), () => this.room.spinBy(0.6)));
    const next = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.toChallengeBig'), null);
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
    this.say(tr('lesson.lookFound', { name: a.name }), { who: this.teacher.emoji, line: `t.lesson.lookFound~${this.lesson.id}` });
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
    const canvas = el('canvas', 'arc-sim', null, { role: 'img', 'aria-label': tr('lesson.simAria') });
    const controls = el('div', 'arc-sim__controls');
    const panel = el('div', 'arc-card arc-predict');
    wrap.append(canvas, panel);
    this.main.append(wrap);
    this.sim = createSim(s.id, s.setup ?? {}, { canvas, controls, sound: this.game.sound });
    // 1. Guess.
    panel.append(el('p', 'arc-card__kicker', tr('lesson.guessFirst')), el('h2', 'arc-q', s.predict.q));
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
    this.say(tr('lesson.guessSay'), { line: 't.lesson.guessSay' });
    this.speak(`l.${this.lesson.id}.sim.predict.q`, { bubble: panel, queue: true });
    this.ctx = { step: tr('lesson.ctxPredict', { q: s.predict.q }), hint: tr('lesson.predictHint'), worked: s.predict.explain };
    await this.until(...bs);
    this.game.sound.tap();
    // 2. Watch.
    fb.textContent = tr('lesson.testIt');
    this.say(tr('lesson.testSay'), { line: 't.lesson.testSay' });
    await this.sim.watch();
    if (!this.root.isConnected) throw LEFT;
    const ok = guess === s.predict.answer;
    fb.textContent = tr(ok ? 'lesson.guessRight' : 'lesson.guessSurprise', { explain: s.predict.explain });
    bs[s.predict.answer].classList.add('is-right');
    if (ok) {
      this.game.sound.right();
      this.buddy.cheer(1.4);
    } else this.buddy.sad(1);
    this.teacherReact(ok);
    this.say(tr(ok ? 'lesson.guessRightSay' : 'lesson.guessSurpriseSay', { explain: s.predict.explain }), { line: `t.lesson.${ok ? 'guessRightSay' : 'guessSurpriseSay'}~${this.lesson.id}` });
    // 3. Play.
    this.steps(this.quest.steps, 3);
    const play = button('arc-btn arc-btn--primary', tr('lesson.tryIt'), null);
    panel.append(play);
    await this.until(play);
    panel.replaceChildren(el('p', 'arc-card__kicker', tr('lesson.yourExperiment')), el('p', 'arc-hint', tr('lesson.changeThings')), controls);
    const done = button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.toChallengeBig'), null);
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
          this.oops(bs[i], fb, tr('lesson.answerIs', { answer: q.choices[q.answer], explain: q.explain }));
          done();
        } else this.oops(bs[i], fb, tr('lesson.hintIs', { hint: q.hint }));
      }
    }));
    box.append(...bs);
    return box;
  }

  good(from, fb, text) {
    fb.className = 'arc-feedback is-good';
    const k = Math.floor(Math.random() * PRAISES);
    fb.textContent = `🎉 ${tr(`lesson.praise.${k}`)} ${text ?? ''}`;
    this.react(`t.lesson.praise.${k}`, this.comboN >= 3 ? 't.voice.buddy.wow' : 't.voice.buddy.great');
    this.game.sound.right();
    sparkle(from);
    this.buddy.cheer(1.4);
    this.teacherReact(true);
  }
  /** The teacher (or the history guide) reacts too: a happy hop when right, a thoughtful, encouraging look when not. */
  teacherReact(right) {
    const who = this.room.guide ?? this.room.teacher ?? this.room.tock;
    if (!who) return;
    if (right) {
      who.react(true);
      if (Math.random() < 0.4) who.cheer(1.2);
    } else {
      who.surprise(0.5);
      setTimeout(() => who.think(1.6), 450);
    }
  }
  oops(from, fb, text) {
    fb.className = 'arc-feedback is-oops';
    fb.textContent = text;
    this.react('t.voice.teacher.tryAgain', 't.voice.buddy.tryAgain');
    this.game.sound.wrong();
    from?.classList.remove('is-shake');
    void from?.offsetWidth;
    from?.classList.add('is-shake');
    this.buddy.sad(1.1);
    this.teacherReact(false);
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
      this.ctx = { step: tr('lesson.ctxChallenge', { q: q.q, choices: q.choices.join(' / ') }), hint: q.hint, worked: q.explain };
      const card = el('section', 'arc-card arc-quiz');
      const dots = el('div', 'arc-dots', null, { 'aria-label': tr('lesson.questionOf', { n: i + 1, total: qs.length }) });
      qs.forEach((_, k) => dots.append(el('i', k < i ? 'is-done' : k === i ? 'is-on' : '')));
      card.append(dots, el('p', 'arc-card__kicker', tr('lesson.challengeOf', { n: i + 1, total: qs.length })), el('h2', 'arc-q', q.q));
      const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
      const next = button('arc-btn arc-btn--primary arc-btn--big', tr(i === qs.length - 1 ? 'lesson.finish' : 'lesson.next'), null, { hidden: true });
      const help = el('div', 'arc-row arc-quiz__help');
      const hintBtn = button('arc-btn arc-btn--ghost', tr('lesson.hint'), () => {
        fb.className = 'arc-feedback';
        fb.textContent = `💡 ${q.hint}`;
        this.react('t.voice.teacher.hint', 't.voice.buddy.hint');
        if (q.line) this.speak(`${q.line}.hint`, { bubble: fb, queue: true });
      });
      const how = button('arc-btn arc-btn--ghost', tr('lesson.showHow'), () => {
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
      this.speak(q.line ? `${q.line}.q` : q.q, { bubble: card });
      await this.until(next);
    }
    this.combo.hidden = true;
  }

  /** A small chalkboard with the worked answer of a generated question. */
  miniBoard(card, steps) {
    if (card.querySelector('.arc-miniboard')) return;
    const c = el('canvas', 'arc-board arc-miniboard', null, { role: 'img', 'aria-label': tr('lesson.miniBoardAria') });
    card.append(c);
    this.board = new Chalkboard(c, { sound: this.game.sound, reducedMotion: this.game.reducedMotion });
    this.board.play(steps);
  }

  drawCombo() {
    const n = this.comboN;
    this.combo.replaceChildren(el('span', 'arc-combo__flame', n >= 5 ? '☄️' : n >= 3 ? '🔥' : '✨', { 'aria-hidden': 'true' }), el('strong', null, tr('lesson.combo', { n })), el('i', 'arc-combo__bar'));
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
    const f = el('div', 'arc-coinpop', tr('lesson.coins', { n: got.coins }), { 'aria-hidden': 'true' });
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
    const row = el('div', 'arc-results__stars', null, { 'aria-label': tr('lesson.starsAria', { n: stars }) });
    for (let i = 0; i < 3; i++) row.append(el('span', `arc-bigstar${i < stars ? ' is-on' : ''}`, '★'));
    card.append(el('p', 'arc-card__kicker', tr('lesson.complete')), el('h2', null, tr(stars === 3 ? 'lesson.perfect' : stars === 2 ? 'lesson.great' : 'lesson.didIt')), row, el('p', 'arc-results__score', tr('lesson.firstTry', { score: this.score, total: quizLength(l) })), rewardsLine(got));
    const lv = levelOf(this.game.gs.s.xp);
    const xp = el('div', 'arc-xp', null, { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(lv.need), 'aria-valuenow': String(lv.into), 'aria-label': tr('lesson.level', { n: lv.level }) });
    xp.append(el('span', null, tr('lesson.level', { n: lv.level })), el('i', null));
    xp.querySelector('i').style.setProperty('--k', String(lv.into / lv.need));
    card.append(xp);
    const next = this.nextLesson();
    const btns = el('div', 'arc-row');
    btns.append(button('arc-btn', tr('lesson.playAgain'), () => this.run(l)));
    if (next) btns.append(button('arc-btn arc-btn--primary arc-btn--big', tr('lesson.nextQuest'), () => this.run(next)));
    btns.append(button('arc-btn', tr(this.back[0]), () => this.leave()));
    card.append(btns);
    this.main.append(card);
    const sayKey = stars === 3 ? 'lesson.say3' : stars === 2 ? 'lesson.say2' : 'lesson.say1';
    this.say(tr(sayKey), { line: `t.${sayKey}` });
    this.bark('t.voice.buddy.end');
    this.buddy.cheer(2.5);
    this.game.celebrate ? this.game.celebrate('level-up') : this.game.sound.fanfare();
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
      b.append(el('strong', null, tr('lesson.levelUp', { n: got.levelUp })), el('span', null, tr('lesson.stronger')));
      card.prepend(b);
      // With the music on, the results' Level Up stinger already sings it.
      if (!this.game.music?.audible) setTimeout(() => this.game.sound.fanfare(), 1500);
      this.bark('t.voice.buddy.levelUp');
    }
    if (got.stickers?.length) {
      if (this.game.music?.audible) setTimeout(() => this.game.celebrate?.('discovery'), got.levelUp ? 3000 : 2000);
      const s = el('div', 'arc-stickers-new');
      s.append(el('span', null, tr('lesson.newSticker')));
      for (const st of got.stickers) s.append(el('span', 'arc-sticker', st.emoji, { title: st.name, 'aria-label': tr('lesson.stickerAria', { name: st.name }) }));
      card.append(s);
      this.bark('t.voice.buddy.sticker');
    }
  }

  nextLesson() {
    const list = lessonsOn(this.floor, this.subject, this.realm);
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
/** How many praise words there are (lesson.praise.0 …). */
const PRAISES = 8;
const ARCADE_NAMES = { math: (f) => tr(f <= 2 ? 'lesson.arcade.mathSmall' : 'lesson.arcade.math'), physics: () => tr('lesson.arcade.physics'), history: () => tr('lesson.arcade.history') };
function quizLength(l) {
  return Array.isArray(l.quiz) ? l.quiz.length : l.quiz.count;
}
function rewardsLine(got) {
  const p = el('p', 'arc-rewards');
  if (got.coins) p.append(el('span', 'arc-rewards__coins', tr('lesson.coins', { n: got.coins })));
  if (got.xp) p.append(el('span', 'arc-rewards__xp', tr('lesson.xp', { n: got.xp })));
  return p;
}
export { lessonById };
