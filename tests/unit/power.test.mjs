import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FrameLimiter, PowerLoop, PowerGovernor, ShadowPacer, MODES, DEFAULT_MODE, PRESETS, HIDDEN,
  graphicsState, choices, presetLabel, setChoice, setPreset, powerSettings, loadGraphics, saveGraphics,
  bandAt, fadeOut, animStride, ticksOn, activeChunks
} from '../../src/shared/power.js';
import { SETTINGS as GR } from '../../src/gloamreach/quality.js';
import { SETTINGS as KV } from '../../src/kithvale/quality.js';

/** rAF timestamps of a `hz` display for `secs`, with a little jitter. */
function ticks(hz, secs, jitter = 0.15, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
  const out = [];
  for (let i = 0; i <= hz * secs; i++) out.push((i * 1000) / hz + rnd() * jitter * 2);
  return out;
}

/* ------------------------------------------------------------------ frame cap */

test('frame cap: 60 on a 120 Hz display is exactly every other tick, no drift', () => {
  const lim = new FrameLimiter(60);
  const ts = ticks(120, 10);
  let n = 0;
  let sum = 0;
  let first = null;
  let lastAt = 0;
  const gaps = [];
  for (const t of ts) {
    const ms = lim.tick(t);
    if (ms === null) continue;
    if (first === null) first = t;
    else sum += ms;
    if (n) gaps.push(t - lastAt);
    lastAt = t;
    n++;
  }
  assert.ok(Math.abs(n - 601) <= 1, `frames ${n}`);
  // dt adds up to the time that passed: nothing lost, nothing doubled.
  assert.ok(Math.abs(sum - (lastAt - first)) < 1e-6);
  // Every frame two vsyncs apart (no judder).
  for (const g of gaps) assert.ok(Math.abs(g - 1000 / 60) < 1, `gap ${g}`);
});

test('frame cap: holds the rate on 60, 144 and 240 Hz displays, and at 30 / 45', () => {
  for (const [hz, fps, want] of [[60, 60, 600], [144, 60, 600], [240, 60, 600], [120, 30, 300], [120, 45, 450], [60, 30, 300]]) {
    const lim = new FrameLimiter(fps);
    let n = 0;
    for (const t of ticks(hz, 10)) if (lim.tick(t) !== null) n++;
    assert.ok(Math.abs(n - want) <= want * 0.02 + 1, `${hz} Hz at ${fps}: ${n}`);
  }
});

test('frame cap: unlimited lets every tick through; a stall resyncs instead of bursting', () => {
  const free = new FrameLimiter(0);
  let n = 0;
  for (const t of ticks(120, 2)) if (free.tick(t) !== null) n++;
  assert.equal(n, 241);
  const lim = new FrameLimiter(60);
  assert.notEqual(lim.tick(0), null);
  assert.notEqual(lim.tick(16.7), null);
  // A 500 ms hitch: one frame (with the true dt), then the normal pace — no catch-up run.
  assert.ok(Math.abs(lim.tick(516.7) - 500) < 1e-9);
  assert.equal(lim.tick(525), null);
  assert.notEqual(lim.tick(533.4), null);
});

test('loop: stops in a hidden tab, draws on demand behind a still menu', () => {
  const queue = [];
  const doc = { hidden: false, listeners: {}, addEventListener(k, f) { this.listeners[k] = f; }, removeEventListener() {} };
  let drawn = 0;
  const loop = new PowerLoop(() => drawn++, { fps: 60, doc, raf: (f) => (queue.push(f), queue.length), caf: () => {} });
  loop.start();
  let t = 0;
  const run = (n) => { for (let i = 0; i < n; i++) { const f = queue.shift(); if (!f) return; t += 1000 / 120; f(t); } };
  run(120);
  assert.ok(Math.abs(drawn - 60) <= 1, `drawn ${drawn}`);
  doc.hidden = true;
  doc.listeners.visibilitychange();
  const before = drawn;
  run(120);
  assert.equal(drawn, before);
  doc.hidden = false;
  doc.listeners.visibilitychange();
  loop.setDemand(true);
  run(120);
  assert.equal(drawn, before + 1, 'one frame for the menu, then nothing');
  loop.invalidate();
  run(10);
  assert.equal(drawn, before + 2);
  loop.setDemand(false);
  run(120);
  assert.ok(drawn > before + 50);
});

/* ------------------------------------------------------------------ the governor */

test('governor: steps down over the GPU budget, back up under it, never past the preset ceiling', () => {
  const g = new PowerGovernor('balanced');
  assert.equal(g.level, 'high');
  assert.equal(g.max, 2);
  let changed = null;
  for (let i = 0; i < 200 && !changed; i++) changed = g.sample(12, 16.7);
  assert.equal(changed, 'medium');
  changed = null;
  for (let i = 0; i < 1000 && !changed; i++) changed = g.sample(2, 16.7);
  assert.equal(changed, 'high');
  // Never above the ceiling, however easy.
  for (let i = 0; i < 2000; i++) assert.notEqual(g.sample(1, 16.7), 'ultra');
  assert.equal(new PowerGovernor('quiet').level, 'medium');
  // Ultra has no budget: it holds.
  const u = new PowerGovernor('ultra');
  for (let i = 0; i < 1000; i++) assert.equal(u.sample(40, 16.7), null);
  assert.equal(u.level, 'ultra');
});

test('governor: a level left twice is not climbed back to', () => {
  const g = new PowerGovernor('high');
  for (let round = 0; round < 2; round++) {
    let c = null;
    for (let i = 0; i < 300 && !c; i++) c = g.sample(20);
    assert.equal(c, 'medium');
    c = null;
    for (let i = 0; i < 1000 && !c; i++) c = g.sample(1);
    if (round === 0) assert.equal(c, 'high');
    else assert.equal(c, null);
  }
});

/* ------------------------------------------------------------------ choices and settings */

test('presets: Balanced by default; an advanced change makes it Custom; a preset clears it', () => {
  let s = graphicsState();
  assert.equal(s.preset, DEFAULT_MODE);
  assert.equal(presetLabel(s), 'Balanced');
  s = setChoice(s, 'shadows', 'off');
  assert.equal(presetLabel(s), 'Custom');
  assert.equal(choices(s).shadows, 'off');
  assert.equal(choices(s).distance, PRESETS.balanced.distance, 'the rest from the preset it came from');
  s = setPreset(s, 'quiet');
  assert.equal(presetLabel(s), 'Quiet (battery)');
  assert.equal(choices(s, { quietFps: 45 }).fps, 45);
  assert.equal(choices(s, { quietFps: 30 }).fps, 30);
  // Junk in, sane out.
  assert.deepEqual(graphicsState({ preset: 'turbo', custom: { fps: 7, ao: 'yes' } }).custom.fps, PRESETS.balanced.fps);
});

test('settings: the mode bounds detail but never the resolution', () => {
  for (const preset of MODES) {
    const s = powerSettings(GR, { state: { preset }, detail: HIDDEN[preset].ceiling, res: 'ultra' });
    assert.equal(s.scale, GR.ultra.scale);
    assert.equal(s.maxDpr, GR.ultra.maxDpr);
  }
  const q = powerSettings(GR, { state: { preset: 'quiet' }, detail: 'medium', res: 'ultra' });
  const b = powerSettings(GR, { state: { preset: 'balanced' }, detail: 'high', res: 'ultra' });
  const u = powerSettings(GR, { state: { preset: 'ultra' }, detail: 'ultra', res: 'ultra' });
  assert.equal(q.ao, false);
  assert.equal(q.rays, false);
  assert.ok(q.shadow <= 2048 && b.shadow <= 2048 && u.shadow === GR.ultra.shadow);
  assert.ok(q.shadowBox <= 70 && b.shadowBox <= 70 && u.shadowBox === GR.ultra.shadowBox);
  assert.ok(q.grass < b.grass && b.grass < u.grass);
  assert.ok(q.far < b.far && u.far === Infinity);
  assert.ok(b.shadowEvery >= 2 && u.shadowEvery === 1);
  // Ultra is the old full look.
  for (const k of ['shadow', 'shadowBox', 'grass', 'ao', 'rays', 'bloom', 'lights', 'fireflies']) assert.equal(u[k], GR.ultra[k], k);
  // Shadows off, effects off by hand.
  const off = powerSettings(KV, { state: setChoice(setChoice({ preset: 'ultra' }, 'shadows', 'off'), 'bloom', false), detail: 'ultra', res: 'high' });
  assert.equal(off.shadowOn, false);
  assert.equal(off.bloom, false);
  assert.equal(off.maxDpr, KV.high.maxDpr);
});

test('saved per game: round trip, ?power= wins, storage that throws falls back', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(loadGraphics('kithvale', { storage, search: '' }).preset, 'balanced');
  assert.ok(saveGraphics('kithvale', setChoice({ preset: 'quiet' }, 'fps', 30), { storage }));
  const back = loadGraphics('kithvale', { storage, search: '' });
  assert.equal(back.preset, 'quiet');
  assert.equal(back.custom.fps, 30);
  assert.equal(loadGraphics('gloamreach', { storage, search: '' }).preset, 'balanced', 'each game its own');
  assert.equal(loadGraphics('kithvale', { storage, search: '?power=ultra' }).preset, 'ultra');
  assert.equal(loadGraphics('kithvale', { storage, search: '?power=ultra' }).custom, null);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadGraphics('x', { storage: broken, search: '' }).preset, 'balanced');
  assert.equal(saveGraphics('x', { preset: 'high' }, { storage: broken }), false);
  mem.set('gamory.graphics.y', '{not json');
  assert.equal(loadGraphics('y', { storage, search: '' }).preset, 'balanced');
});

/* ------------------------------------------------------------------ distance */

test('distance: detail bands, fades, animation strides and the active ring', () => {
  assert.equal(bandAt(10, [40, 120, 250]), 0);
  assert.equal(bandAt(80, [40, 120, 250]), 1);
  assert.equal(bandAt(200, [40, 120, 250]), 2);
  assert.equal(bandAt(300, [40, 120, 250]), 3);
  assert.equal(fadeOut(10, 40, 60), 1);
  assert.equal(fadeOut(70, 40, 60), 0);
  assert.ok(fadeOut(50, 40, 60) > 0.4 && fadeOut(50, 40, 60) < 0.6);
  assert.ok(fadeOut(45, 40, 60) > fadeOut(55, 40, 60));
  assert.equal(animStride(10, { near: 30, far: 200 }), 1);
  assert.equal(animStride(45, { near: 30, far: 200 }), 2);
  assert.equal(animStride(100, { near: 30, far: 200 }), 4);
  assert.equal(animStride(250, { near: 30, far: 200 }), 0);
  // Stride-4 things share the load: a quarter of them tick each frame.
  let n = 0;
  for (let seed = 0; seed < 100; seed++) if (ticksOn(7, 4, seed)) n++;
  assert.equal(n, 25);
  assert.equal(ticksOn(7, 0, 1), false);
  const ring = activeChunks(0, 0, 50, 60);
  assert.ok(ring.includes('0,0') && ring.includes('-1,-1') && ring.includes('1,0'));
  assert.ok(!ring.includes('2,2') && !ring.includes('-2,-2'));
  assert.equal(activeChunks(25, 25, 50, 10).length, 1);
});

test('shadows: redrawn every n frames, at once when the view moves or turns', () => {
  const p = new ShadowPacer();
  const due = [];
  for (let i = 0; i < 8; i++) due.push(p.due(4, 0, 0, 0));
  assert.deepEqual(due, [true, false, false, false, true, false, false, false]);
  assert.equal(p.due(4, 3, 0, 0), true, 'moved 3 m');
  assert.equal(p.due(4, 3, 0, 0.5), true, 'turned');
  assert.equal(p.due(4, 3, 0, 0.5), false);
  const every = new ShadowPacer();
  for (let i = 0; i < 5; i++) assert.equal(every.due(1, 0, 0), true);
});
