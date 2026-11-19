/**
 * What a hub and a door look like, built in code so every game can use them:
 *
 *   - portalVeil: a sheet of slow, swirling light that fills an archway or a
 *     tunnel mouth (what's beyond is another zone, so the veil is all you see);
 *   - portalArch: a standing stone arch around a veil, for doors with no
 *     building of their own;
 *   - hubKit: a hub's soft edge (lanterns on posts round its ring, cloth
 *     pennants, a faint line of light on the ground) and its services — a
 *     tapering waystone of bevelled stone with runes cut down its faces (dim
 *     until the hub is reached, then breathing a soft light), a framed map
 *     board painted from the zone's own map, a notice board, an iron-banded
 *     chest whose lid swings open while the stash is in use, a stall under a
 *     striped, scalloped awning, a gear stand (a dais for the hero's double,
 *     a mannequin's frame with a helm and shield, a weapon rack), a bedroll by
 *     a fire. A game skips the ones it already has (an inn, a stall, a tent)
 *     and lists the spots only;
 *   - styledGroup: the same shapes and materials for a game's own builders.
 *
 * Each game dresses them in its own style (HUB_STYLES: Gloamreach's timber
 * and stone, Wyldhunt's lashed bamboo and canvas, Kithvale's lacquered wood).
 * Still parts are merged into one mesh per material, so a whole hub is about
 * a dozen draws. Everything is one group per kit, disposed with it (or by the
 * zone's walk).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * The depth material a textured prop casts its shadow with. three.js draws every
 * shadow with one shared depth material and copies each caster's `map` onto it;
 * a later caster without a map leaves that uniform pointing at the old texture,
 * which (once a zone is let go) is then uploaded again and never freed — the
 * GPU's texture count creeping up by one a trip. A prop's map plays no part in
 * its shadow, so textured props cast through this plain one instead.
 */
export const PLAIN_DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
/** Cast a shadow without handing three.js's shared depth material our texture. */
export const plainShadow = (mesh) => {
  if (mesh.material?.map || mesh.material?.alphaMap) mesh.customDepthMaterial = PLAIN_DEPTH;
  return mesh;
};

/**
 * Merge a group's still meshes into one mesh per material (a hub's posts,
 * boards and props in a handful of draws, not dozens). Meshes marked
 * `userData.moves` (a turning rune, a flame) stay as they are.
 */
function mergeStill(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const still = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.moves || o.material.isShaderMaterial) return;
    let p = o.parent;
    while (p && p !== group) {
      if (p.userData.moves) return;
      p = p.parent;
    }
    still.push(o);
  });
  for (const o of still) {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material;
    if (!byMat.has(key)) byMat.set(key, { geos: [], cast: false });
    const e = byMat.get(key);
    e.geos.push(g);
    e.cast ||= o.castShadow;
    o.removeFromParent();
    o.geometry.dispose();
  }
  for (const [mat, e] of byMat) {
    const merged = mergeGeometries(e.geos, false);
    for (const g of e.geos) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = e.cast;
    m.receiveShadow = true;
    plainShadow(m);
    group.add(m);
  }
}

const VEIL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const VEIL_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
uniform float uOpacity;
uniform float uRound;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv - 0.5;
  p.x *= 1.15;
  float r = length(p);
  float a = atan(p.y, p.x);
  // A slow vortex: rings that turn, torn by noise.
  float sw = a * 2.0 + r * 9.0 - uTime * 1.3;
  float bands = 0.5 + 0.5 * sin(sw * 3.0 + n(vec2(a * 3.0, r * 6.0 - uTime * 0.6)) * 4.0);
  float m = n(p * 7.0 + vec2(uTime * 0.2, -uTime * 0.3));
  vec3 col = mix(uB, uA, bands * 0.75 + m * 0.35);
  col += uA * smoothstep(0.35, 0.0, r) * 0.5;
  // Edges: a rounded arch (uRound 1) or a soft rectangle.
  vec2 q = vUv - 0.5;
  float ad = q.y > 0.05 ? length(vec2(q.x / 0.5, (q.y - 0.05) / 0.45)) : abs(q.x) / 0.5;
  float edge = uRound > 0.5 ? smoothstep(1.0, 0.8, ad) * smoothstep(-0.5, -0.42, q.y) : smoothstep(0.5, 0.4, abs(q.x)) * smoothstep(0.5, 0.42, abs(q.y));
  float alpha = edge * (0.3 + 0.5 * bands) * uOpacity;
  gl_FragColor = vec4(col * (0.55 + 0.45 * bands), alpha);
}`;

/** A swirling sheet `w`×`h` metres (its bottom edge at y = 0), facing +z. */
export function portalVeil({ w = 4, h = 5, a = '#ffd27a', b = '#7a3cff', opacity = 0.85, round = true } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 1, 1);
  geo.translate(0, h / 2, 0);
  const uniforms = { uTime: { value: 0 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uOpacity: { value: opacity }, uRound: { value: round ? 1 : 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 5;
  mesh.userData.veil = true;
  mesh.frustumCulled = true;
  return { mesh, update: (t) => (uniforms.uTime.value = t), uniforms };
}

const stdMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

/** A standing stone arch with a veil, its opening `w` wide and `h` high, facing `face` (0: +z). */
export function portalArch({ x, y, z, face = 0, w = 3.4, h = 4.6, stone = '#6c6258', a, b, glow = '#ffcf7a' } = {}) {
  const g = new THREE.Group();
  const mat = stdMat(stone, { roughness: 0.95 });
  const trim = stdMat(glow, { emissive: new THREE.Color(glow), emissiveIntensity: 1.6 });
  const post = new THREE.BoxGeometry(0.9, h + 0.4, 1.1);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(post, mat);
    m.position.set(s * (w / 2 + 0.45), (h + 0.4) / 2 - 0.2, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.9, 1.3), mat);
  lintel.position.y = h + 0.45;
  lintel.castShadow = lintel.receiveShadow = true;
  g.add(lintel);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 2.9, 0.3, 1.5), mat);
  cap.position.y = h + 1.05;
  g.add(cap);
  // A rune over the opening.
  const rune = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 20), trim);
  rune.position.set(0, h + 0.45, 0.66);
  g.add(rune);
  const veil = portalVeil({ w, h, a, b });
  g.add(veil.mesh);
  g.position.set(x, y, z);
  g.rotation.y = face;
  return { group: g, update: (t) => veil.update(t), veil };
}

/* ------------------------------------------------------------------ hub props: styles */

/**
 * How each game dresses its hubs: the wood (and how a post is made), the
 * stone, the metal, the stall's cloth, the boards' paint.
 *
 *   timber   Gloamreach: oak posts and planks, grey stone, black iron, red and cream cloth
 *   bamboo   Wyldhunt: lashed bamboo poles, rope, canvas, river stone, green and sand cloth
 *   lacquer  Kithvale: red-lacquered wood with black and gold, pale stone, paper and silk
 */
export const HUB_STYLES = {
  timber: { wood: '#6e4c30', dark: '#3a281a', stone: '#76746e', metal: '#2e2e34', metalness: 0.7, cloth: ['#8e2e24', '#e6d6b0'], rope: '#5a4a34', paper: '#e8dcbc', post: 'timber' },
  bamboo: { wood: '#b89a58', dark: '#5e4a2c', stone: '#747868', metal: '#4a4236', metalness: 0.45, cloth: ['#d8ccae', '#5e7e4c'], rope: '#7a6444', paper: '#e4d6b2', post: 'bamboo' },
  lacquer: { wood: '#9a2c1e', dark: '#1e1612', stone: '#9a8e80', metal: '#c8a048', metalness: 0.85, cloth: ['#f2e4c4', '#c4503e'], rope: '#3a2a20', paper: '#f4ead2', post: 'lacquer' }
};

/** A seeded random (the props look the same every visit). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
};

/** Wood, by style: planks with grain and knots, bamboo's fibres, or lacquer's deep sheen. */
function woodTexture(S, seed = 3) {
  const r = seeded(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = S.wood;
    g.fillRect(0, 0, w, h);
    if (S.post === 'lacquer') {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,200,170' : '20,0,0'},${0.03 + r() * 0.04})`;
        g.fillRect(0, r() * h, w, 2 + r() * 10);
      }
      return;
    }
    const lines = S.post === 'bamboo' ? 70 : 46;
    for (let i = 0; i < lines; i++) {
      const x = r() * w;
      g.strokeStyle = `rgba(${r() < 0.6 ? '30,18,8' : '255,236,190'},${0.08 + r() * 0.12})`;
      g.lineWidth = 0.6 + r() * 1.8;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y / 30 + i) * (S.post === 'bamboo' ? 0.6 : 2.5), y);
      g.stroke();
    }
    if (S.post === 'timber') {
      // Plank seams and knots.
      g.fillStyle = 'rgba(20,10,4,0.55)';
      for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
      for (let k = 0; k < 5; k++) {
        const x = r() * w;
        const y = r() * h;
        g.fillStyle = 'rgba(40,22,10,0.5)';
        g.beginPath();
        g.ellipse(x, y, 3 + r() * 4, 6 + r() * 8, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, { repeat: true });
}

/** Weathered stone: speckle, mottling, a little lichen. */
function stoneTexture(S, seed = 5) {
  const r = seeded(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = S.stone;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 6 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.5;
      gr.addColorStop(0, dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    if (S.post !== 'lacquer') {
      for (let i = 0; i < 14; i++) {
        g.fillStyle = `rgba(110,130,70,${0.08 + r() * 0.12})`;
        g.beginPath();
        g.ellipse(r() * w, h - r() * h * 0.4, 6 + r() * 14, 3 + r() * 6, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, { repeat: true });
}

/** Carved runes on black (white lines): the waystone's glow and its grooves. */
function runeTexture(seed = 11) {
  const r = seeded(seed);
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // A border band at the foot and the crown, and a column of glyphs between.
    g.lineWidth = 5;
    for (const y of [58, h - 62]) {
      g.beginPath();
      g.moveTo(26, y);
      g.lineTo(w - 26, y);
      g.stroke();
      for (let x = 34; x < w - 30; x += 22) {
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x + 11, y);
        g.lineTo(x, y + 9);
        g.stroke();
      }
    }
    g.lineWidth = 6;
    for (let row = 0; row < 6; row++) {
      const cy = 110 + row * 58;
      const cx = w / 2;
      g.beginPath();
      // A stave, and two or three strokes off it: arcs, branches, a ring.
      g.moveTo(cx, cy - 22);
      g.lineTo(cx, cy + 22);
      for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
        const y = cy - 18 + r() * 36;
        const s = r() < 0.5 ? -1 : 1;
        const kind = r();
        if (kind < 0.4) {
          g.moveTo(cx, y);
          g.lineTo(cx + s * 18, y + (r() - 0.5) * 22);
        } else if (kind < 0.75) {
          g.moveTo(cx + s * 2, y - 10);
          g.quadraticCurveTo(cx + s * 22, y, cx + s * 2, y + 10);
        } else {
          g.moveTo(cx + s * 16 + 6, y);
          g.arc(cx + s * 16, y, 6, 0, Math.PI * 2);
        }
      }
      g.stroke();
      // Small dots either side.
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(cx + s * 44, cy, 3.5, 0, Math.PI * 2);
        g.fillStyle = '#fff';
        g.fill();
      }
    }
  }, { srgb: false });
}

/** Striped cloth with a woven look (the stall's awning and the banners). */
function clothTexture(S, seed = 7) {
  const [a, b] = S.cloth;
  const r = seeded(seed);
  return canvasTex(256, 256, (g, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect((i * w) / n, 0, w / n + 1, h);
    }
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.04})`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
      g.fillRect(x, 0, 1, h);
    }
    // Weathering toward the hem.
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(40,24,10,0.25)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, { repeat: true });
}

/**
 * The map board's face: the zone painted on parchment from its minimap (or a
 * blank survey), the hub starred, a compass rose, the zone's name.
 */
function mapFace({ title, sub, image, extent, hub, accent, S }) {
  const r = seeded(19);
  return canvasTex(640, 448, (g, w, h) => {
    g.fillStyle = S.paper;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 10 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(120,80,30,${0.03 + r() * 0.06})`);
      gr.addColorStop(1, 'rgba(120,80,30,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const box = { x: 30, y: 74, w: w - 60, h: h - 104 };
    if (image && image.width) {
      const k = Math.min(box.w / image.width, box.h / image.height);
      const dw = image.width * k;
      const dh = image.height * k;
      const dx = box.x + (box.w - dw) / 2;
      const dy = box.y + (box.h - dh) / 2;
      g.save();
      g.filter = 'sepia(0.5) saturate(0.9) contrast(1.05) brightness(1.3)';
      g.globalAlpha = 0.92;
      g.drawImage(image, dx, dy, dw, dh);
      g.restore();
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = 'rgba(214,186,130,0.55)';
      g.fillRect(dx, dy, dw, dh);
      g.restore();
      g.strokeStyle = 'rgba(60,36,14,0.7)';
      g.lineWidth = 2;
      g.strokeRect(dx, dy, dw, dh);
      if (extent && hub) {
        const px = dx + ((hub.x - extent.x0) / (extent.x1 - extent.x0)) * dw;
        const py = dy + ((hub.z - extent.z0) / (extent.z1 - extent.z0)) * dh;
        g.fillStyle = accent;
        g.strokeStyle = '#3a2410';
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 ? 6 : 14;
          g.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();
      }
    } else {
      g.strokeStyle = 'rgba(80,50,20,0.5)';
      g.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        let x = box.x + r() * box.w;
        let y = box.y + r() * box.h;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) g.lineTo((x += (r() - 0.5) * 80), (y += (r() - 0.5) * 60));
        g.stroke();
      }
    }
    // A compass rose.
    const cx = w - 70;
    const cy = 50;
    g.fillStyle = '#5a3a1a';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.sin(a) * 26, cy - Math.cos(a) * 26);
      g.lineTo(cx + Math.sin(a + 0.6) * 6, cy - Math.cos(a + 0.6) * 6);
      g.lineTo(cx + Math.sin(a - 0.6) * 6, cy - Math.cos(a - 0.6) * 6);
      g.fill();
    }
    g.font = '600 14px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('N', cx, cy - 30);
    g.fillStyle = '#3a2410';
    g.textAlign = 'left';
    g.font = 'italic 600 34px Georgia, serif';
    g.fillText(title, 32, 46);
    if (sub) {
      g.font = 'italic 17px Georgia, serif';
      g.fillStyle = 'rgba(58,36,16,0.8)';
      g.fillText(sub, 34, 66);
    }
    // Burnt edges.
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.65);
    v.addColorStop(0, 'rgba(60,30,10,0)');
    v.addColorStop(1, 'rgba(60,30,10,0.45)');
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  });
}

/** The notice board's face: notes pinned at angles, a heading. */
function noticeFace({ title, label, accent, S }) {
  const r = seeded(29);
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = S.post === 'lacquer' ? '#3a2a22' : S.post === 'bamboo' ? '#8a7448' : '#5a4028';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
      g.fillRect(0, r() * h, w, 1 + r() * 3);
    }
    g.fillStyle = S.paper;
    g.font = '600 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(title, w / 2, 44);
    const notes = [
      [70, 80, 150, 120],
      [250, 70, 170, 110],
      [90, 220, 130, 130],
      [260, 200, 190, 140],
      [420, 110, 70, 120]
    ];
    notes.forEach(([x, y, nw, nh], i) => {
      g.save();
      g.translate(x + nw / 2, y + nh / 2);
      g.rotate((r() - 0.5) * 0.18);
      g.fillStyle = i === 3 ? '#f2e2b8' : S.paper;
      g.shadowColor = 'rgba(0,0,0,0.4)';
      g.shadowBlur = 6;
      g.shadowOffsetY = 3;
      g.fillRect(-nw / 2, -nh / 2, nw, nh);
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(60,40,20,0.75)';
      for (let l = 0; l < Math.floor(nh / 16) - 1; l++) g.fillRect(-nw / 2 + 12, -nh / 2 + 18 + l * 15, (nw - 24) * (0.5 + r() * 0.5), 3);
      if (i === 3) {
        // A wanted notice: a beast drawn in charcoal.
        g.strokeStyle = 'rgba(40,24,10,0.8)';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(0, 10, 40, 22, 0, 0, Math.PI * 2);
        g.moveTo(36, 0);
        g.lineTo(62, -16);
        g.stroke();
      }
      g.fillStyle = accent;
      g.beginPath();
      g.arc(0, -nh / 2 + 8, 5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
    g.fillStyle = S.paper;
    g.font = 'italic 20px Georgia, serif';
    g.fillText(label, w / 2, h - 16);
  });
}

/* ------------------------------------------------------------------ hub props: shapes */

const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));

/** A geometry with only position, normal and uv, non-indexed, placed by `m` (for merging). */
function prep(geo, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (m) g.applyMatrix4(m);
  return g;
}

/** Collects geometry per material and makes one mesh of each. */
class Parts {
  constructor() {
    this.by = new Map();
  }

  add(mat, geo, m) {
    if (!this.by.has(mat)) this.by.set(mat, []);
    this.by.get(mat).push(prep(geo, m));
  }

  /** The meshes, under `parent` (shadows on everything but the glow). */
  build(parent, { shadows = true } = {}) {
    const out = [];
    for (const [mat, geos] of this.by) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows && !mat.userData.noShadow;
      mesh.receiveShadow = true;
      plainShadow(mesh);
      parent.add(mesh);
      out.push(mesh);
    }
    this.by.clear();
    return out;
  }
}

/**
 * A pole `h` high from (0,0,0) up, in the style: a squared, chamfered timber;
 * a bamboo cane with its nodes; a round lacquered post with a gold cap.
 */
function pole(parts, mats, style, h, r, m) {
  if (style === 'bamboo') {
    parts.add(mats.wood, new THREE.CylinderGeometry(r * 0.94, r, h, 9, 1).translate(0, h / 2, 0), m);
    for (let y = 0.35 + (r * 7) % 0.2; y < h - 0.1; y += 0.42 + r) parts.add(mats.dark, new THREE.TorusGeometry(r * 1.01, r * 0.12, 4, 10).rotateX(Math.PI / 2).translate(0, y, 0), m);
  } else if (style === 'lacquer') {
    parts.add(mats.wood, new THREE.CylinderGeometry(r, r * 1.04, h, 12, 1).translate(0, h / 2, 0), m);
    parts.add(mats.metal, new THREE.CylinderGeometry(r * 1.2, r * 1.2, r * 0.6, 12).translate(0, h, 0), m);
    parts.add(mats.dark, new THREE.CylinderGeometry(r * 1.15, r * 1.25, r * 1.2, 12).translate(0, r * 0.6, 0), m);
  } else {
    parts.add(mats.wood, new RoundedBoxGeometry(r * 2, h, r * 2, 1, r * 0.25).translate(0, h / 2, 0), m);
  }
}

/** Rope lashings (bamboo), iron straps (timber) or gold collars (lacquer) round a joint at local y. */
function lashing(parts, mats, style, r, y, m) {
  const mat = style === 'bamboo' ? mats.rope : mats.metal;
  const geo = style === 'bamboo' ? new THREE.TorusGeometry(r * 1.15, r * 0.28, 4, 10) : new THREE.TorusGeometry(r * 1.1, r * 0.16, 4, 12);
  parts.add(mat, geo.rotateX(Math.PI / 2).translate(0, y, 0), m);
}

/** A bevelled slab (rounded box) w × h × d with its base at y = 0. */
const slab = (w, h, d, bevel = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(bevel, w / 3, h / 3, d / 3)).translate(0, h / 2, 0);

/* ------------------------------------------------------------------ hub props: the kit */

/**
 * A hub's props. `hub` from the zone (x, z, r, services), `height(x, z)` the
 * ground, `color` its light, `style` the game's dressing (HUB_STYLES), `skip`
 * services the game already has, `blocked(x, z)` where an edge post mustn't
 * stand, `mapImage` (a canvas: the zone's painted map) and `mapExtent` (the
 * world rectangle it shows), `reached()` whether this hub's waystone has
 * woken (it glows softly once it has).
 *
 * Returns { group, colliders: [{x, z, r}], update(t, dt), setChest(open), dispose }.
 * Still parts are merged into one mesh per material (a hub is a dozen or so draws).
 */
export function hubKit({ hub, height, color = '#ffb25a', style = 'timber', skip = [], blocked = () => false, posts = true, ring = true, label = '', sub = '', mapImage = null, mapExtent = null, reached = () => true, wood = null, stone = null }) {
  if (!HUB_STYLES[style]) style = 'timber';
  const S = { ...HUB_STYLES[style] };
  if (wood) S.wood = wood;
  if (stone) S.stone = stone;
  const group = new THREE.Group();
  group.name = `hub:${hub.id}`;
  const colliders = [];
  const updaters = [];
  const textures = [];
  const tex = (t) => (textures.push(t), t);
  const woodTex = tex(woodTexture(S));
  const stoneTex = tex(stoneTexture(S));
  const mats = {
    wood: stdMat('#ffffff', { map: woodTex, roughness: style === 'lacquer' ? 0.32 : 0.82, metalness: 0 }),
    dark: stdMat(S.dark, { roughness: style === 'lacquer' ? 0.3 : 0.85 }),
    stone: stdMat('#ffffff', { map: stoneTex, roughness: 0.93 }),
    metal: stdMat(S.metal, { metalness: S.metalness, roughness: style === 'lacquer' ? 0.3 : 0.5 }),
    rope: stdMat(S.rope, { roughness: 1 }),
    glow: stdMat(color, { emissive: new THREE.Color(color), emissiveIntensity: style === 'lacquer' ? 1.3 : 2.2, roughness: 0.5 })
  };
  mats.glow.userData.noShadow = true;
  const cloth = stdMat('#ffffff', { map: tex(clothTexture(S)), roughness: 1, side: THREE.DoubleSide });
  const parts = new Parts();
  const at = (s) => [s.x, height(s.x, s.z), s.z];
  const faceIn = (s) => Math.atan2(hub.x - s.x, hub.z - s.z);
  const SV = hub.services ?? {};
  const place = (s) => {
    const [x, y, z] = at(s);
    return M4(x, y, z, 0, s.face ?? faceIn(s), 0);
  };
  const local = (base, x, y, z, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().multiplyMatrices(base, M4(x, y, z, rx, ry, rz));

  // The edge: lanterns on posts round the ring, cloth pennants on every other one, a faint line of light.
  if (posts) {
    const n = Math.max(8, Math.round((Math.PI * 2 * hub.r) / 11));
    const bannerGeo = new THREE.PlaneGeometry(0.42, 0.95, 1, 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = hub.x + Math.cos(a) * hub.r;
      const z = hub.z + Math.sin(a) * hub.r;
      if (blocked(x, z)) continue;
      const y = height(x, z);
      const base = M4(x, y, z, 0, -a, 0);
      pole(parts, mats, style, 2.4, 0.075, base);
      // An arm out from the post and the lantern hung from it.
      parts.add(mats.dark, new THREE.BoxGeometry(0.05, 0.05, 0.42), local(base, 0, 2.25, 0.18));
      if (style === 'lacquer') {
        parts.add(mats.glow, new THREE.SphereGeometry(0.17, 12, 8).scale(1, 1.25, 1), local(base, 0, 1.95, 0.36));
        parts.add(mats.dark, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), local(base, 0, 2.17, 0.36));
      } else {
        parts.add(mats.metal, new THREE.CylinderGeometry(0.05, 0.13, 0.08, 6), local(base, 0, 2.12, 0.36));
        parts.add(mats.glow, new THREE.CylinderGeometry(0.1, 0.1, 0.22, 6), local(base, 0, 1.98, 0.36));
        parts.add(mats.metal, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 6), local(base, 0, 1.86, 0.36));
      }
      if (i % 2 === 0) parts.add(cloth, bannerGeo.clone(), local(base, 0, 1.45, -0.09, Math.PI / 2));
      colliders.push({ x, z, r: 0.18 });
    }
    bannerGeo.dispose();
  }
  if (ring) {
    const seg = Math.max(64, Math.round(hub.r * 6));
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      for (const k of [-0.35, 0.35]) {
        const rr = hub.r + k;
        const x = hub.x + Math.cos(a) * rr;
        const z = hub.z + Math.sin(a) * rr;
        pos.push(x, height(x, z) + 0.06, z);
        uv.push(i / seg, k < 0 ? 0 : 1);
      }
      if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const u = { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uTime; varying vec2 vUv; void main(){ float e = 1.0 - abs(vUv.y * 2.0 - 1.0); float dash = 0.6 + 0.4 * sin(vUv.x * 240.0 - uTime * 1.5); gl_FragColor = vec4(uColor * 1.6, e * e * 0.38 * dash); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      toneMapped: false,
      fog: false
    });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 3;
    group.add(m);
    updaters.push((t) => (u.uTime.value = t));
  }

  // The waystone: a tapering stone with bevelled edges, runes cut down every face, a stepped plinth, a capstone,
  // and a crystal over it. Dim until its hub is reached; then the runes and the crystal breathe a soft light.
  if (SV.waystone && !skip.includes('waystone')) {
    const [x, y, z] = at(SV.waystone);
    const runes = tex(runeTexture());
    const runeMat = stdMat('#ffffff', { map: stoneTex, bumpMap: runes, bumpScale: -2.2, emissive: new THREE.Color(color), emissiveMap: runes, emissiveIntensity: 0.05, roughness: 0.9 });
    const base = M4(x, y, z, 0, faceIn(SV.waystone), 0);
    parts.add(mats.stone, slab(2.1, 0.32, 2.1, 0.06), local(base, 0, -0.08, 0));
    parts.add(mats.stone, slab(1.5, 0.28, 1.5, 0.06), local(base, 0, 0.22, 0));
    const shaft = new RoundedBoxGeometry(0.86, 2.9, 0.62, 3, 0.09);
    const p = shaft.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 - 0.2 * ((p.getY(i) + 1.45) / 2.9);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) + 1.45, p.getZ(i) * k);
    }
    shaft.computeVertexNormals();
    parts.add(runeMat, shaft, local(base, 0, 0.48, 0));
    // The capstone: a low pyramid, and a collar under it.
    parts.add(mats.stone, slab(0.82, 0.16, 0.6, 0.04), local(base, 0, 3.36, 0));
    parts.add(mats.stone, new THREE.ConeGeometry(0.5, 0.46, 4).rotateY(Math.PI / 4).scale(1, 1, 0.74), local(base, 0, 3.75, 0));
    // Small rune-stones at its foot.
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.6;
      parts.add(runeMat, new RoundedBoxGeometry(0.28, 0.46, 0.2, 2, 0.05).translate(0, 0.2, 0), local(base, Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25, a + Math.PI / 2, (k - 1) * 0.08));
    }
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2).scale(1, 1.6, 1), mats.glow);
    crystal.userData.moves = true;
    crystal.position.set(x, y + 4.45, z);
    group.add(crystal);
    let glow = reached() ? 1 : 0;
    updaters.push((t, dt) => {
      const want = reached() ? 1 : 0;
      glow += (want - glow) * Math.min(1, (dt || 0.016) * 1.5);
      runeMat.emissiveIntensity = 0.04 + glow * (0.9 + 0.35 * Math.sin(t * 1.3));
      crystal.rotation.y = t * 0.6;
      crystal.position.y = y + 4.45 + Math.sin(t * 1.4) * 0.07;
      crystal.scale.setScalar(0.55 + glow * 0.45);
    });
    colliders.push({ x, z, r: 0.85 });
  }

  // A board on two posts under a little roof: `faceTex` in a frame.
  const board = (s, faceTex, { w = 1.7, h = 1.15 } = {}) => {
    const base = place(s);
    const topY = 2.45;
    for (const sx of [-1, 1]) pole(parts, mats, style, topY + 0.15, style === 'bamboo' ? 0.065 : 0.07, local(base, sx * (w / 2 + 0.12), 0, 0));
    // The backing and a moulded frame round the face.
    parts.add(mats.wood, slab(w + 0.16, h + 0.16, 0.08, 0.02), local(base, 0, 0.98, -0.02));
    const fr = style === 'lacquer' ? mats.metal : mats.dark;
    for (const [fx, fy, fw, fh] of [[0, 0.98 + h + 0.1, w + 0.3, 0.1], [0, 0.94, w + 0.3, 0.1], [-(w / 2 + 0.1), 0.98 + h / 2 + 0.05, 0.1, h + 0.25], [w / 2 + 0.1, 0.98 + h / 2 + 0.05, 0.1, h + 0.25]]) parts.add(fr, slab(fw, fh, 0.11, 0.02), local(base, fx, fy - fh / 2, 0.02));
    // The roof: shingles, a canvas sheet, or curved tiles.
    if (style === 'bamboo') {
      for (const sz of [-1, 1]) parts.add(cloth, new THREE.PlaneGeometry(w + 0.7, 0.6, 1, 1).rotateX(-Math.PI / 2 + sz * 0.38), local(base, 0, topY + 0.1, sz * 0.24));
      lashing(parts, mats, style, 0.07, topY - 0.05, local(base, -(w / 2 + 0.12), 0, 0));
      lashing(parts, mats, style, 0.07, topY - 0.05, local(base, w / 2 + 0.12, 0, 0));
    } else {
      for (const sz of [-1, 1]) parts.add(style === 'lacquer' ? mats.dark : mats.wood, slab(w + 0.6, 0.06, 0.5, 0.015), local(base, 0, topY, sz * 0.2, 0, sz * 0.42));
      parts.add(style === 'lacquer' ? mats.metal : mats.dark, new THREE.CylinderGeometry(0.05, 0.05, w + 0.7, 8).rotateZ(Math.PI / 2), local(base, 0, topY + 0.13, 0));
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdMat('#ffffff', { map: faceTex, roughness: 0.85 }));
    face.applyMatrix4(local(base, 0, 0.98 + h / 2 + 0.08, 0.035));
    face.receiveShadow = true;
    group.add(face);
    colliders.push({ x: s.x, z: s.z, r: 0.7 });
  };
  if (SV.map && !skip.includes('map')) board(SV.map, tex(mapFace({ title: label || hub.name, sub, image: mapImage, extent: mapExtent, hub, accent: color, S })), { w: 1.9, h: 1.33 });
  if (SV.info && !skip.includes('info')) board(SV.info, tex(noticeFace({ title: style === 'bamboo' ? 'Hunt board' : 'Notices', label: label || hub.name, accent: color, S })));

  // The stash: a chest with iron bands and corner plates; its lid swings open while you use it.
  let lid = null;
  let lidOpen = 0;
  let lidWant = 0;
  if (SV.stash && !skip.includes('stash')) {
    const base = place(SV.stash);
    const W = 1.3;
    const H = 0.62;
    const D = 0.78;
    parts.add(mats.wood, slab(W, H, D, 0.03), base);
    // Bands round the body, corner plates, a hasp, iron feet.
    const band = mats.metal;
    for (const bx of [-0.46, 0, 0.46]) parts.add(band, slab(0.08, H + 0.02, D + 0.04, 0.01), local(base, bx, -0.01, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.add(band, slab(0.16, 0.16, 0.16, 0.02), local(base, sx * (W / 2 - 0.05), 0.0, sz * (D / 2 - 0.05)));
    parts.add(band, slab(0.2, 0.22, 0.05, 0.01), local(base, 0, H - 0.26, D / 2 + 0.01));
    // What shows when the lid is up: a dark well and the warm gleam of what's stored (covered when it's shut).
    parts.add(mats.dark, new THREE.PlaneGeometry(W - 0.12, D - 0.12).rotateX(-Math.PI / 2), local(base, 0, H + 0.004, 0));
    const gleam = stdMat('#3a2a10', { emissive: new THREE.Color(color), emissiveIntensity: 0.55, roughness: 0.6 });
    gleam.userData.noShadow = true;
    parts.add(gleam, new THREE.PlaneGeometry(W - 0.34, D - 0.34).rotateX(-Math.PI / 2), local(base, 0, H + 0.008, 0));
    // The lid: a barrel top on a hinge at the back.
    const [x, y, z] = at(SV.stash);
    lid = new THREE.Group();
    lid.userData.moves = true;
    const hinge = new THREE.Group();
    const lp = new Parts();
    const top = new THREE.CylinderGeometry(D / 2, D / 2, W, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1);
    lp.add(mats.wood, top, M4(0, 0, D / 2));
    // A plank underside, so the lid is solid when it stands open.
    lp.add(mats.wood, slab(W - 0.02, 0.04, D - 0.02, 0.01), M4(0, 0, D / 2));
    for (const bx of [-0.46, 0, 0.46]) lp.add(band, new THREE.CylinderGeometry(D / 2 + 0.02, D / 2 + 0.02, 0.08, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1), M4(bx, 0, D / 2));
    lp.add(band, slab(0.16, 0.12, 0.05, 0.01), M4(0, -0.08, D + 0.02));
    lp.build(hinge);
    hinge.position.set(0, H, -D / 2);
    lid.add(hinge);
    lid.position.set(x, y, z);
    lid.rotation.y = SV.stash.face ?? faceIn(SV.stash);
    group.add(lid);
    updaters.push((t, dt) => {
      lidOpen += (lidWant - lidOpen) * Math.min(1, (dt || 0.016) * 7);
      hinge.rotation.x = -lidOpen * 1.75;
    });
    colliders.push({ x: SV.stash.x, z: SV.stash.z, r: 0.75 });
  }

  // The merchant's stall: a plank counter, four posts, a striped awning with a scalloped valance, goods,
  // crates and sacks, a hanging lantern.
  if (SV.merchant && !skip.includes('merchant')) {
    const base = place(SV.merchant);
    const W = 2.6;
    const D = 1.1;
    parts.add(mats.wood, slab(W, 0.1, D, 0.02), local(base, 0, 0.92, 0.1));
    parts.add(mats.wood, slab(W - 0.1, 0.85, 0.08, 0.015), local(base, 0, 0.05, D / 2 + 0.05));
    parts.add(mats.dark, slab(W - 0.2, 0.06, D - 0.2, 0.01), local(base, 0, 0.32, 0.1));
    const postH = [2.72, 2.72, 2.15, 2.15];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      const m = local(base, sx * (W / 2 + 0.05), 0, sz * (D / 2 + 0.15) + 0.1);
      pole(parts, mats, style, postH[i], 0.06, m);
      if (style === 'bamboo') lashing(parts, mats, style, 0.06, 0.95, m);
    });
    // The awning: front lower than back, a scalloped hem along the front.
    const aw = new THREE.PlaneGeometry(W + 0.5, D + 0.9, 8, 2);
    aw.rotateX(-Math.PI / 2 + 0.36);
    parts.add(cloth, aw, local(base, 0, 2.38, 0.28));
    const val = new THREE.Shape();
    const vw = W + 0.5;
    val.moveTo(-vw / 2, 0);
    val.lineTo(vw / 2, 0);
    val.lineTo(vw / 2, -0.22);
    const nS = 9;
    for (let i = nS; i > 0; i--) {
      const x1 = -vw / 2 + (i / nS) * vw;
      const x0 = -vw / 2 + ((i - 1) / nS) * vw;
      val.quadraticCurveTo((x0 + x1) / 2, -0.42, x0, -0.22);
    }
    val.lineTo(-vw / 2, 0);
    parts.add(cloth, new THREE.ShapeGeometry(val, 4), local(base, 0, 2.38 - ((D + 0.9) / 2) * Math.sin(0.36), 0.28 + ((D + 0.9) / 2) * Math.cos(0.36) + 0.01));
    // Goods on the counter: bottles, jars, a bundle of herbs; crates and a sack beside.
    const goods = [['#4ec46a', -0.9], ['#2eb8a0', -0.62], ['#d89a40', -0.2], ['#c06a4a', 0.15], ['#7a9ad8', 0.5]];
    for (const [c, gx] of goods) {
      const gm = stdMat(c, { roughness: 0.3, metalness: 0.05 });
      parts.add(gm, new THREE.CylinderGeometry(0.075, 0.09, 0.24, 10).translate(0, 0.12, 0), local(base, gx, 1.02, 0.3));
      parts.add(gm, new THREE.CylinderGeometry(0.03, 0.04, 0.09, 8).translate(0, 0.28, 0), local(base, gx, 1.02, 0.3));
      parts.add(mats.dark, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8).translate(0, 0.34, 0), local(base, gx, 1.02, 0.3));
    }
    for (const [cx, cz, s] of [[W / 2 + 0.55, 0.2, 0.55], [W / 2 + 0.5, 0.75, 0.42], [-(W / 2 + 0.55), 0.4, 0.5]]) {
      parts.add(mats.wood, slab(s, s, s, 0.025), local(base, cx, 0, cz, 0.3));
      parts.add(mats.dark, slab(s + 0.02, 0.05, s + 0.02, 0.01), local(base, cx, s * 0.5, cz, 0.3));
    }
    // A sack, tied at the neck.
    const sackMat = stdMat('#a89068', { roughness: 1 });
    const sack = new THREE.LatheGeometry([0, 0.2, 0.3, 0.33, 0.3, 0.2, 0.09, 0.08, 0.12, 0.02].map((r, i) => new THREE.Vector2(r + 0.001, i * 0.075)), 12);
    parts.add(sackMat, sack, local(base, -(W / 2 + 0.55), 0, 0.95, 0.4));
    parts.add(mats.rope, new THREE.TorusGeometry(0.085, 0.022, 5, 10).rotateX(Math.PI / 2).translate(0, 0.53, 0), local(base, -(W / 2 + 0.55), 0, 0.95));
    // A lantern hung from the awning's corner.
    parts.add(mats.metal, new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), local(base, W / 2 - 0.2, 1.98, 1.0));
    parts.add(mats.glow, style === 'lacquer' ? new THREE.SphereGeometry(0.15, 12, 8).scale(1, 1.25, 1) : new THREE.CylinderGeometry(0.1, 0.1, 0.2, 6), local(base, W / 2 - 0.2, 1.74, 1.0));
    colliders.push({ x: SV.merchant.x, z: SV.merchant.z, r: 1.3 });
  }

  // The gear stand: a round dais (the game stands the hero's double on it) and behind it a mannequin's frame —
  // a post with shoulders, a spare helm on top, a shield hung on it — and a weapon rack.
  if (SV.stats && !skip.includes('stats')) {
    const base = place(SV.stats);
    const dz = 0.9;
    parts.add(mats.stone, new THREE.CylinderGeometry(0.72, 0.8, 0.14, 20).translate(0, 0.07, 0), local(base, 0, 0, dz));
    parts.add(mats.wood, new THREE.CylinderGeometry(0.68, 0.7, 0.06, 20).translate(0, 0.17, 0), local(base, 0, 0, dz));
    // The frame behind.
    const fm = local(base, 0, 0, -0.1);
    pole(parts, mats, style, 1.85, 0.06, fm);
    parts.add(mats.wood, slab(0.32, 0.08, 0.32, 0.02), fm);
    parts.add(mats.wood, new THREE.CapsuleGeometry(0.05, 0.62, 4, 8).rotateZ(Math.PI / 2).translate(0, 1.5, 0), fm);
    parts.add(mats.wood, new THREE.CapsuleGeometry(0.16, 0.28, 4, 10).scale(1.1, 1, 0.75).translate(0, 1.25, 0), fm);
    parts.add(mats.metal, new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).translate(0, 1.88, 0), fm);
    parts.add(mats.metal, new THREE.CylinderGeometry(0.2, 0.2, 0.025, 12).translate(0, 1.88, 0), fm);
    if (style === 'bamboo') lashing(parts, mats, style, 0.06, 1.5, fm);
    // A round shield hung on the frame's side, its boss proud.
    const sm = local(base, 0.42, 1.05, -0.12, 0, 0, 0.1);
    parts.add(style === 'lacquer' ? mats.dark : mats.wood, new THREE.CylinderGeometry(0.34, 0.34, 0.05, 20).rotateX(Math.PI / 2), sm);
    parts.add(mats.metal, new THREE.TorusGeometry(0.34, 0.025, 6, 24), sm);
    parts.add(mats.metal, new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), local(base, 0.42, 1.05, -0.09, 0, 0, 0.1));
    // A rack of two spears and a sword, leaning.
    const rm = local(base, -0.75, 0, -0.05);
    parts.add(mats.wood, slab(0.5, 0.06, 0.18, 0.015), local(base, -0.75, 0.55, -0.05));
    parts.add(mats.wood, slab(0.5, 0.08, 0.22, 0.015), rm);
    for (const [ox, len] of [[-0.15, 1.75], [0.0, 1.6], [0.15, 1.3]]) {
      parts.add(mats.dark, new THREE.CylinderGeometry(0.018, 0.022, len, 6).translate(0, len / 2, 0), local(base, -0.75 + ox, 0.06, -0.02, 0, -0.06, 0));
      parts.add(mats.metal, new THREE.ConeGeometry(0.04, 0.22, 4).translate(0, len + 0.11, 0), local(base, -0.75 + ox, 0.06, -0.02, 0, -0.06, 0));
    }
    colliders.push({ x: SV.stats.x, z: SV.stats.z, r: 0.55 });
  }

  // Rest: a bedroll with a pillow by a ring of stones, logs and a fire.
  if (SV.rest && !skip.includes('rest')) {
    const base = place(SV.rest);
    parts.add(stdMat(style === 'lacquer' ? '#3a5a7a' : style === 'bamboo' ? '#6a5a3a' : '#7a3a2a', { roughness: 1 }), new THREE.CapsuleGeometry(0.3, 1.5, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.16, 0), local(base, 0, 0, 1.0));
    parts.add(stdMat(HUB_STYLES[style].paper, { roughness: 1 }), new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.5, 0.9).translate(0, 0.2, 0), local(base, -0.85, 0, 1.0));
    const rr = seeded(41);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      parts.add(mats.stone, new THREE.DodecahedronGeometry(0.14 + rr() * 0.06, 0).scale(1, 0.7, 1).translate(0, 0.06, 0), local(base, Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55, rr() * 3));
    }
    for (let k = 0; k < 3; k++) parts.add(mats.dark, new THREE.CylinderGeometry(0.06, 0.07, 0.8, 7).rotateZ(Math.PI / 2 - 0.45).translate(0, 0.2, 0), local(base, 0, 0, 0, (k / 3) * Math.PI * 2));
    const [x, y, z] = at(SV.rest);
    // Glowing coals in the ring, and two flames — a pale core inside an orange, flickering skin — that sway.
    parts.add(stdMat('#2a1408', { emissive: new THREE.Color('#ff5a14'), emissiveIntensity: 1.2, roughness: 1 }), new THREE.CylinderGeometry(0.36, 0.42, 0.08, 10).translate(0, 0.05, 0), base);
    const flameGeo = (r, h) => {
      const g = new THREE.LatheGeometry([0, 0.8, 1, 0.92, 0.7, 0.45, 0.2, 0].map((k, i) => new THREE.Vector2(k * r + 0.001, (i / 7) * h)), 9);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(p.getY(i) * 7) * 0.025 * p.getY(i));
      g.computeVertexNormals();
      return g;
    };
    const fire = new THREE.Group();
    const outer = new THREE.Mesh(flameGeo(0.24, 0.78), new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const inner = new THREE.Mesh(flameGeo(0.13, 0.5), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    outer.renderOrder = inner.renderOrder = 4;
    fire.add(outer, inner);
    fire.position.set(x, y + 0.08, z);
    fire.userData.moves = true;
    group.add(fire);
    updaters.push((t) => {
      outer.scale.set(1 + Math.sin(t * 11) * 0.08, 1 + Math.sin(t * 7.3) * 0.16 + Math.sin(t * 17) * 0.05, 1 + Math.cos(t * 9) * 0.08);
      inner.scale.set(1 + Math.sin(t * 13 + 1) * 0.1, 1 + Math.sin(t * 9.1 + 2) * 0.18, 1);
      fire.rotation.y = t * 0.7;
      outer.rotation.z = Math.sin(t * 2.3) * 0.08;
    });
    colliders.push({ x: SV.rest.x, z: SV.rest.z, r: 0.7 });
  }

  parts.build(group);
  mergeStill(group);
  return {
    group,
    colliders,
    /** Kept for games that painted into the old mirror (there is none now). */
    mirror: null,
    update(t, dt = 0.016) {
      for (const u of updaters) u(t, dt);
    },
    /** The stash chest's lid: open while the stash is. */
    setChest(open) {
      lidWant = open ? 1 : 0;
    },
    get chestOpen() {
      return lidOpen;
    },
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          for (const k of ['map', 'emissiveMap', 'bumpMap']) o.material[k]?.dispose();
          o.material.dispose();
        }
      });
      for (const t of textures) t.dispose();
      void lid;
    }
  };
}

/**
 * A small dressed group of the kit's shapes for a game's own builders (a
 * lookout, a shelter): `make(api)` adds parts with the style's materials;
 * returns { group, dispose }. api: { pole(h, r, m), lashing(r, y, m), slab(w, h, d, m, mat?), cloth(geo, m), glow(geo, m), add(mat, geo, m), mats, M4 }.
 */
export function styledGroup(style, make) {
  const S = HUB_STYLES[style] ?? HUB_STYLES.timber;
  const textures = [woodTexture(S, 13), clothTexture(S, 17), stoneTexture(S, 23)];
  const mats = {
    wood: stdMat('#ffffff', { map: textures[0], roughness: style === 'lacquer' ? 0.32 : 0.82 }),
    dark: stdMat(S.dark, { roughness: 0.85 }),
    stone: stdMat('#ffffff', { map: textures[2], roughness: 0.93 }),
    metal: stdMat(S.metal, { metalness: S.metalness, roughness: 0.5 }),
    rope: stdMat(S.rope, { roughness: 1 }),
    cloth: stdMat('#ffffff', { map: textures[1], roughness: 1, side: THREE.DoubleSide }),
    glow: stdMat('#ffc46a', { emissive: new THREE.Color('#ffb050'), emissiveIntensity: 2.6 })
  };
  mats.glow.userData.noShadow = true;
  const parts = new Parts();
  const group = new THREE.Group();
  make({
    mats,
    M4,
    add: (mat, geo, m) => parts.add(mat, geo, m),
    pole: (h, r, m) => pole(parts, mats, style, h, r, m),
    lashing: (r, y, m) => lashing(parts, mats, style, r, y, m),
    slab: (w, h, d, m, mat = mats.wood) => parts.add(mat, slab(w, h, d, Math.min(w, h, d) * 0.15), m),
    cloth: (geo, m) => parts.add(mats.cloth, geo, m),
    glow: (geo, m) => parts.add(mats.glow, geo, m)
  });
  parts.build(group);
  return {
    group,
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose?.();
      });
      for (const t of textures) t.dispose();
    }
  };
}
