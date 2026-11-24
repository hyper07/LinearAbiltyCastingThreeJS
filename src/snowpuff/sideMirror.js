/**
 * The rival panel: when another rider comes up behind you, or draws level to
 * pass, a manga-style panel slides in on the left — ONE still picture of
 * them (snapped from just in front, looking back at their face), in a tilted
 * ink frame with radiating speed lines and a halftone edge, their name and
 * how far back they are.
 *
 * Why a still: a live rear view meant drawing the scene twice; on the first
 * look it also built a whole new set of GPU pipelines, so the race hitched
 * (frames of 150–300 ms) just as someone came past. Now the 3D cost is one
 * small render when the rider changes (at most about once a second), read
 * back to a plain 2D canvas; everything that moves — the slide, the wiggle,
 * the speed lines — is CSS. The snapshot's pipelines are built
 * behind the loading card (warm()).
 *
 * `mirrorTarget` (who the panel shows) is pure and tested in
 * tests/unit/snowpuff-mirror.test.mjs.
 */
import * as THREE from 'three/webgpu';
import { mrt, output } from 'three/tsl';

/** How near a rider must be, and how far round behind you (cosine of the angle off straight ahead). */
export const MIRROR_RANGE = 18;
export const MIRROR_BEHIND = 0.3;
/** Seconds the panel stays after the last rider has gone (so a pass reads as one moment). */
export const MIRROR_LINGER = 1.6;
/** At most one new still this often (seconds), even for the same rider. */
export const SNAP_EVERY = 1;
const RT_W = 320;
const RT_H = 240;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function mirrorTarget(me, others, { range = MIRROR_RANGE, behind = MIRROR_BEHIND } = {}) {
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

/** Half-float (as Uint16) → float, through a table for the exponent. */
const H = new Float32Array(1);
const HI = new Uint32Array(H.buffer);
function halfToFloat(h) {
  const s = (h & 0x8000) << 16, e = (h >> 10) & 0x1f, m = h & 0x3ff;
  if (e === 0) return (s ? -1 : 1) * m * 5.960464477539063e-8;
  if (e === 31) return m ? NaN : s ? -Infinity : Infinity;
  HI[0] = s | ((e + 112) << 23) | (m << 13);
  return H[0];
}

/** The game's look on a still: exposure, a neutral filmic curve, sRGB. */
function toneByte(v, exposure) {
  let x = Math.max(0, v * exposure);
  x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); // ACES-style fit, soft highlights
  x = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

export class SideMirror {
  /** `root`: the HUD element the panel goes in. */
  constructor(renderer, root) {
    this.renderer = renderer;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(42, RT_W / RT_H, 0.2, 4600);
    this.rt = null;
    this.on = false;
    this.linger = 0;
    this.sinceSnap = 99;
    this.target = null;
    this.shownId = null;
    this.wantSnap = false;
    this.busy = false;
    this.snaps = 0;
    this.textT = 0;
    this.el = document.createElement('div');
    this.el.className = 'sp-manga';
    this.el.innerHTML = `<div class="sp-manga__panel"><canvas class="sp-manga__pic" width="${RT_W}" height="${RT_H}" data-overlay></canvas><div class="sp-manga__lines"></div><div class="sp-manga__dots"></div></div>
      <div class="sp-manga__tag" data-mirror-tag></div>`;
    this.canvas = this.el.querySelector('canvas');
    this.g2 = this.canvas.getContext('2d');
    this.img = this.g2.createImageData(RT_W, RT_H);
    this.tag = this.el.querySelector('[data-mirror-tag]');
    root.append(this.el);
  }

  _ensure() {
    if (this.rt) return;
    this.rt = new THREE.RenderTarget(RT_W, RT_H, { type: THREE.HalfFloatType, depthBuffer: true });
    // Named like the game's own colour buffer: the effects that write only to the game's extra
    // buffers (normals, velocity, glow) then simply draw nothing here, instead of failing.
    this.rt.texture.name = 'output';
    this.mrt = mrt({ output });
  }

  /** Render the snapshot camera once with every object drawn, so its pipelines exist before the race. */
  warm(scene, fromCamera) {
    this.scene = scene;
    this._ensure();
    this.camera.position.copy(fromCamera.position);
    this.camera.quaternion.copy(fromCamera.quaternion);
    this._render();
  }

  _render() {
    const r = this.renderer;
    const sm = r.shadowMap;
    const auto = sm.autoUpdate;
    sm.autoUpdate = false;
    const prev = r.getRenderTarget();
    const prevMrt = r.getMRT();
    r.setRenderTarget(this.rt);
    r.setMRT(this.mrt);
    r.render(this.scene, this.camera);
    r.setMRT(prevMrt);
    r.setRenderTarget(prev);
    sm.autoUpdate = auto;
  }

  /**
   * Each frame, after the riders have moved. `me` { pos, heading } (heading:
   * the world yaw my board runs along, x = sin, z = −cos); `others` the other
   * riders { pos, name, slot }. `active` false hides it (countdown, pause, help).
   */
  update(dt, me, others, { active = true, scene = null, exposure = 1 } = {}) {
    if (scene) this.scene = scene;
    this.exposure = exposure;
    this.sinceSnap += dt;
    const fx = Math.sin(me.heading);
    const fz = -Math.cos(me.heading);
    let t = null;
    if (active) {
      const flat = (this._flat ??= []);
      flat.length = 0;
      for (const o of others) flat.push({ x: o.pos.x, z: o.pos.z, y: o.pos.y, name: o.name, id: o.slot });
      t = mirrorTarget({ x: me.pos.x, z: me.pos.z, fx, fz }, flat);
    }
    if (t) {
      this.target = t;
      this.linger = MIRROR_LINGER;
    } else this.linger = active ? Math.max(0, this.linger - dt) : 0;
    const want = this.linger > 0;
    if (want !== this.on) {
      this.on = want;
      this.el.classList.toggle('is-on', want);
      if (!want) this.shownId = null;
    }
    if (!t) return;
    // a new rider, or a second has passed: a new still (taken next frame, after drawing)
    const id = t.rider.id;
    if (id !== this.shownId || this.sinceSnap >= SNAP_EVERY) {
      this.shownId = id;
      this.sinceSnap = 0;
      // from just in front of them (toward me), looking back at their face
      const o = t.rider;
      const dx = me.pos.x - o.x, dz = me.pos.z - o.z;
      const l = Math.hypot(dx, dz) || 1;
      const sx = dx / l, sz = dz / l;
      this.camera.position.set(o.x + sx * 3.2 - sz * 0.9, o.y + 1.25, o.z + sz * 3.2 + sx * 0.9);
      this.camera.lookAt(o.x, o.y + 0.55, o.z);
      this.wantSnap = true;
    }
    // the words update a few times a second
    this.textT -= dt;
    if (this.textT <= 0) {
      this.textT = 0.2;
      this.tag.innerHTML = `<b>${esc(t.rider.name ?? 'Rider')}</b><span>${t.d.toFixed(0)} m ${t.d < 2.5 ? 'beside you' : 'behind'}</span>`;
      this.el.classList.toggle('is-left', t.side === 'left');
    }
  }

  /** After the frame is drawn: take the still if one is due, and hand it to the 2D canvas. */
  draw() {
    if (!this.wantSnap || this.busy || !this.scene) return;
    this.wantSnap = false;
    this._ensure();
    this._render();
    this.snaps++;
    this.busy = true;
    this.renderer
      .readRenderTargetPixelsAsync(this.rt, 0, 0, RT_W, RT_H)
      .then((px) => {
        const d = this.img.data;
        const half = px instanceof Uint16Array;
        const e = this.exposure ?? 1;
        for (let i = 0; i < RT_W * RT_H * 4; i += 4) {
          const r = half ? halfToFloat(px[i]) : px[i] / 255, g = half ? halfToFloat(px[i + 1]) : px[i + 1] / 255, b = half ? halfToFloat(px[i + 2]) : px[i + 2] / 255;
          d[i] = toneByte(r, e);
          d[i + 1] = toneByte(g, e);
          d[i + 2] = toneByte(b, e);
          d[i + 3] = 255;
        }
        this.g2.putImageData(this.img, 0, 0);
        this.el.classList.add('has-pic');
      })
      .catch(() => {})
      .finally(() => (this.busy = false));
  }

  dispose() {
    this.rt?.dispose();
    this.el.remove();
  }
}
