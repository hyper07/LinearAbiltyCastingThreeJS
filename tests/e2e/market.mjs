import { boot, tally, until } from './lib.mjs';

/**
 * The stock market game, by mouse: its card on the home page, a run from a
 * million, a buy priced by the server, days moving on, the chart, the
 * leaderboard, the player's style — and the admin API (no screen) that the
 * platform's admin site uses with its id and password. The test server runs on
 * made-up prices (MARKET_PROVIDER=fixture), admin `siteadmin` (tests/e2e/run.mjs).
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'market', { view: 'home' });
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  try {
    // A player, signed in (the session cookie), then the page again so the game knows it.
    const made = await page.evaluate(async () => {
      const r = await fetch('./api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'MarketBoss', password: 'buy-low-sell-high' }) });
      return r.status;
    });
    if (made !== 200) {
      await page.evaluate(() => fetch('./api/account/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'MarketBoss', password: 'buy-low-sell-high' }) }));
    }
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.app?.phase === 'menu' && window.app.account?.user, null, { timeout: 120000 });

    t.check('the stock game is a card on the home page', await until(page, () => Boolean(document.querySelector('.home [data-game="official:stock-market"]')), null, 10000));
    await page.click('.home [data-genre="market-sim"]');
    t.check('the Stock market chip finds it', await until(page, () => [...document.querySelectorAll('.home [data-game]')].map((c) => c.dataset.game).join() === 'official:stock-market', null, 5000));
    await page.click('.home [data-game="official:stock-market"]');
    await page.waitForSelector('.home [data-play]');
    t.check('its page has no party button (a run is your own)', await page.evaluate(() => !document.querySelector('.home [data-play-party]')));
    await page.click('.home [data-play]');
    t.check('Play opens the market', await until(page, () => Boolean(document.querySelector('.mk')), null, 15000));
    await page.waitForSelector('.mk [data-start]', { timeout: 30000 });
    await page.click('.mk [data-start]');
    t.check('a run starts on day 1 with a million', await until(page, () => /Day 1 of/.test(document.querySelector('.mk [data-clock]')?.textContent ?? '') && /\$1,000,000/.test(document.querySelector('.mk [data-stats]')?.textContent ?? ''), null, 15000));

    // Buy 10 of AAPL.
    await page.click('.mk [data-symbol="AAPL"]');
    t.check('a stock shows its chart', await until(page, () => Boolean(document.querySelector('.mk .mk__chart svg')), null, 10000));
    await page.fill('.mk [data-qty]', '10');
    await page.click('.mk [data-buy]');
    t.check('the buy goes through at the server\'s price', await until(page, () => /Bought 10 AAPL/.test(document.querySelector('.mk [data-status]')?.textContent ?? ''), null, 10000));
    t.check('the list shows what you own', await until(page, () => document.querySelector('.mk [data-symbol="AAPL"] td:last-child')?.textContent === '10', null, 5000));

    // Five days on: net worth moves with the price, and the chart grows.
    await page.click('.mk .mk__actions button:nth-child(2)');
    t.check('+5 days moves the clock', await until(page, () => /Day 6 of/.test(document.querySelector('.mk [data-clock]')?.textContent ?? ''), null, 10000));
    const net = await page.evaluate(() => window.fetch('./api/market/state').then((r) => r.json()));
    const aapl = net.quotes.find((q) => q.symbol === 'AAPL');
    t.check('net worth = cash + shares at today\'s close', net.run.value === net.run.cash + 10 * aapl.price, JSON.stringify({ value: net.run.value, cash: net.run.cash, price: aapl.price }));
    const bars = await page.evaluate(() => window.fetch('./api/market/bars?symbol=MSFT').then((r) => r.json()));
    t.check('nobody sees tomorrow: bars stop at your day', bars.bars.length === 6, `${bars.bars.length} bars`);
    await shot('market-trade');

    await page.click('.mk [data-tab="portfolio"]');
    t.check('the portfolio charts you against the market', await until(page, () => document.querySelectorAll('.mk .mk-chart__legend span').length === 2, null, 10000));
    await page.click('.mk [data-tab="leaderboard"]');
    t.check('the leaderboard lists you', await until(page, () => /MarketBoss \(you\)/.test(document.querySelector('.mk [data-leaderboard]')?.textContent ?? ''), null, 10000));
    await page.click('.mk [data-tab="style"]');
    t.check('My style reads your pattern', await until(page, () => document.querySelectorAll('.mk .mk__tag').length >= 1 && document.querySelectorAll('.mk .mk__tile').length >= 6, null, 10000));
    await shot('market-style');

    // No admin screen in the game: the platform's admin site uses the admin API with its id and password.
    t.check('the game has no admin tab', await page.evaluate(() => !document.querySelector('.mk [data-tab="admin"]')));
    const admin = await page.evaluate(async () => {
      const auth = { Authorization: `Basic ${btoa('siteadmin:test-admin-pass')}` };
      const refused = (await fetch('./api/market/admin')).status;
      const add = await fetch('./api/market/admin/tickers', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'nke' }) });
      const view = await fetch('./api/market/admin', { headers: auth }).then((r) => r.json());
      const trades = await fetch('./api/market/admin/trades', { headers: auth }).then((r) => r.json());
      return { refused, added: add.status, nke: view.tickers.find((x) => x.symbol === 'NKE')?.bars ?? 0, me: view.players.find((p) => p.name === 'MarketBoss'), trades: trades.trades.length };
    });
    t.check('the admin API refuses without the id and password', admin.refused === 401);
    t.check('with them, adding a ticker fetches its year', admin.added === 200 && admin.nke > 200, JSON.stringify(admin));
    t.check('the admin API lists players with their style, and every trade', admin.me?.trades === 1 && admin.me.tags.length > 0 && admin.trades === 1);

    await page.click('.mk [data-close]');
    t.check('✕ goes back to the games', await until(page, () => !document.querySelector('.mk') && !document.querySelector('.home').hidden, null, 5000));
    // The admin API's refusal without a password is on purpose.
    const real = errors.filter((e) => !/401 GET \/api\/market\/admin$/.test(e));
    t.check('no page errors', real.length === 0, real.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
