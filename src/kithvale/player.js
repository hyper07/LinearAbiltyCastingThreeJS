/**
 * You: a young adventurer — a polyfork body (CC BY 4.0) with Gloamreach's
 * material upgrade and Mesh2Motion's clips retargeted on (a jump, a sprint,
 * a crouching creep, a throw, a kneel, a pick-up, a glide, a cheer) — and
 * the motion, adapted from Gloamreach's hero: speed with weight, turns that
 * carve arcs at a run, a lean into them, a jump with a crouch and a landing
 * dip; and new here, sneaking (slow, crouched, near silent) and, with a
 * Puffwool friend, a higher jump and a slow float down while jump is held.
 */
import * as THREE from 'three';
import { loadTemplate, BORROWED } from '../gloamreach/actors.js';
import { FighterActor } from '../gloamreach/fighter.js';
import { surfaceAt, depthAt } from './heights.js';

Object.assign(BORROWED, {
  CrouchIdle: 'crouch-idle',
  CrouchWalk: 'crouch-walk',
  Throw: 'throw-ball',
  Kneel: 'kneel',
  PickUp: 'pick-up',
  Glide: 'glide',
  Victory: 'victory',
  Dig: 'farm-plantseed',
  Water: 'farm-watering',
  Sweep: 'farm-harvest',
  Wave: 'greeting'
});

export const PLAYER_CLIPS = ['JumpStart', 'JumpAir', 'JumpLand', 'Sprint', 'CrouchIdle', 'CrouchWalk', 'Throw', 'Kneel', 'PickUp', 'Glide', 'Victory', 'Cheer', 'Dig', 'Wave', 'LookAround'];
export const SPEEDS = { sneak: 1.45, walk: 1.7, run: 4.6, sprint: 7.0 };
const GRAVITY = 19;

const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export async function loadLook(look, detail) {
  return loadTemplate(look.model, { detail, borrow: PLAYER_CLIPS, rim: 0.75 });
}

export class Player {
  constructor(actor, { colliders, onStep = () => {}, onLand = () => {} }) {
    this.actor = actor;
    this.object = actor.object;
    this.colliders = colliders;
    this.onStep = onStep;
    this.onLand = onLand;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.vy = 0;
    this.yaw = 0;
    this.yawRate = 0;
    this.lean = 0;
    this.pitch = 0;
    this.grounded = true;
    this.airT = 0;
    this.land = 0;
    this.speed = 0;
    this.sneaking = false;
    this.floating = false;
    this.busy = 0;
    this.feet = { L: false, R: false };
    this.tilt = new THREE.Group();
    this.object.add(this.tilt);
    this.tilt.add(actor.model);
  }

  place(x, z, yaw) {
    this.pos.set(x, this.colliders.height(x, z), z);
    this.yaw = yaw;
    this.vel.set(0, 0);
    this.vy = 0;
    this.grounded = true;
    this.object.position.copy(this.pos);
    this.object.rotation.y = yaw;
  }

  /** Play a one-shot (kneel, throw, pick up…) and stand still for `hold` seconds. */
  perform(clip, hold = 0.8, speed = 1.3) {
    this.actor.act(clip, { loop: false, fade: 0.12, speed });
    this.busy = hold;
  }

  /**
   * One step. `input`: { x, z (−1…1, camera-relative), sprint, sneak, jump, jumpHeld }.
   * `camYaw`: the camera's heading. `abilities`: { float }.
   */
  update(dt, input, camYaw, abilities = {}) {
    const a = this.actor;
    this.busy = Math.max(0, this.busy - dt);
    const still = this.busy > 0;
    const mag = still ? 0 : Math.min(1, Math.hypot(input.x, input.z));
    const sneak = Boolean(input.sneak) && this.grounded;
    let want = 0;
    let dirYaw = this.yaw;
    if (mag > 0.05) {
      const s = Math.sin(camYaw);
      const c = Math.cos(camYaw);
      const wx = -input.x * c + input.z * s;
      const wz = input.x * s + input.z * c;
      dirYaw = Math.atan2(wx, wz);
      const top = sneak ? SPEEDS.sneak : input.walk ? SPEEDS.walk : input.sprint ? SPEEDS.sprint : SPEEDS.run;
      want = top * mag * (1 - (this.wade ?? 0) * 0.35);
    }
    const control = this.grounded ? 1 : 0.3;
    const cur = this.vel.length();
    const accel = want > cur ? (cur < 2 ? 9 : 5.5) : 11;
    let sp = cur + (want - cur) * (1 - Math.exp(-accel * dt * control));
    const diff = wrap(dirYaw - this.yaw);
    if (mag > 0.05) {
      const rate = THREE.MathUtils.lerp(13, 4.6, THREE.MathUtils.clamp(sp / SPEEDS.sprint, 0, 1)) * (this.grounded ? 1 : 0.45);
      const turn = THREE.MathUtils.clamp(diff, -rate * dt, rate * dt);
      this.yaw = wrap(this.yaw + turn);
      this.yawRate += (turn / Math.max(dt, 1e-4) - this.yawRate) * Math.min(1, dt * 10);
      if (Math.abs(diff) > 2.2 && sp > 3) sp *= Math.exp(-6 * dt);
    } else this.yawRate *= Math.exp(-8 * dt);
    const travelYaw = mag > 0.05 && Math.abs(diff) < 1.2 ? this.yaw + diff * 0.35 : this.yaw;
    this.vel.set(Math.sin(travelYaw) * sp, Math.cos(travelYaw) * sp);
    // Jump (higher with a Puffwool friend).
    if (input.jump && this.grounded && this.land < 0.3 && !still) {
      this.vy = abilities.float ? 7.4 : 6.3;
      this.grounded = false;
      this.airT = 0;
      this.floating = false;
      if (this.sneaking) a.rest(0.05);
      this.sneaking = false;
      a.act('JumpStart', { loop: false, fade: 0.08, speed: 1.6 });
    }
    const [nx, nz] = this.colliders.move(this.pos.x, this.pos.z, this.vel.x * dt, this.vel.y * dt, 0.32, this.pos.y);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.x = nx;
    this.pos.z = nz;
    const ground = this.colliders.height(nx, nz);
    if (this.grounded) {
      if (ground < this.pos.y - 0.6) {
        this.grounded = false;
        this.vy = 0;
        this.airT = 0;
      } else this.pos.y += (ground - this.pos.y) * (1 - Math.exp(-dt * 22));
    }
    if (!this.grounded) {
      this.airT += dt;
      this.vy -= GRAVITY * dt;
      // A slow float down, holding jump, with a Puffwool's wool.
      this.floating = Boolean(abilities.float && input.jumpHeld && this.vy < 0 && this.airT > 0.2);
      if (this.floating) this.vy = Math.max(this.vy, -1.5);
      this.pos.y += this.vy * dt;
      if (this.floating && a.overlay !== 'Glide') a.act('Glide', { loop: true, fade: 0.2 });
      else if (!this.floating && this.airT > 0.18 && a.overlay !== 'JumpAir' && this.vy < 2) a.act('JumpAir', { loop: true, fade: 0.2 });
      if (this.pos.y <= ground && this.vy <= 0) {
        this.pos.y = ground;
        const hard = Math.min(1, -this.vy / 12);
        this.grounded = true;
        this.floating = false;
        this.vy = 0;
        this.land = 0.4;
        if (sp < 1.5) a.act('JumpLand', { loop: false, fade: 0.1, speed: 1.3 });
        else a.rest(0.18);
        this.onLand(hard, surfaceAt(nx, nz));
      }
    }
    if (this.land > 0) {
      this.land -= dt;
      if (this.land <= 0 && a.overlay === 'JumpLand') a.rest(0.25);
    }
    if (this.grounded && a.overlay === 'JumpStart' && a.done()) a.rest(0.15);
    if ((a.overlay === 'JumpAir' || a.overlay === 'Glide') && this.grounded) a.rest(0.2);
    // Sneaking: crouched, creeping.
    this.speed = this.grounded ? Math.min(sp, moved + 0.2) : sp;
    if (this.grounded && !still && this.land <= 0) {
      if (sneak) {
        const clip = this.speed > 0.25 ? 'CrouchWalk' : 'CrouchIdle';
        if (a.overlay !== clip) a.act(clip, { loop: true, fade: 0.25 });
        if (clip === 'CrouchWalk' && a.actions.CrouchWalk) a.actions.CrouchWalk.timeScale = THREE.MathUtils.clamp(this.speed / 1.1, 0.5, 1.6);
        this.sneaking = true;
      } else if (this.sneaking) {
        a.rest(0.25);
        this.sneaking = false;
      }
    }
    if (still && a.done() && a.overlay && !this.sneaking && !['JumpAir', 'Glide'].includes(a.overlay)) a.rest(0.2);
    if (!still && this.busy === 0 && a.overlay && ['Throw', 'Kneel', 'PickUp', 'Dig', 'Wave', 'Victory', 'Cheer'].includes(a.overlay) && a.done()) a.rest(0.2);
    // Wading.
    this.wade = Math.min(1, depthAt(nx, nz) / 0.7);
    a.move(this.grounded ? this.speed : this.speed * 0.6);
    const wantLean = THREE.MathUtils.clamp(-this.yawRate * this.speed * 0.022, -0.3, 0.3);
    this.lean += (wantLean - this.lean) * Math.min(1, dt * 6);
    const push = THREE.MathUtils.clamp((want - cur) * 0.03, -0.08, 0.1);
    const sprintLean = THREE.MathUtils.smoothstep(this.speed, SPEEDS.run, SPEEDS.sprint) * 0.12;
    this.pitch += (push + sprintLean - this.pitch) * Math.min(1, dt * 5);
    const dip = this.land > 0 ? Math.sin((this.land / 0.4) * Math.PI) * 0.05 : 0;
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
    this.tilt.rotation.set(this.sneaking ? 0 : this.pitch, 0, this.lean);
    this.tilt.position.y = -dip;
    a.update(dt);
    this._feet();
  }

  _feet() {
    const a = this.actor;
    if (!this.grounded || this.speed < 0.6) return;
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

/** A body for a look: FighterActor (Gloamreach's, with its twist and overlays). */
export function makeActor(tpl, look) {
  return new FighterActor(tpl, { height: look.height, name: look.name });
}
