import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorTarget, MIRROR_RANGE } from '../../src/snowpuff/sideMirror.js';

// Heading down +z (fx 0, fz 1): ahead is +z, behind is −z, my right is −x, my left is +x.
const me = { x: 0, z: 0, fx: 0, fz: 1 };

test('side mirror: a rider right behind me shows, straight back', () => {
  const t = mirrorTarget(me, [{ x: 0, z: -6, name: 'Pip' }]);
  assert.equal(t.rider.name, 'Pip');
  assert.ok(Math.abs(t.bearing) < 1e-9);
  assert.equal(Math.round(t.d), 6);
});

test('side mirror: a rider drawing level to pass shows, on their side', () => {
  const l = mirrorTarget(me, [{ x: 2.5, z: 0.4 }]);
  assert.equal(l.side, 'left');
  assert.ok(l.bearing > 0);
  const r = mirrorTarget(me, [{ x: -2.5, z: 0.4 }]);
  assert.equal(r.side, 'right');
  assert.ok(r.bearing < 0);
});

test('side mirror: nobody ahead, too far back, or on top of me', () => {
  assert.equal(mirrorTarget(me, [{ x: 0, z: 8 }]), null, 'ahead is on screen already');
  assert.equal(mirrorTarget(me, [{ x: 0, z: -(MIRROR_RANGE + 1) }]), null);
  assert.equal(mirrorTarget(me, [{ x: 0.1, z: -0.1 }]), null);
  assert.equal(mirrorTarget(me, []), null);
});

test('side mirror: the nearest rider behind, whichever way the run turns', () => {
  const h = 0.9; // heading: x = sin, z = −cos (Snowpuff's convention)
  const fx = Math.sin(h), fz = -Math.cos(h);
  const at = (k) => ({ x: 50 + fx * k, z: 50 + fz * k });
  const t = mirrorTarget({ x: 50, z: 50, fx, fz }, [{ ...at(-12), name: 'far' }, { ...at(-4), name: 'near' }, { ...at(5), name: 'ahead' }]);
  assert.equal(t.rider.name, 'near');
});
