import * as THREE from 'three';

/**
 * The branch: an item (items.js) — a leafy plane-tree branch, snapped off
 * after a storm, thrown into the wheel of the rider ahead or dropped behind
 * you as a trap. Whoever's front wheel catches it stops dead and goes over
 * the bars (race.js). Grown in code like the street trees (trees.js): a
 * crooked, tapering stick with side twigs, bark-brown with a paler snapped
 * end, and bunches of five-lobed leaves drawn in a canvas.
 *
 * The flight is plain numbers, so the tests can throw one:
 *   const plan = throwPlan(from, target, targetVelocity);   // where it lands, and when
 *   const p = flightAt(plan, t);                            // { x, y, z, spin } along its arc
 */

/**
 * How a branch flies: its speed over the ground (m/s), how long at least and at most (s), how high it
 * arcs, how far it can be thrown (m), the wind-up (s), how long one lies in the road (s), how near a
 * wheel must come to catch it in the air and on the road (m), the immunity after a catch (s), and how
 * fast (m/s) its landing spot follows the rider it was thrown at.
 */
export const THROW = { speed: 38, min: 0.35, max: 1.25, arc: 1.4, reach: 55, windup: 0.28, lie: 22, hitR: 0.95, trapR: 0.8, immune: 3, home: 9 };

/**
 * Plan a throw from (x, y, z) at a target moving at (vx, vz): aimed where it will be when the branch
 * comes down (led once, then again from the better flight time). Returns { sx, sy, sz, tx, tz, T }.
 */
export function throwPlan(from, target, vel = { x: 0, z: 0 }) {
  let tx = target.x;
  let tz = target.z;
  let T = THROW.min;
  for (let k = 0; k < 2; k++) {
    T = Math.max(THROW.min, Math.min(THROW.max, Math.hypot(tx - from.x, tz - from.z) / THROW.speed));
    tx = target.x + vel.x * T;
    tz = target.z + vel.z * T;
  }
  return { sx: from.x, sy: from.y, sz: from.z, tx, tz, T };
}

/** Where a thrown branch is `t` seconds into its flight (y over the start's ground, which the race adds). */
export function flightAt(p, t) {
  const u = Math.max(0, Math.min(1, t / p.T));
  const h = THROW.arc + Math.hypot(p.tx - p.sx, p.tz - p.sz) * 0.025;
  return {
    x: p.sx + (p.tx - p.sx) * u,
    z: p.sz + (p.tz - p.sz) * u,
    // up from the hand and down to the road (a parabola from sy to 0)
    y: p.sy * (1 - u) + 4 * h * u * (1 - u),
    spin: u * Math.PI * 3.2,
    u
  };
}

/* ------------------------------------------------------------ the model */

let shared = null;

function leafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  // a five-lobed leaf, a stalk, veins
  const leaf = new Path2D();
  const cx = 64;
  const cy = 70;
  const lobes = [[0, 50], [-0.95, 40], [0.95, 40], [-1.75, 28], [1.75, 28]];
  leaf.moveTo(cx, cy + 6);
  for (const [a, r] of lobes.sort((p, q) => p[0] - q[0])) {
    const x = cx + Math.sin(a) * r;
    const y = cy - Math.cos(a) * r;
    leaf.lineTo(cx + Math.sin(a - 0.3) * r * 0.55, cy - Math.cos(a - 0.3) * r * 0.55);
    leaf.lineTo(x, y);
    leaf.lineTo(cx + Math.sin(a + 0.3) * r * 0.55, cy - Math.cos(a + 0.3) * r * 0.55);
  }
  leaf.closePath();
  const grad = g.createLinearGradient(30, 20, 100, 110);
  grad.addColorStop(0, '#8ccf4a');
  grad.addColorStop(1, '#3f8a2c');
  g.fillStyle = grad;
  g.fill(leaf);
  g.strokeStyle = 'rgba(30, 70, 20, 0.7)';
  g.lineWidth = 2;
  g.stroke(leaf);
  g.strokeStyle = 'rgba(220, 240, 170, 0.75)';
  g.lineWidth = 1.6;
  for (const [a, r] of lobes) {
    g.beginPath();
    g.moveTo(cx, cy + 4);
    g.lineTo(cx + Math.sin(a) * r * 0.85, cy - Math.cos(a) * r * 0.85);
    g.stroke();
  }
  g.strokeStyle = '#5a4026';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx, cy + 4);
  g.lineTo(cx, 124);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A small seeded random (every branch the same shape: they are all the same item). */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** A tube along points (radii tapering from r0 to r1): a twig. */
function tube(points, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, 8, 1, 6, false);
  // taper: scale each ring about the curve
  const P = g.attributes.position;
  const rings = 9;
  const per = P.count / rings;
  for (let i = 0; i < P.count; i++) {
    const ring = Math.floor(i / per);
    const u = ring / (rings - 1);
    const c = curve.getPoint(u);
    const r = r0 + (r1 - r0) * u;
    P.setXYZ(i, c.x + (P.getX(i) - c.x) * r, c.y + (P.getY(i) - c.y) * r, c.z + (P.getZ(i) - c.z) * r);
  }
  g.computeVertexNormals();
  return g;
}

function build() {
  const R = rng(7);
  const wood = [];
  const leafCards = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // the main stick, along x, a little crooked; the snapped end at −x
  const main = [V(-0.55, 0, 0), V(-0.2, 0.03, 0.04), V(0.15, -0.02, -0.03), V(0.55, 0.05, 0.02)];
  wood.push(tube(main, 0.045, 0.014));
  // twigs off it, and leaves at their ends and along them
  const twigs = [[-0.15, 1, 0.5], [0.1, -1, 0.55], [0.3, 1, 0.45], [0.45, -1, 0.3]];
  for (const [at, side, len] of twigs) {
    const a = V(at, 0.02, 0);
    const b = V(at + len * 0.6, 0.06 + R() * 0.08, side * len * 0.55);
    const c = V(at + len * 0.95, 0.1 + R() * 0.1, side * len * 0.75);
    wood.push(tube([a, b, c], 0.018, 0.007));
    for (const p of [b, c, V((a.x + b.x) / 2, 0.05, (a.z + b.z) / 2)]) leafCards.push({ p, s: 0.2 + R() * 0.08, r: R() * Math.PI * 2 });
  }
  for (const p of [V(0.55, 0.05, 0.02), V(0.4, 0.05, 0.08)]) leafCards.push({ p, s: 0.22, r: R() * Math.PI * 2 });
  // leaf cards: two crossed quads each, turned this way and that
  const pos = [];
  const uv = [];
  const quad = (c, s, yaw, tilt) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt, yaw, 0));
    const corners = [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]].map(([x, y, z]) => V(x * s * 0.5, y, z * s * 0.5).applyMatrix4(m).add(c));
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(corners[i].x, corners[i].y, corners[i].z);
      uv.push(...uvs[i]);
    }
  };
  for (const l of leafCards) {
    quad(l.p, l.s, l.r, 0.35);
    quad(l.p.clone().add(V(0, 0.04, 0)), l.s * 0.9, l.r + 1.7, -0.6);
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  leaves.computeVertexNormals();
  // the snapped end: a paler splintered stub
  const stub = new THREE.ConeGeometry(0.046, 0.08, 6).rotateZ(Math.PI / 2).translate(-0.59, 0, 0);
  return {
    wood: wood.concat([stub]),
    leaves,
    bark: new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.92 }),
    pale: new THREE.MeshStandardMaterial({ color: '#d9c49a', roughness: 0.8 }),
    leaf: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 })
  };
}

/** A branch to put in the scene (each its own group; the shapes and materials are shared). */
export function branchModel() {
  shared ??= build();
  const g = new THREE.Group();
  shared.wood.forEach((geo, i) => {
    const m = new THREE.Mesh(geo, i === shared.wood.length - 1 ? shared.pale : shared.bark);
    m.castShadow = true;
    g.add(m);
  });
  const l = new THREE.Mesh(shared.leaves, shared.leaf);
  l.castShadow = true;
  g.add(l);
  return g;
}

/**
 * The twig snap: a dry crack (two quick clicks of bright noise) and a short woody knock under it.
 * Returns how many sound sources it started.
 */
export function snapSound(audio, gain = 1) {
  if (!audio || gain <= 0.01) return 0;
  const t0 = audio.currentTime + 0.003;
  const len = Math.floor(audio.sampleRate * 0.06);
  const buf = audio.createBuffer(1, len, audio.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
  let n = 0;
  for (const [at, f, g] of [[0, 2400, 0.55], [0.035, 1700, 0.4]]) {
    const s = audio.createBufferSource();
    s.buffer = buf;
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 1.4;
    const gg = audio.createGain();
    gg.gain.value = g * gain;
    s.connect(bp).connect(gg).connect(audio.destination);
    s.start(t0 + at);
    n++;
  }
  // the knock: a low, quickly damped tone
  const o = audio.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(320, t0);
  o.frequency.exponentialRampToValueAtTime(140, t0 + 0.09);
  const og = audio.createGain();
  og.gain.setValueAtTime(0.25 * gain, t0);
  og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  o.connect(og).connect(audio.destination);
  o.start(t0);
  o.stop(t0 + 0.14);
  return n + 1;
}
