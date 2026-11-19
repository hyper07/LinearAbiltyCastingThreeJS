/**
 * The hunter: a polyfork body (CC BY 4.0) with Gloamreach's material
 * upgrade, Mesh2Motion's clips retargeted on (greatblade swings, bow draws,
 * rolls, a whistle, gathering, carving, drinking, riding), Gloamreach's
 * armour on its bones for each look, the two weapons carried — drawn in the
 * hands or sheathed on the back — and the motion: speed with weight, turns
 * that carve arcs at a sprint, a lean into them, footsteps (splashing in the
 * shallows), and moves that carry the body (a roll, a lunge, a knock-back).
 */
import * as THREE from 'three';
import { loadTemplate, BORROWED } from '../gloamreach/actors.js';
import { FighterActor } from '../gloamreach/fighter.js';
import { GearRig, learnFrames } from '../gloamreach/gearRig.js';
import { makeItem } from '../gloamreach/items.js';
import { twistSplit, legMotion } from '../hd2d/aim.js';
import { rng } from '../gloamreach/noise.js';
import { surfaceAt, waterAt } from './heights.js';
import { ARMS } from './cast.js';

// More of Mesh2Motion's human clips, under the names the hunt uses.
Object.assign(BORROWED, {
  GreatSwing: 'two-handed-horizontal-swing',
  SlashB: 'sword-regular-b',
  Overhead: 'two-handed-overhead-slam',
  PowerUp: 'power-up',
  Ride: 'mount-idle',
  Gather: 'farm-harvest',
  Carve: 'fixing-kneeling',
  Drink: 'consume',
  Whistle: 'idle-rail-call',
  Sheathe: 'weapon-draw',
  Cower: 'shiver',
  GetUp: 'laytoidle',
  Sharpen: 'interact',
  Dodge: 'roll',
  PickUp: 'pick-up'
});

export const HUNTER_CLIPS = ['JumpStart', 'JumpAir', 'JumpLand', 'Sprint', 'GreatSwing', 'SlashB', 'Overhead', 'PowerUp', 'Shoot', 'Draw', 'Roll', 'Hit', 'Knock', 'Die', 'Ride', 'Gather', 'Carve', 'Drink', 'Whistle', 'Sheathe', 'Cower', 'GetUp', 'Sharpen', 'Slash1', 'Slash2', 'Charge', 'FightIdle', 'WalkBack', 'PickUp'];

export const SPEEDS = { walk: 1.6, run: 4.6, sprint: 7.2, drawn: 3.4 };

const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** An item of `base` in fixed colours (the look's armour, the hunter's weapons). */
export function fixedItem(base, { metal = 'steel', cloth = '#3a5a2a', leather = '#4a3020', rarity = 'rare', seed = 7 } = {}) {
  const r = rng(seed);
  const it = makeItem(base, rarity, 6, r);
  if (!it) return null;
  it.look.metal = metal;
  it.look.cloth = cloth;
  it.look.leather = leather;
  it.look.gem = null;
  return it;
}

/** Everything one look wears, plus the weapon in hand. */
export function equipFor(look, weapon = 'greatblade') {
  const eq = {};
  for (const [slot, base] of Object.entries(look.equip)) eq[slot] = fixedItem(base, { ...look.colors, seed: base.length * 31 });
  const a = ARMS[weapon];
  eq.mainhand = fixedItem(a.base, { metal: a.metal, leather: look.colors.leather, cloth: look.colors.cloth, rarity: a.rarity, seed: 99 });
  if (weapon === 'bow') eq.offhand = fixedItem('quiver', { leather: look.colors.leather, seed: 5 });
  return eq;
}

export async function loadLook(look, detail) {
  const tpl = await loadTemplate(look.model, { detail, borrow: HUNTER_CLIPS });
  if (tpl) learnFrames([tpl]);
  return tpl;
}

/**
 * A dressed body: actor, armour, weapons. `sheathe(true)` puts the weapon on
 * the back; `setWeapon('bow')` swaps what is carried.
 */
export class Kit {
  constructor(tpl, look, { scene, weapon = 'greatblade' }) {
    this.look = look;
    this.actor = new FighterActor(tpl, { height: look.height, name: look.name });
    this.rig = new GearRig(this.actor, tpl, { hero: look.rig, scene });
    this.weapon = weapon;
    this.sheathed = true;
    this.dress();
  }

  dress() {
    this.rig.dress(equipFor(this.look, this.weapon));
    const w = this.rig.weapon?.obj;
    if (w) {
      this.handBone = w.parent;
      this.handMatrix = w.matrix.clone();
    }
    this.sheathe(this.sheathed, true);
  }

  setWeapon(id) {
    if (id === this.weapon) return;
    this.weapon = id;
    this.dress();
  }

  /** Weapon on the back (true) or in the hands. */
  sheathe(on, force = false) {
    if (on === this.sheathed && !force) return;
    this.sheathed = on;
    const w = this.rig.weapon?.obj;
    const back = this.actor.bones.Spine2;
    if (!w || !back || !this.handBone) return;
    const k = 1 / (this.actor.scaleK || 1);
    if (on) {
      back.add(w);
      // Diagonally across the back, flat to it: the grip over the right shoulder (the bow the other way).
      const bow = this.weapon === 'bow';
      w.position.set((bow ? 0.1 : -0.12) * k, (bow ? 0.02 : 0.16) * k, -0.2 * k);
      w.quaternion.setFromEuler(new THREE.Euler(0, 0, bow ? 2.75 : 3.6));
      w.scale.setScalar(1);
    } else {
      this.handBone.add(w);
      this.handMatrix.decompose(w.position, w.quaternion, w.scale);
    }
  }

  update(dt, root) {
    this.rig.update(dt, root);
  }

  dispose() {
    this.rig.dispose();
    this.actor.dispose();
  }
}

/** The hunter on foot: input to motion. */
export class Hunter {
  constructor(actor, { colliders, onStep = () => {} }) {
    this.actor = actor;
    this.object = actor.object;
    this.colliders = colliders;
    this.onStep = onStep;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.yaw = 0;
    this.yawRate = 0;
    this.lean = 0;
    this.pitch = 0;
    this.speed = 0;
    this.feet = { L: false, R: false };
    this.aimYaw = null;
    this.force = null;
    this.moveScale = 1;
    this.speedCap = SPEEDS.sprint;
    this.riding = null;
    this.tilt = new THREE.Group();
    this.object.add(this.tilt);
    this.tilt.add(actor.model);
  }

  place(x, z, yaw) {
    this.pos.set(x, this.colliders.height(x, z), z);
    this.yaw = yaw;
    this.vel.set(0, 0);
    this.object.position.copy(this.pos);
    this.object.rotation.y = yaw;
  }

  /** One step on foot. `input` { x, z, sprint, walk }; `camYaw` the camera's heading. */
  update(dt, input, camYaw) {
    const a = this.actor;
    const mag = Math.min(1, Math.hypot(input.x, input.z)) * (this.moveScale > 0.01 ? 1 : 0);
    let want = 0;
    let dirYaw = this.yaw;
    if (mag > 0.05) {
      const s = Math.sin(camYaw);
      const c = Math.cos(camYaw);
      const wx = -input.x * c + input.z * s;
      const wz = input.x * s + input.z * c;
      dirYaw = Math.atan2(wx, wz);
      const top = input.walk ? SPEEDS.walk : input.sprint && this.aimYaw == null ? SPEEDS.sprint : SPEEDS.run;
      want = Math.min(top, this.speedCap) * mag * Math.min(1, this.moveScale);
    }
    let bodyYaw = dirYaw;
    let twist = 0;
    let back = false;
    if (this.aimYaw != null) {
      if (mag > 0.05) {
        const split = twistSplit(dirYaw, this.aimYaw);
        if (split.full) {
          bodyYaw = this.aimYaw;
          back = legMotion(this.aimYaw, dirYaw).back;
          if (back) want *= 0.7;
        } else twist = split.twist;
      } else bodyYaw = this.aimYaw;
    }
    const cur = this.vel.length();
    const accel = want > cur ? (cur < 2 ? 9 : 5.5) : 11;
    let sp = cur + (want - cur) * (1 - Math.exp(-accel * dt));
    const diff = wrap(bodyYaw - this.yaw);
    if (mag > 0.05 || this.aimYaw != null) {
      const rate = this.aimYaw != null ? 14 : THREE.MathUtils.lerp(13, 4.4, THREE.MathUtils.clamp(sp / SPEEDS.sprint, 0, 1));
      const turn = THREE.MathUtils.clamp(diff, -rate * dt, rate * dt);
      this.yaw = wrap(this.yaw + turn);
      this.yawRate += (turn / Math.max(dt, 1e-4) - this.yawRate) * Math.min(1, dt * 10);
      if (Math.abs(diff) > 2.2 && sp > 3 && this.aimYaw == null) sp *= Math.exp(-6 * dt);
    } else this.yawRate *= Math.exp(-8 * dt);
    const travelYaw = this.aimYaw != null ? dirYaw : mag > 0.05 && Math.abs(diff) < 1.2 ? this.yaw + diff * 0.35 : this.yaw;
    this.vel.set(Math.sin(travelYaw) * sp, Math.cos(travelYaw) * sp);
    if (this.force) {
      const f = this.force;
      this.vel.set(f.vx, f.vz);
      sp = Math.hypot(f.vx, f.vz);
      f.t -= dt;
      if (f.yaw != null) this.yaw = f.yaw;
      if (f.t <= 0) this.force = null;
    }
    if (a.twist !== undefined) {
      a.twist = twist;
      a.reverse = back;
    }
    const [nx, nz] = this.colliders.move(this.pos.x, this.pos.z, this.vel.x * dt, this.vel.y * dt, 0.38, this.pos.y);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.x = nx;
    this.pos.z = nz;
    const ground = this.colliders.height(nx, nz);
    this.pos.y += (ground - this.pos.y) * (1 - Math.exp(-dt * 20));
    if (Math.abs(ground - this.pos.y) > 1.5) this.pos.y = ground;
    // Wading slows you.
    const water = waterAt(nx, nz) - ground;
    this.wade = Math.max(0, Math.min(1, water / 0.8));
    this.speed = Math.min(sp, moved + 0.2) * (1 - this.wade * 0.35);
    a.move(this.force?.still ? 0 : this.speed);
    const wantLean = THREE.MathUtils.clamp(-this.yawRate * this.speed * 0.022, -0.3, 0.3);
    this.lean += (wantLean - this.lean) * Math.min(1, dt * 6);
    const push = THREE.MathUtils.clamp((want - cur) * 0.03, -0.08, 0.1);
    const sprintLean = THREE.MathUtils.smoothstep(this.speed, SPEEDS.run, SPEEDS.sprint) * 0.12;
    this.pitch += (push + sprintLean - this.pitch) * Math.min(1, dt * 5);
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
    this.tilt.rotation.set(this.pitch, 0, this.lean);
    a.update(dt);
    this._feet();
  }

  _feet() {
    const a = this.actor;
    if (this.speed < 0.6) return;
    for (const side of ['Left', 'Right']) {
      const bone = a.bones[`${side}Foot`];
      if (!bone) continue;
      const p = bone.getWorldPosition(new THREE.Vector3());
      const h = p.y - this.pos.y;
      const key = side[0];
      const down = h < 0.12 * (a.scaleK ?? 1) + 0.06;
      if (down && !this.feet[key]) this.onStep(surfaceAt(p.x, p.z), this.speed, p);
      this.feet[key] = down;
    }
  }
}
