import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from './api/http.js';
import { adminAuth } from './api/adminAuth.js';
import { MIGRATIONS } from './db/migrations.js';
import { LOCALE_IDS } from '../src/arcademia/i18n/index.js';
import { registerAllLocales } from '../src/arcademia/voice/locales.js';
import { characterIds, isCharId, isLineId, lineKey, scriptIndex } from '../src/arcademia/voice/script.js';
import {
  ACTOR_ID, CONSENT_TEXT, CONSENT_VERSION, FORMATS, MAX_FILE_BYTES, MAX_SECONDS, MIN_FILE_BYTES,
  emptyManifest, removeActor, removeRecording, setRecording
} from '../src/arcademia/voice/manifest.js';

/**
 * AI Arcademia's recorded voices: real people recording the game's lines in
 * the voice studio (voice-studio.html). Never synthesized: there is no
 * text-to-speech anywhere on the platform.
 *
 *   GET    /api/voice                                   the actors (with consent), the manifest, the consent text
 *   POST   /api/voice/actors                            { name, characters[], languages[], consent: true, consentVersion }
 *   PATCH  /api/voice/actors/<id>                       { name?, characters?, languages? }
 *   POST   /api/voice/actors/<id>/remove                { confirm: true } — "Remove all my recordings"
 *   PUT    /api/voice/lines/<lang>/<char>/<line>.<ext>  the audio itself (audio/webm | audio/mp4 | audio/ogg)
 *                                                       ?actor=&take=&duration=&lufs=&peak=
 *   DELETE /api/voice/lines/<lang>/<char>/<line>        take a recording out
 *
 * Admin only (server/api/adminAuth.js: ADMIN_ACCOUNTS + ADMIN_PASSWORD). The
 * dev server also lets the local machine in when no admin is configured.
 *
 * Files go to VOICE_DIR (default public/audio/voice) as
 * <lang>/<char>/<line>.<ext>, next to manifest.json; the servers serve that
 * folder at /audio/voice/. Everything is checked: the language, the
 * character and the line must be in the script, the actor must have agreed
 * and voice that character and language, the type must be an allowed one and
 * look like it (its first bytes), the size is capped, and the path is built
 * from checked parts and checked again to be inside VOICE_DIR.
 */

const refuse = (message, status = 400) => Object.assign(new Error(message), { status });
const MAGIC = {
  webm: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  mp4: (b) => b.length > 12 && b.toString('latin1', 4, 8) === 'ftyp',
  ogg: (b) => b.length > 4 && b.toString('latin1', 0, 4) === 'OggS'
};

export class VoiceStore {
  /** @param {import('./db/database.js').Database} db */
  constructor(db, { voiceDir = resolve('public', 'audio', 'voice'), now = () => Date.now() } = {}) {
    this.db = db;
    this.dir = resolve(voiceDir);
    this.now = now;
    this._index = null;
    this._ready = null;
    this._queue = Promise.resolve();
  }

  /** The script's lines in every language (built once). */
  get index() {
    if (!this._index) {
      registerAllLocales();
      this._index = scriptIndex(LOCALE_IDS);
      this._chars = new Set(characterIds());
    }
    return this._index;
  }

  /**
   * The table, even on a dev server whose database opened before this
   * migration existed (Vite keeps one database across config reloads).
   */
  ready() {
    this._ready ??= (async () => {
      const row = await this.db.one("SELECT to_regclass('voice_actors') AS t");
      if (row?.t) return;
      const m = MIGRATIONS.find((x) => x.id === '011-voice');
      await this.db.tx(async () => {
        await this.db.exec(m.sql);
        await this.db.run('INSERT INTO schema_migrations (id, at) VALUES (?, ?) ON CONFLICT (id) DO NOTHING', [m.id, this.now()]);
      });
    })().catch((e) => {
      this._ready = null;
      throw e;
    });
    return this._ready;
  }

  /** One change at a time to the files and the manifest. */
  serial(fn) {
    const run = this._queue.then(fn, fn);
    this._queue = run.catch(() => {});
    return run;
  }

  /** A path inside the voice folder, or an error: never anywhere else. */
  inside(...parts) {
    const p = resolve(this.dir, ...parts);
    if (p !== this.dir && !p.startsWith(this.dir + sep)) throw refuse('Path outside the voice folder', 400);
    return p;
  }

  async manifest() {
    try {
      const m = JSON.parse(await readFile(join(this.dir, 'manifest.json'), 'utf8'));
      // A damaged manifest is never overwritten with an empty one (that would lose every credit).
      if (!m || typeof m.lines !== 'object' || typeof m.actors !== 'object') throw refuse('manifest.json is damaged: fix it by hand', 500);
      return m;
    } catch (e) {
      if (e.code === 'ENOENT') return emptyManifest();
      if (e instanceof SyntaxError) throw refuse('manifest.json is damaged: fix it by hand', 500);
      throw e;
    }
  }

  async _saveManifest(m) {
    m.updated = new Date(this.now()).toISOString();
    await mkdir(this.dir, { recursive: true });
    const tmp = this.inside(`.manifest.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
    await writeFile(tmp, `${JSON.stringify(m, null, 1)}\n`);
    await rename(tmp, this.inside('manifest.json'));
  }

  /* ---- actors ---- */

  _actorRow(r) {
    if (!r) return null;
    const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? JSON.parse(v) : []);
    return { id: r.id, name: r.name, characters: list(r.characters), languages: list(r.languages), consent: { version: r.consent_version, text: r.consent_text, at: Number(r.consented_at), by: r.consent_by }, removedAt: r.removed_at ? Number(r.removed_at) : null, created: Number(r.created), updated: Number(r.updated) };
  }

  async actors() {
    await this.ready();
    return (await this.db.many('SELECT * FROM voice_actors ORDER BY created')).map((r) => this._actorRow(r));
  }

  async actor(id) {
    await this.ready();
    if (!ACTOR_ID.test(String(id))) return null;
    return this._actorRow(await this.db.one('SELECT * FROM voice_actors WHERE id = ?', [id]));
  }

  _cleanProfile(b, { partial = false } = {}) {
    const out = {};
    if (!partial || b.name !== undefined) {
      const name = String(b.name ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 60) throw refuse('A display name of 2–60 characters, as it should appear in the credits');
      out.name = name;
    }
    void this.index;
    if (!partial || b.characters !== undefined) {
      const chars = [...new Set(Array.isArray(b.characters) ? b.characters : [])];
      if (!chars.length || chars.length > 60 || !chars.every((c) => isCharId(c) && this._chars.has(c))) throw refuse('Pick the characters they voice (from the script)');
      out.characters = chars;
    }
    if (!partial || b.languages !== undefined) {
      const langs = [...new Set(Array.isArray(b.languages) ? b.languages : [])];
      if (!langs.length || !langs.every((l) => LOCALE_IDS.includes(l))) throw refuse(`Pick their languages (${LOCALE_IDS.join(', ')})`);
      out.languages = langs;
    }
    return out;
  }

  /** A new voice actor: only with their consent to the current text. */
  async addActor(b, adminId) {
    await this.ready();
    if (b?.consent !== true || Number(b.consentVersion) !== CONSENT_VERSION) throw refuse('The actor has to agree to the consent text first');
    const p = this._cleanProfile(b);
    const id = `a-${randomBytes(4).toString('hex')}`;
    const now = this.now();
    await this.db.run('INSERT INTO voice_actors (id, name, characters, languages, consent_version, consent_text, consented_at, consent_by, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, p.name, JSON.stringify(p.characters), JSON.stringify(p.languages), CONSENT_VERSION, CONSENT_TEXT, now, String(adminId), now, now]);
    return this.actor(id);
  }

  async updateActor(id, b) {
    const a = await this.actor(id);
    if (!a) throw refuse('No such actor', 404);
    if (a.removedAt) throw refuse('This actor asked for their recordings to be removed; add them again (with consent) to record', 409);
    const p = this._cleanProfile(b ?? {}, { partial: true });
    const next = { ...a, ...p };
    await this.db.run('UPDATE voice_actors SET name = ?, characters = ?, languages = ?, updated = ? WHERE id = ?', [next.name, JSON.stringify(next.characters), JSON.stringify(next.languages), this.now(), id]);
    // The credited name follows the profile.
    await this.serial(async () => {
      const m = await this.manifest();
      if (m.actors[id]) {
        m.actors[id] = { name: next.name, characters: next.characters, languages: next.languages };
        await this._saveManifest(m);
      }
    });
    return this.actor(id);
  }

  /** "Remove all my recordings": every file of theirs and their credit; the consent row keeps the date of the removal. */
  async removeActorRecordings(id, adminId) {
    const a = await this.actor(id);
    if (!a) throw refuse('No such actor', 404);
    const removed = await this.serial(async () => {
      const m = await this.manifest();
      const files = removeActor(m, id);
      await this._saveManifest(m);
      for (const f of files) await rm(this.inside(f), { force: true });
      return files.length;
    });
    await this.db.run('UPDATE voice_actors SET removed_at = ?, removed_by = ?, updated = ? WHERE id = ?', [this.now(), String(adminId), this.now(), id]);
    return { removed };
  }

  /* ---- recordings ---- */

  /** Check where a recording would go: the language, character and line are in the script. */
  checkLine(lang, char, line) {
    if (!LOCALE_IDS.includes(lang)) throw refuse('Unknown language');
    if (!isCharId(char)) throw refuse('Bad character id');
    if (!isLineId(line)) throw refuse('Bad line id');
    if (!this.index.has(lineKey(lang, char, line))) throw refuse('That line is not in the script for this character and language', 404);
  }

  /**
   * Save one file of a take. `take` is the take's date (ISO); a new take
   * replaces the line's older files, the same take adds a format to it.
   */
  async saveRecording({ lang, char, line, ext, contentType, bytes, actor: actorId, take, duration, lufs, peak }) {
    this.checkLine(lang, char, line);
    const f = FORMATS[ext];
    if (!f) throw refuse('Allowed formats: webm (Opus), m4a (AAC), ogg (Opus)', 415);
    const mime = String(contentType ?? '').split(';')[0].trim().toLowerCase();
    if (mime !== f.mime) throw refuse(`A .${ext} file is sent as ${f.mime}`, 415);
    if (!Buffer.isBuffer(bytes) || bytes.length < MIN_FILE_BYTES) throw refuse('The recording is empty');
    if (bytes.length > MAX_FILE_BYTES) throw refuse('The recording is too large', 413);
    if (!MAGIC[f.magic](bytes)) throw refuse(`That is not a ${f.mime} file`, 415);
    const a = await this.actor(actorId);
    if (!a) throw refuse('Unknown voice actor');
    if (a.removedAt) throw refuse('This actor asked for their recordings to be removed', 409);
    if (!a.characters.includes(char) || !a.languages.includes(lang)) throw refuse(`${a.name} is not set up to voice ${char} in ${lang}`, 403);
    const d = Number(duration);
    if (!(d > 0.05 && d <= MAX_SECONDS)) throw refuse(`A duration of up to ${MAX_SECONDS} s`);
    const at = Date.parse(take);
    if (!Number.isFinite(at) || at > this.now() + 60_000 || at < Date.UTC(2024, 0, 1)) throw refuse('A take date (ISO)');
    const round = (v, k = 100) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * k) / k : null);
    const rel = `${lang}/${char}/${line}.${ext}`;
    const file = this.inside(lang, char, `${line}.${ext}`);
    return this.serial(async () => {
      await mkdir(this.inside(lang, char), { recursive: true });
      const tmp = this.inside(lang, char, `.${line}.${ext}.${randomBytes(4).toString('hex')}.tmp`);
      await writeFile(tmp, bytes);
      await rename(tmp, file);
      const m = await this.manifest();
      m.actors[a.id] = { name: a.name, characters: a.characters, languages: a.languages };
      const stale = setRecording(m, lang, char, line, { files: { [ext]: rel }, duration: round(d, 1000), actor: a.id, take: new Date(at).toISOString(), lufs: round(lufs), peak: round(peak) });
      await this._saveManifest(m);
      for (const s of stale) await rm(this.inside(s), { force: true });
      return m.lines[lang][char][line];
    });
  }

  async deleteRecording(lang, char, line) {
    this.checkLine(lang, char, line);
    return this.serial(async () => {
      const m = await this.manifest();
      const files = removeRecording(m, lang, char, line);
      if (!files.length) return { removed: 0 };
      // An actor with nothing left is no longer credited.
      const used = new Set();
      for (const chars of Object.values(m.lines)) for (const lines of Object.values(chars)) for (const e of Object.values(lines)) used.add(e.actor);
      for (const id of Object.keys(m.actors)) if (!used.has(id)) delete m.actors[id];
      await this._saveManifest(m);
      for (const f of files) await rm(this.inside(f), { force: true });
      return { removed: files.length };
    });
  }
}

/** Read a raw body, refusing anything over `maxBytes` (checked against Content-Length first). */
export function readBinary(req, maxBytes = MAX_FILE_BYTES) {
  return new Promise((done, fail) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) return fail(refuse('The recording is too large', 413));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        fail(refuse('The recording is too large', 413));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => done(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * The /api/voice routes.
 * @param {() => Promise<VoiceStore>} getStore
 * @param {{ env?: object, allowLocal?: boolean }} options  allowLocal: the dev server lets the
 *   local machine in when no admin id and password are configured (never in production)
 */
export function voiceHandler(getStore, { env = process.env, allowLocal = false } = {}) {
  const admin = adminAuth(env);
  const writes = new RateLimiter(240, { burst: 60 });
  return async (req, res) => {
    const path = pathOf(req);
    if (path !== '/api/voice' && !path.startsWith('/api/voice/')) return false;
    const send = (status, body) => json(res, status, body);
    let adminId = null;
    if (allowLocal && !admin.on && LOOPBACK.has(req.socket?.remoteAddress ?? '')) adminId = 'local-dev';
    else {
      if (admin.refuse(req, res, send)) return true;
      adminId = admin.idOf(req);
    }
    const parts = path.slice('/api/voice'.length).split('/').filter(Boolean).map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return '\u0000';
      }
    });
    try {
      const store = await getStore();
      const m = req.method;
      const body = async () => {
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw refuse('JSON only', 415);
        if (!writes.take(clientIp(req))) throw refuse('Slow down', 429);
        return readJson(req, 64 * 1024);
      };
      if (m === 'GET' && !parts.length) {
        res.setHeader('Cache-Control', 'no-store');
        return send(200, { admin: adminId, actors: await store.actors(), manifest: await store.manifest(), consent: { version: CONSENT_VERSION, text: CONSENT_TEXT }, limits: { maxBytes: MAX_FILE_BYTES, maxSeconds: MAX_SECONDS, formats: Object.keys(FORMATS) } }), true;
      }
      if (parts[0] === 'actors') {
        if (m === 'POST' && parts.length === 1) return send(200, { actor: await store.addActor(await body(), adminId) }), true;
        if (m === 'PATCH' && parts.length === 2) return send(200, { actor: await store.updateActor(parts[1], await body()) }), true;
        if (m === 'POST' && parts.length === 3 && parts[2] === 'remove') {
          const b = await body();
          if (b.confirm !== true) throw refuse('Confirm the removal');
          return send(200, await store.removeActorRecordings(parts[1], adminId)), true;
        }
      }
      if (parts[0] === 'lines' && parts.length === 4) {
        const [, lang, char, name] = parts;
        if (m === 'PUT') {
          const dot = name.lastIndexOf('.');
          const line = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot + 1) : '';
          store.checkLine(lang, char, line);
          if (!FORMATS[ext]) throw refuse('Allowed formats: webm (Opus), m4a (AAC), ogg (Opus)', 415);
          if (!writes.take(clientIp(req))) throw refuse('Slow down', 429);
          const q = queryOf(req);
          const bytes = await readBinary(req);
          const entry = await store.saveRecording({ lang, char, line, ext, contentType: req.headers['content-type'], bytes, actor: q.get('actor'), take: q.get('take'), duration: q.get('duration'), lufs: q.get('lufs'), peak: q.get('peak') });
          return send(200, { entry }), true;
        }
        if (m === 'DELETE') return send(200, await store.deleteRecording(lang, char, name)), true;
      }
      send(404, { error: 'unknown route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      send(error?.status ?? (/too large/.test(message) ? 413 : /bad JSON/i.test(message) ? 400 : 500), { error: error?.status || /too large|bad JSON/i.test(message) ? message : 'Server error' });
      if (!error?.status && !/too large|bad JSON/i.test(message)) console.error('[voice]', error);
    }
    return true;
  };
}
