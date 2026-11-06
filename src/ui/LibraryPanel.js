import { ELEMENT_META } from '../config/settings.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { categoryGlyph } from '../platform/weapon/WeaponDefinition.js';
import { platform } from '../platform/index.js';
import { skillDetails } from '../platform/skill/info.js';
import { kindIcon } from './itemIcons.js';
import { library } from '../library/Library.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'class', label: 'Classes' },
  { id: 'skill', label: 'Skills' },
  { id: 'item', label: 'Gear' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'level', label: 'Levels' }
];
const STATUS = {
  official: { label: 'Official', hint: 'Comes with the game' },
  shared: { label: 'Shared', hint: 'Made by a player and shared for everyone' },
  draft: { label: 'Draft', hint: 'Made by you, not shared yet' },
  hidden: { label: 'Hidden', hint: 'Taken out of the library' }
};

/**
 * The library window: everything the game ships with and everything players
 * made and shared, in one place — so before making something new you can
 * find what already exists, and use it.
 *
 * Filter by kind, status and words; each card shows its status (Official,
 * Shared, Draft), who made it and how often it has been used. Pick one for
 * its details and what you can do with it: play a class or a level, equip a
 * weapon, and — for your own things — share, keep as a draft, hide or
 * delete.
 */
export class LibraryPanel {
  /**
   * @param {HTMLElement} host
   * @param {{ selectClass: (id: string) => Promise<void>|void, playLevel: (id: string) => void,
   *           equipWeapon: (id: string) => void, installClass: (design: object) => Promise<void> }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.kind = '';
    this.status = '';
    this.query = '';
    this.selected = null;
    this.root = el('div', 'library');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="library__card">
        <header class="library__head">
          <h2>Library</h2>
          <span class="library__counts" data-counts></span>
          <label class="library__creator">You share as <input data-creator maxlength="40" /></label>
          <button type="button" data-close>Close</button>
        </header>
        <div class="library__tools">
          <nav class="library__kinds" data-kinds></nav>
          <select data-status>
            <option value="">Any status</option>
            <option value="official">Official</option>
            <option value="shared">Shared</option>
            <option value="draft">My drafts</option>
            <option value="hidden">Hidden</option>
          </select>
          <input type="search" data-search placeholder="Search names and descriptions…" />
        </div>
        <div class="library__body">
          <section class="library__grid" data-grid></section>
          <aside class="library__detail" data-detail><p class="library__muted">Pick something to see it.</p></aside>
        </div>
      </div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);
    for (const k of KINDS) {
      const b = el('button', 'library__kind', k.label);
      b.type = 'button';
      b.dataset.kind = k.id;
      b.addEventListener('click', () => {
        this.kind = k.id;
        this.refresh();
      });
      this.$('[data-kinds]').append(b);
    }
    this.$('[data-close]').addEventListener('click', () => this.toggle(false));
    this.$('[data-status]').addEventListener('change', (e) => {
      this.status = e.target.value;
      this.refresh();
    });
    let timer = null;
    this.$('[data-search]').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.query = e.target.value.trim();
        this.refresh();
      }, 180);
    });
    const creator = this.$('[data-creator]');
    creator.value = library.creator;
    creator.addEventListener('change', () => (library.creator = creator.value.trim() || 'Player'));
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.toggle(false);
    });
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.root) this.toggle(false);
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  toggle(force) {
    this.root.hidden = force === undefined ? !this.root.hidden : !force;
    if (this.isOpen) this.refresh();
  }

  async refresh() {
    for (const b of this.root.querySelectorAll('.library__kind')) b.classList.toggle('is-active', b.dataset.kind === this.kind);
    const grid = this.$('[data-grid]');
    const r = await library.list({ kind: this.kind, status: this.status, q: this.query, limit: 300 });
    grid.replaceChildren();
    if (r.error) {
      grid.append(el('p', 'library__muted', r.offline ? 'The library is not running — start the game with `npm run dev`.' : `The library had a problem: ${r.error}`));
      return;
    }
    const c = r.counts ?? { byStatus: {} };
    this.$('[data-counts]').replaceChildren(
      ...['official', 'shared', 'draft'].map((s) => {
        const chip = el('span', `library__status is-${s}`, `${STATUS[s].label} ${c.byStatus[s] ?? 0}`);
        chip.title = STATUS[s].hint;
        return chip;
      })
    );
    if (!r.assets.length) grid.append(el('p', 'library__muted', 'Nothing matches.'));
    for (const a of r.assets) grid.append(this._card(a));
    if (this.selected) this._detail(this.selected);
  }

  _icon(a) {
    const icon = el('span', 'library__icon');
    const id = a.id.split(':')[1];
    if (a.kind === 'skill') icon.innerHTML = ELEMENT_SIGILS[id] ?? ELEMENT_SIGILS[ELEMENT_META[id]?.base] ?? '✦';
    else if (a.kind === 'class') icon.textContent = platform.characters.get(id)?.icon ?? '✦';
    else if (a.kind === 'weapon') icon.textContent = categoryGlyph(platform.weapons.get(id)?.category);
    else if (a.kind === 'item') icon.innerHTML = kindIcon(/shield|buckler/.test(id) ? 'shield' : /quiver|bandolier/.test(id) ? 'quiver' : /focus|totem|tablet/.test(id) ? 'focus' : id.split('-').at(-1) === 'head' ? 'head' : /chest|robe|hauberk|jerkin/.test(id) ? 'chest' : /hands/.test(id) ? 'hands' : /legs/.test(id) ? 'legs' : /feet|boots/.test(id) ? 'feet' : /belt|sash/.test(id) ? 'waist' : /cloak|mantle/.test(id) ? 'back' : /ring|band|signet|loop|seal/.test(id) ? 'ring' : 'neck');
    else icon.textContent = '🗺';
    if (a.kind === 'skill') icon.style.color = ELEMENT_META[id]?.accent ?? '';
    return icon;
  }

  _card(a) {
    const card = el('button', `library__item is-${a.status}`);
    card.type = 'button';
    if (this.selected?.id === a.id) card.classList.add('is-selected');
    card.append(this._icon(a));
    const text = el('div', 'library__item-text');
    text.append(el('strong', null, a.name), el('small', null, `${KINDS.find((k) => k.id === a.kind)?.label.replace(/s$/, '') ?? a.kind} · ${a.author || 'unknown'}`));
    const status = el('span', `library__status is-${a.status}`, STATUS[a.status]?.label ?? a.status);
    status.title = STATUS[a.status]?.hint ?? '';
    const uses = el('span', 'library__uses', a.uses ? `used ${a.uses}×` : '');
    card.append(text, status, uses);
    card.title = a.summary;
    card.addEventListener('click', () => {
      this.selected = a;
      for (const n of this.root.querySelectorAll('.library__item')) n.classList.toggle('is-selected', n === card);
      this._detail(a);
    });
    return card;
  }

  async _detail(a) {
    const box = this.$('[data-detail]');
    const full = (await library.get(a.id)).asset ?? a;
    if (this.selected?.id !== a.id) return;
    box.replaceChildren();
    const head = el('header', 'library__detail-head');
    head.append(this._icon(full));
    const t = el('div');
    t.append(el('strong', null, full.name), el('small', null, `${full.kind} · ${full.author || 'unknown'}`));
    head.append(t);
    box.append(head);
    const meta = el('div', 'library__detail-meta');
    const status = el('span', `library__status is-${full.status}`, STATUS[full.status]?.label ?? full.status);
    meta.append(status, el('span', null, full.uses ? `Used ${full.uses}×` : 'Not used yet'));
    if (full.parent) meta.append(el('span', null, `Built on ${full.parent.split(':')[1]}`));
    box.append(meta);
    if (full.summary) box.append(el('p', 'library__summary', full.summary));
    const id = full.id.split(':')[1];

    if (full.kind === 'skill' && ELEMENT_META[id]) {
      const d = skillDetails(id, 1);
      const dl = el('dl', 'library__facts');
      for (const [k, v] of [['Aim', d.cast], ['Reach', d.reach], ['Damage', d.damage], ['Cooldown', `${d.cooldown} s`], ['Effects', d.effects.join(' · ') || '—']]) dl.append(el('dt', null, k), el('dd', null, String(v)));
      box.append(dl);
    }
    if (full.kind === 'class' && full.data?.branches) {
      const list = el('ul', 'library__list');
      for (const b of full.data.branches) list.append(el('li', null, `${b.name}: ${b.skills.map((s) => s.name + (s.ref ? ' (reused)' : '')).join(' → ')}`));
      box.append(list);
    }

    const actions = el('div', 'library__actions');
    const button = (label, fn, primary = false) => {
      const b = el('button', primary ? 'is-primary' : '', label);
      b.type = 'button';
      b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          await fn();
        } finally {
          b.disabled = false;
        }
      });
      actions.append(b);
    };
    if (full.kind === 'class') {
      button('Play this class', async () => {
        if (!platform.characters.get(id) && full.data?.branches) await this.actions.installClass(full.data);
        library.use(full.id);
        await this.actions.selectClass(id);
        this.toggle(false);
      }, true);
    }
    if (full.kind === 'level') button('Play this level', () => {
      library.use(full.id);
      this.toggle(false);
      this.actions.playLevel(id);
    }, true);
    if (full.kind === 'weapon') button('Equip it', () => {
      library.use(full.id);
      this.actions.equipWeapon(id);
    }, true);
    if (full.status !== 'official') {
      if (full.status !== 'shared') button('Share', () => this._setStatus(full, 'shared'));
      if (full.status === 'shared') button('Make it a draft', () => this._setStatus(full, 'draft'));
      if (full.status !== 'hidden') button('Hide', () => this._setStatus(full, 'hidden'));
      button('Delete', async () => {
        if (!confirm(`Delete “${full.name}” from the library?`)) return;
        await library.remove(full.id);
        this.selected = null;
        box.replaceChildren(el('p', 'library__muted', 'Deleted.'));
        this.refresh();
      });
    }
    box.append(actions);

    // What else is like it.
    const near = await library.similar(full.kind, full.fingerprint ?? {}, { exclude: [full.id], min: 0.5, limit: 4 });
    if (this.selected?.id !== a.id || !near.length) return;
    box.append(el('h4', null, 'Similar'));
    const list = el('div', 'library__similar');
    for (const n of near) {
      const b = el('button', `library__match is-${n.status}`);
      b.type = 'button';
      b.append(el('span', null, n.name), el('small', null, `${STATUS[n.status]?.label ?? n.status} · ${Math.round(n.score * 100)}%`));
      b.addEventListener('click', () => {
        this.selected = n;
        this._detail(n);
      });
      list.append(b);
    }
    box.append(list);
  }

  async _setStatus(asset, status) {
    const r = await library.setStatus(asset.id, status);
    if (r.asset) this.selected = r.asset;
    this.refresh();
  }
}
