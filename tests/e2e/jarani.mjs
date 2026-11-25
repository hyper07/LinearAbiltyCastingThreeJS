import { boot, tally, until } from './lib.mjs';

/**
 * Gangnam Jarani's bike race end to end (src/city/race.js): open the Seoul
 * game from its card (it opens on the race menu), pick a rider, night and
 * rain, race three bots on a short course with the streets open — traffic
 * on the road, 70 km/h, the three item slots, the bell on Space, a drift on
 * Shift, riders never inside a building (ridden into one at full speed they
 * scrape or come off), a golmok short cut taken and counted, the alley
 * mouths joined to their roads, a branch
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
    await page.click('[data-course="euljiro"]');
    t.check('a course is planned on the real streets, partly through alleys, with a golmok short cut', await until(page, () => /km · \d+% alleys · \d short cut/.test(document.querySelector('[data-len="euljiro"]')?.textContent ?? ''), null, 60000), await page.evaluate(() => document.querySelector('[data-len="euljiro"]')?.textContent));
    await page.click('[data-race-solo]');
    t.check('the race lines up four riders and counts down', await until(page, () => window.seoul.race.racers.length === 4 && ['grid', 'racing'].includes(window.seoul.race.phase), null, 120000));
    t.check('you ride Pip the fox on a scooter; the bots are the others, girls and boys both', await page.evaluate(() => {
      const rs = window.seoul.race.racers;
      return rs.find((r) => r.me).char === 'fox' && new Set(rs.map((r) => r.char)).size === 4 && rs.some((r) => r.ch.she) && rs.some((r) => !r.ch.she) && rs.every((r) => r.view?.scooter && r.view.mesh.isSkinnedMesh);
    }));
    t.check('the race has its own sky: night and rain, the city clock stopped', await page.evaluate(() => window.seoul.weather.kind === 'rain' && (window.seoul.hour >= 20 || window.seoul.hour < 1) && window.seoul.clockPaused === true));
    t.check('the HUD: map, place, lap, time, three item slots, speed and the sprint gauge', await page.evaluate(() => ['.race__map', '.race__pos', '.race__lap', '.race__time', '.race__speed'].every((s) => !document.querySelector(s).hidden) && document.querySelectorAll('.race__slot').length === 3 && Boolean(document.querySelector('.race__boost'))));
    t.check('the race starts', await until(page, () => window.seoul.race.phase === 'racing', null, 15000));
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = true;
      // Watched all race: no rider ever inside a building, nor the camera; who drifted.
      const st = (r._e2e = { inside: 0, cam: 0, samples: 0, drift: 0 });
      r._e2eT = setInterval(() => {
        st.samples++;
        for (const x of r.racers) if (x.mode === 'ride' && r._inside(x)) st.inside++;
        if (r.camInside) st.cam++;
        for (const x of r.racers) if ((x.s.drift ?? 0) > 0.3) st.drift++;
      }, 100);
    });
    t.check('short cuts are marked: a sign at each mouth, its own arrows, dotted on the map', await page.evaluate(() => {
      const r = window.seoul.race;
      return r.paths.length >= 1 && r.scSigns.length === r.paths.length && r.scArrows?.count > 0 && r.course.shortcuts.every((sc) => sc.saves > 15 && sc.width <= 4.7);
    }));
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
    // The bell on Space: ring-ring (its sound sources started), people ahead step aside.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    const bells = await page.evaluate(() => window.seoul.race.bells ?? 0);
    await page.keyboard.press('Space');
    t.check('Space rings the bell: a two-strike ring-ring is played', await until(page, (b) => (window.seoul.race.bells ?? 0) > b && window.seoul.race.lastBell?.sources >= 20 && window.seoul.race.lastBell.id === window.seoul.race.me.id, bells, 3000), await page.evaluate(() => JSON.stringify(window.seoul.race.lastBell)));
    // A short cut: on the autopilot down the golmok — counted as the course it cuts out, back on the course after.
    const sc = await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      const p = r.paths[0];
      const i = p.enter - 4;
      const a = p.points[i];
      const b = p.points[i + 1];
      const hd = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
      Object.assign(me.s, { x: a[0], z: a[1], heading: hd, travel: hd, v: 8 });
      Object.assign(me, { sc: p.k, si: i, idx: p.sc.from - 4, safe: 1, mode: 'ride', lost: 0 });
      r.autopilot = true;
      r._scStart = { dist: me.dist, took: me.shortcuts ?? 0, crashes: me.crashes };
      // the other riders out of its way for this: parked well back down the course
      r.racers.filter((x) => !x.me).forEach((x, k) => {
        const q = r.course.points[(p.sc.from - 60 - k * 4 + r.course.points.length) % r.course.points.length];
        Object.assign(x.s, { x: q[0], z: q[1], v: 0 });
        Object.assign(x, { idx: (p.sc.from - 60 - k * 4 + r.course.points.length) % r.course.points.length, sc: null });
      });
      return { from: p.sc.from, to: p.sc.to, span: p.sc.span, length: p.sc.length };
    });
    t.check('the autopilot rides through a short cut and is back on the course after it', await until(page, (to) => {
      const me = window.seoul.race.me;
      return me.sc == null && me.idx >= to && me.idx < to + 40;
    }, sc.to, 30000), await page.evaluate(() => JSON.stringify({ sc: window.seoul.race.me.sc, idx: window.seoul.race.me.idx })));
    t.check('…and its golmok counts as the course it cuts out (no lap lost or gained)', await page.evaluate((sc) => {
      const r = window.seoul.race;
      const gained = r.me.dist - r._scStart.dist;
      return gained > sc.span * 0.85 && gained < sc.span + 260;
    }, sc), await page.evaluate(() => (window.seoul.race.me.dist - window.seoul.race._scStart.dist).toFixed(0)) + ` m for a ${sc.span.toFixed(0)} m stretch`);
    t.check('nobody walks or drives down a short cut', await page.evaluate(() => {
      const r = window.seoul.race;
      return !(window.seoul.life?.people ?? []).some((m) => r.keepClear(m.x, m.z)) && !(r.traffic?.vehicles ?? []).some((v) => r.keepClear(v.box.x, v.box.z));
    }));
    // Ridden straight at a building at full speed: a scrape or a fall at its wall — never inside it.
    const wall = await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      const w = r.course.walls;
      r.autopilot = false;
      for (let i = 20; i < r.course.points.length; i += 7) {
        const p = r.course.points[i];
        const q = r.course.points[i + 1];
        const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
        for (const side of [1, -1]) {
          const dx = Math.cos(hd) * side;
          const dz = -Math.sin(hd) * side;
          const d = w.ray(p[0], p[1], dx, dz, 40);
          if (d < 14 || d > 38 || !w.inside(p[0] + dx * (d + 1), p[1] + dz * (d + 1))) continue;
          const h = Math.atan2(-dx, -dz);
          Object.assign(me.s, { x: p[0], z: p[1], heading: h, travel: h, v: 23, lean: 0, steer: 0 });
          Object.assign(me, { mode: 'ride', safe: 0, helmet: false, crashes: 0, idx: i, sc: null });
          r._wallRun = { inside: 0, crashed: 0, minV: 99 };
          r._wallT = setInterval(() => {
            if (w.inside(me.s.x, me.s.z)) r._wallRun.inside++;
            r._wallRun.crashed = me.crashes;
            r._wallRun.minV = Math.min(r._wallRun.minV, me.s.v);
          }, 16);
          return { d: Math.round(d) };
        }
      }
      return null;
    });
    if (wall) {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(2500);
      await page.keyboard.up('KeyW');
      const run = await page.evaluate(() => (clearInterval(window.seoul.race._wallT), window.seoul.race._wallRun));
      t.check('ridden into a building at full speed: never inside it — it stops you (a fall) or turns you along it', run.inside === 0 && (run.crashed > 0 || run.minV < 15), JSON.stringify({ ...run, at: wall.d }));
    } else t.check('a building beside the course to ride into', false);
    // R, straight after the wall (still against it, or tumbling): back on the open road at once.
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(150);
    const reset = await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      return { mode: me.mode, inside: r._inside(me), hit: Boolean(r.course.walls?.hits(me.s.x, me.s.z, 0.3)) };
    });
    t.check('R puts you back on the open road at once, wherever you were (riding, clear of every wall)', reset.mode === 'ride' && !reset.inside && !reset.hit, JSON.stringify(reset));
    await page.evaluate(() => (window.seoul.race.autopilot = false));
    // Shift: a drift — the back out, round the corner.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      const p = r.course.points[r.me.idx];
      Object.assign(me.s, { v: 16, lean: 0 });
      me.safe = 3;
    });
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(350);
    const drift = await page.evaluate(() => ({ drift: window.seoul.race.me.s.drift, skid: window.seoul.race.me.s.skid }));
    await page.keyboard.up('KeyA');
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyW');
    t.check('Shift with a lean drifts: the back steps out', drift.drift > 0.5 && drift.skid > 0.2, JSON.stringify(drift));
    // The alley mouths: every junction of a golmok with a main road sampled for holes, steps and overlaps.
    const j = await page.evaluate(() => {
      const o = window.seoul.race.junctionReport();
      return { junctions: o.junctions, steps: o.steps, gaps: o.gaps, overlaps: o.overlaps, sc: o.list.filter((x) => x.line !== 'course').map((x) => ({ steps: x.steps, gaps: x.gaps, maxStep: x.maxStep })) };
    });
    t.check('alley mouths: every junction found and sampled (steps, holes, overlaps listed)', j.junctions > 0, JSON.stringify(j));
    t.check('…the short cuts\' mouths: no hole, no step a wheel would catch (over 15 cm)', j.sc.every((x) => x.gaps === 0 && x.maxStep <= 0.15), JSON.stringify(j.sc));
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
    const watched = await page.evaluate(() => (clearInterval(window.seoul.race._e2eT), window.seoul.race._e2e ?? { inside: -1 }));
    t.check('all race long: no rider inside a building, nor the camera', watched.inside === 0 && watched.cam === 0 && watched.samples > 50, JSON.stringify(watched));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
