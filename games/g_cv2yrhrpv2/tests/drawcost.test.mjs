import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeStatic, trimShadows, DetailCull, DETAIL_LAYER, SHADOW_MIN } from '../drawcost.js';

/** Every vertex of every mesh under `root`, in `root`'s space (for comparing pictures before and after). */
function box(root) {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root, true);
}

test('mergeStatic: many little parts become one mesh a material, in the same places', () => {
  const stone = new THREE.MeshLambertMaterial();
  const red = new THREE.MeshLambertMaterial();
  const g = new THREE.Group();
  const sub = new THREE.Group();
  sub.position.set(10, 2, 0);
  sub.rotation.y = 0.7;
  g.add(sub);
  const col = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(col, i % 3 ? red : stone);
    c.position.set(i * 2, 1.5, 0);
    (i % 2 ? sub : g).add(c);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), stone));
  // a part that moves on its own stays as it is
  const lod = new THREE.LOD();
  lod.addLevel(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stone), 0);
  g.add(lod);
  const before = box(g);
  const merged = mergeStatic(g);
  assert.equal(merged, 13);
  let meshes = 0;
  g.traverse((o) => o.isMesh && !o.parent.isLOD && meshes++);
  assert.equal(meshes, 2, 'one mesh for the stone, one for the red');
  assert.ok(lod.parent === g && lod.levels[0].object.isMesh, 'the LOD left alone');
  const after = box(g);
  assert.ok(before.min.distanceTo(after.min) < 1e-4 && before.max.distanceTo(after.max) < 1e-4, 'the same picture');
});

test('trimShadows: parts under a shadow-map texel stop casting; the body still does', () => {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial());
  const bolt = new THREE.Mesh(new THREE.SphereGeometry(SHADOW_MIN * 0.5), body.material);
  body.castShadow = bolt.castShadow = true;
  root.add(body, bolt);
  assert.equal(trimShadows(root), 1);
  assert.ok(body.castShadow && !bolt.castShadow);
});

test('DetailCull: a part goes once it is under a pixel on the screen, and comes back as you near it', () => {
  const root = new THREE.Group();
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshBasicMaterial());
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), eye.material);
  root.add(eye, head);
  const cull = new DetailCull();
  cull.add(root);
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const seen = (o) => o.layers.test(cam.layers);
  cam.position.set(0, 0, 3);
  cam.updateMatrixWorld();
  cull.update(cam, 720);
  assert.ok(seen(eye) && seen(head), 'near: all of it');
  cam.position.set(0, 0, 60);
  cam.updateMatrixWorld();
  cull.update(cam, 720);
  assert.ok(!seen(eye) && seen(head), 'far: the eye under a pixel is gone, the head (never small) stays');
  assert.ok(eye.layers.isEnabled(DETAIL_LAYER), 'a close-up camera still sees it');
  assert.ok(eye.visible, 'its own visible flag untouched');
  cam.position.set(0, 0, 3);
  cam.updateMatrixWorld();
  cull.update(cam, 720);
  assert.ok(seen(eye), 'back again');
  cull.remove(root);
});
