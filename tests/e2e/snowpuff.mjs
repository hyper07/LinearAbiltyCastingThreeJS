import { boot, tally, until } from './lib.mjs';

/**
 * Snowpuff Peaks end to end: open it from its card, choose a rider and a
 * mountain through the menus, race (steer, tuck, jump, a snowball), reach the
 * podium; then two browsers in one room through the party relay — the guest
 * sees the host ride, a throw crosses over, and both race the same course.
 */
async function openGame(page) {
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const card = '.home [data-game="official:snowpuff"]';
  await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000);
  await page.click(card);
  await page.waitForSelector('.home [data-play]');
  await page.click('.home [data-play]');
  return until(page, () => window.snowpuff?.ready && window.snowpuff.mode === 'menu', null, 180000);
}

export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'snowpuff', { view: 'home' });
  try {
    t.check('opens from its card to the title', await openGame(page));
    t.check('renders with WebGPURenderer (or its WebGL2 backend)', await page.evaluate(() => ['WebGPU', 'WebGL2'].includes(window.snowpuff.backend)));
    await page.click('.sp [data-race]');
    t.check('rider select shows the five plush riders, the fox chosen', await until(page, () => document.querySelectorAll('[data-rider]').length === 5 && document.querySelector('[data-rider="fox"]').getAttribute('aria-pressed') === 'true', null, 5000));
    await page.fill('.sp [data-name]', 'Sh1t Kid');
    await page.click('.sp [data-dice]');
    await page.fill('.sp [data-name]', 'Snowy <b>Jo</b>');
    await page.press('.sp [data-name]', 'Enter');
    t.check('a nickname is cleaned and kept on this device', await until(page, () => document.querySelector('.sp [data-name]').value === 'Snowy bJo' && JSON.parse(localStorage.getItem('snowpuff.save')).name === 'Snowy bJo', null, 3000), await page.evaluate(() => [document.querySelector('.sp [data-name]').value, localStorage.getItem('snowpuff.save')].join(' ')));
    await page.click('.sp [data-rider="bear"]');
    t.check('…and a click picks another', await page.evaluate(() => window.snowpuff.picked === 'bear'));
    await page.click('.sp [data-rider="fox"]');
    await page.click('.sp [data-next]');
    t.check('mountain select is a world map with a pin for every mountain (the famous ones and the Snowpuff Islands)', await until(page, () => document.querySelectorAll('.sp-world [data-pin]').length >= 9 && document.querySelector('.sp-world [data-pin="fuji"]') && document.querySelector('.sp-world [data-pin="marshmallow"]'), null, 5000));
    await page.click('.sp [data-go]');
    t.check('the race counts down and starts', await until(page, () => window.snowpuff.mode === 'race', null, 120000));
    t.check('rivals line up beside you', await page.evaluate(() => window.snowpuff.racers.length === 4 && window.snowpuff.racers.filter((r) => !r.human).length === 3));
    t.check('your nickname rides with you (course strip; no tag over your own head)', await until(page, () => window.snowpuff.me.name === 'Snowy bJo' && document.querySelector('.sp-face.me')?.title === 'Snowy bJo (you)' && ![...document.querySelectorAll('.sp-nametag')].some((d) => d.textContent === 'Snowy bJo' && d.style.display !== 'none'), null, 4000));
    const s0 = await page.evaluate(() => window.snowpuff.me.rider.s);
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyS');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    t.check('steering carves', await page.evaluate(() => window.snowpuff.me.rider.carve > 0.3));
    await page.keyboard.up('KeyD');
    t.check('you ride downhill and pick up speed', await page.evaluate((s) => window.snowpuff.me.rider.s > s + 6 && window.snowpuff.me.rider.speed > 4, s0), JSON.stringify(await page.evaluate(() => [window.snowpuff.me.rider.s, window.snowpuff.me.rider.speed])));
    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    await page.keyboard.up('Space');
    t.check('Space hops into the air', await until(page, () => window.snowpuff.me.rider.air, null, 1500));
    await until(page, () => !window.snowpuff.me.rider.air, null, 4000);
    t.check('the HUD shows place, the course strip, the minimap and the speed dial', await page.evaluate(() => Boolean(document.querySelector('.sp-pos b') && document.querySelectorAll('.sp-face').length === 4 && document.querySelector('.sp-mini') && document.querySelector('.sp-speed'))));
    await page.evaluate(() => window.snowpuff.debugBonk());
    await page.evaluate(() => {
      const g = window.snowpuff;
      g.me.slots = [{ kind: 'giant', n: 1 }];
      g.debugPin(0, 20, 0, 12);
    });
    await page.keyboard.press('Digit1');
    t.check('a giant snowball (an item on 1) rolls down your lane', await until(page, () => window.snowpuff.race.giants.length > 0 || window.snowpuff.racers.some((r) => !r.me && (r.rider.tumble > 0 || r.rider.rolled > 0)), null, 2000));
    t.check('a snowball (1) flies at the rider ahead and tumbles them', await until(page, () => window.snowpuff.racers.some((r) => !r.me && r.rider.tumble > 0 && r.rider.tumbleSoft), null, 3000));
    await page.evaluate(() => window.snowpuff.debugFinish());
    t.check('the finish shows the podium and the standings', await until(page, () => window.snowpuff.mode === 'results' && document.querySelectorAll('.sp-standing').length === 4, null, 8000));
    t.check('…with name tags on the podium, yours among them', await until(page, () => [...document.querySelectorAll('.sp-nametag')].some((d) => d.textContent === 'Snowy bJo' && d.style.display !== 'none'), null, 4000));
    t.check('…and remembers your best time', await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('snowpuff.save')).best.marshmallow)));
    await page.evaluate(() => window.snowpuff.close());
    await until(page, () => window.app?.home?.isVisible, null, 15000);
    t.check('no page errors (solo)', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }

  // ---- two browsers, one room
  const A = await boot(browser, 'snowpuff-host', { view: 'home' });
  const B = await boot(browser, 'snowpuff-guest', { view: 'home' });
  try {
    t.check('host and guest both open the game', (await openGame(A.page)) && (await openGame(B.page)));
    await A.page.click('.sp [data-friends]');
    await A.page.click('.sp [data-create]');
    const code = await until(A.page, () => /^[A-Z0-9]{5}$/.test(document.querySelector('[data-room]')?.textContent ?? ''), null, 10000) && (await A.page.textContent('.sp [data-room]'));
    t.check('the host makes a room with a five-letter code', Boolean(code), String(code));
    await B.page.click('.sp [data-friends]');
    await B.page.fill('.sp [data-code]', code || '');
    await B.page.click('.sp [data-join]');
    t.check('the guest joins by the code; both see two riders', await until(A.page, () => document.querySelectorAll('.sp-member').length === 2, null, 10000) && (await until(B.page, () => document.querySelectorAll('.sp-member').length === 2, null, 10000)));
    await A.page.click('.sp [data-start]');
    const raced = (await until(A.page, () => window.snowpuff.mode === 'race', null, 120000)) && (await until(B.page, () => window.snowpuff.mode === 'race', null, 120000));
    t.check('the host starts; both race the same mountain', raced && (await A.page.evaluate(() => window.snowpuff.race.course.id)) === (await B.page.evaluate(() => window.snowpuff.race.course.id)));
    t.check('two humans and AI riders for the empty places', await B.page.evaluate(() => window.snowpuff.racers.filter((r) => r.human).length === 2 && window.snowpuff.racers.length >= 4));
    await A.page.keyboard.down('KeyS');
    await A.page.waitForTimeout(2500);
    await A.page.keyboard.up('KeyS');
    const hostS = await A.page.evaluate(() => window.snowpuff.me.rider.s);
    t.check('the guest sees the host riding (states at ~15 Hz, interpolated)', await until(B.page, (s) => {
      const h = window.snowpuff.racers.find((r) => r.human && !r.me);
      return h && Math.abs(h.rider.s - s) < 25 && h.rider.s > 15;
    }, hostS, 5000));
    t.check('the guest sees the host\'s AI riders moving too', await B.page.evaluate(() => window.snowpuff.racers.filter((r) => !r.human).every((r) => r.rider.s > 10)));
    await A.page.evaluate(() => window.snowpuff.debugBonk());
    t.check('a host\'s snowball reaches the guest\'s screen', await until(B.page, () => window.snowpuff.race.projectiles.length > 0 || window.snowpuff.racers.some((r) => r.rider.spinout > 0 || r.bonks > 0), null, 3000));
    t.check('no page errors (online)', A.errors.length + B.errors.length === 0, [...A.errors, ...B.errors].slice(0, 3).join(' | '));
  } finally {
    await A.context.close();
    await B.context.close();
  }
  return t;
}
