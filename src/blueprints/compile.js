import { MONSTER_KINDS, describeGoal, normalizeLevel, slugify } from '../levels/Level.js';
import { keywordPlan, normalizePlan } from '../world/MapPlan.js';
import { DIFFICULTY, GENRES } from './genres.js';
import { LAYOUTS, LAYOUT_IDS } from './layouts.js';
import { WORLDS } from './worlds.js';
import { FOES, HELPERS, mainKind } from './cast.js';
import { normalizeSpec } from './spec.js';

/**
 * A game spec → playable levels, with no AI and no randomness beyond the seed.
 *
 * Each level carries its map *plan* and no objects: the game scatters the
 * scenery from the asset library when the level is played or opened in the
 * editor (App#_expandLevel → ComposedWorld#levelFromPlan), with the level's
 * seed, so the same file always builds the same map. A compiled level is a
 * few kilobytes instead of fifty, and stays fully editable.
 *
 * Chapters: chapter 1 uses the spec's layout, later ones rotate through the
 * others so each room feels different, numbers grow by a quarter per
 * chapter, and a genre with a `finale` ends in the boss lair.
 */

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const low = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** "{Place} is safe" → "The village of Thistlebrook is safe". */
export function fill(template, ctx) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (whole, key) => {
    const value = ctx[key.toLowerCase()];
    if (value == null) return whole;
    return key[0] === key[0].toUpperCase() && key[0] !== key[0].toLowerCase() ? cap(String(value)) : String(value);
  });
}

/** The ids a game's chapters use: `<slug>`, or `<slug>-1`, `<slug>-2`…, never one in `taken`. */
export function chapterIds(name, chapters, taken = new Set()) {
  const base = slugify(name).slice(0, 40);
  for (let n = 1; n < 1000; n++) {
    const stem = n === 1 ? base : `${base}-${n}`;
    const ids = chapters === 1 ? [stem] : Array.from({ length: chapters }, (_, i) => `${stem}-${i + 1}`);
    if (ids.every((id) => !taken.has(id))) return ids;
  }
  return Array.from({ length: chapters }, (_, i) => `${base}-${Date.now().toString(36)}-${i + 1}`);
}

/** The map plan for a world (its preset, then the spec's own plan on a Plus build). */
export function worldPlan(worldId, { name, custom = null, finale = false } = {}) {
  const world = WORLDS[worldId];
  const base = keywordPlan(world.theme);
  const plan = normalizePlan({ ...base, ...world.plan, ...(custom ?? {}), name: name ?? world.name });
  if (finale) plan.fog = Math.min(1, plan.fog + 0.15);
  return plan;
}

const faceMiddle = (x, z) => Math.atan2(-x, -z);
const STUDY_LEVEL = { easy: 'easy', normal: 'medium', hard: 'hard' };

/**
 * @param {object} rawSpec anything normalizeSpec accepts
 * @param {{ seed?: number, taken?: Set<string>, heroes?: string[] }} [options]
 *        `taken`: level ids already in use; `heroes`: extra class ids allowed (forged)
 * @returns {{ spec: object, levels: object[], campaign: { id: string, name: string }[] }}
 */
export function compileGame(rawSpec, { seed = 1, taken = new Set(), heroes = [] } = {}) {
  const spec = normalizeSpec(rawSpec, { heroes });
  const genre = GENRES[spec.genre];
  const world = WORLDS[spec.world];
  const diff = DIFFICULTY[spec.difficulty];
  const n = spec.chapters;
  const ids = chapterIds(spec.name, n, taken);
  const calm = Boolean(genre.calm) || spec.foes === 'none';
  const foes = FOES[spec.foes];
  const rotation = LAYOUT_IDS.filter((id) => id !== 'boss-lair' && id !== spec.layout);

  const levels = ids.map((id, i) => {
    const finale = n > 1 && i === n - 1 && genre.finale === 'boss' && !calm;
    const layoutId = finale ? 'boss-lair' : i === 0 ? spec.layout : rotation[(i - 1) % rotation.length];
    const layout = LAYOUTS[layoutId];
    const grow = 1 + 0.25 * i;
    const goal = finale ? 'boss' : genre.goal;
    const baseCount = finale ? GENRES['boss-hunt'].count : genre.count;
    const count = clamp(Math.round(baseCount * diff.count * grow), goal === 'boss' ? 2 : 1, 99);

    const kinds = Object.fromEntries(MONSTER_KINDS.map((k) => [k, k === 'dragon' ? 0 : (foes.kinds[k] ?? 0)]));
    const rules = {
      goal,
      count,
      calm,
      kinds,
      baseCount: clamp(Math.round(genre.pace.baseCount * diff.pace * (1 + 0.15 * i)), 1, 30),
      growth: clamp(+(genre.pace.growth * diff.growth).toFixed(2), 1, 2),
      bossEvery: calm || genre.goal === 'study' ? 0 : 3,
      dragonEvery: goal === 'boss' ? count : 0
    };
    const goalText = describeGoal(rules);
    const ctx = { place: world.place, foes: foes.story, goal: low(goalText), count: String(count) };

    // Helpers: the genre's, then the spec's extras, as many as the layout has slots for.
    const helperIds = [...new Set([...genre.helpers, ...spec.helpers])].slice(0, layout.helpers.length);
    const npcs = helperIds.map((helperId, h) => {
      const helper = HELPERS[helperId];
      const slot = layout.helpers[h];
      const own = spec.custom?.npcs?.[h];
      const name = own?.name || world.names[h % world.names.length];
      return {
        id: `${helperId}-${h + 1}`,
        name,
        role: helper.role,
        model: helper.model,
        x: slot.x,
        z: slot.z,
        yaw: faceMiddle(slot.x, slot.z),
        greeting: own?.greeting || fill(helper.greeting, ctx),
        lines: own?.lines?.length ? own.lines : helper.lines.map((line) => fill(line, ctx)),
        ai: helper.role === 'tutor',
        persona: helper.role === 'tutor' ? `A learner of about ${spec.age}. Be patient, cheerful and simple.` : '',
        gift: { type: 'none', rarity: 'magic', amount: 50 },
        quest:
          helper.role === 'quest'
            ? { title: `Clear out the ${foes.name}`.slice(0, 60), target: mainKind(spec.foes) ?? 'any', count: clamp(Math.round(goal === 'kills' ? count / 2 : 10 * grow), 1, 200), gold: Math.round(100 * diff.count * grow), rarity: 'rare' }
            : null,
        study:
          helper.role === 'tutor'
            ? {
                subject: spec.subject === 'none' ? 'mixed' : spec.subject,
                difficulty: STUDY_LEVEL[spec.difficulty],
                age: spec.age,
                questions: spec.questions,
                gold: spec.reward.gold,
                bonusEvery: spec.reward.every,
                bonus: spec.reward.bonus
              }
            : null
      };
    });

    const portals = layout.portals.flatMap(([a, b], p) => [
      { id: `gate-${p + 1}a`, x: a.x, z: a.z, yaw: faceMiddle(a.x, a.z), color: 'violet', frame: 'ring', label: 'Portal', target: { type: 'portal', portal: `gate-${p + 1}b` } },
      { id: `gate-${p + 1}b`, x: b.x, z: b.z, yaw: faceMiddle(b.x, b.z), color: 'violet', frame: 'ring', label: 'Portal', target: { type: 'portal', portal: `gate-${p + 1}a` } }
    ]);

    const sentry = mainKind(spec.foes);
    const monsters = calm || genre.goal === 'study' || !sentry ? [] : layout.sentries.map((s) => ({ kind: sentry, x: s.x, z: s.z }));
    const spawns = layout.spawns.map((s) => ({ x: s.x, z: s.z, kinds: s.boss ? ['dragon', 'golem'] : [], from: 1, to: 0 }));

    const chapter = spec.custom?.chapters?.[i];
    const title = chapter?.name || (n > 1 ? (finale ? 'The lair' : `Chapter ${i + 1}`) : spec.name);
    const intro =
      chapter?.intro ||
      (i === 0 && spec.story.intro) ||
      fill(finale ? 'The Emberwyrm waits at the heart of {place}. Clear its guards. It comes on wave {count}.' : genre.story.intro, { ...ctx, goal: goalText });
    const outro =
      chapter?.outro ||
      (i === n - 1 && spec.story.outro) ||
      fill(i === n - 1 ? genre.story.outro : 'This part of {place} is clear. Onward!', ctx);

    const name = n > 1 ? `${spec.name}: ${title}`.slice(0, 80) : spec.name;
    const plan = worldPlan(spec.world, { name, custom: spec.custom?.plan, finale });
    const levelSeed = (Math.abs(seed | 0) + i * 7919) % 2147483647;
    return normalizeLevel({
      id,
      name,
      character: spec.hero === 'any' ? null : spec.hero,
      world: { ground: plan.ground, relief: plan.relief, edge: plan.edge, timeOfDay: plan.timeOfDay, fog: plan.fog, seed: levelSeed, terrain: {} },
      plan,
      objects: [],
      spawns,
      monsters,
      portals,
      npcs,
      rules,
      story: { intro: { title, speaker: npcs[0]?.name ?? '', text: intro }, outro: { title: i === n - 1 ? 'The end' : `${title}: done`, speaker: npcs[0]?.name ?? '', text: outro } },
      blueprint: { genre: spec.genre, world: spec.world, layout: layoutId, foes: spec.foes, chapter: i + 1, of: n }
    });
  });

  return { spec, levels, campaign: levels.map((l) => ({ id: l.id, name: l.name })) };
}
