import test from 'node:test';
import assert from 'node:assert/strict';
import { podiumSlots, BLOCKS, BLOCK_W } from '../../src/city/podium.js';
import { wrongWay, WRONG_WAY } from '../../src/city/ride.js';
import { fogRange, FOG_BANK, WEATHERS, WEATHER_PICKS, raceSky } from '../../src/city/weather.js';
import { stillIsGood } from '../../src/city/rivalPanel.js';

// Kickrani's heading convention: 0 is north (−z); the podium's riders face `heading`.

test('podium: 1st in the middle and highest, 2nd on your left, 3rd on your right', () => {
  // facing south (heading π: the riders look at +z, the camera stands to the south looking north)
  const s = podiumSlots(0, 0, Math.PI);
  assert.deepEqual(s.map((b) => b.place), [1, 2, 3]);
  assert.ok(s[0].h > s[1].h && s[1].h > s[2].h);
  assert.equal(Math.round(s[0].x * 100), 0);
  // looking north from the south, your left is west (−x)
  assert.ok(s[1].x < -BLOCK_W * 0.9, `2nd at x ${s[1].x}`);
  assert.ok(s[2].x > BLOCK_W * 0.9, `3rd at x ${s[2].x}`);
  assert.deepEqual(BLOCKS.map((b) => b.kind), ['win', 'dance', 'clap']);
});

test('podium: only as many places as finished', () => {
  assert.equal(podiumSlots(0, 0, 0, 1).length, 1);
  assert.equal(podiumSlots(0, 0, 0, 2).length, 2);
  assert.equal(podiumSlots(0, 0, 0, 0).length, 0);
  assert.equal(podiumSlots(0, 0, 0, 7).length, 3);
});

const ride = (o) => ({ mode: 'ride', travel: Math.PI, ahead: 0, v: 8, drift: 0, safe: 0, shortcut: false, ...o });
const run = (w, o, seconds, dt = 1 / 60) => {
  let shown = 0;
  for (let t = 0; t < seconds; t += dt) {
    w = wrongWay(w, o, dt);
    if (w.on) shown++;
  }
  return { w, shown };
};

test('wrong way: only after riding against the course for 1.5 s', () => {
  let { w } = run(undefined, ride(), 1.3);
  assert.equal(w.on, false, 'not yet at 1.3 s');
  ({ w } = run(w, ride(), 0.3));
  assert.equal(w.on, true);
  assert.equal(WRONG_WAY.hold, 1.5);
});

test('wrong way: never a blink — a frame or a few against the course (a corner, a drift, a bounce) shows nothing', () => {
  let w;
  let shown = 0;
  // 3 frames wrong, 20 right, over and over for 20 s: the flicker that used to flash the box
  for (let k = 0; k < 60 * 20; k++) {
    const against = k % 23 < 3;
    w = wrongWay(w, ride(against ? {} : { travel: 0 }), 1 / 60);
    if (w.on) shown++;
  }
  assert.equal(shown, 0);
});

test('wrong way: not judged while drifting, tumbling, just put back or down a short cut', () => {
  for (const o of [{ drift: 0.6 }, { mode: 'tumble' }, { mode: 'dizzy' }, { safe: 1 }, { shortcut: true }, { v: 1 }]) {
    const { shown } = run(undefined, ride(o), 5);
    assert.equal(shown, 0, JSON.stringify(o));
  }
});

test('wrong way: once shown it stays steady, and clears once you are going the right way', () => {
  let { w } = run(undefined, ride(), 2);
  assert.equal(w.on, true);
  ({ w } = run(w, ride({ travel: 0.1 }), 0.3));
  assert.equal(w.on, true, 'held a moment — no blink off');
  ({ w } = run(w, ride({ travel: 0.1 }), 0.5));
  assert.equal(w.on, false);
});

test('fog: a fog bank closes the world in to 10–20 m whatever the view distance; the rest unchanged', () => {
  for (const reach of [800, 1300, 2000]) {
    const f = fogRange(reach, WEATHERS.fog.fog, 1);
    assert.equal(Math.round(f.far), FOG_BANK.far);
    assert.ok(f.near <= 3);
    // a car 20 m off is a faint shape (mostly fog); one 10 m off half lost
    assert.ok((20 - f.near) / (f.far - f.near) > 0.75);
    assert.ok((10 - f.near) / (f.far - f.near) > 0.3);
  }
  // clear, rain, storm and snow keep their haze exactly as before (near, far)
  for (const kind of ['clear', 'rain', 'storm', 'snow']) {
    const w = WEATHERS[kind];
    assert.equal(w.thick, 0);
    const f = fogRange(2000, w.fog, w.thick, 0);
    assert.equal(f.far, 2000 * 1.2 * w.fog);
    assert.equal(f.near, Math.min(900, 140) * w.fog * w.fog);
  }
});

test('fog by night: the bank closes in nearer (gone by about 15 m), rain, storm and snow untouched', () => {
  for (const reach of [800, 1300, 2000]) {
    const day = fogRange(reach, WEATHERS.fog.fog, 1, 0, 0);
    const night = fogRange(reach, WEATHERS.fog.fog, 1, 0, 1);
    assert.ok(night.far < day.far && night.far >= 10 && night.far <= 20, String(night.far));
    assert.ok(night.near < 2);
    // a building 20 m off is all fog by night
    assert.ok((20 - night.near) / (night.far - night.near) >= 1);
  }
  for (const kind of ['clear', 'rain', 'storm', 'snow']) {
    const w = WEATHERS[kind];
    assert.deepEqual(fogRange(2000, w.fog, w.thick, 0, 1), fogRange(2000, w.fog, w.thick, 0, 0));
  }
});

test('rival panel: a flat slab of one colour (taken from inside a bus or a wall) is never shown', () => {
  const slab = Array.from({ length: 400 }, () => 120 + Math.random() * 6);
  assert.equal(stillIsGood(slab), false);
  const dark = Array.from({ length: 400 }, () => Math.random() * 10);
  assert.equal(stillIsGood(dark), false);
  const face = Array.from({ length: 400 }, (_, i) => (i % 5) * 50 + Math.random() * 20);
  assert.equal(stillIsGood(face), true);
});

test('fog: on the weather step, and random weather gives it too (about one race in eight)', () => {
  assert.ok(WEATHER_PICKS.includes('fog'));
  assert.equal(raceSky('day', 'fog').weather, 'fog');
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let fog = 0;
  for (let i = 0; i < 4000; i++) if (raceSky('random', 'random', { month: 6, random }).weather === 'fog') fog++;
  assert.ok(fog > 300 && fog < 800, `${fog} of 4000`);
});
