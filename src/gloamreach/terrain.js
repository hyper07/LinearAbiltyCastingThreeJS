/**
 * The ground: heights.js made into chunked meshes (a near and a far level of
 * detail each, with skirts so no cracks show), painted by a splat map that
 * blends seven photographed materials — grass, dirt, cobbles, rock, moss,
 * leaf litter and wet cobbles — from array textures. Cobbles get parallax
 * depth, rock is projected three ways so cliffs don't stretch, and the
 * Gloamwood's stones are wet with puddles. Also the ponds' water.
 */
import * as THREE from 'three';
import { EXTENT, PONDS, gloamAt } from './map.js';
import { heightAt, roadDistances, plazaAt, outside } from './heights.js';
import { simplex2, smoothstep } from './noise.js';

export const LAYERS = [
  { id: 'Grass004', fallback: '#5a7a32', scale: 3.2, tint: [1.0, 1.0, 0.82], rough: 0.82 },
  { id: 'Ground103', fallback: '#7a5a3a', scale: 3.5, rough: 0.8 },
  { id: 'PavingStones141', fallback: '#8a7560', scale: 2.6, tint: [1.1, 1.0, 0.9], rough: 0.6 },
  { id: 'Rock051', fallback: '#6a6460', scale: 5.5, rough: 0.7 },
  { id: 'Moss002', fallback: '#3a6a3a', scale: 3.0, tint: [0.62, 0.95, 0.9], rough: 0.8 },
  { id: 'Ground078', fallback: '#6a4a2a', scale: 3.0, rough: 0.8 },
  { id: 'PavingStones142', fallback: '#5a5560', scale: 2.4, tint: [0.9, 0.86, 1.0], rough: 0.45 }
];

const STEP = 1; // metres between height samples
const CHUNK = 64;

/**
 * Heights on the 1 m grid, computed once (the mesh, grass and splat all use
 * it) over `extent` — the zone's bounds (map.js EXTENT is the whole map) —
 * from `height` (heights.js's land, or a zone's own, like the Cinder Rift's).
 */
export function heightGrid(extent = EXTENT, height = heightAt) {
  const EXTENT = extent;
  const w = Math.round((EXTENT.x1 - EXTENT.x0) / STEP) + 1;
  const h = Math.round((EXTENT.z1 - EXTENT.z0) / STEP) + 1;
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = height(EXTENT.x0 + i * STEP, EXTENT.z0 + j * STEP);
  const at = (x, z) => {
    const fx = Math.min(w - 1.001, Math.max(0, (x - EXTENT.x0) / STEP));
    const fz = Math.min(h - 1.001, Math.max(0, (z - EXTENT.z0) / STEP));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const k = iz * w + ix;
    const a = data[k] + (data[k + 1] - data[k]) * tx;
    const b = data[k + w] + (data[k + w + 1] - data[k + w]) * tx;
    return a + (b - a) * tz;
  };
  return { w, h, data, at, extent: { ...extent } };
}

/** The splat maps (0.5 m a texel): two RGBA bytes of layer weights, plus puddles. */
export function splatMaps(grid, trees) {
  const EXTENT = grid.extent;
  const CELL = 0.5;
  const W = Math.round((EXTENT.x1 - EXTENT.x0) / CELL);
  const H = Math.round((EXTENT.z1 - EXTENT.z0) / CELL);
  const A = new Uint8Array(W * H * 4);
  const B = new Uint8Array(W * H * 4);
  const N = simplex2(77);
  const M = simplex2(78);
  // Leaf litter round the trees' feet.
  const litter = new Float32Array(W * H);
  for (const t of trees) {
    const r = (t.r ?? 0.5) * 3.5 + 3;
    const x0 = Math.max(0, Math.floor((t.x - r - EXTENT.x0) / CELL));
    const x1 = Math.min(W - 1, Math.ceil((t.x + r - EXTENT.x0) / CELL));
    const z0 = Math.max(0, Math.floor((t.z - r - EXTENT.z0) / CELL));
    const z1 = Math.min(H - 1, Math.ceil((t.z + r - EXTENT.z0) / CELL));
    for (let j = z0; j <= z1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d = Math.hypot(EXTENT.x0 + i * CELL - t.x, EXTENT.z0 + j * CELL - t.z) / r;
        if (d < 1) litter[j * W + i] = Math.max(litter[j * W + i], (1 - d) * (1 - d) * 1.4);
      }
    }
  }
  for (let j = 0; j < H; j++) {
    const z = EXTENT.z0 + (j + 0.5) * CELL;
    const forest = gloamAt(z) * smoothstep(-150, -170, z);
    for (let i = 0; i < W; i++) {
      const x = EXTENT.x0 + (i + 0.5) * CELL;
      const n1 = N(x / 7, z / 7);
      const n2 = M(x / 2.2, z / 2.2);
      const rd = roadDistances(x, z);
      const hx = grid.at(x + 0.5, z) - grid.at(x - 0.5, z);
      const hz = grid.at(x, z + 0.5) - grid.at(x, z - 0.5);
      const slope = Math.hypot(hx, hz);
      let grass = 1 - forest;
      let moss = forest;
      let dirt = smoothstep(0.7, -0.9, rd.dirt + n2 * 0.5) * (0.85 + n1 * 0.15);
      // Worn patches off the roads and round the square.
      dirt = Math.max(dirt, smoothstep(0.35, 0.75, n1 * 0.5 + 0.5) * 0.55 * (1 - forest) * smoothstep(60, 20, Math.hypot(x, z)));
      const plaza = plazaAt(x, z);
      let cobble = Math.max(plaza, smoothstep(0.5, -0.7, rd.cobble + n2 * 0.4));
      // Grass and dirt creep between the stones at the edges.
      cobble *= smoothstep(-0.25, 0.25, n2 * 0.6 + (cobble - 0.12) * 2.0);
      let wet = smoothstep(0.6, -0.6, rd.wetcobble + n2 * 0.35);
      wet *= smoothstep(-0.3, 0.2, n2 + (wet - 0.6));
      const lit = Math.min(1, litter[j * W + i]) * (0.7 + n1 * 0.3);
      let rock = smoothstep(0.85, 1.25, slope) + smoothstep(6, 20, outside(x, z)) * smoothstep(0.35, 0.6, slope);
      // The overlook's ledge is bare stone and thin turf.
      rock = Math.max(rock, smoothstep(106, 118, x) * smoothstep(34, 22, Math.abs(z)) * (0.55 + n1 * 0.35) * smoothstep(-0.2, 0.6, rd.dirt));
      rock = Math.min(1, rock);
      // Forest floor: moss with patches of litter.
      const wLitter = lit * (1 - forest * 0.4) + forest * smoothstep(0.1, 0.6, n1) * 0.6;
      // Normalise, the hard surfaces winning.
      const hard = Math.min(1, cobble + wet + dirt * 0.95 + rock);
      const soft = 1 - hard;
      grass *= soft;
      moss *= soft;
      const lt = wLitter * soft * 0.9;
      grass *= 1 - wLitter * 0.9;
      moss *= 1 - wLitter * 0.9;
      const sum = grass + moss + lt + cobble + wet + dirt + rock + 1e-5;
      const k = (j * W + i) * 4;
      A[k] = (grass / sum) * 255;
      A[k + 1] = (dirt / sum) * 255;
      A[k + 2] = (cobble / sum) * 255;
      A[k + 3] = (rock / sum) * 255;
      B[k] = (moss / sum) * 255;
      B[k + 1] = (lt / sum) * 255;
      B[k + 2] = (wet / sum) * 255;
      // Puddles: on the wet cobbles and in the tunnel's dips.
      const puddle = smoothstep(0.35, 0.65, M(x / 5.5, z / 5.5) * 0.5 + 0.5 + N(x / 1.3, z / 1.3) * 0.12) * Math.max(wet, cobble * smoothstep(-120, -150, z));
      B[k + 3] = puddle * 255;
    }
  }
  const tex = (data) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  return { a: tex(A), b: tex(B), W, H, raw: { A, B }, extent: EXTENT };
}

/** Splat textures from raw layer weights (a zone that paints its own ground, like the Cinder Rift). */
export function splatTextures(A, B, W, H, extent) {
  const tex = (data) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  return { a: tex(A), b: tex(B), W, H, raw: { A, B }, extent };
}

/** Heights as a half-float texture for shaders that sit things on the ground (grass). */
export function heightTexture(grid) {
  const half = new Uint16Array(grid.w * grid.h);
  for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(grid.data[i]);
  const t = new THREE.DataTexture(half, grid.w, grid.h, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const TERRAIN_VERT_HEAD = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNormal;
`;

const TERRAIN_FRAG_HEAD = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray tCol;
uniform sampler2DArray tNor;
uniform sampler2DArray tArm;
uniform sampler2D tSplatA;
uniform sampler2D tSplatB;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uScale[7];
uniform float uRoughMin[7];
uniform float uWet;
uniform float uParallax;
varying vec3 vWPos;
varying vec3 vWNormal;
vec3 tNormalW;
float tRough;
float tAO;

vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// Relief-mapped uv for a cobble layer: stones stand proud of the mortar.
vec2 reliefUv(float layer, vec2 uv, vec3 V, float depth) {
  vec3 Vt = vec3(V.x, -V.z, max(V.y, 0.25));
  vec2 P = Vt.xy / Vt.z * depth;
  const int STEPS = 10;
  float dl = 1.0 / float(STEPS);
  float cur = 0.0;
  vec2 cuv = uv;
  float h = 1.0 - texture(tArm, vec3(cuv, layer)).b;
  for (int i = 0; i < STEPS; i++) {
    if (cur >= h) break;
    cuv -= P * dl;
    cur += dl;
    h = 1.0 - texture(tArm, vec3(cuv, layer)).b;
  }
  // One step of refinement between the last two samples.
  vec2 puv = cuv + P * dl;
  float after = h - cur;
  float before = (1.0 - texture(tArm, vec3(puv, layer)).b) - (cur - dl);
  float denom = after - before;
  float t = abs(denom) > 1e-5 ? after / denom : 0.0;
  return mix(cuv, puv, clamp(t, 0.0, 1.0));
}
`;

const TERRAIN_FRAG_MAIN = /* glsl */ `
vec2 suv = (vWPos.xz - uExtent.xy) / uExtent.zw;
vec4 sa = texture2D(tSplatA, suv);
vec4 sb = texture2D(tSplatB, suv);
vec3 Ng = normalize(vWNormal);
vec3 V = normalize(cameraPosition - vWPos);
float dist = length(cameraPosition - vWPos);
vec3 macro = texture2D(tNoise, vWPos.xz / 97.0).rgb;
float var = texture2D(tNoise, vWPos.xz / 23.0).g;

float wts[7];
wts[0] = sa.r; wts[1] = sa.g; wts[2] = sa.b; wts[3] = 0.0; wts[4] = sb.r; wts[5] = sb.g; wts[6] = sb.b;
float rockW = max(sa.a, smoothstep(0.42, 0.62, 1.0 - Ng.y));
float rest = 1.0 - rockW;

// Height-aware blend: where two materials meet, the higher texel wins (stones poke through dirt).
float hb[7];
float hmax = 0.0;
vec2 uvs[7];
for (int i = 0; i < 7; i++) {
  if (i == 3) { hb[i] = 0.0; continue; }
  vec2 uv = vWPos.xz / uScale[i];
  // Break the tiling: a second, rotated sampling blended in by a slow noise.
  uvs[i] = uv;
  float h = wts[i] > 0.003 ? texture(tArm, vec3(uv, float(i))).b : 0.0;
  hb[i] = wts[i] > 0.003 ? wts[i] + h * 0.45 : 0.0;
  hmax = max(hmax, hb[i]);
}
float total = 0.0;
for (int i = 0; i < 7; i++) {
  hb[i] = max(hb[i] - hmax + 0.32, 0.0);
  total += hb[i];
}
vec3 col = vec3(0.0);
vec3 nts = vec3(0.0);
vec3 arm = vec3(0.0);
for (int i = 0; i < 7; i++) {
  float w = hb[i] / max(total, 1e-4);
  if (w < 0.004) continue;
  vec2 uv = uvs[i];
  if ((i == 2 || i == 6) && uParallax > 0.0 && dist < 28.0) {
    uv = reliefUv(float(i), uv, V, 0.045 * uParallax * smoothstep(28.0, 12.0, dist));
  }
  vec4 c = texture(tCol, vec3(uv, float(i)));
  vec3 n = texture(tNor, vec3(uv, float(i))).xyz * 2.0 - 1.0;
  vec3 a = texture(tArm, vec3(uv, float(i))).rgb;
  if (i == 0 || i == 1 || i == 4 || i == 5) {
    vec2 uv2 = rot2(uv * 0.61 + vec2(0.37, 0.11), 1.1);
    float k = smoothstep(0.35, 0.65, var);
    c = mix(c, texture(tCol, vec3(uv2, float(i))), k);
    n = mix(n, texture(tNor, vec3(uv2, float(i))).xyz * 2.0 - 1.0, k);
    a = mix(a, texture(tArm, vec3(uv2, float(i))).rgb, k);
  }
  a.g = max(a.g, uRoughMin[i]);
  col += c.rgb * w;
  nts += n * w;
  arm += a * w;
}
// Rock, projected three ways so cliffs don't smear.
vec3 bw = pow(abs(Ng), vec3(4.0));
bw /= (bw.x + bw.y + bw.z);
vec3 p = vWPos / uScale[3];
vec3 rc = texture(tCol, vec3(p.zy, 3.0)).rgb * bw.x + texture(tCol, vec3(p.xz, 3.0)).rgb * bw.y + texture(tCol, vec3(p.xy, 3.0)).rgb * bw.z;
vec3 ra = texture(tArm, vec3(p.zy, 3.0)).rgb * bw.x + texture(tArm, vec3(p.xz, 3.0)).rgb * bw.y + texture(tArm, vec3(p.xy, 3.0)).rgb * bw.z;
ra.g = max(ra.g, uRoughMin[3]);
vec3 tx = texture(tNor, vec3(p.zy, 3.0)).xyz * 2.0 - 1.0;
vec3 ty = texture(tNor, vec3(p.xz, 3.0)).xyz * 2.0 - 1.0;
vec3 tz = texture(tNor, vec3(p.xy, 3.0)).xyz * 2.0 - 1.0;
tx = vec3(tx.xy + Ng.zy, abs(tx.z) * Ng.x);
ty = vec3(ty.xy + Ng.xz, abs(ty.z) * Ng.y);
tz = vec3(tz.xy + Ng.xy, abs(tz.z) * Ng.z);
vec3 rockN = normalize(tx.zyx * bw.x + ty.xzy * bw.y + tz.xyz * bw.z);
// Moss on the tops of rocks in the forest, warm stone in the village.
rc *= mix(vec3(1.05, 0.98, 0.9), vec3(0.85, 0.85, 1.0), uWet);

// Tangent space (x east, y north = image up) to world.
vec3 axis = abs(Ng.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
vec3 T = normalize(axis - Ng * dot(Ng, axis));
vec3 Bt = normalize(cross(T, Ng));
nts.xy *= 1.15;
// Bt = cross(T, N) is +z (south); the image's up is north, so y goes in negated.
vec3 baseN = normalize(T * nts.x - Bt * nts.y + Ng * max(nts.z, 0.05));

col = mix(col, rc, rockW * (1.0 - rest * 0.0));
vec3 nW = normalize(mix(baseN, rockN, rockW));
arm = mix(arm, ra, rockW);

// Slow macro variation of tone, so distance doesn't show the repeats.
col *= 0.86 + macro.r * 0.3;
col = mix(col, col * vec3(1.08, 1.0, 0.86), macro.g * 0.5);

// Puddles and wet stone.
float puddle = sb.a * uWet;
float wet = clamp(puddle * 1.4, 0.0, 1.0);
float damp = uWet * (wts[6] + wts[2] * 0.5);
col *= mix(1.0, 0.5, max(wet, damp * 0.6));
float rough = arm.g;
rough = mix(rough, rough * 0.55, damp);
rough = mix(rough, 0.1, smoothstep(0.35, 0.8, wet));
nW = normalize(mix(nW, Ng, smoothstep(0.4, 0.85, wet)));

diffuseColor.rgb *= col;
tNormalW = nW;
tRough = clamp(rough, 0.04, 1.0);
tAO = mix(1.0, arm.r, 0.8);
`;

export function terrainMaterial(arrays, splat, noise) {
  const EXTENT = splat.extent;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const uniforms = {
    tCol: { value: arrays.color },
    tNor: { value: arrays.normal },
    tArm: { value: arrays.arm },
    tSplatA: { value: splat.a },
    tSplatB: { value: splat.b },
    tNoise: { value: noise },
    uExtent: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) },
    uScale: { value: LAYERS.map((l) => l.scale) },
    uRoughMin: { value: LAYERS.map((l) => l.rough ?? 0.5) },
    uWet: { value: 0 },
    uParallax: { value: 1 }
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = TERRAIN_VERT_HEAD + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWNormal = normalize(mat3(modelMatrix) * objectNormal);`
    );
    shader.fragmentShader = TERRAIN_FRAG_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', TERRAIN_FRAG_MAIN)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tNormalW, 0.0)).xyz);')
      .replace(
        '#include <aomap_fragment>',
        `float ambientOcclusion = tAO;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNVao = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVao, ambientOcclusion, material.roughness );
        #endif`
      );
  };
  mat.customProgramCacheKey = () => 'gloam-terrain';
  return mat;
}

/** One chunk's grid (with skirts), sampled from the height grid every `step` metres. */
function chunkGeometry(grid, cx0, cz0, sizeX, sizeZ, step) {
  const nx = Math.max(1, Math.round(sizeX / step));
  const nz = Math.max(1, Math.round(sizeZ / step));
  const sxs = sizeX / nx;
  const szs = sizeZ / nz;
  const verts = (nx + 1) * (nz + 1);
  const skirt = 2 * (nx + 1) + 2 * (nz + 1);
  const pos = new Float32Array((verts + skirt) * 3);
  const nor = new Float32Array((verts + skirt) * 3);
  const idx = [];
  const nrm = (x, z) => {
    const e = 1;
    const dx = (grid.at(x + e, z) - grid.at(x - e, z)) / (2 * e);
    const dz = (grid.at(x, z + e) - grid.at(x, z - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    return [-dx / l, 1 / l, -dz / l];
  };
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = cx0 + i * sxs;
      const z = cz0 + j * szs;
      const k = (j * (nx + 1) + i) * 3;
      pos[k] = x;
      pos[k + 1] = grid.at(x, z);
      pos[k + 2] = z;
      const nn = nrm(x, z);
      nor.set(nn, k);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Skirts: each edge's vertices again, dropped, stitched to the edge.
  let s = verts;
  const edges = [
    Array.from({ length: nx + 1 }, (_, i) => i),
    Array.from({ length: nx + 1 }, (_, i) => nz * (nx + 1) + i),
    Array.from({ length: nz + 1 }, (_, j) => j * (nx + 1)),
    Array.from({ length: nz + 1 }, (_, j) => j * (nx + 1) + nx)
  ];
  for (const edge of edges) {
    const start = s;
    for (const v of edge) {
      pos[s * 3] = pos[v * 3];
      pos[s * 3 + 1] = pos[v * 3 + 1] - 3;
      pos[s * 3 + 2] = pos[v * 3 + 2];
      nor.set(nor.subarray(v * 3, v * 3 + 3), s * 3);
      s++;
    }
    for (let k = 0; k < edge.length - 1; k++) {
      const a = edge[k];
      const b = edge[k + 1];
      const c = start + k;
      const d = start + k + 1;
      idx.push(a, b, c, b, d, c, a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export class Terrain {
  constructor(grid, material, { farStep = 4 } = {}) {
    const EXTENT = grid.extent;
    this.group = new THREE.Group();
    this.chunks = [];
    for (let z = EXTENT.z0; z < EXTENT.z1 - 0.01; z += CHUNK) {
      for (let x = EXTENT.x0; x < EXTENT.x1 - 0.01; x += CHUNK) {
        const sx = Math.min(CHUNK, EXTENT.x1 - x);
        const sz = Math.min(CHUNK, EXTENT.z1 - z);
        const near = new THREE.Mesh(chunkGeometry(grid, x, z, sx, sz, STEP), material);
        const far = new THREE.Mesh(chunkGeometry(grid, x, z, sx, sz, farStep), material);
        for (const m of [near, far]) {
          m.receiveShadow = true;
          m.castShadow = true;
          m.matrixAutoUpdate = false;
          this.group.add(m);
        }
        far.visible = false;
        this.chunks.push({ near, far, cx: x + sx / 2, cz: z + sz / 2 });
      }
    }
  }

  /** Near chunks in full detail, far ones coarse. */
  update(camera, nearDist = 130) {
    for (const c of this.chunks) {
      const d = Math.hypot(c.cx - camera.position.x, c.cz - camera.position.z);
      const near = d < nearDist;
      c.near.visible = near;
      c.far.visible = !near;
    }
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
  }
}

/** Pond water: dark, glossy, rippling, reflecting the sky (the ones `keep` allows: the zone's). */
export function ponds(textures, keep = () => true) {
  const group = new THREE.Group();
  const ripples = textures.ripples();
  const mats = [];
  for (const p of PONDS.filter((q) => keep(q.x, q.z))) {
    const geo = new THREE.CircleGeometry(p.r * 1.25, 48);
    geo.rotateX(-Math.PI / 2);
    const forest = p.zone === 'gloamwood';
    const mat = new THREE.MeshStandardMaterial({
      color: forest ? 0x0a0618 : 0x0b1410,
      roughness: 0.04,
      metalness: 0.0,
      normalMap: ripples,
      normalScale: new THREE.Vector2(0.18, 0.18),
      transparent: true,
      opacity: 0.94,
      envMapIntensity: 1.6
    });
    mat.userData.ripples = true;
    mats.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, p.level, p.z);
    m.receiveShadow = true;
    group.add(m);
  }
  return {
    group,
    update(t) {
      ripples.offset.set(t * 0.012, t * 0.008);
    }
  };
}
