import { boot, tally, until } from './lib.mjs';
import { INTERVIEW } from '../../src/work/scenarios.js';

/**
 * Work Life, by mouse: its card, a company that is hiring, a role, the
 * interview, today's tasks (a decision and a mini-game), a day's pay in the
 * wallet, the career page — and the admin API. The test server runs on
 * made-up news (WORK_NEWS_PROVIDER=fixture) without the AI (tests/e2e/run.mjs).
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'work', { view: 'home' });
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  // The interview's best answers, by their opening words (a well-prepared candidate).
  const best = INTERVIEW.map((q) => q.options.find(([quality]) => quality === 3)[1].split('{')[0].slice(0, 18));
  try {
    const made = await page.evaluate(() => fetch('./api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'WorkerBee', password: 'nine-to-five' }) }).then((r) => r.status));
    if (made !== 200) await page.evaluate(() => fetch('./api/account/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'WorkerBee', password: 'nine-to-five' }) }));
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.app?.phase === 'menu' && window.app.account?.user, null, { timeout: 120000 });

    t.check('Work Life is a card on the home page', await until(page, () => Boolean(document.querySelector('.home [data-game="official:work-life"]')), null, 10000));
    await page.click('.home [data-game="official:work-life"]');
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('Play opens Work Life on the job search', await until(page, () => document.querySelector('.wk [data-tab="jobs"]')?.classList.contains('is-active'), null, 15000));
    t.check('the companies are the S&P 500', await until(page, () => document.querySelectorAll('.wk [data-company]').length >= 50, null, 15000));

    // Apply where they are hiring, with a well-prepared interview.
    await page.fill('.wk .mk__search[type="search"]', 'Coca');
    await page.waitForSelector('.wk [data-company="KO"]');
    let hired = false;
    for (const symbol of ['KO', 'PEP', 'COST', 'NKE', 'DIS', 'HD', 'MCD']) {
      await page.fill('.wk .mk__search[type="search"]', symbol === 'KO' ? 'Coca' : '');
      await page.waitForSelector(`.wk [data-company="${symbol}"]`, { timeout: 5000 }).catch(() => null);
      if (!(await page.$(`.wk [data-company="${symbol}"]`))) continue;
      await page.click(`.wk [data-company="${symbol}"]`);
      await page.click('.wk [data-role="analyst"]');
      const interview = await until(page, () => Boolean(document.querySelector('.wk [data-finish]')) || /not hiring/.test(document.querySelector('.wk-modal .mk__warn')?.textContent ?? ''), null, 10000);
      if (!interview || !(await page.$('.wk [data-finish]'))) {
        await page.click('.wk-modal .mk__close');
        continue;
      }
      await shot('work-interview');
      const fieldsets = await page.$$('.wk .wk-question');
      for (const [i, fs] of fieldsets.entries()) {
        const labels = await fs.$$('label');
        let chosen = 0;
        for (const [k, label] of labels.entries()) {
          const text = (await label.textContent()).trim();
          if (best.some((b) => text.startsWith(b))) chosen = k;
        }
        await (await labels[chosen].$('input')).check();
      }
      await page.click('.wk [data-finish]');
      await page.waitForSelector('.wk [data-done]', { timeout: 10000 });
      hired = /hired/.test(await page.textContent('.wk-modal'));
      await page.click('.wk [data-done]');
      if (hired) break;
    }
    t.check('hired after a good interview', hired);
    t.check('Today shows the job and the day\'s tasks', await until(page, () => /Data analyst/.test(document.querySelector('.wk .wk-job')?.textContent ?? '') && document.querySelectorAll('.wk [data-mission]').length >= 2, null, 15000));
    await shot('work-today');

    // A decision, and the mini-game.
    const choice = await page.$('.wk [data-kind="choice"] [data-option="0"]');
    if (choice) {
      await choice.click();
      t.check('a decision is scored', await until(page, () => /Score \d+/.test(document.querySelector('.wk [data-status]')?.textContent ?? ''), null, 10000));
    }
    const game = await page.$eval('.wk [data-kind="minigame"]', (n) => n.querySelector('[data-estimate]') ? 'estimate' : n.querySelector('[data-row]') ? 'spot' : 'triage').catch(() => null);
    if (game === 'estimate') await page.fill('.wk [data-kind="minigame"] [data-estimate]', '1000');
    if (game === 'spot') await page.check('.wk [data-kind="minigame"] [data-row]');
    if (game) {
      await page.click('.wk [data-kind="minigame"] .mk__btn--primary');
      t.check('the mini-game is scored', await until(page, () => document.querySelector('.wk [data-kind="minigame"]')?.classList.contains('is-done'), null, 10000));
    }
    const wallet = await page.evaluate(() => fetch('./api/wallet').then((r) => r.json()));
    t.check('a day of work is paid into the wallet', wallet.balance > 0 && wallet.ledger.some((l) => l.reason === 'salary'), JSON.stringify(wallet).slice(0, 200));

    // Life: a day in parts, a stage, things to do; the first thing done brings the first scene.
    await page.click('.wk [data-tab="life"]');
    t.check('Life opens on Monday morning with a stage, your stats, people and things to do', await until(page, () => /Monday/.test(document.querySelector('.lf__when')?.textContent ?? '') && Boolean(document.querySelector('.lf [data-stage] svg')) && document.querySelectorAll('.lf [data-stat]').length === 6 && document.querySelectorAll('.lf [data-act]').length >= 4, null, 10000));
    await page.click('.lf [data-act="steady"]');
    t.check('doing something brings a scene: people on the stage, words, and after them choices', await until(page, () => document.querySelectorAll('.lf .lf__person').length === 2 && Boolean(document.querySelector('.lf [data-say]')) && document.querySelectorAll('.lf [data-choice]').length === 3, null, 12000));
    for (let i = 0; i < 6 && !(await page.$('.lf [data-choice]:not(:disabled)')); i++) await page.click('.lf [data-next]', { force: true });
    await page.keyboard.press('1');
    t.check('an answer changes who you are to them, and the scene says what came of it', await until(page, () => Boolean(document.querySelector('.lf .lf__chips--stage .lf__chip, .lf [data-next]')) && /You chose/.test(document.querySelector('.lf__below')?.textContent ?? ''), null, 10000));
    await shot('work-life');
    // Odd jobs for anyone; and a card to share.
    await page.click('.wk [data-tab="today"]');
    t.check('Today offers odd jobs, five a day', await until(page, () => /Odd jobs — \d of 5 left today/.test(document.querySelector('.wk [data-gig]')?.textContent ?? ''), null, 10000));
    await page.click('.wk [data-tab="career"]');
    await page.click('.wk [data-share-open]');
    t.check('sharing shows a card and the words, which say it is a game, with LinkedIn and Facebook', await until(page, () => Boolean(document.querySelector('.wk-modal canvas')) && /not a real job/.test(document.querySelector('.wk-share__text')?.value ?? '') && Boolean(document.querySelector('[data-share="linkedin"]')) && Boolean(document.querySelector('[data-share="facebook"]')), null, 5000));
    await page.click('.wk-modal .mk__close');
    await page.click('.wk [data-tab="career"]');
    t.check('the career page tells what happened', await until(page, () => /Hired at/.test(document.querySelector('.wk .mk__body')?.textContent ?? '') && /salary/.test(document.querySelector('.wk .mk__body')?.textContent ?? ''), null, 10000));

    const admin = await page.evaluate(async () => {
      const refused = (await fetch('./api/work/admin')).status;
      const view = await fetch('./api/work/admin', { headers: { Authorization: `Basic ${btoa('siteadmin:test-admin-pass')}` } }).then((r) => r.json());
      return { refused, me: view.careers?.find((c) => c.name === 'WorkerBee') };
    });
    t.check('the admin API lists careers (with the id and password only)', admin.refused === 401 && admin.me?.status === 'employed', JSON.stringify(admin).slice(0, 200));

    await page.click('.wk [data-close]');
    t.check('✕ goes back to the games', await until(page, () => !document.querySelector('.wk') && !document.querySelector('.home').hidden, null, 5000));
    const real = errors.filter((e) => !/401 GET \/api\/work\/admin$/.test(e));
    t.check('no page errors', real.length === 0, real.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
