import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { settings } from '../config/settings.js';
import { CATEGORIES } from '../library/categories.js';
import { normalizeLevel } from '../levels/Level.js';
import { Terrain, mulberry32 } from './Terrain.js';

/**
 * A battlefield assembled from the asset library — from a level file (hand-made
 * in the editor) or from a `MapPlan` (AI or keywords), which is first turned
 * into a level, so every AI map can be opened and edited by hand.
 *
 * Same surface as `Ruins` — `group`, `obstacles`, `props`, `breakProp`,
 * `restoreProps`, `update`, `dispose` — so combat, monsters and locomotion do
 * not know which one they are standing in.
 *
 * The playable disc (radius `settings.ruins.wallRadius`) stays flat at y = 0:
 * movement, aiming and every ground effect assume it. Relief starts outside it.
 * Placement works in rings around that disc:
 *
 *   arena      11 – 18 m   sparse cover; the 18–22 m band stays clear, it is where monsters walk in
 *   edge       23 – 31 m   the boundary — a dense ring of whatever the plan's `edge` is
 *   outskirts  31 – 75 m   the surroundings
 *   far        75 – 150 m  skyline: mountains, towers, treelines
 */

const ZONES = {
  center: [3, 10],
  arena: [11, 18],
  edge: [23, 31],
  outskirts: [31, 75],
  far: [75, 150]
};
const SPAWN_BAND = [18.2, 22.2];
/** Tallest anything may stand, per zone — cover in the fight must not hide the fight. */
const ZONE_MAX_HEIGHT = { center: 3, arena: 4.5, edge: 10, outskirts: 18, far: 45 };

/** Instances per zone at density 1, per category. Scaled by zone area and the triangle budget. */
const BASE_COUNT = {
  tree: { arena: 6, edge: 50, outskirts: 220, far: 260 },
  bush: { arena: 10, edge: 50, outskirts: 160, far: 80 },
  plant: { center: 40, arena: 70, edge: 60, outskirts: 260, far: 60 },
  rock: { center: 6, arena: 12, edge: 60, outskirts: 120, far: 60 },
  cliff: { arena: 2, edge: 22, outskirts: 30, far: 28 },
  building: { arena: 2, edge: 16, outskirts: 40, far: 50 },
  wall: { arena: 6, edge: 40, outskirts: 20, far: 10 },
  ruin: { arena: 10, edge: 40, outskirts: 50, far: 20 },
  structure: { arena: 4, edge: 12, outskirts: 24, far: 12 },
  tile: { center: 30, arena: 40, edge: 30, outskirts: 30, far: 10 },
  prop: { center: 4, arena: 16, edge: 30, outskirts: 30, far: 0 },
  furniture: { arena: 10, edge: 20, outskirts: 10, far: 0 },
  light: { arena: 8, edge: 16, outskirts: 10, far: 0 },
  vehicle: { arena: 3, edge: 8, outskirts: 14, far: 10 },
  weapon: { arena: 6, edge: 6, outskirts: 0, far: 0 },
  misc: { arena: 6, edge: 12, outskirts: 16, far: 0 }
};

/** Things you walk around rather than through. */
const BLOCKING = new Set(['tree', 'rock', 'cliff', 'building', 'wall', 'ruin', 'structure', 'prop', 'furniture', 'light', 'vehicle', 'misc']);

const EDGE_LAYERS = {
  mountains: [['cliff', [], 0.9], ['rock', [], 0.8]],
  cliffs: [['cliff', [], 1], ['rock', [], 0.6]],
  forest: [['tree', [], 1], ['bush', [], 0.7]],
  buildings: [['building', [], 1]],
  walls: [['wall', ['wall'], 1]],
  rocks: [['rock', [], 1], ['bush', [], 0.4]],
  ruins: [['ruin', [], 1], ['rock', [], 0.5]],
  open: []
};

/** Overrides for `settings.environment`, restored when the map is disposed. */
const TIME_PRESETS = {
  dawn: { backgroundColor: '#6f7f98', fogColor: '#8a8fa0', sunColor: '#ffc89a', sunIntensity: 2.2, sunElevation: 0.18, ambientIntensity: 0.3, hemiIntensity: 0.6, hemiSkyColor: '#ffd9c0', hemiGroundColor: '#4a4a52', envIntensity: 0.5 },
  day: { backgroundColor: '#9fbad6', fogColor: '#b4c6d8', sunColor: '#fff6e8', sunIntensity: 3.2, sunElevation: 0.85, ambientIntensity: 0.45, hemiIntensity: 0.8, hemiSkyColor: '#cfe3ff', hemiGroundColor: '#5a5448', envIntensity: 0.7 },
  dusk: { backgroundColor: '#3a3048', fogColor: '#5a4458', sunColor: '#ff9a62', sunIntensity: 2.0, sunElevation: 0.12, ambientIntensity: 0.25, hemiIntensity: 0.5, hemiSkyColor: '#ffb08a', hemiGroundColor: '#3a3040', envIntensity: 0.45 },
  night: {}
};

/* ---------------------------------------------------------------------- */

export class ComposedWorld {
  /**
   * @param {import('./Environment.js').Environment} environment
   * @param {{ catalog: import('../library/Catalog.js').Catalog, library: import('../library/ModelLibrary.js').ModelLibrary }} deps
   */
  constructor(environment, { catalog, library }) {
    this.environment = environment;
    this.catalog = catalog;
    this.library = library;
    this.group = new Group();
    this.group.name = 'composed-world';
    this.obstacles = [];
    this.props = [];
    this.plan = null;
    this.level = null;
    this.stats = null;
    this.terrain = new Terrain(catalog);
    this._envBackup = null;
    this._instances = null;
    this._fallbacks = new Map();
  }

  /**
   * Build straight from a map plan (the AI / keyword path).
   * @returns {Promise<object>} build stats
   */
  async build(plan, { seed = (Math.random() * 1e9) | 0, onProgress } = {}) {
    const level = this.levelFromPlan(plan, { seed });
    const stats = await this.buildLevel(level, { onProgress });
    stats.fallbacks = this._planFallbacks;
    this.plan = plan;
    return stats;
  }

  /**
   * Turn a map plan into an editable level: the same placement rules as
   * always, but the result is a plain list of objects instead of meshes.
   */
  levelFromPlan(plan, { seed = (Math.random() * 1e9) | 0, base = {} } = {}) {
    const rng = mulberry32(seed);
    this.terrain.setup({ ground: plan.ground, relief: plan.relief, seed });
    this._height = (x, z) => this.terrain.baseHeight(x, z);

    const layers = [...plan.layers];
    for (const [category, keywords, density] of EDGE_LAYERS[plan.edge] ?? []) {
      layers.push({ category, keywords, zone: 'edge', density, cluster: false, size: 1, edgeRing: true });
    }

    const placements = [];
    const occupied = [];
    const used = new Map();
    /** pack → models chosen from it, so later layers keep to the same style. */
    this._packs = new Map();
    let fallbackCount = 0;
    const triangleBudget = 6_000_000;
    let triangles = 0;

    // Landmarks first, so the scatter steers around them.
    for (const mark of plan.landmarks) {
      const [model, isFallback] = this._choose(mark.category, plan.themes, mark.keywords, 1, rng);
      if (!model) continue;
      fallbackCount += isFallback ? 1 : 0;
      const angle = { north: 0, northeast: 0.25, east: 0.5, southeast: 0.75, south: 1, southwest: 1.25, west: 1.5, northwest: 1.75 }[mark.direction] * Math.PI;
      // A landmark is a set piece to look at, never something in the fight:
      // "arena" means as close as the boundary, not inside it.
      const distance = { arena: 32, edge: 38, far: 70 + rng() * 25 }[mark.distance];
      const x = Math.sin(angle) * distance;
      const z = -Math.cos(angle) * distance;
      const range = CATEGORIES[mark.category]?.size ?? [2, 6];
      // Impressive, but scaled to how far away it stands: about half its distance at most.
      const scale = this._capFootprint(
        model,
        this._scaleFor(model, [range[1] * 1.2, range[1] * 2], rng),
        mark.category,
        mark.distance === 'far' ? 'far' : 'outskirts',
        distance * 0.45
      );
      placements.push({ model, x, z, y: this._height(x, z), yaw: Math.atan2(-x, -z), scale, landmark: true });
      occupied.push({ x, z, r: this._footprint(model, scale) });
      used.set(model.id, model);
    }

    for (const layer of layers) {
      const zone = ZONES[layer.zone] ?? ZONES.outskirts;
      const variety = layer.zone === 'far' || layer.zone === 'outskirts' ? 6 : 4;
      const models = [];
      for (let i = 0; i < variety; i++) {
        const [model, isFallback] = this._choose(layer.category, plan.themes, layer.keywords, variety, rng, models);
        if (!model) break;
        if (isFallback) {
          fallbackCount++;
          models.push(model);
          break;
        }
        models.push(model);
      }
      if (!models.length) continue;

      const base = BASE_COUNT[layer.category]?.[layer.zone] ?? 10;
      let count = Math.round(base * layer.density);
      const avgTris = models.reduce((s, m) => s + (m.triangles || 500), 0) / models.length;
      count = Math.min(count, Math.floor((triangleBudget - triangles) / Math.max(1, avgTris)));
      if (count <= 0) continue;

      const range = CATEGORIES[layer.category]?.size ?? [1, 3];
      const sizeRange = [range[0] * (layer.size ?? 1), range[1] * (layer.size ?? 1)];
      const blocking = BLOCKING.has(layer.category);
      const centres = layer.cluster
        ? Array.from({ length: Math.max(2, Math.round(count / 12)) }, () => this._randomInZone(zone, rng))
        : null;

      let placed = 0;
      for (let attempt = 0; attempt < count * 8 && placed < count; attempt++) {
        let x, z;
        if (layer.edgeRing && layer.category === 'wall') {
          // A wall is a ring: march around the boundary, tangent to it.
          const a = (placed / count) * Math.PI * 2 + rng() * 0.02;
          const r = zone[0] + 0.5;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
        } else if (centres) {
          const c = centres[Math.floor(rng() * centres.length)];
          const spread = (zone[1] - zone[0]) * 0.18 + 2;
          x = c.x + (rng() + rng() - 1) * spread;
          z = c.z + (rng() + rng() - 1) * spread;
        } else {
          ({ x, z } = this._randomInZone(zone, rng));
        }
        const r = Math.hypot(x, z);
        if (r < zone[0] - 0.5 || r > zone[1] + 0.5) continue;
        if (blocking && r > SPAWN_BAND[0] && r < SPAWN_BAND[1]) continue;
        if (blocking && r < ZONES.arena[0] - 0.5) continue;

        const model = models[Math.floor(rng() * models.length)];
        const scale = this._capFootprint(model, this._scaleFor(model, sizeRange, rng), layer.category, layer.zone);
        const footprint = this._footprint(model, scale);
        if (blocking && occupied.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + footprint * 0.8) ** 2)) continue;

        const tangent = Math.atan2(x, z) + Math.PI / 2;
        const yaw =
          layer.category === 'wall' && layer.edgeRing ? tangent
          : layer.category === 'building' || layer.category === 'structure' ? Math.atan2(-x, -z) + (rng() - 0.5) * 0.5
          : rng() * Math.PI * 2;
        const sink = layer.category === 'rock' || layer.category === 'cliff' ? model.size[1] * scale * 0.12 : 0.02;
        placements.push({ model, x, z, y: this._height(x, z) - sink, yaw, scale });
        if (blocking) occupied.push({ x, z, r: footprint });
        used.set(model.id, model);
        triangles += model.triangles || 500;
        placed++;
      }
    }

    this._planFallbacks = fallbackCount;
    return normalizeLevel({
      ...base,
      name: base.name ?? plan.name,
      world: { ground: plan.ground, relief: plan.relief, edge: plan.edge, timeOfDay: plan.timeOfDay, fog: plan.fog, seed, terrain: {} },
      objects: placements.map((p) => ({
        model: p.model.id,
        category: p.model.category,
        x: +p.x.toFixed(3),
        z: +p.z.toFixed(3),
        yOffset: +(p.y - this._height(p.x, p.z)).toFixed(3),
        yaw: +p.yaw.toFixed(4),
        scale: +p.scale.toFixed(4)
      }))
    });
  }

  /** The library model a level object refers to, or a stand-in for its category. */
  resolveModel(object) {
    const model = this.catalog.get(object.model);
    if (model) return model;
    const category = object.model.startsWith('procedural/') ? object.model.slice('procedural/'.length) : object.category;
    return this._fallbackModel(CATEGORIES[category] ? category : 'misc');
  }

  /**
   * Build a level: terrain (base relief + hand edits), atmosphere, every
   * object as GPU instances, and colliders for the fight.
   */
  async buildLevel(level, { onProgress } = {}) {
    this.clear();
    this.level = level;
    const world = level.world;
    onProgress?.(0.1, 'Shaping the land…');
    this.terrain.setup({ ground: world.ground, relief: world.relief, seed: world.seed });
    this.terrain.load(world.terrain);
    await this.terrain.build();
    this.group.add(this.terrain.mesh);
    this._applyAtmosphere(world);

    const placements = level.objects.map((o) => {
      const model = this.resolveModel(o);
      return { model, x: o.x, z: o.z, y: this.terrain.heightAt(o.x, o.z) + o.yOffset, yaw: o.yaw, scale: o.scale };
    });
    const used = new Map(placements.map((p) => [p.model.id, p.model]));

    onProgress?.(0.5, `Loading ${used.size} models…`);
    this._instances = await this.library.instantiate(placements, { shadowRadius: 40 });
    this.group.add(this._instances);

    // Colliders for everything blocking inside (or right at) the playable disc.
    this.obstacles.length = 0;
    this.obstacles.push(...ComposedWorld.colliders(placements));

    this.stats = {
      placements: placements.length,
      models: used.size,
      fallbacks: 0,
      fromLibrary: [...used.values()].filter((m) => !m.procedural).length,
      packs: [...new Set([...used.values()].filter((m) => !m.procedural).map((m) => m.pack))],
      groundMaterial: this.terrain.groundMaterialId
    };
    onProgress?.(1, 'Ready');
    return this.stats;
  }

  /** Circles the monsters and the caster walk around. */
  static colliders(placements) {
    const limit = settings.ruins.wallRadius + 2;
    const out = [];
    for (const p of placements) {
      if (!BLOCKING.has(p.model.category)) continue;
      const footprint = (Math.max(p.model.size[0], p.model.size[2]) * p.scale) / 2;
      if (Math.hypot(p.x, p.z) - footprint > limit) continue;
      const radius = p.model.category === 'tree' ? Math.min(0.7, 0.12 * p.model.size[1] * p.scale) : footprint * 0.85;
      if (radius < 0.3) continue;
      out.push({ x: p.x, z: p.z, radius });
    }
    return out;
  }

  /* -------------------------------------------------------------------- */

  _choose(category, themes, keywords, count, rng, exclude = []) {
    const excludeIds = new Set(exclude.map((m) => m.id));
    const options = this.catalog.query({
      category,
      themes,
      keywords,
      rigged: false,
      maxTriangles: category === 'plant' ? 6_000 : category === 'tree' ? 60_000 : 120_000,
      exclude: excludeIds,
      preferPacks: this._packs
    });
    if (options.length) {
      const head = options.slice(0, Math.max(count * 2, 8));
      const model = head[Math.floor(rng() * head.length)];
      this._packs?.set(model.pack, (this._packs.get(model.pack) ?? 0) + 1);
      return [model, false];
    }
    if (exclude.length) return [null, false];
    return [this._fallbackModel(category), true];
  }

  _scaleFor(model, [lo, hi], rng) {
    const height = Math.max(0.01, model.size[1]);
    const target = lo + (hi - lo) * rng();
    // Real-world-scaled photoscans already inside the range keep their size.
    if (model.source === 'polyhaven' && height >= lo && height <= hi) return 0.85 + rng() * 0.3;
    // Flat things (tiles, rugs) are sized by their footprint instead.
    const flat = height < Math.max(model.size[0], model.size[2]) * 0.15;
    return flat ? (2 + rng() * 2) / Math.max(model.size[0], model.size[2], 0.01) : target / height;
  }

  /**
   * Keep the widest side inside the category's cap and the height inside the
   * zone's — both growing toward the skyline. Without the height cap a tall,
   * thin model sized by its category (a 40 m "mountain" cone) parks itself
   * between the camera and the fight.
   */
  _capFootprint(model, scale, category, zone, maxHeight = ZONE_MAX_HEIGHT[zone] ?? 18) {
    const cap = (CATEGORIES[category]?.footprint ?? 6) * ({ far: 2.5, outskirts: 1.5, edge: 1.2 }[zone] ?? 1);
    const inFight = zone === 'arena' || zone === 'center';
    const limit = inFight ? Math.min(cap, 4) : cap;
    const widest = Math.max(model.size[0], model.size[2], 0.001) * scale;
    let capped = widest > limit ? scale * (limit / widest) : scale;
    return Math.min(capped, maxHeight / Math.max(model.size[1], 0.001));
  }

  _footprint(model, scale) {
    return (Math.max(model.size[0], model.size[2]) * scale) / 2;
  }

  _randomInZone([r0, r1], rng) {
    // Uniform over the annulus, not over the radius.
    const r = Math.sqrt(r0 * r0 + rng() * (r1 * r1 - r0 * r0));
    const a = rng() * Math.PI * 2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }

  /* -------------------------------------------------------------------- */
  /* Terrain                                                               */
  /* -------------------------------------------------------------------- */

  _applyAtmosphere(world) {
    const env = settings.environment;
    if (this._envBackup) Object.assign(env, this._envBackup);
    const preset = TIME_PRESETS[world.timeOfDay] ?? {};
    this._envBackup = Object.fromEntries(
      [...Object.keys(preset), 'fogNear', 'fogFar', 'fogEnabled'].map((key) => [key, env[key]])
    );
    Object.assign(env, preset);
    env.fogEnabled = true;
    // fog 0 → clear to the horizon, 1 → pea soup past the edge ring.
    env.fogNear = 60 - world.fog * 45;
    env.fogFar = 260 - world.fog * 190;
  }

  /* -------------------------------------------------------------------- */
  /* Procedural stand-ins, for categories the library has nothing for      */
  /* -------------------------------------------------------------------- */

  _fallbackModel(category) {
    if (this._fallbacks.has(category)) return this._fallbacks.get(category);
    const build = FALLBACK_BUILDERS[category] ?? FALLBACK_BUILDERS.misc;
    const parts = build();
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const part of parts) {
      part.geometry.computeBoundingBox();
      const bb = part.geometry.boundingBox;
      ['x', 'y', 'z'].forEach((k, i) => {
        box.min[i] = Math.min(box.min[i], bb.min[k]);
        box.max[i] = Math.max(box.max[i], bb.max[k]);
      });
    }
    const model = {
      id: `procedural/${category}`,
      name: `${category} (procedural)`,
      category,
      themes: [],
      size: box.max.map((v, i) => v - box.min[i]),
      min: box.min,
      triangles: parts.reduce((s, p) => s + (p.geometry.index ? p.geometry.index.count : p.geometry.getAttribute('position').count) / 3, 0),
      procedural: true,
      source: 'procedural',
      pack: 'procedural'
    };
    this.library.cache.set(model.id, Promise.resolve({ parts: parts.map((p) => ({ ...p, matrix: new Matrix4() })) }));
    this._fallbacks.set(category, model);
    return model;
  }

  /* -------------------------------------------------------------------- */
  /* Ruins-compatible surface                                               */
  /* -------------------------------------------------------------------- */

  heightAt(x, z) {
    return this.terrain.heightAt(x, z);
  }

  breakProp() {
    return false;
  }

  restoreProps() {}

  update() {}

  clear() {
    if (this._instances) this.library.release(this._instances);
    this._instances = null;
    this.terrain.mesh?.removeFromParent();
    if (this._envBackup) Object.assign(settings.environment, this._envBackup);
    this._envBackup = null;
    this.obstacles.length = 0;
    this.stats = null;
    this.level = null;
  }

  dispose() {
    this.clear();
    this.terrain.dispose();
    this.group.removeFromParent();
  }
}

/* ---------------------------------------------------------------------- */

const mat = (color, roughness = 0.9) => new MeshStandardMaterial({ color, roughness, metalness: 0 });
const merged = (geoms) => mergeGeometries(geoms.map((g) => g.toNonIndexed()));
const at = (geometry, x, y, z) => geometry.translate(x, y, z);

/** Low-poly placeholders, so a plan still builds before the library is downloaded. */
const FALLBACK_BUILDERS = {
  tree: () => [
    { geometry: at(new CylinderGeometry(0.18, 0.26, 2.2, 7), 0, 1.1, 0), material: mat('#5a4030') },
    { geometry: merged([at(new ConeGeometry(1.6, 3.2, 8), 0, 3.4, 0), at(new ConeGeometry(1.2, 2.6, 8), 0, 4.8, 0)]), material: mat('#2f5a33') }
  ],
  bush: () => [{ geometry: at(new IcosahedronGeometry(0.8, 1), 0, 0.6, 0), material: mat('#3c6a38') }],
  plant: () => [{ geometry: at(new ConeGeometry(0.12, 0.6, 5), 0, 0.3, 0), material: mat('#5b8a3e') }],
  rock: () => [{ geometry: at(new DodecahedronGeometry(1, 0), 0, 0.7, 0), material: mat('#6a6560') }],
  cliff: () => [{ geometry: at(new IcosahedronGeometry(6, 1).scale(1.2, 1.6, 1), 0, 8, 0), material: mat('#5d5853') }],
  building: () => [
    { geometry: at(new BoxGeometry(6, 6, 6), 0, 3, 0), material: mat('#8a8278') },
    { geometry: at(new ConeGeometry(4.6, 3, 4).rotateY(Math.PI / 4), 0, 7.5, 0), material: mat('#6a3a30') }
  ],
  wall: () => [{ geometry: at(new BoxGeometry(4, 2.6, 0.6), 0, 1.3, 0), material: mat('#77716a') }],
  ruin: () => [{ geometry: at(new CylinderGeometry(0.45, 0.5, 3.2, 10), 0, 1.6, 0), material: mat('#8a8580') }],
  structure: () => [{ geometry: at(new BoxGeometry(3, 3, 3), 0, 1.5, 0), material: mat('#7a6a58') }],
  prop: () => [{ geometry: at(new BoxGeometry(0.9, 0.9, 0.9), 0, 0.45, 0), material: mat('#8a6a48') }],
  light: () => [
    { geometry: at(new CylinderGeometry(0.06, 0.08, 2.4, 6), 0, 1.2, 0), material: mat('#333333') },
    { geometry: at(new IcosahedronGeometry(0.2, 0), 0, 2.5, 0), material: new MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffb050', emissiveIntensity: 2 }) }
  ],
  misc: () => [{ geometry: at(new BoxGeometry(1, 1, 1), 0, 0.5, 0), material: mat('#777777') }]
};
