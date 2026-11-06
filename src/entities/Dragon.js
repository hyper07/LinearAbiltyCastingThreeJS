import { MathUtils, Vector3 } from 'three';

import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { clamp, damp, saturate, Easing, randRange } from '../utils/math.js';
import { DecalType } from '../effects/GroundDecals.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { Monster, MonsterState } from './Monster.js';

const _toTarget = new Vector3();
const _scratch = new Vector3();
const _mouth = new Vector3();
const _aim = new Vector3();
const _flat = new Vector3();

/** How long the arrival flight takes, seconds. */
const ARRIVAL = 2.4;
/** The height it circles at once it takes to the air. */
const CRUISE = 4.6;

/**
 * The boss.
 *
 * `Monster` already owns the parts that are the same for everything on the
 * field — health, statuses, steering, the phase machine, pooling — so this is
 * only the parts that are *not*: a body with twenty-odd joints instead of ten,
 * three attacks instead of one, and a second phase where it stops walking and
 * takes to the air.
 *
 * The animation is the interesting half. Nothing here is a pose; everything is
 * a **wave** with a delay down the chain. The tail is a sine travelling from
 * the hips to the tip, the neck is the same sine at a quarter of the amplitude
 * running the other way, and the wing's forearm and hand lag the shoulder by a
 * fixed fraction of a beat. That lag is what makes a wingbeat look like it is
 * moving air: a wing whose joints all reach the top of the stroke together
 * reads as a cardboard cut-out flapping, and the fix is not more joints, it is
 * a hundred milliseconds of delay between the ones already there.
 *
 * The fight has two phases and they are read off the health bar:
 *
 *   **Grounded** — it stalks you on four legs, bites at close range, and sweeps
 *   the tail through everything around it when you crowd it.
 *   **Airborne** (under `flightThreshold` health) — it lifts off, holds station
 *   above the arena and does nothing but breathe fire, which the melee abilities
 *   cannot answer. The wings fold and unfold across that transition rather than
 *   snapping, because the transition is the moment the fight changes and it
 *   should be legible from anywhere in the keep.
 */
export class Dragon extends Monster {
  constructor(kind, assets) {
    super(kind, assets);

    /** 0..1 — folded on the ground, spread and beating in the air. */
    this.flight = 0;
    /** Metres above the floor. */
    this.altitude = 0;
    /** 0..1 — heat building in the throat before a breath. */
    this.charge = 0;
    /** Non-null while fire is actually coming out. */
    this.breath = null;

    this.flapPhase = randRange(0, Math.PI * 2);
    this.attackKind = 'bite';
    this._baseBarHeight = this.barHeight;
    this._breathTick = 0;
    this._roarDone = false;
  }

  /** The whole animal is a target, not a 60 cm cylinder at its feet. */
  get hitRadius() {
    return 1.7 * this.root.scale.x;
  }

  /**
   * Centre of mass, altitude included.
   *
   * `Monster` assumes a body whose middle sits a fixed height above its feet.
   * This one flies, so the hits, the damage numbers and the death burst all
   * have to follow it up.
   */
  centre(out = _scratch) {
    return out.set(this.position.x, this.centreHeight + this.altitude, this.position.z);
  }

  /** True once it has given up on walking. */
  get isAirborne() {
    return this.flight > 0.5;
  }

  /* ------------------------------------------------------------------ */
  /* lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  spawn(position, healthMultiplier = 1) {
    super.spawn(position, healthMultiplier);
    this.flight = 1; // it arrives on the wing
    this.altitude = 16;
    this.charge = 0;
    this.breath = null;
    this.attackKind = 'bite';
    this._roarDone = false;
    this.barHeight = this._baseBarHeight;
    return this;
  }

  /**
   * It does not climb out of a hole. It comes down out of the dark, wings out,
   * and lands hard enough to shake the camera — which is the only introduction
   * a boss gets.
   */
  _updateArriving(dt) {
    const t = saturate(this.stateTime / ARRIVAL);
    this.body.position.y = 0;
    this.body.scale.setScalar(1);

    // Fast at first, braking into the landing.
    this.altitude = 16 * (1 - Easing.outCubic(t));
    this.flight = 1 - Easing.inQuad(saturate((t - 0.6) / 0.4));

    if (t >= 1) {
      this.altitude = 0;
      this.flight = 0;
      this._enter(MonsterState.PURSUE);
      this._land();
    }
  }

  _land() {
    const ctx = this._ctx;
    const scale = this.root.scale.x;
    ctx?.shake?.add(1.1 * settings.global.cameraShake, 1.8, 16);
    ctx?.decals?.spawn(DecalType.DUSTRING, this.position, {
      radius: 5 * scale,
      life: 1.1,
      colorA: getColor('#8b8477'),
      colorB: getColor('#5a5449'),
      intensity: 1.1,
      width: 0.4,
      growth: 1.6
    });
    ctx?.particles?.get('monster-dust', { capacity: 700, additive: false, lit: true }).emit(60, {
      position: _scratch.set(this.position.x, 0.1, this.position.z),
      radius: 2.2 * scale,
      direction: { x: 0, y: 1, z: 0 },
      speed: 3.4,
      speedVariance: 0.8,
      spread: 1,
      size: 0.4 * scale,
      life: 1.5,
      tint: getColor('#7a7365'),
      time: ctx?.elapsed ?? 0
    });
  }

  /* ------------------------------------------------------------------ */
  /* the fight                                                           */
  /* ------------------------------------------------------------------ */

  update(dt, ctx) {
    // Stashed so the one-shot dressing (`_land`, the breath) can reach the
    // shared services without every one of them taking a ctx argument.
    this._ctx = ctx;
    super.update(dt, ctx);
    this._updateBreath(dt, ctx);
    this.barHeight = this._baseBarHeight + this.altitude;
  }

  /**
   * Pick and commit an attack.
   *
   * Rewritten rather than extended because a dragon's decision is a different
   * shape from an imp's: it is choosing between three attacks with different
   * ranges, and two of them are unavailable depending on whether it is standing
   * on the ground.
   */
  _updateFighting(dt, ctx) {
    const cfg = this.config;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Phase two: below the threshold it stops walking for good.
    const wounded = this.health / this.maxHealth < (cfg.flightThreshold ?? 0.5);
    const wantsFlight = wounded ? 1 : 0;
    this.flight = damp(this.flight, wantsFlight, 0.02, dt);
    this.altitude = damp(this.altitude, wantsFlight ? CRUISE : 0, 0.05, dt);

    if (wounded && !this._roarDone) {
      this._roarDone = true;
      this._roar(ctx);
    }

    _toTarget.copy(ctx.target).sub(this.position);
    _toTarget.y = 0;
    const distance = _toTarget.length();
    const scale = this.root.scale.x;

    if (this.state === MonsterState.WINDUP) {
      const windup = this._windupFor(this.attackKind);
      // The throat lights up through a breath wind-up and stays dark through the
      // others, so which attack is coming is readable before it lands.
      if (this.attackKind === 'breath') {
        this.charge = saturate(this.stateTime / windup);
      }
      if (this.stateTime >= windup) {
        this._commitAttack(ctx, distance, scale);
      }
      this._face(Math.atan2(_toTarget.x, _toTarget.z), dt, 3.5);
      return;
    }

    if (this.state === MonsterState.RECOVER) {
      this.charge = damp(this.charge, 0, 0.001, dt);
      if (this.stateTime > (this.breath ? 0.2 : 0.7)) this._enter(MonsterState.PURSUE);
      this._face(Math.atan2(_toTarget.x, _toTarget.z), dt, 2);
      return;
    }

    if (this.breath) {
      // Committed: hold the line while the fire is out.
      this._face(Math.atan2(_toTarget.x, _toTarget.z), dt, 1.6);
      return;
    }

    if (this.attackCooldown <= 0 && this.canAct) {
      const choice = this._chooseAttack(distance, scale);
      if (choice) {
        this.attackKind = choice;
        this._enter(MonsterState.WINDUP);
        return;
      }
    }

    // Airborne it holds station at *breath* range — it has no reason to come
    // any closer, and closing to bite range would put it back inside the reach
    // of the abilities it just flew away from. Grounded, it closes to bite.
    const desired = this.isAirborne
      ? (cfg.breathRange ?? 14) * scale * 0.42
      : cfg.attackRange * scale * 0.6;
    this._steerToward(ctx, distance > desired ? 1 : -0.6, dt);
  }

  _chooseAttack(distance, scale) {
    const cfg = this.config;
    if (this.isAirborne) {
      // Nothing but fire from up there — which is the point of it going up.
      return distance < (cfg.breathRange ?? 14) * scale ? 'breath' : null;
    }
    if (distance < (cfg.sweepRadius ?? 5.5) * scale * 0.85) {
      // Crowded: half the time it bites, half the time it clears the ring.
      return Math.random() < 0.5 ? 'sweep' : 'bite';
    }
    if (distance < (cfg.breathRange ?? 14) * scale) return 'breath';
    return null;
  }

  _windupFor(kind) {
    const cfg = this.config;
    if (kind === 'breath') return cfg.breathWindup ?? 1.3;
    if (kind === 'sweep') return cfg.sweepWindup ?? 0.75;
    return cfg.attackWindup ?? 0.9;
  }

  _commitAttack(ctx, distance, scale) {
    const cfg = this.config;

    switch (this.attackKind) {
      case 'breath':
        this.breath = { time: 0, duration: cfg.breathDuration ?? 2.1 };
        this._breathTick = 0;
        this.attackCooldown = cfg.breathCooldown ?? 5.0;
        break;

      case 'sweep':
        // A ring, not a cone: the whole point of the tail is that standing
        // behind it is not safe either.
        this._tailSweep(ctx, scale);
        this.attackCooldown = cfg.sweepCooldown ?? 4.0;
        break;

      default:
        this.pendingAttack = {
          damage: cfg.attackDamage * settings.monsters.damageScale,
          splash: 0,
          inRange: distance <= cfg.attackRange * scale * 1.3,
          ranged: false
        };
        this.attackCooldown = cfg.attackCooldown ?? 2.6;
        break;
    }

    this._enter(MonsterState.RECOVER);
  }

  /** The moment it gives up on the ground. */
  _roar(ctx) {
    const scale = this.root.scale.x;
    this.centre(_scratch);
    ctx.shake?.add(1.4 * settings.global.cameraShake, 1.2, 12);
    ctx.bursts?.spawn(BurstMode.STORM, _scratch, {
      radius: 1.0 * scale,
      endRadius: 9 * scale,
      life: 1.1,
      intensity: 1.6,
      opacity: 0.55,
      colorA: getColor(this.config.accent)
    });
    ctx.decals?.spawn(DecalType.SHOCKWAVE, this.position, {
      radius: 11 * scale,
      life: 0.9,
      colorA: getColor(this.config.accent),
      colorB: getColor('#ffd9a0'),
      intensity: 2.0,
      width: 0.1,
      growth: 2.0
    });
  }

  /** Tail sweep: everything within `sweepRadius` is hit and thrown outward. */
  _tailSweep(ctx, scale) {
    const cfg = this.config;
    const radius = (cfg.sweepRadius ?? 5.5) * scale;

    ctx.decals?.spawn(DecalType.SHOCKWAVE, this.position, {
      radius,
      life: 0.5,
      colorA: getColor(cfg.accent),
      colorB: getColor('#ffffff'),
      intensity: 1.8,
      width: 0.14,
      growth: 1.7
    });
    ctx.particles?.get('monster-dust', { capacity: 700, additive: false, lit: true }).emit(40, {
      position: _scratch.set(this.position.x, 0.15, this.position.z),
      radius: radius * 0.8,
      direction: { x: 0, y: 1, z: 0 },
      speed: 2.6,
      spread: 1,
      size: 0.3 * scale,
      life: 1.0,
      tint: getColor('#7a7365'),
      time: ctx.elapsed
    });
    ctx.shake?.add(0.7 * settings.global.cameraShake, 2.0, 18);

    _flat.copy(ctx.target).sub(this.position);
    _flat.y = 0;
    if (_flat.length() <= radius) {
      ctx.onPlayerHit?.((cfg.sweepDamage ?? 26) * settings.monsters.damageScale, {
        position: this.position,
        monster: this,
        knockback: 9
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* the breath                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Fire, for as long as it lasts.
   *
   * A jet rather than a hitscan: the cone is re-evaluated every tick from where
   * the *head* currently points, so walking out of it works, and standing still
   * because you were outside it when it started does not.
   */
  _updateBreath(dt, ctx) {
    if (!this.breath || dt <= 0) return;
    const cfg = this.config;
    const scale = this.root.scale.x;

    this.breath.time += dt;
    if (this.breath.time >= this.breath.duration) {
      this.breath = null;
      this.charge = 0;
      return;
    }

    // Ramp in and out so it does not switch on and off like a tap.
    const t = this.breath.time / this.breath.duration;
    const strength = Math.min(saturate(t / 0.18), saturate((1 - t) / 0.22));
    this.charge = Math.max(this.charge, strength);

    this._mouthFrame(_mouth, _aim);
    const range = (cfg.breathRange ?? 14) * scale;
    const spread = cfg.breathSpread ?? 0.34; // half-angle, radians

    this._emitFire(ctx, _mouth, _aim, range, strength, scale);

    // Damage on a tick rather than per frame, so the numbers are readable and
    // the total does not depend on the frame rate.
    this._breathTick -= dt;
    if (this._breathTick > 0) return;
    this._breathTick = 0.3;

    _flat.copy(ctx.target).sub(_mouth);
    const distance = _flat.length();
    if (distance > range) return;
    _flat.multiplyScalar(1 / Math.max(0.001, distance));
    // Widen the cone with distance the way a real jet spreads, or the far end
    // becomes impossible to be hit by.
    const cosLimit = Math.cos(spread + saturate(distance / range) * 0.16);
    if (_flat.dot(_aim) < cosLimit) return;

    ctx.onPlayerHit?.((cfg.breathDamage ?? 13) * settings.monsters.damageScale * strength, {
      position: ctx.target,
      monster: this,
      burning: true
    });
  }

  /** Where the mouth is and which way it points, in world space. */
  _mouthFrame(position, direction) {
    const head = this.joints.head;
    head.getWorldPosition(position);
    head.getWorldDirection(direction); // the head's +Z, which is its snout
    // `getWorldDirection` returns -Z for cameras but +Z for objects; the snout
    // was built along +Z, so this is already pointing out of the mouth.
    direction.normalize();
    position.addScaledVector(direction, 0.55 * this.root.scale.x);
    return position;
  }

  _emitFire(ctx, mouth, direction, range, strength, scale) {
    const particles = ctx.particles;
    if (!particles) return;

    const core = particles.get('dragon-fire', {
      capacity: 3000,
      additive: true,
      curl: true,
      stretch: true
    });
    // Speed × life has to come out at roughly `range`, or the jet stops short of
    // the cone it is doing damage in and the two disagree on screen.
    core.emit(Math.round(30 * strength), {
      position: mouth,
      radius: 0.16 * scale,
      direction,
      speed: range * 1.9,
      speedVariance: 0.35,
      spread: 0.2,
      size: 0.55 * scale,
      sizeVariance: 0.6,
      life: 0.5,
      lifeVariance: 0.3,
      tint: getColor('#ffd27a'),
      time: ctx.elapsed
    });

    const smoke = particles.get('dragon-smoke', {
      capacity: 1600,
      additive: false,
      curl: true
    });
    smoke.emit(Math.round(7 * strength), {
      position: mouth,
      radius: 0.3 * scale,
      direction,
      speed: range * 0.9,
      speedVariance: 0.7,
      spread: 0.34,
      size: 1.0 * scale,
      sizeVariance: 0.6,
      life: 1.1,
      lifeVariance: 0.5,
      tint: getColor('#3a2a20'),
      time: ctx.elapsed
    });

    // Scorch the floor where the jet lands — on a timer, not on a per-frame
    // coin flip. A one-in-four chance every frame is thirty marks a second at
    // 120 Hz, and with a six-second life that is the whole arena on fire.
    this._scorchTimer = (this._scorchTimer ?? 0) - 0.016;
    if (this._scorchTimer <= 0) {
      this._scorchTimer = 0.22;
      _scratch.copy(mouth).addScaledVector(direction, range * randRange(0.5, 0.95));
      _scratch.y = 0;
      ctx.decals?.spawn(DecalType.SCORCH, _scratch, {
        radius: randRange(0.9, 1.5) * scale,
        life: 3.0,
        colorA: getColor('#ff8a3c'),
        colorB: getColor('#2a1408'),
        intensity: 0.9,
        width: 0.5
      });
    }

    ctx.shake?.rumble?.(0.1 * strength * settings.global.cameraShake, 0.016);
  }

  /* ------------------------------------------------------------------ */
  /* animation                                                           */
  /* ------------------------------------------------------------------ */

  _animate(dt, ctx) {
    const j = this.joints;
    const cfg = this.config;
    const scale = this.root.scale.x;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const dying = this.state === MonsterState.DYING;

    this.bobPhase += dt;
    // The trot cycles on distance, like every other gait in this project.
    this.walkPhase += (speed / Math.max(0.4, scale)) * 1.55 * dt;
    // The wingbeat does not: it is not driven by the ground, and it has to keep
    // beating while the animal hovers on the spot.
    this.flapPhase += dt * (this.isAirborne ? 4.4 : 2.2);

    const time = this.bobPhase;
    const flight = this.flight;
    const grounded = 1 - flight;

    /* ---- altitude and body attitude ---- */
    this.body.position.y = this.altitude + (this.isAirborne ? Math.sin(time * 1.6) * 0.22 : 0);
    // Nose-down when moving, level when hovering; roll into the turn.
    const bank = clamp(-this.velocity.x * Math.cos(this.facing) + this.velocity.z * Math.sin(this.facing), -1, 1);
    j.body.rotation.x = damp(j.body.rotation.x, dying ? 0.25 : -0.06 * speed * flight, 0.001, dt);
    j.body.rotation.z = damp(j.body.rotation.z, dying ? 0 : bank * 0.18 * flight, 0.002, dt);
    // The whole animal rises and falls on the wingbeat.
    if (flight > 0.05) this.body.position.y += Math.sin(this.flapPhase) * 0.3 * flight;
    // Grounded, the shoulders dip with each footfall.
    if (grounded > 0.05) this.body.position.y += Math.abs(Math.sin(this.walkPhase)) * 0.07 * grounded;

    /* ---- neck and head ---- */
    this._poseNeck(dt, ctx, time, dying);

    /* ---- tail: a wave running from the hips to the tip ---- */
    const tailAmp = dying ? 0.04 : 0.16 + speed * 0.02 + flight * 0.1;
    for (let i = 0; i < j.tail.length; i++) {
      const link = j.tail[i];
      const lag = i * 0.55;
      link.rotation.y = Math.sin(time * 1.9 - lag) * tailAmp;
      // Lifted while flying (a rudder), drooping on the ground.
      const rest = i < 2 ? 0.12 : 0.05;
      link.rotation.x =
        rest * grounded - flight * 0.06 + Math.sin(time * 1.4 - lag * 0.8) * tailAmp * 0.45;
    }

    /* ---- wings ---- */
    this._poseWings(flight, dying);

    /* ---- legs ---- */
    this._poseLegs(j, speed, grounded, dying);

    /* ---- the furnace ---- */
    const charge = dying ? 0 : this.charge;
    j.throat.scale.setScalar(0.001 + charge * 1.9 * (1 + Math.sin(time * 22) * 0.09));
    // The jaw cracks open as it charges and yawns wide when the fire is out.
    const gape = this.breath ? 1 : charge * 0.45;
    j.jaw.rotation.x = damp(j.jaw.rotation.x, gape * 0.72 + (dying ? 0.5 : 0), 0.0008, dt);
    this.uniforms.uCharge.value = damp(this.uniforms.uCharge.value, charge, 0.002, dt);

    if (grounded > 0.5) this._emitFootstep(speed, ctx);
  }

  /**
   * The neck: an S that carries the head onto the target.
   *
   * The turn is distributed across the links rather than spent at one of them,
   * with the share rising toward the skull — which is how a neck bends, and why
   * spending it all at the base looks like a periscope.
   */
  _poseNeck(dt, ctx, time, dying) {
    const j = this.joints;
    const neck = j.neck;

    let yaw = 0;
    let pitch = 0;
    if (!dying && ctx.target) {
      this.centre(_scratch);
      _toTarget.copy(ctx.target).sub(_scratch);
      const flat = Math.hypot(_toTarget.x, _toTarget.z);
      const world = Math.atan2(_toTarget.x, _toTarget.z);
      yaw = clamp(
        MathUtils.euclideanModulo(world - this.facing + Math.PI, Math.PI * 2) - Math.PI,
        -1.5,
        1.5
      );
      pitch = clamp(Math.atan2(_toTarget.y + this.altitude * 0.5, Math.max(0.5, flat)), -1.1, 0.7);
    }

    for (let i = 0; i < neck.length; i++) {
      const link = neck[i];
      // Rising share: the base contributes least, the last link most.
      const share = (i + 1) / ((neck.length * (neck.length + 1)) / 2);
      const sway = Math.sin(time * 1.3 - i * 0.4) * 0.05;
      const rest = i === 0 ? -0.55 : -0.16;
      link.rotation.y = damp(link.rotation.y, yaw * share * neck.length * 0.55 + sway, 0.002, dt);
      link.rotation.x = damp(link.rotation.x, rest + pitch * share * neck.length * 0.3, 0.002, dt);
    }

    // The head takes whatever the neck did not.
    j.head.rotation.y = damp(j.head.rotation.y, yaw * 0.35, 0.001, dt);
    j.head.rotation.x = damp(j.head.rotation.x, 0.45 + pitch * 0.45, 0.001, dt);
  }

  /**
   * Wings, folded or beating.
   *
   * `fold` runs the shoulder back along the body, closes the elbow and tucks the
   * wrist — three rotations about the same axis, which is why the wing packs
   * away instead of collapsing through the ribs.
   *
   * The flap is one sine, read three times with a growing delay. The lag is the
   * entire trick: the hand is still coming up as the shoulder starts down, so
   * the membrane trails and snaps rather than moving as a plate.
   */
  _poseWings(flight, dying) {
    const j = this.joints;
    const fold = 1 - flight;
    const beat = Math.sin(this.flapPhase);
    const beatFore = Math.sin(this.flapPhase - 0.55);
    const beatHand = Math.sin(this.flapPhase - 1.0);

    for (const side of [-1, 1]) {
      const tag = side < 0 ? 'L' : 'R';
      const [arm, fore, hand] = j[`wing${tag}`];
      if (!arm) continue;

      // Spread, the arm runs straight out along ±X. Folded, it sweeps back and
      // up over the shoulder while the elbow closes, which leaves the wrist
      // beside the ribs and trails the fingers back along the flank.
      //
      // These four angles are *solved*, not authored. Three chained Euler
      // rotations compose in a way that is genuinely hard to predict by eye —
      // the first attempt folded both wings forward over the head — so the
      // pose was found by sweeping the parameters and scoring where the wrist
      // and the outermost fingertip actually ended up in body space.
      arm.rotation.y = side * (Math.PI * 0.5 + fold * 2.46);
      arm.rotation.z = side * (flight * (0.35 + beat * 0.72) + fold * 1.44);
      arm.rotation.x = flight * 0.12;

      fore.rotation.y = side * -fold * 1.38;
      fore.rotation.z = side * flight * (beatFore * 0.42 - 0.12);

      hand.rotation.y = side * -fold * 0.2;
      hand.rotation.z = side * flight * (beatHand * 0.55 - 0.2);

      // The whole wing packs down as it folds — skin gathers, and a rigid sheet
      // does not. Without this the folded membrane is still three metres across
      // and dragging on the floor beside the animal.
      arm.scale.setScalar(1 - fold * 0.4);

      if (dying) {
        // Everything goes slack.
        arm.rotation.z = side * 0.9;
        fore.rotation.z = side * 0.4;
        hand.rotation.z = side * 0.3;
      }
    }
  }

  /**
   * A four-legged trot.
   *
   * Diagonal pairs move together — front-left with back-right — which is the
   * gait every heavy quadruped actually uses, and the one that reads as weight
   * rather than as a scurry. Airborne, the legs tuck.
   */
  _poseLegs(j, speed, grounded, dying) {
    const phase = this.walkPhase;
    const swing = 0.42 * grounded * saturate(speed / Math.max(0.5, this.config.speed));
    const tuck = 1 - grounded;

    const legs = [
      ['frontL', 0],
      ['frontR', Math.PI],
      ['backL', Math.PI],
      ['backR', 0]
    ];

    for (const [name, offset] of legs) {
      const hip = j[`${name}Hip`];
      const knee = j[`${name}Knee`];
      const ankle = j[`${name}Foot`];
      if (!hip) continue;

      const back = name.startsWith('back');
      const s = Math.sin(phase + offset);
      const stride = dying ? 0 : -s * swing;

      hip.rotation.x = Math.PI / 2 + stride - tuck * (back ? 0.85 : 0.65) + (dying ? 0.5 : 0);
      // Digitigrade rest angles, plus a fold on the backswing.
      const rest = back ? -0.85 : -0.35;
      knee.rotation.x = rest - Math.max(0, stride) * 1.5 - tuck * (back ? 1.5 : 1.2);
      ankle.rotation.x = -rest + Math.max(0, -stride) * 0.6 + tuck * 0.9;
    }
  }

  /* ------------------------------------------------------------------ */

  /** Bigger feet, heavier steps. */
  _emitFootstep(speed, ctx) {
    if (!ctx.particles || speed < 0.4 || this.state === MonsterState.DYING) return;
    const step = Math.floor(this.walkPhase / Math.PI);
    if (step === this._lastStep) return;
    this._lastStep = step;

    const scale = this.root.scale.x;
    ctx.particles.get('monster-dust', { capacity: 700, additive: false, lit: true }).emit(10, {
      position: _scratch.set(this.position.x, 0.08, this.position.z),
      radius: 1.1 * scale,
      direction: { x: 0, y: 1, z: 0 },
      speed: 1.1,
      speedVariance: 0.7,
      spread: 0.9,
      size: 0.28 * scale,
      sizeVariance: 0.5,
      life: 0.9,
      lifeVariance: 0.4,
      tint: getColor('#6a6558'),
      time: ctx.elapsed
    });
    ctx.shake?.add(0.1 * settings.global.cameraShake, 3.5, 30);
  }

  /** It falls out of the sky rather than dissolving where it hovers. */
  _updateDying(dt, ctx) {
    this.breath = null;
    this.charge = 0;
    this.flight = damp(this.flight, 0, 0.001, dt);
    this.altitude = Math.max(0, this.altitude - 9 * dt);
    super._updateDying(dt, ctx);
  }
}
