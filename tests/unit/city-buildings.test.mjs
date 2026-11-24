import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildingType, typeSpec, floorsOf, shopUnits, tenants, signNames, rng, TYPES, WORDS } from '../../src/city/buildtypes.js';

test('Seoul buildings: the register\'s use, height and footprint give the six types', () => {
  assert.equal(buildingType({ kind: 1, h: 60 }), 'apartment');
  assert.equal(buildingType({ kind: 1, h: 12 }), 'villa', 'a low multi-family house is a villa');
  assert.equal(buildingType({ kind: 0, h: 10, seed: 0.2 }), 'villa');
  assert.equal(buildingType({ kind: 2, h: 18 }), 'shop', 'a low shop building');
  assert.equal(buildingType({ kind: 3, h: 12 }), 'shop', 'small offices over shops');
  assert.ok(['office', 'glass'].includes(buildingType({ kind: 3, h: 80, seed: 0.3 })), 'a tall office is a tower');
  assert.equal(buildingType({ kind: 2, h: 9, area: 5000 }), 'concrete', 'a long low hall is plain concrete');
  assert.equal(buildingType({ kind: 4, h: 20 }), 'concrete', 'public buildings');
  const seen = new Set();
  for (let k = 0; k < 400; k++) {
    const r = rng(k + 0.5);
    seen.add(buildingType({ kind: Math.floor(r() * 7), h: 4 + r() * 120, area: 50 + r() * 3000, seed: r() }));
  }
  assert.deepEqual([...seen].sort(), [...TYPES].sort(), 'every type turns up');
});

test('Seoul buildings: true proportions — floors fill the height, ground floor taller', () => {
  const shop = typeSpec('shop', 0.3);
  assert.ok(shop.groundH >= 4 && shop.groundH <= 4.5 && shop.floorH >= 3.3 && shop.floorH <= 4, 'shop floors (§2)');
  const villa = typeSpec('villa', 0.3);
  assert.ok(villa.floorH >= 2.8 && villa.floorH <= 3, 'residential floors');
  assert.ok(villa.winW >= 1.2 && villa.winW <= 1.8 && villa.winH >= 1.2 && villa.winH <= 1.5, 'residential windows');
  const f = floorsOf(17.5, shop);
  assert.equal(f.n, 5, 'a 17.5 m shop building has five floors');
  assert.ok(Math.abs(f.groundH + (f.n - 1) * f.floorH - 17.5) < 0.01, 'and they fill it exactly');
  assert.equal(floorsOf(3, villa).n, 1);
  assert.notDeepEqual(typeSpec('shop', 0.1), typeSpec('shop', 0.9), 'neighbours differ');
});

test('Seoul signs: shops split a front with piers between; tenants fit their floor', () => {
  const r = rng(3.3);
  const units = shopUnits(20, r, 0.45);
  assert.ok(units.length >= 2 && units.length <= 5, `${units.length} shops on a 20 m front`);
  for (let i = 0; i < units.length; i++) {
    const [a, c] = units[i];
    assert.ok(c - a > 2.5, 'a shop is at least a door and a window wide');
    if (i) assert.ok(a - units[i - 1][1] > 0.4, 'a pier between shops: a gap between their signs');
  }
  assert.ok(units[0][0] >= 0.45 && units.at(-1)[1] <= 19.56, 'piers at both ends');
  assert.deepEqual(shopUnits(2, r), [], 'too short for a shop');
  const cat = signNames();
  assert.ok(cat.length > 60 && new Set(cat.map((e) => e.name)).size === cat.length, 'a catalogue of distinct names');
  assert.ok(cat.every((e) => !/스타벅스|GS25|CU|이마트|올리브영/.test(e.name)), 'no real brands');
  const t = tenants(cat, rng(7.7), 3, 6);
  assert.equal(t.ground.length, 3);
  for (const i of t.ground) assert.ok(WORDS.ground.includes(cat[i].word), `1F: ${cat[i].name}`);
  assert.equal(t.upper.length, 5, '2F to 6F');
  if (t.upper[0] != null) assert.ok(WORDS.second.includes(cat[t.upper[0]].word), `2F: ${cat[t.upper[0]].name}`);
  for (const i of t.upper.slice(1)) if (i != null) assert.ok(WORDS.upper.includes(cat[i].word), `3F+: ${cat[i].name}`);
});
