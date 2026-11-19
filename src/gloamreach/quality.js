/**
 * Quality tiers: what the machine can draw at 60 frames a second. A first
 * guess from the GPU's name, memory and screen, then a governor that steps
 * down when frames run long and back up when there is room. Pure.
 */

export const TIERS = ['low', 'medium', 'high', 'ultra'];

/** What each tier turns on. `scale` is the render resolution (× device pixels, capped). */
export const SETTINGS = {
  low: { scale: 0.62, maxDpr: 1, shadow: 1024, shadowBox: 70, grass: 0.35, grassFar: false, ao: false, rays: false, bloom: true, smaa: false, treeLod: 0.55, foliage: 0.45, lights: 3, fireflies: 300 },
  medium: { scale: 0.8, maxDpr: 1.25, shadow: 2048, shadowBox: 90, grass: 0.6, grassFar: true, ao: true, rays: true, bloom: true, smaa: true, treeLod: 0.75, foliage: 0.7, lights: 5, fireflies: 600 },
  high: { scale: 1, maxDpr: 1.5, shadow: 4096, shadowBox: 110, grass: 1, grassFar: true, ao: true, rays: true, bloom: true, smaa: true, treeLod: 1, foliage: 1, lights: 8, fireflies: 1000 },
  ultra: { scale: 1, maxDpr: 2, shadow: 4096, shadowBox: 130, grass: 1.35, grassFar: true, ao: true, rays: true, bloom: true, smaa: true, treeLod: 1.2, foliage: 1.2, lights: 10, fireflies: 1400 }
};

/**
 * A first tier from what the browser tells about the machine.
 * @param {{ gpu?: string, memory?: number, cores?: number, pixels?: number, mobile?: boolean }} info
 */
export function chooseTier({ gpu = '', memory = 8, cores = 8, pixels = 1920 * 1080, mobile = false } = {}) {
  const g = gpu.toLowerCase();
  let score = 2; // high
  if (/swiftshader|llvmpipe|software|basic render/.test(g)) return 'low';
  if (mobile) score -= 1;
  if (/intel(?!.*arc)|uhd|iris|mali|adreno [1-6]|powervr|apple gpu/.test(g)) score -= 1;
  if (/rtx [3-9]0|rx [6-9][0-9]{3}|radeon pro w|apple m[2-9] (pro|max|ultra)|apple m[3-9]/.test(g)) score += 1;
  if (memory && memory < 4) score -= 1;
  if (cores && cores <= 4) score -= 1;
  if (pixels > 3200 * 1800 && score < 3) score -= 0; // the resolution cap handles big screens
  return TIERS[Math.max(0, Math.min(TIERS.length - 1, score))];
}

/**
 * The governor: feed it frame times (ms); it says when to change tier.
 * Down after ~2 s of slow frames, up after ~8 s of easy ones, and it never
 * climbs back to a tier it had to leave twice.
 */
export class Governor {
  constructor(tier = 'high', { target = 16.7, min = 'low', max = 'ultra' } = {}) {
    this.tier = tier;
    this.target = target;
    this.min = TIERS.indexOf(min);
    this.max = TIERS.indexOf(max);
    this.slow = 0;
    this.easy = 0;
    this.avg = target;
    this.strikes = {};
  }

  /** One frame of `ms`. Returns the new tier if it changed, else null. */
  frame(ms) {
    this.avg += (Math.min(ms, 100) - this.avg) * 0.05;
    const i = TIERS.indexOf(this.tier);
    if (this.avg > this.target * 1.22) {
      this.slow += ms;
      this.easy = 0;
    } else if (this.avg < this.target * 0.72) {
      this.easy += ms;
      this.slow = 0;
    } else {
      this.slow = Math.max(0, this.slow - ms * 0.5);
      this.easy = Math.max(0, this.easy - ms * 0.5);
    }
    if (this.slow > 2000 && i > this.min) {
      this.strikes[this.tier] = (this.strikes[this.tier] ?? 0) + 1;
      return this._set(TIERS[i - 1]);
    }
    if (this.easy > 8000 && i < this.max && (this.strikes[TIERS[i + 1]] ?? 0) < 2) return this._set(TIERS[i + 1]);
    return null;
  }

  _set(tier) {
    this.tier = tier;
    this.slow = 0;
    this.easy = 0;
    this.avg = this.target;
    return tier;
  }
}
