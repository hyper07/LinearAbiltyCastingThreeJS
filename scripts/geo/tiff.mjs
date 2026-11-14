/**
 * Just enough of a GeoTIFF reader for the Copernicus elevation tiles: one
 * band of 32-bit floats, in tiles, DEFLATE-compressed with the floating-point
 * predictor. Reads the full-resolution image (the first directory) only.
 */
import { openSync, readSync, closeSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function openDem(file) {
  const fd = openSync(file, 'r');
  const read = (pos, n) => {
    const b = Buffer.alloc(n);
    readSync(fd, b, 0, n, pos);
    return b;
  };
  const head = read(0, 8);
  const le = head.toString('latin1', 0, 2) === 'II';
  if (!le && head.toString('latin1', 0, 2) !== 'MM') throw new Error('Not a TIFF');
  const u16 = (b, o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (b, o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const f64 = (b, o) => (le ? b.readDoubleLE(o) : b.readDoubleBE(o));
  if (u16(head, 2) !== 42) throw new Error('BigTIFF is not supported');
  const at = u32(head, 4);
  const count = u16(read(at, 2), 0);
  const dir = read(at + 2, count * 12);
  const tags = {};
  const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8 };
  for (let i = 0; i < count; i++) {
    const o = i * 12;
    const tag = u16(dir, o);
    const type = u16(dir, o + 2);
    const n = u32(dir, o + 4);
    const size = (SIZE[type] ?? 1) * n;
    const data = size <= 4 ? dir.subarray(o + 8, o + 8 + size) : read(u32(dir, o + 8), size);
    const values = [];
    for (let k = 0; k < n; k++) values.push(type === 3 ? u16(data, k * 2) : type === 4 ? u32(data, k * 4) : type === 12 ? f64(data, k * 8) : data[k]);
    tags[tag] = values;
  }
  const width = tags[256][0];
  const height = tags[257][0];
  const tw = tags[322]?.[0];
  const th = tags[323]?.[0];
  if (!tw || tags[258][0] !== 32 || tags[339]?.[0] !== 3) throw new Error('Expected a tiled 32-bit float image');
  const compression = tags[259][0];
  const predictor = tags[317]?.[0] ?? 1;
  if (![1, 8, 32946].includes(compression)) throw new Error(`Compression ${compression} is not supported`);
  const scale = tags[33550]; // metres or degrees per pixel
  const tie = tags[33922]; // pixel (i, j) ↔ model (x, y)
  const across = Math.ceil(width / tw);
  const cache = new Map();
  const tile = (tx, ty) => {
    const id = ty * across + tx;
    if (cache.has(id)) return cache.get(id);
    let raw = read(tags[324][id], tags[325][id]);
    if (compression !== 1) raw = inflateSync(raw);
    const out = new Float32Array(tw * th);
    if (predictor === 3) {
      // Per row: undo the byte differencing, then un-shuffle the byte planes (most significant first).
      const row = tw * 4;
      for (let y = 0; y < th; y++) {
        const o = y * row;
        for (let i = 1; i < row; i++) raw[o + i] = (raw[o + i] + raw[o + i - 1]) & 255;
        for (let x = 0; x < tw; x++) {
          const bits = (raw[o + x] << 24) | (raw[o + tw + x] << 16) | (raw[o + 2 * tw + x] << 8) | raw[o + 3 * tw + x];
          out[y * tw + x] = intToFloat(bits);
        }
      }
    } else for (let i = 0; i < out.length; i++) out[i] = le ? raw.readFloatLE(i * 4) : raw.readFloatBE(i * 4);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    cache.set(id, out);
    return out;
  };
  const at2 = (x, y) => {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    return tile(Math.floor(cx / tw), Math.floor(cy / th))[(cy % th) * tw + (cx % tw)];
  };
  return {
    width, height,
    west: tie[3], north: tie[4], dx: scale[0], dy: scale[1],
    /** Elevation at a longitude and latitude, between the four samples around it. */
    sample(lon, lat) {
      const fx = (lon - tie[3]) / scale[0] - 0.5;
      const fy = (tie[4] - lat) / scale[1] - 0.5;
      const x = Math.floor(fx);
      const y = Math.floor(fy);
      const u = fx - x;
      const v = fy - y;
      return at2(x, y) * (1 - u) * (1 - v) + at2(x + 1, y) * u * (1 - v) + at2(x, y + 1) * (1 - u) * v + at2(x + 1, y + 1) * u * v;
    },
    contains: (lon, lat) => lon >= tie[3] && lon < tie[3] + scale[0] * width && lat <= tie[4] && lat > tie[4] - scale[1] * height,
    close: () => closeSync(fd)
  };
}

const conv = new DataView(new ArrayBuffer(4));
function intToFloat(bits) {
  conv.setInt32(0, bits);
  return conv.getFloat32(0);
}
