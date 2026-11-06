import { describeFire, fireProfileOf } from '../platform/weapon/fire.js';
import { platform } from '../platform/index.js';
import { WEAPON_CATEGORY_META, categoryGlyph } from '../platform/weapon/WeaponDefinition.js';

/**
 * Armory window — browse all 108 weapons by kind, each with how it fights.
 *
 * Opens with <kbd>I</kbd>. Search filters across all categories.
 */
export class WeaponPanel {
  /**
   * @param {HTMLElement} host
   * @param {(weaponId: string) => void} onSelect
   */
  constructor(host, onSelect) {
    this.onSelect = onSelect;
    this._visible = false;
    this._category = WEAPON_CATEGORY_META[0].id;
    this._query = '';
    this._equippedId = 'unarmed';

    this.root = document.createElement('div');
    this.root.className = 'weapon-panel';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="weapon-panel__backdrop" data-backdrop></div>
      <div class="weapon-panel__dialog" role="dialog" aria-label="Armory">
        <header class="weapon-panel__head">
          <div>
            <span class="weapon-panel__eyebrow">Armory</span>
            <h2 class="weapon-panel__title">Select Weapon</h2>
            <span class="weapon-panel__count" data-count></span>
          </div>
          <button class="weapon-panel__close" data-close title="Close (Esc)">✕</button>
        </header>

        <div class="weapon-panel__search-row">
          <input class="weapon-panel__search" data-search type="search" placeholder="Search weapons…" spellcheck="false" />
        </div>

        <nav class="weapon-panel__tabs" data-tabs></nav>
        <div class="weapon-panel__grid" data-grid></div>

        <footer class="weapon-panel__foot">
          <span data-equipped>Equipped: Unarmed</span>
          <span class="weapon-panel__hint"><kbd>I</kbd> or <kbd>Esc</kbd> to close</span>
        </footer>
      </div>
    `;
    host.appendChild(this.root);

    this.tabsEl = this.root.querySelector('[data-tabs]');
    this.gridEl = this.root.querySelector('[data-grid]');
    this.equippedEl = this.root.querySelector('[data-equipped]');
    this.countEl = this.root.querySelector('[data-count]');
    this.searchEl = this.root.querySelector('[data-search]');

    this._buildTabs();
    this._renderGrid();

    this.root.querySelector('[data-backdrop]').addEventListener('click', () => this.hide());
    this.root.querySelector('[data-close]').addEventListener('click', () => this.hide());
    this.searchEl.addEventListener('input', () => {
      this._query = this.searchEl.value.trim().toLowerCase();
      this._renderGrid();
    });
  }

  _buildTabs() {
    this.tabsEl.innerHTML = WEAPON_CATEGORY_META.map(
      (cat) =>
        `<button class="weapon-panel__tab" type="button" data-category="${cat.id}">
          <span class="weapon-panel__tab-glyph">${cat.glyph}</span>${cat.label}
        </button>`
    ).join('');

    for (const tab of this.tabsEl.querySelectorAll('.weapon-panel__tab')) {
      tab.addEventListener('click', () => {
        this._category = tab.dataset.category;
        this._updateTabs();
        this._renderGrid();
      });
    }
    this._updateTabs();
  }

  _updateTabs() {
    for (const tab of this.tabsEl.querySelectorAll('.weapon-panel__tab')) {
      tab.classList.toggle('is-active', tab.dataset.category === this._category);
    }
  }

  _filteredWeapons() {
    let weapons = platform.weapons.all();
    if (this._query) {
      weapons = weapons.filter(
        (w) =>
          w.label.toLowerCase().includes(this._query) ||
          w.id.includes(this._query) ||
          (w.description ?? '').toLowerCase().includes(this._query)
      );
    } else {
      weapons = weapons.filter((w) => w.category === this._category);
    }
    return weapons.sort((a, b) => a.label.localeCompare(b.label));
  }

  _renderGrid() {
    const weapons = this._filteredWeapons();
    const total = platform.weapons.all().length;

    this.countEl.textContent = this._query
      ? `${weapons.length} of ${total} weapons`
      : `${total} weapons`;

    if (!weapons.length) {
      this.gridEl.innerHTML = `<p class="weapon-panel__empty">No weapons match.</p>`;
      return;
    }

    this.gridEl.innerHTML = weapons
      .map((weapon) => {
        const selected = weapon.id === this._equippedId;
        return `
          <button
            class="weapon-panel__card${selected ? ' is-equipped' : ''}"
            type="button"
            data-weapon="${weapon.id}"
          >
            <span class="weapon-panel__card-icon">${categoryGlyph(weapon.category)}</span>
            <span class="weapon-panel__card-name">${weapon.label}</span>
            <span class="weapon-panel__card-desc">${weapon.description ?? ''}</span>
            <span class="weapon-panel__card-fire">${describeFire(fireProfileOf(weapon))}</span>
            ${selected ? '<span class="weapon-panel__card-badge">Equipped</span>' : ''}
          </button>`;
      })
      .join('');

    for (const card of this.gridEl.querySelectorAll('.weapon-panel__card')) {
      card.addEventListener('click', () => {
        const id = card.dataset.weapon;
        if (!id || id === this._equippedId) return;
        this.setEquipped(id);
        this.onSelect?.(id);
        this._renderGrid();
      });
    }
  }

  setEquipped(weaponId) {
    this._equippedId = weaponId;
    const weapon = platform.weapons.get(weaponId);
    this.equippedEl.textContent = `Equipped: ${weapon?.label ?? weaponId}`;
  }

  show() {
    this._visible = true;
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('is-visible'));
    const equipped = platform.getActiveWeaponId?.() ?? this._equippedId;
    this.setEquipped(equipped);
    this._renderGrid();
    // After the keystroke that opened the panel, or its letter lands in the box.
    setTimeout(() => this.searchEl.focus(), 0);
  }

  hide() {
    this._visible = false;
    this.root.classList.remove('is-visible');
    this.searchEl.value = '';
    this._query = '';
    window.setTimeout(() => {
      if (!this._visible) this.root.hidden = true;
    }, 180);
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  get isVisible() {
    return this._visible;
  }
}
