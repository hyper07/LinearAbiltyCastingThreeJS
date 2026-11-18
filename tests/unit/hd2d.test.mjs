import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../src/hd2d/rules.js';
import * as N from '../../src/hd2d/netcode.js';
import { personRows, NPC_ROWS_HANDMADE } from '../../src/hd2d/people.js';

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
  // A higher crit chance crits more.
  assert.equal(R.damage(20, 0, 1, fixed(0.3, 0.5), 0.35).crit, true);
  for (let i = 0; i < 50; i++) {
    const d = R.damage(100, 0, 1, fixed(0.5, i / 50));
    assert.ok(d.amount >= 90 && d.amount <= 110);
  }
});

test('XP curve rises, level-ups carry the remainder and refill health', () => {
  for (let l = 1; l < 10; l++) assert.ok(R.xpToNext(l + 1) > R.xpToNext(l));
  const h = R.newHero('warden');
  h.hp = 10;
  const need = R.xpToNext(1) + R.xpToNext(2);
  const { levels } = R.gainXp(h, need + 7);
  assert.equal(levels, 2);
  assert.equal(h.level, 3);
  assert.equal(h.xp, 7);
  assert.equal(h.hp, R.statsOf(h).maxHp);
  assert.equal(R.gainXp(h, 0).levels, 0);
  assert.equal(R.gainXp(h, -50).hero.xp, 7);
});

test('potions have no cooldown: every press drinks one while any are left', () => {
  const h = R.newHero();
  h.bag = [{ kind: 'hp', n: 3 }];
  h.hp = 1;
  const a = R.drinkPotion(h, 'hp');
  const b = R.drinkPotion(h, 'hp'); // straight away, no waiting
  const c = R.drinkPotion(h, 'hp');
  assert.ok(a.ok && b.ok && c.ok);
  assert.equal(R.potionCount(h, 'hp'), 0);
  assert.equal(h.hp, R.statsOf(h).maxHp);
  const d = R.drinkPotion(h, 'hp');
  assert.equal(d.ok, false);
  h.mp = 0;
  R.addToBag(h.bag, { kind: 'mp', n: 2 });
  assert.ok(R.drinkPotion(h, 'mp').ok && R.drinkPotion(h, 'mp').ok);
  assert.equal(h.mp, R.statsOf(h).maxMp);
  assert.equal(R.drinkPotion(h, 'nope').ok, false);
  // Food and scrolls: one used per press, each says what it does.
  R.addToBag(h.bag, { kind: 'bread', n: 1 });
  assert.equal(R.useConsumable(h, 'bread').effect, 'regen');
  assert.equal(R.useConsumable(h, 'bread').ok, false);
});

test('death sends you back with full health and a tenth of your gold gone', () => {
  const h = R.newHero();
  h.gold = 95;
  h.hp = 0;
  const lost = R.deathPenalty(h);
  assert.equal(lost, 9);
  assert.equal(h.gold, 86);
  assert.equal(h.hp, R.statsOf(h).maxHp);
  assert.equal(h.deaths, 1);
});

test('the shop takes gold or crystals, caps the charms, and puts potions in the bag', () => {
  const h = R.newHero();
  h.gold = 30;
  const before = R.potionCount(h, 'hp');
  assert.ok(R.buy(h, 'hp').ok);
  assert.equal(R.potionCount(h, 'hp'), before + 1);
  assert.equal(h.gold, 18);
  assert.equal(R.buy(h, 'charm-atk').ok, false); // no crystals
  h.crystals = 40;
  for (let i = 0; i < 3; i++) assert.ok(R.buy(h, 'charm-hp').ok);
  assert.equal(R.buy(h, 'charm-hp').ok, false);
  assert.equal(h.bonus.hp, 3);
  assert.equal(R.buy(h, 'mystery').ok, false);
});

/* ------------------------------------------------------------- classes */

test('four classes, each with its own four skills, stats and weapon', () => {
  assert.deepEqual(R.CLASS_ORDER, ['blade', 'warden', 'seer', 'ranger']);
  const all = new Set();
  for (const id of R.CLASS_ORDER) {
    const c = R.CLASSES[id];
    assert.equal(c.skills.length, 4, `${id} has four skills`);
    for (const s of c.skills) {
      const sk = R.SKILLS[s];
      assert.ok(sk, `${id}: ${s} exists`);
      assert.ok(sk.cost > 0 && sk.cost <= 40, `${s} costs something`);
      assert.ok(sk.cd > 0 && sk.cd <= 20, `${s} has a cooldown`);
      assert.ok(sk.pose && sk.icon && sk.desc && Array.isArray(sk.fx), `${s} has a pose, icon, description, effects`);
      assert.ok(!all.has(s), `${s} belongs to one class`);
      all.add(s);
    }
    // The start weapon is one the class may use, and has a combo.
    const w = R.newHero(id).equip.weapon;
    assert.ok(R.canUse(w, id), `${id} can use its start weapon`);
    assert.ok(R.comboFor(R.BASES[w.base].wtype).length >= 2);
  }
  // The classes really differ.
  const s = Object.fromEntries(R.CLASS_ORDER.map((c) => [c, R.heroStats(10, {}, null, c)]));
  assert.ok(s.warden.maxHp > s.blade.maxHp && s.warden.def > s.blade.def, 'the Warden is the tank');
  assert.ok(s.seer.maxMp > s.blade.maxMp && s.seer.maxHp < s.blade.maxHp, 'the Seer has mana, not health');
  assert.equal(s.ranger.resource, 'energy');
  assert.ok(s.ranger.crit > s.blade.crit);
  assert.equal(R.skillOnKey('seer', 2), 'blink');
  assert.equal(R.skillOnKey('blade', 9), null);
  // Weapon types change the combo: a dagger is quick, an axe heavy, a spear long.
  const avg = (w, k) => R.comboFor(w).reduce((a, s2) => a + s2[k], 0) / R.comboFor(w).length;
  assert.ok(avg('dagger', 'dur') < avg('shortsword', 'dur') && avg('shortsword', 'dur') < avg('axe', 'dur'));
  assert.ok(avg('axe', 'mult') > avg('shortsword', 'mult'));
  assert.ok(avg('spear', 'range') > avg('shortsword', 'range'));
  assert.ok(R.comboFor('staff').every((st) => st.proj === 'bolt') && R.comboFor('bow').every((st) => st.proj === 'arrow'));
  // Casting needs the resource and no cooldown.
  assert.deepEqual(R.canCast('nova', 100, 0), { ok: true });
  assert.equal(R.canCast('nova', 1, 0).reason, 'resource');
  assert.equal(R.canCast('nova', 100, 1).reason, 'cooldown');
  // Several looks per class, women and men.
  for (const id of R.CLASS_ORDER) {
    assert.ok(R.LOOKS[id].length >= 4);
    assert.ok(R.LOOKS[id].some((l) => l.sex === 'f') && R.LOOKS[id].some((l) => l.sex === 'm'));
  }
});

/* ----------------------------------------------------------- items */

test('items: rarity raises stats, affixes add more; level scales', () => {
  const r = () => 0.5;
  const c = R.makeItem('longsword', 'common', 5, r);
  const l = R.makeItem('longsword', 'legendary', 5, r);
  assert.ok(l.stats.atk > c.stats.atk);
  assert.equal(c.affixes.length, 0);
  assert.equal(l.affixes.length, 4);
  assert.ok(R.makeItem('longsword', 'common', 20, r).stats.atk > c.stats.atk);
  assert.equal(R.makeItem('nope'), null);
  // Every base can be made in every rarity.
  for (const b of Object.keys(R.BASES)) for (const rar of R.RARITY_ORDER) assert.ok(R.makeItem(b, rar, 3).name);
});

test('loot: rarity weights favour better tiers; elites and bosses always drop', () => {
  const tally = (tier) => {
    const rand = R.seeded(42);
    const n = Object.fromEntries(R.RARITY_ORDER.map((x) => [x, 0]));
    for (let i = 0; i < 4000; i++) n[R.rollRarity(tier, rand)]++;
    return n;
  };
  const normal = tally('normal'), elite = tally('elite'), boss = tally('boss');
  assert.ok(normal.common > normal.rare && normal.legendary === 0);
  assert.ok(elite.rare + elite.epic > normal.rare + normal.epic);
  assert.equal(boss.common, 0);
  assert.ok(boss.legendary > elite.legendary);
  const rand = R.seeded(7);
  assert.equal(R.rollLoot({ level: 5, tier: 'elite', cls: 'seer' }, rand).items.length, 2);
  assert.equal(R.rollLoot({ level: 5, tier: 'boss', cls: 'seer' }, rand).items.length, 3);
  let normals = 0;
  for (let i = 0; i < 1000; i++) normals += R.rollLoot({ level: 3, tier: 'normal' }, rand).items.length;
  assert.ok(normals > 100 && normals < 250, `about one kill in six drops gear (${normals}/1000)`);
  // Most drops suit the hero's class.
  let usable = 0;
  for (let i = 0; i < 300; i++) for (const it of R.rollLoot({ level: 3, tier: 'chest', cls: 'ranger' }, rand).items) usable += R.canUse(it, 'ranger') ? 1 : 0;
  assert.ok(usable > 300, `${usable} of 600 ranger drops usable`);
});

test('the bag stacks consumables, refuses more than fits, and keeps items whole', () => {
  const bag = [];
  assert.ok(R.addToBag(bag, { kind: 'hp', n: 5 }).ok);
  assert.ok(R.addToBag(bag, { kind: 'hp', n: 3 }).ok);
  assert.equal(bag.length, 1, 'stacks together');
  assert.equal(bag[0].n, 8);
  R.addToBag(bag, { kind: 'hp', n: R.STACK_MAX });
  assert.equal(bag.length, 2, 'a full stack starts another');
  assert.equal(R.countOf(bag, 'hp'), 8 + R.STACK_MAX);
  assert.equal(R.takeFromBag(bag, 'hp', 10), 10);
  assert.equal(R.countOf(bag, 'hp'), R.STACK_MAX - 2);
  while (bag.length < R.BAG_SIZE) bag.push(R.makeItem('ring', 'common', 1));
  const r = R.addToBag(bag, R.makeItem('ring', 'common', 1));
  assert.equal(r.ok, false);
  assert.match(r.reason, /full/);
  // A full bag still tops up a stack that has room.
  assert.ok(R.addToBag(bag, { kind: 'hp', n: 1 }).ok);
  assert.equal(R.addToBag(bag, { kind: 'mp', n: 1 }).ok, false);
});

test('equipment: totals, comparisons, class limits, two-handed weapons', () => {
  const h = R.newHero('blade');
  const before = R.statsOf(h);
  const sword = R.makeItem('longsword', 'rare', 5, () => 0.5);
  h.bag.push(sword);
  const cmp = R.compareItem(sword, h.equip);
  assert.ok(cmp.atk > 0, 'a better sword compares as more attack');
  assert.ok(R.equipFromBag(h, h.bag.indexOf(sword)).ok);
  assert.equal(h.equip.weapon, sword);
  assert.ok(h.bag.some((e) => e.base === 'shortsword'), 'the old sword goes to the bag');
  assert.equal(R.statsOf(h).atk, before.atk + cmp.atk);
  // The class decides what can be worn.
  const tower = R.makeItem('tower', 'common', 1);
  h.bag.push(tower);
  assert.equal(R.equipFromBag(h, h.bag.indexOf(tower)).ok, false);
  const plate = R.makeItem('plate', 'common', 1);
  assert.equal(R.canUse(plate, 'blade'), false);
  assert.equal(R.canUse(plate, 'warden'), true);
  assert.equal(R.canUse(R.makeItem('robe', 'common', 1), 'seer'), true);
  assert.equal(R.canUse(R.makeItem('staff', 'common', 1), 'warden'), false);
  // A two-handed weapon takes the off hand off.
  const w = R.newHero('blade');
  const buck = R.makeItem('buckler', 'common', 1);
  w.bag.push(buck);
  assert.ok(R.equipFromBag(w, w.bag.indexOf(buck)).ok);
  const ls = R.makeItem('longsword', 'common', 1);
  w.bag.push(ls);
  assert.ok(R.compareItem(ls, w.equip).def < 0, 'the comparison counts the shield you would lose');
  assert.ok(R.equipFromBag(w, w.bag.indexOf(ls)).ok);
  assert.equal(w.equip.offhand, null);
  assert.ok(w.bag.includes(buck));
  // Unequip and sell.
  assert.ok(R.unequip(w, 'weapon').ok);
  assert.equal(w.equip.weapon, null);
  const gold = w.gold;
  const got = R.sellFromBag(w, w.bag.indexOf(ls));
  assert.ok(got > 0 && w.gold === gold + got);
  assert.ok(R.buyPrice(ls) > R.sellPrice(ls));
  const stock = R.vendorStock({ level: 4, cls: 'seer', smith: true }, R.seeded(3));
  assert.ok(stock.length && stock.every((it) => R.canUse(it, 'seer')));
});

test('gear changes the look: each slot and type attaches the right parts', () => {
  const mk = (b, rarity = 'common') => R.makeItem(b, rarity, 1, () => 0.1);
  const look = R.gearLook({ weapon: mk('axe'), offhand: mk('kite', 'epic'), head: mk('hornhelm'), chest: mk('plate', 'rare'), hands: mk('gauntlets'), feet: mk('greaves') });
  assert.deepEqual(look.parts.sort(), ['cape@torso', 'head:horned@head', 'pauldron@armNeg', 'pauldron@armPos', 'shield:kite@armPos', 'weapon:axe@armNeg'].sort());
  assert.equal(look.offhand.glow, R.RARITIES.epic.glow, 'epic and better glow');
  assert.equal(look.weapon.glow, null);
  assert.ok(look.hands && look.feet, 'gloves and boots tint the hands and feet');
  // A bow hangs on the off arm; a staff in the main hand; a hood hides the hair; a robe has no cape.
  const seer = R.gearLook({ weapon: mk('staff'), head: mk('hood'), chest: mk('robe'), offhand: mk('tome') });
  assert.ok(seer.parts.includes('weapon:staff@armNeg') && seer.parts.includes('tome:tome@armPos') && !seer.parts.some((p) => p.startsWith('cape')));
  assert.equal(seer.head.hidesHair, true);
  assert.ok(R.gearLook({ weapon: mk('bow') }).parts.includes('weapon:bow@armPos'));
  assert.ok(R.gearLook({ weapon: mk('hammer') }).parts.includes('weapon:hammer@armNeg'), 'a hammer is drawn as a hammer');
  assert.equal(R.gearLook({ weapon: mk('longsword') }).weapon.twoHanded, true);
  assert.deepEqual(R.gearLook({}).parts, []);
  // Every weapon, shield and hat has a shape the rig draws.
  for (const b of Object.values(R.BASES)) {
    if (b.slot === 'weapon') assert.ok(['shortsword', 'longsword', 'dagger', 'axe', 'mace', 'hammer', 'spear', 'staff', 'bow'].includes(b.shape ?? b.wtype));
    if (b.slot === 'head') assert.ok(['hood', 'cap', 'wizard', 'circlet', 'open', 'horned', 'full'].includes(b.shape));
  }
  // The network carries the look intact.
  const back = N.unpackGear(N.packGear(look));
  assert.equal(back.weapon.shape, 'axe');
  assert.equal(back.offhand.shape, 'kite');
  assert.equal(back.head.shape, 'horned');
  assert.equal(back.chest.weight, 'heavy');
  assert.equal(N.unpackGear([['laser', '#ffffff']]).weapon, null, 'unknown shapes are refused');
});

/* ---------------------------------------------------------- enemies */

test('enemy definitions are sane and in a sensible difficulty order', () => {
  for (const [id, e] of Object.entries(R.ENEMIES)) {
    for (const k of ['hp', 'atk', 'speed', 'sight', 'leash', 'reach', 'windup', 'cooldown', 'radius', 'xp']) assert.ok(Number.isFinite(e[k]) && e[k] >= 0, `${id}.${k}`);
    assert.ok(e.windup >= 0.4, `${id} telegraphs its attack`);
    assert.ok(e.leash >= e.sight, `${id} leashes no closer than it notices`);
    assert.ok(e.gold[0] <= e.gold[1]);
    assert.ok(e.boss || Number.isFinite(e.respawn), `${id} respawns`);
    assert.ok(R.REALMS[e.realm], `${id} lives in a realm`);
  }
  assert.ok(R.ENEMIES.slime.level < R.ENEMIES.wolf.level && R.ENEMIES.wolf.level <= R.ENEMIES.wisp.level && R.ENEMIES.wisp.level < R.ENEMIES.lampwight.level);
  assert.ok(R.ENEMIES.lampwight.boss && R.ENEMIES.lampwight.hp > 10 * R.ENEMIES.wisp.hp);
  const drops = R.rollDrops('slime', fixed(0.99));
  assert.equal(drops.gold, 5);
  assert.equal(drops.crystals, 0);
  assert.equal(R.rollDrops('lampwight', fixed(0.5)).crystals, 5);
  // Each new realm has at least four monster kinds with different behaviours, and a boss with moves.
  for (const realm of ['sunmeadow', 'frostpeak', 'emberfall']) {
    const kinds = Object.values(R.ENEMIES).filter((e) => e.realm === realm && !e.boss);
    assert.ok(kinds.length >= 4, `${realm} has ${kinds.length} monster kinds`);
    assert.ok(new Set(kinds.map((e) => e.attack)).size >= 4, `${realm}'s monsters fight differently`);
    const boss = Object.values(R.ENEMIES).find((e) => e.realm === realm && e.boss);
    assert.ok(boss && boss.moves.length >= 3 && R.ENEMIES[boss.summon], `${realm} has a boss with moves and summons`);
    // Monsters get tougher realm by realm.
    assert.ok(Math.min(...kinds.map((e) => e.level)) > R.ENEMIES.wisp.level);
  }
  assert.equal(R.bossPhase(100, 100), 0);
  assert.equal(R.bossPhase(50, 100), 1);
  assert.equal(R.bossPhase(10, 100), 2);
  assert.ok(R.bossHp('matron', 3) > R.bossHp('matron', 1));
});

test('hero monsters: affixes, tougher stats, more loot', () => {
  const two = R.rollAffixes(R.seeded(5), 2);
  assert.equal(two.length, 2);
  assert.notEqual(two[0], two[1]);
  for (const a of two) assert.ok(R.ELITE_AFFIXES[a]);
  const def = R.ENEMIES.wolf;
  const e = R.eliteStats(def, ['frenzied', 'shielded', 'splitting', 'burning']);
  assert.ok(e.hp > def.hp * 3 && e.atk > def.atk);
  assert.ok(e.speed > def.speed && e.windup < def.windup && e.windup >= 0.4, 'frenzied: faster, still telegraphed');
  assert.ok(e.shield > 0 && e.split === 2 && e.aura > 0);
  assert.equal(R.eliteStats(def, []).shield, 0);
  assert.ok(R.rollDrops('wolf', fixed(0.5), { elite: true }).xp === def.xp * 4);
  assert.equal(R.eliteName('wolf', ['frenzied']), 'Frenzied Ashwolf');
  assert.equal(R.eliteName('wolf', ['frenzied'], 'Grimmaw'), 'Grimmaw');
});

/* ------------------------------------------------------------ quests */

test('the quest chains run from the first quest to the last realm’s boss', () => {
  const log = R.newQuestLog();
  const h = R.newHero();
  assert.equal(log.embers.state, 'available');
  assert.ok(R.QUESTS.slice(1).every((q) => log[q.id].state === 'locked'));
  assert.equal(R.npcMarker(log, 'wren'), '!');
  assert.equal(R.npcMarker(log, 'pell'), 'shop');
  assert.deepEqual(R.questEvent(log, 'gather', 'herb'), []);
  assert.equal(log.embers.progress, 0);
  for (const q of R.QUESTS) {
    assert.notEqual(log[q.id].state, 'locked', `${q.id} is open by the time its turn comes`);
    if (!q.auto) {
      const talk = R.dialogueFor(q.giver, log);
      assert.deepEqual(talk.action, { accept: q.id }, `${q.giver} offers ${q.id}`);
      assert.ok(R.acceptQuest(log, q.id));
    }
    assert.equal(log[q.id].state, 'active');
    let ready = [];
    for (let i = 0; i < q.goal.count; i++) ready = R.questEvent(log, q.goal.type, q.goal.target);
    assert.deepEqual(ready, [q.id]);
    assert.equal(R.npcMarker(log, q.giver), '?');
    R.questEvent(log, q.goal.type, q.goal.target);
    assert.equal(log[q.id].progress, q.goal.count);
    assert.deepEqual(R.dialogueFor(q.giver, log).action, { complete: q.id });
    const gold = h.gold;
    assert.ok(R.completeQuest(log, h, q.id));
    assert.equal(h.gold, gold + (q.reward.gold ?? 0));
    assert.equal(R.completeQuest(log, h, q.id), null, 'cannot hand in twice');
  }
  assert.ok(R.journeyOver(log));
  assert.equal(R.questsDone(log), R.QUESTS.length);
  assert.ok(h.level >= 15, `the quest rewards alone level you up (level ${h.level})`);
  for (const id of Object.keys(R.NPCS)) assert.ok(R.dialogueFor(id, log).lines.length > 0, `${id} has something to say`);
});

test('realms unlock with progress, one after another', () => {
  const log = R.newQuestLog();
  assert.deepEqual(R.unlockedRealms(log), ['lanternwood']);
  log.wolves.state = 'done';
  assert.deepEqual(R.unlockedRealms(log), ['lanternwood', 'sunmeadow']);
  log.gnarlroot.state = 'done';
  log.matron.state = 'done';
  assert.deepEqual(R.unlockedRealms(log), R.REALM_ORDER);
  assert.equal(R.realmUnlocked(log, 'atlantis'), false);
  // Each new realm has quests, people with something to sell, a boss and a waystone.
  for (const id of R.REALM_ORDER.slice(1)) {
    const L = R.REALMS[id].layout;
    assert.ok(R.questsIn(id).length >= 4, `${id} has quests`);
    assert.ok(R.npcsIn(id).length >= 4, `${id} has people`);
    assert.ok(R.npcsIn(id).some((n) => R.NPCS[n].shop), `${id} has a vendor`);
    assert.ok(R.npcsIn(id).some((n) => R.NPCS[n].child), `${id} has children`);
    assert.ok(L.boss && R.ENEMIES[L.boss.kind].boss);
    assert.ok(L.radius >= 2 * 74, `${id} is much larger than the old map`);
  }
  assert.ok(R.WORLD.radius > 74);
});

/* -------------------------------------------------------------- save */

test('a save round-trips, and broken saves are refused or repaired', () => {
  const g = R.newGame('seer', 'seer-c');
  g.hero.level = 4;
  g.hero.gold = 123;
  R.addToBag(g.hero.bag, { kind: 'hp', n: 5 });
  g.hero.bag.push(R.makeItem('wizard', 'epic', 4));
  g.quests.embers.state = 'done';
  g.quests.slimes.state = 'active';
  g.quests.slimes.progress = 3;
  g.herbsTaken = [0, 2, 5];
  g.braziers = ['b2'];
  g.pos = [10.5, -20.25];
  g.time = 321;
  g.chests = ['lw1'];
  const back = R.deserialize(R.serialize(g));
  assert.equal(back.hero.cls, 'seer');
  assert.equal(back.hero.look, 'seer-c');
  assert.equal(back.hero.level, 4);
  assert.equal(back.hero.gold, 123);
  assert.equal(R.potionCount(back.hero, 'hp'), 7);
  assert.equal(back.hero.bag.at(-1).rarity, 'epic');
  assert.equal(back.hero.equip.weapon.base, 'staff');
  assert.deepEqual(back.quests.slimes, { state: 'active', progress: 3 });
  assert.equal(back.quests.bramble.state, 'available', 'the new quests a save has earned open');
  assert.deepEqual(back.herbsTaken, [0, 2, 5]);
  assert.deepEqual(back.braziers, ['b2']);
  assert.deepEqual(back.pos, [10.5, -20.25]);
  assert.deepEqual(back.chests, ['lw1']);
  assert.equal(back.time, 321);
  assert.equal(R.deserialize('not json'), null);
  assert.equal(R.deserialize(JSON.stringify({ v: 99, hero: {} })), null);
  assert.equal(R.deserialize(null), null);
  // Tampered values are clamped or dropped.
  const bad = JSON.parse(R.serialize(g));
  Object.assign(bad.hero, { level: 9999, hp: -5, gold: 'lots', cls: 'pirate', look: 'pirate' });
  bad.hero.bag.push({ base: 'lightsaber' }, { kind: 'elixir', n: 3 }, { kind: 'hp', n: 9999 });
  bad.hero.equip.weapon = R.makeItem('tower', 'common', 1); // a shield in the weapon hand
  bad.quests.slimes = { state: 'hacked', progress: 99 };
  bad.herbsTaken = [1, 999, 'x'];
  bad.braziers = ['b1', 'nope'];
  bad.pos = [5000, 0];
  bad.realm = 'emberfall'; // not unlocked
  const fixedSave = R.deserialize(JSON.stringify(bad));
  assert.equal(fixedSave.hero.level, R.MAX_LEVEL);
  assert.equal(fixedSave.hero.hp, 1);
  assert.equal(fixedSave.hero.gold, 0);
  assert.equal(fixedSave.hero.cls, 'blade');
  assert.ok(!fixedSave.hero.bag.some((e) => e.base === 'lightsaber' || e.kind === 'elixir'));
  assert.ok(fixedSave.hero.bag.every((e) => !e.kind || e.n <= R.STACK_MAX));
  assert.notEqual(fixedSave.hero.equip.weapon?.base, 'tower');
  assert.equal(fixedSave.quests.slimes.state, 'available', 'a broken quest falls back to what the save has earned');
  assert.deepEqual(fixedSave.herbsTaken, [1]);
  assert.deepEqual(fixedSave.braziers, ['b1']);
  assert.equal(fixedSave.realm, 'lanternwood');
  assert.ok(Math.hypot(...fixedSave.pos) <= R.WORLD.radius + 1e-9);
});

test('an old (version 1) save is migrated, not wiped', () => {
  const v1 = {
    v: 1,
    hero: { look: 'moss', level: 6, xp: 50, hp: 140, mp: 30, gold: 210, crystals: 3, potions: { hp: 4, mp: 2 }, herbs: 6, bonus: { hp: 1, atk: 2 }, kills: 40, deaths: 2 },
    pos: [-30, 12],
    quests: { embers: { state: 'done', progress: 6 }, slimes: { state: 'done', progress: 6 }, wolves: { state: 'done', progress: 5 }, braziers: { state: 'active', progress: 1 }, lampwight: { state: 'locked', progress: 0 } },
    herbsTaken: [0, 1, 2, 3, 4, 5],
    braziers: ['b1'],
    bossDefeated: false,
    ended: false,
    time: 900
  };
  const s = R.deserialize(JSON.stringify(v1));
  assert.ok(s, 'the old save loads');
  assert.equal(s.v, R.SAVE_VERSION);
  assert.equal(s.migratedFrom, 1);
  assert.equal(s.hero.cls, 'warden', 'moss becomes a Warden');
  assert.equal(R.deserialize(JSON.stringify({ ...v1, hero: { ...v1.hero, look: 'frost' } })).hero.cls, 'seer');
  assert.equal(R.deserialize(JSON.stringify({ ...v1, hero: { ...v1.hero, look: 'ember' } })).hero.cls, 'blade');
  assert.equal(s.hero.level, 6);
  assert.equal(s.hero.gold, 210);
  assert.deepEqual(s.hero.bonus, { hp: 1, atk: 2 });
  assert.equal(R.potionCount(s.hero, 'hp'), 4, 'potions move into the bag');
  assert.equal(R.potionCount(s.hero, 'mp'), 2);
  assert.ok(s.hero.equip.weapon && s.hero.equip.offhand, 'the class’s gear is worn');
  assert.deepEqual(s.quests.braziers, { state: 'active', progress: 1 });
  assert.equal(s.quests.moles.state, 'available', 'wolves done opens Sunmeadow’s first quest');
  assert.ok(R.realmUnlocked(s.quests, 'sunmeadow'));
  assert.deepEqual(s.pos, [-30, 12]);
  assert.deepEqual(s.braziers, ['b1']);
  assert.equal(s.time, 900);
});

/* ------------------------------------------------------------- world */

test('the world layout keeps everything reachable and off the trees and tents', () => {
  const trees = R.layoutTrees();
  assert.ok(trees.length > 1500, `a real forest (${trees.length} trees)`);
  assert.deepEqual(R.layoutTrees().slice(0, 5), trees.slice(0, 5), 'deterministic');
  const solids = R.solidCircles(trees);
  const clear = (x, z, r, label, sol = solids, bound = R.WORLD.radius) => {
    for (const s of sol) assert.ok(Math.hypot(x - s.x, z - s.z) >= s.r + r - 1e-6, `${label} at (${x.toFixed(1)}, ${z.toFixed(1)}) overlaps a solid at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
    assert.ok(Math.hypot(x, z) < bound, `${label} inside the world`);
  };
  clear(R.WORLD.start.x, R.WORLD.start.z, 0.5, 'start');
  for (const id of R.npcsIn('lanternwood')) clear(R.NPCS[id].x, R.NPCS[id].z, 0.4, id);
  R.WORLD.herbs.forEach(([x, z], i) => clear(x, z, 0.3, `herb ${i}`));
  for (const kind of ['slime', 'wolf', 'wisp']) {
    const spawns = R.enemySpawns(kind);
    assert.equal(spawns.length, R.WORLD.spawns[kind].count);
    for (const s of spawns) clear(s.x, s.z, R.ENEMIES[kind].radius * 0.8, `${kind} spawn`);
  }
  clear(R.WORLD.boss.x, R.WORLD.boss.z, R.ENEMIES.lampwight.radius, 'boss');
  for (const t of trees) {
    assert.ok(!R.nearPath(t.x, t.z), `tree on a path at (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`);
    for (const a of Object.values(R.WORLD.areas)) assert.ok(Math.hypot(t.x - a.x, t.z - a.z) > a.r, `tree in ${a.name}`);
  }
  for (const id of ['glade', 'hollow', 'ruins', 'waystone', 'bramble', 'mere']) {
    const a = R.WORLD.areas[id];
    assert.ok(R.WORLD.paths.some((p) => R.distToPath(a.x, a.z, p) < a.r), `a path to ${id}`);
    assert.equal(R.areaAt(a.x, a.z), id);
  }
  assert.equal(R.areaAt(30, -80), 'woods');
  // Every other realm too: the start, the people, the spawns, the gather points and chests are clear.
  for (const realm of R.REALM_ORDER.slice(1)) {
    const L = R.REALMS[realm].layout;
    const t2 = R.treesFor(realm);
    assert.ok(t2.length > 1000, `${realm} has flora (${t2.length})`);
    const sol = R.solidsFor(realm, t2);
    clear(L.start.x, L.start.z, 0.5, `${realm} start`, sol, L.radius);
    for (const id of R.npcsIn(realm)) clear(R.NPCS[id].x, R.NPCS[id].z, 0.4, `${realm} ${id}`, sol, L.radius);
    for (const s of R.realmSpawns(realm, sol)) clear(s.x, s.z, R.ENEMIES[s.kind].radius * 0.8 - 0.05, `${realm} ${s.kind}`, sol, L.radius);
    for (const [x, z] of L.gather.points) clear(x, z, 0.3, `${realm} gather`, sol.filter((s) => !L.chests.some((c) => c.x === s.x && c.z === s.z)), L.radius);
    for (const id of Object.keys(L.areas)) {
      const a = L.areas[id];
      if (id !== Object.keys(L.areas)[0]) assert.ok(L.paths.some((p) => R.distToPath(a.x, a.z, p) < a.r + 2), `${realm}: a path to ${id}`);
    }
    assert.ok(R.realmSpawns(realm, sol).filter((s) => s.elite).length >= 2, `${realm} has named hero monsters`);
  }
});

test('collision pushes out of solids and keeps you in the world', () => {
  const solids = [{ x: 0, z: 0, r: 1 }];
  const [x, z] = R.resolveCollision(0.2, 0, 0.5, solids);
  assert.ok(Math.hypot(x, z) >= 1.5 - 1e-9);
  const [fx, fz] = R.resolveCollision(500, 0, 0.5, []);
  assert.ok(Math.hypot(fx, fz) <= R.WORLD.radius + 1e-9);
  const [gx, gz] = R.resolveCollision(500, 0, 0.5, [], 150);
  assert.ok(Math.abs(Math.hypot(gx, gz) - 150) < 1e-9);
});

/* ------------------------------------------------------------ people */

test('every person has their own letter map, in the rig’s shape', () => {
  const maps = new Map();
  const check = (id, rows) => {
    assert.equal(rows.length, 19, `${id}: 16 rows of body and 3 of legs`);
    assert.ok(rows.every((r) => r.length === 16), `${id}: 16 wide`);
    // Arms only in the outer three columns of the body rows; legs at the bottom.
    for (let y = 10; y < 16; y++) for (const c of [0, 15]) assert.ok(true, rows[y][c]);
    assert.ok(/[^.]/.test(rows[18]), `${id} has feet`);
    const key = rows.join('|');
    assert.ok(![...maps.values()].includes(key), `${id} looks like someone else`);
    maps.set(id, key);
  };
  for (const id of Object.keys(R.NPCS)) check(id, NPC_ROWS_HANDMADE[id] ?? personRows(R.NPCS[id].look));
  for (const l of Object.values(R.LOOKS).flat()) check(l.id, personRows(l));
});

/* ----------------------------------------------------------- co-op */

test('co-op messages: monsters and heroes round-trip, and junk is refused', () => {
  const foe = { nid: 7, kind: 'icefang', x: 12.34, z: -5.67, hp: 150, maxHp: 220, state: 'windup', face: 1.234, lift: 0, tele: { shape: 'rect', x: 1, z: 2, r: 1.2, k: 0.5, a: 0.3, len: 6 }, elite: { name: 'Whitemaw', affixes: ['chilling', 'frenzied'] }, shield: 40 };
  const back = N.unpackFoe(JSON.parse(JSON.stringify(N.packFoe(foe))));
  assert.equal(back.nid, 7);
  assert.equal(back.kind, 'icefang');
  assert.equal(back.x, 12.3);
  assert.equal(back.state, 'windup');
  assert.equal(back.tele.shape, 'rect');
  assert.equal(back.tele.len, 6);
  assert.deepEqual(back.elite, { name: 'Whitemaw', affixes: ['chilling', 'frenzied'] });
  assert.equal(back.shield, 40);
  assert.equal(N.unpackFoe([1, 999, 0, 0]), null);
  assert.equal(N.unpackFoe('x'), null);
  const me = N.readHero({ n: 'A<script>name', c: 'seer', r: 'frostpeak', lk: 'seer-a', lv: 12, hp: 50, mhp: 100, x: 9999, z: 3, f: 1, a: [1, 'thrust', 0.5, -1, -1, -1, 0, 0], h: [[7, 99999999, 1, 0, 0, 'stun', 2], ['bad'], [8, 30, 0, 1, 1, 'explode', 1]], ev: [{ k: 'swing' }, 'junk'] });
  assert.equal(me.name, 'Ascriptname');
  assert.equal(me.x, 400);
  assert.equal(me.act.swing.pose, 'thrust');
  assert.equal(me.act.spin, null);
  assert.equal(me.hits.length, 2);
  assert.equal(me.hits[0].amount, 20000, 'damage is capped');
  assert.equal(me.hits[0].effect, 'stun');
  assert.equal(me.hits[1].effect, null, 'unknown effects are dropped');
  assert.equal(me.events.length, 1);
  assert.equal(N.readHero({ c: 'pirate', r: 'frostpeak' }), null);
  assert.equal(N.readHero({ c: 'seer', r: 'mars' }), null);
  const tick = N.readTick({ r: 'emberfall', f: [N.packFoe({ ...foe, kind: 'golem' }), 'bad'], ev: [{ k: 'kill', nid: 7 }, null] });
  assert.equal(tick.foes.length, 1);
  assert.equal(tick.events.length, 1);
  assert.equal(N.readTick({ r: 'nowhere' }), null);
});
