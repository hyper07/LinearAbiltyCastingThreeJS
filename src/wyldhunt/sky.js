/**
 * The sky over Mistfall Gorge and its light. A humid, hazy jungle morning:
 * the sun high in the north-west, breaking through drifting cloud, so its
 * shafts slant down into the canyon toward the falls; and the showers, when
 * the cloud closes over, the light goes grey-green and the haze thickens.
 * `setWeather(0…1)` blends the two (0 sun through haze, 1 rain), moving the
 * sky, the sun, the hemisphere, the fog and the exposure together.
 */
import * as THREE from 'three';

export const MOODS = {
  sun: {
    toLight: new THREE.Vector3(-0.42, 0.78, -0.46).normalize(),
    lightColor: new THREE.Color('#fff0d2'),
    lightIntensity: 3.6,
    hemiSky: new THREE.Color('#c8dce4'),
    hemiGround: new THREE.Color('#4a5230'),
    hemiIntensity: 1.25,
    envIntensity: 0.9,
    exposure: 1.18,
    fogColor: new THREE.Color('#c4d0cc'),
    fogDensity: 0.0024,
    fogHeight: 0.022,
    scatterColor: new THREE.Color('#fff2d0'),
    scatter: 0.6,
    rays: 0.75
  },
  rain: {
    toLight: new THREE.Vector3(-0.3, 0.86, -0.4).normalize(),
    lightColor: new THREE.Color('#c8d4d8'),
    lightIntensity: 1.25,
    hemiSky: new THREE.Color('#9aaab4'),
    hemiGround: new THREE.Color('#2e3826'),
    hemiIntensity: 1.35,
    envIntensity: 0.95,
    exposure: 1.3,
    fogColor: new THREE.Color('#8e9a9a'),
    fogDensity: 0.0065,
    fogHeight: 0.016,
    scatterColor: new THREE.Color('#c0ccd0'),
    scatter: 0.35,
    rays: 0.12
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
uniform float uRain;
uniform float uTime;
uniform sampler2D tNoise;
varying vec3 vDir;

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * texture2D(tNoise, p).r; p = p * 2.03 + 0.17; a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float s = max(dot(d, uSun), 0.0);
  // A hazy blue overhead, milky toward the horizon.
  vec3 zen = mix(vec3(0.26, 0.42, 0.62), vec3(0.42, 0.47, 0.5), uRain);
  vec3 hor = mix(vec3(0.82, 0.86, 0.84), vec3(0.6, 0.64, 0.64), uRain);
  vec3 sky = mix(hor, zen, smoothstep(0.0, 0.75, y));
  sky += vec3(1.0, 0.9, 0.7) * (pow(s, 8.0) * 0.5 + pow(s, 64.0) * 1.4) * (1.0 - uRain * 0.8);
  sky += vec3(30.0, 27.0, 22.0) * smoothstep(0.99955, 0.99975, s) * (1.0 - uRain);
  // Cloud: soft heaped cumulus that thickens into a grey deck when it rains.
  if (y > -0.05) {
    vec2 uv = d.xz / (y + 0.18);
    float c1 = fbm(uv * 0.09 + vec2(uTime * 0.0016, uTime * 0.0006));
    float c2 = fbm(uv * 0.23 - vec2(uTime * 0.002, 0.0));
    float cov = smoothstep(0.62 - uRain * 0.42, 0.88 - uRain * 0.3, c1 * 0.8 + c2 * 0.35);
    float lit = pow(s, 2.0) * (1.0 - uRain);
    vec3 cTop = mix(vec3(1.05, 1.04, 1.0), vec3(0.62, 0.66, 0.68), uRain);
    vec3 cBase = mix(vec3(0.62, 0.66, 0.7), vec3(0.36, 0.4, 0.42), uRain);
    float edge = smoothstep(0.55, 0.7, c2) * (1.0 - smoothstep(0.7, 0.9, c1));
    vec3 cc = mix(cBase, cTop, c2) + vec3(1.0, 0.9, 0.7) * lit * (0.6 + edge * 1.6);
    sky = mix(sky, cc, cov * smoothstep(-0.05, 0.12, y) * 0.95);
  }
  // Below the horizon: the jungle's green haze.
  sky = mix(sky, vec3(0.32, 0.38, 0.32), smoothstep(0.0, -0.1, y));
  gl_FragColor = vec4(sky, 1.0);
}`;

export class Sky {
  constructor(renderer, noise) {
    this.renderer = renderer;
    this.uniforms = {
      uSun: { value: MOODS.sun.toLight.clone() },
      uRain: { value: 0 },
      uTime: { value: 0 },
      tNoise: { value: noise }
    };
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.envs = {};
  }

  /** Prefiltered environments (sun, rain) from the sky itself, the walls green round the horizon. */
  bakeEnvironments() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const scene = new THREE.Scene();
    const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.material.clone());
    m.material.uniforms = THREE.UniformsUtils.clone(this.uniforms);
    m.material.uniforms.tNoise.value = this.uniforms.tNoise.value;
    // Canyon walls: a band of mossy green-grey round the view, the floor darker.
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x4a5a44, side: THREE.BackSide }));
    wall.position.y = 1.5;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0x2a3220 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(m, wall, ground);
    for (const [name, w] of [['sun', 0], ['rain', 1]]) {
      m.material.uniforms.uRain.value = w;
      wall.material.color.set(w ? 0x3a4440 : 0x52624a);
      this.envs[name] = pmrem.fromScene(scene, 0, 0.1, 100).texture;
    }
    pmrem.dispose();
    m.geometry.dispose();
    m.material.dispose();
    wall.geometry.dispose();
    wall.material.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
  }

  update(t, camera, rain) {
    this.uniforms.uTime.value = t;
    this.uniforms.uRain.value = rain;
    this.mesh.position.copy(camera.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    for (const e of Object.values(this.envs)) e.dispose();
  }
}

/** The sun with its shadow and the hemisphere, blended between the moods. */
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
    this.state = { toLight: new THREE.Vector3(), fogColor: new THREE.Color(), scatterColor: new THREE.Color(), fogDensity: 0, fogHeight: 0, scatter: 0, exposure: 1, envIntensity: 1, rays: 0 };
    this.w = -1;
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
    cam.far = 700;
    cam.updateProjectionMatrix();
    s.bias = -0.0003;
    s.normalBias = 0.05;
    s.radius = 3;
    s.blurSamples = 12;
  }

  /** Blend the moods: 0 sun through haze, 1 a shower. */
  setWeather(w) {
    if (Math.abs(w - this.w) < 1e-4) return this.state;
    this.w = w;
    const a = MOODS.sun;
    const b = MOODS.rain;
    const st = this.state;
    st.toLight.copy(a.toLight).lerp(b.toLight, w).normalize();
    this.sun.color.copy(a.lightColor).lerp(b.lightColor, w);
    this.sun.intensity = THREE.MathUtils.lerp(a.lightIntensity, b.lightIntensity, w);
    this.hemi.color.copy(a.hemiSky).lerp(b.hemiSky, w);
    this.hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, w);
    this.hemi.intensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, w);
    st.fogColor.copy(a.fogColor).lerp(b.fogColor, w);
    st.scatterColor.copy(a.scatterColor).lerp(b.scatterColor, w);
    for (const k of ['fogDensity', 'fogHeight', 'scatter', 'exposure', 'envIntensity', 'rays']) st[k] = THREE.MathUtils.lerp(a[k], b[k], w);
    return st;
  }

  /** Keep the shadow box on the hunter (a little ahead of the camera), snapped to texels. */
  follow(focus, camera) {
    const ahead = new THREE.Vector3();
    camera.getWorldDirection(ahead);
    ahead.y = 0;
    ahead.normalize().multiplyScalar(this.box * 0.22);
    const c = focus.clone().add(ahead);
    const L = this.state.toLight;
    const texel = this.box / this.sun.shadow.mapSize.x;
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), L.clone().negate(), new THREE.Vector3(0, 1, 0));
    const inv = m.clone().invert();
    const lc = c.clone().applyMatrix4(inv);
    lc.x = Math.round(lc.x / texel) * texel;
    lc.y = Math.round(lc.y / texel) * texel;
    c.copy(lc.applyMatrix4(m));
    this.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(L, 320);
    this.target.updateMatrixWorld();
  }
}
