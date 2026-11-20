/**
 * A hero who fights while moving: the body is split at the waist, so a swing,
 * a shot or a spell can play on the arms and chest while the legs keep
 * walking, running or backpedalling (the gait played backwards), and the
 * torso twists toward the aim (up to about 100°, as Lanternwood's aim.js
 * splits it). Standing still, an attack takes the whole body.
 *
 *   const a = new FighterActor(template, { height });
 *   a.act('Slash1', { loop: false, upper: a.speed > 0.6 });
 *   a.reverse = true;     // backpedal
 *   a.twist = 0.8;        // radians, torso toward the aim
 */
import * as THREE from 'three';
import { Actor } from './actors.js';

const UPPER = /^(Spine1|Spine2|Neck|Head|HeadTop_End|(Left|Right)(Shoulder|Arm|ForeArm|Hand.*))$/;
const boneOf = (track) => track.name.slice(0, track.name.lastIndexOf('.'));

function split(clip, upper) {
  const tracks = clip.tracks.filter((t) => UPPER.test(boneOf(t)) === upper);
  return new THREE.AnimationClip(`${clip.name}@${upper ? 'U' : 'L'}`, clip.duration, tracks);
}

export class FighterActor extends Actor {
  constructor(template, opts) {
    super(template, opts);
    // Locomotion as two halves: legs (L) and body (U).
    this.halves = {};
    for (const n of this.loco) {
      const full = this.actions[n];
      full.stop();
      const clip = full.getClip();
      const L = this.mixer.clipAction(split(clip, false));
      const U = this.mixer.clipAction(split(clip, true));
      for (const a of [L, U]) {
        a.play();
        a.setEffectiveWeight(n === 'Idle' ? 1 : 0);
      }
      this.halves[n] = { L, U };
      this.actions[n] = L;
    }
    this.upperClips = new Map();
    this.overlayUpper = false;
    this.overW = 0;
    this.reverse = false;
    this.twist = 0;
    this._twist = 0;
    this.spin = 0;
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
  }

  _upperAction(name) {
    if (!this.upperClips.has(name)) {
      const a = this.actions[name];
      if (!a) return null;
      this.upperClips.set(name, this.mixer.clipAction(split(a.getClip(), true)));
    }
    return this.upperClips.get(name);
  }

  _current() {
    if (!this.overlay) return null;
    return this.overlayUpper ? this.upperClips.get(this.overlay) : this.actions[this.overlay];
  }

  /** Play a clip over the locomotion: `upper` keeps the legs walking. */
  act(name, { loop = true, fade = 0.15, speed = 1, clamp = false, upper = false, restart = true } = {}) {
    const a = upper ? this._upperAction(name) : this.actions[name];
    if (!a) return false;
    const cur = this._current();
    if (cur === a && a.isRunning() && !restart) return true;
    if (cur && cur !== a) cur.fadeOut(fade);
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = clamp || !loop;
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    a.fadeIn(fade).play();
    this.overlay = name;
    this.overlayUpper = upper;
    return true;
  }

  rest(fade = 0.2) {
    if (!this.overlay) return;
    this._current()?.fadeOut(fade);
    this.overlay = null;
  }

  done() {
    const a = this._current();
    if (!a) return true;
    return a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 0.02;
  }

  /** How far through the current one-shot (0…1). */
  progress() {
    const a = this._current();
    return a ? Math.min(1, a.time / a.getClip().duration) : 1;
  }

  update(dt) {
    const sp = this.speed;
    const walkV = this.strides.Walk || 1.4;
    const runV = this.strides.Run || 4;
    const sprintV = this.strides.Sprint || runV * 1.6;
    const w = { Idle: 0, Walk: 0, Run: 0, Sprint: 0 };
    if (sp < 0.15) w.Idle = 1;
    else if (sp < walkV) {
      const t = THREE.MathUtils.smoothstep(sp, 0.15, walkV * 0.7);
      w.Idle = 1 - t;
      w.Walk = t;
    } else if (sp < runV * 1.1 || !this.halves.Sprint) {
      const t = THREE.MathUtils.smoothstep(sp, walkV * 1.05, runV * 0.85);
      w.Walk = 1 - t;
      w.Run = t;
    } else {
      const t = THREE.MathUtils.smoothstep(sp, runV * 1.1, Math.max(runV * 1.3, sprintV * 0.9));
      w.Run = 1 - t;
      w.Sprint = t;
    }
    // The overlay's own weight eases in and out with its fades.
    const cur = this._current();
    const ow = cur ? cur.getEffectiveWeight() : 0;
    const full = cur && !this.overlayUpper ? ow : 0;
    for (const n of this.loco) {
      const h = this.halves[n];
      h.L.setEffectiveWeight(w[n] * (1 - full * 0.999));
      h.U.setEffectiveWeight(w[n] * (1 - ow * 0.999));
    }
    const gaits = ['Walk', 'Run', 'Sprint'].filter((n) => this.halves[n]);
    if (gaits.length) {
      const leadName = gaits.reduce((a, b) => (w[b] > w[a] ? b : a), gaits[0]);
      const lead = this.halves[leadName].L;
      const natural = { Walk: walkV, Run: runV, Sprint: sprintV }[leadName];
      lead.timeScale = (sp > 0.15 ? THREE.MathUtils.clamp(sp / natural, 0.6, 1.8) : 1) * (this.reverse ? -1 : 1);
      const phase = (((lead.time / lead.getClip().duration) % 1) + 1) % 1;
      for (const n of gaits) {
        for (const a of [this.halves[n].L, this.halves[n].U]) {
          if (a === lead) continue;
          a.timeScale = 0;
          a.time = phase * a.getClip().duration;
        }
      }
    }
    this.mixer.update(dt);
    this.shortStride();
    // Twist the chest toward the aim, shared between the two upper spine bones.
    this._twist += (this.twist - this._twist) * Math.min(1, dt * 14);
    if (Math.abs(this._twist) > 0.002) {
      this.model.updateMatrixWorld(true);
      for (const name of ['Spine1', 'Spine2']) {
        const b = this.bones[name];
        if (!b) continue;
        b.parent.getWorldQuaternion(this._q).invert();
        this._v.set(0, 1, 0).applyQuaternion(this._q).normalize();
        b.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(this._v, this._twist / 2));
      }
    }
  }
}
