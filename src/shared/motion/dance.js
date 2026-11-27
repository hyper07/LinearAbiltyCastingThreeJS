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

/**
 * A pop on every `every`-th beat only (counted from `start`, shifted by `at`): 1 on those beats,
 * rising in the attack just before them, 0 elsewhere. `popEvery(c, 1)` is `pop(c.phase, c.spb)`.
 */
export function popEvery(c, every = 2, { start = 0, at = 0, attack = 0.07, hold = 0.06, release = 0.35 } = {}) {
  const local = c.beat - start - at;
  const n = Math.floor(local);
  const ph = local - n;
  const since = ph * c.spb;
  const until = c.spb - since;
  const rise = mod(n + 1, every) === 0 && until < attack ? (1 - until / attack) ** 2 : 0;
  const fall = mod(n, every) !== 0 ? 0 : since <= hold ? 1 : 1 - smoothstep((since - hold) / Math.max(1e-6, release));
  return Math.max(rise, fall);
}

/* ---- smooth curves: half time, held poses, sine ease (the slow moves below) ---- */

/** Sine ease in and out, 0..1: starts and stops gently (a smoothstep's flatter cousin). */
export const easeSine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/** A soft knee groove: −1 (knees bent) on every `per`-th beat (counted from `at`), 0 halfway between — a pure sine, never a snap. */
export function groove(beat, per = 2, at = 0) {
  return -(0.5 + 0.5 * Math.cos((2 * Math.PI * (beat - at)) / per));
}

/**
 * A held weight shift: arrives at +1 on beat 0 (and every 2·`per` beats), at −1 on beat `per`…;
 * dwells `hold` of the way there, then flows across with a sine ease, arriving on the next count.
 */
export function glide(beat, per = 2, hold = 0.25) {
  const n = Math.floor(beat / per);
  const here = mod(n, 2) === 0 ? 1 : -1;
  return here - 2 * here * easeSine((beat / per - n - hold) / (1 - hold));
}

/**
 * A smooth pulse, 0..1: eases up over `rise` beats to arrive (1) on beat `at` of every `per`, holds
 * `hold` beats, eases back down over `fall` — a slow hit that lands on the count and lets go gently.
 */
export function swell(beat, per, at = 0, { rise = 1, hold = 0.25, fall = 1.5 } = {}) {
  const u = mod(beat - at + rise, per);
  if (u < rise) return easeSine(u / rise);
  if (u < rise + hold) return 1;
  return 1 - easeSine((u - rise - hold) / fall);
}

/**
 * Follow-through, in seconds: the hips lead, the chest follows ~90 ms later, the arms ~160 ms, the
 * head last (~200 ms). `lagged(c, LAG.head)` is the beat the head is at.
 */
export const LAG = { hips: 0, chest: 0.09, arms: 0.16, head: 0.2 };
export const lagged = (c, seconds) => c.beat - seconds / c.spb;

/** A clock state at a beat count (from a song's position in beats, not seconds) — what `beatClock` gives. */
export function beatAt(beat, bpm = 120, beatsPerBar = 4) {
  const spb = 60 / bpm;
  const index = Math.floor(beat);
  return { t: beat * spb, bpm, spb, beat, index, phase: beat - index, bar: Math.floor(index / beatsPerBar), beatInBar: mod(index, beatsPerBar), count: mod(index, 8) };
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

/** −1 when a move plays mirrored: its weight shift starts on the other foot, so after mirrorPose the weight is where it was (no jump at the join). */
const sided = (o) => (o.mirror ? -1 : 1);

/**
 * The base of the slow moves: the weight from foot to foot (`glide`, landing every `per` beats and
 * dwelling `hold`), the hips leading, the chest, then the head answering late (LAG); the weight
 * leg out a little (`step`), the free knee soft; a knee groove (`knees`, m) lowest as the weight
 * lands, a little squash with it (`bob`). `size` scales the shift, `hips` the hip drop.
 */
function shiftPose(c, o = {}, { per = 2, hold = 0.25, size = 1, knees = 0.03, bob = 0.04, hips = 1, step = 0.18 } = {}) {
  const sd = sided(o);
  const h = (lag) => sd * glide(lagged(c, lag), per, hold);
  const h0 = h(0), hc = h(LAG.chest), hh = h(LAG.head);
  const p = restPose();
  p.sway = 0.07 * size * h0;
  p.hips = [0, 0.1 * size * h0, 0.1 * size * hips * h0];
  p.chest = [0.03, -0.07 * size * hc, -0.09 * size * hc];
  p.head = [-0.06, 0.05 * size * hh, 0.07 * size * hh];
  const wR = ((1 + h0) / 2) ** 2, wL = ((1 - h0) / 2) ** 2;
  p.legR = [-0.1 * wL, 0, step * wR];
  p.legL = [-0.1 * wR, 0, -step * wL];
  p.hipsY = knees * groove(c.beat, 2);
  p.stretch = bob * groove(lagged(c, LAG.chest), 2);
  return p;
}

/** The frog's base: the hips wiggling slowly side to side every two beats, the chest countering, the head after. */
function wiggle(c, o = {}, size = 1) {
  const sd = sided(o);
  const h = (lag) => sd * glide(lagged(c, lag), 2, 0.2);
  const p = restPose();
  p.hips = [0, 0.22 * size * h(0), 0.08 * size * h(0)];
  p.chest = [0.05, -0.12 * size * h(LAG.chest), -0.06 * size * h(LAG.chest)];
  p.head = [-0.1, 0.06 * size * h(LAG.head), 0.1 * size * h(LAG.head)];
  p.sway = 0.04 * size * h(LAG.chest);
  return p;
}

/* ---- the signature styles' clock: the song's own beats ---- */

/**
 * How fast the podium dances play: dance counts per beat of the song (three counts to every two
 * beats, from a bar line). The signature styles below are written in the song's beats (`sb`), so
 * their hits land on the music: a 12-count step is two bars of the song, a 6-count step one.
 */
export const RATE = 1.5;
/** The song's beat at a clock state given in dance counts, `lag` seconds behind (follow-through). */
const sb = (c, lag = 0) => lagged(c, lag) / RATE;
/** Beats since the step began (a style's own bar and phrase: 0..8 in a 12-count step). */
const inStep = (c, o, lag = 0) => (lagged(c, lag) - (o.start ?? 0)) / RATE;
const frac = (x) => x - Math.floor(x);
/** A smooth bump: 0 at `a`, 1 halfway, 0 again at `b`, starting and ending still (sine squared; 0 outside). */
const bump = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)) ** 2);
/** A hop's arc: 0 at `a` (take-off), 1 halfway, 0 at `b` (landing): a sine, quick off the ground (0 outside). */
const arc = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));
/** 1 on the beat, 0 on the off-beat (a cosine; `sharp` narrows it round the beat). */
const onBeat = (b, sharp = 1) => (0.5 + 0.5 * Math.cos(2 * Math.PI * b)) ** sharp;
/** 0 before `a`, eased (sine) to 1 at `b`, 1 after. */
const ramp = (x, a, b) => easeSine((x - a) / (b - a));
/**
 * Held keyframes on a grid (`b` in grid steps: beats, or half-beats for syncopation), cycling
 * through `list`: a value arrives ON its step and holds, then moves to the next over the last `tr`
 * of the step with a sine ease — a staccato hit that never snaps. Numbers or arrays.
 */
function held(b, list, tr = 0.5) {
  const n = Math.floor(b);
  const a = list[mod(n, list.length)], z = list[mod(n + 1, list.length)];
  const k = easeSine((b - n - (1 - tr)) / tr);
  return typeof a === 'number' ? a + (z - a) * k : a.map((x, i) => x + (z[i] - x) * k);
}
/** Arm angles from [raise, forward]: raise up from the droop (≈ 0.8 out flat, 1.6 a V), forward swing (− back). */
const armR = ([raise, fwd], x = 0) => [x, -fwd, raise];
const armL = ([raise, fwd], x = 0) => [x, fwd, -raise];
const mixArm = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
/**
 * A whole turn's progress, 0..1, over beats [a, b]: speeds up over the first `r` of it, steady,
 * slows over the last `r` — its top speed only 1/(1 − r) of the mean (a sine ease peaks at π/2 of it).
 */
function turnAt(x, a, b, r = 0.25) {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  const m = 1 / (1 - r);
  if (u < r) return (m * u * u) / (2 * r);
  if (u > 1 - r) return 1 - (m * (1 - u) ** 2) / (2 * r);
  return m * (u - r / 2);
}
/** A full turn as a yaw, wrapped to ±π (a crossfade out of it doesn't unwind it). */
const spinYaw = (k) => Math.atan2(Math.sin(2 * Math.PI * k), Math.cos(2 * Math.PI * k));

/** The fox's robot arms, [raise, forward]: straight lines and right angles (one-bone arms make the boxes with the body). */
const TUT = { out: [0.8, 0], fwd: [0.78, 1.2], down: [-0.35, 0.05], up: [1.55, 0.1], box: [0.45, 0.95] };
/** Two bars of tutting, a pose on every beat: [right arm, left arm, head tilt, body facing]; only one arm changes at a time, mostly. */
const ROBOT = {
  lines: [['out', 'down', 1, 0], ['out', 'out', 0, 0], ['up', 'out', -1, 0.4], ['up', 'fwd', 0, 0.4], ['out', 'fwd', 1, 0], ['out', 'out', 0, -0.4], ['out', 'up', -1, -0.4], ['down', 'out', 0, 0]],
  boxes: [['box', 'box', 0, 0], ['out', 'box', -1, 0.3], ['out', 'out', 0, 0.3], ['up', 'out', 1, 0], ['up', 'down', 0, 0], ['out', 'down', -1, -0.3], ['out', 'box', 0, -0.3], ['box', 'box', 1, 0]]
};

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
      // shut on the odd beats (2 and 4), closing in just before them — and never before 1 and 3
      const shut = popEvery(c, 2, { at: 1, attack: 0.08, hold: 0.04, release: 0.25 });
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

  /* ---- character moves (the crew's signatures, signatures.js; generic, anyone can use them) ---- */

  /**
   * Hop: springy hops, landing (squashed) on the beat — a small one every beat, or `big` one every two
   * beats with the paws flung out; `side` hops to alternate sides, tilting and turning into each.
   */
  hop: {
    counts: 4,
    pose(c, o = {}) {
      const per = o.big ? 2 : 1;
      const local = c.beat - (o.start ?? 0);
      const u = mod(local, per) / per; // 0: on the ground, on the beat
      const [a0, a1] = o.big ? [0.12, 0.9] : [0.16, 0.84];
      const side = o.side ? (mod(Math.floor(local / per), 2) === 0 ? 1 : -1) : 0;
      const p = restPose();
      let raise = 0.45;
      if (u > a0 && u < a1) {
        const a = (u - a0) / (a1 - a0);
        const up = Math.sin(Math.PI * a);
        p.lift = (o.big ? 0.24 : 0.1) * up;
        p.stretch = 0.11 * Math.abs(Math.sin(2 * Math.PI * a)); // long on the way up and down, round at the top
        p.legL = [-0.35 * up, 0, -0.1 * up];
        p.legR = [-0.28 * up, 0, 0.1 * up];
        p.head[0] = -0.18 * up;
        p.chest[0] = -0.08 * up;
        p.sway = 0.1 * side * up;
        p.yaw = 0.22 * side * up;
        raise += (o.big ? 0.95 : 0.4) * up;
        p.reachL = p.reachR = (o.big ? 0.12 : 0) * up;
      } else {
        const g = (u >= a1 ? u - a1 : u + 1 - a1) / (a0 + 1 - a1);
        const k = Math.sin(Math.PI * g);
        p.stretch = -(o.big ? 0.16 : 0.12) * k;
        p.hipsY = -0.035 * k;
        p.head[0] = 0.08 * k;
        p.chest[0] = 0.1 * k;
        raise -= 0.15 * k;
      }
      p.armL = [0, 0.15, -raise];
      p.armR = [0, -0.15, raise];
      return p;
    }
  },
  /** Shimmy: the shoulders shake twice a beat while the weight steps side to side; `double` shimmies down low and back up. */
  shimmy: {
    counts: 4,
    pose(c, o = {}) {
      const sh = Math.sin(c.beat * Math.PI * 4);
      const s = step(c.beat, 0.5);
      const b = bounce(c.phase, 2);
      const dip = o.double ? Math.sin((Math.PI * mod(c.beat - (o.start ?? 0), 4)) / 4) : 0;
      const p = restPose();
      p.chest = [0.05, 0.22 * sh, 0.05 * s];
      p.hips = [0, 0.15 * s - 0.08 * sh, 0];
      p.sway = 0.09 * s;
      p.head = [-0.1 - 0.08 * b, -0.1 * sh, -0.12 * s];
      p.armL = [0, 0.45 + 0.25 * sh, -0.75];
      p.armR = [0, -0.45 + 0.25 * sh, 0.75];
      p.legL = [-0.1 * Math.max(0, -s), 0, -0.2 * Math.max(0, -s)];
      p.legR = [-0.1 * Math.max(0, s), 0, 0.2 * Math.max(0, s)];
      p.hipsY = 0.025 * b - 0.05 * dip;
      p.stretch = 0.04 * b - 0.05 * dip;
      return p;
    }
  },
  /** Step-clap: a step to a side on every beat, the paws clapping on 2 and 4. */
  stepClap: {
    counts: 8,
    pose(c) {
      const p = MOVES.clap.pose(c);
      const s = step(c.beat, 0.5);
      p.sway += 0.1 * s;
      p.hips[1] += 0.2 * s;
      p.head[2] -= 0.08 * s;
      p.legL = [-0.1 * Math.max(0, -s), 0, -0.22 * Math.max(0, -s)];
      p.legR = [-0.1 * Math.max(0, s), 0, 0.22 * Math.max(0, s)];
      return p;
    }
  },
  /** Hip sway: the hips swing out to a side on each beat and dwell there, the chest and head countering; one paw on the hip. */
  hipSway: {
    counts: 4,
    pose(c) {
      const s = step(c.beat, 0.6);
      const b = bounce(c.phase, 3);
      const p = restPose();
      p.hips = [0, 0.18 * s, 0.22 * s];
      p.chest = [-0.06, -0.12 * s, -0.2 * s];
      p.head = [-0.08, 0.1 * s, 0.16 * s];
      p.sway = -0.05 * s;
      p.armL = [0, 0.9, -0.7]; // the paw on the hip
      p.armR = [0, -0.25 + 0.2 * s, 0.5 + 0.12 * s];
      p.legL = [-0.15 * Math.max(0, s), 0, 0]; // the free knee pops forward
      p.legR = [-0.15 * Math.max(0, -s), 0, 0];
      p.hipsY = 0.02 * b;
      p.stretch = 0.03 * b;
      return p;
    }
  },
  /** Paw flick: a paw up by the cheek flicks out to the side on 1 and 3 (the head snapping after it), the other on the hip. */
  pawFlick: {
    counts: 4,
    pose(c, o = {}) {
      const k = popEvery(c, 2, { start: o.start ?? 0, attack: 0.05, hold: 0.07, release: 0.3 });
      const s = step(c.beat, 0.5);
      const b = bounce(c.phase, 2);
      const p = restPose();
      p.armR = [0, -0.7 + 0.85 * k, 1.25 - 0.2 * k]; // by the cheek → out to the side
      p.reachR = 0.22 * k;
      p.armL = [0, 0.9, -0.7];
      p.head = [-0.08, -0.25 * k, 0.12 * k];
      p.chest = [-0.06 * k, 0.1 * k, 0];
      p.hips = [0, 0, 0.12 * s];
      p.sway = -0.04 * s;
      p.stretch = 0.04 * k + 0.02 * b;
      p.hipsY = 0.015 * b;
      return p;
    }
  },
  /** Arm pump: a fist punched up the diagonal on every beat with a small chest pop, the other paw low. */
  armPump: {
    counts: 4,
    pose(c) {
      const k = pop(c.phase, c.spb, { attack: 0.06, hold: 0.05, release: 0.25 });
      const b = bounce(c.phase, 3);
      const p = restPose();
      p.armR = [0, -0.05, 0.75 + 0.85 * k];
      p.reachR = 0.18 * k;
      p.armL = [0, 0.4, -0.55];
      p.chest = [-0.18 * k, 0.1 * k, 0];
      p.head = [-0.12 - 0.1 * k, -0.12 * k, 0];
      p.hips = [0.05 * k, 0, 0];
      p.stretch = 0.07 * k + 0.03 * b;
      p.lift = 0.012 * k;
      p.hipsY = 0.025 * b;
      p.legL[0] = 0.06 * b;
      p.legR[0] = 0.06 * b;
      return p;
    }
  },
  /**
   * Pop burst: a bar of two halves — beats 1–2 four chest pops (two a beat: the chest hits out, the
   * elbows pull back, a squash on every hit, the head nodding just after); beats 3–4 a sway and a clap.
   * (Kickrani's first podium routine, kept as Pip's.)
   */
  popBurst: {
    counts: 4,
    pose(c, o = {}) {
      const bar = mod(c.beat - (o.start ?? 0), 4);
      const P = { attack: 0.05, hold: 0.03, release: 0.1 };
      const half = c.spb / 2;
      const k = pop(mod(c.beat * 2, 1), half, P);
      const nod = pop(mod(c.beat * 2 - 0.1, 1), half, P);
      const knees = Math.abs(Math.sin((c.beat * Math.PI) / 2));
      const burst = restPose();
      burst.chest = [0.06 - 0.42 * k, 0, 0];
      burst.hips = [0.1 * k, 0, 0];
      burst.head = [-0.05 + 0.3 * nod, 0, 0];
      burst.armL = [0.6 * k, 0.25, -0.62 - 0.34 * k];
      burst.armR = [0.6 * k, -0.25, 0.62 + 0.34 * k];
      burst.legL = [-0.12 * knees, 0, -0.06];
      burst.legR = [-0.12 * knees, 0, 0.06];
      burst.stretch = -0.14 * k + (knees - 0.5) * 0.04;
      burst.hipsY = 0.03 * (knees - 1);
      const sw = Math.sin(c.beat * Math.PI);
      const clap = Math.abs(sw);
      const groove = restPose();
      groove.sway = 0.1 * sw;
      groove.hips = [0, 0.25 * sw, 0];
      groove.chest = [0.06, -0.15 * sw, 0.06 * sw];
      groove.head = [-0.1, 0.15 * sw, -0.14 * sw];
      groove.armL = [0, 1.2 + (1 - clap) * 0.3, -1.1];
      groove.armR = [0, -1.2 - (1 - clap) * 0.3, 1.1];
      groove.legL = [-0.12 * knees, 0, -0.06 - Math.max(0, sw) * 0.12];
      groove.legR = [-0.12 * knees, 0, 0.06 + Math.max(0, -sw) * 0.12];
      groove.stretch = (knees - 0.5) * 0.04;
      groove.hipsY = 0.03 * (knees - 1);
      const w = bar < 3 ? smoothstep((bar - 1.75) / 0.3) : 1 - smoothstep((bar - 3.8) / 0.2);
      return lerpPose(burst, groove, w);
    }
  },
  /** Proud step: a heavy two-step in half time — the weight lands every two beats, chest out, chin up. */
  proudStep: {
    counts: 8,
    pose(c) {
      const s = step(c.beat / 2, 0.5);
      const b = bounce(mod(c.beat / 2, 1), 2);
      const roll = wave(c.beat, 2);
      const p = restPose();
      p.sway = 0.1 * s;
      p.hips = [0, 0.2 * s, 0];
      p.chest = [-0.16, -0.15 * s, 0.07 * roll];
      p.head = [-0.2, 0.12 * s, -0.06 * s];
      p.legL = [-0.12 * Math.max(0, -s), 0, -0.3 * Math.max(0, -s)];
      p.legR = [-0.12 * Math.max(0, s), 0, 0.3 * Math.max(0, s)];
      p.armL = [0, 0.3 + 0.4 * s, -0.6];
      p.armR = [0, -0.3 + 0.4 * s, 0.6];
      p.hipsY = 0.045 * b;
      p.stretch = 0.08 * b;
      return p;
    }
  },
  /** Shoulder roll: big slow rolls, one shoulder after the other (one round every two beats), the arms swinging with them. */
  shoulderRoll: {
    counts: 4,
    pose(c) {
      const th = Math.PI * c.beat;
      const sR = Math.sin(th);
      const cR = Math.cos(th);
      const b = bounce(c.phase, 2);
      const p = restPose();
      p.chest = [-0.06, 0.2 * cR, 0.2 * sR];
      p.head = [-0.08, -0.1 * cR, -0.15 * sR];
      p.hips = [0, -0.06 * cR, 0.05 * sR];
      p.armR = [-0.35 * cR, -0.25, 0.55 + 0.3 * sR];
      p.armL = [0.35 * cR, 0.25, -(0.55 - 0.3 * sR)];
      p.sway = 0.05 * sR;
      p.hipsY = 0.035 * b;
      p.stretch = 0.06 * b;
      return p;
    }
  },
  /**
   * Stomp: a knee lifts through the "and", the foot slams down on the beat — a big squash, the fists
   * punching down; right foot on 1, left on 3.
   */
  stomp: {
    counts: 4,
    pose(c, o = {}) {
      const local = mod(c.beat - (o.start ?? 0), 4);
      const u = mod(local, 2);
      const n = Math.floor(local / 2) + (u > 1 ? 1 : 0); // the lift belongs to the next stomp
      // the knee comes up slowly, then the foot drives down, accelerating, to land on the beat
      const drop = u > 1.85 ? ((u - 1.85) / 0.15) ** 2 : 0;
      const up = (u > 1 ? smoothstep((u - 1.2) / 0.55) : 0) * (1 - drop);
      const since = u * c.spb;
      const slam = u < 1 ? (since <= 0.06 ? 1 : 1 - smoothstep((since - 0.06) / 0.4)) : drop;
      const p = restPose();
      p.legR = [-0.75 * up, 0, 0.15 * up];
      p.legL = [0.06 * slam, 0, -0.05];
      p.lift = 0.03 * up;
      p.stretch = -0.2 * slam + 0.06 * up;
      p.hipsY = -0.05 * slam;
      p.sway = -0.08 * up;
      p.chest = [0.15 * slam - 0.1 * up, 0, 0];
      p.head = [0.1 * slam - 0.15 * up, 0, 0];
      p.armR = [0, -0.2, 0.45 + 0.4 * up - 0.25 * slam];
      p.armL = [0, 0.2, -(0.45 + 0.4 * up - 0.25 * slam)];
      return mod(n, 2) === 0 ? p : mirrorPose(p);
    }
  },
  /** Flex: the proud button — paws out in a V, chest out, chin up; a settle on its first beat. */
  flex: {
    counts: 2,
    blend: 0.2,
    pose(c, o = {}) {
      const local = mod(c.beat - (o.start ?? 0), 2);
      const settle = local < 1 ? pop(c.phase, c.spb, { attack: 0.01, hold: 0.03, release: 0.3 }) : 0;
      const p = restPose();
      p.armL = [0, 0.25, -1.35];
      p.armR = [0, -0.25, 1.35];
      p.reachL = p.reachR = 0.1;
      p.chest = [-0.22, 0, 0];
      p.head = [-0.28, 0, 0.08];
      p.stretch = 0.05 + 0.06 * settle;
      p.hipsY = -0.03 * settle;
      return p;
    }
  },
  /**
   * Frog jump: down into a wide squat (knees out, paws between the feet), wind up, and spring up with
   * the legs splayed and the paws flung out, landing squashed on the beat — one every two beats.
   */
  frogJump: {
    counts: 4,
    pose(c, o = {}) {
      const u = mod(c.beat - (o.start ?? 0), 2) / 2;
      const T = 0.62;
      const p = restPose();
      if (u < T) {
        const cr = smoothstep(u / 0.12) * (1 + 0.25 * smoothstep((u - 0.44) / 0.12)) * (1 - smoothstep((u - 0.56) / 0.06));
        const land = u < 0.1 ? Math.sin((Math.PI * u) / 0.1) : 0;
        p.hipsY = -0.06 * cr;
        p.stretch = -0.1 * cr - 0.12 * land;
        p.legL = [-0.25 * cr, 0, -0.45 * cr];
        p.legR = [-0.25 * cr, 0, 0.45 * cr];
        p.chest = [0.22 * cr, 0, 0];
        p.head = [-0.3 * cr, 0, 0];
        p.armL = [0, 0.6 * cr, -(0.3 - 0.4 * cr)];
        p.armR = [0, -0.6 * cr, 0.3 - 0.4 * cr];
      } else {
        const a = (u - T) / (1 - T);
        const up = Math.sin(Math.PI * a);
        p.lift = 0.3 * up;
        p.stretch = 0.13 * Math.abs(Math.sin(2 * Math.PI * a));
        p.legL = [0.35 * up, 0, -0.55 * up];
        p.legR = [0.35 * up, 0, 0.55 * up];
        p.armL = [0, 0.1, -(0.3 + 1.3 * up)];
        p.armR = [0, -0.1, 0.3 + 1.3 * up];
        p.reachL = p.reachR = 0.15 * up;
        p.head = [-0.2 * up, 0, 0];
        p.chest = [-0.1 * up, 0, 0];
      }
      return p;
    }
  },
  /** Split wiggle: legs splayed wide, knees bent, the hips wiggling twice a beat, paws out wobbling; `double` sinks low and comes back up. */
  splitWiggle: {
    counts: 4,
    pose(c, o = {}) {
      const w = Math.sin(c.beat * Math.PI * 4);
      const b = bounce(c.phase, 2);
      const dip = o.double ? Math.sin((Math.PI * mod(c.beat - (o.start ?? 0), 4)) / 4) : 0;
      const p = restPose();
      p.legL = [-0.2, 0, -0.5];
      p.legR = [-0.2, 0, 0.5];
      p.hipsY = -0.045 + 0.02 * b - 0.03 * dip;
      p.stretch = -0.06 + 0.04 * b - 0.04 * dip;
      p.hips = [0, 0.28 * w, 0.08 * w];
      p.chest = [0.05, -0.15 * w, -0.06 * w];
      p.head = [-0.15 - 0.08 * b, 0.08 * w, 0.1 * Math.sin(c.beat * Math.PI)];
      p.armL = [0, 0.15, -(0.95 + 0.2 * w)];
      p.armR = [0, -0.15, 0.95 - 0.2 * w];
      p.sway = 0.05 * Math.sin(c.beat * Math.PI);
      return p;
    }
  },
  /** Waddle: a rock from foot to foot on every beat, toes out, the free foot shuffling forward; flippers stiff out at the sides, flicking. */
  waddle: {
    counts: 4,
    pose(c) {
      const s = step(c.beat, 0.55);
      const b = bounce(c.phase, 2);
      const k = pop(c.phase, c.spb, { attack: 0.05, hold: 0.04, release: 0.2 });
      const p = restPose();
      p.sway = 0.15 * s;
      p.yaw = 0.1 * s;
      p.hips = [0, 0, 0.05 * s];
      p.chest = [0, 0, -0.05 * s];
      p.head = [-0.08, 0, -0.1 * s];
      p.legL = [-0.18 * Math.max(0, s), 0, -0.08];
      p.legR = [-0.18 * Math.max(0, -s), 0, 0.08];
      p.armL = [0, -0.1, -(0.55 + 0.25 * k)];
      p.armR = [0, 0.1, 0.55 + 0.25 * k];
      p.hipsY = 0.015 * b;
      p.stretch = 0.035 * b;
      return p;
    }
  },
  /** Flap: the flippers slap down on every beat (twice a beat with `double`), the body bobbing up off them in little hops. */
  flap: {
    counts: 4,
    pose(c, o = {}) {
      const ph = o.double ? mod(c.beat * 2, 1) : c.phase;
      const k = pop(ph, o.double ? c.spb / 2 : c.spb, { attack: 0.06, hold: 0.03, release: o.double ? 0.13 : 0.25 });
      const up = 1 - k;
      const hop = Math.sin(Math.PI * c.phase);
      const p = restPose();
      p.armL = [0, -0.05, -(0.35 + 0.95 * up)];
      p.armR = [0, 0.05, 0.35 + 0.95 * up];
      p.reachL = p.reachR = 0.08 * up;
      p.lift = 0.05 * hop;
      p.stretch = 0.06 * k - 0.04 * (1 - hop) * k;
      p.head = [-0.2, 0, 0.08 * Math.sin(c.beat * Math.PI)];
      p.chest = [-0.08, 0, 0];
      p.legL = [-0.12 * Math.max(0, Math.sin(c.beat * Math.PI)), 0, -0.06];
      p.legR = [-0.12 * Math.max(0, -Math.sin(c.beat * Math.PI)), 0, 0.06];
      return p;
    }
  },

  /* ---- slow moves: half time, smooth (the podium signatures, signatures.js) ----
   * Real dancing to a fast song moves on every other beat: it arrives on the count, holds, then
   * flows to the next pose with a sine ease (no snap). The hips lead, the chest follows, then the
   * arms, the head last (LAG); the knees give in a soft groove once every two beats, never a hop.
   * Peak joint speeds stay under ~3 rad/s at Confetti Fanfare's 143.6 BPM (the fast moves above: 20+). */

  /** Bounce-sway: the weight from foot to foot every two beats with a springy knee groove, the paws swinging in arcs, the head tipping after. */
  bounceSway: {
    counts: 8,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.1, knees: 0.035, bob: 0.06 });
      const a = sided(o) * glide(lagged(c, LAG.arms), 2, 0.25);
      const wR = (1 + a) / 2; // the paw on the weight side lifts out, the other swings forward and down
      const arc = (w) => [0, 0.15 + 0.35 * (1 - w), 0.45 + 0.35 * w + 0.15 * Math.sin(Math.PI * w)];
      const [rx, ry, rz] = arc(wR);
      const [lx, ly, lz] = arc(1 - wR);
      p.armR = [rx, -ry, rz];
      p.armL = [lx, ly, -lz];
      p.head[2] += 0.06 * a;
      return p;
    }
  },
  /** Reach up: both paws float up and out into a soft V over a beat and a half, hold, and drift down over two; the weight still shifts. */
  reachUp: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 0.7, knees: 0.025 });
      const s0 = o.start ?? 0;
      const k = swell(lagged(c, LAG.arms) - s0, 4, 1.5, { rise: 1.5, hold: 0.5, fall: 2 });
      const kh = swell(lagged(c, LAG.head) - s0, 4, 1.5, { rise: 1.5, hold: 0.5, fall: 2 });
      p.armL = [0, 0.25 - 0.1 * k, -(0.45 + 0.9 * k)];
      p.armR = [0, -0.25 + 0.1 * k, 0.45 + 0.9 * k];
      p.reachL = p.reachR = 0.12 * k;
      p.head[0] += -0.2 * kh;
      p.chest[0] += -0.1 * k;
      p.stretch += 0.04 * k;
      return p;
    }
  },
  /**
   * Side clap: a relaxed step-touch in half time — the weight out to a side every two beats, and on
   * every other step (counts 3 and 7: the half-time bar's 2 and 4) the paws come together in a clap,
   * easing in over a beat, the head nodding after it.
   */
  sideClap: {
    counts: 8,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1, knees: 0.03 });
      const s0 = o.start ?? 0;
      const k = swell(c.beat - s0, 4, 2, { rise: 1, hold: 0.25, fall: 1.75 }); // shut on counts 3 and 7
      const kh = swell(lagged(c, LAG.head) - s0, 4, 2, { rise: 1, hold: 0.25, fall: 1.75 });
      p.armL = [0, 0.7 + 0.55 * k, -(0.75 + 0.1 * k)];
      p.armR = [0, -0.7 - 0.55 * k, 0.75 + 0.1 * k];
      p.chest[0] += 0.06 * k;
      p.head[0] += 0.12 * kh;
      p.stretch -= 0.02 * k;
      return p;
    }
  },
  /** Lazy sway: unhurried, the weight rolling foot to foot, the belly circling slowly (one round in four beats), paws loose and swinging. */
  lazySway: {
    counts: 8,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.2, knees: 0.025, hold: 0.15 });
      const th = (lag) => (Math.PI * lagged(c, lag)) / 2;
      p.hips[0] += 0.1 * Math.sin(th(0));
      p.hips[2] += 0.08 * Math.cos(th(0));
      p.chest[0] += -0.08 * Math.sin(th(LAG.chest));
      const a = sided(o) * glide(lagged(c, LAG.arms), 2, 0.15);
      p.armL = [0.2 * a, 0.4 + 0.2 * a, -0.55];
      p.armR = [-0.2 * a, -0.4 + 0.2 * a, 0.55];
      p.head[0] += 0.06 * Math.sin(th(LAG.head));
      return p;
    }
  },
  /** Body wave: a slow roll up the body once every four beats — the hips first, the chest after, the head last — the knees sinking into it. */
  bodyWave: {
    counts: 4,
    pose(c) {
      const w = (lag) => Math.sin((Math.PI * lagged(c, lag)) / 2);
      const p = restPose();
      p.hips = [-0.18 * w(0), 0, 0];
      p.chest = [0.24 * w(LAG.chest * 1.4), 0.05 * w(LAG.chest), 0];
      p.head = [0.2 * w(LAG.head * 1.6), 0, 0.06];
      p.hipsY = 0.025 * (w(0) - 1);
      p.legL[0] = -0.1 * (1 - w(0)) / 2;
      p.legR[0] = -0.1 * (1 - w(0)) / 2;
      p.stretch = 0.03 * w(LAG.chest);
      const a = w(LAG.arms * 1.4);
      p.armL = [0, 0.4 + 0.25 * a, -(0.5 + 0.15 * a)];
      p.armR = [0, -0.4 - 0.25 * a, 0.5 + 0.15 * a];
      return p;
    }
  },
  /** Sultry sway: the hips swing out to a side every two beats and dwell, the chest and head answering late; a paw on the hip, the other drifting by the cheek. */
  sultrySway: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.3, knees: 0.02, hold: 0.3, hips: 1.6 });
      const a = glide(lagged(c, LAG.arms), 2, 0.3) * sided(o);
      p.armL = [0, 0.9, -0.7]; // the paw on the hip
      p.armR = [0, -0.45 + 0.2 * a, 0.75 + 0.2 * a];
      return p;
    }
  },
  /** Paw arc: a paw by the cheek sweeps slowly out to the side in an arc over two beats, holds, and comes back; the other on the hip; the head follows the paw. */
  pawArc: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 0.9, knees: 0.02, hold: 0.3 });
      const s0 = o.start ?? 0;
      const k = swell(lagged(c, LAG.arms) - s0, 4, 2, { rise: 2, hold: 0.5, fall: 1.5 });
      const kh = swell(lagged(c, LAG.head) - s0, 4, 2, { rise: 2, hold: 0.5, fall: 1.5 });
      p.armR = [0, -0.75 + 0.75 * k, 1.2 + 0.2 * Math.sin(Math.PI * k)]; // by the cheek → out, over the top of an arc
      p.reachR = 0.2 * k;
      p.armL = [0, 0.9, -0.7];
      p.head[1] += -0.2 * kh;
      p.head[2] += 0.08 * kh;
      p.chest[1] += 0.08 * k;
      return p;
    }
  },
  /** Slow pop: one chest pop every two beats — eased out to land on the count, held, let go slowly — the elbows easing back, the head countering after. */
  slowPop: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 0.6, knees: 0.03, per: 4, hold: 0.2 });
      const P = { rise: 0.6, hold: 0.3, fall: 1 };
      const kh = swell(c.beat + LAG.chest / c.spb, 2, 0, P); // the hips lead
      const k = swell(c.beat, 2, 0, P);
      const ka = swell(lagged(c, LAG.arms), 2, 0, P);
      const kd = swell(lagged(c, LAG.head), 2, 0, P);
      p.hips[0] += 0.08 * kh;
      p.chest[0] += -0.3 * k;
      p.head[0] += 0.14 * kd;
      p.armL = [0.3 * ka, 0.2 - 0.25 * ka, -(0.5 + 0.15 * ka)];
      p.armR = [0.3 * ka, -0.2 + 0.25 * ka, 0.5 + 0.15 * ka];
      p.stretch += 0.05 * k;
      return p;
    }
  },
  /** Arm flow: a slow wave from one paw, across the shoulders, to the other paw and back, once in four beats; each paw traces an arc; the weight shifts under it. */
  armFlow: {
    counts: 8,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 0.7, knees: 0.025 });
      const w = (lag) => Math.sin((Math.PI * (c.beat - lag)) / 2);
      const u = (lag) => Math.cos((Math.PI * (c.beat - lag)) / 2);
      const L0 = LAG.arms / c.spb;
      p.armL = [0, 0.3 + 0.2 * u(0), -(0.95 + 0.4 * w(0))];
      p.chest[2] += 0.1 * w(0.35);
      p.head[2] += -0.1 * w(0.55);
      p.armR = [0, -0.3 - 0.2 * u(0.8), 0.95 + 0.4 * w(0.8)];
      p.reachL = 0.1 * Math.max(0, w(0)) ** 2;
      p.reachR = 0.1 * Math.max(0, w(0.8)) ** 2;
      p.sway += 0.04 * w(0.35 + L0);
      return p;
    }
  },
  /** Heavy step: a slow, proud two-step — the weight lands every two beats, deep in the knees, chest out, chin up, the arms swinging heavily after. */
  heavyStep: {
    counts: 8,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.3, knees: 0.045, hold: 0.3, bob: 0.07, step: 0.28 });
      const a = sided(o) * glide(lagged(c, LAG.arms), 2, 0.3);
      p.chest[0] += -0.16;
      p.chest[2] += 0.05 * Math.sin((Math.PI * lagged(c, LAG.chest)) / 2);
      p.head[0] += -0.16;
      p.armL = [-0.15 * a, 0.3 + 0.3 * a, -0.6];
      p.armR = [0.15 * a, -0.3 + 0.3 * a, 0.6];
      return p;
    }
  },
  /** Shoulder roll (slow): big rolls, one shoulder after the other, one round every four beats, the arms swinging with them, the weight shifting heavily. */
  rollShoulders: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 0.8, knees: 0.04, hold: 0.3 });
      const th = (lag) => (Math.PI * lagged(c, lag)) / 2;
      const sR = Math.sin(th(LAG.chest)), cR = Math.cos(th(LAG.chest));
      const sA = Math.sin(th(LAG.arms)), cA = Math.cos(th(LAG.arms));
      p.chest = [-0.1, 0.18 * cR, 0.16 * sR];
      p.head[1] += -0.08 * Math.cos(th(LAG.head));
      p.head[0] += -0.1;
      p.armR = [-0.35 * cA, -0.25, 0.55 + 0.25 * sA];
      p.armL = [0.35 * cA, 0.25, -(0.55 - 0.25 * sA)];
      return p;
    }
  },
  /**
   * Squat-rise: down into a wide frog squat (knees out, paws out low) over two beats and back up tall
   * over two, the paws floating up on the rise; the hips wiggle slowly side to side all the way.
   */
  squatRise: {
    counts: 8,
    pose(c, o = {}) {
      const d = (lag) => -groove(lagged(c, lag) - (o.start ?? 0), 4, 2); // 1 at the bottom (counts 3 and 7)
      const p = wiggle(c, o, 0.7);
      const k = d(0), ka = d(LAG.arms), kh = d(LAG.head);
      p.hipsY = -0.07 * k;
      p.stretch = -0.08 * k + 0.04 * (1 - k);
      p.legL = [-0.1 - 0.15 * k, 0, -(0.3 + 0.2 * k)];
      p.legR = [-0.1 - 0.15 * k, 0, 0.3 + 0.2 * k];
      p.chest[0] += 0.16 * d(LAG.chest);
      p.head[0] += -0.2 * kh;
      p.armL = [0, 0.4 * ka, -(0.35 + 0.75 * (1 - ka))];
      p.armR = [0, -0.4 * ka, 0.35 + 0.75 * (1 - ka)];
      return p;
    }
  },
  /** Wide wiggle: low in a wide squat, the hips wiggling slowly side to side every two beats, paws out and wobbling; `double` sinks lower and comes back up. */
  wideWiggle: {
    counts: 4,
    pose(c, o = {}) {
      const p = wiggle(c, o, 1);
      const dip = o.double ? 0.5 - 0.5 * Math.cos((Math.PI * 2 * mod(c.beat - (o.start ?? 0), 4)) / 4) : 0;
      const w = (lag) => Math.sin((Math.PI * lagged(c, lag)) / 2);
      p.hipsY = -0.05 - 0.03 * dip + 0.012 * groove(c.beat, 2);
      p.stretch = -0.06 - 0.04 * dip;
      p.legL = [-0.2, 0, -0.48];
      p.legR = [-0.2, 0, 0.48];
      p.armL = [0, 0.15, -(0.95 + 0.15 * w(LAG.arms))];
      p.armR = [0, -0.15, 0.95 - 0.15 * w(LAG.arms)];
      p.head[0] += -0.12;
      return p;
    }
  },
  /** Waddle-glide: a smooth rock from foot to foot every two beats, toes out, the body gliding with it; the flippers out at the sides, waving slowly in turn. */
  waddleGlide: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.5, knees: 0.015, hold: 0.2, hips: 0.4, step: 0.08 });
      const h = sided(o) * glide(lagged(c, LAG.chest), 2, 0.2);
      p.yaw = 0.1 * h;
      p.legL[2] -= 0.08;
      p.legR[2] += 0.08;
      const f = (lag) => Math.sin((Math.PI * lagged(c, lag)) / 2);
      p.armL = [0, -0.1, -(0.6 + 0.22 * f(LAG.arms))];
      p.armR = [0, 0.1, 0.6 - 0.22 * f(LAG.arms + 0.05)];
      return p;
    }
  },
  /** Flipper wave: both flippers rise out to the sides and sink again, once every four beats, the tips lagging, the body lifting tall with them. */
  flipperWave: {
    counts: 4,
    pose(c, o = {}) {
      const p = shiftPose(c, o, { size: 1.1, knees: 0.015, hold: 0.2, hips: 0.4 });
      const s0 = o.start ?? 0;
      const k = (lag) => 0.5 - 0.5 * Math.cos((Math.PI * (lagged(c, lag) - s0)) / 2);
      p.armL = [0, -0.05, -(0.45 + 0.75 * k(LAG.arms))];
      p.armR = [0, 0.05, 0.45 + 0.75 * k(LAG.arms + 0.04)];
      p.reachL = p.reachR = 0.08 * k(LAG.arms);
      p.stretch += 0.05 * k(LAG.chest);
      p.head[0] += -0.15 * k(LAG.head);
      return p;
    }
  },
  /** Slow turn: one full turn over eight beats, still waddling, flippers out — it eases in and out and ends facing front. */
  slowTurn: {
    counts: 8,
    pose(c, o = {}) {
      const p = MOVES.waddleGlide.pose(c, o);
      const u = mod(c.beat - (o.start ?? 0), 8) / 8;
      const a = 2 * Math.PI * easeSine((u - 0.06) / 0.88);
      p.yaw += Math.atan2(Math.sin(a), Math.cos(a)); // wrapped, so a crossfade out of it doesn't unwind the turn
      p.armL[2] -= 0.2 * Math.sin(Math.PI * u);
      p.armR[2] += 0.2 * Math.sin(Math.PI * u);
      return p;
    }
  },

  /* ---- signature styles: one unmistakable dance per character (signatures.js) ----
   * Written in the song's beats (`sb`: counts ÷ RATE), so each style keeps its own rhythm on the
   * music — the bunny on every beat, the pig's swing, the cat's syncopation, the fox's staccato,
   * the bear's stomps — and its own silhouette: paws by the cheeks, low and wide, one paw framing
   * the face, straight lines, flexes, a deep squat, stiff flippers. 12 counts = two bars of the song. */

  /**
   * Bunny hop: a little hop off every beat (down on the beat, a squash; up between), a foot kicking
   * forward on each, left and right in turn, the paws up by the cheeks bobbing with it, the head
   * tipping to the kicking side (the ears flap on their springs). `side`: the kicks go out to the
   * sides; `turn`: it faces a little left for a bar, then right.
   */
  bunnyHop: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c), n = Math.floor(b), u = b - n;
      const right = mod(n, 2) === 0;
      const kick = Math.sin(Math.PI * u) ** 2; // out in the air, back by the landing
      const g = onBeat(b, 3);
      const air = arc(u, 0.18, 0.82);
      const p = restPose();
      p.lift = 0.06 * air;
      p.hipsY = -0.04 * g;
      p.stretch = -0.09 * g + 0.07 * air;
      const tuck = -0.12 * kick;
      if (o.side) {
        p.legR = right ? [-0.2 * kick, 0, 0.42 * kick] : [tuck, 0, 0];
        p.legL = right ? [tuck, 0, 0] : [-0.2 * kick, 0, -0.42 * kick];
      } else {
        p.legR = [right ? -0.52 * kick : tuck, 0, 0];
        p.legL = [right ? tuck : -0.52 * kick, 0, 0];
      }
      const ga = onBeat(sb(c, LAG.arms), 2);
      const s = Math.sin(Math.PI * sb(c, LAG.arms)); // + while kicking right
      p.armR = armR([1.0 - 0.14 * ga + 0.06 * s, 1.05]);
      p.armL = armL([1.0 - 0.14 * ga - 0.06 * s, 1.05]);
      p.chest = [-0.06 + 0.06 * onBeat(sb(c, LAG.chest), 2), 0, -0.06 * Math.sin(Math.PI * sb(c, LAG.chest))];
      p.head = [-0.06 + 0.1 * onBeat(sb(c, LAG.head), 2), 0, -0.14 * Math.sin(Math.PI * sb(c, LAG.head))];
      p.sway = 0.05 * Math.sin(Math.PI * sb(c, LAG.chest));
      if (o.turn) p.yaw = 0.4 * Math.sin((Math.PI * sb(c, LAG.chest)) / 4);
      return p;
    }
  },
  /**
   * Pendulum: wide-legged, the whole body swinging side to side like a pendulum — out to a side on
   * every beat and hanging there — with a swing feel in the knees (a dip on the beat, a lighter one on
   * the swung "a"), the belly circling, the shoulders shimmying, the paws hanging low and flying out
   * on the far side. `clap`: claps in front of the belly on 2 and 4, then up into a V for the second
   * bar, clapping the paws in towards each other on 3 and 4.
   */
  pendulum: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c);
      const h = (lag) => glide(sb(c, lag), 1, 0.35);
      const h0 = h(0), hc = h(LAG.chest), ha = h(LAG.arms), hh = h(LAG.head);
      const dip = bump(frac(b + 0.15), 0, 0.3) + 0.5 * bump(frac(b - 2 / 3 + 0.12), 0, 0.24);
      const p = restPose();
      p.sway = 0.22 * hc;
      p.hips = [0.1 * Math.sin(Math.PI * b), 0.12 * h0, 0.2 * h0 + 0.06 * Math.cos(Math.PI * b)];
      p.chest = [0.04 - 0.08 * Math.sin(Math.PI * sb(c, LAG.chest)), -0.08 * hc + 0.06 * Math.sin(4 * Math.PI * b), -0.12 * hc];
      p.head = [0.02 + 0.06 * dip, -0.06 * hh, 0.16 * hh];
      const wR = (1 + h0) / 2;
      p.legR = [-0.12 * (1 - wR), 0, 0.3 + 0.12 * wR];
      p.legL = [-0.12 * wR, 0, -(0.3 + 0.12 * (1 - wR))];
      p.hipsY = -0.035 - 0.025 * dip;
      p.stretch = -0.03 * dip;
      let aR = [0.5 + 0.12 * (1 - ha), 0.4 + 0.25 * ha];
      let aL = [0.5 + 0.12 * (1 + ha), 0.4 - 0.25 * ha];
      if (o.clap) {
        const L = inStep(c, o, LAG.arms);
        const kc = bump(L, 0, 2) + bump(L, 2, 4); // shut on 2 and 4
        aR = mixArm(aR, [0.45, 1.2], kc);
        aL = mixArm(aL, [0.45, 1.2], kc);
        const kv = ramp(L, 3.9, 5.3) * (1 - ramp(L, 6.8, 8));
        const kin = 0.35 * (bump(L, 5.5, 6.5) + bump(L, 6.5, 7.5)); // in towards each other on 3 and 4
        aR = mixArm(aR, [1.6, kin], kv);
        aL = mixArm(aL, [1.6, kin], kv);
        const Lh = inStep(c, o, LAG.head);
        const kh = ramp(Lh, 3.9, 5.3) * (1 - ramp(Lh, 6.8, 8));
        p.head[0] += -0.22 * kh;
        p.chest[0] += -0.08 * kv;
        p.head[0] += 0.08 * kc;
      }
      p.armR = armR(aR);
      p.armL = armL(aL);
      return p;
    }
  },
  /**
   * Cat wave: slinky — a body wave rolling up from the hips every two beats, the hips popping out to
   * a side on the "and" of 2 and the "and" of 4 (syncopated) and dwelling there, the chest and head
   * answering late; narrow, the free knee bent in; a paw on the hip, the other up framing the face.
   */
  catWave: {
    counts: 12,
    pose(c) {
      const hp = (lag) => held(2 * sb(c, lag), [-1, -1, -1, 1, 1, 1, 1, -1], 0.8);
      const h0 = hp(0), hc = hp(LAG.chest), hh = hp(LAG.head);
      const w = (lag) => Math.sin(Math.PI * sb(c, lag));
      const p = restPose();
      p.hips = [-0.16 * w(0), 0.12 * h0, 0.26 * h0];
      p.sway = 0.11 * hc;
      p.chest = [0.27 * w(LAG.chest * 1.6), -0.06 * hc, -0.14 * hc];
      p.head = [0.16 * w(LAG.head * 1.8), 0.1 * hh, 0.14 * hh];
      p.hipsY = -0.02 + 0.015 * w(0);
      const wR = (1 + h0) / 2;
      p.legR = [-0.2 * (1 - wR), 0, -0.06 + 0.1 * wR];
      p.legL = [-0.2 * wR, 0, 0.06 - 0.1 * (1 - wR)];
      p.armL = [0, 0.9, -0.7];
      p.armR = armR([1.38 + 0.08 * w(LAG.arms * 1.6), 0.35]);
      p.reachR = 0.1;
      p.stretch = 0.02 * w(LAG.chest);
      return p;
    }
  },
  /**
   * Cat claw: the cat wave with a claw swipe — the paw by the cheek slashes down and across the face
   * to land on the "and" of 1 and of 3, holds, and curls back up; the head turns after it.
   */
  catClaw: {
    counts: 12,
    pose(c, o) {
      const p = MOVES.catWave.pose(c, o);
      const k = swell(sb(c, LAG.arms), 2, 0.5, { rise: 0.7, hold: 0.45, fall: 0.85 });
      const kh = swell(sb(c, LAG.head), 2, 0.5, { rise: 0.7, hold: 0.45, fall: 0.85 });
      p.armR = armR(mixArm([1.46, 0.35], [0.86, 1.05], k), 0);
      p.reachR = 0.1 + 0.08 * k;
      p.head[1] += -0.22 * kh;
      p.head[0] += 0.08 * kh;
      p.chest[1] += -0.1 * k;
      return p;
    }
  },
  /**
   * Cat spin: a body wave in, then up onto one foot — the other knee drawn up, a paw framing the face,
   * one on the hip — for one slow turn over four and a half beats, landing back into the hip sway.
   */
  catSpin: {
    counts: 12,
    pose(c, o = {}) {
      const L = inStep(c, o);
      const base = MOVES.catWave.pose(c, o);
      const k = ramp(L, 0.7, 1.6) * (1 - ramp(L, 6, 6.9));
      const s = restPose();
      s.armR = armR([1.55, 0.15]);
      s.reachR = 0.15;
      s.armL = [0, 0.9, -0.7];
      s.legL = [-0.5, 0, -0.12];
      s.legR = [0, 0, 0.02];
      s.head = [-0.16, 0, 0.12];
      s.chest = [-0.08, 0, 0.06];
      s.stretch = 0.05;
      const p = lerpPose(base, s, k);
      p.yaw = spinYaw(turnAt(L, 1.5, 6, 0.3));
      return p;
    }
  },
  /**
   * Robot: tutting, a held pose on every beat — the arms in straight lines and right angles (out
   * flat, straight forward, down, up the diagonal, boxes in front), mostly one arm moving at a time,
   * snapping over half a beat and holding; a chest pop on each beat, a sharp head tilt, the body
   * clicking a quarter-turn left and right. `big`: the boxes routine.
   */
  robot: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c);
      const seq = ROBOT[o.big ? 'boxes' : 'lines'];
      const k = (lag, f, tr = 0.6) => held(sb(c, lag), seq.map(f), tr);
      const p = restPose();
      p.armR = armR(k(LAG.arms * 0.5, (s) => TUT[s[0]]));
      p.armL = armL(k(LAG.arms * 0.5, (s) => TUT[s[1]]));
      const tilt = k(LAG.head * 0.5, (s) => s[2], 0.35);
      p.yaw = k(0, (s) => s[3], 0.45);
      const pop = swell(b, 1, 0, { rise: 0.3, hold: 0.1, fall: 0.5 });
      const popH = swell(sb(c, LAG.head * 0.5), 1, 0, { rise: 0.3, hold: 0.1, fall: 0.5 });
      p.chest = [-0.2 * pop, -0.3 * p.yaw, 0];
      p.head = [0.1 * popH - 0.04, 0.12 * tilt, 0.28 * tilt];
      p.hips = [0.06 * pop, 0, 0];
      p.legR = [0, 0, 0.12];
      p.legL = [0, 0, -0.12];
      p.hipsY = -0.012 - 0.015 * pop;
      p.stretch = 0.03 * pop;
      return p;
    }
  },
  /**
   * Fox pop: chest pops on every beat and a double on the "and" of 4, the arms held out flat like a
   * T, clicking up and down in turn (a see-saw) on each hit, the head snapping its tilt every two beats, the
   * body facing left for a bar, then right.
   */
  foxPop: {
    counts: 12,
    pose(c) {
      const b = sb(c);
      const P = { rise: 0.3, hold: 0.1, fall: 0.45 };
      const pop = swell(b, 1, 0, P) + 0.7 * swell(b, 4, 3.5, { rise: 0.3, hold: 0.05, fall: 0.4 });
      const popA = swell(sb(c, LAG.arms * 0.5), 1, 0, P);
      const flick = held(sb(c, LAG.arms * 0.5), [1, -1], 0.5);
      const p = restPose();
      p.armR = armR([0.8 + 0.3 * flick + 0.08 * popA, 0.15]);
      p.armL = armL([0.8 - 0.3 * flick + 0.08 * popA, 0.15]);
      p.chest = [-0.26 * pop, 0, 0];
      p.hips = [0.08 * pop, 0, 0];
      const tilt = held(sb(c, LAG.head * 0.5) / 2, [1, -1, 1, 0], 0.3);
      p.head = [0.12 * swell(sb(c, LAG.head * 0.5), 1, 0, P) - 0.04, 0, 0.28 * tilt];
      p.yaw = 0.35 * held(b / 4, [1, -1], 0.15);
      p.legR = [0, 0, 0.12];
      p.legL = [0, 0, -0.12];
      p.hipsY = -0.012 - 0.02 * pop;
      p.stretch = 0.04 * pop;
      return p;
    }
  },
  /**
   * Bear stomp: a big two-step — the left knee up and STOMP on 1, the right on 2, the body dropping
   * into each one — then up into a flex held over 3 and 4: a double biceps on the first bar, a crab
   * (arms down in front, hunched) on the second. Heavy, wide and slow-handed.
   */
  bearStomp: {
    counts: 12,
    pose(c) {
      const b = sb(c), q = mod(b, 4), qa = mod(sb(c, LAG.arms), 4), qc = mod(sb(c, LAG.chest), 4);
      const crab = mod(Math.floor(sb(c, LAG.arms) / 4), 2) === 1;
      const up = (x, at) => {
        const s = mod(x - at + 0.8, 4);
        return s < 0.8 ? Math.sin((Math.PI * s) / 0.8) ** 2 : 0;
      };
      const hit = (x, at) => bump(mod(x - at + 0.05, 4), 0, 0.65);
      const kL = up(q, 0), kR = up(q, 1);
      const imp = hit(q, 0) + hit(q, 1), impC = hit(qc, 0) + hit(qc, 1);
      const p = restPose();
      p.legL = [-0.55 * kL, 0, -0.16];
      p.legR = [-0.55 * kR, 0, 0.16];
      p.hipsY = -0.025 - 0.06 * imp;
      p.stretch = -0.11 * imp;
      p.sway = 0.12 * (kL - kR) + 0.05 * (hit(qc, 1) - hit(qc, 0));
      p.chest = [0.12 * impC, 0, 0.05 * (kR - kL)];
      p.head = [0.08 * hit(mod(sb(c, LAG.head), 4), 0) + 0.08 * hit(mod(sb(c, LAG.head), 4), 1) - 0.06, 0, 0];
      let aR = [0.05, 0.55 + 0.25 * up(qa, 0)];
      let aL = [0.05, 0.55 + 0.25 * up(qa, 1)];
      const kf = ramp(qa, 0.95, 2.05) * (1 - ramp(qa, 2.5, 3.5));
      const kfc = ramp(qc, 0.95, 2.05) * (1 - ramp(qc, 2.5, 3.5));
      const pump = 0.08 * bump(qa, 1.9, 2.7);
      const flex = crab ? [0 + pump, 0.85] : [1.3 + pump, -0.15];
      aR = mixArm(aR, flex, kf);
      aL = mixArm(aL, flex, kf);
      p.armR = armR(aR);
      p.armL = armL(aL);
      if (crab) {
        p.chest[0] += 0.28 * kfc;
        p.head[0] += 0.12 * kfc;
        p.stretch += -0.06 * kfc;
        p.hipsY += -0.03 * kfc;
      } else {
        p.chest[0] += -0.24 * kfc;
        p.head[0] += -0.16 * kfc;
        p.stretch += 0.06 * kfc;
        p.reachL = p.reachR = 0.08 * kf;
      }
      p.legL[2] -= 0.08 * kfc;
      p.legR[2] += 0.08 * kfc;
      return p;
    }
  },
  /**
   * Bear rock: a big guy grooving — a slow, heavy rock from side to side every two beats, deep in the
   * knees on every beat, the head nodding heavily, the paws out low and wide swinging after; a stomp
   * on each bar's 1, and over its 3 and 4 one arm curls up into a flex, showing off.
   */
  bearRock: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c), q = mod(b, 4);
      const h = (lag) => sided(o) * glide(sb(c, lag), 2, 0.3);
      const h0 = h(0), hc = h(LAG.chest), ha = h(LAG.arms);
      const p = restPose();
      p.sway = 0.17 * hc;
      p.hips = [0, 0.12 * h0, 0.16 * h0];
      p.chest = [0.06 + 0.06 * onBeat(sb(c, LAG.chest), 2), -0.1 * hc, -0.1 * hc];
      p.head = [0.12 * onBeat(sb(c, LAG.head), 2) - 0.08, 0, 0.1 * h(LAG.head)];
      p.hipsY = -0.035 - 0.03 * onBeat(b, 2);
      p.stretch = -0.05 * onBeat(sb(c, LAG.chest), 2);
      const kS = (() => {
        const s = mod(q + 0.8, 4);
        return s < 0.8 ? Math.sin((Math.PI * s) / 0.8) ** 2 : 0;
      })();
      const left = mod(Math.floor((b + 0.8) / 4), 2) === 0;
      p.legL = [-0.5 * (left ? kS : 0), 0, -0.22];
      p.legR = [-0.5 * (left ? 0 : kS), 0, 0.22];
      const qa = mod(sb(c, LAG.arms), 4);
      const kf = ramp(qa, 1.1, 2.25) * (1 - ramp(qa, 2.8, 3.95));
      p.armR = armR(mixArm([0.5 - 0.1 * ha, 0.2 * ha], [1.3 + 0.08 * bump(qa, 2.5, 3.3), -0.1], kf));
      p.armL = armL([0.5 + 0.1 * ha, -0.2 * ha]);
      p.chest[1] += 0.12 * kf;
      p.head[1] += -0.15 * kf;
      return p;
    }
  },
  /**
   * Frog swim: a deep squat with the knees right out, bouncing low on every beat; the paws swimming
   * breaststroke — reaching forward together, sweeping out round to the sides, tucking back in — one
   * stroke every two beats, the chest pushing forward with the reach, the chin up; and every two bars
   * a little leap: down deeper, up off the ground with the paws diving forward, the legs kicking out
   * behind, landing back in the squat for the next bar.
   */
  frogSwim: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c), L = inStep(c, o), La = inStep(c, o, LAG.arms);
      const g = onBeat(b, 2);
      const p = restPose();
      p.hipsY = -0.07 - 0.015 * g;
      p.stretch = -0.1 - 0.03 * g;
      p.legR = [-0.3, 0, 0.5];
      p.legL = [-0.3, 0, -0.5];
      if (o.bounce) {
        // paws on the knees, the body twisting to a side on every beat, the head bobbing after
        const tw = (lag) => Math.sin(Math.PI * sb(c, lag));
        p.armR = armR([-0.05 + 0.15 * onBeat(sb(c, LAG.arms), 2), 0.6]);
        p.armL = armL([-0.05 + 0.15 * onBeat(sb(c, LAG.arms), 2), 0.6]);
        p.hips = [0, 0.2 * tw(0), 0];
        p.chest = [0.18, -0.14 * tw(LAG.chest), 0.06 * tw(LAG.chest)];
        p.head = [-0.2, 0.1 * tw(LAG.head), 0.16 * tw(LAG.head)];
        p.hipsY -= 0.008 * g;
      } else {
        const ta = Math.PI * sb(c, LAG.arms);
        const a = [0.6 + 0.18 * Math.sin(ta), 0.8 + 0.45 * Math.cos(ta)];
        p.armR = armR(a);
        p.armL = armL(a);
        const tc = Math.PI * sb(c, LAG.chest);
        p.chest = [0.12 + 0.1 * Math.cos(tc), 0, 0];
        p.head = [-0.24 - 0.06 * Math.cos(Math.PI * sb(c, LAG.head)), 0, 0];
      }
      // the leap, once in two bars: crouch, up, land by the next downbeat
      const cr = bump(L, 5.4, 6.7);
      const air = arc(L, 6.45, 7.55);
      const wl = ramp(L, 5.9, 6.6) * (1 - ramp(L, 7.35, 8));
      const wla = ramp(La, 5.8, 6.6) * (1 - ramp(La, 7.35, 8));
      p.hipsY += -0.03 * cr;
      p.stretch += -0.04 * cr + 0.16 * air;
      p.lift = 0.13 * air;
      p.legR = [p.legR[0] + (0.08 - p.legR[0]) * wl, 0, p.legR[2] + (0.22 - p.legR[2]) * wl];
      p.legL = [p.legL[0] + (0.08 - p.legL[0]) * wl, 0, p.legL[2] + (-0.22 - p.legL[2]) * wl];
      const dive = [1.08, 1.0];
      p.armR = armR(mixArm([p.armR[2], -p.armR[1]], dive, wla));
      p.armL = armL(mixArm([-p.armL[2], p.armL[1]], dive, wla));
      p.head[0] += (-0.32 - p.head[0]) * wl;
      return p;
    }
  },
  /**
   * Waddle: a stiff penguin rock from foot to foot on every beat (the body tilting as one piece, the
   * free foot just off the ground, toes out), the stiff flippers flapping at the sides on every
   * off-beat; and in the second bar a whole spin on the spot, flippers out, quick in the middle.
   */
  penguinWaddle: {
    counts: 12,
    pose(c, o = {}) {
      const b = sb(c), L = inStep(c, o), La = inStep(c, o, LAG.arms);
      const r = (lag) => Math.cos(Math.PI * sb(c, lag)); // +1 on the right foot (even beats)
      const r0 = r(0);
      const p = restPose();
      p.sway = 0.2 * r0;
      p.chest = [-0.04, 0, -0.05 * r(LAG.chest)];
      p.head = [-0.12, 0, 0.06 * r(LAG.head)];
      p.legR = [-0.16 * Math.max(0, -r0) ** 2, 0, 0.1];
      p.legL = [-0.16 * Math.max(0, r0) ** 2, 0, -0.1];
      p.hipsY = -0.012 * onBeat(b, 2);
      const flap = 0.5 - 0.5 * Math.cos(2 * Math.PI * sb(c, LAG.arms * 0.5)); // up on the off-beat
      let a = [0.3 + 0.3 * flap, -0.6];
      if (o.spin !== false) {
        const ks = ramp(La, 3.6, 4.4) * (1 - ramp(La, 7.6, 8.4));
        a = mixArm(a, [0.78 + 0.1 * flap, -0.05], ks);
        p.yaw = spinYaw(turnAt(L, 4.25, 7.75));
        p.head[0] += -0.1 * ks;
      }
      p.armR = armR(a);
      p.armL = armL(a);
      return p;
    }
  },
  /**
   * Penguin glide: skating — leaning into a long glide to one side over two beats, the other leg
   * stretched out behind, the flippers swept back, the body turned into it; then the other way; the
   * second bar waddles and spins (as `penguinWaddle`).
   */
  penguinGlide: {
    counts: 12,
    pose(c, o = {}) {
      const L = inStep(c, o);
      const base = MOVES.penguinWaddle.pose(c, o);
      const w = 1 - ramp(L, 3.3, 4.3);
      if (w <= 0) return base;
      const g = (lag) => glide(sb(c, lag) - (o.start ?? 0) / RATE, 2, 0.35);
      const g0 = g(0), gc = g(LAG.chest), ga = g(LAG.arms);
      const s = restPose();
      s.sway = 0.2 * g0;
      s.yaw = 0.35 * gc;
      s.hips = [0, 0.1 * g0, 0.12 * g0];
      s.chest = [0.16, -0.08 * gc, -0.08 * gc];
      s.head = [-0.08, -0.1 * g(LAG.head), 0.12 * g(LAG.head)];
      const wR = (1 + g0) / 2;
      s.legR = [0.1 * (1 - wR), 0, 0.06 + 0.4 * (1 - wR)];
      s.legL = [0.1 * wR, 0, -(0.06 + 0.4 * wR)];
      s.hipsY = -0.045;
      const fl = [0.5 + 0.1 * ga, -0.55];
      s.armR = armR(fl);
      s.armL = armL([0.5 - 0.1 * ga, -0.55]);
      return lerpPose(base, s, w);
    }
  },
  /**
   * Strike: the routine's button, slow — the crossfade eases into a pose over a beat and a half and it
   * holds, breathing. `look`: cheer (a soft V), shrug, pose (the cat's: a paw on the hip, one up),
   * point, flex, frog (a wide squat, paws out), flipper (flippers out, chin up).
   */
  strike: {
    counts: 4,
    blend: 1.5,
    pose(c, o = {}) {
      const p = restPose();
      const br = (lag) => Math.sin((Math.PI * lagged(c, lag)) / 2);
      const look = o.look ?? 'point';
      if (look === 'cheer') {
        p.armL = [0, 0.15, -1.3];
        p.armR = [0, -0.15, 1.3];
        p.reachL = p.reachR = 0.12;
        p.head = [-0.2, 0, 0.12];
        p.chest = [-0.08, 0, 0];
      } else if (look === 'shrug') {
        p.armL = [0, -0.35, -0.85];
        p.armR = [0, 0.35, 0.85];
        p.head = [0.04, 0, 0.26];
        p.stretch = -0.04;
      } else if (look === 'flex') {
        p.armL = [0, 0.25, -1.35];
        p.armR = [0, -0.25, 1.35];
        p.reachL = p.reachR = 0.1;
        p.chest = [-0.22, 0, 0];
        p.head = [-0.26, 0, 0.08];
        p.stretch = 0.05;
      } else if (look === 'frog') {
        p.legL = [-0.25, 0, -0.5];
        p.legR = [-0.25, 0, 0.5];
        p.hipsY = -0.06;
        p.stretch = -0.07;
        p.armL = [0, 0.2, -1.2];
        p.armR = [0, -0.2, 1.2];
        p.chest = [0.12, 0, 0];
        p.head = [-0.26, 0, 0];
      } else if (look === 'flipper') {
        p.armL = [0, -0.05, -1.15];
        p.armR = [0, 0.05, 1.15];
        p.reachL = p.reachR = 0.08;
        p.head = [-0.3, 0, -0.08];
        p.chest = [-0.1, 0, 0];
        p.stretch = 0.05;
      } else if (look === 'bunny') {
        // paws up by the cheeks, one foot kicked up behind, the head tipped: cute
        p.armR = armR([1.0, 1.1]);
        p.armL = armL([1.0, 1.1]);
        p.legR = [0.45, 0, 0.05];
        p.legL = [0, 0, -0.04];
        p.head = [0.06, 0.1, 0.26];
        p.chest = [0.06, 0, 0.06];
        p.sway = 0.06;
      } else if (look === 'robot') {
        // a freeze: one arm out flat, the other straight forward (a right angle), the head snapped over
        p.armR = armR(TUT.out);
        p.armL = armL(TUT.fwd);
        p.head = [0, 0.15, 0.3];
        p.chest = [-0.12, 0, 0];
        p.yaw = 0.3;
        p.legR = [0, 0, 0.12];
        p.legL = [0, 0, -0.12];
      } else if (look === 'penguin') {
        // proud: tall, chest out, chin up, the flippers swept back and down
        p.armR = armR([0.4, -0.6]);
        p.armL = armL([0.4, -0.6]);
        p.chest = [-0.2, 0, 0];
        p.head = [-0.34, 0, 0.06];
        p.stretch = 0.08;
        p.legR = [0, 0, 0.12];
        p.legL = [0, 0, -0.12];
      } else {
        // point (and the cat's pose, the hip cocked): one paw up the diagonal, the other on the hip
        p.armR = [0, -0.1, 1.55];
        p.reachR = 0.2;
        p.armL = [0, 0.9, -0.7];
        p.head = [-0.22, -0.28, 0];
        p.chest = [-0.1, 0.12, 0];
        p.sway = -0.08;
        if (look === 'pose') {
          p.hips = [0, -0.15, -0.18];
          p.chest[2] = 0.12;
          p.head[2] = 0.15;
        }
      }
      // breathing: a slow rise and fall, the head settling after
      p.stretch += 0.02 * br(0);
      p.hipsY += 0.008 * (br(0) - 1);
      p.head[2] += 0.04 * br(LAG.head);
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
  let p = m.pose(c, { amp, mirror, ...o });
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
