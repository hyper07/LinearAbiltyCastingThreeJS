import * as THREE from 'three';

/**
 * The golden helmet, worn: a rounded gold cycling helmet fitted to a plush
 * rider's head (the way Snowpuff's goggles are fitted to each head —
 * src/snowpuff/render/goggles.js, only read: here from the head's own
 * ellipsoid in the sculpt recipe, so every species wears it snug, ears and
 * all poking out) — a smooth shell over the crown, longer to the back, with
 * vent slots, a dark foam liner under the rim, a short peak and a chin strap
 * — and the helmet flying off, spinning, when it saves you. Nothing else: no
 * glow round the rider (the HUD's badge says you have it).
 *
 *   const h = goldHelmet({ c: [0, 0.67, 0], r: [0.34, 0.29, 0.3] }, headRest, fur);
 *   headBone.add(h);
 *   drops.fling(h, scene, { vx, vz })      // when it takes a crash: a spinning gold helmet in the air
 *   drops.update(dt, ground)
 */

const G = {};
// (each helmet its own materials: a rival fading by the camera fades only its own)
let own = {};
const gold = () => (own.gold ??= new THREE.MeshPhysicalMaterial({ color: '#ffc531', metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.6, emissive: '#7a4a00', emissiveIntensity: 0.3 }));
const goldDark = () => (own.dark ??= new THREE.MeshPhysicalMaterial({ color: '#d99a10', metalness: 1, roughness: 0.34, clearcoat: 0.6, envMapIntensity: 1.3, emissive: '#5a3200', emissiveIntensity: 0.22 }));
const vent = () => (own.vent ??= new THREE.MeshStandardMaterial({ color: '#241c2a', roughness: 0.85 }));
const liner = () => (own.liner ??= new THREE.MeshStandardMaterial({ color: '#2c2833', roughness: 0.95, side: THREE.BackSide }));
const strap = () => (own.strap ??= new THREE.MeshStandardMaterial({ color: '#2f2a3a', roughness: 0.7 }));
const buckle = () => (own.buckle ??= new THREE.MeshStandardMaterial({ color: '#16141a', roughness: 0.4, metalness: 0.2 }));

/**
 * The shell's shape: a point on it for `a` round the head (0 the face, +π/2 the left) and `t` from
 * the crown (0) to the rim (1). It comes down further at the back than over the brow, and the back
 * is drawn out into a short tail, as a cycling helmet's is — not a bowl.
 */
export function helmetPoint(a, t, R) {
  const front = Math.max(0, Math.cos(a));
  const back = Math.max(0, -Math.cos(a));
  const deep = Math.PI * (0.34 + 0.05 * (1 - front) + 0.1 * back);
  const th = t * deep;
  const sn = Math.sin(th);
  const x = sn * Math.sin(a) * R.x * (1 - 0.06 * back);
  // drawn out behind into a short tail, a little forward over the brow
  const z = sn * Math.cos(a) * R.z * (1 + 0.34 * back * sn * sn + 0.06 * front);
  // a low ridge down the middle; the brow flatter; the tail lifted a touch
  const ridge = 0.012 * Math.sin(Math.min(Math.PI, th * 3)) * Math.max(0, 1 - Math.abs(Math.sin(a)) * 2.2);
  const y = Math.cos(th) * R.y * (1 - 0.05 * front * t) + ridge + 0.035 * back * t * t;
  return [x, y, z];
}

/** The shell (and the liner, the same surface inside) as a grid of points round and down. */
function shellGeometry(R, around = 48, down = 14, t0 = 0, t1 = 1, k = 1) {
  const pos = [];
  const idx = [];
  for (let j = 0; j <= down; j++) {
    for (let i = 0; i <= around; i++) pos.push(...helmetPoint((i / around) * Math.PI * 2, t0 + ((t1 - t0) * j) / down, R).map((v) => v * k));
  }
  for (let j = 0; j < down; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i;
      const b = a + around + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A gold helmet for a head: `head` the head's ellipsoid in the sculpt ({ c, r }, metres, the face to
 * +z), `rest` the head bone's rest position (the helmet is a child of the bone), `fur` how thick the
 * fur is (the shell sits over it).
 */
export function goldHelmet(head = { c: [0, 0.67, 0], r: [0.34, 0.29, 0.3] }, rest = { x: 0, y: 0.46, z: 0 }, fur = 0.045) {
  own = {};
  const g = new THREE.Group();
  g.name = 'gold-helmet';
  const [cx, cy, cz] = head.c;
  const [rx, ry, rz] = head.r;
  const pad = fur * 0.8 + 0.018;
  const R = { x: rx + pad, y: ry + pad * 0.9, z: rz + pad };
  g.position.set(cx - rest.x, cy - rest.y + ry * 0.04, cz - rest.z - 0.012);
  // (sat level, a shade forward over the brow)
  g.rotation.x = 0.06;
  const shellGeo = shellGeometry(R);
  const shell = new THREE.Mesh(shellGeo, gold());
  shell.castShadow = true;
  shell.name = 'shell';
  g.add(shell);
  // the foam liner inside, seen under the rim
  const inner = new THREE.Mesh(shellGeometry(R, 32, 8, 0, 1, 0.965), liner());
  g.add(inner);
  // the lower band of the shell in a darker gold, and a rolled edge under it
  const band = new THREE.Mesh(shellGeometry(R, 48, 3, 0.84, 1, 1.006), goldDark());
  band.name = 'band';
  g.add(band);
  const rimPts = [];
  for (let i = 0; i < 64; i++) rimPts.push(new THREE.Vector3(...helmetPoint((i / 64) * Math.PI * 2, 1, R)));
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 96, 0.008, 6, true), vent());
  rim.name = 'rim';
  g.add(rim);
  // vent slots front to back, flush in the shell: two long ones each side of the ridge, two lower
  // down each side, two short ones over the brow and two out the back of the tail
  const slot = (G.slot ??= new THREE.CapsuleGeometry(0.5, 1, 3, 10));
  const vents = [[0.3, 0.12, 0.66, 0.026], [-0.3, 0.12, 0.66, 0.026], [0.85, 0.3, 0.74, 0.022], [-0.85, 0.3, 0.74, 0.022], [0.12, 0.58, 0.8, 0.02], [-0.12, 0.58, 0.8, 0.02], [2.75, 0.5, 0.8, 0.02], [-2.75, 0.5, 0.8, 0.02]];
  for (const [a, t0, t1, w] of vents) {
    const p0 = new THREE.Vector3(...helmetPoint(a, t0, R));
    const p1 = new THREE.Vector3(...helmetPoint(a, t1, R));
    const mid = new THREE.Vector3(...helmetPoint(a, (t0 + t1) / 2, R));
    const v = new THREE.Mesh(slot, vent());
    // (a capsule 1 + 2 × 0.5 long: scaled to the slot, a vent's width across, flat to the shell)
    v.scale.set(w, p0.distanceTo(p1) / 2, 0.012);
    const along = p1.clone().sub(p0).normalize();
    const out = mid.clone().sub(new THREE.Vector3(0, -R.y * 0.2, 0)).normalize();
    const side = along.clone().cross(out).normalize();
    out.crossVectors(side, along);
    v.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, along, out));
    v.position.copy(mid);
    v.name = 'vent';
    g.add(v);
  }
  // a short peak over the eyes: a thin lip out from the brow, tipped down a little
  const lip = [];
  const lipIdx = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const a = -0.62 + (1.24 * i) / N;
    const [x, y, z] = helmetPoint(a, 0.97, R);
    const reach = 0.055 * Math.cos((a / 0.62) * Math.PI * 0.5) + 0.004;
    lip.push(x, y, z, x * (1 + reach * 0.6), y - reach * 0.35, z + reach);
  }
  for (let i = 0; i < N; i++) lipIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const lipGeo = new THREE.BufferGeometry();
  lipGeo.setAttribute('position', new THREE.Float32BufferAttribute(lip, 3));
  lipGeo.setIndex(lipIdx);
  lipGeo.computeVertexNormals();
  const peak = new THREE.Mesh(lipGeo, own.peak ??= goldDark().clone());
  peak.material.side = THREE.DoubleSide;
  peak.name = 'peak';
  g.add(peak);
  // the chin strap: from the rim in front of and behind each ear, down the cheeks to a buckle under the chin
  const on = (a, th, k = 1) => new THREE.Vector3(Math.sin(th) * Math.sin(a) * (rx + pad * k), Math.cos(th) * (ry + pad * k), Math.sin(th) * Math.cos(a) * (rz + pad * k));
  const chin = on(0, Math.PI * 0.86, 0.7);
  for (const s of [-1, 1]) {
    const frontLeg = [new THREE.Vector3(...helmetPoint(s * 1.25, 0.98, R)), on(s * 1.3, Math.PI * 0.6), on(s * 1.0, Math.PI * 0.76, 0.8), chin.clone().add(new THREE.Vector3(s * 0.02, 0, 0))];
    const backLeg = [new THREE.Vector3(...helmetPoint(s * 2.0, 0.98, R)), on(s * 1.75, Math.PI * 0.6), on(s * 1.3, Math.PI * 0.6)];
    for (const pts of [frontLeg, backLeg]) {
      const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.007, 5, false), strap());
      sp.name = 'strap';
      g.add(sp);
    }
  }
  const b = new THREE.Mesh((G.buckle ??= new THREE.BoxGeometry(0.05, 0.016, 0.03)), buckle());
  b.position.copy(chin);
  g.add(b);
  g.userData.fit = { rx: R.x, ry: R.y, rz: R.z };
  return g;
}

/** Helmets knocked off: flying up and away, spinning, bouncing once on the road, then gone. */
export class HelmetDrops {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
  }

  /**
   * Knock a worn helmet off: a copy of it leaves the head where it is (in the world), up and back
   * (`vx`, `vz`: the rider's way, m/s), spinning end over end.
   */
  fling(helmet, { vx = 0, vz = 0 } = {}) {
    helmet.updateWorldMatrix(true, false);
    const copy = helmet.clone();
    helmet.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
    this.scene.add(copy);
    const a = Math.random() * Math.PI * 2;
    this.live.push({ m: copy, t: 0, v: new THREE.Vector3(vx * 0.35 + Math.cos(a) * 1.2, 4.2 + Math.random(), vz * 0.35 + Math.sin(a) * 1.2), spin: new THREE.Vector3(9 + Math.random() * 4, 3 * (Math.random() - 0.5), 5 * (Math.random() - 0.5)), bounced: false });
    return copy;
  }

  update(dt, ground = () => 0) {
    for (const f of [...this.live]) {
      f.t += dt;
      const m = f.m;
      f.v.y -= 9.81 * dt;
      m.position.addScaledVector(f.v, dt);
      m.rotation.x += f.spin.x * dt;
      m.rotation.y += f.spin.y * dt;
      m.rotation.z += f.spin.z * dt;
      const gy = ground(m.position.x, m.position.z) + 0.12;
      if (m.position.y < gy && f.v.y < 0) {
        m.position.y = gy;
        if (!f.bounced) {
          f.bounced = true;
          f.v.y = -f.v.y * 0.4;
          f.v.x *= 0.5;
          f.v.z *= 0.5;
          f.spin.multiplyScalar(0.4);
        } else {
          f.v.set(0, 0, 0);
          f.spin.set(0, 0, 0);
        }
      }
      // gone after a couple of seconds: shrinks away
      const k = Math.max(0, Math.min(1, (2.2 - f.t) / 0.4));
      m.scale.setScalar(k * (m.userData.s0 ??= m.scale.x));
      if (f.t > 2.2) {
        m.removeFromParent();
        this.live.splice(this.live.indexOf(f), 1);
      }
    }
  }

  dispose() {
    for (const f of this.live) f.m.removeFromParent();
    this.live = [];
  }
}
