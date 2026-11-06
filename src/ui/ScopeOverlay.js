/**
 * The view through a weapon's scope (hold V with a sniper rifle, DMR, musket,
 * railgun, longbow…): the screen goes dark except a round window around the
 * cursor, with a reticle, mil-dots, the zoom, the range to the aim point and
 * what is under the crosshair.
 *
 * Pure DOM over the canvas; `update` is called every frame with how far in
 * the scope is (0..1).
 */
export class ScopeOverlay {
  constructor(host) {
    this.root = document.createElement('div');
    this.root.className = 'scope';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="scope__reticle">
        <i class="scope__line scope__line--n"></i><i class="scope__line scope__line--s"></i>
        <i class="scope__line scope__line--w"></i><i class="scope__line scope__line--e"></i>
        <i class="scope__dot"></i>
        <span class="scope__range" data-range></span>
        <span class="scope__target" data-target></span>
        <span class="scope__zoom" data-zoom></span>
      </div>`;
    host.appendChild(this.root);
    this.reticle = this.root.querySelector('.scope__reticle');
    this.rangeEl = this.root.querySelector('[data-range]');
    this.targetEl = this.root.querySelector('[data-target]');
    this.zoomEl = this.root.querySelector('[data-zoom]');
    this._text = {};
  }

  _set(el, key, text) {
    if (this._text[key] === text) return;
    this._text[key] = text;
    el.textContent = text;
  }

  /**
   * @param {number} amount 0..1
   * @param {{ x: number, y: number }} at cursor, in pixels
   * @param {{ zoom: number, distance: number, range: number, target: string|null, reloading: boolean }} info
   */
  update(amount, at, info) {
    const on = amount > 0.02;
    if (this.root.hidden === on) this.root.hidden = !on;
    document.body.classList.toggle('is-scoped', amount > 0.5);
    if (!on) return;
    const r = Math.min(innerWidth, innerHeight) * 0.36;
    this.root.style.setProperty('--x', `${at.x}px`);
    this.root.style.setProperty('--y', `${at.y}px`);
    this.root.style.setProperty('--r', `${r}px`);
    this.root.style.opacity = String(Math.min(1, amount * 1.25));
    this.reticle.style.transform = `translate(${at.x - r}px, ${at.y - r}px) scale(${0.85 + amount * 0.15})`;
    const far = info.distance > info.range;
    this.root.classList.toggle('is-far', far);
    this._set(this.rangeEl, 'range', info.reloading ? 'RELOADING' : `${Math.round(info.distance)} m${far ? ' · out of range' : ''}`);
    this._set(this.targetEl, 'target', info.target ?? '');
    this._set(this.zoomEl, 'zoom', `${info.zoom}×`);
  }
}
