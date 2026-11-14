import { MmoView } from './view.js';
import { CLASSES, CLASS_ORDER, ITEMS, QUESTS, RECIPES, NODES, MOBS, SLOTS, RUN_SPEED, XP_TO, MAX_LEVEL, PROFESSIONS, GCD, VENDORS, COMBO } from './data.js';
import { ZONES, NPCS, walkableIn } from './world.js';
import { questsAt, questDone, countOf } from './rules.js';
import { CharacterStage } from './bodies.js';
import { STYLES, BUILDS, TINTS, cleanLook, lookOf } from './looks.js';
import { playerBlow, mobBlow, kickBlow, BLOW_COLORS } from './blows.js';
import { confetti } from '../ui/pop.js';
import './mmo.css';

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const RARITY = { common: '#e8edf3', uncommon: '#5fe07a', rare: '#5aa7ff', epic: '#c084fc' };
const itemColor = (id) => RARITY[ITEMS[id]?.rarity] ?? '#e8edf3';
const itemTip = (id) => {
  const it = ITEMS[id];
  if (!it) return '';
  const bits = [it.name];
  if (it.slot) bits.push(`${it.slot}${it.level ? ` · level ${it.level}` : ''}`);
  if (it.stats) bits.push(Object.entries(it.stats).map(([k, v]) => `+${v} ${k}`).join(', '));
  if (it.use) bits.push(`Use: ${it.use.heal ? `restores ${it.use.heal} health ` : ''}${it.use.mana ? `restores ${it.use.mana} mana` : ''}`);
  if (it.mat) bits.push('Material');
  return bits.join('\n');
};
const ICON = (id) => {
  const it = ITEMS[id];
  if (!it) return '';
  if (it.slot === 'weapon') return '🗡';
  if (it.slot === 'head') return '⛑';
  if (it.slot === 'chest') return '🥋';
  if (it.slot === 'legs') return '👖';
  if (it.slot === 'feet') return '👢';
  if (it.slot === 'trinket') return '💍';
  if (it.use?.mana && !it.use.heal) return '🧪';
  if (it.use) return id === 'bread' ? '🍞' : '❤';
  if (/ore/.test(id)) return '🪨';
  if (/log/.test(id)) return '🪵';
  if (/shard/.test(id)) return '🔥';
  if (/dust/.test(id)) return '🦴';
  return '🌿';
};

/**
 * Hearthvale: an online role-playing game in small groups. Characters are
 * kept on your account by the server; the server runs the world copies
 * (server/mmo). This is the browser half: the character list, then the
 * world — WASD to walk, the camera behind you, Tab and clicks to target,
 * 1–6 for skills, F to talk, gather and travel, and windows for everything else.
 */
export class MmoGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'hv');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Hearthvale');
    host.append(this.root);
    this.keys = new Set();
    this.root.addEventListener('keydown', (e) => this._keydown(e));
    this.root.addEventListener('keyup', (e) => {
      e.stopPropagation();
      this.keys.delete(e.code);
    });
    window.hearthvale = this;
  }

  async open() {
    await this.characters();
    this.root.focus();
  }

  close() {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    this.ws?.close();
    this.stage?.dispose();
    this.view?.dispose();
    this.root.remove();
    if (window.hearthvale === this) delete window.hearthvale;
    this.onClose?.();
  }

  /* -------------------------------------------------------- characters */

  /** The first screen: your characters on a stage (pick one, play), or the maker when you have none. */
  async characters(note = '', { make = false, edit = null } = {}) {
    cancelAnimationFrame(this._raf);
    this.ws?.close();
    this.ws = null;
    this.view?.dispose();
    this.view = null;
    this.stage?.dispose();
    this.stage = null;
    let list = null;
    let error = '';
    try {
      const r = await fetch('./api/mmo/characters');
      const body = await r.json();
      if (r.ok) list = body.characters;
      else error = body.error;
    } catch {
      error = 'Could not reach the server.';
    }
    const head = `<header class="hv-select__head"><div><h1>Hearthvale</h1><p>An online adventure in small groups: quests, dungeons, a raid, guilds, trading, gathering and crafting.</p></div>
      <button type="button" class="hv__x" data-close aria-label="Back to the games">✕</button></header>${note ? `<p class="hv-note">${esc(note)}</p>` : ''}`;
    const credits = '<p class="hv-credits">Characters: KayKit Adventurers &amp; Skeletons by Kay Lousberg (CC0). Hearthvale\'s world, classes, quests and names are Gamory\'s own.</p>';
    if (!list) {
      this.root.innerHTML = `<div class="hv-select">${head}<p class="hv-error">${esc(error)}</p><p class="hv-muted">Characters are kept on your account. Sign in from the home page (top right), then come back.</p>${credits}</div>`;
      this.root.querySelector('[data-close]').addEventListener('click', () => this.close());
      return;
    }
    if (edit) return this._maker(head, credits, list, list.find((c) => c.id === edit));
    if (make || !list.length) return this._maker(head, credits, list, null);
    this._chooser(head, credits, list);
  }

  /** Choose who to play: cards on the left, the chosen one on the stage. */
  _chooser(head, credits, list) {
    const last = Number(localStorage.getItem?.('elemental-arena.hearthvale.last') ?? 0);
    let chosen = list.find((c) => c.id === last) ?? list[0];
    this.root.innerHTML = `<div class="hv-select">${head}
      <div class="hv-choose">
        <section class="hv-choose__list"><h2>Your characters</h2><div class="hv-chars" data-chars role="radiogroup" aria-label="Your characters"></div>
          <button type="button" class="hv-btn hv-newchar" data-new ${list.length >= 6 ? 'disabled' : ''}>＋ New character${list.length >= 6 ? ' (six at most)' : ''}</button></section>
        <section class="hv-choose__stage">
          <div class="hv-stage3d" data-stage3d><span class="hv-stage3d__hint">drag to turn</span></div>
          <div class="hv-plate"><strong data-plate-name></strong><span data-plate-line></span></div>
          <div class="hv-choose__actions"><button type="button" class="hv-btn hv-btn--go hv-btn--big" data-enter>▶ Enter Hearthvale</button>
            <button type="button" class="hv-btn" data-look>Change look</button><button type="button" class="hv-btn" data-del>Delete</button></div>
        </section>
      </div>${credits}</div>`;
    const $ = (s) => this.root.querySelector(s);
    $('[data-close]').addEventListener('click', () => this.close());
    this.stage = new CharacterStage($('[data-stage3d]'));
    const chars = $('[data-chars]');
    const paint = (cheer = false) => {
      for (const row of chars.children) row.setAttribute('aria-checked', String(Number(row.dataset.char) === chosen.id));
      $('[data-plate-name]').textContent = chosen.name;
      $('[data-plate-line]').textContent = `Level ${chosen.level} ${CLASSES[chosen.cls].name} · ${lookOf(chosen.cls, chosen.look).styleName} · ${ZONES[chosen.zone]?.name ?? ''} · ${chosen.gold} gold`;
      this.stage.show(chosen.cls, chosen.look, { cheer });
    };
    for (const c of list) {
      const row = el('div', 'hv-char');
      row.dataset.char = c.id;
      row.setAttribute('role', 'radio');
      row.tabIndex = 0;
      row.innerHTML = `<span class="hv-char__icon" style="background:${lookOf(c.cls, c.look).tint === '#ffffff' ? '' : lookOf(c.cls, c.look).tint}">${CLASSES[c.cls]?.skills[0].icon ?? '?'}</span><div><b></b><small></small></div><button type="button" class="hv-btn hv-btn--go" data-play>Play</button>`;
      row.querySelector('b').textContent = c.name;
      row.querySelector('small').textContent = `Level ${c.level} ${CLASSES[c.cls]?.name ?? c.cls} · ${ZONES[c.zone]?.name ?? ''}`;
      row.addEventListener('click', () => {
        chosen = c;
        paint(true);
      });
      row.querySelector('[data-play]').addEventListener('click', (e) => {
        e.stopPropagation();
        this._enter(c.id);
      });
      chars.append(row);
    }
    paint();
    $('[data-enter]').addEventListener('click', () => this._enter(chosen.id));
    $('[data-new]').addEventListener('click', () => this.characters('', { make: true }));
    $('[data-look]').addEventListener('click', () => this.characters('', { edit: chosen.id }));
    $('[data-del]').addEventListener('click', async () => {
      if (!window.confirm(`Delete ${chosen.name} for good?`)) return;
      await fetch('./api/mmo/characters/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chosen.id }) });
      this.characters();
    });
  }

  _enter(id) {
    try {
      localStorage.setItem('elemental-arena.hearthvale.last', String(id));
    } catch {
      /* private mode */
    }
    this.stage?.dispose();
    this.stage = null;
    this.play(id);
  }

  /**
   * The character maker (or, with `editing`, the wardrobe for one you have):
   * class, style, build, hat and cape, colour and name on the left; the
   * character itself, live, on the right.
   */
  _maker(head, credits, list, editing) {
    const pick = { cls: editing?.cls ?? this.pickCls ?? 'vanguard', look: cleanLook(editing?.cls ?? this.pickCls ?? 'vanguard', editing?.look) };
    this.root.innerHTML = `<div class="hv-select">${head}
      <div class="hv-make">
        <section class="hv-make__form">
          <h2>${editing ? `${esc(editing.name)}'s look` : 'A new character'}</h2>
          ${editing ? '' : '<h3>Class</h3><div class="hv-classes" data-classes role="radiogroup" aria-label="Class"></div><p class="hv-make__about" data-about></p>'}
          <h3>Style</h3><div class="hv-opts" data-styles role="radiogroup" aria-label="Style"></div>
          <h3>Build</h3><div class="hv-opts" data-builds role="radiogroup" aria-label="Build"></div>
          <h3>Outfit</h3><div class="hv-opts"><label class="hv-toggle"><input type="checkbox" data-hat> Hat or helmet</label><label class="hv-toggle"><input type="checkbox" data-cape> Cape</label></div>
          <h3>Colour</h3><div class="hv-swatches" data-tints role="radiogroup" aria-label="Outfit colour"></div>
          ${editing ? '' : '<h3>Name</h3><div class="hv-create__row"><label class="hv-field"><input data-name maxlength="16" placeholder="2–16 letters" autocomplete="off" aria-label="Name"></label><button type="button" class="hv-btn" data-random title="Suggest a name">🎲</button></div>'}
          <p class="hv-error" data-error role="alert"></p>
          <div class="hv-create__row"><button type="button" class="hv-btn hv-btn--go hv-btn--big" data-create>${editing ? 'Save this look' : 'Create'}</button>
            ${list.length ? '<button type="button" class="hv-btn" data-back>Back</button>' : ''}<button type="button" class="hv-btn" data-shuffle title="Try a random look">🎲 Surprise me</button></div>
        </section>
        <section class="hv-make__stage"><div class="hv-stage3d" data-stage3d><span class="hv-stage3d__hint">drag to turn</span></div>
          <div class="hv-plate"><strong data-plate-name></strong><span data-plate-line></span></div></section>
      </div>${credits}</div>`;
    const $ = (s) => this.root.querySelector(s);
    $('[data-close]').addEventListener('click', () => this.close());
    this.stage = new CharacterStage($('[data-stage3d]'));
    const option = (host, value, label, on) => {
      const b = el('button', 'hv-opt', label);
      b.type = 'button';
      b.dataset.value = value;
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => on(value));
      host.append(b);
    };
    const paint = (cheer = true) => {
      pick.look = cleanLook(pick.cls, pick.look);
      const classes = $('[data-classes]');
      if (classes) {
        for (const b of classes.children) b.setAttribute('aria-checked', String(b.dataset.cls === pick.cls));
        const c = CLASSES[pick.cls];
        $('[data-about]').textContent = `${c.blurb} Skills: ${c.skills.map((x) => x.name).join(', ')}.`;
      }
      const styles = $('[data-styles]');
      styles.replaceChildren();
      for (const st of STYLES[pick.cls]) option(styles, st.id, st.name, (v) => { pick.look.style = v; paint(); });
      for (const b of styles.children) b.setAttribute('aria-checked', String(b.dataset.value === pick.look.style));
      for (const b of $('[data-builds]').children) b.setAttribute('aria-checked', String(b.dataset.value === pick.look.build));
      for (const b of $('[data-tints]').children) b.setAttribute('aria-checked', String(b.dataset.value === pick.look.tint));
      $('[data-hat]').checked = pick.look.hat;
      $('[data-cape]').checked = pick.look.cape;
      $('[data-plate-name]').textContent = editing?.name ?? ($('[data-name]')?.value.trim() || 'Your hero');
      $('[data-plate-line]').textContent = `${CLASSES[pick.cls].name} · ${lookOf(pick.cls, pick.look).styleName} · ${BUILDS[pick.look.build].name}`;
      this.stage.show(pick.cls, pick.look, { cheer });
    };
    const classes = $('[data-classes]');
    if (classes) {
      for (const id of CLASS_ORDER) {
        const c = CLASSES[id];
        const b = el('button', 'hv-class');
        b.type = 'button';
        b.dataset.cls = id;
        b.setAttribute('role', 'radio');
        b.innerHTML = `<i>${c.skills[0].icon}</i><strong>${esc(c.name)}</strong><span>${esc(c.role)}</span>`;
        b.addEventListener('click', () => {
          this.pickCls = pick.cls = id;
          pick.look.style = null;
          paint();
        });
        classes.append(b);
      }
    }
    for (const [id, b] of Object.entries(BUILDS)) option($('[data-builds]'), id, b.name, (v) => { pick.look.build = v; paint(false); });
    for (const [hex, name] of TINTS) {
      const b = el('button', 'hv-swatch');
      b.type = 'button';
      b.dataset.value = hex;
      b.title = name;
      b.setAttribute('aria-label', name);
      b.setAttribute('role', 'radio');
      b.style.background = hex;
      b.addEventListener('click', () => { pick.look.tint = hex; paint(false); });
      $('[data-tints]').append(b);
    }
    $('[data-hat]').addEventListener('change', (e) => { pick.look.hat = e.target.checked; paint(false); });
    $('[data-cape]').addEventListener('change', (e) => { pick.look.cape = e.target.checked; paint(false); });
    const NAMES = ['Wren', 'Aldous', 'Mira', 'Bram', 'Isolde', 'Corin', 'Tamsin', 'Osric', 'Liora', 'Fenn', 'Maeve', 'Rowan', 'Sable', 'Thane', 'Ysra', 'Dax'];
    $('[data-random]')?.addEventListener('click', () => {
      $('[data-name]').value = NAMES[Math.floor(Math.random() * NAMES.length)] + ['', 'a', 'el', 'is', 'or'][Math.floor(Math.random() * 5)];
      paint(false);
    });
    $('[data-name]')?.addEventListener('input', () => ($('[data-plate-name]').textContent = $('[data-name]').value.trim() || 'Your hero'));
    $('[data-shuffle]').addEventListener('click', () => {
      const any = (a) => a[Math.floor(Math.random() * a.length)];
      if (!editing) this.pickCls = pick.cls = any(CLASS_ORDER);
      pick.look = { style: any(STYLES[pick.cls]).id, build: any(Object.keys(BUILDS)), tint: any(TINTS)[0], hat: Math.random() < 0.7, cape: Math.random() < 0.7 };
      paint();
    });
    $('[data-back]')?.addEventListener('click', () => this.characters());
    $('[data-create]').addEventListener('click', async () => {
      const r = editing
        ? await fetch('./api/mmo/characters/look', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, look: pick.look }) })
        : await fetch('./api/mmo/characters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('[data-name]').value, cls: pick.cls, look: pick.look }) });
      const body = await r.json();
      if (!r.ok) {
        $('[data-error]').textContent = body.error;
        return;
      }
      if (body.character) {
        try {
          localStorage.setItem('elemental-arena.hearthvale.last', String(body.character.id));
        } catch {
          /* private mode */
        }
      }
      this.characters();
    });
    paint(false);
  }

  /* ------------------------------------------------------------ playing */

  play(charId) {
    this.charId = charId;
    this.snaps = [];
    this.me = null;
    this.ch = null;
    this.st = null;
    this.target = null;
    this.party = null;
    this.guild = null;
    this.trade = null;
    this.npc = null;
    this.panels = new Set();
    this.chatLines = [];
    this.root.innerHTML = `
      <div class="hv-stage" data-stage><canvas class="hv__overlay" data-overlay></canvas></div>
      <div class="hv-frames"><div class="hv-frame" data-me-frame></div><div class="hv-party" data-party></div></div>
      <div class="hv-frame hv-frame--target" data-target hidden></div>
      <div class="hv-zone" data-zone></div>
      <canvas class="hv-mini" data-mini width="180" height="180" aria-label="Map"></canvas>
      <div class="hv-tracker" data-tracker></div>
      <div class="hv-toasts" data-toasts role="status" aria-live="polite"></div>
      <div class="hv-castbar" data-castbar hidden><span></span><b></b></div>
      <div class="hv-bottom">
        <div class="hv-hotbar" data-hotbar></div>
        <div class="hv-xp" data-xp role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="100">
          <span class="hv-xp__lvl" data-xp-lvl title="Your level"></span>
          <span class="hv-xp__track"><i class="hv-xp__fill" data-xp-fill></i><i class="hv-xp__ticks"></i><b data-xp-text></b></span>
          <span class="hv-xp__gold" data-xp-gold title="Gold"></span>
          <span class="hv-xp__gains" data-xp-gains aria-hidden="true"></span>
        </div>
      </div>
      <div class="hv-combo" data-combo hidden aria-live="off"><b data-combo-n></b><span>hits</span><strong data-combo-word></strong><em data-combo-more></em><i><u data-combo-left></u></i></div>
      <div class="hv-hurt" data-hurt aria-hidden="true"></div>
      <div class="hv-levelup" data-levelup hidden></div>
      <div class="hv-chat" data-chatbox><div class="hv-chat__log" data-chatlog></div><input class="hv-chat__input" data-chat maxlength="200" placeholder="Enter to chat · /p party · /g guild · /w name · /world" aria-label="Chat"></div>
      <nav class="hv-menu" data-menu></nav>
      <div class="hv-hint" data-hint></div>
      <div class="hv-dead" data-dead hidden><p>You have fallen.</p><button type="button" class="hv-btn hv-btn--go" data-release>Return to the graveyard</button><small>…or wait for a Mender's Revive.</small></div>
      <div class="hv-windows" data-windows></div>`;
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    const stage = $('[data-stage]');
    this.view = new MmoView(stage);
    this.overlay = $('[data-overlay]');
    this.octx = this.overlay.getContext('2d');
    this.mini = $('[data-mini]');
    const fit = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      this.view.resize(w, h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.overlay.width = Math.round(w * dpr);
      this.overlay.height = Math.round(h * dpr);
    };
    this._resize = new ResizeObserver(fit);
    this._resize.observe(stage);
    fit();
    for (const [key, label, panel] of [['I', 'Bag', 'bag'], ['C', 'Character', 'char'], ['L', 'Quests', 'quests'], ['K', 'Crafting', 'craft'], ['P', 'Party', 'party'], ['G', 'Guild', 'guild'], ['H', 'Help', 'help'], ['', 'Leave', 'leave']]) {
      const b = el('button', 'hv-btn hv-menu__btn', label);
      b.type = 'button';
      b.title = key ? `${label} (${key})` : 'Back to your characters';
      b.dataset.panel = panel;
      b.addEventListener('click', () => (panel === 'leave' ? this.characters() : this.toggle(panel)));
      $('[data-menu]').append(b);
    }
    $('[data-release]').addEventListener('click', () => this.send({ t: 'release' }));
    const chat = $('[data-chat]');
    chat.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        this._chat(chat.value);
        chat.value = '';
        chat.blur();
        this.root.focus();
      } else if (e.key === 'Escape') {
        chat.blur();
        this.root.focus();
      }
    });
    this._mouse(stage);
    this._connect();
    this._last = performance.now();
    this._hudAt = 0;
    this._sentAt = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this.frame(Math.min(0.1, (now - this._last) / 1000), now);
      this._last = now;
    };
    this._raf = requestAnimationFrame(loop);
    this.root.focus();
  }

  _connect() {
    const url = new URL(`mmo?char=${this.charId}`, document.baseURI);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(url.href);
    this.ws = ws;
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this._receive(msg);
    });
    ws.addEventListener('close', (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.characters(e.code === 4000 ? 'This character signed in somewhere else.' : 'The connection to the world closed.');
    });
  }

  send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  _receive(msg) {
    switch (msg.t) {
      case 'hello':
        this.you = msg.you;
        this.zone = msg.zone;
        this.ch = msg.ch;
        this.snaps = [];
        this.me = null;
        this.target = null;
        this.view.setZone(msg.zone);
        this.party = msg.party;
        this.$('[data-zone]').textContent = msg.zoneName;
        this.toast(`${msg.zoneName}${ZONES[msg.zone].levels ? ` (levels ${ZONES[msg.zone].levels})` : ''}`);
        this._renderAll();
        return;
      case 'snap':
        this.snaps.push({ s: msg.s, at: performance.now() });
        if (this.snaps.length > 3) this.snaps.shift();
        this._events(msg.ev, msg.s);
        if (!this.me) {
          const mine = msg.s.ents.find((e) => e.i === this.you);
          if (mine) {
            this.me = { i: mine.i, x: mine.x, z: mine.z, a: mine.a };
            // Arriving: look into the zone (toward its middle), not at the wall behind you.
            const [w, h] = ZONES[this.zone].size;
            const cx = this.zone === 'hearthvale' ? w / 2 : w / 2;
            const cz = this.zone === 'hearthvale' ? h * 0.6 : h / 2;
            this.view.yaw = Math.atan2(mine.x - cx, mine.z - cz);
            this.view.pitch = 0.45;
            this.me.a = Math.atan2(cx - mine.x, cz - mine.z);
            if (this.zone === 'hearthvale' && !this._welcomed) {
              this._welcomed = true;
              this.toast('Welcome to Hearthvale! 💰 marks a shop: Pell sells food and draughts, Brannoc weapons and armor. ! marks a quest.', 'good');
            }
          }
        }
        return;
      case 'me':
        this.ch = msg.ch;
        this.st = msg.st;
        if (this.wearNext) {
          const slot = this.ch.bag.findIndex((x) => x?.item === this.wearNext);
          if (slot >= 0) this.send({ t: 'equip', slot });
          this.wearNext = null;
        }
        this._renderAll();
        return;
      case 'correct':
        if (this.me) {
          this.me.x = msg.x;
          this.me.z = msg.z;
        }
        return;
      case 'ev':
        this._events(msg.ev, null);
        return;
      case 'error':
        this.toast(msg.text, 'bad');
        return;
      case 'chat':
        this._chatLine(msg);
        return;
      case 'npc':
        this.npc = msg;
        this.panels.add('npc');
        this._renderAll();
        return;
      case 'party':
        this.party = msg.party;
        this._renderAll();
        return;
      case 'guild':
        this.guild = msg.guild;
        this._renderAll();
        return;
      case 'roster':
        this.roster = msg.roster;
        this._renderAll();
        return;
      case 'trade':
        this.trade = msg.trade;
        if (msg.trade) this.panels.add('trade');
        else this.panels.delete('trade');
        if (msg.done) this.toast('Trade complete', 'good');
        else if (msg.text) this.toast(msg.text);
        this._renderAll();
        return;
      case 'invite':
        this._invite(msg);
        return;
      default:
        return undefined;
    }
  }

  _events(list, snap) {
    if (!list) return;
    const find = (id) => (snap ?? this.snaps[this.snaps.length - 1]?.s)?.ents.find((e) => e.i === id);
    // Where someone is: yourself where your browser has you, not where the server last heard.
    const at = (id) => {
      const e = find(id);
      return e && id === this.you && this.me ? { ...e, x: this.me.x, z: this.me.z, a: this.me.a } : e;
    };
    for (const ev of list) {
      switch (ev.type) {
        case 'dmg': {
          const e = at(ev.id);
          if (!e) break;
          const src = at(ev.by);
          const big = ev.fin || ev.crit;
          const strength = ev.fin && ev.crit ? 2 : ev.fin ? 1.6 : ev.crit ? 1.4 : 1;
          if (Math.hypot(e.x - this.me?.x, e.z - this.me?.z) < 50) this.view.hit(ev.id, src, { strength, x: e.x, z: e.z, color: e.k === 'p' ? '#ff8a7a' : big ? '#ffb347' : '#fff0b0' });
          const mine = ev.by === this.you || ev.id === this.you;
          if (mine) {
            this.view.floaters.push({
              x: e.x, z: e.z, t: 0, text: `${ev.amount}`, dx: (Math.random() - 0.5) * 70,
              size: ev.id === this.you ? 16 : ev.fin ? 26 : ev.crit ? 23 : 16, life: big ? 1.4 : 1.1,
              tag: ev.id === this.you ? null : ev.fin && ev.crit ? 'CRITICAL FINISHER' : ev.fin ? 'FINISHER' : ev.crit ? 'CRIT' : null,
              color: ev.id === this.you ? '#ff6b6b' : ev.fin ? '#ff9a3c' : ev.crit ? '#ffc93c' : '#fff2c0'
            });
          }
          if (ev.by === this.you) {
            this._combo(ev.combo ?? 1);
            if (big) this.view.shake(ev.fin && ev.crit ? 0.3 : 0.18);
          }
          if (ev.id === this.you) {
            this.view.shake(Math.min(0.4, 0.08 + (ev.amount / Math.max(1, this.st?.maxHp ?? 100)) * 1.5));
            this._hurt();
          }
          break;
        }
        case 'heal': {
          const e = at(ev.id);
          if (e && (ev.by === this.you || ev.id === this.you)) this.view.floaters.push({ x: e.x, z: e.z, t: 0, text: `+${ev.amount}`, color: '#6bff9b', dx: (Math.random() - 0.5) * 50 });
          if (e) this.view.burst(e.x, e.z, 1.4, '#7dffa8', 0.5);
          break;
        }
        case 'swing': {
          const a = at(ev.id);
          const b = at(ev.target);
          const player = a?.k === 'p';
          // A player's blade goes through its chain; up close, an archer or a caster kicks.
          // Monsters swing by how they are armed. Whose steel is whose shows in its colour.
          const blow = ev.ranged ? null : !player ? mobBlow(a?.ty) : ev.close ? kickBlow() : playerBlow(ev.n);
          this.view.act(ev.id, 'swing', blow?.clip ?? null, ev.ranged ? 0.6 : 0.55);
          if (!a || !b) break;
          if (ev.ranged) this.view.missile(a, b, player ? '#bfe6ff' : '#ff7ad0');
          else this.view.blow(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z), blow.strokes);
          break;
        }
        case 'skill': {
          const a = at(ev.id);
          const def = a?.k === 'p' ? CLASSES[a.c]?.skills.find((k) => k.id === ev.skill) : null;
          const fights = a?.k === 'p' && (a.c === 'vanguard' || a.c === 'ranger');
          this.view.act(ev.id, fights ? 'swing' : 'cast', def?.anim ?? null, def?.fx === 'spin' ? 0.9 : 0.7);
          if (!a) break;
          const b = ev.target != null && ev.target !== ev.id ? at(ev.target) : null;
          const facing = b ? Math.atan2(b.x - a.x, b.z - a.z) : a.a ?? 0;
          switch (def?.fx) {
            case 'slash':
              this.view.slash(a.x, a.z, facing, { roll: 0.7, size: 3.6, color: BLOW_COLORS.player, dur: 0.3 });
              this.view.slash(a.x, a.z, facing, { roll: -0.7, flip: true, size: 3.2, color: BLOW_COLORS.finisher, dur: 0.22, delay: 0.08 });
              break;
            case 'spin':
              this.view.slash(a.x, a.z, facing, { full: true, size: (def.radius ?? 5) * 1.15, color: BLOW_COLORS.player, dur: 0.4, y: 1 });
              this.view.slash(a.x, a.z, facing, { full: true, size: (def.radius ?? 5) * 0.75, color: BLOW_COLORS.finisher, dur: 0.3, y: 1.3, delay: 0.08 });
              break;
            case 'bash':
              if (b) this.view.burst(b.x, b.z, 2.2, '#bfe3ff', 0.3, 1.2);
              this.view.slash(a.x, a.z, facing, { roll: 0, size: 2.4, color: '#bfe3ff', dur: 0.2 });
              if (ev.id === this.you) this.view.shake(0.22);
              break;
            case 'guard':
              this.view.slash(a.x, a.z, 0, { full: true, size: 2.4, color: '#7dc4ff', dur: 0.6, y: 0.3 });
              this.view.burst(a.x, a.z, 1.8, '#7dc4ff', 0.5, 1);
              break;
            case 'shout':
              this.view.slash(a.x, a.z, 0, { full: true, size: def.radius ?? 8, color: '#ffe28a', dur: 0.6, y: 0.3 });
              break;
            default:
              if (b && def?.kind !== 'strike') this.view.missile(a, b, '#ffb05c');
              if (ev.x != null && def?.kind !== 'strike') this.view.burst(ev.x, ev.z, 1.6, '#ffd27a', 0.35);
          }
          break;
        }
        case 'blast':
          this.view.burst(ev.x, ev.z, ev.r, '#ff5a3a', 0.6, 0.4);
          break;
        case 'death': {
          const e = find(ev.id);
          if (e) this.view.burst(e.x, e.z, 1.3, '#3c3c3c', 0.5);
          if (ev.id === this.target) this.target = null;
          break;
        }
        case 'level': {
          const e = find(ev.id);
          if (e) {
            this.view.burst(e.x, e.z, 3, '#ffe28a', 0.9, 0.3);
            this.view.slash(e.x, e.z, 0, { full: true, size: 5, color: '#ffe28a', dur: 0.8, y: 0.3 });
          }
          if (ev.id === this.you) this._levelUp(ev.level);
          break;
        }
        case 'xp':
          this._gain(ev.amount);
          break;
        case 'loot':
          this.toast(`${ev.from}: ${ev.gold} gold${ev.items.length ? `, ${ev.items.map((i) => ITEMS[i].name).join(', ')}` : ''}`, 'good');
          break;
        case 'quest': {
          const q = QUESTS[ev.id];
          this.toast(`${q.name}: ${ev.have}/${ev.need}`, ev.have >= ev.need ? 'good' : '');
          break;
        }
        case 'quest-done':
          this.toast(`Quest complete: ${QUESTS[ev.id].name} (+${ev.xp} xp, ${ev.gold} gold${ev.item ? `, ${ITEMS[ev.item].name}` : ''})`, 'good');
          break;
        case 'gathered':
          this.toast(`${ITEMS[ev.item].name} ×${ev.n}${ev.up ? ` — ${PROFESSIONS[ev.skill]} ${ev.level}` : ''}`, 'good');
          break;
        case 'crafted':
          this.toast(`Made ${ITEMS[ev.item].name} ×${ev.n}${ev.up ? ` — ${PROFESSIONS[ev.skill]} ${ev.level}` : ''}`, 'good');
          break;
        case 'enrage':
          this.toast('The boss is enraged!', 'bad');
          break;
        case 'summon':
          this.toast('Adds are coming!', 'bad');
          break;
        case 'text':
          this.toast(ev.text);
          break;
        default:
          break;
      }
    }
  }

  /** The world now: the newest snapshot, the others' places blended toward it. */
  state(now) {
    const n = this.snaps.length;
    if (!n) return null;
    const cur = this.snaps[n - 1];
    const prev = this.snaps[n - 2];
    if (!prev) return cur.s;
    const k = Math.max(0, Math.min(1, (now - cur.at) / 100));
    const before = new Map(prev.s.ents.map((e) => [e.i, e]));
    const ents = cur.s.ents.map((e) => {
      const p = before.get(e.i);
      if (!p || e.k === 'n' || Math.hypot(p.x - e.x, p.z - e.z) > 6) return e;
      // No heading on either side (or a bad one): blend the place, keep the newest heading.
      if (!Number.isFinite(e.a) || !Number.isFinite(p.a)) return { ...e, x: p.x + (e.x - p.x) * k, z: p.z + (e.z - p.z) * k };
      let da = e.a - p.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      return { ...e, x: p.x + (e.x - p.x) * k, z: p.z + (e.z - p.z) * k, a: p.a + da * k };
    });
    // Quest marks over the NPCs: ! to take, ? to hand in.
    if (this.ch) {
      for (const e of ents) {
        if (e.k !== 'npc') continue;
        const q = questsAt(this.ch, e.npc);
        e.mark = q.hand.length ? '?' : q.offer.length ? '!' : VENDORS[e.npc] ? '💰' : null;
      }
    }
    return { ...cur.s, ents };
  }

  frame(dt, now) {
    const state = this.state(now);
    this.current = state;
    const meEnt = state?.ents.find((e) => e.i === this.you);
    if (this.me && meEnt) {
      this._walk(dt, meEnt);
      if (now - this._sentAt > 100) {
        this._sentAt = now;
        if (!this._lastSent || Math.hypot(this._lastSent.x - this.me.x, this._lastSent.z - this.me.z) > 0.01 || Math.abs(this._lastSent.a - this.me.a) > 0.05) {
          this._lastSent = { ...this.me };
          this.send({ t: 'move', x: Math.round(this.me.x * 100) / 100, z: Math.round(this.me.z * 100) / 100, a: Math.round(this.me.a * 100) / 100 });
        }
      }
    }
    this.view.target = this.target;
    this.view.render(state, this.me, dt);
    const partyIds = new Set((this.party?.members ?? []).map((m) => m.id).filter(Boolean));
    this.view.drawOverlay(this.octx, state, this.me, partyIds);
    this._hudAt -= dt;
    if (this._hudAt <= 0 && state) {
      this._hudAt = 0.1;
      this._hud(state, meEnt);
    }
  }

  /** Walk with WASD, relative to where the camera looks; walls stop you. */
  _walk(dt, meEnt) {
    if (meEnt.dead || document.activeElement?.matches?.('input')) return;
    let f = 0;
    let s = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp') || (this.mouseL && this.mouseR)) f += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s += 1;
    if (!f && !s) return;
    const yaw = this.view.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = -fz;
    const rz = fx;
    let dx = fx * f + rx * s;
    let dz = fz * f + rz * s;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const speed = RUN_SPEED * (f < 0 && !s ? 0.6 : 1) * dt;
    const nx = this.me.x + dx * speed;
    const nz = this.me.z + dz * speed;
    if (walkableIn(this.zone, nx, nz)) {
      this.me.x = nx;
      this.me.z = nz;
    } else if (walkableIn(this.zone, nx, this.me.z)) this.me.x = nx;
    else if (walkableIn(this.zone, this.me.x, nz)) this.me.z = nz;
    this.me.a = Math.atan2(dx, dz);
  }

  /* --------------------------------------------------------------- input */

  _mouse(stage) {
    const canvas = this.view.canvas;
    let drag = null;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.root.focus({ preventScroll: true });
      if (e.button === 0) this.mouseL = true;
      if (e.button === 2) this.mouseR = true;
      drag = { x: e.clientX, y: e.clientY, moved: 0, button: e.button };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      this.view.orbit(dx, dy);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.mouseL = false;
      if (e.button === 2) this.mouseR = false;
      const d = drag;
      drag = null;
      if (!d || d.moved > 6 || !this.current) return;
      const r = canvas.getBoundingClientRect();
      const hit = this.view.pick(this.current.ents, e.clientX - r.left, e.clientY - r.top);
      if (!hit) {
        // A right-click on nothing: your first skill on the enemy you have (or the nearest one).
        if (d.button === 2 && this.current.ents.some((x) => x.k === 'm' && !x.dead && Math.hypot(x.x - this.me.x, x.z - this.me.z) < 32)) {
          this.useSkill(0);
          this.send({ t: 'attack', on: true });
        } else if (d.button === 0) this.setTarget(null);
        return;
      }
      if (hit.k === 'npc') {
        this.send({ t: 'talk', npc: hit.npc });
        return;
      }
      if (hit.k === 'n') {
        this.send({ t: 'gather', node: hit.i });
        return;
      }
      this.setTarget(hit.i);
      // An enemy: a left-click attacks it; a right-click attacks and uses your first skill.
      if (hit.k === 'm' && !hit.dead) {
        this.send({ t: 'attack', on: true });
        if (d.button === 2) this.useSkill(0);
      }
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.view.zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });
  }

  setTarget(id) {
    this.target = id;
    this.send({ t: 'target', id });
  }

  _keydown(e) {
    e.stopPropagation();
    if (e.target instanceof HTMLInputElement) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (!this.view) {
      if (e.key === 'Escape') this.close();
      return;
    }
    const code = e.code;
    if (code === 'Tab' || code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
    this.keys.add(code);
    if (e.repeat) return;
    const digit = /^Digit([1-6])$/.exec(code)?.[1];
    if (digit) {
      this.useSkill(Number(digit) - 1);
      return;
    }
    switch (code) {
      case 'Tab':
        return this._cycleTarget();
      case 'Enter':
        e.preventDefault();
        this.$('[data-chat]').focus();
        return;
      case 'KeyF':
        return this._interact();
      case 'KeyI':
        return this.toggle('bag');
      case 'KeyC':
        return this.toggle('char');
      case 'KeyL':
        return this.toggle('quests');
      case 'KeyK':
        return this.toggle('craft');
      case 'KeyP':
        return this.toggle('party');
      case 'KeyG':
        return this.toggle('guild');
      case 'KeyH':
        return this.toggle('help');
      case 'Escape':
        if (this.panels.size) {
          this.panels.clear();
          this.npc = null;
          this._renderAll();
        } else if (this.target != null) this.setTarget(null);
        else this.send({ t: 'stop' });
        return;
      default:
        return undefined;
    }
  }

  useSkill(i) {
    const def = CLASSES[this.ch?.cls]?.skills[i];
    if (!def) return;
    if (this.ch.level < def.level) {
      this.toast(`${def.name} opens at level ${def.level}`);
      return;
    }
    // A hostile skill with no target: take the nearest enemy.
    if (['strike', 'bolt', 'area', 'taunt'].includes(def.kind) && !this._isEnemy(this.target)) this._cycleTarget();
    this.send({ t: 'skill', id: def.id, target: this.target });
  }

  _isEnemy(id) {
    const e = this.current?.ents.find((x) => x.i === id);
    return e?.k === 'm' && !e.dead;
  }

  _cycleTarget() {
    if (!this.current || !this.me) return;
    const enemies = this.current.ents.filter((e) => e.k === 'm' && !e.dead && Math.hypot(e.x - this.me.x, e.z - this.me.z) < 32)
      .sort((a, b) => Math.hypot(a.x - this.me.x, a.z - this.me.z) - Math.hypot(b.x - this.me.x, b.z - this.me.z));
    if (!enemies.length) return;
    const i = enemies.findIndex((e) => e.i === this.target);
    this.setTarget(enemies[(i + 1) % enemies.length].i);
  }

  /** F: the nearest thing to use — an NPC, a node, a portal or a crafting station. */
  _interact() {
    if (!this.current || !this.me) return;
    const near = (x, z) => Math.hypot(x - this.me.x, z - this.me.z);
    let best = null;
    let bestD = 6.5;
    for (const e of this.current.ents) {
      if (e.k !== 'npc' && !(e.k === 'n' && e.ready)) continue;
      const d = near(e.x, e.z);
      if (d < bestD) {
        bestD = d;
        best = { kind: e.k, e };
      }
    }
    const def = ZONES[this.zone];
    for (const p of def.portals) {
      const d = near(...p.at);
      if (d < Math.min(bestD, 6)) {
        bestD = d;
        best = { kind: 'portal', p };
      }
    }
    for (const s of def.stations) {
      const d = near(...s.at);
      if (d < Math.min(bestD, 6.5)) {
        bestD = d;
        best = { kind: 'station', s };
      }
    }
    if (!best) return this.toast('Nothing to use here');
    if (best.kind === 'npc') this.send({ t: 'talk', npc: best.e.npc });
    else if (best.kind === 'n') this.send({ t: 'gather', node: best.e.i });
    else if (best.kind === 'portal') this.send({ t: 'portal', id: best.p.id });
    else {
      this.station = best.s.id;
      this.panels.add('craft');
      this._renderAll();
    }
  }

  _chat(text) {
    text = text.trim();
    if (!text) return;
    let ch = 'say';
    let to = null;
    const m = /^\/(\w+)\s*(.*)$/.exec(text);
    if (m) {
      const cmd = m[1].toLowerCase();
      if (cmd === 'p' || cmd === 'party') ch = 'party';
      else if (cmd === 'g' || cmd === 'guild') ch = 'guild';
      else if (cmd === 'world' || cmd === '1') ch = 'world';
      else if (cmd === 's' || cmd === 'say') ch = 'say';
      else if (cmd === 'w' || cmd === 'whisper') {
        ch = 'whisper';
        [to, text] = [m[2].split(' ')[0], m[2].split(' ').slice(1).join(' ')];
      } else if (cmd === 'invite') {
        this.send({ t: 'party-invite', name: m[2] });
        return;
      } else return this.toast('Commands: /p, /g, /w name, /world, /s, /invite name');
      if (ch !== 'whisper') text = m[2];
    }
    this.send({ t: 'chat', ch, to, text });
  }

  _chatLine(msg) {
    const log = this.$('[data-chatlog]');
    if (!log) return;
    const line = el('div', `hv-chat__line is-${msg.ch}`);
    const tag = { say: '', party: '[Party] ', guild: '[Guild] ', world: '[World] ', whisper: msg.to && msg.to !== this.ch?.name ? `[To ${msg.to}] ` : '[Whisper] ' }[msg.ch] ?? '';
    line.textContent = `${tag}${msg.from}: ${msg.text}`;
    log.append(line);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  _invite(msg) {
    const box = this.$('[data-toasts]');
    const t = el('div', 'hv-toast hv-toast--invite');
    const what = msg.kind === 'party' ? `${msg.from} invites you to a party` : msg.kind === 'guild' ? `${msg.from} invites you to the guild ${msg.name}` : `${msg.from} wants to trade`;
    t.innerHTML = `<span></span><button type="button" class="hv-btn hv-btn--go" data-yes>Accept</button><button type="button" class="hv-btn" data-no>Decline</button>`;
    t.querySelector('span').textContent = what;
    t.querySelector('[data-yes]').addEventListener('click', () => {
      if (msg.kind === 'party') this.send({ t: 'party-accept', party: msg.party });
      else if (msg.kind === 'guild') this.send({ t: 'guild-accept', guild: msg.guild });
      else this.send({ t: 'trade-accept', from: msg.fromId });
      t.remove();
    });
    t.querySelector('[data-no]').addEventListener('click', () => t.remove());
    box.append(t);
    setTimeout(() => t.remove(), 30000);
  }

  toast(text, kind = '') {
    const box = this.$?.('[data-toasts]');
    if (!box) return;
    const t = el('div', `hv-toast ${kind ? `is-${kind}` : ''}`, text);
    box.append(t);
    while (box.querySelectorAll('.hv-toast:not(.hv-toast--invite)').length > 5) box.querySelector('.hv-toast:not(.hv-toast--invite)').remove();
    setTimeout(() => t.remove(), 4500);
  }

  /* --------------------------------------------- combo, hurt, experience */

  /** The combo counter: hits in a row, and what they add to your damage. */
  _combo(n) {
    const box = this.$?.('[data-combo]');
    if (!box) return;
    this.comboUntil = performance.now() + COMBO.keep * 1000;
    if (n < 2) {
      box.hidden = true;
      return;
    }
    const more = Math.round(Math.min(n - 1, COMBO.cap) * COMBO.per * 100);
    const word = n >= 40 ? 'Legendary!' : n >= 25 ? 'Unstoppable!' : n >= 15 ? 'Fierce!' : n >= 8 ? 'Great!' : n >= 4 ? 'Nice!' : '';
    box.hidden = false;
    box.dataset.rank = n >= 25 ? '3' : n >= 15 ? '2' : n >= 8 ? '1' : '0';
    this.$('[data-combo-n]').textContent = n;
    this.$('[data-combo-word]').textContent = word;
    this.$('[data-combo-more]').textContent = `+${more}% damage`;
    // Play the pop again.
    box.classList.remove('is-pop');
    void box.offsetWidth;
    box.classList.add('is-pop');
  }

  _comboTick() {
    const box = this.$?.('[data-combo]');
    if (!box || box.hidden) return;
    const left = (this.comboUntil - performance.now()) / (COMBO.keep * 1000);
    if (left <= 0) box.hidden = true;
    else this.$('[data-combo-left]').style.width = `${left * 100}%`;
  }

  /** A red flash round the screen when you are struck. */
  _hurt() {
    const v = this.$?.('[data-hurt]');
    if (!v) return;
    v.classList.remove('is-on');
    void v.offsetWidth;
    v.classList.add('is-on');
  }

  /** Experience earned: a number that flies up off the gauge. */
  _gain(amount) {
    const box = this.$?.('[data-xp-gains]');
    if (!box) return;
    const g = el('span', 'hv-xp__gain', `+${amount} XP`);
    box.append(g);
    setTimeout(() => g.remove(), 1600);
    const bar = this.$('[data-xp]');
    bar.classList.remove('is-gain');
    void bar.offsetWidth;
    bar.classList.add('is-gain');
  }

  _levelUp(level) {
    const b = this.$?.('[data-levelup]');
    if (!b) return;
    b.innerHTML = `<small>Level up!</small><b>Level ${level}</b>`;
    b.hidden = false;
    b.classList.remove('is-on');
    void b.offsetWidth;
    b.classList.add('is-on');
    confetti(null, 110);
    this.view.shake(0.2);
    clearTimeout(this._levelTimer);
    this._levelTimer = setTimeout(() => (b.hidden = true), 2800);
  }

  /* ----------------------------------------------------------------- HUD */

  _hud(state, meEnt) {
    const $ = this.$;
    if (!this.ch || !meEnt) return;
    const bar = (v, m, color) => `<span class="hv-bar"><i style="width:${Math.max(0, Math.min(1, v / Math.max(1, m))) * 100}%;background:${color}"></i><b>${Math.round(v)} / ${m}</b></span>`;
    $('[data-me-frame]').innerHTML = `<div class="hv-frame__name"><b>${esc(this.ch.name)}</b> <small>${this.ch.level} ${CLASSES[this.ch.cls].name}</small></div>${bar(meEnt.hp, meEnt.mh, '#3fbf5f')}${bar(meEnt.mp, meEnt.mm, '#3d7fff')}${meEnt.sh ? `<small class="hv-shield">Shield ${meEnt.sh}</small>` : ''}`;
    const t = state.ents.find((e) => e.i === this.target);
    const tf = $('[data-target]');
    tf.hidden = !t;
    if (t) {
      const name = t.k === 'p' ? t.n : t.k === 'm' ? MOBS[t.ty].name : '';
      const lvl = t.l != null ? ` <small>${t.l}${t.k === 'm' && MOBS[t.ty].elite ? ' Elite' : ''}</small>` : '';
      tf.innerHTML = `<div class="hv-frame__name"><b>${esc(name)}</b>${lvl}${t.en ? ' <em>Enraged</em>' : ''}</div>${t.hp != null ? bar(t.hp, t.mh, t.k === 'm' ? '#d9473f' : '#3fbf5f') : ''}${t.cast?.total ? `<span class="hv-bar hv-bar--cast"><i style="width:${(1 - t.cast.left / t.cast.total) * 100}%"></i><b>${esc(t.cast.s === 'gather' ? 'Gathering' : CLASSES[t.c]?.skills.find((s) => s.id === t.cast.s)?.name ?? '')}</b></span>` : ''}`;
    }
    // Cast bar.
    const cb = $('[data-castbar]');
    cb.hidden = !meEnt.cast;
    if (meEnt.cast) {
      cb.querySelector('span').style.width = `${(1 - meEnt.cast.left / meEnt.cast.total) * 100}%`;
      cb.querySelector('b').textContent = meEnt.cast.s === 'gather' ? 'Gathering…' : CLASSES[this.ch.cls].skills.find((s) => s.id === meEnt.cast.s)?.name ?? '';
    }
    // Hotbar cooldowns.
    for (const b of $('[data-hotbar]').children) {
      const def = CLASSES[this.ch.cls].skills[Number(b.dataset.i)];
      const cd = Math.max(meEnt.cds?.[def.id] ?? 0, meEnt.gcd ?? 0);
      const total = (meEnt.cds?.[def.id] ?? 0) > (meEnt.gcd ?? 0) ? def.cd : GCD;
      b.querySelector('.hv-slot__cd').style.height = cd > 0 ? `${Math.min(1, cd / Math.max(0.1, total)) * 100}%` : '0';
      b.querySelector('.hv-slot__n').textContent = cd > 1 ? String(Math.ceil(cd)) : '';
      b.classList.toggle('is-off', this.ch.level < def.level || meEnt.mp < def.cost);
    }
    $('[data-dead]').hidden = !meEnt.dead;
    // Party health.
    if (this.party) {
      const here = new Map(state.ents.filter((e) => e.k === 'p').map((e) => [e.n, e]));
      $('[data-party]').innerHTML = this.party.members.filter((m) => m.name !== this.ch.name).map((m) => {
        const e = here.get(m.name);
        return `<button type="button" class="hv-party__m" data-pick="${e?.i ?? ''}"><b>${esc(m.name)}</b> <small>${m.level} ${CLASSES[m.cls].name}${e ? '' : ` · ${esc(m.zone)}`}</small>${e ? bar(e.hp, e.mh, e.dead ? '#666' : '#3fbf5f') : ''}</button>`;
      }).join('');
      for (const b of $('[data-party]').querySelectorAll('[data-pick]')) b.addEventListener('click', () => b.dataset.pick && this.setTarget(Number(b.dataset.pick)));
    } else $('[data-party]').innerHTML = '';
    // What F would do.
    $('[data-hint]').textContent = this._hintText(state);
    this._comboTick();
    const indoor = ZONES[this.zone].kind === 'dungeon' || ZONES[this.zone].kind === 'raid';
    $('[data-zone]').textContent = `${ZONES[this.zone].name}${indoor || !this.view.land ? '' : ` · ${this.view.land.hour}`}`;
    this._minimap(state);
  }

  _hintText(state) {
    if (!this.me) return '';
    const near = (x, z) => Math.hypot(x - this.me.x, z - this.me.z);
    for (const e of state.ents) {
      if (e.k === 'npc' && near(e.x, e.z) < 6.5) return `F — talk to ${NPCS[e.npc].name}`;
      if (e.k === 'n' && e.ready && near(e.x, e.z) < 4) return `F — gather ${NODES[e.ty].name}`;
    }
    for (const p of ZONES[this.zone].portals) if (near(...p.at) < 6) return `F — ${p.name}`;
    for (const s of ZONES[this.zone].stations) if (near(...s.at) < 6.5) return `F — use the ${s.name}`;
    // Nothing to use: say how to fight when something to fight is near.
    const foe = state.ents.some((e) => e.k === 'm' && !e.dead && near(e.x, e.z) < 28);
    if (foe) return this._isEnemy(this.target) ? `Fighting — right-click: ${CLASSES[this.ch.cls].skills[0].name} · 1–6: skills · Tab: next enemy` : 'Left-click an enemy to attack · right-click: attack with your first skill · Tab: nearest enemy';
    return '';
  }

  _minimap(state) {
    const ctx = this.mini.getContext('2d');
    const def = ZONES[this.zone];
    const [w, h] = def.size;
    const W = this.mini.width;
    const k = Math.min(W / w, W / h);
    ctx.fillStyle = '#0d1410';
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = def.ground;
    ctx.fillRect(0, 0, w * k, h * k);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (const wall of def.walls) {
      ctx.beginPath();
      ctx.arc(wall.x * k, wall.z * k, wall.r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of def.portals) {
      ctx.fillStyle = '#7fd6ff';
      ctx.fillRect(p.at[0] * k - 3, p.at[1] * k - 3, 6, 6);
    }
    for (const e of state.ents) {
      if (e.k === 'm' && !e.dead) ctx.fillStyle = MOBS[e.ty].elite ? '#ffb05c' : '#ff6b6b';
      else if (e.k === 'npc') ctx.fillStyle = '#ffe28a';
      else if (e.k === 'n' && e.ready) ctx.fillStyle = NODES[e.ty].color;
      else if (e.k === 'p' && e.i !== this.you) ctx.fillStyle = '#7dd3ff';
      else continue;
      ctx.fillRect(e.x * k - 1.5, e.z * k - 1.5, 3, 3);
    }
    if (this.me) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.me.x * k, this.me.z * k, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------- windows */

  toggle(panel) {
    if (this.panels.has(panel)) this.panels.delete(panel);
    else {
      this.panels.add(panel);
      if (panel === 'guild') this.send({ t: 'guild-roster' });
    }
    this._renderAll();
  }

  _renderAll() {
    if (!this.$ || !this.ch) return;
    this._hotbar();
    this._xp();
    this._tracker();
    const box = this.$('[data-windows]');
    box.replaceChildren();
    for (const p of this.panels) {
      const w = this[`_win_${p}`]?.();
      if (w) box.append(w);
    }
    for (const b of this.$('[data-menu]').children) b.classList.toggle('is-on', this.panels.has(b.dataset.panel));
    // A window that redraws takes its clicked button with it: give the keys back to the game
    // (so W A S D and F keep working), unless someone is typing.
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement) && (!active || active === document.body || !this.root.contains(active) || !active.isConnected)) this.root.focus({ preventScroll: true });
  }

  _window(title, id, body) {
    const w = el('section', `hv-win hv-win--${id}`);
    w.dataset.win = id;
    w.innerHTML = `<header><h2></h2><button type="button" class="hv__x" aria-label="Close">✕</button></header><div class="hv-win__body"></div>`;
    w.querySelector('h2').textContent = title;
    w.querySelector('header button').addEventListener('click', () => {
      this.panels.delete(id);
      if (id === 'npc') this.npc = null;
      if (id === 'trade') this.send({ t: 'trade-cancel' });
      this._renderAll();
    });
    const b = w.querySelector('.hv-win__body');
    if (typeof body === 'string') b.innerHTML = body;
    else b.append(body);
    return w;
  }

  _hotbar() {
    const bar = this.$('[data-hotbar]');
    const skills = CLASSES[this.ch.cls].skills;
    if (bar.dataset.cls === this.ch.cls && bar.dataset.level === String(this.ch.level)) return;
    bar.dataset.cls = this.ch.cls;
    bar.dataset.level = String(this.ch.level);
    bar.replaceChildren(...skills.map((s, i) => {
      const b = el('button', 'hv-slot');
      b.type = 'button';
      b.dataset.i = String(i);
      b.title = `${s.name} (${i + 1}) — ${s.cast ? `${s.cast}s cast` : 'instant'}, ${s.cost} ${CLASSES[this.ch.cls].resource.toLowerCase()}${s.cd ? `, ${s.cd}s cooldown` : ''}${this.ch.level < s.level ? ` · opens at level ${s.level}` : ''}`;
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="hv-slot__icon">${s.icon}</span><span class="hv-slot__cd"></span><span class="hv-slot__n"></span>`;
      b.addEventListener('click', () => this.useSkill(i));
      return b;
    }));
  }

  _xp() {
    const lo = XP_TO[this.ch.level] ?? 0;
    const hi = XP_TO[this.ch.level + 1] ?? lo + 1;
    const k = this.ch.level >= MAX_LEVEL ? 1 : (this.ch.xp - lo) / (hi - lo);
    const pct = Math.round(Math.max(0, Math.min(1, k)) * 100);
    const x = this.$('[data-xp]');
    x.setAttribute('aria-valuenow', pct);
    this.$('[data-xp-lvl]').textContent = this.ch.level;
    this.$('[data-xp-fill]').style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
    this.$('[data-xp-text]').textContent = this.ch.level >= MAX_LEVEL ? 'Highest level' : `${this.ch.xp - lo} / ${hi - lo} XP  ·  ${pct}%  ·  ${hi - this.ch.xp} to level ${this.ch.level + 1}`;
    this.$('[data-xp-gold]').textContent = `💰 ${this.ch.gold}`;
  }

  _tracker() {
    const rows = Object.entries(this.ch.quests.active).map(([id, have]) => {
      const q = QUESTS[id];
      const goal = q.goal.kill ? `${MOBS[q.goal.kill].name}: ${Math.min(have, q.goal.count)}/${q.goal.count}` : `${ITEMS[q.goal.gather].name}: ${Math.min(countOf(this.ch, q.goal.gather), q.goal.count)}/${q.goal.count}`;
      return `<li class="${questDone(this.ch, id) ? 'is-done' : ''}"><b>${esc(q.name)}</b><span>${esc(goal)}${questDone(this.ch, id) ? ` — back to ${esc(NPCS[q.to].name)}` : ''}</span></li>`;
    });
    this.$('[data-tracker]').innerHTML = rows.length ? `<ul>${rows.join('')}</ul>` : '';
  }

  _slotButton(s, onClick, extra = '') {
    const b = el('button', 'hv-item');
    b.type = 'button';
    if (s) {
      b.innerHTML = `<span>${ICON(s.item)}</span>${s.n > 1 ? `<small>${s.n}</small>` : ''}`;
      b.style.borderColor = itemColor(s.item);
      b.title = `${itemTip(s.item)}${extra}`;
      b.dataset.item = s.item;
    }
    b.addEventListener('click', (e) => onClick?.(e));
    return b;
  }

  _win_bag() {
    const body = el('div');
    const grid = el('div', 'hv-grid');
    const mode = this.panels.has('trade') ? 'trade' : this.npc?.vendor ? 'sell' : this.npc?.bank ? 'bank' : 'use';
    this.ch.bag.forEach((s, i) => {
      const hint = !s ? '' : mode === 'sell' ? `\nClick: sell for ${(ITEMS[s.item].value ?? 0) * s.n} gold` : mode === 'bank' ? '\nClick: put in the bank' : mode === 'trade' ? '\nClick: offer in the trade' : ITEMS[s.item].slot ? '\nClick: wear' : ITEMS[s.item].use ? '\nClick: use' : '';
      const b = this._slotButton(s, () => {
        if (!s) return;
        if (mode === 'sell') this.send({ t: 'sell', slot: i });
        else if (mode === 'bank') this.send({ t: 'bank-put', slot: i });
        else if (mode === 'trade') {
          const offer = new Set(this.trade?.me.items.map((x) => x.slot) ?? []);
          if (offer.has(i)) offer.delete(i);
          else offer.add(i);
          this.send({ t: 'trade-offer', slots: [...offer], gold: this.trade?.me.gold ?? 0 });
        } else if (ITEMS[s.item].slot) this.send({ t: 'equip', slot: i });
        else if (ITEMS[s.item].use) this.send({ t: 'use', slot: i });
      }, hint);
      b.dataset.slot = String(i);
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (s && window.confirm(`Throw away ${ITEMS[s.item].name}?`)) this.send({ t: 'destroy', slot: i });
      });
      grid.append(b);
    });
    body.append(grid, el('p', 'hv-muted', `${this.ch.gold} gold · right-click an item to throw it away`));
    return this._window('Bag', 'bag', body);
  }

  _win_char() {
    const body = el('div', 'hv-charwin');
    const gear = el('div', 'hv-gear');
    for (const slot of SLOTS) {
      const id = this.ch.equip[slot];
      const row = el('div', 'hv-gear__row');
      row.append(this._slotButton(id ? { item: id, n: 1 } : null, () => id && this.send({ t: 'unequip', slot }), '\nClick: take off'), el('span', null, id ? ITEMS[id].name : `— ${slot}`));
      gear.append(row);
    }
    const st = this.st ?? {};
    const stats = el('div', 'hv-stats');
    stats.innerHTML = `<p><b>${esc(this.ch.name)}</b>, level ${this.ch.level} ${esc(CLASSES[this.ch.cls].name)}</p>
      <p>Health ${st.maxHp} · ${esc(CLASSES[this.ch.cls].resource)} ${st.maxMana} · Power ${st.power} · Armor ${st.armor}</p>
      <h3>Professions</h3><ul>${Object.entries(PROFESSIONS).map(([k, n]) => `<li>${esc(n)} <b>${this.ch.skills[k] ?? 1}</b></li>`).join('')}</ul>`;
    body.append(gear, stats);
    return this._window('Character', 'char', body);
  }

  _win_quests() {
    const ids = Object.keys(this.ch.quests.active);
    const body = el('div');
    if (!ids.length) body.append(el('p', 'hv-muted', 'No quests. Look for a ! over someone in Hearthvale.'));
    for (const id of ids) {
      const q = QUESTS[id];
      const row = el('div', 'hv-quest');
      row.innerHTML = `<b></b><p></p><small></small><button type="button" class="hv-btn">Abandon</button>`;
      row.querySelector('b').textContent = q.name;
      row.querySelector('p').textContent = q.text;
      row.querySelector('small').textContent = `Reward: ${q.reward.xp} xp, ${q.reward.gold ?? 0} gold${q.reward.item ? `, ${ITEMS[q.reward.item].name}` : ''} · hand in to ${NPCS[q.to].name}`;
      row.querySelector('button').addEventListener('click', () => this.send({ t: 'quest-abandon', id }));
      body.append(row);
    }
    body.append(el('p', 'hv-muted', `${this.ch.quests.done.length} quest${this.ch.quests.done.length === 1 ? '' : 's'} done.`));
    return this._window('Quests', 'quests', body);
  }

  _win_npc() {
    const n = this.npc;
    if (!n) return null;
    const def = NPCS[n.npc];
    const body = el('div');
    body.append(el('p', 'hv-muted', def.title));
    for (const id of n.hand) {
      const q = QUESTS[id];
      const row = el('div', 'hv-quest is-done');
      row.innerHTML = `<b>? ${esc(q.name)}</b><p>Done! Hand it in.</p><button type="button" class="hv-btn hv-btn--go" data-turnin>Complete quest</button>`;
      row.querySelector('[data-turnin]').addEventListener('click', () => {
        this.send({ t: 'quest-turnin', id });
        setTimeout(() => this.send({ t: 'talk', npc: n.npc }), 150);
      });
      body.append(row);
    }
    for (const id of n.offer) {
      const q = QUESTS[id];
      const row = el('div', 'hv-quest');
      row.innerHTML = `<b>! ${esc(q.name)}</b><p></p><small></small><button type="button" class="hv-btn hv-btn--go" data-accept>Accept</button>`;
      row.querySelector('p').textContent = q.text;
      row.querySelector('small').textContent = `Reward: ${q.reward.xp} xp, ${q.reward.gold ?? 0} gold${q.reward.item ? `, ${ITEMS[q.reward.item].name}` : ''}`;
      row.querySelector('[data-accept]').addEventListener('click', () => {
        this.send({ t: 'quest-accept', id });
        setTimeout(() => this.send({ t: 'talk', npc: n.npc }), 150);
      });
      body.append(row);
    }
    if (n.says) body.append(el('p', 'hv-says', `“${n.says}”`));
    if (n.vendor) body.append(this._store(n));
    if (n.bank) {
      body.append(el('h3', null, 'Your bank'));
      const grid = el('div', 'hv-grid');
      this.ch.bank.forEach((s, i) => grid.append(this._slotButton(s, () => s && this.send({ t: 'bank-take', slot: i }), '\nClick: take out')));
      body.append(grid, el('p', 'hv-muted', 'Click an item in your bag to put it in.'));
      this.panels.add('bag');
    }
    if (n.guild) {
      if (this.guild) body.append(el('p', null, `You are in ${this.guild.name}.`));
      else {
        const f = el('div', 'hv-create__row');
        f.innerHTML = '<label class="hv-field">Guild name <input data-guild-name maxlength="24"></label><button type="button" class="hv-btn hv-btn--go">Found it (10 gold)</button>';
        f.querySelector('button').addEventListener('click', () => this.send({ t: 'guild-create', name: f.querySelector('input').value }));
        body.append(f);
      }
    }
    if (!n.hand.length && !n.offer.length && !n.vendor && !n.bank && !n.guild && !n.says) body.append(el('p', null, 'Nothing for you right now. Come back later.'));
    return this._window(def.name, 'npc', body);
  }

  /**
   * A shop: what it sells in tabs (weapons, armor, supplies), each with its
   * stats beside what you wear now, and a Sell tab for your bag.
   */
  _store(n) {
    const box = el('div', 'hv-store');
    const items = n.vendor;
    const groups = [
      ['weapons', 'Weapons', items.filter((id) => ITEMS[id].slot === 'weapon')],
      ['armor', 'Armor', items.filter((id) => ITEMS[id].slot && ITEMS[id].slot !== 'weapon')],
      ['supplies', 'Supplies', items.filter((id) => !ITEMS[id].slot)],
      ['sell', 'Sell', null]
    ].filter(([, , list]) => !list || list.length);
    if (!groups.some(([k]) => k === this.storeTab)) this.storeTab = groups[0][0];
    const head = el('div', 'hv-store__head');
    head.innerHTML = `<span class="hv-store__gold">🪙 ${this.ch.gold} gold</span>`;
    const tabs = el('div', 'hv-store__tabs');
    for (const [key, label] of groups) {
      const b = el('button', `hv-btn${this.storeTab === key ? ' is-on' : ''}`, label);
      b.type = 'button';
      b.dataset.tab = key;
      b.addEventListener('click', () => {
        this.storeTab = key;
        this._renderAll();
      });
      tabs.append(b);
    }
    head.append(tabs);
    box.append(head);
    const list = el('div', 'hv-store__list');
    if (this.storeTab === 'sell') {
      const sellable = this.ch.bag.map((x, i) => [x, i]).filter(([x]) => x && (ITEMS[x.item].value ?? 0) > 0);
      if (!sellable.length) list.append(el('p', 'hv-muted', 'Nothing in your bag to sell.'));
      for (const [x, i] of sellable) {
        const row = el('div', 'hv-store__row');
        row.innerHTML = `<span class="hv-store__icon">${ICON(x.item)}</span><div><b></b><small></small></div><button type="button" class="hv-btn" data-sell="${i}">Sell</button>`;
        row.querySelector('b').textContent = `${ITEMS[x.item].name}${x.n > 1 ? ` ×${x.n}` : ''}`;
        row.querySelector('b').style.color = itemColor(x.item);
        row.querySelector('small').textContent = `${(ITEMS[x.item].value ?? 0) * x.n} gold`;
        row.querySelector('button').addEventListener('click', () => this.send({ t: 'sell', slot: i }));
        list.append(row);
      }
    } else {
      const [, , ids] = groups.find(([k]) => k === this.storeTab);
      for (const id of ids) {
        const it = ITEMS[id];
        const price = it.value * 4;
        const row = el('div', 'hv-store__row');
        row.dataset.item = id;
        const lowLevel = (it.level ?? 1) > this.ch.level;
        let compare = '';
        if (it.slot) {
          const worn = this.ch.equip[it.slot];
          const keys = new Set([...Object.keys(it.stats ?? {}), ...Object.keys(ITEMS[worn]?.stats ?? {})]);
          const diffs = [...keys].map((k) => [k, (it.stats?.[k] ?? 0) - (ITEMS[worn]?.stats?.[k] ?? 0)]).filter(([, d]) => d);
          compare = worn === id ? '<em class="hv-store__same">You wear this</em>' : diffs.length ? diffs.map(([k, d]) => `<em class="${d > 0 ? 'is-up' : 'is-down'}">${d > 0 ? '+' : ''}${d} ${k}</em>`).join(' ') : '<em class="hv-store__same">Same as yours</em>';
        }
        const stats = it.stats ? Object.entries(it.stats).map(([k, v]) => `+${v} ${k}`).join(' · ') : it.use ? `${it.use.heal ? `heals ${it.use.heal}` : ''}${it.use.heal && it.use.mana ? ' · ' : ''}${it.use.mana ? `restores ${it.use.mana} mana` : ''}` : '';
        row.innerHTML = `<span class="hv-store__icon">${ICON(id)}</span>
          <div><b></b><small>${esc(stats)}${it.slot ? ` · ${it.slot}` : ''}${it.level ? ` · <span class="${lowLevel ? 'is-down' : ''}">level ${it.level}</span>` : ''}</small>${compare ? `<span class="hv-store__cmp">${compare}</span>` : ''}</div>
          <div class="hv-store__buy"><span class="hv-store__price">${price} g</span></div>`;
        row.querySelector('b').textContent = it.name;
        row.querySelector('b').style.color = itemColor(id);
        const buy = row.querySelector('.hv-store__buy');
        const add = (label, count, wear = false) => {
          const b = el('button', `hv-btn${wear ? ' hv-btn--go' : ''}`, label);
          b.type = 'button';
          b.dataset.buy = id;
          if (wear) b.dataset.wear = '1';
          b.disabled = this.ch.gold < price * count;
          b.addEventListener('click', () => {
            if (wear) this.wearNext = id;
            this.send({ t: 'buy', npc: n.npc, item: id, n: count });
          });
          buy.append(b);
        };
        add('Buy', 1);
        if (!it.slot) add('×5', 5);
        else if (!lowLevel && this.ch.equip[it.slot] !== id) add('Buy & wear', 1, true);
        list.append(row);
      }
    }
    box.append(list);
    return box;
  }

  _win_craft() {
    const body = el('div');
    body.append(el('p', 'hv-muted', this.station ? `At the ${ZONES[this.zone].stations.find((s) => s.id === this.station)?.name ?? this.station}.` : 'Stand by the anvil, the cauldron or the workbench in Hearthvale and press F.'));
    for (const [id, r] of Object.entries(RECIPES)) {
      const have = r.uses.every(([item, n]) => countOf(this.ch, item) >= n);
      const skill = this.ch.skills[r.skill] ?? 1;
      const row = el('div', `hv-recipe ${have && skill >= r.need ? '' : 'is-off'}`);
      row.innerHTML = `<span>${ICON(r.makes[0])}</span><div><b></b><small></small></div><button type="button" class="hv-btn">Make</button>`;
      row.querySelector('b').textContent = `${r.name}${r.makes[1] > 1 ? ` ×${r.makes[1]}` : ''}`;
      row.querySelector('small').textContent = `${PROFESSIONS[r.skill]} ${r.need} (${skill}) · ${r.station} · ${r.uses.map(([item, n]) => `${ITEMS[item].name} ${countOf(this.ch, item)}/${n}`).join(', ')}`;
      row.querySelector('button').dataset.recipe = id;
      row.querySelector('button').addEventListener('click', () => this.send({ t: 'craft', recipe: id }));
      body.append(row);
    }
    return this._window('Crafting', 'craft', body);
  }

  _win_party() {
    const body = el('div');
    if (this.party) {
      const ul = el('ul', 'hv-list');
      for (const m of this.party.members) ul.append(el('li', null, `${m.name}${m.name === this.party.leader ? ' ★' : ''} — ${m.level} ${CLASSES[m.cls].name} · ${m.zone}`));
      body.append(ul);
      const row = el('div', 'hv-create__row');
      row.innerHTML = '<button type="button" class="hv-btn" data-join>Go to the leader</button><button type="button" class="hv-btn" data-leave>Leave the party</button>';
      row.querySelector('[data-join]').addEventListener('click', () => this.send({ t: 'party-join' }));
      row.querySelector('[data-leave]').addEventListener('click', () => this.send({ t: 'party-leave' }));
      body.append(row);
    } else body.append(el('p', 'hv-muted', 'You are on your own. Invite someone online by name — a party shares one world, its kills and its quests (up to 8; the Sunken Crypt takes 5, the Ember Spire 8).'));
    const f = el('div', 'hv-create__row');
    f.innerHTML = '<label class="hv-field">Invite <input data-invite maxlength="16" placeholder="Name"></label><button type="button" class="hv-btn hv-btn--go">Invite</button>';
    f.querySelector('button').addEventListener('click', () => this.send({ t: 'party-invite', name: f.querySelector('input').value }));
    body.append(f);
    const tr = el('div', 'hv-create__row');
    tr.innerHTML = '<label class="hv-field">Trade with <input data-trade-name maxlength="16" placeholder="Name (beside you)"></label><button type="button" class="hv-btn">Ask</button>';
    tr.querySelector('button').addEventListener('click', () => this.send({ t: 'trade-ask', name: tr.querySelector('input').value }));
    body.append(tr);
    return this._window('Party', 'party', body);
  }

  _win_guild() {
    const body = el('div');
    if (!this.guild) {
      body.append(el('p', 'hv-muted', 'You are not in a guild. Fenwick in Hearthvale registers new ones (10 gold); or ask a guild member for an invitation.'));
      return this._window('Guild', 'guild', body);
    }
    body.append(el('h3', null, this.guild.name));
    const ul = el('ul', 'hv-list');
    for (const m of this.roster ?? []) ul.append(el('li', m.online ? 'is-online' : '', `${m.name}${m.leader ? ' ★' : ''} — ${m.level} ${CLASSES[m.cls]?.name ?? ''}${m.online ? ' · online' : ''}`));
    body.append(ul);
    const f = el('div', 'hv-create__row');
    f.innerHTML = '<label class="hv-field">Invite <input maxlength="16" placeholder="Name"></label><button type="button" class="hv-btn hv-btn--go">Invite</button><button type="button" class="hv-btn" data-leave>Leave the guild</button>';
    f.querySelector('.hv-btn--go').addEventListener('click', () => this.send({ t: 'guild-invite', name: f.querySelector('input').value }));
    f.querySelector('[data-leave]').addEventListener('click', () => window.confirm('Leave the guild?') && this.send({ t: 'guild-leave' }));
    body.append(f, el('p', 'hv-muted', 'Guild chat: /g message'));
    return this._window('Guild', 'guild', body);
  }

  _win_trade() {
    const t = this.trade;
    if (!t) return null;
    const body = el('div', 'hv-trade');
    const side = (s, mine) => {
      const col = el('div', 'hv-trade__side');
      col.append(el('h3', null, `${s.name}${s.locked ? ' — agreed ✓' : ''}`));
      const grid = el('div', 'hv-grid');
      for (const it of s.items) grid.append(this._slotButton(it.item ? it : null, null));
      col.append(grid);
      if (mine) {
        const g = el('label', 'hv-field');
        g.innerHTML = `Gold <input type="number" min="0" max="${this.ch.gold}" value="${s.gold}">`;
        g.querySelector('input').addEventListener('change', (e) => this.send({ t: 'trade-offer', slots: s.items.map((x) => x.slot), gold: Number(e.target.value) || 0 }));
        col.append(g);
      } else col.append(el('p', null, `${s.gold} gold`));
      return col;
    };
    body.append(side(t.me, true), side(t.them, false));
    const row = el('div', 'hv-create__row');
    row.innerHTML = '<button type="button" class="hv-btn hv-btn--go" data-lock>Agree</button><button type="button" class="hv-btn" data-cancel>Cancel</button>';
    row.querySelector('[data-lock]').addEventListener('click', () => this.send({ t: 'trade-lock' }));
    row.querySelector('[data-cancel]').addEventListener('click', () => this.send({ t: 'trade-cancel' }));
    const wrap = el('div');
    wrap.append(body, el('p', 'hv-muted', 'Click items in your bag to offer them. Any change undoes both agreements.'), row);
    this.panels.add('bag');
    return this._window(`Trade with ${t.them.name}`, 'trade', wrap);
  }

  _win_help() {
    return this._window('How to play', 'help', `<ul class="hv-help">
      <li><b>Walk</b>: W A S D (or hold both mouse buttons). <b>Look</b>: drag with the mouse; the wheel zooms.</li>
      <li><b>Fight</b>: left-click an enemy to target and attack it (your character keeps swinging or shooting). Right-click attacks and uses your first skill. Tab picks the nearest enemy.</li>
      <li><b>Skills</b>: 1–6 (new ones open as you level). One skill a second; some take time to cast — moving stops them.</li>
      <li><b>Combos</b>: every hit within four seconds of the last adds to your combo — each one hits 2% harder, up to +20%. Every third basic attack in a row is a <b>finisher</b> (40% harder). Keep swinging and weave skills in between.</li>
      <li><b>Experience</b>: the purple gauge under the hotbar fills as you fight and hand in quests; the badge on its left is your level.</li>
      <li><b>F</b>: talk to someone (a ! has a quest, a ? wants one back), gather a node, step through a portal, use a crafting station.</li>
      <li><b>Windows</b>: I bag · C character · L quests · K crafting · P party · G guild · Enter chat.</li>
      <li><b>Together</b>: invite friends by name (P). A party shares a world, its kills and its quests. The Sunken Crypt (from the Greenfold, level 8) takes up to 5; the Ember Spire (from the Ashfen, level 16) up to 8. Watch for red circles on the ground: get out of them.</li>
      <li><b>Professions</b>: Mining, Herbalism and Logging from the nodes in the wild; Smithing, Alchemy and Woodcraft at the anvil, cauldron and workbench in Hearthvale.</li>
    </ul>`);
  }
}
