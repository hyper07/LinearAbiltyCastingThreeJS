/**
 * Lanternrest, built in code: timber-framed houses on stone plinths with
 * lime-plaster panels, board wainscots and lattice screens that glow warm
 * from inside; curved roofs of real tile rows (half-round channels running
 * from a heavy ridge down to up-turned eaves) in fired clay, blue slate or
 * thatch; skirt roofs between storeys; hanging paper lanterns, strings of
 * them across the lane; the gate — two great posts, a slatted transom, a
 * tiled roof, plank doors studded with iron swung wide, two big lanterns;
 * the walls with their little tiled caps; market stalls, the well, banners,
 * lantern posts, the Kith Garden with its fence, and the field of sunheads
 * outside the gate. All original — East-Asian in flavour, nobody's town.
 *
 * Everything goes into a few material buckets (Gloamreach's Kit) and is
 * merged, so the whole village draws in a handful of calls.
 */
import * as THREE from 'three';
import { Kit, tf } from '../gloamreach/kit.js';
import { shared } from '../gloamreach/materials.js';
import { rng } from '../gloamreach/noise.js';
import { HOUSES, STALLS, GATE, VILLAGE, LANE, PLAZA, WELL, GARDEN, CROSS } from './map.js';
import { groundAt } from './heights.js';
import { painterly } from './paint.js';
import { plasterTexture, woodTexture, stoneTexture, clothTexture, paperTexture, tileTexture, signTexture } from './painted.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const M = (...a) => tf(...a);
const mul = (a, b) => a.clone().multiply(b);

export const ROOF_COLORS = { clay: ['#c4703c', '#d08848', '#b8643a'], gold: ['#c99a4c', '#d6a858', '#b88a44'], slate: ['#5a6276', '#6a7286', '#4e5668'], thatch: ['#b39a5c', '#c4aa68', '#a08a50'] };

/* ------------------------------------------------------------------ materials */

/** Paper that glows: emissive tinted by vertex colour, its strength shared (lit at dusk). */
export const glow = { value: 1 };
function glowMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.9, emissive: new THREE.Color('#ffb860'), emissiveIntensity: 1, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb * uGlow;');
  };
  m.customProgramCacheKey = () => 'kith-glow';
  m.userData.noShadow = true;
  return m;
}

/** Cloth that waves (banners, the stalls' awnings): pushed along its normal, more away from its pole (uv.x). */
function clothMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float flap = sin(uTime * 2.3 + wp.x * 0.7 + wp.z * 0.5 + uv.y * 2.5) * 0.6 + sin(uTime * 4.1 + uv.y * 6.0) * 0.4;
        transformed += normal * flap * uv.x * 0.11;
      }`
    );
  };
  m.customProgramCacheKey = () => 'kith-cloth';
  return painterly(m, { wrap: 0.6, rim: 0.2, trans: 0.4 });
}

export function villageMaterials() {
  const plaster = plasterTexture(1);
  const wood = woodTexture(2);
  const stone = stoneTexture(3);
  const cloth = clothTexture(4);
  const paper = paperTexture(5, 7);
  const tile = tileTexture(6);
  const std = (map, rough = 0.85, o = {}) => painterly(new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough, ...o }), { wrap: 0.5, rim: 0.3 });
  return {
    plaster: std(plaster, 0.92),
    timber: std(wood, 0.8),
    wood: std(wood, 0.82),
    stone: std(stone, 0.9),
    tile: std(tile, 0.62),
    roof: std(tile, 0.75),
    iron: painterly(new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.45, metalness: 0.6, vertexColors: true }), { rim: 0.4 }),
    paint: std(null, 0.6),
    paper: glowMaterial(paper),
    screen: glowMaterial(paper),
    cloth: clothMaterial(cloth),
    clothFlat: std(cloth, 0.9, { side: THREE.DoubleSide }),
    goods: std(null, 0.55),
    water: new THREE.MeshStandardMaterial({ color: 0x24363a, roughness: 0.1, metalness: 0.2 })
  };
}

/* ------------------------------------------------------------------ roofs */

/**
 * A curved tile roof with its ridge along x. `W`, `D`: half-length along the
 * ridge and the run from ridge to eave; `rise` the ridge's height over the
 * eave; `sides` [1, −1] for both slopes (or [1] for a lean-to off a wall).
 * Steep at the ridge, flattening to the eave, its corners swept up.
 */
export function addRoof(kit, base, { W, D, rise, sides = [1, -1], curl = 0.38, color = 'clay', tileSp = 0.3, tileR = 0.075, segV = 10, ridge = true, seed = 1, under = '#6a4a38', fascia = '#3e2a20' }) {
  const r = rng(seed);
  const pal = ROOF_COLORS[color] ?? ROOF_COLORS.clay;
  const prof = (v) => 0.3 * v + 0.7 * (1 - (1 - v) ** 2);
  const Y = (u, v) => rise * (1 - prof(v)) + curl * Math.abs(u) ** 4 * v * v;
  const thatch = color === 'thatch';
  for (const side of sides) {
    const P = (u, v) => V(u * W, Y(u, v), side * v * D);
    // The sheet under the tiles (and its underside, seen from below the eaves).
    const segU = 16;
    const top = new THREE.BufferGeometry();
    const pos = [];
    const uv = [];
    const idx = [];
    for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
      const u = (i / segU) * 2 - 1;
      const v = j / segV;
      const p = P(u, v);
      pos.push(p.x, p.y, p.z);
      uv.push(p.x / 2, v * D / 2);
    }
    for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + 1;
      const c = a + segU + 1;
      const d = c + 1;
      if (side > 0) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
    top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    top.setIndex(idx);
    top.computeVertexNormals();
    const bottom = top.clone();
    bottom.translate(0, -0.14, 0);
    const bi = bottom.index.array;
    for (let k = 0; k < bi.length; k += 3) [bi[k], bi[k + 2]] = [bi[k + 2], bi[k]];
    bottom.computeVertexNormals();
    kit.add('roof', top, base.clone(), thatch ? pal[0] : '#3a2a24');
    kit.add('wood', bottom, base.clone(), under);
    // The fascia board along the eave.
    const e0 = P(-1, 1);
    const e1 = P(1, 1);
    const fasc = new THREE.BufferGeometry();
    const fp = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const p = P((i / n) * 2 - 1, 1);
      fp.push(p.x, p.y + 0.02, p.z, p.x, p.y - 0.2, p.z);
    }
    const fi = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      if (side > 0) fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else fi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    fasc.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    fasc.setIndex(fi);
    fasc.computeVertexNormals();
    kit.add('timber', fasc, base.clone(), fascia);
    void e0, e1;
    if (thatch) continue;
    // The tile channels: half-round strips from the ridge to the eave, each a slightly different fired colour.
    const strips = Math.floor((2 * W) / tileSp);
    for (let k = 0; k < strips; k++) {
      const x = -W + tileSp * (k + 0.5);
      const u = x / W;
      const g = new THREE.BufferGeometry();
      const sp = [];
      const si = [];
      const ring = 5;
      for (let j = 0; j <= segV; j++) {
        const v = 0.02 + (j / segV) * 0.98;
        const p = P(u, v);
        const dv = P(u, Math.min(1, v + 0.01)).sub(P(u, Math.max(0, v - 0.01))).normalize();
        const du = V(1, 0, 0);
        const nrm = V().crossVectors(dv, du).normalize();
        if (nrm.y < 0) nrm.negate();
        const b = V().crossVectors(dv, nrm).normalize();
        for (let q = 0; q < ring; q++) {
          const a = (q / (ring - 1)) * Math.PI;
          const o = b.clone().multiplyScalar(Math.cos(a) * tileR).addScaledVector(nrm, Math.sin(a) * tileR + 0.02);
          sp.push(p.x + o.x, p.y + o.y, p.z + o.z);
        }
      }
      for (let j = 0; j < segV; j++) for (let q = 0; q < ring - 1; q++) {
        const a = j * ring + q;
        const c = a + ring;
        si.push(a, c, a + 1, a + 1, c, c + 1);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      g.setIndex(si);
      g.computeVertexNormals();
      // Make sure the strip's faces point up/out.
      const nn = g.attributes.normal;
      let up = 0;
      for (let q = 0; q < nn.count; q++) up += nn.getY(q);
      if (up < 0) {
        const ii = g.index.array;
        for (let q = 0; q < ii.length; q += 3) [ii[q], ii[q + 2]] = [ii[q + 2], ii[q]];
        g.computeVertexNormals();
      }
      const c = new THREE.Color(pal[Math.floor(r() * pal.length)]).multiplyScalar(0.9 + r() * 0.2);
      kit.add('tile', g, base.clone(), c);
      // A round end-tile at the eave.
      const pe = P(u, 1);
      const cap = new THREE.CircleGeometry(tileR * 1.25, 8);
      kit.add('tile', cap, mul(base, M(pe.x, pe.y + 0.04, pe.z + side * 0.01, 0, side > 0 ? 0 : Math.PI, 0)), c.clone().multiplyScalar(0.9));
    }
  }
  if (ridge && sides.length === 2) {
    // The ridge: a heavy rounded beam of tiles, a swept curl at each end.
    const len = W * 2 + 0.3;
    const rg = new THREE.CylinderGeometry(0.17, 0.17, len, 10, 1);
    rg.rotateZ(Math.PI / 2);
    rg.scale(1, 1.25, 1);
    kit.add('tile', rg, mul(base, M(0, rise + 0.1, 0)), new THREE.Color(pal[0]).multiplyScalar(0.72));
    for (const s of [-1, 1]) {
      const c = new THREE.CylinderGeometry(0.05, 0.2, 0.75, 8);
      kit.add('tile', c, mul(base, M(s * (W + 0.12), rise + 0.35 + curl * 0.2, 0, 0, 0, -s * 0.7)), new THREE.Color(pal[0]).multiplyScalar(0.62));
    }
  }
}

/* ------------------------------------------------------------------ small things */

/** A round paper lantern hanging from (0,0,0) down a cord of `drop` (local to `base`). */
export function addLantern(kit, base, { r = 0.26, drop = 0.4, color = '#fff2dc', tall = 1.25 } = {}) {
  kit.cyl('timber', 0.008, 0.008, drop, mul(base, M(0, -drop, 0)), '#2a2018', 4);
  const y = -drop - r * tall;
  const g = new THREE.SphereGeometry(r, 14, 10);
  g.scale(1, tall, 1);
  kit.add('paper', g, mul(base, M(0, y, 0)), color);
  kit.cyl('timber', r * 0.55, r * 0.55, 0.06, mul(base, M(0, y + r * tall - 0.03, 0)), '#2e2018', 10);
  kit.cyl('timber', r * 0.55, r * 0.55, 0.06, mul(base, M(0, y - r * tall - 0.03, 0)), '#2e2018', 10);
  kit.cyl('cloth', 0.01, 0.03, 0.18, mul(base, M(0, y - r * tall - 0.2, 0)), '#c83a2a', 5);
  return y;
}

/** A rope hanging between two points (a catenary), with lanterns along it. */
export function addLanternString(kit, a, b, { n = 5, sag = 0.7, colors = ['#e04a38', '#fff2dc'], r = 0.17 } = {}) {
  const pts = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(a.clone().lerp(b, t).add(V(0, -sag * 4 * t * (1 - t), 0)));
  }
  for (let i = 0; i < steps; i++) kit.beam('timber', pts[i], pts[i + 1], 0.02, '#3a2a20');
  for (let k = 0; k < n; k++) {
    const t = (k + 1) / (n + 1);
    const p = a.clone().lerp(b, t).add(V(0, -sag * 4 * t * (1 - t), 0));
    addLantern(kit, M(p.x, p.y, p.z), { r, drop: 0.12, color: colors[k % colors.length], tall: 1.3 });
  }
}

/** A lattice screen of `w`×`h` (local base frame at its bottom middle): a frame, bars, glowing paper behind. */
function addLattice(kit, base, w, h, { bars = 4, rows = 5, glowColor = '#ffe2b0', frame = '#4a3226' } = {}) {
  kit.box('screen', w - 0.06, h - 0.06, 0.02, mul(base, M(0, 0.03, -0.04)), glowColor);
  const t = 0.05;
  kit.box('timber', w, t, 0.07, base.clone(), frame);
  kit.box('timber', w, t, 0.07, mul(base, M(0, h - t, 0)), frame);
  for (const s of [-1, 1]) kit.box('timber', t, h, 0.07, mul(base, M((s * (w - t)) / 2, 0, 0)), frame);
  for (let i = 1; i < bars; i++) kit.box('timber', 0.025, h, 0.04, mul(base, M(-w / 2 + (w * i) / bars, 0, 0.01)), frame);
  for (let j = 1; j < rows; j++) kit.box('timber', w, 0.025, 0.04, mul(base, M(0, (h * j) / rows, 0.01)), frame);
}

/* ------------------------------------------------------------------ houses */

const WALL = 2.85;
const PLINTH = 0.45;

/**
 * One house: plinth, posts and beams, panels (plaster, lattice windows,
 * sliding doors), a skirt roof between storeys, the main roof, gable ends,
 * lanterns, and whatever its kind adds (a teahouse's banner, a shop's awning).
 */
export function addHouse(kit, h, colliders) {
  const r = rng(h.id.length * 131 + Math.round(h.x * 7));
  const y = groundAt(h.x, h.z);
  const base = M(h.x, y, h.z, 0, h.face, 0);
  const { w, d } = h;
  const floors = h.floors;
  const timber = h.timber ?? ['#4a3226', '#563a2a', '#3e2a22'][Math.floor(r() * 3)];
  const plaster = h.plaster ?? ['#efe6d6', '#f2e8d0', '#e8dcc6'][Math.floor(r() * 3)];
  const boards = ['#7a5a40', '#8a6848', '#6e5038'][Math.floor(r() * 3)];
  kit.box('stone', w + 0.5, PLINTH, d + 0.5, base.clone(), '#a8a094', 1);
  // Steps up to the front door.
  kit.box('stone', 1.8, PLINTH * 0.5, 0.5, mul(base, M(0, 0, d / 2 + 0.5)), '#a09888');
  const H = WALL * floors;
  const faces = [
    { len: w, pos: [0, d / 2], yaw: 0, front: true },
    { len: w, pos: [0, -d / 2], yaw: Math.PI },
    { len: d, pos: [w / 2, 0], yaw: Math.PI / 2 },
    { len: d, pos: [-w / 2, 0], yaw: -Math.PI / 2 }
  ];
  for (const f of faces) {
    const fb = mul(base, M(f.pos[0], PLINTH, f.pos[1], 0, f.yaw, 0));
    const bays = Math.max(2, Math.round(f.len / 2.1));
    const bw = f.len / bays;
    for (let i = 0; i <= bays; i++) kit.box('timber', 0.24, H, 0.24, mul(fb, M(-f.len / 2 + i * bw, 0, 0)), timber);
    for (let fl = 0; fl < floors; fl++) {
      const y0 = fl * WALL;
      // Beams: a sill, a head rail, the top.
      kit.box('timber', f.len + 0.2, 0.18, 0.22, mul(fb, M(0, y0 + WALL - 0.18, 0.02)), timber);
      kit.box('timber', f.len, 0.12, 0.2, mul(fb, M(0, y0 + 2.05, 0.02)), timber);
      for (let i = 0; i < bays; i++) {
        const cx = -f.len / 2 + (i + 0.5) * bw;
        const pw = bw - 0.24;
        const pb = mul(fb, M(cx, y0, -0.05));
        const doorBay = f.front && fl === 0 && (bays % 2 ? i === (bays - 1) / 2 : i === bays / 2 - 1 || i === bays / 2);
        if (doorBay) {
          // Sliding doors: lattice over glowing paper, boards below.
          addLattice(kit, mul(pb, M(0, 0.85, 0.06)), pw, 1.2, { bars: 3, rows: 4, frame: timber });
          kit.box('wood', pw, 0.85, 0.08, mul(pb, M(0, 0, 0.04)), boards);
          kit.box('plaster', pw, WALL - 2.05 - 0.18, 0.16, mul(pb, M(0, 2.05, 0)), plaster);
          continue;
        }
        const window = (f.front || f.yaw === Math.PI ? r() < 0.7 : r() < 0.45) && pw > 0.9;
        kit.box('wood', pw, 0.9, 0.12, pb.clone(), boards);
        if (window) {
          kit.box('plaster', pw, 0.18, 0.16, mul(pb, M(0, 0.9, 0)), plaster);
          addLattice(kit, mul(pb, M(0, 1.08, 0.05)), Math.min(pw * 0.8, 1.5), 0.9, { bars: 4, rows: 3, frame: timber });
          for (const s of [-1, 1]) kit.box('plaster', (pw - Math.min(pw * 0.8, 1.5)) / 2, 0.97, 0.16, mul(pb, M(s * (pw / 2 - (pw - Math.min(pw * 0.8, 1.5)) / 4), 1.08, 0)), plaster);
          kit.box('plaster', pw, WALL - 2.05, 0.16, mul(pb, M(0, 1.98, 0)), plaster);
        } else kit.box('plaster', pw, WALL - 0.9 - 0.18, 0.16, mul(pb, M(0, 0.9, 0)), plaster);
      }
    }
  }
  // Between storeys, a skirt roof front and back.
  if (floors > 1) {
    for (const s of [1, -1]) addRoof(kit, mul(base, M(0, PLINTH + WALL - 0.05, (s * d) / 2, 0, s > 0 ? 0 : Math.PI, 0)), { W: w / 2 + 0.35, D: 1.15, rise: 0.5, sides: [1], curl: 0.15, color: h.roof === 'thatch' ? 'thatch' : h.roof, segV: 5, seed: h.id.length + s });
  }
  // The roof, its gable ends.
  const top = PLINTH + H;
  const ohz = 0.95;
  const ohx = 0.55;
  const D = d / 2 + ohz;
  const rise = d * (h.kind === 'hall' ? 0.5 : 0.42);
  const roofBase = mul(base, M(0, top - 0.02, 0));
  addRoof(kit, roofBase, { W: w / 2 + ohx, D, rise, color: h.roof, seed: h.id.length * 3 + 1, curl: h.kind === 'hall' ? 0.6 : 0.4 });
  const prof = (v) => 0.3 * v + 0.7 * (1 - (1 - v) ** 2);
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    const n = 10;
    shape.moveTo(-d / 2, 0);
    for (let i = 0; i <= n; i++) {
      const z = -d / 2 + (d * i) / n;
      const v = Math.abs(z) / D;
      shape.lineTo(z, rise * (1 - prof(v)) - 0.08);
    }
    shape.lineTo(d / 2, 0);
    const g = new THREE.ShapeGeometry(shape, 1);
    // Shape in (z, y): lay it on the side wall's plane.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, s * (w / 2 + 0.02), p.getY(i), p.getX(i));
    if (s < 0) {
      const ii = g.index.array;
      for (let q = 0; q < ii.length; q += 3) [ii[q], ii[q + 2]] = [ii[q + 2], ii[q]];
    }
    g.computeVertexNormals();
    kit.add('plaster', g, roofBase.clone(), plaster);
    // A timber king post and a tie beam across the gable.
    kit.box('timber', 0.18, rise * 0.85, 0.18, mul(roofBase, M(s * (w / 2 + 0.05), 0, 0)), timber);
  }
  // Lanterns at the front corners, under the eaves.
  if (r() < 0.75 || h.kind !== 'house') {
    for (const s of [-1, 1]) {
      const ex = s * (w / 2 - 0.4);
      addLantern(kit, mul(base, M(ex, top - 0.15, d / 2 + 0.55)), { r: 0.2, drop: 0.25, color: h.kind === 'teahouse' ? '#e04a38' : r() < 0.3 ? '#e04a38' : '#fff2dc' });
    }
  }
  // What the house is.
  if (h.kind === 'teahouse' || h.kind === 'shop' || h.kind === 'hall') {
    const board = new THREE.PlaneGeometry(Math.min(w * 0.6, 4.4), 0.8);
    kit.add(`sign:${h.id}`, board, mul(base, M(0, PLINTH + WALL - 0.25 + (floors > 1 ? 0.0 : 0), d / 2 + 0.14)), '#ffffff');
    kit.signs ??= {};
    kit.signs[h.id] = h.name;
  }
  if (h.kind === 'teahouse') {
    // A cloth hanging over the door, split into strips, and a bench.
    for (let i = 0; i < 4; i++) kit.box('clothFlat', 0.38, 0.75, 0.02, mul(base, M(-0.6 + i * 0.4, PLINTH + 1.35, d / 2 + 0.2)), '#2f4a6a');
    kit.box('wood', 2.2, 0.08, 0.5, mul(base, M(-w / 2 + 1.6, 0.42, d / 2 + 0.75)), '#7a5a3a');
    for (const s of [-1, 1]) kit.box('wood', 0.08, 0.42, 0.4, mul(base, M(-w / 2 + 1.6 + s * 0.9, 0, d / 2 + 0.75)), '#5a4030');
  }
  if (h.kind === 'shop') {
    addRoof(kit, mul(base, M(0, PLINTH + 2.3, d / 2, 0, 0, 0)), { W: w / 2 - 0.2, D: 1.4, rise: 0.45, sides: [1], curl: 0.1, color: 'slate', segV: 5, seed: 9 });
    for (const s of [-1, 1]) kit.cyl('timber', 0.08, 0.08, PLINTH + 2.0, mul(base, M(s * (w / 2 - 0.4), 0, d / 2 + 1.3)), timber, 6);
    // Sacks and baskets out front.
    for (let i = 0; i < 4; i++) {
      kit.cyl('goods', 0.26, 0.2, 0.55, mul(base, M(-w / 2 + 1 + i * 0.7, PLINTH, d / 2 + 0.7)), ['#c8a870', '#b89060', '#d4b47a'][i % 3], 8);
      kit.add('goods', new THREE.SphereGeometry(0.18, 8, 6), mul(base, M(-w / 2 + 1 + i * 0.7, PLINTH + 0.6, d / 2 + 0.7)), ['#e8b440', '#d8456a', '#7ad0e8', '#e8b440'][i]);
    }
  }
  if (h.kind === 'barn') {
    // Big doors, hay.
    kit.box('wood', 2.6, 2.4, 0.12, mul(base, M(0, PLINTH, d / 2 + 0.1)), '#7a5434');
    for (let i = 0; i < 3; i++) kit.cyl('goods', 0.5, 0.5, 0.9, mul(base, M(w / 2 + 0.8, 0, -1.5 + i * 1.2, Math.PI / 2, 0, 0)), '#c8b068', 10);
  }
  colliders?.box(h.x, h.z, w / 2 + 0.3, d / 2 + 0.3, h.face, -1, 50);
  return { top: y + top + rise, front: V(h.x, y, h.z).add(V(Math.sin(h.face), 0, Math.cos(h.face)).multiplyScalar(d / 2 + 0.8)) };
}

/* ------------------------------------------------------------------ the gate and walls */

/** The village gate (map.js GATE), its doors open inward. Returns the lantern positions. */
export function addGate(kit, colliders) {
  const y = groundAt(GATE.x, GATE.z);
  const base = M(GATE.x, y, GATE.z);
  const half = GATE.width / 2 + 0.3;
  const timber = '#4a3124';
  const P = 6.6;
  for (const s of [-1, 1]) {
    // The great posts on stone footings; the lesser posts holding the wall.
    kit.box('stone', 1.1, 0.55, 1.1, mul(base, M(s * half, 0, 0)), '#9a9488');
    kit.box('timber', 0.62, P, 0.62, mul(base, M(s * half, 0.2, 0)), timber);
    kit.box('timber', 0.42, 4.6, 0.42, mul(base, M(s * (half + 2.2), 0, 0)), timber);
    kit.box('timber', 2.3, 0.3, 0.34, mul(base, M(s * (half + 1.1), 4.3, 0)), timber);
    // Iron bands round the great posts.
    for (const yy of [1.2, 3.4]) kit.box('iron', 0.66, 0.12, 0.66, mul(base, M(s * half, yy, 0)), '#3a3634');
    colliders?.circle(GATE.x + s * half, GATE.z, 0.45);
    colliders?.circle(GATE.x + s * (half + 2.2), GATE.z, 0.3);
    // The doors, swung in against the walls: planks, battens, rows of iron studs, a ring.
    const door = mul(base, M(s * (half - 0.32), 0.15, -0.35, 0, -s * (Math.PI / 2 + 0.12), 0));
    const DW = GATE.width / 2 + 0.05;
    const DH = 4.7;
    for (let i = 0; i < 6; i++) kit.box('wood', DW / 6 - 0.02, DH, 0.14, mul(door, M(-s * (DW / 12 + (i * DW) / 6), 0, 0)), ['#7a5638', '#835e3e', '#6e4c32'][i % 3]);
    for (const yy of [0.5, 2.2, 3.9]) {
      kit.box('wood', DW, 0.28, 0.08, mul(door, M(-s * DW / 2, yy, 0.1)), '#5e402c');
      for (let k = 0; k < 7; k++) kit.add('iron', new THREE.SphereGeometry(0.045, 6, 4), mul(door, M(-s * (0.2 + k * (DW - 0.4) / 6), yy + 0.14, 0.15)), '#2e2a28');
    }
    const ring = new THREE.TorusGeometry(0.13, 0.025, 6, 14);
    kit.add('iron', ring, mul(door, M(-s * (DW - 0.5), 2.0, 0.17)), '#2e2a28');
    colliders?.box(GATE.x + s * (half - 0.2), GATE.z - DW / 2 - 0.3, 0.12, DW / 2, 0, -1, 6);
  }
  // Lintels, the slatted transom between them, a ridge roof on top.
  kit.box('timber', half * 2 + 2.6, 0.5, 0.6, mul(base, M(0, P - 0.9, 0)), timber);
  kit.box('timber', half * 2, 0.26, 0.42, mul(base, M(0, 4.85, 0)), timber);
  for (let i = 0; i < 17; i++) kit.box('wood', 0.07, P - 0.9 - 5.1, 0.12, mul(base, M(-half + 0.35 + i * ((half * 2 - 0.7) / 16), 5.1, 0)), '#5a3e2c');
  addRoof(kit, mul(base, M(0, P - 0.4, 0)), { W: half + 2.4, D: 2.2, rise: 1.25, color: 'gold', seed: 77, curl: 0.55, tileSp: 0.28 });
  kit.box('timber', half * 2 + 3.6, 0.22, 0.4, mul(base, M(0, P - 0.48, 1.6)), timber);
  kit.box('timber', half * 2 + 3.6, 0.22, 0.4, mul(base, M(0, P - 0.48, -1.6)), timber);
  // The name board over the opening, both faces.
  for (const s of [1, -1]) {
    const board = new THREE.PlaneGeometry(2.6, 0.62);
    kit.add('sign:gate', board, mul(base, M(0, P - 1.55, s * 0.33, 0, s > 0 ? 0 : Math.PI, 0)), '#ffffff');
  }
  kit.signs ??= {};
  kit.signs.gate = 'LANTERNREST';
  // Two big lanterns under the lintel, as you walk through.
  const lights = [];
  for (const s of [-1, 1]) {
    const ly = addLantern(kit, mul(base, M(s * 2.0, 4.72, 0)), { r: 0.34, drop: 0.25, tall: 1.35, color: '#fff2dc' });
    lights.push(V(GATE.x + s * 2.0, y + 4.72 + ly, GATE.z));
  }
  return lights;
}

/** One straight run of wall: stone footing, plaster, posts, a little tiled cap. */
function wallRun(kit, a, b, colliders, seed) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.5) return;
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[1] + b[1]) / 2;
  const y = groundAt(cx, cz);
  // Along local z; rotate the run so local x is along the wall.
  const base = M(cx, y, cz, 0, yaw - Math.PI / 2, 0);
  kit.box('stone', len, 0.7, 0.85, base.clone(), '#a29a8e');
  kit.box('plaster', len, 1.85, 0.6, mul(base, M(0, 0.7, 0)), '#ece2d0');
  const posts = Math.max(1, Math.round(len / 3.6));
  for (let i = 0; i <= posts; i++) kit.box('timber', 0.22, 2.55, 0.66, mul(base, M(-len / 2 + (i * len) / posts, 0.05, 0)), '#4a3226');
  kit.box('timber', len, 0.16, 0.7, mul(base, M(0, 2.4, 0)), '#4a3226');
  addRoof(kit, mul(base, M(0, 2.55, 0)), { W: len / 2 + 0.05, D: 0.62, rise: 0.36, curl: 0.0, color: 'slate', segV: 3, tileSp: 0.42, tileR: 0.06, ridge: false, seed });
  kit.box('tile', len + 0.1, 0.16, 0.22, mul(base, M(0, 2.85, 0)), '#4a5060');
  colliders?.box(cx, cz, 0.5, len / 2, yaw, -1, 6);
}

export function addWalls(kit, colliders) {
  const g = GATE.width / 2 + 0.3 + 2.2;
  const { x0, x1, z0, z1 } = VILLAGE;
  const runs = [
    [[-g, z1], [x0, z1]],
    [[g, z1], [x1, z1]],
    [[x0, z1], [x0, z0]],
    [[x1, z1], [x1, z0]],
    [[x0, z0], [x1, z0]]
  ];
  let seed = 1;
  for (const [a, b] of runs) {
    // In pieces of about 12 m, so the cap follows the ground.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 12));
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      wallRun(kit, [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], colliders, seed++);
    }
  }
}

/* ------------------------------------------------------------------ the lane and the plaza */

/** A market stall: a table of goods, a cloth awning on two posts. */
function addStall(kit, st, colliders) {
  const y = groundAt(st.x, st.z);
  const base = M(st.x, y, st.z, 0, st.face, 0);
  const r = rng(Math.round(st.z * 13));
  kit.box('wood', 2.2, 0.08, 0.9, mul(base, M(0, 0.85, 0)), '#8a6644');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('wood', 0.08, 0.85, 0.08, mul(base, M(sx * 1.0, 0, sz * 0.38)), '#5a4030');
  for (const sx of [-1, 1]) kit.box('timber', 0.1, 2.5, 0.1, mul(base, M(sx * 1.08, 0, -0.5)), '#4a3226');
  // The awning: a sloped cloth from the back posts, out over the table.
  const aw = new THREE.PlaneGeometry(2.5, 1.6, 6, 3);
  aw.rotateX(-Math.PI / 2 + 0.38);
  const uv = aw.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getY(i), uv.getX(i));
  kit.add('cloth', aw, mul(base, M(0, 2.25, 0.18)), st.cloth);
  // Goods.
  for (let i = 0; i < 9; i++) {
    const gx = -0.85 + (i % 5) * 0.42;
    const gz = -0.2 + Math.floor(i / 5) * 0.36;
    if (st.goods === 'fruit') kit.add('goods', new THREE.SphereGeometry(0.11, 8, 6), mul(base, M(gx, 0.98, gz)), ['#d8456a', '#e8a040', '#c83a3a'][i % 3]);
    else if (st.goods === 'pots') kit.cyl('goods', 0.12, 0.09, 0.26 + r() * 0.12, mul(base, M(gx, 0.89, gz)), ['#b0603a', '#5a7a8a', '#d8c8a8'][i % 3], 10);
    else if (st.goods === 'cloth') kit.cyl('goods', 0.08, 0.08, 0.4, mul(base, M(gx, 0.98, gz, 0, 0, Math.PI / 2)), ['#c8553a', '#3a6a8a', '#d8a23a', '#6a4a8a'][i % 4], 8);
    else kit.add('goods', new THREE.SphereGeometry(0.13, 7, 5), mul(base, M(gx, 0.97, gz)), ['#5a8a3a', '#7aa04a', '#4a7030'][i % 3]);
  }
  colliders?.box(st.x, st.z, 1.15, 0.55, st.face, -1, 3);
}

function addWell(kit, colliders) {
  const y = groundAt(WELL.x, WELL.z);
  const base = M(WELL.x, y, WELL.z);
  const ring = new THREE.CylinderGeometry(1.0, 1.05, 0.85, 20, 1, true);
  ring.translate(0, 0.42, 0);
  kit.add('stone', ring, base.clone(), '#a8a094');
  const inner = new THREE.CylinderGeometry(0.82, 0.82, 0.85, 20, 1, true);
  inner.translate(0, 0.42, 0);
  inner.scale(-1, 1, 1);
  kit.add('stone', inner, base.clone(), '#7a7268');
  const lip = new THREE.TorusGeometry(0.92, 0.12, 6, 20);
  lip.rotateX(Math.PI / 2);
  kit.add('stone', lip, mul(base, M(0, 0.86, 0)), '#b4ac9e');
  kit.add('water', new THREE.CircleGeometry(0.82, 20).rotateX(-Math.PI / 2), mul(base, M(0, 0.35, 0)), '#ffffff');
  for (const s of [-1, 1]) kit.box('timber', 0.14, 2.4, 0.14, mul(base, M(s * 0.95, 0.3, 0)), '#4a3226');
  kit.cyl('wood', 0.07, 0.07, 2.1, mul(base, M(-1.05, 2.1, 0, 0, 0, Math.PI / 2)), '#6a4a34', 8);
  addRoof(kit, mul(base, M(0, 2.55, 0)), { W: 1.4, D: 0.95, rise: 0.6, color: 'clay', segV: 5, seed: 31, curl: 0.25 });
  kit.cyl('wood', 0.16, 0.13, 0.28, mul(base, M(0.1, 1.15, 0)), '#7a5a3a', 10);
  kit.cyl('timber', 0.008, 0.008, 0.8, mul(base, M(0.1, 1.42, 0)), '#3a2a20', 4);
  colliders?.circle(WELL.x, WELL.z, 1.15);
}

/** Lantern posts along the lane (the lantern keeper's round). Returns their lamp positions. */
function addLanePosts(kit, colliders) {
  const out = [];
  for (const z of [-94, -108, -122, -150, -160]) for (const s of [-1, 1]) {
    if ((z === -122 && s > 0) || (z === -108 && s < 0)) continue;
    const x = s * (LANE.half + 0.5);
    const y = groundAt(x, z);
    const base = M(x, y, z);
    kit.box('stone', 0.4, 0.3, 0.4, base.clone(), '#a09888');
    kit.box('timber', 0.14, 2.6, 0.14, mul(base, M(0, 0.3, 0)), '#4a3226');
    kit.box('timber', 0.7, 0.1, 0.1, mul(base, M(-s * 0.28, 2.75, 0)), '#4a3226');
    const ly = addLantern(kit, mul(base, M(-s * 0.55, 2.7, 0)), { r: 0.17, drop: 0.08, color: '#fff2dc' });
    out.push(V(x - s * 0.55, y + 2.7 + ly, z));
    colliders?.circle(x, z, 0.25);
  }
  return out;
}

/** Tall banners on poles, cloth that waves (uv.x runs from the pole out). */
function addBanner(kit, x, z, color, height = 5.2, yaw = 0) {
  const y = groundAt(x, z);
  const base = M(x, y, z, 0, yaw, 0);
  kit.cyl('timber', 0.06, 0.05, height, base.clone(), '#3e2a20', 6);
  kit.box('timber', 0.05, 0.05, 0.75, mul(base, M(0, height - 0.15, 0.36)), '#3e2a20');
  const g = new THREE.PlaneGeometry(0.7, 2.6, 4, 8);
  const uv = g.attributes.uv;
  g.rotateY(Math.PI / 2);
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i));
  kit.add('cloth', g, mul(base, M(0, height - 1.5, 0.38)), color);
}

/** The Kith Garden: a fenced round of soft grass where friends wait, a shelter, a trough. */
function addGarden(kit, colliders) {
  const y = groundAt(GARDEN.x, GARDEN.z);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Its gate faces the street (west).
    if (Math.abs(((a - Math.PI + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.32) continue;
    const x = GARDEN.x + Math.cos(a) * GARDEN.r;
    const z = GARDEN.z + Math.sin(a) * GARDEN.r;
    kit.cyl('wood', 0.06, 0.06, 1.0, M(x, y, z), '#c8b07a', 6);
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const p0 = V(x, y + 0.75, z);
    const p1 = V(GARDEN.x + Math.cos(a2) * GARDEN.r, y + 0.75, GARDEN.z + Math.sin(a2) * GARDEN.r);
    kit.beam('wood', p0, p1, 0.05, '#d4bc84');
    kit.beam('wood', p0.clone().setY(y + 0.4), p1.clone().setY(y + 0.4), 0.05, '#d4bc84');
  }
  const sb = M(GARDEN.x + 4.5, y, GARDEN.z + 3, 0, -2.2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('timber', 0.12, 2.1, 0.12, mul(sb, M(sx * 1.1, 0, sz * 0.8)), '#4a3226');
  addRoof(kit, mul(sb, M(0, 2.05, 0)), { W: 1.5, D: 1.15, rise: 0.55, color: 'thatch', seed: 5, curl: 0.1 });
  kit.box('wood', 1.6, 0.3, 0.5, M(GARDEN.x - 3, y, GARDEN.z - 4.5), '#7a5a3a');
  kit.add('water', new THREE.PlaneGeometry(1.4, 0.36).rotateX(-Math.PI / 2), M(GARDEN.x - 3, y + 0.31, GARDEN.z - 4.5), '#ffffff');
  colliders?.circle(GARDEN.x + 4.5, GARDEN.z + 3, 1.3);
}

/** Kemi's field of sunheads outside the gate, fenced. */
function addField(kit) {
  const cx = 24;
  const cz = -66;
  const r = rng(12);
  for (let i = 0; i < 26; i++) {
    const x = cx - 5 + (i % 6) * 2 + (r() - 0.5) * 0.5;
    const z = cz - 4 + Math.floor(i / 6) * 2 + (r() - 0.5) * 0.5;
    const y = groundAt(x, z);
    const h = 1.6 + r() * 0.7;
    kit.cyl('goods', 0.03, 0.04, h, M(x, y, z), '#5a7a30', 5);
    const head = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 14);
    kit.add('goods', head, M(x, y + h, z + 0.05, 1.1, 0, 0), '#f0b830');
    kit.add('goods', new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), M(x, y + h + 0.04, z + 0.09, 1.1, 0, 0), '#5a3a20');
    kit.add('goods', new THREE.SphereGeometry(0.16, 6, 4).scale(1.4, 0.4, 0.8), M(x + 0.15, y + h * 0.55, z, 0, 0, 0.5), '#5a8a34');
  }
  for (let i = 0; i <= 7; i++) for (const [ax, az, bx, bz] of [[cx - 7, cz - 6, cx + 7, cz - 6], [cx - 7, cz + 6, cx + 7, cz + 6]]) {
    const x = ax + ((bx - ax) * i) / 7;
    const z = az + ((bz - az) * i) / 7;
    kit.cyl('wood', 0.05, 0.05, 0.9, M(x, groundAt(x, z), z), '#c8b07a', 5);
  }
}

/* ------------------------------------------------------------------ all of it */

/**
 * Build the village into a group. Returns { group, lights (lantern spots),
 * signs, materials, setGlow(k) }.
 */
export function buildVillage({ colliders, bank }) {
  const kit = new Kit();
  for (const h of HOUSES) addHouse(kit, h, colliders);
  const gateLights = addGate(kit, colliders);
  addWalls(kit, colliders);
  for (const st of STALLS) addStall(kit, st, colliders);
  addWell(kit, colliders);
  const postLights = addLanePosts(kit, colliders);
  addGarden(kit, colliders);
  addField(kit);
  // Strings of lanterns across the lane and the cross street.
  const y = groundAt(0, -110);
  for (const z of [-99, -111.5, -141, -153]) addLanternString(kit, V(-8.6, y + 4.6, z), V(8.6, y + 4.6, z + 0.6), { n: 5, sag: 0.8 });
  addLanternString(kit, V(-9, y + 4.3, CROSS.z - 4), V(-26, y + 4.0, CROSS.z + 3), { n: 4 });
  // Banners by the gate, the plaza and the hall.
  const colors = ['#c8553a', '#3a6a8a', '#d8a23a', '#5a8a4a'];
  [[-5.8, -90], [5.8, -90], [-8.5, -122], [8.5, -134], [-7, -166], [7, -166]].forEach(([x, z], i) => addBanner(kit, x, z, colors[i % 4], 5.4, x < 0 ? 0.3 : -0.3));
  void PLAZA;
  const mats = villageMaterials();
  // Signboards: each its own lettering.
  for (const [id, text] of Object.entries(kit.signs ?? {})) {
    mats[`sign:${id}`] = painterly(new THREE.MeshStandardMaterial({ map: signTexture(text, { w: 512, h: id === 'gate' ? 128 : 112, bg: id === 'gate' ? '#3e2a1e' : '#4a3224', ink: '#f4dca0' }), roughness: 0.8, vertexColors: true }), { rim: 0.2 });
  }
  const group = kit.build(mats);
  void bank;
  return { group, materials: mats, lights: [...gateLights, ...postLights], gateLights };
}
