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
 *
 * With a robe, its make (robeStyle; pins win, the seed picks the rest):
 * trim (a hex: the bands at the hem, cuffs, collar and front), pattern
 * (the trims' embroidery, ROBE_PATTERNS), sleeves (ROBE_SLEEVES), collar
 * (ROBE_COLLARS), open (a front opening over an under-robe), over (ROBE_OVERS:
 * a stole, a mantle on the shoulders, or a scapular), overColour, sash (a hex),
 * inner (the under-robe at the neck and the front). A cowl on a robe is drawn
 * as a hood lying down on the shoulders.
 *
 * A cloak (knights, guards, captains — never a robe with it unless asked):
 * cloak (a hex: its wool), and its make (cloakStyle): cloakTrim (the edge
 * band and clasps), cloakFur (a hex for a fur collar, or null for a cloth
 * one), emblem (the Gilded Acorn on the back), cloakBack (metres it stands
 * off the back, for a quiver under it).
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
  const out = { ...recipe, ...ROBE_NONE, cloak: null, ...CLOAK_NONE, ...pins };
  if (out.sex === 'female') out.beard = false;
  if (!HAIR_STYLES[out.sex].includes(out.hair) && out.hair !== 'none') out.hair = HAIR_STYLES[out.sex][0];
  if (out.robe) Object.assign(out, robeStyle(seed, out.robe, pins));
  if (out.cloak) Object.assign(out, cloakStyle(seed, pins));
  return out;
}

/* ------------------------------------------------------------------ cloaks */

const CLOAK_NONE = { cloakTrim: null, cloakFur: null, emblem: false, cloakBack: 0 };
/** Fur collars: pale, grey, brown. */
export const FUR_COLOURS = ['#d8cfc0', '#8a8278', '#6a5240'];

/** A cloak's make from a seed; `pins` fix any field. */
export function cloakStyle(seed, pins = {}) {
  const r = stream(`cloak:${seed}`);
  const style = { cloakTrim: pick(r, ['#c9a24a', '#c4c8d0', '#a8743e']), cloakFur: r() < 0.4 ? pick(r, FUR_COLOURS) : null, emblem: false, cloakBack: 0 };
  for (const k of Object.keys(style)) if (pins[k] !== undefined) style[k] = pins[k];
  return style;
}

/** The garments a cloak is drawn as (gearRig.js PART_RULES: the cape slot shows, dyes and trims them). */
export const CLOAK_PARTS = ['garment-cloak', 'garment-cloak-trim', 'garment-cloak-collar'];

/** What a cloaked recipe's cloak is made of; null without one. */
export function cloakKit(recipe) {
  if (!recipe?.cloak) return null;
  const pieces = ['back', 'lining', 'collar', 'clasp-l', 'clasp-r', 'chain', 'hem-trim', 'edge-l', 'edge-r'];
  if (recipe.emblem) pieces.push('emblem');
  return { pieces, fur: Boolean(recipe.cloakFur), metal: isMetalTrim(recipe.cloakTrim), colours: { 'garment-cloak': recipe.cloak, 'garment-cloak-trim': recipe.cloakTrim, 'garment-cloak-collar': recipe.cloakFur ?? recipe.cloak } };
}

/**
 * How far a cloak's swing bone turns toward hanging plumb (1) rather than
 * with the upper back (0): mostly plumb, so leaning into a blow doesn't
 * press the cloak into the legs behind.
 */
export const CLOAK_PLUMB = 0.6;
/** Hanging from the shoulders: how far it trails (radians per m/s of ground speed) and its limits back and forward. */
export const CLOAK_TRAIL = { perSpeed: 0.075, max: 0.5, min: -0.04 };

/* ------------------------------------------------------------------ robes */

/** The trims' embroidery: a row each of the cloth tile (matte thread and metal thread). */
export const ROBE_PATTERNS = ['plain', 'key', 'vine', 'stars', 'runes', 'leaves'];
/** Bell (wide at the wrist), angel (wide and long, hanging below the arm), fitted. */
export const ROBE_SLEEVES = ['bell', 'angel', 'fitted'];
/** A V with the under-robe showing, a round neckband, a standing collar. */
export const ROBE_COLLARS = ['v', 'round', 'high'];
/** Over the robe: nothing, a stole (a long band round the neck and down the front), a short mantle, a scapular (panels front and back). */
export const ROBE_OVERS = ['none', 'stole', 'mantle', 'scapular'];
/** Trim colours: gold, silver, bronze (metal thread), ivory, wine, night blue. */
export const TRIM_COLOURS = ['#c9a24a', '#c4c8d0', '#a8743e', '#e2d6b6', '#7a2a2e', '#2a3a5a'];
/** Trims in these colours are stitched in metal thread (they shine). */
const METAL_TRIMS = new Set(['#c9a24a', '#c4c8d0', '#a8743e', '#d8b45a']);
export const isMetalTrim = (hex) => METAL_TRIMS.has(String(hex).toLowerCase());
/** Sashes and cords. */
export const SASH_COLOURS = ['#c9a24a', '#6a3a24', '#7a2a2e', '#e2d6b6', '#2a2a3a', '#4a5a3a'];
/** Under-robes. */
export const INNER_COLOURS = ['#e8e0cc', '#d8cfb8', '#c8b898', '#a89878'];
const ROBE_NONE = { trim: null, pattern: null, sleeves: null, collar: null, open: false, over: null, overColour: null, sash: null, inner: null };

/** A hex colour scaled toward black (k < 1) or white (k > 1). */
export function shadeHex(hex, k) {
  const c = [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16));
  const out = c.map((x) => Math.round(Math.max(0, Math.min(255, k <= 1 ? x * k : x + (255 - x) * (k - 1)))));
  return `#${out.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** A robe's make from a seed (the person's id) and its colour; `pins` fix any field. */
export function robeStyle(seed, robe, pins = {}) {
  const r = stream(`robe:${seed}`);
  const style = {
    trim: pick(r, TRIM_COLOURS),
    pattern: pick(r, ROBE_PATTERNS),
    sleeves: pick(r, ROBE_SLEEVES.slice(0, 2)),
    collar: pick(r, ROBE_COLLARS),
    open: r() < 0.4,
    over: pick(r, ROBE_OVERS),
    overColour: shadeHex(robe, 0.62),
    sash: pick(r, SASH_COLOURS),
    inner: pick(r, INNER_COLOURS)
  };
  for (const k of Object.keys(style)) if (pins[k] !== undefined && pins[k] !== null) style[k] = pins[k];
  if (!ROBE_PATTERNS.includes(style.pattern)) style.pattern = 'plain';
  if (!ROBE_SLEEVES.includes(style.sleeves)) style.sleeves = 'bell';
  if (!ROBE_COLLARS.includes(style.collar)) style.collar = 'round';
  if (!ROBE_OVERS.includes(style.over)) style.over = 'none';
  return style;
}

/** The garments a robe is drawn as (gearRig.js PART_RULES colour or hide each). */
export const ROBE_PARTS = ['garment-robe', 'garment-robe-trim', 'garment-robe-inner', 'garment-robe-over', 'garment-robe-sash', 'garment-robe-cowl'];

/**
 * What a robed recipe is built from (folkModels.js robeModels builds it):
 * which pieces, and which garment each colour goes to. Null without a robe.
 */
export function robeKit(recipe) {
  if (!recipe?.robe) return null;
  const pieces = ['body', 'skirt', 'sleeve-l', 'sleeve-r', 'hem-trim', 'cuff-l', 'cuff-r', 'sash', 'sash-tails'];
  pieces.push(recipe.collar === 'v' ? 'v-neck' : 'collar');
  if (recipe.collar === 'v' || recipe.open) pieces.push('inner');
  if (recipe.open) pieces.push('front-trim');
  if (recipe.over && recipe.over !== 'none') pieces.push(recipe.over);
  if (recipe.cowl) pieces.push('cowl');
  return {
    pieces,
    sleeves: recipe.sleeves,
    metal: isMetalTrim(recipe.trim),
    colours: { 'garment-robe': recipe.robe, 'garment-robe-trim': recipe.trim, 'garment-robe-inner': recipe.inner, 'garment-robe-over': recipe.overColour, 'garment-robe-sash': recipe.sash, 'garment-robe-cowl': recipe.cowl ?? null }
  };
}

/**
 * The 'cloth' tile of the atlas, split: the woven cloth on top (robes, cowls,
 * sashes), then a row per embroidered trim, matte thread first, then metal
 * thread. v ranges inside the tile (0 top … 1 bottom).
 */
export const CLOTH_WEAVE = [0, 0.18];
/** A square for an embroidered device (the Gilded Acorn) on a cloak's back: [u0, u1, v0, v1] of the cloth tile. */
export const EMBLEM = [0.01, 0.125, 0.19, 0.305];
export const TRIM_ROWS = [0.32, 1];
export function trimRow(pattern, metal = false) {
  const n = ROBE_PATTERNS.length * 2;
  const i = Math.max(0, ROBE_PATTERNS.indexOf(pattern)) + (metal ? ROBE_PATTERNS.length : 0);
  const h = (TRIM_ROWS[1] - TRIM_ROWS[0]) / n;
  // A little inside the row, so filtering never reaches the next one.
  return [TRIM_ROWS[0] + h * i + h * 0.1, TRIM_ROWS[0] + h * (i + 1) - h * 0.1];
}
/** Motifs across one trim row (each quad of a trim strip shows one). */
export const TRIM_MOTIFS = 16;

/** One key per distinct look (people who'd look the same share a template). */
export function recipeKey(r) {
  return ['folk', r.sex, r.skin, r.hair, r.hairColour, r.beard ? 'beard' : '-', r.outfit, r.variant, r.cloth ?? '-', r.shade ?? '-', r.hood ? 'hood' : '-', r.idle ?? '-', r.robe ?? '-', r.cowl ?? '-', r.stoop ?? 0, r.cane ? 'cane' : '-', r.atlas ? 'atlas' : 'full', ...(r.robe ? [r.trim, r.pattern, r.sleeves, r.collar, r.open ? 'open' : 'closed', r.over, r.overColour, r.sash, r.inner] : []), ...(r.cloak ? ['cloak', r.cloak, r.cloakTrim, r.cloakFur ?? '-', r.emblem ? 'emblem' : '-', r.cloakBack ?? 0] : [])].join('|');
}

/** Every file a recipe needs (to check the packs are there before building). */
export function folkFiles(r) {
  return [FOLK_FILES.body(r.sex), FOLK_FILES.outfit(r.sex, r.outfit), r.hair !== 'none' ? FOLK_FILES.hair(r.hair) : null, r.beard ? FOLK_FILES.hair('Beard') : null, FOLK_FILES.animations, r.cowl && !r.robe && r.outfit !== 'ranger' ? FOLK_FILES.outfit(r.sex, 'ranger') : null].filter(Boolean);
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

/** Robe-wearers walk with smaller steps: how much of the clip's hip and knee swing they keep. */
export const ROBE_STRIDE = 0.7;

/** What a robe covers, and so is never drawn under one (nothing can poke through what isn't there): the top, trousers and boots. */
export const UNDER_ROBE = ['garment-armour', 'garment-leggings', 'garment-boots'];
export const hiddenUnderRobe = (part, recipe) => Boolean(recipe?.robe) && UNDER_ROBE.includes(part);

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
  // A bell that hangs from the hips: the front and back middle stay with them, the sides only sway a
  // little with the thighs (and hardly the shins), so a stride never folds the cloth or splits it.
  const sideness = Math.pow(Math.min(1, Math.abs(s - 0.5) * 2), 1.2);
  const hip = 1 - smooth(0.1, 0.7, t) * 0.3 * sideness;
  const rest = 1 - hip;
  const shin = smooth(0.6, 1, t) * 0.15;
  const w = [['pelvis', hip], ['thigh_l', rest * s * (1 - shin)], ['calf_l', rest * s * shin], ['thigh_r', rest * (1 - s) * (1 - shin)], ['calf_r', rest * (1 - s) * shin]];
  const top = w.filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((a, x) => a + x[1], 0) || 1;
  return top.map(([b, x]) => [b, x / sum]);
}

/**
 * The skirt's skin weights below the hip joints, at height t (0 at the hip
 * joints, 1 at the hem), side s (0 right … 1 left) and front f (0 back … 1
 * front). Two bones of the robe's own (folkModels.js adds them; Actor.robeSway
 * turns them each frame) carry it: RobeLap, at the hip joints, turned with
 * the thighs' average (so the front lies over the lap when sitting, and a
 * stride, one leg forward and one back, leaves it be), and RobeHem, at the
 * knees under it, kept hanging plumb and swinging on a spring. The sides keep
 * a little of each thigh (robeWeights), so the cloth moves with the stride.
 * Returns [[bone, weight]…], the strongest four, summing to 1.
 */
export function skirtWeights(t, s, f) {
  const smooth = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const legs = robeWeights(Math.max(0, t), s).filter(([b]) => b !== 'pelvis');
  const legW = legs.reduce((a, x) => a + x[1], 0);
  const hem = smooth(0.32, 0.8, t) * 0.92;
  const lap = (1 - hem) * Math.pow(Math.max(0, f), 1.6) * smooth(-0.05, 0.3, t) * 0.95;
  const rest = Math.max(0, 1 - hem - lap);
  const w = [['RobeHem', hem], ['RobeLap', lap], ['pelvis', rest * (1 - legW)], ...legs.map(([b, x]) => [b, rest * x])];
  const top = w.filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((a, x) => a + x[1], 0) || 1;
  return top.map(([b, x]) => [b, x / sum]);
}

/** The robe's half-widths (x across, z front to back) at height t (0 waist … 1 hem): a bell, wide enough at the hem for a stride. */
export function robeProfile(t, hx) {
  const flare = t * t * 0.8 + t * 0.25;
  return [hx + flare * 0.2, 0.12 + flare * 0.27];
}
