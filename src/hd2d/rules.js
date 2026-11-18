/**
 * Lanternwood — the rules. Stats, damage, the XP curve, enemies, quests,
 * dialogue, the shop, the save shape and the world layout, as plain data and
 * pure functions: no three.js, no DOM, so every rule can be unit-tested.
 *
 * Coordinates are metres on the ground plane: x east, z south (so "north" is
 * −z, the way the camera looks when a journey starts).
 */

export const SAVE_KEY = 'gamory.lanternwood.save';
export const SAVE_VERSION = 1;

/* ------------------------------------------------------------ random */

/** A small seeded random stream (mulberry32): the world must come out the same every time. */
export function seeded(seed = 1) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;

/* ------------------------------------------------------------- heroes */

/** The looks a journey can start with (palettes for the same sprite). */
export const HERO_LOOKS = {
  ember: { name: 'Ember', blurb: 'A red travelling cloak and a copper sword.', cloak: '#b8452e', tunic: '#d9b46a', hair: '#5a3424', trim: '#f0c040' },
  moss: { name: 'Moss', blurb: 'A green ranger hood, worn boots, a steady hand.', cloak: '#3f7a4a', tunic: '#c9a26a', hair: '#e0c070', trim: '#c8e070' },
  frost: { name: 'Frost', blurb: 'A blue mantle from the north and silver hair.', cloak: '#3c6aa8', tunic: '#d8d0c0', hair: '#aab4cc', trim: '#9ad8ff' }
};
export const HERO_LOOK_ORDER = ['ember', 'moss', 'frost'];

/** XP needed to go from level L to L+1. */
export const xpToNext = (level) => Math.round(40 * level ** 1.6);
export const MAX_LEVEL = 20;

/** The hero's stats at a level, with the charms bought from the merchant. */
export function heroStats(level, bonus = {}) {
  const L = clamp(Math.floor(level), 1, MAX_LEVEL) - 1;
  return {
    maxHp: 90 + 22 * L + 25 * (bonus.hp ?? 0),
    maxMp: 40 + 6 * L,
    atk: 12 + 3 * L + 4 * (bonus.atk ?? 0),
    def: 3 + Math.floor(1.5 * L),
    speed: 6.2
  };
}

/** Moves and spells. `mult` scales attack; `mp` is the mana cost; `cd` seconds between uses. */
export const ABILITIES = {
  slash: { name: 'Slash', key: 'Space', mult: 1, mp: 0, cd: 0.42, range: 2.4, arc: Math.PI * 0.62, knock: 3.2 },
  fireball: { name: 'Fireball', key: '1', mult: 1.7, mp: 12, cd: 0.55, speed: 17, range: 22, radius: 1.6, knock: 4 },
  whirl: { name: 'Whirl', key: '2', mult: 1.3, mp: 18, cd: 2.2, radius: 3.4, knock: 6 },
  roll: { name: 'Roll', key: 'Shift', cd: 0.75, time: 0.32, speed: 15 }
};

/**
 * Damage from an attack to a defender. `rand` is a 0…1 stream (seeded in
 * tests). Defence takes a share off (never all of it); 10 % of hits crit.
 */
export function damage(atk, def, mult = 1, rand = Math.random) {
  const base = atk * mult * (1 - def / (def + 30));
  const crit = rand() < 0.1;
  const spread = 0.9 + rand() * 0.2;
  return { amount: Math.max(1, Math.round(base * spread * (crit ? 1.6 : 1))), crit };
}

/** A fresh hero, at the start of a journey. */
export function newHero(look = 'ember') {
  const stats = heroStats(1);
  return {
    look: HERO_LOOKS[look] ? look : 'ember',
    level: 1,
    xp: 0,
    hp: stats.maxHp,
    mp: stats.maxMp,
    gold: 20,
    crystals: 0,
    potions: { hp: 2, mp: 1 },
    herbs: 0,
    bonus: { hp: 0, atk: 0 },
    kills: 0,
    deaths: 0
  };
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
    const s = heroStats(hero.level, hero.bonus);
    hero.hp = s.maxHp;
    hero.mp = s.maxMp;
  }
  return { hero, levels };
}

export const POTIONS = {
  hp: { name: 'Health potion', heal: (s) => Math.max(50, Math.round(s.maxHp * 0.45)), price: 12 },
  mp: { name: 'Mana potion', heal: (s) => Math.max(25, Math.round(s.maxMp * 0.6)), price: 10 }
};

/**
 * Drink a potion. There is NO cooldown: every call drinks one, as long as
 * there is one in the bag. Returns how much it restored (0 and `ok: false`
 * when the bag has none).
 */
export function drinkPotion(hero, kind) {
  const p = POTIONS[kind];
  if (!p || (hero.potions[kind] ?? 0) <= 0) return { ok: false, restored: 0 };
  const s = heroStats(hero.level, hero.bonus);
  hero.potions[kind] -= 1;
  const key = kind === 'hp' ? 'hp' : 'mp';
  const max = kind === 'hp' ? s.maxHp : s.maxMp;
  const before = hero[key];
  hero[key] = Math.min(max, hero[key] + p.heal(s));
  return { ok: true, restored: hero[key] - before };
}

/** Dying: back to the campfire, full health, a tenth of the gold lost. */
export function deathPenalty(hero) {
  const lost = Math.floor(hero.gold * 0.1);
  hero.gold -= lost;
  const s = heroStats(hero.level, hero.bonus);
  hero.hp = s.maxHp;
  hero.mp = s.maxMp;
  hero.deaths += 1;
  return lost;
}

/* -------------------------------------------------------------- shop */

export const SHOP = [
  { id: 'hp', name: 'Health potion', note: 'Restores about half your health.', price: 12, currency: 'gold' },
  { id: 'mp', name: 'Mana potion', note: 'Restores most of your mana.', price: 10, currency: 'gold' },
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
  hero[item.currency] -= item.price;
  if (id === 'hp' || id === 'mp') hero.potions[id] += 1;
  else if (id === 'charm-hp') {
    hero.bonus.hp += 1;
    hero.hp += 25;
  } else if (id === 'charm-atk') hero.bonus.atk += 1;
  return { ok: true };
}

/* ----------------------------------------------------------- enemies */

/**
 * Enemy kinds. `sight` notice range, `leash` how far from home they follow,
 * `reach` attack range, `windup` the telegraph before a strike, `cooldown`
 * after it, `respawn` seconds dead. Drops: gold range, crystal and potion chances.
 */
export const ENEMIES = {
  slime: {
    name: 'Gloomslime', level: 1, hp: 34, atk: 9, def: 1, speed: 2.6, wander: 1.2, sight: 8, leash: 16, reach: 2.4, windup: 0.65, cooldown: 1.1,
    attack: 'hop', radius: 0.55, xp: 14, gold: [2, 5], crystal: 0.08, potion: 0.08, respawn: 28, height: 0.9
  },
  wolf: {
    name: 'Ashwolf', level: 3, hp: 70, atk: 15, def: 3, speed: 5.4, wander: 1.8, sight: 11, leash: 20, reach: 4, windup: 0.5, cooldown: 1.3,
    attack: 'lunge', radius: 0.7, xp: 30, gold: [4, 9], crystal: 0.15, potion: 0.1, respawn: 32, height: 1.1
  },
  wisp: {
    name: 'Lampwisp', level: 4, hp: 55, atk: 17, def: 2, speed: 3.4, wander: 1.4, sight: 13, leash: 22, reach: 9, keep: 6, windup: 0.85, cooldown: 1.6,
    attack: 'orb', radius: 0.55, xp: 36, gold: [5, 10], crystal: 0.25, potion: 0.12, respawn: 34, height: 1.0, float: 1.1
  },
  lampwight: {
    name: 'The Lampwight', level: 7, hp: 1400, atk: 24, def: 6, speed: 2.8, wander: 0, sight: 30, leash: 32, reach: 3.6, windup: 1.0, cooldown: 1.2,
    attack: 'boss', radius: 1.4, xp: 400, gold: [120, 120], crystal: 1, crystals: 5, potion: 1, respawn: Infinity, height: 3.4, boss: true
  }
};

/** What an enemy drops when it dies (rand: a 0…1 stream). */
export function rollDrops(kind, rand = Math.random) {
  const e = ENEMIES[kind];
  const gold = e.gold[0] + Math.floor(rand() * (e.gold[1] - e.gold[0] + 1));
  const crystals = e.crystals ?? (rand() < e.crystal ? 1 : 0);
  const potion = rand() < e.potion ? (rand() < 0.6 ? 'hp' : 'mp') : null;
  return { gold, crystals, potion, xp: e.xp };
}

/* ------------------------------------------------------------ quests */

export const QUESTS = [
  {
    id: 'embers', name: 'Embers for the Hearth', giver: 'wren', area: 'glade',
    goal: { type: 'gather', target: 'herb', count: 6 },
    brief: 'Gather 6 glowing ember-herbs in the woods along the north path and around Glowmoss Glade.',
    reward: { xp: 60, gold: 30, potions: { hp: 2 } }
  },
  {
    id: 'slimes', name: 'Gloom in the Glade', giver: 'odile', area: 'glade',
    goal: { type: 'kill', target: 'slime', count: 6 },
    brief: 'Clear 6 gloomslimes out of Glowmoss Glade, north of camp.',
    reward: { xp: 120, gold: 45, crystals: 1 }
  },
  {
    id: 'wolves', name: 'The Howling Hollow', giver: 'tamsin', area: 'hollow',
    goal: { type: 'kill', target: 'wolf', count: 5 },
    brief: 'Drive off 5 ashwolves in the Howling Hollow, east of camp.',
    reward: { xp: 220, gold: 60, crystals: 2, potions: { mp: 2 } }
  },
  {
    id: 'braziers', name: 'Old Fires of Greyvault', giver: 'odile', area: 'ruins',
    goal: { type: 'light', target: 'brazier', count: 3 },
    brief: 'Light the 3 old braziers in the Greyvault Ruins, west of camp. Lampwisps guard them.',
    reward: { xp: 300, gold: 80, crystals: 2 }
  },
  {
    id: 'lampwight', name: 'The Lampwight', giver: 'odile', area: 'ruins', auto: true,
    goal: { type: 'kill', target: 'lampwight', count: 1 },
    brief: 'Defeat the Lampwight in the heart of Greyvault, then tell Warden Odile.',
    reward: { xp: 600, gold: 150, crystals: 3 }
  }
];
export const questById = (id) => QUESTS.find((q) => q.id === id);

/** Quest states: locked → available → active → ready (goal met) → done. */
export function newQuestLog() {
  const log = {};
  QUESTS.forEach((q, i) => {
    log[q.id] = { state: i === 0 ? 'available' : 'locked', progress: 0 };
  });
  return log;
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
 * brazier lit): advance every active quest it counts for. Returns the ids
 * of quests that just became ready to hand in.
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
 * Hand in a ready quest: rewards go to the hero, the next quest in the chain
 * opens (an `auto` quest starts at once). Returns the reward, or null.
 */
export function completeQuest(log, hero, id) {
  const entry = log[id];
  const q = questById(id);
  if (!entry || !q || entry.state !== 'ready') return null;
  entry.state = 'done';
  const r = q.reward;
  hero.gold += r.gold ?? 0;
  hero.crystals += r.crystals ?? 0;
  for (const [k, v] of Object.entries(r.potions ?? {})) hero.potions[k] += v;
  const { levels } = gainXp(hero, r.xp ?? 0);
  const next = QUESTS[QUESTS.indexOf(q) + 1];
  if (next && log[next.id].state === 'locked') log[next.id].state = next.auto ? 'active' : 'available';
  return { ...r, levels };
}

/** The quest currently being followed (first active or ready), for the tracker. */
export function currentQuest(log) {
  const q = QUESTS.find((x) => log[x.id].state === 'active' || log[x.id].state === 'ready');
  return q ? { quest: q, ...log[q.id] } : null;
}

export const questsDone = (log) => QUESTS.filter((q) => log[q.id].state === 'done').length;
export const journeyOver = (log) => log.lampwight.state === 'done';

/** What marker floats over an NPC: '!' a quest to take, '?' one to hand in, 'shop', or null. */
export function npcMarker(log, npcId) {
  if (QUESTS.some((q) => q.giver === npcId && log[q.id].state === 'ready')) return '?';
  if (QUESTS.some((q) => q.giver === npcId && log[q.id].state === 'available')) return '!';
  if (NPCS[npcId]?.shop) return 'shop';
  return null;
}

/* ----------------------------------------------------------- the cast */

export const NPCS = {
  odile: { name: 'Warden Odile', role: 'Keeper of the camp', x: -3.2, z: -2.6, face: 0.8 },
  wren: { name: 'Sister Wren', role: 'Healer', x: -8.4, z: 5.4, face: 2.2 },
  pell: { name: 'Pell', role: 'Peddler', x: 8.8, z: 3.6, face: -1.9, shop: true },
  tamsin: { name: 'Tamsin', role: 'Young scout', x: 3.6, z: -9.2, face: -0.4 }
};

/**
 * What an NPC says, given the quest log (and whether they have something to
 * give or take). Returns { lines: [{ who, text }], action } where action is
 * one of: null, { accept: id }, { complete: id }, { shop: true }.
 */
export function dialogueFor(npcId, log) {
  const say = (...texts) => texts.map((text) => ({ who: npcId, text }));
  const st = (id) => log[id].state;
  if (npcId === 'odile') {
    if (st('lampwight') === 'done') return { lines: say('Every lantern in Lanternwood is burning. Look at them, Wayfarer — that is your doing.', 'Stay as long as you like. The fire will always have a seat for you.'), action: null };
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
    return { lines: say('Rest by the fire when you are hurt — it mends faster than any of my salves.', 'Out there, drink a potion: keys 3 and 4. Drink as many as you need, as fast as you need.'), action: null };
  }
  if (npcId === 'tamsin') {
    if (st('wolves') === 'ready') return { lines: say('You did it! The hollow went quiet — I heard it from the lookout!', 'Here, I found these crystals by the creek. Take them.'), action: { complete: 'wolves' } };
    if (st('wolves') === 'active') return { lines: say('The Howling Hollow is east, past the big rocks. Ashwolves circle before they lunge — roll away with Shift!'), action: null };
    if (st('wolves') === 'available') return { lines: say('Psst! I am Tamsin, camp scout. Well — scout-in-training.', 'Ashwolves have taken the Howling Hollow, east of camp. Their eyes glow like the lanterns used to.', 'Chase off five of them? Please?'), action: { accept: 'wolves' } };
    if (log.wolves.state === 'done') return { lines: say('When I grow up I will light every brazier in the world.'), action: null };
    return { lines: say('I am keeping watch on the north path. I see things in the trees... little lights that do not blink.'), action: null };
  }
  if (npcId === 'pell') {
    return { lines: say('Potions, charms, and nothing you will regret! Pell sells honest. Mostly.'), action: { shop: true } };
  }
  return { lines: [], action: null };
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

/* ------------------------------------------------------------- world */

export const WORLD = {
  radius: 74, // walkable
  forestTo: 92, // trees out to here
  fire: { x: 0, z: 0, r: 1.5 },
  start: { x: 0, z: 7.5, face: Math.PI }, // facing north (−z), toward the fire
  areas: {
    camp: { name: 'Lanternwood Camp', x: 0, z: 0, r: 15 },
    glade: { name: 'Glowmoss Glade', x: 2, z: -50, r: 14 },
    hollow: { name: 'Howling Hollow', x: 49, z: 18, r: 13 },
    ruins: { name: 'Greyvault Ruins', x: -47, z: 24, r: 15 }
  },
  paths: [
    [[0, -6], [0, -16], [-4, -28], [-1, -38], [2, -46]],
    [[6, 3], [16, 5], [28, 9], [38, 14], [46, 17]],
    [[-6, 4], [-16, 8], [-27, 15], [-37, 20], [-44, 23]]
  ],
  tents: [
    { x: -7.5, z: -6.5, rot: 0.6, color: '#9a3c34', w: 3.4, d: 3.6, h: 2.5 },
    { x: 7.2, z: -7, rot: -0.7, color: '#c08a3a', w: 3.2, d: 3.4, h: 2.4 },
    { x: -11, z: 7.5, rot: 2.0, color: '#3e6e78', w: 3.6, d: 3.8, h: 2.6 },
    { x: 11.5, z: -1.2, rot: -1.5, color: '#7a5a8c', w: 3, d: 3.2, h: 2.3 }
  ],
  logs: [
    { x: -2.9, z: 1.6, rot: 1.0 },
    { x: 3.1, z: 1.2, rot: -1.1 },
    { x: 0.4, z: -3.3, rot: 0.1 }
  ],
  crates: [
    { x: 10.6, z: 4.6, kind: 'crate' }, { x: 11.3, z: 5.6, kind: 'barrel' }, { x: 9.6, z: 5.9, kind: 'crate' },
    { x: -5.4, z: -9.6, kind: 'barrel' }, { x: 5.6, z: 9.4, kind: 'crate' }, { x: -12.6, z: 3.4, kind: 'barrel' }
  ],
  cart: { x: 11.8, z: 7.8, rot: 0.9 },
  lanterns: [
    { x: 9.4, z: -9.4 }, { x: -9.6, z: -9.2 }, { x: -9.8, z: 10.2 }, { x: 9.8, z: 10.4 }
  ],
  torches: [
    { x: -2.2, z: -14.5 }, { x: 2.2, z: -14.5 }, { x: 14.4, z: 2.6 }, { x: -14.2, z: 5.2 }, { x: 6.5, z: 12.8 }
  ],
  braziers: [
    { id: 'b1', x: -53, z: 18 }, { id: 'b2', x: -40.5, z: 17.5 }, { id: 'b3', x: -47, z: 32 }
  ],
  pillars: [
    [-53.5, 25, 3.8], [-52, 31, 2.1], [-41, 29.5, 3.2], [-40, 24, 1.4], [-45, 15, 2.6], [-50, 14.5, 1.2], [-55, 21, 1.8], [-38.5, 20.5, 2.9],
    [-44, 33.5, 1.6], [-50.5, 34.5, 3.4]
  ],
  herbs: [
    [-3.5, -22], [3.8, -30], [-7.5, -33], [5.5, -41], [-6.5, -44], [12, -50], [-9.5, -55], [9, -59], [1.5, -63], [-12.8, -48]
  ],
  spawns: {
    slime: { area: 'glade', count: 8, ring: [3, 11] },
    wolf: { area: 'hollow', count: 7, ring: [2, 10] },
    wisp: { area: 'ruins', count: 6, ring: [5, 12] }
  },
  boss: { x: -47, z: 24 },
  rocks: [
    [17, -12, 1.4], [-18, -14, 1.2], [22, 22, 1.3], [-20, -2, 1.0], [36, 26, 1.6], [56, 12, 1.4], [44, 6, 1.2], [58, 26, 1.1],
    [-14, -40, 1.1], [14, -44, 1.2], [-30, 36, 1.3], [-58, 30, 1.2], [-36, 8, 1.0], [26, -30, 1.4]
  ]
};

/** Distance from a point to a path polyline. */
export function distToPath(x, z, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
export const nearPath = (x, z, pad = 0) => WORLD.paths.some((p) => distToPath(x, z, p) < 2.2 + pad);
export const inArea = (x, z, pad = 0) => Object.values(WORLD.areas).some((a) => dist2(x, z, a.x, a.z) < (a.r + pad) ** 2);

/**
 * Every tree, placed once from a seed: dense in a ring around the world,
 * scattered in between, never on paths, in clearings or on top of each other.
 * Each { x, z, s } with s a size factor; `r` the trunk collider.
 */
export function layoutTrees(seed = 7) {
  const rand = seeded(seed);
  const trees = [];
  const keepOut = [
    ...WORLD.tents.map((t) => [t.x, t.z, 3.6]),
    ...WORLD.braziers.map((b) => [b.x, b.z, 3]),
    ...WORLD.rocks.map(([x, z, s]) => [x, z, 2 + s]),
    ...WORLD.herbs.map(([x, z]) => [x, z, 2]),
    ...Object.values(NPCS).map((n) => [n.x, n.z, 2.5])
  ];
  const ok = (x, z, gap) => {
    if (Math.hypot(x, z) > WORLD.forestTo) return false;
    if (inArea(x, z, 2) || nearPath(x, z, 1.4)) return false;
    if (keepOut.some(([kx, kz, r]) => dist2(x, z, kx, kz) < r * r)) return false;
    return !trees.some((t) => dist2(x, z, t.x, t.z) < gap * gap);
  };
  // A wall of forest at the edge (so the world reads as a wood, not a disc).
  for (let i = 0; i < 2600 && trees.length < 640; i++) {
    const a = rand() * Math.PI * 2;
    const r = WORLD.radius - 4 + rand() * (WORLD.forestTo - WORLD.radius + 4);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (ok(x, z, 2.7)) trees.push({ x, z, s: 0.95 + rand() * 0.6 });
  }
  // Woods in between the clearings.
  for (let i = 0; i < 9000 && trees.length < 1150; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (WORLD.radius - 3);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (ok(x, z, 3.0)) trees.push({ x, z, s: 0.75 + rand() * 0.6 });
  }
  for (const t of trees) t.r = 0.55 * t.s;
  return trees;
}

/** Enemy homes for a kind, spread around its area (seeded). */
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

/** Everything solid on the ground as circles { x, z, r } (trees passed in, so the layout is built once). */
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
    ...trees.map((t) => ({ x: t.x, z: t.z, r: t.r }))
  ];
}

/**
 * Push a circle of radius `r` at (x, z) out of every solid circle and back
 * inside the world. Returns the corrected [x, z].
 */
export function resolveCollision(x, z, r, solids) {
  for (let pass = 0; pass < 2; pass++) {
    for (const s of solids) {
      const dx = x - s.x, dz = z - s.z;
      const min = r + s.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.0001;
      x = s.x + (dx / d) * min;
      z = s.z + (dz / d) * min;
    }
  }
  const d = Math.hypot(x, z);
  if (d > WORLD.radius) {
    x *= WORLD.radius / d;
    z *= WORLD.radius / d;
  }
  return [x, z];
}

/** Which named area a point is in (or 'woods'). */
export function areaAt(x, z) {
  for (const [id, a] of Object.entries(WORLD.areas)) if (dist2(x, z, a.x, a.z) < (a.r + 2) ** 2) return id;
  return 'woods';
}

/* -------------------------------------------------------------- save */

/** A fresh journey's whole state. */
export function newGame(look = 'ember') {
  return {
    v: SAVE_VERSION,
    hero: newHero(look),
    pos: [WORLD.start.x, WORLD.start.z],
    quests: newQuestLog(),
    herbsTaken: [],
    braziers: [],
    bossDefeated: false,
    ended: false,
    time: 0
  };
}

/** The game state as a string for localStorage. */
export const serialize = (game) => JSON.stringify({ ...game, v: SAVE_VERSION });

/**
 * A save read back, checked and filled in: anything missing or broken falls
 * back to a fresh game's value, so an old or tampered save never crashes the
 * game. Returns null when there is nothing usable.
 */
export function deserialize(text) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || data.v !== SAVE_VERSION || !data.hero) return null;
  const fresh = newGame(data.hero.look);
  const num = (v, d, lo = 0, hi = 1e9) => (Number.isFinite(v) ? clamp(v, lo, hi) : d);
  const h = data.hero;
  const hero = {
    ...fresh.hero,
    level: num(h.level, 1, 1, MAX_LEVEL),
    xp: num(h.xp, 0),
    gold: num(h.gold, 0),
    crystals: num(h.crystals, 0),
    herbs: num(h.herbs, 0),
    kills: num(h.kills, 0),
    deaths: num(h.deaths, 0),
    potions: { hp: num(h.potions?.hp, 0, 0, 999), mp: num(h.potions?.mp, 0, 0, 999) },
    bonus: { hp: num(h.bonus?.hp, 0, 0, 3), atk: num(h.bonus?.atk, 0, 0, 3) }
  };
  const s = heroStats(hero.level, hero.bonus);
  hero.hp = num(h.hp, s.maxHp, 1, s.maxHp);
  hero.mp = num(h.mp, s.maxMp, 0, s.maxMp);
  const quests = newQuestLog();
  for (const q of QUESTS) {
    const e = data.quests?.[q.id];
    if (e && ['locked', 'available', 'active', 'ready', 'done'].includes(e.state)) quests[q.id] = { state: e.state, progress: num(e.progress, 0, 0, q.goal.count) };
  }
  const pos = Array.isArray(data.pos) && data.pos.length === 2 && data.pos.every(Number.isFinite) ? resolveCollision(data.pos[0], data.pos[1], 0, []) : fresh.pos;
  return {
    v: SAVE_VERSION,
    hero,
    pos,
    quests,
    herbsTaken: Array.isArray(data.herbsTaken) ? data.herbsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < WORLD.herbs.length) : [],
    braziers: Array.isArray(data.braziers) ? data.braziers.filter((id) => WORLD.braziers.some((b) => b.id === id)) : [],
    bossDefeated: Boolean(data.bossDefeated),
    ended: Boolean(data.ended),
    time: num(data.time, 0)
  };
}
