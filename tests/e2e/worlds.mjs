import { boot, tally, until } from './lib.mjs';

/**
 * Arcademia's study worlds (src/arcademia/maps.js): the World Portal's
 * picker, travelling to the Great Tree, the Lagoon, the Desert, the Moon, Mars and the Sky Castle and back,
 * walking their rings, bridges, boardwalks, causeways, glass tubes, red-rock ramps and castle streets, a lesson in each,
 * their own lessons and teachers, space suits on the space maps, and the choice kept across a reload.
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
      const b = w.buildings.find((x) => x.slot === 'history' && x.floor === 1);
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
      const b = w.buildings.find((x) => x.slot === 'physics' && x.floor === 1);
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
    t.check('the picker lists seven worlds, the Desert, the Moon, Mars and the Sky Castle among them', cards.filter((c) => !/🔮/.test(c)).length === 7 && cards.some((c) => c.includes('🐪')) && cards.some((c) => c.includes('🌙')) && cards.some((c) => c.includes('🔴')) && cards.some((c) => c.includes('🏰') && c.includes('Sky Castle')), JSON.stringify(cards));
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
      const b = w.buildings.find((x) => x.slot === 'history' && x.floor === 2);
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
    t.check('on the Moon the buddy, the townsfolk and the bosses wear space suits', await page.evaluate(() => {
      const w = window.arcademia.world;
      return w.kid.suit === 'moon' && w.npcs.every((n) => n.fig.suit === 'moon') && w.bosses.every((b) => b.fig.suit === 'moon');
    }));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(new Set());
      w.teleport(1);
      const b = w.buildings.find((x) => x.slot === 'physics' && x.floor === 2);
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
    // Mars: Olympus Mons, a compact base on a terrace spiralling round a red-rock volcano, wide ramps between the floors.
    await page.evaluate(() => window.arcademia.switchMap('mars'));
    await page.waitForTimeout(3500);
    const mars = await page.evaluate(() => {
      const g = window.arcademia, w = g.world;
      const mini = document.querySelector('.arc-mini svg');
      const f = w.plan.floors[0];
      return {
        map: g.map.id, realm: g.realm, kind: w.plan.kind, places: w.places.filter((p) => p.floor === 1).length,
        portal: w.places.some((p) => p.kind === 'worlds' && p.floor === 1), floor: w.kidFloor,
        rings: mini?.querySelectorAll('[data-floor]').length,
        quadrants: new Set(w.plan.floors.flatMap((g) => g.places).map((p) => Math.floor(((Math.atan2(p.x, p.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)))).size,
        schoolIcons: mini?.querySelectorAll('[data-place="math"], [data-place="history"], [data-place="physics"]').length, me: Boolean(mini?.querySelector('.arc-mini__me')),
        names: [...document.querySelectorAll('.arc-pill__name')].map((e) => e.textContent).filter((s) => /Red Dome School|Mars Museum|Weather Lab/.test(s)).length,
        float: w.float, clouds: w.clouds.visible, moon: w.sky.userData.moon.material.opacity,
        sun: Boolean(w.scenery.group.children.find((c) => c.userData.sprites)),
        suits: w.kid.suit === 'mars' && w.npcs.every((n) => n.fig.suit === 'mars') && w.bosses.every((b) => b.fig.suit === 'mars'),
        townsfolk: [...new Set(w.npcs.map((n) => n.species))]
      };
    });
    t.check('Mars opens on floor 1 of the volcano with its World Portal, its schools named', mars.map === 'mars' && mars.realm === 'mars' && mars.kind === 'mars' && mars.floor === 1 && mars.places >= 9 && mars.portal && mars.names >= 3, JSON.stringify(mars));
    t.check('the floors go all the way round the mountain, and the minimap draws all seven, the schools and you', mars.quadrants === 4 && mars.rings === 7 && mars.schoolIcons >= 3 && mars.me, JSON.stringify(mars));
    // Tap a school on the minimap: the buddy walks there.
    await page.evaluate(() => {
      window.arcademia.world.teleport(1);
      document.querySelector('.arc-mini [data-place="physics"][data-floor-of="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    t.check('tapping a school on the minimap walks the buddy there', await until(page, () => {
      const w = window.arcademia.world, e = w.places.find((p) => p.floor === 1 && p.kind === 'physics');
      return !w.path && Math.hypot(w.kidPos.x - e.at.x, w.kidPos.z - e.at.z) < 1.5;
    }, null, 20000));
    // WASD walks round the floor; the camera turns with the buddy, stays outside the mountain, its view never blocked.
    await page.evaluate(() => {
      window.arcademia.world.teleport(1);
      window.arcademia.root.focus();
    });
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => Math.atan2(window.arcademia.world.kidPos.x, window.arcademia.world.kidPos.z));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(400);
    const walkRound = await page.evaluate((a0) => {
      const w = window.arcademia.world, c = w.camera.position, tg = w.controls.target;
      return { turned: Math.atan2(w.kidPos.x, w.kidPos.z) - a0, floor: w.kidFloor, outside: Math.hypot(c.x, c.z) > Math.hypot(w.kidPos.x, w.kidPos.z) + 3, lift: w.plan.camLift(c.x, c.y, c.z, tg.x, tg.y, tg.z) };
    }, before);
    t.check('D walks the buddy round floor 1 with the camera outside and the view clear', walkRound.turned > 0.05 && walkRound.floor === 1 && walkRound.outside && walkRound.lift < 0.01, JSON.stringify(walkRound));
    t.check('Mars has a Sun, no Earth moon, no clouds, a little low gravity, and its own townsfolk in space suits', mars.sun && mars.moon === 0 && !mars.clouds && mars.float > 0 && mars.float < 1 && mars.suits && mars.townsfolk.includes('roverbot'), JSON.stringify(mars));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(new Set());
      w.teleport(1);
      const b = w.buildings.find((x) => x.slot === 'math' && x.floor === 2);
      window.__arrived = false;
      window.__onStairs = false;
      const watch = setInterval(() => {
        const hit = w.plan.locate(w.kidPos.x, w.kidPos.z, w.kidPos.y);
        if (hit?.stair) window.__onStairs = true;
        if (window.__arrived) clearInterval(watch);
      }, 100);
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy climbs the ramp to floor 2', await until(page, () => window.__arrived && window.__onStairs, null, 60000));
    const ring2 = await page.evaluate(() => ({ floor: window.arcademia.world.kidFloor, y: window.arcademia.world.kidPos.y, storey: window.arcademia.world.plan.floorH }));
    t.check('and arrives on floor 2, a storey up', ring2.floor === 2 && Math.abs(ring2.y - ring2.storey) < 0.8, JSON.stringify(ring2));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(window.arcademia.lockedSet());
      w.teleport(1);
    });
    // Mars teaches its own lessons, with its own teachers, stories and puzzle bosses.
    const red = await page.evaluate(() => {
      const g = window.arcademia;
      return {
        lessons: g.lessons.length, allMars: g.lessons.every((l) => l.realm === 'mars'),
        story: g.worlds[1].story, boss: g.worlds[1].boss.species, bosses: [...new Set(g.world.bosses.map((b) => b.fig.species))]
      };
    });
    t.check('Mars teaches its own 42 Mars lessons', red.lessons === 42 && red.allMars, JSON.stringify(red));
    t.check('the first terrace has its own story and puzzle boss', /Landing Plains/.test(red.story) && red.boss === 'capybara', JSON.stringify(red));
    await page.evaluate(() => window.arcademia.enter('math', 1));
    t.check('the Red Dome School is taught by Miss Ruby the otter', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'otter', null, 20000));
    t.check('in the lesson room on Mars the buddy wears its space suit too', await page.evaluate(() => window.arcademia.lesson.suit === 'mars' && window.arcademia.lesson.buddy.suit === 'mars'));
    const marsListed = await page.evaluate(() => [...document.querySelectorAll('.arc-lesson, .arc-quests, body')].map((e) => e.textContent).join(' '));
    t.check('its lesson list shows Mars lessons', /Counting Rover Wheels|Collecting Rock Samples/.test(marsListed));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('history', 1));
    t.check('the Mars Museum is run by Professor Woolly the alpaca', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'alpaca', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('physics', 1));
    t.check('the Weather Lab is run by Dr. Digby the star-nosed mole', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'mole', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.setNight(true));
    await page.waitForTimeout(1800);
    t.check('night falls on Mars, back out on the volcano', await page.evaluate(() => window.arcademia.mode === 'world' && window.arcademia.map.id === 'mars' && window.arcademia.world.night > 0.9));
    await page.evaluate(() => window.arcademia.setNight(false));
    // The Sky Castle: a white castle town winding up a floating island, medieval townsfolk, its own lessons and teachers.
    await page.evaluate(() => window.arcademia.switchMap('castle'));
    await page.waitForTimeout(3500);
    const sky = await page.evaluate(() => {
      const g = window.arcademia, w = g.world;
      const mini = document.querySelector('.arc-mini svg');
      const cam = w.camera.position, tg = w.controls.target;
      return {
        map: g.map.id, realm: g.realm, kind: w.plan.kind, places: w.places.filter((p) => p.floor === 1).length,
        portal: w.places.some((p) => p.kind === 'worlds' && p.floor === 1), floor: w.kidFloor,
        rings: mini?.querySelectorAll('[data-floor]').length, falls: mini?.innerHTML.includes('💧'),
        schoolIcons: mini?.querySelectorAll('[data-place="math"], [data-place="history"], [data-place="physics"]').length, me: Boolean(mini?.querySelector('.arc-mini__me')),
        names: [...document.querySelectorAll('.arc-pill__name')].map((e) => e.textContent).filter((s) => /Clock Tower School|Library Hall|Inventor's Workshop/.test(s)).length,
        // Arriving, the whole island from beside it: far out, a little below the town, looking at its middle.
        far: cam.distanceTo(tg) > 200 && cam.y < 10 && tg.y < 0,
        quadrants: new Set(w.plan.floors.flatMap((f) => f.places).map((p) => Math.floor(((Math.atan2(p.x, p.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)))).size,
        suits: w.kid.suit, float: w.float, sharedClouds: w.clouds.visible,
        townsfolk: [...new Set(w.npcs.map((n) => n.species))]
      };
    });
    t.check('the Sky Castle opens on floor 1 with its World Portal and its schools named', sky.map === 'castle' && sky.realm === 'castle' && sky.kind === 'castle' && sky.floor === 1 && sky.places >= 9 && sky.portal && sky.names >= 3, JSON.stringify(sky));
    t.check('arriving, the whole floating island is in view; the streets go all the way round; the minimap draws all seven, the waterfalls, the schools and you', sky.far && sky.quadrants === 4 && sky.rings === 7 && sky.falls && sky.schoolIcons >= 3 && sky.me, JSON.stringify(sky));
    t.check('no space suits, ordinary gravity, its own big clouds, and its own medieval townsfolk', sky.suits === null && !sky.float && !sky.sharedClouds && ['badger', 'goat', 'goose', 'pony', 'ferret', 'lamb', 'magpie'].every((k) => sky.townsfolk.includes(k)), JSON.stringify(sky));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.teleport(1);
      const b = w.buildings.find((x) => x.slot === 'history' && x.floor === 1);
      window.__arrived = false;
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy walks to the Library Hall', await until(page, () => window.__arrived, null, 30000));
    // Tap a school on the minimap: the buddy walks there.
    await page.evaluate(() => {
      window.arcademia.world.teleport(1);
      document.querySelector('.arc-mini [data-place="physics"][data-floor-of="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    t.check('tapping the Inventor\'s Workshop on the minimap walks the buddy there', await until(page, () => {
      const w = window.arcademia.world, e = w.places.find((p) => p.floor === 1 && p.kind === 'physics');
      return !w.path && Math.hypot(w.kidPos.x - e.at.x, w.kidPos.z - e.at.z) < 1.5;
    }, null, 20000));
    // WASD walks round the street; the camera turns with the buddy, stays outside, its view never blocked by a wall.
    await page.evaluate(() => {
      window.arcademia.world.teleport(1);
      window.arcademia.world.home();
      window.arcademia.root.focus();
    });
    await page.waitForTimeout(1500);
    const skyBefore = await page.evaluate(() => Math.atan2(window.arcademia.world.kidPos.x, window.arcademia.world.kidPos.z));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(400);
    const skyWalk = await page.evaluate((a0) => {
      const w = window.arcademia.world, c = w.camera.position, tg = w.controls.target;
      return { turned: Math.atan2(w.kidPos.x, w.kidPos.z) - a0, floor: w.kidFloor, outside: Math.hypot(c.x, c.z) > Math.hypot(w.kidPos.x, w.kidPos.z) + 3, lift: w.plan.camLift(c.x, c.y, c.z, tg.x, tg.y, tg.z) };
    }, skyBefore);
    t.check('D walks the buddy round street 1 with the camera outside and the view clear', skyWalk.turned > 0.05 && skyWalk.floor === 1 && skyWalk.outside && skyWalk.lift < 0.01, JSON.stringify(skyWalk));
    // Up the ramp, through the raised portcullis, to street 2.
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(new Set());
      w.teleport(1);
      const b = w.buildings.find((x) => x.slot === 'math' && x.floor === 2);
      window.__arrived = false;
      window.__onStairs = false;
      const watch = setInterval(() => {
        const hit = w.plan.locate(w.kidPos.x, w.kidPos.z, w.kidPos.y);
        if (hit?.stair) window.__onStairs = true;
        if (window.__arrived) clearInterval(watch);
      }, 100);
      w.goTo(b.at, () => (window.__arrived = true));
    });
    t.check('the buddy climbs the carpeted ramp to street 2', await until(page, () => window.__arrived && window.__onStairs, null, 60000));
    const street2 = await page.evaluate(() => ({ floor: window.arcademia.world.kidFloor, y: window.arcademia.world.kidPos.y, storey: window.arcademia.world.plan.floorH }));
    t.check('and arrives on street 2, a storey up', street2.floor === 2 && Math.abs(street2.y - street2.storey) < 0.8, JSON.stringify(street2));
    await page.evaluate(() => {
      const w = window.arcademia.world;
      w.setLocked(window.arcademia.lockedSet());
      w.teleport(1);
    });
    // The Sky Castle teaches its own lessons, with its own teachers, stories and puzzle bosses.
    const royal = await page.evaluate(() => {
      const g = window.arcademia;
      return {
        lessons: g.lessons.length, allCastle: g.lessons.every((l) => l.realm === 'castle'),
        story: g.worlds[1].story, boss: g.worlds[1].boss.species, bosses: [...new Set(g.world.bosses.map((b) => b.fig.species))]
      };
    });
    t.check('the Sky Castle teaches its own 42 castle lessons', royal.lessons === 42 && royal.allCastle, JSON.stringify(royal));
    t.check('the first street has its own story and puzzle boss', /Gatehouse Market/.test(royal.story) && royal.boss === 'goose' && royal.bosses.includes('goose'), JSON.stringify(royal));
    await page.evaluate(() => window.arcademia.enter('math', 1));
    t.check('the Clock Tower School is taught by Miss Biscuit the corgi', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'corgi', null, 20000));
    t.check('its way back says Castle streets', await page.evaluate(() => [...document.querySelectorAll('.arc-chip--btn, .arc-btn')].some((b) => /Castle streets/.test(b.textContent))));
    t.check('no space suits in the castle\'s lesson rooms', await page.evaluate(() => window.arcademia.lesson.suit === null && window.arcademia.lesson.buddy.suit === null));
    const castleListed = await page.evaluate(() => [...document.querySelectorAll('.arc-lesson, .arc-quests, body')].map((e) => e.textContent).join(' '));
    t.check('its lesson list shows castle lessons', /Counting Towers and Flags|Buns at the Market/.test(castleListed));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('history', 1));
    t.check('the Library Hall is kept by Professor Hartley the stag', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'stag', null, 20000));
    t.check('its lesson list shows the castle\'s history', await page.evaluate(() => /Market Day in the Castle Town|Who Built the Castles\?/.test(document.body.textContent)));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.enter('physics', 1));
    t.check('the Inventor\'s Workshop is run by Dr. Sprocket the beaver', await until(page, () => window.arcademia.mode === 'lesson' && window.arcademia.lesson?.teacher?.species === 'beaver', null, 20000));
    await page.evaluate(() => window.arcademia.leaveLesson());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.arcademia.setNight(true));
    await page.waitForTimeout(1800);
    t.check('night falls over the Sky Castle, back out on its streets', await page.evaluate(() => window.arcademia.mode === 'world' && window.arcademia.map.id === 'castle' && window.arcademia.world.night > 0.9));
    await page.evaluate(() => window.arcademia.setNight(false));
    await page.evaluate(() => window.arcademia.switchMap('mountain'));
    await page.waitForTimeout(2000);
    t.check('and back to the mountain, out of the space suits', await page.evaluate(() => window.arcademia.map.id === 'mountain' && window.arcademia.world.kid.suit === null));
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
