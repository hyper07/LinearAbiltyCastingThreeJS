import { boot, tally, until } from './lib.mjs';

/**
 * Kickrani's bike race end to end (src/city/race.js): open the Seoul
 * game from its card (it opens on the race menu), pick a rider, night and
 * rain, race three bots on a short course with the streets open — traffic
 * on the road, 70 km/h, the three item slots, the bell on Space, a drift on
 * Shift, riders never inside a building (ridden into one at full speed they
 * scrape or come off), a golmok short cut taken and counted, the alley
 * mouths joined to their roads, a branch
 * thrown into the wheel of the rider right ahead (only them; from 1st, wasted), the energy drink's boost, the golden helmet
 * worn and knocked off, marbles that throw a rival off, the rival panel,
 * a crash and back on, only real people (with
 * faces) on the street, How to play on H — pause on Esc, the credits from
 * the pause screen, and leave. Then the courses by level (Easy, Medium,
 * Hard tabs over the map, Hard shut till a Medium is finished, "Try
 * anyway"), cars coming the other way, the Namsan Tower Downhill raced to
 * its finish line below its start (point to point, its woods and guard
 * rails, the finish kept as progress), and the Jamsil Fairground's rides
 * moving; then a race in a fog bank, a call to the police that stops the rider ahead, (fog far under 40 m, the riders unfogged)
 * to the course's own music, watched for a blinking box in the middle (no
 * WRONG WAY flicker, the rival panel never empty or in and out too fast), the
 * 30 s finish window (bots close behind get home in it, one far back is DNF,
 * your scooter cools down, the seconds left under your time), the podium of
 * only those who finished, dancing with confetti and the podium's music, the
 * results over it on any key, and Race again taking it all down. Without Seoul's map
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
    const ready = await until(page, () => Boolean(window.seoul?.ready && document.querySelector('.jl [data-char]')) || Boolean(document.querySelector('.seoul__msg:not([hidden])')), null, 120000);
    const installed = await page.evaluate(() => Boolean(window.seoul?.ready));
    t.check('opens from its card on the race menu (or says the map is not installed)', ready);
    if (!installed) {
      t.check('no Seoul map on this server: the race is not run', true);
      return t;
    }
    // The pre-race flow over its 3D stage: rider → scooter → course → time and weather → go.
    const shot = (name) => (process.env.JARANI_FRAMES ? page.screenshot({ path: `${process.env.JARANI_FRAMES}-${name}.jpg`, quality: 82 }) : null);
    t.check('the rider step: seven plush riders (girls and boys) on scooters on a 3D turntable', await until(page, () => document.querySelectorAll('.jl [data-char]').length === 7 && window.seoul.race.stage?.riders.size === 7 && window.seoul.race.stageOn, null, 60000));
    await page.click('[data-char="cat"]');
    await page.keyboard.press('ArrowRight');
    t.check('← → browse the riders: the turntable turns the next one to the front, and it reacts', await until(page, () => window.seoul.race.char === 'bear' && window.seoul.race.stage.picked === 'bear' && Boolean(window.seoul.race.stage.riders.get('bear').m._react), null, 3000));
    await page.click('[data-char="fox"]');
    t.check('a name, a nickname and a READY button for the rider in front', await page.evaluate(() => /Pip/.test(document.querySelector('[data-card] h2')?.textContent) && Boolean(document.querySelector('.jl__nick')) && /READY/.test(document.querySelector('.jl [data-next]')?.textContent)));
    await page.waitForTimeout(900);
    await shot('rider');
    await page.click('.jl [data-next]');
    t.check('the scooter step: six scooters in 3D, with five stat bars', await until(page, () => document.querySelectorAll('[data-scooter]').length === 6 && document.querySelectorAll('.jl__stat').length === 5 && window.seoul.race.stage.view === 'scooter', null, 3000));
    await page.click('[data-scooter="racer"]');
    t.check('picking a scooter: your rider hops onto that model, and the bars show its trade-off', await until(page, () => {
      const r = window.seoul.race;
      const bar = (k) => parseFloat(getComputedStyle(document.querySelector(`[data-stat="${k}"] b`)).getPropertyValue('--w'));
      return r.scooter === 'racer' && r.stage.riders.get('fox').m.scooter.model === 'racer' && bar('speed') > 70 && bar('corner') < 30 && bar('shock') < 30;
    }, null, 3000));
    await page.waitForTimeout(900);
    await shot('scooter');
    await page.click('.jl [data-back]');
    t.check('Back goes back a step', await until(page, () => window.seoul.race.lobby.step === 'rider', null, 3000));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    t.check('the course step: a map of Seoul with a pin for every course, the Easy ones listed', await until(page, () => window.seoul.race.lobby.step === 'course' && document.querySelectorAll('[data-pin]').length >= 15 && document.querySelectorAll('[data-course]').length === 8 && window.seoul.race.lobby.level === 'easy', null, 3000), await page.evaluate(() => `${document.querySelectorAll('[data-pin]').length} pins, ${document.querySelectorAll('[data-course]').length} listed`));
    // The levels: three tabs over the map; Hard lists its own courses, the map shows only theirs and flies to them.
    t.check('three level tabs over the map: Easy, Medium, Hard, with their chillies', await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('.jl__levels [data-level]')];
      return tabs.map((b) => b.dataset.level).join() === 'easy,medium,hard' && tabs.map((b) => b.querySelectorAll('.chilli').length).join() === '1,2,3';
    }));
    await page.click('.jl__levels [data-level="hard"]');
    t.check('picking Hard: its courses listed, the others\' pins gone from the map, the map fitted to them', await until(page, () => {
      const r = window.seoul.race;
      const ids = [...document.querySelectorAll('[data-course]')].map((b) => b.dataset.course);
      const shown = [...document.querySelectorAll('[data-pin]')].filter((p) => !p.hidden && !p.classList.contains('is-other')).map((p) => p.dataset.pin);
      return r.lobby.map.level === 'hard' && ids.length >= 3 && ids.includes('namsandown') && !ids.includes('hongdae') && shown.every((id) => ids.includes(id)) && !r.lobby.map.anim;
    }, null, 6000));
    t.check('…each with its difficulty (three chillies), and shut till a Medium course is finished: Try anyway', await until(page, () => {
      const card = document.querySelector('[data-course-card]');
      return card.querySelectorAll('.jl__kind .chilli').length === 3 && /Try anyway/.test(card.querySelector('[data-next]')?.textContent ?? '') && /unlock Hard/.test(card.textContent);
    }, null, 3000));
    await shot('levels-hard');
    await page.click('.jl__levels [data-level="easy"]');
    await until(page, () => window.seoul.race.lobby.level === 'easy' && document.querySelectorAll('[data-course]').length === 8, null, 3000);
    t.check('…a real map: drawn from the city\'s own land and roads, in tiles', await until(page, () => (window.seoul.race.lobby.map?.drawnTiles ?? 0) > 4 && window.seoul.race.lobby.map.data?.roads.length > 1000 && document.querySelector('.cm canvas').width > 300, null, 15000), await page.evaluate(() => JSON.stringify({ tiles: window.seoul.race.lobby.map?.drawnTiles, roads: window.seoul.race.lobby.map?.data?.roads.length })));
    const course = 'hongdae';
    t.check('each course is planned on the real streets: its length, wide roads, sharp turns (and a golmok short cut)', await until(page, (id) => /km · \d+% wide roads · \d+ sharp turns? · \d short cut/.test(document.querySelector(`[data-len="${id}"]`)?.textContent ?? ''), course, 90000), await page.evaluate((id) => document.querySelector(`[data-len="${id}"]`)?.textContent, course));
    await page.hover('[data-pin="yeouido"]');
    t.check('hovering a pin previews that course: its card, its shape and its numbers', await until(page, () => /Yeouido/.test(document.querySelector('[data-course-card] h2')?.textContent ?? '') && document.querySelector('[data-course-card]').classList.contains('is-preview'), null, 3000));
    await page.click(`[data-pin="${course}"]`);
    t.check('clicking a pin picks it', await until(page, (id) => window.seoul.race.courseId === id && document.querySelector(`[data-pin="${id}"]`).classList.contains('is-on'), course, 3000));
    t.check('…and the map flies to it, close enough to see its streets', await until(page, (id) => {
      const m = window.seoul.race.lobby.map;
      return m.focusId === id && !m.anim && m.view.s > 0.12;
    }, course, 5000), await page.evaluate(() => JSON.stringify(window.seoul.race.lobby.map.view)));
    const zoom0 = await page.evaluate(() => window.seoul.race.lobby.map.view.s);
    await page.click('.cm [data-cm-zoom="1"]');
    t.check('+ zooms the map in', await page.evaluate((s) => window.seoul.race.lobby.map.view.s > s * 1.5, zoom0));
    await page.waitForTimeout(500);
    await shot('course');
    await page.click('[data-course-card] [data-next]');
    t.check('the time and weather step: Random by default, every time and weather a card', await until(page, () => document.querySelector('[data-time="random"]')?.classList.contains('is-on') && document.querySelector('[data-weather="random"]').classList.contains('is-on') && Boolean(document.querySelector('[data-time="dusk"]')) && Boolean(document.querySelector('[data-weather="snow"]')), null, 3000));
    await page.click('[data-time="night"]');
    await page.click('[data-weather="rain"]');
    t.check('…previewed live on the stage behind: night, rain', await until(page, () => {
      const st = window.seoul.race.stage;
      return st.shown?.time === 'night' && st.shown?.weather === 'rain' && st.rain.visible && st.look.night > 0.8;
    }, null, 5000));
    await page.waitForTimeout(800);
    await shot('weather');
    t.check('the race menu has a Credits button', await page.evaluate(() => Boolean(document.querySelector('[data-race-credits]'))));
    await page.click('[data-race-solo]');
    t.check('the race lines up four riders and counts down', await until(page, () => window.seoul.race.racers.length === 4 && ['grid', 'racing'].includes(window.seoul.race.phase), null, 120000));
    t.check('you ride Pip the fox on a scooter; the bots are the others, girls and boys both', await page.evaluate(() => {
      const rs = window.seoul.race.racers;
      return rs.find((r) => r.me).char === 'fox' && new Set(rs.map((r) => r.char)).size === 4 && rs.some((r) => r.ch.she) && rs.some((r) => !r.ch.she) && rs.every((r) => r.view?.scooter && r.view.mesh.isSkinnedMesh);
    }));
    t.check('…on the R7 Comet you picked (its own model and handling); the bots on scooters of their own', await page.evaluate(() => {
      const rs = window.seoul.race.racers;
      const me = rs.find((r) => r.me);
      return me.scooter === 'racer' && me.view.scooter.model === 'racer' && me.spec.cruise > 21 && new Set(rs.filter((r) => r.bot).map((r) => r.scooter)).size >= 2 && rs.every((r) => r.view.scooter.model === r.scooter);
    }));
    t.check('the menus are gone and the city is back behind the race', await page.evaluate(() => !window.seoul.race.stageOn && !document.querySelector('.seoul').classList.contains('is-menu')));
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
    t.check('…and coming the other way down the course\'s own roads, ahead of you, in their own lane', await until(page, () => {
      const r = window.seoul.race;
      const on = (r.traffic?.vehicles ?? []).filter((v) => v.oncoming);
      if (on.length < 6) return false;
      // each going against the course where it is
      const c = r.course;
      return on.every((v) => {
        let bi = 0;
        let bd = Infinity;
        for (let i = 0; i < c.points.length; i += 2) {
          const d = Math.hypot(c.points[i][0] - v.box.x, c.points[i][1] - v.box.z);
          if (d < bd) [bd, bi] = [d, i];
        }
        const p = c.points[bi];
        const q = c.points[(bi + 1) % c.points.length];
        const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
        return bd > 40 || Math.cos(v.box.heading - hd) < 0;
      });
    }, null, 20000), await page.evaluate(() => (window.seoul.race.traffic?.vehicles ?? []).filter((v) => v.oncoming).length));
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
      // (just inside the golmok's mouth: a rider still on the course before it is free to ride on by)
      const i = p.enter + 1;
      const a = p.points[i];
      const b = p.points[i + 1];
      const hd = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
      Object.assign(me.s, { x: a[0], z: a[1], heading: hd, travel: hd, v: 8 });
      Object.assign(me, { sc: p.k, si: i, idx: p.sc.from, safe: 2, helmet: true, mode: 'ride', lost: 0 });
      r.autopilot = true;
      r._scStart = { dist: me.dist, took: me.shortcuts ?? 0, crashes: me.crashes };
      // (watched in the page, every few milliseconds — not by polling from here, which can come late:
      // the moment it leaves the golmok, where it is on the course and how far it has gone)
      r._scOut = null;
      clearInterval(r._scT);
      r._scT = setInterval(() => {
        if (me.sc == null && !r._scOut) {
          r._scOut = { idx: me.idx, dist: me.dist };
          clearInterval(r._scT);
        }
      }, 5);
      // the other riders out of its way for this: parked well back down the course
      r.racers.filter((x) => !x.me).forEach((x, k) => {
        const q = r.course.points[(p.sc.from - 60 - k * 4 + r.course.points.length) % r.course.points.length];
        Object.assign(x.s, { x: q[0], z: q[1], v: 0 });
        Object.assign(x, { idx: (p.sc.from - 60 - k * 4 + r.course.points.length) % r.course.points.length, sc: null });
      });
      return { from: p.sc.from, to: p.sc.to, span: p.sc.span, length: p.sc.length };
    });
    await until(page, () => Boolean(window.seoul.race._scOut), null, 90000);
    const out = await page.evaluate(() => window.seoul.race._scOut);
    t.check('the autopilot rides through a short cut and is back on the course after it', Boolean(out) && out.idx >= sc.to - 3 && out.idx < sc.to + 30, JSON.stringify({ out, to: sc.to }));
    t.check('…and its golmok counts as the course it cuts out (no lap lost or gained)', Boolean(out) && out.dist - (await page.evaluate(() => window.seoul.race._scStart.dist)) > sc.span * 0.8 && out.dist - (await page.evaluate(() => window.seoul.race._scStart.dist)) < sc.span + 120, `${out ? (out.dist - (await page.evaluate(() => window.seoul.race._scStart.dist))).toFixed(0) : '—'} m for a ${sc.span.toFixed(0)} m stretch`);
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
      return { junctions: o.junctions, steps: o.steps, gaps: o.gaps, overlaps: o.overlaps, sc: o.list.filter((x) => x.line !== 'course').map((x) => ({ steps: x.steps, gaps: x.gaps, maxStep: x.maxStep, maxRise: x.maxRise })) };
    });
    t.check('alley mouths: every junction found and sampled (steps, holes, overlaps listed)', j.junctions > 0, JSON.stringify(j));
    t.check('…the short cuts\' mouths: no hole, no step up a wheel would catch (over 15 cm, the way they are ridden)', j.sc.every((x) => x.gaps === 0 && x.maxRise <= 0.15), JSON.stringify(j.sc));
    // A branch: only the rider right ahead of you (by race distance) — thrown into their wheel, over
    // they go; the one right behind you, and one further ahead, untouched. Then from 1st: wasted.
    // (on the scooter first: not mid-tumble from the drift or a knock just now)
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = false;
      const me = r.me;
      const c = r.course;
      const n = c.points.length;
      const i = me.idx;
      const at = (k) => c.points[(i + k + n) % n];
      const hd = Math.atan2(-(at(1)[0] - at(0)[0]), -(at(1)[1] - at(0)[1]));
      Object.assign(me.s, { x: at(0)[0], z: at(0)[1], heading: hd, travel: hd, v: 0 });
      // (on the course itself, out of any short cut: put down out of one, a rider's distance would jump)
      me.sc = null;
      const bots = r.racers.filter((x) => x.bot);
      // (their race distances moved for the test, and put back after: `_shift`)
      r._shift = Object.fromEntries(bots.map((b) => [b.id, b.dist]));
      const [ahead, behind, ...rest] = bots;
      Object.assign(ahead.s, { x: at(3)[0], z: at(3)[1], heading: hd, travel: hd, v: 0 });
      Object.assign(ahead, { dist: me.dist + 18, idx: (i + 3) % n, sc: null });
      // right behind you, close on your back wheel
      Object.assign(behind.s, { x: at(-1)[0], z: at(-1)[1], heading: hd, travel: hd, v: 0 });
      Object.assign(behind, { dist: me.dist - 4, idx: (i - 1 + n) % n, sc: null });
      rest.forEach((b, k) => (b.dist = me.dist + 60 + k * 20));
      for (const b of bots) Object.assign(b, { safe: 0, branchSafe: 0, helmet: false, items: [null, null, null] });
      me.items = [null, 'branch', null];
      r._renderItems();
      r._roles = { ahead: ahead.id, behind: behind.id };
      r._before = Object.fromEntries(r.racers.map((x) => [x.id, x.crashKinds?.branch ?? 0]));
      r._fizzled = r.fizzled ?? 0;
    });
    t.check('a branch shows in its slot', await page.evaluate(() => Boolean(document.querySelector('.race__slot.is-full img[alt="Branch"]'))));
    t.check('…aimed at the rider right ahead (by race distance), not the one behind or further on', await page.evaluate(() => window.seoul.race._branchTarget(window.seoul.race.me)?.id === window.seoul.race._roles.ahead));
    const thrown = await page.evaluate(() => window.seoul.race.thrown ?? 0);
    await page.keyboard.press('Digit2');
    t.check('2 throws it: a wind-up, then the branch flies', await until(page, (n) => (window.seoul.race.thrown ?? 0) > n && window.seoul.race.me.items[1] === null, thrown, 3000));
    const hit = await until(page, () => {
      const r = window.seoul.race;
      const v = r.racers.find((x) => x.id === r._roles.ahead);
      return (v.crashKinds?.branch ?? 0) > r._before[v.id] && v.fallKind === 'wheel' && (r.caught ?? 0) > 0;
    }, null, 4000);
    await shot('branch-hit');
    t.check('…it homes in on their wheel: they go over the bars (CRACK!)', hit, await page.evaluate(() => JSON.stringify({ caught: window.seoul.race.caught, branches: window.seoul.race.branches?.length })));
    await page.waitForTimeout(600);
    t.check('…and nobody else falls to it: not the rider right behind you, not the ones further on', await page.evaluate(() => {
      const r = window.seoul.race;
      return r.racers.every((x) => x.id === r._roles.ahead || (x.crashKinds?.branch ?? 0) === (r._before[x.id] ?? 0)) && (r.branches?.length ?? 0) === 0;
    }), await page.evaluate(() => JSON.stringify(window.seoul.race.racers.map((x) => [x.id, x.crashKinds?.branch ?? 0]))));
    // From 1st: nobody ahead — thrown, wasted (a poof of leaves), nobody hurt; nothing left on the road.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      const bots = r.racers.filter((x) => x.bot);
      bots.forEach((b, k) => Object.assign(b, { dist: me.dist - 25 - k * 8, safe: 0, branchSafe: 0, helmet: false, items: [null, null, null] }));
      me.items = [null, 'branch', null];
      r._renderItems();
      r._before = Object.fromEntries(r.racers.map((x) => [x.id, x.crashKinds?.branch ?? 0]));
      r._wasted = r.wasted ?? 0;
      r._fizzled = r.fizzled ?? 0;
    });
    t.check('in 1st there is nobody to throw it at', await page.evaluate(() => window.seoul.race._branchTarget(window.seoul.race.me) === null));
    await page.keyboard.press('Digit2');
    t.check('…2 still throws it, and it is wasted: it flies on and bursts (POOF)', await until(page, () => {
      const r = window.seoul.race;
      return r.wasted > r._wasted && r.fizzled > r._fizzled && r.me.items[1] === null;
    }, null, 3000), await page.evaluate(() => JSON.stringify({ wasted: window.seoul.race.wasted, fizzled: window.seoul.race.fizzled })));
    await page.waitForTimeout(150);
    await shot('branch-wasted');
    await page.waitForTimeout(500);
    t.check('…nobody affected (the riders right behind you included), and no branch left in the road', await page.evaluate(() => {
      const r = window.seoul.race;
      return r.racers.every((x) => (x.crashKinds?.branch ?? 0) === (r._before[x.id] ?? 0)) && (r.branches?.length ?? 0) === 0;
    }));
    // (the bots' race distances put back as they were, plus what they have ridden since)
    await page.evaluate(() => {
      const r = window.seoul.race;
      for (const b of r.racers) if (r._shift?.[b.id] != null) b.dist = Math.max(b.dist, r._shift[b.id]);
    });
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
    await page.evaluate(() => (window.seoul.race.me.s.v = 19.4));
    await page.keyboard.press('Digit1');
    t.check('1 uses it: the energy drink — a gulp, the gauge filled up again', await until(page, () => window.seoul.race.me.s.stamina > 0.95 && window.seoul.race.me.items[0] === null && (window.seoul.race.gulps ?? 0) > 0, null, 3000));
    t.check('…and a boost at once, no F needed: faster than the motor\'s 70 km/h', await until(page, () => window.seoul.race.me.drinkT > 0 && window.seoul.race.me.s.v * 3.6 > 76, null, 2500), await page.evaluate(() => `${Math.round(window.seoul.race.me.s.v * 3.6)} km/h`));
    // The golden helmet: worn where everyone sees it, and knocked off when it saves you.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.me.items = ['helmet', null, null];
      r._renderItems();
    });
    await page.keyboard.press('Digit1');
    t.check('the golden helmet: on your rider\'s head (a cycling helmet: vents, strap, a peak), a badge on the HUD', await until(page, () => {
      const r = window.seoul.race;
      const v = r.me.view;
      const parts = new Set(v.helmet?.children.map((c) => c.name));
      return r.me.helmet && v.helmet?.visible && v.helmet.parent === v.bones.get('head') && ['shell', 'vent', 'strap', 'peak'].every((k) => parts.has(k)) && !document.querySelector('.race__helmet').hidden;
    }, null, 3000));
    t.check('…just the helmet: no shimmer sphere round the rider', await page.evaluate(() => {
      const v = window.seoul.race.me.view;
      let glow = 0;
      v.root.traverse((o) => o.visible && o.isMesh && o.material?.blending === 2 && o.geometry?.type === 'SphereGeometry' && glow++);
      return !v.shield && glow === 0;
    }));
    const saves = await page.evaluate(() => window.seoul.race.saves ?? 0);
    await page.evaluate(() => window.seoul.race._crash(window.seoul.race.me, 'car'));
    t.check('…a crash bounces off it: still riding, BLOCKED!, the helmet flies off', await until(page, (n) => {
      const r = window.seoul.race;
      return r.me.mode === 'ride' && !r.me.helmet && (r.saves ?? 0) > n && !r.me.view.helmet.visible && r.helmetDrops.live.length > 0 && /BLOCKED/.test(document.querySelector('.race__helmet').textContent);
    }, saves, 2000));
    // Marbles: poured behind you, they throw a rival who rides over them fast.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    const pour = await page.evaluate(() => {
      const r = window.seoul.race;
      const me = r.me;
      r.autopilot = true;
      me.items = ['marbles', null, null];
      me.s.v = 16;
      r._renderItems();
      r.slipLog = [];
      return r.poured ?? 0;
    });
    await page.keyboard.press('Digit1');
    t.check('marbles: 1 pours them out behind you, glass marbles rolling in the road', await until(page, (n) => {
      const r = window.seoul.race;
      const p = r.patches?.at(-1);
      return (r.poured ?? 0) > n && p && p.marbles.filter((m) => m.live).length > 30 && r.marbleField.mesh.count > 30;
    }, pour, 3000));
    await page.waitForTimeout(1200);
    const rival = await page.evaluate(() => {
      const r = window.seoul.race;
      const p = r.patches.at(-1);
      const c = r.course;
      const n = c.points.length;
      // the marble nearest the middle of the patch, and the course a little way back from it
      let bi = 0;
      let bd = Infinity;
      c.points.forEach((q, i) => {
        const d = Math.hypot(q[0] - p.x, q[1] - p.z);
        if (d < bd) [bd, bi] = [d, i];
      });
      const m = p.marbles.filter((q) => q.live).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      const a = c.points[(bi - 1 + n) % n];
      const b = c.points[bi];
      const hd = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
      const bot = r.racers.find((x) => x.bot && x.mode === 'ride');
      // 14 m short of that marble, riding straight at it at 65 km/h, not having seen them
      Object.assign(bot.s, { x: m.x + Math.sin(hd) * 14, z: m.z + Math.cos(hd) * 14, heading: hd, travel: hd, v: 18, lean: 0, steer: 0 });
      Object.assign(bot, { idx: bi, sc: null, helmet: false, safe: 0, slip: 0, onMarbles: 0, seenMarbles: { [p.mid]: false } });
      r._victim = bot.id;
      r._victimCrashes = bot.crashes;
      return bot.id;
    });
    t.check('…a rival who hits them fast slips and falls (WHOA!)', await until(page, (id) => {
      const r = window.seoul.race;
      const bot = r.racers.find((x) => x.id === id);
      return (r.slipLog ?? []).some((s) => s.id === id && s.fall) && bot.crashes > r._victimCrashes && bot.crashKinds?.marbles > 0;
    }, rival, 4000), await page.evaluate(() => JSON.stringify(window.seoul.race.slipLog)));
    t.check('…and the marbles stay in the street they were poured in', await page.evaluate(() => {
      const r = window.seoul.race;
      return r.patches.every((p) => p.marbles.every((m) => !m.live || !r.course.walls?.inside(m.x, m.z)));
    }));
    // No dark card round a puff of dust or a word burst (the "dark slab"): puffs and a WHOA! low over the road
    // in front of the camera, ambient occlusion on, and the frame read back — nothing near-black round them.
    const slab = await page.evaluate(async () => {
      const g = window.seoul;
      const r = g.race;
      const ao = g.gtao.enabled;
      g.gtao.enabled = true;
      r.autopilot = false;
      r.me.s.v = 0;
      const h = r.me.s.travel ?? r.me.s.heading;
      const spots = [];
      for (let k = 0; k < 4; k++) {
        const at = { x: r.me.s.x - Math.sin(h) * (2.5 + k) + Math.cos(h) * 1.2, y: r.me.y + 0.1, z: r.me.s.z - Math.cos(h) * (2.5 + k) - Math.sin(h) * 1.2 };
        r.fx.dust(at, 8);
        spots.push(at);
      }
      r.fx.pop('WHOA!', { x: r.me.s.x - Math.sin(h) * 7, y: r.me.y + 2, z: r.me.s.z - Math.cos(h) * 7 }, { color: '#7ad8ff', size: 1.2 });
      const canvas = g.renderer.domElement;
      const grab = await new Promise((ok) => {
        let n = 0;
        const after = r.afterDraw.bind(r);
        r.afterDraw = () => {
          after();
          if (++n < 8) return;
          r.afterDraw = after;
          const c = document.createElement('canvas');
          c.width = canvas.width;
          c.height = canvas.height;
          c.getContext('2d').drawImage(canvas, 0, 0);
          ok(c);
        };
      });
      g.gtao.enabled = ao;
      // the puffs' patch of the screen: round their middles, as far as they could have spread
      const cam = g.camera;
      const box = [Infinity, Infinity, -Infinity, -Infinity];
      for (const s of spots) {
        for (const [dx, dy, dz] of [[-1.5, 0, -1.5], [1.5, 1.8, 1.5]]) {
          const v = new cam.position.constructor(s.x + dx, s.y + dy, s.z + dz).project(cam);
          const x = ((v.x + 1) / 2) * grab.width;
          const y = ((1 - v.y) / 2) * grab.height;
          box[0] = Math.min(box[0], x);
          box[1] = Math.min(box[1], y);
          box[2] = Math.max(box[2], x);
          box[3] = Math.max(box[3], y);
        }
      }
      const x0 = Math.max(0, Math.floor(box[0]));
      const y0 = Math.max(0, Math.floor(box[1]));
      const w = Math.min(grab.width, Math.ceil(box[2])) - x0;
      const hh = Math.min(grab.height, Math.ceil(box[3])) - y0;
      if (w < 10 || hh < 10) return { dark: -1, w, h: hh };
      const px = grab.getContext('2d').getImageData(x0, y0, w, hh).data;
      let dark = 0;
      for (let i = 0; i < px.length; i += 4) if (Math.max(px[i], px[i + 1], px[i + 2]) < 18) dark++;
      return { dark: Math.round((dark / (px.length / 4)) * 1000) / 10, w, h: hh, sprites: r.fx.live.length };
    });
    t.check('no dark slab: dust puffs and a word burst over the road leave no dark card round them (AO on)', slab.dark >= 0 && slab.dark < 2, JSON.stringify(slab));
    // The rival panel: a rider close behind you slides in a picture of them; gone a moment after they go.
    await until(page, () => window.seoul.race.me.mode === 'ride', null, 5000);
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = true;
      const me = r.me;
      const bot = r.racers.find((x) => x.bot && x.mode === 'ride' && x.id !== r._victim) ?? r.racers.find((x) => x.bot);
      r._chaser = bot.id;
      // held a few metres behind you for a moment
      clearInterval(r._chaseT);
      r._chaseT = setInterval(() => {
        const h = me.s.travel ?? me.s.heading;
        Object.assign(bot.s, { x: me.s.x + Math.sin(h) * 6 + Math.cos(h) * 1.2, z: me.s.z + Math.cos(h) * 6 - Math.sin(h) * 1.2, heading: me.s.heading, travel: h, v: me.s.v });
        bot.mode = 'ride';
      }, 16);
    });
    t.check('the rival panel: a rider close behind you — a square slides in with a picture of them', await until(page, () => {
      const p = window.seoul.race.panel;
      return p.on && p.el.classList.contains('is-on') && p.el.classList.contains('has-pic') && p.snaps > 0;
    }, null, 4000));
    t.check('…a still, not a live view: no text in it, and at most about one picture a second', await page.evaluate(async () => {
      const p = window.seoul.race.panel;
      const n = p.snaps;
      await new Promise((ok) => setTimeout(ok, 1500));
      return p.el.textContent.trim() === '' && p.snaps - n <= 2;
    }));
    await page.evaluate(() => {
      const r = window.seoul.race;
      clearInterval(r._chaseT);
      // everyone else far back down the course
      const c = r.course;
      r.racers.filter((x) => !x.me).forEach((bot, k) => {
        const i = (r.me.idx - 60 - k * 5 + c.points.length) % c.points.length;
        Object.assign(bot.s, { x: c.points[i][0], z: c.points[i][1], v: 0 });
        Object.assign(bot, { idx: i, sc: null });
      });
    });
    t.check('…and slides away a moment after they have gone', await until(page, () => !window.seoul.race.panel.on && !window.seoul.race.panel.el.classList.contains('is-on'), null, 4000));
    await page.evaluate(() => (window.seoul.race.autopilot = false));
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
    // The Namsan Tower Downhill: point to point, from the tower's plaza to a finish line far below.
    await page.evaluate(() => {
      const r = window.seoul.race;
      Object.assign(r, { courseId: 'namsandown', time: 'day', weatherPick: 'clear', laps: 2 });
      r.startSolo();
    });
    t.check('the Namsan Tower Downhill: one run from a gantry under the tower to a finish gantry below — not a loop', await until(page, () => {
      const r = window.seoul.race;
      const c = r.course;
      if (!c || c.id !== 'namsandown' || !['grid', 'racing'].includes(r.phase)) return false;
      const a = c.points[c.startI];
      const b = c.points[c.finishI];
      const g = window.seoul;
      return c.open && r.laps === 1 && Boolean(r.gate) && Boolean(r.finishGate) && Math.hypot(a[0] - b[0], a[1] - b[1]) > 500 && g.groundAt(a[0], a[1]) - g.groundAt(b[0], b[1]) > 80 && Math.hypot(a[0] - 907, a[1] - 1673) < 400;
    }, null, 120000), await page.evaluate(() => {
      const c = window.seoul.race.course;
      return c ? JSON.stringify({ id: c.id, open: c.open, startI: c.startI, finishI: c.finishI, length: Math.round(c.length) }) : 'none';
    }));
    t.check('…down the park road between guard rails (solid: in the course\'s walls) and woods', await until(page, () => {
      const r = window.seoul.race;
      const c = r.course;
      const rails = [...(c.walls.tags ?? [])].filter((k) => k.includes('|rail|')).length;
      return (c.wild?.filter(Boolean).length ?? 0) > 100 && (r.wood?.count ?? 0) > 150 && rails > 10;
    }, null, 10000), await page.evaluate(() => JSON.stringify({ wild: window.seoul.race.course.wild?.filter(Boolean).length, trees: window.seoul.race.wood?.count, rails: [...(window.seoul.race.course.walls.tags ?? [])].filter((k) => k.includes('|rail|')).length })));
    await until(page, () => window.seoul.race.phase === 'racing', null, 15000);
    await shot('downhill');
    // ridden on to just short of the finish: over the line is the finish (not the start again)
    await page.evaluate(() => {
      const r = window.seoul.race;
      const c = r.course;
      const me = r.me;
      const i = c.finishI - 6;
      const p = c.points[i];
      const q = c.points[i + 1];
      const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      Object.assign(me.s, { x: p[0], z: p[1], heading: hd, travel: hd, v: 12 });
      Object.assign(me, { idx: i, dist: c.s[i] - c.s[c.startI], sc: null, safe: 5, mode: 'ride' });
      r.autopilot = true;
    });
    t.check('…and over the finish line below, the run is done: first time over it, no second lap', await until(page, () => {
      const r = window.seoul.race;
      return r.me.done != null && r.me.lapsDone === 1;
    }, null, 15000), await page.evaluate(() => JSON.stringify({ dist: Math.round(window.seoul.race.me.dist), L: Math.round(window.seoul.race.course.length), done: window.seoul.race.me.done })));
    t.check('…and past it, you roll to a stop in the run-out', await until(page, () => window.seoul.race.me.s.v < 1.5, null, 12000));
    await page.evaluate(() => window.seoul.race.quit());
    // The Jamsil Fairground: the rides moving beside the course.
    await page.evaluate(() => {
      const r = window.seoul.race;
      Object.assign(r, { courseId: 'jamsilpark', time: 'night', weatherPick: 'clear', laps: 1 });
      r.startSolo();
    });
    t.check('the Jamsil Fairground: a fun fair of our own beside the course — coaster, drop tower, big wheel, carousel, pirate ship', await until(page, () => {
      const f = window.seoul.race.fair;
      return window.seoul.race.course?.id === 'jamsilpark' && Boolean(f) && ['coaster', 'tower', 'wheel', 'carousel', 'ship'].every((k) => f.rides[k]);
    }, null, 120000));
    const f0 = await page.evaluate(() => {
      const r = window.seoul.race;
      const f = r.fair;
      // (looking at it from the road)
      const a = f.world(-30, 4, -10);
      const b = f.world(5, 12, 28);
      r.debugCam = { x: a.x, y: a.y, z: a.z, tx: b.x, ty: b.y, tz: b.z, fov: 60 };
      return { u: f.rides.coaster.u, wheel: f.rides.wheel.a, tower: f.rides.tower.car.position.y, carousel: f.rides.carousel.a, ship: f.rides.ship.t };
    });
    await page.waitForTimeout(1500);
    t.check('…the rides move: the train round the track, the wheel turning, the tower car, the carousel, the ship', await page.evaluate((f0) => {
      const f = window.seoul.race.fair;
      return f.rides.coaster.u !== f0.u && f.rides.wheel.a !== f0.wheel && f.rides.carousel.a !== f0.carousel && f.rides.ship.t !== f0.ship;
    }, f0));
    t.check('…lit up at night', await page.evaluate(() => window.seoul.race.fair.mats.bulb.emissiveIntensity > 1.5));
    await shot('fair-night');
    await page.evaluate(() => {
      window.seoul.race.debugCam = null;
      window.seoul.race.quit();
    });
    // A fog bank, the course's own music, no blinking box, the 30 s finish window and the podium.
    await page.evaluate(() => {
      const r = window.seoul.race;
      Object.assign(r, { courseId: 'jamsil', time: 'night', weatherPick: 'fog', laps: 1 });
      r.startSolo();
    });
    t.check('Fog picked: the race is in a fog bank — the world gone by about 20 m (scene fog far small), the sky into it', await until(page, () => {
      const g = window.seoul;
      return window.seoul.race.course?.id === 'jamsil' && g.weather.kind === 'fog' && g.scene.fog.far < 40 && g.scene.fog.near < 5 && g.sky.userData.u.uFog.value > 0.8;
    }, null, 120000), await page.evaluate(() => JSON.stringify({ kind: window.seoul.weather.kind, near: window.seoul.scene.fog.near, far: window.seoul.scene.fog.far })));
    t.check('…the riders and their scooters stay out of the fog (crisp), the street does not', await page.evaluate(() => {
      const r = window.seoul.race;
      let riders = 0;
      let fogged = 0;
      for (const x of r.racers) x.view.root.traverse((o) => o.material && (riders++, [].concat(o.material).some((m) => m.fog !== false) && fogged++));
      return riders > 20 && fogged === 0 && window.seoul.mist.group.visible !== undefined;
    }));
    t.check('the course\'s own track plays on the grid and in the race (Jamsil: Neon Boulevard)', await until(page, () => {
      const s = window.seoul.music.state;
      return s.area === 'kick-boulevard' && (s.track === 'kick-boulevard' || s.pending === 'kick-boulevard' || !window.seoul.music.audible);
    }, null, 15000), await page.evaluate(() => JSON.stringify(window.seoul.music.state)));
    t.check('…and the file is there (an Ogg, in the manifest)', await page.evaluate(async () => {
      const r = await fetch('audio/bgm/kick-boulevard.ogg');
      const m = await (await fetch('audio/bgm/manifest.json')).json();
      return r.ok && /ogg|audio/.test(r.headers.get('content-type') ?? '') && m.tracks.some((x) => x.id === 'kick-boulevard' && x.loopEnd > x.loopStart);
    }));
    await until(page, () => window.seoul.race.phase === 'racing', null, 20000);
    // Watched for a while, riding: no box blinking in the middle — no WRONG WAY flicker, the rival
    // panel never in without a picture, never in and out faster than its rest.
    await page.evaluate(() => {
      const r = window.seoul.race;
      r.autopilot = true;
      const w = (r._blink = { wrong: 0, msgs: 0, panelIns: [], empty: 0 });
      const P = r.panel.el;
      r._blinkObs = new MutationObserver(() => {
        if (!r.msgEl.hidden) w.msgs++;
        if (!r.msgEl.hidden && r.msgEl.textContent === 'WRONG WAY') w.wrong++;
      });
      r._blinkObs.observe(r.msgEl, { attributes: true, childList: true, characterData: true, subtree: true });
      let was = false;
      r._blinkObs2 = new MutationObserver(() => {
        const on = P.classList.contains('is-on');
        if (on && !P.classList.contains('has-pic')) w.empty++;
        if (on && !was) w.panelIns.push(performance.now());
        was = on;
      });
      r._blinkObs2.observe(P, { attributes: true, attributeFilter: ['class'] });
    });
    await page.waitForTimeout(12000);
    const blink = await page.evaluate(() => {
      const r = window.seoul.race;
      r._blinkObs.disconnect();
      r._blinkObs2.disconnect();
      const w = r._blink;
      const gaps = w.panelIns.slice(1).map((t, i) => t - w.panelIns[i]);
      return { wrong: w.wrong, empty: w.empty, ins: w.panelIns.length, minGap: gaps.length ? Math.min(...gaps) : null, wrongShows: r.wrongShows ?? 0 };
    });
    t.check('no blinking box: no WRONG WAY flicker riding the course, the rival panel never empty, never in and out within its rest', blink.wrong === 0 && blink.empty === 0 && (blink.minGap == null || blink.minGap > 2500), JSON.stringify(blink));
    // Call the police: the rider just ahead of you is pulled over — held to a stop for a second or two.
    const cop = await page.evaluate(async () => {
      const r = window.seoul.race;
      const me = r.me;
      const c = r.course;
      const n = c.points.length;
      const bots = r.racers.filter((x) => x.bot);
      bots.forEach((b, i) => {
        const j = (me.idx + (i === 0 ? 3 : n - 30 - i * 6)) % n;
        const p = c.points[j];
        const q = c.points[(j + 1) % n];
        const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
        Object.assign(b.s, { x: p[0], z: p[1], heading: hd, travel: hd, v: 14 });
        Object.assign(b, { idx: j, sc: null, dist: me.dist + (i === 0 ? 14 : -200 - i * 30), mode: 'ride', pulled: null, items: [null, null, null] });
      });
      const ahead = bots[0];
      me.items[0] = 'police';
      r.useSlot(0);
      const t0 = performance.now();
      let slow = 0;
      await new Promise((ok) => {
        const T = setInterval(() => {
          if (Math.abs(ahead.s.v) < 1.5) slow += 0.05;
          if (performance.now() - t0 > 3200) ok(clearInterval(T));
        }, 50);
      });
      return { slow: Math.round(slow * 10) / 10, stops: ahead.policeStops ?? 0, patrols: r.police.live.length, slots: me.items.join() };
    });
    t.check('Call the police: a patrol pulls the rider ahead of you over — stopped about 1–2 s, then let go', cop.stops >= 1 && cop.slow >= 1 && cop.slow <= 2.4 && !cop.slots.includes('police'), JSON.stringify(cop));
    // The finish: you home first; two bots close behind (they get their time), one far back (DNF).
    await page.evaluate(() => {
      const r = window.seoul.race;
      const L = r.course.length;
      const bots = r.racers.filter((x) => x.bot);
      r.me.dist = L - 90;
      [L - 160, L - 420, L - 3000].forEach((d, i) => (bots[i].dist = d));
      r._dnf = bots[2].id;
    });
    t.check('over the line', await until(page, () => window.seoul.race.me.done != null, null, 30000));
    await page.waitForTimeout(5500);
    t.check('the race waits for the others (not over 4 s after you, as it was): the seconds left small under your time, and Skip', await page.evaluate(() => {
      const r = window.seoul.race;
      const left = document.querySelector('[data-race-left]')?.textContent ?? '';
      return r.phase === 'racing' && /0:2\d/.test(left) && !document.querySelector('.race__skip').hidden && Math.abs(r.windowEnd - Math.min(...r.racers.map((x) => x.done ?? Infinity)) - 30) < 1e-6;
    }), await page.evaluate(() => document.querySelector('[data-race-left]')?.textContent));
    await shot('finish-countdown');
    t.check('…your scooter cools down to a stop, not left rolling into the traffic', await until(page, () => Math.abs(window.seoul.race.me.s.v) < 0.8, null, 8000));
    t.check('the window closes 30 s after the winner: the bots close behind got home in it; the one far back is out', await until(page, () => Boolean(window.seoul.race.podium), null, 40000), await page.evaluate(() => JSON.stringify(window.seoul.race.racers.map((x) => [x.id, x.done]))));
    const pod = await page.evaluate(() => {
      const r = window.seoul.race;
      const home = r._order().filter((x) => x.done != null).map((x) => x.id);
      return { ids: r.podiumIds, home, dnf: r._dnf, late: r.racers.filter((x) => x.done != null).map((x) => x.done - r.me.done), y0: r.podium.riders.map((p) => p.view.squash.position.y + p.view.squash.scale.y) };
    });
    t.check('the podium: only riders who finished in time, in order (1st, 2nd, 3rd), nobody who did not finish', pod.ids.length === 3 && pod.ids.join() === pod.home.slice(0, 3).join() && !pod.ids.includes(pod.dnf) && pod.late.some((d) => d > 4), JSON.stringify(pod));
    await page.waitForTimeout(700);
    t.check('…they celebrate (jumping, dancing, clapping: squash and stretch), confetti falls, the podium\'s music', await page.evaluate((y0) => {
      const r = window.seoul.race;
      const y1 = r.podium.riders.map((p) => p.view.squash.position.y + p.view.squash.scale.y);
      const moved = y1.filter((y, i) => Math.abs(y - y0[i]) > 0.01).length;
      const s = window.seoul.music.state;
      return moved >= 2 && r.podium.riders.map((p) => p.kind).join() === 'win,dance,clap' && r.podium.confetti.count > 100 && s.area === 'kick-podium';
    }, pod.y0), await page.evaluate(() => JSON.stringify(window.seoul.music.state)));
    await shot('podium');
    t.check('…on its own a few seconds: no results table yet', await page.evaluate(() => document.querySelector('.race__results').hidden));
    await page.keyboard.press('KeyX');
    t.check('any key: the results come up, smaller, over the dancing podium (DNF for the rider still out)', await until(page, () => {
      const el = document.querySelector('.race__results');
      return !el.hidden && el.classList.contains('is-podium') && /DNF/.test(el.textContent) && Boolean(window.seoul.race.podium) && Boolean(el.querySelector('[data-race-again]'));
    }, null, 3000));
    await shot('results-podium');
    await page.click('[data-race-again]');
    t.check('Race again: the podium is taken down, every rider back on the road, no results', await until(page, () => {
      const r = window.seoul.race;
      const g = window.seoul;
      return !r.podium && !g.scene.getObjectByName('podium') && ['grid', 'racing'].includes(r.phase) && r.racers.length === 4 && r.racers.every((x) => x.view.root.parent === g.scene) && document.querySelector('.race__results').hidden;
    }, null, 120000));
    await page.evaluate(() => window.seoul.race.quit());
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
