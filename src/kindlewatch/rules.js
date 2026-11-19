/**
 * Kindlewatch's rules: the heroes and foes in numbers, and the pure parts of
 * a fight — combo timing windows and buffered input, dash i-frames, damage
 * with guards that break, knockback, hit-stop, slime splitting, ammo pips
 * that recharge, energy, potions (no cooldown, ever), and the save. No DOM,
 * no three.js; tested in tests/unit/kindlewatch.test.mjs.
 */

/* ------------------------------------------------------------ heroes */

/**
 * A combo step: `dur` its whole length (s), `hit` when the blow lands, the
 * window [chainOpen, chainClose] in which the next press chains (an early
 * press is buffered until it opens), `reach`/`arc` the hit area in front of
 * you (tiles / radians), `push` the knockback, `weight` how hard it lands.
 */
export const HEROES = {
  warden: {
    id: 'warden',
    name: 'The Hornwarden',
    title: 'Horned knight of the last hearth',
    blurb: 'Sword and kite shield, heavy plate under a fur mantle. Slow to start, hard to stop: a cleaving three-blow chain, a charged whirl that breaks any guard, and brand-axes thrown burning.',
    hp: 130,
    energy: 100,
    speed: 5.4,
    combo: [
      { dur: 0.36, hit: 0.1, chainOpen: 0.13, chainClose: 0.52, dmg: 12, reach: 1.75, arc: 2.3, push: 3.2, weight: 'light', lunge: 2.4 },
      { dur: 0.38, hit: 0.11, chainOpen: 0.14, chainClose: 0.55, dmg: 14, reach: 1.8, arc: 2.4, push: 3.6, weight: 'light', lunge: 2.6 },
      { dur: 0.58, hit: 0.22, chainOpen: 9, chainClose: 9, dmg: 26, reach: 2.05, arc: 2.9, push: 8, weight: 'heavy', lunge: 3.6, shock: 2.2 }
    ],
    heavy: { chargeMin: 0.22, chargeFull: 0.75, dmg: [20, 46], reach: 2.4, arc: Math.PI * 2, push: 9, dur: 0.48, hit: 0.12, guardBreak: true, name: 'Hearthwhirl' },
    dash: { dur: 0.25, speed: 15.5, iframes: [0, 0.23], cooldown: 0.4, name: 'Shoulder roll' },
    ranged: { id: 'axe', name: 'Brand Axes', pips: 3, recharge: 2.1, dmg: 16, speed: 15, range: 11, pierce: false, ignite: true },
    summon: { id: 'hound', name: 'Hearth Hound', cost: 60, dur: 9, blurb: 'A hound of living coals that runs down the nearest foe and bites in flame.' },
    potion: { heal: 50 }
  },
  runner: {
    id: 'runner',
    name: 'The Veilrunner',
    title: 'Hooded spear-dancer of the high passes',
    blurb: 'A long ash spear and a lantern on the hip. Quick feet, long reach: a thrust-sweep-vault chain, a charged lunge that runs through a line of foes, and sun-lances thrown from afar.',
    hp: 100,
    energy: 100,
    speed: 6.3,
    combo: [
      { dur: 0.3, hit: 0.08, chainOpen: 0.1, chainClose: 0.46, dmg: 10, reach: 2.3, arc: 0.9, push: 2.4, weight: 'light', lunge: 2.8 },
      { dur: 0.34, hit: 0.1, chainOpen: 0.12, chainClose: 0.5, dmg: 11, reach: 2.0, arc: 2.6, push: 3, weight: 'light', lunge: 2.2 },
      { dur: 0.5, hit: 0.2, chainOpen: 9, chainClose: 9, dmg: 22, reach: 2.6, arc: 1.2, push: 7, weight: 'heavy', lunge: 5.2, shock: 1.4 }
    ],
    heavy: { chargeMin: 0.2, chargeFull: 0.65, dmg: [18, 40], reach: 5.2, arc: 0.7, push: 7, dur: 0.42, hit: 0.1, guardBreak: true, lunge: 16, name: 'Comet lunge' },
    dash: { dur: 0.3, speed: 16, iframes: [0, 0.28], cooldown: 0.36, name: 'Veil step' },
    ranged: { id: 'lance', name: 'Sun-lances', pips: 4, recharge: 1.8, dmg: 13, speed: 19, range: 13, pierce: true, ignite: true },
    summon: { id: 'moth', name: 'Lantern Moth', cost: 55, dur: 11, blurb: 'A great moth of lamplight that circles you, lights the dark and stings what comes near.' },
    potion: { heal: 45 }
  }
};
export const HERO_ORDER = ['warden', 'runner'];

/* ------------------------------------------------------------ foes */

export const ENEMIES = {
  imp: { name: 'Cinder imp', hp: 26, speed: 4.4, mass: 0.6, radius: 0.32, contact: 0, gems: [1, 2] },
  slime: { name: 'Rime slime', hp: 0, speed: 0, mass: 1.2, radius: 0.5, contact: 10, gems: [1, 1] },
  sentinel: { name: 'Hollow sentinel', hp: 70, speed: 2.4, mass: 2.2, radius: 0.42, guard: 30, gems: [3, 5] },
  archer: { name: 'Rimefletch archer', hp: 32, speed: 3.6, mass: 0.8, radius: 0.36, gems: [2, 3] },
  gorehorn: { name: 'Gorehorn', hp: 95, speed: 2.6, mass: 4, radius: 0.62, contact: 22, gems: [4, 6] },
  jarl: { name: 'Hrimgar, the Rime Jarl', hp: 900, speed: 1.9, mass: 40, radius: 1.15, gems: [30, 30] }
};

/** Slimes by size: hit points, radius, contact damage, hop length. Size 3 splits into two 2s, each 2 into two 1s. */
export const SLIME = {
  1: { hp: 9, radius: 0.28, contact: 5, hop: 2.4, gems: 1 },
  2: { hp: 20, radius: 0.42, contact: 8, hop: 2.8, gems: 1 },
  3: { hp: 42, radius: 0.62, contact: 12, hop: 3.1, gems: 2 }
};

/* ------------------------------------------------------------ combo and timing */

/** Where a timed action is at time t: 'windup' until the hit, 'active' for a moment, then 'recover', then 'done'. */
export function attackPhase(step, t) {
  if (t < step.hit) return 'windup';
  if (t < step.hit + 0.07) return 'active';
  if (t < step.dur) return 'recover';
  return 'done';
}

/** Is t inside the step's chain window? */
export const chainOpen = (step, t) => t >= step.chainOpen && t <= step.chainClose;

/**
 * Combo bookkeeping, as a tiny state you can step: `press(t)` when attack is
 * pressed, `tick(t)` each frame (t is time since the current step began).
 * Returns the step index to start now, or -1.
 *   - pressing while idle starts step 0;
 *   - pressing in a step's chain window starts the next one at once;
 *   - pressing before the window opens is buffered and fires when it opens;
 *   - letting the window close (or the last step end) resets to step 0.
 */
export class Combo {
  constructor(steps) {
    this.steps = steps;
    this.index = -1; // the step playing, -1 when idle
    this.buffered = false;
  }

  get busy() {
    return this.index >= 0;
  }

  press(t) {
    if (this.index < 0) return this.start(0);
    const step = this.steps[this.index];
    const last = this.index === this.steps.length - 1;
    if (last) {
      // After the finisher, a press near its end starts a fresh chain.
      if (t >= step.dur - 0.06) return this.start(0);
      this.buffered = t >= step.dur - 0.2;
      return -1;
    }
    if (chainOpen(step, t)) return this.start(this.index + 1);
    if (t < step.chainOpen) this.buffered = true;
    return -1;
  }

  tick(t) {
    if (this.index < 0) return -1;
    const step = this.steps[this.index];
    const last = this.index === this.steps.length - 1;
    if (this.buffered && !last && t >= step.chainOpen) return this.start(this.index + 1);
    if (this.buffered && last && t >= step.dur) return this.start(0);
    if (t > (last ? step.dur : Math.max(step.dur, step.chainClose))) this.reset();
    return -1;
  }

  start(i) {
    this.index = i;
    this.buffered = false;
    return i;
  }

  reset() {
    this.index = -1;
    this.buffered = false;
  }
}

/** Does a dash at time t (since it began) make you untouchable? */
export const dashInvulnerable = (dash, t) => t >= dash.iframes[0] && t <= dash.iframes[1];

/** A charged attack's damage: nothing before chargeMin, then rising to full at chargeFull. */
export function heavyDamage(heavy, held) {
  if (held < heavy.chargeMin) return 0;
  const k = Math.min(1, (held - heavy.chargeMin) / (heavy.chargeFull - heavy.chargeMin));
  return Math.round(heavy.dmg[0] + (heavy.dmg[1] - heavy.dmg[0]) * k);
}

/* ------------------------------------------------------------ hits */

export const angleDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

/** Is point (px, py) inside a hit arc from (x, y) facing `angle` (reach in tiles, arc the full opening in radians)? `radius` widens it for the target's body. */
export function inArc(x, y, angle, reach, arc, px, py, radius = 0) {
  const d = Math.hypot(px - x, py - y);
  if (d > reach + radius) return false;
  if (arc >= Math.PI * 2 - 1e-6 || d < radius + 0.2) return true;
  const slack = Math.atan2(radius, Math.max(d, 0.01));
  return angleDiff(Math.atan2(py - y, px - x), angle) <= arc / 2 + slack;
}

/**
 * A blow landing on a target. `hit` = { dmg, angle (the blow's direction of
 * travel), guardBreak, weight }; `target` = { guard, guardMax, guarding,
 * facing, broken (seconds left stunned), stunned }.
 * A guarding target blocks blows from the front (within 75°): the guard soaks
 * them (three times as much from a guard-breaking blow) and, at zero, breaks
 * — the target is stunned for 2 s and takes half again as much. Blows from
 * behind skip the guard and count a quarter more.
 * Returns { damage, blocked, broke, back }.
 */
export function resolveHit(hit, target) {
  const fromAngle = hit.angle + Math.PI; // the blow comes from the opposite way it travels
  const frontal = angleDiff(fromAngle, target.facing ?? 0) < (75 * Math.PI) / 180;
  const back = !frontal && angleDiff(fromAngle, (target.facing ?? 0) + Math.PI) < (60 * Math.PI) / 180;
  let damage = hit.dmg;
  if (target.guarding && frontal && !(target.broken > 0)) {
    const soak = hit.dmg * (hit.guardBreak ? 3 : 1);
    const guard = Math.max(0, (target.guard ?? 0) - soak);
    if (guard > 0) return { damage: Math.round(hit.dmg * 0.1), blocked: true, broke: false, back: false, guard };
    return { damage: Math.round(hit.dmg * 1.5), blocked: false, broke: true, back: false, guard: 0 };
  }
  if (target.broken > 0 || target.stunned > 0) damage *= 1.5;
  else if (back) damage *= 1.25;
  return { damage: Math.round(damage), blocked: false, broke: false, back, guard: target.guard ?? 0 };
}

/** Knockback speed (tiles/s) for a push on a body of some mass. */
export const knockback = (push, mass) => (push * 2.2) / Math.max(0.4, mass);

/** Hit-stop (s) by how hard the blow lands. */
export const HITSTOP = { light: 0.045, heavy: 0.085, kill: 0.07, block: 0.06, boss: 0.12 };
export const hitStopFor = (weight, { kill = false } = {}) => Math.max(HITSTOP[weight] ?? HITSTOP.light, kill ? HITSTOP.kill : 0);

/** Screen shake (tiles) for a blow, nothing when motion is reduced. */
export const shakeFor = (weight, reduced) => (reduced ? 0 : { light: 0.05, heavy: 0.16, kill: 0.1, boss: 0.3, block: 0.06 }[weight] ?? 0.05);

/* ------------------------------------------------------------ slimes */

/**
 * A slime breaking up: a size-3 or size-2 slime becomes two of the next size
 * down, flung apart at right angles to the blow that killed it; a size-1
 * slime is simply gone. `rand` is a seeded random in [0, 1).
 */
export function splitSlime(slime, blowAngle = 0, rand = Math.random) {
  if (slime.size <= 1) return [];
  const size = slime.size - 1;
  const side = blowAngle + Math.PI / 2;
  const out = [];
  for (const s of [-1, 1]) {
    const a = side + (rand() - 0.5) * 0.6;
    const r = SLIME[size].radius + 0.15;
    out.push({
      size,
      hp: SLIME[size].hp,
      x: slime.x + Math.cos(a) * r * s,
      y: slime.y + Math.sin(a) * r * s,
      vx: Math.cos(a) * s * 5 + Math.cos(blowAngle) * 1.5,
      vy: Math.sin(a) * s * 5 + Math.sin(blowAngle) * 1.5
    });
  }
  return out;
}

/** How many slimes one size-n slime ends up as, all told (for clearing a room). */
export const slimeCount = (size) => (size <= 1 ? 1 : 1 + 2 * slimeCount(size - 1));

/* ------------------------------------------------------------ pips, energy, potions */

/** Ammo pips refill one at a time, each taking `recharge` seconds. */
export function rechargePips(state, dt, def) {
  let { pips, timer } = state;
  if (pips >= def.pips) return { pips: def.pips, timer: 0 };
  timer += dt;
  while (timer >= def.recharge && pips < def.pips) {
    timer -= def.recharge;
    pips++;
  }
  if (pips >= def.pips) timer = 0;
  return { pips, timer };
}

export const ENERGY = { perHit: 5, perKill: 9, perSecond: 1.5 };
export const gainEnergy = (energy, max, amount) => Math.max(0, Math.min(max, energy + amount));

/** Drink a potion: there is never a cooldown; only how many you carry limits you. Returns the new { hp, potions } (unchanged if none). */
export function drink(state, heal, maxHp) {
  if (state.potions <= 0 || state.hp >= maxHp) return { hp: state.hp, potions: state.potions, drank: false };
  return { hp: Math.min(maxHp, state.hp + heal), potions: state.potions - 1, drank: true };
}
export const POTIONS_START = 3;
export const POTIONS_MAX = 5;

/* ------------------------------------------------------------ the boss */

/** The Rime Jarl's phase by health left: 1 above two thirds, 2 above a third, 3 below. */
export const jarlPhase = (hp, max) => (hp > max * (2 / 3) ? 1 : hp > max / 3 ? 2 : 3);

/* ------------------------------------------------------------ save */

export const SAVE_VERSION = 2;

export function newSave() {
  return { v: SAVE_VERSION, hero: 'warden', gems: 0, beacons: [], jarl: false, runs: 0, best: 0, settings: { shake: true, sound: 0.8 } };
}

/**
 * Read whatever was stored (a string, an object, junk or nothing) into a
 * valid save of this version. Version 1 kept the hero as `pick` and lit
 * beacons as an object of flags.
 */
export function migrateSave(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const save = newSave();
  if (!data || typeof data !== 'object') return save;
  if ((data.v ?? 1) === 1) {
    if (typeof data.pick === 'string') data.hero = data.pick;
    if (data.beacons && !Array.isArray(data.beacons)) data.beacons = Object.keys(data.beacons).filter((k) => data.beacons[k]);
  }
  if (HEROES[data.hero]) save.hero = data.hero;
  if (Number.isFinite(data.gems)) save.gems = Math.max(0, Math.min(99999, Math.floor(data.gems)));
  if (Array.isArray(data.beacons)) save.beacons = data.beacons.filter((b) => ['garden', 'cloister', 'rampart'].includes(b));
  save.jarl = data.jarl === true;
  if (Number.isFinite(data.runs)) save.runs = Math.max(0, Math.floor(data.runs));
  if (Number.isFinite(data.best)) save.best = Math.max(0, data.best);
  if (data.settings && typeof data.settings === 'object') {
    save.settings.shake = data.settings.shake !== false;
    if (Number.isFinite(data.settings.sound)) save.settings.sound = Math.max(0, Math.min(1, data.settings.sound));
  }
  return save;
}
