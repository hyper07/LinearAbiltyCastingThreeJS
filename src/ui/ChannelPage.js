import { channels } from '../platform/channelClient.js';
import { GENRE_ICONS, coverHtml, guardCovers } from './gameCover.js';
import { confetti } from './pop.js';

/**
 * A channel: a maker's own space, laid out like a video channel — a banner,
 * a name and handle, tabs; their games as cards, their playlists as shelves
 * to play through in order (a course's chapters, a series), what they have
 * achieved (time played, badges, mistakes found in generated games), and —
 * for the owner — the tools: make a game, public or private, playlists, the
 * channel's look, its link to share.
 *
 *   #/c/<handle>            a channel's link
 *   #/c/<handle>?key=<key>  a private channel's link (everything in it shown)
 */

const h = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const btn = (cls, text, on, title) => {
  const b = h('button', cls, text);
  b.type = 'button';
  if (title) b.title = title;
  if (on) b.addEventListener('click', on);
  return b;
};
const COLORS = {
  violet: ['#2a1a40', '#5f3f88', '#b49ae0'], ember: ['#6e2a1c', '#d9653a', '#ffbf80'], ice: ['#1c2c5a', '#4a8cc4', '#d8f6ff'], grass: ['#1f3a2a', '#4a7d3c', '#b0d86a'],
  gold: ['#5a3210', '#c48a1c', '#fff0a0'], blood: ['#3a0c18', '#a42028', '#ff7a5a'], steel: ['#1c2434', '#56708a', '#cfe2ea'], poison: ['#16301c', '#3c8a34', '#c8f06a']
};
/** 75 → "1 min", 4000 → "1 h 06 min". */
export const playTime = (s) => {
  s = Math.round(s ?? 0);
  if (s < 60) return s > 0 ? '<1 min' : '—';
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};
const count = (n, word) => `${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} ${word}${n === 1 ? '' : 's'}`;
const STAT_TILES = [
  ['seconds', 'Time played', (v) => playTime(v)], ['games', 'Games played'], ['done', 'Games finished'], ['published', 'Games published'],
  ['playsReceived', 'Plays of their games'], ['found', 'Mistakes found'], ['confirmed', 'Confirmed by makers']
];

export class ChannelPage {
  /**
   * @param {HTMLElement} host the home page's root
   * @param {{
   *   account: () => { id: number, name: string }|null, signIn: () => void,
   *   play: (id: string) => Promise<void>, create: () => void,
   *   list: (params: object) => Promise<object[]>
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.root = h('div', 'chan');
    this.root.hidden = true;
    host.appendChild(this.root);
    this.tab = 'home';
    /** The playlist being played through: `{ id, at }` (which game is selected). */
    this.watch = null;
    this.progress = {};
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key !== 'Escape' || this._closeDialog()) return;
      if (this.watch) this._leaveWatch();
      else this.close();
    });
    addEventListener('hashchange', () => this.route());
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /** Open what the address names, if it names a channel. */
  route() {
    const m = /^#\/c\/([a-z0-9-]{3,30})(?:\?key=([a-f0-9]{6,40}))?$/.exec(location.hash);
    if (m) this.open(m[1], m[2] ?? null);
    return Boolean(m);
  }

  /** My own channel (signing in first if need be). */
  async openMine() {
    if (!this.actions.account()) {
      this._message('Your channel', 'Sign in to get your own channel: a page for the games you make, your playlists and your badges.', [['Sign in', () => { this.close(); this.actions.signIn(); }]]);
      return;
    }
    await this.open(null);
  }

  async open(handle, key = null) {
    this.root.hidden = false;
    this.handle = handle;
    this.key = key;
    this.tab = 'home';
    this.watch = null;
    this.root.replaceChildren(h('p', 'chan__wait', 'Loading…'));
    await this.reload();
  }

  close() {
    this.root.hidden = true;
    this.root.replaceChildren();
    if (location.hash.startsWith('#/c/')) history.replaceState(null, '', location.pathname + location.search);
  }

  /** Back from a game: the time and done marks are new. */
  async onShow() {
    if (this.isOpen && this.channel) await this.reload();
  }

  async reload() {
    try {
      this.channel = this.handle ? await channels.get(this.handle, this.key) : await channels.mine();
      this.progress = this.actions.account() ? await channels.progress().catch(() => ({})) : {};
      this.reportsData = this.channel.owner ? await channels.reports().catch(() => null) : null;
    } catch (error) {
      this.channel = null;
      this._message(error.status === 404 ? 'No channel here' : 'Could not open the channel', error.status === 404 ? 'It does not exist, or it is private. A private channel opens only with its private link.' : error.message, []);
      return;
    }
    this.handle = this.channel.handle;
    this.render();
  }

  link() {
    const c = this.channel;
    const key = c.visibility === 'private' ? c.key ?? this.key : null;
    return `${location.origin}${location.pathname}#/c/${c.handle}${key ? `?key=${key}` : ''}`;
  }

  _message(title, text, actions) {
    this.root.hidden = false;
    const box = h('div', 'chan__message');
    box.append(h('h2', null, title), h('p', null, text));
    const row = h('div', 'chan__row');
    for (const [label, on] of actions) row.append(btn('chan-btn chan-btn--primary', label, on));
    row.append(btn('chan-btn', '← Back to all games', () => this.close()));
    box.append(row);
    this.root.replaceChildren(box);
  }

  /* ---- the page ---- */

  render() {
    const c = this.channel;
    const [dark, mid, light] = COLORS[c.color] ?? COLORS.violet;
    this.root.style.setProperty('--chan-dark', dark);
    this.root.style.setProperty('--chan-mid', mid);
    this.root.style.setProperty('--chan-light', light);
    const top = h('header', 'chan__top');
    top.append(btn('chan-btn chan-btn--ghost', '← All games', () => this.close()), h('span', 'chan__crumb', this.watch ? `${c.name} › ${this._list()?.title ?? ''}` : c.name));
    if (!c.owner && this.actions.account()) top.append(btn('chan-btn', '📺 My channel', () => this.open(null)));
    const scroll = h('div', 'chan__scroll');
    if (this.watch && this._list()) scroll.append(this._watch());
    else scroll.append(this._header(), this._tabs(), this._body());
    this.root.replaceChildren(top, scroll);
  }

  _header() {
    const c = this.channel;
    const wrap = h('section', 'chan__head');
    const banner = h('div', 'chan__banner');
    banner.append(h('span', 'chan__banner-art'));
    const row = h('div', 'chan__id');
    const avatar = h('span', 'chan__avatar', (c.name || '?')[0].toUpperCase());
    const info = h('div', 'chan__info');
    const name = h('h1', 'chan__name', c.name);
    name.append(h('span', `chan__vis chan__vis--${c.visibility}`, c.visibility === 'private' ? '🔒 Private' : '🌐 Public'));
    const plays = c.games.reduce((s, g) => s + (g.plays ?? 0), 0);
    info.append(name, h('p', 'chan__meta', [`@${c.handle}`, count(c.games.length, 'game'), count(c.playlists.length, 'playlist'), count(plays, 'play')].join(' · ')));
    if (c.about) info.append(h('p', 'chan__about', c.about));
    if (c.invited) info.append(h('p', 'chan__note', 'You opened this channel with its private link: you see everything in it.'));
    const actions = h('div', 'chan__row');
    actions.append(btn('chan-btn chan-btn--primary', '🔗 Share', (e) => this._share(e.currentTarget), 'Copy this channel\'s link'));
    if (c.owner) {
      actions.append(
        btn('chan-btn', '✨ Make a game', () => this.actions.create(), 'Open the Game builder; what you publish lands here'),
        btn('chan-btn', '＋ New playlist', () => this._editPlaylist(null)),
        btn('chan-btn', '⚙ Customize', () => this._customize())
      );
    }
    info.append(actions);
    row.append(avatar, info);
    wrap.append(banner, row);
    return wrap;
  }

  _tabs() {
    const c = this.channel;
    const open = this.reportsData?.inbox.filter((r) => r.status === 'open').length ?? 0;
    const tabs = [['home', 'Home'], ['games', `Games ${c.games.length}`], ['playlists', `Playlists ${c.playlists.length}`], ['achievements', 'Achievements']];
    if (c.owner) tabs.push(['mistakes', `Mistakes found${open ? ` (${open})` : ''}`]);
    const nav = h('nav', 'chan__tabs');
    nav.setAttribute('role', 'tablist');
    for (const [id, label] of tabs) {
      const b = btn(`chan__tab${this.tab === id ? ' is-active' : ''}`, label, () => {
        this.tab = id;
        this.render();
      });
      b.setAttribute('role', 'tab');
      b.dataset.tab = id;
      b.setAttribute('aria-selected', String(this.tab === id));
      nav.append(b);
    }
    return nav;
  }

  _body() {
    const body = h('div', 'chan__body');
    const c = this.channel;
    if (this.tab === 'home') {
      const next = this._continue();
      if (next) body.append(next);
      for (const p of c.playlists) if (p.games.length) body.append(this._shelf(p));
      if (c.games.length) {
        const s = h('section', 'chan-shelf');
        s.append(this._shelfHead('Latest games', null, [['See all', () => { this.tab = 'games'; this.render(); }]]), this._strip(c.games.slice(0, 12)));
        body.append(s);
      }
      if (!c.games.length && !c.playlists.length) body.append(this._empty());
    } else if (this.tab === 'games') {
      if (!c.games.length) body.append(this._empty());
      const grid = h('div', 'chan__grid');
      for (const g of c.games) grid.append(this._card(g, { manage: c.owner }));
      body.append(grid);
    } else if (this.tab === 'playlists') {
      if (!c.playlists.length) body.append(h('p', 'chan__hint', c.owner ? 'No playlists yet. A playlist puts games in an order to play through — the chapters of a course, the parts of a series.' : 'No playlists here yet.'));
      const grid = h('div', 'chan__grid');
      for (const p of c.playlists) grid.append(this._playlistCard(p));
      if (c.owner) body.append(btn('chan-btn chan-btn--primary', '＋ New playlist', () => this._editPlaylist(null)));
      body.append(grid);
    } else if (this.tab === 'achievements') body.append(this._achievements());
    else if (this.tab === 'mistakes') body.append(this._mistakes());
    return body;
  }

  _empty() {
    const c = this.channel;
    const box = h('div', 'chan__hint');
    box.append(h('p', null, c.owner ? 'Your channel is empty. Make a game — describe it in a sentence — and publish it: it shows up here, public or private. Then put games in a playlist to play through in order.' : 'Nothing published here yet.'));
    if (c.owner) box.append(btn('chan-btn chan-btn--primary', '✨ Make your first game', () => this.actions.create()));
    return box;
  }

  /** The viewer's own next game in one of this channel's playlists. */
  _continue() {
    for (const p of this.channel.playlists) {
      const started = p.games.some((g) => this.progress[g.id]);
      const at = p.games.findIndex((g) => !this.progress[g.id]?.done);
      if (!started || at < 0) continue;
      const g = p.games[at];
      const s = h('section', 'chan-next');
      const cover = h('div', 'chan-next__cover');
      cover.innerHTML = coverHtml(g);
      guardCovers(cover, g);
      const text = h('div', 'chan-next__text');
      text.append(h('span', 'chan-next__kicker', `Keep going · ${p.title} · ${at + 1} of ${p.games.length}`), h('strong', null, g.title), h('span', 'chan__meta', this.progress[g.id] ? `${playTime(this.progress[g.id].seconds)} played` : 'Not started'));
      const row = h('div', 'chan__row');
      row.append(btn('chan-btn chan-btn--primary', '▶ Continue', () => this._play(g, p, at)), btn('chan-btn', 'Open the playlist', () => this._openList(p, at)));
      text.append(row);
      s.append(cover, text);
      return s;
    }
    return null;
  }

  _shelfHead(title, sub, actions = []) {
    const head = h('div', 'chan-shelf__head');
    const t = h('div');
    t.append(h('h2', null, title));
    if (sub) t.append(h('span', 'chan__meta', sub));
    head.append(t);
    for (const [label, on, cls] of actions) head.append(btn(`chan-btn ${cls ?? ''}`, label, on));
    return head;
  }

  _strip(games, list = null) {
    const strip = h('div', 'chan-shelf__strip');
    games.forEach((g, i) => strip.append(this._card(g, { index: list ? i : null, list })));
    return strip;
  }

  _doneCount(p) {
    return p.games.filter((g) => this.progress[g.id]?.done).length;
  }

  _shelf(p) {
    const s = h('section', 'chan-shelf');
    s.dataset.playlist = p.id;
    const done = this._doneCount(p);
    const actions = [['▶ Play all', () => this._openList(p, Math.max(0, p.games.findIndex((g) => !this.progress[g.id]?.done))), 'chan-btn--primary']];
    if (this.channel.owner) actions.push(['Edit', () => this._editPlaylist(p)]);
    s.append(this._shelfHead(`${p.visibility === 'private' ? '🔒 ' : ''}${p.title}`, [count(p.games.length, 'game'), this.actions.account() ? `${done} of ${p.games.length} done` : null, p.summary].filter(Boolean).join(' · '), actions), this._strip(p.games, p));
    return s;
  }

  _card(g, { index = null, list = null, manage = false } = {}) {
    const card = h('article', 'chan-card');
    card.dataset.game = g.id;
    const mine = this.progress[g.id];
    const cover = btn('chan-card__cover', null, () => (list ? this._openList(list, index) : this._openGame(g)));
    cover.innerHTML = coverHtml(g);
    cover.setAttribute('aria-label', `Open ${g.title}`);
    if (index != null) cover.append(h('span', 'chan-card__index', String(index + 1)));
    if (mine?.done) cover.append(h('span', 'chan-card__done', '✓ Done'));
    else if (mine?.seconds) cover.append(h('span', 'chan-card__time', playTime(mine.seconds)));
    if (g.visibility === 'private') cover.append(h('span', 'chan-card__lock', '🔒 Private'));
    const text = h('div', 'chan-card__text');
    text.append(h('strong', 'chan-card__title', g.title), h('span', 'chan__meta', [`${GENRE_ICONS[g.genre] ?? '🎮'} ${g.card?.genreName ?? ''}`.trim(), count(g.plays ?? 0, 'play'), g.official ? 'Official' : g.author].filter(Boolean).join(' · ')));
    card.append(cover, text);
    if (manage) {
      const row = h('div', 'chan-card__manage');
      row.append(
        btn('chan-btn chan-btn--small', g.visibility === 'private' ? '🌐 Make public' : '🔒 Make private', async () => {
          await channels.setGameVisibility(g.id, g.visibility === 'private' ? 'public' : 'private').catch((e) => this._toast(e.message));
          this.reload();
        }),
        btn('chan-btn chan-btn--small', '＋ Playlist', () => this._addTo(g), 'Add this game to a playlist')
      );
      card.append(row);
    }
    guardCovers(card, g);
    return card;
  }

  _playlistCard(p) {
    const card = btn('chan-list', null, () => this._openList(p, 0));
    card.dataset.playlist = p.id;
    const cover = h('span', 'chan-list__cover');
    if (p.games[0]) cover.innerHTML = coverHtml(p.games[0]);
    cover.append(h('span', 'chan-list__count', `☰ ${count(p.games.length, 'game')}`));
    const done = this._doneCount(p);
    card.append(cover, h('strong', 'chan-card__title', `${p.visibility === 'private' ? '🔒 ' : ''}${p.title}`), h('span', 'chan__meta', this.actions.account() && p.games.length ? `${done} of ${p.games.length} done · View the playlist` : 'View the playlist'));
    if (p.games[0]) guardCovers(card, p.games[0]);
    return card;
  }

  /* ---- playing through a playlist: the game on the left, the chapters on the right ---- */

  _list() {
    return this.channel.playlists.find((p) => p.id === this.watch?.id) ?? null;
  }

  _openList(p, at = 0) {
    this.watch = { id: p.id, at: Math.max(0, Math.min(p.games.length - 1, at)) };
    this.render();
    this.root.querySelector('.chan__scroll').scrollTop = 0;
  }

  _leaveWatch() {
    this.watch = null;
    this.render();
  }

  /** A single game, outside any playlist: shown the same way, alone. */
  _openGame(g) {
    this.channel.playlists = this.channel.playlists.filter((p) => p.id !== 'solo');
    this.channel.playlists.push({ id: 'solo', title: g.title, summary: '', visibility: 'public', games: [g], solo: true });
    this.watch = { id: 'solo', at: 0 };
    this.render();
  }

  _watch() {
    const p = this._list();
    const g = p.games[this.watch.at];
    const wrap = h('div', 'chan-watch');
    const main = h('section', 'chan-watch__main');
    if (!g) {
      main.append(h('p', 'chan__hint', 'This playlist has no games yet.'));
    } else {
      const mine = this.progress[g.id];
      const stage = btn('chan-watch__stage', null, () => this._play(g, p, this.watch.at));
      stage.innerHTML = coverHtml(g);
      stage.append(h('span', 'chan-watch__play', '▶'));
      stage.setAttribute('aria-label', `Play ${g.title}`);
      guardCovers(stage, g);
      const title = h('h1', 'chan-watch__title', g.title);
      const meta = h('p', 'chan__meta', [`${GENRE_ICONS[g.genre] ?? '🎮'} ${g.card?.genreName ?? ''}`.trim(), g.official ? 'Official · Gamory' : `by ${g.author}`, count(g.plays ?? 0, 'play'), mine ? `you played ${playTime(mine.seconds)}` : null].filter(Boolean).join(' · '));
      const row = h('div', 'chan__row');
      row.append(btn('chan-btn chan-btn--primary chan-btn--big', mine?.seconds ? '▶ Play again' : '▶ Play', () => this._play(g, p, this.watch.at)));
      if (this.actions.account()) {
        row.append(btn(`chan-btn${mine?.done ? ' is-on' : ''}`, mine?.done ? '✓ Done' : 'Mark as done', async () => {
          await channels.setDone(g.id, !mine?.done).catch((e) => this._toast(e.message));
          this.reload();
        }, 'A game also counts as done after five minutes of play'));
        if (!(this.channel.owner && this.channel.games.some((x) => x.id === g.id))) row.append(btn('chan-btn', '⚑ Found a mistake', () => this._report(g), 'Something wrong in this game — a wrong fact, a broken quest? Tell its maker; finds count towards badges'));
      }
      const next = p.games[this.watch.at + 1];
      if (next) row.append(btn('chan-btn', `Next: ${next.title} ›`, () => this._openList(p, this.watch.at + 1)));
      main.append(stage, title, meta, row, h('p', 'chan-watch__summary', g.summary ?? ''));
    }
    const side = h('aside', 'chan-watch__side');
    if (!p.solo) {
      const done = this._doneCount(p);
      const head = h('div', 'chan-watch__head');
      head.append(h('strong', null, p.title), h('span', 'chan__meta', `${this.channel.name} · ${this.watch.at + 1} / ${p.games.length}${this.actions.account() ? ` · ${done} done` : ''}`));
      const bar = h('span', 'chan-bar');
      bar.append(h('i'));
      bar.firstChild.style.width = `${p.games.length ? (done / p.games.length) * 100 : 0}%`;
      head.append(bar);
      if (this.channel.owner) head.append(btn('chan-btn chan-btn--small', 'Edit the playlist', () => this._editPlaylist(p)));
      const ol = h('ol', 'chan-watch__list');
      p.games.forEach((x, i) => {
        const mine = this.progress[x.id];
        const li = h('li', i === this.watch.at ? 'is-current' : '');
        const b = btn('chan-watch__item', null, () => this._openList(p, i));
        const thumb = h('span', 'chan-watch__thumb');
        thumb.innerHTML = coverHtml(x);
        guardCovers(thumb, x);
        const t = h('span', 'chan-watch__itemtext');
        t.append(h('strong', null, x.title), h('span', 'chan__meta', mine?.done ? `✓ Done · ${playTime(mine.seconds)}` : mine?.seconds ? `${playTime(mine.seconds)} played` : 'Not started'));
        b.append(h('span', 'chan-watch__n', i === this.watch.at ? '▶' : String(i + 1)), thumb, t);
        li.append(b);
        ol.append(li);
      });
      side.append(head, ol);
    }
    side.append(btn('chan-btn chan-btn--ghost', `← Back to ${this.channel.name}`, () => this._leaveWatch()));
    wrap.append(main, side);
    return wrap;
  }

  async _play(g, p, at) {
    if (p && !p.solo) this.watch = { id: p.id, at };
    await this.actions.play(g.id);
  }

  /* ---- achievements ---- */

  _achievements() {
    const c = this.channel;
    const box = h('div', 'chan-ach');
    const tiles = h('div', 'chan-ach__tiles');
    for (const [key, label, fmt] of STAT_TILES) {
      const t = h('div', 'chan-ach__tile');
      t.dataset.stat = key;
      t.append(h('strong', null, fmt ? fmt(c.stats[key]) : String(c.stats[key] ?? 0)), h('span', null, c.owner ? label.replace('their', 'your') : label));
      tiles.append(t);
    }
    const earned = c.badges.filter((b) => b.earned).length;
    const grid = h('div', 'chan-ach__badges');
    for (const b of c.badges) {
      const card = h('div', `chan-badge${b.earned ? ' is-earned' : ''}`);
      card.dataset.badge = b.id;
      const bar = h('span', 'chan-bar');
      bar.append(h('i'));
      bar.firstChild.style.width = `${(b.have / b.at) * 100}%`;
      card.append(h('span', 'chan-badge__icon', b.icon), h('strong', null, b.name), h('span', 'chan__meta', b.what), bar, h('span', 'chan-badge__have', b.earned ? 'Earned' : b.stat === 'seconds' ? `${playTime(b.have)} of ${playTime(b.at)}` : `${b.have} of ${b.at}`));
      grid.append(card);
    }
    box.append(h('h2', null, c.owner ? 'What you have done' : `What ${c.name} has done`), tiles, h('h2', null, `Badges · ${earned} of ${c.badges.length}`), grid);
    // The owner's own time, game by game.
    if (c.owner) {
      const rows = Object.entries(this.progress).filter(([, p]) => p.seconds > 0 || p.done).sort((a, b) => b[1].seconds - a[1].seconds);
      box.append(h('h2', null, 'Your time, game by game'));
      if (!rows.length) box.append(h('p', 'chan__hint', 'Play a game while signed in and its time shows here.'));
      const titles = new Map([...c.games, ...c.playlists.flatMap((p) => p.games), ...(this._allGames ?? [])].map((g) => [g.id, g.title]));
      const max = Math.max(1, ...rows.map(([, p]) => p.seconds));
      const table = h('div', 'chan-ach__times');
      for (const [id, p] of rows) {
        const line = h('div', 'chan-ach__time');
        const bar = h('span', 'chan-bar');
        bar.append(h('i'));
        bar.firstChild.style.width = `${(p.seconds / max) * 100}%`;
        line.append(h('span', 'chan-ach__game', titles.get(id) ?? id.replace(/^official:/, '')), bar, h('span', 'chan-ach__dur', `${playTime(p.seconds)}${p.done ? ' · ✓' : ''}`));
        table.append(line);
      }
      box.append(table);
      if (!this._allGames) this.actions.list({ limit: 200 }).then((list) => {
        this._allGames = list;
        if (this.isOpen && this.tab === 'achievements' && !this.watch) this.render();
      }).catch(() => {});
    }
    return box;
  }

  /* ---- mistakes found (the owner's) ---- */

  _mistakes() {
    const box = h('div', 'chan-mis');
    const data = this.reportsData ?? { inbox: [], mine: [] };
    const section = (title, hint, list, inbox) => {
      box.append(h('h2', null, title), h('p', 'chan__hint', hint));
      for (const r of list) {
        const row = h('div', `chan-mis__row is-${r.status}`);
        row.dataset.report = String(r.id);
        const text = h('div');
        text.append(h('strong', null, `${r.title}${r.place ? ` — ${r.place}` : ''}`), h('p', null, r.note), h('span', 'chan__meta', [inbox ? `from ${r.by}` : null, new Date(r.created).toLocaleDateString(), r.status === 'open' ? 'waiting for an answer' : r.status].filter(Boolean).join(' · ')));
        row.append(text);
        if (inbox && r.status === 'open') {
          const answer = async (status) => {
            await channels.review(r.id, status).catch((e) => this._toast(e.message));
            this.reload();
          };
          const actions = h('div', 'chan__row');
          actions.append(btn('chan-btn chan-btn--primary chan-btn--small', '✓ They are right', () => answer('confirmed')), btn('chan-btn chan-btn--small', 'Not a mistake', () => answer('dismissed')));
          row.append(actions);
        }
        box.append(row);
      }
      if (!list.length) box.append(h('p', 'chan__meta', 'Nothing yet.'));
    };
    section('In your games', 'What players found wrong in games you published. Generated games can hold wrong facts or broken quests — confirm a find and the finder gets credit.', data.inbox, true);
    section('Found by you', 'What you reported in other makers\' games. Confirmed finds count towards the Fact checker badges.', data.mine, false);
    return box;
  }

  /* ---- dialogs ---- */

  _dialog(title) {
    this._closeDialog();
    const veil = h('div', 'chan-dialog');
    const box = h('form', 'chan-dialog__box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.append(h('h2', null, title));
    veil.append(box);
    veil.addEventListener('click', (e) => e.target === veil && this._closeDialog());
    box.addEventListener('submit', (e) => e.preventDefault());
    this.root.append(veil);
    return box;
  }

  _closeDialog() {
    const d = this.root.querySelector('.chan-dialog');
    d?.remove();
    return Boolean(d);
  }

  _field(box, label, input) {
    const l = h('label', 'chan-field');
    l.append(h('span', null, label), input);
    box.append(l);
    return input;
  }

  _toast(text) {
    const t = h('div', 'chan-toast', text);
    this.root.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  async _share(from) {
    const url = this.link();
    try {
      await navigator.clipboard.writeText(url);
      this._toast(this.channel.visibility === 'private' ? 'Private link copied — whoever has it sees everything here' : 'Link copied');
      confetti(from, 24);
    } catch {
      const box = this._dialog('Share this channel');
      const input = Object.assign(h('input'), { value: url, readOnly: true });
      this._field(box, 'Link', input);
      input.select();
      box.append(btn('chan-btn', 'Close', () => this._closeDialog()));
    }
  }

  _customize() {
    const c = this.channel;
    const box = this._dialog('Customize your channel');
    const name = this._field(box, 'Name', Object.assign(h('input'), { value: c.name, maxLength: 40, required: true }));
    const handle = this._field(box, 'Handle (its address)', Object.assign(h('input'), { value: c.handle, maxLength: 30, pattern: '[a-z0-9][a-z0-9-]{2,29}' }));
    const about = this._field(box, 'About', Object.assign(h('textarea'), { value: c.about, maxLength: 600, rows: 3 }));
    let color = c.color;
    const swatches = h('div', 'chan-swatches');
    for (const [id, [, mid]] of Object.entries(COLORS)) {
      const s = btn(`chan-swatch${id === color ? ' is-on' : ''}`, '', () => {
        color = id;
        for (const o of swatches.children) o.classList.toggle('is-on', o === s);
      });
      s.style.background = mid;
      s.setAttribute('aria-label', id);
      swatches.append(s);
    }
    this._field(box, 'Colour', swatches);
    const vis = h('select');
    for (const [v, label] of [['public', '🌐 Public — listed; anyone can open it'], ['private', '🔒 Private — only you, and people you give the private link']]) vis.append(Object.assign(h('option', null, label), { value: v, selected: c.visibility === v }));
    this._field(box, 'Who can see it', vis);
    const link = h('div', 'chan-field');
    link.append(h('span', null, 'Private link (shows your private games and playlists too)'));
    const linkRow = h('div', 'chan__row');
    const url = Object.assign(h('input'), { value: `${location.origin}${location.pathname}#/c/${c.handle}?key=${c.key}`, readOnly: true });
    linkRow.append(url, btn('chan-btn chan-btn--small', 'Copy', () => navigator.clipboard?.writeText(url.value).then(() => this._toast('Private link copied'))), btn('chan-btn chan-btn--small', 'New link', async () => {
      this.channel = await channels.newKey();
      this._customize();
      this._toast('New private link — the old one no longer works');
    }, 'Make a new link; the old one stops working'));
    link.append(linkRow);
    box.append(link);
    const error = h('p', 'chan-dialog__error');
    const row = h('div', 'chan__row');
    row.append(btn('chan-btn chan-btn--primary', 'Save', async () => {
      try {
        this.channel = await channels.update({ name: name.value, handle: handle.value.trim().toLowerCase(), about: about.value, color, visibility: vis.value });
        this.handle = this.channel.handle;
        this._closeDialog();
        this.reload();
      } catch (e) {
        error.textContent = e.message;
      }
    }), btn('chan-btn', 'Cancel', () => this._closeDialog()));
    box.append(error, row);
    name.focus();
  }

  /** Make or change a playlist: title, who sees it, and its games in order. */
  async _editPlaylist(p) {
    const box = this._dialog(p ? 'Edit the playlist' : 'New playlist');
    box.classList.add('chan-dialog__box--wide');
    const title = this._field(box, 'Title', Object.assign(h('input'), { value: p?.title ?? '', maxLength: 80, placeholder: 'Fractions, step by step' }));
    const summary = this._field(box, 'What it is for', Object.assign(h('input'), { value: p?.summary ?? '', maxLength: 400 }));
    const vis = h('select');
    for (const [v, label] of [['public', '🌐 Public'], ['private', '🔒 Private']]) vis.append(Object.assign(h('option', null, label), { value: v, selected: (p?.visibility ?? 'public') === v }));
    this._field(box, 'Who can see it', vis);
    let items = (p?.games ?? []).map((g) => g);
    const chosen = h('ol', 'chan-pick__chosen');
    const pool = h('div', 'chan-pick__pool');
    const drawChosen = () => {
      chosen.replaceChildren();
      if (!items.length) chosen.append(h('li', 'chan__meta', 'No games yet — add some from below. The order here is the order they play in.'));
      items.forEach((g, i) => {
        const li = h('li');
        const move = (d) => {
          const j = i + d;
          if (j < 0 || j >= items.length) return;
          [items[i], items[j]] = [items[j], items[i]];
          drawChosen();
        };
        li.append(h('span', 'chan-pick__n', String(i + 1)), h('span', 'chan-pick__title', g.title), btn('chan-btn chan-btn--small', '↑', () => move(-1), 'Earlier'), btn('chan-btn chan-btn--small', '↓', () => move(1), 'Later'), btn('chan-btn chan-btn--small', '✕', () => {
          items = items.filter((x) => x !== g);
          drawChosen();
          drawPool();
        }, 'Take out'));
        chosen.append(li);
      });
    };
    let all = [];
    let q = '';
    const drawPool = () => {
      pool.replaceChildren();
      const have = new Set(items.map((g) => g.id));
      const list = all.filter((g) => !have.has(g.id) && (!q || `${g.title} ${g.author}`.toLowerCase().includes(q))).slice(0, 40);
      for (const g of list) {
        pool.append(btn('chan-pick__add', `＋ ${g.title}${g.visibility === 'private' ? ' 🔒' : ''}`, () => {
          items.push(g);
          drawChosen();
          drawPool();
        }, g.official ? 'Official game' : `by ${g.author}`));
      }
      if (!list.length) pool.append(h('span', 'chan__meta', 'No more games match.'));
    };
    const search = Object.assign(h('input'), { type: 'search', placeholder: 'Search your games and all public games' });
    search.addEventListener('input', () => {
      q = search.value.trim().toLowerCase();
      drawPool();
    });
    box.append(h('h3', null, 'Games, in order'), chosen, h('h3', null, 'Add games'), search, pool);
    drawChosen();
    pool.append(h('span', 'chan__meta', 'Loading…'));
    this.actions.list({ limit: 200 }).then((list) => {
      const mine = this.channel.games;
      all = [...mine, ...list.filter((g) => !mine.some((m) => m.id === g.id))];
      drawPool();
    }).catch(() => drawPool());
    const error = h('p', 'chan-dialog__error');
    const row = h('div', 'chan__row');
    row.append(btn('chan-btn chan-btn--primary', p ? 'Save' : 'Create playlist', async () => {
      try {
        await channels.savePlaylist({ title: title.value, summary: summary.value, visibility: vis.value, items: items.map((g) => g.id) }, p?.id ?? null);
        this._closeDialog();
        if (!p) this.tab = 'playlists';
        this.reload();
      } catch (e) {
        error.textContent = e.message;
      }
    }), btn('chan-btn', 'Cancel', () => this._closeDialog()));
    if (p) row.append(btn('chan-btn chan-btn--danger', 'Delete playlist', async () => {
      await channels.removePlaylist(p.id).catch(() => {});
      this._closeDialog();
      this.watch = null;
      this.reload();
    }));
    box.append(error, row);
    title.focus();
  }

  /** Add one game to one of my playlists. */
  _addTo(g) {
    const lists = this.channel.playlists.filter((p) => !p.solo);
    const box = this._dialog(`Add “${g.title}” to a playlist`);
    if (!lists.length) box.append(h('p', 'chan__hint', 'You have no playlists yet.'));
    for (const p of lists) {
      const has = p.games.some((x) => x.id === g.id);
      box.append(btn('chan-pick__add', `${has ? '✓' : '＋'} ${p.title}`, async () => {
        const ids = has ? p.games.filter((x) => x.id !== g.id).map((x) => x.id) : [...p.games.map((x) => x.id), g.id];
        await channels.savePlaylist({ items: ids }, p.id).catch((e) => this._toast(e.message));
        this._closeDialog();
        this.reload();
      }));
    }
    const row = h('div', 'chan__row');
    row.append(btn('chan-btn', '＋ New playlist', () => this._editPlaylist(null)), btn('chan-btn', 'Close', () => this._closeDialog()));
    box.append(row);
  }

  /** Tell a game's maker what is wrong in it. */
  _report(g) {
    const box = this._dialog(`Found a mistake in “${g.title}”?`);
    box.append(h('p', 'chan__hint', 'Games here can be made with AI, and AI gets things wrong: a false fact in a quiz, a quest that cannot be finished, text that makes no sense. Say what you found — the maker answers, and confirmed finds earn you badges.'));
    const place = this._field(box, 'Where (chapter, question, place)', Object.assign(h('input'), { maxLength: 120, placeholder: 'Chapter 2, the third question' }));
    const note = this._field(box, 'What is wrong', Object.assign(h('textarea'), { maxLength: 600, rows: 4, placeholder: 'It says 7 × 8 = 54. It is 56.' }));
    const error = h('p', 'chan-dialog__error');
    const row = h('div', 'chan__row');
    row.append(btn('chan-btn chan-btn--primary', 'Send', async (e) => {
      try {
        await channels.report(g.id, note.value, place.value);
        this._closeDialog();
        this._toast('Sent to the maker — thank you');
        confetti(e.currentTarget, 30);
      } catch (err) {
        error.textContent = err.message;
      }
    }), btn('chan-btn', 'Cancel', () => this._closeDialog()));
    box.append(error, row);
    note.focus();
  }
}
