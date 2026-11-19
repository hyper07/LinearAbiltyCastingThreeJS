/**
 * The Stair of Roots, where Mistfall Gorge is split in two (zones.js): the
 * roots of the giants on the step above spill down it from wall to wall —
 * great ribs arching out and plunging into the floor below, braided with
 * long runners and hung with thin aerial roots — and over the old stone
 * stair two of them twist up into an arch, the Root Stair, a veil of the
 * gorge's mist swirling in it. Beyond the roots the other zone isn't built:
 * a bank of mist hides where this one ends, and a few slow puffs drift
 * about the arch. Built in both zones it divides, colliders and all.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../gloamreach/noise.js';
import { Cards } from '../gloamreach/fx.js';
import { ROOTWALL, rootLine } from './zones.js';
import { groundAt, waterAt, heightAt } from './heights.js';
import { tubeAlong } from './plants.js';
import { portalVeil, plainShadow } from '../shared/zones/props.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** The arch's frame: its middle, the axis along its span, the way through. */
export function rootArch() {
  const g = ROOTWALL.gate;
  const span = V(Math.cos(g.face), 0, -Math.sin(g.face));
  const through = V(Math.sin(g.face), 0, Math.cos(g.face));
  const half = g.half + 0.9;
  return { x: g.x, z: g.z, face: g.face, span, through, half, feet: [-1, 1].map((s) => ({ x: g.x + span.x * s * half, z: g.z + span.z * s * half })) };
}

/** Is x where the stair passes through the wall (no roots, no collider)? */
const OPEN = (x) => Math.abs(x - ROOTWALL.gate.x) < ROOTWALL.gate.half + 1.6;

export function buildRootwall(world, { bank }) {
  const scene = world.scene;
  const W = ROOTWALL;
  const r = rng(424);
  const group = new THREE.Group();
  group.name = 'rootwall';
  // The floor here, or the water's surface where the river runs under the roots.
  const floor = (x, z) => Math.max(groundAt(x, z), Number.isFinite(waterAt(x, z)) ? waterAt(x, z) : -Infinity);
  const big = [];
  const thin = [];

  // The ribs: from the step above (north of the line) up over a crest and down into the floor below —
  // tall ones and low, knotted ones between them, two rows deep, crossing at all angles.
  for (let x = W.x0; x <= W.x1; x += 1.3 + r() * 1.4) {
    if (OPEN(x)) continue;
    const row = r() < 0.5 ? -1 : 1;
    const z0 = rootLine(x) + row * (0.4 + r() * 0.9);
    const low = r() < 0.38;
    const lean = (r() - 0.5) * (low ? 2.4 : 1.6);
    const reachUp = 2.5 + r() * 4.5;
    const reachDown = 3 + r() * 5;
    const ax = x + lean * reachUp;
    const az = z0 - reachUp;
    const bx = x - lean * reachDown + (r() - 0.5) * 2.5;
    const bz = z0 + reachDown;
    // Higher over the river, so the water runs on under them.
    const wet = Number.isFinite(waterAt(x, z0));
    const crest = wet ? 4.2 + r() * 3 : low ? 0.9 + r() * 1.4 : 2.4 + r() * 4.8;
    const R0 = low ? 0.45 + r() * 0.45 : 0.26 + r() * 0.5;
    const pts = [];
    const rad = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = ax + (bx - ax) * t + Math.sin(t * 7 + x) * 0.4;
      const pz = az + (bz - az) * t + Math.cos(t * 5 + x) * 0.3;
      // Up from the step, a crest past the line, a long fall to the floor (the step is the higher side).
      const g = floor(px, pz);
      const lift = Math.sin(Math.min(1, t * 1.25) * Math.PI) * crest;
      pts.push(V(px, g + lift - (t < 0.06 || t > 0.94 ? 0.5 : 0), pz));
      // Knuckles and swellings along it.
      rad.push(R0 * (1.05 - 0.45 * Math.abs(t - 0.4)) * (1 + 0.16 * Math.sin(t * 23 + x * 3)) + 0.06);
    }
    big.push(tubeAlong(pts, rad, 8, { vWorld: 2.4, uRep: 2 }));
    // A few thin aerial roots hanging off the crest.
    if (r() < 0.55) {
      const c = pts[Math.round(n * 0.4)];
      for (let k = 0; k < 2; k++) {
        const hx = c.x + (r() - 0.5) * 1.6;
        const hz = c.z + 0.6 + r() * 1.2;
        const g = floor(hx, hz);
        const L = Math.max(1.2, c.y - g - 0.2);
        const hp = [];
        const hr = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          hp.push(V(hx + Math.sin(t * 3 + k) * 0.15, c.y - L * t, hz + Math.cos(t * 4 + k) * 0.12));
          hr.push(0.05 + 0.03 * (1 - t));
        }
        thin.push(tubeAlong(hp, hr, 5, { vWorld: 1.2 }));
      }
    }
  }
  // Runners: long roots woven along the wall at knee to head height, binding the ribs.
  for (let k = 0; k < 14; k++) {
    const left = r() < 0.5;
    const from = left ? W.x0 : ROOTWALL.gate.x + ROOTWALL.gate.half + 2;
    const to = left ? ROOTWALL.gate.x - ROOTWALL.gate.half - 2 : W.x1;
    const pts = [];
    const rad = [];
    const y0 = k < 6 ? 0.25 + r() * 0.9 : 0.8 + r() * 3.6;
    const R = 0.14 + r() * (k < 6 ? 0.3 : 0.2);
    const ph = r() * 6;
    for (let x = from; x <= to; x += 2.2) {
      const z = rootLine(x) + Math.sin(x / 7 + ph) * 0.8;
      pts.push(V(x, floor(x, z) + y0 + Math.sin(x / 5 + ph) * 0.9, z));
      rad.push(R * (0.8 + 0.3 * Math.sin(x / 9 + ph)));
    }
    if (pts.length > 2) big.push(tubeAlong(pts, rad, 6, { vWorld: 2.4, uRep: 1 }));
  }

  // The Root Stair: two great roots braided up each side of the stair and twisted over it.
  const A = rootArch();
  const yA = Math.min(heightAt(A.feet[0].x, A.feet[0].z), heightAt(A.feet[1].x, A.feet[1].z));
  const top = 7.6;
  for (let strand = 0; strand < 4; strand++) {
    const pts = [];
    const rad = [];
    const n = 40;
    const ph = strand * 1.7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI;
      // Down at both feet, a pointed-round crown; strands twist round each other.
      const s = -Math.cos(a) * A.half * (1 + 0.18 * Math.sin(a) ** 6);
      const y = Math.sin(a) ** 0.75 * top;
      const tw = 0.55 * Math.sin(t * 10 + ph);
      const dz = 0.55 * Math.cos(t * 10 + ph);
      const p = V(A.x + A.span.x * s + A.through.x * dz, yA + y - (t < 0.06 || t > 0.94 ? 0.8 : 0), A.z + A.span.z * s + A.through.z * dz);
      p.addScaledVector(A.span, tw * Math.sin(a) * 0.4);
      p.y += tw * 0.3;
      pts.push(p);
      rad.push((strand < 2 ? 0.55 : 0.3) * (1.25 - 0.5 * Math.sin(a)));
    }
    big.push(tubeAlong(pts, rad, 9, { vWorld: 2.4, uRep: 2 }));
  }
  // Aerial roots hanging in a fringe from the arch's crown.
  for (let k = 0; k < 14; k++) {
    const s = (k / 13 - 0.5) * A.half * 1.6;
    const a = Math.acos(Math.max(-1, Math.min(1, -s / A.half)));
    const y = yA + Math.sin(a) ** 0.75 * top - 0.3;
    const side = k % 2 ? 1 : -1;
    const hx = A.x + A.span.x * s + A.through.x * side * 0.7;
    const hz = A.z + A.span.z * s + A.through.z * side * 0.7;
    const L = 1.4 + r() * (Math.abs(s) < 1.4 ? 1.4 : 3.2);
    const hp = [];
    const hr = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      hp.push(V(hx + Math.sin(t * 4 + k) * 0.1, y - L * t, hz));
      hr.push(0.035 + 0.025 * (1 - t));
    }
    thin.push(tubeAlong(hp, hr, 5, { vWorld: 1.2 }));
  }

  const bark = bank.bark(41, ['#1a1810', '#4a4838', '#7e7a62', '#3a5a22'], { mossy: 0.75, twist: 0.05 });
  const mat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.92, color: 0xd2c2a2, vertexColors: true });
  const thinMat = new THREE.MeshStandardMaterial({ map: bark.map, roughness: 0.95, color: 0xa89878, vertexColors: true });
  const meshOf = (geos, m, cast) => {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    // Moss on the tops and the damp undersides darker: a colour per vertex from its facing and a little noise.
    const P = merged.attributes.position;
    const N = merged.attributes.normal;
    const col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const up = N.getY(i);
      const n = 0.5 + 0.5 * Math.sin(P.getX(i) * 0.9 + Math.sin(P.getZ(i) * 0.7) * 2 + P.getY(i) * 0.6);
      const moss = Math.min(1, Math.max(0, (up - 0.2) / 0.6)) * (0.45 + 0.55 * n);
      const dark = Math.max(0, -up) * 0.35;
      col[i * 3] = (1 - moss * 0.55) * (1 - dark);
      col[i * 3 + 1] = (1 - moss * 0.12) * (1 - dark);
      col[i * 3 + 2] = (1 - moss * 0.7) * (1 - dark);
    }
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
    merged.deleteAttribute('aWind');
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    plainShadow(mesh);
    group.add(mesh);
    return mesh;
  };
  meshOf(big, mat, true);
  if (thin.length) meshOf(thin, thinMat, false);

  // The veil in the arch: the gorge's mist, turning.
  const veil = portalVeil({ w: A.half * 2 - 0.6, h: top - 0.6, a: '#e8f4ea', b: '#5a8a72', round: true, opacity: 0.55 });
  veil.mesh.position.set(A.x, yA + 0.1, A.z);
  veil.mesh.rotation.y = A.face;
  group.add(veil.mesh);

  // A bank of mist past the roots (the other zone isn't built), and puffs drifting round the stair.
  const side = world.zone?.id === 'hollow-heights' ? 1 : -1;
  const c2 = document.createElement('canvas');
  c2.width = 4;
  c2.height = 128;
  const g2 = c2.getContext('2d');
  const grad = g2.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(214,224,218,0)');
  grad.addColorStop(0.35, 'rgba(214,224,218,0.85)');
  grad.addColorStop(1, 'rgba(214,224,218,1)');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c2);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(260, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, color: 0xdfe8e2 }));
  mist.position.set(0, yA + 36, W.z + side * 22);
  mist.renderOrder = 2;
  group.add(mist);
  world.mistBank2 = mist;

  const puffs = new Cards(26, bank.puff(17), { blend: 'normal', lit: 0.6 });
  puffs.mesh.renderOrder = 6;
  const seeds = Array.from({ length: 26 }, (_, i) => ({ s: (r() - 0.5) * 2, d: (r() - 0.5) * 2, ph: r() * 6, sz: 2.5 + r() * 3.5, k: i }));
  group.add(puffs.mesh);

  scene.add(group);
  // Colliders: the roots from wall to wall (in short straight runs along the wave), and the arch's feet.
  const c = world.colliders;
  const step = 5;
  for (let x = W.x0 - 25; x < W.x1 + 25; x += step) {
    const xa = x;
    const xb = x + step;
    if (OPEN(xa) || OPEN(xb) || OPEN((xa + xb) / 2)) {
      // Trim the run to the opening's edge.
      const edgeL = ROOTWALL.gate.x - ROOTWALL.gate.half - 1.6;
      const edgeR = ROOTWALL.gate.x + ROOTWALL.gate.half + 1.6;
      const a = xa < edgeL ? xa : xb > edgeR ? edgeR : null;
      const b = xa < edgeL ? Math.min(xb, edgeL) : xb > edgeR ? xb : null;
      if (a == null || b - a < 0.2) continue;
      const za = rootLine(a);
      const zb = rootLine(b);
      c.box((a + b) / 2, (za + zb) / 2, Math.hypot(b - a, zb - za) / 2 + 0.2, 1.1, Math.atan2(zb - za, b - a) * -1, -100, 60);
      continue;
    }
    const za = rootLine(xa);
    const zb = rootLine(xb);
    c.box((xa + xb) / 2, (za + zb) / 2, Math.hypot(xb - xa, zb - za) / 2 + 0.2, 1.1, Math.atan2(zb - za, xb - xa) * -1, -100, 60);
  }
  for (const f of A.feet) c.circle(f.x, f.z, 1.3, -100, 20);
  // Between the feet and the wall's line, so nothing slips past beside the arch.
  for (const f of A.feet) {
    const zl = rootLine(f.x);
    c.box(f.x, (f.z + zl) / 2, 1.4, Math.abs(zl - f.z) / 2 + 1.2, 0, -100, 20);
  }

  world.updaters.push((dt, t, camera) => {
    veil.update(t);
    puffs.begin();
    for (const p of seeds) {
      const drift = (t * 0.05 + p.ph) % 1;
      const x = A.x + A.span.x * p.s * 9 + A.through.x * p.d * 7 + Math.sin(t * 0.1 + p.ph) * 1.5;
      const z = A.z + A.span.z * p.s * 9 + A.through.z * p.d * 7;
      const y = yA + 0.6 + drift * 6;
      const a = Math.sin(drift * Math.PI) * 0.22;
      puffs.push(x, y, z, p.sz * (0.7 + drift * 0.6), 0.86, 0.9, 0.88, a, p.ph + t * 0.03);
    }
    puffs.end();
    void camera;
  });
  world.disposers.push(() => {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        o.material.map?.dispose?.();
        o.material.dispose();
      }
    });
    puffs.dispose();
  });
  return { group, arch: A };
}
