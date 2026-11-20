/**
 * Dressing a hero in what they wear: weapons in the hand bones, a shield or
 * focus in the off hand, a quiver on the back, a helmet on the head bone
 * (hiding the hair, or the model's own helmet, as it should), pauldrons,
 * a gorget, gauntlet cuffs, knee cops and sabatons following the arm, leg
 * and foot bones, the model's own clothes recoloured to the armour's metal,
 * leather or cloth, and a cape: on the Quaternius bodies their own cloak
 * (robeModels.js), shown, dyed and trimmed by the cape slot; on polyfork's,
 * a cloth cape that swings and settles as the hero moves. Epic and legendary
 * pieces glow, trail their swings and shed motes.
 *
 *   const rig = new GearRig(actor, template);
 *   rig.dress(profile.equip);
 *   each frame: rig.update(dt, heroObject)
 */
import * as THREE from 'three';
import { BASES, METALS, glows, RARITIES } from './items.js';
import { buildItem, itemPalette, pauldron, cuff, knee, foot, gorget, cuisse } from './gearModels.js';
import { characterMaterial, partsDepthMaterial } from './actors.js';
import { shadeHex } from './folk.js';
import { heraldryMaterial, gearMaterial } from './gearMaterials.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** The hand frames, learnt from the heroes' own weapons (all polyfork humanoids share the rig's axes). */
const FRAMES = {};
const BUILT_IN = /^(shield|arming-sword-body|bow-body|wand-body|crystal)$/;

/** Read where the models hold their weapons (their attach-held nodes), once. */
export function learnFrames(templates) {
  for (const t of templates) {
    if (!t) continue;
    t.gltf.scene.updateMatrixWorld(true);
    t.gltf.scene.traverse((o) => {
      if (!/^attach-held/.test(o.name) || !o.parent?.isBone) return;
      const side = /Left/.test(o.parent.name) ? 'L' : 'R';
      const kind = /shield/.test(o.name) ? 'shield' : /bow/.test(o.name) ? 'bow' : /wand/.test(o.name) ? 'wand' : 'sword';
      const m = new THREE.Matrix4().compose(o.position, o.quaternion, V(1, 1, 1));
      // Where the fist closes, in the frame: a little along the hand from the wrist.
      const palm = V(side === 'L' ? 0.075 : -0.075, -0.012, 0.0).applyMatrix4(m.clone().invert());
      FRAMES[`${side}:${kind}`] = { m, palm };
    });
  }
  return FRAMES;
}

/** The matrix that puts an item (grip at its origin) in a hand: `kind` sword, shield, bow, wand. */
export function handMatrix(side, kind) {
  const f = FRAMES[`${side}:${kind}`] ?? (side === 'L' ? FRAMES['L:shield'] : FRAMES['R:sword']);
  if (!f) return new THREE.Matrix4();
  const off = kind === 'shield' ? V(0, f.palm.y, f.palm.z) : V(f.palm.x, f.palm.y, f.palm.z);
  return f.m.clone().multiply(new THREE.Matrix4().makeTranslation(off.x, off.y, off.z));
}

/* ------------------------------------------------------------------ fitting a body */

const FIT_BONES = ['Head', 'Neck', 'Spine2', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'Hips'];

/** Measure a template's body round each bone (bind pose): extents relative to the bone. Cached. */
export function fitBody(template) {
  if (template.fit) return template.fit;
  const fit = {};
  const meshes = [];
  template.gltf.scene.traverse((o) => {
    if (o.isSkinnedMesh) meshes.push(o);
  });
  if (!meshes.length) return (template.fit = fit);
  const sk = meshes[0].skeleton;
  const restPos = new Map();
  sk.bones.forEach((b, i) => restPos.set(b.name, V().setFromMatrixPosition(sk.boneInverses[i].clone().invert())));
  const bodyPart = template.parts?.indexOf('body') ?? -1;
  // Quaternius bodies (folkModels.js): a model's own pauldrons, hood, hair and beard don't count toward the body's size.
  const skip = new Set(template.folk ? (template.parts ?? []).map((p, i) => (/pauldron|hood|hair|beard/.test(p) ? i : -1)).filter((i) => i >= 0) : []);
  // A robe's wide sleeves aren't the arm (gloves' cuffs fit the arm under them); its body still counts (a cape hangs outside it).
  const robeParts = new Set((template.parts ?? []).map((p, i) => (/^garment-robe/.test(p) ? i : -1)).filter((i) => i >= 0));
  for (const name of FIT_BONES) {
    const skipHere = /Arm|Hand/.test(name) ? new Set([...skip, ...robeParts]) : skip;
    const bi = sk.bones.findIndex((b) => b.name === name);
    if (bi < 0) continue;
    const box = new THREE.Box3();
    const bodyBox = new THREE.Box3();
    for (const m of meshes) {
      const g = m.geometry;
      const p = g.attributes.position;
      const si = g.attributes.skinIndex;
      const sw = g.attributes.skinWeight;
      const part = g.attributes.aPart;
      for (let i = 0; i < p.count; i++) {
        let best = -1;
        let bw = 0;
        for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > bw) [bw, best] = [sw.getComponent(i, k), si.getComponent(i, k)];
        if (best !== bi) continue;
        if (skipHere.size && part && skipHere.has(Math.round(part.getX(i)))) continue;
        const v = V(p.getX(i), p.getY(i), p.getZ(i)).sub(restPos.get(name));
        box.expandByPoint(v);
        if (part && Math.round(part.getX(i)) === bodyPart) bodyBox.expandByPoint(v);
      }
    }
    fit[name] = { box, body: bodyBox.isEmpty() ? box : bodyBox, at: restPos.get(name) };
  }
  // Lengths between joints.
  const d = (a, b) => (restPos.get(a) && restPos.get(b) ? restPos.get(a).distanceTo(restPos.get(b)) : 0.25);
  fit.len = { upperArm: d('LeftArm', 'LeftForeArm'), foreArm: d('LeftForeArm', 'LeftHand'), thigh: d('LeftUpLeg', 'LeftLeg'), shin: d('LeftLeg', 'LeftFoot'), foot: d('LeftFoot', 'LeftToeBase') };
  fit.shoulderY = restPos.get('LeftArm')?.y ?? 1.4;
  fit.hipY = restPos.get('Hips')?.y ?? 0.95;
  fit.kneeY = restPos.get('LeftLeg')?.y ?? 0.5;
  fit.shoulderX = Math.abs(restPos.get('LeftArm')?.x ?? 0.18);
  return (template.fit = fit);
}

/** A limb's radius across its length: arms run along x (measure y and z), legs, neck and spine stand up (x and z). */
const radiusYZ = (f, k = 1) => (f ? Math.max(0.02, ((f.box.max.y - f.box.min.y + f.box.max.z - f.box.min.z) / 4) * k) : 0.05);
const radiusXZ = (f, k = 1) => (f ? Math.max(0.02, ((f.body.max.x - f.body.min.x + f.body.max.z - f.body.min.z) / 4) * k) : 0.05);
const depthZ = (f) => (f ? Math.max(0.05, -f.box.min.z) : 0.12);

/* ------------------------------------------------------------------ the garments */

/**
 * How each of a model's garments shows, per slot: hidden, or recoloured to
 * what is worn. `split` divides a suit at a height: above is the chest's,
 * below the legs'.
 */
const PART_RULES = {
  'garment-helmet': { hide: () => true },
  'garment-hood': { hide: (e) => BASES[e.head?.base]?.look !== 'hood', tint: (e) => ({ upper: e.head?.look.cloth, mix: 0.9 }) },
  // A model with its own hood wears it down on the shoulders, so the hair still shows.
  'garment-hair': { hide: (e, fit, hero, parts) => Boolean(BASES[e.head?.base]?.hidesHair) && !(BASES[e.head?.base]?.look === 'hood' && parts.includes('garment-hood')) },
  'garment-cape': { hide: () => true },
  'garment-book': { hide: () => true },
  'garment-armour': { tint: (e, fit, hero) => (hero === 'ranger' ? { upper: surface(e.chest, 'chest', 'metal'), mix: 0.85 } : { upper: surface(e.chest, 'chest'), lower: surface(e.legs, 'legs'), split: fit.hipY * 1.02, mix: 0.88 }) },
  // A robe (robeModels.js), shoulders to ankles, is the chest's: dyed its cloth; bare, it's undyed linen without its finery.
  'garment-robe': { tint: (e) => ({ upper: surface(e.chest, 'chest'), mix: 0.85 }) },
  'garment-robe-trim': { hide: (e) => !e.chest, tint: (e) => ({ upper: robeTrim(e.chest), mix: 0.9 }) },
  'garment-robe-over': { hide: (e) => !e.chest, tint: (e) => ({ upper: e.chest && shadeHex(e.chest.look.cloth ?? '#4a3a8a', 0.6), mix: 0.85 }) },
  'garment-robe-inner': { tint: (e) => ({ upper: e.legs?.look.cloth ? shadeHex(e.legs.look.cloth, 1.5) : '#d8d0c0', mix: 0.85 }) },
  'garment-robe-sash': { tint: (e) => ({ upper: e.chest ? robeTrim(e.chest) : '#6a4a30', mix: 0.85 }) },
  // A cloak sewn into the body (robeModels.js buildCloak): the cape slot shows it, in the cape's wool; its bands and clasps in the cape's metal; a fur collar for a mantle, a cloth one for a cloak, none under a hood.
  'garment-cloak': { hide: (e) => !e.cape, tint: (e) => ({ upper: e.cape?.look.cloth, mix: 0.85 }) },
  'garment-cloak-trim': { hide: (e) => !e.cape, tint: (e) => ({ upper: robeTrim(e.cape), mix: 0.9 }) },
  'garment-cloak-collar': { hide: (e) => !e.cape || BASES[e.head?.base]?.look === 'hood', tint: (e) => ({ upper: BASES[e.cape?.base]?.look === 'mantle' ? '#d8cfc0' : e.cape && shadeHex(e.cape.look.cloth ?? '#2e4a8a', 0.8), mix: 0.85 }) },
  'garment-robe-cowl': { hide: (e) => BASES[e.head?.base]?.look === 'hood', tint: (e) => ({ upper: e.chest ? shadeHex(e.chest.look.cloth ?? '#4a3a8a', 1.12) : '#8a7a60', mix: 0.85 }) },
  'garment-tunic': { tint: (e) => ({ upper: e.chest?.look.cloth ?? surface(null, 'chest'), mix: 0.8 }) },
  // Quaternius outfits (folkModels.js): sleeves follow the chest, a model's own pauldrons give way to plate's.
  'garment-sleeves': { tint: (e) => ({ upper: surface(e.chest, 'chest'), mix: 0.82 }) },
  'garment-cowl': { tint: (e) => ({ upper: e.chest?.look.cloth ?? e.head?.look.cloth, mix: 0.8 }) },
  'garment-pauldrons': { hide: (e) => BASES[e.chest?.base]?.look === 'plate' || BASES[e.chest?.base]?.look === 'brigandine', tint: (e) => ({ upper: surface(e.chest, 'chest', 'metal'), mix: 0.8 }) },
  'garment-capelet': { tint: (e) => ({ upper: e.head?.look.cloth ?? e.chest?.look.cloth ?? '#4a4a3a', mix: 0.8 }) },
  'garment-tabard': { tint: (e) => ({ upper: e.cape?.look.cloth ?? '#9a8a6a', mix: 0.85 }) },
  'garment-leggings': { tint: (e) => ({ upper: surface(e.legs, 'legs'), mix: 0.85 }) },
  'garment-gauntlets': { tint: (e) => ({ upper: surface(e.hands, 'hands'), mix: 0.88 }) },
  'garment-bracers': { tint: (e) => ({ upper: surface(e.hands, 'hands'), mix: 0.85 }) },
  'garment-boots': { tint: (e) => ({ upper: surface(e.feet, 'feet'), mix: 0.88 }) },
  'garment-shoes': { tint: (e) => ({ upper: surface(e.feet, 'feet'), mix: 0.85 }) }
};

/** A robe's trims: gold on legendary, silver on epic, the item's own metal otherwise. */
function robeTrim(item) {
  if (!item) return null;
  if (item.rarity === 'legendary') return METALS.gilded.color;
  if (item.rarity === 'epic' || item.rarity === 'rare') return METALS.silver.color;
  // Plainer robes: bronze-gold thread.
  return '#b8924a';
}

/** Bare, when nothing is worn: undyed linen, old leather. */
const BARE = { chest: '#b9a988', legs: '#7d6a50', hands: '#6a4a30', feet: '#4e3a2a' };

/** The colour a piece of armour turns a garment: its metal, leather or cloth. */
function surface(item, slot, prefer = null) {
  if (!item) return BARE[slot];
  const b = BASES[item.base];
  if (b.weight === 'heavy' || prefer === 'metal' && b.weight === 'medium') return METALS[item.look.metal]?.color ?? '#c0c4cc';
  if (['brigandine', 'chausses', 'robe', 'gloves', 'leggings', 'slippers'].includes(b.look)) return item.look.cloth;
  return item.look.leather;
}

/* ------------------------------------------------------------------ the rig */

export class GearRig {
  constructor(actor, template, { hero = 'knight', preview = false, scene = null } = {}) {
    this.scene = scene;
    this.actor = actor;
    this.template = template;
    this.hero = hero;
    this.preview = preview;
    this.fit = fitBody(template);
    this.attached = [];
    this.mats = [];
    this.cape = null;
    this.trail = null;
    this.weapon = null;
    this.tipLocal = null;
    this.baseLocal = null;
    this.equip = {};
    // Each of this hero's skinned meshes gets its own material, so its garments can change alone.
    actor.model.traverse((o) => {
      if (o.isSkinnedMesh) {
        const src = o.material;
        const u = src.userData.char;
        if (!u) return;
        o.material = characterMaterial(src, { detail: u.tDetail.value, rim: u.uRim.value + 0.12, parts: true });
        o.customDepthMaterial = partsDepthMaterial(o.material);
        this.mats.push(o.material);
        if (o.geometry.attributes.aCape) this.capeU = o.material.userData.char.uCape;
      } else if (o.isMesh && BUILT_IN.test(o.name)) o.visible = false;
    });
  }

  /** Put on a set of equipment (the profile's `equip`). */
  dress(equip) {
    this.equip = { ...equip };
    for (const a of this.attached) a.removeFromParent();
    this.attached = [];
    this.weapon = null;
    this.tipLocal = null;
    this.emit = [];
    this._parts(equip);
    const bones = this.actor.gearBones ?? this.actor.bones;
    const fit = this.fit;
    const put = (obj, bone, m = null) => {
      const b = bones[bone];
      if (!b) return null;
      if (m) obj.applyMatrix4(m);
      b.add(obj);
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = !this.preview;
          o.receiveShadow = true;
        }
      });
      this.attached.push(obj);
      return obj;
    };
    // The main hand.
    const main = equip.mainhand;
    if (main) {
      const b = BASES[main.base];
      const bow = b.wtype === 'bow';
      const g = buildItem(main);
      put(g, bow ? 'LeftHand' : 'RightHand', handMatrix(bow ? 'L' : 'R', bow ? 'bow' : b.wtype === 'wand' ? 'wand' : 'sword'));
      this.weapon = { obj: g, item: main, wtype: b.wtype };
      const box = new THREE.Box3().setFromObject(buildItem(main));
      this.tipLocal = V(0, box.max.y * 0.97, 0);
      this.baseLocal = V(0, Math.max(0.12, box.max.y * 0.2), 0);
      if (glows(main.rarity)) this.emit.push({ obj: g, from: this.baseLocal.clone(), to: this.tipLocal.clone(), color: main.look.gem });
    }
    // The off hand.
    const off = equip.offhand;
    if (off) {
      const b = BASES[off.base];
      const g = buildItem(off);
      if (b.kind === 'quiver') put(g, 'Spine2', new THREE.Matrix4().compose(V(0.09, 0.02, -(depthZ(fit.Spine2) + 0.05)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.45)), V(1, 1, 1)));
      else if (b.kind === 'shield') put(g, 'LeftHand', handMatrix('L', 'shield'));
      else put(g, 'LeftHand', handMatrix('L', 'shield').multiply(new THREE.Matrix4().makeRotationX(-0.3)).multiply(new THREE.Matrix4().makeTranslation(0, 0.02, -0.05)));
      if (glows(off.rarity) && b.kind !== 'quiver') this.emit.push({ obj: g, from: V(0, -0.2, 0.03), to: V(0, 0.25, 0.03), color: off.look.gem });
    }
    // The head.
    const head = equip.head;
    const hf = fit.Head?.body ?? fit.Head?.box;
    if (head && hf && !(BASES[head.base].look === 'hood' && this.template.parts?.includes('garment-hood'))) {
      const c = hf.getCenter(V());
      const r = Math.max(hf.max.x - hf.min.x, hf.max.z - hf.min.z) / 2;
      const look = BASES[head.base].look;
      const tune = this.template.gearTune ?? {};
      const k = (look === 'circlet' ? 0.98 : look === 'hood' ? 0.95 : 1.0) * (tune.helmScale ?? 1);
      const g = buildItem(head);
      g.position.copy(c).add(V(0, r * ((look === 'hood' ? -0.12 : look === 'circlet' ? 0.0 : look === 'nasal' ? -0.26 : -0.16) + (tune.helmUp ?? 0)), r * ((look === 'circlet' ? 0.02 : -0.04) + (tune.helmBack ?? 0))));
      g.scale.setScalar(r * k);
      put(g, 'Head');
      if (glows(head.rarity)) this.emit.push({ obj: g, from: V(-0.8, 1.1, 0), to: V(0.8, 1.1, 0), color: head.look.gem });
    }
    // Shoulders and collar.
    const chest = equip.chest;
    if (chest) {
      const look = BASES[chest.base].look;
      const s = radiusYZ(fit.LeftArm) * (look === 'plate' ? 1.08 : 0.98);
      const P = itemPalette(chest);
      if (look === 'plate' || look === 'brigandine' || look === 'jerkin') {
        for (const side of look === 'jerkin' ? ['Left'] : ['Left', 'Right']) {
          const g = pauldron(P, look === 'plate', s);
          g.position.set((side === 'Left' ? 1 : -1) * s * 0.1, s * 0.3, 0);
          if (side === 'Right') g.scale.x = -1;
          put(g, `${side}Arm`);
        }
      }
      if (look === 'plate') {
        const g = gorget(P, fit.shoulderX * 0.4);
        g.position.set(0, -0.015, 0.0);
        g.scale.set(1, 1, 0.9);
        put(g, 'Neck');
      }
      if (glows(chest.rarity)) this.emit.push({ obj: null, bone: 'Spine2', from: V(-0.15, 0.1, 0.12), to: V(0.15, 0.1, 0.12), color: chest.look.gem });
    }
    // Forearms.
    const hands = equip.hands;
    if (hands) {
      const look = BASES[hands.base].look;
      const P = itemPalette(hands);
      const L = fit.len.foreArm;
      const r = radiusYZ(fit.LeftForeArm, 0.95);
      for (const side of ['Left', 'Right']) {
        const g = cuff(P, look, { x0: L * (look === 'gloves' ? 0.9 : 0.42), x1: L * 0.98, r0: r * 0.95, r1: r * 0.9 });
        if (side === 'Right') g.scale.x = -1;
        put(g, `${side}ForeArm`);
      }
    }
    // Knees and thighs.
    const legs = equip.legs;
    // Under a robe (folkModels.js) the legs and feet are hidden: no knee cops or sabatons to poke through it.
    const robed = Boolean(this.template.folk?.robe);
    if (legs && BASES[legs.base].look !== 'leggings' && !robed) {
      const P = itemPalette(legs);
      const heavy = BASES[legs.base].look === 'cuisses';
      const r = Math.min(radiusXZ(fit.LeftLeg, 0.85), fit.shoulderX * 0.34);
      const rt = Math.min(radiusXZ(fit.LeftUpLeg, 0.9), fit.shoulderX * 0.45);
      for (const side of ['Left', 'Right']) {
        const g = knee(P, heavy, r);
        g.position.set(0, 0, r * 0.2);
        if (side === 'Right') g.scale.x = -1;
        put(g, `${side}Leg`);
        if (heavy) {
          const t = cuisse(P, rt, fit.len.thigh);
          if (side === 'Right') t.scale.x = -1;
          put(t, `${side}UpLeg`);
        }
      }
    }
    // Feet.
    const feet = equip.feet;
    if (feet && BASES[feet.base].look !== 'slippers' && !robed) {
      const P = itemPalette(feet);
      const ff = fit.LeftFoot?.box;
      const len = Math.max(0.12, (ff ? ff.max.z - ff.min.z : 0.2) * 0.9);
      const w = ff ? (ff.max.x - ff.min.x) / 2 : 0.05;
      const h = ff ? Math.max(0.04, -ff.min.y) : 0.07;
      for (const side of ['Left', 'Right']) {
        const heavy = BASES[feet.base].look === 'sabatons';
        const g = foot(P, heavy, { len, w: w * 1.02, h });
        g.position.set(0, heavy ? h * 0.15 : 0, heavy ? (ff ? ff.min.z * 0.6 : 0) : 0);
        if (side === 'Right') g.scale.x = -1;
        put(g, `${side}Foot`);
      }
    }
    // The cape.
    this._cape(equip.cape);
    // Trails: every melee weapon trails its swing; the rarer, the brighter.
    const r = main?.rarity;
    this.trailColor = new THREE.Color(r === 'legendary' ? '#ffb040' : r === 'epic' ? '#c070ff' : r === 'rare' ? '#7ab8ff' : '#f0f0ff');
    this.trailStrength = r === 'legendary' ? 1.4 : r === 'epic' ? 1.2 : r === 'rare' ? 0.8 : 0.45;
  }

  _parts(equip) {
    const parts = this.template.parts ?? [];
    const lum = this.template.partLum ?? [];
    for (const m of this.mats) {
      const u = m.userData.char;
      for (let i = 0; i < parts.length; i++) {
        const rule = PART_RULES[parts[i]];
        u.uPartHide.value[i] = rule?.hide?.(equip, this.fit, this.hero, parts) ? 1 : 0;
        const t = rule?.tint?.(equip, this.fit, this.hero);
        const set = (v, hex, mix) => {
          if (!hex) return v.set(1, 1, 1, 0);
          const c = new THREE.Color(hex);
          const k = 1 / Math.max(0.08, lum[i] ?? 0.5);
          v.set(c.r * k, c.g * k, c.b * k, mix);
        };
        set(u.uPartTint.value[i], t?.upper, t?.mix ?? 0.85);
        set(u.uPartTint2.value[i], t?.lower ?? t?.upper, t?.mix ?? 0.85);
        u.uPartSplit.value[i] = t?.split ?? -99;
      }
    }
  }

  /* ------------------------------------------------------------ the cape: cloth */

  _cape(item) {
    if (this.cape) {
      this.cape.mesh.removeFromParent();
      this.cape.mesh.geometry.dispose();
      this.cape = null;
    }
    if (!item) return;
    // A body with its own cloak (Quaternius heroes, robeModels.js): the part rules show it; no cloth to simulate.
    if (this.template.cloak) return;
    const W = 8;
    const H = 12;
    const fit = this.fit;
    const sw = Math.max(0.3, fit.shoulderX * 2.2);
    const len = fit.shoulderY * (BASES[item.base].look === 'mantle' ? 0.55 : 0.78);
    const geo = new THREE.BufferGeometry();
    const n = W * H;
    const pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const idx = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      uv[k * 2] = i / (W - 1);
      uv[k * 2 + 1] = 1 - j / (H - 1);
      if (i < W - 1 && j < H - 1) idx.push(k, k + W, k + 1, k + 1, k + W, k + W + 1);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = heraldryMaterial(item.look.seed, { field: item.look.cloth, cloth: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !this.preview;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    (this.scene ?? this.actor.object.parent ?? this.actor.object).add(mesh);
    const pts = Array.from({ length: n }, () => ({ p: V(), o: V() }));
    this.cape = { mesh, W, H, sw, len, pts, fresh: true, mantle: BASES[item.base].look === 'mantle', item, hem: RARITIES[item.rarity] };
    // Hem and clasps: small pieces on the shoulders.
    const P = itemPalette(item);
    for (const s of [-1, 1]) {
      const clasp = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 14), P.trim);
      clasp.position.set(s * sw * 0.42, 0.13, -depthZ(this.fit.Spine2) * 0.6);
      clasp.castShadow = false;
      (this.actor.gearBones ?? this.actor.bones).Spine2?.add(clasp);
      this.attached.push(clasp);
    }
  }

  /** The cape's pinned edge in the world: across the upper back, under the collar. */
  _anchors(out) {
    const b = (this.actor.gearBones ?? this.actor.bones).Spine2;
    if (!b) return;
    const back = depthZ(this.fit.Spine2) + 0.03;
    const W = this.cape.W;
    for (let i = 0; i < W; i++) {
      const t = i / (W - 1) - 0.5;
      const local = V(t * this.cape.sw, 0.13 + (0.25 - t * t) * 0.06, -back + Math.abs(t) * 0.04);
      out[i] = local.applyMatrix4(b.matrixWorld);
    }
  }

  _simCape(dt, root) {
    const c = this.cape;
    if (!c) return;
    const { W, H, pts } = c;
    root.updateMatrixWorld(true);
    const anchors = [];
    this._anchors(anchors);
    if (!anchors.length) return;
    const restX = c.sw / (W - 1);
    const restY = c.len / (H - 1);
    const down = V(0, -1, 0);
    const back = V(0, 0, -1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
    if (c.fresh) {
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const p = anchors[i].clone().addScaledVector(down, j * restY).addScaledVector(back, j * 0.012);
        pts[j * W + i].p.copy(p);
        pts[j * W + i].o.copy(p);
      }
      c.fresh = false;
    }
    const h = Math.min(dt, 1 / 30);
    const g = 9.8 * h * h;
    const t = performance.now() / 1000;
    for (let k = 0; k < pts.length; k++) {
      const q = pts[k];
      const vx = (q.p.x - q.o.x) * 0.965;
      const vy = (q.p.y - q.o.y) * 0.965;
      const vz = (q.p.z - q.o.z) * 0.965;
      q.o.copy(q.p);
      const j = Math.floor(k / W);
      const flutter = Math.sin(t * 5.5 + k * 0.7) * 0.00025 * j;
      q.p.x += vx + back.x * flutter;
      q.p.y += vy - g;
      q.p.z += vz + back.z * flutter;
    }
    // Pinned top; distance constraints; keep off the body (behind the back, ahead of nothing).
    const inv = root.matrixWorld.clone().invert();
    const toLocal = V();
    const body = depthZ(this.fit.Spine2) * 0.95;
    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < W; i++) pts[i].p.copy(anchors[i]);
      const link = (a, b, rest) => {
        const pa = pts[a].p;
        const pb = pts[b].p;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const dz = pb.z - pa.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const diff = (d - rest) / d * 0.5;
        const wa = a < W ? 0 : 1;
        const wb = b < W ? 0 : 1;
        const s = wa + wb || 1;
        pa.x += dx * diff * (wa * 2 / s);
        pa.y += dy * diff * (wa * 2 / s);
        pa.z += dz * diff * (wa * 2 / s);
        pb.x -= dx * diff * (wb * 2 / s);
        pb.y -= dy * diff * (wb * 2 / s);
        pb.z -= dz * diff * (wb * 2 / s);
      };
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (i < W - 1) link(k, k + 1, restX * (1 + j * 0.03));
        if (j < H - 1) link(k, k + W, restY);
        if (i < W - 1 && j < H - 1) link(k, k + W + 1, Math.hypot(restX, restY));
      }
      for (let k = W; k < pts.length; k++) {
        toLocal.copy(pts[k].p).applyMatrix4(inv);
        const y = toLocal.y;
        // Behind the torso above the hips, a little less behind the legs.
        const limit = y > this.fit.hipY * 0.95 ? -body : -body * 0.55;
        if (toLocal.z > limit) {
          toLocal.z = limit;
          pts[k].p.copy(toLocal.applyMatrix4(root.matrixWorld));
        }
        const ground = root.position.y + 0.04;
        if (pts[k].p.y < ground) pts[k].p.y = ground;
      }
    }
    const pos = c.mesh.geometry.attributes.position;
    for (let k = 0; k < pts.length; k++) pos.setXYZ(k, pts[k].p.x, pts[k].p.y, pts[k].p.z);
    pos.needsUpdate = true;
    c.mesh.geometry.computeVertexNormals();
    c.mesh.geometry.computeBoundingSphere();
  }

  /** Start the cape afresh (after a teleport). */
  settle() {
    if (this.cape) this.cape.fresh = true;
  }

  /* ------------------------------------------------------------ the frame */

  /** The weapon's tip and base in the world (for trails, spells, arrows). */
  weaponPoints(tip = V(), base = V()) {
    if (!this.weapon) return null;
    this.weapon.obj.updateWorldMatrix(true, false);
    tip.copy(this.tipLocal).applyMatrix4(this.weapon.obj.matrixWorld);
    base.copy(this.baseLocal).applyMatrix4(this.weapon.obj.matrixWorld);
    return { tip, base };
  }

  /** Points along glowing gear this frame (for motes): [{ p, color }]. */
  motes(n = 2) {
    const out = [];
    for (const e of this.emit) {
      const holder = e.obj ?? (this.actor.gearBones ?? this.actor.bones)[e.bone];
      if (!holder) continue;
      holder.updateWorldMatrix(true, false);
      for (let i = 0; i < n; i++) {
        const p = e.from.clone().lerp(e.to, Math.random()).applyMatrix4(holder.matrixWorld);
        out.push({ p, color: e.color });
      }
    }
    return out;
  }

  update(dt, root) {
    this._simCape(dt, root);
  }

  dispose() {
    for (const a of this.attached) a.removeFromParent();
    if (this.cape) {
      this.cape.mesh.removeFromParent();
      this.cape.mesh.geometry.dispose();
    }
    for (const m of this.mats) m.dispose();
  }
}

export { FRAMES };
void gearMaterial;
