/**
 * The floor's puzzle boss: a grumpy (never scary) critter who only cheers
 * up when you answer their riddles. Six questions from the floor — two from
 * each of the world's three subjects (math, history and physics on the
 * mountain; content/subjects.js subjectsOf) — and a cheer-up meter; four or more right
 * and the boss is happy for good (a sticker, coins and XP). No fighting:
 * every right answer makes them smile a little more.
 */
import { el, button, sparkle, confetti } from '../ui/dom.js';
import { lessonsOn, quizFor, teachingRealm } from '../content/index.js';
import { subjectsOf } from '../content/subjects.js';
import { worldsIn } from '../quests.js';
import { speech } from '../sound.js';
import { t as tr } from '../i18n/index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export function bossQuestions(floor, seed = Date.now(), realm = 'land') {
  const out = [];
  for (const subject of subjectsOf(realm)) {
    const pool = lessonsOn(floor, subject, realm).flatMap((l) => quizFor(l, seed).map((q) => ({ ...q, lesson: l.id, subject })));
    out.push(...shuffle(pool).slice(0, 2));
  }
  return shuffle(out);
}

export function bossBattle(game, floor) {
  return new Promise((resolve) => {
    const realm = teachingRealm(game.map?.realm ?? 'land');
    const w = worldsIn(realm)[floor].boss;
    const boss = game.world.bosses.find((b) => b.floor === floor);
    game.world.showBoss(floor);
    const qs = bossQuestions(floor, Date.now(), realm);
    const box = el('div', 'arc-boss', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('puzzle.aria', { name: w.name }) });
    const card = el('div', 'arc-card arc-boss__card');
    const meter = el('div', 'arc-boss__meter', null, { role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '6', 'aria-label': tr('puzzle.meter') });
    const body = el('div', 'arc-boss__body');
    const close = button('arc-boss__x', '✕', () => finish(false, true), { 'aria-label': tr('puzzle.leave') });
    card.append(close, el('p', 'arc-card__kicker', tr('puzzle.kicker', { emoji: w.emoji, floor })), el('h2', null, w.name), meter, body);
    box.append(card);
    game.root.append(box);
    let happy = 0, i = 0, done = false;
    // The boss's own recorded voice (voice/player.js): silent where nobody has recorded the line yet.
    const voiceOn = game.prefs.voice ?? floor <= 2;
    const char = realm === 'land' ? `boss-${floor}` : `${realm}-boss-${floor}`;
    const voice = (line, bubble = null) => voiceOn && speech.say(line, { char, face: boss.fig, bubble });
    speech.preloadFloor(floor);
    const drawMeter = () => {
      meter.replaceChildren(...Array.from({ length: 6 }, (_, k) => el('i', k < happy ? 'is-on' : '', k < happy ? '😊' : '😐')));
      meter.setAttribute('aria-valuenow', String(happy));
    };
    drawMeter();
    const say = (t, line) => {
      const p = el('p', 'arc-boss__line', tr('mg.quote', { line: t }));
      body.replaceChildren(p);
      voice(line, p);
    };
    const finish = async (won, quit = false) => {
      if (done) return;
      done = true;
      if (quit) {
        speech.stop();
        box.remove();
        return resolve(null);
      }
      body.replaceChildren();
      if (won) {
        boss.happy = true;
        boss.fig.cheer(3);
        game.celebrate ? game.celebrate('level-up') : game.sound.fanfare();
        confetti(game.root, 140);
        const got = game.gs.event('boss', { floor });
        const line = el('p', 'arc-boss__line', tr('mg.quote', { line: tr('puzzle.won') }));
        body.append(line, el('p', 'arc-rewards', tr('puzzle.rewards', { coins: got.coins, xp: got.xp })));
        voice('t.puzzle.won', line);
        if (got.stickers.length) body.append(el('p', 'arc-rewards', tr('puzzle.sticker', { list: got.stickers.map((s) => `${s.emoji} ${s.name}`).join(', ') })));
      } else {
        boss.fig.sad(2);
        const line = el('p', 'arc-boss__line', tr('mg.quote', { line: tr('puzzle.lost') }));
        body.append(line, el('p', 'arc-hint', tr('puzzle.score', { n: happy })));
        voice('t.puzzle.lost', line);
      }
      const ok = button('arc-btn arc-btn--primary arc-btn--big', tr(won ? 'puzzle.yay' : 'puzzle.ok'), () => {
        speech.stop();
        box.remove();
        game.world.home();
        resolve(won);
      });
      body.append(ok);
      ok.focus();
      game.refreshGame();
      game.refresh();
    };
    const ask = () => {
      if (i >= qs.length) return finish(happy >= 4);
      const q = qs[i++];
      body.replaceChildren();
      const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
      const qEl = el('h3', 'arc-q', q.q);
      body.append(el('p', 'arc-card__kicker', tr('puzzle.riddleOf', { n: i, total: qs.length })), qEl);
      const opts = el('div', 'arc-choices');
      const bs = q.choices.map((c, k) => button('arc-choice', c, async () => {
        for (const b of bs) b.disabled = true;
        const right = k === q.answer;
        game.progress.answer(q.lesson, right);
        if (right) {
          happy++;
          drawMeter();
          bs[k].classList.add('is-right');
          fb.className = 'arc-feedback is-good';
          fb.textContent = `😊 ${q.explain}`;
          game.sound.right();
          sparkle(meter);
          boss.fig.hop();
          game.world.kid.cheer(1.2);
        } else {
          bs[k].classList.add('is-wrong');
          bs[q.answer].classList.add('is-right');
          fb.className = 'arc-feedback is-oops';
          fb.textContent = tr('puzzle.answerWas', { answer: q.choices[q.answer], explain: q.explain });
          game.sound.wrong();
          boss.fig.sad(1);
          game.world.kid.sad(1);
        }
        const next = button('arc-btn arc-btn--primary', tr('puzzle.nextRiddle'), ask);
        body.append(next);
        next.focus();
      }));
      opts.append(...bs);
      body.append(opts, fb);
      voice(q.line ? `${q.line}.q` : q.q, qEl);
    };
    say(w.line, realm === 'land' ? `t.world.${floor}.line` : `t.${realm}.world.${floor}.line`);
    const go = button('arc-btn arc-btn--primary arc-btn--big', tr('puzzle.go'), ask);
    body.append(go);
    go.focus();
  });
}
