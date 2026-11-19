import { boot, tally, until } from './lib.mjs';

/**
 * The full map (shared/worldMap.js), opened with O in every 3D game: the
 * open worlds show their map, take a click as a waypoint (a pin on the map,
 * a cue on screen once closed) and close with O again; Lanternwood's O opens
 * its own realm map, Arcademia's the whole mountain.
 */
const GAMES = [
  { id: 'gloamreach', global: 'gloamreach', start: 'begin', kind: 'world' },
  { id: 'wyldhunt', global: 'wyldhunt', start: 'begin', kind: 'world' },
  { id: 'kithvale', global: 'kithvale', start: 'begin', kind: 'world' },
  { id: 'lanternwood', global: 'lanternwood', start: 'lanternwood', kind: 'lanternwood' },
  { id: 'arcademia', global: 'arcademia', start: 'arcademia', kind: 'arcademia' }
];

export async function run(browser, { only = null, shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'map', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    for (const g of GAMES) {
      if (only && !only.includes(g.id)) continue;
      const card = `.home [data-game="official:${g.id}"]`;
      await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000);
      await page.click(card);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const ready = await until(page, (n) => {
        const x = window[n];
        return x && (x.ready || x.titleEl || (x.mode === 'world' && x.power));
      }, g.global, 240000);
      t.check(`${g.id}: opens`, ready);
      if (!ready) continue;
      await page.waitForTimeout(1000);
      if (g.start === 'begin') await page.evaluate((n) => window[n].begin(), g.global);
      if (g.start === 'lanternwood') {
        await page.click('[data-new]');
        await page.waitForTimeout(800);
        await page.evaluate(() => window.lanternwood.root.focus());
        while (await page.evaluate(() => window.lanternwood.dialogue.open)) await page.keyboard.press('Escape');
      }
      if (g.start === 'arcademia') {
        await page.click('.arc-start__play');
        await page.waitForTimeout(800);
        const buddy = await page.$('.arc-side--buddy .arc-btn--primary');
        if (buddy) await buddy.click();
        await page.waitForTimeout(800);
        await page.evaluate(() => window.arcademia.root.focus());
      }
      await page.waitForTimeout(1500);
      if (g.kind === 'world') {
        t.check(`${g.id}: the minimap has a map button`, Boolean(await page.$('[data-map-button]')));
        await page.keyboard.press('KeyO');
        const open = await until(page, () => Boolean(document.querySelector('[data-world-map]')), null, 5000);
        t.check(`${g.id}: O opens the full map, and the game waits`, open && (await page.evaluate((n) => window[n].mode === 'map', g.global)));
        if (!open) continue;
        const stage = await page.$('[data-map-stage]');
        const b = await stage.boundingBox();
        await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.4);
        t.check(`${g.id}: a click sets a waypoint`, await until(page, (n) => Boolean(window[n].waypoint.point), g.global, 3000));
        if (shots) await page.screenshot({ path: `${shots}/fullmap-${g.id}.png` });
        await page.keyboard.press('KeyO');
        t.check(`${g.id}: O closes it, back to play`, await until(page, (n) => !document.querySelector('[data-world-map]') && window[n].mode === 'play', g.global, 5000));
        t.check(`${g.id}: the cue points the way`, await until(page, () => {
          const c = document.querySelector('[data-waypoint-cue]');
          return c && !c.hidden && /\d+ m/.test(c.textContent);
        }, null, 5000));
        // From the pause menu, too.
        await page.evaluate((n) => window[n].root?.focus(), g.global);
        await page.keyboard.press('Escape');
        await until(page, () => Boolean(document.querySelector('[data-open-map]')), null, 5000);
        await page.click('[data-open-map]');
        t.check(`${g.id}: the pause menu's Map opens it`, await until(page, () => Boolean(document.querySelector('[data-world-map]')), null, 5000));
        await page.click('[data-map-clear]');
        t.check(`${g.id}: Clear pin clears the waypoint`, await until(page, (n) => !window[n].waypoint.point, g.global, 3000));
        await page.click('[data-map-close]');
      } else if (g.kind === 'lanternwood') {
        await page.keyboard.press('KeyO');
        const open = await until(page, () => Boolean(document.querySelector('.ld-overlay--map canvas')), null, 5000);
        t.check('lanternwood: O opens its realm map', open);
        if (shots && open) await page.screenshot({ path: `${shots}/fullmap-lanternwood.png` });
        await page.keyboard.press('Escape');
      } else {
        const d0 = await page.evaluate(() => window.arcademia.world.camera.position.distanceTo(window.arcademia.world.controls.target));
        await page.keyboard.press('KeyO');
        const far = await until(page, (d) => window.arcademia.world.camera.position.distanceTo(window.arcademia.world.controls.target) > d * 1.8, d0, 5000);
        t.check('arcademia: O shows the whole mountain', far);
        await page.waitForTimeout(1200);
        if (shots) await page.screenshot({ path: `${shots}/fullmap-arcademia.png` });
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
