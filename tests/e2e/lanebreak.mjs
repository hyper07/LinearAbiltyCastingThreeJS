import { boot, tally, until } from './lib.mjs';

/**
 * Lanebreak, by mouse and keys: alone (pick a champion, buy at home, walk
 * with a right-click, rank and cast Q, the scores), then together — one
 * browser makes a party, a second joins by its code, the host starts, and
 * the guest's right-click moves the guest's own champion in the host's match.
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'lanebreak', { view: 'home' });
  const shot = (p, name) => shots && p.screenshot({ path: `${shots}/${name}.png` });
  let guestCtx = null;
  const open = async (p) => {
    await p.click('.home [data-game="official:lanebreak"]');
    await p.waitForSelector('.home [data-play]');
    await p.click('.home [data-play]');
    return until(p, () => document.querySelectorAll('.lb [data-champ]').length === 8, null, 15000);
  };
  const me = (p) => p.evaluate(() => {
    const g = window.lanebreak;
    const c = g.state?.champs[g.mySlot];
    const e = g.state?.ents.find((x) => x.i === c?.i);
    return c && e ? { x: e.x, z: e.z, items: c.items, ranks: c.ranks, cds: c.cds, gold: c.gold, champ: c.champ, team: c.team } : null;
  });
  /** The screen point of a ground spot, in page pixels. */
  const screenOf = (p, x, z) => p.evaluate(([x, z]) => {
    const v = window.lanebreak.view;
    const s = v.toScreen(x, 0, z);
    const r = v.canvas.getBoundingClientRect();
    return { x: r.left + s.x, y: r.top + s.y };
  }, [x, z]);
  try {
    t.check('Lanebreak is a card, and Play opens its set-up', await open(page));
    await page.click('.lb [data-champ="kiro"]');
    await page.click('.lb [data-difficulty] [data-value="easy"]');
    t.check('picking a champion shows its abilities', /Piercing Bolt/.test(await page.textContent('.lb [data-kit]')));
    await page.click('.lb [data-solo]');
    t.check('a solo match: ten champions, mine is Kiro on Dawn', await until(page, () => window.lanebreak?.state?.champs.length === 10 && window.lanebreak.state.champs[window.lanebreak.mySlot].champ === 'kiro', null, 15000));
    await page.waitForTimeout(1500);

    // Shop at home: Swift Boots.
    await page.keyboard.press('p');
    await page.click('.lb [data-buy="boots"]');
    t.check('the shop sells boots at home', await until(page, () => window.lanebreak.state.champs[window.lanebreak.mySlot].items.includes('boots'), null, 5000));
    await page.keyboard.press('Escape');

    // Walk: right-click a spot up the lane.
    const before = await me(page);
    const spot = await screenOf(page, before.x + 6, before.z - 6);
    await page.mouse.click(spot.x, spot.y, { button: 'right' });
    t.check('a right-click walks there', await until(page, (s) => {
      const g = window.lanebreak;
      const c = g.state.champs[g.mySlot];
      const e = g.state.ents.find((x) => x.i === c.i);
      return Math.hypot(e.x - s.x, e.z - s.z) > 3;
    }, before, 8000));

    // Rank W with Ctrl+W, cast it at the cursor.
    await page.keyboard.press('Control+w');
    t.check('Ctrl+W spends the point on W', await until(page, () => window.lanebreak.state.champs[window.lanebreak.mySlot].ranks[1] === 1, null, 5000));
    const now = await me(page);
    const aim = await screenOf(page, now.x + 8, now.z - 8);
    await page.mouse.move(aim.x, aim.y);
    await page.keyboard.press('w');
    t.check('W fires: the bolt is on cooldown', await until(page, () => window.lanebreak.state.champs[window.lanebreak.mySlot].cds[1] > 0, null, 5000));
    await page.keyboard.down('Tab');
    t.check('Tab shows the scores', await until(page, () => !document.querySelector('.lb [data-board]').hidden && /K \/ D \/ A/.test(document.querySelector('.lb [data-board]').textContent), null, 3000));
    await page.keyboard.up('Tab');
    await shot(page, 'lanebreak-solo');
    page.once('dialog', (d) => d.accept());
    await page.click('.lb [data-close]');
    t.check('✕ leaves to the games', await until(page, () => !document.querySelector('.lb') && !document.querySelector('.home').hidden, null, 5000));

    // Together: this browser hosts, a second joins.
    t.check('the set-up opens again', await open(page));
    await page.click('.lb [data-champ="sela"]');
    await page.fill('.lb [data-name]', 'Hosta');
    await page.click('.lb [data-host]');
    t.check('making a party shows a code', await until(page, () => /Party code: [A-Z0-9]{5}/.test(document.querySelector('.lb [data-status]')?.textContent ?? ''), null, 10000));
    const code = (await page.textContent('.lb [data-status]')).match(/Party code: ([A-Z0-9]{5})/)[1];

    const guest = await boot(browser, 'lanebreak-guest', { view: 'home' });
    guestCtx = guest.context;
    const g = guest.page;
    await open(g);
    await g.click('.lb [data-champ="brakka"]');
    await g.click('.lb [data-team] [data-value="red"]');
    await g.fill('.lb [data-name]', 'Guesto');
    await g.fill('.lb [data-code]', code);
    await g.click('.lb [data-join]');
    t.check('the guest joins and sees the host', await until(g, () => /Hosta/.test(document.querySelector('.lb-lobby')?.textContent ?? ''), null, 10000));
    t.check('the host sees the guest, as Brakka on Dusk', await until(page, () => /Guesto[^]*Brakka · Dusk/.test(document.querySelector('.lb-lobby')?.textContent ?? ''), null, 10000));
    await g.click('.lb [data-ready]');
    t.check('the guest is ready', await until(page, () => /Guesto[^]*ready/.test(document.querySelector('.lb-lobby')?.textContent ?? ''), null, 5000));
    await page.click('.lb [data-start-party]');
    t.check('both are in the match: the host as Sela (Dawn), the guest as Brakka (Dusk)', await until(page, () => window.lanebreak?.state?.champs[window.lanebreak.mySlot].champ === 'sela', null, 10000) && await until(g, () => window.lanebreak?.state?.champs[window.lanebreak.mySlot]?.champ === 'brakka' && window.lanebreak.state.champs[window.lanebreak.mySlot].team === 'red', null, 15000));
    t.check('the guest\'s seat is a person, not a bot', await page.evaluate(() => window.lanebreak.sim.seats.filter((c) => !c.bot).map((c) => c.champ).sort().join(',') === 'brakka,sela'));
    await g.waitForTimeout(1000);
    const gStart = await me(g);
    await g.evaluate((s) => {
      window.__start = s;
    }, gStart);
    const gSpot = await screenOf(g, gStart.x - 6, gStart.z + 6);
    await g.mouse.click(gSpot.x, gSpot.y, { button: 'right' });
    t.check('the guest\'s right-click moves the guest\'s champion in the host\'s match', await until(page, (s) => {
      const c = window.lanebreak.sim.seats.find((x) => x.champ === 'brakka' && !x.bot);
      return c && Math.hypot(c.x - s.x, c.z - s.z) > 3;
    }, gStart, 10000));
    await shot(g, 'lanebreak-guest');
    t.check('and the guest sees itself move', await until(g, () => {
      const lb = window.lanebreak;
      const c = lb.state.champs[lb.mySlot];
      const e = lb.state.ents.find((x) => x.i === c.i);
      return Math.hypot(e.x - window.__start.x, e.z - window.__start.z) > 3;
    }, null, 10000));
    const all = [...errors, ...guest.errors];
    t.check('no page errors', all.length === 0, all.join(' | '));
  } finally {
    await guestCtx?.close();
    await context.close();
  }
  return t;
}
