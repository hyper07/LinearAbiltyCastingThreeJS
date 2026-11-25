import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { isSmall } from './course.js';
import { laneBand } from './pack.js';

/**
 * Item boxes for Gangnam Jarani: spinning, glassy "?" boxes floating over the
 * road in rows across the lanes the riders use, every couple of hundred
 * metres (one or two in an alley, staggered row to row); ride through one to
 * fill an empty slot, and use it with 1, 2 or 3.
 * What you get depends on where you are: the further back, the better.
 *
 *   battery pack — the boost gauge full again
 *   air horn     — people and scooters ahead clear out, cars stop
 *   gold helmet  — the next crash doesn't knock you off
 *   tailwind     — five seconds of free, faster boosting
 *   branch       — a leafy branch: thrown into the wheel of the rider ahead,
 *                  or dropped behind you as a trap (branch.js)
 */
export const ITEMS = {
  drink: { name: 'Battery pack', ko: '보조 배터리', text: 'Your boost gauge, full again.', pop: 'CHARGE!', color: '#9ef07a' },
  horn: { name: 'Air horn', ko: '에어혼', text: 'BWAAMP: people and scooters ahead clear out, cars stop.', pop: 'HORN!', color: '#ff7aa8' },
  helmet: { name: 'Gold helmet', ko: '황금 헬멧', text: 'The next crash bounces off you.', pop: 'HELMET!', color: '#ffd23a' },
  tailwind: { name: 'Tailwind', ko: '순풍', text: 'Five seconds of free, faster boosting.', pop: 'WIND!', color: '#8fd8ff' },
  branch: { name: 'Branch', ko: '나뭇가지', text: 'Thrown into the wheel of the rider ahead (they go over the bars), or dropped behind you as a trap.', pop: 'BRANCH!', color: '#8bd450' }
};
export const ITEM_ORDER = ['drink', 'horn', 'helmet', 'tailwind', 'branch'];

/** Odds by place: [leader … last]. The further back, the more tailwinds and branches. */
const ODDS = {
  first: { drink: 0.36, helmet: 0.28, horn: 0.18, tailwind: 0.08, branch: 0.1 },
  last: { drink: 0.14, helmet: 0.1, horn: 0.16, tailwind: 0.3, branch: 0.3 }
};
/** The odds of an item for a racer in `rank` of `n` (for the tests and the menu). */
export function itemOdds(rank, n) {
  const k = n > 1 ? (rank - 1) / (n - 1) : 0;
  return Object.fromEntries(ITEM_ORDER.map((id) => [id, ODDS.first[id] + (ODDS.last[id] - ODDS.first[id]) * k]));
}

/** An item for a racer in `rank` of `n` (1 is leading). */
export function rollItem(rank, n, random = Math.random) {
  const k = n > 1 ? (rank - 1) / (n - 1) : 0;
  let r = random();
  for (const id of ITEM_ORDER) {
    r -= ODDS.first[id] + (ODDS.last[id] - ODDS.first[id]) * k;
    if (r <= 0) return id;
  }
  return ITEM_ORDER.at(-1);
}

/**
 * Where the boxes go on a course: a row every ~`every` m (from 80 m in), spread
 * evenly across the band of the street the riders keep to (pack.js laneBand),
 * at least 2.2 m apart; every other row shifted half a gap, so they don't line up.
 */
export function boxSpots(course, every = 220) {
  const out = [];
  const pts = course.points;
  const n = pts.length;
  let row = 0;
  for (let along = 80; along < course.length - 40; along += every, row++) {
    let i = 0;
    while (i < n - 1 && course.s[i] < along) i++;
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
    const w = p[2] ?? 6;
    const band = laneBand(w, isSmall(p[3] ?? 4) || w < 5, true, Boolean(p[4]));
    const span = Math.max(0, band.hi - band.lo - 0.6);
    const count = Math.max(1, Math.min(4, Math.floor(span / 2.2) + 1));
    const gap = count > 1 ? span / (count - 1) : 0;
    const shift = count > 1 && row % 2 ? gap * 0.25 : 0;
    for (let k = 0; k < count; k++) {
      const o = count > 1 ? band.lo + 0.3 + k * gap + shift - (k === count - 1 ? shift * 2 : 0) : (band.lo + band.hi) / 2;
      out.push({ x: p[0] + Math.cos(hd) * o, z: p[1] - Math.sin(hd) * o, i, row });
    }
  }
  return out;
}

/* ------------------------------------------------------------ the art */

const icons = new Map();
/**
 * An item's sticker (a data URL, for the HUD): drawn in the riders' style —
 * a clean ink line of varied weight, flat colour in two or three tones, a
 * hard highlight, on a white die-cut edge.
 */
export function itemIcon(id, size = 96) {
  const key = `${id}|${size}`;
  if (icons.has(key)) return icons.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(size / 96, size / 96);
  paintIcon(g, id);
  const url = c.toDataURL();
  icons.set(key, url);
  return url;
}

const INK = '#2a2030';
function inked(g, path, fill, w = 3) {
  g.fillStyle = fill;
  g.fill(path);
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.lineJoin = 'round';
  g.stroke(path);
}
function shadeIn(g, path, color, dx, dy) {
  g.save();
  g.clip(path);
  g.translate(dx, dy);
  g.fillStyle = color;
  g.fill(path);
  g.restore();
}

function paintIcon(g, id) {
  // The die-cut sticker edge.
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 6;
  g.shadowOffsetY = 2;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(48, 48, 42, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.fillStyle = { drink: '#e6f8d8', horn: '#ffe2ec', helmet: '#fff4c8', tailwind: '#e0f4ff', branch: '#eef6e0' }[id] ?? '#eee';
  g.beginPath();
  g.arc(48, 48, 37, 0, Math.PI * 2);
  g.fill();
  if (id === 'drink') {
    // A tall can: green, a white label band with a lightning bolt, a ring pull.
    const can = new Path2D();
    can.roundRect(34, 20, 28, 58, 6);
    inked(g, can, '#3fb68b');
    shadeIn(g, can, '#2a8a66', 12, 0);
    const band = new Path2D();
    band.rect(34, 38, 28, 20);
    g.save();
    g.clip(can);
    g.fillStyle = '#f8f6ef';
    g.fill(band);
    g.restore();
    const bolt = new Path2D('M50 40 L42 50 L48 50 L45 57 L54 46 L48 46 Z');
    inked(g, bolt, '#ffd23a', 1.6);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(38, 24, 3, 50);
    const top = new Path2D();
    top.ellipse(48, 20, 14, 4, 0, 0, Math.PI * 2);
    inked(g, top, '#c9ccd1', 2);
  } else if (id === 'horn') {
    // An air horn: a red canister and a white trumpet, blasting.
    const can = new Path2D();
    can.roundRect(22, 44, 22, 32, 5);
    inked(g, can, '#e2483d');
    shadeIn(g, can, '#a8302a', 8, 0);
    const trumpet = new Path2D('M30 44 L36 30 L66 18 L70 44 L44 40 Z');
    inked(g, trumpet, '#f4f4f2');
    shadeIn(g, trumpet, '#c9cdd6', 4, 6);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[74, 22, 84, 16], [76, 32, 88, 32], [74, 42, 84, 48]]) {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
  } else if (id === 'helmet') {
    // A gold cycling helmet: vents, a shine.
    const shell = new Path2D('M16 60 C16 30 38 18 54 18 C72 18 84 34 82 56 L70 58 C64 50 54 50 44 54 L16 60 Z');
    inked(g, shell, '#ffd23a');
    shadeIn(g, shell, '#d9a21c', 6, 8);
    g.fillStyle = INK;
    for (const [x, y] of [[34, 34], [48, 28], [62, 30], [72, 40]]) {
      g.beginPath();
      g.ellipse(x, y, 5, 3, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.ellipse(40, 26, 10, 3, -0.4, 0, Math.PI * 2);
    g.fill();
    const strap = new Path2D('M30 60 L42 76 L58 62');
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke(strap);
  } else if (id === 'tailwind') {
    // Gusts: three curling strokes and a leaf riding them.
    g.lineCap = 'round';
    for (const [y, l, w] of [[34, 56, 7], [50, 66, 8], [66, 48, 7]]) {
      const p = new Path2D(`M${18} ${y} L${18 + l} ${y} C${18 + l + 14} ${y} ${18 + l + 14} ${y - 16} ${18 + l} ${y - 14}`);
      g.strokeStyle = INK;
      g.lineWidth = w + 3;
      g.stroke(p);
      g.strokeStyle = '#6ec6f0';
      g.lineWidth = w;
      g.stroke(p);
    }
    const leaf = new Path2D('M60 72 C66 60 78 58 84 62 C80 72 70 78 60 72 Z');
    inked(g, leaf, '#9ef07a', 2);
  } else if (id === 'branch') {
    // A crooked brown stick, a snapped pale end, twigs and three bunches of leaves; motion lines behind.
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    for (const [x0, y0, x1, y1] of [[10, 58, 20, 52], [12, 70, 22, 64]]) {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    const stick = new Path2D('M22 70 L30 62 L48 54 L62 40 L80 30 L82 34 L64 46 L50 60 L32 68 L26 76 Z');
    inked(g, stick, '#8a5a34', 2.5);
    shadeIn(g, stick, '#6a4426', 0, 3);
    const end = new Path2D('M20 66 L26 62 L30 70 L24 78 Z');
    inked(g, end, '#e8d3a8', 2);
    for (const [x0, y0, x1, y1] of [[48, 55, 46, 38], [62, 42, 70, 56]]) {
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = '#8a5a34';
      g.lineWidth = 2.5;
      g.stroke();
    }
    for (const [x, y, s] of [[44, 34, 1], [72, 60, 0.9], [84, 26, 1.1]]) {
      const lf = new Path2D(`M${x} ${y - 12 * s} L${x + 5 * s} ${y - 4 * s} L${x + 12 * s} ${y - 6 * s} L${x + 8 * s} ${y + 2 * s} L${x + 11 * s} ${y + 9 * s} L${x} ${y + 6 * s} L${x - 11 * s} ${y + 9 * s} L${x - 8 * s} ${y + 2 * s} L${x - 12 * s} ${y - 6 * s} L${x - 5 * s} ${y - 4 * s} Z`);
      inked(g, lf, '#6fcf4a', 2);
      shadeIn(g, lf, '#3f9a32', 3, 3);
    }
  }
}


/** A soft round contact shadow (also under the scooters). */
export function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,0.85)');
  r.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** A "?" for the boxes' faces: white, outlined, on clear. */
function glyphTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '900 104px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 14;
  g.strokeStyle = '#2a2030';
  g.strokeText('?', 64, 70);
  g.fillStyle = '#ffffff';
  g.fillText('?', 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A rainbow round the box's edges, the faces clearer in the middle (vertex colours). */
function rainbowBox(size) {
  const g = new RoundedBoxGeometry(size, size, size, 3, size * 0.16);
  const P = g.attributes.position;
  const col = new Float32Array(P.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) / size, y = P.getY(i) / size, z = P.getZ(i) / size;
    c.setHSL((Math.atan2(z, x) / (Math.PI * 2) + 0.5 + y * 0.4) % 1, 0.85, 0.62);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** The boxes of one course: built near the riders, taken, and back a few seconds later. All in three instanced draws. */
export class ItemBoxes {
  constructor(game, course) {
    this.g = game;
    this.spots = boxSpots(course).map((p) => ({ ...p, live: true, back: 0, y: null, phase: Math.random() * 6 }));
    const n = Math.max(1, this.spots.length);
    const SIZE = 0.72;
    this.shell = new THREE.InstancedMesh(rainbowBox(SIZE), new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.62, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.8, iridescenceIOR: 1.5, emissive: '#3a2a55', emissiveIntensity: 0.35, envMapIntensity: 1.6, depthWrite: false }), n);
    this.tex = glyphTexture();
    // the "?" on all four sides and the top: a slightly smaller cube of cut-out glyphs inside the glass
    this.glyph = new THREE.InstancedMesh(new THREE.BoxGeometry(SIZE * 0.82, SIZE * 0.82, SIZE * 0.82), new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.4, transparent: false, roughness: 0.4, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }), n);
    this.shadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }), n);
    for (const m of [this.shell, this.glyph, this.shadow]) {
      m.frustumCulled = false;
      m.count = 0;
    }
    this.shell.castShadow = true;
    this.shell.renderOrder = 3;
    this.group = new THREE.Group();
    this.group.add(this.glyph, this.shell, this.shadow);
    game.scene.add(this.group);
    this.t = 0;
    this._o = new THREE.Object3D();
  }

  update(dt, camera = null) {
    this.t += dt;
    const p = this.g.pos;
    const cam = camera?.position;
    const o = this._o;
    let n = 0;
    for (const s of this.spots) {
      if (!s.live) {
        s.back -= dt;
        if (s.back <= 0) {
          s.live = true;
          s.pop = 0.35;
        }
      }
      if (!s.live || Math.hypot(s.x - p.x, s.z - p.z) > 220) continue;
      if (s.y == null || Math.random() < 0.02) s.y = this.g.surfaceAt(s.x, s.z, this.g.groundAt(s.x, s.z) + 14);
      // Float and bob, turn slowly on a tilt; pop in big when it comes back.
      const bob = Math.sin(this.t * 2.2 + s.phase) * 0.08;
      s.pop = Math.max(0, (s.pop ?? 0) - dt);
      // (one the camera is passing through shrinks away, rather than filling the screen with glass)
      const near = cam ? Math.min(1, Math.max(0, (Math.hypot(s.x - cam.x, s.y + 0.95 - cam.y, s.z - cam.z) - 1.2) / 2.3)) : 1;
      const k = (1 + s.pop * 1.6) * near;
      o.position.set(s.x, s.y + 0.95 + bob, s.z);
      o.rotation.set(0.42, this.t * 1.6 + s.phase, 0.42, 'YXZ');
      o.scale.setScalar(k);
      o.updateMatrix();
      this.shell.setMatrixAt(n, o.matrix);
      this.glyph.setMatrixAt(n, o.matrix);
      o.position.set(s.x, s.y + 0.03, s.z);
      o.rotation.set(0, 0, 0);
      o.scale.set(0.95 - bob, 1, 0.95 - bob);
      o.updateMatrix();
      this.shadow.setMatrixAt(n, o.matrix);
      n++;
    }
    for (const m of [this.shell, this.glyph, this.shadow]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }
  }

  /** A rider at (x, z) takes a box there, if there is a live one: its index, or null. */
  take(x, z) {
    for (const [i, s] of this.spots.entries()) {
      if (!s.live || Math.abs(s.x - x) > 1.4 || Math.abs(s.z - z) > 1.4) continue;
      if (Math.hypot(s.x - x, s.z - z) > 1.3) continue;
      s.live = false;
      s.back = 6;
      return i;
    }
    return null;
  }

  live() {
    return this.spots.filter((s) => s.live);
  }

  dispose() {
    this.g.scene.remove(this.group);
    this.tex.dispose();
    for (const m of [this.shell, this.glyph, this.shadow]) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
