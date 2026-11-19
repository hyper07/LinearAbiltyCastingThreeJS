/**
 * Ground cover for the gorge, after Gloamreach's GPU grass: a fixed grid of
 * clumps that follows the camera (snapped, so nothing swims), each jittered
 * by a hash of its world cell, sat on the height texture, thinned by the
 * splat map (none on the path, the pebbles, the rock or in the water), bent
 * by travelling gusts and pushed aside by the hunter and the mount; a fine
 * near ring and a coarser far one. Broad, glossy jungle blades — and, mixed
 * in, little leafy seedlings — instead of meadow grass.
 */
import * as THREE from 'three';
import { splitGrid, ChunkCull, CHUNK_PARS, CHUNK_CELL } from '../shared/chunks.js';
import { EXTENT } from './map.js';
import { shared, addTranslucency } from '../gloamreach/materials.js';
import { rng } from '../gloamreach/noise.js';

/** A clump of `blades` curved blades, `segs` segments each (local, base at the origin). */
function clumpGeometry(blades, segs, { width = 0.06, height = 0.7, spread = 0.22, seed = 1 } = {}) {
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
    const h = height * (0.6 + r() * 0.6);
    const w = width * (0.7 + r() * 0.6);
    const lean = (r() - 0.5) * 0.6;
    const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const v = s / segs;
      const ww = w * (1 - v * 0.92);
      const curve = lean * v * v * h;
      for (const k of [-1, 1]) {
        const lx = Math.cos(facing) * ww * 0.5 * k + Math.cos(a) * curve;
        const lz = Math.sin(facing) * ww * 0.5 * k + Math.sin(a) * curve;
        pos.push(bx + lx, v * h, bz + lz);
        uv.push(k * 0.5 + 0.5, v);
        side.push(Math.cos(facing + Math.PI / 2), Math.sin(facing + Math.PI / 2), b / blades);
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

const PLACE_PARS = /* glsl */ `
${CHUNK_PARS}uniform vec3 uOrigin;
uniform float uSpacing;
uniform float uN;
uniform float uRadius;
uniform float uInner;
uniform float uDensity;
uniform float uScale;
uniform sampler2D tHeight;
uniform sampler2D tSplatA;
uniform sampler2D tSplatB;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uTime;
uniform vec4 uWind;
uniform vec3 uPlayer;\nuniform vec3 uMount;
uniform float uKind; // 0 grass, 1 flowers
attribute vec3 aSide;
attribute vec2 aUv;
attribute vec2 aPuv;
varying vec2 vPuv;
varying float vPart;
varying float vFade;
varying float vTip;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const PLACE_MAIN = /* glsl */ `
float id = float(gl_InstanceID);
${CHUNK_CELL}
vec2 cell = floor(uOrigin.xz / uSpacing) + vec2(ix, iz) - uN * 0.5;
float h1 = hash12(cell);
float h2 = hash12(cell + 17.3);
float h3 = hash12(cell * 1.7 + 3.1);
vec2 wp = (cell + vec2(h1, h2)) * uSpacing;
vec2 suv = (wp - uExtent.xy) / uExtent.zw;
vec4 sa = texture2D(tSplatA, suv);
vec4 sb = texture2D(tSplatB, suv);
float region = 0.0;
float grassW = sa.r * 0.15 + sb.r * 0.2 + sb.b * 1.4;
float want = smoothstep(0.35, 0.8, grassW) * 0.5 * uDensity * (1.0 - smoothstep(0.05, 0.3, sb.g + sa.a)) * (0.55 + 0.45 * smoothstep(0.3, 0.7, texture2D(tNoise, wp * 0.02).g));
float d = length(wp - cameraPosition.xz);
float fade = smoothstep(uRadius, uRadius * 0.72, d) * smoothstep(uInner - 2.0, uInner + 2.0, d);
float keep = step(h3, want) * fade;
vFade = fade;
float hgt = texture2D(tHeight, suv).r;
float s = (0.6 + h1 * 0.8) * uScale * keep;
float ang = h2 * 6.2831;
vec3 p = position;
p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
p *= s;
float tip = aUv.y;
vPuv = aPuv;
vPart = aSide.z;
vTip = tip;
// Wind: travelling gusts from the noise, a sway, bending the upper blade.
vec2 wd = normalize(uWind.xy);
float gust = texture2D(tNoise, wp * 0.015 - wd * uTime * 0.05).r;
float bend = (sin(uTime * 2.1 + h1 * 6.0 + dot(wp, wd) * 0.35) * 0.25 + gust * 1.1) * uWind.z;
p.xz += wd * bend * tip * tip * 0.35 * s;
// The hero pushes the grass aside.
vec2 away = wp - uPlayer.xz;
float pd = length(away);
float push = (1.0 - smoothstep(0.3, 1.3, pd)) * step(abs(uPlayer.y - hgt), 2.0);\nvec2 away2 = wp - uMount.xz;\nfloat pd2 = length(away2);\nfloat push2 = (1.0 - smoothstep(0.6, 2.2, pd2)) * step(abs(uMount.y - hgt), 2.5);\np.xz += normalize(away2 + 1e-4) * push2 * tip * 0.6 * s;\np.y *= 1.0 - push2 * 0.5 * tip;
p.xz += normalize(away + 1e-4) * push * tip * 0.55 * s;
p.y *= 1.0 - push * 0.45 * tip;
vec3 gTransformed = vec3(wp.x, hgt, wp.y) + p;
`;

const GRASS_COLOR = /* glsl */ `{
  float patchN = texture2D(tNoise, gTransformed.xz * 0.012).g;
  vec3 rootC = mix(vec3(0.1, 0.13, 0.04), vec3(0.03, 0.1, 0.09), region);
  vec3 tipC = mix(mix(vec3(0.36, 0.5, 0.12), vec3(0.62, 0.58, 0.18), smoothstep(0.5, 0.8, patchN)), mix(vec3(0.22, 0.82, 0.3), vec3(0.58, 0.88, 0.2), patchN), region);
  vColor = vec4(mix(rootC, tipC, pow(aUv.y, 0.8)) * (0.85 + h3 * 0.3), 1.0);
}`;
const FLOWER_COLOR = /* glsl */ `{
  vec3 head = fl.b > max(fl.r, fl.g) ? (h1 < 0.5 ? vec3(1.0, 0.25, 0.85) : vec3(0.35, 0.9, 1.0)) : fl.r > fl.g ? vec3(0.75, 0.05, 0.03) : vec3(0.95, 0.55, 0.05);
  vec3 stem = mix(vec3(0.12, 0.25, 0.06), vec3(0.06, 0.24, 0.2), region);
  vColor = vec4(aSide.z > 0.5 ? head * (0.8 + h2 * 0.4) : stem, 1.0);
}`;


const COVER_COLOR = /* glsl */ `{
  float patchN = texture2D(tNoise, gTransformed.xz * 0.012).g;
  float wetN = sb.a;
  vec3 rootC = vec3(0.03, 0.05, 0.015);
  vec3 tipC = mix(mix(vec3(0.16, 0.26, 0.06), vec3(0.24, 0.3, 0.08), smoothstep(0.45, 0.8, patchN)), vec3(0.1, 0.2, 0.07), wetN * 0.6);
  vColor = vec4(mix(rootC, tipC, pow(aUv.y, 0.75)) * (0.8 + h3 * 0.35), 1.0);
}`;

function coverMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 0.4 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uTime: shared.uTime, uWind: shared.uWind, uPlayer: shared.uPlayer, uMount: coverMount });
    sh.vertexShader = PLACE_PARS + sh.vertexShader
      .replace('#include <color_vertex>', PLACE_MAIN + COVER_COLOR)
      .replace('#include <begin_vertex>', 'vec3 transformed = gTransformed;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(aSide.x * 0.35, 1.0, aSide.y * 0.35));');
    sh.fragmentShader = 'varying float vFade;\nvarying float vTip;\nvarying vec2 vPuv;\nvarying float vPart;\n' + sh.fragmentShader.replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.4, 1.0, vTip);');
  };
  mat.customProgramCacheKey = () => 'wyld-cover';
  return addTranslucency(mat, 0.45, new THREE.Color(1, 0.95, 0.6));
}

/** Where the mount is (it pushes the cover aside too). */
export const coverMount = { value: new THREE.Vector3(0, -100, 0) };

export class Cover {
  constructor({ heightTex, splat, noise, settings, heightAt = null }) {
    this.group = new THREE.Group();
    this.cull = new ChunkCull();
    this.heightAt = heightAt;
    this.reach = 1;
    const common = (spacing, n, radius, inner, scale) => ({
      uOrigin: { value: new THREE.Vector3() },
      uSpacing: { value: spacing },
      uN: { value: n },
      uRadius: { value: radius },
      uInner: { value: inner },
      uDensity: { value: 1 },
      uScale: { value: scale },
      tHeight: { value: heightTex },
      tSplatA: { value: splat.a },
      tSplatB: { value: splat.b },
      tNoise: { value: noise },
      uExtent: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) },
      uKind: { value: 0 }
    });
    const g = settings.grass;
    this.layers = [];
    // Each ring cut into chunks (their own draws): what's behind the camera or past the reach isn't drawn.
    const add = (geo, n0, spacing, inner, scale) => {
      const { cw, n, cells } = splitGrid(n0, n0 > 130 ? 6 : 4);
      const uniforms = common(spacing, n, (n * spacing) / 2, inner, scale);
      geo.instanceCount = cw * cw;
      const chunks = cells.map(([cx, cz]) => {
        const mesh = new THREE.Mesh(geo, coverMaterial({ ...uniforms, uChunk: { value: new THREE.Vector3(cx, cz, cw) } }));
        mesh.frustumCulled = false;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        this.group.add(mesh);
        return { mesh, cx, cz };
      });
      this.layers.push({ uniforms, n, cw, chunks, spacing, inner, radius: (n * spacing) / 2, geo });
    };
    const nNear = Math.round(150 * Math.sqrt(g));
    const spNear = 0.22;
    add(clumpGeometry(6, 3, { width: 0.07, height: 0.24, spread: 0.26, seed: 13 }), nNear, spNear, 0, 1);
    if (settings.grassFar) {
      const nFar = 110;
      const spFar = 0.6;
      add(clumpGeometry(5, 2, { width: 0.12, height: 0.3, spread: 0.5, seed: 14 }), nFar, spFar, (this.layers[0].n * spNear) / 2 - 3, 1.1);
    }
  }

  /** Density, and reach (× each ring's radius). */
  setDensity(k, reach = this.reach) {
    this.reach = reach;
    for (const l of this.layers) {
      l.uniforms.uDensity.value = Math.min(1.2, k);
      l.uniforms.uRadius.value = l.radius * reach;
    }
  }

  update(camera) {
    this.cull.setCamera(camera);
    for (const l of this.layers) {
      l.uniforms.uOrigin.value.copy(camera.position);
      const radius = l.uniforms.uRadius.value;
      for (const c of l.chunks) c.mesh.visible = l.uniforms.uDensity.value > 0 && this.cull.visible(camera.position, l.spacing, l.n, c.cx, c.cz, l.cw, { radius, inner: l.inner, heightAt: this.heightAt, pad: 1 });
    }
  }

  dispose() {
    for (const l of this.layers) {
      l.geo.dispose();
      for (const c of l.chunks) c.mesh.material.dispose();
    }
  }
}
