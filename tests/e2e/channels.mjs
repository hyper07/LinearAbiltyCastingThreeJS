import { boot, tally, until } from './lib.mjs';

/**
 * Channels, by mouse: a maker's own space from the home page, a playlist made
 * and played through, a game marked done and the badge it earns, the channel
 * made private and opened by a visitor only with its private link, and a
 * mistake reported in a game.
 */
const signUp = async (page, name) => {
  const body = JSON.stringify({ name, password: 'channel-pass-1x' });
  const made = await page.evaluate((b) => fetch('./api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b }).then((r) => r.status), body);
  if (made !== 200) await page.evaluate((b) => fetch('./api/account/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b }), body);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.app?.phase === 'menu' && window.app.account?.user, null, { timeout: 120000 });
  await page.waitForSelector('.home [data-game]', { timeout: 30000 });
};
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel);

export async function run(browser, { shots = null } = {}) {
  const t = tally();
  const tag = Date.now().toString(36).slice(-5);
  const { context, page, errors } = await boot(browser, 'channel', { view: 'home' });
  const visitor = await boot(browser, 'visitor', { view: 'home' });
  const shot = (name, p = page) => shots && p.screenshot({ path: `${shots}/${name}.png` });
  try {
    // Signed out: the button explains and offers to sign in.
    await page.click('.home [data-channel]');
    t.check('signed out, My channel asks you to sign in', await until(page, () => /Sign in/.test(document.querySelector('.chan__message')?.textContent ?? ''), null, 5000));
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.app.home.channel.close());

    await signUp(page, `Maker${tag}`);
    await page.click('.home [data-channel]');
    await page.waitForSelector('.chan .chan__name');
    t.check('your channel opens with your name, a handle and Public', /Maker/.test(await text(page, '.chan__name')) && new RegExp(`@maker${tag}`).test(await text(page, '.chan__meta')) && /Public/.test(await text(page, '.chan__vis')));
    t.check('an empty channel says how to start', /Make a game/.test(await text(page, '.chan__body')));

    // A playlist of three games.
    await page.click('.chan__info .chan-btn:has-text("New playlist")');
    await page.fill('.chan-dialog input[placeholder^="Fractions"]', 'Strategy school');
    await until(page, () => document.querySelectorAll('.chan-pick__pool .chan-pick__add').length > 3, null, 10000);
    for (let i = 0; i < 3; i++) await page.click('.chan-pick__pool .chan-pick__add >> nth=0');
    t.check('picked games are listed in order', (await page.evaluate(() => document.querySelectorAll('.chan-pick__chosen .chan-pick__title').length)) === 3);
    const second = await page.evaluate(() => document.querySelectorAll('.chan-pick__chosen .chan-pick__title')[1].textContent);
    await page.click('.chan-pick__chosen li >> nth=1 >> button:has-text("↑")');
    t.check('the arrows change the order', (await page.evaluate(() => document.querySelector('.chan-pick__chosen .chan-pick__title').textContent)) === second);
    await page.click('.chan-dialog .chan-btn--primary');
    t.check('the playlist is on the Playlists tab', await until(page, () => /Strategy school/.test(document.querySelector('.chan-list')?.textContent ?? ''), null, 8000));
    await page.click('.chan [data-tab="home"]');
    t.check('and a shelf of three numbered cards on Home', await until(page, () => document.querySelectorAll('.chan-shelf[data-playlist] .chan-card__index').length === 3, null, 5000));
    await shot('channel-home');

    // Play through it: the game on the left, the chapters on the right.
    await page.click('.chan-shelf[data-playlist] .chan-btn--primary');
    await page.waitForSelector('.chan-watch');
    t.check('Play all opens the first game with the list beside it', (await page.evaluate(() => document.querySelectorAll('.chan-watch__list li').length)) === 3 && (await text(page, '.chan-watch__title')) === second);
    await page.click('.chan-watch .chan-btn:has-text("Mark as done")');
    t.check('marking it done ticks it in the list', await until(page, () => /Done/.test(document.querySelector('.chan-watch__list li')?.textContent ?? ''), null, 8000));
    await page.click('.chan-watch .chan-btn:has-text("Next:")');
    t.check('Next moves to the second game', await until(page, () => document.querySelectorAll('.chan-watch__list li')[1]?.classList.contains('is-current'), null, 5000));
    await shot('channel-playlist');
    await page.click('.chan-watch__stage');
    t.check('Play opens the game from the playlist, and its time starts counting', await until(page, () => {
      const app = window.app;
      const screen = app._engineView?.root;
      return app.playTracker.game && (screen ? screen.isConnected && !screen.hidden : !app.lobby.root.hidden || app.home.root.hidden);
    }, null, 30000));
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.app?.phase === 'menu' && window.app.account?.user, null, { timeout: 120000 });
    await page.click('.home [data-channel]');
    await page.waitForSelector('.chan .chan__name');
    t.check('back on the channel, Keep going offers the next game', await until(page, () => /Keep going/i.test(document.querySelector('.chan-next')?.textContent ?? ''), null, 8000));
    await page.click('.chan [data-tab="achievements"]');
    t.check('achievements count the finished game and give the first badge', (await text(page, '[data-stat="done"] strong')) === '1' && (await page.evaluate(() => document.querySelector('[data-badge="first-play"]').classList.contains('is-earned'))));
    await shot('channel-achievements');

    // Private: a visitor needs the private link.
    await page.click('.chan__info .chan-btn:has-text("Customize")');
    await page.selectOption('.chan-dialog select', 'private');
    await page.fill('.chan-dialog textarea', 'Games for my class.');
    await page.click('.chan-dialog .chan-btn--primary');
    t.check('the channel shows as Private', await until(page, () => /Private/.test(document.querySelector('.chan__vis')?.textContent ?? ''), null, 8000));
    const link = await page.evaluate(() => window.app.home.channel.link());
    t.check('its link carries a key', /#\/c\/maker[a-z0-9-]+\?key=[a-f0-9]{18}$/.test(link));
    const v = visitor.page;
    await v.evaluate((hash) => (location.hash = hash), link.split('#')[1].split('?')[0]);
    t.check('without the key a visitor is told it is private', await until(v, () => /private/i.test(document.querySelector('.chan__message')?.textContent ?? ''), null, 8000));
    await v.evaluate((hash) => (location.hash = hash), link.split('#')[1]);
    t.check('with the private link the visitor sees it', await until(v, () => /private link/.test(document.querySelector('.chan__note')?.textContent ?? '') && Boolean(document.querySelector('.chan-shelf[data-playlist]')), null, 8000));
    t.check('a visitor gets no owner tools', await v.evaluate(() => !/Customize|New playlist/.test(document.querySelector('.chan__info').textContent)));

    // The visitor signs up and reports a mistake in a game.
    await v.evaluate(() => window.app.home.channel.close());
    await signUp(v, `Eye${tag}`);
    await v.evaluate((hash) => (location.hash = hash), link.split('#')[1]);
    await v.waitForSelector('.chan-shelf[data-playlist] .chan-btn--primary');
    await v.click('.chan-shelf[data-playlist] .chan-btn--primary');
    await v.click('.chan-watch .chan-btn:has-text("Found a mistake")');
    await v.fill('.chan-dialog textarea', 'The second objective says to go north, but the marker is in the south.');
    await v.click('.chan-dialog .chan-btn--primary');
    t.check('a mistake can be reported from a game', await until(v, () => /Sent to the maker/.test(document.querySelector('.chan-toast')?.textContent ?? ''), null, 8000));
    await v.evaluate(() => window.app.home.channel.openMine());
    await v.waitForSelector('.chan [data-tab="achievements"]');
    await v.click('.chan [data-tab="achievements"]');
    t.check('and it counts for the finder', await until(v, () => document.querySelector('[data-stat="found"] strong')?.textContent === '1' && document.querySelector('[data-badge="sharp-eye"]').classList.contains('is-earned'), null, 8000));
    await v.click('.chan [data-tab="mistakes"]');
    t.check('their Mistakes tab lists it as waiting', /waiting for an answer/.test(await text(v, '.chan-mis')));
    // The one refusal is meant: the private channel, asked for without its key.
    const bad = [...errors, ...visitor.errors].filter((e) => !/404 GET \/api\/channels\/maker/.test(e));
    t.check('no errors on either page', bad.length === 0, bad.slice(0, 3).join(' | '));
  } finally {
    await context.close();
    await visitor.context.close();
  }
  return t;
}
