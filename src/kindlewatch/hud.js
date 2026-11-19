/**
 * Kindlewatch's screens and HUD, painted to match the game: the loading
 * veil, the start screen (two heroes, painted portraits), the HUD — an
 * ember-heart medallion with health and spark ribbons, ammo pips, draughts,
 * an embershard counter, skill tags with their charge, the always-on
 * minimap of rooms, the boss bar — and the pause, controls, credits, fallen
 * and victory panels. Touch controls on touch screens.
 */
import { HEROES, HERO_ORDER } from './rules.js';
import { ROOMS, CORRIDORS, W, H, WALL, roomAt } from './map.js';
import { PACKS, OWN } from './credits.js';
import { RIGS, heroPose, ordered } from './puppet.js';

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const INK = '#1a1222';

/* ------------------------------------------------------------ loading */

export class Loading {
  constructor(root) {
    this.el = el('div', 'kw-load', `<div class="kw-load__box"><div class="kw-title">KINDLEWATCH</div><div class="kw-sub">the keep of the last fires</div><div class="kw-bar"><i></i></div><div class="kw-load__label">Grinding the colours</div></div>`);
    root.append(this.el);
  }

  set(label, k) {
    this.el.querySelector('.kw-bar > i').style.width = `${Math.round(k * 100)}%`;
    this.el.querySelector('.kw-load__label').textContent = label;
  }

  hide() {
    this.el.style.opacity = '0';
    setTimeout(() => this.el.remove(), 750);
  }
}

/* ------------------------------------------------------------ portraits */

/** Draw a puppet into a 2D canvas from the atlas (for the start screen). */
export function drawPortrait(canvas, atlas, kind, time = 0) {
  const g = canvas.getContext('2d');
  const W2 = canvas.width;
  const H2 = canvas.height;
  g.clearRect(0, 0, W2, H2);
  const rig = RIGS[kind];
  const pose = heroPose(kind, { anim: 'idle', time, run: 0, phase: 0 });
  const S = rig.scale;
  const px = W2 * 0.5;
  const py = H2 * 0.92;
  const scale = (H2 * 0.62) / 1.4; // pixels per tile
  const world = { root: { x: 0, y: 0, r: 0, sx: 1, sy: 1 } };
  const items = [];
  for (const p of ordered(rig)) {
    const pp = pose[p.id] ?? {};
    const par = world[p.parent] ?? world.root;
    const lx = (p.at[0] + (pp.x ?? 0)) * S;
    const ly = (p.at[1] + (pp.y ?? 0)) * S;
    const c = Math.cos(par.r);
    const s = Math.sin(par.r);
    const w = { x: par.x + lx * c - ly * s, y: par.y + lx * s + ly * c, r: par.r + (p.r0 ?? 0) + (pp.r ?? 0), sx: 1, sy: 1 };
    world[p.id] = w;
    const layer = typeof p.layer === 'object' ? p.layer.f : p.layer;
    const name = typeof p.sprite === 'object' ? p.sprite.f : p.sprite;
    items.push({ w, layer, f: atlas.get(name), tint: p.tint ?? 1, flipX: p.flipX });
  }
  items.sort((a, b) => a.layer - b.layer);
  // a warm glow behind
  const grad = g.createRadialGradient(px, py - scale * 0.7, 0, px, py - scale * 0.7, scale * 1.3);
  grad.addColorStop(0, 'rgba(255,150,60,0.35)');
  grad.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W2, H2);
  g.fillStyle = 'rgba(10,6,20,0.5)';
  g.beginPath();
  g.ellipse(px, py, scale * 0.42, scale * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  const AW = atlas.width;
  const AH = atlas.height;
  for (const it of items) {
    const f = it.f;
    const sx = f.u0 * AW;
    const sy = (1 - f.v1) * AH;
    const sw = (f.u1 - f.u0) * AW;
    const sh = (f.v1 - f.v0) * AH;
    g.save();
    g.translate(px + it.w.x * scale, py - it.w.y * scale);
    g.rotate(-it.w.r);
    if (it.flipX) g.scale(-1, 1);
    g.filter = it.tint < 1 ? `brightness(${it.tint})` : 'none';
    g.drawImage(atlas.canvas, sx, sy, sw, sh, -f.ox * scale * S, -(f.h - f.oy) * scale * S, f.w * scale * S, f.h * scale * S);
    g.restore();
  }
}

/* ------------------------------------------------------------ the HUD */

export class Hud {
  constructor(root, { touch }) {
    this.root = root;
    this.el = el('div', 'kw-hud');
    this.el.innerHTML = `
      <canvas class="kw-emblem" width="660" height="280"></canvas>
      <div class="kw-gems"><canvas width="44" height="52"></canvas><span>× 0</span></div>
      <div class="kw-tags">
        <div class="kw-tag kw-tag--summon" data-t="summon"><i></i><kbd>Q</kbd><span>Summon</span><small></small></div>
        <div class="kw-tag" data-t="ranged"><i></i><kbd>RMB</kbd><span></span><small></small></div>
        <div class="kw-tag" data-t="dash"><i></i><kbd>Space</kbd><span></span><small></small></div>
        <div class="kw-tag" data-t="potion"><i></i><kbd>R</kbd><span>Hearth draught</span><small></small></div>
      </div>
      <canvas class="kw-map" width="460" height="372"></canvas>
      <div class="kw-map__name"></div>
      <div class="kw-boss"><b></b><div class="kw-boss__bar"><u></u><i></i><s style="left:33.3%"></s><s style="left:66.6%"></s></div></div>
      <div class="kw-toast"><b></b><span></span></div>
      <div class="kw-note"></div>
      <div class="kw-prompt"></div>
      <div class="kw-perf"></div>`;
    root.append(this.el);
    this.emblem = this.el.querySelector('.kw-emblem');
    this.eg = this.emblem.getContext('2d');
    this.map = this.el.querySelector('.kw-map');
    this.mg = this.map.getContext('2d');
    this.mapName = this.el.querySelector('.kw-map__name');
    this.boss = this.el.querySelector('.kw-boss');
    this.toastEl = this.el.querySelector('.kw-toast');
    this.noteEl = this.el.querySelector('.kw-note');
    this.promptEl = this.el.querySelector('.kw-prompt');
    this.perf = this.el.querySelector('.kw-perf');
    this.tags = Object.fromEntries([...this.el.querySelectorAll('[data-t]')].map((t) => [t.dataset.t, t]));
    this.paintGem(this.el.querySelector('.kw-gems canvas'));
    this.gemText = this.el.querySelector('.kw-gems span');
    this.lastHp = 1;
    this.trail = 1;
    this.mapBase = null;
    this.visible = false;
    this.show(false);
  }

  show(on) {
    this.visible = on;
    this.el.style.display = on ? '' : 'none';
  }

  paintGem(c) {
    const g = c.getContext('2d');
    g.translate(22, 4);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(14, 16);
    g.lineTo(9, 42);
    g.lineTo(-9, 42);
    g.lineTo(-14, 16);
    g.closePath();
    const grad = g.createLinearGradient(-14, 0, 14, 42);
    grad.addColorStop(0, '#fff2c0');
    grad.addColorStop(0.4, '#ff9a3a');
    grad.addColorStop(1, '#8a2a0a');
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = 3.5;
    g.strokeStyle = INK;
    g.stroke();
    g.beginPath();
    g.moveTo(0, 2);
    g.lineTo(0, 40);
    g.moveTo(-13, 16);
    g.lineTo(13, 16);
    g.lineWidth = 1.6;
    g.strokeStyle = 'rgba(90,30,10,0.7)';
    g.stroke();
  }

  /** A brush-stroke ribbon: wobbly ends, ink edge, fill to k. */
  ribbon(g, x, y, w, h, k, colors, trail = k, seed = 1) {
    const path = (len) => {
      const p = new Path2D();
      p.moveTo(x, y + h * 0.15);
      const n = 12;
      for (let i = 1; i <= n; i++) p.lineTo(x + (len * i) / n, y + Math.sin(i * 1.7 + seed) * 1.6);
      p.lineTo(x + len + 6, y + h * 0.5);
      for (let i = n; i >= 0; i--) p.lineTo(x + (len * i) / n, y + h + Math.sin(i * 2.3 + seed) * 1.6);
      p.lineTo(x - 5, y + h * 0.55);
      p.closePath();
      return p;
    };
    const full = path(w);
    g.fillStyle = '#140e1a';
    g.fill(full);
    if (trail > k) {
      g.save();
      g.clip(full);
      g.fillStyle = 'rgba(255,240,220,0.75)';
      g.fillRect(x - 6, y - 4, (w + 12) * trail, h + 8);
      g.restore();
    }
    if (k > 0) {
      g.save();
      g.clip(full);
      const grad = g.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.45, colors[1]);
      grad.addColorStop(1, colors[2]);
      g.fillStyle = grad;
      g.fillRect(x - 6, y - 4, (w + 12) * k, h + 8);
      // brush streaks
      g.globalAlpha = 0.25;
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(x + i * 31, y + h * 0.3);
        g.lineTo(x + Math.min(w * k, i * 31 + 22), y + h * 0.3);
        g.stroke();
      }
      g.restore();
    }
    g.lineWidth = 5;
    g.strokeStyle = INK;
    g.lineJoin = 'round';
    g.stroke(full);
  }

  /** Repaint the medallion, ribbons, pips and draughts. */
  paintEmblem(hero, time) {
    const g = this.eg;
    g.clearRect(0, 0, 660, 280);
    g.save();
    g.scale(2, 2);
    const D = hero.def;
    const cx = 64;
    const cy = 64;
    // health and spark ribbons behind the medallion
    const hpK = hero.hp / hero.maxHp;
    this.trail = Math.max(hpK, this.trail - 0.4 / 60);
    if (hpK > this.trail) this.trail = hpK;
    this.ribbon(g, 104, 30, 200, 26, hpK, ['#ff9a8a', '#d8283a', '#7a0e22'], this.trail, 1);
    g.font = "900 14px 'Nunito Variable', system-ui, sans-serif";
    g.lineWidth = 4;
    g.strokeStyle = INK;
    g.fillStyle = '#fff2e0';
    g.strokeText(`${Math.ceil(hero.hp)} / ${hero.maxHp}`, 118, 49);
    g.fillText(`${Math.ceil(hero.hp)} / ${hero.maxHp}`, 118, 49);
    const eK = hero.energy / D.energy;
    this.ribbon(g, 104, 62, 160, 12, eK, ['#fff0b0', '#ffb43a', '#b05a10'], eK, 3);
    // the summon threshold on the spark ribbon
    const tx = 104 + 160 * (D.summon.cost / D.energy);
    g.fillStyle = INK;
    g.fillRect(tx - 1.5, 58, 3, 20);
    // ammo pips: flame diamonds
    for (let i = 0; i < D.ranged.pips; i++) {
      const x = 116 + i * 24;
      const y = 96;
      const p = new Path2D();
      p.moveTo(x, y - 11);
      p.quadraticCurveTo(x + 8, y - 2, x, y + 10);
      p.quadraticCurveTo(x - 8, y - 2, x, y - 11);
      g.fillStyle = '#1e1626';
      g.fill(p);
      const fill = i < hero.pips ? 1 : i === hero.pips ? hero.pipT / D.ranged.recharge : 0;
      if (fill > 0) {
        g.save();
        g.clip(p);
        const gr = g.createLinearGradient(0, y - 11, 0, y + 10);
        gr.addColorStop(0, '#fff6c0');
        gr.addColorStop(0.5, i < hero.pips ? '#ffa43a' : '#a8642a');
        gr.addColorStop(1, '#c0420e');
        g.fillStyle = gr;
        g.fillRect(x - 9, y + 10 - 21 * fill, 18, 21 * fill);
        g.restore();
      }
      g.lineWidth = 3;
      g.strokeStyle = INK;
      g.stroke(p);
    }
    // draughts
    const px = 116 + D.ranged.pips * 24 + 14;
    for (let i = 0; i < Math.min(5, hero.potions); i++) {
      const x = px + i * 15;
      const y = 92;
      g.beginPath();
      g.arc(x, y + 3, 6.5, 0, Math.PI * 2);
      g.rect(x - 2.5, y - 8, 5, 6);
      g.fillStyle = '#d8283a';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = INK;
      g.stroke();
      g.fillStyle = 'rgba(255,220,220,0.8)';
      g.fillRect(x - 3, y + 0, 2, 3);
    }
    // the medallion: a bronze ring, dark glass, an ember heart filled by spark
    g.beginPath();
    g.arc(cx, cy, 56, 0, Math.PI * 2);
    g.fillStyle = INK;
    g.fill();
    const ring = g.createLinearGradient(cx - 50, cy - 50, cx + 50, cy + 50);
    ring.addColorStop(0, '#f0c070');
    ring.addColorStop(0.5, '#a8682a');
    ring.addColorStop(1, '#5a3010');
    g.beginPath();
    g.arc(cx, cy, 51, 0, Math.PI * 2);
    g.fillStyle = ring;
    g.fill();
    // notches round the ring
    g.strokeStyle = 'rgba(40,20,10,0.6)';
    g.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
      g.lineTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50);
      g.stroke();
    }
    const glass = g.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, 42);
    glass.addColorStop(0, '#3a3058');
    glass.addColorStop(1, '#0e0a18');
    g.beginPath();
    g.arc(cx, cy, 41, 0, Math.PI * 2);
    g.fillStyle = glass;
    g.fill();
    g.lineWidth = 3.5;
    g.strokeStyle = INK;
    g.stroke();
    // the heart-flame
    const fl = new Path2D();
    const wob = Math.sin(time * 9) * 1.5;
    fl.moveTo(cx + wob, cy - 30);
    fl.bezierCurveTo(cx + 26, cy - 8, cx + 22, cy + 22, cx, cy + 28);
    fl.bezierCurveTo(cx - 22, cy + 22, cx - 26, cy - 8, cx + wob, cy - 30);
    g.fillStyle = '#20182a';
    g.fill(fl);
    const ready = hero.energy >= D.summon.cost;
    g.save();
    g.clip(fl);
    const fy = cy + 28 - 58 * eK;
    const fg = g.createLinearGradient(0, cy - 30, 0, cy + 28);
    fg.addColorStop(0, '#fffbe0');
    fg.addColorStop(0.4, ready ? '#ffc04a' : '#d88a3a');
    fg.addColorStop(1, ready ? '#e0401a' : '#8a3a1a');
    g.fillStyle = fg;
    g.fillRect(cx - 30, fy, 60, 70);
    // a wavy surface
    g.fillStyle = 'rgba(255,250,220,0.6)';
    g.beginPath();
    for (let x = -28; x <= 28; x += 4) g.lineTo(cx + x, fy + Math.sin(x * 0.3 + time * 6) * 1.6);
    g.lineTo(cx + 28, fy + 3);
    g.lineTo(cx - 28, fy + 3);
    g.fill();
    g.restore();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke(fl);
    if (ready) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(cx, cy, 0, cx, cy, 46);
      gl.addColorStop(0, `rgba(255,160,60,${0.35 + 0.15 * Math.sin(time * 5)})`);
      gl.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gl;
      g.fillRect(cx - 50, cy - 50, 100, 100);
      g.restore();
    }
    g.restore();
  }

  /** The minimap: rooms you've seen, where you are, the beacons and the gate. */
  paintMap(game) {
    const g = this.mg;
    const cw = 460;
    const ch = 372;
    if (!this.mapBase) {
      this.mapBase = document.createElement('canvas');
      this.mapBase.width = cw;
      this.mapBase.height = ch;
    }
    const s = Math.min((cw - 20) / 84, (ch - 20) / 76);
    const ox = 10 - 4 * s;
    const oy = 10;
    const X = (x) => ox + x * s;
    const Y = (y) => oy + (78 - y) * s;
    g.clearRect(0, 0, cw, ch);
    const seen = game.seenRooms;
    const here = game.room;
    // floor tiles of seen rooms and the corridors between seen rooms
    const grid = game.level.grid;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y * W + x] === WALL) continue;
        const r = roomAt(x + 0.5, y + 0.5);
        const corridor = !r;
        if (r && !seen.has(r)) continue;
        if (corridor) {
          const c = CORRIDORS.find((cc) => x >= cc.x0 && x <= cc.x1 && y >= cc.y0 && y <= cc.y1);
          if (!c || !(seen.has(c.from) || seen.has(c.to))) continue;
        }
        g.fillStyle = r === here ? '#d8c8b0' : corridor ? '#6a6276' : '#8a8298';
        g.fillRect(X(x), Y(y + 1), s + 0.6, s + 0.6);
      }
    }
    // doors
    for (const p of game.level.props) {
      if (p.kind !== 'barricade' && p.kind !== 'gate') continue;
      if (game.level.open.has(p.id)) continue;
      const c = CORRIDORS.find((cc) => p.x >= cc.x0 && p.x <= cc.x1 && p.y >= cc.y0 && p.y <= cc.y1);
      if (!c || !(seen.has(c.from) || seen.has(c.to))) continue;
      g.fillStyle = p.kind === 'gate' ? '#7ab8ff' : '#a8683a';
      g.fillRect(X(p.x), Y(p.y + 1), s + 0.6, s + 0.6);
    }
    // braziers: lit = ember, beacons bigger
    for (const p of game.level.props) {
      if (!(p.kind === 'brazier' || p.kind === 'greatbrazier')) continue;
      const r = roomAt(p.x + 0.5, p.y + 0.5);
      if (!seen.has(r)) continue;
      const big = p.beacon ? 4.5 : 3;
      g.beginPath();
      g.arc(X(p.x + 0.5), Y(p.y + 0.5), big, 0, Math.PI * 2);
      g.fillStyle = p.lit ? '#ffa43a' : '#3a3448';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = p.beacon ? '#ffe2a8' : INK;
      g.stroke();
    }
    // foes in your room
    for (const e of game.enemies) {
      if (e.dead || e.room !== here) continue;
      g.fillStyle = e.type === 'jarl' ? '#8ad8ff' : '#ff5a4a';
      g.beginPath();
      g.arc(X(e.x), Y(e.y), e.type === 'jarl' ? 5 : 2.6, 0, Math.PI * 2);
      g.fill();
    }
    // you: an arrow
    const h = game.hero;
    g.save();
    g.translate(X(h.x), Y(h.y));
    g.rotate(-h.aim);
    g.beginPath();
    g.moveTo(8, 0);
    g.lineTo(-5, 5);
    g.lineTo(-2, 0);
    g.lineTo(-5, -5);
    g.closePath();
    g.fillStyle = '#ffd27a';
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = INK;
    g.stroke();
    g.restore();
    const name = ROOMS.find((r) => r.id === here)?.name ?? '';
    if (this.mapName.textContent !== name) this.mapName.textContent = name;
  }

  update(game, time) {
    if (!this.visible) return;
    const h = game.hero;
    if (!h) return;
    this.paintEmblem(h, time);
    if (!this._mt || time - this._mt > 0.12) {
      this._mt = time;
      this.paintMap(game);
    }
    if (this.gemText.textContent !== `× ${game.gems}`) this.gemText.textContent = `× ${game.gems}`;
    const D = h.def;
    const tag = (id, k, ready, label, small) => {
      const t = this.tags[id];
      t.querySelector('i').style.width = `${Math.round(Math.min(1, k) * 100)}%`;
      t.classList.toggle('ready', ready);
      const sp = t.querySelector('span');
      if (sp.textContent !== label) sp.textContent = label;
      const sm = t.querySelector('small');
      if (sm.textContent !== small) sm.textContent = small;
    };
    const summonUp = game.summons.find((s) => !s.gone);
    tag('summon', summonUp ? summonUp.life / summonUp.max : h.energy / D.summon.cost, h.energy >= D.summon.cost, `Summon · ${D.summon.name}`, summonUp ? `${Math.ceil(summonUp.life)}s` : h.energy >= D.summon.cost ? 'ready' : `${Math.floor(h.energy)}/${D.summon.cost}`);
    tag('ranged', (h.pips + h.pipT / D.ranged.recharge) / D.ranged.pips, h.pips > 0, D.ranged.name, `${h.pips}/${D.ranged.pips}`);
    tag('dash', 1 - h.dashCool / (D.dash.cooldown + D.dash.dur), h.dashCool <= 0, D.dash.name, '');
    tag('potion', Math.min(1, h.potions / 3), h.potions > 0, 'Hearth draught', `×${h.potions}`);
    // boss
    const j = game.jarl;
    const on = !!(j && !j.dead && j.brain.state !== 'idle' && game.room === 'throne');
    this.boss.classList.toggle('on', on);
    if (j) {
      this.boss.querySelector('b').textContent = `${j.def.name.toUpperCase()}`;
      const k = Math.max(0, j.hp / j.maxHp);
      this.boss.querySelector('i').style.width = `${k * 100}%`;
      this.boss.querySelector('u').style.width = `${k * 100}%`;
    }
  }

  toast(title, sub = '', secs = 2.6) {
    this.toastEl.querySelector('b').textContent = title;
    this.toastEl.querySelector('span').textContent = sub;
    this.toastEl.classList.add('on');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.toastEl.classList.remove('on'), secs * 1000);
  }

  note(text, secs = 2) {
    this.noteEl.textContent = text;
    this.noteEl.classList.add('on');
    clearTimeout(this._nt);
    this._nt = setTimeout(() => this.noteEl.classList.remove('on'), secs * 1000);
  }

  prompt(text, at) {
    if (!text || !at) {
      this.promptEl.classList.remove('on');
      return;
    }
    if (this.promptEl.innerHTML !== text) this.promptEl.innerHTML = text;
    this.promptEl.style.left = `${at[0]}px`;
    this.promptEl.style.top = `${at[1]}px`;
    this.promptEl.classList.add('on');
  }

  dispose() {
    clearTimeout(this._tt);
    clearTimeout(this._nt);
    this.el.remove();
  }
}

/* ------------------------------------------------------------ panels */

export function creditsHtml() {
  const items = PACKS.map((p) => `<li><b>${esc(p.name)}</b> — ${esc(p.what)}.<br><a href="${esc(p.site)}" target="_blank" rel="noopener">${esc(p.site)}</a> · <a href="${esc(p.licenceUrl)}" target="_blank" rel="noopener">${esc(p.licence)}</a></li>`).join('');
  return `<h2>Credits</h2><ul>${items}</ul><p><small>${esc(OWN)}</small></p>`;
}

export function controlsHtml(touch) {
  const rows = [
    ['WASD / arrows', 'Move'],
    ['Mouse', 'Aim (blows and throws go where you point)'],
    ['Left click / J', 'Strike — tap three times for the full chain; hold for a charged blow'],
    ['Right click / K', 'Throw (ammo pips refill over time)'],
    ['Space / Shift', 'Dash — untouchable for a moment'],
    ['Q', 'Summon (needs spark: land blows to gather it)'],
    ['R', 'Drink a hearth draught — no cooldown, ever'],
    ['E', 'Light or douse a brazier or torch'],
    ['Esc / P', 'Pause, controls, credits']
  ];
  const pad = 'Gamepad: left stick moves, right stick aims; X strikes (hold to charge), RT throws, A dashes, Y summons, LB drinks, B lights, Start pauses.';
  const tch = 'Touch: a stick under your left thumb; buttons for strike (hold to charge), dash, throw, summon, draught and light. Blows aim at the nearest foe.';
  return `<h2>Controls</h2><div class="kw-keys">${rows.map(([k, v]) => `<span><kbd>${esc(k)}</kbd></span><span>${esc(v)}</span>`).join('')}</div><p>${pad}</p><p>${tch}</p>`;
}

export class Panels {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.open = null;
  }

  close() {
    this.open?.remove();
    this.open = null;
  }

  panel(html, cls = '') {
    this.close();
    const p = el('div', `kw-panel kw-center ${cls}`, html);
    p.setAttribute('role', 'dialog');
    this.root.append(p);
    this.open = p;
    p.querySelector('button')?.focus();
    return p;
  }

  /** The start screen: pick a hero (painted portraits), start, credits, controls, leave. */
  start(atlas, picked, onPick, onGo, onLeave, best) {
    this.close();
    const wrap = el('div', 'kw-start');
    const cards = HERO_ORDER.map((id) => `<button class="kw-hero" data-hero="${id}" aria-pressed="${id === picked}"><canvas width="260" height="260"></canvas><b>${esc(HEROES[id].name)}</b><span>${esc(HEROES[id].title)}</span></button>`).join('');
    wrap.innerHTML = `<div class="kw-panel kw-start__panel">
      <div class="kw-title">KINDLEWATCH</div>
      <div class="kw-sub">the keep of the last fires</div>
      <div class="kw-heroes">${cards}</div>
      <p class="kw-blurb"></p>
      <div class="kw-btns">
        <button class="kw-btn kw-btn--go" data-go>Light the first fire</button>
        <button class="kw-btn" data-controls>Controls</button>
        <button class="kw-btn" data-credits>Credits</button>
        <button class="kw-btn kw-btn--quiet" data-leave>Leave</button>
      </div>
      <p class="kw-start__note">The opening map of a top-down action game: six rooms of a snowed-in fortress, five kinds of foe and the frost giant on the Rime Throne. No story yet.${best ? ` Embershards gathered so far: ${best}.` : ''}</p>
    </div>`;
    this.root.append(wrap);
    this.open = wrap;
    const blurb = wrap.querySelector('.kw-blurb');
    const sel = (id) => {
      for (const b of wrap.querySelectorAll('[data-hero]')) b.setAttribute('aria-pressed', String(b.dataset.hero === id));
      blurb.textContent = HEROES[id].blurb;
      onPick(id);
    };
    for (const b of wrap.querySelectorAll('[data-hero]')) {
      drawPortrait(b.querySelector('canvas'), atlas, b.dataset.hero, 0.5);
      b.addEventListener('click', () => sel(b.dataset.hero));
    }
    blurb.textContent = HEROES[picked].blurb;
    wrap.querySelector('[data-go]').addEventListener('click', onGo);
    wrap.querySelector('[data-leave]').addEventListener('click', onLeave);
    wrap.querySelector('[data-credits]').addEventListener('click', () => this.sub(creditsHtml(), 'kw-credits', () => this.start(atlas, this.game.picked, onPick, onGo, onLeave, best)));
    wrap.querySelector('[data-controls]').addEventListener('click', () => this.sub(controlsHtml(), '', () => this.start(atlas, this.game.picked, onPick, onGo, onLeave, best)));
    wrap.querySelector('[data-go]').focus();
    return wrap;
  }

  sub(html, cls, back) {
    const p = this.panel(`${html}<div class="kw-btns"><button class="kw-btn" data-back>Back</button></div>`, cls);
    p.querySelector('[data-back]').addEventListener('click', back);
    p.querySelector('[data-back]').focus();
  }

  pause({ onResume, onRestart, onLeave }) {
    const p = this.panel(`<h2>Paused</h2><p>The fires keep burning while you rest.</p><div class="kw-btns" style="flex-direction:column;align-items:stretch">
      <button class="kw-btn kw-btn--go" data-resume>Resume</button>
      <button class="kw-btn" data-controls>Controls</button>
      <button class="kw-btn" data-credits>Credits</button>
      <button class="kw-btn" data-restart>Start the keep again</button>
      <button class="kw-btn kw-btn--quiet" data-leave>Leave Kindlewatch</button></div>`);
    const again = () => this.pause({ onResume, onRestart, onLeave });
    p.querySelector('[data-resume]').addEventListener('click', onResume);
    p.querySelector('[data-controls]').addEventListener('click', () => this.sub(controlsHtml(), '', again));
    p.querySelector('[data-credits]').addEventListener('click', () => this.sub(creditsHtml(), 'kw-credits', again));
    p.querySelector('[data-restart]').addEventListener('click', onRestart);
    p.querySelector('[data-leave]').addEventListener('click', onLeave);
  }

  fallen(onRise) {
    const p = this.panel(`<h2>The cold took you</h2><p>Rise again by the last fire you lit. Foes you felled stay fallen.</p><div class="kw-btns"><button class="kw-btn kw-btn--go" data-rise>Rise by the fire</button></div>`);
    p.querySelector('[data-rise]').addEventListener('click', onRise);
  }

  victory(stats, onGo) {
    const p = this.panel(`<h2>The Rime Throne is quiet</h2><p>Hrimgar has fallen, and the great brazier can burn again. This is where the road out of Kindlewatch begins — the rest of the journey isn't written yet.</p><p>Time ${esc(stats.time)} · Embershards ${stats.gems} · Foes felled ${stats.kills}</p><div class="kw-btns"><button class="kw-btn kw-btn--go" data-go>Walk the keep</button></div>`);
    p.querySelector('[data-go]').addEventListener('click', onGo);
  }
}

/* ------------------------------------------------------------ touch */

export class TouchControls {
  constructor(root, input) {
    this.el = el('div', 'kw-touch');
    this.el.innerHTML = `<div class="kw-stick"><div class="kw-stick__base"></div><div class="kw-stick__knob"></div></div>
      <div class="kw-tbtns">
        <button class="kw-tb kw-tb--attack" data-b="Attack">Strike</button>
        <button class="kw-tb kw-tb--dash" data-b="Dash">Dash</button>
        <button class="kw-tb kw-tb--ranged" data-b="Ranged">Throw</button>
        <button class="kw-tb kw-tb--summon" data-b="Summon">Call</button>
        <button class="kw-tb kw-tb--potion" data-b="Potion">Drink</button>
        <button class="kw-tb kw-tb--use" data-b="Use">Light</button>
      </div>
      <button class="kw-tb kw-tb--menu" data-b="Menu" aria-label="Pause">❚❚</button>`;
    root.append(this.el);
    this.input = input;
    for (const b of this.el.querySelectorAll('[data-b]')) {
      const id = b.dataset.b;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('down');
        if (id === 'Menu') input.pressed.add('Escape');
        else input.touchPress(id, true);
      });
      const up = (e) => {
        e.preventDefault();
        b.classList.remove('down');
        if (id !== 'Menu') input.touchPress(id, false);
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    }
    const stickEl = this.el.querySelector('.kw-stick');
    const knob = this.el.querySelector('.kw-stick__knob');
    this._down = (e) => {
      if (e.pointerType !== 'touch') return;
      if (e.target.closest('button, .kw-panel')) return;
      if (e.clientX > innerWidth * 0.5 || input.stick.id !== null) return;
      input.stick.id = e.pointerId;
      input.stick.ox = e.clientX;
      input.stick.oy = e.clientY;
      stickEl.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 60}px)`;
    };
    this._move = (e) => {
      if (e.pointerId !== input.stick.id) return;
      let dx = (e.clientX - input.stick.ox) / 50;
      let dy = -(e.clientY - input.stick.oy) / 50;
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      input.stick.x = dx;
      input.stick.y = dy;
      knob.style.transform = `translate(${dx * 36}px, ${-dy * 36}px)`;
    };
    this._up = (e) => {
      if (e.pointerId !== input.stick.id) return;
      input.stick.id = null;
      input.stick.x = 0;
      input.stick.y = 0;
      knob.style.transform = '';
      stickEl.style.transform = 'translate(-200px, -200px)';
    };
    root.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    this.root = root;
  }

  show(on) {
    this.el.style.display = on ? '' : 'none';
  }

  dispose() {
    this.root.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    this.el.remove();
  }
}
