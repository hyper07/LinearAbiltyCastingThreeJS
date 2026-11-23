import { boot, tally, until } from './lib.mjs';

/**
 * How to play (shared/helpPanel.js) in every game: it opens by itself the
 * first time a game is played and pauses it, H closes it and opens it again,
 * Esc closes it, the "?" button is there, and the pause menu has an entry.
 */
const GAMES = [
  { id: 'gloamreach', global: 'gloamreach', start: 'begin', pauseKey: 'Escape' },
  { id: 'wyldhunt', global: 'wyldhunt', start: 'begin', pauseKey: 'Escape' },
  { id: 'kithvale', global: 'kithvale', start: 'begin', pauseKey: 'Escape' },
  { id: 'kindlewatch', global: 'kindlewatch', start: 'begin', pauseKey: 'Escape' },
  { id: 'snowpuff', global: 'snowpuff', start: 'begin', pauseKey: 'Escape' },
  { id: 'lanternwood', global: 'lanternwood', start: 'lanternwood', pauseKey: 'Escape' },
  { id: 'stoneball', global: 'stoneball', start: 'stoneball', pauseKey: 'Escape' },
  { id: 'arcademia', global: 'arcademia', start: 'arcademia' },
  { id: 'seoul', global: 'seoul', start: null }
];

export async function run(browser, { only = null, shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'help', { view: 'home', firstHelp: true });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    for (const g of GAMES) {
      if (only && !only.includes(g.id)) continue;
      const card = `.home [data-game="official:${g.id}"]`;
      await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000);
      await page.click(card);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const ready = await until(page, ([n, how]) => {
        const x = window[n];
        if (!x) return false;
        if (how === 'begin') return x.ready && x.mode === 'menu';
        if (how === 'lanternwood') return Boolean(x.titleEl);
        if (how === 'stoneball') return x.mode === 'menu';
        if (how === 'arcademia') return x.mode === 'world';
        return Boolean(x.power && x.help);
      }, [g.global, g.start], 240000);
      t.check(`${g.id}: opens`, ready);
      if (!ready) continue;
      await page.waitForTimeout(1200);
      if (g.start === 'begin') await page.evaluate((n) => window[n].begin(), g.global);
      if (g.start === 'lanternwood') {
        await until(page, () => Boolean(document.querySelector('[data-new]')), null, 30000);
        await page.click('[data-new]');
      }
      if (g.start === 'stoneball') {
        await until(page, () => Boolean(document.querySelector('.sb-overlay [data-play]')), null, 30000);
        await page.click('.sb-overlay [data-play]');
      }
      if (g.start === 'arcademia') {
        await until(page, () => Boolean(document.querySelector('.arc-start__play')), null, 30000);
        await page.click('.arc-start__play');
      }
      const auto = await until(page, () => Boolean(document.querySelector('[data-help-panel]')), null, g.id === 'seoul' ? 60000 : 10000);
      t.check(`${g.id}: How to play opens by itself the first time`, auto);
      if (!auto) continue;
      t.check(`${g.id}: …with a goal and the keys by group, H among them`, await page.evaluate(() => {
        const h = document.querySelector('[data-help-panel]');
        return h.querySelector('.hp__goal').textContent.length > 30 && h.querySelectorAll('.hp__group').length >= 3 && Boolean(h.querySelector('[data-help-row="help"]'));
      }));
      if (shots) await page.screenshot({ path: `${shots}/help-${g.id}.png` });
      await page.keyboard.press('KeyH');
      t.check(`${g.id}: H closes it`, await until(page, () => !document.querySelector('[data-help-panel]'), null, 4000));
      await page.waitForTimeout(400);
      await page.evaluate((n) => (window[n].root ?? document.body).focus?.(), g.global);
      if (g.id === 'lanternwood') while (await page.evaluate(() => window.lanternwood.dialogue.open)) await page.keyboard.press('Escape');
      if (g.id === 'arcademia') {
        const buddy = await page.$('.arc-side--buddy .arc-btn--primary');
        if (buddy) await buddy.click();
        await page.waitForTimeout(500);
        await page.evaluate(() => window.arcademia.root.focus());
      }
      await page.keyboard.press('KeyH');
      t.check(`${g.id}: H opens it again`, await until(page, () => Boolean(document.querySelector('[data-help-panel]')), null, 4000));
      await page.keyboard.press('Escape');
      t.check(`${g.id}: Esc closes it`, await until(page, () => !document.querySelector('[data-help-panel]'), null, 4000));
      t.check(`${g.id}: a ? button in the HUD`, Boolean(await page.$('[data-help-button]')));
      if (g.pauseKey) {
        await page.waitForTimeout(300);
        await page.evaluate((n) => window[n].root?.focus?.(), g.global);
        if (g.id === 'lanternwood') while (await page.evaluate(() => window.lanternwood.dialogue.open)) await page.keyboard.press('Escape');
        await page.keyboard.press(g.pauseKey);
        const entry = await until(page, () => Boolean(document.querySelector('[data-open-help], [data-controls]')), null, 5000);
        t.check(`${g.id}: the pause menu has How to play`, entry);
        if (entry) {
          await page.click('[data-open-help], [data-controls]');
          t.check(`${g.id}: …and it opens the panel`, await until(page, () => Boolean(document.querySelector('[data-help-panel]')), null, 4000));
          await page.keyboard.press('Escape');
        }
      }
      await page.evaluate((n) => window[n].close(), g.global);
      await until(page, () => window.app?.home?.isVisible, null, 15000);
      await page.waitForTimeout(500);
    }
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
