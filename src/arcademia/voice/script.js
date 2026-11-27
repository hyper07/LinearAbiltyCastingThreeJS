/**
 * AI Arcademia's voice script: every spoken line, by character and
 * language, with a stable line id.
 *
 * A line is heard as a real person's recording from the voice studio
 * (voice-studio.html) when there is one, else as the character's generated
 * voice (generated.js; npm run voice:gen), else the game shows the text
 * alone. The browser's speech synthesis is never used.
 *
 * Line ids come from where the text lives, never from the text itself, so
 * they don't change when a translation or a sentence is edited:
 *
 *   t.<i18n key>               a string table line         t.lesson.hello.math
 *   t.<i18n key>~<variant>     the same, filled in for one lesson or floor
 *                                                           t.quest.history.intro~h1-long-ago
 *   l.<lesson id>.<path>       a lesson's own text          l.h1-long-ago.reading.2
 *                                                           l.p1-ramps.quiz.0.hint
 *
 * Characters: the teachers (hoot, tock, gizmo; each realm's own: nutmeg, bramble,
 * ribbit, pip, inka, splash, lotus, reed, sandy, mochi, ginger, comet, ruby, woolly,
 * digby, biscuit, hartley, sprocket), one history guide per history lesson (guide-<lesson id>),
 * the floor bosses (boss-1 … boss-7, and each realm's: forest-boss-n, sea-boss-n,
 * desert-boss-n, moon-boss-n, mars-boss-n, castle-boss-n),
 * the townsfolk (townsfolk) and the buddies (buddy-fox, buddy-robot,
 * buddy-dragon, buddy-puff, buddy-bunny).
 *
 * Kinds, recorded in this order: barks (short reactions used everywhere:
 * greetings, "great job", "try again", hints, lesson start and end, level up,
 * sticker found), then story lines, reading cards and quiz prompts, floor by
 * floor from the bottom of the mountain.
 *
 * Pure data and string work: the game, the studio, the server (to check an
 * upload's ids) and scripts/voice-script.mjs all build the same script. The
 * caller loads the language first (loadLocale or registerLocale).
 */
import { tIn, localizeLesson, LOCALE_IDS } from '../i18n/index.js';
import { LESSONS, lessonsIn } from '../content/index.js';
import { FLOOR_COUNT } from '../content/schema.js';
import { SLOTS, subjectAt, slotOf, activitiesOf, helloKey, buildingKey } from '../content/subjects.js';

export const VOICE_KINDS = ['bark', 'story', 'reading', 'quiz'];
export const VOICE_GROUPS = ['teacher', 'guide', 'boss', 'townsfolk', 'buddy'];
export const BUDDY_IDS = ['fox', 'robot', 'dragon', 'puff', 'bunny'];
/** A line id: t.<key>[~variant] or l.<lesson>.<path>. Letters, digits and . _ ~ - only, never "..". */
const LINE_RE = /^[tl]\.[A-Za-z0-9][A-Za-z0-9._~-]{0,160}$/;
const CHAR_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
export const isLineId = (s) => typeof s === 'string' && LINE_RE.test(s) && !s.includes('..') && !s.endsWith('.');
export const isCharId = (s) => typeof s === 'string' && CHAR_RE.test(s);
/** How a recording is addressed: language, character, line. */
export const lineKey = (lang, char, id) => `${lang}/${char}/${id}`;

/** The teachers, by the school slot each one teaches in (content/subjects.js SLOTS; the subject there is the realm's). */
export const TEACHER_OF = { math: 'hoot', history: 'tock', physics: 'gizmo' };
/** The sea islands' teachers: Captain Pip, Grandma Inka, Dr. Splash. */
export const SEA_TEACHER_OF = { math: 'pip', history: 'inka', physics: 'splash' };
/** The Great Tree's teachers: Nutmeg, Grandpa Bramble, Dr. Ribbit. */
export const FOREST_TEACHER_OF = { math: 'nutmeg', history: 'bramble', physics: 'ribbit' };
/** The Desert of the Pyramids' teachers: Miss Lotus, Uncle Reed, Dr. Sandy. */
export const DESERT_TEACHER_OF = { math: 'lotus', history: 'reed', physics: 'sandy' };
/** The Moon's teachers: Miss Mochi, Captain Ginger, Dr. Comet. */
export const MOON_TEACHER_OF = { math: 'mochi', history: 'ginger', physics: 'comet' };
/** Mars's teachers: Miss Ruby, Professor Woolly, Dr. Digby. */
export const MARS_TEACHER_OF = { math: 'ruby', history: 'woolly', physics: 'digby' };
/** The Sky Castle's teachers: Miss Biscuit, Professor Hartley, Dr. Sprocket. */
export const CASTLE_TEACHER_OF = { math: 'biscuit', history: 'hartley', physics: 'sprocket' };
/** Each realm's teachers, by school slot. */
export const REALM_TEACHER_OF = { land: TEACHER_OF, forest: FOREST_TEACHER_OF, sea: SEA_TEACHER_OF, desert: DESERT_TEACHER_OF, moon: MOON_TEACHER_OF, mars: MARS_TEACHER_OF, castle: CASTLE_TEACHER_OF };
/** Who voices a lesson: its realm's teacher of the slot its subject is taught in. */
export const teacherOf = (lesson) => {
  const realm = lesson?.realm ?? 'land';
  return (REALM_TEACHER_OF[realm] ?? TEACHER_OF)[slotOf(realm, lesson?.subject) ?? lesson?.subject];
};
const MATH_QUESTS = new Set(['count', 'add10', 'sub10', 'tens-ones', 'add-carry', 'skip-count', 'times', 'sub-borrow', 'fractions', 'mult-2x1', 'division', 'fraction-of', 'balance', 'decimals', 'area', 'negatives', 'percent', 'two-step', 'squares']);
const PRAISES = 8;
const NPC_TIPS = 10;
const GEMS_PER_FLOOR = 3;
/** The lessons with a guide to chat with (each guide is a voice of their own). */
const guidedLessons = () => LESSONS.filter((l) => activitiesOf(l).includes('chat'));

/** Direction for the voice actor, by character (English: it is for the person recording). */
const DIRECTION = {
  hoot: 'Professor Hoot, a kind, slightly bookish owl who teaches math. Warm and encouraging, never rushed; smile in the voice. A soft “hoo-hoo” is welcome.',
  tock: 'Tock the Time-Keeper, an old, cosy tortoise who teaches history. A warm storyteller, unhurried, with a twinkle of wonder.',
  gizmo: 'Gizmo the Inventor, an excitable raccoon who runs the physics lab. Bright, curious and bouncy, with big “wow!” energy, but always clear.',
  nutmeg: 'Nutmeg, a quick, cheerful squirrel who teaches in the Great Tree’s seed-pod school: patterns, sorting and puzzles (Forest Math until the tree’s own subjects go live). Bright and bouncy, loves a good riddle, always patient.',
  bramble: 'Grandpa Bramble, a big, gentle old bear who teaches in the Root Hall: the forest’s stories, and the Earth and its weather. Deep, slow and cosy, like a story by the fire.',
  ribbit: 'Dr. Ribbit, an excitable frog scientist who runs the Nature Lab: experiments and living things. Curious and giggly, with a happy “ribbit!”, but always clear.',
  pip: 'Captain Pip, a cheerful little penguin sea captain who teaches Sea Math on the islands. Brisk and jolly, a sailor’s “ahoy!”, always patient.',
  inka: 'Grandma Inka, a wise, gentle old octopus who tells the sea’s history in her pavilion. Soft, cosy and full of wonder, like a bedtime story.',
  splash: 'Dr. Splash, a playful seal scientist who runs the Ocean Lab. Bubbly and curious, giggly “ooh!”s, but clear when explaining.',
  lotus: 'Miss Lotus, a warm, motherly hippo who teaches math in the Pyramid School. Cheerful and unhurried, loves sharing things out fairly, always patient.',
  reed: 'Uncle Reed, a gentle, scholarly old ibis who tells the desert’s history in the Temple School. Calm and kind, a storyteller unrolling a scroll, full of wonder.',
  sandy: 'Dr. Sandy, a curious young sand cat who runs the Sun Observatory. Bright and playful, the odd happy “purr”, but always clear when explaining.',
  mochi: 'Miss Mochi, the gentle moon rabbit who teaches math in the Dome School, a little mortar of rice cakes in her arm. Soft, sunny and patient, counting in a sing-song rhythm like pounding rice cakes.',
  ginger: 'Captain Ginger, a kindly old red panda, a retired space captain who tells the history of space in the Moon Museum. Warm, a little gravelly, with a twinkle; a grandpa’s storytelling voice full of wonder.',
  comet: 'Dr. Comet, a cheerful koala astronaut-scientist who runs the Star Observatory. Bright, curious and upbeat, a happy “wow!”, always clear when explaining.',
  ruby: 'Miss Ruby, a bright, bubbly otter who teaches math in the Red Dome School on Mars, a red Mars pebble in her hair clip and a pencil over her ear. Playful and warm, loves counting pebbles, always patient and encouraging.',
  woolly: 'Professor Woolly, a gentle grandpa alpaca in round glasses who tells the story of Mars exploration in the Mars Museum. Calm, kind and a little dreamy, a storyteller full of wonder, with a soft chuckle.',
  digby: 'Dr. Digby, an enthusiastic star-nosed mole in round glasses and a miner’s headlamp who runs the Weather Lab on Mars. Curious and cheerful, loves digging into rocks and ice, always clear when explaining.',
  biscuit: 'Miss Biscuit, a bright, bouncy corgi who teaches math in the Clock Tower School of the Sky Castle, a clockmaker in a leather apron with a loupe on her headband. Cheerful and tidy, counts in a tick-tock rhythm, always patient and encouraging.',
  hartley: 'Professor Hartley, a kindly grandpa stag in round glasses, a velvet cap and a long scholar’s robe, who keeps the Library Hall of the Sky Castle. Warm, unhurried and a little grand, a storyteller opening old books, with a soft chuckle.',
  sprocket: 'Dr. Sprocket, an inventive young beaver in a leather apron with brass goggles on her cap, who runs the Inventor’s Workshop in the Sky Castle. Busy, cheerful and a bit excitable, loves building and testing, always clear when explaining.',
  townsfolk: 'The friendly little critters around the mountain (bunnies, mice, ducks, frogs). Light and chatty; a stage whisper for secrets.',
  'buddy-fox': 'The fox cub, the child’s buddy. Cheeky, bouncy and proud of them.',
  'buddy-robot': 'The little robot, the child’s buddy. Cheerful and a tiny bit precise. Your own real voice with no effects added.',
  'buddy-dragon': 'The dragonling, the child’s buddy. Brave and enthusiastic, with a small happy growl.',
  'buddy-puff': 'The puffball, the child’s buddy. Soft, giggly, sweet and airy.',
  'buddy-bunny': 'The bunny sprite, the child’s buddy. Quick, happy and a little magical.'
};
const guideDirection = (name, role) => `${name}, ${role}. A friendly, natural voice for a person of their time, with no put-on accent or caricature. Warm and clear.`;
const bossDirection = (name) => `${name}, the floor’s puzzle boss: grumpy but never scary. Playfully sulky at first, delighted once cheered up. Never menacing.`;

/** How fast to speak, by floor (floor 0 = lines heard on every floor). */
export function pace(floor) {
  if (!floor) return 'Short and lively; heard by children of every age (6–13).';
  if (floor <= 2) return 'Slow and clear for 6–8 year-olds.';
  if (floor <= 4) return 'An easy pace for 8–10 year-olds.';
  return 'A natural pace for 10–13 year-olds.';
}

/** Every character, with its name in a language. Guides come from the lessons with a chat (the history lessons). */
export function voiceCharacters(lang = 'en') {
  const out = [
    { id: 'hoot', group: 'teacher', species: 'owl', emoji: '🦉', name: tIn(lang, 'teacher.math'), subject: 'math' },
    { id: 'tock', group: 'teacher', species: 'tortoise', emoji: '🐢', name: tIn(lang, 'teacher.history'), subject: 'history' },
    { id: 'gizmo', group: 'teacher', species: 'raccoon', emoji: '🦝', name: tIn(lang, 'teacher.physics'), subject: 'physics' },
    { id: 'nutmeg', group: 'teacher', species: 'squirrel', emoji: '🐿️', name: tIn(lang, 'forest.teacher.math'), subject: 'math', realm: 'forest' },
    { id: 'bramble', group: 'teacher', species: 'bear', emoji: '🐻', name: tIn(lang, 'forest.teacher.history'), subject: 'history', realm: 'forest' },
    { id: 'ribbit', group: 'teacher', species: 'frog', emoji: '🐸', name: tIn(lang, 'forest.teacher.physics'), subject: 'physics', realm: 'forest' },
    { id: 'pip', group: 'teacher', species: 'penguin', emoji: '🐧', name: tIn(lang, 'sea.teacher.math'), subject: 'math', realm: 'sea' },
    { id: 'inka', group: 'teacher', species: 'octopus', emoji: '🐙', name: tIn(lang, 'sea.teacher.history'), subject: 'history', realm: 'sea' },
    { id: 'splash', group: 'teacher', species: 'seal', emoji: '🦭', name: tIn(lang, 'sea.teacher.physics'), subject: 'physics', realm: 'sea' },
    { id: 'lotus', group: 'teacher', species: 'hippo', emoji: '🦛', name: tIn(lang, 'desert.teacher.math'), subject: 'math', realm: 'desert' },
    { id: 'reed', group: 'teacher', species: 'ibis', emoji: '🪶', name: tIn(lang, 'desert.teacher.history'), subject: 'history', realm: 'desert' },
    { id: 'sandy', group: 'teacher', species: 'sandcat', emoji: '🐱', name: tIn(lang, 'desert.teacher.physics'), subject: 'physics', realm: 'desert' },
    { id: 'mochi', group: 'teacher', species: 'moonrabbit', emoji: '🐰', name: tIn(lang, 'moon.teacher.math'), subject: 'math', realm: 'moon' },
    { id: 'ginger', group: 'teacher', species: 'redpanda', emoji: '🪐', name: tIn(lang, 'moon.teacher.history'), subject: 'history', realm: 'moon' },
    { id: 'comet', group: 'teacher', species: 'koala', emoji: '🐨', name: tIn(lang, 'moon.teacher.physics'), subject: 'physics', realm: 'moon' },
    { id: 'ruby', group: 'teacher', species: 'otter', emoji: '🦦', name: tIn(lang, 'mars.teacher.math'), subject: 'math', realm: 'mars' },
    { id: 'woolly', group: 'teacher', species: 'alpaca', emoji: '🦙', name: tIn(lang, 'mars.teacher.history'), subject: 'history', realm: 'mars' },
    { id: 'digby', group: 'teacher', species: 'mole', emoji: '🔦', name: tIn(lang, 'mars.teacher.physics'), subject: 'physics', realm: 'mars' },
    { id: 'biscuit', group: 'teacher', species: 'corgi', emoji: '🐶', name: tIn(lang, 'castle.teacher.math'), subject: 'math', realm: 'castle' },
    { id: 'hartley', group: 'teacher', species: 'stag', emoji: '🦌', name: tIn(lang, 'castle.teacher.history'), subject: 'history', realm: 'castle' },
    { id: 'sprocket', group: 'teacher', species: 'beaver', emoji: '🦫', name: tIn(lang, 'castle.teacher.physics'), subject: 'physics', realm: 'castle' }
  ];
  for (const l of guidedLessons()) {
    const d = localizeLesson(l, lang).dialogue;
    out.push({ id: `guide-${l.id}`, group: 'guide', species: null, emoji: '🧭', name: d.npc.name, role: d.npc.role, floor: l.floor, lesson: l.id, direction: guideDirection(l.dialogue.npc.name, l.dialogue.npc.role) });
  }
  const BOSS_EMOJI = ['☁️', '🦁', '🐉', '❄️', '🦋', '🦀', '🤖'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `boss-${n}`, group: 'boss', emoji: BOSS_EMOJI[n - 1] ?? '🎭', name: tIn(lang, `world.${n}.boss`), floor: n, direction: bossDirection(tIn('en', `world.${n}.boss`)) });
  const FOREST_BOSS_EMOJI = ['🐭', '🦔', '🐿️', '🌸', '🦆', '🌻', '🐉'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `forest-boss-${n}`, group: 'boss', emoji: FOREST_BOSS_EMOJI[n - 1], name: tIn(lang, `forest.world.${n}.boss`), floor: n, realm: 'forest', direction: bossDirection(tIn('en', `forest.world.${n}.boss`)) });
  const SEA_BOSS_EMOJI = ['🦀', '🐙', '🐢', '🐧', '🫧', '🦭', '🤖'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `sea-boss-${n}`, group: 'boss', emoji: SEA_BOSS_EMOJI[n - 1], name: tIn(lang, `sea.world.${n}.boss`), floor: n, realm: 'sea', direction: bossDirection(tIn('en', `sea.world.${n}.boss`)) });
  const DESERT_BOSS_EMOJI = ['🦁', '🐪', '🦎', '🪲', '🎈', '📜', '🌙'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `desert-boss-${n}`, group: 'boss', emoji: DESERT_BOSS_EMOJI[n - 1], name: tIn(lang, `desert.world.${n}.boss`), floor: n, realm: 'desert', direction: bossDirection(tIn('en', `desert.world.${n}.boss`)) });
  const MOON_BOSS_EMOJI = ['🧸', '🐹', '🐶', '🦋', '🦎', '🪼', '⭐'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `moon-boss-${n}`, group: 'boss', emoji: MOON_BOSS_EMOJI[n - 1], name: tIn(lang, `moon.world.${n}.boss`), floor: n, realm: 'moon', direction: bossDirection(tIn('en', `moon.world.${n}.boss`)) });
  const MARS_BOSS_EMOJI = ['🦫', '🤖', '❄️', '🦥', '📢', '🌪️', '🛡️'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `mars-boss-${n}`, group: 'boss', emoji: MARS_BOSS_EMOJI[n - 1], name: tIn(lang, `mars.world.${n}.boss`), floor: n, realm: 'mars', direction: bossDirection(tIn('en', `mars.world.${n}.boss`)) });
  const CASTLE_BOSS_EMOJI = ['🪿', '🐑', '✨', '🐐', '🧺', '🐴', '🐉'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `castle-boss-${n}`, group: 'boss', emoji: CASTLE_BOSS_EMOJI[n - 1], name: tIn(lang, `castle.world.${n}.boss`), floor: n, realm: 'castle', direction: bossDirection(tIn('en', `castle.world.${n}.boss`)) });
  out.push({ id: 'townsfolk', group: 'townsfolk', emoji: '🐰', name: tIn(lang, 'credits.townsfolk') });
  const BUDDY_EMOJI = { fox: '🦊', robot: '🤖', dragon: '🐲', puff: '☁️', bunny: '🐰' };
  for (const b of BUDDY_IDS) out.push({ id: `buddy-${b}`, group: 'buddy', species: b, emoji: BUDDY_EMOJI[b], name: tIn(lang, `buddy.${b}`) });
  for (const c of out) c.direction ??= DIRECTION[c.id];
  // A teacher is listed by slot above; they teach whatever their realm puts in that slot (content/subjects.js).
  for (const c of out) if (c.group === 'teacher') c.subject = subjectAt(c.realm ?? 'land', c.subject);
  return out;
}
export const characterIds = () => voiceCharacters('en').map((c) => c.id);

/* ---------------------------------------------------------------- length */

const CJK_RATE = { ko: 5.5, ja: 6.5, zh: 4.2 };
/** Seconds a line takes to say, roughly: words (or CJK syllables) at a child-friendly rate, plus pauses. */
export function estimateSeconds(text, lang = 'en', floor = 0) {
  const clean = String(text).replace(/\p{Extended_Pictographic}/gu, '');
  let units, rate;
  if (CJK_RATE[lang]) {
    units = (clean.match(/[\p{L}\p{N}]/gu) ?? []).length;
    rate = CJK_RATE[lang];
  } else {
    units = clean.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    rate = lang === 'es' ? 2.8 : 2.5;
  }
  if (floor && floor <= 2) rate *= 0.8;
  const pauses = (clean.match(/[.!?;:。！？；：…]/g) ?? []).length * 0.25;
  return Math.round((units / rate + pauses + 0.3) * 10) / 10;
}

/* ---------------------------------------------------------------- the lines */

/** The activities a realm's lessons in a subject run (the subject's flow, and any a lesson adds). */
function activitiesFor(realm, subject) {
  const out = new Set(activitiesOf({ subject }));
  for (const l of LESSONS) if ((l.realm ?? 'land') === realm && l.subject === subject) for (const k of activitiesOf(l)) out.add(k);
  return out;
}
/** The teacher's lines in each signature game (lesson/games/), and how the voice actor hears them. */
const GAME_BARKS = {
  sort: [['act.sort.say', 'Sorting game: the child sorts picture cards into groups.'], ['act.sort.ruleSay', 'Sorting game: some cards are already sorted; the child guesses the secret rule.']],
  maphunt: [['act.map.say', 'Map hunt: the child reads a clue and taps the place on a map.']],
  dig: [['act.dig.say', 'Dig site: the child brushes sand off squares to find buried things.']],
  countdown: [['act.cd.say', 'Rocket launch: each right answer pours fuel into a rocket.'], ['act.cd.ready', 'Rocket launch: the tank is full, time for the countdown.']],
  rover: [['act.rover.say', 'Rover coding: the child builds a program of blocks to drive a rover.']],
  rhythm: [['act.rhythm.say', 'Rhythm game: listen to bells and drums, then play along.']]
};
/** How the voice actor hears each shared quest intro (others: by the school's name). */
const INTRO_CONTEXT = {
  'land.physics': 'Lesson start: every physics quest begins with this.',
  'forest.math': 'Lesson start: every Forest Math quest on the Great Tree begins with this.',
  'forest.physics': 'Lesson start: every Nature Lab quest on the Great Tree begins with this.',
  'forest.logic': 'Lesson start: every Logic & Patterns quest in the Great Tree’s seed-pod school begins with this.',
  'forest.biology': 'Lesson start: every Biology quest in the Great Tree’s Nature Lab begins with this.',
  'sea.math': 'Lesson start: every Sea Math quest on the islands begins with this.',
  'sea.physics': 'Lesson start: every Ocean Lab quest on the islands begins with this.',
  'desert.math': 'Lesson start: every Pyramid School quest in the desert begins with this.',
  'desert.physics': 'Lesson start: every Sun Observatory quest in the desert begins with this.',
  'moon.math': 'Lesson start: every Dome School quest on the Moon begins with this.',
  'moon.physics': 'Lesson start: every Star Observatory quest on the Moon begins with this.',
  'mars.math': 'Lesson start: every Red Dome School quest on Mars begins with this.',
  'mars.physics': 'Lesson start: every Weather Lab quest on Mars begins with this.',
  'castle.math': 'Lesson start: every Clock Tower School quest in the Sky Castle begins with this.',
  'castle.physics': 'Lesson start: every Inventor\'s Workshop quest in the Sky Castle begins with this.'
};

/**
 * The whole script in a language, in recording order (barks first, then
 * floor by floor). Each line: { id, char, kind, floor, text, context,
 * direction, seconds }. The same line id can belong to several characters
 * (each teacher says "Brilliant!"); a recording is per language, character
 * and line.
 */
export function buildScript(lang = 'en') {
  const chars = new Map(voiceCharacters(lang).map((c) => [c.id, c]));
  const lines = [];
  const add = (char, id, kind, floor, text, context) => {
    if (!text || !String(text).trim()) return;
    const c = chars.get(char);
    lines.push({ id, char, kind, floor, text: String(text).trim(), context, direction: `${c.direction} ${pace(floor)}`, seconds: estimateSeconds(text, lang, floor) });
  };
  // A line whose string is not written yet (a world's new subject before its words are in) is no line at all.
  const T = (key, vars) => (tIn('en', key, vars) === key ? '' : tIn(lang, key, vars));
  const key = (k, variant = null) => `t.${k}${variant != null ? `~${variant}` : ''}`;

  // ---- barks: teachers (each realm's three, by school slot; each speaks for the subject taught in its slot)
  const teachers = Object.entries(REALM_TEACHER_OF).flatMap(([realm, bySlot]) => SLOTS.map((slot) => ({ char: bySlot[slot], realm, slot, subject: subjectAt(realm, slot) })));
  for (const { char, realm, subject } of teachers) {
    // Each realm's teachers greet in their own words (lesson.js lesson.hello.* / <realm>.hello.*).
    const hello = helloKey(realm, subject);
    add(char, key(hello), 'bark', 0, T(hello), 'Greeting: the child walks into the building and sees the quest list.');
    for (let i = 0; i < PRAISES; i++) add(char, key(`lesson.praise.${i}`), 'bark', 0, T(`lesson.praise.${i}`), 'Great job: a right answer (one of several, picked at random).');
    add(char, key('voice.teacher.tryAgain'), 'bark', 0, T('voice.teacher.tryAgain'), 'Try again: a wrong answer, before the hint shows.');
    add(char, key('voice.teacher.hint'), 'bark', 0, T('voice.teacher.hint'), 'Hint intro: the child pressed Hint.');
    add(char, key('lesson.say3'), 'bark', 0, T('lesson.say3'), 'Lesson end: three stars.');
    add(char, key('lesson.say2'), 'bark', 0, T('lesson.say2'), 'Lesson end: two stars.');
    add(char, key('lesson.say1'), 'bark', 0, T('lesson.say1'), 'Lesson end: one star (finished).');
  }
  // What each teacher says in the activities its subject runs, and the quest intro every one of its quests shares.
  for (const { char, realm, slot, subject } of teachers) {
    const acts = activitiesFor(realm, subject);
    if (acts.has('try')) {
      add(char, key('lesson.yourTurn'), 'bark', 0, T('lesson.yourTurn'), 'Practice: the first problem after the chalkboard example.');
      add(char, key('lesson.oneMore'), 'bark', 0, T('lesson.oneMore'), 'Practice: the second problem.');
    }
    if (acts.has('timeline')) add(char, key('lesson.tlSay'), 'bark', 0, T('lesson.tlSay'), 'Timeline: the cards are jumbled for the child to put in order.');
    if (acts.has('experiment')) {
      add(char, key('lesson.guessSay'), 'bark', 0, T('lesson.guessSay'), 'Experiment: asking the child to guess before the test.');
      add(char, key('lesson.testSay'), 'bark', 0, T('lesson.testSay'), 'Experiment: the test is starting.');
    }
    // The signature games (lesson/games/): what the teacher says as each starts.
    for (const [kind, lines] of Object.entries(GAME_BARKS)) {
      if (acts.has(kind)) for (const [k, context] of lines) add(char, key(k), 'bark', 0, T(k), context);
    }
    // The mountain's math quests have an intro per topic, and guided ones (a chat) one per lesson: both are story lines below.
    if ((realm === 'land' && subject === 'math') || acts.has('chat')) continue;
    const intro = realm === 'land' ? `quest.${subject}.intro` : `${realm}.quest.${subject}`;
    add(char, key(intro), 'bark', 0, T(intro), INTRO_CONTEXT[`${realm}.${subject}`] ?? `Lesson start: every ${tIn('en', buildingKey(realm, slot))} quest begins with this.`);
  }
  // ---- barks: buddies
  const BUDDY_BARKS = [
    ['hello', 'Greeting: the child starts playing.'],
    ['start', 'Lesson start: a new quest begins.'],
    ['great', 'Great job: a right answer.'],
    ['wow', 'Great job: a streak of right answers.'],
    ['tryAgain', 'Try again: a wrong answer.'],
    ['hint', 'Hint intro: the child pressed Hint.'],
    ['end', 'Lesson end: the stars appear.'],
    ['levelUp', 'Level up: the buddy grew a level.'],
    ['sticker', 'Sticker found: a new sticker for the book.'],
    ['tap', 'The child tapped the buddy in the picker.']
  ];
  for (const b of BUDDY_IDS) for (const [k, ctx] of BUDDY_BARKS) add(`buddy-${b}`, key(`voice.buddy.${k}`), 'bark', 0, T(`voice.buddy.${k}`), ctx);
  // ---- barks: townsfolk (tips when the child taps a critter)
  for (let i = 0; i < NPC_TIPS; i++) {
    if (i === 6) for (let n = 1; n <= FLOOR_COUNT; n++) add('townsfolk', key('npc.6', n), 'bark', n, T('npc.6', { boss: T(`world.${n}.boss`) }), `A critter’s tip on floor ${n}, about its puzzle boss.`);
    else add('townsfolk', key(`npc.${i}`), 'bark', 0, T(`npc.${i}`), 'A critter’s tip when the child taps them (any floor).');
  }
  for (let n = 1; n <= GEMS_PER_FLOOR; n++) add('townsfolk', key('npc.gems', n), 'bark', 0, T('npc.gems', { count: n }), `A critter’s tip: ${n} hidden gem(s) left on this floor.`);
  // ---- bosses
  for (let n = 1; n <= FLOOR_COUNT; n++) {
    const b = `boss-${n}`;
    add(b, key(`world.${n}.line`), 'story', n, T(`world.${n}.line`), `The puzzle boss of floor ${n} greets the child before the riddles.`);
    add(b, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(b, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const fb = `forest-boss-${n}`;
    add(fb, key(`forest.world.${n}.line`), 'story', n, T(`forest.world.${n}.line`), `The puzzle boss of the Great Tree's ring ${n} greets the child before the riddles.`);
    add(fb, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(fb, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const sb = `sea-boss-${n}`;
    add(sb, key(`sea.world.${n}.line`), 'story', n, T(`sea.world.${n}.line`), `The puzzle boss of sea island ${n} greets the child before the riddles.`);
    add(sb, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(sb, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const db = `desert-boss-${n}`;
    add(db, key(`desert.world.${n}.line`), 'story', n, T(`desert.world.${n}.line`), `The puzzle boss of the desert's oasis ${n} greets the child before the riddles.`);
    add(db, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(db, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const mb = `moon-boss-${n}`;
    add(mb, key(`moon.world.${n}.line`), 'story', n, T(`moon.world.${n}.line`), `The puzzle boss of the Moon's moonbase ${n} greets the child before the riddles.`);
    add(mb, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(mb, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const rb = `mars-boss-${n}`;
    add(rb, key(`mars.world.${n}.line`), 'story', n, T(`mars.world.${n}.line`), `The puzzle boss of Mars's terrace ${n} greets the child before the riddles.`);
    add(rb, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(rb, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
    const cb = `castle-boss-${n}`;
    add(cb, key(`castle.world.${n}.line`), 'story', n, T(`castle.world.${n}.line`), `The puzzle boss of the Sky Castle's street ${n} greets the child before the riddles.`);
    add(cb, key('puzzle.won'), 'bark', n, T('puzzle.won'), 'The child cheered the boss up (4 or more right).');
    add(cb, key('puzzle.lost'), 'bark', n, T('puzzle.lost'), 'Not enough right answers this time.');
  }

  // ---- lessons, floor by floor (the ones taught now: a world's new lessons join once it is live)
  for (const lesson0 of LESSONS) {
    if (!lessonsIn(lesson0.realm ?? 'land').includes(lesson0)) continue;
    const lesson = localizeLesson(lesson0, lang);
    const { id, floor, subject } = lesson0;
    const teacher = teacherOf(lesson0);
    const where = `Lesson “${lesson0.title}” (${id}, floor ${floor})`;
    const acts = activitiesOf(lesson0);
    const guided = acts.includes('chat');
    if (lesson0.realm && lesson0.realm !== 'land') {
      const r = lesson0.realm;
      if (guided) add(teacher, key(`${r}.quest.${subject}`, id), 'story', floor, T(`${r}.quest.${subject}`, { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }), `Story: the quest that starts ${where}.`);
    } else if (subject === 'math') {
      const k = MATH_QUESTS.has(lesson0.topic) ? `quest.math.${lesson0.topic}.intro` : 'quest.math.default';
      add(teacher, key(k), 'story', floor, T(k), `Story: the quest that starts ${where}.`);
    } else if (guided) {
      add(teacher, key(`quest.${subject}.intro`, id), 'story', floor, T(`quest.${subject}.intro`, { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }), `Story: the quest that starts ${where}.`);
    }
    lesson.reading.forEach((c, i) => add(teacher, `l.${id}.reading.${i}`, 'reading', floor, `${c.title}. ${c.text}`, `Reading card ${i + 1} of ${lesson.reading.length}: ${where}. Say the title, a short pause, then the text.`));
    if (guided) {
      const d = lesson.dialogue;
      const g = `guide-${id}`;
      add(g, `l.${id}.dialogue.intro`, 'story', floor, d.intro, `The guide says hello: ${where}.`);
      d.topics.forEach((tp, i) => add(g, `l.${id}.dialogue.topics.${i}.answer`, 'story', floor, tp.answer, `The child asked: “${lesson0.dialogue.topics[i].ask}” (${where}).`));
      add(g, `l.${id}.dialogue.challenge`, 'quiz', floor, T('lesson.guideAsks', { q: d.challenge.q }), `The guide asks the child a question; the choices show on screen (${where}).`);
      add(g, `l.${id}.dialogue.farewell`, 'story', floor, d.farewell, `The guide says goodbye (${where}).`);
    }
    if (acts.includes('treasure')) add(teacher, key('lesson.lookFound', id), 'story', floor, T('lesson.lookFound', { name: lesson.artifact.name }), `The treasure on its pedestal (${where}).`);
    if (acts.includes('experiment')) {
      const p = lesson.sim.predict;
      add(teacher, `l.${id}.sim.predict.q`, 'quiz', floor, p.q, `Guess first: the question before the experiment (${where}).`);
      add(teacher, key('lesson.guessRightSay', id), 'story', floor, T('lesson.guessRightSay', { explain: p.explain }), `The child guessed right; the experiment showed why (${where}).`);
      add(teacher, key('lesson.guessSurpriseSay', id), 'story', floor, T('lesson.guessSurpriseSay', { explain: p.explain }), `The child guessed wrong; a friendly surprise (${where}).`);
    }
    if (Array.isArray(lesson.quiz)) {
      lesson.quiz.forEach((q, i) => {
        add(teacher, `l.${id}.quiz.${i}.q`, 'quiz', floor, q.q, `Challenge question ${i + 1} of ${lesson.quiz.length}; the choices show on screen (${where}).`);
        add(teacher, `l.${id}.quiz.${i}.hint`, 'quiz', floor, q.hint, `The hint for challenge question ${i + 1} (${where}).`);
        // The floor's puzzle boss (its own world's: lesson/boss.js) asks the same questions as riddles.
        add(lesson0.realm && lesson0.realm !== 'land' ? `${lesson0.realm}-boss-${floor}` : `boss-${floor}`,`l.${id}.quiz.${i}.q`, 'quiz', floor, q.q, `A riddle from the puzzle boss (from ${where}).`);
      });
    }
  }
  return sortLines(dedupe(lines));
}

/** One line per character and id (a shared quest intro is said once). */
function dedupe(lines) {
  const seen = new Map();
  for (const l of lines) {
    const k = `${l.char}/${l.id}`;
    const was = seen.get(k);
    if (!was || (l.floor && l.floor < was.floor)) seen.set(k, l);
  }
  return [...seen.values()];
}
const KIND_RANK = { bark: 0, story: 1, reading: 2, quiz: 3 };
/** Recording order: barks first, then floor 1, 2 … and within a floor story, reading, quiz. */
export function sortLines(lines) {
  const rank = (l) => (l.kind === 'bark' ? 0 : l.floor * 10 + KIND_RANK[l.kind]);
  return lines.map((l, i) => [rank(l), i, l]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
}

/** A character's lines (in recording order). */
export const linesFor = (lines, char) => lines.filter((l) => l.char === char);

/** Counts per character: { [char]: { barks, total, seconds } }. */
export function scriptStats(lines) {
  const out = {};
  for (const l of lines) {
    const s = (out[l.char] ??= { barks: 0, total: 0, seconds: 0 });
    s.total++;
    if (l.kind === 'bark') s.barks++;
    s.seconds += l.seconds;
  }
  for (const s of Object.values(out)) s.seconds = Math.round(s.seconds);
  return out;
}

/** Every language's script, keyed lang/char/id (the server checks uploads against it). */
export function scriptIndex(langs = LOCALE_IDS) {
  const out = new Map();
  for (const lang of langs) for (const l of buildScript(lang)) out.set(lineKey(lang, l.char, l.id), l);
  return out;
}

/* ---------------------------------------------------------------- export formats */

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** A CSV of lines (UTF-8; spreadsheets open it), one row a line. */
export function scriptCsv(lines, lang) {
  const head = ['#', 'line_id', 'character', 'language', 'kind', 'floor', 'text', 'direction', 'context', 'est_seconds'];
  const rows = lines.map((l, i) => [i + 1, l.id, l.char, lang, l.kind, l.floor || '', l.text, l.direction, l.context, l.seconds]);
  return `﻿${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** A printable page for one character in one language. */
export function scriptHtml(lines, { lang, character }) {
  const total = lines.reduce((s, l) => s + l.seconds, 0);
  const rows = lines.map((l, i) => `<tr class="k-${l.kind}"><td class="n">${i + 1}</td><td><div class="text" lang="${esc(lang)}">${esc(l.text)}</div><div class="ctx">${esc(l.context)}</div><div class="id">${esc(l.id)} · ${esc(l.kind)}${l.floor ? ` · floor ${l.floor}` : ''} · ≈ ${l.seconds} s</div></td><td class="box"></td></tr>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(character.name)} · ${esc(lang)} · AI Arcademia voice script</title>
<style>
body{font:14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;margin:24px;color:#1d1f24}
h1{font-size:20px;margin:0 0 4px}.dir{background:#f6f4ef;border-radius:8px;padding:10px 12px;margin:10px 0 16px}
table{width:100%;border-collapse:collapse}td{border-top:1px solid #ddd;padding:8px 6px;vertical-align:top}
.n{width:32px;color:#888}.text{font-size:18px;font-weight:600}.ctx{color:#555;margin-top:2px}.id{color:#999;font-size:11px;font-family:ui-monospace,monospace}
.box{width:22px}.box::after{content:'';display:block;width:16px;height:16px;border:1.5px solid #888;border-radius:3px}
tr.k-bark .text{color:#7a3e00}@media print{body{margin:12mm}tr{break-inside:avoid}}
</style></head><body>
<h1>${esc(character.emoji ?? '')} ${esc(character.name)} — ${esc(lang)}</h1>
<div>${lines.length} lines · about ${Math.round(total / 60)} min of speech · barks first, then floor by floor</div>
<div class="dir"><strong>Direction:</strong> ${esc(character.direction)}</div>
<table>${rows}</table>
</body></html>
`;
}
