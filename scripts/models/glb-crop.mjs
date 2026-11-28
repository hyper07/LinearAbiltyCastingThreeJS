/**
 * Cleans a photo-scanned monument made by glb-simplify.mjs (one mesh, positions + UVs + texture):
 * drops the triangles below a height (the scanned ground) or outside a box (scanned neighbours), and
 * the small loose pieces (sky and debris the scan caught), then puts its feet on y = 0, centred.
 *
 *   node scripts/models/glb-crop.mjs <in.glb> <out.glb> [--ymin 0.7] [--ymax 99] [--zmin -3.2] [--zmax 99]
 *        [--xmin -99] [--xmax 99] [--parts 0.02] [--height 10.4]
 *
 * --parts: a loose piece with less than this share of the triangles goes (connected by position).
 * --height: scale so the full height is this many metres.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const [src, out] = args;
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const box = { xmin: opt('xmin', -1e9), xmax: opt('xmax', 1e9), ymin: opt('ymin', -1e9), ymax: opt('ymax', 1e9), zmin: opt('zmin', -1e9), zmax: opt('zmax', 1e9) };
const partShare = opt('parts', 0.02);
const height = opt('height', 0);

const b = readFileSync(src);
const jl = b.readUInt32LE(12);
const j = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
const bin = b.subarray(28 + jl, 28 + jl + b.readUInt32LE(20 + jl));
const view = (i, T) => {
  const bv = j.bufferViews[i];
  const copy = Buffer.from(bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength));
  return new T(copy.buffer, copy.byteOffset, bv.byteLength / T.BYTES_PER_ELEMENT);
};
const P = view(0, Float32Array);
const T = view(1, Float32Array);
const I = view(2, Uint32Array);
const image = bin.subarray(j.bufferViews[3].byteOffset, j.bufferViews[3].byteOffset + j.bufferViews[3].byteLength);

// 1. the box
const inBox = (v) => P[v * 3] >= box.xmin && P[v * 3] <= box.xmax && P[v * 3 + 1] >= box.ymin && P[v * 3 + 1] <= box.ymax && P[v * 3 + 2] >= box.zmin && P[v * 3 + 2] <= box.zmax;
let tris = [];
for (let t = 0; t < I.length; t += 3) if (inBox(I[t]) && inBox(I[t + 1]) && inBox(I[t + 2])) tris.push(t);

// 2. loose pieces: union-find over vertices that share a position (UV seams split the welded mesh)
const posId = new Map();
const pid = new Uint32Array(P.length / 3);
for (let v = 0; v < P.length / 3; v++) {
  const k = `${P[v * 3].toFixed(4)},${P[v * 3 + 1].toFixed(4)},${P[v * 3 + 2].toFixed(4)}`;
  if (!posId.has(k)) posId.set(k, posId.size);
  pid[v] = posId.get(k);
}
const parent = Int32Array.from({ length: posId.size }, (_, i) => i);
const find = (x) => {
  while (parent[x] !== x) x = parent[x] = parent[parent[x]];
  return x;
};
for (const t of tris) {
  const a = find(pid[I[t]]);
  for (const k of [1, 2]) {
    const c = find(pid[I[t + k]]);
    if (c !== a) parent[c] = a;
  }
}
const count = new Map();
for (const t of tris) count.set(find(pid[I[t]]), (count.get(find(pid[I[t]])) ?? 0) + 1);
const keepRoot = new Set([...count].filter(([, n]) => n >= tris.length * partShare).map(([r]) => r));
const before = tris.length;
tris = tris.filter((t) => keepRoot.has(find(pid[I[t]])));

// 3. compact, feet on 0, centred, scaled
const used = new Map();
const oP = [];
const oT = [];
const oI = new Uint32Array(tris.length * 3);
tris.forEach((t, n) => {
  for (let k = 0; k < 3; k++) {
    const v = I[t + k];
    let at = used.get(v);
    if (at === undefined) {
      at = oP.length / 3;
      used.set(v, at);
      oP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
      oT.push(T[v * 2], T[v * 2 + 1]);
    }
    oI[n * 3 + k] = at;
  }
});
const mn = [Infinity, Infinity, Infinity];
const mx = [-Infinity, -Infinity, -Infinity];
oP.forEach((v, i) => {
  mn[i % 3] = Math.min(mn[i % 3], v);
  mx[i % 3] = Math.max(mx[i % 3], v);
});
const s = height ? height / (mx[1] - mn[1]) : 1;
const c = [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2];
const fP = Float32Array.from(oP, (v, i) => (v - c[i % 3]) * s);
const fT = Float32Array.from(oT);
const bmin = [Infinity, Infinity, Infinity];
const bmax = [-Infinity, -Infinity, -Infinity];
fP.forEach((v, i) => {
  bmin[i % 3] = Math.min(bmin[i % 3], v);
  bmax[i % 3] = Math.max(bmax[i % 3], v);
});

const pad4 = (n) => (n + 3) & ~3;
const parts = [Buffer.from(fP.buffer), Buffer.from(fT.buffer), Buffer.from(oI.buffer), image];
const offsets = [];
let o = 0;
for (const p of parts) {
  offsets.push(o);
  o = pad4(o + p.length);
}
const body = Buffer.alloc(o);
parts.forEach((p, i) => p.copy(body, offsets[i]));
j.accessors[0] = { ...j.accessors[0], count: fP.length / 3, min: bmin, max: bmax };
j.accessors[1] = { ...j.accessors[1], count: fT.length / 2 };
j.accessors[2] = { ...j.accessors[2], count: oI.length };
j.bufferViews = parts.map((p, i) => ({ ...j.bufferViews[i], byteOffset: offsets[i], byteLength: p.length }));
j.buffers = [{ byteLength: body.length }];
let json = Buffer.from(JSON.stringify(j));
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
const all = Buffer.concat([head, jh, json, bh, body]);
writeFileSync(out, all);
console.log(`${I.length / 3} → ${before} in the box → ${tris.length} after loose pieces (${count.size} pieces, ${keepRoot.size} kept); ${(all.length / 1e6).toFixed(2)} MB; size ${bmax.map((m, k) => (m - bmin[k]).toFixed(2)).join(' × ')}`);
