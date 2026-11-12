/**
 * Where the stock game's daily prices come from.
 *
 *   alpaca    Alpaca's market data API (https://docs.alpaca.markets/), with the
 *             keys from the environment: ALPACA_API_KEY and ALPACA_SECRET_KEY.
 *             ALPACA_FEED: 'iex' (free, the default) or 'sip' (paid, all exchanges).
 *             Prices are adjusted for splits and dividends.
 *   fixture   made-up prices (a seeded random walk per symbol): only when
 *             MARKET_PROVIDER=fixture, for the tests. Never chosen on its own.
 *
 * Alpaca's terms limit showing their data to the public; a public launch needs
 * a data plan that allows it (see docs/stock-market.md).
 */

const DATA_URL = 'https://data.alpaca.markets/v2/stocks/bars';

/** @returns {{ id: string, ready: boolean, why?: string, bars: (symbols: string[], from: string, to: string) => Promise<Map<string, Bar[]>>, asset?: (symbol: string) => Promise<{ name: string }|null> }} */
export function marketProvider(env = process.env) {
  if (env.MARKET_PROVIDER === 'fixture') return fixtureProvider();
  return alpacaProvider(env);
}

/** @typedef {{ day: string, open: number, high: number, low: number, close: number, volume: number }} Bar */

function alpacaProvider(env) {
  const key = env.ALPACA_API_KEY ?? env.APCA_API_KEY_ID;
  const secret = env.ALPACA_SECRET_KEY ?? env.APCA_API_SECRET_KEY;
  const feed = env.ALPACA_FEED === 'sip' ? 'sip' : 'iex';
  const tradingUrl = env.ALPACA_PAPER_TRADE === 'false' ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
  const headers = { 'APCA-API-KEY-ID': key ?? '', 'APCA-API-SECRET-KEY': secret ?? '', accept: 'application/json' };
  const ready = Boolean(key && secret);
  return {
    id: `alpaca-${feed}`,
    ready,
    why: ready ? undefined : 'Add ALPACA_API_KEY and ALPACA_SECRET_KEY to .env (see docs/stock-market.md), then restart the server.',
    async bars(symbols, from, to) {
      if (!ready) throw new Error('no Alpaca keys');
      const out = new Map(symbols.map((s) => [s, []]));
      let page = null;
      for (let guard = 0; guard < 50; guard++) {
        const url = new URL(DATA_URL);
        url.search = new URLSearchParams({
          symbols: symbols.join(','),
          timeframe: '1Day',
          start: from,
          end: to,
          adjustment: 'all',
          feed,
          limit: '10000',
          sort: 'asc',
          ...(page ? { page_token: page } : {})
        }).toString();
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message ?? `Alpaca: HTTP ${response.status}`);
        for (const [symbol, rows] of Object.entries(body.bars ?? {})) {
          const list = out.get(symbol) ?? [];
          for (const r of rows) list.push({ day: String(r.t).slice(0, 10), open: r.o, high: r.h, low: r.l, close: r.c, volume: Math.round(r.v ?? 0) });
          out.set(symbol, list);
        }
        page = body.next_page_token;
        if (!page) break;
      }
      return out;
    },
    async asset(symbol) {
      if (!ready) return null;
      const response = await fetch(`${tradingUrl}/v2/assets/${encodeURIComponent(symbol)}`, { headers, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return null;
      const body = await response.json().catch(() => null);
      return body?.name ? { name: String(body.name).slice(0, 80), tradable: body.tradable !== false } : null;
    }
  };
}

/** Made-up but plausible prices: weekdays, a drift and a wobble per symbol, the same every time. */
function fixtureProvider() {
  const seedOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return {
    id: 'fixture',
    ready: true,
    async bars(symbols, from, to) {
      const out = new Map();
      for (const symbol of symbols) {
        let seed = seedOf(symbol);
        const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
        let price = 20 + (seedOf(symbol) % 400);
        const drift = (rand() - 0.45) * 0.002;
        const rows = [];
        for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
          const wd = d.getUTCDay();
          if (wd === 0 || wd === 6) continue;
          const open = price;
          price = Math.max(1, price * (1 + drift + (rand() - 0.5) * 0.04));
          rows.push({ day: d.toISOString().slice(0, 10), open, high: Math.max(open, price) * 1.01, low: Math.min(open, price) * 0.99, close: price, volume: 1_000_000 });
        }
        out.set(symbol, rows);
      }
      return out;
    },
    async asset() {
      return null;
    }
  };
}
