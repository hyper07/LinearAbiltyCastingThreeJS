import { boot, tally, until } from './lib.mjs';

/**
 * The action bar and the bag button, by mouse: potions on keys 6 and 7 with
 * their counts, drunk by a click or their number key; the health potion
 * pulsing when health is low; keys swapped by dragging; a key changed with
 * the picker; auto-drink from the menu; and loot that goes into the bag
 * (never onto the character), counted on the Bag button, and left on the
 * ground when the bag is full.
 */

const key = (i) => `.hud__abilities .ability-card[data-key="${i}"]`;

const centre = (page, selector) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(150);
}

const hood = (uid) => ({ uid, type: 'gear', rarity: 'common', name: `Hood ${uid}`, base: 'cloth-head', baseName: 'Hood', kind: 'head', group: 'cloth', implicit: {}, stats: {}, value: 0 });

export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'hotbar');
  try {
    await page.click('[data-start]', { force: true });
    t.check('starts a run', await until(page, () => window.app.phase === 'playing', null, 30000));
    await page.evaluate(() => {
      const app = window.app;
      app.director.stop();
      app.monsters.despawnAll?.();
      app.profile.potions.health = 3;
      app.profile.potions.focus = 2;
      app.profile.save();
    });

    // Nine keys; the potions on 6 and 7 with their counts.
    const bar = await page.evaluate(() => [...document.querySelectorAll('.hud__abilities .ability-card')].map((c) => c.dataset.potion ?? c.dataset.element ?? ''));
    t.check('the bar has nine keys', bar.length === 9, JSON.stringify(bar));
    t.check('the potions sit on keys 6 and 7', bar[5] === 'health' && bar[6] === 'focus', JSON.stringify(bar));
    t.check('each potion key shows how many are left', (await page.locator(`${key(5)} [data-count]`).textContent()) === '3' && (await page.locator(`${key(6)} [data-count]`).textContent()) === '2');

    // Low health: the health potion pulses; a click drinks one.
    await page.evaluate(() => (window.app.director.health = window.app.director.maxHealth * 0.2));
    t.check('the health potion pulses when health is low', await until(page, (sel) => document.querySelector(sel)?.classList.contains('is-urgent'), key(5), 2000));
    await page.click(key(5));
    const drank = await page.evaluate(() => ({ left: window.app.profile.potions.health, health: window.app.director.health / window.app.director.maxHealth }));
    t.check('a click on the potion key drinks it', drank.left === 2 && drank.health > 0.5, JSON.stringify(drank));
    t.check('it stops pulsing once health is back up', await until(page, (sel) => !document.querySelector(sel)?.classList.contains('is-urgent'), key(5), 2000));
    t.check('the potion key cools down for a moment', await until(page, (sel) => document.querySelector(sel).classList.contains('is-cooling'), key(5), 2000));

    // The number key drinks too, once the cooldown is over (game time: it runs slower in a headless browser).
    await page.evaluate(() => (window.app.director.health = window.app.director.maxHealth * 0.5));
    await until(page, () => (window.app._potionReadyAt.health ?? 0) <= window.app.elapsed, null, 10000);
    await page.keyboard.press('Digit6');
    t.check('pressing 6 drinks a health potion', await page.evaluate(() => window.app.profile.potions.health === 1), await page.locator('[data-toast]').textContent());

    // Drag key 1 onto key 9: they swap.
    const before = await page.evaluate(() => [...window.app.profile.slots]);
    await drag(page, await centre(page, key(0)), await centre(page, key(8)));
    const after = await page.evaluate(() => [...window.app.profile.slots]);
    t.check('dragging key 1 onto key 9 swaps them', after[8] === before[0] && after[0] === before[8], JSON.stringify(after));

    // The picker: the focus potion onto key 1.
    await page.click(key(0), { button: 'right' });
    t.check('right-click opens the picker', await until(page, () => Boolean(document.querySelector('.hud__picker')), null, 2000));
    await page.locator('.hud__picker-option', { hasText: 'Focus Potion' }).click();
    const picked = await page.evaluate(() => [...window.app.profile.slots]);
    t.check('the picker puts the focus potion on key 1', picked[0] === 'potion:focus' && picked[6] !== 'potion:focus', JSON.stringify(picked));
    // An empty key opens the picker on a plain click.
    const empty = picked.findIndex((s) => !s);
    if (empty >= 0) {
      await page.click(key(empty));
      t.check('a click on an empty key opens the picker', await until(page, () => Boolean(document.querySelector('.hud__picker')), null, 2000));
      await page.keyboard.press('Escape');
    }

    // Auto-drink, from the menu.
    await page.click('.game-menu-btn__toggle');
    await page.getByLabel(/Auto-drink health potion/).check();
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await page.evaluate(() => {
      window.app.profile.potions.health = 2;
      window.app.profile.save();
      window.app._potionReadyAt = {};
      window.app.director.health = window.app.director.maxHealth * 0.2;
    });
    t.check('auto-drink drinks a health potion when health is low', await until(page, () => window.app.profile.potions.health === 1 && window.app.director.health > window.app.director.maxHealth * 0.5, null, 3000));
    t.check('auto-drink is remembered', await page.evaluate(() => localStorage.getItem('elemental-arena.autoDrink') === '1'));

    // Loot goes into the bag, not onto the character; the Bag button counts it.
    const loot = await page.evaluate(([item]) => {
      const app = window.app;
      const head = app.profile.gear.head?.uid ?? null;
      const r = app.loot.onPickup(item);
      return { ok: r.ok, inBag: app.profile.bag.some((i) => i.uid === item.uid), head: app.profile.gear.head?.uid ?? null, was: head };
    }, [hood('new-1')]);
    t.check('picked-up gear goes into the bag and is not worn', loot.ok && loot.inBag && loot.head === loot.was, JSON.stringify(loot));
    t.check('the Bag button counts what is new', /1 new/.test(await page.locator('[data-open-bag]').textContent()));
    await page.click('[data-open-bag]');
    t.check('clicking the Bag button opens the bag', await until(page, () => window.app.inventory.isOpen, null, 2000));
    t.check('opening the bag clears the new count', !/new/.test(await page.locator('[data-open-bag]').textContent()));
    await page.keyboard.press('Tab');

    // A full bag leaves loot on the ground, and does not try again while you stand there.
    const full = await page.evaluate(([make]) => {
      const app = window.app;
      const item = (uid) => ({ ...make, uid, name: `Hood ${uid}` });
      let n = 0;
      while (n < 200 && app.profile.pickUp(item(`fill-${n}`)).ok) n++;
      const at = app.character.position;
      app.loot.drop([item('ground-1')], { x: at.x, z: at.z }, () => 0);
      return n;
    }, [hood('x')]);
    await page.waitForTimeout(2500);
    t.check(
      'with the bag full, loot stays on the ground',
      await page.evaluate(() => window.app.loot.has('ground-1') && !window.app.profile.bag.some((i) => i.uid === 'ground-1')),
      `filled ${full}`
    );
    t.check('the Bag button shows the bag is full', /full/.test(await page.locator('[data-open-bag]').textContent()));

    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
