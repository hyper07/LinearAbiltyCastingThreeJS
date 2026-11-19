import { boot, tally, until } from './lib.mjs';

/**
 * Zones and hubs (shared/zones, docs/zones.md) in the three open worlds:
 * every door walked through and back, the full map's World view, every hub
 * service used with the game's own key, fast travel by waystone, a monster
 * that chases you stops at a hub's edge, a fall wakes you at the last hub
 * rested at, memory comes back after round trips, and the console stays clean.
 *
 *   npm run test:e2e -- zones          (SHOTS=<dir> saves the screenshots)
 */
const GAMES = [
  {
    id: 'gloamreach',
    key: 'KeyF',
    doors: [
      { from: 'brindlewick', at: [0, -112, Math.PI], to: 'gloamwood', back: [0, -150, 0] },
      { from: 'brindlewick', at: [114, -45, Math.PI / 2], to: 'cinder-rift', back: [151, -46, -Math.PI / 2] }
    ],
    services: { stats: '.gr-win--char', merchant: '.gr-win--shop' },
    chase: { zone: 'brindlewick', kind: 'wolf' },
    fall: { home: 'brindlewick', away: 'gloamwood' },
    leak: { a: 'brindlewick', b: 'gloamwood', door: 0 }
  },
  {
    id: 'wyldhunt',
    key: 'KeyE',
    doors: [{ from: 'base-camp', at: [-6, 308, Math.PI], to: 'mistfall-gorge', back: [-6, 293, 0] }],
    soon: { zone: 'base-camp', at: [4, 386, 0] },
    services: {},
    chase: { zone: 'mistfall-gorge', kind: 'gnarlhorn' },
    fall: { home: 'base-camp', away: 'mistfall-gorge' },
    leak: { a: 'base-camp', b: 'mistfall-gorge', door: 0 }
  },
  {
    id: 'kithvale',
    key: 'KeyE',
    doors: [{ from: 'lanternrest', at: [0, -92, 0], to: 'vale', back: [0, -79, Math.PI] }],
    services: {},
    leak: { a: 'lanternrest', b: 'vale', door: 0 }
  }
];

export async function run(browser, { only = null } = {}) {
  const t = tally();
  const shots = process.env.SHOTS ?? null;
  const shot = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
  for (const G of GAMES) {
    if (only && !only.includes(G.id)) continue;
    const { context, page, errors } = await boot(browser, `zones-${G.id}`, { view: 'home' });
    await page.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    const n = G.id;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const zoneIs = (id, ms = 40000) => until(page, ([g, z]) => window[g].zone?.id === z && window[g].mode === 'play' && window[g].zoneReady, [n, id], ms);
    try {
      await page.click(`.home [data-game="official:${n}"]`);
      await page.waitForSelector('.home [data-play]');
      await page.click('.home [data-play]');
      const ready = await until(page, (g) => window[g]?.ready, n, 240000);
      t.check(`${n}: opens in its first zone`, ready);
      if (!ready) continue;
      await page.waitForTimeout(800);
      await ev((g) => window[g].begin(), n);
      await page.waitForTimeout(1500);
      const first = await ev((g) => window[g].zone.id, n);
      t.check(`${n}: starts in a hub, the Safe label showing`, await until(page, () => document.querySelector('[data-hub-safe]') && !document.querySelector('[data-hub-safe]').hidden, null, 5000));
      await shot(page, `${n}-zone-${first}`);

      const go = async ([x, z, yaw]) => {
        await ev(([g, x2, z2, y]) => {
          const w = window[g];
          if (w.mount) w.mount.brain.x = 9999;
          w.teleport(x2, z2, y);
        }, [n, x, z, yaw]);
        await page.waitForTimeout(250);
      };
      /** Walk forward from a spot until a trip starts; resolves once the other zone shows. */
      const walkThrough = async (from, to, { midShot = null } = {}) => {
        await go(from);
        await page.keyboard.down('KeyW');
        const started = await until(page, (g) => window[g].mode === 'travel', n, 15000);
        await page.keyboard.up('KeyW');
        if (midShot) {
          await page.waitForTimeout(330);
          await shot(page, midShot);
        }
        return started && (await zoneIs(to));
      };

      // Every door and back.
      for (const [i, d] of G.doors.entries()) {
        if ((await ev((g) => window[g].zone.id, n)) !== d.from) await ev(([g, z]) => window[g].zones.travel(z, 'default'), [n, d.from]).then(() => zoneIs(d.from));
        const there = await walkThrough(d.at, d.to, { midShot: i === 0 ? `${n}-portal-mid` : null });
        t.check(`${n}: through ${d.from} → ${d.to}`, there);
        if (!there) continue;
        const trip = await ev((g) => window[g].zones.trips.at(-1), n);
        t.check(`${n}: the trip took ${trip.ms} ms (under 3 s)`, trip.ms < 3000, JSON.stringify(trip));
        await page.waitForTimeout(1200);
        await shot(page, `${n}-zone-${d.to}`);
        // Walk into its hub (its waystone wakes), then back to the door.
        const reached = await ev(async (g) => {
          const w = window[g];
          const h = w.zone.hub;
          w.teleport(h.x, h.z, 0);
          await new Promise((r) => setTimeout(r, 600));
          return w.zoneSave.hubs.includes(h.id);
        }, n);
        t.check(`${n}: ${d.to}'s hub reached, its waystone awake`, reached);
        t.check(`${n}: back ${d.to} → ${d.from}`, await walkThrough(d.back, d.from));
      }
      // A "coming soon" door says so and stays shut.
      if (G.soon) {
        await go(G.soon.at);
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(1600);
        await page.keyboard.up('KeyW');
        t.check(`${n}: the coming-soon trail stays shut`, await ev(([g, z]) => window[g].zone.id === z && window[g].mode === 'play', [n, G.soon.zone]));
      }

      // Every hub service, with the game's own key, in the first zone's hub.
      if ((await ev((g) => window[g].zone.id, n)) !== first) await ev(([g, z]) => window[g].zones.travel(z, 'default'), [n, first]).then(() => zoneIs(first));
      const services = await ev((g) => Object.entries(window[g].zone.hub.services).map(([id, s]) => ({ id, x: s.x, z: s.z })), n);
      const hub = await ev((g) => ({ x: window[g].zone.hub.x, z: window[g].zone.hub.z, r: window[g].zone.hub.r, id: window[g].zone.hub.id }), n);
      for (const s of services) {
        const dx = hub.x - s.x;
        const dz = hub.z - s.z;
        const d = Math.hypot(dx, dz) || 1;
        await go([s.x + (dx / d) * 1.6, s.z + (dz / d) * 1.6, Math.atan2(-dx, -dz)]);
        if (s.id === 'rest') await ev((g) => {
          const c = window[g].combat;
          if (c) c.hp = 1;
        }, n);
        await page.evaluate((g) => window[g].root.focus(), n);
        await page.keyboard.press(G.key);
        let ok = false;
        const sel = G.services[s.id] ?? (s.id === 'map' ? '[data-world-map][data-map-view="world"]' : s.id === 'rest' ? null : n === 'kithvale' && s.id === 'stats' ? null : `[data-hub-panel="${s.id === 'merchant' ? 'merchant' : s.id}"]`);
        if (sel) ok = await until(page, (q) => Boolean(document.querySelector(q)), sel, 4000);
        else if (s.id === 'rest') ok = await until(page, ([g, h]) => window[g].zoneSave.lastHub === h && (!window[g].combat || window[g].combat.hp > 1), [n, hub.id], 4000);
        else ok = await until(page, (g) => Boolean(window[g].panel), n, 4000);
        t.check(`${n}: hub service "${s.id}" with ${G.key.slice(3)}`, ok);
        if (s.id === 'map' && ok) await shot(page, `${n}-world-map`);
        if (s.id === 'stash' && ok) {
          const before = await ev((g) => window[g].zoneSave.stash.filter(Boolean).length, n);
          const slot = await page.$('[data-hub-panel="stash"] [data-slot^="bag:"][title]');
          if (slot) await slot.click();
          t.check(`${n}: the stash takes something from the bag`, await until(page, ([g, b]) => window[g].zoneSave.stash.filter(Boolean).length > b, [n, before], 3000));
          await shot(page, `${n}-stash`);
          const back = await page.$('[data-hub-panel="stash"] [data-slot^="stash:"][title]');
          if (back) await back.click();
        }
        if (s.id === 'merchant' && n === 'gloamreach' && ok) {
          await page.click('[data-refill]');
          await page.waitForTimeout(300);
        }
        if (s.id === 'waystone' && ok) await shot(page, `${n}-waystone`);
        if (s.id === 'info' && ok) t.check(`${n}: the guide shows found-so-far counters`, Boolean(await page.$('[data-count]')));
        if (ok && s.id !== 'rest') {
          await page.keyboard.press('Escape');
          await until(page, (g) => window[g].mode === 'play' && !window[g].panel, n, 3000);
          await page.evaluate((g) => window[g].panels?.closeAll?.(), n);
        }
      }
      await go([hub.x, hub.z + 2, 0]);
      await shot(page, `${n}-hub`);

      // Fast travel by waystone, to the other zone's hub (reached on the walk above).
      const target = await ev((g) => window[g].zones.waystones().find((r) => r.reached && !r.here && window[g].zones.zone(r.zone)), n);
      const stone = services.find((s) => s.id === 'waystone');
      if (target && stone) {
        const sd = Math.hypot(hub.x - stone.x, hub.z - stone.z) || 1;
        await go([stone.x + ((hub.x - stone.x) / sd) * 1.6, stone.z + ((hub.z - stone.z) / sd) * 1.6, 0]);
        await page.keyboard.press(G.key);
        await until(page, () => Boolean(document.querySelector('[data-hub-panel="waystone"]')), null, 4000);
        await page.click(`[data-waystone="${target.hub}"] button`);
        t.check(`${n}: the waystone carries you to ${target.name}`, (await zoneIs(target.zone)) && (await ev((g) => window[g].isSafe(), n)));
      } else t.check(`${n}: a second waystone was reached`, false, JSON.stringify(target));

      // A monster that chases you stops at the hub's edge.
      if (G.chase) {
        await ev(([g, z]) => window[g].zone.id === z || window[g].zones.travel(z, 'default'), [n, G.chase.zone]);
        await zoneIs(G.chase.zone);
        // Lure it: stand just outside the ring with it close, then walk in; it follows to the edge and no further.
        await ev(async ([g, kind]) => {
          const w = window[g];
          const h = w.zone.hub;
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          if (kind === 'gnarlhorn') {
            const dir = { x: 0.2, z: -1 };
            const l = Math.hypot(dir.x, dir.z);
            dir.x /= l;
            dir.z /= l;
            w.teleport(h.x + dir.x * (h.r + 6), h.z + dir.z * (h.r + 6), Math.atan2(-dir.x, -dir.z));
            w.placeMonster(h.x + dir.x * (h.r + 20), h.z + dir.z * (h.r + 20), Math.atan2(-dir.x, -dir.z), 'engage');
            w._chaser = w.monster.brain;
          } else {
            const m = w.monsters.list.find((q) => q.type === kind && q.alive);
            const d = Math.hypot(m.homeX - h.x, m.homeZ - h.z);
            const dir = { x: (m.homeX - h.x) / d, z: (m.homeZ - h.z) / d };
            m.homeX = m.x = h.x + dir.x * (h.r + 14);
            m.homeZ = m.z = h.z + dir.z * (h.r + 14);
            w.teleport(h.x + dir.x * (h.r + 5), h.z + dir.z * (h.r + 5), Math.atan2(-dir.x, -dir.z));
            w._chaser = m;
          }
          await sleep(1300);
        }, [n, G.chase.kind]);
        await page.evaluate((g) => window[g].root.focus(), n);
        await page.keyboard.down('KeyW');
        let min = Infinity;
        let r = 0;
        for (let i = 0; i < 30; i++) {
          const s2 = await ev((g) => {
            const w = window[g];
            const h = w.zone.hub;
            const m = w._chaser;
            return { d: Math.hypot(m.x - h.x, m.z - h.z), r: h.r };
          }, n);
          min = Math.min(min, s2.d);
          r = s2.r;
          if (i === 16) {
            await page.keyboard.up('KeyW');
            // Turn round to face it across the ring, the camera over your shoulder.
            await ev((g) => {
              const w = window[g];
              const m = w._chaser;
              const p = w.hero?.pos ?? w.hunter.pos;
              const face = Math.atan2(m.x - p.x, m.z - p.z);
              w.teleport(p.x, p.z, face, { pitch: 0.14, dist: g === 'wyldhunt' ? 9 : 6.5 });
            }, n);
          }
          if (i === 20) await shot(page, `${n}-monster-at-hub-edge`);
          await page.waitForTimeout(100);
        }
        await page.keyboard.up('KeyW');
        t.check(`${n}: the ${G.chase.kind} follows you to the hub's edge and stops (closest ${min.toFixed(1)} m, ring ${r} m)`, min >= r - 0.5 && min <= r + 12);
        t.check(`${n}: no blow lands inside the hub`, await ev((g) => {
          const w = window[g];
          const c = w.combat;
          const hp = c.hp;
          if (g === 'gloamreach') c.hitHero(w.monsters.list[0], w.monsters.list[0].def.attacks[0], {});
          else c.hit('bite', { damage: 30 });
          return c.hp === hp;
        }, n));
      }

      // A fall wakes you at the last hub you rested at (another zone here).
      if (G.fall) {
        await ev(([g, z]) => window[g].zones.travel(z, 'default'), [n, G.fall.away]);
        await zoneIs(G.fall.away);
        await ev((g) => {
          const w = window[g];
          const h = w.zone.hub;
          w.teleport(h.x + h.r + 20, h.z, 0);
          if (g === 'gloamreach') w.combat._die();
          else w.combat._faint();
        }, n);
        t.check(`${n}: falling wakes you at ${G.fall.home}'s hub`, (await zoneIs(G.fall.home, 30000)) && (await until(page, (g) => window[g].isSafe() && !window[g].combat.dead, n, 8000)));
      }

      // Memory comes back after round trips (geometries and textures on the GPU).
      if (G.leak) {
        const { a, b } = G.leak;
        await ev(([g, z]) => window[g].zone.id === z || window[g].zones.travel(z, 'default'), [n, a]);
        await zoneIs(a);
        await page.waitForTimeout(1500);
        const mem = () => ev((g) => ({ ...window[g].renderer.info.memory, programs: window[g].renderer.info.programs?.length ?? 0 }), n);
        const m0 = await mem();
        for (let i = 0; i < 3; i++) {
          await ev(([g, z]) => window[g].zones.travel(z, 'default'), [n, b]);
          await zoneIs(b);
          await ev(([g, z]) => window[g].zones.travel(z, 'default'), [n, a]);
          await zoneIs(a);
        }
        await page.waitForTimeout(1500);
        const m1 = await mem();
        t.check(`${n}: after 3 round trips GPU memory is back (${m0.geometries}→${m1.geometries} geometries, ${m0.textures}→${m1.textures} textures)`, m1.geometries <= m0.geometries * 1.1 + 4 && m1.textures <= m0.textures * 1.1 + 2, JSON.stringify({ m0, m1 }));
      }
      t.check(`${n}: the console stays clean`, errors.length === 0, errors.slice(0, 5).join(' | '));
    } catch (err) {
      t.check(`${n}: ran to the end`, false, err.message);
    } finally {
      await page.evaluate((g) => window[g]?.close?.(), n).catch(() => {});
      await context.close();
    }
  }
  return t;
}
