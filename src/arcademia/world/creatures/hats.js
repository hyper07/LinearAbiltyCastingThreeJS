/**
 * Hats as little 3D models, in the creatures' toon style with an outline.
 *
 *   buddy hats   party hat, beanie, flower crown, propeller cap, wizard hat,
 *                golden crown, space helmet (the shop sells them)
 *   costume hats for the history guides and the teachers (mortarboard, goggles,
 *                a pharaoh's nemes, a Roman helmet, a Viking helmet, a chef's hat …)
 *   townsfolk    the desert's sun hat and striped headscarf
 *   the desert   a scribe's wig, a pith helmet, Miss Lotus's lotus flower
 *
 * makeHat(id) builds one for a head of radius 1 standing on the head's top
 * point (y up, facing +z); figures.js scales and seats it on each species.
 */
import * as THREE from 'three';
import { propMaterial, outlineMaterial } from './materials.js';

const OUTLINE = '#2c1c18';
const vc = new Map();
function vcMat(gloss = 0.3, metal = 0) {
  const k = `${gloss}|${metal}`;
  if (vc.has(k)) return vc.get(k);
  const m = propMaterial('#ffffff', { gloss, metal }).clone();
  m.vertexColors = true;
  m.onBeforeCompile = propMaterial('#ffffff', { gloss, metal }).onBeforeCompile;
  vc.set(k, m);
  return m;
}
/** A mesh with its outline shell. */
function mesh(geometry, material, { outline = 0.022, color = OUTLINE } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geometry, outlineMaterial(color, outline));
    o.raycast = () => {};
    m.add(o);
  }
  return m;
}
/** Paint a geometry's vertices with a function of position. */
function paint(g, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    col.set(fn(v));
    col.toArray(c, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
/** A fluffy pompom: a lumpy ball. */
function pompom(r, color) {
  const g = new THREE.IcosahedronGeometry(r, 3);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = 1 + 0.12 * Math.sin(n.x * 13) * Math.sin(n.y * 11) * Math.sin(n.z * 12);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return mesh(g, propMaterial(color, { gloss: 0.05 }), { outline: 0.018 });
}
/** A lathe whose faces point outwards (three wants the profile listed bottom to top). */
const lathe = (pts, seg = 40) => {
  const list = pts[0][1] > pts.at(-1)[1] ? [...pts].reverse() : pts;
  return new THREE.LatheGeometry(list.map(([x, y]) => new THREE.Vector2(x, y)), seg);
};

/** A five-point star, puffy. */
function star(r, color, glow = true) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: r * 0.25, bevelEnabled: true, bevelThickness: r * 0.12, bevelSize: r * 0.1, bevelSegments: 2 });
  g.translate(0, 0, -r * 0.12);
  return mesh(g, propMaterial(color, glow ? { emissive: '#ffd36b', ei: 0.5, gloss: 0.8 } : { gloss: 0.6 }), { outline: 0.012 });
}

const BUDDY = {
  party() {
    const g = new THREE.Group();
    const cone = lathe([[0, 1.3], [0.08, 1.24], [0.3, 0.7], [0.5, 0.12], [0.56, 0.02], [0.5, 0]]);
    paint(cone, (v) => {
      const a = Math.atan2(v.z, v.x);
      return Math.floor((v.y * 5 + a * 0.5 + 10) % 2) ? '#ff6fb5' : '#ffd35c';
    });
    const c = mesh(cone, vcMat(0.4));
    g.add(c);
    // dots
    for (let i = 0; i < 9; i++) {
      const y = 0.25 + (i % 3) * 0.3, a = i * 2.2;
      const rr = 0.5 - y * 0.36 + 0.01;
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), propMaterial(['#7cc6ff', '#7ee08a', '#ffffff'][i % 3]));
      d.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      d.scale.set(1, 1, 0.5);
      d.lookAt(d.position.clone().multiplyScalar(2).setY(y));
      g.add(d);
    }
    const ruff = new THREE.TorusGeometry(0.52, 0.07, 10, 40);
    const p = ruff.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.y, v.x);
      const k = 1 + 0.25 * Math.abs(Math.sin(a * 9));
      const cx = Math.cos(a) * 0.52, cy = Math.sin(a) * 0.52;
      p.setXYZ(i, cx + (v.x - cx) * k, cy + (v.y - cy) * k, v.z * k);
    }
    ruff.computeVertexNormals();
    const rm = mesh(ruff, propMaterial('#ffffff', { gloss: 0.1 }), { outline: 0.015 });
    rm.rotation.x = Math.PI / 2;
    rm.position.y = 0.04;
    g.add(rm);
    const pom = pompom(0.17, '#ffe066');
    pom.position.y = 1.36;
    g.add(pom);
    g.rotation.z = -0.18;
    g.position.x = 0.1;
    return g;
  },
  beanie() {
    const g = new THREE.Group();
    const dome = lathe([[0.001, 0.82], [0.35, 0.78], [0.66, 0.6], [0.86, 0.32], [0.95, 0.06], [0.96, -0.02]], 48);
    const p = dome.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.z, v.x), rr = Math.hypot(v.x, v.z);
      const k = 1 + 0.025 * Math.cos(a * 22) * Math.min(1, rr * 2);
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    dome.computeVertexNormals();
    g.add(mesh(dome, propMaterial('#ef6f6c', { gloss: 0.08 })));
    const cuff = lathe([[0.95, -0.12], [1.04, -0.08], [1.06, 0.06], [1.04, 0.2], [0.95, 0.24]], 48);
    const cp = cuff.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      v.fromBufferAttribute(cp, i);
      const a = Math.atan2(v.z, v.x);
      const k = 1 + 0.02 * Math.cos(a * 36);
      cp.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    cuff.computeVertexNormals();
    g.add(mesh(cuff, propMaterial('#fff1f1', { gloss: 0.05 })));
    const pom = pompom(0.24, '#fff1f1');
    pom.position.y = 0.92;
    g.add(pom);
    g.position.y = -0.38;
    return g;
  },
  flower() {
    const g = new THREE.Group();
    const vine = mesh(new THREE.TorusGeometry(0.78, 0.06, 8, 40), propMaterial('#59b85e', { gloss: 0.2 }), { outline: 0.012 });
    vine.rotation.x = Math.PI / 2;
    g.add(vine);
    const colors = ['#ff9ed2', '#ffe066', '#ffffff', '#c9b6ff', '#ff8f8f'];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const f = new THREE.Group();
      f.position.set(Math.cos(a) * 0.78, 0.04, Math.sin(a) * 0.78);
      f.lookAt(f.position.clone().multiplyScalar(2).setY(0.6));
      const pm = propMaterial(colors[i % colors.length], { gloss: 0.2 });
      for (let k = 0; k < 5; k++) {
        const pet = mesh(new THREE.SphereGeometry(0.1, 12, 8), pm, { outline: 0.01 });
        const b = (k / 5) * Math.PI * 2;
        pet.position.set(Math.cos(b) * 0.1, Math.sin(b) * 0.1, 0);
        pet.scale.set(1, 1, 0.45);
        f.add(pet);
      }
      const mid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), propMaterial(i % 2 ? '#ffb347' : '#ffe066', { gloss: 0.4 }));
      mid.position.z = 0.03;
      f.add(mid);
      g.add(f);
      const leaf = mesh(new THREE.SphereGeometry(0.08, 10, 6), propMaterial('#7ee08a'), { outline: 0.008 });
      const b2 = a + Math.PI / 8;
      leaf.position.set(Math.cos(b2) * 0.8, 0.0, Math.sin(b2) * 0.8);
      leaf.scale.set(1.6, 0.4, 0.8);
      leaf.rotation.y = -b2;
      g.add(leaf);
    }
    g.position.y = -0.16;
    return g;
  },
  propeller() {
    const g = new THREE.Group();
    const dome = new THREE.SphereGeometry(0.9, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    paint(dome, (v) => ['#ff6f6f', '#ffe066', '#7cc6ff', '#7ee08a'][Math.floor(((Math.atan2(v.z, v.x) + Math.PI) / (Math.PI * 2)) * 4) % 4]);
    const d = mesh(dome, vcMat(0.45));
    d.scale.y = 0.85;
    g.add(d);
    const brim = new THREE.CylinderGeometry(0.62, 0.62, 0.05, 32, 1, false, -Math.PI / 2, Math.PI);
    const bm = mesh(brim, propMaterial('#ff6f6f', { gloss: 0.4 }), { outline: 0.012 });
    bm.position.set(0, 0.02, 0.62);
    bm.scale.set(1, 1, 0.9);
    bm.rotation.x = 0.12;
    g.add(bm);
    const button = mesh(new THREE.SphereGeometry(0.1, 12, 8), propMaterial('#ffe066', { gloss: 0.6 }), { outline: 0.01 });
    button.position.y = 0.78;
    g.add(button);
    const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), propMaterial('#888fa0', { metal: 1 }), { outline: 0.008 });
    stem.position.y = 0.88;
    g.add(stem);
    const spin = new THREE.Group();
    spin.position.y = 0.99;
    for (const s of [-1, 1]) {
      const blade = mesh(new THREE.BoxGeometry(0.62, 0.025, 0.16, 6, 1, 1), propMaterial(s > 0 ? '#7cc6ff' : '#ff9ed2', { gloss: 0.5 }), { outline: 0.008 });
      blade.position.x = s * 0.33;
      blade.rotation.x = s * 0.35;
      spin.add(blade);
    }
    const cap = mesh(new THREE.SphereGeometry(0.06, 10, 8), propMaterial('#ffe066', { gloss: 0.6 }), { outline: 0.008 });
    spin.add(cap);
    g.add(spin);
    g.userData.spin = spin;
    g.position.y = -0.34;
    return g;
  },
  wizard() {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push([0.62 * (1 - t) ** 1.15 + 0.02, t * 1.55]);
    }
    const cone = lathe(pts.reverse(), 36);
    const p = cone.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = v.y / 1.55;
      p.setXYZ(i, v.x, v.y - t * t * 0.25, v.z - t * t * t * 0.55);
    }
    cone.computeVertexNormals();
    g.add(mesh(cone, propMaterial('#6f5ad6', { gloss: 0.25 })));
    const brim = lathe([[0.55, 0.06], [1.1, 0.0], [1.22, -0.03], [1.18, -0.06], [0.55, -0.02]], 48);
    const bp = brim.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      v.fromBufferAttribute(bp, i);
      const a = Math.atan2(v.z, v.x), rr = Math.hypot(v.x, v.z);
      bp.setY(i, v.y + Math.sin(a * 3) * 0.04 * Math.max(0, rr - 0.6));
    }
    brim.computeVertexNormals();
    g.add(mesh(brim, propMaterial('#5b47c4', { gloss: 0.25 })));
    const band = mesh(lathe([[0.6, 0.02], [0.62, 0.06], [0.6, 0.16], [0.56, 0.18]], 36), propMaterial('#ffd23f', { metal: 0.8 }), { outline: 0.01 });
    g.add(band);
    for (const [x, y, z, r] of [[0.0, 0.6, 0.42, 0.11], [-0.24, 0.95, 0.24, 0.08], [0.25, 0.35, 0.47, 0.07], [0.12, 1.15, 0.1, 0.06]]) {
      const s = star(r, '#ffe066');
      s.position.set(x, y, z);
      s.lookAt(x * 3, y, z * 3 + 1);
      g.add(s);
    }
    g.position.y = -0.2;
    return g;
  },
  crown() {
    const g = new THREE.Group();
    const seg = 60, spikes = 5;
    const ring = new THREE.CylinderGeometry(0.62, 0.56, 0.5, seg, 3, true);
    const p = ring.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y > 0.2) {
        const a = Math.atan2(v.z, v.x);
        const k = Math.abs(Math.cos((a * spikes) / 2));
        p.setY(i, 0.04 + k ** 3 * 0.42);
      }
    }
    ring.computeVertexNormals();
    const gold = propMaterial('#ffcf3a', { metal: 1, gloss: 0.6 });
    const rm = mesh(ring, gold);
    rm.material = gold.clone();
    rm.material.side = THREE.DoubleSide;
    rm.material.onBeforeCompile = gold.onBeforeCompile;
    g.add(rm);
    const rim = mesh(new THREE.TorusGeometry(0.6, 0.06, 10, 48), gold, { outline: 0.012 });
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.24;
    g.add(rim);
    for (let i = 0; i < spikes; i++) {
      const a = ((i * 2) / spikes) * Math.PI + Math.PI / 2;
      const ball = mesh(new THREE.SphereGeometry(0.065, 12, 8), gold, { outline: 0.01 });
      const rr = 0.62;
      // the spike tips sit where cos(a·spikes/2) = ±1
      const at = (i / spikes) * Math.PI * 2;
      ball.position.set(Math.cos(at) * rr, 0.5, Math.sin(at) * rr);
      g.add(ball);
      void a;
    }
    const gems = [['#ff5a6e', 0], ['#5ab8ff', 0.75], ['#7ee08a', -0.75], ['#c58cff', 1.5], ['#ffe066', -1.5]];
    for (const [c, off] of gems) {
      const a = Math.PI / 2 + off;
      const gem = mesh(new THREE.OctahedronGeometry(0.085, 0), propMaterial(c, { gloss: 1 }), { outline: 0.01 });
      gem.position.set(Math.cos(a) * 0.6, -0.04, Math.sin(a) * 0.6);
      gem.scale.set(1, 1.2, 0.6);
      gem.lookAt(gem.position.clone().multiplyScalar(3));
      g.add(gem);
    }
    g.position.y = 0.0;
    g.rotation.x = -0.08;
    return g;
  },
  space() {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfefff', transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), glass);
    dome.renderOrder = 2;
    dome.position.y = -0.72;
    g.add(dome);
    const shine = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 6, 30, 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
    shine.position.set(0, -0.62, 0.45);
    shine.rotation.set(-0.4, 0.4, 0.9);
    dome.renderOrder = 3;
    g.add(shine);
    const collar = mesh(new THREE.TorusGeometry(0.74, 0.13, 12, 40), propMaterial('#eef2f8', { gloss: 0.5 }), { outline: 0.014 });
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -1.36;
    g.add(collar);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.135, 4, 40, 0.5), propMaterial('#ff7a5c'));
    stripe.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.25);
    stripe.position.y = -1.36;
    g.add(stripe);
    const ant = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), propMaterial('#b8c2d0', { metal: 1 }), { outline: 0.008 });
    ant.position.set(0.32, 0.2, 0);
    ant.rotation.z = -0.35;
    g.add(ant);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), propMaterial('#ff6f6f', { emissive: '#ff4d4d', ei: 1 }));
    bulb.position.set(0.38, 0.35, 0);
    g.add(bulb);
    g.userData.blink = bulb;
    g.userData.helmet = true;
    return g;
  }
};

/* ---------------------------------------------------------------- costume hats */

function costume(id) {
  const g = new THREE.Group();
  const M = (c, o) => propMaterial(c, o);
  const P = (geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = null, ol = 0.016) => {
    const x = mesh(geo, m, { outline: ol });
    x.position.set(...pos);
    x.rotation.set(...rot);
    if (sc) x.scale.set(...sc);
    g.add(x);
    return x;
  };
  const S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
  const cap = (r, c, y = -0.36, o = {}) => P(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(c, o), [0, y, 0]);
  switch (id) {
    case 'mortarboard':
      P(new THREE.BoxGeometry(1.5, 0.08, 1.5), M('#2b2b3a', { gloss: 0.3 }), [0, 0.08, 0], [0, Math.PI / 4, 0]);
      P(new THREE.CylinderGeometry(0.55, 0.6, 0.3, 24), M('#2b2b3a'), [0, -0.08, 0]);
      P(S(0.08), M('#ffd23f', { metal: 1 }), [0, 0.15, 0]);
      P(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M('#ffd23f', { metal: 1 }), [0.5, -0.12, 0.25], [0, 0, 0.15], null, 0.006);
      P(S(0.06), M('#ffd23f', { metal: 1 }), [0.54, -0.38, 0.25]);
      break;
    case 'goggles':
      P(new THREE.TorusGeometry(0.98, 0.07, 8, 40), M('#5a4a3a'), [0, -0.42, 0], [Math.PI / 2 - 0.35, 0, 0]);
      for (const s of [-1, 1]) {
        P(new THREE.CylinderGeometry(0.22, 0.24, 0.16, 20), M('#d7b45a', { metal: 1 }), [s * 0.3, -0.18, 0.78], [Math.PI / 2 - 0.55, 0, 0]);
        P(new THREE.CircleGeometry(0.17, 20), new THREE.MeshPhysicalMaterial({ color: '#9fe3ff', roughness: 0.05, clearcoat: 1 }), [s * 0.3, -0.13, 0.86], [-0.55, 0, 0], null, 0);
      }
      break;
    case 'bone':
      P(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), M('#f4efe1'), [0, -0.1, 0], [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) for (const z of [-0.06, 0.06]) P(S(0.09), M('#f4efe1'), [s * 0.47, -0.1, z]);
      break;
    case 'nemes':
      cap(1.08, '#f2c94c', -0.92);
      for (let i = 0; i < 5; i++) P(new THREE.TorusGeometry(1.0 - i * 0.06, 0.03, 4, 32, Math.PI), M('#3b6fd6'), [0, -0.5 + i * 0.12, -0.05], [0, 0, 0], null, 0);
      for (const s of [-1, 1]) P(new THREE.BoxGeometry(0.32, 1.0, 0.14), M('#f2c94c'), [s * 0.95, -1.2, 0.2]);
      P(new THREE.ConeGeometry(0.08, 0.22, 8), M('#ffd23f', { metal: 1 }), [0, -0.05, 0.98], [0.4, 0, 0]);
      break;
    case 'helmet':
      cap(1.05, '#e2b84a', -0.85, { metal: 1 });
      P(new THREE.BoxGeometry(0.2, 0.5, 1.6), M('#e0453e'), [0, 0.25, -0.05]);
      break;
    case 'roundhelm':
      cap(1.06, '#a3abb5', -0.85, { metal: 1 });
      P(new THREE.BoxGeometry(0.12, 0.55, 0.12), M('#a3abb5', { metal: 1 }), [0, -0.92, 1.0]);
      P(new THREE.TorusGeometry(1.04, 0.06, 6, 32), M('#7d858f', { metal: 1 }), [0, -0.82, 0], [Math.PI / 2, 0, 0]);
      break;
    case 'knight':
      P(new THREE.CylinderGeometry(1.04, 1.04, 1.25, 28), M('#b9c1ca', { metal: 1 }), [0, -0.62, 0]);
      P(new THREE.BoxGeometry(1.2, 0.1, 0.1), M('#2d2d33'), [0, -0.78, 1.02]);
      P(new THREE.ConeGeometry(0.18, 0.6, 8), M('#3d6fd6'), [0, 0.2, 0]);
      break;
    case 'chef':
      P(new THREE.CylinderGeometry(0.75, 0.7, 0.6, 24), M('#ffffff'), [0, 0, 0]);
      P(S(0.85, 20, 14), M('#ffffff'), [0, 0.42, 0], [0, 0, 0], [1, 0.6, 1]);
      break;
    case 'tophat':
      P(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 32), M('#2b2b3a'), [0, -0.2, 0]);
      P(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 28), M('#2b2b3a', { gloss: 0.5 }), [0, 0.25, 0]);
      P(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 28), M('#e0453e'), [0, -0.08, 0], [0, 0, 0], null, 0);
      break;
    case 'flatcap':
    case 'cap':
    case 'kufi': {
      const c = id === 'kufi' ? '#f4f1ea' : id === 'cap' ? '#e2a33a' : '#6b5b4b';
      P(new THREE.CylinderGeometry(0.84, 0.92, 0.38, 28), M(c), [0, -0.25, 0]);
      if (id === 'flatcap') P(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20, 1, false, -Math.PI / 2, Math.PI), M(c), [0, -0.38, 0.75]);
      break;
    }
    case 'turban':
      P(new THREE.TorusGeometry(0.75, 0.28, 12, 28), M('#f6e7c8'), [0, -0.28, 0], [Math.PI / 2, 0, 0]);
      P(S(0.75, 20, 12), M('#f6e7c8'), [0, -0.15, 0], [0, 0, 0], [1, 0.6, 1]);
      P(S(0.11), M('#e0453e', { gloss: 1 }), [0, -0.2, 0.98]);
      break;
    case 'wreath':
      P(new THREE.TorusGeometry(0.9, 0.05, 6, 32), M('#5fae3f'), [0, -0.35, 0], [Math.PI / 2 - 0.2, 0, 0], null, 0.01);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        P(S(0.1, 8, 6), M('#6fbf4f'), [Math.cos(a) * 0.9, -0.35 + Math.sin(a) * 0.18, Math.sin(a) * 0.9], [0, -a, 0.5], [1.4, 0.45, 0.7], 0.008);
      }
      break;
    case 'topknot':
      P(S(0.3), M('#2b2b3a'), [0, 0, -0.1]);
      P(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), M('#ffd23f'), [0, 0.02, -0.1], [Math.PI / 2, 0, 0]);
      break;
    case 'feathers':
      P(new THREE.CylinderGeometry(0.9, 0.95, 0.25, 28), M('#ffd23f'), [0, -0.3, 0]);
      for (let i = 0; i < 7; i++) P(S(0.12, 10, 8), M(['#2fb5a3', '#e0453e', '#ffd23f'][i % 3]), [(i - 3) * 0.22, 0.2, -0.3], [-0.3, 0, (i - 3) * 0.18], [0.9, 4, 0.5], 0.01);
      break;
    case 'tricorn':
      P(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 3), M('#2b2b3a'), [0, -0.25, 0], [0, Math.PI, 0]);
      P(new THREE.CylinderGeometry(0.65, 0.75, 0.4, 24), M('#2b2b3a'), [0, -0.05, 0]);
      break;
    case 'pilot':
      cap(1.08, '#8a6a4e', -0.95);
      for (const s of [-1, 1]) P(new THREE.TorusGeometry(0.2, 0.06, 6, 16), M('#4c5560', { metal: 1 }), [s * 0.36, -0.3, 0.8], [-0.5, 0, 0]);
      break;
    case 'nurse':
      P(new THREE.BoxGeometry(1.0, 0.4, 0.5), M('#ffffff'), [0, -0.15, 0.15]);
      P(new THREE.BoxGeometry(0.26, 0.08, 0.02), M('#e0453e'), [0, -0.15, 0.41], [0, 0, 0], null, 0);
      P(new THREE.BoxGeometry(0.08, 0.26, 0.02), M('#e0453e'), [0, -0.15, 0.41], [0, 0, 0], null, 0);
      break;
    case 'straw':
      P(new THREE.CylinderGeometry(1.5, 1.5, 0.07, 32), M('#f2d27a'), [0, -0.3, 0]);
      P(new THREE.CylinderGeometry(0.7, 0.85, 0.45, 24), M('#f2d27a'), [0, -0.05, 0]);
      P(new THREE.CylinderGeometry(0.86, 0.86, 0.1, 24), M('#e0453e'), [0, -0.2, 0], [0, 0, 0], null, 0);
      break;
    // The desert townsfolk: a wide sun hat with a turquoise band and a flower, a striped headscarf with a cord.
    case 'sunhat':
      P(new THREE.CylinderGeometry(1.55, 1.62, 0.07, 36), M('#f4dc9a'), [0, -0.32, 0], [0.08, 0, 0]);
      P(S(0.78, 24, 12), M('#f4dc9a'), [0, -0.3, 0], [0, 0, 0], [1, 0.62, 1]);
      P(new THREE.CylinderGeometry(0.8, 0.8, 0.14, 28), M('#36bfc4'), [0, -0.2, 0], [0, 0, 0], null, 0);
      for (let i = 0; i < 5; i++) P(S(0.1, 8, 6), M(i % 2 ? '#ffffff' : '#ff8fa3'), [0.62 + Math.cos(i * 1.26) * 0.12, -0.12 + Math.sin(i * 1.26) * 0.12, 0.42], [0, 0, 0], [1, 1, 0.5], 0.008);
      P(S(0.06, 8, 6), M('#ffd23f'), [0.62, -0.12, 0.46]);
      break;
    case 'headscarf': {
      // A striped cloth over the crown, falling to the shoulders at the sides and back, open in front.
      const stripe = (v) => (Math.floor((Math.atan2(v.x, v.z) + Math.PI) * 4) % 2 ? '#fff6e6' : '#d9603b');
      const crown = paint(lathe([[0.001, 1.0], [0.45, 0.94], [0.88, 0.62], [1.06, 0.12]], 36), stripe);
      const drape = paint(new THREE.LatheGeometry([[1.16, -1.0], [1.12, -0.4], [1.06, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 30, 1.0, Math.PI * 2 - 2.0), stripe);
      for (const geo of [crown, drape]) {
        const c = mesh(geo, vcMat(0.1), { outline: 0.016 });
        c.position.y = -0.78;
        c.scale.set(1, 1, 0.94);
        g.add(c);
      }
      P(new THREE.TorusGeometry(0.98, 0.09, 8, 36), M('#2b2b33'), [0, -0.3, 0], [Math.PI / 2 - 0.12, 0, 0], null, 0.01);
      P(new THREE.TorusGeometry(0.98, 0.05, 6, 36), M('#f2c14e', { metal: 1 }), [0, -0.18, 0], [Math.PI / 2 - 0.12, 0, 0], null, 0);
      break;
    }
    // The desert's history guides: a scribe's black bob wig with a blue band, an archaeologist's pith helmet.
    case 'wig':
      cap(1.1, '#22202a', -0.95);
      for (const sd of [-1, 1]) P(new THREE.BoxGeometry(0.3, 0.85, 0.78), M('#22202a'), [sd * 0.96, -1.22, -0.12]);
      P(new THREE.BoxGeometry(1.7, 0.8, 0.3), M('#22202a'), [0, -1.22, -0.88]);
      P(new THREE.TorusGeometry(1.06, 0.05, 6, 36), M('#3b6fd6'), [0, -0.52, 0], [Math.PI / 2 + 0.12, 0, 0], null, 0.008);
      break;
    case 'pith':
      cap(0.98, '#ecdfbc', -0.62);
      P(new THREE.CylinderGeometry(1.45, 1.52, 0.06, 32), M('#e3d4ae'), [0, -0.6, 0]);
      P(new THREE.CylinderGeometry(1.0, 1.0, 0.14, 28), M('#6b5b4b'), [0, -0.5, 0], [0, 0, 0], null, 0);
      P(S(0.09, 10, 8), M('#e3d4ae'), [0, 0.37, 0]);
      break;
    // Miss Lotus's lotus flower, over one ear, on a little lily pad.
    case 'lotus': {
      const flower = new THREE.Group();
      flower.position.set(0.52, -0.22, 0.2);
      flower.rotation.set(0.2, 0, -0.55);
      g.add(flower);
      const pad = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24, 1, false, 0.4, Math.PI * 2 - 0.5), propMaterial('#6fbf5a', { gloss: 0.3 }), { outline: 0.012 });
      flower.add(pad);
      for (const [n, r, tilt, col] of [[8, 0.2, 0.95, '#ff9ec7'], [6, 0.1, 0.45, '#ffc2dc']]) {
        for (let i = 0; i < n; i++) {
          const spin = new THREE.Group();
          spin.rotation.y = (i / n) * Math.PI * 2 + (n === 6 ? 0.3 : 0);
          const petal = mesh(new THREE.SphereGeometry(0.15, 12, 8), propMaterial(col, { gloss: 0.25 }), { outline: 0.01 });
          petal.scale.set(0.62, 1.55, 0.38);
          petal.position.set(0, 0.2, r);
          petal.rotation.x = tilt;
          spin.add(petal);
          flower.add(spin);
        }
      }
      const heart = mesh(new THREE.SphereGeometry(0.1, 12, 8), propMaterial('#ffd23f', { gloss: 0.4 }), { outline: 0.01 });
      heart.position.y = 0.16;
      heart.scale.set(1, 0.6, 1);
      flower.add(heart);
      break;
    }
    default:
      return null;
  }
  return g;
}

/** The hats in the shop (ids), in order. */
export const BUDDY_HATS = Object.keys(BUDDY);
/** Build a hat by id (buddy or costume); null for 'none' or unknown. */
export function makeHat(id) {
  if (!id || id === 'none') return null;
  if (BUDDY[id]) return BUDDY[id]();
  if (id === 'beanie2') return BUDDY.beanie();
  return costume(id);
}
