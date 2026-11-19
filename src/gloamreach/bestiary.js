/**
 * Gloamreach's monsters, as data: what each kind is (model, rig, size,
 * stats, how it fights: every attack with its wind-up tell), where they live
 * (wolves and boars in the woods round Brindlewick, spiders, corrupted wisps,
 * treants and gloomcaps in the Gloamwood, four named elites, and the boss on
 * Emberfall Ledge), and how long they take to come back. Pure: tests read it.
 *
 * Attacks: `kind` melee (a cone in front), charge (a straight rush), proj
 * (a missile), aoe (a ring round a point), breath (a cone that burns while it
 * lasts), sweep (all round, the tail). `windup` is the tell (seconds before
 * it lands); `range`/`minRange` when it may be chosen; `cd` before it again.
 */

export const RESPAWN = { normal: 45, elite: 180, boss: 300 };

export const MONSTERS = {
  wolf: {
    name: 'Timber Wolf', model: 'wolf-base', rig: 'quad', family: 'beast', length: 1.75, radius: 0.55,
    hp: 58, atk: 9, armour: 3, walk: 1.7, run: 7.4, aggro: 15, leash: 34, roam: 9, tint: [0.62, 0.6, 0.58], eyes: '#ffcc55',
    attacks: [{ id: 'bite', kind: 'melee', windup: 0.42, range: 2.0, arc: 1.5, mult: 1, cd: 1.3, lunge: 2.6 }],
    voice: 'wolf'
  },
  boar: {
    name: 'Thornback Boar', model: 'thorn-boar-base', rig: 'quad', family: 'beast', length: 1.9, radius: 0.75,
    hp: 96, atk: 12, armour: 9, walk: 1.4, run: 6.6, aggro: 11, leash: 30, roam: 7, tint: [0.72, 0.62, 0.55],
    attacks: [
      { id: 'gore', kind: 'melee', windup: 0.55, range: 2.2, arc: 1.4, mult: 1, cd: 1.6, lunge: 1.5 },
      { id: 'charge', kind: 'charge', windup: 0.95, range: 13, minRange: 4.5, mult: 1.7, cd: 7, speed: 15, knock: 7 }
    ],
    voice: 'boar'
  },
  spider: {
    name: 'Gloam Spider', model: 'tarantula-base', rig: 'spider', family: 'spider', length: 1.7, radius: 0.7,
    hp: 64, atk: 11, armour: 4, walk: 2.2, run: 7.8, aggro: 13, leash: 30, roam: 8, tint: [0.95, 0.78, 1.15], glow: '#b46cff',
    attacks: [
      { id: 'bite', kind: 'melee', windup: 0.4, range: 2.0, arc: 1.4, mult: 1, cd: 1.2, lunge: 1.8, poison: 4 },
      { id: 'spit', kind: 'proj', windup: 0.55, range: 13, minRange: 4, mult: 0.8, cd: 4, speed: 16, slow: 0.4, color: '#9cff5a' }
    ],
    voice: 'spider'
  },
  wisp: {
    name: 'Corrupted Wisp', model: null, rig: 'wisp', family: 'fey', length: 0.9, radius: 0.5, fly: 1.6,
    hp: 46, atk: 12, armour: 0, walk: 1.6, run: 5.2, aggro: 17, leash: 32, roam: 10, glow: '#d35cff',
    attacks: [
      { id: 'bolt', kind: 'proj', windup: 0.6, range: 15, minRange: 0, mult: 1, cd: 2.2, speed: 13, color: '#e070ff' },
      { id: 'pulse', kind: 'aoe', windup: 0.8, range: 3.2, radius: 3.4, mult: 1.3, cd: 6, at: 'self' }
    ],
    keepAway: 7,
    voice: 'wisp'
  },
  treant: {
    name: 'Twisted Treant', model: 'iridescent-treegolem-base', rig: 'humanoid', family: 'wood', height: 3.1, radius: 0.9,
    hp: 170, atk: 16, armour: 20, walk: 1.2, run: 3.4, aggro: 11, leash: 26, roam: 5, tint: [0.62, 0.52, 0.72], glow: '#c4a0ff',
    attacks: [
      { id: 'swipe', kind: 'melee', windup: 0.75, range: 3.0, arc: 2.4, mult: 1, cd: 1.9, anim: 'Swipe' },
      { id: 'slam', kind: 'aoe', windup: 1.15, range: 4, radius: 3.6, mult: 1.6, cd: 7, anim: 'Smash', at: 'front', stun: 0.6 }
    ],
    voice: 'treant'
  },
  gloomcap: {
    name: 'Gloomcap', model: 'fungus-host-base', rig: 'humanoid', family: 'fey', height: 1.55, radius: 0.5,
    hp: 72, atk: 10, armour: 6, walk: 1.3, run: 5.0, aggro: 12, leash: 28, roam: 6, tint: [0.78, 0.7, 0.92], glow: '#7affd8',
    attacks: [
      { id: 'punch', kind: 'melee', windup: 0.5, range: 1.9, arc: 1.4, mult: 1, cd: 1.4, anim: 'Punch' },
      { id: 'spores', kind: 'aoe', windup: 0.9, range: 2.6, radius: 3.2, mult: 0.9, cd: 6, anim: 'Roar', at: 'self', poison: 5 }
    ],
    voice: 'shroom'
  },
  // Elites: named, bigger, harder, with an aura and a reward chest.
  greymane: {
    base: 'wolf', name: 'Greymane', title: 'Alpha of the Western Woods', elite: true, scale: 1.75, tint: [0.42, 0.4, 0.46], eyes: '#ff5a2a',
    hp: 330, atk: 15, armour: 8, aggro: 18, leash: 40,
    attacks: [
      { id: 'bite', kind: 'melee', windup: 0.42, range: 2.8, arc: 1.6, mult: 1, cd: 1.2, lunge: 3 },
      { id: 'pounce', kind: 'charge', windup: 0.7, range: 11, minRange: 4, mult: 1.6, cd: 6, speed: 17, knock: 6 },
      { id: 'howl', kind: 'aoe', windup: 1.0, range: 5, radius: 5.5, mult: 0.7, cd: 12, at: 'self', stun: 1.0, anim: 'Howl' }
    ]
  },
  webmother: {
    base: 'spider', name: 'Mother Vethra', title: 'Queen of the Webs', elite: true, scale: 2.4, tint: [0.8, 0.55, 1.0],
    hp: 380, atk: 16, armour: 10, aggro: 15, leash: 32,
    attacks: [
      { id: 'bite', kind: 'melee', windup: 0.5, range: 3.2, arc: 1.6, mult: 1.1, cd: 1.4, lunge: 2.2, poison: 6 },
      { id: 'spit', kind: 'proj', windup: 0.5, range: 15, minRange: 3, mult: 0.9, cd: 2.6, speed: 18, slow: 0.5, color: '#9cff5a', spread: 3 },
      { id: 'brood', kind: 'aoe', windup: 1.2, range: 6, radius: 4.5, mult: 1.2, cd: 10, at: 'target', poison: 6 }
    ]
  },
  hollowroot: {
    base: 'treant', name: 'Hollowroot', title: 'the Elder Treant', model: 'root-colossus-base', elite: true, height: 4.6, tint: [0.62, 0.5, 0.48],
    hp: 520, atk: 20, armour: 28, aggro: 13, leash: 28, radius: 1.3,
    attacks: [
      { id: 'swipe', kind: 'melee', windup: 0.8, range: 4.0, arc: 2.6, mult: 1, cd: 1.8, anim: 'Swipe' },
      { id: 'slam', kind: 'aoe', windup: 1.2, range: 6, radius: 4.6, mult: 1.7, cd: 6, anim: 'Smash', at: 'front', stun: 0.8 },
      { id: 'roots', kind: 'aoe', windup: 1.0, range: 14, radius: 3, mult: 1.2, cd: 9, anim: 'Roar', at: 'target', root: 1.5 }
    ]
  },
  grummoch: {
    base: 'treant', name: 'Grummoch', title: 'the Ash-Troll', model: 'ashen-troll-base', elite: true, family: 'fire', height: 3.3, tint: [0.62, 0.56, 0.54], glow: '#ff6a2a',
    hp: 560, atk: 22, armour: 22, walk: 1.4, run: 4.6, aggro: 14, leash: 30, radius: 1.1,
    attacks: [
      { id: 'swipe', kind: 'melee', windup: 0.7, range: 3.4, arc: 2.4, mult: 1, cd: 1.6, anim: 'Swipe' },
      { id: 'slam', kind: 'aoe', windup: 1.1, range: 5, radius: 4.2, mult: 1.8, cd: 6, anim: 'Smash', at: 'front', stun: 0.8, fire: true }
    ]
  },
  // The boss of Emberfall Ledge.
  cindermaw: {
    name: 'Cindermaw', title: 'Brood of Vaelthrax', model: 'red-fire-dragon-base', rig: 'drake', family: 'fire', boss: true, length: 9.5, radius: 2.4,
    hp: 1700, atk: 24, armour: 26, walk: 2.2, run: 6.5, aggro: 22, leash: 30, roam: 3, glow: '#ff7a22',
    attacks: [
      { id: 'bite', kind: 'melee', windup: 0.7, range: 5.2, arc: 1.5, mult: 1.1, cd: 1.8, lunge: 2 },
      { id: 'tail', kind: 'sweep', windup: 0.85, range: 6, radius: 6.5, mult: 1.0, cd: 6, knock: 9 },
      { id: 'breath', kind: 'breath', windup: 0.9, range: 13, arc: 0.9, mult: 0.32, cd: 9, time: 2.0, tick: 0.2, fire: true },
      { id: 'roar', kind: 'aoe', windup: 1.0, range: 9, radius: 9, mult: 0.5, cd: 16, at: 'self', stun: 1.2, anim: 'Roar' },
      { id: 'embers', kind: 'aoe', windup: 1.4, range: 22, minRange: 7, radius: 3.4, mult: 1.4, cd: 8, at: 'target', fire: true, count: 3 }
    ],
    voice: 'drake'
  }
};

/** A monster's whole definition, its base's numbers filled in (elites build on a common kind). */
export function monsterDef(type) {
  const d = MONSTERS[type];
  if (!d) return null;
  const base = d.base ? MONSTERS[d.base] : {};
  return { type, ...base, ...d, attacks: d.attacks ?? base.attacks, rig: d.rig ?? base.rig, family: d.family ?? base.family };
}

/** Its tier: for loot, respawn and the HUD. */
export const tierOf = (def) => (def.boss ? 'boss' : def.elite ? 'elite' : 'normal');

/**
 * Where they live: [type, x, z, level, group]. A group aggroes together (a
 * wolf pack). None closer than 55 m to Brindlewick's square.
 */
export const SPAWNS = [
  // The woods round Brindlewick: wolves to the north-west and south-east, boars here and there.
  ['wolf', -74, -76, 1, 'w1'], ['wolf', -70, -82, 1, 'w1'], ['wolf', -80, -84, 2, 'w1'],
  ['wolf', 74, 72, 2, 'w2'], ['wolf', 80, 66, 2, 'w2'], ['wolf', 70, 80, 3, 'w2'],
  ['boar', 38, -96, 2], ['boar', -56, 90, 2], ['boar', 92, -60, 3], ['boar', -98, -20, 3],
  ['greymane', -94, -96, 4],
  // The Gloamwood.
  ['spider', -62, -198, 4], ['spider', -70, -212, 4], ['spider', 58, -238, 5], ['spider', 66, -248, 5], ['spider', -66, -300, 6],
  ['wisp', 46, -300, 5], ['wisp', -52, -262, 5], ['wisp', 66, -192, 4], ['wisp', -36, -232, 5],
  ['treant', -76, -240, 6], ['treant', 76, -270, 6], ['treant', -42, -318, 7],
  ['gloomcap', 52, -312, 5, 'g1'], ['gloomcap', 58, -316, 5, 'g1'], ['gloomcap', -82, -186, 4],
  ['webmother', -80, -282, 7],
  ['hollowroot', 60, -322, 8],
  // Emberfall Ledge.
  ['grummoch', 112, -30, 8],
  ['cindermaw', 124, -50, 10]
];

/** The spawn list as objects. */
export const spawnList = () => SPAWNS.map(([type, x, z, level, group], i) => ({ id: `m${i}`, type, x, z, level, group: group ?? null }));

/**
 * Which attack a monster uses now: the first whose range fits and whose
 * cooldown is over (the list's order is its preference), or null to close in.
 * `ready(id)` says whether an attack's cooldown is done.
 */
export function chooseAttack(def, dist, ready, rand = Math.random) {
  const fits = def.attacks.filter((a) => dist <= a.range && dist >= (a.minRange ?? 0) && ready(a.id));
  if (!fits.length) return null;
  // Specials first when they fit (rarer and bigger), else the basic.
  const special = fits.filter((a) => a !== def.attacks[0]);
  if (special.length && rand() < 0.7) return special[Math.floor(rand() * special.length) % special.length];
  return fits[0];
}

/** Has a monster strayed too far from home (it gives up and goes back)? */
export const beyondLeash = (m, def) => Math.hypot(m.x - m.homeX, m.z - m.homeZ) > def.leash;
