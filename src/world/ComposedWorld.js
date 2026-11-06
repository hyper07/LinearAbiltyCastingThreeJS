import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { settings } from '../config/settings.js';
import { CATEGORIES } from '../library/categories.js';

/**
 * A battlefield assembled from the asset library to a `MapPlan`.
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
const TERRAIN_RADIUS = 170;

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

const SURFACE_COLORS = {
  grass: ['#3f5a2c', '#56703a'], snow: ['#d9e2ec', '#f2f6fa'], sand: ['#b89a68', '#d1b984'],
  rock: ['#5d5a57', '#77736e'], dirt: ['#5a4535', '#715a45'], mud: ['#3d3125', '#52412f'],
  gravel: ['#6e6962', '#8a847b'], moss: ['#44592f', '#5b7140'], ice: ['#a9c8dc', '#cfe4f1'],
  lava: ['#2a1d18', '#3c2620'], paving: ['#5f5c57', '#77736c'], asphalt: ['#2f3135', '#3d4045']
};

/** Overrides for `settings.environment`, restored when the map is disposed. */
const TIME_PRESETS = {
  dawn: { backgroundColor: '#6f7f98', fogColor: '#8a8fa0', sunColor: '#ffc89a', sunIntensity: 2.2, sunElevation: 0.18, ambientIntensity: 0.3, hemiIntensity: 0.6, hemiSkyColor: '#ffd9c0', hemiGroundColor: '#4a4a52', envIntensity: 0.5 },
  day: { backgroundColor: '#9fbad6', fogColor: '#b4c6d8', sunColor: '#fff6e8', sunIntensity: 3.2, sunElevation: 0.85, ambientIntensity: 0.45, hemiIntensity: 0.8, hemiSkyColor: '#cfe3ff', hemiGroundColor: '#5a5448', envIntensity: 0.7 },
  dusk: { backgroundColor: '#3a3048', fogColor: '#5a4458', sunColor: '#ff9a62', sunIntensity: 2.0, sunElevation: 0.12, ambientIntensity: 0.25, hemiIntensity: 0.5, hemiSkyColor: '#ffb08a', hemiGroundColor: '#3a3040', envIntensity: 0.45 },
  night: {}
};

/* ---------------------------------------------------------------------- */
/* Seeded noise                                                            */
/* ---------------------------------------------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const base = Array.from({ length: 256 }, (_, i) => i).sort(() => rng() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const grad = (h, x, y) => ((h & 1 ? -x : x) + (h & 2 ? -y : y));
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1], ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return x1 + v * (x2 - x1); // ~[-1, 1]
  };
  return (x, y, octaves = 4, ridged = false) => {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      let n = noise(x * freq, y * freq);
      if (ridged) n = 1 - Math.abs(n) * 1.6;
      sum += n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
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
    this.stats = null;
    this._envBackup = null;
    this._instances = null;
    this._terrain = null;
    this._fallbacks = new Map();
  }

  /**
   * @param {import('./MapPlan.js').normalizePlan extends (...a: any) => infer R ? R : never} plan
   * @param {{ seed?: number, onProgress?: (fraction: number, label: string) => void }} [options]
   */
  async build(plan, { seed = (Math.random() * 1e9) | 0, onProgress } = {}) {
    this.clear();
    this.plan = plan;
    this._groundMaterial = null;
    const rng = mulberry32(seed);
    const fbm = makeNoise(seed ^ 0x5bd1e995);
    this._height = this._heightField(plan.relief, fbm);

    onProgress?.(0.1, 'Shaping the land…');
    this._terrain = await this._buildTerrain(plan, fbm, rng);
    this.group.add(this._terrain);
    this._applyAtmosphere(plan);

    onProgress?.(0.3, 'Choosing models…');
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

    onProgress?.(0.5, `Loading ${used.size} models…`);
    this._instances = await this.library.instantiate(placements, { shadowRadius: 40 });
    this.group.add(this._instances);

    // Colliders for everything blocking inside (or right at) the playable disc.
    const limit = settings.ruins.wallRadius + 2;
    for (const p of placements) {
      if (!BLOCKING.has(p.model.category) && !p.landmark) continue;
      if (Math.hypot(p.x, p.z) - this._footprint(p.model, p.scale) > limit) continue;
      const radius = p.model.category === 'tree' ? Math.min(0.7, 0.12 * p.model.size[1] * p.scale) : this._footprint(p.model, p.scale) * 0.85;
      if (radius < 0.3) continue;
      this.obstacles.push({ x: p.x, z: p.z, radius });
    }

    this.stats = {
      placements: placements.length,
      models: used.size,
      fallbacks: fallbackCount,
      triangles,
      fromLibrary: [...used.values()].filter((m) => !m.procedural).length,
      packs: [...new Set([...used.values()].filter((m) => !m.procedural).map((m) => m.pack))],
      groundMaterial: this._groundMaterial ?? null
    };
    onProgress?.(1, 'Ready');
    return this.stats;
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

  _heightField(relief, fbm) {
    const flat = settings.ruins.wallRadius + 3;
    const shapes = {
      flat: { amp: 0.8, rise: 40, ridged: false },
      hills: { amp: 9, rise: 50, ridged: false },
      mountains: { amp: 46, rise: 90, ridged: true },
      canyon: { amp: 24, rise: 9, ridged: false, plateau: true },
      valley: { amp: 18, rise: 110, ridged: false }
    };
    const s = shapes[relief] ?? shapes.hills;
    return (x, z) => {
      const r = Math.hypot(x, z);
      if (r <= flat) return 0;
      const t = smoothstep(flat, flat + s.rise, r);
      let n = fbm(x * 0.018, z * 0.018, 5, s.ridged);
      n = s.ridged ? Math.max(0, n) ** 1.6 : 0.5 + 0.5 * n;
      let h = t * s.amp * (0.35 + 0.65 * n);
      if (s.plateau) h = t * s.amp * (0.85 + 0.15 * n);
      // Mountains keep rising toward the horizon so the skyline is not a wall of equal peaks.
      if (relief === 'mountains') h *= 0.6 + 0.6 * smoothstep(flat, TERRAIN_RADIUS, r);
      return h;
    };
  }

  async _buildTerrain(plan, fbm, rng) {
    const rings = 110;
    const segments = 180;
    const positions = [0, 0, 0];
    const colors = [];
    const uvs = [0, 0];
    const [lowColor, highColor] = (SURFACE_COLORS[plan.ground] ?? SURFACE_COLORS.dirt).map((c) => new Color(c));
    const rockColor = new Color(SURFACE_COLORS.rock[0]);
    const snowColor = new Color(SURFACE_COLORS.snow[1]);
    const tmp = new Color();
    const pushColor = (x, z, h) => {
      const n = 0.5 + 0.5 * fbm(x * 0.09, z * 0.09, 3);
      tmp.copy(lowColor).lerp(highColor, n);
      if (h > 4) tmp.lerp(rockColor, smoothstep(4, 22, h) * 0.85);
      if (plan.ground === 'snow' || (plan.relief === 'mountains' && h > 28)) tmp.lerp(snowColor, smoothstep(plan.ground === 'snow' ? 0 : 28, 40, h));
      colors.push(tmp.r, tmp.g, tmp.b);
    };
    pushColor(0, 0, 0);
    for (let i = 1; i <= rings; i++) {
      const r = TERRAIN_RADIUS * (i / rings) ** 1.7;
      for (let j = 0; j < segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = this._height(x, z);
        positions.push(x, h, z);
        uvs.push(x / 11, z / 11);
        pushColor(x, z, h);
      }
    }
    const index = [];
    for (let j = 0; j < segments; j++) index.push(0, 1 + ((j + 1) % segments), 1 + j);
    for (let i = 1; i < rings; i++) {
      const a0 = 1 + (i - 1) * segments;
      const b0 = 1 + i * segments;
      for (let j = 0; j < segments; j++) {
        const j1 = (j + 1) % segments;
        index.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();

    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const surface = this.catalog.material(plan.ground, rng);
    if (surface?.maps?.color) {
      const loader = new TextureLoader();
      const load = async (file, srgb) => {
        if (!file) return null;
        try {
          const texture = await loader.loadAsync(this.catalog.url(file));
          texture.wrapS = texture.wrapT = RepeatWrapping;
          texture.anisotropy = 8;
          if (srgb) texture.colorSpace = SRGBColorSpace;
          return texture;
        } catch {
          return null;
        }
      };
      const [map, normalMap, roughnessMap] = await Promise.all([
        load(surface.maps.color, true),
        load(surface.maps.normal, false),
        load(surface.maps.roughness, false)
      ]);
      if (map) {
        material.map = map;
        material.normalMap = normalMap;
        material.roughnessMap = roughnessMap;
        // Vertex colours become a tint over the photo texture, not the colour itself.
        const c = geometry.getAttribute('color');
        for (let i = 0; i < c.count; i++) {
          c.setXYZ(i, 0.35 + c.getX(i) * 1.1, 0.35 + c.getY(i) * 1.1, 0.35 + c.getZ(i) * 1.1);
        }
        this._groundMaterial = surface.id;
      }
    }
    const mesh = new Mesh(geometry, material);
    mesh.name = 'composed-terrain';
    mesh.receiveShadow = true;
    // Sits a hair under the ground effects (decals, burns) that draw at y ≈ 0.
    mesh.position.y = -0.005;
    return mesh;
  }

  _applyAtmosphere(plan) {
    const env = settings.environment;
    const preset = TIME_PRESETS[plan.timeOfDay] ?? {};
    this._envBackup = Object.fromEntries(
      [...Object.keys(preset), 'fogNear', 'fogFar', 'fogEnabled'].map((key) => [key, env[key]])
    );
    Object.assign(env, preset);
    env.fogEnabled = true;
    // fog 0 → clear to the horizon, 1 → pea soup past the edge ring.
    env.fogNear = 60 - plan.fog * 45;
    env.fogFar = 260 - plan.fog * 190;
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
    return this._height ? this._height(x, z) : 0;
  }

  breakProp() {
    return false;
  }

  restoreProps() {}

  update() {}

  clear() {
    if (this._instances) this.library.release(this._instances);
    this._instances = null;
    if (this._terrain) {
      this._terrain.geometry.dispose();
      const m = this._terrain.material;
      for (const t of [m.map, m.normalMap, m.roughnessMap]) t?.dispose();
      m.dispose();
      this._terrain.removeFromParent();
    }
    this._terrain = null;
    if (this._envBackup) Object.assign(settings.environment, this._envBackup);
    this._envBackup = null;
    this.obstacles.length = 0;
    this.stats = null;
  }

  dispose() {
    this.clear();
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
