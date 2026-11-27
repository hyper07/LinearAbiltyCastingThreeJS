/**
 * The Studio runtime's HUD: hearts and score, the map's name and goal, an always-on corner
 * minimap (the RPG standard), a boss bar, what a helper says, the pause card (Resume, Restart
 * map, Credits, Leave) and the end-of-game card. Plain DOM over the canvas.
 */
const CSS = `
.sg-hud{position:absolute;inset:0;pointer-events:none;font:700 15px/1.3 Nunito Variable,system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7);user-select:none}
.sg-hud__tl{position:absolute;top:10px;left:12px;display:flex;flex-direction:column;gap:2px}
.sg-hud__hearts{font-size:20px;letter-spacing:2px}
.sg-hud__top{position:absolute;top:10px;left:50%;transform:translateX(-50%);text-align:center;background:rgba(10,12,30,.35);padding:4px 12px;border-radius:12px;max-width:60%}
.sg-hud__goal{font-size:12px;font-weight:600;opacity:.9}
.sg-hud__map{position:absolute;top:10px;right:10px;width:132px;height:132px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.4);background:rgba(0,0,0,.35)}
.sg-hud__boss{position:absolute;bottom:52px;left:50%;transform:translateX(-50%);width:min(420px,70%);display:none}
.sg-hud__boss b{display:block;text-align:center;font-size:13px}
.sg-hud__bar{height:10px;border-radius:6px;background:rgba(0,0,0,.5);overflow:hidden;border:1px solid rgba(255,255,255,.6)}
.sg-hud__bar i{display:block;height:100%;background:linear-gradient(90deg,#ff5a6a,#ffb04a)}
.sg-hud__talk{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#fffaf0;color:#2a2040;text-shadow:none;border-radius:14px;padding:8px 14px;max-width:min(520px,80%);display:none;box-shadow:0 3px 10px rgba(0,0,0,.3)}
.sg-hud__hint{position:absolute;bottom:6px;left:12px;font-size:11px;font-weight:600;opacity:.75}
.sg-hud__toast{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-size:30px;font-weight:900;opacity:0;transition:opacity .3s;text-align:center}
.sg-hud__x{position:absolute;bottom:8px;right:10px;pointer-events:auto;font:inherit;font-size:12px;background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:3px 9px;cursor:pointer}
.sg-card{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,8,24,.6);pointer-events:auto}
.sg-card__box{background:#1f2236;border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:9px;min-width:240px;max-width:min(520px,90%);max-height:80%;overflow:auto;text-align:center}
.sg-card__box button{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid #556;background:#2d3250;color:#fff;cursor:pointer}
.sg-card__box button:hover{background:#3a4170}
.sg-card__credits{text-align:left;font-size:12px;font-weight:600;line-height:1.5}
.sg-card__credits a{color:#9fd6ff}
`;

function styles() {
  if (document.getElementById('sg-hud-css')) return;
  const s = document.createElement('style');
  s.id = 'sg-hud-css';
  s.textContent = CSS;
  document.head.append(s);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class StudioHud {
  constructor(root, { onResume, onRestart, onLeave, hint, credits }) {
    styles();
    this.el = document.createElement('div');
    this.el.className = 'sg-hud';
    this.el.innerHTML = `
      <div class="sg-hud__tl"><span class="sg-hud__hearts" data-hearts></span><span data-score></span></div>
      <div class="sg-hud__top"><div data-mapname></div><div class="sg-hud__goal" data-goal></div></div>
      <canvas class="sg-hud__map" width="132" height="132" data-minimap aria-label="Minimap"></canvas>
      <div class="sg-hud__boss" data-boss><b data-bossname></b><div class="sg-hud__bar"><i data-bossbar></i></div></div>
      <div class="sg-hud__talk" data-talk></div>
      <div class="sg-hud__toast" data-toast></div>
      <div class="sg-hud__hint" data-hint></div>
      ${onLeave ? '<button type="button" class="sg-hud__x" data-x>Leave ✕</button>' : ''}`;
    this.el.querySelector('[data-hint]').textContent = hint;
    this.el.querySelector('[data-x]')?.addEventListener('click', () => onLeave());
    root.append(this.el);
    this.map = this.el.querySelector('[data-minimap]').getContext('2d');
    Object.assign(this, { onResume, onRestart, onLeave, credits });
    this._last = {};
  }

  _set(key, sel, text) {
    if (this._last[key] === text) return;
    this._last[key] = text;
    this.el.querySelector(sel).textContent = text;
  }

  status({ hearts, maxHearts, score, mapName, goal }) {
    this._set('hearts', '[data-hearts]', `${'♥'.repeat(Math.max(0, hearts))}${'♡'.repeat(Math.max(0, maxHearts - hearts))}`);
    this._set('score', '[data-score]', `★ ${score}`);
    this._set('map', '[data-mapname]', mapName);
    this._set('goal', '[data-goal]', goal);
  }

  boss(name, frac) {
    const box = this.el.querySelector('[data-boss]');
    box.style.display = name ? 'block' : 'none';
    if (!name) return;
    this._set('boss', '[data-bossname]', name);
    this.el.querySelector('[data-bossbar]').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }

  talk(text) {
    const box = this.el.querySelector('[data-talk]');
    box.style.display = text ? 'block' : 'none';
    if (text) this._set('talk', '[data-talk]', text);
  }

  toast(text, ms = 1400) {
    const t = this.el.querySelector('[data-toast]');
    t.textContent = text;
    t.style.opacity = '1';
    clearTimeout(this._toast);
    this._toast = setTimeout(() => (t.style.opacity = '0'), ms);
  }

  /** The minimap: the map's bounds, the player (white), monsters (red), things to collect (gold), the door. */
  minimap({ area, player, foes, items, door, doorOpen, markers = [], water = [] }) {
    const g = this.map;
    const w = 132;
    const span = Math.max(area.x1 - area.x0, area.z1 - area.z0);
    const sx = (x) => w / 2 + ((x - player.x) / Math.min(span, 40)) * w;
    const sz = (z) => w / 2 + ((z - player.z) / Math.min(span, 40)) * w;
    g.clearRect(0, 0, w, w);
    g.fillStyle = 'rgba(40,60,50,.55)';
    g.fillRect(sx(area.x0), sz(area.z0), ((area.x1 - area.x0) / Math.min(span, 40)) * w, ((area.z1 - area.z0) / Math.min(span, 40)) * w);
    g.fillStyle = 'rgba(80,170,240,.7)';
    for (const wt of water) {
      g.beginPath();
      g.ellipse(sx(wt.x), sz(wt.z), (wt.rx / Math.min(span, 40)) * w, (wt.rz / Math.min(span, 40)) * w, 0, 0, Math.PI * 2);
      g.fill();
    }
    const dot = (x, z, r, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(sx(x), sz(z), r, 0, Math.PI * 2);
      g.fill();
    };
    for (const it of items) dot(it.x, it.z, 2, '#ffd84a');
    for (const m of markers) dot(m.x, m.z, 3.5, '#8ae8ff');
    for (const f of foes) dot(f.x, f.z, f.boss ? 4.5 : 3, f.friend ? '#7ae87a' : '#ff5a5a');
    dot(door.x, door.z, 5, doorOpen ? '#fff07a' : 'rgba(255,240,122,.4)');
    dot(player.x, player.z, 4, '#ffffff');
  }

  card(html, buttons) {
    this.closeCard();
    const card = document.createElement('div');
    card.className = 'sg-card';
    card.innerHTML = `<div class="sg-card__box">${html}</div>`;
    const box = card.firstElementChild;
    for (const [label, fn] of buttons) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      box.append(b);
    }
    this.el.append(card);
    this.cardEl = card;
    box.querySelector('button')?.focus();
  }

  closeCard() {
    this.cardEl?.remove();
    this.cardEl = null;
  }

  pause(on) {
    if (!on) return this.closeCard();
    const buttons = [['Resume', this.onResume], ['Restart map', this.onRestart], ['Credits', () => this.showCredits(() => this.pause(true))]];
    if (this.onLeave) buttons.push(['Leave', this.onLeave]);
    this.card('<b>Paused</b>', buttons);
  }

  showCredits(back) {
    const rows = this.credits()
      .map((c) => `<div>${esc(c.what)} — ${esc(c.who)}${c.site ? ` (<a href="${esc(c.site)}" target="_blank" rel="noopener noreferrer">${esc(c.site.replace(/^https?:\/\//, ''))}</a>)` : ''}, ${esc(c.licence)}</div>`)
      .join('');
    this.card(`<b>Credits</b><div class="sg-card__credits">${rows}</div>`, [['Back', back]]);
  }

  dispose() {
    clearTimeout(this._toast);
    this.el.remove();
  }
}

export { esc };
