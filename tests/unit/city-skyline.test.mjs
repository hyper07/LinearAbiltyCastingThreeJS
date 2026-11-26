import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKYLINE, skylineHaze, towerHalf } from '../../src/city/skyline.js';

test('the skyline landmarks: the Jamsil Sky Tower (555 m, by Seokchon Lake) and the 63 Building — no company names', () => {
  const tower = SKYLINE.find((l) => l.id === 'skytower');
  assert.equal(tower.height, 555);
  assert.ok(Math.hypot(tower.x - 11012, tower.z - 5953) < 50, 'by Seokchon Lake, where the map has its landmark');
  const s63 = SKYLINE.find((l) => l.id === 'yeouido63');
  assert.ok(s63.height > 240 && s63.height < 260);
  for (const l of SKYLINE) assert.ok(!/lotte|롯데|hanwha|한화/i.test(`${l.name} ${l.ko}`), l.name);
});

test('the tower tapers and curves in as it rises: a square about 71 m across at its foot, a third of that at its top', () => {
  assert.ok(Math.abs(towerHalf(0) * 2 - 71.4) < 1);
  let last = Infinity;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    assert.ok(towerHalf(t) < last, `narrower at ${t.toFixed(2)}`);
    last = towerHalf(t);
  }
  assert.ok(towerHalf(1) * 2 < 30);
});

test('through haze a landmark greys to a pale silhouette, never gone; a fog bank hides it like everything else', () => {
  assert.ok(skylineHaze(200) < 0.01, 'close: clear');
  assert.ok(skylineHaze(3000) > 0.3 && skylineHaze(3000) < 0.72);
  assert.ok(skylineHaze(20000) <= 0.72, 'from across the city: still there');
  assert.ok(skylineHaze(20000) > skylineHaze(5000));
  assert.equal(skylineHaze(400, { thick: 1, fogNear: 2, fogFar: 24 }), 1, 'in a fog bank, gone past its far');
});
