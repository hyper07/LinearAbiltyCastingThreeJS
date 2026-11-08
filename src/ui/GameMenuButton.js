/**
 * Top-right in-game control — pause/resume, auto-drink on or off, or return
 * to the main menu.
 */
export class GameMenuButton {
  /**
   * @param {HTMLElement} host
   * @param {{ onPause: () => void, onExit: () => void, onAutoDrink?: (on: boolean) => void }} callbacks
   */
  constructor(host, callbacks) {
    this.onPause = callbacks.onPause;
    this.onExit = callbacks.onExit;
    this.onAutoDrink = callbacks.onAutoDrink;
    this._visible = false;
    this._open = false;
    this._paused = false;

    this.root = document.createElement('div');
    this.root.className = 'game-menu-btn';
    this.root.hidden = true;
    this.root.innerHTML = `
      <button class="game-menu-btn__toggle" type="button" data-toggle aria-haspopup="true" aria-expanded="false">
        <span class="game-menu-btn__icon">☰</span>
        <span class="game-menu-btn__label">Menu</span>
      </button>
      <div class="game-menu-btn__popover" data-popover hidden>
        <button class="game-menu-btn__action" type="button" data-pause>Pause</button>
        <label class="game-menu-btn__action game-menu-btn__check" title="Drinks a health potion for you when health falls below 30%">
          <input type="checkbox" data-autodrink />
          <span>Auto-drink health potion<small>below 30% health</small></span>
        </label>
        <button class="game-menu-btn__action game-menu-btn__action--exit" type="button" data-exit>
          Exit to Main Menu
        </button>
      </div>
    `;
    host.appendChild(this.root);

    this.toggleBtn = this.root.querySelector('[data-toggle]');
    this.popover = this.root.querySelector('[data-popover]');
    this.pauseBtn = this.root.querySelector('[data-pause]');
    this.autoDrinkBox = this.root.querySelector('[data-autodrink]');
    this.autoDrinkBox.addEventListener('change', () => this.onAutoDrink?.(this.autoDrinkBox.checked));

    this.toggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this._setOpen(!this._open);
    });

    this.pauseBtn.addEventListener('click', () => {
      this.onPause?.();
      this._setOpen(false);
    });

    this.root.querySelector('[data-exit]').addEventListener('click', () => {
      this.onExit?.();
      this._setOpen(false);
    });

    document.addEventListener('pointerdown', (event) => {
      if (!this._open || !this._visible) return;
      if (!this.root.contains(event.target)) this._setOpen(false);
    });
  }

  _setOpen(open) {
    this._open = open;
    this.popover.hidden = !open;
    this.root.classList.toggle('is-open', open);
    this.toggleBtn.setAttribute('aria-expanded', String(open));
  }

  setPaused(paused) {
    this._paused = paused;
    this.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    this.root.classList.toggle('is-paused', paused);
  }

  setAutoDrink(on) {
    this.autoDrinkBox.checked = Boolean(on);
  }

  show() {
    this._visible = true;
    this.root.hidden = false;
  }

  hide() {
    this._visible = false;
    this._setOpen(false);
    this.root.hidden = true;
  }

  dispose() {
    this.root.remove();
  }
}
