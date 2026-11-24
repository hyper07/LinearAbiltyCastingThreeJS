/**
 * Ski goggles (and funnier things) worn down over the eyes, built to fit
 * each rider's head: a lens with a mirrored gradient that catches the sun
 * (the sky's reflection slides as the head turns), a frame, a dark gasket,
 * a strap round the back of the hood — or glasses' arms, or a snorkel.
 *
 *   const g = buildGoggles('classic', fit);   // fit: where the eyes are (RiderModel measures it)
 *   head.add(g.group);  …  g.update(dt, { jolt, trick });  g.setUp(k)  (0 = down, 1 = on the forehead)
 *
 * Materials are shared across riders; each pair is a handful of draws.
 */
import * as THREE from 'three/webgpu';
import { uniform, vec3, vec2, float, mix, smoothstep, uv, time, atan, length, reflectView, color, normalView, positionViewDirection, abs, dot, pow, fract, texture } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cleanGoggle, GOGGLE_IDS } from '../goggleList.js';

/* ---------------------------------------------------------------- shared materials */

const mats = new Map();
const cached = (key, make) => {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
};

/** Shiny toy plastic. */
const plastic = (c, rough = 0.3) => cached(`p${c}${rough}`, () => new THREE.MeshPhysicalNodeMaterial({ color: c, roughness: rough, clearcoat: 1, clearcoatRoughness: 0.1 }));
const metal = (c) => cached(`m${c}`, () => new THREE.MeshPhysicalNodeMaterial({ color: c, roughness: 0.25, metalness: 0.9, clearcoat: 0.6 }));
const fabric = (c) => cached(`f${c}`, () => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));

/** A sky streak that slides across a lens as the head (or the view) turns. */
const skyStreak = () => {
  const r = reflectView;
  return smoothstep(0.08, 0.24, r.y).mul(smoothstep(0.62, 0.36, r.y)).mul(smoothstep(-0.2, 0.4, r.x.mul(0.7).add(r.z.negate().mul(0.3))).mul(0.6).add(0.4));
};

/** Mirrored lens: a vertical gradient (top → bottom), metallic, with the sky streak. */
function mirror(key, top, bottom, { irid = 0, streak = 0.9 } = {}) {
  return cached(`l${key}`, () => {
    const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.04, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: irid, iridescenceIOR: 1.6 });
    const v = uv().y;
    m.colorNode = mix(color(bottom), color(top), smoothstep(0.1, 0.9, v));
    m.emissiveNode = vec3(1, 0.98, 0.92).mul(skyStreak()).mul(streak);
    return m;
  });
}

/** Clear glass (googly, frog eyes, swim mask): see-through with a soft rim. */
function glass(tint = '#d8f4ff', opacity = 0.35) {
  return cached(`g${tint}${opacity}`, () => {
    const m = new THREE.MeshPhysicalNodeMaterial({ color: tint, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity, depthWrite: false });
    const rim = pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2.5);
    m.opacityNode = rim.mul(0.6).add(opacity);
    m.emissiveNode = vec3(1, 1, 1).mul(skyStreak()).mul(0.5);
    return m;
  });
}

/** A slowly turning hypno spiral. */
const spiral = () => cached('spiral', () => {
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.2, clearcoat: 1 });
  const p = uv().sub(0.5);
  const a = atan(p.y, p.x).add(time.mul(2.2));
  const r = length(p);
  const band = smoothstep(0.45, 0.55, fract(r.mul(9).sub(a.div(6.2832))));
  m.colorNode = mix(vec3(0.06, 0.05, 0.1), vec3(0.98, 0.98, 1), band);
  m.emissiveNode = vec3(0.25, 0.2, 0.4).mul(band);
  return m;
});

/** Sprinkles and other many-coloured bits (vertex colours). */
const confettiMat = () => cached('vc', () => new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5 }));

/* ---------------------------------------------------------------- geometry helpers */

const merge = (list) => mergeGeometries(list.map((g) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k);
  return n;
}));

/** The 2D outlines of lenses, about 1 unit across. */
const SHAPES = {
  round: () => new THREE.Shape().absarc(0, 0, 0.5, 0, Math.PI * 2),
  oval: () => {
    const s = new THREE.Shape();
    s.absellipse(0, 0, 0.55, 0.38, 0, Math.PI * 2);
    return s;
  },
  heart: () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.15, -0.3, -0.62, -0.08, -0.55, 0.2);
    s.bezierCurveTo(-0.48, 0.5, -0.1, 0.52, 0, 0.25);
    s.bezierCurveTo(0.1, 0.52, 0.48, 0.5, 0.55, 0.2);
    s.bezierCurveTo(0.62, -0.08, 0.15, -0.3, 0, -0.5);
    return s;
  },
  star: () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.26 : 0.58;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  },
  cat: () => {
    const s = new THREE.Shape();
    s.moveTo(-0.55, 0.22);
    s.quadraticCurveTo(-0.1, 0.42, 0.5, 0.18);
    s.quadraticCurveTo(0.42, -0.4, -0.1, -0.35);
    s.quadraticCurveTo(-0.5, -0.3, -0.55, 0.22);
    return s;
  },
  rect: () => {
    const s = new THREE.Shape();
    const w = 0.55, h = 0.38, r = 0.06;
    s.moveTo(-w + r, -h);
    s.lineTo(w - r, -h);
    s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r);
    s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + r, h);
    s.quadraticCurveTo(-w, h, -w, h - r);
    s.lineTo(-w, -h + r);
    s.quadraticCurveTo(-w, -h, -w + r, -h);
    return s;
  }
};

/** A flat lens of a shape (scale s), and its frame ring, in a little group facing +z. */
function shapedLens(shape, s, lensMat, frameMat, { rim = 0.16, flipX = false, depth = 0.25 } = {}) {
  const g = new THREE.Group();
  const sh = SHAPES[shape]();
  const lensGeo = new THREE.ShapeGeometry(sh, 24);
  // uv for the gradient: map y from −0.6..0.6 to 0..1
  const p = lensGeo.attributes.position, uvA = lensGeo.attributes.uv;
  for (let i = 0; i < p.count; i++) uvA.setXY(i, p.getX(i) + 0.5, p.getY(i) + 0.5);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.z = 0.002;
  const outer = SHAPES[shape]();
  const pts = outer.getPoints(shape === 'round' || shape === 'oval' ? 32 : 10);
  const scaleUp = 1 + rim;
  const ring = new THREE.Shape(pts.map((v) => v.clone().multiplyScalar(scaleUp)));
  ring.holes.push(new THREE.Path(pts.slice().reverse()));
  const frameGeo = new THREE.ExtrudeGeometry(ring, { depth: depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 2, curveSegments: 12 });
  frameGeo.translate(0, 0, -depth * 0.6);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  g.add(frame, lens);
  g.scale.set(flipX ? -s : s, s, s);
  return g;
}

/**
 * The fit: { cy, cz, rx, rz, ex, er, front } — eye height and the head's
 * ellipse at that height (in head-bone space), the eyes' x offset and size.
 * Points on the ellipse at angle a from the front: (rx sin a, cy, cz + rz cos a).
 */
const onHead = (fit, a, out = 0) => new THREE.Vector3((fit.rx + out) * Math.sin(a), fit.cy, fit.cz + (fit.rz + out) * Math.cos(a));
const headYaw = (fit, a) => Math.atan2((fit.rz / fit.rx) * Math.sin(a), Math.cos(a)) * 1; // the surface's facing at angle a

/** Put a part on the head's surface at angle a (and dy up), facing out. */
function seat(obj, fit, a, dy = 0, out = 0.012) {
  const p = onHead(fit, a, out);
  obj.position.set(p.x, p.y + dy, p.z);
  obj.rotation.y = headYaw(fit, a);
  return obj;
}

/** A wrap-around band lens over both eyes (a strip of the head's ellipse), with frame and gasket. */
function bandLens(fit, lensMat, frameMat, { h = 0.16, theta = 0.95, out = 0.03, frameT = 0.03, gasket = '#1d1f26', notch = 0.3 } = {}) {
  const g = new THREE.Group();
  // the goggle outline (u = −1 … 1 across the face): a gently curved top, a
  // nose notch in the bottom middle, and rounded ends
  const ends = (u) => {
    const e = Math.max(0, (Math.abs(u) - 0.8) / 0.2);
    return Math.sqrt(Math.max(0, 1 - e * e));
  };
  const top = (u) => (h / 2) * (1 - 0.1 * u * u) * (0.35 + 0.65 * ends(u));
  const bottom = (u) => (-h / 2 * (1 - 0.06 * u * u) + h * notch * Math.exp(-((u / 0.2) ** 2))) * (0.35 + 0.65 * ends(u));
  // the lens: a curved shell, bulging a touch in the middle
  const NU = 36, NV = 6;
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = -1 + (2 * i) / NU;
    const a = u * theta;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const y = bottom(u) + (top(u) - bottom(u)) * v;
      const bulge = 0.012 * (1 - u * u) * Math.sin(v * Math.PI);
      const p = onHead(fit, a, out + bulge);
      pos.push(p.x, fit.cy + y, p.z);
      uvs.push(i / NU, (y + h / 2) / h);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const k = i * (NV + 1) + j;
    idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  lg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  lg.setIndex(idx);
  lg.computeVertexNormals();
  g.add(new THREE.Mesh(lg, lensMat));
  // the frame: a thick rounded loop round the outline
  const pts = [];
  const N = 44;
  const at = (u, y, o) => onHead(fit, u * theta * 1.01, o).setY(fit.cy + y);
  for (let i = 0; i < N; i++) {
    const u = -1 + (2 * i) / N;
    pts.push(at(u, top(u), out + 0.006));
  }
  for (let i = N; i > 0; i--) {
    const u = -1 + (2 * i) / N;
    pts.push(at(u, bottom(u), out + 0.006));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, frameT, 8, true), frameMat));
  // the dark foam gasket peeking out behind the frame
  const back = new THREE.CatmullRomCurve3(pts.map((p) => {
    const q = p.clone().sub(new THREE.Vector3(0, fit.cy, fit.cz));
    q.y *= 1.12;
    q.x *= 0.985;
    q.z *= 0.985;
    return q.add(new THREE.Vector3(0, fit.cy, fit.cz));
  }), true, 'centripetal');
  g.add(new THREE.Mesh(new THREE.TubeGeometry(back, 90, frameT * 0.75, 6, true), plastic(gasket, 0.6)));
  return g;
}

/** The strap round the back of the head (from angle `from` either side of the nose, round the back). */
function strap(fit, c = '#1d1f26', w = 0.065, { dy = 0, from = 0.6 } = {}) {
  const geo = new THREE.CylinderGeometry(1, 1, w, 40, 1, true, from, Math.PI * 2 - from * 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    p.setX(i, p.getX(i) * (fit.rx + 0.018));
    p.setZ(i, z * ((z > 0 ? fit.rz : fit.rzb) + 0.018));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, fabric(c));
  m.position.set(0, fit.cy + dy, fit.cz);
  return m;
}

/** Glasses' arms back to the ears. */
function arms(fit, c, dy = 0) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(onHead(fit, s * (0.75 + (i / 10) * 0.95), 0.03).setY(fit.cy + dy));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.012, 6), plastic(c)));
  }
  return g;
}

/** A pair of shaped lenses over the eyes (and a bridge between them). */
function pair(fit, shape, s, lensMat, frameMat, o = {}) {
  const g = new THREE.Group();
  const a = Math.asin(Math.min(0.9, fit.ex / fit.rx));
  for (const sd of [-1, 1]) {
    const l = shapedLens(shape, s, lensMat, frameMat, { ...o, flipX: sd < 0 && o.mirrorX });
    seat(l, fit, sd * a, o.dy ?? 0, o.out ?? 0.03);
    g.add(l);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(fit.ex * 0.32, 0.012, 6, 12, Math.PI), frameMat);
  bridge.position.copy(onHead(fit, 0, 0.04)).add(new THREE.Vector3(0, (o.dy ?? 0) + 0.005, 0));
  g.add(bridge);
  return g;
}

/* ---------------------------------------------------------------- the styles */

const STYLES = {
  classic: (f, ctx) => [bandLens(f, mirror('amber', '#ff5a1a', '#ffc24a'), plastic(ctx.frame ?? '#fbfbfd')), strap(f)],
  sky: (f) => [bandLens(f, mirror('blue', '#1b3fb0', '#6fc3ff'), plastic('#1d1f26')), strap(f)],
  rainbow: (f) => [bandLens(f, mirror('rainbow', '#7a3cff', '#1fd1b0', { irid: 1 }), plastic('#1d1f26')), strap(f, '#ff4b8b')],
  heart: (f) => [pair(f, 'heart', f.er * 3.2, mirror('pink', '#ff2f7a', '#ffa0c8'), plastic('#ffffff'), { rim: 0.14 }), strap(f, '#ff6fb4')],
  star: (f) => [pair(f, 'star', f.er * 3.6, mirror('yellow', '#ff9a00', '#fff06a'), plastic('#ff8a1a'), { rim: 0.12 }), strap(f)],
  googly: (f, ctx) => {
    const g = pair(f, 'round', f.er * 3.2, glass('#ffffff', 0.18), plastic('#1d1f26'), { rim: 0.12 });
    // white eyeballs behind the glass, big black pupils that wobble
    const a = Math.asin(Math.min(0.9, f.ex / f.rx));
    ctx.pupils = [];
    for (const sd of [-1, 1]) {
      const ball = new THREE.Mesh(new THREE.CircleGeometry(f.er * 1.5, 24), plastic('#ffffff', 0.6));
      seat(ball, f, sd * a, 0, 0.02);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(f.er * 0.75, 20), plastic('#16131f', 0.4));
      pupil.position.z = 0.004;
      ball.add(pupil);
      g.add(ball);
      ctx.pupils.push({ m: pupil, x: 0, y: 0, vx: 0, vy: 0, r: f.er * 0.7 });
    }
    return [g, strap(f)];
  },
  cateye: (f) => {
    const g = pair(f, 'cat', f.er * 3.6, mirror('smoke', '#3a2a6a', '#b07ad8'), plastic('#ff6fb4'), { rim: 0.14, mirrorX: true });
    const a = Math.asin(Math.min(0.9, f.ex / f.rx));
    for (const sd of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(f.er * 0.7, f.er * 1.6, 4), plastic('#ff6fb4'));
      seat(ear, f, sd * (a + 0.28), f.er * 1.9, 0.035);
      ear.rotation.z = -sd * 0.35;
      g.add(ear);
    }
    return [g, arms(f, '#ff6fb4')];
  },
  aviator: (f) => [pair(f, 'round', f.er * 3.4, mirror('aviator', '#3d5a2a', '#c9b06a'), metal('#c99a3a'), { rim: 0.08, depth: 0.12 }), strap(f, '#6b4426', 0.07)],
  snorkel: (f, ctx) => {
    const g = new THREE.Group();
    g.add(bandLens(f, glass('#bfeeff', 0.3), plastic('#3ab8e8', 0.4), { h: 0.2, theta: 0.85, frameT: 0.035, gasket: '#2a8ab0' }));
    const pivot = new THREE.Group();
    pivot.position.copy(onHead(f, 1.25, 0.05));
    const pts = [new THREE.Vector3(0, -0.05, 0.05), new THREE.Vector3(0.02, 0.05, 0), new THREE.Vector3(0.02, 0.3, -0.02), new THREE.Vector3(0.01, 0.48, -0.04)];
    pivot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.022, 8), plastic('#ff7a33')));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), plastic('#ffd23f'));
    tip.position.copy(pts[3]);
    pivot.add(tip);
    g.add(pivot);
    ctx.snorkel = { m: pivot, a: 0, v: 0 };
    return [g, strap(f, '#3ab8e8', 0.06)];
  },
  swim: (f) => [pair(f, 'oval', f.er * 2.6, mirror('swim', '#00a6ff', '#7ff0ff'), plastic('#ff3fa0'), { rim: 0.18, depth: 0.3 }), strap(f, '#ff3fa0', 0.025)],
  glasses3d: (f) => {
    // a flat card frame with two holes, red and blue film in them
    const w = f.ex * 2 + f.er * 3.6, hh = f.er * 2.8;
    const lw = f.er * 2.7, lh = f.er * 1.9;
    const rect = (cx, cy, rw, rh, path = new THREE.Shape()) => {
      path.moveTo(cx - rw / 2, cy - rh / 2);
      path.lineTo(cx + rw / 2, cy - rh / 2);
      path.lineTo(cx + rw / 2, cy + rh / 2);
      path.lineTo(cx - rw / 2, cy + rh / 2);
      path.lineTo(cx - rw / 2, cy - rh / 2);
      return path;
    };
    const card = rect(0, 0, w, hh);
    for (const sd of [-1, 1]) card.holes.push(rect(sd * f.ex, 0, lw, lh, new THREE.Path()));
    const frameGeo = new THREE.ExtrudeGeometry(card, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
    const frame = new THREE.Mesh(frameGeo, plastic('#f4f1ea', 0.8));
    const g = new THREE.Group();
    seat(g, f, 0, 0, 0.035);
    g.add(frame);
    for (const [sd, c] of [[-1, '#e63946'], [1, '#3a86ff']]) {
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), cached(`3d${c}`, () => new THREE.MeshPhysicalNodeMaterial({ color: c, roughness: 0.1, transparent: true, opacity: 0.8, clearcoat: 1 })));
      lens.position.set(sd * f.ex, 0, 0.008);
      g.add(lens);
    }
    return [g, arms(f, '#f4f1ea')];
  },
  pixel: (f, ctx) => {
    // chunky 8-bit shades: a stack of black blocks
    const s = f.er * 0.55;
    const rows = ['XXXXXXXXXXXXXX', 'XXXXX....XXXXX', '.XXXX....XXXX.', '..XX......XX..'];
    const boxes = [];
    rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c === 'X') boxes.push(new THREE.BoxGeometry(s, s, s * 0.8).translate((i - 6.5) * s, -j * s, 0));
    }));
    const m = new THREE.Mesh(merge(boxes), plastic('#16131f', 0.25));
    const g = new THREE.Group();
    seat(g, f, 0, s * 1.2, 0.05);
    const shine = new THREE.Mesh(merge([new THREE.BoxGeometry(s, s * 0.5, 0.01).translate(-4 * s, -s * 0.8, s * 0.42), new THREE.BoxGeometry(s, s * 0.5, 0.01).translate(3 * s, -s * 0.8, s * 0.42)]), plastic('#ffffff', 0.3));
    g.add(m, shine);
    ctx.drop = { m: g, y0: g.position.y, k: 0, v: 0 };
    return [g, arms(f, '#16131f')];
  },
  hypno: (f) => [pair(f, 'round', f.er * 3.2, spiral(), plastic('#16131f'), { rim: 0.12 }), strap(f)],
  donut: (f) => {
    const g = new THREE.Group();
    const a = Math.asin(Math.min(0.9, f.ex / f.rx));
    const R = f.er * 1.55;
    for (const sd of [-1, 1]) {
      const d = new THREE.Group();
      d.add(new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.42, 12, 28), plastic('#d9a066', 0.7)));
      const frost = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.43, 12, 28, Math.PI * 2).scale(1, 1, 0.6).translate(0, 0, R * 0.12), plastic('#ff7ab8', 0.35));
      d.add(frost);
      const cols = ['#ffffff', '#ffd23f', '#3fd0b0', '#3a86ff', '#ff4b5c'].map((c) => new THREE.Color(c));
      const bits = [];
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * Math.PI * 2 + Math.sin(i * 3.1) * 0.2;
        const b = new THREE.BoxGeometry(R * 0.3, R * 0.08, R * 0.08).rotateZ(t * 2.3).translate(Math.cos(t) * R * (1 + Math.sin(i * 7) * 0.15), Math.sin(t) * R * (1 + Math.sin(i * 7) * 0.15), R * 0.42);
        const c = cols[i % cols.length];
        const ca = new Float32Array(b.attributes.position.count * 3);
        for (let k = 0; k < ca.length; k += 3) ca.set([c.r, c.g, c.b], k);
        b.setAttribute('color', new THREE.BufferAttribute(ca, 3));
        bits.push(b);
      }
      d.add(new THREE.Mesh(merge(bits), confettiMat()));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(R * 0.7, 20), glass('#fff2d8', 0.25));
      d.add(lens);
      seat(d, f, sd * a, 0, 0.04);
      g.add(d);
    }
    return [g, strap(f, '#ff7ab8')];
  },
  frogeyes: (f) => {
    const g = new THREE.Group();
    const a = Math.asin(Math.min(0.9, f.ex / f.rx));
    for (const sd of [-1, 1]) {
      const d = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(f.er * 1.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), glass('#b8ff9a', 0.3));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(f.er * 1.6, f.er * 0.28, 8, 24), plastic('#5dbf3a'));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(f.er * 0.6, 12, 8).scale(1, 1, 0.4), plastic('#1d1f26', 0.2));
      pupil.position.z = f.er * 1.1;
      d.add(dome, rim, pupil);
      seat(d, f, sd * a, f.er * 0.6, 0.03);
      g.add(d);
    }
    return [g, strap(f, '#3a8a2a')];
  },
  cyclops: (f) => [bandLens(f, mirror('cyclops', '#0aa8ff', '#9ff4ff'), metal('#c7ced9'), { h: 0.2, theta: 1.05, frameT: 0.034 }), strap(f, '#5a6472', 0.06)],
  led: (f, ctx) => {
    const lensMat = new THREE.MeshPhysicalNodeMaterial({ color: '#0c0b14', roughness: 0.15, clearcoat: 1 });
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 32;
      const g2 = cv.getContext('2d');
      g2.fillStyle = '#000';
      g2.fillRect(0, 0, 256, 32);
      g2.fillStyle = '#ff3b6b';
      g2.font = '900 27px monospace';
      g2.textBaseline = 'middle';
      g2.fillText(`${ctx.text ? `${ctx.text} ♥ ` : ''}WHEE! ♥ `, 4, 17);
      // dot-matrix look: a dark grid over the letters
      g2.fillStyle = '#000';
      for (let y = 0; y < 32; y += 4) g2.fillRect(0, y + 3, 256, 1);
      for (let x = 0; x < 256; x += 4) g2.fillRect(x + 3, 0, 1, 32);
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      ctx.led = uniform(0);
      const tu = uv();
      lensMat.emissiveNode = texture(tex, vec2(tu.x.mul(1.4).add(ctx.led), tu.y.mul(1.25).sub(0.12))).rgb.mul(3.2);
    }
    return [bandLens(f, lensMat, plastic('#16131f'), { h: 0.16 }), strap(f)];
  },
  flower: (f) => {
    const g = pair(f, 'round', f.er * 2.6, mirror('flower', '#7a4a1e', '#d98a2a'), plastic('#7a4a1e'), { rim: 0.1 });
    const a = Math.asin(Math.min(0.9, f.ex / f.rx));
    for (const sd of [-1, 1]) {
      const petals = [];
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        petals.push(new THREE.SphereGeometry(f.er * 0.55, 10, 6).scale(1.9, 0.75, 0.35).rotateZ(t).translate(Math.cos(t) * f.er * 2.2, Math.sin(t) * f.er * 2.2, -0.005));
      }
      const m = new THREE.Mesh(merge(petals), plastic('#ffc93a', 0.45));
      seat(m, f, sd * a, 0, 0.026);
      g.add(m);
    }
    return [g, strap(f, '#3a8a2a')];
  }
};

/**
 * Build a pair to fit a head. Returns { id, group, setUp(k), update(dt, { jolt, trick, menu }) }.
 * `group` goes on the head bone; it turns about the head's centre to push up onto the forehead.
 */
export function buildGoggles(id, fit, { text, frame } = {}) {
  id = cleanGoggle(id);
  const ctx = { text, frame };
  // turns about the head's centre to push up onto the forehead
  const hy = fit.hy ?? fit.cy;
  const pivot = new THREE.Group();
  // the hinge sits toward the back of the head, so pushing up tips the front onto the forehead and the strap stays put
  const pz = fit.cz - fit.rzb * 0.55;
  const tip = Math.asin(Math.min(0.9, (fit.rz * 0.62) / (fit.rz + fit.rzb * 0.55)));
  pivot.position.set(0, hy, pz);
  const inner = new THREE.Group();
  inner.position.set(0, -hy, -pz);
  pivot.add(inner);
  for (const part of STYLES[id](fit, ctx)) inner.add(part);
  pivot.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  let up = 0;
  return {
    id,
    group: pivot,
    upGoal: 0,
    setUp(k, snap = false) {
      this.upGoal = k;
      if (snap) up = k;
    },
    trick() {
      if (ctx.drop) ctx.drop.k = 1;
      if (ctx.pupils) for (const p of ctx.pupils) p.vy += 3;
    },
    update(dt, { jolt = 0, trick = false, yawRate = 0 } = {}) {
      up += (this.upGoal - up) * Math.min(1, dt * 8);
      pivot.rotation.x = -up * tip;
      pivot.position.y = hy + up * 0.02;
      if (ctx.pupils) for (const p of ctx.pupils) {
        p.vx += (-p.x * 120 - p.vx * 6 + yawRate * 3) * dt + (Math.random() - 0.5) * jolt * 4;
        p.vy += (-p.y * 120 - p.vy * 6 - 0.6) * dt + jolt * 2;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const l = Math.hypot(p.x, p.y);
        if (l > p.r) {
          p.x *= p.r / l;
          p.y *= p.r / l;
          p.vx *= -0.4;
          p.vy *= -0.4;
        }
        p.m.position.set(p.x, p.y, 0.004);
      }
      if (ctx.snorkel) {
        const s = ctx.snorkel;
        s.v += (-s.a * 60 - s.v * 4 + jolt * 30 + yawRate * 2) * dt;
        s.a += s.v * dt;
        s.m.rotation.set(s.a * 0.6, 0, s.a * 0.3);
      }
      if (ctx.drop) {
        const d = ctx.drop;
        if (trick) d.k = 1;
        d.v += (-d.k * 60 - d.v * 7) * dt;
        d.k += d.v * dt;
        d.m.position.y = d.y0 + Math.max(0, d.k) * 0.3;
      }
      if (ctx.led) ctx.led.value = (ctx.led.value + dt * 0.3) % 1;
    },
    /** A silly flourish on the podium: jiggly pupils, the shades dropping in. */
    flourish() {
      if (ctx.pupils) for (const p of ctx.pupils) p.vx += (Math.random() - 0.5) * 8;
      if (ctx.drop) ctx.drop.k = 1;
      if (ctx.snorkel) ctx.snorkel.v += 6;
    }
  };
}

/** A fit for a generic round head (the warm-up rack, tests). */
export const ROUND_FIT = Object.freeze({ cy: 0, cz: 0, rx: 0.36, rz: 0.32, rzb: 0.3, ex: 0.12, er: 0.04, hy: 0 });

/** Every pair in a row (drawn once behind the loading card so no pipeline is built later). */
export function goggleRack(ids = GOGGLE_IDS) {
  const g = new THREE.Group();
  ids.forEach((id, i) => {
    const p = buildGoggles(id, ROUND_FIT, { text: 'WHEE' });
    p.group.position.x += (i - (ids.length - 1) / 2) * 0.25;
    p.group.scale.setScalar(0.3);
    g.add(p.group);
  });
  g.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
  });
  return g;
}
