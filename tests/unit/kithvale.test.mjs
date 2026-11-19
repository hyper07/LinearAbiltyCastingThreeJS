import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, groundAt, waterAt, surfaceAt, slopeAt, streamLevel, pondLevel, bridgeFrame, bridgeAt, isClear, inHouse, pavedAt, roadDistance } from '../../src/kithvale/heights.js';
import { EXTENT, VILLAGE, GATE, START, ROAD, STREAM, POND, SHRINE, HOUSES, HABITATS, FORAGE, CACHES, BOULDERS, AREAS, areaAt, pointAt, STONE_LANTERNS } from '../../src/kithvale/map.js';
import { SETTINGS, TIERS, chooseTier, Governor, LIVE, startTier } from '../../src/kithvale/quality.js';
import * as R from '../../src/kithvale/rules.js';
import { CreatureBrain, FriendBrain, GAITS, SLOTS } from '../../src/kithvale/brains.js';
import { LOOKS, VILLAGERS } from '../../src/kithvale/cast.js';
import { PACKS, POLYFORK_MODELS } from '../../src/kithvale/credits.js';

/* ------------------------------------------------------------------ the land */

test('terrain: deterministic and finite everywhere', () => {
  assert.equal(heightAt(12.3, -45.6), heightAt(12.3, -45.6));
  for (let x = EXTENT.x0; x <= EXTENT.x1; x += 17) for (let z = EXTENT.z0; z <= EXTENT.z1; z += 19) assert.ok(Number.isFinite(heightAt(x, z)), `height at ${x},${z}`);
});

test('terrain: the village terrace is flat, the gate level with it', () => {
  for (let x = VILLAGE.x0 + 4; x < VILLAGE.x1 - 4; x += 7) for (let z = VILLAGE.z0 + 4; z < VILLAGE.z1 - 2; z += 7) assert.ok(Math.abs(heightAt(x, z) - VILLAGE.level) < 0.05, `flat at ${x},${z}`);
  assert.ok(Math.abs(groundAt(GATE.x, GATE.z) - VILLAGE.level) < 0.05);
  assert.ok(Math.abs(groundAt(GATE.x, GATE.z + 4) - VILLAGE.level) < 0.3, 'level just outside the gate too');
});

test('terrain: the road is walkable from the gate to the shrine', () => {
  for (let s = 0; s < ROAD.len; s += 3) {
    const p = pointAt(ROAD, s);
    assert.ok(slopeAt(p.x, p.z) < 0.8, `road slope at s=${s} (${slopeAt(p.x, p.z).toFixed(2)})`);
  }
  assert.ok(heightAt(SHRINE.x, SHRINE.z) > heightAt(0, 0) + 15, 'the shrine stands on a hill');
});

test('terrain: the ridges close the vale in', () => {
  for (const [x, z] of [[195, 0], [-195, 40], [0, -214], [0, 256], [150, 220]]) assert.ok(heightAt(x, z) > 40, `ridge at ${x},${z} (${heightAt(x, z).toFixed(1)})`);
});

test('water: the stream only ever runs downhill, into the pond', () => {
  let prev = Infinity;
  for (let s = 0; s <= STREAM.len; s += 1) {
    const w = streamLevel(s);
    assert.ok(w <= prev + 1e-9, `downhill at s=${s}`);
    prev = w;
  }
  assert.ok(streamLevel(STREAM.len) >= pondLevel());
  assert.ok(waterAt(POND.x, POND.z) > heightAt(POND.x, POND.z) + 0.8, 'the pond is deep in the middle');
  const mid = pointAt(STREAM, STREAM.len * 0.5);
  assert.ok(waterAt(mid.x, mid.z) > heightAt(mid.x, mid.z), 'water in the stream');
  assert.ok(waterAt(mid.x, mid.z) - heightAt(mid.x, mid.z) < 0.9, 'the stream is shallow (wadeable)');
  assert.equal(waterAt(0, -130), -Infinity, 'no water in the village');
});

test('bridge: a deck over the stream, meeting the road at both ends', () => {
  const b = bridgeFrame();
  const top = bridgeAt(b.x, b.z);
  assert.ok(top > waterAt(b.x, b.z) + 0.8, 'deck above the water');
  for (const k of [-1, 1]) {
    const x = b.x + Math.sin(b.yaw) * (b.half - 0.2) * k;
    const z = b.z + Math.cos(b.yaw) * (b.half - 0.2) * k;
    assert.ok(Math.abs(groundAt(x, z) - heightAt(x + Math.sin(b.yaw) * 0.6 * k, z + Math.cos(b.yaw) * 0.6 * k)) < 0.45, 'no step at the ends');
  }
  assert.equal(surfaceAt(b.x, b.z), 'wood');
});

test('surfaces: cobbles in the lane, dirt on the road, water in the pond', () => {
  assert.equal(surfaceAt(0, -130), 'cobble');
  assert.ok(pavedAt(0, -100));
  assert.equal(surfaceAt(1, -20 + 0) === 'dirt' || roadDistance(1, -20).d > 3, true);
  assert.equal(surfaceAt(POND.x, POND.z), 'water');
});

test('houses: none on the lane, none overlapping each other or the walls', () => {
  for (const h of HOUSES) {
    assert.ok(Math.abs(h.x) - Math.min(h.w, h.d) / 2 > 3.2 || Math.abs(h.z - (-128)) < 0 || h.kind === 'hall', `${h.id} clear of the lane`);
    assert.ok(h.x - 6 > VILLAGE.x0 && h.x + 6 < VILLAGE.x1 && h.z - 5 > VILLAGE.z0 && h.z + 5 < VILLAGE.z1, `${h.id} inside the walls`);
  }
  for (let i = 0; i < HOUSES.length; i++) for (let j = i + 1; j < HOUSES.length; j++) {
    const a = HOUSES[i];
    const b = HOUSES[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > (Math.max(a.w, a.d) + Math.max(b.w, b.d)) / 2 - 1.5, `${a.id} and ${b.id} apart`);
  }
  assert.equal(inHouse(START.x, START.z), null, 'you start in the open');
});

test('map: habitats, forage, caches and boulders sit on open, dry, reachable ground', () => {
  const dry = (x, z) => waterAt(x, z) < heightAt(x, z) + 0.2;
  for (const [sp, h] of Object.entries(HABITATS)) for (const [x, z] of h.homes) {
    assert.ok(heightAt(x, z) < 45, `${sp} home not on the rim`);
    assert.ok(slopeAt(x, z) < 0.9, `${sp} home walkable at ${x},${z}`);
  }
  for (const f of FORAGE) assert.ok(dry(f.x, f.z) && slopeAt(f.x, f.z) < 1.0, `${f.kind} at ${f.x},${f.z}`);
  for (const c of [...CACHES, ...BOULDERS]) assert.ok(dry(c.x, c.z) && slopeAt(c.x, c.z) < 1.0, `${c.id} reachable`);
  for (const [x, z] of STONE_LANTERNS) assert.ok(slopeAt(x, z) < 1.0);
  assert.equal(areaAt(0, -130), 'village');
  assert.equal(areaAt(SHRINE.x, SHRINE.z), 'shrine');
  assert.ok(AREAS.length >= 7);
  assert.ok(!isClear(0, -40), 'nothing grows on the road');
});

/* ------------------------------------------------------------------ quality */

test('quality: tiers rise in cost, phones start light', () => {
  assert.deepEqual(TIERS, ['low', 'medium', 'high', 'ultra']);
  for (let i = 1; i < TIERS.length; i++) {
    const a = SETTINGS[TIERS[i - 1]];
    const b = SETTINGS[TIERS[i]];
    for (const k of ['scale', 'shadow', 'grass', 'fur', 'sculpt']) assert.ok(b[k] >= a[k], `${k} ${TIERS[i]}`);
  }
  assert.equal(SETTINGS.low.paint, 0, 'no brush filter on phones');
  assert.equal(startTier('ultra', { mobile: true }), 'low');
  assert.equal(startTier('ultra', { touch: true }), 'medium');
  assert.equal(chooseTier({ gpu: 'Google SwiftShader' }), 'low');
  for (const k of LIVE) assert.ok(k in SETTINGS.high);
  const g = new Governor('high');
  let changed = null;
  for (let i = 0; i < 400 && !changed; i++) changed = g.frame(40);
  assert.equal(changed, 'medium', 'steps down when slow');
});

/* ------------------------------------------------------------------ treats and species */

test('species: six, each with a home, likes that differ, and an ability', () => {
  assert.equal(R.SPECIES_ORDER.length, 6);
  const combos = new Set();
  const abilities = new Set();
  for (const id of R.SPECIES_ORDER) {
    const s = R.SPECIES[id];
    assert.ok(HABITATS[id], `${id} has a habitat`);
    assert.notEqual(s.loves, s.likes);
    assert.notEqual(s.loves, s.dislikes);
    assert.ok(R.TREATS[s.loves] && R.TREATS[s.likes] && R.TREATS[s.dislikes]);
    combos.add(`${s.loves}/${s.likes}`);
    abilities.add(s.ability.id);
    assert.ok(GAITS[s.gait], `${id} gait`);
  }
  assert.equal(abilities.size, 6, 'every ability is different');
  assert.ok(combos.size >= 5, 'tastes vary');
});

test('treats: loved beats liked beats disliked', () => {
  for (const id of R.SPECIES_ORDER) {
    const s = R.SPECIES[id];
    const love = R.treatReaction(id, s.loves);
    const like = R.treatReaction(id, s.likes);
    const no = R.treatReaction(id, s.dislikes);
    assert.equal(love.reaction, 'love');
    assert.equal(like.reaction, 'like');
    assert.equal(no.reaction, 'dislike');
    assert.ok(love.trust > like.trust && like.trust > 0 && no.trust < 0);
    assert.ok(love.trust + like.trust >= s.trust, `${id}: a loved and a liked treat are enough`);
    assert.ok(love.trust < s.trust || s.trust <= 60, `${id}: one treat alone is rarely enough`);
  }
});

test('satchel: capped stacks, take one at a time', () => {
  const s = R.newSatchel();
  assert.equal(R.addTreat(s, 'seed', 100), R.SATCHEL_MAX - 3);
  assert.equal(s.seed, R.SATCHEL_MAX);
  assert.equal(R.addTreat(s, 'nonsense', 1), 0);
  s.crystal = 0;
  assert.equal(R.takeTreat(s, 'crystal'), false);
  assert.equal(R.takeTreat(s, 'berry'), true);
  assert.equal(s.berry, 3);
});

test('hours: the Lumoth only comes out from dusk to dawn', () => {
  assert.equal(R.awakeAt('lumoth', R.DUSK), true);
  assert.equal(R.awakeAt('lumoth', 23), true);
  assert.equal(R.awakeAt('lumoth', 3), true);
  assert.equal(R.awakeAt('lumoth', 12), false);
  assert.equal(R.awakeAt('tuftlet', 12), true);
  assert.equal(R.advanceHour(23.99, 30, true) < 1, true, 'wraps past midnight');
  assert.equal(R.advanceHour(10, 60, false), 10, 'stands still with the cycle off');
});

test('noise: sneaking is near silent, sprinting is loud', () => {
  assert.ok(R.noiseLevel(1.2, { sneaking: true }) < 0.1);
  assert.ok(R.noiseLevel(7.4) > R.noiseLevel(4.2));
  assert.ok(R.noiseLevel(4.2) > R.noiseLevel(1.4));
  const a = R.alarmRate('mistfawn', { dist: 20, noise: R.noiseLevel(7.4) });
  const b = R.alarmRate('mistfawn', { dist: 20, noise: R.noiseLevel(1.4, { sneaking: true }) });
  assert.ok(a > 0 && b === 0, 'a sprint is heard from 20 m, a creep is not');
  assert.ok(R.alarmRate('mistfawn', { dist: 10, noise: 0.45 }) > R.alarmRate('puffwool', { dist: 10, noise: 0.45 }), 'the fawn is shyer than the sheep');
  assert.ok(R.alarmRate('mistfawn', { dist: 10, noise: 0.45, calm: true }) < R.alarmRate('mistfawn', { dist: 10, noise: 0.45 }));
});

/* ------------------------------------------------------------------ the trust moment */

test('trust rhythm: presses at the full breath score, early or late ones miss', () => {
  const b = 2.4;
  assert.equal(R.breathSize(b * 0.5, b).toFixed(3), '1.000');
  assert.equal(R.breathSize(0, b).toFixed(3), '0.000');
  assert.equal(R.gradeBeat(R.breathError(b * 0.5, b)), 'perfect');
  assert.equal(R.gradeBeat(R.breathError(b * 0.5 + b * 0.1, b)), 'good');
  assert.equal(R.gradeBeat(R.breathError(b * 0.5 + b * 0.3, b)), 'miss');
  assert.equal(R.gradeBeat(R.breathError(b * 1.5 + 0.01, b)), 'perfect', 'any breath counts');
  // A calm friend widens the windows.
  const e = 0.16;
  assert.equal(R.gradeBeat(e), 'miss');
  assert.equal(R.gradeBeat(e, true), 'good');
});

test('trust rhythm: scoring', () => {
  assert.equal(R.trustResult(['perfect', 'perfect', 'perfect', 'perfect'], 4).success, true);
  assert.equal(R.trustResult(['perfect', 'perfect', 'perfect', 'perfect'], 4).perfect, true);
  assert.equal(R.trustResult(['good', 'good', 'good', 'good'], 4).success, false, 'all merely good falls short');
  assert.equal(R.trustResult(['perfect', 'good', 'good', 'good'], 4).success, true);
  assert.equal(R.trustResult(['perfect', 'perfect', 'miss', 'miss'], 4).success, false, 'two misses fail');
  assert.equal(R.trustResult(['perfect', 'perfect', 'perfect'], 4).success, true, 'one missing press is one miss');
  assert.equal(R.trustResult([], 5).success, false);
});

/* ------------------------------------------------------------------ friends */

test('party: three follow, the rest wait in the garden', () => {
  const st = R.newState();
  for (const sp of ['tuftlet', 'emberkit', 'puffwool', 'mistfawn']) R.befriend(st, { species: sp, name: R.pickName(sp, st.friends.map((f) => f.name)) });
  assert.equal(R.party(st).length, R.PARTY_MAX);
  assert.equal(st.friends[3].follow, false, 'the fourth waits');
  assert.equal(R.setFollow(st, st.friends[3].uid, true), false, 'no room');
  assert.equal(R.setFollow(st, st.friends[0].uid, false), true);
  assert.equal(R.setFollow(st, st.friends[3].uid, true), true);
  assert.ok(R.hasAbility(st, 'calm'));
  assert.ok(!R.hasAbility(st, 'sniff'));
  assert.deepEqual([...st.befriended].sort(), ['emberkit', 'mistfawn', 'puffwool', 'tuftlet']);
});

test('names: unique picks, cleaned input', () => {
  const taken = R.NAMES.tuftlet.slice(0, 5);
  assert.equal(R.pickName('tuftlet', taken, () => 0), R.NAMES.tuftlet[5]);
  assert.equal(R.cleanName('  <b>Sprig</b>!!  '), 'bSprigb');
  assert.equal(R.cleanName('', 'Pip'), 'Pip');
  assert.ok(R.cleanName('x'.repeat(40)).length <= 14);
});

test('journal: likes are learned by trying, all known once befriended', () => {
  const st = R.newState();
  assert.equal(R.journalEntry(st, 'emberkit').name, '???');
  R.see(st, 'emberkit');
  R.learn(st, 'emberkit', 'crystal');
  const e = R.journalEntry(st, 'emberkit');
  assert.equal(e.name, 'Emberkit');
  assert.equal(e.loves, 'crystal');
  assert.equal(e.likes, null);
  R.befriend(st, { species: 'emberkit', name: 'Cinder' });
  const f = R.journalEntry(st, 'emberkit');
  assert.equal(f.likes, 'berry');
  assert.ok(f.ability);
  assert.deepEqual(f.names, ['Cinder']);
});

test('save: round trip, versioned, repairs what it reads', () => {
  const st = R.newState();
  R.befriend(st, { species: 'puffwool', name: 'Nimbus' });
  st.caches.push('c2');
  st.hour = 20.5;
  const back = R.deserialize(R.serialize(st));
  assert.equal(back.v, R.SAVE_VERSION);
  assert.equal(back.friends[0].name, 'Nimbus');
  assert.deepEqual(back.caches, ['c2']);
  assert.equal(back.hour, 20.5);
  assert.deepEqual(R.deserialize('not json'), R.newState());
  assert.deepEqual(R.deserialize(JSON.stringify({ ...st, v: 99 })), R.newState(), 'an unknown version starts fresh');
  const bad = R.deserialize(JSON.stringify({ v: R.SAVE_VERSION, satchel: { berry: 999, seed: -4 }, friends: [{ species: 'dragon' }, ...Array.from({ length: 5 }, () => ({ species: 'tuftlet', name: '<x>', follow: true }))], seen: ['tuftlet', 'nope'] }));
  assert.equal(bad.satchel.berry, R.SATCHEL_MAX);
  assert.equal(bad.satchel.seed, 0);
  assert.equal(bad.friends.length, 5, 'unknown species dropped');
  assert.equal(bad.friends.filter((f) => f.follow).length, R.PARTY_MAX, 'never more than three following');
  assert.deepEqual(bad.seen, ['tuftlet']);
});

/* ------------------------------------------------------------------ minds */

const still = (x, z, o = {}) => ({ x, z, speed: 0, noise: R.noiseLevel(0), sneaking: false, ...o });
const run = (brain, n, ctxFn, dt = 0.1) => {
  const evs = [];
  for (let i = 0; i < n; i++) evs.push(...brain.update(dt, ctxFn(i)));
  return evs;
};

test('mind: a sprint nearby sends a fawn fleeing; it hides, then calms', () => {
  const b = new CreatureBrain({ species: 'mistfawn', home: [0, 0], seed: 3 });
  const evs = run(b, 40, () => ({ player: { x: 12, z: 0, speed: 7.4, noise: R.noiseLevel(7.4) }, hour: 18 }));
  assert.ok(evs.some((e) => e.type === 'startle'));
  assert.ok(['flee', 'hide'].includes(b.state));
  assert.ok(b.x < 0, 'it ran away from you');
  run(b, 200, () => ({ player: { x: 80, z: 0, speed: 0, noise: 0.02 }, hour: 18 }));
  assert.ok(['idle', 'wander', 'play', 'wary'].includes(b.state), `calmed (${b.state})`);
});

test('mind: creeping close makes it curious, and it comes to look', () => {
  const b = new CreatureBrain({ species: 'puffwool', home: [0, 0], seed: 1 });
  const evs = run(b, 120, () => ({ player: { x: 8, z: 0, speed: 1.2, noise: R.noiseLevel(1.2, { sneaking: true }), sneaking: true }, hour: 18 }));
  assert.ok(evs.some((e) => e.type === 'curious'), 'curious');
  assert.ok(Math.hypot(b.x - 8, b.z) < 6, 'it came closer');
  assert.ok(b.fear < 0.5);
});

test('mind: it smells a treat, eats it, and trusts you more (if it likes it)', () => {
  const b = new CreatureBrain({ species: 'tuftlet', home: [0, 0], seed: 2 });
  const treats = [{ id: 't1', x: 4, z: 3, kind: 'seed' }];
  const evs = run(b, 100, () => ({ player: still(10, 0), treats, hour: 18 }));
  const eat = evs.find((e) => e.type === 'eat');
  assert.ok(eat, 'ate it');
  assert.equal(eat.reaction, 'love');
  assert.equal(treats[0].taken, b.id);
  assert.ok(b.trust >= 60);
  const c = new CreatureBrain({ species: 'tuftlet', home: [0, 0], seed: 2 });
  const evs2 = run(c, 100, () => ({ player: still(10, 0), treats: [{ id: 't2', x: 4, z: 3, kind: 'crystal' }], hour: 18 }));
  assert.equal(evs2.find((e) => e.type === 'eat')?.reaction, 'dislike');
  assert.equal(c.trust, 0);
});

test('mind: two good treats and it is ready to share a breath', () => {
  const b = new CreatureBrain({ species: 'emberkit', home: [0, 0], seed: 4 });
  const treats = [{ id: 'a', x: 2, z: 1, kind: 'crystal' }, { id: 'b', x: 2.5, z: 1.5, kind: 'berry' }];
  const evs = run(b, 200, () => ({ player: still(6, 0), treats, hour: 18 }));
  assert.ok(evs.some((e) => e.type === 'ready'));
  assert.equal(b.state, 'ready');
});

test('mind: the Lumoth sleeps by day', () => {
  const b = new CreatureBrain({ species: 'lumoth', home: [0, 0], seed: 1 });
  run(b, 3, () => ({ player: still(50, 50), hour: 12 }));
  assert.equal(b.state, 'sleep');
  assert.equal(b.present, false);
  run(b, 3, () => ({ player: still(50, 50), hour: 19 }));
  assert.equal(b.present, true);
});

test('friends: they keep up in a fan behind you, and catch up when left behind', () => {
  const fs = [0, 1, 2].map((slot) => new FriendBrain({ species: 'tuftlet', slot, x: 0, z: -2 }));
  assert.equal(SLOTS.length, R.PARTY_MAX);
  let p = { x: 0, z: 0, yaw: 0, speed: 4.6 };
  for (let i = 0; i < 150; i++) {
    p = { ...p, z: p.z + 4.6 * 0.05 };
    for (const f of fs) f.update(0.05, { player: p, friends: fs });
  }
  for (const f of fs) {
    assert.ok(Math.hypot(f.x - p.x, f.z - p.z) < 5, 'kept up');
    assert.ok(f.z < p.z, 'behind you');
  }
  const ev = fs[0].update(0.05, { player: { x: 300, z: 0, yaw: 0, speed: 0 }, friends: fs });
  assert.ok(ev.some((e) => e.type === 'teleport'));
  let arrived = false;
  fs[1].doAt(fs[1].x + 3, fs[1].z, 'roll', () => (arrived = true));
  for (let i = 0; i < 100 && !arrived; i++) fs[1].update(0.05, { player: { ...p, speed: 0 }, friends: fs });
  assert.ok(arrived, 'a task is done and called back');
});

/* ------------------------------------------------------------------ cast and credits */

test('cast: three looks, a dozen villagers with greetings, every model credited', () => {
  assert.equal(LOOKS.length, 3);
  assert.ok(VILLAGERS.length >= 8 && VILLAGERS.length <= 12);
  const ids = new Set(VILLAGERS.map((v) => v.id));
  for (const v of VILLAGERS) {
    assert.ok(v.greet.length > 10, `${v.id} greets`);
    if (v.with) assert.ok(ids.has(v.with), `${v.id} chats with someone real`);
    assert.ok(v.at || v.path, `${v.id} has a place`);
  }
  assert.ok(VILLAGERS.some((v) => v.title === 'Gatekeeper'));
  assert.ok(VILLAGERS.some((v) => v.title === 'Lantern Keeper'));
  const credited = new Set(POLYFORK_MODELS.map(([id]) => id));
  for (const m of [...LOOKS.map((l) => l.model), ...VILLAGERS.map((v) => v.model)]) assert.ok(credited.has(m), `${m} credited`);
  for (const p of PACKS) assert.ok(p.site.startsWith('https://') && p.licence && p.licenceUrl.startsWith('https://'));
});
