import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Bring a server's old SQLite data (DATA_DIR/game.sqlite, DATA_DIR/library.sqlite)
 * into PostgreSQL, once.
 *
 * Every id is kept: a saved character is sealed to its account id, and the
 * history chain hashes each event's id and exact text — both must arrive
 * unchanged, and the import checks the chain on the way. It all lands in one
 * transaction, or none of it does. The SQLite files are left where they are
 * (nothing reads them again); delete them once you are happy.
 *
 * Runs on its own when a server starts on an empty database next to old
 * files (server.js, vite.config.js), and by hand: `npm run db:import`.
 */

const MARK = 'import-sqlite';

/** Tables in the order foreign keys need, and how each SQLite row becomes a PostgreSQL one. */
const GAME_TABLES = [
  ['accounts', ['id', 'name', 'name_key', 'pass_hash', 'created', 'created_ip_tag', 'created_ip_enc', 'failed_logins', 'locked_until', 'blocked_until', 'block_reason', 'blocks', 'last_login', 'plan']],
  ['sessions', ['token_hash', 'account_id', 'created', 'expires', 'ip_tag', 'ip_enc', 'agent']],
  ['characters', ['account_id', 'state', 'version', 'updated']],
  ['items', ['uid', 'owner', 'state', 'run', 'source', 'data', 'created', 'updated']],
  ['ledger', ['id', 'account_id', 'delta', 'balance', 'reason', 'ref', 'at']],
  ['events', ['id', 'at', 'account_id', 'type', 'data', 'prev_hash', 'hash']],
  ['strikes', ['id', 'account_id', 'rule', 'weight', 'detail', 'at']],
  ['ip_blocks', ['ip_tag', 'until', 'reason']]
];
const LIBRARY_COLUMNS = ['id', 'kind', 'name', 'summary', 'author', 'status', 'featured', 'data', 'fingerprint', 'parent', 'uses', 'created', 'updated'];
/** Identity columns to move past the imported ids. */
const IDENTITIES = ['accounts', 'ledger', 'strikes'];

const asNumber = (v) => (typeof v === 'bigint' ? Number(v) : v);

/** What is waiting to be imported in `dataDir`, without opening anything. */
export function sqliteFiles(dataDir) {
  const game = join(dataDir, 'game.sqlite');
  const library = join(dataDir, 'library.sqlite');
  return { game: existsSync(game) ? game : null, library: existsSync(library) ? library : null };
}

async function readSqlite(file) {
  const { DatabaseSync } = await import('node:sqlite');
  return new DatabaseSync(file, { readOnly: true });
}

function columnsOf(sqlite, table) {
  try {
    return new Set(sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  } catch {
    return new Set();
  }
}

/**
 * @param {{ db: import('./database.js').Database, dataDir: string, keys?: import('../game/keys.js').Keys,
 *           log?: (line: string) => void, force?: boolean }} options
 *        `keys`: the server's key, to check the history chain on the way in
 * @returns {Promise<{ imported: boolean, reason?: string, counts?: Record<string, number> }>}
 */
export async function importSqlite({ db, dataDir, keys = null, log = () => {} }) {
  const files = sqliteFiles(dataDir);
  if (!files.game && !files.library) return { imported: false, reason: 'no SQLite files' };
  if (await db.one('SELECT 1 FROM schema_migrations WHERE id = ?', [MARK])) return { imported: false, reason: 'already imported' };
  const existing = (await db.one('SELECT (SELECT COUNT(*) FROM accounts) + (SELECT COUNT(*) FROM events) + (SELECT COUNT(*) FROM assets) AS n')).n;
  if (existing > 0) return { imported: false, reason: 'the PostgreSQL database already has data — not mixing the two' };

  const counts = {};
  await db.tx(async () => {
    if (files.game) {
      const sqlite = await readSqlite(files.game);
      try {
        for (const [table, columns] of GAME_TABLES) {
          const have = columnsOf(sqlite, table);
          if (!have.size) continue;
          const cols = columns.filter((c) => have.has(c));
          const rows = sqlite.prepare(`SELECT ${cols.join(', ')} FROM ${table}`).all();
          for (const row of rows) {
            const values = cols.map((c) => {
              const v = asNumber(row[c]);
              // items.data was JSON text; PostgreSQL keeps it as JSONB.
              return table === 'items' && c === 'data' ? JSON.parse(v) : v;
            });
            await db.run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
          }
          counts[table] = rows.length;
        }
      } finally {
        sqlite.close();
      }
      for (const table of IDENTITIES) {
        await db.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
      }
    }
    if (files.library) {
      const sqlite = await readSqlite(files.library);
      try {
        const have = columnsOf(sqlite, 'assets');
        const cols = LIBRARY_COLUMNS.filter((c) => have.has(c));
        const rows = have.size ? sqlite.prepare(`SELECT ${cols.join(', ')} FROM assets`).all() : [];
        for (const row of rows) {
          const values = cols.map((c) => {
            const v = asNumber(row[c]);
            if (c === 'data' || c === 'fingerprint') return JSON.parse(v ?? '{}');
            if (c === 'featured') return Boolean(v);
            return v;
          });
          await db.run(`INSERT INTO assets (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
        }
        counts.assets = rows.length;
      } finally {
        sqlite.close();
      }
    }
    // The chain must still hold: the same ids, the same text, the same hashes.
    if (keys && counts.events) {
      const { History } = await import('../game/db.js');
      const chain = await new History(db, keys).verify();
      if (!chain.ok) throw new Error(`the history chain does not check out after import (event ${chain.brokenAt}) — nothing was imported`);
    }
    await db.run('INSERT INTO schema_migrations (id, at) VALUES (?, ?)', [MARK, Date.now()]);
  });
  log(`[db] imported the old SQLite data: ${Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ')}. The .sqlite files are no longer used; delete them when you are happy.`);
  return { imported: true, counts };
}
