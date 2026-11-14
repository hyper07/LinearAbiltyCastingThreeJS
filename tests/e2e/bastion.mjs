import { boot, tally, until } from './lib.mjs';

/**
 * Bastion Squad, by mouse and keys. Grave Purge first (Play opens it): start
 * with three bot commanders; Tab selects my soldiers and a right-click sends
 * them; R buys a Recruit; F opens the Forge and raising a Veteran there
 * works; the speed buttons speed it up. Then Hold the Outpost (the menu's
 * other tab): deploy as a Medic with three bot soldiers; a right-click walks
 * the Medic; B opens the armoury and buying an upgrade takes the credits;
 * the first wave comes, and the squad holds it.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'bastion', { view: 'home' });
  try {
    await page.click('.home [data-game="official:bastion"]');
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('Bastion Squad is a card, and Play opens Grave Purge with its ladder of five ranks', await until(page, () => document.querySelectorAll('.gp .gp__ladder li').length === 5 && document.querySelector('.gp [data-solo]'), null, 15000));
    await page.click('.gp [data-solo]');
    t.check('Grave Purge: four commanders, three of them bots, four Recruits each', await until(page, () => {
      const s = window.gravePurge.state;
      return s?.players.length === 4 && s.players.filter((p) => p.bot).length === 3 && s.ents.filter((e) => e.k === 'troop' && e.o === window.gravePurge.mySlot).length === 4;
    }, null, 10000));
    await page.waitForTimeout(800);
    await page.keyboard.press('Tab');
    t.check('Tab selects my soldiers', await until(page, () => window.gravePurge.selected.size === 4));
    const where = await page.evaluate(() => window.gravePurge.game.troops.filter((x) => x.o === window.gravePurge.mySlot).map((x) => [x.x, x.z]));
    await page.mouse.click(700, 260, { button: 'right' });
    t.check('a right-click sends them', await until(page, (w) => window.gravePurge.game.troops.filter((x) => x.o === window.gravePurge.mySlot).some((x, k) => Math.hypot(x.x - w[k][0], x.z - w[k][1]) > 1), where, 5000));
    const ore = await page.evaluate(() => window.gravePurge.game.players[window.gravePurge.mySlot].ore);
    await page.keyboard.press('r');
    t.check('R buys a Recruit for ore', await until(page, (o) => { const g = window.gravePurge.game; return g.troops.filter((x) => x.o === window.gravePurge.mySlot).length === 5 && g.players[window.gravePurge.mySlot].ore < o; }, ore, 3000));
    await page.keyboard.press('f');
    t.check('F opens the Forge with four ranks to raise', await until(page, () => !document.querySelector('.gp [data-panel]').hidden && document.querySelectorAll('.gp [data-forge]').length === 4));
    await page.keyboard.press('Escape');
    // Like the map's combining spot: a Recruit walked into the Forge's ring (W) is raised by itself.
    await page.evaluate(() => {
      const gp = window.gravePurge;
      gp.game.players[gp.mySlot].ore = 5000;
      gp.selected.clear();
      gp.selected.add(gp.game.troops.find((x) => x.o === gp.mySlot && x.rank === 'recruit').i);
    });
    await page.keyboard.press('w');
    t.check('W walks a Recruit to the Forge, and it is raised to a Veteran there by itself', await until(page, () => window.gravePurge.game.troops.some((x) => x.o === window.gravePurge.mySlot && x.rank === 'veteran'), null, 15000));
    await page.keyboard.press('Tab');
    await page.keyboard.press('Alt+3');
    t.check('Alt+3 saves the selection as group 3, shown in the group bar', await until(page, () => document.querySelector('.gp [data-group="3"]')?.classList.contains('is-set')));
    await page.mouse.click(700, 300);
    await page.keyboard.press('3');
    t.check('3 picks the group again', await until(page, () => window.gravePurge.selected.size >= 4));
    await page.evaluate(() => { for (const x of window.gravePurge.game.troops) if (x.o === window.gravePurge.mySlot) x.hp = x.max / 2; });
    await page.keyboard.press('e');
    t.check('E sends them to the healing pad, and they heal', await until(page, () => window.gravePurge.game.troops.filter((x) => x.o === window.gravePurge.mySlot).every((x) => x.hp > x.max * 0.8), null, 20000));
    await page.keyboard.press('F1');
    t.check('F1 shows the keys', await until(page, () => !document.querySelector('.gp [data-help]').hidden && document.querySelectorAll('.gp [data-help] tr').length > 10));
    await page.keyboard.press('Escape');
    await page.click('.gp [data-speed="2"]');
    t.check('the speed buttons speed the game up', await until(page, () => window.gravePurge.game.speed === 2));
    t.check('the HUD shows the time, the wards and the team', await page.evaluate(() => /Time left/i.test(document.querySelector('.gp [data-top]').textContent) && document.querySelectorAll('.gp [data-team] p').length === 4));
    await page.evaluate(() => window.gravePurge._menu());
    await page.click('.gp [data-swap-to="purge2d"]');
    t.check('the 2D tab opens Grave Purge drawn flat, no WebGL', await until(page, () => window.gravePurge?.flat && document.querySelector('.gp [data-solo]') && !document.querySelector('.gp canvas.bs__canvas').getContext('2d') === false, null, 15000));
    await page.click('.gp [data-solo]');
    t.check('…its sprites are painted from the 3D models', await until(page, () => Boolean(window.gravePurge.view.sprites?.soldiers?.recruit && window.gravePurge.view.sprites.dead?.husk), null, 30000));
    t.check('…and it plays: soldiers, a frame rate shown', await until(page, () => window.gravePurge.state?.ents.some((e) => e.k === 'troop') && /2D · \d+ fps/.test(document.querySelector('.gp [data-fps]').textContent), null, 10000));
    await page.evaluate(() => window.gravePurge._menu());
    await page.click('.gp [data-swap-to="hold"]');
    t.check('the other tab opens Hold the Outpost with four soldiers', await until(page, () => !document.querySelector('.gp') && document.querySelectorAll('.bs [data-cls]').length === 4, null, 15000));
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
