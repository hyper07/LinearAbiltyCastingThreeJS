/**
 * Full-screen story card shown before and after a level: eyebrow, title,
 * speaker, paragraphs, the goal, and a row of buttons. `show` resolves with
 * the `value` of the button pressed (Enter picks the primary one).
 */
export class StoryPanel {
  constructor(host) {
    this.root = document.createElement('div');
    this.root.className = 'story';
    this.root.hidden = true;
    host.appendChild(this.root);
  }

  /**
   * @param {{ eyebrow?: string, title?: string, speaker?: string, text?: string, goal?: string,
   *           buttons: { label: string, value: string, primary?: boolean }[] }} scene
   * @returns {Promise<string>}
   */
  show(scene) {
    this.root.replaceChildren();
    const card = document.createElement('div');
    card.className = 'story__card';
    const add = (tag, cls, text) => {
      if (!text) return null;
      const el = document.createElement(tag);
      el.className = cls;
      el.textContent = text;
      card.append(el);
      return el;
    };
    add('div', 'story__eyebrow', scene.eyebrow);
    add('h2', 'story__title', scene.title);
    add('div', 'story__speaker', scene.speaker);
    if (scene.text?.trim()) {
      const body = document.createElement('div');
      body.className = 'story__text';
      for (const paragraph of scene.text.split(/\n\s*\n/)) {
        const p = document.createElement('p');
        p.textContent = paragraph.trim();
        body.append(p);
      }
      card.append(body);
    }
    add('div', 'story__goal', scene.goal);
    const actions = document.createElement('div');
    actions.className = 'story__actions';
    card.append(actions);
    this.root.append(card);
    this.root.hidden = false;

    return new Promise((resolve) => {
      const finish = (value) => {
        window.removeEventListener('keydown', onKey, true);
        this.root.hidden = true;
        resolve(value);
      };
      const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        const primary = scene.buttons.find((b) => b.primary) ?? scene.buttons[0];
        finish(primary.value);
      };
      for (const button of scene.buttons) {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = button.label;
        if (button.primary) el.className = 'is-primary';
        el.addEventListener('click', () => finish(button.value));
        actions.append(el);
      }
      window.addEventListener('keydown', onKey, true);
      actions.querySelector('.is-primary')?.focus();
    });
  }

  hide() {
    this.root.hidden = true;
  }
}
