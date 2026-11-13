/**
 * The server's own calls to the AI model (the browser's go through ai.js).
 * Same settings: LLM_PLATFORM_BASE_URL, LLM_API_KEY, LLM_MODEL2 (the fast
 * model; LLM_MODEL1 without it), and LLM_PREMIUM_* for `premium: true`.
 *
 * `chat({ messages, schema, maxTokens, premium })` → the parsed JSON answer,
 * or throws. Callers always have a fallback: the model may be off or slow.
 */
export function serverModel(env = process.env) {
  const base = (env.LLM_PLATFORM_BASE_URL ?? '').replace(/\/+$/, '');
  const standard = base && (env.LLM_MODEL2 || env.LLM_MODEL1) ? { baseUrl: base, apiKey: env.LLM_API_KEY ?? '', model: env.LLM_MODEL2 || env.LLM_MODEL1, hosted: false } : null;
  const premiumBase = (env.LLM_PREMIUM_BASE_URL ?? '').replace(/\/+$/, '');
  const premium = env.LLM_PREMIUM_MODEL
    ? {
        baseUrl: premiumBase || base,
        apiKey: env.LLM_PREMIUM_API_KEY ?? (premiumBase && premiumBase !== base ? '' : env.LLM_API_KEY ?? ''),
        model: env.LLM_PREMIUM_MODEL,
        hosted: Boolean(premiumBase && premiumBase !== base)
      }
    : null;
  const timeoutMs = Number(env.LLM_TIMEOUT_MS) || 45_000;

  return {
    available: Boolean(standard || premium),
    premiumAvailable: Boolean(premium),
    async chat({ messages, schema = null, maxTokens = 500, temperature = 0.4, premium: wantPremium = false, name = 'answer' }) {
      const endpoint = (wantPremium && premium) || standard || premium;
      if (!endpoint) throw new Error('the AI model is off on this server');
      const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Content-Type': 'application/json', ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}) },
        body: JSON.stringify({
          model: endpoint.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(schema ? { response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } } } : {}),
          ...(endpoint.hosted ? {} : { chat_template_kwargs: { enable_thinking: false } })
        })
      });
      if (!response.ok) throw new Error(`model: HTTP ${response.status}`);
      const body = await response.json();
      const content = String(body?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '');
      try {
        return JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('the model did not return JSON');
        return JSON.parse(match[0]);
      }
    }
  };
}
