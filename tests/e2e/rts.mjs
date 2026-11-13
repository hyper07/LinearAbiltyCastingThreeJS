import { boot, tally, until } from './lib.mjs';

/**
 * Shardfront, by mouse: its card, the set-up (faction, map, rivals), the
 * match — a box around the workers, a worker trained at the core, shards
 * mined, a building placed from the build card — then surrender and back.
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'rts', { view: 'home' });
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  try {
    t.check('Shardfront is a card on the home page', await until(page, () => Boolean(document.querySelector('.home [data-game="official:shardfront"]')), null, 10000));
    await page.click('.home [data-game="official:shardfront"]');
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('Play opens the set-up', await until(page, () => document.querySelectorAll('.rts [data-faction]').length === 3, null, 15000));
    await page.click('.rts [data-faction="thornkin"]');
    await page.click('.rts [data-size] [data-value="large"]');
    await page.click('.rts [data-rivals] [data-value="1"]');
    await page.click('.rts [data-difficulty] [data-value="easy"]');
    await shot('rts-setup');
    await page.click('.rts [data-start]');
    t.check('the match starts: a map, a base and five workers', await until(page, () => window.rts?.sim?.unitsOf(0).length === 5 && window.rts.sim.buildingsOf(0).length === 1 && window.rts.sim.players[0].faction === 'thornkin', null, 15000));
    await page.waitForTimeout(800);

    // A box around the base picks the workers.
    await page.evaluate(() => window.rts.select([]));
    const box = await page.evaluate(() => {
      const v = window.rts.view;
      const pts = window.rts.sim.unitsOf(0).map((u) => v.toScreen(u.x, 1, u.z));
      const r = v.canvas.getBoundingClientRect();
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return { x0: r.left + Math.min(...xs) - 30, y0: r.top + Math.min(...ys) - 30, x1: r.left + Math.max(...xs) + 30, y1: r.top + Math.max(...ys) + 30 };
    });
    await page.mouse.move(box.x0, box.y0);
    await page.mouse.down();
    await page.mouse.move((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, { steps: 4 });
    await page.mouse.move(box.x1, box.y1, { steps: 4 });
    await page.mouse.up();
    t.check('dragging a box selects the workers', await until(page, () => window.rts.selection.length === 5, null, 3000), await page.evaluate(() => String(window.rts.selection.length)));

    // Right-click a crystal: they go mining.
    const crystal = await page.evaluate(() => {
      const v = window.rts.view;
      const core = window.rts.sim.buildingsOf(0)[0];
      const r = v.canvas.getBoundingClientRect();
      // The nearest crystal that is on screen, clear of the top bar.
      const node = window.rts.sim.nodes()
        .sort((a, b) => Math.hypot(a.x - core.x, a.z - core.z) - Math.hypot(b.x - core.x, b.z - core.z))
        .find((nd) => {
          const p = v.toScreen(nd.x, 1, nd.z);
          return p.x > 20 && p.y > 70 && p.x < v.width - 20 && p.y < v.height - 20;
        });
      const p = v.toScreen(node.x, 1, node.z);
      return { x: r.left + p.x, y: r.top + p.y };
    });
    await page.mouse.click(crystal.x, crystal.y, { button: 'right' });
    t.check('right-clicking a crystal sends them mining', await until(page, () => window.rts.sim.unitsOf(0).filter((u) => u.order.type === 'gather' || u.order.type === 'return').length >= 4, null, 3000));

    // Click the core, train a worker with its button.
    const core = await page.evaluate(() => {
      const v = window.rts.view;
      const c = window.rts.sim.buildingsOf(0)[0];
      const p = v.toScreen(c.x, 2, c.z);
      const r = v.canvas.getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    });
    await page.mouse.click(core.x, core.y);
    t.check('clicking the core selects it', await until(page, () => window.rts.picked[0]?.type === 'core', null, 3000));
    await page.click('.rts [data-card] [data-key="Q"]');
    t.check('its Q button trains a worker', await until(page, () => window.rts.sim.buildingsOf(0)[0].queue.length === 1, null, 3000));
    await page.click('.rts [data-speed]');
    await page.click('.rts [data-speed]'); // 2×
    t.check('shards come in', await until(page, () => window.rts.sim.players[0].stats.gathered >= 20, null, 30000));
    t.check('the new worker appears', await until(page, () => window.rts.sim.unitsOf(0).length === 6, null, 20000));

    // Build a Seedpod from a worker's build card, placed with the mouse (once there are shards for it).
    t.check('shards enough for a Seedpod', await until(page, () => window.rts.sim.players[0].shards >= 100, null, 40000));
    await page.evaluate(() => window.rts.select([window.rts.sim.unitsOf(0)[0]]));
    await page.keyboard.press('b');
    t.check('B opens the build card', await until(page, () => Boolean(document.querySelector('.rts [data-card] [data-key="D"]')), null, 3000));
    await page.keyboard.press('d');
    const site = await page.evaluate(() => {
      const { sim, view } = window.rts;
      const c = sim.buildingsOf(0)[0];
      const r = view.canvas.getBoundingClientRect();
      for (let d = 6; d < 16; d++) {
        for (const [dx, dz] of [[d, 0], [-d, 0], [0, -d], [0, d]]) {
          const x0 = c.x0 + dx;
          const z0 = c.z0 + dz;
          if (!sim.canPlace(0, 'depot', x0, z0)) continue;
          const p = view.toScreen((x0 + 1) * 2, 0.5, (z0 + 1) * 2);
          if (p.x > 60 && p.y > 150 && p.x < view.width - 60 && p.y < view.height - 60) return { x: r.left + p.x, y: r.top + p.y };
        }
      }
      return null;
    });
    if (site) {
      await page.mouse.move(site.x, site.y, { steps: 3 });
      await page.waitForTimeout(100);
      await page.mouse.click(site.x, site.y);
    }
    t.check('a Seedpod goes up where it was clicked', await until(page, () => window.rts.sim.buildingsOf(0).some((b) => b.type === 'depot'), null, 30000), JSON.stringify(site));
    await shot('rts-match');

    page.once('dialog', (d) => d.accept());
    await page.click('.rts [data-surrender]');
    t.check('surrender ends it: the result', await until(page, () => !document.querySelector('.rts [data-result]')?.hidden && /Defeat/.test(document.querySelector('.rts [data-result]')?.textContent ?? ''), null, 10000));
    await page.click('.rts [data-home]');
    t.check('back to the games', await until(page, () => !document.querySelector('.rts') && !document.querySelector('.home').hidden, null, 5000));
    t.check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
