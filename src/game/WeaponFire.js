import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3
} from 'three';
import { LAYER } from '../core/Layers.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { DecalType } from '../effects/GroundDecals.js';
import { settings } from '../config/settings.js';
import { spellSystems, emit } from '../abilities/SpellFx.js';

/**
 * Everything a weapon fires: bullets (instant, with tracers), projectiles that
 * fly (arrows, rockets, grenades, thrown blades, boomerangs), beams and the
 * flamethrower's cone — plus muzzle flashes, explosions and the hits.
 *
 * Damage goes through `Combat.weaponHit` / `Combat.weaponBlast`, so gear,
 * crits, statuses, knockback, damage numbers and kills work exactly as they do
 * for spells. Profiles come from platform/weapon/fire.js.
 */

const _up = new Vector3(0, 1, 0);
const _yAxis = new Vector3(0, 1, 0);
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const _q = new Quaternion();
const _centre = new Vector3();
const tint = (hex) => new Color(hex);

/* ---------------------------------------------------------------------- */
/* Projectile models                                                       */
/* ---------------------------------------------------------------------- */

const mats = new Map();
function mat(color, { emissive = null, metal = 0.3, rough = 0.6 } = {}) {
  const key = `${color}|${emissive}|${metal}|${rough}`;
  if (!mats.has(key)) mats.set(key, new MeshStandardMaterial({ color, emissive: emissive ?? '#000000', emissiveIntensity: emissive ? 2 : 0, metalness: metal, roughness: rough }));
  return mats.get(key);
}
const glowMat = (color) => new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

/** Built along +Z (the direction of flight). */
const MODELS = {
  arrow: () => {
    const g = new Group();
    const shaft = new Mesh(new CylinderGeometry(0.012, 0.012, 0.75, 5), mat('#8a6a48'));
    shaft.rotation.x = Math.PI / 2;
    const tip = new Mesh(new ConeGeometry(0.03, 0.09, 5), mat('#b8c0c8', { metal: 0.8, rough: 0.3 }));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.41;
    const fletch = new Mesh(new BoxGeometry(0.07, 0.003, 0.12), mat('#e8e0d0'));
    fletch.position.z = -0.32;
    g.add(shaft, tip, fletch);
    return g;
  },
  bolt: () => {
    const g = MODELS.arrow();
    g.scale.set(1.4, 1.4, 0.65);
    return g;
  },
  rocket: () => {
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(0.06, 0.06, 0.5, 8), mat('#5a6050'));
    body.rotation.x = Math.PI / 2;
    const nose = new Mesh(new ConeGeometry(0.06, 0.16, 8), mat('#b04030'));
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.33;
    const flame = new Mesh(new SphereGeometry(0.08, 8, 6), glowMat('#ffb060'));
    flame.position.z = -0.3;
    g.add(body, nose, flame);
    return g;
  },
  grenade: () => new Mesh(new SphereGeometry(0.08, 10, 8), mat('#3a4a30', { metal: 0.5 })),
  bomb: () => {
    const g = new Group();
    g.add(new Mesh(new SphereGeometry(0.13, 12, 10), mat('#2a2a30', { metal: 0.3 })));
    const fuse = new Mesh(new SphereGeometry(0.035, 6, 5), glowMat('#ffd080'));
    fuse.position.y = 0.16;
    g.add(fuse);
    return g;
  },
  stone: () => new Mesh(new SphereGeometry(0.06, 7, 5), mat('#8a8a90', { rough: 0.9, metal: 0 })),
  knife: () => {
    const g = new Group();
    g.add(new Mesh(new BoxGeometry(0.035, 0.008, 0.26), mat('#c8d0d8', { metal: 0.85, rough: 0.25 })));
    const grip = new Mesh(new BoxGeometry(0.04, 0.025, 0.1), mat('#2a2a30'));
    grip.position.z = -0.16;
    g.add(grip);
    return g;
  },
  axe: () => {
    const g = new Group();
    const handle = new Mesh(new CylinderGeometry(0.018, 0.02, 0.45, 6), mat('#5a4030'));
    g.add(handle);
    const head = new Mesh(new BoxGeometry(0.2, 0.14, 0.02), mat('#a0a8b0', { metal: 0.8, rough: 0.3 }));
    head.position.set(0.08, 0.16, 0);
    g.add(head);
    return g;
  },
  javelin: () => {
    const g = new Group();
    const shaft = new Mesh(new CylinderGeometry(0.018, 0.018, 1.5, 6), mat('#6a5038'));
    shaft.rotation.x = Math.PI / 2;
    const tip = new Mesh(new ConeGeometry(0.04, 0.2, 6), mat('#c0c8d0', { metal: 0.85, rough: 0.25 }));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.84;
    g.add(shaft, tip);
    return g;
  },
  harpoon: () => {
    const g = MODELS.javelin();
    g.scale.setScalar(0.8);
    return g;
  },
  dart: () => {
    const g = new Group();
    const shaft = new Mesh(new CylinderGeometry(0.006, 0.006, 0.18, 4), mat('#d8d0b0'));
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    const tuft = new Mesh(new SphereGeometry(0.02, 6, 4), mat('#9be37a'));
    tuft.position.z = -0.09;
    g.add(tuft);
    return g;
  },
  shuriken: () => {
    const g = new Group();
    for (let i = 0; i < 4; i++) {
      const blade = new Mesh(new BoxGeometry(0.04, 0.006, 0.2), mat('#a8b0b8', { metal: 0.85, rough: 0.25 }));
      blade.rotation.y = (i * Math.PI) / 4;
      g.add(blade);
    }
    return g;
  },
  boomerang: () => {
    const g = new Group();
    const a = new Mesh(new BoxGeometry(0.34, 0.02, 0.07), mat('#8a5a30'));
    a.position.x = 0.12;
    const b = new Mesh(new BoxGeometry(0.07, 0.02, 0.32), mat('#8a5a30'));
    b.position.z = 0.12;
    g.add(a, b);
    return g;
  },
  chakram: () => {
    const g = new Group();
    const ring = new Mesh(new TorusGeometry(0.16, 0.02, 6, 28), mat('#d0a040', { metal: 0.85, rough: 0.25 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    return g;
  },
  plasma: () => new Mesh(new SphereGeometry(0.1, 10, 8), glowMat('#ffffff'))
};

/** Models that tumble or spin instead of flying point-first. */
const SPINNERS = { shuriken: 'y', boomerang: 'y', chakram: 'y', axe: 'x', bomb: 'x', grenade: 'x', stone: 'x' };

/* ---------------------------------------------------------------------- */

export class WeaponFire {
  /**
   * @param {object} ctx { scene, combat, monsters, particles, bursts, decals, lights, shake }
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new Group();
    this.group.name = 'weapon-fire';
    ctx.scene.add(this.group);
    this.fx = spellSystems(ctx.particles);
    this.projectiles = [];
    this.tracers = [];
    this.pool = new Map();
    this.flashes = [];
    this.queue = [];
    /** Where returning weapons fly back to (the thrower). */
    this.owner = null;

    // Tracers: one unit cylinder along +Y, scaled and turned per shot.
    this.tracerGeometry = new CylinderGeometry(1, 1, 1, 6, 1, true);
  }

  /* -------------------------------------------------------------------- */
  /* Firing                                                               */
  /* -------------------------------------------------------------------- */

  /**
   * Pull the trigger once (a burst queues its follow-up shots).
   * @param {Vector3} muzzle world position the shot leaves from
   * @param {Vector3} direction unit, flat
   * @param {object} fire profile (fire.js)
   * @param {() => { muzzle: Vector3, direction: Vector3, distance?: number }} [aim] fresh aim for later burst shots
   * @param {number} [distance] how far away the target point is (lobbed things land there)
   */
  fire(muzzle, direction, fire, aim = null, distance = null) {
    this._shot(muzzle, direction, fire, distance);
    for (let i = 1; i < (fire.burst ?? 1); i++) this.queue.push({ at: i * 0.07, fire, aim, muzzle: muzzle.clone(), direction: direction.clone(), distance });
  }

  _shot(muzzle, direction, fire, distance = null) {
    const pellets = Math.max(1, fire.pellets ?? 1);
    for (let i = 0; i < pellets; i++) {
      const dir = this._spread(direction, fire.spread ?? 0, pellets > 1 ? (i / (pellets - 1) - 0.5) * 2 : null);
      if (fire.mode === 'hitscan') this._hitscan(muzzle, dir, fire);
      else if (fire.mode === 'beam') this._beam(muzzle, dir, fire);
      else if (fire.mode === 'cone') this._cone(muzzle, dir, fire);
      else this._launch(muzzle, dir, fire, distance);
    }
    this._muzzleFlash(muzzle, direction, fire);
  }

  /** Turn a direction by up to ±spread (radians); `fan` (-1..1) spreads pellets evenly. */
  _spread(direction, spread, fan) {
    const out = direction.clone();
    if (!spread) return out;
    const angle = fan != null ? fan * spread + (Math.random() - 0.5) * spread * 0.3 : (Math.random() - 0.5) * 2 * spread;
    return out.applyAxisAngle(_up, angle);
  }

  /** Monsters along a line, nearest first: { monster, along }. */
  _along(origin, direction, range, width) {
    const out = [];
    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable) continue;
      _a.copy(monster.position).sub(origin).setY(0);
      const along = _a.x * direction.x + _a.z * direction.z;
      if (along < 0 || along > range) continue;
      const lateral = Math.abs(_a.x * direction.z - _a.z * direction.x);
      if (lateral > monster.hitRadius + width) continue;
      out.push({ monster, along });
    }
    return out.sort((x, y) => x.along - y.along);
  }

  _hitscan(muzzle, direction, fire) {
    const hits = this._along(muzzle, direction, fire.range, 0.25).slice(0, 1 + (fire.pierce ?? 0));
    for (const { monster } of hits) {
      this.ctx.combat.weaponHit(monster, fire, direction);
      monster.centre(_c);
      emit(this.fx.sparks, 6, { position: _c, radius: 0.1, direction: _b.copy(direction).negate(), speed: 5, spread: 0.6, size: 0.08, life: 0.25, tint: tint(fire.color) });
    }
    const reach = hits.length && hits.length > (fire.pierce ?? 0) ? hits[hits.length - 1].along : fire.range;
    _b.copy(muzzle).addScaledVector(direction, reach);
    _b.y = hits.length ? muzzle.y * 0.6 + 0.4 : muzzle.y - 0.35;
    this._tracer(muzzle, _b, fire.color, 0.022, 0.08);
    if (!hits.length) emit(this.fx.smoke, 1, { position: _b.setY(0.1), speed: 0.4, size: 0.4, life: 0.5, tint: tint('#9a9080') });
  }

  _beam(muzzle, direction, fire) {
    const hits = this._along(muzzle, direction, fire.range, 0.45).slice(0, 1 + (fire.pierce ?? 0));
    for (const { monster } of hits) {
      this.ctx.combat.weaponHit(monster, fire, direction);
      monster.centre(_c);
      this.ctx.bursts.spawn(BurstMode.STORM, _c, { radius: 0.1, endRadius: 0.7, life: 0.25, intensity: 2, opacity: 0.7, colorA: tint('#ffffff'), colorB: tint(fire.color), colorC: tint(fire.color) });
    }
    _b.copy(muzzle).addScaledVector(direction, fire.range);
    _b.y = muzzle.y;
    this._tracer(muzzle, _b, fire.color, 0.09, 0.32);
    this._tracer(muzzle, _b, '#ffffff', 0.03, 0.22);
    this.ctx.shake.add(0.25 * settings.global.cameraShake, 2.4, 22);
    this._flash(muzzle, fire.color, 30, 10, 0.12);
  }

  _cone(muzzle, direction, fire) {
    const half = fire.spread ?? 0.45;
    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable) continue;
      _a.copy(monster.position).sub(muzzle).setY(0);
      const d = _a.length();
      if (d > fire.range + monster.hitRadius) continue;
      const angle = Math.acos(Math.min(1, Math.max(-1, (_a.x * direction.x + _a.z * direction.z) / Math.max(0.001, d))));
      if (angle > half) continue;
      this.ctx.combat.weaponHit(monster, fire, direction);
    }
    // The flame itself: hot glow that billows and drifts up, smoke behind it.
    for (let i = 0; i < 10; i++) {
      const dir = this._spread(direction, half * 0.8, null);
      dir.y = 0.05 + Math.random() * 0.12;
      emit(this.fx.glow, 1, { position: muzzle, radius: 0.05, direction: dir, speed: fire.range * (1.1 + Math.random() * 0.6), spread: 0.08, size: 0.35, life: 0.45, tint: tint(Math.random() < 0.5 ? fire.color : '#ffd27a') });
    }
    if (Math.random() < 0.5) emit(this.fx.smoke, 1, { position: _b.copy(muzzle).addScaledVector(direction, fire.range * 0.6), speed: 1, size: 1, life: 0.9, tint: tint('#4a3a32') });
    this._flash(muzzle, fire.color, 14, 8, 0.1);
  }

  _launch(muzzle, direction, fire, distance) {
    const kind = fire.visual ?? 'arrow';
    const mesh = this._take(kind);
    mesh.position.copy(muzzle);
    const speed = fire.speed ?? 30;
    const velocity = direction.clone().setY(0).normalize().multiplyScalar(speed);
    // A ballistic shot at the target point: something that explodes lands on
    // it; anything else passes through chest height there. Without gravity
    // it simply flies flat.
    const gravity = fire.gravity ?? 0;
    if (gravity > 0) {
      const d = Math.min(fire.range, Math.max(2, distance ?? fire.range * 0.5));
      const t = d / speed;
      const targetY = fire.explode ? 0 : 0.9;
      velocity.y = (targetY - muzzle.y + 0.5 * gravity * t * t) / t;
    }
    this.projectiles.push({ kind, mesh, fire, velocity, prev: muzzle.clone(), travelled: 0, hit: new Set(), pierced: 0, returning: false, age: 0, spin: Math.random() * 6 });
  }

  /* -------------------------------------------------------------------- */
  /* Per frame                                                            */
  /* -------------------------------------------------------------------- */

  update(dt) {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.at -= dt;
      if (q.at > 0) continue;
      const fresh = q.aim?.();
      this._shot(fresh?.muzzle ?? q.muzzle, fresh?.direction ?? q.direction, q.fire, fresh?.distance ?? q.distance);
      this.queue.splice(i, 1);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this._step(this.projectiles[i], dt)) this._retire(i);
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.age += dt;
      t.mesh.material.opacity = Math.max(0, 1 - t.age / t.life);
      if (t.age >= t.life) {
        t.mesh.visible = false;
        this.tracers.splice(i, 1);
        (this._spareTracers ??= []).push(t.mesh);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.left -= dt;
      if (f.left <= 0) {
        this.ctx.lights.release(f.entry);
        this.flashes.splice(i, 1);
      }
    }
  }

  /** @returns {boolean} still flying */
  _step(p, dt) {
    const { fire, mesh, velocity } = p;
    p.age += dt;
    p.prev.copy(mesh.position);

    if (p.returning && this.owner) {
      // Steer home to the thrower.
      _a.copy(this.owner).setY(1.2).sub(mesh.position);
      const d = _a.length();
      if (d < 1) return false;
      velocity.lerp(_a.normalize().multiplyScalar(fire.speed * 1.15), Math.min(1, dt * 6));
    } else {
      velocity.y -= (fire.gravity ?? 0) * dt;
    }
    mesh.position.addScaledVector(velocity, dt);
    p.travelled += velocity.length() * dt;

    // Face the way it flies, or spin.
    const axis = SPINNERS[p.kind];
    if (axis) {
      p.spin += dt * (p.kind === 'chakram' || p.kind === 'boomerang' || p.kind === 'shuriken' ? 22 : 9);
      mesh.rotation.set(axis === 'x' ? p.spin : 0, axis === 'y' ? p.spin : 0, 0);
    } else {
      _a.copy(velocity).normalize();
      _q.setFromUnitVectors(_zAxis, _a);
      mesh.quaternion.copy(_q);
    }

    // Trails.
    if (p.kind === 'rocket') {
      emit(this.fx.smoke, 1, { position: mesh.position, speed: 0.4, size: 0.7, life: 1.0, tint: tint('#8a8070') });
      emit(this.fx.glow, 2, { position: mesh.position, speed: 0.6, size: 0.3, life: 0.2, tint: tint('#ffb060') });
    } else if (p.kind === 'plasma') {
      mesh.material.color.set(fire.color);
      emit(this.fx.glow, 2, { position: mesh.position, speed: 0.3, size: 0.3, life: 0.25, tint: tint(fire.color) });
    } else if (p.kind === 'bomb' || p.kind === 'grenade') {
      if (Math.random() < 0.6) emit(this.fx.sparks, 1, { position: mesh.position, direction: _up, speed: 2, spread: 0.6, size: 0.05, life: 0.3, tint: tint('#ffd080') });
    } else if (p.kind === 'chakram' || p.kind === 'boomerang') {
      emit(this.fx.glow, 1, { position: mesh.position, speed: 0.1, size: 0.25, life: 0.18, tint: tint(fire.color) });
    }

    // Hits along this frame's path.
    for (const monster of this.ctx.monsters.active) {
      if (!monster.isTargetable || p.hit.has(monster)) continue;
      monster.centre(_centre);
      if (distanceToSegment(_centre, p.prev, mesh.position) > monster.hitRadius + 0.25) continue;
      p.hit.add(monster);
      if (fire.explode) return this._explode(mesh.position, fire);
      this.ctx.combat.weaponHit(monster, fire, _b.copy(velocity).setY(0).normalize());
      emit(this.fx.sparks, 8, { position: _centre, radius: 0.1, speed: 4, spread: 1, size: 0.08, life: 0.3, tint: tint(fire.color) });
      if (++p.pierced > (fire.pierce ?? 0)) return false;
    }

    // The ground.
    if (mesh.position.y <= 0.05 && !p.returning) {
      if (fire.explode) return this._explode(mesh.position.setY(0.1), fire);
      emit(this.fx.smoke, 2, { position: mesh.position, speed: 0.6, size: 0.4, life: 0.5, tint: tint('#8a7a60') });
      return false;
    }
    // Out of range: a boomerang turns back, a rocket or bomb goes off, the rest drop.
    if (p.travelled >= fire.range && !p.returning) {
      if (fire.returns) {
        p.returning = true;
        p.hit.clear();
        return true;
      }
      if (fire.explode) return this._explode(mesh.position, fire);
      return false;
    }
    return p.age < 6;
  }

  _explode(point, fire) {
    const at = point.clone();
    at.y = Math.max(0.2, at.y);
    this.ctx.combat.weaponBlast(at, fire);
    const cold = fire.status === 'chill';
    this.ctx.bursts.spawn(cold ? BurstMode.FROST : BurstMode.FIRE, at, { radius: 0.3, endRadius: fire.explode * 0.8, life: 0.5, intensity: 1.8, opacity: 0.85 });
    _a.copy(at).setY(0);
    this.ctx.decals.spawn(cold ? DecalType.FROST : DecalType.SCORCH, _a, { radius: fire.explode, life: 3, intensity: 1.0 });
    this.ctx.decals.spawn(DecalType.SHOCKWAVE, _a, { radius: fire.explode * 1.2, life: 0.5, colorA: tint(fire.color), colorB: tint('#ffffff'), intensity: 1.4, width: 0.12, growth: 1 });
    emit(this.fx.sparks, 40, { position: at, radius: 0.3, speed: 9, spread: 1, size: 0.12, life: 0.6, tint: tint(cold ? '#cfe6ff' : '#ffb060') });
    emit(this.fx.smoke, cold ? 30 : 14, { position: at, radius: fire.explode * 0.4, speed: 1.6, spread: 1, size: 1.6, life: cold ? 2.6 : 1.4, tint: tint(cold ? fire.color : '#5a4a40') });
    this.ctx.shake.add(0.5 * settings.global.cameraShake, 2, 16);
    this._flash(at, cold ? fire.color : '#ffa050', 60, fire.explode * 4, 0.2);
    return false;
  }

  /* -------------------------------------------------------------------- */
  /* Visual bits                                                          */
  /* -------------------------------------------------------------------- */

  _muzzleFlash(muzzle, direction, fire) {
    if (fire.mode === 'cone' || fire.anim === 'throw') return;
    const bright = fire.mode === 'hitscan' || fire.mode === 'beam' || fire.visual === 'rocket';
    if (!bright) return;
    emit(this.fx.glow, 4, { position: muzzle, radius: 0.04, direction, speed: 2.5, spread: 0.4, size: 0.35, life: 0.07, tint: tint(fire.color) });
    emit(this.fx.sparks, 3, { position: muzzle, direction, speed: 7, spread: 0.3, size: 0.06, life: 0.12, tint: tint(fire.color) });
    if (fire.visual === 'rocket') emit(this.fx.smoke, 6, { position: muzzle, radius: 0.2, direction: _b.copy(direction).negate(), speed: 2, spread: 0.5, size: 0.8, life: 1, tint: tint('#8a8070') });
    this._flash(muzzle, fire.color, 18, 6, 0.05);
  }

  _flash(position, color, intensity, distance, seconds) {
    const entry = this.ctx.lights.acquire();
    if (!entry) return;
    entry.light.position.copy(position);
    entry.light.color.set(color);
    entry.light.distance = distance;
    entry.light.intensity = intensity * settings.global.lightIntensity;
    this.flashes.push({ entry, left: seconds });
  }

  _tracer(from, to, color, radius, life) {
    let mesh = this._spareTracers?.pop();
    if (!mesh) {
      mesh = new Mesh(this.tracerGeometry, glowMat(color));
      mesh.layers.set(LAYER.VFX);
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    mesh.material.color.set(color);
    mesh.material.opacity = 1;
    _d.subVectors(to, from);
    const length = _d.length();
    mesh.position.copy(from).addScaledVector(_d, 0.5);
    mesh.quaternion.setFromUnitVectors(_yAxis, _d.normalize());
    mesh.scale.set(radius, length, radius);
    mesh.visible = true;
    this.tracers.push({ mesh, age: 0, life });
  }

  _take(kind) {
    const spare = this.pool.get(kind)?.pop();
    if (spare) {
      spare.visible = true;
      spare.rotation.set(0, 0, 0);
      return spare;
    }
    const mesh = (MODELS[kind] ?? MODELS.arrow)();
    mesh.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.layers.set(n.material.blending === AdditiveBlending ? LAYER.VFX : LAYER.WORLD);
      }
    });
    if (mesh.isMesh && mesh.material.blending === AdditiveBlending) mesh.material = mesh.material.clone();
    this.group.add(mesh);
    return mesh;
  }

  _retire(i) {
    const p = this.projectiles[i];
    p.mesh.visible = false;
    if (!this.pool.has(p.kind)) this.pool.set(p.kind, []);
    this.pool.get(p.kind).push(p.mesh);
    this.projectiles.splice(i, 1);
  }

  clear() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) this._retire(i);
    this.queue.length = 0;
  }
}

const _zAxis = new Vector3(0, 0, 1);

/** Shortest distance from point `p` to the segment a–b. */
function distanceToSegment(p, a, b) {
  _a.subVectors(b, a);
  const lengthSq = _a.lengthSq();
  const t = lengthSq > 1e-8 ? Math.max(0, Math.min(1, _c.subVectors(p, a).dot(_a) / lengthSq)) : 0;
  return _d.copy(a).addScaledVector(_a, t).distanceTo(p);
}
