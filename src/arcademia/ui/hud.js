/**
 * The diorama's cream-card interface: the title, the floor list on the
 * left, day/night, sound and Parents at the top right, the stars counter,
 * the current-lesson card at the bottom, the round zoom and home buttons,
 * the mountain minimap in the corner, and toasts.
 */
import { el, button, SUBJECT_ICON, SUBJECT_LABEL, sparkle } from './dom.js';
import { FLOORS } from '../floors.js';
import { floorStars, neededOn } from '../rules.js';
import { LAND_LESSONS } from '../content/index.js';
import { lessonsOn } from '../content/index.js';
import { t, num, localizeLesson } from '../i18n/index.js';
import { OASES, GIZA, riverLine, DESERT } from '../world/desert/plan.js';
import { CRATERS, MOON, LANDMARKS as MOON_SIGHTS } from '../world/moon/plan.js';
import { planMars, SIGHTS } from '../world/mars/plan.js';

export class Hud {
  constructor(root, actions, { floors = FLOORS, map = null, lessons = LAND_LESSONS, realm = 'land' } = {}) {
    this.actions = actions;
    this.lessons = lessons;
    this.realm = realm;
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
    // The keys, with O naming this world's whole view (the whole mountain, all the oases…).
    this.root.append(el('p', 'arc-help', t('hud.help', { whole: t(map?.wholeHint ?? 'hud.wholeHint') })));
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
      const fs = floorStars(stars, fl.n, this.lessons);
      const locked = !open.has(fl.n);
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-here', fl.n === kidFloor);
      b.classList.toggle('is-focus', fl.n === focusFloor);
      b.querySelector('.arc-nav__meta').textContent = locked ? '🔒' : `${num(fs.have)}/${num(fs.of)}★`;
      b.setAttribute('aria-label', locked ? t('hud.navLocked', { n: fl.n, name: fl.name }) : t('hud.navStars', { n: fl.n, name: fl.name, have: fs.have, of: fs.of }));
      b.setAttribute('aria-current', fl.n === kidFloor ? 'location' : 'false');
    });
    // The card: the next lesson on the kid's floor.
    const fs = floorStars(stars, kidFloor, this.lessons);
    this.card.querySelector('.arc-quest__floor').textContent = t('hud.floor', { n: kidFloor });
    const bar = this.card.querySelector('.arc-quest__bar');
    bar.setAttribute('aria-valuemax', String(fs.of));
    bar.setAttribute('aria-valuenow', String(fs.have));
    bar.setAttribute('aria-label', t('hud.barAria', { have: fs.have, of: fs.of }));
    this.card.querySelector('.arc-quest__fill').style.width = `${(100 * fs.have) / Math.max(1, fs.of)}%`;
    const need = neededOn(kidFloor, this.lessons);
    const above = FL[kidFloor];
    this.card.querySelector('.arc-quest__count').textContent = above
      ? open.has(above.n)
        ? t('hud.countOpen', { done: fs.done, all: fs.lessons, n: above.n })
        : t('hud.countNeed', { done: fs.done, need, n: above.n })
      : t('hud.countTop', { done: fs.done, all: fs.lessons });
    if (current?.lesson) {
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
    if (this.map?.kind === 'lagoon') return this._islandMap({ stars, open, kidFloor, focusFloor });
    if (this.map?.kind === 'desert') return this._riverMap({ stars, open, kidFloor, focusFloor });
    if (this.map?.kind === 'moon') return this._craterMap({ stars, open, kidFloor, focusFloor });
    if (this.map?.kind === 'mars') return this._volcanoMap({ stars, open, kidFloor, focusFloor });
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
        const done = lessonsOn(f.n, s, this.realm).filter((l) => (stars[l.id] ?? 0) > 0).length;
        const all = lessonsOn(f.n, s, this.realm).length;
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

  /** The Lagoon from above: the islands round the lagoon, a boardwalk between them, three dots each, the kid. */
  _islandMap({ stars, open, kidFloor, focusFloor }) {
    const FL = this.floors;
    const W = 168, H = 150, cx = W / 2, cy = H / 2 + 2, R = 52;
    const pos = FL.map((f, i) => {
      const a = (i / FL.length) * Math.PI * 2;
      return [cx + Math.sin(a) * R, cy + Math.cos(a) * R];
    });
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('hud.mapAria', { n: kidFloor })}">`];
    svg.push(`<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="#5fd0dc"/><circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="#8ff0e0" opacity="0.6"/>`);
    for (let i = 1; i < pos.length; i++) svg.push(`<line x1="${pos[i - 1][0]}" y1="${pos[i - 1][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}" stroke="#c39a6b" stroke-width="3" stroke-linecap="round"/>`);
    FL.forEach((f, i) => {
      const [x, y] = pos[i];
      const locked = !open.has(f.n);
      svg.push(`<g class="arc-mini__tier${locked ? ' is-locked' : ''}${f.n === focusFloor ? ' is-focus' : ''}" data-floor="${f.n}"><circle cx="${x}" cy="${y}" r="13" fill="#f6e7c1" stroke="#fff" stroke-width="2"/>`);
      ['math', 'history', 'physics'].forEach((sub, k) => {
        const list = lessonsOn(f.n, sub, this.realm);
        const done = list.filter((l) => (stars[l.id] ?? 0) > 0).length;
        svg.push(`<circle class="arc-mini__dot arc-mini__dot--${sub}${done === list.length && list.length ? ' is-done' : ''}" cx="${x - 6 + k * 6}" cy="${y + 6}" r="2.6"/>`);
      });
      svg.push(`<text x="${x}" y="${y + 1}" text-anchor="middle" class="arc-mini__n">${locked ? '🔒' : f.n}</text></g>`);
      if (f.n === kidFloor) svg.push(`<text x="${x + 11}" y="${y - 8}" class="arc-mini__kid">🧒</text>`);
    });
    svg.push('</svg>');
    this.mini.innerHTML = svg.join('');
    for (const g of this.mini.querySelectorAll('[data-floor]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => this.actions.goFloor(Number(g.dataset.floor)));
    }
  }

  /** The Desert from above: the Nile winding west to east, the oases strung along it, the pyramids by the first. */
  _riverMap({ stars, open, kidFloor, focusFloor }) {
    const FL = this.floors;
    const W = 168, H = 150;
    const x0 = -395, x1 = 395, z0 = -300, z1 = 62;
    const k = Math.min((W - 8) / (x1 - x0), (H - 8) / (z1 - z0));
    const ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2 + 4;
    const P = (x, z) => [+(ox + (x - x0) * k).toFixed(1), +(oz + (z - z0) * k).toFixed(1)];
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('desert.mapAria', { n: kidFloor })}">`];
    svg.push(`<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="#f3d39c"/>`);
    // A few dune lines, the river with its green banks.
    for (let i = 0; i < 5; i++) {
      const y = 14 + i * 30;
      svg.push(`<path d="M8 ${y} q 20 -7 40 0 t 40 0 t 40 0 t 34 0" fill="none" stroke="#e2b779" stroke-width="2" opacity="0.7"/>`);
    }
    const river = riverLine(24).filter(([x]) => x >= x0 - 30 && x <= x1 + 30).map(([x, z]) => P(x, z).join(' ')).join(' L');
    svg.push(`<path d="M${river}" fill="none" stroke="#9fcf73" stroke-width="${(DESERT.river.half * 2 + 18) * k}" stroke-linecap="round" opacity="0.8"/>`);
    svg.push(`<path d="M${river}" fill="none" stroke="#3fb7c4" stroke-width="${Math.max(3, DESERT.river.half * 2 * k)}" stroke-linecap="round"/>`);
    // The pyramids and the Sphinx.
    for (const p of [...GIZA.pyramids].sort((a, b) => a.base - b.base).reverse()) {
      const [x, y] = P(p.x, p.z), h = Math.max(3, p.h * k * 1.6), b = Math.max(3, p.base * k * 0.9);
      svg.push(`<path d="M${x - b / 2} ${y + h / 3} L${x} ${y - (h * 2) / 3} L${x + b / 2} ${y + h / 3} Z" fill="#e7bf7e" stroke="#b8834f" stroke-width="1"><title>${t('desert.pyramids')}</title></path>`);
    }
    const [sx, sy] = P(GIZA.sphinx.x, GIZA.sphinx.z);
    svg.push(`<text x="${sx}" y="${sy + 4}" text-anchor="middle" font-size="9"><title>${t('desert.sphinx')}</title>🦁</text>`);
    const pos = FL.map((f, i) => P(...OASES[i]));
    for (let i = 1; i < pos.length; i++) svg.push(`<line x1="${pos[i - 1][0]}" y1="${pos[i - 1][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}" stroke="#c9a06a" stroke-width="3" stroke-linecap="round"/>`);
    FL.forEach((f, i) => {
      const [x, y] = pos[i];
      const locked = !open.has(f.n);
      svg.push(`<g class="arc-mini__tier${locked ? ' is-locked' : ''}${f.n === focusFloor ? ' is-focus' : ''}" data-floor="${f.n}"><circle cx="${x}" cy="${y}" r="10" fill="${locked ? '#d8d2c4' : '#9fd27a'}" stroke="${f.n === focusFloor ? '#e9a92a' : '#fff'}" stroke-width="2"/>`);
      ['math', 'history', 'physics'].forEach((sub, j) => {
        const list = lessonsOn(f.n, sub, this.realm);
        const done = list.filter((l) => (stars[l.id] ?? 0) > 0).length;
        svg.push(`<circle class="arc-mini__dot arc-mini__dot--${sub}${done === list.length && list.length ? ' is-done' : ''}" cx="${x - 5 + j * 5}" cy="${y + 5}" r="2.2"/>`);
      });
      svg.push(`<text x="${x}" y="${y + 1}" text-anchor="middle" class="arc-mini__n">${locked ? '🔒' : f.n}</text></g>`);
      if (f.n === kidFloor) svg.push(`<text x="${x + 8}" y="${y - 8}" class="arc-mini__kid">🧒</text>`);
    });
    svg.push('</svg>');
    this.mini.innerHTML = svg.join('');
    for (const g of this.mini.querySelectorAll('[data-floor]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => this.actions.goFloor(Number(g.dataset.floor)));
    }
  }

  /** The Moon from above: grey ground, seven craters round the plain, glass tubes between them, the Big Rocket in the middle, the Earth. */
  _craterMap({ stars, open, kidFloor, focusFloor }) {
    const FL = this.floors;
    const W = 168, H = 150, cx = W / 2, cy = H / 2 + 2;
    const k = 52 / MOON.ring;
    const P = (x, z) => [+(cx + x * k).toFixed(1), +(cy + z * k).toFixed(1)];
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('moon.mapAria', { n: kidFloor })}">`];
    svg.push(`<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="#1c2240"/>`);
    // A few stars, the plain, the Earth in the corner.
    for (const [x, y] of [[14, 12], [40, 8], [150, 20], [130, 10], [10, 130], [156, 138], [24, 60], [150, 90]]) svg.push(`<circle cx="${x}" cy="${y}" r="0.9" fill="#fff" opacity="0.8"/>`);
    svg.push(`<circle cx="${cx}" cy="${cy}" r="${(MOON.ring + MOON.outR) * k}" fill="#a9abb6"/><circle cx="${cx}" cy="${cy}" r="${(MOON.ring - MOON.outR + 6) * k}" fill="#bfc1ca"/>`);
    svg.push(`<text x="10" y="22" font-size="13"><title>${t('moon.earth')}</title>🌍</text>`);
    const pos = FL.map((f, i) => P(...CRATERS[i]));
    for (let i = 1; i < pos.length; i++) svg.push(`<line x1="${pos[i - 1][0]}" y1="${pos[i - 1][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}" stroke="#bfeaff" stroke-width="4" stroke-linecap="round" opacity="0.9"/><line x1="${pos[i - 1][0]}" y1="${pos[i - 1][1]}" x2="${pos[i][0]}" y2="${pos[i][1]}" stroke="#5fb7e0" stroke-width="1.4" stroke-linecap="round"/>`);
    // The giant landmarks on the plain.
    const [rx, ry] = P(MOON_SIGHTS.rocket.x, MOON_SIGHTS.rocket.z);
    svg.push(`<text x="${rx}" y="${ry + 5}" text-anchor="middle" font-size="13"><title>${t('moon.rocket')}</title>🚀</text>`);
    const [dx, dy] = P(MOON_SIGHTS.dish.x, MOON_SIGHTS.dish.z), [lx, ly] = P(MOON_SIGHTS.lander.x, MOON_SIGHTS.lander.z);
    svg.push(`<text x="${dx}" y="${dy + 4}" text-anchor="middle" font-size="9"><title>${t('moon.dish')}</title>📡</text><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="9"><title>${t('moon.lander')}</title>🛬</text>`);
    FL.forEach((f, i) => {
      const [x, y] = pos[i];
      const locked = !open.has(f.n);
      svg.push(`<g class="arc-mini__tier${locked ? ' is-locked' : ''}${f.n === focusFloor ? ' is-focus' : ''}" data-floor="${f.n}"><circle cx="${x}" cy="${y}" r="13.5" fill="${locked ? '#8a8c97' : '#dfe2ea'}" stroke="${f.n === focusFloor ? '#ffb23f' : '#f4f6fa'}" stroke-width="2.4"/><circle cx="${x}" cy="${y}" r="9.5" fill="${locked ? '#7a7c87' : '#c9ccd5'}"/>`);
      ['math', 'history', 'physics'].forEach((sub, j) => {
        const list = lessonsOn(f.n, sub, this.realm);
        const done = list.filter((l) => (stars[l.id] ?? 0) > 0).length;
        svg.push(`<circle class="arc-mini__dot arc-mini__dot--${sub}${done === list.length && list.length ? ' is-done' : ''}" cx="${x - 6 + j * 6}" cy="${y + 6}" r="2.6"/>`);
      });
      svg.push(`<text x="${x}" y="${y + 1}" text-anchor="middle" class="arc-mini__n">${locked ? '🔒' : f.n}</text></g>`);
      if (f.n === kidFloor) svg.push(`<text x="${x + 11}" y="${y - 8}" class="arc-mini__kid">🧒</text>`);
    });
    svg.push('</svg>');
    this.mini.innerHTML = svg.join('');
    for (const g of this.mini.querySelectorAll('[data-floor]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => this.actions.goFloor(Number(g.dataset.floor)));
    }
  }

  /**
   * Mars from above: the terrace spiralling up the volcano, each floor's stretch of it (greyed while
   * locked; tap it to go there), the ramps as arrows pointing up, the schools as big coloured badges
   * and the small places as icons (tap one and the buddy walks there), the caldera, the giants on the
   * plain, and you — an arrow that turns the way you face (tickMap).
   */
  _volcanoMap({ stars, open, kidFloor, focusFloor }) {
    const FL = this.floors;
    const plan = (this._marsPlan ??= planMars(FL.length));
    const W = 220, H = 204, cx = W / 2, cy = H / 2 + 2;
    const k = 96 / (plan.footR + 4);
    const P = (x, z) => [+(cx + x * k).toFixed(1), +(cy + z * k).toFixed(1)];
    const line = (a, b, o) => {
      const pts = [];
      const n = Math.max(2, Math.ceil((b - a) / 0.04));
      for (let i = 0; i <= n; i++) {
        const p = plan.pt(a + ((b - a) * i) / n, o);
        pts.push(P(p.x, p.z).join(' '));
      }
      return `M${pts.join(' L')}`;
    };
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('mars.mapAria', { n: kidFloor }))}"><g class="arc-mini__world">`];
    svg.push(`<rect x="-300" y="-300" width="${W + 600}" height="${H + 600}" fill="#eaa978"/><circle cx="${cx}" cy="${cy}" r="${((plan.footR + 3) * k).toFixed(1)}" fill="#c0603f"/>`);
    svg.push(`<circle cx="${cx}" cy="${cy}" r="${((plan.riOf(plan.PHI) + 0.5) * k).toFixed(1)}" fill="#a24c33"/><circle cx="${cx}" cy="${cy}" r="${(5.5 * k).toFixed(1)}" fill="#6e3226"><title>${esc(t('mars.caldera'))}</title></circle>`);
    const bandW = (14.5 * k).toFixed(1), mid = 14.5 / 2;
    // The ramps: a pale strip with an arrow up its middle (grey while the floor above is locked).
    plan.stairs.forEach((s) => {
      const locked = !open.has(s.to);
      svg.push(`<path d="${line(s.pa, s.pb, mid)}" fill="none" stroke="${locked ? '#b6a9a0' : '#ffe9c9'}" stroke-width="${bandW}"/>`);
      const m = (s.pa + s.pb) / 2, a = plan.pt(m - 0.04, mid), b = plan.pt(m + 0.04, mid);
      const [ax, ay] = P(a.x, a.z), [bx, by] = P(b.x, b.z), ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      const [mx, my] = P(plan.pt(m, mid).x, plan.pt(m, mid).z);
      svg.push(`<path class="arc-mini__ramp${locked ? ' is-locked' : ''}" d="M-5 -4 L4 0 L-5 4 L-2.5 0 Z" transform="translate(${mx} ${my}) rotate(${ang.toFixed(0)})"/>`);
    });
    // The floors.
    FL.forEach((f, i) => {
      const g = plan.floors[i];
      const locked = !open.has(f.n);
      svg.push(`<g class="arc-mini__tier arc-mini__floor${locked ? ' is-locked' : ''}${f.n === focusFloor ? ' is-focus' : ''}" data-floor="${f.n}"><title>${esc(t('hud.navFloor', { n: f.n, name: f.name }))}</title>`);
      if (f.n === focusFloor) svg.push(`<path d="${line(g.phiS, g.phiE, mid)}" fill="none" stroke="#ffc83d" stroke-width="${(14.5 * k + 3).toFixed(1)}" stroke-linecap="round"/>`);
      svg.push(`<path d="${line(g.phiS, g.phiE, mid)}" fill="none" stroke="${locked ? '#c9bcb2' : '#f7d6b1'}" stroke-width="${bandW}"/>`);
      svg.push(`<path d="${line(g.phiS, g.phiE, 11.6)}" fill="none" stroke="${locked ? '#d8cec6' : '#fff1de'}" stroke-width="${(3.2 * k).toFixed(1)}" stroke-dasharray="2 1.4"/>`);
      const st = plan.pt(plan.phiAlong(i, 2.4), mid), [nx, ny] = P(st.x, st.z);
      svg.push(`<g transform="translate(${nx} ${ny})"><g class="arc-mini__up"><circle r="5.6" fill="${locked ? '#9a8f88' : '#fff'}" stroke="${locked ? '#7d736d' : '#c0603f'}" stroke-width="1.2"/><text y="2.6" text-anchor="middle" class="arc-mini__n" style="font-size:7.5px">${locked ? '🔒' : f.n}</text></g></g></g>`);
    });
    // The places on each floor: schools big, the rest as icons; tap one to walk there.
    FL.forEach((f, i) => {
      const g = plan.floors[i];
      const locked = !open.has(f.n);
      const icon = (kind, x, z, text, name, size = 8.5) => {
        const [px, py] = P(x, z);
        // A locked floor's small places are only grey dots (its badge says it is locked).
        if (locked) return svg.push(`<circle cx="${px}" cy="${py}" r="1.6" fill="#b2a69d"/>`);
        svg.push(`<g class="arc-mini__place" data-place="${kind}" data-floor-of="${f.n}" transform="translate(${px} ${py})"><title>${esc(name)}</title><g class="arc-mini__up"><circle r="${(size * 0.62).toFixed(1)}" fill="#fff8ef" stroke="#c0603f" stroke-width="0.8"/><text y="${(size * 0.34).toFixed(1)}" text-anchor="middle" style="font-size:${size}px">${text}</text></g></g>`);
      };
      for (const p of g.places) {
        if (['math', 'history', 'physics'].includes(p.kind)) {
          const list = lessonsOn(f.n, p.kind, this.realm);
          const done = list.length && list.every((l) => (stars[l.id] ?? 0) > 0);
          const [px, py] = P(p.x, p.z);
          if (locked) svg.push(`<circle class="arc-mini__school arc-mini__school--${p.kind} is-locked" cx="${px}" cy="${py}" r="3.4"/>`);
          else svg.push(`<g class="arc-mini__place arc-mini__school arc-mini__school--${p.kind}${done ? ' is-done' : ''}" data-place="${p.kind}" data-floor-of="${f.n}" transform="translate(${px} ${py})"><title>${esc(t(`mars.building.${p.kind}`))}</title><g class="arc-mini__up"><circle r="6.4"/><text y="2.9" text-anchor="middle" style="font-size:8px">${SUBJECT_ICON[p.kind]}</text></g></g>`);
        } else if (p.kind === 'landmark') icon('landmark', p.x, p.z, f.icon, t(`landmark.${f.look.landmark}`), 8.5);
        else icon(p.kind, p.x, p.z, { shop: '🎩', arcade: '🕹️', museum: '🌈', board: '📋' }[p.kind], t(`place.${p.kind}`), 6.5);
      }
      icon('portal', g.portal.x, g.portal.z, '🌀', t('place.portal'), 6.5);
      if (g.worldGate) icon('worlds', g.worldGate.x, g.worldGate.z, '🌍', t('place.worlds'), 7.5);
    });
    // The giants stand out on the plain, past the map's edge: drawn at its rim.
    const rim = (x, z) => P(...[x, z].map((v) => v * Math.min(1, (plan.footR + 8) / Math.hypot(x, z))));
    const [rx, ry] = rim(SIGHTS.rocket.x, SIGHTS.rocket.z), [vx, vy] = rim(SIGHTS.village.x, SIGHTS.village.z);
    svg.push(`<g transform="translate(${rx} ${ry})"><g class="arc-mini__up"><text y="4" text-anchor="middle" font-size="12"><title>${esc(t('mars.rocket'))}</title>🚀</text></g></g><g transform="translate(${vx} ${vy})"><g class="arc-mini__up"><text y="4" text-anchor="middle" font-size="11"><title>${esc(t('mars.village'))}</title>🏠</text></g></g>`);
    // You: an arrow the way you face, with a soft ring (tickMap moves it).
    svg.push('<g class="arc-mini__me"><circle r="7" class="arc-mini__me-ring"/><path d="M0 6 L-4.2 -4 L0 -1.8 L4.2 -4 Z" class="arc-mini__me-arrow"/></g>');
    svg.push('</g></svg>');
    this.mini.innerHTML = svg.join('');
    this.mini.classList.add('arc-mini--mars');
    // Near (round you, big icons: the default) or the whole volcano: the corner button switches.
    const zoomBtn = button('arc-mini__zoom', this._marsWhole ? '+' : '−', () => {
      this._marsWhole = !this._marsWhole;
      this._volcanoMap({ stars, open, kidFloor, focusFloor });
    }, { 'aria-label': t(this._marsWhole ? 'hud.zoomIn' : 'hud.zoomOut'), title: t(this._marsWhole ? 'hud.zoomIn' : 'hud.zoomOut') });
    this.mini.append(zoomBtn);
    this._me = { el: this.mini.querySelector('.arc-mini__me'), svg: this.mini.querySelector('svg'), world: this.mini.querySelector('.arc-mini__world'), P, W, H, whole: Boolean(this._marsWhole) };
    if (this._lastKid) this.tickMap(this._lastKid);
    else this.tickMap({ x: plan.start.x, z: plan.start.z, heading: Math.atan2(plan.start.x, plan.start.z) + Math.PI });
    for (const g of this.mini.querySelectorAll('[data-floor]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => this.actions.goFloor(Number(g.dataset.floor)));
    }
    for (const g of this.mini.querySelectorAll('[data-place]')) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.actions.walkTo?.(Number(g.dataset.floorOf), g.dataset.place);
      });
    }
  }

  /** The buddy moved: move "you" on a minimap that shows it (Mars). */
  tickMap(kid) {
    this._lastKid = kid;
    if (!this._me?.el?.isConnected) return;
    const [x, y] = this._me.P(kid.x, kid.z);
    this._me.el.setAttribute('transform', `translate(${x} ${y}) rotate(${((-kid.heading * 180) / Math.PI).toFixed(0)})`);
    // Near: a window round you (about 45 m each way), everything twice the size, turned so the way the
    // camera looks is up — the map shows what is in front of you, the mountain above, the base across.
    const { W, H, svg, world } = this._me;
    if (this._me.whole) {
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      world.removeAttribute('transform');
      svg.style.setProperty('--up', '0deg');
    } else {
      const w = W * 0.5, h = H * 0.5;
      // You a little below the middle: more of what is ahead (the mountain) shows than of the plain behind.
      svg.setAttribute('viewBox', `${(x - w / 2).toFixed(1)} ${(y - h * 0.68).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
      const turn = kid.fx || kid.fz ? -90 - (Math.atan2(kid.fz, kid.fx) * 180) / Math.PI : 0;
      world.setAttribute('transform', `rotate(${turn.toFixed(1)} ${x} ${y})`);
      svg.style.setProperty('--up', `${(-turn).toFixed(1)}deg`);
    }
  }

  dispose() {
    this.root.remove();
  }
}
