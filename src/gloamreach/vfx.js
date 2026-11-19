/**
 * The look of a fight, in pooled, instanced pieces (adapted from Lanternwood's
 * vfx.js to a lit 3D world): glowing particles and smoke, sparks drawn as
 * streaks along their flight, weapon trails and slash arcs as ribbons,
 * shockwave rings, frost and fire bursts, lightning that re-forks every
 * frame, arrows, bolts and a falling meteor, ground telegraphs that fill as a
 * monster winds up, the aiming reticle, and two flash lights. Everything
 * that glows is bright enough for the bloom to pick up.
 */
import * as THREE from 'three';
import { Cards } from './fx.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------------ streaks */

const STREAK_VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, width
attribute vec4 aVel;   // xyz (direction × length)
attribute vec4 aCol;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = uv;
  vCol = aCol;
  vec4 a = modelViewMatrix * vec4(aPos.xyz, 1.0);
  vec4 b = modelViewMatrix * vec4(aPos.xyz - aVel.xyz, 1.0);
  vec2 d = b.xy - a.xy;
  float l = length(d);
  vec2 dir = l > 1e-5 ? d / l : vec2(0.0, 1.0);
  vec2 side = vec2(-dir.y, dir.x);
  vec4 p = mix(a, b, position.y + 0.5);
  p.xy += side * position.x * aPos.w;
  gl_Position = projectionMatrix * p;
}`;
const STREAK_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float a = (1.0 - x * x) * (1.0 - vUv.y * 0.7) * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;

class Streaks {
  constructor(max) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    this.pos = new Float32Array(max * 4);
    this.vel = new Float32Array(max * 4);
    this.col = new Float32Array(max * 4);
    for (const [k, a] of [['aPos', this.pos], ['aVel', this.vel], ['aCol', this.col]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({ vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, toneMapped: false });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;
    this.max = max;
    this.n = 0;
  }

  begin() {
    this.n = 0;
  }

  push(x, y, z, w, vx, vy, vz, r, g, b, a) {
    if (this.n >= this.max) return;
    const i = this.n++ * 4;
    this.pos.set([x, y, z, w], i);
    this.vel.set([vx, vy, vz, 0], i);
    this.col.set([r, g, b, a], i);
  }

  end() {
    this.geo.instanceCount = this.n;
    for (const k of ['aPos', 'aVel', 'aCol']) {
      const at = this.geo.attributes[k];
      at.needsUpdate = true;
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * 4);
    }
  }
}

/* ------------------------------------------------------------------ ribbons (trails, lightning) */

/** A strip of quads with per-vertex colour (additive), rebuilt each frame. */
class Ribbons {
  constructor(max = 4000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.uv = new Float32Array(max * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 color; varying vec4 vC; varying vec2 vUv; void main(){ vC = color; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec4 vC; varying vec2 vUv; void main(){ float e = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0); float a = vC.a * e; gl_FragColor = vec4(vC.rgb * a, a); }',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      toneMapped: false
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 22;
    this.n = 0;
  }

  begin() {
    this.n = 0;
  }

  /** A strip: `a[i]`, `b[i]` the two edges; colour and alpha per pair. */
  strip(a, b, color, alphas) {
    const m = a.length;
    if (m < 2 || this.n + (m - 1) * 6 > this.max) return;
    const put = (p, c, al, v) => {
      const i = this.n++;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      this.col[i * 4] = c.r;
      this.col[i * 4 + 1] = c.g;
      this.col[i * 4 + 2] = c.b;
      this.col[i * 4 + 3] = al;
      this.uv[i * 2] = 0;
      this.uv[i * 2 + 1] = v;
    };
    for (let i = 0; i < m - 1; i++) {
      const al0 = alphas[i];
      const al1 = alphas[i + 1];
      put(a[i], color, al0, 0);
      put(b[i], color, al0, 1);
      put(a[i + 1], color, al1, 0);
      put(b[i], color, al0, 1);
      put(b[i + 1], color, al1, 1);
      put(a[i + 1], color, al1, 0);
    }
  }

  end() {
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'color', 'uv']) {
      const at = this.geo.attributes[k];
      at.needsUpdate = true;
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * at.itemSize);
    }
  }
}

/* ------------------------------------------------------------------ ground decals */

const DECAL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFill;
uniform float uArc;
uniform float uAlpha;
uniform float uTime;
uniform float uKind;
varying vec2 vL;
void main() {
  float r = length(vL);
  if (r > 1.0) discard;
  float ang = abs(atan(vL.x, vL.y));
  if (uArc < 3.1 && ang > uArc * 0.5) discard;
  float edge = smoothstep(0.9, 0.97, r) * (1.0 - smoothstep(0.985, 1.0, r));
  float a;
  vec3 c = uColor;
  if (uKind < 0.5) {
    // A telegraph: a faint field, a bright rim, and a fill that grows to the rim as the blow lands.
    float fill = step(r, uFill) * 0.16 + smoothstep(uFill - 0.05, uFill, r) * step(r, uFill) * 0.5;
    a = 0.06 + edge * 0.75 + fill;
    if (uArc < 3.1) a += smoothstep(uArc * 0.5 - 0.04, uArc * 0.5, ang) * 0.8;
  } else if (uKind < 1.5) {
    // The reticle: two rings and turning ticks.
    float ring = smoothstep(0.86, 0.9, r) * (1.0 - smoothstep(0.94, 0.98, r));
    float inner = smoothstep(0.08, 0.1, r) * (1.0 - smoothstep(0.14, 0.18, r));
    float ticks = step(0.92, fract(atan(vL.y, vL.x) / 6.2832 * 8.0 + uTime * 0.2)) * smoothstep(0.62, 0.66, r) * (1.0 - smoothstep(0.8, 0.84, r));
    a = ring + inner + ticks * 0.8 + 0.06;
  } else {
    // A soft glow (an aura under an elite, a scorch, a frost patch).
    a = (1.0 - r) * (1.0 - r) * 0.9 + edge * 0.4;
  }
  a *= uAlpha;
  gl_FragColor = vec4(c * a, a);
}`;

/* ------------------------------------------------------------------ the system */

export class CombatFx {
  constructor(scene, bank, heightAt) {
    this.scene = scene;
    this.heightAt = heightAt;
    this.group = new THREE.Group();
    scene.add(this.group);
    const glow = bank.glow(64, 1.6);
    const puff = bank.puff(9);
    this.glow = new Cards(2500, glow, { blend: 'add' });
    this.smoke = new Cards(900, puff, { blend: 'alpha', lit: 1 });
    this.streaks = new Streaks(1500);
    this.ribbons = new Ribbons(9000);
    for (const o of [this.glow.mesh, this.smoke.mesh, this.streaks.mesh, this.ribbons.mesh]) this.group.add(o);
    this.parts = [];
    this.puffs = [];
    this.sparks = [];
    this.trails = new Map();
    this.bolts = [];
    this.rings = [];
    this.decals = [];
    this.meshes = [];
    this.arcs = [];
    this.t = 0;
    // Two lights for flashes (fixed, so shaders never recompile).
    this.lights = [0, 1].map(() => {
      const l = new THREE.PointLight(0xffaa55, 0, 14, 1.6);
      l.userData.life = 0;
      this.group.add(l);
      return l;
    });
    this._decalGeo = new Map();
    this.reticle = this._decal(1.4, { kind: 1, color: '#ffe0a0' });
    this.reticle.mesh.visible = false;
    this.arrowGeo = this._arrowGeometry();
    this.arrowMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });
    this.arrowHeadMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 1, roughness: 0.3 });
    this.fletchMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.8, side: THREE.DoubleSide });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.8, emissive: 0xff4a10, emissiveIntensity: 0.9, emissiveMap: this._lavaTex() });
  }

  /* ------------------------------------------------------------ particles */

  /** Glowing motes/embers: `n` from `p`, colour [r,g,b] (× brightness), speed, life, gravity. */
  burst(p, n, color, { speed = 4, life = 0.6, size = 0.12, gravity = 4, up = 0.5, spread = 1, drag = 1.5, grow = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const d = V(rnd(-1, 1), rnd(-0.2, 1) + up, rnd(-1, 1)).normalize().multiplyScalar(speed * rnd(0.3, 1) * spread);
      this.parts.push({ p: p.clone(), v: d, life: 0, max: life * rnd(0.6, 1.3), size: size * rnd(0.6, 1.3), color, gravity, drag, grow });
    }
  }

  /** Sparks: bright streaks flying out, falling. `dir` biases them (the blow's direction). */
  sparksAt(p, n, color, { speed = 9, life = 0.35, dir = null, spread = 1, gravity = 14, width = 0.025 } = {}) {
    for (let i = 0; i < n; i++) {
      const v = V(rnd(-1, 1), rnd(-0.3, 1.2), rnd(-1, 1)).normalize().multiplyScalar(spread);
      if (dir) v.add(dir.clone().multiplyScalar(1.2));
      v.normalize().multiplyScalar(speed * rnd(0.4, 1.1));
      this.sparks.push({ p: p.clone(), v, life: 0, max: life * rnd(0.5, 1.2), color, gravity, width });
    }
  }

  /** Smoke and dust (alpha, lit). */
  smokeAt(p, n, color = [0.4, 0.38, 0.36], { size = 0.6, grow = 2, life = 1.4, speed = 1, up = 0.8, alpha = 0.5 } = {}) {
    for (let i = 0; i < n; i++) {
      this.puffs.push({ p: p.clone().add(V(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3))), v: V(rnd(-1, 1) * speed, up * rnd(0.5, 1.2), rnd(-1, 1) * speed), life: 0, max: life * rnd(0.7, 1.3), size, grow, color, alpha, rot: rnd(0, 6) });
    }
  }

  /** A flash of light. */
  flash(p, color = 0xffaa55, intensity = 30, life = 0.25, range = 12) {
    const l = this.lights.reduce((a, b) => (a.userData.life < b.userData.life ? a : b));
    l.position.copy(p);
    l.color.set(color);
    l.distance = range;
    l.userData = { life, max: life, peak: intensity };
  }

  /* ------------------------------------------------------------ composite effects */

  /** A weapon striking flesh, bark or chitin: a star of sparks, a white-hot core, a flash. */
  hit(p, { color = [1.6, 1.3, 0.9], dir = null, crit = false, heavy = false, blood = null } = {}) {
    const k = crit ? 1.6 : heavy ? 1.3 : 1;
    this.sparksAt(p, Math.round(14 * k), color, { dir, speed: 10 * k, life: 0.3 });
    this.burst(p, 1, [3, 2.8, 2.4], { speed: 0, life: 0.09, size: 0.7 * k, gravity: 0 });
    this.burst(p, 1, color, { speed: 0, life: 0.16, size: 1.2 * k, gravity: 0 });
    if (blood) this.burst(p, 8, blood, { speed: 3, life: 0.5, size: 0.08, gravity: 9 });
    if (crit) this.ring(p, { radius: 1.4, color: [2.4, 1.8, 0.6], life: 0.22, width: 0.12, flat: false });
  }

  /** Fire: flames rising, embers, smoke. */
  fire(p, n = 8, { size = 0.35, speed = 1.5, life = 0.6 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = Math.random() < 0.5 ? [3.2, 1.2, 0.25] : [2.6, 0.7, 0.12];
      this.parts.push({ p: p.clone().add(V(rnd(-0.2, 0.2), rnd(-0.1, 0.2), rnd(-0.2, 0.2))), v: V(rnd(-0.6, 0.6) * speed, rnd(1, 2.4) * speed, rnd(-0.6, 0.6) * speed), life: 0, max: life * rnd(0.6, 1.2), size: size * rnd(0.6, 1.3), color: c, gravity: -1, drag: 2, grow: -0.6 });
    }
  }

  /** A fiery explosion: a flash, a fireball of glow, a shockwave ring, embers, smoke. */
  explode(p, radius = 3, { color = 'fire', shake = null } = {}) {
    const fire = color === 'fire';
    const c = fire ? [3.4, 1.4, 0.3] : color === 'frost' ? [1.0, 2.2, 3.4] : color === 'arcane' ? [2.4, 1.0, 3.4] : color === 'poison' ? [1.0, 2.6, 0.6] : [2.6, 2.2, 1.6];
    this.burst(p, 1, [3, 2.6, 2], { speed: 0, life: 0.14, size: radius * 1.6, gravity: 0 });
    this.burst(p, 26, c, { speed: radius * 3.2, life: 0.55, size: 0.5, gravity: -0.5, drag: 4, up: 0.3, grow: 1.2 });
    this.sparksAt(p, 30, c, { speed: radius * 6, life: 0.6, gravity: 9 });
    this.ring(p, { radius: radius * 1.15, color: c, life: 0.4, width: 0.35 });
    if (fire) this.smokeAt(p.clone().add(V(0, 0.5, 0)), 10, [0.2, 0.16, 0.14], { size: 1, grow: radius * 0.9, life: 1.8, speed: 1.5, alpha: 0.55 });
    this.flash(p.clone().add(V(0, 1, 0)), fire ? 0xff7a2a : color === 'frost' ? 0x7ac8ff : 0xb070ff, 60, 0.35, radius * 5);
    void shake;
  }

  /** A shockwave or frost ring across the ground (flat) or in the air. */
  ring(p, { radius = 3, color = [2, 2, 2], life = 0.4, width = 0.2, flat = true, from = 0.1 } = {}) {
    const g = new THREE.RingGeometry(0.86, 1, 64, 1);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(p).add(V(0, flat ? 0.12 : 0, 0));
    if (flat) mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 22;
    this.group.add(mesh);
    // An upright ring faces the camera (a burst in the air).
    this.rings.push({ mesh, life: 0, max: life, radius, from, width, face: !flat });
  }

  /** A crescent of light along a sword's swing: centre, facing, sweep (radians), tilt. */
  slash(p, yaw, { radius = 2.4, arc = 2.4, tilt = 0, color = [2.4, 2.2, 1.9], life = 0.2, reverse = false } = {}) {
    const g = new THREE.RingGeometry(radius * 0.62, radius, 48, 4, -arc / 2, arc);
    const pos = g.attributes.position;
    const al = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const a = Math.atan2(pos.getY(i), pos.getX(i));
      const t = (a + arc / 2) / arc;
      const r = (Math.hypot(pos.getX(i), pos.getY(i)) / radius - 0.62) / 0.38;
      // Brightest just inside the leading edge, fading toward the tail and both rims.
      al[i] = (reverse ? 1 - t : t) ** 2.2 * Math.sin(Math.min(1, Math.max(0, r)) * Math.PI) ** 1.3 * (0.35 + 0.65 * r) * 0.75;
    }
    g.setAttribute('aA', new THREE.BufferAttribute(al, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color(...color) }, uK: { value: 1 } },
      vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uK; varying float vA; void main(){ float a = vA * uK; gl_FragColor = vec4(uC * a, a); }',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(p);
    // The ring lies in the swing's plane: horizontal, turned to face along `yaw`, tilted for overheads.
    mesh.rotation.order = 'YXZ';
    mesh.rotation.set(-Math.PI / 2 + tilt, yaw - Math.PI / 2, 0);
    mesh.renderOrder = 23;
    this.group.add(mesh);
    this.arcs.push({ mesh, life: 0, max: life });
  }

  /** Lightning from a to b, re-forked every frame while it lasts. */
  lightning(a, b, { life = 0.28, color = [2.2, 2.4, 3.6], width = 0.14, forks = 2 } = {}) {
    this.bolts.push({ a: a.clone(), b: b.clone(), life: 0, max: life, color: new THREE.Color(...color), width, forks });
  }

  /** A ground mark: a monster's wind-up (circle or cone), filling until the blow. */
  telegraph({ x, z, radius, yaw = 0, arc = Math.PI * 2, time = 1, color = '#ff4a2a' }) {
    const d = this._decal(radius, { kind: 0, color, arc, x, z, yaw });
    d.time = time;
    d.age = 0;
    this.decals.push(d);
    return d;
  }

  /** A soft glow on the ground (an elite's aura, a scorch): returns a handle with .remove(). */
  glowDecal({ x, z, radius, color = '#ff7a2a', alpha = 0.6, life = null }) {
    const d = this._decal(radius, { kind: 2, color, x, z });
    d.mesh.material.uniforms.uAlpha.value = alpha;
    d.alpha = alpha;
    d.life = life;
    d.age = 0;
    if (life) this.decals.push(d);
    return d;
  }

  _decal(radius, { kind = 0, color = '#ff4a2a', arc = Math.PI * 2, x = 0, z = 0, yaw = 0 }) {
    const n = 22;
    const geo = new THREE.PlaneGeometry(2, 2, n, n);
    geo.rotateX(-Math.PI / 2);
    const local = new Float32Array(geo.attributes.position.count * 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      local[i * 2] = p.getX(i);
      local[i * 2 + 1] = p.getZ(i);
    }
    geo.setAttribute('aL', new THREE.BufferAttribute(local, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(kind === 1 ? 1.4 : 1.6) }, uFill: { value: 0 }, uArc: { value: arc }, uAlpha: { value: 1 }, uTime: { value: 0 }, uKind: { value: kind } },
      // Pulled a little toward the camera, so the marks show over the grass but stay behind walls and trunks.
      vertexShader: 'attribute vec2 aL; varying vec2 vL; void main(){ vL = aL; vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz -= normalize(mv.xyz) * 0.7; gl_Position = projectionMatrix * mv; }',
      fragmentShader: DECAL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 15;
    this.group.add(mesh);
    const d = { mesh, radius, remove: () => this._removeDecal(d) };
    this.placeDecal(d, x, z, yaw);
    return d;
  }

  /** Lay a decal over the ground at (x, z), its grid following the land. */
  placeDecal(d, x, z, yaw = 0, radius = d.radius) {
    const p = d.mesh.geometry.attributes.position;
    const L = d.mesh.geometry.attributes.aL;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (let i = 0; i < p.count; i++) {
      const lx = L.getX(i) * radius;
      const lz = L.getY(i) * radius;
      // Local +y of the decal is the way it faces (yaw 0 → +z).
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      p.setXYZ(i, wx, this.heightAt(wx, wz) + 0.06, wz);
    }
    p.needsUpdate = true;
    d.radius = radius;
  }

  _removeDecal(d) {
    d.mesh.removeFromParent();
    d.mesh.geometry.dispose();
    d.mesh.material.dispose();
    d.dead = true;
  }

  /** The aiming reticle, on the ground under the pointer (or hidden). */
  setReticle(point, { radius = 1.2, color = null, locked = false } = {}) {
    const r = this.reticle;
    if (!point) {
      r.mesh.visible = false;
      return;
    }
    r.mesh.visible = true;
    if (color) r.mesh.material.uniforms.uColor.value.set(color).multiplyScalar(1.4);
    else r.mesh.material.uniforms.uColor.value.set(locked ? '#ff7050' : '#ffe0a0').multiplyScalar(1.4);
    this.placeDecal(r, point.x, point.z, 0, radius);
  }

  /* ------------------------------------------------------------ things that fly */

  /** A trail of a moving point (a weapon's tip and base): call `trailPush` each frame while swinging. */
  trailPush(id, tip, base, color, strength = 1) {
    let t = this.trails.get(id);
    if (!t) this.trails.set(id, (t = { pts: [], color: new THREE.Color(), strength }));
    t.color.copy(color);
    t.strength = strength;
    t.pts.unshift({ tip: tip.clone(), base: base.clone(), age: 0 });
    if (t.pts.length > 14) t.pts.pop();
  }

  arrowMesh() {
    const g = new THREE.Group();
    const [shaft, head, fl] = this.arrowGeo;
    g.add(new THREE.Mesh(shaft, this.arrowMat), new THREE.Mesh(head, this.arrowHeadMat), new THREE.Mesh(fl, this.fletchMat));
    this.group.add(g);
    return g;
  }

  _arrowGeometry() {
    const shaft = new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5);
    shaft.rotateX(Math.PI / 2);
    const head = new THREE.ConeGeometry(0.018, 0.07, 4);
    head.rotateX(Math.PI / 2);
    head.translate(0, 0, 0.38);
    const fl = new THREE.PlaneGeometry(0.035, 0.12);
    fl.rotateX(Math.PI / 2);
    fl.translate(0, 0, -0.3);
    const fl2 = fl.clone();
    fl2.rotateZ(Math.PI / 2);
    const merged = new THREE.BufferGeometry();
    void merged;
    return [shaft, head, (() => {
      const a = fl.toNonIndexed();
      const b = fl2.toNonIndexed();
      const g = new THREE.BufferGeometry();
      const p = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]);
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.computeVertexNormals();
      return g;
    })()];
  }

  /** A burning rock for the meteor. */
  rockMesh(size = 1.2) {
    const g = new THREE.IcosahedronGeometry(size, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = V(p.getX(i), p.getY(i), p.getZ(i));
      v.multiplyScalar(1 + Math.sin(v.x * 5) * 0.08 + Math.cos(v.y * 7 + v.z * 3) * 0.08);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, this.rockMat);
    this.group.add(m);
    return m;
  }

  _lavaTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      g.lineWidth = 1 + Math.random() * 2.5;
      g.beginPath();
      let x = Math.random() * 128;
      let y = Math.random() * 128;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (Math.random() - 0.5) * 30;
        y += (Math.random() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /** A mesh to dispose of when its time is up (projectile visuals register themselves here). */
  temp(mesh, life) {
    this.meshes.push({ mesh, life: 0, max: life });
  }

  /* ------------------------------------------------------------ the frame */

  update(dt, camera) {
    this.t += dt;
    const camPos = camera.position;
    // Glow particles.
    this.glow.begin();
    this.parts = this.parts.filter((q) => (q.life += dt) < q.max);
    for (const q of this.parts) {
      q.v.y -= q.gravity * dt;
      q.v.multiplyScalar(Math.exp(-q.drag * dt));
      q.p.addScaledVector(q.v, dt);
      const k = q.life / q.max;
      const a = (1 - k) * Math.min(1, q.life * 30);
      this.glow.push(q.p.x, q.p.y, q.p.z, q.size * (1 + q.grow * k), q.color[0], q.color[1], q.color[2], a);
    }
    this.glow.end();
    // Smoke.
    this.smoke.begin();
    this.puffs = this.puffs.filter((q) => (q.life += dt) < q.max);
    for (const q of this.puffs) {
      q.v.multiplyScalar(Math.exp(-1.2 * dt));
      q.p.addScaledVector(q.v, dt);
      const k = q.life / q.max;
      this.smoke.push(q.p.x, q.p.y, q.p.z, q.size + q.grow * k, q.color[0], q.color[1], q.color[2], q.alpha * Math.min(1, k * 8) * (1 - k), q.rot + k);
    }
    this.smoke.end();
    // Sparks as streaks.
    this.streaks.begin();
    this.sparks = this.sparks.filter((q) => (q.life += dt) < q.max);
    for (const q of this.sparks) {
      q.v.y -= q.gravity * dt;
      q.p.addScaledVector(q.v, dt);
      const a = 1 - q.life / q.max;
      const l = 0.035;
      this.streaks.push(q.p.x, q.p.y, q.p.z, q.width, q.v.x * l, q.v.y * l, q.v.z * l, q.color[0] * 2, q.color[1] * 2, q.color[2] * 2, a);
    }
    this.streaks.end();
    // Ribbons: trails and lightning.
    this.ribbons.begin();
    for (const [id, t] of this.trails) {
      for (const p of t.pts) p.age += dt;
      t.pts = t.pts.filter((p) => p.age < 0.16);
      if (!t.pts.length) {
        this.trails.delete(id);
        continue;
      }
      const c = t.color.clone().multiplyScalar(1.6 * t.strength);
      this.ribbons.strip(t.pts.map((p) => p.base), t.pts.map((p) => p.tip), c, t.pts.map((p) => Math.max(0, 1 - p.age / 0.16) * 0.85));
    }
    this.bolts = this.bolts.filter((b) => (b.life += dt) < b.max);
    for (const b of this.bolts) {
      const a = 1 - b.life / b.max;
      for (let f = 0; f <= b.forks; f++) {
        const pts = this._jag(b.a, f === 0 ? b.b : b.a.clone().lerp(b.b, rnd(0.3, 0.7)).add(V(rnd(-1, 1), rnd(-0.5, 1), rnd(-1, 1)).multiplyScalar(b.a.distanceTo(b.b) * 0.2)), 12);
        const w = (f === 0 ? b.width : b.width * 0.5);
        const side = V();
        const A = [];
        const B = [];
        for (let i = 0; i < pts.length; i++) {
          const dir = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
          const view = pts[i].clone().sub(camPos).normalize();
          side.crossVectors(dir, view).normalize().multiplyScalar(w);
          A.push(pts[i].clone().add(side));
          B.push(pts[i].clone().sub(side));
        }
        this.ribbons.strip(A, B, b.color, pts.map(() => a));
        if (f === 0) {
          const W = A.map((p, i) => p.clone().lerp(pts[i], -2.5));
          const W2 = B.map((p, i) => p.clone().lerp(pts[i], -2.5));
          this.ribbons.strip(W, W2, b.color.clone().multiplyScalar(0.25), pts.map(() => a * 0.6));
        }
      }
    }
    this.ribbons.end();
    // Rings.
    this.rings = this.rings.filter((r) => {
      r.life += dt;
      const k = r.life / r.max;
      if (k >= 1) {
        r.mesh.removeFromParent();
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        return false;
      }
      const s = r.radius * (r.from + (1 - r.from) * (1 - (1 - k) ** 3));
      r.mesh.scale.setScalar(s);
      if (r.face) r.mesh.quaternion.copy(camera.quaternion);
      r.mesh.material.opacity = (1 - k) * (1 - k);
      return true;
    });
    // Slash arcs.
    this.arcs = this.arcs.filter((r) => {
      r.life += dt;
      const k = r.life / r.max;
      if (k >= 1) {
        r.mesh.removeFromParent();
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        return false;
      }
      r.mesh.material.uniforms.uK.value = (1 - k) ** 1.5;
      r.mesh.scale.setScalar(1 + k * 0.15);
      return true;
    });
    // Decals with a life (telegraphs fill, glows fade).
    this.decals = this.decals.filter((d) => {
      if (d.dead) return false;
      d.age += dt;
      const u = d.mesh.material.uniforms;
      if (d.time) {
        u.uFill.value = Math.min(1, d.age / d.time);
        if (d.age > d.time + 0.12) {
          d.remove();
          return false;
        }
      } else if (d.life) {
        u.uAlpha.value = d.alpha * Math.min(1, (d.life - d.age) / 0.6);
        if (d.age > d.life) {
          d.remove();
          return false;
        }
      }
      return true;
    });
    this.reticle.mesh.material.uniforms.uTime.value = this.t;
    // Temporary meshes.
    this.meshes = this.meshes.filter((m) => {
      m.life += dt;
      if (m.life < m.max) return true;
      m.mesh.removeFromParent();
      return false;
    });
    // Flash lights.
    for (const l of this.lights) {
      const u = l.userData;
      if (u.life > 0) {
        u.life -= dt;
        l.intensity = u.peak * Math.max(0, u.life / u.max);
      } else l.intensity = 0;
    }
  }

  _jag(a, b, n) {
    const out = [a.clone()];
    const d = a.distanceTo(b);
    for (let i = 1; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      p.add(V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(d * 0.06));
      out.push(p);
    }
    out.push(b.clone());
    return out;
  }

  dispose() {
    for (const c of [this.glow, this.smoke]) c.dispose();
    this.streaks.geo.dispose();
    this.streaks.mat.dispose();
    this.ribbons.geo.dispose();
    this.ribbons.mat.dispose();
    this.group.removeFromParent();
  }
}
