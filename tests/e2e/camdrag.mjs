import { boot, tally, until } from './lib.mjs';

/**
 * Left-drag turns the camera in the games where left mouse also attacks
 * (shared/cameraAssist.js PressDrag): a press that moves turns the view and
 * fires nothing, a click still attacks, a press held still is a held attack;
 * and Gloamreach's Q / E turn the camera. Attacks are counted at the game's
 * own entry point (Gloamreach: combat.press('LMB'); Lanternwood: basic()).
 *
 *   npm run test:e2e -- camdrag
 */
const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const GAMES = [
  { id: 'gloamreach', yaw: () => window.gloamreach.follow.yaw, spy: () => {
    const c = window.gloamreach.combat;
    window.__attacks = 0;
    const press = c.press.bind(c);
    c.press = (k) => {
      if (k === 'LMB') window.__attacks++;
      return press(k);
    };
  }, qe: true },
  { id: 'lanternwood', yaw: () => window.lanternwood.camYaw, spy: () => {
    const w = window.lanternwood;
    window.__attacks = 0;
    const basic = w.basic.bind(w);
    w.basic = (...a) => {
      window.__attacks++;
      return basic(...a);
    };
  } }
];

export async function run(browser, { only = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'camdrag', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    for (const g of GAMES) {
      if (only && !only.includes(g.id)) continue;
      // No swinging back on its own during the checks.
      await page.evaluate((id) => localStorage.setItem(`gamory.camera.${id}`, JSON.stringify({ auto: false, delay: 30, speed: 1 })), g.id);
      await page.click(`.home [data-game="official:${g.id}"]`);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const ready = await until(page, (n) => window[n] && (window[n].ready || window[n].titleEl), g.id, 240000);
      t.check(`${g.id}: opens`, ready);
      if (!ready) continue;
      await page.waitForTimeout(1000);
      if (g.id === 'gloamreach') {
        await page.evaluate(() => window.gloamreach.begin());
        await page.waitForTimeout(1500);
        // Out of the hub (nothing is fought inside its ring), in the meadow west of the village.
        await page.evaluate(() => window.gloamreach.teleport(-60, 26, 0));
        await page.waitForTimeout(800);
        t.check('gloamreach: out of the hub for the checks', !(await page.evaluate(() => window.gloamreach.combat.g.safe?.())));
      } else {
        await page.click('[data-new]');
        await page.waitForTimeout(800);
        while (await page.evaluate(() => window.lanternwood.dialogue.open)) await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      await page.evaluate(g.spy);
      const yaw = () => page.evaluate(g.yaw);
      const attacks = () => page.evaluate(() => window.__attacks);
      const box = await page.evaluate(() => {
        const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
        const r = c.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height * 0.42 };
      });
      // 1. A drag turns the camera and fires nothing.
      const y0 = await yaw();
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + i * 18, box.y + i * 2);
      const midReticle = g.id === 'gloamreach' ? await page.evaluate(() => window.gloamreach.lmb.dragging) : await page.evaluate(() => window.lanternwood.lmb.dragging);
      await page.mouse.up();
      await page.waitForTimeout(250);
      const y1 = await yaw();
      t.check(`${g.id}: a left-drag turns the camera`, Math.abs(wrap(y1 - y0)) > 0.2, `${y0.toFixed(2)} → ${y1.toFixed(2)}`);
      t.check(`${g.id}: the drag is known as a drag while it lasts (reticle held)`, midReticle === true);
      t.check(`${g.id}: a drag fires no attack (not even on release)`, (await attacks()) === 0, `attacks ${await attacks()}`);
      // 2. A click still attacks, and doesn't turn the camera.
      await page.mouse.click(box.x - 40, box.y);
      await page.waitForTimeout(250);
      const y2 = await yaw();
      t.check(`${g.id}: a click attacks`, (await attacks()) === 1, `attacks ${await attacks()}`);
      t.check(`${g.id}: a click doesn't turn the camera`, Math.abs(wrap(y2 - y1)) < 0.02);
      // 3. A press held still is an attack too (a held attack in Gloamreach: still held until release).
      await page.mouse.down();
      await page.waitForTimeout(400);
      const heldNow = g.id === 'gloamreach' ? await page.evaluate(() => window.gloamreach.combat.held.has('LMB')) : true;
      await page.mouse.up();
      await page.waitForTimeout(200);
      t.check(`${g.id}: a press held still attacks`, (await attacks()) === 2 && heldNow, `attacks ${await attacks()}, held ${heldNow}`);
      if (g.id === 'gloamreach') t.check('gloamreach: the hold lets go on release', !(await page.evaluate(() => window.gloamreach.combat.held.has('LMB'))));
      // 4. Q and E turn the camera (Gloamreach; Lanternwood already had them).
      if (g.qe) {
        const a = await yaw();
        await page.keyboard.down('KeyQ');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyQ');
        const b = await yaw();
        await page.keyboard.down('KeyE');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyE');
        const c = await yaw();
        t.check(`${g.id}: holding Q turns the camera left`, wrap(b - a) > 0.4, `${a.toFixed(2)} → ${b.toFixed(2)}`);
        t.check(`${g.id}: holding E turns it right`, wrap(c - b) < -0.4, `${b.toFixed(2)} → ${c.toFixed(2)}`);
        t.check(`${g.id}: Q and E fire nothing`, (await attacks()) === 2);
      }
      await page.evaluate((n) => window[n].close?.(), g.id);
      await until(page, () => window.app?.home?.isVisible, null, 15000);
      await page.waitForTimeout(500);
    }
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
