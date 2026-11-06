import {
  BoxGeometry,
  CylinderGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3
} from 'three';

import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { makeRandom, randomHelpers, clamp } from '../utils/math.js';
import { createAsteroidGeometry } from '../assets/ProceduralGeometry.js';
import { LAYER } from '../core/Layers.js';
import { disposeObject } from '../utils/dispose.js';
import { noiseGLSL } from '../shaders/lib/noise.glsl.js';

const _dummy = new Object3D();
const _matrix = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _color = new Color();
const _axisY = new Vector3(0, 1, 0);
const _axisX = new Vector3(1, 0, 0);
const _tilt = new Quaternion();

/**
 * The arena: a dead keep the fight happens inside.
 *
 * Everything here is generated from `settings.ruins.seed` — a broken curtain
 * wall, corner towers, a collapsed arcade, rubble fields, hanging banners and
 * lit braziers — and none of it costs an asset download. The reason it is
 * generated rather than modelled is not thrift: the arena has to *know* its own
 * shape, because monsters path around it and abilities break parts of it, and a
 * mesh from a file knows nothing about either.
 *
 * Draw calls are the whole design constraint. Six hundred stone blocks would be
 * six hundred draws as separate meshes; here they are **one** `InstancedMesh`
 * with per-instance colour, and the rocks, pillars and merlons are one each.
 * The entire keep costs roughly eight draws.
 *
 * Two things are deliberately *not* instanced: braziers (a handful, each with
 * its own emissive core and a particle emitter) and destructible props (barrels
 * and crates, which need to move and vanish individually). Both are small sets.
 *
 * The exclusion zone matters as much as the geometry: nothing is ever placed
 * inside `innerRadius`, so the caster always has a clean stage and no ability
 * ever has to resolve a collision against a wall it was cast through.
 */
export class Ruins {
  /**
   * @param {import('./Environment.js').Environment} environment
   * @param {{ particles?: import('../particles/ParticleEngine.js').ParticleEngine }} [context]
   */
  constructor(environment, context = {}) {
    this.environment = environment;
    this.ctx = context;

    this.group = new Group();
    this.group.name = 'Ruins';

    /** Destructible barrels/crates — `Combat` queries these. */
    this.props = [];
    /** Brazier flames, updated each frame for their flicker. */
    this.braziers = [];
    /** Cloth that sways in the vertex shader; needs a time uniform each frame. */
    this._clothUniforms = [];

    this._elapsed = 0;
    this._built = false;
    this._meshes = [];

    /** Cylinders the monsters steer around, `{x, z, radius}`. */
    this.obstacles = [];

    this._stone = this._createStoneMaterial();
    this._metal = new MeshStandardMaterial({
      color: 0x2a2d34,
      roughness: 0.55,
      metalness: 0.75
    });
    this._wood = new MeshStandardMaterial({ color: 0x4a3628, roughness: 0.92, metalness: 0 });
    this._ember = new MeshStandardMaterial({
      color: 0x140a06,
      emissive: getColor(settings.ruins.accentColor).clone(),
      emissiveIntensity: 3.2,
      roughness: 0.6,
      toneMapped: true
    });
  }

  /* ------------------------------------------------------------------ */
  /* materials                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * The keep's stone.
   *
   * The instance colours give each block its own value, but a flat tint on a box
   * still reads as a box. The patch adds two things the silhouette cannot: a
   * world-space grime gradient that darkens everything toward the floor (so the
   * wall looks like it has been standing in mud for a century), and a fine
   * fracture noise that breaks the specular up along the top edges.
   */
  _createStoneMaterial() {
    const material = new MeshStandardMaterial({
      color: getColor(settings.ruins.stoneColor).clone(),
      roughness: 0.95,
      metalness: 0.0,
      dithering: true
    });
    // Weak normals for the same reason the roughness below is floored: these
    // blocks are small on screen and mostly far away.
    material.normalScale = new Vector2(settings.ruins.stoneNormal, settings.ruins.stoneNormal);

    this.environment.registerShadowCasterWithPatch(material, (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRuinWorld;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vRuinWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vRuinWorld;\n${noiseGLSL}`
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           {
             // Grime rising off the floor, plus a slow macro variation so two
             // blocks of the same instance colour never look stamped. Both are
             // low frequency on purpose — anything fine-grained here reads as
             // noise once the block is twenty metres away.
             float damp = smoothstep(2.2, 0.0, vRuinWorld.y);
             diffuseColor.rgb *= mix(1.0, 0.62, damp * 0.8);
             diffuseColor.rgb *= 0.88 + fbm3(vRuinWorld * 0.22) * 0.24;
             // Pale lichen catching the rim light on the upward faces.
             float lichen = smoothstep(0.55, 0.92, fbm3(vRuinWorld * 0.5 + 17.0));
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.40, 0.45, 0.39), lichen * 0.22);
           }`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           // Floored hard. A rough block that is one pixel wide still shades;
           // a *smooth* one throws a sub-pixel specular spark, and the post
           // chain's chromatic aberration turns every one of those into a
           // coloured speck. The keep is a hundred metres of small blocks, so
           // this is the difference between stone and glitter.
           roughnessFactor = clamp(roughnessFactor * (0.94 + fbm3(vRuinWorld * 0.7) * 0.12), 0.72, 1.0);`
        );
    });

    return material;
  }

  /**
   * Attach the floor's stone maps to the keep.
   *
   * The textures are cloned rather than shared: a clone reuses the same GPU
   * image but carries its own UV transform, so the wall can tile at a
   * block-sized repeat while the floor stays at its own scale.
   *
   * @param {Record<string, import('three').Texture>|null} textures from `Ground`
   */
  useStoneTextures(textures) {
    if (!textures) return;
    this._clonedTextures = [];
    for (const [slot, texture] of Object.entries(textures)) {
      const clone = texture.clone();
      clone.wrapS = RepeatWrapping;
      clone.wrapT = RepeatWrapping;
      clone.repeat.set(0.5, 0.5);
      clone.needsUpdate = true;
      this._stone[slot] = clone;
      this._clonedTextures.push(clone);
    }
    this._stone.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /* generation                                                          */
  /* ------------------------------------------------------------------ */

  /** Lay the keep out. Idempotent — a rebuild tears the old one down first. */
  build() {
    if (this._built) this._teardown();
    if (!settings.ruins.enabled) return this;

    const cfg = settings.ruins;
    const rng = randomHelpers(makeRandom(cfg.seed));

    // Two passes: the first collects every transform into plain arrays, the
    // second uploads them. Nothing is added to the scene per block.
    const blocks = [];
    const merlons = [];
    const rocks = [];
    const columns = [];

    this._buildCurtainWall(rng, blocks, merlons, columns);
    this._buildTowers(rng, blocks, merlons);
    this._buildArcade(rng, columns, blocks);
    this._buildRubble(rng, blocks, rocks);

    this._commit('Blocks', new BoxGeometry(1, 1, 1), blocks);
    this._commit('Merlons', new BoxGeometry(1, 1, 1), merlons);
    this._commit('Columns', new CylinderGeometry(0.5, 0.56, 1, 12, 1), columns);
    this._commit('Rubble', createAsteroidGeometry({ detail: 1, seed: cfg.seed, noise: 0.42 }), rocks);

    this._buildBraziers(rng);
    this._buildBanners(rng);
    this._buildProps(rng);

    this._built = true;
    return this;
  }

  /**
   * Push one transform onto a bucket.
   *
   * @param {Array} bucket
   * @param {number[]} position   world x,y,z
   * @param {number[]} scale      x,y,z metres
   * @param {number} yaw          radians
   * @param {number} [tilt]       radians of lean about x — a leaning stone
   * @param {number} [shade]      0..1 multiplier on the stone colour
   */
  _push(bucket, position, scale, yaw, tilt = 0, shade = 1) {
    bucket.push({ position, scale, yaw, tilt, shade });
  }

  /**
   * A broken curtain wall, laid course by course.
   *
   * The wall is built as real masonry — blocks of varying width with a stagger
   * per course — because a ruin only reads as a ruin where the courses come
   * apart. `height` is sampled from a low-frequency function of the angle so the
   * wall rises and collapses in long runs rather than block by block, and the
   * gaps are where a whole run has fallen through.
   */
  _buildCurtainWall(rng, blocks, merlons, columns) {
    const cfg = settings.ruins;
    const radius = cfg.wallRadius;
    const segments = Math.max(6, Math.round(cfg.wallSegments));
    const arcStep = (Math.PI * 2) / segments;

    for (let s = 0; s < segments; s++) {
      const angle = s * arcStep;
      // Long collapsed runs: two out of every seven segments are gone, chosen by
      // a smooth function of the angle so the holes are contiguous, not speckled.
      const standing = Math.sin(angle * 1.7 + 0.6) * 0.5 + Math.sin(angle * 0.9) * 0.5;
      if (standing < -0.35) continue;

      const courses = clamp(Math.round(3 + (standing + 1) * 2.8 + rng.range(-0.6, 0.9)), 1, 8);
      const segmentWidth = arcStep * radius;
      const COURSE = 0.8; // one course of masonry, metres

      for (let course = 0; course < courses; course++) {
        // The wall is eaten from the top down, so only the last two courses are
        // allowed to be missing blocks. Anything more and it stops reading as a
        // wall at all.
        const survives = course < courses - 2 ? 1 : course === courses - 2 ? 0.85 : 0.5;
        const count = Math.max(2, Math.round(segmentWidth / 1.5));
        const stagger = (course % 2) * 0.5;
        const slot = segmentWidth / count;

        for (let b = 0; b < count; b++) {
          if (!rng.chance(survives)) continue;
          // Blocks fill their whole slot and sit on an exact course line. All
          // the variation is pushed into *depth* and colour instead — a wall
          // with visible gaps between its stones is a pile, not a wall.
          const t = (b + 0.5 + stagger) / count - 0.5;
          const a = angle + t * arcStep;
          const r = radius + rng.range(-0.07, 0.07);
          const y = course * COURSE + COURSE * 0.5;

          this._push(
            blocks,
            [Math.cos(a) * r, y, Math.sin(a) * r],
            [slot * 1.02, COURSE * 1.01, rng.range(1.05, 1.4)],
            -a,
            0,
            rng.range(0.78, 1.12)
          );
        }
      }

      // Crenellations only survive on the tallest runs.
      if (courses >= 6) {
        const merlonCount = Math.max(2, Math.round(segmentWidth / 2.2));
        for (let m = 0; m < merlonCount; m++) {
          if (!rng.chance(0.6)) continue;
          const a = angle + ((m + 0.5) / merlonCount - 0.5) * arcStep * 0.9;
          this._push(
            merlons,
            [Math.cos(a) * radius, courses * 0.8 + 0.34, Math.sin(a) * radius],
            [rng.range(0.6, 0.85), rng.range(0.55, 0.8), 1.15],
            -a,
            0,
            rng.range(0.8, 1.1)
          );
        }
      }

      // Buttresses on the outside face, every few segments.
      if (s % 4 === 0 && courses >= 3) {
        const r = radius + 1.0;
        this._push(
          columns,
          [Math.cos(angle) * r, courses * 0.4, Math.sin(angle) * r],
          [0.95, courses * 0.8, 0.95],
          -angle,
          0,
          0.85
        );
      }

      this.obstacles.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        radius: segmentWidth * 0.5
      });
    }
  }

  /** Four drum towers on the diagonals, each collapsed to a different height. */
  _buildTowers(rng, blocks, merlons) {
    const cfg = settings.ruins;
    const radius = cfg.wallRadius;
    const count = Math.max(0, Math.round(cfg.towers));

    for (let t = 0; t < count; t++) {
      const angle = (t / count) * Math.PI * 2 + Math.PI / count;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const drumRadius = rng.range(2.4, 3.1);
      // One tower is always a stump and one is always tall — a ring of equal
      // towers reads as a fence, not a ruin.
      const courses = t === 0 ? rng.int(9, 12) : t === 2 ? rng.int(2, 4) : rng.int(5, 9);
      const ringBlocks = Math.max(8, Math.round((Math.PI * 2 * drumRadius) / 1.35));

      const COURSE = 0.8;
      for (let course = 0; course < courses; course++) {
        const survives = course < courses - 2 ? 1 : course === courses - 2 ? 0.8 : 0.45;
        const stagger = (course % 2) * 0.5;
        for (let b = 0; b < ringBlocks; b++) {
          if (!rng.chance(survives)) continue;
          const a = ((b + stagger) / ringBlocks) * Math.PI * 2;
          this._push(
            blocks,
            [cx + Math.cos(a) * drumRadius, course * COURSE + COURSE * 0.5, cz + Math.sin(a) * drumRadius],
            [((Math.PI * 2 * drumRadius) / ringBlocks) * 1.05, COURSE * 1.01, rng.range(1.0, 1.3)],
            -a,
            0,
            rng.range(0.75, 1.12)
          );
        }
      }

      if (courses > 5) {
        for (let m = 0; m < ringBlocks; m += 2) {
          if (!rng.chance(0.7)) continue;
          const a = (m / ringBlocks) * Math.PI * 2;
          this._push(
            merlons,
            [cx + Math.cos(a) * drumRadius, courses * COURSE + 0.34, cz + Math.sin(a) * drumRadius],
            [0.75, 0.7, 1.1],
            -a,
            0,
            rng.range(0.8, 1.1)
          );
        }
      }

      this.obstacles.push({ x: cx, z: cz, radius: drumRadius + 0.4 });
    }
  }

  /**
   * A collapsed arcade — the inner ring of columns.
   *
   * Roughly a third of them have gone over. A toppled column is the single most
   * legible "this was a building" cue there is, so the fallen ones are laid
   * flat with their drums scattered along the fall line rather than just tipped.
   */
  _buildArcade(rng, columns, blocks) {
    const cfg = settings.ruins;
    const count = Math.max(0, Math.round(cfg.pillars));
    const radius = cfg.arcadeRadius;

    for (let p = 0; p < count; p++) {
      const angle = (p / count) * Math.PI * 2 + rng.range(-0.06, 0.06);
      const r = radius + rng.range(-1.6, 1.6);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const fallen = rng.chance(0.34);

      if (!fallen) {
        const height = rng.range(3.2, 5.4);
        const drums = Math.max(3, Math.round(height / 0.9));
        for (let d = 0; d < drums; d++) {
          const drumHeight = height / drums;
          // Each drum leans a hair more than the one below it — the lean has to
          // accumulate or the column looks machined.
          this._push(
            columns,
            [x + rng.range(-0.04, 0.04) * d, d * drumHeight + drumHeight * 0.5, z + rng.range(-0.04, 0.04) * d],
            [rng.range(0.92, 1.02), drumHeight * 0.99, rng.range(0.92, 1.02)],
            rng.range(0, Math.PI),
            rng.range(-0.012, 0.012) * d,
            rng.range(0.85, 1.1)
          );
        }
        // A broken capital on the survivors.
        if (rng.chance(0.5)) {
          this._push(blocks, [x, height + 0.22, z], [1.5, 0.44, 1.5], angle, 0, 0.95);
        }
        this.obstacles.push({ x, z, radius: 0.75 });
      } else {
        // Drums strewn along the direction it fell.
        const fall = angle + rng.range(-0.8, 0.8);
        const dx = Math.cos(fall);
        const dz = Math.sin(fall);
        const drums = rng.int(3, 6);
        for (let d = 0; d < drums; d++) {
          const along = 0.9 + d * rng.range(1.0, 1.25);
          this._push(
            columns,
            [x + dx * along, rng.range(0.42, 0.55), z + dz * along],
            [rng.range(0.9, 1.05), rng.range(0.75, 1.1), rng.range(0.9, 1.05)],
            fall,
            Math.PI / 2 + rng.range(-0.12, 0.12),
            rng.range(0.7, 1.0)
          );
        }
        // The stump it broke off.
        this._push(columns, [x, 0.45, z], [1.02, 0.9, 1.02], rng.range(0, Math.PI), 0, 0.9);
      }
    }
  }

  /** Fallen masonry and boulders, thickest where the wall came down. */
  _buildRubble(rng, blocks, rocks) {
    const cfg = settings.ruins;
    const count = Math.max(0, Math.round(cfg.rubble));
    const inner = cfg.innerRadius * 1.15;
    const outer = cfg.outerRadius;

    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      // Biased outward — the middle of the arena stays clear to fight in.
      const r = inner + (outer - inner) * Math.sqrt(rng.range(0.02, 1));
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      if (rng.chance(0.55)) {
        const size = rng.range(0.35, 1.1);
        this._push(
          rocks,
          [x, size * 0.36, z],
          [size, size * rng.range(0.5, 0.8), size * rng.range(0.8, 1.2)],
          rng.range(0, Math.PI * 2),
          rng.range(-0.3, 0.3),
          rng.range(0.55, 0.95)
        );
      } else {
        this._push(
          blocks,
          [x, rng.range(0.16, 0.3), z],
          [rng.range(0.6, 1.4), rng.range(0.3, 0.55), rng.range(0.6, 1.2)],
          rng.range(0, Math.PI * 2),
          rng.range(-0.18, 0.18),
          rng.range(0.6, 1.0)
        );
      }
    }
  }

  /**
   * Upload one bucket as a single instanced draw.
   *
   * `instanceColor` carries the per-block value variation, which is what keeps
   * eight hundred identical boxes from looking like eight hundred identical
   * boxes without paying for eight hundred materials.
   */
  _commit(name, geometry, bucket) {
    if (!bucket.length) {
      geometry.dispose();
      return null;
    }

    const mesh = new InstancedMesh(geometry, this._stone, bucket.length);
    mesh.name = `Ruins:${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.set(LAYER.WORLD);
    // Instanced ruins are static; three would otherwise re-upload the matrices
    // and re-derive the bounds every frame.
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    const base = getColor(settings.ruins.stoneColor);
    for (let i = 0; i < bucket.length; i++) {
      const item = bucket[i];
      _position.set(item.position[0], item.position[1], item.position[2]);
      _quaternion.setFromAxisAngle(_axisY, item.yaw);
      if (item.tilt) _quaternion.multiply(_tilt.setFromAxisAngle(_axisX, item.tilt));
      _scale.set(item.scale[0], item.scale[1], item.scale[2]);
      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);
      _color.copy(base).multiplyScalar(item.shade);
      mesh.setColorAt(i, _color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();

    this.group.add(mesh);
    this._meshes.push(mesh);
    return mesh;
  }

  /* ------------------------------------------------------------------ */
  /* the lit dressing                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Braziers: the only warm light in a cold scene.
   *
   * They carry no `PointLight` — the six-light pool belongs to the abilities,
   * and adding lights at runtime recompiles every material in the scene. What
   * sells them instead is an emissive coal bed, an additive glow card and a
   * live ember emitter, all of which cost nothing in the light budget.
   */
  _buildBraziers(rng) {
    const cfg = settings.ruins;
    const count = Math.max(0, Math.round(cfg.braziers));
    // Just inside the clear stage: close enough to light the fight, far enough
    // that you never cast through one.
    const radius = cfg.innerRadius + 1.4;

    const bowlGeometry = new CylinderGeometry(0.52, 0.3, 0.42, 12, 1, true);
    const stemGeometry = new CylinderGeometry(0.1, 0.18, 1.1, 8);
    const footGeometry = new CylinderGeometry(0.34, 0.42, 0.16, 10);
    const coalGeometry = new SphereGeometry(0.34, 10, 8);
    const ringGeometry = new TorusGeometry(0.5, 0.05, 6, 16);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / count;
      const r = radius + rng.range(-1.2, 1.2);
      const brazier = new Group();
      brazier.name = `Brazier:${i}`;
      brazier.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      brazier.rotation.y = rng.range(0, Math.PI * 2);

      const foot = new Mesh(footGeometry, this._metal);
      foot.position.y = 0.08;
      const stem = new Mesh(stemGeometry, this._metal);
      stem.position.y = 0.63;
      const bowl = new Mesh(bowlGeometry, this._metal);
      bowl.position.y = 1.34;
      const ring = new Mesh(ringGeometry, this._metal);
      ring.position.y = 1.52;
      ring.rotation.x = Math.PI / 2;
      const coal = new Mesh(coalGeometry, this._ember);
      coal.position.y = 1.42;
      coal.scale.set(1, 0.55, 1);

      for (const part of [foot, stem, bowl, ring, coal]) {
        part.castShadow = true;
        part.receiveShadow = true;
        part.layers.set(LAYER.WORLD);
        brazier.add(part);
      }

      this.group.add(brazier);
      this.braziers.push({
        group: brazier,
        coal,
        position: new Vector3(brazier.position.x, 1.46, brazier.position.z),
        phase: rng.range(0, Math.PI * 2),
        rate: rng.range(0.85, 1.2)
      });
      this.obstacles.push({ x: brazier.position.x, z: brazier.position.z, radius: 0.55 });
    }
  }

  /**
   * Banners hanging off the wall.
   *
   * The sway is a vertex displacement rather than a simulation: a travelling
   * wave whose amplitude grows with distance from the hanging edge. That is
   * enough motion to make the scene feel alive, costs one uniform per banner,
   * and cannot tangle.
   */
  _buildBanners(rng) {
    const cfg = settings.ruins;
    const radius = cfg.wallRadius;
    const geometry = new PlaneGeometry(1.1, 2.4, 5, 10);

    // Hung only on the runs the wall actually survives on. `standing` is the
    // same function the wall itself is built from, so a banner can never end up
    // pinned to a hole.
    const spots = [];
    for (let i = 0; i < 24 && spots.length < 5; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const standing = Math.sin(angle * 1.7 + 0.6) * 0.5 + Math.sin(angle * 0.9) * 0.5;
      if (standing > 0.45) spots.push(angle);
    }

    for (const angle of spots) {
      // Dim, weathered cloth. A saturated banner in a scene lit this darkly
      // becomes the brightest thing on screen and steals the read from the
      // abilities, which is the one thing the palette here is protecting.
      const accent = getColor(cfg.accentColor).clone().multiplyScalar(0.18);

      const material = new MeshStandardMaterial({
        color: accent,
        roughness: 0.98,
        metalness: 0,
        side: DoubleSide // a banner is visible from behind the wall too
      });

      const uniforms = { uTime: { value: 0 }, uSway: { value: cfg.bannerSway } };
      this.environment.registerShadowCasterWithPatch(material, (shader) => {
        shader.uniforms.uTime = uniforms.uTime;
        shader.uniforms.uSway = uniforms.uSway;
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nuniform float uTime;\nuniform float uSway;'
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             // uv.y = 1 at the hanging edge; the free bottom moves most.
             float hang = 1.0 - uv.y;
             float wave = sin(uTime * 1.7 + uv.y * 5.0 + position.x * 2.3);
             transformed.z += wave * hang * hang * 0.22 * uSway;
             transformed.x += sin(uTime * 1.1 + uv.y * 3.0) * hang * 0.07 * uSway;`
          );
      });

      const banner = new Mesh(geometry, material);
      // Top edge just under the crenellations, face flat against the stone.
      banner.position.set(Math.cos(angle) * (radius - 0.78), 2.9, Math.sin(angle) * (radius - 0.78));
      banner.rotation.y = -angle + Math.PI / 2;
      banner.castShadow = false; // it hangs flat on the wall; its shadow is a stripe
      banner.receiveShadow = true;
      banner.layers.set(LAYER.WORLD);

      this.group.add(banner);
      this._clothUniforms.push(uniforms);
    }
  }

  /**
   * Barrels and crates — the parts of the level that break.
   *
   * They are the cheapest possible answer to "does the world react to me": no
   * physics, no persistence, just a body that takes a hit, splinters into the
   * shared particle systems and leaves the floor clear. `Combat` finds them
   * through `props`, exactly the way it finds monsters.
   */
  _buildProps(rng) {
    const cfg = settings.ruins;
    const count = Math.max(0, Math.round(cfg.props));
    const barrelGeometry = new CylinderGeometry(0.42, 0.36, 1.0, 12, 1);
    const crateGeometry = new BoxGeometry(0.85, 0.85, 0.85);
    const bandGeometry = new TorusGeometry(0.43, 0.04, 5, 14);

    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      // Props are the one thing allowed *just* inside the arena edge — you need
      // to be able to blow one up without walking to the wall.
      const r = rng.range(cfg.innerRadius * 0.65, cfg.wallRadius * 0.9);
      const barrel = rng.chance(0.6);

      const group = new Group();
      group.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      group.rotation.y = rng.range(0, Math.PI * 2);

      const body = new Mesh(barrel ? barrelGeometry : crateGeometry, this._wood);
      body.position.y = barrel ? 0.5 : 0.43;
      body.castShadow = true;
      body.receiveShadow = true;
      body.layers.set(LAYER.WORLD);
      group.add(body);

      if (barrel) {
        for (const y of [0.24, 0.76]) {
          const band = new Mesh(bandGeometry, this._metal);
          band.position.y = y;
          band.rotation.x = Math.PI / 2;
          band.castShadow = true;
          band.layers.set(LAYER.WORLD);
          group.add(band);
        }
      }

      this.group.add(group);
      this.props.push({
        group,
        kind: barrel ? 'barrel' : 'crate',
        position: new Vector3(group.position.x, 0.5, group.position.z),
        radius: barrel ? 0.55 : 0.6,
        health: barrel ? 1 : 20, // a barrel goes on the first hit; a crate takes a beating
        alive: true,
        /** Barrels cook off — that secondary blast is the reason to shoot one. */
        explosive: barrel
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* runtime                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Break a prop. Returns the description `Combat` needs to dress the kill.
   * @returns {{position: Vector3, explosive: boolean, kind: string}|null}
   */
  breakProp(prop) {
    if (!prop?.alive) return null;
    prop.alive = false;
    prop.group.visible = false;
    return { position: prop.position, explosive: prop.explosive, kind: prop.kind };
  }

  /** Put every broken prop back — used by "clear effects". */
  restoreProps() {
    for (const prop of this.props) {
      prop.alive = true;
      prop.health = prop.kind === 'barrel' ? 1 : 20;
      prop.group.visible = true;
    }
  }

  update(dt, elapsed) {
    this._elapsed = elapsed;

    for (const uniforms of this._clothUniforms) {
      uniforms.uTime.value = elapsed;
      uniforms.uSway.value = settings.ruins.bannerSway;
    }

    if (!this.braziers.length) return;

    // One shared emissive material for every coal bed, so the flicker is one
    // assignment rather than one per brazier; the per-brazier phase lives in the
    // scale of the coal instead, which costs nothing.
    const glow = settings.ruins.brazierGlow;
    this._ember.emissive.copy(getColor(settings.ruins.accentColor));

    const particles = this.ctx.particles;
    for (const brazier of this.braziers) {
      const flicker =
        0.75 +
        0.25 * Math.sin(elapsed * 6.1 * brazier.rate + brazier.phase) +
        0.12 * Math.sin(elapsed * 17.3 * brazier.rate + brazier.phase * 2.3);
      brazier.coal.scale.set(1, 0.5 + flicker * 0.16, 1);
      brazier.flicker = flicker;
    }
    this._ember.emissiveIntensity = 2.6 * glow;

    if (!particles || dt <= 0) return;
    this._emberAccumulator = (this._emberAccumulator ?? 0) + dt;
    // Embers are ambience — 12 Hz across all braziers is plenty and keeps the
    // shared pool free for the abilities that actually need it.
    if (this._emberAccumulator < 1 / 12) return;
    this._emberAccumulator = 0;

    const system = particles.get('ruin-embers', {
      capacity: 900,
      additive: true,
      curl: true,
      stretch: false
    });
    const tint = getColor(settings.ruins.accentColor);
    for (const brazier of this.braziers) {
      system.emit(2, {
        position: brazier.position,
        radius: 0.22,
        direction: new Vector3(0, 1, 0),
        speed: 0.9 * (brazier.flicker ?? 1),
        speedVariance: 0.6,
        spread: 0.35,
        size: 0.09,
        sizeVariance: 0.5,
        life: 1.6,
        lifeVariance: 0.4,
        tint,
        time: elapsed
      });
    }
  }

  /* ------------------------------------------------------------------ */

  _teardown() {
    for (const mesh of this._meshes) {
      mesh.geometry.dispose();
      this.group.remove(mesh);
    }
    this._meshes.length = 0;
    this.props.length = 0;
    this.braziers.length = 0;
    this.obstacles.length = 0;
    this._clothUniforms.length = 0;
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const child = this.group.children[i];
      this.group.remove(child);
      disposeObject(child);
    }
    this._built = false;
  }

  dispose() {
    this._teardown();
    this._stone.dispose();
    this._metal.dispose();
    this._wood.dispose();
    this._ember.dispose();
    for (const texture of this._clonedTextures ?? []) texture.dispose();
    this.group.parent?.remove(this.group);
  }
}
