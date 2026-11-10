/**
 * Genres: the kinds of game the engine can already play, each a set of rules
 * and the pieces it needs. A genre is data, not code: adding one is adding an
 * entry here (see docs/game-builder.md).
 *
 * Fields
 *   engine, modules which runtime plays it and the feature modules it uses (modules.js)
 *   name, blurb     shown in the builder; `blurb` is also the AI's one-line menu entry
 *   words           a regex for the keyword builder (no AI)
 *   goal, count     the level's win rule (Level.js GOALS) and its size at "normal"
 *   calm            no monsters at all
 *   chapters        how many levels a game of this genre has by default
 *   finale          what the last chapter becomes ('boss' = the Emberwyrm waits there)
 *   helpers         NPC archetypes the genre always places (cast.js HELPERS)
 *   layout, foes    defaults when the spec does not say
 *   pace            wave size and growth (rules.baseCount / rules.growth)
 *   story           intro and outro templates; {place} {foes} {goal} {count} are filled in
 *                   ({Place} {Foes} {Goal}: the same, capitalised for the start of a sentence)
 */
export const GENRES = {
  survival: {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory'],
    name: 'Wave survival',
    blurb: 'hold out against growing waves',
    words: /surviv|wave|hold out|defen[cs]e|siege|last stand|horde/,
    goal: 'waves',
    count: 5,
    chapters: 1,
    helpers: ['healer'],
    layout: 'open-field',
    foes: 'mixed',
    pace: { baseCount: 4, growth: 1.35 },
    story: {
      intro: '{Foes} are coming for {place}. {Goal}, and {place} is safe.',
      outro: 'The last wave breaks. {Place} is quiet again, thanks to you.'
    }
  },
  'boss-hunt': {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory'],
    name: 'Boss hunt',
    blurb: 'fight through waves to a dragon boss',
    words: /boss|dragon|wyrm|beast|lair|slay/,
    goal: 'boss',
    count: 4,
    chapters: 1,
    helpers: ['merchant'],
    layout: 'boss-lair',
    foes: 'brutes',
    pace: { baseCount: 4, growth: 1.3 },
    story: {
      intro: 'Deep in {place}, the Emberwyrm stirs. Clear its guards — it comes on wave {count}.',
      outro: 'The Emberwyrm falls. {Place} will tell this story for years.'
    }
  },
  'monster-hunt': {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory', 'quests'],
    name: 'Monster hunt',
    blurb: 'defeat a set number of monsters',
    words: /hunt|defeat \d+|kill|clear|exterminat/,
    goal: 'kills',
    count: 30,
    chapters: 1,
    helpers: ['quest'],
    layout: 'crossroads',
    foes: 'imps',
    pace: { baseCount: 5, growth: 1.3 },
    story: {
      intro: '{Foes} are everywhere in {place}. {Goal}.',
      outro: 'Not one left. The hunters of {place} raise a cheer.'
    }
  },
  quest: {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory', 'quests'],
    name: 'Story quest',
    blurb: 'a short story in chapters, with helpers and a quest',
    words: /story|quest|adventure|journey|tale|rescue|chapter/,
    goal: 'kills',
    count: 20,
    chapters: 3,
    finale: 'boss',
    helpers: ['guide', 'quest'],
    layout: 'village-square',
    foes: 'mixed',
    pace: { baseCount: 4, growth: 1.3 },
    story: {
      intro: 'A call for help comes from {place}. {Goal}, and find out who sent the {foes}.',
      outro: 'The trouble in {place} is over, and the road home is open.'
    }
  },
  'dungeon-crawl': {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory'],
    name: 'Dungeon crawl',
    blurb: 'a run of harder and harder rooms, a boss at the end',
    words: /dungeon|crawl|rooms|floors|levels|tower|descend/,
    goal: 'waves',
    count: 3,
    chapters: 3,
    finale: 'boss',
    helpers: ['merchant'],
    layout: 'gauntlet',
    foes: 'mixed',
    pace: { baseCount: 5, growth: 1.4 },
    story: {
      intro: 'Each room of {place} is worse than the last. {Goal} to open the next door.',
      outro: 'Out of {place} at last, with the treasure and the tale.'
    }
  },
  study: {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'combat', 'waves', 'classes', 'skills', 'items', 'inventory', 'study', 'rewards'],
    name: 'Study adventure',
    blurb: 'answer a tutor\'s questions while a few monsters roam',
    words: /study|math|learn|quiz|homework|times[\s-]?tables?|multiplication|spelling|school|lesson|question/,
    goal: 'study',
    count: 8,
    chapters: 1,
    helpers: ['tutor', 'guide'],
    layout: 'village-square',
    foes: 'spirits',
    pace: { baseCount: 2, growth: 1.15 },
    story: {
      intro: 'The tutors of {place} need a clever hero. {Goal}, and keep the {foes} away while you think.',
      outro: 'Every question answered! The tutors of {place} are proud of you.'
    }
  },
  'calm-study': {
    engine: 'action-rpg',
    modules: ['levels', 'story', 'dialogue', 'party', 'classes', 'study', 'rewards'],
    name: 'Calm learning',
    blurb: 'questions only, no monsters, for young children',
    words: /calm|no monsters|toddler|gentle|peaceful|preschool|kindergarten/,
    goal: 'study',
    count: 6,
    calm: true,
    chapters: 1,
    helpers: ['tutor', 'guide'],
    layout: 'village-square',
    foes: 'none',
    pace: { baseCount: 1, growth: 1 },
    story: {
      intro: 'Welcome to {place}! The tutors have questions for you. {Goal}.',
      outro: 'Wonderful work! {Place} gives you a big cheer.'
    }
  }
};

export const GENRE_IDS = Object.keys(GENRES);

/** How a difficulty scales a genre's numbers. */
export const DIFFICULTY = {
  easy: { count: 0.7, pace: 0.75, growth: 0.92 },
  normal: { count: 1, pace: 1, growth: 1 },
  hard: { count: 1.3, pace: 1.3, growth: 1.06 }
};
export const DIFFICULTY_IDS = Object.keys(DIFFICULTY);
