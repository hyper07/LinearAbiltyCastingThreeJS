/**
 * The floor's puzzle boss: a grumpy (never scary) critter who only cheers
 * up when you answer their riddles. Six questions from the floor — two each
 * of math, history and physics — and a cheer-up meter; four or more right
 * and the boss is happy for good (a sticker, coins and XP). No fighting:
 * every right answer makes them smile a little more.
 */
import { el, button, sparkle, confetti } from '../ui/dom.js';
import { lessonsOn, quizFor } from '../content/index.js';
import { WORLDS } from '../quests.js';
import { speech } from '../sound.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export function bossQuestions(floor, seed = Date.now()) {
  const out = [];
  for (const subject of ['math', 'history', 'physics']) {
    const pool = lessonsOn(floor, subject).flatMap((l) => quizFor(l, seed).map((q) => ({ ...q, lesson: l.id, subject })));
    out.push(...shuffle(pool).slice(0, 2));
  }
  return shuffle(out);
}

export function bossBattle(game, floor) {
  return new Promise((resolve) => {
    const w = WORLDS[floor].boss;
    const boss = game.world.bosses.find((b) => b.floor === floor);
    game.world.showBoss(floor);
    const qs = bossQuestions(floor);
    const box = el('div', 'arc-boss', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': `Puzzle boss: ${w.name}` });
    const card = el('div', 'arc-card arc-boss__card');
    const meter = el('div', 'arc-boss__meter', null, { role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '6', 'aria-label': 'Cheer-up meter' });
    const body = el('div', 'arc-boss__body');
    const close = button('arc-boss__x', '✕', () => finish(false, true), { 'aria-label': 'Leave the boss' });
    card.append(close, el('p', 'arc-card__kicker', `${w.emoji} Puzzle boss · Floor ${floor}`), el('h2', null, w.name), meter, body);
    box.append(card);
    game.root.append(box);
    let happy = 0, i = 0, done = false;
    const drawMeter = () => {
      meter.replaceChildren(...Array.from({ length: 6 }, (_, k) => el('i', k < happy ? 'is-on' : '', k < happy ? '😊' : '😐')));
      meter.setAttribute('aria-valuenow', String(happy));
    };
    drawMeter();
    const say = (t) => {
      body.replaceChildren(el('p', 'arc-boss__line', `“${t}”`));
      if (game.prefs.voice) speech.say(t);
    };
    const finish = async (won, quit = false) => {
      if (done) return;
      done = true;
      if (quit) {
        box.remove();
        return resolve(null);
      }
      body.replaceChildren();
      if (won) {
        boss.happy = true;
        boss.fig.cheer(3);
        game.sound.fanfare();
        confetti(game.root, 140);
        const got = game.gs.event('boss', { floor });
        body.append(el('p', 'arc-boss__line', `“Hee hee! You did it — I feel SO much better! Thank you, friend!”`), el('p', 'arc-rewards', `+${got.coins} 🪙  +${got.xp} XP`));
        if (got.stickers.length) body.append(el('p', 'arc-rewards', `New sticker: ${got.stickers.map((s) => `${s.emoji} ${s.name}`).join(', ')}`));
      } else {
        boss.fig.sad(2);
        body.append(el('p', 'arc-boss__line', `“Hmph… almost! Come back after a little practice and try again.”`), el('p', 'arc-hint', `${happy} of 6 — you need 4 to cheer me up.`));
      }
      const ok = button('arc-btn arc-btn--primary arc-btn--big', won ? 'Yay! ▶' : 'OK', () => {
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
      body.append(el('p', 'arc-card__kicker', `Riddle ${i} of ${qs.length}`), el('h3', 'arc-q', q.q));
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
          fb.textContent = `The answer was “${q.choices[q.answer]}”. ${q.explain}`;
          game.sound.wrong();
          boss.fig.sad(1);
          game.world.kid.sad(1);
        }
        const next = button('arc-btn arc-btn--primary', 'Next riddle ▶', ask);
        body.append(next);
        next.focus();
      }));
      opts.append(...bs);
      body.append(opts, fb);
      if (game.prefs.voice) speech.say(q.q);
    };
    say(w.line);
    const go = button('arc-btn arc-btn--primary arc-btn--big', '😤 Bring it on!', ask);
    body.append(go);
    go.focus();
  });
}
