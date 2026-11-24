import { boot, tally, until } from './lib.mjs';

/**
 * Gangnam Jarani's bike race end to end (src/city/race.js): open the Seoul
 * game from its card (it opens on the race menu), pick a rider, night and
 * rain, race three bots on a short course through the alleys with the
 * streets open — traffic on the road, the three item slots, sprinting, a
 * crash and back on, How to play on H — and leave. Without Seoul's map
 * converted on this server (data/geo/seoul) there is nothing to race on:
 * the checks say so and pass by.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'jarani', { view: 'home' });
  try {
    await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    const card = '.home [data-game="official:seoul"]';
    await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000);
    await page.click(card);
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    const ready = await until(page, () => Boolean(window.seoul?.ready && document.querySelector('[data-race-solo]')) || Boolean(document.querySelector('.seoul__msg:not([hidden])')), null, 120000);
    const installed = await page.evaluate(() => Boolean(window.seoul?.ready));
    t.check('opens from its card on the race menu (or says the map is not installed)', ready);
    if (!installed) {
      t.check('no Seoul map on this server: the race is not run', true);
      return t;
    }
    t.check('seven short bike courses and six riders (three women, three men)', await page.evaluate(() => document.querySelectorAll('[data-course]').length === 7 && document.querySelectorAll('[data-char]').length === 6));
    t.check('time and weather rows, Random by default', await page.evaluate(() => document.querySelector('[data-time="random"]').classList.contains('is-on') && document.querySelector('[data-weather="random"]').classList.contains('is-on') && Boolean(document.querySelector('[data-time="dusk"]'))));
    await page.click('[data-char="taeo"]');
    await page.click('[data-time="night"]');
    await page.click('[data-weather="rain"]');
    await page.click('[data-course="ikseon"]');
    t.check('a course is planned on the real streets, partly through alleys', await until(page, () => /km · \d+% alleys/.test(document.querySelector('[data-len="ikseon"]')?.textContent ?? ''), null, 20000), await page.evaluate(() => document.querySelector('[data-len="ikseon"]')?.textContent));
    await page.click('[data-race-solo]');
    t.check('the race lines up four riders and counts down', await until(page, () => window.seoul.race.racers.length === 4 && ['grid', 'racing'].includes(window.seoul.race.phase), null, 120000));
    t.check('you ride Taeo; the bots are the others, women and men both', await page.evaluate(() => {
      const rs = window.seoul.race.racers;
      return rs.find((r) => r.me).char === 'taeo' && new Set(rs.map((r) => r.char)).size === 4 && rs.some((r) => r.ch.she) && rs.some((r) => !r.ch.she);
    }));
    t.check('the race has its own sky: night and rain, the city clock stopped', await page.evaluate(() => window.seoul.weather.kind === 'rain' && (window.seoul.hour >= 20 || window.seoul.hour < 1) && window.seoul.clockPaused === true));
    t.check('the HUD: map, place, lap, time, three item slots, speed and the sprint gauge', await page.evaluate(() => ['.race__map', '.race__pos', '.race__lap', '.race__time', '.race__speed'].every((s) => !document.querySelector(s).hidden) && document.querySelectorAll('.race__slot').length === 3 && Boolean(document.querySelector('.race__boost'))));
    t.check('the race starts', await until(page, () => window.seoul.race.phase === 'racing', null, 15000));
    await page.evaluate(() => (window.seoul.race.autopilot = true));
    t.check('the streets are open: cars, buses or scooters drive round you', await until(page, () => (window.seoul.race.traffic?.vehicles.length ?? 0) >= 6, null, 30000), await page.evaluate(() => window.seoul.race.traffic?.vehicles.length));
    const d0 = await page.evaluate(() => window.seoul.race.me.dist);
    await page.waitForTimeout(15000);
    t.check('riding on: you get along the course', await page.evaluate((d) => window.seoul.race.me.dist - d > 40, d0), await page.evaluate((d) => (window.seoul.race.me.dist - d).toFixed(0), d0));
    // Items on the number keys.
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = false;
      r.me.items = ['drink', null, null];
      r.me.s.stamina = 0.1;
      r._renderItems();
    });
    t.check('an item shows in its slot', await page.evaluate(() => Boolean(document.querySelector('.race__slot.is-full img'))));
    await page.keyboard.press('Digit1');
    t.check('1 uses it: the energy drink fills the sprint gauge', await until(page, () => window.seoul.race.me.s.stamina > 0.95 && window.seoul.race.me.items[0] === null, null, 3000));
    // A crash: off the bike, and back on.
    await page.evaluate(() => window.seoul.race._crash(window.seoul.race.me, 'car'));
    t.check('a crash throws you off', await page.evaluate(() => window.seoul.race.me.mode === 'tumble'));
    t.check('…and you are back on the bike a moment later', await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000));
    await page.keyboard.press('KeyH');
    t.check('H opens How to play in the race', await until(page, () => Boolean(document.querySelector('[data-help-panel]')), null, 3000));
    await page.keyboard.press('KeyH');
    await page.keyboard.press('Escape');
    t.check('Esc leaves the race: back to flying, the city clock running again', await until(page, () => window.seoul.mode === 'fly' && !window.seoul.clockPaused, null, 5000));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
