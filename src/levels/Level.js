import { EDGE_OPTIONS, RELIEF_OPTIONS, SURFACE_OPTIONS, TIME_OPTIONS } from '../world/MapPlan.js';

/**
 * A level: one battlefield plus the rules and story around it. Saved as one
 * JSON file in `public/levels/<id>.json`, so levels ship with the game, live in
 * git, and can be passed around as files.
 *
 * {
 *   version, id, name,
 *   character: null | characterId,        // null = the player's own pick
 *   world: { ground, relief, edge, timeOfDay, fog, seed, terrain: { sculpt?, paint? } },
 *   objects: [{ model, category, x, z, yOffset, yaw, scale }],
 *   spawns:  [{ x, z }],                    // where waves walk in from (empty = all around)
 *   monsters: [{ kind, x, z }],             // already standing there when the level starts
 *   rules: { goal: 'waves'|'boss'|'kills', count, kinds: { grunt: 5, … }, baseCount, growth, bossEvery, dragonEvery },
 *   story: { intro: { title, speaker, text }, outro: { title, speaker, text } }
 * }
 */

export const LEVEL_VERSION = 1;
export const GOALS = ['waves', 'boss', 'kills'];
export const MONSTER_KINDS = ['grunt', 'wisp', 'brute', 'golem', 'dragon'];

const clamp = (v, lo, hi, fallback) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : fallback);
const pick = (v, options, fallback) => (options.includes(v) ? v : fallback);
const num = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback);
const text = (v, max = 2000) => String(v ?? '').slice(0, max);

/** File-name-safe id from a level name. */
export function slugify(name) {
  return (
    String(name ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48) || 'level'
  );
}

export function createLevel(name = 'New level') {
  return normalizeLevel({ name });
}

/** Repair anything (an old file, a hand-edited one) into a valid level. */
export function normalizeLevel(raw = {}) {
  const world = raw.world ?? {};
  const rules = raw.rules ?? {};
  const story = raw.story ?? {};
  const scene = (s = {}) => ({ title: text(s.title, 120), speaker: text(s.speaker, 60), text: text(s.text, 4000) });
  const kinds = {};
  for (const kind of MONSTER_KINDS) {
    const weight = clamp(rules.kinds?.[kind], 0, 20, kind === 'dragon' || kind === 'golem' ? 0 : kind === 'grunt' ? 5 : 3);
    kinds[kind] = weight;
  }
  const name = text(raw.name || 'New level', 80);
  return {
    version: LEVEL_VERSION,
    id: slugify(raw.id || name),
    name,
    character: raw.character ? String(raw.character) : null,
    world: {
      ground: pick(world.ground, SURFACE_OPTIONS, 'grass'),
      relief: pick(world.relief, RELIEF_OPTIONS, 'hills'),
      edge: pick(world.edge, EDGE_OPTIONS, 'open'),
      timeOfDay: pick(world.timeOfDay, TIME_OPTIONS, 'day'),
      fog: clamp(world.fog, 0, 1, 0.3),
      seed: Math.abs(num(world.seed, (Math.random() * 1e9) | 0)) | 0,
      terrain: world.terrain && typeof world.terrain === 'object' ? world.terrain : {}
    },
    objects: (Array.isArray(raw.objects) ? raw.objects : [])
      .filter((o) => o && typeof o.model === 'string')
      .slice(0, 20000)
      .map((o) => ({
        model: o.model,
        category: String(o.category ?? 'misc'),
        x: num(o.x),
        z: num(o.z),
        yOffset: num(o.yOffset),
        yaw: num(o.yaw),
        scale: clamp(o.scale, 0.01, 100, 1)
      })),
    spawns: (Array.isArray(raw.spawns) ? raw.spawns : []).slice(0, 32).map((s) => ({ x: num(s.x), z: num(s.z) })),
    monsters: (Array.isArray(raw.monsters) ? raw.monsters : [])
      .filter((m) => MONSTER_KINDS.includes(m?.kind))
      .slice(0, 60)
      .map((m) => ({ kind: m.kind, x: num(m.x), z: num(m.z) })),
    rules: {
      goal: pick(rules.goal, GOALS, 'waves'),
      count: clamp(rules.count, 1, 99, 3),
      kinds,
      baseCount: clamp(rules.baseCount, 1, 30, 4),
      growth: clamp(rules.growth, 1, 2, 1.35),
      bossEvery: clamp(rules.bossEvery, 0, 20, 3),
      dragonEvery: clamp(rules.dragonEvery, 0, 20, 5)
    },
    story: { intro: scene(story.intro), outro: scene(story.outro) }
  };
}

/** What the goal means, in words, for the HUD and the story panel. */
export function describeGoal(rules) {
  if (rules.goal === 'boss') return 'Defeat the boss';
  if (rules.goal === 'kills') return `Defeat ${rules.count} monsters`;
  return `Survive ${rules.count} wave${rules.count === 1 ? '' : 's'}`;
}
