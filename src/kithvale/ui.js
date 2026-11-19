/**
 * Kithvale's screens, soft and few: the loading veil; the start screen
 * (three looks); the HUD — the round minimap (always on), the satchel bar
 * (three treats, the chosen one lifted), your friends' portraits, a small
 * prompt, place banners, villagers' name plates and lines, a controls hint
 * that fades; the trust moment's breathing ring; the card that names a new
 * friend; the journal; the pause menu; the credits. Icons are painted here.
 */
import { EXTENT, AREAS, areaAt, VILLAGE, SHRINE, POND, GATE, GARDEN } from './map.js';
import { CONTROLS } from './controls.js';
import { hintItems } from '../shared/helpPanel.js';
import { LOOKS } from './cast.js';
import { TREATS, TREAT_ORDER, SPECIES, SPECIES_ORDER, journalEntry, PARTY_MAX, breathSize } from './rules.js';
import { PACKS, OWN } from './credits.js';
import { waterAt, roadDistance, trailDistance, pavedAt, inVillage } from './heights.js';

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ------------------------------------------------------------------ icons */

const icons = new Map();
/** A painted treat icon (berry, seed, crystal) as a data URL. */
export function treatIcon(kind, size = 96) {
  const key = `${kind}|${size}`;
  if (icons.has(key)) return icons.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(size / 96, size / 96);
  g.translate(48, 50);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(60,36,28,0.85)';
  g.lineWidth = 3.5;
  if (kind === 'berry') {
    for (const [x, y, r] of [[-12, 8, 15], [12, 8, 15], [0, -10, 15]]) {
      const gr = g.createRadialGradient(x - 5, y - 5, 2, x, y, r);
      gr.addColorStop(0, '#ff8aa4');
      gr.addColorStop(1, '#c42a4a');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.fillStyle = '#6aa040';
    g.beginPath();
    g.ellipse(6, -28, 12, 6, -0.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else if (kind === 'seed') {
    const gr = g.createRadialGradient(-6, -6, 3, 0, 0, 32);
    gr.addColorStop(0, '#f2d8a0');
    gr.addColorStop(1, '#b88a50');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-28, 4);
    g.quadraticCurveTo(-30, 30, 0, 32);
    g.quadraticCurveTo(30, 30, 28, 4);
    g.quadraticCurveTo(20, -16, 8, -18);
    g.lineTo(-8, -18);
    g.quadraticCurveTo(-20, -16, -28, 4);
    g.fill();
    g.stroke();
    g.strokeStyle = '#8a5a2a';
    g.beginPath();
    g.moveTo(-10, -18);
    g.lineTo(10, -18);
    g.stroke();
    g.fillStyle = '#f2c040';
    g.strokeStyle = 'rgba(60,36,28,0.85)';
    g.lineWidth = 2;
    for (const [x, y] of [[-6, -28], [6, -30], [0, -36]]) {
      g.beginPath();
      g.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  } else {
    for (const [x, y, h, a] of [[-12, 10, 30, -0.4], [12, 12, 26, 0.45], [0, 4, 40, 0]]) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      const gr = g.createLinearGradient(-8, 0, 8, 0);
      gr.addColorStop(0, '#d8f8ff');
      gr.addColorStop(1, '#4ab0d8');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, -h / 2 - 6);
      g.lineTo(9, -h / 2 + 4);
      g.lineTo(8, h / 2 - 4);
      g.lineTo(0, h / 2 + 4);
      g.lineTo(-8, h / 2 - 4);
      g.lineTo(-9, -h / 2 + 4);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }
  }
  const url = c.toDataURL();
  icons.set(key, url);
  return url;
}

/** A small painted symbol for each friend's ability. */
export function abilityIcon(id) {
  return { sniff: '👃', roll: '🪨', glow: '🏮', calm: '🍃', float: '☁️', ember: '🔥' }[id] ?? '✦';
}

/* ------------------------------------------------------------------ loading and start */

export class Loading {
  constructor(host) {
    this.el = el('div', 'kv-load', `<div class="kv-load__box"><div class="kv-title">Kithvale</div><div class="kv-sub">Lanternrest and the vale beyond its gate</div><div class="kv-bar"><i></i></div><div class="kv-load__label">Waking</div></div>`);
    host.append(this.el);
  }

  set(label, k) {
    this.el.querySelector('i').style.width = `${Math.round(k * 100)}%`;
    this.el.querySelector('.kv-load__label').textContent = label;
  }

  hide() {
    this.el.style.opacity = '0';
    setTimeout(() => this.el.remove(), 900);
  }
}

export class StartScreen {
  constructor(host, { picked, onPick, onBegin, onCredits, onClose, hasSave }) {
    this.el = el('div', 'kv-start');
    const looks = LOOKS.map((l) => `<button class="kv-look" data-look="${l.id}" aria-pressed="${l.id === picked}"><i style="background:${l.accent}"></i><div><b>${esc(l.name)}</b><span>${esc(l.blurb)}</span></div></button>`).join('');
    this.el.innerHTML = `<div class="kv-start__panel"><div class="kv-title">Kithvale</div><div class="kv-sub">The vale beyond Lanternrest's gate</div>
      <div class="kv-looks" role="group" aria-label="Your look">${looks}</div>
      <div class="kv-btns"><button class="kv-btn kv-btn--go" data-go>${hasSave ? 'Back to the vale' : 'Out through the gate'}</button><button class="kv-btn" data-credits>Credits</button><button class="kv-btn" data-leave>Leave</button></div>
      <p class="kv-start__note">Wild creatures live all over the vale. Walk softly (hold Ctrl, or the 🐾 button) and they come to look at you. Toss them a treat they love, then breathe with them — and they may follow you home.</p></div>`;
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

/** The rows of controls.js marked `hint` (the same table the keys and How to play use). */
const HINT = hintItems(CONTROLS).map((h) => `${esc(h.does[0].toUpperCase() + h.does.slice(1))} ${h.keys.map((k) => `<kbd>${esc(k)}</kbd>`).join(' ')}`);

export class Hud {
  constructor(host, { touch = false, debug = false, portraits = {} }) {
    this.portraits = portraits;
    this.el = el('div', `kv-hud${touch ? ' kv-hud--touch' : ''}`);
    this.el.innerHTML = `
      <div class="kv-friends"></div>
      <div class="kv-hint">${HINT.map((h) => `<div>${h}</div>`).join('')}</div>
      <div class="kv-banner"><b></b><span></span></div>
      <div class="kv-toast"></div>
      <div class="kv-line"></div>
      <div class="kv-prompt"></div>
      <div class="kv-satchel"></div>
      <div class="kv-plates"></div>
      <canvas class="kv-ring"></canvas>
      <div class="kv-ringtext"></div>
      ${debug ? '<div class="kv-stats"></div>' : ''}`;
    host.append(this.el);
    this.$ = (s) => this.el.querySelector(s);
    this.hintT = touch ? 0 : 16;
    this.lineT = 0;
    this.bannerT = 0;
    this.toastT = 0;
    this.minimap = new Minimap(this.el);
    this.plates = new Map();
    this.onPickTreat = null;
  }

  showHint() {
    this.hintT = 12;
  }

  banner(title, sub = '', secs = 4) {
    const b = this.$('.kv-banner');
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = sub;
    b.classList.add('on');
    this.bannerT = secs;
  }

  toast(html, secs = 3) {
    const t = this.$('.kv-toast');
    t.innerHTML = html;
    t.classList.add('on');
    this.toastT = secs;
  }

  /** A villager's line under the picture. */
  say(who, title, text, secs = 5) {
    const s = this.$('.kv-line');
    s.innerHTML = `<b>${esc(who)}</b><em>${esc(title)}</em><span>${esc(text)}</span>`;
    s.classList.add('on');
    this.lineT = secs;
  }

  /** The satchel: three treats with counts; the chosen one lifted. */
  setSatchel(satchel, chosen) {
    const key = TREAT_ORDER.map((k) => `${k}:${satchel[k]}`).join(',') + `|${chosen}`;
    if (key === this._sat) return;
    this._sat = key;
    const box = this.$('.kv-satchel');
    box.innerHTML = '';
    TREAT_ORDER.forEach((k, i) => {
      const b = el('button', `kv-slot${k === chosen ? ' on' : ''}${satchel[k] ? '' : ' empty'}`);
      b.setAttribute('aria-label', `${TREATS[k].name}, ${satchel[k]}`);
      b.innerHTML = `<img alt="" src="${treatIcon(k, 96)}"><kbd>${i + 5}</kbd><span>${satchel[k]}</span><small>${esc(TREATS[k].short)}</small>`;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.onPickTreat?.(k);
      });
      box.append(b);
    });
  }

  /** Your friends' portraits, names and what each lends you. */
  setFriends(list) {
    const key = list.map((f) => `${f.uid}:${f.name}`).join(',');
    if (key === this._fr) return;
    this._fr = key;
    const box = this.$('.kv-friends');
    box.innerHTML = '';
    for (const f of list.slice(0, PARTY_MAX)) {
      const s = SPECIES[f.species];
      const d = el('div', 'kv-friend');
      d.innerHTML = `<div class="kv-friend__pic" style="--c:${s.color}">${this.portraits[f.species] ? `<img alt="" src="${this.portraits[f.species]}">` : ''}</div><div><b>${esc(f.name)}</b><span>${abilityIcon(s.ability.id)} ${esc(s.ability.name)}</span></div>`;
      d.title = `${f.name} the ${s.name} — ${s.ability.desc}`;
      box.append(d);
    }
  }

  prompt(html) {
    const p = this.$('.kv-prompt');
    if (html !== this._prompt) {
      this._prompt = html;
      p.innerHTML = html ?? '';
    }
    p.classList.toggle('on', Boolean(html));
  }

  /** Name plates over villagers: [{ id, name, title, x, y (screen px), k (0…1 fade) }]. */
  setPlates(list) {
    const box = this.$('.kv-plates');
    const seen = new Set();
    for (const p of list) {
      seen.add(p.id);
      let n = this.plates.get(p.id);
      if (!n) {
        n = el('div', 'kv-plate', `<b>${esc(p.name)}</b><span>${esc(p.title)}</span>`);
        box.append(n);
        this.plates.set(p.id, n);
      }
      n.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      n.style.opacity = String(p.k);
    }
    for (const [id, n] of this.plates) {
      if (!seen.has(id)) {
        n.remove();
        this.plates.delete(id);
      }
    }
  }

  /**
   * The trust moment's ring, round the creature: a still guide ring and a
   * breathing ring that swells and shrinks; press as it fills the guide.
   * `st` null hides it; else { x, y, t, breath, grades: [...], beats, flash, label }.
   */
  ring(st) {
    const c = this.$('.kv-ring');
    const txt = this.$('.kv-ringtext');
    if (!st) {
      c.classList.remove('on');
      txt.classList.remove('on');
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = Math.round(260 * dpr);
    if (c.width !== S) c.width = c.height = S;
    c.classList.add('on');
    c.style.transform = `translate(${st.x}px, ${st.y}px) translate(-50%, -50%)`;
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    const R = S / 2;
    const k = breathSize(st.t, st.breath);
    const outer = R * 0.78;
    const inner = R * (0.28 + k * 0.5);
    // The guide.
    g.lineWidth = 3 * dpr;
    g.strokeStyle = 'rgba(255, 236, 190, 0.85)';
    g.setLineDash([6 * dpr, 7 * dpr]);
    g.beginPath();
    g.arc(R, R, outer, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    // The breath: a soft filled disc and its edge, warmer as it fills.
    const near = 1 - Math.min(1, Math.abs(outer - inner) / (R * 0.2));
    const grd = g.createRadialGradient(R, R, inner * 0.2, R, R, inner);
    grd.addColorStop(0, 'rgba(255, 250, 235, 0.0)');
    grd.addColorStop(1, `rgba(255, ${210 + near * 30}, ${170 - near * 40}, ${0.18 + near * 0.25})`);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(R, R, inner, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = (3 + near * 3) * dpr;
    g.strokeStyle = `rgba(255, ${240 - near * 30}, ${200 - near * 80}, 0.95)`;
    g.beginPath();
    g.arc(R, R, inner, 0, Math.PI * 2);
    g.stroke();
    // Beats so far.
    for (let i = 0; i < st.beats; i++) {
      const a = -Math.PI / 2 + ((i - (st.beats - 1) / 2) * 0.32);
      const gr = st.grades[i];
      g.fillStyle = gr === 'perfect' ? '#ffd86a' : gr === 'good' ? '#fff2d0' : gr === 'miss' ? '#a07a8a' : 'rgba(255,255,255,0.25)';
      g.beginPath();
      g.arc(R + Math.cos(a) * (outer + 16 * dpr), R + Math.sin(a) * (outer + 16 * dpr), (gr === 'perfect' ? 7 : 5.5) * dpr, 0, Math.PI * 2);
      g.fill();
    }
    if (st.flash) {
      g.fillStyle = `rgba(255, 240, 200, ${st.flash * 0.35})`;
      g.beginPath();
      g.arc(R, R, outer, 0, Math.PI * 2);
      g.fill();
    }
    txt.classList.add('on');
    txt.style.transform = `translate(${st.x}px, ${st.y + 140}px) translate(-50%, 0)`;
    if (txt.textContent !== st.label) txt.textContent = st.label;
  }

  setStats(t) {
    const s = this.$('.kv-stats');
    if (s) s.textContent = t;
  }

  update(dt) {
    this.hintT -= dt;
    this.$('.kv-hint').classList.toggle('gone', this.hintT < 0);
    if ((this.lineT -= dt) < 0) this.$('.kv-line').classList.remove('on');
    if ((this.bannerT -= dt) < 0) this.$('.kv-banner').classList.remove('on');
    if ((this.toastT -= dt) < 0) this.$('.kv-toast').classList.remove('on');
  }

  dispose() {
    this.el.remove();
  }
}

/* ------------------------------------------------------------------ the minimap */

/** The vale painted once from the heights: grass and hills, the road, the water, the village roofs, the trees. */
export function paintMap(grid, trees = []) {
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
      const shade = Math.max(0.7, Math.min(1.2, 1 - (hx - hz) * 0.35));
      let col = [128 + Math.min(40, h * 1.2), 168 + Math.min(20, h * 0.4), 96];
      if (h > 30) col = [150, 160, 120];
      const k = (j * W + i) * 4;
      if (waterAt(x, z) > h) col = [110, 170, 190];
      else if (inVillage(x, z)) col = pavedAt(x, z) ? [214, 196, 160] : [196, 176, 140];
      else if (roadDistance(x, z).d < 2.4 || trailDistance(x, z) < 1.3) col = [222, 196, 140];
      img.data[k] = col[0] * shade;
      img.data[k + 1] = col[1] * shade;
      img.data[k + 2] = col[2] * shade;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Trees as soft dark dots; the village's houses as roofs.
  g.fillStyle = 'rgba(52, 92, 50, 0.55)';
  for (const t of trees) {
    if (t.kind === 'bush') continue;
    g.beginPath();
    g.arc(t.x - EXTENT.x0, t.z - EXTENT.z0, t.kind === 'pine' ? 1.6 : 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export class Minimap {
  constructor(host) {
    this.el = el('div', 'kv-minimap');
    this.canvas = document.createElement('canvas');
    this.label = el('div', 'kv-minimap__label');
    this.el.append(this.canvas, this.label);
    host.append(this.el);
    this.size = 0;
    this.zoom = 1.25;
    this.map = null;
    this.area = undefined;
  }

  /** `dots`: { x, z, kind: friend | wild | cache | lantern | poi | guide, color, icon }. */
  draw(me, heading, dots = []) {
    if (!this.map) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = this.el.clientWidth || 160;
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
    g.fillStyle = '#9ab878';
    g.fillRect(0, 0, S, S);
    // Map turns with the camera: what's ahead is up.
    const rot = heading - Math.PI;
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
    const order = { poi: 0, lantern: 1, cache: 2, wild: 3, guide: 4, friend: 5 };
    for (const d of [...dots].sort((a, b) => (order[a.kind] ?? 0) - (order[b.kind] ?? 0))) {
      const lx = (d.x - me.x) * k;
      const lz = (d.z - me.z) * k;
      let x = R + lx * cr - lz * sr;
      let y = R + lx * sr + lz * cr;
      const out = Math.hypot(x - R, y - R) > R - 10 * dpr;
      if (out) {
        if (d.kind !== 'poi' && d.kind !== 'guide') continue;
        const a = Math.atan2(y - R, x - R);
        x = R + Math.cos(a) * (R - 11 * dpr);
        y = R + Math.sin(a) * (R - 11 * dpr);
      }
      g.lineWidth = 1.5 * dpr;
      g.strokeStyle = 'rgba(60,40,30,0.75)';
      if (d.kind === 'poi') {
        g.font = `${13 * dpr}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255,248,230,0.92)';
        g.beginPath();
        g.arc(x, y, 9 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillText(d.icon, x, y + 0.5 * dpr);
      } else if (d.kind === 'friend') {
        g.fillStyle = d.color;
        g.beginPath();
        g.arc(x, y, 4.5 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      } else if (d.kind === 'wild') {
        g.fillStyle = d.color;
        g.globalAlpha = 0.9;
        g.beginPath();
        g.moveTo(x, y - 5 * dpr);
        g.lineTo(x + 4.5 * dpr, y);
        g.lineTo(x, y + 5 * dpr);
        g.lineTo(x - 4.5 * dpr, y);
        g.closePath();
        g.fill();
        g.stroke();
        g.globalAlpha = 1;
      } else if (d.kind === 'cache') {
        g.fillStyle = '#ffe070';
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = (i % 2 ? 2.4 : 6) * dpr;
          g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();
      } else if (d.kind === 'lantern') {
        g.fillStyle = d.lit ? '#ffb050' : '#6a6460';
        g.beginPath();
        g.arc(x, y, 3 * dpr, 0, Math.PI * 2);
        g.fill();
      } else if (d.kind === 'pin') {
        // The waypoint set on the full map.
        g.fillStyle = '#ff5ad9';
        g.beginPath();
        g.arc(x, y, 5 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      } else if (d.kind === 'guide') {
        g.fillStyle = '#ffd890';
        g.beginPath();
        g.arc(x, y, 5 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
    g.restore();
    // You: an arrow (which way you face, relative to the view).
    g.save();
    g.translate(R, R);
    g.rotate(heading - me.yaw);
    g.fillStyle = '#fff6dc';
    g.strokeStyle = '#4a3020';
    g.lineWidth = 1.6 * dpr;
    g.beginPath();
    g.moveTo(0, -9 * dpr);
    g.lineTo(6 * dpr, 7 * dpr);
    g.lineTo(0, 3.5 * dpr);
    g.lineTo(-6 * dpr, 7 * dpr);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    // North, on the rim.
    const n = rot + Math.PI / 2;
    g.fillStyle = '#5a3a26';
    g.font = `700 ${11 * dpr}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', R + Math.cos(n) * (R - 10 * dpr), R + Math.sin(n) * (R - 10 * dpr));
    const area = areaAt(me.x, me.z, me.stream ?? 99);
    if (area !== this.area) {
      this.area = area;
      this.label.textContent = AREAS.find((a) => a.id === area)?.name ?? 'Kithvale';
    }
  }
}

/** Fixed places on the minimap. */
export const MAP_POIS = [
  { x: GATE.x, z: GATE.z, icon: '⛩︎', kind: 'poi', name: 'Gate' },
  { x: SHRINE.x, z: SHRINE.z, icon: '🔔', kind: 'poi', name: 'Shrine' },
  { x: POND.x, z: POND.z, icon: '💧', kind: 'poi', name: 'Pond' },
  { x: GARDEN.x, z: GARDEN.z, icon: '🌱', kind: 'poi', name: 'Garden' }
];
void VILLAGE;

/* ------------------------------------------------------------------ panels */

function panel(host, cls, html, onClose) {
  const p = el('div', `kv-panel ${cls}`);
  p.innerHTML = html;
  host.append(p);
  const close = () => {
    p.remove();
    onClose?.();
  };
  p.querySelector('[data-x]')?.addEventListener('click', close);
  return { el: p, close };
}

/** The card that names a new friend. */
export function nameCard(host, { species, name, portrait, onDone }) {
  const s = SPECIES[species];
  const p = panel(host, 'kv-name', `<div class="kv-name__pic" style="--c:${s.color}">${portrait ? `<img alt="" src="${portrait}">` : ''}</div>
    <h2>A ${esc(s.name)} trusts you!</h2>
    <p class="lead">${esc(s.blurb)}</p>
    <label class="kv-name__field">Their name <input maxlength="14" value="${esc(name)}" aria-label="Name"></label>
    <p class="kv-name__ability">${abilityIcon(s.ability.id)} <b>${esc(s.ability.name)}</b> — ${esc(s.ability.desc)}</p>
    <div class="kv-btns"><button class="kv-btn kv-btn--go" data-ok>Welcome, friend</button></div>`);
  const input = p.el.querySelector('input');
  const done = () => {
    p.close();
    onDone(input.value);
  };
  p.el.querySelector('[data-ok]').addEventListener('click', done);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') done();
  });
  setTimeout(() => input.select(), 50);
  return p;
}

/** The journal: every species — seen or not, befriended or not, what it likes — and your friends, who follows and who rests. */
export function journalPanel(host, { state, portraits, onFollow, onClose }) {
  const cards = SPECIES_ORDER.map((id) => {
    const e = journalEntry(state, id);
    const s = SPECIES[id];
    const taste = (t, word) => (t ? `<span class="kv-taste"><img alt="" src="${treatIcon(t, 48)}">${word}</span>` : `<span class="kv-taste kv-taste--unknown">? ${word}</span>`);
    return `<div class="kv-card${e.seen ? '' : ' unseen'}${e.friend ? ' friend' : ''}">
      <div class="kv-card__pic" style="--c:${s.color}">${portraits[id] ? `<img alt="" src="${portraits[id]}">` : ''}</div>
      <div class="kv-card__body"><b>${esc(e.name)}</b>${e.friend ? '<em>Friend</em>' : e.seen ? '<em class="seen">Seen</em>' : ''}
      <small>${esc(e.habitat)}</small><p>${esc(e.blurb)}</p>
      ${e.seen ? `<div class="kv-tastes">${taste(e.loves, 'loves')}${taste(e.likes, 'likes')}${taste(e.dislikes, 'won\'t eat')}</div>` : ''}
      ${e.ability ? `<p class="kv-card__ab">${abilityIcon(e.ability.id)} <b>${esc(e.ability.name)}</b> — ${esc(e.ability.desc)}</p>` : ''}</div></div>`;
  }).join('');
  const friends = state.friends.length
    ? state.friends.map((f) => `<div class="kv-fr"><b>${esc(f.name)}</b> <span>the ${esc(SPECIES[f.species].name)}</span><button class="kv-btn kv-btn--small" data-uid="${esc(f.uid)}" data-follow="${f.follow ? 0 : 1}">${f.follow ? 'Rest in the garden' : 'Come with me'}</button></div>`).join('')
    : '<p class="kv-muted">No friends yet. Find a creature, creep close, toss it a treat it loves, then breathe with it.</p>';
  const p = panel(host, 'kv-journal', `<button class="kv-btn close" data-x>Close</button><h2>Journal</h2>
    <p class="lead">${state.seen.length} of ${SPECIES_ORDER.length} seen · ${state.befriended.length} befriended · up to ${PARTY_MAX} follow you; the rest wait in the Kith Garden.</p>
    <div class="kv-cards">${cards}</div><h3>Friends</h3><div class="kv-frs">${friends}</div>`, onClose);
  p.el.querySelectorAll('[data-uid]').forEach((b) => b.addEventListener('click', () => onFollow(b.dataset.uid, b.dataset.follow === '1')));
  return p;
}

export function creditsPanel(host, onClose) {
  return panel(host, 'kv-credits', `<button class="kv-btn close" data-x>Close</button><h2>Credits</h2><p class="lead">Free assets, used under their licences. Thank you to everyone who shares their work.</p>
    ${PACKS.map((k) => `<h3><a href="${k.site}" target="_blank" rel="noopener">${esc(k.name)}</a> · <a href="${k.licenceUrl}" target="_blank" rel="noopener">${esc(k.licence)}</a></h3><p>${esc(k.what)}</p>${k.items ? `<ul>${k.items.map((i) => `<li><a href="${i.url}" target="_blank" rel="noopener">${esc(i.name)}</a></li>`).join('')}</ul>` : ''}`).join('')}
    <h3>Made for this game</h3><p>${esc(OWN)}</p>`, onClose);
}

export function pauseMenu(host, { onResume, onJournal, onCredits, onSound, soundOn, onCycle, cycleOn, onLeave, graphics, onMap, onHelp }) {
  const p = panel(host, 'kv-pause', `<h2>Paused</h2><p class="lead">Your friends and journal are saved on this device.</p><div class="kv-menu">
    <button class="kv-btn kv-btn--go" data-r>Back to the vale</button><button class="kv-btn" data-j>Journal</button><button class="kv-btn" data-open-map>Map (O)</button><button class="kv-btn" data-open-help>How to play (H)</button><button class="kv-btn" data-d>Day cycle: ${cycleOn ? 'on' : 'off (golden dusk)'}</button><button class="kv-btn" data-s>Sound: ${soundOn ? 'on' : 'off'}</button><button class="kv-btn" data-c>Credits</button><button class="kv-btn" data-l>Leave</button></div>`);
  if (graphics) {
    p.el.querySelector('.kv-menu').after(graphics);
    p.el.style.maxHeight = '92vh';
    p.el.style.overflowY = 'auto';
  }
  p.el.querySelector('[data-r]').addEventListener('click', onResume);
  p.el.querySelector('[data-j]').addEventListener('click', onJournal);
  p.el.querySelector('[data-open-map]').addEventListener('click', () => onMap?.());
  p.el.querySelector('[data-open-help]').addEventListener('click', () => onHelp?.());
  p.el.querySelector('[data-c]').addEventListener('click', onCredits);
  p.el.querySelector('[data-l]').addEventListener('click', onLeave);
  p.el.querySelector('[data-s]').addEventListener('click', (e) => (e.target.textContent = `Sound: ${onSound() ? 'on' : 'off'}`));
  p.el.querySelector('[data-d]').addEventListener('click', (e) => (e.target.textContent = `Day cycle: ${onCycle() ? 'on' : 'off (golden dusk)'}`));
  return p;
}
