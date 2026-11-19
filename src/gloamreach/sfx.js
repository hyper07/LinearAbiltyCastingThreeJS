/**
 * The sounds of a fight, synthesized like the rest of Gloamreach's audio (no
 * files): blades whooshing through the air and biting into hide, bark or
 * chitin, a shield's clang, bowstrings, fire's roar, lightning's crack, frost
 * chiming, a meteor's descent and its boom, coins, a chest's creak, a
 * level-up's bell, and the monsters' growls, hisses and roars.
 */
export class Sfx {
  constructor(sound) {
    this.s = sound;
  }

  get ok() {
    return this.s.ctx && this.s.enabled;
  }

  _noise({ t = 0, dur = 0.2, type = 'bandpass', f0 = 1000, f1 = null, q = 1, vol = 0.3, attack = 0.005, verb = 0 }) {
    const ctx = this.s.ctx;
    const t0 = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = this.s.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    src.connect(f).connect(g).connect(this.s.master);
    if (verb) {
      const v = ctx.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.s.verb);
    }
    src.start(t0, Math.random() * 2);
    src.stop(t0 + dur + 0.05);
  }

  _tone({ t = 0, dur = 0.2, type = 'sine', f0 = 440, f1 = null, vol = 0.2, attack = 0.004, verb = 0 }) {
    const ctx = this.s.ctx;
    const t0 = ctx.currentTime + t;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    o.connect(g).connect(this.s.master);
    if (verb) {
      const v = this.s.ctx.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.s.verb);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  swing(k = 1) {
    if (!this.ok) return;
    this._noise({ dur: 0.22 * k, type: 'bandpass', f0: 600, f1: 2400, q: 2.5, vol: 0.18 * k, attack: 0.06 });
  }

  raise() {
    if (!this.ok) return;
    this._noise({ dur: 0.12, type: 'bandpass', f0: 900, q: 1, vol: 0.12 });
  }

  charge() {
    if (!this.ok) return;
    this._noise({ dur: 0.5, type: 'lowpass', f0: 300, f1: 1200, vol: 0.25, attack: 0.05 });
    this._tone({ dur: 0.4, type: 'sawtooth', f0: 90, f1: 140, vol: 0.06 });
  }

  whirl(time) {
    if (!this.ok) return;
    for (let i = 0; i < Math.round(time / 0.3); i++) this._noise({ t: i * 0.3, dur: 0.26, f0: 500, f1: 2000, q: 2, vol: 0.15, attack: 0.08 });
  }

  bow(k = 1) {
    if (!this.ok) return;
    this._tone({ dur: 0.12, type: 'triangle', f0: 180 * k, f1: 90, vol: 0.18 });
    this._noise({ dur: 0.14, type: 'highpass', f0: 2600, vol: 0.12 });
  }

  draw() {
    if (!this.ok) return;
    this._noise({ dur: 0.5, type: 'bandpass', f0: 400, f1: 900, q: 6, vol: 0.06, attack: 0.3 });
  }

  roll() {
    if (!this.ok) return;
    this._noise({ dur: 0.35, type: 'lowpass', f0: 500, vol: 0.2 });
  }

  fire() {
    if (!this.ok) return;
    this._noise({ dur: 0.35, type: 'lowpass', f0: 1800, f1: 400, vol: 0.24, attack: 0.02 });
  }

  boom(k = 1) {
    if (!this.ok) return;
    this._noise({ dur: 0.7 * k, type: 'lowpass', f0: 900, f1: 60, vol: 0.45 * Math.min(1.3, k), verb: 0.4 });
    this._tone({ dur: 0.6 * k, type: 'sine', f0: 90, f1: 35, vol: 0.4 * Math.min(1.3, k) });
  }

  zap() {
    if (!this.ok) return;
    for (let i = 0; i < 5; i++) this._noise({ t: i * 0.035, dur: 0.06, type: 'highpass', f0: 3000 + Math.random() * 2000, vol: 0.2 });
    this._tone({ dur: 0.25, type: 'sawtooth', f0: 1200, f1: 200, vol: 0.06 });
  }

  frost() {
    if (!this.ok) return;
    for (const [f, t] of [[2093, 0], [2637, 0.04], [3136, 0.08], [4186, 0.12]]) this._tone({ t, dur: 0.8, f0: f, vol: 0.05, verb: 0.5 });
    this._noise({ dur: 0.5, type: 'highpass', f0: 4000, vol: 0.15 });
  }

  blink() {
    if (!this.ok) return;
    this._tone({ dur: 0.25, type: 'sine', f0: 400, f1: 1600, vol: 0.12, verb: 0.3 });
  }

  meteor() {
    if (!this.ok) return;
    this._noise({ dur: 1.15, type: 'bandpass', f0: 300, f1: 1400, q: 1, vol: 0.2, attack: 0.9 });
  }

  ward() {
    if (!this.ok) return;
    for (const [f, t] of [[523, 0], [659, 0.06], [784, 0.12]]) this._tone({ t, dur: 0.9, type: 'triangle', f0: f, vol: 0.06, verb: 0.5 });
  }

  /** A blow landing: on a beast's hide, a treant's bark, a spider's shell, a wisp's light. */
  impact(family, crit = false, heavy = false) {
    if (!this.ok) return;
    const k = crit ? 1.4 : heavy ? 1.2 : 1;
    const f = { beast: 500, wood: 260, spider: 1400, fey: 2200, fire: 380 }[family] ?? 700;
    this._noise({ dur: 0.12 * k, type: 'bandpass', f0: f, q: 1.2, vol: 0.32 * k });
    this._tone({ dur: 0.1, type: 'triangle', f0: f * 0.35, f1: f * 0.2, vol: 0.18 * k });
    if (crit) this._tone({ t: 0.01, dur: 0.25, type: 'sine', f0: 1760, f1: 1500, vol: 0.06 });
  }

  block() {
    if (!this.ok) return;
    for (const [f, d] of [[820, 0.35], [1630, 0.2], [2390, 0.12]]) this._tone({ dur: d, type: 'sine', f0: f, vol: 0.12, verb: 0.3 });
    this._noise({ dur: 0.06, type: 'highpass', f0: 2000, vol: 0.2 });
  }

  slam() {
    this.boom(0.9);
  }

  thunk() {
    if (!this.ok) return;
    this._noise({ dur: 0.05, type: 'bandpass', f0: 900, q: 2, vol: 0.1 });
  }

  hurt() {
    if (!this.ok) return;
    this._noise({ dur: 0.14, type: 'lowpass', f0: 700, vol: 0.3 });
    this._tone({ dur: 0.16, type: 'sawtooth', f0: 160, f1: 110, vol: 0.06 });
  }

  death() {
    if (!this.ok) return;
    for (const [f, t] of [[392, 0], [311, 0.35], [262, 0.7]]) this._tone({ t, dur: 1.0, type: 'triangle', f0: f, vol: 0.1, verb: 0.6 });
  }

  levelUp() {
    if (!this.ok) return;
    for (const [f, t] of [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]]) this._tone({ t, dur: 1.2, type: 'triangle', f0: f, vol: 0.09, verb: 0.6 });
  }

  potion() {
    if (!this.ok) return;
    for (let i = 0; i < 4; i++) this._tone({ t: i * 0.06, dur: 0.08, type: 'sine', f0: 600 + i * 120, vol: 0.06 });
  }

  denied() {
    if (!this.ok) return;
    this._tone({ dur: 0.12, type: 'square', f0: 140, vol: 0.04 });
  }

  coins() {
    if (!this.ok) return;
    for (let i = 0; i < 5; i++) this._tone({ t: i * 0.045 + Math.random() * 0.02, dur: 0.2, type: 'sine', f0: 2400 + Math.random() * 1400, vol: 0.05 });
  }

  pickup(rarity = 'common') {
    if (!this.ok) return;
    const up = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }[rarity] ?? 0;
    for (let i = 0; i <= up; i++) this._tone({ t: i * 0.07, dur: 0.3, type: 'triangle', f0: 660 * Math.pow(1.26, i), vol: 0.06, verb: 0.3 });
    this._noise({ dur: 0.08, type: 'bandpass', f0: 1200, vol: 0.08 });
  }

  chest() {
    if (!this.ok) return;
    this._noise({ dur: 0.5, type: 'bandpass', f0: 300, f1: 600, q: 8, vol: 0.12, attack: 0.1 });
    this.coins();
    this._tone({ t: 0.3, dur: 1, type: 'triangle', f0: 784, vol: 0.06, verb: 0.5 });
  }

  /** A monster's voice: on noticing you, on winding up, on dying. `dist` softens it. */
  voice(kind, what = 'aggro', dist = 10) {
    if (!this.ok) return;
    const v = Math.min(1, 12 / Math.max(6, dist));
    if (kind === 'wolf') {
      if (what === 'death') this._tone({ dur: 0.6, type: 'sawtooth', f0: 520, f1: 260, vol: 0.06 * v });
      else this._noise({ dur: 0.35, type: 'bandpass', f0: 220, f1: 160, q: 4, vol: 0.25 * v });
    } else if (kind === 'boar') this._noise({ dur: 0.3, type: 'bandpass', f0: 350, f1: 200, q: 3, vol: 0.28 * v });
    else if (kind === 'spider') this._noise({ dur: 0.25, type: 'highpass', f0: 3000, f1: 5000, vol: 0.18 * v });
    else if (kind === 'wisp') this._tone({ dur: 0.5, type: 'sine', f0: what === 'death' ? 1200 : 700, f1: what === 'death' ? 200 : 900, vol: 0.06 * v, verb: 0.5 });
    else if (kind === 'treant' || kind === 'shroom') this._noise({ dur: 0.6, type: 'lowpass', f0: 300, f1: 120, vol: 0.3 * v });
    else if (kind === 'drake') this.s.roar(dist * 2);
    else this._noise({ dur: 0.4, type: 'lowpass', f0: 400, f1: 150, vol: 0.25 * v });
  }
}
