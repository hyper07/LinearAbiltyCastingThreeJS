/**
 * Lanternwood's screen furniture, in the HD-2D style: a slim top bar (HP,
 * mana or energy, XP, crystals, gold), the party's frames, diamond markers
 * over people, floating numbers, health bars over foes (gold names for hero
 * monsters), loot labels, the quest tracker, the class's hotbar (skills 1–4,
 * potions 5–6, food 7) and the key hints, plus the dialogue box, the title
 * screen, the minimap (every realm) and the realm map. Plain DOM; the game
 * calls in. The bigger windows (bag, character, journal, shops, party) are
 * in panels.js.
 */
import { CONTROLS } from './controls.js';
import { hintItems } from '../shared/helpPanel.js';
import { NPCS, QUESTS, REALMS, CLASSES, CLASS_ORDER, SKILLS, LOOKS, statsOf, xpToNext, currentQuest, countOf, lookById, ENEMIES, npcsIn } from './rules.js';
import { portrait, skillIcon, heroSpriteFor } from './sprites.js';

export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON = {
  gold: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f0c040" stroke="#7a4a10" stroke-width="1.4"/><path d="M6 5.5h3.2a1.6 1.6 0 010 3.2H6.6M6.6 8.7h3a1.6 1.6 0 010 3.2H6V5.5" fill="none" stroke="#8c5a14" stroke-width="1.1"/></svg>',
  crystal: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l4.5 4.8L8 14.5 3.5 6.3z" fill="#7fe0ff" stroke="#1c4a7a" stroke-width="1.2"/><path d="M8 1.5v13M3.5 6.3h9" stroke="#d8f6ff" stroke-width="0.8" opacity=".7"/></svg>',
  bottle: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 1.8h3.4v3.1l3 3.6a3.9 3.9 0 01-3 6.3H6.3a3.9 3.9 0 01-3-6.3l3-3.6z" fill="#ff7a8a" stroke="#4a1020" stroke-width="1.2"/><path d="M5 9.5h6" stroke="#ffd0d8" stroke-width="1"/></svg>',
  mana: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 1.8h3.4v3.1l3 3.6a3.9 3.9 0 01-3 6.3H6.3a3.9 3.9 0 01-3-6.3l3-3.6z" fill="#7aa8ff" stroke="#10204a" stroke-width="1.2"/><path d="M5 9.5h6" stroke="#d0e0ff" stroke-width="1"/></svg>',
  fire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c1 3 4.5 4.2 4.5 8a4.5 4.5 0 01-9 0c0-2 1-3 2-4 0 1.5.8 2.4 1.5 2.4C7 5.5 7 3.5 8 1.5z" fill="#ff8a2a" stroke="#6e2a10" stroke-width="1.1"/><path d="M8 8.5c.8 1 1.8 1.6 1.8 3a1.8 1.8 0 01-3.6 0c0-1 .8-1.8 1.8-3z" fill="#ffe26b"/></svg>',
  sword: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 2.5L6 10l-1.2-.2L5 8.5l7.5-7.5z" fill="#cfe2ea" stroke="#34435a" stroke-width="1"/><path d="M3 9.5l3.5 3.5M4.2 11.8l-2 2" stroke="#c48a1c" stroke-width="1.6" stroke-linecap="round"/></svg>',
  portal: '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="8" rx="4.5" ry="6.3" fill="#2a6a8a" stroke="#9ae8ff" stroke-width="1.6"/><ellipse cx="8" cy="8" rx="2" ry="3.4" fill="#9ae8ff"/></svg>',
  chest: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="6" width="12" height="7.5" rx="1" fill="#8a5a2a" stroke="#3a2010" stroke-width="1.2"/><path d="M2 6.5a6 3.5 0 0112 0" fill="#a8743e" stroke="#3a2010" stroke-width="1.2"/><rect x="7" y="7.5" width="2" height="2.6" fill="#f0c040"/></svg>'
};
export { ICON };

const kbd = (k) => `<kbd>${k}</kbd>`;
export const fmtTime = (s) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}h ` : ''}${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;

/** The key hints along the bottom: the rows of controls.js marked `hint` (so the HUD, the pause screen and How to play agree). */
export const KEY_HINTS = hintItems(CONTROLS)
  .map((h) => `<span>${h.keys.map((k) => kbd(k)).join('')} ${h.does}</span>`)
  .join('');

export class Hud {
  constructor(root, sprites) {
    this.root = root;
    this.sprites = sprites;
    this.layer = el('div', 'ld-hud');
    this.layer.hidden = true;
    root.append(this.layer);
    this.layer.innerHTML = `
      <div class="ld-top">
        <div class="ld-top__hero">
          <canvas class="ld-top__face" width="40" height="40"></canvas>
          <span class="ld-top__lv" data-lv>Lv 1</span>
          <div class="ld-bars">
            <div class="ld-bar ld-bar--hp"><i data-hp-fill></i><span data-hp>90 / 90</span></div>
            <div class="ld-bar ld-bar--mp" data-mp-bar><i data-mp-fill></i><span data-mp>40 / 40</span></div>
            <div class="ld-bar ld-bar--xp"><i data-xp-fill></i></div>
          </div>
          <div class="ld-buffs" data-buffs></div>
        </div>
        <div class="ld-top__area"><small data-realm>Lanternwood</small><span data-area>Lanternwood Camp</span></div>
        <div class="ld-top__res">
          <span class="ld-res" title="Crystals">${ICON.crystal}<b data-crystals>0</b></span>
          <span class="ld-res" title="Gold">${ICON.gold}<b data-gold>0</b></span>
        </div>
      </div>
      <div class="ld-party" data-party></div>
      <div class="ld-mini" title="The map round you (M for the realms)"><canvas width="360" height="360" data-mini></canvas><span class="ld-mini__n" data-mini-n>N</span></div>
      <div class="ld-tracker" data-tracker></div>
      <div class="ld-boss" data-boss hidden><span data-boss-name>The Lampwight</span><div class="ld-boss__bar"><i data-boss-fill></i></div></div>
      <div class="ld-world" data-world></div>
      <div class="ld-prompt" data-prompt hidden></div>
      <div class="ld-combo" data-combo hidden><b data-combo-n>2</b><span>HITS</span></div>
      <div class="ld-toasts" data-toasts></div>
      <div class="ld-log" data-log></div>
      <div class="ld-rest" data-rest hidden>Resting by the Hearthlight</div>
      <div class="ld-actions" data-actions></div>
      <div class="ld-keys" data-keys>${KEY_HINTS}</div>`;
    const $ = (s) => this.layer.querySelector(s);
    this.$ = $;
    this.face = $('.ld-top__face');
    this.world = $('[data-world]');
    this.markers = new Map();
    this.bars = new Map();
    this.numbers = [];
    this.slots = {};
  }

  show(on) {
    this.layer.hidden = !on;
  }

  /** The hero's portrait and the hotbar for their class: skills on 1–4, potions on 5 and 6, food on 7. */
  setHero(hero, sprite) {
    const g = this.face.getContext('2d');
    g.clearRect(0, 0, 40, 40);
    g.imageSmoothingEnabled = false;
    g.drawImage(portrait(sprite, 40), 0, 0);
    if (this._cls === hero.cls) return;
    this._cls = hero.cls;
    const c = CLASSES[hero.cls];
    this.$('[data-mp-bar]').classList.toggle('ld-bar--en', c.resource === 'energy');
    const actions = this.$('[data-actions]');
    actions.innerHTML = '';
    this.slots = {};
    const add = (key, id, icon, label, cost) => {
      const s = el('div', 'ld-slot');
      s.dataset.slot = id;
      s.title = label;
      s.innerHTML = `<canvas width="48" height="48"></canvas><kbd>${key}</kbd><em data-n></em><i class="ld-slot__cd"></i>`;
      const cg = s.querySelector('canvas').getContext('2d');
      cg.imageSmoothingEnabled = false;
      const ic = skillIcon(icon);
      cg.drawImage(ic, 0, 0, ic.width, ic.height, 0, 0, 48, 48);
      if (cost) s.dataset.cost = cost;
      actions.append(s);
      this.slots[id] = s;
    };
    c.skills.forEach((id, i) => {
      const sk = SKILLS[id];
      add(String(i + 1), id, sk.icon, `${sk.name} — ${sk.desc} (${sk.cost} ${c.resource}, ${sk.cd} s)`, sk.cost);
    });
    const gap = el('i', 'ld-slot-gap');
    actions.append(gap);
    add('5', 'hp', 'potionHp', 'Health potion — no cooldown');
    add('6', 'mp', 'potionMp', c.resource === 'energy' ? 'Mana potion — restores energy too' : 'Mana potion — no cooldown');
    add('7', 'food', 'food', 'Eat (bread or stew): heals over a few seconds');
  }

  /** Bars, numbers and the hotbar (cheap: only writes what changed). */
  stats(hero, s, cds, buffs) {
    const set = (sel, v) => {
      const n = this.$(sel);
      if (n.textContent !== String(v)) n.textContent = v;
    };
    set('[data-lv]', `Lv ${hero.level}`);
    set('[data-hp]', `${Math.ceil(hero.hp)} / ${s.maxHp}`);
    set('[data-mp]', `${Math.floor(hero.mp)} / ${s.maxMp}`);
    set('[data-gold]', hero.gold);
    set('[data-crystals]', hero.crystals);
    this.$('[data-hp-fill]').style.width = `${(hero.hp / s.maxHp) * 100}%`;
    this.$('[data-mp-fill]').style.width = `${(hero.mp / s.maxMp) * 100}%`;
    this.$('[data-xp-fill]').style.width = `${(hero.xp / xpToNext(hero.level)) * 100}%`;
    this.layer.classList.toggle('ld-hud--low', hero.hp / s.maxHp < 0.3);
    const slot = (id, n, cd, usable) => {
      const e = this.slots[id];
      if (!e) return;
      const em = e.querySelector('[data-n]');
      if (em.textContent !== String(n)) em.textContent = n;
      e.style.setProperty('--cd', cd);
      e.classList.toggle('ld-slot--off', !usable);
    };
    for (const id of CLASSES[hero.cls].skills) {
      const sk = SKILLS[id];
      slot(id, sk.cost, (cds[id] ?? 0) / sk.cd, hero.mp >= sk.cost);
    }
    const hp = countOf(hero.bag, 'hp'), mp = countOf(hero.bag, 'mp'), food = countOf(hero.bag, 'bread') + countOf(hero.bag, 'stew');
    slot('hp', `×${hp}`, 0, hp > 0);
    slot('mp', `×${mp}`, 0, mp > 0);
    slot('food', `×${food}`, 0, food > 0);
    // Buffs and states, as small badges by the bars.
    const b = [buffs.guard > 0 && 'Guard', buffs.fury > 0 && 'Fury', buffs.ward > 0 && 'Ward', buffs.regen?.t > 0 && 'Eating', buffs.chill > 0 && 'Chilled'].filter(Boolean).join(' · ');
    set('[data-buffs]', b);
  }

  area(realmName, name) {
    const n = this.$('[data-area]');
    this.$('[data-realm]').textContent = realmName;
    if (n.textContent !== name) {
      n.textContent = name;
      n.classList.remove('ld-flash');
      void n.offsetWidth;
      n.classList.add('ld-flash');
    }
  }

  tracker(log, realm) {
    const cur = currentQuest(log, realm);
    const t = this.$('[data-tracker]');
    let html = '';
    if (!cur) {
      const next = QUESTS.find((q) => log[q.id].state === 'available' && q.realm === realm) ?? QUESTS.find((q) => log[q.id].state === 'available');
      if (next) html = `<h3>Next</h3><p>Speak with <b>${NPCS[next.giver].name}</b> <span class="ld-mark ld-mark--sm">!</span></p><small>${REALMS[next.realm].name}</small>`;
      else if (log.tyrant.state === 'done') html = '<h3>The realms are free</h3><p>Explore as you like. Hero monsters still roam.</p>';
      else if (log.lampwight.state === 'done') html = '<h3>Lanternwood</h3><p>Every lantern burns. The waystone hums.</p>';
    } else {
      const q = cur.quest;
      const words = { herb: 'Ember-herbs', brazier: 'Braziers lit', sunpetal: 'Sunpetals', frostlily: 'Frost lilies', emberstone: 'Emberstones', sunmeadow: 'Hero monsters', lanternwood: 'Hero monsters' };
      const goalWord = words[q.goal.target] ?? `${ENEMIES[q.goal.target]?.name ?? q.goal.target}${q.goal.count > 1 ? 's' : ''}`;
      const where = q.realm !== realm ? `${REALMS[q.realm].name} · ` : '';
      const area = REALMS[q.realm].layout.areas[q.area]?.name ?? '';
      const line = cur.state === 'ready' ? `<p class="ld-ready">Return to <b>${NPCS[q.giver].name}</b></p><small>${where}</small>` : `<p>${goalWord} <b>${cur.progress} / ${q.goal.count}</b></p><small>${where}${area}</small>`;
      html = `<h3>${q.name}</h3>${line}`;
    }
    if (t.innerHTML !== html) t.innerHTML = html;
  }

  boss(frac, name = '') {
    const b = this.$('[data-boss]');
    b.hidden = frac == null;
    if (frac != null) {
      this.$('[data-boss-fill]').style.width = `${Math.max(0, frac) * 100}%`;
      if (this.$('[data-boss-name]').textContent !== name) this.$('[data-boss-name]').textContent = name;
    }
  }

  /** The party's frames (left, under the hero's bars): name, class, level, health. */
  party(list) {
    const box = this.$('[data-party]');
    const html = list.map((p) => `<div class="ld-pf${p.here ? '' : ' ld-pf--away'}"><b>${esc(p.name)}</b><small>${esc(CLASSES[p.cls]?.name ?? '')} · Lv ${p.level}${p.host ? ' · host' : ''}${p.here ? '' : ` · ${esc(REALMS[p.realm]?.name ?? '')}`}</small><div class="ld-pf__hp"><i style="width:${Math.max(0, Math.min(1, p.hp / p.maxHp)) * 100}%"></i></div></div>`).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  prompt(text) {
    const p = this.$('[data-prompt]');
    p.hidden = !text;
    if (text && p.dataset.t !== text) {
      p.dataset.t = text;
      p.innerHTML = `${kbd('F')} ${text}`;
    }
  }

  resting(on, text = 'Resting by the Hearthlight') {
    const r = this.$('[data-rest]');
    r.hidden = !on;
    if (on && r.textContent !== text) r.textContent = text;
  }

  /** The hit counter: shown from two hits on, bigger and hotter as it climbs. */
  combo(n) {
    const box = this.$('[data-combo]');
    if (!box) return;
    box.hidden = n < 2;
    if (n < 2) return;
    this.$('[data-combo-n]').textContent = String(n);
    box.style.setProperty('--heat', String(Math.min(1, n / 12)));
    box.classList.remove('is-pop');
    void box.offsetWidth;
    box.classList.add('is-pop');
  }

  toast(text, kind = '') {
    const t = el('div', `ld-toast ${kind ? `ld-toast--${kind}` : ''}`);
    t.innerHTML = text;
    this.$('[data-toasts]').append(t);
    while (this.$('[data-toasts]').children.length > 4) this.$('[data-toasts]').firstChild.remove();
    setTimeout(() => t.remove(), 3400);
  }

  log(text) {
    const box = this.$('[data-log]');
    const t = el('div', 'ld-log__line');
    t.innerHTML = text;
    box.append(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.remove(), 4200);
  }

  /** A marker (diamond with an icon) at a screen point; call each frame for the ones visible. */
  marker(key, kind, x, y, label = '', near = false) {
    let m = this.markers.get(key);
    if (!m) {
      m = el('div', 'ld-marker');
      m.innerHTML = '<div class="ld-marker__d"><span></span></div><small></small>';
      this.world.append(m);
      this.markers.set(key, m);
    }
    if (m.dataset.kind !== kind) {
      m.dataset.kind = kind;
      m.querySelector('span').innerHTML = kind === 'shop' ? ICON.bottle : kind === 'smith' ? ICON.sword : kind === 'talk' ? '…' : kind === 'herb' || kind === 'fire' ? ICON.fire : kind === 'portal' ? ICON.portal : kind === 'chest' ? ICON.chest : kind === 'boss' ? '!' : kind;
    }
    const small = m.querySelector('small');
    const want = near ? label : '';
    if (small.textContent !== want) small.textContent = want;
    m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    m._seen = true;
  }

  /** A text label in the world (loot names in their rarity's colour, players' names). */
  label(key, x, y, text, color = '#f4ead2', cls = '') {
    let m = this.markers.get(key);
    if (!m) {
      m = el('div', `ld-wlabel ${cls}`);
      this.world.append(m);
      this.markers.set(key, m);
    }
    if (m.textContent !== text) m.textContent = text;
    m.style.color = color;
    m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    m._seen = true;
  }

  /** A health bar (and name) over a foe or a player. */
  bar(key, x, y, frac, label, { elite = false, shield = 0, ally = false } = {}) {
    let b = this.bars.get(key);
    if (!b) {
      b = el('div', 'ld-ebar');
      b.innerHTML = '<small></small><div><i></i><u></u></div>';
      this.world.append(b);
      this.bars.set(key, b);
    }
    const sm = b.querySelector('small');
    if (sm.textContent !== label) sm.textContent = label;
    b.classList.toggle('ld-ebar--elite', elite);
    b.classList.toggle('ld-ebar--ally', ally);
    b.querySelector('i').style.width = `${Math.max(0, frac) * 100}%`;
    b.querySelector('u').style.width = `${Math.max(0, Math.min(1, shield)) * 100}%`;
    b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    b._seen = true;
  }

  beginWorld() {
    for (const m of this.markers.values()) m._seen = false;
    for (const b of this.bars.values()) b._seen = false;
  }

  endWorld() {
    for (const [k, m] of this.markers) if (!m._seen) {
      m.remove();
      this.markers.delete(k);
    }
    for (const [k, b] of this.bars) if (!b._seen) {
      b.remove();
      this.bars.delete(k);
    }
  }

  number(text, kind, anchor) {
    const n = el('div', `ld-num ld-num--${kind}`, text);
    this.world.append(n);
    this.numbers.push({ n, anchor, t: 0, dx: (Math.random() - 0.5) * 30, crit: kind === 'crit', rot: kind === 'crit' ? (Math.random() - 0.5) * 12 : 0 });
    if (this.numbers.length > 60) this.numbers.shift().n.remove();
  }

  updateNumbers(dt, project) {
    this.numbers = this.numbers.filter((o) => {
      o.t += dt;
      const p = project(o.anchor);
      if (o.t > 1.1 || !p) {
        o.n.remove();
        return false;
      }
      const rise = 40 * (1 - (1 - Math.min(1, o.t / 0.6)) ** 3);
      // A pop: numbers overshoot as they appear (crits more), then settle; a crit is tilted a little.
      const k = Math.min(1, o.t / (o.crit ? 0.16 : 0.1));
      const s = o.t < (o.crit ? 0.16 : 0.1) ? 0.5 + k * (o.crit ? 1.15 : 0.7) : o.crit ? 1.65 - Math.min(0.5, (o.t - 0.16) * 3) : 1.2 - Math.min(0.2, (o.t - 0.1) * 2);
      o.n.style.transform = `translate(${(p.x + o.dx).toFixed(1)}px, ${(p.y - rise).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${o.rot.toFixed(1)}deg)`;
      o.n.style.opacity = o.t > 0.75 ? String(1 - (o.t - 0.75) / 0.35) : '1';
      return true;
    });
  }

  clearWorld() {
    this.world.innerHTML = '';
    this.markers.clear();
    this.bars.clear();
    this.numbers = [];
  }
}

/* ------------------------------------------------------------- dialogue */

export class Dialogue {
  constructor(root, sprites) {
    this.sprites = sprites;
    this.box = el('div', 'ld-dialog');
    this.box.hidden = true;
    this.box.innerHTML = `
      <div class="ld-dialog__face"><canvas width="112" height="112"></canvas></div>
      <div class="ld-dialog__body">
        <div class="ld-dialog__name"><b data-name></b><small data-role></small></div>
        <p data-text></p>
        <span class="ld-dialog__more" aria-hidden="true">▼</span>
      </div>`;
    root.append(this.box);
    this.lines = [];
    this.i = 0;
    this.shown = 0;
    this.done = null;
    this.box.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.advance();
    });
  }

  get open() {
    return !this.box.hidden;
  }

  /** Play lines [{ who, text }]; `done` runs after the last. `hero`: { name, sprite } for the hero's own lines. */
  play(lines, done = null, hero = null) {
    this.lines = lines;
    this.i = 0;
    this.done = done;
    this.hero = hero;
    this.box.hidden = false;
    this.line();
  }

  line() {
    const l = this.lines[this.i];
    const npc = NPCS[l.who];
    this.box.querySelector('[data-name]').textContent = npc ? npc.name : this.hero?.name ?? 'Wayfarer';
    this.box.querySelector('[data-role]').textContent = npc ? npc.role : this.hero?.role ?? '';
    const sprite = npc ? this.sprites.npcs[l.who].front[0] : this.hero?.sprite;
    const c = this.box.querySelector('canvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, 112, 112);
    g.imageSmoothingEnabled = false;
    if (sprite) g.drawImage(portrait(sprite, 112), 0, 0);
    this.text = l.text;
    this.shown = 0;
    this.box.querySelector('[data-text]').textContent = '';
    this.box.classList.remove('ld-dialog--full');
  }

  update(dt) {
    if (!this.open || this.shown >= this.text.length) return;
    this.shown = Math.min(this.text.length, this.shown + dt * 55);
    this.box.querySelector('[data-text]').textContent = this.text.slice(0, Math.floor(this.shown));
    if (this.shown >= this.text.length) this.box.classList.add('ld-dialog--full');
  }

  advance() {
    if (!this.open) return;
    if (this.shown < this.text.length) {
      this.shown = this.text.length;
      this.box.querySelector('[data-text]').textContent = this.text;
      this.box.classList.add('ld-dialog--full');
      return;
    }
    this.i += 1;
    if (this.i < this.lines.length) this.line();
    else {
      this.box.hidden = true;
      const d = this.done;
      this.done = null;
      d?.();
    }
  }

  close() {
    this.box.hidden = true;
    this.done = null;
  }
}

/* --------------------------------------------------------------- panels */

/** A centred panel with a title and a close button; `body` is filled by the caller. */
export function panel(root, cls, title) {
  const wrap = el('div', `ld-overlay ${cls}`);
  wrap.innerHTML = `<section class="ld-panel"><header><h2></h2><button type="button" class="ld-x" data-x aria-label="Close">✕</button></header><div class="ld-panel__body"></div></section>`;
  wrap.querySelector('h2').textContent = title;
  root.append(wrap);
  return { wrap, body: wrap.querySelector('.ld-panel__body'), x: wrap.querySelector('[data-x]') };
}

export const CONTROLS_HTML = `<ul class="ld-controls">
  <li>${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} or arrows: move (relative to the camera)</li>
  <li>${kbd('Shift')}: roll (you can't be hit while rolling)</li>
  <li>${kbd('Space')} or left click: your weapon's attack — press in time to chain the combo</li>
  <li>${kbd('1')}–${kbd('4')}: your class's skills (mana or energy, cooldowns)</li>
  <li>${kbd('5')} health potion · ${kbd('6')} mana potion — no cooldown · ${kbd('7')} eat</li>
  <li>${kbd('F')}: talk, gather, open, travel at a waystone</li>
  <li>${kbd('I')}/${kbd('B')} bag and gear · ${kbd('C')} hero · ${kbd('J')} journal · ${kbd('M')} realms · ${kbd('P')} party</li>
  <li>Drag with the mouse or ${kbd('Q')}/${kbd('E')}: turn the camera; wheel: zoom</li>
</ul>`;

/* ----------------------------------------------------------- the maps */

const AREA_FILL = {
  lanternwood: { camp: '#5a4630', glade: '#1f5c4c', hollow: '#3a3430', ruins: '#4a4a58', waystone: '#2a4a5a', bramble: '#3a4a24', mere: '#1e4050' },
  sunmeadow: { _: '#5a8a3a', hamlet: '#9a8a6a', barley: '#b89a44', grove: '#2e5a24' },
  frostpeak: { _: '#8aa0c0', rimehold: '#6a7488', lake: '#4a80b0', garrison: '#7a8498', throne: '#9ac8ec' },
  emberfall: { _: '#4a3a3a', forge: '#6a4a3a', vents: '#8a3a1a', flows: '#a84a1a', crown: '#5a2a2a' }
};
const GROUND = { lanternwood: ['#0c1a14', '#16281e', '#0a1510'], sunmeadow: ['#2a4a24', '#4a7a34', '#2a5a20'], frostpeak: ['#3a4a64', '#9aa8c0', '#5a6e7a'], emberfall: ['#140c0c', '#2a2226', '#1a1012'] };

/** Draw a realm's ground, places, paths and trees into a 2D context already set to world metres. */
function drawRealm(g, game, realm, view) {
  const L = REALMS[realm].layout;
  const [, open, treeC] = GROUND[realm];
  g.fillStyle = open;
  g.beginPath();
  g.arc(0, 0, L.radius + 2, 0, Math.PI * 2);
  g.fill();
  const fills = AREA_FILL[realm];
  for (const [id, a] of Object.entries(L.areas)) {
    g.beginPath();
    g.arc(a.x, a.z, a.r, 0, Math.PI * 2);
    g.fillStyle = fills[id] ?? fills._ ?? '#2a3a30';
    g.globalAlpha = 0.85;
    g.fill();
    g.globalAlpha = 1;
  }
  if (realm === 'emberfall') {
    g.fillStyle = '#ff6a1a';
    for (const l of L.landmarks) if (l.type === 'lava') {
      g.beginPath();
      g.arc(l.x, l.z, l.r, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.strokeStyle = realm === 'frostpeak' ? '#5a6478' : realm === 'emberfall' ? '#6a5a50' : '#8a6a44';
  g.lineWidth = 3.2;
  g.lineCap = g.lineJoin = 'round';
  for (const p of L.paths) {
    g.beginPath();
    p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
    g.stroke();
  }
  if (realm === game.realm && game.world?.trees) {
    g.fillStyle = treeC;
    for (const t of game.world.trees) {
      if (view && (Math.abs(t.x - view.x) > view.r || Math.abs(t.z - view.z) > view.r)) continue;
      g.beginPath();
      g.arc(t.x, t.z, 1.1, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/**
 * The minimap: the realm round the hero, turned with the camera so ahead is
 * up — paths, places, people with their quest marks, the waystone, unopened
 * chests, loot, foes (hero monsters in gold), the party, what the quest
 * wants, and an arrow on the rim to the quest's target when it is farther
 * than the minimap shows. Every RPG on the platform has one; every realm too.
 */
export function drawMinimap(canvas, game, { range = 34 } = {}) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const C = W / 2;
  const k = (C - 6) / range;
  const h = game.heroPos;
  const yaw = game.camYaw ?? 0;
  const realm = game.realm;
  const L = game.realmDef;
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath();
  g.arc(C, C, C - 4, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = GROUND[realm][0];
  g.fillRect(0, 0, W, W);
  g.translate(C, C);
  g.rotate(yaw);
  g.scale(k, k);
  g.translate(-h.x, -h.z);
  drawRealm(g, game, realm, { x: h.x, z: h.z, r: range * 1.5 });
  const dot = (x, z, r, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fill();
  };
  if (realm === 'lanternwood') dot(0, 0, 1.4, '#ff9a3a');
  // The waystone: a cyan diamond.
  g.fillStyle = '#9ae8ff';
  g.beginPath();
  g.moveTo(L.waystone.x, L.waystone.z - 2);
  g.lineTo(L.waystone.x + 1.4, L.waystone.z);
  g.lineTo(L.waystone.x, L.waystone.z + 2);
  g.lineTo(L.waystone.x - 1.4, L.waystone.z);
  g.fill();
  for (const c of game.world.chests ?? []) if (!c.opened && c.group?.visible !== false) dot(c.x, c.z, 0.9, '#f0c040');
  // Reward chests (from hero monsters and bosses): a small gold square.
  for (const c of game.lootChests ?? []) {
    if (c.opened) continue;
    g.fillStyle = '#3a2408';
    g.fillRect(c.x - 1.3, c.z - 1.3, 2.6, 2.6);
    g.fillStyle = '#ffd24a';
    g.fillRect(c.x - 1, c.z - 1, 2, 2);
  }
  const gatherWanted = game.gatherWanted?.();
  if (gatherWanted) for (const hb of game.world.gather ?? []) if (!hb.taken) dot(hb.x, hb.z, 0.8, '#ff8a2a');
  if (realm === 'lanternwood' && game.state.quests.braziers.state === 'active') for (const b of game.world.braziers) dot(b.x, b.z, 1.1, b.lit ? '#ff8a2a' : '#9a9ab0');
  for (const d of game.drops ?? []) if (d.kind === 'item' && d.entry.base) dot(d.x, d.z, 0.7, game.rarityColor(d.entry.rarity));
  for (const e of game.enemies ?? []) if (e.alive && e.state !== 'burrowed') dot(e.x, e.z, e.def.boss ? 1.8 : e.elite ? 1.3 : 0.85, e.elite || e.def.boss ? '#ffb030' : '#e8504a');
  for (const id of npcsIn(realm)) dot(NPCS[id].x, NPCS[id].z, 0.95, '#f4e6c0');
  for (const p of game.net?.peersHere?.() ?? []) dot(p.dx ?? p.x, p.dz ?? p.z, 1.2, '#6ab8ff');
  g.restore();
  // Marks stay upright: drawn where things are, not turned.
  const toScreen = (x, z) => {
    const dx = x - h.x;
    const dz = z - h.z;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [C + (dx * c - dz * s) * k, C + (dx * s + dz * c) * k];
  };
  g.font = `800 ${Math.round(W / 14)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  for (const id of npcsIn(realm)) {
    const mark = game.markerFor(id);
    if (mark !== '!' && mark !== '?') continue;
    const [x, y] = toScreen(NPCS[id].x, NPCS[id].z);
    if (Math.hypot(x - C, y - C) > C - 10) continue;
    g.fillStyle = '#1a1026';
    g.fillText(mark, x + 1, y - 5);
    g.fillStyle = '#ffd25a';
    g.fillText(mark, x, y - 6);
  }
  const target = game.questTarget?.();
  if (target) {
    const [x, y] = toScreen(target.x, target.z);
    const d = Math.hypot(x - C, y - C);
    g.strokeStyle = '#ffd25a';
    g.fillStyle = '#ffd25a';
    g.lineWidth = W / 90;
    if (d < C - 14) {
      g.beginPath();
      g.arc(x, y, W / 30 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
      g.stroke();
    } else {
      const a = Math.atan2(y - C, x - C);
      const r = C - 14;
      g.save();
      g.translate(C + Math.cos(a) * r, C + Math.sin(a) * r);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.moveTo(0, -W / 28);
      g.lineTo(W / 40, W / 50);
      g.lineTo(-W / 40, W / 50);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
  g.save();
  g.translate(C, C);
  g.rotate(-h.face + Math.PI + yaw);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#1a1026';
  g.lineWidth = W / 120;
  g.beginPath();
  g.moveTo(0, -W / 26);
  g.lineTo(W / 36, W / 36);
  g.lineTo(0, W / 70);
  g.lineTo(-W / 36, W / 36);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(232, 196, 120, 0.9)';
  g.lineWidth = W / 60;
  g.beginPath();
  g.arc(C, C, C - 4, 0, Math.PI * 2);
  g.stroke();
}

/** A whole realm from above (the realm map): places named, people, the waystone, the quest, the hero. */
export function drawMap(canvas, game, realm = game.realm) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const L = REALMS[realm].layout;
  const R = L.radius + 10;
  const k = W / (R * 2);
  g.fillStyle = '#0b1220';
  g.fillRect(0, 0, W, W);
  g.save();
  g.translate(W / 2, W / 2);
  g.scale(k, k);
  g.fillStyle = GROUND[realm][0];
  g.beginPath();
  g.arc(0, 0, L.radius + 8, 0, Math.PI * 2);
  g.fill();
  drawRealm(g, game, realm, null);
  const sq = (x, z, s, c) => {
    g.fillStyle = c;
    g.fillRect(x - s / 2, z - s / 2, s, s);
  };
  sq(L.waystone.x, L.waystone.z, 4, '#9ae8ff');
  for (const id of npcsIn(realm)) sq(NPCS[id].x, NPCS[id].z, 2.4, '#f4e6c0');
  if (realm === game.realm) {
    for (const c of game.world.chests ?? []) if (!c.opened) sq(c.x, c.z, 2.4, '#f0c040');
    for (const c of game.lootChests ?? []) if (!c.opened) sq(c.x, c.z, 2.6, '#ffd24a');
    for (const p of game.net?.peersHere?.() ?? []) sq(p.x, p.z, 3, '#6ab8ff');
  }
  g.restore();
  const at = (x, z) => [W / 2 + x * k, W / 2 + z * k];
  g.textAlign = 'center';
  g.font = '700 13px Georgia, serif';
  for (const a of Object.values(L.areas)) {
    const [x, y] = at(a.x, a.z);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillText(a.name, x + 1, y + a.r * k + 15);
    g.fillStyle = '#f4e6c0';
    g.fillText(a.name, x, y + a.r * k + 14);
  }
  if (realm !== game.realm) return;
  g.font = '600 12px system-ui, sans-serif';
  for (const id of npcsIn(realm)) {
    const mark = game.markerFor(id);
    if (mark !== '!' && mark !== '?') continue;
    const [x, y] = at(NPCS[id].x, NPCS[id].z);
    g.fillStyle = '#ffd25a';
    g.fillText(mark, x, y - 6);
  }
  const target = game.questTarget();
  if (target) {
    const [x, y] = at(target.x, target.z);
    g.strokeStyle = '#ffd25a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 10 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
    g.stroke();
  }
  const [hx, hy] = at(game.heroPos.x, game.heroPos.z);
  g.save();
  g.translate(hx, hy);
  g.rotate(-game.heroPos.face + Math.PI);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#1a1026';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -8);
  g.lineTo(6, 7);
  g.lineTo(0, 3);
  g.lineTo(-6, 7);
  g.closePath();
  g.stroke();
  g.fill();
  g.restore();
}

/* --------------------------------------------------------------- title */

/** Title screen markup: name, tagline, the four classes, the looks of the chosen one, a turning preview, buttons. */
export function titleHtml(save) {
  const cont = save ? `<button type="button" class="ld-btn ld-btn--big" data-continue>Continue <small>${esc(CLASSES[save.hero.cls]?.name)} · Level ${save.hero.level} · ${esc(REALMS[save.realm]?.name ?? 'Lanternwood')}</small></button>` : '';
  return `<div class="ld-title">
    <button type="button" class="ld-x ld-title__x" data-close aria-label="Leave Lanternwood">✕</button>
    <h1>Lanternwood</h1>
    <p class="ld-title__tag">The camp's lanterns are going out. Something in the woods is drinking the light — and the old waystone hums with other worlds.</p>
    <div class="ld-pick">
      <div class="ld-classes" role="radiogroup" aria-label="Your class">${CLASS_ORDER.map((id) => {
        const c = CLASSES[id];
        return `<button type="button" class="ld-class" role="radio" data-class="${id}"><b>${c.name}</b><small class="ld-class__role">${c.role}</small><span>${c.blurb}</span><ul>${c.skills.map((s, i) => `<li><kbd>${i + 1}</kbd>${SKILLS[s].name}</li>`).join('')}</ul></button>`;
      }).join('')}</div>
      <div class="ld-pick__hero"><canvas class="ld-preview" width="300" height="340" data-preview></canvas><div class="ld-looks" role="radiogroup" aria-label="Your look" data-looks></div></div>
    </div>
    <div class="ld-title__go">${cont}<button type="button" class="ld-btn ld-btn--big ld-btn--go" data-new>New journey</button></div>
    <p class="ld-title__keys">${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} move · ${kbd('Space')} attack · ${kbd('1')}–${kbd('4')} skills · ${kbd('F')} talk · ${kbd('P')} play together</p>
  </div>`;
}

/** The look buttons for a class (portraits drawn in). */
export function fillLooks(box, cls, chosen, onPick) {
  box.innerHTML = LOOKS[cls].map((l) => `<button type="button" class="ld-look" role="radio" data-look="${l.id}" aria-checked="${l.id === chosen}"><canvas width="64" height="64"></canvas><b>${esc(l.name)}</b></button>`).join('');
  for (const b of box.querySelectorAll('[data-look]')) {
    const g = b.querySelector('canvas').getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(portrait(heroSpriteFor(b.dataset.look, null), 64), 0, 0);
    b.addEventListener('click', () => onPick(b.dataset.look));
  }
}

export { statsOf, lookById };
