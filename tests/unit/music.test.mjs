import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MOODS, MUSIC_CREDIT, equalPower, fadeCurve, crossfadeSeconds, loopPosition, pairOffset,
  validateLoop, validateManifest, selectTrack, trackForMood, musicCredits, toastText,
  loadSettings, saveSettings, shouldToast, DEFAULT_SETTINGS, SETTINGS_KEY
} from '../../src/shared/music.js';

const BGM = path.resolve('public/audio/bgm');
const credit = { ...MUSIC_CREDIT };
const T = (id, extra = {}) => ({ id, title: id, file: `${id}.ogg`, kind: 'loop', tags: ['calm'], mood: 'calm', bpm: 100, duration: 120, loopStart: 4, loopEnd: 116, credit, ...extra });
const FIXTURE = {
  tracks: [
    T('meadow', { tags: ['calm', 'nature'], pair: 'battle', bpm: 75 }),
    T('battle', { tags: ['battle'], mood: 'battle', pair: 'meadow', bpm: 150 }),
    T('boss', { tags: ['battle', 'boss'], mood: 'boss', pair: 'fortress' }),
    T('fortress', { tags: ['dungeon'], mood: 'tense', pair: 'boss' }),
    T('village', { tags: ['town', 'calm'] }),
    T('victory', { kind: 'stinger', tags: ['stinger'], mood: 'victory', duration: 5, loopStart: undefined, loopEnd: undefined })
  ]
};
const first = () => 0;

/* ------------------------------------------------------------------ curves */

test('equal-power crossfade keeps the summed power at 1', () => {
  for (let i = 0; i <= 20; i++) {
    const g = equalPower(i / 20);
    assert.ok(Math.abs(g.out ** 2 + g.in ** 2 - 1) < 1e-9);
  }
  assert.deepEqual(equalPower(0), { out: 1, in: 0 });
  assert.ok(equalPower(1).out < 1e-9 && equalPower(1).in === 1);
  assert.ok(Math.abs(equalPower(0.5).in - Math.SQRT1_2) < 1e-9, '-3 dB at the middle');
  assert.deepEqual(equalPower(-1), equalPower(0), 'clamped');
});

test('fade curves run from silence to the level and back, monotonic', () => {
  const up = fadeCurve('in', 0.8, 32);
  const down = fadeCurve('out', 0.8, 32);
  assert.equal(up.length, 32);
  assert.equal(up[0], 0);
  assert.ok(Math.abs(up[31] - 0.8) < 1e-6);
  assert.ok(Math.abs(down[0] - 0.8) < 1e-6 && down[31] < 1e-6);
  for (let i = 1; i < 32; i++) {
    assert.ok(up[i] >= up[i - 1] && down[i] <= down[i - 1]);
    assert.ok(Math.abs(up[i] ** 2 + down[i] ** 2 - 0.64) < 1e-5);
  }
});

test('crossfades: quick into battle, slow out of it, all within 1.5–3 s', () => {
  assert.equal(crossfadeSeconds('calm', 'battle'), 1.5);
  assert.equal(crossfadeSeconds('tense', 'boss'), 1.5);
  assert.equal(crossfadeSeconds('battle', 'calm'), 3);
  assert.equal(crossfadeSeconds('boss', 'tense'), 3);
  for (const a of MOODS) for (const b of MOODS) {
    const s = crossfadeSeconds(a, b);
    assert.ok(s >= 1.5 && s <= 3, `${a}->${b}`);
  }
  assert.ok(crossfadeSeconds('calm', 'battle') < crossfadeSeconds('battle', 'calm'));
});

/* ------------------------------------------------------------------ loops */

test('loop position: the intro once, then around [loopStart, loopEnd)', () => {
  assert.equal(loopPosition(3, 0, 4, 10), 3);
  assert.equal(loopPosition(10, 0, 4, 10), 4);
  assert.ok(Math.abs(loopPosition(17.5, 0, 4, 10) - 5.5) < 1e-9);
  assert.ok(Math.abs(loopPosition(1, 9.5, 4, 10) - 4.5) < 1e-9);
  assert.equal(loopPosition(50, 0, 0, 0), 50, 'no loop: plain time');
});

test('a calm/tense pair starts in phase with the bar; others start at 0', () => {
  const [meadow, battle, , , village] = FIXTURE.tracks;
  const bar = 240 / 150;
  const off = pairOffset(meadow, battle, 4 + 3 * bar + 0.25);
  assert.ok(Math.abs(off - (battle.loopStart + 0.25)) < 1e-9);
  assert.equal(pairOffset(meadow, village, 30), 0);
  assert.ok(pairOffset(meadow, battle, 1) >= battle.loopStart);
});

test('loop validation catches the bad cases', () => {
  assert.deepEqual(validateLoop(T('ok')), []);
  assert.match(validateLoop(T('a', { loopEnd: 3 })).join(), /after loopStart/);
  assert.match(validateLoop(T('b', { loopEnd: 130 })).join(), /past the end/);
  assert.match(validateLoop(T('c', { loopStart: -1 })).join(), /< 0/);
  assert.match(validateLoop(T('d', { loopStart: 4, loopEnd: 6 })).join(), /shorter/);
  assert.match(validateLoop(T('e', { loopStart: undefined })).join(), /missing/);
  assert.deepEqual(validateLoop(FIXTURE.tracks[5]), [], 'stingers need no loop');
});

test('manifest validation: ids, files, credit, pairs', () => {
  assert.deepEqual(validateManifest(FIXTURE), []);
  assert.deepEqual(validateManifest({ tracks: [] }), ['manifest has no tracks']);
  const bad = { tracks: [T('x', { credit: { model: 'm' }, pair: 'y' }), T('x', { file: '' })] };
  const errs = validateManifest(bad).join('\n');
  assert.match(errs, /incomplete credit/);
  assert.match(errs, /duplicate id/);
  assert.match(errs, /no file/);
  assert.match(errs, /pair y not found/);
  assert.match(validateManifest(FIXTURE, () => false).join(), /is missing/);
});

/* ------------------------------------------------------------------ choosing */

test('select by id, else by tag, avoiding the current track', () => {
  assert.equal(selectTrack(FIXTURE, 'boss').id, 'boss');
  assert.equal(selectTrack(FIXTURE, 'victory').id, 'victory', 'stingers by id');
  assert.equal(selectTrack(FIXTURE, 'nature', { rnd: first }).id, 'meadow');
  assert.equal(selectTrack(FIXTURE, 'calm', { current: 'meadow', rnd: first }).id, 'village');
  assert.equal(selectTrack(FIXTURE, 'stinger'), null, 'tags only pick beds');
  assert.equal(selectTrack(FIXTURE, 'nope'), null);
});

test('mood → track: the game map first, then the pair, then any of that mood', () => {
  assert.equal(trackForMood(FIXTURE, 'battle', { current: 'meadow' }).id, 'battle', 'pair');
  assert.equal(trackForMood(FIXTURE, 'calm', { current: 'battle' }).id, 'meadow', 'pair back');
  assert.equal(trackForMood(FIXTURE, 'boss', { current: 'fortress' }).id, 'boss');
  assert.equal(trackForMood(FIXTURE, 'tense', { current: 'village', rnd: first }).id, 'fortress');
  assert.equal(trackForMood(FIXTURE, 'calm', { current: 'battle', moods: { calm: 'village' } }).id, 'village', 'game map wins');
  assert.equal(trackForMood(FIXTURE, 'calm', { current: 'village' }).id, 'village', 'already right: stay');
  const noBoss = { tracks: FIXTURE.tracks.filter((t) => t.id !== 'boss') };
  assert.equal(trackForMood(noBoss, 'boss', { rnd: first }).id, 'battle', 'boss falls back to battle');
});

/* ------------------------------------------------------------------ credits */

test('credits: one entry per model, with the tracks a game uses', () => {
  const c = musicCredits(['meadow', 'battle'], FIXTURE);
  assert.equal(c.length, 1);
  assert.equal(c[0].name, 'ACE-Step 1.5');
  assert.equal(c[0].licence, 'MIT');
  assert.match(c[0].site, /^https:\/\//);
  assert.match(c[0].licenceUrl, /LICENSE/);
  assert.deepEqual(c[0].items.map((i) => i.id), ['meadow', 'battle']);
  assert.match(c[0].text, /ACE-Step 1\.5.*MIT/);
  assert.equal(musicCredits(null, null)[0].name, 'ACE-Step 1.5', 'works before the manifest loads');
  assert.equal(toastText(FIXTURE.tracks[0]), '♪ meadow · Music: ACE-Step 1.5 (MIT)');
});

/* ------------------------------------------------------------------ settings */

test('settings: saved, clamped, and never throwing', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadSettings(storage), { ...DEFAULT_SETTINGS, seen: [] });
  saveSettings({ volume: 3, muted: true, toast: 'off', seen: ['a'] }, storage);
  assert.ok(mem.has(SETTINGS_KEY));
  assert.deepEqual(loadSettings(storage), { volume: 1, muted: true, toast: 'off', seen: ['a'] });
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadSettings(broken).volume, DEFAULT_SETTINGS.volume);
  assert.equal(saveSettings({}, broken), false);
  mem.set(SETTINGS_KEY, '{not json');
  assert.equal(loadSettings(storage).muted, false);
});

test('the credit toast shows the first time each track plays (by default)', () => {
  const s = { ...DEFAULT_SETTINGS, seen: ['meadow'] };
  assert.equal(shouldToast(s, 'battle'), true);
  assert.equal(shouldToast(s, 'meadow'), false);
  assert.equal(shouldToast({ ...s, toast: 'always' }, 'meadow'), true);
  assert.equal(shouldToast({ ...s, toast: 'off' }, 'battle'), false);
});

/* ------------------------------------------------------------------ the real soundtrack */

test('the shipped manifest is valid: every file exists and every track is credited', { skip: !existsSync(path.join(BGM, 'manifest.json')) }, () => {
  const m = JSON.parse(readFileSync(path.join(BGM, 'manifest.json'), 'utf8'));
  assert.deepEqual(validateManifest(m, (f) => existsSync(path.join(BGM, f))), []);
  for (const t of m.tracks) {
    assert.ok(t.credit.text.includes(t.credit.model) && t.credit.text.includes(t.credit.licence), t.id);
    if (t.kind === 'stinger') assert.ok(t.duration >= 2 && t.duration <= 9, `${t.id} stinger length`);
    else assert.ok(t.duration >= 80 && t.duration <= 200, `${t.id} length ${t.duration}`);
  }
  for (const mood of ['calm', 'tense', 'battle', 'boss']) assert.ok(trackForMood(m, mood), `a track for ${mood}`);
  const bytes = m.tracks.reduce((n, t) => n + t.bytes, 0);
  assert.ok(bytes < 26e6, `soundtrack ${(bytes / 1e6).toFixed(1)} MB`);
});
