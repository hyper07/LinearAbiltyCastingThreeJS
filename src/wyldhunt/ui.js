/**
 * Wyldhunt's screens: the loading veil, the start screen (pick a look), the
 * HUD — health and stamina, the party, the weapon with its sharpness or its
 * charge, the item bar, the monster's name when it is spotted, the circular
 * minimap, the gather log and prompt, subtitles, a controls hint that fades
 * — the field bag, the credits and the pause menu. Icons are drawn here.
 */
import { EXTENT, AREAS, areaAt, CAMP } from './map.js';
import { LOOKS } from './cast.js';
import { ITEMS, SHARPNESS, SHARP_MAX, sharpnessLevel, BAG_SIZE } from './rules.js';
import { PACKS, OWN } from './credits.js';
import { heightAt, waterAt, pathDistance } from './heights.js';

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ------------------------------------------------------------------ icons */

const iconCache = new Map();
/** A small painted icon for an item or a weapon. */
export function icon(kind, color = '#ccc', size = 64) {
  const key = `${kind}|${color}|${size}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.scale(size / 64, size / 64);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.lineWidth = 3;
  g.fillStyle = color;
  const path = (f) => {
    g.beginPath();
    f();
    g.fill();
    g.stroke();
  };
  switch (kind) {
    case 'potion':
      path(() => {
        g.moveTo(-6, -22);
        g.lineTo(6, -22);
        g.lineTo(6, -10);
        g.bezierCurveTo(22, -4, 22, 24, 0, 24);
        g.bezierCurveTo(-22, 24, -22, -4, -6, -10);
        g.closePath();
      });
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.beginPath();
      g.ellipse(-6, 6, 4, 8, 0.4, 0, Math.PI * 2);
      g.fill();
      break;
    case 'stone':
      path(() => g.ellipse(0, 4, 22, 11, -0.3, 0, Math.PI * 2));
      break;
    case 'ration':
      path(() => g.roundRect(-20, -12, 40, 24, 6));
      g.strokeStyle = '#6a4a20';
      g.beginPath();
      g.moveTo(-6, -12);
      g.lineTo(-6, 12);
      g.moveTo(6, -12);
      g.lineTo(6, 12);
      g.stroke();
      break;
    case 'herb':
      for (const a of [-0.7, 0, 0.7]) {
        g.save();
        g.rotate(a);
        path(() => g.ellipse(0, -10, 8, 15, 0, 0, Math.PI * 2));
        g.restore();
      }
      break;
    case 'ore':
      path(() => {
        g.moveTo(-20, 12);
        g.lineTo(-14, -10);
        g.lineTo(2, -18);
        g.lineTo(18, -6);
        g.lineTo(20, 14);
        g.closePath();
      });
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.fillRect(-6, -8, 6, 6);
      break;
    case 'bug':
      path(() => g.ellipse(0, 4, 12, 16, 0, 0, Math.PI * 2));
      path(() => g.arc(0, -14, 7, 0, Math.PI * 2));
      g.beginPath();
      g.moveTo(0, -10);
      g.lineTo(0, 20);
      g.stroke();
      break;
    case 'bone':
      g.lineWidth = 10;
      g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.beginPath();
      g.moveTo(-16, 16);
      g.lineTo(16, -16);
      g.stroke();
      g.lineWidth = 6;
      g.strokeStyle = color;
      g.stroke();
      for (const [x, y] of [[-16, 16], [16, -16]]) path(() => g.arc(x, y, 6, 0, Math.PI * 2));
      break;
    case 'scale':
      path(() => {
        g.moveTo(0, -22);
        g.bezierCurveTo(22, -14, 18, 14, 0, 22);
        g.bezierCurveTo(-18, 14, -22, -14, 0, -22);
      });
      break;
    case 'hide':
      path(() => {
        g.moveTo(-20, -14);
        g.quadraticCurveTo(0, -24, 20, -14);
        g.lineTo(16, 18);
        g.quadraticCurveTo(0, 10, -16, 18);
        g.closePath();
      });
      break;
    case 'fang':
    case 'horn':
      path(() => {
        g.moveTo(-12, 20);
        g.quadraticCurveTo(-8, -10, 14, -22);
        g.quadraticCurveTo(2, -4, 8, 20);
        g.closePath();
      });
      break;
    case 'club':
      path(() => g.arc(0, 0, 14, 0, Math.PI * 2));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        path(() => {
          g.moveTo(Math.cos(a - 0.3) * 13, Math.sin(a - 0.3) * 13);
          g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
          g.lineTo(Math.cos(a + 0.3) * 13, Math.sin(a + 0.3) * 13);
        });
      }
      break;
    case 'meat':
      path(() => g.ellipse(4, -2, 16, 13, 0.5, 0, Math.PI * 2));
      g.fillStyle = '#e8dcc0';
      path(() => g.roundRect(-22, 8, 16, 6, 3));
      break;
    case 'blade':
      g.rotate(-0.8);
      path(() => {
        g.moveTo(-5, 14);
        g.lineTo(-6, -24);
        g.lineTo(0, -30);
        g.lineTo(6, -24);
        g.lineTo(5, 14);
        g.closePath();
      });
      g.fillStyle = '#8a6a3a';
      path(() => g.rect(-12, 14, 24, 5));
      path(() => g.rect(-3, 19, 6, 12));
      break;
    case 'bow':
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.beginPath();
      g.arc(-14, 0, 28, -1.1, 1.1);
      g.stroke();
      g.lineWidth = 4;
      g.strokeStyle = color;
      g.stroke();
      g.lineWidth = 1.5;
      g.strokeStyle = '#eee';
      g.beginPath();
      g.moveTo(-14 + Math.cos(-1.1) * 28, Math.sin(-1.1) * 28);
      g.lineTo(-14 + Math.cos(1.1) * 28, Math.sin(1.1) * 28);
      g.stroke();
      break;
    default:
      path(() => g.arc(0, 0, 14, 0, Math.PI * 2));
  }
  iconCache.set(key, c);
  return c;
}

const itemIcon = (id, size = 64) => icon(ITEMS[id]?.icon ?? 'x', ITEMS[id]?.color ?? '#ccc', size);
const cloneCanvas = (src) => {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
};

/* ------------------------------------------------------------------ loading and start */

export class Loading {
  constructor(host) {
    this.el = el('div', 'wh-load', `<div class="wh-load__box"><div class="wh-title">WYLDHUNT</div><div class="wh-sub">Mistfall Gorge</div><div class="wh-bar"><i></i></div><div class="wh-load__label">Waking</div></div>`);
    host.append(this.el);
  }

  set(label, k) {
    this.el.querySelector('i').style.width = `${Math.round(k * 100)}%`;
    this.el.querySelector('.wh-load__label').textContent = label;
  }

  hide() {
    this.el.style.opacity = '0';
    setTimeout(() => this.el.remove(), 900);
  }
}

export class StartScreen {
  constructor(host, { picked, onPick, onBegin, onCredits, onClose }) {
    this.el = el('div', 'wh-start');
    const looks = LOOKS.map((l) => `<button class="wh-look" data-look="${l.id}" aria-pressed="${l.id === picked}"><i style="background:${l.accent}"></i><div><b>${esc(l.name)}</b><span>${esc(l.blurb)}</span></div></button>`).join('');
    this.el.innerHTML = `<div class="wh-start__panel"><div class="wh-title">WYLDHUNT</div><div class="wh-sub">Mistfall Gorge — the first hunting ground</div>
      <div class="wh-looks">${looks}</div>
      <div class="wh-btns"><button class="wh-btn wh-btn--go" data-go>Begin the hunt</button><button class="wh-btn" data-credits>Credits</button><button class="wh-btn" data-leave>Leave</button></div>
      <p class="wh-start__note">Every hunter carries a greatblade and a bow. Track the Gnarlhorn by its footprints — the scout flies will lead you — ride your Shagmane up the gorge, gather what grows, and bring the beast down.</p></div>`;
    host.append(this.el);
    this.el.querySelectorAll('[data-look]').forEach((b) =>
      b.addEventListener('click', () => {
        this.select(b.dataset.look);
        onPick(b.dataset.look);
      })
    );
    this.el.querySelector('[data-go]').addEventListener('click', onBegin);
    this.el.querySelector('[data-credits]').addEventListener('click', onCredits);
    this.el.querySelector('[data-leave]').addEventListener('click', onClose);
  }

  select(id) {
    this.el.querySelectorAll('[data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === id)));
  }

  hide() {
    this.el.remove();
  }
}

/* ------------------------------------------------------------------ the HUD */

const HINT = [
  'Move <kbd>W A S D</kbd> · sprint <kbd>Shift</kbd>',
  'Dodge roll <kbd>Space</kbd>',
  'Light · heavy <kbd>Left</kbd> <kbd>Right</kbd> (hold to charge)',
  'Blade ↔ bow <kbd>Tab</kbd> · sheathe <kbd>F</kbd>',
  'Gather · carve · mount <kbd>E</kbd>',
  'Whistle for Burrow <kbd>X</kbd>',
  'Items <kbd>1–4</kbd> · field bag <kbd>B</kbd>',
  'Mouse-look <kbd>V</kbd> · controls <kbd>H</kbd> · menu <kbd>Esc</kbd>'
];

const RIDE_HINT = [
  'Speed up <kbd>W</kbd> · slow down <kbd>S</kbd>',
  'Gallop <kbd>Shift</kbd>',
  'Steer <kbd>A D</kbd> (or turn the camera)',
  'Let Burrow run the path <kbd>Hold R</kbd>',
  'Jump <kbd>Space</kbd>',
  'Dismount <kbd>E</kbd>'
];

export class Hud {
  constructor(host, { name, party, debug }) {
    this.el = el('div', 'wh-hud');
    this.el.innerHTML = `
      <div class="wh-vitals"><div class="wh-vitals__name">${esc(name)}</div>
        <div class="wh-gauge wh-gauge--hp"><i class="lag"></i><i class="val"></i></div>
        <div class="wh-gauge wh-gauge--st"><i class="val"></i></div>
        <div class="wh-party">${party.map((p) => `<div data-p="${p.id}"><i class="ic" style="background:${p.color}"></i>${esc(p.name)}<span class="mini"><i></i></span></div>`).join('')}</div>
      </div>
      <div class="wh-hint">${HINT.map((h) => `<div>${h}</div>`).join('')}</div>
      <div class="wh-monster"><b></b><span></span><em></em></div>
      <div class="wh-banner"><b></b><span></span></div>
      <div class="wh-subtitle"></div>
      <div class="wh-prompt"></div>
      <div class="wh-log"></div>
      <div class="wh-items"></div>
      <div class="wh-weapon"><div class="wh-weapon__row"><div><b></b><small></small></div><canvas width="96" height="96"></canvas></div><div class="wh-sharp"></div><div class="wh-charge"><i></i><i></i><i></i></div></div>
      <div class="wh-cross"></div>
      <div class="wh-hurt"></div>
      ${debug ? '<div class="wh-stats"></div>' : ''}`;
    host.append(this.el);
    this.$ = (s) => this.el.querySelector(s);
    this.hintT = 14;
    this.subT = 0;
    this.bannerT = 0;
    this.nums = [];
    this.logs = [];
    this.minimap = new Minimap(this.el);
  }

  showHint() {
    this.hintT = 12;
  }

  /** The controls hint for riding or for being on foot (shown again for a while when it changes). */
  setHint(riding) {
    if (this._riding === riding) return;
    this._riding = riding;
    this.$('.wh-hint').innerHTML = (riding ? RIDE_HINT : HINT).map((h) => `<div>${h}</div>`).join('');
    this.hintT = 9;
  }

  /** A line of dialogue under the picture. */
  say(who, text, secs = 4.5) {
    const s = this.$('.wh-subtitle');
    s.innerHTML = `<b>${esc(who)}:</b> ${esc(text)}`;
    s.classList.add('on');
    this.subT = secs;
  }

  banner(title, sub = '', { big = false, secs = 4 } = {}) {
    const b = this.$('.wh-banner');
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = sub;
    b.classList.toggle('big', big);
    b.classList.add('on');
    this.bannerT = secs;
  }

  /** A line in the pickup log: an icon, a name, a count. */
  log(id, n, note = '') {
    const box = this.$('.wh-log');
    const row = el('div');
    row.append(cloneCanvas(itemIcon(id, 44)));
    row.append(el('span', null, esc(ITEMS[id]?.name ?? id)));
    row.append(el('em', null, note || `×${n}`));
    box.append(row);
    this.logs.push({ row, t: 5 });
    while (this.logs.length > 5) this.logs.shift().row.remove();
  }

  number(x, y, v, kind = '') {
    const n = el('div', `wh-num ${kind}`, String(v));
    n.style.left = `${x}px`;
    n.style.top = `${y}px`;
    this.el.append(n);
    this.nums.push({ n, t: 0, x, y });
  }

  hurt(k) {
    const h = this.$('.wh-hurt');
    h.style.transition = 'none';
    h.style.opacity = String(Math.min(1, k));
    requestAnimationFrame(() => {
      h.style.transition = 'opacity 0.8s';
      h.style.opacity = '0';
    });
  }

  crosshair(on) {
    this.$('.wh-cross').classList.toggle('on', on);
  }

  setStats(t) {
    const s = this.$('.wh-stats');
    if (s) s.textContent = t;
  }

  /**
   * Each frame: `v` { hp, hpMax, lag, st, stMax, party: [{id, frac}], weapon: { id, name, sharp, sheathed, charge },
   * items: [{ id, n, key }], monster: { name, title, note } | null, prompt }.
   */
  update(dt, v) {
    this.$('.wh-gauge--hp .val').style.width = `${(v.hp / v.hpMax) * 100}%`;
    this.$('.wh-gauge--hp .lag').style.width = `${(v.lag / v.hpMax) * 100}%`;
    this.$('.wh-gauge--st .val').style.width = `${(v.st / v.stMax) * 100}%`;
    for (const p of v.party) {
      const r = this.el.querySelector(`[data-p="${p.id}"] .mini i`);
      if (r) r.style.width = `${p.frac * 100}%`;
    }
    // Weapon.
    const w = v.weapon;
    if (this._wid !== w.id) {
      this._wid = w.id;
      const c = this.$('.wh-weapon canvas');
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(icon(w.id === 'bow' ? 'bow' : 'blade', w.id === 'bow' ? '#a8784a' : '#d8dce4', 96), 0, 0);
      this.$('.wh-weapon b').textContent = w.name;
      this.$('.wh-sharp').style.display = w.id === 'bow' ? 'none' : 'flex';
      this.$('.wh-charge').style.display = w.id === 'bow' ? 'flex' : 'none';
    }
    this.$('.wh-weapon small').textContent = `${w.sheathed ? 'Sheathed' : 'Drawn'}${w.id === 'bow' ? ' · Arrows ∞' : ` · ${sharpnessLevel(w.sharp).id}`}`;
    if (w.id !== 'bow') {
      const key = Math.round(w.sharp);
      if (key !== this._sharpKey) {
        this._sharpKey = key;
        const box = this.$('.wh-sharp');
        box.innerHTML = '';
        for (let i = 0; i < SHARPNESS.length; i++) {
          const a = SHARPNESS[i].from;
          const b = SHARPNESS[i + 1]?.from ?? SHARP_MAX;
          const fill = Math.max(0, Math.min(b, w.sharp) - a);
          const seg = el('i');
          seg.style.width = `${(fill / SHARP_MAX) * 100}%`;
          seg.style.background = SHARPNESS[i].color;
          box.append(seg);
        }
      }
    } else {
      this.$('.wh-charge').querySelectorAll('i').forEach((e, i) => e.classList.toggle('on', w.charge > i));
    }
    // Items.
    const ik = v.items.map((i) => `${i.id}:${i.n}`).join(',');
    if (ik !== this._items) {
      this._items = ik;
      const box = this.$('.wh-items');
      box.innerHTML = '';
      for (const it of v.items) {
        const d = el('div', it.n ? '' : 'empty');
        d.dataset.item = it.id;
        d.append(cloneCanvas(itemIcon(it.id, 76)), el('kbd', null, it.key), el('span', null, ITEMS[it.id]?.infinite ? '' : String(it.n)));
        d.title = ITEMS[it.id]?.name ?? '';
        box.append(d);
      }
    }
    // Monster.
    const m = this.$('.wh-monster');
    if (v.monster) {
      m.querySelector('b').textContent = v.monster.name;
      m.querySelector('span').textContent = v.monster.title;
      m.querySelector('em').textContent = v.monster.note ?? '';
    }
    m.classList.toggle('on', Boolean(v.monster));
    // Prompt.
    const pr = this.$('.wh-prompt');
    if (v.prompt) pr.innerHTML = v.prompt;
    pr.classList.toggle('on', Boolean(v.prompt));
    // Timers.
    this.hintT -= dt;
    this.$('.wh-hint').classList.toggle('gone', this.hintT < 0);
    if ((this.subT -= dt) < 0) this.$('.wh-subtitle').classList.remove('on');
    if ((this.bannerT -= dt) < 0) this.$('.wh-banner').classList.remove('on');
    for (const l of this.logs) {
      l.t -= dt;
      if (l.t < 0.6) l.row.style.opacity = String(Math.max(0, l.t / 0.6));
    }
    while (this.logs.length && this.logs[0].t < 0) this.logs.shift().row.remove();
    this.nums = this.nums.filter((n) => {
      n.t += dt;
      n.n.style.top = `${n.y - n.t * 50}px`;
      n.n.style.opacity = String(Math.max(0, 1 - n.t / 0.9));
      if (n.t > 0.9) n.n.remove();
      return n.t <= 0.9;
    });
  }

  flashItem(id) {
    const d = this.el.querySelector(`.wh-items [data-item="${id}"]`);
    if (!d) return;
    d.classList.add('flash');
    setTimeout(() => d.classList.remove('flash'), 220);
  }

  dispose() {
    this.el.remove();
  }
}

/* ------------------------------------------------------------------ the minimap */

/** The gorge painted once from the heights: rock, floor, path, water, the camp. */
export function paintMap(grid) {
  const W = grid.w;
  const H = grid.h;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = EXTENT.x0 + i;
      const z = EXTENT.z0 + j;
      const h = grid.data[j * W + i];
      const hx = grid.data[j * W + Math.min(W - 1, i + 1)] - h;
      const hz = grid.data[Math.min(H - 1, j + 1) * W + i] - h;
      const slope = Math.hypot(hx, hz);
      const shade = Math.max(0.55, Math.min(1.25, 1 - (hx + hz) * 0.25));
      let col;
      if (slope > 1.2 || h > 40) col = [70, 76, 66];
      else col = [62 + h * 0.6, 92 + h * 0.4, 48];
      const k = (j * W + i) * 4;
      img.data[k] = col[0] * shade;
      img.data[k + 1] = col[1] * shade;
      img.data[k + 2] = col[2] * shade;
      img.data[k + 3] = 255;
    }
  }
  // Water and the path, sampled more coarsely.
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      const x = EXTENT.x0 + i;
      const z = EXTENT.z0 + j;
      if (grid.data[j * W + i] > 40) continue;
      const k = (j * W + i) * 4;
      if (waterAt(x, z) > grid.data[j * W + i]) {
        img.data[k] = 58;
        img.data[k + 1] = 118;
        img.data[k + 2] = 132;
      } else if (pathDistance(x, z) < 1.6) {
        img.data[k] = 196;
        img.data[k + 1] = 170;
        img.data[k + 2] = 120;
      }
    }
  }
  g.putImageData(img, 0, 0);
  void heightAt;
  void CAMP;
  return c;
}

export class Minimap {
  constructor(host) {
    this.el = el('div', 'wh-minimap');
    this.canvas = document.createElement('canvas');
    this.label = el('div', 'wh-minimap__label');
    this.el.append(this.canvas, this.label);
    host.append(this.el);
    this.size = 0;
    this.zoom = 1.1;
    this.area = undefined;
    this.map = null;
  }

  /** `dots`: { x, z, kind: camp | node | monster | ally | mount | track, color }. */
  draw(me, heading, dots = []) {
    if (!this.map) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = this.el.clientWidth || 180;
    const S = Math.round(css * dpr);
    if (S !== this.size) {
      this.canvas.width = this.canvas.height = S;
      this.size = S;
    }
    const g = this.canvas.getContext('2d');
    const R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2 * dpr, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#20281c';
    g.fillRect(0, 0, S, S);
    const rot = -Math.PI / 2 - Math.atan2(Math.cos(heading), Math.sin(heading));
    const k = this.zoom * dpr;
    g.translate(R, R);
    g.rotate(rot);
    g.scale(k, k);
    g.drawImage(this.map, -(me.x - EXTENT.x0), -(me.z - EXTENT.z0));
    g.restore();
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2 * dpr, 0, Math.PI * 2);
    g.clip();
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const order = { track: 0, node: 1, camp: 2, mount: 3, ally: 4, monster: 5 };
    for (const d of [...dots].sort((a, b) => order[a.kind] - order[b.kind])) {
      const lx = (d.x - me.x) * k;
      const lz = (d.z - me.z) * k;
      let x = R + lx * cr - lz * sr;
      let y = R + lx * sr + lz * cr;
      const out = Math.hypot(x - R, y - R) > R - 10 * dpr;
      if (out) {
        if (d.kind !== 'monster' && d.kind !== 'camp') continue;
        // Pinned to the rim, pointing the way.
        const a = Math.atan2(y - R, x - R);
        x = R + Math.cos(a) * (R - 10 * dpr);
        y = R + Math.sin(a) * (R - 10 * dpr);
      }
      g.lineWidth = 1.5 * dpr;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      if (d.kind === 'monster') {
        const s = 8 * dpr;
        g.fillStyle = '#ff5a3a';
        g.beginPath();
        g.moveTo(x, y - s);
        g.lineTo(x + s * 0.8, y + s * 0.6);
        g.lineTo(x, y + s * 0.2);
        g.lineTo(x - s * 0.8, y + s * 0.6);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#ffe0c0';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(x + sx * s * 0.35, y - s * 0.4);
          g.lineTo(x + sx * s * 0.9, y - s * 1.2);
          g.lineTo(x + sx * s * 0.55, y - s * 0.3);
          g.fill();
        }
      } else if (d.kind === 'camp') {
        const s = 7 * dpr;
        g.fillStyle = '#f2e2b0';
        g.beginPath();
        g.moveTo(x, y - s);
        g.lineTo(x + s, y + s * 0.7);
        g.lineTo(x - s, y + s * 0.7);
        g.closePath();
        g.fill();
        g.stroke();
      } else if (d.kind === 'mount') {
        g.fillStyle = '#e0a060';
        g.beginPath();
        g.arc(x, y, 4.5 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      } else if (d.kind === 'ally') {
        g.fillStyle = d.color;
        g.beginPath();
        g.arc(x, y, 3.8 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      } else if (d.kind === 'track') {
        g.fillStyle = '#7aff6a';
        g.beginPath();
        g.arc(x, y, 2.2 * dpr, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = d.color;
        g.beginPath();
        g.rect(x - 3 * dpr, y - 3 * dpr, 6 * dpr, 6 * dpr);
        g.fill();
        g.stroke();
      }
    }
    g.restore();
    // You: an arrow, always up.
    g.save();
    g.translate(R, R);
    g.rotate(rot + me.yawMap);
    g.fillStyle = '#fff2c8';
    g.strokeStyle = '#2a2010';
    g.lineWidth = 1.5 * dpr;
    g.beginPath();
    g.moveTo(0, -9 * dpr);
    g.lineTo(6 * dpr, 7 * dpr);
    g.lineTo(0, 3.5 * dpr);
    g.lineTo(-6 * dpr, 7 * dpr);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    const n = rot - Math.PI / 2;
    g.fillStyle = '#f2ecd6';
    g.font = `600 ${11 * dpr}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', R + Math.cos(n) * (R - 11 * dpr), R + Math.sin(n) * (R - 11 * dpr));
    const area = areaAt(me.x, me.z);
    if (area !== this.area) {
      this.area = area;
      this.label.textContent = AREAS.find((a) => a.id === area)?.name ?? 'Mistfall Gorge';
    }
  }
}

/* ------------------------------------------------------------------ panels */

export function bagPanel(host, bag, onClose) {
  const p = el('div', 'wh-panel');
  const slots = Array.from({ length: BAG_SIZE }, (_, i) => bag[i]);
  p.innerHTML = `<button class="wh-btn close" data-x>Close</button><h2>Field bag</h2><p class="lead">What you carry and what you have gathered and carved. ${bag.length}/${BAG_SIZE} slots.</p><div class="wh-grid"></div><div class="wh-desc">Point at something to read about it.</div>`;
  const grid = p.querySelector('.wh-grid');
  for (const s of slots) {
    const d = el('div', 'wh-slot');
    if (s) {
      d.append(cloneCanvas(itemIcon(s.id, 64)), el('span', null, ITEMS[s.id]?.infinite ? '' : String(s.n)));
      d.addEventListener('mouseenter', () => (p.querySelector('.wh-desc').innerHTML = `<b>${esc(ITEMS[s.id].name)}</b> — ${esc(ITEMS[s.id].desc)}`));
    }
    grid.append(d);
  }
  host.append(p);
  const close = () => {
    p.remove();
    onClose?.();
  };
  p.querySelector('[data-x]').addEventListener('click', close);
  return { el: p, close };
}

export function creditsPanel(host, onClose) {
  const p = el('div', 'wh-panel wh-credits');
  p.innerHTML = `<button class="wh-btn close" data-x>Close</button><h2>Credits</h2><p class="lead">Free assets, used under their licences. Thank you to everyone who shares their work.</p>
    ${PACKS.map((k) => `<h3><a href="${k.site}" target="_blank" rel="noopener">${esc(k.name)}</a> · <a href="${k.licenceUrl}" target="_blank" rel="noopener">${esc(k.licence)}</a></h3><p>${esc(k.what)}</p>${k.items ? `<ul>${k.items.map((i) => `<li><a href="${i.url}" target="_blank" rel="noopener">${esc(i.name)}</a></li>`).join('')}</ul>` : ''}`).join('')}
    <h3>Made for this game</h3><p>${esc(OWN)}</p>`;
  host.append(p);
  const close = () => {
    p.remove();
    onClose?.();
  };
  p.querySelector('[data-x]').addEventListener('click', close);
  return { el: p, close };
}

export function pauseMenu(host, { onResume, onCredits, onSound, soundOn, onLeave, tier }) {
  const p = el('div', 'wh-panel');
  p.style.width = 'min(360px, 90vw)';
  p.innerHTML = `<h2>Paused</h2><p class="lead">Quality: ${esc(tier)} (it adjusts itself to keep frames quick).</p><div class="wh-menu">
    <button class="wh-btn wh-btn--go" data-r>Back to the hunt</button><button class="wh-btn" data-s>Sound: ${soundOn ? 'on' : 'off'}</button><button class="wh-btn" data-c>Credits</button><button class="wh-btn" data-l>Leave</button></div>`;
  host.append(p);
  p.querySelector('[data-r]').addEventListener('click', onResume);
  p.querySelector('[data-c]').addEventListener('click', onCredits);
  p.querySelector('[data-l]').addEventListener('click', onLeave);
  p.querySelector('[data-s]').addEventListener('click', (e) => (e.target.textContent = `Sound: ${onSound() ? 'on' : 'off'}`));
  return p;
}
