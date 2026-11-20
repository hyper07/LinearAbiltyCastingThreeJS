/**
 * Lanternwood — the rules. Stats, damage, the XP curve, enemies and hero
 * monsters, quests across the realms, the people and what they say, the shop,
 * the save (with its migration from older saves) and the Lanternwood forest
 * layout, as plain data and pure functions: no three.js, no DOM, so every
 * rule can be unit-tested. Classes and skills live in classes.js, items in
 * items.js, the realms' layouts in realms.js; all are re-exported here.
 *
 * Coordinates are metres on the ground plane: x east, z south (so "north" is
 * −z, the way the camera looks when a journey starts).
 */
import { CLASSES, SKILLS, classOfOldLook, defaultLook, lookById, LOOKS } from './classes.js';
import { BASES, RARITIES, CONSUMABLES, SLOTS, BAG_SIZE, STACK_MAX, makeItem, addToBag, countOf, takeFromBag, gearTotals, emptyEquip, canUse } from './items.js';
import { WORLD, REALMS, REALM_ORDER, seeded, distToPath, realmUnlocked, resolveIn, areaIn, layoutFlora, realmSolidsOf, spawnsOf } from './realms.js';

export * from './classes.js';
export * from './items.js';
export * from './realms.js';

export const SAVE_KEY = 'gamory.lanternwood.save';
export const SAVE_VERSION = 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;

/* ------------------------------------------------------------- heroes */

/** The old (v1) looks — kept so an old save's choice maps to a class (ember → Blade, moss → Warden, frost → Seer). */
export const HERO_LOOKS = {
  ember: { name: 'Ember', cls: 'blade', cloak: '#b8452e', tunic: '#d9b46a', hair: '#5a3424', trim: '#f0c040' },
  moss: { name: 'Moss', cls: 'warden', cloak: '#3f7a4a', tunic: '#c9a26a', hair: '#e0c070', trim: '#c8e070' },
  frost: { name: 'Frost', cls: 'seer', cloak: '#3c6aa8', tunic: '#d8d0c0', hair: '#aab4cc', trim: '#9ad8ff' }
};
export const HERO_LOOK_ORDER = ['ember', 'moss', 'frost'];

/** XP needed to go from level L to L+1. */
export const xpToNext = (level) => Math.round(40 * level ** 1.6);
export const MAX_LEVEL = 30;

/**
 * The hero's stats at a level: the class's lean on the shared curve, the
 * charms bought from the merchant and the totals of the gear worn.
 * `crit` is a chance (0…1), `spell` and `speed` multipliers, `block` a chance.
 */
export function heroStats(level, bonus = {}, gear = null, cls = 'blade') {
  const L = clamp(Math.floor(level), 1, MAX_LEVEL) - 1;
  const c = CLASSES[cls] ?? CLASSES.blade;
  const k = c.lean;
  const g = gear ?? {};
  return {
    maxHp: Math.round((90 + 22 * L) * k.hp) + 25 * (bonus.hp ?? 0) + (g.hp ?? 0),
    maxMp: (c.resource === 'energy' ? 100 : Math.round((40 + 6 * L) * k.mp)) + (g.mp ?? 0),
    atk: Math.round((12 + 3 * L) * k.atk) + 4 * (bonus.atk ?? 0) + (g.atk ?? 0),
    def: Math.round((3 + Math.floor(1.5 * L)) * k.def) + (g.def ?? 0),
    speed: 6.2 * (1 + clamp(g.speed ?? 0, -40, 60) / 100),
    crit: Math.min(0.75, 0.1 + k.crit + (g.crit ?? 0) / 100),
    spell: 1 + (g.spell ?? 0) / 100,
    block: Math.min(0.5, (g.block ?? 0) / 100),
    leech: Math.min(0.3, (g.leech ?? 0) / 100),
    resource: c.resource
  };
}

/** A hero's stats now: level, charms, gear and any buffs ({ fury, ward, guard } seconds left). */
export function statsOf(hero, buffs = {}) {
  const s = heroStats(hero.level, hero.bonus, gearTotals(hero.equip), hero.cls);
  if (buffs.fury > 0) s.atk = Math.round(s.atk * 1.3);
  if (buffs.ward > 0) s.def = Math.round(s.def * 1.4);
  return s;
}

/** Moves every class shares (the roll), and the old names still used by the HUD. */
export const ABILITIES = {
  slash: { name: 'Slash', key: 'Space', mult: 1, mp: 0, cd: 0.42, range: 2.4, arc: Math.PI * 0.62, knock: 3.2 },
  fireball: { name: 'Fireball', key: '4', mult: SKILLS.fireball.mult, mp: SKILLS.fireball.cost, cd: SKILLS.fireball.cd, speed: 17, range: 22, radius: 1.6, knock: 4 },
  whirl: { name: 'Whirl', key: '2', mult: SKILLS.whirl.mult, mp: SKILLS.whirl.cost, cd: SKILLS.whirl.cd, radius: 3.4, knock: 6 },
  roll: { name: 'Roll', key: 'Shift', cd: 0.75, time: 0.32, speed: 15 }
};

/**
 * Damage from an attack to a defender. `rand` is a 0…1 stream (seeded in
 * tests). Defence takes a share off (never all of it); `critChance` of hits
 * (10 % by default) crit for 1.6×.
 */
export function damage(atk, def, mult = 1, rand = Math.random, critChance = 0.1) {
  const base = atk * mult * (1 - def / (def + 30));
  const crit = rand() < critChance;
  const spread = 0.9 + rand() * 0.2;
  return { amount: Math.max(1, Math.round(base * spread * (crit ? 1.6 : 1))), crit };
}

/** The gear a class starts with (common, item level 1, the same every time). */
export function startingGear(cls) {
  const rand = seeded(cls.length * 31 + 5);
  const equip = emptyEquip();
  for (const [slot, base] of Object.entries(CLASSES[cls].start)) {
    const it = makeItem(base, 'common', 1, rand);
    if (it) {
      it.uid = `start-${cls}-${slot}`;
      equip[BASES[base].slot] = it;
    }
  }
  return equip;
}

/** A fresh hero of a class (or an old look name), at the start of a journey. */
export function newHero(cls = 'blade', lookId = null) {
  const c = classOfOldLook(cls);
  const look = lookById(lookId)?.id && LOOKS[c].some((l) => l.id === lookId) ? lookId : defaultLook(c).id;
  const hero = {
    cls: c,
    look,
    level: 1,
    xp: 0,
    hp: 0,
    mp: 0,
    gold: 20,
    crystals: 0,
    bag: [{ kind: 'hp', n: 2 }, { kind: 'mp', n: 1 }, { kind: 'bread', n: 2 }],
    equip: startingGear(c),
    herbs: 0,
    bonus: { hp: 0, atk: 0 },
    kills: 0,
    deaths: 0
  };
  const s = statsOf(hero);
  hero.hp = s.maxHp;
  hero.mp = s.maxMp;
  return hero;
}

/**
 * Add XP; levels up as many times as it covers. HP and MP grow with the new
 * maximum and are topped up. Returns the hero (changed) and how many levels.
 */
export function gainXp(hero, amount) {
  let levels = 0;
  hero.xp += Math.max(0, Math.round(amount));
  while (hero.level < MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    hero.level += 1;
    levels += 1;
  }
  if (hero.level >= MAX_LEVEL) hero.xp = 0;
  if (levels) {
    const s = statsOf(hero);
    hero.hp = s.maxHp;
    hero.mp = s.maxMp;
  }
  return { hero, levels };
}

export const POTIONS = {
  hp: { name: 'Health potion', heal: (s) => Math.max(50, Math.round(s.maxHp * 0.45)), price: 12 },
  mp: { name: 'Mana potion', heal: (s) => Math.max(25, Math.round(s.maxMp * 0.6)), price: 10 }
};

/** How many of a potion (or any consumable) the hero carries. */
export const potionCount = (hero, kind) => countOf(hero.bag, kind);

/**
 * Drink a potion. There is NO cooldown: every call drinks one, as long as
 * there is one in the bag. Returns how much it restored (0 and `ok: false`
 * when the bag has none).
 */
export function drinkPotion(hero, kind) {
  const p = POTIONS[kind];
  if (!p || countOf(hero.bag, kind) <= 0) return { ok: false, restored: 0 };
  const s = statsOf(hero);
  takeFromBag(hero.bag, kind, 1);
  const key = kind === 'hp' ? 'hp' : 'mp';
  const max = kind === 'hp' ? s.maxHp : s.maxMp;
  const before = hero[key];
  hero[key] = Math.min(max, hero[key] + p.heal(s));
  return { ok: true, restored: hero[key] - before };
}

/**
 * Use a consumable from the bag (food heals over time, scrolls buff or take
 * you home): takes one and says what it does — the game applies the effect.
 */
export function useConsumable(hero, kind) {
  if (!CONSUMABLES[kind] || countOf(hero.bag, kind) <= 0) return { ok: false };
  if (kind === 'hp' || kind === 'mp') return { ...drinkPotion(hero, kind), effect: kind };
  takeFromBag(hero.bag, kind, 1);
  const s = statsOf(hero);
  if (kind === 'bread') return { ok: true, effect: 'regen', amount: s.maxHp * 0.4, time: 8 };
  if (kind === 'stew') return { ok: true, effect: 'regen', amount: s.maxHp * 0.8, time: 10 };
  if (kind === 'scroll-fury') return { ok: true, effect: 'fury', time: 30 };
  if (kind === 'scroll-ward') return { ok: true, effect: 'ward', time: 30 };
  return { ok: true, effect: 'return' };
}

/** Dying: back to the waystone (or the campfire), full health, a tenth of the gold lost. */
export function deathPenalty(hero) {
  const lost = Math.floor(hero.gold * 0.1);
  hero.gold -= lost;
  const s = statsOf(hero);
  hero.hp = s.maxHp;
  hero.mp = s.maxMp;
  hero.deaths += 1;
  return lost;
}

/* -------------------------------------------------------------- shop */

/** What the general merchants sell besides gear: consumables for gold, charms for crystals. */
export const SHOP = [
  { id: 'hp', name: 'Health potion', note: 'Restores about half your health.', price: 12, currency: 'gold' },
  { id: 'mp', name: 'Mana potion', note: 'Restores most of your mana or energy.', price: 10, currency: 'gold' },
  { id: 'bread', name: 'Hearth bread', note: 'Heals over a few seconds.', price: 6, currency: 'gold' },
  { id: 'scroll-return', name: 'Scroll of return', note: 'Back to the waystone.', price: 20, currency: 'gold' },
  { id: 'charm-hp', name: 'Hearth charm', note: '+25 maximum health. Up to 3.', price: 4, currency: 'crystals', max: 3 },
  { id: 'charm-atk', name: 'Ember edge', note: '+4 attack. Up to 3.', price: 4, currency: 'crystals', max: 3 }
];

/** Buy one of a shop line. Returns { ok, reason }. */
export function buy(hero, id) {
  const item = SHOP.find((s) => s.id === id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (hero[item.currency] < item.price) return { ok: false, reason: item.currency === 'gold' ? 'Not enough gold.' : 'Not enough crystals.' };
  if (id === 'charm-hp' && hero.bonus.hp >= item.max) return { ok: false, reason: 'You already wear three.' };
  if (id === 'charm-atk' && hero.bonus.atk >= item.max) return { ok: false, reason: 'Your blade cannot take more.' };
  if (CONSUMABLES[id]) {
    const r = addToBag(hero.bag, { kind: id, n: 1 });
    if (!r.ok) return { ok: false, reason: r.reason };
  } else if (id === 'charm-hp') {
    hero.bonus.hp += 1;
    hero.hp += 25;
  } else if (id === 'charm-atk') hero.bonus.atk += 1;
  hero[item.currency] -= item.price;
  return { ok: true };
}

/* ----------------------------------------------------------- enemies */

/**
 * Enemy kinds. `attack` is the behaviour (see the game's enemy AI): hop, lunge,
 * orb (ranged), swarm (fast biters in packs), shield (a tank that blocks from
 * the front and slams), charge (a long telegraphed rush), burrow (digs under
 * and erupts beneath you), heal (mends its friends), volley (a fan of shots),
 * swoop (a flier that dives), bomb (runs in and bursts), nova (a ring round
 * itself), pyre (calls fire down on you), boss (phases and moves).
 * `sight` notice range, `leash` how far from home it follows, `reach` attack
 * range, `windup` the telegraph, `cooldown` after a strike, `respawn` seconds.
 * `rig` people-shaped ones walk on jointed legs (rig.js).
 */
export const ENEMIES = {
  // Lanternwood
  slime: { name: 'Gloomslime', realm: 'lanternwood', level: 1, hp: 34, atk: 9, def: 1, speed: 2.6, wander: 1.2, sight: 8, leash: 16, reach: 2.4, windup: 0.65, cooldown: 1.1, attack: 'hop', radius: 0.55, xp: 14, gold: [2, 5], crystal: 0.08, potion: 0.08, respawn: 28, height: 0.9 },
  wolf: { name: 'Ashwolf', realm: 'lanternwood', level: 3, hp: 70, atk: 15, def: 3, speed: 5.4, wander: 1.8, sight: 11, leash: 20, reach: 4, windup: 0.5, cooldown: 1.3, attack: 'lunge', radius: 0.7, xp: 30, gold: [4, 9], crystal: 0.15, potion: 0.1, respawn: 32, height: 1.1 },
  wisp: { name: 'Lampwisp', realm: 'lanternwood', level: 4, hp: 55, atk: 17, def: 2, speed: 3.4, wander: 1.4, sight: 13, leash: 22, reach: 9, keep: 6, windup: 0.85, cooldown: 1.6, attack: 'orb', radius: 0.55, xp: 36, gold: [5, 10], crystal: 0.25, potion: 0.12, respawn: 34, height: 1.0, float: 1.1 },
  thornling: { name: 'Thornling', realm: 'lanternwood', level: 5, hp: 40, atk: 13, def: 1, speed: 5.0, wander: 1.6, sight: 10, leash: 22, reach: 1.9, windup: 0.4, cooldown: 0.9, attack: 'swarm', radius: 0.42, xp: 22, gold: [3, 7], crystal: 0.08, potion: 0.06, respawn: 24, height: 0.8 },
  mossback: { name: 'Mossback', realm: 'lanternwood', level: 6, hp: 190, atk: 21, def: 10, speed: 2.2, wander: 0.8, sight: 9, leash: 18, reach: 3.0, windup: 1.0, cooldown: 1.8, attack: 'shield', radius: 1.0, xp: 62, gold: [8, 16], crystal: 0.25, potion: 0.15, respawn: 40, height: 1.4 },
  lampwight: { name: 'The Lampwight', realm: 'lanternwood', level: 7, hp: 1400, atk: 24, def: 6, speed: 2.8, wander: 0, sight: 30, leash: 32, reach: 3.6, windup: 1.0, cooldown: 1.2, attack: 'boss', radius: 1.4, xp: 400, gold: [120, 120], crystal: 1, crystals: 5, potion: 1, respawn: Infinity, height: 3.4, boss: true, moves: ['slam', 'volley'], summon: 'wisp', light: '#6ad8ff' },
  // Sunmeadow Hills
  burrowmole: { name: 'Burrowmole', realm: 'sunmeadow', level: 8, hp: 130, atk: 25, def: 5, speed: 3.0, wander: 1.0, sight: 13, leash: 28, reach: 2.4, windup: 0.8, cooldown: 2.0, attack: 'burrow', radius: 0.7, xp: 72, gold: [9, 18], crystal: 0.18, potion: 0.1, respawn: 32, height: 1.0 },
  hornet: { name: 'Honeyhornet', realm: 'sunmeadow', level: 8, hp: 62, atk: 18, def: 3, speed: 6.0, wander: 2.0, sight: 12, leash: 26, reach: 2.0, windup: 0.4, cooldown: 1.0, attack: 'swarm', radius: 0.45, xp: 40, gold: [5, 11], crystal: 0.1, potion: 0.06, respawn: 24, height: 0.8, float: 1.3 },
  thornboar: { name: 'Thornboar', realm: 'sunmeadow', level: 9, hp: 220, atk: 32, def: 7, speed: 3.4, wander: 1.4, sight: 15, leash: 30, reach: 12, windup: 0.95, cooldown: 2.2, attack: 'charge', radius: 1.0, xp: 96, gold: [12, 22], crystal: 0.2, potion: 0.12, respawn: 36, height: 1.3 },
  shroomkin: { name: 'Shroomkin Mender', realm: 'sunmeadow', level: 9, hp: 150, atk: 16, def: 5, speed: 2.6, wander: 1.0, sight: 13, leash: 24, reach: 9, keep: 7, windup: 0.9, cooldown: 3.0, attack: 'heal', radius: 0.7, xp: 88, gold: [10, 20], crystal: 0.25, potion: 0.15, respawn: 38, height: 1.3 },
  gnarlroot: { name: 'Old Gnarlroot', realm: 'sunmeadow', level: 12, hp: 3600, atk: 40, def: 12, speed: 2.4, wander: 0, sight: 28, leash: 34, reach: 4, windup: 1.0, cooldown: 1.3, attack: 'boss', radius: 1.9, xp: 1400, gold: [260, 260], crystal: 1, crystals: 8, potion: 1, respawn: 600, height: 5, boss: true, moves: ['slam', 'roots', 'charge'], summon: 'hornet', light: '#ffd27a' },
  // Frostpeak Hollows
  shardling: { name: 'Shardling', realm: 'frostpeak', level: 13, hp: 160, atk: 30, def: 6, speed: 3.2, wander: 1.0, sight: 15, leash: 28, reach: 12, keep: 9, windup: 0.85, cooldown: 2.0, attack: 'volley', radius: 0.6, xp: 122, gold: [14, 26], crystal: 0.25, potion: 0.12, respawn: 34, height: 1.2, float: 0.4 },
  rimeguard: { name: 'Rimeguard', realm: 'frostpeak', level: 14, hp: 420, atk: 42, def: 18, speed: 2.8, wander: 0.8, sight: 12, leash: 24, reach: 2.9, windup: 1.0, cooldown: 1.8, attack: 'shield', radius: 0.8, xp: 172, gold: [18, 32], crystal: 0.3, potion: 0.15, respawn: 42, height: 1.7, rig: true },
  icefang: { name: 'Icefang', realm: 'frostpeak', level: 13, hp: 220, atk: 36, def: 8, speed: 5.9, wander: 1.8, sight: 14, leash: 28, reach: 4.2, windup: 0.5, cooldown: 1.4, attack: 'lunge', radius: 0.75, xp: 120, gold: [12, 24], crystal: 0.18, potion: 0.1, respawn: 32, height: 1.2 },
  frostbat: { name: 'Frostbat', realm: 'frostpeak', level: 13, hp: 120, atk: 28, def: 4, speed: 6.4, wander: 2.4, sight: 14, leash: 28, reach: 7, windup: 0.6, cooldown: 1.6, attack: 'swoop', radius: 0.5, xp: 96, gold: [10, 20], crystal: 0.16, potion: 0.08, respawn: 28, height: 0.9, float: 2.4 },
  matron: { name: 'The Rime Matron', realm: 'frostpeak', level: 17, hp: 6400, atk: 52, def: 18, speed: 2.6, wander: 0, sight: 28, leash: 34, reach: 4, windup: 1.0, cooldown: 1.2, attack: 'boss', radius: 1.6, xp: 3000, gold: [420, 420], crystal: 1, crystals: 10, potion: 1, respawn: 600, height: 4, boss: true, rig: true, moves: ['volley', 'nova', 'rain'], summon: 'shardling', light: '#9ae8ff' },
  // Emberfall Caldera
  cinderling: { name: 'Cinderling', realm: 'emberfall', level: 18, hp: 170, atk: 58, def: 6, speed: 5.4, wander: 1.8, sight: 13, leash: 28, reach: 1.7, windup: 0.7, cooldown: 2.0, attack: 'bomb', radius: 0.5, xp: 132, gold: [16, 30], crystal: 0.2, potion: 0.1, respawn: 26, height: 0.9 },
  golem: { name: 'Magma Golem', realm: 'emberfall', level: 19, hp: 760, atk: 64, def: 26, speed: 2.0, wander: 0.7, sight: 12, leash: 24, reach: 4.6, windup: 1.2, cooldown: 2.4, attack: 'nova', radius: 1.3, xp: 262, gold: [26, 44], crystal: 0.4, potion: 0.18, respawn: 46, height: 2.2 },
  acolyte: { name: 'Pyre Acolyte', realm: 'emberfall', level: 19, hp: 320, atk: 50, def: 10, speed: 3.0, wander: 1.0, sight: 16, leash: 28, reach: 13, keep: 9, windup: 0.9, cooldown: 2.0, attack: 'pyre', radius: 0.6, xp: 204, gold: [20, 36], crystal: 0.3, potion: 0.14, respawn: 38, height: 1.6, rig: true },
  salamander: { name: 'Lava Salamander', realm: 'emberfall', level: 20, hp: 380, atk: 58, def: 12, speed: 4.0, wander: 1.4, sight: 15, leash: 30, reach: 2.6, windup: 0.8, cooldown: 2.0, attack: 'burrow', radius: 0.9, xp: 224, gold: [22, 40], crystal: 0.3, potion: 0.12, respawn: 36, height: 1.0 },
  tyrant: { name: 'The Cinder Tyrant', realm: 'emberfall', level: 22, hp: 9800, atk: 70, def: 24, speed: 2.8, wander: 0, sight: 30, leash: 36, reach: 4.5, windup: 1.0, cooldown: 1.2, attack: 'boss', radius: 2.2, xp: 6000, gold: [700, 700], crystal: 1, crystals: 14, potion: 1, respawn: 600, height: 5, boss: true, moves: ['breath', 'rain', 'charge', 'slam'], summon: 'cinderling', light: '#ff8a3a' }
};

/** What an enemy drops when it dies besides gear (rand: a 0…1 stream). Elites give more. */
export function rollDrops(kind, rand = Math.random, { elite = false } = {}) {
  const e = ENEMIES[kind];
  let gold = e.gold[0] + Math.floor(rand() * (e.gold[1] - e.gold[0] + 1));
  let crystals = e.crystals ?? (rand() < e.crystal ? 1 : 0);
  const potion = rand() < e.potion ? (rand() < 0.6 ? 'hp' : 'mp') : null;
  let xp = e.xp;
  if (elite) {
    gold *= 4;
    crystals += 1;
    xp *= 4;
  }
  return { gold, crystals, potion, xp };
}

/**
 * Hero monsters (elites): bigger, glowing, named, with an affix or two.
 * Each affix changes how they fight; their stats come from eliteStats().
 */
export const ELITE_AFFIXES = {
  frenzied: { name: 'Frenzied', color: '#ff5a3a', desc: 'Faster, and strikes with little warning.' },
  shielded: { name: 'Shielded', color: '#7ad8ff', desc: 'A ward soaks up damage, and comes back.' },
  splitting: { name: 'Splitting', color: '#9aff6a', desc: 'Splits into smaller copies when beaten.' },
  burning: { name: 'Burning', color: '#ff8a2a', desc: 'Scorches everything close to it.' },
  chilling: { name: 'Chilling', color: '#a8e8ff', desc: 'Its hits slow you.' },
  vampiric: { name: 'Vampiric', color: '#e0405a', desc: 'Heals when it hurts you.' }
};
export const AFFIX_ORDER = Object.keys(ELITE_AFFIXES);

/** Pick `n` different affixes (seeded in tests). */
export function rollAffixes(rand = Math.random, n = 1) {
  const pool = [...AFFIX_ORDER];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

/** An elite's numbers from its kind and affixes. */
export function eliteStats(def, affixes = []) {
  const fr = affixes.includes('frenzied');
  return {
    hp: Math.round(def.hp * 3.5),
    atk: Math.round(def.atk * 1.35),
    def: Math.round(def.def * 1.3),
    speed: def.speed * (fr ? 1.4 : 1.05),
    windup: Math.max(0.4, def.windup * (fr ? 0.7 : 0.9)),
    cooldown: def.cooldown * (fr ? 0.6 : 0.9),
    shield: affixes.includes('shielded') ? Math.round(def.hp * 3.5 * 0.35) : 0,
    split: affixes.includes('splitting') ? 2 : 0,
    aura: affixes.includes('burning') ? 2.6 : 0,
    chill: affixes.includes('chilling') ? 0.5 : 0,
    leech: affixes.includes('vampiric') ? 0.5 : 0,
    scale: 1.4,
    xp: def.xp * 4
  };
}

/** The name an elite goes by: its own, or its affixes before its kind. */
export const eliteName = (kind, affixes, name = null) => name ?? `${affixes.map((a) => ELITE_AFFIXES[a].name).join(' ')} ${ENEMIES[kind].name.replace(/^The /, '')}`;

/** A boss's hit points with a party: more players, more to chew through. */
export const bossHp = (kind, players = 1) => Math.round(ENEMIES[kind].hp * (1 + 0.6 * Math.max(0, players - 1)));

/** A boss's phase from its health: 0 above two thirds, 1 above a third, 2 below. */
export const bossPhase = (hp, max) => (hp / max < 0.34 ? 2 : hp / max < 0.67 ? 1 : 0);

/* ------------------------------------------------------------ quests */

/**
 * The quests. `requires` the quests that must be done before this one opens
 * (an `auto` quest starts at once); `realm` and `area` where it leads; `goal`
 * what counts: kill a kind, gather a thing, light a brazier, or beat any
 * hero monster (elite) in a realm.
 */
export const QUESTS = [
  {
    id: 'embers', name: 'Embers for the Hearth', giver: 'wren', realm: 'lanternwood', area: 'glade', requires: [],
    goal: { type: 'gather', target: 'herb', count: 6 },
    brief: 'Gather 6 glowing ember-herbs in the woods along the north path and around Glowmoss Glade.',
    reward: { xp: 60, gold: 30, potions: { hp: 2 } }
  },
  {
    id: 'slimes', name: 'Gloom in the Glade', giver: 'odile', realm: 'lanternwood', area: 'glade', requires: ['embers'],
    goal: { type: 'kill', target: 'slime', count: 6 },
    brief: 'Clear 6 gloomslimes out of Glowmoss Glade, north of camp.',
    reward: { xp: 120, gold: 45, crystals: 1 }
  },
  {
    id: 'wolves', name: 'The Howling Hollow', giver: 'tamsin', realm: 'lanternwood', area: 'hollow', requires: ['slimes'],
    goal: { type: 'kill', target: 'wolf', count: 5 },
    brief: 'Drive off 5 ashwolves in the Howling Hollow, east of camp.',
    reward: { xp: 220, gold: 60, crystals: 2, potions: { mp: 2 } }
  },
  {
    id: 'braziers', name: 'Old Fires of Greyvault', giver: 'odile', realm: 'lanternwood', area: 'ruins', requires: ['wolves'],
    goal: { type: 'light', target: 'brazier', count: 3 },
    brief: 'Light the 3 old braziers in the Greyvault Ruins, west of camp. Lampwisps guard them.',
    reward: { xp: 300, gold: 80, crystals: 2 }
  },
  {
    id: 'lampwight', name: 'The Lampwight', giver: 'odile', realm: 'lanternwood', area: 'ruins', auto: true, requires: ['braziers'],
    goal: { type: 'kill', target: 'lampwight', count: 1 },
    brief: 'Defeat the Lampwight in the heart of Greyvault, then tell Warden Odile.',
    reward: { xp: 600, gold: 150, crystals: 3 }
  },
  {
    id: 'bramble', name: 'Thorns at the Door', giver: 'bryn', realm: 'lanternwood', area: 'bramble', requires: ['embers'],
    goal: { type: 'kill', target: 'thornling', count: 8 },
    brief: 'Cut back 8 thornlings in Bramblehollow, far to the north-west.',
    reward: { xp: 180, gold: 50, crystals: 1, item: 'rare' },
    lines: {
      offer: ['Bryn, smith of the camp. You have a weapon arm — good.', 'Thornlings are creeping out of Bramblehollow, north-west past the glade. They chew through my charcoal.', 'Cut back eight of them and I will forge you something worth carrying.'],
      active: ['Bramblehollow is north-west, past Glowmoss Glade. Thornlings come in swarms — keep moving.'],
      ready: ['Eight! The charcoal is safe. Here — fresh off the anvil.']
    }
  },
  // Sunmeadow Hills
  {
    id: 'moles', name: 'Moles in the Barley', giver: 'bram', realm: 'sunmeadow', area: 'barley', requires: ['wolves'],
    goal: { type: 'kill', target: 'burrowmole', count: 6 },
    brief: 'Drive 6 burrowmoles out of the Barley Fields, east of the hamlet. Watch for the ground cracking under you.',
    reward: { xp: 500, gold: 90, crystals: 1 },
    lines: {
      offer: ['A stranger through the waystone? Then you are a lucky one. I am Bram; I farm what the moles leave me.', 'Burrowmoles are tunnelling the Barley Fields to the east. They come up right under your boots.', 'When the dirt cracks round your feet — roll! Get six of them for me.'],
      active: ['The Barley Fields are east. When the ground cracks, move.'],
      ready: ['Quiet fields! You can hear the barley again. Take this, with my thanks.']
    }
  },
  {
    id: 'petals', name: 'Sunpetals for Ivy', giver: 'ivy', realm: 'sunmeadow', area: 'rings', requires: ['moles'],
    goal: { type: 'gather', target: 'sunpetal', count: 6 },
    brief: 'Pick 6 sunpetals near the Fairy Rings (south-east) and Boar Run (south-west).',
    reward: { xp: 560, gold: 80, potions: { hp: 3 } },
    lines: {
      offer: ['Ivy, herbalist. My salves need sunpetals, and the menders guard the best of them.', 'They grow by the Fairy Rings to the south-east, and on Boar Run to the south-west. Bring me six.'],
      active: ['Sunpetals glow gold. Fairy Rings, south-east; Boar Run, south-west. Kill the menders first — they heal the others.'],
      ready: ['Six, and not a petal bruised. These will become a lot of potions — here are some.']
    }
  },
  {
    id: 'hornets', name: 'The Hornet Hum', giver: 'ivy', realm: 'sunmeadow', area: 'hive', requires: ['petals'],
    goal: { type: 'kill', target: 'hornet', count: 10 },
    brief: 'Swat 10 honeyhornets in Hivewood, north-west of the hamlet.',
    reward: { xp: 640, gold: 110, crystals: 2 },
    lines: {
      offer: ['The honeyhornets in Hivewood have gone mad. Something under the grove is stirring them up.', 'Thin them out — ten should do it. They swarm, so fight with your back to a tree.'],
      active: ['Hivewood is north-west. Hornets swarm: whirl, nova or volley them.'],
      ready: ['The hum has dropped. But listen... the north grove is creaking.']
    }
  },
  {
    id: 'champion', name: 'A Champion of the Hills', giver: 'bram', realm: 'sunmeadow', area: 'boarrun', requires: ['hornets'],
    goal: { type: 'elite', target: 'sunmeadow', count: 1 },
    brief: 'Defeat a hero monster in Sunmeadow — Queen Zzara, Bristleback or Old Digger (they glow and carry names).',
    reward: { xp: 700, gold: 140, crystals: 2, item: 'epic' },
    lines: {
      offer: ['Every season a few beasts grow too big — glowing, with names on them. Hero monsters, my gran called them.', 'Bristleback on Boar Run, Old Digger in the barley, Queen Zzara in Hivewood. Bring one down.'],
      active: ['Hero monsters glow and carry a name. They hit hard and drop good things.'],
      ready: ['You beat a named one! The hills will sing about this one. Take it — it was my grandad’s.']
    }
  },
  {
    id: 'gnarlroot', name: 'Old Gnarlroot', giver: 'bram', realm: 'sunmeadow', area: 'grove', auto: true, requires: ['champion'],
    goal: { type: 'kill', target: 'gnarlroot', count: 1 },
    brief: 'Something ancient wakes in Gnarlroot Grove, far north. Defeat Old Gnarlroot.',
    reward: { xp: 1400, gold: 260, crystals: 4 },
    lines: { ready: ['The old tree has fallen silent. The waystone hums — something colder calls from beyond it.'], active: ['Gnarlroot Grove is at the north end of the hills. Its roots break from the ground — watch the cracks.'] }
  },
  // Frostpeak Hollows
  {
    id: 'shards', name: 'Shards in the Snow', giver: 'hroa', realm: 'frostpeak', area: 'shards', requires: ['gnarlroot'],
    goal: { type: 'kill', target: 'shardling', count: 6 },
    brief: 'Shatter 6 shardlings in the Shard Fields, north-east of Rimehold.',
    reward: { xp: 1300, gold: 160, crystals: 2 },
    lines: {
      offer: ['Halt. You came through the waystone? Then the warmth of the south is on your cloak. I am Hroa, sentinel of Rimehold.', 'Shardlings throw ice like arrows from the Shard Fields, north-east. Six of them, and the road is ours again.'],
      active: ['Shardlings fire fans of ice. Close in fast, or dodge sideways through the gaps.'],
      ready: ['Six shattered. Rimehold will sleep tonight.']
    }
  },
  {
    id: 'lilies', name: 'Frost Lilies', giver: 'pip', realm: 'frostpeak', area: 'caves', requires: ['shards'],
    goal: { type: 'gather', target: 'frostlily', count: 5 },
    brief: 'Pick 5 frost lilies by Batwing Caverns (south-west) or Mirror Lake (south-east).',
    reward: { xp: 1400, gold: 150, potions: { hp: 3, mp: 2 } },
    lines: {
      offer: ['Pip! Climber, trader, and very cold. I brew lily tea for the sentinels.', 'Frost lilies grow by Batwing Caverns and Mirror Lake. Five, please — the bats bite, mind.'],
      active: ['Lilies glow pale blue. Caverns south-west, lake south-east.'],
      ready: ['Five lilies! Tea for a month. Take these for your trouble.']
    }
  },
  {
    id: 'garrison', name: 'The Frozen Garrison', giver: 'hroa', realm: 'frostpeak', area: 'garrison', requires: ['lilies'],
    goal: { type: 'kill', target: 'rimeguard', count: 4 },
    brief: 'Break 4 rimeguards in the Frozen Garrison, north-west. Their shields stop blows from the front.',
    reward: { xp: 1600, gold: 200, crystals: 3, item: 'rare' },
    lines: {
      offer: ['The old garrison froze with its soldiers inside. Now the rimeguards march again — for her.', 'Their shields turn a blade from the front. Get round them, or hit them as they slam. Break four.'],
      active: ['Rimeguards block from the front. Strike their backs, or after their slam.'],
      ready: ['Four. The Matron will feel that. She will come for you now — go to her first.']
    }
  },
  {
    id: 'matron', name: 'The Rime Matron', giver: 'hroa', realm: 'frostpeak', area: 'throne', auto: true, requires: ['garrison'],
    goal: { type: 'kill', target: 'matron', count: 1 },
    brief: 'Climb to the Matron’s Throne in the far north and defeat the Rime Matron.',
    reward: { xp: 3000, gold: 400, crystals: 5 },
    lines: { ready: ['The Matron is gone, and the aurora is warm. Beyond the waystone, ash is falling — the last fire.'], active: ['The Throne is at the north end. She freezes the ground — keep moving.'] }
  },
  // Emberfall Caldera
  {
    id: 'vents', name: 'Cinders on the Wind', giver: 'sel', realm: 'emberfall', area: 'vents', requires: ['matron'],
    goal: { type: 'kill', target: 'cinderling', count: 10 },
    brief: 'Snuff out 10 cinderlings at the Cinder Vents, north-east of Cinderforge. They burst when they reach you.',
    reward: { xp: 2600, gold: 260, crystals: 3 },
    lines: {
      offer: ['Breathe slowly, traveller; the air bites. I am Sel, of the ash-monks.', 'Cinderlings pour from the vents north-east. They run at you and burst — strike them early, or roll away from the ring.', 'Snuff out ten.'],
      active: ['A cinderling glows brighter before it bursts. Roll out of the ring.'],
      ready: ['Ten fewer fires. The monks thank you.']
    }
  },
  {
    id: 'golems', name: 'Hearts of Slag', giver: 'korra', realm: 'emberfall', area: 'quarry', requires: ['vents'],
    goal: { type: 'kill', target: 'golem', count: 3 },
    brief: 'Topple 3 magma golems in the Golem Quarry, north-west.',
    reward: { xp: 2900, gold: 320, crystals: 3, item: 'epic' },
    lines: {
      offer: ['Korra. I forge with what the caldera gives. Lately it gives golems.', 'They pound the ground in a ring — step out when it glows. Topple three in the quarry, north-west, and I will make you something fine.'],
      active: ['The Golem Quarry is north-west. Step out of the glowing ring.'],
      ready: ['Slag hearts, still warm. Here — I made this while you were out.']
    }
  },
  {
    id: 'stones', name: 'Emberstones', giver: 'sel', realm: 'emberfall', area: 'flows', requires: ['golems'],
    goal: { type: 'gather', target: 'emberstone', count: 6 },
    brief: 'Gather 6 emberstones round the vents, the quarry, the temple and the lava flows.',
    reward: { xp: 3000, gold: 300, potions: { hp: 4, mp: 3 } },
    lines: {
      offer: ['To face the Tyrant you need wards. Wards need emberstones.', 'They lie by the vents, the quarry, the temple and the flows. Six will do.'],
      active: ['Emberstones glow red-gold. Look round all four corners of the caldera.'],
      ready: ['Six stones. The wards are ready. Now — the Crown.']
    }
  },
  {
    id: 'tyrant', name: 'The Cinder Tyrant', giver: 'sel', realm: 'emberfall', area: 'crown', auto: true, requires: ['stones'],
    goal: { type: 'kill', target: 'tyrant', count: 1 },
    brief: 'Climb the Caldera Crown in the far north and defeat the Cinder Tyrant.',
    reward: { xp: 6000, gold: 800, crystals: 8 },
    lines: { ready: ['The Tyrant is ash. Every realm the waystones touch is free tonight. Thank you, Wayfarer.'], active: ['The Crown is north. Its breath is a cone of fire — get behind it.'] }
  }
];
export const questById = (id) => QUESTS.find((q) => q.id === id);

/** Quest states: locked → available → active → ready (goal met) → done. */
export function newQuestLog() {
  const log = {};
  for (const q of QUESTS) log[q.id] = { state: q.requires.length ? 'locked' : 'available', progress: 0 };
  return log;
}

/** Open every locked quest whose requirements are all done (an auto one starts at once). Returns the ids opened. */
export function refreshUnlocks(log) {
  const opened = [];
  for (const q of QUESTS) {
    if (log[q.id].state !== 'locked') continue;
    if (q.requires.every((r) => log[r]?.state === 'done')) {
      log[q.id].state = q.auto ? 'active' : 'available';
      opened.push(q.id);
    }
  }
  return opened;
}

/** Accept an available quest. */
export function acceptQuest(log, id) {
  const entry = log[id];
  if (!entry || entry.state !== 'available') return false;
  entry.state = 'active';
  entry.progress = 0;
  return true;
}

/**
 * Something happened in the world (an enemy died, a herb was picked, a
 * brazier lit, an elite fell in a realm): advance every active quest it
 * counts for. Returns the ids of quests that just became ready to hand in.
 */
export function questEvent(log, type, target, n = 1) {
  const ready = [];
  for (const q of QUESTS) {
    const entry = log[q.id];
    if (entry.state !== 'active' || q.goal.type !== type || q.goal.target !== target) continue;
    entry.progress = Math.min(q.goal.count, entry.progress + n);
    if (entry.progress >= q.goal.count) {
      entry.state = 'ready';
      ready.push(q.id);
    }
  }
  return ready;
}

/**
 * Hand in a ready quest: rewards go to the hero (potions into the bag; an
 * `item` reward is the rarity of a piece of gear the game makes), the quests
 * it opens open. Returns the reward (with `levels` and `opened`), or null.
 */
export function completeQuest(log, hero, id) {
  const entry = log[id];
  const q = questById(id);
  if (!entry || !q || entry.state !== 'ready') return null;
  entry.state = 'done';
  const r = q.reward;
  hero.gold += r.gold ?? 0;
  hero.crystals += r.crystals ?? 0;
  for (const [k, v] of Object.entries(r.potions ?? {})) addToBag(hero.bag, { kind: k, n: v });
  const { levels } = gainXp(hero, r.xp ?? 0);
  const opened = refreshUnlocks(log);
  return { ...r, levels, opened };
}

/** The quest being followed (first active or ready) — in a realm, if one is given. */
export function currentQuest(log, realm = null) {
  const pick = (q) => (log[q.id].state === 'active' || log[q.id].state === 'ready') && (!realm || q.realm === realm);
  const q = QUESTS.find(pick) ?? (realm ? QUESTS.find((x) => log[x.id].state === 'active' || log[x.id].state === 'ready') : null);
  return q ? { quest: q, ...log[q.id] } : null;
}

export const questsDone = (log, realm = null) => QUESTS.filter((q) => (!realm || q.realm === realm) && log[q.id].state === 'done').length;
export const questsIn = (realm) => QUESTS.filter((q) => q.realm === realm);
export const journeyOver = (log) => log.lampwight.state === 'done';

/** What marker floats over an NPC: '!' a quest to take, '?' one to hand in, 'shop', or null. */
export function npcMarker(log, npcId) {
  if (QUESTS.some((q) => q.giver === npcId && log[q.id].state === 'ready')) return '?';
  if (QUESTS.some((q) => q.giver === npcId && log[q.id].state === 'available')) return '!';
  if (NPCS[npcId]?.shop) return 'shop';
  return null;
}

/* ----------------------------------------------------------- the cast */

/**
 * The people of every realm. `shop` 'general' (consumables, charms, a little
 * gear) or 'smith' (weapons and armour); `child` they are small. People with
 * a `look` are drawn from it (sprites.js builds their letter map: face, hair,
 * clothes) and wear its `gear`; the camp's first four have hand-drawn maps.
 */
export const NPCS = {
  odile: { name: 'Warden Odile', role: 'Keeper of the camp', realm: 'lanternwood', x: -3.2, z: -2.6, face: 0.8 },
  wren: { name: 'Sister Wren', role: 'Healer', realm: 'lanternwood', x: -8.4, z: 5.4, face: 2.2 },
  pell: { name: 'Pell', role: 'Peddler', realm: 'lanternwood', x: 8.8, z: 3.6, face: -1.9, shop: 'general' },
  tamsin: { name: 'Tamsin', role: 'Young scout', realm: 'lanternwood', x: 3.6, z: -9.2, face: -0.4 },
  bryn: {
    name: 'Bryn', role: 'Blacksmith', realm: 'lanternwood', x: -14.5, z: -2.2, face: 1.4, shop: 'smith',
    look: { wear: [['band', '#a83a2a']], sex: 'f', skin: 3, hair: 'bun', hairColor: '#2a1a14', eyes: 'narrow', build: 'broad', cloth: '#5a4a3a', tunic: '#8a6a4a', trim: '#c08040', outfit: 'apron', gear: { weapon: { type: 'mace', shape: 'hammer', color: '#8a8a90' } } },
    lines: ['Steel is honest. It does what you ask, no more.', 'Bring me what you find out there — I buy anything with an edge.']
  },
  kit: {
    name: 'Kit', role: 'Camp child', realm: 'lanternwood', x: 4.6, z: 6.4, face: 3.0, child: true,
    look: { wear: [['scarf', '#e05a4a']], sex: 'm', skin: 1, hair: 'curly', hairColor: '#c86a3a', eyes: 'wide', build: 'slim', cloth: '#4a7a9a', tunic: '#e0c890', trim: '#f0d060' },
    lines: ['Are you a real Wayfarer? Can I hold your sword? No? Okay.', 'Tamsin says the waystone south of camp hums at night. I am not scared. A bit scared.']
  },
  hob: {
    name: 'Old Hob', role: 'Waystone keeper', realm: 'lanternwood', x: -5.2, z: 46, face: 0.6,
    look: { elder: true, sex: 'm', skin: 2, hair: 'bald', hairColor: '#d8d8d8', eyes: 'dot', build: 'slim', beard: 'beard', cloth: '#5a5a7a', tunic: '#a8a0b8', trim: '#c0b0e0', outfit: 'robe', gear: { weapon: { type: 'staff', color: '#6a4a2a' } } },
    lines: ['The waystone links the realms, child. Touch it (F) and it shows you where it can take you.', 'It wakes one realm at a time, as the world needs you. Sunmeadow first — once the Hollow is quiet.']
  },
  // Sunmeadow
  bram: { name: 'Farmer Bram', role: 'Hamlet elder', realm: 'sunmeadow', x: -6, z: -4, face: 0.6, look: { elder: true, wear: [['scarf', '#c8a050']], sex: 'm', skin: 1, hair: 'short', hairColor: '#8a6a3a', eyes: 'dot', build: 'broad', beard: 'beard', cloth: '#6a8a3a', tunic: '#d8c890', trim: '#e0b040', gear: { head: { shape: 'cap', color: '#a87a3a' } } }, lines: ['Sun’s good for the barley. Moles are not.'] },
  ivy: { name: 'Ivy', role: 'Herbalist', realm: 'sunmeadow', x: 7.5, z: -5, face: -0.6, look: { wear: [['flower', '#f070a0']], sex: 'f', skin: 0, hair: 'long', hairColor: '#e8c060', eyes: 'wide', build: 'slim', cloth: '#7aa04a', tunic: '#f0e0b0', trim: '#e070a0', outfit: 'dress' }, lines: ['Every flower here is a medicine, if you know how to ask it.'] },
  mabel: { name: 'Mabel', role: 'Trader', realm: 'sunmeadow', x: 9.5, z: 6, face: -2.2, shop: 'general', look: { wear: [['kerchief', '#e8c860']], sex: 'f', skin: 2, hair: 'bob', hairColor: '#6a3a2a', eyes: 'wide', build: 'broad', cloth: '#c06a3a', tunic: '#f0d8b0', trim: '#f0c040', outfit: 'apron' }, lines: ['Fresh bread, potions, and a few blades the travellers left.'] },
  gus: { name: 'Gus', role: 'Miller', realm: 'sunmeadow', x: -16, z: 10, face: 1.8, look: { elder: true, wear: [['band', '#e8e0d0']], sex: 'm', skin: 3, hair: 'short', hairColor: '#e8e0d0', eyes: 'dot', build: 'broad', beard: 'moustache', cloth: '#a8a090', tunic: '#e8e0d0', trim: '#c0a060', outfit: 'apron' }, lines: ['The mill turns, the flour flies, and nobody asks how the miller is. Thank you for asking. Fine.', 'Gnarlroot used to be a friendly old tree. Before.'] },
  tobin: { name: 'Tobin', role: 'Hamlet child', realm: 'sunmeadow', x: 3.5, z: 9, face: 3.1, child: true, look: { wear: [['scarf', '#4a8ad0']], sex: 'm', skin: 2, hair: 'spiky', hairColor: '#e0b050', eyes: 'wide', build: 'slim', cloth: '#d05a3a', tunic: '#f0e0c0', trim: '#4a8ad0' }, lines: ['I caught a hornet in a jar once. It was very angry. So was Mum.'] },
  // Frostpeak
  hroa: { name: 'Sentinel Hroa', role: 'Rimehold’s guard', realm: 'frostpeak', x: -5, z: -3, face: 0.5, look: { sex: 'f', skin: 0, hair: 'ponytail', hairColor: '#e8e8f0', eyes: 'narrow', build: 'broad', cloth: '#4a5a7a', tunic: '#c8d0e0', trim: '#9ad8ff', gear: { weapon: { type: 'spear', color: '#c8d0e0' }, offhand: { kind: 'shield', shape: 'kite', color: '#3a5a8a' }, head: { shape: 'open', color: '#b8c4d0' } } }, lines: ['Stand straight. The cold respects those who stand straight.'] },
  pip: { name: 'Pip', role: 'Climber · trader', realm: 'frostpeak', x: 7, z: 5, face: -2.4, shop: 'general', look: { wear: [['scarf', '#e8c060']], sex: 'm', skin: 2, hair: 'curly', hairColor: '#8a4a2a', eyes: 'narrow', build: 'slim', cloth: '#a84a3a', tunic: '#e8d8c0', trim: '#f0c040', gear: { head: { shape: 'hood', color: '#a84a3a' } } }, lines: ['Ropes, potions, warm socks. Mostly potions.'] },
  yrsa: { name: 'Yrsa', role: 'Blacksmith', realm: 'frostpeak', x: 10, z: -6, face: -1.0, shop: 'smith', look: { wear: [['band', '#3a5a8a']], sex: 'f', skin: 1, hair: 'short', hairColor: '#c8a050', eyes: 'narrow', build: 'broad', cloth: '#3a4a5a', tunic: '#8a8070', trim: '#c08040', outfit: 'apron', gear: { weapon: { type: 'mace', shape: 'hammer', color: '#9aa0a8' } } }, lines: ['Steel gets brittle in the cold. Mine does not.'] },
  eiri: { name: 'Eiri', role: 'Rimehold child', realm: 'frostpeak', x: -2, z: 8, face: 2.8, child: true, look: { wear: [['scarf', '#e06a7a']], sex: 'f', skin: 0, hair: 'bun', hairColor: '#f0f0f8', eyes: 'wide', build: 'slim', cloth: '#7a9ad0', tunic: '#f0f0ff', trim: '#ffffff', gear: { head: { shape: 'hood', color: '#c8d8f0' } } }, lines: ['I built a snow Wayfarer. It looks like you. Shorter.'] },
  bjorn: { name: 'Old Bjorn', role: 'Ice fisher', realm: 'frostpeak', x: -12, z: 8, face: 1.6, look: { elder: true, wear: [['scarf', '#c84a3a']], sex: 'm', skin: 2, hair: 'bald', hairColor: '#ffffff', eyes: 'narrow', build: 'broad', beard: 'beard', cloth: '#6a5a4a', tunic: '#c8b8a0', trim: '#e0e0e0' }, lines: ['Fish in Mirror Lake have not bitten since the Matron came. Neither have I. Bad for both of us.'] },
  // Emberfall
  sel: { name: 'Sel', role: 'Ash-monk', realm: 'emberfall', x: -5, z: -3, face: 0.6, look: { sex: 'm', skin: 4, hair: 'bald', hairColor: '#1a1414', eyes: 'narrow', build: 'slim', cloth: '#8a3a2a', tunic: '#d0a070', trim: '#f0a040', outfit: 'robe' }, lines: ['Ash remembers the fire. So must we.'] },
  korra: { name: 'Korra', role: 'Forgemaster', realm: 'emberfall', x: 11, z: -1.5, face: -1.2, shop: 'smith', look: { wear: [['band', '#ffb040']], sex: 'f', skin: 3, hair: 'spiky', hairColor: '#e04a2a', eyes: 'narrow', build: 'broad', cloth: '#3a2a24', tunic: '#7a5a3a', trim: '#ff8a3a', outfit: 'apron', gear: { weapon: { type: 'mace', shape: 'hammer', color: '#5a5a60' } } }, lines: ['The best steel in any realm is quenched in lava. Do not try this at home.'] },
  coal: { name: 'Mother Coal', role: 'Trader', realm: 'emberfall', x: 6, z: 7, face: -2.6, shop: 'general', look: { elder: true, wear: [['scarf', '#8a5a8a']], sex: 'f', skin: 4, hair: 'long', hairColor: '#d8d8d8', eyes: 'dot', build: 'broad', cloth: '#5a3a5a', tunic: '#c0a090', trim: '#f0c040', outfit: 'dress' }, lines: ['Potions to cool you, bread to fill you. Prices to warm my heart.'] },
  dunn: { name: 'Dunn', role: 'Miner', realm: 'emberfall', x: -12, z: 8, face: 1.6, look: { wear: [['scarf', '#5a4a3a']], sex: 'm', skin: 2, hair: 'curly', hairColor: '#3a2a1a', eyes: 'narrow', build: 'broad', beard: 'stubble', cloth: '#6a6a5a', tunic: '#a89a7a', trim: '#f0d040', gear: { head: { shape: 'open', color: '#d0a040' } } }, lines: ['Dig deep enough and the rock glows. Dig deeper and it bites.'] },
  pim: { name: 'Pim', role: 'Forge child', realm: 'emberfall', x: 2, z: 9, face: 3.0, child: true, look: { wear: [['band', '#ffe060']], sex: 'f', skin: 3, hair: 'spiky', hairColor: '#ff7a3a', eyes: 'wide', build: 'slim', cloth: '#d0603a', tunic: '#f0d0a0', trim: '#ffe060' }, lines: ['I am going to be a forgemaster like Korra. I already burnt my eyebrows off once!'] }
};
export const npcsIn = (realm) => Object.keys(NPCS).filter((id) => NPCS[id].realm === realm);

/**
 * What an NPC says, given the quest log (and whether they have something to
 * give or take). Returns { lines: [{ who, text }], action } where action is
 * one of: null, { accept: id }, { complete: id }, { shop: 'general' | 'smith' }.
 */
export function dialogueFor(npcId, log) {
  const say = (...texts) => texts.map((text) => ({ who: npcId, text }));
  const st = (id) => log[id].state;
  if (npcId === 'odile') {
    if (st('lampwight') === 'done') return { lines: say('Every lantern in Lanternwood is burning. Look at them, Wayfarer — that is your doing.', 'Old Hob says the waystone south of camp opens on other realms. The world is wider than our woods.'), action: null };
    if (st('lampwight') === 'ready') return { lines: say('You are back — and the woods are... quiet. The good kind of quiet.', 'The Lampwight is gone? Then the light it swallowed is coming home. Listen to the Hearthlight roar!', 'Lanternwood owes you its lanterns, its nights and its songs. Thank you.'), action: { complete: 'lampwight' } };
    if (st('lampwight') === 'active') return { lines: say('Something old woke in Greyvault when the braziers caught. I felt the Hearthlight shiver.', 'The Lampwight — it has been eating our light. End it, and come back to me.'), action: null };
    if (st('braziers') === 'ready') return { lines: say('Three fires in Greyvault, after a hundred years dark. You have courage.', 'But the light did not come to us... it went somewhere. Brace yourself.'), action: { complete: 'braziers' } };
    if (st('braziers') === 'active') return { lines: say('The braziers stand in the Greyvault Ruins, west of camp. Walk up to each and press F to light it.', 'Mind the lampwisps — they hate fire.'), action: null };
    if (st('braziers') === 'available') return { lines: say('The lampwisps come from Greyvault, the old ruins west of here. Long ago, its braziers kept the dark at bay.', 'Light them again, all three. If something is hiding in the dark, the fire will draw it out.'), action: { accept: 'braziers' } };
    if (st('slimes') === 'ready') return { lines: say('The glade is clear? Good work. Here — the camp pays its debts.'), action: { complete: 'slimes' } };
    if (st('slimes') === 'active') return { lines: say('Six gloomslimes in Glowmoss Glade, up the north path. They swallow light like water.'), action: null };
    if (st('slimes') === 'available') return { lines: say('Wren says you have a strong arm. I need one.', 'Gloomslimes have crept into Glowmoss Glade, north of camp. Where they crawl, the moss stops glowing.', 'Clear six of them out for me.'), action: { accept: 'slimes' } };
    if (st('embers') === 'done') return { lines: say('Tamsin has been pacing the east path all evening. Talk to her.'), action: null };
    return { lines: say('Welcome to Lanternwood, Wayfarer. I am Odile, warden of this camp.', 'Our lanterns go out one by one, and the Hearthlight burns lower each night. Something in the woods is drinking our light.', 'Sister Wren is by her tent. She needs a quick pair of hands — start there.'), action: null };
  }
  if (npcId === 'wren') {
    if (st('embers') === 'ready') return { lines: say('Six ember-herbs, still warm. Bless you.', 'I will crush them into the fire — and take these. Potions for the road.'), action: { complete: 'embers' } };
    if (st('embers') === 'active') return { lines: say('Ember-herbs glow orange in the dark. Look along the north path and around Glowmoss Glade, and press F to pick one.'), action: null };
    if (st('embers') === 'available') return { lines: say('Oh — a new face. I am Wren; I mend what the woods break.', 'The Hearthlight needs feeding. Ember-herbs grow in the woods to the north — they glow like coals.', 'Bring me six, and mind the slimes.'), action: { accept: 'embers' } };
    return { lines: say('Rest by the fire when you are hurt — it mends faster than any of my salves.', 'Out there, drink a potion: keys 5 and 6. Drink as many as you need, as fast as you need.'), action: null };
  }
  if (npcId === 'tamsin') {
    if (st('wolves') === 'ready') return { lines: say('You did it! The hollow went quiet — I heard it from the lookout!', 'And listen — the old waystone south of camp started humming when the last wolf fell. Old Hob says it opens on Sunmeadow!', 'Here, I found these crystals by the creek. Take them.'), action: { complete: 'wolves' } };
    if (st('wolves') === 'active') return { lines: say('The Howling Hollow is east, past the big rocks. Ashwolves circle before they lunge — roll away with Shift!'), action: null };
    if (st('wolves') === 'available') return { lines: say('Psst! I am Tamsin, camp scout. Well — scout-in-training.', 'Ashwolves have taken the Howling Hollow, east of camp. Their eyes glow like the lanterns used to.', 'Chase off five of them? Please?'), action: { accept: 'wolves' } };
    if (log.wolves.state === 'done') return { lines: say('The waystone is south of camp, down the path past the fire. It glows now! Press F by it to travel.'), action: null };
    return { lines: say('I am keeping watch on the north path. I see things in the trees... little lights that do not blink.'), action: null };
  }
  const npc = NPCS[npcId];
  if (!npc) return { lines: [], action: null };
  // Everyone else: their quests from the quest data, then their shop, then a word or two.
  const mine = QUESTS.filter((q) => q.giver === npcId);
  const ready = mine.find((q) => st(q.id) === 'ready');
  if (ready) return { lines: say(...(ready.lines?.ready ?? ['You did it. Thank you.'])), action: { complete: ready.id } };
  const offer = mine.find((q) => st(q.id) === 'available');
  if (offer) return { lines: say(...(offer.lines?.offer ?? [offer.brief])), action: { accept: offer.id } };
  const active = mine.find((q) => st(q.id) === 'active');
  if (active && !npc.shop) return { lines: say(...(active.lines?.active ?? [active.brief])), action: null };
  if (npc.shop) return { lines: say(npc.lines?.[0] ?? 'Have a look.'), action: { shop: npc.shop } };
  const idle = npc.lines ?? ['…'];
  return { lines: say(idle[Math.floor((log.embers.progress + Object.values(log).filter((e) => e.state === 'done').length) % idle.length)]), action: null };
}

/** The opening scene of a new journey. */
export const INTRO = [
  { who: 'odile', text: 'Wayfarer! You made it through the woods — and just in time.' },
  { who: 'odile', text: 'This is Lanternwood camp. Our lanterns are going out, one by one, and something out there is behind it.' },
  { who: 'odile', text: 'Talk to Sister Wren by her tent (walk close and press F). She will tell you how to feed the Hearthlight.' }
];

export const ENDING = [
  { who: 'odile', text: 'Look up, Wayfarer. Every lantern is lit.' },
  { who: 'wren', text: 'The Hearthlight has not burned like this since I was a girl.' },
  { who: 'tamsin', text: 'I am going to tell this story every night. Every single night!' },
  { who: 'pell', text: 'And I am giving a discount. A small one.' }
];

/* ------------------------------------------------------- Lanternwood */

export { WORLD, distToPath, seeded };
export const nearPath = (x, z, pad = 0) => WORLD.paths.some((p) => distToPath(x, z, p) < 2.2 + pad);
export const inArea = (x, z, pad = 0) => Object.values(WORLD.areas).some((a) => dist2(x, z, a.x, a.z) < (a.r + pad) ** 2);

/**
 * Lanternwood's trees, placed once from a seed: dense in a ring round the
 * world, scattered in between, never on paths, in clearings or on top of
 * each other. Each { x, z, s } with s a size factor; `r` the trunk collider.
 */
export function layoutTrees(seed = 7) {
  const rand = seeded(seed);
  const trees = [];
  const grid = new Map();
  const cell = 6;
  const keyOf = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const crowded = (x, z, gap) => {
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of grid.get(`${gx + i},${gz + j}`) ?? []) if (dist2(x, z, t.x, t.z) < gap * gap) return true;
    return false;
  };
  const keepOut = [
    ...WORLD.tents.map((t) => [t.x, t.z, 3.6]),
    ...WORLD.braziers.map((b) => [b.x, b.z, 3]),
    ...WORLD.rocks.map(([x, z, s]) => [x, z, 2 + s]),
    ...WORLD.herbs.map(([x, z]) => [x, z, 2]),
    ...WORLD.chests.map((c) => [c.x, c.z, 2.5]),
    [WORLD.waystone.x, WORLD.waystone.z, 7],
    ...Object.values(NPCS).filter((n) => n.realm === 'lanternwood').map((n) => [n.x, n.z, 2.5])
  ];
  const ok = (x, z, gap) => {
    if (Math.hypot(x, z) > WORLD.forestTo) return false;
    if (inArea(x, z, 2) || nearPath(x, z, 1.4)) return false;
    if (keepOut.some(([kx, kz, r]) => dist2(x, z, kx, kz) < r * r)) return false;
    return !crowded(x, z, gap);
  };
  const place = (x, z, s) => {
    const t = { x, z, s };
    trees.push(t);
    const k = keyOf(x, z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(t);
  };
  // A wall of forest at the edge (so the world reads as a wood, not a disc).
  for (let i = 0; i < 6000 && trees.length < 1100; i++) {
    const a = rand() * Math.PI * 2;
    const r = WORLD.radius - 4 + rand() * (WORLD.forestTo - WORLD.radius + 4);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (ok(x, z, 2.7)) place(x, z, 0.95 + rand() * 0.6);
  }
  // Woods in between the clearings.
  for (let i = 0; i < 30000 && trees.length < 3200; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (WORLD.radius - 3);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (ok(x, z, 3.0)) place(x, z, 0.75 + rand() * 0.6);
  }
  for (const t of trees) t.r = 0.55 * t.s;
  return trees;
}

/** Enemy homes for a Lanternwood kind, spread around its area (seeded). */
export function enemySpawns(kind, seed = 11) {
  const spec = WORLD.spawns[kind];
  const area = WORLD.areas[spec.area];
  const rand = seeded(seed + kind.length * 97);
  const out = [];
  for (let i = 0; i < spec.count; i++) {
    const a = (i / spec.count) * Math.PI * 2 + rand() * 0.6;
    const r = spec.ring[0] + rand() * (spec.ring[1] - spec.ring[0]);
    out.push({ kind, x: area.x + Math.cos(a) * r, z: area.z + Math.sin(a) * r });
  }
  return out;
}

/** Everything solid in Lanternwood as circles { x, z, r } (trees passed in, so the layout is built once). */
export function solidCircles(trees) {
  return [
    { x: WORLD.fire.x, z: WORLD.fire.z, r: WORLD.fire.r },
    ...WORLD.tents.map((t) => ({ x: t.x, z: t.z, r: Math.max(t.w, t.d) * 0.48 })),
    ...WORLD.logs.map((l) => ({ x: l.x, z: l.z, r: 0.7 })),
    ...WORLD.crates.map((c) => ({ x: c.x, z: c.z, r: 0.5 })),
    { x: WORLD.cart.x, z: WORLD.cart.z, r: 1.1 },
    ...WORLD.lanterns.map((l) => ({ x: l.x, z: l.z, r: 0.3 })),
    ...WORLD.torches.map((l) => ({ x: l.x, z: l.z, r: 0.25 })),
    ...WORLD.braziers.map((b) => ({ x: b.x, z: b.z, r: 0.8 })),
    ...WORLD.pillars.map(([x, z]) => ({ x, z, r: 0.75 })),
    ...WORLD.rocks.map(([x, z, s]) => ({ x, z, r: 1.1 * s })),
    { x: WORLD.waystone.x, z: WORLD.waystone.z, r: 1.1 },
    ...WORLD.chests.map((c) => ({ x: c.x, z: c.z, r: 0.6 })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: t.r }))
  ];
}

/** The trees of any realm (Lanternwood's own forest, or a realm's flora). */
export function treesFor(realm) {
  if (realm === 'lanternwood') return layoutTrees();
  const L = REALMS[realm].layout;
  const density = { sunmeadow: 0.45, frostpeak: 0.8, emberfall: 0.35 }[realm] ?? 1;
  return layoutFlora(L, { seed: realm.length * 13 + 3, density, keep: npcsIn(realm).map((id) => [NPCS[id].x, NPCS[id].z, 2.5]) });
}

/** Everything solid in any realm. */
export const solidsFor = (realm, trees) => (realm === 'lanternwood' ? solidCircles(trees) : realmSolidsOf(REALMS[realm].layout, trees));

/**
 * Push a circle of radius `r` at (x, z) out of every solid circle and back
 * inside the world (Lanternwood's, unless `bound` is given). Returns [x, z].
 */
export const resolveCollision = (x, z, r, solids, bound = WORLD.radius) => resolveIn(x, z, r, solids, bound);

/** Which named area of Lanternwood a point is in (or 'woods'). */
export function areaAt(x, z) {
  const id = areaIn(WORLD, x, z);
  return id === 'wilds' ? 'woods' : id;
}

/** Spawn points of a realm (pushed out of anything solid). */
export function realmSpawns(realm, solids = []) {
  const L = REALMS[realm].layout;
  return spawnsOf(L).map((s) => {
    const [x, z] = resolveIn(s.x, s.z, ENEMIES[s.kind].radius, solids, L.radius - 2);
    return { ...s, x, z };
  });
}

/* -------------------------------------------------------------- save */

/** A fresh journey's whole state. */
export function newGame(cls = 'blade', lookId = null) {
  return {
    v: SAVE_VERSION,
    hero: newHero(cls, lookId),
    realm: 'lanternwood',
    pos: [WORLD.start.x, WORLD.start.z],
    quests: newQuestLog(),
    herbsTaken: [],
    braziers: [],
    gathered: {},
    chests: [],
    bosses: {},
    bossDefeated: false,
    ended: false,
    time: 0
  };
}

/** The game state as a string for localStorage. */
export const serialize = (game) => JSON.stringify({ ...game, v: SAVE_VERSION });

/**
 * An old (version 1) save brought up to version 2, keeping everything it
 * had: the look becomes a class (ember → Blade, moss → Warden, frost → Seer)
 * with that class's starting gear, the potions go into the new bag, the
 * quest log keeps its states and opens whatever new quests they unlock.
 */
export function migrateV1(data) {
  const h = data.hero ?? {};
  const cls = classOfOldLook(h.look);
  const hero = newHero(cls);
  for (const k of ['level', 'xp', 'hp', 'mp', 'gold', 'crystals', 'herbs', 'kills', 'deaths']) if (h[k] != null) hero[k] = h[k];
  hero.bonus = { hp: h.bonus?.hp ?? 0, atk: h.bonus?.atk ?? 0 };
  hero.bag = [];
  addToBag(hero.bag, { kind: 'hp', n: Number.isFinite(h.potions?.hp) ? h.potions.hp : 0 });
  addToBag(hero.bag, { kind: 'mp', n: Number.isFinite(h.potions?.mp) ? h.potions.mp : 0 });
  const quests = newQuestLog();
  for (const q of QUESTS) {
    const e = data.quests?.[q.id];
    if (e && typeof e === 'object') quests[q.id] = { state: e.state, progress: e.progress };
  }
  return {
    v: 2,
    hero,
    realm: 'lanternwood',
    pos: data.pos,
    quests,
    herbsTaken: data.herbsTaken,
    braziers: data.braziers,
    gathered: {},
    chests: [],
    bosses: data.bossDefeated ? { lampwight: true } : {},
    bossDefeated: data.bossDefeated,
    ended: data.ended,
    time: data.time,
    migratedFrom: 1
  };
}

const num = (v, d, lo = 0, hi = 1e9) => (Number.isFinite(v) ? clamp(v, lo, hi) : d);

/** An item read back from a save, checked (null if it is not a real item). */
export function cleanItem(it) {
  if (!it || typeof it !== 'object' || !BASES[it.base]) return null;
  const stats = {};
  for (const [k, v] of Object.entries(it.stats ?? {})) if (Number.isFinite(v)) stats[k] = clamp(Math.round(v), -100, 5000);
  return {
    uid: typeof it.uid === 'string' ? it.uid.slice(0, 40) : `i${Math.random().toString(36).slice(2)}`,
    base: it.base,
    rarity: RARITIES[it.rarity] ? it.rarity : 'common',
    ilvl: num(it.ilvl, 1, 1, 60),
    name: String(it.name ?? BASES[it.base].name).slice(0, 60),
    color: /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : BASES[it.base].colors[0],
    stats,
    affixes: Array.isArray(it.affixes) ? it.affixes.filter((a) => typeof a === 'string').slice(0, 4) : []
  };
}

/**
 * A save read back, checked and filled in: anything missing or broken falls
 * back to a fresh game's value, so an old or tampered save never crashes the
 * game; a version 1 save is migrated first. Returns null when there is
 * nothing usable.
 */
export function deserialize(text) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !data.hero || typeof data.hero !== 'object') return null;
  if (data.v === 1) data = migrateV1(data);
  if (data.v !== SAVE_VERSION) return null;
  const h = data.hero;
  const cls = CLASSES[h.cls] ? h.cls : classOfOldLook(h.look);
  const fresh = newGame(cls, h.look);
  const hero = {
    ...fresh.hero,
    level: num(h.level, 1, 1, MAX_LEVEL),
    xp: num(h.xp, 0),
    gold: num(h.gold, 0),
    crystals: num(h.crystals, 0),
    herbs: num(h.herbs, 0),
    kills: num(h.kills, 0),
    deaths: num(h.deaths, 0),
    bonus: { hp: num(h.bonus?.hp, 0, 0, 3), atk: num(h.bonus?.atk, 0, 0, 3) }
  };
  // The bag: real items and known stacks, no more than fits.
  if (Array.isArray(h.bag)) {
    hero.bag = [];
    for (const e of h.bag) {
      if (hero.bag.length >= BAG_SIZE) break;
      if (e?.base) {
        const it = cleanItem(e);
        if (it) hero.bag.push(it);
      } else if (CONSUMABLES[e?.kind] && Number.isFinite(e.n) && e.n > 0) hero.bag.push({ kind: e.kind, n: clamp(Math.floor(e.n), 1, STACK_MAX) });
    }
  }
  // What is worn: each slot an item of that slot the class can use.
  if (h.equip && typeof h.equip === 'object') {
    for (const s of SLOTS) {
      const it = h.equip[s] === null ? null : cleanItem(h.equip[s]);
      hero.equip[s] = it && BASES[it.base].slot === s && canUse(it, cls) ? it : h.equip[s] === null ? null : hero.equip[s];
    }
  }
  const s = statsOf(hero);
  hero.hp = num(h.hp, s.maxHp, 1, s.maxHp);
  hero.mp = num(h.mp, s.maxMp, 0, s.maxMp);
  const quests = newQuestLog();
  for (const q of QUESTS) {
    const e = data.quests?.[q.id];
    if (e && ['locked', 'available', 'active', 'ready', 'done'].includes(e.state)) quests[q.id] = { state: e.state, progress: num(e.progress, 0, 0, q.goal.count) };
  }
  refreshUnlocks(quests);
  const realm = REALMS[data.realm] && realmUnlocked(quests, data.realm) ? data.realm : 'lanternwood';
  const bound = REALMS[realm].layout.radius;
  const okPos = Array.isArray(data.pos) && data.pos.length === 2 && data.pos.every(Number.isFinite) && REALMS[data.realm] === REALMS[realm];
  const pos = okPos ? resolveIn(data.pos[0], data.pos[1], 0, [], bound) : realm === 'lanternwood' ? fresh.pos : [REALMS[realm].layout.start.x, REALMS[realm].layout.start.z];
  const gathered = {};
  for (const r of REALM_ORDER.slice(1)) {
    const pts = REALMS[r].layout.gather.points.length;
    const g = data.gathered?.[r];
    if (Array.isArray(g)) gathered[r] = g.filter((i) => Number.isInteger(i) && i >= 0 && i < pts);
  }
  const chestIds = REALM_ORDER.flatMap((r) => REALMS[r].layout.chests.map((c) => c.id));
  const bosses = {};
  for (const k of ['lampwight', 'gnarlroot', 'matron', 'tyrant']) if (data.bosses?.[k]) bosses[k] = true;
  if (data.bossDefeated) bosses.lampwight = true;
  return {
    v: SAVE_VERSION,
    hero,
    realm,
    pos,
    quests,
    herbsTaken: Array.isArray(data.herbsTaken) ? data.herbsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < WORLD.herbs.length) : [],
    braziers: Array.isArray(data.braziers) ? data.braziers.filter((id) => WORLD.braziers.some((b) => b.id === id)) : [],
    gathered,
    chests: Array.isArray(data.chests) ? data.chests.filter((id) => chestIds.includes(id)) : [],
    bosses,
    bossDefeated: Boolean(bosses.lampwight),
    ended: Boolean(data.ended),
    time: num(data.time, 0),
    ...(data.migratedFrom ? { migratedFrom: data.migratedFrom } : {})
  };
}
