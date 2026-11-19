/**
 * Wyldhunt's picture, after Gloamreach's post chain (ambient occlusion from
 * depth, light shafts, height fog lit by the sun it faces, bloom on only the
 * brightest, ACES with a split tone, SMAA), with what a wet jungle needs:
 *
 *  - a second, "wet" pass: once the solid world is drawn, the frame and its
 *    depth are copied, and the water, the falls, the mist, the spray and the
 *    rain (layer 1) are drawn over it reading those copies — so the river
 *    bends and darkens what lies under it, foams where it meets the banks,
 *    and mist and rain fade softly where they touch the ground;
 *  - mist volumes: the falls' plunge pools fill the air round them with
 *    spray that thins with height, integrated along each view ray, so the
 *    pillars and the cliffs fade into it like a real cloud;
 *  - a cooler, greener grade.
 */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const COMMON = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform float uNear;
uniform float uFar;
vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
`;

const AO_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uTexel;
uniform float uRadius;
uniform float uTime;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec3 px = viewPos(vUv + vec2(uTexel.x, 0.0)) - P;
  vec3 py = viewPos(vUv + vec2(0.0, uTexel.y)) - P;
  vec3 cr = cross(px, py);
  if (dot(cr, cr) < 1e-14) { gl_FragColor = vec4(1.0); return; }
  vec3 N = normalize(cr);
  float rad = uRadius / max(-P.z, 0.5);
  rad = min(rad, 0.12);
  float occ = 0.0;
  float ang = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
  const int S = 12;
  for (int i = 0; i < S; i++) {
    float f = (float(i) + 0.5) / float(S);
    float a = ang + f * 6.2831 * 2.618;
    vec2 off = vec2(cos(a), sin(a)) * rad * sqrt(f);
    vec3 Q = viewPos(vUv + off) - P;
    float l = length(Q);
    float fall = 1.0 - smoothstep(uRadius * 0.6, uRadius * 1.6, l);
    occ += max(dot(N, Q / max(l, 1e-4)) - 0.08, 0.0) * fall;
  }
  occ = 1.0 - occ / float(S) * 1.6;
  gl_FragColor = vec4(vec3(clamp(occ, 0.0, 1.0)), 1.0);
}`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tAO;
uniform sampler2D tDepth;
uniform vec2 uDir;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
void main() {
  float c = lin(texture2D(tDepth, vUv).x);
  float s = 0.0, w = 0.0;
  for (int i = -4; i <= 4; i++) {
    vec2 uv = vUv + uDir * float(i);
    float z = lin(texture2D(tDepth, uv).x);
    float k = exp(-float(i * i) / 10.0) * (1.0 / (1.0 + abs(z - c) / (c * 0.03)));
    s += texture2D(tAO, uv).r * k;
    w += k;
  }
  gl_FragColor = vec4(vec3(s / w), 1.0);
}`;

const RAYS_FRAG = /* glsl */ `
uniform sampler2D tDepth;
uniform sampler2D tColor;
uniform vec2 uSun;
uniform float uFacing;
uniform float uAspect;
varying vec2 vUv;
void main() {
  // What lets light through: the sky, brightest near the sun.
  vec2 dir = (uSun - vUv);
  float sum = 0.0;
  float decay = 1.0;
  vec2 uv = vUv;
  vec2 stp = dir / 56.0;
  for (int i = 0; i < 56; i++) {
    uv += stp;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    float sky = step(0.99999, texture2D(tDepth, uv).x);
    vec2 dd = (uv - uSun) * vec2(uAspect, 1.0);
    float near = exp(-dot(dd, dd) * 6.0);
    vec3 c = texture2D(tColor, uv).rgb;
    sum += sky * near * min(dot(c, vec3(0.3, 0.5, 0.2)), 3.0) * decay;
    decay *= 0.965;
  }
  gl_FragColor = vec4(vec3(sum / 56.0 * uFacing), 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */ `
${COMMON}
uniform sampler2D tColor;
uniform sampler2D tAO;
uniform sampler2D tRays;
uniform float uAO;
uniform float uRaysOn;
uniform vec3 uCamPos;
uniform vec3 uToLight;
uniform vec3 uLightColor;
uniform vec3 uFogColor;
uniform vec3 uScatterColor;
uniform float uFogDensity;
uniform float uFogHeight;
uniform float uScatter;
uniform float uRays;
uniform float uGround;
uniform vec4 uMist[4];
uniform vec4 uMistK[4];
uniform vec3 uMistColor;
varying vec2 vUv;
void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  float d = texture2D(tDepth, vUv).x;
  vec3 vp = viewPos(vUv);
  vec3 wp = (uCamWorld * vec4(vp, 1.0)).xyz;
  vec3 ray = wp - uCamPos;
  float dist = length(ray);
  vec3 dir = ray / max(dist, 1e-4);
  bool sky = d >= 0.99999;
  if (!sky && uAO > 0.0) {
    float ao = texture2D(tAO, vUv).r;
    col *= mix(1.0, ao, uAO * smoothstep(160.0, 40.0, dist));
  }
  // Height fog: thicker low down, integrated along the ray.
  // No extra fog below the ground line (the rift has its own haze).
  float h0 = max(uCamPos.y - uGround, 0.0);
  float h1 = max((sky ? uCamPos.y + dir.y * 800.0 : wp.y) - uGround, 0.0);
  float L = sky ? 800.0 : dist;
  float k = uFogHeight;
  float dy = h1 - h0;
  float hf = abs(dy) > 0.01 ? (exp(-k * max(h0, -20.0)) - exp(-k * max(h1, -20.0))) / (k * dy) : exp(-k * max(h0, -20.0));
  float fog = 1.0 - exp(-uFogDensity * L * hf);
  if (sky) fog *= 0.55;
  float s = max(dot(dir, uToLight), 0.0);
  vec3 fogCol = uFogColor + uScatterColor * (pow(s, 6.0) * 0.9 + pow(s, 32.0) * 1.6) * uScatter;
  col = mix(col, fogCol, clamp(fog, 0.0, 1.0));
  // Mist round the falls: spheres of spray, thick at the bottom, integrated along the ray.
  float od = 0.0;
  float L2 = sky ? 2000.0 : dist;
  for (int i = 0; i < 4; i++) {
    vec4 m = uMist[i];
    if (m.w <= 0.0) continue;
    vec3 oc = uCamPos - m.xyz;
    float b = dot(oc, dir);
    float c = dot(oc, oc) - m.w * m.w;
    float h = b * b - c;
    if (h <= 0.0) continue;
    h = sqrt(h);
    float t0 = max(-b - h, 0.0);
    float t1 = min(-b + h, L2);
    if (t1 <= t0) continue;
    // Thick near the pool, thinning with height (sampled at three points along the chord).
    float acc = 0.0;
    for (int k = 0; k < 3; k++) {
      float tt = mix(t0, t1, (float(k) + 0.5) / 3.0);
      vec3 p = uCamPos + dir * tt;
      float rel = clamp((p.y - (m.y - m.w * 0.3)) / (m.w * uMistK[i].y), 0.0, 1.0);
      float r = length(p - m.xyz) / m.w;
      acc += exp(-rel * 2.6) * (1.0 - r * r);
    }
    od += uMistK[i].x * (t1 - t0) * acc / 3.0;
  }
  float mist = 1.0 - exp(-od);
  float ms = pow(max(dot(dir, uToLight), 0.0), 4.0);
  col = mix(col, uMistColor * (0.9 + ms * 0.8 * uScatter) , clamp(mist, 0.0, 0.97));
  if (uRaysOn > 0.0) col += texture2D(tRays, vUv).rgb * uLightColor * uRays;
  // Never let a bad pixel through: bloom would smear it over the screen.
  if (any(isnan(col)) || any(isinf(col))) col = uFogColor;
  col = min(max(col, vec3(0.0)), vec3(80.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tColor;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(tColor, vUv).rgb, 1.0); }`;

const DEPTH_FRAG = /* glsl */ `
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).x;
  float z = d * 2.0 - 1.0;
  float lin = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  gl_FragColor = vec4(d >= 0.99999 ? 1e4 : lin, 0.0, 0.0, 1.0);
}`;

/** What the wet pass's materials read: the solid frame, its linear depth, the screen size. */
export const wet = {
  tScene: { value: null },
  tDepthLin: { value: null },
  uScreen: { value: new THREE.Vector2(1, 1) },
  uRefract: { value: 1 }
};

const GRADE_FRAG = /* glsl */ `
#include <tonemapping_pars_fragment>
uniform sampler2D tColor;
uniform float uExposure;
uniform float uGloam;
uniform float uVignette;
uniform float uFade;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb * uExposure;
  // Split toning: shadows toward teal-violet, highlights toward gold (village) or rose (Gloamwood).
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = mix(vec3(0.9, 1.0, 1.04), vec3(0.92, 0.98, 1.06), uGloam);
  vec3 highTint = mix(vec3(1.06, 1.02, 0.92), vec3(1.0, 1.0, 1.0), uGloam);
  c *= mix(shadowTint, highTint, smoothstep(0.05, 0.9, l));
  // A touch more colour.
  c = mix(vec3(l), c, 1.1 - uGloam * 0.12);
  c = max(c, 0.0);
  c = ACESFilmicToneMapping(c);
  vec2 dd = vUv - 0.5;
  float v = smoothstep(0.85, 0.25, length(dd * vec2(1.25, 1.0)));
  c *= mix(1.0 - uVignette, 1.0, v);
  c *= 1.0 - uFade;
  gl_FragColor = sRGBTransferOETF(vec4(c, 1.0));
}`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.scale = 1;
    this.opts = { ao: true, rays: true, bloom: true, smaa: true, msaa: 4, refract: true };
    this.quad = new FullScreenQuad();
    const sh = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const camU = () => ({ tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uNear: { value: 0.1 }, uFar: { value: 2000 } });
    this.aoMat = sh(AO_FRAG, { ...camU(), uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1.4 }, uTime: { value: 0 } });
    this.blurMat = sh(BLUR_FRAG, { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 2000 } });
    this.raysMat = sh(RAYS_FRAG, { tDepth: { value: null }, tColor: { value: null }, uSun: { value: new THREE.Vector2() }, uFacing: { value: 0 }, uAspect: { value: 1 } });
    this.compMat = sh(COMPOSITE_FRAG, {
      ...camU(),
      tColor: { value: null },
      tAO: { value: null },
      tRays: { value: null },
      uAO: { value: 0.85 },
      uRaysOn: { value: 1 },
      uCamPos: { value: new THREE.Vector3() },
      uToLight: { value: new THREE.Vector3(0, 1, 0) },
      uLightColor: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uScatterColor: { value: new THREE.Color() },
      uFogDensity: { value: 0.004 },
      uFogHeight: { value: 0.04 },
      uScatter: { value: 0.6 },
      uRays: { value: 0.5 },
      uGround: { value: 0 },
      uMist: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
      uMistK: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 1, 0, 0)) },
      uMistColor: { value: new THREE.Color('#dfe7e6') }
    });
    this.copyMat = sh(COPY_FRAG, { tColor: { value: null } });
    this.depthMat = sh(DEPTH_FRAG, { tDepth: { value: null }, uNear: { value: 0.1 }, uFar: { value: 2000 } });
    this.mist = [];
    this.gradeMat = sh(GRADE_FRAG, { tColor: { value: null }, uExposure: { value: 1 }, uGloam: { value: 0 }, uVignette: { value: 0.32 }, uFade: { value: 0 } });
    // It tone-maps itself: when it draws straight to the screen (no SMAA), three mustn't add its own.
    this.gradeMat.toneMapped = false;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 1.1);
    this.smaa = new SMAAPass();
    this.targets = null;
  }

  configure(opts, scale) {
    const msaaChanged = opts.msaa !== undefined && opts.msaa !== this.opts.msaa;
    const halfChanged = opts.bloomHalf !== undefined && Boolean(opts.bloomHalf) !== Boolean(this.opts.bloomHalf);
    Object.assign(this.opts, opts);
    this.scale = scale;
    if (msaaChanged) this._dispose();
    this.resize();
    if (halfChanged && this.targets) this._bloomSize();
  }

  /** Bloom's blur chain from a half-size copy on the lighter presets (a blur: the difference doesn't show). */
  _bloomSize() {
    const k = this.opts.bloomHalf ? 2 : 1;
    this.bloom.setSize(Math.max(2, Math.round(this.targets.w / k)), Math.max(2, Math.round(this.targets.h / k)));
  }

  resize() {
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(2, Math.round(size.x * this.scale));
    const h = Math.max(2, Math.round(size.y * this.scale));
    if (this.targets && this.targets.w === w && this.targets.h === h) return;
    this._dispose();
    const hdr = { type: THREE.HalfFloatType, depthBuffer: false };
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    const scene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: this.opts.msaa ?? 0, depthTexture, depthBuffer: true });
    const hw = Math.max(2, w >> 1);
    const hh = Math.max(2, h >> 1);
    this.targets = {
      w,
      h,
      scene,
      ao: new THREE.WebGLRenderTarget(hw, hh, hdr),
      aoBlur: new THREE.WebGLRenderTarget(hw, hh, hdr),
      rays: new THREE.WebGLRenderTarget(hw, hh, hdr),
      comp: new THREE.WebGLRenderTarget(w, h, hdr),
      ldr: new THREE.WebGLRenderTarget(w, h, { depthBuffer: false }),
      copy: new THREE.WebGLRenderTarget(hw, hh, hdr),
      depthLin: new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })
    };
    this._bloomSize();
    this.smaa.setSize(w, h);
  }

  _dispose() {
    if (!this.targets) return;
    for (const [k, t] of Object.entries(this.targets)) if (t?.isWebGLRenderTarget) {
      if (k === 'scene') t.depthTexture?.dispose();
      t.dispose();
    }
    this.targets = null;
  }

  /**
   * Draw the frame. `look` carries the mood: toLight, lightColor, fog…
   */
  render(scene, camera, look) {
    const r = this.renderer;
    this.resize();
    const T = this.targets;
    camera.updateMatrixWorld();
    // 1. The scene, HDR, with depth.
    r.setRenderTarget(T.scene);
    r.clear();
    r.info.autoReset = false;
    r.info.reset();
    camera.layers.set(0);
    r.render(scene, camera);
    const depth = T.scene.depthTexture;
    // The wet pass: copy the solid frame and its depth, then draw water, falls, mist and rain over it.
    this._pass(this.copyMat, T.copy, { tColor: T.scene.texture });
    this.depthMat.uniforms.tDepth.value = depth;
    this.depthMat.uniforms.uNear.value = camera.near;
    this.depthMat.uniforms.uFar.value = camera.far;
    this._pass(this.depthMat, T.depthLin);
    wet.tScene.value = T.copy.texture;
    wet.tDepthLin.value = T.depthLin.texture;
    wet.uScreen.value.set(T.w, T.h);
    wet.uRefract.value = this.opts.refract ? 1 : 0;
    r.setRenderTarget(T.scene);
    const auto = r.autoClear;
    const shadowAuto = r.shadowMap.autoUpdate;
    r.autoClear = false;
    r.shadowMap.autoUpdate = false;
    camera.layers.set(1);
    const bg = scene.background;
    scene.background = null;
    r.render(scene, camera);
    scene.background = bg;
    camera.layers.set(0);
    r.autoClear = auto;
    r.shadowMap.autoUpdate = shadowAuto;
    this.stats = { calls: r.info.render.calls, triangles: r.info.render.triangles };
    const setCam = (u) => {
      u.tDepth.value = depth;
      u.uProjInv.value.copy(camera.projectionMatrixInverse);
      u.uCamWorld.value.copy(camera.matrixWorld);
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
    };
    // 2. Ambient occlusion, half size, blurred keeping edges.
    if (this.opts.ao) {
      setCam(this.aoMat.uniforms);
      this.aoMat.uniforms.uTexel.value.set(1 / T.ao.width, 1 / T.ao.height);
      this._pass(this.aoMat, T.ao);
      const b = this.blurMat.uniforms;
      b.tDepth.value = depth;
      b.uNear.value = camera.near;
      b.uFar.value = camera.far;
      b.tAO.value = T.ao.texture;
      b.uDir.value.set(1.5 / T.ao.width, 0);
      this._pass(this.blurMat, T.aoBlur);
      b.tAO.value = T.aoBlur.texture;
      b.uDir.value.set(0, 1.5 / T.ao.height);
      this._pass(this.blurMat, T.ao);
    }
    // 3. Light shafts toward the sun's place on screen.
    const L = look.toLight;
    const sunW = camera.position.clone().addScaledVector(L, 500);
    const sp = sunW.clone().project(camera);
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    const facing = THREE.MathUtils.smoothstep(camDir.dot(L), 0.05, 0.6) * (1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(sp.x), Math.abs(sp.y)), 1.25, 2.2));
    const raysOn = this.opts.rays && facing > 0.01;
    if (raysOn) {
      const u = this.raysMat.uniforms;
      u.tDepth.value = depth;
      u.tColor.value = T.scene.texture;
      u.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
      u.uFacing.value = facing;
      u.uAspect.value = T.w / T.h;
      this._pass(this.raysMat, T.rays);
    }
    // 4. AO, fog and shafts onto the colour.
    const c = this.compMat.uniforms;
    setCam(c);
    c.tColor.value = T.scene.texture;
    c.tAO.value = T.ao.texture;
    c.tRays.value = T.rays.texture;
    c.uAO.value = this.opts.ao ? 0.9 : 0;
    c.uRaysOn.value = raysOn ? 1 : 0;
    c.uCamPos.value.copy(camera.position);
    c.uToLight.value.copy(L);
    c.uLightColor.value.copy(look.lightColor);
    c.uFogColor.value.copy(look.fogColor);
    c.uScatterColor.value.copy(look.scatterColor);
    c.uFogDensity.value = look.fogDensity;
    c.uFogHeight.value = look.fogHeight;
    c.uScatter.value = look.scatter;
    c.uRays.value = look.rays;
    c.uGround.value = look.ground ?? 0;
    for (let i = 0; i < 4; i++) {
      const m = this.mist[i];
      if (m) {
        c.uMist.value[i].set(m.x, m.y, m.z, m.r);
        c.uMistK.value[i].set(m.density * (look.mist ?? 1), m.height ?? 0.6, 0, 0);
      } else c.uMist.value[i].set(0, 0, 0, 0);
    }
    if (look.mistColor) c.uMistColor.value.copy(look.mistColor);
    this._pass(this.compMat, T.comp);
    // 5. Bloom, added onto the composite.
    if (this.opts.bloom) {
      this.bloom.strength = look.bloom ?? 0.32;
      this.bloom.render(r, null, T.comp, 0, false);
    }
    // 6. Grade and tone map, then SMAA to the screen.
    const g = this.gradeMat.uniforms;
    g.tColor.value = T.comp.texture;
    g.uExposure.value = look.exposure;
    g.uGloam.value = look.gloam ?? 0;
    g.uFade.value = look.fade ?? 0;
    if (this.opts.smaa) {
      this._pass(this.gradeMat, T.ldr);
      this.smaa.renderToScreen = true;
      this.smaa.render(r, null, T.ldr);
    } else {
      this._pass(this.gradeMat, null);
    }
  }

  _pass(material, target, set = null) {
    if (set) for (const [k, v] of Object.entries(set)) material.uniforms[k].value = v;
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }

  dispose() {
    this._dispose();
    for (const m of [this.aoMat, this.blurMat, this.raysMat, this.compMat, this.gradeMat, this.copyMat, this.depthMat]) m.dispose();
    this.bloom.dispose();
    this.smaa.dispose();
    this.quad.dispose();
  }
}
