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

export class Hud {
  constructor(root, actions) {
    this.actions = actions;
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
    this.buddyBtn = button('arc-player__buddy', '🦊', () => actions.buddy(), { 'aria-label': 'Your buddy and hats' });
    const stats = el('div', 'arc-player__stats');
    this.levelEl = el('span', 'arc-player__lv', 'Lv 1');
    this.xpBar = el('i', 'arc-player__xp');
    this.coinsEl = el('span', 'arc-player__coins', '🪙 0');
    this.streakEl = el('span', 'arc-player__streak', '🔥 0', { title: 'Days in a row' });
    const lvRow = el('div', 'arc-player__row');
    lvRow.append(this.levelEl, this.xpBar);
    const moneyRow = el('div', 'arc-player__row');
    moneyRow.append(this.coinsEl, this.streakEl);
    stats.append(lvRow, moneyRow);
    this.questBtn = button('arc-player__quests', '📋 0/3', () => actions.questbook(), { 'aria-label': 'Today’s quests and stickers' });
    this.player.append(this.buddyBtn, stats, this.questBtn);
    this.root.append(this.player);

    // Floor list.
    this.nav = el('nav', 'arc-nav', null, { 'aria-label': 'Floors' });
    this.navItems = FLOORS.map((f) => {
      const b = button('arc-nav__item', null, () => actions.goFloor(f.n));
      b.append(el('span', 'arc-nav__icon', f.icon, { 'aria-hidden': 'true' }), el('span', 'arc-nav__name', `${f.n}. ${f.name}`), el('span', 'arc-nav__meta', ''));
      this.nav.append(b);
      return b;
    });
    const all = button('arc-nav__item arc-nav__item--all', null, () => actions.overview());
    all.append(el('span', 'arc-nav__icon', '⛰️', { 'aria-hidden': 'true' }), el('span', 'arc-nav__name', 'Whole mountain'));
    this.nav.prepend(all);
    this.root.append(this.nav);

    // Top right.
    const top = el('div', 'arc-top');
    this.stars = el('div', 'arc-chip arc-chip--stars', '⭐ 0', { role: 'status', 'aria-label': 'Stars' });
    this.dayBtn = button('arc-chip arc-chip--btn', '☀️ Day', () => actions.toggleNight(), { 'aria-pressed': 'false' });
    this.soundBtn = button('arc-chip arc-chip--btn', '🔊', () => actions.toggleSound(), { 'aria-label': 'Sound on', 'aria-pressed': 'true' });
    const parents = button('arc-chip arc-chip--btn arc-chip--parents', '👪 Parents', () => actions.parents());
    const close = button('arc-chip arc-chip--btn arc-chip--close', '✕', () => actions.close(), { 'aria-label': 'Leave AI Arcademia' });
    top.append(this.stars, this.dayBtn, this.soundBtn, parents, close);
    this.root.append(top);

    // Round buttons.
    const round = el('div', 'arc-round');
    round.append(
      button('arc-round__btn', '⌂', () => actions.home(), { 'aria-label': 'Back to my kid', title: 'Home (H)' }),
      button('arc-round__btn', '+', () => actions.zoom(0.75), { 'aria-label': 'Zoom in' }),
      button('arc-round__btn', '−', () => actions.zoom(1.33), { 'aria-label': 'Zoom out' }),
      (this.textBtn = button('arc-round__btn arc-round__btn--text', 'Aa', () => actions.bigText(), { 'aria-label': 'Bigger text', 'aria-pressed': 'false' }))
    );
    this.root.append(round);

    // The current-lesson card.
    this.card = el('section', 'arc-quest', null, { 'aria-label': 'Current lesson' });
    this.card.innerHTML = `
      <div class="arc-quest__head"><span class="arc-quest__kicker">Current lesson</span><span class="arc-quest__floor"></span></div>
      <div class="arc-quest__row"><span class="arc-quest__icon" aria-hidden="true"></span><div class="arc-quest__text"><strong class="arc-quest__title"></strong><span class="arc-quest__next"></span></div></div>
      <div class="arc-quest__bar" role="progressbar" aria-valuemin="0"><div class="arc-quest__fill"></div></div>
      <div class="arc-quest__foot"><span class="arc-quest__count"></span><span class="arc-quest__actions"></span></div>`;
    this.continueBtn = button('arc-btn arc-btn--primary', '▶ Continue', () => actions.continue());
    this.enterBtn = button('arc-btn arc-btn--enter', '🚪 Go inside', () => actions.enterNear());
    this.enterBtn.hidden = true;
    this.card.querySelector('.arc-quest__actions').append(this.enterBtn, this.continueBtn);
    this.root.append(this.card);

    // Minimap and help line.
    this.mini = el('div', 'arc-mini', null, { 'aria-label': 'Mountain map' });
    this.root.append(this.mini);
    this.root.append(el('p', 'arc-help', 'Drag to look around · scroll or pinch to zoom · click to walk · WASD to move · Enter to go inside'));
    this.toasts = el('div', 'arc-toasts', null, { role: 'status', 'aria-live': 'polite' });
    this.root.append(this.toasts);
  }

  /** Refresh everything from progress. */
  update({ stars, open, kidFloor, focusFloor, current, total }) {
    this.stars.textContent = `⭐ ${total}`;
    const f = FLOORS[kidFloor - 1];
    this.sub.textContent = `Floor ${f.n} · ${f.name} · ages ${f.ages}`;
    FLOORS.forEach((fl, i) => {
      const b = this.navItems[i];
      const fs = floorStars(stars, fl.n);
      const locked = !open.has(fl.n);
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-here', fl.n === kidFloor);
      b.classList.toggle('is-focus', fl.n === focusFloor);
      b.querySelector('.arc-nav__meta').textContent = locked ? '🔒' : `${fs.have}/${fs.of}★`;
      b.setAttribute('aria-label', `Floor ${fl.n}, ${fl.name}${locked ? ', locked' : `, ${fs.have} of ${fs.of} stars`}`);
      b.setAttribute('aria-current', fl.n === kidFloor ? 'location' : 'false');
    });
    // The card: the next lesson on the kid's floor.
    const fs = floorStars(stars, kidFloor);
    this.card.querySelector('.arc-quest__floor').textContent = `Floor ${kidFloor}`;
    const bar = this.card.querySelector('.arc-quest__bar');
    bar.setAttribute('aria-valuemax', String(fs.of));
    bar.setAttribute('aria-valuenow', String(fs.have));
    bar.setAttribute('aria-label', `${fs.have} of ${fs.of} stars on this floor`);
    this.card.querySelector('.arc-quest__fill').style.width = `${(100 * fs.have) / Math.max(1, fs.of)}%`;
    const need = neededOn(kidFloor);
    const above = FLOORS[kidFloor];
    this.card.querySelector('.arc-quest__count').textContent = above
      ? open.has(above.n)
        ? `${fs.done}/${fs.lessons} lessons · Floor ${above.n} is open`
        : `${fs.done}/${need} lessons to open Floor ${above.n}`
      : `${fs.done}/${fs.lessons} lessons · the top of the mountain!`;
    if (current) {
      this.card.querySelector('.arc-quest__icon').textContent = SUBJECT_ICON[current.lesson.subject];
      this.card.querySelector('.arc-quest__title').textContent = current.lesson.title;
      this.card.querySelector('.arc-quest__next').textContent = current.next ? `Next: ${current.next.title} (${SUBJECT_LABEL[current.next.subject]})` : `${SUBJECT_LABEL[current.lesson.subject]} · ${current.lesson.blurb}`;
      this.continueBtn.textContent = (stars[current.lesson.id] ?? 0) > 0 ? '▶ Play again' : '▶ Continue';
    }
    this._minimap({ stars, open, kidFloor, focusFloor });
  }

  /** Coins, level, streak and quests from the game state. */
  updateGame(gs) {
    const lv = gs.level;
    const b = gs.buddy;
    this.buddyBtn.textContent = { fox: '🦊', robot: '🤖', dragon: '🐲', puff: '☁️', bunny: '🐰' }[b?.species] ?? '🦊';
    if (b?.color) this.buddyBtn.style.setProperty('--buddy', b.color);
    this.levelEl.textContent = `Lv ${lv.level}`;
    this.xpBar.style.setProperty('--k', String(lv.into / lv.need));
    this.xpBar.setAttribute('aria-label', `${lv.into} of ${lv.need} XP to level ${lv.level + 1}`);
    if (this._coins !== undefined && gs.s.coins > this._coins) {
      this.coinsEl.classList.remove('is-bump');
      void this.coinsEl.offsetWidth;
      this.coinsEl.classList.add('is-bump');
    }
    this._coins = gs.s.coins;
    this.coinsEl.textContent = `🪙 ${gs.s.coins}`;
    this.streakEl.textContent = `🔥 ${gs.streak}`;
    this.streakEl.classList.toggle('is-lit', gs.streak > 0);
    const qs = gs.quests;
    const done = qs.filter((q) => q.have >= q.goal).length;
    const ready = qs.some((q) => q.have >= q.goal && !q.claimed);
    this.questBtn.textContent = `📋 ${done}/${qs.length}`;
    this.questBtn.classList.toggle('is-ready', ready);
  }

  setNear(b) {
    this.enterBtn.hidden = !b;
    if (b) this.enterBtn.textContent = `🚪 Go into the ${SUBJECT_LABEL[b.subject]} ${b.subject === 'math' ? 'school' : b.subject === 'history' ? 'hall' : 'lab'}`;
  }

  setNight(on) {
    this.dayBtn.textContent = on ? '🌙 Night' : '☀️ Day';
    this.dayBtn.setAttribute('aria-pressed', String(on));
    this.dayBtn.setAttribute('aria-label', on ? 'Night — switch to day' : 'Day — switch to night');
  }
  setSound(on) {
    this.soundBtn.textContent = on ? '🔊' : '🔇';
    this.soundBtn.setAttribute('aria-pressed', String(on));
    this.soundBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
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
    const n = FLOORS.length;
    const W = 168, H = 150, rowH = (H - 20) / n;
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mountain map: you are on floor ${kidFloor}">`];
    svg.push(`<path d="M6 ${H - 6} L${W / 2} 6 L${W - 6} ${H - 6} Z" fill="var(--arc-mini-peak)"/>`);
    FLOORS.forEach((f, i) => {
      const y = H - 10 - (i + 1) * rowH;
      const inset = 10 + i * 8;
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
