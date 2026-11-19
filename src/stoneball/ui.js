import { CONTROLS } from './controls.js';
import { hintItems } from '../shared/helpPanel.js';
import { LEATHERS, LENGTHS } from './rules.js';

/**
 * Stoneball's screens: the start screen (tribe colours, difficulty, match
 * length), the HUD (scoreboard, power and stamina, key hints), banners
 * (GOAL!, SAVE!, golden goal), the pause menu and the full-time screen.
 * Plain DOM over the canvas; classes are prefixed `sb-`.
 */

export function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const clockText = (s) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** The key hints: the rows of controls.js marked `hint` (the same table the keys and How to play use). */
export const KEYS_HTML = hintItems(CONTROLS)
  .map((h) => `<span>${h.keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('')} ${esc(h.does)}</span>`)
  .join('');

/** The start screen. `onPlay({ mine, rival, skill, length })`, `onClose()`. */
export function startScreen(root, prefs, { onPlay, onClose }) {
  const wrap = el('div', 'sb-overlay sb-start');
  const choice = { mine: prefs.mine ?? 'tan', rival: prefs.rival ?? 'ochre', skill: prefs.skill ?? 'normal', length: prefs.length ?? 180 };
  const swatches = (name) => LEATHERS.map((l) => `
      <button type="button" class="sb-swatch" data-${name}="${l.id}" role="radio" aria-label="${esc(l.name)}">
        <span class="sb-swatch__hide" style="--c:${l.colour};--d:${l.dark}"></span>
        <span class="sb-swatch__name">${esc(l.name)}</span>
      </button>`).join('');
  wrap.innerHTML = `
    <div class="sb-card">
      <button type="button" class="sb-x" data-close aria-label="Leave">✕</button>
      <div class="sb-title">
        <div class="sb-title__stone" aria-hidden="true"></div>
        <h1>Stoneball</h1>
        <p>Three cavemen a side. One heavy stone. Get it between the standing stones.</p>
      </div>
      <div class="sb-row"><h2>Your tribe</h2><div class="sb-swatches" role="radiogroup" aria-label="Your tribe">${swatches('mine')}</div></div>
      <div class="sb-row"><h2>Rival tribe</h2><div class="sb-swatches" role="radiogroup" aria-label="Rival tribe">${swatches('rival')}</div></div>
      <div class="sb-row sb-row--split">
        <div><h2>Rivals play</h2><div class="sb-chips" role="radiogroup" aria-label="Difficulty">
          ${['easy', 'normal', 'hard'].map((k) => `<button type="button" class="sb-chip" data-skill="${k}" role="radio">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
        </div></div>
        <div><h2>Match</h2><div class="sb-chips" role="radiogroup" aria-label="Match length">
          ${LENGTHS.map((s) => `<button type="button" class="sb-chip" data-length="${s}" role="radio">${s / 60} min</button>`).join('')}
        </div></div>
      </div>
      <button type="button" class="sb-play" data-play>Play</button>
      <div class="sb-keys sb-keys--card">${KEYS_HTML}</div>
    </div>`;
  root.append(wrap);
  const paint = () => {
    if (choice.rival === choice.mine) choice.rival = LEATHERS.find((l) => l.id !== choice.mine).id;
    for (const b of wrap.querySelectorAll('[data-mine]')) b.setAttribute('aria-checked', String(b.dataset.mine === choice.mine));
    for (const b of wrap.querySelectorAll('[data-rival]')) {
      b.setAttribute('aria-checked', String(b.dataset.rival === choice.rival));
      b.disabled = b.dataset.rival === choice.mine;
    }
    for (const b of wrap.querySelectorAll('[data-skill]')) b.setAttribute('aria-checked', String(b.dataset.skill === choice.skill));
    for (const b of wrap.querySelectorAll('[data-length]')) b.setAttribute('aria-checked', String(Number(b.dataset.length) === choice.length));
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mine) choice.mine = b.dataset.mine;
    if (b.dataset.rival) choice.rival = b.dataset.rival;
    if (b.dataset.skill) choice.skill = b.dataset.skill;
    if (b.dataset.length) choice.length = Number(b.dataset.length);
    if (b.hasAttribute('data-play')) {
      wrap.remove();
      onPlay({ ...choice });
      return;
    }
    if (b.hasAttribute('data-close')) {
      onClose();
      return;
    }
    paint();
  });
  paint();
  setTimeout(() => wrap.querySelector('[data-play]')?.focus(), 0);
  return wrap;
}

/** The in-match HUD. */
export class Hud {
  constructor(root) {
    this.root = el('div', 'sb-hud');
    this.root.innerHTML = `
      <div class="sb-board" aria-live="polite">
        <div class="sb-board__team sb-board__team--a"><span class="sb-board__chip"></span><span class="sb-board__name"></span></div>
        <div class="sb-board__score"><b data-s0>0</b><span class="sb-board__clock" data-clock>3:00</span><b data-s1>0</b></div>
        <div class="sb-board__team sb-board__team--b"><span class="sb-board__name"></span><span class="sb-board__chip"></span></div>
        <div class="sb-board__tag" data-tag hidden>Golden goal</div>
      </div>
      <div class="sb-meters">
        <div class="sb-meter sb-meter--power" data-power hidden><span>Power</span><i><b></b></i></div>
        <div class="sb-meter sb-meter--stamina"><span>Stamina</span><i><b></b></i></div>
      </div>
      <div class="sb-keys">${KEYS_HTML}<span><kbd>M</kbd> sound</span></div>
      <div class="sb-banner" data-banner hidden></div>`;
    root.append(this.root);
    this.q = (s) => this.root.querySelector(s);
    this.power = this.q('[data-power]');
    this.powerBar = this.q('[data-power] b');
    this.stamina = this.q('.sb-meter--stamina b');
    this.banner = this.q('[data-banner]');
    this.last = {};
  }

  setTeams(teams) {
    const [a, b] = this.root.querySelectorAll('.sb-board__team');
    for (const [node, t] of [[a, teams[0]], [b, teams[1]]]) {
      node.querySelector('.sb-board__chip').style.background = `linear-gradient(160deg, ${t.colour}, ${t.dark})`;
      node.querySelector('.sb-board__name').textContent = t.name;
    }
  }

  update(match, { charge = 0, charging = false, stamina = 1 } = {}) {
    const s0 = String(match.score[0]), s1 = String(match.score[1]), clock = clockText(match.clock);
    if (this.last.s0 !== s0) this.q('[data-s0]').textContent = this.last.s0 = s0;
    if (this.last.s1 !== s1) this.q('[data-s1]').textContent = this.last.s1 = s1;
    if (this.last.clock !== clock) this.q('[data-clock]').textContent = this.last.clock = clock;
    this.q('[data-tag]').hidden = !match.overtime;
    this.power.hidden = !charging;
    this.powerBar.style.width = `${Math.round(charge * 100)}%`;
    this.powerBar.classList.toggle('is-full', charge >= 1);
    this.stamina.style.width = `${Math.round(stamina * 100)}%`;
    this.stamina.classList.toggle('is-low', stamina < 0.25);
  }

  /** A big word across the middle for a moment. */
  flash(html, { colour = '#ffe27a', ms = 1800, big = false } = {}) {
    clearTimeout(this._t);
    this.banner.hidden = false;
    this.banner.className = `sb-banner${big ? ' sb-banner--big' : ''}`;
    this.banner.style.setProperty('--c', colour);
    this.banner.innerHTML = html;
    // Restart the entrance animation.
    void this.banner.offsetWidth;
    this.banner.classList.add('is-in');
    this._t = setTimeout(() => {
      this.banner.hidden = true;
    }, ms);
  }

  show(on) {
    this.root.hidden = !on;
  }

  dispose() {
    clearTimeout(this._t);
    this.root.remove();
  }
}

/** Full time: the score, who won, rematch. */
export function endScreen(root, match, { onRematch, onMenu, onClose }) {
  const [a, b] = match.teams;
  const w = match.winner;
  const human = match.human?.team ?? 0;
  const line = w < 0 ? 'A draw. The stone rests.' : w === human ? `${esc(match.teams[w].name)} win!` : `${esc(match.teams[w].name)} win. Rematch?`;
  const wrap = el('div', 'sb-overlay sb-end');
  wrap.innerHTML = `
    <div class="sb-card sb-card--end">
      <p class="sb-end__kicker">Full time</p>
      <div class="sb-end__score">
        <span class="sb-end__team"><i style="background:linear-gradient(160deg, ${a.colour}, ${a.dark})"></i>${esc(a.name)}</span>
        <b>${match.score[0]} – ${match.score[1]}</b>
        <span class="sb-end__team"><i style="background:linear-gradient(160deg, ${b.colour}, ${b.dark})"></i>${esc(b.name)}</span>
      </div>
      <p class="sb-end__line ${w === human ? 'is-win' : ''}">${line}</p>
      <div class="sb-end__buttons">
        <button type="button" class="sb-play" data-rematch>Rematch</button>
        <button type="button" class="sb-ghost" data-menu>Change tribes</button>
        <button type="button" class="sb-ghost" data-close>Leave</button>
      </div>
    </div>`;
  root.append(wrap);
  wrap.querySelector('[data-rematch]').addEventListener('click', () => {
    wrap.remove();
    onRematch();
  });
  wrap.querySelector('[data-menu]').addEventListener('click', () => {
    wrap.remove();
    onMenu();
  });
  wrap.querySelector('[data-close]').addEventListener('click', () => onClose());
  setTimeout(() => wrap.querySelector('[data-rematch]')?.focus(), 0);
  return wrap;
}

/** Esc: resume, restart, back to the menu, leave. */
export function pauseScreen(root, { onResume, onRestart, onMenu, onClose, graphics, onHelp }) {
  const wrap = el('div', 'sb-overlay sb-pause');
  wrap.innerHTML = `
    <div class="sb-card sb-card--pause">
      <h2>Paused</h2>
      <button type="button" class="sb-play" data-resume>Resume</button>
      <button type="button" class="sb-ghost" data-open-help>How to play (H)</button>
      <button type="button" class="sb-ghost" data-restart>Restart match</button>
      <button type="button" class="sb-ghost" data-menu>Change tribes</button>
      <button type="button" class="sb-ghost" data-close>Leave</button>
    </div>`;
  // Graphics: presets and the Advanced fold (power.js).
  if (graphics) wrap.querySelector('[data-close]').before(graphics);
  root.append(wrap);
  const on = (sel, fn) => wrap.querySelector(sel).addEventListener('click', () => {
    wrap.remove();
    fn();
  });
  on('[data-resume]', onResume);
  on('[data-restart]', onRestart);
  on('[data-open-help]', () => onHelp?.());
  on('[data-menu]', onMenu);
  wrap.querySelector('[data-close]').addEventListener('click', () => onClose());
  setTimeout(() => wrap.querySelector('[data-resume]')?.focus(), 0);
  return wrap;
}
