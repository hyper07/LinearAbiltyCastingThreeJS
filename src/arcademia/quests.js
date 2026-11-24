/**
 * Every lesson told as a little quest: who asks for help, and why. The
 * teachers are Professor Hoot (math), Tock the Time-Keeper (history) and
 * Gizmo the Inventor (physics); each floor is a world with its own story
 * and a friendly puzzle boss to cheer up at the end.
 */
import { teachersIn } from './world/figures.js';
import { t as tr, localizeLesson } from './i18n/index.js';

/** Math quests by generator: their title and intro are i18n keys quest.math.<gen>.title / .intro. */
const MATH = new Set(['count', 'add10', 'sub10', 'tens-ones', 'add-carry', 'skip-count', 'times', 'sub-borrow', 'fractions', 'mult-2x1', 'division', 'fraction-of', 'balance', 'decimals', 'area', 'negatives', 'percent', 'two-step', 'squares']);

/** The quest framing of a lesson (`introLine`: the intro's voice line id, voice/script.js). */
export function questFor(lesson0) {
  const lesson = localizeLesson(lesson0);
  const realm = lesson0.realm ?? 'land';
  const t = teachersIn(realm)[lesson.subject];
  const steps = (list) => list.map((k) => tr(`quest.step.${k}`));
  if (realm !== 'land') return realmQuest(realm, lesson, t, steps);
  if (lesson.subject === 'math') {
    const known = MATH.has(lesson.topic);
    return {
      title: known ? tr(`quest.math.${lesson.topic}.title`) : lesson.title,
      intro: known ? tr(`quest.math.${lesson.topic}.intro`) : tr('quest.math.default'),
      introLine: known ? `t.quest.math.${lesson.topic}.intro` : 't.quest.math.default',
      teacher: t,
      steps: steps(['story', 'learn', 'board', 'try', 'challenge'])
    };
  }
  if (lesson.subject === 'history') {
    return {
      title: tr('quest.history.title', { title: lesson.title }),
      intro: tr('quest.history.intro', { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }),
      introLine: `t.quest.history.intro~${lesson.id}`,
      teacher: t,
      steps: steps(['story', 'learn', 'chat', 'timeline', 'treasure', 'challenge'])
    };
  }
  return {
    title: tr('quest.physics.title', { title: lesson.title }),
    intro: tr('quest.physics.intro'),
    introLine: 't.quest.physics.intro',
    teacher: t,
    steps: steps(['story', 'learn', 'guess', 'experiment', 'challenge'])
  };
}

/** A forest or sea lesson's quest: the same steps, told by that realm's teachers (ui.js <realm>.quest.*). */
function realmQuest(realm, lesson, teacher, steps) {
  if (lesson.subject === 'math') return { title: lesson.title, intro: tr(`${realm}.quest.math`), introLine: `t.${realm}.quest.math`, teacher, steps: steps(['story', 'learn', 'board', 'try', 'challenge']) };
  if (lesson.subject === 'history') {
    return {
      title: tr('quest.history.title', { title: lesson.title }),
      intro: tr(`${realm}.quest.history`, { name: lesson.dialogue.npc.name.split(/[,，、]/)[0] }),
      introLine: `t.${realm}.quest.history~${lesson.id}`,
      teacher,
      steps: steps(['story', 'learn', 'chat', 'timeline', 'treasure', 'challenge'])
    };
  }
  return { title: tr('quest.physics.title', { title: lesson.title }), intro: tr(`${realm}.quest.physics`), introLine: `t.${realm}.quest.physics`, teacher, steps: steps(['story', 'learn', 'guess', 'experiment', 'challenge']) };
}

/** Each floor's world story and its puzzle boss (friendly: you cheer them up). */
/** A floor's world: its story and its boss's name and line come from the current language (world.<n>.*). */
function world(n, boss, prefix = 'world') {
  return {
    get story() {
      return tr(`${prefix}.${n}.story`);
    },
    boss: Object.defineProperties(boss, {
      name: { get: () => tr(`${prefix}.${n}.boss`), enumerable: true },
      line: { get: () => tr(`${prefix}.${n}.line`), enumerable: true }
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

/** The sea islands: each island's story and its puzzle boss (ui.js sea.world.<n>.*). */
export const SEA_WORLDS = {
  1: world(1, { species: 'crab', color: '#ff9a6b', emoji: '🦀' }, 'sea.world'),
  2: world(2, { species: 'octopus', color: '#ff8fb8', emoji: '🐙' }, 'sea.world'),
  3: world(3, { species: 'seaturtle', color: '#7fd6c0', emoji: '🐢' }, 'sea.world'),
  4: world(4, { species: 'penguin', color: '#3a4a6a', emoji: '🐧' }, 'sea.world'),
  5: world(5, { species: 'puff', color: '#bfe9ff', emoji: '🫧' }, 'sea.world'),
  6: world(6, { species: 'seal', color: '#8aa0b8', emoji: '🦭' }, 'sea.world'),
  7: world(7, { species: 'robot', color: '#ffd23f', emoji: '🤖' }, 'sea.world')
};
/** The Great Tree: each ring's story and its puzzle boss (ui.js forest.world.<n>.*). */
export const FOREST_WORLDS = {
  1: world(1, { species: 'mouse', color: '#c9b49a', emoji: '🐭' }, 'forest.world'),
  2: world(2, { species: 'hedgehog', color: '#b08a6a', emoji: '🦔' }, 'forest.world'),
  3: world(3, { species: 'squirrel', color: '#d9824a', emoji: '🐿️' }, 'forest.world'),
  4: world(4, { species: 'bunny', color: '#ffc2dc', emoji: '🌸' }, 'forest.world'),
  5: world(5, { species: 'duck', color: '#f2d36b', emoji: '🦆' }, 'forest.world'),
  6: world(6, { species: 'puff', color: '#ffe066', emoji: '🌻' }, 'forest.world'),
  7: world(7, { species: 'dragon', color: '#7f8cff', emoji: '🐉' }, 'forest.world')
};
/** A realm's worlds ('land', 'forest' or 'sea'). */
export const worldsIn = (realm = 'land') => ({ sea: SEA_WORLDS, forest: FOREST_WORLDS })[realm] ?? WORLDS;
