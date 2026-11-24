import * as THREE from 'three';
import { isSmall } from './course.js';


/**
 * The near street along a bike course, built as you come to it and cleared
 * behind you: the small streets the city's road layer leaves out (golmok,
 * residential lanes, market lanes) laid as worn concrete and asphalt at road
 * level, with a narrow raised pavement down one side of a residential lane;
 * and what makes a Seoul alley an alley — garden walls and metal gates where
 * there is no building, air-conditioner units and gas meters on the walls,
 * concrete utility poles with their tangle of wires overhead, a convex
 * mirror on a pole at the blind corners, vertical shop signs that light up
 * at night, striped awnings, styrofoam planters of greens, flower pots,
 * recycling bins, parked delivery scooters, steps up to doors and alley
 * lamps.
 *
 * Everything in a 48 m stretch is one mesh (vertex colours), plus one for
 * what glows and one set of lines for the wires — a few draws a stretch,
 * only near you. The props are placed by a seeded random from the course
 * itself, so every racer in a room sees the same alley. Things that stand
 * in the way (planters, bins, scooters, poles) are `obstacles` for the race.
 */

/** The city's road lookup squares (SeoulGame ROAD_CELL). */
const ROAD_CELL = 40;
const CHUNK = 8; // course points (6 m apart) to a stretch
const BUILD = 190;
const DROP = 280;

/** A small seeded random (the same alley for everyone). */
function rng(seed) {
  let h = (seed * 2654435761) >>> 0 || 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Triangles with colours, added to by boxes and quads in a local frame. */
class Builder {
  constructor() {
    this.pos = [];
    this.col = [];
  }
  tri(a, b, c, color) {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let k = 0; k < 3; k++) this.col.push(color.r, color.g, color.b);
  }
  quad(a, b, c, d, color) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  /** A box: centre, half sizes, turned by `yaw` about the upright; a shade darker on the sides and underneath. */
  box(cx, cy, cz, hx, hy, hz, yaw, color, { top = 1.08, side = 0.86 } = {}) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const P = (x, y, z) => new THREE.Vector3(cx + x * c + z * s, cy + y, cz - x * s + z * c);
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
    const t = color.clone().multiplyScalar(top);
    const sd = color.clone().multiplyScalar(side);
    const bt = color.clone().multiplyScalar(0.6);
    this.quad(v[4], v[7], v[6], v[5], t);
    this.quad(v[0], v[1], v[2], v[3], bt);
    this.quad(v[0], v[4], v[5], v[1], color);
    this.quad(v[2], v[6], v[7], v[3], color);
    this.quad(v[1], v[5], v[6], v[2], sd);
    this.quad(v[3], v[7], v[4], v[0], sd);
  }
  /** An upright cylinder (a pole, a tank). */
  cyl(cx, y0, cz, r, h, color, n = 8) {
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const p = (a, y) => new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
      const shade = color.clone().multiplyScalar(0.8 + 0.25 * Math.cos(a0 - 0.8));
      this.quad(p(a0, y0), p(a1, y0), p(a1, y0 + h), p(a0, y0 + h), shade);
      this.tri(new THREE.Vector3(cx, y0 + h, cz), p(a1, y0 + h), p(a0, y0 + h), color.clone().multiplyScalar(1.1));
    }
  }
  mesh(material) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

const C = (hex) => new THREE.Color(hex);
const PAL = {
  concrete: [C('#a7a29a'), C('#9b968e'), C('#b3ada3')],
  asphalt: C('#5d5f63'),
  paving: C('#b8afa2'),
  kerb: C('#c9c4bb'),
  walls: [C('#a65a44'), C('#b8b2a8'), C('#d9d2c4'), C('#8c8478'), C('#c7b49a'), C('#9fb0a8')],
  gate: [C('#3a4a5c'), C('#5c3a2e'), C('#2f5a46'), C('#6a6d74')],
  ac: C('#e8e6e0'),
  meter: C('#c8c2b0'),
  pole: C('#9a958c'),
  bins: [C('#2f6fd1'), C('#3aa65a'), C('#7a7f86')],
  styro: C('#f2f0ea'),
  greens: [C('#3f8f3a'), C('#5aa04a'), C('#2e6b30')],
  pots: [C('#a8553a'), C('#6a4a3a'), C('#3a3c40')],
  awn: [[C('#d8402a'), C('#f2f0ea')], [C('#1f5bb5'), C('#f2f0ea')], [C('#2f8f4e'), C('#f2f0ea')], [C('#f2c230'), C('#3a3c40')]],
  scooter: [C('#e9e9e6'), C('#c8322b'), C('#2a2c31'), C('#1f5bb5')],
  mirror: C('#ff7a1a'),
  step: C('#b9b2a6')
};
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

/** Korean shop words for the vertical signs (generic, no real names), as one atlas. */
function signTexture() {
  const words = ['약국', '세탁', '분식', '노래방', '미용실', '부동산', '카페', '치킨', '꽃집', '인쇄', '철물', '식당'];
  const colors = ['#1d6fd1', '#e8402a', '#18a35a', '#f4c21b', '#7a2bd1', '#e3007a'];
  const c = document.createElement('canvas');
  c.width = 64 * words.length;
  c.height = 256;
  const g = c.getContext('2d');
  words.forEach((w, k) => {
    const x = k * 64;
    g.fillStyle = colors[k % colors.length];
    g.fillRect(x, 0, 64, 256);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.strokeRect(x + 4, 4, 56, 248);
    g.fillStyle = k % colors.length === 3 ? '#1a1a1a' : '#ffffff';
    g.font = '900 40px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [...w].forEach((ch, i) => g.fillText(ch, x + 32, 128 + (i - (w.length - 1) / 2) * 50));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, count: words.length };
}

export class Golmok {
  /** @param {any} game the SeoulGame @param {any} course a planned bike course */
  constructor(game, course) {
    this.g = game;
    this.course = course;
    this.chunks = new Map();
    this.obstacles = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05, envMapIntensity: 0.2 });
    // The surface: matt like the city's own roads (no studio reflections to glow at night), darker when wet.
    this.groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    this.groundMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWet = game.uniforms.uWet;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uWet;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - 0.45 * uWet;');
    };
    const signs = signTexture();
    this.signs = signs;
    this.signMat = new THREE.MeshStandardMaterial({ map: signs.tex, emissiveMap: signs.tex, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.5 });
    this.lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd58a', emissiveIntensity: 0 });
    this.wireMat = new THREE.LineBasicMaterial({ color: '#1c1d22', transparent: true, opacity: 0.85 });
    this.glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,220,160,1)');
      grad.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    this.glowMat = new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.poolGeo = new THREE.CircleGeometry(3.2, 24).rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({ map: this.glowTex, color: '#ffcf8a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -6 });
    this.t = 0;
  }

  /** Each frame: build what is near, clear what is far, light up at night. */
  update(dt = 0) {
    this.t += dt;
    const p = this.g.pos;
    const pts = this.course.points;
    const n = pts.length;
    const count = Math.ceil(n / CHUNK);
    let built = 0;
    for (let k = 0; k < count; k++) {
      const mid = pts[Math.min(n - 1, k * CHUNK + CHUNK / 2)];
      const d = Math.hypot(mid[0] - p.x, mid[1] - p.z);
      const have = this.chunks.get(k);
      if (!have && d < BUILD && built < 2) {
        this.chunks.set(k, this._build(k));
        built++;
      } else if (have && d > DROP) {
        this._drop(k, have);
      }
    }
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.signMat.emissiveIntensity = 0.12 + night * 1.4;
    this.lampMat.emissiveIntensity = night * 2.6;
    this.glowMat.opacity = night * 0.8;
    this.poolMat.opacity = night * 0.45;
  }

  /** A stretch of the course: its small-street surface, and everything along its sides. */
  _build(k) {
    const g = this.g;
    const pts = this.course.points;
    const n = pts.length;
    const r = rng(k * 7919 + Math.round(pts[0][0]) * 31 + 17);
    const ground = new Builder();
    const props = new Builder();
    const signs = [];
    const lamps = [];
    const wires = [];
    const owned = [];
    const obstacles = [];
    const group = new THREE.Group();
    const at = (i) => pts[((i % n) + n) % n];
    const y0 = (x, z) => g.groundAt(x, z) + 0.9; // road level (SeoulGame lays its roads 0.9 m over the land)
    const poles = [];
    for (let i = k * CHUNK; i < Math.min(n, (k + 1) * CHUNK + 1); i++) {
      const a = at(i);
      const b = at(i + 1);
      const cls = b[3] ?? 4;
      const small = isSmall(cls);
      const w = b[2] ?? 6;
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      // Right of the way the course goes.
      const rx = -uz;
      const rz = ux;
      const hd = Math.atan2(-ux, -uz);
      if (small && i < (k + 1) * CHUNK) {
        // The surface: patchy concrete (an alley) or asphalt (a lane), at road level; skirts down to the land.
        const half = w / 2;
        const ya = y0(a[0], a[1]);
        const yb = y0(b[0], b[1]);
        const corner = (p, s, y) => new THREE.Vector3(p[0] + rx * s, y, p[1] + rz * s);
        const tone = cls === 6 ? pick(r, PAL.concrete) : PAL.asphalt.clone().multiplyScalar(0.92 + r() * 0.16);
        ground.quad(corner(a, -half, ya), corner(a, half, ya), corner(b, half, yb), corner(b, -half, yb), tone);
        for (const s of [-1, 1]) ground.quad(corner(a, s * half, ya - 1.4), corner(b, s * half, yb - 1.4), corner(b, s * half, yb), corner(a, s * half, ya), tone.clone().multiplyScalar(0.7));
        // A narrow raised pavement down the right of a residential lane.
        if (cls === 5 && w >= 5) {
          const kerbY = 0.13;
          ground.quad(corner(a, half - 1.1, ya + kerbY), corner(a, half, ya + kerbY), corner(b, half, yb + kerbY), corner(b, half - 1.1, yb + kerbY), PAL.paving);
          ground.quad(corner(a, half - 1.1, ya), corner(a, half - 1.1, ya + kerbY), corner(b, half - 1.1, yb + kerbY), corner(b, half - 1.1, yb), PAL.kerb);
        }
        // So bikes and people stand on it (the city's surface lookup), and it shows on the map.
        const seg = { ax: a[0], ay: ya, az: a[1], bx: b[0], by: yb, bz: b[1], half: half + 0.2 };
        const cell = `${Math.floor((a[0] + b[0]) / 2 / ROAD_CELL)}_${Math.floor((a[1] + b[1]) / 2 / ROAD_CELL)}`;
        if (!g.roadHash.has(cell)) g.roadHash.set(cell, []);
        g.roadHash.get(cell).push(seg);
        owned.push([cell, seg]);
      }
      if (i >= (k + 1) * CHUNK) continue;
      // Along both sides.
      for (const side of [-1, 1]) {
        const half = w / 2;
        const ex = a[0] + rx * side * half;
        const ez = a[1] + rz * side * half;
        const base = y0(ex, ez);
        const wall = g.buildingAt?.(a[0] + rx * side * (half + 1.2), a[1] + rz * side * (half + 1.2));
        const outYaw = hd + (side > 0 ? -Math.PI / 2 : Math.PI / 2); // facing into the street from this side
        const along = (t) => [ex + ux * t, ez + uz * t];
        if (small) {
          // (Not across a corner or another stretch of the course: a wall goes only where the street is plainly its edge.)
          const turning = Math.abs(Math.atan2(Math.sin(Math.atan2(at(i + 2)[0] - a[0], at(i + 2)[1] - a[1]) - Math.atan2(a[0] - at(i - 2)[0], a[1] - at(i - 2)[1])), Math.cos(Math.atan2(at(i + 2)[0] - a[0], at(i + 2)[1] - a[1]) - Math.atan2(a[0] - at(i - 2)[0], a[1] - at(i - 2)[1])))) > 0.35;
          const wallX = ex + rx * side * 0.2 + ux * len / 2;
          const wallZ = ez + rz * side * 0.2 + uz * len / 2;
          const inCourse = !turning && pts.some((q, qi) => Math.abs(qi - i) > 2 && Math.hypot(q[0] - wallX, q[1] - wallZ) < (q[2] ?? 6) / 2 + 1.2);
          if (!wall && !turning && !inCourse && !g.onRoad?.(ex + rx * side * 1.5, ez + rz * side * 1.5, 0.5)) {
            // A garden wall, sometimes a gate in it.
            const col = pick(r, PAL.walls);
            const h = 1.7 + r() * 0.6;
            props.box(ex + rx * side * 0.2 + ux * len / 2, base + h / 2, ez + rz * side * 0.2 + uz * len / 2, len / 2, h / 2, 0.11, hd + Math.PI / 2, col);
            props.box(ex + rx * side * 0.2 + ux * len / 2, base + h + 0.04, ez + rz * side * 0.2 + uz * len / 2, len / 2 + 0.02, 0.05, 0.15, hd + Math.PI / 2, col.clone().multiplyScalar(1.15));
            if (r() < 0.3) {
              const [gx, gz] = along(len * (0.3 + r() * 0.4));
              props.box(gx + rx * side * 0.12, base + 1.0, gz + rz * side * 0.12, 0.65, 1.0, 0.04, hd + Math.PI / 2, pick(r, PAL.gate));
            }
          } else if (wall) {
            // On a building's wall: an air conditioner, a gas meter with its pipe, a sign, an awning, a lamp.
            if (r() < 0.32) {
              const [x, z] = along(len * r());
              // (Low, standing on the ground: the units up the walls come with the building, facades.js.)
              const y = base + 0.05;
              props.box(x + rx * side * 0.15, y + 0.3, z + rz * side * 0.15, 0.4, 0.3, 0.16, outYaw, PAL.ac);
              props.box(x + rx * side * 0.0, y + 0.3, z + rz * side * 0.0, 0.17, 0.17, 0.02, outYaw, C('#3a3c40'));
            }
            if (r() < 0.2) {
              const [x, z] = along(len * r());
              props.box(x + rx * side * 0.1, base + 1.2, z + rz * side * 0.1, 0.12, 0.15, 0.08, outYaw, PAL.meter);
              props.box(x + rx * side * 0.12, base + 3.5, z + rz * side * 0.12, 0.025, 3.5, 0.025, outYaw, C('#d9c9a0'));
            }
            // (Signs and awnings belong to the shops: facades.js puts them over each shopfront.)
            r();
            r();
            if (i % 5 === (side > 0 ? 2 : 0)) lamps.push({ x: ex - rx * side * 0.55, z: ez - rz * side * 0.55, y: base + 3.4, wall: [ex + rx * side * 0.05, ez + rz * side * 0.05] });
          }
          // On the ground by the edge: planters, pots, bins, a parked scooter, steps (never out on a main road).
          const gx = ex - rx * side * 0.35;
          const gz = ez - rz * side * 0.35;
          // (and never on the course's own line, where it crosses itself or turns a corner)
          const onMain = g.onRoad?.(gx, gz, 0.4) || pts.some((q, qi) => Math.abs(qi - i) > 1 && Math.hypot(q[0] - gx, q[1] - gz) < (q[2] ?? 6) / 2 - 0.1);
          const roll = onMain ? 1 : r();
          if (roll < 0.13) {
            // A styrofoam box of greens (lettuce, chillies) — a Seoul alley's kitchen garden.
            props.box(gx, base + 0.17, gz, 0.32, 0.17, 0.22, hd, PAL.styro);
            for (let q = 0; q < 4; q++) props.box(gx + (q - 1.5) * 0.14 * ux, base + 0.42, gz + (q - 1.5) * 0.14 * uz, 0.07, 0.1, 0.07, hd + q, pick(r, PAL.greens));
            obstacles.push({ x: gx, z: gz, r: 0.38, kind: 'planter' });
          } else if (roll < 0.22) {
            for (let q = 0; q < 3; q++) {
              const ox = gx + ux * (q - 1) * 0.42;
              const oz = gz + uz * (q - 1) * 0.42;
              props.cyl(ox, base, oz, 0.15, 0.32, pick(r, PAL.pots), 7);
              props.box(ox, base + 0.45, oz, 0.13, 0.14, 0.13, q, pick(r, PAL.greens));
            }
            obstacles.push({ x: gx, z: gz, r: 0.55, kind: 'pots' });
          } else if (roll < 0.31) {
            const col = pick(r, PAL.bins);
            props.box(gx, base + 0.5, gz, 0.29, 0.5, 0.34, hd, col);
            props.box(gx, base + 1.02, gz, 0.31, 0.03, 0.37, hd, col.clone().multiplyScalar(0.8));
            props.box(gx + ux * 0.6, base + 0.22, gz + uz * 0.6, 0.22, 0.22, 0.22, hd + 0.4, C('#eef0f2'));
            obstacles.push({ x: gx, z: gz, r: 0.45, kind: 'bin' });
          } else if (roll < 0.37) {
            // A parked delivery scooter, nose to the wall.
            const col = pick(r, PAL.scooter);
            const sx = gx - rx * side * 0.25;
            const sz = gz - rz * side * 0.25;
            props.box(sx, base + 0.45, sz, 0.22, 0.25, 0.8, hd + Math.PI / 2, col);
            props.box(sx - rx * side * 0.2, base + 0.95, sz - rz * side * 0.2, 0.25, 0.22, 0.25, hd + Math.PI / 2, C('#d8402a'));
            for (const e of [-0.6, 0.6]) props.cyl(sx + rx * side * e, base, sz + rz * side * e, 0.22, 0.12, C('#1b1b1d'), 8);
            obstacles.push({ x: sx, z: sz, r: 0.6, kind: 'scooter' });
          } else if (roll < 0.42 && wall) {
            // Steps up to a door.
            for (let q = 0; q < 3; q++) props.box(ex - rx * side * (0.15 + q * 0.0), base + 0.09 + q * 0.18, ez - rz * side * (0.15 + q * 0.0), 0.6 - q * 0.04, 0.09, 0.3 - q * 0.1 + 0.15, hd + Math.PI / 2, PAL.step);
          }
          // A utility pole every 24 m, sides in turn; wires between them.
          if (i % 4 === (side > 0 ? 0 : 2) && !onMain) {
            const px = ex - rx * side * 0.25;
            const pz = ez - rz * side * 0.25;
            props.cyl(px, base, pz, 0.14, 9.5, PAL.pole, 8);
            props.box(px, base + 8.6, pz, 0.7, 0.05, 0.05, hd + Math.PI / 2, C('#6a6d74'));
            if (r() < 0.4) props.cyl(px - rx * side * 0.35, base + 6.8, pz - rz * side * 0.35, 0.22, 0.7, C('#7a7f86'), 8);
            poles.push({ x: px, z: pz, y: base + 8.6, side });
            obstacles.push({ x: px, z: pz, r: 0.25, kind: 'pole' });
          }
        }
      }
      // A convex mirror at a blind corner of the small streets.
      if (small && i > 1) {
        const p0 = at(i - 2);
        const p2 = at(i + 2);
        const bend = Math.atan2(Math.sin(Math.atan2(p2[0] - a[0], p2[1] - a[1]) - Math.atan2(a[0] - p0[0], a[1] - p0[1])), Math.cos(Math.atan2(p2[0] - a[0], p2[1] - a[1]) - Math.atan2(a[0] - p0[0], a[1] - p0[1])));
        if (Math.abs(bend) > 0.7 && r() < 0.8 && !g.onRoad?.(a[0] + rx * (bend > 0 ? 1 : -1) * (w / 2 + 0.1), a[1] + rz * (bend > 0 ? 1 : -1) * (w / 2 + 0.1), 0.3)) {
          const side = bend > 0 ? 1 : -1;
          const mx = a[0] + rx * side * (w / 2 + 0.1);
          const mz = a[1] + rz * side * (w / 2 + 0.1);
          const base = y0(mx, mz);
          props.cyl(mx, base, mz, 0.05, 2.9, PAL.mirror, 6);
          props.cyl(mx - rx * side * 0.1, base + 2.6, mz - rz * side * 0.1, 0.34, 0.08, PAL.mirror, 12);
          props.cyl(mx - rx * side * 0.14, base + 2.62, mz - rz * side * 0.14, 0.29, 0.07, C('#d9e4ee'), 12);
        }
      }
    }
    // Wires: pole to pole (three each, sagging), and a few across to the buildings.
    const wirePts = [];
    const sag = (p, q, droop) => {
      const N = 8;
      for (let s = 0; s < N; s++) {
        const t0 = s / N;
        const t1 = (s + 1) / N;
        const P = (t) => new THREE.Vector3(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t - Math.sin(Math.PI * t) * droop, p.z + (q.z - p.z) * t);
        wirePts.push(P(t0), P(t1));
      }
    };
    for (let a = 0; a < poles.length; a++) {
      for (let b = a + 1; b < Math.min(poles.length, a + 3); b++) {
        const p = poles[a];
        const q = poles[b];
        if (Math.hypot(p.x - q.x, p.z - q.z) > 40) continue;
        for (let k2 = 0; k2 < 3; k2++) sag(new THREE.Vector3(p.x, p.y - k2 * 0.35, p.z), new THREE.Vector3(q.x, q.y - k2 * 0.35, q.z), 0.5 + k2 * 0.25);
      }
      if (r() < 0.6) {
        const p = poles[a];
        sag(new THREE.Vector3(p.x, p.y - 0.8, p.z), new THREE.Vector3(p.x + (r() - 0.5) * 9, p.y - 3 - r() * 2, p.z + (r() - 0.5) * 9), 0.6);
      }
    }
    if (wirePts.length) wires.push(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePts), this.wireMat));
    const gm = ground.mesh(this.groundMat);
    const pm = props.mesh(this.mat);
    if (gm) group.add(gm);
    if (pm) group.add(pm);
    for (const w of wires) group.add(w);
    // Vertical signs: a lit box standing out from the wall, a word down each face.
    for (const s of signs) {
      const geo = new THREE.BoxGeometry(0.16, 1.5, 0.5);
      const uv = geo.attributes.uv;
      for (let q = 0; q < uv.count; q++) uv.setX(q, (s.word + uv.getX(q)) / this.signs.count);
      const m = new THREE.Mesh(geo, this.signMat);
      m.position.set(s.x, s.y, s.z);
      m.rotation.y = s.yaw;
      group.add(m);
    }
    // Alley lamps on the walls: an arm, a lamp, a glow at night.
    for (const l of lamps) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), this.mat);
      arm.position.set((l.x + l.wall[0]) / 2, l.y + 0.1, (l.z + l.wall[1]) / 2);
      arm.lookAt(l.wall[0], l.y + 0.1, l.wall[1]);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.4), this.lampMat);
      head.position.set(l.x, l.y, l.z);
      const glow = new THREE.Sprite(this.glowMat);
      glow.position.set(l.x, l.y - 0.2, l.z);
      glow.scale.setScalar(2.2);
      const pool = new THREE.Mesh(this.poolGeo, this.poolMat);
      pool.position.set(l.x, g.groundAt(l.x, l.z) + 0.93, l.z);
      group.add(arm, head, glow, pool);
    }
    this.group.add(group);
    this.obstacles.push(...obstacles);
    return { group, owned, obstacles };
  }

  _drop(k, c) {
    this.group.remove(c.group);
    c.group.traverse((o) => {
      if (o.geometry && !o.isSprite && o.geometry !== this.poolGeo) o.geometry.dispose();
    });
    for (const [cell, seg] of c.owned) {
      const list = this.g.roadHash.get(cell);
      const i = list?.indexOf(seg) ?? -1;
      if (i >= 0) list.splice(i, 1);
    }
    this.obstacles = this.obstacles.filter((o) => !c.obstacles.includes(o));
    this.chunks.delete(k);
  }

  /** Things standing in the street within `r` of a point. */
  near(x, z, r) {
    return this.obstacles.filter((o) => Math.abs(o.x - x) < r && Math.abs(o.z - z) < r);
  }

  dispose() {
    for (const [k, c] of [...this.chunks]) this._drop(k, c);
    this.g.scene.remove(this.group);
    for (const m of [this.mat, this.groundMat, this.signMat, this.lampMat, this.wireMat, this.glowMat, this.poolMat]) m.dispose();
    this.poolGeo.dispose();
    this.signs.tex.dispose();
    this.glowTex.dispose();
  }
}
