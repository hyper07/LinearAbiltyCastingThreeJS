import * as THREE from 'three';

/**
 * Everyday traffic for Seoul's streets, built here: the cars you see every
 * day — compact hatchbacks, mid-size saloons, small SUVs, people carriers,
 * taxis (orange, silver or white, with a roof sign of our own), delivery
 * vans, one-tonne trucks with a tarp over the bed — and city buses in the
 * blue, green and yellow of the routes (no real names or logos). Mostly in
 * the colours Seoul drives: white, silver, grey, black, a few muted blues,
 * reds and beiges.
 *
 * Each body is a side profile pushed out to the car's width with rounded
 * edges (one shared geometry a kind), glass set into it, tyres and rims,
 * lamps that light: headlights at night, brake lights brighter when braking,
 * amber indicators that really blink. A plate of our own. Shared materials
 * per paint, so forty cars are a few hundred draws at most, and far ones
 * drop their wheels and lamps.
 *
 *   const v = makeVehicle('sedan', '#e9e9e6');
 *   v.lights(night, braking); v.indicate('left' | 'right' | null, on); v.wheels(roll); v.near(on);
 */

/** Size, profile and look of each kind: length, width, height, wheel radius, wheelbase, and the side profile (x along from the front, y up). */
export const KINDS = {
  hatch: { length: 4.0, width: 1.76, height: 1.48, wheel: 0.31, base: 2.6, profile: [[0, 0.32], [0.05, 0.72], [0.75, 0.86], [1.65, 1.42], [3.2, 1.46], [3.85, 1.2], [4.0, 0.82], [4.0, 0.32]], glass: [[1.75, 0.92], [3.15, 0.94], [3.72, 0.9], [3.1, 1.36], [1.85, 1.36]], screen: [2, 3], rear: [4, 5] },
  sedan: { length: 4.75, width: 1.84, height: 1.45, wheel: 0.33, base: 2.84, profile: [[0, 0.33], [0.04, 0.7], [1.15, 0.86], [1.95, 1.4], [3.35, 1.44], [4.05, 0.98], [4.75, 0.92], [4.75, 0.33]], glass: [[2.05, 0.92], [3.3, 0.94], [3.9, 0.96], [3.28, 1.38], [2.1, 1.38]], screen: [2, 3], rear: [4, 5] },
  suv: { length: 4.45, width: 1.86, height: 1.68, wheel: 0.36, base: 2.68, profile: [[0, 0.4], [0.06, 0.86], [0.85, 1.02], [1.5, 1.62], [3.95, 1.66], [4.4, 1.3], [4.45, 0.9], [4.45, 0.4]], glass: [[1.6, 1.08], [3.9, 1.1], [4.25, 1.08], [3.88, 1.58], [1.68, 1.58]], screen: [2, 3], rear: [4, 5] },
  minivan: { length: 5.1, width: 1.98, height: 1.78, wheel: 0.34, base: 3.06, profile: [[0, 0.36], [0.05, 0.86], [0.75, 1.04], [1.45, 1.76], [4.95, 1.78], [5.1, 1.4], [5.1, 0.36]], glass: [[1.55, 1.1], [4.9, 1.12], [4.95, 1.62], [1.6, 1.68]], screen: [2, 3], rear: [4, 5] },
  van: { length: 5.0, width: 1.92, height: 1.95, wheel: 0.33, base: 3.0, profile: [[0, 0.36], [0.05, 0.9], [0.6, 1.1], [1.05, 1.92], [5.0, 1.95], [5.0, 0.36]], glass: [[1.12, 1.18], [1.75, 1.18], [1.75, 1.82], [1.18, 1.82]], screen: [2, 3] },
  truck: { length: 5.1, width: 1.74, height: 1.95, wheel: 0.3, base: 2.6, profile: [[0, 0.4], [0.05, 0.95], [0.3, 1.15], [0.45, 1.95], [1.65, 1.95], [1.65, 0.4]], glass: [[0.5, 1.2], [1.55, 1.22], [1.55, 1.85], [0.55, 1.85]], bed: true, screen: [2, 3] },
  bus: { length: 11, width: 2.5, height: 3.15, wheel: 0.5, base: 5.9, profile: [[0, 0.32], [0.04, 2.95], [0.3, 3.15], [10.8, 3.15], [11, 2.9], [11, 0.32]], glass: [[0.08, 1.1], [10.9, 1.1], [10.9, 2.75], [0.08, 2.85]], bus: true },
  taxi: { like: 'sedan', taxi: true }
};
/** How often each turns up in traffic. */
export const MIX = [['sedan', 0.3], ['hatch', 0.18], ['suv', 0.2], ['minivan', 0.08], ['taxi', 0.12], ['van', 0.05], ['truck', 0.07]];
/** Seoul's car colours: mostly white, silver, grey, black; a few muted blues, reds and beiges. */
export const PAINTS = ['#f2f2f0', '#f2f2f0', '#f2f2f0', '#c6c9cd', '#c6c9cd', '#8e9399', '#55595f', '#1c1d20', '#1c1d20', '#2f3e5c', '#6e2a2c', '#c9bfa8', '#4a5a6a'];
const TAXI = ['#f08a24', '#c6c9cd', '#f2f2f0'];
/** City buses: trunk blue, branch green, circular yellow. */
export const BUS_PAINTS = ['#2f6fd1', '#3aa65a', '#2f6fd1', '#f2c230'];

const geos = new Map();
const mats = new Map();
const mat = (key, make) => {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
};

/** A body: the side profile pushed out to the width, edges rounded. Front is −z. */
function bodyGeo(kindId, k) {
  const key = `${kindId}|body`;
  if (geos.has(key)) return geos.get(key);
  const shape = new THREE.Shape();
  k.profile.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const bevel = k.bus ? 0.08 : 0.07;
  const g = new THREE.ExtrudeGeometry(shape, { depth: k.width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  // Profile x (along) → −z (the front at −length/2), y up, extrude z → x across.
  g.translate(0, 0, -(k.width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  g.translate(0, 0, -k.length / 2);
  g.computeVertexNormals();
  geos.set(key, g);
  return g;
}

/** The glass: the window outline, set into each side, and a windscreen and back window across. */
function glassGeo(kindId, k) {
  const key = `${kindId}|glass`;
  if (geos.has(key)) return geos.get(key);
  const shape = new THREE.Shape();
  k.glass.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: k.width + 0.02, bevelEnabled: false });
  g.translate(0, 0, -(k.width + 0.02) / 2);
  g.rotateY(-Math.PI / 2);
  g.translate(0, 0, -k.length / 2);
  g.scale(0.985, 1, 1);
  g.computeVertexNormals();
  geos.set(key, g);
  return g;
}

function wheelGeo(r) {
  const key = `wheel|${r}`;
  if (!geos.has(key)) geos.set(key, new THREE.CylinderGeometry(r, r, 0.22, 18).rotateZ(Math.PI / 2));
  return geos.get(key);
}
function rimGeo(r) {
  const key = `rim|${r}`;
  if (!geos.has(key)) geos.set(key, new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.235, 12).rotateZ(Math.PI / 2));
  return geos.get(key);
}

/** A plate of our own: a made-up number. */
function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 28;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f0';
  g.fillRect(0, 0, 128, 28);
  g.strokeStyle = '#222';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 126, 26);
  g.fillStyle = '#111';
  g.font = '700 17px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${12 + Math.floor(Math.random() * 80)}가 ${1000 + Math.floor(Math.random() * 9000)}`, 64, 15);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let plates = null;

/** A taxi's roof sign, and a bus's route board: our own words. */
function signTexture(words, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 40;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 40);
  g.fillStyle = fg;
  g.font = '900 24px "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(words, 64, 21);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One vehicle of a kind, in a paint (a taxi or bus picks its own). */
export function makeVehicle(kindId, color = null) {
  const def = KINDS[kindId];
  const k = def.like ? { ...KINDS[def.like], ...def } : def;
  const group = new THREE.Group();
  const paintHex = color ?? (k.taxi ? TAXI[Math.floor(Math.random() * TAXI.length)] : k.bus ? BUS_PAINTS[Math.floor(Math.random() * BUS_PAINTS.length)] : PAINTS[Math.floor(Math.random() * PAINTS.length)]);
  const metallic = !k.bus && !k.taxi && Math.random() < 0.6;
  const paint = mat(`paint|${paintHex}|${metallic}`, () => new THREE.MeshPhysicalMaterial({ color: paintHex, roughness: metallic ? 0.32 : 0.42, metalness: metallic ? 0.55 : 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.9 }));
  const body = new THREE.Mesh(bodyGeo(def.like ?? kindId, k), paint);
  body.castShadow = true;
  group.add(body);
  const glass = new THREE.Mesh(glassGeo(def.like ?? kindId, k), mat('glass', () => new THREE.MeshPhysicalMaterial({ color: '#1b232c', roughness: 0.06, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.3 })));
  group.add(glass);
  // The windscreen and the back window, along the profile's slopes.
  for (const which of ['screen', 'rear']) {
    if (!k[which]) continue;
    const [i, j] = k[which];
    const [px, py] = k.profile[i];
    const [qx, qy] = k.profile[j];
    const dz = qx - px;
    const dy = qy - py;
    const len = Math.hypot(dz, dy);
    const nz = -dy / len;
    const ny = dz / len;
    const w = k.width * 0.43;
    const a = (t) => [px + dz * t - k.length / 2 + nz * 0.015, py + dy * t + ny * 0.015];
    const [z0, y0] = a(0.08);
    const [z1, y1] = a(0.92);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, y0, z0, w, y0, z0, w, y1, z1, -w, y0, z0, w, y1, z1, -w, y1, z1], 3));
    g.computeVertexNormals();
    const pane = new THREE.Mesh(g, glass.material);
    pane.material.side = THREE.DoubleSide;
    group.add(pane);
  }
  // A dark sill and bumpers (plastic).
  const trim = mat('trim', () => new THREE.MeshStandardMaterial({ color: '#25272b', roughness: 0.7 }));
  for (const z of [-k.length / 2 + 0.05, k.length / 2 - 0.05]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(k.width * 0.98, 0.22, 0.14), trim);
    b.position.set(0, k.wheel * 0.95, z);
    group.add(b);
  }
  if (k.bed) {
    // The one-tonne truck's bed: low sides and a tarp over the load.
    const bedLen = k.length - 1.75;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(k.width, 0.5, bedLen), paint);
    bed.position.set(0, 0.68, k.length / 2 - bedLen / 2);
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(k.width * 0.96, 0.65, bedLen * 0.92), mat('tarp', () => new THREE.MeshStandardMaterial({ color: '#2f5aa0', roughness: 0.9 })));
    tarp.position.set(0, 1.25, k.length / 2 - bedLen / 2);
    group.add(bed, tarp);
  }
  if (k.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.22), mat('taxisign', () => new THREE.MeshStandardMaterial({ map: signTexture('택시', '#ffd23a', '#1a1a1a'), emissive: '#ffd23a', emissiveIntensity: 0.2 })));
    sign.position.set(0, k.profile.reduce((m, p) => Math.max(m, p[1]), 0) + 0.1, 0.25);
    group.add(sign);
  }
  if (k.bus) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.36), mat(`busboard|${paintHex}`, () => new THREE.MeshStandardMaterial({ map: signTexture(paintHex === '#3aa65a' ? '1712' : paintHex === '#f2c230' ? '순환' : '470', '#121212', '#ffb02e'), emissive: '#ffffff', emissiveIntensity: 0.4 })));
    board.position.set(0, 2.9, -k.length / 2 - 0.01);
    board.rotation.y = Math.PI;
    group.add(board);
    // A white stripe down the side.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(k.width + 0.02, 0.18, k.length * 0.96), mat('busstripe', () => new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.5 })));
    stripe.position.y = 0.95;
    group.add(stripe);
  }
  // Wheels.
  const wheelMats = [mat('tyre', () => new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.9 })), mat('rim', () => new THREE.MeshStandardMaterial({ color: '#aeb2b8', roughness: 0.3, metalness: 0.8 }))];
  const wheels = [];
  for (const z of [-k.base / 2, k.base / 2]) for (const x of [-1, 1]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(wheelGeo(k.wheel), wheelMats[0]), new THREE.Mesh(rimGeo(k.wheel), wheelMats[1]));
    w.position.set(x * (k.width / 2 - 0.12), k.wheel, z + (k.bus ? 1.2 : 0.15));
    group.add(w);
    wheels.push(w);
  }
  // Lamps: head, tail (brake), indicators.
  const lamp = (w, h, x, y, z, m) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), m);
    l.position.set(x, y, z);
    group.add(l);
    return l;
  };
  const head = new THREE.MeshStandardMaterial({ color: '#f4f2ea', emissive: '#fff2d0', emissiveIntensity: 0.2 });
  const tail = new THREE.MeshStandardMaterial({ color: '#5a0a0c', emissive: '#ff2020', emissiveIntensity: 0.3 });
  const amberOff = mat('amberoff', () => new THREE.MeshStandardMaterial({ color: '#8a5a1a', emissive: '#000000' }));
  const amberOn = mat('amberon', () => new THREE.MeshStandardMaterial({ color: '#ffb02e', emissive: '#ffa018', emissiveIntensity: 2.4 }));
  const ly = k.bus ? 0.8 : k.wheel + 0.42;
  const hw = k.width / 2 - 0.22;
  for (const s of [-1, 1]) {
    lamp(0.36, 0.12, s * hw, ly, -k.length / 2 - 0.02, head);
    lamp(0.3, 0.14, s * hw, ly + 0.05, k.length / 2 + 0.02, tail);
  }
  const ind = { left: [], right: [] };
  for (const s of [-1, 1]) for (const z of [-k.length / 2 - 0.025, k.length / 2 + 0.025]) ind[s < 0 ? 'left' : 'right'].push(lamp(0.1, 0.08, s * (k.width / 2 - 0.06), ly, z, amberOff));
  // The plate, at the back.
  plates ??= Array.from({ length: 6 }, plateTexture);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), mat(`plate|${Math.floor(Math.random() * 6)}`, () => new THREE.MeshStandardMaterial({ map: plates[Math.floor(Math.random() * 6)], roughness: 0.5 })));
  plate.position.set(0, k.wheel + 0.18, k.length / 2 + 0.08);
  group.add(plate);
  const detail = [...wheels, ...ind.left, ...ind.right, plate];
  let spun = 0;
  return {
    group,
    kind: kindId,
    size: { length: k.length, width: k.width, height: k.height, wheel: k.wheel },
    wheels(roll) {
      spun = (spun + roll) % (Math.PI * 2);
      for (const w of wheels) w.rotation.x = -spun;
    },
    /** Near: wheels, plate and indicators drawn; far, just the body and glass. */
    near(on) {
      for (const o of detail) o.visible = on;
    },
    lights(night, braking) {
      head.emissiveIntensity = 0.2 + night * 2.6;
      tail.emissiveIntensity = braking ? 2.6 : 0.3 + night * 1.0;
    },
    /** Blink an indicator ('left' / 'right', or both for hazards), `on` this half-second. */
    indicate(side, on) {
      for (const s of ['left', 'right']) for (const m of ind[s]) m.material = on && (side === s || side === 'both') ? amberOn : amberOff;
    }
  };
}

/** A kind for a new car in traffic, by how common it is. */
export function pickKind(random = Math.random) {
  let r = random();
  for (const [k, p] of MIX) if ((r -= p) <= 0) return k;
  return 'sedan';
}
