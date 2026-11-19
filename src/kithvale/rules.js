/**
 * Kithvale's rules, pure (no three.js, no DOM), so the tests can hold them:
 * the six wild species (who they are, where they live, what they like, how
 * shy they are, what they do for you once befriended), the treats, the
 * satchel, the trust moment's breathing rhythm and how it is scored, the
 * party of up to three companions, the journal, names, and the save format.
 */

/* ------------------------------------------------------------------ treats */

export const TREATS = {
  berry: { id: 'berry', name: 'Sweetberries', short: 'Berries', color: '#d8456a', blurb: 'Round, dark-red and sticky. Most noses twitch at them.' },
  seed: { id: 'seed', name: 'Sunseeds', short: 'Seeds', color: '#e8b440', blurb: 'Shaken from the tall sunheads in the meadow. Crunchy and warm.' },
  crystal: { id: 'crystal', name: 'Glimmer crystals', short: 'Crystals', color: '#7ad0e8', blurb: 'Little cold sparks from the rocks. Not everyone eats stone.' }
};
export const TREAT_ORDER = ['berry', 'seed', 'crystal'];
export const SATCHEL_MAX = 12;

/** A new satchel: a few of each. */
export const newSatchel = () => ({ berry: 4, seed: 3, crystal: 1 });

/** Add treats (capped per kind). Returns how many fitted. */
export function addTreat(satchel, kind, n = 1) {
  if (!TREATS[kind]) return 0;
  const have = satchel[kind] ?? 0;
  const fit = Math.max(0, Math.min(n, SATCHEL_MAX - have));
  satchel[kind] = have + fit;
  return fit;
}

/** Take one treat out (false if there is none). */
export function takeTreat(satchel, kind) {
  if (!satchel[kind]) return false;
  satchel[kind] -= 1;
  return true;
}

/* ------------------------------------------------------------------ the species */

/**
 * Each species: name and one-line nature; where it lives; what it loves,
 * likes and won't touch; how shy (0 bold … 1 very shy) and how well it hears
 * (metres at which a sprint startles it); trust needed before it will share
 * a breath with you; the trust moment's pace (seconds per breath) and length;
 * its gait; the ability it lends a friend; the hours it is about (24 h).
 */
export const SPECIES = {
  tuftlet: {
    id: 'tuftlet', name: 'Tuftlet', habitat: 'Hopgrass Meadow', area: 'meadow',
    blurb: 'A round little hopper with a crown of grass. It plants itself in the meadow and pretends to be a tussock.',
    loves: 'seed', likes: 'berry', dislikes: 'crystal',
    shy: 0.45, hearing: 16, trust: 60, breath: 2.0, beats: 4, gait: 'hop', size: 0.55,
    ability: { id: 'sniff', name: 'Keen nose', desc: 'Sniffs out treats buried in the vale. Their spots sparkle and show on your map.' },
    hours: null, color: '#9cc46a'
  },
  pebbleroll: {
    id: 'pebbleroll', name: 'Pebbleroll', habitat: 'the Pebblerun', area: 'stream',
    blurb: 'Its back is a shell of river pebbles. When it is frightened it tucks in and rolls away down the bank.',
    loves: 'crystal', likes: 'seed', dislikes: 'berry',
    shy: 0.55, hearing: 14, trust: 70, breath: 2.4, beats: 4, gait: 'waddle', size: 0.6,
    ability: { id: 'roll', name: 'Rock roll', desc: 'Rolls through cracked boulders to open them. Crystals are often inside.' },
    hours: null, color: '#8a9aa8'
  },
  lumoth: {
    id: 'lumoth', name: 'Lumoth', habitat: 'Windbell Shrine, at dusk', area: 'shrine',
    blurb: 'A soft moth whose belly glows like a paper lantern. It comes out at dusk to dance round the shrine.',
    loves: 'berry', likes: 'crystal', dislikes: 'seed',
    shy: 0.35, hearing: 12, trust: 55, breath: 1.8, beats: 4, gait: 'fly', size: 0.5,
    ability: { id: 'glow', name: 'Lantern glow', desc: 'Lights the way at night and flutters toward creatures you have not met yet.' },
    hours: [16.5, 6.5], color: '#f2d79a'
  },
  mistfawn: {
    id: 'mistfawn', name: 'Mistfawn', habitat: 'the Hushwood', area: 'forest',
    blurb: 'A dappled fawn with leaf-bud antlers. Very shy: it hears a running step from far away.',
    loves: 'berry', likes: 'seed', dislikes: 'crystal',
    shy: 0.9, hearing: 30, trust: 80, breath: 2.8, beats: 5, gait: 'trot', size: 1.0,
    ability: { id: 'calm', name: 'Calm presence', desc: 'Wild creatures stay calmer around you, and the trust moment is gentler.' },
    hours: null, color: '#c89a6a'
  },
  puffwool: {
    id: 'puffwool', name: 'Puffwool', habitat: 'Puffcrown Downs', area: 'downs',
    blurb: 'A cloud that grazes. Its wool is so light that it floats a little when the wind gets up.',
    loves: 'seed', likes: 'berry', dislikes: 'crystal',
    shy: 0.3, hearing: 14, trust: 65, breath: 2.6, beats: 4, gait: 'bounce', size: 0.85,
    ability: { id: 'float', name: 'Cloud hop', desc: 'Hold jump in the air to float down gently — and jump a little higher.' },
    hours: null, color: '#f4f2f8'
  },
  emberkit: {
    id: 'emberkit', name: 'Emberkit', habitat: 'Cinder Crags', area: 'crags',
    blurb: 'A little salamander with a flame for a tail-tip. It basks on warm stones and darts into cracks.',
    loves: 'crystal', likes: 'berry', dislikes: 'seed',
    shy: 0.6, hearing: 15, trust: 70, breath: 1.6, beats: 5, gait: 'scurry', size: 0.6,
    ability: { id: 'ember', name: 'Ember light', desc: 'Kindles cold stone lanterns and lights dark hollows.' },
    hours: null, color: '#ec7a3a'
  }
};
export const SPECIES_ORDER = ['tuftlet', 'pebbleroll', 'lumoth', 'mistfawn', 'puffwool', 'emberkit'];

/** How a species takes a treat: 'love' | 'like' | 'dislike', and the trust it earns. */
export function treatReaction(species, treat) {
  const s = SPECIES[species];
  if (!s || !TREATS[treat]) return { reaction: 'dislike', trust: 0 };
  if (s.loves === treat) return { reaction: 'love', trust: 60 };
  if (s.likes === treat) return { reaction: 'like', trust: 34 };
  return { reaction: 'dislike', trust: -8 };
}

/** Is a species about at this hour? (`hours` [from, to] may wrap midnight.) */
export function awakeAt(species, hour) {
  const h = SPECIES[species]?.hours;
  if (!h) return true;
  const [a, b] = h;
  return a < b ? hour >= a && hour < b : hour >= a || hour < b;
}

/* ------------------------------------------------------------------ noise and perception */

/** How much noise the player makes (0…1) from their speed and whether they sneak. */
export function noiseLevel(speed, { sneaking = false, airborne = false } = {}) {
  if (sneaking) return Math.min(0.12, speed * 0.04);
  let n = speed < 0.2 ? 0.02 : speed < 2 ? 0.15 : speed < 5.2 ? 0.45 : 1;
  if (airborne) n = Math.max(n, 0.3);
  return n;
}

/**
 * How alarming the player is to a creature right now (per second, 0…~2):
 * loudness over distance against the species' hearing, more when the
 * player is close and moving, much less when they creep.
 */
export function alarmRate(species, { dist, noise, calm = false }) {
  const s = SPECIES[species];
  if (!s) return 0;
  const reach = s.hearing * (0.25 + noise * 0.75);
  if (dist > reach) return 0;
  const k = 1 - dist / reach;
  let a = k * k * (0.4 + noise * 1.6) * (0.4 + s.shy);
  if (calm) a *= 0.5;
  return a;
}

/* ------------------------------------------------------------------ the trust moment */

/**
 * The breathing ring: a ring swells and shrinks, `breath` seconds a breath.
 * The player presses as it reaches its fullest (phase 0.5 of each breath).
 * Returns the ring's size 0…1 at time t.
 */
export function breathSize(t, breath) {
  const p = ((t / breath) % 1 + 1) % 1;
  return 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
}

/** How far a press at time t is from the nearest full breath, in fractions of a breath (0…0.5). */
export function breathError(t, breath) {
  const p = ((t / breath) % 1 + 1) % 1;
  return Math.abs(p - 0.5);
}

/** The timing windows (fractions of a breath); a calm friend (Mistfawn) widens them. */
export function windows(calm = false) {
  const k = calm ? 1.35 : 1;
  return { perfect: 0.06 * k, good: 0.14 * k };
}

/** Grade one press: 'perfect' (2 points), 'good' (1) or 'miss' (0). */
export function gradeBeat(error, calm = false) {
  const w = windows(calm);
  if (error <= w.perfect) return 'perfect';
  if (error <= w.good) return 'good';
  return 'miss';
}

export const BEAT_POINTS = { perfect: 2, good: 1, miss: 0 };

/**
 * The trust moment's result from its graded beats: success when the points
 * reach two thirds of the most you could score (and at most one miss).
 */
export function trustResult(grades, beats) {
  const points = grades.reduce((a, g) => a + (BEAT_POINTS[g] ?? 0), 0);
  const misses = grades.filter((g) => g === 'miss').length + Math.max(0, beats - grades.length);
  const need = Math.ceil(beats * 2 * 0.6);
  const success = points >= need && misses <= 1;
  const perfect = grades.length === beats && grades.every((g) => g === 'perfect');
  return { points, need, misses, success, perfect };
}

/* ------------------------------------------------------------------ friends and the party */

export const PARTY_MAX = 3;

/** Names a befriended creature might be given (the player can change it). */
export const NAMES = {
  tuftlet: ['Tussock', 'Clover', 'Sprig', 'Bramblet', 'Fescue', 'Pip'],
  pebbleroll: ['Cobble', 'Skipper', 'Flint', 'Rumble', 'Shingle', 'Marble'],
  lumoth: ['Wick', 'Glimmer', 'Paperlight', 'Hush', 'Ember', 'Dusky'],
  mistfawn: ['Fern', 'Dapple', 'Hazel', 'Willow', 'Misty', 'Rowan'],
  puffwool: ['Nimbus', 'Puff', 'Billow', 'Drift', 'Cotton', 'Wisp'],
  emberkit: ['Cinder', 'Sparks', 'Tinder', 'Flick', 'Kindle', 'Soot']
};

/** A name nobody in the party already has. */
export function pickName(species, taken = [], rand = Math.random) {
  const list = NAMES[species] ?? ['Friend'];
  const free = list.filter((n) => !taken.includes(n));
  const pool = free.length ? free : list.map((n) => `${n} II`);
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/** Clean up a typed name: trimmed, letters, numbers, spaces, ' and -, at most 14 characters. */
export function cleanName(s, fallback = 'Friend') {
  const t = String(s ?? '').replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return t || fallback;
}

/** A new friend joins: they follow if there's room, else wait in the Kith Garden. */
export function befriend(state, { species, name, uid }) {
  const following = state.friends.filter((f) => f.follow).length;
  const friend = { uid: uid ?? `k${state.friends.length + 1}`, species, name, follow: following < PARTY_MAX, met: state.clock ?? 0 };
  state.friends.push(friend);
  if (!state.befriended.includes(species)) state.befriended.push(species);
  if (!state.seen.includes(species)) state.seen.push(species);
  return friend;
}

/** Ask a friend to follow (or to rest in the garden). False if the party is full. */
export function setFollow(state, uid, follow) {
  const f = state.friends.find((x) => x.uid === uid);
  if (!f) return false;
  if (follow && !f.follow && state.friends.filter((x) => x.follow).length >= PARTY_MAX) return false;
  f.follow = follow;
  return true;
}

export const party = (state) => state.friends.filter((f) => f.follow).slice(0, PARTY_MAX);

/** Does the party have a friend with this ability? */
export const hasAbility = (state, ability) => party(state).some((f) => SPECIES[f.species]?.ability.id === ability);

/** Mark a species seen (for the journal). Returns true if it is new. */
export function see(state, species) {
  if (state.seen.includes(species)) return false;
  state.seen.push(species);
  return true;
}

/* ------------------------------------------------------------------ the save */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'kithvale.save';

export function newState() {
  return { v: SAVE_VERSION, look: 'sprout', satchel: newSatchel(), friends: [], seen: [], befriended: [], learned: {}, caches: [], boulders: [], lanterns: [], hollow: false, clock: 0, hour: 17.8, cycle: false };
}

/** What gets written (a plain, versioned object). */
export function serialize(state) {
  return JSON.stringify({ ...state, v: SAVE_VERSION });
}

/**
 * Read a save back, or a fresh state if it is missing, broken, or from a
 * version this game can't read. Unknown fields are dropped, bad ones fixed.
 */
export function deserialize(text) {
  const fresh = newState();
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return fresh;
  }
  if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION) return fresh;
  const s = fresh;
  if (typeof o.look === 'string') s.look = o.look;
  if (o.satchel && typeof o.satchel === 'object') for (const k of TREAT_ORDER) s.satchel[k] = Math.max(0, Math.min(SATCHEL_MAX, Math.floor(Number(o.satchel[k]) || 0)));
  if (Array.isArray(o.friends)) {
    let following = 0;
    for (const f of o.friends) {
      if (!f || !SPECIES[f.species]) continue;
      const follow = Boolean(f.follow) && following < PARTY_MAX;
      if (follow) following++;
      s.friends.push({ uid: String(f.uid ?? `k${s.friends.length + 1}`), species: f.species, name: cleanName(f.name, SPECIES[f.species].name), follow, met: Number(f.met) || 0 });
    }
  }
  const list = (a, ok) => (Array.isArray(a) ? [...new Set(a.filter(ok))] : []);
  s.seen = list(o.seen, (x) => SPECIES[x]);
  s.befriended = list(o.befriended, (x) => SPECIES[x]);
  for (const f of s.friends) {
    if (!s.befriended.includes(f.species)) s.befriended.push(f.species);
    if (!s.seen.includes(f.species)) s.seen.push(f.species);
  }
  if (o.learned && typeof o.learned === 'object') for (const k of SPECIES_ORDER) if (Array.isArray(o.learned[k])) s.learned[k] = o.learned[k].filter((t) => TREATS[t]);
  s.caches = list(o.caches, (x) => typeof x === 'string');
  s.boulders = list(o.boulders, (x) => typeof x === 'string');
  s.lanterns = list(o.lanterns, (x) => Number.isInteger(x));
  s.hollow = Boolean(o.hollow);
  s.clock = Number(o.clock) || 0;
  s.hour = Number.isFinite(o.hour) ? ((o.hour % 24) + 24) % 24 : 17.8;
  s.cycle = Boolean(o.cycle);
  return s;
}

/** What the journal knows of a species: seen, befriended, and the treats you have learned it takes. */
export function journalEntry(state, species) {
  const s = SPECIES[species];
  const seen = state.seen.includes(species);
  const friend = state.befriended.includes(species);
  const learned = state.learned[species] ?? [];
  return {
    id: species,
    name: seen ? s.name : '???',
    seen,
    friend,
    habitat: seen ? s.habitat : 'Somewhere in the vale',
    blurb: seen ? s.blurb : 'Not met yet.',
    loves: friend || learned.includes(s.loves) ? s.loves : null,
    likes: friend || learned.includes(s.likes) ? s.likes : null,
    dislikes: friend || learned.includes(s.dislikes) ? s.dislikes : null,
    ability: friend ? s.ability : null,
    names: state.friends.filter((f) => f.species === species).map((f) => f.name)
  };
}

/** Remember how a species took a treat. */
export function learn(state, species, treat) {
  const l = (state.learned[species] ??= []);
  if (!l.includes(treat)) l.push(treat);
}

/* ------------------------------------------------------------------ the day */

/** Hours advanced per real second when the day cycle is on (a day in 16 minutes). */
export const CYCLE_RATE = 24 / (16 * 60);
export const DUSK = 17.8;
export const advanceHour = (hour, dt, on) => (on ? (((hour + dt * CYCLE_RATE) % 24) + 24) % 24 : hour);
