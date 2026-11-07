import { RateLimiter, clientIp, json, pathOf, readJson } from './http.js';

/**
 * The bridge to the OpenAI-compatible model the game talks to (LM Studio,
 * Ollama, vLLM, a hosted API…).
 *
 * The browser never sees the key and never negotiates CORS with the model's
 * box: the page posts to same-origin `/api/ai/*` and this forwards it with the
 * credentials attached. Two routes, both JSON:
 *
 *   GET  /api/ai/status   → { ok, model, models[] }   — is the brain reachable?
 *   POST /api/ai/command  → the raw chat completion    — one planning turn
 *
 * `/api/ai/command` is deliberately thin. The *game* owns the prompt and the
 * JSON schema (src/ai/*) because those describe the world. All this adds is
 * the key, the model default, a timeout and a per-address rate limit — a
 * public server would otherwise be a free proxy to someone's model.
 *
 * Used by the dev server (vite.config.js) and the production server
 * (server/server.js) alike, so the client cannot tell them apart.
 */
export function aiBridge(env = process.env) {
  const baseUrl = (env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, '');
  const apiKey = env.LLM_API_KEY ?? '';
  const defaultModel = env.LLM_MODEL1 ?? '';
  const fastModel = env.LLM_MODEL2 ?? defaultModel;
  /** A local 4B model on a busy machine can take a while to warm up. */
  const timeoutMs = Number(env.LLM_TIMEOUT_MS) || 45_000;
  const limiter = new RateLimiter(Number(env.AI_RATE_PER_MIN) || 30, { burst: 10 });

  /** A caller may ask for a longer wait (map design) — never past 3 minutes. */
  const requestTimeout = (payload) => {
    const asked = Number(payload?.timeoutMs);
    return Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 5_000), 180_000) : timeoutMs;
  };

  const upstream = async (path, init = {}, ms = timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
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

  return async (req, res) => {
    const path = pathOf(req);
    if (!path.startsWith('/api/ai')) return false;
    const route = path.slice('/api/ai'.length).replace(/\/+$/, '');

    if (!baseUrl) {
      json(res, 503, { error: 'LLM_PLATFORM_BASE_URL is not set — the AI model is off on this server.' });
      return true;
    }

    try {
      if (route === '/status' && req.method === 'GET') {
        const response = await upstream('/models');
        const body = await response.json().catch(() => ({}));
        json(res, response.ok ? 200 : response.status, {
          ok: response.ok,
          model: defaultModel,
          fastModel,
          models: (body?.data ?? []).map((entry) => entry.id)
        });
        return true;
      }

      if (route === '/command' && req.method === 'POST') {
        if (!limiter.take(clientIp(req))) {
          json(res, 429, { error: 'Too many requests to the model — wait a moment.' });
          return true;
        }
        const payload = await readJson(req, 512 * 1024);
        const response = await upstream(
          '/chat/completions',
          {
            method: 'POST',
            body: JSON.stringify({
              model: payload.model || defaultModel,
              messages: payload.messages ?? [],
              temperature: payload.temperature ?? 0.3,
              max_tokens: Math.min(4000, payload.maxTokens ?? 600),
              ...(payload.schema
                ? {
                    response_format: {
                      type: 'json_schema',
                      json_schema: { name: 'battle_plan', strict: true, schema: payload.schema }
                    }
                  }
                : {}),
              // Qwen3 reasons out loud by default. The game needs one JSON turn
              // in a second or two, so the scratchpad is switched off here
              // rather than parsed out of the answer downstream.
              chat_template_kwargs: { enable_thinking: false }
            })
          },
          requestTimeout(payload)
        );
        const body = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(body);
        return true;
      }
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      json(res, timedOut ? 504 : 502, {
        error: timedOut ? 'The model took too long to answer.' : String(error?.message ?? error)
      });
      return true;
    }

    json(res, 404, { error: 'unknown AI route' });
    return true;
  };
}
