/**
 * Grass, flowers, ferns and shrubs. The grass and flowers are placed on the
 * GPU: a fixed grid of clumps that follows the camera (snapped, so blades
 * never swim), each clump jittered by a hash of its world cell, sat on the
 * height texture, thinned by the splat map (none on roads or cobbles), bent
 * by travelling gusts and pushed aside where the hero walks, and faded out
 * at the ring's edge — a near ring of fine blades, a far ring of coarser
 * ones. Ferns and shrubs are photographed plants, instanced where they suit.
 */
import * as THREE from 'three';
import { EXTENT as WHOLE, FLOWER_BEDS, FENCES, PONDS, gloamAt } from './map.js';
import { shared, addTranslucency, addWind } from './materials.js';
import { rng } from './noise.js';
import { tf } from './kit.js';
import { splitGrid, ChunkCull, CHUNK_PARS, CHUNK_CELL } from '../shared/chunks.js';

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

/** A flower: a thin stem and a head of crossed petal cards. */
function flowerGeometry(seed = 2) {
  const r = rng(seed);
  const pos = [];
  const uv = [];
  const side = [];
  const idx = [];
  const puv = [];
  const add = (quad, v0, v1, part) => {
    const base = pos.length / 3;
    for (let k = 0; k < 4; k++) {
      pos.push(...quad[k]);
      uv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? v0 : v1);
      puv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1);
      side.push(1, 0, part);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let f = 0; f < 3; f++) {
    const x = (r() - 0.5) * 0.3;
    const z = (r() - 0.5) * 0.3;
    const h = 0.24 + r() * 0.2;
    const w = 0.012;
    add([[x - w, 0, z], [x + w, 0, z], [x + w, h, z], [x - w, h, z]], 0, 0.8, 0);
    add([[x, 0, z - w], [x, 0, z + w], [x, h, z + w], [x, h, z - w]], 0, 0.8, 0);
    const s = 0.05 + r() * 0.035;
    // A head facing up and a little toward the light, and one crossed card.
    add([[x - s, h - 0.01, z - s], [x + s, h - 0.01, z - s], [x + s, h + 0.03, z + s], [x - s, h + 0.03, z + s]], 0.9, 1, 1);
    add([[x - s, h - s * 0.7, z], [x + s, h - s * 0.7, z], [x + s, h + s * 0.9, z], [x - s, h + s * 0.9, z]], 0.9, 1, 1);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 3));
  g.setAttribute('aPuv', new THREE.Float32BufferAttribute(puv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  g.setIndex(idx);
  return g;
}

/** A five-petalled flower on a transparent square (white; the shader tints it). */
function petalTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  for (let k = 0; k < 5; k++) {
    g.save();
    g.rotate((k / 5) * Math.PI * 2);
    const grad = g.createRadialGradient(0, -S * 0.2, 2, 0, -S * 0.2, S * 0.3);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#c8c8c8');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, -S * 0.22, S * 0.17, S * 0.25, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#3a2a10';
  g.beginPath();
  g.arc(0, 0, S * 0.09, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Where flowers grow (1 m a texel): R red poppies, G golden marigolds, B the Gloamwood's glowing blooms. */
export function flowerMap(EXTENT = WHOLE) {
  const W = EXTENT.x1 - EXTENT.x0;
  const H = EXTENT.z1 - EXTENT.z0;
  const data = new Uint8Array(W * H * 4);
  const r = rng(77);
  const put = (x, z, rad, ch, amt) => {
    for (let j = Math.floor(z - rad); j <= Math.ceil(z + rad); j++) {
      for (let i = Math.floor(x - rad); i <= Math.ceil(x + rad); i++) {
        const gx = i - EXTENT.x0;
        const gz = j - EXTENT.z0;
        if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
        const d = Math.hypot(i - x, j - z) / rad;
        if (d > 1) continue;
        const k = (gz * W + gx) * 4 + ch;
        data[k] = Math.min(255, data[k] + (1 - d * d) * amt * 255);
      }
    }
  };
  for (const [x, z, rad, kind] of FLOWER_BEDS) put(x, z, rad, kind === 'poppy' ? 0 : 1, rad > 4 ? 0.7 : 1);
  // Along the fences, and in drifts over the meadows.
  for (const line of FENCES) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2);
      for (let k = 0; k <= n; k++) if (r() < 0.6) put(ax + ((bx - ax) * k) / n + (r() - 0.5) * 1.5, az + ((bz - az) * k) / n + (r() - 0.5) * 1.5, 1.2 + r(), r() < 0.7 ? 0 : 1, 0.6);
    }
  }
  for (let k = 0; k < 140; k++) {
    const x = -110 + r() * 220;
    const z = -110 + r() * 210;
    if (Math.hypot(x, z) < 28) continue;
    put(x, z, 2 + r() * 4, r() < 0.65 ? 0 : 1, 0.35 + r() * 0.3);
  }
  // The Gloamwood: glowing blooms and red-leaved plants in pools.
  for (let k = 0; k < 150; k++) {
    const x = -90 + r() * 180;
    const z = -170 - r() * 150;
    put(x, z, 1.2 + r() * 2.8, r() < 0.35 ? 0 : 2, 0.3 + r() * 0.35);
  }
  for (const p of PONDS) put(p.x, p.z, p.r + 3, 2, 0.6);
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
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
uniform sampler2D tFlowers;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uTime;
uniform vec4 uWind;
uniform vec3 uPlayer;
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
float region = smoothstep(-134.0, -158.0, wp.y);
float grassW = sa.r + sb.r * 0.95 + sb.g * 0.35;
float want;
vec3 fl = texture2D(tFlowers, suv).rgb;
if (uKind < 0.5) {
  want = smoothstep(0.25, 0.7, grassW) * uDensity;
} else {
  want = max(max(fl.r, fl.g), fl.b) * smoothstep(0.2, 0.6, grassW) * (1.0 - smoothstep(0.1, 0.4, sa.g + sa.b + sb.b)) * uDensity;
}
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
float push = (1.0 - smoothstep(0.3, 1.3, pd)) * step(abs(uPlayer.y - hgt), 2.0);
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

function placementMaterial(kind, uniforms, { gloamGlow = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, side: THREE.DoubleSide, vertexColors: true });
  const u = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uTime: shared.uTime, uWind: shared.uWind, uPlayer: shared.uPlayer });
    const colorCode = kind === 'grass' ? GRASS_COLOR : FLOWER_COLOR;
    sh.vertexShader = PLACE_PARS + sh.vertexShader
      .replace('#include <color_vertex>', PLACE_MAIN + colorCode)
      .replace('#include <begin_vertex>', 'vec3 transformed = gTransformed;')
      .replace(
        '#include <beginnormal_vertex>',
        // Soft, mostly-up normals: grass reads as a lit surface, not as cards.
        `vec3 objectNormal = normalize(vec3(aSide.x * 0.35, 1.0, aSide.y * 0.35));`
      );
    sh.fragmentShader = 'varying float vFade;\nvarying float vTip;\nvarying vec2 vPuv;\nvarying float vPart;\nuniform sampler2D tPetal;\n' + sh.fragmentShader;
    if (kind !== 'grass') {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (vPart > 0.5) { vec4 pc = texture2D(tPetal, vPuv); if (pc.a < 0.5) discard; diffuseColor.rgb *= pc.rgb; }`
      );
    }
    if (kind === 'grass') {
      // A blade's edges are its alpha: keep them crisp with a soft taper.
      sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.45, 1.0, vTip);`);
    } else if (gloamGlow) {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * vPart * 0.9 * step(0.6, vColor.b);`
      );
    }
  };
  mat.customProgramCacheKey = () => `place-${kind}`;
  return addTranslucency(mat, kind === 'grass' ? 0.9 : 0.6, new THREE.Color(1, 0.95, 0.6));
}

export class Foliage {
  constructor({ heightTex, splat, noise, settings, heightAt = null, extent = WHOLE }) {
    const EXTENT = extent;
    this.group = new THREE.Group();
    this.flowers = flowerMap(EXTENT);
    this.petal = petalTexture();
    const common = (spacing, n, radius, inner, density, scale, kind) => ({
      uOrigin: { value: new THREE.Vector3() },
      uSpacing: { value: spacing },
      uN: { value: n },
      uRadius: { value: radius },
      uInner: { value: inner },
      uDensity: { value: density },
      uScale: { value: scale },
      tHeight: { value: heightTex },
      tSplatA: { value: splat.a },
      tSplatB: { value: splat.b },
      tFlowers: { value: this.flowers },
      tNoise: { value: noise },
      uExtent: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) },
      uKind: { value: kind === 'flowers' ? 1 : 0 },
      tPetal: { value: this.petal }
    });
    const g = settings.grass;
    this.layers = [];
    this.cull = new ChunkCull();
    this.heightAt = heightAt;
    this.reach = 1;
    // Each ring is cut into chunks (their own draws), so what's behind the camera or past the reach isn't drawn at all.
    const add = (geo, n0, spacing, inner, scale, kind, opts) => {
      const parts = n0 > 140 ? 6 : 4;
      const { cw, n, cells } = splitGrid(n0, parts);
      const uniforms = common(spacing, n, (n * spacing) / 2, inner, 1, scale, kind);
      geo.instanceCount = cw * cw;
      const chunks = cells.map(([cx, cz]) => {
        const mesh = new THREE.Mesh(geo, placementMaterial(kind, { ...uniforms, uChunk: { value: new THREE.Vector3(cx, cz, cw) } }, opts));
        mesh.frustumCulled = false;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        this.group.add(mesh);
        return { mesh, cx, cz };
      });
      this.layers.push({ uniforms, n, cw, chunks, spacing, radius: (n * spacing) / 2, inner, geo, mats: chunks.map((c) => c.mesh.material) });
    };
    // Near ring: fine blades.
    const nNear = Math.round(170 * Math.sqrt(g));
    const spNear = 0.2;
    add(clumpGeometry(7, 3, { width: 0.05, height: 0.3, seed: 3 }), nNear, spNear, 0, 1, 'grass');
    // Far ring: coarser clumps.
    if (settings.grassFar) {
      const nFar = 120;
      const spFar = 0.55;
      add(clumpGeometry(5, 2, { width: 0.1, height: 0.36, spread: 0.45, seed: 4 }), nFar, spFar, (this.layers[0].n * spNear) / 2 - 3, 1.1, 'grass');
    }
    // Flowers.
    const nF = Math.round(90 * Math.sqrt(g));
    add(flowerGeometry(5), nF, 0.5, 0, 1, 'flowers', { gloamGlow: true });
  }

  /** Density (0…1) and reach (× each ring's radius) of the grass and flowers. */
  setDensity(density, reach = this.reach) {
    this.reach = reach;
    for (const l of this.layers) {
      l.uniforms.uDensity.value = Math.min(1, density);
      l.uniforms.uRadius.value = l.radius * reach;
    }
  }

  update(camera) {
    this.cull.setCamera(camera);
    for (const l of this.layers) {
      l.uniforms.uOrigin.value.copy(camera.position);
      const radius = l.uniforms.uRadius.value;
      for (const c of l.chunks) c.mesh.visible = l.uniforms.uDensity.value > 0 && this.cull.visible(camera.position, l.spacing, l.n, c.cx, c.cz, l.cw, { radius, inner: l.inner, heightAt: this.heightAt, pad: 1.2 });
    }
  }

  dispose() {
    for (const l of this.layers) {
      l.geo.dispose();
      for (const m of l.mats) m.dispose();
    }
    this.flowers.dispose();
  }
}

/* ------------------------------------------------------------------ photographed plants */

/** Give a plant's geometry wind flex by height (0 at its base). */
function flexByHeight(geo, k = 1) {
  geo.computeBoundingBox();
  const h = Math.max(0.1, geo.boundingBox.max.y - geo.boundingBox.min.y);
  const p = geo.attributes.position;
  const w = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    w[i * 2] = (p.getX(i) + p.getZ(i)) * 0.5;
    w[i * 2 + 1] = Math.pow(Math.max(0, p.getY(i) - geo.boundingBox.min.y) / h, 1.5) * k;
  }
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 2));
}

/**
 * Ferns, shrubs and red-leaved plants, placed from seeded scatter rules.
 * `props` is the PropLibrary (its loader and cache).
 */
export async function plants(props, { heightAt, isClear, trees, giants, roads, houses, density = 1 }) {
  const r = rng(404);
  const spots = { fern: [], fernGloam: [], shrub: [], nettle: [], redleaf: [] };
  // Around tree feet and the forest edges.
  for (const t of [...trees, ...giants]) {
    const n = (t.r ?? 0.5) > 2 ? 9 : 2;
    for (let k = 0; k < n * density; k++) {
      const a = r() * Math.PI * 2;
      const d = (t.r ?? 0.5) * 1.6 + 1 + r() * 4;
      const x = t.x + Math.cos(a) * d;
      const z = t.z + Math.sin(a) * d;
      if (!isClear(x, z, 1)) continue;
      const g = gloamAt(z) > 0.5;
      const pick = r();
      if (g) (pick < 0.5 ? spots.fernGloam : pick < 0.8 ? spots.redleaf : spots.shrub).push([x, z]);
      else (pick < 0.55 ? spots.fern : pick < 0.85 ? spots.shrub : spots.nettle).push([x, z]);
    }
  }
  // Along the Gloamwood's path and round its houses: ferns and red-leaved plants, thick.
  for (const road of roads ?? []) {
    if (road.surface !== 'wetcobble') continue;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, az] = road.pts[i];
      const [bx, bz] = road.pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < len; s += 1.6 / density) {
        const t = s / len;
        const nx = -(bz - az) / len;
        const nz = (bx - ax) / len;
        const side = r() < 0.5 ? -1 : 1;
        const off = road.half + 1.2 + r() * 5;
        const x = ax + (bx - ax) * t + nx * side * off;
        const z = az + (bz - az) * t + nz * side * off;
        if (!isClear(x, z, 0.8)) continue;
        (r() < 0.55 ? spots.fernGloam : spots.redleaf).push([x, z]);
      }
    }
  }
  for (const h of houses ?? []) {
    for (let k = 0; k < 26 * density; k++) {
      const a = h.face + (r() - 0.5) * 2.6;
      const d = 10 + r() * 5;
      const x = h.x + Math.sin(a) * d;
      const z = h.z + Math.cos(a) * d;
      if (isClear(x, z, 0.6)) (r() < 0.5 ? spots.fernGloam : spots.redleaf).push([x, z]);
    }
  }
  const mats = (list, scale = 1, jitter = 0.3) =>
    list.map(([x, z]) => tf(x, heightAt(x, z) - 0.05, z, (r() - 0.5) * 0.15, r() * 6.28, 0, scale * (1 - jitter / 2 + r() * jitter), scale * (1 - jitter / 2 + r() * jitter), scale * (1 - jitter / 2 + r() * jitter)));
  const windy = (m) => {
    m.side = THREE.DoubleSide;
    m.alphaTest = Math.max(m.alphaTest, 0.4);
    addWind(m, { flutter: 0.015 });
    addTranslucency(m, 0.8);
  };
  const prep = async (id, list, opts) => {
    const variants = await props.load(id, true);
    if (!variants) return null;
    for (const v of variants) for (const p of v.parts) if (!p.geo.attributes.aWind) flexByHeight(p.geo, 0.25);
    return props.scatter(id, list, { split: true, onMaterial: windy, ...opts });
  };
  const cap = (list, n) => list.slice(0, Math.round(n * density));
  await Promise.all([
    prep('fern_02', mats(cap(spots.fern, 500), 1.5), { shadows: false, dist: 55 }),
    prep('fern_02', mats(cap(spots.fernGloam, 1100), 1.9), { shadows: false, dist: 60, tint: new THREE.Color(0.55, 1.15, 0.9) }),
    prep('shrub_03', mats(cap(spots.shrub, 260), 1.3), { shadows: true, dist: 70 }),
    prep('nettle_plant', mats(cap(spots.nettle, 160), 1.3), { shadows: false, dist: 45 }),
    prep('nettle_plant', mats(cap(spots.redleaf, 800), 1.6), { shadows: false, dist: 50, tint: new THREE.Color(1.7, 0.3, 0.42) })
  ]);
  return spots;
}
