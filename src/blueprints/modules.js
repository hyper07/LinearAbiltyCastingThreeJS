/**
 * Feature modules: the building blocks a genre is made of, and what each one
 * saves for a player. An action RPG uses classes, skills, items and an
 * inventory; a puzzle game would use boards, moves and stars; a story game
 * chapters, choices and flags. A genre lists its modules (genres.js), so the
 * builder, the editor and the save system only switch on what the game uses.
 *
 * Fields
 *   name, blurb   what it is
 *   engine        which runtime provides it: 'action-rpg' (the 3D game in src/core today),
 *                 'shared' (any engine), or a planned engine ('puzzle', 'story')
 *   status        'ready' (in the game now) or 'planned'
 *   saves         the per-player, per-game progress it owns (docs/platform-architecture.md):
 *                 the keys under progress.<module> in a player's save for one game
 *
 * Only 'ready' modules can be used by a genre today; tests/unit/blueprints.test.mjs checks it.
 */
export const MODULES = {
  // ---- shared by every engine ----
  levels: { name: 'Levels and campaign', blurb: 'levels in order, a goal each, an exit', engine: 'shared', status: 'ready', saves: ['completed', 'best'] },
  dialogue: { name: 'Helpers and dialogue', blurb: 'characters who talk, with or without AI', engine: 'shared', status: 'ready', saves: ['met'] },
  study: { name: 'Study', blurb: 'tutor questions, a parent\'s own or generated', engine: 'shared', status: 'ready', saves: ['answered', 'right', 'streak'] },
  rewards: { name: 'Rewards', blurb: 'gold and prizes a parent sets for a score', engine: 'shared', status: 'ready', saves: ['gold', 'earned'] },
  story: { name: 'Story scenes', blurb: 'an opening and an ending per level', engine: 'shared', status: 'ready', saves: ['seen'] },
  party: { name: 'Play together', blurb: 'up to four players in a private room', engine: 'shared', status: 'ready', saves: [] },

  // ---- the action RPG (what Gamory plays today) ----
  combat: { name: 'Combat', blurb: 'real-time fights, health and damage', engine: 'action-rpg', status: 'ready', saves: [] },
  waves: { name: 'Monster waves', blurb: 'waves, bosses, spawn points', engine: 'action-rpg', status: 'ready', saves: ['bestWave'] },
  classes: { name: 'Character classes', blurb: 'built-in and AI-forged classes', engine: 'action-rpg', status: 'ready', saves: ['classId', 'level', 'xp'] },
  skills: { name: 'Skill tree', blurb: 'ranks, keys 1–9, skill books', engine: 'action-rpg', status: 'ready', saves: ['ranks', 'slots', 'points'] },
  items: { name: 'Items and loot', blurb: 'gear, weapons, rarities, shops', engine: 'action-rpg', status: 'ready', saves: ['equipped'] },
  inventory: { name: 'Bag and stash', blurb: 'a grid bag, a shared stash, potions', engine: 'action-rpg', status: 'ready', saves: ['bag', 'stash', 'potions'] },
  royale: { name: 'Battle royale', blurb: 'a closing storm, rival fighters, players against players, last one standing', engine: 'action-rpg', status: 'ready', saves: ['wins', 'bestPlace', 'knockouts'] },
  quests: { name: 'Quests', blurb: 'defeat N monsters for a reward', engine: 'action-rpg', status: 'ready', saves: ['active', 'done'] },

  // ---- planned engines (not built yet) ----
  boards: { name: 'Puzzle boards', blurb: 'grid puzzles: match, slide, connect', engine: 'puzzle', status: 'planned', saves: ['solved', 'stars', 'moves'] },
  hints: { name: 'Hints', blurb: 'a limited number of hints per puzzle', engine: 'puzzle', status: 'planned', saves: ['left'] },
  choices: { name: 'Story choices', blurb: 'branching scenes and endings', engine: 'story', status: 'planned', saves: ['path', 'flags', 'endings'] }
};

export const MODULE_IDS = Object.keys(MODULES);
export const ENGINES = {
  'action-rpg': { name: 'Action RPG', status: 'ready' },
  puzzle: { name: 'Puzzle', status: 'planned' },
  story: { name: 'Story', status: 'planned' }
};
