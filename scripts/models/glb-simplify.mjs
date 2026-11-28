/**
 * Shrinks a scanned, textured GLB (one texture, float positions + UVs, any node tree) into one small
 * mesh for the game: node transforms baked in, corners welded, simplified with meshoptimizer (UVs kept
 * by weight), feet on y = 0 and centred, its texture kept as is.
 *
 *   node scripts/models/glb-simplify.mjs <in.glb> <out.glb> [--tris 80000] [--height 6.2]
 *
 * --height scales it so its full height is that many metres (else the source's units are kept).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from '../../node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js';

const args = process.argv.slice(2);
const [src, out] = args;
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const targetTris = opt('tris', 80000);
const height = opt('height', 0);

const buf = readFileSync(src);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function read(accIndex) {
  const a = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[a.bufferView];
  const n = SIZE[a.type];
  const off = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const out = new Float64Array(a.count * n);
  const reader = { 5126: [4, (o) => bin.readFloatLE(o)], 5125: [4, (o) => bin.readUInt32LE(o)], 5123: [2, (o) => bin.readUInt16LE(o)], 5121: [1, (o) => bin[o]] }[a.componentType];
  if (!reader) throw new Error(`component type ${a.componentType}`);
  const stride = bv.byteStride ?? reader[0] * n;
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = reader[1](off + i * stride + k * reader[0]);
  return out;
}

// world matrices (column-major 4×4)
const mul = (a, b) => {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
};
const local = (n) => {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1
  ];
};
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const pos = [];
const uv = [];
const idx = [];
function visit(ni, parent) {
  const n = gltf.nodes[ni];
  const m = mul(parent, local(n));
  if (n.mesh != null) {
    for (const p of gltf.meshes[n.mesh].primitives) {
      const P = read(p.attributes.POSITION);
      const T = p.attributes.TEXCOORD_0 != null ? read(p.attributes.TEXCOORD_0) : new Float64Array((P.length / 3) * 2);
      const base = pos.length / 3;
      for (let i = 0; i < P.length; i += 3) {
        const [x, y, z] = [P[i], P[i + 1], P[i + 2]];
        pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
      }
      for (const t of T) uv.push(t);
      const ind = p.indices != null ? read(p.indices) : Float64Array.from({ length: P.length / 3 }, (_, i) => i);
      for (const i of ind) idx.push(base + i);
    }
  }
  for (const c of n.children ?? []) visit(c, m);
}
for (const r of gltf.scenes[gltf.scene ?? 0].nodes) visit(r, I);

// weld identical position+uv corners
const key = new Map();
const wPos = [];
const wUv = [];
const remap = new Uint32Array(pos.length / 3);
for (let i = 0; i < pos.length / 3; i++) {
  const k = `${pos[i * 3].toFixed(5)},${pos[i * 3 + 1].toFixed(5)},${pos[i * 3 + 2].toFixed(5)},${uv[i * 2].toFixed(5)},${uv[i * 2 + 1].toFixed(5)}`;
  let at = key.get(k);
  if (at === undefined) {
    at = wPos.length / 3;
    key.set(k, at);
    wPos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    wUv.push(uv[i * 2], uv[i * 2 + 1]);
  }
  remap[i] = at;
}
const indices = Uint32Array.from(idx, (i) => remap[i]);
const P = Float32Array.from(wPos);
const T = Float32Array.from(wUv);
await MeshoptSimplifier.ready;
const [simple, err] = MeshoptSimplifier.simplifyWithAttributes(indices, P, 3, T, 2, [0.5, 0.5], null, Math.min(indices.length, targetTris * 3), 0.02, []);
// compact the used vertices; feet on 0, centred in x/z, optionally scaled to a height
const used = new Map();
const oPos = [];
const oUv = [];
const oIdx = new Uint32Array(simple.length);
for (let i = 0; i < simple.length; i++) {
  const v = simple[i];
  let at = used.get(v);
  if (at === undefined) {
    at = oPos.length / 3;
    used.set(v, at);
    oPos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    oUv.push(T[v * 2], T[v * 2 + 1]);
  }
  oIdx[i] = at;
}
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < oPos.length; i++) {
  min[i % 3] = Math.min(min[i % 3], oPos[i]);
  max[i % 3] = Math.max(max[i % 3], oPos[i]);
}
const s = height ? height / (max[1] - min[1]) : 1;
const cx = (min[0] + max[0]) / 2;
const cz = (min[2] + max[2]) / 2;
for (let i = 0; i < oPos.length; i += 3) {
  oPos[i] = (oPos[i] - cx) * s;
  oPos[i + 1] = (oPos[i + 1] - min[1]) * s;
  oPos[i + 2] = (oPos[i + 2] - cz) * s;
}
const fPos = Float32Array.from(oPos);
const fUv = Float32Array.from(oUv);
const bmin = [Infinity, Infinity, Infinity];
const bmax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < fPos.length; i++) {
  bmin[i % 3] = Math.min(bmin[i % 3], fPos[i]);
  bmax[i % 3] = Math.max(bmax[i % 3], fPos[i]);
}

// the texture, as is
const img = gltf.images[0];
const ibv = gltf.bufferViews[img.bufferView];
const image = bin.subarray(ibv.byteOffset ?? 0, (ibv.byteOffset ?? 0) + ibv.byteLength);
const pad4 = (n) => (n + 3) & ~3;
const parts = [Buffer.from(fPos.buffer), Buffer.from(fUv.buffer), Buffer.from(oIdx.buffer), image];
const offsets = [];
let o = 0;
for (const p of parts) {
  offsets.push(o);
  o = pad4(o + p.length);
}
const body = Buffer.alloc(o);
parts.forEach((p, i) => p.copy(body, offsets[i]));
const out_ = {
  asset: { version: '2.0', generator: 'gamory glb-simplify', extras: gltf.asset?.extras ?? {} },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: gltf.asset?.extras?.title ?? 'model' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.8 } }],
  textures: [{ source: 0, sampler: 0 }],
  samplers: [{ magFilter: 9729, minFilter: 9987 }],
  images: [{ bufferView: 3, mimeType: img.mimeType }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: fPos.length / 3, type: 'VEC3', min: bmin, max: bmax },
    { bufferView: 1, componentType: 5126, count: fUv.length / 2, type: 'VEC2' },
    { bufferView: 2, componentType: 5125, count: oIdx.length, type: 'SCALAR' }
  ],
  bufferViews: parts.map((p, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: p.length, ...(i < 2 ? { target: 34962 } : i === 2 ? { target: 34963 } : {}) })),
  buffers: [{ byteLength: body.length }]
};
let json = Buffer.from(JSON.stringify(out_));
json = Buffer.concat([json, Buffer.alloc(pad4(json.length) - json.length, 0x20)]);
const head = Buffer.alloc(12);
head.writeUInt32LE(0x46546c67, 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(12 + 8 + json.length + 8 + body.length, 8);
const jh = Buffer.alloc(8);
jh.writeUInt32LE(json.length, 0);
jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8);
bh.writeUInt32LE(body.length, 0);
bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(out, Buffer.concat([head, jh, json, bh, body]));
console.log(`${idx.length / 3} → ${oIdx.length / 3} triangles (error ${err.toFixed(4)}), ${fPos.length / 3} vertices; ${(Buffer.concat([head, jh, json, bh, body]).length / 1e6).toFixed(2)} MB; size ${bmax.map((m, k) => (m - bmin[k]).toFixed(2)).join(' × ')}`);
