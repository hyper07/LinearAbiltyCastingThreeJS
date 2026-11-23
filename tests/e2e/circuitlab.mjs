import { boot, tally, until } from './lib.mjs';

/**
 * Circuit Lab (apps/circuitlab, in a frame over the home page): the card opens
 * the lab, a lesson loads and runs on a simulated board (the LED net blinks,
 * the serial monitor fills), the Code panel shows the sketch, and Home closes
 * it again. How to play (H) is checked in help.mjs with the games.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'circuitlab', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  try {
    const card = '.home [data-game="official:circuitlab"]';
    t.check('the Circuit Lab card is on the home page', await until(page, (sel) => Boolean(document.querySelector(sel)), card, 20000));
    t.check('…in Learning · Electronics', await page.evaluate((sel) => /Electronics/.test(document.querySelector(sel)?.textContent ?? ''), card));
    await page.click(card);
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('Play opens the lab', await until(page, () => window.circuitlab?.ready === true, null, 120000));
    const frame = page.frames().find((f) => f.url().includes('/circuitlab/'));
    t.check('…in its own frame', Boolean(frame));
    if (frame) {
      await frame.evaluate(() => window.circuitlab.loadLesson('blink'));
      const ran = await until(frame, () => (window.circuitlab.state().time ?? 0) > 1.3, null, 30000);
      t.check('the Blink lesson runs in simulated time', ran);
      t.check('…and the board prints to the serial monitor', /Blink started/.test(await frame.evaluate(() => window.circuitlab.serial('U1'))));
      const levels = await frame.evaluate(async () => {
        const seen = new Set();
        for (let i = 0; i < 40; i++) {
          const v = window.circuitlab.engine()?.netVoltage('a12');
          if (Number.isFinite(v)) seen.add(v > 2.5 ? 'H' : 'L');
          await new Promise((r) => setTimeout(r, 100));
        }
        return [...seen];
      });
      t.check('…and pin 13 goes both HIGH and LOW', levels.includes('H') && levels.includes('L'), levels.join(','));
      await frame.evaluate(() => window.circuitlab.openSheet('code'));
      t.check('the Code panel shows the sketch', await until(frame, () => /digitalWrite\(LED, HIGH\)/.test(document.querySelector('[data-code-panel] textarea')?.value ?? ''), null, 8000));
      await frame.evaluate(() => window.circuitlab.openSheet(null));
      await frame.click('[data-home]');
      t.check('Home closes the lab', await until(page, () => !document.querySelector('.circuitlab-host') && window.app?.home?.isVisible, null, 15000));
    }
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
