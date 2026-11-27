import { boot, tally, until } from './lib.mjs';
import { DEMO_LESSONS } from '../fixtures/arcademia-activities.js';
import { mapRegions, centreOf, matchOrder, hashOf, solveRover } from '../../src/arcademia/content/games.js';

/**
 * Arcademia's six signature games (lesson/games/): each demo lesson (tests/fixtures/
 * arcademia-activities.js) played from its story to its stars, once with the mouse and once with the
 * keyboard alone — sorting cards (dragging one), a map hunt (arrow keys hop between places), a dig
 * with a question and a picture code (typed letters), a rocket fuelled and launched, a rover program
 * with a bug and a loop to fix, and a rhythm echoed on the drum, a bar completed and bells matched.
 * A miss on purpose along the way checks the game stays gentle. With E2E_SHOTS=<dir> it saves a
 * picture of each game mid-play there (game-<kind>.png).
 */
const SHOTS = process.env.E2E_SHOTS ?? null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'activities', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/game-${name}.png` });
  try {
    const card = '.home [data-game="official:arcademia"]';
    await until(page, (sel) => Boolean(document.querySelector(sel)), card, 30000);
    await page.click(card);
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    t.check('arcademia opens', await until(page, () => window.arcademia && window.arcademia.mode === 'world' && window.arcademia.power, null, 240000));
    await page.waitForTimeout(800);
    await page.click('.arc-start__play');
    await page.waitForTimeout(800);
    const buddy = await page.$('.arc-side--buddy .arc-btn--primary');
    if (buddy) await buddy.click();
    await page.waitForTimeout(1000);

    // E2E_KINDS=dig,rover plays only those.
    const only = process.env.E2E_KINDS?.split(',') ?? null;
    for (const kind of ['sort', 'maphunt', 'dig', 'countdown', 'rover', 'rhythm'].filter((k) => !only || only.includes(k))) {
      for (const keys of [false, true]) {
        const how = keys ? 'keyboard' : 'mouse';
        const lesson = DEMO_LESSONS[kind];
        const xp0 = await page.evaluate(() => window.arcademia.gs.s.xp);
        await page.evaluate((l) => window.arcademia.playLesson(l), lesson);
        const opened = await until(page, () => window.arcademia.mode === 'lesson' && document.querySelector('.arc-story'), null, 20000);
        if (!t.check(`${kind} (${how}): the demo lesson opens on its story`, opened)) continue;
        // Story and the two reading cards.
        await act(page, keys, '.arc-story .arc-btn--primary');
        for (let i = 0; i < 2; i++) {
          await page.waitForSelector('.arc-read .arc-btn--primary');
          await act(page, keys, '.arc-read .arc-btn--primary');
        }
        const ready = await until(page, (k) => Boolean(document.querySelector(`.arc-game--${k}`)), kind, 8000);
        if (!t.check(`${kind} (${how}): the game starts after the reading`, ready)) continue;
        const steps = await page.$$eval('.arc-lesson__steps li', (ls) => ls.map((l) => l.textContent));
        t.check(`${kind} (${how}): its quest step is named`, steps.length === 4 && !steps.some((s) => s.startsWith('quest.')), JSON.stringify(steps));
        try {
          await PLAY[kind](page, t, lesson, { keys, how, shot });
        } catch (error) {
          t.check(`${kind} (${how}): played without a hitch`, false, error.message.split('\n')[0]);
          await page.evaluate(() => window.arcademia.leaveLesson());
          await page.waitForTimeout(500);
          continue;
        }
        // The game ends on Next; then the challenge (every demo answer is the first choice).
        const ended = await until(page, () => Boolean(document.querySelector('.arc-game__next')), null, 15000);
        if (!t.check(`${kind} (${how}): the game is finished, Next shows`, ended, await page.evaluate(() => `${document.activeElement?.outerHTML.slice(0, 120)} | ${[...document.querySelectorAll('.arc-feedback')].map((f) => f.textContent).join(' / ')}`))) {
          await page.evaluate(() => window.arcademia.leaveLesson());
          continue;
        }
        await act(page, keys, '.arc-game__next');
        for (let i = 0; i < 3; i++) {
          await page.waitForSelector('.arc-quiz .arc-choice');
          await act(page, keys, '.arc-quiz .arc-choice');
          await page.waitForSelector('.arc-quiz .arc-btn--primary:not([hidden])');
          if (keys) await page.keyboard.press('Enter');
          else await page.click('.arc-quiz .arc-btn--primary:not([hidden])');
        }
        const done = await until(page, () => Boolean(document.querySelector('.arc-results .arc-bigstar')), null, 8000);
        const xp1 = await page.evaluate(() => window.arcademia.gs.s.xp);
        t.check(`${kind} (${how}): played to the end — stars and rewards`, done, `xp ${xp0} → ${xp1}`);
        // Reading 5 + lesson 30 + three right answers 30: anything more came from the game itself.
        t.check(`${kind} (${how}): the game itself gave XP for things solved first time`, xp1 - xp0 > 65, `+${xp1 - xp0}`);
        await page.evaluate(() => window.arcademia.leaveLesson());
        await page.waitForTimeout(600);
      }
    }
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}

/** Press a control: a click, or (keyboard) focus it and press Enter. */
async function act(page, keys, selector, { nth = 0 } = {}) {
  const loc = page.locator(selector).nth(nth);
  if (keys) await loc.press('Enter');
  else await loc.click();
}
const fbIs = (page, tone) => until(page, (c) => [...document.querySelectorAll('.arc-game .arc-feedback')].some((f) => f.classList.contains(c)), `is-${tone}`, 4000);

const PLAY = {
  /* ---------------------------------------------------------------- sort */
  async sort(page, t, l, { keys, how, shot }) {
    const s = l.sort;
    // Find the rule first.
    t.check(`sort (${how}): the groups start as mysteries with their examples`, await page.$$eval('.arc-sort__label', (ls) => ls.every((x) => x.textContent.includes('❓'))) && (await page.$$('.arc-sort__chip.is-given')).length === 3);
    await act(page, keys, '.arc-sort__rule .arc-choice');
    t.check(`sort (${how}): guessing the rule reveals the groups and deals the cards`, await until(page, () => !document.querySelector('.arc-sort__tray').hidden && document.querySelectorAll('.arc-sort__card').length === 5, null, 6000));
    const groupOf = (label) => s.groups.findIndex((g) => g.id === s.items.find((i) => label.startsWith(i.label)).group);
    let first = true;
    for (let n = 0; n < 5; n++) {
      const label = await page.locator('.arc-sort__card').first().getAttribute('aria-label');
      const gi = groupOf(label);
      if (first) {
        // A wrong group first: the card comes back, gently.
        const wrong = (gi + 1) % s.groups.length;
        if (keys) await page.locator('.arc-sort__card').first().press(String(wrong + 1));
        else {
          await page.locator('.arc-sort__card').first().click();
          await page.locator('.arc-sort__bin').nth(wrong).click();
        }
        t.check(`sort (${how}): a wrong group sends the card back with a hint`, (await fbIs(page, 'oops')) && (await page.locator('.arc-sort__card').count()) === 5);
        first = false;
      }
      const cardEl = page.locator('.arc-sort__card').first();
      if (keys) {
        // Enter picks it up; the arrow keys walk the groups; Enter drops it.
        await cardEl.press('Enter');
        for (let k = 0; k < gi; k++) await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
      } else if (n === 1) {
        // Drag one there.
        const a = await cardEl.boundingBox(), b = await page.locator('.arc-sort__bin').nth(gi).boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        for (let k = 1; k <= 8; k++) await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * k) / 8, a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * k) / 8);
        await page.mouse.up();
      } else {
        await cardEl.click();
        await page.locator('.arc-sort__bin').nth(gi).click();
      }
      await page.waitForFunction((left) => document.querySelectorAll('.arc-sort__card').length === left, 4 - n, { timeout: 3000 });
      if (n === 2 && !keys) await shot('sort');
    }
    t.check(`sort (${how}): every card sorted`, (await page.$$('.arc-sort__chip')).length === 8);
  },

  /* ---------------------------------------------------------------- maphunt */
  async maphunt(page, t, l, { keys, how, shot }) {
    const regions = mapRegions(l.maphunt.map);
    const at = Object.fromEntries(regions.map((r) => [r.id, centreOf(r)]));
    // A tap on a place's own spot on the map (through the map's own transform).
    const tapAt = async (id) => {
      const [x, y] = await page.evaluate(([mx, my]) => {
        const p = new DOMPoint(mx, my).matrixTransform(document.querySelector('.arc-map__svg').getScreenCTM());
        return [p.x, p.y];
      }, at[id]);
      await page.mouse.click(x, y);
    };
    let hops = 0;
    for (const [i, c] of l.maphunt.clues.entries()) {
      await page.waitForFunction((q) => document.querySelector('.arc-map__q')?.textContent.includes(q), c.q, { timeout: 6000 });
      if (i === 0) {
        // A miss first: it names the place and the compass swings the right way.
        if (keys) await page.locator('.arc-map__region[data-region="asia"]').press('Enter');
        else await tapAt('asia');
        const fb = await page.textContent('.arc-game .arc-feedback');
        t.check(`maphunt (${how}): a miss names the place and points the way`, (await fbIs(page, 'oops')) && /Asia/.test(fb) && /west|east|north|south/.test(fb) && Boolean(await page.$('.arc-compass.is-pointing')), fb);
        if (!keys) {
          await wait(900);
          await shot('maphunt');
        }
      }
      if (keys) {
        // Hop with the arrow keys toward the place, then Enter.
        let here = await page.evaluate(() => document.activeElement?.dataset?.region ?? null);
        if (!here) {
          await page.locator('.arc-map__region').first().focus();
          here = await page.evaluate(() => document.activeElement.dataset.region);
        }
        for (let k = 0; k < 14 && here !== c.region; k++) {
          const dx = at[c.region][0] - at[here][0], dy = at[c.region][1] - at[here][1];
          await page.keyboard.press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
          const next = await page.evaluate(() => document.activeElement?.dataset?.region ?? null);
          if (next === here) break;
          here = next;
          hops++;
        }
        if (here !== c.region) await page.locator(`.arc-map__region[data-region="${c.region}"]`).focus();
        await page.keyboard.press('Enter');
      } else await tapAt(c.region);
      t.check(`maphunt (${how}): clue ${i + 1} found (${c.region})`, await until(page, (id) => document.querySelector(`.arc-map__region[data-region="${id}"]`)?.classList.contains('is-found'), c.region, 4000));
    }
    if (keys) t.check('maphunt (keyboard): the arrow keys hop between places', hops > 0, `${hops} hops`);
  },

  /* ---------------------------------------------------------------- dig */
  async dig(page, t, l, { keys, how, shot }) {
    const d = l.dig;
    const cell = (x, y) => page.locator('.arc-dig__cell').nth(y * d.w + x);
    if (keys) {
      await cell(0, 0).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      t.check('dig (keyboard): Enter brushes; an empty square says so', /sand|pebbles/i.test(await page.textContent('.arc-game > .arc-feedback')));
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    } else {
      await cell(0, 0).click();
      await cell(0, 0).click();
      await cell(2, 0).click();
      await shot('dig-site');
      await cell(1, 1).click();
      await cell(1, 1).click();
    }
    t.check(`dig (${how}): brushing a square twice uncovers the jar and its question`, await until(page, () => !document.querySelector('.arc-dig__panel').hidden && document.querySelector('.arc-dig__panel .arc-choice'), null, 4000));
    if (keys) await page.keyboard.press('Enter');
    else await page.locator('.arc-dig__panel .arc-choice').first().click();
    await page.waitForSelector('.arc-dig__panel .arc-btn--primary');
    if (keys) await page.keyboard.press('Enter');
    else await page.click('.arc-dig__panel .arc-btn--primary');
    t.check(`dig (${how}): the jar goes on the shelf`, (await page.$$('.arc-dig__slot.is-got')).length === 1);
    if (keys) {
      // Focus is back on the jar's square: two right, one down.
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    } else {
      await cell(3, 2).click();
      await cell(3, 2).click();
    }
    t.check(`dig (${how}): the carved stone opens a code to crack`, await until(page, () => document.querySelectorAll('.arc-code__cell').length === 4, null, 4000));
    const message = d.finds[1].decode.message;
    if (keys) {
      // Typing works too: a decoy letter first (gently refused), then the message.
      const pairs = await page.$$eval('.arc-code__pair', (ps) => ps.map((p) => p.querySelector('strong').textContent));
      await page.keyboard.press(`Key${pairs.find((ch) => ch !== message[0])}`);
      t.check('dig (keyboard): a wrong typed letter is refused gently', await fbIs(page, 'oops'));
      for (const ch of message) await page.keyboard.press(`Key${ch}`);
    } else {
      // One wrong key first, then each symbol's letter from the key.
      const pairs = await page.$$eval('.arc-code__pair', (ps) => ps.map((p) => p.querySelector('strong').textContent));
      const wrongI = pairs.findIndex((ch) => ch !== message[0]);
      await page.locator('.arc-code__pair').nth(wrongI).click();
      t.check('dig (mouse): a wrong letter says which symbol to look for', (await fbIs(page, 'oops')) && /Look for/.test(await page.textContent('.arc-dig__panel .arc-feedback')));
      await shot('dig');
      for (const ch of message) await page.locator('.arc-code__pair', { has: page.locator('strong', { hasText: ch }) }).click();
    }
    t.check(`dig (${how}): the code is cracked`, await until(page, () => document.querySelectorAll('.arc-code__cell.is-done').length === 4, null, 3000));
    await page.waitForSelector('.arc-dig__panel .arc-btn--primary');
    if (keys) await page.keyboard.press('Enter');
    else await page.click('.arc-dig__panel .arc-btn--primary');
  },

  /* ---------------------------------------------------------------- countdown */
  async countdown(page, t, l, { keys, how, shot }) {
    const fuel = () => page.$eval('.arc-cd__tank', (e) => Number(e.getAttribute('aria-valuenow')));
    const tapTile = async (text) => {
      const tile = page.locator('.arc-cd__tile:not([disabled])', { hasText: new RegExp(`^${text}$`) });
      if (keys) await tile.press('Enter');
      else await tile.click();
    };
    for (const [i, s] of l.countdown.steps.entries()) {
      await page.waitForFunction((q) => document.querySelector('.arc-cd__q')?.textContent === q, s.q, { timeout: 6000 });
      if (s.order) {
        if (i === 0) {
          await tapTile(String(s.order[2]));
          t.check(`countdown (${how}): a tile out of order wobbles and nothing is lost`, (await fbIs(page, 'oops')) && (await page.$$('.arc-cd__slot.is-full')).length === 0);
        }
        for (const x of s.order) await tapTile(String(x));
      } else await act(page, keys, '.arc-cd__panel .arc-choice');
      t.check(`countdown (${how}): step ${i + 1} pours fuel in`, await until(page, (k) => Number(document.querySelector('.arc-cd__tank').getAttribute('aria-valuenow')) >= k, Math.round(((i + 1) / l.countdown.steps.length) * 100) - 1, 4000), `fuel ${await fuel()}`);
      if (i === 1 && !keys) await shot('countdown-fuel');
    }
    await page.waitForSelector('.arc-cd__launch', { timeout: 8000 });
    if (keys) await page.keyboard.press('Enter');
    else await page.click('.arc-cd__launch');
    t.check(`countdown (${how}): the countdown runs from ${l.countdown.from}`, await until(page, (n) => document.querySelector('.arc-cd__big')?.textContent === String(n), l.countdown.from, 3000));
    t.check(`countdown (${how}): lift off`, await until(page, () => document.querySelector('.arc-cd__pad.is-launch'), null, 8000));
    if (!keys) {
      await wait(700);
      await shot('countdown');
    }
    t.check(`countdown (${how}): the rocket is on its way`, await until(page, () => document.querySelector('.arc-cd__pad.is-gone'), null, 6000));
  },

  /* ---------------------------------------------------------------- rover */
  async rover(page, t, l, { keys, how, shot }) {
    const [p1] = l.rover.puzzles;
    const best = solveRover(p1);
    const KEY = { forward: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' };
    const run = async () => {
      if (keys) {
        await page.locator('.arc-rover__map').focus();
        await page.keyboard.press('Enter');
      } else await page.click('.arc-rover__run');
    };
    const finished = async () => {
      await until(page, () => document.querySelector('.arc-rover__run').disabled, null, 2000);
      return until(page, () => !document.querySelector('.arc-rover__run').disabled || document.querySelector('.arc-game .arc-feedback.is-good'), null, 15000);
    };
    // A bug first: straight ahead into the rocks.
    if (keys) {
      await page.locator('.arc-rover__map').focus();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
    } else for (let k = 0; k < 2; k++) await page.click('.arc-rover__block--forward');
    t.check(`rover (${how}): blocks go into the program`, (await page.$$('.arc-rover__prog .arc-rover__chip')).length === 2);
    await run();
    await finished();
    t.check(`rover (${how}): a bump stops the rover and lights the bug red`, Boolean(await page.$('.arc-rover__chip.is-bug')) && /rock/i.test(await page.textContent('.arc-game .arc-feedback')));
    if (!keys) await shot('rover');
    // Clear it and build a way round.
    if (keys) {
      await page.locator('.arc-rover__map').focus();
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      for (const b of best) await page.keyboard.press(KEY[b]);
    } else {
      await page.click('.arc-rover__ctrl .arc-btn--ghost');
      for (const b of best) await page.click(`.arc-rover__block--${b}`);
    }
    t.check(`rover (${how}): the new program has ${best.length} blocks`, (await page.$$('.arc-rover__prog .arc-rover__chip')).length === best.length);
    await run();
    t.check(`rover (${how}): puzzle 1 solved`, await until(page, () => document.querySelector('.arc-game .arc-feedback.is-good'), null, 15000));
    await page.waitForSelector('.arc-game__body .arc-btn--primary.arc-btn--big:not(.arc-rover__run)', { timeout: 6000 });
    if (keys) await page.keyboard.press('Enter');
    else await page.click('.arc-game__body .arc-btn--primary.arc-btn--big:not(.arc-rover__run)');
    // Puzzle 2: fix the bug — the loop is one short.
    await page.waitForSelector('.arc-rover__badge--bug');
    t.check(`rover (${how}): puzzle 2 starts with a buggy program in a loop`, (await page.textContent('.arc-rover__times')).includes('3'));
    await run();
    await finished();
    t.check(`rover (${how}): the buggy program leaves a sample behind`, /sample/i.test(await page.textContent('.arc-game .arc-feedback')));
    if (keys) await page.locator('.arc-rover__times').press('Enter');
    else await page.click('.arc-rover__times');
    t.check(`rover (${how}): the loop's count goes up to 4`, (await page.textContent('.arc-rover__times')).includes('4'));
    await run();
    t.check(`rover (${how}): fixed — the rover picks up its sample`, await until(page, () => document.querySelector('.arc-game .arc-feedback.is-good') && document.querySelector('.arc-rover__sample.is-got'), null, 15000));
  },

  /* ---------------------------------------------------------------- rhythm */
  async rhythm(page, t, l, { keys, how, shot }) {
    const r = l.rhythm;
    const beat = 60000 / r.tempo;
    // Round 1: echo. Listen, then tap it back in time.
    const echo = r.rounds[0];
    const onsetsMs = [];
    let tt = 0;
    for (const v of echo.pattern) {
      if (v > 0) onsetsMs.push(tt);
      tt += Math.abs(v) * beat;
    }
    let good = false;
    for (let attempt = 0; attempt < 3 && !good; attempt++) {
      await act(page, keys, '.arc-rhythm__listen');
      await page.waitForSelector('.arc-rhythm__pad:not([disabled])', { timeout: 8000 });
      if (keys) await page.locator('.arc-rhythm__pad').focus();
      const box = await page.locator('.arc-rhythm__pad').boundingBox();
      if (!keys) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const t0 = Date.now();
      for (const at of onsetsMs) {
        const lag = at - (Date.now() - t0);
        if (lag > 0) await wait(lag);
        if (keys) await page.keyboard.press('Space');
        else {
          await page.mouse.down();
          await page.mouse.up();
        }
      }
      if (attempt === 0 && !keys) await shot('rhythm');
      await until(page, () => document.querySelector('.arc-game .arc-feedback.is-good, .arc-game .arc-feedback.is-oops'), null, 4000);
      good = await page.$eval('.arc-game .arc-feedback', (f) => f.classList.contains('is-good'));
    }
    t.check(`rhythm (${how}): the rhythm tapped back in time`, good);
    // Round 2: which note fills the bar? (choices 4, 2, 1 — the half note.)
    await page.waitForSelector('.arc-rhythm--notes', { timeout: 8000 });
    const notes = r.rounds[1];
    if (!keys) {
      await page.locator('.arc-rhythm__choice').nth(notes.choices.indexOf(4)).click();
      t.check('rhythm (mouse): the wrong note shows a hint', await fbIs(page, 'oops'));
      await shot('rhythm-notes');
    }
    await act(page, keys, '.arc-rhythm__choice', { nth: notes.choices.indexOf(2) });
    t.check(`rhythm (${how}): the half note fills the gap`, await until(page, () => document.querySelector('.arc-note.is-filled'), null, 3000));
    // Round 3: which bell rang?
    await page.waitForSelector('.arc-rhythm--match', { timeout: 10000 });
    const match = r.rounds[2];
    const order = matchOrder(match.pairs.length, match.turns, hashOf(`${l.id}:2`));
    for (const [k, want] of order.entries()) {
      await page.waitForFunction((n) => document.querySelector('.arc-rhythm__turn')?.textContent.includes(String(n)) && document.querySelector('.arc-game .arc-feedback')?.textContent.includes('Which'), k + 1, { timeout: 8000 });
      if (k === 0 && !keys) {
        await shot('rhythm-bells');
        await page.locator('.arc-rhythm__bell').nth((want + 1) % match.pairs.length).click();
        t.check('rhythm (mouse): the wrong bell rings its own note and says which it was', /That was/.test(await page.textContent('.arc-game .arc-feedback')));
      }
      await act(page, keys, '.arc-rhythm__bell', { nth: want });
      t.check(`rhythm (${how}): bell ${k + 1} matched`, await fbIs(page, 'good'));
    }
  }
};
