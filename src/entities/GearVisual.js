import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry
} from 'three';

import { LAYER } from '../core/Layers.js';
import { RARITIES } from '../items/Items.js';
import { disposeObject } from '../utils/dispose.js';

/**
 * Worn gear on the character, and gear lying on the ground.
 *
 * Procedural, like the weapons (entities/WeaponVisual.js): a helmet on the
 * head bone, a shield / focus in the left hand, a cloak or quiver on the
 * chest bone. The other pieces (gloves, boots, rings…) only show as loot.
 * Helmets hide the model's own hat or hood while they are worn.
 */

/* ---------------------------------------------------------------------- */
/* Materials                                                               */
/* ---------------------------------------------------------------------- */

const LOOK = {
  cloth: { color: '#5b4a8f', metalness: 0, roughness: 0.9 },
  leather: { color: '#7a4f2e', metalness: 0.05, roughness: 0.75 },
  mail: { color: '#9aa3ad', metalness: 0.75, roughness: 0.45 },
  plate: { color: '#cfd5dd', metalness: 0.9, roughness: 0.28 },
  wood: { color: '#7a5434', metalness: 0, roughness: 0.8 },
  iron: { color: '#6c7178', metalness: 0.85, roughness: 0.4 },
  gold: { color: '#e0b84a', metalness: 0.9, roughness: 0.3 },
  dark: { color: '#18161c', metalness: 0.2, roughness: 0.8 },
  cloak: { color: '#3a2f52', metalness: 0, roughness: 0.95 }
};

function material(look, overrides = {}) {
  return new MeshStandardMaterial({ ...LOOK[look], ...overrides });
}

/** A rarity-coloured trim that glows a little from magic up. */
function trimMaterial(rarity) {
  const color = RARITIES[rarity]?.color ?? '#d8dde6';
  const plain = rarity === 'common' || !rarity;
  return new MeshStandardMaterial({
    color: plain ? LOOK.gold.color : color,
    metalness: 0.8,
    roughness: 0.3,
    emissive: plain ? '#000000' : color,
    emissiveIntensity: plain ? 0 : 0.55
  });
}

const mesh = (geometry, mat, x = 0, y = 0, z = 0) => {
  const m = new Mesh(geometry, mat);
  m.position.set(x, y, z);
  return m;
};

/* ---------------------------------------------------------------------- */
/* Builders — each returns a Group about 1 unit = 1 metre, origin centred  */
/* ---------------------------------------------------------------------- */

/** Helmets: origin at the centre of the skull, +Y up, +Z the face. */
function buildHelmet(cls, rarity) {
  const g = new Group();
  const trim = trimMaterial(rarity);
  if (cls === 'cloth') {
    // A soft hood: a dome tipped back, a trimmed rim around the face, a
    // point that falls behind.
    const cloth = material('cloth', { side: DoubleSide });
    const hood = mesh(new SphereGeometry(0.35, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), cloth, 0, 0, -0.03);
    hood.rotation.x = -0.35;
    const rim = mesh(new TorusGeometry(0.33, 0.03, 8, 30), trim, 0, -0.05, 0.05);
    rim.rotation.x = Math.PI / 2 - 0.35;
    const tip = mesh(new ConeGeometry(0.12, 0.34, 12), cloth, 0, 0.0, -0.4);
    tip.rotation.x = -2.2;
    g.add(hood, rim, tip);
  } else if (cls === 'leather') {
    const leather = material('leather');
    g.add(mesh(new SphereGeometry(0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), leather, 0, 0.04, 0));
    const brim = mesh(new TorusGeometry(0.3, 0.035, 8, 28), trim, 0, 0.06, 0);
    brim.rotation.x = Math.PI / 2;
    g.add(brim);
  } else if (cls === 'mail') {
    const mail = material('mail', { side: DoubleSide });
    g.add(mesh(new SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.68), mail, 0, 0, 0));
    const band = mesh(new TorusGeometry(0.335, 0.03, 8, 28), trim, 0, 0.14, 0);
    band.rotation.x = Math.PI / 2;
    g.add(band);
  } else {
    const plate = material('plate');
    g.add(mesh(new CylinderGeometry(0.33, 0.34, 0.42, 22), plate, 0, -0.04, 0));
    g.add(mesh(new SphereGeometry(0.33, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), plate, 0, 0.17, 0));
    g.add(mesh(new BoxGeometry(0.42, 0.045, 0.06), material('dark'), 0, 0.02, 0.32)); // visor slit
    g.add(mesh(new BoxGeometry(0.04, 0.24, 0.05), trim, 0, -0.08, 0.335)); // nose guard
    const crest = mesh(new BoxGeometry(0.05, 0.12, 0.5), trim, 0, 0.47, -0.02);
    g.add(crest);
  }
  return g;
}

/** Shields: origin at the grip, the face toward +Z. */
function buildShield(base, rarity) {
  const g = new Group();
  const trim = trimMaterial(rarity);
  const wood = material('wood');
  const iron = material('iron');
  if (base === 'buckler' || base === 'spiked-shield') {
    const r = base === 'buckler' ? 0.24 : 0.3;
    const disc = mesh(new CylinderGeometry(r, r, 0.05, 28), base === 'buckler' ? iron : wood);
    disc.rotation.x = Math.PI / 2;
    const rim = mesh(new TorusGeometry(r, 0.025, 8, 32), trim);
    const boss = mesh(new SphereGeometry(r * 0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), iron, 0, 0, 0.025);
    boss.rotation.x = Math.PI / 2;
    g.add(disc, rim, boss);
    if (base === 'spiked-shield') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(new ConeGeometry(0.035, 0.14, 8), iron, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0.08);
        spike.rotation.x = Math.PI / 2;
        g.add(spike);
      }
      const centre = mesh(new ConeGeometry(0.05, 0.2, 10), iron, 0, 0, 0.12);
      centre.rotation.x = Math.PI / 2;
      g.add(centre);
    }
  } else if (base === 'kite-shield') {
    const shape = new Shape();
    shape.moveTo(0, 0.36);
    shape.quadraticCurveTo(0.3, 0.36, 0.3, 0.12);
    shape.quadraticCurveTo(0.26, -0.22, 0, -0.5);
    shape.quadraticCurveTo(-0.26, -0.22, -0.3, 0.12);
    shape.quadraticCurveTo(-0.3, 0.36, 0, 0.36);
    const body = mesh(new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 2 }), material('plate', { color: '#8a2a2a', metalness: 0.3, roughness: 0.6 }), 0, 0, -0.025);
    g.add(body, mesh(new BoxGeometry(0.06, 0.7, 0.02), trim, 0, -0.06, 0.05), mesh(new BoxGeometry(0.46, 0.06, 0.02), trim, 0, 0.12, 0.05));
  } else {
    // tower
    g.add(mesh(new BoxGeometry(0.56, 0.95, 0.06), wood, 0, -0.08, 0));
    g.add(mesh(new BoxGeometry(0.6, 0.06, 0.08), iron, 0, 0.38, 0), mesh(new BoxGeometry(0.6, 0.06, 0.08), iron, 0, -0.54, 0));
    g.add(mesh(new BoxGeometry(0.06, 0.95, 0.08), trim, 0, -0.08, 0.01));
    g.add(mesh(new BoxGeometry(0.2, 0.2, 0.04), iron, 0, -0.08, 0.05));
  }
  return g;
}

/** A focus: a gem that floats above the open hand. */
function buildFocus(base, rarity) {
  const g = new Group();
  const color = base === 'spirit-totem' ? '#8be08a' : base === 'rune-tablet' ? '#ffcf6a' : '#7fd0ff';
  if (base === 'rune-tablet') {
    g.add(mesh(new BoxGeometry(0.2, 0.28, 0.04), material('iron', { color: '#55504a' })));
    g.add(mesh(new BoxGeometry(0.12, 0.03, 0.01), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 }), 0, 0.05, 0.025));
    g.add(mesh(new BoxGeometry(0.03, 0.14, 0.01), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 }), 0, -0.03, 0.025));
  } else if (base === 'spirit-totem') {
    g.add(mesh(new CylinderGeometry(0.05, 0.06, 0.32, 8), material('wood')));
    g.add(mesh(new SphereGeometry(0.08, 12, 10), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 }), 0, 0.2, 0));
  } else {
    g.add(mesh(new OctahedronGeometry(0.12, 0), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0.2 })));
  }
  g.add(mesh(new TorusGeometry(0.15, 0.012, 6, 24), trimMaterial(rarity)));
  return g;
}

/** A quiver or bandolier: worn across the back; origin at its middle. */
function buildQuiver(base, rarity) {
  const g = new Group();
  if (base === 'bandolier') {
    const strap = mesh(new TorusGeometry(0.34, 0.035, 6, 28), material('leather'));
    strap.rotation.set(0, Math.PI / 2, 0.6);
    g.add(strap);
    for (let i = 0; i < 6; i++) {
      const a = 0.4 + i * 0.22;
      const shell = mesh(new CylinderGeometry(0.02, 0.02, 0.08, 8), material('gold'), 0, Math.sin(a) * 0.34, Math.cos(a) * 0.34);
      g.add(shell);
    }
    return g;
  }
  g.add(mesh(new CylinderGeometry(0.08, 0.07, 0.55, 14), material('leather')));
  g.add(mesh(new TorusGeometry(0.08, 0.015, 6, 18), trimMaterial(rarity), 0, 0.27, 0));
  g.children[1].rotation.x = Math.PI / 2;
  const shaft = material('wood');
  const fletch = new MeshStandardMaterial({ color: '#e8e0d0', side: DoubleSide });
  for (let i = 0; i < 5; i++) {
    const x = Math.cos(i * 1.3) * 0.04;
    const z = Math.sin(i * 1.3) * 0.04;
    g.add(mesh(new CylinderGeometry(0.008, 0.008, 0.3, 5), shaft, x, 0.38, z));
    g.add(mesh(new BoxGeometry(0.004, 0.08, 0.04), fletch, x, 0.5, z));
  }
  return g;
}

/** A cloak hanging from the shoulders: origin at the collar, hangs down -Y, behind -Z. */
function buildCloak(base, rarity) {
  const g = new Group();
  const color = base === 'shadow-cloak' ? '#1e1a26' : base === 'warded-mantle' ? '#2c4a6a' : '#5a3a2a';
  const cloth = new MeshStandardMaterial({ color, roughness: 0.95, side: DoubleSide });
  const drape = mesh(new CylinderGeometry(0.3, 0.46, 1.0, 20, 1, true, Math.PI * 0.62, Math.PI * 0.76), cloth, 0, -0.5, 0.06);
  g.add(drape);
  const clasp = mesh(new TorusGeometry(0.26, 0.022, 6, 24, Math.PI * 0.7), trimMaterial(rarity), 0, 0, 0.0);
  clasp.rotation.set(Math.PI / 2, 0, Math.PI * 0.15 + Math.PI);
  g.add(clasp);
  return g;
}

/* — ground-only pieces — */

function buildChest(cls, rarity) {
  const g = new Group();
  const look = LOOK[cls] ? cls : 'leather';
  const body = mesh(new CylinderGeometry(0.26, 0.22, 0.5, 14), material(look));
  body.scale.z = 0.62;
  g.add(body);
  for (const side of [-1, 1]) g.add(mesh(new SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material(look), side * 0.27, 0.2, 0));
  g.add(mesh(new BoxGeometry(0.5, 0.05, 0.34), trimMaterial(rarity), 0, -0.2, 0));
  return g;
}

function buildPair(kind, cls, rarity) {
  const g = new Group();
  const look = LOOK[cls] ? cls : 'leather';
  for (const side of [-1, 1]) {
    if (kind === 'feet') {
      g.add(mesh(new BoxGeometry(0.13, 0.22, 0.14), material(look), side * 0.11, 0.11, 0));
      g.add(mesh(new BoxGeometry(0.13, 0.08, 0.28), material(look), side * 0.11, 0.04, 0.07));
      g.add(mesh(new BoxGeometry(0.14, 0.03, 0.15), trimMaterial(rarity), side * 0.11, 0.21, 0));
    } else if (kind === 'hands') {
      g.add(mesh(new BoxGeometry(0.12, 0.05, 0.16), material(look), side * 0.12, 0.03, 0));
      g.add(mesh(new CylinderGeometry(0.06, 0.065, 0.12, 10), trimMaterial(rarity), side * 0.12, 0.03, -0.12));
      g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    } else {
      g.add(mesh(new CylinderGeometry(0.08, 0.07, 0.5, 10), material(look), side * 0.1, 0.25, 0));
      g.add(mesh(new SphereGeometry(0.06, 10, 8), trimMaterial(rarity), side * 0.1, 0.27, 0.06));
    }
  }
  return g;
}

function buildJewel(kind, base, rarity) {
  const g = new Group();
  const gem = new MeshStandardMaterial({ color: RARITIES[rarity]?.color ?? '#7fd0ff', emissive: RARITIES[rarity]?.color ?? '#7fd0ff', emissiveIntensity: 0.9, roughness: 0.1 });
  if (kind === 'ring') {
    const band = mesh(new TorusGeometry(0.08, 0.02, 8, 20), material('gold'));
    g.add(band, mesh(new OctahedronGeometry(0.035), gem, 0, 0.09, 0));
  } else if (kind === 'neck') {
    const chain = mesh(new TorusGeometry(0.16, 0.01, 6, 28), material('gold'));
    g.add(chain, mesh(new OctahedronGeometry(0.055), gem, 0, -0.18, 0));
  } else {
    // belt
    const strap = mesh(new TorusGeometry(0.2, 0.03, 6, 26), material(base === 'sash' ? 'cloth' : 'leather'));
    strap.rotation.x = Math.PI / 2;
    g.add(strap, mesh(new BoxGeometry(0.1, 0.08, 0.03), trimMaterial(rarity), 0, 0, 0.2));
  }
  return g;
}

function prep(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    node.layers.set(LAYER.WORLD);
  });
  return root;
}

/** A gear item as a mesh — worn or on the ground. */
export function buildGearMesh(item) {
  const { kind, group, base, rarity } = item;
  let g;
  if (kind === 'head') g = buildHelmet(group, rarity);
  else if (kind === 'offhand') g = group === 'shield' ? buildShield(base, rarity) : group === 'focus' ? buildFocus(base, rarity) : buildQuiver(base, rarity);
  else if (kind === 'back') g = buildCloak(base, rarity);
  else if (kind === 'chest') g = buildChest(group, rarity);
  else if (kind === 'hands' || kind === 'feet' || kind === 'legs') g = buildPair(kind, group, rarity);
  else g = buildJewel(kind, base, rarity);
  return prep(g);
}

/* ---------------------------------------------------------------------- */
/* Worn                                                                    */
/* ---------------------------------------------------------------------- */

/** The model's own headwear and cape: hidden while a helmet / cloak is worn. */
const HEADWEAR = /hat|helmet|cowl|horn/i;
const CAPE = /cape|cloak/i;

/**
 * Where each worn piece sits, per rig. Bones differ: KayKit bones are in
 * metres with +Y along the bone; Mixamo bones are in centimetres (the whole
 * model is scaled down), so pieces are scaled back up.
 */
const FIT = {
  kaykit: {
    head: { bone: ['head', 'Head'], position: [0, 0.66, -0.1], rotation: [0, 0, 0], scale: 1.75 },
    shield: { bone: ['handl', 'LeftHand'], position: [0.12, 0.1, 0], rotation: [0, Math.PI / 2, 0], scale: 1 },
    focus: { bone: ['handl', 'LeftHand'], position: [0, 0.2, 0.25], rotation: [0, 0, 0], scale: 1 },
    quiver: { bone: ['chest', 'Spine2'], position: [0.1, 0.05, -0.45], rotation: [0.25, 0, 0.45], scale: 1.2 },
    back: { bone: ['chest', 'Spine2'], position: [0, 0.58, -0.08], rotation: [0, 0, 0], scale: 1.25 }
  },
  mixamo: {
    head: { bone: ['Head'], position: [0, 14, 0], rotation: [0, 0, 0], scale: 56 },
    shield: { bone: ['LeftHand'], position: [-6, 6, 0], rotation: [0, -Math.PI / 2, 0], scale: 70 },
    focus: { bone: ['LeftHand'], position: [0, 14, 12], rotation: [0, 0, 0], scale: 100 },
    quiver: { bone: ['Spine2'], position: [6, 6, -22], rotation: [0.25, 0, -0.45], scale: 100 },
    back: { bone: ['Spine2'], position: [0, 16, -8], rotation: [-0.7, 0, 0], scale: 95 }
  }
};

export class GearVisual {
  constructor() {
    this.attachments = [];
    this.hidden = [];
    /** Override the fit for a rig at runtime while tuning (window.app). */
    this.fit = FIT;
  }

  /**
   * Show what is worn.
   * @param {Record<string, object|null>} gear Profile.gear
   * @param {(item: object) => boolean} isActive
   * @param {Map<string, import('three').Bone>} bones
   * @param {string} rigId 'kaykit' | 'mixamo'
   * @param {import('three').Object3D} model
   */
  equip(gear, isActive, bones, rigId, model) {
    this.clear();
    if (!model || !gear) return;
    const fit = this.fit[rigId === 'kaykit' ? 'kaykit' : 'mixamo'];

    const helmet = gear.head;
    if (helmet) {
      this._attach(buildGearMesh(helmet), fit.head, bones);
      this._hide(model, HEADWEAR);
    }
    const off = gear.offhand;
    if (off && isActive(off)) {
      const where = off.group === 'shield' ? fit.shield : off.group === 'focus' ? fit.focus : fit.quiver;
      this._attach(buildGearMesh(off), where, bones);
    }
    if (gear.back) {
      this._attach(buildGearMesh(gear.back), fit.back, bones);
      this._hide(model, CAPE);
    }
  }

  clear() {
    for (const { group } of this.attachments) {
      group.parent?.remove(group);
      disposeObject(group);
    }
    this.attachments = [];
    for (const node of this.hidden) node.visible = true;
    this.hidden = [];
  }

  _hide(model, pattern) {
    model.traverse((node) => {
      if (node.isMesh && node.visible && pattern.test(node.name)) {
        node.visible = false;
        this.hidden.push(node);
      }
    });
  }

  _attach(meshRoot, where, bones) {
    const bone = where.bone.map((name) => bones.get(name)).find(Boolean);
    if (!bone) return;
    const group = new Group();
    group.name = 'Gear';
    group.add(meshRoot);
    group.position.set(...where.position);
    group.rotation.set(...where.rotation);
    group.scale.setScalar(where.scale);
    bone.add(group);
    this.attachments.push({ group, bone, where });
  }
}
