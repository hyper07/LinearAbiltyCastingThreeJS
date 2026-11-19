/**
 * Brindlewick's buildings, built from the kit: timber-framed houses on
 * stone plinths, the upper floor jettied out over the street, steep tiled
 * roofs that sag a little and curl at the eaves, chimneys, shuttered
 * windows lit warm from inside, flower boxes, doors with steps. The Gilded
 * Acorn inn (dormers, a porch, a hanging sign that swings) and the smithy
 * (an open forge under a lean-to, its coals glowing).
 */
import * as THREE from 'three';
import { Kit, tf } from './kit.js';
import { rng } from './noise.js';
import { BUILDINGS } from './map.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const PLASTER = ['#f1e4c8', '#ead3a6', '#f0d9c6', '#e7dcc9', '#f3e8d0'];
const TIMBER = ['#5c3c24', '#4a2f1d', '#6a4a30', '#553826'];
const SHUTTER = ['#2f5d6e', '#7a2e2a', '#3c5e34', '#6a5230', '#40456e'];
const ROOFS = ['roofRed', 'roofSlate', 'roofShingle'];

/** Materials for the buildings (shared by the gate and the props too). */
export async function buildingMaterials(bank) {
  const [stone, roofRed, roofSlate, roofShingle, wood, planks] = await Promise.all([
    bank.ambient('Bricks106A', { fallback: '#8a7a68' }),
    bank.ambient('RoofingTiles012B', { fallback: '#8a3a2a' }),
    bank.ambient('RoofingTiles013A', { fallback: '#3a3a48' }),
    bank.ambient('RoofingTiles014B', { fallback: '#6a4a32' }),
    bank.ambient('WoodFloor043', { fallback: '#5a3a22' }),
    bank.ambient('Planks037A', { fallback: '#6a4a30' })
  ]);
  const plaster = bank.plaster(3);
  const std = (set, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: set.map,
      normalMap: set.normalMap,
      roughnessMap: set.arm,
      aoMap: set.arm,
      aoMapIntensity: 0.8,
      vertexColors: true,
      ...extra
    });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xffa24a, emissiveIntensity: 2.2, roughness: 0.25, metalness: 0, vertexColors: true });
  // Vertex colour scales the glow, so each window is lit a little differently.
  glass.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif');
  };
  const mats = {
    stone: std(stone, { roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ map: plaster.map, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.93, vertexColors: true }),
    timber: std(wood, { roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) }),
    planks: std(planks, { roughness: 1 }),
    roofRed: std(roofRed, { roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) }),
    roofSlate: std(roofSlate, { roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) }),
    roofShingle: std(roofShingle, { roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) }),
    under: std(wood, { roughness: 1, color: 0x8a7a6a }),
    glass,
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.55, metalness: 0.85, vertexColors: true }),
    flowers: new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true }),
    leafy: new THREE.MeshStandardMaterial({ color: 0x3a5a22, roughness: 0.85, vertexColors: true }),
    coals: new THREE.MeshStandardMaterial({ color: 0x1a0a05, emissive: 0xff4a10, emissiveIntensity: 3, roughness: 0.9, vertexColors: true }),
    cloth: new THREE.MeshStandardMaterial({ roughness: 0.95, vertexColors: true, side: THREE.DoubleSide })
  };
  mats.glass.userData.noShadow = true;
  return mats;
}

/* ------------------------------------------------------------------ a house */

/** A window in a wall: frame, panes, sill, shutters, maybe a flower box. Local: centre (x, y), wall plane z=0 facing +z. */
function windowAt(kit, M, x, y, w, h, look, r) {
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  const glow = new THREE.Color().setScalar(0.55 + r() * 0.7);
  kit.box('glass', w - 0.06, h - 0.06, 0.05, L(x, y - h / 2 + 0.03, 0.02), glow);
  const t = look.timber;
  kit.box('timber', w + 0.16, 0.12, 0.16, L(x, y + h / 2, 0.06), t, 0.6);
  kit.box('timber', w + 0.26, 0.1, 0.26, L(x, y - h / 2 - 0.1, 0.1), t, 0.6);
  kit.box('timber', 0.12, h, 0.16, L(x - w / 2 - 0.02, y - h / 2, 0.06), t, 0.6);
  kit.box('timber', 0.12, h, 0.16, L(x + w / 2 + 0.02, y - h / 2, 0.06), t, 0.6);
  // Mullions: a cross.
  kit.box('timber', 0.05, h - 0.06, 0.08, L(x, y - h / 2 + 0.03, 0.06), t, 0.4);
  kit.box('timber', w - 0.06, 0.05, 0.08, L(x, y - 0.02, 0.06), t, 0.4);
  // Shutters, open against the wall.
  if (look.shutters) {
    for (const s of [-1, 1]) kit.box('planks', w * 0.5, h, 0.05, L(x + s * (w * 0.75 + 0.1), y - h / 2, 0.05, 0, s * 0.18, 0), look.shutter, 0.8);
  }
  if (r() < look.flowerBoxes) {
    kit.box('planks', w + 0.1, 0.24, 0.3, L(x, y - h / 2 - 0.4, 0.2), t, 0.6);
    for (let k = 0; k < 9; k++) {
      const c = new THREE.Color(r() < 0.6 ? '#c21f1a' : r() < 0.5 ? '#e8a020' : '#d84a7a').multiplyScalar(0.8 + r() * 0.4);
      const g = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 0);
      kit.add('flowers', g, L(x - w / 2 + 0.05 + (k / 8) * (w - 0.1), y - h / 2 - 0.12 + r() * 0.1, 0.22 + (r() - 0.5) * 0.12), c);
      const lf = new THREE.IcosahedronGeometry(0.11, 0);
      kit.add('leafy', lf, L(x - w / 2 + 0.1 + (k / 8) * (w - 0.2), y - h / 2 - 0.18, 0.2), new THREE.Color().setScalar(0.8 + r() * 0.3));
    }
  }
}

/** One wall's timber frame and openings. M: wall frame (x along the wall, z out). */
function wall(kit, M, len, y0, h, look, r, { door = false, windows = 0.6, braces = true } = {}) {
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  const t = look.timber;
  const bays = Math.max(1, Math.round(len / 1.75));
  const bw = len / bays;
  const s = 0.2;
  const out = 0.04;
  // Posts and rails.
  for (let i = 0; i <= bays; i++) kit.box('timber', s, h, s, L(-len / 2 + i * bw, y0, out), t, 0.7);
  kit.box('timber', len + s, s, s, L(0, y0, out), t, 0.7);
  kit.box('timber', len + s, s, s, L(0, y0 + h - s, out), t, 0.7);
  const doorBay = door ? Math.floor(bays / 2) : -1;
  for (let i = 0; i < bays; i++) {
    const cx = -len / 2 + (i + 0.5) * bw;
    if (i === doorBay) {
      kit.box('planks', bw * 0.62, 2.15, 0.08, L(cx, y0 + 0.02, 0.01), look.door, 0.8);
      kit.box('timber', bw * 0.62 + 0.3, 0.22, 0.2, L(cx, y0 + 2.17, out + 0.02), t, 0.7);
      for (let k = 0; k < 3; k++) kit.box('iron', bw * 0.5, 0.05, 0.03, L(cx, y0 + 0.4 + k * 0.7, 0.07), '#ffffff');
      kit.add('iron', new THREE.TorusGeometry(0.07, 0.015, 6, 12), L(cx + bw * 0.2, y0 + 1.05, 0.11), '#ffffff');
      continue;
    }
    const hasWindow = r() < windows && bw > 1.2;
    if (hasWindow) {
      windowAt(kit, M, cx, y0 + Math.min(h - 0.95, 1.72), Math.min(1.0, bw * 0.6), Math.min(1.15, h * 0.42), look, r);
      // A rail under the window.
      kit.box('timber', bw, s * 0.8, s * 0.8, L(cx, y0 + 0.75, out), t, 0.7);
    } else if (braces) {
      // A brace across the bay, the classic diagonal.
      const dir = (i + (look.braceFlip ? 1 : 0)) % 2 ? 1 : -1;
      kit.beam('timber', V(cx - (bw / 2) * dir, y0 + 0.12, out), V(cx + (bw / 2) * dir, y0 + h - 0.12, out), s * 0.85, t, 0.7, M);
      kit.box('timber', bw, s * 0.8, s * 0.8, L(cx, y0 + h * 0.48, out), t, 0.7);
    } else {
      kit.box('timber', bw, s * 0.8, s * 0.8, L(cx, y0 + h * 0.48, out), t, 0.7);
    }
  }
}

/**
 * A timber-framed house into `kit`. spec: { x, z, w, d, floors, face, seed } at ground level y.
 * Returns where its chimney, door and lamp are (world), for smoke and lights.
 */
export function addHouse(kit, spec, y, opts = {}) {
  const r = rng(spec.seed * 991 + 7);
  const look = {
    plaster: PLASTER[spec.seed % PLASTER.length],
    timber: TIMBER[(spec.seed >> 1) % TIMBER.length],
    shutter: SHUTTER[spec.seed % SHUTTER.length],
    door: ['#6a4428', '#5a3420', '#7a5a3a'][spec.seed % 3],
    roof: opts.roof ?? ROOFS[spec.seed % ROOFS.length],
    shutters: r() < 0.75,
    flowerBoxes: 0.55,
    braceFlip: r() < 0.5
  };
  const M = tf(spec.x, y, spec.z, 0, spec.face, 0);
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  const { w, d } = spec;
  const plinth = 0.62;
  kit.box('stone', w + 0.36, plinth + 0.5, d + 0.36, L(0, -0.5, 0), '#ffffff', 1.2);
  // Ground floor.
  const h1 = 2.95;
  kit.box('plaster', w, h1, d, L(0, plinth, 0), look.plaster, 2.5);
  const faces = (fw, fd, y0, h, isGround) => {
    // front (+z), back (−z), right (+x), left (−x)
    wall(kit, L(0, 0, fd / 2), fw, y0, h, look, r, { door: isGround, windows: isGround ? 0.7 : 0.75 });
    wall(kit, L(0, 0, -fd / 2, 0, Math.PI, 0), fw, y0, h, look, r, { windows: 0.45 });
    wall(kit, L(fw / 2, 0, 0, 0, Math.PI / 2, 0), fd, y0, h, look, r, { windows: 0.5 });
    wall(kit, L(-fw / 2, 0, 0, 0, -Math.PI / 2, 0), fd, y0, h, look, r, { windows: 0.5 });
  };
  faces(w, d, plinth, h1, true);
  let top = plinth + h1;
  let dd = d;
  if (spec.floors >= 2) {
    const j = 0.42;
    // The floor beams' ends stick out under the jetty.
    for (let i = 0; i <= Math.round(w / 0.8); i++) {
      const x = -w / 2 + i * (w / Math.round(w / 0.8));
      for (const s of [1, -1]) kit.box('timber', 0.18, 0.2, j + 0.2, L(x, top - 0.02, s * (d / 2 + j / 2 - 0.05)), look.timber, 0.6);
    }
    kit.box('timber', w + 0.1, 0.24, d + 2 * j + 0.1, L(0, top + 0.16, 0), look.timber, 0.8);
    const h2 = 2.65;
    dd = d + 2 * j;
    kit.box('plaster', w, h2, dd, L(0, top + 0.4, 0), look.plaster, 2.5);
    faces(w, dd, top + 0.4, h2, false);
    top += 0.4 + h2;
  }
  // The roof: two slabs meeting at a ridge along the width.
  const pitch = 0.9 + r() * 0.12;
  const over = 0.65;
  const D = dd / 2 + over;
  const rise = D * Math.tan(pitch);
  const slopeLen = D / Math.cos(pitch);
  const ridgeY = top + rise - over * Math.tan(pitch) + 0.05;
  const rw = w + 1.1;
  const roofCol = new THREE.Color('#ffffff').multiplyScalar(0.85 + r() * 0.25);
  for (const s of [0, Math.PI]) kit.slab(look.roof, rw, slopeLen, 0.2, pitch, L(0, ridgeY, 0, 0, s, 0), roofCol, 1.6, { sag: 0.1 + r() * 0.1, curl: 0.22, under: 'under' });
  // Gables, framed.
  const gh = (dd / 2) * Math.tan(pitch);
  for (const s of [1, -1]) {
    const G = L((s * w) / 2, top, 0, 0, (s * Math.PI) / 2, 0);
    kit.gable('plaster', dd, gh, 0.2, G.clone().multiply(tf(0, 0, -0.08)), look.plaster, 2.5);
    kit.beam('timber', V(0, 0, 0.06), V(0, gh - 0.1, 0.06), 0.2, look.timber, 0.7, G);
    kit.beam('timber', V(-dd / 2, 0.1, 0.06), V(dd / 2, 0.1, 0.06), 0.2, look.timber, 0.7, G);
    kit.beam('timber', V(-dd / 4, 0.1, 0.06), V(0, gh * 0.55, 0.06), 0.16, look.timber, 0.7, G);
    kit.beam('timber', V(dd / 4, 0.1, 0.06), V(0, gh * 0.55, 0.06), 0.16, look.timber, 0.7, G);
    // Barge boards along the roof edge.
    kit.beam('timber', V(-D, gh - D * Math.tan(pitch) + 0.15, 0.62), V(0, gh + 0.25, 0.62), 0.16, look.timber, 0.7, G);
    kit.beam('timber', V(D, gh - D * Math.tan(pitch) + 0.15, 0.62), V(0, gh + 0.25, 0.62), 0.16, look.timber, 0.7, G);
    if (gh > 1.6) windowAt(kit, G.clone().multiply(tf(0, 0, 0.04)), 0, gh * 0.42 + 0.5, 0.6, 0.7, { ...look, shutters: false, flowerBoxes: 0 }, r);
  }
  // Ridge cap.
  kit.cyl('timber', 0.13, 0.13, rw, L(-rw / 2, ridgeY + 0.22, 0, 0, 0, -Math.PI / 2), look.timber, 8, 0.7);
  // Chimney.
  const cx = (w / 2 - 0.9) * (r() < 0.5 ? 1 : -1);
  const cz = -D * 0.35;
  const chH = ridgeY + 1.8 - plinth;
  kit.box('stone', 0.95, chH, 0.95, L(cx, plinth, cz), '#d8d0c8', 1.1);
  kit.box('stone', 1.15, 0.2, 1.15, L(cx, plinth + chH, cz), '#c8c0b8', 1.1);
  kit.box('stone', 0.5, 0.25, 0.5, L(cx, plinth + chH + 0.2, cz), '#a09890', 1.1);
  // Steps up to the door.
  kit.box('stone', 1.6, 0.36, 0.7, L(0, -0.05, d / 2 + 0.5), '#e0d8d0', 1.0);
  kit.box('stone', 1.4, 0.18, 0.5, L(0, -0.05, d / 2 + 1.0), '#e0d8d0', 1.0);
  const toW = (px, py, pz) => V(px, py, pz).applyMatrix4(M);
  return {
    chimney: toW(cx, plinth + chH + 0.5, cz),
    door: toW(0, 0, d / 2 + 1.4),
    lamp: toW(w * 0.18 + 0.8, plinth + 2.3, d / 2 + 0.55),
    top: ridgeY
  };
}

/** The Gilded Acorn: a big house with dormers, a porch and a hanging sign. */
export function addInn(kit, spec, y) {
  const info = addHouse(kit, { ...spec, seed: 11 }, y, { roof: 'roofShingle' });
  const M = tf(spec.x, y, spec.z, 0, spec.face, 0);
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  const { w, d } = spec;
  const t = '#4a2f1d';
  // A porch along the front: posts, a beam, a lean-to roof.
  const pz = d / 2 + 2.2;
  for (const x of [-w / 2 + 0.6, -w / 6, w / 6, w / 2 - 0.6]) {
    kit.box('timber', 0.28, 2.9, 0.28, L(x, 0.3, pz), t, 0.7);
    kit.beam('timber', V(x, 2.6, pz), V(x, 3.2, pz - 0.7), 0.18, t, 0.7, M);
  }
  kit.box('timber', w, 0.3, 0.32, L(0, 3.1, pz), t, 0.7);
  kit.slab('roofShingle', w + 0.6, 2.9, 0.16, 0.42, L(0, 3.95, d / 2 + 0.02), '#e8e0d8', 1.4, { sag: 0.06, curl: 0.08, under: 'under' });
  kit.box('planks', w + 0.4, 0.22, 2.9, L(0, 0.08, d / 2 + 1.45), '#b0a090', 1);
  // The sign's bracket, at the porch's corner.
  const sx = w / 2 + 0.2;
  kit.box('iron', 0.08, 0.08, 1.6, L(sx, 3.6, pz + 0.4), '#ffffff');
  kit.beam('iron', V(sx, 3.0, pz - 0.3), V(sx, 3.6, pz + 0.4), 0.06, '#ffffff', 1, M);
  // Barrels and a bench out front.
  const toW = (px, py, pz2) => V(px, py, pz2).applyMatrix4(M);
  return { ...info, sign: { pos: toW(sx, 3.55, pz + 0.9), face: spec.face }, porch: toW(0, 0, pz + 1.6), tables: [toW(-w / 2 - 1.5, 0, pz + 3.5), toW(-w / 2 + 2.5, 0, pz + 4.5)] };
}

/** The smithy: a house and a lean-to forge with glowing coals and an anvil. */
export function addSmithy(kit, spec, y) {
  const info = addHouse(kit, spec, y, { roof: 'roofSlate' });
  const M = tf(spec.x, y, spec.z, 0, spec.face, 0);
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  const { w, d } = spec;
  const ox = w / 2 + 2.4;
  const t = '#3a2618';
  for (const [px, pz] of [[ox + 2, d / 2], [ox + 2, -d / 2 + 0.6], [ox - 2.2, d / 2]]) kit.box('timber', 0.3, 3.3, 0.3, L(px, 0, pz), t, 0.7);
  kit.box('timber', 4.6, 0.26, 0.3, L(ox, 3.1, d / 2), t, 0.7);
  kit.slab('roofSlate', d + 0.8, 5.0, 0.15, 0.36, L(ox - 2.6, 4.6, 0, 0, Math.PI / 2, 0), '#d0d0d8', 1.4, { sag: 0.05, curl: 0.05, under: 'under' });
  // Forge: a stone hearth with coals, a hood.
  kit.box('stone', 1.8, 0.95, 1.4, L(ox - 0.6, 0, -d / 2 + 1.2), '#c8b8a8', 1);
  kit.box('coals', 1.3, 0.12, 0.9, L(ox - 0.6, 0.92, -d / 2 + 1.2), '#ffffff');
  kit.box('stone', 1.4, 2.6, 0.9, L(ox - 0.6, 0.95, -d / 2 + 0.6), '#a89888', 1);
  // Anvil on a stump.
  kit.cyl('timber', 0.35, 0.32, 0.55, L(ox + 0.8, 0, 0.6), '#8a6a4a', 10, 0.7);
  kit.box('iron', 0.7, 0.22, 0.28, L(ox + 0.8, 0.55, 0.6), '#ffffff');
  kit.box('iron', 0.3, 0.18, 0.2, L(ox + 0.8, 0.77, 0.6), '#ffffff');
  kit.add('iron', new THREE.ConeGeometry(0.12, 0.35, 8), L(ox + 1.25, 0.86, 0.6, 0, 0, -Math.PI / 2), '#ffffff');
  // Water trough.
  kit.box('planks', 1.6, 0.6, 0.6, L(ox + 1.2, 0, -0.9), '#8a7a6a', 0.8);
  const toW = (px, py, pz) => V(px, py, pz).applyMatrix4(M);
  return { ...info, forge: toW(ox - 0.6, 1.2, -d / 2 + 1.2), anvil: toW(ox + 0.8, 0.9, 0.6), smithSpot: toW(ox + 0.8, 0, 1.45) };
}

/** Every building on the map, into one kit; returns each one's points of interest by id. */
export function buildVillage(kit, heightAt) {
  const out = {};
  for (const b of BUILDINGS) {
    const y = heightAt(b.x, b.z) + 0.05;
    if (b.kind === 'inn') out[b.id] = addInn(kit, b, y);
    else if (b.kind === 'smithy') out[b.id] = addSmithy(kit, b, y);
    else out[b.id] = addHouse(kit, b, y);
  }
  return out;
}

/** The inn's sign: a painted board on two rings, swinging in the wind. */
export function innSign(bank, at) {
  const tex = bank.sign({ text: 'The Gilded Acorn', emblem: 'acorn', w: 512, h: 320 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.07), [
    new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1 })
  ]);
  board.position.y = -0.62;
  board.castShadow = true;
  const pivot = new THREE.Group();
  pivot.position.copy(at.pos);
  pivot.rotation.y = at.face + Math.PI / 2;
  pivot.add(board);
  for (const s of [-0.5, 0.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 10), new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 }));
    ring.position.set(s, -0.08, 0);
    pivot.add(ring);
  }
  return {
    object: pivot,
    update(t) {
      board.parent.rotation.z = 0;
      pivot.rotation.x = Math.sin(t * 1.3) * 0.06 + Math.sin(t * 0.37) * 0.04;
    }
  };
}
