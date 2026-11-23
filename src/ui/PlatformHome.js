import { GENRES } from '../blueprints/genres.js';
import { cardLine } from '../platform/gameCards.js';
import { GENRE_ICONS, coverHtml, guardCovers } from './gameCover.js';
import { tilt, confetti, popColor } from './pop.js';
import { ChannelPage } from './ChannelPage.js';
import { music } from '../shared/music.js';

/**
 * The home page's music: First Light, quiet (this share of the player's music
 * volume), starting only on the first click or key (music.js waits for one).
 * The ♪ button in the bar switches music off and on — the global setting
 * (music.js, localStorage 'gamory.music'), so off here starts every game with
 * its music off too; a game's own Music menu can turn it back on, which is the
 * same switch. The ▾ beside it opens the music volume (also global).
 */
const HOME_MUSIC = { track: 'title', level: 0.35 };

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
      <header class="home__bar" data-bar>
        <div class="home__brand"><span class="home__logo" aria-hidden="true">◆</span> Gamory</div>
        <label class="home__search" data-search-box>
          <span class="home__search-icon" aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search games, worlds and makers" aria-label="Search games" data-search />
        </label>
        <button type="button" class="home__btn home__icon-btn home__search-open" data-search-open aria-label="Search games" title="Search games"><span class="home__ico" aria-hidden="true">⌕</span></button>
        <button type="button" class="home__btn home__icon-btn home__music-toggle" data-music-toggle aria-pressed="true" aria-label="Music on" title="Music on or off — here and in every game (saved)"><span class="home__ico home__music-note" aria-hidden="true">♪</span></button>
        <button type="button" class="home__btn home__icon-btn home__nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="home-nav" aria-label="Menu" title="Menu"><span class="home__ico" aria-hidden="true">☰</span></button>
        <div class="home__scrim" data-nav-scrim hidden></div>
        <nav class="home__actions" id="home-nav" data-nav aria-label="Gamory">
          <button type="button" class="home__btn home__icon-btn home__nav-close" data-nav-close aria-label="Close the menu" title="Close (Esc)"><span class="home__ico" aria-hidden="true">✕</span></button>
          <button type="button" class="home__btn home__btn--primary home__create" data-create><span class="home__ico" aria-hidden="true">＋</span><span>Create</span></button>
          <div class="home__space" data-space>
            <button type="button" class="home__btn home__space-toggle" data-space-toggle aria-haspopup="true" aria-expanded="false" aria-controls="home-space-menu" title="Your channel, your heroes, the arena and parties"><span class="home__ico" aria-hidden="true">🙂</span><span>My space</span><span class="home__caret" aria-hidden="true"></span></button>
            <div class="home__space-menu" id="home-space-menu" data-space-menu role="menu" aria-label="My space">
              <button type="button" class="home__menu-item" role="menuitem" data-channel title="Your own space: the games you make, your playlists, your badges — public or private, with a link to share"><span class="home__ico" aria-hidden="true">📺</span><span>My channel</span></button>
              <button type="button" class="home__menu-item" role="menuitem" data-heroes title="Your heroes in every game: levels, bags and equipment"><span class="home__ico" aria-hidden="true">🦸</span><span>My heroes</span></button>
              <button type="button" class="home__menu-item" role="menuitem" data-hero title="The free-play arena's hero: class, weapon, skills and stash"><span class="home__ico" aria-hidden="true">⚔️</span><span>Arena hero</span></button>
              <button type="button" class="home__menu-item" role="menuitem" data-party title="Make a party or join one with a code"><span class="home__ico" aria-hidden="true">🤝</span><span>Play together</span></button>
              <div class="home__menu-music" role="group" aria-label="Music">
                <label for="home-music-volume"><span class="home__ico" aria-hidden="true">♪</span> Music volume</label>
                <input id="home-music-volume" type="range" min="0" max="100" step="5" data-home-music-volume />
                <small>Music: ACE-Step 1.5 (MIT)</small>
              </div>
            </div>
          </div>
          <button type="button" class="home__btn home__btn--account" data-account title="Sign in, or your account">Sign in</button>
        </nav>
      </header>
      <div class="home__filters">
        <div class="home__chipwrap" data-chipwrap>
          <button type="button" class="home__chip-arrow home__chip-arrow--left" data-chips-left aria-label="Scroll the genres left" title="More genres" tabindex="-1">‹</button>
          <div class="home__chips" data-chips role="toolbar" aria-label="Filter by genre"></div>
          <button type="button" class="home__chip-arrow home__chip-arrow--right" data-chips-right aria-label="Scroll the genres right" title="More genres" tabindex="-1">›</button>
        </div>
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
        for (const c of chips.children) {
          c.classList.toggle('is-active', c === b);
          c.setAttribute('aria-pressed', String(c === b));
        }
        b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
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
    chip(`${GENRE_ICONS.racing} Racing`, 'racing');
    chip(`${GENRE_ICONS.coop} Co-op`, 'coop');
    chip(`${GENRE_ICONS.sports} Sports`, 'sports');
    chip(`${GENRE_ICONS.learning} Learning`, 'learning');
    chip(`${GENRE_ICONS.rpg} Fantasy RPG`, 'rpg');
    chip(`${GENRE_ICONS['monster-hunt']} Monster hunt`, 'monster-hunt');
    chip(`${GENRE_ICONS.creatures} Creatures`, 'creatures');
    chip(`${GENRE_ICONS.action} Action`, 'action');

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
    /** Channels: a maker's own space (ui/ChannelPage.js), over the home page. */
    this.channel = new ChannelPage(this.root, {
      account: () => actions.account(),
      signIn: () => actions.openHero('account'),
      play: (id) => actions.play(id),
      create: () => actions.create(),
      list: (params) => actions.list(params)
    });
    this.$('[data-channel]').addEventListener('click', () => this.channel.openMine());
    this.$('[data-party]').addEventListener('click', () => actions.openHero('party'));
    this.$('[data-account]').addEventListener('click', () => actions.openHero('account'));
    this.$('[data-music-toggle]').addEventListener('click', () => {
      music.toggleMute();
      this._musicButton();
      if (!music.muted) this._music();
    });
    this.$('[data-home-music-volume]').addEventListener('input', (e) => music.setVolume(Number(e.target.value) / 100));
    this._navMenus();
    this._chipScroller();
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
    this._music();
    this.updateAccount();
    // A channel's link in the address opens it; one already open shows the new time and done marks.
    if (!this._routed) {
      this._routed = true;
      this.channel.route();
    } else this.channel.onShow();
    return this.refresh();
  }

  hide() {
    this._closeMenus?.();
    this.root.hidden = true;
    document.body.classList.remove('is-home');
    // A game brings its own music (or none): the home page's fades out.
    this._musicStop();
    this.closePage();
  }

  /** A game opened over the home page (App.openLobby): its music, or quiet, until musicBack(). */
  musicAway() {
    this._away = true;
    this._musicStop();
  }

  /** That game closed: First Light again, if the home page is what's showing. */
  musicBack() {
    this._away = false;
    if (this.isVisible) this._music();
  }

  _musicStop() {
    if (!this._musicOn) return;
    this._musicOn = false;
    if (!music.current || music.current.id === HOME_MUSIC.track) music.stop({ fade: 0.8 });
  }

  /** First Light, quietly, while the home page is up (after the first click or key: music.js waits for one). */
  _music() {
    this._musicButton();
    if (music.muted || this._away) return;
    this._musicOn = true;
    music.setTrim(HOME_MUSIC.level, { fade: 0.3 });
    music.play(HOME_MUSIC.track, { fade: 2.5 }).catch(() => (this._musicOn = false));
  }

  _musicButton() {
    const b = this.$('[data-music-toggle]');
    const on = !music.muted;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Music on' : 'Music off');
    b.title = on ? 'Music is on — click to turn it off, here and in every game' : 'Music is off — click to turn it on, here and in every game';
    b.classList.toggle('is-off', !on);
    this.$('[data-home-music-volume]').value = String(Math.round(music.volume * 100));
  }

  /**
   * The bar's menus: "My space" (a dropdown: arrow keys, Esc closes and puts
   * focus back) and, on a phone, ☰ (a drawer with everything, Create first)
   * and ⌕ (the search, full width). Picking an item closes them.
   */
  _navMenus() {
    const bar = this.$('[data-bar]');
    const space = this.$('[data-space]');
    const toggle = this.$('[data-space-toggle]');
    const items = () => [...this.$('[data-space-menu]').querySelectorAll('[role="menuitem"]')];
    const navBtn = this.$('[data-nav-toggle]');
    const nav = this.$('[data-nav]');
    const scrim = this.$('[data-nav-scrim]');
    const drawer = () => getComputedStyle(navBtn).display !== 'none';
    const openSpace = (on, focus = false) => {
      space.classList.toggle('is-open', on);
      toggle.setAttribute('aria-expanded', String(on));
      if (on) this._musicButton();
      if (on && focus) items()[0]?.focus();
    };
    const openNav = (on) => {
      bar.classList.toggle('is-nav-open', on);
      navBtn.setAttribute('aria-expanded', String(on));
      scrim.hidden = !on;
      if (on) {
        this._musicButton();
        this.$('[data-create]').focus();
      } else if (nav.contains(document.activeElement)) navBtn.focus();
    };
    this._closeMenus = () => {
      openSpace(false);
      if (bar.classList.contains('is-nav-open')) openNav(false);
      bar.classList.remove('is-searching');
    };
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      openSpace(!space.classList.contains('is-open'), e.detail === 0);
    });
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openSpace(true, true);
      }
    });
    this.$('[data-space-menu]').addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
        list[n].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        list[e.key === 'Home' ? 0 : list.length - 1].focus();
      }
    });
    for (const b of items()) b.addEventListener('click', () => this._closeMenus());
    this.$('[data-create]').addEventListener('click', () => this._closeMenus());
    this.$('[data-account]').addEventListener('click', () => this._closeMenus());
    navBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNav(!bar.classList.contains('is-nav-open'));
    });
    scrim.addEventListener('click', () => openNav(false));
    this.$('[data-nav-close]').addEventListener('click', () => openNav(false));
    this.$('[data-search-open]').addEventListener('click', () => {
      bar.classList.add('is-searching');
      this.$('[data-search]').focus();
    });
    this.$('[data-search]').addEventListener('blur', (e) => {
      if (!e.target.value) bar.classList.remove('is-searching');
    });
    // A click elsewhere closes the dropdown (not the drawer: its scrim does that).
    document.addEventListener('pointerdown', (e) => {
      if (space.classList.contains('is-open') && !e.target.closest?.('[data-space]') && !drawer()) openSpace(false);
    });
    // Esc: the innermost thing open closes, and focus goes back to what opened it.
    this.root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (space.classList.contains('is-open') && !drawer()) {
        openSpace(false);
        toggle.focus();
        e.stopImmediatePropagation();
      } else if (bar.classList.contains('is-nav-open')) {
        openNav(false);
        e.stopImmediatePropagation();
      } else if (bar.classList.contains('is-searching')) {
        bar.classList.remove('is-searching');
        this.$('[data-search-open]').focus();
        e.stopImmediatePropagation();
      }
    });
    // Tab stays inside the open drawer.
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !bar.classList.contains('is-nav-open')) return;
      const f = [...nav.querySelectorAll('button, input')].filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    });
  }

  /** The genre chips: one scrolling row, soft fading edges where there's more, ‹ › to page through it. */
  _chipScroller() {
    const wrap = this.$('[data-chipwrap]');
    const chips = this.$('[data-chips]');
    const edges = () => {
      wrap.classList.toggle('can-left', chips.scrollLeft > 2);
      wrap.classList.toggle('can-right', chips.scrollLeft + chips.clientWidth < chips.scrollWidth - 2);
    };
    const page = (dir) => chips.scrollBy({ left: dir * Math.max(160, chips.clientWidth * 0.7), behavior: 'smooth' });
    this.$('[data-chips-left]').addEventListener('click', () => page(-1));
    this.$('[data-chips-right]').addEventListener('click', () => page(1));
    chips.addEventListener('scroll', edges, { passive: true });
    new ResizeObserver(edges).observe(chips);
    // A mouse wheel scrolls the row sideways.
    chips.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && chips.scrollWidth > chips.clientWidth) {
        chips.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
    this._chipEdges = edges;
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
        ? 'Race at night, or drive, walk and fly the city — no character to make'
        : game.engine === 'fps'
        ? 'Pick your side and the bots\' skill when you play — alone, or in a room with friends'
        : game.engine === 'stoneball'
        ? 'Pick your tribe\'s leather, the computer\'s skill and the match length when you play'
        : game.engine === 'arcademia'
        ? 'Pick a buddy and climb the mountain: stars are kept on your account, or on this device when signed out'
        : game.engine === 'gloamreach'
        ? 'Choose your hero when you play: a knight, a ranger or a mage'
        : game.engine === 'wyldhunt'
        ? 'Choose your hunter\'s armour when you play: Ironbark, Mosscale or Fernstalker — every hunter carries a greatblade and a bow'
        : game.engine === 'kithvale'
        ? 'Choose your look when you play: Sprout, Wren or Pip — your friends and journal are kept on this device'
        : game.engine === 'kindlewatch'
        ? 'Choose your hero when you play: the Hornwarden (sword and shield) or the Veilrunner (spear and lantern)'
        : game.engine === 'snowpuff'
        ? 'Choose your rider, nickname and mountain when you play: Pip the fox, Mallow the bunny, Toffee the bear, Mochi the cat or Pickle the frog'
        : game.engine === 'circuitlab'
        ? 'No character: open the lab and pick a lesson — your bench is kept on this device'
        : game.engine === 'hd2d'
        ? 'Pick your class — Blade, Warden, Seer or Ranger — and a look; your journey is kept on this device'
        : game.engine === 'squad'
        ? 'Grave Purge or Hold the Outpost — pick when you play, alone with bots or with friends'
        : named
        ? `You play as ${named.name} here`
        : `You choose your character when you play: ${choices.length} to pick from`;
    if (['market', 'work', 'rts', 'moba', 'mmo', 'city', 'fps', 'squad', 'hd2d', 'stoneball', 'arcademia', 'gloamreach', 'wyldhunt', 'kithvale', 'kindlewatch', 'snowpuff', 'circuitlab'].includes(game.engine)) {
      page.querySelector('[data-play-party]').remove();
      page.querySelector('.home-page__hint').textContent = game.engine === 'snowpuff'
        ? 'For kids: a snowboard race down three mountains. A/D or the arrows to steer, S or Shift to tuck, Space to jump (hold for more air; spin and flip in the air), 1 and 2 use the items from gift boxes (snowballs, a giant snowball, a shield, a rocket sled, an ice patch), H for How to play, Esc to pause. Race with friends from inside the game with a five-letter room code. Touch and gamepads work too; it picks its own detail level.'
        : game.engine === 'circuitlab'
        ? 'For an electrical-engineering class. Pick parts from Parts, click holes to place them, W to wire, Space to run; the Code panel (C) holds a board\'s sketch and its serial monitor, Lessons (L) loads a ready circuit, H lists every key. Left-drag orbits, Q and E turn the view. Best on a computer; Studio mode ray-traces the bench.'
        : game.engine === 'kindlewatch'
        ? 'A top-down action game\'s first map: no story yet. WASD to move, the mouse to aim; left click strikes (tap three times for a chain, hold for a charged blow), right click throws, Space dashes, Q summons, R drinks a draught (no cooldown), E lights or douses a fire, Esc for the menu and credits. Gamepads work too, and on a phone there\'s a stick and buttons.'
        : game.engine === 'kithvale'
        ? 'A creature-befriending adventure\'s first map: no story yet. WASD to move, Shift to run faster, Space to jump, hold Ctrl to creep up quietly; 1–3 to pick a treat and Q (or right-click) to toss it, E to talk, gather and breathe with a creature that trusts you, J for your journal, Esc for the menu and credits. On a phone: a stick, buttons and a drag to look. It lowers its own detail if frames run slow.'
        : game.engine === 'wyldhunt'
        ? 'A monster hunt\'s first map: no story yet. WASD to move, Shift to sprint, Space to roll; left and right mouse to strike (hold to charge), Tab for the bow, E to gather, carve and mount, X to whistle for your mount, hold R to let it run the path, 1–4 for items, B for your bag, Esc for the menu and credits. Best with a mouse and keyboard on a computer with a good graphics card; it lowers its own detail if frames run slow.'
        : game.engine === 'gloamreach'
        ? 'The first map of a fantasy RPG — explore it, no quests yet. WASD to move, Shift to sprint, Ctrl to walk, Space to jump; click to steer with the mouse, wheel to zoom, Esc for the menu and credits. Best with a mouse and keyboard on a computer with a good graphics card; it lowers its own detail if frames run slow.'
        : game.engine === 'arcademia'
        ? 'For ages 6 to 13. Click or tap to walk, or use WASD; walk into a building for a lesson. Grown-ups: the Parents button shows a weekly report behind a PIN. The AI tutor, Professor Hoot, is part of Plus — every lesson has its own hints and worked answers for everyone.'
        : game.engine === 'stoneball'
        ? 'You against the computer, three a side. WASD to run, Shift to sprint, hold Space to charge a shot, E to pass, Q to switch.'
        : game.engine === 'hd2d'
        ? 'Alone, or with up to three friends: press P in the game to make a party and share its code. WASD to move, Space to strike, 1–4 for skills, I for your bag. Best with a keyboard.'
        : game.engine === 'squad'
        ? 'Play with up to three friends from inside the game: one makes a room, the others join with its code. Bots take the empty places.'
        : game.engine === 'fps'
        ? 'Play with up to four friends from inside the game: one makes a room, the others join with its code. Bots fill the other seats. Best with a mouse and keyboard.'
        : game.engine === 'city'
        ? 'Race with up to four friends from inside the game: one makes a room, the others join with its code; bots fill the empty seats. Every building is from Korea\'s public building register (국토교통부 GIS건물통합정보, KOGL type 1).'
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
