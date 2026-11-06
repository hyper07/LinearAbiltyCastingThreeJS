import { NPC_ROLES } from '../npc/Npcs.js';
import { RARITIES, buyPrice, describeItem, itemColor, itemValue } from '../items/Items.js';
import { mainAnswer } from '../npc/Study.js';

const PRAISE = ['Great job!', 'Yes — you got it!', 'Brilliant!', "That's right, well done!", 'Wonderful thinking!', 'Spot on!'];
const TRY_AGAIN = ['Not quite — have another try!', 'Close! Try once more.', 'Hmm, not that one. Try again!'];
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Talking to an NPC: their words, your replies, and whatever they offer —
 * a quest, a gift, trade, healing, or — with a tutor — study questions. The
 * game is paused while it is open.
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
        <div class="dialogue__study" data-study hidden></div>
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
    this.$('[data-study]').hidden = true;
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
    if (a.study?.available()) button(this.$('[data-study]').hidden ? '✎ Study with me' : '✎ Next question', () => this.showStudy(), true);
    if (npc.data.lines?.length) button('More…', () => this.say(npc.data.name, a.scripted()));
    const q = a.questState();
    if (q?.offer) button(`Quest: ${q.title}`, () => this.system(a.acceptQuest()) || this.refresh(), true);
    if (q?.ready) button('Complete quest', () => this.system(a.completeQuest()) || this.refresh(), true);
    if (q?.active) this.system(`Quest: ${q.title} — ${q.progress}`);
    if (npc.data.role === 'merchant' || npc.data.role === 'healer') button('Trade', () => this.showTrade());
    if (npc.data.role === 'healer') button('Heal me', () => this.system(a.heal()) || this.refresh());
    button('Goodbye (Esc)', () => this.close());
  }

  /** A tutor's question: buttons to pick from, or a box to type in. */
  showStudy() {
    const study = this.actions.study;
    const box = this.$('[data-study]');
    this.$('[data-trade]').hidden = true;
    box.hidden = false;
    const question = study.next();
    if (!question) return;
    this.refresh();
    const name = this.npc.data.name;
    this.say(name, question.q, 'is-question');

    const draw = (disabled = new Set()) => {
      box.replaceChildren();
      const head = document.createElement('div');
      head.className = 'dialogue__study-head';
      head.textContent = `${study.correct()} right so far`;
      const q = document.createElement('p');
      q.className = 'dialogue__study-q';
      q.textContent = question.q;
      box.append(head, q);
      if (question.choices) {
        const row = document.createElement('div');
        row.className = 'dialogue__choices';
        for (const choice of question.choices) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = choice;
          b.disabled = disabled.has(choice);
          b.addEventListener('click', () => submit(choice));
          row.append(b);
        }
        box.append(row);
      } else {
        const form = document.createElement('form');
        form.className = 'dialogue__answer';
        const input = document.createElement('input');
        input.placeholder = 'Type your answer…';
        input.autocomplete = 'off';
        input.maxLength = 120;
        const go = document.createElement('button');
        go.type = 'submit';
        go.className = 'is-primary';
        go.textContent = 'Answer';
        form.append(input, go);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          if (input.value.trim()) submit(input.value.trim());
        });
        box.append(form);
        setTimeout(() => input.focus(), 30);
      }
      const hint = document.createElement('button');
      hint.type = 'button';
      hint.className = 'dialogue__hint';
      hint.textContent = 'Hint, please';
      hint.addEventListener('click', () => giveHint());
      box.append(hint);
    };

    const giveHint = async () => {
      if (question.hint) return this.say(name, question.hint);
      const thinking = this.say(name, '…', 'is-thinking');
      const help = await study.help('hint', question);
      thinking.remove();
      this.say(name, help ?? 'Read the question slowly, one part at a time. You can do it!');
    };

    const finish = () => {
      box.replaceChildren();
      const done = document.createElement('div');
      done.className = 'dialogue__study-head';
      done.textContent = `${study.correct()} right so far`;
      box.append(done);
      this.refresh();
    };

    const wrongTries = new Set();
    const submit = async (given) => {
      this.say('You', given, 'is-player');
      const r = study.answer(given);
      if (r.correct) {
        this.say(name, pickOne(PRAISE), 'is-praise');
        if (r.reward) this.system(r.reward);
        return finish();
      }
      if (!r.final) {
        wrongTries.add(given);
        this.say(name, pickOne(TRY_AGAIN));
        if (question.hint) this.say(name, question.hint);
        return draw(wrongTries);
      }
      this.say(name, `The answer is ${mainAnswer(question.a)}. Let's remember that one!`);
      finish();
      const thinking = this.say(name, '…', 'is-thinking');
      const why = await study.help('explain', question);
      thinking.remove();
      if (why) this.say(name, why);
    };

    draw();
  }

  showTrade() {
    const a = this.actions;
    this.$('[data-study]').hidden = true;
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
          meta.textContent = `${item.type === 'weapon' || item.type === 'gear' ? RARITIES[item.rarity].label + ' · ' : ''}${verb} ${priceOf(item)}g`;
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
