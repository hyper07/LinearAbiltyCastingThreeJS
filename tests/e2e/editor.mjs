import { boot, tally, until } from './lib.mjs';

/**
 * The map editor by mouse: spawn points and waiting monsters placed,
 * dragged, edited and deleted like portals and NPCs; a spawn point limited
 * to one monster and later waves; a portal dragged; and a play test where
 * the waves walk in from the points that take them.
 */

/** The screen point over the ground at world (x, z). */
const screen = (page, x, z) =>
  page.evaluate(
    ([x, z]) => {
      const app = window.app;
      const V = app.character.position.constructor;
      const v = new V(x, app.levelEditor.terrain.heightAt(x, z), z).project(app.camera);
      const r = app.canvas.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    [x, z]
  );

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function click(page, at) {
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(120);
}

const near = (p, x, z, tol = 1.2) => p && Math.hypot(p.x - x, p.z - z) < tol;

export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'editor');
  try {
    await page.evaluate(() => window.app.openEditor());
    t.check('the editor opens', await until(page, () => window.app.levelEditor?.active, null, 30000));
    await page.waitForTimeout(800);
    const level = () => page.evaluate(() => JSON.parse(JSON.stringify(window.app.levelEditor.level)));

    // Spawn points: click to add, drag to move.
    await page.click('[data-tool="spawns"]');
    await click(page, await screen(page, 8, 0));
    let l = await level();
    t.check('a click adds a spawn point', l.spawns.length === 1 && near(l.spawns[0], 8, 0), JSON.stringify(l.spawns));
    await drag(page, await screen(page, 8, 0), await screen(page, 0, -8));
    l = await level();
    t.check('a spawn point can be dragged', l.spawns.length === 1 && near(l.spawns[0], 0, -8), JSON.stringify(l.spawns));

    // Limit it to the Emberwyrm, from wave 2.
    await click(page, await screen(page, 0, -8));
    await page.getByLabel('Any monster').uncheck();
    for (const name of ['Skeleton Minion', 'Skeleton Mage', 'Skeleton Warrior', 'Bone Colossus']) await page.getByLabel(name, { exact: true }).uncheck();
    await page.getByLabel('Open from wave').fill('2');
    await page.getByLabel('Open from wave').dispatchEvent('change');
    await page.waitForTimeout(150);
    l = await level();
    t.check('a spawn point can be limited to one monster and later waves', JSON.stringify(l.spawns[0].kinds) === '["dragon"]' && l.spawns[0].from === 2, JSON.stringify(l.spawns[0]));
    t.check('its limits show above it', await page.evaluate(() => [...document.querySelectorAll('.world-label')].some((el) => /Emberwyrm · wave 2\+/.test(el.textContent))));

    // A second, open point; a third removed with Delete.
    await click(page, await screen(page, -8, 0));
    await click(page, await screen(page, 6, 6));
    t.check('more points can be added', (await level()).spawns.length === 3);
    await page.keyboard.press('Delete');
    l = await level();
    t.check('Delete removes the selected point', l.spawns.length === 2 && !l.spawns.some((s) => near(s, 6, 6)), JSON.stringify(l.spawns));

    // Waiting monsters: place, drag, change kind, remove.
    await page.click('[data-tool="monsters"]');
    await click(page, await screen(page, 4, 4));
    await drag(page, await screen(page, 4, 4), await screen(page, -4, 5));
    l = await level();
    t.check('a waiting monster can be placed and dragged', l.monsters.length === 1 && near(l.monsters[0], -4, 5), JSON.stringify(l.monsters));
    await page.locator('.editor__segmented button', { hasText: 'Skeleton Warrior' }).click();
    l = await level();
    t.check('the selected monster takes the kind picked', l.monsters[0]?.kind === 'brute', JSON.stringify(l.monsters));
    await click(page, await screen(page, 3, -3));
    await page.keyboard.press('Delete');
    l = await level();
    t.check('Delete removes the selected monster', l.monsters.length === 1 && l.monsters[0].kind === 'brute', JSON.stringify(l.monsters));

    // Portals still drag.
    await page.click('[data-tool="portals"]');
    await click(page, await screen(page, 5, -2));
    await drag(page, await screen(page, 5, -2), await screen(page, 2, 7));
    l = await level();
    t.check('a portal can be dragged', l.portals.length === 1 && near(l.portals[0], 2, 7), JSON.stringify(l.portals.map((p) => [p.x, p.z])));

    // Undo puts things back and clears the selection.
    await page.keyboard.press('Control+KeyZ');
    await page.waitForTimeout(300);
    l = await level();
    t.check('undo takes the portal back to where it was placed', near(l.portals[0], 5, -2), JSON.stringify(l.portals.map((p) => [p.x, p.z])));

    // Play test: wave 1 comes in from the open point only; the Emberwyrm in wave 2 from its gate.
    // Started without waiting inside the page: the play test waits for its Start button.
    await page.evaluate(() => {
      const lvl = JSON.parse(JSON.stringify(window.app.levelEditor.level));
      lvl.monsters = [];
      window.app.playLevel(lvl, { fromEditor: true });
    });
    await page.getByRole('button', { name: 'Start', exact: true }).click({ timeout: 60000 });
    t.check('the play test starts', await until(page, () => window.app.phase === 'playing', null, 30000));
    const arrivals = await page.evaluate(() => {
      const app = window.app;
      const seen = [];
      app.monsters.on('spawn', (m) => seen.push({ kind: m.kind ?? m.config?.id, x: m.position.x, z: m.position.z }));
      app.director.stop();
      app.monsters.despawnAll();
      for (let i = 0; i < 6; i++) app.monsters.spawn('grunt', null, { wave: 1 });
      const boss = app.monsters.spawn('dragon', null, { wave: 2 });
      return { seen, boss: boss && { x: boss.position.x, z: boss.position.z } };
    });
    const grunts = arrivals.seen.filter((s) => s.kind === 'grunt');
    t.check('wave 1 walks in from the open point', grunts.length >= 6 && grunts.every((s) => near(s, -8, 0, 2)), JSON.stringify(grunts.slice(0, 3)));
    t.check('the Emberwyrm in wave 2 comes through its own point', near(arrivals.boss, 0, -8, 2), JSON.stringify(arrivals.boss));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
