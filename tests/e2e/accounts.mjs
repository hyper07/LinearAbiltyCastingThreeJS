import { boot, tally, until } from './lib.mjs';

/**
 * Accounts end to end: sign up in the menu, play, get loot the server made,
 * then try what a cheater would try from the browser console — and check
 * none of it sticks. Then the same in a party of two signed-in players.
 */

const stamp = Date.now().toString(36).slice(-5);

/** Sign up through the menu (or sign in, if this name already exists on a reused server). */
async function signUp(page, name, password) {
  await page.click('[data-panel="account"].main-menu__nav-btn');
  await page.fill('[data-account-name]', name);
  await page.fill('[data-account-password]', password);
  await page.click('[data-account-signup]');
  if (!(await until(page, () => window.app.sync.active, null, 8000))) {
    console.log('    (sign-up said: ' + (await page.textContent('[data-account-status]')) + ')');
    await page.click('[data-account-signin]');
    await until(page, () => window.app.sync.active, null, 8000);
  }
  await page.evaluate(() => window.app.sync.settled());
}

/** Kill everything around the player through the real combat path (so it counts). */
async function spawnAndKill(page, kind = 'brute', count = 6) {
  await page.evaluate(([kind, count]) => {
    const app = window.app;
    const V = app.character.position.constructor;
    const p = app.character.position;
    for (let i = 0; i < count; i++) app.monsters.spawn(kind, new V(p.x + 2 + (i % 3), 0, p.z + 2 + Math.floor(i / 3)));
  }, [kind, count]);
  await page.waitForTimeout(1300);
  await page.evaluate(() => {
    const app = window.app;
    const V = app.character.position.constructor;
    app.combat.melee(app.character.position.clone().setY(0), new V(0, 0, 1), { damage: 99999, range: 60, arc: Math.PI * 2, knockback: 0 });
  });
}

/** Pick up the first server-made bag item on the floor (by walking onto it). */
async function pickUpOne(page) {
  return page.evaluate(async () => {
    const app = window.app;
    const drop = app.loot.drops.find((d) => d.item.srv && d.item.type !== 'gold' && d.item.type !== 'potion') ?? app.loot.drops.find((d) => d.item.srv);
    if (!drop) return null;
    drop.landed = true;
    app.loot.player = drop.root.position;
    app.loot._tryPick(drop, 99);
    await app.sync.settled();
    return { uid: drop.item.uid, type: drop.item.type, name: drop.item.name };
  });
}

export async function run(browser) {
  const t = tally();
  const one = await boot(browser, 'account');
  const { page, errors } = one;
  try {
    t.check('the game has a server to sign in to', await until(page, () => window.app.account.available, null, 8000));
    const guestGold = await page.evaluate(() => {
      window.app.profile.gold = 4321; // the guest save, to see it come back after signing out
      window.app.profile.save();
      return window.app.profile.gold;
    });

    await signUp(page, `Tester-${stamp}`, 'a-strong-password-1');
    t.check('signed in from the menu', await page.evaluate(() => window.app.account.signedIn && window.app.sync.active), await page.textContent('[data-account-status]'));
    t.check('the menu shows the account', /✓/.test(await page.textContent('[data-account-nav]')));
    t.check('a new account starts a new character', await page.evaluate(() => window.app.profile.gold === 0 && window.app.profile.bag.length === 0));

    // Play: the server opens the game, rolls the loot and names every item.
    await page.click('[data-start]', { force: true });
    await until(page, () => window.app.phase === 'playing', null, 30000);
    t.check('the server opened the game', await until(page, () => Boolean(window.app.sync.runId), null, 8000));
    await page.evaluate(() => window.app.director.stop());
    await page.waitForTimeout(5500); // waves can't come faster than the clock allows; neither may kills on wave 1 be reported too early
    let item = null;
    for (let i = 0; i < 6 && !item; i++) {
      await spawnAndKill(page);
      await page.waitForTimeout(900);
      item = await pickUpOne(page);
    }
    t.check('loot comes from the server', Boolean(item), JSON.stringify(item));
    const synced = await page.evaluate(async () => {
      const view = await (await fetch(`./api/game/state?classId=${window.app.profile.classId}`)).json();
      return { server: view.digest, browser: window.app.profile.digest(), drifts: window.app.sync.drifts };
    });
    t.check('browser and server agree', synced.server === synced.browser && synced.drifts === 0, JSON.stringify(synced));

    // Cheats from the console: none of them last.
    const hacked = await page.evaluate(async () => {
      const app = window.app;
      const p = app.profile;
      const real = p.gold;
      p.gold = 999999; // 1. edit the gold
      p.bag.push({ uid: 'forged-1', type: 'weapon', weapon: 'arcane-wand', rarity: 'unique', name: 'Forged Wand', at: [7, 3], stats: { attack: 999 } }); // 2. invent an item
      const target = p.bag.find((it) => it.uid !== 'forged-1');
      if (target) p.move(target.uid, 'stash'); // any action sends the state for checking
      await app.sync.settled();
      await new Promise((r) => setTimeout(r, 300));
      return { gold: p.gold, real, forged: p.bag.some((it) => it.uid === 'forged-1') };
    });
    t.check('edited gold is put back', hacked.gold === hacked.real, JSON.stringify(hacked));
    t.check('an invented item disappears', !hacked.forged);
    const replay = await page.evaluate(async (uid) => {
      const r = await fetch('./api/game/take', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: window.app.sync.runId, uid }) });
      return r.status;
    }, item?.uid);
    t.check('taking the same item twice is refused', replay === 409, String(replay));
    const fake = await page.evaluate(async () => {
      const r = await fetch('./api/game/kill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: window.app.sync.runId, monster: 'fake-dragon', kind: 'dragon', wave: 1 }) });
      return { status: r.status, body: await r.json() };
    });
    t.check('a fake boss kill is refused with a strike', fake.status === 409 && fake.body.rule === 'kind-not-in-run', JSON.stringify(fake));

    // The character survives a reload, from the server.
    const before = await page.evaluate(() => ({ uids: [...window.app.profile.bag, ...window.app.profile.stash].map((i) => i.uid).sort(), gold: window.app.profile.gold }));
    await page.reload({ waitUntil: 'load' });
    await until(page, () => window.app?.phase === 'menu', null, 120000);
    t.check('still signed in after a reload', await until(page, () => window.app.sync.active, null, 10000));
    const after = await page.evaluate(() => ({ uids: [...window.app.profile.bag, ...window.app.profile.stash].map((i) => i.uid).sort(), gold: window.app.profile.gold }));
    t.check('the same items and gold, from the server', JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} vs ${JSON.stringify(after)}`);

    // The history recorded it all, the strike included.
    await page.click('[data-panel="account"].main-menu__nav-btn');
    await page.waitForTimeout(600);
    const lines = await page.$$eval('.account-panel__event', (els) => els.map((e) => e.className + ' ' + e.textContent));
    t.check('the history shows the pickup and the strike', lines.some((l) => /Picked up|gave you/.test(l)) && lines.some((l) => /is-strike/.test(l)), lines.slice(0, 6).join(' | '));

    await page.click('[data-account-signout]');
    t.check('signing out goes back to this browser’s save', await until(page, (g) => !window.app.sync.active && window.app.profile.gold === g, guestGold, 5000));
    // The 409s are this test's own cheat attempts being refused.
    const real = errors.filter((e) => !/ 409 POST \/api\/game\/(take|kill)/.test(e));
    t.check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  } finally {
    await one.context.close();
  }

  /* ---- a signed-in party: the guest's loot comes from the host's server game ---- */
  const host = await boot(browser, 'host');
  const guest = await boot(browser, 'guest');
  try {
    await signUp(host.page, `Host-${stamp}`, 'a-strong-password-2');
    await signUp(guest.page, `Guest-${stamp}`, 'a-strong-password-3');
    await host.page.click('[data-panel="party"].main-menu__nav-btn');
    await host.page.click('[data-party-create]');
    await until(host.page, () => window.app.party.isHost, null, 10000);
    const code = await host.page.evaluate(() => window.app.party.code);
    await guest.page.click('[data-panel="party"].main-menu__nav-btn');
    await guest.page.fill('[data-party-code]', code);
    await guest.page.click('[data-party-join]');
    await until(guest.page, () => window.app.party.isGuest, null, 10000);
    t.check('party names are the account names', await until(host.page, (s) => window.app.party.members().some((m) => m.name === `Guest-${s}`), stamp, 5000));
    await host.page.click('[data-start]', { force: true });
    await until(host.page, () => window.app.phase === 'playing' && window.app.sync.runId, null, 30000);
    await guest.page.click('[data-start]', { force: true });
    await until(guest.page, () => window.app.phase === 'playing', null, 30000);
    t.check('the guest joins the host’s game on the server', await until(guest.page, () => window.app.sync.runId && window.app.sync.runId === window.app.party.guestRunId, null, 8000));
    await host.page.evaluate(() => window.app.director.stop());
    await host.page.waitForTimeout(5500);
    const xpBefore = await guest.page.evaluate(() => window.app.profile.xp + window.app.profile.level * 1e6);
    let shared = [];
    for (let i = 0; i < 6 && !shared.length; i++) {
      await spawnAndKill(host.page);
      await host.page.waitForTimeout(1200);
      shared = await guest.page.evaluate(() => window.app.loot.drops.filter((d) => d.item.srv).map((d) => d.item.uid));
    }
    t.check('the host’s server loot reaches the guest', shared.length > 0);
    t.check('the guest’s experience is granted by the server', await until(guest.page, async (b) => {
      await window.app.sync.settled();
      return window.app.profile.xp + window.app.profile.level * 1e6 > b && window.app.sync.drifts === 0;
    }, xpBefore, 8000));
    const got = await pickUpOne(guest.page);
    t.check('the guest takes an item through the server', Boolean(got) && (await guest.page.evaluate((uid) => [...window.app.profile.bag, ...window.app.profile.stash].some((i) => i.uid === uid) || window.app.profile.gold > 0, got?.uid)));
    t.check('it leaves the host’s floor', await until(host.page, (uid) => !window.app.loot.has(uid), got?.uid, 4000));
    const steal = await host.page.evaluate(async (uid) => (await fetch('./api/game/take', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: window.app.sync.runId, uid }) })).status, got?.uid);
    t.check('the host cannot take it too', steal === 409, String(steal));
    const real = [...host.errors, ...guest.errors].filter((e) => !/ 409 POST \/api\/game\/take/.test(e));
    t.check('no page errors in the party', real.length === 0, real.slice(0, 3).join(' | '));
  } finally {
    await host.context.close();
    await guest.context.close();
  }
  return t;
}
