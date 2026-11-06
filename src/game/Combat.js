import { Vector3, MathUtils } from 'three';

import { settings, CastShape, castShapeOf } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { clamp } from '../utils/math.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { DecalType } from '../effects/GroundDecals.js';
import { BurstMode } from '../effects/BurstSphere.js';

const _point = new Vector3();
const _offset = new Vector3();
const _scratch = new Vector3();

/**
 * What a cast does to the things standing in it.
 *
 * The design problem this solves is *timing*. A cast is a picture that takes
 * time to arrive — the ice fracture races out at 26 m/s, the beam at 150, the
 * meteor arcs over — and damage that lands the instant you click looks broken
 * next to it. So a cast does not deal damage; it opens a **strike**, and the
 * strike walks downrange at the same `settings[element].speed` the visual uses.
 * A monster is hit on the frame the effect reaches it. Retune the ability and
 * the damage retunes itself.
 *
 * The other half of the design is that this lives *outside* the six ability
 * classes. Not one of them knows a monster exists. `AbilityManager.cast()` and
 * `Combat.open()` are handed the same `(origin, direction, distance)` from the
 * same aim event, and they independently produce the picture and the
 * consequences. Adding a seventh ability still means one file plus a settings
 * block, and now also four numbers in `settings.combat`.
 *
 * Emits: `hit` (monster, amount, info), `kill` (monster, info),
 * `prop` (prop, info), `impact` (position, info).
 */
export class Combat extends EventEmitter {
  /**
   * @param {object} context { monsters, ruins, particles, decals, bursts, fissures, shake, flash }
   */
  constructor(context) {
    super();
    this.ctx = context;
    /** Strikes still travelling. */
    this.strikes = [];
    this.elapsed = 0;
  }

  /**
   * Open a strike for a cast that has just been fired.
   *
   * @param {string} element
   * @param {Vector3} origin    caster's feet
   * @param {Vector3} direction unit, flat
   * @param {number} distance   metres
   */
  open(element, origin, direction, distance) {
    const profile = settings.combat[element];
    if (!settings.combat.enabled || !profile) return null;

    const ability = settings[element];
    const zoned = castShapeOf(element) === CastShape.ZONE;
    const speed = Math.max(1, ability.speed * settings.global.speed);

    const strike = {
      element,
      profile,
      zoned,
      origin: new Vector3(origin.x, 0, origin.z),
      direction: new Vector3(direction.x, 0, direction.z).normalize(),
      length: Math.max(0.1, distance),
      speed,
      front: 0,
      age: 0,
      // A far cast has no corridor: the leash/front races to the point and the
      // whole footprint goes off at once when it lands.
      radius: zoned ? Math.max(0.5, profile.radius || ability.zoneRadius || 4) : 0,
      /** Monsters already hit by this strike; a strike never double-dips. */
      hit: new Set(),
      resolved: false
    };

    this.strikes.push(strike);
    return strike;
  }

  /**
   * A direct (melee) swing — everything in an arc in front of the caster.
   *
   * @param {import('three').Vector3} origin
   * @param {import('three').Vector3} direction unit, flat
   * @param {import('../platform/attack/AttackDefinition.js').AttackDefinition} attack
   */
  melee(origin, direction, attack) {
    if (!settings.combat.enabled || !attack) return 0;

    const range = attack.range ?? 2.2;
    const halfArc = (attack.arc ?? Math.PI * 0.66) * 0.5;
    const profile = {
      damage: attack.damage,
      knockback: attack.knockback ?? 0.6,
      shatter: 0
    };
    const strike = { profile, element: 'beam' };
    let hits = 0;

    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable) continue;

      _offset.copy(monster.position).sub(origin);
      _offset.y = 0;
      const distance = _offset.length();
      if (distance > range + this._radiusOf(monster)) continue;

      const facing = Math.atan2(direction.x, direction.z);
      const bearing = Math.atan2(_offset.x, _offset.z);
      const delta = MathUtils.euclideanModulo(bearing - facing + Math.PI, Math.PI * 2) - Math.PI;
      if (Math.abs(delta) > halfArc) continue;

      _scratch.set(Math.sin(bearing), 0, Math.cos(bearing));
      this._damage(monster, strike, _scratch);
      hits++;
    }

    if (hits > 0) {
      this.ctx.shake?.add(0.18 * settings.global.cameraShake, 1.8, 18);
    }

    return hits;
  }

  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    this.elapsed = elapsed;
    if (dt <= 0 || !this.strikes.length) return;

    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const strike = this.strikes[i];
      strike.age += dt;
      strike.front += strike.speed * dt;

      if (strike.zoned) this._advanceZone(strike);
      else this._advanceLine(strike);

      if (strike.resolved) this.strikes.splice(i, 1);
    }
  }

  /**
   * A line cast: everything inside the corridor, as the front reaches it.
   *
   * The corridor test is a projection plus a perpendicular distance — the
   * cheapest possible capsule — widened by the target's own radius so a golem
   * is easier to clip than an imp, which is what its size implies.
   */
  _advanceLine(strike) {
    const { profile } = strike;
    const width = profile.width ?? 1.2;

    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable || strike.hit.has(monster)) continue;

      _offset.copy(monster.position).sub(strike.origin);
      _offset.y = 0;
      const along = _offset.dot(strike.direction);
      if (along < -0.5 || along > strike.front) continue;

      const lateral = Math.abs(_offset.x * strike.direction.z - _offset.z * strike.direction.x);
      if (lateral > width + this._radiusOf(monster)) continue;

      strike.hit.add(monster);
      this._damage(monster, strike, strike.direction);
    }

    // Props break on the way past too — a barrel in the path of a meteor should
    // not survive it.
    this._breakPropsAlong(strike, width);

    if (strike.front >= strike.length) {
      _point.copy(strike.origin).addScaledVector(strike.direction, strike.length);
      if (profile.splash > 0) this._blast(strike, _point, profile.splash);
      this._dressImpact(strike, _point, profile.splash || width);
      strike.resolved = true;
    }
  }

  /** A far cast: nothing until the front arrives, then the whole footprint. */
  _advanceZone(strike) {
    if (strike.front < strike.length) return;
    _point.copy(strike.origin).addScaledVector(strike.direction, strike.length);
    this._blast(strike, _point, strike.radius);
    this._dressImpact(strike, _point, strike.radius);
    strike.resolved = true;
  }

  /** Everything inside `radius` of `centre`, knocked outward from it. */
  _blast(strike, centre, radius) {
    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable || strike.hit.has(monster)) continue;
      const dx = monster.position.x - centre.x;
      const dz = monster.position.z - centre.z;
      const reach = radius + this._radiusOf(monster);
      if (dx * dx + dz * dz > reach * reach) continue;

      strike.hit.add(monster);
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      _scratch.set(dx / distance, 0, dz / distance);
      // Falls off toward the rim: standing on the edge of a meteor should hurt
      // less than standing under it.
      const falloff = clamp(1 - (distance / Math.max(0.1, reach)) * 0.55, 0.35, 1);
      this._damage(monster, strike, _scratch, falloff);
    }

    for (const prop of this.ctx.ruins?.props ?? []) {
      if (!prop.alive) continue;
      const dx = prop.position.x - centre.x;
      const dz = prop.position.z - centre.z;
      const reach = radius + prop.radius;
      if (dx * dx + dz * dz <= reach * reach) this._hitProp(prop, strike);
    }
  }

  _breakPropsAlong(strike, width) {
    for (const prop of this.ctx.ruins?.props ?? []) {
      if (!prop.alive) continue;
      _offset.copy(prop.position).sub(strike.origin);
      _offset.y = 0;
      const along = _offset.dot(strike.direction);
      if (along < -0.5 || along > strike.front) continue;
      const lateral = Math.abs(_offset.x * strike.direction.z - _offset.z * strike.direction.x);
      if (lateral <= width + prop.radius) this._hitProp(prop, strike);
    }
  }

  /* ------------------------------------------------------------------ */

  /** Footprint radius — used to widen every hit test. Owned by the body. */
  _radiusOf(monster) {
    return monster.hitRadius;
  }

  /**
   * Land one hit: roll the crit, apply armour and statuses, shove the body and
   * dress it, then tell whoever is keeping score.
   */
  _damage(monster, strike, direction, falloff = 1) {
    const cfg = settings.combat;
    const { profile, element } = strike;

    const crit = Math.random() < cfg.critChance;
    const amount = profile.damage * falloff * cfg.damageScale * (crit ? cfg.critMultiplier : 1);

    const result = monster.applyDamage(amount, { shatter: profile.shatter ?? 1 });
    if (result.dealt <= 0 && !result.killed) return;

    if (profile.status && profile.duration > 0) {
      monster.applyStatus(profile.status, profile.duration);
    }
    if (profile.knockback > 0) {
      monster.applyKnockback(direction.x, direction.z, profile.knockback * falloff);
    }

    this._dressHit(monster, element, result);

    const info = {
      element,
      amount: Math.round(amount),
      crit,
      shattered: result.shattered,
      killed: result.killed
    };
    this.emit('hit', monster, info.amount, info);
    if (result.killed) this.emit('kill', monster, info);
  }

  /** Sparks off the body, tinted by whatever hit it. */
  _dressHit(monster, element, result) {
    const { particles } = this.ctx;
    if (!particles) return;

    const tint = getColor(settings[element].lightColor);
    monster.centre(_scratch);
    const scale = monster.root.scale.x;

    particles.get('impact-sparks', { capacity: 1600, additive: true, stretch: true }).emit(
      result.killed ? 22 : 12,
      {
        position: _scratch,
        radius: 0.32 * scale,
        speed: result.shattered ? 8 : 5.2,
        speedVariance: 0.7,
        spread: 1,
        size: 0.12 * scale,
        sizeVariance: 0.6,
        life: 0.4,
        lifeVariance: 0.5,
        tint,
        time: this.elapsed
      }
    );

    if (result.shattered) {
      this.ctx.bursts?.spawn(BurstMode.FROST, _scratch, {
        radius: 0.2 * scale,
        endRadius: 1.8 * scale,
        life: 0.5,
        intensity: 2.0,
        opacity: 0.85
      });
      this.ctx.shake?.add(0.4 * settings.global.cameraShake, 2.6, 26);
    }
  }

  /** The mark a cast leaves where it landed. */
  _dressImpact(strike, position, radius) {
    const { decals } = this.ctx;
    const tint = getColor(settings[strike.element].lightColor);

    decals?.spawn(DecalType.SHOCKWAVE, position, {
      radius: Math.max(0.8, radius),
      life: 0.5,
      colorA: tint,
      colorB: tint,
      intensity: 1.2,
      width: 0.1,
      growth: 1.2
    });

    this.emit('impact', position, { element: strike.element, radius });
  }

  /**
   * Break a barrel or a crate.
   *
   * A barrel cooks off, which is the point of barrels: it re-enters the system
   * as a second blast with its own radius, so shooting one in a crowd is a real
   * play rather than scenery damage.
   */
  _hitProp(prop, strike) {
    prop.health -= strike.profile.damage;
    if (prop.health > 0) return;

    const broken = this.ctx.ruins?.breakProp(prop);
    if (!broken) return;

    const { particles, bursts, decals } = this.ctx;
    const woodTint = getColor('#8a6440');

    particles?.get('debris', { capacity: 1200, additive: false, lit: true }).emit(24, {
      position: broken.position,
      radius: 0.35,
      speed: 5.5,
      speedVariance: 0.8,
      spread: 1,
      size: 0.16,
      sizeVariance: 0.7,
      life: 1.3,
      spin: 12,
      tint: woodTint,
      time: this.elapsed
    });

    if (broken.explosive) {
      const fireTint = getColor('#ff8a3c');
      bursts?.spawn(BurstMode.FIRE, broken.position, {
        radius: 0.4,
        endRadius: 3.4,
        life: 0.85,
        intensity: 1.9,
        opacity: 0.95,
        colorA: fireTint
      });
      decals?.spawn(DecalType.SCORCH, broken.position, {
        radius: 2.4,
        life: 8,
        colorA: fireTint,
        colorB: fireTint,
        intensity: 1.0,
        width: 0.6
      });
      this.ctx.shake?.add(0.55 * settings.global.cameraShake, 2.4, 22);
      this.ctx.flash?.trigger(fireTint, 0.18);

      // The cook-off is a real blast against a fresh strike record, so it hits
      // whatever is standing near the barrel — including monsters the original
      // cast never touched.
      const blast = {
        element: strike.element,
        profile: { ...strike.profile, damage: strike.profile.damage * 0.6, knockback: 6, status: 'burn', duration: 3 },
        hit: new Set()
      };
      this._blast(blast, broken.position, 3.4);
    } else {
      bursts?.spawn(BurstMode.EARTH, broken.position, {
        radius: 0.3,
        endRadius: 1.6,
        life: 0.6,
        intensity: 0.9,
        opacity: 0.8
      });
    }

    this.emit('prop', prop, broken);
  }

  /* ------------------------------------------------------------------ */

  /** Drop every strike still in flight. Named to leave `clear()` to the emitter. */
  reset() {
    this.strikes.length = 0;
  }

  dispose() {
    this.reset();
    super.clear();
  }
}
