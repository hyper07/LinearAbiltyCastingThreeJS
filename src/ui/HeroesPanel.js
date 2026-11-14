import { coverHtml, guardCovers } from './gameCover.js';
import { popColor } from './pop.js';
import { CLASSES, ITEMS, SLOTS } from '../mmo/data.js';
import { lookOf } from '../mmo/looks.js';
import './heroes.css';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const SLOT_NAMES = { weapon: 'Weapon', head: 'Head', chest: 'Chest', legs: 'Legs', feet: 'Feet', trinket: 'Trinket' };
const statLine = (stats = {}) => Object.entries(stats).map(([k, v]) => `+${v} ${k}`).join(' · ');

/**
 * "My heroes": the games you have a hero in, and — a click on one — your
 * heroes there. What you can change depends on the game:
 * - an action game keeps a hero per class: open its bag and what it wears
 *   (the same bag as in the game), or play;
 * - Hearthvale keeps named characters: wear gear from the bag or take it
 *   off right here (while the character isn't in the world), or play.
 * The free-play arena's hero opens its own menu.
 */
export class HeroesPanel {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   account: () => object|null,
   *   heroes: () => Promise<{ game: string, classId: string, level: number, gold: number, worn?: string[], bag?: number }[]>,
   *   game: (id: string) => Promise<object|null>,
   *   className: (classId: string) => { name: string, icon?: string },
   *   arena: () => { classId: string, level: number, gold: number },
   *   openArena: () => void,
   *   openBag: (gameId: string, classId: string) => Promise<void>,
   *   play: (gameId: string) => void,
   *   signIn: () => void
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.root = el('div', 'heroes');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="heroes__sheet" role="dialog" aria-modal="true" aria-label="My heroes">
        <header class="heroes__head">
          <button type="button" class="heroes__back" data-back hidden>← All games</button>
          <h2 data-title>My heroes</h2>
          <button type="button" class="heroes__close" data-close aria-label="Close">✕</button>
        </header>
        <p class="heroes__note" data-note hidden></p>
        <div class="heroes__body" data-body></div>
      </div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);
    this.$('[data-close]').addEventListener('click', () => this.close());
    this.$('[data-back]').addEventListener('click', () => this.showGames());
    this.root.addEventListener('click', (e) => e.target === this.root && this.close());
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') (this.current ? this.showGames() : this.close());
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /** Open on the list of games, or straight on one game's heroes. */
  async open(gameId = null) {
    this.root.hidden = false;
    await this.load();
    if (gameId && this.groups.some((g) => g.id === gameId)) this.showGame(gameId);
    else this.showGames();
    this.$('[data-close]').focus();
  }

  close() {
    this.root.hidden = true;
    this.current = null;
  }

  note(text, kind = '') {
    const n = this.$('[data-note]');
    n.hidden = !text;
    n.textContent = text ?? '';
    n.dataset.kind = kind;
  }

  /** Everything you have, grouped by game. */
  async load() {
    const groups = new Map();
    const group = (id, extra) => {
      if (!groups.has(id)) groups.set(id, { id, heroes: [], ...extra });
      return groups.get(id);
    };
    const arena = this.actions.arena();
    group('arena', { kind: 'arena', title: 'Free-play arena', game: { id: 'arena', title: 'Free-play arena', genre: 'arena-rpg' } }).heroes.push(arena);
    let list = [];
    try {
      list = await this.actions.heroes();
    } catch {
      /* offline: only what this browser has */
    }
    for (const h of list) group(h.game, { kind: 'action' }).heroes.push(h);
    this.signedIn = Boolean(this.actions.account());
    if (this.signedIn) {
      try {
        const r = await fetch('./api/mmo/characters');
        const chars = r.ok ? (await r.json()).characters ?? [] : [];
        if (chars.length) group('official:hearthvale', { kind: 'mmo' }).heroes.push(...chars);
      } catch {
        /* no Hearthvale on this server */
      }
    }
    // Each game's name and cover; one that was deleted keeps its heroes under a plain name.
    await Promise.all([...groups.values()].filter((g) => !g.game).map(async (g) => {
      g.game = await this.actions.game(g.id).catch(() => null);
      g.title = g.game?.title ?? 'A game that is gone';
    }));
    this.groups = [...groups.values()].sort((a, b) => (a.kind === 'arena') - (b.kind === 'arena') || Math.max(...b.heroes.map((h) => h.updated ?? 0)) - Math.max(...a.heroes.map((h) => h.updated ?? 0)));
  }

  /* -------------------------------------------------------- the games */

  showGames() {
    this.current = null;
    this.$('[data-back]').hidden = true;
    this.$('[data-title]').textContent = 'My heroes';
    this.note(this.signedIn ? '' : 'You are not signed in: these are the heroes kept in this browser. Sign in to keep them on your account (and to play Hearthvale).');
    const body = this.$('[data-body]');
    body.className = 'heroes__body heroes__games';
    body.replaceChildren(...this.groups.map((g, i) => {
      const card = el('button', 'heroes__game');
      card.type = 'button';
      card.dataset.game = g.id;
      card.style.setProperty('--tone', popColor(i));
      const top = Math.max(...g.heroes.map((h) => h.level ?? 1));
      card.innerHTML = `<span class="heroes__cover">${g.game ? coverHtml(g.game) : ''}</span><span class="heroes__game-text"><b></b><small></small></span><span class="heroes__count"></span>`;
      if (g.game) guardCovers(card.querySelector('.heroes__cover'), g.game);
      card.querySelector('b').textContent = g.title;
      card.querySelector('small').textContent = g.kind === 'arena' ? `Level ${top} · your hero outside any game` : `${g.heroes.length === 1 ? '1 hero' : `${g.heroes.length} heroes`} · highest level ${top}`;
      card.querySelector('.heroes__count').textContent = g.kind === 'arena' ? '★' : String(g.heroes.length);
      card.addEventListener('click', () => this.showGame(g.id));
      return card;
    }));
    if (this.groups.length === 1) {
      body.append(el('p', 'heroes__empty', 'Play a game and your hero there shows up here, with its level and gear.'));
    }
  }

  /* ------------------------------------------------- one game's heroes */

  showGame(id) {
    const g = this.groups.find((x) => x.id === id);
    if (!g) return this.showGames();
    this.current = id;
    this.$('[data-back]').hidden = false;
    this.$('[data-title]').textContent = g.title;
    this.note('');
    const body = this.$('[data-body]');
    body.className = 'heroes__body heroes__list';
    if (g.kind === 'mmo') body.replaceChildren(...g.heroes.map((c) => this._mmoCard(g, c)));
    else body.replaceChildren(...g.heroes.map((h, i) => this._actionCard(g, h, i)));
  }

  _button(label, className, fn) {
    const b = el('button', `heroes__btn ${className}`, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  /** A hero of an action game (or the arena's): level, gold, what it wears; its bag; play. */
  _actionCard(g, h, i) {
    const cls = this.actions.className(h.classId);
    const card = el('article', 'heroes__hero');
    card.dataset.hero = h.classId;
    card.style.setProperty('--tone', popColor(i));
    card.innerHTML = '<span class="heroes__badge"></span><div class="heroes__hero-text"><h3></h3><p class="heroes__meta"></p><p class="heroes__worn"></p></div><div class="heroes__actions"></div>';
    card.querySelector('.heroes__badge').textContent = cls.icon ?? '🧙';
    card.querySelector('h3').textContent = cls.name;
    card.querySelector('.heroes__meta').textContent = `Level ${h.level} · ${h.gold} gold${h.bag != null ? ` · ${h.bag} in the bag` : ''}`;
    card.querySelector('.heroes__worn').textContent = h.worn?.length ? `Wearing: ${h.worn.join(', ')}` : g.kind === 'arena' ? 'Class, weapon, skills and stash are in its own menu.' : 'Nothing worn yet.';
    const actions = card.querySelector('.heroes__actions');
    if (g.kind === 'arena') actions.append(this._button('Open hero menu', 'heroes__btn--go', () => {
      this.close();
      this.actions.openArena();
    }));
    else {
      actions.append(this._button('🎒 Bag & equipment', 'heroes__btn--go', async () => {
        this.close();
        await this.actions.openBag(g.id, h.classId);
      }));
      if (g.game) actions.append(this._button('▶ Play', '', () => {
        this.close();
        this.actions.play(g.id);
      }));
    }
    return card;
  }

  /** A Hearthvale character: what it wears, slot by slot, and the gear in its bag to put on. */
  _mmoCard(g, c) {
    const look = lookOf(c.cls, c.look);
    const card = el('article', 'heroes__hero heroes__hero--mmo');
    card.dataset.hero = c.id;
    card.style.setProperty('--tone', look.tint ?? '#8b5cf6');
    card.innerHTML = '<span class="heroes__badge"></span><div class="heroes__hero-text"><h3></h3><p class="heroes__meta"></p><div class="heroes__slots" data-slots></div><h4>In the bag</h4><div class="heroes__bag" data-bag></div></div><div class="heroes__actions"></div>';
    card.querySelector('.heroes__badge').textContent = CLASSES[c.cls]?.skills[0]?.icon ?? '⚔';
    card.querySelector('h3').textContent = c.name;
    card.querySelector('.heroes__meta').textContent = `Level ${c.level} ${look.name ?? ''} ${CLASSES[c.cls]?.name ?? ''} · ${c.gold} gold · ${c.stats?.maxHp ?? '?'} health · ${c.stats?.power ?? '?'} power · ${c.stats?.armor ?? '?'} armor${c.online ? ' · in the world now' : ''}`.replace(/\s+/g, ' ');
    const change = async (path, slot) => {
      const r = await fetch(`./api/mmo/characters/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, slot }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return this.note(data.error ?? 'That did not work', 'bad');
      this.note('');
      Object.assign(c, data.character);
      card.replaceWith(this._mmoCard(g, c));
    };
    const slots = card.querySelector('[data-slots]');
    for (const slot of SLOTS) {
      const item = ITEMS[c.equip?.[slot]];
      const row = el('div', `heroes__slot ${item ? `is-${item.rarity ?? 'plain'}` : 'is-empty'}`);
      row.dataset.slot = slot;
      row.append(el('span', 'heroes__slot-name', SLOT_NAMES[slot]), el('b', '', item?.name ?? '—'), el('small', '', item ? statLine(item.stats) : ''));
      if (item) row.append(this._button('Take off', 'heroes__btn--small', () => change('takeoff', slot)));
      slots.append(row);
    }
    const bag = card.querySelector('[data-bag]');
    const gear = (c.bag ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s && ITEMS[s.item]?.slot);
    for (const { s, i } of gear) {
      const item = ITEMS[s.item];
      const worn = ITEMS[c.equip?.[item.slot]];
      const row = el('div', `heroes__slot is-${item.rarity ?? 'plain'}`);
      row.dataset.bag = i;
      const diff = Object.keys({ ...item.stats, ...(worn?.stats ?? {}) }).map((k) => [k, (item.stats?.[k] ?? 0) - (worn?.stats?.[k] ?? 0)]).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(' · ');
      row.append(el('span', 'heroes__slot-name', SLOT_NAMES[item.slot]), el('b', '', item.name), el('small', '', worn ? (diff ? `${diff} against what is worn` : 'the same as what is worn') : statLine(item.stats)));
      const can = (item.level ?? 1) <= c.level;
      const b = this._button(can ? 'Wear' : `Needs level ${item.level}`, 'heroes__btn--small heroes__btn--go', () => change('wear', i));
      b.disabled = !can;
      row.append(b);
      bag.append(row);
    }
    const others = (c.bag ?? []).filter((s) => s && !ITEMS[s.item]?.slot);
    if (!gear.length) bag.append(el('p', 'heroes__empty', 'No gear in the bag. Brannoc the smith sells some, and monsters drop more.'));
    if (others.length) bag.append(el('p', 'heroes__meta', `Also carrying: ${others.map((s) => `${ITEMS[s.item].name}${s.n > 1 ? ` ×${s.n}` : ''}`).join(', ')}.`));
    if (c.online) card.querySelectorAll('.heroes__btn--small').forEach((b) => (b.disabled = true));
    card.querySelector('.heroes__actions').append(this._button('▶ Play', 'heroes__btn--go', () => {
      this.close();
      this.actions.play(g.id);
    }));
    card.querySelector('.heroes__actions').append(el('small', 'heroes__hint', 'Body, colours, hat and cape: "Change look" on the game\'s character screen.'));
    return card;
  }
}
