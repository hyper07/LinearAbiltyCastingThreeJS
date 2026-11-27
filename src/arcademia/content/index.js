/**
 * Every lesson in AI Arcademia, by floor and subject. Plain data (math.js,
 * history.js, physics.js); the server imports this too, to check that a
 * lesson someone reports finishing exists and how many questions it has.
 */
import { MATH_LESSONS, GENERATORS, makeQuiz } from './math.js';
import { HISTORY_LESSONS } from './history.js';
import { PHYSICS_LESSONS } from './physics.js';
import { SEA_LESSONS } from './sea.js';
import { FOREST_LESSONS } from './forest.js';
import { DESERT_LESSONS } from './desert.js';
import { MOON_LESSONS } from './moon.js';
import { MARS_LESSONS } from './mars.js';
import { CASTLE_LESSONS } from './castle.js';
import { SUBJECTS } from './schema.js';
import { subjectsOf, liveStamp, activitiesOf } from './subjects.js';
import { locale, localizeLesson } from '../i18n/index.js';

/** The land's lessons (the mountain and the Great Tree share them). */
export const LAND_LESSONS = [...MATH_LESSONS, ...HISTORY_LESSONS, ...PHYSICS_LESSONS];
/** Every lesson in every realm: what the server checks, the report and the voice script read. */
export const LESSONS = [...LAND_LESSONS, ...FOREST_LESSONS, ...SEA_LESSONS, ...DESERT_LESSONS, ...MOON_LESSONS, ...MARS_LESSONS, ...CASTLE_LESSONS];
/** Each realm's lessons: the land (the mountain), the forest (the Great Tree), the sea (the Lagoon), the desert (the Desert of the Pyramids), the moon (the Moon), mars (Mars), the castle (the Sky Castle). */
const BY_REALM = { land: LAND_LESSONS, forest: FOREST_LESSONS, sea: SEA_LESSONS, desert: DESERT_LESSONS, moon: MOON_LESSONS, mars: MARS_LESSONS, castle: CASTLE_LESSONS };
export const REALMS = Object.keys(BY_REALM);
const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
/** Each realm's lessons in the subjects it teaches now (content/subjects.js subjectsOf), cached until a realm goes live. */
const taught = new Map();
let taughtAt = -1;

/**
 * Put other lessons in a realm (tests, and previewing a world's new lessons before they ship):
 * they are found by id too. Returns a function that puts the realm's own lessons back.
 */
export function setRealmLessons(realm, lessons) {
  const was = BY_REALM[realm];
  BY_REALM[realm] = lessons;
  for (const l of lessons) BY_ID.set(l.id, l);
  taughtAt = -1;
  return () => {
    BY_REALM[realm] = was;
    for (const l of lessons) if (!LESSONS.includes(l)) BY_ID.delete(l.id);
    taughtAt = -1;
  };
}

/**
 * Make a lesson no world teaches findable by its id (a preview, the dev demos, the e2e checks), so
 * its stars and answers can be recorded; it still opens no floor and counts in no world.
 */
export function previewLesson(lesson) {
  if (lesson?.id && !BY_ID.has(lesson.id)) BY_ID.set(lesson.id, lesson);
  return lessonById(lesson?.id);
}

/** A lesson's realm: 'land' (the default), 'forest', 'sea', 'desert', 'moon', 'mars' or 'castle'. */
export const realmOf = (lesson) => lesson?.realm ?? 'land';
/** A realm's lessons: its floors open and its stars count by these alone. */
export function lessonsIn(realm = 'land') {
  if (taughtAt !== liveStamp()) {
    taught.clear();
    taughtAt = liveStamp();
  }
  const key = BY_REALM[realm] ? realm : 'land';
  let list = taught.get(key);
  if (!list) {
    const subjects = subjectsOf(key);
    // A world whose new lessons are written but not live yet keeps teaching only its current ones.
    list = BY_REALM[key].filter((l) => subjects.includes(l.subject));
    if (list.length === BY_REALM[key].length) list = BY_REALM[key];
    taught.set(key, list);
  }
  return list;
}
/** Whose lessons, teachers and stories a world teaches with: its own realm once it has lessons, else the land's (a world still being written). */
export const teachingRealm = (realm = 'land') => (BY_REALM[realm] ? realm : 'land');
export const lessonById = (id) => BY_ID.get(id) ?? null;
export const lessonsOn = (floor, subject = null, realm = 'land') => lessonsIn(realm).filter((l) => l.floor === floor && (!subject || l.subject === subject));
/** A floor's lessons with a guide to chat with (Who Said It?): the realm's, else the mountain's on that floor. */
export function guidesOn(floor, realm = 'land') {
  const guided = (r) => lessonsOn(floor, null, r).filter((l) => activitiesOf(l).includes('chat'));
  const mine = guided(realm);
  return mine.length ? mine : guided('land');
}
/** How many questions a lesson's check asks. */
export const quizLength = (lesson) => (Array.isArray(lesson.quiz) ? lesson.quiz.length : lesson.quiz?.count ?? 0);

/** The quiz questions for one run of a lesson, in a language: fixed ones, or fresh ones from a seed. */
export function quizFor(lesson, seed = 1, lc = locale()) {
  // Written questions carry their voice line's stem (l.<lesson>.quiz.<i>; voice/script.js); generated ones have none.
  if (Array.isArray(lesson.quiz)) return localizeLesson(lesson, lc).quiz.map((q, i) => ({ ...q, topic: lesson.topic, line: `l.${lesson.id}.quiz.${i}` }));
  return makeQuiz(lesson.quiz.gen, seed, lesson.quiz.count, lc).map((q) => ({ ...q, topic: lesson.topic }));
}

/** Topic key → how it reads to a parent. */
export const TOPIC_NAMES = Object.fromEntries(LESSONS.map((l) => [l.topic, l.topicName]));
export { GENERATORS, SUBJECTS, SEA_LESSONS, FOREST_LESSONS, DESERT_LESSONS, MOON_LESSONS, MARS_LESSONS, CASTLE_LESSONS };
