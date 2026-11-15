/**
 * Grave Purge's sound, all made in the browser (Web Audio) — no files, our
 * own: weapon fire, blasts, falling buildings, the spawn horn, the Forge's
 * chime, the Exchange's coin, frost, stim, the camp's heal; and the music —
 * a slow, dark piece in D minor (a drone, chords, soft drums, sparse bells)
 * that brings in war drums when there is fighting. Music and sound each
 * switch on and off (remembered).
 */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz
/** The chords, a bar each pair: D minor, B flat, G minor, A. */
const CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
const BPM = 72;

const stored = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};
const store = (key, on) => {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* private mode */
  }
};

export class PurgeAudio {
  constructor() {
    this.musicOn = stored('gamory.purge.music', true);
    this.sfxOn = stored('gamory.purge.sfx', true);
    this.intensity = 0;
    this.last = {};
  }

  /** Make the context (after a click: browsers ask for one). */
  start() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    const a = this.ctx;
    this.out = a.createDynamicsCompressor();
    this.out.threshold.value = -18;
    this.out.ratio.value = 6;
    this.out.connect(a.destination);
    this.sfx = a.createGain();
    this.sfx.gain.value = this.sfxOn ? 0.55 : 0;
    this.sfx.connect(this.out);
    this.music = a.createGain();
    this.music.gain.value = this.musicOn ? 0.25 : 0;
    this.music.connect(this.out);
    // A room: a soft, long reverb from decaying noise.
    this.verb = a.createConvolver();
    const len = a.sampleRate * 1.4;
    const ir = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.verb.buffer = ir;
    this.verbOut = a.createGain();
    this.verbOut.gain.value = 0.35;
    this.verb.connect(this.verbOut).connect(this.out);
    // Noise, for shots and blasts.
    const n = a.sampleRate;
    this.noise = a.createBuffer(1, n, a.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this._musicStart();
  }

  setMusic(on) {
    this.musicOn = on;
    store('gamory.purge.music', on);
    if (this.music) this.music.gain.setTargetAtTime(on ? 0.25 : 0, this.ctx.currentTime, 0.3);
  }

  setSfx(on) {
    this.sfxOn = on;
    store('gamory.purge.sfx', on);
    if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  /** 0 (quiet) to 1 (a fight): the war drums come in. */
  setIntensity(k) {
    this.intensity += (Math.max(0, Math.min(1, k)) - this.intensity) * 0.05;
  }

  close() {
    clearInterval(this.timer);
    this.ctx?.close?.();
    this.ctx = null;
  }

  /* --------------------------------------------------------------- pieces */

  _ok(name, gap) {
    if (!this.ctx || !this.sfxOn) return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  _env(gain, t, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _noise(t, dur, { type = 'bandpass', freq = 1800, q = 0.8, peak = 0.3, attack = 0.002, decay = dur, to = null, dest = this.sfx, verb = 0 } = {}) {
    const a = this.ctx;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = a.createGain();
    this._env(g, t, peak, attack, decay);
    src.connect(f).connect(g).connect(dest);
    if (verb) {
      const v = a.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.verb);
    }
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  _tone(t, freq, dur, { type = 'sine', peak = 0.2, attack = 0.005, to = null, dest = this.sfx, verb = 0, detune = 0 } = {}) {
    const a = this.ctx;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.detune.value = detune;
    const g = a.createGain();
    this._env(g, t, peak, attack, dur);
    o.connect(g).connect(dest);
    if (verb) {
      const v = a.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.verb);
    }
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  /* ------------------------------------------------------------- effects */

  /** A rifle: a crack (filtered noise) on a short body (a falling tone). Heavy guns lower and longer. */
  shot(big = false) {
    if (!this._ok(big ? 'shotBig' : 'shot', big ? 0.08 : 0.05)) return;
    const t = this.ctx.currentTime;
    this._noise(t, big ? 0.12 : 0.06, { freq: big ? 900 : 1600, q: 1.2, peak: big ? 0.18 : 0.1, decay: big ? 0.12 : 0.05 });
    this._tone(t, big ? 120 : 180, big ? 0.14 : 0.07, { type: 'triangle', peak: big ? 0.16 : 0.08, to: big ? 45 : 70 });
  }

  /** The dead's magic: a falling whine. */
  bolt(slime = false) {
    if (!this._ok('bolt', 0.08)) return;
    const t = this.ctx.currentTime;
    this._tone(t, slime ? 300 : 620, 0.2, { type: 'sine', peak: 0.035, to: slime ? 140 : 300, verb: 0.08 });
  }

  /** A blast: a low thump and a roar that darkens. */
  boom(size = 1) {
    if (!this._ok('boom', 0.09)) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.6 * size, { type: 'lowpass', freq: 900, to: 120, peak: 0.28, attack: 0.004, decay: 0.6 * size, verb: 0.1 });
    this._tone(t, 90, 0.45 * size, { type: 'triangle', peak: 0.25, to: 40 });
  }

  /** A building of the dead coming down: a long rumble, stones cracking. */
  fall(big = false) {
    if (!this._ok('fall', 0.2)) return;
    const t = this.ctx.currentTime;
    this._noise(t, big ? 2.2 : 1.4, { type: 'lowpass', freq: 320, to: 80, peak: big ? 0.3 : 0.22, attack: 0.02, decay: big ? 2.2 : 1.4, verb: 0.1 });
    this._tone(t, 55, big ? 1.6 : 1, { type: 'triangle', peak: 0.2, to: 30 });
    for (let k = 0; k < 4; k++) this._noise(t + 0.1 + Math.random() * 0.8, 0.04, { type: 'highpass', freq: 2500, peak: 0.05, decay: 0.04 });
  }

  /** The spawn horn: a deep, uneasy call. */
  horn(deep = false) {
    if (!this._ok('horn', 1.5)) return;
    const t = this.ctx.currentTime;
    const base = deep ? NOTE(38) : NOTE(45);
    const a = this.ctx;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    g.connect(this.sfx);
    for (const mul of [1, 1.5]) {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(base * mul * 0.98, t);
      o.frequency.linearRampToValueAtTime(base * mul, t + 0.3);
      o.connect(g);
      o.start(t);
      o.stop(t + 1.9);
    }
  }

  /** A bell: raised at the Forge, a secret found. */
  chime(high = false) {
    if (!this._ok('chime', 0.15)) return;
    const t = this.ctx.currentTime;
    const f = high ? NOTE(84) : NOTE(76);
    for (const [mul, peak] of [[1, 0.09], [2.76, 0.03], [5.4, 0.015]]) this._tone(t, f * mul, 1.2, { peak, verb: 0.15 });
  }

  /** Coins: the Exchange. */
  coin() {
    if (!this._ok('coin', 0.25)) return;
    const t = this.ctx.currentTime;
    this._tone(t, NOTE(84), 0.12, { type: 'triangle', peak: 0.08 });
    this._tone(t + 0.07, NOTE(91), 0.22, { type: 'triangle', peak: 0.08, verb: 0.08 });
  }

  /** Grave frost: a glassy shimmer and a hiss. */
  freeze() {
    if (!this._ok('freeze', 0.4)) return;
    const t = this.ctx.currentTime;
    for (const f of [2093, 2637, 3136]) this._tone(t + Math.random() * 0.08, f, 0.9, { peak: 0.025, verb: 0.15 });
    this._noise(t, 0.6, { type: 'highpass', freq: 6000, peak: 0.03, attack: 0.05, decay: 0.6 });
  }

  /** Stim: a rising rush and a heartbeat. */
  stim() {
    if (!this._ok('stim', 0.3)) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.3, { freq: 400, to: 2000, q: 2, peak: 0.07, attack: 0.03, decay: 0.27 });
    this._tone(t + 0.05, 70, 0.1, { type: 'triangle', peak: 0.16, to: 45 });
    this._tone(t + 0.25, 70, 0.1, { type: 'triangle', peak: 0.13, to: 45 });
  }

  /** The camp's heal: a soft rising chord. */
  heal() {
    if (!this._ok('heal', 2)) return;
    const t = this.ctx.currentTime;
    [NOTE(72), NOTE(76), NOTE(79)].forEach((f, k) => this._tone(t + k * 0.06, f, 0.7, { peak: 0.03, attack: 0.08, verb: 0.1 }));
  }

  /** One of yours down: a dull thud. */
  thud() {
    if (!this._ok('thud', 0.15)) return;
    const t = this.ctx.currentTime;
    this._tone(t, 110, 0.16, { type: 'triangle', peak: 0.18, to: 50 });
    this._noise(t, 0.1, { type: 'lowpass', freq: 500, peak: 0.07, decay: 0.1 });
  }

  /** One of the dead down: bones cracking. */
  crack() {
    if (!this._ok('crack', 0.06)) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.04, { type: 'bandpass', freq: 3200, q: 3, peak: 0.05, decay: 0.04 });
    this._noise(t + 0.04, 0.05, { type: 'bandpass', freq: 2200, q: 3, peak: 0.04, decay: 0.05 });
  }

  /* ---------------------------------------------------------------- music */

  _musicStart() {
    const a = this.ctx;
    // The drone: two low saws a hair apart, through a slowly breathing filter.
    const drone = a.createBiquadFilter();
    drone.type = 'lowpass';
    drone.frequency.value = 320;
    drone.Q.value = 3;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = a.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(drone.frequency);
    lfo.start();
    const dg = a.createGain();
    dg.gain.value = 0.05;
    drone.connect(dg).connect(this.music);
    const dv = a.createGain();
    dv.gain.value = 0.2;
    dg.connect(dv).connect(this.verb);
    for (const [n, det] of [[38, -6], [38, 6], [26, 0]]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = NOTE(n);
      o.detune.value = det;
      o.connect(drone);
      o.start();
    }
    // The rest, scheduled a little ahead, beat by beat.
    this.beat = 0;
    this.nextAt = a.currentTime + 0.2;
    this.timer = setInterval(() => this._schedule(), 100);
  }

  _schedule() {
    const a = this.ctx;
    if (!a) return;
    const spb = 60 / BPM;
    while (this.nextAt < a.currentTime + 0.4) {
      const t = this.nextAt;
      const b = this.beat;
      const bar = Math.floor(b / 4);
      const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
      const m = { dest: this.music };
      // A new chord every two bars: soft pads, slow in and out.
      if (b % 8 === 0) for (const n of chord) this._tone(t, NOTE(n), spb * 7.5, { type: 'sine', peak: 0.03, attack: spb * 2, verb: 0.25, ...m, detune: (Math.random() - 0.5) * 6 });
      // The pulse: a low drum on one and three.
      if (b % 4 === 0 || b % 4 === 2) this._tone(t, 72, 0.35, { type: 'sine', peak: b % 4 === 0 ? 0.13 : 0.08, to: 40, ...m });
      // In a fight: war drums on the eighths, and a hiss.
      if (this.intensity > 0.3) {
        this._tone(t + spb / 2, 96, 0.2, { type: 'sine', peak: 0.08 * this.intensity, to: 50, ...m });
        if (b % 2 === 1) this._tone(t, 120, 0.16, { type: 'sine', peak: 0.08 * this.intensity, to: 60, ...m });
      }
      // Bells, now and then: a note of the chord, high.
      if (Math.random() < 0.28) {
        const n = chord[Math.floor(Math.random() * chord.length)] + 24;
        this._tone(t + (Math.random() < 0.5 ? 0 : spb / 2), NOTE(n), 2.2, { peak: 0.018, verb: 0.3, ...m });
      }
      this.beat++;
      this.nextAt += spb;
    }
  }
}
