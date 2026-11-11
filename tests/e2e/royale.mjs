import { boot, tally, until } from './lib.mjs';

/**
 * The battle royale: alone against the rivals (they spawn, the storm closes
 * and hurts, rivals hit each other, the last one standing wins, down is out),
 * and two players in a party (a player's hit reaches the other player, a
 * knock-out is announced; in squad mode players cannot hurt each other).
 */

const startCard = (page) => until(page, () => window.app.story.isOpen && [...document.querySelectorAll('.story button')].some((b) => /^(Start|Join the fight)$/.test(b.textContent)), null, 40000);
const pressStart = (page) => page.locator('.story button', { hasText: /^(Start|Join the fight)$/ }).first().click();
const resultTitle = (page) => page.evaluate(() => [...document.querySelectorAll('h1, h2, h3')].map((h) => h.textContent).find((t) => /Last one standing|You placed|squad/i.test(t)) ?? '');

export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const solo = await boot(browser, 'royale', { view: 'home' });
  const page = solo.page;
  try {
    t.check('the battle royale games are on the home page', await until(page, () => document.querySelector('.home [data-game="official:stormbreak-ruins"]') && document.querySelector('.home [data-game="official:saltwind-squads"]'), null, 10000));
    await page.click('.home [data-game="official:stormbreak-ruins"]');
    await until(page, () => document.querySelector('.home [data-play]'), null, 5000);
    await page.selectOption('.home [data-play-hero]', 'amazon');
    await page.click('.home [data-play]');
    await startCard(page);
    await pressStart(page);
    t.check('a match starts', await until(page, () => window.app.phase === 'playing' && window.app.royale?.active, null, 30000));
    t.check('seven rivals are in the field', await until(page, () => window.app.monsters.active.filter((m) => m.kind === 'rival' && m.isAlive).length === 7, null, 8000));
    const start = await page.evaluate(() => ({ r: Math.hypot(window.app.character.position.x, window.app.character.position.z), pill: document.querySelector('.level-goal')?.textContent ?? '' }));
    t.check('you start out on the ring, not in the middle', start.r > 10, JSON.stringify(start));
    t.check('the goal pill counts who is left and the storm', await until(page, () => /8 left · Storm moves in/.test(document.querySelector('.level-goal')?.textContent ?? ''), null, 5000));
    t.check('the storm wall stands', await page.evaluate(() => window.app.royale.zone.group.visible && window.app.royale.circle.radius > 20));
    if (shots) {
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/royale.png` });
    }

    // Rivals hurt each other (their shots reach the host as hits on 'm:<id>').
    await until(page, () => window.app.monsters.active.some((m) => m.kind === 'rival' && m.isTargetable), null, 8000);
    const struck = await page.evaluate(() => {
      const app = window.app;
      const rival = app.monsters.active.find((m) => m.kind === 'rival' && m.isTargetable);
      const before = rival.health;
      app.monsters.emit('playerHit', 20, { playerId: `m:${rival.id}`, position: rival.position });
      return { before, after: rival.health, me: app.director.health === app.director.maxHealth };
    });
    t.check('a rival\'s shot lands on another rival, not on you', struck.after < struck.before && struck.me, JSON.stringify(struck));

    // The storm closes: outside it you lose health, and the screen says so.
    const storm = await page.evaluate(async () => {
      const app = window.app;
      const r = app.royale;
      r.t = r.plan.phases[1].shrinkEnd + 0.1; // two circles in: radius 10
      await new Promise((res) => setTimeout(res, 200));
      const c = r.circle;
      const away = Math.atan2(-c.z, -c.x);
      app._teleport(c.x + Math.cos(away) * (c.radius + 6), c.z + Math.sin(away) * (c.radius + 6));
      const before = app.director.health;
      await new Promise((res) => setTimeout(res, 1800));
      return { radius: c.radius, before, after: app.director.health, tinted: document.body.classList.contains('is-in-storm') };
    });
    t.check('the storm shrinks and hurts whoever is outside it', storm.radius < 12 && storm.after < storm.before && storm.tinted, JSON.stringify(storm));

    // The rest fall: the last one standing wins.
    await page.evaluate(() => {
      const app = window.app;
      app.director.health = app.director.maxHealth;
      app._teleport(app.royale.circle.x, app.royale.circle.z);
      for (const m of app.monsters.active) if (m.kind === 'rival' && m.isAlive) m.applyDamage(99999, { ignoreArmour: true });
    });
    t.check('the last one standing wins', await until(page, () => window.app.royale.ended, null, 6000));
    t.check('…and is told so', /Last one standing/.test(await (async () => { await page.waitForTimeout(400); return resultTitle(page); })()));
    await page.locator('button', { hasText: /^Back to games$/ }).first().click();
    t.check('Back to games ends the match on the home page', await until(page, () => !window.app.royale.active && !document.querySelector('.home').hidden, null, 10000));

    // Down is out: no revive, and you see your place.
    await page.click('.home [data-game="official:stormbreak-ruins"]');
    await until(page, () => document.querySelector('.home [data-play]'), null, 5000);
    await page.click('.home [data-play]');
    await startCard(page);
    await pressStart(page);
    await until(page, () => window.app.royale?.active && window.app.monsters.active.filter((m) => m.kind === 'rival').length === 7, null, 30000);
    await page.evaluate(() => {
      const app = window.app;
      app.director.damagePlayer(app.director.maxHealth * 10, { position: app.character.position });
    });
    t.check('down is out: placed #8 of 8', await until(page, () => window.app.royale.out, null, 4000) && /#8 of 8/.test(await (async () => { await page.waitForTimeout(1600); return resultTitle(page); })()));
    await page.waitForTimeout(800);
    t.check('and no revive comes', await page.evaluate(() => window.app.director.isDowned));
    await page.locator('button', { hasText: /^Back to games$/ }).first().click();
    await until(page, () => !document.querySelector('.home').hidden, null, 10000);
    const real = solo.errors.filter((e) => !/ 503 (GET|POST) \/api\/ai\//.test(e));
    t.check('no page errors (solo)', real.length === 0, real.join(' | '));
  } finally {
    await solo.context.close();
  }

  // Two players: they can hurt each other, and a knock-out is announced.
  const host = await boot(browser, 'host');
  const guest = await boot(browser, 'guest');
  try {
    await host.page.click('[data-panel="party"]');
    await host.page.fill('[data-party-name]', 'Ada');
    await host.page.click('[data-party-create]');
    await until(host.page, () => window.app.party.isHost, null, 10000);
    const code = await host.page.evaluate(() => window.app.party.code);
    await guest.page.click('[data-panel="party"]');
    await guest.page.fill('[data-party-name]', 'Bo');
    await guest.page.fill('[data-party-code]', code);
    await guest.page.click('[data-party-join]');
    await until(guest.page, () => window.app.party.isGuest, null, 10000);
    await until(host.page, () => window.app.party.members().length === 2, null, 5000);

    // Not awaited: playGame waits for the Start press.
    await host.page.evaluate(() => { window.app.playGame('official:stormbreak-ruins'); });
    await startCard(host.page);
    await pressStart(host.page);
    await startCard(guest.page);
    await pressStart(guest.page);
    t.check('both are in the match', await until(host.page, () => window.app.royale?.active, null, 30000) && (await until(guest.page, () => window.app.royale?.active, null, 30000)));
    t.check('a party of two leaves room for six rivals', await until(host.page, () => window.app.monsters.active.filter((m) => m.kind === 'rival').length === 6, null, 8000));
    t.check('the guest sees the same rivals', await until(guest.page, () => window.app.monsters.active.filter((m) => m.kind === 'rival' && m.puppet).length === 6, null, 8000));
    t.check('they start apart', await until(host.page, () => {
      const r = [...window.app.party.remotes.values()][0];
      return r?.body && Math.hypot(r.body.position.x - window.app.character.position.x, r.body.position.z - window.app.character.position.z) > 8;
    }, null, 8000));

    // The host's spell hits the guest.
    t.check('the other player is a target', await until(host.page, () => window.app.monsters.extraTargets.length === 1 && window.app.monsters.extraTargets[0].isTargetable, null, 8000));
    const hpBefore = await guest.page.evaluate(() => window.app.director.health);
    await host.page.evaluate(() => {
      const app = window.app;
      const target = app.monsters.extraTargets[0];
      const V = app.character.position.constructor;
      app._teleport(target.position.x - 2, target.position.z);
      app.combat.melee(app.character.position.clone().setY(0), new V(1, 0, 0), { damage: 40, range: 4, arc: Math.PI * 2, knockback: 0 });
    });
    t.check('a player\'s hit reaches the other player', await until(guest.page, (hp) => window.app.director.health < hp, hpBefore, 5000), `was ${hpBefore}`);
    const scaled = await guest.page.evaluate((hp) => hp - window.app.director.health, hpBefore);
    t.check('…as a share, not a one-shot', scaled > 0 && scaled < 40, String(scaled));

    // The guest goes down: the host hears it, with the credit.
    await guest.page.evaluate(() => {
      const app = window.app;
      app.royale.lastAttacker = { id: app.party.session.host, name: 'Ada' };
      app.director.damagePlayer(app.director.maxHealth * 10, { position: app.character.position });
    });
    t.check('the guest is out', await until(guest.page, () => window.app.royale.out, null, 5000));
    t.check('the host is told who knocked them out', await until(host.page, () => window.app.royale.eliminations === 1 && window.app.royale.playersAlive() === 1, null, 5000));
    await host.page.evaluate(() => window.app.exitToMenu());
    // The guest's result card closes when the host leaves; then both are back in the menu.
    await until(guest.page, () => window.app.phase === 'menu' && !window.app.story.isOpen, null, 8000);
    await guest.page.waitForTimeout(800);

    // Squads: the party is one team — no damage between them.
    // Not awaited: playGame waits for the Start press.
    await host.page.evaluate(() => { window.app.playGame('official:saltwind-squads'); });
    await startCard(host.page);
    await pressStart(host.page);
    await startCard(guest.page);
    await pressStart(guest.page);
    await until(host.page, () => window.app.royale?.active && window.app.royale.squad, null, 30000);
    await host.page.waitForTimeout(1200);
    t.check('in squads, teammates are not targets', await host.page.evaluate(() => window.app.monsters.extraTargets.length === 0));
    for (const p of [host, guest]) {
      const real = p.errors.filter((e) => !/ 503 (GET|POST) \/api\/ai\//.test(e));
      t.check(`no page errors (${p.name})`, real.length === 0, real.join(' | '));
    }
  } finally {
    await host.context.close();
    await guest.context.close();
  }
  return t;
}
