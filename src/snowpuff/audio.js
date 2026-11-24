/**
 * Snowpuff's sound effects, all made in WebAudio — no files, no voices: the
 * wind rising with your speed, the hiss of a carve, whooshes as poles and
 * posts flash past (panned to their side), pops, boings and bonks, a star's
 * chime, the countdown, and the crowd at the finish.
 */

export class SnowSound {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.wind = null;
  }

  /** Browsers start audio only after a gesture: call from a click or key. */
  wake() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(comp).connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.startBeds();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      // a little pinker than white: softer on the ear
      b0 = 0.97 * b0 + w * 0.15;
      b1 = 0.6 * b1 + w * 0.4;
      d[i] = (b0 + b1) * 0.5;
    }
    return buf;
  }

  loopNoise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 1.5);
    return s;
  }

  /** The two beds that run all race: wind and carve. Silent until speed comes up. */
  startBeds() {
    const c = this.ctx;
    const w = this.loopNoise();
    const wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 500;
    wf.Q.value = 0.7;
    const wg = c.createGain();
    wg.gain.value = 0;
    w.connect(wf).connect(wg).connect(this.master);
    const k = this.loopNoise();
    const kf = c.createBiquadFilter();
    kf.type = 'highpass';
    kf.frequency.value = 2400;
    const kf2 = c.createBiquadFilter();
    kf2.type = 'peaking';
    kf2.frequency.value = 4200;
    kf2.gain.value = 6;
    const kg = c.createGain();
    kg.gain.value = 0;
    k.connect(kf).connect(kf2).connect(kg).connect(this.master);
    this.wind = { f: wf, g: wg };
    this.carve = { f: kf, g: kg };
  }

  /** Every frame: speed (m/s), edge angle (0–1), on the snow?, sound on?, skid (0–1). */
  ride(speed, edge, grounded, on = true, skid = 0) {
    if (!this.ctx || !this.wind) return;
    const t = this.ctx.currentTime;
    const v = Math.min(1.2, speed / 30);
    this.wind.g.gain.setTargetAtTime(on ? v * v * 0.34 : 0, t, 0.15);
    this.wind.f.frequency.setTargetAtTime(380 + v * 900, t, 0.2);
    // a clean carve hisses higher and thinner as the edge bites; a skid scrapes lower and louder
    const sp = Math.min(1, speed / 14);
    const k = on && grounded ? (0.1 + edge * 0.6 + skid * 0.9) * sp : 0;
    this.carve.g.gain.setTargetAtTime(Math.min(0.24, k * 0.14), t, 0.05);
    this.carve.f.frequency.setTargetAtTime(skid > 0.3 ? 900 + (1 - skid) * 900 : 1800 + edge * 1800, t, 0.08);
  }

  quiet() {
    this.ride(0, 0, false, false, 0);
  }

  /* ---------------------------------------------------------------- one-shots */

  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  tone(freq, { type = 'sine', at = 0, dur = 0.2, gain = 0.2, slide = null, pan = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain();
    this.env(g, t, 0.008, gain, dur);
    const p = c.createStereoPanner();
    p.pan.value = pan;
    o.connect(g).connect(p).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noiseBurst({ at = 0, dur = 0.25, gain = 0.25, f0 = 1600, f1 = 400, q = 1.2, pan = 0, type = 'bandpass' } = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    this.env(g, t, Math.min(0.03, dur * 0.2), gain, dur);
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(f).connect(g).connect(p).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  /** A pole or post flashing past on one side. */
  whoosh(pan = 0, k = 1) {
    this.noiseBurst({ dur: 0.16 + 0.08 * k, gain: 0.05 + 0.08 * k, f0: 2600, f1: 700, q: 2.2, pan });
  }

  jump(charge = 0) {
    this.tone(260 + charge * 120, { dur: 0.16, gain: 0.12, slide: 520 + charge * 200, type: 'triangle' });
    this.noiseBurst({ dur: 0.12, gain: 0.08, f0: 1200, f1: 600 });
  }

  land(clean = true, impact = 0) {
    this.noiseBurst({ dur: 0.22, gain: 0.18 + Math.min(0.2, impact * 0.02), f0: 700, f1: 120, q: 0.7, type: 'lowpass' });
    this.tone(90, { dur: 0.14, gain: 0.16, slide: 55 });
    if (!clean) this.tone(420, { at: 0.05, dur: 0.35, gain: 0.08, slide: 260, type: 'triangle' });
  }

  trick(n = 1) {
    const notes = [784, 988, 1175, 1568, 1976];
    for (let i = 0; i < Math.min(5, 2 + n); i++) this.tone(notes[i], { at: i * 0.06, dur: 0.22, gain: 0.07, type: 'triangle' });
  }

  star(pitch = 0) {
    const base = 1046 * Math.pow(2, pitch / 12);
    this.tone(base, { dur: 0.16, gain: 0.08, type: 'triangle' });
    this.tone(base * 1.5, { at: 0.05, dur: 0.22, gain: 0.06, type: 'sine' });
  }

  pile() {
    this.noiseBurst({ dur: 0.18, gain: 0.16, f0: 900, f1: 200, type: 'lowpass' });
    this.tone(520, { at: 0.04, dur: 0.12, gain: 0.08, slide: 780, type: 'triangle' });
  }

  shieldItem() {
    for (let i = 0; i < 3; i++) this.tone(660 * (1 + i * 0.26), { at: i * 0.05, dur: 0.3, gain: 0.05 });
  }

  shieldOn() {
    this.tone(330, { dur: 0.6, gain: 0.08, slide: 990 });
    this.tone(495, { dur: 0.6, gain: 0.05, slide: 1480 });
  }

  shieldPop() {
    this.noiseBurst({ dur: 0.2, gain: 0.15, f0: 3000, f1: 800, q: 3 });
    this.tone(1200, { dur: 0.25, gain: 0.08, slide: 400 });
  }

  bump() {
    // a soft "boing" and a poof
    const c = this.ctx;
    if (!c) return;
    this.tone(180, { dur: 0.45, gain: 0.16, slide: 420, type: 'sine' });
    this.tone(360, { at: 0.03, dur: 0.3, gain: 0.05, slide: 140, type: 'triangle' });
    this.noiseBurst({ dur: 0.35, gain: 0.2, f0: 1200, f1: 200, q: 0.6, type: 'lowpass' });
  }

  rail(pan) {
    this.noiseBurst({ dur: 0.12, gain: 0.08, f0: 500, f1: 300, pan, type: 'lowpass' });
  }

  throwBall() {
    this.noiseBurst({ dur: 0.18, gain: 0.1, f0: 1800, f1: 600, q: 1.8 });
  }

  bonk(near = 1) {
    this.tone(720, { dur: 0.09, gain: 0.18 * near, slide: 380, type: 'square' });
    this.tone(1080, { at: 0.02, dur: 0.12, gain: 0.08 * near, slide: 500 });
    this.noiseBurst({ at: 0.02, dur: 0.25, gain: 0.14 * near, f0: 900, f1: 200, type: 'lowpass' });
  }

  splat() {
    this.noiseBurst({ dur: 0.18, gain: 0.08, f0: 800, f1: 200, type: 'lowpass' });
  }

  boost() {
    this.noiseBurst({ dur: 0.6, gain: 0.12, f0: 300, f1: 2400, q: 1.4 });
    this.tone(440, { dur: 0.4, gain: 0.05, slide: 880, type: 'triangle' });
  }

  beep(go = false) {
    this.tone(go ? 988 : 659, { dur: go ? 0.5 : 0.18, gain: 0.14, type: 'triangle' });
    if (go) this.tone(1318, { at: 0.02, dur: 0.5, gain: 0.07 });
  }

  click() {
    this.tone(880, { dur: 0.05, gain: 0.05, type: 'triangle' });
  }

  /** Goggles on: a stretchy strap snap and a happy two-note boing. */
  tryOn() {
    if (!this.ctx) return;
    this.noiseBurst({ dur: 0.06, gain: 0.12, f0: 2400, f1: 900, q: 2 });
    this.tone(420, { at: 0.05, dur: 0.16, gain: 0.08, type: 'triangle', slide: 760 });
    this.tone(990, { at: 0.17, dur: 0.12, gain: 0.05, type: 'sine' });
  }

  cheer(k = 1) {
    if (!this.ctx) return;
    // a crowd: many short bright noise swells, and a happy chord
    for (let i = 0; i < 14; i++) this.noiseBurst({ at: Math.random() * 1.2, dur: 0.3 + Math.random() * 0.5, gain: 0.04 * k, f0: 1400 + Math.random() * 1600, f1: 900 + Math.random() * 600, q: 3, pan: Math.random() * 2 - 1 });
    for (const [f, at] of [[523, 0], [659, 0.08], [784, 0.16], [1046, 0.3]]) this.tone(f, { at, dur: 0.5, gain: 0.06 * k, type: 'triangle' });
  }

  shove(k = 1) {
    this.noiseBurst({ dur: 0.14, gain: 0.12 * k, f0: 700, f1: 250, type: 'lowpass' });
    this.tone(300, { dur: 0.12, gain: 0.07 * k, slide: 200, type: 'triangle' });
  }

  gift() {
    // a ribbon pull and a sparkly "ta-da"
    this.noiseBurst({ dur: 0.12, gain: 0.08, f0: 2500, f1: 1200, q: 2 });
    for (const [f, at] of [[784, 0.04], [988, 0.1], [1318, 0.16], [1568, 0.22]]) this.tone(f, { at, dur: 0.25, gain: 0.07, type: 'triangle' });
  }

  rumble() {
    this.noiseBurst({ dur: 1.2, gain: 0.18, f0: 220, f1: 90, q: 0.8, type: 'lowpass' });
    this.tone(70, { dur: 0.9, gain: 0.12, slide: 50 });
  }

  iceDrop() {
    for (let i = 0; i < 4; i++) this.tone(1800 + i * 420, { at: i * 0.04, dur: 0.15, gain: 0.04 });
    this.noiseBurst({ dur: 0.2, gain: 0.06, f0: 5000, f1: 3000, q: 4 });
  }

  bell(k = 1) {
    for (const [f, g] of [[1046, 0.12], [2093, 0.05], [3136, 0.03]]) this.tone(f, { dur: 1.4, gain: g * k, type: 'sine' });
  }

  snowmanPoof(k = 1) {
    this.noiseBurst({ dur: 0.45, gain: 0.22 * k, f0: 1500, f1: 200, q: 0.5, type: 'lowpass' });
    this.tone(520, { at: 0.03, dur: 0.2, gain: 0.06 * k, slide: 980, type: 'triangle' });
  }

  dispose() {
    try {
      this.ctx?.close();
    } catch {
      /* closed */
    }
    this.ctx = null;
  }
}
