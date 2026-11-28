import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKYLINE, skylineHaze, towerHalf, landmarkLookUp, landmarkParts, LOOK_MAX, courseBend, LOOK_BEND, hanokRoof, LANDMARK_BOOST, landmarkScale, boostOf, footPoints, footCap } from '../../games/g_cv2yrhrpv2/skyline.js';
import { markAt, MARK_RANGE, MARK_SIZE } from '../../games/g_cv2yrhrpv2/minimap.js';
import { admiral, admiralFar } from '../../games/g_cv2yrhrpv2/admiral.js';
import { jetHeight, jetColor, FOUNTAIN } from '../../games/g_cv2yrhrpv2/fountain.js';
import * as THREE from 'three';

test('Admiral Yi in bronze: 6.5 m to the tip of his finial, the sword at his right (−x) from the slab to his shoulder, a sane budget; a light far copy', () => {
  const near = admiral({ scales: { map: null, bump: null } });
  const box = new THREE.Box3().setFromObject(near);
  assert.ok(Math.abs(box.max.y - 6.5) < 0.35, `${box.max.y.toFixed(2)} m tall`);
  assert.ok(box.min.x < -1.1 && box.max.x > 1.1, 'the sword out at his right, the elbow out at his left');
  let tris = 0;
  near.traverse((o) => {
    if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  assert.ok(tris > 3000 && tris < 60000, `${tris} triangles`);
  let far = 0;
  admiralFar().traverse((o) => {
    if (o.isMesh) far += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  assert.ok(far < tris / 5, `far copy ${far} triangles`);
});

test('the fountain: jets rise and fall in waves (the edge rows taller), cyan to blue after dark, one edge row pink', () => {
  // (fountain.js's show API: a jet is { kind, u, v, side, r, c }; the show itself is tested in the package's plaza.test.mjs)
  const mid = { kind: 'field', r: 7, c: 3, u: 0, v: 0.47 };
  const hs = Array.from({ length: 40 }, (_, k) => jetHeight(mid, k * 0.25));
  const H = FOUNTAIN.heights.field;
  assert.ok(Math.min(...hs) >= 0.05 * H && Math.max(...hs) <= H && Math.max(...hs) - Math.min(...hs) > 0.3 * H, 'the middle field rises and falls');
  const edgeTop = Math.max(...Array.from({ length: 40 }, (_, k) => jetHeight({ kind: 'edge', r: 0, side: -1, v: 0 }, k * 0.25)));
  assert.ok(edgeTop > Math.max(...hs), 'the edge rows taller');
  const hsl = jetColor({ kind: 'field', r: 2, c: 2, v: 0.2 }, 3).getHSL({});
  assert.ok(hsl.h > 0.38 && hsl.h < 0.62, `cyan–blue (${hsl.h.toFixed(2)})`);
  assert.ok(jetColor({ kind: 'edge', r: 9, side: 1, v: 0.5 }, 10).getHSL({}).h > 0.8, 'pink');
  // big: 60 m long and more, its wet floor 40 m across and more (square.js)
  assert.ok(FOUNTAIN.length >= 60 && FOUNTAIN.floor.width > 40);
});

test('the landmarks near the courses: Namsan Tower on the summit, Gyeongbokgung\'s gate and throne hall, Cheong Wa Dae under Bugaksan, the admiral on Gwanghwamun Square', () => {
  const by = Object.fromEntries(SKYLINE.map((l) => [l.id, l]));
  // Namsan Tower where the register has its point, 236.7 m
  assert.ok(Math.hypot(by.namsantower.x - 897, by.namsantower.z - 1682) < 20 && Math.abs(by.namsantower.height - 237) < 1);
  // the palace on its axis: the gate south of the throne hall, both where the register has their low blocks (skipped there)
  const p = by.gyeongbokgung;
  assert.ok(p.gate.z > p.hall.z + 200 && Math.abs(p.gate.x - p.hall.x) < 10, 'the gate south of the hall, on one axis');
  assert.equal(p.skipAt.length, 2);
  // Cheong Wa Dae north of the palace, the statues south of the gate on the square, King Sejong behind the admiral
  assert.ok(by.cheongwadae.z < p.hall.z - 600 && Math.abs(by.cheongwadae.x - p.hall.x) < 300);
  assert.ok(by.yisunsin.z > p.gate.z + 400 && by.yisunsin.sejong.z < by.yisunsin.z && by.yisunsin.height > 15);
  // the tall ones seen from across the city, the low ones from round about
  for (const id of ['skytower', 'yeouido63', 'namsantower']) assert.ok(by[id].range >= 9000, id);
  for (const id of ['gyeongbokgung', 'cheongwadae', 'yisunsin']) assert.ok(by[id].range >= 1500 && by[id].range <= 3000, id);
  // real names, no company's
  for (const l of SKYLINE) assert.ok(!/lotte|롯데|hanwha|한화|n ?seoul|n서울|cj/i.test(`${l.name} ${l.ko}`), l.name);
  // eight points up each part the race camera looks for
  assert.equal(landmarkParts(p).length, 16);
});

test('the race camera looks up toward a tall landmark ahead over the top of its view, never more than LOOK_MAX, and not at one behind or far off', () => {
  const tower = SKYLINE.find((l) => l.id === 'namsantower');
  const ground = () => 30;
  // 800 m south of the tower, facing it (north is −z: yaw 0 faces −z)
  const cam = { x: tower.x, y: 33, z: tower.z + 800 };
  const up = landmarkLookUp(cam, 0, { groundAt: ground });
  assert.ok(up > 0.05 && up <= LOOK_MAX, `looks up ${up.toFixed(2)}`);
  assert.equal(landmarkLookUp(cam, Math.PI, { groundAt: ground }), 0, 'facing away');
  // 6 km off it is low over the horizon, in the picture already
  assert.equal(landmarkLookUp({ x: tower.x, y: 33, z: tower.z + 6000 }, 0, { groundAt: ground, landmarks: [tower] }), 0);
  // a low landmark (the palace) never tilts it
  assert.equal(landmarkLookUp({ x: -87, y: 33, z: -700 }, 0, { groundAt: ground, landmarks: SKYLINE.filter((l) => l.height < 100) }), 0);
});

test('only on a straight: the course\'s turn over the next 50 m', () => {
  const straight = Array.from({ length: 40 }, (_, i) => [0, -i * 6]);
  assert.ok(courseBend(straight, 0) < 0.01);
  const corner = [...Array.from({ length: 6 }, (_, i) => [0, -i * 6]), ...Array.from({ length: 30 }, (_, i) => [(i + 1) * 6, -30])];
  assert.ok(courseBend(corner, 0) > LOOK_BEND);
});

test('a hanok roof: its corners swept up over the middle of its eaves, its ridge at the top', () => {
  const g = hanokRoof(20, 10, 5, { lift: 1.5 });
  const p = g.attributes.position;
  let corner = -Infinity;
  let mid = Infinity;
  let top = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (Math.abs(Math.abs(x) - 10) < 1e-6 && Math.abs(Math.abs(z) - 5) < 1e-6) corner = Math.max(corner, y);
    if (Math.abs(x) < 1e-6 && Math.abs(Math.abs(z) - 5) < 1e-6) mid = Math.min(mid, y);
    top = Math.max(top, y);
  }
  assert.ok(corner > mid + 1.4, 'corners up');
  assert.ok(Math.abs(top - 5) < 1e-6);
});

test('the minimap marks a landmark where it stands, or on its rim the way it lies', () => {
  const me = { x: 0, z: 0 };
  const opts = { R: 100, cy: 100, rot: 0, S: 0.5 };
  const near = markAt({ x: 40, z: 0 }, me, opts);
  assert.ok(!near.rim && Math.abs(near.x - 120) < 1e-6 && Math.abs(near.y - 100) < 1e-6);
  const far = markAt({ x: 0, z: -5000 }, me, opts);
  assert.ok(far.rim && Math.abs(far.x - 100) < 1e-6 && far.y < 100, 'north, on the rim at the top');
  assert.ok(MARK_RANGE.tower > MARK_RANGE.statue);
});

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

test('landmarks larger than life: 1.3–1.5× near, growing to 2.2–3× on the horizon, never shrinking as they go', () => {
  for (const l of SKYLINE) {
    const b = boostOf(l);
    const near = landmarkScale(l, 50);
    const far = landmarkScale(l, 30000);
    if (l.id === 'yisunsin') {
      // (already MONUMENT_SCALE: near as its solids are, a little more far off)
      assert.equal(near.xz, 1, 'the statues near as they are');
      assert.ok(far.y > 1.2 && far.y <= 1.6, `${l.id} far ${far.y}`);
      continue;
    }
    assert.ok(near.xz >= 1.3 && near.xz <= 1.5 && near.y === near.xz, `${l.id} near ${near.xz}`);
    assert.ok(far.y >= 2.2 && far.y <= 3, `${l.id} far ${far.y}`);
    assert.equal(far.y, b.far);
    let last = 0;
    for (let d = 0; d <= 20000; d += 250) {
      const s = landmarkScale(l, d).y;
      assert.ok(s >= last - 1e-9, `${l.id} at ${d} m`);
      last = s;
    }
  }
  assert.ok(LANDMARK_BOOST.capFrom < LANDMARK_BOOST.capTo);
});

test('a landmark whose foot would grow into a street is capped near (a tower may still rise a little), the cap gone by capTo', () => {
  const tower = SKYLINE.find((l) => l.id === 'namsantower');
  const near = landmarkScale(tower, 100, 1.1);
  assert.equal(near.xz, 1.1);
  assert.ok(near.y > 1.1 && near.y <= 1.1 * boostOf(tower).stretch + 1e-9, 'a tower rises a touch over its capped width');
  const hall = SKYLINE.find((l) => l.id === 'gyeongbokgung');
  const h = landmarkScale(hall, 100, 1);
  assert.ok(h.xz === 1 && h.y === 1, 'a palace hall is never stretched');
  assert.ok(landmarkScale(tower, LANDMARK_BOOST.capTo + 1, 1.1).xz > 1.5, 'past capTo the cap is gone');
  // a road east of x = 30.5 m: a 40 m square foot about (0, 0) may grow to 1.5× (its edge at 30 m), not 1.55×
  const road = (x) => x > 30.5;
  assert.ok(Math.abs(footCap(0, 0, [20, 20], 0, 2, road) - 1.5) < 1e-9);
  assert.equal(footCap(0, 0, [20, 20], 0, 1.3, road), 1.3);
  // one already over the road at true size may stay as it is, not grow further into it
  assert.equal(footCap(25, 0, [10, 10], 0, 1.5, road), 1);
  // a foot turned a quarter round lies along z
  const pts = footPoints(0, 0, [10, 1], 1, Math.PI / 2);
  assert.ok(Math.max(...pts.map((p) => Math.abs(p[1]))) > 9.9 && Math.max(...pts.map((p) => Math.abs(p[0]))) < 1.01);
});

test('the race camera looks up to a landmark as it is drawn: larger than life', () => {
  const tower = SKYLINE.find((l) => l.id === 'namsantower');
  const ground = () => 30;
  const cam = { x: tower.x, y: 33, z: tower.z + 1500 };
  const drawn = landmarkLookUp(cam, 0, { groundAt: ground, landmarks: [tower] });
  const life = landmarkLookUp(cam, 0, { groundAt: ground, landmarks: [tower], scaleAt: () => 1 });
  assert.ok(drawn >= life && drawn <= LOOK_MAX);
});

test('the minimap\'s landmark signs are big enough to read at the map\'s shown size', () => {
  // (the map is drawn at 440 px and shown at about 200: 44 px is ~20 px on the screen)
  assert.ok(MARK_SIZE.on >= 40 && MARK_SIZE.rim >= 34 && MARK_SIZE.inset >= MARK_SIZE.rim / 2 + 6);
});
