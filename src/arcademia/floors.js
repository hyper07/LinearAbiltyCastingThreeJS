/**
 * The floors of the mountain, bottom to top — each a little world with its
 * own theme. Add an entry (and its lessons, content/*.js) and the mountain
 * grows a terrace: the world, the nav, the minimap and the unlock rules all
 * read this list.
 *
 * `look` drives everything a floor looks and sounds like: the ground and
 * cliff colours, which building shape each subject gets (world/places.js),
 * the landmark at its centre, its trees, critters, particles and music mood.
 * The themes follow the history taught there: the Desert floor is ancient
 * Egypt, the Harbor is the age of exploration, the top is the Moon landing.
 */
export const FLOORS = [
  {
    n: 1, name: 'Meadow Village', ages: '6–7', icon: '🌼',
    look: {
      theme: 'meadow', grass: '#9fe38a', grassDark: '#86d474', rock: ['#b7c0ea', '#a3aee0', '#c9d0f2'], path: '#ffe9c2',
      stone: '#e8dcc8', trim: '#fff6e6', wall: '#fff1d6', roof: { math: '#ff7a5c', history: '#ffb347', physics: '#6fb8ff' },
      shapes: { math: 'house', history: 'hall', physics: 'tower' }, landmark: 'windmill',
      tree: 'round', leaf: '#5fcf6a', flowers: ['#ffd166', '#ff8fa3', '#ffffff', '#c39bff'], banner: '#ff8fa3',
      critters: ['bunny', 'bunny', 'mouse', 'duck'], particles: 'petals', mood: 'birds'
    }
  },
  {
    n: 2, name: 'Desert Pyramids', ages: '7–8', icon: '🐫',
    look: {
      theme: 'desert', grass: '#ffd98a', grassDark: '#f6c96e', rock: ['#f2b36b', '#e59f58', '#ffc98a'], path: '#fff0cf',
      stone: '#f3d7a2', trim: '#fff3d9', wall: '#ffe7b8', roof: { math: '#ffcf5c', history: '#e98a4f', physics: '#4fb0c6' },
      shapes: { math: 'pyramid', history: 'hall', physics: 'tower' }, landmark: 'oasis',
      tree: 'palm', leaf: '#4fbf6a', flowers: ['#ff9f4a', '#ff5f7e', '#ffd23f'], banner: '#4fb0c6',
      critters: ['fox', 'mouse', 'hedgehog'], particles: 'sand', mood: 'wind'
    }
  },
  {
    n: 3, name: 'Mushroom Grove', ages: '8–9', icon: '🍄',
    look: {
      theme: 'mushroom', grass: '#8fe0c4', grassDark: '#74d0b0', rock: ['#b59ee8', '#a18ad9', '#c7b5f0'], path: '#f7e4ff',
      stone: '#e6d9f2', trim: '#ffffff', wall: '#fff6ea', roof: { math: '#ff5f7e', history: '#9b7be0', physics: '#ffb347' },
      shapes: { math: 'mushroom', history: 'mushroom', physics: 'tower' }, landmark: 'shrooms',
      tree: 'shroom', leaf: '#ff7aa8', flowers: ['#ffe066', '#7cc6ff', '#ff9ed2'], banner: '#9b7be0',
      critters: ['frog', 'hedgehog', 'frog'], particles: 'spores', mood: 'crickets'
    }
  },
  {
    n: 4, name: 'Snowy Peaks', ages: '9–10', icon: '❄️',
    look: {
      theme: 'snow', grass: '#f2f8ff', grassDark: '#e1eefc', rock: ['#a9c4f0', '#94b3e6', '#c3d6f6'], path: '#d9e8ff',
      stone: '#dfe9f7', trim: '#ffffff', wall: '#f4f8ff', roof: { math: '#7cc6ff', history: '#ff7a7a', physics: '#9b7be0' },
      shapes: { math: 'igloo', history: 'igloo', physics: 'tower' }, landmark: 'snowman',
      tree: 'snowcone', leaf: '#4fb39a', flowers: ['#bfe9ff', '#ffffff'], banner: '#7cc6ff',
      critters: ['penguin', 'penguin', 'bear'], particles: 'snow', mood: 'chimes', snow: true
    }
  },
  {
    n: 5, name: 'Cloud Sky City', ages: '10–11', icon: '☁️',
    look: {
      theme: 'cloud', grass: '#ffe3f4', grassDark: '#f9d0ea', rock: ['#d9d4ff', '#c9c2fb', '#ebe8ff'], path: '#ffffff',
      stone: '#f3efff', trim: '#ffffff', wall: '#ffffff', roof: { math: '#ff9ed2', history: '#ffd23f', physics: '#7cc6ff' },
      shapes: { math: 'cloudhouse', history: 'hall', physics: 'tower' }, landmark: 'rainbow',
      tree: 'candy', leaf: '#ffb3d9', flowers: ['#ffe066', '#9fe0ff', '#ffffff'], banner: '#ff9ed2',
      critters: ['puff', 'bunny', 'puff'], particles: 'sparkles', mood: 'bells'
    }
  },
  {
    n: 6, name: 'Seaside Harbor', ages: '11–12', icon: '⚓',
    look: {
      theme: 'harbor', grass: '#a6e8a0', grassDark: '#8fdc8a', rock: ['#9fc2e0', '#8ab3d6', '#b5d2ea'], path: '#ffeccc',
      stone: '#e6e1d6', trim: '#ffffff', wall: '#f2f8ff', roof: { math: '#ff9a8a', history: '#3f7fd6', physics: '#ff5f5f' },
      shapes: { math: 'shell', history: 'hall', physics: 'lighthouse' }, landmark: 'boat',
      tree: 'palm', leaf: '#3fbf7a', flowers: ['#ffffff', '#ffd23f', '#ff8fa3'], banner: '#3f7fd6',
      critters: ['crab', 'duck', 'crab'], particles: 'spray', mood: 'waves'
    }
  },
  {
    n: 7, name: 'Moon Base', ages: '12–13', icon: '🚀',
    look: {
      theme: 'moon', grass: '#c9cbd8', grassDark: '#b7bacb', rock: ['#9a9db5', '#8a8da8', '#adb0c6'], path: '#e8e9f2',
      stone: '#d4d6e2', trim: '#ffffff', wall: '#eef0f8', roof: { math: '#7cc6ff', history: '#ffb347', physics: '#ff6f6f' },
      shapes: { math: 'dome', history: 'dome', physics: 'tower' }, landmark: 'rocket',
      tree: 'none', leaf: '#7cc6ff', flowers: ['#7ff7ff', '#c39bff'], banner: '#7cc6ff',
      critters: ['robot', 'robot', 'puff'], particles: 'twinkles', mood: 'beeps', craters: true
    }
  }
];

export const floorByN = (n) => FLOORS.find((f) => f.n === n) ?? null;
