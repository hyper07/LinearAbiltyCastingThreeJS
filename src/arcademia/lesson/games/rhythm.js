/**
 * Rhythm time (the Sky Castle's music game), with the castle's bells and a hand drum made on the
 * spot by the game's synth (sound.js: no audio files). Each round is one of:
 *
 *   echo   listen to a rhythm, then tap it back on the drum (mouse, touch, Space or Enter); taps
 *          count when they land within a friendly window of each note (content/games.js judgeEcho)
 *   notes  a 4-beat bar with a gap: which note fills it — whole, half, quarter or eighth? Note
 *          lengths are fractions of a whole note (½, ¼, ⅛)
 *   match  a bell rings: which coloured (or lettered) bell was it? — colours, letters or shapes
 *          matched to sounds, for art and languages too
 *
 * Never a fail: a miss shows what was heard, a hint after the first, the answer after the second,
 * and after three echo tries the game moves on with a "good try".
 *
 * Data (content/games.js rhythmProblems): rhythm { q, tempo, rounds: [{ mode: 'echo' | 'notes' | 'match', … }] }
 */
import { el, button } from '../../ui/dom.js';
import { t as tr, num } from '../../i18n/index.js';
import { judgeEcho, barGap, noteFreq, NOTE_NAMES, fractionOf, hashOf, matchOrder } from '../../content/games.js';
import { gameCard, note, scorer, finish, shake, flash, rowKeys, dots, gate, wait, alive } from './kit.js';

const SCALE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
const BELL_COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
const FRACTION = { '1': '1', '1/2': '½', '1/4': '¼', '1/8': '⅛' };

export async function playRhythm(r) {
  const data = r.lesson.rhythm;
  const award = scorer(r);
  const { card, body, fb } = gameCard(r, 'rhythm', { kicker: tr('act.rhythm.kicker'), title: data.q });
  r.say(tr('act.rhythm.say'), { line: 't.act.rhythm.say' });
  const beat = 60000 / data.tempo;
  for (let i = 0; i < data.rounds.length; i++) {
    const round = data.rounds[i];
    body.replaceChildren(dots(i, data.rounds.length, tr('act.rhythm.roundOf', { n: i + 1, total: data.rounds.length })));
    note(fb, '');
    const box = el('div', `arc-rhythm arc-rhythm--${round.mode}`);
    body.append(box);
    if (round.mode === 'echo') await echo(r, round, box, fb, beat, award);
    else if (round.mode === 'notes') await notes(r, round, box, fb, beat, award);
    else await match(r, round, box, fb, award, hashOf(`${r.lesson.id}:${i}`));
    if (!alive(r)) return;
    await wait(r.game.reducedMotion ? 300 : 900);
    if (!alive(r)) return;
  }
  note(fb, tr('act.rhythm.done'), 'good');
  r.buddy.cheer(2);
  await finish(r, card);
}

/** Play a pattern: bells (or the drum) on each note, `onNote(i, at)` as each sounds. → its length in ms. */
function playPattern(r, pattern, beat, { sound = 'bell', onNote = null } = {}) {
  let t = 0;
  pattern.forEach((v, i) => {
    if (v > 0) {
      const at = t;
      if (sound === 'drum') r.game.sound.drum(at / 1000, i === 0);
      else r.game.sound.bell(noteFreq(SCALE[i % SCALE.length]), at / 1000, { length: Math.min(1.4, (v * beat) / 1000 + 0.3) });
      if (onNote) setTimeout(() => alive(r) && onNote(i), at);
    }
    t += Math.abs(v) * beat;
  });
  return t;
}

/** A note (or a rest) drawn: whole, half, quarter, eighth. */
export function noteSvg(len) {
  const rest = len < 0, l = Math.abs(len);
  const SVG = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 40 64');
  s.setAttribute('class', 'arc-note__svg');
  s.setAttribute('aria-hidden', 'true');
  const add = (tag, a) => {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
    s.append(e);
  };
  if (rest) {
    if (l >= 2) add('rect', { x: 10, y: l === 4 ? 24 : 30, width: 20, height: 8, rx: 1.5, fill: 'currentColor' });
    else if (l === 1) add('path', { d: 'M17 12 L25 22 L16 32 L25 42 Q14 40 18 52', fill: 'none', stroke: 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    else {
      add('circle', { cx: 16, cy: 24, r: 4, fill: 'currentColor' });
      add('path', { d: 'M16 26 Q24 28 27 20 L18 50', fill: 'none', stroke: 'currentColor', 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    }
    return s;
  }
  const hollow = l >= 2;
  add('ellipse', { cx: 17, cy: 50, rx: 10, ry: 7, transform: 'rotate(-20 17 50)', fill: hollow ? 'none' : 'currentColor', stroke: 'currentColor', 'stroke-width': hollow ? 4 : 0 });
  if (l <= 2) add('line', { x1: 26, y1: 48, x2: 26, y2: 6, stroke: 'currentColor', 'stroke-width': 3.5, 'stroke-linecap': 'round' });
  if (l === 0.5) add('path', { d: 'M26 6 Q30 18 38 22 Q34 26 30 32', fill: 'none', stroke: 'currentColor', 'stroke-width': 3.5, 'stroke-linecap': 'round' });
  return s;
}
const noteName = (len) => tr(`act.rhythm.note.${NOTE_NAMES[Math.abs(len)]}`);
const noteTile = (len, cls = '') => {
  const t = el('span', `arc-note${len < 0 ? ' is-rest' : ''} ${cls}`, null, { 'data-len': String(Math.abs(len)), title: len < 0 ? tr('act.rhythm.rest') : noteName(len) });
  t.style.setProperty('--len', String(Math.abs(len)));
  t.append(noteSvg(len));
  return t;
};

/* ---------------------------------------------------------------- echo: listen, then tap it back */

async function echo(r, round, box, fb, beat, award) {
  const sound = round.sound ?? 'drum';
  const pattern = round.pattern;
  const notesN = pattern.filter((v) => v > 0).length;
  r.ctx = { step: tr('act.rhythm.ctxEcho'), hint: tr('act.rhythm.echoHow'), worked: pattern.map((v) => (v > 0 ? noteName(v) : tr('act.rhythm.rest'))).join(', ') };
  box.append(el('h3', 'arc-game__sub', `👂 ${tr('act.rhythm.echoHow')}`));
  const row = el('div', 'arc-rhythm__row', null, { role: 'img', 'aria-label': tr('act.rhythm.patternAria', { notes: pattern.map((v) => (v > 0 ? noteName(v) : tr('act.rhythm.rest'))).join(', ') }) });
  const tiles = pattern.map((v) => noteTile(v));
  row.append(...tiles);
  const noteTiles = tiles.filter((_, i) => pattern[i] > 0);
  const listen = button('arc-btn arc-rhythm__listen', tr('act.rhythm.listen'), null);
  const pad = el('button', `arc-rhythm__pad arc-rhythm__pad--${sound}`, null, { type: 'button', 'aria-label': tr('act.rhythm.padAria'), disabled: true });
  pad.append(el('span', 'arc-rhythm__padIcon', sound === 'drum' ? '🥁' : '🔔', { 'aria-hidden': 'true' }), el('span', 'arc-rhythm__padText', tr('act.rhythm.pad')));
  const ctrl = el('div', 'arc-rhythm__ctrl');
  ctrl.append(listen, pad);
  box.append(row, ctrl);

  let taps = [], tries = 0, playing = false, judging = null;
  const light = (i, cls = 'is-lit') => flash(tiles[i], cls, Math.min(600, beat * 0.8));
  const play = () => {
    if (playing) return;
    playing = true;
    pad.disabled = true;
    taps = [];
    tiles.forEach((x) => x.classList.remove('is-hit', 'is-miss'));
    const ms = playPattern(r, pattern, beat, { sound, onNote: (i) => light(i) });
    setTimeout(() => {
      if (!alive(r)) return;
      playing = false;
      pad.disabled = false;
      note(fb, tr('act.rhythm.go'));
      pad.focus({ preventScroll: true });
    }, ms + 200);
  };
  listen.addEventListener('click', play);
  const done = gate(r);
  const hit = () => {
    if (pad.disabled) return;
    const now = performance.now();
    taps.push(now);
    if (sound === 'drum') r.game.sound.drum(0, taps.length === 1);
    else r.game.sound.bell(noteFreq(SCALE[Math.min(taps.length - 1, SCALE.length - 1)]));
    flash(pad, 'is-hit', 160);
    const k = taps.length - 1;
    if (noteTiles[k]) flash(noteTiles[k], 'is-lit', 300);
    clearTimeout(judging);
    // Judge when every note has a tap, or when the taps stop.
    judging = setTimeout(judge, taps.length >= notesN ? Math.min(600, beat * 0.9) : beat * 2.6);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    hit();
  });
  pad.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) hit();
  });
  function judge() {
    if (!alive(r) || !taps.length) return;
    const res = judgeEcho(pattern, 60000 / beat, taps, round.tolerance ?? 0.35);
    pad.disabled = true;
    tries++;
    noteTiles.forEach((x, i) => x.classList.add(res.hits[i] ? 'is-hit' : 'is-miss'));
    if (res.ok) {
      if (tries === 1) award();
      r.good(row, fb, tr('act.rhythm.good'));
      return done.open();
    }
    if (tries >= 3) {
      note(fb, tr('act.rhythm.onward'), 'good');
      r.buddy.cheer(0.8);
      return done.open();
    }
    const got = res.hits.filter(Boolean).length;
    r.oops(row, fb, tr(taps.length < notesN ? 'act.rhythm.fewer' : taps.length > notesN + 1 ? 'act.rhythm.more' : 'act.rhythm.close', { got, total: notesN }));
    listen.focus({ preventScroll: true });
  }
  listen.focus({ preventScroll: true });
  note(fb, tr('act.rhythm.listenFirst'));
  await done.wait;
}

/* ---------------------------------------------------------------- notes: which note fills the bar? */

async function notes(r, round, box, fb, beat, award) {
  const gap = barGap(round.pattern);
  r.ctx = { step: tr('act.rhythm.ctxNotes', { q: round.q }), hint: round.hint, worked: round.explain };
  box.append(el('h3', 'arc-game__sub', round.q), el('p', 'arc-hint', tr('act.rhythm.notesHow')));
  const bar = el('div', 'arc-rhythm__bar', null, { role: 'img', 'aria-label': tr('act.rhythm.barAria', { notes: round.pattern.map((v) => (v === 0 ? tr('act.rhythm.gap') : v > 0 ? noteName(v) : tr('act.rhythm.rest'))).join(', ') }) });
  const tiles = round.pattern.map((v) => (v === 0 ? el('span', 'arc-note arc-note--gap', '?', { title: tr('act.rhythm.gap') }) : noteTile(v)));
  tiles.forEach((t, i) => t.style.setProperty('--len', String(round.pattern[i] === 0 ? gap : Math.abs(round.pattern[i]))));
  bar.append(...tiles);
  const counter = el('div', 'arc-rhythm__beats', null, { 'aria-hidden': 'true' });
  for (let b = 1; b <= 4; b++) counter.append(el('span', null, num(b)));
  const full = () => round.pattern.map((v) => (v === 0 ? gap : v));
  const play = button('arc-btn arc-rhythm__listen', tr('act.rhythm.play'), () => {
    const p = solvedYet ? full() : round.pattern.map((v) => (v === 0 ? -gap : v));
    playPattern(r, p, beat, { onNote: (i) => flash(tiles[i], 'is-lit', 400) });
  });
  const choices = el('div', 'arc-choices arc-rhythm__choices');
  const pfb = fb;
  let misses = 0, solvedYet = false;
  const done = gate(r);
  const bs = round.choices.map((len) => {
    const b = button('arc-choice arc-rhythm__choice', null, () => pick(len, b), { 'aria-label': tr('act.rhythm.choiceAria', { name: noteName(len), frac: fractionOf(len), count: len }) });
    b.append(noteSvg(len), el('span', 'arc-rhythm__cname', noteName(len)), el('span', 'arc-rhythm__frac', FRACTION[fractionOf(len)] ?? fractionOf(len)));
    choices.append(b);
    return b;
  });
  rowKeys(bs);
  box.append(bar, counter, play, choices);
  bs[0].focus({ preventScroll: true });
  function pick(len, b) {
    if (solvedYet) return;
    if (len === gap) {
      solvedYet = true;
      bs.forEach((x) => (x.disabled = true));
      b.classList.add('is-right');
      const k = round.pattern.indexOf(0);
      tiles[k].replaceWith((tiles[k] = noteTile(gap, 'is-filled')));
      tiles[k].style.setProperty('--len', String(gap));
      if (!misses) award();
      r.good(b, pfb, round.explain);
      playPattern(r, full(), beat, { onNote: (i) => flash(tiles[i], 'is-lit', 400) });
      return setTimeout(() => done.open(), r.game.reducedMotion ? 300 : (4 * beat) + 400);
    }
    misses++;
    b.disabled = true;
    b.classList.add('is-wrong');
    if (misses >= 2 || bs.filter((x) => !x.disabled).length <= 1) {
      solvedYet = true;
      bs.forEach((x) => (x.disabled = true));
      bs[round.choices.indexOf(gap)].classList.add('is-right');
      r.oops(b, pfb, tr('act.rhythm.answerIs', { name: noteName(gap), explain: round.explain }));
      setTimeout(() => done.open(), 1600);
    } else r.oops(b, pfb, tr('lesson.hintIs', { hint: round.hint }));
  }
  await done.wait;
}

/* ---------------------------------------------------------------- match: which bell rang? */

async function match(r, round, box, fb, award, seed) {
  const pairs = round.pairs;
  const turns = round.turns ?? 3;
  r.ctx = { step: tr('act.rhythm.ctxMatch', { q: round.q }), hint: tr('act.rhythm.matchHow') };
  box.append(el('h3', 'arc-game__sub', round.q), el('p', 'arc-hint', tr('act.rhythm.matchHow')));
  const bells = el('div', 'arc-rhythm__bells', null, { role: 'group', 'aria-label': tr('act.rhythm.bellsAria') });
  const bs = pairs.map((p, i) => {
    const b = button('arc-rhythm__bell', null, () => tapBell(i), { 'aria-label': p.label });
    b.style.setProperty('--bell', p.color ?? BELL_COLORS[i % BELL_COLORS.length]);
    b.append(el('span', 'arc-rhythm__bellIcon', p.emoji ?? '🔔', { 'aria-hidden': 'true' }), el('strong', null, p.label));
    bells.append(b);
    return b;
  });
  rowKeys(bs);
  const turnEl = el('p', 'arc-rhythm__turn', '', { 'aria-live': 'polite' });
  const ring = button('arc-btn arc-rhythm__listen', tr('act.rhythm.ring'), () => ringIt());
  const all = button('arc-btn arc-btn--ghost', tr('act.rhythm.hearAll'), () => hearAll());
  const ctrl = el('div', 'arc-row');
  ctrl.append(all, ring);
  box.append(turnEl, bells, ctrl);

  const ringBell = (i, delay = 0) => {
    r.game.sound.bell(noteFreq(pairs[i].note), delay);
    setTimeout(() => alive(r) && flash(bs[i], 'is-ring', 600), delay * 1000);
  };
  let busy = false;
  const hearAll = async () => {
    busy = true;
    pairs.forEach((_, i) => ringBell(i, i * 0.7));
    await wait(pairs.length * 700 + 200);
    busy = false;
  };
  const order = matchOrder(pairs.length, turns, seed);
  let turn = 0, misses = 0, step = null;
  const ringIt = () => turn < turns && r.game.sound.bell(noteFreq(pairs[order[turn]].note));
  function tapBell(i) {
    if (busy || turn >= turns) return;
    const want = order[turn];
    if (i === want) {
      ringBell(i);
      if (!misses) award();
      r.good(bs[i], fb, tr('act.rhythm.matchYes', { label: pairs[i].label }));
      busy = true;
      return step?.open();
    }
    misses++;
    ringBell(i);
    shake(bs[i]);
    if (misses >= 2) bs[want].classList.add('is-hint');
    r.oops(null, fb, tr('act.rhythm.notThat', { label: pairs[i].label }));
    setTimeout(() => alive(r) && ringIt(), 900);
  }
  await hearAll();
  if (!alive(r)) return;
  for (; turn < turns; ) {
    misses = 0;
    bs.forEach((b) => b.classList.remove('is-hint'));
    turnEl.textContent = tr('act.rhythm.turnOf', { n: turn + 1, total: turns });
    note(fb, tr('act.rhythm.whichOne'));
    busy = false;
    step = gate(r);
    const k = turn;
    setTimeout(() => alive(r) && turn === k && ringIt(), 400);
    bs[0].focus({ preventScroll: true });
    await step.wait;
    turn++;
    await wait(r.game.reducedMotion ? 300 : 1000);
    if (!alive(r)) return;
  }
}
