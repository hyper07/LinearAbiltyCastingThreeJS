/**
 * Jointed 3D characters: a person's solid pixel figure (voxel.js) in parts —
 * head, body, arms, legs — on joints, posed every frame from what they are
 * doing, wearing their gear (gear3d.js: weapon, shield or tome or bow, hat or
 * helmet, pauldrons, a cape that sways), each in its item's colour with a glint
 * for rare and better and a metal sheen on bare metal; fists that close round
 * what they hold, and shoes.
 *
 * The joints are springs, not snaps: a pose is a target each joint swings
 * toward, overshooting a little (follow-through after a strike, a head that
 * lags a step behind the body). The walk has weight — the body dips as each
 * foot plants, sways over the standing leg, the shoulders counter-turn — and
 * reports each footfall (`onStep`) for dust. Idle figures blink, look about,
 * stretch or shift their weight; a hit knocks them away from the blow.
 *
 * Same surface as SpriteActor (gfx.js), so the game drives either:
 *   actor.show(sprite); actor.setGear(look); actor.update(dt, yaw, light); actor.facing, lift, flash, tint …
 * plus `actor.act` — what the body is doing this frame:
 *   { move: 0…1, back: bool (walking backward), moveYaw: radians (where the legs go, from the facing),
 *     twist: radians (upper body turned from the legs, for aiming), swing: { pose, t: 0…1 } | null,
 *     pose: { id, t } | null, spin: 0…1 | null, cast: 0…1 | null, roll: 0…1 | null, guard: bool,
 *     hurt: 0…1, dead: bool, talk: bool }
 * and `actor.lookAt` ({ x, z } in the world, or null): the head turns toward it;
 * `actor.hitFrom(angle)`: the direction a blow came from (the flinch goes away from it);
 * `actor.detail` 1 (every pixel a block, near the camera) or 2 (far): set it, the rig swaps.
 *
 * Swing poses follow the weapon: sweepR / sweepL / smash (sword), heavyR / heavyL
 * (axe, mace, long sword — bigger, slower arcs), jabR / jabL / stab (dagger),
 * thrust (spear), bolt / bolt3 (staff), shot / power (bow). Skill poses: lunge,
 * overhead, bash, guard, plant, slam, nova, raise, draw, skyshot.
 *
 * Sculpted figures (sculpt/): a sprite that carries a `person` (sprites.js) is
 * drawn as a soft vinyl toy instead of blocks — one skinned mesh on these
 * same joints (so every pose above plays on it unchanged), a face that
 * blinks and changes with what the body does (sculpt/mapping.js), gear hung
 * where sculpt/mapping.js gearSockets() says. `SCULPTED_FIGURES` (sculpt/
 * build.js) turns it off. Kept cheap to draw: everything worn is one skinned
 * mesh (each piece rides its own bone on its socket) and the cape another; the
 * outlines and the shadow use the coarse ('far') meshes even when the figure
 * shows its fine one; meshes are sculpted in the background (sculpt/build.js)
 * and swapped in when ready, so dressing never stalls a frame.
 */
import * as THREE from 'three';
import { voxelParts } from './voxel.js';
import { blobShadow, figureUniforms, figureMaterial, lightFigure } from './gfx.js';
import { weaponGeometry, offhandGeometry, headGeometry, pauldronGeometry, capeGeometry, handGeometry, footGeometry } from './gear3d.js';
import { SCULPTED_FIGURES, modelFor, geometryFor, geometryReady, requestGeometry } from './sculpt/build.js';
import { personDesc, personRecipe, personFace, shapeKey, faceKey, bodyPlan } from './sculpt/people.js';
import { sculptMaterial, setPalette, outlineMaterial, inkFor } from './sculpt/material.js';
import { buildFace } from './sculpt/face.js';
import { gearSockets, heroExpression, weaponLength } from './sculpt/mapping.js';
import { smoothCapeGeometry, gearReady, CAPE_STEP } from './sculpt/gear.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const hexOf = (rgb, fallback) => (rgb ? `#${new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]).getHexString()}` : fallback);

/**
 * A damped spring toward a target (one number): `k` stiffness (rad/s), `z`
 * damping (1 none over, below 1 a little overshoot). Steps in small slices so
 * a slow frame cannot blow it up.
 */
export function springStep(state, target, dt, k = 24, z = 0.6) {
  let t = Math.min(dt, 0.1);
  while (t > 0) {
    const h = Math.min(t, 1 / 120);
    const acc = k * k * (target - state.x) - 2 * z * k * state.v;
    state.v += acc * h;
    state.x += state.v * h;
    t -= h;
  }
  return state.x;
}

/** Springs for a joint's three rotations. */
class JointSpring {
  constructor(obj, k, z) {
    this.obj = obj;
    this.k = k;
    this.z = z;
    this.s = [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }];
  }

  /** Swing toward a target; `kick` adds a sudden push (a hit). */
  to([x, y, zr], dt, k = this.k) {
    const r = this.obj.rotation;
    r.x = springStep(this.s[0], x, dt, k, this.z);
    r.y = springStep(this.s[1], y, dt, k, this.z);
    r.z = springStep(this.s[2], zr, dt, k, this.z);
  }

  kick(vx, vy = 0, vz = 0) {
    this.s[0].v += vx;
    this.s[1].v += vy;
    this.s[2].v += vz;
  }

  snap([x, y, z]) {
    this.s[0].x = x;
    this.s[1].x = y;
    this.s[2].x = z;
    for (const s of this.s) s.v = 0;
  }
}

/**
 * Pieces of gear (rigid sculpted geometries, sculpt/gear.js) as one skinned
 * geometry: piece i rides bone i.
 */
function mergeGear(geos) {
  const names = ['position', 'normal', 'color', 'aSlotA', 'aSlotB', 'aTone', 'aGlow', 'aFab'];
  let verts = 0, tris = 0;
  for (const g of geos) {
    verts += g.attributes.position.count;
    tris += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const arr = new Float32Array(verts * size);
    let o = 0;
    for (const g of geos) {
      arr.set(g.attributes[n].array, o);
      o += g.attributes[n].count * size;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  const si = new Uint16Array(verts * 4), sw = new Float32Array(verts * 4);
  const idx = verts > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);
  let v = 0, t = 0;
  geos.forEach((g, i) => {
    const n = g.attributes.position.count;
    for (let k = 0; k < n; k++) {
      si[(v + k) * 4] = i;
      sw[(v + k) * 4] = 1;
    }
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k++) idx[t + k] = ix[k] + v;
    v += n;
    t += ix.length;
  });
  out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export class RigActor {
  /** @param {{ shadow?: number, scale?: number, sword?: boolean, glow?: number, detail?: number }} options */
  constructor({ shadow = 0.45, scale = 1, sword = false, glow = 0, detail = 2 } = {}) {
    this.group = new THREE.Group();
    this.u = figureUniforms();
    this.self = this.u.uSelf;
    this.material = figureMaterial(this.u, { side: THREE.DoubleSide });
    this.voxelMat = this.material;
    this.skinMat = null;
    this.face = null;
    this._sculptKey = null;
    this._sculptDirty = false;
    this.gearMat = figureMaterial(this.u);
    this.metalMat = figureMaterial(this.u, { metal: 0.72 });
    // body: turns and lifts; hips: the joint the whole upper body and the legs hang from.
    this.mesh = new THREE.Group(); // (named as SpriteActor's, for the game's lean and blink)
    this.body = new THREE.Group();
    this.mesh.add(this.body);
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.scale = scale;
    this.glow = glow;
    this.sprite = null;
    this.flash = 0;
    this.lift = 0;
    this.squash = 0;
    this.tint = new THREE.Color(1, 1, 1);
    this.facing = null;
    this.act = { move: 0 };
    this.walk = 0;
    this.speed = 0;
    this.time = Math.random() * 10;
    this.joints = null;
    this.tip = new THREE.Vector3();
    this.mid = new THREE.Vector3();
    this.look = sword ? { weapon: { shape: 'shortsword', type: 'shortsword', color: '#d8e2ea' } } : null;
    this.pieces = [];
    this.glowMats = [];
    this.glowColor = null;
    this.detail = detail;
    this._detail = detail;
    this.syncNear = detail === 1; // the hero's own figure: its fine mesh is built straight away
    this.lookAt = null;
    this.onStep = null;
    this.steps = 0;
    this._stepPhase = 0;
    this._blink = 2 + Math.random() * 3;
    this._idle = { t: 0, next: 4 + Math.random() * 5, kind: null, k: 0, dur: 1 };
    this._hit = { x: 0, z: 0 };
    this._prevFacing = null;
    this._turnRate = 0;
  }

  /** Dress the rig in a figure (the rig walks it — walk frames are not needed). Gear is hung again. */
  show(sprite) {
    if (this.sprite === sprite) return;
    this.sprite = sprite;
    if (SCULPTED_FIGURES && sprite?.person) {
      // Built when first needed (after setGear, which may change the shape): see _sculpt().
      this._sculptDirty = true;
      return;
    }
    this._sculptKey = null;
    this.face?.dispose();
    this.face = null;
    this.material = this.voxelMat ?? this.material;
    const vp = voxelParts(sprite, { step: this.detail });
    const { parts, joints, size } = vp;
    this._detail = this.detail;
    this.body.clear();
    this.partMeshes = {};
    const mk = (name) => {
      const pivot = new THREE.Group();
      pivot.position.set(...joints[name]);
      const m = new THREE.Mesh(parts[name], this.material);
      m.castShadow = true;
      m.receiveShadow = true;
      pivot.add(m);
      this.partMeshes[name] = m;
      return pivot;
    };
    const hips = mk('torso');
    const head = mk('head');
    // The head and the arms hang from the body (so a twist of the body takes them along).
    head.position.sub(hips.position);
    const armNeg = mk('armNeg');
    const armPos = mk('armPos');
    armNeg.position.sub(hips.position);
    armPos.position.sub(hips.position);
    hips.add(head, armNeg, armPos);
    const legNeg = mk('legNeg');
    const legPos = mk('legPos');
    this.body.add(hips, legNeg, legPos);
    const legLen = joints.legNeg[1];
    this.joints = { hips, torso: hips, head, armNeg, armPos, legNeg, legPos, hipY: joints.torso[1], height: size.height, armLength: size.armLength, shoulderY: joints.armNeg[1] - joints.torso[1], legLen };
    this.springs = {
      armNeg: new JointSpring(armNeg, 26, 0.55), armPos: new JointSpring(armPos, 26, 0.55),
      legNeg: new JointSpring(legNeg, 30, 0.75), legPos: new JointSpring(legPos, 30, 0.75),
      hips: new JointSpring(hips, 20, 0.62), head: new JointSpring(head, 13, 0.5)
    };
    this._palette = vp.palette;
    this.body.scale.setScalar(this.scale);
    this._hang();
  }

  /** Swap every part to another detail (1: each pixel a block; 2: far away, a quarter of the blocks). */
  _swapDetail() {
    if (!this.sprite || this._detail === this.detail) return;
    if (this._sculptKey) {
      this._sculptLod();
      return;
    }
    this._detail = this.detail;
    const vp = voxelParts(this.sprite, { step: this.detail });
    for (const [n, m] of Object.entries(this.partMeshes ?? {})) m.geometry = vp.parts[n];
    this._blinkGeo = null;
  }

  /**
   * Wear a gear look (items.js gearLook, or a plain { weapon, offhand, head,
   * chest, cape } for people and monsters): the meshes go on the joints.
   */
  setGear(look) {
    this.look = look;
    if (this._sculptKey || this._sculptDirty) {
      this._sculptDirty = true;
      return;
    }
    this._hang();
  }

  /* ------------------------------------------------------------ sculpted figures */

  /** Build (or re-dress) the sculpted figure from the sprite's person and the gear worn. */
  _sculpt() {
    this._sculptDirty = false;
    const P = this.sprite.person;
    const gear = this.look ?? P.gear ?? null;
    if (!this.look && P.gear) this.look = P.gear;
    const desc = personDesc(P.look, gear, { cls: P.cls, hostile: P.hostile, eyeGlow: P.eyeGlow, extra: P.extra });
    if (!this.skinMat) this.skinMat = sculptMaterial(this.u, { gloss: 0.16 });
    this.material = this.skinMat;
    setPalette(this.skinMat, P.palette);
    this._ink = outlineMaterial(inkFor(P.palette[2] ?? '#3a2a24'), 0.016);
    if (this.hull) this.hull.material = this._ink;
    const key = shapeKey(desc);
    const fkey = faceKey(desc);
    if (key === this._sculptKey && fkey === this._faceKey && this.joints) {
      this._hang();
      return;
    }
    this._sculptKey = key;
    this._faceKey = fkey;
    this._desc = desc;
    this._make = () => personRecipe(desc);
    // The same build re-dressed keeps its joints (and the springs' swing) and shows the mesh it has
    // until the new one is sculpted; a new build gets new joints.
    const same = this.joints?.sculpted && this._build === desc.build;
    this._build = desc.build;
    if (!same) {
      const plan = bodyPlan(desc.build);
      const J0 = plan.joints;
      this.body.clear();
      this.partMeshes = {};
      this.pieces = [];
      const joint = (name) => {
        const o = new THREE.Group();
        o.name = name;
        o.position.set(...J0[name]);
        return o;
      };
      const hips = joint('torso'), head = joint('head'), armNeg = joint('armNeg'), armPos = joint('armPos'), legNeg = joint('legNeg'), legPos = joint('legPos');
      for (const o of [head, armNeg, armPos]) {
        o.position.sub(hips.position);
        hips.add(o);
      }
      this.body.add(hips, legNeg, legPos);
      const byName = { torso: hips, head, armNeg, armPos, legNeg, legPos };
      // One skinned mesh on the joints themselves: bind-space is the body's frame, each bone's inverse its rest offset.
      const BONES = ['torso', 'head', 'armNeg', 'armPos', 'legNeg', 'legPos'];
      const restOf = { torso: J0.torso, head: J0.head, armNeg: J0.armNeg, armPos: J0.armPos, legNeg: J0.legNeg, legPos: J0.legPos };
      this.skeleton?.dispose(); // its bone texture
      this.skeleton = new THREE.Skeleton(BONES.map((n) => byName[n]), BONES.map((n) => new THREE.Matrix4().makeTranslation(-restOf[n][0], -restOf[n][1], -restOf[n][2])));
      this.skin = this.hull = null;
      this.face?.dispose();
      this.face = null;
      this._shownKey = null;
      this.joints = {
        hips, torso: hips, head, armNeg, armPos, legNeg, legPos, hipY: J0.torso[1], height: plan.height, armLength: plan.armLength,
        shoulderY: J0.armNeg[1] - J0.torso[1], legLen: plan.legLen, fist: plan.hand, backZ: plan.backZ, headLift: plan.headLift, sculpted: true, headPos: new THREE.Vector3(...J0.head)
      };
      this.springs = {
        armNeg: new JointSpring(armNeg, 26, 0.55), armPos: new JointSpring(armPos, 26, 0.55),
        legNeg: new JointSpring(legNeg, 30, 0.75), legPos: new JointSpring(legPos, 30, 0.75),
        hips: new JointSpring(hips, 20, 0.62), head: new JointSpring(head, 13, 0.5)
      };
      this._palette = {};
    }
    this._detail = this.detail;
    this._sculptLod(true);
    this.body.scale.setScalar(this.scale);
    this._hang();
  }

  /** Build this figure's meshes ahead of time, in the background (sculpted figures): its body, fine and coarse, and what it wears. */
  prewarm() {
    if (this._sculptDirty) this._sculpt();
    if (!this._sculptKey) return;
    requestGeometry(this._sculptKey, this._make, 'far');
    requestGeometry(this._sculptKey, this._make, 'near');
    for (const p of this._gear?.pieces ?? []) gearReady(p.kind, p.args, 'near', { urgent: false });
  }

  /**
   * The sculpted mesh at this detail and its face. What is not built yet is
   * asked for (urgently: someone is looking) and the figure keeps what it
   * shows meanwhile — the coarse mesh, or its old shape while it is re-dressed.
   * Only the hero's own first figure (and the character panel's) is built on
   * the spot, so it is never missing.
   */
  _sculptLod(first = false) {
    const want = this.detail === 1 ? 'near' : 'far';
    const key = this._sculptKey, make = this._make;
    // The hero's (and the panel's) very first figure is built on the spot; later, only a coarse mesh,
    // and only when there is nothing at all to show (a new build of body) — the rest comes from the worker.
    const firstEver = first && this.syncNear && !this._everShown;
    let far = geometryReady(key, 'far');
    let near = want === 'near' ? geometryReady(key, 'near') : null;
    if (want === 'near' && !near) {
      if (firstEver) near = geometryFor(key, make, 'near');
      else requestGeometry(key, make, 'near', { urgent: true });
    }
    if (!far) {
      if (firstEver || (this.syncNear && !this.skin)) far = geometryFor(key, make, 'far');
      else requestGeometry(key, make, 'far', { urgent: true });
    }
    const geo = near ?? far;
    // Not the detail wanted yet: look again next frame.
    this._detail = geo && (want === 'far' || near) && far ? this.detail : -1;
    if (!geo) return;
    const lod = near ? 'near' : 'far';
    // The outline and the shadow need no fine mesh: the coarse one is a sixth of the triangles.
    const hullGeo = far ?? geo;
    if (this._shownKey === key && this._lod === lod && this.hull?.geometry === hullGeo) return;
    if (!this.skin) {
      const skin = new THREE.SkinnedMesh(geo, this.skinMat);
      skin.bind(this.skeleton, new THREE.Matrix4());
      skin.receiveShadow = true;
      skin.name = 'sculpt';
      // The outline, as Arcademia's toys have: the same body on the same skeleton, inside out. It casts the shadow.
      const hull = new THREE.SkinnedMesh(hullGeo, this._ink);
      hull.bind(this.skeleton, new THREE.Matrix4());
      hull.castShadow = true;
      hull.raycast = () => {};
      this.body.add(skin, hull);
      this.skin = skin;
      this.hull = hull;
    } else {
      this.skin.geometry = geo;
      this.hull.geometry = hullGeo;
    }
    this.skin.boundingSphere = geo.boundingSphere.clone();
    // Posed limbs reach past the rest shape: cull by a roomier sphere.
    this.skin.boundingSphere.radius *= 1.35;
    this.hull.boundingSphere = this.skin.boundingSphere;
    const low = lod === 'far';
    if (this._shownKey !== key || this._faceLow !== low || !this.face) {
      this.face?.dispose();
      const model = modelFor(key, make);
      this.face = buildFace({ sdf: model.sdf, f: personFace(this._desc), headBone: this.joints.head, headPos: this.joints.headPos, lidMaterial: this.skinMat, lidSlot: 0, key: this._faceKey, low });
      this.face.root.visible = this.look?.head?.shape !== 'full';
      this._faceLow = low;
    }
    this._shownKey = key;
    this._lod = lod;
    this._everShown = true;
  }

  _glowMat(hex, strength = 0.7) {
    const m = figureMaterial(this.u, { emissive: hex, strength });
    this.glowMats.push(m);
    return m;
  }

  /** Hang the gear meshes on the joints (after show(), and whenever the gear changes); hands and feet too. */
  _hang() {
    for (const p of this.pieces) p.removeFromParent();
    this.pieces = [];
    for (const m of this.glowMats) m.dispose();
    this.glowMats = [];
    this._dropGearMesh();
    this.sword = this.weapon = this.bow = this.shield = null;
    this.swordTip = this.swordMid = null;
    this.cape = null;
    const J = this.joints;
    if (!J) return;
    const L = this.look ?? {};
    const K = gearSockets(J);
    if (J.sculpted) {
      this._hangSculpted(J, L, K);
      return;
    }
    const mats = (glow, strength) => [this.gearMat, glow ? this._glowMat(glow, strength) : this.gearMat, this.metalMat];
    const piece = (geo, socket, glow, strength = 0.7) => {
      const m = new THREE.Mesh(geo, mats(glow, strength));
      m.castShadow = true;
      J[socket.joint].add(m);
      m.position.set(...socket.pos);
      if (socket.rot) m.rotation.set(...socket.rot);
      this.pieces.push(m);
      return m;
    };
    // Hands (skin or gloves) at the ends of the arms, closed round whatever they hold; shoes.
    const P = this._palette ?? {};
    const skin = hexOf(P.J ?? P.F, '#d8a080');
    for (const side of ['handNeg', 'handPos']) piece(handGeometry(skin), K[side]);
    const shoe = hexOf(P.S, '#5a3a24');
    for (const side of ['footNeg', 'footPos']) piece(footGeometry(shoe), K[side]);
    const w = L.weapon;
    if (w) {
      const shape = w.shape ?? w.type;
      if (shape === 'bow') {
        this.bow = piece(weaponGeometry({ shape: 'bow', color: w.color, glow: w.glow }), K.bow, w.glow, 0.7);
      } else {
        const m = piece(weaponGeometry({ shape, color: w.color, glow: w.glow }), K.weapon, w.glow ?? (shape === 'staff' ? '#7ad8ff' : null), shape === 'staff' && !w.glow ? 0.45 : 0.7);
        this._tipOn(m, shape);
      }
      this.weaponShape = shape;
      this.twoHanded = Boolean(w.twoHanded) || shape === 'spear';
    } else this.weaponShape = null;
    const o = L.offhand;
    if (o) {
      const geo = offhandGeometry({ shape: o.shape, color: o.color, glow: o.glow });
      if (o.shape === 'quiver') piece(geo, K.quiver, o.glow, 0.7);
      else if (o.shape === 'tome') piece(geo, K.tome, o.glow, 0.7);
      else this.shield = piece(geo, K.shield, o.glow, 0.7);
    }
    const h = L.head;
    if (h) piece(headGeometry({ shape: h.shape, color: h.color, glow: h.glow }), K.head, h.glow, 0.5).scale.setScalar(K.head.scale ?? 1);
    const c = L.chest;
    // Heavy armour's pauldrons.
    if (c?.weight === 'heavy') {
      piece(pauldronGeometry(c, -1), K.pauldronNeg, c.glow, 0.4);
      piece(pauldronGeometry(c, 1), K.pauldronPos, c.glow, 0.4);
    }
    if (L.cape) {
      // Three strips on hinges, from the shoulders down the back.
      let parent = J.torso;
      const strips = [];
      for (let i = 0; i < 3; i++) {
        const hinge = new THREE.Group();
        if (i === 0) hinge.position.set(...K.cape.pos);
        else hinge.position.set(0, -0.24, 0);
        parent.add(hinge);
        if (i === 0) this.pieces.push(hinge);
        const m = new THREE.Mesh(capeGeometry(L.cape, i), [this.gearMat, L.cape.hem ? this._glowMat(L.cape.hem, 0.35) : this.gearMat, this.metalMat]);
        m.castShadow = true;
        hinge.add(m);
        strips.push({ hinge, s: { x: 0, v: 0 }, sz: { x: 0, v: 0 } });
        parent = hinge;
      }
      this.cape = strips;
    }
  }

  /** The weapon's tip and middle (its trail runs between them), on the piece that holds it. */
  _tipOn(m, shape) {
    this.weapon = this.sword = m;
    const len = weaponLength(shape);
    this.swordTip = new THREE.Object3D();
    this.swordTip.position.set(0, 0, len);
    this.swordMid = new THREE.Object3D();
    this.swordMid.position.set(0, 0, len * 0.3);
    m.add(this.swordTip, this.swordMid);
  }

  /**
   * A sculpted figure's gear: each piece a bone (a group on its socket, which
   * the rig turns as it turned the piece), all of them drawn as one skinned
   * mesh in the vinyl material with one outline; the cape a soft sheet on its
   * three hinges. Pieces not sculpted yet are asked for in the background and
   * appear when ready (_gearMesh).
   */
  _hangSculpted(J, L, K) {
    if (!this.gearSculptMat) this.gearSculptMat = sculptMaterial(this.u, { gloss: 0.45 });
    const pieces = [];
    const bone = (socket, kind, args) => {
      const g = new THREE.Group();
      g.name = `gear-${kind}`;
      J[socket.joint].add(g);
      g.position.set(...socket.pos);
      if (socket.rot) g.rotation.set(...socket.rot);
      this.pieces.push(g);
      pieces.push({ bone: g, kind, args });
      return g;
    };
    const w = L.weapon;
    if (w) {
      const shape = w.shape ?? w.type;
      if (shape === 'bow') this.bow = bone(K.bow, 'weapon', { shape: 'bow', color: w.color, glow: w.glow });
      else {
        // A staff's crystal glows even on a plain one.
        const args = shape === 'staff' && !w.glow ? { shape, color: w.color, glow: '#7ad8ff' } : { shape, color: w.color, glow: w.glow };
        this._tipOn(bone(K.weapon, 'weapon', args), shape);
      }
      this.weaponShape = shape;
      this.twoHanded = Boolean(w.twoHanded) || shape === 'spear';
    } else this.weaponShape = null;
    const o = L.offhand;
    if (o) {
      const args = { shape: o.shape, color: o.color, glow: o.glow };
      if (o.shape === 'quiver') bone(K.quiver, 'offhand', args);
      else if (o.shape === 'tome') bone(K.tome, 'offhand', args);
      else this.shield = bone(K.shield, 'offhand', args);
    }
    const h = L.head;
    if (h) bone(K.head, 'head', { shape: h.shape, color: h.color, glow: h.glow }).scale.setScalar(K.head.scale ?? 1);
    // A great helm closes over the face.
    if (this.face) this.face.root.visible = h?.shape !== 'full';
    this._gear = { pieces, lod: null, merged: {}, mesh: null, hull: null, skeleton: null };
    this._gearPending = pieces.length > 0;
    this._gearMesh();
    if (L.cape) {
      // The cape: one sheet skinned to three hinges down the back, each swinging a little more.
      let parent = J.torso;
      const strips = [];
      for (let i = 0; i < 3; i++) {
        const hinge = new THREE.Group();
        if (i === 0) hinge.position.set(...K.cape.pos);
        else hinge.position.set(0, -CAPE_STEP, 0);
        parent.add(hinge);
        if (i === 0) this.pieces.push(hinge);
        strips.push({ hinge, s: { x: 0, v: 0 }, sz: { x: 0, v: 0 } });
        parent = hinge;
      }
      const geo = smoothCapeGeometry(L.cape);
      const hinges = strips.map((st) => st.hinge);
      this._capeSkeleton = new THREE.Skeleton(hinges, hinges.map((_, i) => new THREE.Matrix4().makeTranslation(0, CAPE_STEP * i, 0)));
      const cape = new THREE.SkinnedMesh(geo, this.skinMat);
      cape.bind(this._capeSkeleton, new THREE.Matrix4());
      cape.castShadow = true;
      cape.receiveShadow = true;
      const ink = new THREE.SkinnedMesh(geo, outlineMaterial(inkFor(L.cape.color), 0.01));
      ink.bind(this._capeSkeleton, new THREE.Matrix4());
      ink.raycast = () => {};
      hinges[0].add(cape, ink);
      this.cape = strips;
    }
  }

  /** (Re)build the one mesh of everything worn at this detail, once its pieces are sculpted. */
  _gearMesh() {
    const G = this._gear;
    if (!G || !G.pieces.length) {
      this._gearPending = false;
      return;
    }
    const want = this.detail === 1 ? 'near' : 'far';
    if (!G.merged.far) {
      const far = G.pieces.map((p) => gearReady(p.kind, p.args, 'far'));
      if (far.every(Boolean)) G.merged.far = mergeGear(far);
    }
    if (want === 'near' && !G.merged.near) {
      const near = G.pieces.map((p) => gearReady(p.kind, p.args, 'near'));
      if (near.every(Boolean)) G.merged.near = mergeGear(near);
    }
    const geo = (want === 'near' && G.merged.near) || G.merged.far;
    this._gearPending = !geo || (want === 'near' && !G.merged.near);
    if (!geo || G.lod === (geo === G.merged.near ? 'near' : 'far')) return;
    G.lod = geo === G.merged.near ? 'near' : 'far';
    if (!G.mesh) {
      // Each piece rides its own bone; the geometry is in the bone's frame (so the inverses are identity).
      G.skeleton = new THREE.Skeleton(G.pieces.map((p) => p.bone), G.pieces.map(() => new THREE.Matrix4()));
      G.mesh = new THREE.SkinnedMesh(geo, this.gearSculptMat);
      G.mesh.bind(G.skeleton, new THREE.Matrix4());
      G.mesh.receiveShadow = true;
      G.hull = new THREE.SkinnedMesh(G.merged.far, outlineMaterial('#20160f', 0.011));
      G.hull.bind(G.skeleton, new THREE.Matrix4());
      G.hull.castShadow = true;
      G.hull.raycast = () => {};
      // Cull by a sphere round the whole figure and its reach.
      G.mesh.boundingSphere = G.hull.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 2.1);
      this.body.add(G.mesh, G.hull);
    } else G.mesh.geometry = geo;
  }

  /** Take the gear mesh down (re-dressing, or gone). */
  _dropGearMesh() {
    const G = this._gear;
    if (G) {
      G.mesh?.removeFromParent();
      G.hull?.removeFromParent();
      G.skeleton?.dispose();
      for (const g of Object.values(G.merged)) g?.dispose();
    }
    this._gear = null;
    this._gearPending = false;
    this._capeSkeleton?.dispose();
    this._capeSkeleton = null;
  }

  get height() {
    if (this._sculptDirty) this._sculpt();
    return (this.joints?.height ?? 1.6) * this.scale;
  }

  /** A blow came from this world direction (radians, as headings): the next flinch goes away from it. */
  hitFrom(angle, strength = 1) {
    const rel = wrap(angle - (this.mesh.rotation.y ?? 0));
    this._hit.x = Math.cos(rel) * strength;
    this._hit.z = Math.sin(rel) * strength;
    if (this.springs) {
      this.springs.hips.kick(-Math.cos(rel) * 9 * strength, 0, Math.sin(rel) * 7 * strength);
      this.springs.head.kick(-Math.cos(rel) * 12 * strength, Math.sin(rel) * 4 * strength, 0);
    }
  }

  /** Per frame: pose from `act`, turn, light. */
  update(dt, yaw, light) {
    this.time += dt;
    if (this._sculptDirty) this._sculpt();
    const J = this.joints;
    if (!J) return;
    this._swapDetail();
    if (this._gear && (this._gearPending || this._gear.lod !== (this.detail === 1 ? 'near' : 'far'))) this._gearMesh();
    const a = this.act ?? {};
    const move = a.move ?? 0;
    const back = Boolean(a.back);
    // The stride: faster when running; backward, the cycle runs the other way (a backpedal).
    if (move > 0.05) this.walk += dt * (7 + move * 4.5) * (back ? -0.85 : 1);
    const s = Math.sin(this.walk);
    const c2 = Math.cos(this.walk);
    // Footfalls: when a leg reaches the front of its swing, it plants.
    const phase = Math.floor(this.walk / Math.PI + 0.5);
    if (move > 0.05 && phase !== this._stepPhase) {
      this.steps++;
      this.onStep?.(phase & 1 ? 'neg' : 'pos');
    }
    this._stepPhase = phase;
    const breathe = Math.sin(this.time * 2.2);
    const shape = this.weaponShape;
    // Weight: the body is lowest just as a foot plants, highest as the legs pass; it sways over the standing leg.
    const plant = 1 - Math.abs(s);
    let hipsRx = move * (back ? -0.05 : 0.1), hipsRy = s * 0.13 * move, hipsRz = -s * 0.05 * move, bodyRx = 0, bodyRy = 0;
    let lift = this.lift + (plant * plant) * 0.07 * move - 0.015 * move;
    let headRx = breathe * 0.02 - move * 0.04, headRy = -hipsRy * 0.7;
    // Legs: a fast swing forward, a slower push back (the foot stays down longer).
    const stride = (x) => (x > 0 ? Math.pow(x, 0.8) : -Math.pow(-x, 1.15));
    const legYaw = Math.max(-0.9, Math.min(0.9, (a.moveYaw ?? 0) * 0.55));
    let aN = [s * 0.6 * move + breathe * 0.03, 0, -0.1 - move * 0.06];
    let aP = [-s * 0.6 * move - breathe * 0.03, 0, 0.1 + move * 0.06];
    let lN = [-stride(s) * 0.75 * move, legYaw, 0];
    let lP = [stride(s) * 0.75 * move, legYaw, 0];
    void c2;
    let grip = -0.35;
    let squash = this.squash + breathe * 0.008 - plant * 0.02 * move;
    // Idle: now and then a look round, a stretch, a weight shift, a glance at the weapon.
    const idle = move < 0.05 && !a.swing && !a.pose && !a.talk && !a.guard && a.spin == null && a.cast == null && a.roll == null && !a.dead && !(a.hurt > 0) && !a.twist;
    const I = this._idle;
    if (idle) {
      I.t += dt;
      if (!I.kind && I.t > I.next) {
        const kinds = this.weaponShape ? ['look', 'stretch', 'shift', 'weapon'] : ['look', 'stretch', 'shift', 'look'];
        I.kind = kinds[Math.floor(Math.random() * kinds.length)];
        I.dur = { look: 2.6, stretch: 1.9, shift: 2.2, weapon: 1.8 }[I.kind];
        I.k = 0;
      }
    } else {
      I.t = 0;
      I.kind = null;
    }
    if (I.kind) {
      I.k += dt / I.dur;
      const k = clamp01(I.k);
      const bell = Math.sin(k * Math.PI);
      if (I.kind === 'look') {
        headRy += Math.sin(k * TAU) * 0.75;
        headRx += -0.08 * bell;
      } else if (I.kind === 'stretch') {
        aN = [lerp(aN[0], -2.9, bell), 0, -0.35 * bell];
        aP = [lerp(aP[0], -2.9, bell), 0, 0.35 * bell];
        hipsRx -= 0.14 * bell;
        headRx -= 0.25 * bell;
        squash += 0.03 * bell;
      } else if (I.kind === 'shift') {
        hipsRz += 0.07 * bell;
        lift -= 0.02 * bell;
        lN = [0.12 * bell, 0, -0.08 * bell];
        headRx += 0.05 * bell;
      } else if (I.kind === 'weapon') {
        aN = [lerp(aN[0], -1.25, bell), 0.35 * bell, -0.1];
        grip = lerp(grip, 0.6, bell);
        headRy += 0.35 * bell;
        headRx += 0.25 * bell;
      }
      if (I.k >= 1) {
        I.kind = null;
        I.t = 0;
        I.next = 5 + Math.random() * 6;
      }
    }
    if (shape === 'bow') aP = [-0.35 - s * 0.2 * move, 0, 0.12];
    else if (shape === 'staff') {
      aN = [-0.3 + s * 0.15 * move, 0, -0.12];
      grip = -1.15;
    } else if (shape === 'spear') {
      aN = [-0.45 + s * 0.15 * move, 0, -0.1];
      aP = [-0.6 - s * 0.15 * move, -0.4, 0.2];
      grip = 0.2;
    } else if (shape === 'longsword') {
      aN = [-0.75 + s * 0.08 * move, 0.35, 0.25];
      aP = [-0.75 + s * 0.08 * move, -0.35, -0.25];
      grip = -0.55;
    }
    if (this.shield && !a.guard) aP = [aP[0] - 0.15, -0.5, 0.1];
    // Talking: a hand moves as they speak, the head nods.
    if (a.talk) {
      aP = [-0.6 - Math.abs(Math.sin(this.time * 3.1)) * 0.6, 0, 0.25 + Math.sin(this.time * 2.3) * 0.2];
      headRx += Math.sin(this.time * 4.2) * 0.06;
    }
    // The basic attack, by weapon.
    if (a.swing) {
      const t = a.swing.t;
      const wind = Math.min(1, t / 0.28);
      const strike = ease(clamp01((t - 0.18) / 0.5));
      const two = shape === 'longsword';
      switch (a.swing.pose ?? 'sweepR') {
        case 'sweepR':
        case 'heavyR': {
          const big = a.swing.pose === 'heavyR' ? 1.25 : 1;
          aN = [lerp(-0.4, -1.45, wind), lerp(-1.3 * big, 1.5 * big, strike), lerp(-1.2, -1.45, wind)];
          hipsRy = lerp(-0.45 * big, 0.6 * big, strike);
          aP = two ? [aN[0], aN[1], -aN[2]] : [0.3, 0, 0.35];
          lN = [-0.3, 0, 0];
          lP = [0.35, 0, 0];
          break;
        }
        case 'sweepL':
        case 'heavyL': {
          const big = a.swing.pose === 'heavyL' ? 1.25 : 1;
          aN = [lerp(-1.3, -1.5, wind), lerp(1.6 * big, -1.2 * big, strike), lerp(-1.4, -1.1, wind)];
          hipsRy = lerp(0.7 * big, -0.55 * big, strike);
          aP = two ? [aN[0], aN[1], -aN[2]] : [0.2, 0, 0.45];
          lN = [0.35, 0, 0];
          lP = [-0.3, 0, 0];
          break;
        }
        case 'smash':
          aN = [lerp(-0.6, -3.0, out(wind)) + strike * 3.6, 0, -0.15];
          aP = [lerp(-0.4, -2.6, out(wind)) + strike * 3.0, 0, 0.15];
          if (two || shape === 'axe' || shape === 'mace') aP = [aN[0], 0, 0.3];
          hipsRx = lerp(-0.25, 0.42, strike);
          lift += Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.32;
          lN = [lerp(-0.5, 0.3, strike), 0, 0];
          lP = [lerp(0.2, -0.5, strike), 0, 0];
          squash += strike > 0.95 ? -0.08 : 0;
          break;
        case 'jabR':
        case 'jabL': {
          const k = Math.sin(clamp01(t) * Math.PI);
          const side = a.swing.pose === 'jabR' ? 1 : -1;
          aN = [lerp(-0.5, -1.6, k), side * 0.35 * (1 - k), lerp(-0.1, 0.3, k)];
          grip = lerp(2.4, 1.6, k);
          hipsRy = side * lerp(-0.35, 0.25, k);
          hipsRx = 0.12 * k;
          lN = [-0.35 * k, 0, 0];
          lP = [0.3 * k, 0, 0];
          break;
        }
        case 'stab':
        case 'thrust': {
          const k = out(clamp01((t - 0.15) / 0.45)) * (1 - clamp01((t - 0.75) / 0.25) * 0.6);
          aN = [lerp(-0.6, -1.55, k), lerp(0.25, 0.05, k), lerp(0.1, 0.25, k)];
          aP = shape === 'spear' ? [lerp(-0.7, -1.3, k), lerp(-0.6, -0.3, k), -0.2] : [0.25, 0, 0.3];
          grip = -aN[0] + (shape === 'spear' ? -0.05 : a.swing.pose === 'stab' ? 0.9 : 0);
          hipsRx = lerp(-0.1, 0.3, k);
          hipsRy = lerp(-0.25, 0.1, k);
          lN = [lerp(0, -0.7, k), 0, 0];
          lP = [lerp(0, 0.5, k), 0, 0];
          break;
        }
        case 'bolt':
        case 'bolt3': {
          const k = Math.sin(clamp01(t) * Math.PI);
          aN = [lerp(-0.4, -1.5, k), 0, -0.1];
          grip = lerp(-1.15, 0.85, k);
          aP = a.swing.pose === 'bolt3' ? [lerp(0, -1.4, k), 0, lerp(0.1, -0.5, k)] : [0.2 * k, 0, 0.3 + 0.2 * k];
          hipsRx = -0.12 * k;
          hipsRy = 0.2 * k;
          break;
        }
        case 'shot':
        case 'power': {
          const draw = a.swing.pose === 'power' ? clamp01(t / 0.7) : clamp01(t / 0.55);
          const loose = a.swing.pose === 'power' ? t > 0.7 : t > 0.55;
          aP = [-1.5, 0.15, -0.05];
          aN = loose ? [-1.45, 0, 0.1] : [lerp(-1.45, -1.25, draw), 0, lerp(0.15, 0.85, draw)];
          hipsRy = -0.35;
          headRy = 0.3;
          hipsRx = a.swing.pose === 'power' && !loose ? -0.12 * draw : 0;
          lN = [0.25, 0, 0];
          lP = [-0.3, 0, 0];
          break;
        }
        default:
      }
    }
    // Skills.
    const p = a.pose;
    if (p) {
      const t = clamp01(p.t);
      const k = Math.sin(t * Math.PI);
      switch (p.id) {
        case 'lunge':
          hipsRx = 0.45 * k;
          aN = [-1.5, 0, 0.1];
          grip = 1.5;
          aP = [0.6 * k, 0, 0.5];
          lN = [-1.0 * k, 0, 0];
          lP = [0.7 * k, 0, 0];
          lift += 0.1 * k;
          break;
        case 'overhead': {
          const wind = Math.min(1, t / 0.35);
          const strike = ease(clamp01((t - 0.3) / 0.4));
          aN = [lerp(-0.6, -3.2, out(wind)) + strike * 3.8, 0, -0.1];
          aP = [aN[0], 0, 0.2];
          hipsRx = lerp(-0.35, 0.5, strike);
          lift += Math.sin(Math.min(1, t * 1.5) * Math.PI) * 0.45;
          lN = [lerp(-0.6, 0.4, strike), 0, 0];
          lP = [lerp(0.3, -0.6, strike), 0, 0];
          break;
        }
        case 'bash':
          aP = [lerp(-0.6, -1.25, k), -1.35, lerp(0, -0.45, k)];
          hipsRy = lerp(0, 0.5, k);
          hipsRx = 0.25 * k;
          aN = [0.4 * k, 0, -0.3];
          lN = [-0.6 * k, 0, 0];
          lP = [0.5 * k, 0, 0];
          break;
        case 'plant':
          lift -= 0.18 * k;
          hipsRx = 0.35 * k;
          lN = [-1.3 * k, 0, 0];
          lP = [0.5 * k, 0, 0];
          aN = [lerp(-0.2, -0.9, k), 0, 0.2];
          aP = [lerp(-0.2, -0.7, k), 0, -0.2];
          break;
        case 'slam': {
          const up = Math.min(1, t / 0.45);
          const down = ease(clamp01((t - 0.45) / 0.3));
          aN = [lerp(-0.4, -3.0, up) + down * 3.3, 0, -0.2];
          aP = [lerp(-0.4, -3.0, up) + down * 3.3, 0, 0.2];
          lift += Math.sin(Math.min(1, t / 0.75) * Math.PI) * 0.6;
          hipsRx = lerp(-0.3, 0.5, down);
          squash += down > 0.95 ? -0.12 : 0;
          break;
        }
        case 'nova':
          aN = [-0.2, 0, lerp(-0.2, -1.6, out(t))];
          aP = [-0.2, 0, lerp(0.2, 1.6, out(t))];
          headRx = -0.25 * k;
          lift += 0.2 * k;
          lN = [0, 0, -0.25 * k];
          lP = [0, 0, 0.25 * k];
          break;
        case 'raise':
          aN = [lerp(-0.4, -2.9, out(t)), 0, 0.1];
          grip = lerp(-1.15, 1.35, out(t));
          aP = [-0.4, 0, lerp(0.2, 1.1, k)];
          headRx = -0.35 * k;
          break;
        case 'draw':
          aP = [-1.5, 0.4 * k, -0.05];
          aN = [-1.25, 0, lerp(0.1, 0.95, k)];
          hipsRy = -0.45;
          headRy = 0.35;
          lN = [0.3, 0, 0];
          lP = [-0.35, 0, 0];
          break;
        case 'skyshot':
          aP = [-2.4, 0.1, -0.05];
          aN = [-2.0, 0, lerp(0.15, 0.9, k)];
          headRx = -0.5;
          hipsRx = -0.2;
          break;
        case 'cast':
          aN = [-1.5 * k, 0, -0.2];
          aP = [-1.5 * k, 0, 0.2];
          hipsRx = -0.15 * k;
          break;
        default:
      }
    }
    // Guard: the shield up in front, a low stance.
    if (a.guard) {
      aP = [-0.65, -1.35, -0.4];
      aN = [0.2, 0, -0.35];
      lN = [-0.35, 0, -0.1];
      lP = [0.35, 0, 0.1];
      squash -= 0.04;
      hipsRx = Math.max(hipsRx, 0.12);
    }
    // The whirl: arms out, a full turn.
    if (a.spin != null) {
      bodyRy = ease(a.spin) * Math.PI * 2;
      aN = [-1.45, 0, -1.4];
      aP = [0, 0, 1.4];
      lift += Math.sin(a.spin * Math.PI) * 0.15;
    }
    // Casting: both hands thrust forward.
    if (a.cast != null) {
      const k = Math.sin(Math.min(1, a.cast) * Math.PI);
      aN = [-1.5 * k + aN[0] * (1 - k), 0, -0.2];
      aP = [-1.5 * k + aP[0] * (1 - k), 0, 0.2];
      if (shape === 'staff') grip = lerp(grip, 0.9, k);
      hipsRx = -0.15 * k;
    }
    // The roll: tucked, a somersault forward.
    if (a.roll != null) {
      bodyRx = a.roll * Math.PI * 2;
      aN = [-1.2, 0, -0.3];
      aP = [-1.2, 0, 0.3];
      lN = [-1.4, 0, 0];
      lP = [-1.4, 0, 0];
      lift += 0.35 * Math.sin(a.roll * Math.PI);
    }
    // Hit: a flinch back.
    if (a.hurt > 0) {
      hipsRx -= a.hurt * 0.45 * (this._hit.x || 1);
      hipsRz += a.hurt * 0.35 * this._hit.z;
      headRx -= a.hurt * 0.3;
    }
    // Beaten: down on the back.
    if (a.dead) {
      this._deadT = Math.min(1, (this._deadT ?? 0) + dt * 2.5);
      bodyRx = -out(this._deadT) * Math.PI / 2;
      lift = out(this._deadT) * 0.15;
    } else this._deadT = 0;

    // Aiming: the upper body turns from the legs toward the aim (the legs keep stepping their own way).
    if (a.twist) hipsRy += a.twist;
    // The head turns toward what it looks at (a foe, someone talking), within reason.
    if (this.lookAt && !a.dead) {
      const wx = this.lookAt.x - this.group.position.x, wz = this.lookAt.z - this.group.position.z;
      if (wx * wx + wz * wz > 0.25) {
        const rel = wrap(Math.atan2(wx, wz) - this.mesh.rotation.y - bodyRy - hipsRy);
        headRy = Math.max(-1.05, Math.min(1.05, rel)) * 0.85 + headRy * 0.2;
        if (Math.abs(rel) > 0.9 && !a.swing && !a.pose) hipsRy += Math.sign(rel) * Math.min(0.35, Math.abs(rel) - 0.9);
      }
    }
    // Turning quickly: the body leans into the turn.
    const f = this.facing ?? yaw;
    if (this._prevFacing != null && dt > 0) this._turnRate += (wrap(f - this._prevFacing) / dt - this._turnRate) * Math.min(1, dt * 10);
    this._prevFacing = f;
    hipsRz += Math.max(-0.12, Math.min(0.12, -this._turnRate * 0.02)) * move;

    // Apply: each joint springs toward its pose (fast for strikes, softer for the head).
    const S = this.springs;
    const fast = a.swing || a.pose || a.spin != null || a.roll != null ? 34 : undefined;
    S.armNeg.to(aN, dt, fast);
    S.armPos.to(aP, dt, fast);
    S.legNeg.to(lN, dt, fast);
    S.legPos.to(lP, dt, fast);
    S.hips.to([hipsRx, hipsRy, hipsRz], dt, a.spin != null ? 40 : fast ? 28 : undefined);
    S.head.to([headRx, headRy, 0], dt);
    if (this.weapon) this.weapon.rotation.x += (grip - this.weapon.rotation.x) * Math.min(1, dt * 24);
    // A bow stays upright in the hand (tipped back to shoot at the sky).
    if (this.bow) this.bow.rotation.x = -J.armPos.rotation.x + (p?.id === 'skyshot' ? -0.9 : 0);
    // The cape trails behind: more when moving, swinging out on turns, a ripple always.
    if (this.cape) {
      this.speed += ((move > 0.05 ? 1 : 0) - this.speed) * Math.min(1, dt * 4);
      this.cape.forEach((strip, i) => {
        const want = -(0.12 + this.speed * 0.38 + (a.roll != null ? 0.6 : 0)) * (i === 0 ? 1 : 0.35) + Math.sin(this.time * 3.1 + i * 0.9) * 0.05 * (1 + this.speed) - (i === 0 ? J.hips.rotation.x * 0.8 : 0);
        strip.hinge.rotation.x = springStep(strip.s, Math.min(0.2, want) * -1, dt, 9 - i, 0.35);
        strip.hinge.rotation.z = springStep(strip.sz, Math.max(-0.4, Math.min(0.4, this._turnRate * 0.05)) * (i + 1) * 0.6, dt, 7, 0.4);
      });
    }
    // The face (sculpted): it shows what the body is doing; the eyes follow what the head looks at.
    if (this.face) {
      this.face.set(heroExpression(a, { hostile: this._desc?.hostile }));
      this.face.update(dt);
    }
    // Blink.
    this._blink -= dt;
    if (this.partMeshes?.head) {
      if (this._blink < 0.11 && !a.dead) {
        this._blinkGeo ??= voxelParts(this.sprite, { step: this._detail }).blinkHead;
        if (this._blinkGeo) this.partMeshes.head.geometry = this._blinkGeo;
      } else this.partMeshes.head.geometry = voxelParts(this.sprite, { step: this._detail }).parts.head;
      if (this._blink < 0) this._blink = 2.2 + Math.random() * 3.5;
    }
    // Somersaults and spins turn the body whole, straight away.
    this.body.rotation.order = 'YXZ';
    this.body.rotation.x = bodyRx;
    this.body.rotation.y = bodyRy;
    // A somersault turns about the middle of the body, not the feet.
    const mid = J.hipY * this.scale;
    this.body.position.set(0, lift, 0);
    if (bodyRx && !a.dead) {
      this.body.position.y = lift + mid - Math.cos(bodyRx) * mid;
      this.body.position.z = Math.sin(bodyRx) * mid;
    } else this.body.position.z = 0;
    this.body.scale.set(this.scale * (1 - squash * 0.6), this.scale * (1 + squash), this.scale * (1 - squash * 0.6));
    this.mesh.rotation.y = this.facing ?? yaw;
    // Light, flash, the gear's glint.
    if (this.flash > 0) this.flash -= dt;
    this.material.color.copy(this.tint);
    this.gearMat.color.copy(this.tint);
    this.metalMat.color.copy(this.tint);
    this.gearSculptMat?.color.copy(this.tint);
    lightFigure(this.u, light, { glow: this.glow, glowColor: this.glowColor, flash: this.flash, time: this.time });
    for (const m of this.glowMats) m.emissiveIntensity = m.userData.base * (0.75 + 0.35 * Math.sin(this.time * 4 + m.id));
    if (this.shadow) this.shadow.material.opacity = Math.max(0.3, 1 - lift * 0.5) * 0.7;
    // Where the weapon's tip and middle are (for its trail).
    if (this.swordTip) {
      this.group.updateMatrixWorld(true);
      this.swordTip.getWorldPosition(this.tip);
      this.swordMid.getWorldPosition(this.mid);
    } else if (this.bow) {
      this.group.updateMatrixWorld(true);
      this.bow.getWorldPosition(this.tip);
      this.mid.copy(this.tip);
    } else if (this.joints) {
      this.group.updateMatrixWorld(true);
      J.armNeg.localToWorld(this.tip.set(0, -J.armLength, 0.1));
      this.mid.copy(this.tip);
    }
  }

  /** Where the main hand's weapon tip is in the world (a staff's crystal, a bow's grip). */
  tipWorld(out = new THREE.Vector3()) {
    return out.copy(this.tip);
  }

  dispose() {
    this.voxelMat.dispose();
    this.skinMat?.dispose();
    this.gearSculptMat?.dispose();
    this.skeleton?.dispose();
    this._dropGearMesh();
    this.face?.dispose();
    this.gearMat.dispose();
    this.metalMat.dispose();
    for (const m of this.glowMats) m.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}

/**
 * A weapon's trail: a ribbon between where the blade's middle and tip have
 * been over the last moments, bright at the blade, fading behind it, in the
 * strike's colour.
 */
export class SwordTrail {
  constructor(scene, length = 14) {
    this.n = length;
    this.points = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(length * 2 * 3);
    this.alpha = new Float32Array(length * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < length - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.color = { value: new THREE.Color(2.2, 1.9, 1.3) };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uColor: this.color },
      vertexShader: 'attribute float aAlpha; varying float vA; void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uColor * vA, vA); }',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    scene.add(this.mesh);
  }

  /** Each frame: `on` while the blade is swinging; the colour of this strike. */
  update(tip, mid, on, color = null) {
    if (color) this.color.value.copy(color);
    if (on) this.points.unshift([tip.clone(), mid.clone()]);
    else this.points.splice(Math.max(0, this.points.length - 2));
    if (this.points.length > this.n) this.points.length = this.n;
    for (let i = 0; i < this.n; i++) {
      const p = this.points[i] ?? this.points[this.points.length - 1];
      const fade = p && i < this.points.length ? (1 - i / this.n) ** 1.4 : 0;
      for (let k = 0; k < 2; k++) {
        if (p) this.pos.set(p[k].toArray(), (i * 2 + k) * 3);
        this.alpha[i * 2 + k] = fade * (k === 0 ? 1 : 0.35);
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
