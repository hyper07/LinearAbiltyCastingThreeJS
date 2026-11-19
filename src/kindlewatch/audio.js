/**
 * Sound, made on the spot with Web Audio — no files: blade swings (shaped
 * noise), thuds and clanks, the whoosh of a dash, fire catching and dying,
 * slimes, imps, arrows, the giant's roar, pickups, and a low winter wind
 * with crackling braziers that swell as you near them.
 */

export class KeepSound {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.last = new Map();
  }

  /** Audio can only start after a user gesture. */
  start() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(c.destination);
    // a second of white noise to shape
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // wind
    const wind = c.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 420;
    wf.Q.value = 0.6;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0.05;
    wind.connect(wf).connect(this.windGain).connect(this.master);
    wind.start();
    this.windFilter = wf;
    // crackle bed (gain follows nearby fire)
    const fire = c.createBufferSource();
    fire.buffer = this.noise;
    fire.loop = true;
    fire.playbackRate.value = 0.7;
    const ff = c.createBiquadFilter();
    ff.type = 'lowpass';
    ff.frequency.value = 900;
    this.fireGain = c.createGain();
    this.fireGain.gain.value = 0;
    fire.connect(ff).connect(this.fireGain).connect(this.master);
    fire.start();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** Ambient levels: `fire` 0…1 how near a lit brazier is. */
  ambient(fire, t) {
    if (!this.ctx) return;
    this.fireGain.gain.setTargetAtTime(fire * 0.07 * (0.7 + Math.random() * 0.6), this.ctx.currentTime, 0.05);
    this.windFilter.frequency.setTargetAtTime(380 + Math.sin(t * 0.3) * 120, this.ctx.currentTime, 0.5);
    if (fire > 0.15 && Math.random() < fire * 0.25) this.pop(0.02 + Math.random() * 0.03);
  }

  pop(v) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;
    const g = c.createGain();
    g.gain.setValueAtTime(v, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03);
    s.connect(f).connect(g).connect(this.master);
    s.start(c.currentTime, Math.random() * 0.5, 0.04);
  }

  noiseHit({ dur = 0.15, vol = 0.3, type = 'bandpass', f0 = 1200, f1 = 400, q = 1 }) {
    const c = this.ctx;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  tone({ dur = 0.2, vol = 0.2, f0 = 440, f1 = 220, type = 'sine', delay = 0 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name, o = {}) {
    if (!this.ctx) return;
    // don't stack the same sound within a few ms
    const now = this.ctx.currentTime;
    if (now - (this.last.get(name) ?? -1) < 0.03) return;
    this.last.set(name, now);
    const r = 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'swing': this.noiseHit({ dur: 0.14, vol: 0.22, f0: 2400 * r, f1: 700, q: 1.4 }); break;
      case 'swing-heavy': this.noiseHit({ dur: 0.24, vol: 0.3, f0: 1500 * r, f1: 300, q: 1.2 }); break;
      case 'swing-foe': this.noiseHit({ dur: 0.16, vol: 0.16, f0: 1600 * r, f1: 500, q: 1.4 }); break;
      case 'hit': this.noiseHit({ dur: 0.1, vol: 0.35, type: 'lowpass', f0: 2600, f1: 300 }); this.tone({ dur: 0.12, vol: 0.25, f0: 160 * r, f1: 60 }); break;
      case 'hit-heavy': this.noiseHit({ dur: 0.18, vol: 0.45, type: 'lowpass', f0: 2000, f1: 120 }); this.tone({ dur: 0.25, vol: 0.4, f0: 110 * r, f1: 40 }); break;
      case 'block': this.tone({ dur: 0.25, vol: 0.18, f0: 1300 * r, f1: 1100, type: 'triangle' }); this.tone({ dur: 0.2, vol: 0.1, f0: 2100 * r, f1: 1900, type: 'triangle' }); break;
      case 'break-guard': this.tone({ dur: 0.4, vol: 0.25, f0: 900, f1: 200, type: 'sawtooth' }); this.noiseHit({ dur: 0.3, vol: 0.3, f0: 3000, f1: 400 }); break;
      case 'hurt': this.tone({ dur: 0.2, vol: 0.3, f0: 220, f1: 90, type: 'square' }); this.noiseHit({ dur: 0.12, vol: 0.25, type: 'lowpass', f0: 1800, f1: 200 }); break;
      case 'dash': this.noiseHit({ dur: 0.22, vol: 0.2, f0: 600, f1: 2400, q: 0.8 }); break;
      case 'charge': this.tone({ dur: 0.6, vol: 0.08, f0: 120, f1: 300, type: 'sawtooth' }); break;
      case 'charged': this.tone({ dur: 0.25, vol: 0.15, f0: 880, f1: 1320, type: 'triangle' }); break;
      case 'heavy': this.noiseHit({ dur: 0.35, vol: 0.35, f0: 900, f1: 200, q: 0.9 }); this.tone({ dur: 0.3, vol: 0.2, f0: 90, f1: 45 }); break;
      case 'throw': this.noiseHit({ dur: 0.18, vol: 0.18, f0: 1800, f1: 900, q: 2 }); break;
      case 'ignite': this.noiseHit({ dur: 0.5, vol: 0.3, type: 'lowpass', f0: 300, f1: 2400 }); this.tone({ dur: 0.4, vol: 0.1, f0: 80, f1: 160 }); break;
      case 'snuff': this.noiseHit({ dur: 0.5, vol: 0.2, type: 'highpass', f0: 4000, f1: 1500 }); break;
      case 'slime-hop': this.tone({ dur: 0.18, vol: 0.12, f0: 300 + (o.size ?? 2) * -60, f1: 600, type: 'sine' }); break;
      case 'slime-split': this.tone({ dur: 0.25, vol: 0.2, f0: 500, f1: 120 }); this.noiseHit({ dur: 0.15, vol: 0.2, type: 'lowpass', f0: 900, f1: 200 }); break;
      case 'imp-throw': this.tone({ dur: 0.12, vol: 0.1, f0: 900 * r, f1: 1400, type: 'square' }); this.noiseHit({ dur: 0.2, vol: 0.12, f0: 600, f1: 2000 }); break;
      case 'arrow': this.tone({ dur: 0.08, vol: 0.12, f0: 300, f1: 180, type: 'triangle' }); this.noiseHit({ dur: 0.18, vol: 0.12, f0: 3000, f1: 1500, q: 3 }); break;
      case 'shards': this.noiseHit({ dur: 0.3, vol: 0.25, type: 'highpass', f0: 2000, f1: 5000 }); break;
      case 'roar-small': this.tone({ dur: 0.4, vol: 0.2, f0: 140, f1: 70, type: 'sawtooth' }); break;
      case 'roar': this.tone({ dur: 1.4, vol: 0.35, f0: 90, f1: 55, type: 'sawtooth' }); this.tone({ dur: 1.2, vol: 0.2, f0: 133, f1: 70, type: 'sawtooth' }); this.noiseHit({ dur: 1.2, vol: 0.25, type: 'lowpass', f0: 800, f1: 200 }); break;
      case 'slam': this.tone({ dur: 0.5, vol: 0.5, f0: 70, f1: 30 }); this.noiseHit({ dur: 0.4, vol: 0.4, type: 'lowpass', f0: 1200, f1: 100 }); break;
      case 'crash': this.tone({ dur: 0.4, vol: 0.4, f0: 90, f1: 40 }); this.noiseHit({ dur: 0.35, vol: 0.35, type: 'lowpass', f0: 1500, f1: 150 }); break;
      case 'gem': this.tone({ dur: 0.18, vol: 0.12, f0: 1320 * r, f1: 1320 * r, type: 'triangle' }); this.tone({ dur: 0.2, vol: 0.08, f0: 1980 * r, f1: 1980 * r, type: 'triangle', delay: 0.05 }); break;
      case 'orb': this.tone({ dur: 0.3, vol: 0.15, f0: 520, f1: 1040, type: 'sine' }); break;
      case 'potion': this.tone({ dur: 0.12, vol: 0.18, f0: 300, f1: 500 }); this.tone({ dur: 0.12, vol: 0.18, f0: 340, f1: 560, delay: 0.14 }); this.tone({ dur: 0.4, vol: 0.12, f0: 660, f1: 990, type: 'triangle', delay: 0.28 }); break;
      case 'break': this.noiseHit({ dur: 0.25, vol: 0.35, type: 'lowpass', f0: 2400, f1: 200 }); this.tone({ dur: 0.12, vol: 0.15, f0: 200, f1: 80, type: 'square' }); break;
      case 'summon': this.tone({ dur: 0.7, vol: 0.18, f0: 220, f1: 660, type: 'triangle' }); this.noiseHit({ dur: 0.6, vol: 0.2, type: 'lowpass', f0: 200, f1: 2400 }); break;
      case 'zap': this.tone({ dur: 0.1, vol: 0.1, f0: 1800 * r, f1: 600, type: 'square' }); break;
      case 'deny': this.tone({ dur: 0.12, vol: 0.1, f0: 200, f1: 150, type: 'square' }); break;
      case 'step': this.noiseHit({ dur: 0.05, vol: 0.05, type: 'lowpass', f0: 900, f1: 300 }); break;
      case 'step-snow': this.noiseHit({ dur: 0.09, vol: 0.07, type: 'bandpass', f0: 1800 * r, f1: 900, q: 0.8 }); break;
      case 'gate': this.tone({ dur: 2.2, vol: 0.3, f0: 60, f1: 45, type: 'sawtooth' }); this.noiseHit({ dur: 2.0, vol: 0.2, type: 'lowpass', f0: 400, f1: 120 }); break;
      case 'victory': [523, 659, 784, 1046].forEach((f, i) => this.tone({ dur: 0.6, vol: 0.15, f0: f, f1: f, type: 'triangle', delay: i * 0.14 })); break;
      case 'ui': this.tone({ dur: 0.06, vol: 0.08, f0: 900, f1: 1100, type: 'triangle' }); break;
      default: break;
    }
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
  }
}
