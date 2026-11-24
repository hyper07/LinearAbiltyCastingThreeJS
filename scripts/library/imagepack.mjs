/**
 * Small image tools for the library fetch, with nothing but Node: read an
 * uncompressed or RLE TGA, shrink it with a box filter, write a PNG (zlib).
 * The Rocketbox people come with 2048² TGA textures (12–16 MB each); the
 * game wants 512² PNGs.
 *
 *   const img = readTga(buffer);            // { width, height, channels, data }
 *   const small = shrink(img, 512);
 *   await writeFile(out, encodePng(small));
 */
import { deflateSync } from 'node:zlib';

/** Decode a TGA (types 2 and 10: true colour, raw or RLE; 24 or 32 bits). Rows top-down, RGB(A). */
export function readTga(buf) {
  const idLen = buf[0];
  const type = buf[2];
  const width = buf.readUInt16LE(12);
  const height = buf.readUInt16LE(14);
  const bpp = buf[16];
  const desc = buf[17];
  if (type !== 2 && type !== 10) throw new Error(`TGA type ${type} not supported`);
  if (bpp !== 24 && bpp !== 32) throw new Error(`TGA ${bpp}-bit not supported`);
  const px = bpp / 8;
  const channels = px;
  const out = Buffer.alloc(width * height * channels);
  let o = 18 + idLen + (buf[1] ? buf.readUInt16LE(5) * Math.ceil(buf[7] / 8) : 0);
  const n = width * height;
  const put = (i, s) => {
    // BGR(A) → RGB(A)
    out[i * channels] = buf[s + 2];
    out[i * channels + 1] = buf[s + 1];
    out[i * channels + 2] = buf[s];
    if (channels === 4) out[i * channels + 3] = buf[s + 3];
  };
  if (type === 2) {
    for (let i = 0; i < n; i++, o += px) put(i, o);
  } else {
    let i = 0;
    while (i < n && o < buf.length) {
      const h = buf[o++];
      const count = (h & 0x7f) + 1;
      if (h & 0x80) {
        for (let k = 0; k < count && i < n; k++) put(i++, o);
        o += px;
      } else {
        for (let k = 0; k < count && i < n; k++, o += px) put(i++, o);
      }
    }
  }
  // Bottom-up unless bit 5 of the descriptor says top-down: flip to top-down.
  if (!(desc & 0x20)) {
    const row = width * channels;
    const tmp = Buffer.alloc(row);
    for (let y = 0; y < height >> 1; y++) {
      const a = y * row;
      const b = (height - 1 - y) * row;
      out.copy(tmp, 0, a, a + row);
      out.copy(out, a, b, b + row);
      tmp.copy(out, b);
    }
  }
  return { width, height, channels, data: out };
}

/** Shrink by a whole factor (box filter) to at most `max` on the long side. */
export function shrink(img, max) {
  const f = Math.max(1, Math.ceil(Math.max(img.width, img.height) / max));
  if (f === 1) return img;
  const w = Math.floor(img.width / f);
  const h = Math.floor(img.height / f);
  const c = img.channels;
  const out = Buffer.alloc(w * h * c);
  const sum = new Float64Array(c);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      sum.fill(0);
      for (let yy = 0; yy < f; yy++) {
        let s = ((y * f + yy) * img.width + x * f) * c;
        for (let xx = 0; xx < f; xx++, s += c) for (let k = 0; k < c; k++) sum[k] += img.data[s + k];
      }
      const d = (y * w + x) * c;
      for (let k = 0; k < c; k++) out[d + k] = Math.round(sum[k] / (f * f));
    }
  }
  return { width: w, height: h, channels: c, data: out };
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode RGB or RGBA pixels (top-down rows) as a PNG, with the Paeth/Sub filters picked per row. */
export function encodePng({ width, height, channels, data }) {
  const row = width * channels;
  const raw = Buffer.alloc((row + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = y * row;
    const dst = y * (row + 1);
    // filter 1 (Sub): small and good on photos
    raw[dst] = 1;
    for (let i = 0; i < row; i++) raw[dst + 1 + i] = (data[src + i] - (i >= channels ? data[src + i - channels] : 0)) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
