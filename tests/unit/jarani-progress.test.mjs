import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress, recordRun, unlocked, medalOf, PROGRESS_KEY } from '../../src/city/progress.js';
import { BIKE_COURSES, LEVELS, LEVEL_ORDER, coursesOf } from '../../src/city/course.js';

/** A stand-in for the browser's localStorage. */
function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('every course has a level, and each level its look, traffic, bots and badge', () => {
  for (const c of BIKE_COURSES) assert.ok(LEVEL_ORDER.includes(c.level), `${c.id}: ${c.level}`);
  for (const k of LEVEL_ORDER) {
    const L = LEVELS[k];
    assert.ok(L.name && L.ko && L.color && L.stars >= 1 && L.stars <= 3, k);
    assert.equal(L.bots.length, 3, `${k}: a skill for each bot`);
    assert.ok(coursesOf(k).length >= 3, `${k}: courses`);
  }
  // harder: busier, sharper bots, more oncoming cars
  assert.ok(LEVELS.easy.oncoming < LEVELS.medium.oncoming && LEVELS.medium.oncoming < LEVELS.hard.oncoming);
  // (and going your way up the course ahead, to weave past: some on every level, more the harder)
  assert.ok(LEVELS.easy.along > 0 && LEVELS.easy.along < LEVELS.medium.along && LEVELS.medium.along < LEVELS.hard.along);
  assert.ok(LEVELS.easy.bots[1] < LEVELS.hard.bots[1]);
  assert.ok(LEVELS.easy.traffic <= LEVELS.medium.traffic && LEVELS.medium.traffic <= LEVELS.hard.traffic);
});

test('progress per browser: the best time and place on each course, the medals, the levels opened', () => {
  const store = memory();
  let p = loadProgress(store);
  assert.deepEqual(p, { courses: {} });
  assert.equal(unlocked(p, 'easy', BIKE_COURSES), true);
  assert.equal(unlocked(p, 'medium', BIKE_COURSES), false, 'Medium shut till an Easy race is finished');
  assert.equal(unlocked(p, 'hard', BIKE_COURSES), false);
  const easy = coursesOf('easy')[0].id;
  recordRun(p, easy, { time: 150.256, place: 3 });
  recordRun(p, easy, { time: 162, place: 1 });
  assert.equal(p.courses[easy].best, 150.26, 'the best time kept');
  assert.equal(p.courses[easy].place, 1, 'the best place kept');
  assert.equal(p.courses[easy].runs, 2);
  assert.equal(unlocked(p, 'medium', BIKE_COURSES), true, 'an Easy finish opens Medium');
  assert.equal(unlocked(p, 'hard', BIKE_COURSES), false, 'not Hard yet');
  saveProgress(p, store);
  p = loadProgress(store);
  assert.equal(p.courses[easy].place, 1, 'kept in the browser');
  recordRun(p, coursesOf('medium')[0].id, { time: 170, place: 4 });
  assert.equal(unlocked(p, 'hard', BIKE_COURSES), true, 'a Medium finish opens Hard');
  assert.equal(medalOf(1), 'gold');
  assert.equal(medalOf(2), 'silver');
  assert.equal(medalOf(3), 'bronze');
  assert.equal(medalOf(4), null);
  // a broken record: start again, never throw
  store.setItem(PROGRESS_KEY, '{oops');
  assert.deepEqual(loadProgress(store), { courses: {} });
  assert.deepEqual(loadProgress(null), { courses: {} });
});
