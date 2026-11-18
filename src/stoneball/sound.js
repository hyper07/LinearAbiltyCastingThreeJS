/**
 * Stoneball's sounds, made on the spot with Web Audio (no files): the dull
 * thud of a foot on stone, a knock off the wall, a bone whistle, and the
 * crowd's roar or groan. Quiet by default; M mutes.
 */
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.22;
  }

  /** Start on a user gesture (browsers keep audio asleep until then). */
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
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }

  _ok() {
    return this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  _noise(t, dur, { type = 'lowpass', freq = 800, q = 0.7, gain = 0.4, attack = 0.005, to = null } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  _tone(t, dur, f0, f1, gain = 0.3, type = 'sine') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A foot meets the stone: a low thump, harder for a shot. */
  kick(power = 0.5) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.16, 140 + power * 40, 45, 0.5 + power * 0.3);
    this._noise(t, 0.08, { freq: 900, gain: 0.25 + power * 0.2 });
  }

  /** Stone on stone. */
  knock(power = 0.5) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.12, { type: 'bandpass', freq: 1400, q: 3, gain: 0.2 + Math.min(0.4, power * 0.03) });
    this._tone(t, 0.1, 320, 180, 0.15, 'triangle');
  }

  /** Bodies colliding. */
  thump() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.2, 90, 40, 0.45);
    this._noise(t, 0.15, { freq: 500, gain: 0.3 });
  }

  /** A bone whistle: one short blast, or three for full time. */
  whistle(times = 1) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const s = t + i * 0.32;
      const len = i === times - 1 ? 0.45 : 0.2;
      this._tone(s, len, 2300, 2150, 0.09, 'triangle');
      this._tone(s, len, 2350, 2250, 0.05, 'sine');
    }
  }

  /** The crowd: a swelling roar (goal), an "ooh" (save). */
  roar(big = true) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const dur = big ? 2.6 : 1.1;
    this._noise(t, dur, { type: 'bandpass', freq: 650, q: 0.6, gain: big ? 0.55 : 0.25, attack: big ? 0.25 : 0.12, to: big ? 900 : 420 });
    this._noise(t + 0.05, dur * 0.9, { type: 'bandpass', freq: 1500, q: 0.8, gain: big ? 0.2 : 0.08, attack: 0.3 });
  }

  dispose() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
