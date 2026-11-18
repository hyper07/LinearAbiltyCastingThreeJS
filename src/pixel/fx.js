import { createFx, createFrame, clearFrame, composite } from '../../vendor/pixelfx/core/fx.js';

/**
 * Pixel-art effects for any game on the platform: the 244 effects of
 * pixelfx (vendor/pixelfx, MIT — see its LICENSE and NOTICE.md), played into
 * a small canvas you draw wherever you like — a 2D canvas (`drawImage`, with
 * smoothing off) or three.js (`texture()` gives a CanvasTexture for a sprite
 * or a plane).
 *
 * Effects are looked up by id ("fire/campfire", "explosions/…"): search
 * knowledge/pixelfx.json or `npm run kb -- <words>` for the one you want.
 * Each loads on demand (one small module), so a game ships only what it plays.
 *
 *   const fire = await playFx('fire/campfire', { palette: ['#102', '#f80', '#fff'] });
 *   // each frame:
 *   fire.update(dt);
 *   ctx.imageSmoothingEnabled = false;
 *   ctx.drawImage(fire.canvas, x - fire.origin[0] * zoom, y - fire.origin[1] * zoom, fire.size[0] * zoom, fire.size[1] * zoom);
 *   if (fire.done) …                    // a one-shot has finished
 */

const loaders = import.meta.glob('../../vendor/pixelfx/fx/*/*.js');
const cache = new Map();

/** The effect module for an id like "fire/campfire" (null if there is none). */
export async function loadFx(id) {
  if (!cache.has(id)) {
    const load = loaders[`../../vendor/pixelfx/fx/${id}.js`];
    cache.set(id, load ? load().catch(() => null) : Promise.resolve(null));
  }
  return cache.get(id);
}

/** Every effect id there is. */
export const fxIds = () => Object.keys(loaders).map((p) => p.replace('../../vendor/pixelfx/fx/', '').replace(/\.js$/, '')).filter((id) => !id.endsWith('/_lib'));

export class FxPlayer {
  /**
   * @param {object} mod an effect module (from loadFx)
   * @param {object} [options] palette (hex ramp, dark to bright), seed, flip, angle, light (glow strength), and the effect's own
   */
  constructor(mod, options = {}) {
    this.meta = mod.meta;
    this.size = mod.meta.size;
    this.origin = mod.meta.origin;
    this.loop = Boolean(mod.meta.loop);
    this.fx = createFx(mod, options);
    this.frame = createFrame(this.size[0], this.size[1], -this.origin[0], -this.origin[1]);
    this.canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(this.size[0], this.size[1]) : Object.assign(document.createElement('canvas'), { width: this.size[0], height: this.size[1] });
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(this.size[0], this.size[1]);
    this.step = 1 / (mod.meta.fps ?? 30);
    this.acc = this.step; // draw the first frame at once
    this._texture = null;
  }

  /** Advance by dt seconds; repaints the canvas at the effect's own frame rate (pixel art should not tween). */
  update(dt) {
    this.acc += Math.min(0.25, dt);
    let stepped = false;
    while (this.acc >= this.step) {
      this.acc -= this.step;
      this.fx.update(this.step);
      stepped = true;
    }
    if (!stepped) return false;
    clearFrame(this.frame);
    this.fx.draw(this.frame);
    composite(this.frame, this.image.data, null);
    this.ctx.putImageData(this.image, 0, 0);
    if (this._texture) this._texture.needsUpdate = true;
    return true;
  }

  /** A one-shot that has played out (or a loop told to stop, faded). */
  get done() {
    return this.fx.done();
  }

  /** Let a loop fade out. */
  stop() {
    this.fx.stop();
  }

  /** A three.js texture of the canvas, crisp (nearest), for a Sprite or a plane. Pass the THREE module. */
  texture(THREE) {
    if (!this._texture) {
      this._texture = new THREE.CanvasTexture(this.canvas);
      this._texture.magFilter = THREE.NearestFilter;
      this._texture.minFilter = THREE.NearestFilter;
      this._texture.colorSpace = THREE.SRGBColorSpace;
      this._texture.generateMipmaps = false;
    }
    return this._texture;
  }
}

/** Load and start an effect: resolves an FxPlayer, or null when the id is unknown. */
export async function playFx(id, options = {}) {
  const mod = await loadFx(id);
  return mod ? new FxPlayer(mod, options) : null;
}
