import { boot, tally, until } from './lib.mjs';

/**
 * Bastion Squad, by mouse and keys: the card opens the menu; deploy as a
 * Medic with three bot soldiers; a right-click walks the Medic; B opens the
 * armoury and buying an upgrade takes the credits; the first wave comes,
 * and the squad holds it.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'bastion', { view: 'home' });
  try {
    await page.click('.home [data-game="official:bastion"]');
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('Bastion Squad is a card, and Play opens its menu with four soldiers', await until(page, () => document.querySelectorAll('.bs [data-cls]').length === 4, null, 15000));
    await page.click('.bs [data-cls="medic"]');
    await page.click('.bs [data-solo]');
    t.check('deployed: four soldiers, mine a Medic, three bots', await until(page, () => {
      const s = window.bastion.state;
      return s?.heroes.length === 4 && s.heroes[window.bastion.mySlot].cls === 'medic' && s.heroes.filter((h) => h.bot).length === 3;
    }, null, 10000));
    const before = await page.evaluate(() => { const h = window.bastion.game.heroes[window.bastion.mySlot]; return [h.x, h.z]; });
    await page.mouse.click(560, 300, { button: 'right' });
    t.check('a right-click walks my soldier', await until(page, ([x, z]) => { const h = window.bastion.game.heroes[window.bastion.mySlot]; return Math.hypot(h.x - x, h.z - z) > 1; }, before, 5000));
    await page.keyboard.press('b');
    t.check('B opens the armoury', await until(page, () => !document.querySelector('.bs [data-shop]').hidden && document.querySelectorAll('.bs [data-buy]').length === 7));
    const credits = await page.evaluate(() => window.bastion.game.heroes[window.bastion.mySlot].credits);
    await page.click('.bs [data-buy="damage"]');
    t.check('buying an upgrade takes the credits', await until(page, (c) => { const h = window.bastion.game.heroes[window.bastion.mySlot]; return h.upg.damage === 1 && h.credits < c; }, credits, 3000));
    await page.keyboard.press('Escape');
    await page.evaluate(() => (window.bastion.game.timer = 0.1));
    t.check('the first wave comes', await until(page, () => window.bastion.state.phase === 'wave', null, 5000));
    t.check('…and the squad holds it', await until(page, () => window.bastion.state.wave >= 1 && window.bastion.state.reactor.hp > 0, null, 60000));
    t.check('the HUD shows the wave, the reactor and my skills', await page.evaluate(() => /Wave|wave/.test(document.querySelector('.bs [data-wave]').textContent) && document.querySelectorAll('.bs [data-skill]').length === 3));
    await page.click('.bs [data-close]');
    t.check('closing returns to the home page', await until(page, () => !document.querySelector('.bs') && Boolean(document.querySelector('.home'))));
    t.check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
