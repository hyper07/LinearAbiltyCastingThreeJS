import { boot, tally, until } from './lib.mjs';

/**
 * Arcademia's study worlds (src/arcademia/maps.js): the World Portal's
 * picker, travelling to the Great Tree, the Lagoon, the Desert and the Moon and back, walking their
 * rings, bridges, boardwalks, causeways and glass tubes, a lesson in each, their own lessons and
 * teachers, and the choice kept across a reload.
 */
export async function run(browser) {
  const t = tally();
  const { context, page, errors } = await boot(browser, 'worlds', { view: 'home' });
  await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const open = async () => {
    const card = '.home [data-game="official:arcademia"]';
    await until(page, (sel) => Boolean(document.querySelector(sel)), card, 30000);
    await page.click(card);
    await page.waitForSelector('.home [data-play]');
    await page.click('.home [data-play]');
    const ready = await until(page, () => window.arcademia && window.arcademia.mode === 'world' && window.arcademia.power, null, 240000);
    await page.waitForTimeout(800);
    await page.click('.arc-start__play');
    await page.waitForTimeout(800);
    const buddy = await page.$('.arc-side--buddy .arc-btn--primary');
    if (buddy) await buddy.click();
    await page.waitForTimeout(1200);
    return ready;
  };
  const travel = async () => {
    await page.click('.arc-nav__item--worlds');
    await until(page, () => Boolean(document.querySelector('.arc-modal--worlds')), null, 5000);
    await page.click('.arc-worlds__card:not(.is-here)');
    await page.waitForTimeout(2500);
  };
  try {
    t.check('arcademia opens on the mountain', (await open()) && (await page.evaluate(() => window.arcademia.map.id)) === 'mountain');
    t.check('the mountain has a World Portal on floor 1', await page.evaluate(() => window.arcademia.world.places.some((p) => p.kind === 'worlds' && p.floor === 1)));
    await travel();
    const tree = await page.evaluate(() => ({ id: window.arcademia.map.id, kind: window.arcademia.world.plan.kind, floor: window.arcademia.world.kidFloor, nav: document.querySelector('.arc-nav__name')?.textContent }));
    t.check('the picker takes you to the Great Tree, on floor 1', tree.id === 'tree' && tree.kind === 'tree' && tree.floor === 1, JSON.stringify(tree));
    const round = await page.evaluate(() => {
      const f = window.arcademia.world.plan.floors[0];
      return new Set(f.places.map((p) => Math.floor(((Math.atan2(p.x, p.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)))).size;
    });
    t.check('the buildings stand all the way round the tree', round === 4);
    await page.evaluate(() => {
      const w = window.arcademia.world;
      const b = w.buildings.find((x) => x.subject === 'history' && x.floor === 1);
      window.__arrived = false;
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy walks across the bridges to the far side', await until(page, () => window.__arrived, null, 40000));
    await page.evaluate(() => window.arcademia.root.focus());
    const y0 = await page.evaluate(() => window.arcademia.world.kidPos.y);
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyS');
    t.check('WASD keeps the buddy on its deck', await page.evaluate((y) => Math.abs(window.arcademia.world.kidPos.y - y) < 0.8, y0));
    // WASD at the edge of every deck (under the bridges of the ring above): never up onto another ring.
    let worst = 0;
    const rims = await page.evaluate(() => {
      const f = window.arcademia.world.plan.floors[0];
      const out = [];
      for (const p of Object.values(f.pads)) if (!p.landing) for (let a = 0; a < 6.28; a += 0.8) out.push([p.x + Math.sin(a) * (p.pr - 0.35), p.z + Math.cos(a) * (p.pr - 0.35)]);
      return out;
    });
    for (const [i, [x, z]] of rims.entries()) {
      await page.evaluate(([x, z]) => {
        const w = window.arcademia.world;
        w.kidPos.set(x, w.plan.height(x, z, 0), z);
        w.path = null;
      }, [x, z]);
      const key = ['KeyW', 'KeyA', 'KeyS', 'KeyD'][i % 4];
      await page.keyboard.down(key);
      await page.waitForTimeout(260);
      await page.keyboard.up(key);
      worst = Math.max(worst, await page.evaluate(() => Math.abs(window.arcademia.world.kidPos.y)));
    }
    t.check('WASD at every deck edge stays on ring 1 (never jumps up to a bridge)', worst < 2, `highest ${worst.toFixed(1)} m`);
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.teleport(1);
      w.select(w.places.find((p) => p.kind === 'worlds'), true);
    });
    t.check('walking into the tree\'s World Portal opens the picker', await until(page, () => Boolean(document.querySelector('.arc-modal--worlds')), null, 40000));
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.arcademia.enter('math', 1));
    t.check('a lesson opens from the tree, taught by Nutmeg the squirrel', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'squirrel', null, 20000));
    t.check('the tree teaches its own 42 forest lessons', await page.evaluate(() => window.arcademia.lessons.length === 42 && window.arcademia.lessons.every((l) => l.realm === 'forest')));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.reload();
    await open();
    t.check('the chosen world is kept after a reload', (await page.evaluate(() => window.arcademia.map.id)) === 'tree');
    // The Lagoon: its own islands, teachers and lessons.
    await page.evaluate(() => window.arcademia.switchMap('lagoon'));
    await page.waitForTimeout(2500);
    const sea = await page.evaluate(() => {
      const g = window.arcademia;
      return { map: g.map.id, realm: g.realm, kind: g.world.plan.kind, places: g.world.places.filter((p) => p.floor === 1).length, lessons: g.lessons.length, allSea: g.lessons.every((l) => l.realm === 'sea') };
    });
    t.check('the Lagoon opens: sea realm, island 1 with its villas', sea.map === 'lagoon' && sea.realm === 'sea' && sea.kind === 'lagoon' && sea.places >= 9, JSON.stringify(sea));
    t.check('the Lagoon teaches its own 42 sea lessons', sea.lessons === 42 && sea.allSea, JSON.stringify(sea));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      const b = w.buildings.find((x) => x.subject === 'physics' && x.floor === 1);
      window.__arrived = false;
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy walks the boardwalk to the Reef Lab', await until(page, () => window.__arrived, null, 40000));
    await page.evaluate(() => window.arcademia.enter('history', 1));
    t.check('a sea lesson opens, taught by Grandma Inka', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'octopus', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    // Stars are kept per realm: a sea star opens nothing on the mountain.
    const separate = await page.evaluate(() => {
      const g = window.arcademia;
      const stars = Object.fromEntries(g.lessons.filter((l) => l.floor === 1).map((l) => [l.id, 3]));
      const saved = g.progress.stars;
      g.progress.stars = { ...stars };
      const seaOpen = [...g.floorsOpen()];
      g.progress.stars = saved;
      return { seaOpen };
    });
    t.check('sea stars open the next island', separate.seaOpen.includes(2), JSON.stringify(separate));
    // The Desert of the Pyramids: oasis towns along the Nile, causeways between them.
    await page.click('.arc-nav__item--worlds');
    await until(page, () => Boolean(document.querySelector('.arc-modal--worlds')), null, 5000);
    const cards = await page.$$eval('.arc-worlds__card', (els) => els.map((e) => e.textContent));
    t.check('the picker lists five worlds, the Desert and the Moon among them', cards.filter((c) => !/🔮/.test(c)).length === 5 && cards.some((c) => c.includes('🐪')) && cards.some((c) => c.includes('🌙')), JSON.stringify(cards));
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.arcademia.switchMap('desert'));
    await page.waitForTimeout(3000);
    const sand = await page.evaluate(() => {
      const g = window.arcademia, w = g.world;
      const mini = document.querySelector('.arc-mini svg');
      return {
        map: g.map.id, realm: g.realm, kind: w.plan.kind, places: w.places.filter((p) => p.floor === 1).length,
        portal: w.places.some((p) => p.kind === 'worlds' && p.floor === 1),
        floor: w.kidFloor, oases: mini?.querySelectorAll('[data-floor]').length, nile: Boolean(mini?.querySelector('path[stroke="#3fb7c4"]')),
        // The arrival view looks north, over the first oasis to the Sphinx and the pyramids.
        north: w.camera.position.z > w.controls.target.z + 40
      };
    });
    t.check('the Desert opens on oasis 1 with its World Portal', sand.map === 'desert' && sand.kind === 'desert' && sand.floor === 1 && sand.places >= 9 && sand.portal, JSON.stringify(sand));
    t.check('the minimap shows the Nile and seven oases; the first view looks north to the pyramids', sand.oases === 7 && sand.nile && sand.north, JSON.stringify(sand));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(new Set());
      w.teleport(1);
      const b = w.buildings.find((x) => x.subject === 'history' && x.floor === 2);
      window.__arrived = false;
      window.__onCauseway = false;
      const st = w.plan.stairs[0];
      const watch = setInterval(() => {
        if (w.plan.floorAt(w.kidPos.x, w.kidPos.z, w.kidPos.y) === 0 && w.kidPos.x > st.pts[0][0] + 5 && w.kidPos.x < st.pts[3][0] - 5) window.__onCauseway = true;
        if (window.__arrived) clearInterval(watch);
      }, 100);
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy walks the avenue of sphinxes to the next oasis', await until(page, () => window.__arrived && window.__onCauseway, null, 60000));
    const there = await page.evaluate(() => ({ floor: window.arcademia.world.kidFloor, y: window.arcademia.world.kidPos.y }));
    t.check('and arrives at oasis 2, on the stone', there.floor === 2 && Math.abs(there.y - 1) < 0.8, JSON.stringify(there));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(window.arcademia.lockedSet());
      w.teleport(1);
    });
    // The Desert teaches its own lessons, with its own teachers, stories and puzzle bosses.
    const own = await page.evaluate(() => {
      const g = window.arcademia;
      return {
        lessons: g.lessons.length, allDesert: g.lessons.every((l) => l.realm === 'desert'),
        story: g.worlds[1].story, boss: g.worlds[1].boss.species, help: document.querySelector('.arc-help')?.textContent ?? ''
      };
    });
    t.check('the Desert teaches its own 42 desert lessons', own.lessons === 42 && own.allDesert, JSON.stringify(own));
    t.check('the first oasis has its own story and puzzle boss, and O names all the oases', /Sphinx Gate/.test(own.story) && own.boss === 'lion' && /oases/.test(own.help) && !/mountain/.test(own.help), JSON.stringify(own));
    await page.evaluate(() => window.arcademia.enter('math', 1));
    t.check('a Pyramid School opens in the Desert, taught by Miss Lotus the hippo', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'hippo', null, 20000));
    const listed = await page.evaluate(() => [...document.querySelectorAll('.arc-lesson, .arc-quests, body')].map((e) => e.textContent).join(' '));
    t.check('its lesson list shows desert lessons', /Counting Camels|Dates at the Oasis/.test(listed));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('history', 1));
    t.check('the Temple School is taught by Uncle Reed the ibis', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'ibis', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('physics', 1));
    t.check('the Sun Observatory is run by Dr. Sandy the sand cat', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'sandcat', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    t.check('and back out to the oasis', await page.evaluate(() => window.arcademia.mode === 'world' && window.arcademia.map.id === 'desert'));
    // The Moon: moonbases in craters, glass tubes between them, its own lessons and teachers.
    await page.evaluate(() => window.arcademia.switchMap('moon'));
    await page.waitForTimeout(3500);
    const moon = await page.evaluate(() => {
      const g = window.arcademia, w = g.world;
      const mini = document.querySelector('.arc-mini svg');
      return {
        map: g.map.id, realm: g.realm, kind: w.plan.kind, places: w.places.filter((p) => p.floor === 1).length,
        portal: w.places.some((p) => p.kind === 'worlds' && p.floor === 1), floor: w.kidFloor,
        craters: mini?.querySelectorAll('[data-floor]').length, tubes: mini?.querySelectorAll('line[stroke="#5fb7e0"]').length,
        // Space: stars by day, no clouds; the first view looks north over the first crater to the rocket and the Earth.
        stars: w.sky.userData.stars.material.opacity === 1 && !w.clouds.visible, north: w.camera.position.z > w.controls.target.z + 40,
        names: [...document.querySelectorAll('.arc-pill__name')].map((e) => e.textContent).filter((s) => /Dome School|Moon Museum|Star Observatory/.test(s)).length,
        float: w.float, lessons: g.lessons.length
      };
    });
    t.check('the Moon opens on moonbase 1 with its World Portal', moon.map === 'moon' && moon.realm === 'moon' && moon.kind === 'moon' && moon.floor === 1 && moon.places >= 9 && moon.portal, JSON.stringify(moon));
    t.check('the minimap shows seven craters and the tubes; stars in a black sky; the first view looks north', moon.craters === 7 && moon.tubes === 6 && moon.stars && moon.north, JSON.stringify(moon));
    t.check('its schools have their moon names, gravity is low, and it teaches its own 42 lessons', moon.names >= 3 && moon.float > 0 && moon.lessons === 42, JSON.stringify(moon));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(new Set());
      w.teleport(1);
      const b = w.buildings.find((x) => x.subject === 'physics' && x.floor === 2);
      window.__arrived = false;
      window.__inTube = false;
      const st = w.plan.stairs[0];
      const watch = setInterval(() => {
        const L = st.segs[1];
        if (w.plan.floorAt(w.kidPos.x, w.kidPos.z, w.kidPos.y) === 0 && Math.hypot(w.kidPos.x - (L.ax + L.bx) / 2, w.kidPos.z - (L.az + L.bz) / 2) < L.len / 2 + 1) window.__inTube = true;
        if (window.__arrived) clearInterval(watch);
      }, 100);
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy walks the glass tube to the next moonbase', await until(page, () => window.__arrived && window.__inTube, null, 60000));
    const base2 = await page.evaluate(() => ({ floor: window.arcademia.world.kidFloor, y: window.arcademia.world.kidPos.y }));
    t.check('and arrives at moonbase 2, on the deck', base2.floor === 2 && Math.abs(base2.y - 1) < 0.8, JSON.stringify(base2));
    // Low gravity: a hop floats up higher and longer than on the mountain, and lands in a puff of dust.
    const hop = await page.evaluate(async () => {
      const w = window.arcademia.world;
      w.kid.hop();
      let top = 0;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 90));
        top = Math.max(top, w.kid.group.children[0].position.y);
      }
      await new Promise((r) => setTimeout(r, 500));
      const puffs = w.scenery.group.children.filter((c) => c.userData && c.userData.balls && c.visible).length;
      return { top, puffs };
    });
    t.check('a moon hop floats high and kicks up dust', hop.top > 0.6 && hop.puffs > 0, JSON.stringify(hop));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(window.arcademia.lockedSet());
      w.teleport(1);
    });
    // The Moon teaches its own lessons, with its own teachers, stories and puzzle bosses.
    const lunar = await page.evaluate(() => {
      const g = window.arcademia;
      return {
        lessons: g.lessons.length, allMoon: g.lessons.every((l) => l.realm === 'moon'),
        story: g.worlds[1].story, boss: g.worlds[1].boss.species, help: document.querySelector('.arc-help')?.textContent ?? ''
      };
    });
    t.check('the Moon teaches its own 42 moon lessons', lunar.lessons === 42 && lunar.allMoon, JSON.stringify(lunar));
    t.check('the first moonbase has its own story and puzzle boss, and O names all the moonbases', /Landing Crater/.test(lunar.story) && lunar.boss === 'tardigrade' && /moonbases/.test(lunar.help) && !/mountain/.test(lunar.help), JSON.stringify(lunar));
    await page.evaluate(() => window.arcademia.enter('math', 1));
    t.check('the Dome School is taught by Miss Mochi the moon rabbit', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'moonrabbit', null, 20000));
    const moonListed = await page.evaluate(() => [...document.querySelectorAll('.arc-lesson, .arc-quests, body')].map((e) => e.textContent).join(' '));
    t.check('its lesson list shows moon lessons', /Counting Craters|Rocket Countdown/.test(moonListed));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('history', 1));
    t.check('the Moon Museum is run by Captain Ginger the red panda', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'redpanda', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('physics', 1));
    t.check('the Star Observatory is run by Dr. Comet the koala', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'koala', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.setNight(true));
    await page.waitForTimeout(1800);
    t.check('Earth-light: night on the Moon, back out at the moonbase', await page.evaluate(() => window.arcademia.mode === 'world' && window.arcademia.map.id === 'moon' && window.arcademia.world.night > 0.9));
    await page.evaluate(() => window.arcademia.setNight(false));
    await page.evaluate(() => window.arcademia.switchMap('mountain'));
    await page.waitForTimeout(2000);
    t.check('and back to the mountain', (await page.evaluate(() => window.arcademia.map.id)) === 'mountain');
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
