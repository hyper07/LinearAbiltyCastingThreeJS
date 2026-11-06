import { NPC_ROLES } from '../npc/Npcs.js';
import { RARITIES, buyPrice, describeItem, itemColor, itemValue } from '../items/Items.js';

/**
 * Talking to an NPC: their words, your replies, and whatever they offer —
 * a quest, a gift, trade, healing. The game is paused while it is open.
 *
 * The App supplies `actions` (see `App._npcActions`), so this file only knows
 * how to show things and which button calls what.
 */
export class DialoguePanel {
  constructor(host) {
    this.root = document.createElement('div');
    this.root.className = 'dialogue';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="dialogue__card">
        <header class="dialogue__head">
          <div><strong data-name></strong><span data-role></span></div>
          <span class="dialogue__gold" data-gold></span>
        </header>
        <div class="dialogue__log" data-log></div>
        <form class="dialogue__ask" data-ask>
          <input data-input maxlength="240" placeholder="Ask anything…" autocomplete="off" spellcheck="false" />
          <button type="submit" class="is-primary">Ask</button>
        </form>
        <div class="dialogue__trade" data-trade hidden></div>
        <div class="dialogue__actions" data-actions></div>
      </div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);
    this.$('[data-ask]').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.$('[data-input]');
      const text = input.value.trim();
      if (!text || this._busy) return;
      input.value = '';
      this._ask(text);
    });
    // Typing here must never reach the game's keys.
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.close();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /**
   * @param {import('../npc/Npcs.js').Npc} npc
   * @param {object} actions see App._npcActions
   */
  open(npc, actions) {
    this.npc = npc;
    this.actions = actions;
    const role = NPC_ROLES[npc.data.role] ?? NPC_ROLES.guide;
    this.$('[data-name]').textContent = npc.data.name;
    this.$('[data-role]').textContent = role.label;
    this.$('[data-role]').style.color = role.color;
    this.$('[data-log]').replaceChildren();
    this.$('[data-trade]').hidden = true;
    this.$('[data-ask]').hidden = !npc.data.ai;
    this.root.hidden = false;
    // Esc closes from anywhere, not only when focus is inside the panel.
    this._onEscape ??= (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        event.stopPropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onEscape, true);
    this.say(npc.data.name, npc.data.greeting || actions.scripted());
    // A gift is handed over the first time you speak.
    const gift = actions.takeGift();
    if (gift) this.system(gift);
    this.refresh();
    if (npc.data.ai) setTimeout(() => this.$('[data-input]').focus(), 50);
  }

  close() {
    if (this.root.hidden) return;
    this.root.hidden = true;
    window.removeEventListener('keydown', this._onEscape, true);
    document.activeElement?.blur?.();
    this.actions?.onClose?.();
  }

  say(who, text, cls = '') {
    const line = document.createElement('p');
    line.className = `dialogue__line ${cls}`.trim();
    const name = document.createElement('strong');
    name.textContent = `${who}: `;
    line.append(name, document.createTextNode(text));
    this.$('[data-log]').append(line);
    this.$('[data-log]').scrollTop = 1e9;
    return line;
  }

  system(text) {
    const line = document.createElement('p');
    line.className = 'dialogue__line is-system';
    line.textContent = text;
    this.$('[data-log]').append(line);
    this.$('[data-log]').scrollTop = 1e9;
  }

  async _ask(text) {
    this._busy = true;
    this.say('You', text, 'is-player');
    const thinking = this.say(this.npc.data.name, '…', 'is-thinking');
    try {
      const reply = await this.actions.ask(text);
      thinking.remove();
      this.say(this.npc.data.name, reply.text);
      if (reply.source === 'script' && reply.note) this.system(`(${reply.note} — a scripted line instead)`);
    } finally {
      this._busy = false;
    }
  }

  /** Rebuild the buttons for what this NPC can do right now. */
  refresh() {
    const a = this.actions;
    const npc = this.npc;
    this.$('[data-gold]').textContent = `${a.gold()} gold`;
    const box = this.$('[data-actions]');
    box.replaceChildren();
    const button = (label, onClick, primary = false) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (primary) b.className = 'is-primary';
      b.addEventListener('click', onClick);
      box.append(b);
      return b;
    };
    if (npc.data.lines?.length) button('More…', () => this.say(npc.data.name, a.scripted()));
    const q = a.questState();
    if (q?.offer) button(`Quest: ${q.title}`, () => this.system(a.acceptQuest()) || this.refresh(), true);
    if (q?.ready) button('Complete quest', () => this.system(a.completeQuest()) || this.refresh(), true);
    if (q?.active) this.system(`Quest: ${q.title} — ${q.progress}`);
    if (npc.data.role === 'merchant' || npc.data.role === 'healer') button('Trade', () => this.showTrade());
    if (npc.data.role === 'healer') button('Heal me', () => this.system(a.heal()) || this.refresh());
    button('Goodbye (Esc)', () => this.close());
  }

  showTrade() {
    const a = this.actions;
    const trade = this.$('[data-trade]');
    trade.hidden = false;
    const draw = () => {
      trade.replaceChildren();
      const col = (title, items, priceOf, onPick, verb) => {
        const box = document.createElement('div');
        box.className = 'dialogue__col';
        const h = document.createElement('h4');
        h.textContent = title;
        box.append(h);
        if (!items.length) {
          const empty = document.createElement('p');
          empty.className = 'dialogue__empty';
          empty.textContent = 'Nothing here.';
          box.append(empty);
        }
        for (const item of items) {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'dialogue__item';
          row.style.borderColor = itemColor(item);
          row.title = describeItem(item).join('\n');
          const name = document.createElement('span');
          name.textContent = item.name;
          name.style.color = itemColor(item);
          const meta = document.createElement('small');
          meta.textContent = `${item.type === 'weapon' ? RARITIES[item.rarity].label + ' · ' : ''}${verb} ${priceOf(item)}g`;
          row.append(name, meta);
          row.addEventListener('click', () => {
            this.system(onPick(item));
            draw();
            this.refresh();
          });
          box.append(row);
        }
        return box;
      };
      trade.append(
        col('For sale', a.stock(), buyPrice, (item) => a.buy(item), 'buy'),
        col('Your bag — click to sell', a.bag(), itemValue, (item) => a.sell(item), 'sell')
      );
    };
    draw();
  }
}
