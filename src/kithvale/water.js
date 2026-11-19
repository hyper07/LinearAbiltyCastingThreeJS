/**
 * The Pebblerun and Mirror Pond, drawn in the second ("wet") pass so they
 * can read the solid frame beneath them (post.js `wet`): the stream a
 * ribbon down its bed at its water line, flowing; the pond a still sheet.
 * Painted water: clear and tinted where shallow (you see the pebbles), a
 * deep teal where deep, the sky's colours in it at a glance, a soft white
 * line of foam where it meets the bank, ripples that run with the current,
 * and the low sun's glitter.
 */
import * as THREE from 'three';
import { STREAM, POND, pointAt } from './map.js';
import { streamLevel, streamHalf, pondLevel } from './heights.js';
import { wet } from './post.js';

const VERT = /* glsl */ `
attribute vec2 aFlow;
varying vec3 vW;
varying vec2 vFlow;
varying float vViewZ;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vFlow = aFlow;
  vec4 mv = viewMatrix * w;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tDepthLin;
uniform sampler2D tNoise;
uniform vec2 uScreen;
uniform float uRefract;
uniform float uTime;
uniform vec3 uSkyLo;
uniform vec3 uSkyHi;
uniform vec3 uToLight;
uniform vec3 uSunCol;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFog;
uniform float uFogD;
varying vec3 vW;
varying vec2 vFlow;
varying float vViewZ;
void main() {
  vec2 suv = gl_FragCoord.xy / uScreen;
  float speed = length(vFlow);
  vec2 uvA = vW.xz * 0.22 - vFlow * uTime * 0.35;
  vec2 uvB = vW.xz * 0.53 + vec2(0.31, 0.17) - vFlow * uTime * 0.6;
  float n1 = texture2D(tNoise, uvA).g;
  float n2 = texture2D(tNoise, uvB).b;
  float n3 = texture2D(tNoise, vW.xz * 0.05 + uTime * 0.004).r;
  vec2 slope = vec2(n1 - 0.5, n2 - 0.5) * (0.35 + speed * 0.5) + (n3 - 0.5) * 0.15;
  vec3 N = normalize(vec3(slope.x, 1.0, slope.y));
  vec3 V = normalize(cameraPosition - vW);
  float sceneZ = texture2D(tDepthLin, suv + slope * 0.01 * uRefract).r;
  float depth = max(sceneZ - vViewZ, 0.0) * max(V.y, 0.25);
  vec3 under = texture2D(tScene, suv + slope * 0.025 * uRefract * smoothstep(0.0, 0.6, depth)).rgb;
  vec3 body = mix(under * uShallow, uDeep, smoothstep(0.05, 1.1, depth));
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  // Painted reflections: the sky's cooler blue-lavender, in a few soft bands — not a mirror.
  vec3 sky = mix(uSkyHi * 0.62, mix(uSkyHi, uSkyLo, 0.4) * 0.8, smoothstep(0.62, 0.78, n3));
  vec3 col = mix(body, sky, clamp(fres * 0.45 + 0.04, 0.0, 0.36));
  vec3 H = normalize(uToLight + V);
  float sp = pow(max(dot(N, H), 0.0), 180.0);
  col += uSunCol * smoothstep(0.25, 0.5, sp) * 1.4;
  // Foam where it is shallow at the bank, broken by the ripples; streaks on the current.
  float foam = smoothstep(0.22, 0.02, depth + (n1 - 0.5) * 0.18);
  float streak = smoothstep(0.62, 0.72, texture2D(tNoise, vW.xz * vec2(0.6, 0.6) * 0.5 - vFlow * uTime * 0.9).g) * speed * 0.5;
  vec3 foamC = mix(uSkyHi, vec3(1.0, 0.98, 0.94), 0.6) * (0.6 + uSunCol * 0.12);
  col = mix(col, foamC, clamp(foam * 0.5 + streak * 0.22, 0.0, 0.6));
  // The same haze as the land.
  float fog = 1.0 - exp(-uFogD * length(cameraPosition - vW));
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, smoothstep(0.0, 0.05, depth) * 0.98 + 0.02);
}`;

export class Waters {
  constructor(noise) {
    this.uniforms = {
      tScene: wet.tScene,
      tDepthLin: wet.tDepthLin,
      uScreen: wet.uScreen,
      uRefract: wet.uRefract,
      tNoise: { value: noise },
      uTime: { value: 0 },
      uSkyLo: { value: new THREE.Color('#f0c4a0') },
      uSkyHi: { value: new THREE.Color('#a8a0d0') },
      uToLight: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color(1, 0.9, 0.7) },
      uDeep: { value: new THREE.Color('#2a5a64') },
      uShallow: { value: new THREE.Color('#6e9a9e') },
      uFog: { value: new THREE.Color() },
      uFogD: { value: 0.002 }
    };
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
    this.group = new THREE.Group();
    this.stream = new THREE.Mesh(this.streamGeometry(), this.material);
    this.pond = new THREE.Mesh(this.pondGeometry(), this.material);
    for (const m of [this.stream, this.pond]) {
      m.layers.set(1);
      m.frustumCulled = false;
      m.renderOrder = 5;
      this.group.add(m);
    }
  }

  streamGeometry() {
    const pos = [];
    const flow = [];
    const idx = [];
    const step = 1;
    let rows = 0;
    for (let s = 0; s <= STREAM.len; s += step) {
      const p = pointAt(STREAM, s);
      const half = streamHalf(s) + 1.0;
      const y = streamLevel(s);
      const nx = Math.cos(p.yaw);
      const nz = -Math.sin(p.yaw);
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const sp = 0.6 + Math.min(0.8, Math.max(0, (streamLevel(Math.max(0, s - 4)) - streamLevel(Math.min(STREAM.len, s + 4))) * 0.8));
      for (let k = -2; k <= 2; k++) {
        const f = k / 2;
        pos.push(p.x + nx * half * f, y, p.z + nz * half * f);
        flow.push(fx * sp, fz * sp);
      }
      rows++;
    }
    for (let r = 0; r < rows - 1; r++) for (let k = 0; k < 4; k++) {
      const a = r * 5 + k;
      idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
    g.setIndex(idx);
    return g;
  }

  pondGeometry() {
    const g = new THREE.CircleGeometry(POND.r * 1.32, 64);
    g.rotateX(-Math.PI / 2);
    g.translate(POND.x, pondLevel(), POND.z);
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2).fill(0.02), 2));
    return g;
  }

  update(t, mood) {
    const u = this.uniforms;
    u.uTime.value = t;
    u.uSkyLo.value.copy(mood.hor);
    u.uSkyHi.value.copy(mood.mid);
    u.uToLight.value.copy(mood.toLight);
    u.uSunCol.value.copy(mood.sun).multiplyScalar(mood.night ? 0.3 : 1);
    u.uFog.value.copy(mood.fog);
    u.uFogD.value = mood.fogD;
    u.uDeep.value.setRGB(0.1, 0.24, 0.28).lerp(mood.hemiG, 0.12);
  }

  dispose() {
    this.stream.geometry.dispose();
    this.pond.geometry.dispose();
    this.material.dispose();
  }
}
