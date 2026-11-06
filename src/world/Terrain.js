import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader
} from 'three';
import { settings } from '../config/settings.js';
import { SURFACE_OPTIONS } from './MapPlan.js';

/**
 * The ground of a composed map: a procedural relief (from the level's
 * `relief` and `seed`) plus two hand-edited grids on top of it.
 *
 *   sculpt — metres added to the height, painted with raise / lower / smooth / flatten
 *   paint  — which surface colours each cell (0 = the level's own ground)
 *
 * The fighting disc (radius `settings.ruins.wallRadius`) never moves: movement,
 * aiming and every ground effect assume y = 0 there, so sculpting fades out
 * before it reaches the arena. Paint is cosmetic and allowed everywhere.
 */

export const TERRAIN_RADIUS = 170;
/** Grid cells per side over [-TERRAIN_RADIUS, TERRAIN_RADIUS] (≈2.1 m per cell). */
export const GRID = 161;

export const SURFACE_COLORS = {
  grass: ['#3f5a2c', '#56703a'], snow: ['#d9e2ec', '#f2f6fa'], sand: ['#b89a68', '#d1b984'],
  rock: ['#5d5a57', '#77736e'], dirt: ['#5a4535', '#715a45'], mud: ['#3d3125', '#52412f'],
  gravel: ['#6e6962', '#8a847b'], moss: ['#44592f', '#5b7140'], ice: ['#a9c8dc', '#cfe4f1'],
  lava: ['#2a1d18', '#3c2620'], paving: ['#5f5c57', '#77736c'], asphalt: ['#2f3135', '#3d4045']
};

const RELIEF = {
  flat: { amp: 0.8, rise: 40, ridged: false },
  hills: { amp: 9, rise: 50, ridged: false },
  mountains: { amp: 46, rise: 90, ridged: true },
  canyon: { amp: 24, rise: 9, ridged: false, plateau: true },
  valley: { amp: 18, rise: 110, ridged: false }
};

/* ---------------------------------------------------------------------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const base = Array.from({ length: 256 }, (_, i) => i).sort(() => rng() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const grad = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1], ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return x1 + v * (x2 - x1);
  };
  return (x, y, octaves = 4, ridged = false) => {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      let n = noise(x * freq, y * freq);
      if (ridged) n = 1 - Math.abs(n) * 1.6;
      sum += n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* Typed arrays ⇄ base64, so a level stays one plain JSON file. */
const toBase64 = (typed) => {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (text, Type) => {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Type(bytes.buffer);
};

/* ---------------------------------------------------------------------- */

export class Terrain {
  /** @param {import('../library/Catalog.js').Catalog} catalog */
  constructor(catalog) {
    this.catalog = catalog;
    this.sculpt = new Float32Array(GRID * GRID);
    this.paint = new Uint8Array(GRID * GRID);
    this.mesh = null;
    this.groundMaterialId = null;
    this.setup({ ground: 'dirt', relief: 'hills', seed: 1 });
  }

  /** Change the procedural base. Hand edits (sculpt, paint) are kept. */
  setup({ ground = this.ground, relief = this.relief, seed = this.seed } = {}) {
    this.ground = ground;
    this.relief = RELIEF[relief] ? relief : 'hills';
    this.seed = seed | 0;
    this._fbm = makeNoise(this.seed ^ 0x5bd1e995);
    this._shape = RELIEF[this.relief];
  }

  clearEdits() {
    this.sculpt.fill(0);
    this.paint.fill(0);
  }

  /* -------------------------------------------------------------------- */
  /* Height                                                                */
  /* -------------------------------------------------------------------- */

  get flatRadius() {
    return settings.ruins.wallRadius + 3;
  }

  /** The procedural relief alone — what "flatten" and the sculpt grid are measured against. */
  baseHeight(x, z) {
    const r = Math.hypot(x, z);
    const flat = this.flatRadius;
    if (r <= flat) return 0;
    const s = this._shape;
    const t = smoothstep(flat, flat + s.rise, r);
    let n = this._fbm(x * 0.018, z * 0.018, 5, s.ridged);
    n = s.ridged ? Math.max(0, n) ** 1.6 : 0.5 + 0.5 * n;
    let h = s.plateau ? t * s.amp * (0.85 + 0.15 * n) : t * s.amp * (0.35 + 0.65 * n);
    if (this.relief === 'mountains') h *= 0.6 + 0.6 * smoothstep(flat, TERRAIN_RADIUS, r);
    return h;
  }

  /** How much sculpting is allowed here: 0 in the fighting disc, 1 well outside it. */
  sculptMask(x, z) {
    const R = settings.ruins.wallRadius;
    return smoothstep(R + 1, R + 6, Math.hypot(x, z));
  }

  heightAt(x, z) {
    return this.baseHeight(x, z) + this._sample(this.sculpt, x, z) * this.sculptMask(x, z);
  }

  _cell(x, z) {
    const u = ((x + TERRAIN_RADIUS) / (2 * TERRAIN_RADIUS)) * (GRID - 1);
    const v = ((z + TERRAIN_RADIUS) / (2 * TERRAIN_RADIUS)) * (GRID - 1);
    return [u, v];
  }

  _sample(grid, x, z) {
    const [u, v] = this._cell(x, z);
    if (u < 0 || v < 0 || u > GRID - 1 || v > GRID - 1) return 0;
    const i = Math.min(GRID - 2, Math.floor(u));
    const j = Math.min(GRID - 2, Math.floor(v));
    const fu = u - i, fv = v - j;
    const a = grid[j * GRID + i], b = grid[j * GRID + i + 1];
    const c = grid[(j + 1) * GRID + i], d = grid[(j + 1) * GRID + i + 1];
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
  }

  /* -------------------------------------------------------------------- */
  /* Brushes                                                               */
  /* -------------------------------------------------------------------- */

  /**
   * @param {'raise'|'lower'|'smooth'|'flatten'|'paint'} tool
   * @param {{ radius: number, strength: number, surface?: string, target?: number }} options
   * @param {number} dt seconds this stroke step covers
   * @returns {boolean} whether anything changed
   */
  brush(tool, x, z, { radius = 6, strength = 1, surface = 'grass', target = 0 } = {}, dt = 1 / 60) {
    const cellSize = (2 * TERRAIN_RADIUS) / (GRID - 1);
    const [cu, cv] = this._cell(x, z);
    const reach = Math.ceil(radius / cellSize) + 1;
    const paintIndex = SURFACE_OPTIONS.indexOf(surface) + 1;
    let changed = false;
    const before = tool === 'smooth' ? this.sculpt.slice() : null;
    for (let j = Math.max(0, Math.floor(cv) - reach); j <= Math.min(GRID - 1, Math.ceil(cv) + reach); j++) {
      for (let i = Math.max(0, Math.floor(cu) - reach); i <= Math.min(GRID - 1, Math.ceil(cu) + reach); i++) {
        const wx = (i / (GRID - 1)) * 2 * TERRAIN_RADIUS - TERRAIN_RADIUS;
        const wz = (j / (GRID - 1)) * 2 * TERRAIN_RADIUS - TERRAIN_RADIUS;
        const d = Math.hypot(wx - x, wz - z);
        if (d > radius) continue;
        const w = 1 - smoothstep(radius * 0.35, radius, d);
        const k = j * GRID + i;
        if (tool === 'paint') {
          if (w > 0.35 && this.paint[k] !== paintIndex) {
            this.paint[k] = paintIndex;
            changed = true;
          }
          continue;
        }
        if (this.sculptMask(wx, wz) <= 0) continue;
        const rate = strength * 6 * dt * w; // ~6 m/s at full strength
        let next = this.sculpt[k];
        if (tool === 'raise') next += rate;
        else if (tool === 'lower') next -= rate;
        else if (tool === 'flatten') next += (target - this.baseHeight(wx, wz) - next) * Math.min(1, rate * 0.8);
        else if (tool === 'smooth' && i > 0 && j > 0 && i < GRID - 1 && j < GRID - 1) {
          const avg = (before[k - 1] + before[k + 1] + before[k - GRID] + before[k + GRID]) * 0.25;
          next += (avg - next) * Math.min(1, rate * 0.6);
        }
        next = Math.max(-30, Math.min(80, next));
        if (next !== this.sculpt[k]) {
          this.sculpt[k] = next;
          changed = true;
        }
      }
    }
    return changed;
  }

  /* -------------------------------------------------------------------- */
  /* Mesh                                                                  */
  /* -------------------------------------------------------------------- */

  /** Build (or rebuild) the mesh and load the ground texture. */
  async build() {
    if (!this.mesh) {
      const rings = 110;
      const segments = 180;
      const count = 1 + rings * segments;
      const positions = new Float32Array(count * 3);
      const uvs = new Float32Array(count * 2);
      const index = [];
      for (let j = 0; j < segments; j++) index.push(0, 1 + ((j + 1) % segments), 1 + j);
      for (let i = 1; i < rings; i++) {
        const a0 = 1 + (i - 1) * segments;
        const b0 = 1 + i * segments;
        for (let j = 0; j < segments; j++) {
          const j1 = (j + 1) % segments;
          index.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
        }
      }
      // Ring radii bunch up near the arena, where the camera looks closest.
      this._xz = new Float32Array(count * 2);
      let v = 1;
      for (let i = 1; i <= rings; i++) {
        const r = TERRAIN_RADIUS * (i / rings) ** 1.7;
        for (let j = 0; j < segments; j++, v++) {
          const a = (j / segments) * Math.PI * 2;
          this._xz[v * 2] = Math.cos(a) * r;
          this._xz[v * 2 + 1] = Math.sin(a) * r;
          uvs[v * 2] = this._xz[v * 2] / 11;
          uvs[v * 2 + 1] = this._xz[v * 2 + 1] / 11;
        }
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3));
      geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
      this.mesh = new Mesh(geometry, material);
      this.mesh.name = 'composed-terrain';
      this.mesh.receiveShadow = true;
      this.mesh.position.y = -0.005;
    }
    await this._loadGroundTexture();
    this.refresh();
    return this.mesh;
  }

  async _loadGroundTexture() {
    const material = this.mesh.material;
    if (this._textureFor === this.ground) return;
    this._textureFor = this.ground;
    for (const key of ['map', 'normalMap', 'roughnessMap']) {
      material[key]?.dispose();
      material[key] = null;
    }
    this.groundMaterialId = null;
    // Deterministic per seed, so a saved level reloads with the same texture.
    const options = this.catalog.materials.filter((m) => m.surface === this.ground);
    const surface = options.length ? options[this.seed % options.length] : null;
    if (surface?.maps?.color) {
      const loader = new TextureLoader();
      const load = async (file, srgb) => {
        if (!file) return null;
        try {
          const texture = await loader.loadAsync(this.catalog.url(file));
          texture.wrapS = texture.wrapT = RepeatWrapping;
          texture.anisotropy = 8;
          if (srgb) texture.colorSpace = SRGBColorSpace;
          return texture;
        } catch {
          return null;
        }
      };
      const [map, normalMap, roughnessMap] = await Promise.all([
        load(surface.maps.color, true),
        load(surface.maps.normal, false),
        load(surface.maps.roughness, false)
      ]);
      material.map = map;
      material.normalMap = normalMap;
      material.roughnessMap = roughnessMap;
      if (map) this.groundMaterialId = surface.id;
    }
    material.needsUpdate = true;
  }

  /** Recompute heights, colours and normals from the current grids. */
  refresh() {
    if (!this.mesh) return;
    const geometry = this.mesh.geometry;
    const pos = geometry.getAttribute('position');
    const col = geometry.getAttribute('color');
    const textured = Boolean(this.mesh.material.map);
    const [low, high] = (SURFACE_COLORS[this.ground] ?? SURFACE_COLORS.dirt).map((c) => new Color(c));
    const rock = new Color(SURFACE_COLORS.rock[0]);
    const snow = new Color(SURFACE_COLORS.snow[1]);
    const painted = SURFACE_OPTIONS.map((s) => (SURFACE_COLORS[s] ?? SURFACE_COLORS.dirt).map((c) => new Color(c)));
    const base = new Color();
    const corner = [new Color(), new Color(), new Color(), new Color()];
    const out = new Color();

    for (let v = 0; v < pos.count; v++) {
      const x = v === 0 ? 0 : this._xz[v * 2];
      const z = v === 0 ? 0 : this._xz[v * 2 + 1];
      const h = this.heightAt(x, z);
      pos.setXYZ(v, x, h, z);

      const n = 0.5 + 0.5 * this._fbm(x * 0.09, z * 0.09, 3);
      base.copy(low).lerp(high, n);
      if (h > 4) base.lerp(rock, smoothstep(4, 22, h) * 0.85);
      if (this.ground === 'snow' || (this.relief === 'mountains' && h > 28)) {
        base.lerp(snow, smoothstep(this.ground === 'snow' ? 0 : 28, 40, h));
      }

      // Painted surfaces, blended bilinearly between grid cells so edges are soft.
      const [u, w] = this._cell(x, z);
      const i = Math.max(0, Math.min(GRID - 2, Math.floor(u)));
      const j = Math.max(0, Math.min(GRID - 2, Math.floor(w)));
      const cells = [j * GRID + i, j * GRID + i + 1, (j + 1) * GRID + i, (j + 1) * GRID + i + 1];
      let any = false;
      const paintedCorner = [0, 0, 0, 0];
      cells.forEach((k, c) => {
        const p = this.paint[k];
        if (p) {
          any = true;
          paintedCorner[c] = 1;
          corner[c].copy(painted[p - 1][0]).lerp(painted[p - 1][1], n);
        } else corner[c].copy(base);
      });
      let paintWeight = 0;
      if (any) {
        const fu = Math.min(1, Math.max(0, u - i));
        const fv = Math.min(1, Math.max(0, w - j));
        out.copy(corner[0]).lerp(corner[1], fu);
        base.copy(corner[2]).lerp(corner[3], fu);
        out.lerp(base, fv);
        paintWeight =
          (paintedCorner[0] * (1 - fu) + paintedCorner[1] * fu) * (1 - fv) +
          (paintedCorner[2] * (1 - fu) + paintedCorner[3] * fu) * fv;
      } else out.copy(base);

      // Over a photo texture the level's own ground becomes a light tint; painted
      // surfaces keep their full colour so a path or a patch actually reads.
      if (textured) {
        const k = 1 - paintWeight;
        col.setXYZ(
          v,
          (0.35 + out.r * 1.1) * k + out.r * 1.25 * paintWeight,
          (0.35 + out.g * 1.1) * k + out.g * 1.25 * paintWeight,
          (0.35 + out.b * 1.1) * k + out.b * 1.25 * paintWeight
        );
      } else col.setXYZ(v, out.r, out.g, out.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  /* -------------------------------------------------------------------- */
  /* Save / load                                                           */
  /* -------------------------------------------------------------------- */

  serialize() {
    const data = { grid: GRID, extent: TERRAIN_RADIUS };
    if (this.sculpt.some((v) => v !== 0)) {
      // Centimetres in int16: ±327 m, far more than the brush allows.
      const cm = new Int16Array(this.sculpt.length);
      for (let i = 0; i < cm.length; i++) cm[i] = Math.round(this.sculpt[i] * 100);
      data.sculpt = toBase64(cm);
    }
    if (this.paint.some((v) => v !== 0)) data.paint = toBase64(this.paint);
    return data;
  }

  load(data = {}) {
    this.clearEdits();
    if (data.grid && data.grid !== GRID) {
      console.warn(`[Terrain] saved grid ${data.grid} ≠ ${GRID}; hand edits dropped`);
      return;
    }
    try {
      if (data.sculpt) {
        const cm = fromBase64(data.sculpt, Int16Array);
        for (let i = 0; i < Math.min(cm.length, this.sculpt.length); i++) this.sculpt[i] = cm[i] / 100;
      }
      if (data.paint) this.paint.set(fromBase64(data.paint, Uint8Array).subarray(0, this.paint.length));
    } catch (error) {
      console.warn('[Terrain] could not read saved edits:', error.message);
      this.clearEdits();
    }
  }

  snapshot() {
    return { sculpt: this.sculpt.slice(), paint: this.paint.slice() };
  }

  restore(snapshot) {
    this.sculpt.set(snapshot.sculpt);
    this.paint.set(snapshot.paint);
  }

  dispose() {
    if (!this.mesh) return;
    this.mesh.geometry.dispose();
    const m = this.mesh.material;
    for (const t of [m.map, m.normalMap, m.roughnessMap]) t?.dispose();
    m.dispose();
    this.mesh.removeFromParent();
    this.mesh = null;
    this._textureFor = null;
  }
}
