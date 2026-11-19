/**
 * Every lesson in AI Arcademia, by floor and subject. Plain data (math.js,
 * history.js, physics.js); the server imports this too, to check that a
 * lesson someone reports finishing exists and how many questions it has.
 */
import { MATH_LESSONS, GENERATORS, makeQuiz } from './math.js';
import { HISTORY_LESSONS } from './history.js';
import { PHYSICS_LESSONS } from './physics.js';
import { SUBJECTS } from './schema.js';
import { locale, localizeLesson } from '../i18n/index.js';

export const LESSONS = [...MATH_LESSONS, ...HISTORY_LESSONS, ...PHYSICS_LESSONS];
const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export const lessonById = (id) => BY_ID.get(id) ?? null;
export const lessonsOn = (floor, subject = null) => LESSONS.filter((l) => l.floor === floor && (!subject || l.subject === subject));
/** How many questions a lesson's check asks. */
export const quizLength = (lesson) => (Array.isArray(lesson.quiz) ? lesson.quiz.length : lesson.quiz?.count ?? 0);

/** The quiz questions for one run of a lesson, in a language: fixed ones, or fresh ones from a seed. */
export function quizFor(lesson, seed = 1, lc = locale()) {
  if (Array.isArray(lesson.quiz)) return localizeLesson(lesson, lc).quiz.map((q) => ({ ...q, topic: lesson.topic }));
  return makeQuiz(lesson.quiz.gen, seed, lesson.quiz.count, lc).map((q) => ({ ...q, topic: lesson.topic }));
}

/** Topic key → how it reads to a parent. */
export const TOPIC_NAMES = Object.fromEntries(LESSONS.map((l) => [l.topic, l.topicName]));
export { GENERATORS, SUBJECTS };
