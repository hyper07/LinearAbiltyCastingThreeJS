import { test } from 'node:test';
import assert from 'node:assert/strict';
import { platform } from '../../src/platform/index.js';
import { Profile, profileDigest } from '../../src/items/Profile.js';
import { SLOT_COUNT, treeFor } from '../../src/platform/skill/tree.js';
import { isSkillEntry, potionOf } from '../../src/items/hotbar.js';

platform.bootstrap();

const fresh = (data) => new Profile({ storage: null, data });

test('a new character: skills on 1–5, health potion on 6, focus potion on 7, nine keys', () => {
  const p = fresh();
  p.setClass('mage', {});
  assert.equal(SLOT_COUNT, 9);
  assert.equal(p.slots.length, 9);
  assert.equal(p.slots[5], 'potion:health');
  assert.equal(p.slots[6], 'potion:focus');
  const start = treeFor('mage').start;
  assert.deepEqual(p.slots.slice(0, start.length), start);
  assert.ok(p.slots.slice(0, 5).every((s) => s === null || isSkillEntry(s)));
});

test('a save from the five-key bar gets four more keys, with the potions on 6 and 7', () => {
  const start = treeFor('mage').start;
  const old = [...start, ...Array(5 - start.length).fill(null)];
  const p = fresh({ progress: { mage: { ranks: Object.fromEntries(start.map((e) => [e, 1])), slots: [...old] } } });
  p.setClass('mage', {});
  assert.equal(p.slots.length, 9);
  assert.deepEqual(p.slots.slice(0, 5), old);
  assert.deepEqual(p.slots.slice(5), ['potion:health', 'potion:focus', null, null]);
  // Saved and loaded again, nothing more is added: a potion taken off the bar stays off.
  p.clearSlot(6);
  const again = fresh(JSON.parse(JSON.stringify(p.serialize())));
  again.setClass('mage', {});
  assert.deepEqual(again.slots, p.slots);
});

test('any key takes a skill or a potion; putting one on another key swaps or moves it', () => {
  const p = fresh();
  p.setClass('mage', {});
  const first = p.slots[0];
  // The health potion onto key 1: the skill goes to key 6, where the potion was.
  assert.equal(p.setSlot(0, 'potion:health'), true);
  assert.equal(p.slots[0], 'potion:health');
  assert.equal(p.slots[5], first);
  // Onto an empty key: it moves, leaving its key empty.
  assert.equal(p.setSlot(8, 'potion:focus'), true);
  assert.equal(p.slots[8], 'potion:focus');
  assert.equal(p.slots[6], null);
  // Not a skill this class knows, or not a potion there is: refused.
  assert.equal(p.setSlot(2, 'potion:poison'), false);
  assert.equal(p.setSlot(2, 'not-a-skill'), false);
  assert.equal(p.setSlot(9, 'potion:health'), false);
  assert.equal(potionOf('potion:health'), 'health');
  assert.equal(potionOf('fire'), null);
});

test('the bar travels with the character: same digest on both sides after a reload', () => {
  const p = fresh();
  p.setClass('mage', {});
  p.setSlot(3, 'potion:health');
  const copy = fresh(JSON.parse(JSON.stringify(p.serialize())));
  copy.setClass('mage', {});
  assert.equal(profileDigest(copy), profileDigest(p));
});

test('putting a skill on another key really moves it (the keys are not copied on the way)', () => {
  const p = fresh();
  p.setClass('mage', {});
  const [a, b] = treeFor('mage').start;
  assert.equal(p.setSlot(4, b), true);
  assert.equal(p.slots[4], b);
  assert.equal(p.slots[1], null, 'moved onto an empty key, it leaves its own key empty');
  assert.equal(p.setSlot(4, a), true);
  assert.deepEqual([p.slots[0], p.slots[4]], [b, a], 'onto a taken key, the two swap');
});
