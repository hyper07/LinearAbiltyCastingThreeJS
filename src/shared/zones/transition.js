/**
 * The moment between zones: the view swirls shut in the destination's
 * colours (a gate's vortex), a card names where you're going while it loads,
 * and the view opens again on arrival. Plain DOM and CSS over the game's
 * canvas; the game keeps no frame of the old zone once the card is up.
 *
 *   const t = new ZoneTransition(host);
 *   await t.cover({ name, sub, theme, via: 'portal' });   // resolves once the screen is covered
 *   t.progress('Raising the giants', 0.4);
 *   await t.reveal();
 */

export const THEME_COLORS = {
  golden: ['#ffcf7a', '#c8742a', '#2a1a10'],
  dusk: ['#b98cff', '#3d6cff', '#0c0820'],
  ember: ['#ff9a3a', '#d2361a', '#1c0806'],
  jungle: ['#9fe08a', '#2f7a52', '#06140c'],
  mist: ['#d8e8f0', '#6c8aa0', '#0e161c'],
  lantern: ['#ffd27a', '#e0663a', '#22140e'],
  meadow: ['#ffe9a8', '#7ab45a', '#14200e']
};

const CSS = `
.zt{position:absolute;inset:0;z-index:80;pointer-events:all;display:grid;place-items:center;overflow:hidden;--a:#ffcf7a;--b:#c8742a;--c:#2a1a10;font:15px/1.35 system-ui,sans-serif;color:#fff8ea}
.zt__swirl{position:absolute;left:50%;top:50%;width:260vmax;height:260vmax;margin:-130vmax 0 0 -130vmax;border-radius:50%;
  background:conic-gradient(from 0deg,var(--c),var(--b),var(--a),var(--c),var(--b),var(--a),var(--c));
  -webkit-mask:radial-gradient(circle,transparent 0,transparent var(--hole,0%),#000 calc(var(--hole,0%) + 6%));mask:radial-gradient(circle,transparent 0,transparent var(--hole,0%),#000 calc(var(--hole,0%) + 6%));
  animation:zt-spin 2.4s linear infinite;filter:blur(1px) saturate(1.2)}
.zt__veil{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--a) 30%,transparent),var(--c) 70%);opacity:0;transition:opacity .35s ease}
.zt.is-shut .zt__veil{opacity:1}
.zt__card{position:relative;min-width:min(440px,86vw);padding:20px 26px 18px;border-radius:16px;background:rgba(10,8,8,.55);box-shadow:0 0 0 1px color-mix(in srgb,var(--a) 55%,transparent) inset,0 20px 60px rgba(0,0,0,.5);text-align:center;opacity:0;transform:translateY(10px) scale(.97);transition:opacity .3s ease,transform .3s ease;backdrop-filter:blur(3px)}
.zt.is-shut .zt__card{opacity:1;transform:none}
.zt__via{margin:0;font-size:.78em;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
.zt__name{margin:.2em 0 .1em;font:600 1.9em/1.15 Georgia,'Times New Roman',serif;letter-spacing:.02em;color:var(--a);text-shadow:0 2px 14px rgba(0,0,0,.6)}
.zt__sub{margin:0 0 12px;opacity:.85;font-style:italic}
.zt__bar{height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden}
.zt__bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--b),var(--a));transition:width .2s ease}
.zt__step{margin:8px 0 0;font-size:.82em;opacity:.7;min-height:1.2em}
@keyframes zt-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.zt__swirl{animation:none}}
`;
let styled = false;
function styles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.zoneTransition = '';
  s.textContent = CSS;
  document.head.append(s);
}

const VIA = { portal: 'Passing through', waystone: 'Waystone to', respawn: 'You wake in', load: 'Entering' };

export class ZoneTransition {
  constructor(host) {
    styles();
    this.host = host;
    this.el = null;
    this.shutAt = 0;
  }

  get active() {
    return Boolean(this.el);
  }

  /** Swirl shut and show the card; resolves when the screen is covered (about 0.55 s; 0.2 s with reduced motion). */
  cover({ name, sub = '', theme = 'golden', via = 'portal' } = {}) {
    this.el?.remove();
    const [a, b, c] = THEME_COLORS[theme] ?? THEME_COLORS.golden;
    const el = document.createElement('div');
    el.className = 'zt';
    el.dataset.zoneTransition = '';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.setProperty('--a', a);
    el.style.setProperty('--b', b);
    el.style.setProperty('--c', c);
    el.innerHTML = '<div class="zt__swirl"></div><div class="zt__veil"></div><div class="zt__card"><p class="zt__via"></p><h2 class="zt__name"></h2><p class="zt__sub"></p><div class="zt__bar"><i></i></div><p class="zt__step"></p></div>';
    el.querySelector('.zt__via').textContent = VIA[via] ?? via;
    el.querySelector('.zt__name').textContent = name;
    el.querySelector('.zt__sub').textContent = sub;
    this.host.append(el);
    this.el = el;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const swirl = el.querySelector('.zt__swirl');
    const dur = reduce ? 200 : 550;
    return new Promise((done) => {
      const t0 = performance.now();
      const step = (now) => {
        if (this.el !== el) return done();
        const k = Math.min(1, (now - t0) / dur);
        // The hole closes from the edges to the middle.
        swirl.style.setProperty('--hole', `${(1 - k * k) * 60}%`);
        if (k < 1) requestAnimationFrame(step);
        else {
          el.classList.add('is-shut');
          this.shutAt = performance.now();
          // Two frames for the card to paint before the game starts its heavy work.
          requestAnimationFrame(() => requestAnimationFrame(() => done()));
        }
      };
      requestAnimationFrame(step);
    });
  }

  progress(label, k) {
    if (!this.el) return;
    this.el.querySelector('.zt__bar i').style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
    if (label) this.el.querySelector('.zt__step').textContent = label;
  }

  /** Open onto the new zone (about 0.5 s) and go. */
  reveal() {
    const el = this.el;
    if (!el) return Promise.resolve();
    this.progress('', 1);
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const swirl = el.querySelector('.zt__swirl');
    const dur = reduce ? 150 : 500;
    el.classList.remove('is-shut');
    el.style.pointerEvents = 'none';
    return new Promise((done) => {
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        swirl.style.setProperty('--hole', `${k * k * 70}%`);
        swirl.style.opacity = String(1 - k * 0.6);
        if (k < 1) requestAnimationFrame(step);
        else {
          el.remove();
          if (this.el === el) this.el = null;
          done();
        }
      };
      requestAnimationFrame(step);
    });
  }

  dispose() {
    this.el?.remove();
    this.el = null;
  }
}
