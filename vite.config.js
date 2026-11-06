import { defineConfig, loadEnv } from 'vite';

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
function llmBridge(env) {
  const baseUrl = (env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, '');
  const apiKey = env.LLM_API_KEY ?? '';
  const defaultModel = env.LLM_MODEL1 ?? '';
  const fastModel = env.LLM_MODEL2 ?? defaultModel;
  /** A local 4B model on a busy machine can take a while to warm up. */
  const TIMEOUT_MS = 45_000;

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

  const upstream = async (path, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
          });
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

  return {
    base: './',
    server: {
      host: '127.0.0.1',
      port: 5173,
      open: false
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 2000
    },
    // Large binary assets (FBX / HDR) live in /public and are served untouched.
    assetsInclude: ['**/*.fbx', '**/*.hdr'],
    plugins: [llmBridge(env)]
  };
});
