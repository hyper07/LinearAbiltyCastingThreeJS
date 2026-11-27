import * as THREE from 'three';

/**
 * Low ground mist for a fog bank (weather.js FOG_BANK): three thin sheets just above the street
 * round the camera — at knee, hip and wheel-arch height — each a disc 64 m across with drifting
 * patchy noise in the fog's own colour, thinning out near the camera (so you never ride inside a
 * grey card) and far off (where the fog takes over). One small draw each; nothing when the air is
 * clear.
 *
 * The riders are cut out of it (`holes`: up to six circles round them) so the mist is weather on the
 * street, never a grey wash over the plush characters.
 *
 *   const mist = new GroundMist(scene);
 *   mist.update(dt, { camera, ground, amount, color, holes: [{ x, z }] });
 */
const HOLES = 6;
const LAYERS = [
  { h: 0.22, a: 0.5, s: 0.045 },
  { h: 0.55, a: 0.36, s: 0.032 },
  { h: 1.0, a: 0.22, s: 0.022 }
];

export class GroundMist {
  constructor(scene) {
    this.scene = scene;
    this.uniforms = {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color('#c8ccd1') },
      uCam: { value: new THREE.Vector3() },
      uHoles: { value: Array.from({ length: HOLES }, () => new THREE.Vector3(0, 0, -1)) }
    };
    this.group = new THREE.Group();
    this.group.name = 'ground-mist';
    this.group.visible = false;
    const geo = new THREE.CircleGeometry(32, 40).rotateX(-Math.PI / 2);
    this.geo = geo;
    this.mats = LAYERS.map((L, i) => {
      const m = new THREE.ShaderMaterial({
        uniforms: { ...this.uniforms, uA: { value: L.a }, uS: { value: L.s }, uSeed: { value: i * 17.3 } },
        transparent: true,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uAmount; uniform vec3 uColor; uniform vec3 uCam;
          uniform vec3 uHoles[${HOLES}]; uniform float uA; uniform float uS; uniform float uSeed;
          varying vec3 vW;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          void main() {
            vec2 p = vW.xz * uS + vec2(uTime * 0.035 + uSeed, uTime * 0.02);
            float n = noise(p) * 0.6 + noise(p * 2.3 - uTime * 0.05) * 0.4;
            n = smoothstep(0.3, 0.85, n);
            float d = length(vW.xz - uCam.xz);
            // thin by the camera (no grey card in your face), thickest 7–18 m out (the fog takes over past it)
            float r = smoothstep(3.0, 7.0, d) * (1.0 - smoothstep(18.0, 30.0, d));
            float hole = 1.0;
            for (int i = 0; i < ${HOLES}; i++) {
              vec3 H = uHoles[i];
              if (H.z <= 0.0) continue;
              hole *= smoothstep(H.z, H.z + 1.6, length(vW.xz - H.xy));
            }
            float a = uA * uAmount * n * r * hole;
            if (a < 0.004) discard;
            gl_FragColor = vec4(uColor, a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`
      });
      const mesh = new THREE.Mesh(geo, m);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      mesh.userData.h = L.h;
      this.group.add(mesh);
      return m;
    });
    scene.add(this.group);
  }

  /** `amount` 0–1 (the fog bank's thickness); `ground` the street's height under the camera. */
  update(dt, { camera, ground = 0, amount = 0, color = null, holes = [] } = {}) {
    const on = amount > 0.01;
    this.group.visible = on;
    if (!on) return;
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uAmount.value = amount;
    if (color) u.uColor.value.copy(color).multiplyScalar(1.06);
    u.uCam.value.copy(camera.position);
    for (let i = 0; i < HOLES; i++) {
      const h = holes[i];
      if (h) u.uHoles.value[i].set(h.x, h.z, h.r ?? 1.1);
      else u.uHoles.value[i].z = -1;
    }
    for (const m of this.group.children) m.position.set(camera.position.x, ground + m.userData.h, camera.position.z);
  }

  dispose() {
    this.scene.remove(this.group);
    this.geo.dispose();
    for (const m of this.mats) m.dispose();
  }
}
