/**
 * Mistfall Gorge's sound, synthesized like Gloamreach's (and built on its
 * Sound: footsteps by surface, the reverb, the noise): the falls' roar that
 * swells as you near them, the river's babble, rain hissing on leaves, the
 * jungle's insects and birds, a whistle, the Shagmane's hooves, and the
 * Gnarlhorn — a roar that fills the canyon, its bites and stamps.
 */
import { Sound } from '../gloamreach/audio.js';

export class JungleSound extends Sound {
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
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(3.2, 2.2);
    const vg = ctx.createGain();
    vg.gain.value = 0.4;
    this.verb.connect(vg).connect(this.master);
    this.noise = this._noiseBuffer(3);
    // Beds whose levels follow the place: falls, river, rain, jungle.
    const bed = (filter, f, q, vol) => {
      const src = this._loopNoise();
      const fl = ctx.createBiquadFilter();
      fl.type = filter;
      fl.frequency.value = f;
      fl.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(fl).connect(g).connect(this.master);
      g.base = vol;
      return g;
    };
    this.falls = bed('lowpass', 520, 0.5, 0.9);
    this.fallsHi = bed('bandpass', 1800, 0.4, 0.25);
    this.river = bed('bandpass', 1100, 0.9, 0.22);
    this.rainBed = bed('highpass', 2600, 0.3, 0.35);
    this.jungle = ctx.createGain();
    this.jungle.gain.value = 0.8;
    this.jungle.connect(this.master);
    this.village = this.jungle;
    this.forest = this.jungle;
    this._insects();
    this.next = { bird: 1, call: 6 };
  }

  /** Cicadas and tree frogs: buzzing pulses that come and go. */
  _insects() {
    const ctx = this.ctx;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator();
      o.type = k === 2 ? 'sawtooth' : 'sine';
      o.frequency.value = [5200, 6100, 1300][k];
      const am = ctx.createGain();
      am.gain.value = 0;
      const pulse = ctx.createOscillator();
      pulse.type = 'square';
      pulse.frequency.value = [38, 52, 9][k];
      const pg = ctx.createGain();
      pg.gain.value = 0.5;
      pulse.connect(pg).connect(am.gain);
      const env = ctx.createGain();
      env.gain.value = 0;
      const slow = ctx.createOscillator();
      slow.frequency.value = [0.09, 0.13, 0.3][k];
      const sg = ctx.createGain();
      sg.gain.value = [0.008, 0.006, 0.004][k];
      slow.connect(sg).connect(env.gain);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (k - 1) * 0.8;
      o.connect(am).connect(env).connect(pan).connect(this.jungle);
      for (const n of [o, pulse, slow]) n.start();
    }
  }

  /** A jungle bird's call, far off: a whoop or a descending piping. */
  _call() {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = 0.035;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 2 - 1;
    out.connect(p).connect(this.jungle);
    p.connect(this.verb);
    const n = 3 + Math.floor(Math.random() * 3);
    const f = 900 + Math.random() * 500;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      const t = t0 + i * 0.22;
      o.frequency.setValueAtTime(f * (1 + i * 0.08), t);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.25);
    }
  }

  /** The hunter's whistle: two rising notes. */
  whistle() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    for (const [s, f0, f1] of [[0, 1400, 2100], [0.28, 1500, 2600]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, t + s);
      o.frequency.exponentialRampToValueAtTime(f1, t + s + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + s);
      g.gain.linearRampToValueAtTime(0.12, t + s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + s + 0.26);
      o.connect(g).connect(this.master);
      g.connect(this.verb);
      o.start(t + s);
      o.stop(t + s + 0.3);
    }
  }

  /** A hoof on the ground (louder at a gallop), or a splash in the shallows. */
  hoof(surface, speed) {
    this.step(surface === 'water' || surface === 'shallow' ? 'water' : surface === 'stone' || surface === 'rock' ? 'cobble' : 'dirt', speed, 1.4);
  }

  /** The Gnarlhorn's roar: a long, ragged bellow with a growl under it. */
  bellow(dist = 20, k = 1) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const v = Math.min(0.9, 60 / Math.max(20, dist)) * k;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.linearRampToValueAtTime(520, t + 0.4);
    bp.frequency.exponentialRampToValueAtTime(160, t + 2.2);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.4);
    o.frequency.exponentialRampToValueAtTime(45, t + 2.2);
    const og = ctx.createGain();
    og.gain.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.25);
    g.gain.setValueAtTime(v, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    src.connect(bp).connect(g);
    o.connect(og).connect(bp);
    g.connect(lp).connect(this.master);
    lp.connect(this.verb);
    src.start(t);
    src.stop(t + 2.6);
    o.start(t);
    o.stop(t + 2.6);
  }

  /** A heavy footfall or a body hitting the ground. */
  thud(dist = 10, k = 1) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const v = Math.min(0.7, 14 / Math.max(6, dist)) * k;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** Mix by place: distance to the nearest fall (m), to the river, how hard it rains. */
  update(dt, { falls = 200, river = 100, rain = 0, fight = 0 } = {}) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const on = this.enabled ? 1 : 0;
    const fk = Math.min(1, 40 / Math.max(15, falls)) ** 1.4;
    this.falls.gain.setTargetAtTime(this.falls.base * fk * on, now, 0.5);
    this.fallsHi.gain.setTargetAtTime(this.fallsHi.base * fk * on, now, 0.5);
    this.river.gain.setTargetAtTime(this.river.base * Math.min(1, 14 / Math.max(6, river)) * on, now, 0.5);
    this.rainBed.gain.setTargetAtTime(this.rainBed.base * rain * on, now, 1);
    this.jungle.gain.setTargetAtTime(0.8 * (1 - rain * 0.5) * (1 - fight * 0.4) * on, now, 1);
    for (const k of Object.keys(this.next)) this.next[k] -= dt;
    if (this.next.bird < 0) {
      this.next.bird = 1 + Math.random() * 3;
      if (rain < 0.6) this._bird(Math.random() * 2 - 1, 0.3 + Math.random() * 0.5);
    }
    if (this.next.call < 0) {
      this.next.call = 7 + Math.random() * 12;
      this._call();
    }
  }
}
