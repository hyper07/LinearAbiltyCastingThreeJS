/**
 * Kickrani's progress, kept in this browser: for each course the best time
 * and the best place it has been finished in (a medal for the top three),
 * and which levels are open — Medium after finishing any Easy course, Hard
 * after finishing any Medium one. Nothing is ever really shut: the course
 * step's "Try anyway" races a locked course all the same.
 *
 *   const p = loadProgress();                    // { courses: { id: { best, place, runs } } }
 *   saveProgress(recordRun(p, 'euljiro', { time: 152.3, place: 2 }));
 *   unlocked(p, 'hard', BIKE_COURSES)            // true once a Medium course is finished
 */
export const PROGRESS_KEY = 'gamory.jarani.progress';

/** What a level needs finished first (a course of this level). */
export const UNLOCK = { easy: null, medium: 'easy', hard: 'medium' };

const store = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** The progress kept here (or a fresh one). */
export function loadProgress(storage = store()) {
  try {
    const p = JSON.parse(storage?.getItem(PROGRESS_KEY) ?? 'null');
    if (p && typeof p === 'object' && p.courses && typeof p.courses === 'object') return p;
  } catch {
    /* a bad or missing record: start again */
  }
  return { courses: {} };
}

export function saveProgress(p, storage = store()) {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
  return p;
}

/** A race finished on a course: its time (s) and place (1 is first) — the best of each kept. Returns the progress. */
export function recordRun(p, id, { time, place }) {
  const c = (p.courses[id] ??= { best: null, place: null, runs: 0 });
  c.runs = (c.runs ?? 0) + 1;
  if (Number.isFinite(time) && time > 0 && (c.best == null || time < c.best)) c.best = Math.round(time * 100) / 100;
  if (Number.isFinite(place) && place >= 1 && (c.place == null || place < c.place)) c.place = place;
  return p;
}

/** The medal for a place: gold, silver, bronze, or none. */
export const medalOf = (place) => ({ 1: 'gold', 2: 'silver', 3: 'bronze' })[place] ?? null;

/** Is a level open: Easy always; the others once a course of the level before has been finished. */
export function unlocked(p, level, courses) {
  const need = UNLOCK[level];
  if (!need) return true;
  return courses.some((c) => (c.level ?? 'easy') === need && (p.courses[c.id]?.runs ?? 0) > 0);
}
