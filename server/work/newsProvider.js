/**
 * Company news for the work game.
 *
 *   alpaca    Alpaca's news API (Benzinga's feed), with the same keys as the
 *             stock game: ALPACA_API_KEY / ALPACA_SECRET_KEY.
 *   fixture   made-up stories (one or two a day per company, every kind of
 *             event): only with WORK_NEWS_PROVIDER=fixture, for the tests.
 *
 * Returns items { id, headline, summary, url, source, created (ms), symbols[] }.
 */
const NEWS_URL = 'https://data.alpaca.markets/v1beta1/news';

export function newsProvider(env = process.env, { now = () => Date.now() } = {}) {
  if (env.WORK_NEWS_PROVIDER === 'fixture') return fixture(now);
  const key = env.ALPACA_API_KEY ?? env.APCA_API_KEY_ID;
  const secret = env.ALPACA_SECRET_KEY ?? env.APCA_API_SECRET_KEY;
  const ready = Boolean(key && secret);
  return {
    id: 'alpaca-news',
    ready,
    why: ready ? undefined : 'Add ALPACA_API_KEY and ALPACA_SECRET_KEY to .env for company news.',
    /** News for up to 50 symbols since `since` (ms), newest first, up to `max` items. */
    async news(symbols, since, max = 200) {
      if (!ready) throw new Error('no Alpaca keys');
      const out = [];
      let page = null;
      for (let guard = 0; guard < 10 && out.length < max; guard++) {
        const url = new URL(NEWS_URL);
        url.search = new URLSearchParams({
          symbols: symbols.join(','),
          start: new Date(since).toISOString(),
          limit: '50',
          sort: 'desc',
          exclude_contentless: 'false',
          ...(page ? { page_token: page } : {})
        }).toString();
        const response = await fetch(url, { headers: { 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret, accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message ?? `Alpaca news: HTTP ${response.status}`);
        for (const n of body.news ?? []) {
          out.push({ id: `a${n.id}`, headline: n.headline ?? '', summary: n.summary ?? '', url: n.url ?? null, source: n.source ?? null, created: Date.parse(n.created_at) || now(), symbols: Array.isArray(n.symbols) ? n.symbols : [] });
        }
        page = body.next_page_token;
        if (!page) break;
      }
      return out.slice(0, max);
    }
  };
}

const FIXTURE_LINES = [
  ['beats estimates with record revenue', 'earnings-beat'],
  ['misses estimates and cuts its outlook', 'earnings-miss'],
  ['announces layoffs in a restructuring plan', 'layoffs'],
  ['launches a new product line', 'product'],
  ['signs a partnership agreement with a supplier', 'partnership'],
  ['names a new chief financial officer', 'leadership'],
  ['opens a new office and is hiring', 'expansion'],
  ['raises its dividend', 'capital']
];

function fixture(now) {
  return {
    id: 'fixture',
    ready: true,
    async news(symbols, since) {
      const out = [];
      const dayMs = 86_400_000;
      for (const symbol of symbols) {
        for (let t = Math.max(since, now() - 3 * dayMs); t <= now(); t += dayMs) {
          const day = Math.floor(t / dayMs);
          const seed = [...symbol].reduce((h, c) => h * 31 + c.charCodeAt(0), day) >>> 0;
          const [line] = FIXTURE_LINES[seed % FIXTURE_LINES.length];
          out.push({ id: `f-${symbol}-${day}`, headline: `${symbol} ${line}`, summary: `A made-up story for the tests about ${symbol}.`, url: null, source: 'fixture', created: day * dayMs + 3_600_000, symbols: [symbol] });
        }
      }
      return out;
    }
  };
}
