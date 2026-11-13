/**
 * A player's investing pattern, from one run: what they traded, how long they
 * held, how spread out they were, how they did against the market — and a few
 * plain-word style tags ("Dip buyer", "Patient holder"…). The player sees their
 * own; the platform's admin site reads everyone's (the admin API).
 *
 * Pure: the server passes the rows, so the tests can too.
 *
 * @param {{
 *   trades: { day_index: number, symbol: string, side: 'buy'|'sell', qty: number, price: number }[],  // price in cents
 *   snapshots: { day_index: number, cash: number, value: number, holdings: Record<string, number> }[], // cents
 *   closeOf: (symbol: string, dayIndex: number) => number|null,   // dollars, that day's close (or the last before)
 *   sectorOf?: (symbol: string) => string,
 *   startCash: number,                                          // cents
 *   dayIndex: number,                                           // where the run is now
 *   benchmark?: string                                          // e.g. 'SPY'
 * }} run
 */
export function investorPattern({ trades, snapshots, closeOf, sectorOf = () => 'Other', startCash, dayIndex, benchmark = 'SPY' }) {
  const buys = trades.filter((t) => t.side === 'buy');
  const sells = trades.filter((t) => t.side === 'sell');
  const snaps = [...snapshots].sort((a, b) => a.day_index - b.day_index);
  const last = snaps.at(-1) ?? { cash: startCash, value: startCash, holdings: {} };

  // Holding periods and wins, first in first out.
  const lots = new Map();
  const held = [];
  let wins = 0;
  let closed = 0;
  for (const t of [...trades].sort((a, b) => a.day_index - b.day_index)) {
    const queue = lots.get(t.symbol) ?? [];
    lots.set(t.symbol, queue);
    if (t.side === 'buy') {
      queue.push({ qty: t.qty, price: t.price, day: t.day_index });
      continue;
    }
    let left = t.qty;
    let cost = 0;
    while (left > 0 && queue.length) {
      const lot = queue[0];
      const take = Math.min(left, lot.qty);
      held.push({ days: t.day_index - lot.day, qty: take });
      cost += take * lot.price;
      lot.qty -= take;
      left -= take;
      if (!lot.qty) queue.shift();
    }
    closed++;
    if (t.qty * t.price > cost) wins++;
  }
  for (const queue of lots.values()) for (const lot of queue) held.push({ days: dayIndex - lot.day, qty: lot.qty });
  const heldQty = held.reduce((s, h) => s + h.qty, 0);
  const avgHoldDays = heldQty ? held.reduce((s, h) => s + h.days * h.qty, 0) / heldQty : 0;

  // Turnover: what was traded against the average net worth.
  const traded = trades.reduce((s, t) => s + t.qty * t.price, 0);
  const avgValue = snaps.length ? snaps.reduce((s, x) => s + x.value, 0) / snaps.length : startCash;
  const avgCashShare = snaps.length ? snaps.reduce((s, x) => s + (x.value ? x.cash / x.value : 1), 0) / snaps.length : 1;

  // What is held now, by value.
  const positions = Object.entries(last.holdings ?? {})
    .map(([symbol, qty]) => ({ symbol, qty, value: qty * (closeOf(symbol, dayIndex) ?? 0) * 100 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  const invested = positions.reduce((s, p) => s + p.value, 0);
  const topShare = invested ? positions[0].value / invested : 0;
  const hhi = invested ? positions.reduce((s, p) => s + (p.value / invested) ** 2, 0) : 0;
  const sectors = {};
  for (const p of positions) sectors[sectorOf(p.symbol)] = (sectors[sectorOf(p.symbol)] ?? 0) + p.value / invested;

  // Drawdown: the worst fall from a high.
  let peak = 0;
  let maxDrawdown = 0;
  for (const s of snaps) {
    peak = Math.max(peak, s.value);
    if (peak) maxDrawdown = Math.max(maxDrawdown, (peak - s.value) / peak);
  }

  // When they buy: after the stock fell that day (a dip), or after a five-day climb (momentum).
  let dips = 0;
  let momentum = 0;
  for (const t of buys) {
    const today = closeOf(t.symbol, t.day_index);
    const before = t.day_index > 0 ? closeOf(t.symbol, t.day_index - 1) : null;
    const weekAgo = t.day_index >= 5 ? closeOf(t.symbol, t.day_index - 5) : null;
    if (today != null && before != null && today < before) dips++;
    if (today != null && weekAgo != null && today > weekAgo * 1.03) momentum++;
  }

  const value = last.value;
  const ret = startCash ? value / startCash - 1 : 0;
  const b0 = closeOf(benchmark, 0);
  const bNow = closeOf(benchmark, dayIndex);
  const marketReturn = b0 && bNow ? bNow / b0 - 1 : null;

  const metrics = {
    trades: trades.length,
    buys: buys.length,
    sells: sells.length,
    symbolsTraded: new Set(trades.map((t) => t.symbol)).size,
    holdings: positions.length,
    avgHoldDays: round(avgHoldDays, 1),
    winRate: closed ? round(wins / closed, 3) : null,
    turnover: round(avgValue ? traded / avgValue : 0, 2),
    avgCashShare: round(avgCashShare, 3),
    topHoldingShare: round(topShare, 3),
    concentration: round(hhi, 3),
    maxDrawdown: round(maxDrawdown, 3),
    return: round(ret, 4),
    marketReturn: marketReturn == null ? null : round(marketReturn, 4),
    dipBuyShare: buys.length ? round(dips / buys.length, 3) : null,
    momentumBuyShare: buys.length ? round(momentum / buys.length, 3) : null,
    sectors: Object.fromEntries(Object.entries(sectors).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, round(v, 3)]))
  };
  return { metrics, tags: styleTags(metrics), positions: positions.map((p) => ({ ...p, share: invested ? round(p.value / invested, 3) : 0 })) };
}

/** Plain-word tags, each with why, for a player to read about themselves. */
export function styleTags(m) {
  const tags = [];
  const add = (id, label, why) => tags.push({ id, label, why });
  if (m.trades === 0) {
    add('watcher', 'Watcher', 'No trades yet: still looking around.');
    return tags;
  }
  if (m.avgHoldDays < 3 && m.trades >= 10) add('day-trader', 'Day trader', `Holds for ${m.avgHoldDays} days on average.`);
  else if (m.avgHoldDays >= 40) add('patient', 'Patient holder', `Holds for ${Math.round(m.avgHoldDays)} days on average.`);
  if (m.dipBuyShare != null && m.dipBuyShare >= 0.6 && m.buys >= 5) add('dip-buyer', 'Dip buyer', `${pct(m.dipBuyShare)} of buys came on a day the stock fell.`);
  if (m.momentumBuyShare != null && m.momentumBuyShare >= 0.6 && m.buys >= 5) add('momentum', 'Momentum chaser', `${pct(m.momentumBuyShare)} of buys came after a climb of 3% or more in a week.`);
  if (m.holdings >= 8 && m.topHoldingShare < 0.25) add('diversified', 'Diversified', `${m.holdings} stocks, none over a quarter of the money invested.`);
  if (m.holdings >= 1 && m.topHoldingShare >= 0.6) add('all-in', 'All in on one', `${pct(m.topHoldingShare)} of the money invested is in one stock.`);
  if (m.avgCashShare >= 0.5) add('cautious', 'Cautious', `Kept ${pct(m.avgCashShare)} in cash on average.`);
  else if (m.avgCashShare < 0.1) add('fully-invested', 'Fully invested', `Kept only ${pct(m.avgCashShare)} in cash on average.`);
  if (m.turnover >= 5) add('active', 'Very active', `Traded ${m.turnover}× their money's worth.`);
  const [sector, share] = Object.entries(m.sectors ?? {})[0] ?? [];
  if (sector && share >= 0.5 && m.holdings >= 2) add('sector-fan', `${sector} fan`, `${pct(share)} invested in ${sector}.`);
  if (m.marketReturn != null) {
    if (m.return > m.marketReturn + 0.02) add('beat-market', 'Beat the market', `${signed(m.return)} against the market's ${signed(m.marketReturn)}.`);
    else if (m.return < m.marketReturn - 0.02) add('behind-market', 'Behind the market', `${signed(m.return)} against the market's ${signed(m.marketReturn)}.`);
  }
  if (m.maxDrawdown >= 0.25) add('bumpy', 'Bumpy ride', `Fell ${pct(m.maxDrawdown)} from a high at worst.`);
  return tags;
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const pct = (v) => `${Math.round(v * 100)}%`;
const signed = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
