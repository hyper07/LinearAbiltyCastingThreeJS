import { test } from 'node:test';
import assert from 'node:assert/strict';
import { platform } from '../../src/platform/index.js';
import { Profile, BAG_COLS } from '../../src/items/Profile.js';
import { itemSize } from '../../src/items/Items.js';

platform.bootstrap();

const ring = (uid) => ({ uid, type: 'gear', kind: 'ring', group: 'ring', base: 'band', name: `Band ${uid}`, rarity: 'common', stats: {} });
const helm = (uid) => ({ uid, type: 'gear', kind: 'head', group: 'plate', base: 'plate-head', name: `Helm ${uid}`, rarity: 'common', stats: {} });
const weaponId = () => platform.weapons.all().find((w) => w.id !== 'unarmed').id;
const blade = (uid) => ({ uid, type: 'weapon', weapon: weaponId(), name: `Blade ${uid}`, rarity: 'common', stats: {} });

const fresh = () => new Profile({ storage: null });

test('a ring dragged onto the second finger goes there', () => {
  const p = fresh();
  p.pickUp(ring('a'));
  p.pickUp(ring('b'));
  assert.ok(p.equip('a', 'ring2'));
  assert.equal(p.gear.ring2?.uid, 'a');
  assert.equal(p.gear.ring1, null);
  // A slot the piece does not go in is ignored: it goes where it belongs.
  assert.ok(p.equip('b', 'head'));
  assert.equal(p.gear.ring1?.uid, 'b');
});

test('taking gear off by dragging puts it in the cell it was dropped on', () => {
  const p = fresh();
  p.pickUp(helm('h'));
  p.equip('h');
  const [w, h] = itemSize(helm('h'));
  const x = BAG_COLS - w;
  assert.ok(p.unequipGear('head', x, 1));
  assert.deepEqual(p.bag.find((it) => it.uid === 'h').at, [x, 1]);
  assert.equal(p.gear.head, null);
  assert.ok(h >= 1);
});

test('the weapon in hand goes back into the bag at a chosen cell', () => {
  const p = fresh();
  p.pickUp(blade('w'));
  p.equip('w');
  assert.equal(p.equipped?.uid, 'w');
  assert.ok(p.unequip(5, 0));
  assert.deepEqual(p.bag.find((it) => it.uid === 'w').at, [5, 0]);
  assert.equal(p.equipped, null);
});

test('worn things can be dropped; a plain remove leaves them on', () => {
  const p = fresh();
  p.pickUp(helm('h'));
  p.equip('h');
  let gear = 0;
  p.on('gear', () => gear++);
  assert.equal(p.remove('h'), null, 'remove alone only looks in the bag and the stash');
  assert.equal(p.gear.head?.uid, 'h');
  assert.equal(p.remove('h', { worn: true })?.uid, 'h');
  assert.equal(p.gear.head, null);
  assert.equal(gear, 1, 'the character takes it off');
  p.pickUp(blade('w'));
  p.equip('w');
  assert.equal(p.remove('w', { worn: true })?.uid, 'w');
  assert.equal(p.equipped, null);
});

test('a full bag takes nothing more until room is made', () => {
  const p = fresh();
  let n = 0;
  while (p.pickUp(helm(`f${n}`)).ok) n++;
  assert.ok(n > 0);
  const refused = p.pickUp(helm('extra'));
  assert.equal(refused.ok, false);
  assert.match(refused.message, /No room in your bag/);
  assert.match(refused.message, /drop/);
  assert.equal(p.canPickUp(helm('extra')).ok, false);
  // Drop one and it fits.
  p.remove('f0');
  assert.equal(p.pickUp(helm('extra')).ok, true);
});
