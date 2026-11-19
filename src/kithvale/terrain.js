/**
 * The vale's ground, after Wyldhunt's splatted terrain (chunked meshes with
 * a near and a far level of detail, skirts against cracks), repainted: the
 * ground is laid in a few broad painted masses — sunlit meadow, deeper
 * grass, olive dry patches, the warm ochre road with ragged edges, packed
 * earth and flagstones in the village, lavender-grey rock, moss in the wood,
 * pale pebbles on the banks — with photographed ground showing through only
 * faintly as fine detail, and long brush strokes of colour across it all.
 */
import * as THREE from 'three';
import { EXTENT as WHOLE, VILLAGE, CRAGS, FOREST, MEADOW, POND, GARDEN } from './map.js';
import { heightAt, roadDistance, trailDistance, streamDistance, streamHalf, waterAt, pavedAt, inVillage, rimAt } from './heights.js';
import { simplex2, smoothstep } from '../gloamreach/noise.js';
import { painterly } from './paint.js';

export const LAYERS = [
  { id: 'Grass004', fallback: '#5a7a2a', scale: 3.0 },
  { id: 'Ground068', fallback: '#7a6040', scale: 3.0 },
  { id: 'PavingStones141', fallback: '#8a8070', scale: 2.6 },
  { id: 'Rock051', fallback: '#7a7470', scale: 6 },
  { id: 'Moss002', fallback: '#3a5a2a', scale: 3 },
  { id: 'Ground106', fallback: '#6a5a40', scale: 2.4 }
];

const STEP = 1;
const CHUNK = 64;

/** Heights on the 1 m grid, computed once (the mesh, the grass, the minimap and the colliders use it). */
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
 * The splat maps, 1 m a texel. A: road earth, flagstones, rock, forest moss.
 * B: meadow, pebble banks, damp (by the water), village earth.
 */
export function splatMaps(grid) {
  const EXTENT = grid.extent ?? WHOLE;
  const W = EXTENT.x1 - EXTENT.x0;
  const H = EXTENT.z1 - EXTENT.z0;
  const A = new Uint8Array(W * H * 4);
  const B = new Uint8Array(W * H * 4);
  const N = simplex2(77);
  const M = simplex2(78);
  for (let j = 0; j < H; j++) {
    const z = EXTENT.z0 + j + 0.5;
    for (let i = 0; i < W; i++) {
      const x = EXTENT.x0 + i + 0.5;
      const n1 = N(x / 11, z / 11);
      const n2 = M(x / 2.8, z / 2.8);
      const hx = grid.at(x + 0.5, z) - grid.at(x - 0.5, z);
      const hz = grid.at(x, z + 0.5) - grid.at(x, z - 0.5);
      const slope = Math.hypot(hx, hz);
      const h = grid.at(x, z);
      const vil = inVillage(x, z);
      const rd = roadDistance(x, z).d;
      const td = trailDistance(x, z);
      // The road: a worn ribbon with ragged, grassy edges; the trails narrower and fainter.
      let road = smoothstep(2.9, 1.6, rd + n2 * 0.55 + n1 * 0.3);
      road = Math.max(road, smoothstep(1.5, 0.6, td + n2 * 0.4) * 0.85);
      let paved = vil && pavedAt(x, z) ? smoothstep(-0.2, 0.3, n2 * 0.3 + 0.6) : 0;
      let earth = vil ? 1 : 0;
      if (vil) road *= 0.4;
      // Round the gate, trodden earth spills out a little.
      if (!vil && z < VILLAGE.z1 + 10 && z > VILLAGE.z1 - 2 && Math.abs(x) < 9) earth = Math.max(earth, smoothstep(10, 2, z - VILLAGE.z1 + Math.abs(x) * 0.5 + n2) * 0.8);
      // Garden: soft grass, not earth.
      if (Math.hypot(x - GARDEN.x, z - GARDEN.z) < GARDEN.r - 0.5) earth = 0.15;
      // Rock: steep ground, the crags, the high rim.
      let rock = smoothstep(1.7, 2.3, slope + n1 * 0.25) * 0.7;
      const dc = Math.hypot(x - CRAGS.x, z - CRAGS.z) / CRAGS.r;
      rock = Math.max(rock, smoothstep(0.9, 0.3, dc + n1 * 0.35) * smoothstep(0.15, 0.4, slope + n2 * 0.1));
      // The wood's floor.
      const df = Math.hypot((x - FOREST.x) / FOREST.rx, (z - FOREST.z) / FOREST.rz);
      const moss = smoothstep(1.05, 0.7, df + n1 * 0.12);
      // Banks.
      const st = streamDistance(x, z);
      const bank = st.d - streamHalf(st.s);
      let pebble = smoothstep(1.4, -0.4, bank + n2 * 0.6);
      const dp = Math.hypot(x - POND.x, z - POND.z) / POND.r;
      pebble = Math.max(pebble, smoothstep(1.32, 1.05, dp + n2 * 0.05));
      if (waterAt(x, z) > h) pebble = 1;
      const damp = Math.max(smoothstep(6, 0, bank), smoothstep(1.9, 1.0, dp));
      const meadow = smoothstep(1.0, 0.55, Math.hypot(x - MEADOW.x, z - MEADOW.z) / MEADOW.r + n1 * 0.1);
      const hard = Math.min(1, road + paved + rock + pebble);
      earth *= 1 - Math.min(1, paved + road);
      const k = (j * W + i) * 4;
      A[k] = road * 255;
      A[k + 1] = paved * 255;
      A[k + 2] = Math.min(1, rock) * (1 - pebble * 0.6) * 255;
      A[k + 3] = moss * (1 - hard) * 255;
      B[k] = meadow * (1 - hard) * 255;
      B[k + 1] = pebble * 255;
      B[k + 2] = damp * 255;
      B[k + 3] = earth * 255;
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

/** Heights as a half-float texture for shaders that sit things on the ground (grass, flowers). */
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
uniform sampler2D tSplatA;
uniform sampler2D tSplatB;
uniform sampler2D tNoise;
uniform vec4 uExtent;
uniform float uScale[6];
uniform float uDetail;
varying vec3 vWPos;
varying vec3 vWNormal;
vec3 tNormalW;
float tRough;

vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// How much brighter or darker than its average the photographed detail is, here (painted over, faint).
float detailOf(float layer, vec2 uv) {
  vec3 c = texture(tCol, vec3(uv, layer)).rgb;
  vec3 c2 = texture(tCol, vec3(rot2(uv * 0.61, 1.3) + 0.37, layer)).rgb;
  float l = dot(mix(c, c2, 0.4), vec3(0.3, 0.55, 0.15));
  return l;
}
`;

const FRAG_MAIN = /* glsl */ `
vec2 suv = (vWPos.xz - uExtent.xy) / uExtent.zw;
vec4 sa = texture2D(tSplatA, suv);
vec4 sb = texture2D(tSplatB, suv);
vec3 Ng = normalize(vWNormal);
// Broad painted masses: the noise at three scales picks among a few greens.
float big = texture2D(tNoise, vWPos.xz / 210.0).r;
float mid = texture2D(tNoise, vWPos.xz / 61.0).g;
float fine = texture2D(tNoise, vWPos.xz / 13.0).b;
// Brush strokes: noise stretched along a slowly turning direction.
float ang = big * 6.0;
vec2 bp = rot2(vWPos.xz, ang);
float stroke = texture2D(tNoise, bp * vec2(0.012, 0.07)).g - 0.5;
vec3 sunlit = vec3(0.38, 0.58, 0.3);
vec3 deep = vec3(0.25, 0.46, 0.24);
vec3 dry = vec3(0.5, 0.56, 0.32);
vec3 grass = mix(deep, sunlit, smoothstep(0.3, 0.7, mid + (big - 0.5) * 0.6));
grass = mix(grass, dry, smoothstep(0.6, 0.85, big + fine * 0.2) * 0.4);
grass = mix(grass, vec3(0.5, 0.66, 0.32), sb.r * 0.3);
vec3 col = grass;
float dl = detailOf(0.0, vWPos.xz / uScale[0]);
float detail = mix(1.0, dl / 0.32, uDetail * 0.42);
// Forest floor: moss and old leaves, darker.
vec3 moss = mix(vec3(0.24, 0.36, 0.16), vec3(0.36, 0.34, 0.18), smoothstep(0.4, 0.7, fine));
float dm = detailOf(4.0, vWPos.xz / uScale[4]);
col = mix(col, moss, sa.a);
detail = mix(detail, mix(1.0, dm / 0.3, uDetail * 0.45), sa.a);
// Village earth.
vec3 earth = mix(vec3(0.66, 0.54, 0.38), vec3(0.74, 0.62, 0.44), fine);
float de = detailOf(5.0, vWPos.xz / uScale[5]);
col = mix(col, earth, sb.a);
detail = mix(detail, mix(1.0, de / 0.36, uDetail * 0.5), sb.a);
// The road: warm ochre, lighter down the middle, ruts.
vec3 roadC = mix(vec3(0.66, 0.5, 0.32), vec3(0.78, 0.63, 0.42), smoothstep(0.3, 0.8, fine + sa.r * 0.3));
float dr = detailOf(1.0, vWPos.xz / uScale[1]);
col = mix(col, roadC, sa.r);
detail = mix(detail, mix(1.0, dr / 0.38, uDetail * 0.55), sa.r);
// Flagstones.
vec3 flag = vec3(0.7, 0.62, 0.52);
float dpv = detailOf(2.0, vWPos.xz / uScale[2]);
col = mix(col, flag, sa.g);
detail = mix(detail, mix(1.0, dpv / 0.36, 0.85), sa.g);
// Pebble banks.
vec3 peb = mix(vec3(0.62, 0.6, 0.52), vec3(0.5, 0.48, 0.44), fine);
col = mix(col, peb, sb.g);
detail = mix(detail, mix(1.0, detailOf(3.0, vWPos.xz / 1.8) / 0.4, 0.5), sb.g);
// Rock: lavender-grey, projected three ways on steep faces.
float rockW = clamp(max(sa.b, smoothstep(0.7, 0.85, 1.0 - Ng.y)), 0.0, 1.0);
if (rockW > 0.004) {
  vec3 bw = pow(abs(Ng), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
  vec3 P = vWPos / uScale[3];
  float rl = dot(texture(tCol, vec3(P.zy, 3.0)).rgb * bw.x + texture(tCol, vec3(P.xz, 3.0)).rgb * bw.y + texture(tCol, vec3(P.xy, 3.0)).rgb * bw.z, vec3(0.33));
  vec3 rockC = mix(vec3(0.5, 0.47, 0.5), vec3(0.66, 0.6, 0.55), smoothstep(0.3, 0.7, mid));
  // Grass settles on every ledge.
  float ledge = smoothstep(0.7, 0.9, Ng.y + (fine - 0.5) * 0.3) * (1.0 - sa.b * 0.6);
  rockC = mix(rockC, grass, ledge);
  col = mix(col, rockC, rockW);
  detail = mix(detail, mix(1.0, rl / 0.36, 0.7), rockW);
}
col *= detail;
col *= 1.0 + stroke * 0.16;
col = mix(col, col * vec3(0.95, 1.02, 0.9), (mid - 0.5) * 0.6);
// Damp by the water: darker, a little richer.
col *= mix(1.0, 0.78, sb.b * (1.0 - sa.r));
diffuseColor.rgb *= col;
// Relief from the detail normals, kept gentle.
vec3 nts = texture(tNor, vec3(vWPos.xz / uScale[0], 0.0)).xyz * 2.0 - 1.0;
nts = mix(nts, texture(tNor, vec3(vWPos.xz / uScale[1], 1.0)).xyz * 2.0 - 1.0, sa.r);
nts = mix(nts, texture(tNor, vec3(vWPos.xz / uScale[2], 2.0)).xyz * 2.0 - 1.0, sa.g);
vec3 axis = abs(Ng.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
vec3 T = normalize(axis - Ng * dot(Ng, axis));
vec3 Bt = normalize(cross(T, Ng));
nts.xy *= 0.35 + sa.g * 0.6;
tNormalW = normalize(T * nts.x - Bt * nts.y + Ng * max(nts.z, 0.05));
tRough = mix(0.95, 0.75, sb.b);
`;

export function terrainMaterial(arrays, splat, noise) {
  const EXTENT = splat.extent ?? WHOLE;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const uniforms = {
    tCol: { value: arrays.color },
    tNor: { value: arrays.normal },
    tSplatA: { value: splat.a },
    tSplatB: { value: splat.b },
    tNoise: { value: noise },
    uExtent: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) },
    uScale: { value: LAYERS.map((l) => l.scale) },
    uDetail: { value: arrays.painted ? 0 : 1 }
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
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tNormalW, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'kith-terrain';
  return painterly(mat, { wrap: 0.45, rim: 0.12, shade: 0.22 });
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
    const dx = (grid.at(x + 1, z) - grid.at(x - 1, z)) / 2;
    const dz = (grid.at(x, z + 1) - grid.at(x, z - 1)) / 2;
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
      if (Math.abs(pos[a * 3 + 1] - pos[d * 3 + 1]) < Math.abs(pos[b * 3 + 1] - pos[c * 3 + 1])) idx.push(a, c, d, a, d, b);
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
      pos[s * 3 + 1] = pos[v * 3 + 1] - 20;
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

  update(camera, nearDist = 150) {
    for (const c of this.chunks) {
      const near = Math.hypot(c.cx - camera.position.x, c.cz - camera.position.z) < nearDist;
      c.near.visible = near;
      c.far.visible = !near;
    }
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
  }
}
