import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { folkRecipe, recipeKey, robeStyle, robeKit, cloakKit, cloakStyle, skirtWeights, trimRow, hiddenUnderRobe, shadeHex, ROBE_PATTERNS, ROBE_SLEEVES, ROBE_COLLARS, ROBE_OVERS, ROBE_PARTS, CLOAK_PARTS, CLOTH_WEAVE, EMBLEM, TRIM_ROWS, CLOAK_TRAIL, CLOAK_PLUMB, ROBE_STRIDE } from '../../src/gloamreach/folk.js';
import { buildRobe, buildCloak } from '../../src/gloamreach/robeModels.js';
import { HEROES, PEOPLE } from '../../src/gloamreach/cast.js';
import { MAX_PARTS } from '../../src/gloamreach/actors.js';

const ROBED = ['aldous', 'nan', 'sylwen', 'tumbleroot', 'liora', 'fennick'];
const CLOAKED = ['idra', 'kesh', 'garrick', 'varra'];
const person = (id) => PEOPLE.find((p) => p.id === id) ?? HEROES.find((h) => h.id === id);
const recipeOf = (id) => folkRecipe(id, { ...person(id).folk, atlas: !HEROES.includes(person(id)) });

test('robes: each wearer has a make of their own, the same every time; pins win; the seed fills the rest', () => {
  for (const id of [...ROBED, 'mage']) {
    const r = recipeOf(id);
    assert.deepEqual(r, recipeOf(id), id);
    assert.ok(ROBE_PATTERNS.includes(r.pattern) && ROBE_SLEEVES.includes(r.sleeves) && ROBE_COLLARS.includes(r.collar) && ROBE_OVERS.includes(r.over), id);
    assert.match(r.trim, /^#[0-9a-f]{6}$/);
    assert.match(r.sash, /^#[0-9a-f]{6}$/);
  }
  // Six robed villagers, six different robes (colour, trim, sleeves, collar, over-garment).
  const looks = new Set(ROBED.map((id) => recipeKey(recipeOf(id))));
  assert.equal(looks.size, ROBED.length);
  const makes = new Set(ROBED.map((id) => ['pattern', 'sleeves', 'collar', 'over', 'trim'].map((k) => recipeOf(id)[k]).join('|')));
  assert.equal(makes.size, ROBED.length, 'each wearer\'s robe differs in its make, not just its colour');
  // The priest keeps his stole; the starkeeper her stars; the acolyte his scapular.
  assert.equal(recipeOf('aldous').over, 'stole');
  assert.equal(recipeOf('liora').pattern, 'stars');
  assert.equal(recipeOf('fennick').over, 'scapular');
  // Unpinned: seeded, and a pin overrides just its field.
  assert.deepEqual(robeStyle('x', '#445566'), robeStyle('x', '#445566'));
  assert.equal(robeStyle('x', '#445566', { sleeves: 'fitted' }).sleeves, 'fitted');
  assert.equal(robeStyle('x', '#445566', { pattern: 'nonsense' }).pattern, 'plain');
  const seeded = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(robeStyle(`r${i}`, '#445566'))));
  assert.ok(seeded.size > 20);
  // No robe, no robe fields.
  const plain = folkRecipe('tobin');
  assert.equal(plain.trim, null);
  assert.equal(robeKit(plain), null);
});

test('robes: what each is made of — sleeves both sides, hem and cuff trims, a sash; the neck, front and over-garment as made', () => {
  for (const id of [...ROBED, 'mage']) {
    const r = recipeOf(id);
    const kit = robeKit(r);
    for (const piece of ['body', 'skirt', 'sleeve-l', 'sleeve-r', 'hem-trim', 'cuff-l', 'cuff-r', 'sash', 'sash-tails']) assert.ok(kit.pieces.includes(piece), `${id}: ${piece}`);
    assert.ok(kit.pieces.includes(r.collar === 'v' ? 'v-neck' : 'collar'), id);
    if (r.over !== 'none') assert.ok(kit.pieces.includes(r.over), id);
    if (r.cowl) assert.ok(kit.pieces.includes('cowl'), id);
    if (r.open || r.collar === 'v') assert.ok(kit.pieces.includes('inner'), `${id}: the under-robe shows`);
    for (const part of Object.keys(kit.colours)) assert.ok(ROBE_PARTS.includes(part));
    // Nothing under it is drawn: top, trousers, boots.
    for (const g of ['garment-armour', 'garment-leggings', 'garment-boots']) assert.ok(hiddenUnderRobe(g, r), `${id}: ${g}`);
  }
});

test('cloaks: knights, guards and captains wear cloaks, never robes; robes are for priests, mages, elders and acolytes', () => {
  for (const id of [...CLOAKED, 'knight']) {
    const r = recipeOf(id);
    assert.ok(r.cloak, `${id} has a cloak`);
    assert.equal(r.robe, null, `${id} wears no robe`);
    assert.ok(cloakKit(r).pieces.includes('back'));
  }
  assert.ok(recipeOf('knight').emblem, "the knight's cloak bears the order's device");
  for (const id of ROBED) assert.equal(recipeOf(id).cloak, null, `${id} wears a robe, not a cloak`);
  // Nobody whose title is a fighter's wears a robe.
  for (const p of PEOPLE) if (/watch|warden|guard|captain|quartermaster|knight/i.test(`${p.title} ${p.name}`)) assert.ok(!p.folk.robe, `${p.id} in a robe`);
  assert.deepEqual(cloakStyle('k'), cloakStyle('k'));
  assert.equal(cloakStyle('k', { cloakFur: null }).cloakFur, null);
  const kit = cloakKit(folkRecipe('k', { cloak: '#334455', emblem: true }));
  for (const piece of ['back', 'lining', 'collar', 'clasp-l', 'clasp-r', 'hem-trim', 'edge-l', 'edge-r', 'emblem']) assert.ok(kit.pieces.includes(piece), piece);
  for (const part of Object.keys(kit.colours)) assert.ok(CLOAK_PARTS.includes(part));
});

test('robe and cloak garments fit in a body\'s part slots (each can be hidden and dyed alone)', () => {
  // The knight's own garments (Quaternius ranger outfit) number twelve; the mage's six fewer, plus the robe's.
  assert.ok(12 + CLOAK_PARTS.length <= MAX_PARTS);
  assert.ok(5 + ROBE_PARTS.length + CLOAK_PARTS.length <= MAX_PARTS);
});

test('cloth tile: the weave, the device and every trim row have their own place, none overlapping', () => {
  const rows = [];
  for (const metal of [false, true]) for (const p of ROBE_PATTERNS) rows.push(trimRow(p, metal));
  rows.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < rows.length; i++) {
    assert.ok(rows[i][0] >= TRIM_ROWS[0] && rows[i][1] <= TRIM_ROWS[1] && rows[i][1] > rows[i][0]);
    if (i) assert.ok(rows[i][0] > rows[i - 1][1], 'rows apart (filtering never reaches the next)');
  }
  assert.ok(CLOTH_WEAVE[1] < EMBLEM[2] && EMBLEM[3] < TRIM_ROWS[0]);
  assert.notDeepEqual(trimRow('vine', false), trimRow('vine', true), 'metal thread has rows of its own');
  assert.equal(shadeHex('#808080', 0.5), '#404040');
  assert.equal(shadeHex('#000000', 2), '#ffffff');
});

test('skirt weights: summing to 1; the hem on its own bone, the lap at the front only, the sides keeping a little of each leg', () => {
  for (const t of [0, 0.2, 0.5, 0.8, 1]) for (const s of [0, 0.5, 1]) for (const f of [0, 0.5, 1]) {
    const w = skirtWeights(t, s, f);
    assert.ok(w.length >= 1 && w.length <= 4);
    assert.ok(Math.abs(w.reduce((a, x) => a + x[1], 0) - 1) < 1e-9);
  }
  assert.equal(skirtWeights(1, 0.5, 0.5)[0][0], 'RobeHem');
  assert.ok(skirtWeights(0.2, 0.5, 1).some(([b, w]) => b === 'RobeLap' && w > 0.3), 'the front over the lap');
  assert.ok(!skirtWeights(0.2, 0.5, 0).some(([b]) => b === 'RobeLap'), 'not the back');
  assert.ok(skirtWeights(0.4, 1, 0.5).some(([b]) => b === 'thigh_l'), 'the left side a little with the left leg');
});

/* ------------------------------------------------------------------ a mannequin to build on */

/**
 * A stand-in for the Quaternius body: the Unreal mannequin's bones where
 * Universal Base Characters has them (T-pose, metres, facing +z), and an
 * outfit of cylinders round torso, arms and legs, skinned to them.
 */
function mannequin() {
  const at = {
    root: [0, 0, 0], pelvis: [0, 0.93, -0.05], spine_01: [0, 1.055, -0.015], spine_02: [0, 1.164, 0], spine_03: [0, 1.29, 0], neck_01: [0, 1.485, -0.04], Head: [0, 1.55, -0.01],
    clavicle_l: [0.03, 1.43, 0.015], upperarm_l: [0.152, 1.418, -0.054], lowerarm_l: [0.392, 1.418, -0.059], hand_l: [0.641, 1.418, -0.052],
    clavicle_r: [-0.03, 1.43, 0.015], upperarm_r: [-0.152, 1.418, -0.054], lowerarm_r: [-0.392, 1.418, -0.059], hand_r: [-0.641, 1.418, -0.052],
    thigh_l: [0.111, 0.944, -0.052], calf_l: [0.111, 0.535, -0.032], foot_l: [0.111, 0.071, -0.077], ball_l: [0.111, 0.015, 0.062],
    thigh_r: [-0.111, 0.944, -0.052], calf_r: [-0.111, 0.535, -0.032], foot_r: [-0.111, 0.071, -0.077], ball_r: [-0.111, 0.015, 0.062]
  };
  const parent = { pelvis: 'root', spine_01: 'pelvis', spine_02: 'spine_01', spine_03: 'spine_02', neck_01: 'spine_03', Head: 'neck_01', clavicle_l: 'spine_03', upperarm_l: 'clavicle_l', lowerarm_l: 'upperarm_l', hand_l: 'lowerarm_l', clavicle_r: 'spine_03', upperarm_r: 'clavicle_r', lowerarm_r: 'upperarm_r', hand_r: 'lowerarm_r', thigh_l: 'pelvis', calf_l: 'thigh_l', foot_l: 'calf_l', ball_l: 'foot_l', thigh_r: 'pelvis', calf_r: 'thigh_r', foot_r: 'calf_r', ball_r: 'foot_r' };
  const names = Object.keys(at);
  const bones = names.map((n) => {
    const b = new THREE.Bone();
    b.name = n;
    return b;
  });
  const byName = new Map(bones.map((b) => [b.name, b]));
  for (const b of bones) {
    const p = parent[b.name];
    const w = new THREE.Vector3(...at[b.name]);
    if (p) {
      byName.get(p).add(b);
      b.position.copy(w.sub(new THREE.Vector3(...at[p])));
    } else b.position.copy(w);
  }
  const inverses = names.map((n) => new THREE.Matrix4().makeTranslation(...at[n]).invert());
  const skeleton = new THREE.Skeleton(bones, inverses);
  const mesh = { bindMatrix: new THREE.Matrix4(), bindMatrixInverse: new THREE.Matrix4() };
  const idx = (n) => names.indexOf(n);
  // A garment: a ring of points every few cm along a segment, each skinned to the nearest of the given bones.
  const garment = (segs) => {
    const pos = [];
    const si = [];
    const sw = [];
    for (const { from, to, r, bonesAlong } of segs) {
      const a = new THREE.Vector3(...from);
      const b = new THREE.Vector3(...to);
      const len = a.distanceTo(b);
      const dir = b.clone().sub(a).normalize();
      const u = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const v = dir.clone().cross(u).normalize();
      const w = v.clone().cross(dir).normalize();
      for (let k = 0; k <= Math.ceil(len / 0.02); k++) {
        const c = a.clone().lerp(b, k / Math.ceil(len / 0.02));
        const bone = bonesAlong.reduce((best, n) => (new THREE.Vector3(...at[n]).distanceTo(c) < new THREE.Vector3(...at[best]).distanceTo(c) ? n : best), bonesAlong[0]);
        for (let j = 0; j < 16; j++) {
          const ang = (j / 16) * Math.PI * 2;
          const rr = typeof r === 'function' ? r(ang, c) : r;
          const p = c.clone().addScaledVector(w, Math.cos(ang) * rr).addScaledVector(v, Math.sin(ang) * rr);
          pos.push(p.x, p.y, p.z);
          si.push(idx(bone), 0, 0, 0);
          sw.push(1, 0, 0, 0);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return g;
  };
  const torso = garment([{ from: [0, 0.9, -0.03], to: [0, 1.47, -0.03], r: (ang, c) => (c.y > 1.38 ? 0.09 + (1.47 - c.y) * 0.9 : 0.15), bonesAlong: ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r'] }]);
  const arms = garment([
    { from: [0.14, 1.418, -0.054], to: [0.66, 1.418, -0.054], r: 0.048, bonesAlong: ['upperarm_l', 'lowerarm_l', 'hand_l'] },
    { from: [-0.14, 1.418, -0.054], to: [-0.66, 1.418, -0.054], r: 0.048, bonesAlong: ['upperarm_r', 'lowerarm_r', 'hand_r'] }
  ]);
  const legs = garment([
    { from: [0.111, 0.95, -0.05], to: [0.111, 0.04, -0.05], r: 0.07, bonesAlong: ['thigh_l', 'calf_l', 'foot_l'] },
    { from: [-0.111, 0.95, -0.05], to: [-0.111, 0.04, -0.05], r: 0.07, bonesAlong: ['thigh_r', 'calf_r', 'foot_r'] }
  ]);
  const neck = garment([{ from: [0, 1.43, -0.03], to: [0, 1.56, -0.03], r: 0.055, bonesAlong: ['neck_01', 'Head'] }]);
  const sources = [{ geo: torso, part: 'garment-armour' }, { geo: arms, part: 'garment-sleeves' }, { geo: legs, part: 'garment-leggings' }, { geo: neck, part: 'body' }];
  return { skeleton, mesh, sources, at };
}

function partIndex() {
  const parts = ['body'];
  return { parts, partOf: (n) => (parts.includes(n) ? parts.indexOf(n) : parts.push(n) - 1) };
}

/** Per vertex: its weights by bone name. */
function weightsOf(geo, skeleton, i) {
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  const out = {};
  for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0) out[skeleton.bones[si.getComponent(i, k)].name] = (out[skeleton.bones[si.getComponent(i, k)].name] ?? 0) + sw.getComponent(i, k);
  return out;
}

test('robe built on a body: whole, skinned (weights sum to 1), sleeves on the forearms that hang, a hem at the ground, within budget', () => {
  for (const id of [...ROBED, 'mage']) {
    const { skeleton, mesh, sources } = mannequin();
    const { parts, partOf } = partIndex();
    const robe = buildRobe({ skeleton, mesh, sources, recipe: recipeOf(id), partOf, uvOf: (u, v) => [u, v] });
    assert.ok(robe, id);
    const g = robe.geometry;
    const pos = g.attributes.position;
    const tris = g.index.count / 3;
    assert.ok(tris > 2000 && tris < 9000, `${id}: ${tris} triangles`);
    assert.ok(robe.skeleton.bones.some((b) => b.name === 'RobeLap') && robe.skeleton.bones.some((b) => b.name === 'RobeHem'));
    let minY = Infinity;
    let maxY = -Infinity;
    let sleeveL = 0;
    let sleeveR = 0;
    let hemOnBone = 0;
    let hemN = 0;
    for (let i = 0; i < pos.count; i++) {
      for (const a of ['position', 'normal', 'uv', 'skinWeight']) for (let k = 0; k < g.attributes[a].itemSize; k++) assert.ok(Number.isFinite(g.attributes[a].getComponent(i, k)), `${id}: ${a} ${i}`);
      const w = weightsOf(g, robe.skeleton, i);
      assert.ok(Math.abs(Object.values(w).reduce((a, x) => a + x, 0) - 1) < 1e-4, `${id}: weights at ${i}`);
      const y = pos.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if ((w.lowerarm_l ?? 0) > 0.9 && g.attributes.aHang.getX(i) > 0.01) sleeveL++;
      if ((w.lowerarm_r ?? 0) > 0.9 && g.attributes.aHang.getX(i) > 0.01) sleeveR++;
      if (y < 0.3 && Math.abs(pos.getX(i)) < 0.5) {
        hemN++;
        if ((w.RobeHem ?? 0) > 0.8) hemOnBone++;
      }
    }
    assert.ok(minY >= 0 && minY < 0.05, `${id}: hem at the ground (${minY})`);
    assert.ok(maxY > 1.4 && maxY < 1.62, `${id}: up to the neck (${maxY})`);
    assert.ok(sleeveL > 50 && sleeveR > 50, `${id}: wide sleeves on both forearms, marked to hang`);
    assert.ok(hemOnBone / hemN > 0.9, `${id}: the lower skirt swings on its own bone`);
    for (const p of ['garment-robe', 'garment-robe-trim', 'garment-robe-sash']) assert.ok(parts.includes(p), `${id}: ${p}`);
    assert.equal(parts.includes('garment-robe-cowl'), Boolean(recipeOf(id).cowl));
    // The body's outline is inside the robe: every torso point at chest height lies within the robe's ring there.
    const ring = [];
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - 1.2) < 0.02 && Math.abs(pos.getX(i)) < 0.3) ring.push(Math.hypot(pos.getX(i), pos.getZ(i) + 0.03));
    assert.ok(Math.min(...ring) > 0.15, `${id}: the chest is covered (${Math.min(...ring)})`);
  }
});

/**
 * Linear blend skinning of one point (as the GPU does): `pose` gives each
 * moved bone's change from its rest (posed world × rest inverse, the bone
 * matrix the shader uses); bones not in it stay at rest.
 */
function skin(p, w, pose) {
  const out = new THREE.Vector3();
  for (const [name, k] of Object.entries(w)) out.addScaledVector(p.clone().applyMatrix4(pose[name] ?? new THREE.Matrix4()), k);
  return out;
}

test('robe through a stride and sitting: the hem stays one loop with the feet inside; sitting, the lap lies over the thighs and the hem hangs past the knees', () => {
  const { skeleton, mesh, sources, at } = mannequin();
  const { partOf } = partIndex();
  const robe = buildRobe({ skeleton, mesh, sources, recipe: recipeOf('aldous'), partOf, uvOf: (u, v) => [u, v] });
  const g = robe.geometry;
  const pos = g.attributes.position;
  const sk = robe.skeleton;
  const restOf = (n) => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[sk.bones.findIndex((b) => b.name === n)].clone().invert());
  const about = (n, q) => {
    const c = restOf(n);
    return new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  };
  const X = new THREE.Vector3(1, 0, 0);
  // A pose from thigh and shin pitches (+ swings the knee forward), the lap and hem as Actor.robeSway turns them.
  const posed = (thighL, thighR, shinL, shinR) => {
    const qL = new THREE.Quaternion().setFromAxisAngle(X, -thighL);
    const qR = new THREE.Quaternion().setFromAxisAngle(X, -thighR);
    const pose = { thigh_l: about('thigh_l', qL), thigh_r: about('thigh_r', qR) };
    pose.calf_l = pose.thigh_l.clone().multiply(about('calf_l', new THREE.Quaternion().setFromAxisAngle(X, shinL)));
    pose.calf_r = pose.thigh_r.clone().multiply(about('calf_r', new THREE.Quaternion().setFromAxisAngle(X, shinR)));
    const down = new THREE.Vector3(0, -1, 0);
    const avg = down.clone().applyQuaternion(qL).add(down.clone().applyQuaternion(qR)).normalize();
    const lapQ = new THREE.Quaternion().setFromUnitVectors(down, avg);
    pose.RobeLap = about('RobeLap', lapQ);
    pose.RobeHem = pose.RobeLap.clone().multiply(about('RobeHem', lapQ.clone().invert()));
    return pose;
  };
  // Walking: the hem (the bottom ring) winds once round the middle, feet inside it.
  const hem = [];
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.045 && g.attributes.aPart.getX(i) === 1) hem.push(i);
  assert.ok(hem.length > 20);
  for (let f = 0; f < 12; f++) {
    const sw = Math.sin((f / 12) * Math.PI * 2) * 0.45 * ROBE_STRIDE;
    // The knees bend the shins back (positive), the stride shortened as robed people walk.
    const pose = posed(sw, -sw, Math.max(0, Math.sin((f / 12) * Math.PI * 2)) * 0.8 * ROBE_STRIDE, Math.max(0, -Math.sin((f / 12) * Math.PI * 2)) * 0.8 * ROBE_STRIDE);
    const ring = hem.map((i) => skin(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), weightsOf(g, sk, i), pose));
    for (const side of ['l', 'r']) {
      const ankle = new THREE.Vector3(...at[`foot_${side}`]).applyMatrix4(pose[`calf_${side}`]);
      const a = Math.atan2(ankle.x, ankle.z + 0.03);
      const near = ring.reduce((best, p) => {
        const d = Math.abs(Math.atan2(Math.sin(Math.atan2(p.x, p.z + 0.03) - a), Math.cos(Math.atan2(p.x, p.z + 0.03) - a)));
        return d < best.d ? { d, r: Math.hypot(p.x, p.z + 0.03) } : best;
      }, { d: Infinity, r: 0 });
      assert.ok(Math.hypot(ankle.x, ankle.z + 0.03) < near.r, `stride ${f}: the ${side} foot reaches past the hem`);
    }
  }
  // Sitting: thighs level ahead, shins down. The front of the skirt over the thighs; the hem out past the knees.
  const sit = posed(Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2);
  const knee = new THREE.Vector3(...at.calf_l).applyMatrix4(sit.thigh_l);
  let frontHem = null;
  for (let i = 0; i < pos.count; i++) {
    if (g.attributes.aPart.getX(i) !== 1) continue;
    const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const q = skin(p, weightsOf(g, sk, i), sit);
    // Over the thighs: a point of the front of the skirt between hip and knee sits above them, not inside.
    if (p.z > 0.1 && Math.abs(p.x) < 0.06 && p.y < 0.85 && p.y > 0.7) assert.ok(q.y > at.thigh_l[1] + 0.04, `lap point ${i} sits inside the thighs (${q.y.toFixed(3)})`);
    if (p.y < 0.05 && Math.abs(p.x) < 0.04 && p.z > 0) frontHem = q;
  }
  assert.ok(frontHem && frontHem.z > knee.z, 'the front of the hem hangs out past the knees');
});

test('cloak built on a body: behind the back, to the calves, swinging below the shoulder blades, clear of the arms; over a robe too', () => {
  for (const id of ['knight', ...CLOAKED, 'mage']) {
    const { skeleton, mesh, sources, at } = mannequin();
    const { parts, partOf } = partIndex();
    const recipe = recipeOf(id);
    let sk = skeleton;
    let src = sources;
    let robeBack = 0;
    if (recipe.robe) {
      const robe = buildRobe({ skeleton, mesh, sources, recipe, partOf, uvOf: (u, v) => [u, v] });
      sk = robe.skeleton;
      src = [...sources, { geo: robe.geometry, part: 'robe' }];
      const rp = robe.geometry.attributes.position;
      for (let i = 0; i < rp.count; i++) if (Math.abs(rp.getX(i)) < 0.03 && Math.abs(rp.getY(i) - 1.1) < 0.03 && rp.getZ(i) < 0) robeBack = Math.min(robeBack, rp.getZ(i));
    }
    const cloak = buildCloak({ skeleton: sk, mesh, sources: src, recipe, partOf, uvOf: (u, v) => [u, v] });
    assert.ok(cloak, id);
    const g = cloak.geometry;
    const pos = g.attributes.position;
    const tris = g.index.count / 3;
    assert.ok(tris > 800 && tris < 4500, `${id}: ${tris} triangles`);
    assert.ok(cloak.skeleton.bones.some((b) => b.name === 'CloakSwing'));
    let minY = Infinity;
    let swingLow = 0;
    let low = 0;
    let cloakBack = 0;
    for (let i = 0; i < pos.count; i++) {
      const w = weightsOf(g, cloak.skeleton, i);
      assert.ok(Math.abs(Object.values(w).reduce((a, x) => a + x, 0) - 1) < 1e-4);
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      minY = Math.min(minY, p.y);
      if (p.y < 1.0) {
        low++;
        if ((w.CloakSwing ?? 0) > 0.9) swingLow++;
        assert.ok(p.z < 0, `${id}: below the waist the cloak is behind the body (${p.z.toFixed(3)})`);
        for (const x of [at.thigh_l[0], at.thigh_r[0]]) assert.ok(Math.hypot(p.x - x, p.z + 0.05) > 0.075, `${id}: clear of the legs`);
        assert.ok(!Object.keys(w).some((b) => /arm|hand/.test(b)), `${id}: the hanging cloak doesn't follow the arms`);
      }
      if (Math.abs(p.x) < 0.03 && Math.abs(p.y - 1.1) < 0.04 && p.z < 0) cloakBack = Math.min(cloakBack, p.z);
    }
    assert.ok(minY > at.calf_l[1] - 0.25 && minY < at.calf_l[1], `${id}: to the calves (${minY})`);
    assert.ok(swingLow / low > 0.95, `${id}: the lower cloak hangs from its swing bone`);
    if (recipe.robe) assert.ok(cloakBack < robeBack - 0.01, `${id}: the cloak is outside the robe (${cloakBack} vs ${robeBack})`);
    for (const p of CLOAK_PARTS) assert.ok(parts.includes(p), `${id}: ${p}`);
    assert.equal(cloak.rig.swing, 'CloakSwing');
  }
});

test('cloak swing: trails behind at a run enough to clear a heel kicked back; never swings forward into the legs; mostly plumb', () => {
  const pivotY = 1.36;
  const hemY = 0.4;
  const restBack = 0.18;
  const run = Math.min(CLOAK_TRAIL.max, 4.2 * CLOAK_TRAIL.perSpeed);
  const hemZ = -(restBack + (pivotY - hemY) * Math.sin(run));
  assert.ok(hemZ < -0.4, `the hem trails to ${hemZ.toFixed(2)} at a run (a heel kicks back about 0.4 m)`);
  assert.ok(CLOAK_TRAIL.min <= 0 && CLOAK_TRAIL.min > -0.1, 'barely forward (walking backwards)');
  assert.ok(CLOAK_PLUMB > 0.4 && CLOAK_PLUMB < 1);
});
