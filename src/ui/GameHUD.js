/**
 * The run's readout: health, wave, score, combo, and the two full-screen states
 * (a wave arriving, and being downed).
 *
 * Split out from `HUD` rather than bolted onto it because they answer different
 * questions and change at different rates. `HUD` is about the *tools* — which
 * ability is selected, what is cooling down — and is written to every frame.
 * This is about the *run*, and every element here is driven by an event, with
 * only the health bar and the two countdowns touched per frame. Keeping them
 * apart means the sandbox still works with the game switched off: turn
 * `settings.combat.enabled` off and nothing in `HUD` notices.
 *
 * Every write is guarded by a cached last-value, because these run at 60 Hz and
 * an unconditional `textContent =` invalidates layout even when the string is
 * identical.
 */
import { platform } from '../platform/index.js';

export class GameHUD {
  /** @param {HTMLElement} host */
  constructor(host) {
    this.root = document.createElement('div');
    this.root.className = 'game-hud';
    this.root.innerHTML = `
      <div class="run-stats">
        <div class="run-stats__wave">
          <span class="run-stats__label">Wave</span>
          <b data-wave>—</b>
        </div>
        <div class="run-stats__score">
          <span class="run-stats__label">Score</span>
          <b data-score>0</b>
        </div>
        <div class="run-stats__row">
          <span data-alive>0 hostiles</span>
          <span data-kills>0 kills</span>
        </div>
      </div>

      <div class="combo" data-combo>
        <b data-combo-count>0</b><span>chain</span>
      </div>

      <div class="vitals">
        <div class="vitals__bar">
          <i data-health></i>
          <span data-health-text>100</span>
        </div>
        <div class="vitals__ammo" data-ammo hidden></div>
        <div class="vitals__bar vitals__rage" data-rage-bar hidden>
          <i data-rage></i>
          <span data-rage-text>RAGE 0</span>
        </div>
        <div class="vitals__buff" data-buff hidden><b>Battle Roar</b> <span data-buff-text></span> <i data-buff-left></i></div>
      </div>

      <div class="banner" data-banner>
        <b data-banner-title></b>
        <span data-banner-sub></span>
      </div>

      <div class="downed" data-downed>
        <b>Downed</b>
        <span data-downed-timer></span>
      </div>

      <div class="party-hud" data-party hidden>
        <div class="party-hud__head"><span>Party</span><b data-party-hud-code></b></div>
        <div data-party-hud-members></div>
      </div>

      <div class="party-chat" data-chat hidden>
        <div class="party-chat__log" data-chat-log></div>
        <input data-chat-input type="text" maxlength="200" placeholder="Enter to chat" autocomplete="off" spellcheck="false" />
      </div>

      <div class="hurt" data-hurt></div>
    `;
    host.appendChild(this.root);

    const q = (selector) => this.root.querySelector(selector);
    this.el = {
      wave: q('[data-wave]'),
      score: q('[data-score]'),
      alive: q('[data-alive]'),
      kills: q('[data-kills]'),
      combo: q('[data-combo]'),
      comboCount: q('[data-combo-count]'),
      health: q('[data-health]'),
      rageBar: q('[data-rage-bar]'),
      buff: q('[data-buff]'),
      buffText: q('[data-buff-text]'),
      buffLeft: q('[data-buff-left]'),
      ammo: q('[data-ammo]'),
      rage: q('[data-rage]'),
      rageText: q('[data-rage-text]'),
      healthText: q('[data-health-text]'),
      banner: q('[data-banner]'),
      bannerTitle: q('[data-banner-title]'),
      bannerSub: q('[data-banner-sub]'),
      downed: q('[data-downed]'),
      downedTimer: q('[data-downed-timer]'),
      hurt: q('[data-hurt]'),
      party: q('[data-party]'),
      partyCode: q('[data-party-hud-code]'),
      partyMembers: q('[data-party-hud-members]'),
      chat: q('[data-chat]'),
      chatLog: q('[data-chat-log]'),
      chatInput: q('[data-chat-input]')
    };

    this._shown = {};
    this._hurt = 0;
    this._bannerTimer = 0;
    this._partyKey = null;
    /** `(text) => void` — a line typed into the party chat. */
    this.onChat = null;
    this.el.chatInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        const text = this.el.chatInput.value.trim();
        this.el.chatInput.value = '';
        if (text) this.onChat?.(text);
        this.el.chatInput.blur();
      } else if (event.key === 'Escape') {
        this.el.chatInput.value = '';
        this.el.chatInput.blur();
      }
    });
  }

  /* ---- playing together ---- */

  /**
   * The party list: who is in, their class, their health, who is down.
   * @param {object[]|null} members from Party#members(); null hides it
   */
  setParty(members, code = '') {
    const el = this.el;
    if (!members) {
      if (!el.party.hidden) {
        el.party.hidden = true;
        el.chat.hidden = true;
        this._partyKey = null;
      }
      return;
    }
    el.party.hidden = false;
    el.chat.hidden = false;
    const key = `${code}|${members.map((m) => `${m.id}:${m.name}:${m.classId}:${Math.round(m.hp * 40)}:${m.downed ? 1 : 0}:${m.host ? 1 : 0}`).join('|')}`;
    if (key === this._partyKey) return;
    this._partyKey = key;
    el.partyCode.textContent = code;
    el.partyMembers.replaceChildren(
      ...members.map((m) => {
        const row = document.createElement('div');
        row.className = 'party-hud__member';
        row.classList.toggle('is-you', Boolean(m.you));
        row.classList.toggle('is-down', Boolean(m.downed));
        const icon = document.createElement('span');
        icon.className = 'party-hud__icon';
        icon.textContent = platform.characters.get(m.classId)?.icon ?? '✦';
        const name = document.createElement('span');
        name.className = 'party-hud__name';
        name.textContent = `${m.name}${m.host ? ' ★' : ''}${m.downed ? ' · down' : ''}`;
        const bar = document.createElement('span');
        bar.className = 'party-hud__bar';
        const fill = document.createElement('i');
        fill.style.width = `${Math.round(Math.max(0, Math.min(1, m.hp)) * 100)}%`;
        bar.append(fill);
        row.append(icon, name, bar);
        return row;
      })
    );
  }

  /** A line of party chat; it fades after a few seconds. */
  addChat(name, text, you = false) {
    const line = document.createElement('div');
    line.className = 'party-chat__line';
    line.classList.toggle('is-you', you);
    const who = document.createElement('b');
    who.textContent = name;
    line.append(who, document.createTextNode(text));
    this.el.chatLog.append(line);
    while (this.el.chatLog.children.length > 8) this.el.chatLog.firstChild.remove();
    setTimeout(() => line.classList.add('is-old'), 9000);
    setTimeout(() => line.remove(), 10000);
  }

  focusChat() {
    if (this.el.chat.hidden) return false;
    this.el.chatInput.focus();
    return true;
  }

  /** Write only when the rendered string actually changes. */
  _set(element, key, value) {
    if (this._shown[key] === value) return;
    this._shown[key] = value;
    element.textContent = value;
  }

  /* ------------------------------------------------------------------ */

  setWave(wave) {
    this._set(this.el.wave, 'wave', String(wave));
  }

  setScore(score) {
    this._set(this.el.score, 'score', score.toLocaleString());
  }

  setCounts(alive, kills) {
    this._set(this.el.alive, 'alive', `${alive} hostile${alive === 1 ? '' : 's'}`);
    this._set(this.el.kills, 'kills', `${kills} kill${kills === 1 ? '' : 's'}`);
  }

  /**
   * The chain counter.
   *
   * Hidden below three, because a "2 chain" on every second kill is noise; it
   * only becomes information once it represents something you did on purpose.
   */
  setCombo(count) {
    const visible = count >= 3;
    this.el.combo.classList.toggle('is-visible', visible);
    if (!visible) return;
    this._set(this.el.comboCount, 'combo', String(count));
    // Re-trigger the pop animation on every increment.
    this.el.combo.classList.remove('is-pop');
    void this.el.combo.offsetWidth;
    this.el.combo.classList.add('is-pop');
    this.el.combo.classList.toggle('is-hot', count >= 8);
  }

  /**
   * @param {number} ratio 0..1
   * @param {number} value absolute, for the readout
   */
  setHealth(ratio, value) {
    const percent = `${(ratio * 100).toFixed(1)}%`;
    if (this._shown.health !== percent) {
      this._shown.health = percent;
      this.el.health.style.width = percent;
    }
    this._set(this.el.healthText, 'healthText', String(Math.ceil(value)));
    this.el.health.classList.toggle('is-critical', ratio < 0.3);
  }

  /**
   * The Rage bar, under health — only for classes that fight with Rage.
   * @param {number} ratio 0..1
   * @param {number} value 0..100
   * @param {boolean} visible
   * @param {boolean} roaring Battle Roar's buff is up
   */
  setRage(ratio, value, visible, roaring) {
    if (this._shown.rageVisible !== visible) {
      this._shown.rageVisible = visible;
      this.el.rageBar.hidden = !visible;
    }
    if (!visible) return;
    const percent = `${(ratio * 100).toFixed(1)}%`;
    if (this._shown.rage !== percent) {
      this._shown.rage = percent;
      this.el.rage.style.width = percent;
    }
    this._set(this.el.rageText, 'rageText', roaring ? `RAGE ${Math.floor(value)} · ROARING` : `RAGE ${Math.floor(value)}`);
    if (this._shown.roaring !== roaring) {
      this._shown.roaring = roaring;
      this.el.rageBar.classList.toggle('is-roaring', roaring);
    }
  }

  /** A team buff on this player (Battle Roar): what it gives and the seconds left; null hides it. */
  setBuff(buff) {
    const visible = Boolean(buff);
    if (this._shown.buffVisible !== visible) {
      this._shown.buffVisible = visible;
      this.el.buff.hidden = !visible;
    }
    if (!buff) return;
    this._set(this.el.buffText, 'buffText', buff.text);
    this._set(this.el.buffLeft, 'buffLeft', `${Math.ceil(buff.seconds)} s`);
  }

  /** The gun's magazine, under health; null hides it (a melee weapon). */
  setAmmo(text) {
    if (this._shown.ammo === text) return;
    this._shown.ammo = text;
    this.el.ammo.hidden = !text;
    if (text) this.el.ammo.textContent = text;
    this.el.ammo.classList.toggle('is-reloading', Boolean(text?.startsWith('RELOADING')));
  }

  /** Flash the screen edges red. Amount is a fraction of max health. */
  hurt(amount) {
    // Capped below 1: repeated hits should stack toward the ceiling, not slam
    // into it, or every chip of damage looks like a near-death.
    this._hurt = Math.min(0.85, this._hurt + Math.max(0.22, amount * 1.8));
  }

  /**
   * The wave banner. Also used for "wave cleared" and the countdown between.
   * @param {string} title
   * @param {string} [subtitle]
   * @param {number} [duration] seconds on screen
   */
  showBanner(title, subtitle = '', duration = 2.2) {
    this._set(this.el.bannerTitle, 'bannerTitle', title);
    this._set(this.el.bannerSub, 'bannerSub', subtitle);
    this.el.banner.classList.remove('is-visible');
    void this.el.banner.offsetWidth;
    this.el.banner.classList.add('is-visible');
    this._bannerTimer = duration;
  }

  setDowned(downed) {
    this.el.downed.classList.toggle('is-visible', downed);
  }

  setDownedTimer(seconds) {
    this._set(this.el.downedTimer, 'downedTimer', `Back up in ${Math.ceil(seconds)}…`);
  }

  /** @param {number} dt real seconds */
  update(dt) {
    if (this._hurt > 0) {
      this._hurt = Math.max(0, this._hurt - dt * 2.4);
      this.el.hurt.style.opacity = this._hurt.toFixed(3);
    }

    if (this._bannerTimer > 0) {
      this._bannerTimer -= dt;
      if (this._bannerTimer <= 0) this.el.banner.classList.remove('is-visible');
    }
  }

  setVisible(visible) {
    this.root.classList.toggle('is-hidden', !visible);
  }

  dispose() {
    this.root.remove();
  }
}
