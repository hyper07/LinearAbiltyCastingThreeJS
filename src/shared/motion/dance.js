/**
 * Procedural dance and emotes, on the beat — pure (no three.js), so it runs
 * in tests and on any rig that has the plush bone names.
 *
 *   const clock = beatClock(126);                       // the track's BPM (public/audio/bgm/manifest.json)
 *   const show = routine(makeCombo(7));                  // an original 4-bar combo from generic moves
 *   const pose = show.sample(clock(t));                  // every frame
 *   applyPlushPose(rider, pose);                         // a PlushRider (or anything with .bones)
 *
 * A pose is joint angles in the plush rigs' convention (src/city/plushRider.js,
 * src/snowpuff/render/riderModel.js; the sculpt faces +z):
 *   hips, chest, head, armL, armR, legL, legR: [x, y, z] Euler radians added to rest;
 *   arms: y swings forward, z raises (armL sits at −x and raises with −z);
 *   legs: −x kicks forward; chest/head: +x bends forward, −x arches back / looks up.
 * And whole-body channels: lift (m, up), stretch (+ tall and thin, − squashed;
 * volume kept), sway (body tilt about z), yaw (turn about y), hipsY (knee bend, m),
 * reachL/reachR (a rubber-hose arm stretch: +0.25 = the arm 25 % bigger, so a
 * raised paw clears the big head — see clampAim).
 *
 * Timing (why it looks like dancing, see knowledge/motion-study.md §6): hits land
 * ON the beat — a pop rises in the last ~70 ms before the beat (accelerating), holds
 * ~60 ms and lets go over ~350 ms; a bounce is lowest on the beat; weight shifts
 * arrive on the beat and dwell; claps fall on 2 and 4.
 */

export const JOINTS = ['hips', 'chest', 'head', 'armL', 'armR', 'legL', 'legR'];
export const SCALARS = ['lift', 'stretch', 'sway', 'yaw', 'hipsY', 'reachL', 'reachR'];
/** The joints an upper-body layer owns (a wave while riding keeps the legs on the deck). */
export const UPPER_BODY = ['chest', 'head', 'armL', 'armR'];

/* ------------------------------------------------------------------ beat clock */

/**
 * A clock that turns seconds into musical time. `offset` is the time of a downbeat
 * (beat 1 of a bar), in seconds.
 * @returns {(t: number) => { t, bpm, spb, beat, index, phase, bar, beatInBar, count }}
 *   beat: beats since offset (float); index: whole beats; phase: 0..1 inside the beat;
 *   beatInBar: 0..beatsPerBar−1; count: 0..7, the dancers' "one to eight".
 */
export function beatClock(bpm, { offset = 0, beatsPerBar = 4 } = {}) {
  if (!(bpm > 0)) throw new Error(`beatClock: bad bpm ${bpm}`);
  const spb = 60 / bpm;
  return (t) => {
    const beat = (t - offset) / spb;
    const index = Math.floor(beat);
    const phase = beat - index;
    return { t, bpm, spb, beat, index, phase, bar: Math.floor(index / beatsPerBar), beatInBar: mod(index, beatsPerBar), count: mod(index, 8) };
  };
}

/**
 * The downbeat offset that best fits detected onsets (seconds) at a known BPM:
 * the circular mean of their phases. Use it to lock a clock to a track whose BPM
 * is in the manifest but whose first beat isn't at 0 (or to onsets heard live).
 */
export function fitBeatOffset(onsets, bpm) {
  const spb = 60 / bpm;
  let s = 0, c = 0;
  for (const t of onsets) {
    const a = ((t / spb) % 1) * Math.PI * 2;
    s += Math.sin(a);
    c += Math.cos(a);
  }
  if (!onsets.length || (Math.abs(s) < 1e-9 && Math.abs(c) < 1e-9)) return 0;
  return mod((Math.atan2(s, c) / (Math.PI * 2)) * spb, spb);
}

/**
 * Onsets from an energy envelope (e.g. an AnalyserNode's summed low band, one value
 * every `hop` seconds): a frame is an onset when its rise over the previous frame beats
 * `k` × the recent mean rise and it is `minGap` seconds after the last one.
 */
export function detectOnsets(energy, hop, { k = 1.6, window = 43, minGap = 0.12 } = {}) {
  const out = [];
  const flux = energy.map((e, i) => Math.max(0, e - (energy[i - 1] ?? e)));
  let last = -Infinity;
  for (let i = 1; i < flux.length; i++) {
    const from = Math.max(0, i - window);
    let mean = 0;
    for (let j = from; j < i; j++) mean += flux[j];
    mean /= Math.max(1, i - from);
    const t = i * hop;
    if (flux[i] > k * mean && flux[i] > 1e-6 && t - last >= minGap && flux[i] >= (flux[i + 1] ?? 0)) {
      out.push(t);
      last = t;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ curves */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mod = (a, n) => ((a % n) + n) % n;
export const smoothstep = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};

/**
 * A pop (a hit): 0..1, exactly 1 on the beat. Rises over the last `attack` seconds
 * before the beat, accelerating (ease-in: the muscle snaps, it doesn't drift), holds
 * `hold` seconds, then lets go over `release` seconds (smooth). Times are seconds, not
 * fractions of a beat, so a hit stays sharp at any tempo.
 */
export function pop(phase, spb, { attack = 0.07, hold = 0.06, release = 0.35 } = {}) {
  const since = phase * spb;
  const until = spb - since;
  const rise = until < attack ? (1 - until / attack) ** 2 : 0;
  const fall = since <= hold ? 1 : 1 - smoothstep((since - hold) / Math.max(1e-6, release));
  return Math.max(rise, fall);
}

/** A bounce, lowest on the beat: −1 on the beat, back up to 0 by the off-beat. `sharp` > 1 makes the drop quicker. */
export function bounce(phase, sharp = 2) {
  return -((0.5 + 0.5 * Math.cos(phase * Math.PI * 2)) ** sharp);
}

/**
 * A step that arrives on the beat and dwells: +1 on even beats, −1 on odd ones,
 * moving only in the last `move` fraction of each beat (smoothstep).
 */
export function step(beat, move = 0.45) {
  const index = Math.floor(beat);
  const phase = beat - index;
  const here = index % 2 === 0 ? 1 : -1;
  const k = smoothstep((phase - (1 - move)) / move);
  return here + (-here - here) * k;
}

/** A travelling wave: joint j of a chain lags `lag` (fraction of a cycle) behind the one before; one cycle every `beats`. */
export function wave(beat, beats, lag = 0) {
  return Math.sin(((beat / beats) - lag) * Math.PI * 2);
}

/* ------------------------------------------------------------------ poses */

const V = () => [0, 0, 0];
export function restPose() {
  const p = {};
  for (const j of JOINTS) p[j] = V();
  for (const s of SCALARS) p[s] = 0;
  return p;
}

/** a + b·w (joint angles and channels add). */
export function addPose(a, b, w = 1) {
  const p = restPose();
  for (const j of JOINTS) for (let i = 0; i < 3; i++) p[j][i] = (a[j]?.[i] ?? 0) + (b[j]?.[i] ?? 0) * w;
  for (const s of SCALARS) p[s] = (a[s] ?? 0) + (b[s] ?? 0) * w;
  return p;
}

export function lerpPose(a, b, w) {
  const p = restPose();
  for (const j of JOINTS) for (let i = 0; i < 3; i++) p[j][i] = (a[j]?.[i] ?? 0) * (1 - w) + (b[j]?.[i] ?? 0) * w;
  for (const s of SCALARS) p[s] = (a[s] ?? 0) * (1 - w) + (b[s] ?? 0) * w;
  return p;
}

export function scalePose(a, k) {
  return addPose(restPose(), a, k);
}

/** Left ↔ right: arms and legs swap sides; y and z turns flip sign; sway and yaw flip. */
export function mirrorPose(a) {
  const f = (v) => [v?.[0] ?? 0, -(v?.[1] ?? 0), -(v?.[2] ?? 0)];
  const p = restPose();
  p.hips = f(a.hips);
  p.chest = f(a.chest);
  p.head = f(a.head);
  p.armL = f(a.armR);
  p.armR = f(a.armL);
  p.legL = f(a.legR);
  p.legR = f(a.legL);
  p.lift = a.lift ?? 0;
  p.stretch = a.stretch ?? 0;
  p.hipsY = a.hipsY ?? 0;
  p.sway = -(a.sway ?? 0);
  p.yaw = -(a.yaw ?? 0);
  p.reachL = a.reachR ?? 0;
  p.reachR = a.reachL ?? 0;
  return p;
}

/**
 * Limits for big-head, short-limb plush bodies. The shoulders sit at the bottom
 * edge of a head about four arm-lengths wide, so a paw raised more than ~50° above
 * horizontal (armRaise 1.7 from the rest droop) is hidden inside the head: "arms up"
 * is a V out to the sides, and a raised paw doesn't swing forward across the face.
 * Legs kick only as far as stubby legs can; the body never folds into the head.
 */
export const PLUSH_LIMITS = { armRaise: [-0.6, 1.7], armSwing: [-1.0, 1.5], armSwingHigh: 0.45, highFrom: 1.15, legKick: [-0.95, 0.5], legOut: [-0.15, 0.55], chest: [-0.45, 0.45], head: [-0.5, 0.4] };

export function clampPlushPose(a, L = PLUSH_LIMITS) {
  const p = addPose(restPose(), a);
  const c = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
  for (const [arm, s] of [['armL', -1], ['armR', 1]]) {
    const raise = c(p[arm][2] * s, L.armRaise);
    let swing = c(p[arm][1] * -s, L.armSwing);
    // above the shoulder the paw would cross the face: pull it out to the side
    const high = smoothstep((raise - L.highFrom) / 0.6);
    const lim = L.armSwing[1] + (L.armSwingHigh - L.armSwing[1]) * high;
    swing = Math.min(swing, lim);
    p[arm][2] = raise * s;
    p[arm][1] = swing * -s;
  }
  // legL sits at −x and swings out with −z; legR out with +z
  for (const [leg, s] of [['legL', -1], ['legR', 1]]) {
    p[leg][0] = c(p[leg][0], L.legKick);
    p[leg][2] = c(p[leg][2] * s, L.legOut) * s;
  }
  p.chest[0] = c(p.chest[0], L.chest);
  p.head[0] = c(p.head[0], L.head);
  return p;
}

/**
 * For retargeting onto a one-bone limb: clamp a direction given in the character's
 * facing frame [out (away from the body's centre line, + on this limb's side), up,
 * forward]. A plush's shoulders sit at the bottom of a head twice their width
 * apart, so a paw pointing up disappears into the head: arms overhead become a V
 * (up at most `maxUp`, the rest pushed out to the side), a raised paw keeps out
 * from the centre line, and nothing swings far behind. Returns a unit vector.
 */
export function clampAim([out, up, fwd], { minOut = 0.35, maxBack = 0.45, maxUp = 0.75 } = {}) {
  if (up > 0) out = Math.max(out, minOut * up);
  fwd = Math.max(fwd, -maxBack);
  let n = Math.hypot(out, up, fwd) || 1;
  out /= n;
  up /= n;
  fwd /= n;
  if (up > maxUp) {
    const side = Math.sqrt(1 - maxUp * maxUp);
    const h = Math.hypot(out, fwd);
    if (h < 1e-6) out = side;
    else {
      out *= side / h;
      fwd *= side / h;
    }
    up = maxUp;
    if (fwd < -maxBack) {
      fwd = -maxBack;
      out = Math.sqrt(Math.max(0, side * side - fwd * fwd));
    }
  }
  return [out, up, fwd];
}

/* ------------------------------------------------------------------ the move library */

/**
 * Generic moves, each a function of the clock state → pose, with its natural
 * length in counts. These are the vocabulary of street and party dance (and of
 * K-pop choreography): building blocks anyone can use. A routine is an original
 * order and variation of them, never a copy of a song's choreography.
 */
export const MOVES = {
  /** The groove: knees bend on every beat, a small nod, arms loose. The default between moves. */
  bounce: {
    counts: 8,
    pose(c, o = {}) {
      const b = bounce(c.phase, 2) * (o.amp ?? 1);
      const p = restPose();
      p.hipsY = 0.03 * b;
      p.lift = 0.012 * b;
      p.stretch = 0.05 * b;
      p.head[0] = -0.12 * b;
      p.chest[0] = -0.05 * b;
      p.armL = [0, 0.15, -0.25 - 0.12 * b];
      p.armR = [0, -0.15, 0.25 + 0.12 * b];
      p.legL[0] = 0.08 * b;
      p.legR[0] = 0.08 * b;
      return p;
    }
  },
  /**
   * Chest pop: the chest snaps out on every beat (arch back, shoulders back, a
   * small lift and stretch), the head counters, and the knees give between pops.
   * `double` adds a half-size pop on the "and" (eighth notes).
   */
  chestPop: {
    counts: 4,
    pose(c, o = {}) {
      // popping: hit hard, let go quickly (release 220 ms), so the next hit reads
      const P = { attack: 0.07, hold: 0.05, release: 0.22 };
      let k = pop(c.phase, c.spb, P);
      if (o.double) k = Math.max(k, 0.6 * pop(mod(c.phase + 0.5, 1), c.spb, { ...P, release: 0.12 }));
      const b = bounce(c.phase, 3);
      const p = restPose();
      p.chest = [-0.34 * k, 0, 0];
      p.hips = [0.1 * k, 0, 0];
      p.head = [0.16 * k - 0.05, 0, 0];
      p.armL = [0, -0.4 * k + 0.2, -0.45 - 0.2 * k];
      p.armR = [0, 0.4 * k - 0.2, 0.45 + 0.2 * k];
      p.stretch = 0.09 * k + 0.03 * b;
      p.lift = 0.015 * k;
      p.hipsY = 0.025 * b;
      p.legL[0] = 0.06 * b;
      p.legR[0] = 0.06 * b;
      return p;
    }
  },
  /** Two-step: weight to one side on each beat (feet out, together), arms swinging across, a bounce. */
  twoStep: {
    counts: 8,
    pose(c) {
      const s = step(c.beat, 0.5);
      const b = bounce(c.phase, 2);
      const p = restPose();
      p.sway = 0.12 * s;
      p.hips = [0, 0.25 * s, 0];
      p.chest = [0.06, -0.2 * s, 0.06 * s];
      p.head = [-0.05, 0.15 * s, -0.1 * s];
      p.legL = [-0.1 * Math.max(0, -s), 0, -0.25 * Math.max(0, -s)];
      p.legR = [-0.1 * Math.max(0, s), 0, 0.25 * Math.max(0, s)];
      p.armL = [0, 0.6 + 0.5 * s, -0.55];
      p.armR = [0, -0.6 + 0.5 * s, 0.55];
      p.hipsY = 0.025 * b;
      p.stretch = 0.04 * b;
      return p;
    }
  },
  /** Arm wave: a ripple from one paw, across the chest, to the other paw and back, over 4 beats. */
  armWave: {
    counts: 8,
    pose(c) {
      const w = (lag) => wave(c.beat, 4, lag);
      const p = restPose();
      p.armL = [0, 0.15, -(1.1 + 0.35 * w(0))];
      p.chest = [0, 0, 0.14 * w(0.12)];
      p.head = [0, 0, -0.12 * w(0.18)];
      p.armR = [0, -0.15, 1.1 + 0.35 * w(0.25)];
      p.sway = 0.06 * w(0.12);
      const b = bounce(c.phase, 2);
      p.hipsY = 0.015 * b;
      return p;
    }
  },
  /** Disco point: one paw up and out on the beat, down across the body on the next; hips sway with it. */
  point: {
    counts: 4,
    pose(c) {
      const s = step(c.beat, 0.35); // +1 up, −1 down, arriving on the beat
      const up = (s + 1) / 2;
      const k = pop(c.phase, c.spb, { attack: 0.06, hold: 0.08, release: 0.3 });
      const p = restPose();
      p.armR = [0, -0.1 - 0.9 * (1 - up), 0.45 + 1.15 * up]; // up: out on the diagonal, beside the head
      p.reachR = 0.2 * up;
      p.armL = [0, 0.9, -0.7]; // the other paw on the hip
      p.sway = -0.1 * s;
      p.hips = [0, -0.2 * s, 0];
      p.head = [-0.2 * up, -0.25 * up, 0];
      p.chest = [0, 0.15 * s, 0];
      p.stretch = 0.05 * k;
      p.legR = [0, 0, 0.18 * up];
      return p;
    }
  },
  /** Body roll: a wave down the body — head, chest, hips — once every 2 beats; the knees follow. */
  bodyRoll: {
    counts: 4,
    pose(c) {
      const w = (lag) => wave(c.beat, 2, lag);
      const p = restPose();
      p.head = [0.22 * w(0), 0, 0];
      p.chest = [0.26 * w(0.12), 0, 0];
      p.hips = [-0.2 * w(0.25), 0, 0];
      p.hipsY = 0.03 * (w(0.3) - 1) * 0.5;
      p.legL[0] = 0.12 * w(0.3);
      p.legR[0] = 0.12 * w(0.3);
      p.armL = [0, 0.35 + 0.15 * w(0.1), -0.4];
      p.armR = [0, -0.35 - 0.15 * w(0.1), 0.4];
      p.stretch = 0.04 * w(0.2);
      return p;
    }
  },
  /** Clap on 2 and 4 (the backbeat), a small bounce on every beat, the head bobbing. */
  clap: {
    counts: 4,
    pose(c) {
      const back = c.beatInBar % 2 === 1;
      const k = back ? pop(c.phase, c.spb, { attack: 0.08, hold: 0.04, release: 0.25 }) : 0;
      const before = c.beatInBar % 2 === 0 && c.phase > 0.5 ? pop(c.phase, c.spb, { attack: 0.08, hold: 0, release: 0 }) : 0; // closing in for the clap on the next beat
      const shut = Math.max(k, before);
      const b = bounce(c.phase, 2);
      const p = restPose();
      p.armL = [0, 1.1 + 0.4 * shut, -0.9]; // paws meet in front of the tummy, below the head
      p.armR = [0, -1.1 - 0.4 * shut, 0.9];
      p.chest = [0.06, 0, 0];
      p.head = [-0.1 - 0.1 * b, 0, 0.12 * Math.sin(c.beat * Math.PI)];
      p.hipsY = 0.02 * b;
      p.stretch = 0.04 * b;
      return p;
    }
  },
  /** Raise the roof: both paws push up on every beat. */
  roof: {
    counts: 4,
    pose(c) {
      const k = pop(c.phase, c.spb);
      const b = bounce(c.phase, 2);
      const p = restPose();
      p.armL = [0, 0.2, -(1.15 + 0.45 * k)];
      p.reachL = p.reachR = 0.12 * k;
      p.armR = [0, -0.2, 1.15 + 0.45 * k];
      p.head = [-0.25 - 0.1 * k, 0, 0];
      p.chest = [-0.08 * k, 0, 0];
      p.lift = 0.02 * k;
      p.stretch = 0.08 * k + 0.03 * b;
      p.hipsY = 0.02 * b;
      return p;
    }
  },
  /** Spin: one full turn over 2 beats with a hop, arms out; ends facing front (a finisher). */
  spin: {
    counts: 2,
    blend: 0.25,
    pose(c, o = {}) {
      const u = mod(c.beat - (o.start ?? 0), 2) / 2;
      const p = restPose();
      const a = Math.PI * 2 * smoothstep(u);
      p.yaw = Math.atan2(Math.sin(a), Math.cos(a)); // wrapped, so a crossfade out of it doesn't unwind the turn
      p.lift = 0.08 * Math.sin(Math.PI * u);
      p.stretch = 0.08 * Math.sin(Math.PI * u) - 0.06 * pop(c.phase, c.spb) * (u < 0.1 ? 1 : 0);
      p.armL = [0, 0, -0.9];
      p.armR = [0, 0, 0.9];
      p.legL = [-0.3 * Math.sin(Math.PI * u), 0, 0];
      return p;
    }
  },
  /** Hit pose: the routine's button — snap into a pose on the count and hold it (a short blend, a settle). */
  hit: {
    counts: 4,
    blend: 0.2,
    pose(c, o = {}) {
      const local = mod(c.beat - (o.start ?? 0), 4);
      const settle = local < 1 ? pop(c.phase, c.spb, { attack: 0.01, hold: 0.03, release: 0.25 }) : 0;
      const p = restPose();
      p.armR = [0, -0.1, 1.6];
      p.reachR = 0.2;
      p.armL = [0, 0.9, -0.7];
      p.head = [-0.25, -0.3, 0];
      p.chest = [-0.12, 0.15, 0];
      p.sway = -0.1;
      p.stretch = 0.03 + 0.05 * settle;
      p.lift = 0.01 * settle;
      return p;
    }
  },

  /* ---- emotes (also fine off the music: give them a clock at any tempo, ~120) ---- */

  /** Hello: one paw up, waving side to side twice a beat. */
  hello: {
    counts: 4,
    emote: true,
    pose(c) {
      const w = Math.sin(c.beat * Math.PI * 2);
      const p = restPose();
      p.armR = [0, -0.35 + 0.35 * w, 1.6]; // the paw swings between beside the head and in front of the cheek
      p.reachR = 0.25;
      p.head = [-0.1, -0.12, 0.12 * w];
      p.chest = [0, -0.1, 0.05 * w];
      p.sway = 0.04 * w;
      return p;
    }
  },
  /** Cheer: jumps with both paws up, a squash on every landing. */
  cheer: {
    counts: 4,
    emote: true,
    pose(c) {
      const u = mod(c.beat, 2) / 2;
      const air = u > 0.2 && u < 0.8;
      const a = air ? (u - 0.2) / 0.6 : 0;
      const p = restPose();
      p.lift = air ? Math.sin(a * Math.PI) * 0.3 : 0;
      p.stretch = air ? 0.12 * (1 - Math.abs(a - 0.5) * 2) : -0.14 * Math.sin(((u <= 0.2 ? u : u - 0.8) / 0.2) * Math.PI);
      p.armL = [0, 0.1, -(air ? 1.65 : 1.3)]; // a V: straight up would vanish into the big head
      p.armR = [0, -0.1, air ? 1.65 : 1.3];
      p.reachL = p.reachR = air ? 0.22 : 0.1;
      p.legL = [air ? -0.5 : -0.05, 0, 0];
      p.legR = [air ? -0.4 : -0.05, 0, 0];
      p.head = [-0.25, 0, 0];
      p.chest = [air ? -0.12 : 0.08, 0, 0];
      p.hipsY = air ? 0 : -0.03 * Math.sin(((u <= 0.2 ? u : u - 0.8) / 0.2) * Math.PI);
      return p;
    }
  },
  /** Shrug: shoulders (paws) up and out on the beat, head tilted, then down. */
  shrug: {
    counts: 2,
    emote: true,
    pose(c) {
      const k = pop(mod(c.beat, 2) / 2, c.spb * 2, { attack: 0.18, hold: 0.35, release: 0.4 });
      const p = restPose();
      p.armL = [0, -0.4 * k, -0.9 * k];
      p.armR = [0, 0.4 * k, 0.9 * k];
      p.head = [0.05 * k, 0, 0.28 * k];
      p.stretch = -0.05 * k;
      p.lift = 0.01 * k;
      return p;
    }
  },
  /** Bow: bend forward over a beat, hold, come back up. */
  bow: {
    counts: 4,
    emote: true,
    pose(c) {
      const u = mod(c.beat, 4) / 4;
      const k = u < 0.3 ? smoothstep(u / 0.3) : u < 0.65 ? 1 : 1 - smoothstep((u - 0.65) / 0.3);
      const p = restPose();
      p.chest = [0.45 * k, 0, 0];
      p.head = [0.35 * k, 0, 0];
      p.hips = [0.2 * k, 0, 0];
      p.armL = [0, 0.5 * k, -0.2];
      p.armR = [0, -0.5 * k, 0.2];
      return p;
    }
  }
};

export const DANCE_MOVES = Object.keys(MOVES).filter((m) => !MOVES[m].emote);
export const EMOTES = Object.keys(MOVES).filter((m) => MOVES[m].emote);

/** One move's pose at clock state `c`; `mirror` plays it on the other side, `amp` scales it. */
export function movePose(name, c, { mirror = false, amp = 1, ...o } = {}) {
  const m = MOVES[name];
  if (!m) throw new Error(`unknown move ${name}`);
  let p = m.pose(c, { amp, ...o });
  if (amp !== 1) p = scalePose(p, amp);
  return mirror ? mirrorPose(p) : p;
}

/* ------------------------------------------------------------------ routines */

/**
 * A routine: steps played one after another, in counts (beats), looping.
 * Neighbouring steps crossfade over `blend` beats, centred on the boundary, so
 * the change itself lands on the count.
 *   steps: [{ move, counts?, mirror?, amp?, double? }]
 * @returns {{ counts: number, steps, at(beat): { i, step, local }, sample(clockState): pose }}
 */
export function routine(steps, { blend = 0.5, limits = PLUSH_LIMITS } = {}) {
  const list = steps.map((s) => ({ ...s, counts: s.counts ?? MOVES[s.move]?.counts ?? 4 }));
  const starts = [];
  let total = 0;
  for (const s of list) {
    starts.push(total);
    total += s.counts;
  }
  const at = (beat) => {
    const b = mod(beat, total);
    let i = list.length - 1;
    while (i > 0 && starts[i] > b) i--;
    return { i, step: list[i], local: b - starts[i] };
  };
  const poseOf = (i, c) => {
    const s = list[mod(i, list.length)];
    return movePose(s.move, c, { ...s, start: starts[mod(i, list.length)] });
  };
  return {
    counts: total,
    steps: list,
    at,
    sample(c) {
      const { i, step: s, local } = at(c.beat);
      let p = poseOf(i, c);
      const next = list[mod(i + 1, list.length)];
      const bin = s.blend ?? MOVES[s.move]?.blend ?? blend; // fading into this step
      const bout = next.blend ?? MOVES[next.move]?.blend ?? blend; // fading into the next
      if (bin > 0 && local < bin / 2) {
        p = lerpPose(poseOf(i - 1, c), p, smoothstep(0.5 + local / bin));
      } else if (bout > 0 && s.counts - local < bout / 2) {
        p = lerpPose(p, poseOf(i + 1, c), smoothstep(0.5 - (s.counts - local) / bout));
      }
      return limits ? clampPlushPose(p, limits) : p;
    }
  };
}

/** A small deterministic random (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An original combo from the generic moves, in 8-count phrases (two bars of
 * 4/4 each; `bars` rounds up to an even number). Rules, so it reads as a
 * routine and never as a copy of one: open on the groove; each phrase is two
 * 4-count halves; no move twice in a row; a one-sided move is answered by its
 * mirror (call and response); the last phrase ends on a button (spin + hit).
 * Same seed, same combo.
 */
export function makeCombo(seed = 1, { bars = 8, moves = ['chestPop', 'twoStep', 'armWave', 'point', 'bodyRoll', 'clap', 'roof'] } = {}) {
  const r = rng(seed);
  const phrases = Math.max(1, Math.ceil(bars / 2));
  const pick = (not) => {
    const ok = moves.filter((m) => !not.includes(m));
    return ok[Math.floor(r() * ok.length)];
  };
  const SIDED = ['point', 'armWave'];
  const steps = [];
  let last = 'bounce';
  for (let ph = 0; ph < phrases; ph++) {
    const final = ph === phrases - 1;
    const a = ph === 0 ? 'bounce' : pick([last]);
    const amp = 0.85 + r() * 0.3;
    steps.push({ move: a, counts: 4, amp, double: a === 'chestPop' && r() < 0.4 });
    if (final) {
      steps.push({ move: 'spin', counts: 2 }, { move: 'hit', counts: 2 });
      break;
    }
    if (SIDED.includes(a)) steps.push({ move: a, counts: 4, amp, mirror: true });
    else {
      const b = pick([a]);
      steps.push({ move: b, counts: 4, amp: 0.85 + r() * 0.3, double: b === 'chestPop' && r() < 0.4 });
      last = b;
      continue;
    }
    last = a;
  }
  return steps;
}

/* ------------------------------------------------------------------ springs and the rig */

/** A damped spring step (semi-implicit Euler): s = { x, v }; returns the new x. */
export function spring(s, goal, k, d, dt) {
  s.v += (k * (goal - s.x) - d * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
}

/** Volume-kept squash and stretch: [sx, sy, sz] for a stretch (+0.1 = 10 % taller, thinner). */
export function squashScale(stretch) {
  const sy = Math.max(0.5, 1 + stretch);
  const sxz = 1 / Math.sqrt(sy);
  return [sxz, sy, sxz];
}

/**
 * Secondary motion for floppy parts (ears, tails, scarves): springs driven by the
 * body's vertical speed and sway. Call once per frame with the pose just applied.
 * Returns angles to add: { ear: [x, z], tail: [x, y] }.
 */
export function secondary(state, pose, dt) {
  state.ear ??= { x: 0, v: 0 };
  state.earZ ??= { x: 0, v: 0 };
  state.tail ??= { x: 0, v: 0 };
  const y = (pose.lift ?? 0) + (pose.hipsY ?? 0) + (pose.stretch ?? 0) * 0.3;
  const vy = dt > 0 && state.lastY != null ? (y - state.lastY) / dt : 0;
  state.lastY = y;
  // a body going up leaves the ears behind (they droop back), coming down flings them up
  state.ear.v -= vy * 2.2;
  const ear = spring(state.ear, 0, 70, 6, dt);
  const earZ = spring(state.earZ, (pose.sway ?? 0) * 1.6, 45, 5, dt);
  const tail = spring(state.tail, -(pose.hips?.[1] ?? 0) * 1.5 - (pose.sway ?? 0), 55, 4, dt);
  return { ear: [ear, earZ], tail: [-0.2 + ear * 0.4, tail] };
}

/**
 * Put a pose on a plush rig: { bones: Map|{get}, squash?, tilt?, turn?, hipsRestY? }.
 * Joint angles are set (rest is zero on the plush rigs); `weight` blends with the
 * angles already there (a layer over riding), `mask` limits the joints (UPPER_BODY).
 * Whole-body channels need `squash` (position/scale), `tilt` (sway) and `turn` (yaw)
 * groups; they are skipped when masked out or absent.
 */
export function applyPlushPose(rig, pose, { weight = 1, mask = null } = {}) {
  const get = (n) => (rig.bones.get ? rig.bones.get(n) : rig.bones[n]);
  const joints = mask ?? JOINTS;
  for (const j of joints) {
    const b = get(j);
    const v = pose[j];
    if (!b || !v) continue;
    if (weight >= 1) b.rotation.set(v[0], v[1], v[2]);
    else b.rotation.set(b.rotation.x + (v[0] - b.rotation.x) * weight, b.rotation.y + (v[1] - b.rotation.y) * weight, b.rotation.z + (v[2] - b.rotation.z) * weight);
  }
  for (const [arm, k] of [['armL', 'reachL'], ['armR', 'reachR']]) {
    const b = joints.includes(arm) && get(arm);
    if (!b) continue;
    // (from 1, not from the current scale: a base layer such as riding never sets it)
    b.scale.setScalar(1 + (pose[k] ?? 0) * Math.min(1, weight));
  }
  if (mask) return;
  const hips = get('hips');
  if (hips) hips.position.y = (rig.hipsRestY ?? 0.2) + (pose.hipsY ?? 0);
  if (rig.squash) {
    const [sx, sy, sz] = squashScale(pose.stretch ?? 0);
    rig.squash.scale.set(sx, sy, sz);
    rig.squash.position.y = Math.max(0, pose.lift ?? 0);
  }
  if (rig.tilt) rig.tilt.rotation.z = pose.sway ?? 0;
  if (rig.turn) rig.turn.rotation.y = (rig.turnRest ?? 0) + (pose.yaw ?? 0);
}
