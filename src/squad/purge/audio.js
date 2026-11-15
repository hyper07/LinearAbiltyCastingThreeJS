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
/** The score: A minor, a four-bar loop, at 96 beats a minute. Notes are MIDI numbers. */
const SCORE = {
  bpm: 96,
  bars: 4,
  // Am – F – C – G, one chord a bar.
  chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
  // The bass: the roots, an octave down.
  bass: [45, 41, 48, 43],
  // The theme, four bars: [step, note, length in sixteenths].
  melody: [
    [[0, 69, 3], [4, 72, 2], [8, 76, 3], [12, 74, 3]],
    [[0, 77, 2], [4, 76, 2], [8, 72, 3], [12, 69, 3]],
    [[0, 67, 3], [4, 72, 2], [8, 76, 3], [12, 79, 3]],
    [[0, 74, 2], [4, 71, 2], [8, 69, 4], [12, 67, 3]]
  ]
};

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
    // Two beds, each through its own gain: the calm one always, the battle one with the fighting.
    this.calm = a.createGain();
    this.calm.gain.value = 1;
    this.calm.connect(this.music);
    this.battle = a.createGain();
    this.battle.gain.value = 0;
    this.battle.connect(this.music);
    // The pad's warmth: a low-passed, slowly breathing bed under everything.
    const pad = a.createBiquadFilter();
    pad.type = 'lowpass';
    pad.frequency.value = 900;
    pad.Q.value = 0.7;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = a.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(pad.frequency);
    lfo.start();
    pad.connect(this.calm);
    const pv = a.createGain();
    pv.gain.value = 0.25;
    this.calm.connect(pv).connect(this.verb);
    this.padBus = pad;
    this.step = 0;
    this.bar = 0;
    this.nextAt = a.currentTime + 0.25;
    this.timer = setInterval(() => this._schedule(), 60);
  }

  _schedule() {
    const a = this.ctx;
    if (!a) return;
    const battle = this.intensity > 0.25 ? 1 : 0;
    // Fade the battle bed in and out smoothly.
    this.battle.gain.setTargetAtTime(battle ? 1 : 0, a.currentTime, 0.6);
    this.calm.gain.setTargetAtTime(battle ? 0.6 : 1, a.currentTime, 0.6);
    const stepLen = 60 / SCORE.bpm / 4;
    while (this.nextAt < a.currentTime + 0.3) {
      const t = this.nextAt;
      this._beat(t, this.bar, this.step, battle);
      this.step++;
      if (this.step === 16) {
        this.step = 0;
        this.bar = (this.bar + 1) % SCORE.bars;
      }
      this.nextAt += stepLen;
    }
  }

  /** One sixteenth of the score, at time t. */
  _beat(t, bar, step, battle) {
    const chord = SCORE.chords[bar % SCORE.chords.length];
    const stepLen = 60 / SCORE.bpm / 4;
    // Pad: one chord, held for the bar, on the calm bed.
    if (step === 0) {
      for (const n of chord) this._pluck(t, NOTE(n), stepLen * 16, { type: 'sawtooth', peak: 0.012, attack: 0.9, dest: this.padBus, verb: 0.1 });
    }
    // Melody: the theme, on the calm bed; in battle, softer and under the drums.
    for (const [st, n, len] of SCORE.melody[bar % SCORE.melody.length]) {
      if (st === step) this._pluck(t, NOTE(n), stepLen * len, { type: 'triangle', peak: battle ? 0.035 : 0.06, attack: 0.01, dest: this.calm, verb: 0.2 });
    }
    // Bass: the root on the eighths; a driving pulse in battle, a soft one calm.
    const root = SCORE.bass[bar % SCORE.bass.length];
    if (battle ? step % 2 === 0 : step % 8 === 0) {
      const sub = battle && step % 4 === 2 ? 12 : 0;
      this._pluck(t, NOTE(root + sub), stepLen * (battle ? 1.4 : 3.2), { type: 'sawtooth', peak: battle ? 0.07 : 0.05, attack: 0.005, to: 0.9, dest: battle ? this.battle : this.calm, lp: 380 });
    }
    // Drums: a kick on the one and the three, a snare on the two and four; hats on the eighths in battle.
    if (battle) {
      if (step === 0 || step === 8 || (step === 10 && bar % 2 === 1)) this._kick(t, 0.3, this.battle);
      if (step === 4 || step === 12) this._snare(t, 0.16);
      if (step % 2 === 0) this._hat(t, step % 4 === 2 ? 0.035 : 0.02);
      if (step === 14 && bar % 4 === 3) this._snare(t, 0.07);
    } else {
      if (step === 0 || step === 8) this._kick(t, 0.14, this.calm);
      if (step === 8) this._hat(t, 0.012);
    }
    // Arpeggio in battle: the chord's notes, sixteenths, bright and brief.
    if (battle && step % 2 === 1) {
      const n = chord[(step >> 1) % chord.length] + 12;
      this._pluck(t, NOTE(n), stepLen * 0.9, { type: 'square', peak: 0.012, attack: 0.002, dest: this.battle, lp: 2400 });
    }
  }

  /** A plucked or held note: a shaped oscillator through an optional low-pass. */
  _pluck(t, freq, dur, { type = 'triangle', peak = 0.05, attack = 0.005, to = null, dest = this.calm, verb = 0, lp = null } = {}) {
    const a = this.ctx;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    const release = to != null ? to : 0.6;
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur * release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    let node = o;
    if (lp) {
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(dest);
    if (verb) {
      const v = a.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.verb);
    }
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  _kick(t, peak, dest = this.calm) {
    const a = this.ctx;
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = a.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
  }

  _snare(t, peak) {
    const a = this.ctx;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.9;
    const g = a.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f).connect(g).connect(this.battle);
    src.start(t, Math.random() * 0.3);
    src.stop(t + 0.2);
    this._pluck(t, 190, 0.1, { type: 'triangle', peak: peak * 0.5, attack: 0.002, dest: this.battle });
  }

  _hat(t, peak) {
    const a = this.ctx;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = a.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(this.battle);
    src.start(t, Math.random() * 0.3);
    src.stop(t + 0.06);
  }
}
