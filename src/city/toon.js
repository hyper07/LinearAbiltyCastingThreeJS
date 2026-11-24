import * as THREE from 'three';

/**
 * The racers of Gangnam Jarani, drawn like a frame of a modern animated
 * film: young riders in summer clothes with real proportions (about seven
 * heads tall), thin clean line art, soft two-tone cel shading with small
 * bright highlights — and the wind in them: hair streaming back, an open
 * overshirt flapping behind like a cape, flying more the faster they go.
 * They stand up in the real 3D street as camera-facing cut-outs, lit by the
 * scene (in steps, to keep the cel look), so night and headlights tint them.
 *
 * Nothing is drawn by hand. Each rider is posed in 3D — the bike, the crank,
 * knees and elbows reaching for pedals and grips, hair and cloth as strips
 * blown back — and the pose is projected for a view (behind, behind-quarter,
 * side, front-quarter, front; the other side is the same picture mirrored)
 * and painted far to near. All of one rider's frames go into one atlas (one
 * texture, one draw): four pedal strokes (each a beat of the wind), four
 * standing on the pedals to sprint, coasting, braking — for every view — and
 * a crash tumble, sitting dazed, getting up, and both arms up at the finish.
 *
 *   const atlas = paintRacer(CHARACTERS.haru);        // once per racer
 *   const toon = new ToonRider(atlas);  scene.add(toon.group);
 *   toon.update(camera, { x, y, z, heading, lean, crank, standing, pedalling, mode, t });
 */

/**
 * The riders: six of our own, three young women and three young men, each
 * readable from behind by hair, build and what they carry. `spec` changes
 * their bike's handling (ride.js BIKE).
 */
export const CHARACTERS = {
  haru: {
    name: 'Haru', ko: '하루', she: true,
    text: 'Long ponytail, light-blue overshirt, a mint city bike with a basket: steady, and turns tight in the alleys.',
    h: 0.98, build: 0.92, skin: '#f2d3bd', hair: '#3a2a24', hairStyle: 'ponytail',
    shirt: '#2f6fd1', over: '#a9c9ef', shorts: '#c9b28a', socks: '#f4f4f2', shoe: '#2b3a66', sole: '#f2f0ea',
    bag: 'backpack', bagColor: '#26282e', helmet: null,
    bike: '#56c2a6', bikeKind: 'city',
    spec: { cruise: 9.3, sprint: 13.2, maxLean: 0.8, leanRate: 4.9, accel: 3.3 }
  },
  taeo: {
    name: 'Taeo', ko: '태오',
    text: 'Spiky hair, headphones, a red plaid overshirt and a black fixie: quickest off the line, nimble between cars.',
    h: 1.04, build: 1.04, skin: '#e8bf9d', hair: '#16141a', hairStyle: 'spiky',
    shirt: '#1d1f24', over: '#c4362c', overPlaid: '#7a1a16', shorts: '#6b6f78', socks: '#f4f4f2', shoe: '#f2f0ea', sole: '#d8d4cc',
    bag: 'backpack', bagColor: '#d8402a', headphones: '#f4f4f2', helmet: null,
    bike: '#2b2d33', bikeKind: 'messenger',
    spec: { cruise: 9.7, sprint: 13.7, maxLean: 0.74, leanRate: 5.4, accel: 3.9, sprintAccel: 5.2 }
  },
  sora: {
    name: 'Sora', ko: '소라', she: true,
    text: 'A short bob under a yellow helmet, a coral road bike: the fastest on a straight, twitchy on wet corners.',
    h: 0.96, build: 0.9, skin: '#f3d6c2', hair: '#1c1718', hairStyle: 'bob',
    shirt: '#f7f5f0', over: '#7fd6c0', shorts: '#4a6fa8', socks: '#f4f4f2', shoe: '#e2483d', sole: '#f2f0ea',
    bag: 'messenger', bagColor: '#e9c46a', helmet: '#ffd23a',
    bike: '#ff7a5c', bikeKind: 'road',
    spec: { cruise: 10.1, sprint: 14.2, maxLean: 0.7, leanRate: 4.0, accel: 3.0, brake: 6.6 }
  },
  rio: {
    name: 'Rio', ko: '리오',
    text: 'Tall, a backwards cap and a yellow overshirt, a white road bike: long legs, a long sprint.',
    h: 1.08, build: 0.98, skin: '#d9a77f', hair: '#2a1f1a', hairStyle: 'cap', capColor: '#1f3b6b',
    shirt: '#f2f0ea', over: '#f2c230', shorts: '#b59a6e', socks: '#f4f4f2', shoe: '#3fb68b', sole: '#f2f0ea',
    bag: 'messenger', bagColor: '#3a3c40', helmet: null,
    bike: '#eeeae2', bikeKind: 'road',
    spec: { cruise: 9.9, sprint: 14.0, maxLean: 0.72, leanRate: 4.3, accel: 3.2 }
  },
  dami: {
    name: 'Dami', ko: '다미', she: true,
    text: 'Twin buns, a striped tee and a pink overshirt, a lilac fixie: light and quick.',
    h: 0.94, build: 0.88, skin: '#f0cdb4', hair: '#6a3d28', hairStyle: 'buns',
    shirt: '#24305e', shirtStripe: '#f4f4f2', over: '#f6a6c1', shorts: '#7b8a52', socks: '#f4f4f2', shoe: '#f4f4f2', sole: '#c9c4ba',
    bag: 'backpack', bagColor: '#f2c230', headphones: '#ff7aa8', helmet: null,
    bike: '#b48ef0', bikeKind: 'messenger',
    spec: { cruise: 9.6, sprint: 13.6, maxLean: 0.76, leanRate: 5.2, accel: 3.7 }
  },
  hajin: {
    name: 'Hajin', ko: '하진',
    text: 'Curly hair, a green helmet and a denim overshirt, a fat-tyred trail bike: slower, but it grips in rain and snow.',
    h: 1.01, build: 1.12, skin: '#e5b994', hair: '#2a1d16', hairStyle: 'curly',
    shirt: '#3f8f5a', over: '#5b7fb0', shorts: '#2a2c31', socks: '#f4f4f2', shoe: '#8a5a34', sole: '#e8e2d6',
    bag: 'backpack', bagColor: '#5a6b3a', helmet: '#3fa34d',
    bike: '#e2a33a', bikeKind: 'trail',
    spec: { cruise: 9.1, sprint: 13.0, maxLean: 0.76, leanRate: 4.4, accel: 3.3, grip: 1.25 }
  }
};
export const CHARACTER_ORDER = ['haru', 'taeo', 'sora', 'rio', 'dami', 'hajin'];
/** A second look for a rider when two people pick the same one. */
export const ALT = { over: '#2b2d33', shirt: '#ff6a1a', bike: '#2b2d33', bagColor: '#ff6a1a' };

const LINE = '#2a2030';
const CELL = 288;
const COLS = 8;
const PPM = 112; // pixels a metre
const GROUND = 268; // the ground line in a cell, pixels from its top
/** Views baked, by how far round the camera is from behind the racer (radians, camera on the racer's right). */
export const VIEWS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI];
const TILT_CAM = 0.2; // the chase camera looks down a little
const BIKE_BUILD = {
  city: { step: true, bars: 'swept', tyre: 3.6, fenders: true, basket: true, lean: 0.3 },
  road: { bars: 'drop', tyre: 2.2, lean: 0.85 },
  messenger: { bars: 'flat', tyre: 2.8, deep: true, lean: 0.62 },
  trail: { bars: 'flat', tyre: 5.5, knobbly: true, lean: 0.5 }
};
/** The sun, in the picture: from the upper left. */
const SUN = { x: -0.55, y: -0.84 };

/* ------------------------------------------------------------ colour */

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** Shadow (k < 0): darker and cooler, towards a violet blue, as summer shade is. Light (k > 0): warmer, towards sunlight. */
function tone(hex, k) {
  const c = hexRgb(hex);
  if (k < 0) return rgbHex(c.map((v, i) => v * (1 + k * 0.85) + [60, 50, 110][i] * -k * 0.3));
  return rgbHex(c.map((v, i) => v + ([255, 248, 225][i] - v) * k));
}

/* --------------------------------------------------------- the pose */

const V = (x, y, z) => ({ x, y, z });
const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, k) => V(a.x * k, a.y * k, a.z * k);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.y, a.z);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const lerp = (a, b, t) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

/** Two bones from `a` reaching `t`, bending towards `pole`: the middle joint, and where the end got to. */
function reach(a, t, l1, l2, pole) {
  const d = sub(t, a);
  const dist = Math.max(0.01, Math.min(l1 + l2 - 1e-3, len(d)));
  const u = norm(d);
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = norm(sub(pole, mul(u, dot(pole, u))));
  return { mid: add(add(a, mul(u, along)), mul(p, h)), end: add(a, mul(u, dist)) };
}

/** The bike's geometry (bike frame: x right, y up, front −z). */
function bikeOf(ch) {
  const b = BIKE_BUILD[ch.bikeKind];
  const bar = b.bars === 'drop' ? V(0, 0.9, -0.48) : b.bars === 'swept' ? V(0, 0.98, -0.4) : V(0, 0.94, -0.46);
  const gw = b.bars === 'swept' ? 0.25 : b.bars === 'drop' ? 0.2 : 0.3;
  const gy = bar.y + (b.bars === 'drop' ? -0.03 : 0.02);
  const gz = bar.z + (b.bars === 'swept' ? 0.1 : b.bars === 'drop' ? -0.06 : 0);
  return { b, R: 0.34, rear: V(0, 0.34, 0.52), front: V(0, 0.34, -0.53), bb: V(0, 0.29, 0.05), seat: V(0, b.step ? 0.93 : 0.96, 0.24), headTop: V(0, b.bars === 'drop' ? 0.86 : 0.9, -0.37), headLow: V(0, 0.72, -0.41), bar, grips: [V(-gw, gy, gz), V(gw, gy, gz)] };
}

/** A person's lengths, by their height. */
const body = (ch) => {
  const k = ch.h ?? 1;
  return { thigh: 0.43 * k, shin: 0.43 * k, foot: 0.2 * k, torso: 0.47 * k, neck: 0.1 * k, head: 0.126 * k, upper: 0.28 * k, fore: 0.26 * k, hipW: 0.085 * (ch.build ?? 1), shoW: 0.165 * (ch.build ?? 1) };
};

/**
 * A rider on the bike: joints for a crank angle and how much they stand
 * (0–1), and the wind (how hard it blows on hair and cloth, and its beat).
 */
function ridingPose(ch, B, { crank = 0, stand = 0, brake = false, phase = 0, wind = 0.6 } = {}) {
  const L = body(ch);
  const c = crank;
  const CR = 0.17;
  const pedals = [add(B.bb, V(-0.11, -Math.sin(c) * CR, -Math.cos(c) * CR)), add(B.bb, V(0.11, Math.sin(c) * CR, Math.cos(c) * CR))];
  // Seated, a touch lower for a shorter rider; standing, up and forward over the bars, swaying with the stroke.
  const hip = add(B.seat, V(Math.sin(c) * 0.05 * stand, 0.05 + (L.thigh + L.shin - 0.86) * 0.6 + 0.16 * stand, -0.22 * stand));
  const tilt = B.b.lean + stand * 0.3 + (brake ? -0.18 : 0);
  const shoulder = add(hip, V(0, Math.cos(tilt) * L.torso, -Math.sin(tilt) * L.torso));
  const fwd = norm(V(0, -0.15 - Math.max(0, tilt - 0.5) * 0.2, -1));
  const head = add(shoulder, V(0, L.neck + L.head * 0.9, -0.04 - Math.max(0, tilt - 0.4) * 0.12));
  const legs = pedals.map((p, i) => {
    const s = i ? 1 : -1;
    const h = add(hip, V(s * L.hipW, -0.03, 0));
    const ankle = add(p, V(0, 0.07, 0.03));
    const k = reach(h, ankle, L.thigh, L.shin, V(s * 0.12, 0.25, -1));
    return { hip: h, knee: k.mid, ankle: k.end, toe: add(k.end, V(0, -0.05, -L.foot * 0.85)) };
  });
  const arms = B.grips.map((g, i) => {
    const s = i ? 1 : -1;
    const sh = add(shoulder, V(s * L.shoW, -0.03, 0));
    const k = reach(sh, g, L.upper, L.fore, V(s * 0.7, -0.35, 0.6));
    return { shoulder: sh, elbow: k.mid, hand: k.end };
  });
  return { hip, shoulder, head, fwd, up: V(0, 1, 0), legs, arms, wind: V(0, 0.12, 1), gust: wind, phase, tilt };
}

/* ----------------------------------------------------------- painting */

/** A projector for a view: world (bike frame) → cell pixels, and depth (bigger is nearer the camera). */
function camera(theta, mirror = false) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const ct = Math.cos(TILT_CAM);
  const st = Math.sin(TILT_CAM);
  return {
    theta,
    mirror,
    p(v) {
      const x = v.x * c - v.z * s;
      const depth = v.x * s + v.z * c;
      const y = v.y * ct - depth * st;
      return { x: CELL / 2 + (mirror ? -x : x) * PPM, y: GROUND - y * PPM };
    },
    depth: (v) => v.x * s + v.z * c,
    /** How much a direction faces the camera (1 straight at it). */
    facing: (n) => n.x * s + n.z * c
  };
}

const cross = (ax, ay, bx, by) => ax * by - ay * bx;

/** A tapered limb from a to b (pixels), widths wa → wb: thin line, two-tone cel shade, a bright edge. */
function limb(g, a, b, wa, wb, color, { line = 1.5, hi = true } = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 0.01;
  let nx = -dy / L;
  let ny = dx / L;
  // The normal pointing to the sun's side.
  if (nx * SUN.x + ny * SUN.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  const ccw = cross(nx, ny, dx, dy) > 0;
  const p = new Path2D();
  p.moveTo(a.x + (nx * wa) / 2, a.y + (ny * wa) / 2);
  p.lineTo(b.x + (nx * wb) / 2, b.y + (ny * wb) / 2);
  p.arc(b.x, b.y, wb / 2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), ccw);
  p.lineTo(a.x - (nx * wa) / 2, a.y - (ny * wa) / 2);
  p.arc(a.x, a.y, wa / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), ccw);
  p.closePath();
  const w = Math.max(wa, wb);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const grad = g.createLinearGradient(mx + (nx * w) / 2, my + (ny * w) / 2, mx - (nx * w) / 2, my - (ny * w) / 2);
  grad.addColorStop(0, hi ? tone(color, 0.35) : color);
  grad.addColorStop(0.16, color);
  grad.addColorStop(0.5, color);
  grad.addColorStop(0.58, tone(color, -0.3));
  grad.addColorStop(1, tone(color, -0.36));
  g.fillStyle = grad;
  g.fill(p);
  if (line) {
    g.strokeStyle = LINE;
    g.lineWidth = line;
    g.lineJoin = 'round';
    g.stroke(p);
  }
  return p;
}

/** Limbs drawn as one piece: every segment's outline first, then every fill, so the joints don't show. */
function chain(g, segs, line = 1.5) {
  for (const sg of segs) {
    g.save();
    g.globalCompositeOperation = 'source-over';
    limbShape(g, sg.a, sg.b, sg.wa + line * 2, sg.wb + line * 2, LINE);
    g.restore();
  }
  for (const sg of segs) {
    const dx = sg.b.x - sg.a.x;
    const dy = sg.b.y - sg.a.y;
    const L = Math.hypot(dx, dy) || 0.01;
    let nx = -dy / L;
    let ny = dx / L;
    if (nx * SUN.x + ny * SUN.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    const w = Math.max(sg.wa, sg.wb);
    const mx = (sg.a.x + sg.b.x) / 2;
    const my = (sg.a.y + sg.b.y) / 2;
    const grad = g.createLinearGradient(mx + (nx * w) / 2, my + (ny * w) / 2, mx - (nx * w) / 2, my - (ny * w) / 2);
    grad.addColorStop(0, tone(sg.color, 0.35));
    grad.addColorStop(0.16, sg.color);
    grad.addColorStop(0.5, sg.color);
    grad.addColorStop(0.58, tone(sg.color, -0.3));
    grad.addColorStop(1, tone(sg.color, -0.36));
    limbShape(g, sg.a, sg.b, sg.wa, sg.wb, grad);
  }
}
function limbShape(g, a, b, wa, wb, color) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 0.01;
  const nx = -dy / L;
  const ny = dx / L;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(a.x + (nx * wa) / 2, a.y + (ny * wa) / 2);
  g.lineTo(b.x + (nx * wb) / 2, b.y + (ny * wb) / 2);
  g.lineTo(b.x - (nx * wb) / 2, b.y - (ny * wb) / 2);
  g.lineTo(a.x - (nx * wa) / 2, a.y - (ny * wa) / 2);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(a.x, a.y, wa / 2, 0, Math.PI * 2);
  g.arc(b.x, b.y, wb / 2, 0, Math.PI * 2);
  g.fill();
}

/** A closed shape (pixels) filled with a two-tone cel shade across `box`, outlined thin. */
function cel(g, path, color, box, { line = 1.5, dir = SUN, soft = 0.06, hiK = 0.3, shadeAt = 0.55 } = {}) {
  const [x, y, w, h] = box;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(w, h) / 2;
  const grad = g.createLinearGradient(cx + dir.x * r, cy + dir.y * r, cx - dir.x * r, cy - dir.y * r);
  grad.addColorStop(0, tone(color, hiK));
  grad.addColorStop(0.2, color);
  grad.addColorStop(shadeAt, color);
  grad.addColorStop(Math.min(1, shadeAt + soft), tone(color, -0.3));
  grad.addColorStop(1, tone(color, -0.38));
  g.fillStyle = grad;
  g.fill(path);
  if (line) {
    g.strokeStyle = LINE;
    g.lineWidth = line;
    g.lineJoin = 'round';
    g.stroke(path);
  }
}

const polyPath = (pts, close = true) => {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
  if (close) p.closePath();
  return p;
};
/** A smooth closed path through points (Catmull-Rom as Béziers). */
function smooth(pts, close = true) {
  const p = new Path2D();
  const n = pts.length;
  const at = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    p.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  if (close) p.closePath();
  return p;
}
function boxOf(pts) {
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return [x0, y0, Math.max(...xs) - x0 || 1, Math.max(...ys) - y0 || 1];
}
/** The convex hull of points (a box seen from any side). */
function hull(points) {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cr(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cr(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** A thin tube (bike frame), metal or paint: the line, the colour, a glint. */
function tubeLine(g, pts, w, color, glint = true) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const path = () => {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
  };
  path();
  g.strokeStyle = LINE;
  g.lineWidth = w + 2.4;
  g.stroke();
  path();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.stroke();
  if (glint && w > 2.5) {
    g.save();
    g.translate(-w * 0.18, -w * 0.22);
    path();
    g.strokeStyle = tone(color, 0.5);
    g.lineWidth = w * 0.3;
    g.globalAlpha = 0.8;
    g.stroke();
    g.restore();
  }
}

/** A wheel: a circle in the bike's plane, seen from the view: tyre, rim, spokes (turned by `spin`). */
function wheel(g, cam, at, R, b, spin, color) {
  const ring = (r) => {
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      pts.push(cam.p(add(at, V(0, Math.sin(a) * r, Math.cos(a) * r))));
    }
    return pts;
  };
  const ctr = cam.p(at);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(60,60,72,0.7)';
  g.lineWidth = 0.9;
  for (let k = 0; k < 16; k++) {
    const a = spin + (k / 16) * Math.PI * 2;
    const q = cam.p(add(at, V(0, Math.sin(a) * R * 0.9, Math.cos(a) * R * 0.9)));
    g.beginPath();
    g.moveTo(ctr.x, ctr.y);
    g.lineTo(q.x, q.y);
    g.stroke();
  }
  const tyre = ring(R - b.tyre / PPM / 2);
  const line = (pts, w, c) => {
    g.beginPath();
    pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
    g.strokeStyle = c;
    g.lineWidth = w;
    g.stroke();
  };
  line(tyre, b.tyre + 3, LINE);
  line(tyre, b.tyre + 0.6, '#2c2c33');
  if (b.knobbly) {
    g.save();
    g.setLineDash([2, 3]);
    line(tyre, b.tyre, '#4c4c55');
    g.restore();
  }
  g.save();
  g.beginPath();
  tyre.slice(30, 46).forEach((q, i) => (i ? g.lineTo(q.x - 0.6, q.y - 0.6) : g.moveTo(q.x - 0.6, q.y - 0.6)));
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
  const rim = ring(R - b.tyre / PPM - 0.012);
  line(rim, b.deep ? 4.5 : 1.6, b.deep ? color : '#c9ccd1');
  g.fillStyle = '#9da2a8';
  g.beginPath();
  g.arc(ctr.x, ctr.y, 2.4, 0, Math.PI * 2);
  g.fill();
}

/** The bike: frame, chain, saddle, bars, mudguards, basket, lights — each part with its depth. */
function bikeParts(ch, B, cam, crank) {
  const b = B.b;
  const paint = ch.bike;
  const parts = [];
  const at = (pts) => pts.reduce((s, v) => s + cam.depth(v), 0) / pts.length;
  const tube = (pts, w, color, glint = true) => parts.push({ d: at(pts), draw: (g) => tubeLine(g, pts.map((v) => cam.p(v)), w, color, glint) });
  for (const [w, which] of [[B.rear, 'rear'], [B.front, 'front']]) parts.push({ d: cam.depth(w), draw: (g) => wheel(g, cam, w, B.R, b, crank * 2.8 + (which === 'rear' ? 0.3 : 0), paint) });
  const seatTop = V(0, b.step ? 0.78 : 0.84, 0.2);
  tube([B.bb, B.headLow], 4.6, paint);
  tube([B.bb, seatTop], 4.2, paint);
  if (b.step) tube([V(0, 0.42, 0.08), V(0, 0.64, -0.4)], 4.2, paint);
  else tube([V(0, seatTop.y - 0.03, seatTop.z), V(0, B.headTop.y - 0.04, B.headTop.z)], 4, paint);
  tube([B.headLow, B.headTop], 5, paint);
  for (const s of [-1, 1]) {
    tube([V(s * 0.03, B.bb.y, B.bb.z), V(s * 0.06, B.rear.y, B.rear.z)], 2.4, paint, false);
    tube([V(s * 0.02, seatTop.y - 0.04, seatTop.z + 0.01), V(s * 0.06, B.rear.y, B.rear.z)], 2.2, paint, false);
    tube([V(s * 0.05, B.headLow.y, B.headLow.z), V(s * 0.05, B.front.y, B.front.z)], b.knobbly ? 3.8 : 2.6, b.knobbly ? '#2a2c31' : paint, false);
  }
  tube([seatTop, V(0, B.seat.y - 0.04, B.seat.z + 0.02)], 2.4, '#9da2a8', false);
  tube([V(0, B.seat.y - 0.03, B.seat.z + 0.1), V(0, B.seat.y - 0.02, B.seat.z - 0.12)], b.step ? 7 : 5.5, '#232328');
  for (const [ry, cy] of [[0.095, 0.04], [-0.095, -0.04]]) tube([V(0.06, B.bb.y + ry, B.bb.z), V(0.06, B.rear.y + cy, B.rear.z)], 1.2, '#6a6d74', false);
  parts.push({ d: cam.depth(V(0.06, B.bb.y, B.bb.z)), draw: (g) => { const pts = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; pts.push(cam.p(add(V(0.06, B.bb.y, B.bb.z), V(0, Math.sin(a) * 0.1, Math.cos(a) * 0.1)))); } tubeLine(g, pts, 2, '#c9ccd1', false); } });
  const CR = 0.17;
  const pedals = [add(B.bb, V(-0.11, -Math.sin(crank) * CR, -Math.cos(crank) * CR)), add(B.bb, V(0.11, Math.sin(crank) * CR, Math.cos(crank) * CR))];
  for (const pd of pedals) parts.push({ d: cam.depth(pd), draw: (g) => { tubeLine(g, [cam.p(V(pd.x, B.bb.y, B.bb.z)), cam.p(pd)], 2.8, '#9da2a8', false); const q = cam.p(pd); g.fillStyle = LINE; g.fillRect(q.x - 6, q.y - 2, 12, 4); } });
  tube([B.headTop, V(0, B.bar.y, B.bar.z)], 3, '#9da2a8', false);
  if (b.bars === 'drop') {
    tube([V(-0.2, B.bar.y, B.bar.z), V(0.2, B.bar.y, B.bar.z)], 3, '#2a2b30', false);
    for (const s of [-1, 1]) tube([V(s * 0.2, B.bar.y, B.bar.z), V(s * 0.2, B.bar.y - 0.02, B.bar.z - 0.08), V(s * 0.2, B.bar.y - 0.14, B.bar.z - 0.08), V(s * 0.2, B.bar.y - 0.16, B.bar.z + 0.02)], 3, '#2a2b30', false);
  } else tube([B.grips[0], V(0, B.bar.y, B.bar.z), B.grips[1]], 2.8, b.bars === 'swept' ? '#c9ccd1' : '#2a2b30', false);
  if (b.fenders) {
    for (const [w, a0, a1] of [[B.rear, -0.4, 1.9], [B.front, -1.6, 0.6]]) {
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const a = a0 + ((a1 - a0) * k) / 12;
        pts.push(add(w, V(0, Math.sin(a + Math.PI / 2) * (B.R + 0.04), Math.cos(a + Math.PI / 2) * (B.R + 0.04))));
      }
      tube(pts, 2.8, tone(paint, 0.15), false);
    }
  }
  if (b.basket) {
    parts.push({
      d: cam.depth(V(0, 0.86, -0.6)),
      draw: (g) => {
        const q = [V(-0.16, 0.76, -0.48), V(0.16, 0.76, -0.48), V(0.16, 0.76, -0.72), V(-0.16, 0.76, -0.72), V(-0.17, 0.97, -0.47), V(0.17, 0.97, -0.47), V(0.17, 0.97, -0.73), V(-0.17, 0.97, -0.73)].map((v) => cam.p(v));
        const h = hull(q);
        const p = polyPath(h);
        cel(g, p, '#c99a5e', boxOf(h));
        g.save();
        g.clip(p);
        g.strokeStyle = 'rgba(110,70,30,0.45)';
        g.lineWidth = 1;
        const bb = boxOf(h);
        for (let y = bb[1]; y < bb[1] + bb[3]; y += 4) {
          g.beginPath();
          g.moveTo(bb[0], y);
          g.lineTo(bb[0] + bb[2], y);
          g.stroke();
        }
        g.restore();
        // A baguette and a bunch of flowers poking out.
        tubeLine(g, [cam.p(V(-0.05, 0.92, -0.58)), cam.p(V(-0.09, 1.12, -0.52))], 5, '#e3b46a');
        const f = cam.p(V(0.07, 1.04, -0.64));
        for (const [dx, dy, c] of [[0, 0, '#ff7aa8'], [4, -3, '#ffd23a'], [-3, -4, '#ffffff']]) {
          g.fillStyle = c;
          g.beginPath();
          g.arc(f.x + dx, f.y + dy, 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
  }
  const tail = b.fenders ? V(0, 0.62, 0.86) : V(0, 0.86, 0.32);
  parts.push({ d: cam.depth(tail), draw: (g) => { const q = cam.p(tail); g.fillStyle = LINE; g.fillRect(q.x - 4, q.y - 3, 8, 6); g.fillStyle = '#ff2a2a'; g.fillRect(q.x - 3, q.y - 2, 6, 4); } });
  const lamp = b.basket ? V(0, 0.72, -0.6) : V(0.05, B.bar.y - 0.05, B.bar.z - 0.03);
  parts.push({ d: cam.depth(lamp), draw: (g) => { const q = cam.p(lamp); g.fillStyle = LINE; g.beginPath(); g.arc(q.x, q.y, 4.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(q.x, q.y, 2.8, 0, Math.PI * 2); g.fill(); } });
  return parts;
}

/* ------------------------------------------------------------- people */

/** A strip of hair or cloth blown in the wind: from a root, along `dir`, waving with the gust's beat. */
function strand(root, dir, length, gust, phase, k, sideways = V(1, 0, 0), up = V(0, 1, 0)) {
  const pts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const wave = Math.sin(phase * Math.PI * 2 + t * 4 + k * 1.7) * 0.05 * t * gust;
    const lift = Math.sin(phase * Math.PI + k) * 0.03 * t * gust;
    pts.push(add(add(add(root, mul(dir, length * t)), mul(sideways, wave)), mul(up, lift - t * t * 0.06 * (1 - gust))));
  }
  return pts;
}

/** A ribbon through points (pixels) from width w0 to w1: hair locks, a ponytail. */
function ribbon(g, pts, w0, color, { line = 1.2, w1 = 0 } = {}) {
  if (pts.length < 2) return null;
  const left = [];
  const right = [];
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    left.push({ x: q.x - (dy / L) * w, y: q.y + (dx / L) * w });
    right.push({ x: q.x + (dy / L) * w, y: q.y - (dx / L) * w });
  });
  const outline = [...left, ...right.reverse()];
  const p = smooth(outline, true);
  cel(g, p, color, boxOf(outline), { line, hiK: 0.25, shadeAt: 0.5 });
  return p;
}

/**
 * The outline of part of a head-sized sphere, seen from a view: every
 * direction on it that `mask(right, up, fwd)` keeps, scaled out by `puff`,
 * projected, and wrapped (a hair mass, a helmet shell). `side` keeps only
 * the near half (+1) or the far half (−1) of it, for drawing in front of or
 * behind the face.
 */
function shell(cam, c3, r3, fwd, right, mask, { puff = 1.06, side = 0 } = {}) {
  const up = norm(sub(V(0, 1, 0), mul(fwd, dot(V(0, 1, 0), fwd))));
  const pts = [];
  const cd = cam.depth(c3);
  for (let i = 0; i <= 12; i++) {
    const lat = -Math.PI / 2 + (Math.PI * i) / 12;
    for (let j = 0; j < 24; j++) {
      const lon = (Math.PI * 2 * j) / 24;
      const r = Math.cos(lat) * Math.cos(lon);
      const u = Math.sin(lat);
      const f = Math.cos(lat) * Math.sin(lon);
      if (!mask(r, u, f)) continue;
      const v = add(c3, mul(add(add(mul(right, r), mul(up, u)), mul(fwd, f)), r3 * puff));
      const d = cam.depth(v) - cd;
      if (side > 0 && d < -r3 * 0.15) continue;
      if (side < 0 && d > r3 * 0.15) continue;
      pts.push(cam.p(v));
    }
  }
  return pts.length > 2 ? hull(pts) : null;
}

/** The head: hair at the back (blown), the head, the face if seen, hair on top, helmet or cap, headphones. */
function headParts(ch, J, cam, mood) {
  const L = body(ch);
  const r3 = L.head;
  const c3 = J.head;
  const fwd = J.fwd;
  const right = norm(V(-fwd.z, 0, fwd.x));
  const parts = [];
  const D = (v) => cam.depth(v);
  const hair = ch.hair;
  const gust = J.gust ?? 0.6;
  const wind = J.wind ?? V(0, 0.1, 1);
  const style = ch.hairStyle;
  // Where there is hair on the head (right, up, forward on the head): all but the face and the neck.
  const hairMask = (r, u, f) => (style === 'spiky' || style === 'cap' ? u > -0.25 - Math.max(0, -f) * 0.45 && !(f > 0.3 && u < 0.4) : u > -0.35 - Math.max(0, -f) * 0.55 && !(f > 0.35 && u < 0.42 && Math.abs(r) < 0.75));
  const puff = style === 'curly' ? 1.2 : style === 'spiky' ? 1.06 : style === 'bob' ? 1.1 : 1.05;
  const locks = [];
  if (style === 'ponytail') {
    const root = add(c3, add(mul(fwd, -r3 * 0.85), V(0, r3 * 0.35, 0)));
    locks.push({ pts: strand(root, norm(add(wind, V(0, -0.35, 0))), 0.42 * (0.75 + 0.35 * gust), gust, J.phase, 0, right), w: r3 * PPM * 0.9, w1: 2 });
    for (let k = 0; k < 3; k++) locks.push({ pts: strand(add(root, mul(right, (k - 1) * 0.03)), norm(add(wind, V((k - 1) * 0.15, -0.2 - k * 0.1, 0))), 0.3 + k * 0.05, gust, J.phase, k + 1, right), w: r3 * PPM * 0.4, w1: 0.5 });
  } else if (style === 'bob' || style === 'curly') {
    for (let k = -2; k <= 2; k++) locks.push({ pts: strand(add(add(c3, mul(right, k * r3 * 0.38)), add(V(0, -r3 * 0.15, 0), mul(fwd, -r3 * 0.5))), norm(add(wind, V(k * 0.25, -0.5, 0))), (style === 'bob' ? 0.14 : 0.08) * (0.8 + 0.4 * gust), gust, J.phase, k, right), w: r3 * PPM * 0.6, w1: style === 'curly' ? r3 * PPM * 0.35 : 1 });
  } else if (style === 'buns') {
    for (let k = -1; k <= 1; k += 2) locks.push({ pts: strand(add(c3, add(mul(right, k * r3 * 0.5), add(V(0, -r3 * 0.3, 0), mul(fwd, -r3 * 0.6)))), norm(add(wind, V(k * 0.3, -0.6, 0))), 0.12, gust, J.phase, k, right), w: r3 * PPM * 0.25, w1: 0.5 });
  } else {
    for (let k = -1; k <= 1; k++) locks.push({ pts: strand(add(c3, add(mul(right, k * r3 * 0.4), add(V(0, r3 * 0.2, 0), mul(fwd, -r3 * 0.7)))), norm(add(wind, V(k * 0.2, 0.15, 0))), 0.07 * (0.6 + 0.6 * gust), gust, J.phase, k, right), w: r3 * PPM * 0.45, w1: 0.5 });
  }
  for (const lk of locks) parts.push({ d: D(lk.pts[2]) - 0.03, draw: (g) => ribbon(g, lk.pts.map((v) => cam.p(v)), lk.w, hair, { w1: lk.w1 }) });
  if (style === 'buns') for (const k of [-1, 1]) {
    const bun = add(c3, add(mul(right, k * r3 * 0.6), add(V(0, r3 * 0.78, 0), mul(fwd, -r3 * 0.15))));
    parts.push({ d: D(bun) + (D(bun) > D(c3) ? 0.02 : -0.02), draw: (g) => { const q = cam.p(bun); const r = r3 * PPM * 0.45; const p = new Path2D(); p.arc(q.x, q.y, r, 0, Math.PI * 2); cel(g, p, hair, [q.x - r, q.y - r, r * 2, r * 2]); } });
  }
  parts.push({
    d: D(c3),
    draw: (g) => {
      const facing = cam.facing(fwd);
      // Hair on the far side of the head first: it frames the head.
      const back = shell(cam, c3, r3, fwd, right, hairMask, { puff, side: -1 });
      if (back) cel(g, smooth(back, true), hair, boxOf(back), { line: 1.3, hiK: 0.3, shadeAt: 0.6 });
      for (const s of [-1, 1]) {
        if (cam.facing(mul(right, s)) < -0.3) continue;
        const eq = cam.p(add(c3, add(mul(right, s * r3 * 0.95), V(0, -r3 * 0.12, 0))));
        const ep = new Path2D();
        ep.ellipse(eq.x, eq.y, r3 * PPM * 0.16, r3 * PPM * 0.25, 0, 0, Math.PI * 2);
        cel(g, ep, ch.skin, [eq.x - 4, eq.y - 6, 8, 12], { line: 1 });
      }
      // The head and jaw: a sphere narrowing to the chin.
      const skin = shell(cam, c3, r3, fwd, right, () => true, { puff: 0.98 });
      const chin = [];
      for (const s of [-1, -0.5, 0, 0.5, 1]) chin.push(cam.p(add(c3, add(add(mul(right, s * r3 * 0.55), V(0, -r3 * (1.15 - Math.abs(s) * 0.25), 0)), mul(fwd, r3 * (0.45 - Math.abs(s) * 0.25))))));
      const outline = hull([...skin, ...chin]);
      cel(g, smooth(outline, true), ch.skin, boxOf(outline), { line: 1.3, hiK: 0.2, shadeAt: 0.62 });
      if (facing > -0.15) face(g, ch, cam, c3, r3, fwd, right, mood, facing);
      // Hair on the near side, over the head: the crown, the back, the fringe.
      const front = shell(cam, c3, r3, fwd, right, hairMask, { puff, side: 1 });
      if (front) {
        const p = smooth(front, true);
        cel(g, p, hair, boxOf(front), { line: 1.3, hiK: 0.32, shadeAt: 0.6 });
        const c = cam.p(c3);
        const r = r3 * PPM;
        g.save();
        g.clip(p);
        g.strokeStyle = tone(hair, 0.55);
        g.globalAlpha = 0.55;
        g.lineWidth = 1.6;
        g.beginPath();
        g.ellipse(c.x - r * 0.1, c.y - r * 0.25, r * 0.65, r * 0.45, -0.3, Math.PI * 1.05, Math.PI * 1.55);
        g.stroke();
        g.globalAlpha = 0.4;
        g.strokeStyle = tone(hair, -0.45);
        g.lineWidth = 0.9;
        for (let k = -3; k <= 3; k++) {
          g.beginPath();
          g.moveTo(c.x + k * r * 0.2, c.y - r * 1.1);
          g.quadraticCurveTo(c.x + k * r * 0.28 + Math.sin(J.phase * 6.28 + k) * 2 * gust, c.y - r * 0.3, c.x + k * r * 0.34, c.y + r * 0.3);
          g.stroke();
        }
        g.restore();
        // A fringe over the brow, lifted by the wind.
        if (facing > 0.1 && style !== 'spiky') {
          for (let k = -2; k <= 2; k++) {
            const a = cam.p(add(c3, add(mul(right, k * r3 * 0.3), add(V(0, r3 * 0.62, 0), mul(fwd, r3 * 0.75)))));
            const b = cam.p(add(c3, add(mul(right, k * r3 * 0.34 + Math.sin(J.phase * 6.28 + k) * r3 * 0.06 * gust), add(V(0, r3 * (0.22 + gust * 0.12), 0), mul(fwd, r3 * 0.98)))));
            ribbon(g, [a, { x: (a.x + b.x) / 2 + 1, y: (a.y + b.y) / 2 }, b], r * 0.32, hair, { line: 1, w1: 0.5 });
          }
        }
      }
      if (style === 'spiky' || style === 'curly') {
        const n = style === 'spiky' ? 7 : 10;
        for (let k = 0; k < n; k++) {
          const a = Math.PI * (0.12 + (0.76 * k) / (n - 1));
          const dir = norm(add(add(mul(right, Math.cos(a)), V(0, Math.sin(a), 0)), mul(fwd, -0.35)));
          if (cam.depth(add(c3, dir)) < cam.depth(c3) - 0.3) continue;
          const base = cam.p(add(c3, mul(dir, r3 * puff * 0.92)));
          if (style === 'curly') {
            const cp = new Path2D();
            cp.arc(base.x, base.y, r3 * PPM * 0.26, 0, Math.PI * 2);
            cel(g, cp, hair, [base.x - 4, base.y - 4, 8, 8], { line: 1 });
          } else {
            const tip = cam.p(add(add(c3, mul(dir, r3 * 1.5)), mul(V(0, 0.1, 1), 0.04 + 0.03 * Math.sin(J.phase * 6.28 + k))));
            cel(g, polyPath([{ x: base.x - 3.5, y: base.y + 1 }, tip, { x: base.x + 3.5, y: base.y + 1 }]), hair, boxOf([base, tip]), { line: 1 });
          }
        }
      }
    }
  });
  if (ch.helmet || J.goldHelmet) parts.push({ d: D(c3) + 0.01, draw: (g) => helmet(g, cam, c3, r3, fwd, right, J.goldHelmet ? '#ffd23a' : ch.helmet) });
  else if (style === 'cap') parts.push({ d: D(c3) + 0.01, draw: (g) => cap(g, ch, cam, c3, r3, fwd, right) });
  if (ch.headphones) parts.push({ d: D(c3) + 0.012, draw: (g) => headphones(g, ch, cam, c3, r3, right) });
  return parts;
}

function helmet(g, cam, c3, r3, fwd, right, color) {
  const pts = shell(cam, c3, r3, fwd, right, (r, u, f) => u > 0.12 - Math.max(0, -f) * 0.35 + Math.max(0, f) * 0.05, { puff: 1.2 });
  if (!pts) return;
  const p = smooth(pts, true);
  cel(g, p, color, boxOf(pts), { line: 1.4, hiK: 0.5, shadeAt: 0.55 });
  g.save();
  g.clip(p);
  g.fillStyle = 'rgba(30,24,40,0.7)';
  for (const k of [-0.45, 0, 0.45]) {
    const v = cam.p(add(c3, mul(norm(add(add(mul(right, k), V(0, 0.9, 0)), mul(fwd, 0.1))), r3 * 1.21)));
    g.beginPath();
    g.ellipse(v.x, v.y, r3 * PPM * 0.11, r3 * PPM * 0.055, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  if (cam.facing(fwd) > -0.3) {
    const a = cam.p(add(c3, add(mul(right, -r3 * 0.6), add(V(0, r3 * 0.32, 0), mul(fwd, r3 * 1.05)))));
    const b = cam.p(add(c3, add(mul(right, r3 * 0.6), add(V(0, r3 * 0.32, 0), mul(fwd, r3 * 1.05)))));
    const c = cam.p(add(c3, add(V(0, r3 * 0.28, 0), mul(fwd, r3 * 1.4))));
    cel(g, smooth([a, c, b], true), tone(color, -0.15), boxOf([a, b, c]), { line: 1.2 });
  }
}

function cap(g, ch, cam, c3, r3, fwd, right) {
  // A cap worn backwards: the crown over the head, the peak sticking out behind.
  const pts = shell(cam, c3, r3, fwd, right, (r, u) => u > 0.25, { puff: 1.12 });
  if (pts) cel(g, smooth(pts, true), ch.capColor, boxOf(pts), { line: 1.4 });
  const at = (x, y, z) => cam.p(add(c3, add(add(mul(right, x * r3), V(0, y * r3, 0)), mul(fwd, z * r3))));
  const peak = [at(-0.6, 0.35, -0.85), at(0.6, 0.35, -0.85), at(0.5, 0.22, -1.7), at(-0.5, 0.22, -1.7)];
  cel(g, polyPath(peak), tone(ch.capColor, -0.1), boxOf(peak), { line: 1.3 });
}

function face(g, ch, cam, c3, r3, fwd, right, mood, facing) {
  const pt = (x, y, z) => cam.p(add(c3, add(add(mul(right, x * r3), V(0, y * r3, 0)), mul(fwd, z * r3))));
  const r = r3 * PPM;
  const vis = (x) => cam.facing(norm(add(mul(right, x), mul(fwd, 0.8)))) > -0.1;
  for (const s of [-1, 1]) {
    if (!vis(s * 0.4)) continue;
    const q = pt(s * 0.36, -0.05, 0.86);
    const w = r * 0.13 * (0.4 + 0.6 * Math.abs(cam.facing(norm(add(mul(right, s * 0.4), fwd)))));
    const h = r * (mood === 'push' ? 0.1 : 0.17);
    g.save();
    if (mood === 'crash' || mood === 'dizzy') {
      g.strokeStyle = LINE;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(q.x - w * s, q.y - h * 0.7);
      g.lineTo(q.x + w * s, q.y);
      g.lineTo(q.x - w * s, q.y + h * 0.7);
      g.stroke();
    } else if (mood === 'win') {
      g.strokeStyle = LINE;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(q.x - w, q.y + 1);
      g.quadraticCurveTo(q.x, q.y - h, q.x + w, q.y + 1);
      g.stroke();
    } else {
      g.fillStyle = '#3a2a3a';
      g.beginPath();
      g.ellipse(q.x, q.y, w, h, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(q.x - w * 0.3, q.y - h * 0.35, Math.max(0.7, w * 0.35), 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = LINE;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(q.x - w * 1.3, q.y - h * 0.9);
      g.quadraticCurveTo(q.x, q.y - h * 1.5, q.x + w * 1.3, q.y - h * 0.8);
      g.stroke();
      if (mood === 'push') {
        g.beginPath();
        g.moveTo(q.x - w * 1.2, q.y - h * 2.2 - s);
        g.lineTo(q.x + w * 1.2, q.y - h * 1.6 + s);
        g.stroke();
      }
    }
    g.restore();
  }
  const nose = pt(0.02, -0.32, 1.0);
  g.strokeStyle = tone(ch.skin, -0.35);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(nose.x, nose.y - 2);
  g.lineTo(nose.x + 1, nose.y);
  g.stroke();
  const m = pt(0, -0.58, 0.88);
  g.strokeStyle = LINE;
  g.lineWidth = 1.2;
  const f = Math.max(0.35, facing);
  if (mood === 'win' || mood === 'crash' || mood === 'brake') {
    g.fillStyle = '#8a3040';
    g.beginPath();
    if (mood === 'win') {
      g.moveTo(m.x - r * 0.22 * f, m.y - 1);
      g.quadraticCurveTo(m.x, m.y + r * 0.24, m.x + r * 0.22 * f, m.y - 1);
    } else g.ellipse(m.x, m.y + 1, r * 0.08, r * 0.1, 0, 0, Math.PI * 2);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (mood === 'push') {
    g.fillStyle = '#ffffff';
    g.fillRect(m.x - r * 0.14 * f, m.y - 1, r * 0.28 * f, r * 0.08);
    g.strokeRect(m.x - r * 0.14 * f, m.y - 1, r * 0.28 * f, r * 0.08);
  } else {
    g.beginPath();
    g.moveTo(m.x - r * 0.12 * f, m.y);
    g.quadraticCurveTo(m.x, m.y + 2, m.x + r * 0.12 * f, m.y - 0.5);
    g.stroke();
  }
  for (const s of [-1, 1]) {
    if (!vis(s * 0.55)) continue;
    const q = pt(s * 0.52, -0.35, 0.72);
    g.fillStyle = 'rgba(255,120,120,0.28)';
    g.beginPath();
    g.ellipse(q.x, q.y, r * 0.13, r * 0.07, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function headphones(g, ch, cam, c3, r3, right) {
  const band = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (k / 10);
    band.push(cam.p(add(c3, mul(add(mul(right, Math.cos(a) * 1.08), V(0, Math.sin(a) * 1.12, 0)), r3))));
  }
  tubeLine(g, band, 2.4, ch.headphones, false);
  for (const s of [-1, 1]) {
    if (cam.facing(mul(right, s)) < -0.5) continue;
    const q = cam.p(add(c3, mul(right, s * r3 * 1.02)));
    const p = new Path2D();
    p.ellipse(q.x, q.y, r3 * PPM * 0.28, r3 * PPM * 0.36, 0, 0, Math.PI * 2);
    cel(g, p, ch.headphones, [q.x - 5, q.y - 6, 10, 12], { line: 1.2 });
  }
}

/** The body: legs, the shirt, the overshirt blown back, the bag, arms, hands — each with its depth. */
function bodyParts(ch, J, cam, mood) {
  const L = body(ch);
  const parts = [];
  const D = (v) => cam.depth(v);
  const P = (v) => cam.p(v);
  const px = PPM;
  for (const leg of J.legs) {
    const far = D(leg.knee) < D(J.hip) - 0.02;
    const sh = (c) => (far ? tone(c, -0.12) : c);
    const above = lerp(leg.hip, leg.knee, 0.8);
    const sock = lerp(leg.knee, leg.ankle, 0.8);
    parts.push({
      d: (D(leg.hip) + D(leg.knee) + D(leg.ankle)) / 3,
      draw: (g) => {
        chain(g, [
          { a: P(leg.hip), b: P(leg.knee), wa: 0.15 * px, wb: 0.1 * px, color: sh(ch.skin) },
          { a: P(leg.knee), b: P(leg.ankle), wa: 0.095 * px, wb: 0.06 * px, color: sh(ch.skin) }
        ]);
        limb(g, P(leg.hip), P(above), 0.18 * px * (ch.build ?? 1), 0.145 * px, sh(ch.shorts), { line: 1.3 });
        limb(g, P(sock), P(leg.ankle), 0.07 * px, 0.066 * px, sh(ch.socks), { line: 1.1 });
        limb(g, P(leg.ankle), P(leg.toe), 0.105 * px, 0.09 * px, sh(ch.shoe), { line: 1.3 });
        const a = P(leg.ankle);
        const t = P(leg.toe);
        limb(g, { x: a.x, y: a.y + 2.5 }, { x: t.x, y: t.y + 2.5 }, 0.035 * px, 0.035 * px, ch.sole, { hi: false, line: 1 });
      }
    });
  }
  // The open overshirt: two panels from the shoulders, their hems streaming back and flapping.
  const right = norm(V(-J.fwd.z, 0, J.fwd.x));
  const backDir = norm(add(mul(norm(V(J.fwd.x, 0, J.fwd.z)), -1), V(0, 0.12, 0)));
  const torsoDir = norm(sub(J.shoulder, J.hip));
  const gust = J.gust ?? 0.6;
  for (const s of [-1, 1]) {
    const sho = add(J.shoulder, mul(right, s * L.shoW * 1.05));
    const neck = add(J.shoulder, add(mul(right, s * 0.05), mul(J.fwd, 0.04)));
    const waist = add(J.hip, add(mul(right, s * L.shoW * 0.95), V(0, 0.06, 0)));
    const flap = (k) => Math.sin(J.phase * Math.PI * 2 + k + s) * 0.06 * gust;
    const hemOut = add(add(waist, mul(backDir, 0.18 + 0.28 * gust)), add(mul(right, s * (0.08 + flap(0) + 0.06 * gust)), V(0, 0.05 * gust + flap(1), 0)));
    const hemIn = add(add(lerp(J.hip, waist, 0.3), mul(backDir, 0.12 + 0.3 * gust)), add(mul(right, s * flap(2)), V(0, 0.1 * gust + flap(3), 0)));
    const mid = add(lerp(sho, waist, 0.5), add(mul(backDir, 0.06 + 0.12 * gust), mul(right, s * 0.04)));
    const pts3 = [neck, sho, mid, hemOut, hemIn, add(lerp(J.shoulder, J.hip, 0.4), mul(backDir, 0.05))];
    parts.push({
      d: Math.min(D(sho), D(hemOut)) - 0.01,
      draw: (g) => {
        const q = pts3.map(P);
        const p = smooth(q, true);
        cel(g, p, ch.over, boxOf(q), { line: 1.3, hiK: 0.4, shadeAt: 0.5 });
        if (ch.overPlaid) {
          g.save();
          g.clip(p);
          g.strokeStyle = ch.overPlaid;
          g.globalAlpha = 0.5;
          g.lineWidth = 2;
          const [x, y, w, h] = boxOf(q);
          for (let k = x; k < x + w; k += 7) {
            g.beginPath();
            g.moveTo(k, y);
            g.lineTo(k, y + h);
            g.stroke();
          }
          for (let k = y; k < y + h; k += 7) {
            g.beginPath();
            g.moveTo(x, k);
            g.lineTo(x + w, k);
            g.stroke();
          }
          g.restore();
        }
        g.strokeStyle = tone(ch.over, -0.35);
        g.lineWidth = 1;
        g.beginPath();
        const a = q[1];
        const b = q[3];
        g.moveTo(a.x, a.y);
        g.quadraticCurveTo((a.x + b.x) / 2 + 3, (a.y + b.y) / 2, b.x, b.y);
        g.stroke();
      }
    });
  }
  // The shirt (torso): a tapered block from hips to shoulders, as wide as it looks from here.
  const wide = (w, d) => (w * Math.abs(Math.cos(cam.theta)) + d * Math.abs(Math.sin(cam.theta))) * px;
  parts.push({
    d: D(lerp(J.hip, J.shoulder, 0.5)),
    draw: (g) => {
      const p = limb(g, P(add(J.hip, mul(torsoDir, 0.05))), P(add(J.shoulder, mul(torsoDir, -0.02))), wide(0.27 * (ch.build ?? 1), 0.18), wide(0.36 * (ch.build ?? 1), 0.2), ch.shirt);
      if (ch.shirtStripe) {
        g.save();
        g.clip(p);
        g.strokeStyle = ch.shirtStripe;
        g.lineWidth = 2.4;
        const a = P(J.hip);
        const b = P(J.shoulder);
        for (let t = 0.15; t < 1; t += 0.17) {
          const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          g.beginPath();
          g.moveTo(m.x - 30, m.y);
          g.lineTo(m.x + 30, m.y);
          g.stroke();
        }
        g.restore();
      }
      limb(g, P(J.shoulder), P(add(J.shoulder, V(0, L.neck, 0))), 0.075 * px, 0.065 * px, ch.skin);
    }
  });
  // The bag: a backpack on the back (straps over the shoulders), or a messenger bag on the hip.
  if (ch.bag === 'backpack') {
    const c = add(lerp(J.hip, J.shoulder, 0.58), mul(J.fwd, -0.16));
    const u = torsoDir;
    const f = J.fwd;
    const corners = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const k of [-1, 1]) corners.push(add(c, add(add(mul(right, a * 0.14 * (ch.build ?? 1)), mul(u, b * 0.18)), mul(f, k * 0.07))));
    parts.push({
      d: D(c) + (cam.facing(f) < 0 ? 0.08 : -0.08),
      draw: (g) => {
        const h = hull(corners.map(P));
        cel(g, smooth(h, true), ch.bagColor, boxOf(h), { line: 1.4, hiK: 0.35 });
        if (cam.facing(f) < 0.2) {
          const pk = P(add(add(c, mul(u, -0.07)), mul(f, -0.075)));
          const pp = new Path2D();
          pp.roundRect(pk.x - 9, pk.y - 5, 18, 11, 3);
          cel(g, pp, tone(ch.bagColor, -0.12), [pk.x - 9, pk.y - 5, 18, 11], { line: 1 });
        }
      }
    });
    if (cam.facing(J.fwd) > -0.2) for (const s of [-1, 1]) parts.push({ d: D(J.shoulder) + 0.06, draw: (g) => tubeLine(g, [P(add(J.shoulder, mul(right, s * 0.1))), P(add(lerp(J.hip, J.shoulder, 0.35), mul(right, s * 0.12)))], 2.4, tone(ch.bagColor, -0.25), false) });
  } else if (ch.bag === 'messenger') {
    const bagC = add(add(J.hip, mul(right, -0.18)), add(mul(J.fwd, -0.06), V(0, 0.08, 0)));
    parts.push({ d: D(bagC) - 0.01, draw: (g) => { const q = P(bagC); const p = new Path2D(); p.roundRect(q.x - 0.13 * px, q.y - 0.1 * px, 0.26 * px, 0.2 * px, 4); cel(g, p, ch.bagColor, [q.x - 15, q.y - 11, 30, 22], { line: 1.3 }); } });
    parts.push({ d: D(J.shoulder) + 0.05, draw: (g) => tubeLine(g, [P(add(J.shoulder, mul(right, 0.12))), P(lerp(J.hip, J.shoulder, 0.5)), P(bagC)], 2.4, tone(ch.bagColor, -0.3), false) });
  }
  // Arms: a short sleeve, bare forearm, a hand.
  for (const arm of J.arms) {
    const far = D(arm.elbow) < D(J.shoulder) - 0.02;
    const sh = (c) => (far ? tone(c, -0.12) : c);
    const sleeve = lerp(arm.shoulder, arm.elbow, 0.55);
    parts.push({
      d: (D(arm.shoulder) + D(arm.elbow) + D(arm.hand)) / 3 + 0.01,
      draw: (g) => {
        chain(g, [
          { a: P(arm.shoulder), b: P(arm.elbow), wa: 0.08 * px, wb: 0.065 * px, color: sh(ch.skin) },
          { a: P(arm.elbow), b: P(arm.hand), wa: 0.065 * px, wb: 0.05 * px, color: sh(ch.skin) }
        ]);
        const q = P(arm.hand);
        const hp = new Path2D();
        hp.ellipse(q.x, q.y, 0.045 * px, 0.04 * px, 0, 0, Math.PI * 2);
        cel(g, hp, sh(ch.skin), [q.x - 5, q.y - 5, 10, 10], { line: 1.1 });
        limb(g, P(arm.shoulder), P(sleeve), 0.11 * px, 0.1 * px, sh(ch.over), { line: 1.3 });
      }
    });
  }
  parts.push(...headParts(ch, J, cam, mood));
  return parts;
}

/** One frame: a pose (riding) seen from a view. */
function paintRiding(g, ch, theta, mirror, pose) {
  const cam = camera(theta, mirror);
  const B = bikeOf(ch);
  const J = ridingPose(ch, B, pose);
  const mood = pose.mood ?? (pose.stand ? 'push' : pose.brake ? 'brake' : 'calm');
  const parts = bikeParts(ch, B, cam, pose.crank ?? 0);
  if (!pose.noRider) parts.push(...bodyParts(ch, J, cam, mood));
  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) p.draw(g);
}

/** A person off the bike, from joints set out by hand (standing, sitting, tumbling), seen from a view. */
function paintPerson(g, ch, theta, J, mood, mirror = false) {
  const cam = camera(theta, mirror);
  const parts = bodyParts(ch, J, cam, mood);
  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) p.draw(g);
}

/** A standing person's joints: feet apart, arms set by where the hands go. */
function standing(ch, { hipY = null, hands, lean = 0, phase = 0, gust = 0.5, fwd = V(0, -0.05, -1), feet = 0.16 } = {}) {
  const L = body(ch);
  const hip = V(0, hipY ?? L.thigh + L.shin + 0.08, 0);
  const shoulder = add(hip, V(0, Math.cos(lean) * L.torso, -Math.sin(lean) * L.torso));
  const head = add(shoulder, V(0, L.neck + L.head * 0.9, -0.02));
  const legs = [-1, 1].map((s) => {
    const h = add(hip, V(s * L.hipW, -0.03, 0));
    const ankle = V(s * feet, 0.08, 0.02);
    const k = reach(h, ankle, L.thigh, L.shin, V(s * 0.1, 0, -1));
    return { hip: h, knee: k.mid, ankle: k.end, toe: add(k.end, V(s * 0.02, -0.05, -L.foot * 0.85)) };
  });
  const arms = [-1, 1].map((s, i) => {
    const sh = add(shoulder, V(s * L.shoW, -0.03, 0));
    const k = reach(sh, hands[i], L.upper, L.fore, V(s * 0.8, -0.4, 0.3));
    return { shoulder: sh, elbow: k.mid, hand: k.end };
  });
  return { hip, shoulder, head, fwd: norm(fwd), legs, arms, wind: V(0.2, 0.15, 1), gust, phase };
}

/** A crash: thrown off, tumbling through the air, the bike skidding the other way. */
function paintTumble(g, ch, k) {
  g.save();
  g.translate(CELL / 2 + 60, GROUND - 4);
  g.rotate(1.35);
  g.scale(0.72, 0.72);
  g.translate(-CELL / 2, -GROUND);
  paintRiding(g, ch, Math.PI / 2, false, { crank: 1, noRider: true });
  g.restore();
  const L = body(ch);
  g.save();
  g.translate(CELL / 2 - 10, 120);
  g.rotate(k ? 0.9 : -0.4);
  g.translate(-CELL / 2, -GROUND + 40);
  const hip = V(0, 0.9, 0);
  const shoulder = add(hip, V(0, L.torso * 0.85, -0.2));
  const J = {
    hip, shoulder, head: add(shoulder, V(0, L.neck + L.head * 0.8, -0.1)), fwd: norm(V(0.3, -0.3, -1)), gust: 1, phase: k * 0.5, wind: V(0, 0.4, 1),
    legs: [-1, 1].map((s) => ({ hip: add(hip, V(s * L.hipW, 0, 0)), knee: add(hip, V(s * 0.2, -0.15, -0.3)), ankle: add(hip, V(s * 0.3, -0.5 + s * 0.1, -0.2)), toe: add(hip, V(s * 0.34, -0.55, -0.38)) })),
    arms: [-1, 1].map((s) => { const sh = add(shoulder, V(s * L.shoW, 0, 0)); return { shoulder: sh, elbow: add(sh, V(s * 0.25, 0.12, 0.05)), hand: add(sh, V(s * 0.45, 0.32 + (k ? 0.1 : -0.05), 0.1)) }; })
  };
  paintPerson(g, ch, Math.PI * 0.6, J, 'crash');
  g.restore();
  g.strokeStyle = 'rgba(42,32,48,0.8)';
  g.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + k;
    g.beginPath();
    g.moveTo(CELL / 2 + Math.cos(a) * 70, 120 + Math.sin(a) * 55);
    g.lineTo(CELL / 2 + Math.cos(a) * 95, 120 + Math.sin(a) * 75);
    g.stroke();
  }
  for (let i = 0; i < 3; i++) star(g, CELL / 2 + Math.cos(i * 2.1 + k) * 62, 90 + Math.sin(i * 2.1 + k) * 30, 7, ['#ffd23a', '#ff7aa8', '#8fd8ff'][i]);
}

/** Sitting on the road, dazed, stars going round; the bike on its side beside. */
function paintDizzy(g, ch, k) {
  g.save();
  g.translate(CELL / 2 + 60, GROUND - 6);
  g.rotate(Math.PI / 2 - 0.05);
  g.scale(0.7, 0.7);
  g.translate(-CELL / 2, -GROUND);
  paintRiding(g, ch, Math.PI / 2, false, { crank: 2, noRider: true });
  g.restore();
  const L = body(ch);
  const hip = V(0.25, 0.14, 0);
  const shoulder = add(hip, V(0, L.torso * 0.95, 0.08));
  const J = {
    hip, shoulder, head: add(shoulder, V(0.02 * Math.sin(k * 3), L.neck + L.head * 0.85, 0)), fwd: norm(V(0.2, -0.2, -1)), gust: 0.1, phase: k * 0.5, wind: V(0, 0, 1),
    legs: [-1, 1].map((s) => ({ hip: add(hip, V(s * L.hipW, 0, 0)), knee: add(hip, V(s * 0.12, 0.22, -0.3)), ankle: add(hip, V(s * 0.16, -0.02, -0.55)), toe: add(hip, V(s * 0.18, 0.04, -0.72)) })),
    arms: [-1, 1].map((s) => { const sh = add(shoulder, V(s * L.shoW, 0, 0)); return { shoulder: sh, elbow: add(sh, V(s * 0.12, -0.2, -0.05)), hand: s < 0 ? add(shoulder, V(-0.08, 0.12, -0.12)) : add(hip, V(0.2, -0.1, 0.05)) }; })
  };
  paintPerson(g, ch, Math.PI * 0.62, J, 'dizzy');
  const c = camera(Math.PI * 0.62).p(J.head);
  for (let i = 0; i < 3; i++) {
    const a = k * 2.1 + (i / 3) * Math.PI * 2;
    star(g, c.x + Math.cos(a) * 26, c.y - 24 + Math.sin(a) * 7, 7, ['#ffd23a', '#ff7aa8', '#8fd8ff'][i]);
  }
}

/** Getting up, a hand on the bars, shaking it off. */
function paintGetup(g, ch) {
  const L = body(ch);
  const J = standing(ch, { hipY: L.thigh + L.shin - 0.12, lean: 0.35, hands: [V(-0.3, 0.75, -0.35), V(0.1, 1.5, -0.08)], feet: 0.2, gust: 0.2 });
  paintRiding(g, ch, Math.PI * 0.62, false, { crank: 0.5, noRider: true });
  paintPerson(g, ch, Math.PI * 0.62, J, 'brake');
}

/** Both arms up at the finish, standing over the bike, seen from behind — the wind in the shirt. */
function paintWin(g, ch, k) {
  const theta = Math.PI * 0.12;
  paintRiding(g, ch, theta, false, { crank: 1.2, noRider: true });
  const L = body(ch);
  const hands = [V(-0.42 - k * 0.04, 1.95 + k * 0.04, -0.05), V(0.44 + k * 0.04, 2.0 - k * 0.03, -0.1)];
  const J = standing(ch, { hipY: L.thigh + L.shin + 0.04, lean: -0.08, hands, phase: k * 0.5, gust: 0.9, fwd: V(0.15, 0.2, -1), feet: 0.22 });
  J.wind = V(-0.5, 0.25, 0.8);
  paintPerson(g, ch, theta, J, 'win');
  for (let i = 0; i < 5; i++) star(g, 40 + i * 52, 30 + ((i * 37) % 30) + k * 4, 5, ['#ffd23a', '#ff7aa8', '#8fd8ff', '#9ef07a', '#ffd23a'][i]);
}

function star(g, x, y, r, color) {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
  g.fillStyle = color;
  g.fill(p);
  g.strokeStyle = LINE;
  g.lineWidth = 1.3;
  g.stroke(p);
}

/* -------------------------------------------------------- the atlas */

/** Frame names in order: index = the cell. */
export const FRAMES = (() => {
  const out = [];
  for (let v = 0; v < VIEWS.length; v++) {
    for (let f = 0; f < 4; f++) out.push(`ride${v}_${f}`);
    for (let f = 0; f < 4; f++) out.push(`stand${v}_${f}`);
    out.push(`coast${v}`);
    out.push(`brake${v}`);
  }
  out.push('tumble0', 'tumble1', 'dizzy0', 'dizzy1', 'getup', 'win0', 'win1');
  return out;
})();
const INDEX = new Map(FRAMES.map((n, i) => [n, i]));

/** Paint every frame of a rider into one canvas (8 columns of 288 px cells). */
export function paintRacer(ch) {
  const rows = Math.ceil(FRAMES.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * rows;
  const g = canvas.getContext('2d');
  FRAMES.forEach((name, i) => {
    g.save();
    g.translate((i % COLS) * CELL, Math.floor(i / COLS) * CELL);
    g.beginPath();
    g.rect(0, 0, CELL, CELL);
    g.clip();
    const m = /^(ride|stand|coast|brake)(\d)(?:_(\d))?$/.exec(name);
    if (m) {
      const view = VIEWS[Number(m[2])];
      const f = Number(m[3] ?? 0);
      const crank = m[1] === 'coast' || m[1] === 'brake' ? Math.PI / 2 : (f / 4) * Math.PI * 2;
      // Each stroke a beat of the wind; harder when sprinting.
      paintRiding(g, ch, view, false, { crank, stand: m[1] === 'stand' ? 1 : 0, brake: m[1] === 'brake', phase: f / 4, wind: m[1] === 'stand' ? 1 : m[1] === 'ride' ? 0.65 : 0.4 });
    } else if (name.startsWith('tumble')) paintTumble(g, ch, Number(name.at(-1)));
    else if (name.startsWith('dizzy')) paintDizzy(g, ch, Number(name.at(-1)));
    else if (name === 'getup') paintGetup(g, ch);
    else if (name.startsWith('win')) paintWin(g, ch, Number(name.at(-1)));
    g.restore();
  });
  return { canvas, rows, ch };
}

/** A portrait for the menu: the rider from the front quarter, head to bike, as a small image. */
export function portrait(ch, size = 132) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const cell = document.createElement('canvas');
  cell.width = cell.height = CELL;
  paintRiding(cell.getContext('2d'), ch, (3 * Math.PI) / 4, false, { crank: Math.PI / 2, phase: 0.25, wind: 0.5 });
  c.getContext('2d').drawImage(cell, CELL * 0.14, CELL * 0.02, CELL * 0.72, CELL * 0.72, 0, 0, size, size);
  return c.toDataURL();
}

/* ---------------------------------------------------- in the street */

const SIZE = CELL / PPM; // metres across a cell
const _v = new THREE.Vector3();

/**
 * A racer in the 3D street: a camera-facing card (turned only about the
 * upright, and rolled with the bike's lean), the right frame for the view
 * and the moment, a soft shadow on the ground under it. Lit by the scene in
 * steps (a cel ramp), with a little light of its own so it reads at night.
 */
export class ToonRider {
  constructor(atlas) {
    const tex = new THREE.CanvasTexture(atlas.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.tex = tex;
    this.rows = atlas.rows;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE).translate(0, SIZE / 2 - (CELL - GROUND) / PPM, 0);
    this.material = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.3, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    // The scene's light on the card in steps, so it keeps its cel look under street lamps and headlights.
    this.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 lit = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
          float base = max(1e-3, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
          float lum = dot(lit, vec3(0.299, 0.587, 0.114)) / base;
          float stepped = lum < 0.2 ? 0.14 : lum < 0.6 ? 0.45 : lum < 1.15 ? 0.9 : 1.3;
          float k = mix(1.0, stepped / max(1e-3, lum), 0.6);
          reflectedLight.directDiffuse *= k;
          reflectedLight.indirectDiffuse *= k;
        }`
      );
    };
    this.card = new THREE.Mesh(geo, this.material);
    this.card.rotation.order = 'YXZ';
    this.card.renderOrder = 3;
    this.group = new THREE.Group();
    this.group.add(this.card);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1a1030', transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 }));
    this.shadow.scale.set(0.5, 1, 1.95);
    this.shadow.position.y = 0.04;
    this.group.add(this.shadow);
    this.frame = -1;
  }

  /**
   * One frame. s: { x, y, z, heading, lean, crank, standing, pedalling, braking, v, mode ('ride' · 'tumble' · 'dizzy' · 'win'), t }
   */
  update(camera, s, { night = 0 } = {}) {
    this.group.position.set(s.x, s.y, s.z);
    this.shadow.rotation.y = s.heading;
    _v.set(camera.position.x - s.x, 0, camera.position.z - s.z);
    const yaw = Math.atan2(_v.x, _v.z);
    const rel = Math.atan2(Math.sin(yaw - s.heading), Math.cos(yaw - s.heading));
    this.card.rotation.y = yaw;
    let name;
    // The views are painted with the camera on the rider's right; the left is the same, mirrored.
    let mirror = rel > 0;
    const mode = s.mode ?? 'ride';
    if (mode === 'tumble') name = `tumble${Math.floor((s.t ?? 0) * 7) % 2}`;
    else if (mode === 'dizzy') name = (s.t ?? 0) > 1.25 ? 'getup' : `dizzy${Math.floor((s.t ?? 0) * 5) % 2}`;
    else if (mode === 'win') name = `win${Math.floor((s.t ?? 0) * 3) % 2}`;
    else {
      const v = Math.min(4, Math.round(Math.abs(rel) / (Math.PI / 4)));
      const f = Math.floor(((((s.crank ?? 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4;
      name = s.braking ? `brake${v}` : !s.pedalling ? `coast${v}` : `${s.standing ? 'stand' : 'ride'}${v}_${f}`;
    }
    if (mode === 'win') mirror = false;
    const roll = mode === 'ride' ? (s.lean ?? 0) * Math.cos(rel) : 0;
    this.card.rotation.z = roll;
    this.card.position.y = mode === 'tumble' ? Math.sin(Math.min(1, (s.t ?? 0) / 0.7) * Math.PI) * 0.6 : 0;
    const i = INDEX.get(name) ?? 0;
    const key = i * 2 + (mirror ? 1 : 0);
    if (key !== this.frame) {
      this.frame = key;
      const u0 = (i % COLS) / COLS;
      const v0 = 1 - (Math.floor(i / COLS) + 1) / this.rows;
      this.tex.repeat.set((mirror ? -1 : 1) / COLS, 1 / this.rows);
      this.tex.offset.set(mirror ? u0 + 1 / COLS : u0, v0);
    }
    this.material.emissiveIntensity = 0.2 + night * 0.24;
    // A rider right up against the camera (someone else's, alongside) fades so you can see past.
    const near = Math.hypot(_v.x, _v.z);
    this.material.opacity = Math.max(0.15, Math.min(1, (near - 1.2) / 2.2));
  }

  dispose() {
    this.tex.dispose();
    this.material.dispose();
    this.card.geometry.dispose();
    this.shadow.geometry.dispose();
  }
}
