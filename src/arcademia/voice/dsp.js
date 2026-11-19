/**
 * The voice studio's take processing: plain maths on PCM (Float32Array,
 * mono), no AI and no dependencies. The studio decodes a take with WebAudio,
 * runs `processTake`, then encodes the result; the unit tests run the same
 * functions on synthetic buffers.
 *
 *   high-pass      a gentle 2nd-order 80 Hz high-pass (rumble, desk bumps)
 *   trim           leading and trailing silence, with a little air kept
 *   noise gate     optional and gentle: −12 dB between phrases, never a hard cut
 *   loudness       ITU-R BS.1770 integrated loudness (K-weighted, gated), to −18 LUFS
 *   limiter        a look-ahead peak limiter so peaks stay ≤ −1 dBFS
 *   fades          short raised-cosine fade in and out (no clicks)
 *   warnings       clipping, too quiet, too short, nothing heard, a noisy room
 */

export const TARGET_LUFS = -18;
export const CEILING_DB = -1;

export const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
export const undb = (d) => Math.pow(10, d / 20);

/** Downmix an AudioBuffer-like { numberOfChannels, getChannelData } (or arrays) to one channel. */
export function toMono(channels) {
  if (channels.length === 1) return Float32Array.from(channels[0]);
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length;
  return out;
}

export function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}

/* ---------------------------------------------------------------- filters */

/** Biquad coefficients, normalised (a0 = 1). RBJ cookbook. */
export function biquadCoeffs(type, fc, fs, { q = Math.SQRT1_2, gainDb = 0 } = {}) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0), sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'highpass') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (type === 'highshelf') {
    const A = Math.pow(10, gainDb / 40);
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 + (A - 1) * cos + s);
    b1 = -2 * A * (A - 1 + (A + 1) * cos);
    b2 = A * (A + 1 + (A - 1) * cos - s);
    a0 = A + 1 - (A - 1) * cos + s;
    a1 = 2 * (A - 1 - (A + 1) * cos);
    a2 = A + 1 - (A - 1) * cos - s;
  } else throw new Error(`unknown filter ${type}`);
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Run a biquad over x (a new array). */
export function biquad(x, c) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

export const highpass = (x, fs, fc = 80) => biquad(x, biquadCoeffs('highpass', fc, fs));

/**
 * The BS.1770 K-weighting at any sample rate: a +4 dB high shelf from
 * ~1.7 kHz, then the RLB ~38 Hz high-pass (the analogue prototypes as
 * libebur128 derives them; at 48 kHz this gives the spec's coefficients).
 */
export function kWeightCoeffs(fs) {
  let K = Math.tan((Math.PI * 1681.974450955533) / fs);
  const Q1 = 0.7071752369554196;
  const Vh = Math.pow(10, 3.999843853973347 / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q1 + K * K;
  const shelf = { b0: (Vh + (Vb * K) / Q1 + K * K) / a0, b1: (2 * (K * K - Vh)) / a0, b2: (Vh - (Vb * K) / Q1 + K * K) / a0, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q1 + K * K) / a0 };
  K = Math.tan((Math.PI * 38.13547087602444) / fs);
  const Q2 = 0.5003270373238773;
  a0 = 1 + K / Q2 + K * K;
  const hp = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q2 + K * K) / a0 };
  return { shelf, hp };
}
export function kWeight(x, fs) {
  const { shelf, hp } = kWeightCoeffs(fs);
  return biquad(biquad(x, shelf), hp);
}

/* ---------------------------------------------------------------- loudness */

/**
 * Integrated loudness in LUFS (ITU-R BS.1770-4, one channel): 400 ms blocks
 * every 100 ms, an absolute gate at −70 LUFS and a relative gate 10 LU below.
 * A take shorter than a block is measured as one block. −Infinity for silence.
 */
export function integratedLoudness(x, fs) {
  if (!x.length) return -Infinity;
  const k = kWeight(x, fs);
  const block = Math.round(0.4 * fs), step = Math.round(0.1 * fs);
  // Prefix sums of squares make each block O(1).
  const sq = new Float64Array(k.length + 1);
  for (let i = 0; i < k.length; i++) sq[i + 1] = sq[i] + k[i] * k[i];
  const z = [];
  if (k.length < block) z.push(sq[k.length] / k.length);
  else for (let s = 0; s + block <= k.length; s += step) z.push((sq[s + block] - sq[s]) / block);
  const L = (ms) => -0.691 + 10 * Math.log10(ms);
  const abs = z.filter((v) => v > 0 && L(v) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((v) => L(v) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

/* ---------------------------------------------------------------- silence, gate */

/** RMS per 10 ms frame, in dBFS. */
export function frameLevels(x, fs, frame = Math.max(1, Math.round(fs * 0.01))) {
  const n = Math.ceil(x.length / frame);
  const out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    const end = Math.min(x.length, (f + 1) * frame);
    for (let i = f * frame; i < end; i++) s += x[i] * x[i];
    out[f] = db(Math.sqrt(s / Math.max(1, end - f * frame)));
  }
  return out;
}

/** The room's level: the quietest tenth of the frames (dBFS). */
export function noiseFloor(levels) {
  const all = [...levels].map((v) => (Number.isFinite(v) ? Math.max(-120, v) : -120)).sort((a, b) => a - b);
  if (!all.length) return -120;
  return all[Math.floor(all.length * 0.1)];
}

/**
 * Where speech starts and ends (sample indices), keeping `padStart` and
 * `padEnd` seconds of air. A frame is speech when it is 12 dB over the room
 * (or 20 dB under the loudest frame, for a take with no pause at all) and no
 * more than 45 dB under the loudest frame; it takes three speech
 * frames in a row (30 ms) to count, so a click doesn't. null when nothing is heard.
 */
export function speechBounds(x, fs, { padStart = 0.08, padEnd = 0.15, floorDb = -60 } = {}) {
  const frame = Math.max(1, Math.round(fs * 0.01));
  const lv = frameLevels(x, fs, frame);
  if (!lv.length) return null;
  const loudest = Math.max(...lv.filter(Number.isFinite), -Infinity);
  const thr = Math.max(floorDb, Math.min(noiseFloor(lv) + 12, loudest - 20), loudest - 45);
  const run = 3;
  let first = -1, last = -1;
  for (let f = 0; f + run <= lv.length; f++) {
    let ok = true;
    for (let k = 0; k < run; k++) if (!(lv[f + k] > thr)) ok = false;
    if (ok) {
      if (first < 0) first = f;
      last = f + run - 1;
    }
  }
  if (first < 0) return null;
  const start = Math.max(0, first * frame - Math.round(padStart * fs));
  const end = Math.min(x.length, (last + 1) * frame + Math.round(padEnd * fs));
  return { start, end, thresholdDb: thr };
}

/**
 * A gentle downward expander: frames under `thresholdDb` are turned down by
 * `reductionDb` (never muted), with a quick open and a slow close so word
 * ends aren't chopped.
 */
export function noiseGate(x, fs, { thresholdDb, reductionDb = 12, attack = 0.005, release = 0.12, hold = 0.06 } = {}) {
  const frame = Math.max(1, Math.round(fs * 0.01));
  const lv = frameLevels(x, fs, frame);
  const thr = thresholdDb ?? noiseFloor(lv) + 8;
  const low = undb(-reductionDb);
  const y = new Float32Array(x.length);
  const ka = 1 - Math.exp(-1 / (attack * fs)), kr = 1 - Math.exp(-1 / (release * fs));
  let g = 1, held = 0;
  for (let i = 0; i < x.length; i++) {
    const open = lv[Math.floor(i / frame)] > thr;
    if (open) held = hold * fs;
    else held--;
    const target = open || held > 0 ? 1 : low;
    g += (target - g) * (target > g ? ka : kr);
    y[i] = x[i] * g;
  }
  return y;
}

/* ---------------------------------------------------------------- gain, limiter, fades */

/**
 * A look-ahead peak limiter: the gain each sample needs to stay under
 * `ceiling`, taken as the minimum over the next `lookahead` seconds,
 * released smoothly, then averaged over the look-ahead so it never steps.
 */
export function limit(x, fs, ceiling = undb(CEILING_DB), { lookahead = 0.005, release = 0.08 } = {}) {
  const n = x.length;
  const L = Math.max(1, Math.round(lookahead * fs));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.abs(x[i]);
    need[i] = a > ceiling ? ceiling / a : 1;
  }
  // Minimum over [i, i + L] with a monotonic deque.
  const ahead = new Float32Array(n);
  const dq = new Int32Array(n + L + 1);
  let head = 0, tail = 0;
  for (let j = 0; j < Math.min(n, L + 1); j++) {
    while (tail > head && need[dq[tail - 1]] >= need[j]) tail--;
    dq[tail++] = j;
  }
  for (let i = 0; i < n; i++) {
    const j = i + L + 1;
    ahead[i] = need[dq[head]];
    if (dq[head] === i) head++;
    if (j < n) {
      while (tail > head && need[dq[tail - 1]] >= need[j]) tail--;
      dq[tail++] = j;
    }
  }
  // Instant attack (already early by the look-ahead), smooth release.
  const kr = 1 - Math.exp(-1 / (release * fs));
  const g = new Float32Array(n);
  let s = 1;
  for (let i = 0; i < n; i++) {
    s = ahead[i] < s ? ahead[i] : s + (ahead[i] - s) * kr;
    g[i] = s;
  }
  // Average the gain over the trailing look-ahead window: never above what a peak needs, never a step.
  const y = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += g[i];
    if (i >= L) sum -= g[i - L];
    const avg = sum / Math.min(i + 1, L);
    const v = x[i] * Math.min(avg, g[i]);
    y[i] = Math.max(-ceiling, Math.min(ceiling, v));
  }
  return y;
}

export function gain(x, k) {
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * k;
  return y;
}

/** Raised-cosine fades at both ends, in place. */
export function fades(x, fs, inSec = 0.012, outSec = 0.04) {
  const a = Math.min(x.length >> 1, Math.round(inSec * fs)), b = Math.min(x.length >> 1, Math.round(outSec * fs));
  for (let i = 0; i < a; i++) x[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  for (let i = 0; i < b; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
  return x;
}

/** Bring x to `target` LUFS with peaks ≤ `ceilingDb`: gain, limit, measure, a second touch if the limiter took too much. */
export function normalize(x, fs, { target = TARGET_LUFS, ceilingDb = CEILING_DB, maxGainDb = 30 } = {}) {
  const before = integratedLoudness(x, fs);
  if (!Number.isFinite(before)) return { samples: Float32Array.from(x), gainDb: 0, lufs: before };
  const ceiling = undb(ceilingDb - 0.05);
  let g = Math.min(maxGainDb, target - before);
  let y = limit(gain(x, undb(g)), fs, ceiling);
  let after = integratedLoudness(y, fs);
  if (after < target - 0.3 && g < maxGainDb) {
    const more = Math.min(maxGainDb - g, target - after);
    g += more;
    y = limit(gain(x, undb(g)), fs, ceiling);
    after = integratedLoudness(y, fs);
  }
  return { samples: y, gainDb: g, lufs: after };
}

/* ---------------------------------------------------------------- the whole take */

export const DEFAULT_OPTIONS = Object.freeze({ highpass: true, gate: false, target: TARGET_LUFS, ceilingDb: CEILING_DB });

/**
 * Process one take: high-pass → trim → (gate) → loudness and peaks → fades.
 * Returns the new samples, the numbers, and warnings for the actor:
 *   clipping  the recording itself hit full scale (turn the input down, retake)
 *   quiet     the take was very quiet (move closer, turn the input up)
 *   noisy     the room is loud compared with the voice
 *   short     under a quarter of a second of speech
 *   empty     no speech heard at all
 *   limited   the loudness target could not be reached without squashing peaks
 */
export function processTake(input, fs, options = {}) {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const warnings = [];
  const rawPeak = peak(input);
  let clipped = 0;
  for (let i = 0; i < input.length; i++) if (Math.abs(input[i]) >= 0.999) clipped++;
  const rawLufs = integratedLoudness(input, fs);
  let x = o.highpass ? highpass(input, fs, 80) : Float32Array.from(input);
  const levels = frameLevels(x, fs);
  const room = noiseFloor(levels);
  const bounds = speechBounds(x, fs);
  if (!bounds) {
    return { samples: new Float32Array(0), sampleRate: fs, warnings: ['empty'], stats: { rawPeakDb: db(rawPeak), rawLufs, lufs: -Infinity, peakDb: -Infinity, gainDb: 0, duration: 0, noiseDb: room, clipped } };
  }
  x = x.slice(bounds.start, bounds.end);
  if (o.gate) x = noiseGate(x, fs, { thresholdDb: Math.max(room + 8, bounds.thresholdDb - 6) });
  const n = normalize(x, fs, { target: o.target, ceilingDb: o.ceilingDb });
  const y = fades(n.samples, fs);
  const lufs = integratedLoudness(y, fs);
  const duration = y.length / fs;
  if (clipped > 2 || rawPeak >= 0.999) warnings.push('clipping');
  if (rawLufs < -42 || n.gainDb > 24) warnings.push('quiet');
  const speech = Math.max(...levels.filter(Number.isFinite));
  if (room > -50 && speech - room < 25) warnings.push('noisy');
  if (duration < 0.25 + 0.23) warnings.push('short');
  if (lufs < o.target - 1.5) warnings.push('limited');
  return {
    samples: y,
    sampleRate: fs,
    warnings,
    stats: { rawPeakDb: db(rawPeak), rawLufs, lufs, peakDb: db(peak(y)), gainDb: n.gainDb, duration, noiseDb: room, clipped, trimmed: { start: bounds.start / fs, end: (input.length - bounds.end) / fs } }
  };
}

/** Words for the warnings (the studio shows them). */
export const WARNING_TEXT = {
  clipping: 'Clipping: the take hit full scale. Turn the mic input down or step back, then retake.',
  quiet: 'Very quiet take: move closer to the mic or turn the input up.',
  noisy: 'Noisy room: the background is loud next to the voice. Try the noise gate, or a quieter spot.',
  short: 'Very short: check the whole line was caught.',
  empty: 'Nothing heard: check the microphone.',
  limited: 'Peaks held the loudness back: a softer, steadier read will sound better.'
};

/** 16-bit PCM WAV bytes for mono samples (the tests, and a debug download in the studio). */
export function encodeWav(samples, fs) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, fs, true);
  v.setUint32(28, fs * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Uint8Array(buf);
}
