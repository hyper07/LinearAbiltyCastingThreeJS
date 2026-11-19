import { boot, tally, until } from './lib.mjs';

/**
 * The camera assist in the third-person games (shared/cameraAssist.js):
 * holding , or . turns the camera, / puts it behind the hero, and — with
 * the delay set short for the test — after a quiet spell it eases back
 * behind a hero on the move by itself. The hero is walked a fixed way (a
 * test seam: their heading no longer follows the camera) so "behind" stays put.
 */
const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const GAMES = [
  { id: 'gloamreach', global: 'gloamreach', hero: 'hero', start: 'begin' },
  { id: 'wyldhunt', global: 'wyldhunt', hero: 'hunter', start: 'begin' },
  { id: 'kithvale', global: 'kithvale', hero: 'player', start: 'begin' },
  { id: 'lanternwood', global: 'lanternwood', start: 'lanternwood' },
  { id: 'arcademia', global: 'arcademia', start: 'arcademia', noAuto: true }
];

/** { yaw, behind } in the page, whichever camera the game has. */
function readCamera([name, hero]) {
  const g = window[name];
  if (g.follow) return { yaw: g.follow.yaw, behind: g[hero].yaw + Math.PI };
  if (name === 'lanternwood') return { yaw: g.camYaw, behind: g.heroPos.face + Math.PI };
  return g.world.cameraYaw();
}

export async function run(browser, { only = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'camera', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    for (const g of GAMES) {
      if (only && !only.includes(g.id)) continue;
      // A short delay for the test (the default is 10 s), saved the way the settings menu saves it.
      await page.evaluate((id) => localStorage.setItem(`gamory.camera.${id}`, JSON.stringify({ auto: true, delay: 3, speed: 1 })), g.id);
      const card = `.home [data-game="official:${g.id}"]`;
      await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000);
      await page.click(card);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const ready = await until(page, (n) => {
        const x = window[n];
        return x && (x.ready || x.titleEl || x.mode === 'world') && (x.follow || x.camAssist || x.world?.camAssist);
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
      const cam = () => page.evaluate(readCamera, [g.global, g.hero]);
      // 1. The keys turn it.
      const a = await cam();
      await page.keyboard.down('Period');
      await page.waitForTimeout(600);
      await page.keyboard.up('Period');
      const b = await cam();
      t.check(`${g.id}: holding . turns the camera right`, wrap(b.yaw - a.yaw) < -0.4, `${a.yaw.toFixed(2)} → ${b.yaw.toFixed(2)}`);
      await page.keyboard.down('Comma');
      await page.waitForTimeout(300);
      await page.keyboard.up('Comma');
      const c = await cam();
      t.check(`${g.id}: holding , turns it back left`, wrap(c.yaw - b.yaw) > 0.2);
      // 2. / puts it behind the hero now.
      await page.keyboard.press('Slash');
      await page.waitForTimeout(1800);
      const d = await cam();
      t.check(`${g.id}: / puts it behind the hero`, Math.abs(wrap(d.yaw - d.behind)) < 0.15, `off by ${wrap(d.yaw - d.behind).toFixed(2)}`);
      if (g.noAuto) {
        // The mountain's camera recenters by itself only when following the buddy close up as they walk; the keys are what's checked here.
        await page.evaluate((n) => window[n].close(), g.global);
        await until(page, () => window.app?.home?.isVisible, null, 15000);
        await page.waitForTimeout(500);
        continue;
      }
      // 3. Turn it away, then walk a fixed way: after the 3 s delay it eases back behind by itself.
      await page.keyboard.down('Period');
      await page.waitForTimeout(700);
      await page.keyboard.up('Period');
      const e = await cam();
      t.check(`${g.id}: turned away from behind`, Math.abs(wrap(e.yaw - e.behind)) > 0.6);
      if (g.id === 'lanternwood') {
        await page.evaluate(() => {
          const w = window.lanternwood;
          const f = w.heroPos.face;
          w._moveInput = () => [Math.sin(f), Math.cos(f)];
        });
      } else {
        await page.evaluate(([n, hero]) => {
          const w = window[n];
          const h = w[hero].yaw;
          w.follow.heading = () => h;
          window.__heldW = true;
        }, [g.global, g.hero]);
        await page.keyboard.down('KeyW');
      }
      await page.waitForTimeout(1500);
      const f = await cam();
      t.check(`${g.id}: not before the delay`, Math.abs(wrap(f.yaw - f.behind)) > 0.5, `off by ${wrap(f.yaw - f.behind).toFixed(2)}`);
      await page.waitForTimeout(3500);
      const h = await cam();
      if (g.id !== 'lanternwood') await page.keyboard.up('KeyW');
      t.check(`${g.id}: after the delay it has eased back behind the hero`, Math.abs(wrap(h.yaw - h.behind)) < 0.15, `off by ${wrap(h.yaw - h.behind).toFixed(2)}`);
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
