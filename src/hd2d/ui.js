/**
 * Lanternwood's screen furniture, in the HD-2D style: a slim top bar (HP,
 * MP, XP, crystals, gold), diamond markers over people, floating damage
 * numbers, enemy health bars, a quest tracker, the action bar and the key
 * hints along the bottom, plus the dialogue box, shop, info panel, map,
 * pause, title and ending screens. Plain DOM; the game calls in.
 */
import { HERO_LOOKS, HERO_LOOK_ORDER, NPCS, QUESTS, SHOP, WORLD, ABILITIES, heroStats, xpToNext, currentQuest } from './rules.js';
import { portrait } from './sprites.js';

export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const ICON = {
  gold: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="#f0c040" stroke="#7a4a10" stroke-width="1.4"/><path d="M6 5.5h3.2a1.6 1.6 0 010 3.2H6.6M6.6 8.7h3a1.6 1.6 0 010 3.2H6V5.5" fill="none" stroke="#8c5a14" stroke-width="1.1"/></svg>',
  crystal: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l4.5 4.8L8 14.5 3.5 6.3z" fill="#7fe0ff" stroke="#1c4a7a" stroke-width="1.2"/><path d="M8 1.5v13M3.5 6.3h9" stroke="#d8f6ff" stroke-width="0.8" opacity=".7"/></svg>',
  bottle: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 1.8h3.4v3.1l3 3.6a3.9 3.9 0 01-3 6.3H6.3a3.9 3.9 0 01-3-6.3l3-3.6z" fill="#ff7a8a" stroke="#4a1020" stroke-width="1.2"/><path d="M5 9.5h6" stroke="#ffd0d8" stroke-width="1"/></svg>',
  mana: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 1.8h3.4v3.1l3 3.6a3.9 3.9 0 01-3 6.3H6.3a3.9 3.9 0 01-3-6.3l3-3.6z" fill="#7aa8ff" stroke="#10204a" stroke-width="1.2"/><path d="M5 9.5h6" stroke="#d0e0ff" stroke-width="1"/></svg>',
  fire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c1 3 4.5 4.2 4.5 8a4.5 4.5 0 01-9 0c0-2 1-3 2-4 0 1.5.8 2.4 1.5 2.4C7 5.5 7 3.5 8 1.5z" fill="#ff8a2a" stroke="#6e2a10" stroke-width="1.1"/><path d="M8 8.5c.8 1 1.8 1.6 1.8 3a1.8 1.8 0 01-3.6 0c0-1 .8-1.8 1.8-3z" fill="#ffe26b"/></svg>',
  whirl: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2a5.8 5.8 0 105.8 5.8" fill="none" stroke="#bfe8ff" stroke-width="1.8" stroke-linecap="round"/><path d="M8 5a3 3 0 103 3" fill="none" stroke="#7fd6ff" stroke-width="1.6" stroke-linecap="round"/><path d="M13.8 8l-1.6-2.4M13.8 8l1.4-2.4" stroke="#bfe8ff" stroke-width="1.4" stroke-linecap="round"/></svg>',
  sword: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 2.5L6 10l-1.2-.2L5 8.5l7.5-7.5z" fill="#cfe2ea" stroke="#34435a" stroke-width="1"/><path d="M3 9.5l3.5 3.5M4.2 11.8l-2 2" stroke="#c48a1c" stroke-width="1.6" stroke-linecap="round"/></svg>'
};
export { ICON };

const kbd = (k) => `<kbd>${k}</kbd>`;
const fmtTime = (s) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}h ` : ''}${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;

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
            <div class="ld-bar ld-bar--mp"><i data-mp-fill></i><span data-mp>40 / 40</span></div>
            <div class="ld-bar ld-bar--xp"><i data-xp-fill></i></div>
          </div>
        </div>
        <div class="ld-top__area" data-area>Lanternwood Camp</div>
        <div class="ld-top__res">
          <span class="ld-res" title="Crystals">${ICON.crystal}<b data-crystals>0</b></span>
          <span class="ld-res" title="Gold">${ICON.gold}<b data-gold>0</b></span>
        </div>
      </div>
      <div class="ld-mini" title="The map round you (M for the whole map)"><canvas width="360" height="360" data-mini></canvas><span class="ld-mini__n" data-mini-n>N</span></div>
      <div class="ld-tracker" data-tracker></div>
      <div class="ld-boss" data-boss hidden><span>The Lampwight</span><div class="ld-boss__bar"><i data-boss-fill></i></div></div>
      <div class="ld-world" data-world></div>
      <div class="ld-prompt" data-prompt hidden></div>
      <div class="ld-combo" data-combo hidden><b data-combo-n>2</b><span>HITS</span></div>
      <div class="ld-toasts" data-toasts></div>
      <div class="ld-log" data-log></div>
      <div class="ld-rest" data-rest hidden>Resting by the Hearthlight</div>
      <div class="ld-actions" data-actions></div>
      <div class="ld-keys">
        <span>${kbd('Esc')} Pause</span><span>${kbd('M')} Map</span><span>${kbd('F')} Talk</span><span>${kbd('I')} Info</span>
        <span>${kbd('Space')} Attack</span><span>${kbd('Shift')} Roll</span><span>${kbd('Q')}${kbd('E')} Turn</span>
      </div>`;
    const $ = (s) => this.layer.querySelector(s);
    this.$ = $;
    this.face = $('.ld-top__face');
    this.world = $('[data-world]');
    this.markers = new Map();
    this.bars = new Map();
    this.numbers = [];
    // The action bar.
    const actions = $('[data-actions]');
    this.slots = {};
    for (const [key, id, icon, label] of [['1', 'fireball', ICON.fire, 'Fireball'], ['2', 'whirl', ICON.whirl, 'Whirl'], ['3', 'hp', ICON.bottle, 'Health potion'], ['4', 'mp', ICON.mana, 'Mana potion']]) {
      const s = el('div', 'ld-slot');
      s.dataset.slot = id;
      s.title = label;
      s.innerHTML = `${icon}<kbd>${key}</kbd><em data-n></em><i class="ld-slot__cd"></i>`;
      actions.append(s);
      this.slots[id] = s;
    }
  }

  show(on) {
    this.layer.hidden = !on;
  }

  setLook(look) {
    const g = this.face.getContext('2d');
    g.clearRect(0, 0, 40, 40);
    g.imageSmoothingEnabled = false;
    g.drawImage(portrait(this.sprites.hero[look].front[0], 40), 0, 0);
  }

  /** Bars, numbers and the action bar from the hero (cheap: only writes what changed). */
  stats(hero, cds) {
    const s = heroStats(hero.level, hero.bonus);
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
      const em = e.querySelector('[data-n]');
      if (em.textContent !== String(n)) em.textContent = n;
      e.style.setProperty('--cd', cd);
      e.classList.toggle('ld-slot--off', !usable);
    };
    slot('fireball', `${ABILITIES.fireball.mp}`, cds.fireball, hero.mp >= ABILITIES.fireball.mp);
    slot('whirl', `${ABILITIES.whirl.mp}`, cds.whirl, hero.mp >= ABILITIES.whirl.mp);
    slot('hp', `×${hero.potions.hp}`, 0, hero.potions.hp > 0);
    slot('mp', `×${hero.potions.mp}`, 0, hero.potions.mp > 0);
  }

  area(name) {
    const n = this.$('[data-area]');
    if (n.textContent !== name) {
      n.textContent = name;
      n.classList.remove('ld-flash');
      void n.offsetWidth;
      n.classList.add('ld-flash');
    }
  }

  tracker(log) {
    const cur = currentQuest(log);
    const t = this.$('[data-tracker]');
    if (!cur) {
      const next = QUESTS.find((q) => log[q.id].state === 'available');
      const html = next ? `<h3>Next</h3><p>Speak with <b>${NPCS[next.giver].name}</b> ${'<span class="ld-mark ld-mark--sm">!</span>'}</p>` : log.lampwight.state === 'done' ? '<h3>Lanternwood</h3><p>Every lantern burns. Explore as you like.</p>' : '';
      if (t.innerHTML !== html) t.innerHTML = html;
      return;
    }
    const q = cur.quest;
    const goalWord = { herb: 'Ember-herbs', slime: 'Gloomslimes', wolf: 'Ashwolves', brazier: 'Braziers lit', lampwight: 'The Lampwight' }[q.goal.target];
    const line = cur.state === 'ready' ? `<p class="ld-ready">Return to <b>${NPCS[q.giver].name}</b></p>` : `<p>${goalWord} <b>${cur.progress} / ${q.goal.count}</b></p><small>${WORLD.areas[q.area].name}</small>`;
    const html = `<h3>${q.name}</h3>${line}`;
    if (t.innerHTML !== html) t.innerHTML = html;
  }

  boss(frac) {
    const b = this.$('[data-boss]');
    b.hidden = frac == null;
    if (frac != null) this.$('[data-boss-fill]').style.width = `${Math.max(0, frac) * 100}%`;
  }

  prompt(text) {
    const p = this.$('[data-prompt]');
    p.hidden = !text;
    if (text && p.dataset.t !== text) {
      p.dataset.t = text;
      p.innerHTML = `${kbd('F')} ${text}`;
    }
  }

  resting(on) {
    this.$('[data-rest]').hidden = !on;
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
    setTimeout(() => t.remove(), 3200);
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
      m.querySelector('span').innerHTML = kind === 'shop' ? ICON.bottle : kind === 'talk' ? '…' : kind === 'herb' ? ICON.fire : kind === 'fire' ? ICON.fire : kind === 'boss' ? '!' : kind;
    }
    m.querySelector('small').textContent = near ? label : '';
    m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    m._seen = true;
  }

  /** An enemy health bar (and level) over its head. */
  bar(key, x, y, frac, label) {
    let b = this.bars.get(key);
    if (!b) {
      b = el('div', 'ld-ebar');
      b.innerHTML = '<small></small><div><i></i></div>';
      this.world.append(b);
      this.bars.set(key, b);
    }
    b.querySelector('small').textContent = label;
    b.querySelector('i').style.width = `${Math.max(0, frac) * 100}%`;
    b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    b._seen = true;
  }

  /** Start of a frame: everything projected is unseen until drawn again. */
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

  /** A floating number (damage, heal, gold). World-anchored: the game passes a projector. */
  number(text, kind, anchor) {
    const n = el('div', `ld-num ld-num--${kind}`, text);
    this.world.append(n);
    this.numbers.push({ n, anchor, t: 0, dx: (Math.random() - 0.5) * 30 });
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
      const s = o.t < 0.1 ? 0.6 + o.t * 6 : 1;
      o.n.style.transform = `translate(${(p.x + o.dx).toFixed(1)}px, ${(p.y - rise).toFixed(1)}px) scale(${s})`;
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

  /** Play lines [{ who, text }]; `done` runs after the last. `look`: the hero's look for 'hero' lines. */
  play(lines, done = null, look = 'ember') {
    this.lines = lines;
    this.i = 0;
    this.done = done;
    this.look = look;
    this.box.hidden = false;
    this.line();
  }

  line() {
    const l = this.lines[this.i];
    const npc = NPCS[l.who];
    this.box.querySelector('[data-name]').textContent = npc ? npc.name : 'Wayfarer';
    this.box.querySelector('[data-role]').textContent = npc ? npc.role : HERO_LOOKS[this.look]?.name ?? '';
    const sprite = npc ? this.sprites.npcs[l.who].front[0] : this.sprites.hero[this.look].front[0];
    const c = this.box.querySelector('canvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, 112, 112);
    g.imageSmoothingEnabled = false;
    g.drawImage(portrait(sprite, 112), 0, 0);
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

export function shopHtml(hero) {
  return `<p class="ld-muted">Pell spreads a blanket of wares. ${ICON.gold}<b>${hero.gold}</b> ${ICON.crystal}<b>${hero.crystals}</b></p>
  <ul class="ld-shop">${SHOP.map((s, i) => {
    const owned = s.id === 'hp' ? `You have ${hero.potions.hp}` : s.id === 'mp' ? `You have ${hero.potions.mp}` : s.id === 'charm-hp' ? `${hero.bonus.hp} / 3 worn` : `${hero.bonus.atk} / 3 honed`;
    const cost = s.currency === 'gold' ? `${ICON.gold}${s.price}` : `${ICON.crystal}${s.price}`;
    const can = hero[s.currency] >= s.price && !(s.id === 'charm-hp' && hero.bonus.hp >= 3) && !(s.id === 'charm-atk' && hero.bonus.atk >= 3);
    return `<li><span class="ld-shop__icon">${s.id === 'mp' ? ICON.mana : s.id === 'hp' ? ICON.bottle : s.id === 'charm-hp' ? ICON.fire : ICON.sword}</span>
      <div><b>${s.name}</b><small>${s.note} ${owned}.</small></div>
      <button type="button" class="ld-btn" data-buy="${s.id}" ${can ? '' : 'disabled'}>${kbd(String(i + 1))} ${cost}</button></li>`;
  }).join('')}</ul>`;
}

export function infoHtml(game) {
  const h = game.hero;
  const s = heroStats(h.level, h.bonus);
  const states = { locked: 'Not yet', available: 'Waiting', active: 'In progress', ready: 'Hand in', done: 'Done' };
  return `<div class="ld-info">
    <div><h3>${HERO_LOOKS[h.look].name}, the Wayfarer</h3>
      <dl class="ld-stats">
        <dt>Level</dt><dd>${h.level}</dd>
        <dt>Experience</dt><dd>${h.xp} / ${xpToNext(h.level)}</dd>
        <dt>Health</dt><dd>${Math.ceil(h.hp)} / ${s.maxHp}</dd>
        <dt>Mana</dt><dd>${Math.floor(h.mp)} / ${s.maxMp}</dd>
        <dt>Attack</dt><dd>${s.atk}</dd>
        <dt>Defence</dt><dd>${s.def}</dd>
        <dt>Foes driven off</dt><dd>${h.kills}</dd>
        <dt>Falls</dt><dd>${h.deaths}</dd>
        <dt>Time</dt><dd>${fmtTime(game.state.time)}</dd>
      </dl></div>
    <div><h3>Quests</h3><ul class="ld-qlog">${QUESTS.filter((q) => game.state.quests[q.id].state !== 'locked').map((q) => {
      const e = game.state.quests[q.id];
      return `<li class="ld-q--${e.state}"><b>${q.name}</b><span>${states[e.state]}${e.state === 'active' ? ` · ${e.progress}/${q.goal.count}` : ''}</span><small>${q.brief}</small></li>`;
    }).join('') || '<li>No quests yet.</li>'}</ul></div>
    <div><h3>Bag</h3><ul class="ld-bag">
      <li>${ICON.bottle}<span>Health potions</span><b>${h.potions.hp}</b></li>
      <li>${ICON.mana}<span>Mana potions</span><b>${h.potions.mp}</b></li>
      <li>${ICON.gold}<span>Gold</span><b>${h.gold}</b></li>
      <li>${ICON.crystal}<span>Crystals</span><b>${h.crystals}</b></li>
      <li>${ICON.fire}<span>Ember-herbs</span><b>${h.herbs}</b></li>
      <li>${ICON.fire}<span>Hearth charms</span><b>${h.bonus.hp}</b></li>
      <li>${ICON.sword}<span>Ember edges</span><b>${h.bonus.atk}</b></li>
    </ul></div>
  </div>`;
}

export const CONTROLS_HTML = `<ul class="ld-controls">
  <li>${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} or arrows: move (relative to the camera)</li>
  <li>${kbd('Shift')}: roll (you can't be hit while rolling)</li>
  <li>${kbd('Space')} or left click: sword slash</li>
  <li>${kbd('1')} fireball · ${kbd('2')} whirl (cost mana)</li>
  <li>${kbd('3')} health potion · ${kbd('4')} mana potion — no cooldown</li>
  <li>${kbd('F')}: talk, gather, light · ${kbd('I')} info · ${kbd('M')} map</li>
  <li>Drag with the mouse or ${kbd('Q')}/${kbd('E')}: turn the camera; wheel: zoom</li>
</ul>`;

/** The map overlay: the woods from above, the hero, the people and the quest marker. */
export function drawMap(canvas, game) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const R = 82;
  const k = W / (R * 2);
  const at = (x, z) => [(x + R) * k, (z + R) * k];
  g.fillStyle = '#0b1220';
  g.fillRect(0, 0, W, W);
  g.save();
  g.beginPath();
  g.arc(W / 2, W / 2, WORLD.radius * k + 6, 0, Math.PI * 2);
  g.fillStyle = '#16281e';
  g.fill();
  g.clip();
  g.fillStyle = '#0e1d16';
  for (const t of game.world.trees) {
    const [x, y] = at(t.x, t.z);
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  g.strokeStyle = '#6a5236';
  g.lineWidth = 3.2 * k;
  g.lineCap = g.lineJoin = 'round';
  for (const p of WORLD.paths) {
    g.beginPath();
    p.forEach(([x, z], i) => (i ? g.lineTo(...at(x, z)) : g.moveTo(...at(x, z))));
    g.stroke();
  }
  const fills = { camp: '#5a4630', glade: '#1f5c4c', hollow: '#3a3430', ruins: '#4a4a58' };
  for (const [id, a] of Object.entries(WORLD.areas)) {
    const [x, y] = at(a.x, a.z);
    g.beginPath();
    g.arc(x, y, a.r * k, 0, Math.PI * 2);
    g.fillStyle = fills[id];
    g.globalAlpha = 0.85;
    g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  // The fire, the people.
  const [fx, fy] = at(0, 0);
  g.fillStyle = '#ff9a3a';
  g.beginPath();
  g.arc(fx, fy, 5, 0, Math.PI * 2);
  g.fill();
  g.font = '600 12px system-ui, sans-serif';
  g.textAlign = 'center';
  for (const [id, n] of Object.entries(NPCS)) {
    const [x, y] = at(n.x, n.z);
    g.fillStyle = '#f4e6c0';
    g.fillRect(x - 2.5, y - 2.5, 5, 5);
    const mark = game.markerFor(id);
    if (mark === '!' || mark === '?') {
      g.fillStyle = '#ffd25a';
      g.fillText(mark, x, y - 6);
    }
  }
  // Herbs and braziers still to do, when they matter.
  if (game.state.quests.embers.state === 'active') {
    g.fillStyle = '#ff8a2a';
    for (const h of game.world.herbs) if (!h.taken) g.fillRect(...at(h.x, h.z).map((v) => v - 2), 4, 4);
  }
  if (game.state.quests.braziers.state === 'active') {
    for (const b of game.world.braziers) {
      g.fillStyle = b.lit ? '#ff8a2a' : '#8a8aa0';
      g.fillRect(...at(b.x, b.z).map((v) => v - 3), 6, 6);
    }
  }
  // Area names.
  g.font = '700 13px Georgia, serif';
  for (const a of Object.values(WORLD.areas)) {
    const [x, y] = at(a.x, a.z);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillText(a.name, x + 1, y + a.r * k + 15);
    g.fillStyle = '#f4e6c0';
    g.fillText(a.name, x, y + a.r * k + 14);
  }
  // The quest target: a pulsing star.
  const target = game.questTarget();
  if (target) {
    const [x, y] = at(target.x, target.z);
    g.strokeStyle = '#ffd25a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 10 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
    g.stroke();
  }
  // The hero: an arrow the way they face.
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

/** Title screen markup: name, tagline, look picker, buttons. */
export function titleHtml(save) {
  const cont = save ? `<button type="button" class="ld-btn ld-btn--big" data-continue>Continue <small>Level ${save.hero.level} · ${(QUESTS.find((q) => ['active', 'ready', 'available'].includes(save.quests[q.id].state)) ?? QUESTS[QUESTS.length - 1]).name}</small></button>` : '';
  return `<div class="ld-title">
    <button type="button" class="ld-x ld-title__x" data-close aria-label="Leave Lanternwood">✕</button>
    <h1>Lanternwood</h1>
    <p class="ld-title__tag">The camp's lanterns are going out. Something in the woods is drinking the light.</p>
    <div class="ld-looks" role="radiogroup" aria-label="Your look">${HERO_LOOK_ORDER.map((id) => `<button type="button" class="ld-look" role="radio" data-look="${id}"><canvas width="88" height="104"></canvas><b>${HERO_LOOKS[id].name}</b><small>${HERO_LOOKS[id].blurb}</small></button>`).join('')}</div>
    <div class="ld-title__go">${cont}<button type="button" class="ld-btn ld-btn--big ld-btn--go" data-new>New journey</button></div>
    <p class="ld-title__keys">${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} move · ${kbd('Space')} attack · ${kbd('F')} talk · drag to turn</p>
  </div>`;
}

/**
 * The minimap: the woods round the hero, turned with the camera so ahead is
 * up — paths, places, the camp's people with their quest marks, foes near
 * by, what the quest wants, and an arrow on the rim to the quest's target
 * when it is farther than the minimap shows. Every RPG on the platform has one.
 */
export function drawMinimap(canvas, game, { range = 34 } = {}) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const C = W / 2;
  const k = (C - 6) / range;
  const h = game.heroPos;
  const yaw = game.camYaw ?? 0;
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath();
  g.arc(C, C, C - 4, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#0c1a14';
  g.fillRect(0, 0, W, W);
  g.translate(C, C);
  g.rotate(yaw);
  g.scale(k, k);
  g.translate(-h.x, -h.z);
  // The open ground inside the woods, the places, the paths, the trees.
  g.fillStyle = '#16281e';
  g.beginPath();
  g.arc(0, 0, WORLD.radius + 2, 0, Math.PI * 2);
  g.fill();
  const fills = { camp: '#5a4630', glade: '#1f5c4c', hollow: '#3a3430', ruins: '#4a4a58' };
  for (const [id, a] of Object.entries(WORLD.areas)) {
    g.beginPath();
    g.arc(a.x, a.z, a.r, 0, Math.PI * 2);
    g.fillStyle = fills[id] ?? '#2a3a30';
    g.fill();
  }
  g.strokeStyle = '#8a6a44';
  g.lineWidth = 3.2;
  g.lineCap = g.lineJoin = 'round';
  for (const p of WORLD.paths) {
    g.beginPath();
    p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
    g.stroke();
  }
  g.fillStyle = '#081510';
  for (const t of game.world.trees) {
    if (Math.abs(t.x - h.x) > range * 1.5 || Math.abs(t.z - h.z) > range * 1.5) continue;
    g.beginPath();
    g.arc(t.x, t.z, 1.1, 0, Math.PI * 2);
    g.fill();
  }
  const dot = (x, z, r, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fill();
  };
  dot(0, 0, 1.4, '#ff9a3a');
  if (game.state.quests.embers.state === 'active') for (const hb of game.world.herbs) if (!hb.taken) dot(hb.x, hb.z, 0.8, '#ff8a2a');
  if (game.state.quests.braziers.state === 'active') for (const b of game.world.braziers) dot(b.x, b.z, 1.1, b.lit ? '#ff8a2a' : '#9a9ab0');
  for (const e of game.enemies ?? []) if (e.alive) dot(e.x, e.z, e.kind === 'lampwight' ? 1.6 : 0.85, '#e8504a');
  for (const [id, n] of Object.entries(NPCS)) dot(n.x, n.z, 0.95, '#f4e6c0');
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
  for (const [id, n] of Object.entries(NPCS)) {
    const mark = game.markerFor(id);
    if (mark !== '!' && mark !== '?') continue;
    const [x, y] = toScreen(n.x, n.z);
    if (Math.hypot(x - C, y - C) > C - 10) continue;
    g.fillStyle = '#1a1026';
    g.fillText(mark, x + 1, y - 5);
    g.fillStyle = '#ffd25a';
    g.fillText(mark, x, y - 6);
  }
  // The quest's target: a ring if it is in view, else an arrow on the rim pointing to it.
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
  // The hero, in the middle: an arrow the way they face.
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
  // The rim.
  g.strokeStyle = 'rgba(232, 196, 120, 0.9)';
  g.lineWidth = W / 60;
  g.beginPath();
  g.arc(C, C, C - 4, 0, Math.PI * 2);
  g.stroke();
}
