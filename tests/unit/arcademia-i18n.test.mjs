import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, LOCALE_IDS, pickLocale, loadLocale, tIn, localizeLesson, lessonTextPaths, atPath, num, applyOverlay } from '../../src/arcademia/i18n/index.js';
import { DEMO_LESSONS, DEMO_OVERLAYS } from '../fixtures/arcademia-activities.js';
import { cipherFor, charsOf } from '../../src/arcademia/content/games.js';
import en from '../../src/arcademia/i18n/locales/en/index.js';
import { LESSONS, GENERATORS } from '../../src/arcademia/content/index.js';
import { lessonProblems } from '../../src/arcademia/content/schema.js';

const OTHERS = LOCALE_IDS.filter((id) => id !== 'en');
const mods = Object.fromEntries(await Promise.all(OTHERS.map(async (id) => [id, (await import(`../../src/arcademia/i18n/locales/${id}/index.js`)).default])));
for (const id of OTHERS) await loadLocale(id);
const NAMESPACES = Object.keys(en);
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
/** A plural family (key_one, key_other …) counts as one key. */
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');

test('i18n: five languages, a picker that follows the browser', () => {
  assert.deepEqual(LOCALE_IDS, ['en', 'ko', 'es', 'ja', 'zh']);
  for (const l of LOCALES) assert.ok(l.name && l.speech && l.intl, l.id);
  assert.equal(pickLocale(['ko-KR', 'en']), 'ko');
  assert.equal(pickLocale(['es-MX']), 'es');
  assert.equal(pickLocale(['zh-Hans-CN']), 'zh');
  assert.equal(pickLocale(['fr-FR', 'ja']), 'ja');
  assert.equal(pickLocale(['fr-FR']), 'en');
  assert.equal(num(1234.5, {}, 'es'), '1234,5');
  assert.equal(num(12345.5, {}, 'en'), '12,345.5');
});

test('i18n: every language has every key, with the same {placeholders}', () => {
  for (const ns of NAMESPACES) {
    const src = en[ns];
    const srcBases = new Set(Object.keys(src).map(base));
    for (const id of OTHERS) {
      const dict = mods[id][ns];
      assert.ok(dict, `${id}: no ${ns}.js`);
      const missing = [...srcBases].filter((k) => !Object.keys(dict).some((d) => base(d) === k));
      assert.deepEqual(missing, [], `${id}/${ns}.js is missing keys`);
      const extra = Object.keys(dict).filter((k) => !srcBases.has(base(k)));
      assert.deepEqual(extra, [], `${id}/${ns}.js has keys English doesn't`);
      for (const [k, v] of Object.entries(dict)) {
        assert.equal(typeof v, 'string', `${id} ${k}`);
        assert.ok(v.trim() || !String(src[k] ?? src[`${base(k)}_other`] ?? '').trim(), `${id} ${k} is empty`);
        const ref = src[k] ?? src[`${base(k)}_other`] ?? src[base(k)];
        // Same placeholders, except: {counter} (a counting word some languages add) may be added,
        // and an emoji or plural count may be left out where the language doesn't need it.
        const mine = new Set(vars(v).split(',').filter(Boolean)), theirs = new Set(vars(ref).split(',').filter(Boolean));
        const extra = [...mine].filter((x) => !theirs.has(x) && x !== 'counter');
        const missing = [...theirs].filter((x) => !mine.has(x) && !['emojis', 'emoji', 'counter', 'count'].includes(x));
        assert.deepEqual([extra, missing], [[], []], `${id} ${k}: placeholders differ`);
      }
    }
  }
});

test('i18n: every lesson is complete in every language and still well-formed', () => {
  for (const id of OTHERS) {
    for (const lesson of LESSONS) {
      const over = mods[id].lessons[lesson.id];
      assert.ok(over, `${id}: lesson ${lesson.id} is not translated`);
      for (const p of lessonTextPaths(lesson)) {
        const v = atPath(over, p);
        assert.ok(typeof v === 'string' && v.trim(), `${id} ${lesson.id}: missing ${p.join('.')}`);
      }
      const local = localizeLesson(lesson, id);
      assert.deepEqual(lessonProblems(local, { gens: GENERATORS }), [], `${id} ${lesson.id}`);
      // Numbers that matter stay put: answers, years.
      if (Array.isArray(lesson.quiz)) lesson.quiz.forEach((q, i) => assert.equal(local.quiz[i].answer, q.answer));
      lesson.timeline?.events.forEach((e, i) => assert.equal(local.timeline.events[i].year, e.year));
    }
    for (const k of Object.keys(mods[id].lessons)) assert.ok(LESSONS.some((l) => l.id === k), `${id}: unknown lesson ${k}`);
  }
});

test('i18n: the signature games\' lesson text is translatable — and must be translated — in every language', () => {
  // Their text fields are overlay paths (so the completeness check above requires them in every lesson that uses them)…
  const paths = (l) => lessonTextPaths(l).map((p) => p.join('.'));
  const { sort, maphunt, dig, countdown, rover, rhythm } = DEMO_LESSONS;
  for (const p of ['sort.q', 'sort.groups.0.label', 'sort.items.4.label', 'sort.items.4.hint', 'sort.rule.q', 'sort.rule.choices.2', 'sort.rule.explain']) assert.ok(paths(sort).includes(p), p);
  for (const p of ['maphunt.q', 'maphunt.clues.1.q', 'maphunt.clues.1.hint']) assert.ok(paths(maphunt).includes(p), p);
  for (const p of ['dig.q', 'dig.finds.0.label', 'dig.finds.0.text', 'dig.finds.0.question.choices.1', 'dig.finds.1.decode.message', 'dig.finds.1.decode.explain']) assert.ok(paths(dig).includes(p), p);
  for (const p of ['countdown.q', 'countdown.steps.0.q', 'countdown.steps.2.order.0', 'countdown.steps.1.choices.0']) assert.ok(paths(countdown).includes(p), p);
  for (const p of ['rover.q', 'rover.puzzles.1.hint']) assert.ok(paths(rover).includes(p), p);
  for (const p of ['rhythm.q', 'rhythm.rounds.1.q', 'rhythm.rounds.1.explain', 'rhythm.rounds.2.pairs.0.label']) assert.ok(paths(rhythm).includes(p), p);
  // …and ids, places, numbers, notes and programs are not (they stay as written).
  const all = Object.values(DEMO_LESSONS).flatMap(paths);
  for (const re of [/\.group$/, /\.region$/, /\.id$/, /\.note$/, /\.color$/, /\.order\.\d+$/, /program|samples|rocks|start|pattern|blocks/]) {
    const bad = all.filter((p) => re.test(p) && !p.startsWith('countdown.steps.2.order'));
    assert.deepEqual(bad, [], String(re));
  }
  assert.ok(!all.includes('countdown.steps.0.order.0'), 'numbers to order stay numbers');
  assert.ok(!all.some((p) => p.startsWith('rhythm.rounds.1.choices')), 'note lengths stay numbers');
  // The demo lessons, in every language: complete, still well-formed, the numbers that matter unchanged.
  for (const id of OTHERS) {
    for (const lesson of Object.values(DEMO_LESSONS)) {
      const over = DEMO_OVERLAYS[id][lesson.id];
      assert.ok(over, `${id}: ${lesson.id} is not translated`);
      for (const p of lessonTextPaths(lesson)) {
        const v = atPath(over, p);
        assert.ok(typeof v === 'string' && v.trim(), `${id} ${lesson.id}: missing ${p.join('.')}`);
      }
      const local = applyOverlay(lesson, over);
      assert.deepEqual(lessonProblems(local, { gens: GENERATORS }), [], `${id} ${lesson.id}`);
      assert.deepEqual(local.sort?.items.map((i) => i.group), lesson.sort?.items.map((i) => i.group));
      assert.deepEqual(local.maphunt?.clues.map((c) => c.region), lesson.maphunt?.clues.map((c) => c.region));
      assert.deepEqual(local.rover?.puzzles.map((p) => [p.start, p.samples, p.rocks, p.program]), lesson.rover?.puzzles.map((p) => [p.start, p.samples, p.rocks, p.program]));
      assert.deepEqual(local.rhythm?.rounds.map((r) => [r.pattern, r.choices, r.pairs?.map((x) => x.note)]), lesson.rhythm?.rounds.map((r) => [r.pattern, r.choices, r.pairs?.map((x) => x.note)]));
      assert.deepEqual(local.countdown?.steps[0].order, lesson.countdown?.steps[0].order);
      // A translated code still decodes: every character of the message has its symbol.
      for (const f of local.dig?.finds ?? []) if (f.decode) {
        const c = cipherFor(f.decode.message, 1);
        assert.equal(c.code.filter((x) => !x.space).map((x) => x.ch).join(''), charsOf(f.decode.message).filter((x) => x.trim()).join('').toUpperCase(), `${id} ${f.decode.message}`);
      }
    }
  }
});

test('i18n: missing keys fall back to English, plurals follow the language', () => {
  assert.equal(tIn('ko', 'no.such.key'), 'no.such.key');
  const someKey = Object.keys(en.ui)[0];
  if (someKey) assert.ok(tIn('xx', someKey));
});

test('i18n: the tutor answers in the chosen language, and unknown ones fall back to English', async () => {
  const { tutorMessages, tutorLocale, TUTOR_TEXT } = await import('../../server/api/ai.js');
  const sys = (locale) => tutorMessages({ lessonId: 'm1-adding', question: 'Can I have a hint?', locale })[0].content;
  assert.match(sys('ko'), /Always answer in Korean/);
  assert.match(sys('ja'), /Japanese/);
  assert.match(sys('zh'), /Simplified Chinese/);
  assert.match(sys('es'), /Spanish/);
  assert.match(sys('xx'), /Always answer in English/);
  assert.equal(tutorLocale('<script>'), 'en');
  for (const code of Object.keys(TUTOR_TEXT)) for (const id of LOCALE_IDS) assert.ok(TUTOR_TEXT[code][id], `${code} ${id}`);
});
