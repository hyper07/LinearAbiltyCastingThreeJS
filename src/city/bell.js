/**
 * A classic bicycle bell — "ring-ring" — synthesised (a sound effect, made
 * here; no sample to credit). A thumb lever spins a striker against a small
 * steel dome: each ring is a quick burst of strikes (the "brrr"), and the
 * dome sings at a few inharmonic pitches that die away fast, the highest
 * fastest, two near-twins of the lowest beating against each other (the
 * shimmer of a real bell). Two rings, a beat apart.
 *
 *   const nodes = ringBell(audio, { gain: 0.5, pan: -0.3, pitch: 1 });
 *   // → how many sound sources it started (the e2e checks look at it)
 */

/** The dome's partials: [ratio to the lowest, loudness, seconds to die away]. */
export const DOME = [
  [1, 1, 0.9],
  [1.0065, 0.7, 0.85],
  [2.32, 0.45, 0.42],
  [3.86, 0.28, 0.22],
  [5.43, 0.16, 0.12]
];
/** The pattern: rings (seconds from the start), and how many strikes in each burst, how far apart. */
export const RING = { rings: [0, 0.3], strikes: 4, gap: 0.03, base: 2680 };

let noise = null;

/**
 * Ring a bell now (or `at` seconds from now). `gain` loudness (1 = your own bell), `pan` −1 left … 1
 * right, `pitch` a bell a little higher or lower (riders' bells differ). Returns the number of sources started.
 */
export function ringBell(audio, { gain = 1, pan = 0, pitch = 1, at = 0, dest = null } = {}) {
  if (!audio || gain <= 0.003) return 0;
  const t0 = audio.currentTime + at + 0.005;
  const out = audio.createGain();
  out.gain.value = 0.16 * gain;
  let tail = out;
  if (pan && audio.createStereoPanner) {
    const p = audio.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    tail = p;
  }
  tail.connect(dest ?? audio.destination);
  let started = 0;
  const f0 = RING.base * pitch;
  for (const r0 of RING.rings) {
    for (let k = 0; k < RING.strikes; k++) {
      const t = t0 + r0 + k * RING.gap;
      // the striker loses a little each hit; the first hit of a ring is the hardest
      const hit = (k === 0 ? 1 : 0.62 - k * 0.08) * (r0 ? 0.92 : 1);
      for (const [ratio, amp, decay] of DOME) {
        // (each strike's sound runs on under the next: only the last of a burst rings its full length)
        const life = k === RING.strikes - 1 ? decay : Math.min(decay, RING.gap * 2.5 + decay * 0.25);
        const o = audio.createOscillator();
        o.type = 'sine';
        o.frequency.value = f0 * ratio;
        const g = audio.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp * hit, t + 0.0015);
        g.gain.exponentialRampToValueAtTime(0.0008, t + life);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + life + 0.02);
        started++;
      }
      // the strike itself: a tick of bright noise
      noise ??= (() => {
        const b = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.02), audio.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        return b;
      })();
      const n = audio.createBufferSource();
      n.buffer = noise;
      const hp = audio.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4500;
      const ng = audio.createGain();
      ng.gain.value = 0.35 * hit;
      n.connect(hp).connect(ng).connect(out);
      n.start(t);
      started++;
    }
  }
  return started;
}
