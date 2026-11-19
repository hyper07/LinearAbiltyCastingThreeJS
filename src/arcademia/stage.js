/**
 * The renderer and its after-effects, shared by the diorama and the lesson
 * rooms: one WebGL context, a render pass for whichever scene is showing,
 * a soft bloom (strong at night, for windows, lanterns and fireflies), then
 * tone mapping and sRGB output.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Stage {
  constructor(host) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'arc-canvas';
    host.append(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.18, 0.5, 0.92);
    this.composer.addPass(this.pass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  show(scene, camera) {
    this.pass.scene = scene;
    this.pass.camera = camera;
    this.scene = scene;
    this.camera = camera;
  }

  /** 0 = day (a whisper of bloom), 1 = night (windows and lanterns glow). */
  setGlow(k) {
    // Day: no bloom (the cartoon whites would glow). Night: windows, lanterns and fireflies do.
    this.bloom.enabled = k > 0.02;
    this.bloom.strength = k * 0.8;
    this.bloom.threshold = 0.82;
    this.bloom.radius = 0.55;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.bloom.resolution.set((w * pr) / 2, (h * pr) / 2);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
