/**
 * The side mirror: when another rider comes up behind you, or draws level to
 * pass, a small rear view slides in on the left of the screen, like a car's
 * wing mirror, turned toward them, with their name and how far back they are.
 * It slides away a moment after nobody is there.
 *
 * It costs nothing while hidden. While shown it draws the scene once more,
 * small (384×216), from a camera at your shoulder looking back up the run,
 * 20 times a second (12 on the low tier), without redrawing shadows; the picture is laid into its frame each frame (one
 * quad), mirrored left to right as a real mirror is.
 *
 * `mirrorTarget` (who the mirror shows) is pure and tested in
 * tests/unit/snowpuff-mirror.test.mjs.
 */
import * as THREE from 'three/webgpu';
import { texture, uv, vec2, vec4, float, uniform, positionGeometry, abs, max, min, length, clamp, smoothstep, mix, vec3, mrt, output } from 'three/tsl';

/** How near a rider must be, and how far round behind you (cosine of the angle off straight ahead). */
export const MIRROR_RANGE = 18;
export const MIRROR_BEHIND = 0.3;
/** Seconds the mirror stays after the last rider has gone (so a pass reads as one moment). */
export const MIRROR_LINGER = 1.6;
const RT_W = 384;
const RT_H = 216;
/** How far the view may turn from straight back toward a rider (radians). */
const MAX_TURN = 1.1;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Who the mirror shows: the nearest rider behind or beside me (within
 * `range` m, more than about 72° off the way I'm heading), or null. `me` is
 * { x, z, fx, fz } with (fx, fz) my heading as a unit vector on the ground;
 * `others` are { x, z, ... }. Returns { rider, d, side: 'left' | 'right',
 * bearing } where bearing is the angle from straight behind me (positive =
 * my left).
 */
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

export class SideMirror {
  /** `root`: the HUD element the frame goes in. */
  constructor(renderer, root) {
    this.renderer = renderer;
    this.scene = null;
    // Far enough to take in the sky dome (4.2 km); behind you is mostly the run you've come down.
    this.camera = new THREE.PerspectiveCamera(50, RT_W / RT_H, 0.2, 4600);
    this.rt = null;
    this.quad = null;
    this.quadScene = null;
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.on = false;
    this.opacity = 0;
    this.linger = 0;
    this.drawT = 0;
    this.hz = 20;
    this.turn = 0;
    this.target = null;
    this.drawn = false;
    this.look = new THREE.Vector3();
    this.hasLook = false;
    this._size = new THREE.Vector2();
    this._vp = new THREE.Vector4();
    this.el = document.createElement('div');
    this.el.className = 'sp-mirror';
    this.el.innerHTML = '<div class="sp-mirror__glass" data-mirror-glass></div><div class="sp-mirror__tag" data-mirror-tag></div>';
    this.glass = this.el.querySelector('[data-mirror-glass]');
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
    this.uSize = uniform(new THREE.Vector2(RT_W, RT_H));
    this.uRadius = uniform(18);
    this.uOpacity = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    m.vertexNode = vec4(positionGeometry.xy, 0, 1);
    const st = uv();
    // mirrored left to right, as a real mirror is; three/webgpu's render targets run top down on
    // both of its backends, so the picture is turned the right way up too
    const c = texture(this.rt.texture, vec2(st.x.oneMinus(), st.y.oneMinus())).rgb;
    // rounded glass, soft at the edge
    const p = st.sub(0.5).mul(this.uSize);
    const q = abs(p).sub(this.uSize.mul(0.5).sub(this.uRadius));
    const dist = length(max(q, 0)).add(min(max(q.x, q.y), 0)).sub(this.uRadius);
    const a = clamp(float(0.5).sub(dist), 0, 1).mul(this.uOpacity);
    // a touch of glass: darker toward the rim, faintly cool, a soft sheen across the top
    const v = smoothstep(0.85, 0.25, length(st.sub(0.5).mul(vec2(1, 1.4))));
    const glass = c.mul(mix(0.74, 1, v)).mul(vec3(0.96, 0.99, 1.04)).add(vec3(0.05, 0.06, 0.07).mul(smoothstep(0.55, 1, st.y)).mul(st.x.mul(0.6).oneMinus()));
    m.colorNode = glass;
    m.opacityNode = a;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
  }

  /**
   * Each frame, after the riders have moved. `me` { pos, heading } (heading:
   * the world yaw my board runs along, x = sin, z = −cos); `others` the other
   * riders { pos, name }. `active` false hides it (countdown, pause, help).
   */
  update(dt, me, others, { active = true, reducedMotion = false, scene = null, hz = 20 } = {}) {
    if (scene) this.scene = scene;
    this.hz = hz;
    const fx = Math.sin(me.heading);
    const fz = -Math.cos(me.heading);
    const flat = others.map((o) => ({ x: o.pos.x, z: o.pos.z, y: o.pos.y, name: o.name }));
    const t = active ? mirrorTarget({ x: me.pos.x, z: me.pos.z, fx, fz }, flat) : null;
    if (t) {
      this.target = t;
      this.linger = MIRROR_LINGER;
    } else this.linger = active ? Math.max(0, this.linger - dt) : 0;
    const want = this.linger > 0;
    if (want !== this.on) {
      this.on = want;
      this.el.classList.toggle('is-on', want);
      if (want) {
        this.drawT = 0;
        this.hasLook = false;
      }
    }
    this.opacity = reducedMotion ? (want ? 1 : 0) : Math.max(0, Math.min(1, this.opacity + (want ? dt * 5 : -dt * 4)));
    if (!this.opacity) {
      this.drawn = false;
      return;
    }
    if (t) this.tag.innerHTML = `<i class="sp-mirror__arrow">${t.side === 'left' ? '◤' : '◥'}</i><b>${esc(t.rider.name ?? 'Rider')}</b><span>${t.d.toFixed(0)} m behind</span>`;
    // From my left shoulder, looking back up the run, turned toward the rider (smoothly).
    const want0 = t ? Math.max(-MAX_TURN, Math.min(MAX_TURN, t.bearing)) : 0;
    this.turn += (want0 - this.turn) * (1 - Math.exp(-dt * 6));
    const cam = this.camera;
    cam.position.set(me.pos.x + fz * 0.4 + fx * 0.2, me.pos.y + 1.25, me.pos.z - fx * 0.4 + fz * 0.2);
    // Back is −f; turning toward my left (positive bearing) swings the view toward +left = (fz, −fx).
    const bx = -fx * Math.cos(this.turn) + fz * Math.sin(this.turn);
    const bz = -fz * Math.cos(this.turn) - fx * Math.sin(this.turn);
    const ty = t ? t.rider.y + 0.7 : me.pos.y + 2.2;
    const goal = new THREE.Vector3(cam.position.x + bx * 10, ty + (t ? 0 : 1.2), cam.position.z + bz * 10);
    if (!this.hasLook) this.look.copy(goal);
    else this.look.lerp(goal, 1 - Math.exp(-dt * 8));
    this.hasLook = true;
    cam.lookAt(this.look);
    this.drawT -= dt;
  }

  /** After the frame is drawn: refresh the rear view when due, then lay it into the frame. */
  draw() {
    if (!this.opacity || !this.scene) return;
    this._ensure();
    const r = this.renderer;
    if (this.drawT <= 0 || !this.drawn) {
      this.drawT = 1 / this.hz;
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
      this.drawn = true;
    }
    // Where the glass is on the canvas, in the renderer's (CSS) pixels, from the top (three/webgpu counts y down on both backends).
    const canvas = r.domElement.getBoundingClientRect();
    const g = this.glass.getBoundingClientRect();
    if (!g.width || !canvas.width) return;
    r.getSize(this._size);
    const s = this._size.x / canvas.width;
    const x = (g.left - canvas.left) * s;
    const y = (g.top - canvas.top) * s;
    const w = g.width * s;
    const h = g.height * s;
    this.uOpacity.value = this.opacity;
    this.uSize.value.set(w, h);
    this.uRadius.value = Math.min(18 * s, h / 2);
    r.getViewport(this._vp);
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(null);
    r.setViewport(x, y, w, h);
    r.setScissor(x, y, w, h);
    r.setScissorTest(true);
    r.render(this.quadScene, this.quadCam);
    r.setScissorTest(false);
    r.setViewport(this._vp);
    r.autoClear = autoClear;
  }

  dispose() {
    this.rt?.dispose();
    this.quad?.geometry.dispose();
    this.quad?.material.dispose();
    this.el.remove();
  }
}
