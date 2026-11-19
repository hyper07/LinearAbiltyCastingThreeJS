/**
 * Meadow grass and wildflowers, after Gloamreach's and Wyldhunt's GPU grass:
 * a fixed grid of clumps that follows the camera (snapped, so nothing
 * swims), each jittered by a hash of its world cell, sat on the height
 * texture, thinned by the splat map (none on the road, the flagstones, the
 * rock, the banks), bent by travelling gusts and pushed aside by you and
 * your friends. A fine near ring and a coarser far one.
 *
 * Painted rather than photographed: broad blades shaped like brush strokes,
 * a dark root rising to a warm, sun-caught tip, lit with a normal that leans
 * up (so the field shades as one soft mass, like the ground it grows from).
 * Flowers — white, butter-yellow, pink, lavender, a little orange — gather
 * thickest in Hopgrass Meadow.
 */
import * as THREE from 'three';
import { EXTENT } from './map.js';
import { shared } from '../gloamreach/materials.js';
import { rng } from '../gloamreach/noise.js';
import { painterly } from './paint.js';

/** Up to four creatures that also push the grass aside. */
export const grassPushers = { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -100, 0, 0)) };

/** A clump of `blades` brush-stroke blades (local, base at the origin). */
function clumpGeometry(blades, segs, { width = 0.08, height = 0.5, spread = 0.25, seed = 1 } = {}) {
  const r = rng(seed);
  const pos = [];
  const uv = [];
  const side = [];
  const idx = [];
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * spread;
    const bx = Math.cos(a) * d;
    const bz = Math.sin(a) * d;
    const facing = r() * Math.PI;
    const h = height * (0.55 + r() * 0.7);
    const w = width * (0.7 + r() * 0.6);
    const lean = (r() - 0.3) * 0.7;
    const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const v = s / segs;
      // A brush stroke: full through the body, then a round taper at the tip.
      const ww = w * (v < 0.6 ? 1 - v * 0.15 : 0.91 * Math.sqrt(Math.max(0, 1 - ((v - 0.6) / 0.4) ** 2)));
      const curve = lean * v * v * h;
      for (const k of [-1, 1]) {
        const lx = Math.cos(facing) * ww * 0.5 * k + Math.cos(a) * curve;
        const lz = Math.sin(facing) * ww * 0.5 * k + Math.sin(a) * curve;
        pos.push(bx + lx, v * h, bz + lz);
        uv.push(k * 0.5 + 0.5, v);
        side.push(Math.cos(facing + Math.PI / 2), Math.sin(facing + Math.PI / 2), r());
      }
    }
    for (let s = 0; s < segs; s++) {
      const i = base + s * 2;
      idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  g.setIndex(idx);
  return g;
}

/** A little bunch of flowers: thin stems and small round heads (two crossed cards each). */
function flowerGeometry(n = 3, seed = 2) {
  const r = rng(seed);
  const pos = [];
  const uv = [];
  const side = [];
  const idx = [];
  const quad = (pts, part, u = [[0, 0], [1, 0], [1, 1], [0, 1]]) => {
    const b = pos.length / 3;
    for (let i = 0; i < 4; i++) {
      pos.push(...pts[i]);
      uv.push(...u[i]);
      side.push(0, 0, part);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * 0.18;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const h = 0.16 + r() * 0.2;
    const t = 0.012;
    const f = r() * Math.PI;
    quad([[x - Math.cos(f) * t, 0, z - Math.sin(f) * t], [x + Math.cos(f) * t, 0, z + Math.sin(f) * t], [x + Math.cos(f) * t, h, z + Math.sin(f) * t], [x - Math.cos(f) * t, h, z - Math.sin(f) * t]], 0);
    const s = 0.03 + r() * 0.022;
    // The head: a flat-ish disc card, tilted up, and a crossing one.
    quad([[x - s, h - s * 0.2, z - s], [x + s, h - s * 0.2, z - s], [x + s, h + s * 0.2, z + s], [x - s, h + s * 0.2, z + s]], 1 + k * 0.01);
    quad([[x - s, h + s * 0.25, z + s], [x + s, h + s * 0.25, z + s], [x + s, h - s * 0.25, z - s], [x - s, h - s * 0.25, z - s]], 1 + k * 0.01);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  g.setIndex(idx);
  return g;
}

const PLACE_PARS = /* glsl */ `
uniform vec3 uOrigin;
uniform float uSpacing;
uniform float uN;
uniform float uRadius;
uniform float uInner;
uniform float uDensity;
uniform float uScale;
uniform float uKind;
uniform sampler2D tHeight;
uniform sampler2D tSplatA;
uniform sampler2D tSplatB;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uTime;
uniform vec4 uWind;
uniform vec3 uPlayer;
uniform vec4 uPushers[4];
attribute vec3 aSide;
attribute vec2 aUv;
varying float vTip;
varying float vPart;
varying vec2 vFuv;
varying vec3 vHead;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const PLACE_MAIN = /* glsl */ `
float id = float(gl_InstanceID);
float ix = mod(id, uN);
float iz = floor(id / uN);
vec2 cell = floor(uOrigin.xz / uSpacing) + vec2(ix, iz) - uN * 0.5;
float h1 = hash12(cell + uKind * 7.1);
float h2 = hash12(cell + 17.3);
float h3 = hash12(cell * 1.7 + 3.1 + uKind);
vec2 wp = (cell + vec2(h1, h2)) * uSpacing;
vec2 suv = (wp - uExtent.xy) / uExtent.zw;
vec4 sa = texture2D(tSplatA, suv);
vec4 sb = texture2D(tSplatB, suv);
float bare = clamp(sa.r * 1.3 + sa.g * 1.5 + sa.b * 1.2 + sb.g * 1.6 + sb.a * 1.1, 0.0, 1.0);
float meadow = sb.r;
float patchN = texture2D(tNoise, wp * 0.017).g;
float want;
if (uKind < 0.5) want = uDensity * (1.0 - smoothstep(0.08, 0.45, bare)) * (0.55 + 0.45 * smoothstep(0.25, 0.65, patchN) + meadow * 0.3) * (1.0 - sa.a * 0.55);
else want = uDensity * (1.0 - smoothstep(0.05, 0.3, bare)) * (meadow * 0.55 + smoothstep(0.62, 0.8, patchN) * 0.16) * (1.0 - sa.a * 0.8);
float d = length(wp - cameraPosition.xz);
float fade = smoothstep(uRadius, uRadius * 0.7, d) * smoothstep(uInner - 2.0, uInner + 2.0, d);
float keep = step(h3, want) * fade;
float hgt = texture2D(tHeight, suv).r;
float s = (0.6 + h1 * 0.7) * uScale * keep * (1.0 + meadow * 0.25 + smoothstep(0.6, 0.9, patchN) * 0.2) * (1.0 - sa.a * 0.35);
float ang = h2 * 6.2831;
vec3 p = position;
p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
p *= s;
float tip = aUv.y;
vTip = tip;
vPart = aSide.z;
vFuv = aUv;
// Wind: travelling gusts and a sway, bending the upper blade.
vec2 wd = normalize(uWind.xy);
float gust = texture2D(tNoise, wp * 0.013 - wd * uTime * 0.045).r;
float bend = (sin(uTime * 1.6 + h1 * 6.0 + dot(wp, wd) * 0.3) * 0.22 + gust * 1.05) * uWind.z;
float flex = uKind < 0.5 ? tip * tip : step(0.5, aSide.z) * 0.6 + 0.0;
p.xz += wd * bend * flex * 0.32 * s;
// Pushed aside by you and your friends.
vec2 away = wp - uPlayer.xz;
float pd = length(away);
float push = (1.0 - smoothstep(0.25, 1.1, pd)) * step(abs(uPlayer.y - hgt), 1.6);
for (int i = 0; i < 4; i++) {
  vec4 q = uPushers[i];
  vec2 aw = wp - q.xz;
  float qd = length(aw);
  float k = (1.0 - smoothstep(0.1, q.w, qd)) * step(abs(q.y - hgt), 1.5);
  if (k > push) { push = k; away = aw; }
}
float flexP = uKind < 0.5 ? tip : 1.0;
p.xz += normalize(away + 1e-4) * push * flexP * 0.5 * s;
p.y *= 1.0 - push * 0.45 * flexP;
vec3 gTransformed = vec3(wp.x, hgt, wp.y) + p;
`;

const GRASS_COLOR = /* glsl */ `{
  float big = texture2D(tNoise, gTransformed.xz / 210.0).r;
  float mid = texture2D(tNoise, gTransformed.xz / 61.0).g;
  vec3 deep = vec3(0.22, 0.46, 0.21);
  vec3 sunlit = vec3(0.36, 0.58, 0.27);
  vec3 dry = vec3(0.48, 0.56, 0.3);
  vec3 body = mix(deep, sunlit, smoothstep(0.3, 0.7, mid + (big - 0.5) * 0.6));
  body = mix(body, dry, smoothstep(0.6, 0.85, big) * 0.35);
  body = mix(body, vec3(0.42, 0.42, 0.2), sa.a * 0.6);
  vec3 rootC = body * 0.55;
  vec3 tipC = body * 1.12 + vec3(0.02, 0.04, 0.0) + (h3 - 0.5) * vec3(0.05, 0.05, 0.0);
  vColor = vec4(mix(rootC, tipC, smoothstep(0.0, 0.95, tip)), 1.0);
}`;

const FLOWER_COLOR = /* glsl */ `{
  float pick = hash12(cell * 3.3 + floor(aSide.z * 100.0));
  vec3 head = pick < 0.34 ? vec3(0.96, 0.94, 0.9) : pick < 0.56 ? vec3(0.98, 0.84, 0.36) : pick < 0.74 ? vec3(0.92, 0.6, 0.72) : pick < 0.92 ? vec3(0.66, 0.6, 0.9) : vec3(0.95, 0.58, 0.32);
  vec3 stem = vec3(0.28, 0.42, 0.18);
  vHead = head;
  vColor = vec4(aSide.z > 0.5 ? head : stem, 1.0);
}`;

function material(uniforms, kind) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 0.5 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uTime: shared.uTime, uWind: shared.uWind, uPlayer: shared.uPlayer, uPushers: grassPushers });
    sh.vertexShader = PLACE_PARS + sh.vertexShader
      .replace('#include <color_vertex>', PLACE_MAIN + (kind === 0 ? GRASS_COLOR : FLOWER_COLOR))
      .replace('#include <begin_vertex>', 'vec3 transformed = gTransformed;')
      // The field shades as one mass: a normal that leans up, a little toward the blade's side.
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(aSide.x * 0.25, 1.0, aSide.y * 0.25));');
    sh.fragmentShader = 'varying float vTip;\nvarying float vPart;\nvarying vec2 vFuv;\nvarying vec3 vHead;\n' + sh.fragmentShader
      .replace('#include <alphatest_fragment>', kind === 1 ? `if (vPart > 0.5) { vec2 q = vFuv * 2.0 - 1.0; float rr = length(q); float petals = 0.93 + 0.07 * cos(atan(q.y, q.x) * 5.0); if (rr > petals) discard; diffuseColor.rgb = mix(vec3(1.0, 0.8, 0.25), diffuseColor.rgb, smoothstep(0.18, 0.3, rr)); }` : '')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.45, 1.05, vTip);');
  };
  mat.customProgramCacheKey = () => `kith-grass-${kind}`;
  return painterly(mat, { wrap: 0.6, rim: 0.2, shade: 0.2, trans: kind === 0 ? 0.5 : 0.25 });
}

export class Grass {
  constructor({ heightTex, splat, noise, settings }) {
    this.group = new THREE.Group();
    this.layers = [];
    const common = (spacing, n, radius, inner, scale, kind) => ({
      uOrigin: { value: new THREE.Vector3() },
      uSpacing: { value: spacing },
      uN: { value: n },
      uRadius: { value: radius },
      uInner: { value: inner },
      uDensity: { value: 1 },
      uScale: { value: scale },
      uKind: { value: kind },
      tHeight: { value: heightTex },
      tSplatA: { value: splat.a },
      tSplatB: { value: splat.b },
      tNoise: { value: noise },
      uExtent: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) }
    });
    const add = (geo, n, uniforms, kind, density) => {
      geo.instanceCount = n * n;
      const mesh = new THREE.Mesh(geo, material(uniforms, kind));
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      this.group.add(mesh);
      this.layers.push({ mesh, uniforms, n, kind, density });
    };
    const g = settings.grass;
    // Built for the fullest tier; setDensity() thins the grid for lighter ones.
    const nNear = 170;
    void g;
    const spNear = 0.24;
    add(clumpGeometry(10, 3, { width: 0.04, height: 0.26, spread: 0.22, seed: 13 }), nNear, common(spNear, nNear, (nNear * spNear) / 2, 0, 1, 0), 0, 1);
    if (settings.grassFar) {
      const nFar = 120;
      const spFar = 0.62;
      add(clumpGeometry(8, 3, { width: 0.075, height: 0.28, spread: 0.45, seed: 14 }), nFar, common(spFar, nFar, (nFar * spFar) / 2, (nNear * spNear) / 2 - 3, 1.05, 0), 0, 1);
    }
    const nF = 110;
    add(flowerGeometry(3, 5), nF, common(0.42, nF, (nF * 0.42) / 2, 0, 1, 1), 1, 1);
  }

  /**
   * Density for a quality tier: below 1 the grid itself gets coarser (fewer
   * clumps drawn, each a little bigger, over the same reach), above 1 the
   * clumps get fuller.
   */
  setDensity(k, flowers = k) {
    for (const l of this.layers) {
      const d = l.kind ? flowers : k;
      l.n0 ??= l.n;
      l.sp0 ??= l.uniforms.uSpacing.value;
      l.sc0 ??= l.uniforms.uScale.value;
      const n = Math.max(24, Math.round(l.n0 * Math.sqrt(Math.min(1, d))));
      l.uniforms.uN.value = n;
      l.uniforms.uSpacing.value = (l.sp0 * l.n0) / n;
      l.uniforms.uScale.value = l.sc0 * Math.min(1.25, Math.sqrt(l.n0 / n));
      l.uniforms.uDensity.value = Math.min(1.25, Math.max(1, d));
      l.mesh.geometry.instanceCount = n * n;
    }
  }

  update(camera) {
    for (const l of this.layers) l.uniforms.uOrigin.value.copy(camera.position);
  }

  dispose() {
    for (const l of this.layers) {
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
    }
  }
}
