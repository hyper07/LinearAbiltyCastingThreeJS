import { RateLimiter, clientIp, json, pathOf, readJson } from './http.js';
import { CREATION_TASKS, PLAN_IDS, planById, taskOf } from '../../src/platform/plans.js';
import { lessonById } from '../../src/arcademia/content/index.js';
import { floorByN } from '../../src/arcademia/floors.js';

/** The languages the tutor speaks (the game's languages), and how to tell the model. */
export const TUTOR_LANGUAGES = {
  en: 'English',
  ko: 'Korean (한국어)',
  es: 'Spanish (español)',
  ja: 'Japanese (日本語)',
  zh: 'Simplified Chinese (简体中文)'
};
export const tutorLocale = (lc) => (Object.hasOwn(TUTOR_LANGUAGES, String(lc)) ? String(lc) : 'en');
/** What the tutor route says when it can't answer, in each language (`code` lets the page use its own words). */
export const TUTOR_TEXT = {
  plus: {
    en: 'Professor Hoot, the AI tutor, is part of Plus. The hints and worked answers are always here for you.',
    ko: 'AI 선생님 후트 교수님은 Plus에서 만날 수 있어요. 힌트와 풀이는 언제나 여기 있어요.',
    es: 'El profesor Hoot, el tutor con IA, es parte de Plus. Las pistas y las soluciones paso a paso siempre están aquí.',
    ja: 'AIの先生、フート教授はPlusで使えます。ヒントと解き方はいつでもここにありますよ。',
    zh: 'AI 小老师胡特教授属于 Plus 功能。提示和解题步骤一直都在这里哦。'
  },
  resting: {
    en: 'Professor Hoot is resting right now. Try the hint and worked answer.',
    ko: '후트 교수님은 지금 쉬고 있어요. 힌트와 풀이를 먼저 봐요.',
    es: 'El profesor Hoot está descansando ahora. Prueba la pista y la solución paso a paso.',
    ja: 'フート教授はいま休けい中です。ヒントと解き方を見てみてね。',
    zh: '胡特教授正在休息。先看看提示和解题步骤吧。'
  },
  busy: {
    en: 'Professor Hoot needs a moment to think — try again soon.',
    ko: '후트 교수님이 잠깐 생각 중이에요. 조금 뒤에 다시 물어봐요.',
    es: 'El profesor Hoot necesita un momento para pensar. Vuelve a intentarlo pronto.',
    ja: 'フート教授はちょっと考え中です。すこししてからもう一度きいてね。',
    zh: '胡特教授需要想一想，过一会儿再问吧。'
  },
  ask: {
    en: 'Ask a question about this lesson.',
    ko: '이 수업에 대해 질문해 봐요.',
    es: 'Haz una pregunta sobre esta lección.',
    ja: 'このレッスンについて質問してね。',
    zh: '问一个关于这节课的问题吧。'
  }
};
const tutorText = (code, lc) => TUTOR_TEXT[code][tutorLocale(lc)];

/** What a child may type to the tutor, and what of the lesson goes with it. */
export const TUTOR_LIMITS = { question: 300, context: 400, turns: 4, reading: 1200 };

/** Anything that looks like contact details is taken out before a message leaves the server. */
export function scrub(text, max) {
  return String(text ?? '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[hidden]')
    .replace(/(\+?\d[\d\s().-]{6,}\d)/g, '[hidden]')
    .replace(/https?:\/\/\S+/g, '[link]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * The tutor's instructions, written here and never by the page: who it is,
 * who it talks to, and the lesson it may talk about.
 */
export function tutorMessages({ lessonId, question, step = '', history = [], locale = 'en' }) {
  const lesson = lessonById(String(lessonId ?? ''));
  if (!lesson) return null;
  const ask = scrub(question, TUTOR_LIMITS.question);
  if (!ask) return null;
  const floor = floorByN(lesson.floor);
  const reading = lesson.reading.map((c) => `${c.title}: ${c.text}`).join(' ').slice(0, TUTOR_LIMITS.reading);
  const system = [
    'You are Professor Hoot, a kind, patient owl who tutors children inside a learning game called AI Arcademia.',
    `You are talking with a child of about ${floor?.ages ?? '6–13'} years old. Use short sentences and words they know. Reply in at most 3 short sentences (about 60 words).`,
    `Today's lesson: "${lesson.title}" (${lesson.subject}, topic: ${lesson.topicName}). What the lesson teaches: ${reading}`,
    'How you help: give a hint or a guiding question first, and never say the final answer inside a hint. Only give the full answer if the child has already had a hint in this chat and still asks; then explain why it is right, step by step.',
    'Write plain sentences: no markdown, no lists, no headings, at most one emoji.',
    'Stay on school learning, and mostly on this lesson. If the child asks about something unsafe, scary, grown-up, personal or off-topic, kindly say it is not something you can help with here and steer back to the lesson; suggest asking a trusted grown-up when that fits.',
    'Never ask for or repeat personal information (names, age, address, school, phone, photos, passwords). Never give links. Never pretend to be a real person.',
    'Be accurate. If you are not sure, say so. Be warm and encouraging; praise effort.',
    `Always answer in ${TUTOR_LANGUAGES[tutorLocale(locale)]}, in simple, natural words a child who speaks it understands, even if the lesson text above is in English.`
  ].join('\n');
  const messages = [{ role: 'system', content: system }];
  const context = scrub(step, TUTOR_LIMITS.context);
  for (const turn of (Array.isArray(history) ? history : []).slice(-TUTOR_LIMITS.turns)) {
    const role = turn?.role === 'tutor' ? 'assistant' : 'user';
    const content = scrub(turn?.text, TUTOR_LIMITS.question);
    if (content) messages.push({ role, content });
  }
  messages.push({ role: 'user', content: context ? `(I am on this part of the lesson: ${context})\n${ask}` : ask });
  return messages;
}

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

  /**
   * GET  /api/ai/tutor   → { plan, allowed, available }
   * POST /api/ai/tutor   { lessonId, question, step?, history? } → { answer }
   * Free: 403 with `upgrade`. No model: 503 with `resting` (the game shows the
   * prebuilt hints instead). The child's words are capped and scrubbed.
   */
  const tutorLimiter = new RateLimiter(Number(env.AI_TUTOR_PER_MIN) || 8, { burst: 4 });
  /** The language a request asks for: ?locale= on the URL (the body's locale is read with the body). */
  const lcOf = (req) => tutorLocale(new URL(req.url ?? '/', 'http://x').searchParams.get('locale'));
  async function tutor(req, res) {
    let lc = lcOf(req);
    const { who, plan } = await caller(req);
    const cap = plan.maxTokens.tutor ?? 0;
    const endpoint = standard.baseUrl ? standard : premium;
    if (req.method === 'GET') {
      json(res, 200, { plan: plan.id, allowed: cap > 0, available: Boolean(endpoint) });
      return true;
    }
    if (req.method !== 'POST') {
      json(res, 404, { error: 'unknown AI route' });
      return true;
    }
    if (!cap) {
      json(res, 403, { error: tutorText('plus', lcOf(req)), code: 'plus', upgrade: true });
      return true;
    }
    if (!endpoint) {
      json(res, 503, { error: tutorText('resting', lcOf(req)), code: 'resting', resting: true });
      return true;
    }
    if (!tutorLimiter.take(who)) {
      json(res, 429, { error: tutorText('busy', lcOf(req)), code: 'busy' });
      return true;
    }
    try {
      const payload = await readJson(req, 16 * 1024);
      lc = tutorLocale(payload?.locale);
      const messages = tutorMessages({ ...(payload ?? {}), locale: lc });
      if (!messages) {
        json(res, 400, { error: tutorText('ask', lc), code: 'ask' });
        return true;
      }
      const response = await upstream(endpoint, '/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: endpoint.model,
          messages,
          temperature: 0.4,
          max_tokens: cap,
          ...(endpoint.hosted ? {} : { chat_template_kwargs: { enable_thinking: false } })
        })
      });
      if (!response.ok) {
        json(res, 503, { error: tutorText('resting', lc), code: 'resting', resting: true });
        return true;
      }
      const body = await response.json().catch(() => ({}));
      const answer = String(body?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().slice(0, 900);
      if (!answer) {
        json(res, 503, { error: tutorText('resting', lc), code: 'resting', resting: true });
        return true;
      }
      json(res, 200, { answer });
    } catch (error) {
      json(res, 503, { error: tutorText('resting', lc), code: 'resting', resting: true, detail: error?.name === 'AbortError' ? 'timeout' : undefined });
    }
    return true;
  }

  return async (req, res) => {
    const path = pathOf(req);
    if (!path.startsWith('/api/ai')) return false;
    const route = path.slice('/api/ai'.length).replace(/\/+$/, '');

    // AI Arcademia's tutor: Plus only, decided here whether or not a model is
    // running — a free account is told so, not that the model is off.
    if (route === '/tutor') return tutor(req, res);

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
        if (task === 'tutor' && cap) {
          // The tutor's prompt is the server's (POST /api/ai/tutor), never the page's.
          json(res, 400, { error: 'Ask the tutor at /api/ai/tutor.' });
          return true;
        }
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
