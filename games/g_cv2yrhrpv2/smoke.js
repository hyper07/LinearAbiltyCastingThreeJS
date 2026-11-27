import * as THREE from 'three';
import { seeded, corridorClamp } from './marbles.js';

/**
 * Smoke for Kickrani: an item that drops a little smoke canister on the road
 * behind you. It bursts into a thick, billowing cloud about 10 m across and
 * 3.5 m tall, drifts with the wind, and slowly thins away over about seven
 * seconds — kept inside the street it was dropped in.
 *
 * A rider inside it can't see: the camera is engulfed (a soft, full-screen
 * grey veil — the HUD and the map stay over it) that clears about a second
 * after they come out. Bots inside lose their line a little — they wander
 * and ease off. Nobody falls because of it.
 *
 * Pure rules (cloudShape, smokeAt, smokePuffs, puffAt) for the tests;
 * `SmokeField` draws every cloud's puffs as soft lit billboards in one
 * instanced draw, and the veil over your view (`SmokeVeil`); `poof` is the
 * canister's hiss and `cough` a rider's, synthesised.
 *
 * Everyone in a room draws the same cloud from the same plan (the dropper's
 * browser sends it), and each browser works out who of its own riders is in it.
 */
export const SMOKE = {
  life: 7, // s a cloud lasts
  grow: 1.3, // s it takes to billow out to its full size
  thin: 3.2, // s it takes to thin away (the last of its life)
  r: 5, // m: its radius when full (10 m across)
  h: 3.6, // m tall
  back: 3, // m behind the dropper where the canister lands
  puffs: 30, // puffs a cloud
  clear: 1, // s the veil takes to clear once you are out
  grace: 2, // s the dropper rides out of their own cloud untouched
  drift: 0.9, // m/s of drift at the weather's wind 1
  ease: 2.4 // m/s² a bot inside sheds over its rolling (off the throttle, feathering the brake)
};

/** The cloud's size and thickness at `age` seconds: { r, h, thick } (thick 0 – 1). */
export function cloudShape(age) {
  if (age < 0 || age > SMOKE.life) return { r: 0, h: 0, thick: 0 };
  const k = Math.min(1, age / SMOKE.grow);
  const out = 1 - (1 - k) ** 3;
  // (still spreading a little once it is full, as it thins)
  const r = (0.8 + (SMOKE.r - 0.8) * out) * (1 + 0.035 * Math.max(0, age - SMOKE.grow));
  const h = (0.6 + (SMOKE.h - 0.6) * out) * (1 + 0.04 * Math.max(0, age - SMOKE.grow));
  const fadeIn = Math.min(1, age / 0.25);
  const t = Math.max(0, Math.min(1, (SMOKE.life - age) / SMOKE.thin));
  const thick = fadeIn * t * t * (3 - 2 * t) * (1 - 0.12 * Math.min(1, age / SMOKE.life));
  return { r, h, thick };
}

/**
 * How thick the smoke is at a point (x, z, `up` metres above the road), 0 – 1: full in the cloud's
 * heart, thinning to nothing at its edge and over its top.
 */
export function smokeAt(cloud, x, z, up, age) {
  const { r, h, thick } = cloudShape(age);
  if (!thick) return 0;
  const d = Math.hypot(x - cloud.x, z - cloud.z) / r;
  if (d >= 1) return 0;
  const across = 1 - smooth(0.6, 1, d);
  const over = up <= h ? 1 : 1 - smooth(h, h + 1.2, up);
  return Math.max(0, thick * across * over);
}

function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A cloud's puffs from its seed: where each one billows out to (a share of the radius, an angle, a
 * height), how big, when it comes out of the canister, how it turns and how fast it rises.
 */
export function smokePuffs(seed, n = SMOKE.puffs) {
  const rand = seeded(seed);
  const out = [];
  for (let k = 0; k < n; k++) {
    const low = k < n * 0.55;
    out.push({
      a: rand() * Math.PI * 2,
      // (the low ones spread out along the road, the high ones heaped in the middle: a mound, not a box)
      d: Math.sqrt(rand()) * (low ? 0.82 : 0.5),
      up: low ? 0.18 + rand() * 0.3 : 0.45 + rand() * 0.45,
      size: 0.75 + rand() * 0.5,
      delay: (k / n) * 0.45 + rand() * 0.05,
      spin: rand() * Math.PI * 2,
      turn: (rand() - 0.5) * 0.5,
      rise: 0.05 + rand() * 0.12,
      ph: rand() * 10,
      shade: 0.86 + rand() * 0.14
    });
  }
  return out;
}

/**
 * Where one puff is at `age`: { x, z, up, size, alpha }, `up` above the road — out of the canister
 * and billowing out to its place, rolling round it, rising a little, growing as it thins.
 */
export function puffAt(cloud, p, age) {
  const t = age - p.delay;
  const { r, h, thick } = cloudShape(age);
  if (t <= 0 || !thick) return null;
  const go = 1 - (1 - Math.min(1, t / (SMOKE.grow * 0.9))) ** 3;
  const roll = Math.sin(age * 0.7 + p.ph) * 0.06;
  const d = p.d * r * go;
  const a = p.a + p.turn * age;
  const x = cloud.x + Math.cos(a) * d + roll * r;
  const z = cloud.z + Math.sin(a) * d + Math.cos(age * 0.6 + p.ph) * 0.06 * r;
  const up = 0.35 + p.up * h * (0.4 + 0.6 * go) + p.rise * Math.max(0, age - SMOKE.grow);
  const size = (0.7 + 2.5 * go) * p.size * (1 + 0.06 * age);
  const alpha = Math.min(1, t / 0.15) * thick;
  return { x, z, up, size, alpha };
}

/* ------------------------------------------------------------ drawing */

let puffTex = null;
/** One soft puff of smoke: a lumpy round of overlapping blobs, white, fading to clear well inside its square. */
function puffTexture() {
  if (puffTex) return puffTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rand = seeded(7);
  for (let k = 0; k < 22; k++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * S * 0.17;
    const x = S / 2 + Math.cos(a) * d;
    const y = S / 2 + Math.sin(a) * d;
    const rr = S * (0.14 + rand() * 0.16);
    const v = 235 + Math.floor(rand() * 20);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.42)`);
    gr.addColorStop(0.55, `rgba(${v},${v},${v},0.2)`);
    gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  // nothing near the square's edge, ever: a round mask
  const id = g.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2) / (S / 2);
      const m = 1 - smooth(0.55, 0.96, d);
      id.data[(y * S + x) * 4 + 3] *= m;
    }
  }
  g.putImageData(id, 0, 0);
  puffTex = new THREE.CanvasTexture(c);
  puffTex.colorSpace = THREE.SRGBColorSpace;
  return puffTex;
}

/** A quad whose normals bow out like a ball's, so a billboard puff is lit round, not flat. */
function puffGeometry() {
  const geo = new THREE.PlaneGeometry(1, 1);
  const N = geo.attributes.normal;
  const P = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < N.count; i++) {
    v.set(P.getX(i) * 1.3, P.getY(i) * 1.3, 0.6).normalize();
    N.setXYZ(i, v.x, v.y, v.z);
  }
  return geo;
}

const _o = new THREE.Object3D();
const _q = new THREE.Quaternion();
const _z = new THREE.Vector3(0, 0, 1);
const _c = new THREE.Color();
const _warm = new THREE.Color('#ffc888');
const _sky = new THREE.Color('#2c3240');

/**
 * Every cloud's puffs in one instanced draw: soft billboards turned to the camera, lit by the
 * scene (the sun and sky by day), with the street lamps' warm light and a little sky fill after
 * dark; each fades out where it meets the road and near the camera (the veil takes over inside),
 * so no puff ever shows a hard edge.
 */
export class SmokeField {
  constructor(scene, max = 6 * SMOKE.puffs) {
    this.scene = scene;
    this.max = max;
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
    this.glow = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.alpha.setUsage(THREE.DynamicDrawUsage);
    this.glow.setUsage(THREE.DynamicDrawUsage);
    const geo = puffGeometry();
    geo.setAttribute('aAG', this.alpha);
    geo.setAttribute('aGlow', this.glow);
    const mat = new THREE.MeshLambertMaterial({ map: puffTexture(), transparent: true, depthWrite: false, color: '#ffffff' });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aAG;\nattribute vec3 aGlow;\nvarying vec2 vAG;\nvarying vec3 vGlow;\nvarying float vWy;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvAG = aAG;\nvGlow = aGlow;\nvWy = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vAG;\nvarying vec3 vGlow;\nvarying float vWy;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAG.x * smoothstep(vAG.y, vAG.y + 0.8, vWy);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * diffuseColor.rgb;');
    };
    mat.customProgramCacheKey = () => 'kick-smoke';
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.name = 'smoke';
    // the canisters: a little grey can on its side in the road, hissing
    this.cans = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5d6470', roughness: 0.5, metalness: 0.4 }), 8);
    this.cans.count = 0;
    this.cans.frustumCulled = false;
    this.veil = new SmokeVeil();
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.cans, this.veil.mesh);
    scene.add(this.group);
    this._list = [];
  }

  /**
   * Draw the clouds. `ground(x, z)`: the road's height there; `keep(cloud, x, z, margin)`: a point
   * kept in the cloud's street; `lamps`: the lit street lamps near the camera [{ x, y, z }];
   * `night` 0 – 1.
   */
  update(clouds, { camera, now, ground, keep = null, lamps = [], night = 0 }) {
    const list = this._list;
    list.length = 0;
    const cam = camera.position;
    let nc = 0;
    for (const c of clouds) {
      const age = now - c.born;
      c.gy ??= ground(c.x0 ?? c.x, c.z0 ?? c.z);
      if (nc < 8 && age < SMOKE.life - 0.5) {
        _o.position.set(c.x0 ?? c.x, c.gy + 0.07, c.z0 ?? c.z);
        _o.quaternion.setFromAxisAngle(_z.set(0, 1, 0), c.heading ?? 0);
        _o.scale.setScalar(1);
        _o.updateMatrix();
        this.cans.setMatrixAt(nc++, _o.matrix);
      }
      // the street lamps' light on this cloud (warm, falling off over 18 m)
      let lamp = 0;
      for (const l of lamps) {
        const d = Math.hypot(l.x - c.x, l.z - c.z);
        if (d < 18) lamp += (1 - d / 18) ** 2;
      }
      lamp = Math.min(1.4, lamp) * night;
      for (const p of c.puffs) {
        const q = puffAt(c, p, age);
        if (!q) continue;
        // (in its street: never through a wall)
        const at = keep ? keep(c, q.x, q.z, q.size * 0.35) : q;
        const y = c.gy + q.up;
        // (fading out close to the camera, so no puff is a flat card in your face: inside, the veil is the smoke)
        const dc = Math.hypot(at.x - cam.x, y - cam.y, at.z - cam.z);
        const near = smooth(q.size * 0.35, q.size * 0.35 + 2.2, dc);
        const a = q.alpha * near;
        if (a < 0.01) continue;
        list.push({ x: at.x, y, z: at.z, size: q.size, a, dc, spin: p.spin + age * p.turn * 0.6, shade: p.shade, gy: c.gy, glow: lamp * (0.55 + 0.45 * p.up) });
      }
    }
    // far to near, so they blend right
    list.sort((a, b) => b.dc - a.dc);
    const n = Math.min(this.max, list.length);
    const camQ = camera.quaternion;
    for (let i = 0; i < n; i++) {
      const p = list[list.length - n + i];
      _o.position.set(p.x, p.y, p.z);
      _q.setFromAxisAngle(_z.set(0, 0, 1), p.spin);
      _o.quaternion.copy(camQ).multiply(_q);
      _o.scale.setScalar(p.size);
      _o.updateMatrix();
      this.mesh.setMatrixAt(i, _o.matrix);
      _c.setScalar(p.shade);
      this.mesh.setColorAt(i, _c);
      this.alpha.setXY(i, p.a, p.gy);
      const sk = night * 0.9;
      const wk = p.glow * 0.55;
      this.glow.setXYZ(i, _sky.r * sk + _warm.r * wk, _sky.g * sk + _warm.g * wk, _sky.b * sk + _warm.b * wk);
    }
    this.mesh.count = n;
    this.cans.count = nc;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.alpha.needsUpdate = true;
    this.glow.needsUpdate = true;
    this.cans.instanceMatrix.needsUpdate = true;
    return n;
  }

  dispose() {
    this.scene.remove(this.group);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.cans.geometry.dispose();
    this.cans.material.dispose();
    this.veil.dispose();
  }
}

/** Keep a cloud's puffs in the street it was dropped in (its plan's line and band), `margin` in from the kerbs. */
export function keepInStreet(cloud, x, z, margin = 0) {
  if (!cloud.pts?.length) return { x, z };
  const lo = Math.min(0, cloud.lo + margin);
  const hi = Math.max(0, cloud.hi - margin);
  return corridorClamp(cloud.pts, x, z, Math.min(lo, hi), Math.max(lo, hi));
}

/**
 * The veil over your view while you are in smoke: one full-screen quad drawn last in the scene (so
 * the HUD, which is the page's, stays over it), billows of drifting noise in the smoke's colour —
 * soft everywhere, no edge anywhere, a little thicker round the middle where your rider is.
 *
 *   const veil = new SmokeVeil();  group.add(veil.mesh);
 *   veil.set(amount, color, dt);
 */
export class SmokeVeil {
  constructor() {
    this.uniforms = { uAmount: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#d8dade') }, uAspect: { value: 16 / 9 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAmount; uniform float uTime; uniform vec3 uColor; uniform float uAspect;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float s = 0.0; float a = 0.5;
          for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
          return s;
        }
        void main() {
          vec2 p = vec2(vUv.x * uAspect, vUv.y) * 2.4;
          // two layers of billows rolling past each other (the second warped by the first)
          float n1 = fbm(p + vec2(uTime * 0.16, uTime * 0.05));
          float n2 = fbm(p * 0.55 - vec2(uTime * 0.06, -uTime * 0.09) + n1 * 0.9);
          float n = mix(n1, n2, 0.6);
          float mid = 1.0 - 0.28 * length((vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.3));
          float a = uAmount * clamp((0.62 + 0.7 * (n - 0.35)) * mid + 0.2, 0.0, 0.97);
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor * (0.8 + 0.42 * n), a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'smoke-veil';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9999;
    this.mesh.visible = false;
  }

  /** How thick (0 – 1), in what colour; `aspect` the screen's width over height. */
  set(amount, color, dt = 0, aspect = 16 / 9) {
    const u = this.uniforms;
    u.uAmount.value = amount;
    u.uTime.value += dt;
    u.uAspect.value = aspect;
    if (color) u.uColor.value.copy(color);
    this.mesh.visible = amount > 0.01;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * The canister going off: a soft pop and a long hiss of smoke pouring out (filtered noise,
 * swelling then dying away) — from a side (`pan`), at a level. Returns the length in seconds.
 */
export function poof(audio, noise, { gain = 0.5, pan = 0 } = {}) {
  if (!audio || !noise) return 0;
  const t = audio.currentTime;
  const out = audio.createGain();
  out.gain.value = gain;
  let node = out;
  if (audio.createStereoPanner) {
    const p = audio.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    node = p;
  }
  node.connect(audio.destination);
  // the pop: a short low thump of noise
  const pop = audio.createBufferSource();
  pop.buffer = noise;
  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const pg = audio.createGain();
  pg.gain.setValueAtTime(0.0001, t);
  pg.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
  pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  pop.connect(lp).connect(pg).connect(out);
  pop.start(t);
  pop.stop(t + 0.2);
  // the hiss: a band of noise sweeping down as the cloud billows out
  const hiss = audio.createBufferSource();
  hiss.buffer = noise;
  hiss.loop = true;
  const bp = audio.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.7;
  bp.frequency.setValueAtTime(3800, t);
  bp.frequency.exponentialRampToValueAtTime(1100, t + 1.4);
  const hg = audio.createGain();
  hg.gain.setValueAtTime(0.0001, t);
  hg.gain.exponentialRampToValueAtTime(0.32, t + 0.08);
  hg.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  hiss.connect(bp).connect(hg).connect(out);
  hiss.start(t);
  hiss.stop(t + 1.7);
  return 1.7;
}

/** A rider's cough in the smoke: two short, breathy barks of noise (nobody's recording). */
export function cough(audio, noise, { gain = 0.4, pan = 0, pitch = 1 } = {}) {
  if (!audio || !noise) return 0;
  const t0 = audio.currentTime;
  const out = audio.createGain();
  out.gain.value = gain;
  let node = out;
  if (audio.createStereoPanner) {
    const p = audio.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    node = p;
  }
  node.connect(audio.destination);
  for (const [dt, k] of [[0, 1], [0.24, 0.7]]) {
    const t = t0 + dt;
    const src = audio.createBufferSource();
    src.buffer = noise;
    const f = audio.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(900 * pitch, t);
    f.frequency.exponentialRampToValueAtTime(520 * pitch, t + 0.14);
    const f2 = audio.createBiquadFilter();
    f2.type = 'peaking';
    f2.frequency.value = 1800 * pitch;
    f2.gain.value = 6;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.8 * k, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.25 * k, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    src.connect(f).connect(f2).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.2);
  }
  return 0.45;
}
