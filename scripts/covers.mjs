/**
 * Cover photos for the home page's official games: each game opened in a
 * browser, brought to a good moment, its menus and HUD hidden (the games
 * whose screen is the game keep it), and photographed — 800×450 JPEG into
 * public/covers/<name>.jpg, which the cards show (src/ui/gameCover.js
 * PHOTO_COVERS), the drawn cover staying as the fallback.
 *
 *   BASE_URL=http://127.0.0.1:5173/ node scripts/covers.mjs            # all
 *   BASE_URL=http://127.0.0.1:5173/ node scripts/covers.mjs breachline # some
 *
 * Needs the game running (npm run dev, or the built server) and the asset
 * library fetched.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, boot, until } from '../tests/e2e/lib.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'covers');
const wait = (page, ms) => page.waitForTimeout(ms);

/** Hide everything in a game's screen but its picture: the one canvas that fills the screen. */
async function bare(page, root) {
  await page.evaluate((sel) => {
    const style = document.createElement('style');
    style.textContent = `${sel} * { visibility: hidden !important; } ${sel} canvas.cover-keep { visibility: visible !important; } .toast, .pop-toast, [class*="confetti"] { display: none !important; }`;
    document.head.append(style);
    // The biggest canvas that is not an overlay of names and bars.
    const all = [...document.querySelectorAll(`${sel} canvas`)].filter((c) => !c.matches('[data-overlay], [data-labels], .bs__overlay'));
    const area = (c) => c.getBoundingClientRect().width * c.getBoundingClientRect().height;
    all.sort((a, b) => area(b) - area(a))[0]?.classList.add('cover-keep');
  }, root);
}

async function open(page, card) {
  await page.click(`.home [data-game="${card}"]`);
  await page.waitForSelector('.home [data-play]');
  await page.click('.home [data-play]');
}

async function account(page, name) {
  const body = JSON.stringify({ name, password: 'cover-shots-only-1' });
  const made = await page.evaluate((b) => fetch('./api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b }).then((r) => r.status), body);
  if (made !== 200) await page.evaluate((b) => fetch('./api/account/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b }), body);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.app && window.app.phase === 'menu', null, { timeout: 120000 });
  await page.waitForSelector('.home [data-game]', { timeout: 30000 });
}

/** Grave Purge (3D or 2D): a fight out in the land, the bots' armies at a crypt. */
async function purge(page, card, flat) {
  await open(page, card);
  await until(page, () => window.gravePurge?.view && document.querySelector('.gp [data-solo]'), null, 30000);
  if (flat) await until(page, () => window.gravePurge.view.sprites, null, 40000);
  await page.click('.gp [data-solo]');
  await until(page, () => window.gravePurge.state, null, 15000);
  await page.evaluate(() => (window.gravePurge.game.speed = 3));
  await wait(page, 60000);
  await page.evaluate(() => {
    const gp = window.gravePurge;
    gp.game.speed = 1;
    // Soldiers in a fight, out in the land — the one nearest a building of the dead — a little towards that building.
    const s = gp.state;
    const fighting = s.ents.filter((e) => e.k === 'troop' && Math.hypot(e.x, e.z) > 55 && s.ents.some((f) => f.k === 'foe' && Math.hypot(f.x - e.x, f.z - e.z) < 14));
    const pool = fighting.length ? fighting : s.ents.filter((e) => e.k === 'troop' && Math.hypot(e.x, e.z) > 55);
    let best = null;
    for (const t of pool) {
      for (const b of gp.game.buildings) {
        if (!b.alive || b.type === 'barrow') continue;
        const d = Math.hypot(b.x - t.x, b.z - t.z);
        if (!best || d < best.d) best = { b, t, d };
      }
    }
    const t = best?.t ?? pool[0] ?? s.ents.find((e) => e.k === 'troop');
    const pull = best && best.d < 24 ? 0.4 : 0;
    const b = best?.b;
    gp.view.zoom = gp.flat ? 18 : 22;
    // Keep the camera on that soldier (it moves) until the photograph.
    const id = t.i;
    setInterval(() => {
      const now = gp.state.ents.find((e) => e.i === id) ?? t;
      gp.view.target.set(now.x + ((b?.x ?? now.x) - now.x) * pull, 0, now.z + ((b?.z ?? now.z) - now.z) * pull + (gp.flat ? 0 : 3));
    }, 50);
  });
  await bare(page, '.gp');
  await wait(page, flat ? 2500 : 6000);
}

const SHOTS = {
  breachline: async (page) => {
    await open(page, 'official:breachline');
    await until(page, () => Boolean(document.querySelector('.bl [data-solo]')), null, 20000);
    await page.click('.bl [data-map="oldtown"]').catch(() => {});
    await page.click('.bl [data-solo]');
    await until(page, () => window.breachline?.match || window.breachline?.state, null, 20000);
    await page.evaluate(() => {
      const b = window.breachline;
      if (b) b.locked = true;
    });
    await wait(page, 9000);
    await bare(page, '.bl');
    await wait(page, 600);
  },
  lanebreak: async (page) => {
    await open(page, 'official:lanebreak');
    await until(page, () => document.querySelectorAll('.lb [data-champ]').length === 8, null, 20000);
    await page.click('.lb [data-champ="kiro"]');
    await page.click('.lb [data-solo]');
    await until(page, () => window.lanebreak?.state?.champs?.length === 10, null, 20000);
    await wait(page, 50000);
    // Where the two sides' minions meet, the camera off the champion and on the fight.
    await page.evaluate(() => {
      const lb = window.lanebreak;
      lb.lock = false;
      const ents = lb.state.ents;
      let best = null;
      for (const a of ents) {
        if (a.k !== 'minion' && a.k !== 'champ') continue;
        const near = ents.filter((b) => (b.k === 'minion' || b.k === 'champ') && Math.hypot(b.x - a.x, b.z - a.z) < 9);
        const sides = new Set(near.map((b) => b.tm));
        if (sides.size > 1 && (!best || near.length > best.n)) best = { x: a.x, z: a.z, n: near.length };
      }
      if (best) setInterval(() => lb.view.lookAt(best.x, best.z + 4), 50);
    });
    await bare(page, '.lb');
    await wait(page, 1500);
  },
  bastion: (page) => purge(page, 'official:bastion', false),
  gravepurge2d: (page) => purge(page, 'official:gravepurge2d', true),
  seoul: async (page) => {
    await open(page, 'official:seoul');
    await until(page, () => window.seoul?.ready && !document.querySelector('.race__menu')?.hidden, null, 90000);
    await page.click('.race__menu [data-race-solo]');
    await until(page, () => window.seoul.race?.phase === 'racing', null, 30000);
    await page.keyboard.down('KeyW');
    await wait(page, 6000);
    await page.keyboard.up('KeyW');
    await wait(page, 400);
  },
  shardfront: async (page) => {
    await open(page, 'official:shardfront');
    await until(page, () => document.querySelectorAll('.rts [data-faction]').length === 3, null, 20000);
    await page.click('.rts [data-start]');
    await until(page, () => window.rts?.sim?.buildingsOf(0).length, null, 20000);
    // The workers out at the nearest crystals, the base training more.
    await page.evaluate(() => {
      const sim = window.rts.sim;
      const core = sim.buildingsOf(0)[0];
      const node = sim.nodes().sort((a, b) => Math.hypot(a.x - core.x, a.z - core.z) - Math.hypot(b.x - core.x, b.z - core.z))[0];
      sim.command(0, { type: 'gather', ids: sim.unitsOf(0).map((u) => u.id), node: node.id });
      sim.players[0].shards += 400;
      const worker = sim.unitsOf(0)[0].type;
      for (let k = 0; k < 4; k++) sim.command(0, { type: 'train', building: core.id, unit: worker });
    });
    await wait(page, 25000);
    // The whole land shown (no fog), the camera down by the base.
    await page.evaluate(() => {
      const r = window.rts;
      // For the photograph only: the fog of war lifted.
      r.view._updateFow = function () {
        this.fowData.fill(255);
        this.fow.texture.value.needsUpdate = true;
      };
      const base = r.sim.buildingsOf(0)[0];
      const node = r.sim.nodes().sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z))[0];
      // Between the base and its crystals, the workers going to and fro.
      r.view.zoom = 26;
      r.view.lookAt((base.x + node.x) / 2, (base.z + node.z) / 2 + 2);
    });
    await wait(page, 1500);
    await bare(page, '.rts');
    await wait(page, 400);
  },
  'stock-market': async (page) => {
    await account(page, 'CoverShots');
    await open(page, 'official:stock-market');
    // A new run, or the one this account already has going.
    await until(page, () => Boolean(document.querySelector('.mk [data-start]') || document.querySelector('.mk [data-symbol]')), null, 20000);
    if (await page.$('.mk [data-start]')) await page.click('.mk [data-start]');
    await until(page, () => Boolean(document.querySelector('.mk [data-symbol="AAPL"]')), null, 20000);
    // A few weeks on, so the chart has a story to tell.
    for (let k = 0; k < 3; k++) {
      await page.evaluate(() => [...document.querySelectorAll('.mk button')].find((b) => b.textContent.trim() === '+20')?.click());
      await wait(page, 1500);
    }
    await page.evaluate(() => (document.querySelector('.mk [data-symbol="NVDA"]') ?? document.querySelector('.mk [data-symbol="AAPL"]')).click());
    await until(page, () => Boolean(document.querySelector('.mk .mk__chart svg')), null, 15000);
    await wait(page, 1200);
  },
  'work-life': async (page) => {
    await account(page, 'CoverShots');
    await open(page, 'official:work-life');
    await until(page, () => document.querySelectorAll('.wk [data-company]').length >= 20, null, 30000);
    // The Life tab: the scenes of your days.
    await page.evaluate(() => document.querySelector('.wk [data-tab="life"]')?.click());
    await wait(page, 2500);
  }
};

const only = process.argv.slice(2);
const browser = await launch();
for (const [name, stage] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(name)) continue;
  const { page, context } = await boot(browser, name, { view: 'home' });
  try {
    await stage(page);
    // Only the game's picture, if it does not fill the window (a panel beside or below it).
    const clip = await page.evaluate(() => {
      const c = document.querySelector('canvas.cover-keep');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return r.width < innerWidth - 2 || r.height < innerHeight - 2 ? { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(innerWidth, r.width), height: Math.min(innerHeight, r.height) } : null;
    });
    const png = await page.screenshot({ type: 'png', ...(clip ? { clip } : {}) });
    // Cropped to 16:9 round the middle and down to 800×450, in the page itself (a canvas), as a JPEG.
    const jpeg = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 450;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      const k = Math.min(img.width / 16, img.height / 9);
      const w = k * 16;
      const h = k * 9;
      g.drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, 800, 450);
      return c.toDataURL('image/jpeg', 0.84).split(',')[1];
    }, png.toString('base64'));
    writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(jpeg, 'base64'));
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
}
await browser.close();
