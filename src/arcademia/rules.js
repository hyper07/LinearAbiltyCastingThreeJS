/**
 * AI Arcademia's rules, shared by the browser and the server
 * (server/learningStore.js): stars, which floors are open, the caps on what
 * a save may claim, and the parents' weekly report built from events.
 *
 * An event is { kind, at, lesson?, subject?, topic?, correct?, stars?, score?, total?, seconds? }:
 *   reading  the reading cards of a lesson were read to the end
 *   answer   one answer in a check (correct true/false)
 *   lesson   a lesson finished: score of total, the stars it earned
 *   time     seconds of study in a subject
 */
import { FLOORS } from './floors.js';
import { LESSONS, lessonById, TOPIC_NAMES } from './content/index.js';
import { SUBJECTS, SUBJECT_NAMES } from './content/schema.js';

export const MAX_STARS = 3;
/** Share of a floor's lessons (with at least one star) that opens the floor above. */
export const UNLOCK_SHARE = 2 / 3;
/** One heartbeat adds at most this much study time, and never more than the time really gone by. */
export const BEAT_MAX_SECONDS = 90;
/** Study time counted in one day, at most. */
export const DAY_MAX_SECONDS = 6 * 3600;
/** The same lesson finished twice within this many seconds counts once. */
export const LESSON_MIN_GAP_SECONDS = 20;
/** Answers recorded in one day, at most. */
export const DAY_MAX_ANSWERS = 1500;
/** What a guest's saved progress may bring in on sign-in. */
export const IMPORT_MAX_EVENTS = 3000;
export const IMPORT_MAX_DAY_SECONDS = 3 * 3600;
export const IMPORT_MAX_AGE_DAYS = 60;

/** Stars for a check: all right 3, at least 60 % right 2, finished 1. */
export function starsFor(score, total) {
  const s = Math.max(0, Math.min(Number(score) || 0, Number(total) || 0));
  if (!total) return 0;
  if (s === total) return 3;
  if (s / total >= 0.6) return 2;
  return 1;
}

/** Lessons needed on a floor to open the one above it. */
export function neededOn(floor, lessons = LESSONS) {
  const count = lessons.filter((l) => l.floor === floor).length;
  return Math.ceil(count * UNLOCK_SHARE);
}

/**
 * Which floors are open: floor 1 always; each next one when enough lessons
 * on the floor below have a star. `stars` is { lessonId: stars }.
 * @returns {Set<number>}
 */
export function openFloors(stars, { floors = FLOORS, lessons = LESSONS } = {}) {
  const open = new Set([floors[0].n]);
  for (let i = 1; i < floors.length; i++) {
    const below = floors[i - 1].n;
    if (!open.has(below)) break;
    const done = lessons.filter((l) => l.floor === below && (stars[l.id] ?? 0) > 0).length;
    if (done >= neededOn(below, lessons)) open.add(floors[i].n);
  }
  return open;
}

/** Stars on a floor, and how many there are to get. */
export function floorStars(stars, floor, lessons = LESSONS) {
  const here = lessons.filter((l) => l.floor === floor);
  return { have: here.reduce((s, l) => s + Math.min(MAX_STARS, stars[l.id] ?? 0), 0), of: here.length * MAX_STARS, done: here.filter((l) => (stars[l.id] ?? 0) > 0).length, lessons: here.length };
}

export const totalStars = (stars) => Object.entries(stars).reduce((s, [id, v]) => s + (lessonById(id) ? Math.min(MAX_STARS, Math.max(0, v | 0)) : 0), 0);

/* ---------------------------------------------------------------- days */

/** The local day ('2026-11-18') of a time, for a UTC offset in minutes (as Date#getTimezoneOffset gives it). */
export function dayOf(at, tzOffset = 0) {
  return new Date(at - clampTz(tzOffset) * 60000).toISOString().slice(0, 10);
}
export const clampTz = (tz) => Math.max(-840, Math.min(840, Math.round(Number(tz) || 0)));
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
/** Monday of the week a day is in. */
export function weekStart(day) {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((d + 6) % 7));
}

/**
 * The parents' weekly report from events and lesson stars.
 *
 * @param {{ events: object[], stars: object, now: number, tzOffset?: number, weekOffset?: number }} input
 */
export function buildReport({ events, stars = {}, now, tzOffset = 0 }) {
  const today = dayOf(now, tzOffset);
  const start = weekStart(today);
  const lastStart = addDays(start, -7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const blank = () => Object.fromEntries(SUBJECTS.map((s) => [s, 0]));
  const minutes = Object.fromEntries(days.map((d) => [d, blank()]));
  const acc = { this: Object.fromEntries(SUBJECTS.map((s) => [s, { right: 0, wrong: 0 }])), last: Object.fromEntries(SUBJECTS.map((s) => [s, { right: 0, wrong: 0 }])) };
  const lessonsDone = { this: new Set(), last: new Set() };
  const readings = { this: 0 };
  const missed = new Map();
  const active = new Set();
  const recent = [];
  for (const e of events) {
    const day = dayOf(e.at, tzOffset);
    const week = day >= start && day <= days[6] ? 'this' : day >= lastStart && day < start ? 'last' : null;
    if (e.kind === 'time' && minutes[day] && SUBJECTS.includes(e.subject)) minutes[day][e.subject] += (Number(e.seconds) || 0) / 60;
    if (e.kind === 'time' && (Number(e.seconds) || 0) >= 30) active.add(day);
    if (e.kind !== 'time') active.add(day);
    if (e.kind === 'answer' && week && SUBJECTS.includes(e.subject)) {
      acc[week][e.subject][e.correct ? 'right' : 'wrong']++;
      if (week === 'this' || week === 'last') {
        const m = missed.get(e.topic) ?? { topic: e.topic, subject: e.subject, right: 0, wrong: 0 };
        m[e.correct ? 'right' : 'wrong']++;
        missed.set(e.topic, m);
      }
    }
    if (e.kind === 'lesson' && week) lessonsDone[week].add(e.lesson);
    if (e.kind === 'reading' && week === 'this') readings.this++;
    if (e.kind === 'lesson' || e.kind === 'reading') recent.push(e);
  }
  // Streak: days in a row with study, up to today (or yesterday, if today has none yet).
  let streak = 0;
  let d = active.has(today) ? today : addDays(today, -1);
  while (active.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  const pct = (a) => (a.right + a.wrong ? Math.round((100 * a.right) / (a.right + a.wrong)) : null);
  const open = openFloors(stars);
  return {
    today,
    weekOf: start,
    days: days.map((day) => ({ day, ...Object.fromEntries(SUBJECTS.map((s) => [s, Math.round(minutes[day][s] * 10) / 10])) })),
    minutes: Math.round(days.reduce((sum, day) => sum + SUBJECTS.reduce((s, k) => s + minutes[day][k], 0), 0)),
    lessonsThisWeek: lessonsDone.this.size,
    lessonsLastWeek: lessonsDone.last.size,
    readingsThisWeek: readings.this,
    accuracy: SUBJECTS.map((s) => ({ subject: s, name: SUBJECT_NAMES[s], this: pct(acc.this[s]), last: pct(acc.last[s]), answers: acc.this[s].right + acc.this[s].wrong })),
    stars: totalStars(stars),
    starsOf: LESSONS.length * MAX_STARS,
    lessonsDone: Object.values(stars).filter((v) => v > 0).length,
    lessonsOf: LESSONS.length,
    floorReached: Math.max(...open),
    floorsOf: FLOORS.length,
    streak,
    practice: [...missed.values()]
      .filter((m) => m.wrong > 0)
      .sort((a, b) => b.wrong / (b.right + b.wrong) - a.wrong / (a.right + a.wrong) || b.wrong - a.wrong)
      .slice(0, 5)
      .map((m) => ({ ...m, name: TOPIC_NAMES[m.topic] ?? m.topic, subjectName: SUBJECT_NAMES[m.subject] ?? m.subject })),
    recent: recent
      .sort((a, b) => b.at - a.at)
      .slice(0, 12)
      .map((e) => ({ at: e.at, kind: e.kind, lesson: e.lesson, title: lessonById(e.lesson)?.title ?? e.lesson, subject: e.subject, stars: e.stars ?? null, score: e.score ?? null, total: e.total ?? null }))
  };
}

/**
 * Clean one event a client sends: known lesson, known subject, sane numbers.
 * Returns null for anything that doesn't hold up. Time is capped separately
 * (it needs the clock of the last heartbeat).
 */
export function cleanEvent(raw, now) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = String(raw.kind);
  if (kind === 'time') {
    const subject = SUBJECTS.includes(raw.subject) ? raw.subject : null;
    const seconds = Math.max(0, Math.min(BEAT_MAX_SECONDS, Math.round(Number(raw.seconds) || 0)));
    return subject && seconds ? { kind, subject, seconds, at: now } : null;
  }
  const lesson = lessonById(String(raw.lesson ?? ''));
  if (!lesson) return null;
  const base = { kind, lesson: lesson.id, subject: lesson.subject, topic: lesson.topic, at: now };
  if (kind === 'reading') return base;
  if (kind === 'answer') return { ...base, correct: raw.correct === true };
  if (kind === 'lesson') {
    const total = Array.isArray(lesson.quiz) ? lesson.quiz.length : lesson.quiz.count;
    const score = Math.max(0, Math.min(total, Math.round(Number(raw.score) || 0)));
    return { ...base, score, total, stars: starsFor(score, total) };
  }
  return null;
}
