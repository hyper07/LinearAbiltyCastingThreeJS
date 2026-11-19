/**
 * Lantern Camp, where the hunt starts: a ridge tent of weathered canvas on
 * its poles and guy ropes, a tarp over the map table, the supply box (iron
 * bound, its lid propped), a fire in a ring of stones, bedrolls, crates and
 * barrels, the guild's banner, lanterns, and a hitching post for the mount.
 * The canvas and the banner move in the wind.
 */
import * as THREE from 'three';
import { Kit, tf } from '../gloamreach/kit.js';
import { addWind } from '../gloamreach/materials.js';
import { rng } from '../gloamreach/noise.js';
import { CAMP } from './map.js';
import { groundAt } from './heights.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Weathered canvas: off-white, stained toward the hem, a darned patch or two. */
function canvasTexture(seed = 3, base = '#cdbf9e') {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const weave = 0.92 + ((x % 3 === 0) ^ (y % 3 === 0) ? 0.05 : 0) + (r() - 0.5) * 0.06;
      const stain = 1 - Math.pow(y / S, 3) * 0.35;
      img.data[i] *= weave * stain;
      img.data[i + 1] *= weave * stain;
      img.data[i + 2] *= weave * stain * 0.96;
    }
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.25;
  for (let k = 0; k < 14; k++) {
    g.fillStyle = r() < 0.5 ? '#6a5a3a' : '#4a5a3a';
    g.beginPath();
    g.ellipse(r() * S, S * (0.5 + r() * 0.5), 20 + r() * 60, 10 + r() * 30, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(70,55,35,0.6)';
  g.lineWidth = 2;
  g.setLineDash([6, 5]);
  for (let k = 0; k < 2; k++) {
    const x = r() * S * 0.7;
    const y = r() * S * 0.6;
    g.fillStyle = '#a89070';
    g.fillRect(x, y, 70, 50);
    g.strokeRect(x + 3, y + 3, 64, 44);
  }
  g.setLineDash([]);
  // Seams.
  g.strokeStyle = 'rgba(90,75,50,0.5)';
  for (let x = 0; x < S; x += 128) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, S);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** The guild's banner: a horned skull over crossed blade and bow, on deep green. */
function bannerTexture() {
  const W = 256;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1e4a32';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#c8a24a';
  g.fillRect(0, 0, W, 18);
  g.fillRect(0, H - 60, W, 10);
  // Swallowtail.
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(W / 2, H - 70);
  g.lineTo(0, H);
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.save();
  g.translate(W / 2, 200);
  g.strokeStyle = '#e8d8a8';
  g.fillStyle = '#e8d8a8';
  g.lineWidth = 10;
  g.lineCap = 'round';
  // Crossed blade and bow.
  g.beginPath();
  g.moveTo(-80, 90);
  g.lineTo(80, -90);
  g.stroke();
  g.beginPath();
  g.arc(-20, 0, 110, -0.9, 0.9);
  g.stroke();
  // The skull, horns sweeping up.
  g.beginPath();
  g.ellipse(0, 10, 40, 48, 0, 0, Math.PI * 2);
  g.fill();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 30, -20);
    g.quadraticCurveTo(s * 90, -40, s * 70, -110);
    g.lineWidth = 14;
    g.stroke();
  }
  g.fillStyle = '#1e4a32';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * 16, 4, 10, 13, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A sagging cloth sheet between four corners (a, b along the top edge; c, d the bottom), with wind weights. */
function cloth(a, b, c, d, { segs = 10, sag = 0.12, uvScale = 1, flex = 0.15 }) {
  const g = new THREE.PlaneGeometry(1, 1, segs, segs);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  const w = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i);
    const v = 1 - uv.getY(i);
    const top = a.clone().lerp(b, u);
    const bot = d.clone().lerp(c, u);
    const q = top.lerp(bot, v);
    q.y -= Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * sag;
    p.setXYZ(i, q.x, q.y, q.z);
    uv.setXY(i, u * a.distanceTo(b) * uvScale, v * a.distanceTo(d) * uvScale);
    w[i * 2] = u * 3;
    w[i * 2 + 1] = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * flex;
  }
  g.computeVertexNormals();
  g.setAttribute('aWind', new THREE.BufferAttribute(w, 2));
  return g;
}

export async function buildCamp(world, { bank }) {
  const scene = world.scene;
  const [wood, planks] = await Promise.all([bank.ambient('WoodFloor041', { fallback: '#6a5a48' }), bank.ambient('Planks037A', { fallback: '#7a6040' })]);
  const std = (set, extra = {}) => new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.arm, vertexColors: true, roughness: 1, ...extra });
  const mats = {
    wood: std(wood),
    planks: std(planks),
    iron: new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.45, metalness: 0.8, vertexColors: true }),
    rope: new THREE.MeshStandardMaterial({ color: 0x9a8a62, roughness: 1, vertexColors: true }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6a6a64, roughness: 0.85, vertexColors: true }),
    char: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1, vertexColors: true }),
    roll: new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.95, vertexColors: true }),
    roll2: new THREE.MeshStandardMaterial({ color: 0x2e4a5a, roughness: 0.95, vertexColors: true })
  };
  const kit = new Kit();
  const c = CAMP;
  const at = (lx, lz) => {
    const x = c.x + lx * Math.cos(c.face) + lz * Math.sin(c.face);
    const z = c.z - lx * Math.sin(c.face) + lz * Math.cos(c.face);
    return V(x, groundAt(x, z), z);
  };
  const y0 = groundAt(c.x, c.z);
  const spots = {};

  /* -- the tent: a ridge tent, its door toward the fire -- */
  const tent = at(-6, -4);
  const tentYaw = c.face + 0.35;
  const T = new THREE.Matrix4().compose(tent, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tentYaw, 0)), V(1, 1, 1));
  const L = 4.4;
  const Wd = 3.6;
  const Hh = 2.4;
  for (const s of [-1, 1]) kit.beam('wood', V(0, 0, s * L / 2).applyMatrix4(T), V(0, Hh + 0.15, s * L / 2).applyMatrix4(T), 0.09, '#ffffff', 1);
  kit.beam('wood', V(0, Hh, -L / 2 - 0.3).applyMatrix4(T), V(0, Hh, L / 2 + 0.3).applyMatrix4(T), 0.08, '#ffffff', 1);
  const canvasMat = addWind(new THREE.MeshStandardMaterial({ map: canvasTexture(3), roughness: 0.95, side: THREE.DoubleSide }));
  const sheets = [];
  for (const s of [-1, 1]) {
    const a = V(0, Hh, -L / 2 - 0.2).applyMatrix4(T);
    const b = V(0, Hh, L / 2 + 0.2).applyMatrix4(T);
    const cc = V(s * Wd / 2, 0.05, L / 2 + 0.3).applyMatrix4(T);
    const dd = V(s * Wd / 2, 0.05, -L / 2 - 0.3).applyMatrix4(T);
    sheets.push(cloth(a, b, cc, dd, { sag: 0.18, uvScale: 0.35, flex: 0.12 }));
  }
  // The back wall, a triangle of canvas.
  {
    const g = new THREE.BufferGeometry().setFromPoints([V(-Wd / 2, 0.05, -L / 2), V(Wd / 2, 0.05, -L / 2), V(0, Hh, -L / 2)].map((v) => v.applyMatrix4(T)));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    g.setAttribute('aWind', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2));
    g.computeVertexNormals();
    sheets.push(g);
  }
  // Door flaps, tied back.
  for (const s of [-1, 1]) {
    const a = V(0, Hh, L / 2 + 0.2).applyMatrix4(T);
    const b = V(s * 0.5, Hh * 0.55, L / 2 + 0.35).applyMatrix4(T);
    const cc = V(s * Wd / 2, 0.05, L / 2 + 0.3).applyMatrix4(T);
    const dd = V(s * 0.25, 0.05, L / 2 + 0.25).applyMatrix4(T);
    sheets.push(cloth(a, b, cc, dd, { segs: 6, sag: 0.05, uvScale: 0.35, flex: 0.2 }));
  }
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  for (const g of sheets) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'aWind'].includes(k)) g.deleteAttribute(k);
  const tentMesh = new THREE.Mesh(mergeGeometries(sheets.map((g) => (g.index ? g.toNonIndexed() : g)), false), canvasMat);
  tentMesh.castShadow = true;
  tentMesh.receiveShadow = true;
  scene.add(tentMesh);
  world.roofs = [...(world.roofs ?? []), tentMesh];
  // Guy ropes to pegs.
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    const top = V(0, Hh + 0.1, e * (L / 2 + 0.3)).applyMatrix4(T);
    const peg = V(s * 1.6, 0, e * (L / 2 + 1.8)).applyMatrix4(T);
    peg.y = groundAt(peg.x, peg.z);
    kit.beam('rope', top, peg, 0.025, '#ffffff', 1);
    kit.beam('wood', peg.clone().add(V(0, -0.1, 0)), peg.clone().add(V(0, 0.3, 0)), 0.05, '#ffffff', 1);
  }
  world.colliders.box(tent.x, tent.z, Wd / 2 + 0.1, L / 2 + 0.3, tentYaw, -50, Hh + 0.3);
  // Bedrolls inside and out.
  for (const [lx, lz, m] of [[-0.6, 0.2, 'roll'], [0.7, -0.4, 'roll2']]) {
    const g = new THREE.CylinderGeometry(0.22, 0.22, 1.9, 12);
    g.rotateX(Math.PI / 2);
    kit.add(m, g, new THREE.Matrix4().compose(V(lx, 0.22, lz).applyMatrix4(T), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tentYaw, 0)), V(1, 1, 1)), '#ffffff');
  }

  /* -- the fire -- */
  const fire = at(0, 2);
  spots.fire = fire.clone().add(V(0, 0.25, 0));
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    const g = new THREE.DodecahedronGeometry(0.22, 0);
    kit.add('stone', g, new THREE.Matrix4().compose(V(fire.x + Math.cos(a) * 0.85, fire.y + 0.08, fire.z + Math.sin(a) * 0.85), new THREE.Quaternion().setFromEuler(new THREE.Euler(a, a * 2, 0)), V(1.2, 0.8, 1)), '#ffffff');
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    kit.beam('char', V(fire.x + Math.cos(a) * 0.55, fire.y + 0.05, fire.z + Math.sin(a) * 0.55), V(fire.x + Math.cos(a) * 0.05, fire.y + 0.45, fire.z + Math.sin(a) * 0.05), 0.11, '#ffffff', 1);
  }
  // A spit over it, a pot hanging.
  for (const s of [-1, 1]) kit.beam('wood', at(s * 1.1, 2), at(s * 1.1, 2).add(V(0, 1.3, 0)), 0.06, '#ffffff', 1);
  kit.beam('wood', at(-1.2, 2).add(V(0, 1.25, 0)), at(1.2, 2).add(V(0, 1.25, 0)), 0.045, '#ffffff', 1);
  kit.cyl('iron', 0.22, 0.26, 0.32, tf(fire.x, fire.y + 0.72, fire.z), '#ffffff', 12);
  world.colliders.circle(fire.x, fire.z, 1.0, -50, 0.6);

  /* -- the supply box -- */
  const box = at(4.2, -2.5);
  const boxYaw = c.face - 0.5;
  const B = new THREE.Matrix4().compose(box, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, boxYaw, 0)), V(1, 1, 1));
  kit.box('planks', 1.3, 0.7, 0.85, B, '#c8b090', 0.6);
  for (const s of [-0.45, 0, 0.45]) kit.box('iron', 0.08, 0.72, 0.88, B.clone().multiply(new THREE.Matrix4().makeTranslation(s, 0, 0)), '#ffffff', 1);
  // The lid, propped open.
  const lid = B.clone().multiply(new THREE.Matrix4().compose(V(0, 0.7, -0.42), new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25, 0, 0)), V(1, 1, 1)));
  kit.box('planks', 1.32, 0.12, 0.85, lid.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.42)), '#c8b090', 0.6);
  // What's inside: rolls of bandage, flasks.
  for (let k = 0; k < 4; k++) kit.cyl(k % 2 ? 'roll' : 'rope', 0.07, 0.07, 0.22, B.clone().multiply(new THREE.Matrix4().makeTranslation(-0.4 + k * 0.26, 0.55, 0.05)), '#ffffff', 8);
  spots.supply = box.clone();
  world.colliders.box(box.x, box.z, 0.7, 0.5, boxYaw, -50, 0.8);

  /* -- the map table under a tarp -- */
  const tbl = at(5, 4);
  kit.box('planks', 2.0, 0.08, 1.1, tf(tbl.x, tbl.y + 0.85, tbl.z, 0, c.face + 0.2, 0), '#d8c0a0', 0.6);
  for (const [dx, dz] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]]) {
    const p = V(dx, 0, dz).applyAxisAngle(V(0, 1, 0), c.face + 0.2).add(tbl);
    kit.beam('wood', p, p.clone().add(V(0, 0.85, 0)), 0.07, '#ffffff', 1);
  }
  const tarp = [];
  const corners = [[-1.8, -1.4, 2.6], [1.8, -1.4, 2.6], [1.8, 1.4, 2.0], [-1.8, 1.4, 2.0]].map(([dx, dz, h]) => V(dx, h, dz).applyAxisAngle(V(0, 1, 0), c.face + 0.2).add(tbl));
  for (const p of corners) kit.beam('wood', V(p.x, groundAt(p.x, p.z), p.z), p, 0.07, '#ffffff', 1);
  tarp.push(cloth(corners[0], corners[1], corners[2], corners[3], { sag: 0.25, uvScale: 0.3, flex: 0.25 }));
  const tarpMat = addWind(new THREE.MeshStandardMaterial({ map: canvasTexture(7, '#8a7a52'), roughness: 0.95, side: THREE.DoubleSide }));
  const tarpMesh = new THREE.Mesh(tarp[0], tarpMat);
  tarpMesh.castShadow = true;
  tarpMesh.receiveShadow = true;
  scene.add(tarpMesh);
  world.roofs.push(tarpMesh);
  world.colliders.box(tbl.x, tbl.z, 1.05, 0.6, c.face + 0.2, -50, 1);

  /* -- the banner and the hitching post -- */
  const bp = at(-2.5, 6.5);
  kit.beam('wood', bp.clone().add(V(0, -0.3, 0)), bp.clone().add(V(0, 6.2, 0)), 0.12, '#ffffff', 1);
  kit.beam('wood', bp.clone().add(V(-0.05, 6.0, 0)), bp.clone().add(V(1.5, 6.0, 0)), 0.07, '#ffffff', 1);
  const banner = cloth(bp.clone().add(V(0.05, 5.95, 0)), bp.clone().add(V(1.45, 5.95, 0)), bp.clone().add(V(1.45, 3.1, 0)), bp.clone().add(V(0.05, 3.1, 0)), { segs: 12, sag: 0, uvScale: 1, flex: 0.5 });
  {
    const uv = banner.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.4, 1 - uv.getY(i) / 2.85);
    // Weight: free toward the fly and the foot.
    const p = banner.attributes.position;
    const w = banner.attributes.aWind;
    for (let i = 0; i < p.count; i++) w.setY(i, Math.pow(Math.min(1, (p.getX(i) - bp.x) / 1.4), 1.2) * 0.6 + (bp.y + 6 - p.getY(i)) * 0.08);
  }
  const bannerMesh = new THREE.Mesh(banner, addWind(new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5 }), { flutter: 0.03 }));
  bannerMesh.castShadow = true;
  scene.add(bannerMesh);
  world.colliders.circle(bp.x, bp.z, 0.2, -50, 6);
  const post = at(8, 6);
  for (const s of [-1, 1]) kit.beam('wood', post.clone().add(V(s * 1.0, -0.3, 0)), post.clone().add(V(s * 1.0, 1.1, 0)), 0.12, '#ffffff', 1);
  kit.beam('wood', post.clone().add(V(-1.15, 1.0, 0)), post.clone().add(V(1.15, 1.0, 0)), 0.1, '#ffffff', 1);
  spots.hitch = post.clone().add(V(0, 0, 2.2));
  for (const s of [-1, 1]) world.colliders.circle(post.x + s, post.z, 0.15, -50, 1.2);

  const group = kit.build(mats);
  scene.add(group);

  // Photographed clutter: crates, barrels, a basket, lanterns.
  const props = world.props;
  const place = (id, list, opts) => props.place(id, list, opts);
  const glass = (m) => {
    if (/glass/i.test(m.name)) {
      m.emissive = new THREE.Color('#ffb060');
      m.emissiveIntensity = 3;
    }
  };
  const crates = [at(-3.2, 0.5), at(-3.8, 1.4), at(6.4, -2.8)];
  const barrels = [at(-4.4, -0.6), at(7.2, -1.6)];
  const lanterns = [at(-1.6, 0.4).add(V(0, 0, 0)), at(5, 4).add(V(0, 0.93, 0))];
  spots.lanterns = lanterns.map((p) => p.clone().add(V(0, 0.4, 0)));
  await Promise.all([
    place('wooden_crate_01', crates.map((p, i) => tf(p.x, p.y + (i === 1 ? 0.35 : 0), p.z, 0, i * 0.7, 0, 1.4, 1.4, 1.4))),
    place('wine_barrel_01', barrels.map((p, i) => tf(p.x, p.y, p.z, 0, i, 0))),
    place('wicker_basket_01', [tf(...at(4.2, -1.3).toArray(), 0, 1, 0, 1.2, 1.2, 1.2)]),
    place('wooden_lantern_01', lanterns.map((p) => tf(p.x, p.y, p.z, 0, 0, 0, 1.1, 1.1, 1.1)), { onMaterial: glass })
  ]);
  for (const p of [...crates, ...barrels]) world.colliders.circle(p.x, p.z, 0.45, -50, 1.2);
  world.spots.camp = spots;
  world.disposers.push(() => {
    group.traverse((o) => o.geometry?.dispose());
    tentMesh.geometry.dispose();
    tarpMesh.geometry.dispose();
    bannerMesh.geometry.dispose();
  });
  void y0;
}
