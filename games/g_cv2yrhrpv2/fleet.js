import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VEHICLES, MOPED } from './streetAssets.js';

/**
 * Seoul's traffic as real models: everyday cars, a one-tonne box truck and a
 * town bus published on Sketchfab under CC BY 4.0, and polyfork's delivery
 * moped (streetAssets.js, fetched by scripts/library/streetfolk.mjs). Each
 * model is made ready once — sized, turned so its nose points −z, its wheels
 * found and made to turn, its paint made repaintable in Seoul's colours
 * (white, silver, grey, black, a few muted colours; taxis orange or silver
 * with a roof sign of our own; buses in route blue and green, the small
 * green town buses shorter), its glass made glass, its parts merged by
 * material (a car is a handful of draws, not dozens) — then cloned per
 * vehicle, sharing geometry and materials (one material per kind and paint).
 *
 * Far off (past LOD.far) a vehicle is a reduced copy of its own model: the
 * same shape with its wheels fixed in place and its colours (the textures',
 * the paint's) baked into its corners — two draws, no textures, no glass to
 * sort, no lamps. Never a box: there is no built stand-in, and a kind whose
 * file didn't load is stood in for by another real model (`fleetKindFor`).
 *
 * The lamps are ours, laid over each model at its corners and lit only when
 * on: headlights and tail lights at night, brake lights brighter when
 * braking, amber indicators that really blink.
 *
 *   await loadFleet();                       // every model, before the race starts
 *   const v = makeFleetVehicle('sedan');     // null only if no model at all loaded
 *   v.lights(night, braking); v.indicate('left' | 'right' | 'both' | null, on); v.wheels(roll); v.near(on);
 *   v.axles                                  // { front, rear, track }: where its tyres meet the road (traffic.js sits it there)
 *   const m = makeFleetMoped();              // a delivery moped's body (no rider)
 */

const ROOT = './library/objaverse/';
/** Seoul's paints: mostly white, silver, grey and black; a few muted colours. */
export const PAINTS = ['#f2f2f0', '#f2f2f0', '#f2f2f0', '#e9e9e6', '#c6c9cd', '#c6c9cd', '#8e9399', '#55595f', '#1c1d20', '#1c1d20', '#2f3e5c', '#6e2a2c', '#c9bfa8', '#4a5a6a'];
const TAXI = ['#f28a1a', '#c6c9cd', '#f2f2f0'];
const ROUTE = ['#2f6fd1', '#3aa65a', '#2f6fd1'];
/** A town bus (마을버스): always green. */
const TOWN = ['#3aa65a'];
/** Near: the full model; past `far` m from the camera the reduced copy (back to full inside `near`). */
export const LOD = { near: 50, far: 60 };

/**
 * The kinds: which file (and which body in a pack), its length in metres, how
 * common it is, and what in it is paint, glass and wheel. `yaw` turns its nose to −z.
 */
const KINDS = {
  sedan: { file: 'sedan', length: 4.55, mix: 0.26, paint: /solar_body/, glass: /solar_glass$/, wheelMesh: /^wheels_/, yaw: Math.PI },
  taxi: { file: 'sedan', length: 4.55, mix: 0.12, paint: /solar_body/, glass: /solar_glass$/, wheelMesh: /^wheels_/, yaw: Math.PI, taxi: true },
  hatch: { file: 'hatch', length: 4.05, mix: 0.18, paint: /MODERNHATCH_body/, glass: /GLASS/, wheelNode: /^wheel_[fr][lr]$/, yaw: Math.PI },
  minivan: { file: 'pack', part: 'minivan_body', length: 4.95, mix: 0.08, paint: /^Body/, glass: /^Glass/, yaw: 0 },
  suv: { file: 'pack', part: 'Offroad_Body', length: 4.6, mix: 0.12, paint: /^Body/, glass: /^Glass/, yaw: Math.PI },
  compact: { file: 'pack', part: 'Compact_Body', length: 3.7, mix: 0.08, paint: /^Body/, glass: /^Glass/, yaw: 0 },
  wagon: { file: 'pack', part: 'Sedan_Body', length: 4.7, mix: 0.06, paint: /^Body/, glass: /^Glass/, yaw: 0 },
  // No real makers' badges: the truck's grille badge (its own decal) is left out, and the badge in its
  // front photo, the model name on its door and the badges on its wheel caps are painted over.
  truck: {
    file: 'truck',
    length: 5.1,
    mix: 0.1,
    yaw: Math.PI,
    keepPaint: true,
    hide: /^Material_227$/,
    scrub: {
      Material_215: [{ x: 0.207, y: 0.363, r: 0.04 }, { x: 0.77, y: 0.53, w: 0.1, h: 0.055 }],
      Material_552: [{ x: 0.207, y: 0.363, r: 0.04 }, { x: 0.77, y: 0.53, w: 0.1, h: 0.055 }],
      Material_26: [{ x: 0.252, y: 0.441, r: 0.036 }, { x: 0.725, y: 0.457, r: 0.034 }]
    }
  },
  bus: { file: 'bus', length: 11, mix: 0, glass: /^glass$/, wheelMat: /^material(_4)?$/, yaw: 0, bus: true },
  // The green town bus (마을버스) of the back streets: the same bus, smaller all round (about 9 m).
  townbus: { file: 'bus', length: 8.9, mix: 0, glass: /^glass$/, wheelMat: /^material(_4)?$/, yaw: 0, bus: true, town: true }
};
export const FLEET_KINDS = Object.keys(KINDS);

/**
 * Another real model for a kind whose own didn't load (never a block): the
 * nearest everyday kind that did; for a bus a town bus, then a truck.
 */
const STAND_IN = {
  sedan: ['wagon', 'hatch', 'compact', 'minivan', 'suv'],
  taxi: ['sedan', 'wagon', 'hatch', 'compact'],
  hatch: ['compact', 'sedan', 'wagon'],
  minivan: ['suv', 'wagon', 'sedan'],
  suv: ['minivan', 'wagon', 'sedan'],
  compact: ['hatch', 'sedan'],
  wagon: ['sedan', 'hatch'],
  truck: ['minivan', 'suv'],
  bus: ['townbus', 'truck', 'minivan'],
  townbus: ['bus', 'truck', 'minivan']
};

const loader = new GLTFLoader();
const files = {};
const ready = {};
let all = null;

/**
 * Start loading every model (once) and make each ready; resolves (never
 * rejects) with the kinds that are, once every file has come in or failed.
 * The race waits on it before the lights (race.js _begin), so no car is ever
 * put down before its model is there.
 */
export function loadFleet() {
  if (all) return all;
  const jobs = [];
  for (const v of VEHICLES) {
    files[v.id] = loader.loadAsync(`${ROOT}${v.id}.glb`).then((g) => g.scene).catch(() => null);
  }
  for (const [kind, k] of Object.entries(KINDS)) {
    jobs.push(
      files[k.file]?.then((scene) => {
        if (!scene) return;
        try {
          ready[kind] = prepare(scene, k, kind);
        } catch (e) {
          console.warn(`[fleet] ${kind}: ${e.message}`);
        }
      })
    );
  }
  jobs.push(loadMoped());
  all = Promise.all(jobs).then(() => FLEET_KINDS.filter((k) => ready[k]));
  return all;
}

export const fleetReady = (kind) => Boolean(ready[kind]);

/** A kind for a new car in traffic, by how common it is (only kinds that have loaded). */
export function pickFleetKind(random = Math.random) {
  const have = Object.entries(KINDS).filter(([k, d]) => ready[k] && d.mix > 0);
  if (!have.length) return null;
  const sum = have.reduce((s, [, d]) => s + d.mix, 0);
  let r = random() * sum;
  for (const [k, d] of have) if ((r -= d.mix) <= 0) return k;
  return have[0][0];
}

/** The kind to make for `kind`: itself if its model is in, else the nearest real one that is (null if none at all). */
export function fleetKindFor(kind, random = Math.random) {
  if (ready[kind]) return kind;
  for (const k of STAND_IN[kind] ?? []) if (ready[k]) return k;
  return pickFleetKind(random);
}

/* ------------------------------------------------------------------ the delivery moped */

let moped = null;
function loadMoped() {
  return loader
    .loadAsync(MOPED.file)
    .then((g) => {
      const root = g.scene;
      root.updateMatrixWorld(true);
      // To size (1.85 m long), its front to −z (it is built facing +z, or across), sitting on the ground.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const alongX = size.x > size.z;
      const s = MOPED.length / Math.max(size.x, size.z);
      const c = box.getCenter(new THREE.Vector3());
      const toLocal = new THREE.Matrix4()
        .makeRotationY(alongX ? -Math.PI / 2 : Math.PI)
        .multiply(new THREE.Matrix4().makeScale(s, s, s))
        .multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
      const list = [];
      root.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone();
        geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
        list.push({ g: geo, mat: o.material });
      });
      moped = merged(list);
    })
    .catch(() => null);
}

/** A delivery moped's body (one or two draws; its rider is traffic.js's), or null if it didn't load. */
export function makeFleetMoped() {
  if (!moped) return null;
  const g = new THREE.Group();
  for (const p of moped) {
    const m = new THREE.Mesh(p.g, p.mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/* ------------------------------------------------------------------ preparing a model */

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

/**
 * Take one model (or one body of a pack, with its four nearest wheels) out of
 * a loaded scene: baked into the holder's space (metres, nose to −z, on the
 * ground, centred), as plain meshes grouped by role.
 */
function prepare(scene, k, kind) {
  scene.updateMatrixWorld(true);
  // Which meshes are this vehicle's, and its own frame (a pack's cars stand turned every which way).
  let meshes = [];
  const frame = new THREE.Matrix4();
  // a mesh's box in that frame
  const boxIn = (m) => {
    const g = m.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    return g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(frame, m.matrixWorld));
  };
  if (k.part) {
    const body = scene.getObjectByName(k.part);
    if (!body) throw new Error(`no ${k.part}`);
    body.traverse((o) => o.isMesh && meshes.push(o));
    // its heading on the ground, from how its points spread (the long axis), turned square
    let n = 0, mx = 0, mz = 0, cxx = 0, czz = 0, cxz = 0;
    const pts = [];
    for (const m of meshes) {
      const pos = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += step) pts.push(_v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
    }
    for (const q of pts) {
      mx += q.x;
      mz += q.z;
      n++;
    }
    mx /= n;
    mz /= n;
    for (const q of pts) {
      cxx += (q.x - mx) ** 2;
      czz += (q.z - mz) ** 2;
      cxz += (q.x - mx) * (q.z - mz);
    }
    frame.makeRotationY(0.5 * Math.atan2(2 * cxz, cxx - czz));
    // the four wheels nearest this body (a wheel's pivot may sit anywhere: measure its geometry)
    const bb = new THREE.Box3();
    for (const m of meshes) bb.union(boxIn(m));
    const c = bb.getCenter(new THREE.Vector3());
    const near = bb.clone().expandByScalar(bb.getSize(_v).length() * 0.06);
    const wheels = [];
    scene.traverse((o) => {
      if (!o.isMesh || !/^Wheel/i.test(o.parent?.name ?? '')) return;
      const q = boxIn(o).getCenter(new THREE.Vector3());
      if (near.containsPoint(q)) wheels.push([q.distanceTo(c), o]);
    });
    wheels.sort((x, y) => x[0] - y[0]);
    for (const [, o] of wheels.slice(0, 4)) {
      o.userData.wheel = true;
      meshes.push(o);
    }
  } else scene.traverse((o) => o.isMesh && meshes.push(o));
  // Strays (a handrail or a line left floating outside the body): the core is every part with a fair
  // share of the triangles; anything not inside it (grown a little) is left out.
  const tris = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  const total = meshes.reduce((t, m) => t + tris(m), 0);
  const boxes = meshes.map(boxIn);
  const core = new THREE.Box3();
  meshes.forEach((m, i) => tris(m) >= total * 0.03 && core.union(boxes[i]));
  core.expandByScalar(core.getSize(_v).length() * 0.05);
  meshes = meshes.filter((m, i) => m.userData.wheel || core.containsBox(boxes[i]));
  // A maker's badge as its own decal: left out. One painted into a texture: painted over.
  if (k.hide) meshes = meshes.filter((m) => !k.hide.test(m.material?.name ?? ''));
  if (k.scrub) for (const m of meshes) {
    const spots = k.scrub[m.material?.name];
    if (spots && m.material.map) m.material.map = scrubbed(m.material.map, spots);
  }
  // Everything into one space: the frame → ours (metres, nose to −z, on the ground, centred).
  const box = new THREE.Box3();
  for (const m of meshes) box.union(boxIn(m));
  const size = box.getSize(new THREE.Vector3());
  const alongX = size.x > size.z;
  const scale = k.length / Math.max(size.x, size.z);
  const centre = box.getCenter(new THREE.Vector3());
  const toLocal = new THREE.Matrix4()
    .makeRotationY(k.yaw + (alongX ? Math.PI / 2 : 0))
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z))
    .multiply(frame);
  const parts = { paint: [], glass: [], other: [], wheels: [] };
  for (const m of meshes) {
    const g = m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, m.matrixWorld));
    const mat = m.material;
    const name = mat?.name ?? '';
    const node = m.parent?.parent?.name ?? m.parent?.name ?? '';
    const isWheel = m.userData.wheel || (k.wheelNode && k.wheelNode.test(node)) || (k.wheelMesh && k.wheelMesh.test(m.name)) || (k.wheelMat && k.wheelMat.test(name));
    if (isWheel) parts.wheels.push({ g, mat });
    else if (k.glass && k.glass.test(name)) parts.glass.push({ g, mat });
    else if (k.paint && k.paint.test(name)) parts.paint.push({ g, mat });
    else parts.other.push({ g, mat });
  }
  // Wheels: each a group turning about its own axle (a mesh holding all four is split by quarter).
  const wheels = [];
  const pieces = [];
  for (const w of parts.wheels) pieces.push(...splitByQuarter(w.g).map((g) => ({ g, mat: w.mat })));
  const axles = new Map();
  for (const p of pieces) {
    p.g.computeBoundingBox();
    const c = p.g.boundingBox.getCenter(new THREE.Vector3());
    const key = `${Math.sign(c.x)}|${Math.round(c.z * 2)}`;
    if (!axles.has(key)) axles.set(key, { c, list: [] });
    axles.get(key).list.push(p);
  }
  for (const { list } of axles.values()) {
    const b = new THREE.Box3();
    for (const p of list) b.union(p.g.boundingBox);
    const c = b.getCenter(new THREE.Vector3());
    // the hub is at the wheel's middle; the axle runs along x
    for (const p of list) p.g.translate(-c.x, -c.y, -c.z);
    wheels.push({ at: c, radius: (b.max.y - b.min.y) / 2, list });
  }
  const dims = new THREE.Box3();
  for (const list of [parts.paint, parts.glass, parts.other]) for (const p of list) {
    p.g.computeBoundingBox();
    dims.union(p.g.boundingBox);
  }
  for (const w of wheels) dims.expandByPoint(w.at);
  const L = dims.max.z - dims.min.z;
  const W = dims.max.x - dims.min.x;
  const H = dims.max.y - dims.min.y;
  const P = { kind, k, parts, wheels, size: { length: L, width: W, height: H, wheel: wheels[0]?.radius || 0.33 }, front: dims.min.z, back: dims.max.z, mats: new Map() };
  // Where its tyres touch the road, in its own frame (nose to −z): the front and rear axles' z (a bus's
  // or truck's longer, wider wheelbase its own) and half the track — what traffic.js stands it on.
  P.axles = wheels.length >= 2
    ? { front: Math.min(...wheels.map((w) => w.at.z)), rear: Math.max(...wheels.map((w) => w.at.z)), track: Math.max(0.3, ...wheels.map((w) => Math.abs(w.at.x))) }
    : { front: P.front * 0.62, rear: P.back * 0.62, track: W * 0.4 };
  // The far copy is made from the parts as they are; then each list is merged by material (fewer draws).
  P.far = farCopy(P);
  for (const key of ['paint', 'glass', 'other']) parts[key] = merged(parts[key]);
  for (const w of wheels) w.list = merged(w.list);
  return P;
}

/* ------------------------------------------------------------------ fewer draws */

/**
 * Geometries that share a material made one (each { g, mat }, already in the same space): a model's
 * dozen meshes become a draw per material. Pieces that can't be joined (different attributes) stay apart.
 */
function merged(list) {
  const byMat = new Map();
  for (const p of list) {
    const key = p.mat?.uuid ?? 'none';
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(p);
  }
  const out = [];
  for (const group of byMat.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    // the attributes all of them have (a stray colour or second uv set is dropped), all indexed or none
    const names = Object.keys(group[0].g.attributes).filter((n) => group.every((p) => p.g.attributes[n] && p.g.attributes[n].itemSize === group[0].g.attributes[n].itemSize));
    const indexed = group.every((p) => p.g.index);
    const geos = group.map((p) => {
      let g = indexed || !p.g.index ? p.g : p.g.toNonIndexed();
      g = g === p.g ? g.clone() : g;
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      for (const n of names) {
        // (one stored normalised and one not can't be joined: as plain floats)
        const a = g.attributes[n];
        if (a.normalized || a.isInterleavedBufferAttribute) g.setAttribute(n, new THREE.BufferAttribute(Float32Array.from({ length: a.count * a.itemSize }, (_, i) => a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize)), a.itemSize));
      }
      g.morphAttributes = {};
      g.clearGroups();
      return g;
    });
    let one = null;
    try {
      one = mergeGeometries(geos, false);
    } catch {
      one = null;
    }
    if (one) out.push({ g: one, mat: group[0].mat });
    else out.push(...group);
  }
  return out;
}

/* ------------------------------------------------------------------ the far copy */

const _c = new THREE.Color();
const pixels = new Map();
/** A texture's pixels (at most 256 across), for reading colours at points on it; null if it can't be read. */
function texPixels(tex) {
  const img = tex?.image;
  if (!img?.width) return null;
  const key = tex.source?.uuid ?? tex.uuid;
  if (pixels.has(key)) return pixels.get(key);
  let out = null;
  try {
    const w = Math.min(256, img.width);
    const h = Math.max(1, Math.round((img.height / img.width) * w));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    out = { w, h, d: g.getImageData(0, 0, w, h).data, flipY: tex.flipY, repeat: tex.repeat, offset: tex.offset };
  } catch {
    out = null;
  }
  pixels.set(key, out);
  return out;
}

const lin = (v) => Math.pow(v / 255, 2.2);

/** The colour (linear) of a material at a point of its texture (u, v): the texture's (or white) times its colour. */
function colourAt(mat, px, u, v, out) {
  out.setRGB(1, 1, 1);
  if (px) {
    let uu = u * px.repeat.x + px.offset.x;
    let vv = v * px.repeat.y + px.offset.y;
    uu -= Math.floor(uu);
    vv -= Math.floor(vv);
    const x = Math.min(px.w - 1, Math.floor(uu * px.w));
    const y = Math.min(px.h - 1, Math.floor((px.flipY ? 1 - vv : vv) * px.h));
    const i = (y * px.w + x) * 4;
    out.setRGB(lin(px.d[i]), lin(px.d[i + 1]), lin(px.d[i + 2]));
  }
  if (mat?.color) out.multiply(mat.color);
  return out;
}

/**
 * The vehicle as seen from far off: its own model, every part (the wheels fixed at their hubs), with its
 * colours baked into its corners (read from its textures where it has them) — no textures, no glass to
 * sort, no lamps, no wheels to turn: two draws instead of a dozen or more. The paint (a grey shade × the
 * vehicle's paint colour, as the near paint does) and everything else.
 */
function farCopy(P) {
  const k = P.k;
  const out = { paint: { p: [], n: [], c: [] }, rest: { p: [], n: [], c: [] } };
  const _n = new THREE.Vector3();
  const add = (g, mat, kind, shift = null) => {
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    const px = kind === 'glass' ? null : texPixels(mat?.map);
    const ref = kind === 'paint' ? paintRef(mat) : 1;
    const livery = k.bus && kind === 'other' && mat?.color && isLivery(mat);
    const into = kind === 'paint' || livery ? out.paint : out.rest;
    for (let t = 0; t < count; t++) {
      const i = idx ? idx.getX(t) : t;
      into.p.push(pos.getX(i) + (shift?.x ?? 0), pos.getY(i) + (shift?.y ?? 0), pos.getZ(i) + (shift?.z ?? 0));
      if (nor) _n.fromBufferAttribute(nor, i).normalize();
      else _n.set(0, 1, 0);
      into.n.push(_n.x, _n.y, _n.z);
      if (kind === 'glass') _c.setRGB(0.02, 0.026, 0.032);
      else if (livery) _c.setRGB(1, 1, 1);
      else {
        colourAt(mat, px, uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0, _c);
        if (kind === 'paint') {
          const l = Math.min(1.25, (0.2126 * _c.r + 0.7152 * _c.g + 0.0722 * _c.b) / ref);
          _c.setRGB(l, l, l);
        } else if (k.bus && kind === 'wheel') _c.setRGB(0.16, 0.16, 0.17);
      }
      into.c.push(_c.r, _c.g, _c.b);
    }
  };
  for (const p of P.parts.paint) add(p.g, p.mat, 'paint');
  for (const p of P.parts.glass) add(p.g, p.mat, 'glass');
  for (const p of P.parts.other) add(p.g, p.mat, 'other');
  for (const w of P.wheels) for (const p of w.list) add(p.g, p.mat, 'wheel', w.at);
  const geos = {};
  for (const [part, a] of Object.entries(out)) {
    if (!a.p.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(a.c, 3));
    g.computeBoundingSphere();
    geos[part] = g;
  }
  return geos;
}

const farMats = new Map();
/** The far copy's materials: the paint per colour, everything else one for all. */
function farMaterial(hex) {
  const key = hex ?? 'rest';
  let m = farMats.get(key);
  if (!m) {
    m = hex ? new THREE.MeshStandardMaterial({ color: hex, vertexColors: true, roughness: 0.38, metalness: 0.25, envMapIntensity: 1.1 }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.8 });
    farMats.set(key, m);
  }
  return m;
}

const scrubCache = new Map();
/**
 * A texture with some spots painted over (a badge, a model name): each spot — a
 * circle { x, y, r } or a box { x, y, w, h }, in fractions of the image — filled
 * with the colour just round it, its edge softened. Made once per image.
 */
function scrubbed(tex, spots) {
  const img = tex.image;
  if (!img?.width) return tex;
  const key = `${tex.source?.uuid ?? tex.uuid}|${JSON.stringify(spots)}`;
  if (scrubCache.has(key)) return scrubCache.get(key);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const W = c.width;
  const H = c.height;
  for (const s of spots) {
    const box = s.r != null ? { x0: (s.x - s.r) * W, y0: s.y * H - s.r * W, x1: (s.x + s.r) * W, y1: s.y * H + s.r * W } : { x0: s.x * W, y0: s.y * H, x1: (s.x + s.w) * W, y1: (s.y + s.h) * H };
    // the colour round it: the average of a frame a few pixels outside
    const pad = Math.max(2, Math.round((box.x1 - box.x0) * 0.25));
    const fx0 = Math.max(0, Math.floor(box.x0 - pad));
    const fy0 = Math.max(0, Math.floor(box.y0 - pad));
    const fx1 = Math.min(W, Math.ceil(box.x1 + pad));
    const fy1 = Math.min(H, Math.ceil(box.y1 + pad));
    const d = g.getImageData(fx0, fy0, fx1 - fx0, fy1 - fy0).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let y = fy0; y < fy1; y++) for (let x = fx0; x < fx1; x++) {
      if (x >= box.x0 - 1 && x <= box.x1 + 1 && y >= box.y0 - 1 && y <= box.y1 + 1) continue;
      const i = ((y - fy0) * (fx1 - fx0) + (x - fx0)) * 4;
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
      n++;
    }
    if (!n) continue;
    g.fillStyle = `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})`;
    g.filter = `blur(${Math.max(1, pad * 0.35)}px)`;
    g.beginPath();
    if (s.r != null) g.arc(s.x * W, s.y * H, s.r * W, 0, Math.PI * 2);
    else g.rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    g.fill();
    g.filter = 'none';
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.colorSpace = tex.colorSpace;
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  t.anisotropy = 8;
  scrubCache.set(key, t);
  return t;
}

/** Split a geometry holding several wheels into one per quarter round its middle (x left/right, z front/back). */
function splitByQuarter(g) {
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.attributes.position;
  src.computeBoundingBox();
  const c = src.boundingBox.getCenter(new THREE.Vector3());
  const spanX = src.boundingBox.max.x - src.boundingBox.min.x;
  const spanZ = src.boundingBox.max.z - src.boundingBox.min.z;
  // one wheel already (narrow both ways): as it is
  if (spanX < 0.6 && spanZ < 1.2) return [g];
  const buckets = new Map();
  for (let t = 0; t < pos.count; t += 3) {
    let x = 0;
    let z = 0;
    for (let k = 0; k < 3; k++) {
      x += pos.getX(t + k);
      z += pos.getZ(t + k);
    }
    const key = `${x / 3 < c.x ? 0 : 1}${spanZ > 1.2 ? (z / 3 < c.z ? 0 : 1) : 0}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(t);
  }
  const out = [];
  for (const tris of buckets.values()) {
    const ng = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(src.attributes)) {
      const n = attr.itemSize;
      const arr = new attr.array.constructor(tris.length * 3 * n);
      tris.forEach((t, i) => {
        for (let k = 0; k < 3; k++) for (let j = 0; j < n; j++) arr[(i * 3 + k) * n + j] = attr.array[(t + k) * n + j];
      });
      ng.setAttribute(name, new THREE.BufferAttribute(arr, n, attr.normalized));
    }
    out.push(ng);
  }
  return out;
}

/* ------------------------------------------------------------------ materials */

/**
 * The paint, repainted: the model's own colour texture (or colour) kept for
 * its shading and details, its hue replaced by the new paint — so panel
 * lines, badges' recesses and grime stay. Clearcoat for the shine.
 */
function paintMaterial(src, hex, k) {
  const m = new THREE.MeshPhysicalMaterial({
    map: src.map ?? null,
    color: '#ffffff',
    roughness: 0.38,
    metalness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
    normalMap: src.normalMap ?? null
  });
  const paint = new THREE.Color(hex);
  const base = src.color?.clone() ?? new THREE.Color(1, 1, 1);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPaint = { value: paint };
    sh.uniforms.uBase = { value: base };
    sh.uniforms.uRef = { value: src.userData?.paintRef ?? 0.75 };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPaint;\nuniform vec3 uBase;\nuniform float uRef;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 src = diffuseColor.rgb * uBase;
          float l = dot(src, vec3(0.2126, 0.7152, 0.0722));
          // the model's light and shade over our paint (its brightest paint ≈ uRef), dark trims stay dark
          float k = clamp(l / uRef, 0.0, 1.25);
          diffuseColor.rgb = uPaint * k;
        }`);
  };
  m.customProgramCacheKey = () => 'fleet-paint';
  m.userData.paintHex = hex;
  void k;
  return m;
}

let glassMat = null;
function glass() {
  return (glassMat ??= new THREE.MeshPhysicalMaterial({ color: '#0e1418', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.62, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false }));
}

/** The model's own materials, made physically lit (glTF's are already standard: a little env light). */
function own(mat) {
  if (!mat) return new THREE.MeshStandardMaterial({ color: '#777' });
  if (!mat.userData.fleet) {
    mat.userData.fleet = true;
    mat.envMapIntensity = 0.8;
    if (mat.map) mat.map.anisotropy = 8;
  }
  return mat;
}

/** How bright the model's paint is where it's brightest (so a repaint keeps its shading): from the texture, once. */
function paintRef(mat) {
  if (mat.userData.paintRef != null) return mat.userData.paintRef;
  let ref = 0.75;
  const img = mat.map?.image;
  if (img && img.width) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 48, 48);
      const d = g.getImageData(0, 0, 48, 48).data;
      const ls = [];
      for (let i = 0; i < d.length; i += 4) {
        // sRGB → linear luminance
        const lin = (v) => Math.pow(v / 255, 2.2);
        ls.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
      }
      ls.sort((a, b) => a - b);
      ref = Math.max(0.05, ls[Math.floor(ls.length * 0.8)]);
    } catch {
      /* a texture we can't read: the default */
    }
  } else if (mat.color) ref = Math.max(0.05, 0.2126 * mat.color.r + 0.7152 * mat.color.g + 0.0722 * mat.color.b);
  mat.userData.paintRef = ref;
  return ref;
}

/** Signs of our own: a taxi's roof light, a bus's route board. */
function signTexture(text, fg, bg, w = 256, h = 64) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `900 ${Math.round(h * 0.62)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lampMats = {};
const lampGeo = {};

/* ------------------------------------------------------------------ a vehicle */

/** A vehicle of a kind, in a paint (a taxi or bus picks its own); null if that model isn't loaded. */
export function makeFleetVehicle(kind, color = null) {
  const P = ready[kind];
  if (!P) return null;
  const k = P.k;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const hex = color ?? pick(k.taxi ? TAXI : k.town ? TOWN : k.bus ? ROUTE : PAINTS);
  const group = new THREE.Group();
  // near: the model itself; far: its reduced copy (two draws)
  const body = new THREE.Group();
  const far = new THREE.Group();
  far.visible = false;
  group.add(body, far);
  for (const [part, g] of Object.entries(P.far)) {
    const mesh = new THREE.Mesh(g, farMaterial(part === 'paint' ? hex : null));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    far.add(mesh);
  }
  const add = (g, m, parent = body) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = m !== glassMat;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const key = (m) => `${m.uuid}|${hex}`;
  for (const p of P.parts.paint) {
    let m = P.mats.get(key(p.mat));
    if (!m) {
      paintRef(p.mat);
      m = paintMaterial(p.mat, hex, k);
      P.mats.set(key(p.mat), m);
    }
    add(p.g, m);
  }
  for (const p of P.parts.glass) add(p.g, glass());
  for (const p of P.parts.other) {
    // A bus's livery: its red and yellow bands into the route's colour.
    if (k.bus && p.mat?.color && isLivery(p.mat)) {
      const kk = `${p.mat.uuid}|${hex}`;
      let m = P.mats.get(kk);
      if (!m) {
        m = p.mat.clone();
        m.color = new THREE.Color(hex);
        P.mats.set(kk, m);
      }
      add(p.g, m);
    } else add(p.g, own(p.mat));
  }
  const wheels = [];
  for (const w of P.wheels) {
    const holder = new THREE.Group();
    holder.position.copy(w.at);
    // (the bus's hubs come sky blue: a plain steel grey instead)
    for (const p of w.list) add(p.g, k.bus ? (lampMats.busHub ??= new THREE.MeshStandardMaterial({ map: p.mat?.map ?? null, color: '#8d939a', roughness: 0.45, metalness: 0.6 })) : own(p.mat), holder);
    body.add(holder);
    wheels.push(holder);
  }
  const { length: L, width: W, height: H } = P.size;
  // Our own lamps, at the model's corners: lit only when on.
  const lamp = (name, color) => (lampMats[name] ??= new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false }));
  const head = lamp('head', '#fff4d6');
  const tail = lamp('tail', '#ff2318');
  const brake = lamp('brake', '#ff3a26');
  const amber = lamp('amber', '#ffae2a');
  const g = (w, h) => (lampGeo[`${w}|${h}`] ??= new THREE.PlaneGeometry(w, h));
  const ly = k.bus ? 0.85 : Math.min(0.85, H * 0.45);
  const hw = W / 2 - (k.bus ? 0.25 : 0.32);
  const lamps = { head: [], tail: [], brake: [], left: [], right: [] };
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(g(k.bus ? 0.3 : 0.26, 0.1), head);
    hl.position.set(s * hw, ly, P.front - 0.03);
    hl.rotation.y = Math.PI;
    const tl = new THREE.Mesh(g(0.24, 0.1), tail);
    tl.position.set(s * hw, ly + (k.bus ? 0.2 : 0.08), P.back + 0.03);
    const bl = new THREE.Mesh(g(0.26, 0.12), brake);
    bl.position.copy(tl.position).z += 0.005;
    lamps.head.push(hl);
    lamps.tail.push(tl);
    lamps.brake.push(bl);
    for (const [z, rot] of [[P.front - 0.035, Math.PI], [P.back + 0.035, 0]]) {
      const ind = new THREE.Mesh(g(0.1, 0.07), amber);
      ind.position.set(s * (W / 2 - 0.12), ly, z);
      ind.rotation.y = rot;
      lamps[s < 0 ? 'left' : 'right'].push(ind);
    }
  }
  for (const list of Object.values(lamps)) for (const l of list) {
    l.visible = false;
    l.renderOrder = 2;
    body.add(l);
  }
  // A taxi's roof sign; a bus's route board.
  if (k.taxi) {
    const sign = new THREE.Mesh(lampGeo.taxi ??= new THREE.BoxGeometry(0.55, 0.17, 0.22), lampMats.taxi ??= new THREE.MeshStandardMaterial({ map: signTexture('택시 TAXI', '#1a1a1a', '#ffd23a'), emissive: '#ffd23a', emissiveIntensity: 0.15 }));
    sign.position.set(0, H + 0.08, 0.15);
    sign.castShadow = true;
    group.add(sign);
  }
  if (k.bus) {
    const n = k.town ? '마을 05' : hex === '#3aa65a' ? '1712' : '470';
    const board = new THREE.Mesh(g(1.5, 0.3), lampMats[`bus${n}`] ??= new THREE.MeshBasicMaterial({ map: signTexture(n, '#ffb02e', '#121212'), toneMapped: false }));
    board.position.set(0, H * 0.86, P.front - 0.04);
    board.rotation.y = Math.PI;
    group.add(board);
  }
  let spun = 0;
  let near = true;
  return {
    group,
    kind,
    model: kind,
    size: { length: L, width: W, height: H, wheel: P.size.wheel },
    axles: P.axles,
    wheels(roll) {
      spun = (spun + roll) % (Math.PI * 2);
      for (const w of wheels) w.rotation.x = -spun;
    },
    /** Near the full model (lamps and all), far its reduced copy. */
    near(on) {
      if (on === near) return;
      near = on;
      body.visible = on;
      far.visible = !on;
    },
    lights(night, braking) {
      const lit = night > 0.35;
      for (const l of lamps.head) l.visible = lit && near;
      for (const l of lamps.tail) l.visible = lit && near && !braking;
      for (const l of lamps.brake) l.visible = braking && near;
    },
    indicate(side, on) {
      for (const s of ['left', 'right']) for (const l of lamps[s]) l.visible = near && on && (side === s || side === 'both');
    }
  };
}

/** Is this one of the bus's livery colours (red, orange, yellow)? */
function isLivery(mat) {
  const hsl = {};
  mat.color.getHSL(hsl);
  return hsl.s > 0.35 && (hsl.h < 0.17 || hsl.h > 0.93) && hsl.l > 0.15;
}

void _v;
