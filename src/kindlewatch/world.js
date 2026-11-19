/**
 * The keep in the renderer: its ground textures and masks, the shadow field
 * of its blocks, its walls and props as sprites each frame (only what's in
 * view), and its fires as lights.
 */
import * as THREE from 'three';
import { W, H, WALL, FLOOR, MASK_RES, buildGrid, buildProps, wallHeights, wallDepth, buildMasks, grassTufts, solidGrid, footprint, tileAt, rng } from './map.js';
import { signedDistance, maxFilter, toHalf } from './normals.js';
import { flagstones, snowTexture, iceTexture, dirtTexture, noiseBytes, SIZE, REPEAT } from './art/ground.js';

export const SDF_RES = 8; // texels per tile

function dataTex(bytes, w, h, { srgb = false, repeat = false, mips = true, type = THREE.UnsignedByteType } = {}) {
  const t = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat, type);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mips;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

/** Ground textures, with rows flipped so texture v grows north like the world. */
function flipRows(bytes, w, h) {
  const out = new Uint8Array(bytes.length);
  for (let y = 0; y < h; y++) out.set(bytes.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
  return out;
}

export function groundTextures() {
  const mk = (t) => ({ albedo: dataTex(flipRows(t.albedo, SIZE, SIZE), SIZE, SIZE, { srgb: true, repeat: true }), normal: dataTex(flipRows(flipNormalY(t.normal), SIZE, SIZE), SIZE, SIZE, { repeat: true }) });
  return {
    stone: mk(flagstones()),
    snow: mk(snowTexture()),
    ice: mk(iceTexture()),
    dirt: mk(dirtTexture()),
    noise: dataTex(noiseBytes(256), 256, 256, { repeat: true }),
    repeat: REPEAT
  };
}

/** The painted textures' normals were made in canvas order (y down = south) and already point y north; flipping the rows keeps them right. */
function flipNormalY(bytes) {
  return bytes;
}

/** The masks as a texture: snow, ice, earth, wall. Row 0 is the south edge (y = 0). */
export function maskTexture(grid, masks) {
  const { mw, mh } = masks;
  const out = new Uint8Array(mw * mh * 4);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = y * mw + x;
      out[i * 4] = Math.round(masks.snow[i] * 255);
      out[i * 4 + 1] = Math.round(masks.ice[i] * 255);
      out[i * 4 + 2] = Math.round(masks.earth[i] * 255);
      out[i * 4 + 3] = grid[Math.floor(y / MASK_RES) * W + Math.floor(x / MASK_RES)] === WALL ? 255 : 0;
    }
  }
  return dataTex(out, mw, mh, { mips: false });
}

/** Round shadow-casters (their footprint is a disc, not a square). */
const ROUND = { brazier: 0.3, greatbrazier: 0.36, pillar: 0.4, statue: 0.36, tree: 0.3, fountain: 1.45, pot: 0.3 };
const NO_SHADOW = new Set(['torch', 'banner', 'rubble', 'bones']);

/**
 * The shadow field: per texel, the signed distance (tiles) to the nearest
 * block, the height of the block here, and the tallest block within a tile.
 */
export function shadowField(grid, wallH, props, open = new Set()) {
  const sw = W * SDF_RES;
  const sh = H * SDF_RES;
  const solid = new Uint8Array(sw * sh);
  const height = new Float32Array(sw * sh);
  const set = (i, h) => {
    solid[i] = 1;
    height[i] = Math.max(height[i], h);
  };
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      if (grid[ty * W + tx] !== WALL) continue;
      const h = wallH[ty * W + tx];
      for (let y = 0; y < SDF_RES; y++) for (let x = 0; x < SDF_RES; x++) set((ty * SDF_RES + y) * sw + tx * SDF_RES + x, h);
    }
  }
  for (const p of props) {
    if (NO_SHADOW.has(p.kind) || p.h < 0.3 || open.has(p.id)) continue;
    const round = ROUND[p.kind];
    if (round) {
      const cx = (p.x + (p.w ?? 1) / 2) * SDF_RES;
      const cy = (p.y + (p.d ?? 1) / 2) * SDF_RES;
      const r = round * SDF_RES;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= sw || y >= sh) continue;
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) set(y * sw + x, p.kind.endsWith('brazier') ? 0.85 : p.h);
      }
    } else {
      const inset = p.kind === 'block' || p.kind === 'lowwall' ? 1 : p.kind === 'crate' || p.kind === 'fence' || p.kind === 'barricade' ? 2 : 0;
      for (const [fx, fy] of footprint(p)) {
        for (let y = inset; y < SDF_RES - inset; y++) for (let x = inset; x < SDF_RES - inset; x++) set((fy * SDF_RES + y) * sw + fx * SDF_RES + x, p.h);
      }
    }
  }
  const sdf = signedDistance(solid, sw, sh);
  const near = maxFilter(height, sw, sh, Math.round(SDF_RES * 0.9));
  const out = new Uint16Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) {
    out[i * 4] = toHalf(sdf[i] / SDF_RES);
    out[i * 4 + 1] = toHalf(height[i]);
    out[i * 4 + 2] = toHalf(near[i]);
    out[i * 4 + 3] = toHalf(1);
  }
  return { data: out, w: sw, h: sh };
}

export function shadowTexture(field) {
  const t = new THREE.DataTexture(field.data, field.w, field.h, THREE.RGBAFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------ the level */

export const WALL_VARIANTS = { '0.45': [3, 3], '1': [3, 3], '1.7': [5, 4] }; // [one tile wide, two tiles wide]
const wallKey = (h) => (h >= 1.6 ? '1.7' : h >= 0.9 ? '1' : '0.45');
export const SPRITE_FOR = {
  block: 'block', pillar: 'pillar', brazier: 'brazier', greatbrazier: 'greatbrazier', barricade: 'barricade', gate: 'gate', fountain: 'fountain', hedge: 'hedge', tree: 'tree', statue: 'statue', bench: 'bench', lowwall: 'lowwall', sarcophagus: 'sarcophagus', fence: 'fence', crate: 'crate', pot: 'pot', banner: 'banner', throne: 'throne', rubble: 'rubble', bones: 'bones', torch: 'torch'
};

export class Level {
  constructor() {
    this.grid = buildGrid();
    this.props = buildProps();
    this.wallH = wallHeights(this.grid);
    this.depth = wallDepth(this.grid);
    this.masks = buildMasks(this.grid, this.props);
    this.tufts = grassTufts(this.grid, this.props);
    this.open = new Set();
    this.broken = new Set();
    this.solid = solidGrid(this.grid, this.props, this.open);
    const r = rng(41);
    this.variant = new Uint8Array(W * H).map(() => Math.floor(r() * 255));
    this.byTile = new Map();
    for (const p of this.props) for (const [x, y] of footprint(p)) this.byTile.set(y * W + x, p);
    this.lights = this.props.filter((p) => p.light);
    this.pieces = this.wallPieces(r);
  }

  /**
   * Wall tiles grouped into blocks: neighbours in a row of the same height
   * often share one two-tile block, so the walls read as big cut stones.
   */
  wallPieces(r) {
    const pieces = [];
    const used = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (this.grid[i] !== WALL || used[i]) continue;
        const h = this.wallH[i];
        const d = this.depth[i];
        const frontHidden = tileAt(this.grid, x, y - 1) === WALL && this.wallH[(y - 1) * W + x] >= h;
        const deep = d >= 3 && frontHidden;
        let w = 1;
        if (!deep && x + 1 < W && this.grid[i + 1] === WALL && !used[i + 1] && this.wallH[i + 1] === h && this.depth[i + 1] < 3 && r() < 0.55) w = 2;
        for (let k = 0; k < w; k++) used[i + k] = 1;
        const key = wallKey(h);
        const v = Math.floor(r() * 64);
        const name = deep ? `deep-${v % 6}` : `wall-${key}-w${w}-${v % WALL_VARIANTS[key][w - 1]}`;
        pieces.push({ x, y, w, h, d: Math.min(d, this.depth[i + w - 1] ?? d), name, flip: r() < 0.5 && w === 1 });
      }
    }
    return pieces;
  }

  isSolid(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return this.solid[ty * W + tx] === 1;
  }

  /** Open a door (a barricade broken, the gate raised): the walk map and shadow field change. */
  openProp(p) {
    this.open.add(p.id);
    this.solid = solidGrid(this.grid, this.props, this.open);
  }

  /** Every door closed again, every pot whole. */
  resetDoors() {
    this.open.clear();
    this.broken.clear();
    this.solid = solidGrid(this.grid, this.props, this.open);
  }

  /** Line of sight between two points (no solid tile on the way, low props see-through). */
  sees(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d * 3);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (tileAt(this.grid, tx, ty) === WALL) return false;
      const p = this.byTile.get(ty * W + tx);
      if (p && p.solid && p.h > 1.2 && !this.open.has(p.id)) return false;
    }
    return true;
  }

  /** Walls and props in view, into the sprite batch. */
  draw(stage, atlas, view, t, beaconsLit) {
    const x0 = Math.max(0, Math.floor(view.x) - 2);
    const x1 = Math.min(W - 1, Math.ceil(view.x + view.w) + 2);
    const y0 = Math.max(0, Math.floor(view.y) - 4);
    const y1 = Math.min(H - 1, Math.ceil(view.y + view.h) + 1);
    const sp = stage.sprites;
    for (const pc of this.pieces) {
      if (pc.x + pc.w < x0 || pc.x > x1 || pc.y < y0 || pc.y > y1) continue;
      const dark = pc.d <= 1 ? 1 : Math.max(0.22, 1 - (pc.d - 1) * 0.22);
      sp.push(atlas.get(pc.name), pc.x + pc.w / 2, pc.y, { top: pc.h, tint: [dark, dark, dark * 1.04], flip: pc.flip });
    }
    for (const p of this.props) {
      const fx = p.x + (p.w ?? 1) / 2;
      if (fx < x0 - 2 || fx > x1 + 2 || p.y < y0 - 3 || p.y > y1 + 1) continue;
      if (this.broken.has(p.id) && p.kind !== 'barricade') continue;
      let name = SPRITE_FOR[p.kind];
      const o = { top: p.h };
      if (p.kind === 'brazier' || p.kind === 'greatbrazier') name += p.lit ? '-lit' : '';
      else if (p.kind === 'torch') {
        name += p.lit ? '-lit' : '';
        sp.push(atlas.get(name), fx, p.y + 1, { z: 0.78, key: p.y + 0.98, base: p.y + 1 });
        continue;
      } else if (p.kind === 'banner') {
        sp.push(atlas.get(`banner-${p.id % 2}`), fx, p.y + 1, { z: 0.12, key: p.y + 0.97, base: p.y + 1 });
        continue;
      } else if (p.kind === 'gate') {
        name = `gate-${this.open.has(p.id) ? 'open' : Math.min(3, beaconsLit)}`;
      } else if (p.kind === 'barricade' && this.open.has(p.id)) {
        sp.push(atlas.get('barricade-broken'), fx, p.y, { key: p.y + 0.5 });
        continue;
      } else if (p.kind === 'block' || p.kind === 'hedge' || p.kind === 'crate' || p.kind === 'pot' || p.kind === 'lowwall' || p.kind === 'grass' || p.kind === 'rubble' || p.kind === 'bones' || p.kind === 'fence' || p.kind === 'pillar') {
        name += `-${p.id % (p.kind === 'pillar' ? 2 : 3)}`;
      }
      if (p.kind === 'rubble' || p.kind === 'bones') {
        sp.push(atlas.get(name), fx, p.y + 0.5, { flat: p.kind === 'bones', key: p.y + 0.6 });
        continue;
      }
      if (p.hp !== undefined && p.flash > 0) o.flash = p.flash;
      if (p.shake > 0) o.rot = Math.sin(t * 60) * p.shake * 0.05;
      sp.push(atlas.get(name), fx, p.y, o);
    }
    for (const g of this.tufts) {
      if (g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      sp.push(atlas.get(`grass-${g.v}`), g.x, g.y, { sx: g.s, sy: g.s, rot: Math.sin(t * 1.3 + g.x) * 0.04 });
    }
  }
}

export { FLOOR };
