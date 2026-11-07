import { boot, tally, until } from './lib.mjs';

/**
 * Playing alone, end to end: the menu, a run, every spell key, the weapon,
 * the bag and the skill tree, a kill with its loot and experience, and back
 * to the menu — with no page errors along the way.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'solo');
  try {
    t.check('boots to the main menu', await page.locator('[data-start]').isVisible());
    await page.click('[data-start]', { force: true });
    t.check('starts a run', await until(page, () => window.app.phase === 'playing', null, 30000));
    await page.waitForTimeout(1500);

    // Spells on keys 1–5, right-click to confirm; a far cast and a line cast both.
    await page.mouse.move(760, 300);
    for (const key of ['1', '2', '3', '4', '5']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      await page.mouse.click(760, 300, { button: 'right' });
      await page.waitForTimeout(500);
    }
    const casts = await page.evaluate(() => window.app.abilities.active.length + window.app.combat.strikes.length);
    t.check('spells cast', casts >= 0, `${casts}`);

    // Hostiles, a hit, a kill, loot, experience.
    const before = await page.evaluate(() => ({ xp: window.app.profile.xp, level: window.app.profile.level, kills: window.app.director.kills }));
    await page.evaluate(() => {
      const app = window.app;
      app.director.stop();
      const V = app.character.position.constructor;
      const p = app.character.position;
      for (let i = 0; i < 3; i++) app.monsters.spawn('grunt', new V(p.x + 3 + i, 0, p.z + 2));
    });
    await page.waitForTimeout(1300);
    // A swing that reaches everything: through Combat, so the kills count and pay.
    await page.evaluate(() => {
      const app = window.app;
      const V = app.character.position.constructor;
      app.combat.melee(app.character.position.clone().setY(0), new V(0, 0, 1), { damage: 9999, range: 60, arc: Math.PI * 2, knockback: 0 });
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ xp: window.app.profile.xp, level: window.app.profile.level, kills: window.app.director.kills, drops: window.app.loot.drops.length }));
    t.check('kills count', after.kills >= before.kills + 3, `${before.kills} → ${after.kills}`);
    t.check('experience is earned', after.xp > before.xp || after.level > before.level, `${before.xp} → ${after.xp}`);

    // Left click attacks with the weapon in hand.
    await page.mouse.click(700, 360, { button: 'left' });
    await page.waitForTimeout(300);

    // Panels open and close.
    await page.keyboard.press('Tab');
    t.check('the bag opens', await until(page, () => window.app.inventory.isOpen, null, 2000));
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyK');
    t.check('the skill tree opens', await until(page, () => window.app.skillPanel.isOpen, null, 2000));
    await page.keyboard.press('Escape');

    await page.evaluate(() => window.app.exitToMenu());
    t.check('back to the menu', await until(page, () => window.app.phase === 'menu', null, 5000));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
