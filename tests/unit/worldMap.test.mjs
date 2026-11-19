import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapView, Waypoint, MAP_KEY } from '../../src/shared/worldMap.js';

const EXT = { x0: -200, x1: 160, z0: -400, z1: 170 }; // Gloamreach's: 360 × 570 m
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('map view: world ↔ screen round trip, north up, the whole map fits at zoom 1', () => {
  const v = new MapView(EXT);
  v.setSize(800, 600);
  assert.ok(near(v.scale, Math.min(800 / 360, 600 / 570)));
  for (const [x, z] of [[0, 0], [-200, -400], [160, 170], [37.5, -123.25]]) {
    const [sx, sy] = v.toScreen(x, z);
    const [wx, wz] = v.toWorld(sx, sy);
    assert.ok(near(wx, x) && near(wz, z));
  }
  // North (−z) is up the screen, east (+x) to the right.
  assert.ok(v.toScreen(0, -100)[1] < v.toScreen(0, 100)[1]);
  assert.ok(v.toScreen(100, 0)[0] > v.toScreen(-100, 0)[0]);
  // At zoom 1 the map's corners are on screen.
  const [ax, ay] = v.toScreen(EXT.x0, EXT.z0);
  const [bx, by] = v.toScreen(EXT.x1, EXT.z1);
  assert.ok(ax >= -1e-6 && ay >= -1e-6 && bx <= 800 + 1e-6 && by <= 600 + 1e-6);
});

test('map view: zoom stays 1…max and keeps the point under the pointer', () => {
  const v = new MapView(EXT, { maxZoom: 8 });
  v.setSize(800, 600);
  v.zoomAt(1 / 4);
  assert.equal(v.zoom, 1);
  for (let i = 0; i < 20; i++) v.zoomAt(1.5, 400, 300);
  assert.equal(v.zoom, 8);
  const w = new MapView(EXT);
  w.setSize(800, 600);
  w.centerOn(0, 0);
  w.zoomAt(2, 500, 250);
  const before = w.toWorld(500, 250);
  w.zoomAt(1.5, 500, 250);
  const after = w.toWorld(500, 250);
  assert.ok(near(before[0], after[0], 1e-6) && near(before[1], after[1], 1e-6), 'the spot under the pointer stays put');
});

test('map view: panning stops at the map\'s edges; a map smaller than the view stays centred', () => {
  const v = new MapView(EXT);
  v.setSize(800, 600);
  v.zoomAt(4);
  v.pan(1e6, 1e6);
  const [lx, ty] = v.toScreen(EXT.x0, EXT.z0);
  assert.ok(near(lx, 0, 1e-6) && near(ty, 0, 1e-6), 'dragged right and down as far as it goes: the top-left corner is pinned');
  v.pan(-1e7, -1e7);
  const [rx, by] = v.toScreen(EXT.x1, EXT.z1);
  assert.ok(near(rx, 800, 1e-6) && near(by, 600, 1e-6));
  // At zoom 1 the map is narrower than the view: centred, and dragging can't move it sideways.
  const w = new MapView(EXT);
  w.setSize(800, 600);
  w.pan(300, 0);
  assert.ok(near(w.cx, (EXT.x0 + EXT.x1) / 2));
  w.centerOn(9999, -9999);
  assert.ok(w.cx <= EXT.x1 && w.cz >= EXT.z0);
});

test('waypoint: a click sets it, a click on it clears it, a click elsewhere moves it', () => {
  const wp = new Waypoint();
  const seen = [];
  wp.onChange((p) => seen.push(p));
  assert.equal(wp.point, null);
  assert.deepEqual(wp.click(10, 20, 5), { x: 10, z: 20 });
  assert.deepEqual(wp.click(40, 20, 5), { x: 40, z: 20 }, 'elsewhere: moved');
  assert.equal(wp.click(42, 21, 5), null, 'on it: cleared');
  assert.equal(wp.point, null);
  wp.set(0, 0);
  const d = wp.from(3, 4);
  assert.ok(near(d.dist, 5) && near(d.bearing, Math.atan2(-3, -4)));
  wp.clear();
  assert.equal(wp.from(0, 0), null);
  assert.equal(seen.length, 5);
  assert.equal(MAP_KEY, 'KeyO');
});
