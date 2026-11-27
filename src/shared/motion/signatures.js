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
 * Seven different dances, not one dance seven times: each character has its own style (the
 * signature-style moves in dance.js), with its own signature move, rhythm and silhouette —
 *   Mallow (bunny)   hop kicks on every beat, paws by the cheeks, ears flapping; narrow, bouncing up and down
 *   Peaches (pig)    a wide pendulum swing with a swing feel, belly circles, claps, then a V clapping overhead
 *   Mochi (cat)      body waves, hip pops on the "and" (syncopated), a claw swipe framing the face, a slow spin on one foot
 *   Pip (fox)        the robot: a held pose on every beat, arms in straight lines and right angles, chest pops, head snaps
 *   Toffee (bear)    stomp-and-flex: a big two-step stomp, a double biceps then a crab, a slow heavy rock
 *   Pickle (frog)    a deep knees-out squat, paws swimming breaststroke, a little leap every two bars
 *   Pebble (penguin) a stiff waddle with flapping flippers, skating glides, a whole spin every two bars
 * (tests/unit/motion-signatures.test.mjs measures how far apart every pair is, bar by bar.)
 *
 * The pace: three dance counts to every two beats of the song (RATE 1.5, from a bar line), and the
 * styles are written in the song's own beats, so the hits land on Confetti Fanfare's 143.6 BPM; poses
 * ease (sine) and hold, the hips lead and the chest, arms and head follow 90–200 ms behind. Peak joint
 * speeds stay under 6 rad/s (the fox's robot hits under 8.5).
 *
 * A signature runs 8 bars of the song (48 counts: four 12-count phrases of two bars — the hook, an
 * answer, a variation, and a phrase that ends on the character's own button), then again as one of
 * four variants (a mirror, a size, another answer): the variant is the cycle number, so it never
 * loops the same two bars, and never differs between browsers.
 */
import { MOVES, routine, rng, beatAt, restPose, lerpPose, clampPlushPose, easeSine, PLUSH_LIMITS, RATE } from './dance.js';

/** Counts in a signature's cycle: four 12-count phrases, each two bars of the song (8 bars in all). */
export const CYCLE = 48;
/** How many variants a signature plays in turn. */
export const VARIANTS = 4;
/** Crossfade between a signature's moves, in dance counts (the change flows over a count and a half: a beat of the song). */
export const BLEND = 1.5;
/** How fast the dances play: dance counts per beat of the song (1.5: three counts to every two beats; dance.js). */
export { RATE };

const mod = (a, n) => ((a % n) + n) % n;

/**
 * By species: who it is (Kickrani's crew, games/g_cv2yrhrpv2/crew.js), what the dance is, how floppy the ears
 * and the tail are (`ears`, `tail`: spring gains), and its phrases — `(r, v) => [[steps]…]`, four
 * 12-count phrases (two bars of the song each); `r` a seeded random, `v` the variant (0: as written). The first phrase's opening
 * step and the last phrase's button never vary, so cycles join without a jump.
 */
export const SIGNATURES = {
  bunny: {
    who: 'Mallow, The Bounce',
    dance: 'bunny hop kicks: a little hop off every beat, a foot kicking forward on each in turn (then out to the sides), paws up by the cheeks, ears flapping; paws by the cheeks and a foot kicked up behind to finish',
    ears: 2.2,
    tail: 1.4,
    phrases: (r, v) => [
      [{ move: 'bunnyHop', counts: 12 }],
      [{ move: 'bunnyHop', counts: 12, side: true, mirror: v % 2 === 1 }],
      [{ move: 'bunnyHop', counts: 12, turn: true, side: v >= 2, mirror: v === 3 }],
      [{ move: 'bunnyHop', counts: 6 }, { move: 'strike', counts: 6, look: 'bunny' }]
    ]
  },
  pig: {
    who: 'Peaches, Late Braker',
    dance: 'a wide pendulum shimmy: the whole body swinging side to side with a swing feel, the belly circling, paws low; claps on 2 and 4, then up into a V clapping overhead; a shrug to finish',
    ears: 0.9,
    tail: 1.4,
    phrases: (r, v) => [
      [{ move: 'pendulum', counts: 12 }],
      [{ move: 'pendulum', counts: 12, clap: true, mirror: v === 3 }],
      [{ move: 'pendulum', counts: 12, amp: v ? 1.1 : 1, big: true, mirror: v % 2 === 1 }],
      [{ move: 'pendulum', counts: 6, big: true }, { move: 'strike', counts: 6, look: 'shrug' }]
    ]
  },
  cat: {
    who: 'Mochi, Corner Queen',
    dance: 'slinky body waves, the hips popping out on the "and" (syncopated), a paw framing the face slashing a claw swipe, one slow spin on one foot; a pose to end',
    ears: 0.7,
    tail: 1.8,
    phrases: (r, v) => [
      [{ move: 'catWave', counts: 12 }],
      [{ move: 'catClaw', counts: 12, mirror: v % 2 === 1 }],
      [{ move: 'catSpin', counts: 12, mirror: v >= 2 }],
      [{ move: 'catClaw', counts: 6 }, { move: 'strike', counts: 6, look: 'pose' }]
    ]
  },
  fox: {
    who: 'Pip, Straight-line Pip',
    dance: 'robot: staccato hits on every beat, the arms tutting in straight lines, right angles and boxes, chest pops, sharp head tilts, clicking quarter-turns; a right-angle freeze to end',
    ears: 1,
    tail: 1.3,
    phrases: (r, v) => [
      [{ move: 'robot', counts: 12 }],
      [{ move: 'foxPop', counts: 12 }],
      [{ move: 'robot', counts: 12, big: true, mirror: v % 2 === 1 }],
      [{ move: v ? 'foxPop' : 'robot', counts: 6 }, { move: 'strike', counts: 6, look: 'robot' }]
    ]
  },
  bear: {
    who: 'Toffee, The Wall',
    dance: 'stomp-and-flex: a big two-step stomp, then a double-biceps flex (a crab flex the next bar), and a slow heavy rock like a big guy grooving; a flex to finish',
    ears: 0.6,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'bearStomp', counts: 12 }],
      [{ move: 'bearRock', counts: 12, mirror: v % 2 === 1 }],
      [{ move: 'bearStomp', counts: 12, mirror: v >= 2 }],
      [{ move: 'bearRock', counts: 6 }, { move: 'strike', counts: 6, look: 'flex' }]
    ]
  },
  frog: {
    who: 'Pickle, Kerb Hopper',
    dance: 'a deep knees-out squat bouncing low, the paws swimming breaststroke (or on the knees, twisting), and a little leap every two bars',
    ears: 0.5,
    tail: 0.8,
    phrases: (r, v) => [
      [{ move: 'frogSwim', counts: 12 }],
      [{ move: 'frogSwim', counts: 12, bounce: true }],
      [{ move: 'frogSwim', counts: 12, mirror: v % 2 === 1 }],
      [{ move: 'frogSwim', counts: 6, bounce: v >= 2 }, { move: 'strike', counts: 6, look: 'frog' }]
    ]
  },
  penguin: {
    who: 'Pebble, Rain Dancer',
    dance: 'a stiff waddle-shuffle, flippers flapping at the sides, skating glides side to side, and a whole spin every two bars; chest out, flippers back to finish',
    ears: 0.5,
    tail: 1.2,
    phrases: (r, v) => [
      [{ move: 'penguinWaddle', counts: 12 }],
      [{ move: 'penguinGlide', counts: 12 }],
      [{ move: 'penguinWaddle', counts: 12, mirror: v % 2 === 1 }],
      [{ move: 'penguinGlide', counts: 6, mirror: v >= 2 }, { move: 'strike', counts: 6, look: 'penguin' }]
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
 * On top of the signature, by podium place, once every two bars of the song (`at`: on the first
 * bar or the second): the winner raises its arms into a V — up over a beat to arrive on the
 * downbeat, held a beat and a third, down over a beat (written in counts below, played at RATE) —
 * with one soft hop as they arrive (the only hop in the dances); 2nd raises one paw the same way,
 * no hop; 3rd a small V on the bars between. raise: the paws' raise (≤ 1.7, the plush limit: a V, never straight up); w: how much
 * of the arms it takes; hop: the hop's height (rider units).
 */
export const FLOURISH = {
  1: { every: 2, at: 0, arms: 'both', raise: 1.65, reach: 0.25, w: 1, hop: 0.12 },
  2: { every: 2, at: 0, arms: 'one', raise: 1.55, reach: 0.2, w: 0.85, hop: 0 },
  3: { every: 2, at: 1, arms: 'both', raise: 1.25, reach: 0.1, w: 0.6, hop: 0 }
};
/** The flourish's timing in counts from its downbeat (÷ RATE for the song's beats): up from −RISE, held to HOLD, down by HOLD + FALL. */
const RISE = 2, HOLD = 2, FALL = 2;

/** The raise at `j` beats from the flourish's downbeat: 0..1 (sine ease up, held, sine ease down). */
const raiseAt = (j) => (j < -RISE || j > HOLD + FALL ? 0 : j < 0 ? easeSine((j + RISE) / RISE) : j < HOLD ? 1 : 1 - easeSine((j - HOLD) / FALL));

/**
 * The flourish at a beat of the song (counted from the dance's start): { pose, arms (0..1), look
 * (0..1, the head and chest, a little behind the arms), up (0..1, in the air), both } or null
 * between them. On the song's own downbeats; its shape timed in counts, at RATE.
 */
export function flourish(local, place, bpm = 143.6) {
  const F = FLOURISH[place];
  if (!F) return null;
  const per = 4 * F.every;
  let j = mod(local - 4 * F.at, per) * RATE;
  if (j > per * RATE - RISE) j -= per * RATE;
  const lag = (0.2 * bpm * RATE) / 60; // the head and chest follow the paws up, 200 ms behind
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
    // the legs come together for the jump (the dance's own kicks and squats let go as the paws go up), then tuck
    for (const j of ['legL', 'legR']) for (let i = 0; i < 3; i++) out[j][i] = base[j][i] * (1 - f.arms) + f.pose[j][i];
    out.lift = Math.max(base.lift, f.pose.lift);
    out.stretch = base.stretch + f.pose.stretch;
    out.hipsY = base.hipsY + f.pose.hipsY;
  }
  return out;
}

/* ------------------------------------------------------------------ the podium dance */

/**
 * A character's podium dance: its signature, from `start` (a beat; rounded down to a bar line so
 * the moves keep to the music's bars), at RATE counts a beat, with its place's flourish (1, 2, 3);
 * any other place (a finisher off the podium) just side-claps along, small; place 0 the signature
 * alone. `sample(beat)` (the song's beat) → a pose inside the plush limits.
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
      return show(Math.floor(((beat - from) * RATE) / CYCLE)).steps;
    },
    /** The step playing at `beat`. */
    at(beat) {
      const count = (beat - from) * RATE;
      return show(Math.floor(count / CYCLE)).at(mod(count, CYCLE));
    },
    sample(beat) {
      const local = beat - from;
      const count = local * RATE;
      const cycle = Math.floor(count / CYCLE);
      // (in counts, at RATE × the song's tempo: the follow-through's lags stay real milliseconds)
      const c = beatAt(mod(count, CYCLE), bpm * RATE);
      let p = show(cycle).sample(c);
      if (!offPodium) p = withFlourish(p, flourish(local, place, bpm));
      return limits ? clampPlushPose(p, limits) : p;
    }
  };
}
