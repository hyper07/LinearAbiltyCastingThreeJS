/**
 * Quality tiers for Kithvale: what each turns on. The first guess from the
 * graphics card and the governor that steps down when frames run long (and
 * back up when there's room) are Gloamreach's, unchanged. Pure.
 *
 *   scale      render resolution (× device pixels, capped by maxDpr)
 *   shadow     sun shadow map size; shadowBox its reach (metres)
 *   grass      meadow grass density; grassFar the coarse outer ring
 *   flowers    wildflowers among it
 *   ao         ambient occlusion from depth
 *   paint      the painterly brush filter's radius (0 off)
 *   outline    soft ink outlines from depth
 *   fur        fur shells on the woolly creatures
 *   sculpt     sculpting grid for the creatures (cells along the longest side)
 *   trees      share of the woods drawn; treeFar how far
 */
import { TIERS } from '../gloamreach/quality.js';

export { chooseTier, Governor, TIERS } from '../gloamreach/quality.js';

export const SETTINGS = {
  low: { scale: 0.7, maxDpr: 1.25, shadow: 1024, shadowBox: 60, grass: 0.4, grassFar: false, flowers: 0.5, ao: false, paint: 0, outline: true, bloom: true, smaa: false, fur: 0, sculpt: 44, trees: 0.6, treeFar: 260, texSize: 512 },
  medium: { scale: 0.85, maxDpr: 1.5, shadow: 2048, shadowBox: 80, grass: 0.7, grassFar: true, flowers: 0.8, ao: true, paint: 2, outline: true, bloom: true, smaa: true, fur: 4, sculpt: 56, trees: 0.85, treeFar: 340, texSize: 1024 },
  high: { scale: 1, maxDpr: 1.5, shadow: 4096, shadowBox: 100, grass: 1, grassFar: true, flowers: 1, ao: true, paint: 3, outline: true, bloom: true, smaa: true, fur: 6, sculpt: 68, trees: 1, treeFar: 420, texSize: 1024 },
  ultra: { scale: 1, maxDpr: 2, shadow: 4096, shadowBox: 120, grass: 1.1, grassFar: true, flowers: 1.2, ao: true, paint: 3, outline: true, bloom: true, smaa: true, fur: 8, sculpt: 76, trees: 1, treeFar: 480, texSize: 1024 }
};

/** What a tier change can apply live (the rest — textures, sculpting, tree counts — needs a reload). */
export const LIVE = ['scale', 'maxDpr', 'shadow', 'shadowBox', 'grass', 'grassFar', 'flowers', 'ao', 'paint', 'outline', 'bloom', 'smaa', 'fur'];

/** A phone or tablet gets the light tier at most to start with (the governor may still climb). */
export function startTier(guess, { mobile = false, touch = false } = {}) {
  if (mobile) return 'low';
  if (touch && TIERS.indexOf(guess) > TIERS.indexOf('medium')) return 'medium';
  return guess;
}
