import { Vector3 } from 'three';
import { Ability } from './Ability.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { spellSystems, emit } from './SpellFx.js';

const _p = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * BLINK STRIKE — the caster vanishes and reappears down the line (App moves
 * the body); a blade of light races along the path behind them and hits
 * everything it passes, with a burst where they land.
 */
export class BlinkAbility extends Ability {
  constructor(context) {
    super('blink', context);
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.25;
  }

  get fadeDuration() {
    return 0.35;
  }

  onSpawn() {
    const c = this.config;
    // Where the caster stood: a burst of light and an afterimage that drifts up.
    _p.copy(this.origin).setY(1);
    this.ctx.bursts.spawn(BurstMode.AIR, _p, {
      radius: 0.3,
      endRadius: 1.8,
      life: 0.35,
      intensity: 2,
      opacity: 0.85,
      colorA: getColor(c.colorCore),
      colorB: getColor(c.colorGlow),
      colorC: getColor(c.colorGlow)
    });
    emit(this.fx.motes, 40, { position: _p, radius: 0.5, direction: _up, speed: 1.4, spread: 0.6, size: 0.16, life: 0.8, tint: getColor(c.colorGlow) });
    this.ctx.flash.trigger(getColor(c.colorGlow), 0.08);
    this.lastFront = 0;
  }

  onTravel() {
    const c = this.config;
    // Fill the stretch the front covered this frame with a ribbon of light.
    const from = this.lastFront;
    const to = this.front;
    const steps = Math.max(1, Math.ceil((to - from) * 6));
    for (let i = 1; i <= steps; i++) {
      const d = from + ((to - from) * i) / steps;
      _p.copy(this.origin).addScaledVector(this.direction, Math.min(d, this.length));
      _p.y = 0.9;
      emit(this.fx.glow, 2, { position: _p, radius: 0.25, speed: 0.3, size: 0.42, life: 0.4, tint: getColor(c.colorGlow) });
      emit(this.fx.glow, 1, { position: _p, speed: 0.1, size: 0.2, life: 0.3, tint: getColor(c.colorCore) });
      if (Math.random() < 0.5) emit(this.fx.sparks, 1, { position: _p, direction: this.side, speed: 4, spread: 0.6, size: 0.08, life: 0.3, tint: getColor(c.colorGlow) });
    }
    this.lastFront = to;
  }

  onImpact() {
    const c = this.config;
    _p.copy(this.origin).addScaledVector(this.direction, this.length).setY(0.9);
    this.ctx.bursts.spawn(BurstMode.AIR, _p, {
      radius: 0.3,
      endRadius: 2.2,
      life: 0.35,
      intensity: 2.2,
      opacity: 0.55,
      colorA: getColor(c.colorCore),
      colorB: getColor(c.colorGlow),
      colorC: getColor(c.colorGlow)
    });
    emit(this.fx.sparks, 50, { position: _p, radius: 0.3, speed: 9, spread: 1, size: 0.12, life: 0.45, tint: getColor(c.colorGlow) });
    _p.y = 0;
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _p, { radius: 3.2, life: 0.55, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.4, width: 0.12, growth: 1.2 });
    this.ctx.shake.add(0.25 * settings.global.cameraShake, 2.4, 24);
    this.lightBoost = c.lightIntensity;
  }
}
