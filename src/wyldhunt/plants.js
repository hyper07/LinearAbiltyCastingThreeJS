/**
 * The jungle's plants, grown here: palms with ringed, leaning trunks and
 * crowns of drooping fronds; tree ferns; taro with great heart-shaped
 * leaves; wild bananas with long torn blades; hanging vines; and roots that
 * arch across the path. Every leaf is painted on canvas (veins, leaflets,
 * yellowed tips, torn edges), every frond is folded along its rib so it has
 * a body, and every part carries a wind weight (aWind: phase, flex) that
 * Gloamreach's wind patch reads.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../gloamreach/noise.js';
import { addWind, addTranslucency, windDepthMaterial } from '../gloamreach/materials.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ painted leaves */

const tex = (canvas, srgb = true) => {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};

const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

/** A frond: a rib up the middle (v: base → tip) with leaflets each side. `kind` palm or fern. */
export function frondTexture(kind = 'palm', seed = 1) {
  const W = 256;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = rng(seed);
  const fern = kind === 'fern';
  const n = fern ? 70 : 54;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const y = H * (1 - t * 0.98);
    const taper = Math.sin(Math.min(1, t * 1.04) * Math.PI * 0.9 + 0.16);
    for (const side of [-1, 1]) {
      // Each leaflet leans toward the tip, reaching to the card's edge.
      const a = (fern ? 1.2 : 1.0) + (r() - 0.5) * 0.12;
      const len = ((W * 0.5 - 4) / Math.sin(a)) * taper * (0.88 + r() * 0.12);
      const hue = 86 + r() * 22 - t * 6;
      const light = 20 + r() * 9 + t * 7;
      g.save();
      g.translate(W / 2, y);
      g.scale(side, 1);
      g.rotate(-(Math.PI / 2 - a));
      const grad = g.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0, hsl(hue, 50, light - 7));
      grad.addColorStop(0.55, hsl(hue, 58, light + 3));
      grad.addColorStop(1, t > 0.8 || r() < 0.12 ? hsl(50, 50, light + 10) : hsl(hue - 4, 55, light + 6));
      g.fillStyle = grad;
      g.beginPath();
      if (fern) {
        const lobes = 9;
        const wd = 7 * (0.6 + taper * 0.5);
        g.moveTo(0, 0);
        for (let k = 0; k <= lobes; k++) g.lineTo((k / lobes) * len, -((k % 2) * 2.5 + wd * 0.6) * (1 - (k / lobes) * 0.75));
        for (let k = lobes; k >= 0; k--) g.lineTo((k / lobes) * len, ((k % 2) * 2.5 + wd * 0.6) * (1 - (k / lobes) * 0.75));
      } else {
        const wd = 9 * (0.65 + taper * 0.5);
        g.moveTo(0, -wd * 0.4);
        g.quadraticCurveTo(len * 0.45, -wd, len, 0);
        g.quadraticCurveTo(len * 0.45, wd, 0, wd * 0.4);
        g.closePath();
      }
      g.fill();
      g.strokeStyle = hsl(80, 40, 14);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(len * 0.95, 0);
      g.stroke();
      g.restore();
    }
  }
  // The rib.
  g.strokeStyle = fern ? '#4a5a22' : '#6a6a34';
  g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    g.lineWidth = (fern ? 3.5 : 6) - k * 2;
    g.strokeStyle = k ? '#8a8a4a' : '#4a4a22';
    g.beginPath();
    g.moveTo(W / 2, H);
    g.lineTo(W / 2, H * 0.015);
    g.stroke();
  }
  return tex(c);
}

/** A broad leaf: `taro` (heart-shaped, veined) or `banana` (long, ribbed, torn). */
export function broadLeafTexture(kind = 'taro', seed = 2) {
  const banana = kind === 'banana';
  const W = banana ? 256 : 512;
  const H = banana ? 1024 : 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = rng(seed);
  const base = banana ? [92, 58, 30] : [96, 52, 24];
  g.save();
  if (banana) {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, hsl(base[0], base[1], base[2] - 4));
    grad.addColorStop(0.5, hsl(base[0] + 4, base[1] + 6, base[2] + 8));
    grad.addColorStop(1, hsl(base[0], base[1], base[2] - 4));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(W / 2, H);
    g.bezierCurveTo(W * 0.02, H * 0.85, W * 0.02, H * 0.1, W / 2, 0);
    g.bezierCurveTo(W * 0.98, H * 0.1, W * 0.98, H * 0.85, W / 2, H);
    g.fill();
    // Parallel veins out from the midrib.
    g.strokeStyle = 'rgba(20,40,10,0.35)';
    g.lineWidth = 1;
    for (let y = H * 0.97; y > H * 0.03; y -= 7) {
      g.beginPath();
      g.moveTo(W / 2, y);
      g.lineTo(W * 0.05, y - 26);
      g.moveTo(W / 2, y);
      g.lineTo(W * 0.95, y - 26);
      g.stroke();
    }
    // Tears: the wind splits the blade down to the rib.
    g.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 9; k++) {
      const y = H * (0.12 + r() * 0.78);
      const side = r() < 0.5 ? -1 : 1;
      g.beginPath();
      g.moveTo(W / 2 + side * 8, y);
      g.lineTo(W / 2 + side * W * 0.6, y - 30 - r() * 20);
      g.lineTo(W / 2 + side * W * 0.6, y - 34 - r() * 24);
      g.closePath();
      g.lineWidth = 1.5 + r() * 2;
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    // Brown, dry edges here and there.
    g.strokeStyle = 'rgba(120,90,40,0.6)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(W / 2, H);
    g.bezierCurveTo(W * 0.02, H * 0.85, W * 0.02, H * 0.1, W / 2, 0);
    g.stroke();
  } else {
    // Taro: a heart, the stem joining a little way in from the notch.
    const grad = g.createRadialGradient(W / 2, H * 0.62, 10, W / 2, H * 0.5, W * 0.55);
    grad.addColorStop(0, hsl(base[0] + 6, base[1] + 8, base[2] + 12));
    grad.addColorStop(1, hsl(base[0], base[1], base[2] - 6));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(W / 2, H * 0.98);
    g.bezierCurveTo(W * 0.1, H * 0.85, W * -0.02, H * 0.38, W * 0.2, H * 0.12);
    g.bezierCurveTo(W * 0.32, H * 0.0, W * 0.46, H * 0.06, W / 2, H * 0.2);
    g.bezierCurveTo(W * 0.54, H * 0.06, W * 0.68, H * 0.0, W * 0.8, H * 0.12);
    g.bezierCurveTo(W * 1.02, H * 0.38, W * 0.9, H * 0.85, W / 2, H * 0.98);
    g.fill();
    g.strokeStyle = 'rgba(200,230,150,0.55)';
    g.lineWidth = 3;
    const cx = W / 2;
    const cy = H * 0.3;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx, H * 0.96);
    g.stroke();
    g.lineWidth = 1.6;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const a = k * 0.36;
      g.beginPath();
      g.moveTo(cx, cy + Math.abs(k) * 22);
      g.quadraticCurveTo(cx + Math.sin(a) * 120, cy + Math.abs(k) * 22 + 60, cx + Math.sin(a) * 210, cy + Math.abs(k) * 40 + 120 * (Math.abs(k) / 4));
      g.stroke();
    }
  }
  g.restore();
  return tex(c);
}

/** A palm's trunk: rings of old leaf scars on grey-brown, a little moss in the creases. */
export function palmBarkTexture() {
  const W = 256;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = rng(77);
  g.fillStyle = '#6a5e4c';
  g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) {
    const k = 0.75 + r() * 0.35;
    g.fillStyle = `rgba(${Math.round(110 * k)}, ${Math.round(98 * k)}, ${Math.round(80 * k)}, 0.5)`;
    g.fillRect(0, y, W, 2);
  }
  for (let y = 0; y < H; y += 32) {
    const yy = y + r() * 4;
    g.fillStyle = 'rgba(30,26,18,0.75)';
    g.fillRect(0, yy, W, 5);
    g.fillStyle = 'rgba(160,150,120,0.35)';
    g.fillRect(0, yy + 5, W, 3);
    g.fillStyle = 'rgba(60,90,30,0.35)';
    for (let x = 0; x < W; x += 8) if (r() < 0.4) g.fillRect(x, yy - 3, 8, 4);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A hanging vine: a thin stem with leaves down it (v from top 0 to bottom 1), on alpha. */
export function vineTexture() {
  const W = 128;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = rng(91);
  g.strokeStyle = '#3e3a22';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W / 2, 0);
  for (let y = 0; y <= H; y += 16) g.lineTo(W / 2 + Math.sin(y * 0.03) * 6, y);
  g.stroke();
  for (let y = 6; y < H; y += 9 + r() * 6) {
    const side = r() < 0.5 ? -1 : 1;
    const x = W / 2 + Math.sin(y * 0.03) * 6;
    const len = 18 + r() * 22 * (1 - y / H * 0.5);
    g.save();
    g.translate(x, y);
    g.rotate(side * (0.6 + r() * 0.6));
    g.fillStyle = hsl(95 + r() * 20, 50, 18 + r() * 14);
    g.beginPath();
    g.ellipse(0, len * 0.5, len * 0.28, len * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const t = tex(c);
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------ geometry helpers */

function withWind(geo, phase, flexFn) {
  const p = geo.attributes.position;
  const w = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    w[i * 2] = phase;
    w[i * 2 + 1] = flexFn(i);
  }
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 2));
  return geo;
}

/**
 * A frond (or long leaf): a strip from its base along `dir`, arching up then
 * drooping under its weight, folded along the rib. Width tapers to the tip.
 */
export function frond({ len = 3, width = 0.9, segs = 10, lift = 0.5, droop = 1.2, fold = 0.35, twist = 0, phase = 0, flex = 0.6, widthCurve = null }) {
  const pos = [];
  const nor = [];
  const uv = [];
  const wind = [];
  const idx = [];
  const cols = 3;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    // Arc: out along +z, up first then down.
    const z = len * t;
    const y = len * (lift * t - droop * t * t);
    const dy = len * (lift - 2 * droop * t);
    const tan = V(0, dy, len).normalize();
    const side = V(1, 0, 0).applyAxisAngle(tan, twist * t);
    const up = new THREE.Vector3().crossVectors(tan, side).normalize().negate();
    const w = width * (widthCurve ? widthCurve(t) : Math.sin(Math.min(1, t * 1.15 + 0.08) * Math.PI) * 0.9 + 0.1 * (1 - t));
    for (let j = 0; j < cols; j++) {
      const u = j / (cols - 1);
      const s = (u - 0.5) * 2;
      const p = V(0, y, z).addScaledVector(side, s * w * 0.5).addScaledVector(up, Math.abs(s) * w * fold * 0.5);
      pos.push(p.x, p.y, p.z);
      // Rounded normal: up, leaning out to the side.
      const n = up.clone().multiplyScalar(1).addScaledVector(side, s * 0.45).normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(u, t);
      wind.push(phase, flex * Math.pow(t, 1.4) + 0.05);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aWind', new THREE.Float32BufferAttribute(wind, 2));
  g.setIndex(idx);
  return g;
}

/** A tube along points with radii (for trunks, stems, roots, vines); u round, v along in metres / vWorld. */
export function tubeAlong(pts, rad, seg = 8, { vWorld = 1, uRep = 1, flex = () => 0, phase = 0 } = {}) {
  const n = pts.length;
  const pos = [];
  const nor = [];
  const uv = [];
  const wind = [];
  const idx = [];
  let along = 0;
  let prevN = null;
  for (let i = 0; i < n; i++) {
    if (i) along += pts[i].distanceTo(pts[i - 1]);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const T = b.clone().sub(a).normalize();
    let N = prevN ? prevN.clone().sub(T.clone().multiplyScalar(prevN.dot(T))).normalize() : (Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).cross(T).normalize();
    prevN = N;
    const B = T.clone().cross(N).normalize();
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const d = N.clone().multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
      const p = pts[i].clone().addScaledVector(d, rad[i]);
      pos.push(p.x, p.y, p.z);
      nor.push(d.x, d.y, d.z);
      uv.push((j / seg) * uRep, along / vWorld);
      wind.push(phase, flex(i / (n - 1)));
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j;
      idx.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aWind', new THREE.Float32BufferAttribute(wind, 2));
  g.setIndex(idx);
  return g;
}

const place = (geo, m) => geo.applyMatrix4(m);
const tfm = (pos, yaw = 0, pitch = 0, roll = 0, s = 1) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), V(s, s, s));

/* ------------------------------------------------------------------ plants */

/** A palm: a leaning, curving ringed trunk and a crown of fronds. Returns { trunk, crown, height }. */
export function palm(seed, { height = 9 } = {}) {
  const r = rng(seed);
  const lean = V(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar(0.18 + r() * 0.22);
  const pts = [];
  const rad = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bend = t * t;
    pts.push(V(lean.x * height * bend * 1.4, t * height, lean.z * height * bend * 1.4));
    rad.push(0.2 * (1 + 0.6 * Math.exp(-t * 8)) * (1 - t * 0.25));
  }
  const trunk = tubeAlong(pts, rad, 10, { vWorld: 0.9, flex: (t) => t * t * 0.18, phase: seed % 7 });
  const top = pts[n];
  const fronds = [];
  const count = 11 + Math.floor(r() * 4);
  for (let k = 0; k < count; k++) {
    const yaw = (k / count) * Math.PI * 2 + r() * 0.3;
    const up = k % 3 === 0;
    const f = frond({ len: 3.6 + r() * 1.4, width: 1.25, segs: 12, lift: up ? 0.7 : 0.45, droop: up ? 0.8 : 1.15 + r() * 0.35, fold: 0.42, twist: (r() - 0.5) * 0.6, phase: seed % 7 + k, flex: 0.9 });
    place(f, tfm(top.clone().add(V(0, -0.15, 0)), yaw, -0.1 - r() * 0.25));
    fronds.push(f);
  }
  // A couple of dead fronds hanging down the trunk.
  for (let k = 0; k < 2; k++) {
    const f = frond({ len: 2.6, width: 0.9, segs: 8, lift: -0.3, droop: 0.9, fold: 0.6, phase: k, flex: 0.3 });
    const c = f.attributes.uv;
    for (let i = 0; i < c.count; i++) c.setX(i, c.getX(i) * 0.5 + 0.5);
    place(f, tfm(top.clone().add(V(0, -0.3, 0)), r() * 6.28, 0.6));
    f.userData.dead = true;
    fronds.push(f);
  }
  const crown = mergeGeometries(fronds.filter((f) => !f.userData.dead), false);
  const dead = mergeGeometries(fronds.filter((f) => f.userData.dead), false);
  return { trunk, crown, dead, height };
}

/** A tree fern: a short shaggy trunk and a wide, flat-topped spiral of fern fronds. */
export function treeFern(seed, { height = 3 } = {}) {
  const r = rng(seed);
  const pts = [];
  const rad = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(V((r() - 0.5) * 0.1 * t, t * height, (r() - 0.5) * 0.1 * t));
    rad.push(0.16 + 0.06 * Math.exp(-t * 4));
  }
  const trunk = tubeAlong(pts, rad, 7, { vWorld: 0.7, flex: (t) => t * 0.08 });
  const fronds = [];
  const count = 12 + Math.floor(r() * 4);
  for (let k = 0; k < count; k++) {
    const f = frond({ len: 2.2 + r() * 0.8, width: 0.85, segs: 10, lift: 0.55, droop: 0.75 + r() * 0.3, fold: 0.25, phase: k, flex: 0.7 });
    place(f, tfm(pts[6].clone(), k * 2.39996 + r() * 0.2, -0.25 - r() * 0.3));
    fronds.push(f);
  }
  return { trunk, crown: mergeGeometries(fronds, false), height };
}

/** Taro: big heart-shaped leaves held out on long stems. Returns { stems, leaves }. */
export function taro(seed, { size = 1 } = {}) {
  const r = rng(seed);
  const stems = [];
  const leaves = [];
  const count = 5 + Math.floor(r() * 4);
  for (let k = 0; k < count; k++) {
    const yaw = k * 2.39996 + r() * 0.4;
    const h = (0.7 + r() * 0.8) * size;
    const out = (0.25 + r() * 0.35) * size;
    const tip = V(Math.sin(yaw) * out, h, Math.cos(yaw) * out);
    const pts = [V(0, 0, 0), V(Math.sin(yaw) * out * 0.3, h * 0.55, Math.cos(yaw) * out * 0.3), tip];
    stems.push(tubeAlong(pts, [0.035 * size, 0.028 * size, 0.02 * size], 5, { flex: (t) => t * 0.4, phase: k }));
    // The blade: a cupped card hanging from the stem's tip, pointing out and down.
    const L = (0.55 + r() * 0.35) * size;
    const blade = frond({ len: L, width: L * 0.95, segs: 6, lift: 0.15, droop: 0.55, fold: 0.3, phase: k, flex: 0.7, widthCurve: (t) => Math.sin(Math.min(1, t * 0.95 + 0.25) * Math.PI) * 0.95 + 0.05 });
    // The texture's notch (top, v→0) is at the stem: flip v.
    const uv = blade.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    place(blade, tfm(tip, yaw, -0.25 + r() * 0.2, (r() - 0.5) * 0.3));
    leaves.push(blade);
  }
  return { stems: mergeGeometries(stems, false), leaves: mergeGeometries(leaves, false) };
}

/** A wild banana: a few long, torn blades arching from a short pseudo-stem. */
export function banana(seed, { size = 1 } = {}) {
  const r = rng(seed);
  const h = (1.1 + r() * 0.8) * size;
  const stem = tubeAlong([V(0, 0, 0), V(0, h * 0.5, 0), V(0, h, 0)], [0.12 * size, 0.1 * size, 0.08 * size], 7, { flex: (t) => t * 0.15 });
  const leaves = [];
  const count = 6 + Math.floor(r() * 3);
  for (let k = 0; k < count; k++) {
    const f = frond({ len: (1.8 + r() * 0.8) * size, width: 0.62 * size, segs: 10, lift: 0.9, droop: 0.95 + r() * 0.3, fold: 0.18, twist: (r() - 0.5) * 0.8, phase: k, flex: 0.85, widthCurve: (t) => Math.min(1, Math.sin(Math.min(1, t * 1.05) * Math.PI) * 1.4) * 0.92 + 0.08 });
    place(f, tfm(V(0, h * (0.8 + r() * 0.2), 0), k * 2.39996, -0.4 - r() * 0.4));
    leaves.push(f);
  }
  return { stem, leaves: mergeGeometries(leaves, false) };
}

/** A hanging vine: crossed cards from `top` straight down `len` metres, swaying more toward the bottom. */
export function vineCards(len, w = 0.5, seed = 1) {
  const cards = [];
  for (let k = 0; k < 2; k++) {
    const g = new THREE.PlaneGeometry(w, len, 1, Math.max(4, Math.round(len / 2)));
    g.translate(0, -len / 2, 0);
    g.rotateY(k * Math.PI / 2 + seed);
    const uv = g.attributes.uv;
    // The texture repeats every 4 m down the vine.
    for (let i = 0; i < uv.count; i++) uv.setY(i, (1 - uv.getY(i)) * (len / 4));
    const p = g.attributes.position;
    withWind(g, seed, (i) => Math.pow(-p.getY(i) / len, 1.3) * Math.min(1.2, len / 12));
    cards.push(g);
  }
  return mergeGeometries(cards, false);
}

/* ------------------------------------------------------------------ materials */

/** A leaf material: alpha-cut, two-sided, lit through, swaying; with the matching shadow material. */
export function leafMaterial(map, { color = 0xffffff, msaa = true, flutter = 0.02, trans = 0.9, rough = 0.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.4, side: THREE.DoubleSide, roughness: rough, metalness: 0, alphaToCoverage: msaa });
  addWind(m, { flutter });
  addTranslucency(m, trans, new THREE.Color(1, 0.95, 0.6));
  m.userData.depth = windDepthMaterial({ map, alphaTest: 0.4, flutter });
  return m;
}

export function woodMaterial(map, { color = 0xffffff, normalMap = null, rough = 0.9 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: rough, metalness: 0 });
  addWind(m);
  m.userData.depth = windDepthMaterial();
  return m;
}
