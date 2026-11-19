/**
 * Every lesson told as a little quest: who asks for help, and why. The
 * teachers are Professor Hoot (math), Tock the Time-Keeper (history) and
 * Gizmo the Inventor (physics); each floor is a world with its own story
 * and a friendly puzzle boss to cheer up at the end.
 */
import { TEACHERS } from './world/figures.js';

const MATH = {
  count: ['Count the runaway stars', 'Oh dear! My stars rolled out of the jar. Help me count them all back in!'],
  add10: ['The berry basket', 'The squirrels are bringing berries. Help me add them up so nobody goes hungry!'],
  sub10: ['The cookie thief', 'Some cookies vanished from the plate! Work out how many are left.'],
  'tens-ones': ['Bundle the sticks', 'The beavers bundle sticks in tens. Help them sort a big pile!'],
  'add-carry': ['The carrying crane', 'My counting crane carries tens up the column. Help it with big sums!'],
  'skip-count': ['Hop-along bridge', 'The frog bridge only lets you hop in twos, fives or tens. Find the next stone!'],
  times: ['The egg-box factory', 'The hens lay eggs in neat rows. Help me count them fast with times tables!'],
  'sub-borrow': ['Borrow a ten', 'The bank of tens can lend you one when the ones run out. Let’s go!'],
  fractions: ['Pizza party', 'Everyone wants a fair slice. Help me cut and share the pizzas!'],
  'mult-2x1': ['The grid garden', 'Plant big rows of flowers and work out how many with the grid trick!'],
  division: ['Fair shares', 'The sweets must be shared equally among friends. Can you split them?'],
  'fraction-of': ['The treasure split', 'Pirate mice found coins! Help them take their fraction of the treasure.'],
  balance: ['The wobbly scale', 'My magic scale is wobbling! Find the mystery x that makes it level.'],
  decimals: ['Tiny steps', 'The ants walk in tenths of a step. Help them add up their tiny hops!'],
  area: ['Fence the meadow', 'The sheep need a fence and a lawn. Work out the perimeter and the area!'],
  negatives: ['The frosty thermometer', 'Brrr! The snow cave thermometer goes below zero. Help read it!'],
  percent: ['The sale at the shop', 'Everything is on sale! Help the shopkeeper work out the percentages.'],
  'two-step': ['The locked vault', 'Two locks guard the vault. Undo them in the right order to find x!'],
  squares: ['The square garden', 'Build square gardens with tiles — and work backwards to find their sides!']
};

/** The quest framing of a lesson. */
export function questFor(lesson) {
  const t = TEACHERS[lesson.subject];
  if (lesson.subject === 'math') {
    const [title, intro] = MATH[lesson.topic] ?? [lesson.title, 'Let’s solve some puzzles together!'];
    return { title, intro, teacher: t, steps: ['Story', 'Learn', 'Watch the board', 'Try it', 'Challenge'] };
  }
  if (lesson.subject === 'history') {
    return {
      title: `Time trip: ${lesson.title}`,
      intro: `Tick-tock! My time clock can take us back. Meet ${lesson.dialogue.npc.name.split(',')[0]}, ask them everything, then fix the timeline!`,
      teacher: t,
      steps: ['Story', 'Learn', 'Chat', 'Timeline', 'Treasure', 'Challenge']
    };
  }
  return {
    title: `Experiment: ${lesson.title}`,
    intro: 'Goggles on! First guess what will happen, then we test it. Real scientists do it this way!',
    teacher: t,
    steps: ['Story', 'Learn', 'Guess', 'Experiment', 'Challenge']
  };
}

/** Each floor's world story and its puzzle boss (friendly: you cheer them up). */
export const WORLDS = {
  1: { story: 'Spring has come to Meadow Village! The windmill is turning and the bunnies are counting on you.', boss: { name: 'Grumble Cloud', species: 'puff', color: '#a9b4c8', emoji: '☁️', line: 'Hmph! Nobody can cheer me up… unless you can answer my puzzles!' } },
  2: { story: 'Hot sand, tall pyramids and a cool oasis. The desert holds secrets from long, long ago.', boss: { name: 'Sir Sulky Sphinx', species: 'bear', color: '#f2c46b', emoji: '🦁', line: 'I am the Sphinx! Answer my riddles, or I will sulk all day.' } },
  3: { story: 'In the Mushroom Grove the toadstools bounce and the spores glow. Every right answer makes one shine.', boss: { name: 'Fizzlewick', species: 'dragon', color: '#ffb35c', emoji: '🐉', line: 'My fire went out! Only clever answers can relight it.' } },
  4: { story: 'Brrr! Snowy Peaks has igloos, ice and penguins who love puzzles.', boss: { name: 'The Riddle Yeti', species: 'bear', color: '#eef5ff', emoji: '❄️', line: 'Brrr-illiant! Answer my riddles and I will melt into a smile.' } },
  5: { story: 'Cloud Sky City floats on rainbows. Even the bees here do sums!', boss: { name: 'Mopey Moth', species: 'bunny', color: '#e0c3ff', emoji: '🦋', line: 'I lost my sparkle… help me find it with your brain!' } },
  6: { story: 'Ships come and go at Seaside Harbor. Explorers set sail from here to map the world!', boss: { name: 'Captain Crabby', species: 'crab', color: '#ff7a5c', emoji: '🦀', line: 'Arr! No ship leaves my harbor until you solve my puzzles!' } },
  7: { story: 'The Moon Base at the top of the mountain! Only the bravest thinkers reach the stars.', boss: { name: 'Robo-Gloom 3000', species: 'robot', color: '#9aa3b5', emoji: '🤖', line: 'BEEP. My circuits feel gloomy. Compute the answers to reboot my smile.' } }
};
