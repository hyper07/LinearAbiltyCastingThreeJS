/**
 * The diorama's cream-card interface: the title, the floor list on the
 * left, day/night, sound and Parents at the top right, the stars counter,
 * the current-lesson card at the bottom, the round zoom and home buttons,
 * the mountain minimap in the corner, and toasts.
 */
import { el, button, SUBJECT_ICON, SUBJECT_LABEL, sparkle } from './dom.js';
import { FLOORS } from '../floors.js';
import { floorStars, neededOn } from '../rules.js';
import { lessonsOn } from '../content/index.js';
import { t, num, localizeLesson } from '../i18n/index.js';

export class Hud {
  constructor(root, actions, { floors = FLOORS, map = null } = {}) {
    this.actions = actions;
    this.floors = floors;
    this.map = map;
    this.root = el('div', 'arc-hud');
    root.append(this.root);

    // Title.
    const brand = el('div', 'arc-brand');
    brand.append(el('span', 'arc-brand__mark', '🦉', { 'aria-hidden': 'true' }));
    const words = el('div', 'arc-brand__words');
    const h = el('h1', 'arc-brand__title');
    h.append(el('span', 'arc-brand__ai', 'AI '), document.createTextNode('ARCADEMIA'));
    words.append(h);
    this.sub = el('p', 'arc-brand__sub', '');
    words.append(this.sub);
    brand.append(words);
    this.root.append(brand);

    // The player card: buddy, level and XP, coins, streak flame, today's quests.
    this.player = el('div', 'arc-player');
    this.buddyBtn = button('arc-player__buddy', '🦊', () => actions.buddy(), { 'aria-label': t('hud.buddyAria') });
    const stats = el('div', 'arc-player__stats');
    this.levelEl = el('span', 'arc-player__lv', t('hud.level', { n: 1 }));
    this.xpBar = el('i', 'arc-player__xp');
    this.coinsEl = el('span', 'arc-player__coins', '🪙 0');
    this.streakEl = el('span', 'arc-player__streak', '🔥 0', { title: t('hud.streak') });
    const lvRow = el('div', 'arc-player__row');
    lvRow.append(this.levelEl, this.xpBar);
    const moneyRow = el('div', 'arc-player__row');
    moneyRow.append(this.coinsEl, this.streakEl);
    stats.append(lvRow, moneyRow);
    this.questBtn = button('arc-player__quests', '📋 0/3', () => actions.questbook(), { 'aria-label': t('hud.questsAria') });
    this.player.append(this.buddyBtn, stats, this.questBtn);
    this.root.append(this.player);

    // Floor list.
    this.nav = el('nav', 'arc-nav', null, { 'aria-label': t('hud.floors') });
    this.navItems = floors.map((f) => {
      const b = button('arc-nav__item', null, () => actions.goFloor(f.n));
      b.append(el('span', 'arc-nav__icon', f.icon, { 'aria-hidden': 'true' }), el('span', 'arc-nav__name', t('hud.navFloor', { n: f.n, name: f.name })), el('span', 'arc-nav__meta', ''));
      this.nav.append(b);
      return b;
    });
    const all = button('arc-nav__item arc-nav__item--all', null, () => actions.overview());
    all.append(el('span', 'arc-nav__icon', map?.icon ?? '⛰️', { 'aria-hidden': 'true' }), el('span', 'arc-nav__name', t(map?.whole ?? 'hud.whole')));
    this.nav.prepend(all);
    // The study worlds (the same as walking up to the World Portal on floor 1).
    if (actions.worlds) {
      const worlds = button('arc-nav__item arc-nav__item--worlds', null, () => actions.worlds());
      worlds.append(el('span', 'arc-nav__icon', '🌍', { 'aria-hidden': 'true' }), el('span', 'arc-nav__name', t('hud.worlds')));
      this.nav.prepend(worlds);
    }
    this.root.append(this.nav);

    // Top right.
    const top = el('div', 'arc-top');
    this.stars = el('div', 'arc-chip arc-chip--stars', '⭐ 0', { role: 'status', 'aria-label': t('hud.stars') });
    this.dayBtn = button('arc-chip arc-chip--btn arc-chip--day', t('hud.day'), () => actions.toggleNight(), { 'aria-pressed': 'false' });
    this.soundBtn = button('arc-chip arc-chip--btn arc-chip--sound', '🔊', () => actions.toggleSound(), { 'aria-label': t('hud.soundOn'), 'aria-pressed': 'true' });
    const parents = button('arc-chip arc-chip--btn arc-chip--parents', t('hud.parents'), () => actions.parents());
    const settings = button('arc-chip arc-chip--btn arc-chip--settings', '⚙️', () => actions.settings?.(), { 'aria-label': t('hud.settings'), title: t('hud.settings') });
    const close = button('arc-chip arc-chip--btn arc-chip--close', '✕', () => actions.close(), { 'aria-label': t('hud.leave') });
    const help = button('arc-chip arc-chip--btn arc-chip--help', '?', () => actions.help?.(), { 'aria-label': t('help.title'), title: `${t('help.title')} (H)`, 'data-help-button': '' });
    top.append(this.stars, this.dayBtn, this.soundBtn, parents, help, settings, close);
    this.root.append(top);

    // Round buttons.
    const round = el('div', 'arc-round');
    round.append(
      button('arc-round__btn', '⌂', () => actions.home(), { 'aria-label': t('hud.homeAria'), title: t('hud.homeTitle') }),
      button('arc-round__btn', '+', () => actions.zoom(0.75), { 'aria-label': t('hud.zoomIn') }),
      button('arc-round__btn', '−', () => actions.zoom(1.33), { 'aria-label': t('hud.zoomOut') }),
      (this.textBtn = button('arc-round__btn arc-round__btn--text', 'Aa', () => actions.bigText(), { 'aria-label': t('hud.bigText'), 'aria-pressed': 'false' }))
    );
    this.root.append(round);

    // The current-lesson card.
    this.card = el('section', 'arc-quest', null, { 'aria-label': t('hud.current') });
    this.card.innerHTML = `
      <div class="arc-quest__head"><span class="arc-quest__kicker"></span><span class="arc-quest__floor"></span></div>
      <div class="arc-quest__row"><span class="arc-quest__icon" aria-hidden="true"></span><div class="arc-quest__text"><strong class="arc-quest__title"></strong><span class="arc-quest__next"></span></div></div>
      <div class="arc-quest__bar" role="progressbar" aria-valuemin="0"><div class="arc-quest__fill"></div></div>
      <div class="arc-quest__foot"><span class="arc-quest__count"></span><span class="arc-quest__actions"></span></div>`;
    this.card.querySelector('.arc-quest__kicker').textContent = t('hud.current');
    this.continueBtn = button('arc-btn arc-btn--primary', t('hud.continue'), () => actions.continue());
    this.enterBtn = button('arc-btn arc-btn--enter', t('hud.goInside'), () => actions.enterNear());
    this.enterBtn.hidden = true;
    this.card.querySelector('.arc-quest__actions').append(this.enterBtn, this.continueBtn);
    this.root.append(this.card);

    // Minimap and help line.
    this.mini = el('div', 'arc-mini', null, { 'aria-label': t('hud.map') });
    this.root.append(this.mini);
    this.root.append(el('p', 'arc-help', t('hud.help')));
    this.toasts = el('div', 'arc-toasts', null, { role: 'status', 'aria-live': 'polite' });
    this.root.append(this.toasts);
  }

  /** Refresh everything from progress. */
  update({ stars, open, kidFloor, focusFloor, current, total }) {
    this.stars.textContent = `⭐ ${num(total)}`;
    const FL = this.floors;
    const f = FL[kidFloor - 1];
    this.sub.textContent = t('hud.sub', { n: f.n, name: f.name, ages: f.ages });
    FL.forEach((fl, i) => {
      const b = this.navItems[i];
      const fs = floorStars(stars, fl.n);
      const locked = !open.has(fl.n);
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-here', fl.n === kidFloor);
      b.classList.toggle('is-focus', fl.n === focusFloor);
      b.querySelector('.arc-nav__meta').textContent = locked ? '🔒' : `${num(fs.have)}/${num(fs.of)}★`;
      b.setAttribute('aria-label', locked ? t('hud.navLocked', { n: fl.n, name: fl.name }) : t('hud.navStars', { n: fl.n, name: fl.name, have: fs.have, of: fs.of }));
      b.setAttribute('aria-current', fl.n === kidFloor ? 'location' : 'false');
    });
    // The card: the next lesson on the kid's floor.
    const fs = floorStars(stars, kidFloor);
    this.card.querySelector('.arc-quest__floor').textContent = t('hud.floor', { n: kidFloor });
    const bar = this.card.querySelector('.arc-quest__bar');
    bar.setAttribute('aria-valuemax', String(fs.of));
    bar.setAttribute('aria-valuenow', String(fs.have));
    bar.setAttribute('aria-label', t('hud.barAria', { have: fs.have, of: fs.of }));
    this.card.querySelector('.arc-quest__fill').style.width = `${(100 * fs.have) / Math.max(1, fs.of)}%`;
    const need = neededOn(kidFloor);
    const above = FL[kidFloor];
    this.card.querySelector('.arc-quest__count').textContent = above
      ? open.has(above.n)
        ? t('hud.countOpen', { done: fs.done, all: fs.lessons, n: above.n })
        : t('hud.countNeed', { done: fs.done, need, n: above.n })
      : t('hud.countTop', { done: fs.done, all: fs.lessons });
    if (current) {
      this.card.querySelector('.arc-quest__icon').textContent = SUBJECT_ICON[current.lesson.subject];
      const cur = localizeLesson(current.lesson), next = current.next && localizeLesson(current.next);
      this.card.querySelector('.arc-quest__title').textContent = cur.title;
      this.card.querySelector('.arc-quest__next').textContent = next ? t('hud.next', { title: next.title, subject: SUBJECT_LABEL[next.subject] }) : `${SUBJECT_LABEL[cur.subject]} · ${cur.blurb}`;
      this.continueBtn.textContent = t((stars[current.lesson.id] ?? 0) > 0 ? 'hud.playAgain' : 'hud.continue');
    }
    this._minimap({ stars, open, kidFloor, focusFloor });
  }

  /** Coins, level, streak and quests from the game state. */
  updateGame(gs) {
    const lv = gs.level;
    const b = gs.buddy;
    this.buddyBtn.textContent = { fox: '🦊', robot: '🤖', dragon: '🐲', puff: '☁️', bunny: '🐰' }[b?.species] ?? '🦊';
    if (b?.color) this.buddyBtn.style.setProperty('--buddy', b.color);
    this.levelEl.textContent = t('hud.level', { n: lv.level });
    this.xpBar.style.setProperty('--k', String(lv.into / lv.need));
    this.xpBar.setAttribute('aria-label', t('hud.xpAria', { into: lv.into, need: lv.need, n: lv.level + 1 }));
    if (this._coins !== undefined && gs.s.coins > this._coins) {
      this.coinsEl.classList.remove('is-bump');
      void this.coinsEl.offsetWidth;
      this.coinsEl.classList.add('is-bump');
    }
    this._coins = gs.s.coins;
    this.coinsEl.textContent = `🪙 ${num(gs.s.coins)}`;
    this.streakEl.textContent = `🔥 ${num(gs.streak)}`;
    this.streakEl.classList.toggle('is-lit', gs.streak > 0);
    const qs = gs.quests;
    const done = qs.filter((q) => q.have >= q.goal).length;
    const ready = qs.some((q) => q.have >= q.goal && !q.claimed);
    this.questBtn.textContent = `📋 ${done}/${qs.length}`;
    this.questBtn.classList.toggle('is-ready', ready);
  }

  setNear(b) {
    this.enterBtn.hidden = !b;
    if (b) this.enterBtn.textContent = t(`hud.goInto.${b.subject}`);
  }

  setNight(on) {
    this.dayBtn.textContent = t(on ? 'hud.night' : 'hud.day');
    this.dayBtn.setAttribute('aria-pressed', String(on));
    this.dayBtn.setAttribute('aria-label', t(on ? 'hud.nightAria' : 'hud.dayAria'));
  }
  setSound(on) {
    this.soundBtn.textContent = on ? '🔊' : '🔇';
    this.soundBtn.setAttribute('aria-pressed', String(on));
    this.soundBtn.setAttribute('aria-label', t(on ? 'hud.soundOn' : 'hud.soundOff'));
  }

  bumpStars() {
    this.stars.classList.remove('is-bump');
    void this.stars.offsetWidth;
    this.stars.classList.add('is-bump');
    sparkle(this.stars);
  }

  toast(text, { icon = '💡', ms = 3800 } = {}) {
    const t = el('div', 'arc-toast');
    t.append(el('span', 'arc-toast__icon', icon, { 'aria-hidden': 'true' }), el('span', null, text));
    this.toasts.append(t);
    setTimeout(() => t.classList.add('is-out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  /** The mountain from the side: a terrace per floor, three dots each, the kid. */
  _minimap({ stars, open, kidFloor, focusFloor }) {
    const FL = this.floors;
    const n = FL.length;
    const tree = this.map?.kind === 'tree';
    const W = 168, H = 150, rowH = (H - 20) / n;
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('hud.mapAria', { n: kidFloor })}">`];
    if (tree) {
      // The Great Tree from the side: a crown, a trunk, and a ring of treehouses round it per floor.
      svg.push(`<circle cx="${W / 2}" cy="14" r="22" fill="var(--arc-mini-leaf, #8fd49a)"/><circle cx="${W / 2 - 22}" cy="20" r="14" fill="var(--arc-mini-leaf, #8fd49a)"/><circle cx="${W / 2 + 22}" cy="20" r="14" fill="var(--arc-mini-leaf, #8fd49a)"/>`);
      svg.push(`<path d="M${W / 2 - 9} 18 L${W / 2 + 9} 18 L${W / 2 + 12} ${H - 6} L${W / 2 + 28} ${H - 2} L${W / 2 - 28} ${H - 2} L${W / 2 - 12} ${H - 6} Z" fill="var(--arc-mini-bark, #a7774a)"/>`);
    } else svg.push(`<path d="M6 ${H - 6} L${W / 2} 6 L${W - 6} ${H - 6} Z" fill="var(--arc-mini-peak)"/>`);
    FL.forEach((f, i) => {
      const y = H - 10 - (i + 1) * rowH;
      const inset = tree ? 12 + i * 2 : 10 + i * 8;
      const locked = !open.has(f.n);
      const cls = `arc-mini__tier${locked ? ' is-locked' : ''}${f.n === focusFloor ? ' is-focus' : ''}`;
      svg.push(`<g class="${cls}" data-floor="${f.n}"><rect x="${inset}" y="${y + 2}" width="${W - inset * 2}" height="${rowH - 3}" rx="5"/>`);
      ['math', 'history', 'physics'].forEach((s, k) => {
        const done = lessonsOn(f.n, s).filter((l) => (stars[l.id] ?? 0) > 0).length;
        const all = lessonsOn(f.n, s).length;
        const cx = inset + 18 + k * ((W - inset * 2 - 36) / 2);
        svg.push(`<circle class="arc-mini__dot arc-mini__dot--${s}${done === all && all ? ' is-done' : ''}" cx="${cx}" cy="${y + rowH / 2 + 0.5}" r="3.6"/>`);
      });
      svg.push(`<text x="${inset + 4}" y="${y + rowH / 2 + 3.5}" class="arc-mini__n">${locked ? '🔒' : f.n}</text></g>`);
      if (f.n === kidFloor) svg.push(`<text x="${W - inset - 4}" y="${y + rowH / 2 + 4.5}" class="arc-mini__kid" text-anchor="end">🧒</text>`);
    });
    svg.push('</svg>');
    this.mini.innerHTML = svg.join('');
    for (const g of this.mini.querySelectorAll('[data-floor]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => this.actions.goFloor(Number(g.dataset.floor)));
    }
  }

  dispose() {
    this.root.remove();
  }
}
