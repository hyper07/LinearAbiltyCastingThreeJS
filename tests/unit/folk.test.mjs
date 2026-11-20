import { test } from 'node:test';
import assert from 'node:assert/strict';
import { folkRecipe, recipeKey, folkFiles, partName, gameBoneName, sourceBoneMap, HAIR_STYLES, OUTFIT_VARIANTS, SKIN_TONES, FOLK_FILES, ATLAS, TILES, tileFor, atlasUv, robeWeights, CLOTH_SHADES } from '../../src/gloamreach/folk.js';
import { loadFolk, folkAvailable } from '../../src/gloamreach/folkModels.js';
import { HEROES, PEOPLE } from '../../src/gloamreach/cast.js';
import { POLYFORK_MODELS, PACKS } from '../../src/gloamreach/credits.js';

test('folk recipe: the same seed makes the same person; seeds differ; pins win', () => {
  assert.deepEqual(folkRecipe('brann'), folkRecipe('brann'));
  assert.equal(recipeKey(folkRecipe('brann')), recipeKey(folkRecipe('brann')));
  const keys = new Set(Array.from({ length: 40 }, (_, i) => recipeKey(folkRecipe(`v${i}`))));
  assert.ok(keys.size >= 30, `only ${keys.size} looks from 40 seeds`);
  for (let i = 0; i < 100; i++) {
    const r = folkRecipe(`p${i}`);
    assert.ok(['male', 'female'].includes(r.sex));
    assert.ok(HAIR_STYLES[r.sex].includes(r.hair));
    assert.ok(OUTFIT_VARIANTS[r.outfit].includes(r.variant));
    assert.ok(SKIN_TONES.includes(r.skin));
    if (r.sex === 'female') assert.equal(r.beard, false);
  }
  const p = folkRecipe('x', { sex: 'female', hair: 'Buns', outfit: 'ranger', variant: 3, beard: true });
  assert.equal(p.hair, 'Buns');
  assert.equal(p.variant, 3);
  assert.equal(p.beard, false, 'no beards on the female body');
  assert.equal(folkRecipe('y', { sex: 'male', hair: 'Buns' }).hair, HAIR_STYLES.male[0], 'a style the body has no file for falls back');
});

const GREYISH = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) < 24 && r > 120;
};

test('folk atlas: every pack material has a tile; uvs land inside their tile, inside its padding', () => {
  assert.equal(TILES.length, ATLAS.cols * ATLAS.rows);
  assert.equal(tileFor('MI_Superhero_Female'), TILES.indexOf('MI_Superhero_Female'));
  assert.equal(tileFor('MI_Peasant', { outfit: 'peasant', variant: 2 }), TILES.indexOf('peasant-2'));
  assert.equal(tileFor('MI_Ranger', { outfit: 'ranger', variant: 3 }), TILES.indexOf('ranger-3'));
  assert.equal(tileFor('MI_Ranger', { outfit: 'peasant', variant: 2 }), TILES.indexOf('ranger-1'), "a cowl's ranger texture on a peasant");
  assert.equal(tileFor('something else'), TILES.indexOf('cloth'));
  for (let i = 0; i < TILES.length; i++) {
    const c = i % ATLAS.cols;
    const r = Math.floor(i / ATLAS.cols);
    const pad = ATLAS.pad / ATLAS.cell;
    for (const [u, v] of [[0, 0], [1, 1], [0.5, 0.25], [1.5, -0.2]]) {
      const [x, y] = atlasUv(u, v, i);
      assert.ok(x >= (c + pad) / ATLAS.cols - 1e-9 && x <= (c + 1 - pad) / ATLAS.cols + 1e-9, `tile ${i} u ${u}`);
      assert.ok(y >= (r + pad) / ATLAS.rows - 1e-9 && y <= (r + 1 - pad) / ATLAS.rows + 1e-9, `tile ${i} v ${v}`);
    }
  }
});

test('robe weights: hips at the waist, legs at the hem\'s sides, the middle stays put, always summing to 1', () => {
  for (const t of [0, 0.2, 0.5, 0.8, 1]) for (const s of [0, 0.25, 0.5, 0.75, 1]) {
    const w = robeWeights(t, s);
    assert.ok(w.length >= 1 && w.length <= 4);
    assert.ok(Math.abs(w.reduce((a, x) => a + x[1], 0) - 1) < 1e-9);
  }
  assert.deepEqual(robeWeights(0, 0.9).map((x) => x[0]), ['pelvis']);
  assert.equal(robeWeights(1, 0.5)[0][0], 'pelvis', 'front and back middle follow the hips');
  const left = robeWeights(1, 1);
  assert.ok(left.some(([b]) => b === 'calf_l') && !left.some(([b]) => /_r$/.test(b)), 'the left side of the hem follows the left leg');
});

test('folk recipe: NPC outfits get a seeded shade; atlas and full-size templates are told apart', () => {
  const a = folkRecipe('tobin', { atlas: true });
  assert.ok(CLOTH_SHADES.includes(a.shade));
  assert.equal(folkRecipe('tobin').shade, a.shade);
  assert.notEqual(recipeKey(a), recipeKey(folkRecipe('tobin')));
  const shades = new Set(Array.from({ length: 40 }, (_, i) => folkRecipe(`s${i}`).shade));
  assert.ok(shades.size >= 4);
});

test('folk recipe: files and garment names', () => {
  const r = folkRecipe('k', { sex: 'male', hair: 'Long', beard: true, outfit: 'peasant' });
  const files = folkFiles(r);
  assert.ok(files.includes(FOLK_FILES.body('male')));
  assert.ok(files.includes(FOLK_FILES.hair('Long')));
  assert.ok(files.includes(FOLK_FILES.hair('Beard')));
  assert.ok(files.every((f) => f.startsWith('./library/inbox/')));
  assert.equal(partName('SuperHero_Male', 'MI_Superhero_Male'), 'body');
  assert.equal(partName('Male_Ranger_Arms', 'MI_Regular_Male'), 'body');
  assert.equal(partName('Male_Ranger_Arms', 'MI_Ranger'), 'garment-sleeves');
  assert.equal(partName('Hair_Long', 'MI_Hair_2'), 'garment-hair');
  assert.equal(partName('Hair_Beard', 'MI_Hair_1'), 'garment-beard');
  assert.equal(partName('Male_Ranger_Head_Hood', 'MI_Ranger'), 'garment-hood');
  assert.equal(partName('Female_Ranger_Acc_Pauldrons', 'MI_Ranger'), 'garment-pauldrons');
  assert.equal(partName('Male_Peasant_Body', 'MI_Peasant'), 'garment-armour');
  assert.equal(partName('Male_Peasant_Legs', 'MI_Peasant'), 'garment-leggings');
  assert.equal(partName('Male_Ranger_Feet_Boots', 'MI_Ranger'), 'garment-boots');
  assert.equal(partName('Eyes', 'MI_Eyes'), 'eyes');
  assert.equal(partName('Eyebrows', 'MI_Hair_1'), 'brows');
});

test('folk bones: the Unreal mannequin renamed to the game\'s names and mapped back for clips', () => {
  assert.equal(gameBoneName('pelvis'), 'Hips');
  assert.equal(gameBoneName('spine_03'), 'Spine2');
  assert.equal(gameBoneName('upperarm_l'), 'LeftArm');
  assert.equal(gameBoneName('hand_r'), 'RightHand');
  assert.equal(gameBoneName('thigh_r'), 'RightUpLeg');
  assert.equal(gameBoneName('ball_l'), 'LeftToeBase');
  assert.equal(gameBoneName('index_02_l'), 'LeftHandIndex2');
  assert.equal(gameBoneName('thumb_04_leaf_r'), 'RightHandThumb4');
  assert.equal(gameBoneName('root'), 'root');
  const map = sourceBoneMap(['Hips', 'Head', 'LeftHand', 'RightHandIndex1', 'root'], { head: 'head' });
  assert.deepEqual(Object.keys(map)[0], 'Hips', 'hips first (retargetClip reads the first pair as the hips)');
  assert.equal(map.Head, 'head');
  assert.equal(map.LeftHand, 'hand_l');
  assert.equal(map.RightHandIndex1, 'index_01_r');
  assert.equal(map.root, undefined);
});

test('folk: without the packs, loading falls back cleanly (null, no throw)', async () => {
  assert.equal(await folkAvailable(), false);
  assert.equal(await loadFolk(folkRecipe('nobody')), null);
  assert.equal(await loadFolk(folkRecipe('nobody'), { borrow: ['Talk'] }), null);
});

test('folk in the cast: heroes and the first villagers have recipes and a polyfork fallback; Quaternius is credited', () => {
  for (const h of HEROES) {
    assert.ok(h.folk, `${h.id} has a Quaternius recipe`);
    assert.ok(h.model, `${h.id} keeps its polyfork model as the fallback`);
    const r = folkRecipe(h.id, h.folk);
    assert.ok(HAIR_STYLES[r.sex].includes(r.hair));
  }
  // Everyone in the villages and hubs of all three zones.
  for (const p of PEOPLE) {
    assert.ok(p.folk, `${p.id} has a Quaternius recipe`);
    assert.ok(p.model, `${p.id} keeps a polyfork fallback`);
    const r = folkRecipe(p.id, { ...p.folk, atlas: true });
    assert.ok(HAIR_STYLES[r.sex].includes(r.hair), p.id);
    assert.ok(OUTFIT_VARIANTS[r.outfit].includes(r.variant), p.id);
  }
  // Identities kept where they matter: the mage in a violet robe and cowl, Old Nan stooped with a cane.
  const mage = HEROES.find((h) => h.id === 'mage').folk;
  assert.ok(mage.robe && mage.cowl);
  const nan = folkRecipe('nan', PEOPLE.find((p) => p.id === 'nan').folk);
  assert.equal(nan.age, 'elder');
  assert.ok(nan.stoop > 0.3 && nan.cane && nan.cowl);
  assert.ok(GREYISH(nan.hairColour));
  assert.ok(PACKS.some((p) => p.name === 'Quaternius' && /CC0/.test(p.licence) && p.site === 'https://quaternius.com'), 'Quaternius packs in the credits');
  assert.ok(POLYFORK_MODELS.length > 0);
});
