import * as THREE from 'three';

/**
 * Marbles for Kickrani: an item that pours a spray of shiny glass marbles out
 * behind your scooter. They bounce, scatter and roll on the road for a few
 * seconds, kept inside the street they were poured in (never onto a
 * pavement, never through a wall, and in a narrow golmok short cut only
 * across half its width, so it is never shut), then settle into a patch that
 * lies there for a dozen seconds.
 *
 * A rider whose wheels cross the patch slips: the grip goes, the scooter
 * wobbles and slides, speed is lost — and too fast (`MARBLE.fallV`), or
 * steering hard on them, they fall (the race's tumble with dizzy stars).
 * Slow down and ride straight, and you get through with a wobble. The golden
 * helmet takes the fall, not the slip. Marbles you ride through scatter.
 *
 * Pure rules (pourMarbles, stepMarble, corridorClamp, marbleFall) for the
 * tests; `MarbleField` draws every patch's marbles in one instanced draw and
 * `rattle` is their clatter, synthesised.
 *
 * Everyone in a room simulates the same pour from the same seed (the
 * pourer's browser sends it): the same patch in the same street.
 */
export const MARBLE = {
  count: 48, // marbles a pour
  r: 0.075, // radius, m: toy-sized, to be seen from the chase camera
  pour: 0.5, // s the pour lasts (they stream out behind you)
  life: 13, // s a patch lasts after the pour
  fade: 1, // s the patch takes to go (the last of its life)
  friction: 2.6, // m/s² a rolling marble loses on asphalt
  bounce: 0.35, // restitution of a bounce on the road
  touch: 0.42, // m: a wheel this close to a marble is on them
  slipGrip: 0.32, // the road's grip under a wheel on marbles (× the usual)
  speedLoss: 1.1, // 1/s of speed lost while slipping (× slip)
  fallV: 14, // m/s (~50 km/h): crossing them faster than this is a fall
  steerV: 8, // m/s (~29 km/h): above this, steering hard on them is a fall
  steerFall: 0.55, // how hard is hard (steer −1…1, or lean as a share of the most it leans)
  narrow: 5.5 // m: a street narrower than this keeps half its width clear of marbles
};

/** A small, fast, seeded random (everyone pours the same marbles from the same seed). */
export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The swirls' colours: a marble's inner twist of colour, paired with a lighter streak. */
export const SWIRLS = ['#3a8bff', '#ff5a7a', '#2fc48a', '#ffb02e', '#9b6bff', '#ff7a2a', '#18c6d6', '#e84ad6'];

/**
 * The marbles of one pour: from the back of a scooter at (x, z) going `heading` (0 is north, −z) at
 * `v` m/s. Each starts at the rear wheel (where the scooter will be) `delay` seconds into the pour, a little up, tossed back and
 * out to the sides; in the world they keep a little of the scooter's way, so they lay a trail behind
 * it rather than a heap. Returns [{ x, y, z, vx, vy, vz, delay, swirl, spin, live }].
 */
export function pourMarbles({ x, z, heading, v = 0, seed = 1, count = MARBLE.count }) {
  const rand = seeded(seed);
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const rx = Math.cos(heading);
  const rz = -Math.sin(heading);
  const out = [];
  for (let k = 0; k < count; k++) {
    const delay = (k / count) * MARBLE.pour + rand() * 0.03;
    const side = (rand() * 2 - 1) * (0.6 + rand() * 2.4);
    const back = 0.8 + rand() * 2.2;
    const keep = Math.max(0, v) * (0.08 + rand() * 0.1);
    // (out of the back of a scooter still going: laid along the road it rides over during the pour)
    const ahead = Math.max(0, v) * delay - 0.6;
    out.push({
      x: x + fx * ahead, z: z + fz * ahead, y: 0.42 + rand() * 0.2,
      vx: fx * (keep - back) + rx * side,
      vz: fz * (keep - back) + rz * side,
      vy: 0.4 + rand() * 1.4,
      delay,
      swirl: Math.floor(rand() * SWIRLS.length),
      spin: rand() * Math.PI * 2,
      axis: rand() * Math.PI,
      live: false,
      roll: 0
    });
  }
  return out;
}

/**
 * Keep a point inside the street of a stretch of line (points [x, z, …]): measured from the line
 * (+ is to its right), across it no further than `lo`…`hi` metres, and along it no further than the
 * stretch's ends. Returns { x, z, clamped } (clamped: it was moved).
 */
export function corridorClamp(pts, x, z, lo, hi) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    const px = a[0] + dx * t;
    const pz = a[1] + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, i, t, px, pz, dx, dz, L: Math.sqrt(L2) };
  }
  if (!best) return { x, z, clamped: false };
  // the right of the way along it (heading 0 is −z: right is +x)
  const ux = best.dx / best.L;
  const uz = best.dz / best.L;
  const rx = -uz;
  const rz = ux;
  const lat = (x - best.px) * rx + (z - best.pz) * rz;
  const c = Math.max(lo, Math.min(hi, lat));
  // (off either end of the stretch: back to its end)
  const end = (best.i === 0 && best.t === 0) || (best.i === pts.length - 2 && best.t === 1);
  if (c === lat && !end) return { x, z, clamped: false };
  return { x: best.px + rx * c, z: best.pz + rz * c, clamped: true };
}

/**
 * The band across a street a pour may cover (relative to its line, + right): the street's width less
 * a little each side (and the walls' room, if known); in a narrow street (a golmok short cut) only
 * the half the pourer is in, so the other half stays clear to ride through.
 */
export function pourBand(width, lat = 0, room = null) {
  const half = Math.max(0.6, width / 2 - 0.35);
  let lo = -half;
  let hi = half;
  if (room) {
    lo = Math.max(lo, -room[0] + 0.3);
    hi = Math.min(hi, room[1] - 0.3);
  }
  if (width < MARBLE.narrow) {
    if (lat >= 0) lo = Math.max(lo, 0.2);
    else hi = Math.min(hi, -0.2);
  }
  if (lo > hi) lo = hi = (lo + hi) / 2;
  return { lo, hi };
}

/**
 * One marble on by dt: falling and bouncing until it lies on the road, rolling (slowing on the
 * asphalt) and spinning as it rolls; `keep(x, z)` keeps it in the street (corridorClamp, and the
 * walls): met, it stops dead against the kerb or wall (and loses its way across it).
 */
export function stepMarble(m, dt, keep = null) {
  if (!m.live) {
    m.delay -= dt;
    if (m.delay > 0) return;
    m.live = true;
    dt = Math.min(dt, -m.delay + dt);
  }
  m.vy -= 9.81 * dt;
  m.y += m.vy * dt;
  if (m.y <= 0) {
    m.y = 0;
    m.vy = m.vy < -0.6 ? -m.vy * MARBLE.bounce : 0;
  }
  const sp = Math.hypot(m.vx, m.vz);
  if (sp > 0) {
    const k = Math.max(0, sp - MARBLE.friction * dt * (m.y > 0 ? 0.2 : 1)) / sp;
    m.vx *= k;
    m.vz *= k;
  }
  const nx = m.x + m.vx * dt;
  const nz = m.z + m.vz * dt;
  const at = keep ? keep(nx, nz) : { x: nx, z: nz, clamped: false };
  if (at.clamped) {
    m.vx *= 0.2;
    m.vz *= 0.2;
  }
  m.roll += (Math.hypot(at.x - m.x, at.z - m.z) / MARBLE.r) * (m.y > 0 ? 0.3 : 1);
  m.x = at.x;
  m.z = at.z;
}

/**
 * Whether crossing marbles throws a rider off: at speed (over MARBLE.fallV), or above MARBLE.steerV
 * while steering hard (the bars, or a lean near its limit). Slow and straight gets through.
 */
export function marbleFall(v, steer = 0, lean = 0, maxLean = 0.6) {
  if (v > MARBLE.fallV) return true;
  if (v <= MARBLE.steerV) return false;
  return Math.abs(steer) > MARBLE.steerFall || Math.abs(lean) / Math.max(0.05, maxLean) > 0.75;
}

/** How many marbles (still in the road) are within MARBLE.touch of a point. */
export function marblesAt(patch, x, z, reach = MARBLE.touch) {
  if (Math.abs(patch.x - x) > patch.r + reach || Math.abs(patch.z - z) > patch.r + reach) return 0;
  let n = 0;
  for (const m of patch.marbles) if (m.live && m.y < 0.3 && Math.abs(m.x - x) < reach && Math.abs(m.z - z) < reach && Math.hypot(m.x - x, m.z - z) < reach) n++;
  return n;
}

/** A patch's middle and reach (for the quick tests, the map and the bots). */
export function patchBounds(patch) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let n = 0;
  for (const m of patch.marbles) {
    if (!m.live) continue;
    n++;
    x0 = Math.min(x0, m.x);
    x1 = Math.max(x1, m.x);
    z0 = Math.min(z0, m.z);
    z1 = Math.max(z1, m.z);
  }
  if (!n) return { x: patch.x, z: patch.z, r: 0.5 };
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: Math.max(0.5, Math.hypot(x1 - x0, z1 - z0) / 2) };
}

/* ------------------------------------------------------------ drawing */

let swirlTex = null;
/** A glass marble's swirl: a twist of white ribbon on clear (tinted per marble by its colour). */
function swirlTexture() {
  if (swirlTex) return swirlTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  // (a deep clear body — the tint makes it coloured glass — and bright swirls in it)
  g.fillStyle = '#7d8ea6';
  g.fillRect(0, 0, 128, 64);
  for (const [w, a, col] of [[16, 0.95, '#ffffff'], [6, 1, '#f2f6ff']]) {
    g.strokeStyle = col;
    g.globalAlpha = a;
    g.lineWidth = w;
    g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let x = -8; x <= 136; x += 4) {
        const y = 32 + Math.sin((x / 128) * Math.PI * 4 + k * Math.PI) * 16;
        if (x === -8) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  swirlTex = new THREE.CanvasTexture(c);
  swirlTex.colorSpace = THREE.SRGBColorSpace;
  swirlTex.wrapS = THREE.RepeatWrapping;
  return swirlTex;
}

const _o = new THREE.Object3D();
const _q = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _c = new THREE.Color();

/**
 * Every patch's marbles in one instanced draw (glassy, a coloured swirl in each, a hard highlight
 * from the sky), with a soft contact shadow under each in a second.
 */
export class MarbleField {
  constructor(scene, shadowTex, max = 8 * MARBLE.count) {
    this.scene = scene;
    this.max = max;
    const mat = new THREE.MeshPhysicalMaterial({ map: swirlTexture(), roughness: 0.04, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, emissive: '#ffffff', emissiveMap: swirlTexture(), emissiveIntensity: 0.12, specularIntensity: 1, ior: 1.5 });
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.shadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), max);
    this.shadow.count = 0;
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 1;
    this.group = new THREE.Group();
    this.group.add(this.shadow, this.mesh);
    scene.add(this.group);
  }

  /** Draw the patches' marbles (`ground(x, z)`: the road's height there). */
  update(patches, ground, now) {
    let n = 0;
    const R = MARBLE.r;
    for (const p of patches) {
      // the last second of its life: the marbles sink away
      const k = Math.max(0, Math.min(1, (p.until - now) / MARBLE.fade));
      for (const m of p.marbles) {
        if (!m.live || n >= this.max) continue;
        m.gy ??= ground(m.x, m.z);
        if (m.y > 0 || Math.random() < 0.05) m.gy = ground(m.x, m.z);
        const r = R * (0.25 + 0.75 * k);
        _o.position.set(m.x, m.gy + m.y + r, m.z);
        // rolling: about the axis across the way it goes
        const sp = Math.hypot(m.vx, m.vz);
        if (sp > 1e-3) m.axis = Math.atan2(m.vx, m.vz);
        _ax.set(Math.cos(m.axis), 0, -Math.sin(m.axis));
        _q.setFromAxisAngle(_ax, m.roll + m.spin);
        _o.quaternion.copy(_q);
        _o.scale.setScalar(r);
        _o.updateMatrix();
        this.mesh.setMatrixAt(n, _o.matrix);
        _c.set(SWIRLS[m.swirl]);
        this.mesh.setColorAt(n, _c);
        _o.position.set(m.x, m.gy + 0.02, m.z);
        _o.quaternion.identity();
        _o.scale.set(r * 2.6, 1, r * 2.6);
        _o.updateMatrix();
        this.shadow.setMatrixAt(n, _o.matrix);
        n++;
      }
    }
    this.mesh.count = n;
    this.shadow.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.shadow.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.group);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}

/**
 * The clatter of glass marbles (poured, or a wheel through them): many tiny bright clicks, each a
 * short inharmonic ping, scattered over `dur` seconds — from a side (`pan` −1 … 1), at a level.
 * Returns how many clicks were played.
 */
export function rattle(audio, { gain = 0.5, pan = 0, dur = 0.7, n = 26 } = {}) {
  if (!audio) return 0;
  const t0 = audio.currentTime;
  const out = audio.createGain();
  out.gain.value = gain;
  let node = out;
  if (audio.createStereoPanner) {
    const p = audio.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    node = p;
  }
  node.connect(audio.destination);
  for (let k = 0; k < n; k++) {
    // thickest at the start, thinning out
    const t = t0 + dur * Math.pow(Math.random(), 1.7);
    const f = 2600 + Math.random() * 3800;
    for (const [mul, v] of [[1, 0.09], [2.71, 0.035]]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v * (0.5 + Math.random() * 0.6), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.12);
    }
  }
  return n;
}
