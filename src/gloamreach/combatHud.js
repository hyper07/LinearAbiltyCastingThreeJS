/**
 * The fight on the HUD, in Gloamreach's quiet gilded style: health, the
 * resource (mana, energy or stamina) and experience at the bottom, the skill
 * bar (left and right mouse, 1–4) with cooldown sweeps and the two potions
 * (Q, R), a frame for the monster under the pointer, a great bar for the
 * boss, health bars over monsters in a fight, damage numbers (crits in gold),
 * loot toasts, the prompt to open or trade, a red edge when hurt, and the
 * veil when the hero falls.
 */
import * as THREE from 'three';
import { el, esc } from './ui.js';
import { RARITIES, POTIONS, BASES } from './items.js';
import { RESOURCES } from './rules.js';

/* ------------------------------------------------------------------ skill glyphs */

const CLASS_TONE = { knight: ['#3a2a14', '#b8813a'], ranger: ['#1e2c14', '#7aa04a'], mage: ['#221640', '#8a6ae0'] };

/** A skill's picture: a glyph in light over a gem-cut ground in the class's colour. */
export function skillIcon(id, cls, size = 96) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const [dark, light] = CLASS_TONE[cls] ?? CLASS_TONE.knight;
  const bg = g.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
  bg.addColorStop(0, light);
  bg.addColorStop(1, dark);
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.save();
  g.translate(size / 2, size / 2);
  g.scale(size / 100, size / 100);
  g.strokeStyle = '#fff6e0';
  g.fillStyle = '#fff6e0';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = 'rgba(255, 220, 150, 0.9)';
  g.shadowBlur = 10;
  const line = (w, pts) => {
    g.lineWidth = w;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  };
  const arc = (w, r, a0, a1) => {
    g.lineWidth = w;
    g.beginPath();
    g.arc(0, 0, r, a0, a1);
    g.stroke();
  };
  const arrow = (x0, y0, x1, y1, w = 5) => {
    line(w, [[x0, y0], [x1, y1]]);
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.beginPath();
    g.moveTo(x1 + Math.cos(a) * 8, y1 + Math.sin(a) * 8);
    g.lineTo(x1 + Math.cos(a + 2.5) * 10, y1 + Math.sin(a + 2.5) * 10);
    g.lineTo(x1 + Math.cos(a - 2.5) * 10, y1 + Math.sin(a - 2.5) * 10);
    g.fill();
  };
  const shield = (s = 1) => {
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(-22 * s, -24 * s);
    g.lineTo(22 * s, -24 * s);
    g.quadraticCurveTo(22 * s, 18 * s, 0, 30 * s);
    g.quadraticCurveTo(-22 * s, 18 * s, -22 * s, -24 * s);
    g.stroke();
  };
  const flame = (s = 1, x = 0, y = 0) => {
    g.beginPath();
    g.moveTo(x, y + 28 * s);
    g.bezierCurveTo(x - 26 * s, y + 20 * s, x - 18 * s, y - 8 * s, x - 4 * s, y - 30 * s);
    g.bezierCurveTo(x - 2 * s, y - 12 * s, x + 10 * s, y - 14 * s, x + 8 * s, y - 2 * s);
    g.bezierCurveTo(x + 22 * s, y + 4 * s, x + 20 * s, y + 24 * s, x, y + 28 * s);
    g.fill();
  };
  switch (id) {
    case 'combo':
      arc(5, 30, -2.6, -0.6);
      arc(4, 20, 0.5, 2.4);
      line(6, [[-26, 26], [24, -24]]);
      break;
    case 'block':
      shield(1);
      line(4, [[0, -20], [0, 22]]);
      break;
    case 'bash':
      shield(0.8);
      for (let i = 0; i < 6; i++) line(3, [[Math.cos(i) * 30, Math.sin(i) * 30], [Math.cos(i) * 40, Math.sin(i) * 40]]);
      break;
    case 'charge':
      arrow(-30, 0, 26, 0, 7);
      for (const y of [-14, 14]) line(3, [[-34, y], [-12, y]]);
      break;
    case 'whirl':
      g.lineWidth = 5;
      g.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const a = t * Math.PI * 4;
        const r = 4 + t * 32;
        t ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(r, 0);
      }
      g.stroke();
      break;
    case 'slam':
      arrow(0, -34, 0, 6, 7);
      line(4, [[-30, 26], [-10, 20], [0, 28], [12, 18], [30, 26]]);
      break;
    case 'quick':
      arrow(-28, 24, 26, -22, 4);
      break;
    case 'charged':
      arrow(-28, 24, 24, -20, 6);
      for (let i = 0; i < 8; i++) line(2, [[24 + Math.cos(i * 0.8) * 12, -20 + Math.sin(i * 0.8) * 12], [24 + Math.cos(i * 0.8) * 18, -20 + Math.sin(i * 0.8) * 18]]);
      break;
    case 'multishot':
      for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) arrow(-26, 26, -26 + Math.cos(-0.785 + a) * 56, 26 + Math.sin(-0.785 + a) * 56, 3);
      break;
    case 'roll':
      arc(6, 24, 0.4, 5.4);
      arrow(Math.cos(5.4) * 24, Math.sin(5.4) * 24, Math.cos(5.6) * 24 + 4, Math.sin(5.6) * 24 + 6, 5);
      break;
    case 'rain':
      for (const x of [-22, -6, 10, 26]) arrow(x + 6, -30, x - 4, 4 + (x % 3) * 4, 3);
      line(3, [[-34, 28], [34, 28]]);
      break;
    case 'explosive':
      arrow(-28, 24, 8, -8, 4);
      for (let i = 0; i < 10; i++) line(3, [[16 + Math.cos(i * 0.63) * 6, -16 + Math.sin(i * 0.63) * 6], [16 + Math.cos(i * 0.63) * 18, -16 + Math.sin(i * 0.63) * 18]]);
      break;
    case 'firebolt':
      flame(1);
      break;
    case 'chain':
      line(6, [[-8, -34], [-18, 0], [4, -2], [-8, 34]]);
      line(3, [[4, -2], [26, 10]]);
      break;
    case 'nova':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        line(5, [[0, 0], [Math.cos(a) * 32, Math.sin(a) * 32]]);
        line(3, [[Math.cos(a) * 18, Math.sin(a) * 18], [Math.cos(a + 0.4) * 26, Math.sin(a + 0.4) * 26]]);
        line(3, [[Math.cos(a) * 18, Math.sin(a) * 18], [Math.cos(a - 0.4) * 26, Math.sin(a - 0.4) * 26]]);
      }
      break;
    case 'blink':
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(-28 + i * 12, 14 - i * 6, 3 + i, 0, Math.PI * 2);
        g.fill();
      }
      arc(4, 14, 0, Math.PI * 2);
      break;
    case 'meteor':
      g.beginPath();
      g.arc(12, 12, 14, 0, Math.PI * 2);
      g.fill();
      for (const o of [-8, 0, 8]) line(4, [[2 + o, 2 - o], [-30 + o, -30 - o]]);
      break;
    case 'ward':
      g.lineWidth = 5;
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        i ? g.lineTo(Math.cos(a) * 32, Math.sin(a) * 32) : g.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
      }
      g.stroke();
      arc(3, 16, 0, Math.PI * 2);
      break;
    case 'hp':
    case 'mp': {
      g.shadowBlur = 6;
      g.fillStyle = POTIONS[id].color;
      g.beginPath();
      g.arc(0, 10, 22, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e8eef8';
      g.fillRect(-7, -28, 14, 16);
      g.fillStyle = '#8a6440';
      g.fillRect(-8, -34, 16, 7);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(-8, 2, 6, 0, Math.PI * 2);
      g.fill();
      break;
    }
    default:
      arc(5, 24, 0, Math.PI * 2);
  }
  g.restore();
  // A bevelled edge.
  g.strokeStyle = 'rgba(255, 230, 180, 0.45)';
  g.lineWidth = size * 0.04;
  g.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
  return c;
}

/* ------------------------------------------------------------------ the HUD */

const KEY_LABEL = { LMB: 'LMB', RMB: 'RMB', 1: '1', 2: '2', 3: '3', 4: '4' };

export class CombatHud {
  constructor(hud, { cls, studio }) {
    this.hud = hud;
    this.cls = cls;
    this.studio = studio;
    const root = el('div', 'gr-fight');
    root.innerHTML = `
      <div class="gr-hurt"></div>
      <div class="gr-floats"></div>
      <div class="gr-target" hidden>
        <div class="gr-target__name"></div>
        <div class="gr-target__bar"><span></span><em></em></div>
        <div class="gr-target__sub"></div>
      </div>
      <div class="gr-boss" hidden>
        <div class="gr-boss__name"></div>
        <div class="gr-boss__bar"><span class="gr-boss__lag"></span><span class="gr-boss__fill"></span></div>
      </div>
      <div class="gr-toasts" aria-live="polite"></div>
      <div class="gr-prompt" hidden></div>
      <div class="gr-dock">
        <div class="gr-vitals">
          <div class="gr-level" title="Level"></div>
          <div class="gr-bars">
            <div class="gr-hp"><span class="gr-hp__lag"></span><span class="gr-hp__fill"></span><span class="gr-hp__ward"></span><em></em></div>
            <div class="gr-res"><span></span><em></em></div>
          </div>
        </div>
        <div class="gr-skills"></div>
        <div class="gr-xp"><span></span></div>
        <div class="gr-gold"><i></i><b></b></div>
      </div>
      <div class="gr-draw" hidden><span></span></div>
      <div class="gr-dead" hidden><div class="gr-dead__title">You have fallen</div><div class="gr-dead__sub">The lamps of Brindlewick call you home…</div></div>
      <div class="gr-cross" hidden></div>`;
    hud.el.append(root);
    this.el = root;
    const q = (s) => root.querySelector(s);
    this.$ = { hurt: q('.gr-hurt'), floats: q('.gr-floats'), target: q('.gr-target'), tName: q('.gr-target__name'), tBar: q('.gr-target__bar span'), tNum: q('.gr-target__bar em'), tSub: q('.gr-target__sub'), boss: q('.gr-boss'), bName: q('.gr-boss__name'), bFill: q('.gr-boss__fill'), bLag: q('.gr-boss__lag'), toasts: q('.gr-toasts'), prompt: q('.gr-prompt'), level: q('.gr-level'), hpFill: q('.gr-hp__fill'), hpLag: q('.gr-hp__lag'), hpWard: q('.gr-hp__ward'), hpNum: q('.gr-hp em'), res: q('.gr-res span'), resNum: q('.gr-res em'), resBar: q('.gr-res'), skills: q('.gr-skills'), xp: q('.gr-xp span'), gold: q('.gr-gold b'), draw: q('.gr-draw'), drawFill: q('.gr-draw span'), dead: q('.gr-dead'), cross: q('.gr-cross') };
    this.numbers = [];
    this.bars = new Map();
    this.hurtK = 0;
    this.lag = 1;
    this.bossLag = 1;
    this._buildBar();
  }

  _buildBar() {
    const box = this.$.skills;
    box.innerHTML = '';
    this.slots = [];
    const keys = ['LMB', 'RMB', '1', '2', '3', '4', 'Q', 'R'];
    for (const k of keys) {
      const s = el('div', `gr-slot${k === 'Q' ? ' gr-slot--gap' : ''}`);
      s.innerHTML = `<div class="gr-slot__icon"></div><div class="gr-slot__cd"></div><div class="gr-slot__t"></div><div class="gr-slot__key">${esc(KEY_LABEL[k] ?? k)}</div><div class="gr-slot__n"></div>`;
      box.append(s);
      this.slots.push({ key: k, el: s, icon: s.querySelector('.gr-slot__icon'), cd: s.querySelector('.gr-slot__cd'), t: s.querySelector('.gr-slot__t'), n: s.querySelector('.gr-slot__n'), id: null });
    }
  }

  /** Each frame: the hero's vitals and bar, the target, the boss. */
  update(dt, { vitals, bar, target, boss, camera, w, h, monsters, prompt }) {
    const v = vitals;
    // Health with a lagging shadow; the ward as a violet overlay.
    const hk = Math.max(0, v.hp / v.maxHp);
    this.lag = this.lag > hk ? Math.max(hk, this.lag - dt * 0.35) : hk;
    this.$.hpFill.style.width = `${hk * 100}%`;
    this.$.hpLag.style.width = `${this.lag * 100}%`;
    this.$.hpWard.style.width = `${Math.min(1, v.ward / v.maxHp) * 100}%`;
    this.$.hpNum.textContent = `${Math.ceil(v.hp)} / ${v.maxHp}`;
    const R = RESOURCES[v.resource];
    this.$.resBar.style.setProperty('--res', R.color);
    this.$.res.style.width = `${Math.max(0, v.res / v.maxRes) * 100}%`;
    this.$.resNum.textContent = `${Math.floor(v.res)} / ${v.maxRes} ${R.name.toLowerCase()}`;
    this.$.level.textContent = v.level;
    this.$.xp.style.width = `${(v.xp / v.next) * 100}%`;
    this.$.gold.textContent = v.gold;
    this.$.hpFill.parentElement.classList.toggle('is-low', hk < 0.3);
    // The bar.
    bar.forEach((b, i) => {
      const s = this.slots[i];
      const id = b.skill?.id ?? null;
      if (s.id !== id) {
        s.id = id;
        s.icon.innerHTML = '';
        if (b.skill) s.icon.append(skillIcon(b.skill.id, this.cls, 96));
        s.el.title = b.skill ? `${b.skill.name} — ${b.skill.desc}${b.skill.cost ? ` (${b.skill.cost} ${v.resource})` : ''}${b.skill.cd >= 1 ? `, ${b.skill.cd} s` : ''}` : '';
      }
      s.cd.style.setProperty('--cd', `${b.cd * 360}deg`);
      s.cd.style.opacity = b.cd > 0 ? 1 : 0;
      s.t.textContent = b.left > 0.95 ? Math.ceil(b.left) : '';
      s.el.classList.toggle('is-poor', !b.afford);
      s.el.classList.toggle('is-on', Boolean(b.active));
      if (b.cd <= 0 && s.wasCd) {
        s.el.classList.remove('is-ready');
        void s.el.offsetWidth;
        s.el.classList.add('is-ready');
      }
      s.wasCd = b.cd > 0;
    });
    for (const [i, kind] of [[6, 'hp'], [7, 'mp']]) {
      const s = this.slots[i];
      if (!s.id) {
        s.id = kind;
        s.icon.append(skillIcon(kind, this.cls, 96));
        s.el.title = `${POTIONS[kind].name} — ${POTIONS[kind].desc} No cooldown.`;
      }
      const n = kind === 'hp' ? v.hpPots : v.mpPots;
      s.n.textContent = n;
      s.el.classList.toggle('is-poor', n <= 0);
    }
    // The charged shot's draw.
    this.$.draw.hidden = v.draw < 0;
    if (v.draw >= 0) this.$.drawFill.style.width = `${v.draw * 100}%`;
    // The target.
    if (target && target.alive) {
      this.$.target.hidden = false;
      this.$.target.dataset.tier = target.tier;
      this.$.tName.textContent = target.name;
      this.$.tBar.style.width = `${(target.hp / target.maxHp) * 100}%`;
      this.$.tNum.textContent = `${Math.ceil(target.hp)} / ${target.maxHp}`;
      this.$.tSub.textContent = `Level ${target.level}${target.boss ? ' · Boss' : target.elite ? ' · Elite' : ''}${target.title ? ` · ${target.title}` : ''}`;
    } else this.$.target.hidden = true;
    // The boss.
    if (boss) {
      this.$.boss.hidden = false;
      const k = Math.max(0, boss.hp / boss.maxHp);
      this.bossLag = this.bossLag > k ? Math.max(k, this.bossLag - dt * 0.25) : k;
      this.$.bName.textContent = `${boss.name}, ${boss.title}`;
      this.$.bFill.style.width = `${k * 100}%`;
      this.$.bLag.style.width = `${this.bossLag * 100}%`;
    } else this.$.boss.hidden = true;
    // Bars over monsters in a fight.
    const seen = new Set();
    const p = new THREE.Vector3();
    for (const m of monsters) {
      if (!m.alive || m.engaged <= 0 || m.boss) continue;
      p.set(m.x, 0, m.z);
      p.y = m.top;
      p.project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05 || m.dist > 40) continue;
      seen.add(m.id);
      let b = this.bars.get(m.id);
      if (!b) {
        b = el('div', `gr-mbar${m.elite ? ' is-elite' : ''}`, `${m.elite ? `<div class="gr-mbar__name">${esc(m.name)}</div>` : ''}<div class="gr-mbar__track"><span></span></div>`);
        this.$.floats.append(b);
        this.bars.set(m.id, b);
        b.fill = b.querySelector('span');
      }
      b.fill.style.width = `${(m.hp / m.maxHp) * 100}%`;
      b.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      b.style.opacity = String(Math.min(1, m.engaged, (40 - m.dist) / 8));
    }
    for (const [id, b] of this.bars) if (!seen.has(id)) {
      b.remove();
      this.bars.delete(id);
    }
    // Damage numbers rise and fade.
    for (const n of this.numbers) {
      n.t += dt;
      p.copy(n.at);
      p.y += n.t * (n.kind === 'crit' ? 1.0 : 0.8);
      p.project(camera);
      const k = n.t / n.life;
      const pop = n.kind === 'crit' ? 1 + Math.max(0, 0.6 - n.t * 4) : 1 + Math.max(0, 0.25 - n.t * 2);
      n.el.style.transform = `translate(${(p.x * 0.5 + 0.5) * w + n.dx}px, ${(-p.y * 0.5 + 0.5) * h}px) translate(-50%, -50%) scale(${pop})`;
      n.el.style.opacity = String(p.z > 1 ? 0 : Math.min(1, (1 - k) * 2.5));
    }
    this.numbers = this.numbers.filter((n) => {
      if (n.t < n.life) return true;
      n.el.remove();
      return false;
    });
    // Hurt edge.
    this.hurtK = Math.max(0, this.hurtK - dt * 1.6);
    this.$.hurt.style.opacity = String(Math.max(this.hurtK, hk < 0.3 ? (0.3 - hk) * 1.6 * (0.7 + 0.3 * Math.sin(performance.now() / 180)) : 0));
    // The prompt.
    this.$.prompt.hidden = !prompt;
    if (prompt) this.$.prompt.innerHTML = prompt;
  }

  /** A number over something: dmg, crit, hurt, heal, xp, block, poison, muted. */
  number(at, value, kind = 'dmg') {
    if (this.numbers.length > 46) {
      const old = this.numbers.shift();
      old.el.remove();
    }
    const e = el('div', `gr-num gr-num--${kind}`, esc(String(value)));
    this.$.floats.append(e);
    this.numbers.push({ el: e, at: at.clone(), t: 0, life: kind === 'crit' ? 1.1 : kind === 'xp' ? 1.4 : 0.85, kind, dx: (Math.random() - 0.5) * 30 });
  }

  /** A note at the side: loot, gold, a warning. `item` shows its picture in its rarity's colour. */
  toast(text, kind = 'item', item = null, color = null) {
    const t = el('div', `gr-toast gr-toast--${kind}`);
    const rar = item ? RARITIES[item.rarity] : null;
    if (item) t.style.setProperty('--rar', rar.color);
    else if (color) t.style.setProperty('--rar', color);
    const icon = item ? `<img alt="" src="${this.studio.icon(item)}">` : kind === 'gold' ? '<i class="gr-coin"></i>' : '';
    t.innerHTML = `${icon}<span><b>${esc(text)}</b>${item ? `<small>${esc(rar.name)} ${esc(BASES[item.base].name.toLowerCase())}</small>` : ''}</span>`;
    this.$.toasts.prepend(t);
    while (this.$.toasts.children.length > 6) this.$.toasts.lastChild.remove();
    setTimeout(() => t.classList.add('is-gone'), 3800);
    setTimeout(() => t.remove(), 4600);
  }

  hurt(k) {
    this.hurtK = Math.min(1, this.hurtK + 0.35 + k);
  }

  death(on) {
    this.$.dead.hidden = !on;
  }

  crosshair(on) {
    this.$.cross.hidden = !on;
  }

  dispose() {
    this.el.remove();
  }
}
