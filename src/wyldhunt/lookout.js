/**
 * Kestrel Lookout, the hub of the Hollow Heights (zones.js): a hunters'
 * watch-platform at the head of the Stair of Roots — four bamboo legs lashed
 * with rope and braced, a slatted deck with a rail, a ladder, a canvas roof
 * with the guild's pennant, a lantern under it — from which the meadow and
 * the falls can be watched. Dressed like every Wyldhunt hub (props.js,
 * the 'bamboo' style). The zone's `lookout` gives its place.
 */
import * as THREE from 'three';
import { styledGroup } from '../shared/zones/props.js';
import { groundAt } from './heights.js';

export function buildLookout(world) {
  const L = world.zone?.lookout;
  if (!L) return null;
  const hub = world.zone.hub;
  const face = Math.atan2(hub.x - L.x, hub.z - L.z);
  const deck = 4.1;
  const top = 6.7;
  const legs = [];
  const kit = styledGroup('bamboo', ({ pole, lashing, slab, cloth, glow, add, mats, M4 }) => {
    const c = Math.cos(face);
    const s = Math.sin(face);
    // Local (x across, z toward the hub) → world, on the ground there.
    const W = (lx, lz) => ({ x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c });
    const base = (lx, lz, y = null, rx = 0, ry = 0, rz = 0) => {
      const p = W(lx, lz);
      return M4(p.x, y ?? groundAt(p.x, p.z), p.z, rx, face + ry, rz);
    };
    const y0 = groundAt(L.x, L.z);
    // The legs: splayed a little, each from its own ground to the roof.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = W(sx * 1.65, sz * 1.65);
        const g = groundAt(p.x, p.z);
        const len = y0 + top - g;
        const lean = Math.atan2(0.3, len);
        pole(len, 0.11, M4(p.x, g - 0.2, p.z, -sz * lean, face, sx * lean));
        legs.push(p);
        for (const y of [deck - 0.15, deck + 1.0]) lashing(0.11, y - (g - y0) + 0.2, M4(p.x, g - 0.2, p.z, -sz * lean, face, sx * lean));
      }
    }
    // Braces: an X on each side but the ladder's.
    const brace = (ax, az, bx, bz, ya, yb) => {
      const pa = W(ax, az);
      const pb = W(bx, bz);
      const A = new THREE.Vector3(pa.x, y0 + ya, pa.z);
      const B = new THREE.Vector3(pb.x, y0 + yb, pb.z);
      const len = A.distanceTo(B);
      const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 7);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      add(mats.wood, geo, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    };
    for (const [ax, az, bx, bz] of [[-1.55, -1.55, 1.55, -1.55], [1.55, -1.55, 1.55, 1.55], [-1.55, -1.55, -1.55, 1.55]]) {
      brace(ax, az, bx, bz, 0.4, deck - 0.3);
      brace(bx, bz, ax, az, 0.4, deck - 0.3);
    }
    // The deck: bearers and slats.
    for (const sz of [-1, 1]) slab(3.7, 0.16, 0.16, base(0, sz * 1.55, y0 + deck - 0.22), mats.dark);
    for (let i = 0; i < 15; i++) slab(3.6, 0.07, 0.21, base(0, -1.65 + i * 0.235, y0 + deck - 0.06, 0, 0, (i % 3 - 1) * 0.01));
    // The rail round the deck, open on the ladder's side.
    for (const [ax, az, bx, bz] of [[-1.6, -1.6, 1.6, -1.6], [1.6, -1.6, 1.6, 1.6], [-1.6, -1.6, -1.6, 1.6], [-1.6, 1.6, -0.5, 1.6], [0.5, 1.6, 1.6, 1.6]]) {
      for (const h of [0.55, 1.0]) brace(ax, az, bx, bz, deck + h, deck + h);
    }
    // The ladder, leaning on the deck's hub side.
    const lad = (lx) => {
      const pa = W(lx, 3.1);
      const pb = W(lx, 1.62);
      const A = new THREE.Vector3(pa.x, groundAt(pa.x, pa.z), pa.z);
      const B = new THREE.Vector3(pb.x, y0 + deck + 0.9, pb.z);
      return { A, B };
    };
    const [l0, l1] = [lad(-0.32), lad(0.32)];
    for (const { A, B } of [l0, l1]) {
      const len = A.distanceTo(B);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      add(mats.wood, new THREE.CylinderGeometry(0.045, 0.05, len, 7), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    }
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const a = l0.A.clone().lerp(l0.B, t);
      const b = l1.A.clone().lerp(l1.B, t);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      add(mats.dark, new THREE.CylinderGeometry(0.03, 0.03, a.distanceTo(b), 5), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    }
    // The roof: a canvas pyramid on the legs' tops, its pennant above.
    cloth(new THREE.ConeGeometry(2.75, 1.25, 4, 1, true).rotateY(Math.PI / 4), base(0, 0, y0 + top + 0.55));
    const mast = base(0, 0, y0 + top + 1.0);
    pole(1.7, 0.035, mast);
    const flag = new THREE.Shape();
    flag.moveTo(0, 0);
    flag.lineTo(1.2, -0.22);
    flag.lineTo(0, -0.46);
    cloth(new THREE.ShapeGeometry(flag), base(0.04, 0, y0 + top + 2.65, 0, Math.PI / 2 + 0.4));
    // A lantern hung under the roof, crates and a rolled hide on the deck.
    add(mats.metal, new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), base(0.9, 0.9, y0 + top - 0.35));
    glow(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 6), base(0.9, 0.9, y0 + top - 0.75));
    add(mats.metal, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 6), base(0.9, 0.9, y0 + top - 0.6));
    slab(0.6, 0.5, 0.5, base(1.0, -1.0, y0 + deck, 0, 0.3));
    slab(0.45, 0.4, 0.45, base(0.95, -0.35, y0 + deck, 0, -0.2));
    add(mats.rope, new THREE.CapsuleGeometry(0.17, 0.9, 4, 8).rotateZ(Math.PI / 2), base(-0.8, -1.1, y0 + deck + 0.17));
    // A cooking pot and stools at the foot, a spear stood against a leg.
    add(mats.metal, new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65).translate(0, 0.3, 0), base(-2.4, -1.2));
    for (const [lx, lz] of [[-2.9, 0.2], [-3.2, -2.0]]) {
      const p = W(lx, lz);
      add(mats.wood, new THREE.CylinderGeometry(0.22, 0.24, 0.42, 9).translate(0, 0.21, 0), M4(p.x, groundAt(p.x, p.z), p.z));
    }
  });
  world.scene.add(kit.group);
  // A warm light from the lantern, for the deck and the hub below.
  const lp = { x: L.x + Math.sin(face) * 0.9 + Math.cos(face) * 0.9, z: L.z + Math.cos(face) * 0.9 - Math.sin(face) * 0.9 };
  const light = new THREE.PointLight(0xffb05a, 14, 22, 1.6);
  light.position.set(lp.x, groundAt(L.x, L.z) + top - 0.8, lp.z);
  world.scene.add(light);
  world.spots.lookout = { x: L.x, z: L.z, light };
  const c = world.colliders;
  for (const p of legs) c.circle(p.x, p.z, 0.3, -100, 60);
  c.circle(L.x + Math.sin(face) * 2.6, L.z + Math.cos(face) * 2.6, 0.5, -100, 3);
  world.disposers.push(() => {
    kit.dispose();
    light.dispose?.();
  });
  return kit;
}
