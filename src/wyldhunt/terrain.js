/**
 * The gorge's ground: heights.js made into chunked meshes (near and far
 * detail, skirts against cracks), painted from a splat map that blends
 * photographed materials — the jungle floor, trodden mud, the ruins' old
 * flagstones, river pebbles, moss and grass — and, on the walls, rock
 * projected three ways with moss settling on every ledge (by slope and by
 * height, thicker where the falls keep it damp). Everything near water, and
 * everything when it rains, is wet: darker and glossy.
 */
import * as THREE from 'three';
import { EXTENT as WHOLE } from './map.js';
import { heightAt, canyonAt, pathDistance, pavedAt, riverDistance, waterAt, slopeAt } from './heights.js';
import { FALLS } from './map.js';
import { simplex2, smoothstep } from '../gloamreach/noise.js';

export const LAYERS = [
  { id: 'Ground068', fallback: '#5a5a2a', scale: 3.4, rough: 0.85, tint: [0.92, 0.95, 0.85] },
  { id: 'Ground106', fallback: '#6a4a30', scale: 3.0, rough: 0.8, tint: [0.85, 0.8, 0.75] },
  { id: 'Bricks113A', fallback: '#8a8070', scale: 3.4, rough: 0.7, tint: [0.78, 0.82, 0.76] },
  { id: 'Rock051', fallback: '#6a6a66', scale: 6, rough: 0.6, tint: [0.62, 0.66, 0.66] },
  { id: 'Moss002', fallback: '#3a6a2a', scale: 3.2, rough: 0.85, tint: [0.62, 0.8, 0.5] },
  { id: 'Ground108', fallback: '#6a6050', scale: 2.4, rough: 0.6, tint: [0.75, 0.75, 0.72] },
  { id: 'Grass004', fallback: '#4a7a2a', scale: 3.0, rough: 0.85, tint: [0.8, 0.95, 0.65] },
  { id: 'Rock063', fallback: '#5a6a3a', scale: 5, rough: 0.75, tint: [0.72, 0.85, 0.62] }
];

const STEP = 1;
const CHUNK = 64;

/** Heights on the 1 m grid over `extent` (a zone's bounds; the whole map by default), computed once (the mesh, the grass and the splat all use it). */
export function heightGrid(extent = WHOLE) {
  const EXTENT = extent;
  const w = Math.round((EXTENT.x1 - EXTENT.x0) / STEP) + 1;
  const h = Math.round((EXTENT.z1 - EXTENT.z0) / STEP) + 1;
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = heightAt(EXTENT.x0 + i * STEP, EXTENT.z0 + j * STEP);
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

/**
 * The splat maps (1 m a texel): A = floor, mud, flagstones, cliff;
 * B = moss, pebbles, grass, damp (how wet the place always is).
 */
export function splatMaps(grid) {
  const EXTENT = grid.extent ?? WHOLE;
  const CELL = 1;
  const W = Math.round((EXTENT.x1 - EXTENT.x0) / CELL);
  const H = Math.round((EXTENT.z1 - EXTENT.z0) / CELL);
  const A = new Uint8Array(W * H * 4);
  const B = new Uint8Array(W * H * 4);
  const N = simplex2(77);
  const M = simplex2(78);
  for (let j = 0; j < H; j++) {
    const z = EXTENT.z0 + (j + 0.5) * CELL;
    for (let i = 0; i < W; i++) {
      const x = EXTENT.x0 + (i + 0.5) * CELL;
      const n1 = N(x / 9, z / 9);
      const n2 = M(x / 2.6, z / 2.6);
      const hx = grid.at(x + 0.5, z) - grid.at(x - 0.5, z);
      const hz = grid.at(x, z + 0.5) - grid.at(x, z - 0.5);
      const slope = Math.hypot(hx, hz);
      const c = canyonAt(x, z);
      const h = grid.at(x, z);
      const pd = pathDistance(x, z);
      const rv = riverDistance(x, z);
      let floor = 1;
      let mud = smoothstep(2.6, 0.6, pd + n2 * 0.7) * (0.8 + n1 * 0.2);
      let paved = 0;
      if (pd < 4 && pavedAt(x, z)) {
        paved = smoothstep(2.8, 1.4, pd + n2 * 0.5);
        paved *= smoothstep(-0.3, 0.2, n2 * 0.7 + 0.25);
        mud *= 1 - paved;
      }
      // Banks: pebbles at the water's edge, mud a little above.
      const bank = rv.d - rv.w;
      let pebble = smoothstep(2.5, -0.5, bank + n2 * 0.8);
      for (const fl of FALLS) {
        const dp = Math.hypot(x - fl.pool.x, z - fl.pool.z) / fl.pool.r;
        pebble = Math.max(pebble, smoothstep(1.35, 0.9, dp + n2 * 0.08));
      }
      mud = Math.max(mud, smoothstep(6, 1.5, bank + n1 * 2) * 0.6 * (1 - pebble));
      // The camp's ground is trodden bare.
      const camp = smoothstep(16, 9, Math.hypot(x - 4, z - 352) + n2 * 2);
      mud = Math.max(mud, camp * 0.85);
      const water = waterAt(x, z) > h;
      if (water) pebble = 1;
      let cliff = Math.max(smoothstep(0.85, 1.3, slope), smoothstep(-2, 6, c.e) * 0.85);
      cliff = Math.min(1, cliff);
      // The floor: moss in the shade under the walls and round the falls, grass in the open meadow.
      let moss = smoothstep(-24, -6, c.e) * 0.8 + smoothstep(0.2, 0.7, n1) * 0.35;
      let grass = smoothstep(0.05, 0.55, -n1 * 0.6 + 0.2) * smoothstep(-8, -30, c.e) * 0.9;
      // Damp: by the water, in the falls' mist, along the walls' feet.
      let damp = smoothstep(14, 0, bank) * 0.8 + smoothstep(-8, 2, c.e) * 0.35;
      for (const fl of FALLS) {
        const dp = Math.hypot(x - fl.pool.x, z - fl.pool.z);
        damp = Math.max(damp, smoothstep(fl.pool.r * 3.2, fl.pool.r * 0.8, dp));
      }
      damp = Math.min(1, damp);
      const hard = Math.min(1, mud + paved + pebble + cliff);
      const soft = 1 - hard;
      floor *= soft;
      moss *= soft;
      grass *= soft * (1 - moss * 0.6);
      const sum = floor + mud + paved + cliff + moss + pebble + grass + 1e-5;
      const k = (j * W + i) * 4;
      A[k] = (floor / sum) * 255;
      A[k + 1] = (mud / sum) * 255;
      A[k + 2] = (paved / sum) * 255;
      A[k + 3] = (cliff / sum) * 255;
      B[k] = (moss / sum) * 255;
      B[k + 1] = (pebble / sum) * 255;
      B[k + 2] = (grass / sum) * 255;
      B[k + 3] = damp * 255;
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
  void slopeAt;
  return { a: tex(A), b: tex(B), W, H, raw: { A, B }, extent: EXTENT };
}

/** Heights as a half-float texture for shaders that sit things on the ground (grass, rain splashes). */
export function heightTexture(grid) {
  const half = new Uint16Array(grid.w * grid.h);
  for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(grid.data[i]);
  const t = new THREE.DataTexture(half, grid.w, grid.h, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const VERT_HEAD = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNormal;
`;

const FRAG_HEAD = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray tCol;
uniform sampler2DArray tNor;
uniform sampler2DArray tArm;
uniform sampler2D tSplatA;
uniform sampler2D tSplatB;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uScale[8];
uniform float uRoughMin[8];
uniform float uRain;
uniform float uTime;
varying vec3 vWPos;
varying vec3 vWNormal;
vec3 tNormalW;
float tRough;
float tAO;

vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// A layer projected three ways (cliffs): colour, packed AO/rough/height, and a world normal.
void triplanar(float layer, vec3 P, vec3 Ng, vec3 bw, out vec3 col, out vec3 arm, out vec3 nW) {
  vec3 p = P / uScale[int(layer)];
  col = texture(tCol, vec3(p.zy, layer)).rgb * bw.x + texture(tCol, vec3(p.xz, layer)).rgb * bw.y + texture(tCol, vec3(p.xy, layer)).rgb * bw.z;
  arm = texture(tArm, vec3(p.zy, layer)).rgb * bw.x + texture(tArm, vec3(p.xz, layer)).rgb * bw.y + texture(tArm, vec3(p.xy, layer)).rgb * bw.z;
  vec3 tx = texture(tNor, vec3(p.zy, layer)).xyz * 2.0 - 1.0;
  vec3 ty = texture(tNor, vec3(p.xz, layer)).xyz * 2.0 - 1.0;
  vec3 tz = texture(tNor, vec3(p.xy, layer)).xyz * 2.0 - 1.0;
  tx = vec3(tx.xy + Ng.zy, abs(tx.z) * Ng.x);
  ty = vec3(ty.xy + Ng.xz, abs(ty.z) * Ng.y);
  tz = vec3(tz.xy + Ng.xy, abs(tz.z) * Ng.z);
  nW = normalize(tx.zyx * bw.x + ty.xzy * bw.y + tz.xyz * bw.z);
}
`;

const FRAG_MAIN = /* glsl */ `
vec2 suv = (vWPos.xz - uExtent.xy) / uExtent.zw;
vec4 sa = texture2D(tSplatA, suv);
vec4 sb = texture2D(tSplatB, suv);
vec3 Ng = normalize(vWNormal);
vec3 macro = texture2D(tNoise, vWPos.xz / 97.0).rgb;
float var = texture2D(tNoise, vWPos.xz / 23.0).g;

float wts[8];
wts[0] = sa.r; wts[1] = sa.g; wts[2] = sa.b; wts[3] = 0.0; wts[4] = sb.r; wts[5] = sb.g; wts[6] = sb.b; wts[7] = 0.0;
float rockW = clamp(max(sa.a * 1.15, smoothstep(0.36, 0.6, 1.0 - Ng.y)), 0.0, 1.0);

float hb[8];
float hmax = 0.0;
vec2 uvs[8];
for (int i = 0; i < 8; i++) {
  if (i == 3 || i == 7) { hb[i] = 0.0; uvs[i] = vec2(0.0); continue; }
  vec2 uv = vWPos.xz / uScale[i];
  uvs[i] = uv;
  float h = wts[i] > 0.003 ? texture(tArm, vec3(uv, float(i))).b : 0.0;
  hb[i] = wts[i] > 0.003 ? wts[i] + h * 0.5 : 0.0;
  hmax = max(hmax, hb[i]);
}
float total = 0.0;
for (int i = 0; i < 8; i++) {
  hb[i] = max(hb[i] - hmax + 0.3, 0.0);
  total += hb[i];
}
vec3 col = vec3(0.0);
vec3 nts = vec3(0.0);
vec3 arm = vec3(0.0);
for (int i = 0; i < 8; i++) {
  float w = hb[i] / max(total, 1e-4);
  if (w < 0.004) continue;
  vec2 uv = uvs[i];
  vec4 c = texture(tCol, vec3(uv, float(i)));
  vec3 n = texture(tNor, vec3(uv, float(i))).xyz * 2.0 - 1.0;
  vec3 a = texture(tArm, vec3(uv, float(i))).rgb;
  if (i != 2) {
    vec2 uv2 = rot2(uv * 0.63 + vec2(0.37, 0.11), 1.1);
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
vec3 axis = abs(Ng.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
vec3 T = normalize(axis - Ng * dot(Ng, axis));
vec3 Bt = normalize(cross(T, Ng));
nts.xy *= 1.15;
vec3 baseN = normalize(T * nts.x - Bt * nts.y + Ng * max(nts.z, 0.05));

// The walls: bare grey rock on the risers, mossy rock on every ledge — more moss low and damp, less high and dry.
vec3 nW = baseN;
if (rockW > 0.004) {
  vec3 bw = pow(abs(Ng), vec3(4.0));
  bw /= (bw.x + bw.y + bw.z);
  vec3 rc, ra, rn;
  triplanar(3.0, vWPos, Ng, bw, rc, ra, rn);
  float ledge = smoothstep(0.42, 0.78, Ng.y + (macro.g - 0.5) * 0.45);
  float lowDamp = smoothstep(70.0, 10.0, vWPos.y - 15.0) * 0.35 + sb.a * 0.45;
  float drip = smoothstep(0.62, 0.9, texture2D(tNoise, vec2(vWPos.x * 0.05 + vWPos.z * 0.05, vWPos.y * 0.008)).g) * smoothstep(0.85, 0.2, Ng.y);
  float mossK = clamp(ledge + lowDamp * smoothstep(0.1, 0.5, Ng.y + 0.3) + drip * 0.55, 0.0, 1.0);
  if (mossK > 0.01) {
    vec3 mc, ma, mn;
    triplanar(7.0, vWPos, Ng, bw, mc, ma, mn);
    // Moss sits in the rock's hollows first.
    float hollow = smoothstep(0.65, 0.25, ra.b);
    float m = clamp(mossK * 1.25 + hollow * mossK * 0.6 - 0.15, 0.0, 1.0);
    rc = mix(rc, mc, m);
    ra = mix(ra, ma, m);
    rn = normalize(mix(rn, mn, m));
  }
  ra.g = max(ra.g, uRoughMin[3]);
  // Weathering streaks run down the faces.
  float streak = texture2D(tNoise, vec2(vWPos.x * 0.11 + vWPos.z * 0.09, vWPos.y * 0.012)).r;
  rc *= mix(1.0, 0.72 + streak * 0.45, smoothstep(0.7, 0.2, Ng.y));
  col = mix(col, rc, rockW);
  nW = normalize(mix(baseN, rn, rockW));
  arm = mix(arm, ra, rockW);
}

col *= 0.86 + macro.r * 0.28;
col = mix(col, col * vec3(0.92, 1.04, 0.86), macro.g * 0.5);

// Wet: always by the water and in the falls' mist; everywhere in the rain (most on what faces up).
float wet = clamp(sb.a * 0.85 + uRain * (0.45 + 0.4 * max(Ng.y, 0.0)), 0.0, 1.0);
float porous = 1.0 - wts[2] * 0.4;
col *= mix(1.0, 0.58, wet * porous);
float rough = mix(arm.g, arm.g * 0.32, wet);
// Puddles on the trodden mud when it rains.
float pud = smoothstep(0.55, 0.75, texture2D(tNoise, vWPos.xz * 0.045).b) * wts[1] * uRain * smoothstep(0.75, 0.95, Ng.y);
rough = mix(rough, 0.05, pud);
col *= 1.0 - pud * 0.35;
nW = normalize(mix(nW, Ng, pud));

diffuseColor.rgb *= col;
tNormalW = nW;
tRough = clamp(rough, 0.05, 1.0);
tAO = mix(1.0, arm.r, 0.85);
`;

export function terrainMaterial(arrays, splat, noise) {
  const EXTENT = splat.extent ?? WHOLE;
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
    uRain: { value: 0 },
    uTime: { value: 0 }
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWNormal = normalize(mat3(modelMatrix) * objectNormal);`
    );
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', FRAG_MAIN)
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
  mat.customProgramCacheKey = () => 'wyld-terrain';
  return mat;
}

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
      nor.set(nrm(x, z), k);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      // Split each quad along the diagonal that follows the land (no saw-tooth on ledges).
      const ha = pos[a * 3 + 1];
      const hb = pos[b * 3 + 1];
      const hc = pos[c * 3 + 1];
      const hd = pos[d * 3 + 1];
      if (Math.abs(ha - hd) < Math.abs(hb - hc)) idx.push(a, c, d, a, d, b);
      else idx.push(a, c, b, b, c, d);
    }
  }
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
      pos[s * 3 + 1] = pos[v * 3 + 1] - 30;
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

/** The land in chunks, each with a fine and a coarse mesh; the near ones fine. */
export class Terrain {
  constructor(grid, material, { farStep = 2 } = {}) {
    const EXTENT = grid.extent ?? WHOLE;
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

  update(camera, nearDist = 230) {
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
