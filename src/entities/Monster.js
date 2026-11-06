import { Group, MathUtils, Quaternion, Vector3 } from 'three';

import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { clamp, damp, saturate, Easing, randRange } from '../utils/math.js';
import {
  assembleMonster,
  createDamageUniforms,
  createHealthBar,
  createMonsterMaterials
} from './MonsterBuilder.js';
import { disposeObject } from '../utils/dispose.js';

export const MonsterState = Object.freeze({
  IDLE: 'idle',
  ARRIVING: 'arriving', // rising out of the spawn portal
  PURSUE: 'pursue',
  WINDUP: 'windup', // telegraphing an attack
  RECOVER: 'recover', // committed, can't act
  STAGGER: 'stagger',
  DYING: 'dying',
  DEAD: 'dead'
});

/**
 * Status effects, and what each one takes away.
 *
 * The rule the whole system rests on: a status must be *visible on the body*,
 * not only in a number. Chill slows the animation as well as the walk, freeze
 * locks the rig mid-stride and rimes it over, shock jitters it, burn chars it
 * and ticks. If you cannot tell what a monster is suffering from by looking at
 * it, the status is not pulling its weight.
 */
const STATUS = {
  chill: { speed: 0.45, act: true, tick: 0 },
  shock: { speed: 0.0, act: false, tick: 0 },
  burn: { speed: 1.0, act: true, tick: 6 }, // damage per second
  root: { speed: 0.0, act: true, tick: 0 }, // held in place but still swinging
  freeze: { speed: 0.0, act: false, tick: 0 }
};

const _toTarget = new Vector3();
const _steer = new Vector3();
const _separation = new Vector3();
const _avoid = new Vector3();
const _scratch = new Vector3();
const _up = new Vector3(0, 1, 0);
const _billboard = new Quaternion();

let _nextId = 1;

/**
 * One monster: a body, a small brain and a pile of state the fight writes into.
 *
 * Deliberately not an `Ability` subclass — abilities are one-shot effects with a
 * fixed phase machine, and a monster is the opposite of that: it persists, it
 * makes decisions, and it is the *target* of effects rather than a source of
 * them. What they do share is the pooling contract: `spawn()` fully resets, and
 * nothing allocates once the pool is warm.
 *
 * The brain is three rules deep on purpose — seek the caster, avoid the walls
 * and each other, swing when close enough. Anything more elaborate is invisible
 * at the speed this game moves, and this much already produces the thing that
 * matters: a horde that spreads out around you instead of stacking into a line.
 */
export class Monster {
  /**
   * @param {string} kind key into `settings.monsters.kinds`
   * @param {import('./MonsterBuilder.js').MonsterAssets} assets shared geometry cache
   */
  constructor(kind, assets) {
    this.id = `m${_nextId++}`;
    this.kind = kind;

    const config = settings.monsters.kinds[kind];
    this.uniforms = createDamageUniforms(config.accent);
    this.materials = createMonsterMaterials(config, this.uniforms);

    const shared = assets.get(kind, config);
    const rig = assembleMonster(shared, config, this.materials);
    this.joints = rig.joints;
    this.isFloater = shared.shape === 'orb';
    /**
     * Resting hip height, so the walk bob has something to bob around.
     * Not every rig has hips — the dragon's spine is a chain, and it does its
     * own animation anyway.
     */
    this._hipRest = rig.joints.hips?.position.y ?? 0;
    this.centreHeight = rig.centreHeight;
    this.barHeight = rig.barHeight;

    this.root = new Group();
    this.root.name = `Monster:${kind}`;
    this.root.add(rig.root);
    this.body = rig.root;

    const bar = createHealthBar(config.accent);
    this.bar = bar.mesh;
    this.barMaterial = bar.material;
    this.root.add(this.bar);

    /* ---- state ---- */
    this.state = MonsterState.IDLE;
    this.position = this.root.position;
    this.velocity = new Vector3();
    this.facing = 0;

    this.health = 1;
    this.maxHealth = 1;
    this.age = 0;
    this.stateTime = 0;
    /** Live status effects: name → seconds remaining. */
    this.statuses = new Map();

    this.hitFlash = 0;
    this.dissolve = 0;
    this.chipHealth = 1;
    this.walkPhase = randRange(0, Math.PI * 2);
    this.bobPhase = randRange(0, Math.PI * 2);
    this.staggerImpulse = new Vector3();
    /** Set on the frame a windup completes; the manager reads and clears it. */
    this.pendingAttack = null;
    this._stepAccumulator = 0;
    this._burnAccumulator = 0;
    this._lastDamageAge = -99;

    this.root.visible = false;
  }

  get config() {
    return settings.monsters.kinds[this.kind];
  }

  get label() {
    return this.config.label;
  }

  get isAlive() {
    return this.state !== MonsterState.DEAD && this.state !== MonsterState.DYING;
  }

  get isFinished() {
    return this.state === MonsterState.DEAD;
  }

  /** Can this thing be hit right now? Arriving monsters are intangible. */
  get isTargetable() {
    return this.isAlive && this.state !== MonsterState.ARRIVING;
  }

  /**
   * Footprint radius, metres. Every hit test is widened by it, so a big body is
   * easier to clip than a small one — which is what its size implies.
   */
  get hitRadius() {
    return 0.55 * this.root.scale.x;
  }

  /** World-space centre of mass — what abilities aim at and hit. */
  centre(out = _scratch) {
    return out.set(this.position.x, this.position.y + this.centreHeight, this.position.z);
  }

  /* ------------------------------------------------------------------ */
  /* lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * @param {Vector3} position where it walks in
   * @param {number} healthMultiplier wave scaling
   */
  spawn(position, healthMultiplier = 1) {
    const cfg = this.config;
    const scale = cfg.scale;

    this.root.position.set(position.x, 0, position.z);
    this.root.scale.setScalar(scale);
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);

    this.maxHealth = Math.max(1, cfg.health * healthMultiplier * settings.monsters.healthScale);
    this.health = this.maxHealth;
    this.chipHealth = 1;

    this.velocity.set(0, 0, 0);
    this.statuses.clear();
    this.age = 0;
    this.stateTime = 0;
    this.hitFlash = 0;
    this.dissolve = 0;
    this.staggerImpulse.set(0, 0, 0);
    this.pendingAttack = null;
    this.attackCooldown = randRange(0, 0.6); // desync the first swing of a wave
    this._burnAccumulator = 0;
    this._lastDamageAge = -99;

    this.uniforms.uHit.value = 0;
    this.uniforms.uFreeze.value = 0;
    this.uniforms.uBurn.value = 0;
    this.uniforms.uDissolve.value = 0;

    this.barMaterial.uniforms.uArmour.value = cfg.armour ?? 0;
    this.barMaterial.uniforms.uOpacity.value = 0;
    this.bar.visible = false;

    this._setShadows(true);
    this.state = MonsterState.ARRIVING;
    this.root.visible = true;
    return this;
  }

  _setShadows(on) {
    this.body.traverse((node) => {
      if (node.isMesh) node.castShadow = on;
    });
  }

  /** Return to the pool. Leaves the instance reusable. */
  retire() {
    this.state = MonsterState.DEAD;
    this.root.visible = false;
    this.bar.visible = false;
    this.statuses.clear();
  }

  /* ------------------------------------------------------------------ */
  /* damage & status                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Take a hit.
   *
   * @param {number} amount raw damage before armour
   * @param {object} [options]
   * @param {boolean} [options.ignoreArmour]
   * @param {number}  [options.shatter] multiplier applied if this thing is frozen
   * @returns {{dealt: number, killed: boolean, shattered: boolean, overkill: number}}
   */
  applyDamage(amount, options = {}) {
    if (!this.isTargetable) return { dealt: 0, killed: false, shattered: false, overkill: 0 };

    const frozen = this.statuses.has('freeze');
    // Hitting a frozen body is the payoff for freezing it — glacier then meteor
    // is the combo the whole status system exists to reward.
    const shattered = frozen && (options.shatter ?? 1) > 1;
    let damage = amount * (shattered ? options.shatter : 1);

    const armour = options.ignoreArmour ? 0 : (this.config.armour ?? 0);
    damage *= 1 - clamp(armour, 0, 0.85);

    const dealt = Math.min(damage, this.health);
    this.health -= damage;
    this.hitFlash = 1;
    this._lastDamageAge = this.age;
    this.bar.visible = settings.monsters.healthBars;

    // A shatter cracks the ice off; the freeze is spent.
    if (shattered) this.statuses.delete('freeze');

    if (this.health <= 0) {
      this.health = 0;
      this._die(shattered);
      return { dealt, killed: true, shattered, overkill: damage - dealt };
    }

    // Heavy hits interrupt; light ones only flinch. Threshold is a fraction of
    // *max* health, so a jab that would stun an imp does not stun a golem.
    if (damage > this.maxHealth * 0.12 && this.state !== MonsterState.RECOVER) {
      this._enter(MonsterState.STAGGER);
    }

    return { dealt, killed: false, shattered, overkill: 0 };
  }

  /**
   * Apply a status. Re-applying refreshes the timer rather than stacking.
   * @param {'chill'|'shock'|'burn'|'root'|'freeze'} name
   */
  applyStatus(name, duration) {
    if (!STATUS[name] || !this.isAlive || duration <= 0) return;
    // Freeze supersedes chill — they are the same axis at two intensities, and
    // holding both would let the weaker one's expiry thaw the stronger.
    if (name === 'freeze') this.statuses.delete('chill');
    if (name === 'chill' && this.statuses.has('freeze')) return;
    this.statuses.set(name, Math.max(this.statuses.get(name) ?? 0, duration));
    if (name === 'freeze' || name === 'shock') this.pendingAttack = null;
  }

  /** Shove it. Mass divides the force, which is what makes a golem feel heavy. */
  applyKnockback(x, z, force) {
    if (!this.isAlive || force <= 0) return;
    const mass = Math.max(0.2, this.config.mass ?? 1);
    const scale = force / mass;
    this.velocity.x += x * scale;
    this.velocity.z += z * scale;
    this.staggerImpulse.set(x * scale, 0, z * scale);
  }

  _die(shattered) {
    this._enter(MonsterState.DYING);
    this.shattered = shattered || this.statuses.has('freeze');
    this.pendingAttack = null;
    this.velocity.multiplyScalar(0.4);
    // A corpse should not keep casting a crisp shadow while it dissolves — the
    // depth pass has no idea about the discard in the colour pass.
    this._setShadows(false);
  }

  _enter(state) {
    this.state = state;
    this.stateTime = 0;
  }

  /* ------------------------------------------------------------------ */
  /* per-frame                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * @param {number} dt
   * @param {object} ctx
   * @param {Vector3} ctx.target        the caster's feet
   * @param {Array}   ctx.obstacles     `{x, z, radius}` from the ruins
   * @param {Array}   ctx.crowd         the other live monsters, for separation
   * @param {number}  ctx.elapsed
   * @param {object}  ctx.particles
   * @param {object}  ctx.decals
   */
  update(dt, ctx) {
    if (this.state === MonsterState.DEAD) return;
    this.age += dt;
    this.stateTime += dt;

    this._updateStatuses(dt, ctx);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 7);

    switch (this.state) {
      case MonsterState.ARRIVING:
        this._updateArriving(dt);
        break;
      case MonsterState.DYING:
        this._updateDying(dt, ctx);
        break;
      case MonsterState.STAGGER:
        this._updateStagger(dt, ctx);
        break;
      default:
        this._updateFighting(dt, ctx);
        break;
    }

    this._integrate(dt, ctx);
    this._animate(dt, ctx);
    this._syncUniforms(dt, ctx);
  }

  _updateStatuses(dt, ctx) {
    if (!this.statuses.size) return;
    for (const [name, remaining] of this.statuses) {
      const left = remaining - dt;
      if (left <= 0) this.statuses.delete(name);
      else this.statuses.set(name, left);

      const tick = STATUS[name]?.tick ?? 0;
      if (tick > 0 && this.isAlive) {
        this._burnAccumulator += tick * dt;
        // Applied in whole points so the damage numbers stay readable rather
        // than scrolling a fresh "0.4" every frame.
        if (this._burnAccumulator >= 1) {
          const amount = Math.floor(this._burnAccumulator);
          this._burnAccumulator -= amount;
          const result = this.applyDamage(amount, { ignoreArmour: true });
          ctx.onDamage?.(this, amount, { kind: 'burn', killed: result.killed });
        }
      }
    }
  }

  /** How fast this thing may move right now, after statuses. */
  get speedFactor() {
    let factor = 1;
    for (const name of this.statuses.keys()) factor = Math.min(factor, STATUS[name]?.speed ?? 1);
    return factor;
  }

  /** Whether it is allowed to start an attack right now. */
  get canAct() {
    for (const name of this.statuses.keys()) if (!(STATUS[name]?.act ?? true)) return false;
    return true;
  }

  _updateArriving(dt) {
    const t = saturate(this.stateTime / Math.max(0.05, settings.monsters.spawnTelegraph));
    // Rises out of the floor on an overshoot curve, so it looks *pushed* through
    // rather than faded in.
    this.body.position.y = (1 - Easing.outBack(t)) * -2.2;
    this.body.scale.setScalar(0.6 + Easing.outBack(t) * 0.4);
    if (t >= 1) {
      this.body.position.y = 0;
      this.body.scale.setScalar(1);
      this._enter(MonsterState.PURSUE);
    }
  }

  _updateStagger(dt, ctx) {
    // Short, and always returns to pursuit — a stagger that could chain into
    // itself would let a fast ability perma-lock a monster in place.
    if (this.stateTime > 0.32) this._enter(MonsterState.PURSUE);
    this._steerToward(ctx, 0.15, dt);
  }

  _updateDying(dt, ctx) {
    const life = Math.max(0.2, settings.monsters.corpseFade);
    this.dissolve = saturate(this.stateTime / life);
    // Frozen things do not slump — they stand until they burst.
    if (!this.shattered) {
      this.body.rotation.x = damp(this.body.rotation.x, 1.35, 0.02, dt);
      this.body.position.y = damp(this.body.position.y, -0.35, 0.2, dt);
    } else {
      this.body.scale.setScalar(1 + this.dissolve * 0.12);
    }
    this.bar.visible = false;
    this.velocity.multiplyScalar(Math.pow(0.02, dt));
    if (this.dissolve >= 1) this.state = MonsterState.DEAD;
  }

  _updateFighting(dt, ctx) {
    const cfg = this.config;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    _toTarget.copy(ctx.target).sub(this.position);
    _toTarget.y = 0;
    const distance = _toTarget.length();
    const range = cfg.attackRange * this.root.scale.x;

    if (this.state === MonsterState.WINDUP) {
      // The telegraph is the contract with the player: once it starts, the swing
      // lands whether they moved or not — but only if it can still reach.
      if (this.stateTime >= cfg.attackWindup) {
        this.pendingAttack = {
          damage: cfg.attackDamage * settings.monsters.damageScale,
          splash: cfg.attackSplash ?? 0,
          inRange: distance <= range * 1.6,
          ranged: cfg.attackRange > 6
        };
        this.attackCooldown = cfg.attackCooldown;
        this._enter(MonsterState.RECOVER);
      }
      // Turn into the swing but do not close further.
      this._face(Math.atan2(_toTarget.x, _toTarget.z), dt, 6);
      return;
    }

    if (this.state === MonsterState.RECOVER) {
      if (this.stateTime > 0.45) this._enter(MonsterState.PURSUE);
      this._face(Math.atan2(_toTarget.x, _toTarget.z), dt, 3);
      return;
    }

    if (distance <= range && this.attackCooldown <= 0 && this.canAct) {
      this._enter(MonsterState.WINDUP);
      return;
    }

    // Ranged things back off if you walk into them; melee things close.
    const desired = cfg.attackRange > 6 ? range * 0.8 : range * 0.85;
    this._steerToward(ctx, distance > desired ? 1 : -0.5, dt);
  }

  /**
   * Seek the caster while keeping out of the walls and off each other.
   *
   * Three weighted vectors, normalised once. Separation is weighted highest at
   * short range because two monsters occupying the same metre is the single
   * most game-breaking-looking thing a crowd can do.
   */
  _steerToward(ctx, weight, dt = 1 / 60) {
    const cfg = this.config;
    const speed = cfg.speed * settings.monsters.speedScale * this.speedFactor;
    if (speed <= 0 || weight === 0) {
      this._desiredSpeed = 0;
      return;
    }

    _toTarget.copy(ctx.target).sub(this.position);
    _toTarget.y = 0;
    if (_toTarget.lengthSq() < 1e-6) _toTarget.set(0, 0, 1);
    _toTarget.normalize().multiplyScalar(weight);

    /* separation */
    _separation.set(0, 0, 0);
    const personal = 1.15 * this.root.scale.x;
    for (const other of ctx.crowd) {
      if (other === this || !other.isAlive) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const distSq = dx * dx + dz * dz;
      const reach = personal + 1.15 * other.root.scale.x;
      if (distSq > reach * reach || distSq < 1e-6) continue;
      const dist = Math.sqrt(distSq);
      _separation.x += (dx / dist) * (1 - dist / reach);
      _separation.z += (dz / dist) * (1 - dist / reach);
    }

    /* obstacle avoidance */
    _avoid.set(0, 0, 0);
    for (const obstacle of ctx.obstacles) {
      const dx = this.position.x - obstacle.x;
      const dz = this.position.z - obstacle.z;
      const distSq = dx * dx + dz * dz;
      const reach = obstacle.radius + 1.2 * this.root.scale.x;
      if (distSq > reach * reach || distSq < 1e-6) continue;
      const dist = Math.sqrt(distSq);
      _avoid.x += (dx / dist) * (1 - dist / reach) * 2.0;
      _avoid.z += (dz / dist) * (1 - dist / reach) * 2.0;
    }

    _steer.copy(_toTarget).addScaledVector(_separation, 1.6).addScaledVector(_avoid, 2.2);
    if (_steer.lengthSq() < 1e-6) {
      this._desiredSpeed = 0;
      return;
    }
    _steer.normalize();

    // Accelerate toward the steering direction rather than snapping to it, so a
    // body that was shoved has to fight its way back onto course.
    this.velocity.x = damp(this.velocity.x, _steer.x * speed, 0.0008, dt);
    this.velocity.z = damp(this.velocity.z, _steer.z * speed, 0.0008, dt);
    this._desiredSpeed = speed;

    this._face(Math.atan2(_steer.x, _steer.z), dt, 5);
  }

  _face(yaw, dt, rate) {
    const delta = MathUtils.euclideanModulo(yaw - this.facing + Math.PI, Math.PI * 2) - Math.PI;
    this.facing += delta * clamp(rate * dt, 0, 1);
    this.root.rotation.y = this.facing;
  }

  /** Move, then drag. Knockback lives entirely in this integration. */
  _integrate(dt, ctx) {
    if (dt <= 0) return;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Rooted things keep their facing and their swing but cannot travel.
    if (this.statuses.has('root') || this.statuses.has('freeze')) {
      this.velocity.x *= Math.pow(0.001, dt);
      this.velocity.z *= Math.pow(0.001, dt);
    } else {
      const drag = this.state === MonsterState.PURSUE ? 0.12 : 0.02;
      this.velocity.x *= Math.pow(drag, dt);
      this.velocity.z *= Math.pow(drag, dt);
    }

    // Keep the horde inside the keep; nothing interesting happens out there.
    const limit = settings.ruins.wallRadius - 1.5;
    const distSq = this.position.x * this.position.x + this.position.z * this.position.z;
    if (distSq > limit * limit) {
      const dist = Math.sqrt(distSq);
      this.position.x *= limit / dist;
      this.position.z *= limit / dist;
    }

    this.staggerImpulse.multiplyScalar(Math.pow(0.0005, dt));
  }

  /* ------------------------------------------------------------------ */
  /* animation                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Procedural animation.
   *
   * All of it is a handful of sines driven by one phase, which is advanced by
   * *distance travelled* rather than by time — that is the whole trick. Feet
   * that cycle on a clock slide when the body is slowed or shoved; feet that
   * cycle on distance plant themselves, and a chilled monster automatically
   * animates at the speed it is actually walking without a single extra line.
   */
  _animate(dt, ctx) {
    const j = this.joints;
    if (this.isFloater) return this._animateWisp(dt, ctx);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const stride = 2.6 / Math.max(0.6, this.root.scale.x);
    this.walkPhase += speed * stride * dt;
    this.bobPhase += dt;

    const gait = clamp(speed / Math.max(0.5, this.config.speed), 0, 1.4);
    const swing = Math.sin(this.walkPhase);
    const counter = Math.cos(this.walkPhase);
    const dying = this.state === MonsterState.DYING;

    /* legs */
    const legSwing = dying ? 0 : swing * 0.85 * gait;
    j.legL.rotation.x = legSwing;
    j.legR.rotation.x = -legSwing;
    // The knee only bends on the backswing — a knee that bends both ways is the
    // classic tell of a procedural walk.
    j.shinL.rotation.x = Math.max(0, -legSwing) * 1.5;
    j.shinR.rotation.x = Math.max(0, legSwing) * 1.5;

    /* torso */
    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.06 * gait;
    j.hips.position.y = this._hipRest + (dying ? 0 : bob);
    j.torso.rotation.z = counter * 0.05 * gait;
    j.torso.rotation.y = counter * 0.09 * gait;

    /* arms — counter-swing under the walk, driven by the attack over it */
    let armPose = 0;
    let leanBack = 0;
    if (this.state === MonsterState.WINDUP) {
      const t = saturate(this.stateTime / Math.max(0.05, this.config.attackWindup));
      // Slow, readable rise: the telegraph must be legible from across the arena.
      armPose = -Easing.inOutCubic(t) * 2.3;
      leanBack = -Easing.inOutCubic(t) * 0.3;
    } else if (this.state === MonsterState.RECOVER) {
      const t = saturate(this.stateTime / 0.45);
      // Then a hard snap through, decaying — the swing itself.
      armPose = -2.3 + Easing.outQuint(t) * 3.4;
      leanBack = 0.42 * (1 - Easing.outCubic(t));
    }

    const armSwing = dying ? 0 : -swing * 0.5 * gait;
    j.armL.rotation.x = armPose + armSwing;
    j.armR.rotation.x = armPose - armSwing;
    j.foreL.rotation.x = -Math.abs(armPose) * 0.35 - 0.25;
    j.foreR.rotation.x = -Math.abs(armPose) * 0.35 - 0.25;
    j.torso.rotation.x = leanBack;

    /* stagger: a jolt away from where the hit came from */
    const jolt = this.staggerImpulse.lengthSq();
    if (jolt > 1e-4) {
      const local = _scratch.copy(this.staggerImpulse).applyAxisAngle(_up, -this.facing);
      j.torso.rotation.x += clamp(-local.z * 0.06, -0.5, 0.5);
      j.torso.rotation.z += clamp(local.x * 0.06, -0.5, 0.5);
    }

    /* shock: high-frequency jitter, the electrical read */
    if (this.statuses.has('shock')) {
      const jitter = Math.sin(this.age * 61) * 0.04;
      j.torso.rotation.z += jitter;
      j.head.rotation.z = jitter * 2;
    }

    /* head tracks the caster whenever the body is not committed */
    if (!dying && ctx.target) {
      _toTarget.copy(ctx.target).sub(this.position);
      const yaw = Math.atan2(_toTarget.x, _toTarget.z) - this.facing;
      j.head.rotation.y = clamp(
        MathUtils.euclideanModulo(yaw + Math.PI, Math.PI * 2) - Math.PI,
        -0.9,
        0.9
      );
    }

    /* footfall dust — emitted on the phase crossing, not on a timer */
    this._emitFootstep(speed, ctx);
  }

  _animateWisp(dt, ctx) {
    const j = this.joints;
    this.bobPhase += dt;
    const hover = Math.sin(this.bobPhase * 1.7) * 0.16 + Math.sin(this.bobPhase * 3.1) * 0.05;
    j.hips.position.y = 1.5 + hover;

    for (let i = 0; i < j.rings.length; i++) {
      const ring = j.rings[i];
      ring.rotation.x += dt * (0.6 + i * 0.35);
      ring.rotation.y += dt * (0.9 - i * 0.2);
    }

    // The core swells through a windup and snaps back when it fires — the whole
    // telegraph for a ranged attack, and readable at any distance.
    let charge = 0;
    if (this.state === MonsterState.WINDUP) {
      charge = Easing.inQuad(saturate(this.stateTime / Math.max(0.05, this.config.attackWindup)));
    } else if (this.state === MonsterState.RECOVER) {
      charge = 1 - saturate(this.stateTime / 0.3);
    }
    j.core.scale.setScalar(1 + charge * 1.35);
    j.torso.rotation.y += dt * (0.4 + charge * 3.5);
    j.skirt.rotation.z = Math.sin(this.bobPhase * 1.3) * 0.08;

    if (this.state === MonsterState.DYING) j.core.scale.setScalar(1 - this.dissolve);
  }

  /**
   * Dust under the feet on each stride crossing.
   *
   * Keyed off the walk phase rather than a timer so it lands *with* the foot at
   * any speed — the difference between a monster that walks and a monster that
   * emits dust while sliding.
   */
  _emitFootstep(speed, ctx) {
    if (!ctx.particles || speed < 0.6 || this.state === MonsterState.DYING) return;
    const step = Math.floor(this.walkPhase / Math.PI);
    if (step === this._lastStep) return;
    this._lastStep = step;

    const system = ctx.particles.get('monster-dust', {
      capacity: 700,
      additive: false,
      curl: false,
      lit: true
    });
    system.emit(Math.round(2 + this.root.scale.x * 2), {
      position: _scratch.set(this.position.x, 0.06, this.position.z),
      radius: 0.28 * this.root.scale.x,
      direction: { x: 0, y: 1, z: 0 },
      speed: 0.5,
      speedVariance: 0.7,
      spread: 0.8,
      size: 0.16 * this.root.scale.x,
      sizeVariance: 0.5,
      life: 0.7,
      lifeVariance: 0.4,
      tint: getColor('#6a6558'),
      time: ctx.elapsed
    });
  }

  /** Push the frame's state into the shader and the health bar. */
  _syncUniforms(dt, ctx) {
    const u = this.uniforms;
    u.uHit.value = this.hitFlash;
    u.uDissolve.value = this.dissolve;
    u.uFreeze.value = damp(u.uFreeze.value, this.statuses.has('freeze') ? 1 : 0, 0.0004, dt);
    u.uBurn.value = damp(u.uBurn.value, this.statuses.has('burn') ? 1 : 0, 0.001, dt);

    if (!settings.monsters.healthBars) {
      this.bar.visible = false;
      return;
    }

    const fill = this.health / this.maxHealth;
    this.chipHealth = damp(this.chipHealth, fill, 0.02, dt);

    const bar = this.barMaterial.uniforms;
    bar.uFill.value = fill;
    bar.uChip.value = Math.max(fill, this.chipHealth);
    bar.uColor.value.copy(getColor(this.config.accent));

    // The bar is only worth screen space while it is telling you something: it
    // fades in on damage and fades back out a few seconds later at full health.
    const recentlyHit = this.age - this._lastDamageAge < 4;
    const wanted = this.isAlive && (recentlyHit || fill < 0.999) ? 1 : 0;
    bar.uOpacity.value = damp(bar.uOpacity.value, wanted, 0.004, dt);
    this.bar.visible = bar.uOpacity.value > 0.01;

    if (this.bar.visible) {
      // Billboard, and keep a constant on-screen size regardless of the body's
      // scale — a golem's bar should not be twice an imp's.
      const inverse = 1 / Math.max(0.05, this.root.scale.x);
      this.bar.position.set(0, this.barHeight, 0);
      this.bar.scale.set(1.5 * inverse, 0.17 * inverse, 1);
      if (ctx.camera) {
        // Undo the parent's yaw; the bar's own quaternion is in local space.
        _billboard.copy(this.root.quaternion).invert().multiply(ctx.camera.quaternion);
        this.bar.quaternion.copy(_billboard);
      }
    }
  }

  /* ------------------------------------------------------------------ */

  dispose() {
    this.materials.body.dispose();
    this.materials.accent.dispose();
    this.materials.glow.dispose();
    this.barMaterial.dispose();
    disposeObject(this.root);
  }
}
