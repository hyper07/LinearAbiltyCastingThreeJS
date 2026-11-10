/**
 * The shared content library — every class, skill, item, weapon and level
 * the game ships with (status `official`) and everything players make
 * (`draft` while it is theirs alone, `shared` once it is public, `hidden`
 * when pulled), in one table.
 *
 * PostgreSQL (server/db/database.js) — the same database as the accounts:
 * a server when DATABASE_URL is set, PGlite in DATA_DIR/postgres otherwise —
 * served under /api/library by the dev server and the production server
 * alike. The game only ever talks to the HTTP API (src/library/Library.js).
 *
 * Similar-asset search runs here over every asset's fingerprint (see
 * src/library/similarity.js), so suggestions span the whole library, not
 * just what one player has loaded.
 */
import { rankSimilar } from '../src/library/similarity.js';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from './api/http.js';
import { openDatabase } from './db/database.js';

export const KINDS = ['class', 'skill', 'item', 'weapon', 'level'];
export const STATUSES = ['official', 'shared', 'draft', 'hidden'];
const ID = /^[a-z]+:[a-z0-9:_-]{1,96}$/;

export class LibraryStore {
  /** @param {import('./db/database.js').Database} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * The library in a database: the one given, or DATABASE_URL's, or PGlite in `dataDir`.
   * @param {{ db?: import('./db/database.js').Database, dataDir?: string }} [options]
   */
  static async open({ db = null, dataDir = process.env.DATA_DIR ?? 'data' } = {}) {
    return new LibraryStore(db ?? (await openDatabase({ dataDir })));
  }

  _row(row, full = false) {
    if (!row) return null;
    const out = {
      id: row.id, kind: row.kind, name: row.name, summary: row.summary, author: row.author,
      status: row.status, featured: Boolean(row.featured), parent: row.parent, uses: row.uses,
      created: row.created, updated: row.updated
    };
    if (full) {
      out.data = row.data;
      out.fingerprint = row.fingerprint;
    }
    return out;
  }

  /** Assets, newest first; `q` matches name and summary. Hidden ones only when asked for. */
  async list({ kind = null, status = null, q = null, limit = 200, full = false } = {}) {
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
      where.push('(name ILIKE ? OR summary ILIKE ?)');
      const like = `%${String(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      args.push(like, like);
    }
    const sql = `SELECT ${full ? '*' : 'id, kind, name, summary, author, status, featured, parent, uses, created, updated'} FROM assets ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY featured DESC, CASE status WHEN 'official' THEN 1 ELSE 0 END, uses DESC, updated DESC LIMIT ?`;
    return (await this.db.many(sql, [...args, Math.max(1, Math.min(500, Number(limit) || 200))])).map((r) => this._row(r, full));
  }

  /** How many assets of each status (and kind), for the library's header. */
  async counts() {
    const out = { total: 0, byStatus: {}, byKind: {} };
    for (const r of await this.db.many("SELECT kind, status, COUNT(*) AS n FROM assets WHERE status != 'hidden' GROUP BY kind, status")) {
      out.total += r.n;
      out.byStatus[r.status] = (out.byStatus[r.status] ?? 0) + r.n;
      out.byKind[r.kind] = (out.byKind[r.kind] ?? 0) + r.n;
    }
    return out;
  }

  async get(id) {
    return this._row(await this.db.one('SELECT * FROM assets WHERE id = ?', [id]), true);
  }

  /**
   * Create or update. Official assets can only come from the seed; a
   * player's save never overwrites one.
   */
  async upsert(asset, { official = false } = {}) {
    if (!ID.test(asset.id ?? '')) throw new Error('bad asset id');
    if (!KINDS.includes(asset.kind)) throw new Error('bad kind');
    const status = official ? 'official' : STATUSES.includes(asset.status) && asset.status !== 'official' ? asset.status : 'draft';
    const now = Date.now();
    await this.db.tx(async () => {
      const existing = await this.db.one('SELECT status, created, uses FROM assets WHERE id = ? FOR UPDATE', [asset.id]);
      if (existing?.status === 'official' && !official) throw new Error('official assets cannot be overwritten');
      await this.db.run(
        `INSERT INTO assets (id, kind, name, summary, author, status, featured, data, fingerprint, parent, uses, created, updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, name = excluded.name, summary = excluded.summary,
           author = excluded.author, status = excluded.status, data = excluded.data, fingerprint = excluded.fingerprint,
           parent = excluded.parent, updated = excluded.updated`,
        [
          asset.id, asset.kind, String(asset.name ?? asset.id).slice(0, 120), String(asset.summary ?? '').slice(0, 600),
          String(asset.author ?? '').slice(0, 60), status, Boolean(asset.featured), JSON.stringify(asset.data ?? {}),
          JSON.stringify(asset.fingerprint ?? {}), asset.parent ?? null, existing?.uses ?? 0, existing?.created ?? now, now
        ]
      );
    });
    return this.get(asset.id);
  }

  /** Replace the official set in one go (the game's defaults, sent at start-up). */
  async seed(assets) {
    await this.db.tx(async () => {
      for (const a of assets) await this.upsert(a, { official: true });
    });
    return assets.length;
  }

  async setStatus(id, status) {
    if (!STATUSES.includes(status) || status === 'official') throw new Error('bad status');
    const row = await this.db.one('SELECT status FROM assets WHERE id = ?', [id]);
    if (!row) throw new Error('no such asset');
    if (row.status === 'official') throw new Error('official assets keep their status');
    await this.db.run('UPDATE assets SET status = ?, updated = ? WHERE id = ?', [status, Date.now(), id]);
    return this.get(id);
  }

  async use(id) {
    await this.db.run('UPDATE assets SET uses = uses + 1 WHERE id = ?', [id]);
    return this.get(id);
  }

  async remove(id) {
    const row = await this.db.one('SELECT status FROM assets WHERE id = ?', [id]);
    if (!row) return false;
    if (row.status === 'official') throw new Error('official assets cannot be deleted');
    await this.db.run('DELETE FROM assets WHERE id = ?', [id]);
    return true;
  }

  /** Assets like this fingerprint (official and shared, plus the asker's drafts), best first. */
  async similar({ kind, fingerprint, exclude = [], limit = 5, min = 0.35 }) {
    if (!KINDS.includes(kind)) return [];
    const rows = await this.db.many("SELECT id, kind, name, summary, author, status, featured, parent, uses, created, updated, fingerprint FROM assets WHERE kind = ? AND status != 'hidden'", [kind]);
    const skip = new Set(Array.isArray(exclude) ? exclude : []);
    const candidates = rows.filter((r) => !skip.has(r.id)).map((r) => ({ ...this._row(r), fingerprint: r.fingerprint }));
    return rankSimilar(fingerprint ?? {}, candidates, { limit: Math.min(50, Number(limit) || 5), min: Number(min) || 0.35 }).map(({ fingerprint: _f, ...rest }) => rest);
  }

  /** The database belongs to the server (it is shared with the accounts): nothing to close here. */
  close() {}
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
          assets: await lib.list({ kind: params.get('kind'), status: params.get('status'), q: params.get('q')?.slice(0, 80), limit: Number(params.get('limit') ?? 200), full: params.get('full') === '1' }),
          counts: await lib.counts()
        });
        return true;
      }
      if (req.method === 'POST' && rest === 'seed') {
        const { assets } = await readJson(req, 4 * 1024 * 1024);
        json(res, 200, { seeded: await lib.db.serial(() => lib.seed(Array.isArray(assets) ? assets : [])) });
        return true;
      }
      if (req.method === 'POST' && rest === 'similar') {
        json(res, 200, { similar: await lib.similar(await readJson(req, 256 * 1024)) });
        return true;
      }
      if (req.method === 'POST' && !rest) {
        const asset = await readJson(req, 1024 * 1024);
        const saved = await lib.db.serial(() => lib.upsert(asset));
        json(res, 200, { asset: saved, similar: await lib.similar({ kind: saved.kind, fingerprint: saved.fingerprint, exclude: [saved.id], limit: 3, min: 0.55 }) });
        return true;
      }
      const [id, action] = rest.split('/');
      if (req.method === 'GET' && id) {
        const asset = await lib.get(id);
        if (asset) json(res, 200, { asset });
        else json(res, 404, { error: 'no such asset' });
        return true;
      }
      if (req.method === 'POST' && action === 'use') {
        json(res, 200, { asset: await lib.use(id) });
        return true;
      }
      if (req.method === 'PATCH' && id) {
        json(res, 200, { asset: await lib.db.serial(async () => lib.setStatus(id, (await readJson(req, 4096)).status)) });
        return true;
      }
      if (req.method === 'DELETE' && id) {
        json(res, 200, { deleted: await lib.db.serial(() => lib.remove(id)) });
        return true;
      }
      json(res, 404, { error: 'unknown library route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, /too large/.test(message) ? 413 : /ECONNREFUSED|ENOTFOUND|database|terminat/i.test(message) ? 503 : 400, { error: message });
    }
    return true;
  };
}

/**
 * The dev-server plugin: /api/library over the library in the dev database.
 * @param {() => Promise<import('./db/database.js').Database>} [getDb] the database shared with the accounts
 */
export function libraryApi(getDb = () => openDatabase({ dataDir: 'data' })) {
  let store = null;
  const handle = libraryHandler(async () => (store ??= new LibraryStore(await getDb())));
  const middleware = (server) => {
    server.middlewares.use((req, res, next) => {
      handle(req, res).then((handled) => handled || next(), next);
    });
  };
  return { name: 'gamory-library', configureServer: middleware, configurePreviewServer: middleware };
}
