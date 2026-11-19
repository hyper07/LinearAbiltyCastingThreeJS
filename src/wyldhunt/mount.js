/**
 * Burrow, the hunter's Shagmane: Mesh2Motion's horse (CC0), rebuilt as an
 * original beast — a heavier neck and head, a coat of ochre and cream with
 * dark bands, a long shaggy mane down the neck, a ruff on the chest,
 * feathered fetlocks and a full plume of a tail, all as fur shells — and
 * tacked up: a quilted saddle cloth, a high-backed saddle with stirrups,
 * a breast collar, saddlebags, a bedroll, and reins to the bridle. It walks,
 * trots and gallops (its gaits blended at the speed that keeps its hooves
 * planted), rears when it arrives, leans into turns, and jumps.
 */
import * as THREE from 'three';
import { Beast, coatMaterial, furShells, weightOn } from './beasts.js';
import { tubeAlong } from './plants.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const SHAGMANE_COAT = { back: ['#4a2e18', '#a86a34', '#e0a868'], belly: ['#6a5640', '#d8c4a0', '#fff2d8'], stripe: '#3a200e', stripeK: 0.5 };

export class Mount {
  constructor(rig, { scene, furLayers = 12 }) {
    this.coat = null;
    this.beast = new Beast(rig, {
      height: 2.15,
      gaits: ['Walk', 'Trot', 'Run'],
      speeds: { Idle: 0, Walk: 2.2, Trot: 6.0, Run: 12.5 },
      coat: (src) => (this.coat = coatMaterial(src, { ...SHAGMANE_COAT, rim: 0.5 })),
      name: 'Burrow'
    });
    this.object = this.beast.object;
    const b = this.beast.bones;
    // A heavier, rangier beast than a horse: thick neck, big head, deeper chest.
    this.shape = [
      [b.spine_5, V(1.14, 1.05, 1.14)],
      [b.spine_6, V(1.08, 1.04, 1.08)],
      [b.ribcage_front, V(1.1, 1.08, 1.04)]
    ].filter(([bone]) => bone);
    this.mesh = this.beast.meshes[0];
    // Fur: long on the mane, tail and fetlocks, a ruff on the chest, short elsewhere.
    const geo = this.mesh.geometry;
    const nor = geo.attributes.normal;
    const s = 1 / this.beast.scaleK;
    const lenOf = (i) => {
      const up = nor.getY(i);
      const mane = weightOn(this.mesh, i, /^(spine_5|spine_6|head)$/) * Math.max(0, up - 0.1) * 1.6;
      const tail = weightOn(this.mesh, i, /^tail/) * 1.3;
      const ruff = weightOn(this.mesh, i, /^(ribcage_front|spine_4|front_scapula)/) * Math.max(0, -nor.getZ(i) * 0.5 + 0.3) * 0.8;
      const feet = weightOn(this.mesh, i, /(ankle|foot)/) * 0.6;
      const body = 0.18;
      return (0.035 * body + 0.09 * mane + 0.12 * tail + 0.06 * ruff + 0.05 * feet) * s * 2.1;
    };
    this.fur = furShells(this.mesh, { layers: furLayers, lenOf, coat: this.coat, density: 1100, tip: '#f0d8a8', clump: 0.6 });
    if (this.fur) this.mesh.parent.add(this.fur);
    this.tack = this._tack();
    this.lean = 0;
    this.pitch = 0;
    this.yawRate = 0;
    this.prevYaw = 0;
    this.bob = 0;
    void scene;
  }

  /** The saddle and harness, attached to the bones so they move with the beast. */
  _tack() {
    const m = this.beast.model;
    m.updateMatrixWorld(true);
    const b = this.beast.bones;
    const s = this.beast.scaleK;
    const wp = (bone) => bone.getWorldPosition(V()).sub(this.object.position);
    // Where the back is highest over the ribs: the saddle's seat.
    const ribs = wp(b.spine_3 ?? b.spine_2);
    const pos = this.mesh.geometry.attributes.position;
    let top = -Infinity;
    const tmp = V();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).multiplyScalar(s);
      if (Math.abs(tmp.x) < 0.12 && Math.abs(tmp.z - ribs.z) < 0.18) top = Math.max(top, tmp.y);
    }
    if (!Number.isFinite(top)) top = ribs.y + 0.35;
    this.saddleBone = b.spine_3 ?? b.spine_2;
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.55, metalness: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a160c, roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, roughness: 0.3, metalness: 0.9 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x8a2a22, roughness: 0.9, side: THREE.DoubleSide });
    const trim = new THREE.MeshStandardMaterial({ color: 0xd8b060, roughness: 0.7 });
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mm = new THREE.Mesh(geo, mat);
      mm.position.set(x, y, z);
      mm.rotation.set(rx, ry, rz);
      mm.castShadow = true;
      mm.receiveShadow = true;
      group.add(mm);
      return mm;
    };
    const y = top;
    const z = ribs.z;
    // Saddle cloth: a quilted blanket draped over the back, its edges trimmed.
    const blanket = new THREE.CylinderGeometry(0.36, 0.36, 0.85, 20, 1, true, -1.15, 2.3);
    blanket.rotateX(Math.PI / 2);
    blanket.rotateZ(Math.PI / 2);
    add(blanket, cloth, 0, y - 0.3, z);
    const hem = new THREE.TorusGeometry(0.37, 0.02, 6, 24, 2.3);
    for (const dz of [-0.42, 0.42]) {
      const t = add(hem, trim, 0, y - 0.3, z + dz, 0, 0, -0.57 + Math.PI / 2);
      t.rotation.set(0, 0, Math.PI / 2 - 1.15);
      t.rotation.y = 0;
    }
    // The saddle: a deep seat, a high cantle behind, a pommel horn in front.
    const seat = new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);
    seat.scale(0.85, 0.5, 1.15);
    add(seat, leather, 0, y + 0.16, z);
    const cantle = new THREE.TorusGeometry(0.17, 0.05, 8, 16, Math.PI);
    add(cantle, leather, 0, y + 0.08, z - 0.3, 0, 0, 0);
    const pommel = new THREE.CylinderGeometry(0.035, 0.05, 0.16, 10);
    add(pommel, dark, 0, y + 0.2, z + 0.32, 0.35);
    add(new THREE.SphereGeometry(0.05, 10, 8), brass, 0, y + 0.29, z + 0.35);
    // Girth and stirrups.
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(0.025, 0.42, 0.05), dark, sx * 0.33, y - 0.25, z + 0.05);
      const st = new THREE.TorusGeometry(0.06, 0.012, 6, 12);
      add(st, brass, sx * 0.36, y - 0.5, z + 0.05, 0, Math.PI / 2, 0);
      // Saddlebags and a rolled blanket behind the seat.
      add(new THREE.BoxGeometry(0.12, 0.26, 0.32), leather, sx * 0.34, y - 0.12, z - 0.45, 0, 0, sx * 0.1);
      add(new THREE.BoxGeometry(0.13, 0.08, 0.33), dark, sx * 0.35, y + 0.02, z - 0.45, 0, 0, sx * 0.1);
    }
    const roll = new THREE.CylinderGeometry(0.09, 0.09, 0.62, 12);
    roll.rotateZ(Math.PI / 2);
    add(roll, new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.95 }), 0, y + 0.1, z - 0.52);
    this.saddleBone.attach(group);
    // Where the rider's hips sit.
    this.seat = new THREE.Object3D();
    this.seat.position.set(0, y + 0.12, z - 0.02);
    this.saddleBone.attach(this.seat);
    // Reins: a strap from the bit back to the pommel, re-laid each frame.
    this.reinMat = dark;
    this.pommel = new THREE.Object3D();
    this.pommel.position.set(0, y + 0.22, z + 0.3);
    this.saddleBone.attach(this.pommel);
    return group;
  }

  _reins() {
    const head = this.beast.bones.head;
    if (!head) return;
    // From the muzzle (ahead of and below the head bone) back to the pommel.
    const q = head.getWorldQuaternion(new THREE.Quaternion());
    const a = head.getWorldPosition(V()).add(V(0, -0.12, 0.42).applyQuaternion(q));
    const c = this.pommel.getWorldPosition(V());
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const p = a.clone().lerp(c, t);
      p.y -= Math.sin(t * Math.PI) * 0.18;
      pts.push(this.object.worldToLocal(p));
    }
    const geo = tubeAlong(pts, pts.map(() => 0.012), 4);
    if (this.reins) {
      this.reins.geometry.dispose();
      this.reins.geometry = geo;
    } else {
      this.reins = new THREE.Mesh(geo, this.reinMat);
      this.reins.castShadow = false;
      this.object.add(this.reins);
    }
  }

  /** Place and pose from the brain: position, heading, speed; lean into turns, pitch on slopes. */
  sync(dt, brain, ground, { airborne = false } = {}) {
    const o = this.object;
    o.position.set(brain.x, brain.y, brain.z);
    const turn = (brain.yaw - this.prevYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    this.prevYaw = brain.yaw;
    this.yawRate += (turn / Math.max(dt, 1e-4) - this.yawRate) * Math.min(1, dt * 6);
    o.rotation.y = brain.yaw;
    const ahead = ground(brain.x + Math.sin(brain.yaw) * 1.3, brain.z + Math.cos(brain.yaw) * 1.3);
    const behind = ground(brain.x - Math.sin(brain.yaw) * 1.3, brain.z - Math.cos(brain.yaw) * 1.3);
    const wantPitch = airborne ? -0.15 : THREE.MathUtils.clamp(-Math.atan2(ahead - behind, 2.6), -0.35, 0.35);
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 6);
    const wantLean = THREE.MathUtils.clamp(-this.yawRate * brain.speed * 0.03, -0.3, 0.3);
    this.lean += (wantLean - this.lean) * Math.min(1, dt * 4);
    this.beast.model.rotation.set(this.pitch, 0, this.lean);
    this.beast.move(Math.max(0, brain.speed));
    // Re-shape after the clips have posed the bones (reset first: a clip may not key scale).
    for (const [bone] of this.shape) bone.scale.set(1, 1, 1);
    this.beast.update(dt);
    for (const [bone, sc] of this.shape) bone.scale.multiply(sc);
    if (this.fur) {
      const u = this.fur.userData.fur;
      u.uMotion.value.set(0, -Math.min(0.25, brain.speed * 0.02), -Math.min(0.6, brain.speed * 0.04));
    }
    this._reins();
  }

  dispose() {
    this.beast.dispose();
    this.fur?.geometry.dispose();
    this.reins?.geometry.dispose();
  }
}
