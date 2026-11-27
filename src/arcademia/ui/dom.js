/** Tiny DOM helpers: every bit of text goes in as text, never as HTML. */
export function el(tag, cls = '', text = null, attrs = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  return e;
}
export function button(cls, text, onClick, attrs = {}) {
  return el('button', cls, text, { type: 'button', onclick: onClick, ...attrs });
}
import { ALL_SUBJECTS, SUBJECT_INFO, subjectName } from '../content/subjects.js';
/** Every subject's icon (content/subjects.js). */
export const SUBJECT_ICON = Object.freeze(Object.fromEntries(ALL_SUBJECTS.map((id) => [id, SUBJECT_INFO[id].icon])));
/** Subject names in the current language. */
export const SUBJECT_LABEL = Object.defineProperties({}, Object.fromEntries(ALL_SUBJECTS.map((id) => [id, { get: () => subjectName(id), enumerable: true }])));
export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A burst of sparkles from an element (skipped for reduced motion). */
export function sparkle(from, { count = 14, colors = ['#ffd166', '#7fe3d6', '#ff8fa3', '#ffffff'] } = {}) {
  if (prefersReducedMotion() || !from?.getBoundingClientRect) return;
  const r = from.getBoundingClientRect();
  const layer = el('div', 'arc-sparkles', null, { 'aria-hidden': 'true' });
  document.body.append(layer);
  for (let i = 0; i < count; i++) {
    const s = el('i', 'arc-spark');
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const d = 40 + Math.random() * 60;
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + r.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 80}ms`;
    layer.append(s);
  }
  setTimeout(() => layer.remove(), 1100);
}

/** Confetti over the whole screen, for a finished lesson or a new floor. */
export function confetti(host, n = 80) {
  if (prefersReducedMotion()) return;
  const layer = el('div', 'arc-confetti', null, { 'aria-hidden': 'true' });
  host.append(layer);
  const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#9b7be0', '#ff9f1c'];
  for (let i = 0; i < n; i++) {
    const p = el('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    p.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    p.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
    layer.append(p);
  }
  setTimeout(() => layer.remove(), 3800);
}
