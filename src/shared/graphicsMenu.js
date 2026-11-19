/**
 * The Graphics setting every 3D game shows in its pause or settings menu:
 * four presets — Quiet (battery) / Balanced / High / Ultra — with a one-line
 * hint, and an Advanced fold (frame cap, draw distance, shadows, grass,
 * effects, show FPS). Changing an advanced option makes the label "Custom".
 * It inherits the menu's font and colour, so it sits in each game's own style.
 *
 *   const el = graphicsMenu({ state, profile, features: { grass: true, rays: true }, onChange: (s) => … });
 */
import { MODES, MODE_LABELS, HINT, OPTIONS, choices, setChoice, setPreset, graphicsState } from './power.js';

const CSS = `
.pw-gfx{display:grid;gap:.5em;text-align:left;margin:.6em 0;padding:.7em .8em;border-radius:12px;background:rgba(127,127,127,.12);border:1px solid rgba(127,127,127,.28);font-size:.92em;max-width:30em}
.pw-gfx__head{display:flex;justify-content:space-between;align-items:baseline;gap:1em;font-weight:700}
.pw-gfx__head b{font-weight:600;opacity:.85}
.pw-gfx__row{display:flex;flex-wrap:wrap;gap:.35em}
.pw-gfx button{font:inherit;color:inherit;background:rgba(127,127,127,.14);border:1px solid rgba(127,127,127,.38);border-radius:8px;padding:.35em .7em;cursor:pointer;min-height:2.1em}
.pw-gfx button:hover{background:rgba(127,127,127,.26)}
.pw-gfx button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.pw-gfx button[aria-pressed="true"]{background:rgba(255,214,120,.32);border-color:rgba(255,214,120,.95);font-weight:700}
.pw-gfx__hint{margin:0;opacity:.8;font-size:.92em}
.pw-gfx details{border-top:1px solid rgba(127,127,127,.25);padding-top:.4em}
.pw-gfx summary{cursor:pointer;font-weight:600;padding:.2em 0}
.pw-gfx__adv{display:grid;gap:.45em;margin-top:.4em}
.pw-gfx__adv label{display:block;font-size:.9em;opacity:.85;margin-bottom:.15em}
.pw-fps{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483000;font:600 12px/1.3 ui-monospace,Menlo,monospace;color:#eaffd0;background:rgba(0,0,0,.55);padding:3px 8px;border-radius:6px;pointer-events:none;white-space:pre}
`;

let styled = false;
export function powerStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.power = '';
  s.textContent = CSS;
  document.head.append(s);
}

/** Every word the menu shows (a game may pass its own translations as `text`). */
export const TEXT = {
  title: 'Graphics',
  quiet: MODE_LABELS.quiet,
  balanced: MODE_LABELS.balanced,
  high: MODE_LABELS.high,
  ultra: MODE_LABELS.ultra,
  custom: 'Custom',
  hint: HINT,
  advanced: 'Advanced',
  fps: 'Frame cap',
  unlimited: 'Unlimited',
  distance: 'Draw distance',
  shadows: 'Shadows',
  grass: 'Grass density',
  effects: 'Effects',
  ao: 'Ambient occlusion',
  rays: 'God rays',
  bloom: 'Bloom',
  showFps: 'Show FPS',
  off: 'Off',
  near: 'Near',
  medium: 'Medium',
  far: 'Far',
  full: 'Full',
  low: 'Low',
  highGrass: 'High'
};

/**
 * @param {object} o
 * @param {object} o.state     the graphics state (power.js graphicsState)
 * @param {object} [o.profile] the game's own preset tweaks ({ quietFps })
 * @param {object} [o.features] which rows to show: { grass, shadows, ao, rays, bloom, distance } (all on unless false)
 * @param {(state: object) => void} o.onChange
 */
export function graphicsMenu({ state, profile = {}, features = {}, onChange, text = {} }) {
  powerStyles();
  const T = { ...TEXT, ...text };
  const FPS_LABEL = (v) => (v ? String(v) : T.unlimited);
  const NAMES = {
    distance: { near: T.near, medium: T.medium, far: T.far },
    shadows: { off: T.off, near: T.near, full: T.full },
    grass: { low: T.low, medium: T.medium, high: T.highGrass }
  };
  let st = graphicsState(state);
  const has = (k) => features[k] !== false;
  const root = document.createElement('section');
  root.className = 'pw-gfx';
  root.dataset.graphics = '';
  root.setAttribute('aria-label', T.title);
  const head = document.createElement('div');
  head.className = 'pw-gfx__head';
  head.append(document.createElement('span'), document.createElement('b'));
  head.firstChild.textContent = T.title;
  head.lastChild.dataset.graphicsLabel = '';
  root.append(head);
  const button = (text, attrs, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    for (const [k, v] of Object.entries(attrs)) b.dataset[k] = v;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  };
  const set = (next) => {
    st = graphicsState(next);
    sync();
    onChange?.(st);
  };
  const presets = document.createElement('div');
  presets.className = 'pw-gfx__row';
  presets.setAttribute('role', 'group');
  presets.setAttribute('aria-label', 'Preset');
  for (const m of MODES) presets.append(button(T[m], { preset: m }, () => set(setPreset(st, m))));
  root.append(presets);
  const hint = document.createElement('p');
  hint.className = 'pw-gfx__hint';
  hint.textContent = T.hint;
  root.append(hint);
  const fold = document.createElement('details');
  fold.append(document.createElement('summary'));
  fold.firstChild.textContent = T.advanced;
  const adv = document.createElement('div');
  adv.className = 'pw-gfx__adv';
  fold.append(adv);
  const row = (label, name, values, text) => {
    const wrap = document.createElement('div');
    const l = document.createElement('label');
    l.textContent = label;
    const r = document.createElement('div');
    r.className = 'pw-gfx__row';
    r.setAttribute('role', 'group');
    r.setAttribute('aria-label', label);
    for (const v of values) r.append(button(text(v), { opt: name, value: String(v) }, () => set(setChoice(st, name, v, profile))));
    wrap.append(l, r);
    adv.append(wrap);
  };
  row(T.fps, 'fps', OPTIONS.fps, FPS_LABEL);
  if (has('distance')) row(T.distance, 'distance', OPTIONS.distance, (v) => NAMES.distance[v]);
  if (has('shadows')) row(T.shadows, 'shadows', OPTIONS.shadows, (v) => NAMES.shadows[v]);
  if (has('grass')) row(T.grass, 'grass', OPTIONS.grass, (v) => NAMES.grass[v]);
  const fx = [['ao', T.ao], ['rays', T.rays], ['bloom', T.bloom]].filter(([k]) => has(k));
  const toggles = document.createElement('div');
  const tl = document.createElement('label');
  tl.textContent = T.effects;
  const tr = document.createElement('div');
  tr.className = 'pw-gfx__row';
  for (const [k, name] of fx) tr.append(button(name, { opt: k, toggle: '' }, () => set(setChoice(st, k, !choices(st, profile)[k], profile))));
  tr.append(button(T.showFps, { opt: 'showFps', toggle: '' }, () => set({ ...st, showFps: !st.showFps })));
  toggles.append(tl, tr);
  adv.append(toggles);
  root.append(fold);
  function sync() {
    const c = choices(st, profile);
    root.querySelector('[data-graphics-label]').textContent = st.custom ? T.custom : T[st.preset];
    for (const b of presets.children) b.setAttribute('aria-pressed', String(!st.custom && b.dataset.preset === st.preset));
    for (const b of adv.querySelectorAll('[data-opt]')) {
      const k = b.dataset.opt;
      const on = k === 'showFps' ? st.showFps : 'toggle' in b.dataset ? Boolean(c[k]) : String(c[k]) === b.dataset.value;
      b.setAttribute('aria-pressed', String(on));
    }
  }
  sync();
  root.refresh = (next) => {
    st = graphicsState(next);
    sync();
  };
  return root;
}

/** A small frame-rate readout at the top of the screen (Show FPS). */
export function fpsBadge() {
  powerStyles();
  const el = document.createElement('div');
  el.className = 'pw-fps';
  el.dataset.fps = '';
  el.setAttribute('aria-hidden', 'true');
  return el;
}
