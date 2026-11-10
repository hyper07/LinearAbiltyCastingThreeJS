/**
 * The game's storage: PostgreSQL through server/db/database.js (a server when
 * DATABASE_URL is set, PGlite in DATA_DIR/postgres otherwise). The tables are
 * in server/db/migrations.js.
 *
 * This file keeps the one piece with rules of its own: the history.
 */

/** The history: append-only, every row chained to the one before by an HMAC. */
export class History {
  /** @param {import('../db/database.js').Database} db @param {import('./keys.js').Keys} keys */
  constructor(db, keys) {
    this.db = db;
    this.keys = keys;
  }

  async last() {
    return (await this.db.one('SELECT id, hash FROM events ORDER BY id DESC LIMIT 1')) ?? { id: 0, hash: 'genesis' };
  }

  /**
   * Append an event (inside the caller's transaction, when there is one). The
   * game server adds events one request at a time (Database#serial), so the
   * chain never forks; a second writer racing for the same id fails on the key.
   */
  async add(accountId, type, data = {}, at = Date.now()) {
    const prev = await this.last();
    const id = prev.id + 1;
    const text = JSON.stringify(data);
    const hash = this.keys.chainHash(prev.hash, [id, at, accountId ?? null, type, text]);
    await this.db.run('INSERT INTO events (id, at, account_id, type, data, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, at, accountId ?? null, type, text, prev.hash, hash]);
    return id;
  }

  /** One account's history, newest first. */
  async of(accountId, limit = 50, before = null) {
    const rows = before
      ? await this.db.many('SELECT id, at, type, data FROM events WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT ?', [accountId, before, limit])
      : await this.db.many('SELECT id, at, type, data FROM events WHERE account_id = ? ORDER BY id DESC LIMIT ?', [accountId, limit]);
    return rows.map((r) => ({ id: r.id, at: r.at, type: r.type, data: JSON.parse(r.data) }));
  }

  /**
   * Walk the whole chain, a page at a time. Any edited, deleted or inserted
   * row shows up as the first id where the chain no longer matches.
   * @returns {Promise<{ ok: boolean, count: number, brokenAt?: number }>}
   */
  async verify({ page = 5000 } = {}) {
    let prevHash = 'genesis';
    let expectedId = 1;
    let count = 0;
    for (;;) {
      const rows = await this.db.many('SELECT id, at, account_id, type, data, prev_hash, hash FROM events WHERE id >= ? ORDER BY id LIMIT ?', [expectedId, page]);
      if (!rows.length) break;
      for (const row of rows) {
        if (row.id !== expectedId || row.prev_hash !== prevHash) return { ok: false, count, brokenAt: row.id };
        const hash = this.keys.chainHash(prevHash, [row.id, row.at, row.account_id ?? null, row.type, row.data]);
        if (hash !== row.hash) return { ok: false, count, brokenAt: row.id };
        prevHash = row.hash;
        expectedId += 1;
        count += 1;
      }
    }
    // Rows below id 1 (or any the pages skipped) show up as a count that does not match.
    const total = (await this.db.one('SELECT COUNT(*) AS n FROM events')).n;
    if (total !== count) return { ok: false, count, brokenAt: expectedId };
    return { ok: true, count };
  }
}
