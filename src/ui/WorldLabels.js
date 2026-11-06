import { Vector3 } from 'three';

const _p = new Vector3();

/**
 * Text that floats over things in the world — portal names, dropped items in
 * their rarity colour, NPC names and the "F Talk" prompt. Plain DOM elements
 * moved every frame to the projected position; hidden behind the camera and
 * past `maxDistance`.
 */
export class WorldLabels {
  constructor(host) {
    this.root = document.createElement('div');
    this.root.className = 'world-labels';
    host.appendChild(this.root);
    /** @type {Set<{ el: HTMLElement, position: Vector3, offset: number, maxDistance: number, onClick?: Function }>} */
    this.labels = new Set();
  }

  /**
   * @param {Vector3} position followed live (pass the object's own vector)
   * @param {string} text
   * @param {{ className?: string, offset?: number, maxDistance?: number, color?: string, onClick?: () => void }} [options]
   */
  add(position, text, { className = '', offset = 2, maxDistance = 40, color, onClick } = {}) {
    const el = document.createElement('div');
    el.className = `world-label ${className}`.trim();
    el.textContent = text;
    if (color) el.style.color = color;
    if (onClick) {
      el.classList.add('is-clickable');
      el.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        onClick();
      });
    }
    this.root.appendChild(el);
    const label = { el, position, offset, maxDistance, onClick };
    this.labels.add(label);
    return {
      el,
      setText: (value) => (el.textContent = value),
      setVisible: (visible) => (label.hidden = !visible),
      remove: () => {
        el.remove();
        this.labels.delete(label);
      }
    };
  }

  clear() {
    for (const label of this.labels) label.el.remove();
    this.labels.clear();
  }

  setVisible(visible) {
    this.root.hidden = !visible;
  }

  /** @param {import('three').Camera} camera */
  update(camera) {
    if (this.root.hidden) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const label of this.labels) {
      _p.copy(label.position);
      _p.y += label.offset;
      const distance = _p.distanceTo(camera.position);
      _p.project(camera);
      const visible = !label.hidden && _p.z < 1 && distance < label.maxDistance;
      label.el.style.display = visible ? '' : 'none';
      if (!visible) continue;
      label.el.style.transform = `translate(-50%, -100%) translate(${((_p.x + 1) / 2) * w}px, ${((1 - _p.y) / 2) * h}px)`;
    }
  }
}
