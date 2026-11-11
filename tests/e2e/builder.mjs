import { boot, tally, until } from './lib.mjs';

/**
 * The Game builder, by mouse: open it from Create, Quick build a sentence
 * (no AI), see the menus filled in, change a menu, Build with AI on a server
 * with no model (it falls back to the words, and says so), play the game
 * without saving — the scenery is scattered from the plan, the helpers stand
 * there, the goal is the genre's — walk through to chapter 2, and publish the
 * game to the home page.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'builder');
  const field = (name) => page.locator(`.builder [data-field="${name}"]`);
  try {
    await page.click('[data-panel="create"]');
    await page.click('[data-open-builder]');
    t.check('the builder opens from Create', await until(page, () => !document.querySelector('.builder').hidden, null, 3000));
    t.check('no model on this server: it says the menus still work', await until(page, () => /AI offline/.test(document.querySelector('.builder [data-plan]').textContent), null, 5000));
    t.check('custom builds are locked without Plus', await page.locator('.builder [data-custom]').isDisabled());

    await page.fill('.builder [data-prompt]', 'a snowy dungeon crawl with three rooms and a knight');
    await page.click('.builder [data-quick]');
    t.check('Quick build fills in the menus', (await field('genre').inputValue()) === 'dungeon-crawl' && (await field('world').inputValue()) === 'frozen-north' && (await field('hero').inputValue()) === 'knight');
    // A class a player made (the Class forge ships two) is a hero like any other.
    t.check('the Hero menu offers classes players made', await page.evaluate(() => [...document.querySelectorAll('.builder [data-field="hero"] option')].some((o) => o.value === 'forge-stormbound-corsair' && /made by a player/.test(o.textContent))));
    await page.fill('.builder [data-prompt]', 'a pirate story quest with the Stormbound Corsair');
    await page.click('.builder [data-quick]');
    t.check('naming a player-made class in the idea picks it', await until(page, () => document.querySelector('.builder [data-field="hero"]')?.value === 'forge-stormbound-corsair', null, 3000));
    await page.fill('.builder [data-prompt]', 'a snowy dungeon crawl with three rooms and a knight');
    await page.click('.builder [data-quick]');
    t.check('three chapters, the last one the boss lair', await until(page, () => {
      const items = [...document.querySelectorAll('.builder [data-chapters] li')].map((li) => li.textContent);
      return items.length === 3 && /boss/i.test(items[2]) && /Boss lair/.test(items[2]);
    }, null, 3000));

    await field('world').selectOption('pirate-coast');
    await field('chapters').fill('2');
    await field('chapters').dispatchEvent('change');
    t.check('changing a menu rebuilds the chapters', await until(page, () => document.querySelectorAll('.builder [data-chapters] li').length === 2, null, 3000));

    // Build with AI: no model here, so it falls back to the words and says why.
    await page.fill('.builder [data-prompt]', 'a times tables adventure for my 8 year old');
    await page.click('.builder [data-build]');
    t.check('with no model, Build with AI falls back to the words', await until(page, () => /instead/.test(document.querySelector('.builder [data-status]').textContent), null, 10000));
    t.check('a study game gets the study and reward settings', (await field('genre').inputValue()) === 'study' && (await field('subject').inputValue()) === 'times' && (await field('age').inputValue()) === '8');
    await field('gold').fill('30');
    await field('gold').dispatchEvent('change');

    // Back to the dungeon, two chapters, and play it without saving.
    await page.fill('.builder [data-prompt]', 'a snowy dungeon crawl with two rooms');
    await page.click('.builder [data-quick]');
    await page.click('.builder [data-play]');
    // The opening scene: press Start.
    t.check('Play now opens the first chapter', await until(page, () => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Start' && b.offsetParent), null, 30000));
    await page.locator('button', { hasText: /^Start$/ }).first().click();
    t.check('the chapter is running', await until(page, () => window.app.phase === 'playing' && window.app.run?.level, null, 30000));
    const level = await page.evaluate(() => {
      const l = window.app.run.level;
      return { id: l.id, objects: l.objects.length, npcs: l.npcs.length, goal: l.rules.goal, draft: window.app.run.draft, campaign: window.app.run.campaign.length, blueprint: l.blueprint };
    });
    t.check('the scenery was scattered from the plan', level.objects > 20, JSON.stringify(level));
    t.check('the helpers stand there', level.npcs >= 1, JSON.stringify(level));
    t.check('the goal is the genre\'s', level.goal === 'waves');
    t.check('it is a draft (not saved), two chapters long', level.draft === true && level.campaign === 2, JSON.stringify(level));

    // Win, walk through the exit, and on to chapter 2.
    await page.evaluate(async () => {
      const app = window.app;
      app._winLevel();
      app._finishLevel();
    });
    await until(page, () => [...document.querySelectorAll('button')].some((b) => /^Next:/.test(b.textContent) && b.offsetParent), null, 10000);
    await page.locator('button', { hasText: /^Next:/ }).first().click();
    await until(page, () => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Start' && b.offsetParent), null, 30000);
    await page.locator('button', { hasText: /^Start$/ }).first().click();
    t.check('Next goes to chapter 2', await until(page, (first) => window.app.phase === 'playing' && window.app.run?.level?.id !== first && window.app.run?.index === 1, level.id, 30000));
    t.check('the last chapter is the boss', await page.evaluate(() => window.app.run.level.rules.goal === 'boss'));

    // Save: back to the menu, build again, save to the campaign.
    await page.evaluate(() => window.app.exitToMenu());
    await until(page, () => window.app.phase === 'menu', null, 10000);
    await page.evaluate(() => window.app.builder.toggle(true));
    await page.fill('.builder [data-prompt]', 'Moon Garden');
    await page.click('.builder [data-quick]');
    await page.click('.builder [data-save]');
    t.check('Publish puts it on the home page', await until(page, () => /Published/.test(document.querySelector('.builder [data-status]').textContent), null, 10000));
    const published = await page.evaluate(async () => (await (await fetch('./api/games?q=moon')).json()).games.find((g) => g.title === 'Moon Garden'));
    t.check('it is a game record on the server', Boolean(published), JSON.stringify(published));
    const file = await page.evaluate(async (id) => (await (await fetch(`./api/games/${id}`)).json()).game.levels[0], published?.id);
    t.check('its level is stored as a plan, a few kilobytes', file?.plan && file.objects.length === 0 && JSON.stringify(file).length < 6000);

    // The AI is off on the test server: its 503s are the point of the fallback checks above.
    const real = errors.filter((e) => !/ 503 (GET|POST) \/api\/ai\//.test(e));
    t.check('no page errors', real.length === 0, real.join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
