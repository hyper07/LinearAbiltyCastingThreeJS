/**
 * Small DOM helpers for the Studio page: elements, escaping, a toast, a PIN prompt, prices,
 * and the one-live-preview-at-a-time manager (every preview is a WebGL context; browsers allow
 * only a handful, and a page full of running scenes would melt a school laptop).
 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

export function button(label, onclick, { kind = '', title = null, disabled = false, data = null } = {}) {
  const b = el('button', { type: 'button', class: `st-btn ${kind ? `st-btn--${kind}` : ''}`, title, disabled, onclick });
  b.textContent = label;
  if (data) for (const [k, v] of Object.entries(data)) b.dataset[k] = v;
  return b;
}

let toastTimer = null;
export function toast(host, text, { error = false, ms = 3200 } = {}) {
  let t = host.querySelector('.st-toast');
  if (!t) {
    t = el('div', { class: 'st-toast', role: 'status', 'aria-live': 'polite' });
    host.append(t);
  }
  t.textContent = text;
  t.classList.toggle('is-error', error);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

/** A modal with content and buttons; resolves with the button's value (or null on cancel/Esc). */
export function modal(host, { title, body, buttons = [['Close', null]], wide = false }) {
  return new Promise((resolve) => {
    const box = el('div', { class: `st-modal__box ${wide ? 'is-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const wrap = el('div', { class: 'st-modal' }, box);
    const done = (v) => {
      wrap.remove();
      resolve(v);
    };
    box.append(el('h3', { text: title }));
    if (body instanceof Node) box.append(body);
    else box.append(el('div', { html: body ?? '' }));
    const row = el('div', { class: 'st-modal__buttons' });
    for (const [label, value, kind] of buttons) row.append(button(label, () => done(typeof value === 'function' ? value() : value), { kind: kind ?? '' }));
    box.append(row);
    wrap.addEventListener('click', (e) => e.target === wrap && done(null));
    wrap.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') done(null);
    });
    host.append(wrap);
    (box.querySelector('input, textarea, select') ?? row.lastElementChild)?.focus();
  });
}

/** Ask a grown-up for the family PIN (4 digits). Resolves with the PIN or null. */
export async function askPin(host) {
  const input = el('input', { type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', class: 'st-input st-pin', 'aria-label': 'Parent PIN' });
  const body = el('div', {}, el('p', { text: 'This needs a parent or guardian. Grown-ups: type the family PIN (the one AI Arcademia\'s parent page uses).' }), input, el('p', { class: 'st-note', text: 'Test mode: no real money is taken.' }));
  return modal(host, { title: 'Ask a grown-up', body, buttons: [['Cancel', null], ['OK', () => (/^\d{4}$/.test(input.value) ? input.value : null), 'primary']] });
}

/** "Free" or "120 credits (≈ ₩12,000 · $9.60)". */
export function priceText(display) {
  if (!display || !display.credits) return 'Free';
  return `${display.credits} credits (≈ ₩${display.krw.toLocaleString()} · $${display.usd.toFixed(2)})`;
}

export const ago = (t) => {
  if (!t) return '';
  const s = (Date.now() - (typeof t === 'string' ? Date.parse(t) : t)) / 1000;
  for (const [unit, n] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (s >= n) return `${Math.floor(s / n)} ${unit}${Math.floor(s / n) === 1 ? '' : 's'} ago`;
  return 'just now';
};

/**
 * Exactly one live preview at a time. `activate(slot, mount)` stops the current one (leaving a
 * still picture in its slot) and starts `mount(host)` → { dispose(), snapshot?() } in `slot`.
 */
export class PreviewManager {
  constructor() {
    this.active = null;
    this.token = 0;
  }

  async activate(slot, mount) {
    if (this.active?.slot === slot) return this.active.handle;
    this.release();
    const token = ++this.token;
    slot.classList.add('is-live');
    const host = slot.querySelector('.st-view__live') ?? slot;
    try {
      const handle = await mount(host);
      if (token !== this.token) {
        handle?.dispose?.();
        return null;
      }
      this.active = { slot, handle };
      return handle;
    } catch (error) {
      slot.classList.remove('is-live');
      slot.dataset.error = error.message;
      return null;
    }
  }

  release() {
    this.token++;
    if (!this.active) return;
    const { slot, handle } = this.active;
    this.active = null;
    try {
      const still = handle?.snapshot?.();
      if (still) {
        let img = slot.querySelector('.st-view__still');
        if (!img) {
          img = el('img', { class: 'st-view__still', alt: '' });
          slot.prepend(img);
        }
        img.src = still;
        // (a pixel-art preview draws at a third of the size, scaled up crisp: its still must be too,
        // or the Full 2D and HD-2D cards froze into a blur)
        img.style.imageRendering = slot.querySelector('canvas')?.style.imageRendering || '';
      }
    } catch {
      /* a still is a nicety */
    }
    handle?.dispose?.();
    slot.classList.remove('is-live');
  }
}

/** A preview slot: a still picture (once there is one) under a live box. */
export const viewSlot = (label = '') => el('div', { class: 'st-view', 'aria-label': label }, el('div', { class: 'st-view__live' }), el('span', { class: 'st-view__hint', text: '▶' }));
