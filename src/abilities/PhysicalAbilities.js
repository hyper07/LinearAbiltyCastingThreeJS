import { Vector3 } from 'three';
import { Ability } from './Ability.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { RateEmitter } from '../particles/ParticleEngine.js';
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { spellSystems, emit, pointInDisc } from './SpellFx.js';

/**
 * The Barbarian's skills. No element, no glow-for-its-own-sake: dust, rock,
 * cracks in the floor and the camera taking the hit. Each one is built from the
 * shared systems (particles, burst spheres, ground decals, fissures) the same
 * way the newer spells are — see SpellFx.js.
 *
 * Damage is Combat's (settings.combat.<id>); movement for Rampage and the leap
 * is the App's, which moves the body. These classes only draw.
 */

const _p = new Vector3();
const _q = new Vector3();
const _up = new Vector3(0, 1, 0);
const _dir = new Vector3();

const shake = (ctx, amount, freq = 2.2, speed = 20) => ctx.shake.add(amount * settings.global.cameraShake, freq, speed);

/** Rock chips and a dust puff where something heavy meets the floor. */
function debris(fx, at, { chips = 16, dust = 6, size = 1, tint, dustTint }) {
  emit(fx.sparks, chips, { position: at, radius: 0.3 * size, direction: _up, speed: 6 * size, spread: 0.9, size: 0.1 * size, life: 0.55, tint });
  emit(fx.smoke, dust, { position: at, radius: 0.5 * size, speed: 1.2 * size, spread: 1, size: 1.1 * size, sizeVariance: 0.4, life: 1.0, tint: dustTint });
}

/* ---------------------------------------------------------------------- */

/** EARTHSPLITTER — a line of split floor running out from the axe. */
export class SlamAbility extends Ability {
  constructor(context) {
    super('slam', context);
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.2;
  }

  get fadeDuration() {
    return 0.5;
  }

  onSpawn() {
    const c = this.config;
    this.lastFront = 0;
    this.nextCrack = 0;
    _p.copy(this.origin).addScaledVector(this.direction, 1.3);
    this.ctx.bursts.spawn(BurstMode.EARTH, _p, { radius: 0.2, endRadius: 1.1, life: 0.35, intensity: 1.2, opacity: 0.5 });
    this.ctx.decals.spawn(DecalType.CRACK, _p, { radius: 1.8, life: 2.2, intensity: 1.0 });
    debris(this.fx, _p, { chips: 20, dust: 8, size: 1.1, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.3);
  }

  onTravel() {
    const c = this.config;
    // A crack decal every metre and a half, dust and chips the whole way.
    while (this.nextCrack <= this.front && this.nextCrack <= this.length) {
      this.pointAt(this.nextCrack / this.length, _p);
      this.ctx.decals.spawn(DecalType.CRACK, _p, { radius: 1.15, life: 2.0, intensity: 0.9 });
      this.nextCrack += 1.5;
    }
    const from = this.lastFront;
    const steps = Math.max(1, Math.ceil((this.front - from) * 2));
    for (let i = 1; i <= steps; i++) {
      const d = Math.min(this.length, from + ((this.front - from) * i) / steps);
      _p.copy(this.origin).addScaledVector(this.direction, d).setY(0.1);
      emit(this.fx.sparks, 2, { position: _p, radius: 0.35, direction: _up, speed: 4.5, spread: 0.7, size: 0.09, life: 0.45, tint: getColor(c.colorGlow) });
      emit(this.fx.smoke, 1, { position: _p, radius: 0.4, speed: 0.8, size: 1.0, life: 0.8, tint: getColor(c.colorDust) });
    }
    this.lastFront = this.front;
  }

  onImpact() {
    const c = this.config;
    this.pointAt(1, _p);
    this.ctx.bursts.spawn(BurstMode.EARTH, _p, { radius: 0.2, endRadius: 1.3, life: 0.4, intensity: 1.2, opacity: 0.45 });
    this.ctx.decals.spawn(DecalType.DUSTRING, _p, { radius: 2.6, life: 0.8, intensity: 1.0 });
    debris(this.fx, _p, { chips: 24, dust: 10, size: 1.2, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.2);
  }
}

/* ---------------------------------------------------------------------- */

/** RAMPAGE — a dust trail behind the charging body, a slam at the end. */
export class RampageAbility extends Ability {
  constructor(context) {
    super('rampage', context);
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.15;
  }

  get fadeDuration() {
    return 0.6;
  }

  onSpawn() {
    this.lastFront = 0;
    _p.copy(this.origin);
    this.ctx.decals.spawn(DecalType.DUSTRING, _p, { radius: 1.6, life: 0.6, intensity: 0.9 });
    shake(this.ctx, 0.15);
  }

  onTravel() {
    const c = this.config;
    const from = this.lastFront;
    const steps = Math.max(1, Math.ceil((this.front - from) * 2.5));
    for (let i = 1; i <= steps; i++) {
      const d = Math.min(this.length, from + ((this.front - from) * i) / steps);
      _p.copy(this.origin).addScaledVector(this.direction, d).setY(0.2);
      // Dust thrown off to both sides of the charge.
      for (const s of [-1, 1]) {
        _dir.copy(this.side).multiplyScalar(s).addScaledVector(_up, 0.5).normalize();
        emit(this.fx.smoke, 1, { position: _p, radius: 0.3, direction: _dir, speed: 2.2, spread: 0.4, size: 1.0, life: 0.9, tint: getColor(c.colorDust) });
      }
      if (Math.random() < 0.6) emit(this.fx.glow, 1, { position: _p.setY(1.0), radius: 0.4, speed: 0.4, size: 0.5, life: 0.25, tint: getColor(c.colorGlow) });
    }
    this.lastFront = this.front;
  }

  onImpact() {
    const c = this.config;
    this.pointAt(1, _p);
    this.ctx.bursts.spawn(BurstMode.EARTH, _p, { radius: 0.2, endRadius: 1.4, life: 0.4, intensity: 1.2, opacity: 0.45 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: 3, life: 0.5, colorA: getColor(c.colorGlow), colorB: getColor(c.colorDust), intensity: 1.2, width: 0.12, growth: 1.2 });
    debris(this.fx, _p, { chips: 18, dust: 8, size: 1.1, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.35);
    this.lightBoost = c.lightIntensity;
  }
}

/* ---------------------------------------------------------------------- */

/** BATTLE ROAR — a red shockwave out of the Barbarian, embers rising. */
export class RoarAbility extends Ability {
  constructor(context) {
    super('roar', context);
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.6;
  }

  get fadeDuration() {
    return 0.8;
  }

  onImpact() {
    const c = this.config;
    _p.copy(this.origin);
    const r = c.zoneRadius;
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: r, life: 0.7, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.8, width: 0.16, growth: 0.9 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: r * 0.6, life: 0.55, colorA: getColor(c.colorCore), colorB: getColor(c.colorGlow), intensity: 1.4, width: 0.1, growth: 1.3 });
    this.ctx.decals.spawn(DecalType.DUSTRING, _p, { radius: r * 0.8, life: 0.9, intensity: 1.0 });
    _p.setY(1.3);
    this.ctx.bursts.spawn(BurstMode.AIR, _p, { radius: 0.4, endRadius: r * 0.9, life: 0.5, intensity: 1.6, opacity: 0.35, colorA: getColor(c.colorCore), colorB: getColor(c.colorGlow), colorC: getColor(c.colorGlow) });
    emit(this.fx.motes, 60, { position: _p, radius: 1.2, direction: _up, speed: 2.5, spread: 0.8, size: 0.14, life: 1.4, tint: getColor(c.colorGlow) });
    this.ctx.flash.trigger(getColor(c.colorGlow), 0.12);
    shake(this.ctx, 0.45, 2.6, 26);
    this.lightBoost = c.lightIntensity;
  }

  onFade(dt, t) {
    if (t >= 1 || Math.random() > 0.5) return;
    _p.copy(this.origin).setY(0.4);
    emit(this.fx.motes, 2, { position: _p, radius: 0.8, direction: _up, speed: 1.6, spread: 0.4, size: 0.12, life: 1.1, tint: getColor(this.config.colorGlow) });
  }
}

/* ---------------------------------------------------------------------- */

/** SKYBREAKER LEAP — dust on take-off, a crater on landing. */
export class LeapAbility extends Ability {
  constructor(context) {
    super('leap', context);
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.3;
  }

  get fadeDuration() {
    return 0.8;
  }

  onSpawn() {
    const c = this.config;
    _p.copy(this.origin);
    this.ctx.decals.spawn(DecalType.DUSTRING, _p, { radius: 2, life: 0.7, intensity: 1.0 });
    debris(this.fx, _p, { chips: 8, dust: 6, size: 0.9, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
  }

  onImpact() {
    const c = this.config;
    const r = c.zoneRadius;
    this.pointAt(1, _p);
    this.ctx.fissures.spawn(_p, { radius: r * 0.9, life: 1.6 });
    this.ctx.decals.spawn(DecalType.CRACK, _p, { radius: r, life: 3, intensity: 1.2 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: r * 1.1, life: 0.6, colorA: getColor(c.colorGlow), colorB: getColor(c.colorDust), intensity: 1.5, width: 0.14, growth: 1.0 });
    this.ctx.decals.spawn(DecalType.DUSTRING, _p, { radius: r * 1.3, life: 1.0, intensity: 1.2 });
    _q.copy(_p).setY(0.6);
    this.ctx.bursts.spawn(BurstMode.EARTH, _q, { radius: 0.3, endRadius: r * 0.4, life: 0.4, intensity: 1.3, opacity: 0.4 });
    debris(this.fx, _q, { chips: 40, dust: 16, size: 1.6, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.7, 2.0, 18);
    this.lightBoost = c.lightIntensity;
  }
}

/* ---------------------------------------------------------------------- */

/**
 * IRON TEMPEST — a ring of steel streaks around the spinning body, dust at its
 * feet. Follows `this.follow` (the App sets it to the body's position).
 */
export class TempestAbility extends Ability {
  constructor(context) {
    super('tempest', context);
    this.streaks = new RateEmitter();
    this.dust = new RateEmitter();
    this.follow = null;
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return Math.max(0.5, settings.combat.tempest?.lasts ?? this.config.lasts);
  }

  get fadeDuration() {
    return 0.3;
  }

  onImpact() {
    this.spin = 0;
  }

  onFade(dt, t) {
    if (t >= 1) return;
    const c = this.config;
    const centre = this.follow ?? this.origin;
    this.position.set(centre.x, 0, centre.z);
    const r = c.zoneRadius * 0.8;
    this.spin += dt * 14;
    // Two blades of light sweeping round, trailing streaks along the tangent.
    for (let n = this.streaks.tick(dt, 260); n > 0; n--) {
      const blade = Math.floor(Math.random() * 2) * Math.PI;
      const a = this.spin + blade + (Math.random() - 0.5) * 0.5;
      const rr = r * (0.55 + Math.random() * 0.45);
      _p.set(centre.x + Math.cos(a) * rr, 0.7 + Math.random() * 0.7, centre.z + Math.sin(a) * rr);
      _dir.set(-Math.sin(a), 0, Math.cos(a));
      emit(this.fx.sparks, 1, { position: _p, direction: _dir, speed: 9, spread: 0.12, size: 0.14, life: 0.18, tint: getColor(c.colorEdge) });
    }
    for (let n = this.dust.tick(dt, 14); n > 0; n--) {
      pointInDisc(_q.set(centre.x, 0.1, centre.z), r, _p).setY(0.1);
      emit(this.fx.smoke, 1, { position: _p, speed: 1.5, size: 1.1, life: 0.7, tint: getColor(c.colorDust) });
    }
    this.ctx.shake.rumble(0.03 * settings.global.cameraShake, dt);
  }
}

/* ---------------------------------------------------------------------- */

/** WORLDBREAKER — the ground at the point splits, heaves and keeps shaking. */
export class QuakeAbility extends Ability {
  constructor(context) {
    super('quake', context);
    this.heave = new RateEmitter();
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return Math.max(0.5, settings.combat.quake?.lasts ?? this.config.lasts);
  }

  get fadeDuration() {
    return 0.8;
  }

  lightShimmer() {
    return 0.6 + 0.4 * Math.abs(Math.sin(this.age * 17));
  }

  onSpawn() {
    const c = this.config;
    _p.copy(this.origin).addScaledVector(this.direction, 1.2);
    this.ctx.bursts.spawn(BurstMode.EARTH, _p, { radius: 0.3, endRadius: 1.4, life: 0.35, intensity: 1.2, opacity: 0.8 });
    debris(this.fx, _p, { chips: 12, dust: 6, size: 1, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.25);
    this.lastFront = 0;
  }

  onTravel() {
    // A tremor running out to the point: a puff of dust every couple of metres.
    if (this.front - this.lastFront < 2) return;
    this.lastFront = this.front;
    _p.copy(this.position).setY(0.1);
    emit(this.fx.smoke, 2, { position: _p, radius: 0.5, speed: 1, size: 1.2, life: 0.8, tint: getColor(this.config.colorDust) });
  }

  onImpact() {
    const c = this.config;
    const r = c.zoneRadius;
    this.pointAt(1, _p);
    this.centre = this.centre ?? new Vector3();
    this.centre.copy(_p);
    this.ctx.fissures.spawn(_p, { radius: r, life: this.impactDuration + 1.5 });
    this.ctx.decals.spawn(DecalType.CRACK, _p, { radius: r * 1.1, life: this.impactDuration + 3, intensity: 1.3 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: r * 1.2, life: 0.7, colorA: getColor(c.colorGlow), colorB: getColor(c.colorDust), intensity: 1.6, width: 0.14, growth: 0.8 });
    _q.copy(_p).setY(0.6);
    this.ctx.bursts.spawn(BurstMode.EARTH, _q, { radius: 0.3, endRadius: r * 0.35, life: 0.5, intensity: 1.4, opacity: 0.4 });
    debris(this.fx, _q, { chips: 50, dust: 20, size: 1.8, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    shake(this.ctx, 0.8, 1.6, 14);
    this.lightBoost = c.lightIntensity;
    this.burstTimer = 0.15;
  }

  onFade(dt, t) {
    if (t >= 1 || !this.centre) return;
    const c = this.config;
    // Slabs of floor heaving up across the circle while it lasts.
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = 0.14 + Math.random() * 0.12;
      pointInDisc(this.centre, c.zoneRadius * 0.85, _p).setY(0.3);
      this.ctx.bursts.spawn(BurstMode.EARTH, _p, { radius: 0.15, endRadius: 0.9, life: 0.35, intensity: 1.1, opacity: 0.5 });
      debris(this.fx, _p, { chips: 10, dust: 3, size: 0.9, tint: getColor(c.colorGlow), dustTint: getColor(c.colorDust) });
    }
    this.ctx.shake.rumble(0.07 * settings.global.cameraShake, dt);
  }
}
