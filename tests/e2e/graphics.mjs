import { boot, tally, until } from './lib.mjs';

/**
 * The Graphics setting in every 3D game (shared/power.js): opened from the
 * home page, each game's pause or settings menu shows Quiet / Balanced /
 * High / Ultra and the Advanced fold; picking a preset changes what the
 * game draws — its frame cap (and the frames it really draws) or its draw
 * calls — an advanced change reads "Custom", and the choice is saved per game.
 */
const GAMES = [
  { id: 'gloamreach', global: 'gloamreach', ready: (g) => g.ready && g.mode === 'menu', start: 'begin', menu: 'escape' },
  { id: 'wyldhunt', global: 'wyldhunt', ready: (g) => g.ready && g.mode === 'menu', start: 'begin', menu: 'escape' },
  { id: 'kithvale', global: 'kithvale', ready: (g) => g.ready && g.mode === 'menu', start: 'begin', menu: 'escape' },
  { id: 'arcademia', global: 'arcademia', ready: (g) => g.mode === 'world' && g.power, start: 'arcademia', menu: 'arcademia' },
  { id: 'seoul', global: 'seoul', ready: (g) => g.power, start: null, menu: 'seoul' },
  { id: 'lanternwood', global: 'lanternwood', ready: (g) => g.titleEl && g.power, start: 'lanternwood', menu: 'lanternwood' },
  { id: 'stoneball', global: 'stoneball', ready: (g) => g.mode === 'menu' && g.power, start: 'stoneball', menu: 'escape' }
];

export async function run(browser, { shots = null, only = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'graphics', { view: 'home' });
  // Opening a game counts a play: not on a server someone is using.
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    for (const g of GAMES) {
      if (only && !only.includes(g.id)) continue;
      const card = `.home [data-game="official:${g.id}"]`;
      if (!(await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000))) {
        t.check(`${g.id}: its card is on the home page`, false);
        continue;
      }
      await page.click(card);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const opened = await until(page, ([name, ready]) => window[name] && new Function('g', `return (${ready})(g)`)(window[name]), [g.global, g.ready.toString()], 240000);
      t.check(`${g.id}: opens from the home page`, opened);
      if (!opened) continue;
      await page.waitForTimeout(800);
      // Into play.
      if (g.start === 'begin') await page.evaluate((n) => window[n].begin(), g.global);
      if (g.start === 'arcademia') {
        await page.click('.arc-start__play');
        await page.waitForTimeout(800);
        const buddy = await page.$('.arc-side--buddy .arc-btn--primary');
        if (buddy) await buddy.click();
      }
      if (g.start === 'lanternwood') await page.click('[data-new]');
      if (g.start === 'stoneball') {
        await page.click('.sb-overlay [data-play]');
        await until(page, () => window.stoneball.mode === 'play', null, 30000);
      }
      await page.waitForTimeout(2500);
      const measure = () => page.evaluate((n) => {
        const game = window[n];
        const r = game.renderer ?? game.stage?.renderer ?? game.view?.renderer;
        return { cap: game.power.cap, drawn: game.power.loop.fps, calls: game.post?.stats?.calls ?? r?.info.render.calls ?? 0, preset: game.power.preset };
      }, g.global);
      const before = await measure();
      t.check(`${g.id}: Balanced by default, 60 frames a second at most`, before.preset === 'balanced' && before.cap === 60 && before.drawn <= 64, JSON.stringify(before));
      // The menu.
      if (g.menu === 'escape') {
        await page.evaluate((n) => window[n].root?.focus(), g.global);
        await page.keyboard.press('Escape');
      } else if (g.menu === 'arcademia') await page.click('.arc-chip--settings');
      else if (g.menu === 'seoul') {
        // Gangnam Jarani opens on its race menu: close it, then the bar's Graphics button.
        const x = await page.$('[data-race-x]');
        if (x) await x.click();
        await page.click('[data-open-gfx]');
      }
      else if (g.menu === 'lanternwood') {
        await page.evaluate(() => window.lanternwood.root.focus());
        if (await page.evaluate(() => window.lanternwood.dialogue.open)) await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      }
      const shown = await until(page, () => Boolean(document.querySelector('[data-graphics] [data-preset="quiet"]')), null, 8000);
      t.check(`${g.id}: the menu shows Graphics with its presets`, shown);
      if (!shown) continue;
      t.check(`${g.id}: …and the hint and an Advanced fold`, await page.evaluate(() => /laptop cool/.test(document.querySelector('[data-graphics]').textContent) && Boolean(document.querySelector('[data-graphics] details [data-opt="fps"]'))));
      if (shots) {
        await page.evaluate(() => (document.querySelector('[data-graphics] details').open = true));
        await page.screenshot({ path: `${shots}/graphics-${g.id}.png` });
      }
      await page.click('[data-graphics] [data-preset="quiet"]');
      const quiet = await measure();
      await page.click('[data-graphics] [data-preset="ultra"]');
      const ultra = await measure();
      t.check(`${g.id}: Quiet lowers the frame cap, Ultra puts it back`, quiet.preset === 'quiet' && quiet.cap < 60 && ultra.cap === 60, JSON.stringify({ quiet, ultra }));
      await page.evaluate(() => (document.querySelector('[data-graphics] details').open = true));
      await page.click('[data-graphics] [data-opt="fps"][data-value="30"]');
      t.check(`${g.id}: an advanced change reads "Custom" and takes effect at once`, (await page.textContent('[data-graphics] [data-graphics-label]')) === 'Custom' && (await measure()).cap === 30);
      const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem(`gamory.graphics.${id}`) ?? 'null'), g.id);
      t.check(`${g.id}: saved for this game`, saved?.custom?.fps === 30);
      await page.click('[data-graphics] [data-preset="balanced"]');
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
