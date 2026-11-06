import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

/**
 * The AI bridge, as a standalone service.
 *
 * In development, `vite.config.js` runs this same contract as dev-server
 * middleware and there is nothing to deploy. This exists for the other case:
 * a built bundle is static files, static files cannot hold an API key, and a
 * browser talking straight to an OpenAI-compatible box on the LAN would need
 * that key in the page *and* CORS on the box. Neither is acceptable, so the
 * production answer is a small server that does two things:
 *
 *   1. serves `dist/` (when it is there), and
 *   2. proxies `/api/ai/*` to the model with the key attached server-side.
 *
 * Same routes, same request and response shapes as the dev middleware, so the
 * client code cannot tell which one it is talking to — `AIDirector` posts to
 * same-origin `./api/ai/command` in both.
 *
 * No dependencies on purpose. It is ~200 lines of Node built-ins, it starts in
 * milliseconds, and it is the only part of this project that ever sees a
 * credential.
 */

const PORT = Number(process.env.PORT ?? 8787);
const BASE_URL = (process.env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, '');
const API_KEY = process.env.LLM_API_KEY ?? '';
const MODEL = process.env.LLM_MODEL1 ?? '';
const FAST_MODEL = process.env.LLM_MODEL2 ?? MODEL;
/** Where the built client lives. Absent in an API-only deployment. */
const STATIC_ROOT = resolve(process.env.STATIC_ROOT ?? './dist');
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 45_000);
/** Comma-separated origins allowed to call the API cross-site. Empty = none. */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.hdr': 'image/vnd.radiance',
  '.fbx': 'application/octet-stream',
  '.map': 'application/json; charset=utf-8'
};

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

/** Read a JSON body, refusing anything that is not a plausible prompt. */
function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 512 * 1024) {
        reject(new Error('payload too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
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
}

async function upstream(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        ...(init.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function handleApi(req, res, route) {
  if (!BASE_URL) {
    return json(res, 503, { error: 'LLM_PLATFORM_BASE_URL is not set on the server.' });
  }

  try {
    if (route === '/status' && req.method === 'GET') {
      const response = await upstream('/models');
      const body = await response.json();
      return json(res, response.ok ? 200 : response.status, {
        ok: response.ok,
        model: MODEL,
        fastModel: FAST_MODEL,
        models: (body?.data ?? []).map((entry) => entry.id)
      });
    }

    if (route === '/command' && req.method === 'POST') {
      const payload = await readJson(req);
      const response = await upstream('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: payload.model || MODEL,
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
          // The game needs one JSON turn in about a second; Qwen3's visible
          // scratchpad is pure latency here.
          chat_template_kwargs: { enable_thinking: false }
        })
      });
      const body = await response.text();
      res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(body);
    }
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return json(res, timedOut ? 504 : 502, {
      error: timedOut ? 'The model took too long to answer.' : String(error?.message ?? error)
    });
  }

  return json(res, 404, { error: 'unknown route' });
}

/** Serve one file out of `STATIC_ROOT`, with the traversal guard. */
async function serveStatic(req, res, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(STATIC_ROOT, relative);
  if (!filePath.startsWith(STATIC_ROOT)) return json(res, 403, { error: 'forbidden' });

  try {
    let data;
    try {
      data = await readFile(filePath);
    } catch {
      // Directory, or a client-side route: fall back to the entry document.
      filePath = join(STATIC_ROOT, 'index.html');
      data = await readFile(filePath);
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const origin = req.headers.origin;

  // Same-origin needs no CORS at all; this only opens the door for the explicit
  // allowlist, so an unconfigured deployment cannot be called from anywhere.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === '/healthz') return json(res, 200, { ok: true });

  if (url.pathname.startsWith('/api/ai')) {
    return handleApi(req, res, url.pathname.slice('/api/ai'.length).replace(/\/+$/, ''));
  }

  return serveStatic(req, res, url.pathname === '/' ? '/index.html' : url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bridge] listening on :${PORT}`);
  console.log(`[bridge] model     ${MODEL || '(unset)'} @ ${BASE_URL || '(unset)'}`);
  console.log(`[bridge] static    ${STATIC_ROOT}`);
});
