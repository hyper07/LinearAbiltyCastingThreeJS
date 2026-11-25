import { boot, tally, until } from './lib.mjs';

/**
 * Gangnam Jarani's bike race end to end (src/city/race.js): open the Seoul
 * game from its card (it opens on the race menu), pick a rider, night and
 * rain, race three bots on a short course with the streets open — traffic
 * on the road, 70 km/h, the three item slots, the bell on Shift, a branch
 * thrown into a rival's wheel, a crash and back on, only real people (with
 * faces) on the street, How to play on H — pause on Esc, the credits from
 * the pause screen, and leave. Without Seoul's map
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
    t.check('seven short courses and seven plush riders (girls and boys)', await page.evaluate(() => document.querySelectorAll('[data-course]').length === 7 && document.querySelectorAll('[data-char]').length === 7));
    t.check('the race menu has a Credits button (and the corner one)', await page.evaluate(() => Boolean(document.querySelector('[data-race-credits]')) && getComputedStyle(document.querySelector('[data-credits-open]')).display !== 'none'));
    t.check('time and weather rows, Random by default', await page.evaluate(() => document.querySelector('[data-time="random"]').classList.contains('is-on') && document.querySelector('[data-weather="random"]').classList.contains('is-on') && Boolean(document.querySelector('[data-time="dusk"]'))));
    await page.click('[data-char="fox"]');
    await page.click('[data-time="night"]');
    await page.click('[data-weather="rain"]');
    await page.click('[data-course="ikseon"]');
    t.check('a course is planned on the real streets, partly through alleys', await until(page, () => /km · \d+% alleys/.test(document.querySelector('[data-len="ikseon"]')?.textContent ?? ''), null, 20000), await page.evaluate(() => document.querySelector('[data-len="ikseon"]')?.textContent));
    await page.click('[data-race-solo]');
    t.check('the race lines up four riders and counts down', await until(page, () => window.seoul.race.racers.length === 4 && ['grid', 'racing'].includes(window.seoul.race.phase), null, 120000));
    t.check('you ride Pip the fox on a scooter; the bots are the others, girls and boys both', await page.evaluate(() => {
      const rs = window.seoul.race.racers;
      return rs.find((r) => r.me).char === 'fox' && new Set(rs.map((r) => r.char)).size === 4 && rs.some((r) => r.ch.she) && rs.some((r) => !r.ch.she) && rs.every((r) => r.view?.scooter && r.view.mesh.isSkinnedMesh);
    }));
    t.check('the race has its own sky: night and rain, the city clock stopped', await page.evaluate(() => window.seoul.weather.kind === 'rain' && (window.seoul.hour >= 20 || window.seoul.hour < 1) && window.seoul.clockPaused === true));
    t.check('the HUD: map, place, lap, time, three item slots, speed and the sprint gauge', await page.evaluate(() => ['.race__map', '.race__pos', '.race__lap', '.race__time', '.race__speed'].every((s) => !document.querySelector(s).hidden) && document.querySelectorAll('.race__slot').length === 3 && Boolean(document.querySelector('.race__boost'))));
    t.check('the race starts', await until(page, () => window.seoul.race.phase === 'racing', null, 15000));
    await page.evaluate(() => (window.seoul.race.autopilot = true));
    t.check('the streets are open: cars, buses or scooters drive round you', await until(page, () => (window.seoul.race.traffic?.vehicles.length ?? 0) >= 6, null, 30000), await page.evaluate(() => window.seoul.race.traffic?.vehicles.length));
    const d0 = await page.evaluate(() => {
      const r = window.seoul.race;
      r._top = 0;
      r._topT = setInterval(() => (r._top = Math.max(r._top, r.me?.s.v ?? 0)), 100);
      return r.me.dist;
    });
    await page.waitForTimeout(15000);
    t.check('riding on: you get along the course', await page.evaluate((d) => window.seoul.race.me.dist - d > 120, d0), await page.evaluate((d) => (window.seoul.race.me.dist - d).toFixed(0), d0));
    t.check('racing speed: up to about 70 km/h', await page.evaluate(() => (clearInterval(window.seoul.race._topT), window.seoul.race._top * 3.6 > 60)), await page.evaluate(() => `${Math.round(window.seoul.race._top * 3.6)} km/h`));
    t.check('only real people on the street: no faceless figures', await page.evaluate(() => {
      const life = window.seoul.life;
      return Boolean(life) && !('torso' in life.parts) && !('head' in life.parts) && life.people.every((m) => ['walk', 'dog', 'shop', 'stand'].includes(m.kind));
    }));
    // The bell on Shift: ring-ring (its sound sources started), people ahead step aside.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    const bells = await page.evaluate(() => window.seoul.race.bells ?? 0);
    await page.keyboard.press('ShiftLeft');
    t.check('Shift rings the bell: a two-strike ring-ring is played', await until(page, (b) => (window.seoul.race.bells ?? 0) > b && window.seoul.race.lastBell?.sources >= 20 && window.seoul.race.lastBell.id === window.seoul.race.me.id, bells, 3000), await page.evaluate(() => JSON.stringify(window.seoul.race.lastBell)));
    // A branch: thrown at the rival just ahead, it catches their front wheel and over they go.
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = false;
      const me = r.me;
      const bot = r.racers.find((x) => x.bot && x.mode === 'ride');
      const c = r.course;
      const i = me.idx;
      const p = c.points[i];
      const q = c.points[(i + 1) % c.points.length];
      const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      Object.assign(me.s, { x: p[0], z: p[1], heading: hd, travel: hd, v: 0 });
      const j = (i + 3) % c.points.length;
      const pj = c.points[j];
      Object.assign(bot.s, { x: pj[0], z: pj[1], heading: hd, travel: hd, v: 0 });
      bot.dist = me.dist + 18;
      Object.assign(bot, { safe: 0, branchSafe: 0, helmet: false, idx: j });
      me.items = [null, 'branch', null];
      r._renderItems();
      r._victim = bot.id;
      r._before = Object.fromEntries(r.racers.map((x) => [x.id, x.crashes]));
      // (no golden helmets on: one would take the branch)
      for (const x of r.racers) if (x.bot) Object.assign(x, { helmet: false, safe: 0, branchSafe: 0, items: [null, null, null] });
    });
    t.check('a branch shows in its slot', await page.evaluate(() => Boolean(document.querySelector('.race__slot.is-full img[alt="Branch"]'))));
    const thrown = await page.evaluate(() => window.seoul.race.thrown ?? 0);
    await page.keyboard.press('Digit2');
    t.check('2 throws it: a wind-up, then the branch flies', await until(page, (n) => (window.seoul.race.thrown ?? 0) > n && window.seoul.race.me.items[1] === null, thrown, 3000));
    t.check('…into the rival\'s wheel: they go over the bars (CRACK!)', await until(page, () => {
      const r = window.seoul.race;
      // (the one it was thrown at — or whichever rival was nearest ahead of you)
      return r.racers.some((bot) => bot.bot && bot.crashes > (r._before[bot.id] ?? 0) && (bot.mode === 'tumble' || bot.mode === 'dizzy' || bot.branchSafe > 0) && bot.fallKind === 'wheel') && (r.caught ?? 0) > 0;
    }, null, 4000), await page.evaluate(() => JSON.stringify({ caught: window.seoul.race.caught, branches: window.seoul.race.branches?.length })));
    // Items on the number keys.
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = false;
      r.me.items = ['drink', null, null];
      r.me.s.stamina = 0.1;
      r._renderItems();
    });
    t.check('an item shows in its slot', await page.evaluate(() => Boolean(document.querySelector('.race__slot.is-full img'))));
    // (On the bike, not mid-tumble from the autopilot's last scrape.)
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      window.seoul.race.me.safe = 5;
      window.seoul.race.me.s.stamina = 0.1;
    });
    await page.keyboard.press('Digit1');
    t.check('1 uses it: the battery pack fills the boost gauge', await until(page, () => window.seoul.race.me.s.stamina > 0.95 && window.seoul.race.me.items[0] === null, null, 3000));
    // A crash: off the bike, and back on.
    await page.evaluate(() => window.seoul.race._crash(window.seoul.race.me, 'car'));
    t.check('a crash throws you off the scooter', await page.evaluate(() => window.seoul.race.me.mode === 'tumble'));
    t.check('…and you are back on a moment later', await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000));
    await page.keyboard.press('KeyH');
    t.check('H opens How to play in the race', await until(page, () => Boolean(document.querySelector('[data-help-panel]')), null, 3000));
    await page.keyboard.press('KeyH');
    t.check('no credits over a live race: the Credits button is out of the way', await page.evaluate(() => getComputedStyle(document.querySelector('[data-credits-open]')).display === 'none' && !document.querySelector('.seoul__credit')));
    await page.keyboard.press('Escape');
    t.check('Esc pauses the race: a pause panel, the clock stopped', await until(page, () => window.seoul.race.paused && !document.querySelector('.race__pause').hidden, null, 3000));
    const c0 = await page.evaluate(() => window.seoul.race.clock);
    await page.waitForTimeout(600);
    t.check('…and the race stands still', await page.evaluate((c) => window.seoul.race.clock === c, c0));
    await page.click('[data-credits-open-race]');
    t.check('Credits from the pause screen: every source with its link and licence', await until(page, () => {
      const box = document.querySelector('[data-credits]');
      if (!box || box.hidden) return false;
      const text = box.textContent;
      const links = [...box.querySelectorAll('a')].map((a) => a.href);
      return /OpenStreetMap/.test(text) && /Rocketbox/.test(text) && /1-ton truck/.test(text) && /yunho98/.test(text) && !/Hyundai/.test(text) && links.some((h) => h.includes('creativecommons.org/licenses/by/4.0')) && links.some((h) => h.includes('sketchfab.com/3d-models/'));
    }, null, 3000));
    await page.keyboard.press('Escape');
    t.check('Esc closes the credits, still paused', await until(page, () => document.querySelector('[data-credits]').hidden && window.seoul.race.paused, null, 3000));
    await page.keyboard.press('Escape');
    t.check('Esc again resumes', await until(page, () => !window.seoul.race.paused && document.querySelector('.race__pause').hidden, null, 3000));
    await page.keyboard.press('Escape');
    await until(page, () => window.seoul.race.paused, null, 3000);
    await page.click('[data-pause-quit]');
    t.check('Back to Seoul from the pause screen: flying, the city clock running again', await until(page, () => window.seoul.mode === 'fly' && !window.seoul.clockPaused, null, 5000));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
