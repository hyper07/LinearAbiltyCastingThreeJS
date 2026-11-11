import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry
} from 'three';

import { getColor } from '../utils/color.js';
import { LAYER } from '../core/Layers.js';
import { noiseGLSL } from '../shaders/lib/noise.glsl.js';
import { collapseJoints, glowPart, instantiate, joint, part, trim } from './RigKit.js';
import { assembleDragon, buildDragonGeometry } from './DragonBuilder.js';

/**
 * Bodies for the things that come at you.
 *
 * There is exactly one rigged character in this project and it is the player, so
 * the monsters are built out of primitives and animated in code. That turns out
 * to be an advantage rather than a compromise: a body assembled from named
 * joints can be *driven* — a hit can jolt one shoulder, a freeze can lock the
 * whole rig mid-stride, a death can dissolve it from the feet up — and none of
 * that is available on a baked clip.
 *
 * The split here is between what is shared and what is not:
 *
 *   - **Geometry** is per *kind* and shared by every instance of it. Built once,
 *     cached in `MonsterAssets`, disposed when the app tears down.
 *   - **Materials** are per *monster*, because every monster needs its own
 *     `uHit`, `uFreeze` and `uDissolve`. A cloned standard material is cheap;
 *     a shared one would flash the whole horde white when you hit one of them.
 *
 * Every material goes through `applyDamageShader`, which is the single reason
 * the fight reads clearly: it is what makes a hit visible on the body itself
 * rather than only in the particles flying off it.
 */

/* ------------------------------------------------------------------ */
/* the damage shader                                                   */
/* ------------------------------------------------------------------ */

/**
 * Patch a standard material with the four states a monster body can be in.
 *
 * `uHit`    — a white impact flash, driven down over ~0.15 s by the monster
 * `uFreeze` — 0..1 toward a rimed pale-blue solid, for the freeze status
 * `uBurn`   — 0..1 toward glowing char, for the burn status
 * `uDissolve` — 0..1 death: noise-thresholded discard with a hot edge
 *
 * The dissolve runs bottom-up in *object* space, so a body always disintegrates
 * from its feet regardless of which way it is facing when it dies.
 *
 * @param {MeshStandardMaterial} material
 * @param {object} uniforms shared across one monster's materials
 */
export function applyDamageShader(material, uniforms, options = {}) {
  const { scales = false, veins = false } = options;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBodyLocal;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvBodyLocal = position;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vBodyLocal;
         float vScaleSeam = 0.0;
         uniform float uHit;
         uniform float uFreeze;
         uniform float uBurn;
         uniform float uDissolve;
         uniform float uCharge;
         uniform vec3 uHitColor;
         ${noiseGLSL}

         /**
          * Scales, as a distance field rather than a texture.
          *
          * Offset rows of overlapping discs, which is the packing real scales
          * use. The distance is measured to the *nearest* scale centre out of
          * the nine candidates around the sample, so the tiling has no gaps:
          * the value is 0 at the middle of a scale and about 0.5 where two of
          * them meet. That boundary is the seam, and it is a thin line rather
          * than most of the cell — which is the difference between a hide and
          * a lattice of glowing hexagons.
          */
         float scaleField(vec2 uv, out vec2 cell) {
           uv.y *= 0.72;
           vec2 base = floor(uv);
           float best = 1e9;
           float second = 1e9;
           vec2 bestCell = base;

           for (int j = -1; j <= 1; j++) {
             for (int i = -1; i <= 1; i++) {
               vec2 c = base + vec2(float(i), float(j));
               // Every other row steps half a scale sideways.
               vec2 centre = c + vec2(0.5 + mod(c.y, 2.0) * 0.5, 0.5);
               vec2 d = uv - centre;
               // Squashed: scales are wider than they are tall.
               float dist = length(vec2(d.x, d.y * 1.35));
               if (dist < best) {
                 second = best;
                 best = dist;
                 bestCell = c;
               } else if (dist < second) {
                 second = dist;
               }
             }
           }

           cell = bestCell;
           // The *gap* between the nearest and the next-nearest centre, not the
           // raw distance. It is 0 exactly on the boundary between two scales
           // and grows toward the middle of one, which makes the seam a thin
           // line at any scale density — a raw distance makes it a wash, since
           // most of a cell is far from its centre.
           return second - best;
                  }`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
         float bodyNoise = fbm3(vBodyLocal * 5.5) * 0.5 + 0.5;
         if (uDissolve > 0.0001) {
           // Bias by height so the body goes from the ground up rather than
           // uniformly — a uniform dissolve reads as a fade, not a death.
           float rise = clamp((vBodyLocal.y + 1.2) / 2.6, 0.0, 1.0);
           float threshold = uDissolve * 1.35 - rise * 0.3;
           if (bodyNoise < threshold) discard;
         }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         {
           // Freeze: desaturate hard toward rime, then add plate glints.
           if (uFreeze > 0.001) {
             float grey = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
             vec3 rime = mix(vec3(grey), vec3(0.58, 0.82, 0.98), 0.8);
             rime += smoothstep(0.62, 0.9, bodyNoise) * 0.35;
             diffuseColor.rgb = mix(diffuseColor.rgb, rime, uFreeze);
           }
           // Burn: char the albedo, the glow goes on the emissive below.
           if (uBurn > 0.001) {
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.05, 0.04), uBurn * 0.7);
           }
         }
         #ifdef MONSTER_SCALES
         {
           // Projected triplanar-ish: scales run along the body's length, and the
           // dominant axis picks which pair of coordinates to lay them out in, so
           // a neck and a flank both get scales running the right way.
           vec3 a = abs(normalize(vBodyLocal + 1e-4));
           vec2 uv = a.y > max(a.x, a.z)
             ? vBodyLocal.xz * 9.0
             : (a.x > a.z ? vBodyLocal.zy * 9.0 : vBodyLocal.xy * 9.0);

           vec2 cell;
           // edge: 0 on a seam, ~0.45 at the middle of a scale.
           float edge = scaleField(uv, cell);
           // Per-scale value variation, so the hide is not a uniform lattice.
           float tone = fract(sin(dot(cell, vec2(41.7, 289.1))) * 43758.5453);
           diffuseColor.rgb *= 0.86 + tone * 0.2;
           // Bright across the body of each scale, dark in the groove between
           // them. The lit face stays close to the albedo — a pattern that
           // brightens the hide turns the whole animal into a lantern.
           diffuseColor.rgb *= mix(0.5, 1.05, smoothstep(0.0, 0.16, edge));
           // The seam is the groove itself, and only the groove.
           vScaleSeam = 1.0 - smoothstep(0.0, 0.1, edge);
         }
         #endif
         #ifdef MONSTER_VEINS
         {
           // Membrane: thin, and veined. The veins are ridged noise — the sharp
           // creases an |fbm| fold gives are exactly what a vein network looks
           // like, and far cheaper than tracing one.
           float vein = 1.0 - abs(fbm3(vBodyLocal * 2.4) * 2.0);
           vein = pow(clamp(vein, 0.0, 1.0), 6.0);
           diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.4, vein);
           // Light bleeding through the thin patches between the veins. Kept
           // small: a membrane that glows competes with the fire it is there
           // to be silhouetted against.
           float thin = smoothstep(0.45, 0.95, fbm3(vBodyLocal * 0.9) * 0.5 + 0.5);
           diffuseColor.rgb += diffuseColor.rgb * thin * 0.22;
           vScaleSeam = vein * 0.25;
         }
         #endif`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           // The impact flash. It lands on emissive rather than albedo so it
           // survives a dark body and drives the bloom.
           totalEmissiveRadiance += uHitColor * uHit * 3.0;
           if (uBurn > 0.001) {
             float cinder = smoothstep(0.45, 0.85, bodyNoise + sin(vBodyLocal.y * 9.0) * 0.1);
             totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * cinder * uBurn * 2.2;
           }
           #if defined(MONSTER_SCALES) || defined(MONSTER_VEINS)
             // The seams between the scales light up as the breath charges —
             // heat coming up from inside the animal rather than a coat of paint
             // on top of it. This is the whole telegraph for the breath attack.
             totalEmissiveRadiance += uHitColor * vScaleSeam * uCharge * 2.2;
           #endif
           if (uDissolve > 0.0001) {
             // The burning edge of the dissolve front.
             float rise = clamp((vBodyLocal.y + 1.2) / 2.6, 0.0, 1.0);
             float threshold = uDissolve * 1.35 - rise * 0.3;
             float edge = 1.0 - smoothstep(0.0, 0.16, bodyNoise - threshold);
             totalEmissiveRadiance += uHitColor * edge * 6.0 * (1.0 - uDissolve * 0.4);
           }
         }`
      );
  };
  material.defines = { ...(material.defines ?? {}) };
  if (scales) material.defines.MONSTER_SCALES = '';
  if (veins) material.defines.MONSTER_VEINS = '';

  // A material that has been patched needs a new program; without this the
  // clone would silently reuse the unpatched one it was cloned from. The
  // variants must not share a key either, or the first one compiled wins.
  const key = `monster-damage${scales ? '-scales' : ''}${veins ? '-veins' : ''}`;
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
  return material;
}

/** The uniform set one monster's materials share. */
export function createDamageUniforms(accent) {
  return {
    uHit: { value: 0 },
    uFreeze: { value: 0 },
    uBurn: { value: 0 },
    uDissolve: { value: 0 },
    /** 0..1 — heat rising in the seams while something winds up. */
    uCharge: { value: 0 },
    uHitColor: { value: new Color(accent) }
  };
}

/* ------------------------------------------------------------------ */
/* health bars                                                         */
/* ------------------------------------------------------------------ */

const BAR_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A health bar with two fills: the real one, and a slower "chip" bar behind it
 * that catches up over about half a second. The gap between them is how you see
 * *how hard* something was just hit, which a single bar cannot show.
 */
const BAR_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uFill;
  uniform float uChip;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uArmour;

  void main() {
    // Frame: 1px-ish border in UV terms, plus a dark backing.
    float border = min(min(vUv.x, 1.0 - vUv.x) * 6.0, min(vUv.y, 1.0 - vUv.y) * 1.2);
    float frame = 1.0 - smoothstep(0.0, 0.12, border);

    vec3 color = vec3(0.03, 0.04, 0.06);
    float alpha = 0.62;

    if (vUv.x < uChip) { color = vec3(0.85, 0.16, 0.12); alpha = 0.8; }
    if (vUv.x < uFill) {
      color = uColor;
      // Vertical shading so the bar has a body instead of reading as a sticker.
      color *= 0.72 + 0.55 * (1.0 - abs(vUv.y - 0.5) * 2.0);
      alpha = 0.95;
    }
    // Armoured things get a hatched overlay — a read you can act on.
    if (uArmour > 0.01 && vUv.x < uFill) {
      float hatch = step(0.5, fract((vUv.x * 40.0 + vUv.y * 3.0)));
      color = mix(color, vec3(0.85, 0.88, 0.95), hatch * uArmour * 0.35);
    }
    color = mix(color, vec3(0.75, 0.82, 0.95), frame * 0.5);

    gl_FragColor = vec4(color, max(alpha, frame * 0.8) * uOpacity);
  }
`;

const BAR_GEOMETRY = new PlaneGeometry(1, 1);

/** One monster's floating health bar. Billboarded by the monster each frame. */
export function createHealthBar(accent) {
  const material = new ShaderMaterial({
    uniforms: {
      uFill: { value: 1 },
      uChip: { value: 1 },
      uOpacity: { value: 0 },
      uArmour: { value: 0 },
      uColor: { value: new Color(accent) }
    },
    vertexShader: BAR_VERTEX,
    fragmentShader: BAR_FRAGMENT,
    transparent: true,
    depthWrite: false,
    // Depth-tested off so a bar is never swallowed by the body it belongs to or
    // by a wall in front of it — you always know what is still alive.
    depthTest: false,
    toneMapped: false,
    side: DoubleSide
  });

  const mesh = new Mesh(BAR_GEOMETRY, material);
  mesh.renderOrder = 30;
  mesh.frustumCulled = false;
  mesh.layers.set(LAYER.VFX);
  mesh.visible = false;
  return { mesh, material };
}

/* ------------------------------------------------------------------ */
/* geometry, per kind                                                  */
/* ------------------------------------------------------------------ */

/**
 * Cache of the geometry each kind is assembled from.
 *
 * Kept as a class rather than a module map so the app owns its lifetime and can
 * actually dispose it — a module-level cache of GPU resources is a leak with
 * good manners.
 */
export class MonsterAssets {
  constructor() {
    this.kinds = new Map();
    this._owned = [];
  }

  _own(geometry) {
    this._owned.push(geometry);
    return geometry;
  }

  /**
   * Geometry for one kind. Built on first use.
   * @param {string} kind
   * @param {object} config settings.monsters.kinds[kind]
   */
  get(kind, config) {
    let entry = this.kinds.get(kind);
    if (!entry) {
      entry =
        kind === 'dragon'
          ? buildDragonGeometry(config, (geometry) => this._own(geometry))
          : kind === 'wisp'
            ? this._buildWisp(config)
            : this._buildBiped(kind, config);
      /**
       * The assembled, joint-collapsed rig for this kind. Built on first use
       * and shared by every instance — cloning it is what makes a monster cost
       * a hierarchy copy rather than a merge.
       */
      entry.template = (kindConfig) => {
        if (!entry._template) {
          entry._template =
            entry.shape === 'dragon'
              ? assembleDragon(entry, kindConfig)
              : entry.shape === 'orb'
                ? assembleWisp(entry, kindConfig)
                : assembleBiped(entry, kindConfig);
        }
        return entry._template;
      };
      this.kinds.set(kind, entry);
    }
    return entry;
  }

  /**
   * The humanoid family: imp, brute and golem are the same skeleton at three
   * very different sets of proportions.
   *
   * Proportion is doing all the silhouette work here. The imp is small-headed
   * and long-limbed so it reads as *quick*; the brute is a wedge with almost no
   * neck; the golem is a slab with boulder shoulders and stubby legs, which is
   * what makes it look like it cannot be moved. Same code, three creatures.
   */
  _buildBiped(kind, config) {
    const proportions = {
      // Long legs, small head, narrow chest: reads as *quick* before it moves.
      grunt: { torso: [0.46, 0.72, 0.34], head: 0.2, limb: 0.13, arm: 0.58, leg: 0.66, shoulder: 0.3, neck: 0.1 },
      // A wedge — wide at the shoulders, almost no neck, arms past the knees.
      brute: { torso: [0.8, 0.9, 0.5], head: 0.24, limb: 0.2, arm: 0.72, leg: 0.6, shoulder: 0.46, neck: 0.05 },
      // Slab-chested with boulder shoulders on stubby legs: unmovable.
      golem: { torso: [1.05, 1.15, 0.72], head: 0.28, limb: 0.3, arm: 0.86, leg: 0.5, shoulder: 0.62, neck: 0.03 },
      // A person: human proportions, upright, a real neck — the royale's rivals.
      rival: { torso: [0.56, 0.78, 0.34], head: 0.22, limb: 0.14, arm: 0.62, leg: 0.78, shoulder: 0.32, neck: 0.12 }
    }[kind] ?? { torso: [0.7, 0.8, 0.5], head: 0.24, limb: 0.18, arm: 0.6, leg: 0.6, shoulder: 0.4, neck: 0.08 };

    const [tw, th, td] = proportions.torso;

    return {
      shape: 'biped',
      proportions,
      // A tapered torso: narrower at the waist than the chest. Two boxes rather
      // than a cylinder because the flat facets catch the rim light as edges.
      chest: this._own(new BoxGeometry(tw, th * 0.58, td)),
      waist: this._own(new BoxGeometry(tw * 0.66, th * 0.48, td * 0.78)),
      neck: this._own(new BoxGeometry(tw * 0.3, Math.max(0.04, proportions.neck), td * 0.42)),
      head: this._own(
        kind === 'golem'
          ? new IcosahedronGeometry(proportions.head * 1.15, 0)
          : new BoxGeometry(proportions.head * 1.45, proportions.head * 1.25, proportions.head * 1.5)
      ),
      // A jaw that juts *forward* rather than hanging below: it is the whole
      // reason these read as facing you at all from behind.
      jaw: this._own(new BoxGeometry(proportions.head * 1.0, proportions.head * 0.42, proportions.head * 0.7)),
      shoulder: this._own(new IcosahedronGeometry(proportions.shoulder * 0.38, 0)),
      upperArm: this._own(new BoxGeometry(proportions.limb, proportions.arm * 0.55, proportions.limb)),
      foreArm: this._own(new BoxGeometry(proportions.limb * 0.85, proportions.arm * 0.5, proportions.limb * 0.85)),
      fist: this._own(new IcosahedronGeometry(proportions.limb * 0.85, 0)),
      thigh: this._own(new BoxGeometry(proportions.limb * 1.15, proportions.leg * 0.55, proportions.limb * 1.15)),
      shin: this._own(new BoxGeometry(proportions.limb, proportions.leg * 0.5, proportions.limb)),
      foot: this._own(new BoxGeometry(proportions.limb * 1.3, proportions.limb * 0.6, proportions.limb * 2.0)),
      eye: this._own(new SphereGeometry(proportions.head * 0.2, 6, 5)),
      horn: this._own(new ConeGeometry(proportions.head * 0.16, proportions.head * 0.75, 5)),
      // Spikes down the spine — pure silhouette, no cost worth mentioning.
      spike: this._own(new ConeGeometry(proportions.limb * 0.4, proportions.limb * 1.5, 4)),
      // A person (the royale's rival): no horns or spikes, a blaster in the right hand.
      human: Boolean(config.human),
      gun: config.human ? this._own(new BoxGeometry(proportions.limb * 0.75, proportions.limb * 0.95, proportions.arm * 0.95)) : null
    };
  }

  /** The floater: a caged core with orbiting rings and a tattered skirt. */
  _buildWisp(config) {
    return {
      shape: 'orb',
      core: this._own(new IcosahedronGeometry(0.3, 1)),
      shell: this._own(new IcosahedronGeometry(0.52, 0)),
      ring: this._own(new TorusGeometry(0.62, 0.035, 5, 24)),
      skirt: this._own(new ConeGeometry(0.5, 1.15, 9, 1, true)),
      wick: this._own(new CylinderGeometry(0.02, 0.08, 0.5, 5))
    };
  }

  dispose() {
    for (const geometry of this._owned) geometry.dispose();
    this._owned.length = 0;
    // The merged geometry inside a template is owned by that template, not by
    // `_owned` — it was produced after the source geometry was registered.
    for (const entry of this.kinds.values()) {
      entry._template?.root.traverse((node) => {
        if (node.isMesh && node.userData.merged) node.geometry.dispose();
      });
    }
    this.kinds.clear();
  }
}

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

/**
 * Assemble one monster's rig.
 *
 * Returns `{ root, joints }`. The joints are what `Monster` animates — they are
 * named after what they do rather than after the mesh they carry, so the
 * animation code reads as animation and never touches geometry.
 *
 * @param {object} assets from `MonsterAssets.get`
 * @param {object} config settings.monsters.kinds[kind]
 * @param {{body: MeshStandardMaterial, accent: MeshStandardMaterial, glow: MeshBasicMaterial}} materials
 */
export function assembleMonster(assets, config, materials) {
  return instantiate(assets.template(config), materials);
}

function assembleBiped(assets, config) {
  const p = assets.proportions;

  const root = new Group();
  // Joint names are the contract with `resolveJoints`: a template is cloned per
  // monster, and the clone's Groups are found again by these names.
  const hips = joint('hips');
  const torso = joint('torso');
  const head = joint('head');
  const armL = joint('armL');
  const armR = joint('armR');
  const foreL = joint('foreL');
  const foreR = joint('foreR');
  const legL = joint('legL');
  const legR = joint('legR');
  const shinL = joint('shinL');
  const shinR = joint('shinR');

  const legLength = p.leg * 1.05;
  const hipHeight = legLength + 0.14;

  root.add(hips);
  hips.position.y = hipHeight;
  hips.add(torso, legL, legR);

  /* --- torso --- */
  torso.add(part(assets.waist, 'body', 0, 0.12, 0));
  torso.add(part(assets.chest, 'body', 0, 0.12 + p.torso[1] * 0.46, 0));
  torso.add(part(assets.neck, 'body', 0, 0.12 + p.torso[1] * 0.76, 0));
  // Spine spikes: three, shrinking upward. A person has none.
  for (let i = 0; i < (assets.human ? 0 : 3); i++) {
    const spike = part(assets.spike, 'accent', 0, 0.2 + i * p.torso[1] * 0.26, -p.torso[2] * 0.46);
    spike.rotation.x = -0.7;
    spike.scale.setScalar(1 - i * 0.22);
    torso.add(trim(spike));
  }

  /* --- head --- */
  head.position.set(0, 0.14 + p.torso[1] * 0.82 + p.neck, 0);
  torso.add(head);
  head.add(part(assets.head, 'body', 0, p.head * 0.55, 0));
  if (!assets.human) head.add(part(assets.jaw, 'body', 0, p.head * 0.12, p.head * 0.5));
  for (const side of [-1, 1]) {
    // Eyes sit proud of the face so they are visible at a grazing angle; they
    // are unlit and never dissolve, which makes them the last thing you see of
    // a dying monster.
    head.add(glowPart(assets.eye, side * p.head * 0.34, p.head * 0.62, p.head * 0.78));

    if (assets.human) continue;
    const horn = trim(part(assets.horn, 'accent', side * p.head * 0.5, p.head * 1.05, -p.head * 0.15));
    horn.rotation.z = side * -0.42;
    horn.rotation.x = -0.5; // swept back, so they never break the front silhouette
    head.add(horn);
  }

  /* --- arms --- */
  const shoulderY = 0.14 + p.torso[1] * 0.66;
  for (const [side, arm, fore] of [
    [-1, armL, foreL],
    [1, armR, foreR]
  ]) {
    // Far enough out that the whole limb clears the chest: an arm half-buried
    // in the torso reads as a stump, and on the golem the torso is a metre wide.
    arm.position.set(side * (p.torso[0] * 0.5 + p.limb * 0.55), shoulderY, 0);
    torso.add(arm);

    // Tucked in and down against the chest. A pad that stands proud reads as a
    // balloon tied to the shoulder, especially on the golem, where everything
    // is scaled up by 1.7 including the mistake.
    const pad = part(assets.shoulder, 'accent', side * p.limb * -0.15, -p.limb * 0.05, 0);
    pad.scale.set(1.15, 0.8, 1.05);
    arm.add(pad);
    arm.add(part(assets.upperArm, 'body', 0, -p.arm * 0.26, 0));

    fore.position.y = -p.arm * 0.52;
    arm.add(fore);
    fore.add(part(assets.foreArm, 'body', 0, -p.arm * 0.24, 0));
    const fist = part(assets.fist, 'accent', 0, -p.arm * 0.5, 0);
    fist.scale.setScalar(1.05);
    fore.add(fist);
    if (assets.gun && side === 1) fore.add(trim(part(assets.gun, 'accent', 0, -p.arm * 0.5, p.arm * 0.32)));
  }

  /* --- legs --- */
  for (const [side, leg, shin] of [
    [-1, legL, shinL],
    [1, legR, shinR]
  ]) {
    // Stance width scales with the torso, so a golem plants its feet wide and
    // an imp keeps them under it.
    leg.position.set(side * (p.torso[0] * 0.3 + p.limb * 0.15), 0, 0);
    leg.add(part(assets.thigh, 'body', 0, -p.leg * 0.26, 0));

    shin.position.y = -p.leg * 0.52;
    leg.add(shin);
    shin.add(part(assets.shin, 'body', 0, -p.leg * 0.24, 0));
    shin.add(trim(part(assets.foot, 'body', 0, -p.leg * 0.5, p.limb * 0.5)));
  }

  return {
    root: collapseJoints(root),
    jointNames: ['hips', 'torso', 'head', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR', 'shinL', 'shinR'],
    /** Where hits and health bars anchor, metres above the root. */
    centreHeight: hipHeight + p.torso[1] * 0.45,
    barHeight: hipHeight + p.torso[1] * 0.95 + p.neck + p.head * 1.7,
    footHeight: 0
  };
}

function assembleWisp(assets, config) {
  const root = new Group();
  // The float pivot carries the same name as the biped's, so one animator
  // reads both without branching on shape for the parts that are shared.
  const hips = joint('hips');
  hips.position.y = 1.5;
  root.add(hips);

  const torso = joint('torso');
  hips.add(torso);

  const core = joint('core');
  torso.add(core);
  core.add(glowPart(assets.core));

  torso.add(part(assets.shell, 'body', 0, 0, 0));

  // Each ring is its own joint: they counter-rotate at different rates, which is
  // most of what makes the thing read as *hovering* rather than sitting still.
  const ringNames = [];
  for (let i = 0; i < 3; i++) {
    const ring = joint(`ring${i}`);
    ring.rotation.set((i * Math.PI) / 3, i * 0.7, 0);
    ring.add(part(assets.ring, 'accent', 0, 0, 0));
    torso.add(ring);
    ringNames.push(`ring${i}`);
  }

  const skirt = joint('skirt');
  skirt.add(part(assets.skirt, 'body', 0, -0.62, 0));
  torso.add(skirt);

  // Nothing hangs off it; it exists so the animator's contract holds.
  const head = joint('head');
  torso.add(head);

  return {
    root: collapseJoints(root),
    jointNames: ['hips', 'torso', 'head', 'core', 'skirt', ...ringNames],
    // `chains` is how a template hands the animator an array of joints rather
    // than a pile of numbered names.
    chains: { rings: ringNames },
    centreHeight: 1.5,
    barHeight: 2.35,
    footHeight: 1.5
  };
}

/* ------------------------------------------------------------------ */
/* materials, per monster                                              */
/* ------------------------------------------------------------------ */

/**
 * One monster's three materials.
 *
 * `body` is the hide, `accent` is the armour/horn trim, and `glow` is the eyes.
 * Only the first two get the damage patch — an unlit eye that keeps burning as
 * the body dissolves is exactly the read you want on a dying monster, and it is
 * the last thing to go.
 */
export function createMonsterMaterials(config, uniforms) {
  const accentColor = getColor(config.accent);

  const body = applyDamageShader(
    new MeshStandardMaterial({
      color: getColor(config.body).clone(),
      roughness: 0.88,
      metalness: 0.08,
      dithering: true
    }),
    uniforms,
    { scales: Boolean(config.scales) }
  );

  const accent = applyDamageShader(
    new MeshStandardMaterial({
      color: accentColor.clone().multiplyScalar(0.5),
      emissive: accentColor.clone(),
      // Barely emissive, and quite metallic. The accents are *armour* — they
      // should catch the key and the rim light like plate, not glow. Trim that
      // glows turns every monster into a lamp and flattens the abilities, which
      // are the only things in this scene that have earned the right to bloom.
      emissiveIntensity: 0.16,
      roughness: 0.42,
      metalness: 0.55
    }),
    uniforms,
    { scales: Boolean(config.scales) }
  );

  const glow = new MeshBasicMaterial({
    color: getColor(config.eye).clone(),
    toneMapped: false,
    transparent: true,
    opacity: 1
  });

  const materials = { body, accent, glow };

  // Wing membrane. Thin, translucent and lit from both sides, because the read
  // that sells a wing is the light coming *through* it when it passes in front
  // of something bright.
  if (config.membrane) {
    materials.membrane = applyDamageShader(
      new MeshStandardMaterial({
        color: getColor(config.membrane).clone(),
        emissive: accentColor.clone(),
        emissiveIntensity: 0.06,
        roughness: 0.72,
        metalness: 0,
        side: DoubleSide,
        transparent: true,
        opacity: 0.94
      }),
      uniforms,
      { veins: true }
    );
  }

  return materials;
}
