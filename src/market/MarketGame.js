import { market, money, percent, sign } from './marketClient.js';
import { lineChart } from './lineChart.js';
import './market.css';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const button = (label, className, onClick) => {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};
const row = (...cells) => {
  const tr = el('tr');
  tr.append(...cells);
  return tr;
};
const VIZ = { you: 'var(--viz-1)', market: 'var(--viz-2)' };
const dirClass = (v) => (sign(v, 1) > 0 ? 'is-up' : sign(v, 1) < 0 ? 'is-down' : '');
const arrow = (v) => (sign(v, 1) > 0 ? '▲' : sign(v, 1) < 0 ? '▼' : '•');

/**
 * The stock market game: a year of real daily prices, one trading day at a
 * time, from a million in game money. Tabs: Market (the stocks, a chart, buy
 * and sell), Portfolio, Leaderboard and My style (your pattern). Tickers and
 * every player's data are for the platform's admin site, through the admin
 * API (server/market/index.js) — there is no admin screen here.
 *
 * Opens over the home page; `onClose` goes back to it.
 */
export class MarketGame {
  constructor(host, { onClose, account }) {
    this.onClose = onClose;
    this.account = account;
    this.tab = 'market';
    this.selected = null;
    this.state = null;
    this.sort = { key: 'symbol', dir: 1 };
    this.filter = '';
    this.root = el('div', 'mk');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Stock Market Challenge');
    this.root.innerHTML = `
      <header class="mk__head">
        <div class="mk__title"><span aria-hidden="true">📈</span> Stock Market Challenge</div>
        <div class="mk__clock" data-clock></div>
        <div class="mk__stats" data-stats></div>
        <div class="mk__actions" data-actions></div>
        <button type="button" class="mk__close" data-close aria-label="Back to the games">✕</button>
      </header>
      <nav class="mk__tabs" role="tablist" data-tabs></nav>
      <main class="mk__body" data-body></main>
      <p class="mk__status" data-status role="status" aria-live="polite"></p>`;
    host.append(this.root);
    this.$ = (s) => this.root.querySelector(s);
    this.$('[data-close]').addEventListener('click', () => this.close());
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.close();
    });
  }

  async open() {
    this.root.hidden = false;
    await this.reload();
  }

  close() {
    this.root.remove();
    this.onClose?.();
  }

  say(text, kind = '') {
    const s = this.$('[data-status]');
    s.textContent = text;
    s.className = `mk__status ${kind}`;
  }

  async reload() {
    try {
      this.state = await market.state();
    } catch (error) {
      this.say(error.message, 'is-error');
      return;
    }
    this.renderHead();
    this.renderTabs();
    await this.renderBody();
  }

  /* ---- header: the day, the money, the clock buttons ---- */

  renderHead() {
    const s = this.state;
    const clock = this.$('[data-clock]');
    const stats = this.$('[data-stats]');
    const actions = this.$('[data-actions]');
    stats.replaceChildren();
    actions.replaceChildren();
    if (!s.run) {
      clock.textContent = s.tickers ? `${s.tickers} stocks · a year of real prices` : 'Loading the market…';
      return;
    }
    const r = s.run;
    clock.textContent = `Day ${r.dayIndex + 1} of ${r.days} · ${dateWords(r.day)}`;
    const ret = r.value / (r.startCash + (r.deposits ?? 0)) - 1;
    const stat = (label, value, cls = '') => {
      const box = el('div', `mk__stat ${cls}`);
      box.append(el('small', null, label), el('strong', null, value));
      stats.append(box);
    };
    stat('Cash', money(r.cash));
    stat('Net worth', money(r.value));
    stat('Return', `${arrow(ret)} ${percent(ret)}`, dirClass(ret));
    const last = r.dayIndex === r.days - 1;
    actions.append(
      button(last ? 'Finish the year' : 'Next day ▶', 'mk__btn mk__btn--primary', () => this.advance(1)),
      ...(last ? [] : [button('+5 days', 'mk__btn', () => this.advance(5)), button('+20', 'mk__btn', () => this.advance(20))])
    );
    actions.firstChild.dataset.next = '';
  }

  async advance(days) {
    for (const b of this.$('[data-actions]').querySelectorAll('button')) b.disabled = true;
    try {
      const r = await market.next(days);
      this.state = r.state;
      if (r.finished) this.say(`The year is over: you finished with ${money(r.value)}.`, 'is-ok');
      else this.say('');
      this.renderHead();
      await this.renderBody();
    } catch (error) {
      this.say(error.message, 'is-error');
      this.renderHead();
    }
  }

  /* ---- tabs ---- */

  renderTabs() {
    const tabs = this.$('[data-tabs]');
    tabs.replaceChildren();
    const list = [
      ['market', 'Market'],
      ['portfolio', 'Portfolio'],
      ['leaderboard', 'Leaderboard'],
      ['style', 'My style']
    ];
    for (const [id, label] of list) {
      const b = button(label, `mk__tab${this.tab === id ? ' is-active' : ''}`, async () => {
        this.tab = id;
        this.renderTabs();
        await this.renderBody();
      });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === id));
      b.dataset.tab = id;
      tabs.append(b);
    }
  }

  async renderBody() {
    const body = this.$('[data-body]');
    body.replaceChildren();
    if (this.tab === 'leaderboard') return this.renderLeaderboard(body);
    if (!this.account) {
      body.append(this.notice('Sign in to play', 'Open Your hero → Account to sign in or make an account. Your run, trades and place on the leaderboard are saved to it.'));
      return;
    }
    if (!this.state.run) return this.renderStart(body);
    if (this.tab === 'portfolio') return this.renderPortfolio(body);
    if (this.tab === 'style') return this.renderStyle(body);
    return this.renderMarket(body);
  }

  notice(title, text) {
    const box = el('div', 'mk__notice');
    box.append(el('h2', null, title), el('p', null, text));
    return box;
  }

  renderStart(body) {
    const s = this.state;
    const box = this.notice(
      s.last ? 'Play another year?' : 'A year on the stock market',
      s.last
        ? `Your last year ended with ${money(s.last.finalValue)} (${percent(s.last.finalValue / s.last.startCash - 1)}). Start again from a million.`
        : `You get ${money(s.startCash)} in game money. Every day you see that day's real closing prices for ${s.tickers} big companies and the whole market (SPY). Buy and sell, then press Next day. After a year, see how you did — and how you invest. No real money, ever.`
    );
    const go = button(s.last ? 'Start a new year' : `Start with ${money(s.startCash)}`, 'mk__btn mk__btn--primary mk__btn--big', async () => {
      go.disabled = true;
      try {
        this.state = await market.start(false);
        this.say('');
        this.renderHead();
        await this.renderBody();
      } catch (error) {
        go.disabled = false;
        this.say(error.message, 'is-error');
      }
    });
    go.dataset.start = '';
    if (!s.provider.ready && !s.tickers) box.append(el('p', 'mk__muted', 'The market data is not set up on this server yet.'));
    box.append(go);
    body.append(box);
  }

  /* ---- Market: the list, the chart, the order ---- */

  renderMarket(body) {
    const wrap = el('div', 'mk__market');
    const left = el('section', 'mk__list');
    const right = el('section', 'mk__detail');
    wrap.append(left, right);
    body.append(wrap);

    const search = el('input', 'mk__search');
    search.type = 'search';
    search.placeholder = 'Find a stock…';
    search.setAttribute('aria-label', 'Find a stock');
    search.value = this.filter;
    const table = el('table', 'mk__table');
    const fill = () => {
      const q = this.filter.toLowerCase();
      const rows = this.state.quotes
        .filter((x) => !q || x.symbol.toLowerCase().includes(q) || x.name.toLowerCase().includes(q) || x.sector.toLowerCase().includes(q))
        .sort((a, b) => {
          const k = this.sort.key;
          const av = a[k] ?? -Infinity;
          const bv = b[k] ?? -Infinity;
          return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * this.sort.dir;
        });
      table.replaceChildren();
      const head = el('tr');
      for (const [key, label] of [['symbol', 'Stock'], ['price', 'Price'], ['change', 'Today'], ['qty', 'Owned']]) {
        const th = el('th');
        const b = button(`${label}${this.sort.key === key ? (this.sort.dir > 0 ? ' ↑' : ' ↓') : ''}`, 'mk__sort', () => {
          this.sort = { key, dir: this.sort.key === key ? -this.sort.dir : key === 'symbol' ? 1 : -1 };
          fill();
        });
        th.append(b);
        head.append(th);
      }
      table.append(head);
      for (const q of rows) {
        const tr = el('tr', `mk__row${this.selected === q.symbol ? ' is-selected' : ''}`);
        tr.dataset.symbol = q.symbol;
        tr.tabIndex = 0;
        const name = el('td');
        name.append(el('strong', null, q.symbol), el('small', null, q.benchmark ? 'Whole market' : q.name));
        tr.append(name, el('td', 'mk__num', q.price == null ? '—' : money(q.price, { exact: true })), el('td', `mk__num ${dirClass(q.change)}`, q.change == null ? '—' : `${arrow(q.change)} ${percent(q.change)}`), el('td', 'mk__num', q.qty ? String(q.qty) : ''));
        const pick = () => {
          this.selected = q.symbol;
          for (const r of table.querySelectorAll('.is-selected')) r.classList.remove('is-selected');
          tr.classList.add('is-selected');
          this.renderDetail(right);
        };
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', (e) => e.key === 'Enter' && pick());
        table.append(tr);
      }
    };
    search.addEventListener('input', () => {
      this.filter = search.value;
      fill();
    });
    fill();
    left.append(search, el('div', 'mk__scroll'));
    left.lastChild.append(table);
    this.selected ??= this.state.quotes.find((q) => !q.benchmark)?.symbol ?? null;
    this.renderDetail(right);
  }

  async renderDetail(box) {
    box.replaceChildren();
    const q = this.state.quotes.find((x) => x.symbol === this.selected);
    if (!q) return;
    const head = el('div', 'mk__detail-head');
    const title = el('div');
    title.append(el('h2', null, `${q.symbol} · ${q.name}`), el('small', 'mk__muted', q.sector));
    const price = el('div', 'mk__price');
    price.append(el('strong', null, q.price == null ? '—' : money(q.price, { exact: true })), el('span', dirClass(q.change), q.change == null ? '' : `${arrow(q.change)} ${percent(q.change, 2)} today`));
    head.append(title, price);
    const chart = el('div', 'mk__chart');
    box.append(head, chart);

    // The order.
    const order = el('div', 'mk__order');
    const qty = el('input', 'mk__qty');
    qty.type = 'number';
    qty.min = '1';
    qty.step = '1';
    qty.value = '10';
    qty.setAttribute('aria-label', 'Number of shares');
    qty.dataset.qty = '';
    const cost = el('span', 'mk__muted');
    const update = () => {
      const n = Math.max(0, Math.floor(Number(qty.value) || 0));
      cost.textContent = q.price ? `${n} × ${money(q.price, { exact: true })} = ${money(n * q.price, { exact: true })}` : '';
    };
    qty.addEventListener('input', update);
    const maxBuy = q.price ? Math.floor(this.state.run.cash / q.price) : 0;
    const go = async (side) => {
      const n = Math.floor(Number(qty.value));
      try {
        const r = await market.trade(q.symbol, side, n);
        this.state = r.state;
        this.say(`${side === 'buy' ? 'Bought' : 'Sold'} ${n} ${q.symbol} at ${money(r.price, { exact: true })}.`, 'is-ok');
        this.renderHead();
        await this.renderBody();
      } catch (error) {
        this.say(error.message, 'is-error');
      }
    };
    const buy = button('Buy', 'mk__btn mk__btn--buy', () => go('buy'));
    const sell = button('Sell', 'mk__btn mk__btn--sell', () => go('sell'));
    buy.dataset.buy = '';
    sell.dataset.sell = '';
    buy.disabled = !q.tradable || !maxBuy;
    sell.disabled = !q.tradable || !q.qty;
    const quick = el('div', 'mk__quick');
    quick.append(
      button(`Max ${maxBuy}`, 'mk__chip', () => ((qty.value = String(maxBuy)), update())),
      button('10% of cash', 'mk__chip', () => ((qty.value = String(Math.floor((this.state.run.cash * 0.1) / (q.price || 1)))), update())),
      ...(q.qty ? [button(`All ${q.qty}`, 'mk__chip', () => ((qty.value = String(q.qty)), update()))] : [])
    );
    order.append(el('label', 'mk__muted', 'Shares'), qty, buy, sell, cost, quick);
    if (!q.tradable) order.append(el('p', 'mk__muted', 'Not traded on this day.'));
    if (q.qty) {
      const avg = q.cost / q.qty;
      const gain = q.price ? (q.price - avg) * q.qty : 0;
      order.append(el('p', `mk__own ${dirClass(gain)}`, `You own ${q.qty} at ${money(avg, { exact: true })} on average: ${gain >= 0 ? 'up' : 'down'} ${money(Math.abs(gain))}.`));
    }
    box.append(order);
    update();

    try {
      const { bars } = await market.bars(q.symbol);
      if (this.selected !== q.symbol) return;
      lineChart(chart, { labels: bars.map((b) => shortDate(b.day)), series: [{ name: q.symbol, values: bars.map((b) => b.close), color: VIZ.you }], format: (v) => `$${v.toFixed(2)}` });
    } catch (error) {
      chart.textContent = error.message;
    }
  }

  /* ---- Portfolio ---- */

  async renderPortfolio(body) {
    const r = this.state.run;
    const held = this.state.quotes.filter((q) => q.qty);
    const top = el('div', 'mk__tiles');
    const invested = held.reduce((s, q) => s + q.qty * (q.price ?? 0), 0);
    for (const [label, value] of [['Net worth', money(r.value)], ['In stocks', money(invested)], ['Cash', money(r.cash)], ['Stocks owned', String(held.length)]]) {
      const t = el('div', 'mk__tile');
      t.append(el('small', null, label), el('strong', null, value));
      top.append(t);
    }
    const chart = el('div', 'mk__chart');
    const table = el('table', 'mk__table mk__table--wide');
    const head = el('tr');
    for (const h of ['Stock', 'Shares', 'Avg cost', 'Price', 'Value', 'Gain', 'Share']) head.append(el('th', null, h));
    table.append(head);
    for (const q of held.sort((a, b) => b.qty * b.price - a.qty * a.price)) {
      const value = q.qty * (q.price ?? 0);
      const gain = value - q.cost;
      const tr = el('tr');
      tr.append(el('td', null, q.symbol), el('td', 'mk__num', String(q.qty)), el('td', 'mk__num', money(q.cost / q.qty, { exact: true })), el('td', 'mk__num', money(q.price, { exact: true })), el('td', 'mk__num', money(value)), el('td', `mk__num ${dirClass(gain)}`, `${arrow(gain)} ${money(Math.abs(gain))} (${percent(gain / q.cost)})`), el('td', 'mk__num', percent(invested ? value / invested : 0, 0).replace('+', '')));
      table.append(tr);
    }
    if (!held.length) table.append(row(el('td', 'mk__muted', 'Nothing yet: pick a stock in Market and press Buy.')));
    const trades = el('ol', 'mk__trades');
    // Money from the wallet (pay from Work Life) into this run.
    const fund = el('div', 'mk__order');
    fund.dataset.wallet = '';
    fund.append(el('span', null, `Wallet: ${money(this.state.wallet ?? 0)}`), el('small', 'mk__muted', r.deposits ? ` · added to this run so far: ${money(r.deposits)}` : ' · your pay from Work Life'));
    if ((this.state.wallet ?? 0) >= 100) {
      const amount = el('input', 'mk__qty');
      amount.type = 'number';
      amount.min = '1';
      amount.value = String(Math.floor((this.state.wallet ?? 0) / 100));
      amount.setAttribute('aria-label', 'Dollars to add');
      const add = button('Add to this run', 'mk__btn mk__btn--primary', async () => {
        add.disabled = true;
        try {
          const res = await market.deposit(Math.round(Number(amount.value) * 100));
          this.state = res.state;
          this.say(`Added ${money(res.amount)} from your wallet.`, 'is-ok');
          this.renderHead();
          await this.renderBody();
        } catch (error) {
          add.disabled = false;
          this.say(error.message, 'is-error');
        }
      });
      add.dataset.deposit = '';
      fund.append(amount, add);
    }
    body.append(el('h3', 'mk__h', 'Your money against the market'), chart, top, fund, el('h3', 'mk__h', 'What you own'), table, el('h3', 'mk__h', 'Your trades'), trades);

    const [{ snapshots, trades: list }, spy] = await Promise.all([market.history(), market.bars('SPY').catch(() => ({ bars: [] }))]);
    const start = r.startCash;
    const days = spy.bars.map((b) => b.day);
    const spy0 = spy.bars[0]?.close;
    const mine = new Map(snapshots.map((s) => [s.dayIndex, s.value / 100]));
    lineChart(chart, {
      labels: days.map(shortDate),
      series: [
        { name: 'You', values: days.map((_, i) => mine.get(i) ?? null), color: VIZ.you },
        { name: 'Market (SPY)', values: spy.bars.map((b) => (spy0 ? (b.close / spy0) * (start / 100) : null)), color: VIZ.market }
      ],
      format: (v) => `$${Math.round(v).toLocaleString('en-US')}`
    });
    for (const t of [...list].reverse().slice(0, 60)) {
      trades.append(el('li', null, `${shortDate(t.day)} · ${t.side === 'buy' ? 'Bought' : 'Sold'} ${t.qty} ${t.symbol} at ${money(t.price, { exact: true })}`));
    }
    if (!list.length) trades.append(el('li', 'mk__muted', 'No trades yet.'));
  }

  /* ---- Leaderboard ---- */

  async renderLeaderboard(body) {
    body.append(el('p', 'mk__muted', 'Everyone starts with a million. Each player\'s latest year, by net worth.'));
    const table = el('table', 'mk__table mk__table--wide');
    table.dataset.leaderboard = '';
    body.append(table);
    const { players } = await market.leaderboard().catch(() => ({ players: [] }));
    const head = el('tr');
    for (const h of ['#', 'Player', 'Net worth', 'Return', 'Progress', 'Trades']) head.append(el('th', null, h));
    table.append(head);
    for (const p of players) {
      const tr = el('tr', p.accountId === this.account?.id ? 'is-you' : '');
      tr.append(
        el('td', 'mk__num', String(p.rank)),
        el('td', null, `${p.name}${p.accountId === this.account?.id ? ' (you)' : ''}`),
        el('td', 'mk__num', money(p.value)),
        el('td', `mk__num ${dirClass(p.return)}`, `${arrow(p.return)} ${percent(p.return)}`),
        el('td', 'mk__num', p.status === 'finished' ? 'Finished' : `Day ${p.dayIndex + 1} / ${p.days}`),
        el('td', 'mk__num', String(p.trades))
      );
      table.append(tr);
    }
    if (!players.length) table.append(row(el('td', 'mk__muted', 'Nobody has started yet. Be the first.')));
  }

  /* ---- My style: the pattern ---- */

  async renderStyle(body) {
    const { pattern } = await market.profile();
    if (!pattern) return body.append(this.notice('No trades yet', 'Your style shows up once you start trading.'));
    const m = pattern.metrics;
    body.append(el('p', 'mk__muted', 'How you invest, from your trades this year. Only you and the game\'s admins see this.'));
    const tags = el('div', 'mk__tags');
    for (const t of pattern.tags) {
      const card = el('div', 'mk__tag');
      card.append(el('strong', null, t.label), el('span', null, t.why));
      tags.append(card);
    }
    body.append(tags);
    const tiles = el('div', 'mk__tiles');
    const tile = (label, value, hint) => {
      const t = el('div', 'mk__tile');
      t.append(el('small', null, label), el('strong', null, value), el('span', 'mk__muted', hint));
      tiles.append(t);
    };
    tile('Your return', percent(m.return), m.marketReturn == null ? '' : `Market: ${percent(m.marketReturn)}`);
    tile('Trades', String(m.trades), `${m.buys} ${m.buys === 1 ? 'buy' : 'buys'}, ${m.sells} ${m.sells === 1 ? 'sell' : 'sells'}`);
    tile('Holding time', `${m.avgHoldDays} days`, 'on average');
    tile('Winning sells', m.winRate == null ? '—' : percent(m.winRate, 0).replace('+', ''), 'sold for more than paid');
    tile('Cash kept', percent(m.avgCashShare, 0).replace('+', ''), 'on average');
    tile('Biggest holding', percent(m.topHoldingShare, 0).replace('+', ''), 'of the money in stocks');
    tile('Worst fall', percent(-m.maxDrawdown, 0), 'from a high');
    tile('Buys on a down day', m.dipBuyShare == null ? '—' : percent(m.dipBuyShare, 0).replace('+', ''), 'dip buying');
    body.append(tiles);
    const sectors = Object.entries(m.sectors ?? {});
    if (sectors.length) {
      body.append(el('h3', 'mk__h', 'Where your money is'));
      const bars = el('div', 'mk__bars');
      for (const [name, share] of sectors) {
        const row = el('div', 'mk__bar');
        const fill = el('span', 'mk__bar-fill');
        fill.style.width = `${Math.max(2, share * 100)}%`;
        row.append(el('span', 'mk__bar-label', name), el('span', 'mk__bar-track'), el('span', 'mk__num', `${Math.round(share * 100)}%`));
        row.children[1].append(fill);
        bars.append(row);
      }
      body.append(bars);
    }
  }
}

const dateWords = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const shortDate = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' });
