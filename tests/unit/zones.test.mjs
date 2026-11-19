import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineZone, validateZones, sizeOf, inBounds, portalAt, portalNear, portalOpen, inHub, fenceOut, serviceNear, spawnPoint, zoneGraph, SERVICES } from '../../src/shared/zones/zone.js';
import { newZoneSave, mark, has, enterZone, reachHub, restAt, parseZoneSave, serializeZoneSave, counters, ZONE_SAVE_VERSION } from '../../src/shared/zones/state.js';
import { monsterRule, keepOut, blowAt, waystones, canTravel, arrivalAt, respawnPoint, hubById } from '../../src/shared/zones/hub.js';
import { move, sortSlots, moveAll, used } from '../../src/shared/zones/stash.js';
import { areaScale } from '../../src/shared/zones/keep.js';
import * as GR from '../../src/gloamreach/zones.js';
import * as WH from '../../src/wyldhunt/zones.js';
import * as KV from '../../src/kithvale/zones.js';
import { EXTENT as GR_EXTENT } from '../../src/gloamreach/map.js';
import { EXTENT as WH_EXTENT, NODES, HERDS, NESTS, MONSTER_AREAS, DEN } from '../../src/wyldhunt/map.js';
import { EXTENT as KV_EXTENT, HABITATS, FORAGE, CACHES, BOULDERS } from '../../src/kithvale/map.js';
import { spawnList } from '../../src/gloamreach/bestiary.js';
import { CHESTS } from '../../src/gloamreach/chests.js';
import { newSave as grNewSave, profileFor } from '../../src/gloamreach/save.js';
import { newState as kvNewState } from '../../src/kithvale/rules.js';

/* ------------------------------------------------------------------ a toy world, from data */

const TOY = [
  {
    id: 'meadow',
    name: 'The Meadow',
    bounds: { x0: 0, x1: 100, z0: 0, z1: 100 },
    spawns: { default: { x: 50, z: 50, yaw: 0 }, east: { x: 90, z: 50, yaw: Math.PI } },
    portals: [
      { id: 'to-wood', name: 'Wood gate', x: 98, z: 50, shape: { type: 'box', hw: 1, hd: 3 }, to: 'wood', arrive: 'west' },
      { id: 'to-sea', name: 'The cliff path', x: 50, z: 2, to: 'sea', soon: true }
    ],
    pois: [{ id: 'oak', name: 'Old oak', x: 30, z: 30 }],
    hub: { id: 'camp', name: 'Meadow camp', x: 50, z: 50, r: 10, services: { waystone: { x: 52, z: 50 }, rest: { x: 48, z: 55 }, stash: { x: 50, z: 45 } } },
    story: { hooks: [{ id: 'lost-lamb', title: 'A lost lamb', text: 'Someone is crying by the oak.' }] }
  },
  {
    id: 'wood',
    name: 'The Wood',
    bounds: { x0: 100, x1: 200, z0: 0, z1: 100 },
    spawns: { west: { x: 106, z: 50, yaw: Math.PI / 2 } },
    portals: [{ id: 'to-meadow', x: 101.5, z: 50, shape: { type: 'circle', r: 1.5 }, to: 'meadow', arrive: 'east', lock: { flag: 'woodKey', text: 'Barred from this side' } }],
    hub: { id: 'grove', name: 'Grove', x: 150, z: 50, r: 8, services: { waystone: { x: 150, z: 46 }, rest: { x: 153, z: 50 } } }
  },
  { id: 'sea', name: 'The Sea', stub: true }
].map(defineZone);

test('zones: a toy world built from data validates, finds its doors, hubs and services', () => {
  assert.deepEqual(validateZones(TOY), []);
  const [meadow, wood] = TOY;
  assert.deepEqual(sizeOf(meadow.bounds), { w: 100, d: 100, area: 10000 });
  assert.ok(inBounds(meadow.bounds, 50, 50) && !inBounds(meadow.bounds, 150, 50));
  assert.equal(portalAt(meadow, 98.5, 51)?.id, 'to-wood');
  assert.equal(portalAt(meadow, 90, 50), null);
  assert.equal(portalNear(meadow, 92, 50, 10).portal.id, 'to-wood');
  assert.deepEqual(portalOpen(meadow.portals[1]), { open: false, why: 'Coming soon' });
  assert.equal(portalOpen(wood.portals[0]).open, false, 'locked without its flag');
  assert.equal(portalOpen(wood.portals[0], { woodKey: true }).open, true);
  assert.deepEqual(spawnPoint(wood, 'west'), { x: 106, z: 50, yaw: Math.PI / 2 });
  assert.deepEqual(spawnPoint(meadow, 'nowhere'), { x: 50, z: 50, yaw: 0 }, 'falls back to the default');
  assert.ok(inHub(meadow, 55, 50) && !inHub(meadow, 70, 50));
  assert.equal(serviceNear(meadow, 52, 51).id, 'waystone');
  assert.equal(serviceNear(meadow, 70, 70), null);
  assert.equal(meadow.story.hooks[0].id, 'lost-lamb', 'story hooks ride along as data');
  // The World view: two zones joined, one door coming soon.
  const g = zoneGraph(TOY);
  assert.equal(g.nodes.length, 3);
  assert.ok(g.links.some((l) => [l.a, l.b].sort().join() === 'meadow,wood' && l.both));
  assert.ok(g.links.some((l) => l.b === 'sea' && l.soon));
});

test('zones: validation catches doors to nowhere, arrivals outside, hubs and services astray', () => {
  const bad = [
    defineZone({ id: 'a', name: 'A', bounds: { x0: 0, x1: 10, z0: 0, z1: 10 }, spawns: { d: { x: 50, z: 5 } }, portals: [{ id: 'p', x: 5, z: 5, to: 'nope' }, { id: 'q', x: 5, z: 9, to: 'b', arrive: 'missing' }, { id: 'r', x: 1, z: 1, to: 'stub' }], hub: { id: 'h', x: 5, z: 5, r: 2, services: { stash: { x: 9, z: 9 }, sauna: { x: 5, z: 5 } } } }),
    defineZone({ id: 'b', name: 'B', bounds: { x0: 0, x1: 10, z0: 0, z1: 10 }, spawns: { in: { x: 5, z: 5 } }, portals: [{ id: 'back', x: 5, z: 5, to: 'a', arrive: { x: 99, z: 99 } }] }),
    defineZone({ id: 'stub', name: 'Later', stub: true }),
    defineZone({ id: 'a', name: 'Again', bounds: { x0: 0, x1: 1, z0: 0, z1: 1 } })
  ];
  const errs = validateZones(bad).join('\n');
  for (const want of ['two zones called "a"', 'spawn "d" lies outside', 'leads to "nope"', "arrives at \"missing\", which b doesn't have", 'isn\'t marked soon', 'stash is outside its ring', 'unknown hub service "sauna"', 'b: no hub', 'portal "back" arrives outside a']) assert.ok(errs.includes(want), `expected: ${want}\n${errs}`);
  assert.ok(validateZones(TOY, { maxSize: { w: 50, d: 50 } }).some((e) => e.includes('larger than')));
});

/* ------------------------------------------------------------------ the three games */

const GAMES = [
  { id: 'gloamreach', Z: GR, old: GR_EXTENT },
  { id: 'wyldhunt', Z: WH, old: WH_EXTENT },
  { id: 'kithvale', Z: KV, old: KV_EXTENT }
];

test('games: every zone list validates — doors lead to real zones, arrivals inside bounds, hubs with all seven services', () => {
  for (const { id, Z, old } of GAMES) {
    assert.deepEqual(validateZones(Z.ZONES), [], id);
    const real = Z.ZONES.filter((z) => !z.stub);
    assert.ok(real.length >= 2, `${id} has at least two zones`);
    for (const z of real) {
      const s = sizeOf(z.bounds);
      const o = sizeOf(old);
      assert.ok(s.w <= o.w && s.d <= o.d, `${id}/${z.id}: ${s.w}×${s.d} is no bigger than the old map's ${o.w}×${o.d}`);
      assert.ok(s.area < o.area * 0.7, `${id}/${z.id} builds well under the old map's area`);
      for (const k of SERVICES) assert.ok(z.hub.services[k], `${id}/${z.id}'s hub has a ${k}`);
      assert.ok(Array.isArray(z.story.hooks), `${id}/${z.id} has a story-hook slot`);
      for (const [name, sp] of Object.entries(z.spawns)) assert.ok(Z.inZone(z, sp.x, sp.z) || name === 'default' || inBounds(z.bounds, sp.x, sp.z), `${id}/${z.id} spawn ${name}`);
    }
    // Every door is a round trip (or a stub marked soon).
    for (const z of real) for (const p of z.portals) {
      if (p.soon) continue;
      const to = Z.zoneById(p.to);
      assert.ok(to.portals.some((q) => q.to === z.id), `${id}: ${p.to} leads back to ${z.id}`);
    }
  }
  assert.ok(WH.ZONES.some((z) => z.stub) && WH.ZONES.some((z) => z.portals.some((p) => p.soon)), 'Wyldhunt keeps a "coming soon" door to its next hunting ground');
});

test('games: everything on the old maps belongs to exactly one zone', () => {
  const one = (Z, x, z, what) => assert.equal(Z.ZONES.filter((q) => !q.stub && Z.inZone(q, x, z)).length, 1, `${what} at ${x},${z}`);
  for (const s of spawnList()) one(GR, s.x, s.z, s.type);
  for (const c of CHESTS) one(GR, c.x, c.z, c.id);
  assert.equal(spawnList().filter((s) => GR.inZone(GR.zoneById('cinder-rift'), s.x, s.z)).map((s) => s.type).sort().join(), 'cindermaw,grummoch', "Cindermaw's fight is in the rift");
  for (const n of NODES) one(WH, n.x, n.z, n.id);
  for (const h of [...HERDS, ...NESTS]) one(WH, h.x, h.z, 'herd/nest');
  for (const [sp, h] of Object.entries(HABITATS)) for (const [x, z] of h.homes) one(KV, x, z, sp);
  for (const f of [...FORAGE, ...CACHES, ...BOULDERS]) one(KV, f.x, f.z, f.id ?? f.kind);
  // No monster lives in a hub.
  for (const s of spawnList()) for (const z of GR.ZONES) assert.ok(!inHub(z, s.x, s.z, 20), `${s.type} lives 20 m clear of ${z.hub.name}`);
});

/* ------------------------------------------------------------------ the save */

test('save: versioned, round-trips, refuses the unknown and the newer, keeps lists clean', () => {
  const s = newZoneSave({ zone: 'meadow', hub: 'camp', stashSize: 6 });
  assert.equal(s.v, ZONE_SAVE_VERSION);
  assert.ok(mark(s, 'meadow', 'chests', 'c1'));
  assert.equal(mark(s, 'meadow', 'chests', 'c1'), false, 'once');
  assert.throws(() => mark(s, 'meadow', 'socks', 'x'));
  enterZone(s, 'wood');
  assert.deepEqual(s.visited, ['meadow', 'wood']);
  s.stash[2] = { kind: 'hp', n: 3 };
  s.game = { coins: 7 };
  const back = parseZoneSave(serializeZoneSave(s), { zones: ['meadow', 'wood'], hubs: ['camp', 'grove'], stashSize: 6 });
  assert.equal(back.zone, 'wood');
  assert.ok(has(back, 'meadow', 'chests', 'c1'));
  assert.deepEqual(back.stash[2], { kind: 'hp', n: 3 });
  assert.equal(back.game.coins, 7);
  assert.equal(parseZoneSave('{"v":99}'), null, 'newer');
  assert.equal(parseZoneSave('not json'), null);
  assert.equal(parseZoneSave(JSON.stringify({ ...s, zone: 'atlantis' }), { zones: ['meadow'] }).zone, 'meadow', 'unknown zones fall back');
  assert.deepEqual(counters(back, 'meadow', { chests: 3, elites: 0 }), [{ kind: 'chests', done: 1, total: 3 }]);
});

test('save: migrations from each game\'s save before zones', () => {
  // Gloamreach: the chests heroes opened are counted in their zones; you start in Brindlewick.
  const old = grNewSave();
  profileFor(old, 'knight').opened.push('c-westwood', 'c-webhollow');
  profileFor(old, 'mage').opened.push('c-ledge');
  const g = GR.migrateLegacy(old);
  assert.equal(g.zone, 'brindlewick');
  assert.equal(g.lastHub, 'brindlewick-square');
  assert.ok(has(g, 'brindlewick', 'chests', 'c-westwood') && has(g, 'gloamwood', 'chests', 'c-webhollow') && has(g, 'cinder-rift', 'chests', 'c-ledge'));
  assert.ok(parseZoneSave(serializeZoneSave(g), { zones: GR.ZONES.map((z) => z.id), hubs: GR.HUB_IDS, stashSize: 48 }));
  // Wyldhunt kept only the look: a fresh kit, coins, the camp.
  const w = WH.migrateLegacy({ look: 'mosscale' });
  assert.equal(w.zone, 'base-camp');
  assert.equal(w.game.look, 'mosscale');
  assert.ok(w.game.bag.length && w.game.coins > 0);
  assert.deepEqual(WH.cleanHunter({ bag: [{ id: 'potion', n: 400 }, { id: 'nonsense', n: 1 }], coins: -5 }), { bag: [{ id: 'potion', n: 10 }], coins: 0 });
  // Kithvale: befriended species, dug caches (their keepsakes go in the pouch), broken boulders.
  const st = kvNewState();
  st.befriended.push('tuftlet');
  st.caches.push('c1', 'c2');
  st.boulders.push('b1');
  st.hollow = true;
  const k = KV.migrateLegacy(st);
  assert.equal(k.zone, 'lanternrest');
  assert.ok(has(k, 'vale', 'friends', 'tuftlet') && has(k, 'vale', 'nodes', 'cache:c1') && has(k, 'vale', 'nodes', 'boulder:b1') && has(k, 'vale', 'pois', 'hollow'));
  assert.equal(k.game.pouch.reduce((n, e) => n + e.n, 0), 2);
});

test('save: a Wyldhunt save from the single gorge maps onto Veilfall Reach and the Hollow Heights', () => {
  const opts = { zones: WH.ZONES.map((z) => z.id), hubs: WH.HUB_IDS, stashSize: 24, upgrade: WH.upgradeSave };
  const lower = NODES.find((n) => n.z > 100 && n.z < 300);
  const upper = NODES.find((n) => n.z < -100);
  const v1 = {
    v: 1,
    zone: 'mistfall-gorge',
    at: { x: 12, z: -330, yaw: 0 },
    lastHub: 'forward-camp',
    hubs: ['lantern-camp', 'forward-camp'],
    visited: ['base-camp', 'mistfall-gorge'],
    zones: {
      'base-camp': { chests: [], elites: [], bosses: [], nodes: [], friends: [], pois: ['camp'] },
      'mistfall-gorge': { chests: [], elites: [], bosses: ['gnarlhorn@812'], nodes: [lower.id, upper.id], friends: [], pois: ['forward', 'colonnade', 'grandfall', 'meadow'] }
    },
    stash: [{ id: 'potion', n: 2 }],
    flags: {},
    game: { coins: 90 }
  };
  const s = parseZoneSave(JSON.stringify(v1), opts);
  assert.ok(s, 'still read');
  assert.equal(s.zone, 'hollow-heights', 'standing by the Grand Fall: the Heights');
  assert.ok(has(s, 'veilfall-reach', 'nodes', lower.id) && has(s, 'hollow-heights', 'nodes', upper.id), 'each gathered spot in the zone that holds it');
  assert.ok(!has(s, 'veilfall-reach', 'nodes', upper.id));
  assert.ok(has(s, 'veilfall-reach', 'pois', 'forward') && has(s, 'veilfall-reach', 'pois', 'colonnade') && has(s, 'hollow-heights', 'pois', 'grandfall') && has(s, 'hollow-heights', 'pois', 'meadow'), 'places found, by where they are now');
  assert.ok(has(s, 'hollow-heights', 'bosses', 'gnarlhorn@812'), 'hunts count where the beast lives');
  assert.ok(has(s, 'base-camp', 'pois', 'camp'), 'other zones untouched');
  assert.deepEqual([...s.visited].sort(), ['base-camp', 'hollow-heights', 'veilfall-reach']);
  assert.equal(s.lastHub, 'forward-camp', 'the forward camp keeps its id: where you wake carries over');
  assert.deepEqual(s.hubs, ['lantern-camp', 'forward-camp']);
  assert.equal(s.game.coins, 90);
  assert.ok(!('mistfall-gorge' in s.zones));
  // Somewhere lower down (or nowhere known): the Reach; and a save already on the new layout passes as it is.
  assert.equal(parseZoneSave(JSON.stringify({ ...v1, at: { x: -42, z: 160 } }), opts).zone, 'veilfall-reach');
  assert.equal(parseZoneSave(JSON.stringify({ ...v1, at: null }), opts).zone, 'veilfall-reach');
  const again = parseZoneSave(serializeZoneSave(s), opts);
  assert.deepEqual(again.zones, s.zones);
  const current = JSON.parse(serializeZoneSave(s));
  assert.equal(WH.upgradeSave(current), current, 'nothing to do: the same object back');
});

test('wyldhunt: the gorge is split at the Stair of Roots — the gate, its arrivals, the Gnarlhorn in one zone', () => {
  const reach = WH.zoneById('veilfall-reach');
  const heights = WH.zoneById('hollow-heights');
  const up = reach.portals.find((p) => p.to === 'hollow-heights');
  const down = heights.portals.find((p) => p.to === 'veilfall-reach');
  assert.ok(up && down, 'a door each way');
  assert.ok(Math.hypot(up.x - WH.ROOTWALL.gate.x, up.z - WH.ROOTWALL.gate.z) < 4 && Math.hypot(down.x - WH.ROOTWALL.gate.x, down.z - WH.ROOTWALL.gate.z) < 4, 'both at the Root Stair');
  assert.ok(up.z < WH.rootLine(up.x) && down.z > WH.rootLine(down.x), 'each just past the roots, on the far side');
  const a = heights.spawns[up.arrive];
  const b = reach.spawns[down.arrive];
  assert.equal(WH.zoneAt(a.x, a.z), 'hollow-heights');
  assert.equal(WH.zoneAt(b.x, b.z), 'veilfall-reach');
  for (const z of [reach, heights]) {
    const { w, d } = sizeOf(z.bounds);
    assert.ok(w <= 300, `${z.id} is ${w} m wide`);
    assert.ok(WH.zoneAt(z.hub.x, z.hub.z) === z.id, `${z.hub.name} stands in its zone`);
  }
  assert.ok(sizeOf(reach.bounds).d <= 300, 'the Reach is a medium map');
  // The Gnarlhorn's haunts and den are all above the stair; the scout flies below lead to the way up.
  for (const h of MONSTER_AREAS) assert.equal(WH.zoneAt(h.x, h.z), WH.HUNT_ZONE, h.id);
  assert.equal(WH.zoneAt(DEN.x, DEN.z), WH.HUNT_ZONE);
  assert.ok(heights.features.includes('hunt') && !reach.features.includes('hunt'));
  assert.equal(reach.huntWay, up.id);
  assert.equal(WH.zoneById('base-camp').huntWay, 'hunters-gate');
  // The World view joins the three, and the coming-soon trail still leaves from the camp.
  const g = zoneGraph(WH.ZONES);
  assert.ok(g.links.some((l) => [l.a, l.b].sort().join() === 'hollow-heights,veilfall-reach' && l.both));
  assert.ok(g.links.some((l) => [l.a, l.b].sort().join() === 'base-camp,veilfall-reach' && l.both));
  assert.ok(g.links.some((l) => l.a === 'base-camp' && l.b === 'emberwilds' && l.soon));
});

/* ------------------------------------------------------------------ hub safety */

test('hubs: no blows land and no monster chases inside; monsters are kept out at the edge', () => {
  const z = TOY[0];
  assert.deepEqual(monsterRule(z, 50, 50), { chase: false, hurt: false });
  assert.deepEqual(monsterRule(z, 50, 80), { chase: true, hurt: true });
  assert.equal(monsterRule(z, 60.8, 50).chase, false, 'a margin past the ring still counts');
  assert.equal(blowAt(z, 55, 50, 30), 0);
  assert.equal(blowAt(z, 75, 50, 30), 30);
  const [x, zz] = keepOut(z, 52, 50, 0.6);
  assert.ok(Math.hypot(x - 50, zz - 50) >= 10 + 0.6, 'pushed back to the ring');
  assert.deepEqual(fenceOut(z.hub, 80, 80, 1), [80, 80], 'outside stays put');
  // A monster running straight at the hub's middle stops at its edge.
  let m = { x: 80, z: 50 };
  for (let i = 0; i < 200; i++) {
    const dx = 50 - m.x;
    const d = Math.hypot(dx, 0) || 1;
    [m.x, m.z] = keepOut(z, m.x + (dx / d) * 0.5, m.z, 0.8);
  }
  assert.ok(m.x >= 50 + 10 + 0.8 - 1e-6, `stopped at ${m.x.toFixed(2)}`);
  // The real hubs: every Gloamreach hub keeps the Gloamwood's spiders out.
  for (const g of GR.ZONES) assert.ok(!inHub(g, ...keepOut(g, g.hub.x + 1, g.hub.z, 1)));
});

test('hubs: waystones unlock as you reach hubs, carry you between them, and the bed sets where you wake', () => {
  const s = newZoneSave({ zone: 'meadow', hub: 'camp' });
  let rows = waystones(TOY, s, 'camp');
  assert.deepEqual(rows.map((r) => [r.hub, r.reached, r.here]), [['camp', true, true], ['grove', false, false]]);
  assert.equal(canTravel(s, 'camp', 'grove'), false, 'not reached yet');
  assert.ok(reachHub(s, 'grove'));
  assert.equal(reachHub(s, 'grove'), false);
  assert.ok(canTravel(s, 'camp', 'grove'));
  assert.equal(canTravel(s, 'camp', 'camp'), false);
  assert.equal(canTravel(s, null, 'grove'), false, 'only from a hub');
  const at = arrivalAt(hubById(TOY, 'grove').zone);
  assert.ok(inHub(TOY[1], at.x, at.z), 'a waystone sets you down inside the hub');
  assert.equal(respawnPoint(TOY, s).zone, 'meadow');
  restAt(s, 'grove');
  const r = respawnPoint(TOY, s);
  assert.equal(r.zone, 'wood');
  assert.ok(inHub(TOY[1], r.x, r.z), 'you wake beside the bed');
  rows = waystones(TOY, s);
  assert.ok(rows.every((x) => x.reached));
});

/* ------------------------------------------------------------------ the stash */

test('stash: move, stack, swap, refuse when full, sort, store and take all', () => {
  const R = { stack: (a, b) => Boolean(a.kind) && a.kind === b.kind, max: 10, count: (e) => e.n ?? 1, setCount: (e, n) => (e.n = n) };
  const bag = [{ kind: 'hp', n: 4 }, { name: 'Sword' }, null, { kind: 'hp', n: 9 }];
  const stash = [{ kind: 'hp', n: 8 }, null, null];
  assert.deepEqual(move(bag, 0, stash, R), { ok: true, moved: 4, left: 0 });
  assert.deepEqual(stash[0], { kind: 'hp', n: 10 }, 'filled the stack first');
  assert.deepEqual(stash[1], { kind: 'hp', n: 2 }, 'the rest in a new slot');
  assert.equal(bag[0], null);
  assert.ok(move(bag, 1, stash, R).ok);
  assert.equal(stash[2].name, 'Sword');
  assert.equal(move(bag, 3, stash, R).moved, 8, 'a full stash still tops up stacks');
  assert.deepEqual(bag[3], { kind: 'hp', n: 1 });
  assert.equal(move(bag, 2, stash, R).ok, false, 'nothing there');
  // Swap into a chosen slot.
  const a = [{ name: 'A' }];
  const b = [{ name: 'B' }];
  move(a, 0, b, R, 0);
  assert.deepEqual([a[0].name, b[0].name], ['B', 'A']);
  const list = [null, { name: 'c' }, null, { name: 'a' }, { name: 'b' }];
  sortSlots(list, (e) => e.name);
  assert.deepEqual(list.map((e) => e?.name ?? null), ['a', 'b', 'c', null, null]);
  const from = [{ name: 'x' }, { kind: 'mp', n: 2 }, { name: 'y' }];
  const to = [null, null, null, null];
  assert.equal(moveAll(from, to, R, (e) => Boolean(e.kind)), 2, 'potions stay');
  assert.equal(used(to), 2);
  assert.equal(areaScale(1000, { x0: 0, x1: 50, z0: 0, z1: 50 }, { x0: 0, x1: 100, z0: 0, z1: 100 }), 250);
});

test('hub merchants and stashes in Wyldhunt and Kithvale: coins, refills, the satchel as slots', () => {
  const bag = [{ id: 'potion', n: 2 }, { id: 'sunleaf', n: 5 }];
  assert.equal(WH.sellAll(bag, 'sunleaf'), 5 * WH.SELL.sunleaf);
  assert.ok(!bag.some((s) => s.id === 'sunleaf'));
  const added = [];
  const r = WH.refill(bag, 1000, (id, n) => added.push([id, n]) || true);
  assert.ok(r.cost > 0 && r.coins === 1000 - r.cost && added.length);
  assert.equal(WH.refill(bag, 0, () => true).cost, 0, 'no coins, no refill');
  assert.deepEqual(WH.fromSlots(WH.toSlots(bag)), bag);
  const sat = { berry: 3, seed: 0, crystal: 2 };
  const slots = KV.carried(sat, [{ keep: 'bell', n: 1 }]);
  assert.deepEqual(slots.filter(Boolean).map((e) => e.treat ?? e.keep), ['berry', 'crystal', 'bell']);
  const pouch = KV.uncarry(slots, sat);
  assert.deepEqual(sat, { berry: 3, seed: 0, crystal: 2 });
  assert.deepEqual(pouch, [{ keep: 'bell', n: 1 }]);
  assert.ok(KV.KEEPSAKES[KV.keepsakeOf('c3')]);
});
