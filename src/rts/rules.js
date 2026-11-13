/**
 * Shardfront's rules: three factions of our own, their units and buildings,
 * and the numbers the simulation (sim.js) runs on. Pure data — no Three.js —
 * so the server, the tests and the computer players read the same table.
 *
 * Every faction shares five unit roles and five building roles; what differs
 * is their names, looks, numbers and one passive each:
 *   League  — a worker must stay to build, and workers repair.
 *   Thornkin — living plants: every unit and building heals itself; seeds grow alone.
 *   Prism   — crystal constructs: tougher and armored, dearer; buildings form alone.
 */

export const TICK = 0.05; // seconds per simulation step (20 a second)
export const CELL = 2; // world units per grid cell
export const MAX_SUPPLY = 120;
export const START_SHARDS = 200;
export const START_WORKERS = 5;
export const CARRY = 5; // shards a worker carries back per trip
export const MINE_TIME = 2.2; // seconds a worker mines for one load
export const NODE_SHARDS = 900; // shards in one crystal
export const MAX_QUEUE = 5;

export const MAP_SIZES = {
  large: { cells: 128, name: 'Large', note: '256 m across' },
  huge: { cells: 192, name: 'Huge', note: '384 m across' },
  giant: { cells: 256, name: 'Giant', note: '512 m across' }
};

export const DIFFICULTIES = {
  easy: { name: 'Easy', think: 2, workers: 12, attackAt: 14, grow: 2, barracks: 1, towers: 0 },
  normal: { name: 'Normal', think: 1, workers: 18, attackAt: 20, grow: 4, barracks: 2, towers: 1 },
  hard: { name: 'Hard', think: 0.5, workers: 24, attackAt: 24, grow: 6, barracks: 3, towers: 2 }
};

/** Player colours, in seat order (you are seat 0). */
export const TEAM_COLORS = ['#3d8bff', '#ef4f4f', '#f2c230', '#42c97a'];

/* ---- the shared roles ---- */

/**
 * Unit roles. `range` is edge to edge; `splash` is a radius; `armor` comes
 * off every hit (a hit always does at least 1).
 */
const UNIT_ROLES = {
  worker: { hp: 40, speed: 5.5, range: 0.8, damage: 4, cooldown: 1.2, sight: 16, cost: 50, time: 12, supply: 1, radius: 0.7, armor: 0, from: 'core' },
  light: { hp: 60, speed: 6, range: 10, damage: 7, cooldown: 0.9, sight: 20, cost: 60, time: 15, supply: 1, radius: 0.7, armor: 0, from: 'barracks' },
  raider: { hp: 85, speed: 9, range: 4, damage: 9, cooldown: 0.75, sight: 20, cost: 80, time: 18, supply: 2, radius: 0.9, armor: 0, from: 'barracks' },
  heavy: { hp: 230, speed: 4.2, range: 1.2, damage: 20, cooldown: 1.4, sight: 16, cost: 130, time: 24, supply: 2, radius: 1.2, armor: 2, from: 'workshop' },
  siege: { hp: 120, speed: 3.6, range: 22, damage: 32, cooldown: 3, sight: 18, cost: 175, time: 30, supply: 3, radius: 1.3, armor: 0, splash: 3.5, minRange: 4, from: 'workshop' }
};

/** Building roles; `size` is the footprint in cells (square). */
const BUILDING_ROLES = {
  core: { hp: 1500, cost: 400, time: 70, size: 5, supply: 10, sight: 22, armor: 1, trains: ['worker'], dropOff: true },
  depot: { hp: 400, cost: 100, time: 20, size: 2, supply: 8, sight: 10, armor: 1, trains: [] },
  barracks: { hp: 800, cost: 150, time: 40, size: 3, supply: 0, sight: 12, armor: 1, trains: ['light', 'raider'], needs: 'core' },
  workshop: { hp: 900, cost: 200, time: 50, size: 3, supply: 0, sight: 12, armor: 1, trains: ['heavy', 'siege'], needs: 'barracks' },
  tower: { hp: 500, cost: 125, time: 30, size: 2, supply: 0, sight: 20, armor: 1, trains: [], needs: 'barracks', range: 16, damage: 12, cooldown: 1 }
};

export const UNIT_ORDER = ['worker', 'light', 'raider', 'heavy', 'siege'];
export const BUILDING_ORDER = ['core', 'depot', 'barracks', 'workshop', 'tower'];
/** The worker's build card, with its keys. */
export const BUILD_KEYS = { core: 'C', depot: 'D', barracks: 'B', workshop: 'W', tower: 'T' };
export const TRAIN_KEYS = ['Q', 'W', 'E', 'R'];

/* ---- the factions ---- */

export const FACTIONS = {
  league: {
    id: 'league',
    name: 'Frontier League',
    blurb: 'Salvage crews and their walking machines. Sturdy, cheap to fix: a Rigger has to stay to build, and Riggers repair what is hurt.',
    passive: 'Riggers build and repair',
    builds: 'attend',
    repair: true,
    regen: 0,
    look: { body: '#8e9aa8', dark: '#4b5563', accent: '#f0b44a', glow: '#ffd27a' },
    units: {
      worker: { name: 'Rigger', blurb: 'Mines shards, builds, repairs.' },
      light: { name: 'Ranger', blurb: 'A rifle walker. Cheap, long reach.' },
      raider: { name: 'Outrider', blurb: 'A fast buggy with a twin gun.' },
      heavy: { name: 'Bulwark', blurb: 'A slow plated walker that hits hard up close.' },
      siege: { name: 'Longshot', blurb: 'A mortar crawler: far, slow, splashes. Weak up close.' }
    },
    buildings: {
      core: { name: 'Command Hub', blurb: 'Trains Riggers and takes in shards. +10 supply.' },
      depot: { name: 'Supply Silo', blurb: '+8 supply.' },
      barracks: { name: 'Barracks Yard', blurb: 'Trains Rangers and Outriders.' },
      workshop: { name: 'Mech Works', blurb: 'Trains Bulwarks and Longshots.' },
      tower: { name: 'Sentry Post', blurb: 'A gun turret.' }
    },
    tweak: {}
  },
  thornkin: {
    id: 'thornkin',
    name: 'Thornkin Grove',
    blurb: 'A living forest that walks. Everything heals itself over time, seeds grow into buildings on their own, and the vines are cheap.',
    passive: 'Everything regrows',
    builds: 'self',
    repair: false,
    regen: 0.012, // of max health, a second
    look: { body: '#5c8a3a', dark: '#3b2b1d', accent: '#c06bd6', glow: '#e6a7ff' },
    units: {
      worker: { name: 'Sprout', blurb: 'Gathers shards and plants seeds.' },
      light: { name: 'Spiker', blurb: 'Throws thorns. Cheap, quick to grow.' },
      raider: { name: 'Thornrunner', blurb: 'A fast thorny hound that bites.' },
      heavy: { name: 'Barkhide', blurb: 'A bark-armored beast. Heals quickly.' },
      siege: { name: 'Sporelobber', blurb: 'Lobs spore pods far: they burst on a crowd.' }
    },
    buildings: {
      core: { name: 'Heartroot', blurb: 'Grows Sprouts and takes in shards. +10 supply.' },
      depot: { name: 'Seedpod', blurb: '+8 supply.' },
      barracks: { name: 'Thicket', blurb: 'Grows Spikers and Thornrunners.' },
      workshop: { name: 'Deep Grove', blurb: 'Grows Barkhides and Sporelobbers.' },
      tower: { name: 'Thorn Spire', blurb: 'Shoots thorns.' }
    },
    tweak: {
      light: { cost: 50, hp: 55, time: 13 },
      raider: { cost: 70, speed: 9.5 },
      heavy: { hp: 210, armor: 1 },
      core: { cost: 375 },
      depot: { cost: 90 }
    }
  },
  prism: {
    id: 'prism',
    name: 'Prism Choir',
    blurb: 'Singing crystal constructs that float. Every one is tougher and armored, and costs more; buildings form by themselves.',
    passive: 'Hard crystal: +20% health, +1 armor',
    builds: 'self',
    repair: false,
    regen: 0,
    look: { body: '#bfe9ff', dark: '#3a4a7a', accent: '#7ef0ff', glow: '#c9fbff' },
    units: {
      worker: { name: 'Mote', blurb: 'A floating shard that gathers and shapes buildings.' },
      light: { name: 'Glint', blurb: 'Shoots light. Armored for its size.' },
      raider: { name: 'Flicker', blurb: 'A fast spinning blade.' },
      heavy: { name: 'Monolith', blurb: 'A crystal wall that crushes.' },
      siege: { name: 'Lens', blurb: 'Focuses a long beam that scorches a spot.' }
    },
    buildings: {
      core: { name: 'Prism Spire', blurb: 'Forms Motes and takes in shards. +10 supply.' },
      depot: { name: 'Resonator', blurb: '+8 supply.' },
      barracks: { name: 'Facet Hall', blurb: 'Forms Glints and Flickers.' },
      workshop: { name: 'Crystal Forge', blurb: 'Forms Monoliths and Lenses.' },
      tower: { name: 'Glare Tower', blurb: 'Shoots light.' }
    },
    tweak: { all: { hpScale: 1.2, armor: 1, costScale: 1.15 } }
  }
};

export const FACTION_ORDER = ['league', 'thornkin', 'prism'];

const round5 = (n) => Math.round(n / 5) * 5;

/** A unit's or building's numbers for a faction (the role's, with the faction's tweaks). */
export function statsOf(faction, type) {
  const f = FACTIONS[faction];
  const unit = UNIT_ROLES[type];
  const base = unit ?? BUILDING_ROLES[type];
  if (!f || !base) throw new Error(`no such thing: ${faction}/${type}`);
  const out = { ...base, ...(f.tweak[type] ?? {}), type, kind: unit ? 'unit' : 'building' };
  const all = f.tweak.all;
  if (all) {
    out.hp = Math.round(out.hp * all.hpScale);
    out.armor = (out.armor ?? 0) + all.armor;
    out.cost = round5(out.cost * all.costScale);
  }
  out.name = (unit ? f.units : f.buildings)[type].name;
  out.blurb = (unit ? f.units : f.buildings)[type].blurb;
  return out;
}

/** Every unit and building, for all three factions — computed once. */
export const STATS = Object.fromEntries(
  FACTION_ORDER.map((f) => [f, Object.fromEntries([...UNIT_ORDER, ...BUILDING_ORDER].map((t) => [t, statsOf(f, t)]))])
);

/** What a building of this role trains, as unit types. */
export const trainsOf = (type) => BUILDING_ROLES[type]?.trains ?? [];
export const isUnitType = (type) => type in UNIT_ROLES;
export const isBuildingType = (type) => type in BUILDING_ROLES;
