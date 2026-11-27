/**
 * AI Arcademia's school subjects, and which three each study world teaches.
 *
 * Every floor of every world has three school buildings, always in the same
 * three SLOTS (the plans, the building shapes, the roof colours and the
 * teachers are keyed by them): slot 1 'math', slot 2 'history', slot 3
 * 'physics' — the Learning Mountain's own subjects, which is where the keys
 * come from. A world's REALM_SUBJECTS put its own subject in each slot; its
 * buildings, teachers and voices stay, and take the slot's subject.
 *
 *   subjectsOf('desert')          → ['math', 'history', 'physics'] until the desert is live,
 *                                   then ['geometry', 'archaeology', 'chemistry']
 *   subjectAt('desert', 'math')   → the subject in the desert's slot 1
 *   slotOf('desert', 'geometry')  → 'math' (the Pyramid School, Miss Lotus)
 *
 * A world goes live (switches from the mountain's trio to its own) when its
 * new lessons are written: set it to true in LIVE below. Until then it plays
 * exactly as before. docs/arcademia.md, "Subjects per world", has the steps.
 *
 * Pure data: the browser, the server (rules.js) and the voice script use it.
 */
import { t, tIn } from '../i18n/index.js';

/** The three school buildings on every floor, in school order: slot 1, 2, 3. */
export const SLOTS = ['math', 'history', 'physics'];
/** The Learning Mountain's subjects (and every world's until it goes live). */
export const LAND_SUBJECTS = ['math', 'history', 'physics'];

/**
 * How a lesson runs, by the room it is taught in (each a list of activity kinds,
 * content/schema.js ACTIVITIES; a lesson may declare its own `activities`):
 *   classroom  the chalkboard and a manipulative (math-style)
 *   hall       a guide to chat with, a timeline and a treasure on the turntable (history-style)
 *   lab        guess, then the experiment (physics-style)
 */
export const FLOWS = {
  classroom: ['story', 'learn', 'board', 'try', 'challenge'],
  hall: ['story', 'learn', 'chat', 'timeline', 'treasure', 'challenge'],
  lab: ['story', 'learn', 'experiment', 'challenge']
};
/** The rooms (world/interiors.js builds them): classroom, hall, lab. */
export const ROOMS = Object.keys(FLOWS);
/** Which arcade game a school's lobby offers (lesson/minigames.js): numbers = Bubble Pop / Hungry Monster, who = Who Said It?, launch = Launch to the Basket. */
export const ARCADES = ['numbers', 'who', 'launch'];
const ARCADE_OF_ROOM = { classroom: 'numbers', hall: 'who', lab: 'launch' };

/**
 * One subject.
 *   id         its key: lesson.subject, the progress events, i18n `subject.<id>`
 *   code       how its lesson ids start: 'm3-…' for the mountain's three, '<id>3-…' for the rest
 *   home       the realm it belongs to
 *   icon       its emoji (signs, labels, the HUD, the minimap)
 *   color      its colour in the parents' report (the mountain's three are fixed in report.css)
 *   room       the lesson room it is taught in (ROOMS)
 *   flow       its lessons' default activities (FLOWS[room] unless it says otherwise)
 *   arcade     its lobby's arcade game (ARCADES)
 *   woven      true: the world's woven-in math (generators, chalkboard, number practice)
 *   signature  the world's own game for it (an activity kind: content/games.js, lesson/games/), or null
 */
function subject(id, home, icon, color, room, more = {}) {
  return Object.freeze({
    id,
    code: more.code ?? id,
    home,
    icon,
    color,
    room,
    flow: Object.freeze(more.flow ?? FLOWS[room]),
    arcade: more.arcade ?? ARCADE_OF_ROOM[room],
    woven: Boolean(more.woven),
    signature: more.signature ?? null
  });
}

/** Every subject, mountain first, then world by world in slot order. */
export const SUBJECT_INFO = Object.freeze(Object.fromEntries([
  // The Learning Mountain.
  subject('math', 'land', '🔢', '#2a78d6', 'classroom', { code: 'm', woven: true }),
  subject('history', 'land', '🏛️', '#eb6834', 'hall', { code: 'h' }),
  subject('physics', 'land', '🔭', '#1baf7a', 'lab', { code: 'p' }),
  // The Great Tree.
  subject('logic', 'forest', '🧩', '#7f5fd0', 'classroom', { woven: true }),
  subject('earth', 'forest', '🌦️', '#3f8fd6', 'hall'),
  subject('biology', 'forest', '🐞', '#3f9a4f', 'lab', { signature: 'sort' }),
  // The Lagoon.
  subject('measures', 'sea', '⚖️', '#c9833a', 'classroom', { woven: true }),
  subject('geography', 'sea', '🗺️', '#2f9fb8', 'hall', { signature: 'maphunt' }),
  subject('ocean', 'sea', '🐠', '#2f6fb0', 'lab'),
  // The Desert of the Pyramids.
  subject('geometry', 'desert', '📐', '#d9603b', 'classroom', { woven: true }),
  subject('archaeology', 'desert', '🏺', '#a8743a', 'hall', { signature: 'dig' }),
  subject('chemistry', 'desert', '⚗️', '#2fa8a0', 'lab'),
  // The Moon.
  subject('spacenumbers', 'moon', '🧮', '#5a6fd6', 'classroom', { woven: true }),
  subject('rockets', 'moon', '🚀', '#e0574f', 'hall', { signature: 'countdown' }),
  subject('astronomy', 'moon', '🌌', '#4f4fa8', 'lab'),
  // Mars.
  subject('coding', 'mars', '🤖', '#2fb5ad', 'classroom', { woven: true, signature: 'rover' }),
  subject('engineering', 'mars', '🛠️', '#d98a2f', 'hall'),
  subject('planets', 'mars', '🪐', '#c0503a', 'lab'),
  // The Sky Castle.
  subject('music', 'castle', '🎵', '#c04f9a', 'classroom', { woven: true, signature: 'rhythm' }),
  subject('languages', 'castle', '✍️', '#3a6fd0', 'hall'),
  subject('art', 'castle', '🎨', '#e0802f', 'hall')
].map((s) => [s.id, s])));
export const ALL_SUBJECTS = Object.freeze(Object.keys(SUBJECT_INFO));

/**
 * Each world's three subjects, in slot order (slot 1 the math building — every world's woven-in
 * math —, slot 2 the history building, slot 3 the physics building).
 */
export const REALM_SUBJECTS = Object.freeze({
  land: ['math', 'history', 'physics'],
  forest: ['logic', 'earth', 'biology'],
  sea: ['measures', 'geography', 'ocean'],
  desert: ['geometry', 'archaeology', 'chemistry'],
  moon: ['spacenumbers', 'rockets', 'astronomy'],
  mars: ['coding', 'engineering', 'planets'],
  castle: ['music', 'languages', 'art']
});

/**
 * Which worlds teach their own three subjects. false = still the mountain's math, history and
 * physics (its current lessons), exactly as before. Flip a world to true in the same change that
 * brings its new lessons (docs/arcademia.md, "Subjects per world").
 */
export const LIVE = Object.freeze({ land: true, forest: false, sea: false, desert: false, moon: false, mars: false, castle: false });
const live = new Set(Object.keys(LIVE).filter((r) => LIVE[r]));
live.add('land');
let liveVersion = 0;

/** True when a world teaches its own subjects. */
export const isLive = (realm = 'land') => live.has(realm);
/**
 * Switch a world over (or back) without editing LIVE: for tests, and for previewing a world's new
 * lessons before they ship. Returns a function that puts it back.
 */
export function setLive(realm, on = true) {
  if (!REALM_SUBJECTS[realm] || realm === 'land') return () => {};
  const was = live.has(realm);
  if (on) live.add(realm);
  else live.delete(realm);
  liveVersion++;
  return () => setLive(realm, was);
}
/** Changes whenever setLive does (content/index.js keys its caches by it). */
export const liveStamp = () => liveVersion;

/** A world's three subjects now, in slot order. */
export const subjectsOf = (realm = 'land') => (live.has(realm) ? REALM_SUBJECTS[realm] : LAND_SUBJECTS);
/** The subjects a world's lessons may have: its own three, and (until it is live) the mountain's. */
export const allowedSubjects = (realm = 'land') => [...new Set([...(REALM_SUBJECTS[realm] ?? []), ...(live.has(realm) ? [] : LAND_SUBJECTS)])];
/** The subject taught in a slot of a world. */
export const subjectAt = (realm, slot) => subjectsOf(realm)[SLOTS.indexOf(slot)] ?? slot;
/** The slot (building, teacher, voice) a world teaches a subject in; null if it doesn't teach it. */
export const slotOf = (realm, subject) => SLOTS[subjectsOf(realm).indexOf(subject)] ?? null;
/** A subject or a slot key, as the world's subject ('math' in a live desert → 'geometry'); null if neither. */
export function toSubject(realm, x) {
  if (subjectsOf(realm).includes(x)) return x;
  if (SLOTS.includes(x)) return subjectAt(realm, x);
  return null;
}

export const isSubject = (id) => Object.hasOwn(SUBJECT_INFO, id);
export const subjectInfo = (id) => SUBJECT_INFO[id] ?? null;
export const subjectIcon = (id) => SUBJECT_INFO[id]?.icon ?? '📘';
/** A subject's name in the current language (i18n `subject.<id>`), or in a given one. */
export const subjectName = (id, lc = null) => (lc ? tIn(lc, `subject.${id}`) : t(`subject.${id}`));
/** English names (the server's report and logs). */
export const SUBJECT_NAMES = Object.freeze(Object.fromEntries(ALL_SUBJECTS.map((id) => [id, tIn('en', `subject.${id}`)])));
/** The activities a lesson runs, in order: its own `activities`, or its subject's flow. */
export const activitiesOf = (lesson) => lesson?.activities ?? SUBJECT_INFO[lesson?.subject]?.flow ?? FLOWS.classroom;

/** Where a world's own strings live in the string tables: '' on the mountain ('lesson.hello.math'), '<realm>.' elsewhere ('desert.hello.math'). */
const prefix = (realm) => (realm === 'land' ? '' : `${realm}.`);
/** The i18n key of a school's name: building.<subject> on the mountain, <realm>.building.<subject> elsewhere. */
export const buildingKey = (realm, slot) => `${prefix(realm)}building.${subjectAt(realm, slot)}`;
/** A school's name in the current language. */
export const buildingName = (realm, slot) => t(buildingKey(realm, slot));
/** The i18n key of a teacher's greeting in the lobby: lesson.hello.<subject> on the mountain, <realm>.hello.<subject> elsewhere. */
export const helloKey = (realm, subject) => (realm === 'land' ? `lesson.hello.${subject}` : `${realm}.hello.${subject}`);
