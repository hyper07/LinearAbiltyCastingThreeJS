/**
 * The Game Studio's data (src/shared/studio/spec.js), the chat patch (patch.js), the offline
 * keyword planner (planner.js) and the style template (server/gameTemplates.js 'studio').
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANIMATIONS, DATA_KEYS, LIMITS, LOOKS, RENDERS, STARTER_IDS, creditsOf, defaultMap, starterData, validateData, uniqueId } from '../../src/shared/studio/spec.js';
import { LM_PATCH_SCHEMA, PATCH_SCHEMA, applyPatch, characterPatch, mapPatch, op, resolveMap, validatePatch } from '../../src/shared/studio/patch.js';
import { planFromText, wantsNewMap } from '../../src/shared/studio/planner.js';
import { check, lmSchema } from '../../src/shared/studio/schema.js';
import { layoutMap, collide } from '../../src/shared/studio/layout.js';
import { studioParams, templateFiles, TEMPLATES } from '../../server/gameTemplates.js';
import { createPackage, isUnlistedStudio, packageGames, scanPackages } from '../../server/gamePackages.js';
import { cleanPatchText, kidSafe } from '../../server/studio/chat.js';

const TRACKS = [
  { id: 'meadow', title: 'Meadow', mood: 'calm', tags: ['calm', 'nature'] },
  { id: 'battle', title: 'Steel Rain', mood: 'battle', tags: ['battle'] },
  { id: 'boss', title: 'Boss', mood: 'boss', tags: ['battle', 'boss'] },
  { id: 'frozen-fortress', title: 'Frozen Fortress', mood: 'tense', tags: ['dungeon', 'night'] },
  { id: 'playful', title: 'Playful', mood: 'calm', tags: ['kids', 'calm'] }
];
const catalog = { tracks: new Set(TRACKS.map((t) => t.id)) };
const game = (over = {}) => starterData({ title: 'Test Game', render: 'full3d', animation: 'plush', look: 'cartoon', genre: 'boss-hunt', ...over });

/* ------------------------------------------------------------- the data */

test('every render × animation × look × starter makes valid data (the template is parameters, not copies)', () => {
  let n = 0;
  for (const render of RENDERS) for (const animation of ANIMATIONS) for (const look of LOOKS) for (const genre of STARTER_IDS) {
    const data = starterData({ title: 'X', render, animation, look, genre });
    assert.deepEqual(validateData(data), [], `${render}/${animation}/${look}/${genre}`);
    assert.equal(data.style.render, render);
    assert.equal(data.style.animation, animation);
    assert.equal(data.style.look, look);
    n++;
  }
  assert.equal(n, 4 * 4 * 3 * STARTER_IDS.length);
});

test('unknown style values fall back to the defaults; the boss starter has a boss', () => {
  const data = starterData({ title: 'X', render: 'vr', animation: 'mocap', look: 'noir', genre: 'nope' });
  assert.equal(data.style.render, 'full3d');
  assert.equal(data.rules.genre, 'collect');
  assert.deepEqual(validateData(data), []);
  const boss = game();
  assert.ok(boss.cast.characters.some((c) => c.role === 'boss'));
  assert.equal(boss.rules.goal, 'boss');
});

test('validateData catches what a schema cannot: spawns of nobody, duplicate ids, missing assets', () => {
  const data = game();
  data.maps.maps[0].spawns.push({ cast: 'ghost-of-nobody', count: 2 });
  assert.match(validateData(data).join(), /no character "ghost-of-nobody"/);
  const dup = game();
  dup.maps.maps.push({ ...dup.maps.maps[0] });
  assert.match(validateData(dup).join(), /share an id/);
  const asset = game();
  asset.maps.maps[0].props.push({ asset: 'lib:model/rock', count: 2 });
  assert.match(validateData(asset).join(), /not in assets.json/);
  const extra = game();
  extra.rules.cheat = true;
  assert.match(validateData(extra).join(), /cheat: unknown field/);
});

test('ids are made unique, and credits list every asset with its licence', () => {
  assert.equal(uniqueId('Frost Woods', ['frost-woods', 'frost-woods-2']), 'frost-woods-3');
  const data = game();
  data.assets.used.push({ id: 'lib:model/kaykit/tree', kind: 'model', name: 'Tree', file: 'kaykit/tree.glb', licence: 'CC0-1.0', author: 'Kay Lousberg', url: 'https://kaylousberg.com', terms: null });
  const credits = creditsOf(data);
  assert.ok(credits.some((c) => c.who === 'three.js'));
  assert.ok(credits.some((c) => c.who === 'Kay Lousberg' && c.licence === 'CC0-1.0'));
});

/* ------------------------------------------------------------ the patch */

test('the patch schema is strict: every field required, no extras (what the LM model is held to)', () => {
  const opSchema = PATCH_SCHEMA.properties.ops.items;
  assert.deepEqual(opSchema.required, Object.keys(opSchema.properties));
  assert.equal(opSchema.additionalProperties, false);
  // The schema sent to the model keeps structure and enums, drops limits some servers refuse.
  assert.equal(JSON.stringify(LM_PATCH_SCHEMA).includes('maxLength'), false);
  assert.ok(JSON.stringify(LM_PATCH_SCHEMA).includes('"enum"'));
  assert.deepEqual(check(lmSchema({ type: 'string', maxLength: 3 }), 'long string'), []);
});

test('LM output that does not fit is refused, field by field', () => {
  const data = game();
  const bad = [
    'not even an object',
    { summary: 'x' },
    { summary: 'x', ops: [{ op: 'deleteEverything' }] },
    { summary: 'x', ops: [op('addMap', { map: { ...mapPatch({ biome: 'moon' }) } })] },
    { summary: 'x', ops: [op('addMap', { map: { ...mapPatch({ name: 'A' }), hack: 1 } })] },
    { summary: 'x', ops: [op('updateCharacter', { target: 'nobody', character: characterPatch({ speed: 2 }) })] },
    { summary: 'x', ops: [op('updateCharacter', { target: 'boss', character: characterPatch({ speed: 99 }) })] },
    { summary: 'x', ops: [op('setMusic', { track: 'not-a-track' })] },
    { summary: 'x', ops: [op('setSfx', { target: 'explode', sound: 'zap' })] },
    { summary: 'x', ops: [op('removeMap', { target: 'map 9' })] },
    { summary: 'x', ops: Array.from({ length: 13 }, () => op('setRules', { rules: null })) }
  ];
  for (const raw of bad) {
    const r = validatePatch(raw, data, catalog);
    assert.equal(r.ok, false, JSON.stringify(raw).slice(0, 80));
    assert.ok(r.problems.length);
  }
});

test('a valid patch applies: a new map, a slower boss, a new sound — and says what changed', () => {
  const data = game();
  const boss = data.cast.characters.find((c) => c.role === 'boss');
  const patch = {
    summary: 'Added Frost Woods, slowed the boss, new coin sound',
    ops: [
      op('addMap', { map: mapPatch({ name: 'Frost Woods', biome: 'snow', features: ['trees', 'frozen-lake'] }) }),
      op('updateCharacter', { target: 'boss', character: characterPatch({ speed: 1.5 }) }),
      op('setSfx', { target: 'coin', sound: 'chime' })
    ]
  };
  assert.equal(validatePatch(patch, data, catalog).ok, true);
  const out = applyPatch(data, patch, catalog);
  assert.deepEqual(out.problems, []);
  assert.deepEqual(out.files.sort(), ['audio', 'cast', 'maps']);
  assert.equal(out.data.maps.maps.length, 2);
  assert.deepEqual(out.data.maps.maps[1].features, ['trees', 'frozen-lake']);
  assert.equal(out.data.cast.characters.find((c) => c.id === boss.id).speed, 1.5);
  assert.equal(out.data.audio.sfx.coin, 'chime');
  assert.ok(out.changes.some((c) => /Added map 2: "Frost Woods"/.test(c)));
  assert.ok(out.changes.some((c) => /speed 2.2 → 1.5/.test(c)));
  // The original is untouched (apply works on a copy).
  assert.equal(data.maps.maps.length, 1);
});

test('limits hold: the last map stays, maps cap at the limit', () => {
  const data = game();
  const keep = applyPatch(data, { summary: '', ops: [op('removeMap', { target: 'first' })] }, catalog);
  assert.equal(keep.data.maps.maps.length, 1);
  const full = game();
  full.maps.maps = Array.from({ length: LIMITS.maps }, (_, i) => defaultMap({ name: `M${i}` }, Array.from({ length: i }, (_, k) => `m${k}`)));
  full.maps.maps.forEach((m, i) => (m.id = `m${i}`));
  const more = applyPatch(full, { summary: '', ops: [op('addMap', { map: mapPatch({ name: 'Too many' }) })] }, catalog);
  assert.equal(more.data.maps.maps.length, LIMITS.maps);
});

test('maps resolve by id, name, number and first/last', () => {
  const maps = [{ id: 'a', name: 'Green Meadow' }, { id: 'b', name: 'Frost Woods' }];
  assert.equal(resolveMap(maps, 'map 2').id, 'b');
  assert.equal(resolveMap(maps, 'last').id, 'b');
  assert.equal(resolveMap(maps, 'frost').id, 'b');
  assert.equal(resolveMap(maps, 'a').id, 'a');
  assert.equal(resolveMap(maps, 'map 7'), null);
});

test('text from the LM model is made safe for children before it is written', () => {
  assert.equal(kidSafe('call me at 010-1234-5678 or a@b.com, see https://x.y', 200).includes('1234'), false);
  assert.match(kidSafe('see https://x.y', 200), /\[link\]/);
  const p = cleanPatchText({ summary: 'ok', ops: [op('addCharacter', { character: characterPatch({ name: 'Bob', line: 'mail me: kid@example.com' }) })] });
  assert.equal(p.ops[0].character.line.includes('@'), false);
});

/* ---------------------------------------------------------- the planner */

const plan = (text, data = game(), opts = {}) => planFromText(text, data, { tracks: TRACKS, ...opts });

test('planner: "add a snowy forest map with a frozen lake"', () => {
  const p = plan('add a snowy forest map with a frozen lake');
  assert.equal(p.understood, true);
  assert.equal(p.ops.length, 1);
  assert.equal(p.ops[0].op, 'addMap');
  assert.equal(p.ops[0].map.biome, 'snow');
  assert.deepEqual(p.ops[0].map.features, ['trees', 'frozen-lake']);
  assert.equal(p.ops[0].map.name, 'Snowy Forest');
  const data = game();
  assert.equal(validatePatch({ summary: p.summary, ops: p.ops }, data, catalog).ok, true);
});

test('planner: "make the boss slower" slows the boss by about a third', () => {
  const data = game();
  const boss = data.cast.characters.find((c) => c.role === 'boss');
  const p = plan('make the boss slower', data);
  assert.equal(p.ops[0].op, 'updateCharacter');
  assert.equal(p.ops[0].target, boss.id);
  assert.equal(p.ops[0].character.speed, Math.round(boss.speed * 0.7 * 10) / 10);
});

test('planner: "add a coin sound" changes the coin sound (to another one when there is one)', () => {
  const data = game();
  const p = plan('add a coin sound', data);
  assert.equal(p.ops[0].op, 'setSfx');
  assert.equal(p.ops[0].target, 'coin');
  assert.notEqual(p.ops[0].sound, data.audio.sfx.coin);
  assert.equal(plan('make the jump sound boing', data).ops[0].sound, 'boing');
});

test('planner: monsters, more of them, music, weather, rules — and never a new map by mistake', () => {
  const data = game();
  const add = plan('add 3 slime enemies to map 1', data);
  assert.equal(add.ops[0].op, 'addCharacter');
  assert.equal(add.ops[0].character.body, 'slime');
  assert.equal(add.ops[0].character.count, 3);
  assert.equal(add.ops[0].target, data.maps.maps[0].id);
  const rain = plan('make it rain on map 1', data);
  assert.equal(rain.ops[0].op, 'updateMap');
  assert.equal(rain.ops[0].map.weather, 'rain');
  assert.equal(wantsNewMap('add rain to the first map'), false);
  assert.equal(wantsNewMap('make it night on map 2'), false);
  assert.equal(wantsNewMap('make me a new desert level'), true);
  const coins = plan('more coins', data);
  assert.equal(coins.ops[0].op, 'updateMap');
  assert.equal(coins.ops[0].map.collectibles, data.maps.maps[0].collectibles + 5);
  const music = plan('play calm music', data);
  assert.equal(music.ops[0].op, 'setMusic');
  assert.equal(music.ops[0].track, 'meadow');
  const rules = plan('give me 5 lives and make it easier', data);
  assert.ok(rules.ops.some((o) => o.op === 'setRules' && o.rules.lives === 5));
  assert.ok(rules.ops.some((o) => o.op === 'setRules' && o.rules.difficulty === 'easy'));
  const style = plan('make it pixel art in hd-2d', data);
  assert.equal(style.ops[0].style.render, 'hd2d');
  assert.equal(style.ops[0].style.animation, 'pixel');
});

test('planner: two requests in one message, and nonsense is not understood', () => {
  const two = plan('add a desert map. then make the boss faster');
  assert.deepEqual(two.ops.map((o) => o.op), ['addMap', 'updateCharacter']);
  const none = plan('banana telephone');
  assert.equal(none.understood, false);
  assert.equal(none.ops.length, 0);
});

test('planner: the same words on the same game give the same patch', () => {
  const data = game();
  assert.deepEqual(plan('add a lava map with towers and 2 ghosts', data), plan('add a lava map with towers and 2 ghosts', data));
});

/* ----------------------------------------------------------- the layout */

test('layouts are seeded (same map, same layout) and keep the start and exit clear', () => {
  const map = defaultMap({ biome: 'forest', name: 'Woods' });
  map.spawns = [];
  const a = layoutMap(map, { goal: 'collect' });
  const b = layoutMap(map, { goal: 'collect' });
  assert.deepEqual(a.solids, b.solids);
  for (const s of a.solids) {
    assert.ok(Math.hypot(s.x - a.start.x, s.z - a.start.z) > 3, 'nothing on the start');
    assert.ok(Math.hypot(s.x - a.exit.x, s.z - a.exit.z) > 3, 'nothing on the door');
  }
  const side = layoutMap(map, { side: true });
  assert.equal(side.kind, 'side');
  const p = collide(a, 999, 999, 0.5);
  assert.ok(p.x <= a.area.x1 && p.z <= a.area.z1, 'kept inside the map');
});

/* --------------------------------------------------------- the template */

test("the studio template: one template, choices as parameters, data that fits, an index that hands it to the runtime", () => {
  assert.ok(TEMPLATES.includes('studio'));
  const params = studioParams({ render: 'hd2d', animation: 'pixel', look: 'stylized', genre: 'quest', evil: 'yes' });
  assert.deepEqual(Object.keys(params).sort(), ['animation', 'genre', 'look', 'palette', 'render', 'version']);
  const files = templateFiles({ code: 'g_abcdefghij', slug: 'quest-abcdef', id: 'studio:quest-abcdef', title: "Mia's Quest" }, 'studio', params);
  for (const key of DATA_KEYS) assert.ok(files[`data/${key}.json`], key);
  const data = Object.fromEntries(DATA_KEYS.map((k) => [k, JSON.parse(files[`data/${k}.json`])]));
  assert.deepEqual(validateData(data), []);
  assert.equal(data.style.render, 'hd2d');
  assert.match(files['index.js'], /mountStudioGame/);
  assert.match(files['index.js'], /Mia\\'s Quest/);
  assert.ok(files['tests/package.test.mjs'].includes('validateData'));
});

test('a Studio package: slug from its code, id studio:<slug>, owner in the manifest, unlisted — so never on the home page', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-pkg-'));
  try {
    const m = createPackage(dir, { title: 'Class Simulator', template: 'studio', params: { render: 'flat2d', genre: 'collect' }, studio: { owner: { id: 7, name: 'Ms Park' } } });
    assert.match(m.slug, /^class-simulator-[a-z2-7]{6}$/);
    assert.equal(m.id, `studio:${m.slug}`);
    assert.deepEqual(m.studio, { owner: { id: 7, name: 'Ms Park' }, listed: false });
    assert.ok(existsSync(join(dir, m.code, 'data', 'maps.json')));
    assert.equal(JSON.parse(readFileSync(join(dir, m.code, 'data', 'style.json'), 'utf8')).render, 'flat2d');
    assert.equal(isUnlistedStudio(m), true);
    assert.equal(scanPackages(dir).length, 1);
    const listed = packageGames({ gamesDir: dir, releasesDir: join(dir, 'releases'), log: () => {} })();
    assert.deepEqual(listed, [], 'unlisted Studio games are not on the home page');
    // Two games with the same title never clash (the slug carries the code).
    const again = createPackage(dir, { title: 'Class Simulator', template: 'studio', studio: { owner: { id: 7, name: 'Ms Park' } } });
    assert.notEqual(again.slug, m.slug);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isUnlistedStudio: only Studio games, and only until they are listed', () => {
  assert.equal(isUnlistedStudio({ code: 'g_x' }), false);
  assert.equal(isUnlistedStudio({ studio: { listed: false } }), true);
  assert.equal(isUnlistedStudio({ studio: { listed: true } }), false);
});
