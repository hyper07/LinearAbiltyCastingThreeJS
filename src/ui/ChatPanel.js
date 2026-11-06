/**
 * The command line you fight through.
 *
 * Plain DOM, like the rest of the HUD. Three things it has to get right, all of
 * them about not getting in the way of a game that is played with the keyboard:
 *
 *   1. **Focus is explicit.** The panel is visible all the time but the input
 *      only takes keys once you put the caret in it (Enter, T, or a click).
 *      `Escape` hands the keyboard straight back to the game. Without that
 *      rule, pressing Q to cast would type a "q".
 *   2. **Pointer events stop here.** The HUD is `pointer-events: none` so clicks
 *      fall through to the canvas and cast; this panel opts back in, and
 *      `InputManager` already ignores presses that start on DOM.
 *   3. **The log is bounded.** Old lines are removed, not just scrolled past.
 *
 * It knows nothing about abilities or monsters — it takes a string and hands it
 * to whoever is listening. `AIDirector` is what turns it into a fight.
 */
export class ChatPanel {
  /**
   * @param {HTMLElement} host
   * @param {(text: string) => void} onSubmit
   */
  constructor(host, onSubmit) {
    this.onSubmit = onSubmit;
    this._history = [];
    this._historyIndex = -1;
    this._maxLines = 60;

    this.root = document.createElement('div');
    this.root.className = 'chat';
    this.root.innerHTML = `
      <div class="chat__head">
        <span class="chat__dot" data-dot></span>
        <span class="chat__title">Commander</span>
        <span class="chat__model" data-model>offline</span>
        <button class="chat__collapse" data-collapse title="Hide (T)">–</button>
      </div>
      <div class="chat__log" data-log></div>
      <form class="chat__form" data-form>
        <input
          class="chat__input"
          data-input
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Give an order — &quot;freeze the big one, then meteor it&quot;"
        />
        <button class="chat__send" type="submit" title="Send">▸</button>
      </form>
    `;
    host.appendChild(this.root);

    this.log = this.root.querySelector('[data-log]');
    this.input = this.root.querySelector('[data-input]');
    this.dot = this.root.querySelector('[data-dot]');
    this.modelLabel = this.root.querySelector('[data-model]');
    this.form = this.root.querySelector('[data-form]');

    this.form.addEventListener('submit', this._onSubmit);
    this.input.addEventListener('keydown', this._onKeyDown);
    this.root.querySelector('[data-collapse]').addEventListener('click', () => this.toggle());

    this.say(
      'system',
      'Type an order and I will cast it. Try: "meteor the group", "snare whatever is closest", "summon two brutes", "next wave".'
    );
  }

  /* ------------------------------------------------------------------ */

  _onSubmit = (event) => {
    event.preventDefault();
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this._history.push(text);
    if (this._history.length > 30) this._history.shift();
    this._historyIndex = this._history.length;
    this.onSubmit?.(text);
  };

  _onKeyDown = (event) => {
    // The input swallows every key while focused (so WASD does not cast), but
    // these three are navigation and belong to the panel.
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.blur();
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (!this._history.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowUp' ? -1 : 1;
      this._historyIndex = Math.max(0, Math.min(this._history.length, this._historyIndex + step));
      this.input.value = this._history[this._historyIndex] ?? '';
      // Caret to the end, or the arrow keys fight the recall.
      requestAnimationFrame(() => this.input.setSelectionRange(9999, 9999));
    }
  };

  /* ------------------------------------------------------------------ */

  /**
   * Append one line.
   * @param {'player'|'ai'|'system'} role
   * @param {string} text
   * @param {{source?: string}} [meta] `source: 'reflex'` marks a no-model answer
   */
  say(role, text, meta = {}) {
    const line = document.createElement('div');
    line.className = `chat__line is-${role}`;
    if (meta.source === 'reflex') line.classList.add('is-reflex');

    const who = document.createElement('b');
    who.textContent = role === 'player' ? 'You' : role === 'ai' ? 'Cmd' : '—';
    const body = document.createElement('span');
    body.textContent = text;

    line.append(who, body);
    this.log.appendChild(line);

    while (this.log.children.length > this._maxLines) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
    return line;
  }

  /** Show or clear the "thinking" state while the model is working. */
  setBusy(busy) {
    this.root.classList.toggle('is-busy', busy);
    this.input.placeholder = busy
      ? 'Thinking…'
      : 'Give an order — "freeze the big one, then meteor it"';
  }

  /**
   * @param {'online'|'offline'} state
   * @param {string} detail model id, or why not
   */
  setStatus(state, detail) {
    this.root.classList.toggle('is-online', state === 'online');
    this.modelLabel.textContent = state === 'online' ? detail : 'reflex only';
    this.modelLabel.title =
      state === 'online'
        ? `Planning with ${detail}`
        : 'No model bridge — keyword orders still work.';
  }

  /* ------------------------------------------------------------------ */

  focus() {
    this.root.classList.remove('is-collapsed');
    this.input.focus();
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }

  blur() {
    this.input.blur();
  }

  get isFocused() {
    return document.activeElement === this.input;
  }

  toggle() {
    const collapsed = this.root.classList.toggle('is-collapsed');
    if (collapsed) this.blur();
    else this.focus();
  }

  dispose() {
    this.form.removeEventListener('submit', this._onSubmit);
    this.input.removeEventListener('keydown', this._onKeyDown);
    this.root.remove();
  }
}
