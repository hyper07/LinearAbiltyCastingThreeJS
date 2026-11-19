/**
 * The sky over Kithvale and its light, at any hour. Golden dusk is the
 * vale's own hour (where the game starts), and a slow day cycle can turn it
 * through blue evening, a starry night, a pink dawn and a bright noon.
 *
 * The sky is painted, not simulated: a gradient from a deep zenith through a
 * soft middle to a glowing horizon, warmest toward the sun; big flat cloud
 * banks with lit edges and shaded bellies in two or three tones; thin high
 * streaks that catch the last light; stars at night. `Lighting` sets the sun
 * (a moon at night), the sky's fill, the haze and the exposure from the same
 * table, and keeps the sun's shadow box on the player.
 */
import * as THREE from 'three';

const C = (h) => new THREE.Color(h);

/** The hours' looks. Each key: sky colours, the sun's light, the fill, the haze, exposure. */
export const KEYS = [
  { h: 0, zen: C('#0e1430'), mid: C('#1c2448'), hor: C('#36406a'), sun: C('#8aa0d8'), sunI: 0.55, hemiS: C('#5a6aa8'), hemiG: C('#1a1a2a'), hemiI: 0.55, fog: C('#2a3058'), fogD: 0.0022, scat: C('#8a9ad8'), scatK: 0.2, exp: 1.25, cLit: C('#6a74a8'), cShade: C('#262c50'), env: 0.35, stars: 1, glow: C('#8a9ad8') },
  { h: 5.2, zen: C('#28305a'), mid: C('#6a5a8a'), hor: C('#e89a8a'), sun: C('#ffb08a'), sunI: 1.2, hemiS: C('#a08ab8'), hemiG: C('#3a3040'), hemiI: 0.8, fog: C('#c89aa0'), fogD: 0.0026, scat: C('#ffb090'), scatK: 0.7, exp: 1.2, cLit: C('#ffc0a0'), cShade: C('#7a6a9a'), env: 0.55, stars: 0.3, glow: C('#ffb090') },
  { h: 8, zen: C('#3a72c0'), mid: C('#8ab4e0'), hor: C('#e8e0d0'), sun: C('#fff0d8'), sunI: 3.0, hemiS: C('#b8d0f0'), hemiG: C('#5a6040'), hemiI: 1.15, fog: C('#c8d8e8'), fogD: 0.0016, scat: C('#fff4e0'), scatK: 0.45, exp: 1.0, cLit: C('#ffffff'), cShade: C('#b0c0d8'), env: 0.9, stars: 0, glow: C('#fff4e0') },
  { h: 13, zen: C('#2e68c0'), mid: C('#7aaee8'), hor: C('#dce8f0'), sun: C('#fff6e8'), sunI: 3.4, hemiS: C('#bcd4f4'), hemiG: C('#5a6440'), hemiI: 1.2, fog: C('#c8dcec'), fogD: 0.0014, scat: C('#fffaf0'), scatK: 0.35, exp: 0.98, cLit: C('#ffffff'), cShade: C('#b8c8e0'), env: 0.95, stars: 0, glow: C('#fffaf0') },
  { h: 16.2, zen: C('#4a6ab8'), mid: C('#a8a8d8'), hor: C('#f4d8b0'), sun: C('#ffe0a8'), sunI: 3.0, hemiS: C('#c0c4e8'), hemiG: C('#6a5a40'), hemiI: 1.1, fog: C('#e4d4c8'), fogD: 0.0018, scat: C('#ffe0b0'), scatK: 0.6, exp: 1.0, cLit: C('#fff4e0'), cShade: C('#b8b4d8'), env: 0.85, stars: 0, glow: C('#ffe0b0') },
  // Golden dusk, the vale's hour: lavender above, peach and gold at the horizon, a low warm sun.
  { h: 17.8, zen: C('#6a70b4'), mid: C('#c0a4c8'), hor: C('#f8cc9c'), sun: C('#ffc276'), sunI: 3.7, hemiS: C('#bcc8d8'), hemiG: C('#86684a'), hemiI: 1.12, fog: C('#ecc8b0'), fogD: 0.0012, scat: C('#ffc07a'), scatK: 0.9, exp: 1.12, cLit: C('#fff4e6'), cShade: C('#a8a0cc'), env: 0.45, stars: 0, glow: C('#ffb874') },
  { h: 19.3, zen: C('#2a3070'), mid: C('#6a5a98'), hor: C('#e0907a'), sun: C('#ff9a6a'), sunI: 1.1, hemiS: C('#8a80b8'), hemiG: C('#3a2a30'), hemiI: 0.85, fog: C('#9a7a98'), fogD: 0.0024, scat: C('#ff9a7a'), scatK: 0.7, exp: 1.18, cLit: C('#f0a090'), cShade: C('#4a4078'), env: 0.55, stars: 0.35, glow: C('#ff9a7a') },
  { h: 21, zen: C('#121838'), mid: C('#262c58'), hor: C('#4a4a78'), sun: C('#9ab0e8'), sunI: 0.6, hemiS: C('#5a68a8'), hemiG: C('#1e1e2e'), hemiI: 0.6, fog: C('#30365e'), fogD: 0.0022, scat: C('#8a9ad8'), scatK: 0.25, exp: 1.25, cLit: C('#6a74a8'), cShade: C('#262c50'), env: 0.38, stars: 1, glow: C('#8a9ad8') }
];

/** The look at an hour (blended between keys, wrapping midnight). */
export function moodAt(hour, out = {}) {
  const h = ((hour % 24) + 24) % 24;
  let a = KEYS[KEYS.length - 1];
  let b = KEYS[0];
  let ha = a.h - 24;
  let hb = b.h;
  for (let i = 0; i < KEYS.length; i++) {
    const k0 = KEYS[i];
    const k1 = KEYS[(i + 1) % KEYS.length];
    const h1 = i + 1 < KEYS.length ? k1.h : k1.h + 24;
    if (h >= k0.h && h < h1) {
      a = k0;
      b = k1;
      ha = k0.h;
      hb = h1;
      break;
    }
  }
  if (h < KEYS[0].h) {
    a = KEYS[KEYS.length - 1];
    b = KEYS[0];
    ha = a.h - 24;
    hb = b.h;
  }
  const t = THREE.MathUtils.smoothstep((h - ha) / (hb - ha), 0, 1);
  for (const k of Object.keys(a)) {
    if (k === 'h') continue;
    if (a[k].isColor) (out[k] ??= new THREE.Color()).copy(a[k]).lerp(b[k], t);
    else out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out;
}

/** The sun's direction (toward it) at an hour: up in the east-north-east, down in the west-north-west. Below the horizon at night, the moon. */
export function sunDir(hour, out = new THREE.Vector3()) {
  const h = ((hour % 24) + 24) % 24;
  const rise = 5.5;
  const set = 19.2;
  if (h > rise && h < set) {
    const f = (h - rise) / (set - rise);
    const el = THREE.MathUtils.degToRad(62) * Math.pow(Math.sin(Math.PI * f), 1.3) + 0.02;
    const az = THREE.MathUtils.degToRad(60 + f * 240);
    return out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  }
  // The moon: high in the south-west through the night.
  const f = ((h - set + 24) % 24) / (24 - (set - rise));
  const el = THREE.MathUtils.degToRad(12 + 40 * Math.sin(Math.PI * f));
  const az = THREE.MathUtils.degToRad(120 + f * 120);
  return out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}
export const isNight = (hour) => {
  const h = ((hour % 24) + 24) % 24;
  return h < 5.4 || h > 19.6;
};

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uZen;
uniform vec3 uMid;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform vec3 uCLit;
uniform vec3 uCShade;
uniform float uStars;
uniform float uTime;
uniform float uSunUp;
uniform sampler2D tNoise;
varying vec3 vDir;

float n2(vec2 p) { return texture2D(tNoise, p).r; }
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.07 + 0.31; a *= 0.5; }
  return s;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float s = max(dot(d, normalize(uSun)), 0.0);
  float az = atan(d.x, d.z);
  // Painted gradient: zenith → middle → a glowing horizon, warmer toward the sun.
  float e = clamp(y, 0.0, 1.0);
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.28, e));
  col = mix(col, uZen, smoothstep(0.22, 0.85, e));
  float toward = pow(max(dot(normalize(d.xz + 1e-4), normalize(uSun.xz + 1e-4)), 0.0), 2.0);
  col = mix(col, uGlow * 1.15, toward * smoothstep(0.35, 0.0, e) * 0.55 * uSunUp);
  // The sun: a soft disc in a wide halo (a moon at night, smaller and cooler).
  col += uGlow * (pow(s, 6.0) * 0.35 + pow(s, 48.0) * 0.8) * (0.4 + uSunUp * 0.6);
  col = mix(col, vec3(3.2, 2.7, 2.1) * mix(vec3(0.75, 0.82, 1.0), vec3(1.0), uSunUp), smoothstep(0.99935, 0.99962, s));
  // Stars.
  if (uStars > 0.0 && y > 0.0) {
    vec2 g = vec2(az * 60.0, y * 90.0);
    vec2 c = floor(g);
    float h = hash(c);
    float st = step(0.985, h) * smoothstep(0.45, 0.0, length(fract(g) - 0.5)) * (0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0));
    col += vec3(st) * uStars * smoothstep(0.02, 0.25, y);
  }
  // Clouds, painted in three tones (shaded belly, a middle, a lit crown) with a warm edge toward the sun.
  if (y > -0.05) {
    vec2 sd = normalize(uSun.xz + 1e-4);
    float u = az / 6.2831853;
    // (a) Long banks low over the hills.
    vec2 cp = vec2(u * 6.0 + uTime * 0.0008, y * 4.2);
    float n1 = fbm(cp * vec2(1.0, 1.7)) + fbm(cp * 2.6 + 3.1) * 0.32;
    float band = smoothstep(0.5, 0.04, y) * smoothstep(-0.03, 0.05, y);
    float shape = n1 * (0.72 + band * 0.55) - y * 0.3;
    float cov = smoothstep(0.56, 0.59, shape) * band;
    float n1b = fbm((cp + vec2(0.0, 0.05)) * vec2(1.0, 1.7)) + fbm((cp + vec2(0.0, 0.05)) * 2.6 + 3.1) * 0.32;
    float lit1 = smoothstep(-0.03, 0.04, n1 - n1b) * 0.55 + toward * 0.45;
    // (b) Puffs higher up, on a plane in perspective, drifting.
    vec2 pp = d.xz / (y + 0.1) * 0.3 + vec2(uTime * 0.003, uTime * 0.001);
    float n2 = fbm(pp * 0.45) + fbm(pp * 1.25 + 5.0) * 0.38;
    float n2s = fbm((pp + sd * 0.07) * 0.45) + fbm((pp + sd * 0.07) * 1.25 + 5.0) * 0.38;
    float cov2 = smoothstep(0.665, 0.7, n2) * smoothstep(0.05, 0.22, y) * smoothstep(0.98, 0.6, y);
    float lit2 = smoothstep(0.02, -0.06, n2s - n2) * 0.7 + toward * 0.3;
    float lit = mix(lit1, lit2, step(cov, cov2));
    float c = max(cov, cov2);
    float tone = lit < 0.33 ? 0.0 : lit < 0.66 ? 0.5 : 1.0;
    tone = mix(tone, lit, 0.35);
    vec3 cc = mix(uCShade, uCLit, tone);
    float edge = (smoothstep(0.56, 0.575, shape) - smoothstep(0.575, 0.62, shape)) * band + (smoothstep(0.665, 0.675, n2) - smoothstep(0.675, 0.715, n2)) * smoothstep(0.05, 0.22, y);
    cc += uGlow * clamp(edge, 0.0, 1.0) * (0.25 + toward * 0.75) * 0.7 * uSunUp;
    col = mix(col, cc, c * 0.97);
    // High thin streaks catching the light.
    vec2 sp = vec2(u * 3.0 + uTime * 0.002, y * 18.0);
    float streak = smoothstep(0.6, 0.8, fbm(sp * vec2(1.0, 0.35) + fbm(sp * 0.6) * 0.4)) * smoothstep(0.1, 0.3, y) * smoothstep(0.8, 0.4, y) * (1.0 - c);
    col = mix(col, mix(uCLit, uGlow, 0.35) * 1.02, streak * 0.45);
  }
  // Below the horizon: the haze over the far hills.
  col = mix(col, uHor * 0.85, smoothstep(0.0, -0.08, y));
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor(renderer, noise) {
    this.renderer = renderer;
    this.uniforms = {
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uZen: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uCLit: { value: new THREE.Color() },
      uCShade: { value: new THREE.Color() },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uSunUp: { value: 1 },
      tNoise: { value: noise }
    };
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.envs = [];
  }

  setHour(hour, mood) {
    const u = this.uniforms;
    sunDir(hour, u.uSun.value);
    u.uZen.value.copy(mood.zen);
    u.uMid.value.copy(mood.mid);
    u.uHor.value.copy(mood.hor);
    u.uGlow.value.copy(mood.glow);
    u.uCLit.value.copy(mood.cLit);
    u.uCShade.value.copy(mood.cShade);
    u.uStars.value = mood.stars;
    u.uSunUp.value = isNight(hour) ? 0 : 1;
  }

  /** Prefiltered environments for a few hours (noon, dusk, night), the ground a warm green below. */
  bakeEnvironments(hours = [13, 17.8, 21]) {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const scene = new THREE.Scene();
    const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.material.clone());
    m.material.uniforms = THREE.UniformsUtils.clone(this.uniforms);
    m.material.uniforms.tNoise.value = this.uniforms.tNoise.value;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32), new THREE.MeshBasicMaterial({ color: 0x4a5a30 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.8;
    scene.add(m, ground);
    const saved = this.material.uniforms;
    for (const h of hours) {
      const mood = moodAt(h);
      this.uniforms = m.material.uniforms;
      this.setHour(h, mood);
      ground.material.color.copy(mood.hemiG).multiplyScalar(1.4);
      const rt = pmrem.fromScene(scene, 0, 0.1, 100);
      (this.rts ??= []).push(rt);
      this.envs.push({ h, tex: rt.texture });
    }
    this.uniforms = saved;
    pmrem.dispose();
    m.geometry.dispose();
    m.material.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
  }

  /** The baked environment nearest an hour. */
  envFor(hour) {
    let best = this.envs[0];
    let bd = Infinity;
    for (const e of this.envs) {
      const d = Math.min(Math.abs(e.h - hour), 24 - Math.abs(e.h - hour));
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best?.tex ?? null;
  }

  update(t, camera) {
    this.uniforms.uTime.value = t;
    this.mesh.position.copy(camera.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    for (const e of this.envs) e.tex.dispose();
    for (const rt of this.rts ?? []) rt.dispose();
  }
}

/** The sun (or moon) with its shadow, and the sky's fill, set from the hour. */
export class Lighting {
  constructor(scene, { shadowSize = 4096, shadowBox = 100 } = {}) {
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.target = new THREE.Object3D();
    this.sun.target = this.target;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.sun, this.target, this.hemi);
    this.setShadow(shadowSize, shadowBox);
    this.mood = {};
    this.toLight = new THREE.Vector3(0, 1, 0);
    this.hour = -1;
  }

  setShadow(size, box) {
    this.box = box;
    const s = this.sun.shadow;
    s.mapSize.set(size, size);
    s.map?.dispose();
    s.map = null;
    const cam = s.camera;
    cam.left = -box / 2;
    cam.right = box / 2;
    cam.top = box / 2;
    cam.bottom = -box / 2;
    cam.near = 1;
    cam.far = 800;
    cam.updateProjectionMatrix();
    s.bias = -0.00025;
    s.normalBias = 0.045;
    s.radius = 3;
    s.blurSamples = 12;
  }

  /** Set everything for an hour; returns the mood (colours, haze, exposure…). */
  setHour(hour) {
    if (Math.abs(hour - this.hour) < 1e-4) return this.mood;
    this.hour = hour;
    const m = moodAt(hour, this.mood);
    sunDir(hour, this.toLight);
    m.toLight = this.toLight;
    // A sun skimming the horizon fades rather than switching off.
    const up = THREE.MathUtils.smoothstep(this.toLight.y, -0.02, 0.06);
    this.sun.color.copy(m.sun);
    this.sun.intensity = m.sunI * (0.25 + 0.75 * up);
    this.hemi.color.copy(m.hemiS);
    this.hemi.groundColor.copy(m.hemiG);
    this.hemi.intensity = m.hemiI;
    m.lightColor = this.sun.color;
    m.fogColor = m.fog;
    m.fogDensity = m.fogD;
    m.scatterColor = m.scat;
    m.scatter = m.scatK;
    m.exposure = m.exp;
    m.envIntensity = m.env;
    m.night = isNight(hour);
    return m;
  }

  /** Keep the shadow box on the player (a little ahead of the camera), snapped to texels. */
  follow(focus, camera) {
    const ahead = new THREE.Vector3();
    camera.getWorldDirection(ahead);
    ahead.y = 0;
    ahead.normalize().multiplyScalar(this.box * 0.25);
    const c = focus.clone().add(ahead);
    const L = this.toLight.y > 0.05 ? this.toLight : new THREE.Vector3(this.toLight.x, 0.05, this.toLight.z).normalize();
    const texel = this.box / this.sun.shadow.mapSize.x;
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), L.clone().negate(), new THREE.Vector3(0, 1, 0));
    const inv = m.clone().invert();
    const lc = c.clone().applyMatrix4(inv);
    lc.x = Math.round(lc.x / texel) * texel;
    lc.y = Math.round(lc.y / texel) * texel;
    c.copy(lc.applyMatrix4(m));
    this.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(L, 380);
    this.target.updateMatrixWorld();
  }
}
