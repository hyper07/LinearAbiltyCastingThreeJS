import { boot, tally, until } from './lib.mjs';

/**
 * Arcademia's study worlds (src/arcademia/maps.js): the World Portal's
 * picker, travelling to the Great Tree and the Lagoon and back, walking their
 * rings, bridges and boardwalks, a lesson in each, their own lessons and
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
    await page.evaluate(() => window.arcademia.switchMap('mountain'));
    await page.waitForTimeout(2000);
    t.check('and back to the mountain', (await page.evaluate(() => window.arcademia.map.id)) === 'mountain');
    t.check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await context.close();
  }
  return t;
}
