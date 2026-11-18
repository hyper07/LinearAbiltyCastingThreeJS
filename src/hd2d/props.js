/**
 * Props every realm shares: the waystone (the portal between realms), loot
 * chests that open, and chunked instancing — big flora sets split into
 * spatial chunks, each its own InstancedMesh, so the camera culls whole
 * chunks, far ones switch to a cheap model (LOD) or hide, and only chunks
 * near the hero cast shadows. That is what keeps the larger maps at 60 fps.
 */
import * as THREE from 'three';

/* ------------------------------------------------------------- chunks */

/**
 * Instances split into square chunks of `size` metres.
 * items: [{ x, z, rot, s, sy?, color? }]; `lod`: a cheaper geometry for far chunks.
 */
export class ChunkedInstances {
  constructor(scene, geometry, material, items, { size = 32, lod = null, lodDist = 60, castShadow = true, receiveShadow = true, colors = true } = {}) {
    this.chunks = [];
    this.castShadow = castShadow;
    this.lodDist = lodDist;
    const groups = new Map();
    for (const it of items) {
      const key = `${Math.floor(it.x / size)},${Math.floor(it.z / size)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    for (const list of groups.values()) {
      const make = (geo) => {
        const mesh = new THREE.InstancedMesh(geo, material, list.length);
        list.forEach((it, i) => {
          q.setFromAxisAngle(up, it.rot ?? 0);
          m4.compose(pos.set(it.x, it.y ?? 0, it.z), q, sc.set(it.s * (it.sx ?? 1), it.s * (it.sy ?? 1), it.s * (it.sz ?? 1)));
          mesh.setMatrixAt(i, m4);
          if (colors && it.color) mesh.setColorAt(i, col.set(it.color));
        });
        mesh.computeBoundingSphere();
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        scene.add(mesh);
        return mesh;
      };
      const near = make(geometry);
      const far = lod ? make(lod) : null;
      if (far) far.castShadow = false;
      const c = near.boundingSphere;
      this.chunks.push({ near, far, x: c.center.x, z: c.center.z, r: c.radius });
    }
  }

  /** Each frame (or a few times a second): show near chunks in full, far ones cheap, hide beyond `far`. */
  update(x, z, far = 110, shadowNear = 40) {
    for (const c of this.chunks) {
      const d = Math.hypot(c.x - x, c.z - z) - c.r;
      const show = d < far;
      const lod = c.far && d > this.lodDist;
      c.near.visible = show && !lod;
      if (c.far) c.far.visible = show && lod;
      c.near.castShadow = this.castShadow && d < shadowNear;
    }
  }

  dispose() {
    for (const c of this.chunks) {
      c.near.dispose();
      c.near.removeFromParent();
      c.far?.dispose();
      c.far?.removeFromParent();
    }
  }
}

/* ----------------------------------------------------------- waystone */

/**
 * A waystone: a ring of standing stones round a carved obelisk with glowing
 * runes, a crystal turning over it and a portal ring on the ground. `tint`
 * the glow colour. Returns { group, update(dt, t, on), dispose, light }.
 */
export function buildWaystone({ x, z, tint = '#7ae8ff', stone = '#6a6878' }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const own = [];
  const mat = new THREE.MeshLambertMaterial({ color: stone, flatShading: true });
  const runeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(2) });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(1.6), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  own.push(mat, runeMat, glowMat);
  const add = (geo, m, px, py, pz, ry = 0) => {
    own.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = ry;
    mesh.castShadow = mesh.receiveShadow = m === mat;
    group.add(mesh);
    return mesh;
  };
  // The obelisk: three tapering blocks and runes down its faces.
  add(new THREE.BoxGeometry(1.4, 0.4, 1.4), mat, 0, 0.2, 0);
  add(new THREE.CylinderGeometry(0.42, 0.62, 2.6, 4), mat, 0, 1.7, 0, Math.PI / 4);
  add(new THREE.CylinderGeometry(0.0, 0.42, 0.6, 4), mat, 0, 3.3, 0, Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    add(new THREE.BoxGeometry(0.12, 1.5, 0.04), runeMat, Math.sin(a) * 0.5, 1.6, Math.cos(a) * 0.5, a);
  }
  // Six standing stones in a ring.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const h = 1.1 + (i % 3) * 0.35;
    add(new THREE.BoxGeometry(0.55, h, 0.4), mat, Math.cos(a) * 4.2, h / 2, Math.sin(a) * 4.2, -a);
    add(new THREE.BoxGeometry(0.1, 0.3, 0.03), runeMat, Math.cos(a) * 3.98, h * 0.6, Math.sin(a) * 3.98, -a + Math.PI / 2);
  }
  // The portal ring on the ground, and the crystal.
  const ring = add(new THREE.RingGeometry(2.4, 3.1, 48).rotateX(-Math.PI / 2), glowMat, 0, 0.06, 0);
  const crystal = add(new THREE.OctahedronGeometry(0.42, 0), runeMat, 0, 4.4, 0);
  const light = new THREE.PointLight(tint, 0, 14, 1.6);
  light.position.set(0, 3.5, 0);
  group.add(light);
  return {
    group,
    light,
    update(dt, t, on = true) {
      crystal.rotation.y += dt * 1.2;
      crystal.position.y = 4.4 + Math.sin(t * 1.6) * 0.18;
      ring.rotation.y += dt * 0.3;
      glowMat.opacity = on ? 0.45 + 0.25 * Math.sin(t * 2.4) : 0.12;
      runeMat.color.set(tint).multiplyScalar(on ? 2 + Math.sin(t * 3) * 0.4 : 0.4);
      light.intensity = on ? 12 + Math.sin(t * 2.4) * 3 : 2;
    },
    dispose() {
      for (const o of own) o.dispose();
      group.removeFromParent();
    }
  };
}

/* -------------------------------------------------------------- chests */

/** A chest with a lid that opens. Returns { group, open(), update(dt), opened }. */
export function buildChest({ x, z, rot = 0, wood = '#7a4a2a', metal = '#d8a83a' }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const own = [];
  const woodMat = new THREE.MeshLambertMaterial({ color: wood, flatShading: true });
  const metalMat = new THREE.MeshLambertMaterial({ color: metal, emissive: new THREE.Color(metal).multiplyScalar(0.25) });
  own.push(woodMat, metalMat);
  const box = (w, h, d, px, py, pz, m, parent = group) => {
    const g = new THREE.BoxGeometry(w, h, d);
    own.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(px, py, pz);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  box(1.0, 0.5, 0.66, 0, 0.25, 0, woodMat);
  box(1.04, 0.08, 0.7, 0, 0.42, 0, metalMat);
  box(0.08, 0.5, 0.7, -0.36, 0.25, 0, metalMat);
  box(0.08, 0.5, 0.7, 0.36, 0.25, 0, metalMat);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.5, -0.33);
  group.add(hinge);
  box(1.0, 0.24, 0.66, 0, 0.12, 0.33, woodMat, hinge);
  box(1.04, 0.06, 0.7, 0, 0.26, 0.33, metalMat, hinge);
  box(0.16, 0.16, 0.06, 0, 0.04, 0.68, metalMat, hinge);
  let openK = 0;
  const chest = {
    group,
    opened: false,
    open() {
      chest.opened = true;
    },
    update(dt) {
      openK = Math.min(1, openK + (chest.opened ? dt * 3 : -openK));
      hinge.rotation.x = -openK * 1.9;
      metalMat.emissive.set(metal).multiplyScalar(chest.opened ? 0.05 : 0.25 + 0.15 * Math.sin(performance.now() / 300));
    },
    dispose() {
      for (const o of own) o.dispose();
      group.removeFromParent();
    }
  };
  if (chest.opened) hinge.rotation.x = -1.9;
  return chest;
}

/* ------------------------------------------------------------ beams */

let beamTex = null;
/** A soft vertical gradient for loot beams. */
function beamTexture() {
  if (beamTex) return beamTex;
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 128);
  const h = g.createLinearGradient(0, 0, 16, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)');
  h.addColorStop(0.5, 'rgba(0,0,0,0)');
  h.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = h;
  g.fillRect(0, 0, 16, 128);
  beamTex = new THREE.CanvasTexture(c);
  return beamTex;
}
const BEAM_GEO = new THREE.PlaneGeometry(0.5, 6).translate(0, 3, 0);

/** A beam of light over a good drop, in its rarity's colour (two crossed planes). */
export function lootBeam(color, height = 1) {
  const mat = new THREE.MeshBasicMaterial({ map: beamTexture(), color: new THREE.Color(color).multiplyScalar(1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const a = new THREE.Mesh(BEAM_GEO, mat);
  const b = new THREE.Mesh(BEAM_GEO, mat);
  b.rotation.y = Math.PI / 2;
  g.add(a, b);
  g.scale.set(1, height, 1);
  g.renderOrder = 6;
  return { group: g, material: mat, dispose: () => { mat.dispose(); g.removeFromParent(); } };
}
