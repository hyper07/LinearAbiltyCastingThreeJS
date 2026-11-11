import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSION, cooldownFor, globalCooldown, levelCooldownFactor, manaCost, manaRegen, maxMana } from '../../src/game/progression.js';
import { settings } from '../../src/config/settings.js';
import { skillDetails } from '../../src/platform/skill/info.js';

test('mana: big spells cost more, ranks a little more, Rage classes nothing', () => {
  assert.ok(manaCost('hail') > manaCost('ice'));
  assert.equal(manaCost('ice', 1), PROGRESSION.manaCost.ice);
  assert.ok(manaCost('ice', 10) > manaCost('ice', 1));
  assert.equal(manaCost('slam', 3, { rage: true }), 0);
  assert.ok(maxMana(20) > maxMana(1) && manaRegen(20) > manaRegen(1), 'more mana and faster regen with level');
});

test('cooldowns and the pause between casts: longer at level 1, shorter with level and rank, with floors', () => {
  assert.equal(levelCooldownFactor(1), PROGRESSION.cooldownScale);
  assert.ok(levelCooldownFactor(20) < levelCooldownFactor(1));
  assert.equal(levelCooldownFactor(999), PROGRESSION.cooldownFloor, 'never faster than the floor');
  assert.ok(cooldownFor('ice', { level: 1 }) > settings.ice.cooldown * 2, 'casting is slower than it was');
  assert.ok(cooldownFor('ice', { level: 1, rank: 10 }) < cooldownFor('ice', { level: 1, rank: 1 }), 'ranks shorten it');
  assert.equal(globalCooldown(1), PROGRESSION.globalCooldown);
  assert.equal(globalCooldown(999), PROGRESSION.globalFloor);
});

test('the skill card shows the real cost and cooldown for the character', () => {
  const low = skillDetails('meteor', 1, { level: 1 });
  const high = skillDetails('meteor', 1, { level: 25 });
  assert.equal(low.mana, PROGRESSION.manaCost.meteor);
  assert.ok(low.effects.some((e) => /Costs \d+ mana/.test(e)));
  assert.ok(high.cooldown < low.cooldown);
  assert.equal(skillDetails('slam', 1, { rage: true }).mana, 0);
});
