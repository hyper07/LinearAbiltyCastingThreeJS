import { RateLimiter, clientIp, json, pathOf, readJson } from './http.js';
import { CREATION_TASKS, PLAN_IDS, planById, taskOf } from '../../src/platform/plans.js';

/**
 * The bridge to the OpenAI-compatible models the game talks to (LM Studio,
 * Ollama, vLLM, a hosted API…).
 *
 * The browser never sees a key and never negotiates CORS with the model's
 * box: the page posts to same-origin `/api/ai/*` and this forwards it with the
 * credentials attached. Two routes, both JSON:
 *
 *   GET  /api/ai/status   → { ok, model, models[], plan }   — is the brain reachable? what may I do?
 *   POST /api/ai/command  → the raw chat completion          — one planning turn
 *
 * `/api/ai/command` is deliberately thin. The *game* owns the prompt and the
 * JSON schema (src/ai/*, src/blueprints/*) because those describe the world.
 * What this adds is everything that costs money or could be abused:
 *
 * - **The model is the server's choice, never the page's.** The request says
 *   what it is for (`task`); the account's plan (src/platform/plans.js) decides
 *   the model: Plus creations go to the premium model (LLM_PREMIUM_*), the rest
 *   to the standard one.
 * - **Output tokens are capped per plan and task**, and AI creations (games,
 *   maps, classes) are counted per account, or per address when signed out,
 *   per UTC day.
 * - **Custom builds** (`task: 'game-custom'`) are refused unless the plan has them.
 * - A per-address rate limit on top, so a public server is not a free proxy.
 *
 * Used by the dev server (vite.config.js) and the production server
 * (server/server.js) alike, so the client cannot tell them apart.
 *
 * @param {object} env
 * @param {{ identify?: (req) => Promise<{ id: string|number, plan?: string }|null>|object|null }} [options]
 *        who is asking: the signed-in account (server/game), or null
 */
export function aiBridge(env = process.env, { identify = async () => null } = {}) {
  const standard = {
    baseUrl: (env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, ''),
    apiKey: env.LLM_API_KEY ?? '',
    model: env.LLM_MODEL1 ?? ''
  };
  const fastModel = env.LLM_MODEL2 ?? standard.model;
  const premiumBase = (env.LLM_PREMIUM_BASE_URL ?? '').replace(/\/+$/, '');
  /** The expensive model for paying accounts; without LLM_PREMIUM_MODEL, Plus uses the standard one. */
  const premium = env.LLM_PREMIUM_MODEL
    ? {
        baseUrl: premiumBase || standard.baseUrl,
        // A separate provider needs its own key; the same box keeps the standard one.
        apiKey: env.LLM_PREMIUM_API_KEY ?? (premiumBase && premiumBase !== standard.baseUrl ? '' : standard.apiKey),
        model: env.LLM_PREMIUM_MODEL,
        premium: true,
        /** On another provider: send only standard OpenAI fields. */
        hosted: Boolean(premiumBase && premiumBase !== standard.baseUrl)
      }
    : null;
  /** Signed out, or an account without a plan (the dev server can set plus to try it). */
  const defaultPlan = PLAN_IDS.includes(env.AI_DEFAULT_PLAN) ? env.AI_DEFAULT_PLAN : 'free';
  /** A local 4B model on a busy machine can take a while to warm up. */
  const timeoutMs = Number(env.LLM_TIMEOUT_MS) || 45_000;
  const limiter = new RateLimiter(Number(env.AI_RATE_PER_MIN) || 30, { burst: Number(env.AI_RATE_BURST) || 10 });
  /** AI creations today: who → { day, n }. In memory: a restart forgives the day. */
  const usage = new Map();
  const today = () => new Date().toISOString().slice(0, 10);
  const used = (who) => {
    const entry = usage.get(who);
    return entry && entry.day === today() ? entry.n : 0;
  };
  const count = (who) => {
    const day = today();
    const entry = usage.get(who);
    if (!entry || entry.day !== day) usage.set(who, { day, n: 1 });
    else entry.n += 1;
    if (usage.size > 50_000) for (const [key, value] of usage) if (value.day !== day) usage.delete(key);
  };

  /** Who is asking and what they may do. */
  const caller = async (req) => {
    let account = null;
    try {
      account = await identify(req);
    } catch {
      account = null;
    }
    const plan = planById(account?.plan ?? defaultPlan);
    return { who: account ? `account:${account.id}` : `ip:${clientIp(req)}`, plan, signedIn: Boolean(account) };
  };

  /** The endpoint a task runs on for a plan. Fights and talk stay on the standard (fast) model. */
  const endpointFor = (plan, task) => {
    if (plan.model === 'premium' && premium && CREATION_TASKS.has(task)) return premium;
    return standard.baseUrl ? standard : premium;
  };

  /** A caller may ask for a longer wait (map design) — never past 3 minutes. */
  const requestTimeout = (payload) => {
    const asked = Number(payload?.timeoutMs);
    return Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 5_000), 180_000) : timeoutMs;
  };

  const upstream = async (endpoint, path, init = {}, ms = timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(`${endpoint.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
          ...(init.headers ?? {})
        }
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const planView = (plan, who) => ({
    id: plan.id,
    name: plan.name,
    features: plan.features,
    buildsPerDay: plan.buildsPerDay,
    buildsLeft: Math.max(0, plan.buildsPerDay - used(who)),
    premium: Boolean(premium && plan.model === 'premium')
  });

  return async (req, res) => {
    const path = pathOf(req);
    if (!path.startsWith('/api/ai')) return false;
    const route = path.slice('/api/ai'.length).replace(/\/+$/, '');

    if (!standard.baseUrl && !premium) {
      json(res, 503, { error: 'LLM_PLATFORM_BASE_URL is not set — the AI model is off on this server.' });
      return true;
    }

    try {
      if (route === '/status' && req.method === 'GET') {
        const { who, plan, signedIn } = await caller(req);
        const endpoint = endpointFor(plan, 'other');
        if (!endpoint) {
          json(res, 503, { error: 'The AI model is off on this server.', plan: planView(plan, who) });
          return true;
        }
        const response = await upstream(endpoint, '/models');
        const body = await response.json().catch(() => ({}));
        json(res, response.ok ? 200 : response.status, {
          ok: response.ok,
          model: endpoint.model,
          fastModel,
          models: (body?.data ?? []).map((entry) => entry.id),
          signedIn,
          plan: planView(plan, who)
        });
        return true;
      }

      if (route === '/command' && req.method === 'POST') {
        const { who, plan } = await caller(req);
        if (!limiter.take(clientIp(req))) {
          json(res, 429, { error: 'Too many requests to the model — wait a moment.' });
          return true;
        }
        const payload = await readJson(req, 512 * 1024);
        const task = taskOf(payload.task);
        const cap = plan.maxTokens[task] ?? plan.maxTokens.other;
        if (!cap) {
          json(res, 403, { error: task === 'game-custom' ? 'Custom builds are part of Plus.' : 'Your plan does not include this.', upgrade: true });
          return true;
        }
        if (CREATION_TASKS.has(task)) {
          if (used(who) >= plan.buildsPerDay) {
            json(res, 429, { error: `That's all ${plan.buildsPerDay} AI builds for today. Building from the menus still works.`, upgrade: plan.id === 'free' });
            return true;
          }
          count(who);
        }
        const endpoint = endpointFor(plan, task);
        if (!endpoint) {
          json(res, 503, { error: 'The AI model is off on this server.' });
          return true;
        }
        const response = await upstream(
          endpoint,
          '/chat/completions',
          {
            method: 'POST',
            body: JSON.stringify({
              // The page never names the model: a paid model is the server's to spend.
              model: endpoint.model,
              messages: payload.messages ?? [],
              temperature: payload.temperature ?? 0.3,
              max_tokens: Math.min(cap, payload.maxTokens ?? 600),
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
              // rather than parsed out of the answer downstream. Only the local
              // box gets the switch; a hosted premium API may refuse unknown fields.
              ...(endpoint.hosted ? {} : { chat_template_kwargs: { enable_thinking: false } })
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
