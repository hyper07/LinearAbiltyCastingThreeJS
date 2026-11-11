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
 *   **Your character** — the classes this game offers. Each is its own
 *   character in this game: one you have played shows its level and gold,
 *   a new one starts at level 1 with nothing. Customize its body and colours.
 *   **Players** — alone, press Start. With friends, invite them with a code:
 *   each picks their own character and presses Ready, and the host starts
 *   when everyone is ready. In a battle royale the host sets how many AI
 *   rivals fill the empty places.
 *
 * Over the party: the host sends `lobby` (the game, the AI setting) and
 * `lobby-close`; everyone sends `lobby-pick` (their class, Ready).
 */
export class GameLobby {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   party: () => import('../net/Party.js').Party,
   *   heroes: (roster: object[]) => { id: string, name: string, icon?: string, tagline?: string }[],
   *   characters: (gameId: string) => Promise<{ classId: string, level: number, gold: number }[]>,
   *   looks: (classId: string) => { id: string, label: string }[],
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
    /** peer id → { classId, ready } */
    this.picks = new Map();
    this.root = el('div', 'lobby');
    this.root.hidden = true;
    host.appendChild(this.root);
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
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
    const heroes = this.actions.heroes(game.roster ?? []);
    const last = this.actions.lastHero(game.id);
    const classId = heroes.some((h) => h.id === last) ? last : heroes[0]?.id ?? null;
    this.choice = { classId, custom: { ...(this.actions.custom(game.id, classId) ?? {}) } };
    this.root.hidden = false;
    this.owned = await this.actions.characters(game.id).catch(() => []);
    this.render();
    if (!asGuest) this._broadcast();
    this._sendPick();
  }

  close({ tell = true } = {}) {
    if (!this.isOpen) return;
    this.root.hidden = true;
    if (tell && this.party.isHost) this.party.send({ t: 'lobby-close' });
    this.actions.closed();
  }

  /** What this player chose for a game (for when the host starts it). */
  pickFor(gameId) {
    return this.game?.id === gameId && this.choice?.classId ? this.choice : null;
  }

  /* ---- the party ---- */

  _broadcast() {
    if (!this.party.isHost || !this.game) return;
    const g = this.game;
    this.party.send({ t: 'lobby', game: { id: g.id, title: g.title, roster: g.roster ?? [], genre: g.genre }, rivals: this.rivals });
  }

  _sendPick() {
    if (!this.party.inParty || !this.choice) return;
    this.party.send({ t: 'lobby-pick', classId: this.choice.classId, ready: this.ready });
  }

  /** A party message about the lobby. */
  onMessage(msg, remote) {
    if (msg.t === 'lobby') {
      if (!this.isGuest) return;
      if (!this.isOpen || this.game?.id !== msg.game?.id) this.open(msg.game, { asGuest: true, rivals: msg.rivals });
      else {
        this.rivals = msg.rivals;
        this.render();
      }
    } else if (msg.t === 'lobby-close') {
      if (this.isGuest) this.close({ tell: false });
    } else if (msg.t === 'lobby-pick' && remote) {
      this.picks.set(remote.id, { classId: String(msg.classId ?? ''), ready: Boolean(msg.ready) });
      if (this.isOpen) this.render();
    }
  }

  /** Someone joined or left: the host tells newcomers what is going on. */
  onPartyChange() {
    for (const id of [...this.picks.keys()]) if (!this.party.remotes.has(id)) this.picks.delete(id);
    if (!this.isOpen) return;
    this._broadcast();
    this._sendPick();
    this.render();
  }

  get everyoneReady() {
    const others = this.party.inParty ? this.party.members().filter((m) => !m.you) : [];
    return others.every((m) => this.picks.get(m.id)?.ready);
  }

  /* ---- the screen ---- */

  render() {
    const g = this.game;
    if (!g) return;
    const heroes = this.actions.heroes(g.roster ?? []);
    const owned = new Map((this.owned ?? []).map((c) => [c.classId, c]));
    this.root.replaceChildren();
    const card = el('div', 'lobby__card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `${g.title} — lobby`);

    const head = el('header', 'lobby__head');
    const back = el('button', 'lobby__back', '← Back');
    back.type = 'button';
    back.dataset.lobbyBack = '';
    back.addEventListener('click', () => this.close());
    head.append(back, el('h2', 'lobby__title', g.title));
    card.append(head);

    /* your character */
    const mine = el('section', 'lobby__section');
    mine.append(el('h3', 'lobby__heading', 'Your character'));
    mine.append(el('p', 'lobby__hint', 'Each class is its own character in this game. A new one starts at level 1 with nothing; one you have played keeps its level, gear and gold here.'));
    const grid = el('div', 'lobby__heroes');
    for (const hero of heroes) {
      const have = owned.get(hero.id);
      const b = el('button', `lobby__hero${hero.id === this.choice.classId ? ' is-chosen' : ''}`);
      b.type = 'button';
      b.dataset.lobbyHero = hero.id;
      b.append(el('span', 'lobby__icon', hero.icon || '⚔️'), el('strong', null, hero.name), el('small', null, have ? `Level ${have.level} · ${have.gold} gold` : 'New — starts at level 1'));
      b.disabled = this.ready;
      b.addEventListener('click', () => {
        this.choice = { classId: hero.id, custom: { ...(this.actions.custom(g.id, hero.id) ?? {}) } };
        this._sendPick();
        this.render();
      });
      grid.append(b);
    }
    mine.append(grid);

    // Customize: the body, and two colours.
    const custom = el('div', 'lobby__custom');
    const looks = this.actions.looks(this.choice.classId);
    if (looks.length) {
      const label = el('label', 'lobby__field');
      label.append(el('span', null, 'Body'));
      const select = el('select');
      select.dataset.lobbyLook = '';
      for (const look of looks) {
        const o = el('option', null, look.label);
        o.value = look.id;
        o.selected = look.id === (this.choice.custom.look ?? looks[0].id);
        select.append(o);
      }
      select.disabled = this.ready;
      select.addEventListener('change', () => (this.choice.custom.look = select.value));
      label.append(select);
      custom.append(label);
    }
    for (const [key, name, fallback] of [['tint', 'Colour', '#ffffff'], ['cloth', 'Clothes', '#7a5cff']]) {
      const label = el('label', 'lobby__field');
      label.append(el('span', null, name));
      const input = el('input');
      input.type = 'color';
      input.dataset.lobbyColor = key;
      input.value = this.choice.custom[key] ?? fallback;
      input.disabled = this.ready;
      input.addEventListener('input', () => (this.choice.custom[key] = input.value));
      label.append(input);
      custom.append(label);
    }
    mine.append(custom);
    card.append(mine);

    /* players */
    const players = el('section', 'lobby__section lobby__players');
    players.append(el('h3', 'lobby__heading', 'Players'));
    const party = this.party;
    if (!party.inParty) {
      players.append(el('p', 'lobby__hint', 'Play alone, or invite friends: they join with a code and pick their own characters.'));
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
          this.render();
        }
      });
      players.append(invite);
    } else {
      players.append(el('p', 'lobby__code', `Party code: ${party.code}`));
      const list = el('ul', 'lobby__members');
      for (const m of party.members()) {
        const pick = m.you ? { classId: this.choice.classId, ready: this.ready || party.isHost } : this.picks.get(m.id);
        const hero = heroes.find((h) => h.id === pick?.classId);
        const li = el('li', pick?.ready ? 'is-ready' : '');
        li.dataset.member = m.id;
        li.append(el('strong', null, `${m.name}${m.host ? ' ★' : ''}${m.you ? ' (you)' : ''}`), el('span', null, hero ? `${hero.icon ?? ''} ${hero.name}` : 'choosing…'), el('em', null, m.host ? 'host' : pick?.ready ? 'Ready' : 'not ready'));
        list.append(li);
      }
      players.append(list);
    }
    if (AI_GENRES.has(g.genre)) {
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
      players.append(ai);
    }

    const foot = el('div', 'lobby__foot');
    if (this.isGuest) {
      const ready = el('button', `lobby__btn lobby__btn--primary${this.ready ? ' is-on' : ''}`, this.ready ? 'Ready ✓ — waiting for the host' : 'Ready');
      ready.type = 'button';
      ready.dataset.lobbyReady = '';
      ready.addEventListener('click', () => {
        this.ready = !this.ready;
        this._sendPick();
        this.render();
      });
      foot.append(ready);
    } else {
      const waiting = party.inParty && !this.everyoneReady;
      const start = el('button', 'lobby__btn lobby__btn--primary', waiting ? 'Waiting for everyone to be ready…' : '▶ Start');
      start.type = 'button';
      start.dataset.lobbyStart = '';
      start.disabled = waiting || !this.choice.classId;
      start.addEventListener('click', async () => {
        start.disabled = true;
        this.root.hidden = true;
        await this.actions.start(this.game, this.choice, { rivals: AI_GENRES.has(g.genre) ? this.rivals : null });
      });
      foot.append(start);
    }
    players.append(foot);
    card.append(players);
    this.root.append(card);
  }
}
