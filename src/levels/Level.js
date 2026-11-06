import { EDGE_OPTIONS, RELIEF_OPTIONS, SURFACE_OPTIONS, TIME_OPTIONS } from '../world/MapPlan.js';
import { DIFFICULTIES, STUDY_BONUSES, SUBJECTS } from '../npc/Study.js';

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
 *   portals: [{ id, x, z, yaw, color, frame: 'arch'|'gateway'|'ring', label, target: { type: 'none'|'portal'|'level', portal?, level? } }],
 *   npcs: [{ id, name, role, model, x, z, yaw, greeting, lines[], ai, persona,
 *            gift: { type, rarity, amount }, quest: null | { title, target, count, gold, rarity },
 *            study: null | { subject, difficulty, age, questions: [{ q, a, wrong[], hint }],
 *                            gold, bonusEvery, bonus } }],   // tutors (role 'tutor')
 *   rules: { goal: 'waves'|'boss'|'kills'|'study', count, calm, kinds: { grunt: 5, … }, baseCount, growth, bossEvery, dragonEvery },
 *          // 'study' = answer `count` tutor questions correctly; calm = no monsters at all
 *   story: { intro: { title, speaker, text }, outro: { title, speaker, text } }
 * }
 */

export const LEVEL_VERSION = 1;
export const GOALS = ['waves', 'boss', 'kills', 'study'];
export const MONSTER_KINDS = ['grunt', 'wisp', 'brute', 'golem', 'dragon'];
export const PORTAL_COLOR_NAMES = ['blue', 'red', 'gold', 'green', 'violet'];
export const NPC_ROLE_NAMES = ['guide', 'merchant', 'healer', 'quest', 'tutor'];
export const GIFT_TYPES = ['none', 'health', 'focus', 'gold', 'weapon', 'gear', 'book'];
export const REWARD_RARITIES = ['none', 'magic', 'rare', 'epic', 'unique'];

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
    portals: (Array.isArray(raw.portals) ? raw.portals : []).slice(0, 16).map((p, i) => {
      const target = p?.target ?? {};
      const type = pick(target.type, ['none', 'portal', 'level'], 'none');
      return {
        id: String(p?.id ?? `portal-${i + 1}`).slice(0, 32),
        x: num(p?.x),
        z: num(p?.z),
        yaw: num(p?.yaw),
        color: pick(p?.color, PORTAL_COLOR_NAMES, 'blue'),
        frame: pick(p?.frame, ['arch', 'gateway', 'ring'], 'arch'),
        label: text(p?.label, 40),
        target: type === 'portal' ? { type, portal: String(target.portal ?? '') } : type === 'level' ? { type, level: String(target.level ?? '') } : { type: 'none' }
      };
    }),
    npcs: (Array.isArray(raw.npcs) ? raw.npcs : []).slice(0, 12).map((n, i) => {
      const gift = n?.gift ?? {};
      const quest = n?.quest;
      return {
        id: String(n?.id ?? `npc-${i + 1}`).slice(0, 32),
        name: text(n?.name || 'Stranger', 40),
        role: pick(n?.role, NPC_ROLE_NAMES, 'guide'),
        model: n?.model ? String(n.model) : null,
        x: num(n?.x),
        z: num(n?.z),
        yaw: num(n?.yaw),
        greeting: text(n?.greeting, 400),
        lines: (Array.isArray(n?.lines) ? n.lines : []).map((l) => text(l, 400)).filter(Boolean).slice(0, 20),
        ai: Boolean(n?.ai),
        persona: text(n?.persona, 600),
        gift: {
          type: pick(gift.type, GIFT_TYPES, 'none'),
          rarity: pick(gift.rarity, REWARD_RARITIES, 'magic'),
          amount: clamp(gift.amount, 1, 9999, 50)
        },
        quest:
          quest && typeof quest === 'object'
            ? {
                title: text(quest.title || 'A favour', 60),
                target: pick(quest.target, ['any', ...MONSTER_KINDS], 'any'),
                count: clamp(quest.count, 1, 200, 10),
                gold: clamp(quest.gold, 0, 9999, 100),
                rarity: pick(quest.rarity, REWARD_RARITIES, 'rare')
              }
            : null,
        study: n?.role === 'tutor' || n?.study ? normalizeStudy(n?.study) : null
      };
    }),
    rules: {
      goal: pick(rules.goal, GOALS, 'waves'),
      count: clamp(rules.count, 1, 99, 3),
      calm: Boolean(rules.calm),
      kinds,
      baseCount: clamp(rules.baseCount, 1, 30, 4),
      growth: clamp(rules.growth, 1, 2, 1.35),
      bossEvery: clamp(rules.bossEvery, 0, 20, 3),
      dragonEvery: clamp(rules.dragonEvery, 0, 20, 5)
    },
    story: { intro: scene(story.intro), outro: scene(story.outro) }
  };
}

/** A tutor's lesson plan, repaired. */
export function normalizeStudy(raw = {}) {
  const s = raw ?? {};
  return {
    subject: pick(s.subject, Object.keys(SUBJECTS), 'add'),
    difficulty: pick(s.difficulty, Object.keys(DIFFICULTIES), 'easy'),
    age: clamp(s.age, 4, 16, 8),
    questions: (Array.isArray(s.questions) ? s.questions : []).slice(0, 200).map((x) => ({
      q: text(x?.q, 300),
      a: text(x?.a, 120),
      wrong: (Array.isArray(x?.wrong) ? x.wrong : []).map((w) => text(w, 120)).filter(Boolean).slice(0, 5),
      hint: text(x?.hint, 300)
    })).filter((x) => x.q && x.a),
    gold: clamp(s.gold, 0, 500, 10),
    bonusEvery: clamp(s.bonusEvery, 0, 50, 5),
    bonus: pick(s.bonus, Object.keys(STUDY_BONUSES), 'book')
  };
}

/** What the goal means, in words, for the HUD and the story panel. */
export function describeGoal(rules) {
  if (rules.goal === 'study') return `Answer ${rules.count} question${rules.count === 1 ? '' : 's'} correctly`;
  if (rules.goal === 'boss') return 'Defeat the boss';
  if (rules.goal === 'kills') return `Defeat ${rules.count} monsters`;
  return `Survive ${rules.count} wave${rules.count === 1 ? '' : 's'}`;
}
