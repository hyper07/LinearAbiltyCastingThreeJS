import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { LibraryStore, libraryHandler } from '../../server/libraryStore.js';
import { testDatabase } from './db.mjs';

const skill = (id, name, extra = {}) => ({
  id: `skill:${id}`,
  kind: 'skill',
  name,
  summary: `${name} does things`,
  author: 'Gamory',
  data: { id },
  fingerprint: { cat: { base: 'ice', cast: 'line', status: 'chill' }, num: { damage: 30, cooldown: 4 }, text: ['frost', 'lance'] },
  ...extra
});

test('the store: official seed, player saves, statuses, similar', async () => {
  const db = await testDatabase();
  try {
    const lib = await LibraryStore.open({ db });
    assert.equal(await lib.seed([skill('ice', 'Frost Lance'), skill('glacier', 'Glacier Crown')]), 2);
    assert.equal((await lib.counts()).byStatus.official, 2);

    const mine = await lib.upsert(skill('mine', 'Frost Spear', { author: 'Kim', status: 'shared' }));
    assert.equal(mine.status, 'shared');
    assert.deepEqual(mine.data, { id: 'mine' }, 'JSONB comes back as an object');
    await assert.rejects(lib.upsert(skill('ice', 'Hijack')), /official/);
    await assert.rejects(lib.setStatus('skill:ice', 'hidden'), /official/);
    await assert.rejects(lib.remove('skill:ice'), /official/);
    await assert.rejects(lib.upsert({ id: 'bad id', kind: 'skill' }), /bad asset id/);
    await assert.rejects(lib.upsert({ id: 'thing:x', kind: 'thing' }), /bad kind/);

    assert.equal((await lib.setStatus('skill:mine', 'hidden')).status, 'hidden');
    assert.equal((await lib.list({ kind: 'skill' })).length, 2);
    assert.equal((await lib.list({ kind: 'skill', status: 'hidden' })).length, 1);
    await lib.setStatus('skill:mine', 'shared');
    assert.equal((await lib.use('skill:mine')).uses, 1);
    // Search: any case, and % or _ in the words are just characters.
    assert.equal((await lib.list({ q: 'FROST SP' })).length, 1);
    assert.equal((await lib.list({ q: '100%' })).length, 0);

    const near = await lib.similar({ kind: 'skill', fingerprint: skill('q', 'Frost Lance').fingerprint, exclude: ['skill:ice'], min: 0.3 });
    assert.ok(near.length >= 1);
    assert.ok(near.every((n) => n.id !== 'skill:ice'));
    assert.ok(near[0].score > 0.5);
    assert.deepEqual(await lib.similar({ kind: 'nope', fingerprint: {} }), []);

    assert.equal(await lib.remove('skill:mine'), true);
    assert.equal(await lib.remove('skill:mine'), false);
  } finally {
    await db.close();
  }
});

test('the routes, with the write limit', async () => {
  const db = await testDatabase();
  const lib = new LibraryStore(db);
  const handler = libraryHandler(async () => lib);
  const server = http.createServer((req, res) => handler(req, res).then((h) => h || res.end('no')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, method = 'GET', body = null) => {
    const res = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    assert.equal((await call('/api/library/seed', 'POST', { assets: [skill('ice', 'Frost Lance')] })).body.seeded, 1);
    const list = await call('/api/library?kind=skill');
    assert.equal(list.body.assets.length, 1);
    assert.equal(list.body.counts.byStatus.official, 1);
    const saved = await call('/api/library', 'POST', skill('mine', 'Frost Spear', { status: 'shared' }));
    assert.equal(saved.body.asset.status, 'shared');
    assert.ok(Array.isArray(saved.body.similar));
    assert.equal((await call('/api/library/skill:mine')).body.asset.name, 'Frost Spear');
    assert.equal((await call('/api/library/skill:none')).status, 404);
    assert.equal((await call('/api/library/skill:mine/use', 'POST')).body.asset.uses, 1);
    assert.equal((await call('/api/library/skill:mine', 'PATCH', { status: 'draft' })).body.asset.status, 'draft');
    assert.equal((await call('/api/library/skill:ice', 'DELETE')).status, 400);
    assert.equal((await call('/api/library/skill:mine', 'DELETE')).body.deleted, true);
    // The write limit: a burst beyond it is refused, reads still work.
    let refused = 0;
    for (let i = 0; i < 80; i++) if ((await call('/api/library/skill:ice/use', 'POST')).status === 429) refused++;
    assert.ok(refused > 0);
    assert.equal((await call('/api/library?kind=skill')).status, 200);
  } finally {
    server.close();
    await db.close();
  }
});
