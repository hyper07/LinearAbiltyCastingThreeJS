/**
 * Gloamreach's screens and HUD, kept small and quiet: the loading veil, the
 * start screen (pick a hero — they stand in the square while you choose),
 * a name plate and a greeting bubble over whoever you walk up to, a banner
 * when you enter a place, the minimap, a controls hint that fades, the
 * pause menu, the credits, and frame stats with ?debug.
 */
import { HEROES } from './cast.js';
import { PACKS } from './credits.js';

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class Loading {
  constructor(host) {
    this.el = el('div', 'gr-loading', `
      <div class="gr-loading__inner">
        <div class="gr-title gr-title--small">Gloamreach</div>
        <div class="gr-loading__bar"><span></span></div>
        <p class="gr-loading__what">Preparing the land…</p>
      </div>`);
    host.append(this.el);
    this.bar = this.el.querySelector('span');
    this.what = this.el.querySelector('.gr-loading__what');
  }

  set(label, k) {
    this.bar.style.width = `${Math.round(k * 100)}%`;
    this.what.textContent = `${label}…`;
  }

  hide() {
    this.el.classList.add('is-gone');
    setTimeout(() => this.el.remove(), 900);
  }
}

export class StartScreen {
  constructor(host, { onPick, onBegin, onCredits, onClose, picked = 'knight' }) {
    this.el = el('div', 'gr-start');
    this.el.innerHTML = `
      <header class="gr-start__head">
        <div class="gr-title">Gloamreach</div>
        <div class="gr-start__sub">Brindlewick · The Warden's Gate · The Gloamwood</div>
      </header>
      <div class="gr-start__heroes" role="radiogroup" aria-label="Choose your hero">
        ${HEROES.map((h) => `
          <button class="gr-hero" role="radio" data-hero="${h.id}" style="--accent:${h.accent}">
            <span class="gr-hero__name">${esc(h.name)}</span>
            <span class="gr-hero__title">${esc(h.title)}</span>
            <span class="gr-hero__blurb">${esc(h.blurb)}</span>
          </button>`).join('')}
      </div>
      <div class="gr-start__actions">
        <button class="gr-btn gr-btn--primary" data-begin>Begin</button>
        <button class="gr-btn" data-credits>Credits</button>
        <button class="gr-btn gr-btn--quiet" data-close>Leave</button>
      </div>`;
    host.append(this.el);
    this.el.querySelectorAll('[data-hero]').forEach((b) =>
      b.addEventListener('click', () => {
        this.select(b.dataset.hero);
        onPick(b.dataset.hero);
      })
    );
    this.el.querySelector('[data-begin]').addEventListener('click', () => onBegin());
    this.el.querySelector('[data-credits]').addEventListener('click', () => onCredits());
    this.el.querySelector('[data-close]').addEventListener('click', () => onClose());
    this.select(picked);
  }

  select(id) {
    this.el.querySelectorAll('[data-hero]').forEach((b) => {
      const on = b.dataset.hero === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  hide() {
    this.el.classList.add('is-gone');
    setTimeout(() => this.el.remove(), 800);
  }
}

export function creditsPanel(host, onClose) {
  const panel = el('div', 'gr-panel gr-credits');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Credits');
  panel.innerHTML = `
    <div class="gr-panel__card">
      <h2>Credits</h2>
      <p class="gr-credits__lead">Gloamreach is made with free assets. Thank you to everyone who shares their work.</p>
      ${PACKS.map((p) => `
        <section class="gr-credits__pack">
          <h3><a href="${p.site}" target="_blank" rel="noopener">${esc(p.name)}</a> <span class="gr-credits__lic"><a href="${p.licenceUrl}" target="_blank" rel="noopener">${esc(p.licence)}</a></span></h3>
          <p>${esc(p.what)}</p>
          ${p.items ? `<ul class="gr-credits__items">${p.items.map((i) => `<li><a href="${i.url}" target="_blank" rel="noopener">${esc(i.name)}</a></li>`).join('')}</ul>` : ''}
        </section>`).join('')}
      <button class="gr-btn gr-btn--primary" data-close>Close</button>
    </div>`;
  host.append(panel);
  const close = () => {
    panel.remove();
    onClose?.();
  };
  panel.querySelector('[data-close]').addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });
  panel.querySelector('[data-close]').focus();
  return { el: panel, close };
}

export class Hud {
  constructor(host, { debug = false } = {}) {
    this.el = el('div', 'gr-hud');
    this.el.innerHTML = `
      <div class="gr-banner" aria-live="polite"><div class="gr-banner__name"></div><div class="gr-banner__sub"></div></div>
      <div class="gr-plates"></div>
      <div class="gr-hint">
        <span><b>WASD</b> move</span><span><b>Mouse</b> aim</span><span><b>LMB · RMB · 1–4</b> skills</span><span><b>Q · R</b> potions</span><span><b>F</b> open · trade</span><span><b>I</b> bag · <b>C</b> hero</span><span><b>Middle drag</b> turn · <b>V</b> mouse-look</span><span><b>Space</b> jump · <b>Shift</b> sprint</span><span><b>Esc</b> menu</span>
      </div>
      <div class="gr-stats" ${debug ? '' : 'hidden'}></div>`;
    host.append(this.el);
    this.banner = this.el.querySelector('.gr-banner');
    this.plates = this.el.querySelector('.gr-plates');
    this.hint = this.el.querySelector('.gr-hint');
    this.stats = this.el.querySelector('.gr-stats');
    this.plateEls = new Map();
    this.bubbles = new Map();
    this.hintT = 14;
  }

  showBanner(name, sub) {
    this.banner.querySelector('.gr-banner__name').textContent = name;
    this.banner.querySelector('.gr-banner__sub').textContent = sub;
    this.banner.classList.remove('is-on');
    void this.banner.offsetWidth;
    this.banner.classList.add('is-on');
  }

  /** A big banner (a level, a fallen elite). */
  bigBanner(name, sub = '', big = false) {
    this.showBanner(name, sub);
    this.banner.classList.toggle('is-big', big);
  }

  /** Say something over someone's head for a few seconds. */
  say(id, text) {
    this.bubbles.set(id, { text, t: 6 });
  }

  /**
   * Plates for the people near enough: [{ id, name, title, x, y (screen px), d }].
   */
  update(dt, plates) {
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) this.hint.classList.add('is-faded');
    }
    for (const [id, b] of this.bubbles) if ((b.t -= dt) <= 0) this.bubbles.delete(id);
    const seen = new Set();
    for (const p of plates) {
      seen.add(p.id);
      let e = this.plateEls.get(p.id);
      if (!e) {
        e = el('div', 'gr-plate', `<div class="gr-plate__bubble"></div><div class="gr-plate__name"></div><div class="gr-plate__title"></div>`);
        this.plates.append(e);
        this.plateEls.set(p.id, e);
      }
      e.querySelector('.gr-plate__name').textContent = p.name;
      e.querySelector('.gr-plate__title').textContent = p.title ? `<${p.title}>` : '';
      const b = this.bubbles.get(p.id);
      const bub = e.querySelector('.gr-plate__bubble');
      bub.textContent = b?.text ?? '';
      bub.classList.toggle('is-on', Boolean(b));
      e.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      e.style.opacity = String(Math.max(0, Math.min(1, (12 - p.d) / 4)));
    }
    for (const [id, e] of this.plateEls) {
      if (!seen.has(id)) {
        e.remove();
        this.plateEls.delete(id);
      }
    }
  }

  showHint() {
    this.hint.classList.remove('is-faded');
    this.hintT = 8;
  }

  setStats(text) {
    if (!this.stats.hidden) this.stats.textContent = text;
  }

  dispose() {
    this.el.remove();
  }
}

export function pauseMenu(host, { onResume, onCredits, onSound, soundOn, onLeave, tier }) {
  const m = el('div', 'gr-panel gr-pause');
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-label', 'Paused');
  m.innerHTML = `
    <div class="gr-panel__card gr-pause__card">
      <div class="gr-title gr-title--small">Gloamreach</div>
      <button class="gr-btn gr-btn--primary" data-resume>Resume</button>
      <button class="gr-btn" data-sound>${soundOn ? 'Sound: on' : 'Sound: off'}</button>
      <button class="gr-btn" data-credits>Credits</button>
      <button class="gr-btn gr-btn--quiet" data-leave>Leave Gloamreach</button>
      <p class="gr-pause__tier">Picture quality: ${esc(tier)} (set by how the frames run)</p>
    </div>`;
  host.append(m);
  m.querySelector('[data-resume]').addEventListener('click', onResume);
  m.querySelector('[data-credits]').addEventListener('click', onCredits);
  m.querySelector('[data-leave]').addEventListener('click', onLeave);
  m.querySelector('[data-sound]').addEventListener('click', (e) => {
    const on = onSound();
    e.currentTarget.textContent = on ? 'Sound: on' : 'Sound: off';
  });
  m.querySelector('[data-resume]').focus();
  return m;
}
