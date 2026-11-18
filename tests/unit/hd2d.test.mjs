import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../src/hd2d/rules.js';

/** A fixed 0…1 stream, so damage rolls are repeatable. */
const fixed = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('hero stats grow with level and charms', () => {
  const a = R.heroStats(1);
  const b = R.heroStats(5);
  assert.ok(b.maxHp > a.maxHp && b.maxMp > a.maxMp && b.atk > a.atk && b.def > a.def);
  const charmed = R.heroStats(1, { hp: 2, atk: 1 });
  assert.equal(charmed.maxHp, a.maxHp + 50);
  assert.equal(charmed.atk, a.atk + 4);
  // Out-of-range levels are clamped, not NaN.
  assert.deepEqual(R.heroStats(0), a);
  assert.ok(Number.isFinite(R.heroStats(999).maxHp));
});

test('damage: defence reduces but never cancels; crits hit harder; at least 1', () => {
  const plain = R.damage(20, 0, 1, fixed(0.5, 0.5)); // no crit, middle spread
  assert.equal(plain.crit, false);
  assert.equal(plain.amount, 20);
  const armoured = R.damage(20, 30, 1, fixed(0.5, 0.5));
  assert.equal(armoured.amount, 10); // half off at def 30
  const crit = R.damage(20, 0, 1, fixed(0.05, 0.5));
  assert.equal(crit.crit, true);
  assert.equal(crit.amount, 32);
  assert.equal(R.damage(1, 1000, 0.1, fixed(0.5, 0.5)).amount, 1);
  // Spread stays within ±10 %.
  for (let i = 0; i < 50; i++) {
    const d = R.damage(100, 0, 1, fixed(0.5, i / 50));
    assert.ok(d.amount >= 90 && d.amount <= 110);
  }
});

test('XP curve rises, level-ups carry the remainder and refill health', () => {
  for (let l = 1; l < 10; l++) assert.ok(R.xpToNext(l + 1) > R.xpToNext(l));
  const h = R.newHero('moss');
  h.hp = 10;
  const need = R.xpToNext(1) + R.xpToNext(2);
  const { levels } = R.gainXp(h, need + 7);
  assert.equal(levels, 2);
  assert.equal(h.level, 3);
  assert.equal(h.xp, 7);
  assert.equal(h.hp, R.heroStats(3).maxHp);
  assert.equal(R.gainXp(h, 0).levels, 0);
  assert.equal(R.gainXp(h, -50).hero.xp, 7);
});

test('potions have no cooldown: every press drinks one while any are left', () => {
  const h = R.newHero();
  h.potions.hp = 3;
  h.hp = 1;
  const a = R.drinkPotion(h, 'hp');
  const b = R.drinkPotion(h, 'hp'); // straight away, no waiting
  const c = R.drinkPotion(h, 'hp');
  assert.ok(a.ok && b.ok && c.ok);
  assert.equal(h.potions.hp, 0);
  assert.equal(h.hp, R.heroStats(1).maxHp);
  const d = R.drinkPotion(h, 'hp');
  assert.equal(d.ok, false);
  assert.equal(h.potions.hp, 0);
  h.mp = 0;
  h.potions.mp = 2;
  assert.ok(R.drinkPotion(h, 'mp').ok && R.drinkPotion(h, 'mp').ok);
  assert.equal(h.mp, R.heroStats(1).maxMp);
  assert.equal(R.drinkPotion(h, 'nope').ok, false);
});

test('death sends you back with full health and a tenth of your gold gone', () => {
  const h = R.newHero();
  h.gold = 95;
  h.hp = 0;
  const lost = R.deathPenalty(h);
  assert.equal(lost, 9);
  assert.equal(h.gold, 86);
  assert.equal(h.hp, R.heroStats(1).maxHp);
  assert.equal(h.deaths, 1);
});

test('the shop takes gold or crystals and caps the charms', () => {
  const h = R.newHero();
  h.gold = 30;
  assert.ok(R.buy(h, 'hp').ok);
  assert.equal(h.potions.hp, 3);
  assert.equal(h.gold, 18);
  assert.equal(R.buy(h, 'charm-atk').ok, false); // no crystals
  h.crystals = 40;
  for (let i = 0; i < 3; i++) assert.ok(R.buy(h, 'charm-hp').ok);
  assert.equal(R.buy(h, 'charm-hp').ok, false);
  assert.equal(h.bonus.hp, 3);
  assert.equal(R.buy(h, 'mystery').ok, false);
});

test('enemy definitions are sane and in a sensible difficulty order', () => {
  for (const [id, e] of Object.entries(R.ENEMIES)) {
    for (const k of ['hp', 'atk', 'speed', 'sight', 'leash', 'reach', 'windup', 'cooldown', 'radius', 'xp']) assert.ok(Number.isFinite(e[k]) && e[k] >= 0, `${id}.${k}`);
    assert.ok(e.windup >= 0.4, `${id} telegraphs its attack`);
    assert.ok(e.leash >= e.sight, `${id} leashes no closer than it notices`);
    assert.ok(e.gold[0] <= e.gold[1]);
    assert.ok(e.boss || Number.isFinite(e.respawn), `${id} respawns`);
  }
  assert.ok(R.ENEMIES.slime.level < R.ENEMIES.wolf.level && R.ENEMIES.wolf.level <= R.ENEMIES.wisp.level && R.ENEMIES.wisp.level < R.ENEMIES.lampwight.level);
  assert.ok(R.ENEMIES.lampwight.boss && R.ENEMIES.lampwight.hp > 10 * R.ENEMIES.wisp.hp);
  const drops = R.rollDrops('slime', fixed(0.99));
  assert.equal(drops.gold, 5);
  assert.equal(drops.crystals, 0);
  assert.equal(R.rollDrops('lampwight', fixed(0.5)).crystals, 5);
});

test('the quest chain runs in order from first quest to the ending', () => {
  const log = R.newQuestLog();
  const h = R.newHero();
  assert.equal(log.embers.state, 'available');
  assert.ok(R.QUESTS.slice(1).every((q) => log[q.id].state === 'locked'));
  assert.equal(R.npcMarker(log, 'wren'), '!');
  assert.equal(R.npcMarker(log, 'pell'), 'shop');
  // Events before accepting count for nothing.
  assert.deepEqual(R.questEvent(log, 'gather', 'herb'), []);
  assert.equal(log.embers.progress, 0);
  for (const q of R.QUESTS) {
    if (!q.auto) {
      const talk = R.dialogueFor(q.giver, log);
      assert.deepEqual(talk.action, { accept: q.id }, `${q.giver} offers ${q.id}`);
      assert.ok(R.acceptQuest(log, q.id));
    }
    assert.equal(log[q.id].state, 'active');
    assert.equal(R.currentQuest(log).quest.id, q.id);
    let ready = [];
    for (let i = 0; i < q.goal.count; i++) ready = R.questEvent(log, q.goal.type, q.goal.target);
    assert.deepEqual(ready, [q.id]);
    assert.equal(log[q.id].state, 'ready');
    assert.equal(R.npcMarker(log, q.giver), '?');
    // Extra events past the goal don't overflow it.
    R.questEvent(log, q.goal.type, q.goal.target);
    assert.equal(log[q.id].progress, q.goal.count);
    const talk = R.dialogueFor(q.giver, log);
    assert.deepEqual(talk.action, { complete: q.id });
    const gold = h.gold;
    const reward = R.completeQuest(log, h, q.id);
    assert.ok(reward);
    assert.equal(h.gold, gold + (q.reward.gold ?? 0));
    assert.equal(log[q.id].state, 'done');
    assert.equal(R.completeQuest(log, h, q.id), null, 'cannot hand in twice');
  }
  assert.ok(R.journeyOver(log));
  assert.equal(R.questsDone(log), R.QUESTS.length);
  assert.ok(h.level >= 4, `the quest rewards alone level you up (level ${h.level})`);
  // Every NPC still has something to say afterwards.
  for (const id of Object.keys(R.NPCS)) assert.ok(R.dialogueFor(id, log).lines.length > 0);
});

test('a save round-trips, and broken saves are refused or repaired', () => {
  const g = R.newGame('frost');
  g.hero.level = 4;
  g.hero.gold = 123;
  g.hero.potions.hp = 7;
  g.quests.embers.state = 'done';
  g.quests.slimes.state = 'active';
  g.quests.slimes.progress = 3;
  g.herbsTaken = [0, 2, 5];
  g.braziers = ['b2'];
  g.pos = [10.5, -20.25];
  g.time = 321;
  const back = R.deserialize(R.serialize(g));
  assert.equal(back.hero.look, 'frost');
  assert.equal(back.hero.level, 4);
  assert.equal(back.hero.gold, 123);
  assert.equal(back.hero.potions.hp, 7);
  assert.deepEqual(back.quests.slimes, { state: 'active', progress: 3 });
  assert.deepEqual(back.herbsTaken, [0, 2, 5]);
  assert.deepEqual(back.braziers, ['b2']);
  assert.deepEqual(back.pos, [10.5, -20.25]);
  assert.equal(back.time, 321);
  assert.equal(R.deserialize('not json'), null);
  assert.equal(R.deserialize(JSON.stringify({ v: 99, hero: {} })), null);
  assert.equal(R.deserialize(null), null);
  // Tampered values are clamped or dropped.
  const bad = JSON.parse(R.serialize(g));
  Object.assign(bad.hero, { level: 9999, hp: -5, gold: 'lots', look: 'pirate' });
  bad.quests.slimes = { state: 'hacked', progress: 99 };
  bad.herbsTaken = [1, 999, 'x'];
  bad.braziers = ['b1', 'nope'];
  bad.pos = [5000, 0];
  const fixedSave = R.deserialize(JSON.stringify(bad));
  assert.equal(fixedSave.hero.level, R.MAX_LEVEL);
  assert.equal(fixedSave.hero.hp, 1);
  assert.equal(fixedSave.hero.gold, 0);
  assert.equal(fixedSave.hero.look, 'ember');
  assert.equal(fixedSave.quests.slimes.state, 'locked');
  assert.deepEqual(fixedSave.herbsTaken, [1]);
  assert.deepEqual(fixedSave.braziers, ['b1']);
  assert.ok(Math.hypot(...fixedSave.pos) <= R.WORLD.radius + 1e-9);
});

test('the world layout keeps everything reachable and off the trees and tents', () => {
  const trees = R.layoutTrees();
  assert.ok(trees.length > 500, `a real forest (${trees.length} trees)`);
  assert.deepEqual(R.layoutTrees().slice(0, 5), trees.slice(0, 5), 'deterministic');
  const solids = R.solidCircles(trees);
  const clear = (x, z, r, label) => {
    for (const s of solids) assert.ok(Math.hypot(x - s.x, z - s.z) >= s.r + r - 1e-6, `${label} at (${x.toFixed(1)}, ${z.toFixed(1)}) overlaps a solid at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
    assert.ok(Math.hypot(x, z) < R.WORLD.radius, `${label} inside the world`);
  };
  clear(R.WORLD.start.x, R.WORLD.start.z, 0.5, 'start');
  for (const [id, n] of Object.entries(R.NPCS)) clear(n.x, n.z, 0.4, id);
  R.WORLD.herbs.forEach(([x, z], i) => clear(x, z, 0.3, `herb ${i}`));
  for (const kind of Object.keys(R.WORLD.spawns)) {
    const spawns = R.enemySpawns(kind);
    assert.equal(spawns.length, R.WORLD.spawns[kind].count);
    for (const s of spawns) clear(s.x, s.z, R.ENEMIES[kind].radius * 0.8, `${kind} spawn`);
  }
  clear(R.WORLD.boss.x, R.WORLD.boss.z, R.ENEMIES.lampwight.radius, 'boss');
  // No tree stands on a path or in a clearing.
  for (const t of trees) {
    assert.ok(!R.nearPath(t.x, t.z), `tree on a path at (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`);
    for (const a of Object.values(R.WORLD.areas)) assert.ok(Math.hypot(t.x - a.x, t.z - a.z) > a.r, `tree in ${a.name}`);
  }
  // Each area's path really leads there.
  for (const id of ['glade', 'hollow', 'ruins']) {
    const a = R.WORLD.areas[id];
    assert.ok(R.WORLD.paths.some((p) => R.distToPath(a.x, a.z, p) < a.r), `a path to ${id}`);
    assert.equal(R.areaAt(a.x, a.z), id);
  }
  assert.equal(R.areaAt(30, -60), 'woods');
});

test('collision pushes out of solids and keeps you in the world', () => {
  const solids = [{ x: 0, z: 0, r: 1 }];
  const [x, z] = R.resolveCollision(0.2, 0, 0.5, solids);
  assert.ok(Math.hypot(x, z) >= 1.5 - 1e-9);
  const [fx, fz] = R.resolveCollision(500, 0, 0.5, []);
  assert.ok(Math.hypot(fx, fz) <= R.WORLD.radius + 1e-9);
});
