/**
 * Every lesson told as a little quest: who asks for help, and why. The
 * teachers are Professor Hoot (math), Tock the Time-Keeper (history) and
 * Gizmo the Inventor (physics); each floor is a world with its own story
 * and a friendly puzzle boss to cheer up at the end.
 */
import { TEACHERS } from './world/figures.js';
import { t as tr, localizeLesson } from './i18n/index.js';

/** Math quests by generator: their title and intro are i18n keys quest.math.<gen>.title / .intro. */
const MATH = new Set(['count', 'add10', 'sub10', 'tens-ones', 'add-carry', 'skip-count', 'times', 'sub-borrow', 'fractions', 'mult-2x1', 'division', 'fraction-of', 'balance', 'decimals', 'area', 'negatives', 'percent', 'two-step', 'squares']);

/** The quest framing of a lesson. */
export function questFor(lesson0) {
  const lesson = localizeLesson(lesson0);
  const t = TEACHERS[lesson.subject];
  const steps = (list) => list.map((k) => tr(`quest.step.${k}`));
  if (lesson.subject === 'math') {
    const known = MATH.has(lesson.topic);
    return {
      title: known ? tr(`quest.math.${lesson.topic}.title`) : lesson.title,
      intro: known ? tr(`quest.math.${lesson.topic}.intro`) : tr('quest.math.default'),
      teacher: t,
      steps: steps(['story', 'learn', 'board', 'try', 'challenge'])
    };
  }
  if (lesson.subject === 'history') {
    return {
      title: tr('quest.history.title', { title: lesson.title }),
      intro: tr('quest.history.intro', { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }),
      teacher: t,
      steps: steps(['story', 'learn', 'chat', 'timeline', 'treasure', 'challenge'])
    };
  }
  return {
    title: tr('quest.physics.title', { title: lesson.title }),
    intro: tr('quest.physics.intro'),
    teacher: t,
    steps: steps(['story', 'learn', 'guess', 'experiment', 'challenge'])
  };
}

/** Each floor's world story and its puzzle boss (friendly: you cheer them up). */
/** A floor's world: its story and its boss's name and line come from the current language (world.<n>.*). */
function world(n, boss) {
  return {
    get story() {
      return tr(`world.${n}.story`);
    },
    boss: Object.defineProperties(boss, {
      name: { get: () => tr(`world.${n}.boss`), enumerable: true },
      line: { get: () => tr(`world.${n}.line`), enumerable: true }
    })
  };
}
export const WORLDS = {
  1: world(1, { species: 'puff', color: '#a9b4c8', emoji: '☁️' }),
  2: world(2, { species: 'lion', color: '#f2c46b', emoji: '🦁' }),
  3: world(3, { species: 'dragon', color: '#ffb35c', emoji: '🐉' }),
  4: world(4, { species: 'yeti', color: '#eef5ff', emoji: '❄️' }),
  5: world(5, { species: 'bunny', color: '#e0c3ff', emoji: '🦋' }),
  6: world(6, { species: 'crab', color: '#ff7a5c', emoji: '🦀' }),
  7: world(7, { species: 'robot', color: '#9aa3b5', emoji: '🤖' })
};
