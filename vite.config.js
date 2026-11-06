import { createReadStream, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { libraryState, startFetch } from './scripts/library/ensure.mjs';

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
 * Level files for the editor and campaign (dev only).
 *
 * Levels live in `public/levels/<id>.json`, with the campaign order in
 * `public/levels/index.json`. Being under `public/`, they ship in every build
 * and are read there as plain static files; only *writing* needs this server,
 * which is why saving works under `npm run dev` and not in a built game.
 *
 *   GET    /api/levels           → the campaign index
 *   POST   /api/levels/<id>      → save (create or replace) a level
 *   DELETE /api/levels/<id>      → delete a level
 *   POST   /api/levels-order     → { order: [ids] } reorder the campaign
 */
function levelStore() {
  const dir = resolve('public', 'levels');
  const indexFile = resolve(dir, 'index.json');
  const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
  const MAX_BYTES = 12 * 1024 * 1024;

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  const body = (req) =>
    new Promise((ok, fail) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BYTES) fail(new Error('level too large'));
        else chunks.push(c);
      });
      req.on('end', () => {
        try {
          ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch (error) {
          fail(error);
        }
      });
      req.on('error', fail);
    });
  const readIndex = async () => {
    try {
      const data = JSON.parse(await readFile(indexFile, 'utf8'));
      return Array.isArray(data.campaign) ? data : { campaign: [] };
    } catch {
      return { campaign: [] };
    }
  };
  // Write-then-rename, so a crash mid-save never leaves half a file behind.
  const atomicWrite = async (file, text) => {
    await mkdir(dir, { recursive: true });
    await writeFile(`${file}.tmp`, text);
    await rename(`${file}.tmp`, file);
  };

  const middleware = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = (req.url ?? '').split('?')[0];
      // Level files are read straight from disk: they are written while the
      // server runs, and Vite's own public-file list only knows files it has
      // seen through the (deliberately unwatched) levels folder.
      const file = url.match(/^\/levels\/([a-z0-9][a-z0-9-]{0,47}|index)\.json$/);
      if (file && req.method === 'GET') {
        try {
          const text = await readFile(resolve(dir, `${file[1]}.json`), 'utf8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          return res.end(text);
        } catch {
          return send(res, 404, { error: 'no such level' });
        }
      }
      if (!url.startsWith('/api/levels')) return next();
      try {
        if (url === '/api/levels' && req.method === 'GET') return send(res, 200, await readIndex());

        if (url === '/api/levels-order' && req.method === 'POST') {
          const { order } = await body(req);
          const index = await readIndex();
          const byId = new Map(index.campaign.map((entry) => [entry.id, entry]));
          const next = (Array.isArray(order) ? order : []).filter((id) => byId.has(id)).map((id) => byId.get(id));
          for (const entry of index.campaign) if (!next.includes(entry)) next.push(entry);
          await atomicWrite(indexFile, JSON.stringify({ campaign: next }, null, 2) + '\n');
          return send(res, 200, { campaign: next });
        }

        const match = url.match(/^\/api\/levels\/([^/]+)$/);
        const id = match ? decodeURIComponent(match[1]) : '';
        if (!ID.test(id)) return send(res, 400, { error: 'bad level id' });
        const file = resolve(dir, `${id}.json`);

        if (req.method === 'POST') {
          const level = await body(req);
          if (level?.id !== id) return send(res, 400, { error: 'id in the URL and the file disagree' });
          await atomicWrite(file, JSON.stringify(level, null, 1) + '\n');
          const index = await readIndex();
          const entry = index.campaign.find((e) => e.id === id);
          if (entry) entry.name = level.name;
          else index.campaign.push({ id, name: level.name });
          await atomicWrite(indexFile, JSON.stringify(index, null, 2) + '\n');
          return send(res, 200, { ok: true, id, campaign: index.campaign });
        }

        if (req.method === 'DELETE') {
          await rm(file, { force: true });
          const index = await readIndex();
          index.campaign = index.campaign.filter((e) => e.id !== id);
          await atomicWrite(indexFile, JSON.stringify(index, null, 2) + '\n');
          return send(res, 200, { ok: true, campaign: index.campaign });
        }
        return send(res, 405, { error: 'method not allowed' });
      } catch (error) {
        return send(res, 500, { error: String(error?.message ?? error) });
      }
    });
  };
  return { name: 'level-store', configureServer: middleware };
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

/**
 * Dev/preview-only bridge to the OpenAI-compatible LLM the sandbox talks to.
 *
 * The browser never sees `LLM_API_KEY`, and never has to negotiate CORS with a
 * box on the LAN: the page posts to same-origin `/api/ai/*` and the Vite server
 * forwards it with the credentials attached. Two routes, both JSON:
 *
 *   GET  /api/ai/status   → { ok, model, models[] }   — is the brain reachable?
 *   POST /api/ai/command  → the raw chat completion    — one planning turn
 *
 * `/api/ai/command` is deliberately thin. The *game* owns the prompt and the
 * JSON schema (see `src/ai/AIDirector.js`) because those describe the world, and
 * the world is not something a build config should know about. All this layer
 * adds is the key, the model default and a timeout.
 *
 * There is no production equivalent on purpose — a static build has nowhere to
 * hide a key. `AIDirector` treats an unreachable bridge as "offline" and falls
 * back to its local intent parser, so a built bundle still understands typed
 * commands, just without the language model.
 */
/** A caller may ask for a longer wait (map design) — never past 3 minutes. */
const requestTimeout = (payload) => {
  const asked = Number(payload?.timeoutMs);
  return Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 5_000), 180_000) : undefined;
};

function llmBridge(env) {
  const baseUrl = (env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, '');
  const apiKey = env.LLM_API_KEY ?? '';
  const defaultModel = env.LLM_MODEL1 ?? '';
  const fastModel = env.LLM_MODEL2 ?? defaultModel;
  /** A local 4B model on a busy machine can take a while to warm up. */
  const TIMEOUT_MS = Number(env.LLM_TIMEOUT_MS) || 45_000;

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const readJson = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        // The prompt is a world snapshot, not an upload — anything this large is
        // a bug or an abuse, and buffering it would be the damage.
        if (size > 512 * 1024) reject(new Error('payload too large'));
        else chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });

  const upstream = async (path, init = {}, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(init.headers ?? {})
        }
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const middleware = (server) => {
    server.middlewares.use('/api/ai', async (req, res, next) => {
      const route = (req.url ?? '').split('?')[0].replace(/\/+$/, '');

      if (!baseUrl) {
        return send(res, 503, {
          error: 'LLM_PLATFORM_BASE_URL is not set — add it to .env and restart the dev server.'
        });
      }

      try {
        if (route === '/status' && req.method === 'GET') {
          const response = await upstream('/models');
          const body = await response.json();
          const models = (body?.data ?? []).map((entry) => entry.id);
          return send(res, response.ok ? 200 : response.status, {
            ok: response.ok,
            model: defaultModel,
            fastModel,
            models
          });
        }

        if (route === '/command' && req.method === 'POST') {
          const payload = await readJson(req);
          const response = await upstream('/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
              model: payload.model || defaultModel,
              messages: payload.messages ?? [],
              temperature: payload.temperature ?? 0.3,
              max_tokens: payload.maxTokens ?? 600,
              ...(payload.schema
                ? {
                    response_format: {
                      type: 'json_schema',
                      json_schema: { name: 'battle_plan', strict: true, schema: payload.schema }
                    }
                  }
                : {}),
              // Qwen3 reasons out loud by default. The game needs one JSON turn
              // in under a second or two, so the scratchpad is switched off here
              // rather than parsed out of the answer downstream.
              chat_template_kwargs: { enable_thinking: false }
            })
          }, requestTimeout(payload));
          const body = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(body);
        }
      } catch (error) {
        const offline = error?.name === 'AbortError';
        return send(res, offline ? 504 : 502, {
          error: offline ? 'The model took too long to answer.' : String(error?.message ?? error)
        });
      }

      return next();
    });
  };

  return {
    name: 'llm-bridge',
    configureServer: middleware,
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
        ignored: [`${resolve('library')}/**`, `${resolve('public', 'levels')}/**`]
      }
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 2000
    },
    // Large binary assets (FBX / HDR) live in /public and are served untouched.
    assetsInclude: ['**/*.fbx', '**/*.hdr'],
    plugins: [llmBridge(env), assetLibrary(), levelStore()]
  };
});
