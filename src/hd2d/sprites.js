/**
 * Lanternwood's cast as letter maps, shaded by src/pixel/art.js (one letter a
 * material, light from the top-left, selective outlines). Every person has
 * a front, a back and a side view, each an idle frame and two walk frames;
 * the backs are made from the fronts (the face becomes hair).
 *
 *   const s = buildSprites();         // s.hero.ember.back[1].canvas …
 */
import { shadeSprite, RAMPS, ramp } from '../pixel/art.js';
import { HERO_LOOKS } from './rules.js';

/** Pixels of a 4× shaded sprite per world metre (every character shares it). */
export const PXM = 48;

const FLAT = { E: '#1a1026', W: '#ffffff', Y: '#ffe9a8', O: '#ffb347', U: '#9ff4ff', V: '#5fe3ff', Z: '#ffd27a' };

/* -------------------------------------------------- people (16 wide) */

const LEGS = {
  front: [
    ['....LLL..LLL....', '....LLL..LLL....', '...SSSS..SSSS...'],
    ['....LLL..LLL....', '...SSSS..LLL....', '.........SSSS...'],
    ['....LLL..LLL....', '....LLL..SSSS...', '...SSSS.........']
  ],
  side: [
    ['......LL.LL.....', '......LL.LL.....', '.....SSS.SSSS...'],
    ['.....LL...LL....', '....LL.....LL...', '...SSS.....SSSS.'],
    ['.......LLL......', '.......LLL......', '......SSSSS.....']
  ]
};

const HERO_FRONT = [
  '......HHHH......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHFFFFHHHH..',
  '..HHHFFFFFFHHH..',
  '..HFFWEFFWEFFH..',
  '..HFFEEFFEEFFH..',
  '...FFFFFFFFFF...',
  '....FFFFFFFF....',
  '...CCGTTTTGCC...',
  '..CCCCTTTTCCCC..',
  '.CCCCTTTTTTCCCC.',
  '.CCFCTTTTTTCFCC.',
  '.CC.BBBGBBBB.CC.',
  '.CC.TTTTTTTT.CC.'
];
const HERO_BACK = [
  '......HHHH......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '...HHHHHHHHHD...',
  '....HHHHHHHD....',
  '...CCCCCCCKCC...',
  '..CCCCCCCKCCCC..',
  '.CCCCCCCKCCCCCC.',
  '.FCCCCCKCCCCCCF.',
  '.CCCCCKCCCCCCCC.',
  '.CCCCKCCCCCCCCC.'
];
const HERO_SIDE = [
  '.....HHHH.......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHHHHHHHHHH...',
  '..HHHHHHHFFFH...',
  '..HHHHHHFFFFF...',
  '..HHHHHFFFWEF...',
  '..HHHHHFFFEEF...',
  '...HHHHFFFFFF...',
  '....HHHFFFFF....',
  '...DCCCTTTT.....',
  '..KCCCCTTTTT....',
  '.KCCCCCTTTFF....',
  'KCCCCCCTTTFF....',
  '..CCC.BBBBB.....',
  '..CC..TTTTT.....'
];

const ODILE_FRONT = [
  '.NNN..HHHH......',
  '.NYN.HHHHHH.....',
  '.NNNHHHHHHHH....',
  '..KHHHHHHHHHH...',
  '..KHHFFFFFFHH...',
  '..KHFFFFFFFFH...',
  '..KHFWEFFWEFH...',
  '..KHFEEFFEEFH...',
  '..K.FFFFFFFF....',
  '..K..FFRRFF.....',
  '..KCCCGTTGCCC...',
  '.CKCCCCTTCCCCC..',
  '.CFCCCCTTCCCCCC.',
  '.CKCCCCTTCCCCFC.',
  '.CKCBBBBBBBBCCC.',
  '.CKCCCCCCCCCCCC.'
];
const WREN_FRONT = [
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '...AAAAAAAAAA...',
  '..AAAHHHHHHAAA..',
  '..AAHHFFFFHHAA..',
  '..AAHFFFFFFHAA..',
  '..AAFWEFFWEFAA..',
  '..AAFEEFFEEFAA..',
  '..AAAFFRRFFAAA..',
  '...AAAFFFFAAA...',
  '...TTTTTTTTTT...',
  '..TTTPPPPPPTTT..',
  '.TTTPPPPPPPPTTT.',
  '.TFTPPPPPPPPTFT.',
  '.TT.BBBBBGBB.TT.',
  '.TT.TPPPPPPT.TT.'
];
const PELL_FRONT = [
  '................',
  '.....PPPPPP.....',
  '....PPPPPPPP....',
  '..AAAAAAAAAAAA..',
  '.AAAAAAAAAAAAAA.',
  '...HFFFFFFFFH...',
  '..QHFWEFFWEFHQ..',
  '..QHFEEFFEEFHQ..',
  '..QQFFFFFFFFQQ..',
  '..QQQHHHHHHQQQ..',
  '.QQCCCHHHHCCCQQ.',
  '.QQCCCCTTCCCCQQ.',
  '.QCCCCCTTCCCCCQ.',
  '.QFCCCCTTCCCCFQ.',
  '.QQCBBBGGBBBCQQ.',
  '..QCCCCCCCCCCQ..'
];
const TAMSIN_FRONT = [
  '................',
  '................',
  '.HH...HHHH...HH.',
  '.HHH.HHHHHH.HHH.',
  '.HHHHHHHHHHHHHH.',
  '..HHHFFFFFFHHH..',
  '..HHFWEFFWEFHH..',
  '...HFEEFFEEFH...',
  '...HFFRFFRFFH...',
  '....FFFFFFFF....',
  '....GGGGGGGG....',
  '...CCGGTTCCCC...',
  '..CCCCTTTTCCCC..',
  '..CFCCTTTTCCFC..',
  '...CCBBBBBBCC...',
  '...CCTTTTTTCC...'
];

/** The back of a front view: the face turns to hair, the eyes and mouth go with it. */
function backOf(rows, headRows = 10, hair = 'H') {
  const face = hair === 'H' ? /[FEWR]/g : /[FEWRH]/g;
  return rows.map((r, y) => (y < headRows ? r.replace(face, (c) => (c === 'F' && y >= headRows - 1 ? 'F' : hair)) : r));
}

const people = {
  odile: {
    front: ODILE_FRONT,
    ramps: { H: RAMPS.bone, F: RAMPS.skin, C: ramp('#3b6f6a'), T: RAMPS.wood, G: RAMPS.gold, B: ramp('#6a3a2a'), K: RAMPS.wood, N: RAMPS.steel, L: ramp('#4a4058'), S: RAMPS.wood, R: ramp('#c87a6a') }
  },
  wren: {
    front: WREN_FRONT,
    ramps: { A: ramp('#6f9a5c'), H: ramp('#7a4a2a'), F: RAMPS.skin, T: ramp('#8f7aa8'), P: RAMPS.bone, G: RAMPS.blood, L: ramp('#5a4a40'), S: RAMPS.wood, R: ramp('#e08a7a') },
    hair: 'A'
  },
  pell: {
    front: PELL_FRONT,
    ramps: { P: ramp('#8a5a3a'), A: ramp('#a8743e'), H: ramp('#a06a3a'), F: RAMPS.skin, Q: ramp('#6e5a3a'), C: ramp('#b0503c'), T: ramp('#d8c090'), B: RAMPS.wood, G: RAMPS.gold, L: ramp('#4a3a5a'), S: RAMPS.wood }
  },
  tamsin: {
    front: TAMSIN_FRONT,
    ramps: { H: ramp('#d0603a'), F: RAMPS.skin, G: ramp('#e8c040'), C: ramp('#4e7a9a'), T: ramp('#c0a070'), B: RAMPS.wood, L: ramp('#5a4a3a'), S: RAMPS.wood, R: ramp('#f09080') }
  }
};

/* ----------------------------------------------------------- enemies */

const SLIME = [
  ['......GGG.....', '....GGGGGGG...', '...GGGGGGGGG..', '..GGGGGGGGGGG.', '..GGWVGGGWVGG.', '.GGGVVGGGVVGGG', '.GGGGGGGGGGGGG', 'GGGGGGGGGGGGGG', 'GGGGGGGGGGGGGG', '.GGGGGGGGGGGG.'],
  ['..............', '..............', '......GGG.....', '...GGGGGGGGG..', '..GGGGGGGGGGGG', '.GGGWVGGGGWVGG', 'GGGGVVGGGGVVGGG', 'GGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', '.GGGGGGGGGGGGGG.']
];
const WOLF_TOP = [
  '..............A..A...',
  '.............AA.AA...',
  '..R.........AAAAAAA..',
  '.RR..RRRRRRRAAAAOAAA.',
  '.RAARRAAAAAAAAAAAAAAN',
  '..AAAAAAAAAAAAAAAMMM.',
  '..AAAAAAAAAAAAAAMM...',
  '..AAAAAAAAAAAAAAA....',
  '...AAABBBBBBBAAAA....'
];
const WOLF_LEGS = [
  ['...AAA.......AAA.....', '...AAA.......AAA.....', '...AA........AA......', '..DDD.......DDD......'],
  ['..AAA.........AAA....', '.AAA...........AAA...', 'AA...............AA..', 'DD................DD.'],
  ['....AAA.....AAA......', '....AAA.....AAA......', '.....AA......AA......', '....DDD.....DDD......']
];
const WISP = [
  ['.....P......', '....PP......', '....PPP.....', '...PPPP..P..', '..PPPPPP.P..', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPEPPPPEPP.', '.PPEPPPPEPP.', '.PPPPPPPPPP.', '..PPPPPPPP..', '...PPPPPP...', '....PPPP.P..', '.....PP..P..', '......P.....'],
  ['......P.....', '......PP....', '.....PPP....', '..P..PPPP...', '..P.PPPPPP..', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPEPPPPEPP.', '.PPEPPPPEPP.', '.PPPPPPPPPP.', '..PPPPPPPP..', '...PPPPPP...', '..P.PPPP....', '..P..PP.....', '.....P......']
];
const LAMPWIGHT_TOP = [
  '...........RRRRRR...........',
  '.........RRRRRRRRRR.........',
  '........RRRRRRRRRRRR........',
  '.......RRRRNNNNNNRRRR.......',
  '.......RRRNQQQQQQNRRR.......',
  '......RRRRNQUUUUQNRRRR......',
  '......RRRRNQUVVUQNRRRR......',
  '......RRRRNQUVVUQNRRRR......',
  '......RRRRNQUUUUQNRRRR......',
  '......RRRRNQQQQQQNRRRR......',
  '......RRRRRNNNNNNRRRRR......',
  '.....RRRRRRRRRRRRRRRRRR.....',
  '....RRRRRRRRRRRRRRRRRRRR....',
  '...RRRRRRRRRRRRRRRRRRRRRR...',
  '..RRRRRRRRRRCCCCRRRRRRRRRR..',
  '..RRRRBBRRRRRCCRRRRRRBBRRR..',
  '.RRRR.BBRRRRRRRRRRRRRBB.RRR.',
  '.RRR..BBRRRRRRRRRRRRRBB..RR.',
  '.RR...BBRRRRRRRRRRRRRBB...R.',
  '......XXRRRRRRRRRRRRRXX.....',
  '.....X.XRRRRRRRRRRRRRX.X....',
  '........RRRRRRRRRRRRR.......',
  '........RRRRRRRRRRRRR.......',
  '.......RRRRRRRRRRRRRRR......',
  '.......RRRRRRRRRRRRRRR......',
  '......RRRRRRRRRRRRRRRRR.....',
  '......RRRRRRRRRRRRRRRRR.....',
  '.....RRRRRRRRRRRRRRRRRRR....',
  '.....RRRRRRRRRRRRRRRRRRR....'
];
const LAMPWIGHT_HEM = [
  ['....RRRRRRRRRRRRRRRRRRRRR...', '....RR.RRRR.RRRRR.RRRR.RR...', '....R...RR...RRR...RR...R...'],
  ['....RRRRRRRRRRRRRRRRRRRRR...', '...RRR.RRR.RRRRRR.RRR.RRR...', '...R....R...R..RR...R...R...']
];
const HERB = ['.O.....O.', 'OZO...OZO', '.OG.O.GO.', '..G.Z.G..', '.GGOGOGG.', 'GG.GGG.GG', '...GGG...'];

/* ------------------------------------------------------------- build */

const opts = (flat = FLAT) => ({ scale: 4, flat });

/** A person's three views × three frames (idle, walk A, walk B). */
function person(body, ramps, { back = null, side = null, hair = 'H' } = {}) {
  const sideBody = side ?? body;
  const views = {
    front: LEGS.front.map((legs) => shadeSprite([...body, ...legs], ramps, opts())),
    back: LEGS.front.map((legs) => shadeSprite([...(back ?? backOf(body, 10, hair)), ...legs], ramps, opts())),
    side: LEGS.side.map((legs) => shadeSprite([...sideBody, ...legs], ramps, opts()))
  };
  // Made solid (voxel.js), each front frame wears its back frame behind it.
  views.front.forEach((f, i) => (f.back = views.back[i]));
  return views;
}

function heroRamps(look) {
  const L = HERO_LOOKS[look];
  return { H: ramp(L.hair), F: RAMPS.skin, C: ramp(L.cloak), T: ramp(L.tunic), G: ramp(L.trim), B: RAMPS.wood, L: ramp('#4a4560'), S: RAMPS.wood, K: RAMPS.steel, D: RAMPS.gold };
}

/**
 * Every sprite the game draws, shaded once. Each sprite is
 * { canvas, white, width, height } (white: the hit-flash silhouette).
 */
export function buildSprites() {
  const hero = {};
  for (const look of Object.keys(HERO_LOOKS)) hero[look] = person(HERO_FRONT, heroRamps(look), { back: HERO_BACK, side: HERO_SIDE });
  const npcs = {};
  for (const [id, p] of Object.entries(people)) {
    const views = person(p.front, p.ramps, { hair: p.hair ?? 'H' });
    npcs[id] = { front: views.front, back: views.back };
  }
  const violet = ['#1c1430', '#2e2050', '#463478', '#6a52a8', '#9a84d8'];
  const enemies = {
    slime: SLIME.map((rows) => shadeSprite(rows, { G: violet }, opts())),
    wolf: WOLF_LEGS.map((legs) => shadeSprite([...WOLF_TOP, ...legs], { A: ramp('#5a5a6a'), R: RAMPS.ember, B: RAMPS.bone, M: RAMPS.bone, N: ['#101018', '#181820', '#202028', '#282830', '#303038'], D: ramp('#3a3a48') }, opts({ ...FLAT, O: '#ffb347' }))),
    wisp: WISP.map((rows) => shadeSprite(rows, { P: ['#2a7a9a', '#3fb0c8', '#6ad8e0', '#a6f0ec', '#e8fff8'] }, opts({ ...FLAT, E: '#0e2030' }))),
    lampwight: LAMPWIGHT_HEM.map((hem) => shadeSprite([...LAMPWIGHT_TOP, ...hem], { R: ['#120c1c', '#1e1430', '#2c2046', '#3e2e5e', '#56447a'], N: RAMPS.steel, Q: ['#1a2a40', '#244060', '#2e5a80', '#4a7aa0', '#7ab0d0'], C: RAMPS.gold, B: RAMPS.bone, X: RAMPS.bone }, opts()))
  };
  // How thick each is made (half, in metres), and the wolf drawn from the side.
  for (const f of enemies.slime) f.depth = 0.32;
  for (const f of enemies.wolf) Object.assign(f, { depth: 0.2, profile: true });
  for (const f of enemies.wisp) f.depth = 0.2;
  for (const f of enemies.lampwight) f.depth = 0.38;
  const herb = shadeSprite(HERB, { G: ramp('#3a6a3a'), O: RAMPS.ember }, opts());
  herb.depth = 0.06;
  return { hero, npcs, enemies, herb };
}

/** A square portrait of a sprite's head (the top of its front view), drawn crisp into a canvas. */
export function portrait(sprite, size = 96, crop = 0.62) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const h = Math.round(sprite.height * crop);
  const w = sprite.width;
  const s = Math.min(size / w, size / h);
  g.drawImage(sprite.canvas, 0, 0, w, h, (size - w * s) / 2, size - h * s, w * s, h * s);
  return c;
}
