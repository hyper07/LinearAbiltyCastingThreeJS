import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json, pathOf, readJson } from './http.js';

/**
 * Levels and forged classes as JSON files, with two folders:
 *
 *   built-in   what ships with the game (`public/levels`, `public/classes`;
 *              `dist/...` once built) — read-only in production
 *   user       what players save on this server (`data/levels`, `data/classes`)
 *
 * The index merges both (built-in first, then the user's, in their own
 * order). Reads prefer the user's copy; writes always go to the user folder,
 * and an id that belongs to the built-in set is refused, so nobody can save
 * over an official level on a public server.
 *
 * Under `npm run dev` both folders are the same one — the repo's — which is
 * how the game's own levels get edited and committed.
 */

export const FILE_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

export class JsonFileStore {
  /**
   * @param {{ builtInDir: string, userDir: string, indexKey: 'campaign'|'classes', maxBytes?: number, label?: string }} options
   */
  constructor({ builtInDir, userDir, indexKey, maxBytes = 12 * 1024 * 1024, label = 'file' }) {
    this.builtInDir = resolve(builtInDir);
    this.userDir = resolve(userDir);
    this.key = indexKey;
    this.maxBytes = maxBytes;
    this.label = label;
  }

  /** Dev mode: one folder for everything, and the built-in set is editable. */
  get sameDir() {
    return this.builtInDir === this.userDir;
  }

  async _readIndex(dir) {
    try {
      const data = JSON.parse(await readFile(resolve(dir, 'index.json'), 'utf8'));
      return { [this.key]: Array.isArray(data[this.key]) ? data[this.key] : [], order: Array.isArray(data.order) ? data.order : null };
    } catch {
      return { [this.key]: [], order: null };
    }
  }

  async _writeIndex(dir, index) {
    await atomicWrite(resolve(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  }

  /** The merged index: `{ [indexKey]: [{ id, name, official? }] }`. */
  async index() {
    const builtIn = await this._readIndex(this.builtInDir);
    if (this.sameDir) return { [this.key]: builtIn[this.key] };
    const user = await this._readIndex(this.userDir);
    const byId = new Map();
    for (const entry of builtIn[this.key]) byId.set(entry.id, { ...entry, official: true });
    for (const entry of user[this.key]) if (!byId.has(entry.id)) byId.set(entry.id, entry);
    const entries = [...byId.values()];
    if (user.order) {
      const position = new Map(user.order.map((id, i) => [id, i]));
      entries.sort((a, b) => (position.get(a.id) ?? 1e9) - (position.get(b.id) ?? 1e9));
    }
    return { [this.key]: entries };
  }

  async isBuiltIn(id) {
    if (this.sameDir) return false;
    const builtIn = await this._readIndex(this.builtInDir);
    return builtIn[this.key].some((entry) => entry.id === id);
  }

  /** The file's text (the user's copy first), or null. */
  async readText(id) {
    if (!FILE_ID.test(id)) return null;
    for (const dir of this.sameDir ? [this.builtInDir] : [this.userDir, this.builtInDir]) {
      try {
        return await readFile(resolve(dir, `${id}.json`), 'utf8');
      } catch {
        /* try the next folder */
      }
    }
    return null;
  }

  async write(id, data, name) {
    if (!FILE_ID.test(id)) throw new Error(`bad ${this.label} id`);
    if (await this.isBuiltIn(id)) throw new Error(`“${id}” comes with the game — save yours under another name`);
    await atomicWrite(resolve(this.userDir, `${id}.json`), JSON.stringify(data, null, 1) + '\n');
    const index = await this._readIndex(this.userDir);
    const entry = index[this.key].find((e) => e.id === id);
    if (entry) entry.name = name;
    else index[this.key].push({ id, name });
    await this._writeIndex(this.userDir, this._tidy(index));
    return this.index();
  }

  async remove(id) {
    if (!FILE_ID.test(id)) throw new Error(`bad ${this.label} id`);
    if (await this.isBuiltIn(id)) throw new Error(`“${id}” comes with the game and cannot be deleted`);
    await rm(resolve(this.userDir, `${id}.json`), { force: true });
    const index = await this._readIndex(this.userDir);
    index[this.key] = index[this.key].filter((e) => e.id !== id);
    await this._writeIndex(this.userDir, this._tidy(index));
    return this.index();
  }

  /** Reorder the index. In dev the repo's own index moves; in production the order is the user's. */
  async reorder(ids) {
    const wanted = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string');
    if (this.sameDir) {
      const index = await this._readIndex(this.builtInDir);
      const byId = new Map(index[this.key].map((e) => [e.id, e]));
      const next = wanted.filter((id) => byId.has(id)).map((id) => byId.get(id));
      for (const entry of index[this.key]) if (!next.includes(entry)) next.push(entry);
      await this._writeIndex(this.builtInDir, { [this.key]: next });
      return this.index();
    }
    const index = await this._readIndex(this.userDir);
    index.order = wanted;
    await this._writeIndex(this.userDir, index);
    return this.index();
  }

  _tidy(index) {
    const out = { [this.key]: index[this.key] };
    if (index.order) out.order = index.order;
    return out;
  }
}

/** Write-then-rename, so a crash mid-save never leaves half a file behind. */
async function atomicWrite(file, text) {
  await mkdir(resolve(file, '..'), { recursive: true });
  await writeFile(`${file}.tmp`, text);
  await rename(`${file}.tmp`, file);
}

/**
 * The HTTP routes over a store:
 *
 *   GET    /<files>/index.json, /<files>/<id>.json   read (user copy first)
 *   GET    /api/<files>                               the index
 *   POST   /api/<files>/<id>                          save
 *   DELETE /api/<files>/<id>                          delete
 *   POST   /api/<files>-order   { order: [ids] }      reorder (when `ordered`)
 *
 * @param {JsonFileStore} store
 * @param {{ files: 'levels'|'classes', ordered?: boolean }} options
 */
export function fileApi(store, { files, ordered = false }) {
  const fileRoute = new RegExp(`^/${files}/([a-z0-9][a-z0-9-]{0,47}|index)\\.json$`);
  const apiBase = `/api/${files}`;
  const itemRoute = new RegExp(`^/api/${files}/([^/]+)$`);

  return async (req, res) => {
    const path = pathOf(req);
    const file = path.match(fileRoute);
    if (file && req.method === 'GET') {
      if (file[1] === 'index') {
        json(res, 200, await store.index(), { 'Cache-Control': 'no-cache' });
        return true;
      }
      const text = await store.readText(file[1]);
      if (text == null) json(res, 404, { error: `no such ${store.label}` });
      else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(text);
      }
      return true;
    }
    if (!path.startsWith(apiBase)) return false;

    try {
      if (path === apiBase && req.method === 'GET') {
        json(res, 200, await store.index());
        return true;
      }
      if (ordered && path === `${apiBase}-order` && req.method === 'POST') {
        const { order } = await readJson(req, 64 * 1024);
        json(res, 200, await store.reorder(order));
        return true;
      }
      const match = path.match(itemRoute);
      const id = match ? decodeURIComponent(match[1]) : '';
      if (!FILE_ID.test(id)) {
        json(res, 400, { error: `bad ${store.label} id` });
        return true;
      }
      if (req.method === 'POST') {
        const data = await readJson(req, store.maxBytes);
        if (data?.id !== id) {
          json(res, 400, { error: 'id in the URL and the file disagree' });
          return true;
        }
        const index = await store.write(id, data, String(data.name ?? id).slice(0, 80));
        json(res, 200, { ok: true, id, ...index });
        return true;
      }
      if (req.method === 'DELETE') {
        json(res, 200, { ok: true, ...(await store.remove(id)) });
        return true;
      }
      json(res, 405, { error: 'method not allowed' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, /too large/.test(message) ? 413 : 400, { error: message });
    }
    return true;
  };
}
