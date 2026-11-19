/**
 * The Gnarlhorn, Tyrant of Mistfall Gorge: Mesh2Motion's T-Rex (CC0) made
 * into something of our own — a moss-and-bone coat with dark bands, a ruff of
 * shaggy fur down its neck and shoulders (fur shells), heavy brow horns
 * that curl forward, a ridge of mossy bone plates down its spine and tail,
 * and a spiked club at the tail's end. The horns snap off and the club can
 * be cut away, and the model shows it: stumps, a torn tail. It wears down
 * as the hunt goes on (scars, dulling), limps when weak, and when enraged its
 * eyes burn and its breath steams.
 *
 * Its mind is brains.js's MonsterBrain; this is its body.
 */
import * as THREE from 'three';
import { Beast, coatMaterial, furShells, weightOn } from './beasts.js';
import { tubeAlong } from './plants.js';
import { MONSTER_SPEED } from './brains.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const GNARL_COAT = { back: ['#33442a', '#74884e', '#c4cc90'], belly: ['#4a4030', '#bca27a', '#efe2bc'], stripe: '#1e2a16', stripeK: 0.6 };
export const HEIGHT = 6.8;

/** Bone (vertex-coloured) material: ivory at the root darkening to the tip. */
function boneMat() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0 });
}

function gradient(geo, from, to, axis = 'y') {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  const A = new THREE.Color(from);
  const B = new THREE.Color(to);
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const v = axis === 'y' ? p.getY(i) : axis === 'z' ? p.getZ(i) : p.getX(i);
    const t = (v - b.min[axis]) / Math.max(1e-6, b.max[axis] - b.min[axis]);
    tmp.copy(A).lerp(B, t);
    c.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

/** A horn: a curved, tapering tube with growth rings, along `pts` from the base. */
function horn(pts, r0) {
  const rad = pts.map((_, i) => {
    const t = i / (pts.length - 1);
    return r0 * Math.pow(1 - t, 0.85) * (1 + 0.06 * Math.sin(t * 40)) + 0.01;
  });
  const g = tubeAlong(pts, rad, 10);
  // Colour by distance along: pale root, dark tip.
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  let max = 0;
  for (let i = 0; i < uv.count; i++) max = Math.max(max, uv.getY(i));
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = uv.getY(i) / max;
    c.set([0.86 - t * 0.6, 0.8 - t * 0.6, 0.66 - t * 0.52], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

/** A bony plate: a flattened, leaning blade. */
function plate(h, w) {
  const g = new THREE.ConeGeometry(w, h, 5, 1);
  g.scale(0.32, 1, 1);
  g.translate(0, h / 2, 0);
  g.rotateX(-0.75);
  return gradient(g, '#2e3a1a', '#c8bc98');
}

/** The tail club: a knot of bone studded with spikes. */
function club(size) {
  const parts = [];
  const core = new THREE.IcosahedronGeometry(size, 1);
  core.scale(1, 0.85, 1.5);
  parts.push(gradient(core, '#5a5040', '#a89a7a'));
  const dirs = [[1, 0.3, 0.2], [-1, 0.3, 0.2], [0, 1, 0.1], [0.7, 0.7, -0.4], [-0.7, 0.7, -0.4], [0.8, -0.3, 0.6], [-0.8, -0.3, 0.6], [0, 0.6, 0.9], [0, 0.2, -1]];
  for (const d of dirs) {
    const s = new THREE.ConeGeometry(size * 0.28, size * 1.1, 6);
    s.translate(0, size * 0.55, 0);
    gradient(s, '#b8aa88', '#2a2418');
    s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(...d).normalize()));
    s.translate(...V(...d).normalize().multiplyScalar(size * 0.8).toArray());
    parts.push(s);
  }
  const tidy = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  };
  return mergeAll(parts.map(tidy));
}

function mergeAll(list) {
  // A tiny merge (avoids importing for one use).
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

export class Gnarlhorn {
  constructor(rig, { furLayers = 12 } = {}) {
    this.coat = null;
    this.beast = new Beast(rig, {
      height: HEIGHT,
      gaits: ['Walk'],
      speeds: { Idle: 0, Walk: MONSTER_SPEED.walk },
      coat: (src) => (this.coat = coatMaterial(src, { ...GNARL_COAT, rim: 0.6, rough: 0.6 })),
      name: 'Gnarlhorn'
    });
    this.object = this.beast.object;
    this.b = this.beast.bones;
    this.s = this.beast.scaleK;
    this.mesh = this.beast.meshes[0];
    this.model = this.beast.model;
    this.model.updateMatrixWorld(true);
    const nor = this.mesh.geometry.attributes.normal;
    const k = 1 / this.s;
    // The ruff: shaggy fur down the back of the neck and over the shoulders.
    const lenOf = (i) => {
      const neck = weightOn(this.mesh, i, /^(spine_4|spine_5)$/);
      const head = weightOn(this.mesh, i, /^head$/) * Math.max(0, -nor.getZ(i) + nor.getY(i) * 0.5);
      const shoulders = weightOn(this.mesh, i, /^spine_3$/) * Math.max(0, nor.getY(i));
      const belly = weightOn(this.mesh, i, /^(stomach)/) * 0.2;
      return (0.5 * neck + 0.35 * head + 0.35 * shoulders + belly) * k * Math.max(0.2, nor.getY(i) * 0.6 + 0.6) * 0.75;
    };
    this.fur = furShells(this.mesh, { layers: furLayers, lenOf, coat: this.coat, density: 700, tip: '#e0d8a8', clump: 0.7 });
    if (this.fur) {
      this.fur.userData.fur.uGravity.value.set(0, -0.6, -0.2);
      this.mesh.parent.add(this.fur);
    }
    this.parts = this._sculpt();
    this.hidden = { head: false, tail: false };
    this.flash = 0;
    this.rage = 0;
    this.limpT = 0;
    this.zones = this._zones();
  }

  /** Horns, plates, the club, glowing eyes — attached to their bones. */
  _sculpt() {
    const b = this.b;
    const s = this.s;
    const out = { horns: [], stumps: [], plates: [], club: null, eyes: [] };
    const bm = boneMat();
    this.boneMat = bm;
    const wp = (bone) => bone.getWorldPosition(V());
    const head = b.head;
    const hq = head.getWorldQuaternion(new THREE.Quaternion());
    const hp = wp(head);
    // The head's own axes (world): forward toward the snout tip, up.
    const tip = wp(b.head_tip ?? b.nose ?? head);
    const fwd = tip.clone().sub(hp).setY(0).normalize();
    const up = V(0, 1, 0);
    const side = V().crossVectors(fwd, up).normalize();
    void hq;
    const L = hp.distanceTo(tip);
    const add = (geo, bone, mat = bm) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      bone.attach(m);
      return m;
    };
    // Brow horns: from above the eyes, sweeping back, out and then forward.
    for (const sgn of [-1, 1]) {
      const base = hp.clone().addScaledVector(fwd, L * 0.12).addScaledVector(up, L * 0.34).addScaledVector(side, sgn * L * 0.2);
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        // Up and back off the brow, out to the side, the tips hooking forward.
        const p = base.clone()
          .addScaledVector(side, sgn * (Math.sin(t * Math.PI * 0.5) * L * 0.32))
          .addScaledVector(up, Math.sin(t * Math.PI * 0.7) * L * 0.7)
          .addScaledVector(fwd, -Math.sin(t * Math.PI * 0.6) * L * 0.4 + t * t * t * L * 0.75);
        pts.push(p);
      }
      out.horns.push(add(horn(pts, L * 0.13), head));
      // The stump left when it breaks.
      const sm = add(horn(pts.slice(0, 4), L * 0.13), head);
      sm.visible = false;
      out.stumps.push(sm);
    }
    // A nose horn.
    {
      const base = hp.clone().addScaledVector(fwd, L * 0.78).addScaledVector(up, L * 0.18);
      const pts = [0, 1, 2, 3, 4].map((i) => base.clone().addScaledVector(up, i * L * 0.05).addScaledVector(fwd, i * L * 0.02));
      out.horns.push(add(horn(pts, L * 0.06), head));
    }
    // Plates down the spine and tail.
    const chain = ['spine_1', 'spine_2', 'spine_3', 'spine_4', 'tail_1', 'tail_2', 'tail_3', 'tail_4'];
    const pos = this.mesh.geometry.attributes.position;
    const tmp = V();
    chain.forEach((name, i) => {
      const bone = b[name];
      if (!bone) return;
      const p = wp(bone);
      // The top of the back above this bone.
      let top = p.y;
      for (let j = 0; j < pos.count; j += 3) {
        tmp.fromBufferAttribute(pos, j).multiplyScalar(s);
        if (Math.abs(tmp.x) < 0.25 * s && Math.abs(tmp.z - p.z) < 0.18 * s) top = Math.max(top, tmp.y);
      }
      const h = (i < 4 ? 0.2 + i * 0.03 : 0.24 - (i - 4) * 0.04) * s;
      const g = plate(h, h * 0.55);
      g.translate(p.x, top - h * 0.25, p.z);
      out.plates.push(add(g, bone));
    });
    // The club at the tail's end.
    const tb = b.tail_5 ?? b.tail_4;
    if (tb) {
      const p = wp(b.tail_tip ?? tb);
      const g = club(0.22 * s);
      g.translate(p.x, p.y, p.z);
      out.club = add(g, tb);
    }
    // Eyes that burn when it rages.
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.15, 0.05), toneMapped: false });
    for (const sgn of [-1, 1]) {
      const g = new THREE.SphereGeometry(L * 0.045, 8, 6);
      const p = hp.clone().addScaledVector(fwd, L * 0.42).addScaledVector(up, L * 0.2).addScaledVector(side, sgn * L * 0.21);
      g.translate(p.x, p.y, p.z);
      out.eyes.push(add(g, head, this.eyeMat));
    }
    return out;
  }

  /** Hit zones (bone, radius in metres, part id). */
  _zones() {
    const b = this.b;
    const s = this.s;
    return [
      { bone: b.head, r: 0.55 * s, part: 'head', off: V(0, 0.1, 0.3) },
      { bone: b.spine_5, r: 0.42 * s, part: 'neck' },
      { bone: b.spine_3, r: 0.6 * s, part: 'body' },
      { bone: b.spine_1, r: 0.55 * s, part: 'body' },
      { bone: b.back_leg_lower_l, r: 0.35 * s, part: 'legs' },
      { bone: b.back_leg_lower_r, r: 0.35 * s, part: 'legs' },
      { bone: b.tail_2, r: 0.35 * s, part: 'tail' },
      { bone: b.tail_4, r: 0.28 * s, part: 'tail' },
      { bone: b.tail_5, r: 0.3 * s, part: 'tail', tip: true }
    ].filter((z) => z.bone);
  }

  /** The part nearest a point (and the point on it): what a blow there hits. */
  partAt(p, reach = 0) {
    let best = null;
    let bd = Infinity;
    const c = V();
    for (const z of this.zones) {
      if (z.part === 'tail' && z.tip && this.hidden.tail) continue;
      z.bone.getWorldPosition(c);
      const d = c.distanceTo(p) - z.r;
      if (d < bd) [best, bd] = [{ part: z.part, at: c.clone(), dist: d }, d];
    }
    return best && best.dist <= reach ? best : best ? { ...best, miss: true } : null;
  }

  /** Points on the body (zone centres) for aiming and the camera. */
  centre() {
    return this.b.spine_3.getWorldPosition(V());
  }

  head() {
    return this.b.head.getWorldPosition(V());
  }

  tailTip() {
    return (this.b.tail_5 ?? this.b.tail_4).getWorldPosition(V());
  }

  /** A part breaks: its look changes. Returns the piece to drop (a mesh in world space) or null. */
  breakPart(part) {
    if (part === 'head' && !this.hidden.head) {
      this.hidden.head = true;
      const piece = this.parts.horns[0];
      const world = piece.matrixWorld.clone();
      for (const h of this.parts.horns.slice(0, 2)) h.visible = false;
      for (const st of this.parts.stumps) st.visible = true;
      const drop = new THREE.Mesh(piece.geometry, this.boneMat);
      drop.castShadow = true;
      world.decompose(drop.position, drop.quaternion, drop.scale);
      return drop;
    }
    if (part === 'tail' && !this.hidden.tail) {
      this.hidden.tail = true;
      const club = this.parts.club;
      const world = club?.matrixWorld.clone();
      if (club) club.visible = false;
      // The tail's end collapses into a stump.
      for (const n of ['tail_5', 'tail_tip']) if (this.b[n]) this.b[n].scale.setScalar(0.02);
      const drop = new THREE.Group();
      if (club) {
        const c = new THREE.Mesh(club.geometry, this.boneMat);
        world.decompose(c.position, c.quaternion, c.scale);
        c.castShadow = true;
        drop.add(c);
      }
      return drop;
    }
    return null;
  }

  /** Each frame, from the brain: place, turn, lean, play the right clip. */
  sync(dt, brain, groundAt) {
    const o = this.object;
    const y = groundAt(brain.x, brain.z);
    o.position.set(brain.x, y, brain.z);
    o.rotation.y = brain.yaw;
    const be = this.beast;
    const st = brain.state;
    const a = brain.attack;
    // Clips.
    let want = null;
    let opts = {};
    if (st === 'dead') {
      want = 'Death';
      opts = { hold: true, fade: 0.3 };
    } else if (st === 'rest') {
      want = 'Death';
      opts = { hold: true, fade: 0.8, speed: 0.5 };
    } else if (st === 'stagger') {
      want = 'Hit';
      opts = { speed: 0.7, fade: 0.1, hold: true };
    } else if (a) {
      if (a.id === 'bite') want = 'Bite';
      else if (a.id === 'tail') want = 'Tail';
      else if (a.id === 'roar') want = 'Roar';
      else if (a.id === 'charge') want = a.phase === 'windup' ? 'Roar' : null;
      opts = { fade: 0.15, speed: a.id === 'roar' ? 2.6 : a.id === 'tail' ? 1.15 : a.id === 'charge' ? 3 : 1.0 };
    }
    if (want && (be.overlay !== want || this._lastAttack !== a)) {
      be.play(want, opts);
      this._lastAttack = a;
    } else if (!want && be.overlay) be.rest(0.25);
    // Rest: hold the fall partway (lying down, breathing).
    if (st === 'rest' && be.actions.Death) {
      const d = be.actions.Death;
      if (d.time > d.getClip().duration * 0.62) d.timeScale = 0;
    }
    // Walk faster to run; limping drags.
    let speed = Math.max(0, brain.speed);
    be.pace = brain.limping ? 0.7 : 1;
    if (a?.id === 'charge' && a.phase === 'active') speed = brain.speed * 0.35;
    be.speeds.Walk = MONSTER_SPEED.walk * (speed > 3 ? 1.6 : 1);
    be.move(speed);
    be.update(dt);
    // A limp: the hips drop and roll on one side.
    this.limpT += dt * Math.max(0.5, speed);
    const limp = brain.limping && speed > 0.3 ? Math.max(0, Math.sin(this.limpT * 2.1)) : 0;
    this.model.rotation.z += ((brain.limping ? limp * 0.1 : 0) - this.model.rotation.z) * Math.min(1, dt * 8);
    this.model.position.y = -limp * 0.25;
    // Lean forward into a charge.
    const lean = a?.id === 'charge' && a.phase === 'active' ? 0.18 : 0;
    this.model.rotation.x += (lean - this.model.rotation.x) * Math.min(1, dt * 5);
    // Wear and rage on the coat; the eyes.
    const u = this.coat?.userData.coat;
    if (u) {
      u.uWear.value = 1 - brain.frac;
      this.flash = Math.max(0, this.flash - dt * 5);
      u.uFlash.value.setScalar(this.flash * 0.35);
      this.rage += ((brain.enraged ? 1 : 0) - this.rage) * Math.min(1, dt * 2);
      u.uRage.value = this.rage * (0.6 + 0.4 * Math.sin(performance.now() * 0.004));
    }
    this.eyeMat.color.setRGB(0.2 + this.rage * 6, 0.15 + this.rage * 1.2, 0.05);
    if (this.hidden.tail) for (const n of ['tail_5', 'tail_tip']) if (this.b[n]) this.b[n].scale.setScalar(0.02);
    if (this.fur) this.fur.userData.fur.uMotion.value.set(0, 0, -Math.min(0.4, speed * 0.03));
  }

  hit() {
    this.flash = 1;
  }

  dispose() {
    this.beast.dispose();
    this.fur?.geometry.dispose();
  }
}
