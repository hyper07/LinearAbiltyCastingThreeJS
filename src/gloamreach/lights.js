/**
 * Lanterns, lamps, windows and the forge as light: every emitter on the map
 * is listed, but only a fixed handful of real point lights exist (the
 * quality tier sets how many) — each frame they move to the emitters nearest
 * the hero, fading in and out so nothing pops. Every emitter also gets a
 * soft glow billboard (drawn in one call), which is what reads from afar.
 */
import * as THREE from 'three';

export class LightPool {
  constructor(scene, count = 8) {
    this.scene = scene;
    this.emitters = [];
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 14, 2);
      l.castShadow = false;
      scene.add(l);
      this.lights.push({ light: l, emitter: null, k: 0 });
    }
  }

  /** An emitter: where, its colour, how bright, how far, how much it flickers. */
  add(pos, { color = '#ffb060', intensity = 6, distance = 14, flicker = 0.15, glow = 1, glowSize = 1.4 } = {}) {
    const e = { pos: pos.clone(), color: new THREE.Color(color), intensity, distance, flicker, glow, glowSize, phase: Math.random() * 100 };
    this.emitters.push(e);
    return e;
  }

  setCount(n) {
    while (this.lights.length > n) {
      const l = this.lights.pop();
      this.scene.remove(l.light);
      l.light.dispose();
    }
    while (this.lights.length < n) {
      const l = new THREE.PointLight(0xffaa55, 0, 14, 2);
      this.scene.add(l);
      this.lights.push({ light: l, emitter: null, k: 0 });
    }
  }

  /** Brightness of an emitter now (flicker). */
  level(e, t) {
    const f = e.flicker;
    return e.intensity * (1 - f + f * (0.6 * Math.sin(t * 9.1 + e.phase) * Math.sin(t * 3.7 + e.phase * 2.1) + 0.4 + 0.3 * Math.sin(t * 17.3 + e.phase)));
  }

  update(focus, t, dt) {
    // The nearest emitters want a light.
    const ranked = this.emitters
      .map((e) => ({ e, d: e.pos.distanceToSquared(focus) }))
      .filter((x) => x.d < 60 * 60)
      .sort((a, b) => a.d - b.d)
      .slice(0, this.lights.length)
      .map((x) => x.e);
    const wanted = new Set(ranked);
    for (const slot of this.lights) {
      if (slot.emitter && !wanted.has(slot.emitter)) slot.k = Math.max(0, slot.k - dt * 3);
      if (slot.emitter && wanted.has(slot.emitter)) {
        wanted.delete(slot.emitter);
        slot.k = Math.min(1, slot.k + dt * 3);
      }
      if (slot.k <= 0) slot.emitter = null;
    }
    for (const slot of this.lights) {
      if (!slot.emitter && wanted.size) {
        const e = wanted.values().next().value;
        wanted.delete(e);
        slot.emitter = e;
        slot.k = 0;
      }
      const l = slot.light;
      if (!slot.emitter) {
        l.intensity = 0;
        l.visible = false;
        continue;
      }
      const e = slot.emitter;
      l.visible = true;
      l.position.copy(e.pos);
      l.color.copy(e.color);
      l.distance = e.distance;
      l.intensity = this.level(e, t) * slot.k;
    }
  }

  dispose() {
    for (const s of this.lights) {
      this.scene.remove(s.light);
      s.light.dispose();
    }
  }
}

const GLOW_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aCol;
attribute float aSize;
uniform float uTime;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = uv;
  float flick = 0.85 + 0.15 * sin(uTime * 7.0 + aPos.x * 3.1 + aPos.z * 1.7);
  vCol = vec4(aCol.rgb * flick, aCol.a);
  vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
  // Pull toward the camera a little so it isn't cut by the lamp's own glass.
  mv.xyz += normalize(-mv.xyz) * 0.25;
  mv.xy += position.xy * aSize;
  gl_Position = projectionMatrix * mv;
}`;

const GLOW_FRAG = /* glsl */ `
uniform sampler2D tGlow;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float a = texture2D(tGlow, vUv).a;
  gl_FragColor = vec4(vCol.rgb * a * vCol.a, 0.0);
}`;

/** Glow billboards for a list of emitters, additive, in one draw. */
export function glowSprites(emitters, glowTex) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  g.setAttribute('uv', quad.attributes.uv);
  const n = emitters.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 4);
  const size = new Float32Array(n);
  emitters.forEach((e, i) => {
    pos.set([e.pos.x, e.pos.y, e.pos.z], i * 3);
    col.set([e.color.r * e.glow, e.color.g * e.glow, e.color.b * e.glow, 1], i * 4);
    size[i] = e.glowSize;
  });
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 4));
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tGlow: { value: glowTex }, uTime: { value: 0 } },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return mesh;
}
