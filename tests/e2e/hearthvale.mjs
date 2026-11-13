import { boot, tally, until } from './lib.mjs';

/**
 * Hearthvale, in the browser: signed in, make a character, enter the world,
 * walk with W, talk to Marla with F and take her quest, buy bread from Pell;
 * then a second player joins, is invited to the party by name, and both
 * stand in the same world copy.
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'hearthvale', { view: 'home' });
  const shot = (p, name) => shots && p.screenshot({ path: `${shots}/${name}.png` });
  let otherCtx = null;
  const stamp = Date.now().toString(36).slice(-5);
  const signIn = async (p, name) => {
    const made = await p.evaluate((n) => fetch('./api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n, password: 'hearth-and-home' }) }).then((r) => r.status), name);
    if (made !== 200) await p.evaluate((n) => fetch('./api/account/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n, password: 'hearth-and-home' }) }), name);
    await p.reload({ waitUntil: 'load' });
    await p.waitForFunction(() => window.app?.phase === 'menu' && window.app.account?.user, null, { timeout: 120000 });
  };
  const enter = async (p, hero, cls) => {
    await p.click('.home [data-game="official:hearthvale"]');
    await p.waitForSelector('.home [data-play]');
    await p.click('.home [data-play]');
    await p.waitForSelector('.hv [data-classes]', { timeout: 15000 });
    await p.click(`.hv [data-cls="${cls}"]`);
    await p.fill('.hv [data-name]', hero);
    await p.click('.hv [data-create]');
    await p.waitForSelector('.hv-char [data-play]', { timeout: 10000 });
    await p.click('.hv-char [data-play]');
    return until(p, () => Boolean(window.hearthvale?.me) && window.hearthvale.zone === 'hearthvale', null, 15000);
  };
  const me = (p) => p.evaluate(() => ({ ...window.hearthvale.me }));
  try {
    await signIn(page, `Hv${stamp}a`);
    const hero = `Wren${stamp.replace(/[^a-z]/g, '') || 'a'}`.slice(0, 16);
    t.check('make a Vanguard and enter Hearthvale', await enter(page, hero, 'vanguard'));
    t.check('the hotbar has six skills', (await page.$$('.hv [data-hotbar] .hv-slot')).length === 6);

    // Walk forward with W.
    const start = await me(page);
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    await page.keyboard.up('w');
    const after = await me(page);
    t.check('W walks', Math.hypot(after.x - start.x, after.z - start.z) > 2, JSON.stringify({ start, after }));
    t.check('and the server agrees', await until(page, (a) => {
      const hv = window.hearthvale;
      const e = hv.current?.ents.find((x) => x.i === hv.you);
      return e && Math.hypot(e.x - a.x, e.z - a.z) < 1.5;
    }, after, 5000));

    // Marla: walk to her at running speed (the server refuses jumps), F, take her quest.
    await page.evaluate(([tx, tz]) => new Promise((done) => {
      const hv = window.hearthvale;
      const timer = setInterval(() => {
        const dx = tx - hv.me.x;
        const dz = tz - hv.me.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) {
          clearInterval(timer);
          done();
          return;
        }
        const k = Math.min(1, 0.6 / d);
        hv.me.x += dx * k;
        hv.me.z += dz * k;
      }, 100);
    }), [52, 70]);
    const near = await until(page, () => {
      const hv = window.hearthvale;
      const e = hv.current?.ents.find((x) => x.i === hv.you);
      return e && Math.hypot(e.x - 52, e.z - 70) < 4;
    }, null, 15000);
    if (near) {
      await page.keyboard.press('f');
      t.check('F talks to Marla: a quest to take', await until(page, () => /Rattling in the Fields/.test(document.querySelector('.hv-win--npc')?.textContent ?? ''), null, 5000));
      await page.click('.hv-win--npc [data-accept]');
      t.check('the quest is taken and tracked', await until(page, () => /Rattlebones: 0\/6/.test(document.querySelector('.hv [data-tracker]')?.textContent ?? ''), null, 5000));
    } else t.check('walked to Marla', false);
    t.check('characters start with seed money', await page.evaluate(() => window.hearthvale.ch.gold === 100));
    t.check('the shopkeepers stand where they should (no lost bodies)', await page.evaluate(() => {
      const hv = window.hearthvale;
      return ['pell', 'brannoc', 'tamsin'].every((id) => {
        const e = hv.current.ents.find((x) => x.k === 'npc' && x.npc === id);
        const m = e && hv.view.models.get(e.i);
        return m && Number.isFinite(m.group.rotation.y) && Math.hypot(m.group.position.x - e.x, m.group.position.z - e.z) < 3;
      });
    }));
    await shot(page, 'hearthvale-town');

    // Brannoc's store: walk over, F, Buy & wear a sword.
    await page.evaluate(([tx, tz]) => new Promise((done) => {
      const hv = window.hearthvale;
      const timer = setInterval(() => {
        const dx = tx - hv.me.x;
        const dz = tz - hv.me.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) {
          clearInterval(timer);
          done();
          return;
        }
        const k = Math.min(1, 0.6 / d);
        hv.me.x += dx * k;
        hv.me.z += dz * k;
      }, 100);
    }), [78, 55]);
    await page.waitForTimeout(600);
    if (await page.$('.hv-win--npc .hv__x')) await page.click('.hv-win--npc .hv__x');
    await page.keyboard.press('f');
    t.check('F at the Smithy opens Brannoc\'s store', await until(page, () => Boolean(document.querySelector('.hv-store [data-buy="militia_sword"]')), null, 6000));
    await page.click('.hv-store [data-buy="militia_sword"][data-wear]');
    t.check('Buy & wear: the sword is worn, 20 gold spent', await until(page, () => window.hearthvale.ch.equip.weapon === 'militia_sword' && window.hearthvale.ch.gold === 80, null, 6000));
    await shot(page, 'hearthvale-store');

    // A second player: invited to the party by name, then both in one world.
    const other = await boot(browser, 'hearthvale-2', { view: 'home' });
    otherCtx = other.context;
    const q = other.page;
    await signIn(q, `Hv${stamp}b`);
    const friend = `Bryn${stamp.replace(/[^a-z]/g, '') || 'b'}`.slice(0, 16);
    t.check('a second player enters as a Mender', await enter(q, friend, 'mender'));
    await page.evaluate((n) => window.hearthvale.send({ t: 'party-invite', name: n }), friend);
    t.check('the invitation arrives', await until(q, () => Boolean(document.querySelector('.hv-toast--invite [data-yes]')), null, 8000));
    await q.click('.hv-toast--invite [data-yes]');
    t.check('both see each other in one world', await until(page, (n) => window.hearthvale.current?.ents.some((e) => e.k === 'p' && e.n === n), friend, 10000) && await until(q, (n) => window.hearthvale.current?.ents.some((e) => e.k === 'p' && e.n === n), hero, 10000));
    t.check('the party frame shows the friend', await until(page, (n) => (document.querySelector('.hv [data-party]')?.textContent ?? '').includes(n), friend, 8000));
    await q.evaluate(() => window.hearthvale._chat('/p hello from the mender'));
    t.check('party chat reaches the other', await until(page, () => /hello from the mender/.test(document.querySelector('.hv [data-chatlog]')?.textContent ?? ''), null, 5000));
    t.check('the friend is drawn in the right body (a Knight for the Vanguard)', await until(q, (n) => {
      const hv = window.hearthvale;
      const e = hv.current?.ents.find((x) => x.k === 'p' && x.n === n);
      const m = e && hv.view.models.get(e.i);
      let knight = false;
      m?.group.traverse((o) => {
        if (o.isMesh && o.visible && /^Knight_/.test(o.name)) knight = true;
      });
      return knight;
    }, hero, 10000));
    await shot(q, 'hearthvale-party');
    const all = [...errors, ...other.errors].filter((e) => !/404 GET \/library\/my-models/.test(e));
    t.check('no page errors', all.length === 0, all.join(' | '));
  } finally {
    await otherCtx?.close();
    await context.close();
  }
  return t;
}
