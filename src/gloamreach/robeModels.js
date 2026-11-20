/**
 * Gloamreach's robes, made in code (folk.js robeStyle says which make; this
 * builds it in three.js for folkModels.js):
 *
 *  - a body from the neck to the ankles, fitted round the outfit it covers
 *    (measured from the outfit's own vertices, then hanging straight from the
 *    chest and shoulder blades the way cloth does, cinched at the sash and
 *    belling out to the hem), with folds that deepen toward the hem and a
 *    hem that isn't quite even;
 *  - bell, angel or fitted sleeves round the arms, lined inside;
 *  - embroidered bands (the atlas's trim rows, matte or metal thread) at the
 *    hem, the cuffs, the collar or V-neck and the front opening; the
 *    under-robe at the V and in the front split; a sash with hanging ends; a
 *    stole, a mantle or a scapular; a cowl lying on the shoulders;
 *  - skinned like the clothes it covers (each point takes the weights of the
 *    nearest points of the outfit), the skirt on two bones of its own
 *    (RobeLap, RobeHem: Actor.robeSway turns them), and the sleeves' wide ends
 *    marked (aHang) for the shader to hang them under the arm.
 *
 * Everything is one geometry on the person's atlas material (one draw).
 */
import * as THREE from 'three';
import { skirtWeights, robeKit, cloakKit, trimRow, CLOTH_WEAVE, EMBLEM, TRIM_ROWS, TRIM_MOTIFS, ROBE_PATTERNS, stream, shadeHex, isMetalTrim } from './folk.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const lerp = (a, b, k) => a + (b - a) * k;

/* ------------------------------------------------------------------ skin weights */

/** Merge [[bone, w]…] lists, keep the strongest four, sum to 1. */
function top4(list) {
  const m = new Map();
  for (const [b, w] of list) if (w > 0) m.set(b, (m.get(b) ?? 0) + w);
  const out = [...m].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const s = out.reduce((a, x) => a + x[1], 0) || 1;
  return out.map(([b, w]) => [b, w / s]);
}
const blendW = (a, b, k) => top4([...a.map(([i, w]) => [i, w * (1 - k)]), ...b.map(([i, w]) => [i, w * k])]);

const ARM = /upperarm|lowerarm|hand|thumb|index|middle|ring|pinky/;
const FINGER = /thumb|index|middle|ring|pinky/;
const LEG = /thigh|calf|foot|ball/;
const HEAD = /^(Head|head|neck_01|neck_02)$/;

/**
 * The outfit's vertices (bind space) with their weights and what carries
 * them (torso, arm, leg, head), binned by height for nearest searches.
 */
class Sources {
  constructor(list, bones) {
    this.p = [];
    this.w = [];
    this.kind = [];
    this.side = [];
    this.part = [];
    this.bins = new Map();
    for (const { geo, part } of list) {
      const pos = geo.attributes.position;
      const si = geo.attributes.skinIndex;
      const sw = geo.attributes.skinWeight;
      // Only vertices the garment's triangles use (the head's cut body keeps all its vertices).
      const used = new Uint8Array(pos.count);
      const idx = geo.index?.array;
      if (idx) for (const i of idx) used[i] = 1;
      else used.fill(1);
      for (let i = 0; i < pos.count; i++) {
        if (!used[i]) continue;
        const w = [];
        for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0.01) w.push([si.getComponent(i, k), sw.getComponent(i, k)]);
        const ws = top4(w);
        const dom = bones[ws[0]?.[0] ?? 0]?.name ?? '';
        // Bare skin (the male outfit's forearms and hands are the body's) is sorted by what carries it, like cloth.
        const kind = ARM.test(dom) ? (FINGER.test(dom) ? 'finger' : 'arm') : LEG.test(dom) ? 'leg' : HEAD.test(dom) ? 'head' : part === 'body' ? 'skin' : 'torso';
        const n = this.p.length;
        const p = V(pos.getX(i), pos.getY(i), pos.getZ(i));
        this.p.push(p);
        this.w.push(ws);
        this.kind.push(kind);
        this.side.push(Math.sign(p.x));
        this.part.push(part);
        const b = Math.floor(p.y / 0.02);
        if (!this.bins.has(b)) this.bins.set(b, []);
        this.bins.get(b).push(n);
      }
    }
  }

  /** Vertices in a height band (filtered). */
  band(y0, y1, keep) {
    const out = [];
    for (let b = Math.floor(y0 / 0.02); b <= Math.floor(y1 / 0.02); b++) for (const i of this.bins.get(b) ?? []) if (this.p[i].y >= y0 && this.p[i].y <= y1 && keep(i)) out.push(i);
    return out;
  }

  /** Weights at a point: its `k` nearest vertices', by inverse distance. */
  weights(p, keep = () => true, k = 4) {
    let best = [];
    for (let reach = 2; reach < 60 && best.length < k; reach *= 2) {
      best = [];
      const b0 = Math.floor(p.y / 0.02);
      for (let b = b0 - reach; b <= b0 + reach; b++) {
        for (const i of this.bins.get(b) ?? []) {
          if (!keep(i)) continue;
          const d = this.p[i].distanceToSquared(p);
          if (best.length < k) best.push([i, d]);
          else if (d < best[k - 1][1]) best[k - 1] = [i, d];
          else continue;
          best.sort((a, c) => a[1] - c[1]);
        }
      }
    }
    if (!best.length) return null;
    return top4(best.flatMap(([i, d]) => this.w[i].map(([bone, w]) => [bone, w / (Math.sqrt(d) + 0.004)])));
  }
}

/* ------------------------------------------------------------------ surfaces */

/**
 * A grid of points on a garment: rows down (or along), cols round. Each node
 * has a position, normal (outward), weights and hang; `sample(fr, fc)` reads
 * between them.
 */
class Grid {
  constructor(rows, cols, wrap) {
    Object.assign(this, { rows, cols, wrap, P: [], N: [], W: [], H: [], C: [] });
  }

  id(i, j) {
    return i * (this.cols + 1) + j;
  }

  /** Normals from the grid's own shape, turned to agree with `hint(i, j)`. */
  normals(hint) {
    const { rows, cols, wrap } = this;
    for (let i = 0; i < rows; i++) for (let j = 0; j <= cols; j++) {
      const at = (a, b) => {
        if (wrap) b = ((b % cols) + cols) % cols;
        else b = Math.max(0, Math.min(cols, b));
        return this.P[this.id(Math.max(0, Math.min(rows - 1, a)), b)];
      };
      const du = at(i + 1, j).clone().sub(at(i - 1, j));
      const dv = at(i, j + 1).clone().sub(at(i, j - 1));
      const n = du.cross(dv);
      if (n.lengthSq() < 1e-14) n.copy(hint(i, j));
      n.normalize();
      if (n.dot(hint(i, j)) < 0) n.negate();
      this.N[this.id(i, j)] = n;
    }
  }

  /** A point between nodes (fr down 0…rows-1, fc round 0…cols): position, normal, weights, hang. */
  sample(fr, fc) {
    const { rows, cols, wrap } = this;
    fr = Math.max(0, Math.min(rows - 1, fr));
    if (wrap) fc = ((fc % cols) + cols) % cols;
    else fc = Math.max(0, Math.min(cols, fc));
    const i0 = Math.min(rows - 2, Math.floor(fr));
    const j0 = Math.min(cols - 1, Math.floor(fc));
    const a = fr - i0;
    const b = fc - j0;
    const ids = [[this.id(i0, j0), (1 - a) * (1 - b)], [this.id(i0 + 1, j0), a * (1 - b)], [this.id(i0, j0 + 1), (1 - a) * b], [this.id(i0 + 1, j0 + 1), a * b]];
    const p = V();
    const n = V();
    let h = 0;
    const w = [];
    for (const [k, f] of ids) {
      p.addScaledVector(this.P[k], f);
      n.addScaledVector(this.N[k], f);
      h += (this.H[k] ?? 0) * f;
      for (const [bone, x] of this.W[k]) w.push([bone, x * f]);
    }
    return { p, n: n.normalize(), w: top4(w), h };
  }
}

/** Everything the robe is made of, as one geometry's arrays. */
class Out {
  constructor(uvOf) {
    Object.assign(this, { uvOf, pos: [], nrm: [], uv: [], col: [], si: [], sw: [], part: [], hang: [], idx: [], lum: new Map() });
  }

  vert(p, n, uv, c, w, part, hang = 0) {
    const i = this.pos.length / 3;
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(n.x, n.y, n.z);
    const [u, v] = this.uvOf(uv[0], uv[1]);
    this.uv.push(u, v);
    this.col.push(c.r, c.g, c.b);
    for (let k = 0; k < 4; k++) {
      this.si.push(w[k]?.[0] ?? 0);
      this.sw.push(w[k]?.[1] ?? 0);
    }
    this.part.push(part);
    this.hang.push(hang);
    const l = this.lum.get(part) ?? [0, 0];
    this.lum.set(part, [l[0] + 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, l[1] + 1]);
    return i;
  }

  /** A triangle facing its vertices' normals (whichever way round they were given). */
  tri(a, b, c) {
    const P = (i) => V(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
    const N = (i) => V(this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]);
    const f = P(b).sub(P(a)).cross(P(c).sub(P(a)));
    if (f.dot(N(a).add(N(b)).add(N(c))) < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }

  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(c, b, d);
  }

  /** A grid as a surface (rows i0…i1): uv(i, j), colour(i, j); `inward` turns it into a lining `off` inside. */
  grid(g, { part, uv, colour, i0 = 0, i1 = g.rows - 1, inward = false, off = 0 }) {
    const ids = [];
    for (let i = i0; i <= i1; i++) {
      ids[i] = [];
      for (let j = 0; j <= g.cols; j++) {
        const k = g.id(i, j);
        const n = inward ? g.N[k].clone().negate() : g.N[k];
        const p = g.P[k].clone().addScaledVector(g.N[k], -off);
        ids[i][j] = this.vert(p, n, uv(i, j), colour(i, j), g.W[k], part, inward ? -(g.H[k] ?? 0) : g.H[k] ?? 0);
      }
    }
    for (let i = i0; i < i1; i++) for (let j = 0; j < g.cols; j++) this.quad(ids[i][j], ids[i + 1][j], ids[i][j + 1], ids[i + 1][j + 1]);
  }

  /**
   * A band lying on a grid: `edge(s)` gives its two edges at s (0…1) in grid
   * coordinates ([fr, fc] each), `n` quads along it (one embroidered motif
   * each when `row` is a trim row), raised `off` above the surface with its
   * long edges bevelled down to it.
   */
  strip(g, edge, { n, off = 0.003, part, colour, row = null, across = 3, bevel = true, sub = 1, uvRect = null, uvAt: uvFn = null }) {
    const prof = [];
    for (let k = 0; k <= across; k++) {
      const u = k / across;
      const lift = bevel ? Math.min(1, Math.min(u, 1 - u) * across * 1.2 + (across === 1 ? 1 : 0)) : 1;
      prof.push([u, lift]);
    }
    // Each quad (a motif) split `sub` times along, so the band follows the surface under it.
    const cols = [];
    for (let q = 0; q <= n * sub; q++) {
      const s = q / (n * sub);
      const [a, b] = edge(s);
      cols.push(prof.map(([u, lift]) => {
        const smp = g.sample(lerp(a[0], b[0], u), lerp(a[1], b[1], u));
        return { ...smp, p: smp.p.clone().addScaledVector(smp.n, off * (bevel ? 0.35 + 0.65 * lift : 1)) };
      }));
    }
    for (let q = 0; q < n; q++) {
      // Each motif its own vertices: one motif across, with the row's pattern.
      const m = q % TRIM_MOTIFS;
      const u0 = row ? m / TRIM_MOTIFS : q / n;
      const u1 = row ? (m + 1) / TRIM_MOTIFS : (q + 1) / n;
      const vOf = (u) => (row ? lerp(row[0], row[1], u) : lerp(CLOTH_WEAVE[0], CLOTH_WEAVE[1], u));
      const ids = [];
      for (let k = 0; k <= sub; k++) {
        const uu = lerp(u0, u1, k / sub);
        // uvRect: a picture laid on the band (across → u, along → v), not a run of motifs.
        const along = (q * sub + k) / (n * sub);
        const uvAt = (c) => (uvFn ? uvFn(prof[c][0], along) : uvRect ? [lerp(uvRect[0], uvRect[1], prof[c][0]), lerp(uvRect[2], uvRect[3], along)] : [uu, vOf(prof[c][0])]);
        ids.push(cols[q * sub + k].map((smp, c) => this.vert(smp.p, smp.n, uvAt(c), colour, smp.w, part, smp.h)));
      }
      for (let k = 0; k < sub; k++) for (let c = 0; c < across; c++) this.quad(ids[k][c], ids[k + 1][c], ids[k][c + 1], ids[k + 1][c + 1]);
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    const n = this.pos.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.part, 1));
    g.setAttribute('aCape', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aHang', new THREE.Float32BufferAttribute(this.hang, 1));
    g.setIndex(this.idx);
    return g;
  }
}

/* ------------------------------------------------------------------ the garments' own bones */

/**
 * Add a bone under `parentName` at `at` (bind space), its axes the parent's;
 * returns the new skeleton and the bone's index.
 */
function addBone(skeleton, bindMatrix, parentName, at, name) {
  const pi = skeleton.bones.findIndex((b) => b.name === parentName);
  if (pi < 0) return null;
  const parentRest = skeleton.boneInverses[pi].clone().invert();
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.copy(at.clone().applyMatrix4(bindMatrix).applyMatrix4(skeleton.boneInverses[pi]));
  const rest = parentRest.clone().multiply(new THREE.Matrix4().makeTranslation(bone.position));
  skeleton.bones[pi].add(bone);
  return { skeleton: new THREE.Skeleton([...skeleton.bones, bone], [...skeleton.boneInverses, rest.clone().invert()]), index: skeleton.bones.length, rest };
}

/** A bone's rest orientation in the model (the scene the body hangs in). */
function restQuaternion(skeleton, bindMatrix, name) {
  const i = skeleton.bones.findIndex((b) => b.name === name);
  const q = new THREE.Quaternion();
  if (i < 0) return q;
  // The inverse bind matrices are in the scene's own space (its root at rest), which is the model's.
  void bindMatrix;
  skeleton.boneInverses[i].clone().invert().decompose(V(), q, V());
  return q.normalize();
}


/**
 * Add RobeLap (at the hip joints, under the pelvis) and RobeHem (at the
 * knees, under RobeLap) to a skeleton; returns the new skeleton and what
 * Actor.robeSway needs (the pelvis's own axes for the body's side, front and up).
 */
function robeBones(skeleton, bindMatrix, hipMid, kneeMid) {
  const bones = skeleton.bones;
  const pi = bones.findIndex((b) => b.name === 'pelvis');
  if (pi < 0) return null;
  const pelvis = bones[pi];
  const pelvisInv = skeleton.boneInverses[pi];
  const pelvisRest = pelvisInv.clone().invert();
  const lap = new THREE.Bone();
  lap.name = 'RobeLap';
  lap.position.copy(hipMid.clone().applyMatrix4(bindMatrix).applyMatrix4(pelvisInv));
  const lapRest = pelvisRest.clone().multiply(new THREE.Matrix4().makeTranslation(lap.position));
  const hem = new THREE.Bone();
  hem.name = 'RobeHem';
  hem.position.copy(kneeMid.clone().applyMatrix4(bindMatrix).applyMatrix4(lapRest.clone().invert()));
  const hemRest = lapRest.clone().multiply(new THREE.Matrix4().makeTranslation(hem.position));
  pelvis.add(lap);
  lap.add(hem);
  const out = new THREE.Skeleton([...bones, lap, hem], [...skeleton.boneInverses, lapRest.clone().invert(), hemRest.clone().invert()]);
  const q = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  pelvisRest.decompose(V(), q, V());
  bindMatrix.decompose(V(), qb, V());
  const toPelvis = q.clone().invert().multiply(qb);
  return {
    skeleton: out,
    lap: bones.length,
    hem: bones.length + 1,
    axes: { side: V(1, 0, 0).applyQuaternion(toPelvis).normalize(), front: V(0, 0, 1).applyQuaternion(toPelvis).normalize(), up: V(0, 1, 0).applyQuaternion(toPelvis).normalize() },
    knee: hipMid.y - kneeMid.y
  };
}

/* ------------------------------------------------------------------ building */

/**
 * The robe for a recipe, on `skeleton` (Unreal bone names) of `mesh` (the
 * body: its bind matrices); `sources` the outfit's piece geometries on that
 * skeleton ([{ geo, part }]); `partOf(name)` a garment's index; `uvOf(u, v)`
 * maps cloth-tile uv (v inside the tile) into the atlas. Returns
 * { geometry, skeleton, rig, partLum } or null when the body isn't a mannequin.
 */
export function buildRobe({ skeleton, mesh, sources, recipe, partOf, uvOf }) {
  const kit = robeKit(recipe);
  if (!kit) return null;
  const index = new Map(skeleton.bones.map((b, i) => [b.name, i]));
  const inv = mesh.bindMatrixInverse;
  const at = (name) => {
    const i = index.get(name);
    return i === undefined ? null : V().setFromMatrixPosition(inv.clone().multiply(skeleton.boneInverses[i].clone().invert()));
  };
  const J = {};
  for (const n of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l']) J[n] = at(n) ?? (n === 'Head' ? at('head') : null);
  if (Object.values(J).some((x) => !x)) return null;
  const hipMid = J.thigh_l.clone().add(J.thigh_r).multiplyScalar(0.5);
  const kneeMid = J.calf_l.clone().add(J.calf_r).multiplyScalar(0.5);
  const rig = robeBones(skeleton, mesh.bindMatrix, hipMid, kneeMid);
  if (!rig) return null;
  const bones = skeleton.bones;
  const src = new Sources(sources, bones);
  const B = (name) => index.get(name) ?? (name === 'RobeLap' ? rig.lap : name === 'RobeHem' ? rig.hem : 0);
  const rnd = stream(`robe-folds:${recipe.seed}`);
  const phase = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
  const col = (hex) => new THREE.Color(hex);
  const base = col(recipe.robe);
  const trim = col(recipe.trim);
  const inner = col(recipe.inner);
  const P = {
    robe: partOf('garment-robe'),
    trim: partOf('garment-robe-trim'),
    inner: partOf('garment-robe-inner'),
    over: recipe.over !== 'none' ? partOf('garment-robe-over') : 0,
    sash: partOf('garment-robe-sash'),
    cowl: recipe.cowl ? partOf('garment-robe-cowl') : 0
  };
  const metal = isMetalTrim(recipe.trim);
  const trimOf = (pattern = recipe.pattern) => trimRow(pattern, metal);
  const out = new Out(uvOf);
  const weave = (v) => lerp(CLOTH_WEAVE[0], CLOTH_WEAVE[1], clamp01(v));

  /* -------------------------------------------- the body: neck to hem */
  const torsoKinds = new Set(['torso', 'skin', 'head']);
  const collar = src.band(J.neck_01.y - 0.12, J.neck_01.y + 0.06, (i) => src.kind[i] === 'torso' && Math.abs(src.p[i].x) < 0.1);
  const yTop = Math.min(J.neck_01.y - 0.012, collar.length ? Math.max(...collar.map((i) => src.p[i].y)) - 0.006 : J.neck_01.y - 0.03);
  const ySash = J.spine_01.y - 0.035;
  const yHip = hipMid.y;
  const yHem = 0.02;
  const ys = [];
  const nTorso = 17;
  for (let k = 0; k < nTorso; k++) ys.push(yTop - (yTop - ySash) * Math.pow(k / nTorso, 1.3));
  for (let k = 0; k < 3; k++) ys.push(ySash - ((ySash - yHip) * k) / 3);
  const nSkirt = 16;
  for (let k = 0; k <= nSkirt; k++) ys.push(yHip - (yHip - yHem) * Math.pow(k / nSkirt, 0.92));
  const R = ys.length;
  const C = 40;
  const iSash = nTorso;
  const iHip = nTorso + 3;
  const frOfY = (y) => {
    if (y >= ys[0]) return 0;
    for (let i = 0; i < R - 1; i++) if (y <= ys[i] && y >= ys[i + 1]) return i + (ys[i] - y) / (ys[i] - ys[i + 1]);
    return R - 1;
  };
  // The centre front-to-back at each height: the middle of the torso there (the hips' below them).
  const cz = ys.map((y) => {
    const band = src.band(y - 0.03, y + 0.03, (i) => torsoKinds.has(src.kind[i]) && Math.abs(src.p[i].x) < 0.07);
    if (!band.length) return hipMid.z;
    let lo = Infinity;
    let hi = -Infinity;
    for (const i of band) {
      lo = Math.min(lo, src.p[i].z);
      hi = Math.max(hi, src.p[i].z);
    }
    return (lo + hi) / 2;
  });
  for (let i = iHip; i < R; i++) cz[i] = cz[iHip - 1];
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < iHip - 1; i++) cz[i] = (cz[i - 1] + cz[i] * 2 + cz[i + 1]) / 4;
  // How far out the outfit reaches, round each height (angle 0 = front, rising toward the left, +x).
  const reach = ys.map((y, i) => {
    const r = new Array(C).fill(0);
    const keep = (k) => (i < iHip ? src.kind[k] === 'torso' || src.kind[k] === 'skin' || (src.kind[k] === 'head' && y < J.neck_01.y) : src.kind[k] !== 'arm' && src.kind[k] !== 'finger');
    for (const k of src.band(y - 0.022, y + 0.022, keep)) {
      const p = src.p[k];
      const a = Math.atan2(p.x, p.z - cz[i]);
      const d = Math.hypot(p.x, p.z - cz[i]);
      const j = Math.round(((a + TAU) % TAU) / TAU * C) % C;
      for (const dj of [-1, 0, 1]) r[(j + dj + C) % C] = Math.max(r[(j + dj + C) % C], d * (dj ? 0.985 : 1));
    }
    // Gaps (no vertex in that direction): the neighbours'.
    for (let pass = 0; pass < C && r.some((x) => !x); pass++) for (let j = 0; j < C; j++) if (!r[j]) r[j] = Math.max(r[(j + 1) % C], r[(j + C - 1) % C]) * 0.99;
    // Smoothed round, never pulled inside the outfit.
    for (let pass = 0; pass < 2; pass++) {
      const s = r.map((x, j) => (r[(j + C - 1) % C] + 2 * x + r[(j + 1) % C]) / 4);
      for (let j = 0; j < C; j++) r[j] = Math.max(r[j], s[j]);
    }
    return r;
  });
  const radius = reach.map((r) => r.slice());
  // Torso: a little off the outfit; from the bust and shoulder blades the cloth falls straight (front and back) down to the sash.
  for (let i = 0; i < iSash; i++) for (let j = 0; j < C; j++) radius[i][j] = (radius[i][j] || 0.08) + 0.013;
  for (let i = 1; i <= iSash; i++) {
    const dy = ys[i - 1] - ys[i];
    for (let j = 0; j < C; j++) {
      const side = Math.abs(Math.sin((j / C) * TAU));
      const toSash = smooth(ySash + 0.13, ySash, ys[i]);
      const shrink = lerp(0.22, 1.6, Math.max(Math.pow(side, 2), toSash));
      radius[i][j] = Math.max(radius[i][j], radius[i - 1][j] - shrink * dy);
    }
  }
  // The sash row hugs the waist; the skirt only widens from there, belling out to the hem.
  const hemFlare = recipe.sleeves === 'fitted' ? 0.9 : 1;
  const bellAt = (i, a) => {
    if (i < iHip) return 0;
    const tb = clamp01((ys[i] - yHip) / (yHem - yHip));
    const front = Math.abs(Math.cos(a));
    return (tb * tb * 0.16 + tb * 0.07 + front * tb * tb * 0.05) * hemFlare;
  };
  for (let i = iSash; i < R; i++) for (let j = 0; j < C; j++) {
    const a = (j / C) * TAU;
    const own = (reach[i][j] || 0.1) + (i === iSash ? 0.016 : 0.02);
    radius[i][j] = i === iSash ? own : Math.max(own, radius[i - 1][j]) + bellAt(i, a) - bellAt(i - 1, a);
  }
  // Folds: soft and few on the chest, deep and many toward the hem (seeded per person).
  const foldAt = (i, a) => {
    const t = clamp01((ys[0] - ys[i]) / (ys[0] - yHem));
    const amp = lerp(0.0015, 0.024, Math.pow(t, 1.4)) * (i < iSash ? 0.6 + 0.4 * Math.abs(Math.cos(a)) : 1);
    const f = 0.62 * Math.sin(9 * a + phase[0] + t * 1.2) + 0.38 * Math.sin(14 * a + phase[1] - t * 2.1) + 0.2 * Math.sin(5 * a + phase[2]);
    return { d: amp * f, f };
  };
  const shell = new Grid(R, C, true);
  const hemNoise = (a) => 0.006 * Math.sin(3 * a + phase[3]) + 0.004 * Math.sin(7 * a + phase[2]) + 0.006 * (1 - Math.cos(a)) * 0.5;
  for (let i = 0; i < R; i++) for (let j = 0; j <= C; j++) {
    const a = ((j % C) / C) * TAU;
    const { d } = foldAt(i, a);
    const r = radius[i][j % C] + d;
    const y = i === R - 1 ? ys[i] + hemNoise(a) : ys[i] + (i > iHip ? hemNoise(a) * ((ys[iHip] - ys[i]) / (ys[iHip] - yHem)) : 0);
    const p = V(Math.sin(a) * r, y, cz[i] + Math.cos(a) * r);
    shell.P[shell.id(i, j)] = p;
  }
  shell.normals((i, j) => {
    const a = ((j % C) / C) * TAU;
    return V(Math.sin(a), 0, Math.cos(a));
  });
  // Weights: the outfit's above the hips, the skirt's own below, handed over between.
  const notHand = (k) => src.kind[k] !== 'finger';
  for (let i = 0; i < R; i++) for (let j = 0; j <= C; j++) {
    const a = ((j % C) / C) * TAU;
    const p = shell.P[shell.id(i, j)];
    const t = clamp01((yHip - p.y) / (yHip - yHem));
    const s = clamp01(0.5 + Math.sin(a) * 0.75);
    const f = (Math.cos(a) + 1) / 2;
    const skirt = skirtWeights(t, s, f).map(([b, w]) => [B(b), w]);
    const k = smooth(yHip + 0.07, yHip - 0.01, p.y);
    let w = skirt;
    if (k < 1) {
      const near = src.weights(p.clone().addScaledVector(shell.N[shell.id(i, j)], -0.012), i < iSash ? notHand : (q) => src.kind[q] === 'torso' || src.kind[q] === 'leg' || src.kind[q] === 'skin') ?? [[B('pelvis'), 1]];
      w = k > 0 ? blendW(near, skirt, k) : near;
    }
    shell.W[shell.id(i, j)] = w;
    shell.H[shell.id(i, j)] = 0;
  }
  const shade = (i, j) => {
    const a = ((j % C) / C) * TAU;
    const { f } = foldAt(i, a);
    const t = clamp01((ys[0] - ys[i]) / (ys[0] - yHem));
    // Fold valleys a touch darker, the hem a little shadowed: the folds read from afar.
    return base.clone().multiplyScalar((1 - 0.1 * Math.pow(t, 1.5)) * (1 + 0.08 * f * Math.min(1, t * 2.5)));
  };
  out.grid(shell, { part: P.robe, uv: (i, j) => [j / C, weave(i / (R - 1))], colour: shade });
  // A lining at the hem (from below, the inside isn't empty).
  const iLine = Math.round(frOfY(yHem + 0.3));
  out.grid(shell, { part: P.robe, uv: (i, j) => [j / C, weave(i / (R - 1))], colour: () => base.clone().multiplyScalar(0.42), i0: iLine, inward: true, off: 0.006 });

  /* -------------------------------------------- sleeves */
  const SLEEVE = { bell: { ext: 0.02, flare: 0.07, hang: 0.08 }, angel: { ext: 0.05, flare: 0.09, hang: 0.17 }, fitted: { ext: -0.015, flare: 0.012, hang: 0.012 } }[recipe.sleeves] ?? { ext: 0.02, flare: 0.07, hang: 0.08 };
  const sleeves = [];
  for (const side of ['l', 'r']) {
    const sg = Math.sign(J[`upperarm_${side}`].x) || (side === 'l' ? 1 : -1);
    const S = J[`upperarm_${side}`];
    const E = J[`lowerarm_${side}`];
    const W = J[`hand_${side}`];
    const x0 = Math.abs(S.x) - 0.005;
    const xE = Math.abs(E.x);
    const xW = Math.abs(W.x);
    const x1 = xW + SLEEVE.ext;
    const axis = (x) => {
      if (x <= Math.abs(S.x)) return V(x * sg, S.y, S.z);
      if (x <= xE) return S.clone().lerp(E, (x - Math.abs(S.x)) / (xE - Math.abs(S.x))).setX(x * sg);
      return E.clone().lerp(W, Math.min(1, (x - xE) / (xW - xE))).setX(x * sg);
    };
    const rows = 16;
    const cols = 16;
    const g = new Grid(rows, cols, true);
    // The arm as drawn: not the top's own short sleeves (a robe hides the top).
    const armKeep = (k) => src.kind[k] === 'arm' && src.side[k] === sg && src.part[k] !== 'garment-armour';
    const xs = [];
    for (let i = 0; i < rows; i++) xs.push(x0 + (x1 - x0) * (i / (rows - 1)));
    const radii = xs.map((x) => {
      const c = axis(Math.min(x, xW - 0.03));
      const r = new Array(cols).fill(0);
      const xx = Math.min(x, xW - 0.03);
      for (let b = Math.floor((c.y - 0.15) / 0.02); b <= Math.floor((c.y + 0.15) / 0.02); b++) {
        for (const k of src.bins.get(b) ?? []) {
          if (!armKeep(k) || Math.abs(Math.abs(src.p[k].x) - xx) > 0.025) continue;
          const dy = src.p[k].y - c.y;
          const dz = src.p[k].z - c.z;
          const a = Math.atan2(dz, dy);
          const j = Math.round(((a + TAU) % TAU) / TAU * cols) % cols;
          const d = Math.hypot(dy, dz);
          for (const dj of [-1, 0, 1]) r[(j + dj + cols) % cols] = Math.max(r[(j + dj + cols) % cols], d);
        }
      }
      const m = Math.max(...r) || 0.05;
      return r.map((x) => Math.max(x, m * 0.85));
    });
    // At the shoulder the arm's vertices run on down the chest's side: no wider than the upper arm's own middle.
    const mids = xs.map((x, i) => [x, Math.max(...radii[i])]).filter(([x]) => x > Math.abs(S.x) + 0.06 && x < xE - 0.03).map(([, r]) => r).sort((a, b) => a - b);
    const rMid = mids.length ? mids[mids.length >> 1] : 0.06;
    for (let i = 0; i < rows; i++) if (xs[i] < Math.abs(S.x) + 0.08) for (let j = 0; j < cols; j++) radii[i][j] = Math.min(radii[i][j], rMid * 1.04);
    // Past the elbow the sleeve never narrows again (it hangs from the forearm's widest).
    for (let i = 1; i < rows; i++) if (xs[i] > xE) for (let j = 0; j < cols; j++) radii[i][j] = Math.max(radii[i][j], radii[i - 1][j]);
    for (let i = 0; i < rows; i++) {
      const x = xs[i];
      const fl = Math.pow(smooth(xE - 0.06, x1, x), 1.6) * SLEEVE.flare;
      const hang = Math.pow(smooth(xE - 0.03, x1, x), 1.5) * SLEEVE.hang;
      const c = axis(x);
      for (let j = 0; j <= cols; j++) {
        const a = ((j % cols) / cols) * TAU;
        // The first rings start inside the body (the shoulder's seam is the shell's).
        const r = (radii[i][j % cols] + 0.011 + fl * (1 + 0.12 * Math.sin(5 * a + phase[1]))) * (i === 0 ? 0.7 : i === 1 ? 0.86 : i === 2 ? 0.96 : 1);
        g.P[g.id(i, j)] = c.clone().add(V(0, Math.cos(a) * r, Math.sin(a) * r));
        g.H[g.id(i, j)] = hang;
      }
    }
    g.normals((i, j) => {
      const a = ((j % cols) / cols) * TAU;
      return V(0, Math.cos(a), Math.sin(a));
    });
    const lower = B(`lowerarm_${side}`);
    for (let i = 0; i < rows; i++) for (let j = 0; j <= cols; j++) {
      const p = g.P[g.id(i, j)];
      const k = smooth(xE + 0.01, xE + 0.12, Math.abs(p.x));
      const near = k < 1 ? src.weights(p.clone().addScaledVector(g.N[g.id(i, j)], -0.014), (q) => (src.kind[q] === 'arm' && src.side[q] === sg) || (Math.abs(src.p[q].x) < x0 + 0.06 && src.kind[q] === 'torso')) ?? [[lower, 1]] : null;
      g.W[g.id(i, j)] = k >= 1 ? [[lower, 1]] : k > 0 ? blendW(near, [[lower, 1]], k) : near;
    }
    out.grid(g, { part: P.robe, uv: (i, j) => [j / cols, weave((i / (rows - 1)) * 0.4)], colour: (i) => base.clone().multiplyScalar(1 - 0.05 * (i / rows)) });
    // Lined from the elbow: the inside of a wide sleeve shows.
    const iL = xs.findIndex((x) => x > xE - 0.02);
    out.grid(g, { part: P.robe, uv: (i, j) => [j / cols, weave((i / (rows - 1)) * 0.4)], colour: () => (recipe.collar === 'v' || recipe.open ? inner.clone().multiplyScalar(0.7) : base.clone().multiplyScalar(0.5)), i0: Math.max(0, iL), inward: true, off: 0.005 });
    sleeves.push({ g, xs, rows, cols, x1 });
  }

  /* -------------------------------------------- bands, collar, sash, over-garments */
  const bandRows = (y, h) => [frOfY(y + h / 2), frOfY(y - h / 2)];
  const colOf = (a) => (((a / TAU) * C) % C + C) % C;
  const rAt = (fr) => {
    const i = Math.max(0, Math.min(R - 1, Math.round(fr)));
    return radius[i].reduce((a, x) => a + x, 0) / C;
  };
  const motifs = (len, w) => Math.max(2, Math.round(len / (w * 1.05)));
  // The hem: a broad embroidered band, and a thin one above it on the finer robes.
  {
    const w = 0.075;
    const [a, b] = [frOfY(yHem + w), R - 1];
    out.strip(shell, (s) => [[a, s * C], [b, s * C]], { n: motifs(TAU * rAt(b), w), part: P.trim, colour: trim, row: trimOf(), off: 0.0035, sub: 2 });
    if (metal || recipe.pattern !== 'plain') {
      const [c, d] = bandRows(yHem + w + 0.05, 0.016);
      out.strip(shell, (s) => [[c, s * C], [d, s * C]], { n: motifs(TAU * rAt(c), 0.06), part: P.trim, colour: trim, row: trimOf('plain'), off: 0.003, across: 1, bevel: false });
    }
  }
  // Cuffs.
  for (const sl of sleeves) {
    const w = 0.055;
    const xi = (x) => {
      for (let i = 0; i < sl.rows - 1; i++) if (Math.abs(x) <= Math.abs(sl.xs[i + 1])) return i + (x - sl.xs[i]) / (sl.xs[i + 1] - sl.xs[i]);
      return sl.rows - 1;
    };
    const a = xi(sl.x1 - w);
    out.strip(sl.g, (s) => [[a, s * sl.cols], [sl.rows - 1, s * sl.cols]], { n: Math.max(8, Math.round(TAU * 0.11 / w)), part: P.trim, colour: trim, row: trimOf(), off: 0.003 });
  }
  // The neck: a V over the under-robe, a round band, or a standing collar.
  const vDepth = recipe.collar === 'v' ? 0.2 : 0;
  const frV = frOfY(yTop - vDepth);
  const half0 = 0.62;
  const yBack = yTop - 0.045;
  if (recipe.collar === 'v') {
    out.strip(shell, (s) => {
      const fr = s * frV * 0.98;
      const h = half0 * (1 - s) + 0.01;
      return [[fr, colOf(-h)], [fr, colOf(h)]];
    }, { n: Math.ceil(frV * 1.5), part: P.inner, colour: inner, off: 0.0026, across: 8, bevel: false });
    for (const sg of [1, -1]) {
      out.strip(shell, (s) => {
        const fr = s * frV;
        const h = half0 * (1 - s);
        const w = 0.045 / rAt(fr);
        return sg > 0 ? [[fr, colOf(h)], [fr, colOf(h + w)]] : [[fr, colOf(-h - w)], [fr, colOf(-h)]];
      }, { n: motifs(Math.hypot(vDepth, half0 * 0.12), 0.045), part: P.trim, colour: trim, row: trimOf(), off: sg > 0 ? 0.0036 : 0.0044, sub: 2 });
    }
  }
  // Round the back of the neck (and the front too, for a round or standing collar).
  {
    const from = recipe.collar === 'v' ? half0 : 0;
    const fr1 = frOfY(yBack);
    out.strip(shell, (s) => {
      const a = lerp(from, TAU - from, s);
      return [[0, colOf(a)], [fr1, colOf(a)]];
    }, { n: motifs((TAU - 2 * from) * rAt(0), 0.045), part: P.trim, colour: trim, row: trimOf(), off: 0.0032 });
  }
  if (recipe.collar === 'high') {
    // A standing collar: up from the neckline, flared, lined.
    const g = new Grid(2, C, true);
    for (let j = 0; j <= C; j++) {
      const a = ((j % C) / C) * TAU;
      const smp = shell.sample(0, j);
      const out0 = V(Math.sin(a), 0, Math.cos(a));
      g.P[g.id(0, j)] = smp.p.clone().addScaledVector(out0, 0.002);
      g.P[g.id(1, j)] = smp.p.clone().addScaledVector(out0, 0.016).add(V(0, 0.055 - 0.015 * (1 + Math.cos(a)) * 0.5, 0));
      for (const i of [0, 1]) {
        g.W[g.id(i, j)] = smp.w;
        g.H[g.id(i, j)] = 0;
      }
    }
    g.normals((i, j) => {
      const a = ((j % C) / C) * TAU;
      return V(Math.sin(a), 0, Math.cos(a));
    });
    out.strip(g, (s) => [[1, s * C], [0, s * C]], { n: motifs(TAU * rAt(0), 0.05), part: P.trim, colour: trim, row: trimOf(), off: 0.0005, bevel: false });
    out.grid(g, { part: P.trim, uv: (i, j) => [j / C, weave(0.1 + i * 0.05)], colour: () => trim.clone().multiplyScalar(0.55), inward: true, off: 0.003 });
  }
  // The front: a placket down from the neck, and (an open robe) the under-robe in a split widening to the hem.
  if (recipe.open) {
    const frTopP = recipe.collar === 'v' ? frV : frOfY(yBack);
    const frS = frOfY(ySash);
    const wP = 0.05;
    out.strip(shell, (s) => {
      const fr = lerp(frTopP, frS, s);
      const h = wP / 2 / rAt(fr);
      return [[fr, colOf(-h)], [fr, colOf(h)]];
    }, { n: motifs(ys[0] - ySash - vDepth, wP), part: P.trim, colour: trim, row: trimOf(), off: 0.0034 });
    const split = (fr) => 0.01 + 0.07 * Math.pow(clamp01((fr - frS) / (R - 1 - frS)), 0.9);
    out.strip(shell, (s) => {
      const fr = lerp(frS, R - 1, s);
      const h = split(fr) / rAt(fr);
      return [[fr, colOf(-h)], [fr, colOf(h)]];
    }, { n: Math.ceil((R - 1 - frS) * 1.5), part: P.inner, colour: inner, off: 0.0026, across: 4, bevel: false });
    for (const sg of [1, -1]) {
      out.strip(shell, (s) => {
        const fr = lerp(frS, R - 1, s);
        const h = split(fr) / rAt(fr);
        const w = 0.04 / rAt(fr);
        return sg > 0 ? [[fr, colOf(h)], [fr, colOf(h + w)]] : [[fr, colOf(-h - w)], [fr, colOf(-h)]];
      }, { n: motifs(ySash - yHem, 0.04), part: P.trim, colour: trim, row: trimOf(), off: 0.0036 });
    }
  }
  // Over-garments.
  const overC = col(recipe.overColour ?? shadeHex(recipe.robe, 0.62));
  if (recipe.over === 'stole') {
    // Round the back of the neck, over the shoulders, down the front past the knees; embroidered ends with a fringe.
    const yEnd = Math.max(0.3, kneeMid.y - 0.12);
    const w = 0.075;
    for (const sg of [1, -1]) {
      const centre = (fr) => sg * lerp(0.58, 0.3, clamp01(fr / frOfY(yEnd)));
      const run = (s0, s1, opts) => out.strip(shell, (s) => {
        const fr = lerp(s0, s1, s);
        const h = w / 2 / rAt(fr);
        return [[fr, colOf(centre(fr) - h)], [fr, colOf(centre(fr) + h)]];
      }, opts);
      const fEnd = frOfY(yEnd);
      const fPanel = frOfY(yEnd + 0.12);
      run(0, fPanel, { n: Math.ceil(fPanel * 1.6), part: P.over, colour: overC, off: 0.0055, across: 4 });
      run(fPanel, fEnd, { n: 2, part: P.trim, colour: trim, row: trimOf(), off: 0.0055, across: 4, sub: 2 });
      run(fEnd - 0.01, fEnd + frOfY(yEnd - 0.035) - frOfY(yEnd), { n: 2, part: P.trim, colour: trim.clone().multiplyScalar(0.85), row: trimOf('plain'), off: 0.0045, across: 1, bevel: false });
    }
    out.strip(shell, (s) => {
      const a = lerp(0.58, TAU - 0.58, s);
      return [[0, colOf(a)], [frOfY(yTop - 0.06), colOf(a)]];
    }, { n: 24, part: P.over, colour: overC, off: 0.0055, across: 3 });
  } else if (recipe.over === 'scapular') {
    // Panels front and back from the shoulders to below the knees, a band at each foot.
    const yEnd = Math.max(0.25, kneeMid.y - 0.2);
    for (const c0 of [0, Math.PI]) {
      const run = (y0, y1, opts) => out.strip(shell, (s) => {
        const fr = lerp(frOfY(y0), frOfY(y1), s);
        const h = 0.13 / rAt(fr);
        return [[fr, colOf(c0 - h)], [fr, colOf(c0 + h)]];
      }, opts);
      run(yTop - 0.005, yEnd + 0.06, { n: Math.ceil(frOfY(yEnd) * 1.6), part: P.over, colour: overC, off: 0.0055, across: 8 });
      run(yEnd + 0.06, yEnd, { n: 1, part: P.trim, colour: trim, row: trimOf(), off: 0.0055, across: 8, bevel: false });
    }
  } else if (recipe.over === 'mantle') {
    // A short cape on the shoulders, open at the front, edged; wider over the arms so they move under it.
    const a0 = 0.36;
    const rows = 7;
    const cols = 34;
    const g = new Grid(rows, cols, false);
    for (let i = 0; i < rows; i++) for (let j = 0; j <= cols; j++) {
      const s = i / (rows - 1);
      const a = lerp(a0, TAU - a0, j / cols);
      const side = Math.pow(Math.abs(Math.sin(a)), 1.5);
      const yEdge = yTop - lerp(0.25, 0.19, side);
      const fr = lerp(0.3, frOfY(yEdge), s);
      const smp = shell.sample(fr, colOf(a));
      const off = 0.007 + 0.02 * s + 0.062 * side * Math.pow(s, 0.8) + 0.004 * Math.sin(11 * a + phase[0]) * s;
      g.P[g.id(i, j)] = smp.p.clone().addScaledVector(smp.n, off);
      g.W[g.id(i, j)] = smp.w;
      g.H[g.id(i, j)] = 0;
    }
    g.normals((i, j) => {
      const a = lerp(a0, TAU - a0, j / cols);
      return V(Math.sin(a), 0.6, Math.cos(a)).normalize();
    });
    out.grid(g, { part: P.over, uv: (i, j) => [j / cols, weave(i / rows * 0.3)], colour: (i) => overC.clone().multiplyScalar(1 - 0.06 * i / rows) });
    out.grid(g, { part: P.over, uv: (i, j) => [j / cols, weave(i / rows * 0.3)], colour: () => overC.clone().multiplyScalar(0.45), i0: 3, inward: true, off: 0.004 });
    out.strip(g, (s) => [[rows - 2.2, s * cols], [rows - 1, s * cols]], { n: motifs((TAU - 2 * a0) * 0.24, 0.05), part: P.trim, colour: trim, row: trimOf(), off: 0.0025 });
    for (const j of [0, cols]) out.strip(g, (s) => [[s * (rows - 1), j === 0 ? 0 : cols - 1.1], [s * (rows - 1), j === 0 ? 1.1 : cols]], { n: 4, part: P.trim, colour: trim, row: trimOf(), off: 0.0025 });
  }
  // The sash (or cord) at the waist, knotted at the left front, its ends hanging.
  {
    const cord = recipe.over === 'scapular' || recipe.sash === recipe.trim;
    const w = cord ? 0.028 : 0.055;
    const sashC = col(recipe.sash);
    const [a, b] = bandRows(ySash, w);
    out.strip(shell, (s) => [[a, s * C], [b, s * C]], { n: motifs(TAU * rAt(a), w * 2), part: P.sash, colour: sashC, off: 0.0075, across: 3 });
    const ak = 0.48;
    const [ka, kb] = bandRows(ySash, w * 1.5);
    out.strip(shell, (s) => [[ka, colOf(ak - 0.12 + s * 0.24)], [kb, colOf(ak - 0.12 + s * 0.24)]], { n: 3, part: P.sash, colour: sashC.clone().multiplyScalar(0.9), off: 0.015, across: 4 });
    for (const [da, len] of [[-0.04, 0.42], [0.07, 0.35]]) {
      const tw = cord ? 0.022 : 0.045;
      const run = (y0, y1, opts) => out.strip(shell, (s) => {
        const fr = lerp(frOfY(y0), frOfY(y1), s);
        const c0 = ak + da + s * da * 0.6;
        const h = tw / 2 / rAt(fr);
        return [[fr, colOf(c0 - h)], [fr, colOf(c0 + h)]];
      }, opts);
      run(ySash - w * 0.4, ySash - len + 0.04, { n: 10, part: P.sash, colour: sashC, off: 0.012, across: 2 });
      run(ySash - len + 0.04, ySash - len, { n: 1, part: P.trim, colour: cord ? trim : sashC.clone().lerp(trim, 0.5), row: trimOf('plain'), off: 0.012, across: 2 });
    }
  }
  // The cowl: a hood lying down, rolled round the neck and resting on the shoulder blades.
  if (recipe.cowl) {
    const cowlC = col(recipe.cowl);
    const rows = 7;
    const g = new Grid(rows, C, true);
    for (let j = 0; j <= C; j++) {
      const a = ((j % C) / C) * TAU;
      const back = (1 - Math.cos(a)) / 2;
      const tube = 0.022 + 0.022 * back;
      const drape = lerp(frOfY(yTop - 0.07), 0.4, Math.pow(back, 0.6));
      const smp = shell.sample(drape, j);
      const c = smp.p.clone().addScaledVector(smp.n, tube * 0.9 + (recipe.over === 'mantle' ? 0.008 : 0.003));
      for (let i = 0; i < rows; i++) {
        const ph = (i / (rows - 1)) * Math.PI * 1.15 - 0.1;
        g.P[g.id(i, j)] = c.clone().addScaledVector(smp.n, -Math.cos(ph) * tube).add(V(0, Math.sin(ph) * tube * 1.1, 0));
        g.W[g.id(i, j)] = smp.w;
        g.H[g.id(i, j)] = 0;
      }
    }
    g.normals((i, j) => {
      const a = ((j % C) / C) * TAU;
      const ph = (i / (rows - 1)) * Math.PI * 1.15 - 0.1;
      return V(Math.sin(a) * -Math.cos(ph), Math.sin(ph), Math.cos(a) * -Math.cos(ph)).normalize();
    });
    out.grid(g, { part: P.cowl, uv: (i, j) => [j / C, weave(i / rows * 0.2)], colour: (i) => cowlC.clone().multiplyScalar(0.8 + 0.2 * Math.sin((i / (rows - 1)) * Math.PI)) });
    // The hood itself, flat on the back: wide at the top, to a soft point.
    const hr = 9;
    const hc = 10;
    const bag = new Grid(hr, hc, false);
    const yBag = yTop - 0.36;
    for (let i = 0; i < hr; i++) for (let j = 0; j <= hc; j++) {
      const b = i / (hr - 1);
      const u = (j / hc) * 2 - 1;
      const wM = (0.15 * Math.pow(1 - b, 0.7) + 0.012) * (1 + 0.15 * Math.sin(b * Math.PI));
      const fr = lerp(frOfY(yTop - 0.02), frOfY(yBag), b);
      const smp = shell.sample(fr, colOf(Math.PI + (u * wM) / rAt(fr)));
      const bulge = 0.05 * (1 - u * u) * Math.sin(Math.PI * (0.12 + 0.88 * b)) * (1 - 0.4 * b) + 0.016 * (1 - b);
      bag.P[bag.id(i, j)] = smp.p.clone().addScaledVector(smp.n, 0.006 + (recipe.over === 'mantle' ? 0.03 * (1 - b) : 0) + bulge);
      bag.W[bag.id(i, j)] = smp.w;
      bag.H[bag.id(i, j)] = 0;
    }
    bag.normals(() => V(0, 0.3, -1));
    out.grid(bag, { part: P.cowl, uv: (i, j) => [j / hc, weave(0.2 + i / hr * 0.3)], colour: (i, j) => cowlC.clone().multiplyScalar(0.92 - 0.25 * Math.pow(Math.abs(j / hc * 2 - 1), 3)) });
    // The hood's opening, edged.
    out.strip(bag, (s) => [[0, s * hc], [1.1, s * hc]], { n: 6, part: P.cowl, colour: cowlC.clone().multiplyScalar(0.7), row: trimOf('plain'), off: 0.002, across: 1, bevel: false });
  }

  const geometry = out.geometry();
  const partLum = {};
  for (const [part, [s, n]] of out.lum) partLum[part] = (s / n) * 0.8;
  return { geometry, skeleton: rig.skeleton, rig: { lap: 'RobeLap', hem: 'RobeHem', axes: rig.axes, knee: rig.knee }, partLum, kit };
}

/* ------------------------------------------------------------------ cloaks */

/**
 * A cloak for a recipe with one (folk.js cloakStyle): heavy wool from a
 * collar round the back of the neck, clasped at the front of the shoulders
 * with a chain between, falling from the shoulder blades to the calves in
 * folds that deepen toward the hem, lined; an embroidered band down both
 * edges and round the hem; a cloth or fur collar; the Gilded Acorn on the
 * back for the knight's order. Its top is skinned like the clothes under it;
 * below the shoulder blades it hangs from CloakSwing (a bone of its own under
 * the upper back, kept near plumb and swung by Actor.cloakSway). It stands
 * clear of everything it covers (`sources`: the outfit, and a robe if there
 * is one) and of the arms. Same arguments and result as buildRobe.
 */
export function buildCloak({ skeleton, mesh, sources, recipe, partOf, uvOf }) {
  const kit = cloakKit(recipe);
  if (!kit) return null;
  const index = new Map(skeleton.bones.map((b, i) => [b.name, i]));
  const inv = mesh.bindMatrixInverse;
  const at = (name) => {
    const i = index.get(name);
    return i === undefined ? null : V().setFromMatrixPosition(inv.clone().multiply(skeleton.boneInverses[i].clone().invert()));
  };
  const J = {};
  for (const n of ['pelvis', 'spine_03', 'neck_01', 'upperarm_l', 'upperarm_r', 'thigh_l', 'calf_l', 'foot_l']) J[n] = at(n);
  if (Object.values(J).some((x) => !x)) return null;
  const src = new Sources(sources, skeleton.bones);
  const rnd = stream(`cloak-folds:${recipe.seed}`);
  const phase = [rnd() * TAU, rnd() * TAU, rnd() * TAU];
  const shoulderX = Math.abs(J.upperarm_l.x);
  const yS = J.upperarm_l.y + 0.05;
  // Where the outfit (and any robe) reaches: the torso and legs, and the arms only where they join the shoulder.
  const body = (k) => {
    const kind = src.kind[k];
    if (kind === 'finger') return false;
    if (kind === 'arm') return Math.abs(src.p[k].x) < shoulderX + 0.05;
    return true;
  };
  const collarBand = src.band(J.neck_01.y - 0.12, J.neck_01.y + 0.04, (i) => src.kind[i] !== 'head' && src.kind[i] !== 'arm' && Math.abs(src.p[i].x) < 0.1);
  const yTop = Math.min(J.neck_01.y - 0.005, collarBand.length ? Math.max(...collarBand.map((i) => src.p[i].y)) : J.neck_01.y - 0.03);
  const yHem = Math.max(0.3, J.calf_l.y - 0.13);
  // Rows: dense over the shoulders, then evenly to the hem.
  const ys = [];
  const nTop = 7;
  const nBody = 18;
  for (let k = 0; k < nTop; k++) ys.push(yTop - ((yTop - (yS - 0.12)) * k) / nTop);
  for (let k = 0; k <= nBody; k++) ys.push(yS - 0.12 - ((yS - 0.12 - yHem) * Math.pow(k / nBody, 0.95)));
  const R = ys.length;
  const C = 26;
  const frOfY = (y) => {
    if (y >= ys[0]) return 0;
    for (let i = 0; i < R - 1; i++) if (y <= ys[i] && y >= ys[i + 1]) return i + (ys[i] - y) / (ys[i] - ys[i + 1]);
    return R - 1;
  };
  const cz = J.spine_03.z;
  // How far round from the back the cloak reaches at each height: to the clasps at the collar, behind the arms below.
  const span = (y) => lerp(1.45, 2.45, smooth(yS - 0.16, yTop - 0.01, y));
  const angle = (i, j) => Math.PI + (j / C - 0.5) * 2 * span(ys[i]);
  const reachAt = (y, a, band = 0.03) => {
    let r = 0;
    for (const k of src.band(y - band, y + band, body)) {
      const p = src.p[k];
      const ak = Math.atan2(p.x, p.z - cz);
      const d = Math.atan2(Math.sin(ak - a), Math.cos(ak - a));
      if (Math.abs(d) < 0.16) r = Math.max(r, Math.hypot(p.x, p.z - cz));
    }
    return r;
  };
  const radius = [];
  for (let i = 0; i < R; i++) {
    radius[i] = [];
    for (let j = 0; j <= C; j++) radius[i][j] = reachAt(ys[i], angle(i, j), i < nTop ? 0.025 : 0.05) || 0.12;
  }
  // From the shoulder blades down it hangs: never in again, flaring a little to the hem; off the back by cloakBack (a quiver).
  const back = recipe.cloakBack ?? 0;
  const hang = [];
  for (let i = 0; i < R; i++) {
    hang[i] = [];
    const t = clamp01((ys[nTop] - ys[i]) / (ys[nTop] - yHem));
    for (let j = 0; j <= C; j++) {
      const behind = Math.max(0, -Math.cos(angle(i, j)));
      let r = radius[i][j] + 0.022 + back * behind * smooth(yTop, yS - 0.05, ys[i]);
      if (i > 0 && ys[i] < yS - 0.08) r = Math.max(r, hang[i - 1][j]);
      hang[i][j] = r;
      radius[i][j] = r + (i >= nTop ? t * t * 0.035 + t * 0.012 : 0);
    }
  }
  const g = new Grid(R, C, false);
  for (let i = 0; i < R; i++) for (let j = 0; j <= C; j++) {
    const a = angle(i, j);
    const t = clamp01((ys[0] - ys[i]) / (ys[0] - yHem));
    // Some nine deep folds across the back, a few small ones between.
    const fold = (0.7 * Math.sin(3.4 * (a - Math.PI) + phase[0] + t) + 0.3 * Math.sin(6.1 * (a - Math.PI) + phase[1])) * lerp(0.003, 0.034, Math.pow(t, 1.2));
    const edgeIn = smooth(0.0, 0.08, Math.min(j, C - j) / C);
    const r = radius[i][j] + fold * edgeIn;
    const hem = i === R - 1 ? 0.012 * Math.sin(3 * a + phase[2]) : 0;
    g.P[g.id(i, j)] = V(Math.sin(a) * r, ys[i] + hem, cz + Math.cos(a) * r);
    g.H[g.id(i, j)] = 0;
  }
  g.normals((i, j) => {
    const a = angle(i, j);
    return V(Math.sin(a), 0.2, Math.cos(a)).normalize();
  });
  // The swing bone: at the back of the shoulder blades, under the upper back.
  const pivot = V(0, yS - 0.1, cz - (radius[nTop][C / 2] ?? 0.15));
  const added = addBone(skeleton, mesh.bindMatrix, 'spine_03', pivot, 'CloakSwing');
  if (!added) return null;
  const swing = added.index;
  for (let i = 0; i < R; i++) for (let j = 0; j <= C; j++) {
    const p = g.P[g.id(i, j)];
    const near = src.weights(p.clone().addScaledVector(g.N[g.id(i, j)], -0.025), (k) => body(k) && src.kind[k] !== 'leg' && src.p[k].y > yS - 0.35) ?? [[index.get('spine_03'), 1]];
    const k = smooth(yS - 0.02, yS - 0.4, p.y);
    g.W[g.id(i, j)] = k > 0 ? blendW(near, [[swing, 1]], k) : near;
  }
  const P = { cloak: partOf('garment-cloak'), trim: partOf('garment-cloak-trim'), collar: partOf('garment-cloak-collar') };
  const wool = new THREE.Color(recipe.cloak);
  const trim = new THREE.Color(recipe.cloakTrim ?? '#c9a24a');
  const metal = isMetalTrim(recipe.cloakTrim ?? '#c9a24a');
  const out = new Out(uvOf);
  const weave = (v) => lerp(CLOTH_WEAVE[0], CLOTH_WEAVE[1], clamp01(v));
  out.grid(g, { part: P.cloak, uv: (i, j) => [j / C, weave(i / (R - 1))], colour: (i, j) => {
    const a = angle(i, j);
    const t = clamp01((ys[0] - ys[i]) / (ys[0] - yHem));
    const f = Math.sin(3.4 * (a - Math.PI) + phase[0] + t);
    return wool.clone().multiplyScalar(0.95 + 0.08 * f * Math.min(1, t * 2) - 0.06 * t);
  } });
  out.grid(g, { part: P.cloak, uv: (i, j) => [j / C, weave(i / (R - 1))], colour: () => wool.clone().multiplyScalar(0.4), inward: true, off: 0.008 });
  // Edge bands down both sides and round the hem.
  const row = trimRow('plain', metal);
  const wE = 0.045;
  const motifs = (len, w) => Math.max(2, Math.round(len / (w * 1.05)));
  out.strip(g, (s) => [[frOfY(yHem + wE), s * C], [R - 1, s * C]], { n: motifs(2 * span(yHem) * 0.3, wE), part: P.trim, colour: trim, row, off: 0.003, sub: 2 });
  for (const j of [0, C]) {
    const dj = (wE / 0.28 / (2 * span(yS))) * C;
    out.strip(g, (s) => {
      const fr = lerp(0.6, R - 1 - 0.6, s);
      return j === 0 ? [[fr, 0], [fr, dj]] : [[fr, C - dj], [fr, C]];
    }, { n: motifs(yTop - yHem, wE), part: P.trim, colour: trim, row, off: 0.0035 });
  }
  // The device on the back.
  if (recipe.emblem) {
    const size = 0.22;
    const yc = yS - 0.3;
    const fa = frOfY(yc + size / 2);
    const fb = frOfY(yc - size / 2);
    const rr = radius[frOfY(yc) | 0][C / 2] || 0.2;
    const dj = (size / 2 / rr / (2 * span(yc))) * C;
    // Cut to the shield's outline (EMBLEM's drawing: straight to halfway, then curving to a point).
    const shield = (s) => (s < 0.48 ? 0.8 : 0.8 * Math.sqrt(Math.max(0.02, 1 - Math.pow((s - 0.48) / 0.48, 2))));
    out.strip(g, (s) => {
      const fr = lerp(fa, fb, s);
      const h = dj * shield(s);
      return [[fr, C / 2 + h], [fr, C / 2 - h]];
    }, { n: 8, part: P.trim, colour: trim, off: 0.003, across: 6, bevel: false, uvAt: (a, s) => [lerp(EMBLEM[0], EMBLEM[1], 0.5 + (a - 0.5) * shield(s)), lerp(EMBLEM[2], EMBLEM[3], s)] });
  }
  // The collar: a roll round the back of the neck from clasp to clasp (fur: thicker, tufted).
  const fur = recipe.cloakFur ? new THREE.Color(recipe.cloakFur) : null;
  {
    const rows = 7;
    const cols = 22;
    const cg = new Grid(rows, cols, false);
    const tube0 = fur ? 0.04 : 0.026;
    // Round the back and over the shoulders only, thinning toward the clasps.
    const sjOf = (j) => lerp(0.17, 0.83, j / cols) * C;
    for (let j = 0; j <= cols; j++) {
      const sj = sjOf(j);
      const smp = g.sample(0.9, sj);
      const tube = tube0 * (0.3 + 0.7 * Math.sin(Math.PI * (j / cols)));
      const c = smp.p.clone().addScaledVector(smp.n, tube * 0.8);
      for (let i = 0; i < rows; i++) {
        const ph = (i / (rows - 1)) * Math.PI * 1.2 - 0.15;
        const tuft = fur ? 1 + 0.18 * Math.sin(j * 2.7 + i * 1.9) * Math.sin(j * 1.3 + i * 3.1) : 1;
        cg.P[cg.id(i, j)] = c.clone().addScaledVector(smp.n, -Math.cos(ph) * tube * tuft).add(V(0, Math.sin(ph) * tube * 1.15 * tuft, 0));
        cg.W[cg.id(i, j)] = smp.w;
        cg.H[cg.id(i, j)] = 0;
      }
    }
    cg.normals((i, j) => {
      const smp = g.sample(0.9, sjOf(j));
      const ph = (i / (rows - 1)) * Math.PI * 1.2 - 0.15;
      return smp.n.clone().multiplyScalar(-Math.cos(ph)).add(V(0, Math.sin(ph), 0)).normalize();
    });
    const cc = fur ?? wool.clone().multiplyScalar(0.85);
    out.grid(cg, { part: P.collar, uv: (i, j) => [j / cols, weave(i / rows * 0.2)], colour: (i, j) => cc.clone().multiplyScalar(fur ? 0.85 + 0.25 * ((j * 7 + i * 3) % 5) / 5 : 0.8 + 0.2 * Math.sin((i / (rows - 1)) * Math.PI)) });
  }
  // Clasps at the front of the shoulders, a chain between.
  const clasps = [];
  for (const j of [0.35, C - 0.35]) {
    const smp = g.sample(1.2, j);
    const c = smp.p.clone().addScaledVector(smp.n, 0.012);
    clasps.push({ c, n: smp.n, w: smp.w });
    const disc = new Grid(3, 12, true);
    const up = V(0, 1, 0);
    const side = up.clone().cross(smp.n).normalize();
    const up2 = smp.n.clone().cross(side).normalize();
    for (let jj = 0; jj <= 12; jj++) {
      const a = (jj / 12) * TAU;
      const dir = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up2, Math.sin(a));
      disc.P[disc.id(0, jj)] = c.clone().addScaledVector(dir, 0.026).addScaledVector(smp.n, -0.006);
      disc.P[disc.id(1, jj)] = c.clone().addScaledVector(dir, 0.022).addScaledVector(smp.n, 0.006);
      disc.P[disc.id(2, jj)] = c.clone().addScaledVector(dir, 0.002).addScaledVector(smp.n, 0.01);
      for (const i of [0, 1, 2]) {
        disc.W[disc.id(i, jj)] = smp.w;
        disc.H[disc.id(i, jj)] = 0;
      }
    }
    disc.normals((i, jj) => {
      const a = (jj / 12) * TAU;
      return side.clone().multiplyScalar(Math.cos(a) * (2 - i) * 0.5).addScaledVector(up2, Math.sin(a) * (2 - i) * 0.5).add(smp.n).normalize();
    });
    out.grid(disc, { part: P.trim, uv: (i, jj) => [jj / 12, trimRow('stars', true)[0] + 0.01 * i], colour: () => trim.clone().multiplyScalar(1.1) });
  }
  {
    // The chain: a thin gilt band across the chest between the clasps (rides on the body at the collar's height).
    const [a, b] = clasps;
    const cg = new Grid(2, 10, false);
    for (let j = 0; j <= 10; j++) {
      const u = j / 10;
      const p = a.c.clone().lerp(b.c, u);
      p.z += Math.sin(u * Math.PI) * 0.02;
      p.y -= Math.sin(u * Math.PI) * 0.035;
      cg.P[cg.id(0, j)] = p.clone().add(V(0, 0.005, 0));
      cg.P[cg.id(1, j)] = p.clone().add(V(0, -0.005, 0));
      for (const i of [0, 1]) {
        cg.W[cg.id(i, j)] = blendW(a.w, b.w, u);
        cg.H[cg.id(i, j)] = 0;
      }
    }
    cg.normals(() => V(0, 0, 1));
    out.grid(cg, { part: P.trim, uv: (i, j) => [j / 10, trimRow('plain', true)[0] + 0.02], colour: () => trim.clone() });
  }
  const geometry = out.geometry();
  const partLum = {};
  for (const [part, [sum, n]] of out.lum) partLum[part] = (sum / n) * 0.8;
  return {
    geometry,
    skeleton: added.skeleton,
    rig: { swing: 'CloakSwing', parent: 'Spine2', rest: restQuaternion(added.skeleton, mesh.bindMatrix, 'spine_03') },
    partLum,
    kit
  };
}

/* ------------------------------------------------------------------ the cloth tile */

/**
 * Paint the atlas's cloth tile (folk.js CLOTH_WEAVE, TRIM_ROWS): a fine
 * weave, then a row per embroidered trim pattern — light thread on a
 * mid-tone band with a stitched shadow round it, bordered top and bottom;
 * matte thread, then metal thread (roughness and metal in the ORM map,
 * raised in the normal map).
 */
export function paintClothTile({ colour, normal, orm, x0, y0, cell, nx0, ny0, small }) {
  const W = cell;
  const H = cell;
  // Masks (thread and its stitched shadow) for the trim rows, drawn with canvas paths.
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const thread = mk();
  const shadow = mk();
  const rows = ROBE_PATTERNS.length * 2;
  const rowH = ((TRIM_ROWS[1] - TRIM_ROWS[0]) * H) / rows;
  const cellW = W / TRIM_MOTIFS;
  for (const [canvas, widen] of [[thread, 1], [shadow, 2.1]]) {
    const g = canvas.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let r = 0; r < rows; r++) {
      const pattern = ROBE_PATTERNS[r % ROBE_PATTERNS.length];
      const top = TRIM_ROWS[0] * H + r * rowH;
      const h = rowH;
      const lw = Math.max(1.5, h * 0.075) * widen;
      // Borders.
      g.lineWidth = lw * 0.8;
      for (const yy of [0.2, 0.8]) {
        g.beginPath();
        g.moveTo(0, top + h * yy);
        g.lineTo(W, top + h * yy);
        g.stroke();
      }
      g.lineWidth = lw;
      for (let m = 0; m < TRIM_MOTIFS; m++) {
        const X = (u) => m * cellW + u * cellW;
        const Y = (v) => top + h * (0.24 + v * 0.52);
        const path = (pts, close = false) => {
          g.beginPath();
          pts.forEach(([u, v], k) => (k ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
          if (close) g.closePath();
          g.stroke();
        };
        const rr = stream(`rune:${m}`);
        if (pattern === 'plain') {
          for (const u of [0.1, 0.6]) path([[u, 0.5], [u + 0.28, 0.5]]);
        } else if (pattern === 'key') {
          path([[0, 0.9], [1, 0.9]]);
          path([[0.1, 0.9], [0.1, 0.1], [0.85, 0.1], [0.85, 0.7], [0.35, 0.7], [0.35, 0.35], [0.6, 0.35]]);
        } else if (pattern === 'vine') {
          g.beginPath();
          for (let k = 0; k <= 16; k++) {
            const u = k / 16;
            const v = 0.5 + 0.32 * Math.sin(u * TAU);
            if (k) g.lineTo(X(u), Y(v));
            else g.moveTo(X(u), Y(v));
          }
          g.stroke();
          for (const [u, v, d] of [[0.25, 0.18, -1], [0.75, 0.82, 1]]) {
            g.beginPath();
            g.ellipse(X(u + 0.08), Y(v + d * 0.08), cellW * 0.13, h * 0.08, d * 0.6, 0, TAU);
            g.fill();
            g.stroke();
          }
        } else if (pattern === 'stars') {
          const cx = X(0.5);
          const cy = Y(0.5);
          const s = Math.min(cellW, h * 0.52) * 0.42;
          g.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU - Math.PI / 2;
            const rad = k % 2 ? s * 0.32 : s;
            k ? g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) : g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
          }
          g.closePath();
          g.fill();
          g.stroke();
          for (const u of [0, 1]) {
            g.beginPath();
            g.arc(X(u), Y(0.5), lw * 0.9, 0, TAU);
            g.fill();
          }
        } else if (pattern === 'runes') {
          path([[0.5, 0.05], [0.5, 0.95]]);
          for (let k = 0; k < 2; k++) {
            const v = 0.15 + rr() * 0.5;
            const side = rr() < 0.5 ? -1 : 1;
            const kind = rr();
            if (kind < 0.4) path([[0.5, v], [0.5 + side * 0.3, v + 0.25]]);
            else if (kind < 0.7) path([[0.5, v], [0.5 + side * 0.3, v - 0.15], [0.5, v + 0.3]]);
            else path([[0.5 - 0.28, v], [0.5 + 0.28, v + 0.3]]);
          }
        } else if (pattern === 'leaves') {
          path([[0, 0.5], [1, 0.5]]);
          for (const [u, d] of [[0.15, -1], [0.55, 1]]) {
            g.beginPath();
            g.ellipse(X(u + 0.15), Y(0.5 + d * 0.22), cellW * 0.17, h * 0.07, d * -0.5, 0, TAU);
            g.fill();
            g.stroke();
          }
        }
      }
    }
    // The Gilded Acorn on a heater shield (EMBLEM), for cloaks' backs.
    {
      const [u0, u1, v0, v1] = EMBLEM;
      const X = (u) => (u0 + (u1 - u0) * u) * W;
      const Y = (v) => (v0 + (v1 - v0) * v) * H;
      const S = (u1 - u0) * W;
      g.lineWidth = S * 0.035 * widen;
      g.beginPath();
      g.moveTo(X(0.12), Y(0.08));
      g.lineTo(X(0.88), Y(0.08));
      g.lineTo(X(0.88), Y(0.48));
      g.quadraticCurveTo(X(0.86), Y(0.8), X(0.5), Y(0.95));
      g.quadraticCurveTo(X(0.14), Y(0.8), X(0.12), Y(0.48));
      g.closePath();
      g.stroke();
      g.beginPath();
      g.ellipse(X(0.5), Y(0.6), S * 0.13, S * 0.18, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(X(0.5), Y(0.42), S * 0.18, S * 0.09, 0, Math.PI, TAU);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(X(0.5), Y(0.34));
      g.lineTo(X(0.55), Y(0.22));
      g.stroke();
      for (const [u, rot] of [[0.31, -0.7], [0.69, 0.7]]) {
        g.beginPath();
        g.ellipse(X(u), Y(0.28), S * 0.12, S * 0.045, rot, 0, TAU);
        g.fill();
        g.stroke();
      }
      if (widen === 1) {
        // The cup's rim, and its scales.
        g.strokeStyle = '#000';
        g.lineWidth = S * 0.02;
        g.beginPath();
        g.moveTo(X(0.32), Y(0.45));
        g.lineTo(X(0.68), Y(0.45));
        g.stroke();
        for (const u of [0.4, 0.5, 0.6]) {
          g.beginPath();
          g.moveTo(X(u - 0.04), Y(0.35));
          g.lineTo(X(u + 0.04), Y(0.43));
          g.stroke();
        }
        g.strokeStyle = '#fff';
      }
    }
  }
  const T = thread.getContext('2d').getImageData(0, 0, W, H).data;
  const S = shadow.getContext('2d').getImageData(0, 0, W, H).data;
  // Colour: the weave on top, the bands below; ORM and height alongside.
  const gc = colour.getContext('2d');
  const img = gc.createImageData(W, H);
  const height = new Float32Array(W * H);
  const rough = new Float32Array(W * H);
  const metalM = new Float32Array(W * H);
  const weaveEnd = CLOTH_WEAVE[1] * H;
  for (let y = 0; y < H; y++) {
    const r = Math.floor((y - TRIM_ROWS[0] * H) / rowH);
    const inRow = y >= TRIM_ROWS[0] * H && r >= 0 && r < rows;
    const metalRow = inRow && r >= ROBE_PATTERNS.length;
    const vRow = inRow ? (y - TRIM_ROWS[0] * H - r * rowH) / rowH : 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let c;
      let h;
      let ro;
      let me = 0;
      const inEmblem = x >= EMBLEM[0] * W && x < EMBLEM[1] * W && y >= EMBLEM[2] * H && y < EMBLEM[3] * H;
      if (inEmblem) {
        // The device: metal thread on the cloak's own cloth.
        const t = T[i * 4] / 255;
        const sh = Math.max(0, S[i * 4] / 255 - t);
        // A dark field, the charge and the shield's edge in bright metal thread.
        c = lerp(lerp(0.24, 0.1, sh * 0.8), 1.0, t);
        h = 0.45 + t * 0.5 - sh * 0.2;
        ro = lerp(0.8, 0.3, t);
        me = t;
      } else if (!inRow || y < weaveEnd) {
        // Linen: a fine, even grain (the tile is stretched over the robe, so no lines that would streak or shimmer).
        let hh = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
        hh = ((hh ^ (hh >>> 13)) >>> 0) / 4294967296;
        h = 0.5 + (hh - 0.5) * 0.5;
        c = 0.82 + (hh - 0.5) * 0.04;
        ro = 0.74;
      } else {
        const t = T[i * 4] / 255;
        const sh = Math.max(0, S[i * 4] / 255 - t);
        // The band: mid-tone cloth, darker toward its edges, then stitched shadow and bright thread.
        const edge = Math.min(vRow, 1 - vRow);
        c = 0.62 + 0.08 * smooth(0.0, 0.18, edge);
        c = lerp(c, 0.36, sh * 0.85);
        const satin = 0.9 + 0.1 * Math.sin((x + y) * 1.4);
        c = lerp(c, 1.0 * satin, t);
        h = 0.45 + t * 0.5 - sh * 0.2;
        ro = metalRow ? lerp(0.78, 0.3, t) : lerp(0.86, 0.62, t);
        me = metalRow ? t : 0;
      }
      const v = Math.round(clamp01(c) * 255);
      img.data.set([v, v, v, 255], i * 4);
      height[i] = h;
      rough[i] = ro;
      metalM[i] = me;
    }
  }
  gc.putImageData(img, x0, y0);
  // The small maps: normals from the height, roughness and metal.
  const k = cell / small;
  const nc = normal.getContext('2d');
  const oc = orm.getContext('2d');
  const nimg = nc.createImageData(small, small);
  const oimg = oc.createImageData(small, small);
  const hAt = (x, y) => height[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  for (let y = 0; y < small; y++) for (let x = 0; x < small; x++) {
    const sx = Math.floor(x * k);
    const sy = Math.floor(y * k);
    const inTrim = sy >= TRIM_ROWS[0] * H;
    const amp = inTrim ? 2.2 : 1.2;
    const dx = (hAt(sx + 1, sy) - hAt(sx - 1, sy)) * amp;
    const dy = (hAt(sx, sy + 1) - hAt(sx, sy - 1)) * amp;
    const n = V(-dx, -dy, 1).normalize();
    const o = (y * small + x) * 4;
    nimg.data.set([Math.round((n.x * 0.5 + 0.5) * 255), Math.round((n.y * 0.5 + 0.5) * 255), Math.round((n.z * 0.5 + 0.5) * 255), 255], o);
    oimg.data.set([255, Math.round(rough[sy * W + sx] * 255), Math.round(metalM[sy * W + sx] * 255), 255], o);
  }
  nc.putImageData(nimg, nx0, ny0);
  oc.putImageData(oimg, nx0, ny0);
}
