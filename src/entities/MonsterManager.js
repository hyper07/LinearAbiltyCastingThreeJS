import { Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';

import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { randRange } from '../utils/math.js';
import { ObjectPool } from '../utils/ObjectPool.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { DecalType } from '../effects/GroundDecals.js';
import { BurstMode } from '../effects/BurstSphere.js';
import { LAYER } from '../core/Layers.js';
import { Monster } from './Monster.js';
import { Dragon } from './Dragon.js';
import { MonsterAssets } from './MonsterBuilder.js';

/**
 * Kinds that need more than the base brain. Everything else is a `Monster`;
 * this is one line per creature that is genuinely a different *kind of thing*
 * rather than a different set of numbers.
 */
const MONSTER_TYPES = { dragon: Dragon };

const _spawn = new Vector3();
const _scratch = new Vector3();
const _direction = new Vector3();

/**
 * Owns every monster: their pools, their arrivals, their attacks and their
 * deaths.
 *
 * Pools are per *kind* rather than shared, because kinds differ in geometry —
 * a released golem cannot come back as an imp. Within a kind, an instance keeps
 * its meshes and its materials forever, so a two-hundred-kill session builds at
 * most `maxAlive` bodies.
 *
 * Attacks resolve *here* rather than inside `Monster`, for the same reason
 * damage from abilities resolves in `Combat`: the monster knows when it swung,
 * but only this layer knows where the caster is, what else is standing nearby
 * and how to dress the hit. A monster raises `pendingAttack`; this drains it.
 *
 * Emits: `spawn` (monster), `death` (monster, cause), `playerHit` (amount,
 * source), `damage` (monster, amount, info).
 */
export class MonsterManager extends EventEmitter {
  /**
   * @param {object} context { scene, camera, particles, decals, bursts, fissures, shake, flash }
   */
  constructor(context) {
    super();
    this.ctx = context;

    this.group = new Group();
    this.group.name = 'Monsters';
    context.scene.add(this.group);

    this.assets = new MonsterAssets();
    this.pools = new Map();
    /** Everything currently in the scene, dying bodies included. */
    this.active = [];

    /** Cylinders monsters steer around; set by the app from the ruins. */
    this.obstacles = [];
    /** Where they are all trying to get to. */
    this.target = new Vector3();

    this.elapsed = 0;
    this.healthMultiplier = 1;

    this.projectiles = new ProjectileField(context);
    this.group.add(this.projectiles.group);
  }

  get aliveCount() {
    let count = 0;
    for (const monster of this.active) if (monster.isAlive) count++;
    return count;
  }

  /** Live monsters only — what targeting and damage iterate. */
  get living() {
    return this.active.filter((monster) => monster.isTargetable);
  }

  _pool(kind) {
    let pool = this.pools.get(kind);
    if (!pool) {
      const Type = MONSTER_TYPES[kind] ?? Monster;
      pool = new ObjectPool(() => {
        const monster = new Type(kind, this.assets);
        this.group.add(monster.root);
        return monster;
      });
      this.pools.set(kind, pool);
    }
    return pool;
  }

  /* ------------------------------------------------------------------ */
  /* spawning                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Put one monster on the field.
   *
   * @param {string} kind
   * @param {Vector3} [position] defaults to a point on the arrival ring
   * @returns {Monster|null} null when the field is full
   */
  spawn(kind, position = null) {
    const config = settings.monsters.kinds[kind];
    if (!config) return null;
    // A boss ignores the population cap. It arrives because the wave called for
    // it, and a field already full of imps must not be able to cancel that.
    if (!config.boss && this.aliveCount >= settings.monsters.maxAlive) return null;

    const at = position ?? this.randomSpawnPoint();
    const monster = this._pool(kind).acquire();
    monster.spawn(at, this.healthMultiplier);
    this.active.push(monster);

    this._dressArrival(monster);
    this.emit('spawn', monster);
    return monster;
  }

  /** A point on the arrival ring, biased away from where the caster is looking. */
  randomSpawnPoint(out = _spawn) {
    const radius = settings.monsters.spawnRadius;
    const angle = randRange(0, Math.PI * 2);
    return out.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }

  /**
   * The portal a monster comes out of.
   *
   * This is not decoration: `spawnTelegraph` seconds of a growing ring on the
   * floor is the only warning the player gets, and without it monsters appear
   * to teleport into the fight.
   */
  _dressArrival(monster) {
    const { decals, bursts, particles } = this.ctx;
    const accent = getColor(monster.config.accent);
    const scale = monster.root.scale.x;

    decals?.spawn(DecalType.ARC, monster.position, {
      radius: 1.5 * scale,
      life: settings.monsters.spawnTelegraph + 0.5,
      colorA: accent,
      colorB: accent,
      intensity: 1.4,
      width: 0.2,
      growth: 0.6
    });

    bursts?.spawn(BurstMode.STORM, _scratch.set(monster.position.x, 0.5 * scale, monster.position.z), {
      radius: 0.2 * scale,
      endRadius: 1.6 * scale,
      life: 0.7,
      intensity: 1.1,
      opacity: 0.7,
      colorA: accent
    });

    particles
      ?.get('monster-spawn', { capacity: 900, additive: true, curl: true })
      .emit(Math.round(26 * scale), {
        position: _scratch.set(monster.position.x, 0.2, monster.position.z),
        radius: 0.7 * scale,
        direction: { x: 0, y: 1, z: 0 },
        speed: 3.2,
        speedVariance: 0.7,
        spread: 0.5,
        size: 0.16 * scale,
        life: 0.9,
        tint: accent,
        time: this.elapsed
      });
  }

  /**
   * Build one of every kind and immediately retire it.
   *
   * The first monster of a wave would otherwise pay for its geometry, its three
   * materials and its shader program on the frame it arrives — a visible hitch
   * at exactly the moment the player is being asked to react. Doing it during
   * the loading screen costs nothing anyone can see.
   */
  warmUp() {
    for (const kind of Object.keys(settings.monsters.kinds)) {
      const monster = this._pool(kind).acquire();
      // Parked far outside the arena: it exists for one frame of compilation
      // and is never updated, so it must not be anywhere the camera looks.
      monster.spawn(_scratch.set(0, 0, 1000));
      monster.retire();
      this._pool(kind).release(monster);
    }
  }

  /** Weighted pick across the kinds, honouring `weight`. */
  randomKind(random = Math.random) {
    const kinds = Object.entries(settings.monsters.kinds);
    // Zero-weight kinds (the boss) are not in the pool at all — leaving them in
    // with weight 0 would still let a roll of exactly 0 land on one.
    const pool = kinds.filter(([, config]) => (config.weight ?? 1) > 0);
    if (!pool.length) return kinds[0][0];

    let total = 0;
    for (const [, config] of pool) total += config.weight ?? 1;
    let roll = random() * total;
    for (const [kind, config] of pool) {
      roll -= config.weight ?? 1;
      if (roll <= 0) return kind;
    }
    return pool[0][0];
  }

  /* ------------------------------------------------------------------ */
  /* frame                                                               */
  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    this.elapsed = elapsed;
    if (!settings.monsters.enabled) return;

    const crowd = this.active;
    const ctx = {
      target: this.target,
      obstacles: this.obstacles,
      crowd,
      elapsed,
      camera: this.ctx.camera,
      particles: this.ctx.particles,
      decals: this.ctx.decals,
      bursts: this.ctx.bursts,
      shake: this.ctx.shake,
      onDamage: (monster, amount, info) => this.emit('damage', monster, amount, info),
      // Attacks that are not a single swing — a sustained breath, a tail sweep —
      // resolve inside the monster, because only it knows where its own head is
      // pointing this frame. They report the hit back through here.
      onPlayerHit: (amount, source) => this.emit('playerHit', amount, source)
    };

    for (let i = crowd.length - 1; i >= 0; i--) {
      const monster = crowd[i];
      const wasAlive = monster.isAlive;
      monster.update(dt, ctx);

      if (wasAlive && !monster.isAlive) this._dressDeath(monster);
      if (monster.pendingAttack) this._resolveAttack(monster);

      if (monster.isFinished) {
        crowd.splice(i, 1);
        monster.retire();
        this._pool(monster.kind).release(monster);
      }
    }

    this.projectiles.update(dt, elapsed, this.target, (amount, position) =>
      this.emit('playerHit', amount, { position, ranged: true })
    );
  }

  /**
   * A monster's swing landed. Turn it into a hit on the caster.
   *
   * A ranged kind fires a projectile instead of hitting immediately, which is
   * the only reason the player can dodge a wisp: the bolt is a real object with
   * a travel time, not a hitscan dressed up as one.
   */
  _resolveAttack(monster) {
    const attack = monster.pendingAttack;
    monster.pendingAttack = null;
    const accent = getColor(monster.config.accent);

    if (attack.ranged) {
      _direction.copy(this.target).sub(monster.position).setY(0);
      const distance = _direction.length();
      if (distance > 0.001) _direction.multiplyScalar(1 / distance);
      this.projectiles.fire(
        _scratch.set(
          monster.position.x,
          monster.centreHeight * monster.root.scale.x,
          monster.position.z
        ),
        _direction,
        { damage: attack.damage, color: accent, speed: 13, range: distance + 4 }
      );
      return;
    }

    /* melee: the swing arc, then the hit */
    const scale = monster.root.scale.x;
    _direction.copy(this.target).sub(monster.position).setY(0);
    const distance = _direction.length();

    this.ctx.decals?.spawn(DecalType.SHOCKWAVE, monster.position, {
      radius: (attack.splash || monster.config.attackRange) * scale,
      life: 0.42,
      colorA: accent,
      colorB: accent,
      intensity: 1.6,
      width: 0.16,
      growth: 1.4
    });

    if (attack.splash > 0) {
      // A golem's slam: it hits the floor, so it also throws dust and shakes.
      this.ctx.bursts?.spawn(BurstMode.EARTH, monster.position, {
        radius: 0.4,
        endRadius: attack.splash * scale,
        life: 0.8,
        intensity: 1.0,
        opacity: 0.8
      });
      this.ctx.shake?.add(0.35 * settings.global.cameraShake, 2.2, 20);
    }

    const reach = (attack.splash > 0 ? attack.splash : monster.config.attackRange * 1.5) * scale;
    if (distance <= reach) {
      this.emit('playerHit', attack.damage, { position: monster.position, monster });
    }
  }

  /** Everything that happens because something died. */
  _dressDeath(monster) {
    const { particles, decals, bursts } = this.ctx;
    const accent = getColor(monster.config.accent);
    const scale = monster.root.scale.x;
    monster.centre(_scratch);

    if (monster.shattered) {
      // Frozen bodies burst rather than slump — the shatter is the reward for
      // setting the freeze up, so it has to look like one.
      bursts?.spawn(BurstMode.FROST, _scratch, {
        radius: 0.3 * scale,
        endRadius: 2.4 * scale,
        life: 0.75,
        intensity: 1.8,
        opacity: 0.9
      });
      particles?.get('monster-shards', { capacity: 1200, additive: true, lit: true }).emit(
        Math.round(34 * scale),
        {
          position: _scratch,
          radius: 0.4 * scale,
          speed: 6.5,
          speedVariance: 0.6,
          spread: 1,
          size: 0.17 * scale,
          life: 1.1,
          spin: 8,
          tint: getColor('#bfeaff'),
          time: this.elapsed
        }
      );
    } else {
      bursts?.spawn(BurstMode.STORM, _scratch, {
        radius: 0.25 * scale,
        endRadius: 1.9 * scale,
        life: 0.6,
        intensity: 1.3,
        opacity: 0.7,
        colorA: accent
      });
    }

    // The soul: a slow upward drift that outlives the body and marks the kill
    // long enough to read it in a crowded fight.
    particles?.get('monster-soul', { capacity: 900, additive: true, curl: true }).emit(
      Math.round(20 * scale),
      {
        position: _scratch,
        radius: 0.45 * scale,
        direction: { x: 0, y: 1, z: 0 },
        speed: 1.8,
        speedVariance: 0.6,
        spread: 0.35,
        size: 0.19 * scale,
        life: 1.8,
        lifeVariance: 0.4,
        tint: accent,
        time: this.elapsed
      }
    );

    decals?.spawn(DecalType.SCORCH, monster.position, {
      radius: 1.1 * scale,
      life: 5.0,
      colorA: accent,
      colorB: accent,
      intensity: 0.55,
      width: 0.5
    });

    this.emit('death', monster);
  }

  /* ------------------------------------------------------------------ */

  /** The nearest live monster to a point, within `maxDistance`. */
  nearestTo(point, maxDistance = Infinity) {
    let best = null;
    let bestDistance = maxDistance * maxDistance;
    for (const monster of this.active) {
      if (!monster.isTargetable) continue;
      const dx = monster.position.x - point.x;
      const dz = monster.position.z - point.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistance) {
        bestDistance = distSq;
        best = monster;
      }
    }
    return best;
  }

  /** Look one up by the short id the AI commander uses. */
  byId(id) {
    return this.active.find((monster) => monster.id === id && monster.isTargetable) ?? null;
  }

  /**
   * Take every monster off the field without the drama. Used by "clear effects".
   * Not called `clear` — that is the emitter's listener teardown.
   */
  despawnAll() {
    for (const monster of this.active) {
      monster.retire();
      this._pool(monster.kind).release(monster);
    }
    this.active.length = 0;
    this.projectiles.clear();
  }

  dispose() {
    this.despawnAll();
    super.clear();
    for (const pool of this.pools.values()) pool.dispose((monster) => monster.dispose());
    this.pools.clear();
    this.projectiles.dispose();
    this.assets.dispose();
    this.group.parent?.remove(this.group);
  }
}

/* ------------------------------------------------------------------ */
/* enemy projectiles                                                   */
/* ------------------------------------------------------------------ */

/**
 * The bolts wisps throw.
 *
 * A tiny pooled set of unlit glowing spheres that travel, trail particles and
 * expire. They exist so ranged damage is *dodgeable* — the moment a ranged
 * attack becomes an instant hit, backing off stops being a decision.
 */
class ProjectileField {
  constructor(context) {
    this.ctx = context;
    this.group = new Group();
    this.group.name = 'MonsterBolts';
    this.active = [];

    this.geometry = new SphereGeometry(0.16, 10, 8);
    this.pool = new ObjectPool(() => {
      const material = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const mesh = new Mesh(this.geometry, material);
      mesh.layers.set(LAYER.VFX);
      mesh.visible = false;
      this.group.add(mesh);
      return { mesh, material, position: new Vector3(), velocity: new Vector3() };
    });
  }

  fire(origin, direction, { damage, color, speed = 12, range = 24 }) {
    const bolt = this.pool.acquire();
    bolt.position.copy(origin);
    bolt.velocity.copy(direction).multiplyScalar(speed);
    bolt.damage = damage;
    bolt.travelled = 0;
    bolt.range = range;
    bolt.material.color.copy(color);
    bolt.mesh.position.copy(origin);
    bolt.mesh.visible = true;
    this.active.push(bolt);
    return bolt;
  }

  update(dt, elapsed, target, onHit) {
    if (dt <= 0) return;
    const particles = this.ctx.particles;
    const system = particles?.get('bolt-trail', { capacity: 800, additive: true, stretch: true });

    for (let i = this.active.length - 1; i >= 0; i--) {
      const bolt = this.active[i];
      const step = bolt.velocity.length() * dt;
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.travelled += step;
      bolt.mesh.position.copy(bolt.position);

      system?.emit(2, {
        position: bolt.position,
        radius: 0.06,
        speed: 0.4,
        spread: 0.6,
        size: 0.12,
        life: 0.28,
        tint: bolt.material.color,
        time: elapsed
      });

      // A generous hit radius: this is a game about dodging by *moving*, not by
      // pixel-perfect positioning against a 16 cm sphere.
      const dx = bolt.position.x - target.x;
      const dz = bolt.position.z - target.z;
      const hit = dx * dx + dz * dz < 0.85 * 0.85 && bolt.position.y < 2.2;

      if (hit || bolt.travelled > bolt.range || bolt.position.y < 0.05) {
        if (hit) {
          onHit?.(bolt.damage, bolt.position);
          this.ctx.bursts?.spawn(BurstMode.STORM, bolt.position, {
            radius: 0.15,
            endRadius: 1.0,
            life: 0.4,
            intensity: 1.4,
            opacity: 0.8,
            colorA: bolt.material.color
          });
        }
        bolt.mesh.visible = false;
        this.active.splice(i, 1);
        this.pool.release(bolt);
      }
    }
  }

  clear() {
    for (const bolt of this.active) {
      bolt.mesh.visible = false;
      this.pool.release(bolt);
    }
    this.active.length = 0;
  }

  dispose() {
    this.clear();
    this.pool.dispose((bolt) => bolt.material.dispose());
    this.geometry.dispose();
  }
}
