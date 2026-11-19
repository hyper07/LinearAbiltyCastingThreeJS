/**
 * Pick your buddy (the first time) and dress them up (any time): five
 * critters, eight colours, and hats bought with coins. A live 3D turntable
 * shows the buddy, turning slowly; it reacts when tapped and when its colour
 * or hat changes. The cards show each buddy and hat as small 3D pictures.
 */
import { el, button, sparkle } from './dom.js';
import { BUDDIES, BUDDY_COLORS, COLOR_NAMES, HATS } from '../world/figures.js';
import { Turntable } from './turntable.js';
import { t } from '../i18n/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const pictures = new Map();

export function openBuddy(game, { first = false } = {}) {
  return new Promise((resolve) => {
    const gs = game.gs;
    const pick = { ...(gs.buddy ?? { species: 'fox', color: BUDDY_COLORS[0], hat: 'party' }) };
    const box = el('div', 'arc-side arc-side--buddy', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t(first ? 'picker.dialogChoose' : 'picker.dialogYours') });
    const card = el('div', 'arc-side__card');
    const status = () => t('picker.status', { level: gs.level.level, coins: gs.s.coins });
    card.append(el('h2', null, t(first ? 'picker.chooseTitle' : 'picker.yourTitle')), el('p', 'arc-side__sub', first ? t('picker.chooseSub') : status()));
    // The turntable.
    const stage = el('div', 'arc-turntable', null, { role: 'img', 'aria-label': t('picker.dragTurn') });
    const hint = el('span', 'arc-turntable__hint', t('picker.tapMe'), { 'aria-hidden': 'true' });
    stage.append(hint);
    card.append(stage);
    let tt = null;
    try {
      tt = new Turntable(stage, { reducedMotion: game.reducedMotion });
      tt.onTap = () => {
        tt.tickle();
        game.sound.toy?.('squeak');
        hint.classList.add('is-gone');
      };
    } catch {
      stage.remove(); // no WebGL here: the world behind shows the buddy up close instead
      game.world.closeUp();
    }
    const show = () => {
      tt?.set({ ...pick });
      game.world.setBuddy({ ...pick });
    };
    const section = (title) => {
      const s = el('div', 'arc-side__sec');
      s.append(el('h3', null, title));
      card.append(s);
      return s;
    };
    const picture = (key, make, fallback) => {
      const img = el('img', 'arc-pick__img', null, { alt: '', 'aria-hidden': 'true', draggable: 'false' });
      const span = el('span', 'arc-pick__emoji', fallback, { 'aria-hidden': 'true' });
      const wrap = el('span', 'arc-pick__pic');
      wrap.append(span);
      const fill = (src) => {
        if (!src) return;
        img.src = src;
        span.replaceWith(img);
      };
      if (pictures.has(key)) fill(pictures.get(key));
      else if (tt) queue.push(async () => {
        await nextFrame();
        if (!box.isConnected) return;
        const src = make();
        pictures.set(key, src);
        fill(src);
      });
      return wrap;
    };
    const queue = [];
    const kinds = el('div', 'arc-pickgrid');
    const drawKinds = () => {
      kinds.replaceChildren();
      for (const b of BUDDIES) {
        const btn = button(`arc-pick${pick.species === b.id ? ' is-on' : ''}`, null, () => {
          pick.species = b.id;
          for (const x of kinds.children) {
            x.classList.toggle('is-on', x === btn);
            x.setAttribute('aria-pressed', String(x === btn));
          }
          game.sound.tap();
          show();
        }, { 'aria-pressed': String(pick.species === b.id) });
        btn.append(picture(`b|${b.id}|${pick.color}`, () => tt.buddyPicture(b.id, pick.color), b.emoji), el('span', 'arc-pick__name', b.name));
        kinds.append(btn);
      }
    };
    drawKinds();
    section(t('picker.who')).append(kinds);
    const colors = el('div', 'arc-swatches', null, { role: 'radiogroup', 'aria-label': t('picker.colour') });
    BUDDY_COLORS.forEach((c, i) => {
      const btn = button(`arc-swatch${pick.color === c ? ' is-on' : ''}`, '', () => {
        pick.color = c;
        for (const x of colors.children) {
          x.classList.toggle('is-on', x === btn);
          x.setAttribute('aria-checked', String(x === btn));
        }
        game.sound.tap();
        show();
        drawKinds();
        runQueue();
      }, { role: 'radio', 'aria-checked': String(pick.color === c), 'aria-label': t(`color.${COLOR_NAMES[i]}`) });
      btn.style.background = c;
      colors.append(btn);
    });
    section(t('picker.colour')).append(colors);
    const hats = el('div', 'arc-pickgrid arc-pickgrid--hats');
    const coins = () => card.querySelector('.arc-side__sub');
    const drawHats = () => {
      hats.replaceChildren();
      for (const h of HATS) {
        const owned = gs.s.hats.includes(h.id);
        const btn = button(`arc-pick${pick.hat === h.id ? ' is-on' : ''}${owned ? '' : ' is-shop'}`, null, () => {
          if (!owned) {
            if (!gs.buyHat(h.id)) {
              btn.classList.remove('is-shake');
              void btn.offsetWidth;
              btn.classList.add('is-shake');
              tt?.react('think');
              game.hud?.toast(t('picker.needCoins', { n: h.cost - gs.s.coins, hat: h.name }), { icon: '🪙' });
              return;
            }
            game.sound.star(2);
            sparkle(btn);
            coins().textContent = status();
            game.refreshGame();
          }
          pick.hat = h.id;
          game.sound.tap();
          drawHats();
          show();
        }, { 'aria-pressed': String(pick.hat === h.id) });
        btn.append(h.id === 'none' ? el('span', 'arc-pick__pic', null) : picture(`h|${h.id}`, () => tt.hatPicture(h.id), h.emoji), el('span', 'arc-pick__name', h.name), owned ? (h.cost ? el('span', 'arc-pick__own', t('picker.owned')) : '') : el('span', 'arc-pick__cost', `🪙 ${h.cost}`));
        if (h.id === 'none') btn.querySelector('.arc-pick__pic').append(el('span', 'arc-pick__emoji arc-pick__none', '∅', { 'aria-hidden': 'true' }));
        hats.append(btn);
      }
    };
    drawHats();
    section(t('picker.hats')).append(hats);
    const done = button('arc-btn arc-btn--primary arc-btn--big', t(first ? 'picker.go' : 'picker.done'), () => {
      gs.setBuddy(pick);
      game.world.setBuddy({ ...gs.buddy });
      game.world.kid.cheer(1.5);
      game.sound.fanfare();
      tt?.dispose();
      box.remove();
      game.world.home();
      game.refreshGame();
      resolve(pick);
    });
    card.append(done);
    box.append(card);
    game.root.append(box);
    show();
    done.focus({ preventScroll: true });
    card.scrollTop = 0;
    // Card pictures, one a frame, after the panel is up.
    let running = false;
    async function runQueue() {
      if (running) return;
      running = true;
      while (queue.length && box.isConnected) await queue.shift()();
      running = false;
    }
    setTimeout(runQueue, 120);
  });
}
