/**
 * Lanternwood's combat effects, in the voxel style of its figures: sparks
 * that streak, square embers, soft glows, dust and smoke, blocks of debris
 * that bounce and settle, rings that race across the ground, a pillar of
 * light, a flash of real light on the scene. Everything is pooled — one
 * instanced draw for all additive particles, one for all smoke and dust, one
 * for all debris — with a budget, so a busy fight stays at 60 fps.
 *
 *   const vfx = new Vfx(scene);
 *   vfx.hit(x, y, z, { angle, crit, color });   vfx.explosion(x, y, z);   vfx.frost(x, z, r) …
 *   vfx.update(dt, camera);                      // each frame
 *
 * `day` (0…1) tones the additive light down in daylight realms so it never
 * washes the picture out.
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const col = (c) => (c instanceof THREE.Color ? c : new THREE.Color(c));

/** Particle shapes (the fragment shader draws each). */
export const SHAPE = { glow: 0, pixel: 1, streak: 2, ring: 3, smoke: 4 };

const PART_VS = /* glsl */ `
attribute vec3 iPos; attribute vec4 iCol; attribute vec3 iVel; attribute vec2 iSize; // size, shape
varying vec4 vCol; varying vec2 vUv; varying float vShape;
void main() {
  vUv = position.xy + 0.5;
  vCol = iCol;
  vShape = iSize.y;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float s = iSize.x;
  if (vShape > 1.5 && vShape < 2.5) {
    // A streak: stretched along its motion as seen on screen.
    vec2 v = (viewMatrix * vec4(iVel, 0.0)).xy;
    float len = length(v);
    vec2 d = len > 1e-4 ? v / len : vec2(0.0, 1.0);
    vec2 n = vec2(-d.y, d.x);
    mv.xy += d * position.y * (s + len * 0.045) + n * position.x * s * 0.35;
  } else if (vShape > 0.5 && vShape < 1.5) {
    // A pixel: a little square that turns as it flies.
    float a = iVel.x * 0.0 + iPos.x * 7.0 + iPos.z * 5.0;
    mat2 r = mat2(cos(a), sin(a), -sin(a), cos(a));
    mv.xy += r * position.xy * s;
  } else {
    mv.xy += position.xy * s;
  }
  gl_Position = projectionMatrix * mv;
}`;

const PART_FS = /* glsl */ `
uniform float uAdd; uniform float uGain;
varying vec4 vCol; varying vec2 vUv; varying float vShape;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a;
  if (vShape < 0.5) a = pow(max(0.0, 1.0 - r), 2.2);
  else if (vShape < 1.5) { vec2 q = abs(p) * 2.0; a = 1.0 - smoothstep(0.7, 1.0, max(q.x, q.y)); }
  else if (vShape < 2.5) { a = (1.0 - abs(p.y) * 2.0) * pow(max(0.0, 1.0 - abs(p.x) * 2.0), 0.6); }
  else if (vShape < 3.5) a = max(0.0, 1.0 - abs(r - 0.82) / 0.14) + 0.15 * max(0.0, 1.0 - r);
  else a = (1.0 - smoothstep(0.2, 1.0, r)) * (0.75 + 0.25 * sin(p.x * 13.0 + p.y * 9.0));
  a *= vCol.a;
  if (a < 0.004) discard;
  if (uAdd > 0.5) gl_FragColor = vec4(vCol.rgb * a * uGain, a);
  else gl_FragColor = vec4(vCol.rgb, a);
}`;

/** A pool of camera-facing particles drawn in one instanced call. */
class ParticlePool {
  constructor(scene, cap, additive) {
    this.cap = cap;
    this.n = 0;
    const F = (k) => new Float32Array(cap * k);
    this.d = { p: F(3), v: F(3), c: F(3), life: F(1), max: F(1), s0: F(1), s1: F(1), a0: F(1), grav: F(1), drag: F(1), shape: F(1), delay: F(1), rise: F(1) };
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(F(4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(F(2), 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iCol', this.aCol);
    geo.setAttribute('iVel', this.aVel);
    geo.setAttribute('iSize', this.aSize);
    geo.instanceCount = 0;
    this.uGain = { value: 1 };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uAdd: { value: additive ? 1 : 0 }, uGain: this.uGain },
      vertexShader: PART_VS,
      fragmentShader: PART_FS,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 8 : 4;
    scene.add(this.mesh);
  }

  /** One particle: { p: [x,y,z], v: [x,y,z], color, life, size: [from, to], alpha, grav, drag, shape, delay, rise }. Returns false over budget. */
  add(o) {
    if (this.n >= this.cap) return false;
    const i = this.n++;
    const d = this.d;
    d.p.set(o.p, i * 3);
    d.v.set(o.v ?? [0, 0, 0], i * 3);
    const c = o.color;
    d.c[i * 3] = c.r;
    d.c[i * 3 + 1] = c.g;
    d.c[i * 3 + 2] = c.b;
    d.life[i] = 0;
    d.max[i] = o.life ?? 0.5;
    d.s0[i] = o.size?.[0] ?? 0.1;
    d.s1[i] = o.size?.[1] ?? d.s0[i];
    d.a0[i] = o.alpha ?? 1;
    d.grav[i] = o.grav ?? 0;
    d.drag[i] = o.drag ?? 0;
    d.shape[i] = o.shape ?? SHAPE.glow;
    d.delay[i] = o.delay ?? 0;
    d.rise[i] = o.rise ?? 0;
    return true;
  }

  _move(from, to) {
    const d = this.d;
    for (const k of ['p', 'v', 'c']) d[k].copyWithin(to * 3, from * 3, from * 3 + 3);
    for (const k of ['life', 'max', 's0', 's1', 'a0', 'grav', 'drag', 'shape', 'delay', 'rise']) d[k][to] = d[k][from];
  }

  update(dt) {
    const d = this.d;
    let i = 0;
    let w = 0;
    while (i < this.n) {
      if (d.delay[i] > 0) {
        d.delay[i] -= dt;
        i++;
        continue;
      }
      d.life[i] += dt;
      if (d.life[i] >= d.max[i]) {
        this._move(--this.n, i);
        continue;
      }
      const k = Math.exp(-d.drag[i] * dt);
      d.v[i * 3] *= k;
      d.v[i * 3 + 1] = d.v[i * 3 + 1] * k - d.grav[i] * dt + d.rise[i] * dt;
      d.v[i * 3 + 2] *= k;
      d.p[i * 3] += d.v[i * 3] * dt;
      d.p[i * 3 + 1] += d.v[i * 3 + 1] * dt;
      d.p[i * 3 + 2] += d.v[i * 3 + 2] * dt;
      if (d.p[i * 3 + 1] < 0.02 && d.grav[i] > 0) {
        d.p[i * 3 + 1] = 0.02;
        d.v[i * 3 + 1] *= -0.3;
        d.v[i * 3] *= 0.6;
        d.v[i * 3 + 2] *= 0.6;
      }
      i++;
    }
    for (i = 0; i < this.n; i++) {
      if (d.delay[i] > 0) continue;
      const t = d.life[i] / d.max[i];
      this.aPos.array.set(d.p.subarray(i * 3, i * 3 + 3), w * 3);
      this.aVel.array.set(d.v.subarray(i * 3, i * 3 + 3), w * 3);
      // Fade in quickly, out over the last part of its life.
      const a = d.a0[i] * Math.min(1, t * 12) * (t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1);
      this.aCol.array[w * 4] = d.c[i * 3];
      this.aCol.array[w * 4 + 1] = d.c[i * 3 + 1];
      this.aCol.array[w * 4 + 2] = d.c[i * 3 + 2];
      this.aCol.array[w * 4 + 3] = a;
      this.aSize.array[w * 2] = d.s0[i] + (d.s1[i] - d.s0[i]) * (1 - (1 - t) * (1 - t));
      this.aSize.array[w * 2 + 1] = d.shape[i];
      w++;
    }
    const g = this.mesh.geometry;
    g.instanceCount = w;
    for (const at of [this.aPos, this.aCol, this.aVel, this.aSize]) {
      at.needsUpdate = true;
      at.clearUpdateRanges?.();
      at.addUpdateRange?.(0, w * at.itemSize);
    }
  }

  clear() {
    this.n = 0;
    this.mesh.geometry.instanceCount = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}

/** Blocks that fly, tumble, bounce on the ground and shrink away (a monster breaking apart, rubble, ice). */
class DebrisPool {
  constructor(scene, cap, glow) {
    this.cap = cap;
    this.items = [];
    const mat = glow
      ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      : new THREE.MeshLambertMaterial({ emissive: '#000000' });
    if (!glow) {
      // Its own colours stay readable in the dark, as the figures' do.
      mat.onBeforeCompile = (s) => {
        s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.35;');
      };
    }
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color());
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !glow;
    this.mesh.renderOrder = glow ? 8 : 2;
    scene.add(this.mesh);
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.s = new THREE.Vector3();
    this.pv = new THREE.Vector3();
  }

  add(o) {
    if (this.items.length >= this.cap) this.items.shift();
    this.items.push({ p: [...o.p], v: [...o.v], r: [rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)], w: [rnd(-12, 12), rnd(-12, 12), rnd(-12, 12)], size: o.size, color: o.color, life: 0, max: o.life ?? rnd(1.3, 2.2), rest: false });
  }

  update(dt) {
    const out = [];
    for (const b of this.items) {
      b.life += dt;
      if (b.life >= b.max) continue;
      if (!b.rest) {
        b.v[1] -= 16 * dt;
        for (let k = 0; k < 3; k++) {
          b.p[k] += b.v[k] * dt;
          b.r[k] += b.w[k] * dt;
        }
        const floor = b.size * 0.5;
        if (b.p[1] < floor) {
          b.p[1] = floor;
          if (Math.abs(b.v[1]) < 1.2) {
            b.rest = true;
            b.r[0] = Math.round(b.r[0] / (Math.PI / 2)) * (Math.PI / 2);
            b.r[2] = Math.round(b.r[2] / (Math.PI / 2)) * (Math.PI / 2);
          } else {
            b.v[1] *= -0.38;
            b.v[0] *= 0.62;
            b.v[2] *= 0.62;
            for (const k of [0, 1, 2]) b.w[k] *= 0.6;
          }
        }
      }
      out.push(b);
    }
    this.items = out;
    const m = this.mesh;
    out.forEach((b, i) => {
      const t = b.life / b.max;
      const s = b.size * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
      this.q.setFromEuler(this.e.set(b.r[0], b.r[1], b.r[2]));
      this.m4.compose(this.pv.set(b.p[0], b.p[1] - (b.size - s) * 0.5, b.p[2]), this.q, this.s.set(s, s, s));
      m.setMatrixAt(i, this.m4);
      m.setColorAt(i, b.color);
    });
    m.count = out.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  clear() {
    this.items = [];
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}

const RING_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const RING_FS = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; uniform float uWidth; varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(1.0 - uWidth * 0.35, 1.0, r)) * smoothstep(1.0 - uWidth, 1.0 - uWidth * 0.4, r);
  a += 0.12 * (1.0 - smoothstep(0.0, 1.0, r)) * uWidth;
  a *= uAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

const BEAM_FS = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; uniform float uTime; varying vec2 vUv;
void main() {
  float edge = pow(max(sin(vUv.x * 3.14159), 0.0), 1.5);
  float up = (1.0 - smoothstep(0.25, 1.0, vUv.y)) * smoothstep(0.0, 0.05, vUv.y);
  float bands = 0.75 + 0.25 * sin(vUv.y * 22.0 - uTime * 9.0);
  float a = edge * up * bands * uAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.add = new ParticlePool(scene, 2400, true);
    this.smoke = new ParticlePool(scene, 700, false);
    this.debris = new DebrisPool(scene, 700, false);
    this.shards = new DebrisPool(scene, 260, true);
    this.rings = [];
    this.ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.billGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(this.ringGeo, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 }, uWidth: { value: 0.3 } },
        vertexShader: RING_VS,
        fragmentShader: RING_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4
      }));
      m.visible = false;
      m.renderOrder = 6;
      scene.add(m);
      this.rings.push({ m, t: 0, life: 0, r0: 0, r1: 0, a: 1 });
    }
    // The pillar of light (a level up) and a column for a heal.
    this.pillars = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0), new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 }, uTime: { value: 0 } },
        vertexShader: RING_VS,
        fragmentShader: BEAM_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      }));
      m.visible = false;
      m.renderOrder = 7;
      scene.add(m);
      this.pillars.push({ m, t: 0, life: 0 });
    }
    // One real light for flashes (always in the scene: lights coming and going recompile shaders).
    this.light = new THREE.PointLight('#ffb070', 0, 10, 1.6);
    scene.add(this.light);
    this.lightT = 0;
    this.lightMax = 0;
    this.day = 0;
    this.time = 0;
  }

  /** Move the pools into another scene (a new realm). */
  attach(scene) {
    this.scene = scene;
    for (const o of [this.add.mesh, this.smoke.mesh, this.debris.mesh, this.shards.mesh, this.light, ...this.rings.map((r) => r.m), ...this.pillars.map((p) => p.m)]) scene.add(o);
    this.clear();
  }

  clear() {
    this.add.clear();
    this.smoke.clear();
    this.debris.clear();
    this.shards.clear();
    for (const r of this.rings) r.m.visible = false;
    for (const p of this.pillars) p.m.visible = false;
    this.light.intensity = 0;
  }

  get busy() {
    return this.add.n / this.add.cap;
  }

  /* ------------------------------------------------------- primitives */

  /** A burst of particles round a point. */
  burst(x, y, z, { n = 10, color = '#ffffff', color2 = null, speed = [2, 6], up = 2, life = [0.25, 0.5], size = [0.06, 0.03], shape = SHAPE.streak, grav = 9, drag = 2, spread = 1, dir = null, cone = Math.PI, alpha = 1, rise = 0, smoke = false, delay = 0 } = {}) {
    const pool = smoke ? this.smoke : this.add;
    const c1 = col(color), c2 = color2 ? col(color2) : c1;
    const tmp = new THREE.Color();
    // Fewer when the pool is filling up: the budget holds.
    const scale = !smoke && this.busy > 0.7 ? 0.5 : 1;
    for (let i = 0; i < Math.ceil(n * scale); i++) {
      const a = dir == null ? rnd(0, TAU) : dir + rnd(-cone / 2, cone / 2);
      const sp = rnd(speed[0], speed[1]);
      const h = Math.cos(rnd(0, Math.PI / 2)) * spread;
      pool.add({
        p: [x + rnd(-0.05, 0.05) * spread, y, z + rnd(-0.05, 0.05) * spread],
        v: [Math.sin(a) * sp * h, rnd(0.2, 1) * up + (dir == null ? rnd(-0.5, 0.5) * sp * 0.4 : 0), Math.cos(a) * sp * h],
        color: tmp.copy(c1).lerp(c2, Math.random()).clone(),
        life: rnd(life[0], life[1]),
        size: Array.isArray(size) ? size : [size, size],
        shape,
        grav,
        drag,
        alpha,
        rise,
        delay: typeof delay === 'number' ? delay : rnd(delay[0], delay[1])
      });
    }
  }

  /** One soft glow (a flash at the heart of an impact). */
  glow(x, y, z, color, size = 1, life = 0.12, alpha = 1) {
    this.add.add({ p: [x, y, z], color: col(color).clone(), size: [size * 0.6, size], life, alpha, shape: SHAPE.glow });
  }

  /** A ring racing out across the ground. */
  ring(x, z, { color = '#ffd28a', r0 = 0.2, r1 = 3, life = 0.4, width = 0.3, alpha = 1, y = 0.06 } = {}) {
    const r = this.rings.find((q) => !q.m.visible) ?? this.rings.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    r.m.visible = true;
    r.m.position.set(x, y, z);
    r.m.material.uniforms.uColor.value.set(color);
    r.m.material.uniforms.uWidth.value = width;
    Object.assign(r, { t: 0, life, r0, r1, a: alpha });
  }

  /** A flash of real light on the world. */
  flash(x, y, z, color = '#ffb070', intensity = 30, life = 0.25) {
    this.light.position.set(x, y, z);
    this.light.color.set(color);
    this.lightMax = intensity * (1 - this.day * 0.5);
    this.lightT = 0;
    this.lightLife = life;
  }

  /** Blocks flying apart. palette: colours (THREE.Color) to choose from. */
  blocks(x, y, z, palette, { n = 20, size = [0.06, 0.14], speed = [2, 5], up = [2, 6], dir = null, push = 0, glow = false, spread = 0.3, life = null } = {}) {
    const pool = glow ? this.shards : this.debris;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const sp = rnd(speed[0], speed[1]);
      const v = [Math.sin(a) * sp, rnd(up[0], up[1]), Math.cos(a) * sp];
      if (dir != null) {
        v[0] += Math.sin(dir) * push;
        v[2] += Math.cos(dir) * push;
      }
      pool.add({ p: [x + rnd(-spread, spread), y + rnd(-spread, spread), z + rnd(-spread, spread)], v, size: rnd(size[0], size[1]), color: palette[Math.floor(Math.random() * palette.length)], life: life ?? undefined });
    }
  }

  /* ---------------------------------------------------------- recipes */

  /** A blow landing: a flash, sparks streaking away from the blow, a ring; bigger and golden for a crit. */
  hit(x, y, z, { angle = null, crit = false, color = '#ffe2a8', color2 = '#ff9a3a' } = {}) {
    const k = crit ? 1.6 : 1;
    this.glow(x, y, z, '#fff6e0', 1.1 * k, 0.09, 1);
    this.glow(x, y, z, color2, 1.8 * k, 0.16, 0.45);
    this.burst(x, y, z, { n: crit ? 22 : 12, color, color2, speed: [4, 9 * k], up: 2.5, life: [0.16, 0.34], size: [0.07, 0.03], dir: angle, cone: Math.PI * 1.3, grav: 10, drag: 3 });
    this.burst(x, y, z, { n: crit ? 10 : 5, color: color2, color2: '#fff2c0', speed: [1.5, 4], up: 3, life: [0.35, 0.7], size: [0.06, 0.04], shape: SHAPE.pixel, grav: 9, drag: 1.5 });
    this.add.add({ p: [x, y, z], color: col(crit ? '#ffd24a' : '#fff0d0'), size: [0.2, crit ? 1.9 : 1.15], life: crit ? 0.24 : 0.16, alpha: 0.9, shape: SHAPE.ring });
    if (crit) {
      this.add.add({ p: [x, y, z], color: col('#ff8a2a'), size: [0.4, 2.6], life: 0.32, alpha: 0.6, shape: SHAPE.ring });
      this.flash(x, y, z, '#ffc070', 22, 0.18);
    }
  }

  /** Sparks along a slash's edge (the blade's path). */
  slashSparks(x, z, face, arc, radius, color = '#ffe6b0', y = 0.85) {
    const n = Math.round(6 + arc * 3);
    for (let i = 0; i < n; i++) {
      const a = face - arc / 2 + arc * Math.random();
      const px = x + Math.sin(a) * radius, pz = z + Math.cos(a) * radius;
      this.add.add({ p: [px, y + rnd(-0.15, 0.2), pz], v: [Math.sin(a) * rnd(1, 3), rnd(0, 1.5), Math.cos(a) * rnd(1, 3)], color: col(color).clone().multiplyScalar(rnd(0.8, 1.4)), life: rnd(0.15, 0.35), size: [0.05, 0.02], shape: SHAPE.pixel, grav: 4, drag: 3, delay: rnd(0, 0.08) });
    }
  }

  /** Dust kicked up (footsteps, landings, a roll). */
  dust(x, z, { color = '#a89070', n = 3, size = 0.35, y = 0.08, speed = 0.8, alpha = 0.35, life = [0.5, 0.9] } = {}) {
    this.burst(x, y, z, { n, color, speed: [speed * 0.3, speed], up: 0.5, life, size: [size * 0.4, size], shape: SHAPE.smoke, grav: 0, drag: 3, alpha, smoke: true, rise: 0.3 });
  }

  /** A fire burst: a light, a hot core, embers and sparks, smoke, rubble, a shockwave on the ground. */
  explosion(x, y, z, { radius = 2, ground = null, color = '#ff8a2a' } = {}) {
    const r = radius;
    this.flash(x, y + 0.6, z, '#ff9a4a', 55, 0.35);
    this.glow(x, y, z, '#fff4c0', r * 1.4, 0.14);
    this.glow(x, y, z, color, r * 2.4, 0.3, 0.7);
    this.burst(x, y, z, { n: 30, color: '#ffd060', color2: '#ff5a1a', speed: [3, 9], up: 5, life: [0.3, 0.7], size: [0.09, 0.04], grav: 8, drag: 2 });
    this.burst(x, y, z, { n: 26, color: '#ffb040', color2: '#ff4a10', speed: [1, 4], up: 4, life: [0.6, 1.3], size: [0.08, 0.04], shape: SHAPE.pixel, grav: 3, drag: 1.2, rise: 2 });
    this.burst(x, y + 0.2, z, { n: 10, color: '#3a2a26', color2: '#5a4a44', speed: [0.6, 2], up: 1.5, life: [0.9, 1.6], size: [0.5, 1.3], shape: SHAPE.smoke, grav: 0, drag: 1.5, alpha: 0.55, smoke: true, rise: 1.2, delay: [0.04, 0.14] });
    this.ring(x, z, { color, r0: 0.3, r1: r * 1.7, life: 0.45, width: 0.35 });
    if (ground) this.blocks(x, 0.2, z, ground, { n: 12, size: [0.06, 0.15], speed: [2, 5], up: [3, 6] });
  }

  /** Frost: a ring of cold, ice shards bursting out, snow motes, a breath of mist. */
  frost(x, z, r = 3.5) {
    const ice = ['#bff4ff', '#7ad8ff', '#e8fcff', '#9ae8ff'].map((c) => new THREE.Color(c).multiplyScalar(0.7));
    this.ring(x, z, { color: '#8ae8ff', r0: 0.3, r1: r * 1.05, life: 0.5, width: 0.4 });
    this.ring(x, z, { color: '#e8fcff', r0: 0.2, r1: r * 0.75, life: 0.35, width: 0.2 });
    this.flash(x, 1, z, '#8ad8ff', 26, 0.3);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rnd(-0.1, 0.1);
      const sp = rnd(4, 8);
      this.shards.add({ p: [x + Math.sin(a) * 0.4, rnd(0.2, 0.9), z + Math.cos(a) * 0.4], v: [Math.sin(a) * sp, rnd(2, 5), Math.cos(a) * sp], size: rnd(0.05, 0.12), color: ice[i % ice.length], life: rnd(0.8, 1.3) });
    }
    this.burst(x, 0.5, z, { n: 30, color: '#e8fcff', color2: '#9ae8ff', speed: [1, r * 1.3], up: 1.5, life: [0.8, 1.5], size: [0.05, 0.03], shape: SHAPE.pixel, grav: -0.3, drag: 2 });
    this.burst(x, 0.3, z, { n: 8, color: '#d8f4ff', speed: [1, 3], up: 0.5, life: [0.8, 1.3], size: [0.6, 1.4], shape: SHAPE.smoke, grav: 0, drag: 2, alpha: 0.3, smoke: true, rise: 0.4 });
  }

  /** Ice shards at a point (a lance striking). */
  shatter(x, y, z, angle = null) {
    const ice = ['#bff4ff', '#7ad8ff', '#ffffff'].map((c) => new THREE.Color(c));
    this.glow(x, y, z, '#bff4ff', 1.2, 0.12);
    for (let i = 0; i < 12; i++) {
      const a = (angle ?? 0) + rnd(-1.4, 1.4) + (angle == null ? rnd(0, TAU) : 0);
      const sp = rnd(2.5, 6);
      this.shards.add({ p: [x, y, z], v: [Math.sin(a) * sp, rnd(1, 4), Math.cos(a) * sp], size: rnd(0.05, 0.12), color: ice[i % 3], life: rnd(0.6, 1.0) });
    }
  }

  /** Healing: a soft glow at the feet, motes rising and spiralling round, a ring. */
  heal(x, z, color = '#7aff9a', color2 = '#fff2a0') {
    this.ring(x, z, { color, r0: 1.2, r1: 0.3, life: 0.6, width: 0.5, alpha: 0.8 });
    this.glow(x, 0.6, z, color, 1.6, 0.4, 0.5);
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, TAU);
      const r = rnd(0.25, 0.6);
      this.add.add({ p: [x + Math.sin(a) * r, rnd(0, 0.5), z + Math.cos(a) * r], v: [Math.cos(a) * 0.6, rnd(1, 2.4), -Math.sin(a) * 0.6], color: col(i % 3 ? color : color2).clone(), life: rnd(0.7, 1.3), size: [0.07, 0.03], shape: i % 2 ? SHAPE.pixel : SHAPE.glow, grav: 0, drag: 0.6, delay: rnd(0, 0.5) });
    }
  }

  /** A level up: a pillar of light, motes swirling up it, a ring racing out. */
  levelUp(x, z, color = '#ffd36a') {
    // The level up always gets its pillar (the first), even if loot beams are showing.
    const p = this.pillars[0];
    p.m.visible = true;
    p.m.position.set(x, 0, z);
    p.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.6);
    Object.assign(p, { t: 0, life: 1.4, r: 0.75, h: 7 });
    this.ring(x, z, { color, r0: 0.4, r1: 4.5, life: 0.7, width: 0.25 });
    this.ring(x, z, { color: '#ffffff', r0: 0.2, r1: 2.2, life: 0.4, width: 0.4 });
    this.flash(x, 2, z, color, 40, 0.6);
    for (let i = 0; i < 46; i++) {
      const a = rnd(0, TAU);
      const r = rnd(0.2, 0.9);
      this.add.add({ p: [x + Math.sin(a) * r, rnd(0, 0.4), z + Math.cos(a) * r], v: [Math.cos(a) * 1.2, rnd(2.5, 6), -Math.sin(a) * 1.2], color: col(i % 4 ? color : '#ffffff').clone(), life: rnd(0.8, 1.6), size: [0.08, 0.03], shape: i % 3 ? SHAPE.pixel : SHAPE.streak, grav: 0, drag: 0.5, delay: rnd(0, 0.6) });
    }
  }

  /** A soft column of light in a colour (a short-lived beam: a loot's arrival). */
  column(x, z, color, { h = 3, r = 0.35, life = 0.9 } = {}) {
    const p = this.pillars.slice(1).find((q) => !q.m.visible) ?? this.pillars[this.pillars.length - 1];
    p.m.visible = true;
    p.m.position.set(x, 0, z);
    p.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.4);
    Object.assign(p, { t: 0, life, r, h });
  }

  /** A few motes rising (loot glinting, an elite's aura, a waystone). */
  motes(x, z, color, { n = 1, r = 0.5, y = 0.1, h = 1.8, size = 0.05 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const d = Math.sqrt(Math.random()) * r;
      this.add.add({ p: [x + Math.sin(a) * d, y, z + Math.cos(a) * d], v: [0, rnd(0.6, 1.2) * h * 0.6, 0], color: col(color).clone(), life: rnd(0.8, 1.4), size: [size, size * 0.4], shape: SHAPE.pixel, grav: 0, drag: 0.4 });
    }
  }

  /** A trail behind a missile: embers (or frost) shed as it flies, a puff of smoke now and then. */
  trail(x, y, z, kind = 'fire') {
    const fire = kind === 'fire' || kind === 'fireorb';
    const c = fire ? ['#ffc040', '#ff5a1a'] : kind === 'shard' || kind === 'lance' ? ['#e8fcff', '#7ad8ff'] : kind === 'spore' ? ['#c8ff8a', '#5ad04a'] : kind === 'bolt' ? ['#e0c8ff', '#8a5aff'] : ['#bff8ff', '#4ad8ff'];
    this.burst(x, y, z, { n: fire ? 3 : 2, color: c[0], color2: c[1], speed: [0.2, 1], up: fire ? 1 : 0.3, life: [0.25, 0.5], size: [fire ? 0.13 : 0.08, 0.03], shape: SHAPE.pixel, grav: fire ? -1.5 : 0, drag: 2 });
    this.glow(x, y, z, c[1], fire ? 0.7 : 0.5, 0.08, 0.5);
    if (fire && Math.random() < 0.25) this.burst(x, y, z, { n: 1, color: '#3a3030', speed: [0.1, 0.3], up: 0.4, life: [0.6, 1], size: [0.2, 0.6], shape: SHAPE.smoke, grav: 0, drag: 1, alpha: 0.35, smoke: true, rise: 0.6 });
  }

  /** A monster breaking apart into its own blocks; dust; sparks for a glowing one. */
  shatterFigure(x, z, palette, { height = 1, scale = 1, angle = null, glowColor = null, big = false } = {}) {
    const n = Math.round((big ? 70 : 26) * Math.min(1.6, scale));
    this.blocks(x, height * 0.5, z, palette, { n, size: [0.07 * scale, 0.17 * scale], speed: [1.2, big ? 6 : 3.6], up: [2, big ? 8 : 5.5], dir: angle, push: 2.5, spread: 0.3 * scale });
    this.dust(x, z, { n: big ? 10 : 5, color: '#8a7a6a', size: 0.8 * scale, speed: 1.6, alpha: 0.4 });
    if (glowColor) {
      this.burst(x, height * 0.5, z, { n: big ? 40 : 14, color: glowColor, color2: '#ffffff', speed: [1, 4], up: 3, life: [0.5, 1.1], size: [0.07, 0.03], shape: SHAPE.pixel, grav: 2, drag: 1 });
      this.glow(x, height * 0.5, z, glowColor, 2 * scale, 0.25, 0.7);
    }
  }

  /** Each frame. */
  update(dt) {
    this.time += dt;
    const gain = 1 - this.day * 0.45;
    this.add.uGain.value = gain;
    this.add.update(dt);
    this.smoke.update(dt);
    this.debris.update(dt);
    this.shards.update(dt);
    this.shards.mesh.material.color.setScalar(gain);
    for (const r of this.rings) {
      if (!r.m.visible) continue;
      r.t += dt;
      const k = r.t / r.life;
      if (k >= 1) {
        r.m.visible = false;
        continue;
      }
      const e = 1 - Math.pow(1 - k, 3);
      const s = (r.r0 + (r.r1 - r.r0) * e) * 2;
      r.m.scale.set(s, 1, s);
      r.m.material.uniforms.uAlpha.value = r.a * (1 - k) * gain;
    }
    for (const p of this.pillars) {
      if (!p.m.visible) continue;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        p.m.visible = false;
        continue;
      }
      const grow = Math.min(1, k * 5);
      p.m.scale.set(p.r * (1.2 - 0.5 * k), p.h * grow, p.r * (1.2 - 0.5 * k));
      p.m.material.uniforms.uAlpha.value = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * gain;
      p.m.material.uniforms.uTime.value = this.time;
    }
    if (this.lightMax > 0) {
      this.lightT += dt;
      const k = this.lightT / (this.lightLife || 0.25);
      this.light.intensity = k >= 1 ? 0 : this.lightMax * (1 - k) * (1 - k);
      if (k >= 1) this.lightMax = 0;
    }
  }

  dispose() {
    this.add.dispose();
    this.smoke.dispose();
    this.debris.dispose();
    this.shards.dispose();
    for (const r of this.rings) {
      r.m.material.dispose();
      r.m.removeFromParent();
    }
    for (const p of this.pillars) {
      p.m.geometry.dispose();
      p.m.material.dispose();
      p.m.removeFromParent();
    }
    this.ringGeo.dispose();
    this.billGeo.dispose();
    this.light.removeFromParent();
  }
}

const AURA_FS = /* glsl */ `
uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float ang = atan(p.y, p.x);
  // Two thin rings, the outer turning one way with ticks like runes, a soft glow inside.
  float outer = (1.0 - smoothstep(0.0, 0.06, abs(r - 0.92))) * (0.55 + 0.45 * step(0.5, fract(ang * 3.8197 + uTime * 0.4)));
  float inner = (1.0 - smoothstep(0.0, 0.04, abs(r - 0.72))) * 0.7;
  float ticks = (1.0 - smoothstep(0.0, 0.1, abs(r - 0.82))) * step(0.82, fract(ang * 1.9099 - uTime * 0.6));
  float fill = (1.0 - smoothstep(0.2, 1.0, r)) * 0.18 * (0.8 + 0.2 * sin(uTime * 3.0));
  float a = (outer + inner + ticks + fill) * (1.0 - smoothstep(0.95, 1.0, r));
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, a);
}`;

/** A turning ring of light on the ground under a hero monster or a boss (add it to the actor's group). */
export function auraMesh(color, radius = 1.2) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(1.3) }, uTime: { value: 0 } },
    vertexShader: RING_VS,
    fragmentShader: AURA_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -3
  }));
  m.position.y = 0.05;
  m.renderOrder = 3;
  return m;
}
