import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINES, FOES, GAME_SPEC_SCHEMA, CUSTOM_SPEC_SCHEMA, GENRES, GENRE_IDS, HERO_IDS, LAYOUTS, LAYOUT_IDS, MODULES, WORLDS, WORLD_IDS, FOE_IDS,
  chapterIds, compileGame, fill, keywordSpec, menuPrompt, normalizeSpec
} from '../../src/blueprints/index.js';
import { MONSTER_KINDS, normalizeLevel } from '../../src/levels/Level.js';
import { CLASS_SPECS } from '../../src/platform/character/classes.js';

const ARENA = 25;

test('every genre × world × layout compiles to valid, playable levels', () => {
  for (const genre of GENRE_IDS) {
    for (const world of WORLD_IDS) {
      for (const layout of LAYOUT_IDS) {
        const { levels, spec } = compileGame({ genre, world, layout, name: 'Test', chapters: GENRES[genre].chapters }, { seed: 7 });
        assert.equal(levels.length, spec.chapters);
        assert.equal(new Set(levels.map((l) => l.id)).size, levels.length, 'ids are unique');
        for (const level of levels) {
          // Normalising again changes nothing: the compiler writes valid levels.
          assert.deepEqual(normalizeLevel(structuredClone(level)), level, `${genre}/${world}/${layout}`);
          assert.ok(level.plan, 'carries its map plan');
          assert.equal(level.objects.length, 0, 'scenery is scattered at load time');
          for (const thing of [...level.spawns, ...level.npcs, ...level.portals, ...level.monsters]) {
            assert.ok(Math.hypot(thing.x, thing.z) <= ARENA, `${genre}/${layout}: inside the arena`);
          }
          if (level.rules.calm) {
            assert.equal(level.monsters.length, 0);
          }
          assert.equal(level.rules.kinds.dragon, 0, 'the dragon only comes as a boss');
          if (level.rules.goal === 'boss') assert.equal(level.rules.dragonEvery, level.rules.count);
          else assert.equal(level.rules.dragonEvery, 0, 'no surprise dragon outside a boss goal');
        }
      }
    }
  }
});

test('chapters grow, and a finale genre ends in the boss lair', () => {
  const { levels } = compileGame({ genre: 'dungeon-crawl', world: 'frozen-north', chapters: 3, name: 'Deep Ice' }, { seed: 1 });
  assert.deepEqual(levels.map((l) => l.id), ['deep-ice-1', 'deep-ice-2', 'deep-ice-3']);
  assert.ok(levels[1].rules.baseCount >= levels[0].rules.baseCount);
  assert.equal(levels[2].rules.goal, 'boss');
  assert.equal(levels[2].blueprint.layout, 'boss-lair');
  assert.notEqual(levels[1].blueprint.layout, levels[0].blueprint.layout, 'later chapters vary the layout');
  assert.equal(levels[0].world.seed === levels[1].world.seed, false, 'each chapter its own scenery');
});

test('study genres place a tutor with the parent\'s questions and rewards; calm has no monsters', () => {
  const questions = [{ q: 'How many legs does a spider have?', a: '8', wrong: ['6'], hint: '' }];
  const { levels } = compileGame({ genre: 'calm-study', world: 'farm-fields', questions, subject: 'custom', age: 6, reward: { gold: 25, every: 3, bonus: 'health' } });
  const [level] = levels;
  assert.equal(level.rules.goal, 'study');
  assert.equal(level.rules.calm, true);
  assert.ok(Object.values(level.rules.kinds).every((w) => w === 0));
  const tutor = level.npcs.find((n) => n.role === 'tutor');
  assert.ok(tutor, 'a tutor');
  assert.equal(tutor.study.subject, 'custom');
  assert.equal(tutor.study.questions[0].a, '8');
  assert.equal(tutor.study.gold, 25);
  assert.equal(tutor.study.bonusEvery, 3);
  assert.equal(tutor.study.age, 6);
});

test('a compiled level is small: plan, not objects', () => {
  const { levels } = compileGame({ genre: 'quest', world: 'pirate-coast' });
  for (const level of levels) assert.ok(JSON.stringify(level).length < 6000, `${level.id} is ${JSON.stringify(level).length} bytes`);
});

test('the keyword builder reads a sentence with no AI', () => {
  const cases = [
    ['a math game for my 7 year old', { genre: 'study', subject: 'mixed', age: 7 }],
    ['a times tables adventure in an enchanted forest', { genre: 'study', world: 'enchanted-forest', subject: 'times' }],
    ['A times-tables adventure for my 8 year old', { genre: 'study', subject: 'times', age: 8 }],
    ['snowy dungeon crawl with three rooms and a knight', { genre: 'dungeon-crawl', world: 'frozen-north', hero: 'knight', chapters: 3 }],
    ['calm counting game on a farm, no monsters', { genre: 'calm-study', world: 'farm-fields', foes: 'none' }],
    ['pirate story quest', { genre: 'quest', world: 'pirate-coast' }],
    ['haunted graveyard boss fight, hard', { genre: 'boss-hunt', world: 'haunted-graveyard', difficulty: 'hard' }],
    ['', { genre: 'survival' }]
  ];
  for (const [text, want] of cases) {
    const spec = keywordSpec(text);
    for (const [k, v] of Object.entries(want)) assert.equal(spec[k], v, `${JSON.stringify(text)} → ${k}`);
  }
});

test('specs are repaired: unknown ids, study rules, calm foes, forged heroes', () => {
  const spec = normalizeSpec({ genre: 'nope', world: 'mars', hero: 'forge-x', chapters: 99, foes: 'dragons' });
  assert.equal(spec.genre, 'survival');
  assert.equal(spec.world, 'storybook-village');
  assert.equal(spec.hero, 'any');
  assert.equal(spec.chapters, 5);
  assert.equal(spec.subject, 'none', 'no subject outside study genres');
  assert.equal(normalizeSpec({ hero: 'forge-x' }, { heroes: ['forge-x'] }).hero, 'forge-x');
  assert.equal(normalizeSpec({ genre: 'calm-study', foes: 'brutes' }).foes, 'none');
  assert.equal(normalizeSpec({ genre: 'study', subject: 'none' }).subject, 'mixed');
  assert.equal(normalizeSpec({ genre: 'study', subject: 'custom' }).subject, 'mixed', 'custom needs questions');
  // The custom (Plus) answer's shape folds into spec.custom.
  const custom = normalizeSpec({ genre: 'quest', map: { theme: 'coast' }, chapterStories: [{ name: 'Landfall', intro: 'Hi', outro: 'Bye' }], npcs: [{ name: 'Marlo', greeting: 'Ahoy', lines: ['Yo'] }] });
  assert.equal(custom.custom.chapters[0].name, 'Landfall');
  const { levels } = compileGame(custom);
  assert.equal(levels[0].story.intro.title, 'Landfall');
  assert.equal(levels[0].npcs[0].name, 'Marlo');
  assert.equal(levels[0].npcs[0].greeting, 'Ahoy');
});

test('the AI\'s menus and schema come from the registries, and stay small', () => {
  const prompt = menuPrompt();
  for (const id of [...GENRE_IDS, ...WORLD_IDS, ...LAYOUT_IDS, ...HERO_IDS, ...FOE_IDS]) assert.ok(prompt.includes(`- ${id}:`), id);
  assert.deepEqual(GAME_SPEC_SCHEMA.properties.genre.enum, GENRE_IDS);
  assert.deepEqual(GAME_SPEC_SCHEMA.properties.world.enum, WORLD_IDS);
  assert.deepEqual(GAME_SPEC_SCHEMA.required, Object.keys(GAME_SPEC_SCHEMA.properties), 'strict: every field required');
  assert.deepEqual(CUSTOM_SPEC_SCHEMA.required, Object.keys(CUSTOM_SPEC_SCHEMA.properties));
  // ~4 characters a token: the standard prompt stays under ~1,000 tokens.
  assert.ok(prompt.length < 4000, `prompt is ${prompt.length} characters`);
  assert.equal(menuPrompt(), prompt, 'the same text every time (a cacheable prefix)');
});

test('heroes are real classes; genres use ready modules on a ready engine', () => {
  const classes = new Set(CLASS_SPECS.map((c) => c.id));
  for (const id of HERO_IDS) if (id !== 'any') assert.ok(classes.has(id), id);
  for (const [id, genre] of Object.entries(GENRES)) {
    assert.equal(ENGINES[genre.engine]?.status, 'ready', `${id}: engine`);
    for (const m of genre.modules) {
      assert.ok(MODULES[m], `${id}: module ${m}`);
      assert.equal(MODULES[m].status, 'ready', `${id}: ${m} is built`);
      assert.ok(['shared', genre.engine].includes(MODULES[m].engine), `${id}: ${m} runs on ${genre.engine}`);
    }
    if (genre.calm) assert.ok(!genre.modules.includes('combat'), `${id}: calm has no combat`);
  }
  for (const foes of Object.values(FOES)) for (const kind of Object.keys(foes.kinds)) assert.ok(MONSTER_KINDS.includes(kind));
  for (const layout of Object.values(LAYOUTS)) assert.ok(layout.helpers.length >= 2, 'room for the genre helpers');
  for (const world of Object.values(WORLDS)) assert.ok(world.names.length >= 2);
});

test('fill capitalises at the start of a sentence; chapter ids avoid taken ones', () => {
  assert.equal(fill('{Place} is safe. Save {place}.', { place: 'the village' }), 'The village is safe. Save the village.');
  assert.equal(fill('{unknown} stays', {}), '{unknown} stays');
  assert.deepEqual(chapterIds('Moon Run', 1, new Set(['moon-run'])), ['moon-run-2']);
  assert.deepEqual(chapterIds('Moon Run', 2, new Set(['moon-run-1'])), ['moon-run-2-1', 'moon-run-2-2']);
});
