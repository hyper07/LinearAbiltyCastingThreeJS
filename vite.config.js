import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { libraryState, startFetch } from './scripts/library/ensure.mjs';
import { createModelStore } from './server/modelgen.mjs';
import { libraryApi } from './server/libraryStore.js';
import { GamesStore, gamesHandler } from './server/gamesStore.js';
import { aiBridge } from './server/api/ai.js';
import { JsonFileStore, fileApi } from './server/api/files.js';
import { createRealtime } from './server/realtime.js';
import { createGameServices } from './server/game/index.js';
import { openDatabase } from './server/db/database.js';
import { createMarket } from './server/market/index.js';
import { createWork } from './server/work/index.js';
import { createMmo } from './server/mmo/index.js';

const LIBRARY_MIME = {
  '.json': 'application/json; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ktx2': 'image/ktx2',
  '.md': 'text/markdown; charset=utf-8'
};

/**
 * Mount one of the shared API handlers (server/api/*) as dev-server and
 * preview-server middleware. The production server (server/server.js) runs
 * the very same handlers, so the client never knows which one it talks to.
 */
function mount(name, handler) {
  const middleware = (server) => {
    server.middlewares.use((req, res, next) => {
      handler(req, res).then((handled) => handled || next(), next);
    });
  };
  return { name, configureServer: middleware, configurePreviewServer: middleware };
}

/**
 * "My models": uploads and AI-generated models (server/modelgen.mjs). The
 * generator API keys stay here, server-side, like the LLM key.
 */
function modelStudio(env) {
  const store = createModelStore({
    libraryRoot: resolve('library'),
    env: { ...process.env, ...env },
    log: (message) => console.log(message)
  });
  return mount('model-studio', (req, res) => store.handle(req, res));
}

/**
 * Levels (`public/levels`) and forged classes (`public/classes`) as files.
 *
 * Under `npm run dev` they are the repo's own folders, so what you save ships
 * with the next build and can be committed. `vite preview` behaves like
 * production: the built set is read-only and saves go to `data/`.
 */
function fileStores() {
  const dev = {
    levels: fileApi(new JsonFileStore({ builtInDir: 'public/levels', userDir: 'public/levels', indexKey: 'campaign', label: 'level' }), { files: 'levels', ordered: true }),
    classes: fileApi(new JsonFileStore({ builtInDir: 'public/classes', userDir: 'public/classes', indexKey: 'classes', maxBytes: 512 * 1024, label: 'class' }), { files: 'classes' })
  };
  const preview = {
    levels: fileApi(new JsonFileStore({ builtInDir: 'dist/levels', userDir: 'data/levels', indexKey: 'campaign', label: 'level' }), { files: 'levels', ordered: true }),
    classes: fileApi(new JsonFileStore({ builtInDir: 'dist/classes', userDir: 'data/classes', indexKey: 'classes', maxBytes: 512 * 1024, label: 'class' }), { files: 'classes' })
  };
  const use = (server, stores) => {
    for (const handler of Object.values(stores)) {
      server.middlewares.use((req, res, next) => handler(req, res).then((handled) => handled || next(), next));
    }
  };
  return {
    name: 'file-stores',
    configureServer: (server) => use(server, dev),
    configurePreviewServer: (server) => use(server, preview)
  };
}

/**
 * Accounts, characters and the rules (server/game) — one instance shared by
 * its routes and the party server — over the same PostgreSQL database as the
 * library: DATABASE_URL's, or PGlite in `data/postgres`.
 */
function gameServices(env, levelDir, getDb) {
  let ready = null;
  const get = () =>
    (ready ??= getDb().then((db) => createGameServices({
      dataDir: resolve('data'),
      db,
      env,
      readLevel: (id) => new JsonFileStore({ builtInDir: levelDir(), userDir: levelDir(), indexKey: 'campaign', label: 'level' }).readText(id),
      log: (line) => console.log(line)
    })));
  return get;
}

/** The game's routes (/api/account, /api/game) over the shared services. */
function gameApi(getGame) {
  return mount('game', async (req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/account') && !path.startsWith('/api/game/')) return false;
    return (await getGame()).handler(req, res);
  });
}

/** The stock market game (/api/market): prices from Alpaca with the keys in .env. */
function marketApi(env, getDb, getGame) {
  let market = null;
  return mount('market', async (req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/market/')) return false;
    market ??= Promise.all([getDb(), getGame()]).then(([db, game]) => createMarket({ db, env, authenticate: (r) => game.authenticate(r), log: (line) => console.log(line) }));
    return (await market).handler(req, res);
  });
}

/** The work game (/api/work) and the wallet (/api/wallet): company news from Alpaca with the keys in .env. */
function workApi(env, getDb, getGame) {
  let work = null;
  return mount('work', async (req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/work/') && path !== '/api/wallet') return false;
    work ??= Promise.all([getDb(), getGame()]).then(([db, game]) => createWork({ db, env, authenticate: (r) => game.authenticate(r), log: (line) => console.log(line) }));
    return (await work).handler(req, res);
  });
}

/** Hearthvale: its character API (/api/mmo) and its worlds (WebSocket /mmo), run by the dev server. */
function mmoApi(env, getDb, getGame) {
  let mmo = null;
  const get = () => (mmo ??= Promise.all([getDb(), getGame()]).then(([db, game]) => createMmo({ db, authenticate: (r) => game.authenticate(r), log: (line) => console.log(line) })));
  const http = mount('mmo', async (req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/mmo/')) return false;
    return (await get()).handler(req, res);
  });
  const attach = (server) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      if ((req.url ?? '').split('?')[0] !== '/mmo') return;
      get().then((m) => m.handleUpgrade(req, socket, head));
    });
    server.httpServer?.on('close', () => mmo?.then((m) => m.close()));
  };
  return [http, { name: 'mmo-worlds', configureServer: attach, configurePreviewServer: attach }];
}

/** Playing together: the room server on the same port, at /ws. */
function realtime(env, getGame) {
  const attach = (server) => {
    const rt = createRealtime({
      maxPlayers: Math.max(2, Math.min(8, Number(env.MAX_PLAYERS) || 4)),
      log: (line) => server.config.logger.info(`[party] ${line}`, { timestamp: true }),
      authenticate: async (req) => (await getGame()).authenticate(req)
    });
    getGame().then((game) => game.setPartyCheck((a, b) => rt.sameParty(a, b)));
    server.httpServer?.on('upgrade', (req, socket, head) => {
      // Vite's own HMR socket takes the other upgrades.
      rt.handleUpgrade(req, socket, head);
    });
    server.httpServer?.on('close', () => rt.close());
  };
  return { name: 'realtime', configureServer: attach, configurePreviewServer: attach };
}

/** Serve Seoul's map tiles (`data/geo/seoul/tiles`, made by `npm run geo:seoul`) at `/geo/seoul/*`. */
function geoTiles() {
  const root = resolve('data/geo/seoul/tiles');
  const middleware = (server) => {
    server.middlewares.use('/geo/seoul', (req, res) => {
      const name = (req.url ?? '/').split('?')[0].slice(1);
      if (!/^(index\.json|terrain\.bin|roads\.bin|\d+_\d+\.bin)$/.test(name)) {
        res.statusCode = 404;
        return res.end();
      }
      let stats = null;
      try {
        stats = statSync(resolve(root, name));
      } catch {
        /* not converted yet */
      }
      if (!stats?.isFile()) {
        res.statusCode = 404;
        return res.end();
      }
      res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json' : 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', name.endsWith('.json') ? 'no-cache' : 'public, max-age=86400');
      createReadStream(resolve(root, name)).pipe(res);
    });
  };
  return { name: 'geo-tiles', configureServer: middleware, configurePreviewServer: middleware };
}

/**
 * Serve the downloaded asset library (`./library`, see `npm run library:fetch`)
 * at `/library/*`. It is gigabytes and git-ignored, so it is deliberately not
 * in `public/` — that would copy all of it into every `vite build`.
 *
 * On `npm run dev`, a missing or half-finished library starts downloading in
 * the background straight away. The server does not wait for it: the game
 * runs on placeholder shapes until the first pack lands, and the World menu
 * shows progress and picks up each pack as it arrives.
 */
function assetLibrary() {
  const root = resolve('library');
  const autoFetch = (server) => {
    const state = libraryState();
    if (!state.needed) return;
    const log = server.config.logger;
    log.info(`[library] ${state.reason} — downloading the open 3D asset library in the background (~7 GB, resumable).`, { timestamp: true });
    log.info('[library] The game works meanwhile; set LIBRARY_AUTO_FETCH=0 in .env to turn this off.', { timestamp: true });
    const child = startFetch({
      background: true,
      // Per-model chatter would drown the dev server; keep progress and problems.
      onLine: (line) => {
        if (/\d+\/\d+$|starting|assets$|models$|failed|skip|Catalog|Downloaded|budget|already running/.test(line)) {
          log.info(`[library] ${line.replace(/^\[library\]\s*/, '')}`, { timestamp: true });
        }
      }
    });
    child.on('close', (code) => {
      log.info(code ? `[library] download stopped (exit ${code}) — it resumes on the next \`npm run dev\`.` : '[library] download complete.', { timestamp: true });
    });
    server.httpServer?.on('close', () => child.kill());
  };
  const middleware = (server) => {
    server.middlewares.use('/library', (req, res, next) => {
      let pathname;
      try {
        pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
      } catch {
        res.statusCode = 400;
        return res.end();
      }
      const file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) {
        res.statusCode = 403;
        return res.end();
      }
      let stats;
      try {
        stats = statSync(file);
      } catch {
        stats = null;
      }
      if (!stats?.isFile()) {
        // A missing catalog is normal before the first fetch; the game falls back.
        res.statusCode = 404;
        return res.end();
      }
      res.setHeader('Content-Type', LIBRARY_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', file.endsWith('catalog.json') ? 'no-cache' : 'public, max-age=86400');
      createReadStream(file).pipe(res);
      void next;
    });
  };
  return {
    name: 'asset-library',
    configureServer: (server) => {
      middleware(server);
      autoFetch(server);
    },
    configurePreviewServer: middleware
  };
}

export default defineConfig(({ mode }) => {
  // Third argument '' loads *every* variable, not just the VITE_ prefixed ones —
  // these must stay server-side, so they are deliberately not exposed to client
  // code through `import.meta.env`.
  const env = loadEnv(mode, process.cwd(), '');
  // The library downloader reads these from the process, so .env can set them too.
  for (const key of ['LIBRARY_AUTO_FETCH', 'LIBRARY_MAX_GB']) {
    if (env[key] !== undefined && process.env[key] === undefined) process.env[key] = env[key];
  }

  // Dev saves levels in the repo; `vite preview` plays the built set like production.
  let levelDir = () => resolve('public', 'levels');
  // One database for the accounts and the library (PGlite lets one opener use a folder).
  let db = null;
  const getDb = () => (db ??= openDatabase({ url: env.DATABASE_URL ?? process.env.DATABASE_URL, dataDir: resolve('data'), log: (line) => console.log(line) }));
  const getGame = gameServices({ ...process.env, ...env }, () => levelDir(), getDb);

  return {
    base: './',
    server: {
      host: '127.0.0.1',
      port: 5173,
      open: false,
      watch: {
        // The asset library is gigabytes of files nobody edits by hand, and a
        // saved level must not reload the page out from under the editor.
        // Absolute paths: a bare `**/library/**` would also ignore src/library.
        ignored: [`${resolve('library')}/**`, `${resolve('public', 'levels')}/**`, `${resolve('public', 'classes')}/**`, `${resolve('data')}/**`]
      }
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 2000
    },
    // Large binary assets (FBX / HDR) live in /public and are served untouched.
    assetsInclude: ['**/*.fbx', '**/*.hdr'],
    plugins: [
      // The AI bridge: the same handler the production server runs, with the key from .env.
      mount('llm-bridge', aiBridge({ ...process.env, ...env }, { identify: async (req) => (await getGame()).authenticate(req) })),
      assetLibrary(),
      geoTiles(),
      fileStores(),
      modelStudio(env),
      libraryApi(getDb),
      // The home page's games: official (the level files) and published (the database).
      (() => {
        let store = null;
        const getStore = async () =>
          (store ??= new GamesStore(await getDb(), new JsonFileStore({ builtInDir: levelDir(), userDir: levelDir(), indexKey: 'campaign', label: 'level' })));
        return mount('games', gamesHandler(getStore, { authenticate: async (req) => (await getGame()).authenticate(req) }));
      })(),
      gameApi(getGame),
      marketApi({ ...process.env, ...env }, getDb, getGame),
      workApi({ ...process.env, ...env }, getDb, getGame),
      ...mmoApi({ ...process.env, ...env }, getDb, getGame),
      realtime({ ...process.env, ...env }, getGame),
      { name: 'level-dir', configurePreviewServer: () => void (levelDir = () => resolve('dist', 'levels')) }
    ]
  };
});
