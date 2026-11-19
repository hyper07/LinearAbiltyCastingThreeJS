/**
 * Gloamreach's textures. Photographed PBR sets from the asset library
 * (ambientCG, CC0) loaded as plain textures or packed into array textures
 * for the terrain, and everything else painted here on canvas: bark that
 * tiles round a trunk, plaster, leaf clusters, cloth, the inn's sign, carved
 * stone, and the soft sprites for glows, smoke and motes. When the library
 * isn't there yet every photographed set has a painted stand-in, so the map
 * always draws.
 */
import * as THREE from 'three';
import { rng } from './noise.js';

const LIB = './library/';

/* ------------------------------------------------------------------ tileable noise */

/** Periodic value noise on a `period`-cell lattice (tiles every `period` units). */
function makePeriodic(seed) {
  const r = rng(seed);
  const table = new Float32Array(4096);
  for (let i = 0; i < table.length; i++) table[i] = r();
  const at = (x, y, p) => {
    let h = Math.imul((((x % p) + p) % p) | 0, 374761393) ^ Math.imul((((y % p) + p) % p) | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return table[(h ^ (h >>> 16)) & 4095];
  };
  return (x, y, p) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(xi, yi, p) + (at(xi + 1, yi, p) - at(xi, yi, p)) * sx;
    const b = at(xi, yi + 1, p) + (at(xi + 1, yi + 1, p) - at(xi, yi + 1, p)) * sx;
    return a + (b - a) * sy;
  };
}

/** Tileable fractal noise (0–1): `px`×`py` cells at the first octave. */
function pfbm(n, u, v, px, py, oct = 4) {
  let s = 0;
  let a = 0.5;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    // Separate periods in x and y via scaled lattice coordinates.
    const fx = px << o;
    const fy = py << o;
    s += a * n2(n, u * fx, v * fy, fx, fy);
    norm += a;
    a *= 0.5;
  }
  return s / norm;
}

function n2(n, x, y, fx, fy) {
  // A lattice periodic in x by fx and in y by fy.
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const c = (i, j) => n(((i % fx) + fx) % fx, ((j % fy) + fy) % fy, 4096) ;
  const a = c(xi, yi) + (c(xi + 1, yi) - c(xi, yi)) * sx;
  const b = c(xi, yi + 1) + (c(xi + 1, yi + 1) - c(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
}

/** A normal map (canvas) from a height field (Float32Array w×h, wrapping). */
function normalFromHeight(hf, w, h, strength = 2) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = hf[y * w + ((x - 1 + w) % w)];
      const r = hf[y * w + ((x + 1) % w)];
      const u = hf[((y - 1 + h) % h) * w + x];
      const d = hf[((y + 1) % h) * w + x];
      // GL convention: +y is up the image.
      let nx = (l - r) * strength;
      let ny = (d - u) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const canvasTex = (canvas, { srgb = true, repeat = true, aniso = 8 } = {}) => {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};

/* ------------------------------------------------------------------ the bank */

export class TextureBank {
  constructor(renderer, { size = 1024 } = {}) {
    this.renderer = renderer;
    this.size = size;
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.cache = new Map();
    this.images = new Map();
    this.all = [];
  }

  _keep(t) {
    this.all.push(t);
    return t;
  }

  /** An image from the library as an ImageBitmap (null if it isn't there). */
  image(url) {
    if (!this.images.has(url)) {
      this.images.set(
        url,
        fetch(url)
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => (b ? createImageBitmap(b) : null))
          .catch(() => null)
      );
    }
    return this.images.get(url);
  }

  /** An ambientCG set as { map, normalMap, roughnessMap/aoMap (packed), height } — or painted stand-ins. */
  async ambient(id, { fallback = '#888', repeat = 1 } = {}) {
    const key = `amb:${id}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = (async () => {
      const base = `${LIB}ambientcg/${id}/${id}_1K-JPG_`;
      // Only ask for maps the set has (a miss would show as an error in the console).
      const noAO = /^(Lava|Ice|Metal0|MetalPlates|PaintedMetal|Concrete034|Road007|WoodFloor06)/.test(id);
      const hasEmission = /^Lava/.test(id);
      const want = ['Color', 'NormalGL', 'Roughness', noAO ? null : 'AmbientOcclusion', 'Displacement', hasEmission ? 'Emission' : null];
      const [col, nor, rou, ao, disp, emi] = await Promise.all(want.map((s) => (s ? this.image(`${base}${s}.jpg`) : null)));
      if (!col) return this._paintedSet(id, fallback);
      const S = Math.min(this.size, col.width);
      const map = this._keep(this._fromImage(col, S, true));
      const normalMap = nor ? this._keep(this._fromImage(nor, S, false)) : null;
      const arm = this._keep(canvasTex(this._pack(S, ao, rou, disp), { srgb: false, aniso: this.aniso }));
      const emissiveMap = emi ? this._keep(this._fromImage(emi, S, true)) : null;
      for (const t of [map, normalMap, arm, emissiveMap]) if (t) t.repeat.set(repeat, repeat);
      return { map, normalMap, arm, emissiveMap, painted: false };
    })();
    this.cache.set(key, p);
    return p;
  }

  _fromImage(img, S, srgb) {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    c.getContext('2d').drawImage(img, 0, 0, S, S);
    return canvasTex(c, { srgb, aniso: this.aniso });
  }

  /** AO in red, roughness in green, height in blue (what aoMap/roughnessMap read). */
  _pack(S, ao, rou, disp) {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true });
    const read = (img, def) => {
      if (!img) return null;
      g.clearRect(0, 0, S, S);
      g.drawImage(img, 0, 0, S, S);
      return g.getImageData(0, 0, S, S).data;
      void def;
    };
    const a = read(ao);
    const r = read(rou);
    const d = read(disp);
    const out = g.createImageData(S, S);
    for (let i = 0; i < S * S * 4; i += 4) {
      out.data[i] = a ? a[i] : 255;
      out.data[i + 1] = r ? r[i] : 200;
      out.data[i + 2] = d ? d[i] : 128;
      out.data[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    return c;
  }

  /** A stand-in when the library hasn't been fetched: noise in the set's colour. */
  _paintedSet(id, color) {
    const S = 256;
    const n = makePeriodic(id.length * 97);
    const hf = new Float32Array(S * S);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    const base = new THREE.Color(color);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const v = pfbm(n, x / S, y / S, 8, 8, 4);
        hf[y * S + x] = v;
        const k = 0.7 + v * 0.6;
        const i = (y * S + x) * 4;
        img.data[i] = Math.min(255, base.r * 255 * k);
        img.data[i + 1] = Math.min(255, base.g * 255 * k);
        img.data[i + 2] = Math.min(255, base.b * 255 * k);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const map = this._keep(canvasTex(c, { aniso: this.aniso }));
    const normalMap = this._keep(canvasTex(normalFromHeight(hf, S, S, 3), { srgb: false }));
    const pc = document.createElement('canvas');
    pc.width = pc.height = S;
    const pg = pc.getContext('2d');
    const pi = pg.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      pi.data[i * 4] = 200 + hf[i] * 55;
      pi.data[i * 4 + 1] = 210;
      pi.data[i * 4 + 2] = hf[i] * 255;
      pi.data[i * 4 + 3] = 255;
    }
    pg.putImageData(pi, 0, 0);
    const arm = this._keep(canvasTex(pc, { srgb: false }));
    return { map, normalMap, arm, emissiveMap: null, painted: true };
  }

  /**
   * Several sets as three array textures (colour, normal, packed AO/rough/height),
   * one layer each — the terrain blends them all with three samplers.
   */
  async arrays(list, size = 1024) {
    const sets = await Promise.all(list.map((l) => this.ambient(l.id, { fallback: l.fallback })));
    const S = size;
    const layers = sets.length;
    const make = (pick, srgb, tint) => {
      const data = new Uint8Array(S * S * 4 * layers);
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d', { willReadFrequently: true });
      sets.forEach((set, i) => {
        const tex = pick(set);
        g.clearRect(0, 0, S, S);
        g.drawImage(tex.image, 0, 0, S, S);
        const px = g.getImageData(0, 0, S, S).data;
        const t = tint?.(i);
        if (t) {
          for (let k = 0; k < px.length; k += 4) {
            px[k] = Math.min(255, px[k] * t[0]);
            px[k + 1] = Math.min(255, px[k + 1] * t[1]);
            px[k + 2] = Math.min(255, px[k + 2] * t[2]);
          }
        }
        data.set(px, i * S * S * 4);
      });
      const tex = new THREE.DataArrayTexture(data, S, S, layers);
      tex.format = THREE.RGBAFormat;
      tex.type = THREE.UnsignedByteType;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = this.aniso;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return this._keep(tex);
    };
    return {
      color: make((s) => s.map, true, (i) => list[i].tint),
      normal: make((s) => s.normalMap ?? s.map, false),
      arm: make((s) => s.arm, false),
      painted: sets.some((s) => s.painted)
    };
  }

  /* -------------------------------------------------------------- painted */

  /**
   * Bark: long fibrous ridges with deep fissures between them, tiling round
   * the trunk (u) and up it (v). `palette`: [fissure, body, ridge, moss].
   */
  bark(seed, palette, { w = 512, h = 1024, mossy = 0.3, twist = 0.15 } = {}) {
    const key = `bark:${seed}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const n = makePeriodic(seed);
    const hf = new Float32Array(w * h);
    const col = document.createElement('canvas');
    col.width = w;
    col.height = h;
    const g = col.getContext('2d');
    const img = g.createImageData(w, h);
    const C = palette.map((p) => new THREE.Color(p));
    const tmp = new THREE.Color();
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        // Warp sideways a little as it climbs, so the fibres wander.
        const warp = (pfbm(n, u, v, 3, 2, 3) - 0.5) * 0.12 + v * twist;
        const uu = (((u + warp) % 1) + 1) % 1;
        const ridgeN = pfbm(n, uu, v * 0.25, 14, 1, 4);
        const fiss = 1 - Math.abs(ridgeN * 2 - 1); // ridged
        const fine = pfbm(n, uu, v, 64, 32, 3);
        const plates = pfbm(n, uu, v, 6, 8, 3);
        let hgt = Math.pow(fiss, 2.2) * 0.75 + fine * 0.18 + plates * 0.2;
        hf[y * w + x] = hgt;
        const moss = Math.max(0, pfbm(n, uu + 0.37, v, 4, 6, 3) - (1 - mossy)) * 3 * (1 - hgt * 0.5);
        if (hgt < 0.32) tmp.copy(C[0]).lerp(C[1], hgt / 0.32);
        else tmp.copy(C[1]).lerp(C[2], Math.min(1, (hgt - 0.32) / 0.6));
        tmp.lerp(C[3], Math.min(0.85, moss));
        const shade = 0.82 + fine * 0.36;
        const i = (y * w + x) * 4;
        img.data[i] = Math.min(255, tmp.r * 255 * shade);
        img.data[i + 1] = Math.min(255, tmp.g * 255 * shade);
        img.data[i + 2] = Math.min(255, tmp.b * 255 * shade);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const out = {
      map: this._keep(canvasTex(col, { aniso: this.aniso })),
      normalMap: this._keep(canvasTex(normalFromHeight(hf, w, h, 5), { srgb: false, aniso: this.aniso }))
    };
    this.cache.set(key, out);
    return out;
  }

  /** Lime plaster, a little stained and patched. */
  plaster(seed = 3, color = '#e9dcc0') {
    const key = `plaster:${seed}:${color}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const S = 512;
    const n = makePeriodic(seed);
    const hf = new Float32Array(S * S);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    const base = new THREE.Color(color);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const blot = pfbm(n, u, v, 4, 4, 4);
        const fine = pfbm(n, u, v, 48, 48, 2);
        const streak = pfbm(n, u, v * 0.2, 24, 1, 2);
        hf[y * S + x] = blot * 0.4 + fine * 0.6;
        const k = 0.86 + blot * 0.22 + fine * 0.06 - Math.max(0, streak - 0.62) * 0.5;
        const i = (y * S + x) * 4;
        img.data[i] = Math.min(255, base.r * 255 * k);
        img.data[i + 1] = Math.min(255, base.g * 255 * k * 0.995);
        img.data[i + 2] = Math.min(255, base.b * 255 * k * 0.97);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const out = { map: this._keep(canvasTex(c, { aniso: this.aniso })), normalMap: this._keep(canvasTex(normalFromHeight(hf, S, S, 1.5), { srgb: false })) };
    this.cache.set(key, out);
    return out;
  }

  /**
   * A cluster of leaves on a transparent card: dozens of small leaves
   * fanned round a centre, lit from above in the paint so the cards read
   * as clumps. `colors`: a few leaf colours (dark to light).
   */
  leaves(seed, colors, { count = 70, shape = 'oak', size = 512 } = {}) {
    const key = `leaves:${seed}:${colors.join()}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const r = rng(seed);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const S = size / 512;
    // Twigs first.
    g.strokeStyle = '#3a2a1c';
    g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2;
      g.lineWidth = (2 + r() * 2.5) * S;
      g.beginPath();
      g.moveTo(256 * S, 256 * S);
      g.quadraticCurveTo((256 + Math.cos(a + 0.4) * 90) * S, (256 + Math.sin(a + 0.4) * 90) * S, (256 + Math.cos(a) * 200) * S, (256 + Math.sin(a) * 200) * S);
      g.stroke();
    }
    const leaf = (x, y, len, wid, ang, col, light) => {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      const grad = g.createLinearGradient(0, -wid, 0, wid);
      grad.addColorStop(0, shadeHex(col, 1.12 * light));
      grad.addColorStop(1, shadeHex(col, 0.72 * light));
      g.fillStyle = grad;
      g.beginPath();
      if (shape === 'needle') {
        g.ellipse(0, 0, len, wid * 0.35, 0, 0, Math.PI * 2);
      } else if (shape === 'oak') {
        // A lobed leaf.
        g.moveTo(-len, 0);
        for (let t = 0; t <= 1.0001; t += 0.125) {
          const xx = -len + t * 2 * len;
          const lobe = Math.sin(t * Math.PI) * wid * (0.75 + 0.25 * Math.cos(t * Math.PI * 8));
          g.lineTo(xx, -lobe);
        }
        for (let t = 1; t >= -0.0001; t -= 0.125) {
          const xx = -len + t * 2 * len;
          const lobe = Math.sin(t * Math.PI) * wid * (0.75 + 0.25 * Math.cos(t * Math.PI * 8 + 1));
          g.lineTo(xx, lobe);
        }
      } else {
        g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
      }
      g.fill();
      g.strokeStyle = shadeHex(col, 0.55);
      g.lineWidth = 0.8 * S;
      g.beginPath();
      g.moveTo(-len * 0.9, 0);
      g.lineTo(len * 0.9, 0);
      g.stroke();
      g.restore();
    };
    for (let k = 0; k < count; k++) {
      // Denser and brighter at the top (lit), darker toward the bottom and centre.
      const a = r() * Math.PI * 2;
      const rad = Math.pow(r(), 0.65) * 205;
      const x = 256 + Math.cos(a) * rad;
      const y = 256 + Math.sin(a) * rad * 0.92;
      const light = 0.78 + (1 - y / 512) * 0.42 + (rad / 205) * 0.12;
      const col = colors[Math.floor(r() * colors.length)];
      const len = (18 + r() * 16) * (shape === 'needle' ? 1.3 : 1);
      leaf(x * S, y * S, len * S, len * 0.5 * S, a + (r() - 0.5) * 1.4, col, light);
    }
    const out = this._keep(canvasTex(c, { repeat: false, aniso: this.aniso }));
    out.premultiplyAlpha = false;
    this.cache.set(key, out);
    return out;
  }

  /** A soft round glow (white; tint it with the material colour). */
  glow(size = 128, falloff = 2.2) {
    const key = `glow:${size}:${falloff}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
        const v = Math.max(0, 1 - d);
        const a = Math.pow(v, falloff);
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = this._keep(canvasTex(c, { repeat: false, srgb: false }));
    this.cache.set(key, t);
    return t;
  }

  /** A soft, lumpy puff for smoke and fog cards. */
  puff(seed = 9, size = 128) {
    const key = `puff:${seed}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const n = makePeriodic(seed);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x / size - 0.5, y / size - 0.5) * 2;
        const v = pfbm(n, x / size, y / size, 4, 4, 4);
        const a = Math.max(0, 1 - d) ** 1.5 * (0.45 + v * 0.9);
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.min(255, a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    const t = this._keep(canvasTex(c, { repeat: false, srgb: false }));
    this.cache.set(key, t);
    return t;
  }

  /** Striped market cloth. */
  cloth(a, b, stripes = 8) {
    const key = `cloth:${a}:${b}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect((i * S) / stripes, 0, S / stripes + 1, S);
    }
    // Weave.
    const img = g.getImageData(0, 0, S, S);
    const r = rng(a.length * 13 + b.length);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        const k = 0.9 + ((x + y) % 2) * 0.06 + (r() - 0.5) * 0.08;
        img.data[i] *= k;
        img.data[i + 1] *= k;
        img.data[i + 2] *= k;
      }
    }
    g.putImageData(img, 0, 0);
    const t = this._keep(canvasTex(c, { aniso: this.aniso }));
    this.cache.set(key, t);
    return t;
  }

  /** A painted board: a sign's face with an emblem and words. */
  sign({ text, sub = '', emblem = 'acorn', w = 512, h = 256, wood = '#5a3a20', ink = '#f2d58a' }) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, shadeHex(wood, 1.15));
    grad.addColorStop(1, shadeHex(wood, 0.8));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // Grain.
    const r = rng(text.length * 7);
    g.globalAlpha = 0.18;
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = r() > 0.5 ? '#2a180a' : '#9a7048';
      g.lineWidth = 1 + r() * 2;
      const y = r() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 20, w * 0.7, y + (r() - 0.5) * 20, w, y + (r() - 0.5) * 10);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = shadeHex(ink, 0.8);
    g.lineWidth = 6;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const ex = emblem ? h * 0.42 : 0;
    if (emblem === 'acorn') {
      g.save();
      g.translate(w / 2, h * 0.34);
      g.fillStyle = ink;
      g.beginPath();
      g.ellipse(0, 10, 26, 32, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = shadeHex(ink, 0.7);
      g.beginPath();
      g.ellipse(0, -14, 34, 16, 0, Math.PI, 0);
      g.fill();
      g.fillRect(-3, -40, 6, 14);
      g.restore();
    }
    g.fillStyle = ink;
    g.font = `bold ${Math.round(h * (emblem ? 0.2 : 0.3))}px Georgia, 'Times New Roman', serif`;
    g.fillText(text, w / 2, emblem ? h * 0.72 : h * (sub ? 0.42 : 0.52));
    if (sub) {
      g.font = `italic ${Math.round(h * 0.14)}px Georgia, serif`;
      g.fillText(sub, w / 2, h * 0.76);
    }
    void ex;
    return this._keep(canvasTex(c, { repeat: false, aniso: this.aniso }));
  }

  /**
   * Carved stone relief: knotwork, leaves and a ring, as height → a normal
   * map and an occlusion-darkened colour, for the gate's panels.
   */
  relief(seed = 5, S = 512) {
    const key = `relief:${seed}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    // Draw the carving in white (raised), blurred into a height field.
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineCap = 'round';
    g.lineWidth = S * 0.035;
    g.strokeRect(S * 0.06, S * 0.06, S * 0.88, S * 0.88);
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = S * 0.025;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(S / 2 + Math.cos(a) * S * 0.1, S / 2 + Math.sin(a) * S * 0.1);
      g.bezierCurveTo(S / 2 + Math.cos(a + 0.6) * S * 0.25, S / 2 + Math.sin(a + 0.6) * S * 0.25, S / 2 + Math.cos(a - 0.5) * S * 0.36, S / 2 + Math.sin(a - 0.5) * S * 0.36, S / 2 + Math.cos(a) * S * 0.42, S / 2 + Math.sin(a) * S * 0.42);
      g.stroke();
      // Leaf at the end.
      g.save();
      g.translate(S / 2 + Math.cos(a) * S * 0.42, S / 2 + Math.sin(a) * S * 0.42);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, S * 0.04, S * 0.018, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.07, 0, Math.PI * 2);
    g.fill();
    // Blur by drawing scaled copies.
    const src = g.getImageData(0, 0, S, S).data;
    const hf = new Float32Array(S * S);
    const rad = Math.round(S * 0.008);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let s = 0;
        let n = 0;
        for (let j = -rad; j <= rad; j += 1) {
          for (let i = -rad; i <= rad; i += 1) {
            const xx = Math.min(S - 1, Math.max(0, x + i));
            const yy = Math.min(S - 1, Math.max(0, y + j));
            s += src[(yy * S + xx) * 4];
            n++;
          }
        }
        hf[y * S + x] = s / n / 255;
      }
    }
    const nm = normalFromHeight(hf, S, S, 6);
    const occ = document.createElement('canvas');
    occ.width = occ.height = S;
    const og = occ.getContext('2d');
    const oi = og.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = 0.55 + hf[i] * 0.45;
      oi.data[i * 4] = oi.data[i * 4 + 1] = oi.data[i * 4 + 2] = v * 255;
      oi.data[i * 4 + 3] = 255;
    }
    og.putImageData(oi, 0, 0);
    const out = { normalMap: this._keep(canvasTex(nm, { srgb: false, repeat: false })), occlusion: this._keep(canvasTex(occ, { srgb: false, repeat: false })) };
    this.cache.set(key, out);
    return out;
  }

  /** A tiling water normal map (gentle ripples). */
  ripples(seed = 4, S = 256) {
    const key = `ripples:${seed}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const n = makePeriodic(seed);
    const hf = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) hf[y * S + x] = pfbm(n, x / S, y / S, 6, 6, 4);
    const t = this._keep(canvasTex(normalFromHeight(hf, S, S, 4), { srgb: false }));
    this.cache.set(key, t);
    return t;
  }

  /** A small tiling noise (R, G, B independent) for shaders: macro variation, wind gusts. */
  noise(S = 256) {
    if (this.cache.has('noise')) return this.cache.get('noise');
    const ns = [makePeriodic(1), makePeriodic(2), makePeriodic(3)];
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        data[i] = pfbm(ns[0], x / S, y / S, 4, 4, 5) * 255;
        data[i + 1] = pfbm(ns[1], x / S, y / S, 8, 8, 4) * 255;
        data[i + 2] = pfbm(ns[2], x / S, y / S, 16, 16, 3) * 255;
        data[i + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    this._keep(t);
    this.cache.set('noise', t);
    return t;
  }

  dispose() {
    for (const t of this.all) t.dispose();
    for (const p of this.images.values()) p.then((b) => b?.close?.());
    this.all = [];
    this.cache.clear();
    this.images.clear();
  }
}

/** Lighten or darken a hex colour. */
export function shadeHex(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f);
  c.g = Math.min(1, c.g * f);
  c.b = Math.min(1, c.b * f);
  return `#${c.getHexString()}`;
}
