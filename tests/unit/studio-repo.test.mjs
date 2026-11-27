/**
 * Studio games as files and commits (server/studio/repo.js), in a throwaway git repository:
 * one commit per accepted change authored by the maker, nothing written outside the game's
 * data, invalid data refused, Undo as a new commit, versions readable by hash.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioRepo, authorOf } from '../../server/studio/repo.js';
import { studioParams } from '../../server/gameTemplates.js';
import { applyPatch, mapPatch, op } from '../../src/shared/studio/patch.js';

const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
const MIA = { id: 3, name: 'Mia' };

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'studio-repo-'));
  git(dir, ['init', '-q']);
  return { dir, files: studioRepo({ repo: dir, gamesDir: join(dir, 'games') }), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('authors name the account and nothing else', () => {
  assert.equal(authorOf({ id: 3, name: 'Mia <evil>\nX' }), 'Mia evilX <account-3@studio.gamory.invalid>');
  assert.equal(authorOf({ id: 'x', name: '' }), 'Studio maker <account-0@studio.gamory.invalid>');
});

test('a new game is one commit; each change is one more, by its maker, touching only games/<code>/', async () => {
  const { dir, files, done } = repo();
  try {
    assert.equal(files.available(), true);
    const made = await files.create({ title: 'Snow Day', params: studioParams({ render: 'full3d', genre: 'collect' }), owner: MIA });
    const code = made.manifest.code;
    assert.match(made.commit, /^[0-9a-f]{40}$/);
    const data = files.read(code);
    assert.equal(data.maps.maps.length, 1);
    const out = applyPatch(data, { summary: 'more', ops: [op('addMap', { map: mapPatch({ name: 'Frost Woods', biome: 'snow', features: ['frozen-lake'] }) })] });
    const hash = await files.write(code, out.data, out.files, { message: 'Studio: Added Frost Woods', account: MIA });
    assert.equal(files.read(code).maps.maps.length, 2);
    const shown = git(dir, ['show', '--name-only', '--format=%an|%ae|%s', hash]).stdout.trim().split('\n');
    assert.equal(shown[0], 'Mia|account-3@studio.gamory.invalid|Studio: Added Frost Woods');
    assert.deepEqual(shown.slice(1).filter(Boolean), [`games/${code}/data/maps.json`]);
    // Nothing changed: no commit.
    assert.equal(await files.write(code, out.data, out.files, { message: 'again', account: MIA }), null);
    // The history the chat and Changes & deploy show.
    const changes = files.changes(code);
    assert.equal(changes.length, 2);
    assert.equal(changes[0].author, 'Mia');
    assert.deepEqual(changes[0].files, ['data/maps.json']);
    // An old version, by hash.
    assert.equal(files.read(code, made.commit).maps.maps.length, 1);
  } finally {
    done();
  }
});

test('data that breaks the schema is never written', async () => {
  const { files, done } = repo();
  try {
    const made = await files.create({ title: 'Bad Day', params: studioParams({}), owner: MIA });
    const data = files.read(made.manifest.code);
    data.maps.maps[0].biome = 'the moon';
    await assert.rejects(() => files.write(made.manifest.code, data, ['maps'], { message: 'x', account: MIA }), (e) => e.status === 422);
    assert.equal(files.read(made.manifest.code).maps.maps[0].biome !== 'the moon', true);
  } finally {
    done();
  }
});

test('undo reverses one data change as a new commit; the game\'s creation cannot be undone here', async () => {
  const { dir, files, done } = repo();
  try {
    const made = await files.create({ title: 'Undo Day', params: studioParams({}), owner: MIA });
    const code = made.manifest.code;
    const out = applyPatch(files.read(code), { summary: 'x', ops: [op('setSfx', { target: 'coin', sound: 'zap' })] });
    const hash = await files.write(code, out.data, out.files, { message: 'Studio: zap', account: MIA });
    const undone = await files.undo(code, hash, MIA);
    assert.notEqual(undone.data.audio.sfx.coin, 'zap');
    assert.match(git(dir, ['log', '-1', '--format=%s']).stdout, /^Studio: undo/);
    await assert.rejects(() => files.undo(code, made.commit, MIA), /Only changes to this game's data/);
    await assert.rejects(() => files.undo(code, 'not-a-hash', MIA), (e) => e.status === 400);
  } finally {
    done();
  }
});

test('only the game\'s own folder: bad codes and linked folders are refused', async () => {
  const { dir, files, done } = repo();
  try {
    assert.throws(() => files.read('../../etc'), (e) => e.status === 400);
    assert.throws(() => files.read('g_../aaaaaa'), (e) => e.status === 400);
    const elsewhere = mkdtempSync(join(tmpdir(), 'studio-elsewhere-'));
    mkdirSync(join(dir, 'games'), { recursive: true });
    symlinkSync(elsewhere, join(dir, 'games', 'g_aaaaaaaaaa'));
    assert.throws(() => files.read('g_aaaaaaaaaa'), /link/);
    rmSync(elsewhere, { recursive: true, force: true });
  } finally {
    done();
  }
});

test('asking to be public lists the game in its manifest (one commit); going private unlists it', async () => {
  const { dir, files, done } = repo();
  try {
    const made = await files.create({ title: 'Public Day', params: studioParams({}), owner: MIA });
    const code = made.manifest.code;
    assert.ok(await files.setListed(code, true, MIA));
    assert.equal(JSON.parse(readFileSync(join(dir, 'games', code, 'game.json'), 'utf8')).studio.listed, true);
    assert.equal(await files.setListed(code, true, MIA), null, 'no change, no commit');
    await files.setListed(code, false, MIA);
    assert.equal(files.manifest(code).studio.listed, false);
  } finally {
    done();
  }
});

test('outside a git checkout the Studio reads but does not write', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-nogit-'));
  try {
    const files = studioRepo({ repo: dir, gamesDir: join(dir, 'games') });
    assert.equal(files.available(), false);
    await assert.rejects(async () => files.create({ title: 'X', params: {}, owner: MIA }), (e) => e.status === 503);
    const outside = studioRepo({ repo: dir, gamesDir: tmpdir() });
    assert.equal(outside.available(), false, 'a games folder outside the repository is never written');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
