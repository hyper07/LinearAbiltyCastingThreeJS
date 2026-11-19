/**
 * The surfaces of Gloamreach's arms and armour, generated once: brushed steel
 * (streaks along the length, fine scratches, a few pits), a polished bevel
 * for edges, engraved scrollwork, pebbled leather, a spiral leather grip
 * wrap, wood grain, woven cloth, and painted heraldry for shields and capes —
 * each as colour detail, a normal map (from a height field) and a roughness
 * map, shared by every item. Materials are cached by what they are and their
 * colour, so twenty swords cost one shader.
 */
import * as THREE from 'three';
import { rng } from './noise.js';

const S = 512;

function canvas(w = S, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A normal map from a height field (0…1 floats), tiling. */
function normalFromHeight(hf, w, h, strength = 2) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const at = (x, y) => hf[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const p = (y * w + x) * 4;
      img.data[p] = (-dx / l * 0.5 + 0.5) * 255;
      img.data[p + 1] = (dy / l * 0.5 + 0.5) * 255;
      img.data[p + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function greyCanvas(f, w, h) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, f[i] * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function tex(c, { srgb = false, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Smooth value noise on a tiling grid. */
function valueNoise(w, h, cell, r) {
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = Float32Array.from({ length: gw * gh }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fx = x / cell;
      const fy = y / cell;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const G = (i, j) => grid[((j + gh) % gh) * gw + ((i + gw) % gw)];
      const a = G(x0, y0) + (G(x0 + 1, y0) - G(x0, y0)) * sx;
      const b = G(x0, y0 + 1) + (G(x0 + 1, y0 + 1) - G(x0, y0 + 1)) * sx;
      out[y * w + x] = a + (b - a) * sy;
    }
  }
  return out;
}

let maps = null;

/** All the shared detail maps (made on first use). */
export function gearMaps() {
  if (maps) return maps;
  const r = rng(404);
  maps = {};
  // Brushed metal: long streaks along v, scratches across, a few pits.
  {
    const h = new Float32Array(S * S);
    const rough = new Float32Array(S * S);
    const streak = Float32Array.from({ length: S }, () => r());
    const n = valueNoise(S, S, 64, r);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const s = streak[x] * 0.6 + streak[(x + 1) % S] * 0.25 + streak[(x + 3) % S] * 0.15;
        h[i] = s * 0.25 + n[i] * 0.2;
        rough[i] = 0.55 + s * 0.3 + n[i] * 0.25;
      }
    }
    for (let k = 0; k < 110; k++) {
      // Scratches: short bright lines at random angles.
      let x = r() * S;
      let y = r() * S;
      const a = r() * Math.PI;
      const len = 8 + r() * 60;
      for (let t = 0; t < len; t++) {
        const xi = Math.floor(x + Math.cos(a) * t + S) % S;
        const yi = Math.floor(y + Math.sin(a) * t + S) % S;
        h[yi * S + xi] -= 0.1;
        rough[yi * S + xi] = Math.max(0.25, rough[yi * S + xi] - 0.15);
      }
    }
    for (let k = 0; k < 90; k++) {
      const x = Math.floor(r() * S);
      const y = Math.floor(r() * S);
      const rad = 1 + r() * 2.5;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const d = Math.hypot(i, j);
        if (d < rad) h[((y + j + S) % S) * S + ((x + i + S) % S)] -= 0.3 * (1 - d / rad);
      }
    }
    maps.brushedN = tex(normalFromHeight(h, S, S, 1.6));
    maps.brushedR = tex(greyCanvas(rough, S, S));
  }
  // Engraved scrollwork: incised curling lines and a border, as height (and dark in the colour map).
  {
    const c = canvas();
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, S, S);
    g.strokeStyle = '#000';
    g.lineCap = 'round';
    const rr = rng(77);
    g.lineWidth = 5;
    g.strokeRect(10, 10, S - 20, S - 20);
    g.lineWidth = 2;
    g.strokeRect(22, 22, S - 44, S - 44);
    for (let k = 0; k < 26; k++) {
      // A scroll: a spiral with a leafy tail.
      const cx = 50 + rr() * (S - 100);
      const cy = 50 + rr() * (S - 100);
      const turns = 1.4 + rr() * 1.2;
      const R = 14 + rr() * 26;
      const dir = rr() < 0.5 ? 1 : -1;
      g.lineWidth = 3 + rr() * 2;
      g.beginPath();
      for (let t = 0; t <= 1; t += 0.01) {
        const a = dir * t * turns * Math.PI * 2;
        const rad = R * (1 - t * 0.85);
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (t === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx + R, cy);
      g.bezierCurveTo(cx + R * 1.8, cy - R * 0.6, cx + R * 2.4, cy + R * 0.8, cx + R * 3, cy + R * 0.2);
      g.stroke();
    }
    const d = g.getImageData(0, 0, S, S).data;
    const h = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) h[i] = d[i * 4] / 255;
    // Soften so the grooves have rounded walls.
    const b = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let s = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += h[((y + j + S) % S) * S + ((x + i + S) % S)];
      b[y * S + x] = s / 9;
    }
    maps.engraveN = tex(normalFromHeight(b, S, S, 3.5));
    const col = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) col[i] = 0.45 + 0.55 * b[i];
    maps.engraveC = tex(greyCanvas(col, S, S), { srgb: true });
  }
  // Leather: pebbled cells, a few creases.
  {
    const h = new Float32Array(S * S);
    const pts = Array.from({ length: 900 }, () => [r() * S, r() * S]);
    const cell = 32;
    const grid = new Map();
    for (const p of pts) {
      const k = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(p);
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let d1 = 1e9;
      let d2 = 1e9;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = (cx + i + S / cell) % (S / cell);
        const gy = (cy + j + S / cell) % (S / cell);
        for (const p of grid.get(`${gx},${gy}`) ?? []) {
          let dx = Math.abs(p[0] - x);
          let dy = Math.abs(p[1] - y);
          dx = Math.min(dx, S - dx);
          dy = Math.min(dy, S - dy);
          const d = Math.hypot(dx, dy);
          if (d < d1) [d1, d2] = [d, d1];
          else if (d < d2) d2 = d;
        }
      }
      h[y * S + x] = Math.min(1, (d2 - d1) / 6);
    }
    const n = valueNoise(S, S, 96, r);
    for (let i = 0; i < S * S; i++) h[i] = h[i] * 0.7 + n[i] * 0.3;
    maps.leatherN = tex(normalFromHeight(h, S, S, 2.2));
    const c = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) c[i] = 0.72 + h[i] * 0.2 + n[i] * 0.16;
    maps.leatherC = tex(greyCanvas(c, S, S), { srgb: true });
    const ro = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) ro[i] = 0.55 + (1 - h[i]) * 0.3;
    maps.leatherR = tex(greyCanvas(ro, S, S));
  }
  // A grip wrap: diagonal bands of leather cord.
  {
    const h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const t = ((x + y * 0.55) / S) * 10;
      const f = t - Math.floor(t);
      h[y * S + x] = Math.sin(f * Math.PI) ** 0.6;
    }
    maps.wrapN = tex(normalFromHeight(h, S, S, 4));
    const c = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) c[i] = 0.5 + h[i] * 0.5;
    maps.wrapC = tex(greyCanvas(c, S, S), { srgb: true });
  }
  // Wood: grain along v.
  {
    const h = new Float32Array(S * S);
    const n = valueNoise(S, S, 48, r);
    const n2 = valueNoise(S, S, 12, r);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const t = x / S * 18 + n[i] * 3.5 + n2[i] * 0.4;
      h[i] = 0.5 + 0.5 * Math.sin(t * Math.PI * 2) * 0.6 + n2[i] * 0.3;
    }
    maps.woodN = tex(normalFromHeight(h, S, S, 1.4));
    const c = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) c[i] = 0.55 + h[i] * 0.45;
    maps.woodC = tex(greyCanvas(c, S, S), { srgb: true });
  }
  // Cloth: a fine weave.
  {
    const h = new Float32Array(S * S);
    const n = valueNoise(S, S, 32, r);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const a = Math.sin((x / S) * Math.PI * 2 * 96);
      const b = Math.sin((y / S) * Math.PI * 2 * 96);
      const over = ((Math.floor(x / (S / 96)) + Math.floor(y / (S / 96))) & 1) ? a : b;
      h[y * S + x] = 0.5 + over * 0.35 + n[y * S + x] * 0.15;
    }
    maps.clothN = tex(normalFromHeight(h, S, S, 1.6));
    const c = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) c[i] = 0.82 + h[i] * 0.18;
    maps.clothC = tex(greyCanvas(c, S, S), { srgb: true });
  }
  // Mail: rings in rows.
  {
    const h = new Float32Array(S * S);
    const k = 16;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const row = Math.floor(y / k);
      const ox = (row & 1) * k * 0.5;
      const cx = ((x + ox) % k) - k / 2;
      const cy = (y % k) - k / 2;
      const d = Math.hypot(cx, cy * 1.2);
      h[y * S + x] = Math.max(0, 1 - Math.abs(d - k * 0.33) / (k * 0.16));
    }
    maps.mailN = tex(normalFromHeight(h, S, S, 3));
    const c = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) c[i] = 0.25 + h[i] * 0.75;
    maps.mailC = tex(greyCanvas(c, S, S), { srgb: true });
  }
  return maps;
}

/* ------------------------------------------------------------------ heraldry */

const TINCTURES = ['#1f3f8a', '#8a1c1c', '#1d5a2c', '#5a2470', '#111114', '#c89a2a', '#e8e2d2', '#1a6a6a'];
const METAL_TINCTURES = ['#e2b84a', '#e8e6e0'];

function charge(g, kind, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = 0.025;
  g.beginPath();
  if (kind === 'star') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 0.2 : 0.5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 'moon') {
    g.arc(0, 0, 0.45, 0, Math.PI * 2);
    g.moveTo(0.42, -0.1);
    g.arc(0.14, -0.08, 0.38, 0, Math.PI * 2, true);
  } else if (kind === 'acorn') {
    g.ellipse(0, 0.12, 0.26, 0.34, 0, 0, Math.PI * 2);
    g.moveTo(-0.34, -0.12);
    g.quadraticCurveTo(0, -0.5, 0.34, -0.12);
    g.lineTo(-0.34, -0.12);
    g.rect(-0.03, -0.5, 0.06, 0.14);
  } else if (kind === 'tree') {
    g.moveTo(-0.06, 0.5);
    g.lineTo(-0.06, 0.05);
    g.lineTo(0.06, 0.05);
    g.lineTo(0.06, 0.5);
    g.closePath();
    for (const [cx, cy, r] of [[0, -0.2, 0.28], [-0.22, -0.02, 0.2], [0.22, -0.02, 0.2], [0, -0.42, 0.16]]) {
      g.moveTo(cx + r, cy);
      g.arc(cx, cy, r, 0, Math.PI * 2);
    }
  } else if (kind === 'drake') {
    // A rampant wyvern's silhouette: body, wings, tail curl.
    g.moveTo(-0.05, 0.45);
    g.quadraticCurveTo(-0.25, 0.2, -0.1, -0.05);
    g.lineTo(-0.45, -0.35);
    g.lineTo(-0.2, -0.12);
    g.lineTo(-0.38, -0.45);
    g.lineTo(-0.02, -0.15);
    g.quadraticCurveTo(0.05, -0.42, 0.22, -0.48);
    g.lineTo(0.15, -0.35);
    g.lineTo(0.3, -0.3);
    g.quadraticCurveTo(0.12, -0.22, 0.12, -0.02);
    g.quadraticCurveTo(0.3, 0.2, 0.1, 0.42);
    g.quadraticCurveTo(0.35, 0.48, 0.42, 0.3);
    g.quadraticCurveTo(0.4, 0.55, 0.05, 0.5);
    g.closePath();
  } else {
    // A lantern: the house's sign.
    g.rect(-0.18, -0.25, 0.36, 0.5);
    g.moveTo(-0.24, -0.25);
    g.lineTo(0, -0.45);
    g.lineTo(0.24, -0.25);
    g.rect(-0.24, 0.25, 0.48, 0.07);
  }
  g.fill('evenodd');
  g.stroke();
  g.restore();
}

/**
 * A painted coat of arms from a seed: a field (plain, parted, quartered, a
 * chevron or a bend), a charge (star, moon, acorn, tree, drake or lantern) in
 * a contrasting tincture, a gilt border, and wear. Returned as an sRGB texture.
 */
export function heraldry(seed, { field = null, w = 512, h = 640 } = {}) {
  const r = rng(seed + 9);
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const a = field ?? TINCTURES[Math.floor(r() * TINCTURES.length)];
  let b = TINCTURES[Math.floor(r() * TINCTURES.length)];
  if (b === a) b = METAL_TINCTURES[0];
  const metal = METAL_TINCTURES[Math.floor(r() * 2)];
  g.fillStyle = a;
  g.fillRect(0, 0, w, h);
  const division = Math.floor(r() * 6);
  g.fillStyle = b;
  g.beginPath();
  if (division === 1) g.rect(w / 2, 0, w / 2, h);
  else if (division === 2) {
    g.rect(w / 2, 0, w / 2, h / 2);
    g.rect(0, h / 2, w / 2, h / 2);
  } else if (division === 3) {
    g.moveTo(0, h * 0.75);
    g.lineTo(w / 2, h * 0.38);
    g.lineTo(w, h * 0.75);
    g.lineTo(w, h * 0.95);
    g.lineTo(w / 2, h * 0.58);
    g.lineTo(0, h * 0.95);
  } else if (division === 4) {
    g.moveTo(0, 0);
    g.lineTo(w * 0.25, 0);
    g.lineTo(w, h * 0.78);
    g.lineTo(w, h);
    g.lineTo(w * 0.75, h);
    g.lineTo(0, h * 0.22);
  } else if (division === 5) {
    g.rect(w * 0.4, 0, w * 0.2, h);
    g.rect(0, h * 0.36, w, h * 0.16);
  }
  g.fill();
  const kinds = ['star', 'moon', 'acorn', 'tree', 'drake', 'lantern'];
  charge(g, kinds[Math.floor(r() * kinds.length)], w / 2, h * 0.44, w * 0.5, metal);
  // Gilt border and wear: scuffs and darker edges.
  g.strokeStyle = metal;
  g.lineWidth = w * 0.035;
  g.strokeRect(w * 0.02, h * 0.02, w * 0.96, h * 0.96);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${0.04 + r() * 0.08})`;
    g.save();
    g.translate(r() * w, r() * h);
    g.rotate(r() * Math.PI);
    g.fillRect(0, 0, 4 + r() * 30, 1 + r() * 2);
    g.restore();
  }
  const grad = g.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const t = tex(c, { srgb: true, repeat: false });
  return t;
}

/* ------------------------------------------------------------------ materials */

const cache = new Map();
const glowCache = new Map();

/**
 * A material of a kind, in a colour: 'metal' (brushed), 'polish' (an edge
 * bevel), 'engraved', 'dark' (blued, for fullers and slits), 'leather',
 * 'wrap' (a grip), 'wood', 'cloth', 'mail', 'gem', 'glow' (emissive runes).
 * `rough` overrides roughness; `glow` adds an emissive colour.
 */
export function gearMaterial(kind, color = '#ffffff', { rough = null, glow = null, glowK = 1, side = THREE.FrontSide } = {}) {
  const key = `${kind}|${color}|${rough}|${glow}|${glowK}|${side}`;
  if (cache.has(key)) return cache.get(key);
  const m = makeMaterial(kind, color, { rough, glow, glowK, side });
  m.userData.gear = kind;
  cache.set(key, m);
  return m;
}

function makeMaterial(kind, color, { rough, glow, glowK, side }) {
  const M = gearMaps();
  const c = new THREE.Color(color);
  const base = { color: c, side };
  switch (kind) {
    case 'metal':
      return new THREE.MeshStandardMaterial({ ...base, metalness: 1, roughness: rough ?? 0.42, roughnessMap: M.brushedR, normalMap: M.brushedN, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.25 });
    case 'polish':
      return new THREE.MeshStandardMaterial({ ...base, color: c.clone().multiplyScalar(1.08), metalness: 1, roughness: rough ?? 0.1, normalMap: M.brushedN, normalScale: new THREE.Vector2(0.08, 0.08), envMapIntensity: 1.5 });
    case 'engraved':
      return new THREE.MeshStandardMaterial({ ...base, map: M.engraveC, metalness: 1, roughness: rough ?? 0.32, normalMap: M.engraveN, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.3 });
    case 'dark':
      return new THREE.MeshStandardMaterial({ ...base, color: c.clone().multiplyScalar(0.5), metalness: 1, roughness: rough ?? 0.5, roughnessMap: M.brushedR, normalMap: M.brushedN, normalScale: new THREE.Vector2(0.3, 0.3), emissive: glow ? new THREE.Color(glow) : new THREE.Color(0), emissiveIntensity: glow ? 1.6 * glowK : 0 });
    case 'leather':
      return new THREE.MeshStandardMaterial({ ...base, map: M.leatherC, metalness: 0, roughness: rough ?? 0.75, roughnessMap: M.leatherR, normalMap: M.leatherN, normalScale: new THREE.Vector2(0.7, 0.7) });
    case 'wrap':
      return new THREE.MeshStandardMaterial({ ...base, map: M.wrapC, metalness: 0, roughness: rough ?? 0.7, normalMap: M.wrapN, normalScale: new THREE.Vector2(1.2, 1.2) });
    case 'wood':
      return new THREE.MeshStandardMaterial({ ...base, map: M.woodC, metalness: 0, roughness: rough ?? 0.6, normalMap: M.woodN, normalScale: new THREE.Vector2(0.6, 0.6) });
    case 'cloth':
      return new THREE.MeshStandardMaterial({ ...base, map: M.clothC, metalness: 0, roughness: rough ?? 0.9, normalMap: M.clothN, normalScale: new THREE.Vector2(0.5, 0.5) });
    case 'mail':
      return new THREE.MeshStandardMaterial({ ...base, map: M.mailC, metalness: 1, roughness: rough ?? 0.4, normalMap: M.mailN, normalScale: new THREE.Vector2(1.4, 1.4) });
    case 'gem':
      return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, ior: 2.0, specularIntensity: 1, sheen: 0, emissive: c.clone(), emissiveIntensity: (glow ? 1.4 : 0.25) * glowK, envMapIntensity: 2 });
    case 'glow':
      return new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2 * glowK), toneMapped: false, side });
    case 'paint':
      return new THREE.MeshStandardMaterial({ ...base, metalness: 0, roughness: rough ?? 0.55, normalMap: M.clothN, normalScale: new THREE.Vector2(0.15, 0.15) });
    default:
      return new THREE.MeshStandardMaterial({ ...base, roughness: rough ?? 0.6 });
  }
}

/** A painted face (heraldry) material for a shield or cape: its own texture. */
export function heraldryMaterial(seed, opts = {}) {
  const key = `her|${seed}|${opts.field ?? ''}|${opts.cloth ? 1 : 0}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const M = gearMaps();
  const map = heraldry(seed, opts);
  const m = opts.cloth
    ? new THREE.MeshStandardMaterial({ map, roughness: 0.92, normalMap: M.clothN, normalScale: new THREE.Vector2(0.5, 0.5), side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.05, normalMap: M.brushedN, normalScale: new THREE.Vector2(0.25, 0.25) });
  glowCache.set(key, m);
  return m;
}
