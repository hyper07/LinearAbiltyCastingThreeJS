/**
 * Gloamreach's people from Quaternius's packs (CC0, https://quaternius.com):
 * a Universal Base Characters body (its modelled, textured head and eyes), a
 * hairstyle rigged to the head bone, an outfit from Modular Character
 * Outfits – Fantasy, and colours — all on the Unreal-mannequin rig that the
 * Universal Animation Library and our Mesh2Motion clips also use.
 *
 * This file is the pure part: what a person is made of (a recipe, the same
 * for the same seed), which file each piece comes from, what each mesh is
 * called in the game's garment rules, and the bone names the rest of the
 * game knows. folkModels.js puts them together in three.js.
 *
 * The packs are downloaded by hand into library/inbox/ (docs/gloamreach.md);
 * without them every person falls back to the polyfork characters.
 */

const INBOX = './library/inbox/';
const UBC = `${INBOX}Universal Base Characters[Standard]/`;
const OUTFITS = `${INBOX}Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/`;

/** Where each piece lives. */
export const FOLK_FILES = {
  body: (sex) => `${UBC}Base Characters/Godot - UE/Superhero_${sex === 'female' ? 'Female' : 'Male'}_FullBody.gltf`,
  hair: (style) => `${UBC}Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_${style}.gltf`,
  outfit: (sex, kind) => `${OUTFITS}Outfits/${sex === 'female' ? 'Female' : 'Male'}_${kind === 'ranger' ? 'Ranger' : 'Peasant'}.gltf`,
  outfitTexture: (kind, variant) => `${INBOX}Modular Character Outfits - Fantasy[Standard]/Textures/${kind === 'ranger' ? 'Ranger' : 'Peasant'}/T_${kind === 'ranger' ? 'Ranger' : 'Peasant'}${variant > 1 ? `_${variant}` : ''}_BaseColor.png`,
  animations: `${INBOX}Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb`
};

/** Hairstyles in the free pack, and which suit whom. */
export const HAIR_STYLES = { male: ['SimpleParted', 'Buzzed', 'Long'], female: ['Long', 'Buns', 'BuzzedFemale', 'SimpleParted'] };
/** Outfit textures in the free pack: Peasant 1 and 2, Ranger 1 and 3. */
export const OUTFIT_VARIANTS = { peasant: [1, 2], ranger: [1, 3] };
/** Skin tones (sRGB), fair to deep. */
export const SKIN_TONES = ['#f0d2bc', '#e6bf9f', '#d9a982', '#c48d66', '#a8714d', '#86563a', '#69402c'];
/** Hair colours: dark to fair, red, and grey for elders. */
export const HAIR_COLOURS = ['#20160f', '#3a2618', '#5a3a22', '#7a5230', '#a8743e', '#d0aa6a', '#8a3a1e', '#b8551f'];
export const GREY_HAIR = ['#c8c4bc', '#a8a49c', '#e2ded6', '#8a8680'];
/** Shades over an outfit's own colours (NPCs): as made, sun-faded, warm, cool, dark, olive. */
export const CLOTH_SHADES = ['#ffffff', '#f4ecdc', '#ffe2d0', '#dce6f4', '#c8c0b8', '#e8f0d4'];

/** FNV-1a: a string to 32 bits. */
export function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seeded 0…1 stream (mulberry32). */
export function stream(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

/**
 * A person from a seed (an id from the cast). `pins` fix any field:
 * sex ('male' | 'female'), age ('adult' | 'elder'), skin, hair (a style),
 * hairColour, beard (true/false), outfit ('peasant' | 'ranger'), variant,
 * cloth (a hex dye over the outfit, or null for its own colours), hood,
 * idle (a Universal Animation Library clip for standing, e.g. 'Sword_Idle'),
 * robe (a hex colour: a long robe over the legs, skinned to hips and legs),
 * cowl (a hex colour: the ranger's hood worn as a hood or shawl, on any
 * outfit), stoop (radians the spine bends forward: age), cane (true).
 */
export function folkRecipe(seed, pins = {}) {
  const r = stream(`folk:${seed}`);
  const sex = pins.sex ?? (r() < 0.5 ? 'male' : 'female');
  const age = pins.age ?? 'adult';
  const outfit = pins.outfit ?? (r() < 0.7 ? 'peasant' : 'ranger');
  const recipe = {
    seed: String(seed),
    sex,
    age,
    skin: SKIN_TONES[Math.floor(r() * SKIN_TONES.length)],
    hair: pick(r, HAIR_STYLES[sex]),
    hairColour: age === 'elder' ? pick(r, GREY_HAIR) : pick(r, HAIR_COLOURS),
    beard: sex === 'male' && r() < (age === 'elder' ? 0.7 : 0.35),
    outfit,
    variant: pick(r, OUTFIT_VARIANTS[outfit]),
    cloth: null,
    shade: pick(r, CLOTH_SHADES),
    hood: false,
    robe: null,
    cowl: null,
    stoop: age === 'elder' ? 0.22 : 0,
    cane: false
  };
  const out = { ...recipe, ...pins };
  if (out.sex === 'female') out.beard = false;
  if (!HAIR_STYLES[out.sex].includes(out.hair) && out.hair !== 'none') out.hair = HAIR_STYLES[out.sex][0];
  return out;
}

/** One key per distinct look (people who'd look the same share a template). */
export function recipeKey(r) {
  return ['folk', r.sex, r.skin, r.hair, r.hairColour, r.beard ? 'beard' : '-', r.outfit, r.variant, r.cloth ?? '-', r.shade ?? '-', r.hood ? 'hood' : '-', r.idle ?? '-', r.robe ?? '-', r.cowl ?? '-', r.stoop ?? 0, r.cane ? 'cane' : '-', r.atlas ? 'atlas' : 'full'].join('|');
}

/** Every file a recipe needs (to check the packs are there before building). */
export function folkFiles(r) {
  return [FOLK_FILES.body(r.sex), FOLK_FILES.outfit(r.sex, r.outfit), r.hair !== 'none' ? FOLK_FILES.hair(r.hair) : null, r.beard ? FOLK_FILES.hair('Beard') : null, FOLK_FILES.animations, r.cowl && r.outfit !== 'ranger' ? FOLK_FILES.outfit(r.sex, 'ranger') : null].filter(Boolean);
}

/**
 * The garment name a pack's mesh gets in the game (gearRig.js PART_RULES
 * reads these: helmets hide `garment-hair`, a hood shows only when a hood is
 * worn, armour recolours the chest and legs). `material` decides skin.
 */
export function partName(mesh, material = '') {
  if (/Superhero|Regular_(Male|Female)/i.test(material)) return 'body';
  if (/^Eyes?$|MI_Eyes/i.test(mesh) || /MI_Eyes/i.test(material)) return 'eyes';
  if (/Eyebrows/i.test(mesh)) return 'brows';
  if (/Beard/i.test(mesh)) return 'garment-beard';
  if (/^Hair_/i.test(mesh)) return 'garment-hair';
  if (/Hood/i.test(mesh)) return 'garment-hood';
  if (/Pauldron/i.test(mesh)) return 'garment-pauldrons';
  if (/Bracer/i.test(mesh)) return 'garment-bracers';
  if (/Belt/i.test(mesh)) return 'garment-belt';
  if (/Arms/i.test(mesh)) return 'garment-sleeves';
  if (/Legs/i.test(mesh)) return 'garment-leggings';
  if (/Feet|Boots/i.test(mesh)) return 'garment-boots';
  if (/Body/i.test(mesh)) return 'garment-armour';
  return 'garment-other';
}

/** Unreal-mannequin bone names → the names Gloamreach's code uses (Mixamo's, without the prefix). */
export function gameBoneName(name) {
  const fixed = { pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck_01: 'Neck', Head: 'Head', head: 'Head' };
  if (fixed[name]) return fixed[name];
  const m = /^(clavicle|upperarm|lowerarm|hand|thigh|calf|foot|ball|ball_leaf)_([lr])$/.exec(name);
  if (m) {
    const side = m[2] === 'l' ? 'Left' : 'Right';
    return side + { clavicle: 'Shoulder', upperarm: 'Arm', lowerarm: 'ForeArm', hand: 'Hand', thigh: 'UpLeg', calf: 'Leg', foot: 'Foot', ball: 'ToeBase', ball_leaf: 'Toe_End' }[m[1]];
  }
  const f = /^(thumb|index|middle|ring|pinky)_0(\d)(?:_leaf)?_([lr])$/.exec(name);
  if (f) return `${f[3] === 'l' ? 'Left' : 'Right'}Hand${f[1][0].toUpperCase()}${f[1].slice(1)}${f[2]}`;
  return name;
}

/** The game's bone name → the Unreal-mannequin name in a clip's source (UAL: 'Head'; Mesh2Motion: 'head'). */
export function sourceBoneMap(gameNames, { head = 'Head' } = {}) {
  const back = {};
  const all = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01'];
  for (const s of ['l', 'r']) {
    for (const b of ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball']) all.push(`${b}_${s}`);
    for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) for (let i = 1; i <= 3; i++) all.push(`${f}_0${i}_${s}`);
  }
  for (const u of all) back[gameBoneName(u)] = u;
  back.Head = head;
  const out = {};
  for (const n of gameNames) if (back[n]) out[n] = back[n];
  return out;
}

/** Whether a cast entry asks for a Quaternius body. */
export const wantsFolk = (c) => Boolean(c?.folk);

/**
 * The atlas (folkModels.js): every pack texture an NPC can wear, one tile
 * each, so a whole person is one material and one draw. `tileFor` picks the
 * tile from a pack material's name (and the outfit's texture variant).
 */
export const ATLAS = { cols: 4, rows: 3, cell: 1024, small: 512, pad: 10 };
export const TILES = ['MI_Superhero_Male', 'MI_Superhero_Female', 'MI_Regular_Male', 'MI_Regular_Female', 'MI_Hair_1', 'MI_Hair_2', 'MI_Eyes', 'peasant-1', 'peasant-2', 'ranger-1', 'ranger-3', 'cloth'];
export function tileFor(material, { outfit = 'peasant', variant = 1 } = {}) {
  if (/^MI_Peasant/.test(material)) return TILES.indexOf(`peasant-${outfit === 'peasant' ? variant : 1}`);
  if (/^MI_Ranger/.test(material)) return TILES.indexOf(`ranger-${outfit === 'ranger' ? variant : 1}`);
  const i = TILES.indexOf(material);
  return i >= 0 ? i : TILES.indexOf('cloth');
}

/** A uv inside tile `i` (with its padding), for an atlas `cols`×`rows` (uv in 0…1, flipY off: v down from the top). */
export function atlasUv(u, v, i, { cols, rows, cell, pad } = ATLAS) {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const inner = (cell - pad * 2) / cell;
  const fu = Math.min(1, Math.max(0, u - Math.floor(u === 1 ? 0 : u)));
  const fv = Math.min(1, Math.max(0, v - Math.floor(v === 1 ? 0 : v)));
  return [(c + pad / cell + fu * inner) / cols, (r + pad / cell + fv * inner) / rows];
}

/**
 * Robe skin weights for a point at height t (0 at the waist, 1 at the hem)
 * and side s (0 right … 1 left): the hips at the top, handing over to each
 * thigh and then shin below, so the robe swings with the legs. Returns
 * [[bone, weight]…] (the strongest four, summing to 1).
 */
export function robeWeights(t, s) {
  const smooth = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  // The front and back middle stay with the hips (no splitting down the centre); the sides follow the legs.
  const sideness = Math.pow(Math.min(1, Math.abs(s - 0.5) * 2), 0.8);
  const hip = 1 - smooth(0.05, 0.6, t) * 0.5 * sideness;
  const rest = 1 - hip;
  const shin = smooth(0.55, 1, t) * 0.35;
  const w = [['pelvis', hip], ['thigh_l', rest * s * (1 - shin)], ['calf_l', rest * s * shin], ['thigh_r', rest * (1 - s) * (1 - shin)], ['calf_r', rest * (1 - s) * shin]];
  const top = w.filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((a, x) => a + x[1], 0) || 1;
  return top.map(([b, x]) => [b, x / sum]);
}
