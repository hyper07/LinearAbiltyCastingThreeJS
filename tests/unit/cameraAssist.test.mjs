import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraAssist, CAMERA_KEYS, shortestAngle, dampAngle, assistSettings, loadAssist, saveAssist } from '../../src/shared/cameraAssist.js';

const STEP = 1 / 60;
const run = (a, secs, yaw, behind, opts) => {
  for (let t = 0; t < secs; t += STEP) yaw = a.step(STEP, yaw, behind, opts);
  return yaw;
};

test('shortest angle: the short way round, in (−π, π]', () => {
  assert.ok(Math.abs(shortestAngle(0, 0.5) - 0.5) < 1e-12);
  assert.ok(Math.abs(shortestAngle(0.1, -0.1) + 0.2) < 1e-12);
  // Across the wrap: 350° to 10° is +20°, not −340°.
  assert.ok(Math.abs(shortestAngle((350 / 180) * Math.PI, (10 / 180) * Math.PI) - (20 / 180) * Math.PI) < 1e-9);
  assert.ok(Math.abs(shortestAngle(0, 7 * Math.PI) - Math.PI) < 1e-9);
  for (let i = 0; i < 200; i++) {
    const a = (i * 0.37) % 20 - 10;
    const b = (i * 1.91) % 20 - 10;
    const d = shortestAngle(a, b);
    assert.ok(d > -Math.PI - 1e-9 && d <= Math.PI + 1e-9);
    assert.ok(Math.abs(Math.cos(a + d) - Math.cos(b)) < 1e-9 && Math.abs(Math.sin(a + d) - Math.sin(b)) < 1e-9);
  }
});

test('damping: settles in about a second, never overshoots, takes the short way', () => {
  let a = 0.2;
  const b = 0.2 + 2.5;
  let prev = Math.abs(shortestAngle(a, b));
  let t = 0;
  while (Math.abs(shortestAngle(a, b)) > 0.05 && t < 5) {
    a = dampAngle(a, b, STEP);
    const left = Math.abs(shortestAngle(a, b));
    assert.ok(left < prev, 'always closing, never past it');
    prev = left;
    t += STEP;
  }
  assert.ok(t > 0.6 && t < 1.25, `settled in ${t.toFixed(2)} s`);
  // From just left of the seam to just right of it: a small turn, not a lap.
  const x = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
  assert.ok(x > Math.PI - 0.1);
});

test('auto: waits the delay with no input, then eases behind a hero on the move', () => {
  const a = new CameraAssist({ delay: 10 });
  let yaw = 1.5;
  yaw = run(a, 9.5, yaw, 0, { moving: true });
  assert.equal(yaw, 1.5, 'not before the delay');
  yaw = run(a, 0.6, yaw, 0, { moving: true });
  assert.ok(yaw < 1.5 && yaw > 0, 'easing, not jumping');
  yaw = run(a, 1.5, yaw, 0, { moving: true });
  assert.ok(Math.abs(yaw) < 0.02, `behind at ${yaw}`);
});

test('auto: any manual input cancels the swing at once and restarts the timer', () => {
  const a = new CameraAssist({ delay: 3 });
  let yaw = run(a, 3.3, 2, 0, { moving: true });
  assert.ok(a.easing && yaw < 2);
  const at = yaw;
  a.input();
  assert.equal(a.easing, false);
  yaw = run(a, 2.5, yaw, 0, { moving: true });
  assert.equal(yaw, at, 'held for a full delay after the input');
  // A camera key counts as input too.
  run(a, 1, yaw, 0, { moving: true });
  assert.ok(a.idle > 3);
  assert.equal(a.key(CAMERA_KEYS.left, true), true);
  assert.equal(a.idle, 0);
  const turn = a.steer(0.5, { pad: null });
  assert.ok(turn.yaw > 0, 'left turns the view left (yaw up)');
  a.key(CAMERA_KEYS.left, false);
  assert.equal(a.steer(0.5, { pad: null }).yaw, 0);
  assert.equal(a.key('KeyW', true), false, 'other keys are the game\'s');
});

test('auto: a still hero is not swung round; paused states hold the timer', () => {
  const a = new CameraAssist({ delay: 3 });
  let yaw = run(a, 6, 1, 0, { moving: false });
  assert.equal(yaw, 1, 'standing still: no swing');
  // Aiming, blocking, mouse-look: the timer stops where it is.
  const b = new CameraAssist({ delay: 3 });
  run(b, 2, 1, 0, { moving: true });
  yaw = run(b, 10, 1, 0, { moving: true, paused: true });
  assert.equal(yaw, 1);
  assert.ok(Math.abs(b.idle - 2) < 0.05, `timer held at ${b.idle}`);
  yaw = run(b, 1.2, yaw, 0, { moving: true });
  assert.ok(yaw < 1, 'resumes once the pause ends');
  // Off is off.
  const c = new CameraAssist({ auto: false, delay: 3 });
  assert.equal(run(c, 20, 1, 0, { moving: true }), 1);
});

test('recenter key: behind the hero now, even standing still; input cancels it', () => {
  const a = new CameraAssist({ delay: 30 });
  a.key(CAMERA_KEYS.recenter, true);
  let yaw = run(a, 1.5, -2.8, 2.9, { moving: false });
  assert.ok(Math.abs(shortestAngle(yaw, 2.9)) < 0.02, 'took the short way across the seam');
  assert.ok(yaw < -2.8, 'went the short way (down past −π), not round');
  assert.equal(a.forced, false);
  a.recenter();
  a.input();
  assert.equal(run(a, 1, 1, 0, { moving: false }), 1);
});

test('gamepad: right stick turns, its click recenters', () => {
  const a = new CameraAssist();
  const pad = (x, y, r3 = false) => [{ connected: true, axes: [0, 0, x, y], buttons: Array.from({ length: 12 }, (_, i) => ({ pressed: i === 10 && r3 })) }];
  assert.equal(a.steer(0.1, { pad: pad(0.1, 0) }).yaw, 0, 'dead zone');
  assert.ok(a.steer(0.1, { pad: pad(1, 0) }).yaw < 0, 'stick right turns the view right');
  a.steer(0.1, { pad: pad(0, 0, true) });
  assert.equal(a.forced, true);
});

test('settings: sane ranges, saved per game, storage that throws falls back', () => {
  assert.deepEqual(assistSettings(), { auto: true, delay: 10, speed: 1 });
  assert.deepEqual(assistSettings({ auto: 'yes', delay: 99, speed: -4 }), { auto: true, delay: 30, speed: 0.25 });
  assert.equal(assistSettings({ delay: 1 }).delay, 3);
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.ok(saveAssist('kithvale', { auto: false, delay: 5, speed: 2 }, { storage }));
  assert.deepEqual(loadAssist('kithvale', { storage }), { auto: false, delay: 5, speed: 2 });
  assert.deepEqual(loadAssist('gloamreach', { storage }), { auto: true, delay: 10, speed: 1 });
  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  assert.deepEqual(loadAssist('x', { storage: broken }), { auto: true, delay: 10, speed: 1 });
  assert.equal(saveAssist('x', {}, { storage: broken }), false);
  // Rotate speed scales the keys.
  const slow = new CameraAssist({ speed: 0.5 });
  const fast = new CameraAssist({ speed: 2 });
  slow.key(CAMERA_KEYS.right, true);
  fast.key(CAMERA_KEYS.right, true);
  assert.ok(Math.abs(fast.steer(0.1, { pad: null }).yaw) > 3 * Math.abs(slow.steer(0.1, { pad: null }).yaw));
});

test('click or drag: a quick press is a click, a moved press a drag (no attack), a still press a hold', async () => {
  const { pressKind, PressDrag, DRAG_PX, HOLD_MS } = await import('../../src/shared/cameraAssist.js');
  assert.equal(DRAG_PX, 6);
  assert.equal(HOLD_MS, 180);
  assert.equal(pressKind({ dist: 2, ms: 90, up: true }), 'click');
  assert.equal(pressKind({ dist: 7, ms: 90 }), 'drag');
  assert.equal(pressKind({ dist: 7, ms: 90, up: true }), 'drag');
  assert.equal(pressKind({ dist: 1, ms: 200 }), 'hold');
  assert.equal(pressKind({ dist: 1, ms: 50 }), 'pending');

  // A click: down, a twitch under the threshold, up.
  const p = new PressDrag();
  p.down(100, 100, 0);
  assert.equal(p.move(103, 102, 40).kind, 'pending');
  assert.equal(p.up(90), 'click');
  assert.equal(p.active, false);

  // A drag: past 6 px inside 180 ms; the turn counts from where it went down; up fires nothing.
  p.down(100, 100, 0);
  const m = p.move(108, 100, 50);
  assert.equal(m.kind, 'drag');
  assert.equal(m.dx, 8);
  assert.ok(p.dragging);
  assert.deepEqual(p.move(120, 95, 300), { kind: 'drag', dx: 12, dy: -5 });
  assert.equal(p.tick(400), null, 'a drag never turns into a hold');
  assert.equal(p.up(500), 'drag-end');

  // A hold: still for 180 ms (the frame tick says so once); moving after that aims, it doesn't turn.
  p.down(100, 100, 0);
  assert.equal(p.tick(100), null);
  assert.equal(p.tick(190), 'hold');
  assert.equal(p.tick(250), null);
  assert.equal(p.move(160, 100, 300).kind, 'hold');
  assert.equal(p.dragging, false);
  assert.equal(p.up(400), 'release');

  // Held still past the hold time with no frame in between: still an attack on release.
  p.down(0, 0, 0);
  assert.equal(p.up(300), 'release-late');
  // A slow move that starts after the hold time aims (hold), not turns.
  p.down(0, 0, 0);
  assert.equal(p.move(20, 0, 250).kind, 'hold');
  p.cancel();
  assert.equal(p.active, false);
});
