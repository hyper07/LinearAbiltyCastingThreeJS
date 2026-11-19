/**
 * Gloamreach's sound, all synthesized with Web Audio (no files): in
 * Brindlewick a warm wind in the leaves and birdsong — three kinds of bird,
 * each with its own phrase — and the smith's hammer when near; in the
 * Gloamwood a slow magical drone and shimmer, crickets and the odd owl; at
 * the overlook the rift's rumble and the drake's distant roar. Footsteps
 * differ by what's underfoot (cobble, dirt, grass, moss, wet stone, wood,
 * water). The two places crossfade as the hero walks through the Gate.
 */

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.next = { bird: 1, owl: 6, chime: 3 };
  }

  /** Start on the first click (browsers need a gesture). */
  wake() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // A soft room for everything.
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(2.4, 2.5);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.35;
    this.verb.connect(verbGain).connect(this.master);
    this.noise = this._noiseBuffer(3);
    this.village = ctx.createGain();
    this.forest = ctx.createGain();
    this.rift = ctx.createGain();
    for (const g of [this.village, this.forest, this.rift]) {
      g.gain.value = 0;
      g.connect(this.master);
    }
    this._wind();
    this._drone();
    this._crickets();
    this._rumble();
  }

  _noiseBuffer(sec) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    // Pinkish noise.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099;
      b1 = 0.963 * b1 + w * 0.2965;
      b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    return b;
  }

  _impulse(sec, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  _loopNoise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 2);
    return s;
  }

  /** Wind in the leaves: filtered noise, swelling slowly. */
  _wind() {
    const ctx = this.ctx;
    const src = this._loopNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 0.12;
    lfo.connect(lg).connect(g.gain);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lg2 = ctx.createGain();
    lg2.gain.value = 300;
    lfo2.connect(lg2).connect(bp.frequency);
    lfo.start();
    lfo2.start();
    src.connect(bp).connect(g).connect(this.village);
    // A quieter, lower wind in the forest.
    const src2 = this._loopNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    src2.connect(lp).connect(g2).connect(this.forest);
  }

  /** The Gloamwood's hum: a slow chord of soft tones, breathing, with a shimmer. */
  _drone() {
    const ctx = this.ctx;
    const out = ctx.createGain();
    // Half what it was: Violet Hollow (A minor) plays over the Gloamwood now, and this A–E hum sits under it.
    out.gain.value = 0.025;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    out.connect(lp).connect(this.forest);
    lp.connect(this.verb);
    for (const [f, type] of [[110, 'sine'], [164.8, 'sine'], [220, 'triangle'], [329.6, 'sine'], [493.9, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 0.2;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(out);
      o.start();
      lfo.start();
    }
  }

  /** Crickets: bursts of a high chirp, a few voices, each at its own pace. */
  _crickets() {
    const ctx = this.ctx;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator();
      o.frequency.value = 4200 + k * 380;
      const am = ctx.createGain();
      am.gain.value = 0;
      const pulse = ctx.createOscillator();
      pulse.type = 'square';
      pulse.frequency.value = 22 + k * 5;
      const pg = ctx.createGain();
      pg.gain.value = 0.5;
      pulse.connect(pg).connect(am.gain);
      const env = ctx.createGain();
      env.gain.value = 0;
      const slow = ctx.createOscillator();
      slow.type = 'square';
      slow.frequency.value = 0.6 + k * 0.17;
      const sg = ctx.createGain();
      sg.gain.value = 0.012;
      slow.connect(sg).connect(env.gain);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (k - 1) * 0.7;
      o.connect(am).connect(env).connect(pan).connect(this.forest);
      for (const n of [o, pulse, slow]) n.start();
    }
  }

  /** The rift: a deep, uneven rumble. */
  _rumble() {
    const ctx = this.ctx;
    const src = this._loopNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 110;
    const g = ctx.createGain();
    g.gain.value = 0.9;
    src.connect(lp).connect(g).connect(this.rift);
  }

  /** One bird's phrase. Three voices: a warbler's trill, a two-note call, a rising whistle. */
  _bird(pan = 0, far = 1) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;
    const kind = Math.floor(Math.random() * 3);
    const out = ctx.createGain();
    out.gain.value = 0.05 * far;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    out.connect(p).connect(this.village);
    p.connect(this.verb);
    const note = (t, f0, f1, d, v = 1) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    };
    if (kind === 0) {
      const base = 3200 + Math.random() * 900;
      const n = 6 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) note(t0 + i * 0.06, base + (i % 2) * 500, base - 300, 0.05);
    } else if (kind === 1) {
      const f = 2100 + Math.random() * 500;
      note(t0, f, f * 1.05, 0.18);
      note(t0 + 0.26, f * 0.8, f * 0.78, 0.25);
    } else {
      const f = 1800 + Math.random() * 600;
      note(t0, f, f * 1.6, 0.35);
      note(t0 + 0.45, f * 1.1, f * 1.7, 0.3, 0.7);
    }
  }

  _owl() {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = 0.06;
    out.connect(this.forest);
    out.connect(this.verb);
    for (const [dt, d] of [[0, 0.32], [0.55, 0.18], [0.82, 0.55]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(380, t0 + dt);
      o.frequency.linearRampToValueAtTime(340, t0 + dt + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0 + dt);
      g.gain.linearRampToValueAtTime(1, t0 + dt + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dt + d);
      o.connect(g).connect(out);
      o.start(t0 + dt);
      o.stop(t0 + dt + d + 0.05);
    }
  }

  /** A soft glassy chime (the Gloamwood's lamps singing). */
  _chime() {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;
    const notes = [987.8, 1174.7, 1318.5, 1568, 1760];
    const f = notes[Math.floor(Math.random() * notes.length)];
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.025, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + 2.5);
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(p).connect(this.forest);
    p.connect(this.verb);
    o.start(t0);
    o.stop(t0 + 2.6);
  }

  /** A footstep on `surface` at `speed` m/s. */
  step(surface, speed = 4, volume = 1) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const loud = Math.min(1, 0.4 + speed / 8) * 0.55 * volume;
    const set = {
      cobble: ['bandpass', 1900, 1.4, 0.07],
      wetcobble: ['bandpass', 1500, 1.0, 0.11],
      dirt: ['lowpass', 700, 0.8, 0.09],
      grass: ['highpass', 2400, 0.6, 0.12],
      moss: ['lowpass', 900, 0.6, 0.12],
      rock: ['bandpass', 1300, 1.6, 0.06],
      water: ['bandpass', 900, 0.8, 0.22],
      wood: ['bandpass', 420, 3, 0.09]
    }[surface] ?? ['lowpass', 800, 0.8, 0.09];
    f.type = set[0];
    f.frequency.value = set[1] * (0.9 + Math.random() * 0.2);
    f.Q.value = set[2];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(loud, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + set[3]);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2);
    src.stop(t + set[3] + 0.05);
    // Cobble and stone: a little click; wet stone and water: a splash tail.
    if (surface === 'cobble' || surface === 'rock') {
      const o = ctx.createOscillator();
      o.frequency.value = 2800 + Math.random() * 600;
      const og = ctx.createGain();
      og.gain.setValueAtTime(loud * 0.12, t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
      o.connect(og).connect(this.master);
      o.start(t);
      o.stop(t + 0.04);
    }
    if (surface === 'wetcobble' || surface === 'water') {
      const s2 = ctx.createBufferSource();
      s2.buffer = this.noise;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'highpass';
      f2.frequency.value = 3000;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(loud * 0.4, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      s2.connect(f2).connect(g2).connect(this.master);
      s2.start(t + 0.02, Math.random());
      s2.stop(t + 0.22);
    }
  }

  /** The smith's hammer on the anvil, from `dist` metres. */
  clang(dist = 10) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const v = Math.min(0.3, 3 / Math.max(3, dist));
    for (const [f, d] of [[1180, 0.6], [2470, 0.35], [3610, 0.2]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(g).connect(this.master);
      g.connect(this.verb);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  /** The drake, far off: a growl swept down through a low filter. */
  roar(dist = 300) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.05;
    const v = Math.min(0.5, 120 / Math.max(80, dist));
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 2.2);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 2.2);
    const og = ctx.createGain();
    og.gain.value = 0.25;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    src.connect(f).connect(g);
    o.connect(og).connect(f);
    g.connect(lp).connect(this.master);
    lp.connect(this.verb);
    src.start(t);
    src.stop(t + 2.8);
    o.start(t);
    o.stop(t + 2.8);
  }

  /** A soft UI tick. */
  tick() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.13);
  }

  /** Mix by place: `gloam` 0…1 and how near the rift is (0…1). */
  update(dt, { gloam = 0, rift = 0 } = {}) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const v = this.enabled ? 1 : 0;
    this.village.gain.setTargetAtTime((1 - gloam) * v, now, 0.4);
    this.forest.gain.setTargetAtTime(gloam * v, now, 0.4);
    this.rift.gain.setTargetAtTime(rift * 0.35 * v, now, 0.6);
    for (const k of Object.keys(this.next)) this.next[k] -= dt;
    if (this.next.bird < 0) {
      this.next.bird = 0.6 + Math.random() * 2.6;
      if (gloam < 0.8) this._bird(Math.random() * 2 - 1, 0.4 + Math.random() * 0.6);
    }
    if (this.next.owl < 0) {
      this.next.owl = 14 + Math.random() * 20;
      if (gloam > 0.5) this._owl();
    }
    if (this.next.chime < 0) {
      this.next.chime = 2 + Math.random() * 5;
      if (gloam > 0.5) this._chime();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
  }
}
