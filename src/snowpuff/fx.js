/**
 * Effects for the race, in TSL: one draw per particle kind, each particle a
 * camera-facing quad from an instanced buffer the CPU fills every frame.
 *
 *   powder    soft snow puffs: board spray (carve × speed), landings, bumps,
 *             snowball hits and trails, the poof of a tumble
 *   sparkle   gold and white glints that glow (emissive → bloom): stars,
 *             clean landings, boosts, shields
 *   motes     snowflakes in the air rushing past the camera — more, longer
 *             streaks the faster you go
 *   confetti  for the podium
 *
 * Snowballs in flight are little lit spheres; shields are fresnel bubbles.
 */
import * as THREE from 'three/webgpu';
import { attribute, instancedDynamicBufferAttribute, vec3, vec4, float, uv, smoothstep, length, cameraViewMatrix, positionLocal, mix, pow, abs, dot, normalView, positionViewDirection, color, sin, cos, mrt } from 'three/tsl';

/** See-through things leave the normal and velocity buffers alone (else AO and TRAA smear round them). */
export const KEEP_BUFFERS = () => mrt({ normal: vec4(0, 0, 0, 0), velocity: vec4(0, 0, 0, 0) });

class Pool {
  constructor(scene, max, { additive = false, glow = 0, tint = '#ffffff', streak = false, soft = 0.5, lit = false, spin = false } = {}) {
    this.max = max;
    this.n = 0;
    // per particle: x y z size | alpha rot stretch _
    this.a = new Float32Array(max * 4);
    this.b = new Float32Array(max * 4);
    this.c = new Float32Array(max * 4); // r g b _
    this.p = []; // sim state
    const geo = new THREE.PlaneGeometry(1, 1);
    const A = new THREE.InstancedBufferAttribute(this.a, 4);
    const B = new THREE.InstancedBufferAttribute(this.b, 4);
    const C = new THREE.InstancedBufferAttribute(this.c, 4);
    A.setUsage(THREE.DynamicDrawUsage);
    B.setUsage(THREE.DynamicDrawUsage);
    C.setUsage(THREE.DynamicDrawUsage);
    this.A = A; this.B = B; this.C = C;
    const ia = instancedDynamicBufferAttribute(A);
    const ib = instancedDynamicBufferAttribute(B);
    const ic = instancedDynamicBufferAttribute(C);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    // billboard: offset along the camera's right and up
    const vm = cameraViewMatrix;
    const right = vec3(vm[0].x, vm[1].x, vm[2].x);
    const up = vec3(vm[0].y, vm[1].y, vm[2].y);
    const ang = ib.y;
    const ca = cos(ang), sa = sin(ang);
    const lx = positionLocal.x.mul(float(1).add(ib.z)), ly = positionLocal.y;
    const rx = lx.mul(ca).sub(ly.mul(sa)), ry = lx.mul(sa).add(ly.mul(ca));
    m.positionNode = ia.xyz.add(right.mul(rx.mul(ia.w))).add(up.mul(ry.mul(ia.w)));
    m.vertexNode = null;
    const d = length(uv().sub(0.5)).mul(2);
    const shape = streak ? smoothstep(1, 0.2, d) : smoothstep(1, soft, d);
    const col = vec3(ic.x, ic.y, ic.z);
    m.colorNode = vec4(lit ? col : col, shape.mul(ib.x));
    if (glow) m.emissiveNode = col.mul(shape.mul(ib.x).mul(glow));
    m.fog = !additive;
    m.mrtNode = glow ? mrt({ normal: vec4(0, 0, 0, 0), velocity: vec4(0, 0, 0, 0), emissive: vec4(col.mul(shape.mul(ib.x).mul(glow)), shape.mul(ib.x)) }) : KEEP_BUFFERS();
    this.mesh = new THREE.Mesh(geo, m);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 5 : 4;
    scene.add(this.mesh);
    this.tint = new THREE.Color(tint);
    this.spin = spin;
  }

  add(x, y, z, vx, vy, vz, { life = 0.8, size = 0.3, grow = 1, alpha = 1, drag = 1.5, grav = -2, col = null, rot = 0, rv = 0, stretch = 0 } = {}) {
    if (this.p.length >= this.max) this.p.shift();
    const c = col ?? this.tint;
    this.p.push({ x, y, z, vx, vy, vz, life, t: 0, size, grow, alpha, drag, grav, r: c.r, g: c.g, b: c.b, rot, rv, stretch });
  }

  update(dt) {
    const P = this.p;
    let w = 0;
    for (let i = 0; i < P.length; i++) {
      const q = P[i];
      q.t += dt;
      if (q.t >= q.life) continue;
      const k = Math.exp(-q.drag * dt);
      q.vx *= k; q.vy = q.vy * k + q.grav * dt; q.vz *= k;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.rot += q.rv * dt;
      P[w++] = q;
    }
    P.length = w;
    const n = Math.min(this.max, w);
    for (let i = 0; i < n; i++) {
      const q = P[i];
      const u = q.t / q.life;
      const o = i * 4;
      this.a[o] = q.x; this.a[o + 1] = q.y; this.a[o + 2] = q.z;
      this.a[o + 3] = q.size * (1 + (q.grow - 1) * u);
      this.b[o] = q.alpha * Math.min(1, u * 8) * (1 - u) * (1 - u * 0.3);
      this.b[o + 1] = q.rot;
      this.b[o + 2] = q.stretch;
      this.c[o] = q.r; this.c[o + 1] = q.g; this.c[o + 2] = q.b;
    }
    this.mesh.count = n;
    this.A.needsUpdate = true;
    this.B.needsUpdate = true;
    this.C.needsUpdate = true;
  }

  clear() {
    this.p.length = 0;
    this.mesh.count = 0;
  }
}

const GOLD = new THREE.Color('#ffd24a');
const WHITE = new THREE.Color('#ffffff');
const CYAN = new THREE.Color('#7fe8ff');
const PINK = new THREE.Color('#ff7ac0');

export class Effects {
  constructor(scene, { scale = 1 } = {}) {
    this.scene = scene;
    this.scale = scale;
    this.powder = new Pool(scene, Math.round(1400 * scale), { soft: 0.15, tint: '#dde8fa' });
    this.sparkle = new Pool(scene, Math.round(500 * scale), { additive: true, glow: 2.2, tint: '#ffe08a', soft: 0.05 });
    this.motes = new Pool(scene, Math.round(260 * scale), { additive: false, tint: '#ffffff', streak: true });
    this.confetti = new Pool(scene, 400, { soft: 0.9, tint: '#ffffff' });
    this.balls = [];
    const ballGeo = new THREE.SphereGeometry(0.16, 14, 10);
    const ballMat = new THREE.MeshStandardNodeMaterial({ color: '#f8fbff', roughness: 0.6 });
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(ballGeo, ballMat);
      b.visible = false;
      b.castShadow = true;
      scene.add(b);
      this.balls.push(b);
    }
    this.shieldGeo = new THREE.IcosahedronGeometry(1, 4);
    this.shieldMat = new THREE.MeshPhysicalNodeMaterial({ color: '#9ff0ff', roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false });
    const fres = pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2.6);
    this.shieldMat.emissiveNode = color('#5fdcff').mul(fres.mul(2.4).add(0.08));
    this.shieldMat.opacityNode = fres.mul(0.8).add(0.12);
    this.shieldMat.mrtNode = KEEP_BUFFERS();
    this.moteT = 0;
  }

  /** Board spray: thrown off the downhill edge, scaled by carve × speed. */
  spray(x, y, z, side, fwd, speed, carve, dt) {
    const k = Math.min(1.6, (speed / 20) * (0.25 + carve * 1.4));
    const n = Math.round(k * 95 * dt * this.scale * 10) / 10;
    let count = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (count-- > 0) {
      const sv = (2 + Math.random() * 3) * (0.5 + carve);
      this.powder.add(
        x + side[0] * 0.35 + (Math.random() - 0.5) * 0.3, y + 0.05, z + side[1] * 0.35 + (Math.random() - 0.5) * 0.3,
        side[0] * sv + fwd[0] * speed * 0.35, 1.2 + Math.random() * 2.2 * (0.4 + carve), side[1] * sv + fwd[1] * speed * 0.35,
        { life: 0.45 + Math.random() * 0.5, size: 0.18 + Math.random() * 0.22, grow: 2.6, alpha: 0.75, drag: 2.4, grav: -5 }
      );
    }
  }

  /** A big soft poof (bump, tumble, landing, snowball impact). */
  poof(x, y, z, { n = 26, size = 0.5, speed = 3.5, up = 2.5, alpha = 0.9 } = {}) {
    for (let i = 0; i < n * this.scale; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random();
      this.powder.add(x, y + 0.2, z, Math.cos(a) * speed * r, up * (0.4 + Math.random()), Math.sin(a) * speed * r, { life: 0.6 + Math.random() * 0.6, size: size * (0.6 + Math.random() * 0.6), grow: 2.2, alpha, drag: 2.2, grav: -3 });
    }
  }

  sparkles(x, y, z, { n = 16, col = GOLD, speed = 3, life = 0.8, size = 0.22 } = {}) {
    for (let i = 0; i < n * this.scale; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.sparkle.add(x, y, z, Math.cos(a) * v * Math.sqrt(1 - e * e), e * v + 1, Math.sin(a) * v * Math.sqrt(1 - e * e), { life: life * (0.6 + Math.random() * 0.6), size: size * (0.5 + Math.random()), grow: 0.3, alpha: 1, drag: 2, grav: -1.5, col: Math.random() < 0.3 ? WHITE : col, rot: Math.random() * 3, rv: 6, stretch: 0.6 });
    }
  }

  starBurst(x, y, z) {
    this.sparkles(x, y, z, { n: 18, col: GOLD, speed: 3.5 });
  }

  boostBurst(x, y, z) {
    this.sparkles(x, y + 0.6, z, { n: 26, col: PINK, speed: 4, size: 0.26 });
    this.sparkles(x, y + 0.6, z, { n: 12, col: GOLD, speed: 2.5 });
  }

  shieldBurst(x, y, z) {
    this.sparkles(x, y + 0.7, z, { n: 30, col: CYAN, speed: 4.5, size: 0.25 });
  }

  /** Snowflakes rushing past the camera, more and longer the faster you go. */
  speedMotes(cam, fwd, speed, dt, night = false) {
    const k = Math.max(0, (speed - 8) / 22);
    this.moteT += dt * (6 + k * 70) * this.scale;
    while (this.moteT > 1) {
      this.moteT -= 1;
      const ahead = 14 + Math.random() * 18;
      const side = (Math.random() - 0.5) * 18, h = (Math.random() - 0.3) * 7;
      const rx = -fwd[2], rz = fwd[0];
      this.motes.add(cam.x + fwd[0] * ahead + rx * side, cam.y + h, cam.z + fwd[2] * ahead + rz * side, -fwd[0] * speed * 0.15 + (Math.random() - 0.5), -0.6, -fwd[2] * speed * 0.15 + (Math.random() - 0.5), {
        life: 1.4, size: 0.035 + Math.random() * 0.03, alpha: night ? 0.55 : 0.85, drag: 0, grav: -0.3, stretch: k * 5, rot: Math.atan2(h - 1.5, side)
      });
    }
  }

  confettiBurst(x, y, z) {
    const cols = ['#ff6fb4', '#ffd23f', '#3fd0b0', '#3a86ff', '#ff7a33', '#ffffff'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 5;
      this.confetti.add(x, y, z, Math.cos(a) * v * 0.6, 4 + Math.random() * 6, Math.sin(a) * v * 0.6, { life: 3 + Math.random() * 2, size: 0.1 + Math.random() * 0.08, grow: 1, alpha: 1, drag: 1.2, grav: -3.5, col: cols[i % cols.length], rot: Math.random() * 6, rv: (Math.random() - 0.5) * 12, stretch: 0.8 });
    }
  }

  /** Show snowball i at (x, y, z); hide the rest past `count`. */
  ball(i, x, y, z) {
    const b = this.balls[i];
    if (!b) return;
    b.visible = true;
    b.position.set(x, y, z);
    b.rotation.x += 0.3;
    if (Math.random() < 0.6) this.powder.add(x, y, z, 0, 0, 0, { life: 0.35, size: 0.12, grow: 2, alpha: 0.6, drag: 3, grav: 0 });
  }

  hideBalls(from = 0) {
    for (let i = from; i < this.balls.length; i++) this.balls[i].visible = false;
  }

  shieldMesh() {
    const m = new THREE.Mesh(this.shieldGeo, this.shieldMat);
    m.scale.setScalar(0.85);
    m.renderOrder = 6;
    m.visible = false;
    return m;
  }

  update(dt) {
    this.powder.update(dt);
    this.sparkle.update(dt);
    this.motes.update(dt);
    this.confetti.update(dt);
  }

  clear() {
    this.powder.clear();
    this.sparkle.clear();
    this.motes.clear();
    this.confetti.clear();
    this.hideBalls();
  }
}

export { attribute, mix };
