import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { GamesStore, gamesHandler } from '../../server/gamesStore.js';
import { createGameServices } from '../../server/game/index.js';
import { compileGame } from '../../src/blueprints/index.js';
import { testDatabase } from './db.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;

/** The shipped level files, read-only, like the server's level store. */
const levelFiles = {
  sameDir: false,
  index: async () => ({ campaign: JSON.parse(await readFile(join(ROOT, 'public/levels/index.json'), 'utf8')).campaign.map((e) => ({ ...e, official: true })) }),
  readText: async (id) => readFile(join(ROOT, 'public/levels', `${id}.json`), 'utf8').catch(() => null)
};

test('games: official levels and published games on one list; publishing re-numbers the levels', async () => {
  const db = await testDatabase();
  try {
    const store = new GamesStore(db, levelFiles);
    const official = await store.list();
    assert.ok(official.length >= 6 && official.every((g) => g.official && g.author === 'Gamory'));
    const grove = official.find((g) => g.id === 'official:study-grove');
    assert.equal(grove.card.genre, 'calm-study');
    assert.equal(grove.card.study, true);

    const { spec, levels } = compileGame({ genre: 'quest', world: 'pirate-coast', name: 'Salt and Sails', chapters: 3 });
    const game = await store.publish({ title: 'Salt and Sails', levels, spec, author: 'Kim' });
    assert.match(game.id, /^g-salt-and-sails-[0-9a-f]{8}$/);
    assert.deepEqual(game.levels.map((l) => l.id), [1, 2, 3].map((n) => `${game.id}-${n}`), 'its own level ids');
    assert.equal(game.card.chapters, 3);
    assert.equal(game.card.genre, 'quest');
    assert.equal(game.card.world, 'pirate-coast');
    assert.equal(game.author, 'Kim');
    assert.deepEqual(game.spec.world, 'pirate-coast');
    // The same title twice is two games, not an overwrite.
    const again = await store.publish({ title: 'Salt and Sails', levels });
    assert.notEqual(again.id, game.id);

    // Search and filter cover both kinds.
    assert.ok((await store.list({ q: 'salt' })).every((g) => /salt/i.test(g.title)));
    assert.equal((await store.list({ q: 'study grove' }))[0]?.id, 'official:study-grove');
    assert.ok((await store.list({ genre: 'quest' })).some((g) => g.id === game.id));
    assert.ok(!(await store.list({ genre: 'survival' })).some((g) => g.id === game.id));

    // Plays: counted for both, and the most played first.
    await store.play(game.id);
    await store.play(game.id);
    await store.play('official:thistledown');
    const popular = await store.list({ sort: 'popular' });
    assert.equal(popular[0].id, game.id);
    assert.equal(popular.find((g) => g.id === 'official:thistledown').plays, 1);
    assert.equal(await store.play('g-nope-00000000'), null);
    assert.equal((await store.list({ sort: 'new' }))[0].id, again.id, 'newest first');

    // A level of a published game, by id (what the server's rules load).
    assert.equal((await store.level(`${game.id}-2`)).id, `${game.id}-2`);
    await assert.rejects(store.publish({ title: 'Empty', levels: [] }), /at least one level/);
  } finally {
    await db.close();
  }
});

test('games: only the account that published a game can remove it; the rules load its levels', async () => {
  const db = await testDatabase();
  const dir = await mkdtemp(join(tmpdir(), 'gamory-games-'));
  const services = await createGameServices({ dataDir: dir, db, env: { SERVER_SECRET: randomBytes(48).toString('base64') } });
  try {
    const { account } = await services.accounts.register({ name: 'Parent', password: 'family-game-1' });
    const other = (await services.accounts.register({ name: 'Stranger', password: 'not-yours-123' })).account;
    const store = new GamesStore(db, levelFiles);
    const { levels } = compileGame({ genre: 'study', world: 'farm-fields', name: 'Farm Sums' });
    const game = await store.publish({ title: 'Farm Sums', levels, author: 'ignored when signed in' }, account);
    assert.equal(game.author, 'Parent');
    assert.equal(game.owner, account.id);
    await assert.rejects(store.remove(game.id, other), /only the player who published/);
    await assert.rejects(store.remove(game.id, null), /only the player who published/);

    // A signed-in player's run in a published game: the server knows its tutor.
    const { runId, level } = await services.authority.startRun(account.id, { level: `${game.id}-1` });
    assert.equal(level, `${game.id}-1`);
    const tutor = levels[0].npcs.find((n) => n.role === 'tutor');
    const answer = await services.authority.npc(account.id, { runId, npc: tutor.id, action: 'study' });
    assert.equal(answer.gold, 10, 'the reward the game set, paid by the server');

    assert.equal(await store.remove(game.id, account), true);
    assert.equal(await store.get(game.id), null);
    assert.equal(await store.level(`${game.id}-1`), null, 'its levels go with it');
  } finally {
    await services.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('games: the routes', async () => {
  const db = await testDatabase();
  const store = new GamesStore(db, levelFiles);
  const handler = gamesHandler(async () => store);
  const server = http.createServer((req, res) => handler(req, res).then((h) => h || res.end('no')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, method = 'GET', body) => {
    const res = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const { levels } = compileGame({ genre: 'boss-hunt', world: 'frozen-north', name: 'Ice Crown' });
    const made = await call('/api/games', 'POST', { title: 'Ice Crown', levels });
    assert.equal(made.status, 200);
    const id = made.body.game.id;
    assert.ok((await call('/api/games?genre=boss-hunt')).body.games.some((g) => g.id === id));
    assert.equal((await call(`/api/games/${id}`)).body.game.levels.length, 1);
    assert.deepEqual((await call('/api/games/official:frost-hollow')).body.game.levels, ['frost-hollow']);
    assert.equal((await call(`/api/games/${id}/play`, 'POST')).status, 200);
    assert.equal((await call('/api/games/..%2F..%2Fetc', 'GET')).status, 404);
    assert.equal((await call('/api/games', 'POST', { title: 'Nothing', levels: [] })).status, 400);
    assert.equal((await call(`/api/games/${id}`, 'DELETE')).status, 403, 'nobody signed in owns it');
  } finally {
    server.close();
    await db.close();
  }
});
