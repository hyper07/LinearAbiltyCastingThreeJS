/**
 * Packs a binary STL into the small mesh file the game loads (games/g_cv2yrhrpv2/yiStatue.js):
 * the corners welded, positions quantised to 16 bits on the model's box, indices 32-bit.
 *
 *   node scripts/models/statue-pack.mjs Yi_Sun-sin_fixed.stl public/models/landmarks/yi-sun-sin.bin
 *
 * Layout (little-endian): 'MESH', u32 vertices, u32 indices, f32 min[3], f32 size[3],
 * u16 positions[vertices × 3], u32 indices[indices].
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const b = readFileSync(src);
const n = b.readUInt32LE(80);
if (b.length !== 84 + n * 50) throw new Error('not a binary STL');
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n; i++) for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) {
  const x = b.readFloatLE(84 + i * 50 + 12 + v * 12 + k * 4);
  min[k] = Math.min(min[k], x);
  max[k] = Math.max(max[k], x);
}
const size = max.map((m, k) => m - min[k]);
const key = new Map();
const pos = [];
const idx = [];
for (let i = 0; i < n; i++) {
  const tri = [];
  for (let v = 0; v < 3; v++) {
    const q = [0, 1, 2].map((k) => Math.round(((b.readFloatLE(84 + i * 50 + 12 + v * 12 + k * 4) - min[k]) / size[k]) * 65535));
    const s = q.join(',');
    let at = key.get(s);
    if (at === undefined) {
      at = pos.length / 3;
      key.set(s, at);
      pos.push(...q);
    }
    tri.push(at);
  }
  if (tri[0] !== tri[1] && tri[1] !== tri[2] && tri[0] !== tri[2]) idx.push(...tri);
}
const nv = pos.length / 3;
const buf = Buffer.alloc(4 + 8 + 24 + nv * 6 + (nv * 6) % 4 + idx.length * 4);
buf.write('MESH', 0, 'ascii');
buf.writeUInt32LE(nv, 4);
buf.writeUInt32LE(idx.length, 8);
[...min, ...size].forEach((f, k) => buf.writeFloatLE(f, 12 + k * 4));
let o = 36;
for (const q of pos) { buf.writeUInt16LE(q, o); o += 2; }
o += (nv * 6) % 4;
for (const i of idx) { buf.writeUInt32LE(i, o); o += 4; }
writeFileSync(out, buf);
console.log(`${n} triangles → ${nv} vertices, ${idx.length / 3} triangles, ${(buf.length / 1e6).toFixed(2)} MB; box ${size.map((s) => s.toFixed(1)).join(' × ')}`);
