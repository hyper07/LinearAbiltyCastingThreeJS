import { Color, Vector3 } from 'three';
import { ParticleShape } from '../particles/ParticleSystem.js';
import { frame } from '../core/FrameUniforms.js';
import { settings } from '../config/settings.js';

/**
 * Shared building blocks for spells 7–0 (Arc Chain, Void Orb, Hailstorm,
 * Blink Strike). The first six spells each carry ~1,000 lines of bespoke
 * shader; these four are assembled from the engine's existing pieces —
 * GPU particles, burst spheres, ground decals, the light pool — so a new
 * spell is a short file. Particle systems here are neutral white and take
 * their colour from each particle's tint.
 */

const _emit = {};
const _a = new Vector3();
const _b = new Vector3();
const _p = new Vector3();
const _side = new Vector3();
const _up = new Vector3(0, 1, 0);
const NODES = 16; // a power of two, so every node gets displaced
const _offsets = new Float32Array(NODES + 1);
const _offsetsY = new Float32Array(NODES + 1);

function configure(system, { gravity = [0, 0, 0], drag = 1, endSize = 0.5, sizeIn = 0.04, fadeIn = 0.03, fadeOut = 0.5, turbulence = 0.3 }) {
  if (system._spellReady) return system;
  const u = system.uniforms;
  u.uGravity.value.set(...gravity);
  u.uDrag.value = drag;
  u.uEndSize.value = endSize;
  u.uSizeIn.value = sizeIn;
  u.uFadeIn.value = fadeIn;
  u.uFadeOut.value = fadeOut;
  u.uTurbulence.value = turbulence;
  system.setGradient(new Color(1, 1, 1), new Color(1, 1, 1), new Color(0.75, 0.75, 0.75), new Color(0.25, 0.25, 0.25));
  system._spellReady = true;
  return system;
}

/** The five particle systems the new spells draw with (created once, shared). */
export function spellSystems(particles) {
  return {
    glow: configure(particles.get('spell.glow', { capacity: 9000, shape: ParticleShape.SOFT, additive: true, softFade: 0.3 }), {
      drag: 3,
      endSize: 0.35,
      fadeOut: 0.6,
      turbulence: 0.1
    }),
    sparks: configure(particles.get('spell.sparks', { capacity: 4000, shape: ParticleShape.STREAK, additive: true, stretch: true, softFade: 0.25 }), {
      gravity: [0, -9, 0],
      drag: 1.3,
      endSize: 0.25,
      sizeIn: 0.02,
      fadeOut: 0.45
    }),
    motes: configure(particles.get('spell.motes', { capacity: 4000, shape: ParticleShape.SOFT, additive: true, curl: true, softFade: 0.4 }), {
      gravity: [0, 0.6, 0],
      drag: 1.6,
      endSize: 0.2,
      fadeOut: 0.45,
      turbulence: 0.8
    }),
    smoke: configure(particles.get('spell.smoke', { capacity: 2500, shape: ParticleShape.SMOKE, additive: false, curl: true, softFade: 1.1 }), {
      gravity: [0, 0.25, 0],
      drag: 1.8,
      endSize: 2.6,
      sizeIn: 0.15,
      fadeIn: 0.2,
      fadeOut: 0.35,
      turbulence: 0.6
    }),
    hail: configure(particles.get('spell.hail', { capacity: 3000, shape: ParticleShape.STREAK, additive: true, stretch: true, softFade: 0.2 }), {
      gravity: [0, -30, 0],
      drag: 0.02,
      endSize: 1,
      sizeIn: 0.01,
      fadeIn: 0.01,
      fadeOut: 0.12,
      turbulence: 0
    })
  };
}

/**
 * Emit `count` particles. `p` is the ParticleSystem.emit option bag; anything
 * missing gets a sensible default and the current frame time.
 */
export function emit(system, count, p) {
  _emit.position = p.position;
  _emit.radius = p.radius ?? 0;
  _emit.direction = p.direction ?? null;
  _emit.speed = p.speed ?? 1;
  _emit.speedVariance = p.speedVariance ?? 0.4;
  _emit.spread = p.spread ?? 1;
  _emit.inherit = null;
  _emit.anchor = null;
  _emit.size = p.size ?? 0.2;
  _emit.sizeVariance = p.sizeVariance ?? 0.4;
  _emit.life = p.life ?? 0.6;
  _emit.lifeVariance = p.lifeVariance ?? 0.3;
  _emit.spin = p.spin ?? 0;
  _emit.tint = p.tint ?? null;
  _emit.time = frame.uTime.value;
  system.emit(Math.max(0, Math.round(count * settings.global.particleCount)), _emit);
}

/**
 * A crooked bolt of light from `a` to `b`: midpoint-displaced nodes, sampled
 * densely into short-lived glow points. Re-emit every few frames and it
 * flickers like an arc.
 */
export function arc(system, a, b, { jitter = 0.35, density = 7, size = 0.16, life = 0.12, tint, core = null } = {}) {
  _a.copy(a);
  _b.copy(b);
  const length = _a.distanceTo(_b);
  if (length < 0.05) return;
  _side.copy(_b).sub(_a).cross(_up);
  if (_side.lengthSq() < 1e-6) _side.set(1, 0, 0);
  _side.normalize();

  // Midpoint displacement: big kinks first, finer ones on top.
  _offsets.fill(0);
  _offsetsY.fill(0);
  for (let step = NODES; step > 1; step >>= 1) {
    const amp = jitter * (step / NODES) * Math.min(1, length / 3);
    for (let i = step >> 1; i < NODES; i += step) {
      const l = i - (step >> 1);
      const r = Math.min(NODES, i + (step >> 1));
      _offsets[i] = (_offsets[l] + _offsets[r]) / 2 + (Math.random() - 0.5) * 2 * amp;
      _offsetsY[i] = (_offsetsY[l] + _offsetsY[r]) / 2 + (Math.random() - 0.5) * 2 * amp;
    }
  }

  const samples = Math.max(6, Math.ceil(length * density));
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const f = t * NODES;
    const i = Math.min(NODES - 1, Math.floor(f));
    const k = f - i;
    const off = _offsets[i] * (1 - k) + _offsets[i + 1] * k;
    const offY = _offsetsY[i] * (1 - k) + _offsetsY[i + 1] * k;
    _p.copy(_a).lerp(_b, t).addScaledVector(_side, off);
    _p.y += offY;
    emit(system, 1, { position: _p, speed: 0.15, size, sizeVariance: 0.3, life, lifeVariance: 0.4, tint });
    if (core) emit(system, 1, { position: _p, speed: 0.05, size: size * 0.45, sizeVariance: 0.2, life: life * 0.8, lifeVariance: 0.3, tint: core });
  }
}

/** A random point in a disc on the floor. */
export function pointInDisc(centre, radius, out) {
  const r = radius * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  return out.set(centre.x + Math.cos(a) * r, centre.y, centre.z + Math.sin(a) * r);
}
