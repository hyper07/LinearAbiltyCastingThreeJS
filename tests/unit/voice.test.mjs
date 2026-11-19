import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { LOCALE_IDS, registerLocale, tIn } from '../../src/arcademia/i18n/index.js';
import { registerAllLocales } from '../../src/arcademia/voice/locales.js';
import { buildScript, estimateSeconds, isCharId, isLineId, lineKey, scriptIndex, scriptStats, voiceCharacters, VOICE_KINDS } from '../../src/arcademia/voice/script.js';
import {
  CONSENT_VERSION, emptyManifest, languageHasRecordings, pickFile, progressOf, removeActor, selectRecording, setRecording, validateManifest, voiceCredits
} from '../../src/arcademia/voice/manifest.js';
import { CEILING_DB, db, integratedLoudness, limit, peak, processTake, speechBounds, undb } from '../../src/arcademia/voice/dsp.js';
import { VoicePlayer, resolveLine, textIndexOf } from '../../src/arcademia/voice/player.js';
import { voiceCreditRows } from '../../src/arcademia/credits.js';
import { VoiceStore, voiceHandler } from '../../server/voiceStore.js';
import { testDatabase } from './db.mjs';
import ko from '../../src/arcademia/i18n/locales/ko/index.js';

registerAllLocales();

/* ---------------------------------------------------------------- the script */

test('voice script: every line has a well-formed id, unique per character and language', () => {
  for (const lang of LOCALE_IDS) {
    const lines = buildScript(lang);
    assert.ok(lines.length > 900, `${lang}: ${lines.length} lines`);
    const seen = new Set();
    for (const l of lines) {
      assert.ok(isLineId(l.id), `${lang} ${l.id}`);
      assert.ok(isCharId(l.char), `${lang} ${l.char}`);
      assert.ok(VOICE_KINDS.includes(l.kind), l.kind);
      assert.ok(l.text.trim().length > 0 && l.direction.length > 20 && l.context.length > 5, `${lang} ${l.id}`);
      assert.ok(l.seconds > 0 && l.seconds < 60, `${lang} ${l.id} ${l.seconds}`);
      // Case-insensitive: the file names must not collide on macOS or Windows.
      const k = `${l.char}/${l.id}`.toLowerCase();
      assert.ok(!seen.has(k), `duplicate ${lang} ${k}`);
      seen.add(k);
    }
  }
});

test('voice script: ids come from keys and lesson ids, never the text — the same in every language, and after an edit', () => {
  const ids = (lang) => buildScript(lang).map((l) => `${l.char}/${l.id}`).sort();
  const en = ids('en');
  for (const lang of LOCALE_IDS) assert.deepEqual(ids(lang), en, `${lang} has other ids`);
  // Known ids stay put.
  const has = (char, id) => buildScript('en').some((l) => l.char === char && l.id === id);
  for (const [char, id] of [['hoot', 't.lesson.hello.math'], ['tock', 'l.h1-long-ago.reading.0'], ['guide-h1-long-ago', 'l.h1-long-ago.dialogue.intro'], ['tock', 't.quest.history.intro~h1-long-ago'], ['buddy-fox', 't.voice.buddy.great'], ['boss-1', 't.world.1.line'], ['townsfolk', 't.npc.6~3'], ['townsfolk', 't.npc.gems~2'], ['gizmo', 't.quest.physics.intro']]) {
    assert.ok(has(char, id), `${char} ${id}`);
  }
  // Edit Korean text everywhere: the ids don't move, the text does.
  const before = buildScript('ko');
  const edited = JSON.parse(JSON.stringify(ko));
  edited.lesson['lesson.hello.math'] = '안녕하세요! 새로 고친 문장이에요.';
  edited.lessons['h1-long-ago'].reading[0].text = '완전히 새로 쓴 읽기 카드예요. 아이디는 그대로예요.';
  registerLocale('ko', edited);
  try {
    const after = buildScript('ko');
    assert.deepEqual(after.map((l) => `${l.char}/${l.id}`), before.map((l) => `${l.char}/${l.id}`));
    assert.equal(after.find((l) => l.id === 't.lesson.hello.math').text, '안녕하세요! 새로 고친 문장이에요.');
  } finally {
    registerLocale('ko', ko);
  }
});

test('voice script: barks first, then floor 1, 2 …; every character group is there', () => {
  const lines = buildScript('en');
  const firstStory = lines.findIndex((l) => l.kind !== 'bark');
  assert.ok(lines.slice(0, firstStory).every((l) => l.kind === 'bark'));
  assert.ok(lines.slice(firstStory).every((l) => l.kind !== 'bark'));
  const floors = lines.slice(firstStory).map((l) => l.floor);
  assert.deepEqual(floors, [...floors].sort((a, b) => a - b));
  const groups = new Set(voiceCharacters('en').map((c) => c.group));
  assert.deepEqual([...groups].sort(), ['boss', 'buddy', 'guide', 'teacher', 'townsfolk']);
  const stats = scriptStats(lines);
  for (const c of ['hoot', 'tock', 'gizmo', 'buddy-fox', 'buddy-robot', 'buddy-dragon', 'buddy-puff', 'buddy-bunny', 'townsfolk']) assert.ok(stats[c].barks >= 10, c);
  // The words in a line match the language's own strings.
  assert.equal(buildScript('ko').find((l) => l.char === 'hoot' && l.id === 't.lesson.hello.math').text, tIn('ko', 'lesson.hello.math'));
  assert.ok(estimateSeconds('One two three four five.', 'en', 1) > estimateSeconds('One two three four five.', 'en', 6));
});

/* ---------------------------------------------------------------- the manifest */

const entry = (lang, char, line, extra = {}) => ({ files: { webm: `${lang}/${char}/${line}.webm` }, duration: 1.5, actor: 'a-0123abcd', take: '2026-11-19T10:00:00.000Z', lufs: -18, peak: -1.2, ...extra });
const sample = () => {
  const m = emptyManifest();
  m.actors['a-0123abcd'] = { name: 'Sam Lee', characters: ['hoot', 'buddy-fox'], languages: ['en'] };
  setRecording(m, 'en', 'hoot', 't.lesson.hello.math', entry('en', 'hoot', 't.lesson.hello.math'));
  setRecording(m, 'en', 'buddy-fox', 't.voice.buddy.great', entry('en', 'buddy-fox', 't.voice.buddy.great'));
  return m;
};

test('voice manifest: the schema, and the repo’s manifest with its files', () => {
  assert.deepEqual(validateManifest(emptyManifest()), []);
  assert.deepEqual(validateManifest(sample()), []);
  const bad = sample();
  bad.lines.en.hoot['t.lesson.hello.math'].files = { wav: 'en/hoot/t.lesson.hello.math.wav' };
  bad.lines.en.hoot['t.lesson.praise.0'] = entry('en', 'hoot', 't.lesson.praise.0', { actor: 'a-ffffffff', files: { webm: '../../etc/passwd' } });
  bad.lines.en['../x'] = {};
  const problems = validateManifest(bad).join('\n');
  for (const want of ['format wav', 'unknown actor', 'file path ../../etc/passwd', 'character ../x']) assert.match(problems, new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  // The shipped manifest (public/audio/voice/manifest.json) is valid and every file it names exists.
  const dir = resolve('public', 'audio', 'voice');
  const shipped = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  assert.deepEqual(validateManifest(shipped, { exists: (p) => existsSync(join(dir, p)) }), []);
  for (const [lang, chars] of Object.entries(shipped.lines)) for (const [char, lines] of Object.entries(chars)) for (const line of Object.keys(lines)) assert.ok(scriptIndex([lang]).has(lineKey(lang, char, line)), `${lang}/${char}/${line} is not in the script`);
});

test('voice manifest: a new take replaces the old files, the same take adds a format; removing an actor removes their credit', () => {
  const m = sample();
  const stale = setRecording(m, 'en', 'hoot', 't.lesson.hello.math', { ...entry('en', 'hoot', 't.lesson.hello.math'), files: { m4a: 'en/hoot/t.lesson.hello.math.m4a' } });
  assert.deepEqual(stale, []);
  assert.deepEqual(Object.keys(m.lines.en.hoot['t.lesson.hello.math'].files).sort(), ['m4a', 'webm']);
  const stale2 = setRecording(m, 'en', 'hoot', 't.lesson.hello.math', entry('en', 'hoot', 't.lesson.hello.math', { take: '2026-11-20T10:00:00.000Z' }));
  assert.deepEqual(stale2, ['en/hoot/t.lesson.hello.math.m4a']);
  assert.deepEqual(voiceCredits(m), [{ actor: 'a-0123abcd', name: 'Sam Lee', characters: ['buddy-fox', 'hoot'], languages: ['en'] }]);
  assert.deepEqual(voiceCreditRows(m, 'en'), [{ name: 'Sam Lee', characters: 'Fox cub, Professor Hoot', languages: 'English' }]);
  assert.equal(progressOf(m, buildScript('en'), 'en', 'hoot').done, 1);
  const files = removeActor(m, 'a-0123abcd');
  assert.equal(files.length, 2);
  assert.deepEqual(m.lines, {});
  assert.deepEqual(voiceCredits(m), []);
});

/* ---------------------------------------------------------------- the player: which recording, or silence */

test('voice player: exact language and character, else silence — never another language, another voice or a synthesized one', async () => {
  const m = sample();
  const sel = (o) => selectRecording(m, o)?.char ?? null;
  assert.equal(sel({ lang: 'en', char: 'hoot', line: 't.lesson.hello.math' }), 'hoot');
  assert.equal(sel({ lang: 'ko', char: 'hoot', line: 't.lesson.hello.math' }), null, 'no Korean recording: silence, not the English one');
  assert.equal(sel({ lang: 'en', char: 'tock', line: 't.lesson.hello.math' }), null, 'Tock never speaks with Hoot’s voice');
  assert.equal(sel({ lang: 'en', line: 't.lesson.hello.math' }), 'hoot', 'no character asked: whoever recorded it');
  assert.equal(sel({ lang: 'en', char: 'hoot', line: 'not a line id' }), null);
  assert.ok(languageHasRecordings(m, 'en'));
  assert.ok(!languageHasRecordings(m, 'ko'));
  // Formats: the first the browser can play.
  const e = { files: { webm: 'a.webm', m4a: 'a.m4a' } };
  assert.equal(pickFile(e, () => true), 'a.webm');
  assert.equal(pickFile(e, (x) => x === 'm4a'), 'a.m4a');
  assert.equal(pickFile(e, () => false), null);
  // Text from an old call site finds its line in the current language.
  const index = textIndexOf(buildScript('en'));
  assert.deepEqual(resolveLine(tIn('en', 'lesson.hello.math'), index, 'hoot'), { line: 't.lesson.hello.math', char: 'hoot' });
  assert.equal(resolveLine('Words nobody ever recorded.', index), null);
  assert.deepEqual(resolveLine('t.lesson.say3', index, 'tock'), { line: 't.lesson.say3', char: 'tock' });
  // The player itself, with this manifest: picks the file; anything else is null (it then does nothing at all).
  const p = new VoicePlayer({ root: '/audio/voice/' });
  p.manifest = m;
  assert.match(p.pick('t.lesson.hello.math', { char: 'hoot', lang: 'en' }).url, /^\/audio\/voice\/en\/hoot\/t\.lesson\.hello\.math\.webm\?t=/);
  assert.equal(p.pick('t.lesson.hello.math', { char: 'hoot', lang: 'ko' }), null);
  assert.equal(p.pick(tIn('en', 'lesson.say3'), { char: 'hoot', lang: 'en' }), null);
  assert.equal(await p.say('t.lesson.hello.math', { char: 'tock', lang: 'en' }), false);
});

test('no synthesized speech anywhere: src/, server/ and the pages never touch the speech synthesis API', () => {
  const banned = new RegExp(['speech', 'Synthesis'].join('') + '|' + ['SpeechSynthesis', 'Utterance'].join(''));
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(m?js|ts|html|css|json)$/.test(name) && banned.test(readFileSync(p, 'utf8'))) hits.push(p);
    }
  };
  walk(resolve('src'));
  walk(resolve('server'));
  for (const name of readdirSync('.')) if (name.endsWith('.html') && banned.test(readFileSync(name, 'utf8'))) hits.push(name);
  assert.deepEqual(hits, []);
});

/* ---------------------------------------------------------------- the maths */

const FS = 48000;
const sine = (amp, sec, f = 1000) => Float32Array.from({ length: Math.round(FS * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / FS));
const cat = (...parts) => {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const silence = (sec) => new Float32Array(Math.round(FS * sec));
/** A speech-like burst: a 220 Hz tone with a syllable-rate wobble. */
const voice = (amp, sec) => Float32Array.from({ length: Math.round(FS * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / FS) * (0.6 + 0.4 * Math.sin((2 * Math.PI * 4 * i) / FS)));

test('loudness: BS.1770 on reference tones (a 1 kHz sine at −20 dBFS is −23.0 LUFS)', () => {
  assert.ok(Math.abs(integratedLoudness(sine(0.1, 3), FS) - -23.01) < 0.05);
  assert.ok(Math.abs(integratedLoudness(sine(1, 3), FS) - -3.01) < 0.05);
  // The gate: six seconds of silence don't drag it down (ungated it would read about −29; the
  // blocks that straddle the edge are still counted, as the standard says, so a little under −23).
  const gated = integratedLoudness(cat(sine(0.1, 2), silence(6)), FS);
  assert.ok(gated > -23.6 && gated < -22.9, `gated ${gated}`);
  assert.equal(integratedLoudness(silence(1), FS), -Infinity);
});

test('take processing: trimmed, faded, −18 LUFS, peaks ≤ −1 dBFS', () => {
  const raw = cat(silence(0.6), voice(0.05, 1.5), silence(0.9));
  const out = processTake(raw, FS);
  assert.deepEqual(out.warnings, []);
  assert.ok(Math.abs(out.stats.lufs - -18) < 0.5, `lufs ${out.stats.lufs}`);
  assert.ok(db(peak(out.samples)) <= CEILING_DB + 1e-6, `peak ${db(peak(out.samples))}`);
  // Most of the silence is gone, a little air is kept (80 ms before, 150 ms after).
  assert.ok(out.stats.duration > 1.5 && out.stats.duration < 1.5 + 0.4, `duration ${out.stats.duration}`);
  assert.ok(Math.abs(out.stats.trimmed.start - 0.52) < 0.05, `start ${out.stats.trimmed.start}`);
  // Fades: it starts and ends at (almost) zero.
  assert.ok(Math.abs(out.samples[0]) < 1e-3 && Math.abs(out.samples[out.samples.length - 1]) < 1e-3);
  const b = speechBounds(raw, FS);
  assert.ok(b.start < 0.6 * FS && b.end > 2.1 * FS && b.end < 2.4 * FS);
});

test('take processing: warnings for clipping, a quiet take and nothing at all; the limiter holds the ceiling', () => {
  const clipped = cat(silence(0.4), Float32Array.from(voice(1.6, 1.2), (v) => Math.max(-1, Math.min(1, v))), silence(0.4));
  assert.ok(processTake(clipped, FS).warnings.includes('clipping'));
  const quiet = cat(silence(0.4), voice(0.002, 1.2), silence(0.4));
  assert.ok(processTake(quiet, FS).warnings.includes('quiet'));
  assert.deepEqual(processTake(silence(2), FS).warnings, ['empty']);
  // A spiky signal: the limiter keeps every sample under the ceiling without a jump in gain.
  const spiky = Float32Array.from(sine(0.3, 1, 300), (v, i) => (i % 4800 === 7 ? 0.99 : v));
  const lim = limit(Float32Array.from(spiky, (v) => v * 3), FS, undb(-1));
  assert.ok(peak(lim) <= undb(-1) + 1e-6);
});

/* ---------------------------------------------------------------- the upload API */

const WEBM = (n = 4000) => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(n)]);
const MP4 = (n = 4000) => Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypM4A '), Buffer.alloc(n)]);

async function serve(env, opts = {}) {
  const db = await testDatabase();
  const dir = await mkdtemp(join(tmpdir(), 'voice-test-'));
  const voiceDir = join(dir, 'voice');
  await mkdir(voiceDir);
  await writeFile(join(dir, 'secret.txt'), 'outside');
  const store = new VoiceStore(db, { voiceDir });
  const handler = voiceHandler(async () => store, { env, ...opts });
  const server = http.createServer((req, res) => handler(req, res).then((done) => done || (res.writeHead(404), res.end())));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => {
    await new Promise((r) => server.close(r));
    await db.close();
    await rm(dir, { recursive: true, force: true });
  };
  return { base, dir, voiceDir, store, close };
}
const ADMIN = { ADMIN_ACCOUNTS: 'boss', ADMIN_PASSWORD: 'pw-123456' };
const auth = (id = 'boss', pw = 'pw-123456') => ({ Authorization: `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}` });

test('voice API: admin only — no header, a wrong password and a missing admin config are all refused', async () => {
  const s = await serve(ADMIN);
  try {
    assert.equal((await fetch(`${s.base}/api/voice`)).status, 401);
    assert.equal((await fetch(`${s.base}/api/voice`, { headers: auth('boss', 'nope') })).status, 401);
    assert.equal((await fetch(`${s.base}/api/voice`, { headers: auth('someone', 'pw-123456') })).status, 401);
    const ok = await fetch(`${s.base}/api/voice`, { headers: auth() });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.consent.version, CONSENT_VERSION);
    assert.deepEqual(body.actors, []);
  } finally {
    await s.close();
  }
  // Production (no allowLocal) with no admin configured: closed, even from this machine.
  const off = await serve({ ADMIN_ACCOUNTS: '', ADMIN_PASSWORD: '' });
  try {
    assert.equal((await fetch(`${off.base}/api/voice`)).status, 401);
  } finally {
    await off.close();
  }
  // The dev server with no admin configured lets the local machine in.
  const dev = await serve({ ADMIN_ACCOUNTS: '', ADMIN_PASSWORD: '' }, { allowLocal: true });
  try {
    assert.equal((await fetch(`${dev.base}/api/voice`)).status, 200);
  } finally {
    await dev.close();
  }
});

test('voice API: consent first; uploads checked for ids, types, sizes and paths; files and manifest written only inside the folder', async () => {
  const s = await serve(ADMIN);
  const H = { ...auth(), 'Content-Type': 'application/json' };
  const post = (path, body, method = 'POST') => fetch(`${s.base}/api/voice${path}`, { method, headers: H, body: JSON.stringify(body) });
  const put = (path, bytes, type = 'audio/webm', q = {}) => fetch(`${s.base}/api/voice/lines/${path}?${new URLSearchParams({ actor: actorId, take: '2026-11-19T10:00:00.000Z', duration: '1.5', lufs: '-18', peak: '-1.2', ...q })}`, { method: 'PUT', headers: { ...auth(), 'Content-Type': type }, body: bytes });
  let actorId = null;
  try {
    // No consent, no actor.
    assert.equal((await post('/actors', { name: 'Sam Lee', characters: ['hoot'], languages: ['en'] })).status, 400);
    assert.equal((await post('/actors', { name: 'Sam Lee', characters: ['hoot'], languages: ['en'], consent: true, consentVersion: 0 })).status, 400);
    assert.equal((await post('/actors', { name: 'Sam Lee', characters: ['nobody'], languages: ['en'], consent: true, consentVersion: CONSENT_VERSION })).status, 400);
    const made = await post('/actors', { name: '  Sam <b>Lee</b> ', characters: ['hoot', 'buddy-fox'], languages: ['en', 'ko'], consent: true, consentVersion: CONSENT_VERSION });
    assert.equal(made.status, 200);
    const actor = (await made.json()).actor;
    actorId = actor.id;
    assert.equal(actor.name, 'Sam bLee/b');
    assert.ok(actor.consent.at > 0 && actor.consent.by === 'boss' && actor.consent.text.includes('removed'));

    // A good upload.
    const ok = await put('en/hoot/t.lesson.hello.math.webm', WEBM());
    assert.equal(ok.status, 200, await ok.clone().text());
    assert.ok(existsSync(join(s.voiceDir, 'en', 'hoot', 't.lesson.hello.math.webm')));
    // The same take in AAC joins it.
    assert.equal((await put('en/hoot/t.lesson.hello.math.m4a', MP4(), 'audio/mp4')).status, 200);
    const m = JSON.parse(await readFile(join(s.voiceDir, 'manifest.json'), 'utf8'));
    assert.deepEqual(validateManifest(m, { exists: (p) => existsSync(join(s.voiceDir, p)) }), []);
    assert.deepEqual(Object.keys(m.lines.en.hoot['t.lesson.hello.math'].files).sort(), ['m4a', 'webm']);
    assert.equal(m.actors[actorId].name, 'Sam bLee/b');

    // Refused: not in the script, someone else's character or language, traversal, bad types, sizes.
    const refusals = [
      ['en/hoot/t.not.a.line.webm', WEBM(), 'audio/webm', 404],
      ['en/tock/t.lesson.hello.history.webm', WEBM(), 'audio/webm', 403],
      ['es/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/webm', 403],
      ['xx/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/webm', 400],
      ['en/hoot/..%2F..%2Fsecret.webm', WEBM(), 'audio/webm', 400],
      ['en/hoot/t.lesson..hello.webm', WEBM(), 'audio/webm', 400],
      ['en/..%2F..%2F/t.lesson.hello.math.webm', WEBM(), 'audio/webm', 400],
      ['en/hoot/t.lesson.hello.math.wav', WEBM(), 'audio/wav', 415],
      ['en/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/mp4', 415],
      ['en/hoot/t.lesson.hello.math.webm', MP4(), 'audio/webm', 415],
      ['en/hoot/t.lesson.hello.math.webm', Buffer.from('<html>not audio</html>'.repeat(20)), 'audio/webm', 415],
      ['en/hoot/t.lesson.hello.math.webm', WEBM(10), 'audio/webm', 400],
      ['en/hoot/t.lesson.hello.math.webm', WEBM(3 * 1024 * 1024), 'audio/webm', 413]
    ];
    for (const [path, bytes, type, status] of refusals) assert.equal((await put(path, bytes, type)).status, status, `${path} as ${type}`);
    assert.equal((await put('en/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/webm', { duration: '999' })).status, 400);
    assert.equal((await put('en/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/webm', { take: 'yesterday' })).status, 400);
    assert.equal((await put('en/hoot/t.lesson.hello.math.webm', WEBM(), 'audio/webm', { actor: 'a-ffffffff' })).status, 400);
    assert.equal(await readFile(join(s.dir, 'secret.txt'), 'utf8'), 'outside');
    assert.throws(() => s.store.inside('..', 'secret.txt'), /outside/);
    // Without the admin, not even a byte.
    assert.equal((await fetch(`${s.base}/api/voice/lines/en/hoot/t.lesson.praise.0.webm?actor=${actorId}`, { method: 'PUT', headers: { 'Content-Type': 'audio/webm' }, body: WEBM() })).status, 401);
    assert.ok(!existsSync(join(s.voiceDir, 'en', 'hoot', 't.lesson.praise.0.webm')));

    // "Remove all my recordings": the files and the credit go, the consent row records when.
    assert.equal((await put('en/buddy-fox/t.voice.buddy.great.webm', WEBM())).status, 200);
    assert.equal((await post(`/actors/${actorId}/remove`, {})).status, 400, 'needs confirming');
    const gone = await post(`/actors/${actorId}/remove`, { confirm: true });
    assert.equal((await gone.json()).removed, 3);
    const after = JSON.parse(await readFile(join(s.voiceDir, 'manifest.json'), 'utf8'));
    assert.deepEqual([after.lines, after.actors], [{}, {}]);
    assert.ok(!existsSync(join(s.voiceDir, 'en', 'hoot', 't.lesson.hello.math.webm')));
    const row = (await (await fetch(`${s.base}/api/voice`, { headers: auth() })).json()).actors[0];
    assert.ok(row.removedAt > 0 && row.consent.at > 0);
    assert.equal((await put('en/hoot/t.lesson.hello.math.webm', WEBM())).status, 409, 'a removed actor cannot record again without new consent');
  } finally {
    await s.close();
  }
});
