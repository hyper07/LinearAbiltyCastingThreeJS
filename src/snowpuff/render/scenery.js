/**
 * The famous mountains in 3D: the signature peak as the hero of the skyline
 * (far away, big, hazed with distance, clouds at its feet), water (the sea,
 * a lake), and the toy-like local scenery beside the run — stone walls and
 * stone grandfathers, torii, a pagoda, snow lanterns, prayer flags, a stupa,
 * yaks, moose, giraffes, elephants, acacias, a red-roofed lodge, a mountain
 * train on its viaduct — all scenery, nothing to hit.
 *
 * Shapes come from landmarks.js (pure); props are either library models
 * (polyfork, credited) or built here from a few soft primitives.
 */
import * as THREE from 'three/webgpu';
import { length, normalLocal, normalWorld, uniform, vec2, vec3, vec4, float, mix, smoothstep, positionLocal, positionWorld, output, color, uv, sin, time, mx_noise_float, pow, abs, normalize, cameraPosition, max, dot, normalView, positionViewDirection, step, fract } from 'three/tsl';
import { profile, backdropPlace } from '../landmarks.js';
import { frameAt, groundAt, toWorld } from '../course.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------------------------------------------------------------- the hero peak */

/** A height-field disc for a silhouette: rings × spokes, the profile as height. */
export function peakGeometry(shape, { rings = 70, spokes = 140, radius = 1, height = 1 } = {}) {
  const h = profile(shape);
  const pos = [];
  const idx = [];
  pos.push(0, h(0, 0) * height, 0);
  for (let i = 1; i <= rings; i++) {
    const r = Math.pow(i / rings, 1.15);
    for (let j = 0; j < spokes; j++) {
      const a = (j / spokes) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      // fade the outer edge down into the ground
      const edge = Math.min(1, (1 - r) * 6 + 0.02);
      pos.push(x * radius, h(x, z) * height * edge - (1 - edge) * height * 0.05, z * radius);
    }
  }
  for (let j = 0; j < spokes; j++) idx.push(0, 1 + ((j + 1) % spokes), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * spokes, b0 = 1 + i * spokes;
    for (let j = 0; j < spokes; j++) {
      const j1 = (j + 1) % spokes;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The hero peak, far off ahead: snow above a broken snow line, rock below
 * (layered on the Rockies), lit by the sun, then hazed toward the sky's
 * colour (bluer and paler with distance, thickest at its base), with soft
 * cloud banks round its feet.
 */
export function buildBackdrop(course, m, sky) {
  const pk = m.peak;
  const b = backdropPlace(course, m);
  const g = peakGeometry(pk.shape, { radius: b.radius, height: b.height });
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  mat.fog = false;
  const hk = positionLocal.y.div(b.height);
  const n = mx_noise_float(positionLocal.mul(0.006)).mul(0.08).add(mx_noise_float(positionLocal.mul(0.02)).mul(0.04));
  const snowLine = float(pk.snowLine ?? 0.45);
  // snow above the line, but cliffs too steep to hold it show their rock
  const flat = smoothstep(float(pk.steep ?? 0.42), float((pk.steep ?? 0.42) + 0.16), normalLocal.y.add(n.mul(1.5)));
  const snow = smoothstep(snowLine.sub(0.04), snowLine.add(0.04), hk.add(n)).mul(mix(float(1), flat, float(pk.cliffs ?? 0.6)));
  let rock = color(pk.rock ?? '#55505a').mul(mx_noise_float(positionLocal.mul(0.01)).mul(0.15).add(0.92));
  if (pk.strata) rock = rock.mul(step(0.5, fract(hk.mul(22).add(n.mul(4)))).mul(0.18).add(0.86));
  mat.colorNode = mix(rock, vec3(0.95, 0.97, 1.0), snow);
  // crisp snow catching the sun: sunlit snow faces glow a little in the sun's colour
  const sunK = max(dot(normalize(normalWorld), sky.u.sun), 0);
  mat.emissiveNode = sky.u.sunColor.mul(snow.mul(sunK.pow(1.5)).mul(pk.glow ?? 0.32));
  // haze belongs in the valley: thick round its foot, almost none on the peak itself
  const haze = sky.u.fog;
  const hazeK = float(pk.haze ?? 0.03).add(smoothstep(0.45, 0, hk).mul(0.55)).clamp(0, 0.65);
  mat.outputNode = vec4(mix(output.rgb, haze, hazeK), 1);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(b.x, b.y, b.z);
  mesh.rotation.y = b.yaw;
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;
  const group = new THREE.Group();
  group.add(mesh);
  // a crater lake on top (Hallasan's Baengnokdam, Baekdusan's Cheonji)
  if (pk.lake) {
    const lake = new THREE.Mesh(new THREE.CircleGeometry(b.radius * (pk.shape === 'caldera' ? 0.17 : 0.085), 48).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: pk.lake }));
    lake.material.fog = false;
    const top = profile(pk.shape)(0, 0) * b.height;
    lake.position.set(b.x, b.y + top + 2, b.z);
    group.add(lake);
  }
  // clouds and haze banks round its feet
  const cloudMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  cloudMat.fog = false;
  const u = uv().sub(0.5).mul(2);
  const puff = smoothstep(1, 0.2, u.length()).mul(mx_noise_float(vec3(u.mul(2.2), time.mul(0.03))).mul(0.4).add(0.6));
  cloudMat.colorNode = vec4(mix(vec3(1, 1, 1), haze, 0.35), puff.mul(pk.clouds ?? 0.75));
  const cloudGeo = new THREE.PlaneGeometry(1, 0.38);
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.sin(i * 7.1) * 0.2;
    const rr = b.radius * (0.55 + (i % 3) * 0.12);
    const c = new THREE.Mesh(cloudGeo, cloudMat);
    c.scale.setScalar(b.radius * (0.7 + (i % 4) * 0.15));
    c.position.set(b.x + Math.cos(a) * rr, b.y + b.height * (0.12 + (i % 5) * 0.05), b.z + Math.sin(a) * rr);
    c.renderOrder = -4;
    c.frustumCulled = false;
    group.add(c);
    clouds.push(c);
  }
  group.userData.clouds = clouds;
  group.userData.place = b;
  // Everest's summit plume: a long streak of blown snow
  if (m.plume) {
    const pm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    pm.fog = false;
    const pu = uv();
    const streak = smoothstep(0, 0.15, pu.x).mul(smoothstep(1, 0.3, pu.x)).mul(smoothstep(0.5, 0.0, abs(pu.y.sub(0.5)))).mul(mx_noise_float(vec2(pu.x.mul(5).sub(time.mul(0.25)), pu.y.mul(3))).mul(0.5).add(0.5));
    pm.colorNode = vec4(1, 1, 1, streak.mul(0.75));
    const plume = new THREE.Mesh(new THREE.PlaneGeometry(b.radius * 1.1, b.height * 0.16), pm);
    const top = profile(pk.shape)(0.05, 0) * b.height;
    plume.position.set(b.x + Math.cos(b.yaw) * b.radius * 0.5, b.y + top * 0.97, b.z - Math.sin(b.yaw) * b.radius * 0.5);
    plume.rotation.y = b.yaw;
    plume.frustumCulled = false;
    group.add(plume);
  }
  return group;
}

/** Keep the cloud banks turned to the camera. */
export function faceClouds(group, camera) {
  for (const c of group?.userData.clouds ?? []) c.quaternion.copy(camera.quaternion);
}

/* ---------------------------------------------------------------- water */

/** The sea around an island (Jeju) or a lake below the run (Kawaguchi, Moraine, a laguna). */
export function buildWater(course, m, sky = null) {
  const w = m.water;
  if (!w) return null;
  const g = new THREE.Group();
  const mat = (col) => {
    const mm = new THREE.MeshPhysicalNodeMaterial({ color: col, roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
    const pw = positionWorld;
    mm.normalNode = normalize(vec3(mx_noise_float(vec3(pw.x.mul(0.05), pw.z.mul(0.05), time.mul(0.2))).mul(0.08), 1, mx_noise_float(vec3(pw.z.mul(0.05), pw.x.mul(0.05), time.mul(0.2))).mul(0.08)));
    return mm;
  };
  const L = course.length;
  if (w.sea) {
    const b = backdropPlace(course, m);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), mat(w.sea));
    sea.position.set((course.px[0] + b.x) / 2, course.py[Math.round(L)] - 60, (course.pz[0] + b.z) / 2);
    sea.frustumCulled = false;
    if (sky) {
      // its own gentle haze, so the blue still shows out to the island's foot
      sea.material.fog = false;
      const d = length(positionWorld.sub(cameraPosition));
      sea.material.outputNode = vec4(mix(output.rgb, sky.u.fog, smoothstep(300, 7000, d).mul(0.55)), 1);
    } else sea.material.fog = true;
    g.add(sea);
  }
  if (w.lake) {
    const s = (w.at ?? 0.97) * L + 70;
    const f = frameAt(course, Math.min(course.n - 2, s));
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), mat(w.lake));
    lake.scale.set(150, 1, 90);
    lake.position.set(f.x + f.tx * 120, groundAt(course, Math.min(course.n - 2, s), 0, false) - 2.5, f.z + f.tz * 120);
    lake.rotation.y = -f.heading;
    g.add(lake);
  }
  return g;
}

/* ---------------------------------------------------------------- little procedural kits */

const std = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.85, ...o });
const kit = (parts) => {
  const box = new THREE.Box3();
  for (const p of parts) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox);
  }
  return { parts, size: box.getSize(new THREE.Vector3()) };
};
const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  return g;
}));
const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 14) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)).scale(sx, sy, sz).translate(x, y, z);
const cyl = (r0, r1, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y + h / 2, z);
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

/** Jeju's stone grandfather (dol hareubang): porous basalt, a hat, big eyes, hands on the belly. */
function hareubang() {
  const stone = std('#5a5a60', { roughness: 1 });
  const body = merge([cyl(0.32, 0.36, 1.0, 0, 0, 0, 14), sph(0.36, 0, 1.2, 0, 1, 1.05, 0.95), cyl(0.3, 0.33, 0.28, 0, 1.48, 0, 14), sph(0.3, 0, 1.76, 0, 1, 0.55, 1), sph(0.13, 0.12, 0.62, 0.3, 1, 0.6, 0.5), sph(0.13, -0.12, 0.78, 0.3, 1, 0.6, 0.5)]);
  const eyes = merge([sph(0.075, 0.13, 1.28, 0.31), sph(0.075, -0.13, 1.28, 0.31), sph(0.07, 0, 1.15, 0.34, 1, 1.4, 1)]);
  return kit([{ geometry: body, material: stone }, { geometry: eyes, material: std('#47474c', { roughness: 1 }) }]);
}

/** A tangerine tree heavy with fruit. */
function tangerine() {
  return kit([
    { geometry: cyl(0.12, 0.16, 1.0, 0, 0, 0), material: std('#6b4a32') },
    { geometry: sph(1.0, 0, 1.6, 0, 1.1, 0.85, 1.1), material: std('#2f6b3a') },
    { geometry: merge(Array.from({ length: 18 }, (_, i) => { const a = i * 2.4, e = Math.sin(i * 1.7) * 0.6; return sph(0.13, Math.cos(a) * Math.cos(e) * 1.05, 1.6 + Math.sin(e) * 0.85, Math.sin(a) * Math.cos(e) * 1.05, 1, 1, 1, 8); })), material: std('#ff8c1a', { roughness: 0.5 }) }
  ]);
}

/** A white stupa on a stepped base, a gold spire. */
function stupa() {
  const white = std('#f4f1ea', { roughness: 0.7 });
  return kit([
    { geometry: merge([box(6, 0.8, 6, 0, 0, 0), box(4.8, 0.8, 4.8, 0, 0.8, 0), sph(2.1, 0, 1.6, 0, 1, 0.85, 1, 24), box(1.1, 0.9, 1.1, 0, 3.3, 0)]), material: white },
    { geometry: merge([cyl(0.5, 0.1, 2.6, 0, 4.2, 0, 12), sph(0.22, 0, 6.9, 0)]), material: std('#d9a521', { roughness: 0.35, metalness: 0.6 }) }
  ]);
}

/** A stone cairn. */
function cairn() {
  return kit([{ geometry: merge([sph(0.45, 0, 0.25, 0, 1, 0.55, 1, 9), sph(0.35, 0.05, 0.6, 0, 1, 0.55, 1, 9), sph(0.26, -0.03, 0.88, 0.02, 1, 0.55, 1, 9), sph(0.18, 0, 1.1, 0, 1, 0.6, 1, 9)]), material: std('#7d7a74', { roughness: 1, flatShading: true }) }]);
}

/** A shaggy yak: dark long hair, pale horns. */
function yak() {
  const hair = std('#2e241e', { roughness: 1 });
  return kit([
    { geometry: merge([sph(0.8, 0, 1.2, 0, 1.45, 0.95, 0.95), sph(0.5, 1.1, 1.15, 0, 1, 0.9, 0.85), cyl(0.85, 1.05, 0.7, 0, 0.45, 0, 12).scale(1.5, 1, 0.95), ...[[-0.7, -0.35], [-0.7, 0.35], [0.6, -0.35], [0.6, 0.35]].map(([x, z]) => cyl(0.13, 0.11, 0.6, x, 0, z))]), material: hair },
    { geometry: merge([new THREE.TorusGeometry(0.28, 0.05, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(1.2, 1.5, 0)]), material: std('#e8dcc4') }
  ]);
}

/** A moose: long legs, a big nose, flat antlers. */
function moose() {
  const fur = std('#4a3426', { roughness: 1 });
  return kit([
    { geometry: merge([sph(0.75, 0, 1.75, 0, 1.6, 0.85, 0.8), cyl(0.28, 0.32, 0.8, 1.05, 1.7, 0).rotateZ(-0.6).translate(0.5, 0.45, 0), sph(0.35, 1.55, 2.05, 0, 1.5, 0.8, 0.8), ...[[-0.8, -0.3], [-0.8, 0.3], [0.8, -0.3], [0.8, 0.3]].map(([x, z]) => cyl(0.1, 0.08, 1.35, x, 0, z))]), material: fur },
    { geometry: merge([box(0.15, 0.5, 0.9, 1.4, 2.45, 0.6).rotateX(0.5), box(0.15, 0.5, 0.9, 1.4, 2.45, -0.6).rotateX(-0.5)]), material: std('#d8c8a8') }
  ]);
}

/** A flat-topped acacia. */
function acacia() {
  return kit([
    { geometry: merge([cyl(0.18, 0.28, 2.6, 0, 0, 0), cyl(0.1, 0.14, 1.4, 0.4, 2.2, 0).rotateZ(-0.5).translate(0.9, 0.4, 0), cyl(0.1, 0.14, 1.4, -0.4, 2.2, 0).rotateZ(0.5).translate(-0.9, 0.4, 0)]), material: std('#5a4030') },
    { geometry: merge([sph(2.6, 0, 3.6, 0, 1, 0.22, 1, 16), sph(1.6, 1.4, 3.8, 0.4, 1, 0.2, 1, 12), sph(1.6, -1.5, 3.7, -0.3, 1, 0.2, 1, 12)]), material: std('#6f7f3a') }
  ]);
}

/** A log lodge with a red roof. */
function lodge() {
  return kit([
    { geometry: box(12, 5, 8, 0, 0, 0), material: std('#7a5233') },
    { geometry: merge([new THREE.CylinderGeometry(0.01, 7.6, 3.6, 4, 1).rotateY(Math.PI / 4).scale(1.15, 1, 0.78).translate(0, 6.8, 0)]), material: std('#b3261e', { roughness: 0.6 }) },
    { geometry: merge([box(1.6, 2.4, 0.2, 0, 0, 4.05), box(1.4, 1.2, 0.2, -3.5, 2, 4.05), box(1.4, 1.2, 0.2, 3.5, 2, 4.05)]), material: std('#ffd9a0', { emissive: new THREE.Color('#ffb648'), emissiveIntensity: 0.6 }) }
  ]);
}

/** A red arched bridge (over a frozen stream). */
function redBridge() {
  const red = std('#c1272d', { roughness: 0.5 });
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    pts.push(new THREE.Vector3((u - 0.5) * 12, Math.sin(u * Math.PI) * 2, 0));
  }
  const deck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.5, 6).scale(1, 1, 3);
  const rails = merge([-1.6, 1.6].map((z) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(new THREE.Vector3(0, 1.1, z)))), 40, 0.08, 6)));
  return kit([{ geometry: deck, material: red }, { geometry: rails, material: red }]);
}

export const BUILDERS = { hareubang, tangerine, stupa, cairn, yak, moose, acacia, lodge, redbridge: redBridge };

/* ---------------------------------------------------------------- over-the-run pieces */

/** Prayer-flag strings across the run, flags in the five traditional colours, waving. */
export function prayerFlags(course, items) {
  const cols = ['#2a6fdb', '#ffffff', '#d62828', '#2a9d4b', '#f2c40f'].map((c) => new THREE.Color(c));
  const quads = [];
  const cord = [];
  for (const it of items) {
    const f = frameAt(course, it.s);
    const n = Math.round((it.span * 2) / 0.9);
    const p0 = toWorld(course, it.s, -it.span, 0, {}), p1 = toWorld(course, it.s, it.span, 0, {});
    const y0 = p0.y + it.h, y1 = p1.y + it.h;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sag = Math.sin(u * Math.PI) * 1.2;
      quads.push({ x: p0.x + (p1.x - p0.x) * u, y: y0 + (y1 - y0) * u - sag, z: p0.z + (p1.z - p0.z) * u, ry: -f.heading, c: cols[i % 5] });
    }
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      pts.push(new THREE.Vector3(p0.x + (p1.x - p0.x) * u, y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 1.2 + 0.02, p0.z + (p1.z - p0.z) * u));
    }
    cord.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4));
    for (const p of [p0, p1]) cord.push(cyl(0.06, 0.08, it.h + 0.6, p.x, p.y - 0.3, p.z, 6));
  }
  const g = new THREE.Group();
  if (!quads.length) return g;
  const geo = new THREE.PlaneGeometry(0.55, 0.7, 2, 2).translate(0, -0.35, 0);
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, side: THREE.DoubleSide });
  const wave = sin(time.mul(8).add(positionWorld.x.mul(0.7)).add(positionWorld.z.mul(0.7))).mul(uv().y.oneMinus()).mul(0.18);
  mat.positionNode = positionLocal.add(vec3(0, 0, wave));
  const im = new THREE.InstancedMesh(geo, mat, quads.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  quads.forEach((it, i) => {
    q.setFromEuler(e.set(0, it.ry, 0));
    im.setMatrixAt(i, m4.compose(p.set(it.x, it.y, it.z), q, sc));
    im.setColorAt(i, it.c);
  });
  im.frustumCulled = false;
  g.add(im);
  g.add(new THREE.Mesh(merge(cord), std('#8a7f70')));
  return g;
}

/** Torii gates over the run (in place of the inflatable arches): red posts and beams, a dark cap. */
export function toriiGate(course, s) {
  const f = frameAt(course, s);
  const W = f.width + 2.6;
  const H = 8;
  const red = std('#c8102e', { roughness: 0.55 });
  const dark = std('#1d1d22', { roughness: 0.6 });
  const g = new THREE.Group();
  const base = toWorld(course, s, 0, 0, {});
  g.position.set(base.x, 0, base.z);
  g.rotation.y = -f.heading;
  const left = groundAt(course, s, -W, false), right = groundAt(course, s, W, false);
  const top = Math.max(left, right) + H;
  for (const [lat, gy] of [[-W, left], [W, right]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, top - gy, 14).translate(0, (top - gy) / 2, 0), red);
    post.position.set(lat, gy, 0);
    post.castShadow = true;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 14).translate(0, 0.4, 0), dark);
    foot.position.set(lat, gy, 0);
    g.add(post, foot);
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 1.6, 0.55, 0.45), red);
  nuki.position.y = top - 1.8;
  const kasa = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 4, 0.7, 0.9), red);
  kasa.position.y = top + 0.35;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 4.6, 0.38, 1.1), dark);
  cap.position.y = top + 0.85;
  for (const m of [nuki, kasa, cap]) m.castShadow = true;
  g.add(nuki, kasa, cap);
  g.position.y = 0;
  return g;
}

/** A mountain railway crossing high over the run on a stone viaduct, its red train running back and forth. */
export function buildTrain(course, s) {
  const f = frameAt(course, s);
  const span = f.width + 60;
  const y0 = groundAt(course, s, 0, false) + 17; // high, so it clears the view of the peak but for a moment
  const g = new THREE.Group();
  const stone = std('#8d8478', { roughness: 1 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 1.2, 3.2), stone);
  const p = toWorld(course, s, 0, 0, {});
  g.position.set(p.x, y0, p.z);
  g.rotation.y = -f.heading;
  deck.castShadow = true;
  g.add(deck);
  // piers only off the run
  for (let lat = -span + 6; lat <= span - 6; lat += 12) {
    if (Math.abs(lat) < f.width + 5) continue;
    const gy = groundAt(course, s, lat, false);
    const h = y0 - gy;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, h, 2.6).translate(0, -h / 2, 0), stone);
    pier.position.set(lat, 0, 0);
    g.add(pier);
  }
  const train = new THREE.Group();
  const red = std('#c1121f', { roughness: 0.45 });
  const win = std('#fff1c8', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 2.8).translate(0, 2.1, 0), red);
    car.position.x = i * 9.6;
    const w = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 2.85).translate(0, 2.6, 0), win);
    w.position.x = i * 9.6;
    car.castShadow = true;
    train.add(car, w);
  }
  g.add(train);
  g.userData.train = train;
  g.userData.span = span;
  return g;
}

export { uniform, max, dot, normalView, positionViewDirection, cameraPosition, pow, step };
