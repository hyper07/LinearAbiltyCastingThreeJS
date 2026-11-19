/**
 * The hero: input to motion with weight. Speed eases toward walk, run or
 * sprint; the body turns toward where it's going at a rate that slows with
 * speed (so a sprint carves an arc) and leans into the turn; it pitches
 * forward when it pushes off and when it sprints. A jump has a crouch, an
 * airborne pose and a landing that dips the body. Feet stay planted because
 * the gait plays at the ground speed; footsteps are heard when a foot comes
 * down, from what it lands on. A cape streams back with speed.
 */
import * as THREE from 'three';
import { surfaceAt } from './heights.js';
import { characterMaterial } from './actors.js';
import { twistSplit, legMotion } from '../hd2d/aim.js';

export const SPEEDS = { walk: 1.6, run: 4.8, sprint: 7.6 };
const GRAVITY = 19;
const JUMP_V = 6.4;

const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export class Hero {
  constructor(actor, { colliders, height, onStep = () => {}, onLand = () => {} }) {
    this.actor = actor;
    this.object = actor.object;
    this.colliders = colliders;
    this.height = height;
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
    this.walking = false;
    this.speed = 0;
    this.feet = { L: false, R: false };
    this.lastPos = new THREE.Vector3();
    // Combat: an aim the body turns to (twisting at the waist, or backpedalling), forced motion
    // (a charge, a roll, a leap), a lift off the ground, and a cap on speed while attacking.
    this.aimYaw = null;
    this.force = null;
    this.lift = 0;
    this.moveScale = 1;
    this.spin = 0;
    this.backpedal = false;
    // The inner pivot carries lean and pitch, so the root stays upright for the camera.
    this.tilt = new THREE.Group();
    this.object.add(this.tilt);
    this.tilt.add(actor.model);
    this.capeU = null;
    actor.model.traverse((o) => {
      if (o.isSkinnedMesh && o.geometry.attributes.aCape) {
        // Our own material, so the cape's uniform is only ours.
        const src = o.material;
        const u = src.userData.char;
        if (!u) return;
        o.material = characterMaterial(src, { detail: u.tDetail.value, rim: u.uRim.value + 0.15 });
        this.capeU = o.material.userData.char.uCape;
      }
    });
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

  /**
   * One step. `input`: { x, z (−1…1, camera-relative), sprint, walk, jump }.
   * `camYaw`: the camera's heading (radians, 0 = looking +z).
   */
  update(dt, input, camYaw) {
    const a = this.actor;
    // Wanted velocity in the world.
    let ix = input.x;
    let iz = input.z;
    const mag = Math.min(1, Math.hypot(ix, iz)) * (this.moveScale > 0.01 ? 1 : 0);
    let want = 0;
    let dirYaw = this.yaw;
    if (mag > 0.05) {
      const s = Math.sin(camYaw);
      const c = Math.cos(camYaw);
      // Camera-relative: z forward (where the camera looks), x right.
      // Right of the view is (−cos h, sin h); ahead is (sin h, cos h).
      const wx = -ix * c + iz * s;
      const wz = ix * s + iz * c;
      dirYaw = Math.atan2(wx, wz);
      want = (input.walk ? SPEEDS.walk : input.sprint && this.aimYaw == null ? SPEEDS.sprint : SPEEDS.run) * mag * Math.min(1, this.moveScale) * (this.speedK ?? 1);
    }
    // Aiming: within the twist the legs keep their way and the chest turns; past it the body turns and the legs backpedal.
    let aimTwist = 0;
    let bodyYaw = dirYaw;
    this.backpedal = false;
    if (this.aimYaw != null) {
      if (mag > 0.05) {
        const split = twistSplit(dirYaw, this.aimYaw);
        if (split.full) {
          bodyYaw = this.aimYaw;
          this.backpedal = legMotion(this.aimYaw, dirYaw).back;
          if (this.backpedal) want *= 0.72;
        } else aimTwist = split.twist;
      } else bodyYaw = this.aimYaw;
    }
    // Ease the speed (quicker to stop than to start), less control in the air.
    const control = this.grounded ? 1 : 0.25;
    const cur = this.vel.length();
    const accel = want > cur ? (cur < 2 ? 9 : 5.5) : 11;
    let sp = cur + (want - cur) * (1 - Math.exp(-accel * dt * control));
    // Turn: fast when slow, wide arcs at a sprint; a hard reversal at speed slows us first.
    const diff = wrap(bodyYaw - this.yaw);
    if (mag > 0.05 || this.aimYaw != null) {
      const rate = this.aimYaw != null ? 16 : THREE.MathUtils.lerp(13, 4.2, THREE.MathUtils.clamp(sp / SPEEDS.sprint, 0, 1)) * (this.grounded ? 1 : 0.4);
      const turn = THREE.MathUtils.clamp(diff, -rate * dt, rate * dt);
      this.yaw = wrap(this.yaw + turn);
      this.yawRate += (turn / Math.max(dt, 1e-4) - this.yawRate) * Math.min(1, dt * 10);
      if (Math.abs(diff) > 2.2 && sp > 3 && this.aimYaw == null) sp *= Math.exp(-6 * dt);
    } else {
      this.yawRate *= Math.exp(-8 * dt);
    }
    // Velocity follows the body's heading (no moonwalking) — except when aiming, when the legs go where the keys say.
    const travelYaw = this.aimYaw != null ? dirYaw : mag > 0.05 && Math.abs(diff) < 1.2 ? this.yaw + diff * 0.35 : this.yaw;
    this.vel.set(Math.sin(travelYaw) * sp, Math.cos(travelYaw) * sp);
    if (this.force) {
      // A charge, a roll, a leap or a knock: the body is carried.
      const f = this.force;
      this.vel.set(f.vx, f.vz);
      sp = Math.hypot(f.vx, f.vz);
      f.t -= dt;
      if (f.yaw != null) this.yaw = f.yaw;
      if (f.t <= 0) this.force = null;
    }
    if (this.actor.twist !== undefined) {
      this.actor.twist = aimTwist;
      this.actor.reverse = this.backpedal;
    }

    // Jump.
    if (input.jump && this.grounded && this.land < 0.35 && !this.force && this.moveScale > 0.5) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.airT = 0;
      a.act('JumpStart', { loop: false, fade: 0.08, speed: 1.6 });
    }
    // Move, blocked by the world.
    const [nx, nz] = this.colliders.move(this.pos.x, this.pos.z, this.vel.x * dt, this.vel.y * dt, 0.38, this.pos.y);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.x = nx;
    this.pos.z = nz;
    const ground = this.colliders.height(nx, nz);
    if (this.grounded) {
      // Follow the ground, smoothly over little steps; fall if it drops away.
      if (ground < this.pos.y - 0.6) {
        this.grounded = false;
        this.vy = 0;
        this.airT = 0;
      } else this.pos.y += (ground - this.pos.y) * (1 - Math.exp(-dt * 22));
    }
    if (!this.grounded) {
      this.airT += dt;
      this.vy -= GRAVITY * dt;
      this.pos.y += this.vy * dt;
      if (this.airT > 0.18 && a.overlay !== 'JumpAir' && this.vy < 2) a.act('JumpAir', { loop: true, fade: 0.2 });
      if (this.pos.y <= ground && this.vy <= 0) {
        this.pos.y = ground;
        const hard = Math.min(1, -this.vy / 12);
        this.grounded = true;
        this.vy = 0;
        this.land = 0.45;
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
    if (a.overlay === 'JumpAir' && this.grounded) a.rest(0.2);
    // The body: speed for the gait, lean into turns, pitch on push-off and sprint.
    this.speed = this.grounded ? Math.min(sp, moved + 0.2) : sp;
    a.move(this.force?.still ? 0 : this.grounded ? this.speed : this.speed * 0.6);
    const wantLean = THREE.MathUtils.clamp(-this.yawRate * this.speed * 0.022, -0.32, 0.32);
    this.lean += (wantLean - this.lean) * Math.min(1, dt * 6);
    const push = THREE.MathUtils.clamp((want - cur) * 0.03, -0.08, 0.1);
    const sprintLean = THREE.MathUtils.smoothstep(this.speed, SPEEDS.run, SPEEDS.sprint) * 0.14;
    this.pitch += (push + sprintLean - this.pitch) * Math.min(1, dt * 5);
    const dip = this.land > 0 ? Math.sin((this.land / 0.45) * Math.PI) * 0.06 : 0;
    this.object.position.copy(this.pos);
    this.object.position.y += this.lift;
    this.object.rotation.y = this.yaw;
    this.tilt.rotation.set(this.pitch, this.spin, this.lean);
    this.tilt.position.y = -dip;
    // Cape streams back.
    if (this.capeU) {
      const v = this.speed;
      this.capeU.value.set(-this.lean * 0.6, Math.min(0.35, v * 0.045) + (this.grounded ? 0 : 0.15), Math.min(0.75, 0.05 + v * 0.085), this.capeU.value.w);
    }
    a.update(dt);
    this._feet();
  }

  /** A footstep when a foot comes down. */
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
