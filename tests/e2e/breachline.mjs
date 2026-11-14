import { boot, tally, until } from './lib.mjs';

/**
 * Breachline, by keys: alone (the menu, a match with nine bots, the shop
 * before the round, walking once it is live, the scores), then together —
 * one browser makes a room, a second joins with its code and changes squad,
 * the host starts, and each walks their own player in the server's match.
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'breachline', { view: 'home' });
  const shot = (p, name) => shots && p.screenshot({ path: `${shots}/${name}.png` });
  let guestCtx = null;
  const open = async (p) => {
    await p.click('.home [data-game="official:breachline"]');
    await p.waitForSelector('.home [data-play]');
    await p.click('.home [data-play]');
    return until(p, () => Boolean(document.querySelector('.bl [data-solo]')), null, 15000);
  };
  const me = (p) => p.evaluate(() => {
    const g = window.breachline;
    const m = g.me;
    return m ? { id: m.id, x: m.x, z: m.z, squad: m.squad, money: m.money, secondary: m.secondary, alive: m.alive, bot: m.bot, phase: g.match.phase } : null;
  });
  try {
    t.check('Breachline is a card, and Play opens its menu', await open(page));
    await shot(page, 'breachline-menu');
    await page.click('.bl [data-side] [data-value="def"]');
    await page.click('.bl [data-skill] [data-value="easy"]');
    await page.click('.bl [data-solo]');
    t.check('a match alone: ten players, I am a Warden, the round opens with a pause to buy', await until(page, () => {
      const g = window.breachline;
      return g.match?.players.length === 10 && g.me && g.match.sideOf(g.me.squad) === 'def' && g.match.phase === 'buy' && g.match.players.filter((p) => p.bot).length === 9;
    }, null, 10000));
    t.check('the HUD shows health, money and a weapon', await until(page, () => document.querySelector('.bl [data-hp]').textContent === '100' && document.querySelector('.bl [data-money]').textContent === '$800' && /Sidearm/.test(document.querySelector('.bl [data-weapon]').textContent)));
    await page.keyboard.press('b');
    t.check('B opens the shop', await until(page, () => !document.querySelector('.bl [data-shop]').hidden && document.querySelectorAll('.bl [data-buy]').length === 9));
    t.check('what I cannot pay for cannot be bought', await page.evaluate(() => document.querySelector('.bl [data-buy="longwatch"]').disabled && !document.querySelector('.bl [data-buy="ram"]').disabled));
    await shot(page, 'breachline-shop');
    await page.click('.bl [data-buy="ram"]');
    t.check('buying takes the money and gives the weapon', await until(page, () => window.breachline.me.secondary === 'ram' && window.breachline.me.money === 100 && document.querySelector('.bl [data-buy="ram"]').classList.contains('is-have')));
    await page.keyboard.press('b');
    // On with the round, and walk.
    await page.evaluate(() => (window.breachline.match.timer = 0.2));
    t.check('the round goes live and the shop shuts', await until(page, () => window.breachline.match.phase === 'live' && document.querySelector('.bl [data-shop]').hidden));
    const before = await me(page);
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    await page.keyboard.up('w');
    const after = await me(page);
    t.check('W walks me forward', Math.hypot(after.x - before.x, after.z - before.z) > 1.5, JSON.stringify([before, after]));
    await page.keyboard.down('Tab');
    t.check('Tab shows both squads\' scores', await until(page, () => document.querySelectorAll('.bl [data-board] tbody tr').length === 10));
    await page.keyboard.up('Tab');
    await shot(page, 'breachline-live');
    t.check('the radar is drawn', await page.evaluate(() => {
      const c = document.querySelector('.bl [data-radar]');
      return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 0 && v > 150);
    }));
    await page.evaluate(() => window.breachline.leaveMatch());
    t.check('leaving goes back to the menu', await until(page, () => Boolean(document.querySelector('.bl [data-make]')) && !document.querySelector('.bl [data-menu]').hidden));

    // Together: a room, a guest, a match on the server.
    await page.fill('.bl [data-name]', 'Hostly');
    await page.click('.bl [data-make]');
    t.check('making a room gives a five-letter code', await until(page, () => /^[A-Z2-9]{5}$/.test(document.querySelector('.bl [data-room-code]')?.textContent ?? '')));
    const code = await page.textContent('.bl [data-room-code]');
    const guest = await boot(browser, 'breachline-guest', { view: 'home' });
    guestCtx = guest.context;
    await open(guest.page);
    await guest.page.fill('.bl [data-name]', 'Guesty');
    await guest.page.fill('.bl [data-code]', code);
    await guest.page.click('.bl [data-join]');
    t.check('the guest joins with the code; both see two people, one on each squad', await until(page, () => {
      const r = window.breachline.room;
      return r?.members.length === 2 && r.members[0].squad !== r.members[1].squad;
    }) && await until(guest.page, () => window.breachline.room?.members.length === 2));
    t.check('only the host has Start', await page.evaluate(() => Boolean(document.querySelector('.bl [data-start]'))) && await guest.page.evaluate(() => !document.querySelector('.bl [data-start]')));
    await guest.page.click('.bl [data-squad="0"]');
    t.check('the guest moves to the host\'s squad', await until(page, () => window.breachline.room.members.every((m) => m.squad === 0)));
    await guest.page.fill('.bl [data-room-say]', 'ready when you are');
    await guest.page.keyboard.press('Enter');
    t.check('the room can talk', await until(page, () => /ready when you are/.test(document.querySelector('.bl [data-room-lines]').textContent)));
    await shot(page, 'breachline-room');
    await page.click('.bl [data-start]');
    const both = async (fn, ms = 10000) => (await until(page, fn, null, ms)) && (await until(guest.page, fn, null, ms));
    t.check('the host starts: both are in one match of ten, two people and eight bots, on the same squad', await both(() => {
      const g = window.breachline;
      return g.match?.players.length === 10 && g.me && !g.me.bot && g.match.players.filter((p) => !p.bot).length === 2 && g.match.players.filter((p) => !p.bot).every((p) => p.squad === g.me.squad);
    }));
    const [h, gst] = [await me(page), await me(guest.page)];
    t.check('each has a seat of their own', h.id !== gst.id, JSON.stringify([h, gst]));
    await guest.page.keyboard.press('b');
    await guest.page.click('.bl [data-buy="ram"]');
    t.check('the guest buys through the server, and the host sees it', await until(page, (id) => window.breachline.match.players[id].secondary === 'ram', gst.id));
    await guest.page.keyboard.press('b');
    t.check('the round goes live for both', await both(() => window.breachline.match.phase === 'live', 20000));
    const g0 = await me(guest.page);
    await guest.page.keyboard.down('w');
    await guest.page.waitForTimeout(900);
    await guest.page.keyboard.up('w');
    await guest.page.waitForTimeout(300);
    const g1 = await me(guest.page);
    t.check('the guest walks their own player', Math.hypot(g1.x - g0.x, g1.z - g0.z) > 1.5, JSON.stringify([g0, g1]));
    t.check('…and the host sees them where they went', await until(page, ([id, x, z]) => {
      const p = window.breachline.match.players[id];
      return Math.hypot(p.x - x, p.z - z) < 1.2;
    }, [gst.id, g1.x, g1.z]));
    await shot(guest.page, 'breachline-together');
    await guest.page.evaluate(() => window.breachline.leaveMatch());
    t.check('a guest who leaves hands the seat to a bot; the host plays on', await until(page, (id) => window.breachline.match.players[id].bot && window.breachline.room.members.length === 1, gst.id));
    await page.click('.bl [data-close]');
    t.check('closing returns to the home page', await until(page, () => !document.querySelector('.bl') && Boolean(document.querySelector('.home'))));
    const real = [...errors, ...guest.errors];
    t.check('no page errors', real.length === 0, real.join(' | '));
  } finally {
    await guestCtx?.close();
    await context.close();
  }
  return t;
}
