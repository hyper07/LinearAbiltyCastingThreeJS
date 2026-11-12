/**
 * The game builder's blueprints: menus of genres, worlds, layouts and casts,
 * the spec the AI fills in, and the compiler that turns a spec into levels.
 * Plain data and functions, no three.js, so the browser, the server, the
 * command line (scripts/new-game.mjs) and the tests share them.
 * See docs/game-builder.md.
 */
export { MODULES, MODULE_IDS, ENGINES } from './modules.js';
export { GENRES, GENRE_IDS, DIFFICULTY, DIFFICULTY_IDS } from './genres.js';
export { WORLDS, WORLD_IDS } from './worlds.js';
export { LAYOUTS, LAYOUT_IDS } from './layouts.js';
export { HEROES, HERO_IDS, FOES, FOE_IDS, HELPERS, HELPER_IDS, SUBJECT_IDS, mainKind } from './cast.js';
export { GAME_SPEC_SCHEMA, CUSTOM_SPEC_SCHEMA, MAX_CHAPTERS, MAX_PROMPT_HEROES, describeHero, specSchema, SPEC_VERSION, isStudyGenre, keywordPicks, keywordSpec, menuPrompt, normalizeSpec } from './spec.js';
export { chapterIds, compileGame, fill, worldPlan } from './compile.js';
