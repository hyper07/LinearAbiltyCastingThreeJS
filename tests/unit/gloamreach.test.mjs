import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, slopeAt, surfaceAt, riftAt } from '../../src/gloamreach/heights.js';
import { CollisionWorld } from '../../src/gloamreach/collide.js';
import { chooseTier, Governor, TIERS, SETTINGS } from '../../src/gloamreach/quality.js';
import { START, PLAZA, GATE, CLIFF_X, BUILDINGS, EXTENT, scatterTrees, nearestRoad, gloamLamps, areaAt, gloamAt, footprint } from '../../src/gloamreach/map.js';
import { HEROES, PEOPLE, ANIMALS } from '../../src/gloamreach/cast.js';
import { PACKS, POLYFORK_MODELS } from '../../src/gloamreach/credits.js';
import { rollDamage, armourReduction, heroStats, addXp, xpToNext, xpForKill, blockedDamage, Cooldowns, canUseSkill, MAX_LEVEL } from '../../src/gloamreach/rules.js';
import { SKILLS, SKILL_BAR, BAR_KEYS, skillOn, nextComboStage, chargeMult } from '../../src/gloamreach/skills.js';
import * as I from '../../src/gloamreach/items.js';
import { MONSTERS, SPAWNS, monsterDef, chooseAttack, spawnList, RESPAWN, tierOf } from '../../src/gloamreach/bestiary.js';
import { CHESTS, openChest, openPlaced, rewardChest, chestGone, CHEST_VANISH } from '../../src/gloamreach/chests.js';
import { SAVE_VERSION, serialize, parseSave, loadSave, writeSave, newSave, profileFor } from '../../src/gloamreach/save.js';
import { outside } from '../../src/gloamreach/heights.js';
import { LEDGE, REGIONS, regionSdf } from '../../src/gloamreach/map.js';

/** A seeded 0…1 stream. */
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('terrain: deterministic, finite everywhere, flat where people walk', () => {
  assert.equal(heightAt(12.3, -45.6), heightAt(12.3, -45.6));
  for (let x = EXTENT.x0; x <= EXTENT.x1; x += 17) for (let z = EXTENT.z0; z <= EXTENT.z1; z += 23) assert.ok(Number.isFinite(heightAt(x, z)), `height at ${x},${z}`);
  assert.ok(slopeAt(START.x, START.z) < 0.15, 'the start is level');
  assert.ok(slopeAt(PLAZA.x, PLAZA.z) < 0.05, 'the square is level');
  assert.equal(surfaceAt(PLAZA.x, PLAZA.z), 'cobble');
  assert.equal(surfaceAt(0, -240), 'wetcobble');
});

test('terrain: the ridge stands high beside a gate cut down to the road', () => {
  const floor = heightAt(0, (GATE.z0 + GATE.z1) / 2);
  assert.ok(Math.abs(floor - heightAt(0, -100)) < 3, 'the tunnel floor meets the road');
  assert.ok(heightAt(GATE.outerHalfWidth + 20, -142) > floor + 25, 'rock rises either side of the gatehouse');
});

test('terrain: the east cliff drops into the rift', () => {
  assert.ok(heightAt(CLIFF_X - 8, 0) > -2);
  assert.ok(heightAt(CLIFF_X + 8, 0) < -50);
  const r = riftAt(400, -40);
  assert.ok(r.h < -60 && r.lava >= 0 && r.lava <= 1);
});

test('collision: circles and turned boxes push out; rays hit them', () => {
  const w = new CollisionWorld({ height: () => 0, slope: () => 0 });
  w.circle(0, 0, 1);
  const [x, z] = w.pushOut(0.5, 0, 0.4);
  assert.ok(Math.hypot(x, z) >= 1.39);
  w.box(10, 0, 2, 1, Math.PI / 4);
  const [bx, bz] = w.pushOut(10, 0, 0.3);
  assert.ok(Math.hypot(bx - 10, bz) > 0.9, 'out of the box');
  const d = w.raycast(-5, 0.5, 0, 1, 0, 0, 20);
  assert.ok(Math.abs(d - 4) < 0.05, `ray stops at the trunk (${d})`);
  assert.equal(w.raycast(-5, 0.5, 5, 1, 0, 0, 3), 3, 'a clear ray goes its full length');
});

test('collision: the land is the wall — no walking off the cliff or up the hills', () => {
  const w = new CollisionWorld();
  // Toward the rift from the overlook.
  let [x, z] = [CLIFF_X - 6, 0];
  for (let i = 0; i < 60; i++) [x, z] = w.move(x, z, 0.3, 0, 0.4);
  assert.ok(heightAt(x, z) > -3, `stopped at the edge (x ${x.toFixed(1)})`);
  // Up the western hills.
  [x, z] = [-100, 0];
  for (let i = 0; i < 200; i++) [x, z] = w.move(x, z, -0.3, 0, 0.4);
  assert.ok(heightAt(x, z) < 20, 'the hills are too steep to climb far');
  // Through the gate's tunnel: the floor is walkable end to end.
  [x, z] = [0, -118];
  for (let i = 0; i < 160; i++) [x, z] = w.move(x, z, 0, -0.3, 0.4);
  assert.ok(z < -160, `through the Gate (z ${z.toFixed(1)})`);
});

test('quality: a first guess from the GPU, a governor that steps down and back up', () => {
  assert.equal(chooseTier({ gpu: 'Google SwiftShader' }), 'low');
  assert.equal(chooseTier({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620)' }), 'medium');
  assert.equal(chooseTier({ gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max)' }), 'ultra');
  assert.ok(TIERS.every((t) => SETTINGS[t].scale > 0 && SETTINGS[t].shadow >= 1024));
  const g = new Governor('high');
  let changed = null;
  for (let i = 0; i < 400 && !changed; i++) changed = g.frame(33);
  assert.equal(changed, 'medium');
  changed = null;
  for (let i = 0; i < 2000 && !changed; i++) changed = g.frame(6);
  assert.equal(changed, 'high');
});

test('map: buildings apart, trees off the roads, lamps both sides of the path', () => {
  for (const a of BUILDINGS) for (const b of BUILDINGS) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > (a.w + b.w) / 2 - 1, `${a.id} and ${b.id} overlap`);
  for (const b of BUILDINGS) assert.equal(footprint(b).length, 4);
  const trees = scatterTrees(5);
  assert.deepEqual(trees.slice(0, 3), scatterTrees(5).slice(0, 3), 'seeded');
  assert.ok(trees.length > 300);
  assert.ok(trees.every((t) => nearestRoad(t.x, t.z).d > 2), 'no tree on a road');
  const lamps = gloamLamps();
  assert.ok(lamps.length > 8);
  assert.ok(lamps.some((l) => l.x > 0) && lamps.some((l) => l.x < 0));
  assert.equal(areaAt(0, 0), 'village');
  assert.equal(areaAt(0, -142), 'gate');
  assert.equal(areaAt(0, -250), 'gloamwood');
  assert.equal(areaAt(126, 0), 'overlook');
  assert.equal(areaAt(LEDGE.x, LEDGE.z), 'ledge');
  assert.ok(trees.every((t) => regionSdf(REGIONS.ledge, t.x, t.z) > 1), 'the ledge is clear of trees');
  assert.equal(gloamAt(0), 0);
  assert.equal(gloamAt(-200), 1);
});

test('cast: every hero and person has a model, a name and words; every CC BY model is credited', () => {
  assert.equal(HEROES.length, 3);
  for (const p of PEOPLE) {
    assert.ok(p.name && p.model && p.greet, p.id);
    if (p.does === 'chat') assert.ok(PEOPLE.some((q) => q.id === p.with), `${p.id} talks to someone real`);
  }
  const credited = new Set(POLYFORK_MODELS.map(([id]) => id));
  for (const m of [...HEROES, ...PEOPLE, ...ANIMALS].map((x) => x.model)) assert.ok(credited.has(m), `${m} is credited`);
  for (const type of Object.keys(MONSTERS)) {
    const d = monsterDef(type);
    if (d.model) assert.ok(credited.has(d.model), `${type}'s model ${d.model} is credited`);
  }
  for (const p of PACKS) assert.ok(p.site.startsWith('https://') && p.licence, p.name);
});

/* ------------------------------------------------------------------ combat */

test('damage: variance, crits and armour', () => {
  const r = seeded(7);
  // No armour, no crit, no variance: exactly base × mult.
  assert.equal(rollDamage({ base: 20, mult: 1.5, variance: 0, rand: r }).amount, 30);
  // A certain crit multiplies.
  const c = rollDamage({ base: 20, mult: 1, variance: 0, critChance: 1, critMult: 2, rand: r });
  assert.ok(c.crit);
  assert.equal(c.amount, 40);
  // Armour: nothing without it, more with more, never over 75 %.
  assert.equal(armourReduction(0, 5), 0);
  assert.ok(armourReduction(50, 5) > armourReduction(20, 5));
  assert.ok(armourReduction(1e6, 1) <= 0.75);
  assert.ok(armourReduction(40, 10) < armourReduction(40, 1), 'a stronger attacker cuts through more');
  const armoured = rollDamage({ base: 100, variance: 0, armour: 60, attackerLevel: 3, rand: r });
  assert.equal(armoured.amount, Math.round(100 * (1 - armourReduction(60, 3))));
  // Always at least 1; variance stays in its band.
  assert.equal(rollDamage({ base: 0.01, rand: r }).amount, 1);
  for (let i = 0; i < 200; i++) {
    const d = rollDamage({ base: 100, variance: 0.1, rand: r }).amount;
    assert.ok(d >= 90 && d <= 110, `in band (${d})`);
  }
  // Crit rate over many rolls is near the chance.
  let crits = 0;
  for (let i = 0; i < 4000; i++) crits += rollDamage({ base: 10, critChance: 0.25, rand: r }).crit ? 1 : 0;
  assert.ok(Math.abs(crits / 4000 - 0.25) < 0.03, `crit rate ${crits / 4000}`);
});

test('blocking: the shield takes most of a blow from the front, none from behind', () => {
  assert.deepEqual(blockedDamage(100, { blocking: true, facing: 0, from: 0.3 }), { amount: 20, blocked: true });
  assert.deepEqual(blockedDamage(100, { blocking: true, facing: 0, from: Math.PI }), { amount: 100, blocked: false });
  assert.equal(blockedDamage(100, { block: 1, facing: 0, from: 0, rand: () => 0 }).amount, 50);
});

test('levels: experience to level up, stats grow, the cap holds', () => {
  const p = { level: 1, xp: 0 };
  assert.deepEqual(addXp(p, xpToNext(1) - 1), []);
  assert.deepEqual(addXp(p, 1), [2]);
  assert.equal(p.xp, 0);
  const ups = addXp(p, xpToNext(2) + xpToNext(3) + 5);
  assert.deepEqual(ups, [3, 4]);
  assert.equal(p.xp, 5);
  addXp(p, 1e9);
  assert.equal(p.level, MAX_LEVEL);
  const a = heroStats('knight', 1);
  const b = heroStats('knight', 10);
  assert.ok(b.maxHp > a.maxHp && b.atk > a.atk && b.armour > a.armour);
  assert.ok(heroStats('mage', 5).spell > heroStats('knight', 5).spell);
  assert.ok(heroStats('knight', 1, { armour: 20 }).armour === a.armour + 20, 'gear adds');
  assert.ok(xpForKill(5, 5) > xpForKill(2, 5), 'weaker foes give less');
  assert.ok(xpForKill(5, 5, { boss: true }) > xpForKill(5, 5, { elite: true }));
});

test('skills: every class has six on the bar, each with a cost, a cooldown and words', () => {
  for (const [cls, bar] of Object.entries(SKILL_BAR)) {
    assert.equal(bar.length, BAR_KEYS.length, cls);
    for (const id of bar) {
      const s = SKILLS[id];
      assert.ok(s && s.cls === cls && s.name && s.desc, id);
      assert.ok(s.cost >= 0 && s.cd >= 0, id);
    }
  }
  assert.equal(skillOn('mage', 'RMB').id, 'chain');
  assert.equal(skillOn('ranger', '3').id, 'rain');
  assert.equal(skillOn('knight', '9'), null);
  for (const id of ['meteor', 'rain', 'slam', 'blink']) assert.equal(SKILLS[id].aim, 'ground', id);
});

test('cooldowns and costs: a skill waits its cooldown and needs its resource', () => {
  const cd = new Cooldowns();
  const bash = SKILLS.bash;
  assert.ok(canUseSkill(bash, { resource: 100, now: 0, cooldowns: cd }).ok);
  cd.start('bash', bash.cd, 10);
  assert.equal(canUseSkill(bash, { resource: 100, now: 12, cooldowns: cd }).reason, 'cooldown');
  assert.equal(cd.left('bash', 12), bash.cd - 2);
  assert.ok(Math.abs(cd.frac('bash', 13) - (bash.cd - 3) / bash.cd) < 1e-9);
  assert.ok(canUseSkill(bash, { resource: 100, now: 10 + bash.cd, cooldowns: cd }).ok);
  assert.equal(canUseSkill(bash, { resource: bash.cost - 1, now: 99, cooldowns: cd }).reason, 'resource');
  assert.equal(canUseSkill(bash, { resource: 100, now: 99, cooldowns: cd, stunned: true }).reason, 'stunned');
  // The combo chains within its window, else starts over; a charged shot grows with the draw.
  const combo = SKILLS.combo;
  assert.equal(nextComboStage(combo, null, 0), 0);
  assert.equal(nextComboStage(combo, 0, 0.2), 1);
  assert.equal(nextComboStage(combo, 1, 0.2), 2);
  assert.equal(nextComboStage(combo, 2, 0.2), 0);
  assert.equal(nextComboStage(combo, 1, combo.window + 0.1), 0);
  assert.ok(chargeMult(SKILLS.charged, 0) < chargeMult(SKILLS.charged, 0.6));
  assert.equal(chargeMult(SKILLS.charged, 5), SKILLS.charged.maxMult);
});

/* ------------------------------------------------------------------ items */

test('items: rarity raises stats and affixes; legendaries are named; level requirements', () => {
  const c = I.makeItem('longsword', 'common', 5, seeded(3));
  const l = I.makeItem('longsword', 'legendary', 5, seeded(3));
  assert.equal(c.affixes.length, 0);
  assert.equal(l.affixes.length, 4);
  assert.ok(l.stats.atk > c.stats.atk);
  assert.ok(l.name !== I.BASES.longsword.name);
  assert.equal(c.req, 4);
  assert.equal(I.makeItem('ring', 'rare', 1, seeded(2)).req, 1);
  assert.ok(I.makeItem('longsword', 'common', 12, seeded(3)).stats.atk > c.stats.atk, 'higher level, stronger');
  assert.equal(I.makeItem('nope'), null);
  for (const [id, b] of Object.entries(I.BASES)) {
    assert.ok(b.name && b.look && b.cls.length && Object.keys(b.stats).length, id);
    assert.ok(b.slot === 'trinket' || I.SLOTS.includes(b.slot), id);
  }
});

test('loot: rarity odds by tier, drops for the class, gold and potions', () => {
  const r = seeded(11);
  const count = (tier) => {
    const n = Object.fromEntries(I.RARITY_ORDER.map((k) => [k, 0]));
    for (let i = 0; i < 6000; i++) n[I.rollRarity(tier, r)]++;
    return n;
  };
  const normal = count('normal');
  const boss = count('boss');
  assert.ok(normal.common > normal.uncommon && normal.uncommon > normal.rare && normal.rare > normal.legendary);
  assert.equal(boss.common, 0);
  assert.ok(boss.legendary > normal.legendary * 10);
  const b = I.rollLoot({ tier: 'boss', level: 9, cls: 'mage' }, r);
  assert.equal(b.items.length, I.DROP_COUNT.boss);
  assert.ok(b.items.every((it) => it.ilvl >= 11 && ['rare', 'epic', 'legendary'].includes(it.rarity)));
  assert.ok(b.gold >= I.GOLD.boss[0] && b.potions.length === 4);
  // Most drops can be used by the hero who earned them.
  let usable = 0;
  let all = 0;
  for (let i = 0; i < 400; i++) for (const it of I.rollLoot({ tier: 'elite', level: 3, cls: 'ranger' }, r).items) {
    all++;
    if (I.BASES[it.base].cls.includes('ranger')) usable++;
  }
  assert.ok(usable / all > 0.6, `usable ${usable}/${all}`);
  // Normal kills drop an item about a quarter of the time.
  let items = 0;
  for (let i = 0; i < 2000; i++) items += I.rollLoot({ tier: 'normal', level: 2 }, r).items.length;
  assert.ok(Math.abs(items / 2000 - I.DROP_COUNT.normal) < 0.04);
});

test('bag: potions stack, items take a slot each, moving merges or swaps, a full bag refuses', () => {
  const bag = I.emptyBag();
  assert.deepEqual(I.addToBag(bag, { kind: 'hp', n: 25 }), { ok: true, added: 25 });
  assert.equal(bag[0].n, I.STACK_MAX);
  assert.equal(bag[1].n, 5);
  I.addToBag(bag, { kind: 'hp', n: 3 });
  assert.equal(bag[1].n, 8, 'fills the open stack first');
  assert.equal(I.countOf(bag, 'hp'), 28);
  const sword = I.makeItem('shortsword', 'common', 1, seeded(1));
  I.addToBag(bag, sword);
  assert.equal(bag[2], sword);
  // Move onto an empty slot, then swap.
  assert.ok(I.moveInBag(bag, 2, 10));
  assert.equal(bag[10], sword);
  assert.equal(bag[2], null);
  assert.ok(I.moveInBag(bag, 10, 0));
  assert.equal(bag[0], sword);
  assert.equal(bag[10].kind, 'hp');
  // Stack onto stack: fills, the rest stays.
  assert.ok(I.moveInBag(bag, 1, 10));
  assert.equal(bag[10].n, I.STACK_MAX);
  assert.equal(bag[1].n, 8);
  // Drinking takes one; no cooldown — every press drinks.
  assert.ok(I.takePotion(bag, 'hp'));
  assert.ok(I.takePotion(bag, 'hp'));
  assert.equal(I.countOf(bag, 'hp'), 26);
  assert.equal(I.takePotion(bag, 'mp'), false);
  // Full.
  const full = Array.from({ length: I.BAG_SIZE }, () => I.makeItem('ring', 'common', 1, seeded(4)));
  assert.equal(I.addToBag(full, sword).ok, false);
  assert.equal(I.freeSlots(full), 0);
});

test('equipment: two-handers clear the off-hand, level and class rules, trinkets fill both slots', () => {
  const p = { cls: 'knight', level: 3, gold: 0, bag: I.emptyBag(), equip: I.emptyEquip() };
  const sword = I.makeItem('longsword', 'common', 1, seeded(1));
  const shield = I.makeItem('kite', 'common', 1, seeded(2));
  const great = I.makeItem('greatsword', 'rare', 3, seeded(3));
  I.addToBag(p.bag, sword);
  I.addToBag(p.bag, shield);
  I.addToBag(p.bag, great);
  assert.ok(I.equipFromBag(p, 0).ok);
  assert.ok(I.equipFromBag(p, 1).ok);
  assert.equal(p.equip.mainhand, sword);
  assert.equal(p.equip.offhand, shield);
  // The greatsword takes both hands: the sword goes into its bag slot, the shield into the next free one.
  assert.ok(I.equipFromBag(p, 2).ok);
  assert.equal(p.equip.mainhand, great);
  assert.equal(p.equip.offhand, null);
  assert.equal(p.bag[2], sword);
  assert.ok(p.bag.includes(shield));
  // Putting the shield back on takes the greatsword off.
  assert.ok(I.equipFromBag(p, p.bag.indexOf(shield)).ok);
  assert.equal(p.equip.mainhand, null);
  assert.ok(p.bag.includes(great));
  // Level requirement.
  const high = I.makeItem('plate', 'common', 9, seeded(5));
  I.addToBag(p.bag, high);
  const r = I.equipFromBag(p, p.bag.indexOf(high));
  assert.equal(r.ok, false);
  assert.match(r.reason, /level 8/);
  // Class and weight.
  const robe = I.makeItem('robe', 'common', 1, seeded(6));
  I.addToBag(p.bag, robe);
  assert.equal(I.equipFromBag(p, p.bag.indexOf(robe)).ok, false);
  assert.equal(I.canEquip(I.makeItem('plate', 'common', 1, seeded(7)), { cls: 'ranger', level: 5 }).ok, false);
  // A ranger's quiver rides beside a bow.
  const ranger = { cls: 'ranger', level: 1, bag: I.emptyBag(), equip: I.emptyEquip() };
  I.addToBag(ranger.bag, I.makeItem('bow', 'common', 1, seeded(1)));
  I.addToBag(ranger.bag, I.makeItem('quiver', 'common', 1, seeded(1)));
  I.equipFromBag(ranger, 0);
  I.equipFromBag(ranger, 1);
  assert.ok(ranger.equip.mainhand && ranger.equip.offhand);
  // Trinkets: the first empty one, then the one asked for.
  const ring1 = I.makeItem('ring', 'common', 1, seeded(8));
  const ring2 = I.makeItem('ring', 'rare', 1, seeded(9));
  const ring3 = I.makeItem('amulet', 'rare', 1, seeded(10));
  for (const x of [ring1, ring2, ring3]) I.addToBag(p.bag, x);
  I.equipFromBag(p, p.bag.indexOf(ring1));
  I.equipFromBag(p, p.bag.indexOf(ring2));
  assert.equal(p.equip.trinket1, ring1);
  assert.equal(p.equip.trinket2, ring2);
  I.equipFromBag(p, p.bag.indexOf(ring3), 'trinket1');
  assert.equal(p.equip.trinket1, ring3);
  assert.ok(p.bag.includes(ring1));
  // Unequip into the bag; totals and comparisons.
  assert.ok(I.unequip(p, 'trinket2').ok);
  assert.equal(p.equip.trinket2, null);
  const t = I.gearTotals({ mainhand: sword, offhand: shield });
  assert.equal(t.atk, sword.stats.atk);
  assert.equal(t.armour, shield.stats.armour);
  const cmp = I.compareItem(great, { mainhand: sword, offhand: shield });
  assert.equal(cmp.atk, great.stats.atk - sword.stats.atk);
  assert.equal(cmp.armour, -shield.stats.armour, 'a two-hander loses the shield');
});

test('trade: selling pays, buying costs four times as much and needs room', () => {
  const p = { cls: 'mage', level: 1, gold: 0, bag: I.emptyBag(), equip: I.emptyEquip() };
  const it = I.makeItem('wand', 'rare', 4, seeded(2));
  I.addToBag(p.bag, it);
  const got = I.sellFromBag(p, 0);
  assert.ok(got > 0 && p.gold === got && p.bag[0] === null);
  const stock = I.merchantStock({ level: 3, cls: 'mage' }, seeded(5));
  assert.equal(stock.length, 8);
  assert.ok(stock.every((s) => I.BASES[s.base].cls.includes('mage')));
  const cheap = stock[0];
  p.gold = I.buyPrice(cheap) - 1;
  assert.equal(I.buy(p, cheap, stock).ok, false);
  p.gold += 1;
  assert.ok(I.buy(p, cheap, stock).ok);
  assert.equal(p.gold, 0);
  assert.equal(stock.length, 7, 'bought items leave the stock');
  assert.equal(I.buyPrice(cheap), I.sellPrice(cheap) * 4);
  p.gold = 100;
  assert.ok(I.buy(p, { kind: 'hp' }).ok);
  assert.equal(I.countOf(p.bag, 'hp'), 1);
});

test('new heroes start dressed as drawn, with potions', () => {
  for (const cls of ['knight', 'ranger', 'mage']) {
    const p = I.newProfile(cls);
    assert.ok(p.equip.mainhand, cls);
    for (const s of I.SLOTS) if (p.equip[s]) assert.ok(I.canEquip(p.equip[s], p).ok, `${cls} ${s}`);
    assert.ok(I.countOf(p.bag, 'hp') > 0 && I.countOf(p.bag, 'mp') > 0);
  }
  assert.ok(I.newProfile('knight').equip.offhand, 'the knight has a shield');
  assert.ok(I.newProfile('ranger').equip.offhand, 'the ranger a quiver beside the bow');
});

/* ------------------------------------------------------------------ monsters and chests */

test('bestiary: every monster can fight; spawns are on walkable ground, away from the square', () => {
  for (const type of Object.keys(MONSTERS)) {
    const d = monsterDef(type);
    assert.ok(d.name && d.hp > 0 && d.atk > 0 && d.attacks.length, type);
    assert.ok(d.rig, `${type} has a rig`);
    for (const a of d.attacks) assert.ok(a.windup > 0 && a.range > 0 && a.cd > 0, `${type} ${a.id}`);
  }
  const list = spawnList();
  assert.equal(list.length, SPAWNS.length);
  for (const s of list) {
    assert.ok(MONSTERS[s.type], s.type);
    assert.ok(Math.hypot(s.x - PLAZA.x, s.z - PLAZA.z) > 55, `${s.type} at ${s.x},${s.z} is not in the village`);
    assert.ok(outside(s.x, s.z) < 0, `${s.type} at ${s.x},${s.z} stands on walkable ground (${outside(s.x, s.z).toFixed(1)})`);
    assert.ok(Number.isFinite(heightAt(s.x, s.z)));
  }
  for (const p of PEOPLE) if (Array.isArray(p.at)) for (const s of list) assert.ok(Math.hypot(s.x - p.at[0], s.z - p.at[1]) > 15, `${s.type} near ${p.id}`);
  assert.equal(list.filter((s) => MONSTERS[s.type].boss).length, 1, 'one boss');
  const boss = list.find((s) => MONSTERS[s.type].boss);
  assert.equal(areaAt(boss.x, boss.z), 'ledge');
  assert.ok(list.filter((s) => MONSTERS[s.type].elite).length >= 3);
  assert.ok(RESPAWN.normal < RESPAWN.elite && RESPAWN.elite < RESPAWN.boss);
  assert.equal(tierOf(monsterDef('cindermaw')), 'boss');
  // Choosing an attack: by range, cooldown first.
  const boar = monsterDef('boar');
  assert.equal(chooseAttack(boar, 1.5, () => true, () => 0.9).id, 'gore');
  assert.equal(chooseAttack(boar, 8, () => true, () => 0).id, 'charge');
  assert.equal(chooseAttack(boar, 8, (id) => id !== 'charge'), null, 'too far for a bite, the charge is waiting');
});

test('chests: placed chests open once per hero; reward chests open once and then go', () => {
  const opened = [];
  assert.ok(openPlaced(opened, 'c-ledge'));
  assert.equal(openPlaced(opened, 'c-ledge'), false);
  for (const c of CHESTS) {
    assert.ok(outside(c.x, c.z) < 0, `${c.id} is reachable`);
    assert.ok(Math.hypot(c.x - PLAZA.x, c.z - PLAZA.z) > 40, `${c.id} is out in the wild`);
  }
  assert.equal(rewardChest({}, { id: 'x', x: 0, z: 0 }), null);
  const c = rewardChest({ elite: true }, { id: 'r1', x: 1, z: 2, now: 10 });
  assert.equal(c.tier, 'elite');
  assert.ok(openChest(c, 11));
  assert.equal(openChest(c, 11.5), false);
  assert.equal(chestGone(c, 11 + CHEST_VANISH - 0.1), false);
  assert.ok(chestGone(c, 11 + CHEST_VANISH));
});

/* ------------------------------------------------------------------ saving */

test('save: versioned, round-trips, refuses the unknown, survives broken storage', () => {
  const save = newSave();
  const p = profileFor(save, 'ranger');
  p.level = 7;
  p.gold = 321;
  p.opened.push('c-ledge');
  I.addToBag(p.bag, I.makeItem('longbow', 'epic', 7, seeded(3)));
  const text = serialize(save);
  assert.equal(JSON.parse(text).v, SAVE_VERSION);
  const back = parseSave(text);
  assert.equal(back.profiles.ranger.level, 7);
  assert.equal(back.profiles.ranger.gold, 321);
  assert.deepEqual(back.profiles.ranger.opened, ['c-ledge']);
  assert.equal(back.profiles.ranger.bag.filter((e) => e?.base === 'longbow').length, 1);
  assert.equal(back.profiles.ranger.bag.length, I.BAG_SIZE);
  // Unknown versions, junk, and broken entries.
  assert.equal(parseSave(JSON.stringify({ v: SAVE_VERSION + 1, profiles: {} })), null);
  assert.equal(parseSave('{not json'), null);
  assert.equal(parseSave(JSON.stringify({ profiles: {} })), null, 'no version, no save');
  const junk = JSON.parse(text);
  junk.profiles.ranger.bag[0] = { base: 'no-such-thing' };
  junk.profiles.ranger.equip.head = I.makeItem('longsword', 'common', 1, seeded(1));
  const cleaned = parseSave(JSON.stringify(junk));
  assert.equal(cleaned.profiles.ranger.bag[0], null);
  assert.equal(cleaned.profiles.ranger.equip.head, null, 'a sword is not a hat');
  // Storage that throws: a fresh save and false, never an error.
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(loadSave(broken).profiles, {});
  assert.equal(writeSave(save, broken), false);
  const mem = new Map();
  const ok = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.ok(writeSave(save, ok));
  assert.equal(loadSave(ok).profiles.ranger.level, 7);
});
