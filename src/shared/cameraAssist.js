/**
 * Camera assist for the third-person games: keys (and a gamepad's right
 * stick) to turn the camera round the hero, a key to put it back behind
 * them, and — after a quiet spell with no camera input while the hero is on
 * the move — an easy swing back behind their facing. Manual control always
 * wins: any camera input cancels the swing at once and restarts the wait.
 *
 *   ,  .   turn the camera left / right (hold)
 *   [  ]   tilt it down / up (hold)
 *   /      behind the hero now
 *   gamepad: right stick turns and tilts, right-stick click puts it behind
 *
 * The rules (timer, shortest-angle damping, when to hold off) are pure and
 * tested in tests/unit/cameraAssist.test.mjs; cameraMenu() is the settings
 * section (Auto camera, its delay, the turning speed), saved per game.
 */

import { powerStyles } from './graphicsMenu.js';

export const CAMERA_KEYS = { left: 'Comma', right: 'Period', down: 'BracketLeft', up: 'BracketRight', recenter: 'Slash' };
/** For the games' key hints. */
export const CAMERA_HINT = { keys: [',', '.'], tilt: ['[', ']'], recenter: '/' };
export const ASSIST_DEFAULTS = { auto: true, delay: 10, speed: 1 };
/** Turning speed at ×1 (radians a second): sideways, and up and down. */
const TURN = 2.0;
const TILT = 1.0;
/** How fast the swing back closes the gap (per second): about 1 s to settle, never overshooting. */
const EASE = 4;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Clean settings: auto on or off, a 3–30 s delay, a ×0.25–3 turning speed. */
export function assistSettings(raw = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    auto: typeof r.auto === 'boolean' ? r.auto : ASSIST_DEFAULTS.auto,
    delay: Number.isFinite(r.delay) ? clamp(Math.round(r.delay), 3, 30) : ASSIST_DEFAULTS.delay,
    speed: Number.isFinite(r.speed) ? clamp(r.speed, 0.25, 3) : ASSIST_DEFAULTS.speed
  };
}

const key = (game) => `gamory.camera.${game}`;

export function loadAssist(game, { storage = globalThis.localStorage } = {}) {
  try {
    return assistSettings(JSON.parse(storage?.getItem(key(game)) ?? 'null') ?? {});
  } catch {
    return assistSettings();
  }
}

export function saveAssist(game, settings, { storage = globalThis.localStorage } = {}) {
  try {
    storage.setItem(key(game), JSON.stringify(assistSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** The signed turn from angle `a` to angle `b` the short way round, in (−π, π]. */
export function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** One step of a damped turn from `a` toward `b` (the short way): exponential, so it settles without overshoot. */
export function dampAngle(a, b, dt, rate = EASE) {
  return a + shortestAngle(a, b) * (1 - Math.exp(-rate * Math.max(0, dt)));
}

export class CameraAssist {
  constructor(settings = {}, { id = null } = {}) {
    this.id = id;
    this.settings = assistSettings(settings);
    this.idle = 0;
    this.forced = false;
    this.easing = false;
    this.held = new Set();
    this._padR3 = false;
  }

  configure(settings) {
    this.settings = assistSettings({ ...this.settings, ...settings });
    if (this.id) saveAssist(this.id, this.settings);
  }

  /** Manual camera input of any kind: cancel a swing, restart the wait. */
  input() {
    this.idle = 0;
    this.forced = false;
    this.easing = false;
  }

  /** Put the camera behind the hero now (eased, even when they stand still). */
  recenter() {
    this.forced = true;
    this.idle = 0;
  }

  /** A key went down or up. Returns whether it was a camera key (the game can ignore it then). */
  key(code, down) {
    const K = CAMERA_KEYS;
    if (code === K.recenter) {
      if (down) this.recenter();
      return true;
    }
    if (code === K.left || code === K.right || code === K.up || code === K.down) {
      if (down) this.held.add(code);
      else this.held.delete(code);
      if (down) this.input();
      return true;
    }
    return false;
  }

  /** Forget held keys (the window lost focus). */
  clear() {
    this.held.clear();
  }

  /**
   * This frame's manual turn: { yaw, pitch } in radians from the held keys
   * (and `extra` codes a game keeps, e.g. Lanternwood's Q / E) and the
   * gamepad's right stick. Left and up are positive. Any of it counts as input.
   */
  steer(dt, { pad = globalThis.navigator?.getGamepads ? globalThis.navigator.getGamepads() : null, extraLeft = false, extraRight = false } = {}) {
    const K = CAMERA_KEYS;
    let x = (this.held.has(K.left) || extraLeft ? 1 : 0) - (this.held.has(K.right) || extraRight ? 1 : 0);
    let y = (this.held.has(K.up) ? 1 : 0) - (this.held.has(K.down) ? 1 : 0);
    const gp = pad ? [...pad].find((p) => p && p.connected !== false) : null;
    if (gp) {
      const dead = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
      x -= dead(gp.axes?.[2] ?? 0);
      y -= dead(gp.axes?.[3] ?? 0);
      const r3 = Boolean(gp.buttons?.[10]?.pressed);
      if (r3 && !this._padR3) this.recenter();
      this._padR3 = r3;
    }
    if (!x && !y) return { yaw: 0, pitch: 0 };
    this.input();
    const s = this.settings.speed;
    return { yaw: clamp(x, -1, 1) * TURN * s * dt, pitch: clamp(y, -1, 1) * TILT * s * dt };
  }

  /**
   * The camera's yaw after this frame's assist: `behind` is the yaw that
   * puts it behind the hero's facing. `paused` (aiming, blocking, a lock-on,
   * mouse-look) holds the timer and any swing; a still hero isn't swung
   * round (unless the recenter key asked).
   */
  step(dt, yaw, behind, { moving = false, paused = false } = {}) {
    if (paused) {
      this.easing = false;
      this.forced = false;
      return yaw;
    }
    this.idle += dt;
    const due = this.forced || (this.settings.auto && moving && this.idle >= this.settings.delay);
    if (!due) {
      this.easing = false;
      return yaw;
    }
    const d = shortestAngle(yaw, behind);
    if (Math.abs(d) < 0.002) {
      this.forced = false;
      this.easing = false;
      return yaw + d;
    }
    this.easing = true;
    return dampAngle(yaw, behind, dt);
  }
}

/* ------------------------------------------------------------------ the settings section */

/** Every word the section shows (a game may pass translations). */
export const CAMERA_TEXT = {
  title: 'Camera',
  auto: 'Auto camera',
  on: 'On',
  off: 'Off',
  delay: 'Back behind you after',
  seconds: 's',
  speed: 'Rotate speed',
  keys: ', . turn the camera · [ ] tilt · / behind you now'
};

/**
 * The Camera section for a pause or settings menu: Auto camera On / Off,
 * its delay (3–30 s), the turning speed. Changes apply at once and are saved
 * (when the assist has an id).
 */
export function cameraMenu(assist, { text = {}, onChange = null } = {}) {
  powerStyles();
  const T = { ...CAMERA_TEXT, ...text };
  const root = document.createElement('section');
  root.className = 'pw-gfx pw-cam';
  root.dataset.cameraMenu = '';
  root.setAttribute('aria-label', T.title);
  const head = document.createElement('div');
  head.className = 'pw-gfx__head';
  head.append(document.createElement('span'));
  head.firstChild.textContent = T.title;
  root.append(head);
  const label = (t) => {
    const l = document.createElement('label');
    l.textContent = t;
    l.style.cssText = 'display:block;font-size:.9em;opacity:.85;margin-bottom:.15em';
    return l;
  };
  const change = (patch) => {
    assist.configure(patch);
    sync();
    onChange?.(assist.settings);
  };
  // Auto camera: On / Off.
  const autoRow = document.createElement('div');
  autoRow.className = 'pw-gfx__row';
  autoRow.setAttribute('role', 'group');
  autoRow.setAttribute('aria-label', T.auto);
  for (const [v, t] of [[true, T.on], [false, T.off]]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.dataset.camAuto = String(v);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      change({ auto: v });
    });
    autoRow.append(b);
  }
  const autoWrap = document.createElement('div');
  autoWrap.append(label(T.auto), autoRow);
  root.append(autoWrap);
  const slider = (name, min, max, step, show) => {
    const wrap = document.createElement('div');
    const l = label('');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.dataset.cam = name;
    input.style.cssText = 'width:100%;accent-color:currentColor';
    input.addEventListener('input', () => change({ [name]: Number(input.value) }));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    wrap.append(l, input);
    root.append(wrap);
    return { l, input, show };
  };
  const delay = slider('delay', 3, 30, 1, (v) => `${T.delay} ${v} ${T.seconds}`);
  const speed = slider('speed', 0.25, 3, 0.25, (v) => `${T.speed} ×${v}`);
  const keys = document.createElement('p');
  keys.className = 'pw-gfx__hint';
  keys.textContent = T.keys;
  root.append(keys);
  function sync() {
    const s = assist.settings;
    for (const b of autoRow.children) b.setAttribute('aria-pressed', String(b.dataset.camAuto === String(s.auto)));
    delay.input.value = String(s.delay);
    delay.l.textContent = delay.show(s.delay);
    delay.input.disabled = !s.auto;
    speed.input.value = String(s.speed);
    speed.l.textContent = speed.show(s.speed);
  }
  sync();
  return root;
}

/** Several menu sections as one block (Graphics and Camera side by side in a pause menu). */
export function menuSections(...sections) {
  const wrap = document.createElement('div');
  wrap.className = 'pw-sections';
  for (const s of sections) if (s) wrap.append(s);
  return wrap;
}
