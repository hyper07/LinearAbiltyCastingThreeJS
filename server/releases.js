import { createReadStream } from 'node:fs';
import { stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { adminAuth } from './api/adminAuth.js';
import { json, pathOf, readJson, RateLimiter, clientIp } from './api/http.js';
import {
  CODE_RE, HASH_RE, VERSION_RE, PackageError, scanPackages, resolvePackage, readCurrent, listReleases, history, commitDiff, deploy, rollback, buildPackage, prepareSource, commitOf
} from './gamePackages.js';

/**
 * Game packages on the server: production releases as files, and the admin's
 * development view (docs/platform-architecture.md, "Game packages, draft and production").
 *
 *   GET  /releases/<code>/current.json            which version players get (no-cache)
 *   GET  /releases/<code>/<version>/<file>        a release's files (immutable)
 *   GET  /api/releases                            every package and its production version (public),
 *                                                 plus whether this caller may see the admin view
 *   GET  /api/releases/<game>                     one package's releases (public: version, date, notes)
 *   GET  /api/releases/<game>/history             admin: releases with sources, the log, pending changes
 *   GET  /api/releases/<game>/changes/<hash>      admin: one change's diff under games/<code>/
 *   POST /api/releases/<game>/deploy              admin: { all | picks, bump | version, notes } → a release
 *   POST /api/releases/<game>/rollback            admin: { version } → repoint current.json
 *   POST /api/releases/<game>/draft               admin: build the committed draft for "Play draft"
 *   GET  /api/releases/<code>/draft/<file>        admin: that draft build's files
 *
 * <game> is a shortcode, slug or id. Admin = the platform admin (ADMIN_ACCOUNTS +
 * ADMIN_PASSWORD over HTTP Basic, server/api/adminAuth.js); in development, with no admin
 * configured, a request from this machine is the admin. A signed-in account whose name is
 * in ADMIN_ACCOUNTS only gets the hint that shows the button — every action still asks for
 * the password. Deploys need this server to run from a git checkout with the dev
 * dependencies (vite); elsewhere they answer 503 and the CLI does the job.
 */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
};

function safeJoin(root, rel) {
  let decoded;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    return null;
  }
  const file = normalize(join(root, decoded));
  return file.startsWith(root + sep) ? file : null;
}

async function info(file) {
  try {
    const s = await stat(file);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

async function sendFile(req, res, file, cacheControl) {
  const s = await info(file);
  if (!s) return json(res, 404, { error: 'not found' });
  const etag = `W/"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
    return res.end();
  }
  const ext = extname(file).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': cacheControl, ETag: etag, Vary: 'Accept-Encoding' };
  let source = file;
  let size = s.size;
  const accepts = String(req.headers['accept-encoding'] ?? '');
  for (const [encoding, suffix] of [['br', '.br'], ['gzip', '.gz']]) {
    if (!accepts.includes(encoding)) continue;
    const packed = await info(`${file}${suffix}`);
    if (packed && packed.mtimeMs >= s.mtimeMs - 1000) {
      source = `${file}${suffix}`;
      size = packed.size;
      headers['Content-Encoding'] = encoding;
      break;
    }
  }
  headers['Content-Length'] = size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  createReadStream(source).pipe(res);
}

/**
 * Whether a request may see draft-only games and the admin button: the platform admin
 * (password), an account named in ADMIN_ACCOUNTS (a hint only — actions still need the
 * password), or this machine on a dev server with no admin configured.
 */
export function draftViewer({ env = process.env, allowLocal = false, authenticate = async () => null } = {}) {
  const admin = adminAuth(env);
  const names = new Set(String(env.ADMIN_ACCOUNTS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  return async (req) => {
    if (allowLocal && !admin.on && LOOPBACK.has(req.socket?.remoteAddress ?? '')) return true;
    if (admin.idOf(req)) return true;
    try {
      const account = await authenticate(req);
      return Boolean(account && names.has(String(account.name).toLowerCase()));
    } catch {
      return false;
    }
  };
}

/**
 * @param {{ repo?: string, releasesDir?: string, gamesDir?: string, scratch?: string,
 *           env?: object, allowLocal?: boolean, authenticate?: (req) => Promise<{name:string}|null>,
 *           log?: (line: string) => void }} options
 */
export function releasesHandler({ repo = resolve('.'), releasesDir, gamesDir, scratch, env = process.env, allowLocal = false, authenticate = async () => null, log = () => {} } = {}) {
  releasesDir = resolve(releasesDir ?? env.RELEASES_DIR ?? join(repo, 'releases'));
  gamesDir = resolve(gamesDir ?? join(repo, 'games'));
  scratch = resolve(scratch ?? env.GAMES_SCRATCH ?? join(tmpdir(), 'gamory-games'));
  const draftsDir = join(scratch, 'drafts');
  const admin = adminAuth(env);
  const writes = new RateLimiter(20, { burst: 5 });
  let busy = null;

  const packages = () => scanPackages(gamesDir);
  const local = (req) => allowLocal && !admin.on && LOOPBACK.has(req.socket?.remoteAddress ?? '');
  const adminOf = (req) => (local(req) ? 'local-dev' : admin.idOf(req));
  const hint = draftViewer({ env, allowLocal, authenticate });
  /** Exclusive: one build at a time on this server. */
  const exclusive = async (what, fn) => {
    if (busy) throw new PackageError(`Busy: ${busy} — try again when it is done`, 409);
    busy = what;
    try {
      return await fn();
    } finally {
      busy = null;
    }
  };

  return async function handle(req, res) {
    const path = pathOf(req);
    // ---- production files ----
    if (path.startsWith('/releases/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'method not allowed' }), true;
      const parts = path.slice('/releases/'.length).split('/');
      const code = parts[0];
      if (!CODE_RE.test(code)) return json(res, 404, { error: 'not found' }), true;
      if (parts.length === 2 && parts[1] === 'current.json') {
        await sendFile(req, res, join(releasesDir, code, 'current.json'), 'no-cache');
        return true;
      }
      if (parts.length < 3 || !VERSION_RE.test(parts[1])) return json(res, 404, { error: 'not found' }), true;
      const file = safeJoin(join(releasesDir, code, parts[1]), parts.slice(2).join('/'));
      if (!file) return json(res, 403, { error: 'forbidden' }), true;
      await sendFile(req, res, file, parts[2] === 'release.json' ? 'no-cache' : 'public, max-age=31536000, immutable');
      return true;
    }
    if (path !== '/api/releases' && !path.startsWith('/api/releases/')) return false;
    const send = (status, body) => json(res, status, body);
    const parts = path.slice('/api/releases'.length).split('/').filter(Boolean);
    try {
      if (!parts.length && req.method === 'GET') {
        const list = packages().map((p) => {
          const cur = readCurrent(releasesDir, p.code);
          return { code: p.code, id: p.id, slug: p.slug, title: p.title, entry: p.entry, version: cur?.version ?? null, updated: cur?.updated ?? null };
        });
        return send(200, { packages: list, admin: Boolean(adminOf(req)), adminHint: await hint(req), local: local(req) }), true;
      }
      if (!parts.length) return send(405, { error: 'method not allowed' }), true;
      // The admin's draft build files: /api/releases/<code>/draft/<file>
      if (parts[1] === 'draft' && parts.length >= 3 && req.method === 'GET') {
        if (!adminOf(req) && admin.refuse(req, res, send)) return true;
        if (!CODE_RE.test(parts[0])) return send(404, { error: 'not found' }), true;
        const file = safeJoin(join(draftsDir, parts[0]), parts.slice(2).join('/'));
        if (!file) return send(403, { error: 'forbidden' }), true;
        await sendFile(req, res, file, 'no-store');
        return true;
      }
      const pkg = resolvePackage(packages(), decodeURIComponent(parts[0]));
      if (parts.length === 1 && req.method === 'GET') {
        const cur = readCurrent(releasesDir, pkg.code);
        const releases = listReleases(releasesDir, pkg.code).reverse().map((r) => ({ version: r.version, date: r.date, notes: r.notes }));
        return send(200, { package: { code: pkg.code, id: pkg.id, slug: pkg.slug, title: pkg.title }, current: cur, releases }), true;
      }
      // Everything below is the admin's.
      const who = adminOf(req);
      if (!who) {
        if (admin.refuse(req, res, send)) return true;
      }
      const by = who ?? admin.idOf(req);
      const body = async () => {
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw new PackageError('JSON only', 415);
        if (!writes.take(clientIp(req))) throw new PackageError('Slow down', 429);
        return readJson(req, 64 * 1024);
      };
      const action = parts[1];
      if (action === 'history' && req.method === 'GET') return send(200, { ...history({ repo, releasesDir, pkg }), busy }), true;
      if (action === 'changes' && parts.length === 3 && req.method === 'GET') {
        if (!HASH_RE.test(parts[2])) throw new PackageError('Bad commit hash');
        return send(200, commitDiff(repo, pkg.code, parts[2])), true;
      }
      if (action === 'deploy' && req.method === 'POST') {
        const b = await body();
        const picks = Array.isArray(b.picks) ? b.picks.map(String) : null;
        if (picks && (picks.length > 500 || picks.some((h) => !HASH_RE.test(h)))) throw new PackageError('Bad commit list');
        if (b.version != null && !VERSION_RE.test(String(b.version))) throw new PackageError('Bad version');
        if (b.bump != null && !['patch', 'minor', 'major'].includes(b.bump)) throw new PackageError('Bad bump');
        const notes = String(b.notes ?? '').slice(0, 4000);
        const release = await exclusive(`deploying ${pkg.slug}`, () =>
          deploy({ repo, releasesDir, ref: pkg.code, all: b.all === true, picks: b.all === true ? null : picks, version: b.version ?? null, bump: b.bump ?? 'patch', notes, by, scratch, log })
        );
        log(`[releases] ${by} deployed ${pkg.slug} ${release.version}`);
        return send(200, { release }), true;
      }
      if (action === 'rollback' && req.method === 'POST') {
        const b = await body();
        if (!VERSION_RE.test(String(b.version ?? ''))) throw new PackageError('Bad version');
        const current = rollback(releasesDir, pkg.code, String(b.version), { by });
        log(`[releases] ${by} rolled ${pkg.slug} to ${current.version}`);
        return send(200, { current }), true;
      }
      if (action === 'draft' && parts.length === 2 && req.method === 'POST') {
        await body();
        const out = await exclusive(`building ${pkg.slug}'s draft`, async () => {
          await mkdir(scratch, { recursive: true });
          const tree = prepareSource(repo, { code: pkg.code, base: commitOf(repo, 'HEAD'), scratch });
          try {
            await buildPackage({ srcRoot: tree.dir, code: pkg.code, outDir: join(draftsDir, pkg.code), modulesFrom: repo, log });
          } finally {
            tree.cleanup();
          }
          return { entry: `api/releases/${pkg.code}/draft/game.js`, css: [`api/releases/${pkg.code}/draft/game.css`] };
        });
        return send(200, out), true;
      }
      return send(404, { error: 'not found' }), true;
    } catch (error) {
      if (error instanceof PackageError) return send(error.status, { error: error.message, conflict: error.conflict ?? null }), true;
      if (/bad JSON|payload too large/.test(error.message)) return send(400, { error: error.message }), true;
      console.error('[releases]', error);
      return send(500, { error: 'server error' }), true;
    }
  };
}
