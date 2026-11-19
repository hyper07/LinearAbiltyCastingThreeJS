/**
 * Faces: big glossy eyes with two highlights and real eyelids, brows, blush,
 * and a set of mouths and eye shapes swapped for each expression:
 *
 *   neutral   open eyes, a small smile
 *   happy     ^ ^ eyes, a wide smile
 *   cheer     ^ ^ eyes, an open laughing mouth
 *   surprised wide eyes, an "o" mouth, brows up
 *   thinking  eyes glance up, a flat mouth, one brow raised
 *   sad       droopy lids, a frown, brows tilted up in the middle
 *
 * Everything sits on the sculpted surface (found by marching the creature's
 * distance field) and rides on the head bone.
 */
import * as THREE from 'three';
import { trace, gradient } from './sculpt.js';
import { propMaterial } from './materials.js';

const geo = new Map();
const cached = (key, make) => {
  if (!geo.has(key)) geo.set(key, make());
  return geo.get(key);
};
const sphere = (seg = 24) => cached(`s${seg}`, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.66)));
/** A thin curved stroke (smile, ^ eye, brow), as a tube along an arc. */
function arc(radius, from, to, thick, seg = 16) {
  return cached(`arc${radius}|${from}|${to}|${thick}`, () => {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = from + ((to - from) * i) / seg;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, thick, 6, false);
    // round caps
    const cap = new THREE.SphereGeometry(thick, 8, 6);
    const merged = [g];
    for (const p of [pts[0], pts.at(-1)]) merged.push(cap.clone().translate(p.x, p.y, p.z));
    return mergeSimple(merged);
  });
}
function mergeSimple(list) {
  const out = new THREE.BufferGeometry();
  const pos = [], nrm = [], idx = [];
  let base = 0;
  for (const g0 of list) {
    const g = g0.index ? g0 : g0;
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setIndex(idx);
  return out;
}

const basic = new Map();
const flat = (color, opacity = 1) => {
  const k = `${color}|${opacity}`;
  if (!basic.has(k)) basic.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return basic.get(k);
};
let eyeMat = null;
const glossyEye = () => (eyeMat ??= new THREE.MeshPhysicalMaterial({ color: '#1d1410', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));

/** Where a face point lands on the surface: march in from the front. */
function onSurface(sdf, x, y, z0 = 2) {
  const hit = trace(sdf, [x, y, z0], [0, 0, -1], 4);
  if (!hit) return null;
  const n = gradient(sdf, hit[0], hit[1], hit[2], 0.004);
  return { p: new THREE.Vector3(...hit), n: new THREE.Vector3(...n) };
}
/** Put an object on the surface facing out along the normal, in a bone's space. */
function seat(obj, at, bonePos, lift = 0, upright = true) {
  obj.position.copy(at.p).addScaledVector(at.n, lift).sub(bonePos);
  const look = at.n.clone();
  if (upright) look.y *= 0.5;
  obj.lookAt(obj.position.clone().add(look));
}

/**
 * Build the face on the head bone. Returns { setExpression(name), update(dt, st), parts }.
 * f = recipe.face; body = body colour (lids are body coloured).
 */
export function buildFace({ sdf, f, headBone, headPos, body, lowDetail = false }) {
  const root = new THREE.Group();
  root.name = 'face';
  headBone.add(root);
  const led = f.style === 'led';
  const r = f.eyeR;
  const eyes = [];
  const seg = lowDetail ? 12 : 24;
  for (const s of [-1, 1]) {
    const at = f.stalks ? { p: new THREE.Vector3(s * f.eyeX, f.eyeY, 0.12 + 0.05), n: new THREE.Vector3(0, 0, 1) } : onSurface(sdf, s * f.eyeX, f.eyeY);
    if (!at) continue;
    const g = new THREE.Group();
    seat(g, at, headPos, -r * 0.22, true);
    if (!led) g.rotateY(s * 0.12);
    const open = new THREE.Group();
    g.add(open);
    if (led) {
      const m = new THREE.Mesh(sphere(seg), propMaterial('#9ff9ff', { emissive: '#3fe0ff', ei: 1.1, gloss: 0 }));
      m.scale.set(r * 0.85, r * 1.15, r * 0.3);
      m.position.z = r * 0.25;
      open.add(m);
      const glint = new THREE.Mesh(sphere(8), flat('#ffffff'));
      glint.scale.setScalar(r * 0.22);
      glint.position.set(r * 0.25, r * 0.4, r * 0.5);
      open.add(glint);
    } else {
      const ball = new THREE.Mesh(sphere(seg), glossyEye());
      ball.scale.set(r, r * 1.22, r * 0.62);
      open.add(ball);
      // a hint of colour in the iris
      const iris = new THREE.Mesh(sphere(seg), flat(new THREE.Color(body).lerp(new THREE.Color('#2a1a14'), 0.75).getStyle()));
      iris.scale.set(r * 0.62, r * 0.75, r * 0.2);
      iris.position.set(0, -r * 0.18, r * 0.5);
      open.add(iris);
      const g1 = new THREE.Mesh(sphere(10), flat('#ffffff'));
      g1.scale.setScalar(r * 0.34);
      g1.position.set(r * 0.32, r * 0.38, r * 0.56);
      const g2 = new THREE.Mesh(sphere(8), flat('#ffffff'));
      g2.scale.setScalar(r * 0.15);
      g2.position.set(-r * 0.3, -r * 0.35, r * 0.6);
      open.add(g1, g2);
    }
    // The eyelid: a shell of body colour that rolls down over the eye.
    let lid = null;
    if (!led) {
      const lidGeo = cached(`lid${seg}`, () => new THREE.SphereGeometry(1, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2));
      lid = new THREE.Mesh(lidGeo, propMaterial(body, { gloss: 0.15 }));
      lid.scale.set(r * 1.12, r * 1.36, r * 0.74);
      const pivot = new THREE.Group();
      pivot.add(lid);
      g.add(pivot);
      lid = pivot;
      lid.visible = false;
    }
    // ^ for happy and cheering
    const happy = new THREE.Mesh(arc(r * 0.8, 0.25, Math.PI - 0.25, r * 0.16), led ? propMaterial('#9ff9ff', { emissive: '#3fe0ff', ei: 1.1, gloss: 0 }) : flat('#2a1a14'));
    happy.position.set(0, -r * 0.35, r * 0.55);
    happy.visible = false;
    g.add(happy);
    root.add(g);
    eyes.push({ g, open, lid, happy, side: s, rest: g.quaternion.clone() });
  }
  // Brows.
  const brows = led || lowDetail ? [] : [-1, 1].map((s) => {
    const at = onSurface(sdf, s * f.eyeX, f.eyeY + r * 1.75);
    if (!at) return null;
    const b = new THREE.Group();
    seat(b, at, headPos, 0.004);
    const m = new THREE.Mesh(arc(r * 0.9, Math.PI * 0.32, Math.PI * 0.68, r * 0.11), flat(new THREE.Color(body).multiplyScalar(0.35).getStyle()));
    m.position.y = -r * 0.85;
    b.add(m);
    root.add(b);
    return { b, s, y: b.position.y };
  }).filter(Boolean);
  // Mouths.
  const mouths = {};
  if (f.mouthY != null) {
    const at = onSurface(sdf, 0, f.mouthY);
    if (at) {
      const holder = new THREE.Group();
      seat(holder, at, headPos, 0.002);
      root.add(holder);
      const ink = led ? propMaterial('#9ff9ff', { emissive: '#3fe0ff', ei: 1.1, gloss: 0 }) : flat('#4a1f26');
      const mr = r * 0.7;
      mouths.smile = new THREE.Mesh(arc(mr, Math.PI + 0.55, Math.PI * 2 - 0.55, r * 0.1), ink);
      mouths.smile.position.y = mr * 0.6;
      mouths.grin = new THREE.Mesh(arc(mr * 1.15, Math.PI + 0.35, Math.PI * 2 - 0.35, r * 0.12), ink);
      mouths.grin.position.y = mr * 0.75;
      mouths.frown = new THREE.Mesh(arc(mr * 0.85, 0.6, Math.PI - 0.6, r * 0.1), ink);
      mouths.frown.position.y = -mr * 0.85;
      mouths.flat = new THREE.Mesh(arc(mr * 3, Math.PI * 1.5 - 0.1, Math.PI * 1.5 + 0.1, r * 0.09), ink);
      mouths.flat.position.y = mr * 3;
      const open = new THREE.Group();
      const hole = new THREE.Mesh(sphere(16), led ? ink : flat('#6b2230'));
      hole.scale.set(r * 0.62, r * 0.5, r * 0.18);
      const tongue = new THREE.Mesh(sphere(12), flat('#ff8fa3'));
      tongue.scale.set(r * 0.4, r * 0.22, r * 0.12);
      tongue.position.set(0, -r * 0.24, r * 0.08);
      open.add(hole);
      if (!led) open.add(tongue);
      mouths.open = open;
      const oh = new THREE.Mesh(sphere(14), led ? ink : flat('#6b2230'));
      oh.scale.set(r * 0.3, r * 0.36, r * 0.15);
      mouths.oh = oh;
      for (const m of Object.values(mouths)) {
        m.visible = false;
        holder.add(m);
      }
    }
  }
  // Blush.
  if (!led) for (const s of [-1, 1]) {
    const at = onSurface(sdf, s * f.cheekX, f.cheekY);
    if (!at) continue;
    const bl = new THREE.Mesh(cached('blush', () => new THREE.CircleGeometry(1, 20)), flat('#ff8f8f', 0.5));
    seat(bl, at, headPos, 0.006, false);
    bl.scale.set(r * 0.75, r * 0.5, 1);
    root.add(bl);
  }
  // Glasses (Hoot and Tock).
  if (f.glasses) {
    const frame = propMaterial('#3a2e2a', { gloss: 0.5 });
    const ringGeo = cached(`ring${r}`, () => new THREE.TorusGeometry(r * 1.45, r * 0.13, 8, 28));
    for (const e of eyes) {
      const ring = new THREE.Mesh(ringGeo, frame);
      ring.position.copy(e.g.position).add(new THREE.Vector3(0, 0, r * 0.45).applyQuaternion(e.g.quaternion));
      ring.quaternion.copy(e.g.quaternion);
      root.add(ring);
    }
    if (eyes.length === 2) {
      const a = eyes[0].g.position, b = eyes[1].g.position;
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.1, Math.max(0.01, a.distanceTo(b) - r * 2.8), 6), frame);
      bridge.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, r * 0.25, r * 0.7));
      bridge.rotation.z = Math.PI / 2;
      root.add(bridge);
    }
  }

  // ---- expressions
  let expr = 'neutral', talking = false, voice = null, shown = null, blinkT = 2 + Math.random() * 3, lookX = 0, lookY = 0;
  const show = (name) => {
    shown = mouths[name] ? name : null;
    for (const [k, m] of Object.entries(mouths)) m.visible = k === name;
  };
  function apply(t, shut) {
    const happyEyes = expr === 'happy' || expr === 'cheer';
    for (const e of eyes) {
      e.open.visible = !happyEyes;
      e.happy.visible = happyEyes;
      const big = expr === 'surprised' ? 1.18 : 1;
      e.open.scale.set(big, big * (shut && !e.lid ? 0.12 : 1), 1);
    }
    let mouth = { neutral: 'smile', happy: 'grin', cheer: 'open', surprised: 'oh', thinking: 'flat', sad: 'frown' }[expr] ?? 'smile';
    // Talking: with a recorded voice, the mouth follows its loudness (lip-sync lite); else a steady flap.
    if (talking && voice != null) mouth = voice > 0.45 ? 'open' : voice > 0.15 ? 'oh' : mouth;
    else if (talking && Math.sin(t * 16) > -0.2) mouth = expr === 'sad' ? 'oh' : 'open';
    show(mouth);
    for (const b of brows) {
      const up = expr === 'surprised' ? 0.035 : expr === 'thinking' && b.s > 0 ? 0.03 : expr === 'happy' || expr === 'cheer' ? 0.015 : 0;
      b.b.position.y = b.y + up * (f.eyeR / 0.07);
      b.b.rotation.z = expr === 'sad' ? -b.s * 0.45 : expr === 'thinking' && b.s < 0 ? 0.2 : 0;
    }
  }
  return {
    root,
    eyes,
    setExpression(name) {
      expr = name;
    },
    get expression() {
      return expr;
    },
    /** Talk (a flapping mouth); with `level` (0–1, a recorded voice's loudness) the mouth follows it. */
    talk(on, level = null) {
      talking = on;
      voice = on && level != null ? level : null;
    },
    /** The mouth shown now ('smile', 'open', 'oh' …), or null for a face without one. */
    get mouth() {
      return shown;
    },
    /** Blinks, lid poses and glances; call every frame. */
    update(dt, t) {
      blinkT -= dt;
      if (blinkT < -0.14) blinkT = 1.8 + Math.random() * 3.5;
      const blinking = blinkT < 0 && expr !== 'happy' && expr !== 'cheer';
      // lid angle: 0 = shut, −1.7 = fully open (hidden in the head)
      const rest = expr === 'sad' ? -0.75 : expr === 'thinking' ? -1.2 : -1.75;
      const k = blinking ? Math.sin((-blinkT / 0.14) * Math.PI) : 0;
      const angle = rest + (0 - rest) * k;
      // glance: thinking looks up and aside
      const tx = expr === 'thinking' ? 0.25 : lookX, ty = expr === 'thinking' ? 0.3 : lookY;
      for (const e of eyes) {
        if (e.lid) {
          e.lid.rotation.x = angle;
          e.lid.visible = angle > -1.6;
        }
        e.open.position.x += (tx * f.eyeR * 0.25 - e.open.position.x) * Math.min(1, dt * 8);
        e.open.position.y += (ty * f.eyeR * 0.2 - e.open.position.y) * Math.min(1, dt * 8);
      }
      apply(t, blinking);
    },
    look(x, y) {
      lookX = x;
      lookY = y;
    }
  };
}
