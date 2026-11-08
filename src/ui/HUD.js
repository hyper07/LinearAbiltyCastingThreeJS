import { ELEMENT_META } from '../config/settings.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { kindIcon } from './itemIcons.js';
import { POTIONS } from '../items/Items.js';
import { POTION_KINDS, potionEntry, potionOf } from '../items/hotbar.js';
import { CONTACT_MARKUP, ContactCard } from './contact.js';

/**
 * Heads-up display: the action bar, controls, live stats and toasts.
 *
 * Plain DOM — no framework. The bar is keys 1–9 (`setSlots`); each holds a
 * skill, a potion or nothing, and the player arranges it:
 * - click a key (or press its number) to use it — `onAbility` for a skill,
 *   `onPotion` for a potion;
 * - drag a key onto another to swap them — `onMoveSlot(from, to)`;
 * - click an empty key, or right-click any key, for a picker of the learned
 *   skills (`getSlotChoices`) and the potions — `onSetSlot`, `onClearSlot`,
 *   and `onEmptySlot` to open the skill tree.
 * The health potion's key pulses while health is low (`setLowHealth`).
 *
 * The cooldown sweep is a `conic-gradient` driven by a CSS custom property, so
 * updating it every frame is one `setProperty` call and never touches layout.
 */
export class HUD {
  constructor(root) {
    this.root = root;
    this.onAbility = null;
    this.onEmptySlot = null;
    this.onPotion = null;
    this.onMoveSlot = null;
    this.onSetSlot = null;
    this.onClearSlot = null;
    this.getSlotChoices = null;
    /** kind → card, for the potions on the bar right now. */
    this.potionCards = new Map();
    this._potions = {};
    this._slots = [];
    this._lowHealth = false;
    this._picker = null;
    this._toastTimer = 0;
    this._statsAccumulator = 0;
    this._frames = 0;
    this._fps = 0;
    /** Last sweep ratio pushed to the DOM, per element. */
    this._cooldownShown = new Map();
    this._armedShown = null;

    root.innerHTML = `
      <div class="hud__panel hud__title">
        Gamory
        <span data-blurb>WASD to move, arrows to look, 1–9 for your skills and potions, K for the skill tree — left click attacks, right click casts.</span>
      </div>

      <div class="hud__panel hud__stats">
        <div>FPS <b data-stat="fps">—</b></div>
        <div>Particles <b data-stat="particles">0</b></div>
        <div>Instances <b data-stat="spikes">0</b></div>
        <div>Draw calls <b data-stat="calls">0</b></div>
      </div>

      <div class="hud__panel hud__help">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> run &nbsp; <kbd>Shift</kbd> sprint &nbsp; <kbd>Alt</kbd> walk</div>
        <div><kbd>Space</kbd> jump &nbsp; <kbd>C</kbd> sit and recover</div>
        <div><kbd>←</kbd><kbd>→</kbd> or <kbd>Q</kbd><kbd>E</kbd> turn the view &nbsp; <kbd>↑</kbd><kbd>↓</kbd> tilt it</div>
        <div class="hud__help-note">WASD moves relative to where the character faces — steer with the mouse.</div>

        <div style="margin-top:7px"><strong>1</strong>–<strong>9</strong> your skills and potions &nbsp; <kbd>K</kbd> skill tree</div>
        <div class="hud__help-note">Drag keys on the bar to swap them; right-click a key to choose what is on it.</div>
        <div><kbd>R</kbd> health potion &nbsp; <kbd>Z</kbd> focus potion &nbsp; <kbd>Tab</kbd> bag</div>
        <div class="hud__help-note">Skill books teach spells and raise their ranks. Far casts aim with a circle, not an arrow.</div>
        <div><strong>Mouse</strong> aim &nbsp; <strong>Left click</strong> attack &nbsp; <strong>Right click</strong> cast</div>
        <div><strong>Esc</strong> — cancel the cast &nbsp; <strong>Middle drag</strong> orbit</div>
        <div><strong>Scroll</strong> zoom</div>

        <div style="margin-top:7px">
          <kbd>N</kbd> next wave &nbsp; <kbd>M</kbd> summon
        </div>
        <div style="margin-top:7px">
          <kbd>I</kbd> armory — 108 weapons &nbsp; <kbd>X</kbd> reload &nbsp; <kbd>V</kbd> scope &nbsp; <kbd>B</kbd> run HUD
        </div>
        <div><kbd>Enter</kbd> party chat (playing together)</div>
        <div class="hud__help-note">The Emberwyrm comes on every fifth wave.</div>
        <div>
          <kbd>G</kbd> editor &nbsp; <kbd>P</kbd> pause &nbsp;
          <kbd>⌫</kbd> clear &nbsp; <kbd>H</kbd> hide this
        </div>
        <div class="hud__help-note">Paused still applies every editor change.</div>
      </div>

      <div class="hud__abilities"></div>

      ${CONTACT_MARKUP}

      <div class="hud__toast" data-toast></div>
      <div class="hud__paused" data-paused>Paused</div>
    `;

    /** element → card, for the spells on the bar right now. */
    this.cards = new Map();

    this.stats = {
      fps: root.querySelector('[data-stat="fps"]'),
      particles: root.querySelector('[data-stat="particles"]'),
      spikes: root.querySelector('[data-stat="spikes"]'),
      calls: root.querySelector('[data-stat="calls"]')
    };
    this.help = root.querySelector('.hud__help');
    this.toast = root.querySelector('[data-toast]');
    this.pausedBadge = root.querySelector('[data-paused]');
    this.abilityBar = root.querySelector('.hud__abilities');
    this.contact = new ContactCard(root);
    this._activeElement = null;
  }

  /**
   * Lay out the bar: one card per key, in order. A key holds a skill (its
   * element), a potion (`potion:health`) or nothing (null).
   * @param {(string|null)[]} slots
   */
  setSlots(slots) {
    this._closePicker();
    this.cards.clear();
    this.potionCards.clear();
    this._cooldownShown.clear();
    this._slots = [...slots];
    this.abilityBar.replaceChildren();
    slots.forEach((entry, i) => {
      const card = document.createElement('div');
      card.dataset.key = String(i);
      const kind = potionOf(entry);
      const meta = entry && !kind ? ELEMENT_META[entry] : null;
      if (kind) {
        const potion = POTIONS[kind];
        card.className = 'ability-card ability-card--potion';
        card.dataset.potion = kind;
        card.style.setProperty('--accent', potion.color);
        card.title = `Key ${i + 1}: ${potion.name}${kind === 'health' ? ' (also R)' : ' (also Z)'} — ${potion.text.replace(/ \([A-Z]\)$/, '')}\nClick or press ${i + 1} to drink · drag to another key to swap · right-click to change`;
        card.innerHTML = `
          <div class="ability-card__sweep" data-sweep></div>
          <div class="ability-card__key">${i + 1}</div>
          <div class="ability-card__glyph ability-card__flask">${kindIcon('potion')}</div>
          <div class="ability-card__label">${kind === 'health' ? 'Health' : 'Focus'}</div>
          <div class="ability-card__count" data-count>${this._potions[kind] ?? 0}</div>`;
        card.classList.toggle('is-out', !(this._potions[kind] > 0));
        this.potionCards.set(kind, card);
      } else if (meta) {
        card.className = 'ability-card';
        // One long word ("Earthsplitter") will not fit the card at full size.
        if (meta.label.split(' ').some((word) => word.length > 9)) card.classList.add('ability-card--long');
        card.dataset.element = entry;
        card.style.setProperty('--accent', meta.accent);
        card.title = `Key ${i + 1}: ${meta.label}\nClick or press ${i + 1} · drag to another key to swap · right-click to change`;
        card.innerHTML = `
          <div class="ability-card__sweep" data-sweep></div>
          <div class="ability-card__key">${i + 1}</div>
          <div class="ability-card__glyph">${ELEMENT_SIGILS[entry] ?? ''}</div>
          <div class="ability-card__label">${meta.label}</div>`;
        this.cards.set(entry, card);
      } else {
        card.className = 'ability-card ability-card--empty';
        card.title = `Key ${i + 1} is empty — click to put a skill or a potion on it`;
        card.innerHTML = `
          <div class="ability-card__key">${i + 1}</div>
          <div class="ability-card__glyph ability-card__plus">+</div>
          <div class="ability-card__label">Empty</div>`;
      }
      card.addEventListener('pointerdown', (event) => this._press(event, card, i));
      card.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._openPicker(i, card);
      });
      this.abilityBar.append(card);
    });
    if (this._activeElement) this.setElement(this._activeElement, { silent: true });
    if (this._lowHealth) this.setLowHealth(true, { force: true });
  }

  /**
   * A press on a key: a click uses it (an empty key opens the picker); moved
   * more than a few pixels, it is a drag, and letting go over another key
   * swaps the two. Used on release, so a drag never drinks a potion.
   */
  _press(event, card, index) {
    event.stopPropagation();
    if (event.button !== 0) return;
    event.preventDefault();
    const entry = this._slots[index];
    const x0 = event.clientX;
    const y0 = event.clientY;
    let ghost = null;
    let over = null;
    const target = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.ability-card');
      return el && this.abilityBar.contains(el) && el !== card ? el : null;
    };
    const move = (e) => {
      if (!ghost) {
        if (!entry || Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
        ghost = card.cloneNode(true);
        ghost.classList.add('ability-card--ghost');
        ghost.style.width = `${card.offsetWidth}px`;
        this.root.append(ghost);
        card.classList.add('is-lifted');
        this.abilityBar.classList.add('is-sorting');
      }
      ghost.style.transform = `translate(${e.clientX - card.offsetWidth / 2}px, ${e.clientY - card.offsetHeight / 2}px)`;
      const next = target(e);
      if (next !== over) {
        over?.classList.remove('is-drop-target');
        over = next;
        over?.classList.add('is-drop-target');
      }
    };
    const up = (e) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      over?.classList.remove('is-drop-target');
      if (ghost) {
        ghost.remove();
        card.classList.remove('is-lifted');
        this.abilityBar.classList.remove('is-sorting');
        const to = e.type === 'pointerup' ? target(e) : null;
        if (to) this.onMoveSlot?.(index, Number(to.dataset.key));
        return;
      }
      if (e.type !== 'pointerup') return;
      const kind = potionOf(entry);
      if (kind) this.onPotion?.(kind);
      else if (entry) this.onAbility?.(entry);
      else this._openPicker(index, card);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /**
   * Choose what goes on a key: any learned skill, either potion, or nothing.
   * `getSlotChoices` (from the game) lists the skills; the potions are always
   * there, because every class drinks them.
   */
  _openPicker(index, card) {
    this._closePicker();
    const current = this._slots[index];
    const picker = document.createElement('div');
    picker.className = 'hud__picker';
    picker.setAttribute('role', 'menu');
    const head = document.createElement('div');
    head.className = 'hud__picker-head';
    head.textContent = `Key ${index + 1}`;
    picker.append(head);
    const option = (label, { accent, glyph, note, on, active, cls = '' } = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hud__picker-option ${cls}`.trim();
      b.setAttribute('role', 'menuitem');
      if (accent) b.style.setProperty('--accent', accent);
      if (active) b.classList.add('is-on');
      b.innerHTML = `<span class="hud__picker-glyph">${glyph ?? ''}</span><span>${label}</span>${note ? `<small>${note}</small>` : ''}`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closePicker();
        on();
      });
      picker.append(b);
    };
    for (const kind of POTION_KINDS) {
      const entry = potionEntry(kind);
      const where = this._slots.indexOf(entry);
      option(POTIONS[kind].name, {
        accent: POTIONS[kind].color,
        glyph: kindIcon('potion'),
        note: `${this._potions[kind] ?? 0} left${where >= 0 && where !== index ? ` · on ${where + 1}` : ''}`,
        active: current === entry,
        cls: 'is-potion',
        on: () => this.onSetSlot?.(index, entry)
      });
    }
    const skills = this.getSlotChoices?.() ?? [];
    if (skills.length) {
      const sep = document.createElement('div');
      sep.className = 'hud__picker-sep';
      sep.textContent = 'Skills';
      picker.append(sep);
    }
    for (const s of skills) {
      const where = this._slots.indexOf(s.element);
      option(s.label, {
        accent: s.accent,
        glyph: ELEMENT_SIGILS[s.element] ?? '',
        note: where >= 0 && where !== index ? `on ${where + 1}` : '',
        active: current === s.element,
        on: () => this.onSetSlot?.(index, s.element)
      });
    }
    if (current) option('Empty this key', { cls: 'is-clear', on: () => this.onClearSlot?.(index) });
    option('Skill tree (K)', { cls: 'is-link', on: () => this.onEmptySlot?.(index) });
    this.root.append(picker);
    // Above the key, kept on screen.
    const r = card.getBoundingClientRect();
    const w = picker.offsetWidth;
    picker.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    picker.style.top = `${Math.max(8, r.top - picker.offsetHeight - 8)}px`;
    this._picker = picker;
    this._pickerAway = (e) => {
      if (!picker.contains(e.target)) this._closePicker();
    };
    this._pickerKey = (e) => {
      if (e.key === 'Escape') this._closePicker();
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', this._pickerAway, true);
      document.addEventListener('keydown', this._pickerKey, true);
    });
    picker.querySelector('button')?.focus({ preventScroll: true });
  }

  _closePicker() {
    if (!this._picker) return;
    this._picker.remove();
    this._picker = null;
    document.removeEventListener('pointerdown', this._pickerAway, true);
    document.removeEventListener('keydown', this._pickerKey, true);
  }

  get pickerOpen() {
    return Boolean(this._picker);
  }

  /** How many of each potion are left (shown on their keys). */
  setPotions(potions) {
    this._potions = { ...potions };
    for (const [kind, card] of this.potionCards) {
      const n = potions[kind] ?? 0;
      const count = card.querySelector('[data-count]');
      if (count && count.textContent !== String(n)) count.textContent = String(n);
      card.classList.toggle('is-out', !(n > 0));
    }
  }

  /** A potion's short cooldown after drinking, as the same sweep a skill has. */
  setPotionCooldown(kind, remaining, total) {
    const card = this.potionCards.get(kind);
    if (!card) return;
    const key = `potion:${kind}`;
    const ratio = Math.max(0, Math.min(1, remaining / Math.max(total, 0.001)));
    if (Math.abs(ratio - (this._cooldownShown.get(key) ?? -1)) < 0.01) return;
    this._cooldownShown.set(key, ratio);
    card.style.setProperty('--cooldown', ratio);
    card.classList.toggle('is-cooling', ratio > 0.001);
  }

  /** Health is low: the health potion's key pulses (only with potions left). */
  setLowHealth(low, { force = false } = {}) {
    if (low === this._lowHealth && !force) return;
    this._lowHealth = low;
    this.potionCards.get('health')?.classList.toggle('is-urgent', low);
  }

  /** @param {{silent?: boolean}} [options] */
  setElement(element, options = {}) {
    this._activeElement = element;
    for (const [key, card] of this.cards) {
      card.classList.toggle('is-active', key === element);
    }
    const meta = ELEMENT_META[element];
    this.contact.setAccent(meta?.accent);
    if (meta && !options.silent) this.showToast(`${meta.hint} selected`);
  }

  /** Play the contact card's entrance once the loading veil is clearing. */
  reveal() {
    this.contact.reveal();
  }

  /** Highlight the slot while a cast is armed. */
  setArmed(armed) {
    if (armed === this._armedShown) return;
    this._armedShown = armed;
    this.abilityBar.classList.toggle('is-armed', armed);
  }

  /**
   * Drive one slot's cooldown sweep. Cooldowns are per ability, so this is
   * called once per element each frame.
   *
   * @param {string} element
   * @param {number} remaining seconds left
   * @param {number} total     the full cooldown, for the sweep angle
   */
  setCooldown(element, remaining, total) {
    const card = this.cards.get(element);
    if (!card) return;

    const ratio = Math.max(0, Math.min(1, remaining / Math.max(total, 0.001)));
    // Only touch the DOM when the sweep visibly moves.
    if (Math.abs(ratio - (this._cooldownShown.get(element) ?? -1)) < 0.01) return;
    this._cooldownShown.set(element, ratio);
    card.style.setProperty('--cooldown', ratio);
    card.classList.toggle('is-cooling', ratio > 0.001);
  }

  /** Dim a card whose skill costs more Rage than there is. */
  setStarved(element, starved) {
    const card = this.cards.get(element);
    if (card && card.classList.contains('is-starved') !== starved) card.classList.toggle('is-starved', starved);
  }

  setPaused(paused) {
    this.pausedBadge.classList.toggle('is-visible', paused);
  }

  /** Hide gameplay chrome while the main menu is open. */
  setGameplayVisible(visible) {
    this.root.classList.toggle('hud--menu', !visible);
  }

  toggleHelp() {
    this.help.classList.toggle('is-hidden');
  }

  showToast(message, duration = 1600) {
    this.toast.textContent = message;
    this.toast.classList.add('is-visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toast.classList.remove('is-visible'), duration);
  }

  /**
   * @param {number} dt
   * @param {() => {particles:number, spikes:number, calls:number}} collect
   *   Called only when the readout actually refreshes, so gathering the numbers
   *   (which means walking the particle pools) stays off the hot path.
   */
  update(dt, collect) {
    this._frames++;
    this._statsAccumulator += dt;
    if (this._statsAccumulator < 0.4) return;

    this._fps = Math.round(this._frames / this._statsAccumulator);
    this._frames = 0;
    this._statsAccumulator = 0;

    const info = collect();
    this.stats.fps.textContent = this._fps;
    this.stats.particles.textContent = info.particles;
    this.stats.spikes.textContent = info.spikes;
    this.stats.calls.textContent = info.calls;
  }
}

/** Boot screen helper. */
export class LoadingScreen {
  constructor() {
    this.element = document.getElementById('loader');
    this.fill = document.getElementById('loader-fill');
    this.status = document.getElementById('loader-status');
  }

  setProgress(ratio, message) {
    this.fill.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
    if (message) this.status.textContent = message;
  }

  hide() {
    this.setProgress(1);
    setTimeout(() => this.element.classList.add('is-hidden'), 220);
  }

  fail(message) {
    this.status.textContent = message;
    this.status.style.color = '#ff7a6a';
  }
}
