const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * "Choose your character" — the first time a player joins a game, from the
 * characters that game offers (its roster). The choice is that game's alone:
 * the character starts fresh there and is kept there.
 */
export class RosterPicker {
  constructor(host) {
    this.root = el('div', 'roster');
    this.root.hidden = true;
    host.appendChild(this.root);
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this._finish(null);
    });
    this.root.addEventListener('click', (e) => e.target === this.root && this._finish(null));
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /**
   * @param {{ title: string, heroes: { id: string, name: string, icon?: string, tagline?: string }[] }} options
   * @returns {Promise<string|null>} the chosen character's id, or null (not now)
   */
  choose({ title, heroes }) {
    this._finish(null);
    this.root.replaceChildren();
    const card = el('div', 'roster__card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Choose your character');
    card.append(el('span', 'roster__eyebrow', title));
    card.append(el('h2', 'roster__title', 'Choose your character'));
    card.append(el('p', 'roster__hint', 'You start this game fresh with them, and they stay in this game only: what you earn here is kept here.'));
    const grid = el('div', 'roster__grid');
    for (const hero of heroes) {
      const b = el('button', 'roster__hero');
      b.type = 'button';
      b.dataset.hero = hero.id;
      b.append(el('span', 'roster__icon', hero.icon || '⚔️'), el('strong', null, hero.name), el('small', null, hero.tagline || ''));
      b.addEventListener('click', () => this._finish(hero.id));
      grid.append(b);
    }
    card.append(grid);
    const cancel = el('button', 'roster__cancel', 'Not now');
    cancel.type = 'button';
    cancel.addEventListener('click', () => this._finish(null));
    card.append(cancel);
    this.root.append(card);
    this.root.hidden = false;
    grid.querySelector('button')?.focus();
    return new Promise((resolve) => (this._resolve = resolve));
  }

  _finish(value) {
    const resolve = this._resolve;
    this._resolve = null;
    this.root.hidden = true;
    resolve?.(value);
  }
}
