/**
 * The study worlds (maps). Every world holds the same seven floors of
 * lessons — floor n is floor n everywhere, so stars, coins, stickers and the
 * buddy go wherever the player goes — and dresses them its own way: the
 * Learning Mountain stacks them as terraces, the Great Tree as rings of
 * treehouses round a giant trunk.
 *
 * To add a world: give it an entry here with its floors' looks (the shape of
 * floors.js — `look` drives the buildings, landmark, critters, particles and
 * music mood), a `kind` the diorama knows how to build (world/World.js picks
 * the plan and scenery by kind), names in every language (ui.js `map.<id>`,
 * `map.<id>.what`, `map.<id>.whole`, its floor names; lesson.js for the lessons'
 * way back), and it shows in
 * the World Portal's picker.
 */
import { FLOORS } from './floors.js';
import { t } from './i18n/index.js';

const WOOD = { stone: '#b88a5c', trim: '#fff3dc', wall: '#fbecd0', path: '#f0dcb4', rock: ['#9c7a5a', '#8a6a4c', '#b08e6c'] };

/** The Great Tree's rings, bottom to top: the same floors, in treehouse dress. */
export const TREE_FLOORS = [
  {
    icon: '🍄',
    look: {
      ...WOOD, theme: 'mushroom', grass: '#8fd6a0', grassDark: '#76c28a', roof: { math: '#ff7a5c', history: '#9b7be0', physics: '#4fb0c6' },
      shapes: { math: 'mushroom', history: 'mushroom', physics: 'treehouse' }, landmark: 'shrooms',
      tree: 'shroom', leaf: '#5fbf6a', flowers: ['#ffd166', '#ff8fa3', '#ffffff'], banner: '#9b7be0',
      critters: ['frog', 'hedgehog', 'mouse'], particles: 'spores', mood: 'crickets'
    }
  },
  {
    icon: '🌿',
    look: {
      ...WOOD, theme: 'meadow', grass: '#9fe38a', grassDark: '#86d474', roof: { math: '#4fbf6a', history: '#ffb347', physics: '#6fb8ff' },
      shapes: { math: 'treehouse', history: 'hall', physics: 'tower' }, landmark: 'windmill',
      tree: 'round', leaf: '#4fbf6a', flowers: ['#ffd166', '#c39bff', '#ffffff'], banner: '#ffb347',
      critters: ['bunny', 'mouse', 'duck'], particles: 'petals', mood: 'birds'
    }
  },
  {
    icon: '🏮',
    look: {
      ...WOOD, theme: 'desert', grass: '#b9e08a', grassDark: '#a3d074', roof: { math: '#ff9f4a', history: '#e98a4f', physics: '#ffcf5c' },
      shapes: { math: 'treehouse', history: 'hall', physics: 'tower' }, landmark: 'oasis',
      tree: 'round', leaf: '#62c46a', flowers: ['#ff9f4a', '#ff5f7e', '#ffd23f'], banner: '#ff5f5f',
      critters: ['fox', 'hedgehog', 'mouse'], particles: 'sparkles', mood: 'bells'
    }
  },
  {
    icon: '🌸',
    look: {
      ...WOOD, theme: 'cloud', grass: '#c9efb0', grassDark: '#b2e29a', roof: { math: '#ff9ed2', history: '#ff7aa8', physics: '#c39bff' },
      shapes: { math: 'treehouse', history: 'hall', physics: 'tower' }, landmark: 'rainbow',
      tree: 'candy', leaf: '#ff9ec7', flowers: ['#ffffff', '#ffd1e8', '#ffe066'], banner: '#ff7aa8',
      critters: ['bunny', 'puff', 'bunny'], particles: 'petals', mood: 'birds'
    }
  },
  {
    icon: '🪺',
    look: {
      ...WOOD, theme: 'harbor', grass: '#a6e8a0', grassDark: '#8fdc8a', roof: { math: '#3f7fd6', history: '#ff9a8a', physics: '#ffd23f' },
      shapes: { math: 'treehouse', history: 'hall', physics: 'lighthouse' }, landmark: 'boat',
      tree: 'round', leaf: '#3fbf7a', flowers: ['#ffffff', '#ffd23f', '#7cc6ff'], banner: '#3f7fd6',
      critters: ['duck', 'puff', 'duck'], particles: 'sparkles', mood: 'wind'
    }
  },
  {
    icon: '🌼',
    look: {
      ...WOOD, theme: 'cloud', grass: '#d8f5c8', grassDark: '#c5ebb3', roof: { math: '#7cc6ff', history: '#ffd23f', physics: '#9b7be0' },
      shapes: { math: 'cloudhouse', history: 'hall', physics: 'treehouse' }, landmark: 'glowbloom',
      tree: 'round', leaf: '#7fd88a', flowers: ['#ffe066', '#9fe0ff', '#ffffff'], banner: '#ffb347',
      critters: ['puff', 'bunny', 'puff'], particles: 'sparkles', mood: 'chimes'
    }
  },
  {
    icon: '✨',
    look: {
      ...WOOD, theme: 'moon', grass: '#b8e6c8', grassDark: '#a2d8b4', roof: { math: '#7f8cff', history: '#ffb347', physics: '#5a6fd6' },
      shapes: { math: 'treehouse', history: 'dome', physics: 'tower' }, landmark: 'rocket',
      tree: 'round', leaf: '#5fc79a', flowers: ['#7ff7ff', '#c39bff', '#ffffff'], banner: '#7f8cff',
      critters: ['puff', 'robot', 'bunny'], particles: 'twinkles', mood: 'chimes'
    }
  }
].map((f, i) => ({ ...f, n: i + 1, ages: FLOORS[i].ages }));
for (const f of TREE_FLOORS) Object.defineProperty(f, 'name', { get: () => t(`tree.floor.${f.n}`), enumerable: true });

/** The worlds; names come from the current language (ui.js map.<id>, map.<id>.what). */
export const MAPS = [
  { id: 'mountain', icon: '⛰️', kind: 'mountain', floors: FLOORS, whole: 'hud.whole', back: ['lesson.back', 'lesson.backAria'] },
  { id: 'tree', icon: '🌳', kind: 'tree', floors: TREE_FLOORS, whole: 'map.tree.whole', back: ['lesson.back.tree', 'lesson.backAria.tree'] }
];
for (const m of MAPS) {
  Object.defineProperty(m, 'name', { get: () => t(`map.${m.id}`), enumerable: true });
  Object.defineProperty(m, 'what', { get: () => t(`map.${m.id}.what`), enumerable: true });
}

export const mapById = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];
