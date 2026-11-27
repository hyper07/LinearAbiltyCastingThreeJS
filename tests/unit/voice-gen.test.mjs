/**
 * AI Arcademia's generated character voices: text normalisation per language,
 * the generated-voice manifest, the player's priority (a person's recording →
 * the generated voice → silence) and the Credits entry.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { registerAllLocales } from '../../src/arcademia/voice/locales.js';
import { buildScript } from '../../src/arcademia/voice/script.js';
import { emptyManifest } from '../../src/arcademia/voice/manifest.js';
import { CAST, GEN_CREDIT, REF_TEXT, castFor, emptyGenManifest, isCoreLine, mergeGenManifests, paceVariant, selectVoice, validateGenManifest } from '../../src/arcademia/voice/generated.js';
import { enNumber, enYear, errorRate, esNumber, jaNumber, koNative, koSino, speakable, spokenKey, stripEmoji, zhNumber } from '../../src/arcademia/voice/normalize.js';
import { VoicePlayer } from '../../src/arcademia/voice/player.js';
import { generatedVoiceCredit } from '../../src/arcademia/credits.js';

registerAllLocales();

/* ---------------------------------------------------------------- normalisation */

test('normalise: number words in every language', () => {
  assert.equal(enNumber(0), 'zero');
  assert.equal(enNumber(21), 'twenty-one');
  assert.equal(enNumber(384000), 'three hundred and eighty-four thousand');
  assert.equal(enYear(1492), 'fourteen ninety-two');
  assert.equal(enYear(1903), 'nineteen oh three');
  assert.equal(enYear(2009), 'two thousand nine');
  assert.equal(enYear(1100), 'eleven hundred');
  assert.equal(esNumber(21), 'veintiuno');
  assert.equal(esNumber(100), 'cien');
  assert.equal(esNumber(1492), 'mil cuatrocientos noventa y dos');
  assert.equal(esNumber(80000), 'ochenta mil');
  assert.equal(koSino(1492), '천사백구십이');
  assert.equal(koSino(10000), '만');
  assert.equal(koSino(384000), '삼십팔만 사천');
  assert.equal(koNative(1), '한');
  assert.equal(koNative(20), '스무');
  assert.equal(koNative(12), '열두');
  assert.equal(jaNumber(1492), '千四百九十二');
  assert.equal(jaNumber(300000), '三十万');
  assert.equal(zhNumber(28000), '两万八千');
  assert.equal(zhNumber(105), '一百零五');
  assert.equal(zhNumber(12), '十二');
});

test('normalise: sums read the way a teacher says them', () => {
  assert.equal(speakable('3 + 7 = ?', 'en'), 'three plus seven equals what?');
  assert.equal(speakable('12 ÷ 3 = 4', 'en'), 'twelve divided by three equals four');
  assert.equal(speakable('2 × 6 = 12', 'es'), 'dos por seis es igual a doce');
  assert.equal(speakable('3 + 7 = ?', 'ko'), '삼 더하기 칠은 얼마?');
  assert.equal(speakable('2 + 3 = 5', 'ko'), '이 더하기 삼은 오', 'the topic particle follows the last syllable');
  assert.equal(speakable('3 + 7 = ?', 'ja'), '三たす七はいくつ？');
  assert.equal(speakable('3 + 7 = ?', 'zh'), '三加七等于多少？');
  assert.equal(speakable('In 3x + 4 = 19, undo the +4 first, then the ×3.', 'en'), 'In three x plus four equals nineteen, undo the plus four first, then the times three.');
  assert.equal(speakable('5² means 5 × 5 = 25. √25 = 5', 'en'), 'five squared means five times five equals twenty-five. the square root of twenty-five equals five');
  assert.equal(speakable('It is −3 °C.', 'en'), 'It is minus three degrees Celsius.');
});

test('normalise: fractions, decimals, percentages, money, units and years', () => {
  assert.equal(speakable('1/8 is less than 1/4; 3/4 of 20 is 15.', 'en'), 'one eighth is less than one quarter; three quarters of twenty is fifteen.');
  assert.equal(speakable('A 20% discount on £40', 'en'), 'A twenty percent discount on forty pounds');
  assert.equal(speakable('9.58 seconds at 10.4 m/s', 'en'), 'nine point five eight seconds at ten point four metres per second');
  assert.equal(speakable('In 1492 and the 1800s', 'en'), 'In fourteen ninety-two and the eighteen hundreds');
  assert.equal(speakable('about 384,000 km away', 'en'), 'about three hundred and eighty-four thousand kilometres away');
  assert.equal(speakable('3/4 y 1/2, 21,5 kilos, 80 000 km', 'es'), 'tres cuartos y un medio, veintiuno coma cinco kilos, ochenta mil kilómetros');
  assert.equal(speakable('1 gema', 'es'), '1 gema', '1 before a noun is left to the model (un / una)');
  assert.equal(speakable('3/4은 0.3, 30%는, 30°', 'ko'), '사분의 삼은 영 점 삼, 삼십 퍼센트는, 삼십도');
  assert.equal(speakable('1492년 7월 16일, 6월, 10월', 'ko'), '천사백구십이년 칠월 십육일, 유월, 시월');
  assert.equal(speakable('3/4、0.3、30%', 'ja'), '四分の三、れいてんさん、三十パーセント');
  assert.equal(speakable('1492年，2009年', 'zh'), '一四九二年，二零零九年', 'years digit by digit');
  assert.equal(speakable('3/4，30%，30°', 'zh'), '四分之三，百分之三十，三十度');
});

test('normalise: Korean counters take native numbers; Japanese つ counts in kana', () => {
  assert.equal(speakable('사과 3개, 2마리, 20살, 12시간, 3번', 'ko'), '사과 세 개, 두 마리, 스무 살, 열두 시간, 세 번');
  assert.equal(speakable('1개는 10개씩', 'ko'), '한 개는 열 개씩');
  assert.equal(speakable('11호, 1800년대, 5분', 'ko'), '십일호, 천팔백년대, 오분');
  assert.equal(speakable('1つ、3つ', 'ja'), 'ひとつ、みっつ');
});

test('normalise: emoji and stray symbols go; the words stay', () => {
  assert.equal(stripEmoji('Great job! 🎉🦉👍🏽'), 'Great job! ');
  assert.equal(speakable('🔊 Read to me — please!', 'en'), 'Read to me, please!');
  assert.equal(speakable('The ____ has landed.', 'en'), 'The … has landed.');
  assert.equal(speakable('（4）', 'zh'), '四');
  // Every line of every language's script normalises to something with no digits left (but Spanish 1 before a noun).
  for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) {
    for (const l of buildScript(lang)) {
      const s = speakable(l.text, lang);
      assert.ok(s.length > 0, `${lang} ${l.id}: empty`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(s), `${lang} ${l.id}: emoji left in “${s}”`);
      if (lang !== 'es') assert.ok(!/\d/.test(s), `${lang} ${l.id}: digits left in “${s}”`);
    }
  }
});

test('checking a take: word and character error rates on the spoken form', () => {
  assert.equal(errorRate('Hoo-ray! Three stars!', 'Hooray, three stars.', 'en'), 0);
  assert.equal(errorRate('3 + 7 = ?', 'three plus seven equals what', 'en'), 0);
  assert.equal(errorRate('1492년에', '천사백구십이년에', 'ko'), 0, 'digits and words compare the same');
  assert.ok(Math.abs(errorRate('one two three four', 'one two four', 'en') - 0.25) < 1e-9);
  assert.equal(spokenKey('ホーホー！', 'ja'), 'ほーほー');
  assert.equal(errorRate('', '', 'en'), 0);
  assert.ok(errorRate('欢迎来到我的教室', '欢迎来到我教室请不吝点赞', 'zh') > 0.4, 'invented words count');
});

/* ---------------------------------------------------------------- the cast and the split */

test('cast: every character in the script has a designed voice and a reference sentence in every language', () => {
  const guides = buildScript('en').filter((l) => l.char.startsWith('guide-')).map((l) => l.char);
  const order = [...new Set(guides)];
  for (const char of new Set(buildScript('en').map((l) => l.char))) {
    const v = castFor(char, char.startsWith('guide-') ? order.indexOf(char) : null);
    assert.ok(v?.design?.length > 30, `${char}: no voice`);
    for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) assert.ok(REF_TEXT[v.ref]?.[lang], `${char}: no ${lang} reference sentence`);
  }
  for (const [id, v] of Object.entries(CAST)) if (id.startsWith('boss-')) assert.match(v.design, /never (scary|menacing)|more cuddly than scary/, `${id} must not be scary`);
  for (const b of ['fox', 'robot', 'dragon', 'puff', 'bunny']) assert.match(CAST[`buddy-${b}`].design, /child|girl|boy/);
});

test('cast: the new worlds\' teachers are gentle middle-aged grown-ups; their bosses cute and never scary; the Sky Castle tells it like a storybook', async () => {
  const { CAST_BY_LANG } = await import('../../src/arcademia/voice/generated.js');
  const { REALM_TEACHER_OF } = await import('../../src/arcademia/voice/script.js');
  const realms = ['forest', 'sea', 'desert', 'moon', 'mars', 'castle'];
  for (const r of realms) {
    for (const id of Object.values(REALM_TEACHER_OF[r])) {
      for (const v of [CAST[id], CAST_BY_LANG.ko[id]]) {
        assert.match(v.design, /in (his|her) (early |mid |late )?(thirties|forties|fifties)/, `${id}: a middle-aged grown-up`);
        assert.match(v.design, /guardian angel/, `${id}: the gentle, reassuring warmth`);
        assert.match(v.design, /never breathy, whispery, preachy or over-acted/, `${id}: still a real voice`);
        if (r === 'castle') assert.match(v.design, /storybook/, `${id}: the Sky Castle's storybook tone`);
      }
    }
    for (let n = 1; n <= 7; n++) {
      const d = CAST[`${r}-boss-${n}`].design;
      assert.match(d, /never (scary|menacing)/, `${r}-boss-${n} must not be scary`);
      assert.match(d, /friendly|cuddly|sweet|playful/, `${r}-boss-${n} is cute and friendly`);
      if (r === 'castle') assert.match(d, /storybook/);
    }
  }
  // The Sky Castle's history guides get the storybook tone too; the mountain's keep their voices.
  const guides = [...new Set(buildScript('en').filter((l) => l.char.startsWith('guide-')).map((l) => l.char))];
  const castle = guides.find((g) => /-castle-/.test(g));
  assert.match(castFor(castle, guides.indexOf(castle)).design, /storybook/);
  assert.doesNotMatch(castFor('guide-h1-long-ago', 0).design, /storybook/);
  // The newer worlds' guides share a small pool of voices that fit who they are (a few are children).
  const { GUIDE_CAST, GUIDE_POOL } = await import('../../src/arcademia/voice/generated.js');
  const { lessonById } = await import('../../src/arcademia/content/index.js');
  const newer = guides.filter((g) => (lessonById(g.slice('guide-'.length)).realm ?? 'land') !== 'land');
  for (const g of newer) assert.ok(GUIDE_CAST[g.slice('guide-'.length)], `${g}: a chosen voice`);
  const pools = new Set(newer.map((g) => castFor(g, guides.indexOf(g)).pool));
  assert.ok(pools.size <= GUIDE_POOL.length && !pools.has(undefined), 'a small shared pool');
  assert.equal(castFor('guide-h1-long-ago', 0).pool, undefined, 'the mountain\'s guides keep their own clips');
  for (const [g, who] of [['h4-desert-hatshepsut', /woman/], ['h2-moon-galileo', /\bman\b/], ['h4-moon-katherine-johnson', /woman/], ['h5-castle-hildegard', /woman/], ['h2-moon-sputnik', /girl/], ['h6-sea-hms-challenger', /boy/]]) {
    for (const index of [3, 40, 77]) assert.match(castFor(`guide-${g}`, index).design, who, `${g} sounds like who they are`);
  }
});

test('script: a world\'s puzzle boss asks that world\'s riddles (the voice lesson/boss.js plays)', async () => {
  const { lessonById } = await import('../../src/arcademia/content/index.js');
  const lines = buildScript('en');
  const riddles = lines.filter((l) => l.kind === 'quiz' && /-boss-|^boss-/.test(l.char));
  assert.ok(riddles.some((l) => l.char === 'castle-boss-1' && /^l\.m1-castle-/.test(l.id)), 'the castle gate goose asks the castle\'s riddles');
  for (const l of riddles) {
    const realm = lessonById(l.id.split('.')[1]).realm ?? 'land';
    assert.equal(l.char, realm !== 'land' ? `${realm}-boss-${l.floor}` : `boss-${l.floor}`, `${l.id} is asked by its own world's boss`);
  }
});

test('split: barks and floors 1–2 are the committed core; floors 1–2 lessons use the slower voice', () => {
  const lines = buildScript('en');
  const core = lines.filter(isCoreLine);
  assert.ok(core.every((l) => l.kind === 'bark' || l.floor <= 2));
  assert.ok(lines.filter((l) => !isCoreLine(l)).every((l) => l.kind !== 'bark' && l.floor >= 3));
  assert.equal(paceVariant({ kind: 'reading', floor: 1 }), 'slow');
  assert.equal(paceVariant({ kind: 'bark', floor: 0 }), 'normal');
  assert.equal(paceVariant({ kind: 'quiz', floor: 5 }), 'normal');
});

/* ---------------------------------------------------------------- the manifest */

const gen = (lang, char, line, extra = {}) => ({ files: { webm: `${lang}/${char}/${line}.webm` }, duration: 1.5, take: '2026-11-19T10:00:00.000Z', text: 'abc', voice: `${char}/${lang}-normal`, err: 0, ...extra });
function genSample() {
  const m = emptyGenManifest();
  m.lines = { en: { hoot: { 't.lesson.hello.math': gen('en', 'hoot', 't.lesson.hello.math'), 't.lesson.say3': gen('en', 'hoot', 't.lesson.say3') } }, ko: { hoot: { 't.lesson.hello.math': gen('ko', 'hoot', 't.lesson.hello.math') } } };
  return m;
}

test('generated manifest: schema (generated: true, the model and its licence), and bad entries are caught', () => {
  const m = genSample();
  assert.deepEqual(validateGenManifest(m), []);
  assert.equal(m.generated, true);
  assert.equal(m.model.licence, 'Apache-2.0');
  assert.equal(m.model.name, GEN_CREDIT.model);
  const bad = structuredClone(m);
  bad.generated = false;
  bad.lines.en.hoot['t.lesson.say3'].files.webm = '../../etc/passwd';
  bad.lines.en.hoot['t.lesson.say2'] = { files: {}, duration: 0, take: 'nope' };
  const problems = validateGenManifest(bad).join(' | ');
  for (const want of ['generated must be true', 'file path', 'no files', 'duration', 'take date']) assert.ok(problems.includes(want), `${want}: ${problems}`);
  const merged = mergeGenManifests(m, { lines: { es: { hoot: { 't.lesson.say3': gen('es', 'hoot', 't.lesson.say3') } } } });
  assert.ok(merged.lines.es.hoot['t.lesson.say3'] && merged.lines.en.hoot['t.lesson.say3']);
});

test('generated manifest: the repo’s committed one is valid, every file exists, and git keeps exactly those files', () => {
  const dir = resolve('public', 'audio', 'voice-gen');
  const file = join(dir, 'manifest.json');
  if (!existsSync(file)) return; // nothing generated yet
  const m = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(validateGenManifest(m, { exists: (p) => existsSync(join(dir, p)) }), []);
  assert.equal(m.model.licence, 'Apache-2.0');
  const ignore = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
  const scripts = Object.fromEntries(['en', 'ko', 'es', 'ja', 'zh'].map((l) => [l, new Map(buildScript(l).map((x) => [`${x.char}/${x.id}`, x]))]));
  for (const [lang, chars] of Object.entries(m.lines)) {
    for (const [char, lines] of Object.entries(chars)) {
      for (const [id, e] of Object.entries(lines)) {
        assert.ok(ignore.includes(`!/${e.files.webm}`), `${e.files.webm} is not kept in git`);
        const line = scripts[lang].get(`${char}/${id}`);
        assert.ok(line, `${lang}/${char}/${id} is not in the script`);
        assert.ok(isCoreLine(line), `${lang}/${char}/${id} is not a core line`);
      }
    }
  }
});

/* ---------------------------------------------------------------- the player */

test('player priority: a person’s recording → the generated voice → silence', async () => {
  const human = emptyManifest();
  human.actors = { 'a-0123abcd': { name: 'Sam Lee', characters: ['hoot'], languages: ['en'] } };
  human.lines = { en: { hoot: { 't.lesson.hello.math': { files: { webm: 'en/hoot/t.lesson.hello.math.webm' }, duration: 2, actor: 'a-0123abcd', take: '2026-11-19T11:00:00.000Z' } } } };
  const g = genSample();
  const src = (q) => selectVoice(human, g, q)?.source ?? null;
  assert.equal(src({ lang: 'en', char: 'hoot', line: 't.lesson.hello.math' }), 'human', 'the recording wins');
  assert.equal(src({ lang: 'en', char: 'hoot', line: 't.lesson.say3' }), 'generated', 'no recording: the generated voice');
  assert.equal(src({ lang: 'ko', char: 'hoot', line: 't.lesson.hello.math' }), 'generated');
  assert.equal(src({ lang: 'es', char: 'hoot', line: 't.lesson.hello.math' }), null, 'neither: silence, never another language');
  assert.equal(src({ lang: 'en', char: 'tock', line: 't.lesson.say3' }), null, 'never another character’s voice');
  assert.equal(src({ lang: 'en', line: 't.lesson.hello.math' }), 'human');

  const p = new VoicePlayer({ root: '/audio/voice/', genRoot: '/audio/voice-gen/' });
  p.manifest = human;
  p.generated = g;
  assert.ok(p.hasLanguage('en') && p.hasLanguage('ko') && !p.hasLanguage('es'));
  const h = p.pick('t.lesson.hello.math', { char: 'hoot', lang: 'en' });
  assert.equal(h.source, 'human');
  assert.match(h.url, /^\/audio\/voice\/en\/hoot\/t\.lesson\.hello\.math\.webm\?t=/);
  const gp = p.pick('t.lesson.say3', { char: 'hoot', lang: 'en' });
  assert.equal(gp.source, 'generated');
  assert.match(gp.url, /^\/audio\/voice-gen\/en\/hoot\/t\.lesson\.say3\.webm\?t=/);
  assert.equal(p.pick('t.lesson.hello.math', { char: 'hoot', lang: 'es' }), null);
  assert.ok(p.has('t.lesson.say3', 'hoot', 'en') && !p.has('t.lesson.say3', 'tock', 'en'));
  assert.equal(await p.say('t.lesson.hello.math', { char: 'hoot', lang: 'es' }), false, 'silence does nothing');
  // With no generated voices at all, a language with no recordings has no voice.
  p.generated = emptyGenManifest();
  assert.ok(!p.hasLanguage('ko'));
});

test('credits: the generated voices are credited with the model, its licence and link', () => {
  assert.equal(generatedVoiceCredit(emptyGenManifest()), null);
  const c = generatedVoiceCredit(genSample());
  assert.deepEqual(c, { name: 'Qwen3-TTS', url: 'https://github.com/QwenLM/Qwen3-TTS', licence: 'Apache-2.0', by: 'Alibaba Qwen team' });
  assert.match(GEN_CREDIT.attribution, /Qwen3-TTS.*Apache-2\.0.*github\.com\/QwenLM\/Qwen3-TTS/);
});

test('cast: every voice has a natural pitch window; Korean adults are their own, younger voices; some bosses are children', async () => {
  const { CAST_BY_LANG } = await import('../../src/arcademia/voice/generated.js');
  for (const [id, v] of Object.entries(CAST)) {
    assert.ok(Array.isArray(v.f0) && v.f0[0] < v.f0[1], `${id} needs a pitch window`);
    assert.ok(v.f0[1] <= 340, `${id}: no squeaky voices`);
  }
  for (const id of ['hoot', 'tock', 'gizmo', 'townsfolk']) {
    const ko = castFor(id, null, 'ko');
    assert.equal(ko.own, true, `${id} has its own Korean voice`);
    assert.equal(ko.design, CAST_BY_LANG.ko[id].design);
    assert.equal(castFor(id, null, 'en').own, false);
  }
  assert.match(castFor('hoot', null, 'ko').design, /twenties/);
  assert.match(castFor('guide-x', 5, 'ko').design, /forties/);
  for (const id of ['boss-1', 'boss-3', 'boss-7']) assert.match(CAST[id].design, /years old/);
});
