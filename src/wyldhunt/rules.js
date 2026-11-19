/**
 * The hunt as numbers: the hunter's weapons and their moves, sharpness,
 * stamina, damage against the monster's hide part by part, which parts
 * break and when, what the healing items do (no cooldown — drink as often
 * as you have them), what the gathering spots give and how the field bag
 * stacks it, and what a carve yields. Pure: no three.js, no DOM.
 */

/* ------------------------------------------------------------------ the hunter */

export const HUNTER = { hp: 150, stamina: 150, staminaRegen: 34, sprintCost: 15, dodgeCost: 25, staminaFloor: 0 };

/**
 * The weapons. Each move: `mv` motion value (× the weapon's attack), `time`
 * (seconds the move takes), `hit` (when in the move the blow lands, 0–1),
 * `reach` and `arc` (metres, radians), `next` (what a follow-up press does).
 */
export const WEAPONS = {
  greatblade: {
    name: 'Mossfang Greatblade',
    kind: 'heavy',
    attack: 62,
    moves: {
      light1: { mv: 0.48, time: 0.95, hit: 0.48, reach: 3.4, arc: 2.2, next: 'light2', clip: 'GreatSwing', speed: 1.05 },
      light2: { mv: 0.55, time: 1.0, hit: 0.45, reach: 3.4, arc: 2.0, next: 'light3', clip: 'SlashB', speed: 0.95 },
      light3: { mv: 0.92, time: 1.35, hit: 0.55, reach: 3.6, arc: 1.4, next: 'light1', clip: 'Overhead', speed: 0.9 },
      heavy: { mv: 1.05, time: 1.45, hit: 0.58, reach: 3.6, arc: 1.2, next: 'light1', clip: 'Overhead', speed: 0.85 },
      charged: { mv: 1.1, time: 1.2, hit: 0.42, reach: 3.8, arc: 1.3, next: 'light1', clip: 'Overhead', speed: 1.1 }
    },
    /** Charge levels: seconds held for each, and what each multiplies. */
    charge: [0, 0.65, 1.35, 2.05],
    chargeMult: [1, 1.6, 2.3, 3.2],
    sharpness: true
  },
  bow: {
    name: 'Thornwood Bow',
    kind: 'ranged',
    attack: 48,
    moves: {
      shot: { mv: 0.42, time: 0.55, hit: 0.35, range: 60, clip: 'Shoot', speed: 1.6 },
      charged: { mv: 0.42, time: 0.55, hit: 0.2, range: 70, clip: 'Shoot', speed: 1.8 }
    },
    charge: [0, 0.45, 0.95, 1.55],
    chargeMult: [1, 1.45, 1.95, 2.6],
    pierce: [1, 1, 2, 3],
    chargeStamina: 18,
    sharpness: false
  }
};

/* ------------------------------------------------------------------ sharpness */

/**
 * Sharpness: a gauge of points, each colour band multiplying damage; every
 * hit costs a point (two on hard hide), and below green the blade bounces
 * off hard parts. A whetstone fills it back.
 */
export const SHARPNESS = [
  { id: 'red', color: '#d8402e', mult: 0.5, from: 0 },
  { id: 'orange', color: '#e8862a', mult: 0.75, from: 10 },
  { id: 'yellow', color: '#e8cf3a', mult: 1.0, from: 25 },
  { id: 'green', color: '#5cc84a', mult: 1.05, from: 45 },
  { id: 'blue', color: '#3a7ee8', mult: 1.2, from: 70 },
  { id: 'white', color: '#f2f2f2', mult: 1.32, from: 100 }
];
export const SHARP_MAX = 120;

export function sharpnessLevel(points) {
  let lv = SHARPNESS[0];
  for (const s of SHARPNESS) if (points >= s.from) lv = s;
  return lv;
}

/** After a hit: the new points, and whether it bounced (too dull for hard hide). */
export function wearBlade(points, hardness) {
  const lv = sharpnessLevel(points);
  const bounce = hardness >= 2 && lv.mult < 1.05;
  return { points: Math.max(0, points - (hardness >= 2 ? 2 : 1)), bounce };
}

/* ------------------------------------------------------------------ the monster's hide */

/**
 * The Gnarlhorn's parts: how well each takes cutting blows and arrows (hit
 * zone %), how hard it is (2 = blades bounce when dull), and how much damage
 * breaks it (`breakAt`, part damage, not health).
 */
export const GNARLHORN = {
  name: 'Gnarlhorn',
  title: 'Tyrant of Mistfall Gorge',
  hp: 4200,
  parts: {
    head: { cut: 0.8, shot: 0.6, hard: 1, breakAt: 520, breaks: 'horn', label: 'horns' },
    neck: { cut: 0.55, shot: 0.5, hard: 1 },
    body: { cut: 0.45, shot: 0.4, hard: 1 },
    legs: { cut: 0.5, shot: 0.35, hard: 1 },
    tail: { cut: 0.6, shot: 0.45, hard: 1, breakAt: 480, breaks: 'tail', label: 'tail club', sever: true },
    plates: { cut: 0.25, shot: 0.2, hard: 2 }
  },
  /** Health fractions where it turns: enraged, then weak (limps off to rest). */
  rageAt: 0.6,
  fleeAt: 0.28,
  /** Stagger: this much damage in a short while knocks it off its feet. */
  staggerAt: 600
};

/**
 * Damage from one blow: weapon attack × motion value × charge × sharpness ×
 * hit zone, rounded; a bounce does a little. `kind` 'cut' or 'shot'.
 */
export function blowDamage({ attack, mv, charge = 1, sharp = 1, zone = 0.5, crit = 0, rand = Math.random }) {
  const base = attack * mv * charge * sharp * zone;
  const isCrit = rand() < crit;
  return { amount: Math.max(1, Math.round(base * (isCrit ? 1.25 : 1) * (0.95 + rand() * 0.1))), crit: isCrit };
}

/**
 * Track part damage: returns the parts broken by this hit (each breaks
 * once). `state.parts[id]` accumulates; `state.broken` is a set of ids.
 */
export function damagePart(state, partId, amount, def = GNARLHORN) {
  const p = def.parts[partId];
  if (!p) return [];
  state.parts ??= {};
  state.broken ??= [];
  state.parts[partId] = (state.parts[partId] ?? 0) + amount;
  if (p.breakAt && !state.broken.includes(partId) && state.parts[partId] >= p.breakAt) {
    state.broken.push(partId);
    return [partId];
  }
  return [];
}

/** The monster's mood from its health fraction: 'calm' | 'enraged' | 'weak'. */
export function monsterMood(frac, def = GNARLHORN) {
  if (frac <= def.fleeAt) return 'weak';
  if (frac <= def.rageAt) return 'enraged';
  return 'calm';
}

/* ------------------------------------------------------------------ hurting the hunter */

/** The monster's blows: base damage and what they do (knock down, stagger, need guarding). */
export const MONSTER_ATTACKS = {
  bite: { damage: 38, reach: 5.2, arc: 1.3, windup: 0.9, active: 0.25, recover: 0.9, knock: false },
  tail: { damage: 32, reach: 8.5, arc: Math.PI * 2, windup: 1.0, active: 0.45, recover: 1.0, knock: true },
  charge: { damage: 46, reach: 3.2, arc: 1.2, windup: 1.2, active: 2.2, recover: 1.2, knock: true },
  roar: { damage: 0, reach: 16, arc: Math.PI * 2, windup: 0.6, active: 1.6, recover: 0.6, stagger: true }
};

/** Damage taken, after the hunter's defence (enraged blows hit harder). */
export function hurtHunter(attack, { defence = 0, enraged = false } = {}) {
  const raw = attack.damage * (enraged ? 1.25 : 1);
  return Math.round(raw * (100 / (100 + defence)));
}

/** Stamina after `dt` seconds: regenerating, or paying for a sprint. */
export function staminaStep(st, dt, { sprinting = false, max = HUNTER.stamina } = {}) {
  if (sprinting) return Math.max(0, st - HUNTER.sprintCost * dt);
  return Math.min(max, st + HUNTER.staminaRegen * dt);
}

/** Can the hunter pay for something that costs `cost`? (A move may start on any stamina above zero.) */
export const canPay = (st, cost) => st > Math.min(cost, 1);

/* ------------------------------------------------------------------ items and the bag */

/** Things a hunter carries and finds. `use`: what using it does (none: materials). */
export const ITEMS = {
  potion: { name: 'Fernleaf Draught', icon: 'potion', color: '#5ad46a', use: { heal: 0.32, over: 0.6 }, stack: 10, desc: 'Heals a third of your health. No waiting: drink again whenever you need to.' },
  mega: { name: 'Greater Draught', icon: 'potion', color: '#2ec0a0', use: { heal: 0.7, over: 0.9 }, stack: 5, desc: 'Heals most of your health.' },
  whetstone: { name: 'Whetstone', icon: 'stone', color: '#b8b8b0', use: { sharpen: true }, stack: 99, infinite: true, desc: 'Hone your blade back to its best edge.' },
  ration: { name: 'Trail Ration', icon: 'ration', color: '#d8a050', use: { stamina: true }, stack: 10, desc: 'Fills your stamina at once.' },
  // Gathered.
  sunleaf: { name: 'Sunleaf', icon: 'herb', color: '#9ae04a', stack: 30, desc: 'A broad leaf that drinks the light through the mist. Medicine.' },
  dewcap: { name: 'Dewcap', icon: 'herb', color: '#4ad0c0', stack: 30, desc: 'A pale mushroom from the wet shade.' },
  ironvein: { name: 'Ironvein Ore', icon: 'ore', color: '#b07a50', stack: 30, desc: 'Rust-streaked ore from the gorge walls.' },
  mistquartz: { name: 'Mist Quartz', icon: 'ore', color: '#a0d8ff', stack: 20, desc: 'Clear stone that holds a little light.' },
  lampbug: { name: 'Lamp Beetle', icon: 'bug', color: '#e8e070', stack: 20, desc: 'Its shell glows when it is frightened.' },
  thunderbug: { name: 'Hum Beetle', icon: 'bug', color: '#8ab0ff', stack: 20, desc: 'Buzzes so hard your fingers tingle.' },
  oldbone: { name: 'Old Bone', icon: 'bone', color: '#e8dcc0', stack: 30, desc: 'From something big, long ago.' },
  // Carved.
  gnarlScale: { name: 'Gnarlhorn Scale', icon: 'scale', color: '#5a7a3a', stack: 30, desc: 'A mossy, shield-hard scale.' },
  gnarlHide: { name: 'Gnarlhorn Hide', icon: 'hide', color: '#7a5a3a', stack: 30, desc: 'Thick hide that sheds rain.' },
  gnarlFang: { name: 'Gnarlhorn Fang', icon: 'fang', color: '#f0e8d0', stack: 20, desc: 'As long as a forearm.' },
  gnarlHorn: { name: 'Gnarlhorn Horn', icon: 'horn', color: '#d8c8a0', stack: 10, desc: 'Broken off its brow. Only from a broken horn.' },
  gnarlClub: { name: 'Tail Club Shard', icon: 'club', color: '#8a7a6a', stack: 10, desc: 'From its severed tail club.' },
  mossPlate: { name: 'Mossback Plate', icon: 'scale', color: '#4a6a2a', stack: 20, desc: 'A back plate grown over with moss.' },
  raw: { name: 'Raw Meat', icon: 'meat', color: '#c86a5a', stack: 20, desc: 'From a velvetbuck.' },
  chitin: { name: 'Skitter Chitin', icon: 'scale', color: '#3a5a6a', stack: 20, desc: 'From a thornskitter.' }
};

export const BAG_SIZE = 24;

/** A new hunter's kit: items on the bar (with counts) and an empty bag. */
export function newKit() {
  return { bar: ['potion', 'mega', 'whetstone', 'ration'], bag: [{ id: 'potion', n: 10 }, { id: 'mega', n: 3 }, { id: 'whetstone', n: 99 }, { id: 'ration', n: 4 }] };
}

/** How many of an item the bag holds. */
export const count = (bag, id) => bag.filter((s) => s.id === id).reduce((a, s) => a + s.n, 0);

/**
 * Put `n` of an item in the bag, filling existing stacks first. Returns how
 * many fitted (the rest stay on the ground).
 */
export function addItem(bag, id, n = 1) {
  const def = ITEMS[id];
  if (!def || n <= 0) return 0;
  let left = n;
  for (const s of bag) {
    if (s.id !== id || s.n >= def.stack) continue;
    const k = Math.min(left, def.stack - s.n);
    s.n += k;
    left -= k;
    if (!left) return n;
  }
  while (left > 0 && bag.length < BAG_SIZE) {
    const k = Math.min(left, def.stack);
    bag.push({ id, n: k });
    left -= k;
  }
  return n - left;
}

/** Take `n` of an item; false (and nothing taken) if there aren't enough. Infinite items never run out. */
export function takeItem(bag, id, n = 1) {
  if (ITEMS[id]?.infinite) return count(bag, id) > 0;
  if (count(bag, id) < n) return false;
  let left = n;
  for (let i = bag.length - 1; i >= 0 && left > 0; i--) {
    const s = bag[i];
    if (s.id !== id) continue;
    const k = Math.min(left, s.n);
    s.n -= k;
    left -= k;
    if (!s.n) bag.splice(i, 1);
  }
  return true;
}

/** The supply box tops up the healing kit to what a new hunter carries. */
export function restock(bag) {
  const kit = newKit().bag;
  const got = [];
  for (const k of kit) {
    const have = count(bag, k.id);
    if (have < k.n) {
      const added = addItem(bag, k.id, k.n - have);
      if (added) got.push([k.id, added]);
    }
  }
  return got;
}

/* ------------------------------------------------------------------ gathering */

/** What each kind of spot gives: [item, weight] and how many each time. */
export const GATHER = {
  herb: { label: 'Gather', yields: [['sunleaf', 3], ['dewcap', 1]], uses: 3, n: [1, 2], regrow: 90 },
  ore: { label: 'Mine', yields: [['ironvein', 3], ['mistquartz', 1]], uses: 3, n: [1, 2], regrow: 120 },
  bug: { label: 'Catch', yields: [['lampbug', 2], ['thunderbug', 1]], uses: 2, n: [1, 1], regrow: 90 },
  bone: { label: 'Search', yields: [['oldbone', 1]], uses: 2, n: [1, 2], regrow: 150 }
};

/** One gathering: { item, n } from a spot of `kind`, and the spot's state after. */
export function gather(spot, kind, rand = Math.random) {
  const g = GATHER[kind];
  if (!g || (spot.left ?? g.uses) <= 0) return null;
  const total = g.yields.reduce((a, [, w]) => a + w, 0);
  let x = rand() * total;
  let item = g.yields[0][0];
  for (const [id, w] of g.yields) {
    if ((x -= w) < 0) {
      item = id;
      break;
    }
  }
  const n = g.n[0] + Math.floor(rand() * (g.n[1] - g.n[0] + 1));
  spot.left = (spot.left ?? g.uses) - 1;
  if (spot.left <= 0) spot.regrowIn = g.regrow;
  return { item, n };
}

/** Time passes for a spent spot: it grows back. */
export function regrow(spot, kind, dt) {
  if ((spot.left ?? 1) > 0) return false;
  spot.regrowIn -= dt;
  if (spot.regrowIn <= 0) {
    spot.left = GATHER[kind].uses;
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ carving */

export const CARVES = 3;

/** One carve from the body (or a severed part): what it gives. */
export function carve(from = 'body', rand = Math.random) {
  const table = from === 'tail' ? [['gnarlClub', 3], ['gnarlScale', 2]] : [['gnarlScale', 4], ['gnarlHide', 3], ['mossPlate', 2], ['gnarlFang', 1]];
  const total = table.reduce((a, [, w]) => a + w, 0);
  let x = rand() * total;
  for (const [id, w] of table) if ((x -= w) < 0) return { item: id, n: 1 };
  return { item: table[0][0], n: 1 };
}

/** The reward for a broken horn, given when the hunt ends. */
export const BREAK_REWARD = { head: 'gnarlHorn' };

/* ------------------------------------------------------------------ the weather's cycle */

/** The cycle (seconds): [length, rain amount at its end]. Sun, clouding over, a shower, clearing. */
export const CYCLE = [[150, 0], [25, 0.35], [70, 1], [30, 0.15], [40, 0]];
export const CYCLE_LEN = CYCLE.reduce((a, [l]) => a + l, 0);

/** How much it is raining (0…1) `t` seconds into the cycle — eased between the keys. */
export function rainAt(t) {
  let tt = ((t % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
  let prev = CYCLE[CYCLE.length - 1][1];
  for (const [len, v] of CYCLE) {
    if (tt <= len) {
      const k = tt / len;
      const e = k * k * (3 - 2 * k);
      return prev + (v - prev) * e;
    }
    tt -= len;
    prev = v;
  }
  return 0;
}
