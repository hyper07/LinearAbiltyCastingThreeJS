/**
 * The vale's landmarks, built like the village (Gloamreach's Kit, merged by
 * material): the Windbell Shrine on its hill — a stone terrace, a little
 * red-posted hall with a gold-tiled roof, an arch at the top of the steps,
 * a frame of wind bells, a bench where the view opens over the whole vale —
 * the stone lanterns up its last climb (cold until an Emberkit kindles
 * them), the arched bridge over the Pebblerun, and the signpost at the fork.
 */
import * as THREE from 'three';
import { Kit, tf } from '../gloamreach/kit.js';
import { SHRINE, STONE_LANTERNS, ROAD } from './map.js';
import { groundAt, heightAt, bridgeFrame, deckHeight } from './heights.js';
import { addHouse, addRoof, addLantern, villageMaterials } from './village.js';
import { painterly } from './paint.js';
import { signTexture } from './painted.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const M = (...a) => tf(...a);
const mul = (a, b) => a.clone().multiply(b);

function addShrine(kit, colliders) {
  const { x, z, face } = SHRINE;
  const y = heightAt(x, z) + 0.05;
  const base = M(x, y, z, 0, face, 0);
  // The terrace, and steps down toward the valley.
  kit.box('stone', 13, 0.7, 11, mul(base, M(0, -0.4, -1)), '#a8a294');
  for (let i = 0; i < 4; i++) kit.box('stone', 4.2, 0.18, 0.5, mul(base, M(0, -0.4 - i * 0.18, 4.7 + i * 0.5)), '#9e988a');
  // The hall: red posts, white walls, a gold roof with sweeping eaves.
  const hx = x + Math.sin(face) * -2.2;
  const hz = z + Math.cos(face) * -2.2;
  addHouse(kit, { id: 'shrine', x: hx, z: hz, w: 5.6, d: 4.4, face, floors: 1, roof: 'gold', kind: 'shrine', timber: '#a8402e', plaster: '#f4ecdc' }, colliders);
  // The arch at the top of the steps: two red posts, two lintels (the upper one swept up at its ends), bells.
  const ab = mul(base, M(0, 0.3, 4.2));
  for (const s of [-1, 1]) {
    kit.cyl('paint', 0.2, 0.17, 4.2, mul(ab, M(s * 1.9, 0, 0)), '#b8402e', 12);
    kit.cyl('stone', 0.32, 0.32, 0.4, mul(ab, M(s * 1.9, 0, 0)), '#3a3634', 10);
    colliders?.circle(...[V(s * 1.9, 0, 0).applyMatrix4(ab)].map((p) => [p.x, p.z])[0], 0.3);
  }
  kit.box('paint', 4.7, 0.26, 0.32, mul(ab, M(0, 3.45, 0)), '#b8402e');
  const top = new THREE.BoxGeometry(5.6, 0.3, 0.42, 16, 1, 1);
  const tp = top.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, tp.getY(i) + Math.pow(Math.abs(tp.getX(i)) / 2.8, 3) * 0.32);
  top.computeVertexNormals();
  kit.add('timber', top, mul(ab, M(0, 4.25, 0)), '#2e2622');
  kit.box('paint', 0.18, 0.7, 0.2, mul(ab, M(0, 3.6, 0)), '#b8402e');
  // The bell frame, beside the hall: a beam of hanging wind bells.
  const bb = mul(base, M(4.6, 0.3, 0.6, 0, -0.3, 0));
  for (const s of [-1, 1]) kit.box('timber', 0.18, 3.0, 0.18, mul(bb, M(s * 1.4, 0, 0)), '#5a3a2a');
  kit.box('timber', 3.4, 0.2, 0.22, mul(bb, M(0, 2.9, 0)), '#5a3a2a');
  addRoof(kit, mul(bb, M(0, 3.08, 0)), { W: 1.9, D: 0.7, rise: 0.45, color: 'gold', segV: 4, seed: 41, curl: 0.3 });
  const bells = [];
  for (let i = 0; i < 6; i++) {
    const bx = -1.1 + i * 0.44;
    kit.cyl('timber', 0.006, 0.006, 0.35, mul(bb, M(bx, 2.55, 0)), '#3a2a20', 3);
    const bell = new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    kit.add('bronze', bell, mul(bb, M(bx, 2.45, 0)), '#c8a050');
    kit.box('clothFlat', 0.07, 0.32, 0.005, mul(bb, M(bx, 2.05, 0)), ['#f2e8d0', '#e8a0a0', '#a0c0e0'][i % 3]);
    bells.push(V(bx, 2.45, 0).applyMatrix4(bb));
  }
  colliders?.box(...(() => {
    const p = V(0, 0, 0).applyMatrix4(bb);
    return [p.x, p.z];
  })(), 1.6, 0.3, face - 0.3, -1, 4);
  // An offering box before the hall, and lanterns at its corners.
  kit.box('wood', 1.2, 0.7, 0.6, mul(base, M(0, 0.3, 1.2)), '#6a4630');
  kit.box('timber', 1.3, 0.08, 0.7, mul(base, M(0, 1.0, 1.2)), '#4a3226');
  // The bench at the lookout, facing out over the vale.
  const lb = mul(base, M(-4.4, 0.3, 3.2, 0, 0.35, 0));
  kit.box('wood', 2.2, 0.1, 0.5, mul(lb, M(0, 0.42, 0)), '#7a5a3a');
  for (const s of [-1, 1]) kit.box('stone', 0.3, 0.42, 0.45, mul(lb, M(s * 0.85, 0, 0)), '#9a9488');
  return { bells, bench: V(-4.4, 0.3, 3.2).applyMatrix4(base) };
}

/** Stone lanterns: footing, post, a fire box with windows, a cap. Each fire box is its own bucket, to light one by one. */
function addStoneLantern(kit, x, z, i, colliders) {
  const y = groundAt(x, z);
  const base = M(x, y, z, 0, i * 0.7, 0);
  kit.box('stone', 0.7, 0.25, 0.7, base.clone(), '#9a958c');
  kit.cyl('stone', 0.16, 0.2, 0.9, mul(base, M(0, 0.25, 0)), '#a8a398', 8);
  kit.box('stone', 0.6, 0.12, 0.6, mul(base, M(0, 1.15, 0)), '#9a958c');
  kit.box(`fire:${i}`, 0.34, 0.34, 0.34, mul(base, M(0, 1.27, 0)), '#ffd28a');
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box('stone', 0.08, 0.36, 0.08, mul(base, M(sx * 0.21, 1.27, sz * 0.21)), '#9a958c');
  const cap = new THREE.ConeGeometry(0.55, 0.38, 4, 1);
  cap.rotateY(Math.PI / 4);
  kit.add('stone', cap, mul(base, M(0, 1.82, 0)), '#8a857c');
  kit.add('stone', new THREE.SphereGeometry(0.09, 8, 6), mul(base, M(0, 2.05, 0)), '#8a857c');
  colliders?.circle(x, z, 0.4);
  return V(x, y + 1.44, z);
}

/** The arched bridge: plank deck along the arch, railings, stone abutments. */
function addBridge(kit, colliders) {
  const b = bridgeFrame();
  const fx = Math.sin(b.yaw);
  const fz = Math.cos(b.yaw);
  const rx = Math.cos(b.yaw);
  const rz = -Math.sin(b.yaw);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const along = -b.half + ((i + 0.5) / n) * b.half * 2;
    const y = deckHeight(along);
    const x = b.x + fx * along;
    const z = b.z + fz * along;
    const slope = Math.atan2(deckHeight(along + 0.1) - deckHeight(along - 0.1), 0.2);
    kit.box('wood', b.w * 2 + 0.3, 0.1, (b.half * 2) / n - 0.04, M(x, y - 0.1, z, -slope, b.yaw, 0), ['#8a6a48', '#7a5c3e', '#94744e'][i % 3]);
  }
  // Beams under the deck.
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const along = -b.half + (i / 12) * b.half * 2;
      pts.push(V(b.x + fx * along + rx * s * (b.w - 0.1), deckHeight(along) - 0.25, b.z + fz * along + rz * s * (b.w - 0.1)));
    }
    for (let i = 0; i < 12; i++) kit.beam('timber', pts[i], pts[i + 1], 0.22, '#4a3226');
    // Railings.
    const rail = [];
    for (let i = 0; i <= 8; i++) {
      const along = -b.half + 0.3 + (i / 8) * (b.half * 2 - 0.6);
      const p = V(b.x + fx * along + rx * s * (b.w + 0.1), deckHeight(along), b.z + fz * along + rz * s * (b.w + 0.1));
      kit.box('timber', 0.12, 1.0, 0.12, M(p.x, p.y - 0.1, p.z, 0, b.yaw, 0), '#5a3a2a');
      rail.push(p.clone().add(V(0, 0.9, 0)));
    }
    for (let i = 0; i < 8; i++) kit.beam('wood', rail[i], rail[i + 1], 0.09, '#8a6444');
    // Railings stop you walking off the side.
    colliders?.box(b.x + rx * s * (b.w + 0.15), b.z + rz * s * (b.w + 0.15), 0.08, b.half - 0.3, b.yaw, -1, 10);
  }
  for (const s of [-1, 1]) {
    const x = b.x + fx * s * (b.half + 0.3);
    const z = b.z + fz * s * (b.half + 0.3);
    kit.box('stone', b.w * 2 + 1.0, 1.4, 1.0, M(x, groundAt(x, z) - 1.0, z, 0, b.yaw, 0), '#a29a8e');
  }
}

/** The signpost where the pond trail leaves the road. */
function addSignpost(kit) {
  const x = 4.2;
  const z = -27;
  const y = groundAt(x, z);
  kit.cyl('timber', 0.07, 0.08, 2.3, M(x, y, z), '#4a3226', 6);
  kit.add('sign:pond', new THREE.PlaneGeometry(1.2, 0.3), M(x + 0.55, y + 1.95, z, 0, Math.PI / 2 - 0.2, 0), '#ffffff');
  kit.add('sign:pond', new THREE.PlaneGeometry(1.2, 0.3), M(x + 0.55, y + 1.95, z - 0.01, 0, -Math.PI / 2 - 0.2, 0), '#ffffff');
  kit.add('sign:shrine', new THREE.PlaneGeometry(1.2, 0.3), M(x, y + 1.55, z + 0.5, 0, 0, 0), '#ffffff');
  kit.add('sign:shrine', new THREE.PlaneGeometry(1.2, 0.3), M(x, y + 1.55, z + 0.49, 0, Math.PI, 0), '#ffffff');
}

export function buildLandmarks({ colliders }) {
  const kit = new Kit();
  const shrine = addShrine(kit, colliders);
  const lanterns = STONE_LANTERNS.map(([x, z], i) => addStoneLantern(kit, x, z, i, colliders));
  addBridge(kit, colliders);
  addSignpost(kit);
  const mats = villageMaterials();
  mats.bronze = painterly(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.35, metalness: 0.8 }), { rim: 0.5 });
  mats['sign:pond'] = painterly(new THREE.MeshStandardMaterial({ map: signTexture('Mirror Pond  →', { w: 256, h: 64 }), vertexColors: true, roughness: 0.8 }));
  mats['sign:shrine'] = painterly(new THREE.MeshStandardMaterial({ map: signTexture('↑ Windbell Shrine', { w: 256, h: 64 }), vertexColors: true, roughness: 0.8 }));
  // Each stone lantern's fire box: dark until lit.
  const fires = STONE_LANTERNS.map((_, i) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.9, emissive: new THREE.Color('#ff9a40'), emissiveIntensity: 0 });
    mats[`fire:${i}`] = m;
    return m;
  });
  const group = kit.build(mats);
  void ROAD;
  return { group, shrine, lanterns, fires, materials: mats };
}
