/**
 * Faces for the sculpted figures, after AI Arcademia's (src/arcademia/world/
 * creatures/face.js): big glossy eyes with two highlights and eyelids that
 * blink, brows, and a mouth — with the expressions a fight needs, and a
 * hostile set for monsters (angry brows, eyes that glow, fangs).
 *
 * Built cheaply for a busy fight: both eyes are one mesh, the lids one, the
 * brows one and the mouth one; an expression swaps the brows' and mouth's
 * geometry (made once per face shape, shared by every figure with it). Eyes,
 * brows and mouths are unlit (they read as painted vinyl in any light); the
 * lids are lit with the body's own material.
 *
 *   const face = buildFace({ sdf, f, headBone, headPos, lidMaterial, key, low });
 *   face.set('angry'); face.update(dt); face.look(x, y);
 */
import * as THREE from 'three';
import { trace, gradient } from './sdf.js';

/* Every expression: which eyes, how far the lids come down (0 shut … −1.75 open), the brows, the mouth. */
export const EXPRESSIONS = {
  neutral: { eyes: 'open', lid: -1.75, brows: 'neutral', mouth: 'smile' },
  happy: { eyes: 'happy', lid: -1.75, brows: 'up', mouth: 'grin' },
  talk: { eyes: 'open', lid: -1.75, brows: 'up', mouth: 'smile', talk: true },
  fierce: { eyes: 'open', lid: -1.3, brows: 'angry', mouth: 'grin' },
  focus: { eyes: 'open', lid: -1.4, brows: 'angry', mouth: 'flat' },
  surprised: { eyes: 'open', lid: -1.75, brows: 'up', mouth: 'oh', big: 1.16 },
  hurt: { eyes: 'hurt', lid: -1.75, brows: 'sad', mouth: 'oh' },
  sad: { eyes: 'open', lid: -0.95, brows: 'sad', mouth: 'frown' },
  ko: { eyes: 'open', lid: 0, brows: 'sad', mouth: 'frown' },
  mean: { eyes: 'open', lid: -1.75, brows: 'angry', mouth: 'frown' },
  angry: { eyes: 'open', lid: -1.35, brows: 'angry', mouth: 'snarl' },
  roar: { eyes: 'open', lid: -1.75, brows: 'angry', mouth: 'roar', big: 1.12 },
  dizzy: { eyes: 'hurt', lid: -1.75, brows: 'sad', mouth: 'flat' }
};

const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};

/** Pieces → one geometry with colours: [geometry, matrix, '#hex'] each. */
function bake(pieces) {
  const pos = [], nrm = [], col = [], idx = [];
  const c = new THREE.Color(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let base = 0;
  for (const [g, m, hex] of pieces) {
    const p = g.attributes.position, n = g.attributes.normal;
    nm.getNormalMatrix(m);
    c.set(hex);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      nrm.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  out.computeBoundingSphere();
  return out;
}

const SPH = new Map();
const sphere = (seg) => {
  if (!SPH.has(seg)) SPH.set(seg, new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.66))));
  return SPH.get(seg);
};
/** A thin curved stroke (a smile, a ^ eye, a brow): a tube along an arc with round ends. */
function arc(radius, from, to, thick, seg = 12) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = from + ((to - from) * i) / seg;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, thick, 5, false);
  const capA = new THREE.SphereGeometry(thick, 6, 4).translate(pts[0].x, pts[0].y, pts[0].z);
  const capB = new THREE.SphereGeometry(thick, 6, 4).translate(pts.at(-1).x, pts.at(-1).y, pts.at(-1).z);
  return [tube, capA, capB];
}
const TRS = (p, q, s) => new THREE.Matrix4().compose(p, q ?? new THREE.Quaternion(), s ?? new THREE.Vector3(1, 1, 1));

let flatMat = null;
/** The unlit, vertex-coloured material the eyes, brows and mouths share. */
export function faceMaterial() {
  return (flatMat ??= new THREE.MeshBasicMaterial({ vertexColors: true }));
}

/** Where a face point lands on the surface (marching in from the front), and the surface normal there. */
function onSurface(sdf, x, y, zFrom = 4) {
  const hit = trace(sdf, [x, y, zFrom], [0, 0, -1], zFrom + 2);
  if (!hit) return null;
  const n = gradient(sdf, hit[0], hit[1], hit[2], 0.004);
  return { p: new THREE.Vector3(...hit), n: new THREE.Vector3(...n) };
}
/** A frame on the surface: at the point (pushed along the normal by `lift`), facing out, kept upright. */
function frameAt(at, headPos, lift = 0, upright = 0.5) {
  const o = new THREE.Object3D();
  o.position.copy(at.p).addScaledVector(at.n, lift).sub(headPos);
  const look = at.n.clone();
  look.y *= upright;
  o.lookAt(o.position.clone().add(look));
  o.updateMatrix();
  return o;
}

/**
 * The face's geometries (made once per face shape): eyes, lids, happy and
 * hurt eyes, brows per kind, mouths per kind — all in the head bone's frame.
 */
function faceGeometries(sdf, f, headPos, key, low) {
  return cached(`${key}|${low ? 1 : 0}`, () => {
    const r = f.eyeR, seg = low ? 10 : 18;
    const out = { eyes: null, lids: null, happy: null, hurt: null, brows: {}, mouths: {}, eyeY: 0, eyeZ: 0, ok: false };
    const eyeAt = [-1, 1].map((s) => onSurface(sdf, s * f.eyeX, f.eyeY));
    if (eyeAt.some((a) => !a)) return out;
    out.ok = true;
    const frames = eyeAt.map((a, i) => {
      const fr = frameAt(a, headPos, -r * 0.2);
      fr.rotateY((i ? 1 : -1) * 0.1);
      fr.updateMatrix();
      return fr;
    });
    // All four eye pieces sit at the same height and depth on both sides: lids turn on one shared axis.
    const cy = (frames[0].position.y + frames[1].position.y) / 2, cz = (frames[0].position.z + frames[1].position.z) / 2;
    for (const fr of frames) {
      fr.position.y = cy;
      fr.position.z = cz;
      fr.updateMatrix();
    }
    out.eyeY = cy;
    out.eyeZ = cz;
    const sq = f.squint ?? 1;
    const glowEye = f.hostile && f.eyeGlow;
    // A hostile's eyes: dark and glossy like everyone's, but the iris glows (unlit, so bloom catches it).
    const ball = glowEye ? '#160a08' : '#1d1410';
    const iris = glowEye ? f.eyeGlow : '#3a2a26';
    const local = (fr, p, s) => fr.matrix.clone().multiply(TRS(p, null, s));
    const eyes = [];
    for (const fr of frames) {
      eyes.push([sphere(seg), local(fr, new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, r * 1.2 * sq, r * 0.6)), ball]);
      if (glowEye) {
        eyes.push([sphere(seg), local(fr, new THREE.Vector3(0, -r * 0.12 * sq, r * 0.42), new THREE.Vector3(r * 0.72, r * 0.82 * sq, r * 0.22)), iris]);
        eyes.push([sphere(seg), local(fr, new THREE.Vector3(0, -r * 0.12 * sq, r * 0.55), new THREE.Vector3(r * 0.2, r * 0.6 * sq, r * 0.12)), '#160a08']);
      } else eyes.push([sphere(seg), local(fr, new THREE.Vector3(0, -r * 0.2 * sq, r * 0.42), new THREE.Vector3(r * 0.62, r * 0.7 * sq, r * 0.2)), iris]);
      eyes.push([sphere(8), local(fr, new THREE.Vector3(r * 0.32, r * 0.38 * sq, r * 0.52), new THREE.Vector3(r * 0.32, r * 0.32, r * 0.2)), '#ffffff']);
      if (!low) eyes.push([sphere(6), local(fr, new THREE.Vector3(-r * 0.3, -r * 0.36 * sq, r * 0.56), new THREE.Vector3(r * 0.14, r * 0.14, r * 0.12)), '#ffffff']);
      if (f.lashes && !low) for (const t of [-1, 1]) eyes.push([sphere(6), local(fr, new THREE.Vector3((fr.position.x < 0 ? -1 : 1) * r * (0.85 + t * 0.06), r * (0.95 + t * 0.1) * sq, r * 0.2), new THREE.Vector3(r * 0.22, r * 0.07, r * 0.07)), '#1d1410']);
    }
    // Shift so the eye mesh's origin is the shared eye line (it squashes there to blink, if it has no lids).
    const toLine = new THREE.Matrix4().makeTranslation(0, -cy, -cz);
    for (const e of eyes) e[1] = toLine.clone().multiply(e[1]);
    out.eyes = bake(eyes);
    // Lids: shells of the body's skin that roll down over each eye, about the eye line.
    const lidShell = new THREE.SphereGeometry(1, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
    out.lids = bake(frames.map((fr) => [lidShell, toLine.clone().multiply(local(fr, new THREE.Vector3(), new THREE.Vector3(r * 1.14, r * 1.38 * sq, r * 0.76))), '#ffffff']));
    lidShell.dispose();
    const ink = '#2a1a14';
    const hp = [], hu = [];
    for (const fr of frames) {
      for (const g of arc(r * 0.8, 0.25, Math.PI - 0.25, r * 0.17, 10)) hp.push([g, toLine.clone().multiply(local(fr, new THREE.Vector3(0, -r * 0.35, r * 0.5))), glowEye ? f.eyeGlow : ink]);
      const s = fr.position.x < 0 ? -1 : 1;
      for (const g of arc(r * 0.7, Math.PI * 0.75, Math.PI * 1.25, r * 0.16, 8)) hu.push([g, toLine.clone().multiply(local(fr, new THREE.Vector3(s * r * 0.5, 0, r * 0.5)).multiply(new THREE.Matrix4().makeRotationZ(s > 0 ? 0 : Math.PI))), glowEye ? f.eyeGlow : ink]);
    }
    out.happy = bake(hp);
    out.hurt = bake(hu);
    // Brows: above each eye, on the surface; tilted per kind (inner end down when angry, up when sad).
    const browAt = [-1, 1].map((s) => onSurface(sdf, s * f.eyeX, (f.browY ?? f.eyeY + r * 1.85)));
    if (browAt.every(Boolean)) {
      const bcol = f.hostile ? '#1a0e0c' : '#3a2620';
      const thick = r * (f.hostile ? 0.2 : 0.12);
      const KINDS = { neutral: [0, 0], up: [0, r * 0.35], angry: [f.hostile ? 0.6 : 0.42, -r * (f.hostile ? 0.25 : 0.1)], sad: [-0.38, r * 0.15] };
      for (const [kind, [tilt, lift]] of Object.entries(KINDS)) {
        const pieces = [];
        browAt.forEach((a, i) => {
          const s = i ? 1 : -1;
          const fr = frameAt(a, headPos, 0.006);
          // tilt: the inner end (toward the middle) goes down for a positive tilt
          const m = fr.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(0, lift, 0)).multiply(new THREE.Matrix4().makeRotationZ(s * tilt)).multiply(new THREE.Matrix4().makeTranslation(0, -r * 1.5, 0));
          for (const g of arc(r * 1.55, Math.PI * 0.39, Math.PI * 0.61, thick, 8)) pieces.push([g, m, bcol]);
        });
        out.brows[kind] = bake(pieces);
      }
    }
    // Mouths.
    const mAt = f.mouthY != null ? onSurface(sdf, 0, f.mouthY) : null;
    if (mAt) {
      const fr = frameAt(mAt, headPos, 0.003, 0.3);
      const at = (p, s, rz = 0) => fr.matrix.clone().multiply(TRS(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), s));
      const mr = r * (f.mouthW ?? 0.7);
      const ink2 = f.hostile ? '#1e0a0a' : '#4a1f26';
      const hole = f.hostile ? '#2a0606' : '#6b2230';
      const fang = (x, down = true) => [sphere(8), at(new THREE.Vector3(x, down ? -r * 0.05 : r * 0.05, r * 0.08), new THREE.Vector3(r * 0.14, r * 0.26, r * 0.1)), '#fff8ee'];
      const stroke = (radius, from, to, y, th = r * 0.1) => arc(radius, from, to, th, 10).map((g) => [g, at(new THREE.Vector3(0, y, 0)), ink2]);
      out.mouths.smile = bake(stroke(mr, Math.PI + 0.55, Math.PI * 2 - 0.55, mr * 0.6));
      out.mouths.grin = bake(stroke(mr * 1.15, Math.PI + 0.35, Math.PI * 2 - 0.35, mr * 0.75, r * 0.12));
      out.mouths.frown = bake([...stroke(mr * 0.85, 0.6, Math.PI - 0.6, -mr * 0.85), ...(f.fangs ? [fang(-mr * 0.42), fang(mr * 0.42)] : [])]);
      out.mouths.flat = bake(stroke(mr * 3, Math.PI * 1.5 - 0.1, Math.PI * 1.5 + 0.1, mr * 3));
      out.mouths.oh = bake([[sphere(12), at(new THREE.Vector3(), new THREE.Vector3(r * 0.3, r * 0.36, r * 0.15)), hole]]);
      out.mouths.open = bake([[sphere(12), at(new THREE.Vector3(), new THREE.Vector3(r * 0.6, r * 0.45, r * 0.16)), hole], [sphere(8), at(new THREE.Vector3(0, -r * 0.22, r * 0.07), new THREE.Vector3(r * 0.38, r * 0.2, r * 0.11)), '#ff8fa3']]);
      // A snarl: a wide frown with the teeth showing; a roar: wide open, fangs top and bottom.
      out.mouths.snarl = bake([[sphere(12), at(new THREE.Vector3(0, -r * 0.05, 0), new THREE.Vector3(mr * 1.05, r * 0.2, r * 0.12)), hole], [sphere(8), at(new THREE.Vector3(0, r * 0.08, r * 0.06), new THREE.Vector3(mr * 0.95, r * 0.08, r * 0.08)), '#fff8ee'], ...(f.fangs !== false ? [fang(-mr * 0.5), fang(mr * 0.5)] : [])]);
      const tooth = (x, y) => [sphere(8), at(new THREE.Vector3(x, y, r * 0.1), new THREE.Vector3(r * 0.13, r * 0.22, r * 0.1)), '#fff8ee'];
      out.mouths.roar = bake([[sphere(14), at(new THREE.Vector3(0, -r * 0.1, 0), new THREE.Vector3(mr * 1.0, r * 0.6, r * 0.16)), hole], [sphere(8), at(new THREE.Vector3(0, -r * 0.42, r * 0.08), new THREE.Vector3(r * 0.36, r * 0.16, r * 0.1)), '#ff7a8a'], tooth(-mr * 0.55, r * 0.32), tooth(mr * 0.55, r * 0.32), tooth(-mr * 0.4, -r * 0.5), tooth(mr * 0.4, -r * 0.5)]);
    }
    return out;
  });
}

/**
 * Build a face on a head bone. `lidMaterial`: the body's material (the lids
 * take its skin); `key`: the face shape's name (geometry is shared by key).
 * Returns { set(name), update(dt), look(x, y), root, expression }.
 */
export function buildFace({ sdf, f, headBone, headPos, lidMaterial, lidSlot = 0, key, low = false }) {
  const G = faceGeometries(sdf, f, headPos, key, low);
  const root = new THREE.Group();
  root.name = 'face';
  headBone.add(root);
  if (!G.ok) return { root, set() {}, update() {}, look() {}, expression: 'neutral', dispose() { root.removeFromParent(); } };
  const flat = faceMaterial();
  const line = new THREE.Group();
  line.position.set(0, G.eyeY, G.eyeZ);
  root.add(line);
  const eyes = new THREE.Mesh(G.eyes, flat);
  const happy = new THREE.Mesh(G.happy, flat);
  const hurt = new THREE.Mesh(G.hurt, flat);
  happy.visible = hurt.visible = false;
  line.add(eyes, happy, hurt);
  // Lids carry the body material's slot attributes: all skin (slot 0, or the body for a creature).
  if (!G.lids.attributes.aSlotA) {
    const n = G.lids.attributes.position.count;
    const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) (lidSlot < 4 ? a : b)[i * 4 + (lidSlot % 4)] = 1;
    G.lids.setAttribute('aSlotA', new THREE.BufferAttribute(a, 4));
    G.lids.setAttribute('aSlotB', new THREE.BufferAttribute(b, 4));
    G.lids.setAttribute('aTone', new THREE.BufferAttribute(new Float32Array(n * 2).fill(1).map((v, i) => (i % 2 ? 0.1 : 1)), 2));
    G.lids.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n), 1));
  }
  const lids = low ? null : new THREE.Mesh(G.lids, lidMaterial);
  if (lids) {
    lids.visible = false;
    line.add(lids);
  }
  const brows = G.brows.neutral ? new THREE.Mesh(G.brows.neutral, flat) : null;
  if (brows) root.add(brows);
  const mouth = !low && G.mouths.smile ? new THREE.Mesh(G.mouths.smile, flat) : null;
  if (mouth) root.add(mouth);
  for (const m of [eyes, happy, hurt, lids, brows, mouth]) if (m) m.raycast = () => {};
  let expr = 'neutral', blinkT = 1 + Math.random() * 3, t = 0, lookX = 0, lookY = 0, lid = -1.75;
  return {
    root,
    get expression() {
      return expr;
    },
    set(name) {
      if (EXPRESSIONS[name]) expr = name;
    },
    look(x, y) {
      lookX = x;
      lookY = y;
    },
    update(dt) {
      t += dt;
      const E = EXPRESSIONS[expr];
      blinkT -= dt;
      if (blinkT < -0.14) blinkT = 1.8 + Math.random() * 3.5;
      const blinking = blinkT < 0 && E.eyes === 'open';
      const k = blinking ? Math.sin((-blinkT / 0.14) * Math.PI) : 0;
      const want = E.lid + (0 - E.lid) * k;
      lid += (want - lid) * Math.min(1, dt * (blinking ? 60 : 14));
      eyes.visible = E.eyes === 'open';
      happy.visible = E.eyes === 'happy';
      hurt.visible = E.eyes === 'hurt';
      const big = E.big ?? 1;
      if (lids) {
        lids.visible = eyes.visible && lid > -1.6;
        lids.rotation.x = lid;
        eyes.scale.setScalar(big);
      } else eyes.scale.set(big, big * (blinking ? 0.15 : 1), big);
      // The eyes glance.
      eyes.position.x += (lookX * f.eyeR * 0.25 - eyes.position.x) * Math.min(1, dt * 8);
      eyes.position.y += (lookY * f.eyeR * 0.2 - eyes.position.y) * Math.min(1, dt * 8);
      if (brows) brows.geometry = G.brows[E.brows] ?? G.brows.neutral;
      if (mouth) {
        let m = E.mouth;
        if (E.talk && Math.sin(t * 15) > -0.1) m = 'open';
        mouth.geometry = G.mouths[m] ?? G.mouths.smile;
      }
    },
    dispose() {
      root.removeFromParent();
    }
  };
}
