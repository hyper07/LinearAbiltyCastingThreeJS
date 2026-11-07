import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * The game database: who the players are, what they own, and everything
 * that ever happened to it. SQLite (Node's built-in `node:sqlite`, WAL) on
 * one server; the tables are plain SQL, so PostgreSQL can take over when
 * many servers share it.
 *
 *   accounts    name, scrypt password hash, block state
 *   sessions    SHA-256 of each session token (never the token), expiry, address tag
 *   characters  the character (bag, stash, gear, gold, XP, spells) — AES-256-GCM
 *               encrypted and sealed to its account; a version per change
 *   items       every item that exists, once: who holds it, or that it lies on
 *               the floor of a run, or that it was sold or used up. `uid` is the
 *               primary key — an item cannot exist twice
 *   ledger      every change of gold, with the reason and the balance after
 *   events      the history: logins, items in and out, gold, levels, strikes,
 *               blocks — each row HMAC-chained to the row before
 *   strikes     rule breaks, with their weight; enough of them block the account
 */
export class GameDB {
  constructor(sqlite, file) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new sqlite.DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        pass_hash TEXT NOT NULL,
        created INTEGER NOT NULL,
        created_ip_tag TEXT,
        created_ip_enc TEXT,
        failed_logins INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0,
        blocked_until INTEGER NOT NULL DEFAULT 0,
        block_reason TEXT,
        blocks INTEGER NOT NULL DEFAULT 0,
        last_login INTEGER
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created INTEGER NOT NULL,
        expires INTEGER NOT NULL,
        ip_tag TEXT,
        ip_enc TEXT,
        agent TEXT
      );
      CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
      CREATE TABLE IF NOT EXISTS characters (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        uid TEXT PRIMARY KEY,
        owner INTEGER REFERENCES accounts(id),
        state TEXT NOT NULL CHECK (state IN ('held', 'floor', 'sold', 'used', 'destroyed')),
        run TEXT,
        source TEXT NOT NULL,
        data TEXT NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS items_owner ON items(owner, state);
      CREATE INDEX IF NOT EXISTS items_run ON items(run, state);
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        delta INTEGER NOT NULL,
        balance INTEGER NOT NULL,
        reason TEXT NOT NULL,
        ref TEXT,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ledger_account ON ledger(account_id, id);
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at INTEGER NOT NULL,
        account_id INTEGER,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_account ON events(account_id, id);
      CREATE TABLE IF NOT EXISTS strikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        rule TEXT NOT NULL,
        weight REAL NOT NULL,
        detail TEXT,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS strikes_account ON strikes(account_id, at);
      CREATE TABLE IF NOT EXISTS ip_blocks (
        ip_tag TEXT PRIMARY KEY,
        until INTEGER NOT NULL,
        reason TEXT
      );
    `);
    this._stmts = new Map();
  }

  static async open(file) {
    const sqlite = await import('node:sqlite');
    return new GameDB(sqlite, file);
  }

  /** A cached prepared statement. */
  q(sql) {
    let stmt = this._stmts.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this._stmts.set(sql, stmt);
    }
    return stmt;
  }

  /** Run `fn` in one transaction: all of it lands, or none of it. */
  tx(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        /* already rolled back */
      }
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

/** The history: append-only, every row chained to the one before by an HMAC. */
export class History {
  /** @param {GameDB} db @param {import('./keys.js').Keys} keys */
  constructor(db, keys) {
    this.db = db;
    this.keys = keys;
  }

  get last() {
    return this.db.q('SELECT id, hash FROM events ORDER BY id DESC LIMIT 1').get() ?? { id: 0, hash: 'genesis' };
  }

  /** Append an event (inside the caller's transaction, when there is one). */
  add(accountId, type, data = {}, at = Date.now()) {
    const prev = this.last;
    const id = prev.id + 1;
    const text = JSON.stringify(data);
    const hash = this.keys.chainHash(prev.hash, [id, at, accountId ?? null, type, text]);
    this.db.q('INSERT INTO events (id, at, account_id, type, data, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, at, accountId ?? null, type, text, prev.hash, hash);
    return id;
  }

  /** One account's history, newest first. */
  of(accountId, limit = 50, before = null) {
    const rows = before
      ? this.db.q('SELECT id, at, type, data FROM events WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT ?').all(accountId, before, limit)
      : this.db.q('SELECT id, at, type, data FROM events WHERE account_id = ? ORDER BY id DESC LIMIT ?').all(accountId, limit);
    return rows.map((r) => ({ id: r.id, at: r.at, type: r.type, data: JSON.parse(r.data) }));
  }

  /**
   * Walk the whole chain. Any edited, deleted or inserted row shows up as
   * the first id where the chain no longer matches.
   * @returns {{ ok: boolean, count: number, brokenAt?: number }}
   */
  verify() {
    let prevHash = 'genesis';
    let expectedId = 1;
    let count = 0;
    for (const row of this.db.db.prepare('SELECT id, at, account_id, type, data, prev_hash, hash FROM events ORDER BY id').iterate()) {
      if (row.id !== expectedId || row.prev_hash !== prevHash) return { ok: false, count, brokenAt: row.id };
      const hash = this.keys.chainHash(prevHash, [row.id, row.at, row.account_id ?? null, row.type, row.data]);
      if (hash !== row.hash) return { ok: false, count, brokenAt: row.id };
      prevHash = row.hash;
      expectedId += 1;
      count += 1;
    }
    return { ok: true, count };
  }
}
