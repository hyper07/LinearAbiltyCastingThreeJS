import { Quaternion, Vector3 } from 'three';

import { settings } from '../config/settings.js';
import { mixamoRig, shortBoneName } from '../platform/rig/MixamoRigAdapter.js';
import { clamp, damp, lerp, saturate } from '../utils/math.js';

/** `damp` wants "fraction of the gap left after one second"; this takes a rate. */
const perSecond = (rate) => Math.exp(-Math.max(0.01, rate));

const _up = new Vector3(0, 1, 0);
const _right = new Vector3();
const _forward = new Vector3();
const _desired = new Vector3();
const _delta = new Quaternion();
const _parent = new Quaternion();
const _inverse = new Quaternion();
const _local = new Quaternion();
const _hip = new Vector3();
const _ankle = new Vector3();
const _limb = new Vector3();
const _childAt = new Vector3();
const _target = new Vector3();
const _sway = new Vector3();
const _identity = new Quaternion();

/**
 * Walking, running, jumping and sitting — generated, because there is nothing
 * to play.
 *
 * The character ships with an idle loop and three cast throws. There is no walk
 * clip, no run, no jump and no sit, and there is no way to author one here. So
 * this layer does not play animation; it **poses bones on top of** whatever the
 * mixer just wrote. `CharacterController.update` runs `mixer.update(dt)` and
 * then calls `applyPose`, which composes a gait over the idle the mixer left
 * behind.
 *
 * That ordering is the whole design. The idle keeps breathing underneath — the
 * chest still rises, the head still drifts — and the walk rides on top of it,
 * so a character standing still is the *same* character with the overlay at
 * zero. Blending back is one number going to zero rather than a clip crossfade.
 *
 * Two details make it read as walking rather than as sliding:
 *
 *   - The gait phase advances by **distance travelled**, never by time. Feet
 *     that cycle on a clock skate whenever the body is slowed, shoved or
 *     accelerating; feet that cycle on distance plant themselves, and the walk
 *     automatically becomes a run when the body moves faster.
 *   - Every rotation is applied about a **world** axis (the body's own right
 *     and forward), not about a bone's local axes. Bind poses are not axis
 *     aligned — the shoulder in particular is rolled — and posing in local
 *     space produces limbs that swing diagonally through the torso.
 */
export class Locomotion {
  /**
   * @param {import('./CharacterController.js').CharacterController} character
   * @param {object} [options]
   * @param {import('../platform/rig/MixamoRigAdapter.js').MixamoRigAdapter} [options.rig]
   */
  constructor(character, options = {}) {
    this.character = character;
    this.rig = options.rig ?? mixamoRig;
    this.limbChild = this.rig.limbChild;

    /** Live tuning target — kept in sync with platform motion profiles. */
    Object.defineProperty(this, 'cfg', {
      get: () => settings.character
    });

    /** Where the body is trying to go, world space, length 0..1. */
    this.intent = new Vector3();
    /** Hold Shift. */
    this.sprinting = false;
    /** Hold Alt — a deliberate walk rather than the default jog. */
    this.walking = false;
    /**
     * When false, walk/run joint poses come from authored clips (`LocomotionPlayback`)
     * and this layer only handles sit, jump, and root bob.
     */
    this.useProceduralGait = true;

    this.velocity = new Vector3();
    this.verticalVelocity = 0;
    this.grounded = true;

    /** 0..1 blend into the seated pose. */
    this.sit = 0;
    this.sitting = false;

    /** Metres travelled, which is what the gait cycles on. */
    this.distance = 0;
    /**
     * The gait phase itself, in cycles — *integrated*, not derived.
     *
     * It used to be `distance / strideLength`, which looks equivalent and is
     * not: stride length is a live function of speed, so changing gear silently
     * rescaled the whole accumulated odometer and teleported the phase. The
     * error grows with distance travelled — after a hundred metres, breaking
     * into a sprint jumped the legs to an unrelated point in the cycle.
     */
    this._gaitPhase = 0;
    /** 0..1, how much of the overlay is showing. */
    this.gait = 0;
    this._lastStep = 0;
    this._coyote = 0;
    this._jumpBuffer = 0;
    /** Vertical offset the pose wants this frame — bob, or the seated drop. */
    this._lift = 0;
    /** Smoothed fore-aft and lateral acceleration, for the lean. */
    this._accelFwd = 0;
    this._accelLat = 0;
    this._prevVx = 0;
    this._prevVz = 0;

    /** Cylinders the body cannot walk into — `{x, z, radius}`. */
    this.obstacles = [];
    /** Props are separate: they come and go as they are destroyed. */
    this.props = [];
    /** How far from the arena centre the body may get. Set by the app. */
    this.bounds = Infinity;

    /** `(position, speed) => void`, called on each footfall. */
    this.onFootstep = null;
    /** `(position, impact) => void`, called on landing. */
    this.onLand = null;

    this.bones = new Map();
    /** Each driven bone's local quaternion in the rig's rest pose. */
    this._rest = new Map();
    /**
     * Driven bones that no clip animates.
     *
     * These are the dangerous ones: `mixer.update` restores every *animated*
     * bone to the clip's value each frame, which is what makes a delta laid on
     * top of it safe. A bone no clip mentions is never restored, so a delta
     * applied to it compounds every frame, forever.
     */
    this._unanimated = new Set();
    /** Hip-to-ankle, metres. Measured off the bind pose in `bind`. */
    this.legLength = 0.88;
    /** Half a step, metres — how far forward of the hip a foot lands. */
    this.halfStep = 0;
    this.duty = 0.5;
    /** +1 or -1: which side of the body the bone named "Left" sits on. */
    this.leftSide = 1;
    /** Which hand carries the prop, and so may need its own wrist offset. */
    this.wandSide = 'Right';
  }

  /* ------------------------------------------------------------------ */
  /* setup                                                               */
  /* ------------------------------------------------------------------ */

  /** Find the bones this layer drives. Safe to call on any rig. */
  bind(model) {
    const { bones, missing } = this.rig.bind(model);
    this.bones = bones;

    this._rest.clear();
    for (const [name, bone] of this.bones) this._rest.set(name, bone.quaternion.clone());

    if (missing.length) {
      console.warn(`[Locomotion] rig is missing ${missing.length} bone(s): ${missing.join(', ')}`);
    }

    // A first estimate off the bind pose; `_measureLeg` refines it against the
    // pose the gait is actually composed onto.
    const upLeg = this.bones.get('LeftUpLeg');
    const foot = this.bones.get('LeftFoot');
    if (upLeg && foot) {
      model.updateWorldMatrix(true, true);
      this.legLength = upLeg.getWorldPosition(_hip).distanceTo(foot.getWorldPosition(_ankle));
    }

    return this;
  }

  /**
   * Tell this layer which bones the loaded clips actually animate.
   *
   * Everything here is composed *over* whatever the mixer wrote, which relies
   * on the mixer having written something: `mixer.update` restores an animated
   * bone to the clip's value every frame, so last frame's delta is gone before
   * this frame's is applied. A bone no clip mentions never gets restored, and a
   * delta applied to it compounds instead — the hands are exactly that case
   * (this rig's idle has 21 tracks and none of them is a hand), and a constant
   * wrist roll turned into several thousand degrees a second of spin.
   *
   * Absolute posing — `_aim`, `_aimTo` — is immune, because it measures where
   * the limb actually is and corrects the difference. Only raw `_rotate` deltas
   * are at risk, so those bones are reset to rest before being posed.
   *
   * @param {Iterable<string>} trackNames every track name across every clip
   */
  setAnimatedBones(trackNames) {
    const animated = new Set();
    for (const track of trackNames) animated.add(shortBoneName(track.split('.')[0]));
    this._unanimated.clear();
    for (const name of this.bones.keys()) {
      if (!animated.has(name)) this._unanimated.add(name);
    }
    return this;
  }

  /**
   * Put a bone back to its rest pose, but only if nothing else will.
   *
   * The no-op for an animated bone is the point: this must not fight the mixer
   * where the mixer is doing its job.
   */
  _restore(name) {
    if (!this._unanimated.has(name)) return;
    const bone = this.bones.get(name);
    const rest = this._rest.get(name);
    if (bone && rest) bone.quaternion.copy(rest);
  }

  /* ------------------------------------------------------------------ */
  /* intent                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Where to go this frame.
   *
   * @param {number} x world +X component, -1..1
   * @param {number} z world +Z component, -1..1
   * @param {boolean} sprint
   */
  setIntent(x, z, sprint = false, walk = false) {
    this.intent.set(x, 0, z);
    if (this.intent.lengthSq() > 1) this.intent.normalize();
    this.sprinting = sprint && !walk;
    this.walking = walk;
    // Any attempt to move stands you up. Sitting is a thing you stop doing by
    // doing something else, which is one fewer key to remember.
    if (this.sitting && this.intent.lengthSq() > 0.01) this.sitting = false;
  }

  /** Queue a jump. Buffered, so a press just before landing still fires. */
  jump() {
    if (this.sitting) {
      this.sitting = false;
      return;
    }
    this._jumpBuffer = this.cfg.jumpBufferTime;
  }

  /** @param {boolean} [force] */
  toggleSit(force) {
    if (!this.grounded) return;
    this.sitting = force ?? !this.sitting;
    if (this.sitting) {
      this.intent.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
    }
  }

  /** The speed multiplier the current gear asks for. */
  get gearMultiplier() {
    const cfg = this.cfg;
    if (this.walking) return cfg.walkMultiplier;
    return this.sprinting ? cfg.sprintMultiplier : 1;
  }

  /** What to call the current gear, for the readout. */
  get gear() {
    if (this.walking) return 'walk';
    return this.sprinting ? 'sprint' : 'run';
  }

  get isMoving() {
    return this.speed > 0.15;
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  get isSitting() {
    return this.sitting || this.sit > 0.02;
  }

  /** Heading the body should face while running, radians about +Y. */
  get heading() {
    return Math.atan2(this.velocity.x, this.velocity.z);
  }

  /* ------------------------------------------------------------------ */
  /* simulation                                                          */
  /* ------------------------------------------------------------------ */

  /** @param {number} dt simulation seconds — pausing freezes the body too */
  step(dt) {
    if (dt <= 0) return;
    const cfg = this.cfg;
    const position = this.character.root.position;

    this.sit = damp(this.sit, this.sitting ? 1 : 0, perSecond(cfg.sitBlend), dt);

    /* ---- horizontal ----
       Three gears, and the gait falls out of the speed rather than being told
       which one it is in: Alt walks, Shift sprints, neither jogs. */
    const top = cfg.moveSpeed * this.gearMultiplier;
    // Sitting does not merely zero the input: the body has to come to a stop,
    // or standing up out of a slide looks like the pose snapped on.
    const wanted = this.sitting ? 0 : this.intent.length();
    _desired.copy(this.intent).multiplyScalar(top);

    const control = this.grounded ? 1 : cfg.airControl;
    const rate = (wanted > 0.01 ? cfg.acceleration : cfg.friction) * control;
    // Exponential approach rather than a linear ramp: it reaches top speed
    // smoothly and, more importantly, stops *dead* when the key is released
    // instead of coasting, which is what makes dodging a golem's slam possible.
    const blend = 1 - Math.exp(-rate * dt);
    this.velocity.x += (_desired.x - this.velocity.x) * blend;
    this.velocity.z += (_desired.z - this.velocity.z) * blend;
    if (this.velocity.lengthSq() < 1e-4) this.velocity.set(0, 0, 0);

    /* The body leans *into* its acceleration — toward a start, back against a
       stop, banked into a turn. Overgrowth and every good third-person game do
       this with one rule: tilt toward the smoothed acceleration vector. It is
       what makes starting and stopping look like they cost something. */
    const fx = Math.sin(this.character.facing);
    const fz = Math.cos(this.character.facing);
    const ax = (this.velocity.x - this._prevVx) / dt;
    const az = (this.velocity.z - this._prevVz) / dt;
    this._prevVx = this.velocity.x;
    this._prevVz = this.velocity.z;
    this._accelFwd = damp(this._accelFwd, clamp(ax * fx + az * fz, -30, 30), perSecond(4), dt);
    this._accelLat = damp(this._accelLat, clamp(ax * fz - az * fx, -30, 30), perSecond(4), dt);

    position.x += this.velocity.x * dt;
    position.z += this.velocity.z * dt;
    const travelled = this.speed * dt;
    this.distance += travelled;
    // Advance by the fraction of *this* stride covered this frame, so a change
    // of stride length only ever affects what happens next.
    this._gaitPhase = (this._gaitPhase + travelled / this._strideLength()) % 1;

    this._resolveCollisions(position, cfg.radius);

    /* ---- vertical ---- */
    this._coyote = this.grounded ? cfg.coyoteTime : Math.max(0, this._coyote - dt);
    this._jumpBuffer = Math.max(0, this._jumpBuffer - dt);

    if (this._jumpBuffer > 0 && this._coyote > 0) {
      this._jumpBuffer = 0;
      this._coyote = 0;
      this.grounded = false;
      // v = sqrt(2gh) — the apex is authored directly, which is the only
      // number about a jump anyone has an opinion about.
      this.verticalVelocity = Math.sqrt(2 * cfg.gravity * Math.max(0.05, cfg.jumpHeight));
    }

    if (!this.grounded) {
      this.verticalVelocity -= cfg.gravity * dt;
      position.y += this.verticalVelocity * dt;
      if (position.y <= 0) {
        const impact = -this.verticalVelocity;
        position.y = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
        this.onLand?.(position, impact);
      }
    } else {
      position.y = 0;
    }

    /* ---- the gait ---- */
    // Blended by *speed*, so the overlay is exactly as present as the movement
    // is. A body inching forward should barely show a walk cycle.
    /* Measured against *walking* pace, not against the jog. This number scales
       the step excursion as well as fading the overlay in, so anything short of
       1 means the feet do not travel as far as the body does — they skate by
       exactly the shortfall. Against `moveSpeed * 0.55` a deliberate walk sat
       at 0.84 and skidded permanently, for 16%; a walk is a whole gait, not a
       faint one, so it has to be fully faded in. */
    const walkSpeed = cfg.moveSpeed * cfg.walkMultiplier;
    const target =
      this.grounded && !this.sitting ? saturate(this.speed / Math.max(0.2, walkSpeed * 0.85)) : 0;
    this.gait = damp(this.gait, target, perSecond(cfg.gaitBlend), dt);

    this._emitFootsteps(position);
  }

  /**
   * Push the body out of anything it has walked into.
   *
   * Position-based rather than velocity-based on purpose: it cannot tunnel, it
   * cannot accumulate energy, and sliding along a wall falls out of it for free
   * because only the penetrating component is removed.
   */
  _resolveCollisions(position, radius) {
    for (const obstacle of this.obstacles) {
      const dx = position.x - obstacle.x;
      const dz = position.z - obstacle.z;
      const reach = obstacle.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= reach * reach || distSq < 1e-8) continue;
      const distance = Math.sqrt(distSq);
      const push = (reach - distance) / distance;
      position.x += dx * push;
      position.z += dz * push;
      // Kill the velocity into the surface, keep the velocity along it.
      const nx = dx / distance;
      const nz = dz / distance;
      const into = this.velocity.x * nx + this.velocity.z * nz;
      if (into < 0) {
        this.velocity.x -= nx * into;
        this.velocity.z -= nz * into;
      }
    }

    for (const prop of this.props) {
      if (!prop.alive) continue;
      const dx = position.x - prop.position.x;
      const dz = position.z - prop.position.z;
      const reach = prop.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= reach * reach || distSq < 1e-8) continue;
      const distance = Math.sqrt(distSq);
      const push = (reach - distance) / distance;
      position.x += dx * push;
      position.z += dz * push;
    }

    const distSq = position.x * position.x + position.z * position.z;
    if (distSq > this.bounds * this.bounds) {
      const distance = Math.sqrt(distSq);
      position.x *= this.bounds / distance;
      position.z *= this.bounds / distance;
    }
  }

  /** One puff per footfall, keyed off the stride rather than a timer. */
  _emitFootsteps(position) {
    if (!this.onFootstep || this.gait < 0.25 || !this.grounded) return;
    const step = Math.floor(this._phase() / Math.PI);
    if (step === this._lastStep) return;
    this._lastStep = step;
    this.onFootstep(position, this.speed);
  }

  /**
   * How hard the body is working, 0..1, from a stroll to a flat sprint.
   *
   * Distinct from `gait`, which only says how much of the overlay is showing.
   * This is what scales the *size* of the motion: a walk and a sprint reaching
   * the same leg amplitude is the single most obvious tell that a gait was
   * generated, because a walking body does not do the splits.
   */
  get effort() {
    const cfg = this.cfg;
    const top = cfg.moveSpeed * cfg.sprintMultiplier;
    return saturate(this.speed / Math.max(0.5, top));
  }

  /**
   * How far the body travels in one full two-step cycle, metres.
   *
   * The stride *lengthens* as the body speeds up, the way a real one does. Hold
   * it fixed and a sprint just cycles the same short steps twice as fast, which
   * reads as a cartoon scurry rather than as running — and the cadence comes out
   * at eight steps a second, which no animal has ever managed.
   */
  _strideLength() {
    return Math.max(0.4, (this.speed * 2) / this.cadence);
  }

  /**
   * Steps per second.
   *
   * Cadence is the parameter, and stride falls out of it — the other way round
   * gives you a number nobody has an intuition for and a gait that scurries.
   * A stride fixed against speed means a faster body just cycles the same short
   * steps quicker: an earlier pass ran at 4 m/s on 4.2 steps a second, where a
   * real runner uses about 2.9, and it read exactly as you would expect.
   *
   * People barely vary cadence — roughly two steps a second walking, four and a
   * bit flat out — and cover ground by lengthening the step instead.
   */
  get cadence() {
    const cfg = this.cfg;
    return lerp(cfg.cadenceWalk, cfg.cadenceRun, this.speedBlend);
  }

  /**
   * How far along the walk→run *mechanics* the body is, 0..1.
   *
   * Distinct from `runBlend`, which is about posture. Cadence and the duty
   * cycle are not linear in speed — both saturate, because a body covers extra
   * ground by lengthening its step rather than by taking more of them — so this
   * approaches 1 exponentially from the walking speed rather than ramping.
   * Measured against real gait it is a good fit: walking 2.0 steps/s, about 3.6
   * at a jog and 4.5 flat out, with stance falling 62% → 31% across the same
   * range.
   */
  get speedBlend() {
    const cfg = this.cfg;
    const walkSpeed = cfg.moveSpeed * cfg.walkMultiplier;
    const over = Math.max(0, this.speed - walkSpeed);
    return saturate(1 - Math.exp(-over / Math.max(0.1, cfg.gaitDecay)));
  }

  /** The gait phase, in radians. Two steps per 2π. */
  _phase() {
    return this._gaitPhase * Math.PI * 2;
  }

  /**
   * Walking and running are different gaits, not one gait at two speeds — the
   * knees fold further, the elbows come up, the lean deepens, and the body's
   * vertical bounce inverts. This is the blend between them.
   */
  get runBlend() {
    // Tuned so a deliberate walk lands at ~0 and the default jog is already
    // *decisively* a run — 0.8, not halfway. The gap between the two gaits is
    // what makes changing gear read as a decision rather than as a speed
    // slider; a jog left in the mushy middle wears half of each posture and
    // looks like it never changes.
    return saturate((this.effort - 0.25) / 0.38);
  }

  /* ------------------------------------------------------------------ */
  /* posing                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Turn the pelvis until the line between the hip sockets is square to the
   * body's heading.
   *
   * Same problem as the staggered legs and the same answer: measure what the
   * idle actually left, and correct the difference rather than adding to it.
   * The `twist` the gait wants is then applied on top of a square pelvis
   * instead of on top of whatever the idle happened to be doing.
   */
  _squarePelvis(blend) {
    if (blend <= 0.001) return;
    const left = this.bones.get('LeftUpLeg');
    const right = this.bones.get('RightUpLeg');
    if (!left || !right) return;

    left.getWorldPosition(_hip);
    right.getWorldPosition(_childAt);
    _limb.subVectors(_hip, _childAt);
    _limb.y = 0;
    if (_limb.lengthSq() < 1e-8) return;

    // Which side of the body the bone named "Left" is actually on. Rigs do not
    // agree, and the weight shift and the arm tuck both need to know.
    this.leftSide = Math.sign(_limb.dot(_right)) || 1;

    // Fold to the nearest square orientation, so this works whichever way round
    // the rig names its sides.
    let error = Math.atan2(_limb.dot(_forward), _limb.dot(_right));
    if (error > Math.PI * 0.5) error -= Math.PI;
    else if (error < -Math.PI * 0.5) error += Math.PI;

    // Positive, not negative: a positive turn about +up carries `right` toward
    // *-forward*, so closing a positive error takes a positive rotation. The
    // sign was checked by measurement rather than by argument — backwards, it
    // did not merely fail to square the pelvis, it swung the whole body 84° off
    // its heading, because `Hips` is the root of the skeleton.
    this._rotate('Hips', _up, error * blend);
  }

  /**
   * Point a limb segment along an absolute world direction.
   *
   * The two-axis version of `_aim`. Used for the arms, which need their
   * *sideways* placement corrected as well as their swing: this idle holds them
   * up and out in a casting stance, and correcting only the fore-aft angle
   * leaves them splayed like a scarecrow's.
   */
  _aimTo(name, target, blend) {
    if (blend <= 0.001) return;
    const bone = this.bones.get(name);
    const child = this.bones.get(this.limbChild[name]);
    if (!bone?.parent || !child) return;

    bone.getWorldPosition(_hip);
    child.getWorldPosition(_childAt);
    _limb.subVectors(_childAt, _hip);
    if (_limb.lengthSq() < 1e-8) return;
    _limb.normalize();

    _delta.setFromUnitVectors(_limb, target);
    // Partial correction is a slerp toward doing nothing, so the overlay can
    // fade in and out of the clip underneath it.
    if (blend < 0.999) _delta.slerp(_identity, 1 - blend);

    bone.parent.getWorldQuaternion(_parent);
    _inverse.copy(_parent).invert();
    _local.copy(_inverse).multiply(_delta).multiply(_parent);
    bone.quaternion.premultiply(_local);
  }

  /**
   * Where an arm should point: down, swung fore or aft, and tucked toward the
   * ribs. `swing` is positive backward like everything else here; `tuck` is
   * positive inward, so it works for both arms off one number.
   */
  _armDirection(out, swing, tuck, side) {
    out.set(0, -1, 0);
    out.applyAxisAngle(_right, swing);
    out.applyAxisAngle(_forward, -side * tuck);
    return out;
  }

  /**
   * Point a limb segment at an **absolute** angle in the sagittal plane.
   *
   * This is the difference between a gait and a limp. Every other rotation here
   * is a delta laid over the idle, which is right for a spine twist or a lean —
   * but the idle holds this character in a *staggered stance*, left foot 0.27 m
   * forward and right foot 0.28 m back. Add a symmetric swing to that and each
   * leg oscillates about its own offset centre: the left foot spends almost the
   * whole cycle in front of the right, and the walk comes out as a shuffle where
   * one leg leads and the other is dragged after it, never passing.
   *
   * So the legs are *aimed* instead. The segment's current direction is measured
   * from where it actually is to where its child actually is, and only the
   * difference from the target is applied. Whatever stance the idle was holding
   * is cancelled, the two legs become genuinely symmetric, and they cross.
   *
   * `angle` is measured from straight down, positive swinging backward — the
   * same convention as everything else in this file. Sideways splay is left
   * alone: only the sagittal component is corrected, so the rig keeps its own
   * stance width and toe-out.
   *
   * @param {number} blend 0 leaves the idle untouched, 1 drives the limb fully
   */
  _aim(name, angle, blend) {
    if (blend <= 0.001) return;
    const bone = this.bones.get(name);
    const child = this.bones.get(this.limbChild[name]);
    if (!bone || !child) return;

    bone.getWorldPosition(_hip);
    child.getWorldPosition(_childAt);
    _limb.subVectors(_childAt, _hip);
    // Project into the sagittal plane; the limb's sideways component is the
    // rig's business, not the gait's.
    _limb.addScaledVector(_right, -_limb.dot(_right));
    if (_limb.lengthSq() < 1e-8) return;
    _limb.normalize();

    const current = Math.atan2(-_limb.dot(_forward), -_limb.dot(_up));
    this._rotate(name, _right, (angle - current) * blend);
  }

  /**
   * The leg's *extended* length: thigh plus shin, metres.
   *
   * Measured as the two segments rather than as hip-to-ankle, because those are
   * bone lengths and do not change with the pose. Hip-to-ankle would have been
   * whatever the idle's bent knee happened to leave, and the IK below needs the
   * length the leg has when it is straight — that is what `L·cos(κ/2)` is a
   * fraction of.
   *
   * Eased rather than snapped anyway: the idle breathes, and skinning puts a
   * little noise on the joint positions.
   */
  _measureLeg() {
    const upLeg = this.bones.get('LeftUpLeg');
    const knee = this.bones.get('LeftLeg');
    const foot = this.bones.get('LeftFoot');
    if (!upLeg || !knee || !foot) return;

    upLeg.getWorldPosition(_hip);
    knee.getWorldPosition(_childAt);
    foot.getWorldPosition(_ankle);
    const measured = _hip.distanceTo(_childAt) + _childAt.distanceTo(_ankle);
    if (measured > 0.2) this.legLength += (measured - this.legLength) * 0.08;
  }

  /**
   * Recompute world matrices for a bone and everything under it.
   *
   * Every measurement in this file — `_aim`, `_aimTo`, `_squarePelvis`,
   * `_measureLeg` — reads `matrixWorld`, which Three.js only refreshes at
   * render time. So without this, each aim measures the pose as it was *before*
   * this frame's earlier rotations: the shin is aimed against a thigh that has
   * already moved, the whole leg against a pelvis that has already turned. The
   * error is proportional to how far the ancestors travelled this frame, which
   * means it oscillates with the gait — and an oscillating error in where the
   * foot ends up is exactly a foot that slides.
   */
  _refresh(name) {
    this.bones.get(name)?.updateWorldMatrix(false, true);
  }

  /**
   * Rotate a bone by `angle` about a **world** axis, on top of whatever the
   * mixer wrote into it this frame.
   *
   * `bone.quaternion` is relative to its parent, so a world-space delta has to
   * be conjugated into the parent's frame before it can be composed:
   *
   *   world' = delta · world = delta · parent · local
   *   local' = (parent⁻¹ · delta · parent) · local
   */
  _rotate(name, axis, angle) {
    if (Math.abs(angle) < 1e-4) return;
    const bone = this.bones.get(name);
    if (!bone?.parent) return;

    bone.parent.getWorldQuaternion(_parent);
    _inverse.copy(_parent).invert();
    _delta.setFromAxisAngle(axis, angle);
    _local.copy(_inverse).multiply(_delta).multiply(_parent);
    bone.quaternion.premultiply(_local);
  }

  /**
   * Lay the gait over the pose the mixer just wrote.
   *
   * Called from `CharacterController.update` *after* `mixer.update`, and driven
   * by real time only where it has to be — the phase itself comes from distance,
   * so this function is almost stateless.
   */
  applyPose() {
    if (!this.bones.size) return;
    const cfg = this.cfg;

    // Recalibrate whenever the body is standing still. The gait is a *delta* on
    // whatever the mixer wrote, and the idle it is composed onto does not hold
    // the legs perfectly straight — so the working length of the leg is a few
    // per cent shorter than the bind pose says. Measuring the bind pose instead
    // left every step about 11% short, which the feet paid for by skating.
    if (this.gait < 0.05) this._measureLeg();
    const gait = this.gait;
    const air = this.grounded ? 0 : 1;
    const sit = this.sit;

    this._lift = 0;
    if (gait < 0.005 && sit < 0.005 && air === 0) {
      this.character.motion.position.set(0, 0, 0);
      return;
    }
    // Cleared here so only `_poseGait` ever writes it, and standing still is
    // always dead centre.
    this.character.motion.position.x = 0;
    this.character.motion.position.z = 0;

    // The body's own axes, in world space. `facing` already accounts for the
    // rig's bind orientation, so these are correct whichever way the FBX was
    // authored.
    const yaw = this.character.facing;
    _forward.set(Math.sin(yaw), 0, Math.cos(yaw));
    _right.copy(_up).cross(_forward).normalize();

    // Sit first, then the air pose, then the gait: each is a smaller correction
    // than the last, and the one nearest the top wins where they overlap.
    if (sit > 0.005) this._poseSit(sit, cfg);
    if (air > 0) this._poseAir(cfg);
    if (gait > 0.005) {
      if (this.useProceduralGait) this._poseGait(gait, cfg);
      else this._poseClipLocomotion(gait, cfg);
    }

    // One writer for the vertical offset, so a jump taken out of a sit does not
    // fight two functions for the same field.
    this.character.motion.position.y = this._lift;
  }

  /**
   * When walk/run clips are playing, only add vertical bob — the clips own every
   * limb angle. Procedural ankle and arm posing on top of a walk clip is what
   * makes feet and wrists fight the authored motion.
   */
  _poseClipLocomotion(gait, cfg) {
    const effort = this.effort;
    const beat = Math.sin(this._phase());
    this._lift = cfg.bodyBob * 0.22 * gait * (0.3 + 0.7 * effort) * Math.max(0, beat);
  }

  /**
   * The walk/run cycle.
   *
   * Positive rotation about the body's right axis swings a limb *backward*, so
   * every forward swing below is negative. The knee only folds on the backswing
   * — a knee that bends both ways is the classic tell of a procedural walk.
   */
  _poseGait(gait, cfg) {
    const effort = this.effort;
    const run = this.runBlend;
    // `gait` fades the overlay in and out. `amount` used to halve everything at
    // a walk on the theory that a slower gait is a smaller one — but a walk is
    // not a faint run, it is a full-sized motion at a different tempo, and
    // scaling it down was most of what made the body look like it could not
    // move freely. What genuinely scales with speed is the *lean*, and that
    // reads `effort` directly.
    const amount = gait * (0.88 + 0.12 * effort);

    /* ---- the duty cycle ----
       What fraction of the cycle each foot spends on the ground. A walk keeps a
       foot down for more than half of it (there is a moment with both down); a
       run keeps it down for a third and spends the rest airborne. This one
       number is what makes them two gaits rather than one gait at two speeds,
       and everything below reads it. */
    const duty = lerp(cfg.stanceWalk, cfg.stanceRun, this.speedBlend);

    /* ---- how far the foot has to travel ----
       A planted foot moves backward *relative to the body* by exactly as far as
       the body travels while it is down: `duty × stride`. That distance, not an
       angle, is what the leg is driven from — because the thigh angle that
       produces it depends on how much the knee happens to be bent, and the knee
       is bending for reasons of its own.

       Scaled by `gait` so the legs collapse to standing, and *not* by `amount`:
       shrinking the excursion for style would break the very equality that
       keeps the feet planted. */
    const stride = this._strideLength();
    /* How far back a stance reaches compared to how far forward — and the
       reason the excursion below is divided by `1 + bias` rather than halved.
       The foot sweeps from `+bias · halfStep` to `−halfStep`, so its travel is
       `halfStep · (1 + bias)`, and *that* is what has to equal the distance the
       body covers while the foot is down. Halving instead only balances when
       `bias` is 1: at 0.62 the foot was moving 19% slower than the body for the
       whole of stance, which is a skid, and it was quietly costing the backswing
       a fifth of its reach. */
    const bias = lerp(1, cfg.strideBias, run);
    /* Not all of that travel is the ankle's, though. A foot rolls heel to toe
       through stance and the pelvis rotates over it, and both move the *contact
       point* forward without the ankle going anywhere. A walk leans on this
       heavily — its stance is long — and a run barely at all, because the foot
       is down briefly and near flat. Without it a walk asks the leg to span
       1.1 m, which no leg on this rig can do. */
    const roll = lerp(cfg.footRollWalk, cfg.footRollRun, run);
    const halfStep = (duty * stride * (1 - roll) * cfg.legSwing * gait) / (1 + bias);

    // Where in its own cycle each leg is: 0 is heel strike, `duty` is toe-off,
    // 1 is the next heel strike. The right leg is half a cycle behind.
    const u = (this._phase() / (Math.PI * 2)) % 1;
    const uL = u < 0 ? u + 1 : u;
    const uR = (uL + 0.5) % 1;

    this.duty = duty;
    this.halfStep = halfStep;

    const legL = this._legState(uL, halfStep, duty, run, gait, bias, cfg);
    const legR = this._legState(uR, halfStep, duty, run, gait, bias, cfg);

    /* ---- the cycle's two rhythms ----
       `u = 0` is the left heel strike, so the left leg is at its most *forward*
       there — which means everything that swings opposite the left leg peaks at
       `u = 0` and wants a cosine, not a sine. An earlier pass had the arms on
       `sin`, putting their extremes at u ≈ 0.31: nearly a third of a cycle out
       of step with the legs, which is about as wrong as arm swing can be while
       still moving. */
    const beat = Math.cos(uL * Math.PI * 2);
    // The pelvis turns *with* the forward leg and the shoulders turn against it.
    const twist = beat * this.leftSide;

    /* ---- torso ----
       Applied *before* the limbs, because the limbs are aimed at absolute
       angles and measure their own direction to get there. Rotate the pelvis or
       the spine afterwards and every one of those aims is off by however much
       the torso just moved. */
    this._poseTorso(gait, amount, effort, run, uL, twist, beat, duty, legL, legR, cfg);

    /* ---- legs ----
       The torso has just moved, so the skeleton's world matrices are stale;
       refresh before anything measures itself against them. */
    this._refresh('Hips');
    this._applyLeg('Left', legL, gait, run);
    this._applyLeg('Right', legR, gait, run);

    /* ---- arms ----
       Aimed, not nudged, and for a blunter reason than the legs: this idle is a
       *casting* stance, arms up and forward as if holding something. Adding a
       swing to that leaves the upper body visibly inert while the legs work —
       which is most of what made an earlier pass read as a shuffle rather than
       a run. So the arms are placed outright: hanging, tucked toward the ribs,
       swinging opposite the leg on the same side, with the elbow closing toward
       a right angle as the pace picks up. A sprinter runs with bent arms; a
       stroller does not.

       Faded out while a cast clip is playing, because that clip is doing
       something deliberate with the arms and it outranks a gait. */
    const walkStyle = this.walking ? lerp(0.68, 1, this.speedBlend) : 1;
    const armBlend = gait * walkStyle * (this.character.isCasting ? 0.15 : 1);
    this._poseArms(run, uL, armBlend, cfg);

    /* ---- weight shift ----
       The pelvis travels *sideways* over whichever foot is carrying it — a
       couple of centimetres at a run, twice that at a walk. It is a small
       number and it does more for the look than anything else here: without it
       the body runs on rails, and every vertical and rotational cue above is
       arguing with a torso that never commits to a foot. */
    const support = Math.cos((uL - duty * 0.5) * Math.PI * 2);
    const swayAmount = lerp(cfg.hipSwayWalk, cfg.hipSwayRun, run) * amount;
    // `_right` is a world direction; `motion` is parented under the root's yaw,
    // so it has to be expressed in that frame.
    _sway.copy(_right).applyAxisAngle(_up, -this.character.root.rotation.y);
    this.character.motion.position.x = _sway.x * support * swayAmount * this.leftSide;
    this.character.motion.position.z = _sway.z * support * swayAmount * this.leftSide;

    if (this.grounded) this._lift += this._bodyHeight(legL, legR, uL, duty, run, cfg) * amount;
  }

  /**
   * Arm swing layered as **deltas** over the idle/cast pose.
   *
   * Absolute aiming (`_aimTo`) tried to hang the arms straight down, which
   * fights this rig's casting idle and produced backward elbows and splayed
   * palms during walk. Pendulum deltas about the body's right axis read
   * correctly at both walk and run without replacing the clip underneath.
   */
  _poseArms(run, uL, blend, cfg) {
    if (blend <= 0.001) return;

    const armPhase = -Math.cos((uL - 0.04) * Math.PI * 2);
    const walkEase = this.walking ? lerp(0.55, 1, this.runBlend) : lerp(0.75, 1, this.runBlend);
    const armAmp = cfg.armSwing * (0.42 + 0.58 * run) * walkEase;
    const reachRatio = cfg.armForwardReach * lerp(0.28, 1, run);
    const tuck = cfg.armTuck * (0.35 + 0.55 * run);
    const carry = -cfg.armCarry * run;
    const elbowMean = lerp(cfg.elbowWalk, cfg.elbowRun, run);
    const style = this.walking ? lerp(0.72, 1, this.runBlend) : lerp(0.82, 1, this.runBlend);
    const armBlend = blend * style;

    for (const side of ['Left', 'Right']) {
      const sign = side === 'Left' ? this.leftSide : -this.leftSide;
      const isWand = side === this.wandSide;
      const phase = side === 'Left' ? armPhase : -armPhase;
      const swing =
        armAmp * (phase * (1 + reachRatio) * 0.5 + (1 - reachRatio) * 0.5) + carry * (isWand ? 0.2 : 1);
      const norm = clamp(swing / Math.max(0.15, armAmp), -1, 1);
      const elbow = elbowMean * (1 - norm * cfg.elbowSwing);
      let sideBlend = armBlend;
      if (isWand && this.walking) sideBlend *= lerp(0.15, 0.55, this.runBlend);

      const shoulderBlend = isWand && this.walking ? sideBlend * 0.45 : sideBlend;
      this._rotate(`${side}Shoulder`, _forward, -sign * swing * cfg.shoulderDrop * shoulderBlend);
      this._rotate(`${side}Shoulder`, _up, -sign * swing * 0.06 * shoulderBlend);
      this._refresh(`${side}Shoulder`);

      this._rotate(`${side}Arm`, _right, -swing * sideBlend);
      this._rotate(`${side}Arm`, _forward, -sign * tuck * 0.28 * sideBlend);
      this._refresh(`${side}Arm`);
      this._rotate(`${side}ForeArm`, _right, (elbow - lerp(0.25, 0.7, run)) * sideBlend);
      this._refresh(`${side}ForeArm`);
      this._relaxHand(side, sign, this._handBlend(run, sideBlend, isWand), cfg, swing);
    }
  }

  /**
   * Wind the torso so the limbs are not swinging off a box.
   *
   * A walk that only moves the legs and arms is a mannequin on rails: the
   * pelvis, lumbar, ribcage and head have to *disagree* with each other, and
   * the disagreement has to travel up the body rather than fire as one rigid
   * twist. Three things do that work:
   *
   *   - Counter-rotation. The pelvis yaws with the forward leg; the shoulders
   *     yaw the other way, harder, and a few percent of a cycle later. That
   *     lag is what makes the rotation read as a wave instead of a crank.
   *   - An S-curve. The pelvis lists toward the swinging leg and the thorax
   *     bends the opposite way, so the head stays over the support foot.
   *     Same-side bend the whole way up is a sideways lean, not a spine.
   *   - A chest that pitches against the stride, plus a little crumple when
   *     the stance knee takes the weight. Without those the ribcage is welded
   *     to the pelvis and the silhouette never changes shape.
   *
   * Applied before the limbs are aimed, for the same reason as always: the
   * legs and arms measure where they are.
   */
  _poseTorso(gait, amount, effort, run, uL, twist, beat, duty, legL, legR, cfg) {
    // Runners lean *from the ankles*, not the waist: the coaching literature is
    // emphatic that the body is one straight tilted line, ribs stacked over the
    // pelvis. So most of the lean goes on the Hips — the whole skeleton pitches,
    // and the legs are re-aimed at absolute angles afterwards so the feet stay
    // planted — with only a few degrees spread up the spine so the chest leads.
    // An earlier pass put all of it on the spine, which is the classic "hunched"
    // form fault, and the pelvis staying vertical hid the lean entirely.
    //
    // Two sources: sustained speed (~8 deg at a jog, ~22 at a sprint), and the
    // smoothed acceleration — leaning into a start, back against a stop.
    const lean =
      cfg.runLean * gait * (0.12 * effort + 0.88 * run) +
      clamp(this._accelFwd * cfg.accelLean, -0.22, 0.4) * gait;
    const bank = clamp(-this._accelLat * cfg.accelLean * 0.6, -0.13, 0.13) * gait;

    // Square the pelvis first: the idle holds it turned, which offsets the two
    // hip *sockets* fore and aft by 14 cm before either leg has moved. Aiming
    // the legs absolutely fixes their angles but cannot fix where they hang
    // from, so this is the other half of making the two sides symmetric.
    this._squarePelvis(gait);

    const cycle = uL * Math.PI * 2;
    const lag = cfg.spineLag * Math.PI * 2;
    const thoracicBeat = Math.cos(cycle - lag);
    const thoracicTwist = thoracicBeat * this.leftSide;
    const list = Math.sin(cycle) * this.leftSide;
    // Walk stays modest; a run is allowed to wind up. The two halves of the
    // torso have to disagree *more* as the pace picks up, or a sprint is just
    // a faster walk with bent elbows.
    const pelvis = cfg.pelvisTwist * (0.55 + 0.95 * run) * amount * (this.walking ? 0.82 : 1);
    const shoulders = cfg.shoulderTwist * (0.45 + 1.05 * run) * amount * (this.walking ? 0.78 : 1);
    const bounce = cfg.chestBounce * (0.7 + 0.7 * run) * amount;
    const sideBend = cfg.spineBend * (0.65 + 0.7 * run) * amount;
    const hipList = cfg.pelvisList * (0.75 + 0.55 * run) * amount;

    /* ---- yaw: pelvis with the forward leg, thorax against it, delayed ---- */
    this._rotate('Hips', _up, -twist * pelvis);
    // Lumbar continues the pelvis rather than flipping — a real spine does
    // not reverse in one vertebra.
    this._rotate('Spine', _up, -twist * pelvis * 0.4);
    this._rotate('Spine1', _up, thoracicTwist * shoulders * 0.45);
    this._rotate('Spine2', _up, thoracicTwist * shoulders * 0.7);

    /* ---- roll: pelvis drops toward the swing leg, thorax S-curves back ---- */
    this._rotate('Hips', _forward, list * hipList + bank);
    this._rotate('Spine', _forward, list * sideBend * 0.65);
    this._rotate('Spine1', _forward, -list * sideBend * 0.25);
    this._rotate('Spine2', _forward, -list * sideBend * 0.85);

    /* ---- pitch: ankle lean, plus a chest that is not welded to the hips ---- */
    // Once-per-step anterior tilt as the trailing hip extends — the drive.
    const drive = Math.pow(Math.max(0, -beat), 2) * run * 0.07 * amount;
    // Mid-stance crumple: the ribcage gives a little when a bent knee takes
    // the weight. That is the shape change that stops a run looking like a
    // statue being carried forward.
    const crumple =
      run *
      0.5 *
      ((legL.stance ? Math.sin((legL.u / Math.max(0.05, duty)) * Math.PI) : 0) +
        (legR.stance ? Math.sin((legR.u / Math.max(0.05, duty)) * Math.PI) : 0)) *
      0.09 *
      amount;

    // Most of the lean stays on the hips (one tilted line from the ankles).
    // The thorax then *opens* against it — chest proud, not folded — which is
    // the difference between a sprinter and someone hunched over their knees.
    const chestOpen = run * 0.16 * amount;
    this._rotate('Hips', _right, lean * 0.72 + drive);
    this._rotate('Spine', _right, lean * 0.08 + crumple * 0.35 + beat * bounce * 0.15);
    this._rotate('Spine1', _right, lean * 0.04 - thoracicBeat * bounce * 0.3 - chestOpen * 0.45);
    this._rotate('Spine2', _right, -thoracicBeat * bounce * 0.4 - chestOpen);

    /* ---- head: tall, looking ahead ----
       Bolt's cue is the face staying on the horizon. Take most of the lean
       and the side-bend back so the head does not nod at the scenery; leave
       a little so it is still attached to the body. */
    this._rotate('Neck', _right, -lean * 0.78 + thoracicBeat * bounce * 0.25);
    this._rotate('Neck', _up, -thoracicTwist * shoulders * 0.45);
    this._rotate('Neck', _forward, -list * sideBend * 0.35);
    this._rotate('Head', _right, -thoracicBeat * bounce * 0.2);
    this._rotate('Head', _up, -thoracicTwist * shoulders * 0.15);
    this._rotate('Head', _forward, -list * sideBend * 0.1);
  }

  /**
   * Where one leg is in its cycle.
   *
   * `u` is 0 at heel strike, `duty` at toe-off, 1 at the next heel strike.
   *
   * This is a one-dimensional IK rather than a set of authored angles, and that
   * inversion is the whole trick. The thing that has to be right is where the
   * **foot** is: through stance it must slide backward relative to the body at
   * exactly the body's speed, or it skates. So the foot's position is what gets
   * driven — linearly through stance, which is what an inverted pendulum does —
   * and the hip angle is solved from it.
   *
   * Driving the hip directly instead fails twice over. A sine-shaped hip only
   * matches the body's speed at one instant per step (measured: planted for a
   * fifth of the cycle). And even a linear hip sweep skates once the knee
   * starts moving, because a bending knee shortens the leg and drags the foot
   * with it — which is exactly what a measured sprint was doing, at 7 m/s.
   *
   * The solve is closed form. A two-segment leg with a knee angle κ behaves as
   * a single strut of length `L·cos(κ/2)` pointing along `hip + κ/2`, so the
   * hip that puts the foot at `target` is one arcsine.
   */
  _legState(u, halfStep, duty, run, blend, bias, cfg) {
    const stance = u < duty;
    /** Where the foot should be, forward of the hip, metres. */
    let target;
    /** 0 through stance, one hump peaking at mid-swing. */
    let swing;

    if (stance) {
      // Linear: constant velocity relative to the body, for the whole of stance.
      target = halfStep * (bias - (1 + bias) * (u / duty));
      swing = 0;
    } else {
      // Swing: back to front, eased, and much faster than the stance sweep.
      // Weighted *late* — the trailing leg hangs behind the body with the knee
      // folded and then whips through, rather than travelling forward at an
      // even rate. That linger is most of what a run's rear silhouette is, and
      // it is free: the foot is in the air, so nothing about it can skate.
      const t = (u - duty) / (1 - duty);
      const eased = Math.pow(t * t * (3 - 2 * t), cfg.swingLinger);
      target = halfStep * (-1 + (1 + bias) * eased);
      swing = Math.sin(Math.pow(t, 0.78) * Math.PI);
    }

    // The knee folds through the swing — that is the ground clearance, and the
    // single most legible difference between a walk and a pair of scissors...
    // Peaks early rather than at mid-swing: the knee folds hard right after
    // toe-off and is straightening again well before the foot lands.
    const clearance = swing * swing * (1.25 - 0.25 * swing);
    // ...plus two things that really do happen during stance: a fold as the
    // trailing leg pushes off, and — running only — the knee giving under the
    // body's weight at mid-stance. That absorption is what stops a run from
    // pogoing, and it is why a runner's hips dip where a walker's rise.
    const pushOff = stance ? Math.max(0, (u / duty - 0.72) / 0.28) ** 2 : 0;
    const absorb = stance ? run * cfg.stanceKnee * Math.sin((u / duty) * Math.PI) : 0;

    // A running knee is *never* straight — biomechanics puts 20–40 degrees of
    // flexion in it even at the moment of contact, and a leg that snaps fully
    // straight at heel strike is a walking leg whatever the speed. So a run
    // carries a flexion floor under everything else.
    const kneeFloor = run * cfg.kneeContact * blend;

    // Driven by `gait` rather than by the stylistic `amount` the torso uses:
    // knee lift is not decoration, it is the ground clearance, and a run that
    // folds its knees two thirds of the way reads as a jog on a treadmill.
    const knee =
      kneeFloor +
      cfg.kneeBend * blend * (0.26 + 0.52 * run) * clearance +
      pushOff * 0.32 * blend * run +
      absorb;

    // Solve the hip from the target. `effective` is how long the leg is with
    // that knee in it, and `alpha` the angle of the strut it has become.
    /* Solve the hip from the target. `effective` is how long the leg is with
       that knee in it, and `alpha` the angle of the strut it has become. */
    const half = knee * 0.5;
    const effective = Math.max(0.05, this.legLength * Math.cos(half));
    const alpha = Math.asin(clamp(-target / effective, -0.985, 0.985));
    const hip = alpha - half;

    /* How far *below the ankle* the foot's contact point sits at this part of
       the stroke — the ankle rolling onto its heel or up onto its toe.

       This is the flattening term, and it belongs here and not in the solve
       above. Adding it to `effective` looks equivalent and is not: the solve
       decides the thigh and shin angles, and those two bones cannot actually
       get any longer, so an inflated `effective` puts the *ankle* short of its
       target and the foot skates. Applied to the body's height instead, it says
       the true thing — the leg reaches the ground from further up. */
    const reach = halfStep > 1e-4 ? Math.min(1, Math.abs(target) / halfStep) : 0;
    // Scaled by the gait, because the two ends of it do very different things
    // with a foot: a sprinter leaves the ground fully up on the toe, a walker
    // rolls gently over a nearly flat one. Using the sprint's figure at a walk
    // put a quarter of a leg length under the ankle and stopped the walk
    // planting — measured, stance fell to 26% of the cycle.
    const contact =
      (pushOff * cfg.ankleExtend * (0.3 + 0.7 * run) +
        reach * reach * cfg.legExtend * (0.2 + 0.8 * run)) *
      lerp(0.45, 1, run);

    return { u, hip, knee, alpha, effective, contact, swing, stance, pushOff };
  }

  /**
   * Aim one leg.
   *
   * Thigh and shin sit either side of the strut the IK solved — the thigh at
   * `alpha − κ/2`, the shin at `alpha + κ/2` — which is exactly what puts their
   * tip on the target the solve was given. In that order, too: the shin measures
   * its own direction, so it has to be corrected after the thigh has moved.
   */
  _applyLeg(side, leg, blend, run) {
    // Each segment measures its own direction, so each has to see the previous
    // one's correction before it makes its own.
    // Extra thigh lift on the swing only — the foot is in the air, so it
    // cannot skate, and a high knee is the front half of a sprint silhouette.
    const drive = !leg.stance ? leg.swing * this.runBlend * 0.22 : 0;
    this._aim(`${side}UpLeg`, leg.alpha - leg.knee * 0.5 - drive, blend);
    this._refresh(`${side}UpLeg`);
    this._aim(`${side}Leg`, leg.alpha + leg.knee * 0.5, blend);
    this._refresh(`${side}Leg`);
    this._applyAnkle(side, leg, blend, run);
  }

  /**
   * Heel-toe roll and swing-phase dorsiflexion as small ankle **deltas**.
   *
   * Absolute foot aiming assumed the toe bone pointed straight down in bind
   * pose, which is wrong for Mixamo — it twisted the ankle every step. These
   * rotations are modest and scale down at a walk.
   */
  _applyAnkle(side, leg, blend, run) {
    const ankleBlend = blend * lerp(0.32, 1, this.runBlend);
    if (ankleBlend <= 0.001) return;

    if (leg.stance) {
      const phase = leg.u / Math.max(0.05, this.duty);
      const heel = phase < 0.12 ? (1 - phase / 0.12) * 0.055 * (1 - run * 0.45) : 0;
      const toe = phase > 0.7 ? ((phase - 0.7) / 0.3) * 0.09 * (0.3 + 0.7 * run) : 0;
      this._rotate(`${side}Foot`, _right, (-heel + toe) * ankleBlend);
    } else {
      this._rotate(`${side}Foot`, _right, -leg.swing * 0.08 * run * ankleBlend);
    }

    if (leg.pushOff > 0.02 && run > 0.3) {
      this._rotate(`${side}ToeBase`, _right, -leg.pushOff * 0.22 * ankleBlend);
    }
  }

  /**
   * How far the body sits below its rest height, metres.
   *
   * Not a decorative bob — it is *forced*, and it is the other half of not
   * skating. A straight leg is a chord: a body standing on a leg swung out to
   * ±A sits `L(1 − cos A)` lower than one standing on a vertical leg. Drive the
   * vertical from anything other than the supporting leg's own geometry and the
   * foot cannot stay on the floor for the whole of stance — it either hovers or
   * sinks, and the leg keeps sweeping underneath it. That is exactly what a
   * measured sprint was doing: the foot dragged backward at 7 m/s.
   *
   * So the height is read straight off whichever leg is carrying the weight,
   * shortened by however much that knee has given. The walk's vault over a
   * straight stance leg and the run's dip into a bent one both fall out of it
   * for free, rather than being two curves that had to be authored and blended.
   */
  _bodyHeight(legL, legR, uL, duty, run, cfg) {
    // Whichever leg is more nearly vertical is the one carrying the weight.
    let support = null;
    if (legL.stance && legR.stance) support = Math.abs(legL.hip) < Math.abs(legR.hip) ? legL : legR;
    else if (legL.stance) support = legL;
    else if (legR.stance) support = legR;

    if (support) {
      // The strut the solve already produced: how long the leg is with that
      // knee in it, tilted to where the foot had to be.
      const drop =
        this.legLength - support.effective * Math.cos(support.alpha) - support.contact;
      // Capped. At the extremes of a long stride the chord model asks the hips
      // to sink further than any runner does, and the reason it is wrong is that
      // the *contact point* migrates: a foot at toe-off is up on its toe and one
      // at heel strike is still coming down. Letting the foot ride a little high
      // there is closer to the truth than pumping the whole body a third of a
      // metre every step.
      return -clamp(drop, 0, lerp(cfg.dropWalk, cfg.dropRun, run)) * cfg.bodyBob;
    }

    // Neither foot is down: a run's flight phase. Keep the body low — actual
    // jumps come only from Space (`verticalVelocity`), not from the gait overlay.
    const gap = Math.max(1e-3, 0.5 - duty);
    const t = uL > duty && uL < 0.5 ? (uL - duty) / gap : (uL - (0.5 + duty)) / gap;
    const reach = Math.min(0.985, this.halfStep / Math.max(0.05, this.legLength));
    const airborne = -Math.min(
      lerp(cfg.dropWalk, cfg.dropRun, run),
      this.legLength * (1 - Math.sqrt(Math.max(0, 1 - reach * reach)))
    );
    return airborne * cfg.bodyBob;
  }

  /**
   * Take the spell out of the hand.
   *
   * This rig has no finger bones — the spread, palm-open casting hand is baked
   * into the skin, and it is what turned every forward arm swing into a push.
   * The one joint that exists is the wrist, so the wrist does all the acting:
   * rolled about the forearm's own axis so the palm faces the ribs (thumbs
   * up), and flexed a little so the fingers trail rather than present.
   *
   * `sign` is +left / −right. The roll has to go *the same way relative to
   * the body* on both wrists — palm in, not palm out. An earlier sign put
   * every palm on the outside of the forearm, which is the "opposite side"
   * the silhouette was showing.
   */
  _relaxHand(side, sign, blend, cfg, swing = 0) {
    const fore = this.bones.get(`${side}ForeArm`);
    const hand = this.bones.get(`${side}Hand`);
    if (!fore || !hand) return;

    // Before anything else. No clip writes this bone, so without the reset the
    // two rotations below compound every frame and the hand spins.
    this._restore(`${side}Hand`);
    if (blend <= 0.001) return;

    fore.getWorldPosition(_hip);
    hand.getWorldPosition(_childAt);
    _limb.subVectors(_childAt, _hip);
    if (_limb.lengthSq() < 1e-8) return;
    _limb.normalize();

    const isWand = side === this.wandSide;
    const rollScale = this.walking ? lerp(0.35, 1, this.runBlend) : 1;
    const roll =
      (isWand ? cfg.handRoll * 0.18 : cfg.handRoll) +
      (isWand ? cfg.handRollCast : 0);
    this._rotate(`${side}Hand`, _limb, sign * roll * rollScale * blend);
    // Neutral sprinter wrist: a little flexion so the fingers don't present,
    // and a touch more on the backswing so the hand trails the drive.
    const curl = (isWand ? cfg.handCurl * 0.25 : cfg.handCurl) + Math.max(0, swing) * 0.12;
    this._rotate(`${side}Hand`, _right, curl * blend);
  }

  /** How much of the wrist styling shows: it is a running trait. */
  _handBlend(run, armBlend, isWand = false) {
    if (isWand && this.walking) return armBlend * lerp(0, 0.2, this.runBlend);
    return armBlend * lerp(0.25, 1, run);
  }

  /** Off the ground: tuck on the way up, reach for the floor on the way down. */
  _poseAir(cfg) {
    // Rising vs falling, as a signed 0..1 — the tuck unwinds into the landing.
    const rising = saturate(this.verticalVelocity / 6);
    const falling = saturate(-this.verticalVelocity / 6);
    const tuck = Math.max(rising, 1 - falling);

    this._rotate('LeftUpLeg', _right, -0.75 * tuck + 0.25 * falling);
    this._rotate('RightUpLeg', _right, -0.55 * tuck + 0.35 * falling);
    this._rotate('LeftLeg', _right, 1.35 * tuck);
    this._rotate('RightLeg', _right, 0.95 * tuck);
    this._rotate('LeftArm', _right, -0.7 * tuck - 0.3 * falling);
    this._rotate('RightArm', _right, -0.7 * tuck - 0.3 * falling);
    this._rotate('Spine', _right, 0.16 * tuck);
  }

  /**
   * Cross-legged, hands on the knees.
   *
   * The thighs fold up *and* splay outward — folding alone gives a kneel, and
   * the outward roll is what makes it read as sitting on the floor. The body
   * drops by `sitDrop` at the same time, or the feet go through it.
   */
  _poseSit(sit, cfg) {
    const fold = cfg.sitFold * sit;
    const splay = cfg.sitSplay * sit;

    this._rotate('LeftUpLeg', _right, -fold);
    this._rotate('RightUpLeg', _right, -fold);
    this._rotate('LeftUpLeg', _forward, splay);
    this._rotate('RightUpLeg', _forward, -splay);
    this._rotate('LeftLeg', _right, fold * 1.25);
    this._rotate('RightLeg', _right, fold * 1.25);
    this._rotate('LeftFoot', _right, -fold * 0.3);
    this._rotate('RightFoot', _right, -fold * 0.3);

    // Arms come down and forward to rest on the knees.
    this._rotate('LeftArm', _right, -0.45 * sit);
    this._rotate('RightArm', _right, -0.45 * sit);
    this._rotate('LeftForeArm', _right, -0.75 * sit);
    this._rotate('RightForeArm', _right, -0.75 * sit);
    this._rotate('LeftShoulder', _forward, 0.18 * sit);
    this._rotate('RightShoulder', _forward, -0.18 * sit);

    // Settle: the spine straightens and the chin comes down a little.
    this._rotate('Spine', _right, 0.1 * sit);
    this._rotate('Spine2', _right, -0.14 * sit);
    this._rotate('Head', _right, 0.12 * sit);

    this._lift -= cfg.sitDrop * sit;
  }

  /* ------------------------------------------------------------------ */

  /** Put the body back where it started, standing and still. */
  reset() {
    this.velocity.set(0, 0, 0);
    this.intent.set(0, 0, 0);
    this.walking = false;
    this.sprinting = false;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.sitting = false;
    this.sit = 0;
    this.gait = 0;
    this.distance = 0;
    this._gaitPhase = 0;
    this._lastStep = 0;
    this.character.root.position.set(0, 0, 0);
    this.character.motion.position.set(0, 0, 0);
  }
}
