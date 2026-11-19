/**
 * Kithvale's sound, synthesized like Gloamreach's and built on its Sound
 * (footsteps by surface, the reverb, the noise): a soft wind over the
 * grass, the Pebblerun's chatter that swells as you near it, birdsong by
 * day and crickets at dusk, the shrine's wind bells; each species' voice —
 * a Tuftlet's squeak, a Pebbleroll's clatter, a Lumoth's hum, a Mistfawn's
 * bleat, a Puffwool's baa, an Emberkit's crackle; and the befriending: a
 * toss, a crunch, a soft bell on each breath, a chord when trust is won.
 */
import { Sound } from '../gloamreach/audio.js';

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export class ValeSound extends Sound {
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
    this.master.gain.value = 0.75;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(2.6, 2.4);
    const vg = ctx.createGain();
    vg.gain.value = 0.35;
    this.verb.connect(vg).connect(this.master);
    this.noise = this._noiseBuffer(3);
    const bed = (type, f, q, vol) => {
      const src = this._loopNoise();
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(fl).connect(g).connect(this.master);
      g.base = vol;
      return { g, fl };
    };
    this.wind = bed('lowpass', 420, 0.4, 0.22);
    this.streamBed = bed('bandpass', 1300, 0.8, 0.28);
    this.streamHi = bed('highpass', 4200, 0.4, 0.06);
    // A slow swell in the wind.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 160;
    lfo.connect(lg).connect(this.wind.fl.frequency);
    lfo.start();
    this.village = ctx.createGain();
    this.village.gain.value = 1;
    this.village.connect(this.master);
    this.forest = this.village;
    this.rift = ctx.createGain();
    this.next = { bird: 1, cricket: 0.5, bell: 4 };
    this.dusk = 0;
  }

  /** A pitched note: sine/triangle with an envelope, optionally into the reverb. */
  _note(f, { at = 0, dur = 0.3, vol = 0.1, type = 'sine', glide = null, verb = true, pan = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01 + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    o.connect(g).connect(p).connect(this.master);
    if (verb) p.connect(this.verb);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _burst({ at = 0, dur = 0.1, vol = 0.1, type = 'bandpass', f = 1000, q = 1, f2 = null } = {}) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01 + at;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(fl).connect(g).connect(this.master);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }

  /** A creature's voice, by species and mood ('hi', 'alarm', 'happy', 'eat', 'no'). `dist` softens it. */
  voice(species, mood = 'hi', dist = 6) {
    const v = Math.min(1, 6 / Math.max(3, dist));
    const up = mood === 'alarm' ? 1.4 : mood === 'happy' ? 1.2 : mood === 'no' ? 0.8 : 1;
    switch (species) {
      case 'tuftlet':
        this._note(1400 * up, { dur: 0.09, vol: 0.06 * v, glide: 1900 * up, type: 'triangle' });
        if (mood !== 'no') this._note(1700 * up, { at: 0.1, dur: 0.08, vol: 0.05 * v, glide: 2300 * up, type: 'triangle' });
        break;
      case 'pebbleroll':
        for (let i = 0; i < (mood === 'alarm' ? 6 : 3); i++) this._burst({ at: i * 0.05, dur: 0.04, vol: 0.12 * v, f: 2400 + Math.random() * 900, q: 6 });
        this._note(420 * up, { at: 0.05, dur: 0.18, vol: 0.05 * v, glide: 560 * up, type: 'triangle' });
        break;
      case 'lumoth':
        this._note(880 * up, { dur: 0.6, vol: 0.035 * v, glide: 990 * up });
        this._note(1320 * up, { at: 0.08, dur: 0.5, vol: 0.02 * v });
        break;
      case 'mistfawn':
        this._note(620 * up, { dur: 0.32, vol: 0.06 * v, glide: 540 * up, type: 'triangle' });
        this._burst({ dur: 0.25, vol: 0.03 * v, f: 1800, q: 2 });
        break;
      case 'puffwool':
        this._note(300 * up, { dur: 0.45, vol: 0.07 * v, glide: 270 * up, type: 'sawtooth', verb: true });
        this._note(302 * up, { dur: 0.45, vol: 0.04 * v, glide: 268 * up, type: 'triangle' });
        break;
      case 'emberkit':
        for (let i = 0; i < 5; i++) this._burst({ at: i * 0.035 + Math.random() * 0.02, dur: 0.03, vol: 0.09 * v, type: 'highpass', f: 3000 + Math.random() * 3000, q: 1 });
        this._note(980 * up, { at: 0.02, dur: 0.12, vol: 0.04 * v, glide: 1400 * up, type: 'square' });
        break;
      default:
        break;
    }
  }

  toss() {
    this._burst({ dur: 0.25, vol: 0.07, f: 900, f2: 2400, q: 1.5 });
  }
  plop() {
    this._burst({ dur: 0.08, vol: 0.09, type: 'lowpass', f: 600, q: 1 });
  }
  splash() {
    this._burst({ dur: 0.35, vol: 0.12, type: 'highpass', f: 1800, q: 0.6 });
  }
  crunch() {
    for (let i = 0; i < 4; i++) this._burst({ at: i * 0.13, dur: 0.06, vol: 0.07, f: 2600 + Math.random() * 800, q: 3 });
  }
  pick() {
    this._note(1046.5, { dur: 0.12, vol: 0.05, type: 'triangle' });
    this._note(1568, { at: 0.07, dur: 0.18, vol: 0.05, type: 'triangle' });
  }
  dig() {
    for (let i = 0; i < 3; i++) this._burst({ at: i * 0.18, dur: 0.12, vol: 0.12, type: 'lowpass', f: 700, q: 0.8 });
  }
  shatter() {
    for (let i = 0; i < 9; i++) this._burst({ at: i * 0.03, dur: 0.12, vol: 0.14, f: 900 + Math.random() * 2600, q: 2 });
    this._note(110, { dur: 0.5, vol: 0.12, glide: 60, type: 'triangle' });
  }
  kindle() {
    this._burst({ dur: 0.6, vol: 0.08, type: 'bandpass', f: 500, f2: 1600, q: 0.7 });
    this._note(660, { at: 0.3, dur: 0.8, vol: 0.04 });
  }

  /** The trust moment: a soft bell at each breath's top (the cue), and the graded press. */
  breathCue(k = 0) {
    this._note(PENTA[k % PENTA.length] / 2, { dur: 1.2, vol: 0.035 });
  }
  beat(grade, k = 0) {
    if (grade === 'miss') this._note(220, { dur: 0.25, vol: 0.05, type: 'triangle', glide: 180 });
    else {
      this._note(PENTA[(k * 2) % PENTA.length], { dur: 0.9, vol: grade === 'perfect' ? 0.09 : 0.06 });
      if (grade === 'perfect') this._note(PENTA[(k * 2 + 2) % PENTA.length], { at: 0.04, dur: 0.9, vol: 0.05 });
    }
  }
  /** Trust won: a rising chord. */
  friend() {
    [0, 2, 4, 5, 7].forEach((n, i) => this._note(PENTA[n], { at: i * 0.09, dur: 1.6, vol: 0.06 }));
    this._note(PENTA[0] / 2, { dur: 2.2, vol: 0.05 });
  }
  shy() {
    this._note(392, { dur: 0.35, vol: 0.05, glide: 330, type: 'triangle' });
  }

  /** The shrine's wind bells. */
  bells(k = 1) {
    for (let i = 0; i < 3; i++) this._note(PENTA[4 + Math.floor(Math.random() * 4)] * 1.5, { at: i * (0.12 + Math.random() * 0.2), dur: 2.4, vol: 0.02 * k, pan: Math.random() - 0.5 });
  }

  _cricket() {
    const ctx = this.ctx;
    const f = 4200 + Math.random() * 900;
    const pan = Math.random() * 2 - 1;
    for (let i = 0; i < 3; i++) this._note(f, { at: i * 0.07, dur: 0.05, vol: 0.012 * this.dusk, type: 'square', verb: false, pan });
    void ctx;
  }

  /** Mix by place and hour: `stream` (metres to the water), `dusk` 0…1, `shrine` (metres to the bells), `vale` (out of the village). */
  update(dt, { stream = 99, dusk = 0, shrine = 999, wind = 1 } = {}) {
    if (!this.ctx) return;
    if (!Number.isFinite(stream)) stream = 99;
    if (!Number.isFinite(shrine)) shrine = 999;
    const now = this.ctx.currentTime;
    const v = this.enabled ? 1 : 0;
    this.dusk = dusk;
    this.wind.g.gain.setTargetAtTime(this.wind.g.base * wind * v, now, 0.5);
    const sk = Math.max(0, 1 - stream / 26);
    this.streamBed.g.gain.setTargetAtTime(this.streamBed.g.base * sk * sk * v, now, 0.3);
    this.streamHi.g.gain.setTargetAtTime(this.streamHi.g.base * sk * v, now, 0.3);
    for (const k of Object.keys(this.next)) this.next[k] -= dt;
    if (this.next.bird < 0) {
      this.next.bird = 0.8 + Math.random() * 3;
      if (dusk < 0.7 && v) this._bird(Math.random() * 2 - 1, 0.3 + Math.random() * 0.5);
    }
    if (this.next.cricket < 0) {
      this.next.cricket = 0.25 + Math.random() * 0.6;
      if (dusk > 0.3 && v) this._cricket();
    }
    if (this.next.bell < 0) {
      this.next.bell = 3 + Math.random() * 5;
      if (shrine < 70) this.bells(Math.max(0.2, 1 - shrine / 70));
    }
  }
}
