/** Today's quests (claim coins), the streak flame and the sticker book. */
import { el, button, sparkle } from './dom.js';
import { STICKERS } from '../gamestate.js';

export function openQuestbook(game) {
  const gs = game.gs;
  const box = el('div', 'arc-modal', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quests and stickers' });
  const card = el('div', 'arc-modal__card arc-book');
  const close = () => box.remove();
  card.append(button('arc-boss__x', '✕', close, { 'aria-label': 'Close' }), el('h2', null, '📋 Today’s quests'));
  const streak = gs.streak;
  card.append(el('p', 'arc-book__streak', streak ? `🔥 ${streak} day${streak > 1 ? 's' : ''} in a row! Finish a lesson today to keep the flame going.` : '🔥 Finish a lesson today to light your streak flame!'));
  const list = el('ul', 'arc-book__quests');
  const draw = () => {
    list.replaceChildren();
    for (const q of gs.quests) {
      const li = el('li', q.claimed ? 'is-claimed' : q.have >= q.goal ? 'is-ready' : '');
      const bar = el('i', 'arc-book__bar');
      bar.style.setProperty('--k', String(Math.min(1, q.have / q.goal)));
      li.append(el('span', 'arc-book__icon', q.icon, { 'aria-hidden': 'true' }), el('span', 'arc-book__text', q.text), bar, el('span', 'arc-book__n', `${Math.min(q.have, q.goal)}/${q.goal}`));
      if (q.claimed) li.append(el('span', 'arc-book__done', '✔ 15 🪙'));
      else if (q.have >= q.goal) li.append(button('arc-btn arc-btn--gold', 'Claim 15 🪙', (e) => {
        gs.claim(q.id);
        game.sound.star(3);
        sparkle(e.currentTarget);
        game.refreshGame();
        draw();
      }));
      list.append(li);
    }
  };
  draw();
  card.append(list, el('h2', null, '🌈 Sticker book'));
  const grid = el('div', 'arc-book__stickers');
  for (const s of STICKERS) {
    const got = Boolean(gs.s.stickers[s.id]);
    const b = el('div', `arc-book__sticker${got ? ' is-got' : ''}`, null, { title: s.what });
    b.append(el('span', 'arc-sticker', got ? s.emoji : '❔', { 'aria-hidden': 'true' }), el('strong', null, got ? s.name : '???'), el('span', null, s.what));
    grid.append(b);
  }
  card.append(grid);
  box.append(card);
  box.addEventListener('click', (e) => e.target === box && close());
  box.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  game.root.append(box);
  card.querySelector('button').focus();
}
