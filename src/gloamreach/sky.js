/**
 * The two skies and their light. Brindlewick is held at the golden hour —
 * a low sun in the west-north-west, warm light, long shadows, cumulus lit
 * gold and rose. The Gloamwood is a permanent violet dusk under a pale moon,
 * with stars. Walking through the Warden's Gate blends one into the other
 * (`setGloam(0…1)`): sky, sun and moon, hemisphere, environment, exposure
 * and fog all move together. The east horizon glows red over the rift.
 */
import * as THREE from 'three';

export const MOODS = {
  village: {
    toLight: new THREE.Vector3(-0.86, 0.34, 0.12).normalize(),
    lightColor: new THREE.Color('#ffb466'),
    lightIntensity: 5.4,
    hemiSky: new THREE.Color('#a8bce0'),
    hemiGround: new THREE.Color('#7a5434'),
    hemiIntensity: 0.75,
    envIntensity: 0.55,
    exposure: 1.05,
    fogColor: new THREE.Color('#dcae80'),
    fogDensity: 0.0024,
    fogHeight: 0.03,
    scatterColor: new THREE.Color('#ffb070'),
    scatter: 0.65,
    rays: 0.55
  },
  gloamwood: {
    toLight: new THREE.Vector3(0.32, 0.78, -0.54).normalize(),
    lightColor: new THREE.Color('#c8a0ff'),
    lightIntensity: 2.1,
    hemiSky: new THREE.Color('#8058c8'),
    hemiGround: new THREE.Color('#1e5a50'),
    hemiIntensity: 1.25,
    envIntensity: 0.7,
    exposure: 1.4,
    fogColor: new THREE.Color('#5c3c8c'),
    fogDensity: 0.0085,
    fogHeight: 0.06,
    scatterColor: new THREE.Color('#d48cff'),
    scatter: 0.5,
    rays: 0.35
  }
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
uniform vec3 uMoon;
uniform float uGloam;
uniform float uTime;
uniform sampler2D tNoise;
varying vec3 vDir;

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * texture2D(tNoise, p).r; p = p * 2.03 + 0.17; a *= 0.5; }
  return s;
}

vec3 villageSky(vec3 d) {
  float y = d.y;
  vec3 zen = vec3(0.11, 0.2, 0.45);
  vec3 mid = vec3(0.42, 0.56, 0.82);
  vec3 horSun = vec3(1.25, 0.66, 0.34);
  vec3 horAway = vec3(0.78, 0.55, 0.62);
  float facing = dot(normalize(d.xz + 1e-5), normalize(uSun.xz)) * 0.5 + 0.5;
  vec3 hor = mix(horAway, horSun, pow(facing, 2.5));
  vec3 sky = mix(hor, mid, smoothstep(0.0, 0.32, y));
  sky = mix(sky, zen, smoothstep(0.25, 0.95, y));
  float s = max(dot(d, uSun), 0.0);
  sky += vec3(1.0, 0.5, 0.2) * pow(s, 6.0) * 0.7 + vec3(1.0, 0.78, 0.45) * pow(s, 60.0) * 1.6;
  sky += vec3(40.0, 26.0, 14.0) * smoothstep(0.99955, 0.99975, s);
  // Clouds: a deck of cumulus low down and streaks above, lit from the sun's side.
  if (y > -0.02) {
    vec2 uv = d.xz / (y + 0.12);
    float c1 = fbm(uv * 0.11 + vec2(uTime * 0.0012, 0.0));
    float c2 = fbm(uv * vec2(0.03, 0.24) + vec2(uTime * 0.0008, 0.3));
    float band = smoothstep(0.02, 0.12, y) * smoothstep(0.55, 0.18, y);
    float cov = smoothstep(0.5, 0.75, c1) * band + smoothstep(0.58, 0.8, c2) * smoothstep(0.1, 0.4, y) * 0.6;
    float lit = pow(facing, 1.5);
    vec3 cdark = vec3(0.42, 0.32, 0.46);
    vec3 cbright = vec3(1.35, 0.78, 0.48);
    float edge = smoothstep(0.55, 0.62, c1) - smoothstep(0.62, 0.78, c1);
    vec3 cc = mix(cdark, cbright, lit * 0.75 + 0.15) + vec3(1.0, 0.6, 0.3) * edge * lit * 1.2;
    sky = mix(sky, cc, clamp(cov, 0.0, 1.0) * 0.9);
  }
  return sky;
}

vec3 gloamSky(vec3 d) {
  float y = d.y;
  vec3 zen = vec3(0.035, 0.018, 0.09);
  vec3 mid = vec3(0.2, 0.07, 0.34);
  vec3 hor = vec3(0.78, 0.28, 0.78);
  vec3 sky = mix(hor, mid, smoothstep(0.0, 0.3, y));
  sky = mix(sky, zen, smoothstep(0.25, 0.9, y));
  float m = max(dot(d, uMoon), 0.0);
  sky += vec3(0.85, 0.6, 1.0) * pow(m, 16.0) * 0.5 + vec3(0.9, 0.8, 1.0) * pow(m, 220.0) * 1.5;
  float disc = smoothstep(0.99935, 0.99955, m);
  float craters = texture2D(tNoise, d.xz * 9.0).b;
  sky += vec3(6.5, 6.0, 7.2) * disc * (0.75 + craters * 0.4);
  // Stars.
  vec2 sp = d.xz / (abs(y) + 0.3) * 60.0;
  vec2 cell = floor(sp);
  float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
  float star = step(0.985, h) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5)) * tw;
  sky += vec3(0.9, 0.85, 1.0) * star * smoothstep(0.08, 0.4, y) * 2.5;
  // Thin violet cloud veils.
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.15);
    float c = fbm(uv * vec2(0.05, 0.16) + vec2(uTime * 0.0006, 0.0));
    sky = mix(sky, vec3(0.5, 0.22, 0.6), smoothstep(0.55, 0.8, c) * 0.5 * smoothstep(0.03, 0.3, y));
  }
  return sky;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(villageSky(d), gloamSky(d), uGloam);
  // The rift's glow on the eastern horizon.
  float east = pow(max(d.x, 0.0), 2.5) * exp(-max(d.y, 0.0) * 5.0);
  col += vec3(1.0, 0.22, 0.05) * east * (1.5 - uGloam * 1.2);
  // Below the horizon: a warm, hazy ground colour (rarely seen past the hills).
  col = mix(col, mix(vec3(0.5, 0.36, 0.3), vec3(0.18, 0.08, 0.24), uGloam), smoothstep(0.0, -0.08, d.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor(renderer, noise) {
    this.renderer = renderer;
    this.uniforms = {
      uSun: { value: MOODS.village.toLight.clone() },
      uMoon: { value: new THREE.Vector3(0.28, 0.42, -0.86).normalize() },
      uGloam: { value: 0 },
      uTime: { value: 0 },
      tNoise: { value: noise }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      toneMapped: false
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.envs = {};
  }

  /** Two prefiltered environments (village, Gloamwood) from the sky itself. */
  bakeEnvironments() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const scene = new THREE.Scene();
    const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.material.clone());
    m.material.uniforms = THREE.UniformsUtils.clone(this.uniforms);
    m.material.uniforms.tNoise.value = this.uniforms.tNoise.value;
    // A warm ground below, as the land would bounce.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0x4a3420 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    scene.add(m, ground);
    for (const [name, g] of [['village', 0], ['gloamwood', 1]]) {
      m.material.uniforms.uGloam.value = g;
      ground.material.color.set(g ? 0x1a1430 : 0x4a3420);
      this.envs[name] = pmrem.fromScene(scene, 0, 0.1, 100).texture;
    }
    pmrem.dispose();
    m.geometry.dispose();
    m.material.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
  }

  update(t, camera, gloam) {
    this.uniforms.uTime.value = t;
    this.uniforms.uGloam.value = gloam;
    this.mesh.position.copy(camera.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    for (const e of Object.values(this.envs)) e.dispose();
  }
}

/** The sun (or moon) with its shadow, the hemisphere, and their blend between the two moods. */
export class Lighting {
  constructor(scene, { shadowSize = 4096, shadowBox = 110 } = {}) {
    this.scene = scene;
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.target = new THREE.Object3D();
    this.sun.target = this.target;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.sun, this.target, this.hemi);
    this.setShadow(shadowSize, shadowBox);
    this.state = {
      toLight: new THREE.Vector3(),
      fogColor: new THREE.Color(),
      scatterColor: new THREE.Color(),
      fogDensity: 0,
      fogHeight: 0,
      scatter: 0,
      exposure: 1,
      envIntensity: 1,
      rays: 0
    };
    this.gloam = -1;
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
    cam.far = 600;
    cam.updateProjectionMatrix();
    s.bias = -0.00028;
    s.normalBias = 0.045;
    s.radius = 2.5;
    s.blurSamples = 12;
  }

  /** Blend the moods (0 village … 1 Gloamwood). */
  setGloam(g) {
    if (Math.abs(g - this.gloam) < 1e-4) return this.state;
    this.gloam = g;
    const a = MOODS.village;
    const b = MOODS.gloamwood;
    const st = this.state;
    st.toLight.copy(a.toLight).lerp(b.toLight, g).normalize();
    this.sun.color.copy(a.lightColor).lerp(b.lightColor, g);
    this.sun.intensity = THREE.MathUtils.lerp(a.lightIntensity, b.lightIntensity, g);
    this.hemi.color.copy(a.hemiSky).lerp(b.hemiSky, g);
    this.hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, g);
    this.hemi.intensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, g);
    st.fogColor.copy(a.fogColor).lerp(b.fogColor, g);
    st.scatterColor.copy(a.scatterColor).lerp(b.scatterColor, g);
    for (const k of ['fogDensity', 'fogHeight', 'scatter', 'exposure', 'envIntensity', 'rays']) st[k] = THREE.MathUtils.lerp(a[k], b[k], g);
    return st;
  }

  /** Keep the shadow box on the hero (a little ahead of the camera), snapped to texels so it doesn't shimmer. */
  follow(focus, camera) {
    const ahead = new THREE.Vector3();
    camera.getWorldDirection(ahead);
    ahead.y = 0;
    ahead.normalize().multiplyScalar(this.box * 0.22);
    const c = focus.clone().add(ahead);
    const L = this.state.toLight;
    // Snap the centre in light space.
    const texel = this.box / this.sun.shadow.mapSize.x;
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), L.clone().negate(), new THREE.Vector3(0, 1, 0));
    const inv = m.clone().invert();
    const lc = c.clone().applyMatrix4(inv);
    lc.x = Math.round(lc.x / texel) * texel;
    lc.y = Math.round(lc.y / texel) * texel;
    c.copy(lc.applyMatrix4(m));
    this.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(L, 260);
    this.target.updateMatrixWorld();
  }
}
