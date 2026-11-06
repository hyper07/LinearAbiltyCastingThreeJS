import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry
} from 'three';

import { LAYER } from '../core/Layers.js';
import { shortBoneName } from '../platform/rig/MixamoRigAdapter.js';
import { disposeObject } from '../utils/dispose.js';

/** @type {Record<string, { build: (...args: unknown[]) => Group, args?: unknown[] }>} */
const RECIPES = {
  unarmed: null,

  /* magic */
  'wand-arcane': { build: buildWand, args: [0.06, 0.55, '#5a4a8a', '#9b7bff'] },
  'wand-crystal': { build: buildWand, args: [0.05, 0.62, '#3a6a8a', '#7fd0ff'] },
  'wand-ember': { build: buildWand, args: [0.055, 0.58, '#5a3018', '#ff8a3c'] },
  'wand-frost': { build: buildWand, args: [0.05, 0.6, '#2a5068', '#8ee8ff'] },
  'wand-shadow': { build: buildWand, args: [0.055, 0.58, '#1a1028', '#6a48a0'] },
  'wand-holy': { build: buildWand, args: [0.05, 0.6, '#6a6048', '#ffe8a0'] },
  'staff-arcane': { build: buildStaff, args: ['#3a3050', '#9b7bff'] },
  'staff-nature': { build: buildStaff, args: ['#3a4828', '#7fd878'] },
  'staff-dark': { build: buildStaff, args: ['#1a1818', '#8844aa'] },
  'staff-battle': { build: buildStaff, args: ['#4a3828', '#a89070'] },
  scepter: { build: buildScepter, args: ['#8a7840', '#ffe080'] },
  'orb-crystal': { build: buildOrb, args: ['#7fd0ff'] },
  'orb-void': { build: buildOrb, args: ['#442266'] },
  tome: { build: buildTome, args: [0.14, '#4a3020'] },
  'tome-large': { build: buildTome, args: [0.2, '#281818'] },

  /* swords */
  'sword-short': { build: buildSword, args: [0.55, 0.07, '#7a8088', '#b8c0c8'] },
  'sword-long': { build: buildSword, args: [0.9, 0.09, '#8a9098', '#c8d0d8'] },
  'sword-broad': { build: buildSword, args: [0.75, 0.14, '#6a5040', '#a89078'] },
  'sword-great': { build: buildSword, args: [1.15, 0.12, '#707880', '#d0d8e0'] },
  'sword-katana': { build: buildKatana, args: ['#1a1a22', '#d8dce8'] },
  'sword-rapier': { build: buildRapier, args: ['#8890a0', '#e8ecf4'] },
  'sword-curve': { build: buildCurvedSword, args: ['#6a5840', '#c0a878'] },
  'scifi-saber': { build: buildEnergyBlade, args: ['#44aaff'] },

  /* axes & blunt */
  'axe-hand': { build: buildAxe, args: [0.35, '#5a4030', '#9098a0'] },
  'axe-battle': { build: buildAxe, args: [0.55, '#4a3028', '#a0a8b0'] },
  'axe-pick': { build: buildPickaxe, args: ['#5a5048', '#888890'] },
  'blunt-mace': { build: buildMace, args: [0.16, '#6a6058'] },
  'blunt-hammer': { build: buildHammer, args: [0.22, '#5a5048'] },
  'blunt-flail': { build: buildFlail, args: ['#5a4838'] },

  /* polearms */
  'pole-spear': { build: buildSpear, args: [1.1, '#5a4030'] },
  'pole-halberd': { build: buildHalberd, args: [] },
  'pole-glaive': { build: buildGlaive, args: [] },
  'pole-trident': { build: buildTrident, args: [] },
  'pole-scythe': { build: buildScythe, args: [] },
  'pole-lance': { build: buildSpear, args: [1.35, '#707880'] },

  /* knives */
  'knife-combat': { build: buildKnife, args: [0.28, '#4a5058', '#b0b8c0'] },
  'knife-tanto': { build: buildKnife, args: [0.22, '#3a2820', '#a89888'] },
  'knife-stiletto': { build: buildKnife, args: [0.32, '#505860', '#d0d8e0'] },
  'knife-kukri': { build: buildKukri, args: [] },
  'knife-cleaver': { build: buildCleaver, args: [] },
  'knife-dual': { build: buildKnife, args: [0.24, '#484858', '#c0c8d0'] },

  /* pistols */
  'pistol-service': { build: buildPistol, args: [0.22, '#3a4038'] },
  'pistol-revolver': { build: buildRevolver, args: [] },
  'pistol-heavy': { build: buildPistol, args: [0.28, '#2a2828'] },
  'pistol-smg': { build: buildSMG, args: [] },
  'scifi-pistol': { build: buildSciFiPistol, args: ['#44ccff'] },

  /* rifles */
  'rifle-assault': { build: buildRifle, args: [0.72, 0.06, '#3a4038', '#5a6058'] },
  'rifle-carbine': { build: buildRifle, args: [0.58, 0.055, '#404840', '#606860'] },
  'rifle-sniper': { build: buildRifle, args: [1.05, 0.05, '#2a3228', '#4a5248'] },
  'rifle-shotgun': { build: buildShotgun, args: ['#3a3028', '#5a5048'] },
  'rifle-lmg': { build: buildLMG, args: [] },
  'scifi-rifle': { build: buildSciFiRifle, args: ['#55bbff'] },

  /* bows */
  'bow-short': { build: buildBow, args: [0.55] },
  'bow-long': { build: buildBow, args: [0.85] },
  'bow-compound': { build: buildCompoundBow, args: [] },
  'bow-cross': { build: buildCrossbow, args: [] },

  /* heavy */
  'heavy-rocket': { build: buildRocketLauncher, args: [] },
  'heavy-grenade': { build: buildGrenadeLauncher, args: [] },
  'heavy-minigun': { build: buildMinigun, args: [] },
  'heavy-rail': { build: buildRailgun, args: [] },
  'heavy-flame': { build: buildFlamethrower, args: [] },

  /* unarmed visuals */
  'fist-gauntlet': { build: buildGauntlet, args: [] },
  'fist-claw': { build: buildClaws, args: [] },

  /* — throwing — */
  'throw-knives': { build: buildThrowingKnives, args: [] },
  'throw-shuriken': { build: buildShuriken, args: ['#9098a8'] },
  'throw-javelin': { build: buildSpear, args: [0.9, '#a0a8b0'] },
  'throw-boomerang': { build: buildBoomerang, args: ['#8a5a30'] },
  'throw-chakram': { build: buildChakram, args: ['#d0a040'] },
  'throw-bomb': { build: buildBomb, args: ['#2a2a30'] },
  'throw-smoke': { build: buildBomb, args: ['#8890a0'] },

  /* — more guns — */
  'pistol-flintlock': { build: buildFlintlock, args: [] },
  'rifle-musket': { build: buildMusket, args: [1.05, '#5a3a20'] },
  'rifle-lever': { build: buildMusket, args: [0.8, '#4a3020'] },
  'rifle-blunderbuss': { build: buildBlunderbuss, args: [] },
  'rifle-harpoon': { build: buildHarpoonGun, args: [] },
  'rifle-blowgun': { build: buildBlowgun, args: [] },
  'bow-hand-cross': { build: buildHandCrossbow, args: [] },
  'bow-sling': { build: buildSling, args: [] },

  /* — exotic melee — */
  'exotic-whip': { build: buildWhip, args: ['#5a3a24'] },
  'exotic-nunchaku': { build: buildNunchaku, args: [] },
  'exotic-fan': { build: buildWarFan, args: ['#a8323a'] },
  'exotic-sai': { build: buildSai, args: [] },
  'exotic-sickle': { build: buildChainSickle, args: [] }
};

/** Procedural weapon meshes parented to hand bones. */
export class WeaponVisual {
  constructor() {
    this.attachments = [];
  }

  /**
   * @param {import('../platform/weapon/WeaponDefinition.js').WeaponDefinition|null} weapon
   * @param {Map<string, import('three').Bone>} bones
   * @param {import('../platform/rig/MixamoRigAdapter.js').MixamoRigAdapter} rig
   * @param {import('three').Object3D} [model] full rig — used when the bone map misses a hand
   */
  equip(weapon, bones, rig, model = null) {
    this.clear();
    if (!weapon || weapon.visual === 'unarmed') return;

    const attach = (point, mirrored) => {
      const bone = resolveAttachBone(bones, rig, model, point);
      if (!bone) {
        console.warn(`[WeaponVisual] no attach bone for "${point}" on ${weapon.id}`);
        return;
      }
      const mesh = buildWeaponMesh(weapon);
      if (!mesh) {
        console.warn(`[WeaponVisual] no mesh recipe for "${weapon.visual}" (${weapon.id})`);
        return;
      }
      this._attach(mesh, bone, weapon.category, mirrored);
    };

    attach(weapon.attachPoint ?? 'handR', false);
    if (weapon.attachSecondary) attach(weapon.attachSecondary, true);
  }

  clear() {
    for (const { group } of this.attachments) {
      group.parent?.remove(group);
      disposeObject(group);
    }
    this.attachments = [];
  }

  /** @deprecated use buildWeaponMesh */
  _build(visual, weapon = null) {
    return buildWeaponMesh({ visual, id: visual, category: 'magic' });
  }

  /**
   * @param {import('three').Group} mesh
   * @param {import('three').Bone} bone
   * @param {string} category
   * @param {boolean} [mirrored]
   */
  _attach(mesh, bone, category, mirrored = false) {
    const group = new Group();
    group.name = `Weapon:${category}`;
    group.add(mesh);
    this._orient(group, category, mirrored);
    bone.add(group);
    bone.updateWorldMatrix(true, false);
    this.attachments.push({ group, bone });
  }

  _orient(group, category, mirrored) {
    const flip = mirrored ? -1 : 1;

    switch (category) {
      case 'magic':
        group.rotation.set(Math.PI * 0.5, 0, flip * 0.12);
        group.position.set(flip * 0.01, 0.02, 0.01);
        break;
      case 'sword':
      case 'knife':
      case 'axe':
      case 'exotic':
      case 'throwing':
        group.rotation.set(Math.PI * 0.55, flip * 0.2, flip * -0.35);
        group.position.set(flip * 0.02, 0.02, 0.04);
        break;
      case 'polearm':
        group.rotation.set(Math.PI * 0.45, flip * 0.15, flip * -0.2);
        group.position.set(flip * 0.03, -0.15, 0.06);
        break;
      case 'pistol':
        group.rotation.set(0, flip * Math.PI * 0.5, flip * 0.05);
        group.position.set(flip * 0.04, 0.02, -0.04);
        break;
      case 'rifle':
      case 'heavy':
        group.rotation.set(0, flip * Math.PI * 0.5, flip * 0.08);
        group.position.set(flip * 0.06, 0.02, -0.1);
        break;
      case 'bow':
        group.rotation.set(0, flip * -Math.PI * 0.5, flip * 0.35);
        group.position.set(flip * 0.05, 0.05, 0);
        break;
      case 'unarmed':
        group.rotation.set(0, 0, 0);
        group.position.set(0, 0, 0);
        break;
      default:
        group.rotation.set(Math.PI * 0.4, 0, 0);
    }
  }
}

/** Build a procedural mesh for any registered weapon definition. */
export function buildWeaponMesh(weapon) {
  const recipe = RECIPES[weapon.visual];
  if (recipe?.build) {
    const args = tintRecipeArgs(weapon, recipe.args ?? []);
    return prepMesh(recipe.build(...args));
  }
  return prepMesh(buildCategoryFallback(weapon));
}

/**
 * Collect every bone in a loaded rig, keyed by short Mixamo name.
 *
 * @param {import('three').Object3D} model
 */
export function collectRigBones(model) {
  /** @type {Map<string, import('three').Bone>} */
  const bones = new Map();
  if (!model) return bones;
  model.traverse((node) => {
    if (!node.isBone) return;
    const short = shortBoneName(node.name);
    if (!bones.has(short)) bones.set(short, node);
  });
  return bones;
}

/**
 * @param {Map<string, import('three').Bone>} bones
 * @param {import('../platform/rig/MixamoRigAdapter.js').MixamoRigAdapter} rig
 * @param {import('three').Object3D|null} model
 * @param {string} point
 */
function resolveAttachBone(bones, rig, model, point) {
  const fromMap = rig.getAttachBone(bones, point);
  if (fromMap) return fromMap;

  const boneName = rig.attachPoints[point] ?? point;
  if (model) {
    let found = null;
    model.traverse((node) => {
      if (!node.isBone || found) return;
      if (shortBoneName(node.name) === boneName) found = node;
    });
    if (found) return found;
  }

  return null;
}

/** Stable numeric seed from a weapon id — drives per-item color variation. */
function hashWeaponId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Shift hex colors slightly so shared recipes still read as different items. */
function tintRecipeArgs(weapon, args) {
  const seed = hashWeaponId(weapon.id);
  let colorIndex = 0;
  return args.map((arg) => {
    if (typeof arg !== 'string' || !arg.startsWith('#') || arg.length < 7) return arg;
    const shift = ((seed >> (colorIndex++ * 5)) & 0x1f) - 16;
    const n = parseInt(arg.slice(1), 16);
    const r = clampChannel(((n >> 16) & 0xff) + shift);
    const g = clampChannel(((n >> 8) & 0xff) + Math.floor(shift * 0.6));
    const b = clampChannel((n & 0xff) - shift);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  });
}

function clampChannel(v) {
  return Math.max(0, Math.min(255, v));
}

/** Guaranteed mesh when a recipe id is missing — one archetype per category. */
function buildCategoryFallback(weapon) {
  const seed = hashWeaponId(weapon.id);
  const accent = `#${(0x505868 + (seed % 0x303040)).toString(16).padStart(6, '0').slice(0, 6)}`;
  const metal = `#${(0x9098a8 + (seed % 0x202830)).toString(16).padStart(6, '0').slice(0, 6)}`;

  switch (weapon.category) {
    case 'magic':
      return buildWand(0.055, 0.58, accent, metal);
    case 'sword':
      return buildSword(0.85, 0.09, accent, metal);
    case 'axe':
      return buildAxe(0.45, accent, metal);
    case 'polearm':
      return buildSpear(1.15, accent);
    case 'knife':
      return buildKnife(0.28, accent, metal);
    case 'pistol':
      return buildPistol(0.24, accent);
    case 'rifle':
      return buildRifle(0.72, 0.06, accent, metal);
    case 'bow':
      return buildBow(0.65);
    case 'heavy':
      return buildRailgun();
    case 'unarmed':
      return buildGauntlet();
    case 'throwing':
      return buildThrowingKnives();
    case 'exotic':
      return buildSai();
    default:
      return buildSword(0.7, 0.08, accent, metal);
  }
}

/* ---- builders ---- */

function buildWand(radius, length, gripColor, gemColor) {
  const g = new Group();
  g.add(meshCylinder(radius, radius * 1.1, length * 0.55, gripColor, 0.75, -length * 0.15));
  g.add(meshCylinder(radius * 0.7, radius * 0.85, length * 0.35, '#2a2830', 0.5, length * 0.18));
  g.add(meshSphere(radius * 1.8, gemColor, 0.2, 0.6, length * 0.42));
  return g;
}

function buildStaff(gripColor, gemColor) {
  const g = new Group();
  g.add(meshCylinder(0.045, 0.05, 1.05, gripColor, 0.8, 0.1));
  g.add(meshSphere(0.09, gemColor, 0.25, 0.5, 0.72));
  return g;
}

function buildScepter(metal, gem) {
  const g = new Group();
  g.add(meshCylinder(0.035, 0.04, 0.55, '#2a2018', 0.85, -0.05));
  g.add(meshBox(0.12, 0.04, 0.04, metal, 0.55, 0.4, 0, 0.18));
  g.add(meshSphere(0.055, gem, 0.2, 0.55, 0.32));
  return g;
}

function buildOrb(color) {
  const g = new Group();
  g.add(meshCylinder(0.03, 0.035, 0.2, '#2a2018', 0.85, -0.12));
  g.add(meshSphere(0.08, color, 0.15, 0.55, 0.08));
  return g;
}

function buildTome(thickness, cover) {
  const g = new Group();
  g.add(meshBox(thickness, 0.22, 0.16, cover, 0.85, 0, 0, 0));
  g.add(meshBox(thickness * 0.85, 0.2, 0.14, '#e8e0d0', 0.95, 0, 0, 0.01));
  return g;
}

function buildSword(bladeLength, bladeWidth, guardColor, bladeColor) {
  const g = new Group();
  g.add(meshBox(bladeWidth, bladeLength, 0.025, bladeColor, 0.55, 0.35, 0, bladeLength * 0.45));
  g.add(meshBox(bladeWidth * 2.8, 0.04, 0.08, guardColor, 0.7));
  g.add(meshCylinder(0.035, 0.04, 0.18, '#2a2018', 0.85, -0.12));
  return g;
}

function buildKatana(scabbardColor, bladeColor) {
  const g = new Group();
  g.add(meshBox(0.05, 0.82, 0.018, bladeColor, 0.5, 0.4, 0, 0.38));
  const guard = mesh(new TorusGeometry(0.055, 0.012, 6, 12), '#1a1818', 0.8);
  guard.rotation.x = Math.PI * 0.5;
  g.add(guard);
  g.add(meshCylinder(0.028, 0.032, 0.2, scabbardColor, 0.9, -0.14));
  return g;
}

function buildRapier(guardColor, bladeColor) {
  const g = new Group();
  g.add(meshBox(0.025, 0.95, 0.012, bladeColor, 0.45, 0.5, 0, 0.42));
  const guard = mesh(new TorusGeometry(0.07, 0.008, 6, 16), guardColor, 0.65);
  guard.rotation.x = Math.PI * 0.5;
  g.add(guard);
  g.add(meshCylinder(0.022, 0.026, 0.16, '#1a1410', 0.85, -0.1));
  return g;
}

function buildCurvedSword(handle, blade) {
  const g = new Group();
  g.add(meshBox(0.08, 0.65, 0.025, blade, 0.5, 0.35, 0.04, 0.32));
  g.add(meshBox(0.14, 0.05, 0.06, handle, 0.75));
  g.add(meshCylinder(0.03, 0.035, 0.16, '#1a1410', 0.85, -0.1));
  return g;
}

function buildEnergyBlade(color) {
  const g = new Group();
  g.add(meshBox(0.04, 0.88, 0.04, color, 0.2, 0.85, 0, 0.4));
  g.add(meshCylinder(0.025, 0.028, 0.14, '#3a3a48', 0.6, -0.1));
  return g;
}

function buildAxe(headSize, handle, head) {
  const g = new Group();
  g.add(meshCylinder(0.03, 0.032, 0.55, handle, 0.85, -0.05));
  g.add(meshBox(headSize, headSize * 0.9, 0.04, head, 0.5, 0.35, 0, 0.22));
  return g;
}

function buildPickaxe(handle, head) {
  const g = new Group();
  g.add(meshCylinder(0.028, 0.03, 0.5, handle, 0.85, 0));
  g.add(meshBox(0.32, 0.06, 0.05, head, 0.55, 0.35, 0, 0.28));
  g.add(meshBox(0.06, 0.18, 0.05, head, 0.55, 0.35, 0.1, 0.22));
  return g;
}

function buildMace(radius, color) {
  const g = new Group();
  g.add(meshCylinder(0.03, 0.032, 0.48, '#3a2820', 0.85, -0.02));
  g.add(meshSphere(radius, color, 0.65, 0.25, 0.28));
  return g;
}

function buildHammer(head, color) {
  const g = new Group();
  g.add(meshCylinder(0.032, 0.035, 0.58, '#3a3028', 0.85, 0));
  g.add(meshBox(head, head * 0.7, 0.1, color, 0.6, 0.3, 0, 0.32));
  return g;
}

function buildFlail(color) {
  const g = new Group();
  g.add(meshCylinder(0.03, 0.032, 0.5, '#3a2820', 0.85, 0));
  g.add(meshSphere(0.1, color, 0.7, 0.2, 0.38));
  return g;
}

function buildSpear(length, tipColor) {
  const g = new Group();
  g.add(meshCylinder(0.022, 0.025, length, '#4a3828', 0.85, 0));
  g.add(meshBox(0.04, 0.18, 0.04, tipColor, 0.55, 0.4, 0, length * 0.48));
  return g;
}

function buildHalberd() {
  const g = new Group();
  g.add(meshCylinder(0.025, 0.028, 1.0, '#4a3828', 0.85, 0));
  g.add(meshBox(0.28, 0.08, 0.04, '#9098a0', 0.5, 0.35, 0, 0.42));
  g.add(meshBox(0.06, 0.22, 0.04, '#9098a0', 0.5, 0.35, 0.08, 0.35));
  return g;
}

function buildGlaive() {
  const g = new Group();
  g.add(meshCylinder(0.024, 0.027, 0.95, '#4a3828', 0.85, 0));
  g.add(meshBox(0.42, 0.1, 0.03, '#a0a8b0', 0.5, 0.35, 0, 0.4));
  return g;
}

function buildTrident() {
  const g = new Group();
  g.add(meshCylinder(0.024, 0.027, 0.9, '#4a5048', 0.85, 0));
  for (const x of [-0.05, 0, 0.05]) {
    g.add(meshBox(0.015, 0.2, 0.015, '#90a0b0', 0.5, 0.4, x, 0.42));
  }
  return g;
}

function buildScythe() {
  const g = new Group();
  g.add(meshCylinder(0.024, 0.027, 1.0, '#3a2820', 0.85, 0));
  g.add(meshBox(0.38, 0.08, 0.03, '#707880', 0.5, 0.35, 0.06, 0.38));
  return g;
}

function buildKnife(length, handleColor, bladeColor) {
  const g = new Group();
  g.add(meshBox(0.04, length, 0.012, bladeColor, 0.5, 0.4, 0, length * 0.45));
  g.add(meshBox(0.045, length * 0.45, 0.035, handleColor, 0.85, 0, -length * 0.18));
  return g;
}

function buildKukri() {
  const g = new Group();
  g.add(meshBox(0.05, 0.3, 0.015, '#a0a8b0', 0.5, 0.4, 0.03, 0.12));
  g.add(meshBox(0.05, 0.12, 0.03, '#3a3028', 0.85, 0, -0.08));
  return g;
}

function buildCleaver() {
  const g = new Group();
  g.add(meshBox(0.14, 0.28, 0.025, '#9098a0', 0.5, 0.35, 0, 0.1));
  g.add(meshBox(0.05, 0.12, 0.04, '#3a2820', 0.85, 0, -0.1));
  return g;
}

function buildPistol(length, color) {
  const g = new Group();
  g.add(meshBox(length, 0.09, 0.04, color, 0.75));
  g.add(meshBox(length * 0.35, 0.12, 0.05, '#2a2018', 0.9, -length * 0.25));
  return g;
}

function buildRevolver() {
  const g = new Group();
  g.add(meshBox(0.2, 0.1, 0.05, '#3a4038', 0.75));
  g.add(meshCylinder(0.055, 0.055, 0.04, '#2a2828', 0.65, 0, 0, 0));
  g.add(meshBox(0.08, 0.14, 0.05, '#2a2018', 0.9, -0.06));
  return g;
}

function buildSMG() {
  const g = new Group();
  g.add(meshBox(0.38, 0.08, 0.05, '#404840', 0.78));
  g.add(meshBox(0.12, 0.1, 0.04, '#2a2018', 0.9, -0.16));
  return g;
}

function buildSciFiPistol(color) {
  const g = new Group();
  g.add(meshBox(0.24, 0.1, 0.06, '#2a3040', 0.6, 0.35));
  g.add(meshBox(0.08, 0.06, 0.04, color, 0.25, 0.7, 0.1));
  return g;
}

function buildRifle(barrelLength, height, bodyColor, accentColor) {
  const g = new Group();
  g.add(meshBox(barrelLength, height, height * 1.6, bodyColor, 0.8, 0, barrelLength * 0.15));
  const barrel = mesh(new CylinderGeometry(height * 0.45, height * 0.5, barrelLength * 0.65, 8), accentColor, 0.55, 0.25);
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.x = barrelLength * 0.55;
  g.add(barrel);
  g.add(meshBox(barrelLength * 0.35, height * 1.3, height * 2, '#2a2018', 0.9, 0, -barrelLength * 0.28));
  return g;
}

function buildShotgun(bodyColor, accentColor) {
  const g = new Group();
  g.add(meshBox(0.42, 0.07, 0.1, bodyColor, 0.82, 0, 0.08));
  for (const offset of [-0.018, 0.018]) {
    const b = mesh(new CylinderGeometry(0.022, 0.024, 0.48, 8), accentColor, 0.5, 0.3);
    b.rotation.z = Math.PI * 0.5;
    b.position.set(0.32, offset, 0);
    g.add(b);
  }
  return g;
}

function buildLMG() {
  const g = new Group();
  g.add(meshBox(0.85, 0.08, 0.08, '#3a4038', 0.8, 0, 0.1));
  g.add(meshBox(0.2, 0.12, 0.06, '#2a2018', 0.9, 0, -0.35));
  g.add(meshBox(0.15, 0.18, 0.12, '#2a2828', 0.85, 0, 0.05, 0.06));
  return g;
}

function buildSciFiRifle(color) {
  const g = new Group();
  g.add(meshBox(0.68, 0.07, 0.09, '#2a3048', 0.55, 0.35, 0, 0.08));
  g.add(meshBox(0.5, 0.04, 0.04, color, 0.2, 0.75, 0, 0.12));
  return g;
}

function buildBow(height) {
  const g = new Group();
  const arc = mesh(new TorusGeometry(height * 0.45, 0.012, 6, 24, Math.PI * 0.85), '#5a4030', 0.85);
  arc.rotation.y = Math.PI * 0.5;
  g.add(arc);
  return g;
}

function buildCompoundBow() {
  const g = buildBow(0.6);
  g.add(meshBox(0.06, 0.12, 0.05, '#2a2828', 0.8));
  return g;
}

function buildCrossbow() {
  const g = new Group();
  g.add(meshBox(0.5, 0.06, 0.08, '#4a4038', 0.8));
  g.add(meshBox(0.06, 0.28, 0.05, '#3a3028', 0.85, 0, 0, 0.08));
  return g;
}

function buildRocketLauncher() {
  const g = new Group();
  g.add(meshCylinder(0.07, 0.07, 0.75, '#3a4038', 0.75, 0.1));
  g.add(meshBox(0.18, 0.12, 0.1, '#2a2018', 0.9, 0, -0.28));
  return g;
}

function buildGrenadeLauncher() {
  const g = new Group();
  g.add(meshBox(0.42, 0.08, 0.08, '#404840', 0.8));
  g.add(meshCylinder(0.045, 0.05, 0.22, '#2a2828', 0.65, 0, 0.28));
  return g;
}

function buildMinigun() {
  const g = new Group();
  g.add(meshBox(0.55, 0.14, 0.14, '#3a4038', 0.78, 0, 0.05));
  for (let i = 0; i < 4; i++) {
    const b = mesh(new CylinderGeometry(0.018, 0.018, 0.42, 6), '#2a2828', 0.55, 0.35);
    b.rotation.z = Math.PI * 0.5;
    b.position.set(0.32, (i - 1.5) * 0.035, 0);
    g.add(b);
  }
  return g;
}

function buildRailgun() {
  const g = new Group();
  g.add(meshBox(0.78, 0.09, 0.1, '#2a3040', 0.6, 0.4, 0, 0.08));
  g.add(meshBox(0.2, 0.06, 0.08, '#55bbff', 0.2, 0.8, 0, 0.12));
  return g;
}

function buildFlamethrower() {
  const g = new Group();
  g.add(meshBox(0.48, 0.16, 0.14, '#3a3028', 0.82, 0, 0.02));
  g.add(meshCylinder(0.05, 0.055, 0.28, '#2a2018', 0.85, 0, 0.32));
  return g;
}

function buildGauntlet() {
  const g = new Group();
  g.add(meshBox(0.1, 0.12, 0.08, '#5a6068', 0.65, 0.35));
  return g;
}

function buildClaws() {
  const g = new Group();
  for (let i = 0; i < 3; i++) {
    g.add(meshBox(0.012, 0.1, 0.012, '#9098a0', 0.55, 0.45, (i - 1) * 0.025, 0.04));
  }
  return g;
}

/* ---- mesh helpers ---- */

function mat(color, roughness = 0.75, metalness = 0.15) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

/* ---- throwing ---- */

function buildThrowingKnives() {
  const g = new Group();
  for (const [i, a] of [[-1, -0.35], [0, 0], [1, 0.35]]) {
    const k = buildKnife(0.2, '#2a2a30', '#c8d0d8');
    k.rotation.z = a;
    k.position.x = i * 0.03;
    g.add(k);
  }
  return g;
}

function buildShuriken(color) {
  const g = new Group();
  for (let i = 0; i < 4; i++) {
    const blade = meshBox(0.05, 0.22, 0.008, color, 0.35, 0.7, 0, 0, 0);
    blade.rotation.z = (i * Math.PI) / 4;
    g.add(blade);
  }
  g.add(mesh(new TorusGeometry(0.03, 0.01, 6, 12), '#2a2a30', 0.6));
  return g;
}

function buildBoomerang(color) {
  const g = new Group();
  const a = meshBox(0.32, 0.06, 0.018, color, 0.7, 0.05, 0.12, 0);
  const b = meshBox(0.06, 0.3, 0.018, color, 0.7, 0.05, 0, 0.12);
  g.add(a, b);
  g.rotation.z = Math.PI * 0.25;
  return g;
}

function buildChakram(color) {
  const g = new Group();
  g.add(mesh(new TorusGeometry(0.14, 0.018, 6, 28), color, 0.3, 0.8));
  g.add(mesh(new TorusGeometry(0.1, 0.008, 4, 28), '#5a4020', 0.7, 0.2));
  return g;
}

function buildBomb(color) {
  const g = new Group();
  g.add(meshSphere(0.1, color, 0.6, 0.2, 0.08));
  g.add(meshCylinder(0.03, 0.03, 0.05, '#4a4a50', 0.6, 0.19));
  g.add(meshCylinder(0.006, 0.006, 0.08, '#c8a060', 0.9, 0.25));
  return g;
}

/* ---- more guns ---- */

function buildFlintlock() {
  const g = new Group();
  g.add(meshBox(0.3, 0.04, 0.035, '#3a3028', 0.5, 0.6, 0.08, 0.02));
  g.add(meshBox(0.12, 0.12, 0.05, '#5a3a20', 0.85, 0.05, -0.08, -0.04));
  g.add(meshBox(0.04, 0.05, 0.02, '#b09060', 0.4, 0.7, 0.0, 0.05));
  return g;
}

function buildMusket(length, wood) {
  const g = new Group();
  g.add(meshBox(length * 0.7, 0.06, 0.05, wood, 0.85, 0.05, -length * 0.1, 0));
  const barrel = mesh(new CylinderGeometry(0.018, 0.02, length * 0.85, 8), '#4a4a50', 0.4, 0.7);
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.set(length * 0.18, 0.04, 0);
  g.add(barrel);
  g.add(meshBox(length * 0.25, 0.1, 0.05, wood, 0.85, 0.05, -length * 0.42, -0.03));
  return g;
}

function buildBlunderbuss() {
  const g = buildMusket(0.7, '#5a3a20');
  const flare = mesh(new CylinderGeometry(0.06, 0.02, 0.14, 10, 1, true), '#a08050', 0.35, 0.8);
  flare.rotation.z = -Math.PI * 0.5;
  flare.position.set(0.55, 0.04, 0);
  g.add(flare);
  return g;
}

function buildHarpoonGun() {
  const g = buildRifle(0.6, 0.06, '#3a5060', '#7a8890');
  const shaft = mesh(new CylinderGeometry(0.01, 0.01, 0.5, 6), '#c8d0d8', 0.4, 0.7);
  shaft.rotation.z = Math.PI * 0.5;
  shaft.position.set(0.5, 0.06, 0);
  g.add(shaft);
  g.add(meshBox(0.08, 0.05, 0.012, '#c8d0d8', 0.4, 0.7, 0.78, 0.06));
  return g;
}

function buildBlowgun() {
  const g = new Group();
  const tube = mesh(new CylinderGeometry(0.018, 0.022, 0.95, 8), '#7a6a40', 0.8, 0.05);
  tube.rotation.z = Math.PI * 0.5;
  tube.position.x = 0.25;
  g.add(tube);
  return g;
}

function buildHandCrossbow() {
  const g = new Group();
  g.add(meshBox(0.28, 0.05, 0.05, '#4a4038', 0.8));
  g.add(meshBox(0.04, 0.2, 0.04, '#3a3028', 0.85, 0.05, 0.08, 0));
  g.add(meshBox(0.08, 0.1, 0.04, '#2a2018', 0.9, 0.05, -0.1, -0.05));
  return g;
}

function buildSling() {
  const g = new Group();
  g.add(meshCylinder(0.006, 0.006, 0.45, '#7a5a3a', 0.9, -0.1));
  g.add(meshSphere(0.035, '#8a8a90', 0.8, 0.05, -0.34));
  return g;
}

/* ---- exotic melee ---- */

function buildWhip(color) {
  const g = new Group();
  g.add(meshCylinder(0.02, 0.022, 0.2, '#3a2a1a', 0.9, 0));
  // A coiled lash hanging off the grip.
  for (let i = 0; i < 6; i++) {
    const seg = meshCylinder(0.01 - i * 0.001, 0.011 - i * 0.001, 0.14, color, 0.85, 0);
    seg.position.set(Math.sin(i * 0.9) * 0.05, 0.12 + i * 0.12, Math.cos(i * 0.9) * 0.05 - 0.05);
    seg.rotation.x = 0.3 * Math.sin(i);
    g.add(seg);
  }
  return g;
}

function buildNunchaku() {
  const g = new Group();
  g.add(meshCylinder(0.02, 0.02, 0.26, '#3a2818', 0.8, 0));
  const second = meshCylinder(0.02, 0.02, 0.26, '#3a2818', 0.8, 0);
  second.position.set(0.12, 0.3, 0);
  second.rotation.z = -0.9;
  g.add(second);
  g.add(meshBox(0.01, 0.08, 0.01, '#9098a0', 0.4, 0.8, 0.04, 0.17));
  return g;
}

function buildWarFan(color) {
  const g = new Group();
  const fan = mesh(new CylinderGeometry(0.28, 0.28, 0.01, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8), color, 0.6, 0.2);
  fan.rotation.x = Math.PI * 0.5;
  fan.position.y = 0.06;
  g.add(fan);
  g.add(meshCylinder(0.015, 0.015, 0.16, '#2a2a30', 0.6, -0.06));
  return g;
}

function buildSai() {
  const g = new Group();
  g.add(meshBox(0.02, 0.4, 0.02, '#b8c0c8', 0.35, 0.8, 0, 0.18));
  g.add(meshBox(0.14, 0.02, 0.02, '#b8c0c8', 0.35, 0.8, 0, 0.02));
  g.add(meshBox(0.02, 0.08, 0.02, '#b8c0c8', 0.35, 0.8, -0.06, 0.06));
  g.add(meshBox(0.02, 0.08, 0.02, '#b8c0c8', 0.35, 0.8, 0.06, 0.06));
  g.add(meshCylinder(0.018, 0.018, 0.12, '#3a2818', 0.85, -0.06));
  return g;
}

function buildChainSickle() {
  const g = new Group();
  g.add(meshCylinder(0.018, 0.02, 0.3, '#4a3020', 0.85, 0));
  g.add(meshBox(0.2, 0.03, 0.01, '#a0a8b0', 0.35, 0.8, 0.08, 0.16));
  for (let i = 0; i < 5; i++) g.add(meshSphere(0.012, '#707880', 0.5, 0.7, -0.17 - i * 0.04));
  return g;
}

function mesh(geometry, color, roughness, metalness = 0.15) {
  return new Mesh(geometry, mat(color, roughness, metalness));
}

function meshBox(w, h, d, color, roughness, metalness = 0.15, x = 0, y = 0, z = 0) {
  const m = mesh(new BoxGeometry(w, h, d), color, roughness, metalness);
  m.position.set(x, y, z);
  return m;
}

function meshCylinder(rTop, rBot, h, color, roughness, y = 0) {
  const m = mesh(new CylinderGeometry(rTop, rBot, h, 8), color, roughness);
  m.position.y = y;
  return m;
}

function meshSphere(r, color, roughness, metalness, y = 0) {
  const m = mesh(new SphereGeometry(r, 10, 10), color, roughness, metalness);
  m.position.y = y;
  return m;
}

function prepMesh(root) {
  root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
      node.layers.set(LAYER.WORLD);
    }
  });
  return root;
}
