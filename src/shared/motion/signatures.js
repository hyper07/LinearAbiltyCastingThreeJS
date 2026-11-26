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
 * A signature runs 8 bars (32 counts: four 8-count phrases — the hook, an answer, a variation,
 * and a phrase that ends on the character's own button), then again as one of four variants
 * (a different answer here, a mirror or a size there): the variant is the cycle number, so it
 * never loops the same two bars, and never differs between browsers.
 */
import { MOVES, routine, rng, beatAt, restPose, lerpPose, clampPlushPose, smoothstep, PLUSH_LIMITS } from './dance.js';

/** Counts in a signature's cycle (8 bars of 4/4). */
export const CYCLE = 32;
/** How many variants a signature plays in turn. */
export const VARIANTS = 4;

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
    dance: 'springy hops and bounces, ears flying: little hops on every beat, big ones every two, side hops, a raise-the-roof',
    ears: 1.6,
    tail: 1.2,
    phrases: (r, v) => [
      [{ move: 'hop', counts: 4 }, { move: 'hop', counts: 4, big: true }],
      [{ move: 'hop', counts: 4, side: true, mirror: v % 2 === 1 }, { move: v ? pick(r, ['roof', 'clap', 'roof']) : 'roof', counts: 4, amp: size(r, v) }],
      [{ move: 'hop', counts: 4, big: true }, { move: 'hop', counts: 4, side: true, mirror: v % 2 === 0 }],
      [{ move: v === 2 ? 'bounce' : 'hop', counts: 4, amp: v === 2 ? 1.4 : 1 }, { move: 'hop', counts: 2, big: true }, { move: 'hit', counts: 2 }]
    ]
  },
  pig: {
    who: 'Peaches, Late Braker',
    dance: 'a cheerful side-to-side shimmy and claps, unbothered: shimmies, step-claps on 2 and 4, a shimmy down, a shrug to finish',
    ears: 0.8,
    tail: 1.4,
    phrases: (r, v) => [
      [{ move: 'shimmy', counts: 4 }, { move: 'shimmy', counts: 4, mirror: true }],
      [{ move: 'stepClap', counts: 8, amp: size(r, v) }],
      [{ move: 'shimmy', counts: 4, double: true, mirror: v % 2 === 1 }, { move: v ? pick(r, ['clap', 'stepClap']) : 'clap', counts: 4 }],
      [{ move: 'stepClap', counts: 4 }, { move: 'shimmy', counts: 2 }, { move: 'shrug', counts: 2 }]
    ]
  },
  cat: {
    who: 'Mochi, Corner Queen',
    dance: 'a sassy body roll with paw flicks and a hip sway, a paw on the hip, ending on a pose',
    ears: 0.7,
    tail: 1.6,
    phrases: (r, v) => [
      [{ move: 'bodyRoll', counts: 4 }, { move: 'pawFlick', counts: 4 }],
      [{ move: 'hipSway', counts: 4, mirror: v % 2 === 1 }, { move: 'hipSway', counts: 4, mirror: v % 2 === 0 }],
      [{ move: v === 3 ? 'hipSway' : 'bodyRoll', counts: 4, amp: size(r, v) }, { move: 'pawFlick', counts: 4, mirror: true }],
      [{ move: 'hipSway', counts: 4 }, { move: 'pawFlick', counts: 2 }, { move: 'hit', counts: 2 }]
    ]
  },
  fox: {
    who: 'Pip, Straight-line Pip',
    dance: 'the chest-pop routine (four pops in two beats, then a sway and a clap) with arm pumps, ending on a point',
    ears: 1,
    tail: 1.3,
    phrases: (r, v) => [
      [{ move: 'popBurst', counts: 4 }, { move: 'popBurst', counts: 4 }],
      [{ move: 'chestPop', counts: 4, double: v !== 1 }, { move: 'armPump', counts: 4, amp: size(r, v) }],
      [{ move: 'popBurst', counts: 4 }, { move: 'armPump', counts: 4, mirror: true }],
      [{ move: 'chestPop', counts: 4, double: v >= 2 }, { move: 'armPump', counts: 2, mirror: v % 2 === 1 }, { move: 'hit', counts: 2 }]
    ]
  },
  bear: {
    who: 'Toffee, The Wall',
    dance: 'a heavy, slow, proud two-step in half time, big shoulder rolls, a stomp, and a flex',
    ears: 0.6,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'proudStep', counts: 8 }],
      [{ move: 'shoulderRoll', counts: 4, amp: size(r, v) }, { move: 'shoulderRoll', counts: 4, mirror: true }],
      [{ move: 'proudStep', counts: 4 }, { move: 'stomp', counts: 4, mirror: v % 2 === 1 }],
      [{ move: 'shoulderRoll', counts: 4 }, { move: 'stomp', counts: 2 }, { move: 'flex', counts: 2 }]
    ]
  },
  frog: {
    who: 'Pickle, Kerb Hopper',
    dance: 'froggy knee-bent jumps from a wide squat and a splayed-leg wiggle, sinking low',
    ears: 0.5,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'frogJump', counts: 4 }, { move: 'frogJump', counts: 4 }],
      [{ move: 'splitWiggle', counts: 4, amp: size(r, v) }, { move: 'splitWiggle', counts: 4, double: true }],
      [{ move: 'frogJump', counts: 4 }, { move: v ? pick(r, ['splitWiggle', 'clap']) : 'splitWiggle', counts: 4 }],
      [{ move: 'splitWiggle', counts: 4, double: v % 2 === 1 }, { move: 'frogJump', counts: 2 }, { move: 'hit', counts: 2 }]
    ]
  },
  penguin: {
    who: 'Pebble, Rain Dancer',
    dance: 'a waddle shuffle with flipper flaps and a spin',
    ears: 0.5,
    tail: 1.2,
    phrases: (r, v) => [
      [{ move: 'waddle', counts: 4 }, { move: 'waddle', counts: 4, mirror: true }],
      [{ move: 'flap', counts: 4, double: v % 2 === 1 }, { move: 'waddle', counts: 4, amp: size(r, v) }],
      [{ move: 'waddle', counts: 4, mirror: v >= 2 }, { move: 'flap', counts: 4, double: v % 2 === 0 }],
      [{ move: 'waddle', counts: 4 }, { move: 'spin', counts: 2 }, { move: 'hit', counts: 2 }]
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
 * On top of the signature, by podium place: the winner throws the V-arms cheer and jumps at
 * every bar's start; 2nd one paw up and a smaller hop every other bar; 3rd a small V and a little
 * hop on the bars between. `every`/`at`: which bars; H: jump height (rider units); raise: the
 * paws' raise (≤ 1.7, the plush limit: a V, never straight up); w: how much of the arms it takes.
 */
export const FLOURISH = {
  1: { every: 1, at: 0, H: 0.3, arms: 'both', raise: 1.65, reach: 0.25, w: 1, squash: 0.16 },
  2: { every: 2, at: 0, H: 0.15, arms: 'one', raise: 1.6, reach: 0.2, w: 0.85, squash: 0.1 },
  3: { every: 2, at: 1, H: 0.07, arms: 'both', raise: 1.25, reach: 0.1, w: 0.6, squash: 0.07 }
};

/**
 * The flourish at a beat (counted from the dance's start): { pose, arms (0..1), up (0..1, in the
 * air) } or null between them. The jump: a crouch just before the bar line, off the ground on the
 * downbeat with the paws thrown up (the hit on 1), down by beat 2 with a squash, the paws back by 2½.
 */
export function flourish(local, place) {
  const F = FLOURISH[place];
  if (!F) return null;
  const bar = Math.floor(local / 4);
  const bp = local - bar * 4;
  const on = (b) => mod(b - F.at, F.every) === 0;
  let j;
  if (bp >= 3.7 && on(bar + 1)) j = bp - 4;
  else if (bp < 1.6 && on(bar)) j = bp;
  else return null;
  const arms = j < 0 ? smoothstep((j + 0.3) / 0.3) : j < 1 ? 1 : 1 - smoothstep((j - 1) / 0.6);
  const p = restPose();
  let up = 0;
  if (j < 0.06) {
    const k = j > -0.28 ? Math.sin((Math.PI * (j + 0.28)) / 0.34) : 0; // the crouch
    p.hipsY = -0.04 * k;
    p.stretch = -F.squash * 0.8 * k;
  } else if (j < 0.86) {
    const a = (j - 0.06) / 0.8;
    up = Math.sin(Math.PI * a);
    p.lift = F.H * up;
    p.stretch = 0.12 * Math.abs(Math.sin(2 * Math.PI * a)) * Math.min(1, F.H / 0.15);
    p.legL = [-0.45 * up, 0, -0.06 * up];
    p.legR = [-0.35 * up, 0, 0.06 * up];
  } else if (j < 1.2) {
    const k = Math.sin((Math.PI * (j - 0.86)) / 0.34); // the landing
    p.hipsY = -0.03 * k;
    p.stretch = -F.squash * k;
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
  return { pose: p, arms: arms * F.w, up, both: F.arms === 'both' };
}

/** The signature with a flourish on top: the arms and head taken over, the hop added, the legs tucked in the air. */
export function withFlourish(base, f) {
  if (!f) return base;
  const out = lerpPose(base, base, 0); // a copy
  const take = f.both ? ['armL', 'armR', 'head', 'chest'] : ['armR', 'head', 'chest'];
  const w = f.arms;
  for (const j of take) for (let i = 0; i < 3; i++) out[j][i] = base[j][i] + (f.pose[j][i] - base[j][i]) * (j === 'chest' ? w * 0.6 : w);
  out.reachR = base.reachR + (f.pose.reachR - base.reachR) * w;
  if (f.both) out.reachL = base.reachL + (f.pose.reachL - base.reachL) * w;
  for (const j of ['legL', 'legR']) for (let i = 0; i < 3; i++) out[j][i] = base[j][i] + (f.pose[j][i] - base[j][i]) * f.up;
  out.lift = Math.max(base.lift, f.pose.lift);
  out.stretch = base.stretch + f.pose.stretch;
  out.hipsY = base.hipsY + f.pose.hipsY;
  return out;
}

/* ------------------------------------------------------------------ the podium dance */

/**
 * A character's podium dance: its signature, from `start` (a beat; rounded down to a bar line so
 * the moves keep to the music's bars), with its place's flourish (1, 2, 3); any other place (a
 * finisher off the podium) just claps along, small; place 0 the signature alone.
 * `sample(beat)` → a pose inside the plush limits.
 */
export function podiumDance(id, { place = 0, start = 0, bpm = 143.6, limits = PLUSH_LIMITS } = {}) {
  const from = 4 * Math.floor(start / 4);
  const offPodium = place > 3;
  const shows = new Map();
  const show = (cycle) => {
    const v = mod(cycle, VARIANTS);
    if (!shows.has(v)) shows.set(v, routine(offPodium ? [{ move: 'clap', counts: 4, amp: 0.7 }] : signatureSteps(id, v), { limits: null }));
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
      if (!offPodium) p = withFlourish(p, flourish(local, place));
      return limits ? clampPlushPose(p, limits) : p;
    }
  };
}
