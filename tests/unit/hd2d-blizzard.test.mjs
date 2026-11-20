import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CombatMixin } from '../../src/hd2d/combat.js';

// A looping effect: update() keeps returning true, so only its zone can end it.
const loopingFx = () => {
  const f = { disposed: false, removed: false, update: () => true, dispose() { this.disposed = true; }, mesh: { removeFromParent() { f.removed = true; } } };
  return f;
};
const ring = () => ({ material: { opacity: 0, dispose() {} }, removeFromParent() {} });

test('a blizzard removes its looping vortex when it ends, and only then', () => {
  const vortex = loopingFx(), other = loopingFx();
  const game = Object.defineProperties({}, Object.getOwnPropertyDescriptors(CombatMixin));
  Object.assign(game, {
    t: 0,
    mode: 'menu',
    effects: [{ fx: vortex }, { fx: other }],
    zones: [{ kind: 'blizzard', owner: 'them', x: 0, z: 0, r: 4, t: 0, acc: 0, tick: 99, life: 1, fx: [vortex], ring: ring() }]
  });
  game.updateZones(0.5);
  assert.equal(game.zones.length, 1);
  assert.equal(vortex.disposed, false, 'still spinning while the blizzard lasts');
  game.updateZones(0.6);
  assert.equal(game.zones.length, 0);
  assert.equal(vortex.disposed, true);
  assert.equal(vortex.removed, true);
  assert.deepEqual(game.effects.map((e) => e.fx), [other], 'other effects are left alone');
});
