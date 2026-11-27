import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorTarget, PANEL_RANGE } from '../../games/g_cv2yrhrpv2/rivalPanel.js';

// Kickrani's heading convention: 0 is north (−z), so going north fx 0, fz −1: ahead is −z, behind +z,
// my right is +x, my left −x.
const me = { x: 0, z: 0, fx: 0, fz: -1 };

test('rival panel: a rider right behind me shows, straight back', () => {
  const t = mirrorTarget(me, [{ x: 0, z: 6, id: 'pip' }]);
  assert.equal(t.rider.id, 'pip');
  assert.ok(Math.abs(t.bearing) < 1e-9);
  assert.equal(Math.round(t.d), 6);
});

test('rival panel: a rider drawing level to pass shows, on their side', () => {
  const r = mirrorTarget(me, [{ x: 2.5, z: -0.4 }]);
  assert.equal(r.side, 'right');
  const l = mirrorTarget(me, [{ x: -2.5, z: -0.4 }]);
  assert.equal(l.side, 'left');
  assert.ok(l.bearing > 0 && r.bearing < 0);
});

test('rival panel: nobody ahead, too far back, or on top of me', () => {
  assert.equal(mirrorTarget(me, [{ x: 0, z: -8 }]), null, 'ahead is on screen already');
  assert.equal(mirrorTarget(me, [{ x: 0, z: PANEL_RANGE + 1 }]), null);
  assert.equal(mirrorTarget(me, [{ x: 0.1, z: 0.1 }]), null);
  assert.equal(mirrorTarget(me, []), null);
});

test('rival panel: the nearest rider behind, whichever way the course turns', () => {
  const h = 0.9;
  const fx = -Math.sin(h);
  const fz = -Math.cos(h);
  const at = (k) => ({ x: 50 + fx * k, z: 50 + fz * k });
  const t = mirrorTarget({ x: 50, z: 50, fx, fz }, [{ ...at(-12), id: 'far' }, { ...at(-4), id: 'near' }, { ...at(5), id: 'ahead' }]);
  assert.equal(t.rider.id, 'near');
});
