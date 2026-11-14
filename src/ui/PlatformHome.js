import { GENRES } from '../blueprints/genres.js';
import { cardLine } from '../platform/gameCards.js';
import { GENRE_ICONS, coverHtml, guardCovers } from './gameCover.js';
import { tilt, confetti, popColor } from './pop.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const ago = (t) => {
  if (!t) return '';
  const s = (Date.now() - t) / 1000;
  for (const [unit, n] of [['year', 31536e3], ['month', 2592e3], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (s >= n) {
      const k = Math.floor(s / n);
      return `${k} ${unit}${k === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
};
const plays = (n) => (n === 1 ? '1 play' : `${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} plays`);
const hue = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/**
 * The platform's front page: every game you can play, as a grid of cards —
 * the official ones and what people published — with search, genre filters,
 * popular or new, a game's own page with Play, and Create.
 *
 * The action RPG's own menu (class, weapon, skills, parties, account) is one
 * click away as "Arena hero", and "My heroes" lists your heroes in every
 * game (ui/HeroesPanel.js); this is what the platform opens on.
 */
export class PlatformHome {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   list: (params: object) => Promise<object[]>,
   *   get: (id: string) => Promise<object>,
   *   play: (id: string, heroId: string|null) => Promise<void>,
   *   remove: (id: string) => Promise<boolean>,
   *   create: () => void,
   *   openHero: (panel?: string) => void,
   *   openForge: () => void, openEditor: () => void, openLibrary: () => void,
   *   heroes: () => Promise<{ id: string, name: string }[]>,
   *   heroOf: (gameId: string) => string|null,
   *   rosterHeroes: (roster: object[]) => { id: string, name: string }[],
   *   account: () => { id: number, name: string }|null
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.query = { q: '', genre: '', sort: 'popular', kids: false };
    this.root = el('div', 'home');
    this.root.hidden = true;
    this.root.innerHTML = `
      <header class="home__bar">
        <div class="home__brand"><span class="home__logo">◆</span> Gamory</div>
        <label class="home__search">
          <span class="home__search-icon" aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search games, worlds and makers" aria-label="Search games" data-search />
        </label>
        <nav class="home__actions">
          <button type="button" class="home__btn home__btn--primary" data-create>＋ Create</button>
          <button type="button" class="home__btn" data-heroes title="Your heroes in every game: levels, bags and equipment">🦸 My heroes</button>
          <button type="button" class="home__btn" data-hero title="The free-play arena's hero: class, weapon, skills and stash">Arena hero</button>
          <button type="button" class="home__btn" data-party title="Make a party or join one with a code">Play together</button>
          <button type="button" class="home__btn home__btn--account" data-account>Sign in</button>
        </nav>
      </header>
      <div class="home__filters">
        <div class="home__chips" data-chips role="toolbar" aria-label="Filter by genre"></div>
        <div class="home__sort" role="group" aria-label="Sort">
          <button type="button" data-sort="popular" class="is-active">Popular</button>
          <button type="button" data-sort="new">New</button>
        </div>
      </div>
      <main class="home__main">
        <section class="home-hero" data-hero-banner aria-label="Featured game">
          <div class="home-hero__text">
            <span class="home-hero__hello">Hi there! 👋</span>
            <h1 class="home-hero__title">What shall we <em>play</em> today?</h1>
            <p class="home-hero__sub" data-feature-sub>Pick a game, or make your own in a sentence.</p>
            <div class="home-hero__actions">
              <button type="button" class="pop-btn pop-btn--sun" data-feature-play>▶ Play</button>
              <button type="button" class="pop-btn pop-btn--white" data-surprise title="Open a game picked at random">🎲 Surprise me</button>
              <button type="button" class="pop-btn pop-btn--mint" data-feature-create>✨ Make a game</button>
            </div>
          </div>
          <div class="home-hero__stage">
            <button type="button" class="home-hero__card" data-feature-open aria-label="Open the featured game">
              <span class="home-hero__cover" data-feature-cover></span>
              <span class="home-hero__name" data-feature-name></span>
            </button>
            <div class="home-hero__dots" data-feature-dots role="tablist" aria-label="Featured games"></div>
            <span class="home-hero__float home-hero__float--a" aria-hidden="true">🎮</span>
            <span class="home-hero__float home-hero__float--b" aria-hidden="true">⭐</span>
            <span class="home-hero__float home-hero__float--c" aria-hidden="true">🏰</span>
            <span class="home-hero__float home-hero__float--d" aria-hidden="true">⚔️</span>
          </div>
        </section>
        <section class="home__studio" aria-label="Make something">
          <span>Make:</span>
          <button type="button" data-builder>a game</button>
          <button type="button" data-forge>a hero class</button>
          <button type="button" data-editor>a level by hand</button>
          <button type="button" data-library>browse the library</button>
        </section>
        <div class="home__grid" data-grid aria-live="polite"></div>
        <p class="home__empty" data-empty hidden></p>
      </main>
      <div class="home__page" data-page hidden></div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);

    const chips = this.$('[data-chips]');
    const chip = (label, genre, kids = false) => {
      const b = el('button', 'home__chip', label);
      b.type = 'button';
      b.dataset.genre = genre;
      b.style.setProperty('--chip', popColor(chips.children.length));
      if (kids) b.dataset.kids = '1';
      b.addEventListener('click', () => {
        this.query.genre = kids ? '' : genre;
        this.query.kids = kids;
        for (const c of chips.children) c.classList.toggle('is-active', c === b);
        this.refresh();
      });
      chips.appendChild(b);
      return b;
    };
    chip('All', '').classList.add('is-active');
    chip('For kids & study', '', true);
    for (const [id, g] of Object.entries(GENRES)) chip(`${GENRE_ICONS[id] ?? ''} ${g.name}`, id);
    chip(`${GENRE_ICONS['market-sim']} Stock market`, 'market-sim');
    chip(`${GENRE_ICONS['work-sim']} Work life`, 'work-sim');
    chip(`${GENRE_ICONS.strategy} Strategy`, 'strategy');
    chip(`${GENRE_ICONS.arena} Battle arena`, 'arena');
    chip(`${GENRE_ICONS.mmorpg} Online RPG`, 'mmorpg');
    chip(`${GENRE_ICONS.travel} Travel`, 'travel');
    chip(`${GENRE_ICONS.shooter} Shooter`, 'shooter');

    let typing = null;
    this.$('[data-search]').addEventListener('input', (e) => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        this.query.q = e.target.value.trim();
        this.refresh();
      }, 200);
    });
    for (const b of this.root.querySelectorAll('[data-sort]')) {
      b.addEventListener('click', () => {
        this.query.sort = b.dataset.sort;
        for (const o of this.root.querySelectorAll('[data-sort]')) o.classList.toggle('is-active', o === b);
        this.refresh();
      });
    }
    // The banner: a featured game that changes, a random pick, a shortcut to making one.
    tilt(this.$('[data-feature-open]'), { max: 12 });
    this.$('[data-feature-open]').addEventListener('click', () => this._featured && this.openPage(this._featured.id));
    this.$('[data-feature-play]').addEventListener('click', () => this._featured && this.openPage(this._featured.id));
    this.$('[data-feature-create]').addEventListener('click', (e) => {
      confetti(e.currentTarget, 40);
      actions.create();
    });
    this.$('[data-surprise]').addEventListener('click', (e) => {
      const list = this.games ?? [];
      if (!list.length) return;
      confetti(e.currentTarget, 50);
      this.openPage(list[Math.floor(Math.random() * list.length)].id);
    });
    this.$('[data-hero-banner]').addEventListener('pointerenter', () => (this._hold = true));
    this.$('[data-hero-banner]').addEventListener('pointerleave', () => (this._hold = false));
    this.$('[data-create]').addEventListener('click', () => actions.create());
    this.$('[data-builder]').addEventListener('click', () => actions.create());
    this.$('[data-forge]').addEventListener('click', () => actions.openForge());
    this.$('[data-editor]').addEventListener('click', () => actions.openEditor());
    this.$('[data-library]').addEventListener('click', () => actions.openLibrary());
    this.$('[data-hero]').addEventListener('click', () => actions.openHero('loadout'));
    this.$('[data-heroes]').addEventListener('click', () => actions.openHeroes?.());
    this.$('[data-party]').addEventListener('click', () => actions.openHero('party'));
    this.$('[data-account]').addEventListener('click', () => actions.openHero('account'));
    // A click on the dimmed space around a game's page closes it.
    this.$('[data-page]').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closePage();
    });
    // Typing here must never reach the game.
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.closePage();
    });
  }

  get isVisible() {
    return !this.root.hidden;
  }

  show() {
    this.root.hidden = false;
    document.body.classList.add('is-home');
    this.updateAccount();
    return this.refresh();
  }

  hide() {
    this.root.hidden = true;
    document.body.classList.remove('is-home');
    this.closePage();
  }

  updateAccount() {
    const account = this.actions.account();
    this.$('[data-account]').textContent = account ? account.name : 'Sign in';
  }

  async refresh() {
    const grid = this.$('[data-grid]');
    const empty = this.$('[data-empty]');
    const token = (this._token = Symbol('refresh'));
    let list = [];
    try {
      list = await this.actions.list({ q: this.query.q, genre: this.query.genre, sort: this.query.sort, limit: 120 });
    } catch (error) {
      empty.hidden = false;
      empty.textContent = `Could not load the games: ${error.message}`;
      return;
    }
    if (token !== this._token) return;
    if (this.query.kids) list = list.filter((g) => g.card?.study || g.card?.calm || ['study', 'calm-study'].includes(g.genre));
    this.games = list;
    grid.replaceChildren(this._createCard(), ...list.map((g) => this._card(g)));
    [...grid.children].forEach((c, i) => c.style.setProperty('--i', String(Math.min(i, 16))));
    this._feature(list);
    empty.hidden = list.length > 0;
    empty.textContent = this.query.q ? `No games match “${this.query.q}”. Make one?` : 'No games here yet. Make the first one!';
  }

  /** The banner's featured games: the newest official ones first, changing every few seconds. */
  _feature(list) {
    const picks = [...list.filter((g) => g.card?.badge === 'NEW'), ...list.filter((g) => g.card?.badge !== 'NEW')].slice(0, 5);
    const banner = this.$('[data-hero-banner]');
    banner.hidden = !picks.length || Boolean(this.query.q);
    clearInterval(this._rotate);
    if (banner.hidden) return;
    const dots = this.$('[data-feature-dots]');
    const show = (i) => {
      this._featureAt = (i + picks.length) % picks.length;
      const g = (this._featured = picks[this._featureAt]);
      const card = this.$('[data-feature-open]');
      card.classList.remove('is-in');
      void card.offsetWidth; // restart the pop-in
      card.classList.add('is-in');
      this.$('[data-feature-cover]').innerHTML = coverHtml(g);
      guardCovers(this.$('[data-feature-cover]'), g);
      this.$('[data-feature-name]').textContent = g.title;
      this.$('[data-feature-play]').textContent = `▶ Play ${g.title}`;
      this.$('[data-feature-sub]').textContent = g.summary ? g.summary.split('. ')[0].replace(/\.$/, '') + '.' : 'Pick a game, or make your own in a sentence.';
      [...dots.children].forEach((d, k) => d.setAttribute('aria-selected', String(k === this._featureAt)));
    };
    dots.replaceChildren(...picks.map((g, i) => {
      const d = el('button', 'home-hero__dot');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', g.title);
      d.addEventListener('click', () => show(i));
      return d;
    }));
    show(0);
    this._rotate = setInterval(() => {
      if (!this._hold && this.isVisible && this.$('[data-page]').hidden) show(this._featureAt + 1);
    }, 5000);
  }

  _createCard() {
    const card = el('button', 'home-card home-card--create');
    card.type = 'button';
    card.dataset.createCard = '';
    card.innerHTML = `<div class="home-card__cover home-card__cover--create"><span>＋</span></div>
      <div class="home-card__body"><div class="home-card__text"><strong class="home-card__title">Create a game</strong>
      <span class="home-card__meta">Describe it in a sentence, or pick from the menus</span></div></div>`;
    card.addEventListener('click', () => this.actions.create());
    return card;
  }

  _card(game) {
    const card = el('button', 'home-card');
    card.type = 'button';
    card.dataset.game = game.id;
    const c = game.card ?? {};
    const badge = c.badge ?? '';
    card.innerHTML = `
      <div class="home-card__cover">${coverHtml(game)}
        <span class="home-card__genre" title="${c.genreName ?? ''}">${GENRE_ICONS[game.genre] ?? '🎮'}</span>
        ${badge ? `<span class="home-card__badge">${badge}</span>` : ''}
      </div>
      <div class="home-card__body">
        <span class="home-card__avatar" style="--hue:${hue(game.author)}" aria-hidden="true">${(game.author || '?')[0].toUpperCase()}</span>
        <div class="home-card__text">
          <strong class="home-card__title"></strong>
          <span class="home-card__meta"></span>
          <span class="home-card__tags"></span>
        </div>
      </div>`;
    card.querySelector('.home-card__title').textContent = game.title;
    card.querySelector('.home-card__meta').textContent = [game.author, plays(game.plays ?? 0), game.official ? 'Official' : ago(game.updated)].filter(Boolean).join(' · ');
    const tags = card.querySelector('.home-card__tags');
    for (const tag of [c.genreName, c.study && 'Study', c.calm && 'No monsters', c.worldName].filter(Boolean)) tags.append(el('span', null, tag));
    guardCovers(card, game);
    card.addEventListener('click', () => this.openPage(game.id));
    return tilt(card);
  }

  /* ---- a game's own page ---- */

  async openPage(id) {
    const page = this.$('[data-page]');
    page.hidden = false;
    page.innerHTML = '<div class="home-page__card"><p class="home__empty">Loading…</p></div>';
    let game;
    try {
      game = await this.actions.get(id);
    } catch (error) {
      page.innerHTML = '';
      const box = el('div', 'home-page__card');
      box.append(el('p', 'home__empty', `Could not open this game: ${error.message}`));
      page.append(box);
      return;
    }
    const heroes = await this.actions.heroes().catch(() => []);
    const c = game.card ?? {};
    page.innerHTML = `
      <div class="home-page__card" role="dialog" aria-modal="true" aria-label="${game.title.replace(/"/g, '&quot;')}">
        <button type="button" class="home-page__close" data-close aria-label="Close">✕</button>
        <div class="home-page__cover">${coverHtml(game)}</div>
        <div class="home-page__info">
          <h2 class="home-page__title"></h2>
          <p class="home-page__meta"></p>
          <p class="home-page__summary"></p>
          <div class="home-card__tags home-page__tags"></div>
          <ol class="home-page__chapters" data-chapters></ol>
          <div class="home-page__play">
            <span class="home-page__hero" data-play-hero></span>
            <button type="button" class="home__btn home__btn--primary home-page__go" data-play>▶ Play</button>
            <button type="button" class="home__btn" data-play-party title="Make a party first: when you press Play, everyone in it comes along">Play together</button>
            ${game.owner && game.owner === this.actions.account()?.id ? '<button type="button" class="home__btn home__btn--danger" data-remove>Remove</button>' : ''}
          </div>
          <p class="home-page__hint">In a party? Press Play — your party comes with you.</p>
        </div>
      </div>`;
    guardCovers(page, game);
    page.querySelector('.home-page__title').textContent = game.title;
    page.querySelector('.home-page__meta').textContent = [game.author, plays(game.plays ?? 0), game.official ? 'Official' : ago(game.updated), cardLine(c)].filter(Boolean).join(' · ');
    page.querySelector('.home-page__summary').textContent = game.summary || '';
    const tags = page.querySelector('.home-page__tags');
    for (const tag of [c.genreName, c.study && 'Study', c.calm && 'No monsters', c.worldName, c.hero && `Hero: ${heroes.find((h) => h.id === c.hero)?.name ?? c.hero}`].filter(Boolean)) tags.append(el('span', null, tag));
    const chapters = page.querySelector('[data-chapters]');
    for (const level of game.levels ?? []) {
      if (typeof level === 'string') continue;
      chapters.append(el('li', null, level.name));
    }
    chapters.hidden = !chapters.children.length || chapters.children.length < 2;
    // Each game has its own character for you: who it is, or that you will choose.
    const mine = this.actions.heroOf(game.id);
    const choices = this.actions.rosterHeroes(game.roster ?? []);
    const named = choices.find((h) => h.id === mine) ?? heroes.find((h) => h.id === mine);
    page.querySelector('[data-play-hero]').textContent = game.engine === 'market'
      ? 'Your own run: a million to start, a year to play, at your pace'
      : game.engine === 'work'
        ? 'Your own career, in real time: today\'s news is today\'s work'
        : game.engine === 'rts'
        ? 'Pick your faction, the map and your rivals when you play'
        : game.engine === 'moba'
        ? 'Pick your champion and side when you play — alone with bots, or with friends'
        : game.engine === 'mmo'
        ? 'Your characters live on your account: sign in to play'
        : game.engine === 'city'
        ? 'Fly over the city or walk its streets — no character to make'
        : game.engine === 'fps'
        ? 'Pick your side and the bots\' skill when you play — alone, or in a room with friends'
        : named
        ? `You play as ${named.name} here`
        : `You choose your character when you play: ${choices.length} to pick from`;
    if (['market', 'work', 'rts', 'moba', 'mmo', 'city', 'fps'].includes(game.engine)) {
      page.querySelector('[data-play-party]').remove();
      page.querySelector('.home-page__hint').textContent = game.engine === 'fps'
        ? 'Play with up to four friends from inside the game: one makes a room, the others join with its code. Bots fill the other seats. Best with a mouse and keyboard.'
        : game.engine === 'city'
        ? 'Every building is from Korea\'s public building register (국토교통부 GIS건물통합정보, KOGL type 1). The districts you visit are kept on this device.'
        : game.engine === 'mmo'
        ? 'Groups of up to eight share a world. Invite friends by name inside the game; guilds, chat and trading work across the whole server.'
        : game.engine === 'moba'
        ? 'Play with friends from inside the game: one makes a party, the others join with its code. Bots fill the empty seats.'
        : game.engine === 'rts'
        ? 'You against up to three computer players, on maps up to 512 m across. Your wins are kept on this device.'
        : game.engine === 'work'
        ? 'Game money only: your pay goes to your wallet, which the Stock Market Challenge can invest. Sign in to keep your job.'
        : 'Game money only. Sign in to keep your run and be on the leaderboard.';
    }
    page.querySelector('[data-close]').addEventListener('click', () => this.closePage());
    page.querySelector('[data-play]').addEventListener('click', async (e) => {
      confetti(e.currentTarget);
      e.currentTarget.disabled = true;
      await this.actions.play(game.id);
    });
    page.querySelector('[data-play-party]')?.addEventListener('click', () => this.actions.openHero('party'));
    page.querySelector('[data-remove]')?.addEventListener('click', async () => {
      await this.actions.remove(game.id);
      this.closePage();
      this.refresh();
    });
    page.querySelector('[data-play]').focus();
  }

  closePage() {
    const page = this.$('[data-page]');
    page.hidden = true;
    page.replaceChildren();
  }
}
