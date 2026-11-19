import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERATORS, makeProblem, makeQuiz } from '../../src/arcademia/content/math.js';
import { LOCALE_IDS, loadLocale, num } from '../../src/arcademia/i18n/index.js';

for (const id of LOCALE_IDS) await loadLocale(id);
const N = (v, lc, d = 0) => num(v === 0 ? 0 : v, { minimumFractionDigits: d, maximumFractionDigits: d }, lc);
const S = (v, lc) => (v < 0 ? `−${N(-v, lc)}` : N(v, lc));
/** Each generator's answer, worked out again from its numbers alone, written the language's way. */
const SOLVE = {
  count: (d, lc) => N(d.n, lc),
  add10: (d, lc) => N(d.a + d.b, lc),
  sub10: (d, lc) => N(d.a - d.b, lc),
  'tens-ones': (d, lc) => N(d.ask === 'number' ? d.tens * 10 + d.ones : d.tens, lc),
  'add-carry': (d, lc) => N(d.a + d.b, lc),
  'skip-count': (d, lc) => N(d.start + 4 * d.by, lc),
  times: (d, lc) => N(d.a * d.b, lc),
  'sub-borrow': (d, lc) => N(d.a - d.b, lc),
  fractions: (d, lc) => `${N(d.shaded, lc)}/${N(d.parts, lc)}`,
  'mult-2x1': (d, lc) => N(d.a * d.b, lc),
  division: (d, lc) => N(d.a / d.b, lc),
  'fraction-of': (d, lc) => N((d.whole * d.n) / d.d, lc),
  balance: (d, lc) => N(d.x, lc),
  decimals: (d, lc) => N(Math.round((d.a + d.b) * 10) / 10, lc, 1),
  area: (d, lc) => (d.ask === 'area' ? N(d.w * d.h, lc) : N(2 * (d.w + d.h), lc)),
  negatives: (d, lc) => S(d.up ? d.a + d.b : d.a - d.b, lc),
  percent: (d, lc) => N((d.whole * d.p) / 100, lc),
  'two-step': (d, lc) => N(d.x, lc),
  squares: (d, lc) => N(d.ask === 'square' ? d.n * d.n : d.n, lc)
};

test('math: every generator is right in every language, and says it in that language', () => {
  for (const gen of Object.keys(GENERATORS)) {
    assert.ok(SOLVE[gen], `no solver for ${gen}`);
    for (let seed = 1; seed <= 120; seed++) {
      const en = makeProblem(gen, seed, 'en');
      for (const lc of LOCALE_IDS) {
        const p = makeProblem(gen, seed, lc);
        assert.deepEqual(p.data, en.data, `${gen} ${seed} ${lc}: the same seed gives the same numbers`);
        assert.equal(new Set(p.choices).size, p.choices.length, `${gen} ${seed} ${lc}: choices differ`);
        assert.ok(p.choices[p.answer].includes(SOLVE[gen](p.data, lc)), `${gen} ${seed} ${lc}: ${p.choices[p.answer]} should be ${SOLVE[gen](p.data, lc)}`);
        for (const k of ['q', 'hint', 'explain']) {
          assert.ok(p[k] && !/\{\w+\}/.test(p[k]), `${gen} ${seed} ${lc}: ${k} "${p[k]}"`);
          if (lc !== 'en' && k !== 'q' && /[a-z]{3,}/i.test(en[k].replace(/\d+[a-z]/g, ''))) assert.notEqual(p[k], en[k], `${gen} ${seed} ${lc}: ${k} is still English`);
        }
        for (const s of p.board) if (s.t === 'text' || s.t === 'say') assert.ok(!/\{\w+\}/.test(s.s), `${gen} ${lc}: board "${s.s}"`);
      }
    }
  }
});

test('math: Spanish writes decimals with a comma, and quizzes stay distinct', () => {
  const p = makeProblem('decimals', 3, 'es');
  assert.match(p.choices.join(' '), /\d,\d/);
  for (const lc of LOCALE_IDS) assert.equal(new Set(makeQuiz('times', 7, 5, lc).map((q) => q.q)).size, 5);
});
