/**
 * Particles, each kind one instanced draw of camera-facing cards updated on
 * the CPU: dust motes drifting in the low sun, fireflies in the Gloamwood
 * (and a few at the meadow's edge), leaves falling from the giants, chimney
 * and forge smoke, forge sparks, wisps that wander the glade trailing
 * sparkles, the moonwell's rising motes, footfall dust, and in the rift,
 * lava spray and smoke.
 */
import * as THREE from 'three';
import { rng } from './noise.js';

const VERT = /* glsl */ `
attribute vec4 aPos;   // xyz, size
attribute vec4 aCol;   // rgb, alpha
attribute float aRot;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = uv;
  vCol = aCol;
  vec4 mv = modelViewMatrix * vec4(aPos.xyz, 1.0);
  float c = cos(aRot), s = sin(aRot);
  vec2 p = mat2(c, -s, s, c) * position.xy;
  mv.xy += p * aPos.w;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform float uLit;
uniform vec3 uLight;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vec4 t = texture2D(tMap, vUv);
  float a = t.a * vCol.a;
  if (a < 0.003) discard;
  vec3 c = vCol.rgb * mix(vec3(1.0), uLight, uLit);
  gl_FragColor = vec4(c * a, a);
}`;

/** A pool of `max` cards; `blend`: 'add' (glows) or 'alpha' (smoke, leaves). */
export class Cards {
  constructor(max, tex, { blend = 'add', lit = 0, depthTest = true } = {}) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    this.pos = new Float32Array(max * 4);
    this.col = new Float32Array(max * 4);
    this.rot = new Float32Array(max);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(this.pos, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.InstancedBufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: tex }, uLit: { value: lit }, uLight: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest,
      blending: blend === 'add' ? THREE.AdditiveBlending : THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      toneMapped: false
    });
    if (blend === 'add') {
      this.mat.blending = THREE.CustomBlending;
      this.mat.blendSrc = THREE.OneFactor;
      this.mat.blendDst = THREE.OneFactor;
    }
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.max = max;
    this.n = 0;
  }

  begin() {
    this.n = 0;
  }

  push(x, y, z, size, r, g, b, a, rot = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 4] = x;
    this.pos[i * 4 + 1] = y;
    this.pos[i * 4 + 2] = z;
    this.pos[i * 4 + 3] = size;
    this.col[i * 4] = r;
    this.col[i * 4 + 1] = g;
    this.col[i * 4 + 2] = b;
    this.col[i * 4 + 3] = a;
    this.rot[i] = rot;
  }

  end() {
    this.geo.instanceCount = this.n;
    for (const k of ['aPos', 'aCol', 'aRot']) {
      const at = this.geo.attributes[k];
      at.needsUpdate = true;
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * at.itemSize);
    }
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

/** A falling-leaf card: a small leaf, painted. */
function leafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.rotate(0.6);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-24, 0);
  g.lineTo(24, 0);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Effects {
  constructor(bank, { fireflies = 1000, seed = 7 } = {}) {
    this.group = new THREE.Group();
    this.r = rng(seed);
    const glow = bank.glow(64, 1.6);
    const spark = bank.glow(32, 3);
    const puff = bank.puff(9);
    this.leafTex = leafTexture();
    this.motes = new Cards(500, glow, { blend: 'add' });
    this.flies = new Cards(fireflies + 300, glow, { blend: 'add' });
    this.smoke = new Cards(700, puff, { blend: 'alpha', lit: 1 });
    this.leaves = new Cards(260, this.leafTex, { blend: 'alpha', lit: 1 });
    this.sparks = new Cards(500, spark, { blend: 'add' });
    for (const c of [this.smoke, this.leaves, this.motes, this.flies, this.sparks]) this.group.add(c.mesh);
    this.nFlies = fireflies;
    // Persistent particles.
    const R = this.r;
    this.mote = Array.from({ length: 500 }, () => ({ x: R(), y: R(), z: R(), ph: R() * 10, s: 0.012 + R() * 0.02 }));
    this.fly = Array.from({ length: fireflies }, () => ({ x: R(), y: R(), z: R(), ph: R() * 10, sp: 0.4 + R() * 0.8, hue: R() }));
    this.leafs = Array.from({ length: 200 }, () => this.newLeaf(null));
    this.puffs = [];
    this.sparkList = [];
    this.chimneys = [];
    this.wisps = [];
    this.emitAcc = 0;
  }

  newLeaf(cam) {
    const R = this.r;
    return { x: (cam?.x ?? 0) + (R() - 0.5) * 60, y: (cam?.y ?? 0) + 6 + R() * 18, z: (cam?.z ?? 0) + (R() - 0.5) * 60, vy: -(0.4 + R() * 0.5), ph: R() * 10, rot: R() * 6, spin: (R() - 0.5) * 3, hue: R(), life: 0 };
  }

  /** A chimney or forge: where smoke rises from, how much. */
  addChimney(pos, { rate = 2.2, size = 1.2, dark = 0.7, sparks = 0 } = {}) {
    this.chimneys.push({ pos: pos.clone(), rate, size, dark, sparks, acc: this.r() });
  }

  addWisp(centre, radius = 10, color = [0.6, 0.9, 1.0]) {
    this.wisps.push({ c: centre.clone(), radius, color, ph: this.r() * 100, p: centre.clone(), trail: [] });
  }

  /** Footfall or landing dust. */
  dust(p, amount = 6, color = [0.75, 0.65, 0.5]) {
    for (let i = 0; i < amount; i++) {
      const a = this.r() * Math.PI * 2;
      this.puffs.push({ x: p.x + Math.cos(a) * 0.2, y: p.y + 0.05, z: p.z + Math.sin(a) * 0.2, vx: Math.cos(a) * 0.8, vy: 0.3 + this.r() * 0.4, vz: Math.sin(a) * 0.8, life: 0, max: 0.8 + this.r() * 0.6, size: 0.35, grow: 1.2, col: color, a: 0.35 });
    }
  }

  /** A burst of sparks (the smith's hammer, the forge). */
  burst(p, n = 14, color = [1, 0.6, 0.2], speed = 3) {
    for (let i = 0; i < n; i++) {
      const R = this.r;
      this.sparkList.push({ x: p.x, y: p.y, z: p.z, vx: (R() - 0.5) * speed, vy: R() * speed * 0.9 + 0.5, vz: (R() - 0.5) * speed, life: 0, max: 0.4 + R() * 0.6, col: color, g: 7 });
    }
  }

  update(dt, t, camera, { gloam = 0, lightColor, toLight, wind }) {
    const cam = camera.position;
    const R = this.r;
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    // Dust motes in the low sun: brightest looking toward the light.
    const toward = Math.max(0, camDir.dot(toLight));
    this.motes.begin();
    const vis = (1 - gloam) * (0.25 + toward * 0.9);
    if (vis > 0.02) {
      for (const m of this.mote) {
        const x = cam.x + ((((m.x * 30 + Math.sin(t * 0.1 + m.ph) * 1.5 - cam.x) % 30) + 45) % 30) - 15;
        const z = cam.z + ((((m.z * 30 + Math.cos(t * 0.08 + m.ph) * 1.5 - cam.z) % 30) + 45) % 30) - 15;
        const y = cam.y - 1.5 + ((m.y * 6 + Math.sin(t * 0.3 + m.ph) * 0.3 + 60) % 6);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + m.ph * 3);
        this.motes.push(x, y, z, m.s * 2.5, lightColor.r * 1.6, lightColor.g * 1.4, lightColor.b * 1.1, vis * tw * 0.9);
      }
    }
    this.motes.end();
    // Fireflies: thick in the Gloamwood, a scattering at Brindlewick's meadow edges.
    this.flies.begin();
    const n = Math.round(this.nFlies * (0.12 + 0.88 * gloam));
    for (let i = 0; i < n; i++) {
      const f = this.fly[i];
      const span = 46;
      const x = cam.x + ((((f.x * span + Math.sin(t * f.sp * 0.3 + f.ph) * 2 - cam.x) % span) + span * 1.5) % span) - span / 2;
      const z = cam.z + ((((f.z * span + Math.cos(t * f.sp * 0.25 + f.ph * 1.3) * 2 - cam.z) % span) + span * 1.5) % span) - span / 2;
      const y = cam.y - 1.4 + f.y * 4 + Math.sin(t * f.sp + f.ph) * 0.4;
      const blink = Math.max(0, Math.sin(t * (0.8 + f.sp) + f.ph * 7)) ** 3;
      if (blink < 0.02) continue;
      const warm = f.hue < 0.55;
      const [r, g, b] = gloam > 0.5 ? (warm ? [0.75, 1.0, 0.35] : [0.35, 0.85, 1.0]) : [1.0, 0.85, 0.35];
      this.flies.push(x, y, z, 0.05 + blink * 0.05, r * 3, g * 3, b * 3, blink);
    }
    // Wisps: wandering lights with sparkling trails.
    for (const w of this.wisps) {
      const k = t * 0.22 + w.ph;
      w.p.set(w.c.x + Math.sin(k) * w.radius + Math.sin(k * 2.7) * 2, w.c.y + 1.6 + Math.sin(k * 1.9) * 0.8, w.c.z + Math.cos(k * 0.8) * w.radius + Math.cos(k * 3.1) * 2);
      w.trail.unshift(w.p.clone());
      if (w.trail.length > 26) w.trail.pop();
      const [r, g, b] = w.color;
      this.flies.push(w.p.x, w.p.y, w.p.z, 0.32, r * 3, g * 3, b * 3, 0.95);
      this.flies.push(w.p.x, w.p.y, w.p.z, 1.1, r * 0.8, g * 0.8, b, 0.22);
      w.trail.forEach((p, i) => {
        const a = (1 - i / w.trail.length) * 0.6;
        this.flies.push(p.x + Math.sin(i * 7.1 + t * 3) * 0.08, p.y - i * 0.01, p.z + Math.cos(i * 5.3 + t * 3) * 0.08, 0.1 + 0.08 * (1 - i / w.trail.length), r * 2, g * 2, b * 2, a);
      });
    }
    this.flies.end();
    // Leaves drifting down near the giants (village only).
    this.leaves.begin();
    if (gloam < 0.9) {
      for (let i = 0; i < this.leafs.length; i++) {
        const l = this.leafs[i];
        l.life += dt;
        l.y += l.vy * dt;
        l.x += (Math.sin(t * 1.3 + l.ph) * 0.6 + wind.x * 0.8) * dt;
        l.z += (Math.cos(t * 1.1 + l.ph) * 0.6 + wind.y * 0.8) * dt;
        l.rot += l.spin * dt;
        const far = Math.hypot(l.x - cam.x, l.z - cam.z) > 34;
        if (l.y < cam.y - 3 || far) this.leafs[i] = this.newLeaf(cam);
        const c = l.hue < 0.4 ? [0.55, 0.42, 0.1] : l.hue < 0.75 ? [0.42, 0.45, 0.1] : [0.6, 0.25, 0.08];
        const a = Math.min(1, l.life * 2) * (1 - gloam);
        this.leaves.push(l.x, l.y, l.z, 0.16, c[0], c[1], c[2], a, l.rot);
      }
    }
    this.leaves.end();
    // Smoke from chimneys and the forge; sparks from the forge.
    this.emitAcc += dt;
    for (const c of this.chimneys) {
      if (c.pos.distanceTo(cam) > 160) continue;
      c.acc += dt * c.rate;
      while (c.acc > 1) {
        c.acc -= 1;
        this.puffs.push({ x: c.pos.x + (R() - 0.5) * 0.3, y: c.pos.y, z: c.pos.z + (R() - 0.5) * 0.3, vx: 0, vy: 0.7 + R() * 0.4, vz: 0, life: 0, max: 7 + R() * 4, size: c.size * 0.6, grow: c.size * 0.5, col: [c.dark, c.dark * 0.95, c.dark * 0.92], a: 0.42, rot: R() * 6 });
        if (c.sparks && R() < c.sparks) this.burst(c.pos, 2, [1, 0.55, 0.15], 1.2);
      }
    }
    this.smoke.begin();
    this.puffs = this.puffs.filter((p) => (p.life += dt) < p.max);
    for (const p of this.puffs) {
      const k = p.life / p.max;
      p.vx += wind.x * 0.35 * dt;
      p.vz += wind.y * 0.35 * dt;
      p.vx *= 1 - dt * 0.3;
      p.vz *= 1 - dt * 0.3;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy *= 1 - dt * 0.15;
      const a = p.a * Math.min(1, k * 6) * (1 - k);
      this.smoke.push(p.x, p.y, p.z, p.size + p.grow * k * 3, p.col[0], p.col[1], p.col[2], a, (p.rot ?? 0) + k * 0.8);
    }
    this.smoke.end();
    this.sparks.begin();
    this.sparkList = this.sparkList.filter((s) => (s.life += dt) < s.max);
    for (const s of this.sparkList) {
      s.vy -= s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const a = 1 - s.life / s.max;
      this.sparks.push(s.x, s.y, s.z, 0.06, s.col[0] * 4, s.col[1] * 4, s.col[2] * 4, a);
    }
    this.sparks.end();
    this.smoke.mat.uniforms.uLight.value.copy(lightColor).multiplyScalar(0.35).addScalar(0.45 - gloam * 0.2);
    this.leaves.mat.uniforms.uLight.value.copy(lightColor).multiplyScalar(0.55).addScalar(0.25);
  }

  dispose() {
    for (const c of [this.motes, this.flies, this.smoke, this.leaves, this.sparks]) c.dispose();
    this.leafTex.dispose();
  }
}
