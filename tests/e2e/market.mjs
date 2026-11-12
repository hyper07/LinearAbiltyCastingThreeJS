import { boot, tally, until } from './lib.mjs';

/**
 * The stock market game, by mouse: its card on the home page, a run from a
 * million, a buy priced by the server, days moving on, the chart, the
 * leaderboard, the player's style — and, for an admin, the dashboard that
 * adds a ticker. The test server runs on made-up prices (MARKET_PROVIDER=fixture)
 * with `MarketBoss` as its admin (tests/e2e/run.mjs).
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'market', { view: 'home' });
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  try {
    // An admin account, signed in (the session cookie), then the page again so the game knows it.
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

    // The dashboard: an admin adds a ticker, and it is fetched.
    t.check('an admin sees the Dashboard tab', await page.evaluate(() => Boolean(document.querySelector('.mk [data-tab="admin"]'))));
    await page.click('.mk [data-tab="admin"]');
    await page.waitForSelector('.mk [data-add-symbol]', { timeout: 10000 });
    await page.fill('.mk [data-add-symbol]', 'nke');
    await page.click('.mk .mk__add button[type="submit"]');
    t.check('adding a ticker fetches its year', await until(page, () => {
      const row = document.querySelector('.mk [data-ticker="NKE"]');
      return row && Number(row.children[4]?.textContent) > 200;
    }, null, 20000));
    await shot('market-dashboard');

    await page.click('.mk [data-close]');
    t.check('✕ goes back to the games', await until(page, () => !document.querySelector('.mk') && !document.querySelector('.home').hidden, null, 5000));
    t.check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
