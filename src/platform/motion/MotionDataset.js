/**
 * Per-character locomotion clip sets — the data side of a 1D blend tree.
 *
 * Motion *profiles* tune scalar gait params (speed, cadence, lean). Motion
 * *datasets* point at authored clips (idle / walk / run) and the thresholds
 * used to crossfade between them. Different characters can share a profile
 * but use different datasets when their rigs or styles differ.
 */

/**
 * @typedef {object} MotionClipRefs
 * @property {string} [walk] clip id → `./models/<id>.fbx`
 * @property {string} [run]
 * @property {string} [sprint] optional; falls back to `run`
 */

/**
 * @typedef {object} MotionBlendParams
 * @property {number} [idleMaxSpeed]  m/s — below this, full idle weight
 * @property {number} [walkSpeed]     nominal m/s for a full walk cycle
 * @property {number} [runSpeed]        nominal m/s for a full run cycle
 * @property {number} [crossFade]       seconds-ish smoothing for weight changes
 * @property {number} [walkTimeScale]   multiplier on speed-sync for walk clip
 * @property {number} [runTimeScale]    multiplier on speed-sync for run clip
 */

/**
 * @typedef {object} MotionDataset
 * @property {string} id
 * @property {string} label
 * @property {MotionClipRefs} clips
 * @property {MotionBlendParams} blend
 * @property {boolean} [embedded] clips are inside the character GLB, not separate FBX
 */

/**
 * @param {string} id
 * @param {Partial<MotionDataset>} data
 * @returns {MotionDataset}
 */
export function createMotionDataset(id, data) {
  return {
    id,
    label: data.label ?? id,
    clips: data.clips ?? {},
    blend: data.blend ?? {},
    proceduralFallback: data.proceduralFallback !== false,
    ...data
  };
}

/** Resolve a locomotion clip URL from its id. */
export function locomotionClipUrl(clipId) {
  return `./models/${clipId}.fbx`;
}
