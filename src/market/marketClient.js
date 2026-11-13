/** The stock game's server calls (server/market/index.js). Errors throw with the server's words. */
async function call(path, { method = 'GET', body } = {}) {
  const response = await fetch(`./api/market/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? `HTTP ${response.status}`), { status: response.status });
  return data;
}

export const market = {
  state: () => call('state'),
  start: (restart = false) => call('run', { method: 'POST', body: { restart } }),
  next: (days = 1) => call('next', { method: 'POST', body: { days } }),
  trade: (symbol, side, qty) => call('trade', { method: 'POST', body: { symbol, side, qty } }),
  bars: (symbol) => call(`bars?symbol=${encodeURIComponent(symbol)}`),
  history: () => call('history'),
  profile: () => call('profile'),
  leaderboard: () => call('leaderboard')
};

/** $1,234,567 from cents (no cents shown past a thousand). */
export const money = (cents, { exact = false } = {}) => {
  const d = (cents ?? 0) / 100;
  return `${d < 0 ? '−' : ''}$${Math.abs(d).toLocaleString('en-US', { minimumFractionDigits: exact || Math.abs(d) < 1000 ? 2 : 0, maximumFractionDigits: exact || Math.abs(d) < 1000 ? 2 : 0 })}`;
};
export const percent = (v, digits = 1) => {
  if (v == null) return '—';
  // What rounds to zero reads as zero, not as "−0.0%".
  const shown = Math.abs(v * 100).toFixed(digits);
  const zero = Number(shown) === 0;
  return `${zero ? '' : v > 0 ? '+' : '−'}${shown}%`;
};
/** The sign a reader sees: what rounds to 0.0% is flat. */
export const sign = (v, digits = 1) => (v == null || Number(Math.abs(v * 100).toFixed(digits)) === 0 ? 0 : Math.sign(v));
