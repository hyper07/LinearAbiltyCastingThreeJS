import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

/**
 * Ambient occlusion that only sees solid things. three's GTAOPass draws the
 * scene once more with a normal material to find where surfaces meet, and
 * leaves out only points and lines — so every see-through quad went in as a
 * solid card: a puff of dust behind a slipping rider, a comic "WHOA!", a
 * lamp's glow, a painted arrow. Each one then shadowed the road round it as a
 * hard dark rectangle (images2/jarani-review/pass9-slip-*). Here those are
 * left out too: sprites, and anything drawn see-through without writing
 * depth (glows, decals, puffs, haloes).
 */
export function aoSkips(object) {
  if (!object?.visible) return false;
  if (object.isPoints || object.isLine || object.isLine2 || object.isSprite) return true;
  if (!object.isMesh) return false;
  const mats = Array.isArray(object.material) ? object.material : [object.material];
  return mats.length > 0 && mats.every((m) => m && m.transparent && m.depthWrite === false);
}

export class SolidGTAOPass extends GTAOPass {
  _overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((object) => {
      if (aoSkips(object)) {
        object.visible = false;
        cache.push(object);
      }
    });
  }
}
