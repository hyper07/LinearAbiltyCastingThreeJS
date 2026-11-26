/**
 * Pure helpers for animation data (no three.js): keyframe reduction, quantising,
 * track masks and root motion on plain arrays, so they're testable and usable
 * in build scripts. three.js wrappers that take an AnimationClip: retarget.js.
 *
 *   const { times, values } = reduceKeys(track.times, track.values, 4, 0.004, { quat: true });
 */

/** Angle between two unit quaternions (radians). */
export function quatAngle(a, ai, b, bi) {
  const d = Math.abs(a[ai] * b[bi] + a[ai + 1] * b[bi + 1] + a[ai + 2] * b[bi + 2] + a[ai + 3] * b[bi + 3]);
  return 2 * Math.acos(Math.min(1, d));
}

/**
 * Drop keys that linear interpolation between their neighbours already
 * reproduces within `tol` (Ramer–Douglas–Peucker over time). Vectors measure the
 * largest component error (scene units); quaternions the angle (radians, via a
 * normalised lerp, which is what three's slerp-free linear interpolant does for small steps).
 * The first and last keys are always kept.
 * @returns {{ times: Float32Array, values: Float32Array, kept: number[] }}
 */
export function reduceKeys(times, values, stride, tol, { quat = false } = {}) {
  const n = times.length;
  if (n <= 2) return { times: Float32Array.from(times), values: Float32Array.from(values), kept: [...Array(n).keys()] };
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const tmp = new Float32Array(stride);
  const err = (i, a, b) => {
    const u = (times[i] - times[a]) / (times[b] - times[a] || 1);
    let m = 0;
    if (quat) {
      // nlerp, with the shorter way round
      const dot = values[a * 4] * values[b * 4] + values[a * 4 + 1] * values[b * 4 + 1] + values[a * 4 + 2] * values[b * 4 + 2] + values[a * 4 + 3] * values[b * 4 + 3];
      const sgn = dot < 0 ? -1 : 1;
      let len = 0;
      for (let k = 0; k < 4; k++) {
        tmp[k] = values[a * 4 + k] * (1 - u) + sgn * values[b * 4 + k] * u;
        len += tmp[k] * tmp[k];
      }
      len = Math.sqrt(len) || 1;
      for (let k = 0; k < 4; k++) tmp[k] /= len;
      m = quatAngle(tmp, 0, values, i * 4);
    } else {
      for (let k = 0; k < stride; k++) m = Math.max(m, Math.abs(values[a * stride + k] * (1 - u) + values[b * stride + k] * u - values[i * stride + k]));
    }
    return m;
  };
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const e = err(i, a, b);
      if (e > worst) {
        worst = e;
        at = i;
      }
    }
    if (at >= 0 && worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const kept = [];
  for (let i = 0; i < n; i++) if (keep[i]) kept.push(i);
  const t = new Float32Array(kept.length);
  const v = new Float32Array(kept.length * stride);
  kept.forEach((i, j) => {
    t[j] = times[i];
    for (let k = 0; k < stride; k++) v[j * stride + k] = values[i * stride + k];
  });
  return { times: t, values: v, kept };
}

/** A track that never moves (every key within `tol` of the first) can go: the rest pose holds it. */
export function isConstant(values, stride, tol = 1e-4) {
  for (let i = stride; i < values.length; i++) if (Math.abs(values[i] - values[i % stride]) > tol) return false;
  return true;
}

/**
 * Snap values to a grid of `step` (what a 16-bit quantiser does: quaternions in
 * [−1, 1] at 16 bits is a step of 2/65535). Returns a new array.
 */
export function quantize(values, step) {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = Math.round(values[i] / step) * step;
  return out;
}

/** Bone-name patterns for masks. Works for Mixamo, Unreal/Mesh2Motion/Quaternius, VRM and our plush rigs. */
export const MASKS = {
  upperBody: /spine|chest|neck|head|clavicle|shoulder|arm|elbow|hand|wrist|finger|thumb|index|middle|ring|pinky|ear/i,
  lowerBody: /pelvis|hips?\b|hip$|thigh|upleg|leg|calf|knee|shin|foot|ankle|toe|ball|tail/i,
  arms: /clavicle|shoulder|arm|elbow|hand|wrist|finger|thumb|index|middle|ring|pinky/i,
  head: /neck|head|ear|jaw|eye/i
};

/** The bone a track name animates ("mixamorig:LeftArm.quaternion" → "mixamorig:LeftArm"). */
export const trackBone = (name) => name.slice(0, name.lastIndexOf('.'));

/** Track names that a mask keeps: `mask` is a RegExp over bone names or a list of names. */
export function maskTracks(names, mask) {
  const test = mask instanceof RegExp ? (b) => mask.test(b) : (b) => mask.includes(b);
  return names.filter((n) => test(trackBone(n)));
}

/**
 * Root motion out of a hips/root position track (values: xyz per key):
 * `inPlace` keeps the vertical bob and removes the travel (so the game moves the
 * character); `delta` is how far the clip travels over one loop (to move the
 * character by, each loop). `axes` picks the travel axes (x and z).
 */
export function splitRootMotion(values, { axes = [0, 2] } = {}) {
  const inPlace = Float32Array.from(values);
  const n = values.length / 3;
  const delta = [0, 0, 0];
  for (const a of axes) {
    delta[a] = values[(n - 1) * 3 + a] - values[a];
    for (let i = 0; i < n; i++) inPlace[i * 3 + a] = values[a];
  }
  return { inPlace, delta };
}

/** Scale the movement of a position track around its first key (e.g. by leg-length ratio for a chibi); `y` scales the vertical separately. */
export function scaleMotion(values, k, { y = k, clampY = null } = {}) {
  const out = Float32Array.from(values);
  for (let i = 0; i < values.length; i += 3) {
    out[i] = values[0] + (values[i] - values[0]) * k;
    let dy = (values[i + 1] - values[1]) * y;
    if (clampY) dy = Math.min(clampY[1], Math.max(clampY[0], dy));
    out[i + 1] = values[1] + dy;
    out[i + 2] = values[2] + (values[i + 2] - values[2]) * k;
  }
  return out;
}
