import { MAP_PLAN_SCHEMA } from '../world/MapPlan.js';
import { STUDY_BONUSES } from '../npc/Study.js';
import { DIFFICULTY_IDS, GENRES, GENRE_IDS } from './genres.js';
import { LAYOUTS, LAYOUT_IDS } from './layouts.js';
import { WORLDS, WORLD_IDS } from './worlds.js';
import { FOES, FOE_IDS, HELPERS, HELPER_IDS, HEROES, HERO_IDS, SUBJECT_IDS, SUBJECT_WORDS } from './cast.js';

/**
 * A game spec: the few choices that make a whole game. This is what the AI
 * writes (or the keyword builder, or a person clicking chips), and what
 * `compileGame` (compile.js) turns into playable levels.
 *
 *   {
 *     version: 1, name,
 *     genre, world, layout, hero, foes,    // ids from the blueprint menus
 *     chapters: 1–5, difficulty: easy|normal|hard,
 *     subject: none|add|subtract|times|mixed|custom, age: 4–16,   // study genres
 *     story: { intro, outro },             // short; empty = the genre's own text
 *     reward: { gold, every, bonus },      // a parent's reward for right answers
 *     questions: [{ q, a, wrong[], hint }],// a parent's own questions (subject 'custom')
 *     helpers: [helper ids],               // extra NPCs on top of the genre's
 *     custom: null | {                     // the Plus build: the premium model goes past the menus
 *       plan,                              //   a full map plan (world/MapPlan.js)
 *       chapters: [{ name, intro, outro }],
 *       npcs: [{ name, greeting, lines[] }]
 *     }
 *   }
 *
 * Why so small: the AI only picks ids and writes a name and two sentences,
 * about 120 output tokens, against ~800 for a map plan and ~1,400 for a class.
 * Its prompt (`menuPrompt`) never changes between requests, so a hosted model
 * can cache it.
 */

export const SPEC_VERSION = 1;
export const MAX_CHAPTERS = 5;

const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const pick = (v, ids, fallback) => (ids.includes(v) ? v : fallback);
const int = (v, lo, hi, fallback) => (Number.isFinite(+v) ? Math.round(Math.min(hi, Math.max(lo, +v))) : fallback);

/* ---------------------------------------------------------------------- */
/* What the AI is held to                                                  */
/* ---------------------------------------------------------------------- */

const SPEC_PROPERTIES = {
  name: { type: 'string', maxLength: 40 },
  genre: { type: 'string', enum: GENRE_IDS },
  world: { type: 'string', enum: WORLD_IDS },
  layout: { type: 'string', enum: LAYOUT_IDS },
  hero: { type: 'string', enum: HERO_IDS },
  foes: { type: 'string', enum: FOE_IDS },
  chapters: { type: 'integer', minimum: 1, maximum: MAX_CHAPTERS },
  difficulty: { type: 'string', enum: DIFFICULTY_IDS },
  subject: { type: 'string', enum: SUBJECT_IDS },
  age: { type: 'integer', minimum: 4, maximum: 16 },
  intro: { type: 'string', maxLength: 240 },
  outro: { type: 'string', maxLength: 240 }
};

/** The standard build: ids and a few words. */
export const GAME_SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(SPEC_PROPERTIES),
  properties: SPEC_PROPERTIES
};

const QUESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['q', 'a', 'wrong', 'hint'],
  properties: {
    q: { type: 'string', maxLength: 200 },
    a: { type: 'string', maxLength: 60 },
    wrong: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 60 } },
    hint: { type: 'string', maxLength: 160 }
  }
};

/** The Plus build: everything above, plus a map of its own, chapter stories, helper lines and questions. */
export const CUSTOM_SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(SPEC_PROPERTIES), 'map', 'chapterStories', 'npcs', 'questions'],
  properties: {
    ...SPEC_PROPERTIES,
    map: MAP_PLAN_SCHEMA,
    chapterStories: {
      type: 'array',
      maxItems: MAX_CHAPTERS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'intro', 'outro'],
        properties: { name: { type: 'string', maxLength: 40 }, intro: { type: 'string', maxLength: 300 }, outro: { type: 'string', maxLength: 300 } }
      }
    },
    npcs: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'greeting', 'lines'],
        properties: {
          name: { type: 'string', maxLength: 32 },
          greeting: { type: 'string', maxLength: 200 },
          lines: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 160 } }
        }
      }
    },
    questions: { type: 'array', maxItems: 20, items: QUESTION_SCHEMA }
  }
};

const menu = (title, registry) => [`${title}:`, ...Object.entries(registry).map(([id, e]) => `- ${id}: ${e.blurb}`)];

/**
 * The system prompt: the menus and the rules. Built from the registries, so
 * a new genre or world shows up here with no prompt editing. It is the same
 * text for every request.
 */
export function menuPrompt({ custom = false } = {}) {
  return [
    'You turn a game idea into a game spec for a 3D action game in the browser. Answer with JSON only.',
    'Pick one id from each menu. Choose what fits the idea best; the game builds the map, monsters and helpers itself.',
    ...menu('genre', GENRES),
    ...menu('world', WORLDS),
    ...menu('layout', LAYOUTS),
    ...menu('hero (the player\'s class)', HEROES),
    ...menu('foes', FOES),
    'subject: none, or for study genres add|subtract|times|mixed (custom = the parent writes questions).',
    'Rules:',
    '- name: 1–4 words, original (no names from existing games, films or books).',
    '- intro and outro: one or two short, friendly sentences for children. Empty strings are fine.',
    '- chapters 1–5 (dungeon-crawl and quest suit 3). difficulty easy|normal|hard. age: the child\'s age, 8 if unknown.',
    '- Calm learning means foes "none". Study genres need a subject other than none.',
    ...(custom
      ? [
          'This is a custom build. Also:',
          '- map: a map plan that fits the idea (it replaces the world\'s preset scenery).',
          '- chapterStories: one { name, intro, outro } per chapter.',
          '- npcs: names, a greeting and up to 4 lines for the helpers, in the world\'s voice.',
          '- questions: for study genres, up to 12 questions with one answer, 3 wrong answers and a hint, right for the age; else [].'
        ]
      : [])
  ].join('\n');
}

/* ---------------------------------------------------------------------- */
/* Repair                                                                  */
/* ---------------------------------------------------------------------- */

const STUDY_GENRES = new Set(['study', 'calm-study']);
export const isStudyGenre = (genre) => STUDY_GENRES.has(genre);

function normalizeQuestions(list) {
  return (Array.isArray(list) ? list : [])
    .slice(0, 50)
    .map((x) => ({
      q: text(x?.q, 300),
      a: text(x?.a, 120),
      wrong: (Array.isArray(x?.wrong) ? x.wrong : []).map((w) => text(w, 120)).filter(Boolean).slice(0, 5),
      hint: text(x?.hint, 300)
    }))
    .filter((x) => x.q && x.a);
}

/**
 * Anything (the AI's answer, a file, a half-filled form) → a valid spec.
 * @param {object} raw
 * @param {{ heroes?: string[] }} [options] extra hero ids allowed (forged classes)
 */
export function normalizeSpec(raw = {}, { heroes = [] } = {}) {
  const r = raw ?? {};
  const genre = pick(r.genre, GENRE_IDS, 'survival');
  const g = GENRES[genre];
  const world = pick(r.world, WORLD_IDS, 'storybook-village');
  const study = isStudyGenre(genre);
  const heroIds = [...HERO_IDS, ...heroes];
  const custom = r.custom ?? (r.map || r.chapterStories || r.npcs ? { plan: r.map, chapters: r.chapterStories, npcs: r.npcs } : null);
  const questions = normalizeQuestions(r.questions ?? (custom ? r.questions : null));
  let subject = pick(r.subject, SUBJECT_IDS, 'none');
  if (!study) subject = 'none';
  else if (subject === 'none') subject = 'mixed';
  if (subject === 'custom' && !questions.length) subject = 'mixed';
  const reward = r.reward ?? {};
  return {
    version: SPEC_VERSION,
    name: text(r.name, 40) || `${WORLDS[world].name} ${g.name.toLowerCase()}`,
    genre,
    world,
    layout: pick(r.layout, LAYOUT_IDS, g.layout),
    hero: pick(r.hero, heroIds, 'any'),
    foes: g.calm ? 'none' : pick(r.foes, FOE_IDS, WORLDS[world].foes ?? g.foes),
    chapters: int(r.chapters, 1, MAX_CHAPTERS, g.chapters),
    difficulty: pick(r.difficulty, DIFFICULTY_IDS, 'normal'),
    subject,
    age: int(r.age, 4, 16, 8),
    story: { intro: text(r.story?.intro ?? r.intro, 400), outro: text(r.story?.outro ?? r.outro, 400) },
    reward: {
      gold: int(reward.gold, 0, 500, 10),
      every: int(reward.every, 0, 50, 5),
      bonus: pick(reward.bonus, Object.keys(STUDY_BONUSES), 'book')
    },
    questions,
    helpers: [...new Set((Array.isArray(r.helpers) ? r.helpers : []).filter((h) => HELPER_IDS.includes(h)))].slice(0, 4),
    custom: custom
      ? {
          plan: custom.plan && typeof custom.plan === 'object' ? custom.plan : null,
          chapters: (Array.isArray(custom.chapters) ? custom.chapters : []).slice(0, MAX_CHAPTERS).map((c) => ({
            name: text(c?.name, 40),
            intro: text(c?.intro, 400),
            outro: text(c?.outro, 400)
          })),
          npcs: (Array.isArray(custom.npcs) ? custom.npcs : []).slice(0, 4).map((n) => ({
            name: text(n?.name, 32),
            greeting: text(n?.greeting, 300),
            lines: (Array.isArray(n?.lines) ? n.lines : []).map((l) => text(l, 200)).filter(Boolean).slice(0, 6)
          }))
        }
      : null
  };
}

/* ---------------------------------------------------------------------- */
/* The keyword builder: no AI, no tokens                                   */
/* ---------------------------------------------------------------------- */

/** The entry whose words appear earliest in the text (ties: registry order). */
function earliest(registry, lower, skip = []) {
  let best = null;
  let at = Infinity;
  for (const [id, entry] of Object.entries(registry)) {
    if (skip.includes(id) || !entry.words) continue;
    const m = entry.words.exec(lower);
    if (m && m.index < at) {
      at = m.index;
      best = id;
    }
  }
  return best;
}

/** The genre: checked in this order, because "a math game with a dragon" is a study game. */
const GENRE_ORDER = ['calm-study', 'study', 'boss-hunt', 'dungeon-crawl', 'quest', 'monster-hunt', 'survival'];
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/** A spec from plain words — used when no model is reachable, and free of charge always. */
export function keywordSpec(description = '') {
  const raw = String(description ?? '');
  const lower = raw.toLowerCase();
  const genre = GENRE_ORDER.find((id) => GENRES[id].words.test(lower)) ?? 'survival';
  const world = earliest(WORLDS, lower) ?? (isStudyGenre(genre) ? 'enchanted-forest' : 'storybook-village');
  const chapterMatch = lower.match(/\b(\d|one|two|three|four|five)\s+(levels?|chapters?|rooms?|floors?|stages?|parts?)\b/);
  const age = lower.match(/\b(\d{1,2})[\s-]*(years?|yrs?|yo)\b/);
  const subject = Object.entries(SUBJECT_WORDS).find(([, re]) => re.test(lower))?.[0];
  const words = raw.trim().split(/\s+/).filter(Boolean);
  return normalizeSpec({
    // A short title-like idea ("Dragon Dash") is the name; a sentence is not.
    name: words.length && words.length <= 4 && !/[,.!?]/.test(raw) ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : '',
    genre,
    world,
    layout: earliest(LAYOUTS, lower),
    hero: earliest(HEROES, lower) ?? 'any',
    foes: earliest(FOES, lower),
    chapters: chapterMatch ? NUMBER_WORDS[chapterMatch[1]] ?? +chapterMatch[1] : undefined,
    difficulty: /\b(easy|young|little|beginner|gentle)\b/.test(lower) ? 'easy' : /\b(hard|tough|challeng|expert|brutal)\b/.test(lower) ? 'hard' : 'normal',
    subject,
    age: age ? +age[1] : undefined
  });
}
