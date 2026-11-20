/**
 * The over-the-shoulder camera: orbits the hero by mouse (pointer lock) or
 * drag, zooms with the wheel, sits a little right of the hero's shoulder,
 * and never goes through a wall, a trunk, the gate's stone or the ground —
 * it pulls in at once when something comes between, and eases back out.
 * Keys turn and tilt it, and after a quiet spell with no camera input it
 * eases back behind a hero on the move (shared/cameraAssist.js); setting
 * `pause` (aiming, a fight's lock, mouse-look) holds that off.
 */
import * as THREE from 'three';
import { CameraAssist } from '../shared/cameraAssist.js';

export class FollowCamera {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.yaw = Math.PI;
    this.pitch = 0.12;
    this.dist = 4.6;
    this.wantDist = 4.6;
    this.cur = 4.6;
    this.pivot = new THREE.Vector3();
    this.idle = 0;
    this.shoulder = 0.55;
    this.fovBase = 55;
    this.kick = 0;
    this.assist = new CameraAssist();
    /** Set each frame by the game: true while the camera must not swing on its own. */
    this.pause = false;
    /** Set each frame by a game with extra turn keys (Gloamreach's Q / E). */
    this.extraLeft = false;
    this.extraRight = false;
  }

  /** Mouse movement (pixels). */
  look(dx, dy) {
    this.yaw -= dx * 0.0032;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0026, -0.6, 1.2);
    this.idle = 0;
    this.assist.input();
  }

  zoom(delta) {
    this.wantDist = THREE.MathUtils.clamp(this.wantDist * Math.exp(delta * 0.0012), 1.8, 10);
  }

  /** Heading the camera looks along (0 = +z). */
  heading() {
    return this.yaw + Math.PI;
  }

  update(dt, hero, { sprinting = false, moving = false, paused = false } = {}) {
    this.idle += dt;
    // Keys and the right stick turn it; after the quiet spell it eases back behind a hero on the move.
    const turn = this.assist.steer(dt, { extraLeft: this.extraLeft, extraRight: this.extraRight });
    if (turn.yaw || turn.pitch) {
      this.yaw += turn.yaw;
      this.pitch = THREE.MathUtils.clamp(this.pitch + turn.pitch, -0.6, 1.2);
      this.idle = 0;
    }
    this.yaw = this.assist.step(dt, this.yaw, hero.yaw + Math.PI, { moving, paused: paused || this.pause });
    this.dist += (this.wantDist - this.dist) * Math.min(1, dt * 8);
    // The pivot follows the hero with a little lag (weight), never sinking with a landing dip.
    const target = hero.object.position.clone();
    target.y += 1.62;
    if (this.pivot.lengthSq() === 0) this.pivot.copy(target);
    const k = 1 - Math.exp(-dt * 14);
    this.pivot.x += (target.x - this.pivot.x) * k;
    this.pivot.z += (target.z - this.pivot.z) * k;
    this.pivot.y += (target.y - this.pivot.y) * (1 - Math.exp(-dt * 9));
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    // Over the right shoulder (less when zoomed out).
    const shoulder = this.shoulder * THREE.MathUtils.clamp(1.2 - this.dist / 12, 0.35, 1);
    const origin = this.pivot.clone().addScaledVector(right, shoulder);
    // Pull in when something's between.
    const hit = this.colliders.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, this.dist + 0.4);
    const allowed = Math.max(0.6, hit - 0.35);
    if (allowed < this.cur) this.cur = allowed;
    else this.cur += (Math.min(allowed, this.dist) - this.cur) * Math.min(1, dt * 3);
    const pos = origin.clone().addScaledVector(dir, this.cur);
    const floor = this.colliders.height(pos.x, pos.z) + 0.35;
    if (pos.y < floor) pos.y = floor;
    this.camera.position.copy(pos);
    const look = this.pivot.clone().addScaledVector(right, shoulder * 0.9);
    look.y += 0.05 + this.pitch * 0.25;
    this.camera.lookAt(look);
    // A little more field of view at a sprint.
    this.kick += ((sprinting ? 1 : 0) - this.kick) * Math.min(1, dt * 3);
    const fov = this.fovBase + this.kick * 6;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
