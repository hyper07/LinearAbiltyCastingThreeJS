import { ELEMENT_META } from '../config/settings.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { CONTACT_MARKUP, ContactCard } from './contact.js';

/**
 * Heads-up display: the ability bar, controls, live stats and toasts.
 *
 * Plain DOM — no framework. The bar shows the five spells on keys 1–5
 * (`setSlots`, from the class's skill tree); the slots are the only
 * interactive part, and they mirror the keyboard shortcuts through
 * `onAbility`. An empty slot calls `onEmptySlot` (the game opens the tree).
 *
 * The cooldown sweep is a `conic-gradient` driven by a CSS custom property, so
 * updating it every frame is one `setProperty` call and never touches layout.
 */
export class HUD {
  constructor(root) {
    this.root = root;
    this.onAbility = null;
    this.onEmptySlot = null;
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
        <span data-blurb>WASD to move, arrows to look, 1–5 to pick spells, K for the skill tree — left click attacks, right click casts.</span>
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

        <div style="margin-top:7px"><strong>1</strong>–<strong>5</strong> your five spells &nbsp; <kbd>K</kbd> skill tree</div>
        <div class="hud__help-note">Skill books teach spells and raise their ranks. Far casts aim with a circle, not an arrow.</div>
        <div><strong>Mouse</strong> aim &nbsp; <strong>Left click</strong> attack &nbsp; <strong>Right click</strong> cast</div>
        <div><strong>Esc</strong> — cancel the cast &nbsp; <strong>Middle drag</strong> orbit</div>
        <div><strong>Scroll</strong> zoom</div>

        <div style="margin-top:7px">
          <kbd>N</kbd> next wave &nbsp; <kbd>M</kbd> summon
        </div>
        <div style="margin-top:7px">
          <kbd>I</kbd> armory — 108 weapons &nbsp; <kbd>X</kbd> reload &nbsp; <kbd>B</kbd> run HUD
        </div>
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
   * Lay out the bar: one card per key, in order; `null` is an empty key.
   * @param {(string|null)[]} slots
   */
  setSlots(slots) {
    this.cards.clear();
    this._cooldownShown.clear();
    this.abilityBar.replaceChildren();
    slots.forEach((element, i) => {
      const card = document.createElement('div');
      const meta = element ? ELEMENT_META[element] : null;
      card.className = `ability-card${meta ? '' : ' ability-card--empty'}`;
      // One long word ("Earthsplitter") will not fit the card at full size.
      if (meta && meta.label.split(' ').some((word) => word.length > 9)) card.classList.add('ability-card--long');
      if (meta) {
        card.dataset.element = element;
        card.style.setProperty('--accent', meta.accent);
        card.innerHTML = `
          <div class="ability-card__sweep" data-sweep></div>
          <div class="ability-card__key">${i + 1}</div>
          <div class="ability-card__glyph">${ELEMENT_SIGILS[element] ?? ''}</div>
          <div class="ability-card__label">${meta.label}</div>`;
        this.cards.set(element, card);
      } else {
        card.title = 'Empty — learn spells from skill books (K)';
        card.innerHTML = `
          <div class="ability-card__key">${i + 1}</div>
          <div class="ability-card__glyph ability-card__plus">+</div>
          <div class="ability-card__label">Empty</div>`;
      }
      card.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        if (element) this.onAbility?.(element);
        else this.onEmptySlot?.(i);
      });
      this.abilityBar.append(card);
    });
    if (this._activeElement) this.setElement(this._activeElement, { silent: true });
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
