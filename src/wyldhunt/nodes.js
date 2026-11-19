/**
 * Gathering spots, each made here: sunleaf (broad leaves round glowing seed
 * pods), ore seams (a rock split with pale crystal), bug logs (a mossy log
 * with bracket fungus and beetles that glow and crawl), bone piles (ribs and
 * a great skull). A spot glimmers when you are near; spent, it dims until it
 * grows back. And the Gnarlhorn's tracks — three-toed prints pressed in the
 * mud — with the scout flies: green motes that drift from the hunter toward
 * the nearest sign, or to the beast itself once it is tracked.
 */
import * as THREE from 'three';
import { Cards } from '../gloamreach/fx.js';
import { rng } from '../gloamreach/noise.js';
import { NODES } from './map.js';
import { heightAt } from './heights.js';
import { frond, tubeAlong } from './plants.js';
import { cragGeometry } from './flora.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function herb(r, mats) {
  const g = new THREE.Group();
  for (let k = 0; k < 7; k++) {
    const f = frond({ len: 0.7 + r() * 0.3, width: 0.32, segs: 5, lift: 0.9, droop: 0.9, fold: 0.3, flex: 0.2 });
    const m = new THREE.Mesh(f, mats.leaf);
    m.rotation.y = (k / 7) * Math.PI * 2 + r() * 0.3;
    m.rotation.x = -0.3;
    g.add(m);
  }
  for (let k = 0; k < 5; k++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.03, 8, 6), mats.glow);
    p.position.set((r() - 0.5) * 0.3, 0.25 + r() * 0.25, (r() - 0.5) * 0.3);
    g.add(p);
  }
  return g;
}

function ore(r, mats) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(cragGeometry(Math.floor(r() * 1000)), mats.rock);
  rock.scale.set(1.1, 0.8, 1.0);
  g.add(rock);
  for (let k = 0; k < 6; k++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.08 + r() * 0.06, 0.45 + r() * 0.35, 5), mats.crystal);
    c.position.set((r() - 0.5) * 0.9, 0.7 + r() * 0.5, (r() - 0.5) * 0.7);
    c.rotation.set((r() - 0.5) * 1.2, r() * 6, (r() - 0.5) * 1.2);
    g.add(c);
  }
  return g;
}

function bugLog(r, mats) {
  const g = new THREE.Group();
  const pts = [V(-1.4, 0.2, 0), V(-0.4, 0.3, 0.1), V(0.6, 0.28, -0.05), V(1.5, 0.22, 0.05)];
  g.add(new THREE.Mesh(tubeAlong(pts, [0.3, 0.32, 0.29, 0.25], 10, { vWorld: 1 }), mats.bark));
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.04, 10, 1, false, 0, Math.PI), mats.fungus);
    s.position.set(-1 + k * 0.6, 0.35 + r() * 0.15, 0.27);
    s.rotation.y = -Math.PI / 2;
    g.add(s);
  }
  g.userData.bugs = [];
  for (let k = 0; k < 6; k++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mats.bug);
    g.add(b);
    g.userData.bugs.push({ m: b, a: r() * 6.28, s: 0.4 + r() * 0.6 });
  }
  return g;
}

function bones(r, mats) {
  const g = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.75 - k * 0.04, 0.05, 6, 16, Math.PI * 0.9), mats.bone);
    t.position.set(-0.8 + k * 0.32, 0.05, 0);
    t.rotation.set(0, Math.PI / 2, Math.PI * 0.05 + (r() - 0.5) * 0.2);
    g.add(t);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), mats.bone);
  spine.rotation.z = Math.PI / 2;
  g.add(spine);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mats.bone);
  skull.scale.set(1.5, 0.8, 0.9);
  skull.position.set(1.5, 0.25, 0.4);
  g.add(skull);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 8), mats.bone);
  horn.position.set(1.4, 0.6, 0.4);
  horn.rotation.z = 0.6;
  g.add(horn);
  return g;
}

export class Nodes {
  /** `keep(x, z)`: the zone's spots only. */
  constructor(scene, bank, keep = () => true) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const r = rng(616);
    const glowTex = bank.glow(64, 1.8);
    const mats = {
      leaf: new THREE.MeshStandardMaterial({ color: 0x9ad84a, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x2a4a0a, emissiveIntensity: 0.4 }),
      glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 0.8), toneMapped: false }),
      rock: new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 0.8, flatShading: true }),
      crystal: new THREE.MeshStandardMaterial({ color: 0xa8d8ff, roughness: 0.15, metalness: 0.1, emissive: 0x4a8acc, emissiveIntensity: 0.9 }),
      bark: new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 }),
      fungus: new THREE.MeshStandardMaterial({ color: 0xd8a860, roughness: 0.6, side: THREE.DoubleSide }),
      bug: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.4, 0.9), toneMapped: false }),
      bone: new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.6 })
    };
    this.mats = mats;
    this.list = NODES.filter((n) => keep(n.x, n.z)).map((n) => {
      const obj = { herb, ore, bug: bugLog, bone: bones }[n.kind](r, mats);
      obj.position.set(n.x, heightAt(n.x, n.z) - 0.05, n.z);
      obj.rotation.y = r() * 6.28;
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.group.add(obj);
      return { ...n, obj, left: undefined, regrowIn: 0 };
    });
    this.sparkle = new Cards(200, glowTex, { blend: 'add' });
    this.group.add(this.sparkle.mesh);
  }

  nearest(x, z, r = 2.6) {
    let best = null;
    let bd = r;
    for (const n of this.list) {
      if ((n.left ?? 1) <= 0) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < bd) [best, bd] = [n, d];
    }
    return best;
  }

  /** Spent spots shrink a little and stop glimmering. */
  setSpent(n, spent) {
    n.obj.scale.setScalar(spent ? 0.6 : 1);
  }

  update(dt, t, focus) {
    this.sparkle.begin();
    for (const n of this.list) {
      const d = Math.hypot(n.x - focus.x, n.z - focus.z);
      if (n.obj.userData.bugs) for (const b of n.obj.userData.bugs) {
        b.a += dt * b.s;
        b.m.position.set(Math.sin(b.a) * 1.2, 0.48 + Math.sin(b.a * 3) * 0.06, Math.cos(b.a * 1.3) * 0.25);
      }
      if (d > 40 || (n.left ?? 1) <= 0) continue;
      // A glimmer over the spot, brighter as you come near.
      const k = Math.max(0, 1 - d / 40);
      for (let i = 0; i < 3; i++) {
        const a = t * 0.8 + i * 2.1 + n.x;
        const col = { herb: [1.4, 2.2, 0.6], ore: [0.8, 1.6, 2.6], bug: [2.4, 2.2, 0.8], bone: [2, 1.9, 1.6] }[n.kind];
        this.sparkle.push(n.x + Math.cos(a) * 0.6, n.obj.position.y + 0.8 + Math.sin(a * 1.7) * 0.3, n.z + Math.sin(a) * 0.6, 0.18 + 0.05 * Math.sin(t * 5 + i), col[0], col[1], col[2], 0.5 * k);
      }
    }
    this.sparkle.end();
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
    this.sparkle.dispose();
  }
}

/* ------------------------------------------------------------------ tracks and the scout flies */

function printTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,1)';
  // A three-toed print: a heel pad and three long toes with claws.
  g.beginPath();
  g.ellipse(64, 86, 20, 24, 0, 0, Math.PI * 2);
  g.fill();
  for (const [a, l] of [[-0.45, 44], [0, 52], [0.45, 44]]) {
    g.save();
    g.translate(64, 76);
    g.rotate(a);
    g.beginPath();
    g.ellipse(0, -l * 0.6, 9, l * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-5, -l * 1.1);
    g.lineTo(0, -l * 1.35);
    g.lineTo(5, -l * 1.1);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Tracks {
  constructor(scene, bank) {
    this.max = 60;
    const geo = new THREE.PlaneGeometry(1.4, 1.4);
    geo.rotateX(-Math.PI / 2);
    this.glowU = { value: 0 };
    const mat = new THREE.MeshStandardMaterial({ map: printTexture(), color: 0x1a1208, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: 0.3, emissive: new THREE.Color(0.2, 1.4, 0.2), emissiveIntensity: 0 });
    mat.alphaMap = mat.map;
    this.mat = mat;
    this.mesh = new THREE.InstancedMesh(geo, mat, this.max * 2);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.flies = new Cards(120, bank.glow(64, 1.6), { blend: 'add' });
    this.flies.mesh.frustumCulled = false;
    scene.add(this.flies.mesh);
    this.flyT = 0;
  }

  /** Lay the tracker's marks as prints (two per mark, left and right). */
  sync(marks, height) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (const mk of marks) {
      if (mk.found) continue;
      for (const side of [-1, 1]) {
        const x = mk.x + Math.cos(mk.yaw) * side * 0.8 + Math.sin(mk.yaw) * side * 0.6;
        const z = mk.z - Math.sin(mk.yaw) * side * 0.8 + Math.cos(mk.yaw) * side * 0.6;
        q.setFromAxisAngle(V(0, 1, 0), mk.yaw + Math.PI);
        m.compose(V(x, height(x, z) + 0.04, z), q, V(1, 1, 1.15));
        this.mesh.setMatrixAt(i++, m);
        if (i >= this.max * 2) break;
      }
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** The scout flies: motes streaming from `from` toward `to` (or circling the hunter when there's nothing to follow). */
  update(dt, t, from, to, nearSign) {
    this.mat.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 4) + (nearSign ? 0.8 : 0);
    const f = this.flies;
    f.begin();
    const n = 40;
    for (let i = 0; i < n; i++) {
      const s = (i / n + t * 0.12) % 1;
      let p;
      if (to) {
        const d = Math.hypot(to.x - from.x, to.z - from.z);
        const reach = Math.min(d, 18);
        const dir = V(to.x - from.x, 0, to.z - from.z).normalize();
        const side = V(-dir.z, 0, dir.x);
        const along = s * reach;
        p = V(from.x, from.y + 1.4, from.z).addScaledVector(dir, along + 1).addScaledVector(side, Math.sin(t * 2 + i * 1.7) * 0.6 * (0.3 + s)).add(V(0, Math.sin(t * 3 + i) * 0.4 + s * 0.4, 0));
      } else {
        const a = t * 0.8 + i * 0.6;
        p = V(from.x + Math.cos(a) * 1.4, from.y + 1.6 + Math.sin(a * 2) * 0.3, from.z + Math.sin(a) * 1.4);
      }
      const tw = 0.6 + 0.4 * Math.sin(t * 9 + i * 3.1);
      f.push(p.x, p.y, p.z, 0.09 + 0.04 * tw, 0.6 * tw, 2.4 * tw, 0.7 * tw, to ? 0.9 * (1 - s * 0.6) : 0.4);
    }
    f.end();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.flies.dispose();
  }
}
