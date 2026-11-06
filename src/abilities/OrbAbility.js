import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { Ability } from './Ability.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { LAYER } from '../core/Layers.js';
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { spellSystems, emit, arc } from './SpellFx.js';

const _pos = new Vector3();
const _floor = new Vector3();
const _dir = new Vector3();

/** A soft rim-lit shell: bright at the silhouette, see-through in the middle. */
function shellMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uColor: { value: new Color() }, uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vLocal;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
        float bands = 0.6 + 0.4 * sin(vLocal.y * 9.0 + uTime * 6.0 + sin(vLocal.x * 7.0 - uTime * 3.0) * 2.0);
        gl_FragColor = vec4(uColor * (rim * 2.2 + 0.08) * bands, 1.0) * uOpacity;
      }`
  });
}

/**
 * VOID ORB — a slow orb that drifts down the line, lashing out with arcs at
 * whatever comes near it, and bursts at the end. `Combat` picks the targets
 * every tick and reports each one as a `zap`.
 */
export class OrbAbility extends Ability {
  constructor(context) {
    super('orb', context);
  }

  createShaders() {
    const geometry = new SphereGeometry(1, 32, 20);
    this.core = new Mesh(geometry, new MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.shell = new Mesh(geometry, shellMaterial());
    for (const mesh of [this.core, this.shell]) {
      mesh.layers.set(LAYER.VFX);
      mesh.frustumCulled = false;
      mesh.renderOrder = 13;
      this.group.add(mesh);
    }
  }

  createParticles() {
    this.fx = spellSystems(this.ctx.particles);
  }

  get impactDuration() {
    return 0.35;
  }

  get fadeDuration() {
    return 0.4;
  }

  lightShimmer() {
    return 0.8 + 0.2 * Math.sin(this.age * 23) * Math.sin(this.age * 7.1);
  }

  onSpawn() {
    const c = this.config;
    this.core.visible = true;
    this.shell.visible = true;
    this.core.material.color.copy(getColor(c.colorCore));
    this.shell.material.uniforms.uColor.value.copy(getColor(c.colorGlow));
    this.shell.material.uniforms.uOpacity.value = 1;
    this.core.material.opacity = 1;
    this._place();
    emit(this.fx.glow, 30, { position: _pos, radius: 0.3, speed: 3, size: 0.3, life: 0.35, tint: getColor(c.colorGlow) });
  }

  _place(grow = 1) {
    const c = this.config;
    _pos.copy(this.position).setY(c.height + Math.sin(this.age * 5) * 0.08);
    const pulse = 1 + Math.sin(this.age * 11) * 0.06;
    const intro = Math.min(1, this.age / 0.18);
    this.core.position.copy(_pos);
    this.shell.position.copy(_pos);
    this.core.scale.setScalar(c.size * 0.55 * pulse * intro * grow);
    this.shell.scale.setScalar(c.size * 1.35 * pulse * intro * grow);
    this.shell.rotation.y = this.age * 1.7;
    this.shell.material.uniforms.uTime.value = this.age;
    this.position.y = c.height; // the light rides with the orb
  }

  onTravel(dt) {
    const c = this.config;
    this._place();
    // A spiral of motes peeling off behind it.
    const n = Math.max(1, Math.round(60 * c.swirl * dt));
    for (let i = 0; i < n; i++) {
      const a = this.age * 9 + i * 2.1;
      _dir.set(Math.cos(a), Math.sin(a * 0.7) * 0.6, Math.sin(a));
      _floor.copy(_pos).addScaledVector(_dir, c.size * 1.1);
      emit(this.fx.motes, 1, { position: _floor, direction: _dir, speed: 0.6, spread: 0.3, size: 0.13, life: 0.7, tint: getColor(c.colorGlow) });
    }
    emit(this.fx.glow, Math.round(90 * dt) + 1, { position: _pos, radius: c.size * 0.6, speed: 0.4, size: 0.34, life: 0.35, tint: getColor(c.colorDeep) });
  }

  /** Combat → effect: `zap` (orb, monster). */
  onStrike(type, a, b) {
    if (type !== 'zap' || this.phase !== 'travel') return;
    const c = this.config;
    for (let i = 0; i < 3; i++) {
      arc(this.fx.glow, _pos, b, { jitter: 0.45, density: 6, size: 0.17, life: 0.1 + i * 0.05, tint: getColor(c.colorGlow), core: i === 0 ? getColor(c.colorCore) : null });
    }
    emit(this.fx.sparks, 10, { position: b, speed: 4.5, size: 0.1, life: 0.3, tint: getColor(c.colorGlow) });
    this.lightBoost = c.lightIntensity * 0.4;
  }

  onImpact() {
    const c = this.config;
    _floor.copy(_pos);
    this.ctx.bursts.spawn(BurstMode.AIR, _floor, {
      radius: 0.4,
      endRadius: 4.2,
      life: 0.55,
      intensity: 2.4,
      opacity: 0.9,
      colorA: getColor(c.colorCore),
      colorB: getColor(c.colorGlow),
      colorC: getColor(c.colorDeep)
    });
    emit(this.fx.sparks, 60, { position: _floor, radius: 0.3, speed: 10, size: 0.14, life: 0.5, tint: getColor(c.colorGlow) });
    emit(this.fx.motes, 50, { position: _floor, radius: 0.5, speed: 3, size: 0.18, life: 1.1, tint: getColor(c.colorGlow) });
    _floor.y = 0;
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _floor, { radius: 3.6, life: 0.6, colorA: getColor(c.colorGlow), colorB: getColor(c.colorCore), intensity: 1.5, width: 0.12, growth: 1.3 });
    this.ctx.decals.spawn(DecalType.SCORCH, _floor, { radius: 2.2, life: 5, colorA: getColor(c.colorDeep), colorB: getColor(c.colorGlow), intensity: 0.8, width: 0.5 });
    this.ctx.shake.add(0.3 * settings.global.cameraShake, 2.2, 22);
    this.ctx.flash.trigger(getColor(c.colorGlow), 0.12);
    this.lightBoost = c.lightIntensity * 1.5;
  }

  onFade(dt, t) {
    // The orb collapses into the burst.
    const k = Math.max(0, 1 - t * 2.5);
    this._place(k * 1.6 + 0.001);
    this.shell.material.uniforms.uOpacity.value = k;
    this.core.material.opacity = k;
    if (k <= 0) {
      this.core.visible = false;
      this.shell.visible = false;
    }
  }

  onDestroy() {
    this.core.visible = false;
    this.shell.visible = false;
  }
}
