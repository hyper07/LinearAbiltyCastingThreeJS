/**
 * What a hub and a door look like, built in code so every game can use them:
 *
 *   - portalVeil: a sheet of slow, swirling light that fills an archway or a
 *     tunnel mouth (what's beyond is another zone, so the veil is all you see);
 *   - portalArch: a standing stone arch around a veil, for doors with no
 *     building of their own;
 *   - hubKit: a hub's soft edge (posts with warm lanterns on its ring and a
 *     faint line of light on the ground) and its services — a waystone with a
 *     glowing rune, a map board, a guide's board, the stash chest, a mirror
 *     on a stand (it shows the hero, rendered by the game), a bedroll by a
 *     small fire for resting. A game skips the ones it already has (an inn,
 *     a stall, a tent) and lists the spots only.
 *
 * Everything is one group per kit, disposed with it (or by the zone's walk).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

/* ------------------------------------------------------------------ hub props */

function canvasBoard(lines, { w = 512, h = 320, bg = '#3a2a1a', ink = '#f4e6c8', accent = '#ffcf7a' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
    g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 3);
  }
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.font = '600 46px Georgia, serif';
  g.fillText(lines[0] ?? '', w / 2, 74);
  g.font = '28px Georgia, serif';
  lines.slice(1).forEach((l, i) => g.fillText(l, w / 2, 130 + i * 42));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * A hub's props. `hub` from the zone (x, z, r, services), `height(x, z)` the
 * ground, `color` its light, `skip` services the game already has, `blocked(x, z)`
 * where an edge post mustn't stand. Returns { group, colliders: [{x, z, r}], mirror, update, dispose }.
 */
export function hubKit({ hub, height, color = '#ffb25a', stone = '#7a7068', wood = '#6a4a30', skip = [], blocked = () => false, posts = true, ring = true, label = '', mapLines = null }) {
  const group = new THREE.Group();
  group.name = `hub:${hub.id}`;
  const colliders = [];
  const glowMat = stdMat(color, { emissive: new THREE.Color(color), emissiveIntensity: 2.4, roughness: 0.5 });
  const woodMat = stdMat(wood);
  const stoneMat = stdMat(stone, { roughness: 0.95 });
  const ironMat = stdMat('#3a3a40', { metalness: 0.6, roughness: 0.5 });
  const updaters = [];
  const at = (s) => [s.x, height(s.x, s.z), s.z];
  const faceIn = (s) => Math.atan2(hub.x - s.x, hub.z - s.z);
  const S = hub.services ?? {};

  // The edge: lantern posts on the ring, a faint line of light on the ground.
  if (posts) {
    const n = Math.max(8, Math.round((Math.PI * 2 * hub.r) / 11));
    const postGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.3, 6);
    postGeo.translate(0, 1.15, 0);
    const lampGeo = new THREE.SphereGeometry(0.17, 10, 8);
    const bannerGeo = new THREE.PlaneGeometry(0.45, 0.9);
    const bannerMat = stdMat(color, { side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: 0.25, roughness: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = hub.x + Math.cos(a) * hub.r;
      const z = hub.z + Math.sin(a) * hub.r;
      if (blocked(x, z)) continue;
      const y = height(x, z);
      const p = new THREE.Mesh(postGeo, woodMat);
      p.position.set(x, y, z);
      p.castShadow = true;
      group.add(p);
      const l = new THREE.Mesh(lampGeo, glowMat);
      l.position.set(x, y + 2.35, z);
      group.add(l);
      if (i % 2 === 0) {
        const b = new THREE.Mesh(bannerGeo, bannerMat);
        b.position.set(x + Math.cos(a) * 0.05, y + 1.55, z + Math.sin(a) * 0.05);
        b.rotation.y = -a + Math.PI / 2;
        group.add(b);
      }
      colliders.push({ x, z, r: 0.18 });
    }
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

  // The waystone: a tall dressed stone, a ring of rune light round its middle.
  if (S.waystone && !skip.includes('waystone')) {
    const [x, y, z] = at(S.waystone);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 2.8, 6), stoneMat);
    body.position.y = 1.4;
    body.castShadow = body.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.6, 6), stoneMat);
    top.position.y = 3.1;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.3, 8), stoneMat);
    base.position.y = 0.12;
    base.receiveShadow = true;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 24), glowMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.9;
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glowMat);
    rune.position.y = 3.75;
    rune.userData.moves = true;
    band.userData.moves = true;
    g.add(body, top, base, band, rune);
    g.position.set(x, y, z);
    group.add(g);
    updaters.push((t) => {
      rune.rotation.y = t * 0.8;
      rune.position.y = 3.75 + Math.sin(t * 1.6) * 0.08;
      band.rotation.z = t * 0.3;
    });
    colliders.push({ x, z, r: 0.75 });
  }

  // Boards: the map board (a painted map) and the guide's board (notices).
  const board = (s, lines, bg) => {
    const [x, y, z] = at(s);
    const g = new THREE.Group();
    for (const sx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), woodMat);
      leg.position.set(sx, 1.1, 0);
      leg.castShadow = true;
      g.add(leg);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: canvasBoard(lines, { bg, accent: color }), roughness: 0.9 }));
    face.position.set(0, 1.55, 0.07);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 0.1), woodMat);
    back.position.set(0, 1.55, 0);
    back.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 0.45), woodMat);
    roof.position.set(0, 2.18, 0.08);
    roof.rotation.x = 0.25;
    g.add(back, face, roof);
    g.position.set(x, y, z);
    g.rotation.y = s.face ?? faceIn(s);
    group.add(g);
    colliders.push({ x, z, r: 0.6 });
  };
  if (S.map && !skip.includes('map')) board(S.map, mapLines ?? ['Map', label || hub.name, 'Press to read the map', 'and the world beyond'], '#2c3a2a');
  if (S.info && !skip.includes('info')) board(S.info, ['Notices', 'Tips · finds · stories', label || hub.name], '#3a2a1a');

  // The stash chest.
  if (S.stash && !skip.includes('stash')) {
    const [x, y, z] = at(S.stash);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.65, 0.75), woodMat);
    body.position.y = 0.33;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 1.25, 14, 1, false, 0, Math.PI), woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.65;
    const bands = [-0.45, 0, 0.45].map((bx) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.68, 0.79), ironMat);
      b.position.set(bx, 0.34, 0);
      return b;
    });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.06), glowMat);
    lock.position.set(0, 0.55, 0.4);
    g.add(body, lid, lock, ...bands);
    g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    g.position.set(x, y, z);
    g.rotation.y = S.stash.face ?? faceIn(S.stash);
    group.add(g);
    colliders.push({ x, z, r: 0.7 });
  }

  // The merchant's stall (for games whose merchant has no stall of their own): a counter under an awning, goods on it.
  if (S.merchant && !skip.includes('merchant')) {
    const [x, y, z] = at(S.merchant);
    const g = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.8), woodMat);
    counter.position.y = 0.48;
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.5), stdMat(color, { side: THREE.DoubleSide, roughness: 1 }));
    awning.position.set(0, 2.45, 0.15);
    awning.rotation.x = -Math.PI / 2 + 0.35;
    for (const sx of [-1.3, 1.3]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), woodMat);
      post.position.set(sx, 1.25, -0.5);
      g.add(post);
    }
    const goods = [[-0.8, '#5ad46a'], [-0.45, '#2ec0a0'], [0.1, '#d8a050'], [0.6, '#b07a50']].map(([gx, c]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 8), stdMat(c, { roughness: 0.35, emissive: new THREE.Color(c), emissiveIntensity: 0.15 }));
      m.position.set(gx, 1.08, 0.1);
      return m;
    });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat);
    lamp.position.set(1.1, 2.0, 0.3);
    g.add(counter, awning, lamp, ...goods);
    g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    g.position.set(x, y, z);
    g.rotation.y = S.merchant.face ?? faceIn(S.merchant);
    group.add(g);
    colliders.push({ x, z, r: 1.1 });
  }

  // The mirror on a stand: the game paints the hero into `mirror.material.map`.
  let mirror = null;
  if (S.stats && !skip.includes('stats')) {
    const [x, y, z] = at(S.stats);
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.15, 0.12), stdMat('#7a5a2a', { metalness: 0.5, roughness: 0.4 }));
    frame.position.y = 1.35;
    frame.castShadow = true;
    const glassMat = new THREE.MeshStandardMaterial({ color: '#9fb4c8', roughness: 0.08, metalness: 0.9, envMapIntensity: 1.4 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.95), glassMat);
    glass.position.set(0, 1.35, 0.065);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.6), woodMat);
    foot.position.y = 0.06;
    g.add(frame, glass, foot);
    g.position.set(x, y, z);
    g.rotation.y = S.stats.face ?? faceIn(S.stats);
    group.add(g);
    mirror = glass;
    glass.userData.moves = true;
    colliders.push({ x, z, r: 0.6 });
  }

  // Rest: a bedroll by a small fire.
  if (S.rest && !skip.includes('rest')) {
    const [x, y, z] = at(S.rest);
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.5, 4, 10), stdMat('#7a3a2a', { roughness: 1 }));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.22, 0.9);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.13, 6, 12), stoneMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 7), stdMat('#ff9a3a', { emissive: new THREE.Color('#ff7a2a'), emissiveIntensity: 3, transparent: true, opacity: 0.9 }));
    fire.position.y = 0.42;
    fire.userData.moves = true;
    g.add(roll, ring, fire);
    g.position.set(x, y, z);
    g.rotation.y = S.rest.face ?? faceIn(S.rest);
    group.add(g);
    updaters.push((t) => {
      fire.scale.set(1 + Math.sin(t * 11) * 0.08, 1 + Math.sin(t * 7.3) * 0.15, 1 + Math.cos(t * 9) * 0.08);
    });
    colliders.push({ x, z, r: 0.7 });
  }

  mergeStill(group);
  return {
    group,
    colliders,
    mirror,
    update(t) {
      for (const u of updaters) u(t);
    },
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
    }
  };
}
