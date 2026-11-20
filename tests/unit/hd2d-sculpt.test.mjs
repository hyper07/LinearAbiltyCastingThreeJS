import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBOS, SKILLS, CLASS_ORDER, LOOKS } from '../../src/hd2d/classes.js';
import { ATTACH, gearLook } from '../../src/hd2d/items.js';
import { NPCS, startingGear } from '../../src/hd2d/rules.js';
import { RIG_POSES, JOINT_BONES, heroExpression, beastExpression, gearSockets, weaponLength } from '../../src/hd2d/sculpt/mapping.js';
import { personDesc, personRecipe, shapeKey, faceKey, bodyPlan, HAIRS } from '../../src/hd2d/sculpt/people.js';
import { BEAST_RECIPES, seeded } from '../../src/hd2d/sculpt/beasts.js';
import { compile, sculpt, sculptArrays, smin, hexToLinear, FAB } from '../../src/hd2d/sculpt/sdf.js';
import { EXPRESSIONS } from '../../src/hd2d/sculpt/face.js';
import { sculptedGear, GEAR_SHAPES, smoothCapeGeometry, CAPE_STEP } from '../../src/hd2d/sculpt/gear.js';
import { readFileSync } from 'node:fs';

/* ------------------------------------------------------------ poses → the new rig */

test('sculpt mapping: every combo and skill pose the game plays is one the rig poses', () => {
  for (const [weapon, combo] of Object.entries(COMBOS)) for (const step of combo) assert.ok(RIG_POSES.has(step.pose), `${weapon}: ${step.pose}`);
  for (const [id, s] of Object.entries(SKILLS)) if (s.pose) assert.ok(RIG_POSES.has(s.pose), `${id}: ${s.pose}`);
  // The rig's joints are the sculpted skeleton's bones.
  const bones = new Set(personRecipe(personDesc({})).bones.map((b) => b[0]));
  for (const bone of Object.values(JOINT_BONES)) assert.ok(bones.has(bone), bone);
});

test('sculpt mapping: faces follow what the body does', () => {
  assert.equal(heroExpression({ move: 1 }), 'neutral');
  assert.equal(heroExpression({ swing: { pose: 'sweepR', t: 0.4 } }), 'fierce');
  assert.equal(heroExpression({ swing: { pose: 'bolt', t: 0.4 } }), 'focus');
  assert.equal(heroExpression({ pose: { id: 'nova', t: 0.3 } }), 'focus');
  assert.equal(heroExpression({ pose: { id: 'overhead', t: 0.3 } }), 'fierce');
  assert.equal(heroExpression({ spin: 0.5 }), 'fierce');
  assert.equal(heroExpression({ guard: true }), 'fierce');
  assert.equal(heroExpression({ hurt: 0.8, swing: { pose: 'sweepR', t: 0.2 } }), 'hurt');
  assert.equal(heroExpression({ dead: true, hurt: 1 }), 'ko');
  assert.equal(heroExpression({ talk: true }), 'talk');
  assert.equal(heroExpression({ roll: 0.4 }), 'surprised');
  assert.equal(heroExpression({}, { hostile: true }), 'mean');
  assert.equal(heroExpression({ swing: { pose: 'smash', t: 0.5 } }, { hostile: true }), 'roar');
  assert.equal(beastExpression({ move: 1 }), 'mean');
  assert.equal(beastExpression({ wind: 0.5 }), 'angry');
  assert.equal(beastExpression({ strike: true, wind: 0.5 }), 'roar');
  assert.equal(beastExpression({ hurt: 0.9 }), 'hurt');
  assert.equal(beastExpression({ stun: true, strike: true }), 'dizzy');
  for (const e of ['neutral', 'fierce', 'focus', 'hurt', 'ko', 'talk', 'surprised', 'mean', 'roar', 'angry', 'dizzy']) assert.ok(EXPRESSIONS[e], e);
});

/* ------------------------------------------------------------ gear sockets */

test('sculpt mapping: gear sockets give the voxel figure its old places exactly', () => {
  const J = { armLength: 0.52, shoulderY: 0.46, legLen: 0.27 };
  const hand = J.armLength - 0.06;
  const K = gearSockets(J);
  assert.deepEqual(K.weapon, { joint: 'armNeg', pos: [-0, -hand, 0.04], rot: [-0.35, 0, 0] });
  assert.deepEqual(K.bow.pos, [0.02, -hand, 0.06]);
  assert.deepEqual(K.shield.pos, [0.15, -hand * 0.62, 0.02]);
  assert.deepEqual(K.tome.pos.map((v) => +v.toFixed(6)), [0.1, +(-hand + 0.05).toFixed(6), 0.08]);
  assert.deepEqual(K.quiver, { joint: 'torso', pos: [0.18, J.shoulderY - 0.1, -0.34], rot: [0, 0, -0.35] });
  assert.deepEqual(K.cape.pos, [0, J.shoulderY + 0.02, -0.34]);
  assert.deepEqual(K.handNeg.pos, [-0, -hand, 0.03]);
  assert.deepEqual(K.footPos.pos, [0, -0.27, -0.02]);
  assert.equal(weaponLength('spear'), 1.55);
  assert.equal(weaponLength('shortsword'), 0.86);
});

test('sculpt mapping: on a sculpted figure the weapon sits in the fist and every socket is on a bone', () => {
  for (const build of ['slim', 'broad']) {
    const P = bodyPlan(build);
    const J = { armLength: P.armLength, shoulderY: P.joints.armNeg[1] - P.joints.torso[1], legLen: P.legLen, fist: P.hand, backZ: P.backZ };
    const K = gearSockets(J);
    assert.deepEqual(K.weapon.pos, [-P.hand[0], P.hand[1], P.hand[2] + 0.01]);
    assert.deepEqual(K.handPos.pos, P.hand);
    assert.ok(K.cape.pos[2] < -P.bz && K.cape.pos[2] > -P.bz - 0.12, 'the cape hangs just behind the back');
    const bones = new Set(personRecipe(personDesc({ build })).bones.map((b) => b[0]));
    for (const [name, s] of Object.entries(K)) assert.ok(bones.has(JOINT_BONES[s.joint]), `${name} on ${s.joint}`);
  }
  // Every joint gear is attached to (items.js ATTACH) is a bone of the sculpted person.
  const bones = new Set(personRecipe(personDesc({})).bones.map((b) => b[0]));
  for (const [what, joint] of Object.entries(ATTACH)) assert.ok(bones.has(JOINT_BONES[joint]), `${what} → ${joint}`);
});

/* ------------------------------------------------------------ descriptions and recipes */

test('sculpt people: gear changes the shape the way it changed the look', () => {
  const look = LOOKS.blade[0];
  const bare = personDesc(look, null, { cls: 'blade' });
  assert.equal(bare.headwear, 'none');
  assert.equal(bare.hair, look.hair);
  const helmed = personDesc(look, { head: { shape: 'full', hidesHair: true }, chest: { weight: 'heavy' } }, { cls: 'blade' });
  assert.equal(helmed.headwear, 'hidden');
  assert.equal(helmed.hair, 'under');
  assert.ok(helmed.pauldrons);
  assert.notEqual(shapeKey(bare), shapeKey(helmed));
  assert.equal(personDesc(look, { chest: { robe: true } }).outfit, 'robe');
  // Each class has its own silhouette when nothing is on its head.
  const headwear = Object.fromEntries(CLASS_ORDER.map((c) => [c, personDesc(LOOKS[c][0], null, { cls: c }).headwear]));
  assert.deepEqual(headwear, { blade: 'none', warden: 'helm', seer: 'cowl', ranger: 'hood' });
  // Weapons and colours do not change the mesh (they are gear meshes and palette uniforms).
  assert.equal(shapeKey(personDesc(look, gearLook(startingGear('blade')), { cls: 'blade' })), shapeKey(personDesc(look, { weapon: { shape: 'axe' } }, { cls: 'blade' })));
  // The face differs by eyes and temper on the same mesh.
  assert.notEqual(faceKey(personDesc({ eyes: 'dot' })), faceKey(personDesc({ eyes: 'wide' })));
  assert.equal(shapeKey(personDesc({ eyes: 'dot' })), shapeKey(personDesc({ eyes: 'wide' })));
});

test('sculpt recipes: the same seed or description gives the same recipe', () => {
  for (const [kind, make] of Object.entries(BEAST_RECIPES)) {
    assert.equal(JSON.stringify(make(42)), JSON.stringify(make(42)), kind);
    const r = make(7);
    assert.ok(r.slots.length <= 8 && r.palette.length <= 8, `${kind}: at most eight colours`);
    const bones = new Set(r.bones.map((b) => b[0]));
    for (const p of r.parts) if (!p.sub) assert.ok(bones.has(p.bone), `${kind}: a shape on bone ${p.bone}`);
    for (const n of Object.keys(r.roles ?? {})) assert.ok(bones.has(n), `${kind}: role on ${n}`);
    assert.ok(r.face?.hostile && r.face.eyeGlow, `${kind}: a hostile face with glowing eyes`);
  }
  const a = seeded(5), b = seeded(5);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  for (const id of Object.keys(NPCS)) {
    const look = NPCS[id].look ?? {};
    assert.equal(JSON.stringify(personRecipe(personDesc(look, look.gear))), JSON.stringify(personRecipe(personDesc(look, look.gear))), id);
  }
  for (const hair of HAIRS) assert.ok(personRecipe(personDesc({ hair })).parts.length > 10, hair);
});

/* ------------------------------------------------------------ sculpting */

const checkMesh = (name, g, { minY = -0.08 } = {}) => {
  const n = g.attributes.position.count;
  assert.ok(n > 300, `${name}: ${n} vertices`);
  assert.ok(g.index.count / 3 > n * 0.9, `${name}: a closed surface`);
  const w = g.attributes.skinWeight;
  if (w) for (let i = 0; i < n; i += 41) {
    const s = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i);
    assert.ok(Math.abs(s - 1) < 1e-4, `${name}: weights of vertex ${i} sum to ${s}`);
  }
  const p = g.attributes.position;
  for (let i = 0; i < n; i += 53) assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), `${name}: finite`);
  const sA = g.attributes.aSlotA, sB = g.attributes.aSlotB;
  for (let i = 0; i < n; i += 61) {
    const t = sA.getX(i) + sA.getY(i) + sA.getZ(i) + sA.getW(i) + sB.getX(i) + sB.getY(i) + sB.getZ(i) + sB.getW(i);
    assert.ok(t >= -1e-4 && t <= 1 + 1e-4, `${name}: slot weights ${t}`);
  }
  g.computeBoundingBox();
  assert.ok(g.boundingBox.min.y > minY, `${name}: stands on the ground (${g.boundingBox.min.y.toFixed(2)})`);
};

test('sculpt: every monster sculpts into a clean, fully skinned mesh about its height', () => {
  for (const [kind, make] of Object.entries(BEAST_RECIPES)) {
    const r = make(3);
    const g = sculpt(compile(r), { res: 26 });
    checkMesh(kind, g);
    assert.ok(Math.abs(g.boundingBox.max.y - r.height) < r.height * 0.3, `${kind}: ${g.boundingBox.max.y.toFixed(2)} tall, meant ${r.height}`);
  }
});

test('sculpt: every class and every hair cut sculpts, on the rig joints', () => {
  for (const cls of CLASS_ORDER) {
    const d = personDesc(LOOKS[cls][0], null, { cls });
    const r = personRecipe(d);
    const g = sculpt(compile(r), { res: 26 });
    checkMesh(cls, g);
    assert.ok(g.boundingBox.max.y > 1.45 && g.boundingBox.max.y < 1.9, `${cls}: ${g.boundingBox.max.y.toFixed(2)} m tall`);
  }
  for (const hair of HAIRS) checkMesh(hair, sculpt(compile(personRecipe(personDesc({ hair }))), { res: 22 }));
});

test('sculpt: every piece of gear sculpts smooth', () => {
  for (const [kind, shapes] of Object.entries(GEAR_SHAPES)) for (const shape of shapes) {
    const g = sculptedGear(kind, { shape, color: '#a8b4c0', glow: shape === 'staff' ? '#7ad8ff' : null });
    assert.ok(g.attributes.position.count > 200, `${kind} ${shape}`);
    assert.ok(!g.attributes.skinIndex, `${kind} ${shape}: rigid`);
    assert.equal(sculptedGear(kind, { shape, color: '#a8b4c0', glow: shape === 'staff' ? '#7ad8ff' : null }), g, 'built once');
  }
});

/* ------------------------------------------------------------ detail */

test('sculpt detail: skipping far shapes leaves the surface exactly where the full field puts it', () => {
  const smax = (a, b, k) => -smin(-a, -b, k);
  for (const look of [{ hair: 'short', beard: 'beard' }, { hair: 'ponytail', sex: 'f', outfit: 'apron' }]) {
    const m = compile(personRecipe(personDesc(look)));
    const full = (x, y, z) => {
      let acc = 1e9;
      for (const p of m.parts) acc = p.sub ? smax(acc, -p.d(x, y, z), p.k) : smin(acc, p.d(x, y, z), p.k);
      return acc;
    };
    const rnd = seeded(11);
    let n = 0;
    for (let i = 0; i < 40000; i++) {
      const x = rnd() * 1.2 - 0.6, y = rnd() * 1.9, z = rnd() * 1.2 - 0.6;
      const f = full(x, y, z);
      if (Math.abs(f) > 0.015) continue;
      n++;
      assert.ok(Math.abs(f - m.sdf(x, y, z)) < 0.002, `${look.hair}: ${f} vs ${m.sdf(x, y, z)} at ${x},${y},${z}`);
    }
    assert.ok(n > 500, 'enough points near the surface');
  }
});

test('sculpt detail: creases are shaded and every surface carries its pattern (cloth, leather, hair)', () => {
  const r = personRecipe(personDesc({ hair: 'short' }));
  const a = sculptArrays(compile(r), { res: 40 });
  const n = a.position.length / 3;
  let creased = 0, weave = 0, grain = 0, strands = 0;
  for (let i = 0; i < n; i++) {
    if (a.tone[i * 2] < 0.85) creased++;
    if (a.fab[i * 4] > 0.5) weave++;
    if (a.fab[i * 4 + 1] > 0.5) grain++;
    if (a.fab[i * 4 + 2] > 0.5) strands++;
  }
  assert.equal(FAB.length, 4);
  for (const [what, c] of Object.entries({ creased, weave, grain, strands })) assert.ok(c > n * 0.01, `${what}: ${c} of ${n}`);
  // The hair is strands, the face is not patterned.
  assert.ok(strands < n * 0.6 && weave < n * 0.8);
  // Colours are linear, as three.js's are.
  assert.deepEqual(hexToLinear('#ffffff'), [1, 1, 1]);
  assert.ok(Math.abs(hexToLinear('#7a5030')[0] - 0.19462) < 1e-4);
});

test('sculpt detail: the worker builds without three.js and gear has a coarse detail for far away', () => {
  const src = readFileSync(new URL('../../src/hd2d/sculpt/worker.js', import.meta.url), 'utf8');
  assert.ok(!/from 'three'/.test(src), 'the worker does not load three.js');
  for (const [kind, shape] of [['head', 'full'], ['weapon', 'longsword'], ['offhand', 'tower']]) {
    const near = sculptedGear(kind, { shape, color: '#a8b4c0' }, 'near'), far = sculptedGear(kind, { shape, color: '#a8b4c0' }, 'far');
    assert.ok(far.index.count < near.index.count / 3, `${kind} ${shape}: far ${far.index.count / 3} vs near ${near.index.count / 3}`);
    assert.ok(near.index.count / 3 < 30000, `${kind} ${shape}: ${near.index.count / 3} triangles`);
  }
});

test('sculpt detail: the cape is one sheet on its three hinges, bending at the seams', () => {
  const g = smoothCapeGeometry({ color: '#8a2a3a', hem: '#c070ff' });
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, p = g.attributes.position;
  let blended = 0;
  for (let i = 0; i < si.count; i++) {
    assert.ok(Math.abs(sw.getX(i) + sw.getY(i) - 1) < 1e-5, 'weights sum to one');
    assert.ok(si.getX(i) <= 2 && si.getY(i) <= 2);
    if (sw.getY(i) > 0.05) blended++;
    // Each vertex rides the hinge of the strip it hangs in (or the one above, across a seam).
    assert.ok(si.getX(i) <= Math.floor(-p.getY(i) / CAPE_STEP + 0.3) + 0.01);
  }
  assert.ok(blended > 20, 'the seams blend');
  for (const a of ['aSlotA', 'aSlotB', 'aTone', 'aGlow', 'aFab']) assert.ok(g.attributes[a], `${a} for the vinyl material`);
  assert.ok(Math.max(...g.attributes.aGlow.array) > 0, 'the hem of a rare cape glows');
});

test('sculpt detail: villagers differ — scarves, kerchiefs, bands, flowers, elders\' beards', () => {
  const keys = new Set();
  for (const id of Object.keys(NPCS)) {
    const look = NPCS[id].look;
    if (look) keys.add(shapeKey(personDesc(look, look.gear)));
  }
  assert.ok(keys.size >= 18, `${keys.size} different villager shapes`);
  const plain = personDesc({ hair: 'short' });
  const scarf = personDesc({ hair: 'short', wear: [['scarf', '#c84a3a']] });
  assert.notEqual(shapeKey(plain), shapeKey(scarf));
  assert.ok(personRecipe(scarf).parts.length > personRecipe(plain).parts.length);
  // A kerchief or band does not go under a helm; a bad colour is ignored.
  assert.deepEqual(personDesc({ wear: [['kerchief', '#ffffff']] }, { head: { shape: 'full', hidesHair: true } }).wear, []);
  assert.deepEqual(personDesc({ wear: [['scarf', 'red; x']] }).wear, []);
  // An elder (white hair and a beard) gets the long beard.
  assert.ok(personDesc({ beard: 'beard', hairColor: '#f0f0f0' }).elder);
  assert.ok(!personDesc({ beard: 'beard', hairColor: '#3a2a1a' }).elder);
  assert.notEqual(shapeKey(personDesc({ beard: 'beard', hairColor: '#f0f0f0' })), shapeKey(personDesc({ beard: 'beard', hairColor: '#3a2a1a' })));
});
