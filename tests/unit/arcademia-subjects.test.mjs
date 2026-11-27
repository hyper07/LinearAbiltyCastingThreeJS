import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALE_IDS, loadLocale, setLocale } from '../../src/arcademia/i18n/index.js';
import {
  SLOTS, LAND_SUBJECTS, ROOMS, FLOWS, ARCADES, SUBJECT_INFO, ALL_SUBJECTS, REALM_SUBJECTS, LIVE,
  isLive, setLive, subjectsOf, subjectAt, slotOf, toSubject, activitiesOf, buildingKey, buildingName, helloKey
} from '../../src/arcademia/content/subjects.js';
import { ACTIVITIES, HANDS_ON, REALM_IDS, lessonProblems, activityProblems } from '../../src/arcademia/content/schema.js';
import { GENERATORS } from '../../src/arcademia/content/math.js';
import { LESSONS, FOREST_LESSONS, lessonsIn, lessonsOn, lessonById, setRealmLessons, guidesOn } from '../../src/arcademia/content/index.js';
import { buildReport, cleanEvent, openFloors, floorStars, neededOn } from '../../src/arcademia/rules.js';
import { RUNNERS } from '../../src/arcademia/lesson/activities.js';
import { teachersIn, teacherOf } from '../../src/arcademia/world/figures.js';
import { questFor } from '../../src/arcademia/quests.js';
import { bossQuestions } from '../../src/arcademia/lesson/boss.js';
import { buildScript, teacherOf as voiceOf, REALM_TEACHER_OF } from '../../src/arcademia/voice/script.js';

for (const id of LOCALE_IDS) await loadLocale(id);
/** Each language's own strings (every namespace but the lessons), to tell a written string from the English fallback. */
const DICTS = Object.fromEntries(await Promise.all(LOCALE_IDS.map(async (id) => {
  const d = (await import(`../../src/arcademia/i18n/locales/${id}/index.js`)).default;
  return [id, Object.assign({}, ...Object.entries(d).filter(([k]) => k !== 'lessons').map(([, v]) => v))];
})));
/** A string written in a language (its own, not the English fallback). */
const writtenIn = (lc, key) => typeof DICTS[lc][key] === 'string' && DICTS[lc][key].trim().length > 0;

/**
 * What a live world still needs before players see it: two lessons per floor in each of its
 * subjects, and its words in every language (the subject, the school, the teacher's greeting, the
 * quest intro). Content agents: this must be empty before a world goes live (subjects.js LIVE).
 */
function liveRealmProblems(realm) {
  const out = [];
  const lessons = lessonsIn(realm);
  for (let f = 1; f <= 7; f++) for (const s of subjectsOf(realm)) if (lessons.filter((l) => l.floor === f && l.subject === s).length < 2) out.push(`${realm}: floor ${f} ${s} has fewer than two lessons`);
  for (const slot of SLOTS) {
    const s = subjectAt(realm, slot);
    // The quest intro: <realm>.quest.<subject> (with {name} where its lessons chat with a guide).
    const keys = [`subject.${s}`, buildingKey(realm, slot), helloKey(realm, s), ...(realm === 'land' ? [] : [`${realm}.quest.${s}`])];
    for (const k of keys) for (const lc of LOCALE_IDS) if (!writtenIn(lc, k)) out.push(`${realm}: no ${lc} string ${k}`);
  }
  return out;
}

/* ---------------------------------------------------------------- a fake world on its own subjects */

const card = (title) => ({ title, text: `${title}: a reading card long enough to count as one.` });
const q = (n) => ({ q: `Question number ${n}?`, choices: ['Yes', 'No', 'Maybe'], answer: 0, hint: 'Think about it.', explain: 'It is yes.' });
const quiz = [q(1), q(2), q(3)];
const base = (id, subject, extra) => ({ id, subject, floor: 1, realm: 'forest', title: `Fake ${subject}`, topic: `fake-${subject}`, topicName: `Fake ${subject}`, blurb: 'A pretend lesson.', reading: [card('One'), card('Two')], quiz, ...extra });
const FAKE = [
  base('logic1-forest-fake-sort', 'logic', { board: { gen: 'count' }, practice: { kind: 'count', gen: 'count' } }),
  base('earth1-forest-fake-clouds', 'earth', {
    dialogue: { npc: { name: 'Wren, a cloud watcher', role: 'cloud watcher', look: 'ranger', portrayal: 'generic' }, intro: 'Hello!', topics: [{ ask: 'A?', answer: 'A.' }, { ask: 'B?', answer: 'B.' }, { ask: 'C?', answer: 'C.' }], challenge: q(9), farewell: 'Bye!' },
    timeline: { title: 'A day of weather', events: [{ label: 'Dawn', year: 1, when: 'first' }, { label: 'Noon', year: 2, when: 'then' }, { label: 'Rain', year: 3, when: 'later' }, { label: 'Night', year: 4, when: 'last' }] },
    artifact: { model: 'tree-ring', name: 'A tree ring', text: 'Rings show wet and dry years.' }
  }),
  base('biology1-forest-fake-float', 'biology', { sim: { id: 'float', setup: { items: ['apple', 'stone', 'cork', 'coin'] }, predict: q(7) } }),
  // A lesson may list its own activities (here only the experiment, as its subject's flow is anyway).
  base('biology1-forest-fake-seeds', 'biology', { activities: ['story', 'learn', 'experiment', 'challenge'], sim: { id: 'drop', predict: q(8) } })
];
/** The forest live on the fake lessons, for the length of `fn`. */
async function asLiveForest(fn) {
  const undoLive = setLive('forest', true);
  const undoLessons = setRealmLessons('forest', FAKE);
  try {
    return await fn();
  } finally {
    undoLessons();
    undoLive();
  }
}

/* ---------------------------------------------------------------- the registry */

test('subjects: every subject is complete — icon, colour, room, a flow that runs, a lesson code, a home world', () => {
  assert.deepEqual(SLOTS, ['math', 'history', 'physics']);
  assert.deepEqual(LAND_SUBJECTS, ['math', 'history', 'physics']);
  assert.equal(ALL_SUBJECTS.length, 21);
  const codes = new Set();
  for (const id of ALL_SUBJECTS) {
    const s = SUBJECT_INFO[id];
    assert.equal(s.id, id);
    assert.ok(s.icon && /^#[0-9a-f]{6}$/i.test(s.color), `${id}: icon and colour`);
    assert.ok(ROOMS.includes(s.room), `${id}: room`);
    assert.ok(ARCADES.includes(s.arcade), `${id}: arcade`);
    assert.ok(/^[a-z]+$/.test(s.code) && !codes.has(s.code), `${id}: a code of its own`);
    codes.add(s.code);
    assert.ok(REALM_SUBJECTS[s.home]?.includes(id), `${id}: taught in its home world`);
    assert.deepEqual(activityProblems({ id: `${s.code}1-x`, subject: id }), [], `${id}: its flow runs in its room`);
    for (const k of s.flow) assert.ok(RUNNERS[k], `${id}: ${k} has a runner`);
  }
  // Every subject is taught in exactly one world, every world but the mountain weaves math in (slot 1).
  assert.deepEqual(Object.values(REALM_SUBJECTS).flat().sort(), [...ALL_SUBJECTS].sort());
  for (const [realm, trio] of Object.entries(REALM_SUBJECTS)) assert.ok(SUBJECT_INFO[trio[0]].woven, `${realm}: slot 1 is the woven-in math`);
  // The activity kinds: each has its steps' names, a runner, and the flows use only known kinds.
  for (const [k, a] of Object.entries(ACTIVITIES)) {
    assert.ok(RUNNERS[k], `${k}: a runner`);
    for (const step of a.steps) for (const lc of LOCALE_IDS) assert.ok(writtenIn(lc, `quest.step.${step}`), `${lc} quest.step.${step}`);
  }
  for (const flow of Object.values(FLOWS)) assert.ok(flow.every((k) => ACTIVITIES[k]));
  assert.deepEqual(HANDS_ON, ['board', 'try', 'chat', 'timeline', 'treasure', 'experiment', 'sort', 'maphunt', 'dig', 'countdown', 'rover', 'rhythm']);
  // Every planned signature game is built: an activity kind with a runner.
  for (const s of Object.values(SUBJECT_INFO)) if (s.signature) assert.ok(ACTIVITIES[s.signature] && RUNNERS[s.signature], `${s.id}: its signature game ${s.signature}`);
});

test('subjects: every world has three subjects, named — with its schools — in all five languages', () => {
  assert.deepEqual(Object.keys(REALM_SUBJECTS), REALM_IDS);
  for (const [realm, trio] of Object.entries(REALM_SUBJECTS)) {
    assert.equal(new Set(trio).size, 3, realm);
    for (const id of trio) for (const lc of LOCALE_IDS) assert.ok(writtenIn(lc, `subject.${id}`), `${lc} subject.${id}`);
    const undo = setLive(realm, true);
    try {
      for (const slot of SLOTS) for (const lc of LOCALE_IDS) assert.ok(writtenIn(lc, buildingKey(realm, slot)), `${lc} ${buildingKey(realm, slot)}`);
    } finally {
      undo();
    }
  }
  setLocale('en');
  assert.equal(SUBJECT_INFO.geometry.home, 'desert');
  const undo = setLive('desert', true);
  try {
    assert.equal(buildingName('desert', 'math'), 'Geometry School', "the Desert's Pyramid School teaches geometry");
  } finally {
    undo();
  }
});

/* ---------------------------------------------------------------- the worlds not switched over */

test('subjects: worlds not live yet play exactly as before — the mountain\'s three subjects, schools, teachers, bosses', () => {
  for (const realm of REALM_IDS) {
    assert.equal(isLive(realm), LIVE[realm], realm);
    if (isLive(realm)) continue;
    assert.deepEqual(subjectsOf(realm), LAND_SUBJECTS, realm);
    for (const slot of SLOTS) {
      assert.equal(subjectAt(realm, slot), slot);
      assert.equal(slotOf(realm, slot), slot);
      assert.equal(buildingKey(realm, slot), realm === 'land' ? `building.${slot}` : `${realm}.building.${slot}`);
      assert.equal(teacherOf(realm, slot), teachersIn(realm)[slot]);
    }
    // Every lesson is still taught (none filtered away), and its quest is told by the slot's teacher.
    const all = LESSONS.filter((l) => (l.realm ?? 'land') === realm);
    assert.equal(lessonsIn(realm).length, all.length, realm);
    for (const l of all) {
      assert.equal(questFor(l).teacher, teachersIn(realm)[l.subject], l.id);
      assert.equal(voiceOf(l), REALM_TEACHER_OF[realm][l.subject], l.id);
    }
    const boss = bossQuestions(1, 42, realm);
    assert.equal(boss.length, 6);
    for (const s of LAND_SUBJECTS) assert.equal(boss.filter((x) => x.subject === s).length, 2, `${realm} boss: two ${s}`);
  }
  // The mountain's report shows its three subjects only, as it always did.
  const r = buildReport({ events: [{ kind: 'time', subject: 'math', seconds: 60, at: Date.parse('2026-11-18T10:00:00Z') }], now: Date.parse('2026-11-18T12:00:00Z') });
  assert.deepEqual(r.subjects, LAND_SUBJECTS);
  assert.deepEqual(Object.keys(r.days[0]), ['day', ...LAND_SUBJECTS]);
  assert.deepEqual(r.accuracy.map((a) => a.subject), LAND_SUBJECTS);
  // A slot key still finds its school (the e2e suites enter('history', 1)).
  assert.equal(toSubject('desert', 'history'), 'history');
  assert.equal(toSubject('desert', 'geometry'), null);
});

test('subjects: every live world is ready — two lessons a floor in each subject, its words in every language', () => {
  for (const realm of REALM_IDS.filter((r) => isLive(r))) assert.deepEqual(liveRealmProblems(realm), [], realm);
});

/* ---------------------------------------------------------------- a world switched over */

test('subjects: a world on its own subjects validates its lessons and teaches them in its schools', async () => {
  // Before: the fake lessons are well-formed but not taught in the forest (its trio is the mountain's).
  assert.deepEqual(FAKE.flatMap((l) => lessonProblems(l, { gens: GENERATORS })), [], 'new-subject lessons validate');
  await asLiveForest(() => {
    assert.ok(isLive('forest'));
    assert.deepEqual(subjectsOf('forest'), ['logic', 'earth', 'biology']);
    assert.deepEqual(FAKE.flatMap((l) => lessonProblems(l, { gens: GENERATORS })), []);
    // Schools: the same buildings (slots), the world's subjects in them.
    assert.equal(subjectAt('forest', 'math'), 'logic');
    assert.equal(slotOf('forest', 'biology'), 'physics');
    assert.equal(toSubject('forest', 'history'), 'earth', 'a slot key finds the subject taught there');
    setLocale('en');
    assert.equal(buildingName('forest', 'math'), 'Pattern Pod School');
    assert.equal(buildingName('forest', 'physics'), 'Nature Lab');
    // Only its own subjects are taught; the mountain-subject lessons left in it are not.
    assert.deepEqual(lessonsIn('forest').map((l) => l.id), FAKE.map((l) => l.id));
    assert.equal(lessonsOn(1, 'biology', 'forest').length, 2);
    assert.equal(lessonById('earth1-forest-fake-clouds'), FAKE[1]);
    // Teachers: each keeps their slot and takes its subject.
    const T = teachersIn('forest');
    assert.equal(teacherOf('forest', 'logic'), T.math);
    assert.equal(teacherOf('forest', 'earth'), T.history);
    assert.equal(teacherOf('forest', 'biology'), T.physics);
    const [logic, earth, bio, bio2] = FAKE.map(questFor);
    assert.equal(logic.teacher, T.math);
    assert.deepEqual(logic.steps, ['Story', 'Learn', 'Watch the board', 'Try it', 'Challenge']);
    assert.equal(earth.introLine, 't.forest.quest.earth~earth1-forest-fake-clouds', 'a guided quest names its guide');
    assert.deepEqual(earth.steps, ['Story', 'Learn', 'Chat', 'Timeline', 'Treasure', 'Challenge']);
    assert.equal(bio.introLine, 't.forest.quest.biology');
    assert.deepEqual(bio2.steps, ['Story', 'Learn', 'Guess', 'Experiment', 'Challenge']);
    assert.equal(voiceOf(FAKE[0]), 'nutmeg');
    assert.equal(voiceOf(FAKE[2]), 'ribbit');
    assert.deepEqual(guidesOn(1, 'forest'), [FAKE[1]], 'Who Said It? uses the world\'s guides');
    // Bosses: two riddles from each of the world's subjects.
    const boss = bossQuestions(1, 7, 'forest');
    assert.equal(boss.length, 6);
    for (const s of ['logic', 'earth', 'biology']) assert.equal(boss.filter((x) => x.subject === s).length, 2, `boss: two ${s}`);
    // Floors open by its own lessons.
    assert.equal(neededOn(1, lessonsIn('forest')), 3);
    const stars = Object.fromEntries(FAKE.slice(0, 3).map((l) => [l.id, 2]));
    assert.equal(floorStars(stars, 1, lessonsIn('forest')).done, 3);
    assert.ok(openFloors(stars, { lessons: lessonsIn('forest') }).has(2));
    // The voice script: the slot's teacher greets with the new subject's line, once it is written.
    assert.ok(!buildScript('en').some((l) => l.id === 't.forest.hello.logic'), 'no line for a string not written yet');
    // What still has to be written before it may ship.
    const todo = liveRealmProblems('forest');
    assert.ok(todo.some((p) => p.includes('floor 2 logic')));
    assert.ok(todo.some((p) => p.includes('forest.hello.logic')));
    assert.ok(!todo.some((p) => p.includes('subject.logic') || p.includes('forest.building.logic')), 'names and schools are written');
  });
  assert.ok(!isLive('forest'), 'and back');
  assert.equal(lessonsIn('forest'), FOREST_LESSONS);
  assert.equal(lessonById('logic1-forest-fake-sort'), null);
});

test('subjects: lessons must fit their world, their id and their room', async () => {
  const gens = GENERATORS;
  const probs = (l) => lessonProblems(l, { gens });
  assert.ok(probs({ ...FAKE[2], realm: 'sea' }).some((p) => p.includes('not taught in the sea')), 'biology is the forest\'s');
  assert.ok(probs({ ...FAKE[2], id: 'p1-forest-fake-float' }).some((p) => p.includes('does not match the id')));
  assert.ok(probs({ ...FAKE[2], subject: 'alchemy' }).some((p) => p.includes('subject is one of')));
  assert.ok(probs({ ...FAKE[2], activities: ['story', 'learn', 'chat', 'challenge'] }).some((p) => p.includes('chat needs a hall')), 'a chat needs a guide in the hall');
  assert.ok(probs({ ...FAKE[2], activities: ['story', 'learn', 'challenge'] }).some((p) => p.includes('one to four hands-on')));
  assert.ok(probs({ ...FAKE[2], activities: ['story', 'learn', 'dance', 'challenge'] }).some((p) => p.includes('unknown activity dance')));
  assert.ok(probs({ ...FAKE[2], sim: undefined }).some((p) => p.includes('sim id')), 'the experiment needs its sim');
  // A lab lesson may add the woven-in math: a board and practice, checked like math's.
  assert.deepEqual(probs({ ...FAKE[2], activities: ['story', 'learn', 'board', 'experiment', 'challenge'], board: { gen: 'count' } }), []);
  assert.ok(probs({ ...FAKE[2], activities: ['story', 'learn', 'board', 'experiment', 'challenge'] }).some((p) => p.includes('chalkboard needs a generator')));
});

test('subjects: the report groups a world\'s subjects after the mountain\'s, and the record takes any subject', () => {
  const now = Date.parse('2026-11-18T15:00:00Z');
  const at = (d) => Date.parse(`2026-11-${d}T10:00:00Z`);
  const events = [
    { kind: 'time', subject: 'math', seconds: 600, at: at(16) },
    { kind: 'time', subject: 'geometry', seconds: 300, at: at(17) },
    { kind: 'answer', lesson: 'geometry1-desert-x', subject: 'geometry', topic: 'shapes', correct: true, at: at(17) },
    { kind: 'answer', lesson: 'geometry1-desert-x', subject: 'geometry', topic: 'shapes', correct: false, at: at(17) }
  ];
  const r = buildReport({ events, now });
  assert.deepEqual(r.subjects, ['math', 'history', 'physics', 'geometry', 'archaeology', 'chemistry']);
  assert.equal(r.days[1].geometry, 5);
  assert.equal(r.minutes, 15);
  assert.equal(r.accuracy.find((a) => a.subject === 'geometry').this, 50);
  assert.equal(r.accuracy.find((a) => a.subject === 'geometry').name, 'Geometry & Building');
  assert.equal(r.practice[0].subjectName, 'Geometry & Building');
  assert.deepEqual(cleanEvent({ kind: 'time', subject: 'music', seconds: 30 }, now), { kind: 'time', subject: 'music', seconds: 30, at: now });
  assert.equal(cleanEvent({ kind: 'time', subject: 'alchemy', seconds: 30 }, now), null);
});
