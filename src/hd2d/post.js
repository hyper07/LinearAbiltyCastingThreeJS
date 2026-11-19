/**
 * Lanternwood's look after the render: bloom on the flames, then a cheap
 * tilt-shift (blur that grows toward the top of the screen, a little at the
 * very bottom), a vignette and a warm-and-teal grade — and, for a moment on
 * a critical hit or a boss falling, a pulse: a touch of colour fringing at
 * the edges and a lift of light (the game turns it off for reduced motion).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TiltShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uDir: { value: new THREE.Vector2(1, 0) },
    uStrength: { value: 1 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform vec2 uDir; uniform float uStrength;
varying vec2 vUv;
void main() {
  // Blur radius: none in the middle band, growing toward the top (far away), a touch at the bottom.
  float r = smoothstep(0.58, 1.0, vUv.y) * 5.0 + smoothstep(0.1, 0.0, vUv.y) * 2.0;
  r *= uStrength;
  vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
  vec2 o1 = uDir * uTexel * 1.3846153846 * r;
  vec2 o2 = uDir * uTexel * 3.2307692308 * r;
  c += texture2D(tDiffuse, vUv + o1) * 0.3162162162;
  c += texture2D(tDiffuse, vUv - o1) * 0.3162162162;
  c += texture2D(tDiffuse, vUv + o2) * 0.0702702703;
  c += texture2D(tDiffuse, vUv - o2) * 0.0702702703;
  gl_FragColor = c;
}`
};

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uHurt: { value: 0 }, uFade: { value: 0 }, uPulse: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uHurt; uniform float uFade; uniform float uPulse;
varying vec2 vUv;
void main() {
  vec3 c;
  if (uPulse > 0.001) {
    // Colour fringing, strongest toward the edges.
    vec2 off = (vUv - 0.5) * 0.012 * uPulse;
    c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
    c += c * 0.12 * uPulse;
  } else c = texture2D(tDiffuse, vUv).rgb;
  // Lift the shadows toward deep blue, warm the highlights a touch.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, c * vec3(1.06, 1.0, 0.92), smoothstep(0.35, 0.9, l));
  c += vec3(0.008, 0.012, 0.03) * (1.0 - l);
  // Vignette.
  vec2 d = vUv - 0.5;
  float v = smoothstep(0.95, 0.32, length(d * vec2(1.15, 1.0)));
  c *= mix(0.55, 1.0, v);
  // Hurt: a red edge.
  c = mix(c, vec3(0.7, 0.05, 0.05), uHurt * (1.0 - v) * 0.8);
  c *= 1.0 - uFade;
  gl_FragColor = vec4(c, 1.0);
}`
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const ratio = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.x * ratio, size.y * ratio, { type: THREE.HalfFloatType, samples: ratio < 1.5 ? 4 : 0 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(size.x, size.y);
    this.render = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.5, 1.0);
    this.output = new OutputPass();
    this.tiltH = new ShaderPass(TiltShader);
    this.tiltV = new ShaderPass(TiltShader);
    this.tiltV.uniforms.uDir.value.set(0, 1);
    this.grade = new ShaderPass(GradeShader);
    for (const p of [this.render, this.bloom, this.output, this.tiltH, this.tiltV, this.grade]) this.composer.addPass(p);
    this.setSize(size.x, size.y);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    const r = this.renderer.getPixelRatio();
    for (const p of [this.tiltH, this.tiltV]) p.uniforms.uTexel.value.set(1 / (w * r), 1 / (h * r));
    this.bloom.resolution.set(w, h);
  }

  set hurt(v) {
    this.grade.uniforms.uHurt.value = v;
  }

  set pulse(v) {
    this.grade.uniforms.uPulse.value = v;
  }

  set fade(v) {
    this.grade.uniforms.uFade.value = v;
  }

  draw() {
    this.composer.render();
  }

  dispose() {
    this.bloom.dispose();
    for (const p of [this.tiltH, this.tiltV, this.grade]) p.material.dispose();
    this.output.dispose?.();
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.composer.dispose?.();
  }
}
