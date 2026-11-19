/**
 * Touch controls for phones and tablets, like a handheld's: a virtual stick
 * on the left (it appears where your thumb lands), drag anywhere else to
 * turn the camera (pinch to zoom), and round buttons on the right — jump,
 * act (talk, gather, breathe), toss a treat, creep — plus the menu and the
 * journal at the top. Only shown on touch screens.
 */
import { el } from './ui.js';

export class TouchControls {
  constructor(host, { onButton, onLook, onZoom }) {
    this.el = el('div', 'kv-touch');
    this.el.innerHTML = `
      <div class="kv-stick"><div class="kv-stick__base"></div><div class="kv-stick__knob"></div></div>
      <div class="kv-tbtns">
        <button class="kv-tb kv-tb--jump" data-b="jump" aria-label="Jump">⤒</button>
        <button class="kv-tb kv-tb--act" data-b="act" aria-label="Act">✋</button>
        <button class="kv-tb kv-tb--toss" data-b="toss" aria-label="Toss a treat">➶</button>
        <button class="kv-tb kv-tb--sneak" data-b="sneak" aria-label="Creep quietly" aria-pressed="false">🐾</button>
      </div>
      <div class="kv-ttop"><button class="kv-tb kv-tb--small" data-b="menu" aria-label="Menu">☰</button><button class="kv-tb kv-tb--small" data-b="journal" aria-label="Journal">📖</button></div>`;
    host.append(this.el);
    this.move = { x: 0, z: 0 };
    this.held = new Set();
    this.sneak = false;
    this.stick = null;
    this.looks = new Map();
    const knob = this.el.querySelector('.kv-stick__knob');
    const base = this.el.querySelector('.kv-stick__base');
    const stickEl = this.el.querySelector('.kv-stick');
    this.el.querySelectorAll('[data-b]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = b.dataset.b;
        if (id === 'sneak') {
          this.sneak = !this.sneak;
          b.setAttribute('aria-pressed', String(this.sneak));
        }
        this.held.add(id);
        b.classList.add('down');
        onButton(id, true);
      });
      const up = (e) => {
        e.preventDefault();
        const id = b.dataset.b;
        this.held.delete(id);
        b.classList.remove('down');
        onButton(id, false);
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    });
    // The stick: lands under the thumb in the left half; the rest of the screen turns the camera.
    this._down = (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (e.target.closest('.kv-tb, .kv-slot, .kv-panel, .kv-start, button, input')) return;
      const w = window.innerWidth;
      if (e.clientX < w * 0.42 && !this.stick) {
        this.stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
        stickEl.style.left = `${e.clientX}px`;
        stickEl.style.top = `${e.clientY}px`;
        stickEl.classList.add('on');
      } else this.looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    this._moveH = (e) => {
      if (this.stick && e.pointerId === this.stick.id) {
        const R = base.clientWidth / 2 || 60;
        let dx = e.clientX - this.stick.x;
        let dy = e.clientY - this.stick.y;
        const l = Math.hypot(dx, dy);
        if (l > R) {
          dx = (dx / l) * R;
          dy = (dy / l) * R;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.move.x = dx / R;
        this.move.z = -dy / R;
        return;
      }
      const p = this.looks.get(e.pointerId);
      if (!p) return;
      if (this.looks.size === 2) {
        const [a, b] = [...this.looks.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX;
        p.y = e.clientY;
        const after = Math.hypot(a.x - b.x, a.y - b.y);
        onZoom((before - after) * 4);
        return;
      }
      onLook((e.clientX - p.x) * 1.6, (e.clientY - p.y) * 1.6);
      p.x = e.clientX;
      p.y = e.clientY;
    };
    this._up = (e) => {
      if (this.stick && e.pointerId === this.stick.id) {
        this.stick = null;
        this.move.x = this.move.z = 0;
        knob.style.transform = '';
        stickEl.classList.remove('on');
      }
      this.looks.delete(e.pointerId);
    };
    window.addEventListener('pointerdown', this._down, { passive: true });
    window.addEventListener('pointermove', this._moveH, { passive: true });
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  dispose() {
    window.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._moveH);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    this.el.remove();
  }
}
