/**
 * Quality tiers for Wyldhunt: what each turns on. The first guess (from the
 * graphics card) and the governor that steps down when frames run long and
 * back up when there is room are Gloamreach's, unchanged. Pure.
 *
 *   scale      render resolution (× device pixels, capped by maxDpr)
 *   shadow     sun shadow map size; shadowBox its reach (metres)
 *   grass      ground-cover density; plants the instanced jungle plants'
 *   furShells  layers of fur on the mount and the Gnarlhorn's ruff
 *   rain       raindrops drawn in a shower
 *   mist       mist cards per waterfall; spray particles
 *   refract    the water bends what is under it (a copy of the frame)
 */
export { chooseTier, Governor, TIERS } from '../gloamreach/quality.js';

export const SETTINGS = {
  low: { scale: 0.62, maxDpr: 1, shadow: 1024, shadowBox: 70, grass: 0.35, grassFar: false, plants: 0.45, ao: false, rays: false, bloom: true, smaa: false, treeLod: 0.55, lights: 2, furShells: 6, rain: 3500, mist: 10, spray: 250, refract: false, texSize: 512 },
  medium: { scale: 0.8, maxDpr: 1.25, shadow: 2048, shadowBox: 90, grass: 0.6, grassFar: true, plants: 0.7, ao: true, rays: true, bloom: true, smaa: true, treeLod: 0.75, lights: 4, furShells: 10, rain: 7000, mist: 16, spray: 500, refract: true, texSize: 1024 },
  high: { scale: 1, maxDpr: 1.5, shadow: 4096, shadowBox: 110, grass: 1, grassFar: true, plants: 1, ao: true, rays: true, bloom: true, smaa: true, treeLod: 1, lights: 6, furShells: 14, rain: 11000, mist: 22, spray: 800, refract: true, texSize: 1024 },
  ultra: { scale: 1, maxDpr: 2, shadow: 4096, shadowBox: 130, grass: 1.3, grassFar: true, plants: 1.2, ao: true, rays: true, bloom: true, smaa: true, treeLod: 1.2, lights: 8, furShells: 18, rain: 16000, mist: 28, spray: 1100, refract: true, texSize: 1024 }
};

/** What a tier change can apply live (the rest needs a reload: textures, tree detail). */
export const LIVE = ['scale', 'shadow', 'shadowBox', 'grass', 'ao', 'rays', 'bloom', 'smaa', 'lights', 'furShells', 'rain', 'refract'];
