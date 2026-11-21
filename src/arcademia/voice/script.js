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
 * Characters: the teachers (hoot, tock, gizmo), one history guide per
 * history lesson (guide-<lesson id>), the floor bosses (boss-1 … boss-7),
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
import { LESSONS } from '../content/index.js';
import { FLOOR_COUNT } from '../content/schema.js';

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

/** The teachers and the subject each one teaches. */
export const TEACHER_OF = { math: 'hoot', history: 'tock', physics: 'gizmo' };
const SUBJECT_OF = { hoot: 'math', tock: 'history', gizmo: 'physics' };
const MATH_QUESTS = new Set(['count', 'add10', 'sub10', 'tens-ones', 'add-carry', 'skip-count', 'times', 'sub-borrow', 'fractions', 'mult-2x1', 'division', 'fraction-of', 'balance', 'decimals', 'area', 'negatives', 'percent', 'two-step', 'squares']);
const PRAISES = 8;
const NPC_TIPS = 10;
const GEMS_PER_FLOOR = 3;
const historyLessons = () => LESSONS.filter((l) => l.subject === 'history');

/** Direction for the voice actor, by character (English: it is for the person recording). */
const DIRECTION = {
  hoot: 'Professor Hoot, a kind, slightly bookish owl who teaches math. Warm and encouraging, never rushed; smile in the voice. A soft “hoo-hoo” is welcome.',
  tock: 'Tock the Time-Keeper, an old, cosy tortoise who teaches history. A warm storyteller, unhurried, with a twinkle of wonder.',
  gizmo: 'Gizmo the Inventor, an excitable raccoon who runs the physics lab. Bright, curious and bouncy, with big “wow!” energy, but always clear.',
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

/** Every character, with its name in a language. Guides come from the history lessons. */
export function voiceCharacters(lang = 'en') {
  const out = [
    { id: 'hoot', group: 'teacher', species: 'owl', emoji: '🦉', name: tIn(lang, 'teacher.math'), subject: 'math' },
    { id: 'tock', group: 'teacher', species: 'tortoise', emoji: '🐢', name: tIn(lang, 'teacher.history'), subject: 'history' },
    { id: 'gizmo', group: 'teacher', species: 'raccoon', emoji: '🦝', name: tIn(lang, 'teacher.physics'), subject: 'physics' }
  ];
  for (const l of historyLessons()) {
    const d = localizeLesson(l, lang).dialogue;
    out.push({ id: `guide-${l.id}`, group: 'guide', species: null, emoji: '🧭', name: d.npc.name, role: d.npc.role, floor: l.floor, lesson: l.id, direction: guideDirection(l.dialogue.npc.name, l.dialogue.npc.role) });
  }
  const BOSS_EMOJI = ['☁️', '🦁', '🐉', '❄️', '🦋', '🦀', '🤖'];
  for (let n = 1; n <= FLOOR_COUNT; n++) out.push({ id: `boss-${n}`, group: 'boss', emoji: BOSS_EMOJI[n - 1] ?? '🎭', name: tIn(lang, `world.${n}.boss`), floor: n, direction: bossDirection(tIn('en', `world.${n}.boss`)) });
  out.push({ id: 'townsfolk', group: 'townsfolk', emoji: '🐰', name: tIn(lang, 'credits.townsfolk') });
  const BUDDY_EMOJI = { fox: '🦊', robot: '🤖', dragon: '🐲', puff: '☁️', bunny: '🐰' };
  for (const b of BUDDY_IDS) out.push({ id: `buddy-${b}`, group: 'buddy', species: b, emoji: BUDDY_EMOJI[b], name: tIn(lang, `buddy.${b}`) });
  for (const c of out) c.direction ??= DIRECTION[c.id];
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
  const T = (key, vars) => tIn(lang, key, vars);
  const key = (k, variant = null) => `t.${k}${variant != null ? `~${variant}` : ''}`;

  // ---- barks: teachers
  for (const char of ['hoot', 'tock', 'gizmo']) {
    const subject = SUBJECT_OF[char];
    add(char, key(`lesson.hello.${subject}`), 'bark', 0, T(`lesson.hello.${subject}`), 'Greeting: the child walks into the building and sees the quest list.');
    for (let i = 0; i < PRAISES; i++) add(char, key(`lesson.praise.${i}`), 'bark', 0, T(`lesson.praise.${i}`), 'Great job: a right answer (one of several, picked at random).');
    add(char, key('voice.teacher.tryAgain'), 'bark', 0, T('voice.teacher.tryAgain'), 'Try again: a wrong answer, before the hint shows.');
    add(char, key('voice.teacher.hint'), 'bark', 0, T('voice.teacher.hint'), 'Hint intro: the child pressed Hint.');
    add(char, key('lesson.say3'), 'bark', 0, T('lesson.say3'), 'Lesson end: three stars.');
    add(char, key('lesson.say2'), 'bark', 0, T('lesson.say2'), 'Lesson end: two stars.');
    add(char, key('lesson.say1'), 'bark', 0, T('lesson.say1'), 'Lesson end: one star (finished).');
  }
  add('hoot', key('lesson.yourTurn'), 'bark', 0, T('lesson.yourTurn'), 'Practice: the first problem after the chalkboard example.');
  add('hoot', key('lesson.oneMore'), 'bark', 0, T('lesson.oneMore'), 'Practice: the second problem.');
  add('tock', key('lesson.tlSay'), 'bark', 0, T('lesson.tlSay'), 'Timeline: the cards are jumbled for the child to put in order.');
  add('gizmo', key('lesson.guessSay'), 'bark', 0, T('lesson.guessSay'), 'Experiment: asking the child to guess before the test.');
  add('gizmo', key('lesson.testSay'), 'bark', 0, T('lesson.testSay'), 'Experiment: the test is starting.');
  add('gizmo', key('quest.physics.intro'), 'bark', 0, T('quest.physics.intro'), 'Lesson start: every physics quest begins with this.');
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
  }

  // ---- lessons, floor by floor
  for (const lesson0 of LESSONS) {
    const lesson = localizeLesson(lesson0, lang);
    const { id, floor, subject } = lesson0;
    const teacher = TEACHER_OF[subject];
    const where = `Lesson “${lesson0.title}” (${id}, floor ${floor})`;
    if (subject === 'math') {
      const k = MATH_QUESTS.has(lesson0.topic) ? `quest.math.${lesson0.topic}.intro` : 'quest.math.default';
      add(teacher, key(k), 'story', floor, T(k), `Story: the quest that starts ${where}.`);
    } else if (subject === 'history') {
      add(teacher, key('quest.history.intro', id), 'story', floor, T('quest.history.intro', { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }), `Story: the quest that starts ${where}.`);
    }
    lesson.reading.forEach((c, i) => add(teacher, `l.${id}.reading.${i}`, 'reading', floor, `${c.title}. ${c.text}`, `Reading card ${i + 1} of ${lesson.reading.length}: ${where}. Say the title, a short pause, then the text.`));
    if (subject === 'history') {
      const d = lesson.dialogue;
      const g = `guide-${id}`;
      add(g, `l.${id}.dialogue.intro`, 'story', floor, d.intro, `The guide says hello: ${where}.`);
      d.topics.forEach((tp, i) => add(g, `l.${id}.dialogue.topics.${i}.answer`, 'story', floor, tp.answer, `The child asked: “${lesson0.dialogue.topics[i].ask}” (${where}).`));
      add(g, `l.${id}.dialogue.challenge`, 'quiz', floor, T('lesson.guideAsks', { q: d.challenge.q }), `The guide asks the child a question; the choices show on screen (${where}).`);
      add(g, `l.${id}.dialogue.farewell`, 'story', floor, d.farewell, `The guide says goodbye (${where}).`);
      add(teacher, key('lesson.lookFound', id), 'story', floor, T('lesson.lookFound', { name: lesson.artifact.name }), `The treasure on its pedestal (${where}).`);
    }
    if (subject === 'physics') {
      const p = lesson.sim.predict;
      add(teacher, `l.${id}.sim.predict.q`, 'quiz', floor, p.q, `Guess first: the question before the experiment (${where}).`);
      add(teacher, key('lesson.guessRightSay', id), 'story', floor, T('lesson.guessRightSay', { explain: p.explain }), `The child guessed right; the experiment showed why (${where}).`);
      add(teacher, key('lesson.guessSurpriseSay', id), 'story', floor, T('lesson.guessSurpriseSay', { explain: p.explain }), `The child guessed wrong; a friendly surprise (${where}).`);
    }
    if (Array.isArray(lesson.quiz)) {
      lesson.quiz.forEach((q, i) => {
        add(teacher, `l.${id}.quiz.${i}.q`, 'quiz', floor, q.q, `Challenge question ${i + 1} of ${lesson.quiz.length}; the choices show on screen (${where}).`);
        add(teacher, `l.${id}.quiz.${i}.hint`, 'quiz', floor, q.hint, `The hint for challenge question ${i + 1} (${where}).`);
        // The floor's puzzle boss asks the same questions as riddles.
        add(`boss-${floor}`, `l.${id}.quiz.${i}.q`, 'quiz', floor, q.q, `A riddle from the puzzle boss (from ${where}).`);
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
