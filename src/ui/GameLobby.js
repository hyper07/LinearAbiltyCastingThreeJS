import { LobbyStage } from './LobbyStage.js';

/** Colours to click (the picker at the end of each row takes any other). */
const TINT_SWATCHES = [['#ffffff', 'As made'], ['#ffd9c2', 'Peach'], ['#ffe9a8', 'Butter'], ['#c9f5d3', 'Mint'], ['#bfe6ff', 'Sky'], ['#d9c8ff', 'Lilac'], ['#ffc2dc', 'Blossom'], ['#c8ccd6', 'Ash']];
const CLOTH_SWATCHES = [['#7a5cff', 'Violet'], ['#ff5da2', 'Pink'], ['#ff7a59', 'Coral'], ['#ffc93c', 'Sun'], ['#2fd3a0', 'Mint'], ['#38b6ff', 'Sky'], ['#3a4a8a', 'Navy'], ['#8a5a3a', 'Bark'], ['#e8edf3', 'Cloud'], ['#2b2b38', 'Night']];
/** A colour for each class card, in turn. */
const TONES = ['#ff5da2', '#ffc93c', '#38b6ff', '#2fd3a0', '#8b5cf6', '#ff7a59'];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/** Genres where empty places are filled by AI rivals. */
const AI_GENRES = new Set(['battle-royale', 'squad-royale']);

/**
 * A game's lobby: before you play, who you are in it and who you play with.
 *
 *   **The stage** — everyone's chosen character side by side, in the body and
 *   colours they picked, with their name; idle while choosing, a cheer on Ready.
 *   **Your character** — the classes this game offers. Each is its own
 *   character in this game: one you have played shows its level and gold, a
 *   new one starts at level 1 with nothing. Customize its body and colours.
 *   **Players and chat** — alone, press Start. With friends, invite them with a
 *   code, talk while you wait; each picks and presses Ready, and the host
 *   starts when everyone is ready. In a battle royale the host sets how many
 *   AI rivals fill the empty places.
 *
 * Over the party: the host sends `lobby` (the game, the AI setting) and
 * `lobby-close`; everyone sends `lobby-pick` (class, body, colours, Ready);
 * chat is the party's own.
 */
export class GameLobby {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   party: () => import('../net/Party.js').Party,
   *   heroes: (roster: object[]) => { id: string, name: string, icon?: string, tagline?: string }[],
   *   characters: (gameId: string) => Promise<{ classId: string, level: number, gold: number }[]>,
   *   looks: (classId: string) => { id: string, label: string }[],
   *   modelOf: (look: string) => string|null,
   *   loadGLB: (url: string) => Promise<object>,
   *   custom: (gameId: string, classId: string) => { look?: string, tint?: string, cloth?: string }|null,
   *   lastHero: (gameId: string) => string|null,
   *   start: (game: object, choice: { classId: string, custom: object }, options: { rivals: number|null }) => Promise<void>,
   *   closed: () => void
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.game = null;
    this.choice = null;
    this.ready = false;
    this.rivals = 7;
    /** peer id → { classId, ready, look, tint, cloth } */
    this.picks = new Map();
    this.root = el('div', 'lobby');
    this.root.hidden = true;
    host.appendChild(this.root);
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
    this._chatBound = false;
  }

  get isOpen() {
    return !this.root.hidden;
  }

  get party() {
    return this.actions.party();
  }

  get isGuest() {
    return this.party.isGuest;
  }

  /**
   * Open the lobby for a game.
   * @param {{ id, title, roster, genre }} game
   * @param {{ asGuest?: boolean, rivals?: number }} [options]
   */
  async open(game, { asGuest = false, rivals = null } = {}) {
    this.game = game;
    this.ready = false;
    if (rivals != null) this.rivals = rivals;
    this.heroes = this.actions.heroes(game.roster ?? []);
    const last = this.actions.lastHero(game.id);
    const classId = this.heroes.some((h) => h.id === last) ? last : this.heroes[0]?.id ?? null;
    this._choose(classId);
    this._build();
    this.root.hidden = false;
    this.stage.show();
    this.owned = await this.actions.characters(game.id).catch(() => []);
    this._renderHeroes();
    if (!this._chatBound) {
      this._chatBound = true;
      this.party.on('chat', () => this.isOpen && this._renderChat());
    }
    if (!asGuest) this._broadcast();
    this._sendPick();
  }

  close({ tell = true } = {}) {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.stage?.hide();
    if (tell && this.party.isHost) this.party.send({ t: 'lobby-close' });
    this.actions.closed();
  }

  /** What this player chose for a game (for when the host starts it). */
  pickFor(gameId) {
    return this.game?.id === gameId && this.choice?.classId ? this.choice : null;
  }

  _choose(classId) {
    const saved = this.actions.custom(this.game.id, classId) ?? {};
    const looks = this.actions.looks(classId);
    this.choice = { classId, custom: { look: looks.some((l) => l.id === saved.look) ? saved.look : looks[0]?.id, tint: saved.tint, cloth: saved.cloth } };
  }

  /* ---- the party ---- */

  _broadcast() {
    if (!this.party.isHost || !this.game) return;
    const g = this.game;
    this.party.send({ t: 'lobby', game: { id: g.id, title: g.title, roster: g.roster ?? [], genre: g.genre }, rivals: this.rivals });
  }

  _sendPick() {
    if (!this.party.inParty || !this.choice) return;
    const c = this.choice.custom;
    this.party.send({ t: 'lobby-pick', classId: this.choice.classId, ready: this.ready, look: c.look ?? null, tint: c.tint ?? null, cloth: c.cloth ?? null });
  }

  /** A party message about the lobby. */
  onMessage(msg, remote) {
    if (msg.t === 'lobby') {
      if (!this.isGuest) return;
      if (!this.isOpen || this.game?.id !== msg.game?.id) this.open(msg.game, { asGuest: true, rivals: msg.rivals });
      else {
        this.rivals = msg.rivals;
        this._renderPlayers();
      }
    } else if (msg.t === 'lobby-close') {
      if (this.isGuest) this.close({ tell: false });
    } else if (msg.t === 'lobby-pick' && remote) {
      const str = (v) => (typeof v === 'string' ? v.slice(0, 40) : null);
      this.picks.set(remote.id, { classId: str(msg.classId) ?? '', ready: Boolean(msg.ready), look: str(msg.look), tint: str(msg.tint), cloth: str(msg.cloth) });
      if (this.isOpen) {
        this._renderPlayers();
        this._renderFoot();
      }
    }
  }

  /** Someone joined or left: the host tells newcomers what is going on. */
  onPartyChange() {
    for (const id of [...this.picks.keys()]) if (!this.party.remotes.has(id)) this.picks.delete(id);
    if (!this.isOpen) return;
    this._broadcast();
    this._sendPick();
    this._renderPlayers();
    this._renderChat();
    this._renderFoot();
  }

  get everyoneReady() {
    const others = this.party.inParty ? this.party.members().filter((m) => !m.you) : [];
    return others.every((m) => this.picks.get(m.id)?.ready);
  }

  /* ---- the screen: built once, parts refreshed ---- */

  _build() {
    const g = this.game;
    this.root.replaceChildren();
    const card = el('div', 'lobby__card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `${g.title} — lobby`);
    // Each kind of game has its own accent: a calm study game is mint, a hunt is coral…
    this.root.dataset.genre = /study|calm/.test(g.genre ?? '') ? 'study' : /royale|survival/.test(g.genre ?? '') ? 'royale' : /boss|hunt|dungeon/.test(g.genre ?? '') ? 'hunt' : 'quest';

    const head = el('header', 'lobby__head');
    const back = el('button', 'lobby__back', '← Back');
    back.type = 'button';
    back.dataset.lobbyBack = '';
    back.addEventListener('click', () => this.close());
    head.append(back, el('h2', 'lobby__title', g.title), el('span', 'lobby__sub', 'Choose who you play as'));
    card.append(head);

    // The stage: a renderer made once, moved into each new lobby.
    const stageBox = el('div', 'lobby-stage');
    stageBox.dataset.lobbyStage = '';
    if (this.stage) this.stage.attach(stageBox);
    else this.stage = new LobbyStage(stageBox, { loadGLB: this.actions.loadGLB, modelOf: this.actions.modelOf });
    this._bindStageDrag(stageBox);
    // Left: your character on its stage, and how it looks. Right: who to be, and who you play with.
    const look = el('section', 'lobby__look');
    stageBox.append(el('span', 'lobby-stage__hint', 'drag to turn'));
    this.customEl = el('div', 'lobby__custom');
    look.append(stageBox, this.customEl);
    card.append(look);

    const mine = el('section', 'lobby__section');
    mine.append(el('h3', 'lobby__heading', 'Your character'));
    this.heroesEl = el('div', 'lobby__heroes');
    mine.append(this.heroesEl);
    mine.append(el('p', 'lobby__hint', 'Each class is its own character in this game: a new one starts at level 1; one you have played keeps its level, gear and gold.'));
    card.append(mine);

    const side = el('section', 'lobby__section lobby__players');
    side.append(el('h3', 'lobby__heading', 'Players'));
    this.playersEl = el('div', 'lobby__players-list');
    side.append(this.playersEl);
    side.append(el('h3', 'lobby__heading', 'Chat'));
    this.chatEl = el('div', 'lobby__chat');
    side.append(this.chatEl);
    this.footEl = el('div', 'lobby__foot');
    side.append(this.footEl);
    card.append(side);
    this.root.append(card);

    this._renderHeroes();
    this._renderCustom();
    this._renderPlayers();
    this._renderChat();
    this._renderFoot();
  }

  _bindStageDrag(box) {
    let drag = null;
    box.addEventListener('pointerdown', (e) => (drag = e.clientX));
    box.addEventListener('pointermove', (e) => {
      if (drag == null) return;
      this.stage.turn += (e.clientX - drag) * 0.01;
      drag = e.clientX;
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) box.addEventListener(type, () => (drag = null));
  }

  _renderHeroes() {
    if (!this.heroesEl) return;
    const owned = new Map((this.owned ?? []).map((c) => [c.classId, c]));
    this.heroesEl.replaceChildren();
    for (const hero of this.heroes) {
      const have = owned.get(hero.id);
      const b = el('button', `lobby__hero${hero.id === this.choice.classId ? ' is-chosen' : ''}`);
      b.type = 'button';
      b.dataset.lobbyHero = hero.id;
      b.append(el('span', 'lobby__icon', hero.icon || '⚔️'), el('strong', null, hero.name), el('em', 'lobby__tagline', hero.tagline ?? ''), el('small', null, have ? `Level ${have.level} · ${have.gold} gold` : 'New · level 1'));
      b.classList.toggle('is-played', Boolean(have));
      b.style.setProperty('--tone', TONES[this.heroesEl.children.length % TONES.length]);
      b.disabled = this.ready;
      b.addEventListener('click', () => {
        this._choose(hero.id);
        this._sendPick();
        this._renderHeroes();
        this._renderCustom();
        this._renderPlayers();
      });
      this.heroesEl.append(b);
    }
  }

  _renderCustom() {
    if (!this.customEl) return;
    this.customEl.replaceChildren();
    const looks = this.actions.looks(this.choice.classId);
    const changed = () => {
      this._sendPick();
      this._renderPlayers();
    };
    const row = (name) => {
      const box = el('div', 'lobby__field');
      box.append(el('span', 'lobby__field-name', name));
      const body = el('div', 'lobby__choices');
      box.append(body);
      this.customEl.append(box);
      return body;
    };
    if (looks.length > 1) {
      // The body: one button each, not a list to open.
      const body = row('Body');
      for (const look of looks) {
        const b = el('button', `lobby__chip${look.id === this.choice.custom.look ? ' is-on' : ''}`, look.label);
        b.type = 'button';
        b.dataset.lobbyLook = look.id;
        b.disabled = this.ready;
        b.addEventListener('click', () => {
          this.choice.custom.look = look.id;
          changed();
          this._renderCustom();
        });
        body.append(b);
      }
    }
    // Colours: a row of swatches to click, and a picker at the end for any other.
    for (const [key, name, fallback, palette] of [['tint', 'Colour', '#ffffff', TINT_SWATCHES], ['cloth', 'Clothes', '#7a5cff', CLOTH_SWATCHES]]) {
      const body = row(name);
      const now = (this.choice.custom[key] ?? fallback).toLowerCase();
      for (const [color, label] of palette) {
        const b = el('button', `lobby__swatch${color === now ? ' is-on' : ''}`);
        b.type = 'button';
        b.dataset.lobbySwatch = `${key}:${color}`;
        b.style.setProperty('--swatch', color);
        b.title = label;
        b.setAttribute('aria-label', `${name}: ${label}`);
        b.setAttribute('aria-pressed', String(color === now));
        b.disabled = this.ready;
        b.addEventListener('click', () => {
          this.choice.custom[key] = color;
          changed();
          this._renderCustom();
        });
        body.append(b);
      }
      const own = el('label', `lobby__swatch lobby__swatch--own${palette.some(([c]) => c === now) ? '' : ' is-on'}`);
      own.title = 'Any other colour';
      own.style.setProperty('--swatch', palette.some(([c]) => c === now) ? '#ffffff' : now);
      const input = el('input');
      input.type = 'color';
      input.dataset.lobbyColor = key;
      input.value = now;
      input.disabled = this.ready;
      input.setAttribute('aria-label', `${name}: any other colour`);
      let timer = null;
      input.addEventListener('input', () => {
        this.choice.custom[key] = input.value;
        own.style.setProperty('--swatch', input.value);
        clearTimeout(timer);
        timer = setTimeout(changed, 120);
      });
      input.addEventListener('change', () => this._renderCustom());
      own.append(el('span', null, '🎨'), input);
      body.append(own);
    }
    const dice = el('button', 'lobby__chip lobby__dice', '🎲 Surprise me');
    dice.type = 'button';
    dice.dataset.lobbySurprise = '';
    dice.disabled = this.ready;
    dice.addEventListener('click', () => {
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      if (looks.length) this.choice.custom.look = pick(looks).id;
      this.choice.custom.tint = pick(TINT_SWATCHES)[0];
      this.choice.custom.cloth = pick(CLOTH_SWATCHES)[0];
      changed();
      this._renderCustom();
    });
    this.customEl.append(dice);
  }

  /** The member list and the stage, which show the same people. */
  _renderPlayers() {
    if (!this.playersEl) return;
    const party = this.party;
    const heroes = this.heroes;
    this.playersEl.replaceChildren();
    const me = { id: party.id ?? 'me', name: party.name || 'You', you: true, host: party.isHost || !party.inParty, classId: this.choice.classId, ready: this.ready || party.isHost || !party.inParty, ...this.choice.custom };
    const members = [me];
    if (!party.inParty) {
      this.playersEl.append(el('p', 'lobby__hint', 'Play alone, or invite friends: they join with a code, pick their own characters, and you can chat here while you wait.'));
      const invite = el('button', 'lobby__btn', 'Invite friends');
      invite.type = 'button';
      invite.dataset.lobbyInvite = '';
      invite.addEventListener('click', async () => {
        invite.disabled = true;
        try {
          await party.create();
          this._broadcast();
          this._sendPick();
        } finally {
          this._renderPlayers();
          this._renderChat();
          this._renderFoot();
        }
      });
      this.playersEl.append(invite);
    } else {
      this.playersEl.append(el('p', 'lobby__code', `Party code: ${party.code}`));
      const list = el('ul', 'lobby__members');
      for (const m of party.members()) {
        const pick = m.you ? me : this.picks.get(m.id);
        if (!m.you) members.push({ id: m.id, name: m.name, you: false, host: m.host, classId: pick?.classId, ready: Boolean(pick?.ready), look: pick?.look ?? this.actions.looks(pick?.classId ?? '')[0]?.id, tint: pick?.tint, cloth: pick?.cloth });
        const hero = heroes.find((h) => h.id === pick?.classId);
        const ready = m.host || pick?.ready;
        const li = el('li', ready ? 'is-ready' : '');
        li.dataset.member = m.id;
        li.append(el('strong', null, `${m.name}${m.host ? ' ★' : ''}${m.you ? ' (you)' : ''}`), el('span', null, hero ? `${hero.icon ?? ''} ${hero.name}` : 'choosing…'), el('em', null, m.host ? 'host' : pick?.ready ? 'Ready' : 'not ready'));
        list.append(li);
      }
      this.playersEl.append(list);
    }
    if (AI_GENRES.has(this.game.genre)) {
      const ai = el('label', 'lobby__field lobby__ai');
      ai.append(el('span', null, 'AI rivals for the empty places'));
      const range = el('input');
      range.type = 'range';
      range.min = '0';
      range.max = '15';
      range.value = String(this.rivals);
      range.dataset.lobbyRivals = '';
      range.disabled = this.isGuest;
      const value = el('b', null, String(this.rivals));
      range.addEventListener('input', () => {
        this.rivals = Number(range.value);
        value.textContent = range.value;
        this._broadcast();
      });
      ai.append(range, value);
      this.playersEl.append(ai);
    }
    // Everyone on the stage, the way they will look.
    this.stage.set(members.filter((m) => m.classId && m.look).map((m) => ({ id: m.id, name: m.name, look: m.look, tint: m.tint, cloth: m.cloth, ready: Boolean(m.ready) && !(m.you && !party.inParty), you: m.you })));
  }

  _renderChat() {
    if (!this.chatEl) return;
    const party = this.party;
    this.chatEl.replaceChildren();
    if (!party.inParty) {
      this.chatEl.append(el('p', 'lobby__hint', 'Invite friends to chat here.'));
      return;
    }
    const log = el('div', 'lobby__chat-log');
    log.dataset.lobbyChat = '';
    for (const line of party.chat.slice(-30)) {
      const row = el('p', line.you ? 'is-you' : '');
      row.append(el('strong', null, `${line.name}: `), document.createTextNode(line.text));
      log.append(row);
    }
    if (!party.chat.length) log.append(el('p', 'lobby__hint', 'Say hi while everyone chooses.'));
    const form = el('form', 'lobby__chat-form');
    const input = el('input');
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = 'Say something…';
    input.dataset.lobbyChatInput = '';
    input.setAttribute('aria-label', 'Chat message');
    const send = el('button', 'lobby__btn', 'Send');
    send.type = 'submit';
    form.append(input, send);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      party.say(text);
      input.value = '';
      requestAnimationFrame(() => this.chatEl.querySelector('[data-lobby-chat-input]')?.focus());
    });
    this.chatEl.append(log, form);
    log.scrollTop = log.scrollHeight;
  }

  _renderFoot() {
    if (!this.footEl) return;
    const party = this.party;
    this.footEl.replaceChildren();
    if (this.isGuest) {
      const ready = el('button', `lobby__btn lobby__btn--primary${this.ready ? ' is-on' : ''}`, this.ready ? 'Ready ✓ — waiting for the host' : 'Ready');
      ready.type = 'button';
      ready.dataset.lobbyReady = '';
      ready.addEventListener('click', () => {
        this.ready = !this.ready;
        this._sendPick();
        this._renderHeroes();
        this._renderCustom();
        this._renderPlayers();
        this._renderFoot();
      });
      this.footEl.append(ready);
      return;
    }
    const waiting = party.inParty && !this.everyoneReady;
    const start = el('button', 'lobby__btn lobby__btn--primary', waiting ? 'Waiting for everyone to be ready…' : '▶ Start');
    start.type = 'button';
    start.dataset.lobbyStart = '';
    start.disabled = waiting || !this.choice.classId;
    start.addEventListener('click', async () => {
      start.disabled = true;
      this.root.hidden = true;
      this.stage.hide();
      await this.actions.start(this.game, this.choice, { rivals: AI_GENRES.has(this.game.genre) ? this.rivals : null });
    });
    this.footEl.append(start);
  }
}
