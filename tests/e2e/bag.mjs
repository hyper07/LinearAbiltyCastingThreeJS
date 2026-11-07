import { boot, tally, until } from './lib.mjs';

/**
 * The bag by mouse, end to end: arranging items by dragging, wearing a ring
 * on the finger it is dropped on, taking a helmet off into a chosen cell,
 * dropping things on the ground by dragging them out of the bag, and a full
 * bag that takes nothing until room is made.
 */

const gear = (uid, base, kind, group, name) => ({ uid, type: 'gear', rarity: 'common', name, base, baseName: name, kind, group, implicit: {}, stats: {}, value: 0 });

/** Press, move in steps (so the drag starts and follows), let go. */
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(150);
}

const centre = (page, selector) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

/** Where to point so a w×h item lands with its top-left on bag cell (x, y). */
const cellPoint = (page, x, y, w, h, grabbed = 'centre') =>
  page.evaluate(
    ([x, y, w, h, grabbed]) => {
      const grid = document.querySelector('[data-grid="bag"]');
      const r = grid.getBoundingClientRect();
      const cell = r.width / Number(grid.style.getPropertyValue('--cols'));
      // Worn pieces land by their centre; bag items by the cell they were picked up by (the top-left one here).
      return grabbed === 'centre' ? { x: r.left + (x + w / 2) * cell, y: r.top + (y + h / 2) * cell } : { x: r.left + (x + 0.5) * cell, y: r.top + (y + 0.5) * cell };
    },
    [x, y, w, h, grabbed]
  );

export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'bag');
  try {
    await page.click('[data-start]', { force: true });
    t.check('starts a run', await until(page, () => window.app.phase === 'playing', null, 30000));
    await page.evaluate(
      ([items]) => {
        const app = window.app;
        app.director.stop();
        for (const it of items) app.profile.pickUp(it);
      },
      [[gear('ring-a', 'band', 'ring', 'ring', 'Band A'), gear('ring-b', 'signet', 'ring', 'ring', 'Signet B'), gear('helm', 'cloth-head', 'head', 'cloth', 'Silk Hood')]]
    );
    await page.keyboard.press('Tab');
    t.check('the bag opens', await until(page, () => window.app.inventory.isOpen, null, 2000));

    // A ring dropped on the second finger goes there.
    await drag(page, await centre(page, '[data-uid="ring-a"]'), await centre(page, '[data-slot="ring2"]'));
    t.check('a ring dragged onto the second finger is worn there', await page.evaluate(() => window.app.profile.gear.ring2?.uid === 'ring-a' && !window.app.profile.gear.ring1));

    // A ring dropped on the helmet slot is refused.
    await drag(page, await centre(page, '[data-uid="ring-b"]'), await centre(page, '[data-slot="head"]'));
    t.check('a ring dropped on the head slot stays in the bag', await page.evaluate(() => !window.app.profile.gear.head && window.app.profile.bag.some((i) => i.uid === 'ring-b')));

    // The helmet onto its slot, then off again into the bottom-right corner.
    await drag(page, await centre(page, '[data-uid="helm"]'), await centre(page, '[data-slot="head"]'));
    t.check('the helmet dragged onto the head is worn', await page.evaluate(() => window.app.profile.gear.head?.uid === 'helm'));
    const size = await page.evaluate(() => [window.app.profile.bagRowCount]);
    const [rows] = size;
    await drag(page, await centre(page, '[data-slot="head"]'), await cellPoint(page, 6, rows - 2, 2, 2));
    t.check(
      'the helmet dragged off the head lands in the chosen cell',
      await page.evaluate((y) => JSON.stringify(window.app.profile.bag.find((i) => i.uid === 'helm')?.at) === JSON.stringify([6, y]) && !window.app.profile.gear.head, rows - 2)
    );

    // Arranging: the signet from where it is to the bottom-left cell.
    const signet = await page.evaluate(() => {
      const r = document.querySelector('[data-uid="ring-b"]').getBoundingClientRect();
      return { x: r.left + 6, y: r.top + 6 };
    });
    await drag(page, signet, await cellPoint(page, 0, rows - 1, 1, 1, 'corner'));
    t.check('an item dragged within the bag moves there', await page.evaluate((y) => JSON.stringify(window.app.profile.bag.find((i) => i.uid === 'ring-b')?.at) === JSON.stringify([0, y]), rows - 1));

    // Out of the bag: on the ground — from the finger and from the bag.
    const ground = { x: 12, y: 360 };
    await drag(page, await centre(page, '[data-slot="ring2"]'), ground);
    t.check('a worn ring dragged out of the bag is dropped', await page.evaluate(() => !window.app.profile.gear.ring2 && window.app.loot.drops.some((d) => d.item?.uid === 'ring-a')));
    await drag(page, await centre(page, '[data-uid="helm"]'), ground);
    t.check('an item dragged out of the bag lies on the ground', await page.evaluate(() => !window.app.profile.bag.some((i) => i.uid === 'helm') && window.app.loot.drops.some((d) => d.item?.uid === 'helm')));

    // A full bag takes nothing more until room is made.
    const full = await page.evaluate(() => {
      const app = window.app;
      let n = 0;
      while (n < 200 && app.profile.pickUp({ uid: `fill-${n}`, type: 'gear', rarity: 'common', name: 'Hood', base: 'cloth-head', baseName: 'Hood', kind: 'head', group: 'cloth', implicit: {}, stats: {}, value: 0 }).ok) n++;
      const extra = { uid: 'extra', type: 'gear', rarity: 'common', name: 'Spare Hood', base: 'cloth-head', baseName: 'Spare Hood', kind: 'head', group: 'cloth', implicit: {}, stats: {}, value: 0 };
      return { n, refused: app.loot.onPickup(extra) };
    });
    t.check('a full bag refuses a pickup', full.n > 0 && full.refused.ok === false && /No room/.test(full.refused.message), JSON.stringify(full.refused));
    await page.waitForTimeout(100);
    await drag(page, await centre(page, '[data-uid="fill-0"]'), ground);
    // What you drop stays down while you stand on it: the room it made is still free.
    await page.waitForTimeout(1500);
    t.check(
      'dropped things are not picked straight back up',
      await page.evaluate(() => ['fill-0', 'helm', 'ring-a'].every((uid) => window.app.loot.has(uid) && !window.app.profile.bag.some((i) => i.uid === uid)))
    );
    const after = await page.evaluate(() =>
      window.app.loot.onPickup({ uid: 'extra', type: 'gear', rarity: 'common', name: 'Spare Hood', base: 'cloth-head', baseName: 'Spare Hood', kind: 'head', group: 'cloth', implicit: {}, stats: {}, value: 0 })
    );
    t.check('after dropping one, it fits', after.ok === true, JSON.stringify(after));

    await page.keyboard.press('Tab');
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
