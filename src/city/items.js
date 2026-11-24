import * as THREE from 'three';
import { isSmall } from './course.js';

/**
 * Item boxes for Gangnam Jarani: bouncing picture stickers along the course
 * (rows of them across the street every couple of hundred metres, one in an
 * alley); ride through one to fill an empty slot, and use it with 1, 2 or 3.
 * What you get depends on where you are: the further back, the better.
 *
 *   energy drink — the sprint gauge full again
 *   air horn     — people and scooters ahead clear out, cars stop
 *   gold helmet  — the next crash doesn't knock you off
 *   tailwind     — five seconds of free, faster sprinting
 */
export const ITEMS = {
  drink: { name: 'Energy drink', ko: '에너지 드링크', text: 'Your sprint gauge, full again.', pop: 'DRINK!', color: '#9ef07a' },
  horn: { name: 'Air horn', ko: '에어혼', text: 'BWAAMP: people and scooters ahead clear out, cars stop.', pop: 'HORN!', color: '#ff7aa8' },
  helmet: { name: 'Gold helmet', ko: '황금 헬멧', text: 'The next crash bounces off you.', pop: 'HELMET!', color: '#ffd23a' },
  tailwind: { name: 'Tailwind', ko: '순풍', text: 'Five seconds of free, faster sprinting.', pop: 'WIND!', color: '#8fd8ff' }
};
export const ITEM_ORDER = ['drink', 'horn', 'helmet', 'tailwind'];

/** Odds by place: [leader … last]. */
const ODDS = {
  first: { drink: 0.4, helmet: 0.3, horn: 0.2, tailwind: 0.1 },
  last: { drink: 0.2, helmet: 0.15, horn: 0.25, tailwind: 0.4 }
};

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

/** Where the boxes go on a course: a row across the street every ~220 m (from 80 m in), one in a narrow street. */
export function boxSpots(course, every = 220) {
  const out = [];
  const pts = course.points;
  const n = pts.length;
  for (let along = 80; along < course.length - 40; along += every) {
    let i = 0;
    while (i < n - 1 && course.s[i] < along) i++;
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
    const w = p[2] ?? 6;
    const offs = isSmall(p[3] ?? 4) || w < 5 ? [0] : [-1.7, 0, 1.7];
    for (const o of offs) out.push({ x: p[0] + Math.cos(hd) * o, z: p[1] - Math.sin(hd) * o, i });
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
  g.fillStyle = { drink: '#e6f8d8', horn: '#ffe2ec', helmet: '#fff4c8', tailwind: '#e0f4ff' }[id] ?? '#eee';
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
  }
}

/** The box sticker in the world: a "?" badge that spins and bounces. */
function boxTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.scale(128 / 96, 128 / 96);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(48, 48, 44, 0, Math.PI * 2);
  g.fill();
  const grad = g.createLinearGradient(20, 10, 76, 86);
  grad.addColorStop(0, '#ff9ac0');
  grad.addColorStop(0.5, '#ff5f9a');
  grad.addColorStop(0.51, '#e94785');
  grad.addColorStop(1, '#c93574');
  const p = new Path2D();
  p.arc(48, 48, 38, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill(p);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke(p);
  g.font = '900 52px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.strokeText('?', 48, 52);
  g.fillStyle = '#ffffff';
  g.fillText('?', 48, 52);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.ellipse(34, 26, 12, 5, -0.5, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The boxes of one course: built near the riders, taken, and back a few seconds later. */
export class ItemBoxes {
  constructor(game, course) {
    this.g = game;
    this.spots = boxSpots(course).map((p) => ({ ...p, live: true, back: 0, y: null, phase: Math.random() * 6 }));
    this.tex = boxTexture();
    this.mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: true, alphaTest: 0.2 });
    this.group = new THREE.Group();
    game.scene.add(this.group);
    for (const s of this.spots) {
      s.sprite = new THREE.Sprite(this.mat);
      s.sprite.scale.set(1, 1, 1);
      s.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
      this.group.add(s.sprite, s.shadow);
    }
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const p = this.g.pos;
    for (const s of this.spots) {
      if (!s.live) {
        s.back -= dt;
        if (s.back <= 0) {
          s.live = true;
          s.pop = 0.35;
        }
      }
      const near = Math.hypot(s.x - p.x, s.z - p.z) < 260;
      s.sprite.visible = s.shadow.visible = s.live && near;
      if (!s.sprite.visible) continue;
      if (s.y == null || Math.random() < 0.02) s.y = this.g.surfaceAt(s.x, s.z, this.g.groundAt(s.x, s.z) + 14);
      // Bounce and spin (a sticker turning: its width goes round), and pop when it comes back.
      const bounce = Math.abs(Math.sin(this.t * 3 + s.phase)) * 0.25;
      const spin = Math.cos(this.t * 2.4 + s.phase);
      s.pop = Math.max(0, (s.pop ?? 0) - dt);
      const k = 1 + s.pop * 1.4;
      s.sprite.scale.set(0.95 * (0.25 + 0.75 * Math.abs(spin)) * k, 0.95 * k * (1 + (0.25 - bounce) * 0.2), 1);
      s.sprite.position.set(s.x, s.y + 0.85 + bounce, s.z);
      s.shadow.position.set(s.x, s.y + 0.03, s.z);
      s.shadow.scale.setScalar(1 - bounce);
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
    this.mat.dispose();
  }
}
