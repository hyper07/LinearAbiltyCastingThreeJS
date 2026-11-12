import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { aiBridge } from './api/ai.js';
import { JsonFileStore, fileApi } from './api/files.js';
import { chain, json, pathOf } from './api/http.js';
import { LibraryStore, libraryHandler } from './libraryStore.js';
import { GamesStore, gamesHandler } from './gamesStore.js';
import { createModelStore } from './modelgen.mjs';
import { createRealtime } from './realtime.js';
import { createGameServices } from './game/index.js';
import { openDatabase } from './db/database.js';
import { createMarket } from './market/index.js';

/**
 * The production server: one process that serves the built game and
 * everything the game talks to.
 *
 *   /                 the built client (dist/), precompressed and cached
 *   /ws               playing together — rooms and relay (realtime.js)
 *   /api/account/*    accounts and sessions (game/accounts.js)
 *   /api/game/*       characters, loot, shops — the server decides (game/authority.js)
 *   /api/ai/*         the AI bridge: the model key stays here (api/ai.js)
 *   /api/library/*    the shared content library (libraryStore.js)
 *   /api/games/*      the games on the home page: official and published (gamesStore.js)
 *   /api/market/*     the stock market game and its admin dashboard (market/index.js)
 *   /api/levels/*     levels players save, in DATA_DIR/levels (api/files.js)
 *   /api/classes/*    classes from the Class forge, in DATA_DIR/classes
 *   /api/models/*     uploads and picture-to-3D (modelgen.mjs)
 *   /library/*        the downloaded 3D asset library (LIBRARY_ROOT)
 *   /healthz          { ok, rooms, players, uptime }
 *
 * Accounts, characters and the library share one PostgreSQL database
 * (db/database.js): DATABASE_URL's, or PGlite in DATA_DIR/postgres when unset.
 *
 * In development `vite.config.js` mounts the same handlers, so the client
 * cannot tell the two apart. Everything persistent lives under DATA_DIR —
 * mount that as a volume and the server is stateless otherwise.
 *
 * One dependency (`ws`), and Node built-ins for the rest. See docs/production.md.
 */

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
/** Where the built client lives. */
const STATIC_ROOT = resolve(process.env.STATIC_ROOT ?? './dist');
/** Everything players make and the library database. */
const DATA_DIR = resolve(process.env.DATA_DIR ?? './data');
/** The downloaded 3D asset library (`npm run library:fetch`), served at /library/. */
const LIBRARY_ROOT = resolve(process.env.LIBRARY_ROOT ?? './library');
const MAX_PLAYERS = Math.max(2, Math.min(8, Number(process.env.MAX_PLAYERS) || 4));
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 500;
/** Comma-separated origins allowed to call the API cross-site. Empty = none. */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const VERSION = process.env.npm_package_version ?? process.env.GAMORY_VERSION ?? 'dev';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ktx2': 'image/ktx2',
  '.hdr': 'image/vnd.radiance',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.fbx': 'application/octet-stream',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream'
};
const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.map', '.txt', '.wasm', '.xml', '.webmanifest']);

/* ---- the services ---- */

const levels = new JsonFileStore({ builtInDir: join(STATIC_ROOT, 'levels'), userDir: join(DATA_DIR, 'levels'), indexKey: 'campaign', label: 'level' });
const database = await openDatabase({ url: process.env.DATABASE_URL, dataDir: DATA_DIR, log: (line) => console.log(line) });
const game = await createGameServices({ dataDir: DATA_DIR, db: database, readLevel: (id) => levels.readText(id), log: (line) => console.log(line) });
const realtime = createRealtime({ maxPlayers: MAX_PLAYERS, maxRooms: MAX_ROOMS, log: (line) => console.log(`[party] ${line}`), authenticate: game.authenticate });
game.setPartyCheck((a, b) => realtime.sameParty(a, b));
const library = new LibraryStore(database);
const games = new GamesStore(database, levels);
const market = createMarket({ db: database, authenticate: (req) => game.authenticate(req), log: (line) => console.log(line) });
const models = createModelStore({ libraryRoot: LIBRARY_ROOT, log: (line) => console.log(line) });
const api = chain([
  game.handler,
  aiBridge(process.env, { identify: (req) => game.authenticate(req) }),
  fileApi(levels, { files: 'levels', ordered: true }),
  fileApi(new JsonFileStore({ builtInDir: join(STATIC_ROOT, 'classes'), userDir: join(DATA_DIR, 'classes'), indexKey: 'classes', maxBytes: 512 * 1024, label: 'class' }), { files: 'classes' }),
  libraryHandler(async () => library),
  gamesHandler(async () => games, { authenticate: (req) => game.authenticate(req) }),
  market.handler,
  async (req, res) => (pathOf(req).startsWith('/api/models') ? models.handle(req, res) : false)
]);

/* ---- static files ---- */

/** Resolve a URL path under a root, refusing anything that escapes it. */
function safeJoin(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const file = normalize(join(root, decoded));
  return file === root || file.startsWith(root + sep) ? file : null;
}

async function fileInfo(file) {
  try {
    const info = await stat(file);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

/**
 * Serve one file: the precompressed copy when the browser takes it, a weak
 * ETag so a reload costs a 304, and caching that matches how Vite names
 * things (hashed assets live forever, the entry page never).
 */
async function sendFile(req, res, file, info, { cacheControl }) {
  const ext = extname(file).toLowerCase();
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
    return res.end();
  }
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': cacheControl,
    ETag: etag,
    Vary: 'Accept-Encoding'
  };
  let source = file;
  let size = info.size;
  if (COMPRESSIBLE.has(ext)) {
    const accepts = String(req.headers['accept-encoding'] ?? '');
    for (const [encoding, suffix] of [['br', '.br'], ['gzip', '.gz']]) {
      if (!accepts.includes(encoding)) continue;
      const packed = await fileInfo(`${file}${suffix}`);
      if (packed && packed.mtimeMs >= info.mtimeMs) {
        source = `${file}${suffix}`;
        size = packed.size;
        headers['Content-Encoding'] = encoding;
        break;
      }
    }
  }
  headers['Content-Length'] = size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  createReadStream(source).pipe(res);
}

/** The built client. Unknown paths without an extension fall back to the entry page. */
async function serveStatic(req, res, pathname) {
  const file = safeJoin(STATIC_ROOT, pathname === '/' ? '/index.html' : pathname);
  if (!file) return json(res, 403, { error: 'forbidden' });
  let info = await fileInfo(file);
  let target = file;
  if (!info) {
    if (extname(pathname)) return json(res, 404, { error: 'not found' });
    target = join(STATIC_ROOT, 'index.html');
    info = await fileInfo(target);
    if (!info) return json(res, 404, { error: 'The game is not built yet — run `npm run build`.' });
  }
  const ext = extname(target).toLowerCase();
  const immutable = pathname.startsWith('/assets/');
  const cacheControl = ext === '.html' ? 'no-cache' : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  return sendFile(req, res, target, info, { cacheControl });
}

/** One library file. Unlike the app, a miss is a plain 404, never index.html. */
async function serveLibrary(req, res, pathname) {
  const file = safeJoin(LIBRARY_ROOT, pathname);
  if (!file) return json(res, 403, { error: 'forbidden' });
  const info = await fileInfo(file);
  if (!info) return json(res, 404, { error: 'not found' });
  return sendFile(req, res, file, info, { cacheControl: file.endsWith('catalog.json') ? 'no-cache' : 'public, max-age=86400' });
}

/* ---- the server ---- */

const server = http.createServer(async (req, res) => {
  const pathname = pathOf(req);
  const origin = req.headers.origin;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Same-origin needs no CORS at all; this only opens the door for the explicit
  // allowlist, so an unconfigured deployment cannot be called from anywhere.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (pathname === '/healthz') {
      return json(res, 200, { ok: true, version: VERSION, uptime: Math.round(process.uptime()), ...realtime.stats() });
    }
    if (await api(req, res)) return;
    if (pathname.startsWith('/library/')) return serveLibrary(req, res, pathname.slice('/library'.length));
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'method not allowed' });
    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error(`[server] ${req.method} ${pathname}:`, error);
    return json(res, 500, { error: 'server error' });
  }
});

server.on('upgrade', (req, socket, head) => {
  if (!realtime.handleUpgrade(req, socket, head)) socket.destroy();
});
// Browsers keep sockets open; a short keep-alive timeout frees them behind a proxy.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;

server.listen(PORT, HOST, () => {
  console.log(`[gamory] v${VERSION} listening on http://${HOST}:${PORT}`);
  console.log(`[gamory] static   ${STATIC_ROOT}`);
  console.log(`[gamory] data     ${DATA_DIR}`);
  console.log(`[gamory] database ${database.kind === 'postgres' ? 'PostgreSQL (DATABASE_URL)' : `PGlite in ${join(DATA_DIR, 'postgres')} (set DATABASE_URL for a PostgreSQL server)`}`);
  console.log(`[gamory] library  ${LIBRARY_ROOT}`);
  console.log(`[gamory] model    ${process.env.LLM_MODEL1 || '(unset)'} @ ${process.env.LLM_PLATFORM_BASE_URL || '(unset — AI off)'}`);
  console.log(`[gamory] parties  up to ${MAX_PLAYERS} players, ${MAX_ROOMS} rooms`);
});

/** Stop taking connections, tell every party, then leave. */
function shutdown(signal) {
  console.log(`[gamory] ${signal}: shutting down`);
  realtime.close();
  server.close(() => {
    database.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
