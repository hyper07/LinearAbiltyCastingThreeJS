/**
 * The crew's signature dances — one per plush species, each an original routine from the
 * generic moves in dance.js that reads as that character — and the podium places' flourishes
 * on top. Pure (no three.js, no Math.random): the species, the place and the start beat decide
 * every pose, so every browser in a room dances the same thing with no animation traffic.
 *
 *   const d = podiumDance('bunny', { place: 1, start: 0, bpm: 143.6 });
 *   const pose = d.sample(beats);            // beats: where the song is, in beats
 *   applyPlushPose(rig, pose);
 *
 * Slow and smooth, like real dancing to a fast song: everything moves in half time (Podium Party
 * is 143.6 BPM; the dances feel it at ~72, the big gestures at ~36) — a pose arrives on the count,
 * holds, then flows to the next with a sine ease; the hips lead, the chest, arms and head follow
 * 90–200 ms behind; the knees give in a soft groove, never a hop (only the winner hops, once in
 * two bars). Peak joint speeds stay under ~3 rad/s (tests/unit/motion-signatures.test.mjs).
 *
 * A signature runs 8 bars (32 counts: four 8-count phrases — the hook, an answer, a variation,
 * and a phrase that ends on the character's own button), then again as one of four variants
 * (a different answer here, a mirror or a size there): the variant is the cycle number, so it
 * never loops the same two bars, and never differs between browsers.
 */
import { MOVES, routine, rng, beatAt, restPose, lerpPose, clampPlushPose, easeSine, PLUSH_LIMITS } from './dance.js';

/** Counts in a signature's cycle (8 bars of 4/4). */
export const CYCLE = 32;
/** How many variants a signature plays in turn. */
export const VARIANTS = 4;
/** Crossfade between a signature's moves, in beats (slow: the change flows over a beat and a half). */
export const BLEND = 1.5;

const mod = (a, n) => ((a % n) + n) % n;
const pick = (r, list) => list[Math.floor(r() * list.length)];
/** A size between 0.9 and 1.1 (variants only: the first cycle is the signature as written). */
const size = (r, v) => (v ? 0.9 + r() * 0.2 : 1);

/**
 * By species: who it is (Kickrani's crew, src/city/crew.js), what the dance is, how floppy the ears
 * and the tail are (`ears`, `tail`: spring gains), and its phrases — `(r, v) => [[steps]…]`, four
 * 8-count phrases; `r` a seeded random, `v` the variant (0: as written). The first phrase's opening
 * step and the last phrase's button never vary, so cycles join without a jump.
 */
export const SIGNATURES = {
  bunny: {
    who: 'Mallow, The Bounce',
    dance: 'a gentle bounce-sway from foot to foot, paws swinging in arcs, ears flowing; the paws float up into a soft V and drift down; a cheer to finish',
    ears: 1.6,
    tail: 1.2,
    phrases: (r, v) => [
      [{ move: 'bounceSway', counts: 8 }],
      [{ move: 'bounceSway', counts: 4, mirror: v % 2 === 1 }, { move: 'reachUp', counts: 4, amp: size(r, v) }],
      [{ move: 'reachUp', counts: 4 }, { move: v ? pick(r, ['bounceSway', 'lazySway']) : 'bounceSway', counts: 4, amp: v ? 1.1 : 1, mirror: v >= 2 }],
      [{ move: 'bounceSway', counts: 4 }, { move: 'strike', counts: 4, look: 'cheer' }]
    ]
  },
  pig: {
    who: 'Peaches, Late Braker',
    dance: 'a relaxed side-step with a clap on the half-time 2 and 4, a lazy sway with the belly circling, unbothered; a shrug to finish',
    ears: 0.8,
    tail: 1.4,
    phrases: (r, v) => [
      [{ move: 'sideClap', counts: 8 }],
      [{ move: 'lazySway', counts: 8, amp: size(r, v) }],
      [{ move: 'sideClap', counts: 4, mirror: v % 2 === 1 }, { move: v ? pick(r, ['lazySway', 'sideClap']) : 'lazySway', counts: 4 }],
      [{ move: 'sideClap', counts: 4 }, { move: 'strike', counts: 4, look: 'shrug' }]
    ]
  },
  cat: {
    who: 'Mochi, Corner Queen',
    dance: 'a slow, sultry body wave and hip sway, a paw on the hip, the other sweeping out from the cheek; a pose to end',
    ears: 0.7,
    tail: 1.6,
    phrases: (r, v) => [
      [{ move: 'bodyWave', counts: 4 }, { move: 'sultrySway', counts: 4 }],
      [{ move: 'sultrySway', counts: 4, mirror: v % 2 === 1 }, { move: 'pawArc', counts: 4, mirror: v % 2 === 1 }],
      [{ move: v === 3 ? 'sultrySway' : 'bodyWave', counts: 4, amp: size(r, v) }, { move: 'pawArc', counts: 4, mirror: v % 2 === 0 }],
      [{ move: 'sultrySway', counts: 4 }, { move: 'strike', counts: 4, look: 'pose' }]
    ]
  },
  fox: {
    who: 'Pip, Straight-line Pip',
    dance: 'slow chest pops, one every two beats, and a smooth arm wave rippling paw to paw; a point to end',
    ears: 1,
    tail: 1.3,
    phrases: (r, v) => [
      [{ move: 'slowPop', counts: 8 }],
      v === 1 ? [{ move: 'slowPop', counts: 4 }, { move: 'armFlow', counts: 4 }] : [{ move: 'armFlow', counts: 8, amp: size(r, v) }],
      [{ move: 'slowPop', counts: 4, amp: size(r, v) }, { move: 'armFlow', counts: 4, mirror: true }],
      [{ move: 'slowPop', counts: 4 }, { move: 'strike', counts: 4, look: 'point' }]
    ]
  },
  bear: {
    who: 'Toffee, The Wall',
    dance: 'a heavy, slow, proud two-step deep in the knees, big slow shoulder rolls; a flex to finish',
    ears: 0.6,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'heavyStep', counts: 8 }],
      [{ move: 'rollShoulders', counts: 4, amp: size(r, v) }, { move: 'rollShoulders', counts: 4, mirror: true }],
      [{ move: 'heavyStep', counts: 4 }, { move: 'rollShoulders', counts: 4, mirror: v % 2 === 1 }],
      [{ move: 'rollShoulders', counts: 4 }, { move: 'strike', counts: 4, look: 'flex' }]
    ]
  },
  frog: {
    who: 'Pickle, Kerb Hopper',
    dance: 'a slow, wide squat-and-rise, the paws floating up as it rises, and a low splayed-leg wiggle that sinks and comes back',
    ears: 0.5,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'squatRise', counts: 8 }],
      [{ move: 'wideWiggle', counts: 4, amp: size(r, v) }, { move: 'wideWiggle', counts: 4, double: true }],
      [{ move: 'squatRise', counts: 4 }, { move: v ? pick(r, ['wideWiggle', 'reachUp']) : 'wideWiggle', counts: 4, mirror: v % 2 === 1 }],
      [{ move: 'wideWiggle', counts: 4, double: v % 2 === 1 }, { move: 'strike', counts: 4, look: 'frog' }]
    ]
  },
  penguin: {
    who: 'Pebble, Rain Dancer',
    dance: 'a smooth waddle-glide from foot to foot, flipper waves, and a slow full turn',
    ears: 0.5,
    tail: 1.2,
    phrases: (r, v) => [
      [{ move: 'waddleGlide', counts: 8 }],
      [{ move: 'flipperWave', counts: 4 }, { move: 'waddleGlide', counts: 4, amp: size(r, v) }],
      [{ move: 'slowTurn', counts: 8, mirror: v >= 2 }],
      [{ move: v % 2 ? 'flipperWave' : 'waddleGlide', counts: 4 }, { move: 'strike', counts: 4, look: 'flipper' }]
    ]
  }
};

/** The species with a signature (Kickrani's crew). */
export const SIGNATURE_IDS = Object.keys(SIGNATURES);

/** A number from a species id (FNV-1a): the seed of its variants. */
export function idSeed(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** A species' steps for one cycle (`cycle` 0, 1, 2…: variant cycle mod VARIANTS). Unknown species dance the fox's. */
export function signatureSteps(id, cycle = 0) {
  const sig = SIGNATURES[id] ?? SIGNATURES.fox;
  const v = mod(cycle, VARIANTS);
  const r = rng((idSeed(SIGNATURES[id] ? id : 'fox') + v * 7919) >>> 0);
  const steps = sig.phrases(r, v).flat();
  for (const s of steps) if (!MOVES[s.move]) throw new Error(`signature ${id}: unknown move ${s.move}`);
  return steps;
}

/* ------------------------------------------------------------------ place flourishes */

/**
 * On top of the signature, by podium place, once every two bars (`at`: on the first bar or the
 * second): the winner raises its arms slowly into a V — up over a beat and a half to arrive on the
 * downbeat, held two beats, down over a beat and a half — with one soft hop as they arrive (the
 * only hop in the dances); 2nd raises one paw the same way, no hop; 3rd a small V on the bars
 * between. raise: the paws' raise (≤ 1.7, the plush limit: a V, never straight up); w: how much
 * of the arms it takes; hop: the hop's height (rider units).
 */
export const FLOURISH = {
  1: { every: 2, at: 0, arms: 'both', raise: 1.65, reach: 0.25, w: 1, hop: 0.12 },
  2: { every: 2, at: 0, arms: 'one', raise: 1.55, reach: 0.2, w: 0.85, hop: 0 },
  3: { every: 2, at: 1, arms: 'both', raise: 1.25, reach: 0.1, w: 0.6, hop: 0 }
};
/** The flourish's timing in beats from its downbeat: up from −RISE, held to HOLD, down by HOLD + FALL. */
const RISE = 1.5, HOLD = 2, FALL = 1.5;

/** The raise at `j` beats from the flourish's downbeat: 0..1 (sine ease up, held, sine ease down). */
const raiseAt = (j) => (j < -RISE || j > HOLD + FALL ? 0 : j < 0 ? easeSine((j + RISE) / RISE) : j < HOLD ? 1 : 1 - easeSine((j - HOLD) / FALL));

/**
 * The flourish at a beat (counted from the dance's start): { pose, arms (0..1), look (0..1, the
 * head and chest, a little behind the arms), up (0..1, in the air), both } or null between them.
 */
export function flourish(local, place, bpm = 143.6) {
  const F = FLOURISH[place];
  if (!F) return null;
  const per = 4 * F.every;
  let j = mod(local - 4 * F.at, per);
  if (j > per - RISE) j -= per;
  const lag = (0.2 * bpm) / 60; // the head and chest follow the paws up, 200 ms behind
  if (j > HOLD + FALL + lag) return null;
  const arms = raiseAt(j);
  const look = raiseAt(j - lag);
  const p = restPose();
  let up = 0;
  if (F.hop) {
    // a soft crouch through the beat before, off the ground on the downbeat as the paws arrive, a slow landing
    if (j > -1 && j < 0) {
      const k = Math.sin(Math.PI * (j + 1));
      p.hipsY = -0.035 * k;
      p.stretch = -0.06 * k;
    } else if (j >= 0 && j < 1) {
      up = Math.sin(Math.PI * j);
      p.lift = F.hop * up;
      p.stretch = 0.06 * up;
    } else if (j >= 1 && j < 2) {
      const k = Math.sin(Math.PI * (j - 1));
      p.hipsY = -0.03 * k;
      p.stretch = -0.05 * k;
    }
    // the legs tuck a little after the take-off and let go before the landing
    const tuck = j >= 0 && j < 1 ? Math.sin(Math.PI * j) ** 2 : 0;
    p.legL = [-0.35 * tuck, 0, -0.05 * tuck];
    p.legR = [-0.28 * tuck, 0, 0.05 * tuck];
  }
  p.armR = [0, -0.1, F.raise];
  p.reachR = F.reach;
  if (F.arms === 'both') {
    p.armL = [0, 0.1, -F.raise];
    p.reachL = F.reach;
    p.head = [-0.22, 0, 0];
    p.chest = [-0.1, 0, 0];
  } else {
    p.head = [-0.18, -0.15, 0.1]; // looking up at the paw
    p.chest = [-0.06, 0.08, 0];
  }
  return { pose: p, arms: arms * F.w, look: look * F.w, up, hop: !!F.hop, both: F.arms === 'both' };
}

/** The signature with a flourish on top: the arms taken over, then the head and chest; the hop added, the legs tucked in the air. */
export function withFlourish(base, f) {
  if (!f) return base;
  const out = lerpPose(base, base, 0); // a copy
  const mix = (j, w) => {
    for (let i = 0; i < 3; i++) out[j][i] = base[j][i] + (f.pose[j][i] - base[j][i]) * w;
  };
  mix('armR', f.arms);
  if (f.both) mix('armL', f.arms);
  mix('head', f.look);
  mix('chest', f.look * 0.6);
  out.reachR = base.reachR + (f.pose.reachR - base.reachR) * f.arms;
  if (f.both) out.reachL = base.reachL + (f.pose.reachL - base.reachL) * f.arms;
  if (f.hop) {
    for (const j of ['legL', 'legR']) for (let i = 0; i < 3; i++) out[j][i] = base[j][i] + f.pose[j][i];
    out.lift = Math.max(base.lift, f.pose.lift);
    out.stretch = base.stretch + f.pose.stretch;
    out.hipsY = base.hipsY + f.pose.hipsY;
  }
  return out;
}

/* ------------------------------------------------------------------ the podium dance */

/**
 * A character's podium dance: its signature, from `start` (a beat; rounded down to a bar line so
 * the moves keep to the music's bars), with its place's flourish (1, 2, 3); any other place (a
 * finisher off the podium) just side-claps along, small; place 0 the signature alone.
 * `sample(beat)` → a pose inside the plush limits.
 */
export function podiumDance(id, { place = 0, start = 0, bpm = 143.6, limits = PLUSH_LIMITS } = {}) {
  const from = 4 * Math.floor(start / 4);
  const offPodium = place > 3;
  const shows = new Map();
  const show = (cycle) => {
    const v = mod(cycle, VARIANTS);
    if (!shows.has(v)) shows.set(v, routine(offPodium ? [{ move: 'sideClap', counts: 8, amp: 0.7 }] : signatureSteps(id, v), { blend: BLEND, limits: null }));
    return shows.get(v);
  };
  return {
    id,
    place,
    start: from,
    signature: SIGNATURES[id] ?? SIGNATURES.fox,
    /** Steps of the cycle playing at `beat` (for labels and tests). */
    steps(beat) {
      return show(Math.floor((beat - from) / CYCLE)).steps;
    },
    /** The step playing at `beat`. */
    at(beat) {
      const local = beat - from;
      return show(Math.floor(local / CYCLE)).at(mod(local, CYCLE));
    },
    sample(beat) {
      const local = beat - from;
      const cycle = Math.floor(local / CYCLE);
      const c = beatAt(mod(local, CYCLE), bpm);
      let p = show(cycle).sample(c);
      if (!offPodium) p = withFlourish(p, flourish(local, place, bpm));
      return limits ? clampPlushPose(p, limits) : p;
    }
  };
}
