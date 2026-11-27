import * as THREE from 'three';

/**
 * Admiral Yi Sun-sin on Gwanghwamun Square: the sculpted statue the project's owner supplied
 * (Yi_Sun-sin_fixed.stl, 83,842 triangles), packed by scripts/models/statue-pack.mjs into
 * public/models/landmarks/yi-sun-sin.bin (welded, 16-bit positions). Gilded: polished gold over the
 * city's sky light, lit softly from below after dark (its emissive, through `under`).
 *
 * The model stands z-up in millimetre-ish units, 98.3 tall, the sword at its low x; here it is turned
 * y-up and facing +z (south, down the square), scaled to HEIGHT metres, standing on y = 0.
 */
export const HEIGHT = 6.5;
const URL = './models/landmarks/yi-sun-sin.bin';

/** Polished gold, a little warm; its emissive is the soft glow from the lamps below after dark. */
export function goldMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: '#e0b04a', metalness: 0.92, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.35, emissive: '#7a5418', emissiveIntensity: 0 });
}

/** The packed mesh (see statue-pack.mjs) as an indexed geometry, smooth-shaded, y-up, feet at 0, centred. */
export function unpack(buf) {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'MESH') throw new Error('not a packed mesh');
  const nv = dv.getUint32(4, true);
  const ni = dv.getUint32(8, true);
  const size = [0, 1, 2].map((k) => dv.getFloat32(24 + k * 4, true));
  const q = new Uint16Array(buf, 36, nv * 3);
  const index = new Uint32Array(buf, 36 + nv * 6 + ((nv * 6) % 4), ni);
  const s = HEIGHT / size[2];
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    // model x → x, model z (up) → y, model y → −z: facing the model's −y, now +z
    const x = (q[i * 3] / 65535) * size[0] - size[0] / 2;
    const y = (q[i * 3 + 1] / 65535) * size[1] - size[1] / 2;
    const z = (q[i * 3 + 2] / 65535) * size[2];
    pos[i * 3] = x * s;
    pos[i * 3 + 1] = z * s;
    pos[i * 3 + 2] = -y * s;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

let loading = null;
/** The statue's geometry, fetched once (null if it can't be had). */
export function statueGeometry() {
  return (loading ??= fetch(URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then(unpack)
    .catch(() => null));
}

/** The gilded admiral: a group at once, his figure in it as soon as the mesh has come. */
export function yiStatue(gold = goldMaterial()) {
  const g = new THREE.Group();
  g.name = 'Admiral Yi Sun-sin';
  statueGeometry().then((geo) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, gold);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  });
  return g;
}
