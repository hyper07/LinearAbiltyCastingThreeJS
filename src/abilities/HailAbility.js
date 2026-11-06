import { Vector3 } from 'three';
import { Ability } from './Ability.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { RateEmitter } from '../particles/ParticleEngine.js';
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { spellSystems, emit, pointInDisc } from './SpellFx.js';

const _centre = new Vector3();
const _p = new Vector3();
const _down = new Vector3(0, -1, 0);
const _out = new Vector3();

/**
 * HAILSTORM — a far cast. A cloud gathers over the circle and hammers it with
 * hail for `lasts` seconds; `Combat` deals the damage on its own tick, this
 * class draws the weather.
 */
export class HailAbility extends Ability {
  constructor(context) {
    super('hail', context);
    this.stoneEmitter = new RateEmitter();
    this.splashEmitter = new RateEmitter();
    this.cloudEmitter = new RateEmitter();
    this.rimEmitter = new RateEmitter();
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  /** The storm *is* the impact phase. */
  get impactDuration() {
    return Math.max(0.5, settings.combat.hail?.lasts ?? this.config.lasts);
  }

  get fadeDuration() {
    return 0.8;
  }

  lightShimmer() {
    // Now and then the cloud lights up from inside.
    return 0.55 + 0.45 * Math.max(0, Math.sin(this.age * 2.3) * Math.sin(this.age * 5.9));
  }

  onSpawn() {
    this.burstTimer = 0;
    const c = this.config;
    _p.copy(this.origin).setY(1.4).addScaledVector(this.direction, 0.5);
    emit(this.fx.motes, 24, { position: _p, radius: 0.2, direction: _down.set(0, 1, 0), speed: 4, spread: 0.3, size: 0.16, life: 0.6, tint: getColor(c.colorGlow) });
    _down.set(0, -1, 0);
  }

  onTravel() {
    const c = this.config;
    _p.copy(this.position).setY(2 + this.u * (c.cloudHeight - 2));
    emit(this.fx.glow, 2, { position: _p, radius: 0.2, speed: 0.2, size: 0.35, life: 0.25, tint: getColor(c.colorGlow) });
  }

  onImpact() {
    const c = this.config;
    const r = c.zoneRadius;
    this.pointAt(1, _centre);
    this.position.copy(_centre).setY(3.5);
    this.ctx.decals.spawn(DecalType.FROST, _centre, { radius: r * 1.05, life: this.impactDuration + 2.5, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.0, width: 0.6 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _centre, { radius: r, life: 0.6, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.4, width: 0.1, growth: 0.4 });
    // The cloud forms all at once, then keeps churning.
    _p.copy(_centre).setY(c.cloudHeight);
    emit(this.fx.smoke, 40, { position: _p, radius: r * 0.8, speed: 0.8, spread: 1, size: 2.4, sizeVariance: 0.5, life: 2.2, tint: getColor(c.colorCloud) });
    this.ctx.shake.add(0.15 * settings.global.cameraShake, 2, 14);
    this.lightBoost = c.lightIntensity;
  }

  onFade(dt, t) {
    if (t >= 1) return; // the fade only lets the last stones land
    const c = this.config;
    const r = c.zoneRadius;
    const glow = getColor(c.colorGlow);

    // Hailstones: streaks dropped from the cloud, timed to reach the floor.
    for (let n = this.stoneEmitter.tick(dt, c.stones); n > 0; n--) {
      pointInDisc(_centre, r * 0.95, _p).setY(c.cloudHeight - 0.5);
      emit(this.fx.hail, 1, { position: _p, direction: _down, speed: 12, speedVariance: 0.15, spread: 0.04, size: 0.14, sizeVariance: 0.3, life: 0.42, lifeVariance: 0.1, tint: getColor(c.colorCore) });
    }
    // ...and where they land: a puff of ice and a few chips.
    for (let n = this.splashEmitter.tick(dt, c.stones * 0.6); n > 0; n--) {
      pointInDisc(_centre, r * 0.95, _p).setY(0.08);
      emit(this.fx.glow, 2, { position: _p, speed: 1.2, spread: 1, size: 0.18, life: 0.25, tint: glow });
      emit(this.fx.sparks, 2, { position: _p, direction: _out.set(0, 1, 0), speed: 3, spread: 0.8, size: 0.06, life: 0.3, tint: glow });
    }
    for (let n = this.cloudEmitter.tick(dt, 22); n > 0; n--) {
      pointInDisc(_centre, r * 0.85, _p).setY(c.cloudHeight + (Math.random() - 0.5));
      emit(this.fx.smoke, 1, { position: _p, speed: 0.4, size: 2.2, sizeVariance: 0.5, life: 1.8, tint: getColor(c.colorCloud) });
    }
    // A faint ring of frost motes marks the edge, so you can see the area.
    for (let n = this.rimEmitter.tick(dt, 40); n > 0; n--) {
      const a = Math.random() * Math.PI * 2;
      _p.set(_centre.x + Math.cos(a) * r, 0.15, _centre.z + Math.sin(a) * r);
      emit(this.fx.motes, 1, { position: _p, direction: _out.set(0, 1, 0), speed: 0.7, spread: 0.2, size: 0.12, life: 0.9, tint: glow });
    }
    // Every so often a big stone shatters.
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = 0.18 + Math.random() * 0.2;
      pointInDisc(_centre, r * 0.8, _p).setY(0.3);
      this.ctx.bursts.spawn(BurstMode.FROST, _p, { radius: 0.15, endRadius: 1.1, life: 0.4, intensity: 1.4, opacity: 0.8 });
    }
    this.ctx.shake.rumble(0.04 * settings.global.cameraShake, dt);
  }
}
