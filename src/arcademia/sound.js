/**
 * AI Arcademia's sounds, made on the spot with Web Audio (no files): a soft
 * tap, a bright chime for a right answer, a gentle "hmm" for a wrong one, a
 * sparkle per star, a fanfare for a finished lesson or a new floor, chalk
 * scratching, page turns, and a quiet bed of water and birds (crickets at night).
 */
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.5;
  }

  wake() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  _ok() {
    return this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  _tone(freq, t, dur, { type = 'sine', gain = 0.2, attack = 0.01, to = null } = {}) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _noise(t, dur, { freq = 2000, q = 1, gain = 0.1, type = 'bandpass' } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  tap() {
    if (!this._ok()) return;
    this._tone(880, this.ctx.currentTime, 0.07, { type: 'triangle', gain: 0.08 });
  }
  page() {
    if (!this._ok()) return;
    this._noise(this.ctx.currentTime, 0.18, { freq: 3500, q: 0.6, gain: 0.05, type: 'highpass' });
  }
  right() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, t + i * 0.07, 0.35, { type: 'triangle', gain: 0.13 }));
  }
  wrong() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(330, t, 0.22, { type: 'sine', gain: 0.12, to: 262 });
    this._tone(262, t + 0.16, 0.3, { type: 'sine', gain: 0.1, to: 220 });
  }
  star(i = 0) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const base = 1046.5 * Math.pow(2, i / 6);
    for (let k = 0; k < 4; k++) this._tone(base * Math.pow(1.26, k), t + k * 0.04, 0.25, { type: 'sine', gain: 0.07 });
  }
  fanfare() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const notes = [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.38], [783.99, 0.56], [1046.5, 0.68]];
    for (const [f, d] of notes) {
      this._tone(f, t + d, 0.4, { type: 'square', gain: 0.045 });
      this._tone(f / 2, t + d, 0.4, { type: 'triangle', gain: 0.07 });
    }
  }
  chalk() {
    if (!this._ok()) return;
    this._noise(this.ctx.currentTime, 0.09 + Math.random() * 0.06, { freq: 2600 + Math.random() * 1500, q: 3, gain: 0.035 });
  }
  door() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(180, t, 0.3, { type: 'triangle', gain: 0.08, to: 120 });
    this._noise(t, 0.25, { freq: 600, q: 0.8, gain: 0.04 });
  }
  step() {
    if (!this._ok()) return;
    this._noise(this.ctx.currentTime, 0.06, { freq: 900, q: 1.2, gain: 0.025 });
  }
  /** The toys' noises. */
  toy(kind) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    if (kind === 'bell') [1318, 1975, 2637].forEach((f, i) => this._tone(f, t + i * 0.01, 1.4 - i * 0.3, { type: 'sine', gain: 0.08 / (i + 1) }));
    else if (kind === 'boing') this._tone(180, t, 0.45, { type: 'sine', gain: 0.18, to: 520 });
    else if (kind === 'pop') {
      this._noise(t, 0.08, { freq: 1800, q: 0.8, gain: 0.2 });
      this._tone(900, t, 0.1, { type: 'triangle', gain: 0.08, to: 300 });
    } else if (kind === 'splash') this._noise(t, 0.5, { freq: 1200, q: 0.5, gain: 0.12 });
    else if (kind === 'whirl') this._tone(300, t, 0.7, { type: 'sawtooth', gain: 0.03, to: 1200 });
    else if (kind === 'gem') [1568, 2093, 2637, 3136].forEach((f, i) => this._tone(f, t + i * 0.06, 0.3, { type: 'sine', gain: 0.07 }));
    else if (kind === 'beep') [880, 1320].forEach((f, i) => this._tone(f, t + i * 0.12, 0.1, { type: 'square', gain: 0.04 }));
    else if (kind === 'squeak') this._tone(1200, t, 0.18, { type: 'sine', gain: 0.07, to: 1900 });
    else this._tone(440, t, 0.2, { type: 'triangle', gain: 0.08 });
  }

  /** A tone for the sound sim: pitch in Hz, loudness 0–1. */
  pluck(freq, loud = 0.5) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(freq, t, 1.0, { type: 'triangle', gain: 0.04 + loud * 0.18, attack: 0.005 });
    this._tone(freq * 2, t, 0.5, { type: 'sine', gain: 0.02 + loud * 0.05, attack: 0.005 });
  }

  /** The quiet bed under the diorama: running water, and birds by day or crickets by night. */
  ambient(on, night = 0, mood = 'birds') {
    this._mood = mood;
    if (!this.ctx) return;
    if (!on) {
      this._amb?.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      clearInterval(this._chirp);
      return;
    }
    if (!this._amb) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      s.connect(f).connect(g).connect(this.master);
      s.start();
      this._amb = { s, g };
    }
    this._amb.g.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.6);
    clearInterval(this._chirp);
    this._night = night;
    this._chirp = setInterval(() => {
      if (!this._ok() || Math.random() < 0.4) return;
      const t = this.ctx.currentTime;
      const mood = this._mood;
      // Space has no crickets: the Moon keeps its own soft notes at night too.
      if ((this._night > 0.5 && mood !== 'space' && mood !== 'mars') || mood === 'crickets') for (let k = 0; k < 3; k++) this._tone(4200, t + k * 0.06, 0.04, { type: 'sine', gain: 0.012 });
      else if (mood === 'wind') this._noise(t, 1.2, { freq: 500 + Math.random() * 300, q: 2, gain: 0.03 });
      else if (mood === 'chimes') [2093, 2637, 3136].forEach((f, i) => Math.random() < 0.6 && this._tone(f, t + i * 0.15, 0.9, { type: 'sine', gain: 0.012 }));
      else if (mood === 'bells') this._tone([1046, 1318, 1568][Math.floor(Math.random() * 3)], t, 1.2, { type: 'sine', gain: 0.014 });
      else if (mood === 'waves') {
        this._noise(t, 1.6, { freq: 700, q: 0.4, gain: 0.04 });
        if (Math.random() < 0.3) this._tone(1800, t + 0.3, 0.25, { type: 'sine', gain: 0.015, to: 1300 });
      } else if (mood === 'space') {
        // Soft, slow notes, and now and then a far-off radio blip.
        this._tone([523, 659, 784, 988, 1175][Math.floor(Math.random() * 5)], t, 2.4, { type: 'sine', gain: 0.009 });
        if (Math.random() < 0.25) this._tone(1568, t + 0.6, 0.05, { type: 'square', gain: 0.004 });
      } else if (mood === 'mars') {
        // Mars: a thin whistling breeze, a low warm note, now and then a little rover chirp.
        this._noise(t, 1.8, { freq: 900 + Math.random() * 500, q: 3, gain: 0.022 });
        if (Math.random() < 0.5) this._tone([392, 440, 523, 587][Math.floor(Math.random() * 4)], t + 0.4, 2.0, { type: 'sine', gain: 0.008 });
        if (Math.random() < 0.15) this._tone(1320, t + 1.0, 0.06, { type: 'square', gain: 0.004, to: 1760 });
      } else if (mood === 'castle') {
        // The Sky Castle: a lute-like little run of plucked notes (D dorian), now and then a far-off bell, a bird.
        const scale = [294, 330, 349, 392, 440, 494, 523, 587];
        const start = Math.floor(Math.random() * 4);
        for (let k = 0; k < 3; k++) if (Math.random() < 0.8) this._tone(scale[start + k * (Math.random() < 0.5 ? 1 : 2)] ?? 587, t + k * 0.22, 0.7, { type: 'triangle', gain: 0.011, attack: 0.004 });
        if (Math.random() < 0.18) this._tone([523, 659][Math.floor(Math.random() * 2)], t + 0.9, 2.6, { type: 'sine', gain: 0.01 });
        if (Math.random() < 0.3) {
          const f = 2400 + Math.random() * 1000;
          this._tone(f, t + 0.5, 0.09, { type: 'sine', gain: 0.012, to: f * 1.25 });
        }
      } else if (mood === 'beeps') this._tone([660, 880, 990][Math.floor(Math.random() * 3)], t, 0.08, { type: 'square', gain: 0.01 });
      else {
        const f = 2200 + Math.random() * 1400;
        this._tone(f, t, 0.09, { type: 'sine', gain: 0.018, to: f * 1.3 });
        this._tone(f * 1.1, t + 0.12, 0.08, { type: 'sine', gain: 0.014, to: f * 0.9 });
      }
    }, 1400);
  }

  dispose() {
    clearInterval(this._chirp);
    try {
      this.ctx?.close();
    } catch {
      /* already closed */
    }
  }
}

/**
 * Voices, played by line id (voice/player.js): a real person's recording
 * from the voice studio (voice-studio.html) when there is one, else the
 * character's pre-generated voice (voice/generated.js, made offline with a
 * local model), else silence and the line's text. The browser's speech
 * synthesis is never used. `speech.available` is true when the current
 * language has any voice, so the read-aloud buttons show only then.
 */
export { voicePlayer as speech } from './voice/player.js';
