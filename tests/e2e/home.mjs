import { boot, tally, until } from './lib.mjs';

/**
 * The platform's home page, by mouse: it opens on the games (not the hero
 * menu), official games are cards, search and genre filters narrow them, a
 * game's page plays it, leaving comes back home; Create makes a game,
 * Publish puts it on the home page, and playing it runs its levels from the
 * server. "Your hero" opens the class menu, and "← Games" comes back.
 */
export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'home', { view: 'home' });
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.home [data-game]')].map((c) => c.dataset.game));
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  try {
    t.check('the platform opens on the games, not the hero menu', await page.evaluate(() => !document.querySelector('.home').hidden && document.querySelector('.main-menu').hidden));
    t.check('official games are cards', await until(page, () => document.querySelectorAll('.home [data-game^="official:"]').length >= 6, null, 10000));
    t.check('the first card is Create a game', await page.evaluate(() => document.querySelector('.home [data-grid]').firstElementChild?.hasAttribute('data-create-card')));
    t.check('every card has a cover, a title and who made it', await page.evaluate(() => [...document.querySelectorAll('.home [data-game]')].every((c) => c.querySelector('svg') && c.querySelector('.home-card__title').textContent && /Gamory|·/.test(c.querySelector('.home-card__meta').textContent))));
    if (shots) await page.waitForTimeout(2500); // the loading veil's fade
    await shot('home');

    // Search, then a genre.
    await page.fill('.home [data-search]', 'grove');
    t.check('search narrows the cards', await until(page, () => {
      const ids = [...document.querySelectorAll('.home [data-game]')].map((c) => c.dataset.game);
      return ids.length === 1 && ids[0] === 'official:study-grove';
    }, null, 5000));
    await page.fill('.home [data-search]', '');
    await page.click('.home [data-genre="boss-hunt"]');
    t.check('a genre chip filters', await until(page, () => [...document.querySelectorAll('.home [data-game]')].length > 0 && [...document.querySelectorAll('.home [data-game]')].every((c) => c.querySelector('.home-card__genre').textContent === '🐉'), null, 5000));
    await page.click('.home [data-genre=""]:not([data-kids])');
    await until(page, () => document.querySelectorAll('.home [data-game]').length >= 6, null, 5000);

    // A game's page, and playing it.
    await page.click('.home [data-game="official:thistledown"]');
    t.check('a card opens the game\'s page', await until(page, () => /Thistledown/.test(document.querySelector('.home [data-page] .home-page__title')?.textContent ?? ''), null, 5000));
    await page.selectOption('.home [data-play-hero]', 'mage');
    await shot('home-game');
    await page.click('.home [data-play]');
    await until(page, () => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Start' && b.offsetParent), null, 30000);
    t.check('Play hides the home page and opens the level', await page.evaluate(() => document.querySelector('.home').hidden));
    await page.locator('button', { hasText: /^Start$/ }).first().click();
    t.check('it plays, as the class picked', await until(page, () => window.app.phase === 'playing' && window.app.run?.level?.id === 'thistledown' && window.app.mainMenu.getSelection().characterId === 'mage', null, 30000));
    await page.evaluate(() => window.app.exitToMenu());
    t.check('leaving a game comes back to the home page', await until(page, () => window.app.phase === 'menu' && !document.querySelector('.home').hidden, null, 10000));
    t.check('the play was counted', await until(page, async () => (await (await fetch('./api/games/official:thistledown')).json()).game.plays >= 1, null, 5000));

    // Create → Publish → it is a card → play it.
    await page.click('.home [data-create]');
    await page.fill('.builder [data-prompt]', 'Moon Garden');
    await page.click('.builder [data-quick]');
    await page.click('.builder [data-save]');
    t.check('Publish says it is on the home page', await until(page, () => /Published/.test(document.querySelector('.builder [data-status]').textContent), null, 10000));
    await page.click('.builder [data-close]');
    t.check('the published game is a card', await until(page, () => [...document.querySelectorAll('.home [data-game]')].some((c) => c.dataset.game.startsWith('g-moon-garden-')), null, 8000));
    const published = (await cards()).find((id) => id.startsWith('g-moon-garden-'));
    await page.click(`.home [data-game="${published}"]`);
    await until(page, () => document.querySelector('.home [data-play]'), null, 5000);
    await page.click('.home [data-play]');
    await until(page, () => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Start' && b.offsetParent), null, 30000);
    await page.locator('button', { hasText: /^Start$/ }).first().click();
    t.check('the published game plays from the server', await until(page, (id) => window.app.phase === 'playing' && window.app.run?.level?.id === `${id}-1` && window.app.run.draft === false, published, 30000));
    t.check('its scenery was scattered from the plan', await page.evaluate(() => window.app.run.level.objects.length > 20));
    await page.evaluate(() => window.app.exitToMenu());
    await until(page, () => !document.querySelector('.home').hidden, null, 10000);

    // The hero menu and back.
    await page.click('.home [data-hero]');
    t.check('"Your hero" opens the class menu', await until(page, () => !document.querySelector('.main-menu').hidden && document.querySelector('.home').hidden, null, 5000));
    await page.click('.main-menu [data-home]');
    t.check('"← Games" goes back home', await until(page, () => document.querySelector('.main-menu').hidden && !document.querySelector('.home').hidden, null, 5000));

    if (shots) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      await shot('home-phone');
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    const real = errors.filter((e) => !/ 503 (GET|POST) \/api\/ai\//.test(e));
    t.check('no page errors', real.length === 0, real.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
