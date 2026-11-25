import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { aoSkips } from '../../src/city/aopass.js';

test('ambient occlusion sees only solid things: no dark card behind a puff, a word burst or a glow', () => {
  const plane = new THREE.PlaneGeometry(1, 1);
  // a dust puff and a comic word: sprites
  assert.equal(aoSkips(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }))), true);
  // a lamp's glow, a painted arrow, a halo: see-through and not writing depth
  assert.equal(aoSkips(new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }))), true);
  assert.equal(aoSkips(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial())), true);
  // a wall, a car, a rider fading by the camera (still writing depth): they shade the road
  assert.equal(aoSkips(new THREE.Mesh(plane, new THREE.MeshStandardMaterial())), false);
  assert.equal(aoSkips(new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 }))), false);
  // a mesh with one solid material of several still counts
  assert.equal(aoSkips(new THREE.Mesh(plane, [new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), new THREE.MeshStandardMaterial()])), false);
  // already hidden: left alone (and not "restored" visible afterwards)
  const hidden = new THREE.Sprite(new THREE.SpriteMaterial());
  hidden.visible = false;
  assert.equal(aoSkips(hidden), false);
});
