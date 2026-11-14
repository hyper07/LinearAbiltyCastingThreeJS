/**
 * Seoul's buildings as map tiles: the format the converter writes
 * (scripts/geo/seoul-build.mjs) and the browser reads. Pure functions, no
 * files, so both sides — and the tests — share them.
 *
 * A tile is a square of ground `TILE` metres wide in the source's own grid
 * (EPSG:5186, metres east and north). A building is its footprint (one
 * ring, in decimetres from the tile's south-west corner), a height in
 * decimetres, and what it is used for. A tile ends with a little JSON: the
 * names of the named buildings in it, and what the neighbourhood is called.
 */

export const TILE = 500;
export const MAGIC = 0x314f4553; // "SEO1"
/** What a building is used for, in broad strokes (the colour it is drawn in). */
export const USES = ['house', 'apartment', 'shop', 'office', 'public', 'industry', 'other'];
/** The source's use codes (A8, its first two digits) to ours. */
const USE_OF = { '01': 0, '02': 1, '03': 2, '04': 2, '07': 2, '13': 2, '16': 2, '14': 3, '15': 3, '05': 4, '06': 4, '08': 4, '09': 4, '10': 4, '11': 4, '12': 4, '17': 5, '18': 5, '19': 5, '20': 5, '21': 5 };
export const useOf = (code) => USE_OF[String(code ?? '').slice(0, 2)] ?? 6;

/** A building's height in metres from what the register knows: its height, else its floors, else a low guess. */
export function heightOf(height, floors) {
  // The register's heights are "for reference": one far too tall for its floors is a typing slip.
  if (height > 1 && height < 700 && !(floors > 0 && height > floors * 6 + 20)) return height;
  if (floors > 0) return Math.min(600, floors * 3.3 + 1);
  return 4;
}

export const tileKey = (tx, ty) => `${tx}_${ty}`;
export const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)];

/** Twice a ring's signed area (positive: counter-clockwise), ring as [x0, y0, x1, y1, …]. */
export function area2(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n;
    a += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
  }
  return a;
}

/** Fewer points on a ring: drop those within `tol` metres of the line between their neighbours (Douglas–Peucker). */
export function simplify(ring, tol = 0.4) {
  const n = ring.length / 2;
  if (n <= 4) return ring;
  const keep = new Uint8Array(n);
  // Split a closed ring at its two farthest-apart points, so there are ends to work from.
  let far = 0;
  let best = -1;
  for (let i = 1; i < n; i++) {
    const d = (ring[i * 2] - ring[0]) ** 2 + (ring[i * 2 + 1] - ring[1]) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = ring[a * 2];
    const ay = ring[a * 2 + 1];
    const bx = ring[(b % n) * 2];
    const by = ring[(b % n) * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let worst = tol;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((ring[i * 2] - ax) * (by - ay) - (ring[i * 2 + 1] - ay) * (bx - ax)) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at >= 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i * 2], ring[i * 2 + 1]);
  return out.length >= 6 ? out : ring;
}

/**
 * Write a tile.
 * @param {number} tx
 * @param {number} ty
 * @param {{ ring: number[], height: number, use: number, name?: string }[]} buildings rings in metres (source grid)
 * @param {{ place?: string }} [meta]
 * @returns {Uint8Array}
 */
export function encodeTile(tx, ty, buildings, meta = {}) {
  const names = [];
  let size = 8;
  for (const b of buildings) size += 8 + b.ring.length * 2;
  const json = new TextEncoder().encode(JSON.stringify({ names: buildings.filter((b) => b.name).map((b) => b.name), place: meta.place ?? '' }));
  const buf = new ArrayBuffer(size + 4 + json.length);
  const v = new DataView(buf);
  v.setUint32(0, MAGIC, true);
  v.setUint32(4, buildings.length, true);
  let o = 8;
  const ox = tx * TILE;
  const oy = ty * TILE;
  for (const b of buildings) {
    const n = b.ring.length / 2;
    v.setUint16(o, n, true);
    v.setUint16(o + 2, Math.max(10, Math.min(65535, Math.round(b.height * 10))), true);
    v.setUint8(o + 4, b.use);
    v.setUint8(o + 5, b.name ? 1 : 0);
    v.setUint16(o + 6, b.name ? names.push(b.name) - 1 : 0, true);
    o += 8;
    for (let i = 0; i < b.ring.length; i += 2) {
      v.setInt16(o, Math.max(-32768, Math.min(32767, Math.round((b.ring[i] - ox) * 10))), true);
      v.setInt16(o + 2, Math.max(-32768, Math.min(32767, Math.round((b.ring[i + 1] - oy) * 10))), true);
      o += 4;
    }
  }
  v.setUint32(o, json.length, true);
  new Uint8Array(buf, o + 4).set(json);
  return new Uint8Array(buf);
}

/**
 * Read a tile back: rings in metres from the tile's south-west corner.
 * @returns {{ buildings: { ring: Float32Array, height: number, use: number, name: string|null }[], place: string }}
 */
export function decodeTile(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.byteLength < 12 || v.getUint32(0, true) !== MAGIC) throw new Error('Not a Seoul tile');
  const count = v.getUint32(4, true);
  const list = [];
  let o = 8;
  for (let k = 0; k < count; k++) {
    const n = v.getUint16(o, true);
    const height = v.getUint16(o + 2, true) / 10;
    const use = v.getUint8(o + 4);
    const named = v.getUint8(o + 5) === 1;
    const nameAt = v.getUint16(o + 6, true);
    o += 8;
    const ring = new Float32Array(n * 2);
    for (let i = 0; i < n * 2; i++) ring[i] = v.getInt16(o + i * 2, true) / 10;
    o += n * 4;
    list.push({ ring, height, use, nameAt: named ? nameAt : -1 });
  }
  const len = v.getUint32(o, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes.buffer, bytes.byteOffset + o + 4, len)));
  return { buildings: list.map((b) => ({ ring: b.ring, height: b.height, use: b.use, name: b.nameAt >= 0 ? meta.names[b.nameAt] ?? null : null })), place: meta.place ?? '' };
}
