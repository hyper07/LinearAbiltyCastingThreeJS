import * as THREE from 'three';

/**
 * The golden helmet, worn: a shiny gold cycling helmet fitted to a plush
 * rider's head (the way Snowpuff's goggles are fitted to each head —
 * src/snowpuff/render/goggles.js, only read: here from the head's own
 * ellipsoid in the sculpt recipe, so every species wears it snug, ears and
 * all poking out), a soft golden shimmer round rider and scooter while it is
 * on, and the helmet flying off, spinning, when it saves you.
 *
 *   const h = goldHelmet({ c: [0, 0.67, 0], r: [0.34, 0.29, 0.3] }, headRest, fur);
 *   headBone.add(h);                       // and shield() on the rider's root
 *   drops.fling(h, scene, { vx, vz })      // when it takes a crash: a spinning gold helmet in the air
 *   drops.update(dt, ground)
 */

const mats = {};
// (each helmet its own gold and vents: a rival fading by the camera fades only its own)
let own = {};
const gold = () => (own.gold ??= new THREE.MeshPhysicalMaterial({ color: '#ffc531', metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.6, emissive: '#7a4a00', emissiveIntensity: 0.32 }));
const goldDark = () => (own.dark ??= new THREE.MeshPhysicalMaterial({ color: '#d99a10', metalness: 1, roughness: 0.32, clearcoat: 0.6, envMapIntensity: 1.3, emissive: '#5a3200', emissiveIntensity: 0.25 }));
const vent = () => (own.vent ??= new THREE.MeshStandardMaterial({ color: '#2a2030', roughness: 0.8 }));
const strap = () => (own.strap ??= new THREE.MeshStandardMaterial({ color: '#3a2a4a', roughness: 0.7 }));
const star = () => (own.star ??= new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4c0', emissiveIntensity: 0.6, roughness: 0.3 }));

const G = {};

/**
 * A gold helmet for a head: `head` the head's ellipsoid in the sculpt ({ c, r }, metres, the face to
 * +z), `rest` the head bone's rest position (the helmet is a child of the bone), `fur` how thick the
 * fur is (the shell sits over it). The shell is the top of the head's own ellipsoid grown a little,
 * tipped back; three raised ribs front to back, dark vents between them, a short peak over the eyes,
 * a chin strap down each side and a white star on the front.
 */
export function goldHelmet(head = { c: [0, 0.67, 0], r: [0.34, 0.29, 0.3] }, rest = { x: 0, y: 0.46, z: 0 }, fur = 0.045) {
  own = {};
  const g = new THREE.Group();
  g.name = 'gold-helmet';
  const [cx, cy, cz] = head.c;
  const [rx, ry, rz] = head.r;
  const pad = fur * 0.9 + 0.022;
  g.position.set(cx - rest.x, cy - rest.y + ry * 0.1, cz - rest.z - 0.01);
  g.rotation.x = -0.22;
  const shellGeo = (G.shell ??= new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, 0, Math.PI * 0.52));
  const shell = new THREE.Mesh(shellGeo, gold());
  shell.scale.set(rx + pad, ry * 0.95 + pad, rz + pad);
  shell.castShadow = true;
  g.add(shell);
  // the rim: a rolled gold edge
  const rim = new THREE.Mesh((G.rim ??= new THREE.TorusGeometry(1, 0.035, 8, 48)), goldDark());
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -(ry * 0.95 + pad) * Math.cos(Math.PI * 0.52) * -1;
  rim.scale.set(rx + pad, rz + pad, 1);
  g.add(rim);
  // ribs front to back, and the vents between them
  for (const s of [-0.42, 0, 0.42]) {
    const rib = new THREE.Mesh(shellGeo, goldDark());
    rib.scale.set((rx + pad) * 0.16, ry * 0.95 + pad + 0.016, rz + pad + 0.012);
    rib.position.x = s * (rx + pad) * 0.62;
    rib.rotation.z = -s * 0.55;
    g.add(rib);
  }
  for (const [x, z, a] of [[-0.22, 0.25, 0.3], [0.22, 0.25, -0.3], [-0.24, -0.15, -0.2], [0.24, -0.15, 0.2], [0, -0.42, 0]]) {
    const v = new THREE.Mesh((G.vent ??= new THREE.CapsuleGeometry(0.018, 0.07, 3, 8).rotateX(Math.PI / 2)), vent());
    const px = x * (rx + pad);
    const pz = z * (rz + pad);
    const py = (ry * 0.95 + pad) * Math.sqrt(Math.max(0, 1 - (px / (rx + pad)) ** 2 - (pz / (rz + pad)) ** 2)) + 0.004;
    v.position.set(px, py, pz);
    v.rotation.set(-Math.atan2(pz, py) * 0.9, a, Math.atan2(px, py) * 0.9);
    g.add(v);
  }
  // a short peak over the eyes
  const peak = new THREE.Mesh((G.peak ??= new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2)), goldDark());
  peak.scale.set((rx + pad) * 0.7, 0.03, 0.14);
  peak.position.set(0, 0.012, rz + pad - 0.02);
  peak.rotation.x = 0.12;
  g.add(peak);
  // a white star on the front
  const st = new THREE.Mesh((G.star ??= starShape()), star());
  st.scale.setScalar(0.06);
  st.position.set(0, (ry * 0.95 + pad) * 0.48, (rz + pad) * 0.88 + 0.004);
  st.rotation.x = -0.55;
  g.add(st);
  // the chin straps
  for (const s of [-1, 1]) {
    const sp = new THREE.Mesh((G.strap ??= new THREE.CapsuleGeometry(0.012, 0.16, 3, 6)), strap());
    sp.position.set(s * (rx + pad) * 0.86, -0.08, 0.06);
    sp.rotation.set(0.3, 0, s * 0.18);
    g.add(sp);
  }
  g.userData.fit = { rx: rx + pad, ry: ry * 0.95 + pad, rz: rz + pad };
  return g;
}

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.42 : 1;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: false });
}

/**
 * The shimmer round a rider in a golden helmet: an egg of light round rider and scooter, clear in
 * the middle and gold at its rim (fresnel), with bands of light running up it and a slow pulse;
 * added light, never hiding the rider. `set(k)` fades it (0 … 1); `update(t)` moves the bands.
 */
export function shield() {
  const mat = (mats.shield ??= new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 }, uCol: { value: new THREE.Color('#ffd23a') } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vY = position.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `uniform float uT; uniform float uK; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        float band = smoothstep(0.75, 1.0, sin(vY * 14.0 - uT * 5.0) * 0.5 + 0.5);
        float pulse = 0.75 + 0.25 * sin(uT * 4.0);
        float a = (pow(f, 1.6) * 0.38 + band * f * 0.42) * pulse * uK;
        gl_FragColor = vec4(uCol * (1.2 + band), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide
  }));
  const m = new THREE.Mesh((G.egg ??= new THREE.SphereGeometry(1, 32, 20)), mat.clone());
  m.scale.set(0.72, 1.02, 0.98);
  m.position.y = 0.92;
  m.renderOrder = 6;
  m.frustumCulled = false;
  m.userData.set = (k) => {
    m.material.uniforms.uK.value = k;
    m.visible = k > 0.01;
  };
  m.userData.update = (t) => (m.material.uniforms.uT.value = t);
  return m;
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
