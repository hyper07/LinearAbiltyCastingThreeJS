/**
 * One Studio game open for building: its live preview on the left (the runtime, playable —
 * click it, then WASD), and on the right the chat box that grows it, its history of changes
 * with Undo, who may see it (private, a class, or public), and its credits.
 *
 * Every accepted chat change is one commit to the game's draft (server/studio/repo.js), so it
 * shows in the admin's Changes & deploy; production never changes from here.
 */
import { studio } from './studioClient.js';
import { ago, button, el } from './ui.js';
import { creditsOf } from '../shared/studio/spec.js';

const SUGGESTIONS = ['Add a snowy forest map with a frozen lake', 'Make the boss slower', 'Add a coin sound', 'Add 3 slime enemies', 'Make it night with rain on this map', 'More coins', 'Add a friendly guide who says "Follow the river!"', 'Play calm music'];
const CHAT_KEY = (code) => `gamory.studio.chat.${code}`;

export class GameEditor {
  constructor(page, code) {
    this.page = page;
    this.code = code;
    this.mapIndex = 0;
    this.root = el('div', { class: 'st-editor' });
    try {
      this.log = JSON.parse(sessionStorage.getItem(CHAT_KEY(code)) ?? '[]');
    } catch {
      this.log = [];
    }
  }

  async load() {
    try {
      const got = await studio.game(this.code);
      this.game = got.game;
      this.data = got.data;
      this.changes = got.changes;
      this.classes = got.classes;
    } catch (error) {
      this.root.replaceChildren(el('div', { class: 'st-empty' }, el('p', { text: error.message }), button('My games', () => this.page.open('games'))));
      return;
    }
    this.render();
  }

  render() {
    const stage = el('div', { class: 'st-editor__stage' });
    this.box = el('div', { class: 'st-editor__box', tabindex: '-1', 'aria-label': 'Live preview — click, then use WASD' });
    this.mapChips = el('div', { class: 'st-chips st-chips--small', 'aria-label': 'Maps' });
    const tools = el('div', { class: 'st-row st-row--between' },
      el('div', {}, el('b', { text: this.game.title }), ' ', el('span', { class: `st-badge st-badge--${this.game.visibility}`, text: this.game.visibility })),
      el('div', { class: 'st-row' },
        button('↻ Restart', () => this.mount(), { title: 'Start this map again' }),
        button('⛶ Play full screen', () => this.page.playFull(this.code), { kind: 'primary' }),
        button('🧺 Add assets', () => this.page.open('assets', { code: this.code }))));
    stage.append(tools, this.box, this.mapChips, el('p', { class: 'st-note', text: 'Click the preview, then WASD / arrows to move, Space, J to attack. H = how to play.' }));

    this.side = el('div', { class: 'st-editor__side' });
    const tabs = el('div', { class: 'st-subtabs', role: 'tablist' });
    this.panel = el('div', { class: 'st-editor__panel' });
    for (const [id, label] of [['chat', '💬 Chat'], ['changes', '🕘 Changes'], ['share', '👥 Share'], ['credits', '📜 Credits']]) {
      tabs.append(button(label, () => this.showTab(id), { data: { sub: id } }));
    }
    this.side.append(tabs, this.panel);
    this.root.replaceChildren(stage, this.side);
    this.renderMaps();
    this.showTab('chat');
    this.mount();
  }

  renderMaps() {
    this.mapChips.replaceChildren();
    this.data.maps.maps.forEach((m, i) => {
      const chip = button(`${i + 1}. ${m.name}`, () => {
        this.mapIndex = i;
        this.renderMaps();
        this.mount();
      }, { kind: 'chip', title: `${m.biome}, ${m.features.join(', ')}` });
      chip.classList.toggle('is-active', i === this.mapIndex);
      this.mapChips.append(chip);
    });
  }

  /** (Re)start the live preview on the current map. */
  async mount() {
    this.page.previews.activate(this.box, async (host) => {
      const { mountStudioGame } = await import('../shared/studio/runtime.js');
      const game = await mountStudioGame(host, this.data, { mode: 'embedded', fullscreen: false, map: this.mapIndex, onEvent: (event, d) => {
        if (event === 'map' && d.index !== this.mapIndex) {
          this.mapIndex = d.index;
          this.renderMaps();
        }
      } });
      this.runtime = game;
      return game;
    });
    // activate() is a no-op for the slot already live: swap the data in instead.
    if (this.page.previews.active?.slot === this.box && this.runtime && !this.runtime.closed && this.runtime.data !== this.data) this.runtime.setData(this.data, { map: this.mapIndex });
    else if (this.page.previews.active?.slot === this.box && this.runtime && !this.runtime.closed) this.runtime.loadMap(this.mapIndex);
  }

  resume() {
    this.mount();
  }

  showTab(id) {
    for (const b of this.side.querySelectorAll('[data-sub]')) b.classList.toggle('is-active', b.dataset.sub === id);
    this.tab = id;
    if (id === 'chat') return this.renderChat();
    if (id === 'changes') return this.renderChanges();
    if (id === 'share') return this.renderShare();
    return this.renderCredits();
  }

  /* ---------------------------------------------------------------- chat */

  saveLog() {
    try {
      sessionStorage.setItem(CHAT_KEY(this.code), JSON.stringify(this.log.slice(-40)));
    } catch {
      /* private mode: the chat is just not kept */
    }
  }

  renderChat() {
    const meta = this.page._meta;
    const list = el('div', { class: 'st-chat', 'aria-live': 'polite' });
    const draw = () => {
      list.replaceChildren();
      if (!this.log.length) list.append(el('div', { class: 'st-msg st-msg--bot' }, el('p', { text: `Hi! Tell me what to add or change. I can add maps, monsters, bosses, helpers, sounds and music, or change speeds, weather and the look.${meta.lm ? '' : ' (The LM model is off on this server, so I use the offline planner — short, clear requests work best.)'}` })));
      for (const msg of this.log) {
        const node = el('div', { class: `st-msg st-msg--${msg.who}` }, el('p', { text: msg.text }));
        if (msg.changes?.length) node.append(el('ul', { class: 'st-diff' }, msg.changes.map((c) => el('li', { text: c }))));
        if (msg.note) node.append(el('p', { class: 'st-note', text: msg.note }));
        if (msg.who === 'bot' && msg.commit && !msg.undone) {
          node.append(el('div', { class: 'st-row' },
            el('span', { class: 'st-note', text: `${msg.source === 'lm' ? 'LM model' : 'offline planner'} · saved as ${msg.commit.slice(0, 9)}` }),
            button('↶ Undo', async (e) => {
              e.currentTarget.disabled = true;
              try {
                const out = await studio.undo(this.code, msg.commit);
                msg.undone = true;
                this.data = out.data;
                this.changes = out.changes;
                this.log.push({ who: 'bot', text: 'Undone.', commit: null });
                this.saveLog();
                this.afterData();
                draw();
              } catch (error) {
                this.page.fail(error);
                e.currentTarget.disabled = false;
              }
            }, { kind: 'small' })));
        }
        if (msg.undone) node.append(el('p', { class: 'st-note', text: 'Undone' }));
        list.append(node);
      }
      list.scrollTop = list.scrollHeight;
    };
    const input = el('textarea', { class: 'st-input st-chat__input', rows: '2', maxlength: '600', placeholder: 'e.g. add a snowy forest map with a frozen lake', 'aria-label': 'What to change' });
    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.log.push({ who: 'me', text });
      draw();
      sendBtn.disabled = true;
      const thinking = el('div', { class: 'st-msg st-msg--bot is-thinking' }, el('p', { text: 'Thinking…' }));
      list.append(thinking);
      try {
        const out = await studio.chat(this.code, text, this.data.maps.maps[this.mapIndex]?.id ?? null);
        this.log.push({ who: 'bot', text: out.reply, changes: out.changes, commit: out.commit, source: out.source, note: out.note });
        if (out.data) {
          const before = this.data.maps.maps.length;
          this.data = out.data;
          // A new map: go and look at it.
          if (this.data.maps.maps.length > before) this.mapIndex = this.data.maps.maps.length - 1;
          this.afterData();
        }
      } catch (error) {
        this.log.push({ who: 'bot', text: error.message, error: true });
        if (error.upgrade) this.page.fail(error);
      } finally {
        thinking.remove();
        sendBtn.disabled = false;
        this.saveLog();
        draw();
        input.focus();
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    const sendBtn = button('Send', send, { kind: 'primary' });
    const chips = el('div', { class: 'st-chips st-chips--small' });
    for (const s of SUGGESTIONS) chips.append(button(s, () => {
      input.value = s;
      input.focus();
    }, { kind: 'chip' }));
    this.panel.replaceChildren(list, chips, el('div', { class: 'st-row st-chat__send' }, input, sendBtn), el('p', { class: 'st-note', text: 'Each change is saved as its own version you can undo. Players see it only after it is shared or published.' }));
    draw();
  }

  /** New data from the server: the preview, the map chips and the open tab follow. */
  afterData() {
    this.mapIndex = Math.min(this.mapIndex, this.data.maps.maps.length - 1);
    this.renderMaps();
    if (this.runtime && !this.runtime.closed) this.runtime.setData(this.data, { map: this.mapIndex });
    else this.mount();
    if (this.tab === 'credits') this.renderCredits();
  }

  /* ------------------------------------------------------------- changes */

  async renderChanges() {
    this.panel.replaceChildren(el('p', { class: 'st-note', text: 'Loading…' }));
    try {
      const got = await studio.game(this.code);
      this.changes = got.changes;
    } catch (error) {
      return this.page.fail(error);
    }
    const list = el('div', { class: 'st-list' });
    for (const c of this.changes) {
      const dataOnly = c.files.every((f) => f.startsWith('data/'));
      list.append(el('div', { class: 'st-item' },
        el('div', {}, el('b', { text: c.subject.replace(/^Studio: /, '') }), el('div', { class: 'st-note', text: `${c.short} · ${c.author} · ${ago(c.date)} · +${c.added} −${c.removed}` })),
        dataOnly ? button('↶ Undo', async () => {
          try {
            const out = await studio.undo(this.code, c.hash);
            this.data = out.data;
            this.changes = out.changes;
            this.afterData();
            this.page.toast('Undone — saved as a new version.');
            this.renderChanges();
          } catch (error) {
            this.page.fail(error);
          }
        }, { kind: 'small' }) : null));
    }
    this.panel.replaceChildren(el('p', { class: 'st-note', text: 'Every version of this game, newest first. Undo makes a new version that reverses one change. The platform admin picks versions to release from these (Changes & deploy).' }), list);
  }

  /* --------------------------------------------------------------- share */

  async renderShare() {
    const g = this.game;
    const meta = this.page._meta;
    const box = el('div', { class: 'st-share' });
    const options = [
      ['private', 'Private', 'Only you. Unlimited on every plan.'],
      ['shared', 'Shared with my classes', 'Only students in the classes you share it with. Never on the home page, in search or the store.'],
      ['public', 'Public', 'On the home page for everyone, after a review. Counts against your plan’s public games.']
    ];
    const radios = el('div', { class: 'st-radio', role: 'radiogroup', 'aria-label': 'Who can play it' });
    for (const [id, label, blurb] of options) {
      const input = el('input', { type: 'radio', name: 'st-vis', value: id, checked: g.visibility === id });
      input.addEventListener('change', async () => {
        try {
          if (id === 'public' && !(await this.page.confirm('Make it public?', 'The game goes to the platform team for a check. Once approved and released, anyone can play it. Assets you bought with a class-only licence are not allowed in public games.', 'Send for review'))) {
            radios.querySelector(`[value="${g.visibility}"]`).checked = true;
            return;
          }
          const out = await studio.visibility(this.code, id);
          this.game = { ...this.game, ...out.game };
          if (out.note) this.page.toast(out.note);
          this.renderShare();
        } catch (error) {
          this.page.fail(error);
          radios.querySelector(`[value="${g.visibility}"]`).checked = true;
        }
      });
      radios.append(el('label', { class: 'st-radio__row' }, input, el('span', {}, el('b', { text: label }), el('small', { text: blurb }))));
    }
    box.append(el('h3', { text: 'Who can play it' }), radios);
    if (g.visibility === 'public') box.append(el('p', { class: 'st-note', text: { pending: 'Waiting for review.', approved: 'Approved — the admin releases it to the home page.', rejected: `Not approved${g.public_note ? `: ${g.public_note}` : ''}.` }[g.public_status] ?? '' }));
    box.append(el('h3', { text: 'Classes' }));
    let classes;
    try {
      classes = (await studio.classes()).teaching.filter((c) => c.status === 'active');
    } catch (error) {
      return this.page.fail(error);
    }
    if (!classes.length) box.append(el('p', { class: 'st-note', text: 'You have no classes yet.' }), button('🏫 Make a class', () => this.page.open('classes'), { kind: 'small' }));
    for (const c of classes) {
      const shared = this.classes?.some((x) => x.id === c.id);
      const version = el('select', { class: 'st-input st-input--small', 'aria-label': 'Which version' }, el('option', { value: 'current', text: 'This version (pinned)' }), el('option', { value: 'draft', text: 'Always the newest' }));
      box.append(el('div', { class: 'st-item' }, el('div', {}, el('b', { text: c.name }), el('div', { class: 'st-note', text: `${c.members} students${shared ? ' · shared' : ''}` })),
        el('div', { class: 'st-row' }, version,
          button(shared ? 'Update' : 'Share', async () => {
            try {
              await studio.assign(c.id, this.code, version.value);
              this.page.toast(`Shared with ${c.name}`);
              const got = await studio.game(this.code);
              this.game = got.game;
              this.classes = got.classes;
              this.renderShare();
            } catch (error) {
              this.page.fail(error);
            }
          }, { kind: 'small' }),
          shared ? button('Stop sharing', async () => {
            try {
              await studio.unassign(c.id, this.code);
              const got = await studio.game(this.code);
              this.classes = got.classes;
              this.renderShare();
            } catch (error) {
              this.page.fail(error);
            }
          }, { kind: 'small' }) : null)));
    }
    if (!meta.git) box.append(el('p', { class: 'st-note', text: 'This server cannot save versions (no git checkout): sharing a pinned version is off.' }));
    this.panel.replaceChildren(box);
  }

  /* ------------------------------------------------------------- credits */

  renderCredits() {
    const rows = creditsOf(this.data);
    this.panel.replaceChildren(
      el('p', { class: 'st-note', text: 'Shown in the game (Esc → Credits). Assets you add from the browser are credited here automatically.' }),
      el('ul', { class: 'st-credits' }, rows.map((c) => el('li', {}, el('b', { text: c.what }), ` — ${c.who}`, c.site ? el('span', {}, ' (', el('a', { href: c.site, target: '_blank', rel: 'noopener noreferrer', text: c.site.replace(/^https?:\/\//, '') }), ')') : null, `, ${c.licence}`))));
  }

  dispose() {
    this.page.previews.release();
    this.runtime = null;
  }
}
