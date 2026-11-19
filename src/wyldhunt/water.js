/**
 * Mistfall Gorge's water and the air round it, all drawn in the wet pass
 * (layer 1) over a copy of the solid frame and its depth:
 *
 *  - the river, its pools and streams: flowing ripples that run with the
 *    current (faster in the gorge and down the Stair of Roots), what lies
 *    under it bent and darkened by how deep it is, foam where it meets the
 *    banks, the stones and the falls, the sky and the sun glinting off it;
 *  - the three falls: sheets that hug the cliff from the lip to the pool,
 *    torn into strands that race down, a curl of white at the top, and a
 *    boil of foam where they land;
 *  - mist: big soft cards rolling up off each plunge pool and drifting,
 *    fading where they touch rock or water (no hard edges); spray thrown
 *    out in arcs; and shafts of sunlight slanting through the haze.
 *
 * All motion is on the GPU: the CPU only moves time.
 */
import * as THREE from 'three';
import { RIVER, STREAMS, FALLS, pointAt } from './map.js';
import { heightAt, riverLevel, poolLevel } from './heights.js';
import { riverHalfWidth } from './map.js';
import { wet } from './post.js';
import { shared } from '../gloamreach/materials.js';

const WET_LAYER = 1;

/** Put a mesh in the wet pass (drawn after the solid world). */
export function toWet(obj) {
  obj.traverse((o) => o.layers.set(WET_LAYER));
  return obj;
}

/* ------------------------------------------------------------------ shared shader bits */

const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uHemiSky;
uniform vec3 uHemiGround;
uniform float uRainK;
vec3 skyRefl(vec3 r) {
  // What the water mirrors: sky above, the green walls round the horizon.
  vec3 sky = mix(vec3(0.75, 0.82, 0.84), vec3(0.32, 0.46, 0.62), smoothstep(0.1, 0.8, r.y));
  sky = mix(sky, vec3(0.55, 0.6, 0.6), uRainK * 0.7);
  vec3 walls = vec3(0.16, 0.2, 0.15);
  return mix(walls, sky, smoothstep(0.18, 0.55, r.y));
}
`;

export const waterUniforms = {
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunCol: { value: new THREE.Color(1, 1, 1) },
  uHemiSky: { value: new THREE.Color(0.7, 0.8, 0.9) },
  uHemiGround: { value: new THREE.Color(0.2, 0.25, 0.15) },
  uRainK: { value: 0 },
  uImpacts: { value: [0, 1, 2].map(() => new THREE.Vector4(0, -999, 0, 0)) }
};

/* ------------------------------------------------------------------ the river */

const WATER_VERT = /* glsl */ `
attribute vec2 aFlow;   // speed (m/s), foaminess
attribute vec2 aDir;    // flow direction (xz)
varying vec2 vUv;
varying vec2 vFlow;
varying vec2 vDir;
varying vec3 vW;
varying float vViewZ;
void main() {
  vUv = uv;
  vFlow = aFlow;
  vDir = aDir;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mv = viewMatrix * w;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const WATER_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tDepthLin;
uniform vec2 uScreen;
uniform float uRefract;
uniform sampler2D tRipple;
uniform sampler2D tNoise;
uniform float uTime;
uniform vec4 uImpacts[3];
${SKY_GLSL}
varying vec2 vUv;
varying vec2 vFlow;
varying vec2 vDir;
varying vec3 vW;
varying float vViewZ;

vec3 ripple(vec2 p) { return texture2D(tRipple, p).xyz * 2.0 - 1.0; }

void main() {
  vec2 dir = normalize(vDir + 1e-5);
  vec2 side = vec2(-dir.y, dir.x);
  // Flow: two layers of ripples carried downstream, crossfaded so they never stretch.
  float sp = vFlow.x;
  vec2 p = vec2(dot(vW.xz, side), dot(vW.xz, dir));
  float ph = uTime * 0.25;
  float f0 = fract(ph);
  float f1 = fract(ph + 0.5);
  vec2 off0 = vec2(0.0, -f0 * sp * 4.0);
  vec2 off1 = vec2(0.0, -f1 * sp * 4.0);
  float k = abs(f0 * 2.0 - 1.0);
  vec3 nA = ripple((p + off0) * vec2(0.22, 0.11)) * 0.6 + ripple((p + off0 * 1.3) * 0.5 + 0.3) * 0.4;
  vec3 nB = ripple((p + off1) * vec2(0.22, 0.11) + 0.5) * 0.6 + ripple((p + off1 * 1.3) * 0.5 + 0.8) * 0.4;
  vec3 nt = mix(nA, nB, k);
  float rough = 0.35 + min(sp, 4.0) * 0.18 + uRainK * 0.25;
  vec3 n = normalize(vec3((nt.x * dir.y + nt.y * side.y) * 0.0 + nt.x, 1.0 / rough, nt.y));
  // Rain rings.
  if (uRainK > 0.05) {
    vec2 cell = floor(vW.xz * 1.5);
    vec2 fr = fract(vW.xz * 1.5) - 0.5;
    float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float t = fract(uTime * 0.9 + h);
    float ring = sin((length(fr) - t * 0.5) * 40.0) * smoothstep(0.5, 0.0, abs(length(fr) - t * 0.5) * 6.0) * (1.0 - t);
    n.xz += fr * ring * 0.6 * uRainK;
    n = normalize(n);
  }
  vec3 V = normalize(cameraPosition - vW);
  vec2 suv = gl_FragCoord.xy / uScreen;
  float sceneZ = texture2D(tDepthLin, suv).r;
  float thick = max(sceneZ - vViewZ, 0.0);
  // How far down the eye looks through the water to the bed.
  float depthW = thick * max(V.y, 0.15);
  vec2 ruv = suv + n.xz * 0.035 * clamp(depthW, 0.0, 1.0) / max(vViewZ * 0.08, 1.0);
  float rz = texture2D(tDepthLin, ruv).r;
  if (rz < vViewZ) ruv = suv;
  vec3 under = texture2D(tScene, ruv).rgb;
  vec3 deep = mix(vec3(0.008, 0.03, 0.028), vec3(0.02, 0.04, 0.04), uRainK);
  float absorb = 1.0 - exp(-depthW * 2.2);
  vec3 bed = under * exp(-depthW * vec3(1.4, 0.55, 0.5));
  vec3 refr = uRefract > 0.5 ? mix(bed, deep, absorb * 0.8) : deep * (0.7 + 0.6 * (1.0 - absorb));
  // Silt in the shallows, lit from above.
  refr += vec3(0.05, 0.07, 0.04) * (1.0 - absorb) * (uHemiSky.g * 0.4);
  // Reflection: the sky and the walls, the sun's glint.
  vec3 R = reflect(-V, n);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 refl = skyRefl(R) * (0.55 + uHemiSky * 0.3);
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(n, H), 0.0), 220.0 / (1.0 + sp * 0.8)) * 6.0 * (1.0 - uRainK * 0.8);
  vec3 col = mix(refr, refl, F) + uSunCol * spec;
  // Foam: at the banks, round stones, over the rapids and where the falls land.
  float fn = texture2D(tNoise, (p + off0 * 1.2) * vec2(0.18, 0.07)).g * (1.0 - k) + texture2D(tNoise, (p + off1 * 1.2) * vec2(0.18, 0.07) + 0.37).g * k;
  float fine = texture2D(tNoise, (p + off0 * 1.6) * 0.6).b;
  float shore = smoothstep(0.2, 0.0, thick * max(V.y, 0.3)) * smoothstep(0.45, 0.75, fn + fine * 0.35);
  float rapids = vFlow.y * smoothstep(0.42, 0.72, fn * 0.7 + fine * 0.5);
  float impact = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 im = uImpacts[i];
    float d = length(vW.xz - im.xz) / max(im.w, 0.1);
    impact = max(impact, smoothstep(1.0, 0.15, d) * smoothstep(0.3, 0.7, fn + fine * 0.5 + (1.0 - d) * 0.4));
  }
  float foam = clamp(max(max(shore, rapids), impact), 0.0, 1.0);
  vec3 lit = uHemiSky * 0.9 + uSunCol * max(uSunDir.y, 0.0) * 0.55;
  col = mix(col, lit * 0.92, foam * 0.92);
  float alpha = smoothstep(0.0, 0.08, thick);
  gl_FragColor = vec4(col, alpha);
}`;

function waterMaterial(bank) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...waterUniforms,
      tScene: wet.tScene,
      tDepthLin: wet.tDepthLin,
      uScreen: wet.uScreen,
      uRefract: wet.uRefract,
      tRipple: { value: bank.ripples(4, 256) },
      tNoise: { value: bank.noise() },
      uTime: shared.uTime
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: true
  });
  return m;
}

/** A ribbon down a sampled line: width and height from functions of distance along it. */
function ribbon(line, { half, level, speed, foam, across = 8, step = 2, start = 0, end = line.len }) {
  const rows = [];
  for (let s = start; s <= end + 1e-6; s += step) rows.push(Math.min(s, end));
  const pos = [];
  const uv = [];
  const flow = [];
  const dir = [];
  const idx = [];
  for (const s of rows) {
    const p = pointAt(line, s);
    const nx = Math.cos(p.yaw);
    const nz = -Math.sin(p.yaw);
    const w = half(s);
    const y = level(s);
    for (let i = 0; i <= across; i++) {
      const u = i / across;
      const o = (u - 0.5) * 2 * w;
      pos.push(p.x + nx * o, y, p.z + nz * o);
      uv.push(u, s);
      flow.push(speed(s), foam(s));
      dir.push(Math.sin(p.yaw), Math.cos(p.yaw));
    }
  }
  const cols = across + 1;
  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < across; i++) {
      const a = r * cols + i;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** A pool: a disc whose ripples spread out from where its fall lands. */
function poolGeometry(fl, foot) {
  const r = fl.pool.r * 1.35;
  const g = new THREE.CircleGeometry(r, 64, 0, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const flow = [];
  const dir = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + fl.pool.x;
    const z = p.getZ(i) + fl.pool.z;
    const dx = x - foot.x;
    const dz = z - foot.z;
    const d = Math.hypot(dx, dz) || 1;
    flow.push(Math.max(0.15, 1.6 - d / r), Math.max(0, 0.6 - d / (r * 1.4)));
    dir.push(dx / d, dz / d);
  }
  g.translate(fl.pool.x, poolLevel(fl), fl.pool.z);
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 2));
  return g;
}

/* ------------------------------------------------------------------ the falls */

/** Walk from a pool toward its wall: where the cliff's foot is, and its lip. */
export function findFace(fl) {
  const dx = Math.sin(fl.wall);
  const dz = Math.cos(fl.wall);
  const base = poolLevel(fl);
  let foot = null;
  let top = null;
  let prev = heightAt(fl.pool.x, fl.pool.z);
  let best = -Infinity;
  let flat = 0;
  for (let k = 0; k < 160; k += 0.5) {
    const x = fl.pool.x + dx * k;
    const z = fl.pool.z + dz * k;
    const h = heightAt(x, z);
    if (!foot && h > base + 3) foot = { x, z, k, h };
    if (foot) {
      if (h > best + 0.25) {
        best = h;
        top = { x, z, k, h };
        flat = 0;
      } else if ((flat += 0.5) > 10) break;
    }
    prev = h;
  }
  void prev;
  return { dx, dz, foot, top, base };
}

/** The sheet: rows from the lip to the pool, each column hugging the face, arcing out a little. */
function fallGeometry(fl, face) {
  const { dx, dz, base, foot, top } = face;
  const H = top.h - base;
  const rows = 46;
  const cols = 24;
  const lx = dz;
  const lz = -dx;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let c = 0; c <= cols; c++) {
    const u = c / cols;
    // Narrower at the lip than at the foot (the water spreads as it falls).
    const lat0 = (u - 0.5) * fl.width * 0.72;
    const lat1 = (u - 0.5) * fl.width;
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const y = top.h + 0.6 - (H + 1.2) * t;
      const lat = lat0 + (lat1 - lat0) * Math.sqrt(t);
      // Find where the cliff is at this height in this column (binary search along the wall line).
      let a = 0;
      let b = top.k + 4;
      const ox = fl.pool.x + lx * lat;
      const oz = fl.pool.z + lz * lat;
      for (let i = 0; i < 22; i++) {
        const m = (a + b) / 2;
        if (heightAt(ox + dx * m, oz + dz * m) > y) b = m;
        else a = m;
      }
      const k = Math.min(a, top.k) - (1.2 + 4.5 * Math.sqrt(t) * (1 - t * 0.6)) - (t > 0.92 ? (t - 0.92) * 20 : 0);
      pos.push(ox + dx * k, y, oz + dz * k);
      uv.push(u, t);
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const a = c * (rows + 1) + r;
      idx.push(a, a + rows + 1, a + 1, a + 1, a + rows + 1, a + rows + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  void foot;
  return g;
}

const FALL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying float vViewZ;
uniform float uLayer;
void main() {
  vUv = uv;
  vec3 p = position + normal * uLayer * (0.6 + uv.y * 1.8);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * w;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FALL_FRAG = /* glsl */ `
uniform sampler2D tNoise;
uniform sampler2D tDepthLin;
uniform vec2 uScreen;
uniform float uTime;
uniform float uHeight;
uniform float uWidth;
uniform float uLayer;
uniform float uSeed;
${SKY_GLSL}
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying float vViewZ;
void main() {
  float t = vUv.y;
  float u = vUv.x;
  // Strands: noise stretched down the fall, racing down (faster lower, as water accelerates).
  float fallV = uTime * (0.55 + uLayer * 0.15);
  float vv = t * uHeight / 60.0;
  float sx = u * uWidth / 9.0 + uSeed;
  float s1 = texture2D(tNoise, vec2(sx, vv * 0.5 - fallV)).r;
  float s2 = texture2D(tNoise, vec2(sx * 2.3 + 0.4, vv * 0.9 - fallV * 1.7)).g;
  float s3 = texture2D(tNoise, vec2(sx * 5.1 + 0.7, vv * 2.4 - fallV * 2.6)).b;
  float body = s1 * 0.55 + s2 * 0.3 + s3 * 0.25;
  // Thinner and torn at the sides; whole at the lip; dissolving into spray at the foot.
  float edge = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
  float a = smoothstep(0.4 - edge * 0.2, 0.72, body + edge * 0.12);
  a *= smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.86, 1.0, t) * 0.85);
  a *= uLayer > 0.5 ? 0.4 : 0.88;
  a = max(a, (uLayer > 0.5 ? 0.0 : 0.22) * edge * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.9, 1.0, t)));
  // Soft against the rock behind.
  vec2 suv = gl_FragCoord.xy / uScreen;
  float sceneZ = texture2D(tDepthLin, suv).r;
  a *= smoothstep(0.0, 1.2, sceneZ - vViewZ);
  // White where it churns, a glassy green-grey where it runs thin; lit by the sky and the sun.
  float churn = smoothstep(0.45, 0.85, body) + smoothstep(0.08, 0.0, t) * 0.8 + smoothstep(0.75, 1.0, t) * 0.5;
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  float sunLit = max(dot(N, uSunDir), 0.0) * 0.6 + 0.4;
  float through = pow(max(dot(-V, uSunDir), 0.0), 3.0) * 0.6;
  vec3 light = uHemiSky * 1.05 + uSunCol * (sunLit * 0.75 + through) * (1.0 - uRainK * 0.6);
  vec3 glass = vec3(0.2, 0.28, 0.27);
  vec3 col = mix(glass, vec3(1.0), clamp(churn, 0.0, 1.0)) * light;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

/* ------------------------------------------------------------------ mist, spray and shafts */

const MIST_VERT = /* glsl */ `
attribute vec4 aSeed;     // random 0..1 ×4
attribute vec4 aSource;   // x, y, z of the pool's foot, radius
attribute vec4 aKind;     // 0 mist / 1 spray, height of the fall, rise speed, size
uniform float uTime;
uniform vec2 uWind;
varying vec2 vUv;
varying float vAlpha;
varying float vViewZ;
varying float vKind;
varying vec3 vW;
void main() {
  vUv = uv;
  vKind = aKind.x;
  float life = aKind.x > 0.5 ? 1.6 + aSeed.w * 1.2 : 9.0 + aSeed.w * 8.0;
  float t = fract(uTime / life + aSeed.x);
  vec3 c;
  float size;
  if (aKind.x < 0.5) {
    // Mist: boils up off the pool, spreads, rises and drifts with the wind, fading in and out.
    float ang = aSeed.y * 6.2831;
    float rad = aSource.w * (0.15 + aSeed.z * 0.85) * (0.6 + t * 0.9);
    c = aSource.xyz + vec3(cos(ang) * rad, 0.5 + t * aKind.y * aKind.z * (0.3 + aSeed.z * 0.7), sin(ang) * rad);
    c.xz += uWind * t * 10.0;
    size = aKind.w * (0.6 + t * 1.1) * (0.7 + aSeed.y * 0.6);
    vAlpha = smoothstep(0.0, 0.2, t) * smoothstep(1.0, 0.55, t);
  } else {
    // Spray: flung out of the impact in arcs and falling back.
    float ang = aSeed.y * 6.2831;
    float v = 5.0 + aSeed.z * 7.0;
    vec3 vel = vec3(cos(ang) * v * 0.7, v * (0.6 + aSeed.w * 0.8), sin(ang) * v * 0.7);
    float tt = t * life;
    c = aSource.xyz + vec3(cos(ang), 0.0, sin(ang)) * aSource.w * 0.25 * aSeed.z + vel * tt + vec3(0.0, -4.9, 0.0) * tt * tt;
    size = aKind.w * (0.5 + aSeed.w);
    vAlpha = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.6, t);
  }
  vec4 mv = viewMatrix * vec4(c, 1.0);
  // Face the camera.
  mv.xy += (uv - 0.5) * size;
  vViewZ = -mv.z;
  vW = c;
  // Fade cards right at the eye (no blot on the lens).
  vAlpha *= smoothstep(1.5, size * 0.9 + 2.0, vViewZ);
  gl_Position = projectionMatrix * mv;
}`;

const MIST_FRAG = /* glsl */ `
uniform sampler2D tPuff;
uniform sampler2D tDepthLin;
uniform vec2 uScreen;
uniform float uDensity;
${SKY_GLSL}
varying vec2 vUv;
varying float vAlpha;
varying float vViewZ;
varying float vKind;
varying vec3 vW;
void main() {
  float a = texture2D(tPuff, vUv).a * vAlpha;
  vec2 suv = gl_FragCoord.xy / uScreen;
  float sceneZ = texture2D(tDepthLin, suv).r;
  // Soft: fade as the card nears whatever is behind it.
  a *= smoothstep(0.0, vKind > 0.5 ? 0.3 : 4.0, sceneZ - vViewZ);
  vec3 V = normalize(cameraPosition - vW);
  float fwd = pow(max(dot(-V, uSunDir), 0.0), 4.0);
  vec3 col = uHemiSky * 1.05 + uSunCol * (0.45 + fwd * 1.4) * (1.0 - uRainK * 0.6);
  a *= vKind > 0.5 ? 0.8 : 0.32 * uDensity;
  gl_FragColor = vec4(col, a);
}`;

/** Shafts of sunlight: long soft quads leaning along the light, turned to face the eye about their axis. */
const SHAFT_VERT = /* glsl */ `
attribute vec4 aShaft;  // x, z of the foot, length, width
attribute vec2 aSeed;
uniform vec3 uSunDir;
uniform float uTime;
varying vec2 vUv;
varying float vViewZ;
varying float vSeed;
varying float vSide;
void main() {
  vUv = uv;
  vSeed = aSeed.x;
  vec3 axis = normalize(uSunDir);
  vec3 foot = vec3(aShaft.x, aSeed.y, aShaft.y);
  vec3 mid = foot + axis * aShaft.z * uv.y;
  vec3 toEye = normalize(cameraPosition - mid);
  vec3 side = normalize(cross(axis, toEye));
  // Seen end-on, a shaft would be a hard line: fade it out.
  vSide = smoothstep(0.92, 0.6, abs(dot(axis, toEye)));
  vec3 p = mid + side * (uv.x - 0.5) * aShaft.w * (0.7 + uv.y * 0.6);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const SHAFT_FRAG = /* glsl */ `
uniform sampler2D tNoise;
uniform sampler2D tDepthLin;
uniform vec2 uScreen;
uniform float uTime;
uniform float uStrength;
uniform vec3 uSunCol;
varying vec2 vUv;
varying float vViewZ;
varying float vSeed;
varying float vSide;
void main() {
  float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
  float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  float n = texture2D(tNoise, vec2(vUv.x * 2.0 + vSeed * 7.0, vUv.y * 0.3 - uTime * 0.01)).r;
  float flick = 0.65 + 0.35 * sin(uTime * 0.21 + vSeed * 40.0);
  float a = across * across * along * (0.5 + n * 0.8) * flick * vSide;
  vec2 suv = gl_FragCoord.xy / uScreen;
  float sceneZ = texture2D(tDepthLin, suv).r;
  a *= smoothstep(0.0, 6.0, sceneZ - vViewZ) * smoothstep(3.0, 18.0, vViewZ);
  gl_FragColor = vec4(uSunCol * a * uStrength, 1.0);
}`;

export class Waters {
  /** `keep(x, z)`: the zone being built (only its stretch of river, its falls and pools are made). */
  constructor(bank, settings, keep = () => true) {
    this.group = new THREE.Group();
    this.bank = bank;
    this.mats = [];
    this.keep = keep;
    this.falls = FALLS.filter((fl) => keep(fl.pool.x, fl.pool.z));
    this.faces = FALLS.map((fl) => (this.falls.includes(fl) ? findFace(fl) : {}));
    // The river's stretch inside the zone (a little past its edge, so it runs off the map).
    let s0 = Infinity;
    let s1 = -Infinity;
    for (let s = 0; s <= RIVER.len; s += 4) {
      const p = pointAt(RIVER, s);
      if (keep(p.x, p.z)) {
        s0 = Math.min(s0, s);
        s1 = Math.max(s1, s);
      }
    }
    const span = s0 <= s1 ? { start: Math.max(0, s0 - 20), end: Math.min(RIVER.len, s1 + 20) } : null;
    const noise = bank.noise();
    // River.
    const mat = waterMaterial(bank);
    this.mats.push(mat);
    const river = new THREE.Mesh(
      ribbon(RIVER, {
        ...(span ?? { start: 0, end: 0 }),
        half: (s) => riverHalfWidth(s) + 3.2,
        level: (s) => riverLevel(s),
        speed: (s) => 0.6 + 2.6 * Math.max(0, Math.min(1, (riverLevel(Math.max(0, s - 6)) - riverLevel(s + 6)) / 1.2)),
        foam: (s) => Math.min(1, Math.max(0, (riverLevel(Math.max(0, s - 6)) - riverLevel(s + 6) - 0.3) * 0.8)),
        across: 10
      }),
      mat
    );
    river.renderOrder = 1;
    if (span) this.group.add(river);
    // Streams from the side pools.
    for (const st of STREAMS) {
      if (!keep(st.pts[0][0], st.pts[0][1])) continue;
      const g = ribbon(st, { half: () => 1.8, level: (s) => { const p = pointAt(st, s); return heightAt(p.x, p.z) + 0.55; }, speed: () => 1.8, foam: () => 0.5, across: 4, step: 1 });
      this.group.add(new THREE.Mesh(g, mat));
    }
    // Pools, with foam where the falls land.
    FALLS.forEach((fl, i) => {
      if (!this.falls.includes(fl)) {
        waterUniforms.uImpacts.value[i].set(0, -999, 0, 0);
        return;
      }
      const face = this.faces[i];
      const foot = face.foot ?? { x: fl.pool.x, z: fl.pool.z };
      const land = { x: foot.x - face.dx * 3, z: foot.z - face.dz * 3 };
      waterUniforms.uImpacts.value[i].set(land.x, poolLevel(fl), land.z, fl.width * 0.55);
      const m = new THREE.Mesh(poolGeometry(fl, land), mat);
      m.renderOrder = 1;
      this.group.add(m);
      face.land = land;
    });
    // The falls: a front sheet and a looser veil before it.
    this.fallMats = [];
    FALLS.forEach((fl, i) => {
      const face = this.faces[i];
      if (!this.falls.includes(fl) || !face.top || !face.foot) return;
      const geo = fallGeometry(fl, face);
      for (const layer of [0, 1]) {
        const fm = new THREE.ShaderMaterial({
          uniforms: { ...waterUniforms, tNoise: { value: noise }, tDepthLin: wet.tDepthLin, uScreen: wet.uScreen, uTime: shared.uTime, uHeight: { value: face.top.h - face.base }, uWidth: { value: fl.width }, uLayer: { value: layer }, uSeed: { value: i * 0.37 + layer * 0.21 } },
          vertexShader: FALL_VERT,
          fragmentShader: FALL_FRAG,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        this.fallMats.push(fm);
        const m = new THREE.Mesh(geo, fm);
        m.renderOrder = 3 + layer;
        this.group.add(m);
      }
    });
    // Mist and spray, one draw for all three falls.
    this.mist = this._mist(settings);
    this.group.add(this.mist);
    // Light shafts.
    this.shafts = this._shafts();
    this.group.add(this.shafts);
    toWet(this.group);
  }

  _mist(settings) {
    const perFall = settings.mist ?? 20;
    const spray = Math.round((settings.spray ?? 600) / 3);
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const seeds = [];
    const src = [];
    const kind = [];
    let r = 7;
    const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
    FALLS.forEach((fl, i) => {
      if (!this.falls.includes(fl)) return;
      const face = this.faces[i];
      const land = face.land ?? fl.pool;
      const H = face.top ? face.top.h - face.base : 30;
      const big = fl.id === 'grand';
      const y = poolLevel(fl);
      for (let k = 0; k < perFall * (big ? 2 : 1); k++) {
        seeds.push(rnd(), rnd(), rnd(), rnd());
        src.push(land.x, y, land.z, fl.width * (big ? 0.9 : 0.8));
        kind.push(0, H, 0.35, big ? 26 : 14);
      }
      // A few up the face, where the water tears into spray as it falls.
      for (let k = 0; k < perFall * 0.4; k++) {
        const t = 0.3 + rnd() * 0.6;
        seeds.push(rnd(), rnd(), rnd(), rnd());
        src.push(land.x + face.dx * 2, y + H * t, land.z + face.dz * 2, fl.width * 0.4);
        kind.push(0, H * 0.25, 0.2, big ? 14 : 8);
      }
      for (let k = 0; k < spray * (big ? 1.4 : 0.8); k++) {
        seeds.push(rnd(), rnd(), rnd(), rnd());
        src.push(land.x, y, land.z, fl.width * 0.8);
        kind.push(1, H, 0, big ? 0.5 : 0.35);
      }
    });
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 4));
    g.setAttribute('aSource', new THREE.InstancedBufferAttribute(new Float32Array(src), 4));
    g.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(kind), 4));
    g.instanceCount = seeds.length / 4;
    const m = new THREE.ShaderMaterial({
      uniforms: { ...waterUniforms, tPuff: { value: this.bank.puff(9, 128) }, tDepthLin: wet.tDepthLin, uScreen: wet.uScreen, uTime: shared.uTime, uWind: { value: new THREE.Vector2(0.4, 0.3) }, uDensity: { value: 1 } },
      vertexShader: MIST_VERT,
      fragmentShader: MIST_FRAG,
      transparent: true,
      depthWrite: false
    });
    this.mats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    return mesh;
  }

  _shafts() {
    const quad = new THREE.PlaneGeometry(1, 1, 1, 1);
    quad.translate(0.5, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const sh = [];
    const seed = [];
    let r = 3;
    const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
    // Over the falls' basins and along the path, where the canopy opens.
    const spots = [];
    for (const fl of this.falls) for (let k = 0; k < (fl.id === 'grand' ? 9 : 4); k++) spots.push([fl.pool.x + (rnd() - 0.5) * fl.pool.r * 2.4, fl.pool.z + (rnd() - 0.5) * fl.pool.r * 2.4, fl.id === 'grand' ? 90 : 60, fl.id === 'grand' ? 8 : 5]);
    for (let s = 20; s < 720; s += 26) {
      const p = pointAt(RIVER, s);
      spots.push([p.x + (rnd() - 0.5) * 30, p.z + (rnd() - 0.5) * 30, 55 + rnd() * 25, 3 + rnd() * 4]);
    }
    for (const [x, z, L, W] of spots) {
      if (!this.keep(x, z)) continue;
      sh.push(x, z, L, W);
      seed.push(rnd(), heightAt(x, z) - 2);
    }
    g.setAttribute('aShaft', new THREE.InstancedBufferAttribute(new Float32Array(sh), 4));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seed), 2));
    g.instanceCount = sh.length / 4;
    const m = new THREE.ShaderMaterial({
      uniforms: { uSunDir: waterUniforms.uSunDir, uSunCol: waterUniforms.uSunCol, tNoise: { value: this.bank.noise() }, tDepthLin: wet.tDepthLin, uScreen: wet.uScreen, uTime: shared.uTime, uStrength: { value: 0.12 } },
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.shaftMat = m;
    this.mats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    return mesh;
  }

  /** Each frame: the light the water sees. */
  update(look, lighting, rain) {
    waterUniforms.uSunDir.value.copy(look.toLight);
    waterUniforms.uSunCol.value.copy(lighting.sun.color).multiplyScalar(lighting.sun.intensity / 3);
    waterUniforms.uHemiSky.value.copy(lighting.hemi.color).multiplyScalar(lighting.hemi.intensity * 0.75);
    waterUniforms.uHemiGround.value.copy(lighting.hemi.groundColor);
    waterUniforms.uRainK.value = rain;
    this.shaftMat.uniforms.uStrength.value = 0.16 * (1 - rain * 0.85);
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
    for (const m of [...this.mats, ...this.fallMats]) m.dispose();
  }
}
