import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { JsonFileStore, fileApi } from '../../server/api/files.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'gamory-files-'));
  const builtIn = join(root, 'dist', 'levels');
  await mkdir(builtIn, { recursive: true });
  await writeFile(join(builtIn, 'index.json'), JSON.stringify({ campaign: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }] }));
  await writeFile(join(builtIn, 'one.json'), JSON.stringify({ id: 'one', name: 'One' }));
  await writeFile(join(builtIn, 'two.json'), JSON.stringify({ id: 'two', name: 'Two' }));
  return { root, builtIn, user: join(root, 'data', 'levels') };
}

test('production: built-in levels are read-only, saves go to the data folder, the index merges', async () => {
  const f = await fixture();
  try {
    const store = new JsonFileStore({ builtInDir: f.builtIn, userDir: f.user, indexKey: 'campaign', label: 'level' });
    assert.deepEqual((await store.index()).campaign.map((e) => e.id), ['one', 'two']);
    assert.equal((await store.index()).campaign[0].official, true);

    await store.write('mine', { id: 'mine', name: 'Mine' }, 'Mine');
    assert.deepEqual((await store.index()).campaign.map((e) => e.id), ['one', 'two', 'mine']);
    assert.equal(JSON.parse(await store.readText('mine')).name, 'Mine');
    assert.equal(JSON.parse(await readFile(join(f.user, 'mine.json'), 'utf8')).id, 'mine');

    await assert.rejects(() => store.write('one', { id: 'one' }, 'One'), /comes with the game/);
    await assert.rejects(() => store.remove('two'), /cannot be deleted/);
    await assert.rejects(() => store.write('../evil', {}, 'x'), /bad level id/);

    await store.reorder(['mine', 'two', 'one']);
    assert.deepEqual((await store.index()).campaign.map((e) => e.id), ['mine', 'two', 'one']);
    await store.remove('mine');
    assert.deepEqual((await store.index()).campaign.map((e) => e.id), ['two', 'one']);
    assert.equal(await store.readText('mine'), null);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('development: one folder, and the built-in set is editable', async () => {
  const f = await fixture();
  try {
    const store = new JsonFileStore({ builtInDir: f.builtIn, userDir: f.builtIn, indexKey: 'campaign', label: 'level' });
    await store.write('one', { id: 'one', name: 'One again' }, 'One again');
    assert.equal((await store.index()).campaign[0].name, 'One again');
    await store.reorder(['two', 'one']);
    assert.deepEqual((await store.index()).campaign.map((e) => e.id), ['two', 'one']);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('the HTTP routes', async () => {
  const f = await fixture();
  const store = new JsonFileStore({ builtInDir: f.builtIn, userDir: f.user, indexKey: 'campaign', label: 'level' });
  const handler = fileApi(store, { files: 'levels', ordered: true });
  const server = http.createServer((req, res) => {
    handler(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end('static');
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, init) => {
    const res = await fetch(base + path, init);
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    assert.deepEqual((await call('/levels/index.json')).body.campaign.map((e) => e.id), ['one', 'two']);
    assert.equal((await call('/levels/one.json')).body.name, 'One');
    assert.equal((await call('/levels/nope.json')).status, 404);
    assert.equal((await call('/somewhere-else')).status, 404);
    const saved = await call('/api/levels/fresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'fresh', name: 'Fresh' }) });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.campaign.map((e) => e.id), ['one', 'two', 'fresh']);
    assert.equal((await call('/api/levels/fresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'other' }) })).status, 400);
    assert.equal((await call('/api/levels/one', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'one' }) })).status, 400);
    assert.deepEqual((await call('/api/levels-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: ['fresh', 'one'] }) })).body.campaign.map((e) => e.id), ['fresh', 'one', 'two']);
    assert.equal((await call('/api/levels/fresh', { method: 'DELETE' })).status, 200);
    assert.equal((await call('/levels/fresh.json')).status, 404);
  } finally {
    server.close();
    await rm(f.root, { recursive: true, force: true });
  }
});
