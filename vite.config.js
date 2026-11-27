import { createReadStream, existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite';
import { libraryState, startFetch } from './scripts/library/ensure.mjs';
import { createModelStore } from './server/modelgen.mjs';
import { libraryApi } from './server/libraryStore.js';
import { GamesStore, gamesHandler } from './server/gamesStore.js';
import { releasesHandler, draftViewer } from './server/releases.js';
import { packageGames } from './server/gamePackages.js';
import { ChannelStore, channelHandler } from './server/channelStore.js';
import { LearningStore, learningHandler } from './server/learningStore.js';
import { VoiceStore, voiceHandler } from './server/voiceStore.js';
import { aiBridge } from './server/api/ai.js';
import { JsonFileStore, fileApi } from './server/api/files.js';
import { createRealtime } from './server/realtime.js';
import { createGameServices } from './server/game/index.js';
import { openDatabase } from './server/db/database.js';
import { createMarket } from './server/market/index.js';
import { createWork } from './server/work/index.js';
import { createMmo } from './server/mmo/index.js';
import { createFps } from './server/fps/index.js';
import { createStudio } from './server/studio/index.js';

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

/**
 * AI Arcademia's voice studio (/api/voice, voice-studio.html) and the
 * recordings at /audio/voice/ — from VOICE_DIR (default public/audio/voice,
 * so what is recorded under `npm run dev` ships with the next build). With no
 * VOICE_STUDIO_ADMIN_ID / _PASSWORD (else ADMIN_ACCOUNTS / ADMIN_PASSWORD) set, the dev server lets this machine in;
 * `vite preview` and production always ask for the admin.
 */
function voiceStudio(env, getDb) {
  const voiceDir = resolve(env.VOICE_DIR ?? process.env.VOICE_DIR ?? resolve('public', 'audio', 'voice'));
  let store = null;
  const getStore = async () => (store ??= new VoiceStore(await getDb(), { voiceDir }));
  const files = (server) => {
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? '').split('?')[0];
      if (!path.startsWith('/audio/voice/')) return next();
      let file;
      try {
        file = resolve(voiceDir, `.${decodeURIComponent(path.slice('/audio/voice'.length))}`);
      } catch {
        return next();
      }
      if (!file.startsWith(voiceDir + sep)) return next();
      let info;
      try {
        info = statSync(file);
      } catch {
        return next();
      }
      if (!info.isFile()) return next();
      const type = { '.json': 'application/json; charset=utf-8', '.webm': 'audio/webm', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' }[extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
      createReadStream(file).pipe(res);
    });
  };
  const api = (allowLocal) => (server) => {
    const handler = voiceHandler(getStore, { env: { ...process.env, ...env }, allowLocal });
    server.middlewares.use((req, res, next) => handler(req, res).then((handled) => handled || next(), next));
  };
  return {
    name: 'voice-studio',
    configureServer: (server) => {
      files(server);
      api(true)(server);
    },
    configurePreviewServer: (server) => {
      files(server);
      api(false)(server);
    }
  };
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

/** Breachline's rooms and matches (WebSocket /fps), run by the dev server. */
function fpsRooms(getGame) {
  const attach = (server) => {
    const fps = createFps({ authenticate: async (req) => (await getGame()).authenticate(req), log: (line) => console.log(line) });
    server.httpServer?.on('upgrade', (req, socket, head) => {
      fps.handleUpgrade(req, socket, head);
    });
    server.httpServer?.on('close', () => fps.close());
  };
  return { name: 'fps-rooms', configureServer: attach, configurePreviewServer: attach };
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
      if (!/^(index\.json|terrain\.bin|roads\.bin|alleys\.bin|\d+_\d+\.bin)$/.test(name)) {
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
      sources: state.sources,
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

/**
 * Circuit Lab (apps/circuitlab): its own React + TypeScript app with its own
 * dependencies (scripts/circuitlab.mjs installs them). `npm run dev` serves it
 * at /circuitlab/ through a nested Vite dev server in middleware mode, started
 * on the first request; `npm run build` writes it to dist/circuitlab, which
 * `vite preview` and the production server serve as plain files.
 */
function circuitLab() {
  const app = resolve('apps/circuitlab');
  let nested = null;
  const start = (server) =>
    (nested ??= (async () => {
      const { ensure } = await import('./scripts/circuitlab.mjs');
      ensure();
      const { pathToFileURL } = await import('node:url');
      const vite = await import(pathToFileURL(resolve(app, 'node_modules/vite/dist/node/index.js')).href);
      const inner = await vite.createServer({
        configFile: resolve(app, 'vite.config.ts'),
        root: app,
        base: '/circuitlab/',
        appType: 'spa',
        logLevel: 'warn',
        server: { middlewareMode: true, hmr: { port: Number(process.env.CIRCUITLAB_HMR_PORT) || 24679 } }
      });
      server.httpServer?.on('close', () => inner.close());
      return inner;
    })());
  return {
    name: 'circuit-lab',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path === '/circuitlab') {
          res.writeHead(302, { Location: '/circuitlab/' });
          return res.end();
        }
        if (!path.startsWith('/circuitlab/')) return next();
        start(server).then((inner) => inner.middlewares(req, res, next), next);
      });
    }
  };
}

/**
 * Folders the dev server may serve files from: the project, plus wherever its symlinks
 * really point. A git worktree (an agent's, under .claude/worktrees/) links node_modules to
 * the main checkout, so a font from @fontsource resolves outside the project and Vite used
 * to answer 403 — every agent then wrote a temporary config. Allowing the real folders
 * fixes that for good (`npm run wt:setup` makes the links).
 */
function servedFolders() {
  const out = new Set([searchForWorkspaceRoot(process.cwd())]);
  for (const name of ['node_modules', 'library']) {
    try {
      if (existsSync(resolve(name))) out.add(realpathSync(resolve(name)));
    } catch {
      /* a broken link: nothing to allow */
    }
  }
  return [...out];
}

/**
 * `npm run game:dev -- <game>` sets GAME_DEV=<code>: the dev server then stops watching the
 * other game packages' folders (and the legacy games under src/ that the platform shell does
 * not need to reload for), so a save in this game reloads in a moment.
 */
function gameDevIgnored() {
  const code = process.env.GAME_DEV;
  if (!code) return [];
  const out = [];
  try {
    for (const d of readdirSync(resolve('games'), { withFileTypes: true })) if (d.isDirectory() && d.name !== code) out.push(`${resolve('games', d.name)}/**`);
  } catch {
    /* no games folder */
  }
  return out;
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
  // Kept on globalThis, not in this function: Vite re-runs the config when a server file it
  // imports changes, and a second PGlite opened on the same folder overwrites the first one's
  // write-ahead log (that corrupted data/postgres once).
  const getDb = () => (globalThis.__gamoryDb ??= openDatabase({ url: env.DATABASE_URL ?? process.env.DATABASE_URL, dataDir: resolve('data'), log: (line) => console.log(line) }));
  const getGame = gameServices({ ...process.env, ...env }, () => levelDir(), getDb);

  return {
    base: './',
    server: {
      host: '127.0.0.1',
      port: 5173,
      open: false,
      fs: { allow: servedFolders() },
      watch: {
        // The asset library is gigabytes of files nobody edits by hand, and a
        // saved level must not reload the page out from under the editor.
        // Absolute paths: a bare `**/library/**` would also ignore src/library.
        ignored: [`${resolve('library')}/**`, `${resolve('apps')}/**`,`${resolve('public', 'levels')}/**`, `${resolve('public', 'classes')}/**`, `${resolve('public', 'audio', 'voice')}/**`, `${resolve('public', 'audio', 'voice-gen')}/**`, `${resolve('data')}/**`, `${resolve('releases')}/**`, ...gameDevIgnored()]
      }
    },
    build: {
      target: 'es2022',
      // The app, AI Arcademia's read-only report page for parents (a link that opens without the game)
      // and its voice studio (admin only: real people record the game's lines there).
      rollupOptions: { input: { main: resolve('index.html'), 'parent-report': resolve('parent-report.html'), 'voice-studio': resolve('voice-studio.html') } },
      sourcemap: true,
      chunkSizeWarningLimit: 2000
    },
    // Large binary assets (FBX / HDR) live in /public and are served untouched.
    assetsInclude: ['**/*.fbx', '**/*.hdr'],
    // Circuit Lab (apps/) is a separate app with its own dependencies: keep it out of the platform's dep scan.
    optimizeDeps: { entries: ['**/*.html', '!apps/**'] },
    plugins: [
      circuitLab(),
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
          (store ??= new GamesStore(await getDb(), new JsonFileStore({ builtInDir: levelDir(), userDir: levelDir(), indexKey: 'campaign', label: 'level' }), {
            packages: packageGames({ gamesDir: resolve('games'), releasesDir: resolve(env.RELEASES_DIR ?? 'releases') })
          }));
        let channels = null;
        const getChannels = async () => (channels ??= new ChannelStore(await getDb(), await getStore()));
        let learning = null;
        const getLearning = async () => (learning ??= new LearningStore(await getDb()));
        return [
          mount('learning', learningHandler(getLearning, { authenticate: async (req) => (await getGame()).authenticate(req) })),
          mount('games', gamesHandler(getStore, { authenticate: async (req) => (await getGame()).authenticate(req), canSeeDrafts: draftViewer({ env: { ...process.env, ...env }, allowLocal: true, authenticate: async (req) => (await getGame()).authenticate(req) }) })),
          // Game packages: production releases at /releases/, and the admin's changes / deploy / rollback.
          mount('releases', releasesHandler({ repo: resolve('.'), releasesDir: resolve(env.RELEASES_DIR ?? 'releases'), env: { ...process.env, ...env }, allowLocal: true, authenticate: async (req) => (await getGame()).authenticate(req), log: (line) => console.log(line) })),
          mount('channels', channelHandler(getChannels, { authenticate: async (req) => (await getGame()).authenticate(req) })),
          // The Game Studio (server/studio): the same handler as production; this machine is the admin when none is set.
          mount('studio', (() => {
            let studio = null;
            const get = () =>
              (studio ??= createStudio({
                getDb,
                repo: resolve('.'),
                gamesDir: resolve('games'),
                libraryRoot: resolve('library'),
                publicDir: resolve('public'),
                env: { ...process.env, ...env },
                allowLocal: true,
                authenticate: async (req) => (await getGame()).authenticate(req),
                parentGate: { hasPin: async (account) => (await getLearning()).hasPin(account), check: async (account, key) => (await getLearning()).parentOf(account, key) },
                log: (line) => console.log(line)
              }));
            return (req, res) => get().handler(req, res);
          })())
        ];
      })(),
      gameApi(getGame),
      voiceStudio(env, getDb),
      marketApi({ ...process.env, ...env }, getDb, getGame),
      workApi({ ...process.env, ...env }, getDb, getGame),
      ...mmoApi({ ...process.env, ...env }, getDb, getGame),
      fpsRooms(getGame),
      realtime({ ...process.env, ...env }, getGame),
      { name: 'level-dir', configurePreviewServer: () => void (levelDir = () => resolve('dist', 'levels')) }
    ]
  };
});
