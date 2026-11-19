/**
 * Painted trees. A crown is a handful of round clumps, each a cloud of
 * leaf cards (a painted clump of leaves with soft edges); every card's
 * normal points out from the crown's centre, so the whole crown shades as
 * three or four broad masses of light and shade, the way a painter would
 * block it in, with leaf edges breaking the silhouette. Trunks are tapered,
 * gently crooked tubes with a few limbs. Kinds:
 *
 *   maple    broad rounded crowns over the vale
 *   pine     tiered dark cones on the ridges and the wood's edge
 *   blossom  pink-crowned trees in the village and by the shrine
 *   bush     low round shrubs (the berry bushes are these, with fruit)
 *
 * Each kind is a few grown variants drawn as instanced meshes, swaying in
 * the shared wind (Gloamreach's), with a depth material for their shadows.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addWind, windDepthMaterial } from '../gloamreach/materials.js';
import { rng } from '../gloamreach/noise.js';
import { painterly } from './paint.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** A painted clump of leaves: soft round strokes in light and dark, alpha at the edges. */
export function leafTexture(seed = 1, { kind = 'round' } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.translate(S / 2, S / 2);
  const n = kind === 'needle' ? 150 : 52;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * S * 0.36;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const v = 150 + r() * 105;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.save();
    g.translate(x, y);
    g.rotate(r() * Math.PI * 2);
    g.beginPath();
    if (kind === 'needle') g.ellipse(0, 0, S * 0.13, S * 0.035, 0, 0, Math.PI * 2);
    else if (kind === 'petal') g.ellipse(0, 0, S * 0.055, S * 0.045, 0, 0, Math.PI * 2);
    else g.ellipse(0, 0, S * 0.085, S * 0.05, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Bark, painted: long warm-grey strokes. */
function barkTexture(seed, base = '#6a5444') {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 128;
    const y = r() * 256;
    const l = 30 + r() * 80;
    const v = r() < 0.5 ? 'rgba(30,20,20,0.25)' : 'rgba(255,235,210,0.14)';
    g.strokeStyle = v;
    g.lineWidth = 2 + r() * 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 8, y + l);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export const KINDS = {
  maple: { leaf: 'round', colors: ['#3a6428', '#558634', '#7aa444', '#b0b856'], bark: '#5e4a3c', height: [9, 13], crown: [3.4, 4.8], clumps: [6, 8], cards: 26, card: 2.0 },
  blossom: { leaf: 'petal', colors: ['#d890aa', '#eeb2c4', '#f8cfd8', '#fff0f2'], bark: '#4a3a36', height: [5, 7], crown: [2.4, 3.4], clumps: [5, 7], cards: 22, card: 1.4 },
  pine: { leaf: 'needle', colors: ['#264230', '#30573a', '#427046', '#62844c'], bark: '#4a3a30', height: [10, 16], crown: [2.6, 3.6], tiers: [6, 8], cards: 16, card: 2.4 },
  bush: { leaf: 'round', colors: ['#3a6228', '#4e7a30', '#6a943a', '#8aa848'], bark: '#4a3a2a', height: [0.2, 0.3], crown: [0.9, 1.3], clumps: [2, 3], cards: 12, card: 1.0 }
};

/** A card (quad) at `p`, facing roughly `n`, size s; normals all set to `nrm` (the crown's outward direction). */
function card(out, p, n, s, nrm, col, wind, r) {
  const up = Math.abs(n.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const t = V().crossVectors(up, n).normalize().applyAxisAngle(n, r() * Math.PI * 2);
  const b = V().crossVectors(n, t).normalize();
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const base = out.pos.length / 3;
  for (const [u, v] of corners) {
    const q = p.clone().addScaledVector(t, u * s * 0.5).addScaledVector(b, v * s * 0.5);
    out.pos.push(q.x, q.y, q.z);
    out.nor.push(nrm.x, nrm.y, nrm.z);
    out.uv.push((u + 1) / 2, (v + 1) / 2);
    out.col.push(col.r, col.g, col.b);
    out.wind.push(wind[0], wind[1]);
  }
  out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** A tapered, crooked tube along points, radius r0 → r1. */
function tube(pts, r0, r1, seg = 7) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, Math.max(2, pts.length * 2), 1, seg, false);
  const pos = g.attributes.position;
  const n = g.attributes.normal;
  const steps = Math.max(2, pts.length * 2);
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / (seg + 1));
    const k = ring / steps;
    const c = curve.getPointAt(Math.min(1, k));
    const rad = r0 + (r1 - r0) * k;
    pos.setXYZ(i, c.x + n.getX(i) * rad, c.y + n.getY(i) * rad, c.z + n.getZ(i) * rad);
  }
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * (pts.at(-1).y - pts[0].y + 1) * 0.4);
  return g;
}

/** Grow one tree of a kind: { wood, leaves } geometries (base at the origin), its height and crown. */
export function growTree(kind, seed = 1) {
  const K = KINDS[kind];
  const r = rng(seed * 977 + kind.length);
  const H = K.height[0] + r() * (K.height[1] - K.height[0]);
  const leaves = { pos: [], nor: [], uv: [], col: [], wind: [], idx: [] };
  const wood = [];
  const pal = K.colors.map((c) => new THREE.Color(c));
  const shade = (k) => {
    // A value from shade (0) to light (1), between the palette's colours.
    const f = Math.max(0, Math.min(0.999, k)) * (pal.length - 1);
    const i = Math.floor(f);
    return pal[i].clone().lerp(pal[i + 1], f - i);
  };
  let crown = { c: V(0, H * 0.7, 0), r: 2 };
  if (kind === 'pine') {
    const trunk = [V(0, 0, 0), V((r() - 0.5) * 0.3, H * 0.5, (r() - 0.5) * 0.3), V(0, H, 0)];
    wood.push(tube(trunk, 0.32, 0.06));
    const tiers = K.tiers[0] + Math.floor(r() * (K.tiers[1] - K.tiers[0]));
    for (let t = 0; t < tiers; t++) {
      const k = t / (tiers - 1);
      const y = H * (0.28 + k * 0.68);
      const rad = K.crown[1] * (1 - k * 0.78) + 0.3;
      const n = Math.round(K.cards * (1 - k * 0.5));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.5;
        const d = rad * (0.45 + r() * 0.55);
        const p = V(Math.cos(a) * d, y - d * 0.35 + (r() - 0.5) * 0.4, Math.sin(a) * d);
        const out = V(Math.cos(a), 0.55 + k * 0.4, Math.sin(a)).normalize();
        const lit = 0.25 + k * 0.45 + (out.y - 0.5) * 0.3 + r() * 0.2;
        card(leaves, p, V(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize(), K.card * (1 - k * 0.35) * (0.8 + r() * 0.4), out, shade(lit), [r() * 6, 0.25 + k * 0.6], r);
      }
    }
    crown = { c: V(0, H * 0.6, 0), r: K.crown[1] };
  } else {
    // A crooked trunk and a few limbs into the crown.
    const lean = V((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
    const trunkTop = V(lean.x, H * 0.62, lean.z);
    const trunk = [V(0, 0, 0), V(lean.x * 0.3 + (r() - 0.5) * 0.2, H * 0.3, lean.z * 0.3 + (r() - 0.5) * 0.2), trunkTop];
    const R0 = kind === 'bush' ? 0.06 : 0.22 + H * 0.02;
    if (kind !== 'bush') wood.push(tube(trunk, R0, R0 * 0.55));
    const cr = K.crown[0] + r() * (K.crown[1] - K.crown[0]);
    const cc = kind === 'bush' ? V(0, cr * 0.6, 0) : V(trunkTop.x, H - cr * 0.85, trunkTop.z);
    crown = { c: cc, r: cr };
    const clumps = K.clumps[0] + Math.floor(r() * (K.clumps[1] - K.clumps[0] + 1));
    for (let k = 0; k < clumps; k++) {
      const a = (k / clumps) * Math.PI * 2 + r() * 0.8;
      const up = k === 0 ? 1 : r() * 0.8 - 0.15;
      const dir = V(Math.cos(a) * (1 - Math.abs(up)), up, Math.sin(a) * (1 - Math.abs(up))).normalize();
      const at = k === 0 ? cc.clone().add(V(0, cr * 0.35, 0)) : cc.clone().addScaledVector(dir, cr * (0.45 + r() * 0.25));
      const br = cr * (0.5 + r() * 0.2);
      if (kind !== 'bush' && k > 0) wood.push(tube([trunkTop.clone().lerp(cc, 0.3), trunkTop.clone().lerp(at, 0.6), at.clone().lerp(cc, 0.15)], R0 * 0.45, R0 * 0.15, 5));
      for (let i = 0; i < K.cards; i++) {
        // On and in the clump's sphere.
        const u = r() * 2 - 1;
        const t = r() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const on = V(s * Math.cos(t), u, s * Math.sin(t));
        const p = at.clone().addScaledVector(on, br * (0.55 + r() * 0.45));
        const out = p.clone().sub(cc).normalize().lerp(on, 0.35).normalize();
        // Light from the top and outside, shade underneath and inside: three or four painted values.
        const lit = 0.32 + out.y * 0.42 + (p.distanceTo(cc) / (cr * 1.5)) * 0.18 + (r() - 0.5) * 0.14;
        card(leaves, p, on.clone().lerp(out, 0.5).normalize(), K.card * (0.75 + r() * 0.5), out, shade(lit), [r() * 6, kind === 'bush' ? 0.3 : 0.5 + Math.max(0, p.y - cc.y + cr) / (cr * 2) * 0.6], r);
      }
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(leaves.pos, 3));
  lg.setAttribute('normal', new THREE.Float32BufferAttribute(leaves.nor, 3));
  lg.setAttribute('uv', new THREE.Float32BufferAttribute(leaves.uv, 2));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(leaves.col, 3));
  lg.setAttribute('aWind', new THREE.Float32BufferAttribute(leaves.wind, 2));
  lg.setIndex(leaves.idx);
  let wg = null;
  if (wood.length) {
    for (const g of wood) {
      g.deleteAttribute('normal');
      const n = g.attributes.position.count;
      g.setAttribute('aWind', new THREE.Float32BufferAttribute(new Float32Array(n * 2).map((_, i) => (i % 2 ? Math.max(0, g.attributes.position.getY(i >> 1) / H) * 0.15 : 0)), 2));
    }
    wg = mergeGeometries(wood.map((g) => g.toNonIndexed()), false);
    wg.computeVertexNormals();
  }
  return { wood: wg, leaves: lg, height: H, crown };
}

/** Materials for a kind: painted bark and the leaf cards (alpha-tested, swaying, lit through). */
function kindMaterials(kind, { msaa = true } = {}) {
  const K = KINDS[kind];
  const map = leafTexture(kind.length * 13 + 3, { kind: K.leaf });
  const leaves = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, vertexColors: true, alphaToCoverage: msaa });
  addWind(leaves, { flutter: kind === 'pine' ? 0.02 : 0.05 });
  painterly(leaves, { wrap: 0.75, rim: 0.3, shade: 0.25, trans: kind === 'blossom' ? 0.6 : 0.45 });
  const wood = new THREE.MeshStandardMaterial({ map: barkTexture(kind.length, K.bark), roughness: 0.95 });
  addWind(wood);
  painterly(wood, { wrap: 0.5, rim: 0.25 });
  return { leaves, wood, leafDepth: windDepthMaterial({ map, alphaTest: 0.45, flutter: 0.05 }), woodDepth: windDepthMaterial() };
}

/**
 * A field of trees: `list` [{ kind, x, z, s, seed }], `heightAt` to stand
 * them on the ground. Each kind's variants are instanced meshes.
 */
export class Trees {
  constructor(list, heightAt, { variants = 3, msaa = true } = {}) {
    this.group = new THREE.Group();
    this.mats = {};
    this.sets = [];
    const byKind = {};
    for (const t of list) (byKind[t.kind] ??= []).push(t);
    const tint = new THREE.Color();
    for (const [kind, items] of Object.entries(byKind)) {
      const mats = (this.mats[kind] = kindMaterials(kind, { msaa }));
      const vars = Array.from({ length: variants }, (_, v) => growTree(kind, 100 + v * 31));
      vars.forEach((g, v) => {
        const mine = items.filter((t, i) => (t.variant ?? i) % variants === v);
        if (!mine.length) return;
        const mk = (geo, mat, depth, shadow) => {
          const m = new THREE.InstancedMesh(geo, mat, mine.length);
          m.customDepthMaterial = depth;
          m.castShadow = shadow;
          m.receiveShadow = true;
          m.frustumCulled = false;
          this.group.add(m);
          return m;
        };
        // Two sets per variant: the near trees cast shadows, the far ones don't (the shadow box is near).
        const near = [mk(g.leaves, mats.leaves, mats.leafDepth, true), g.wood ? mk(g.wood, mats.wood, mats.woodDepth, true) : null];
        const far = [mk(g.leaves, mats.leaves, mats.leafDepth, false), g.wood ? mk(g.wood, mats.wood, mats.woodDepth, false) : null];
        const its = mine.map((t, i) => {
          const m = new THREE.Matrix4().compose(V(t.x, heightAt(t.x, t.z) - 0.15, t.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ((t.seed ?? i) % 628) / 100), V(t.s, t.s * (0.9 + ((t.seed ?? i) % 20) / 100), t.s));
          // Each tree a little warmer or cooler, lighter or darker.
          const h = ((t.seed ?? i) * 0.6180339) % 1;
          const color = tint.setRGB(0.88 + h * 0.22, 0.9 + ((h * 7) % 1) * 0.18, 0.86 + ((h * 13) % 1) * 0.16).clone();
          return { t, m, color, y: m.elements[13], r: Math.max(g.height * t.s * 0.6, 3) };
        });
        // Until the first update: every tree, near set.
        its.forEach((it, i) => {
          near[0].setMatrixAt(i, it.m);
          near[1]?.setMatrixAt(i, it.m);
          near[0].setColorAt(i, it.color);
        });
        near[0].instanceColor.needsUpdate = true;
        far[0].setColorAt(0, tint);
        for (const m of far) if (m) m.count = 0;
        for (const t of mine) t.height = g.height * t.s;
        this.sets.push({ its, near, far, height: g.height });
      });
    }
    this._frame = 0;
    this._frustum = new THREE.Frustum();
    this._pm = new THREE.Matrix4();
    this._sphere = new THREE.Sphere();
  }

  /**
   * Re-sort the trees for this camera (every few frames): out of view and not
   * shadowing into it — not drawn; past `far` — not drawn; within `shadowDist`
   * of the focus — the shadow-casting set; the rest the far set.
   */
  update(camera, focus, { far = Infinity, shadowDist = 60 } = {}) {
    if (this._frame++ % 4) return;
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pm);
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const set of this.sets) {
      let nn = 0;
      let nf = 0;
      for (const it of set.its) {
        const d = Math.hypot(it.t.x - cx, it.t.z - cz);
        if (d > far + it.r) continue;
        const fd = Math.hypot(it.t.x - focus.x, it.t.z - focus.z);
        this._sphere.center.set(it.t.x, it.y + it.r * 0.6, it.t.z);
        this._sphere.radius = it.r;
        const inView = this._frustum.intersectsSphere(this._sphere);
        if (fd < shadowDist) {
          set.near[0].setMatrixAt(nn, it.m);
          set.near[1]?.setMatrixAt(nn, it.m);
          set.near[0].setColorAt(nn, it.color);
          nn++;
        } else if (inView) {
          set.far[0].setMatrixAt(nf, it.m);
          set.far[1]?.setMatrixAt(nf, it.m);
          set.far[0].setColorAt(nf, it.color);
          nf++;
        }
      }
      for (const [list, n] of [[set.near, nn], [set.far, nf]]) {
        for (const m of list) {
          if (!m) continue;
          m.count = n;
          m.instanceMatrix.needsUpdate = true;
        }
        if (list[0].instanceColor) list[0].instanceColor.needsUpdate = true;
      }
    }
  }

  dispose() {
    const seen = new Set();
    this.group.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
    });
    for (const m of Object.values(this.mats)) for (const x of Object.values(m)) x.dispose?.();
  }
}
