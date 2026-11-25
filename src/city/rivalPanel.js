import * as THREE from 'three';

/**
 * The rival panel, Snowpuff Peaks' (src/snowpuff/sideMirror.js, only read —
 * ported here for the city's WebGL renderer): when another rider comes up
 * behind you, or draws level to pass, a small manga-style square slides in on
 * the left — ONE still picture of them, snapped from just in front of them
 * looking back at their face, in a tilted ink frame with radiating speed
 * lines and a halftone edge. No name, no distance, no text.
 *
 * Cheap, as in Snowpuff: the 3D cost is one small render when the rider
 * changes (at most about once a second), read back to a plain 2D canvas; the
 * slide, the wiggle and the speed lines are CSS. The snapshot is rendered
 * once while the lights count down (warm()), so nothing hitches when a rival
 * first comes past.
 *
 * `mirrorTarget` (who the panel shows) is pure and tested in tests/unit/jarani-panel.test.mjs.
 */

/** How near a rider must be (m), and how far round behind you (cosine of the angle off straight ahead). */
export const PANEL_RANGE = 20;
export const PANEL_BEHIND = 0.3;
/** Seconds the panel stays after the last rider has gone (so a pass reads as one moment). */
export const PANEL_LINGER = 1.6;
/** At most one new still this often (seconds), even for the same rider. */
export const SNAP_EVERY = 1;
const RT_W = 384;
const RT_H = 288;

/**
 * Who the panel shows: the nearest rider within `range` metres who is behind me or level with me
 * (not ahead: they are on screen already). `me` { x, z, fx, fz } — fx, fz the way I am going;
 * `others` [{ x, z, … }]. Returns { rider, d, side ('left' | 'right'), bearing } or null.
 */
export function mirrorTarget(me, others, { range = PANEL_RANGE, behind = PANEL_BEHIND } = {}) {
  let best = null;
  for (const o of others) {
    const rx = o.x - me.x;
    const rz = o.z - me.z;
    const d = Math.hypot(rx, rz);
    if (!(d > 0.3 && d <= range)) continue;
    const ahead = rx * me.fx + rz * me.fz;
    if (ahead / d > behind) continue; // ahead of me: already on screen
    if (best && best.d <= d) continue;
    // My right, looking along (fx, fz) with y up, is (−fz, fx).
    const right = rx * -me.fz + rz * me.fx;
    best = { rider: o, d, side: right > 0 ? 'right' : 'left', bearing: Math.atan2(-right, -ahead) };
  }
  return best;
}

/** The game's look on a still: exposure, a soft filmic curve, sRGB (the city tone-maps in its own last pass). */
function toneByte(v, exposure) {
  let x = Math.max(0, v * exposure);
  x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  x = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

export class RivalPanel {
  /** `root`: the HUD element the panel goes in. */
  constructor(renderer, root) {
    this.renderer = renderer;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(42, RT_W / RT_H, 0.2, 2000);
    this.rt = null;
    this.on = false;
    this.linger = 0;
    this.sinceSnap = 99;
    this.target = null;
    this.shownId = null;
    this.wantSnap = false;
    this.busy = false;
    this.snaps = 0;
    this.el = document.createElement('div');
    this.el.className = 'kr-manga';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `<div class="kr-manga__panel"><canvas class="kr-manga__pic" width="${RT_W}" height="${RT_H}"></canvas><div class="kr-manga__lines"></div><div class="kr-manga__dots"></div></div>`;
    this.canvas = this.el.querySelector('canvas');
    this.g2 = this.canvas.getContext('2d');
    this.img = this.g2.createImageData(RT_W, RT_H);
    this.px = new Float32Array(RT_W * RT_H * 4);
    root.append(this.el);
  }

  _ensure() {
    if (this.rt) return;
    this.rt = new THREE.WebGLRenderTarget(RT_W, RT_H, { type: THREE.FloatType, depthBuffer: true });
  }

  /** Render the snapshot once (while the lights count down), so its first real one costs nothing new. */
  warm(scene, fromCamera) {
    this.scene = scene;
    this._ensure();
    this.camera.position.copy(fromCamera.position);
    this.camera.quaternion.copy(fromCamera.quaternion);
    this._render();
  }

  _render(target = null) {
    const r = this.renderer;
    const sm = r.shadowMap;
    const auto = sm.autoUpdate;
    sm.autoUpdate = false;
    // the rider in the picture whole (a rival by the chase camera is faded there)
    const view = target?.view;
    const fade = view?._fade ?? 1;
    const vis = view?.root.visible;
    if (view) {
      view.fade(1);
      view.root.visible = true;
    }
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(prev);
    if (view) {
      view.fade(fade);
      view.root.visible = vis;
    }
    sm.autoUpdate = auto;
  }

  /**
   * Each frame, after the riders have moved. `me` a racer; `others` the other racers. `active` false
   * hides it (the countdown, paused, finished).
   */
  update(dt, me, others, { active = true, scene = null, exposure = 1 } = {}) {
    if (scene) this.scene = scene;
    this.exposure = exposure;
    this.sinceSnap += dt;
    const h = me.s.travel ?? me.s.heading;
    const fx = -Math.sin(h);
    const fz = -Math.cos(h);
    let t = null;
    if (active) {
      const flat = (this._flat ??= []);
      flat.length = 0;
      for (const o of others) if (!o.left) flat.push({ x: o.s.x, z: o.s.z, y: o.y, id: o.id, racer: o });
      t = mirrorTarget({ x: me.s.x, z: me.s.z, fx, fz }, flat);
    }
    if (t) {
      this.target = t;
      this.linger = PANEL_LINGER;
    } else this.linger = active ? Math.max(0, this.linger - dt) : 0;
    const want = this.linger > 0;
    if (want !== this.on) {
      this.on = want;
      this.el.classList.toggle('is-on', want);
      if (!want) {
        this.shownId = null;
        this.el.classList.remove('has-pic');
      }
    }
    if (!t) return;
    const id = t.rider.id;
    if (id !== this.shownId || this.sinceSnap >= SNAP_EVERY) {
      this.shownId = id;
      this.sinceSnap = 0;
      // from just in front of them (the way they ride), a little to one side, looking back at their face
      const o = t.rider.racer;
      const oh = o.s.heading;
      const ofx = -Math.sin(oh);
      const ofz = -Math.cos(oh);
      this.camera.position.set(o.s.x + ofx * 3 - ofz * 0.8, o.y + 1.35, o.s.z + ofz * 3 + ofx * 0.8);
      this.camera.lookAt(o.s.x + ofx * 0.3, o.y + 0.85, o.s.z + ofz * 0.3);
      this.snapFor = o;
      this.wantSnap = true;
    }
  }

  /** After the frame is drawn: take the still if one is due, and hand it to the 2D canvas. */
  draw() {
    if (!this.wantSnap || this.busy || !this.scene) return;
    this.wantSnap = false;
    this._ensure();
    this._render(this.snapFor);
    this.snaps++;
    this.busy = true;
    this.renderer
      .readRenderTargetPixelsAsync(this.rt, 0, 0, RT_W, RT_H, this.px)
      .then((px) => {
        px ??= this.px;
        const d = this.img.data;
        const e = this.exposure ?? 1;
        // (read bottom row first: flip it the right way up)
        for (let y = 0; y < RT_H; y++) {
          const src = (RT_H - 1 - y) * RT_W * 4;
          const dst = y * RT_W * 4;
          for (let x = 0; x < RT_W * 4; x += 4) {
            d[dst + x] = toneByte(px[src + x], e);
            d[dst + x + 1] = toneByte(px[src + x + 1], e);
            d[dst + x + 2] = toneByte(px[src + x + 2], e);
            d[dst + x + 3] = 255;
          }
        }
        this.g2.putImageData(this.img, 0, 0);
        if (this.on) this.el.classList.add('has-pic');
      })
      .catch(() => {})
      .finally(() => (this.busy = false));
  }

  hide() {
    this.linger = 0;
    this.on = false;
    this.shownId = null;
    this.el.classList.remove('is-on', 'has-pic');
  }

  dispose() {
    this.rt?.dispose();
    this.el.remove();
  }
}
