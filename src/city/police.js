import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * The "Call the police · 경찰 호출" item: a patrol officer on a police scooter of our own design
 * (white with a blue stripe, "POLICE 경찰" on its side, a red-and-blue light bar — no real force's
 * crest) rides up beside the rider ahead of you, lights flashing and a short siren whoop, and pulls
 * them over: held to a stop for POLICE.hold seconds with a wobble, then let go, and the officer rides
 * off ahead and is gone.
 *
 *   const cops = new PoliceStops(scene);
 *   cops.call(target, { side });        // target: a racer ({ s: { x, z, heading, v }, y })
 *   cops.update(dt);                    // each frame; follows the target, flashes, leaves
 *
 * `policeTarget` (who gets pulled over, pure) is tested in tests/unit/jarani-items.test.mjs.
 */
export const POLICE = {
  /** seconds from the call until they are alongside */
  arrive: 0.45,
  /** seconds the rider is held, from then (the patrol stays beside them, lights going, the whole time) */
  hold: 5,
  /** seconds riding off afterwards */
  leave: 1.1
};

/**
 * Who a police call pulls over: the nearest rider ahead of `me` on the course (by distance round
 * it, `dist`); if `me` is leading, the nearest behind; nobody if there is no one else. Riders who
 * have finished or left don't count. `riders` [{ id, dist, done, left }].
 */
export function policeTarget(me, riders) {
  let ahead = null;
  let behind = null;
  for (const o of riders) {
    if (o === me || o.id === me.id || o.left || o.done != null) continue;
    const d = o.dist - me.dist;
    if (d > 0 && (!ahead || d < ahead.d)) ahead = { o, d };
    if (d <= 0 && (!behind || d > behind.d)) behind = { o, d };
  }
  return ahead?.o ?? behind?.o ?? null;
}

function sideTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f7f9';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#1d4fd8';
  g.fillRect(0, 40, 256, 14);
  g.fillStyle = '#ffd23a';
  g.fillRect(0, 54, 256, 4);
  g.fillStyle = '#123a9c';
  g.font = '900 30px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('POLICE 경찰', 128, 21);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let kit = null;
/** The shared parts (made once). */
function parts() {
  if (kit) return kit;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
  const side = sideTexture();
  kit = {
    body: new RoundedBoxGeometry(0.46, 0.42, 1.25, 3, 0.12),
    shield: new RoundedBoxGeometry(0.5, 0.55, 0.12, 3, 0.05),
    wheel: new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20).rotateZ(Math.PI / 2),
    bar: new RoundedBoxGeometry(0.44, 0.08, 0.12, 2, 0.03),
    lamp: new RoundedBoxGeometry(0.2, 0.09, 0.13, 2, 0.03),
    torso: new THREE.CapsuleGeometry(0.17, 0.32, 6, 12),
    head: new THREE.SphereGeometry(0.15, 20, 14),
    cap: new THREE.CylinderGeometry(0.16, 0.15, 0.08, 20),
    brim: new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20, 1, false, -Math.PI / 2, Math.PI),
    arm: new THREE.CapsuleGeometry(0.05, 0.3, 4, 8),
    glow: new THREE.PlaneGeometry(1, 1),
    m: {
      white: std('#f6f7f9', { roughness: 0.35, metalness: 0.1 }),
      sideM: new THREE.MeshStandardMaterial({ map: side, roughness: 0.35 }),
      dark: std('#1f2430', { roughness: 0.8 }),
      navy: std('#22305a', { roughness: 0.75 }),
      vest: std('#d9ff3a', { roughness: 0.6, emissive: '#5a7000', emissiveIntensity: 0.25 }),
      skin: std('#f2d2b5', { roughness: 0.7 }),
      badge: std('#ffd23a', { metalness: 0.6, roughness: 0.3 })
    },
    side
  };
  return kit;
}

/** One patrol officer on their scooter, lights and all. */
function patrol() {
  const K = parts();
  const g = new THREE.Group();
  g.name = 'police';
  const body = new THREE.Mesh(K.body, [K.m.sideM, K.m.sideM, K.m.white, K.m.white, K.m.white, K.m.white]);
  body.position.y = 0.42;
  const shield = new THREE.Mesh(K.shield, K.m.white);
  shield.position.set(0, 0.75, -0.55);
  shield.rotation.x = -0.25;
  const wf = new THREE.Mesh(K.wheel, K.m.dark);
  wf.position.set(0, 0.2, -0.55);
  const wb = wf.clone();
  wb.position.z = 0.5;
  // the light bar, on a short mast behind the seat: red one side, blue the other
  const bar = new THREE.Mesh(K.bar, K.m.dark);
  bar.position.set(0, 1.42, 0.5);
  const red = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 0.4, roughness: 0.3 });
  const blue = new THREE.MeshStandardMaterial({ color: '#2a5bff', emissive: '#1f4dff', emissiveIntensity: 0.4, roughness: 0.3 });
  const lr = new THREE.Mesh(K.lamp, red);
  lr.position.set(-0.12, 1.5, 0.5);
  const lb = new THREE.Mesh(K.lamp, blue);
  lb.position.set(0.12, 1.5, 0.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), K.m.dark);
  mast.position.set(0, 1.12, 0.5);
  // the glows (bloom does the rest): one red, one blue, flashing in turn
  const glowM = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTexture(), fog: false });
  const gr = new THREE.Mesh(K.glow, glowM('#ff3030'));
  gr.position.copy(lr.position);
  gr.scale.setScalar(1.3);
  const gb = new THREE.Mesh(K.glow, glowM('#3a6bff'));
  gb.position.copy(lb.position);
  gb.scale.setScalar(1.3);
  // the officer: navy uniform, a hi-vis vest, a peaked cap with a gold badge
  const torso = new THREE.Mesh(K.torso, K.m.vest);
  torso.position.set(0, 0.98, 0.12);
  torso.rotation.x = -0.15;
  const legs = new THREE.Mesh(K.torso, K.m.navy);
  legs.scale.set(0.9, 0.6, 0.9);
  legs.position.set(0, 0.7, 0.05);
  const head = new THREE.Mesh(K.head, K.m.skin);
  head.position.set(0, 1.42, 0.08);
  const cap = new THREE.Mesh(K.cap, K.m.navy);
  cap.position.set(0, 1.55, 0.08);
  const brim = new THREE.Mesh(K.brim, K.m.dark);
  brim.position.set(0, 1.52, 0.04);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), K.m.badge);
  badge.position.set(0, 1.56, -0.075);
  badge.rotation.y = Math.PI;
  const armL = new THREE.Mesh(K.arm, K.m.navy);
  armL.position.set(-0.2, 1.0, -0.15);
  armL.rotation.x = -1.1;
  const armR = armL.clone();
  armR.position.x = 0.2;
  g.add(body, shield, wf, wb, bar, mast, lr, lb, gr, gb, torso, legs, head, cap, brim, badge, armL, armR);
  g.userData = { red, blue, gr, gb, armR, glows: [gr.material, gb.material], own: [red, blue, gr.material, gb.material, mast.geometry, badge.geometry] };
  for (const o of [gr, gb]) o.renderOrder = 4;
  return g;
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export class PoliceStops {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
  }

  /** Send a patrol to `target` (a racer), coming up on its `side` (+1 its left, −1 its right). */
  call(target, { side = 1 } = {}) {
    const g = patrol();
    this.scene.add(g);
    const stop = { g, target, t: 0, side, x: target.s.x, z: target.s.z };
    this._place(stop, 0);
    this.live.push(stop);
    return stop;
  }

  _place(st, dt) {
    const r = st.target;
    const h = r.s.heading;
    const fx = -Math.sin(h);
    const fz = -Math.cos(h);
    // its left is (−cos h, sin h)
    const lx = -Math.cos(h) * st.side;
    const lz = Math.sin(h) * st.side;
    const T = POLICE.arrive;
    const end = T + POLICE.hold;
    let back;
    let out = 1.25;
    if (st.t < T) {
      // up from behind, easing in alongside
      const u = st.t / T;
      back = -7 * (1 - u) * (1 - u);
      out = 1.25 + 0.8 * (1 - u);
    } else if (st.t < end) back = 0.4;
    else {
      // away ahead, speeding up
      const u = (st.t - end) / POLICE.leave;
      back = 0.4 + 14 * u * u;
      out = 1.25 + 1.2 * u;
    }
    const x = r.s.x + fx * back + lx * out;
    const z = r.s.z + fz * back + lz * out;
    const k = dt > 0 ? Math.min(1, dt * 18) : 1;
    st.x += (x - st.x) * k;
    st.z += (z - st.z) * k;
    st.g.position.set(st.x, r.y ?? 0, st.z);
    st.g.rotation.y = h + (st.t < T ? -0.25 * st.side * (1 - st.t / T) : 0);
  }

  update(dt) {
    for (const st of [...this.live]) {
      st.t += dt;
      this._place(st, dt);
      // the lights: red and blue in turn, quick double flashes
      const ph = (st.t * 2.6) % 1;
      const a = ph < 0.25 ? (Math.sin(ph * Math.PI * 8) > 0 ? 1 : 0.2) : 0.15;
      const b = ph >= 0.5 && ph < 0.75 ? (Math.sin(ph * Math.PI * 8) > 0 ? 1 : 0.2) : 0.15;
      const u = st.g.userData;
      u.red.emissiveIntensity = 0.4 + 3.2 * a;
      u.blue.emissiveIntensity = 0.4 + 3.2 * b;
      u.gr.material.opacity = a * 0.9;
      u.gb.material.opacity = b * 0.9;
      // the glows face the camera's way well enough from above and behind: tip them up a little
      u.gr.lookAt(u.gr.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 1)));
      u.gb.quaternion.copy(u.gr.quaternion);
      // the officer's right arm: a wave to pull over while they are stopped
      const stopped = st.t > POLICE.arrive && st.t < POLICE.arrive + POLICE.hold;
      u.armR.rotation.set(stopped ? -0.4 + Math.sin(st.t * 9) * 0.5 : -1.1, 0, stopped ? -1.2 : 0);
      if (st.t > POLICE.arrive + POLICE.hold + POLICE.leave) this._drop(st);
    }
  }

  _drop(st) {
    st.g.removeFromParent();
    for (const d of st.g.userData.own) d.dispose?.();
    this.live = this.live.filter((x) => x !== st);
  }

  dispose() {
    for (const st of [...this.live]) this._drop(st);
  }
}
