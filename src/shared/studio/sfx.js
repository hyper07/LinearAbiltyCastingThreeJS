/**
 * The Studio's sound effects: our own, synthesized in the browser with Web Audio (no files,
 * no outside licence — Gamory original, CC0). Each sound is a short recipe of notes; the asset
 * browser previews them with the same player the games use.
 *
 *   playSound('coin-bright')
 */
export const SOUND_INFO = {
  chime: { name: 'Chime', event: 'coin', notes: [[1046, 0, 0.18, 'sine'], [1568, 0.06, 0.3, 'sine']] },
  'coin-bright': { name: 'Bright coin', event: 'coin', notes: [[988, 0, 0.07, 'square'], [1319, 0.07, 0.22, 'square']], gain: 0.12 },
  blip: { name: 'Blip', event: 'jump', notes: [[660, 0, 0.06, 'square']], gain: 0.12 },
  sparkle: { name: 'Sparkle', event: 'powerup', notes: [[1319, 0, 0.08, 'triangle'], [1760, 0.06, 0.08, 'triangle'], [2093, 0.12, 0.08, 'triangle'], [2637, 0.18, 0.2, 'triangle']] },
  pop: { name: 'Pop', event: 'hit', notes: [[420, 0, 0.05, 'sine', 180]] },
  boing: { name: 'Boing', event: 'jump', notes: [[220, 0, 0.25, 'sine', 520]] },
  swoosh: { name: 'Swoosh', event: 'attack', noise: [0, 0.18, 2400, 600] },
  thud: { name: 'Thud', event: 'hit', notes: [[110, 0, 0.16, 'sine', 50]], noise: [0, 0.06, 900, 300], gain: 0.4 },
  zap: { name: 'Zap', event: 'attack', notes: [[1400, 0, 0.14, 'sawtooth', 200]], gain: 0.1 },
  bell: { name: 'Bell', event: 'door', notes: [[784, 0, 0.6, 'sine'], [1568, 0, 0.4, 'sine'], [2352, 0, 0.25, 'sine']], gain: 0.18 },
  fanfare: { name: 'Fanfare', event: 'win', notes: [[523, 0, 0.12, 'square'], [659, 0.12, 0.12, 'square'], [784, 0.24, 0.12, 'square'], [1046, 0.36, 0.45, 'square']], gain: 0.1 },
  'sad-horn': { name: 'Sad horn', event: 'lose', notes: [[392, 0, 0.25, 'sawtooth'], [370, 0.25, 0.25, 'sawtooth'], [349, 0.5, 0.6, 'sawtooth', 300]], gain: 0.08 },
  splash: { name: 'Splash', event: 'splash', noise: [0, 0.35, 1800, 400], gain: 0.35 },
  crunch: { name: 'Crunch', event: 'hurt', noise: [0, 0.12, 700, 200], notes: [[160, 0, 0.12, 'square', 80]], gain: 0.25 },
  click: { name: 'Click', event: 'step', notes: [[1800, 0, 0.015, 'square']], gain: 0.06 },
  whoosh: { name: 'Whoosh', event: 'door', noise: [0, 0.4, 600, 2600], gain: 0.25 },
  none: { name: 'No sound', event: null, notes: [] }
};

let ctx = null;
let noiseBuffer = null;
let volume = 0.7;

const audio = () => {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
};

export function setSoundVolume(v) {
  volume = Math.max(0, Math.min(1, Number(v) || 0));
}

/** Play one of SOUND_INFO's sounds now (silently does nothing without Web Audio). */
export function playSound(id) {
  const info = SOUND_INFO[id];
  const ac = audio();
  if (!info || !ac || volume <= 0) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const t0 = ac.currentTime + 0.01;
  const out = ac.createGain();
  out.gain.value = (info.gain ?? 0.2) * volume;
  out.connect(ac.destination);
  for (const [freq, at, dur, type = 'sine', to = null] of info.notes ?? []) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0 + at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + at + dur);
    env.gain.setValueAtTime(0.0001, t0 + at);
    env.gain.exponentialRampToValueAtTime(1, t0 + at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(env).connect(out);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.02);
  }
  if (info.noise) {
    const [at, dur, from, to] = info.noise;
    if (!noiseBuffer) {
      noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, t0 + at);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + at + dur);
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t0 + at);
    env.gain.exponentialRampToValueAtTime(1, t0 + at + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    src.connect(filter).connect(env).connect(out);
    src.start(t0 + at);
    src.stop(t0 + at + dur + 0.02);
  }
}
