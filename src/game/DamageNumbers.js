import { Vector3 } from 'three';

const _projected = new Vector3();

/**
 * Floating combat text.
 *
 * These are DOM elements, not sprites, and that is a deliberate choice rather
 * than a shortcut. Numbers have to be *crisp* — a canvas-atlas sprite is either
 * blurry at distance or expensive at scale, while a `<span>` is rendered by the
 * browser's text engine at native resolution for free, kerned, and styleable
 * with the same CSS as the rest of the HUD. The only cost is one
 * `Vector3.project` and one transform write per live number per frame, and the
 * pool is capped so that number stays small.
 *
 * Everything is pooled: a long fight allocates nothing after the first few
 * seconds, and elements are hidden rather than removed so the browser never
 * re-lays-out the container.
 */
export class DamageNumbers {
  /**
   * @param {HTMLElement} host element the numbers are positioned inside
   * @param {number} [capacity] hard cap on simultaneous numbers
   */
  constructor(host, capacity = 28) {
    this.root = document.createElement('div');
    this.root.className = 'combat-text';
    host.appendChild(this.root);

    this.capacity = capacity;
    this.pool = [];
    this.active = [];

    for (let i = 0; i < capacity; i++) {
      const element = document.createElement('span');
      element.className = 'combat-text__item';
      element.style.display = 'none';
      this.root.appendChild(element);
      this.pool.push(element);
    }
  }

  /**
   * @param {Vector3} position   world space
   * @param {string|number} text
   * @param {object} [options]
   * @param {string} [options.kind]  'normal' | 'crit' | 'shatter' | 'burn' | 'player' | 'heal'
   * @param {string} [options.color] CSS colour override
   */
  spawn(position, text, options = {}) {
    // When the pool is dry, the *oldest* number is recycled rather than the new
    // one dropped: in a big hit the last numbers are the interesting ones.
    let element = this.pool.pop();
    if (!element) {
      const oldest = this.active.shift();
      if (!oldest) return;
      element = oldest.element;
    }

    const kind = options.kind ?? 'normal';
    element.textContent = String(text);
    element.className = `combat-text__item is-${kind}`;
    if (options.color) element.style.color = options.color;
    else element.style.removeProperty('color');
    element.style.display = 'block';

    this.active.push({
      element,
      position: new Vector3(position.x, position.y, position.z),
      // A little lateral drift, so two hits on the same body do not stack into
      // one illegible column.
      drift: (Math.random() - 0.5) * 26,
      age: 0,
      life: kind === 'crit' || kind === 'shatter' ? 1.25 : 0.95,
      rise: kind === 'player' ? 46 : 62
    });
  }

  /**
   * @param {number} dt  real seconds — combat text keeps moving while paused
   * @param {THREE.Camera} camera
   * @param {number} width  css pixels
   * @param {number} height
   */
  update(dt, camera, width, height) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      const t = item.age / item.life;

      if (t >= 1) {
        item.element.style.display = 'none';
        this.active.splice(i, 1);
        this.pool.push(item.element);
        continue;
      }

      _projected.copy(item.position).project(camera);
      // Behind the camera: NDC z leaves [-1,1] and x/y mirror. Hide rather than
      // draw the number at a nonsense position.
      if (_projected.z > 1) {
        item.element.style.display = 'none';
        continue;
      }
      item.element.style.display = 'block';

      const x = (_projected.x * 0.5 + 0.5) * width + item.drift * t;
      // Ease-out rise: fast off the body, then hangs where it can be read.
      const y = (1 - (_projected.y * 0.5 + 0.5)) * height - item.rise * (1 - Math.pow(1 - t, 2.2));

      item.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // Full opacity for the first half, then out — the number should be *read*,
      // not watched fading.
      item.element.style.opacity = t < 0.5 ? '1' : String(1 - (t - 0.5) * 2);
      item.element.style.setProperty('--pop', String(Math.min(1, item.age / 0.12)));
    }
  }

  clear() {
    for (const item of this.active) {
      item.element.style.display = 'none';
      this.pool.push(item.element);
    }
    this.active.length = 0;
  }

  dispose() {
    this.clear();
    this.root.remove();
    this.pool.length = 0;
  }
}
