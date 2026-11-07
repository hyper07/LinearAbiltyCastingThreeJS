/**
 * The shared content library — every class, skill, item, weapon and level
 * the game ships with (status `official`) and everything players make
 * (`draft` while it is theirs alone, `shared` once it is public, `hidden`
 * when pulled), in one table.
 *
 * SQLite through Node's built-in `node:sqlite`, in `<DATA_DIR>/library.sqlite`
 * (default `data/`), served under /api/library by the dev server and the
 * production server alike. The game only ever talks to the HTTP API
 * (src/library/Library.js), so a hosted database can replace `LibraryStore`
 * without touching the game: keep the same methods and routes.
 *
 * Similar-asset search runs here over every asset's fingerprint (see
 * src/library/similarity.js), so suggestions span the whole library, not
 * just what one player has loaded.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rankSimilar } from '../src/library/similarity.js';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from './api/http.js';

export const KINDS = ['class', 'skill', 'item', 'weapon', 'level'];
export const STATUSES = ['official', 'shared', 'draft', 'hidden'];
const ID = /^[a-z]+:[a-z0-9:_-]{1,96}$/;

export class LibraryStore {
  /**
   * @param {string} [file] the database file
   * @param {object} [sqlite] the `node:sqlite` module (opened lazily by `open` otherwise)
   */
  constructor(file = resolve(process.env.DATA_DIR ?? 'data', 'library.sqlite'), sqlite = null) {
    mkdirSync(dirname(file), { recursive: true });
    if (!sqlite) throw new Error('use LibraryStore.open()');
    this.db = new sqlite.DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        featured INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        fingerprint TEXT NOT NULL DEFAULT '{}',
        parent TEXT,
        uses INTEGER NOT NULL DEFAULT 0,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS assets_kind ON assets(kind, status);
    `);
  }

  /** Open (or create) the database. `node:sqlite` is loaded here, so a Node without it fails loudly, once. */
  static async open(file) {
    const sqlite = await import('node:sqlite');
    return new LibraryStore(file, sqlite);
  }

  _row(row, full = false) {
    if (!row) return null;
    const out = {
      id: row.id, kind: row.kind, name: row.name, summary: row.summary, author: row.author,
      status: row.status, featured: Boolean(row.featured), parent: row.parent, uses: row.uses,
      created: row.created, updated: row.updated
    };
    if (full) {
      out.data = JSON.parse(row.data);
      out.fingerprint = JSON.parse(row.fingerprint);
    }
    return out;
  }

  /** Assets, newest first; `q` matches name and summary. Hidden ones only when asked for. */
  list({ kind = null, status = null, q = null, limit = 200, full = false } = {}) {
    const where = [];
    const args = [];
    if (kind) {
      where.push('kind = ?');
      args.push(kind);
    }
    if (status) {
      where.push('status = ?');
      args.push(status);
    } else {
      where.push("status != 'hidden'");
    }
    if (q) {
      where.push('(name LIKE ? OR summary LIKE ?)');
      args.push(`%${q}%`, `%${q}%`);
    }
    const sql = `SELECT * FROM assets ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY featured DESC, CASE status WHEN 'official' THEN 1 ELSE 0 END, uses DESC, updated DESC LIMIT ?`;
    return this.db.prepare(sql).all(...args, Math.max(1, Math.min(500, Number(limit) || 200))).map((r) => this._row(r, full));
  }

  /** How many assets of each status (and kind), for the library's header. */
  counts() {
    const out = { total: 0, byStatus: {}, byKind: {} };
    for (const r of this.db.prepare("SELECT kind, status, COUNT(*) n FROM assets WHERE status != 'hidden' GROUP BY kind, status").all()) {
      out.total += r.n;
      out.byStatus[r.status] = (out.byStatus[r.status] ?? 0) + r.n;
      out.byKind[r.kind] = (out.byKind[r.kind] ?? 0) + r.n;
    }
    return out;
  }

  get(id) {
    return this._row(this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id), true);
  }

  /**
   * Create or update. Official assets can only come from the seed; a
   * player's save never overwrites one.
   */
  upsert(asset, { official = false } = {}) {
    if (!ID.test(asset.id ?? '')) throw new Error('bad asset id');
    if (!KINDS.includes(asset.kind)) throw new Error('bad kind');
    const status = official ? 'official' : STATUSES.includes(asset.status) && asset.status !== 'official' ? asset.status : 'draft';
    const now = Date.now();
    const existing = this.db.prepare('SELECT status, created, uses FROM assets WHERE id = ?').get(asset.id);
    if (existing?.status === 'official' && !official) throw new Error('official assets cannot be overwritten');
    this.db
      .prepare(
        `INSERT INTO assets (id, kind, name, summary, author, status, featured, data, fingerprint, parent, uses, created, updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, name = excluded.name, summary = excluded.summary,
           author = excluded.author, status = excluded.status, data = excluded.data, fingerprint = excluded.fingerprint,
           parent = excluded.parent, updated = excluded.updated`
      )
      .run(
        asset.id, asset.kind, String(asset.name ?? asset.id).slice(0, 120), String(asset.summary ?? '').slice(0, 600),
        String(asset.author ?? '').slice(0, 60), status, asset.featured ? 1 : 0, JSON.stringify(asset.data ?? {}),
        JSON.stringify(asset.fingerprint ?? {}), asset.parent ?? null, existing?.uses ?? 0, existing?.created ?? now, now
      );
    return this.get(asset.id);
  }

  /** Replace the official set in one go (the game's defaults, sent at start-up). */
  seed(assets) {
    this.db.exec('BEGIN');
    try {
      for (const a of assets) this.upsert(a, { official: true });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return assets.length;
  }

  setStatus(id, status) {
    if (!STATUSES.includes(status) || status === 'official') throw new Error('bad status');
    const row = this.db.prepare('SELECT status FROM assets WHERE id = ?').get(id);
    if (!row) throw new Error('no such asset');
    if (row.status === 'official') throw new Error('official assets keep their status');
    this.db.prepare('UPDATE assets SET status = ?, updated = ? WHERE id = ?').run(status, Date.now(), id);
    return this.get(id);
  }

  use(id) {
    this.db.prepare('UPDATE assets SET uses = uses + 1 WHERE id = ?').run(id);
    return this.get(id);
  }

  remove(id) {
    const row = this.db.prepare('SELECT status FROM assets WHERE id = ?').get(id);
    if (!row) return false;
    if (row.status === 'official') throw new Error('official assets cannot be deleted');
    this.db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    return true;
  }

  /** Assets like this fingerprint (official and shared, plus the asker's drafts), best first. */
  similar({ kind, fingerprint, exclude = [], limit = 5, min = 0.35 }) {
    if (!KINDS.includes(kind)) return [];
    const rows = this.db.prepare("SELECT * FROM assets WHERE kind = ? AND status != 'hidden'").all(kind);
    const skip = new Set(Array.isArray(exclude) ? exclude : []);
    const candidates = rows.filter((r) => !skip.has(r.id)).map((r) => ({ ...this._row(r), fingerprint: JSON.parse(r.fingerprint) }));
    return rankSimilar(fingerprint ?? {}, candidates, { limit: Math.min(50, Number(limit) || 5), min: Number(min) || 0.35 }).map(({ fingerprint: _f, ...rest }) => rest);
  }

  close() {
    this.db.close();
  }
}

/**
 * The /api/library routes over a store (see docs/library.md for the table).
 * Writes are rate-limited per address: a public server is otherwise a free
 * place to park megabytes.
 *
 * @param {() => Promise<LibraryStore>} getStore
 */
export function libraryHandler(getStore) {
  const writes = new RateLimiter(120, { burst: 60 });
  return async (req, res) => {
    const path = pathOf(req);
    if (!path.startsWith('/api/library')) return false;
    const params = queryOf(req);
    const rest = decodeURIComponent(path.slice('/api/library'.length).replace(/^\//, ''));
    const writing = req.method !== 'GET';
    try {
      if (writing && !writes.take(clientIp(req))) {
        json(res, 429, { error: 'Too many library changes — wait a moment.' });
        return true;
      }
      const lib = await getStore();
      if (req.method === 'GET' && !rest) {
        json(res, 200, {
          assets: lib.list({ kind: params.get('kind'), status: params.get('status'), q: params.get('q')?.slice(0, 80), limit: Number(params.get('limit') ?? 200), full: params.get('full') === '1' }),
          counts: lib.counts()
        });
        return true;
      }
      if (req.method === 'POST' && rest === 'seed') {
        const { assets } = await readJson(req, 4 * 1024 * 1024);
        json(res, 200, { seeded: lib.seed(Array.isArray(assets) ? assets : []) });
        return true;
      }
      if (req.method === 'POST' && rest === 'similar') {
        json(res, 200, { similar: lib.similar(await readJson(req, 256 * 1024)) });
        return true;
      }
      if (req.method === 'POST' && !rest) {
        const asset = await readJson(req, 1024 * 1024);
        const saved = lib.upsert(asset);
        json(res, 200, { asset: saved, similar: lib.similar({ kind: saved.kind, fingerprint: saved.fingerprint, exclude: [saved.id], limit: 3, min: 0.55 }) });
        return true;
      }
      const [id, action] = rest.split('/');
      if (req.method === 'GET' && id) {
        const asset = lib.get(id);
        if (asset) json(res, 200, { asset });
        else json(res, 404, { error: 'no such asset' });
        return true;
      }
      if (req.method === 'POST' && action === 'use') {
        json(res, 200, { asset: lib.use(id) });
        return true;
      }
      if (req.method === 'PATCH' && id) {
        json(res, 200, { asset: lib.setStatus(id, (await readJson(req, 4096)).status) });
        return true;
      }
      if (req.method === 'DELETE' && id) {
        json(res, 200, { deleted: lib.remove(id) });
        return true;
      }
      json(res, 404, { error: 'unknown library route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, /too large/.test(message) ? 413 : /node:sqlite|ERR_UNKNOWN_BUILTIN_MODULE/.test(message) ? 503 : 400, { error: message });
    }
    return true;
  };
}

/** The dev-server plugin: /api/library over a LibraryStore in `data/`. */
export function libraryApi() {
  let store = null;
  const handle = libraryHandler(async () => (store ??= await LibraryStore.open()));
  const middleware = (server) => {
    server.middlewares.use((req, res, next) => {
      handle(req, res).then((handled) => handled || next(), next);
    });
  };
  return { name: 'gamory-library', configureServer: middleware, configurePreviewServer: middleware };
}
