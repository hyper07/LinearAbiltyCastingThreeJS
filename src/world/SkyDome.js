import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { frame } from '../core/FrameUniforms.js';

/**
 * An open daytime sky: a deep blue overhead fading to a bright haze at the
 * horizon, the sun as a disc with a soft glow, and slow procedural clouds.
 *
 * It is a large sphere drawn inside-out around the camera, before everything
 * else and without depth, so it never hides the world. The horizon colour is
 * also what the fog fades to (ComposedWorld sets both from one time-of-day
 * preset), so distant hills melt into the sky instead of into a wall.
 *
 * The classic arena and night keep the flat backdrop: the dome is only shown
 * when `settings.environment.skyEnabled` is on.
 */
export class SkyDome {
  constructor() {
    this.material = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        uZenith: { value: new Color('#2f7fe0') },
        uHorizon: { value: new Color('#cfe6ff') },
        uGround: { value: new Color('#9fb6c8') },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uSunColor: { value: new Color('#fff6e0') },
        uSunSize: { value: 1 },
        uClouds: { value: 0.5 },
        uTime: frame.uTime
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww; // on the far plane
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunColor;
        uniform float uSunSize, uClouds, uTime;
        varying vec3 vDir;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
          return v;
        }

        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          // Blue overhead, haze at the horizon, a soft band below it.
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
          col = mix(col, uGround, smoothstep(0.0, -0.25, h));

          // The sun: a hot disc and a wide warm glow.
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(s, 900.0 / uSunSize) * 6.0 + pow(s, 14.0) * 0.35 + pow(s, 3.0) * 0.08);

          // Clouds on a flat layer overhead, drifting; thinner toward the horizon.
          if (h > 0.02 && uClouds > 0.0) {
            vec2 uv = d.xz / (h + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
            float c = fbm(uv);
            float cover = smoothstep(1.0 - uClouds * 0.75, 1.05 - uClouds * 0.45, c);
            cover *= smoothstep(0.02, 0.25, h);
            vec3 cloud = mix(vec3(0.82, 0.86, 0.92), vec3(1.0), smoothstep(0.4, 0.9, c));
            cloud += uSunColor * pow(s, 8.0) * 0.4; // lit edges near the sun
            col = mix(col, cloud, cover * 0.9);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.mesh = new Mesh(new SphereGeometry(500, 48, 24), this.material);
    this.mesh.name = 'sky-dome';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.visible = false;
  }

  /**
   * @param {object} env settings.environment
   * @param {Vector3} sunTravel direction the sunlight travels (toward the ground)
   * @param {Vector3} cameraPosition the dome is centred on the eye
   */
  update(env, sunTravel, cameraPosition) {
    this.mesh.visible = Boolean(env.skyEnabled);
    if (!this.mesh.visible) return;
    const u = this.material.uniforms;
    u.uZenith.value.set(env.skyZenith);
    u.uHorizon.value.set(env.skyHorizon);
    u.uGround.value.set(env.fogColor);
    u.uSunColor.value.set(env.sunColor);
    u.uSunDir.value.copy(sunTravel).negate();
    u.uClouds.value = env.skyClouds;
    u.uSunSize.value = env.skySunSize;
    this.mesh.position.copy(cameraPosition);
  }
}
