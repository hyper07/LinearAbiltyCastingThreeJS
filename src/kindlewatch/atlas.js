/**
 * One atlas for every painted sprite, so the whole keep draws in a handful
 * of calls: the painting in an RGBA canvas, and beside it (same layout) the
 * normal map — x, y, "top face", glow — as raw bytes (a canvas would
 * premultiply and lose the normals wherever there is no glow).
 */
import { makeCanvas } from './paint.js';

const PAD = 4;

export class Atlas {
  constructor(width = 4096) {
    this.width = width;
    this.items = [];
    this.frames = new Map();
  }

  add(baked) {
    this.items.push(baked);
    return baked.name;
  }

  /** Shelf-pack every sprite (tallest first), then copy them in. */
  pack() {
    const W = this.width;
    const order = [...this.items].sort((a, b) => b.h - a.h || b.w - a.w);
    let x = PAD;
    let y = PAD;
    let shelf = 0;
    for (const it of order) {
      if (x + it.w + PAD > W) {
        x = PAD;
        y += shelf + PAD * 2;
        shelf = 0;
      }
      it.x = x;
      it.y = y;
      x += it.w + PAD * 2;
      shelf = Math.max(shelf, it.h);
    }
    let H = 256;
    while (H < y + shelf + PAD) H *= 2;
    this.height = H;
    this.canvas = makeCanvas(W, H);
    const g = this.canvas.getContext('2d');
    this.normal = new Uint8Array(W * H * 4);
    // Default normal: facing the camera, no glow.
    for (let i = 0; i < W * H; i++) {
      this.normal[i * 4] = 128;
      this.normal[i * 4 + 1] = 128;
    }
    for (const it of this.items) {
      g.drawImage(it.albedo, it.x, it.y);
      // Edge-extend the sprite's colour into its padding so mipmaps don't pull in black.
      for (let row = 0; row < it.h; row++) {
        const src = row * it.w * 4;
        const dst = ((it.y + row) * W + it.x) * 4;
        this.normal.set(it.normal.subarray(src, src + it.w * 4), dst);
      }
      // Stored flipped vertically (texture v grows upward), so frames use (1 - y).
      this.frames.set(it.name, {
        name: it.name,
        u0: it.x / W,
        u1: (it.x + it.w) / W,
        v0: 1 - (it.y + it.h) / H,
        v1: 1 - it.y / H,
        w: it.w / it.ppu,
        h: it.h / it.ppu,
        ox: it.ox / it.ppu,
        oy: (it.h - it.oy) / it.ppu // pivot from the bottom, in tiles
      });
      it.albedo = null;
      it.normal = null;
    }
    // Flip the normal bytes to texture order (row 0 at the bottom).
    const flipped = new Uint8Array(W * H * 4);
    for (let row = 0; row < H; row++) flipped.set(this.normal.subarray(row * W * 4, (row + 1) * W * 4), (H - 1 - row) * W * 4);
    this.normal = flipped;
    this.items = [];
    return this;
  }

  get(name) {
    const f = this.frames.get(name);
    if (!f) throw new Error(`no sprite "${name}"`);
    return f;
  }

  has(name) {
    return this.frames.has(name);
  }
}
