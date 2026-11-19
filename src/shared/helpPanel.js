/**
 * How to play: a panel every game opens with H (and I where a game has no
 * bag), the "?" button in its HUD corner and the pause menu — what to do,
 * then every key by group (Move, Camera, Skills, Items, Menus, Map) with the
 * gamepad and touch equivalents where they exist. It opens by itself when a
 * game starts — the first time, and after, until "don't show again" is ticked — and
 * pauses a single-player game while it's up (the game's onOpen / onClose).
 *
 * Each game keeps ONE controls table (src/<game>/controls.js): its key
 * handler reads the codes from it, its short on-screen hint is built from the
 * rows marked `hint`, and this panel lists all of it — so the three can't
 * drift apart.
 *
 *   row: { id, keys: ['W','A','S','D'], codes: ['KeyW', …], does: 'Move', pad?: 'Left stick', touch?: 'Stick', hint?: true }
 *   table: { title, goal, groups: [{ name: 'Move', rows: [...] }] }
 */

export const HELP_KEYS = ['KeyH'];

const CSS = `
.hp{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(6,6,10,.62);backdrop-filter:blur(2px);font:15px/1.4 system-ui,sans-serif;color:#f6eedc}
.hp__card{width:min(760px,94vw);max-height:90vh;overflow:auto;padding:18px 22px;border-radius:16px;background:rgba(24,20,16,.96);box-shadow:0 0 0 2px rgba(255,225,170,.3) inset,0 18px 50px rgba(0,0,0,.5)}
.hp__card h2{margin:0 0 4px;font-size:1.45em}
.hp__goal{margin:0 0 12px;opacity:.9}
.hp__groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px 22px}
.hp__group h3{margin:6px 0 6px;font-size:.95em;letter-spacing:.06em;text-transform:uppercase;color:#ffd77a}
.hp__row{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:4px 10px;align-items:baseline;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.hp kbd{display:inline-block;min-width:1.5em;padding:1px 6px;margin:1px 2px 1px 0;border-radius:5px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);font:600 .86em ui-monospace,Menlo,monospace;text-align:center}
.hp__alt{display:block;font-size:.84em;opacity:.72}
.hp__foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-top:14px}
.hp__foot label{display:flex;gap:6px;align-items:center;cursor:pointer;opacity:.9}
.hp button{font:inherit;color:inherit;background:rgba(255,215,122,.22);border:1px solid rgba(255,215,122,.7);border-radius:9px;padding:.4em 1em;cursor:pointer}
.hp button:focus-visible{outline:2px solid #ffd77a;outline-offset:2px}
.hp-q{position:absolute;z-index:6;top:12px;left:12px;width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,230,180,.75);background:rgba(20,16,10,.78);color:#ffe9b8;font:700 17px/1 system-ui,sans-serif;cursor:pointer;pointer-events:auto}
`;
let styled = false;
function styles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.helpStyle = '';
  s.textContent = CSS;
  document.head.append(s);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const kbds = (keys) => keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('');

/** Every code a table binds (for checks that nothing collides). */
export function codesOf(table) {
  const out = [];
  for (const g of table.groups) for (const r of g.rows) for (const c of r.codes ?? []) out.push({ code: c, id: r.id, group: g.name, context: r.context ?? '' });
  return out;
}

/** Codes bound to more than one action in the same context (rows with a `context`, e.g. 'race', only clash with each other). Should be empty. */
export function collisions(table) {
  const seen = new Map();
  const bad = [];
  for (const { code, id, context } of codesOf(table)) {
    const k = `${context}|${code}`;
    if (seen.has(k) && seen.get(k) !== id) bad.push({ code, context, a: seen.get(k), b: id });
    else seen.set(k, id);
  }
  return bad;
}

/** The codes of one action (for the game's key handler). */
export function codesFor(table, id) {
  for (const g of table.groups) for (const r of g.rows) if (r.id === id) return r.codes ?? [];
  return [];
}

/** The short on-screen hint: the rows marked `hint`, as "<kbd>W</kbd>… does" items. */
export function hintItems(table) {
  const out = [];
  for (const g of table.groups) for (const r of g.rows) if (r.hint) out.push({ keys: r.keys, does: r.short ?? r.does, html: `${kbds(r.keys)} ${esc(r.short ?? r.does)}` });
  return out;
}

const seenKey = (id) => `gamory.help.${id}.hide`;

/** Whether the panel should open by itself (first play, not turned off). Storage may throw: then yes once. */
export function shouldAutoOpen(id, { storage = globalThis.localStorage } = {}) {
  try {
    return storage?.getItem(seenKey(id)) !== '1';
  } catch {
    return true;
  }
}

export function setAutoOpen(id, on, { storage = globalThis.localStorage } = {}) {
  try {
    if (on) storage.removeItem(seenKey(id));
    else storage.setItem(seenKey(id), '1');
    return true;
  } catch {
    return false;
  }
}

export class HelpPanel {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host
   * @param {string} o.id        the game (where "don't show again" is kept)
   * @param {object} o.table     the game's controls table
   * @param {object} [o.text]    translations: { title, close, dontShow, keyboard, gamepad, touch }
   * @param {() => void} [o.onOpen]   pause
   * @param {() => void} [o.onClose]  resume
   */
  constructor({ host, id, table, text = {}, onOpen = () => {}, onClose = () => {} }) {
    styles();
    Object.assign(this, { host, id, table, onOpen, onClose });
    this.text = { title: table.title ?? 'How to play', close: 'Close (H)', dontShow: "Don't show this when I start", gamepad: 'Gamepad', touch: 'Touch', ...text };
    this.el = null;
  }

  get isOpen() {
    return Boolean(this.el);
  }

  toggle() {
    if (this.el) this.close();
    else this.open();
  }

  /** Open it if this is the first time (and it wasn't turned off). Returns whether it opened. */
  openFirstTime() {
    if (!shouldAutoOpen(this.id)) return false;
    this.open();
    return true;
  }

  open() {
    if (this.el) return;
    const T = this.text;
    const el = document.createElement('div');
    el.className = 'hp';
    el.dataset.helpPanel = '';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', T.title);
    const groups = this.table.groups
      .map((g) => `<section class="hp__group"><h3>${esc(g.name)}</h3>${g.rows
        .map((r) => {
          const alt = [r.pad ? `${esc(T.gamepad)}: ${esc(r.pad)}` : '', r.touch ? `${esc(T.touch)}: ${esc(r.touch)}` : ''].filter(Boolean).join(' · ');
          return `<div class="hp__row" data-help-row="${esc(r.id)}"><span>${kbds(r.keys)}</span><span>${esc(r.does)}${alt ? `<span class="hp__alt">${alt}</span>` : ''}</span></div>`;
        })
        .join('')}</section>`)
      .join('');
    el.innerHTML = `<div class="hp__card"><h2>${esc(T.title)}</h2><p class="hp__goal">${esc(this.table.goal ?? '')}</p><div class="hp__groups">${groups}</div>
      <div class="hp__foot"><label><input type="checkbox" data-help-hide> ${esc(T.dontShow)}</label><button type="button" data-help-close>${esc(T.close)}</button></div></div>`;
    const box = el.querySelector('[data-help-hide]');
    box.checked = !shouldAutoOpen(this.id);
    box.addEventListener('change', () => setAutoOpen(this.id, !box.checked));
    el.querySelector('[data-help-close]').addEventListener('click', () => this.close());
    el.addEventListener('click', (e) => e.target === el && this.close());
    el.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || HELP_KEYS.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      } else e.stopPropagation();
    });
    this.host.append(el);
    this.el = el;
    this.onOpen();
    el.querySelector('[data-help-close]').focus({ preventScroll: true });
    el.querySelector('.hp__card').scrollTop = 0;
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    this.onClose();
  }

  dispose() {
    this.el?.remove();
    this.el = null;
  }
}

/** The "?" button for a HUD corner. */
export function helpButton(host, onClick, { label = 'How to play (H)', style = '' } = {}) {
  styles();
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hp-q';
  b.dataset.helpButton = '';
  b.textContent = '?';
  b.title = label;
  b.setAttribute('aria-label', label);
  if (style) b.style.cssText += style;
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  host.append(b);
  return b;
}
