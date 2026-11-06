import { Vector3 } from 'three';
import { Ability, AbilityPhase } from './Ability.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { spellSystems, emit, arc } from './SpellFx.js';

const MAX_ARCS = 8;
const _hand = new Vector3();
const _floor = new Vector3();

/**
 * ARC CHAIN — a bolt from the hand to the first monster in the line, then
 * leaping body to body. The leaps are decided by `Combat` (it knows where the
 * monsters are); this class only draws what it is told through `onStrike`.
 */
export class ChainAbility extends Ability {
  constructor(context) {
    super('chain', context);
    this.arcs = Array.from({ length: MAX_ARCS }, () => ({ a: new Vector3(), b: new Vector3(), age: 0, next: 0, live: false }));
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.1;
  }

  onSpawn() {
    for (const a of this.arcs) a.live = false;
    this.cursor = 0;
    this.ended = false;
    this.linked = false;
    this.quiet = 0;
    const c = this.config;
    this._hand(_hand);
    emit(this.fx.glow, 14, { position: _hand, radius: 0.15, speed: 1.5, size: 0.25, life: 0.25, tint: getColor(c.colorGlow) });
  }

  _hand(out) {
    return out.copy(this.origin).addScaledVector(this.direction, 0.5).setY(this.config.handHeight);
  }

  /** Combat → effect: `link` (from|null, to), `miss` (point), `end`. */
  onStrike(type, a, b) {
    const c = this.config;
    if (type === 'link') {
      const arcRec = this.arcs[this.cursor++ % MAX_ARCS];
      if (a) arcRec.a.copy(a);
      else this._hand(arcRec.a);
      arcRec.b.copy(b);
      arcRec.age = 0;
      arcRec.next = 0;
      arcRec.live = true;
      this.linked = true;
      this.position.copy(b);
      this.ctx.bursts.spawn(BurstMode.STORM, b, {
        radius: 0.1,
        endRadius: 0.75,
        life: 0.25,
        intensity: 2.4,
        opacity: 0.7,
        colorA: getColor(c.colorCore),
        colorB: getColor(c.colorGlow),
        colorC: getColor(c.colorGlow)
      });
      emit(this.fx.sparks, 18, { position: b, radius: 0.2, speed: 6, spread: 1, size: 0.12, life: 0.35, tint: getColor(c.colorGlow) });
      _floor.set(b.x, 0, b.z);
      this.ctx.decals.spawn(DecalType.ARC, _floor, { radius: 1.1, life: 1.2, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.2 });
      this.lightBoost = c.lightIntensity * 0.7;
      this.ctx.shake.add(0.08 * settings.global.cameraShake, 2.5, 30);
    } else if (type === 'miss') {
      const arcRec = this.arcs[this.cursor++ % MAX_ARCS];
      this._hand(arcRec.a);
      arcRec.b.copy(a).setY(0.4);
      arcRec.age = 0;
      arcRec.next = 0;
      arcRec.live = true;
      emit(this.fx.sparks, 12, { position: arcRec.b, speed: 4, size: 0.1, life: 0.3, tint: getColor(c.colorGlow) });
      this.ended = true;
    } else if (type === 'end') {
      this.ended = true;
    }
  }

  update(dt) {
    if (!this.isActive) return;
    this.age += dt;
    const c = this.config;

    // The seeking spark — what you see before the first leap lands.
    if (!this.linked && !this.ended) {
      this.advance(dt);
      this._hand(_hand);
      _floor.copy(this.position).setY(c.handHeight * (1 - this.u * 0.6));
      arc(this.fx.glow, _hand, _floor, { jitter: c.arcJitter, density: c.arcDensity * 0.6, size: 0.12, life: 0.06, tint: getColor(c.colorGlow) });
    }

    let lit = false;
    for (const a of this.arcs) {
      if (!a.live) continue;
      a.age += dt;
      a.next -= dt;
      if (a.age > c.arcLife) {
        a.live = false;
        continue;
      }
      lit = true;
      if (a.next <= 0) {
        a.next = 0.045;
        arc(this.fx.glow, a.a, a.b, {
          jitter: c.arcJitter,
          density: c.arcDensity,
          size: 0.26,
          life: 0.1,
          tint: getColor(c.colorGlow),
          core: getColor(c.colorCore)
        });
      }
    }

    this._updateLight(dt, lit ? 1 : 0.3);
    if (this.ended && !lit) this.quiet += dt;
    if ((this.ended && this.quiet > 0.1) || this.age > 4) this.phase = AbilityPhase.DONE;
  }
}
