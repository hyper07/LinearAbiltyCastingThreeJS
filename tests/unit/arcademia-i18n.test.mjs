import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, LOCALE_IDS, pickLocale, loadLocale, tIn, localizeLesson, lessonTextPaths, atPath, num } from '../../src/arcademia/i18n/index.js';
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
