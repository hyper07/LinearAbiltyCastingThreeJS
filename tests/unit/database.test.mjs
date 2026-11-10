import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { numbered } from '../../server/db/database.js';
import { importSqlite } from '../../server/db/importSqlite.js';
import { History } from '../../server/game/db.js';
import { Keys } from '../../server/game/keys.js';
import { createGameServices } from '../../server/game/index.js';
import { testDatabase } from './db.mjs';

test('placeholders: ? becomes $n, but not inside quotes', () => {
  assert.equal(numbered('SELECT * FROM t WHERE a = ? AND b = ?'), 'SELECT * FROM t WHERE a = $1 AND b = $2');
  assert.equal(numbered("SELECT '?' AS q, \"x?\" FROM t WHERE a = ?"), "SELECT '?' AS q, \"x?\" FROM t WHERE a = $1");
  assert.equal(numbered("SELECT 'it''s ?' WHERE a = ?"), "SELECT 'it''s ?' WHERE a = $1");
  assert.equal(numbered('SELECT $1'), 'SELECT $1');
});

test('transactions: all or nothing, nested calls join; serial runs one at a time', async () => {
  const db = await testDatabase();
  try {
    await db.exec('CREATE TABLE t (id INT PRIMARY KEY, v JSONB)');
    await assert.rejects(
      db.tx(async () => {
        await db.run('INSERT INTO t VALUES (?, ?)', [1, { a: 1 }]);
        await db.tx(() => db.run('INSERT INTO t VALUES (?, ?)', [2, { b: 2 }]));
        throw new Error('boom');
      }),
      /boom/
    );
    assert.equal((await db.one('SELECT COUNT(*) AS n FROM t')).n, 0, 'the inner insert rolled back with the outer');
    await db.tx(() => db.run('INSERT INTO t VALUES (?, ?)', [1, { a: [1, 2] }]));
    assert.deepEqual((await db.one('SELECT v FROM t')).v, { a: [1, 2] }, 'JSONB in and out as objects');

    // serial: strictly in order, even when the first is the slowest; re-entrant.
    const order = [];
    const slow = db.serial(async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push('first');
      await db.serial(async () => order.push('inner'));
    });
    const fast = db.serial(async () => order.push('second'));
    const failing = db.serial(async () => {
      throw new Error('nope');
    });
    const after = db.serial(async () => order.push('after a failure'));
    await Promise.all([slow, fast, failing.catch(() => {}), after]);
    assert.deepEqual(order, ['first', 'inner', 'second', 'after a failure']);
  } finally {
    await db.close();
  }
});

test('two players taking the same item at the very same moment: exactly one gets it', async () => {
  const db = await testDatabase();
  const dir = await mkdtemp(join(tmpdir(), 'gamory-race-'));
  const game = await createGameServices({ dataDir: dir, db, env: { SERVER_SECRET: randomBytes(48).toString('base64') } });
  try {
    const a = (await game.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const b = (await game.accounts.register({ name: 'Bob', password: 'barbarian-99' })).account.id;
    const { authority } = game;
    authority.sameParty = () => true;
    const { runId } = await authority.startRun(a, {});
    await authority.joinRun(b, { runId });
    let drops = [];
    for (let i = 0; !drops.length && i < 400; i++) drops = (await authority.kill(a, { runId, monster: `m${i}`, kind: 'brute', wave: 1 })).drops;
    const uid = drops[0].uid;
    // Not through the request queue: straight at the database, both at once.
    const results = await Promise.allSettled([authority.take(a, { runId, uid }), authority.take(b, { runId, uid })]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, JSON.stringify(results.map((r) => r.reason?.message ?? 'ok')));
    assert.match(results.find((r) => r.status === 'rejected').reason.message, /Someone else got there first/);
  } finally {
    await game.close();
    await rm(dir, { recursive: true, force: true });
  }
});

/** An old server's data folder: game.sqlite and library.sqlite as the SQLite version made them. */
async function oldSqliteServer(dir, keys) {
  const { DatabaseSync } = await import('node:sqlite');
  const game = new DatabaseSync(join(dir, 'game.sqlite'));
  game.exec(`
    CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL,
      created INTEGER NOT NULL, created_ip_tag TEXT, created_ip_enc TEXT, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
      blocked_until INTEGER NOT NULL DEFAULT 0, block_reason TEXT, blocks INTEGER NOT NULL DEFAULT 0, last_login INTEGER);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, ip_tag TEXT, ip_enc TEXT, agent TEXT);
    CREATE TABLE characters (account_id INTEGER PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE items (uid TEXT PRIMARY KEY, owner INTEGER, state TEXT NOT NULL, run TEXT, source TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, delta INTEGER NOT NULL, balance INTEGER NOT NULL, reason TEXT NOT NULL, ref TEXT, at INTEGER NOT NULL);
    CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, account_id INTEGER, type TEXT NOT NULL, data TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE strikes (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, rule TEXT NOT NULL, weight REAL NOT NULL, detail TEXT, at INTEGER NOT NULL);
    CREATE TABLE ip_blocks (ip_tag TEXT PRIMARY KEY, until INTEGER NOT NULL, reason TEXT);
  `);
  // Account ids with a gap (4 was deleted long ago): the import must keep 7 as 7.
  for (const id of [1, 2, 3, 7]) game.prepare('INSERT INTO accounts (id, name, name_key, pass_hash, created) VALUES (?, ?, ?, ?, ?)').run(id, `P${id}`, `p${id}`, 'scrypt$x', 1000 + id);
  game.prepare('INSERT INTO characters VALUES (?, ?, ?, ?)').run(7, keys.seal({ gold: 42 }, 'character:7'), 3, 5);
  game.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('i_1', 7, 'held', null, 'kill:grunt', JSON.stringify({ uid: 'i_1', name: 'Hood' }), 1, 1);
  game.prepare('INSERT INTO ledger (account_id, delta, balance, reason, at) VALUES (?, ?, ?, ?, ?)').run(7, 42, 42, 'kill', 9);
  game.prepare('INSERT INTO strikes (account_id, rule, weight, detail, at) VALUES (?, ?, ?, ?, ?)').run(2, 'kill-rate', 1.5, 'x', 9);
  // A real chain, written the way the old server wrote it.
  let prev = 'genesis';
  for (let id = 1; id <= 5; id++) {
    const text = JSON.stringify({ n: id, note: 'quotes " and unicode ✓' });
    const hash = keys.chainHash(prev, [id, 100 + id, 7, 'take', text]);
    game.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, 100 + id, 7, 'take', text, prev, hash);
    prev = hash;
  }
  game.close();
  const library = new DatabaseSync(join(dir, 'library.sqlite'));
  library.exec(`CREATE TABLE assets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', author TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, fingerprint TEXT NOT NULL DEFAULT '{}', parent TEXT, uses INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL, updated INTEGER NOT NULL)`);
  library.prepare('INSERT INTO assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('skill:ice', 'skill', 'Frost Lance', '', 'Gamory', 'official', 1, '{"id":"ice"}', '{"cat":{"base":"ice"}}', null, 4, 1, 2);
  library.close();
}

test('the old SQLite data comes across once: same ids, intact chain, sealed characters still open', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-import-'));
  const keys = new Keys(randomBytes(48));
  const db = await testDatabase();
  try {
    await oldSqliteServer(dir, keys);
    const result = await importSqlite({ db, dataDir: dir, keys });
    assert.equal(result.imported, true);
    assert.deepEqual(result.counts, { accounts: 4, sessions: 0, characters: 1, items: 1, ledger: 1, events: 5, strikes: 1, ip_blocks: 0, assets: 1 });

    assert.deepEqual((await db.many('SELECT id FROM accounts ORDER BY id')).map((r) => r.id), [1, 2, 3, 7], 'ids kept, gap and all');
    assert.equal((await db.one("SELECT plan FROM accounts WHERE id = 7")).plan, 'free', 'old accounts start on Free');
    assert.deepEqual(keys.open((await db.one('SELECT state FROM characters WHERE account_id = 7')).state, 'character:7'), { gold: 42 }, 'the sealed character still opens');
    assert.deepEqual((await db.one("SELECT data FROM items WHERE uid = 'i_1'")).data, { uid: 'i_1', name: 'Hood' });
    assert.equal((await db.one('SELECT weight FROM strikes')).weight, 1.5);
    const asset = await db.one("SELECT featured, data, fingerprint FROM assets WHERE id = 'skill:ice'");
    assert.deepEqual(asset, { featured: true, data: { id: 'ice' }, fingerprint: { cat: { base: 'ice' } } });
    assert.deepEqual(await new History(db, keys).verify(), { ok: true, count: 5 });

    // New rows carry on after the imported ids.
    const next = await db.one("INSERT INTO accounts (name, name_key, pass_hash, created) VALUES ('New', 'new', 'x', 1) RETURNING id");
    assert.equal(next.id, 8);
    const history = new History(db, keys);
    await history.add(8, 'register', {});
    assert.equal((await history.verify()).ok, true, 'the chain continues from the imported one');

    // Once only, and never into a database that has data.
    assert.equal((await importSqlite({ db, dataDir: dir, keys })).reason, 'already imported');
    const other = await testDatabase();
    try {
      await other.run("INSERT INTO accounts (name, name_key, pass_hash, created) VALUES ('Here', 'here', 'x', 1)");
      assert.match((await importSqlite({ db: other, dataDir: dir, keys })).reason, /already has data/);
    } finally {
      await other.close();
    }
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('an import whose chain does not check out brings in nothing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-import-'));
  const keys = new Keys(randomBytes(48));
  const db = await testDatabase();
  try {
    await oldSqliteServer(dir, keys);
    const wrong = new Keys(randomBytes(48));
    await assert.rejects(importSqlite({ db, dataDir: dir, keys: wrong }), /history chain does not check out/);
    assert.equal((await db.one('SELECT COUNT(*) AS n FROM accounts')).n, 0, 'rolled back');
    assert.equal(await db.one("SELECT 1 FROM schema_migrations WHERE id = 'import-sqlite'"), null);
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
