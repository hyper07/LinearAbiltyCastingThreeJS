import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadSoldier, Soldier } from '../../fps/soldier.js';
import { gunModel } from '../../fps/guns.js';
import { dress } from '../../mmo/bodies.js';
import { RANKS, RANK_ORDER, FOES, LOOKS } from './rules.js';
import { loadRobot, Robot } from './robot.js';

/**
 * Grave Purge 2D's sprites, made the way the classic 2D strategy games made
 * theirs: from 3D models, rendered once from a fixed angle above (the sun in
 * the north-west) into sheets of flat pictures — every rank of soldier and
 * every kind of the dead, five ways round (the other three are mirrors), a
 * few frames of each move — plus the buildings, the camp and the graves and
 * trees of the land. The 3D is thrown away afterwards: the game itself only
 * draws pictures.
 */

const PPM = 44; // pixels a metre in a sprite
export const ELEVATION = (42 * Math.PI) / 180;
const DIRS = 5; // south, south-east, east, north-east, north
const LIB = './library/kaykit/';
const HALLOWEEN = 'KayKit-Halloween-Bits-1.0/addons/kaykit_halloween_bits/Assets/gltf/';
const SPACE = 'KayKit-Space-Base-Bits-1.0/addons/kaykit_space_base_bits/Assets/gltf/';
const DUNGEON = 'KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf/';

/** How each kind of the dead moves (clip, frames). */
const FOE_CLIPS = {
  husk: { walk: 'Walking_D_Skeletons', attack: 'Unarmed_Melee_Attack_Punch_A' },
  ravager: { walk: 'Running_A', attack: '1H_Melee_Attack_Stab' },
  hexer: { walk: 'Walking_B', attack: 'Spellcast_Shoot' },
  brute: { walk: 'Walking_A', attack: '2H_Melee_Attack_Chop' },
  wight: { walk: 'Walking_A', attack: '1H_Melee_Attack_Slice_Diagonal' },
  bonecaller: { walk: 'Walking_B', attack: 'Spellcast_Shoot' }
};
const FOE_TINT = { husk: '#e6e0cc', ravager: '#d4c4b0', hexer: '#c4b0e4', brute: '#c8beaa', wight: '#8a9aa8', bonecaller: '#a880d0' };
/** Still things: the dead's buildings, the camp, the land's graves and trees. [file, metres across (or tall, with `tall`), tint] */
export const STILLS = {
  spire: [HALLOWEEN + 'post_skull.gltf', 4.4, null, true],
  barrow: [HALLOWEEN + 'grave_A.gltf', 3.6],
  crypt: [HALLOWEEN + 'crypt.gltf', 5.6],
  ossuary: [HALLOWEEN + 'crypt.gltf', 6.6, '#6a5060'],
  cache: [DUNGEON + 'trunk_large_C.gltf.glb', 1.8],
  node: [HALLOWEEN + 'shrine_candles.gltf', 4.4],
  shrine: [HALLOWEEN + 'shrine.gltf', 6.4],
  heart: [HALLOWEEN + 'crypt.gltf', 10, '#7a3040'],
  barracks: [SPACE + 'basemodule_garage.gltf', 7],
  armory: [SPACE + 'basemodule_E.gltf', 6],
  pad: [SPACE + 'landingpad_large.gltf', 10],
  forge: [SPACE + 'drill_structure.gltf', 4.6],
  cargo: [SPACE + 'cargo_A_stacked.gltf', 2.4],
  turbine: [SPACE + 'windturbine_tall.gltf', 3],
  solar: [SPACE + 'solarpanel.gltf', 3],
  lights: [SPACE + 'lights.gltf', 1.6],
  treeL: [HALLOWEEN + 'tree_dead_large.gltf', 3.4],
  treeM: [HALLOWEEN + 'tree_dead_medium.gltf', 2.6],
  treeS: [HALLOWEEN + 'tree_dead_small.gltf', 1.8],
  stone: [HALLOWEEN + 'gravestone.gltf', 1.1],
  marker: [HALLOWEEN + 'gravemarker_A.gltf', 0.9],
  grave: [HALLOWEEN + 'grave_B.gltf', 1.8],
  ribs: [HALLOWEEN + 'ribcage.gltf', 1.2],
  bone: [HALLOWEEN + 'bone_A.gltf', 0.8],
  fence: [HALLOWEEN + 'fence_broken.gltf', 2.2],
  lantern: [HALLOWEEN + 'post_lantern.gltf', 1.4],
  coffin: [HALLOWEEN + 'coffin.gltf', 2],
  pumpkin: [HALLOWEEN + 'skull_candle.gltf', 0.6]
};

const wait = () => new Promise((r) => setTimeout(r, 0));

export class SpriteBaker {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#dfe4ff', '#4a3a30', 1.6));
    const sun = new THREE.DirectionalLight('#fff0d8', 3);
    sun.position.set(-5, 9, -4);
    this.scene.add(sun);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.loader = new GLTFLoader();
  }

  /** Frame a box of `span` metres round a thing `height` tall at the origin; where its feet land in the picture. */
  _frame(span, height, cell) {
    const cy = height * 0.4;
    const c = this.camera;
    Object.assign(c, { left: -span / 2, right: span / 2, top: span / 2, bottom: -span / 2 });
    c.position.set(0, cy + Math.sin(ELEVATION) * 60, Math.cos(ELEVATION) * 60);
    c.lookAt(0, cy, 0);
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    this.renderer.setSize(cell, cell, false);
    const p = new THREE.Vector3(0, 0, 0).project(c);
    return { x: ((p.x + 1) / 2) * cell, y: ((1 - p.y) / 2) * cell };
  }

  _shot(ctx, x, y) {
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, x, y);
  }

  /**
   * A sheet: rows are the five ways round, columns the frames, posed by
   * `pose(name, t)`; the model turned by `turn(a)`.
   */
  async _sheet(object, { span, height, frames, pose, turn }) {
    const cell = Math.ceil(span * PPM);
    const anchor = this._frame(span, height, cell);
    const cols = frames.length;
    const atlas = document.createElement('canvas');
    atlas.width = cell * cols;
    atlas.height = cell * DIRS;
    const ctx = atlas.getContext('2d');
    this.scene.add(object);
    for (let d = 0; d < DIRS; d++) {
      turn((d * Math.PI) / 4);
      for (let f = 0; f < cols; f++) {
        pose(frames[f][0], frames[f][1]);
        this._shot(ctx, f * cell, d * cell);
      }
      await wait();
    }
    this.scene.remove(object);
    const index = {};
    frames.forEach(([, , tag], k) => (index[tag] ??= []).push(k));
    return { atlas, cell, anchor, index, ppm: PPM };
  }

  /** Every rank of soldier: standing, and eight frames of the run. */
  async soldiers(progress) {
    const gltf = await loadSoldier();
    if (!gltf) return null;
    const robot = await loadRobot();
    const out = {};
    for (const rank of RANK_ORDER) {
      if (LOOKS[rank].robot && robot) {
        // The Paragon: the war robot, standing and running.
        const r = new Robot(robot, { paint: LOOKS[rank].paint, team: '#d8dde4' });
        const run = r.actions.Running?.getClip().duration ?? 0.7;
        out[rank] = await this._sheet(r.group, {
          span: 3,
          height: 2.1,
          frames: [['Idle', 0, 'idle'], ...Array.from({ length: 8 }, (_, k) => ['Running', (k / 8) * run, 'run'])],
          turn: (a) => (r.group.rotation.y = a + Math.PI),
          pose: (name, t) => {
            r.mixer.stopAllAction();
            const act = r.actions[name];
            act.reset().play();
            act.time = t;
            r.mixer.update(0);
          }
        });
        progress();
        continue;
      }
      const s = new Soldier(gltf, '#c8ccd2', LOOKS[rank].paint, gunModel(RANKS[rank].weapon));
      if (LOOKS[rank].glow) s.model.traverse((o) => o.isMesh && (o.material.emissive = new THREE.Color(LOOKS[rank].glow), (o.material.emissiveIntensity = 0.18)));
      const run = s.actions.Run?.getClip().duration ?? 0.7;
      const frames = [['Idle', 0, 'idle'], ...Array.from({ length: 8 }, (_, k) => ['Run', (k / 8) * run, 'run'])];
      out[rank] = await this._sheet(s.group, {
        span: 2.6,
        height: 1.8,
        frames,
        turn: (a) => (s.group.rotation.y = a + Math.PI),
        pose: (name, t) => {
          s.mixer.stopAllAction();
          const act = s.actions[name];
          act.reset().play();
          act.time = t;
          s.state = name;
          s.update(0, { moving: name === 'Run', slow: false, pitch: 0, alive: true });
        }
      });
      s.dispose();
      progress();
    }
    return out;
  }

  /** Every kind of the dead: standing, walking, striking, falling. */
  async dead(progress) {
    const out = {};
    for (const [kind, def] of Object.entries(FOES)) {
      const made = await dress({ body: def.body, height: def.size, tint: FOE_TINT[kind], hat: true, cape: true });
      if (!made) continue;
      const clips = FOE_CLIPS[kind];
      const len = (name) => made.actions[name]?.getClip().duration ?? 1;
      const frames = [
        ['Idle', 0, 'idle'],
        ...Array.from({ length: 6 }, (_, k) => [clips.walk, (k / 6) * len(clips.walk), 'walk']),
        ...[0.25, 0.45, 0.65].map((f) => [clips.attack, f * len(clips.attack), 'attack'])
      ];
      out[kind] = await this._sheet(made.model, {
        span: def.size * 1.25 + 1.2,
        height: def.size,
        frames,
        turn: (a) => (made.model.rotation.y = a),
        pose: (name, t) => {
          made.mixer.stopAllAction();
          const act = made.actions[name];
          if (!act) return;
          act.reset().play();
          act.time = t;
          made.mixer.update(0);
        }
      });
      progress();
    }
    return out;
  }

  /** The still things, each one picture. */
  async stills(progress) {
    const out = {};
    for (const [key, [file, size, tint, tall]] of Object.entries(STILLS)) {
      const g = await this.loader.loadAsync(LIB + file).catch(() => null);
      if (!g) continue;
      const m = g.scene;
      const box = new THREE.Box3().setFromObject(m);
      const k = tall ? size / Math.max(0.1, box.max.y - box.min.y) : size / Math.max(0.1, Math.max(box.max.x - box.min.x, box.max.z - box.min.z));
      m.scale.setScalar(k);
      box.setFromObject(m);
      m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
      if (tint) {
        const wash = new THREE.Color(tint);
        m.traverse((o) => {
          if (o.isMesh && o.material) {
            o.material = o.material.clone();
            o.material.color.multiply(wash);
          }
        });
      }
      const holder = new THREE.Group();
      holder.add(m);
      const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      const h = box.max.y - box.min.y;
      const span = Math.max(w * 1.15, h * 1.2) + 0.6;
      const cell = Math.ceil(span * PPM);
      const anchor = this._frame(span, h, cell);
      const atlas = document.createElement('canvas');
      atlas.width = atlas.height = cell;
      this.scene.add(holder);
      this._shot(atlas.getContext('2d'), 0, 0);
      this.scene.remove(holder);
      out[key] = { atlas, cell, anchor, ppm: PPM, w };
      progress();
      await wait();
    }
    return out;
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

/** Bake everything; `onProgress(0..1)`. Resolves null where WebGL or the library isn't there. */
export async function bakeSprites(onProgress = () => {}) {
  let baker;
  try {
    baker = new SpriteBaker();
  } catch {
    return null;
  }
  const total = RANK_ORDER.length + Object.keys(FOES).length + Object.keys(STILLS).length;
  let done = 0;
  const step = () => onProgress(++done / total);
  try {
    const soldiers = await baker.soldiers(step);
    const dead = await baker.dead(step);
    const stills = await baker.stills(step);
    return { soldiers, dead, stills, dirs: DIRS };
  } catch (e) {
    console.warn('sprites', e);
    return null;
  } finally {
    baker.dispose();
  }
}
