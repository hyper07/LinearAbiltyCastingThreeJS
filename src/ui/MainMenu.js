import { platform } from '../platform/index.js';
import { deriveCharacterStats } from '../platform/stats/deriveStats.js';
import { buildSkillTree, enrichSkillTree } from '../platform/skill/tree.js';
import { WEAPON_CATEGORY_META, categoryGlyph } from '../platform/weapon/WeaponDefinition.js';
import { CharacterPreview } from './CharacterPreview.js';

/**
 * Pre-game screen — pick a character and weapon, then enter the arena.
 */
export class MainMenu {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   onStart: () => void,
   *   onCharacterChange?: (characterId: string) => Promise<void>,
   *   getCharacter?: () => import('../animation/CharacterController.js').CharacterController,
   *   getEnvironment?: () => import('../world/Environment.js').Environment
   * }} callbacks
   */
  constructor(host, callbacks) {
    this.onStart = callbacks.onStart;
    this.onCharacterChange = callbacks.onCharacterChange ?? (async () => {});
    this.getCharacter = callbacks.getCharacter ?? (() => null);
    this.getEnvironment = callbacks.getEnvironment ?? (() => null);
    this._visible = false;
    this._characterId = platform.getActiveCharacter()?.id ?? 'caster';
    this._weaponId = platform.getActiveWeaponId() ?? 'arcane-wand';
    this._weaponCategory = WEAPON_CATEGORY_META[0].id;
    this._weaponQuery = '';
    this._characterQuery = '';
    this._activePanel = 'loadout';

    this.root = document.createElement('div');
    this.root.className = 'main-menu';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="main-menu__backdrop"></div>
      <div class="main-menu__dialog" role="dialog" aria-label="Main menu">
        <header class="main-menu__head">
          <span class="main-menu__eyebrow">Elemental Arena</span>
          <h1 class="main-menu__title">Choose Your Loadout</h1>
          <p class="main-menu__subtitle">Preview your fighter, customize colors, review skills and stats.</p>
        </header>

        <nav class="main-menu__nav" aria-label="Menu sections">
          <button class="main-menu__nav-btn is-active" type="button" data-panel="loadout">Loadout</button>
          <button class="main-menu__nav-btn" type="button" data-panel="appearance">Appearance</button>
          <button class="main-menu__nav-btn" type="button" data-panel="skills">Skill Tree</button>
          <button class="main-menu__nav-btn" type="button" data-panel="stats">Stats</button>
        </nav>

        <div class="main-menu__body">
          <section class="main-menu__section main-menu__section--characters">
            <h2 class="main-menu__section-title">Character</h2>
            <input
              class="main-menu__search"
              data-character-search
              type="search"
              placeholder="Search classes…"
              spellcheck="false"
            />
            <div class="main-menu__characters" data-characters></div>
          </section>

          <section class="main-menu__section main-menu__section--preview">
            <h2 class="main-menu__section-title">Preview</h2>
            <div class="main-menu__preview-mount" data-preview></div>
          </section>

          <section class="main-menu__section main-menu__section--detail">
            <div class="main-menu__panel is-active" data-panel="loadout">
              <div class="main-menu__section-head">
                <h2 class="main-menu__section-title">Weapon</h2>
                <span class="main-menu__weapon-count" data-weapon-count></span>
              </div>
              <input
                class="main-menu__search"
                data-weapon-search
                type="search"
                placeholder="Search weapons…"
                spellcheck="false"
              />
              <nav class="main-menu__tabs" data-weapon-tabs></nav>
              <div class="main-menu__weapon-grid" data-weapon-grid></div>
            </div>

            <div class="main-menu__panel" data-panel="appearance" hidden>
              <h2 class="main-menu__section-title">Colors</h2>
              <p class="main-menu__panel-hint">Tint the whole body or paint skin and cloth regions separately.</p>
              <div class="main-menu__color-grid" data-appearance-form></div>
            </div>

            <div class="main-menu__panel" data-panel="skills" hidden>
              <h2 class="main-menu__section-title">Skill Tree</h2>
              <p class="main-menu__panel-hint">Equipped abilities for this class loadout.</p>
              <div class="main-menu__skill-tree" data-skill-tree></div>
            </div>

            <div class="main-menu__panel" data-panel="stats" hidden>
              <h2 class="main-menu__section-title">Character Stats</h2>
              <div class="main-menu__stats" data-stats></div>
            </div>
          </section>
        </div>

        <footer class="main-menu__foot">
          <div class="main-menu__summary" data-summary></div>
          <button class="main-menu__start" type="button" data-start>
            Start Game
          </button>
        </footer>
      </div>
    `;
    host.appendChild(this.root);

    this.charactersEl = this.root.querySelector('[data-characters]');
    this.characterSearchEl = this.root.querySelector('[data-character-search]');
    this.previewMount = this.root.querySelector('[data-preview]');
    this.weaponGridEl = this.root.querySelector('[data-weapon-grid]');
    this.weaponTabsEl = this.root.querySelector('[data-weapon-tabs]');
    this.weaponCountEl = this.root.querySelector('[data-weapon-count]');
    this.weaponSearchEl = this.root.querySelector('[data-weapon-search]');
    this.appearanceFormEl = this.root.querySelector('[data-appearance-form]');
    this.skillTreeEl = this.root.querySelector('[data-skill-tree]');
    this.statsEl = this.root.querySelector('[data-stats]');
    this.panelEls = [...this.root.querySelectorAll('.main-menu__panel[data-panel]')];
    this.navBtns = [...this.root.querySelectorAll('.main-menu__nav-btn')];
    this.summaryEl = this.root.querySelector('[data-summary]');
    this.startBtn = this.root.querySelector('[data-start]');

    this.preview = new CharacterPreview(this.previewMount, {
      getCharacter: () => this.getCharacter(),
      getEnvironment: () => this.getEnvironment()
    });

    this._buildCharacters();
    this._buildWeaponTabs();
    this._renderWeapons();
    this._renderAppearancePanel();
    this._renderSkillTree();
    this._renderStats();
    this._updateSummary();

    for (const btn of this.navBtns) {
      btn.addEventListener('click', () => this._switchPanel(btn.dataset.panel));
    }

    this.startBtn.addEventListener('click', () => this._start());
    this.weaponSearchEl.addEventListener('input', () => {
      this._weaponQuery = this.weaponSearchEl.value.trim().toLowerCase();
      this._renderWeapons();
    });
    this.characterSearchEl.addEventListener('input', () => {
      this._characterQuery = this.characterSearchEl.value.trim().toLowerCase();
      this._buildCharacters();
    });
  }

  _characterSeriesOrder() {
    return ['Diablo II', 'Diablo III', 'Original'];
  }

  _filteredCharacters() {
    let characters = platform.characters.all();
    if (!this._characterQuery) return characters;
    return characters.filter((character) => {
      const weapon = platform.loadouts.get(character.defaultLoadout)?.weapon;
      const weaponLabel = platform.weapons.get(weapon)?.label ?? '';
      const haystack = [
        character.label,
        character.series,
        character.tagline,
        character.id,
        weaponLabel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(this._characterQuery);
    });
  }

  _renderCharacterCard(character) {
    const selected = character.id === this._characterId;
    const loadout = platform.loadouts.get(character.defaultLoadout);
    const weapon = platform.weapons.get(loadout?.weapon);
    const meta = weapon?.label ?? platform.motions.get(character.motion)?.label ?? character.motion;
    const icon = character.icon ? `<span class="main-menu__character-icon">${character.icon}</span>` : '';
    const tagline = character.tagline
      ? `<span class="main-menu__character-tagline">${character.tagline}</span>`
      : '';
    return `
      <button
        class="main-menu__character${selected ? ' is-selected' : ''}"
        type="button"
        data-character="${character.id}"
      >
        ${icon}
        <span class="main-menu__character-name">${character.label}</span>
        <span class="main-menu__character-meta">${meta}</span>
        ${tagline}
      </button>`;
  }

  _buildCharacters() {
    const characters = this._filteredCharacters();
    const grouped = new Map();

    for (const character of characters) {
      const series = character.series ?? 'Other';
      if (!grouped.has(series)) grouped.set(series, []);
      grouped.get(series).push(character);
    }

    const parts = [];
    for (const series of this._characterSeriesOrder()) {
      const list = grouped.get(series);
      if (!list?.length) continue;
      parts.push(`<h3 class="main-menu__character-group">${series}</h3>`);
      parts.push(list.map((character) => this._renderCharacterCard(character)).join(''));
      grouped.delete(series);
    }
    for (const [series, list] of grouped) {
      parts.push(`<h3 class="main-menu__character-group">${series}</h3>`);
      parts.push(list.map((character) => this._renderCharacterCard(character)).join(''));
    }

    this.charactersEl.innerHTML =
      parts.join('') ||
      `<p class="main-menu__empty">No classes match “${this._characterQuery}”.</p>`;

    for (const card of this.charactersEl.querySelectorAll('.main-menu__character')) {
      card.addEventListener('click', async () => {
        this._characterId = card.dataset.character;
        const character = platform.characters.get(this._characterId);
        const loadout = platform.loadouts.get(character?.defaultLoadout);
        if (loadout?.weapon) this._weaponId = loadout.weapon;

        card.disabled = true;
        try {
          await this.onCharacterChange(this._characterId);
        } finally {
          card.disabled = false;
        }

        this._buildCharacters();
        this._updateSummary();
        this._renderAppearancePanel();
        this._renderSkillTree();
        this._renderStats();
        this.preview.setCharacter(this._characterId);
        this._applyWeaponSelection(this._weaponId);
      });
    }
  }

  _switchPanel(panelId) {
    if (!panelId || panelId === this._activePanel) return;
    this._activePanel = panelId;

    for (const btn of this.navBtns) {
      btn.classList.toggle('is-active', btn.dataset.panel === panelId);
    }
    for (const panel of this.panelEls) {
      const active = panel.dataset.panel === panelId;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    }

    if (panelId === 'skills') this._renderSkillTree();
    if (panelId === 'stats') this._renderStats();
    if (panelId === 'appearance') this._renderAppearancePanel();
  }

  _renderAppearancePanel() {
    const appearance = platform.getAppearance(this._characterId);
    const fields = [
      { key: 'tint', label: 'Body tint', value: appearance.tint ?? '#ffffff' },
      { key: 'skinColor', label: 'Skin tone', value: appearance.skinColor, optional: true },
      { key: 'clothColor', label: 'Cloth / armor', value: appearance.clothColor, optional: true }
    ];

    this.appearanceFormEl.innerHTML = `
      ${fields
        .map(
          (field) => `
        <label class="main-menu__color-field">
          <span class="main-menu__color-label">${field.label}</span>
          <input
            class="main-menu__color-input"
            type="color"
            data-appearance-key="${field.key}"
            value="${field.value ?? '#ffffff'}"
            ${field.optional && !field.value ? 'disabled' : ''}
          />
          ${
            field.optional
              ? `<button
                  class="main-menu__color-toggle"
                  type="button"
                  data-appearance-toggle="${field.key}"
                  aria-pressed="${field.value ? 'true' : 'false'}"
                >${field.value ? 'On' : 'Off'}</button>`
              : ''
          }
        </label>`
        )
        .join('')}
      <button class="main-menu__color-reset" type="button" data-appearance-reset>
        Reset to defaults
      </button>
    `;

    for (const input of this.appearanceFormEl.querySelectorAll('[data-appearance-key]')) {
      input.addEventListener('input', () => {
        const key = input.dataset.appearanceKey;
        this._applyAppearancePatch({ [key]: input.value });
      });
    }

    for (const toggle of this.appearanceFormEl.querySelectorAll('[data-appearance-toggle]')) {
      toggle.addEventListener('click', () => {
        const key = toggle.dataset.appearanceToggle;
        const enabled = toggle.getAttribute('aria-pressed') !== 'true';
        const colorInput = this.appearanceFormEl.querySelector(`[data-appearance-key="${key}"]`);
        if (enabled) {
          const fallback = key === 'skinColor' ? '#e8c4a8' : '#6a7a92';
          toggle.setAttribute('aria-pressed', 'true');
          toggle.textContent = 'On';
          colorInput.disabled = false;
          colorInput.value = fallback;
          this._applyAppearancePatch({ [key]: fallback });
        } else {
          toggle.setAttribute('aria-pressed', 'false');
          toggle.textContent = 'Off';
          colorInput.disabled = true;
          this._applyAppearancePatch({ [key]: null });
        }
      });
    }

    this.appearanceFormEl.querySelector('[data-appearance-reset]')?.addEventListener('click', () => {
      const next = platform.resetAppearance(this._characterId);
      this._applyAppearanceToModels(next);
      this._renderAppearancePanel();
    });
  }

  /**
   * @param {Partial<import('../platform/appearance/Appearance.js').CharacterAppearance>} patch
   */
  _applyAppearancePatch(patch) {
    const next = platform.setAppearance(patch, this._characterId);
    this._applyAppearanceToModels(next);
  }

  /** @param {import('../platform/appearance/Appearance.js').CharacterAppearance} appearance */
  _applyAppearanceToModels(appearance) {
    this.getCharacter()?.applyAppearance(appearance);
    this.preview.previewCharacter?.applyAppearance(appearance);
  }

  _renderSkillTree() {
    const character = platform.characters.get(this._characterId);
    const loadoutId = character?.defaultLoadout;
    const stats = deriveCharacterStats(platform, this._characterId, this._weaponId);
    const skillStatsById = new Map(stats.skills.map((skill) => [skill.id, skill]));
    const branches = enrichSkillTree(buildSkillTree(platform, loadoutId), skillStatsById);

    this.skillTreeEl.innerHTML = branches
      .map(
        (branch) => `
      <div class="main-menu__skill-branch" style="--branch-accent: ${branch.accent}">
        <div class="main-menu__skill-branch-head">
          <span class="main-menu__skill-branch-dot"></span>
          <span class="main-menu__skill-branch-label">${branch.label}</span>
        </div>
        <div class="main-menu__skill-nodes">
          ${branch.nodes
            .map((node) => {
              const skill = node.skill;
              const stats = node.stats;
              if (!skill) return '';
              return `
            <article class="main-menu__skill-node${node.equipped ? ' is-equipped' : ''}">
              <div class="main-menu__skill-node-head">
                <span class="main-menu__skill-key">${skill.key}</span>
                <strong>${skill.label}</strong>
              </div>
              <p class="main-menu__skill-node-meta">
                ${stats ? `${stats.damage} dmg · ${stats.cooldown}s cd · ${stats.range}m range` : skill.hint}
              </p>
              <span class="main-menu__skill-node-shape">${skill.castShape}</span>
            </article>`;
            })
            .join('')}
        </div>
      </div>`
      )
      .join('');
  }

  _renderStats() {
    const stats = deriveCharacterStats(platform, this._characterId, this._weaponId);

    const statRow = (label, value) =>
      `<div class="main-menu__stat-row"><span>${label}</span><strong>${value}</strong></div>`;

    const skillRows = stats.skills
      .map(
        (skill) => `
      <tr>
        <td><span class="main-menu__skill-key">${skill.key}</span> ${skill.label}</td>
        <td>${skill.damage}</td>
        <td>${skill.cooldown}s</td>
        <td>${skill.range}m</td>
      </tr>`
      )
      .join('');

    const attackRows = stats.attacks
      .map(
        (attack) => `
      <tr>
        <td>${attack.label}</td>
        <td>${attack.damage}</td>
        <td>${attack.cooldown}s</td>
        <td>${attack.range}m</td>
      </tr>`
      )
      .join('');

    this.statsEl.innerHTML = `
      <div class="main-menu__stat-block">
        <h3>Overview</h3>
        ${statRow('Class', stats.character)}
        ${statRow('Series', stats.series || '—')}
        ${statRow('Weapon', stats.weapon)}
        ${statRow('Motion', stats.motion)}
        ${statRow('Health', stats.health)}
      </div>
      <div class="main-menu__stat-block">
        <h3>Movement</h3>
        ${statRow('Walk speed', stats.walkSpeed.toFixed(1))}
        ${statRow('Sprint speed', stats.sprintSpeed.toFixed(1))}
        ${statRow('Jump height', stats.jumpHeight.toFixed(2))}
        ${statRow('Turn rate', stats.turnRate.toFixed(1))}
      </div>
      <div class="main-menu__stat-block main-menu__stat-block--wide">
        <h3>Spells</h3>
        <table class="main-menu__stat-table">
          <thead><tr><th>Skill</th><th>Dmg</th><th>CD</th><th>Range</th></tr></thead>
          <tbody>${skillRows}</tbody>
        </table>
      </div>
      <div class="main-menu__stat-block main-menu__stat-block--wide">
        <h3>Melee attacks</h3>
        <table class="main-menu__stat-table">
          <thead><tr><th>Attack</th><th>Dmg</th><th>CD</th><th>Range</th></tr></thead>
          <tbody>${attackRows || '<tr><td colspan="4">No attacks defined</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  _buildWeaponTabs() {
    this.weaponTabsEl.innerHTML = WEAPON_CATEGORY_META.map(
      (cat) =>
        `<button class="main-menu__tab" type="button" data-category="${cat.id}">
          <span>${cat.glyph}</span>${cat.label}
        </button>`
    ).join('');

    for (const tab of this.weaponTabsEl.querySelectorAll('.main-menu__tab')) {
      tab.addEventListener('click', () => {
        this._weaponCategory = tab.dataset.category;
        this._updateWeaponTabs();
        this._renderWeapons();
      });
    }
    this._updateWeaponTabs();
  }

  _updateWeaponTabs() {
    for (const tab of this.weaponTabsEl.querySelectorAll('.main-menu__tab')) {
      tab.classList.toggle('is-active', tab.dataset.category === this._weaponCategory);
    }
  }

  _filteredWeapons() {
    let weapons = platform.weapons.all();
    if (this._weaponQuery) {
      weapons = weapons.filter(
        (w) =>
          w.label.toLowerCase().includes(this._weaponQuery) ||
          w.id.includes(this._weaponQuery) ||
          (w.description ?? '').toLowerCase().includes(this._weaponQuery)
      );
    } else {
      weapons = weapons.filter((w) => w.category === this._weaponCategory);
    }
    return weapons.sort((a, b) => a.label.localeCompare(b.label));
  }

  _renderWeapons() {
    const weapons = this._filteredWeapons();
    const total = platform.weapons.all().length;

    this.weaponCountEl.textContent = this._weaponQuery
      ? `${weapons.length} of ${total}`
      : `${total} available`;

    if (!weapons.length) {
      this.weaponGridEl.innerHTML = `<p class="main-menu__empty">No weapons match.</p>`;
      return;
    }

    this.weaponGridEl.innerHTML = weapons
      .map((weapon) => {
        const selected = weapon.id === this._weaponId;
        return `
          <button
            class="main-menu__weapon${selected ? ' is-selected' : ''}"
            type="button"
            data-weapon="${weapon.id}"
            title="${weapon.description ?? ''}"
          >
            <span class="main-menu__weapon-icon">${categoryGlyph(weapon.category)}</span>
            <span class="main-menu__weapon-name">${weapon.label}</span>
          </button>`;
      })
      .join('');

    for (const card of this.weaponGridEl.querySelectorAll('.main-menu__weapon')) {
      card.addEventListener('click', () => {
        this._weaponId = card.dataset.weapon;
        this._applyWeaponSelection(this._weaponId);
      });
    }
  }

  /** Sync platform, live character, and preview mesh for a weapon pick. */
  _applyWeaponSelection(weaponId) {
    if (!weaponId) return;
    this._weaponId = weaponId;
    platform.setWeapon(weaponId);
    this.getCharacter()?.equipWeapon(weaponId);
    this.preview.setWeapon(weaponId);
    this._renderWeapons();
    this._renderSkillTree();
    this._renderStats();
    this._updateSummary();
  }

  _updateSummary() {
    const character = platform.characters.get(this._characterId);
    const weapon = platform.weapons.get(this._weaponId);
    this.summaryEl.textContent = `${character?.label ?? 'Caster'} · ${weapon?.label ?? 'Unarmed'}`;
  }

  /** @returns {{ characterId: string, weaponId: string }} */
  getSelection() {
    return { characterId: this._characterId, weaponId: this._weaponId };
  }

  _start() {
    this.onStart?.();
  }

  show() {
    this._visible = true;
    this.root.hidden = false;
    this._characterId = platform.getActiveCharacter()?.id ?? this._characterId;
    this._weaponId = platform.getActiveWeaponId() ?? this._weaponId;
    this._buildCharacters();
    this._renderWeapons();
    this._renderAppearancePanel();
    this._renderSkillTree();
    this._renderStats();
    this._updateSummary();
    requestAnimationFrame(() => this.root.classList.add('is-visible'));
    this.preview._characterId = this._characterId;
    this.preview._weaponId = this._weaponId;
    void this.preview.show(() => this.getCharacter()).then(() => {
      this._applyWeaponSelection(this._weaponId);
    });
  }

  hide() {
    this._visible = false;
    this.root.classList.remove('is-visible');
    this.root.hidden = true;
    this.preview.hide();
    this.weaponSearchEl.value = '';
    this._weaponQuery = '';
  }

  dispose() {
    this.preview.dispose();
    this.root.remove();
  }

  get isVisible() {
    return this._visible;
  }
}
