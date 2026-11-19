/**
 * Pick your buddy (the first time) and dress them up (any time): five
 * critters, eight colours, and hats bought with coins. The world behind
 * shows the buddy up close, changing as you choose.
 */
import { el, button, sparkle } from './dom.js';
import { BUDDIES, BUDDY_COLORS, HATS } from '../world/figures.js';

export function openBuddy(game, { first = false } = {}) {
  return new Promise((resolve) => {
    const gs = game.gs;
    const pick = { ...(gs.buddy ?? { species: 'fox', color: BUDDY_COLORS[0], hat: 'party' }) };
    game.world.closeUp();
    const box = el('div', 'arc-side', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': first ? 'Choose your buddy' : 'Your buddy' });
    const card = el('div', 'arc-side__card');
    card.append(el('h2', null, first ? '👋 Choose your buddy!' : '🎒 Your buddy'), el('p', 'arc-side__sub', first ? 'They will climb the mountain with you.' : `Level ${gs.level.level} · 🪙 ${gs.s.coins} coins`));
    const show = () => game.world.setBuddy({ ...pick });
    const section = (title) => {
      const s = el('div', 'arc-side__sec');
      s.append(el('h3', null, title));
      card.append(s);
      return s;
    };
    const kinds = el('div', 'arc-pickgrid');
    for (const b of BUDDIES) {
      const btn = button(`arc-pick${pick.species === b.id ? ' is-on' : ''}`, null, () => {
        pick.species = b.id;
        for (const x of kinds.children) x.classList.toggle('is-on', x === btn);
        game.sound.tap();
        show();
      }, { 'aria-pressed': String(pick.species === b.id) });
      btn.append(el('span', 'arc-pick__emoji', b.emoji, { 'aria-hidden': 'true' }), el('span', null, b.name));
      kinds.append(btn);
    }
    section('Who are you?').append(kinds);
    const colors = el('div', 'arc-swatches', null, { role: 'radiogroup', 'aria-label': 'Colour' });
    for (const c of BUDDY_COLORS) {
      const btn = button(`arc-swatch${pick.color === c ? ' is-on' : ''}`, '', () => {
        pick.color = c;
        for (const x of colors.children) x.classList.toggle('is-on', x === btn);
        game.sound.tap();
        show();
      }, { role: 'radio', 'aria-checked': String(pick.color === c), 'aria-label': `Colour ${c}` });
      btn.style.background = c;
      colors.append(btn);
    }
    section('Colour').append(colors);
    const hats = el('div', 'arc-pickgrid arc-pickgrid--hats');
    const coins = () => card.querySelector('.arc-side__sub');
    const drawHats = () => {
      hats.replaceChildren();
      for (const h of HATS) {
        const owned = gs.s.hats.includes(h.id);
        const btn = button(`arc-pick${pick.hat === h.id ? ' is-on' : ''}${owned ? '' : ' is-shop'}`, null, () => {
          if (!owned) {
            if (!gs.buyHat(h.id)) {
              btn.classList.add('is-shake');
              game.hud?.toast(`You need ${h.cost - gs.s.coins} more coins for the ${h.name}. Finish quests to earn coins!`, { icon: '🪙' });
              return;
            }
            game.sound.star(2);
            sparkle(btn);
            coins().textContent = `Level ${gs.level.level} · 🪙 ${gs.s.coins} coins`;
            game.refreshGame();
          }
          pick.hat = h.id;
          drawHats();
          show();
        });
        btn.append(el('span', 'arc-pick__emoji', h.emoji, { 'aria-hidden': 'true' }), el('span', null, h.name), owned ? '' : el('span', 'arc-pick__cost', `🪙 ${h.cost}`));
        hats.append(btn);
      }
    };
    drawHats();
    section('Hats').append(hats);
    const done = button('arc-btn arc-btn--primary arc-btn--big', first ? 'Let’s go! ▶' : 'Done ✔', () => {
      gs.setBuddy(pick);
      game.world.setBuddy({ ...gs.buddy });
      game.world.kid.cheer(1.5);
      game.sound.fanfare();
      box.remove();
      game.world.home();
      game.refreshGame();
      resolve(pick);
    });
    card.append(done);
    box.append(card);
    game.root.append(box);
    show();
    done.focus();
  });
}
