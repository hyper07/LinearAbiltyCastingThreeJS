/**
 * The inspiration catalog's shared words: every game, manga or story in the
 * catalog is mapped onto these ids, so the builder (and the AI writing a game
 * spec) can say "a game like X" in a few tokens and get our own pieces back.
 *
 * Three kinds of ids:
 *   - `ARCHETYPES`  class archetypes, each pointing at the closest built-in class
 *   - `EFFECTS`     what a skill does, each pointing at the closest ability base
 *   - `FEATURES`    game features (systems), each with what we have today:
 *                   have | close (a small step from what exists) | new | avoid
 *
 * The catalog records facts about other works (names, genres, systems) in our
 * own words, with links. Nothing here is a character or asset to ship: what we
 * make from it is ours, under our own names (each entry's `makeItOurs`).
 */

/** Industry genres (wider than the builder's genres, which are what we can compile today). */
export const GENRE_TAGS = [
  'action-rpg', 'mmorpg', 'jrpg', 'tactical-rpg', 'soulslike', 'roguelike', 'roguelite', 'survivors-like',
  'rts', 'moba', 'battle-royale', 'hero-shooter', 'tower-defense', 'auto-battler', 'deckbuilder',
  'open-world', 'sandbox', 'survival-crafting', 'monster-collecting', 'gacha-rpg', 'idle-rpg',
  'dungeon-crawler', 'hack-and-slash', 'platformer', 'puzzle', 'story-adventure', 'visual-novel',
  'life-sim', 'party', 'educational'
];

/** The builder's genres today (src/blueprints/genres.js): a catalog entry names its nearest one. */
export const BUILDER_GENRES = ['survival', 'boss-hunt', 'monster-hunt', 'quest', 'dungeon-crawl', 'battle-royale', 'squad-royale', 'study', 'calm-study'];
export const BUILDER_WORLDS = [
  'storybook-village', 'enchanted-forest', 'frozen-north', 'desert-ruins', 'haunted-graveyard', 'dragon-dungeon',
  'pirate-coast', 'sci-fi-outpost', 'city-streets', 'farm-fields', 'ancient-temple', 'lava-wastes'
];
export const BUILDER_LAYOUTS = ['open-field', 'crossroads', 'gauntlet', 'village-square', 'twin-gates', 'boss-lair'];
export const BUILDER_FOES = ['imps', 'spirits', 'brutes', 'golems', 'mixed', 'none'];

/** Combat roles. */
export const ROLES = ['tank', 'melee-dps', 'ranged-dps', 'caster', 'healer', 'support', 'summoner', 'controller', 'builder', 'commander'];

/**
 * Class archetypes → the built-in class closest to them today (`hero`), or
 * null when we have none yet.
 */
export const ARCHETYPES = {
  warrior: { hero: 'knight', role: 'tank' },
  knight: { hero: 'knight', role: 'tank' },
  berserker: { hero: 'barbarian', role: 'melee-dps' },
  mage: { hero: 'mage', role: 'caster' },
  elementalist: { hero: 'mage', role: 'caster' },
  archer: { hero: 'amazon', role: 'ranged-dps' },
  ranger: { hero: 'amazon', role: 'ranged-dps' },
  assassin: { hero: 'shadowblade', role: 'melee-dps' },
  rogue: { hero: 'shadowblade', role: 'melee-dps' },
  paladin: { hero: 'templar', role: 'tank' },
  cleric: { hero: 'templar', role: 'healer' },
  necromancer: { hero: 'bonecaller', role: 'summoner' },
  summoner: { hero: 'bonecaller', role: 'summoner' },
  druid: { hero: 'wildwarden', role: 'caster' },
  shapeshifter: { hero: 'wildwarden', role: 'melee-dps' },
  monk: { hero: 'barbarian', role: 'melee-dps' },
  spearman: { hero: 'knight', role: 'melee-dps' },
  gunner: { hero: null, role: 'ranged-dps' },
  engineer: { hero: null, role: 'builder' },
  bard: { hero: null, role: 'support' },
  healer: { hero: null, role: 'healer' },
  tamer: { hero: null, role: 'summoner' },
  commander: { hero: null, role: 'commander' },
  worker: { hero: null, role: 'builder' }
};

/**
 * What a skill does → the ability base closest to it (src/config/settings.js),
 * or null when it is new to us.
 */
export const EFFECTS = {
  projectile: { base: 'ice', shape: 'line' },
  'piercing-bolt': { base: 'thunder', shape: 'line' },
  'area-blast': { base: 'meteor', shape: 'zone' },
  beam: { base: 'beam', shape: 'line' },
  root: { base: 'snare', shape: 'line' },
  'freeze-zone': { base: 'glacier', shape: 'zone' },
  'chain-hit': { base: 'chain', shape: 'line' },
  'slow-orb': { base: 'orb', shape: 'line' },
  'rain-zone': { base: 'hail', shape: 'zone' },
  'dash-strike': { base: 'blink', shape: 'line' },
  'ground-slam': { base: 'slam', shape: 'line' },
  'melee-flurry': { base: 'rampage', shape: 'line' },
  'war-cry': { base: 'roar', shape: 'self' },
  'leap-attack': { base: 'leap', shape: 'zone' },
  whirlwind: { base: 'tempest', shape: 'self' },
  earthquake: { base: 'quake', shape: 'zone' },
  heal: { base: null, shape: 'self' },
  shield: { base: null, shape: 'self' },
  buff: { base: null, shape: 'self' },
  summon: { base: null, shape: 'zone' },
  stealth: { base: null, shape: 'self' },
  trap: { base: null, shape: 'zone' },
  transform: { base: null, shape: 'self' },
  teleport: { base: null, shape: 'line' },
  pull: { base: null, shape: 'line' },
  'damage-over-time': { base: null, shape: 'zone' },
  'build-structure': { base: null, shape: 'zone' },
  passive: { base: null, shape: 'self' }
};

/**
 * Game features: what other games are built from, and where we stand.
 * have: in the engine now · close: a small step · new: to build · avoid: we will not (kids' platform)
 */
export const FEATURES = {
  // Characters and growth
  'character-classes': { status: 'have', note: 'classes with their own bodies, weapons and bonuses' },
  'custom-classes': { status: 'have', note: 'the Class forge' },
  'character-customization': { status: 'have', note: 'body (look) and colours per class' },
  leveling: { status: 'have', note: 'experience and levels, per game, per class' },
  'skill-tree': { status: 'have', note: 'a skill tree per class, ranks from skill books' },
  'mana-resource': { status: 'have', note: 'mana and Mana Potions' },
  'rage-resource': { status: 'have', note: 'the Barbarian fights with Rage' },
  'class-advancement': { status: 'new', note: 'a job change / rank-up at set levels' },
  'rank-system': { status: 'new', note: 'E→S style hunter or adventurer ranks' },
  'stat-points': { status: 'new', note: 'free points to spend on strength, agility…' },
  // Combat
  'real-time-combat': { status: 'have' },
  'aimed-skills': { status: 'have', note: 'line and zone aim' },
  'dodge-roll': { status: 'new' },
  'combo-attacks': { status: 'close', note: 'close-range attack chains exist' },
  'parry-block': { status: 'new' },
  'team-buffs': { status: 'have', note: 'buffs with an aura on allies' },
  summons: { status: 'close', note: 'friendly monsters are a small step from the monster manager' },
  'shadow-army': { status: 'new', note: 'raise defeated foes as allies' },
  'boss-fights': { status: 'have' },
  'boss-phases': { status: 'close' },
  waves: { status: 'have', note: 'survival waves' },
  // Loot and items
  loot: { status: 'have', note: 'drops on the floor' },
  'loot-rarity': { status: 'have', note: 'rarity and random affixes' },
  'grid-inventory': { status: 'have', note: 'the bag' },
  stash: { status: 'have' },
  potions: { status: 'have', note: 'health and mana' },
  crafting: { status: 'new' },
  'gear-upgrading': { status: 'new' },
  trading: { status: 'new' },
  shops: { status: 'have', note: 'the merchant' },
  currency: { status: 'have', note: 'gold' },
  gacha: { status: 'avoid', note: 'paid random draws: not on a children\'s platform' },
  // World and content
  quests: { status: 'have', note: 'quest-givers and kill quests' },
  'npc-dialogue': { status: 'have' },
  'dialogue-choices': { status: 'new' },
  'story-chapters': { status: 'have', note: 'chapters with intro and outro' },
  'dungeon-portals': { status: 'close', note: 'portals exist; gates to instanced dungeons are next' },
  'procedural-dungeons': { status: 'close', note: 'maps are scattered from a plan at load' },
  'open-world': { status: 'new' },
  'day-night': { status: 'new' },
  pets: { status: 'new' },
  mounts: { status: 'new' },
  housing: { status: 'new' },
  'daily-quests': { status: 'new' },
  achievements: { status: 'new' },
  'study-questions': { status: 'have', note: 'tutors and parents\' questions' },
  // Multiplayer
  'co-op-party': { status: 'have', note: 'party code, shared monsters and loot' },
  pvp: { status: 'have', note: 'in the battle royale' },
  'battle-royale-storm': { status: 'have' },
  'ai-opponents': { status: 'have', note: 'AI rivals' },
  lobby: { status: 'have', note: 'lobby with stage, chat, ready and start' },
  'party-chat': { status: 'have' },
  guilds: { status: 'new' },
  'raids': { status: 'close', note: 'co-op boss fights' },
  leaderboards: { status: 'new' },
  'ranked-matchmaking': { status: 'new' },
  // Strategy and other modes
  'base-building': { status: 'new' },
  'resource-gathering': { status: 'new' },
  'unit-production': { status: 'new' },
  'unit-command': { status: 'new', note: 'select and order many units (RTS)' },
  'fog-of-war': { status: 'new' },
  'tech-tree': { status: 'new' },
  lanes: { status: 'new', note: 'MOBA lanes, towers and minion waves' },
  'hero-select': { status: 'have', note: 'the lobby' },
  'building-in-combat': { status: 'new', note: 'walls and ramps built mid-fight' },
  'turn-based-combat': { status: 'new' },
  'deck-building': { status: 'new' },
  'auto-battle': { status: 'new' },
  'roguelike-runs': { status: 'new', note: 'a run of rooms with picks between them' },
  permadeath: { status: 'new' },
  'monster-taming': { status: 'new' },
  puzzles: { status: 'new' },
  'level-editor': { status: 'have' },
  'ai-game-builder': { status: 'have' },
  // Found again and again by the research (the catalog's own words, merged)
  'tower-climb': { status: 'new', note: 'a tower of floors, each its own test, climbed in order' },
  'instant-dungeon': { status: 'close', note: 'a private pocket dungeon opened by a key or a gate' },
  'dungeon-break': { status: 'new', note: 'an uncleared gate spills its monsters into town on a timer' },
  regression: { status: 'new', note: 'failing sends the hero back in time, keeping what they learned' },
  'upgrade-draft': { status: 'new', note: 'pick 1 of 3 upgrades after a level-up or a room' },
  'meta-progression': { status: 'new', note: 'a home hub and a currency that buys permanent unlocks between runs' },
  'run-modifiers': { status: 'new', note: 'mutators that change a run or a week\'s missions' },
  'difficulty-tiers': { status: 'new', note: 'harder replays after the story: tiers, new game plus, ascension' },
  'skill-modifiers': { status: 'new', note: 'pick modifiers that change how a skill behaves (gems, runes, arts)' },
  'passive-board': { status: 'new', note: 'a large board of passive bonuses beyond the skill tree' },
  multiclassing: { status: 'new', note: 'a second class or subclass on one character' },
  'gear-defines-build': { status: 'new', note: 'no fixed class: the weapon and gear are the build' },
  'growing-weapon': { status: 'new', note: 'a bound weapon or item that grows with its owner' },
  'ally-evolution': { status: 'new', note: 'allies and pets that evolve or class up' },
  'copy-skill': { status: 'new', note: 'learn a skill by seeing, eating or defeating its user' },
  'use-based-skills': { status: 'new', note: 'skills improve by being used' },
  'ultimate-ability': { status: 'new', note: 'a big move unlocked by level or charged in combat' },
  'class-unique-mechanic': { status: 'close', note: 'one resource or twist per class (Rage is one)' },
  'elemental-reactions': { status: 'new', note: 'elements that combine, or weaknesses that break armour' },
  'party-switching': { status: 'new', note: 'swap between 3–4 heroes mid-fight' },
  stamina: { status: 'new', note: 'dodges and heavy attacks spend stamina' },
  'downed-revive': { status: 'close', note: 'fall to the ground and wait for a teammate, not straight to the revive timer' },
  'respawn-rules': { status: 'close', note: 'what death costs: a timer, experience, a body to recover' },
  'corpse-run': { status: 'new', note: 'drop your currency on death; get it back once' },
  'checkpoint-rest': { status: 'new', note: 'rest points that save, refill and respawn the foes' },
  'fast-travel': { status: 'close', note: 'waypoints and recall home (portals exist)' },
  'world-events': { status: 'new', note: 'open events anyone nearby joins, ending in a world boss' },
  'conditional-bosses': { status: 'new', note: 'hidden bosses that appear only at night, by a key, or after a trigger' },
  'meal-buffs': { status: 'new', note: 'cook and eat for timed buffs' },
  'npc-affinity': { status: 'new', note: 'friendship with characters, raised by gifts and talk' },
  mentors: { status: 'close', note: 'a mentor who trains the hero (tutors exist)' },
  'secret-identity': { status: 'new', note: 'a masked second identity, or hidden strength' },
  fishing: { status: 'new' },
  seasons: { status: 'new', note: 'seasons, rotating modes and live events' },
  'ping-system': { status: 'new', note: 'mark a spot or foe for teammates without voice' },
  'co-op-missions': { status: 'close', note: 'two players on a mission against the AI' },
  // Competitive
  'in-match-leveling': { status: 'new', note: 'level 1 at the start of every match, upgrades picked during it' },
  'neutral-camps': { status: 'new', note: 'neutral monster camps that respawn and give gold, experience or buffs' },
  'hero-draft': { status: 'new', note: 'pick and ban heroes in turns' },
  'map-objectives': { status: 'new', note: 'shared objectives that swing a match' },
  'capture-points': { status: 'new', note: 'hold a zone to score or win' },
  'score-goals': { status: 'close', note: 'score to win (the arena keeps a score)' },
  'drop-in-start': { status: 'new', note: 'everyone chooses where to land at the start' },
  // Strategy
  'asymmetric-factions': { status: 'new', note: 'factions that gather, build and fight differently' },
  'supply-cap': { status: 'new', note: 'an army limit raised by supply buildings' },
  'hero-units': { status: 'new', note: 'a hero unit that levels inside an army' },
  'commander-calldowns': { status: 'new', note: 'global powers on cooldowns: strikes, drops, shields' },
  'commander-progression': { status: 'new', note: 'commanders that level up between missions' }
};

/**
 * Words the research used for a feature above → its id. The catalog files are
 * written with the ids; these let the next round of research land on them too.
 */
export const FEATURE_ALIASES = {
  'climbing-tower': 'tower-climb', 'floor-ladder': 'tower-climb', 'tutorial-floors': 'tower-climb',
  'key-summons': 'instant-dungeon', 'red-gate': 'dungeon-break',
  'reincarnation-restart': 'regression',
  'level-up-draft': 'upgrade-draft', 'run-boons': 'upgrade-draft', 'run-perks': 'upgrade-draft', 'round-upgrades': 'upgrade-draft',
  'blueprint-unlocks': 'meta-progression', 'home-hub': 'meta-progression',
  'weekly-mutators': 'run-modifiers', 'daily-seed-challenge': 'run-modifiers',
  'hard-mode-toggle': 'difficulty-tiers', 'ascension-difficulty': 'difficulty-tiers', 'difficulty-pact': 'difficulty-tiers', 'new-game-plus': 'difficulty-tiers',
  'skill-gems': 'skill-modifiers', 'weapon-arts': 'skill-modifiers',
  'dual-class': 'multiclassing', subclasses: 'multiclassing',
  'gear-defines-class': 'gear-defines-build', 'job-by-weapon': 'gear-defines-build', 'weapon-classes': 'gear-defines-build',
  'named-artifact-weapons': 'growing-weapon', 'living-gear': 'growing-weapon', 'grimoire-weapon': 'growing-weapon', 'djinn-vessels': 'growing-weapon', 'spirit-gear': 'growing-weapon', 'weapon-evolution': 'growing-weapon',
  'naming-evolution': 'ally-evolution',
  'devour-and-copy': 'copy-skill',
  'practice-proficiency': 'use-based-skills',
  'ultimate-gauge': 'ultimate-ability', 'team-limit-break': 'ultimate-ability',
  'elemental-weakness': 'elemental-reactions', 'weakness-break': 'elemental-reactions', 'elemental-surfaces': 'elemental-reactions', 'elemental-affinity': 'elemental-reactions', 'element-affinity': 'elemental-reactions', 'element-schools': 'elemental-reactions',
  'downed-state': 'downed-revive',
  'respawn-timer': 'respawn-rules', 'respawn-mode': 'respawn-rules', 'respawn-cost': 'respawn-rules', resurrection: 'respawn-rules', 'body-recovery-revive': 'respawn-rules',
  'camp-rest': 'checkpoint-rest',
  'fast-travel-waypoints': 'fast-travel', 'recall-home': 'fast-travel',
  'world-invasions': 'world-events',
  'signature-spell-bosses': 'conditional-bosses', 'conditional-uniques': 'conditional-bosses',
  'monster-cooking': 'meal-buffs',
  'friendship-gifts': 'npc-affinity',
  'mentor-training': 'mentors',
  'mana-concealment': 'secret-identity',
  'mode-rotation': 'seasons', 'live-events': 'seasons',
  'single-lane-mode': 'lanes',
  'capture-or-slay': 'monster-taming', 'creature-breeding': 'monster-taming',
  'shared-team-xp': 'in-match-leveling',
  'draft-challenges': 'hero-draft'
};

export const FEATURE_IDS = Object.keys(FEATURES);
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
export const EFFECT_IDS = Object.keys(EFFECTS);
