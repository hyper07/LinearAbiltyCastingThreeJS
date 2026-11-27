/**
 * Hats as little 3D models, in the creatures' toon style with an outline.
 *
 *   buddy hats   party hat, beanie, flower crown, propeller cap, wizard hat,
 *                golden crown, space helmet (the shop sells them)
 *   costume hats for the history guides and the teachers (mortarboard, goggles,
 *                a pharaoh's nemes, a Roman helmet, a Viking helmet, a chef's hat …)
 *   townsfolk    the desert's sun hat and striped headscarf
 *   the desert   a scribe's wig, a pith helmet, Miss Lotus's lotus flower
 *   the Moon     the townsfolk's round bubble helmet and comms headset; its teachers' crescent
 *                hair clip, star-badge captain's cap and astronaut visor; the stargazers' starry cap
 *   Mars         the townsfolk's dust goggles with a bandana
 *   Sky Castle   the townsfolk's medieval hats: a baker's cap, a minstrel's feathered cap, a squire's soft
 *                padded helmet, a lady's hennin with a veil, a jester's belled cap, a copyist's hood, a
 *                linen coif, a wayfarer's hood and capelet; its teachers' clockmaker's loupe, scholar's velvet cap and
 *                inventor's goggles on a leather cap; its guides' gat, headband, Renaissance cap and wimple
 *   space suits  the clear bubble helmet, oxygen pack and chest light every creature wears on the space maps
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
    // The Moon's townsfolk: a round fishbowl helmet on a silver collar, and a comms headset with an antenna.
    case 'bubble': {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d9f2ff', transparent: true, opacity: 0.2, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.08, 36, 22), glass);
      dome.position.y = -0.82;
      dome.renderOrder = 2;
      g.add(dome);
      const shine = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.035, 6, 30, 1.0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
      shine.position.set(0, -0.7, 0.5);
      shine.rotation.set(-0.45, 0.5, 0.95);
      g.add(shine);
      P(new THREE.TorusGeometry(0.8, 0.14, 12, 40), M('#dfe5ee', { gloss: 0.6, metal: 0.4 }), [0, -1.62, 0], [Math.PI / 2, 0, 0], null, 0.012);
      P(new THREE.TorusGeometry(0.8, 0.06, 6, 40), M('#2fb8c4'), [0, -1.5, 0], [Math.PI / 2, 0, 0], null, 0);
      P(S(0.09, 10, 8), M('#ffd23f', { emissive: '#ffb648', ei: 0.8 }), [0, 0.28, 0]);
      g.userData.helmet = true;
      break;
    }
    case 'headset':
      P(new THREE.TorusGeometry(0.98, 0.07, 8, 32, Math.PI), M('#eef2f8', { gloss: 0.5 }), [0, -0.5, -0.05], [0, 0, 0], null, 0.01);
      for (const sd of [-1, 1]) {
        P(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 18), M('#ff8a3d'), [sd * 0.98, -0.62, -0.05], [0, 0, Math.PI / 2]);
        P(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 14), M('#2fb8c4'), [sd * 1.04, -0.62, -0.05], [0, 0, Math.PI / 2], null, 0);
      }
      P(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), M('#c3cad6', { metal: 1 }), [0.55, -0.88, 0.32], [1.1, -0.6, 0], null, 0.006);
      P(S(0.07, 10, 8), M('#2b2f3a'), [0.32, -1.02, 0.55]);
      P(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), M('#c3cad6', { metal: 1 }), [-0.7, -0.05, -0.05], [0, 0, 0.35], null, 0.006);
      P(S(0.09, 10, 8), M('#ff6f6f', { emissive: '#ff4d4d', ei: 0.9 }), [-0.81, 0.25, -0.05]);
      break;
    // The Moon's teachers: Miss Mochi's crescent-moon hair clip, Captain Ginger's star-badge captain's cap,
    // Dr. Comet's astronaut headband with its gold visor flipped up; the stargazers' starry cap.
    case 'crescent': {
      const clip = new THREE.Group();
      clip.position.set(0.42, -0.2, 0.42);
      clip.rotation.set(0.25, 0.35, -0.5);
      g.add(clip);
      const moon = mesh(new THREE.TorusGeometry(0.24, 0.085, 10, 24, Math.PI * 1.15), propMaterial('#ffd23f', { gloss: 0.7, emissive: '#ffb648', ei: 0.35 }), { outline: 0.012 });
      moon.rotation.z = 0.9;
      clip.add(moon);
      const little = star(0.11, '#fff3b0');
      little.position.set(0.2, 0.08, 0.02);
      clip.add(little);
      P(S(0.05, 8, 6), M('#ff9ec7'), [0.3, -0.42, 0.52]);
      break;
    }
    case 'spacecap': {
      // A captain's cap: a flared navy crown with a gold band, a shiny black peak and a star badge.
      P(new THREE.CylinderGeometry(1.0, 0.86, 0.3, 28), M('#2b3a67', { gloss: 0.3 }), [0, 0.0, 0.02], [-0.06, 0, 0]);
      P(new THREE.CylinderGeometry(0.86, 0.86, 0.16, 28), M('#1d2540', { gloss: 0.3 }), [0, -0.24, 0]);
      P(new THREE.CylinderGeometry(0.875, 0.875, 0.05, 28), M('#ffd23f', { metal: 1 }), [0, -0.2, 0], [0, 0, 0], null, 0);
      P(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20, 1, false, -Math.PI / 2, Math.PI), M('#15192b', { gloss: 0.7 }), [0, -0.33, 0.7], [0.22, 0, 0]);
      const badge = star(0.17, '#ffd23f');
      badge.position.set(0, -0.0, 0.97);
      badge.rotation.x = -0.1;
      g.add(badge);
      P(new THREE.TorusGeometry(0.24, 0.022, 6, 28), M('#7cc6ff', { emissive: '#7cc6ff', ei: 0.3 }), [0, 0.0, 0.95], [0.1, 0, 0.5], null, 0);
      break;
    }
    case 'visor': {
      // A white padded headband with an orange stripe, the gold visor flipped up over the brow, a little antenna.
      P(new THREE.TorusGeometry(0.86, 0.11, 10, 40), M('#f4f6fa', { gloss: 0.5 }), [0, -0.3, 0], [Math.PI / 2 - 0.1, 0, 0], null, 0.012);
      P(new THREE.TorusGeometry(0.85, 0.045, 6, 40), M('#ff8a3d'), [0, -0.23, 0.01], [Math.PI / 2 - 0.1, 0, 0], null, 0);
      const gold = new THREE.MeshStandardMaterial({ color: '#ffcf4d', metalness: 0.35, roughness: 0.22, emissive: '#c98a1a', emissiveIntensity: 0.3, side: THREE.DoubleSide });
      const shield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 10, Math.PI / 2 - 0.85, 1.7, 0.3, 0.62), gold);
      shield.position.set(0, -0.78, 0.04);
      shield.scale.set(1.06, 1.0, 1.06);
      shield.castShadow = true;
      g.add(shield);
      for (const sd of [-1, 1]) P(S(0.1, 10, 8), M('#f4f6fa', { gloss: 0.5 }), [sd * 0.8, -0.3, 0.3]);
      P(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), M('#c3cad6', { metal: 1 }), [0.7, -0.05, -0.35], [0, 0, -0.35], null, 0.006);
      P(S(0.08, 10, 8), M('#7ff7ff', { emissive: '#3fd0ff', ei: 0.9 }), [0.78, 0.18, -0.35]);
      break;
    }
    case 'starcap': {
      cap(0.95, '#2b3a67', -0.42);
      P(new THREE.TorusGeometry(0.93, 0.08, 8, 36), M('#4a5fa8'), [0, -0.4, 0], [Math.PI / 2, 0, 0], null, 0.01);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const s = star(0.1, '#ffd23f', false);
        s.position.set(Math.sin(a) * 0.92, -0.16 + (i % 2) * 0.06, Math.cos(a) * 0.92);
        s.lookAt(s.position.clone().multiplyScalar(2));
        g.add(s);
      }
      const tip = mesh(new THREE.TorusGeometry(0.16, 0.06, 8, 18, Math.PI * 1.2), propMaterial('#ffd23f', { emissive: '#ffb648', ei: 0.4 }), { outline: 0.01 });
      tip.position.set(0, 0.62, 0);
      tip.rotation.z = 0.6;
      g.add(tip);
      break;
    }
    // Mars's townsfolk: dust goggles with a bandana (worn under the space suit's helmet).
    case 'dustgoggles': {
      // A strap round the head, two big round amber goggles pushed up on the brow.
      P(new THREE.TorusGeometry(0.98, 0.07, 8, 36), M('#6b4a3a'), [0, -0.5, 0], [Math.PI / 2 - 0.25, 0, 0], null, 0.01);
      for (const sx of [-1, 1]) {
        const q = new THREE.Group();
        q.position.set(sx * 0.33, -0.3, 0.86);
        q.rotation.set(-0.5, sx * 0.3, 0);
        g.add(q);
        const rim = mesh(new THREE.TorusGeometry(0.26, 0.08, 10, 24), propMaterial('#d9744a', { gloss: 0.5 }), { outline: 0.012 });
        q.add(rim);
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ffb347', transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1, emissive: '#ff8a2a', emissiveIntensity: 0.15 }));
        lens.rotation.x = Math.PI / 2;
        lens.scale.set(1, 0.45, 1);
        q.add(lens);
      }
      P(new THREE.BoxGeometry(0.16, 0.1, 0.1), M('#6b4a3a'), [0, -0.3, 0.98], [-0.5, 0, 0], null, 0.008);
      // A teal bandana round the neck, knotted at the back.
      P(new THREE.TorusGeometry(0.78, 0.17, 10, 32), M('#2fb5ad', { gloss: 0.1 }), [0, -1.78, 0.05], [Math.PI / 2 - 0.15, 0, 0], null, 0.012);
      P(new THREE.ConeGeometry(0.22, 0.4, 4), M('#2fb5ad', { gloss: 0.1 }), [0, -1.95, -0.8], [-0.4, 0, Math.PI], null, 0.01);
      break;
    }
    // Mars's teachers (small enough to keep on under the space helmet): Miss Ruby's red-pebble hair clip and
    // the pencil tucked over her ear, Professor Woolly's red-planet pin, Dr. Digby's miner's headlamp.
    case 'pebbleclip': {
      const clip = new THREE.Group();
      clip.position.set(0.44, -0.18, 0.4);
      clip.rotation.set(0.2, 0.4, -0.45);
      g.add(clip);
      const pebble = new THREE.IcosahedronGeometry(0.2, 1);
      const pp = pebble.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const k = 1 + 0.12 * Math.sin(pp.getX(i) * 17) * Math.cos(pp.getZ(i) * 13);
        pp.setXYZ(i, pp.getX(i) * k, pp.getY(i) * k * 0.75, pp.getZ(i) * k * 0.8);
      }
      pebble.computeVertexNormals();
      clip.add(mesh(pebble, propMaterial('#d0593a', { gloss: 0.35 }), { outline: 0.012 }));
      const shine = mesh(new THREE.SphereGeometry(0.05, 8, 6), propMaterial('#ffb08a', { gloss: 0.8 }), { outline: 0 });
      shine.position.set(-0.06, 0.07, 0.12);
      clip.add(shine);
      const bar = mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), propMaterial('#ffd23f', { metal: 1 }), { outline: 0.006 });
      bar.position.set(0, -0.12, -0.06);
      clip.add(bar);
      // A yellow pencil over the other ear: painted wood, a sharpened point, a pink eraser.
      const pencil = new THREE.Group();
      pencil.position.set(-0.8, -0.55, 0.05);
      pencil.rotation.set(0.15, 0, 0.95);
      g.add(pencil);
      pencil.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), propMaterial('#ffcf3a', { gloss: 0.4 }), { outline: 0.01 }));
      const wood = mesh(new THREE.ConeGeometry(0.06, 0.14, 6), propMaterial('#f2d2a2'), { outline: 0.008 });
      wood.position.y = -0.42;
      wood.rotation.x = Math.PI;
      pencil.add(wood);
      const lead = mesh(new THREE.ConeGeometry(0.022, 0.05, 6), propMaterial('#3a3540'), { outline: 0 });
      lead.position.y = -0.475;
      lead.rotation.x = Math.PI;
      pencil.add(lead);
      const band = mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.07, 8), propMaterial('#c9cfd8', { metal: 1 }), { outline: 0.006 });
      band.position.y = 0.37;
      pencil.add(band);
      const eraser = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8), propMaterial('#ff9eb5'), { outline: 0.008 });
      eraser.position.y = 0.44;
      pencil.add(eraser);
      break;
    }
    case 'marspin': {
      const pin = new THREE.Group();
      pin.position.set(0.3, -0.12, 0.42);
      pin.rotation.set(0.3, 0.4, 0);
      g.add(pin);
      const planet = mesh(new THREE.SphereGeometry(0.17, 18, 12), propMaterial('#d9603b', { gloss: 0.45 }), { outline: 0.012 });
      pin.add(planet);
      // A pale ice cap and a dark patch, like the real red planet.
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.172, 14, 6, 0, Math.PI * 2, 0, 0.5), propMaterial('#ffffff'));
      pin.add(capTop);
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), propMaterial('#9a3f26'));
      patch.position.set(0.05, -0.02, 0.135);
      patch.scale.set(1.4, 0.6, 0.5);
      pin.add(patch);
      const little = star(0.08, '#ffd23f');
      little.position.set(0.2, 0.14, 0.04);
      pin.add(little);
      break;
    }
    case 'headlamp': {
      // A strap round the head and a round lamp over the brow, glowing warm.
      P(new THREE.TorusGeometry(0.97, 0.075, 8, 36), M('#3d4a5c'), [0, -0.42, 0], [Math.PI / 2 - 0.3, 0, 0], null, 0.01);
      P(new THREE.TorusGeometry(0.97, 0.03, 6, 36), M('#ffb83d'), [0, -0.36, 0.02], [Math.PI / 2 - 0.3, 0, 0], null, 0);
      const lamp = new THREE.Group();
      lamp.position.set(0, -0.12, 0.9);
      lamp.rotation.x = -0.35;
      g.add(lamp);
      const housing = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 18), propMaterial('#ffb83d', { gloss: 0.5 }), { outline: 0.012 });
      housing.rotation.x = Math.PI / 2;
      lamp.add(housing);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), propMaterial('#fff6c8', { emissive: '#ffe58a', ei: 1.0 }));
      glow.position.z = 0.105;
      lamp.add(glow);
      break;
    }
    // The Sky Castle's townsfolk (figures.js GARB): medieval hats and hoods.
    case 'bakercap': {
      // A puffy white baker's cap, flopping a little to one side.
      P(new THREE.CylinderGeometry(0.86, 0.9, 0.34, 28), M('#fffaf2'), [0, -0.3, 0]);
      const puff = P(S(0.9, 22, 14), M('#ffffff', { gloss: 0.1 }), [0.12, 0.05, -0.04], [0, 0, -0.25], [1.05, 0.62, 1.0]);
      void puff;
      P(new THREE.TorusGeometry(0.88, 0.05, 6, 32), M('#e8b45a'), [0, -0.3, 0], [Math.PI / 2, 0, 0], null, 0);
      break;
    }
    case 'minstrel': {
      // A soft round cap tilted over one ear, a gold band and a long curling feather.
      P(S(0.96, 24, 12), M('#3a6fd0'), [0.08, -0.22, 0], [0, 0, -0.18], [1.08, 0.42, 1.04]);
      P(new THREE.TorusGeometry(0.9, 0.07, 6, 32), M('#ffd23f', { gloss: 0.6 }), [0, -0.36, 0], [Math.PI / 2, 0, -0.18], null, 0.01);
      const feather = new THREE.Group();
      feather.position.set(-0.55, -0.15, -0.2);
      feather.rotation.set(-0.5, 0.3, 0.55);
      const vane = mesh(new THREE.SphereGeometry(0.5, 14, 10), propMaterial('#ff6f5f', { gloss: 0.2 }), { outline: 0.012 });
      vane.scale.set(0.24, 1.6, 0.06);
      vane.position.y = 0.7;
      feather.add(vane);
      const tip = mesh(new THREE.SphereGeometry(0.2, 10, 8), propMaterial('#ffd23f'), { outline: 0.01 });
      tip.scale.set(0.5, 1.0, 0.2);
      tip.position.y = 1.45;
      feather.add(tip);
      g.add(feather);
      break;
    }
    case 'softhelm': {
      // A friendly padded cloth helmet (no visor, no point): quilted silver-blue, a fat red plume.
      cap(1.07, '#c9d4e2', -0.7, { gloss: 0.35 }).rotation.x = -0.3;
      for (let i = 0; i < 6; i++) P(new THREE.TorusGeometry(1.0, 0.035, 4, 32, Math.PI), M('#a9b6c8'), [0, -0.7, 0], [-0.3, (i / 6) * Math.PI, 0], null, 0);
      P(new THREE.TorusGeometry(1.05, 0.09, 8, 36), M('#3a6fd0'), [0, -0.66, -0.2], [Math.PI / 2 - 0.3, 0, 0], null, 0.01);
      const plume = pompom(0.32, '#e0574f');
      plume.position.set(0, 0.28, -0.05);
      plume.scale.set(0.9, 1.3, 1.3);
      g.add(plume);
      P(S(0.09, 10, 8), M('#ffd23f', { metal: 1 }), [0, 0.06, 0]);
      break;
    }
    case 'hennin': {
      // A tall cone hat tipped back, a gold band, a soft veil trailing from its tip.
      const hat = new THREE.Group();
      hat.rotation.x = -0.42;
      hat.position.set(0, -0.32, -0.1);
      const coneM = mesh(new THREE.ConeGeometry(0.62, 2.1, 28, 1, true), propMaterial('#ff8fb8', { gloss: 0.35, side: THREE.DoubleSide }), { outline: 0.016 });
      coneM.position.y = 1.02;
      hat.add(coneM);
      const band = mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 30), propMaterial('#f2c14e', { gloss: 0.6, metal: 0.6 }), { outline: 0.01 });
      band.rotation.x = Math.PI / 2;
      hat.add(band);
      const veil = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 18, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: '#fff4fb', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      veil.position.set(0, 1.15, -0.32);
      veil.rotation.x = Math.PI + 0.55;
      hat.add(veil);
      g.add(hat);
      break;
    }
    case 'jester': {
      // Three floppy points in two colours, a gold bell on each tip, a band.
      P(new THREE.CylinderGeometry(0.88, 0.94, 0.4, 28), M('#7b5fd0'), [0, -0.28, 0]);
      const cols = ['#ffd23f', '#7b5fd0', '#e0574f'];
      [-1, 0, 1].forEach((k, i) => {
        const pts = [[0, 0, 0], [k * 0.45, 0.55, -0.08 * Math.abs(k)], [k * 1.0, 0.65, -0.05], [k * 1.3, 0.25 + (k ? 0 : 0.6), 0.05]].map((v) => new THREE.Vector3(...v));
        if (!k) pts.splice(2, 2, new THREE.Vector3(0.1, 1.05, -0.2), new THREE.Vector3(0.45, 1.2, -0.45));
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.TubeGeometry(curve, 16, 1, 10, false);
        const pos = tube.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
        for (let a = 0; a <= 16; a++) {
          curve.getPointAt(a / 16, c);
          for (let b = 0; b <= 10; b++) {
            const id = a * 11 + b;
            v.fromBufferAttribute(pos, id).sub(c).multiplyScalar(0.38 * (1 - (a / 16) * 0.8)).add(c);
            pos.setXYZ(id, v.x, v.y, v.z);
          }
        }
        tube.computeVertexNormals();
        const m = mesh(tube, propMaterial(cols[i], { gloss: 0.3 }), { outline: 0.014 });
        m.position.y = -0.2;
        g.add(m);
        const end = pts.at(-1);
        P(S(0.13, 12, 8), M('#f2c14e', { metal: 1, gloss: 0.8 }), [end.x, end.y - 0.2, end.z]);
      });
      break;
    }
    case 'scribehood': {
      // A copyist's monk-like hood of brown wool: over the crown, down to the shoulders, open in front, a point at the back.
      const brown = '#8a6a4a';
      const crown = lathe([[0.001, 1.05], [0.48, 0.98], [0.9, 0.66], [1.1, 0.14]], 36);
      const drape = new THREE.LatheGeometry([[1.2, -1.1], [1.15, -0.45], [1.1, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 30, 0.95, Math.PI * 2 - 1.9);
      for (const geo of [crown, drape]) {
        const c = mesh(geo, propMaterial(brown, { gloss: 0.05, side: THREE.DoubleSide }), { outline: 0.016 });
        c.position.y = -0.8;
        g.add(c);
      }
      P(new THREE.ConeGeometry(0.32, 0.9, 14), M(brown), [0, -0.1, -0.85], [-1.2, 0, 0]);
      P(new THREE.TorusGeometry(1.08, 0.07, 6, 36, Math.PI * 1.2), M('#6b4f36'), [0, -0.68, 0], [Math.PI / 2, 0, Math.PI * 0.9], null, 0.01);
      break;
    }
    case 'coif': {
      // A white linen coif close round the head, a little ribbon bow at the back.
      // Tipped back off the face, like a bonnet.
      cap(1.06, '#fffaf2', -0.78, { gloss: 0.1 }).rotation.x = -0.5;
      P(new THREE.TorusGeometry(1.03, 0.06, 6, 36), M('#ffffff'), [0, -0.72, -0.36], [Math.PI / 2 - 0.5, 0, 0], null, 0.01);
      for (const sx of [-1, 1]) P(S(0.16, 10, 8), M('#5f9f6a'), [sx * 0.18, -0.55, -1.02], [0, 0, 0], [1.3, 0.7, 0.5], 0.01);
      P(S(0.09, 8, 6), M('#5f9f6a'), [0, -0.55, -1.04]);
      break;
    }
    case 'hood': {
      // A wayfarer's red hood with a shoulder capelet, open in front, its long point flopping down the back.
      const red = '#d8484a';
      const crown = lathe([[0.001, 1.04], [0.47, 0.97], [0.9, 0.64], [1.1, 0.14]], 36);
      const cape = new THREE.LatheGeometry([[1.75, -1.35], [1.45, -1.05], [1.18, -0.5], [1.1, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 34, 0.9, Math.PI * 2 - 1.8);
      for (const geo of [crown, cape]) {
        const c = mesh(geo, propMaterial(red, { gloss: 0.1, side: THREE.DoubleSide }), { outline: 0.016 });
        c.position.y = -0.8;
        g.add(c);
      }
      const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.1, -0.7], [0, 0.0, -1.25], [0.15, -0.6, -1.45]].map((v) => new THREE.Vector3(...v))), 12, 0.13, 8, false);
      g.add(mesh(tail, propMaterial(red, { gloss: 0.1 }), { outline: 0.012 }));
      P(new THREE.TorusGeometry(1.12, 0.06, 6, 36), M('#f2c14e', { metal: 1 }), [0, -0.66, 0.02], [Math.PI / 2 - 0.1, 0, 0], null, 0);
      break;
    }
    // The Sky Castle's teachers: a clockmaker's loupe, a scholar's velvet cap, an inventor's goggles on a leather cap.
    case 'loupe': {
      // A leather headband with a jeweller's loupe flipped up over the right eye, and a little brass gear on the side.
      P(new THREE.TorusGeometry(0.98, 0.07, 8, 36), M('#7a4a2e'), [0, -0.42, 0], [Math.PI / 2 - 0.3, 0, 0], null, 0.01);
      const loupe = new THREE.Group();
      loupe.position.set(0.4, -0.2, 0.86);
      loupe.rotation.set(-0.75, 0.2, 0);
      g.add(loupe);
      const tube = mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.3, 18), propMaterial('#2b2b3a', { gloss: 0.5 }), { outline: 0.01 });
      tube.rotation.x = Math.PI / 2;
      loupe.add(tube);
      const ring = mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), propMaterial('#d7b45a', { metal: 1 }), { outline: 0.006 });
      ring.position.z = 0.15;
      loupe.add(ring);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), new THREE.MeshPhysicalMaterial({ color: '#bfeaff', roughness: 0.05, clearcoat: 1 }));
      glass.position.z = 0.155;
      loupe.add(glass);
      const gear = new THREE.Group();
      gear.position.set(-0.9, -0.48, 0.32);
      gear.rotation.set(0, -1.2, Math.PI / 2);
      g.add(gear);
      gear.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), propMaterial('#d7b45a', { metal: 1 }), { outline: 0.008 }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tooth = mesh(new THREE.BoxGeometry(0.07, 0.06, 0.07), propMaterial('#d7b45a', { metal: 1 }), { outline: 0 });
        tooth.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
        tooth.rotation.y = -a;
        gear.add(tooth);
      }
      break;
    }
    case 'scholarcap': {
      // A soft velvet scholar's cap, deep indigo, with a gold button and a tassel hanging over one side.
      P(new THREE.CylinderGeometry(0.6, 0.64, 0.22, 28), M('#2f2a5a', { gloss: 0.15 }), [0, -0.1, 0]);
      P(S(0.66, 24, 12), M('#3a3470', { gloss: 0.15 }), [0, 0.04, 0], [0, 0, 0], [1, 0.42, 1]);
      P(new THREE.TorusGeometry(0.62, 0.05, 6, 30), M('#d7b45a', { metal: 0.8 }), [0, -0.2, 0], [Math.PI / 2, 0, 0], null, 0);
      P(S(0.09, 12, 8), M('#f2c14e', { metal: 0.8 }), [0, 0.32, 0]);
      const cord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.32, 0], [0.4, 0.26, 0.1], [0.66, 0.0, 0.18], [0.74, -0.32, 0.22]].map((v) => new THREE.Vector3(...v))), 12, 0.025, 6, false);
      g.add(mesh(cord, propMaterial('#f2c14e', { metal: 0.6 }), { outline: 0 }));
      P(new THREE.CylinderGeometry(0.05, 0.1, 0.24, 10), M('#f2c14e', { metal: 0.6 }), [0.75, -0.44, 0.22], [0, 0, 0], null, 0.008);
      break;
    }
    case 'tinkergoggles': {
      // A brown leather cap with ear flaps, brass goggles pushed up on the brow, rivets round the band.
      // The cap sits high and tipped back, so the eyes show under its brim.
      cap(1.04, '#7a4a2e', -0.6, { gloss: 0.2 }).rotation.x = -0.3;
      for (const sx of [-1, 1]) P(S(0.28, 12, 10), M('#6b3f26', { gloss: 0.2 }), [sx * 0.98, -0.72, -0.2], [0, 0, 0], [0.4, 0.9, 0.75], 0.012);
      P(new THREE.TorusGeometry(1.0, 0.06, 8, 36), M('#4a3326'), [0, -0.44, -0.04], [Math.PI / 2 - 0.3, 0, 0], null, 0.01);
      for (const sx of [-1, 1]) {
        P(new THREE.CylinderGeometry(0.2, 0.23, 0.16, 20), M('#d7b45a', { metal: 1 }), [sx * 0.3, -0.08, 0.86], [Math.PI / 2 - 0.85, 0, 0]);
        P(new THREE.CircleGeometry(0.155, 20), new THREE.MeshPhysicalMaterial({ color: '#ffd9a0', roughness: 0.05, clearcoat: 1 }), [sx * 0.3, -0.02, 0.92], [-0.85, 0, 0], null, 0);
      }
      P(new THREE.BoxGeometry(0.2, 0.05, 0.05), M('#d7b45a', { metal: 1 }), [0, -0.06, 0.93], [-0.85, 0, 0], null, 0.006);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.25 + i * 0.3);
        P(S(0.04, 6, 4), M('#d7b45a', { metal: 1 }), [Math.cos(a) * 1.0, -0.4, -Math.sin(a) * 0.98], [0, 0, 0], null, 0);
      }
      break;
    }
    // The Sky Castle's history guides (figures.js GARB): a Joseon scholar's gat, a craftsman's headband, a Renaissance cap, a nun's wimple.
    case 'gat': {
      // A Joseon scholar's black horsehair gat: a tall crown, a wide flat brim, a headband under it and a beaded strap.
      const black = M('#1d1d26', { gloss: 0.35 });
      P(new THREE.TorusGeometry(0.98, 0.07, 6, 36), M('#2b2b3a'), [0, -0.4, 0], [Math.PI / 2 - 0.15, 0, 0], null, 0.01);
      P(new THREE.CylinderGeometry(0.46, 0.5, 0.62, 24), black, [0, 0.2, 0]);
      P(new THREE.CylinderGeometry(1.5, 1.5, 0.04, 40), black, [0, -0.12, 0]);
      for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
        const k = i / 5;
        P(S(0.06, 8, 6), M(i % 2 ? '#3a5fa0' : '#f2c14e', { gloss: 0.6 }), [sx * (0.78 - k * 0.32), -0.2 - k * 1.25, 0.2 + k * 0.5], [0, 0, 0], null, 0.006);
      }
      break;
    }
    case 'hachimaki': {
      // A white cotton headband knotted at the back, its two ends fluttering.
      P(new THREE.TorusGeometry(1.0, 0.09, 8, 36), M('#ffffff', { gloss: 0.1 }), [0, -0.42, 0], [Math.PI / 2 - 0.15, 0, 0], null, 0.01);
      P(S(0.14, 10, 8), M('#ffffff', { gloss: 0.1 }), [0, -0.3, -1.0]);
      for (const sx of [-1, 1]) P(new THREE.BoxGeometry(0.14, 0.42, 0.04), M('#ffffff', { gloss: 0.1 }), [sx * 0.12, -0.55, -1.06], [0.2, 0, sx * 0.35], null, 0.008);
      break;
    }
    case 'beret': {
      // A Renaissance painter's soft dark cap, puffed and tipped to one side.
      P(S(1.0, 24, 14), M('#2f2a35', { gloss: 0.1 }), [0.1, -0.08, -0.02], [0, 0, -0.18], [1.08, 0.42, 1.04]);
      P(new THREE.TorusGeometry(0.9, 0.08, 8, 32), M('#3d3646'), [0, -0.3, 0], [Math.PI / 2, 0, 0], null, 0.01);
      break;
    }
    case 'wimple': {
      // A nun's (an abbess's) black veil over a white band, worn tipped back so the whole face (and a frog's eyes) show.
      const back = new THREE.Group();
      back.position.set(0, -0.15, -0.3);
      back.rotation.x = -0.55;
      g.add(back);
      const crown = lathe([[0.001, 1.05], [0.48, 0.98], [0.9, 0.66], [1.1, 0.14]], 36);
      const veil = new THREE.LatheGeometry([[1.24, -0.95], [1.16, -0.42], [1.1, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 30, 0.95, Math.PI * 2 - 1.9);
      for (const geo of [crown, veil]) {
        const c = mesh(geo, propMaterial('#26232e', { gloss: 0.08, side: THREE.DoubleSide }), { outline: 0.016 });
        c.position.y = -0.8;
        back.add(c);
      }
      const band = mesh(new THREE.TorusGeometry(1.1, 0.1, 8, 36), propMaterial('#ffffff', { gloss: 0.1 }), { outline: 0.01 });
      band.position.y = -0.66;
      band.rotation.x = Math.PI / 2;
      back.add(band);
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

/* ---------------------------------------------------------------- space suits (figures.js `suit`) */

/** The space suits' colours: the Moon's white with teal and orange, Mars's warm white with dusty terracotta. */
export const SUITS = {
  moon: { body: '#f4f6fa', belt: '#ff8a3d', boots: '#8f97a6', glove: '#2fb8c4', collar: '#dfe5ee', band: '#2fb8c4', lamp: '#7ff7ff', pack: '#e9edf4', tank: '#ff8a3d', dust: null },
  mars: { body: '#fbf3ea', belt: '#d9744a', boots: '#8a4a34', glove: '#d9744a', collar: '#f4ece4', band: '#d9744a', lamp: '#ffc83d', pack: '#f4ece4', tank: '#d9744a', dust: '#e4a27c' }
};
/** Hats small enough to keep on inside a space helmet; any other is left off while the suit is on. */
export const HATS_IN_HELMET = new Set(['beanie', 'beanie2', 'flower', 'crown', 'crescent', 'goggles', 'dustgoggles', 'headset', 'visor', 'spacecap', 'starcap', 'kufi', 'cap', 'topknot', 'pebbleclip', 'marspin', 'headlamp']);

/**
 * A clear bubble helmet of radius 1 round the origin (figures.js scales it to each head): the glass,
 * a shine, a soft collar ring at the neck with a coloured band, a little lamp on top.
 */
export function spaceHelmet(kind = 'moon') {
  const S = SUITS[kind] ?? SUITS.moon;
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: kind === 'mars' ? '#fff0e4' : '#e4f4ff', transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 26, 0, Math.PI * 2, 0, Math.PI * 0.8), glass);
  dome.renderOrder = 2;
  dome.raycast = () => {};
  g.add(dome);
  const shine = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 6, 30, 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
  shine.position.set(0, 0.1, 0.52);
  shine.rotation.set(-0.45, 0.5, 0.95);
  shine.raycast = () => {};
  g.add(shine);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
  dot.position.set(-0.42, 0.52, 0.68);
  g.add(dot);
  const ringY = -Math.cos(Math.PI * 0.2);
  const ringR = Math.sin(Math.PI * 0.2);
  const collar = mesh(new THREE.TorusGeometry(ringR + 0.06, 0.13, 12, 40), propMaterial(S.collar, { gloss: 0.5 }), { outline: 0.012 });
  collar.rotation.x = Math.PI / 2;
  collar.position.y = ringY;
  g.add(collar);
  const band = new THREE.Mesh(new THREE.TorusGeometry(ringR + 0.07, 0.06, 6, 40), propMaterial(S.band));
  band.rotation.x = Math.PI / 2;
  band.position.y = ringY + 0.1;
  g.add(band);
  const lamp = mesh(new THREE.SphereGeometry(0.09, 12, 8), propMaterial(S.lamp, { emissive: S.lamp, ei: 0.9 }), { outline: 0.008 });
  lamp.position.set(0.32, 0.95, 0.05);
  g.add(lamp);
  g.userData.blink = lamp;
  g.userData.helmet = true;
  return g;
}

/** A little oxygen pack, about 1 wide (figures.js scales it to each back): a soft frame, two tanks and a dial on its outside (−Z, away from the back it rides on). */
export function oxygenPack(kind = 'moon') {
  const S = SUITS[kind] ?? SUITS.moon;
  const g = new THREE.Group();
  const frame = mesh(new THREE.BoxGeometry(1, 1.15, 0.42), propMaterial(S.pack, { gloss: 0.35 }), { outline: 0.018 });
  g.add(frame);
  for (const sx of [-0.26, 0.26]) {
    const tank = mesh(new THREE.CapsuleGeometry(0.2, 0.62, 6, 16), propMaterial(S.tank, { gloss: 0.55 }), { outline: 0.014 });
    tank.position.set(sx, 0.02, -0.3);
    g.add(tank);
    const cap = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), propMaterial('#c9cfd8', { metal: 1 }), { outline: 0.008 });
    cap.position.set(sx, 0.6, -0.3);
    g.add(cap);
  }
  const dial = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), propMaterial('#ffffff'), { outline: 0.008 });
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0, 0.42, -0.23);
  g.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.01), propMaterial('#ff5f5f'));
  needle.position.set(0, 0.44, -0.26);
  needle.rotation.z = -0.6;
  g.add(needle);
  return g;
}

/** A small glowing chest light for a space suit (a disc in a ring), facing +Z. */
export function chestLight(kind = 'moon') {
  const S = SUITS[kind] ?? SUITS.moon;
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.5, 0.16, 8, 20), propMaterial(S.belt, { gloss: 0.5 }), { outline: 0.01 });
  g.add(ring);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.46, 20), propMaterial(S.lamp, { emissive: S.lamp, ei: 1.0 }));
  glow.position.z = 0.02;
  g.add(glow);
  return g;
}
