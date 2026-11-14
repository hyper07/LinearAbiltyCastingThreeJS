import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, USES, encodeTile, decodeTile, simplify, area2, heightOf, useOf, tileOf, tileKey } from '../../src/city/tiles.js';

test('Seoul tiles: a building survives being written and read back', () => {
  const [tx, ty] = tileOf(198050, 551860);
  assert.equal(tileKey(tx, ty), '396_1103');
  const ox = tx * TILE;
  const oy = ty * TILE;
  const tower = { ring: [ox + 10, oy + 10, ox + 40, oy + 10, ox + 40, oy + 30, ox + 10, oy + 30], height: 123.4, use: 3, name: '시청 옆 타워' };
  const house = { ring: [ox + 100.25, oy + 200.5, ox + 108, oy + 200.5, ox + 104, oy + 209.75], height: 4, use: 0 };
  const spill = { ring: [ox + 495, oy + 495, ox + 530, oy + 495, ox + 530, oy + 520, ox + 495, oy + 520], height: 700, use: 6, name: 'Edge' };
  const bytes = encodeTile(tx, ty, [tower, house, spill], { place: '중구 태평로1가' });
  const back = decodeTile(bytes);
  assert.equal(back.place, '중구 태평로1가');
  assert.equal(back.buildings.length, 3);
  assert.deepEqual([...back.buildings[0].ring], [10, 10, 40, 10, 40, 30, 10, 30]);
  assert.ok(Math.abs(back.buildings[0].height - 123.4) < 0.06);
  assert.equal(back.buildings[0].name, '시청 옆 타워');
  assert.equal(back.buildings[1].name, null);
  assert.ok(Math.abs(back.buildings[1].ring[0] - 100.25) <= 0.06 && Math.abs(back.buildings[1].ring[5] - 209.75) <= 0.06, 'to the decimetre');
  assert.equal(back.buildings[2].name, 'Edge', 'names line up after an unnamed building');
  assert.equal(back.buildings[2].ring[2], 530, 'a footprint may reach past its tile');
  assert.throws(() => decodeTile(new Uint8Array(16)), /Not a Seoul tile/);
});

test('Seoul tiles: fewer points, the same shape; heights and uses from what the register says', () => {
  // A square with needless points along its sides, and one real notch.
  const ring = [0, 0, 5, 0.05, 10, 0, 10, 5, 10, 10, 5, 10, 5, 7, 4, 7, 4, 10, 0, 10, 0, 5];
  const slim = simplify(ring, 0.4);
  assert.ok(slim.length < ring.length && slim.length >= 16, `${ring.length / 2} → ${slim.length / 2} points`);
  assert.ok(Math.abs(Math.abs(area2(slim)) - Math.abs(area2(ring))) < 2, 'the area hardly changes');
  assert.deepEqual(simplify([0, 0, 1, 0, 1, 1], 0.4), [0, 0, 1, 0, 1, 1], 'a triangle is left alone');
  assert.equal(heightOf(14.6, 5), 14.6, 'the height it gives');
  assert.ok(Math.abs(heightOf(0, 5) - 17.5) < 0.01, 'else its floors');
  assert.equal(heightOf(0, 0), 4, 'else a low guess');
  assert.ok(heightOf(351, 5) < 20, 'a height far too tall for its floors is a typing slip');
  assert.equal(heightOf(555, 123), 555, 'a real tower is believed');
  assert.equal(USES[useOf('02000')], 'apartment');
  assert.equal(USES[useOf('01000')], 'house');
  assert.equal(USES[useOf('14000')], 'office');
  assert.equal(USES[useOf('')], 'other');
});

test('Seoul\'s grid: longitude and latitude to the register\'s metres and back', async () => {
  const { toGrid, toLonLat } = await import('../../scripts/geo/tm.mjs');
  // The grid's own origin, by definition.
  const [ox, oy] = toGrid(127, 38);
  assert.ok(Math.abs(ox - 200000) < 1e-6 && Math.abs(oy - 600000) < 1e-6);
  // City Hall: where the game's world begins.
  const [x, y] = toGrid(126.9779, 37.5663);
  assert.ok(Math.abs(x - 198050) < 60 && Math.abs(y - 551860) < 60, `${x}, ${y}`);
  for (const [lon, lat] of [[126.9779, 37.5663], [126.7642, 37.4301], [127.1835, 37.7011], [126.9882, 37.5512]]) {
    const [bx, by] = toLonLat(...toGrid(lon, lat));
    assert.ok(Math.abs(bx - lon) < 1e-8 && Math.abs(by - lat) < 1e-8, 'there and back to well under a millimetre');
  }
  // A hundred metres east is a hundred metres east.
  const [x2] = toGrid(126.9779 + 100 / (111320 * Math.cos((37.5663 * Math.PI) / 180)), 37.5663);
  assert.ok(Math.abs(x2 - x - 100) < 0.5);
});
