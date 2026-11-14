import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATIONS } from './migrations.js';

/**
 * The one database everything persistent lives in: accounts and characters
 * (server/game), the shared library (server/libraryStore.js), and what comes
 * next. It is always PostgreSQL:
 *
 *   DATABASE_URL set    a PostgreSQL server (`pg`), for production and for many servers
 *   DATABASE_URL unset  PGlite: the same PostgreSQL, compiled to run inside this
 *                       process, saving to DATA_DIR/postgres. `npm run dev`, a
 *                       one-box server and the tests need nothing installed.
 *   memory: true        PGlite in memory (the tests)
 *
 * One SQL dialect either way. The API is small:
 *
 *   await db.one(sql, params)    first row or null
 *   await db.many(sql, params)   all rows
 *   await db.run(sql, params)    { rowCount, rows }
 *   await db.tx(async () => …)   one transaction; every query inside it (through
 *                                this same `db`, at any depth) runs in it
 *   await db.serial(async () => …)  one at a time, process-wide (see below)
 *
 * Placeholders are `?` (rewritten to `$1, $2…`) or `$n`. BIGINT and NUMERIC
 * come back as JavaScript numbers: every one here is a millisecond time, an
 * id or an amount well under 2^53.
 *
 * `serial`: the game's rules were written for SQLite, where nothing
 * interleaves — a request reads a character, checks it and writes it before
 * the next one starts. With an async driver two requests could interleave
 * between the read and the write, so the game server runs its requests
 * through `serial`, which keeps exactly that guarantee on one process. Row
 * updates that decide races (taking an item off the floor) are also written
 * as single conditional UPDATEs, so they stay safe across processes.
 */

const tx = new AsyncLocalStorage();
const inSerial = new AsyncLocalStorage();

/** `?` → `$1, $2…`, outside quoted strings and identifiers. Leaves SQL with `$n` alone. */
export function numbered(sql) {
  if (!sql.includes('?')) return sql;
  let out = '';
  let n = 0;
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      out += c;
      if (c === quote) {
        // A doubled quote ('it''s') stays inside the string.
        if (sql[i + 1] === quote) out += sql[++i];
        else quote = null;
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      out += c;
    } else if (c === '?') {
      out += `$${++n}`;
    } else {
      out += c;
    }
  }
  return out;
}

/** Values the drivers should not guess at: objects for JSONB go as JSON text. */
const param = (v) => (v === undefined ? null : v !== null && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v) ? JSON.stringify(v) : v);

export class Database {
  /** @param {{ kind: 'postgres'|'pglite', query, transaction, close }} driver */
  constructor(driver) {
    this.driver = driver;
    this.kind = driver.kind;
    this._queue = Promise.resolve();
  }

  /** The connection a query runs on: the open transaction's, or the driver's. */
  get _conn() {
    return tx.getStore() ?? this.driver;
  }

  async query(sql, params = []) {
    return this._conn.query(numbered(sql), params.map(param));
  }

  async one(sql, params = []) {
    return (await this.query(sql, params)).rows[0] ?? null;
  }

  async many(sql, params = []) {
    return (await this.query(sql, params)).rows;
  }

  async run(sql, params = []) {
    const result = await this.query(sql, params);
    return { rowCount: result.rowCount, rows: result.rows };
  }

  /** Several statements with no parameters (the schema). */
  async exec(sql) {
    return this._conn.exec(sql);
  }

  /** Run `fn` in one transaction: all of it lands, or none of it. Nested calls join the outer one. */
  async tx(fn) {
    if (tx.getStore()) return fn();
    return this.driver.transaction((conn) => tx.run(conn, fn));
  }

  /**
   * Run `fn` after every earlier `serial` call has finished (a process-wide
   * queue). Calling it again from inside just runs `fn`: it already holds the turn.
   */
  serial(fn) {
    if (inSerial.getStore()) return fn();
    const run = this._queue.then(() => inSerial.run(true, fn));
    this._queue = run.catch(() => {});
    return run;
  }

  /** Bring the schema up to date (each migration once, in order). */
  async migrate(log = () => {}) {
    await this.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, at BIGINT NOT NULL)');
    // Several servers starting at once: one migrates, the rest wait for it.
    if (this.kind === 'postgres') await this.query('SELECT pg_advisory_lock(7419)');
    try {
      const done = new Set((await this.many('SELECT id FROM schema_migrations')).map((r) => r.id));
      for (const m of MIGRATIONS) {
        if (done.has(m.id)) continue;
        await this.tx(async () => {
          await this.exec(m.sql);
          await this.run('INSERT INTO schema_migrations (id, at) VALUES (?, ?)', [m.id, Date.now()]);
        });
        log(`[db] migrated: ${m.id}`);
      }
    } finally {
      if (this.kind === 'postgres') await this.query('SELECT pg_advisory_unlock(7419)');
    }
  }

  async close() {
    await this.driver.close();
  }
}

/* ---------------------------------------------------------------------- */
/* drivers                                                                 */
/* ---------------------------------------------------------------------- */

const NUMBER = (v) => (v == null ? v : Number(v));

async function postgresDriver(url, { max = Number(process.env.DATABASE_POOL) || 10 } = {}) {
  const { default: pg } = await import('pg');
  const types = { getTypeParser: (oid, format) => (oid === 20 || oid === 1700 ? NUMBER : pg.types.getTypeParser(oid, format)) };
  const ssl = /[?&]sslmode=(require|verify)/.test(url) ? { rejectUnauthorized: !/sslmode=require/.test(url) } : undefined;
  const pool = new pg.Pool({ connectionString: url, max, types, ssl });
  const wrap = (client) => ({
    query: async (sql, params) => {
      const r = await client.query(sql, params);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    exec: (sql) => client.query(sql)
  });
  const base = wrap(pool);
  return {
    kind: 'postgres',
    ...base,
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}

async function pgliteDriver(dataDir) {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  // `new PGlite(undefined, options)` ignores the options: pass them alone for memory.
  const options = { parsers: { 20: NUMBER, 1700: NUMBER } };
  const db = dataDir ? new PGlite(dataDir, options) : new PGlite(options);
  await db.waitReady;
  const wrap = (conn) => ({
    query: async (sql, params) => {
      const r = await conn.query(sql, params);
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
    },
    exec: (sql) => conn.exec(sql)
  });
  return {
    kind: 'pglite',
    ...wrap(db),
    transaction: (fn) => db.transaction((t) => fn(wrap(t))),
    close: () => db.close()
  };
}

/** One open database per place, so the game and the library share it (PGlite allows one opener per folder). */
// Kept on the process, not the module: the dev server loads this file afresh
// each time its config changes, and a second PGlite opened on a folder that
// the first still holds corrupts it (two writers, one write-ahead log).
const opened = (globalThis[Symbol.for('gamory.databases')] ??= new Map());

/** The server's key, when there is one already (to check the history chain on import). */
async function existingKeys(dataDir) {
  if (!process.env.SERVER_SECRET && !existsSync(join(dataDir, 'server.key'))) return null;
  const { Keys, loadSecret } = await import('../game/keys.js');
  return new Keys(loadSecret(dataDir).secret);
}

/**
 * Open the database, bring its schema up to date, and — the first time, on an
 * empty database — bring in the old SQLite files from `dataDir` (importSqlite.js).
 * @param {{ url?: string, dataDir?: string, memory?: boolean, importOld?: boolean, log?: (line: string) => void }} [options]
 */
export function openDatabase({ url = process.env.DATABASE_URL, dataDir = process.env.DATA_DIR ?? 'data', memory = false, importOld = true, log = () => {} } = {}) {
  const key = memory ? null : url ? `url:${url}` : `dir:${dataDir}`;
  if (key && opened.has(key)) return opened.get(key);
  const ready = (async () => {
    const driver = url && !memory ? await postgresDriver(url) : await pgliteDriver(memory ? null : join(dataDir, 'postgres'));
    const db = new Database(driver);
    const close = db.close.bind(db);
    db.close = async () => {
      if (key) opened.delete(key);
      await close();
    };
    await db.migrate(log);
    if (!memory && importOld) {
      const { importSqlite, sqliteFiles } = await import('./importSqlite.js');
      const files = sqliteFiles(dataDir);
      db.imported = files.game || files.library ? await importSqlite({ db, dataDir, keys: await existingKeys(dataDir), log }) : { imported: false, reason: 'no SQLite files' };
    }
    return db;
  })();
  if (key) {
    opened.set(key, ready);
    ready.catch(() => opened.delete(key));
  }
  return ready;
}
