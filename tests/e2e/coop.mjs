import { boot, tally, until } from './lib.mjs';

/**
 * Playing together, end to end, with two browsers: a party is made and
 * joined, the host starts, the guest joins the fight, each sees the other's
 * body, the host's monsters appear on the guest's screen, a guest's hit
 * lands on the host, a kill pays everyone, loot falls in the same places,
 * a hit on the guest arrives, the chat works, and leaving is clean.
 */
export async function run(browser) {
  const t = tally();
  const host = await boot(browser, 'host');
  const guest = await boot(browser, 'guest');
  try {
    // The lobby.
    await host.page.click('[data-panel="party"]');
    await host.page.fill('[data-party-name]', 'Ada');
    await host.page.click('[data-party-create]');
    t.check('host opens a party', await until(host.page, () => window.app.party.isHost, null, 10000));
    const code = await host.page.evaluate(() => window.app.party.code);
    t.check('a join code is shown', /^[A-Z2-9]{5}$/.test(code), code);

    await guest.page.click('[data-panel="party"]');
    await guest.page.fill('[data-party-name]', 'Bo');
    await guest.page.fill('[data-party-code]', code.toLowerCase());
    await guest.page.click('[data-party-join]');
    t.check('guest joins', await until(guest.page, () => window.app.party.isGuest, null, 10000));
    t.check('host sees two members', await until(host.page, () => window.app.party.members().length === 2, null, 5000));
    t.check('guest knows the host by name', await until(guest.page, () => window.app.party.members().some((m) => m.name === 'Ada' && m.host), null, 5000));
    const startLabel = await guest.page.locator('[data-start]').textContent();
    t.check('guest start button waits for the host', /host/i.test(startLabel), startLabel);

    // The fight: the host starts, the guest joins it.
    await host.page.click('[data-start]', { force: true });
    t.check('host is playing', await until(host.page, () => window.app.phase === 'playing', null, 30000));
    await guest.page.click('[data-start]', { force: true });
    t.check('guest is playing', await until(guest.page, () => window.app.phase === 'playing', null, 30000));
    t.check('guest runs as a follower', await guest.page.evaluate(() => !window.app.director.authority && window.app.monsters.puppet));
    t.check('host runs the fight', await host.page.evaluate(() => window.app.director.authority && !window.app.monsters.puppet));

    // Bodies.
    const bodyOn = (p) => until(p, () => [...window.app.party.remotes.values()].some((r) => r.ready && r.body.root.visible), null, 30000);
    t.check('host sees the guest', await bodyOn(host.page));
    t.check('guest sees the host', await bodyOn(guest.page));
    await guest.page.evaluate(() => window.app._teleport(6, 4));
    t.check('guest movement reaches the host', await until(host.page, () => {
      const r = [...window.app.party.remotes.values()][0];
      return r?.body && Math.hypot(r.body.position.x - 6, r.body.position.z - 4) < 1;
    }, null, 5000));

    // Monsters: spawned by the host, puppets on the guest.
    await host.page.evaluate(() => {
      const app = window.app;
      app.director.stop();
      const V = app.character.position.constructor;
      const p = app.character.position;
      for (let i = 0; i < 3; i++) app.monsters.spawn('grunt', new V(p.x + 3 + i, 0, p.z + 2));
    });
    t.check('monsters appear for the guest', await until(guest.page, () => window.app.monsters.active.filter((m) => m.puppet && m.isAlive).length >= 3, null, 6000));
    await guest.page.waitForTimeout(1200);
    const sameIds = await (async () => {
      const a = await host.page.evaluate(() => window.app.monsters.active.map((m) => m.id).sort());
      const b = await guest.page.evaluate(() => window.app.monsters.active.map((m) => m.id).sort());
      return JSON.stringify(a) === JSON.stringify(b);
    })();
    t.check('both see the same monsters', sameIds);
    t.check('puppets follow the host', await until(guest.page, () => {
      const m = window.app.monsters.active[0];
      return m && m.net && Math.hypot(m.position.x - m.net.x, m.position.z - m.net.z) < 1.5;
    }, null, 4000));

    // A guest's hit reaches the host.
    const target = await host.page.evaluate(() => {
      const m = window.app.monsters.active.find((x) => x.isTargetable);
      return { id: m.id, hp: m.health };
    });
    await guest.page.evaluate((id) => window.app.monsters.byId.get(id).applyDamage(20, { element: 'ice' }), target.id);
    t.check("guest's hit lands on the host", await until(host.page, ({ id, hp }) => (window.app.monsters.byId.get(id)?.health ?? 0) < hp, target, 4000), `was ${target.hp}`);

    // A kill: everyone's experience, the same loot in the same places.
    const xpBefore = await guest.page.evaluate(() => window.app.profile.xp + window.app.profile.level * 100000);
    await host.page.evaluate(() => {
      const app = window.app;
      const V = app.character.position.constructor;
      app.combat.melee(app.character.position.clone().setY(0), new V(0, 0, 1), { damage: 9999, range: 60, arc: Math.PI * 2, knockback: 0 });
    });
    t.check('guest sees the deaths', await until(guest.page, () => window.app.monsters.active.every((m) => !m.isAlive), null, 5000));
    t.check('guest earns experience', await until(guest.page, (before) => window.app.profile.xp + window.app.profile.level * 100000 > before, xpBefore, 4000));
    await host.page.waitForTimeout(800);
    // Drops are a roll of the dice; make sure something is on the floor to share.
    await host.page.evaluate(() => {
      const app = window.app;
      if (app.loot.drops.length) return;
      const items = [{ uid: 'e2e-gold', type: 'gold', rarity: 'common', name: '10 Gold', amount: 10, value: 10 }];
      const from = { x: app.character.position.x + 2, z: app.character.position.z + 2 };
      const targets = app.loot.constructor.scatter(from, items.length);
      app.loot.drop(items, from, () => 0, { targets });
      app.party.announceLoot(items, from, targets);
    });
    await host.page.waitForTimeout(600);
    const hostLoot = await host.page.evaluate(() => window.app.loot.drops.map((d) => [d.item.uid, d.to.x, d.to.z]).sort());
    const guestLoot = await guest.page.evaluate(() => window.app.loot.drops.map((d) => [d.item.uid, d.to.x, d.to.z]).sort());
    t.check('loot falls for both', hostLoot.length > 0 && JSON.stringify(hostLoot) === JSON.stringify(guestLoot), `${hostLoot.length} vs ${guestLoot.length}`);

    // The guest takes an item; the host hands it over and it leaves both floors.
    if (hostLoot.length) {
      const uid = hostLoot[0][0];
      const bagBefore = await guest.page.evaluate(() => window.app.profile.bag.length + window.app.profile.gold + window.app.profile.potions.health + window.app.profile.potions.focus);
      await guest.page.evaluate((uid) => {
        const app = window.app;
        const drop = app.loot.drops.find((d) => d.item.uid === uid);
        drop.landed = true;
        app.loot.player = drop.root.position;
        app.loot._tryPick(drop, 99);
      }, uid);
      t.check('the item leaves the host floor', await until(host.page, (uid) => !window.app.loot.has(uid), uid, 4000));
      t.check('the guest receives it', await until(guest.page, (before) => window.app.profile.bag.length + window.app.profile.gold + window.app.profile.potions.health + window.app.profile.potions.focus > before, bagBefore, 4000));
    }

    // A cast is seen by the other player.
    await host.page.evaluate(() => {
      const app = window.app;
      const V = app.character.position.constructor;
      app._fire('ice', app.character.position.clone(), new V(0, 0, 1), 8, 0);
    });
    t.check('guest sees the host cast', await until(guest.page, () => window.app.abilities.active.length > 0, null, 3000));

    // Battle Roar is a team buff: whoever it reaches deals more damage, and everyone sees an aura on them.
    await host.page.evaluate(() => window.app._teleport(0, 0));
    await guest.page.evaluate(() => window.app._teleport(2.5, 1.5));
    await until(host.page, () => {
      const r = [...window.app.party.remotes.values()][0];
      return r?.body && Math.hypot(r.body.position.x - 2.5, r.body.position.z - 1.5) < 1;
    }, null, 5000);
    const roar = () =>
      host.page.evaluate(() => {
        const app = window.app;
        const V = app.character.position.constructor;
        app._fire('roar', app.character.position.clone().setY(0), new V(0, 0, 1), 0, 0);
      });
    await roar();
    const hostView = await host.page.evaluate(() => ({ buffed: window.app._roarUntil > window.app.elapsed, auras: [...window.app.auras.auras.keys()] }));
    t.check('the roar buffs the Barbarian and shows their aura', hostView.buffed && hostView.auras.includes('me'), JSON.stringify(hostView));
    t.check("the host sees an aura on the teammate it reached", hostView.auras.some((k) => k.startsWith('player:')), JSON.stringify(hostView));
    t.check('the teammate in range gets the damage buff', await until(guest.page, () => window.app._roarUntil > window.app.elapsed && window.app._buffMultiplier() > 1, null, 3000));
    await until(guest.page, () => document.querySelector('[data-buff]')?.hidden === false, null, 3000);
    const guestView = await guest.page.evaluate(() => ({ auras: [...window.app.auras.auras.keys()], pill: document.querySelector('[data-buff]')?.hidden === false ? document.querySelector('[data-buff]').textContent : null }));
    t.check('the teammate sees an aura on themself and on the Barbarian', guestView.auras.includes('me') && guestView.auras.some((k) => k.startsWith('player:')), JSON.stringify(guestView));
    t.check('the teammate sees what the buff gives and how long it lasts', /\+25% damage/.test(guestView.pill ?? '') && /\d s/.test(guestView.pill ?? ''), guestView.pill);
    t.check('the aura fades when the buff ends', await guest.page.evaluate(async () => {
      const app = window.app;
      for (const aura of app.auras.auras.values()) aura.until = app.elapsed + 0.2;
      app._roarUntil = app.elapsed + 0.2;
      const start = performance.now();
      while (performance.now() - start < 4000 && (app.auras.auras.size || !document.querySelector('[data-buff]').hidden)) await new Promise((r) => setTimeout(r, 100));
      return app.auras.auras.size === 0 && document.querySelector('[data-buff]').hidden;
    }));
    // Out of reach: no buff for the guest, but they still see the Barbarian roaring.
    await guest.page.evaluate(() => window.app._teleport(16, 10));
    await until(host.page, () => {
      const r = [...window.app.party.remotes.values()][0];
      return r?.body && Math.hypot(r.body.position.x - 16, r.body.position.z - 10) < 1;
    }, null, 5000);
    await host.page.evaluate(() => window.app.auras.clear());
    await roar();
    await guest.page.waitForTimeout(800);
    const far = await guest.page.evaluate(() => ({ buffed: window.app._roarUntil > window.app.elapsed, auras: [...window.app.auras.auras.keys()] }));
    t.check('a teammate out of reach is not buffed, but sees the Barbarian\'s aura', !far.buffed && !far.auras.includes('me') && far.auras.some((k) => k.startsWith('player:')), JSON.stringify(far));
    t.check('the host does not mark the far teammate', await host.page.evaluate(() => ![...window.app.auras.auras.keys()].some((k) => k.startsWith('player:'))));
    await guest.page.evaluate(() => window.app._teleport(2, 2));

    // The host's monsters hit the guest — and only the guest.
    await host.page.evaluate(() => {
      window.app.monsters.despawnAll();
      window.app.director.health = window.app.director.maxHealth;
    });
    const hpBefore = await guest.page.evaluate(() => window.app.director.health);
    await host.page.evaluate(() => {
      const guestId = [...window.app.party.remotes.keys()][0];
      window.app.monsters.emit('playerHit', 12, { position: window.app.character.position, playerId: guestId });
    });
    t.check('a hit reaches the guest', await until(guest.page, (hp) => window.app.director.health < hp, hpBefore, 4000));
    await host.page.waitForTimeout(300);
    const hostHp = await host.page.evaluate(() => window.app.director.health === window.app.director.maxHealth);
    t.check('and not the host', hostHp);

    // Chat.
    await guest.page.evaluate(() => window.app.party.say('hello there'));
    t.check('chat arrives', await until(host.page, () => window.app.party.chat.some((c) => c.text === 'hello there' && c.name === 'Bo'), null, 4000));
    t.check('the party list shows both', await host.page.evaluate(() => document.querySelectorAll('.party-hud__member').length === 2));

    // Leaving.
    await guest.page.evaluate(() => window.app.party.leave());
    t.check('host sees the guest go', await until(host.page, () => window.app.party.remotes.size === 0, null, 4000));
    await host.page.evaluate(() => window.app.exitToMenu());
    t.check('host back to the menu', await until(host.page, () => window.app.phase === 'menu', null, 5000));
    t.check('no page errors', host.errors.length === 0 && guest.errors.length === 0, [...host.errors, ...guest.errors].slice(0, 4).join(' | '));
  } finally {
    await host.context.close();
    await guest.context.close();
  }
  return t;
}
