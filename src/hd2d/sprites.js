/**
 * Lanternwood's cast as letter maps, shaded by src/pixel/art.js (one letter a
 * material, light from the top-left, selective outlines), made solid by
 * voxel.js. People come from people.js (a hair cut, a face, a build, an
 * outfit) and are coloured here — a hero's colours follow what they wear;
 * monsters are drawn here; so are the item and skill icons.
 *
 *   const s = buildSprites();               // s.npcs.odile.front[0], s.enemies.hornet[1] …
 *   heroSprite(look, gearLook)              // a hero's figure in their gear (cached)
 *   iconCanvas(entry) / skillIcon(id)       // pixel icons for the bag and the hotbar
 */
import { shadeSprite, RAMPS, ramp, mix } from '../pixel/art.js';
import { NPCS, SKINS, lookById, RARITIES, BASES, CONSUMABLES } from './rules.js';
import { personRows, NPC_ROWS_HANDMADE } from './people.js';

/** Pixels of a 4× shaded sprite per world metre (every character shares it). */
export const PXM = 48;

const FLAT = { E: '#1a1026', W: '#ffffff', Y: '#ffe9a8', O: '#ffb347', U: '#9ff4ff', V: '#5fe3ff', Z: '#ffd27a' };
const opts = (flat = FLAT) => ({ scale: 4, flat });
/** A shaded sprite that remembers its letter map (voxel.js rounds and lights by material). */
const shade = (rows, ramps, o) => Object.assign(shadeSprite(rows, ramps, o), { rows });
const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));

/* ----------------------------------------------------------- people */

/** The back of a front view: the face turns to hair (or stays skin on a bald head). */
function backOf(rows, headRows = 10, hair = 'H', bald = false) {
  const face = bald ? /[EWRD]/g : hair === 'H' ? /[FEWRD]/g : /[FEWRDH]/g;
  return rows.map((r, y) => (y < headRows ? r.replace(face, (c) => (c === 'F' && y >= headRows - 1 ? 'F' : bald ? 'F' : hair)) : r));
}

/** A person's front figure (its back drawn behind it, for the voxel figure). */
function personSprite(rows, ramps, { hair = 'H', bald = false, flat = FLAT } = {}) {
  const front = shadeSprite(rows, ramps, opts(flat));
  front.rows = rows;
  const backRows = backOf(rows, 10, hair, bald);
  front.back = shadeSprite(backRows, ramps, opts(flat));
  front.back.rows = backRows;
  // The same face with the eyes shut (the rig blinks), and the eyes' catch-light glowing a touch.
  const shut = blinkRows(rows);
  if (shut) {
    front.blink = shadeSprite(shut, ramps, opts(flat));
    front.blink.rows = shut;
    front.blink.back = front.back;
  }
  front.glow = { W: 0.12 };
  return front;
}

/** A face with its eyes closed: each eye column keeps only its lowest dark pixel (the lashes), the rest is skin. */
export function blinkRows(rows, headRows = 10) {
  const out = rows.map((r) => r.split(''));
  let changed = false;
  for (let c = 0; c < (rows[0]?.length ?? 0); c++) {
    const eye = [];
    for (let r = 0; r < Math.min(headRows, out.length); r++) if (out[r][c] === 'E' || out[r][c] === 'W') eye.push(r);
    if (!eye.length) continue;
    for (const r of eye) out[r][c] = 'F';
    out[eye[eye.length - 1]][c] = 'E';
    changed = true;
  }
  return changed ? out.map((r) => r.join('')) : null;
}

const darker = (c, k = 0.35) => mix(c, '#141020', k);
const lighter = (c, k = 0.3) => mix(c, '#ffffff', k);

/**
 * The ramps of a look ({ skin, hairColor, cloth, tunic, trim }) with gear on:
 * chest armour recolours the coat and tunic (heavy armour as metal), gloves
 * the hands, boots the feet, a hood or full helm the hair.
 */
/**
 * The colours of a look ({ skin, hairColor, cloth, tunic, trim }) with gear on:
 * chest armour recolours the coat and tunic, gloves the hands, boots the feet,
 * a hood or full helm the hair. The sculpted figures take these as their slots.
 */
export function lookColors(look, gear = null) {
  const skin = typeof look.skin === 'number' ? SKINS[look.skin] ?? SKINS[1] : look.skin ?? SKINS[1];
  let cloth = look.cloth ?? '#6a5a4a';
  let tunic = look.tunic ?? '#c8b090';
  let trim = look.trim ?? '#e0b040';
  let legs = look.legs ?? '#4a4560';
  let hair = look.hairColor ?? '#4a3020';
  const ch = gear?.chest;
  if (ch) {
    if (ch.weight === 'heavy' || ch.weight === 'medium') {
      cloth = ch.color;
      tunic = lighter(ch.color, ch.weight === 'heavy' ? 0.25 : 0.12);
      legs = darker(ch.color, 0.5);
    } else if (ch.robe) {
      cloth = ch.color;
      tunic = lighter(ch.color, 0.35);
    } else {
      cloth = ch.color;
      tunic = mix(look.tunic ?? '#c8b090', ch.color, 0.35);
    }
    if (ch.glow) trim = RARITIES[ch.rarity].color;
  }
  const natural = look.hairColor ?? hair;
  if (gear?.head?.hidesHair) hair = gear.head.color;
  return { skin, hair, natural, cloth, tunic, trim, legs, apron: look.apron ?? '#7a5a3a', hands: gear?.hands ?? skin, shoes: gear?.feet ?? null, heavy: ch?.weight === 'heavy' };
}

function lookRamps(look, gear = null) {
  const c = lookColors(look, gear);
  const r = {
    H: ramp(c.hair), F: ramp(c.skin), D: ramp(c.natural), R: ramp(mix(c.skin, '#e05a6a', 0.45)), C: ramp(c.cloth), T: ramp(c.tunic), G: ramp(c.trim),
    B: RAMPS.wood, A: ramp(c.apron), J: gear?.hands ? ramp(gear.hands) : ramp(c.skin), L: ramp(c.legs), S: gear?.feet ? ramp(gear.feet) : RAMPS.wood
  };
  if (c.heavy) r.C = ramp(gear.chest.color, { contrast: 0.28 });
  return r;
}

/** What the sculpted rig needs of a person (sculpt/people.js): their look, colours, class and temper. */
function personOf(look, colors, { cls = null, hostile = false, eyeGlow = null, gear = null, extra = null } = {}) {
  return { look, cls, hostile, eyeGlow, gear, extra, palette: [colors.skin, colors.natural ?? colors.hair, colors.cloth, colors.tunic, colors.trim, colors.legs, colors.shoes ?? '#6a4428', colors.hands ?? colors.skin] };
}
const classOfLook = (id) => (/^(blade|warden|seer|ranger)-/.exec(String(id ?? ''))?.[1] ?? null);

const heroCache = new Map();
/** A hero (or any person with a look) in their gear: built once per look and outfit. */
export function heroSprite(look, gear = null) {
  const outfit = gear?.chest?.robe ? 'robe' : look.outfit ?? 'tunic';
  const key = JSON.stringify([look.id ?? look.name, look.hair, look.skin, look.hairColor, look.cloth, outfit, gear?.chest && [gear.chest.color, gear.chest.weight, gear.chest.rarity], gear?.hands, gear?.feet, gear?.head?.hidesHair && gear.head.color]);
  let s = heroCache.get(key);
  if (!s) {
    const rows = personRows({ ...look, outfit });
    s = personSprite(rows, lookRamps(look, gear), { bald: look.hair === 'bald' && !gear?.head?.hidesHair });
    s.depth = 0.3;
    s.person = personOf({ ...look, outfit }, lookColors(look, gear), { cls: classOfLook(look.id) });
    heroCache.set(key, s);
    if (heroCache.size > 60) heroCache.delete(heroCache.keys().next().value);
  }
  return s;
}
export const heroSpriteFor = (lookId, gear) => heroSprite(lookById(lookId) ?? lookById('blade-a'), gear);

/** The camp's first four, hand-drawn, with their own colours. */
const HANDMADE_RAMPS = {
  odile: { H: RAMPS.bone, F: RAMPS.skin, C: ramp('#3b6f6a'), T: RAMPS.wood, G: RAMPS.gold, B: ramp('#6a3a2a'), K: RAMPS.wood, N: RAMPS.steel, L: ramp('#4a4058'), S: RAMPS.wood, R: ramp('#c87a6a') },
  wren: { A: ramp('#6f9a5c'), H: ramp('#7a4a2a'), F: RAMPS.skin, T: ramp('#8f7aa8'), P: RAMPS.bone, G: RAMPS.blood, L: ramp('#5a4a40'), S: RAMPS.wood, R: ramp('#e08a7a') },
  pell: { P: ramp('#8a5a3a'), A: ramp('#a8743e'), H: ramp('#a06a3a'), F: RAMPS.skin, Q: ramp('#6e5a3a'), C: ramp('#b0503c'), T: ramp('#d8c090'), B: RAMPS.wood, G: RAMPS.gold, L: ramp('#4a3a5a'), S: RAMPS.wood },
  tamsin: { H: ramp('#d0603a'), F: RAMPS.skin, G: ramp('#e8c040'), C: ramp('#4e7a9a'), T: ramp('#c0a070'), B: RAMPS.wood, L: ramp('#5a4a3a'), S: RAMPS.wood, R: ramp('#f09080') }
};

/** The camp's first four as sculpted figures (sculpt/people.js): their cut, clothes and colours. */
const HANDMADE_PEOPLE = {
  odile: { look: { hair: 'bun', build: 'slim', sex: 'f', eyes: 'wide', outfit: 'robe' }, colors: { skin: '#f0c8a4', hair: '#e8e0d4', cloth: '#3b6f6a', tunic: '#a8845a', trim: '#e0b040', legs: '#4a4058', shoes: '#6a4428' }, gear: { weapon: { shape: 'staff', color: '#6a4a2a', glow: '#ffd27a' } } },
  wren: { look: { hair: 'long', build: 'slim', sex: 'f', eyes: 'wide', outfit: 'dress' }, colors: { skin: '#f0c8a4', hair: '#7a4a2a', cloth: '#6f9a5c', tunic: '#8f7aa8', trim: '#e8dcc8', legs: '#5a4a40', shoes: '#6a4428' }, extra: { headwear: 'hood' } },
  pell: { look: { hair: 'short', build: 'broad', sex: 'm', eyes: 'wide', beard: 'stubble' }, colors: { skin: '#e6ae86', hair: '#a06a3a', cloth: '#b0503c', tunic: '#d8c090', trim: '#e0b040', legs: '#4a3a5a', shoes: '#6a4428' }, extra: { headwear: 'brim', hat: '#8a5a3a', pack: '#6e5a3a' } },
  tamsin: { look: { hair: 'pigtails', build: 'slim', sex: 'f', eyes: 'wide' }, colors: { skin: '#f0c8a4', hair: '#d0603a', cloth: '#4e7a9a', tunic: '#c0a070', trim: '#e8c040', legs: '#5a4a3a', shoes: '#6a4428' } }
};
/** People-shaped monsters' eyes glow (their sculpted figures). */
const MONSTER_EYES = { rimeguard: '#9ae8ff', acolyte: '#ffb040', matron: '#9ae8ff' };

/** People-shaped monsters: drawn as people in monster colours, wearing monster gear. */
export const MONSTER_PEOPLE = {
  rimeguard: { look: { hair: 'bald', eyes: 'dot', build: 'broad', sex: 'm', skin: '#a8c8e8', hairColor: '#d8f0ff', cloth: '#5a7aa8', tunic: '#b8d8f0', trim: '#9ae8ff', legs: '#3a4a6a' }, gear: { head: { shape: 'full', color: '#9ab8d8', glow: '#9ae8ff' }, weapon: { type: 'axe', shape: 'axe', color: '#c8e8ff', glow: '#9ae8ff' }, offhand: { kind: 'shield', shape: 'tower', color: '#4a6a98' }, chest: { color: '#7a9ac8', weight: 'heavy' } }, scale: 1.15 },
  acolyte: { look: { hair: 'bald', eyes: 'narrow', build: 'slim', sex: 'm', skin: '#8a7a7a', hairColor: '#2a1a1a', cloth: '#7a2a1a', tunic: '#c06030', trim: '#ffb040', outfit: 'robe' }, gear: { head: { shape: 'hood', color: '#6a1a14', hidesHair: true }, weapon: { type: 'staff', shape: 'staff', color: '#3a2a24', glow: '#ff8a3a' } }, scale: 1.05, flat: { ...FLAT, E: '#ffb040' } },
  matron: { look: { hair: 'long', eyes: 'wide', build: 'slim', sex: 'f', skin: '#c8e0f8', hairColor: '#f4fbff', cloth: '#5a8ad0', tunic: '#d8f0ff', trim: '#9ae8ff', outfit: 'dress', legs: '#7aa8e0' }, gear: { head: { shape: 'circlet', color: '#d8f4ff', glow: '#9ae8ff' }, weapon: { type: 'staff', shape: 'staff', color: '#9ad8ff', glow: '#bff4ff' }, cape: { color: '#7ab8f0' } }, scale: 2.3, flat: { ...FLAT, E: '#2a6ab0' } }
};

/* ----------------------------------------------------------- monsters */

const SLIME = [
  ['......GGG.....', '....GGGGGGG...', '...GGGGGGGGG..', '..GGGGGGGGGGG.', '..GGWVGGGWVGG.', '.GGGVVGGGVVGGG', '.GGGGGGGGGGGGG', 'GGGGGGGGGGGGGG', 'GGGGGGGGGGGGGG', '.GGGGGGGGGGGG.'],
  ['..............', '..............', '......GGG.....', '...GGGGGGGGG..', '..GGGGGGGGGGGG', '.GGGWVGGGGWVGG', 'GGGGVVGGGGVVGGG', 'GGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', '.GGGGGGGGGGGGGG.']
];
const WOLF_TOP = [
  '..............A..A...', '.............AA.AA...', '..R.........AAAAAAA..', '.RR..RRRRRRRAAAAOAAA.', '.RAARRAAAAAAAAAAAAAAN',
  '..AAAAAAAAAAAAAAAMMM.', '..AAAAAAAAAAAAAAMM...', '..AAAAAAAAAAAAAAA....', '...AAABBBBBBBAAAA....'
];
const WOLF_LEGS = [
  ['...AAA.......AAA.....', '...AAA.......AAA.....', '...AA........AA......', '..DDD.......DDD......'],
  ['..AAA.........AAA....', '.AAA...........AAA...', 'AA...............AA..', 'DD................DD.'],
  ['....AAA.....AAA......', '....AAA.....AAA......', '.....AA......AA......', '....DDD.....DDD......']
];
const ICEFANG_TOP = ['.....I..I..I..A..A...', '....IIIIIIIII.AA.AA..', '..R.IIIIIIIIIAAAAAAA.', '.RR..RRRRRRRAAAAOAAA.', '.RAARRAAAAAAAAAAAAAAN', ...WOLF_TOP.slice(5)];
const WISP = [
  ['.....P......', '....PP......', '....PPP.....', '...PPPP..P..', '..PPPPPP.P..', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPEPPPPEPP.', '.PPEPPPPEPP.', '.PPPPPPPPPP.', '..PPPPPPPP..', '...PPPPPP...', '....PPPP.P..', '.....PP..P..', '......P.....'],
  ['......P.....', '......PP....', '.....PPP....', '..P..PPPP...', '..P.PPPPPP..', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPEPPPPEPP.', '.PPEPPPPEPP.', '.PPPPPPPPPP.', '..PPPPPPPP..', '...PPPPPP...', '..P.PPPP....', '..P..PP.....', '.....P......']
];
const LAMPWIGHT_TOP = [
  '...........RRRRRR...........', '.........RRRRRRRRRR.........', '........RRRRRRRRRRRR........', '.......RRRRNNNNNNRRRR.......', '.......RRRNQQQQQQNRRR.......',
  '......RRRRNQUUUUQNRRRR......', '......RRRRNQUVVUQNRRRR......', '......RRRRNQUVVUQNRRRR......', '......RRRRNQUUUUQNRRRR......', '......RRRRNQQQQQQNRRRR......',
  '......RRRRRNNNNNNRRRRR......', '.....RRRRRRRRRRRRRRRRRR.....', '....RRRRRRRRRRRRRRRRRRRR....', '...RRRRRRRRRRRRRRRRRRRRRR...', '..RRRRRRRRRRCCCCRRRRRRRRRR..',
  '..RRRRBBRRRRRCCRRRRRRBBRRR..', '.RRRR.BBRRRRRRRRRRRRRBB.RRR.', '.RRR..BBRRRRRRRRRRRRRBB..RR.', '.RR...BBRRRRRRRRRRRRRBB...R.', '......XXRRRRRRRRRRRRRXX.....',
  '.....X.XRRRRRRRRRRRRRX.X....', '........RRRRRRRRRRRRR.......', '........RRRRRRRRRRRRR.......', '.......RRRRRRRRRRRRRRR......', '.......RRRRRRRRRRRRRRR......',
  '......RRRRRRRRRRRRRRRRR.....', '......RRRRRRRRRRRRRRRRR.....', '.....RRRRRRRRRRRRRRRRRRR....', '.....RRRRRRRRRRRRRRRRRRR....'
];
const LAMPWIGHT_HEM = [
  ['....RRRRRRRRRRRRRRRRRRRRR...', '....RR.RRRR.RRRRR.RRRR.RR...', '....R...RR...RRR...RR...R...'],
  ['....RRRRRRRRRRRRRRRRRRRRR...', '...RRR.RRR.RRRRRR.RRR.RRR...', '...R....R...R..RR...R...R...']
];
const THORNLING = [
  ['...K.G..G.K.', '..GGGGGGGGG.', '.GGKGGGGGKGG', 'KGGGGGGGGGGK', '.GGWEGGGWEG.', 'GGGEEGGGEEGG', '.GGGGRRRGGG.', 'KGGGGGGGGGGK', '.GGKGGGGKGG.', '..GGGGGGGG..', '..B..B..B...', '.B...B...B..'],
  ['....G..G....', '.K.GGGGGGG.K', '..GKGGGGGKG.', '.GGGGGGGGGGG', 'KGGWEGGGWEGK', 'GGGEEGGGEEGG', '.GGGGRRRGGG.', '.GGGGGGGGGG.', 'KGGKGGGGKGGK', '..GGGGGGGG..', '...B..B..B..', '..B...B...B.']
];
const MOSSBACK = [
  '....MM........MM....', '...MMMM......MMMM...', '..MMMMMMMMMMMMMMMM..', '.MMGMMMMMMMMMMMMGMM.', '.MMMMSSSSSSSSSSMMMM.', 'MMMMSSWESSSSWESSMMMM', 'MMMSSSEESSSSEESSSMMM',
  'MMMSSSSSSKKSSSSSSMMM', '.MMSSSSKKKKKKSSSSMM.', '.SSSSSSSSSSSSSSSSSS.', 'SSSS.SSSSSSSSSS.SSSS', 'SSS..SSSSSSSSSS..SSS', 'SS...SS......SS...SS', 'BBB..BBB....BBB..BBB'
];
const MOLE = [
  ['....BBBBBB....', '..BBBBBBBBBB..', '.BBBBBBBBBBBB.', 'BBBEBBBBBBEBBB', 'BBBBBPPPPBBBBB', 'BBBBPPNNPPBBBB', '.BBBBPPPPBBBB.', 'BBBBBBBBBBBBBB', 'CCBBBBBBBBBBCC', 'CCCBBBBBBBBCCC', '.C.BBBBBBBB.C.', '...BB....BB...'],
  ['....BBBBBB....', '..BBBBBBBBBB..', '.BBBBBBBBBBBB.', 'BBBEBBBBBBEBBB', 'BBBBBPPPPBBBBB', 'BBBBPPNNPPBBBB', '.BBBBPPPPBBBB.', 'CBBBBBBBBBBBBC', 'CCBBBBBBBBBBCC', '.CCBBBBBBBBCC.', '...BBBBBBBB...', '..BB......BB..']
];
const HORNET = [
  ['..WW......WW..', '.WWWW....WWWW.', '.WWWWW..WWWWW.', '..WWWYYYYWWW..', '....YKKKKY....', '...YYEYYEYY...', '...KKKKKKKK...', '...YYYYYYYY...', '....KKKKKK....', '....YYYYYY....', '.....KKKK.....', '......KK......', '.......K......'],
  ['..............', 'WWW........WWW', 'WWWWW....WWWWW', '.WWWWYYYYWWWW.', '....YKKKKY....', '...YYEYYEYY...', '...KKKKKKKK...', '...YYYYYYYY...', '....KKKKKK....', '....YYYYYY....', '.....KKKK.....', '......KK......', '.......K......']
];
const BOAR_L = [
  ['.......K.K.K.K.K.......', '......KKKKKKKKKKK......', '....BBBBBBBBBBBBBBB....', '...BBBBBBBBBBBBBBBBBB..', '.TBBBBBBBBBBBBBBBBBBBB.', 'TTBEBBBBBBBBBBBBBBBBBBB',
    'PPBBBBBBBBBBBBBBBBBBBB.', 'PPBBBBBBBBBBBBBBBBBBB..', '.WBBBBBBBBBBBBBBBBBB...', '..BBBB.........BBBB....', '..BBB...........BBB....', '..DD............DD.....'],
  ['.......K.K.K.K.K.......', '......KKKKKKKKKKK......', '....BBBBBBBBBBBBBBB....', '...BBBBBBBBBBBBBBBBBB..', '.TBBBBBBBBBBBBBBBBBBBB.', 'TTBEBBBBBBBBBBBBBBBBBBB',
    'PPBBBBBBBBBBBBBBBBBBBB.', 'PPBBBBBBBBBBBBBBBBBBB..', '.WBBBBBBBBBBBBBBBBBB...', '.BBBB...........BBBB...', 'BBB...............BBB..', 'DD.................DD..']
];
const SHROOM = [
  '....RRRRRR....', '..RRWRRRRWRR..', '.RRRRRRWRRRRR.', 'RRWRRRRRRRRWRR', 'RRRRRRWRRRRRRR', '.SSSSSSSSSSSS.', '...FFFFFFFF...', '...FEFFFFEFF..',
  '...FFFFFFFF...', '..GFFFFFFFFG..', '.GG.FFFFFF.GG.', '.G..FFFFFF..G.', '....FFFFFF....', '....FF..FF....', '....FF..FF....', '...BBB..BBB...'
];
const GNARLROOT = [
  '......G...GG....G.G.......', '....GGGG.GGGGG.GGGGGG.....', '...GGGGGGGGGGGGGGGGGGGG...', '..GGGGLGGGGGGGGGLGGGGGGG..', '..GGGGGGGGGGGLGGGGGGGGGG..', '...GGGGGGGGGGGGGGGGGGGG...',
  '....GGGBBBBBBBBBBBBGGG....', '.......BBBBBBBBBBBB.......', '......BBBBBBBBBBBBBB......', '......BBBYYBBBBYYBBB......', '......BBBYYBBBBYYBBB......', '......BBBBBBBBBBBBBB......',
  '......BBBBDDDDDDBBBB......', '.....BBBBBDYDYDDBBBBB.....', '....BBBBBBBBBBBBBBBBBB....', '..BBBB.BBBBBBBBBBBB.BBBB..', '.BBB...BBBBBBBBBBBB...BBB.', 'BBG....BBBBBBBBBBBB....GBB',
  'BG.....BBBBBMBBBBBB.....GB', '.......BBBBBBBBBBBB.......', '.......BBBBBBBBMBBB.......', '......BBBBBBBBBBBBBB......', '......BBBBBBBBBBBBBB......', '.....BBBBB.BBBB.BBBBB.....',
  '....BBBB...BBBB...BBBB....', '...BBBB....BBBB....BBBB...', '..BBB.....BBBBBB.....BBB..', '.BB......BB....BB......BB.'
];
const SHARDLING = [
  ['.....II.....', '....IIII....', '...IIUUII...', '..IIIUUIII..', '..IIIIIIII..', '.IIEIIIIEII.', '.IIIIIIIIII.', 'IIIIIUUIIIII', '.IIIIIIIIII.', '..IIIIIIII..', '.I.IIIIII.I.', 'I...IIII...I', '.....II.....', '....I..I....', '.....II.....', '......I.....'],
  ['.....II.....', '....IIII....', '...IIUUII...', '..IIIUUIII..', '..IIIIIIII..', '.IIEIIIIEII.', '.IIIIIIIIII.', 'IIIIIUUIIIII', '.IIIIIIIIII.', '..IIIIIIII..', 'I..IIIIII..I', '.I..IIII..I.', '.....II.....', '.....II.....', '....I..I....', '.....I......']
];
const FROSTBAT = [
  ['W..............W', 'WW............WW', 'WWW...B..B...WWW', 'WWWW.BBBBBB.WWWW', 'WWWWWBEBBEBWWWWW', '.WWWWBBBBBBWWWW.', '..WWW.BKKB.WWW..', '...W..BBBB..W...', '.......BB.......'],
  ['................', '................', '......B..B......', '.WWW.BBBBBB.WWW.', 'WWWWWBEBBEBWWWWW', 'WWWWWBBBBBBWWWWW', 'WWWW..BKKB..WWWW', 'WW.....BB.....WW', 'W..............W']
];
const CINDERLING = [
  ['....O..O....', '...OOOOOO...', '..OYYOOYYO..', '.OOOOOOOOOO.', 'OOOEEOOEEOOO', '.OOOOOOOOOO.', '..OODDDDOO..', '.OOOOOOOOOO.', 'OO.OOOOOO.OO', 'O..OOOOOO..O', '...OO..OO...', '...DD..DD...'],
  ['.....OO.....', '...O.OO.O...', '..OYYOOYYO..', '.OOOOOOOOOO.', 'OOOEEOOEEOOO', '.OOOOOOOOOO.', '..OODDDDOO..', '.OOOOOOOOOO.', '.OOOOOOOOOO.', 'OO.OOOOOO.OO', '...OO..OO...', '..DD....DD..']
];
const GOLEM = [
  '.......SSSSSSSSSS.......', '.....SSSSLSSSSLSSSS.....', '....SSSSSSSSSSSSSSSS....', '....SSSYYSSSSSSYYSSS....', '....SSSSSSSLLSSSSSSS....', '.....SSSSLLLLLLSSSS.....',
  '...SSSSSSSSSSSSSSSSSS...', '.SSSSSSSSSLLSSSSSSSSSSS.', 'SSSSSSSSSLLLLSSSSSSSSSSS', 'SSSS.SSSSSLLSSSSSS.SSSSS', 'SSS..SSSSSSSSSSSSS..SSSS', 'SSS..SSSLSSSSSLSSS..SSS.',
  'SSS..SSSSSSSSSSSSS..SSS.', 'SLS..SSSSSSSSSSSSS..SLS.', 'SSS...SSSSSSSSSSS...SSS.', '......SSSSSSSSSSS.......', '......SSSS...SSSS.......', '.....SSSSS...SSSSS......',
  '.....SSSS.....SSSS......', '....SSSSS.....SSSSS.....', '....SLSS.......SSLS.....', '...SSSSS.......SSSSS....'
];
const SALAMANDER_L = [
  ['....RRRR................', '..RRRRRRRR...........RR.', '.RRERRRRRRRRRRRRRRRRRRR.', 'RRRRRRRRRRRRRRRRRRRRRR..', 'RRRRRRYYYRRRYYYRRRRRR...', '.KK.RRRRRRRRRRRRRRRR....', '....RR..RR....RR..RR....', '...RR..RR....RR..RR.....', '...CC..CC....CC..CC.....'],
  ['....RRRR................', '..RRRRRRRR..........RR..', '.RRERRRRRRRRRRRRRRRRRR..', 'RRRRRRRRRRRRRRRRRRRRRRR.', 'RRRRRRYYYRRRYYYRRRRRRR..', '.KK.RRRRRRRRRRRRRRRR....', '.....RR..RR....RR..RR...', '.....RR..RR....RR..RR...', '.....CC..CC....CC..CC...']
];
const TYRANT = [
  '....H....................H....', '...HH....................HH...', '..WHH.......HHHHHH.......HHW..', '.WWWH......HRRRRRRH......HWWW.', 'WWWWW.....HRRRRRRRRH.....WWWWW',
  'WWWWWW....RRYRRRRYRR....WWWWWW', 'WWWWWWW...RRYRRRRYRR...WWWWWWW', 'WWWWWWWW..RRRRRRRRRR..WWWWWWWW', '.WWWWWWWW.RRRDDDDRRR.WWWWWWWW.', '..WWWWWWWWRRDKDKDKRRWWWWWWWW..',
  '...WWWWWWWRRRRRRRRRRWWWWWWW...', '....WWWWWRRRRRRRRRRRRWWWWW....', '.....WWWRRRRRBBBBRRRRRWWW.....', '......WRRRRRBBBBBBRRRRRW......', '.......RRRRRBBBBBBRRRRR.......',
  '......RRRRRRBBBBBBRRRRRR......', '.....RRRR.RRBBBBBBRR.RRRR.....', '....RRRR..RRRBBBBRRR..RRRR....', '....CCC...RRRRRRRRRR...CCC....', '..........RRRRRRRRRR..........',
  '.........RRRRR..RRRRR.........', '.........RRRR....RRRR.........', '........RRRR......RRRR........', '........CCC........CCC........'
];

/* --------------------------------------------------------- gatherables */

const HERB = ['.O.....O.', 'OZO...OZO', '.OG.O.GO.', '..G.Z.G..', '.GGOGOGG.', 'GG.GGG.GG', '...GGG...'];
const SUNPETAL = ['..Y.Y.Y..', '.YYYOYYY.', 'YYOOZOOYY', '.YYYOYYY.', '..Y.G.Y..', '....G....', '..GGGGG..', '.G..G..G.'];
const FROSTLILY = ['...U.U...', '..UUVUU..', '.UVVWVVU.', '..UUVUU..', '...UGU...', '....G....', '..G.G.G..', '.GG.G.GG.'];
const EMBERSTONE = ['...OO....', '..OZZO...', '.OZZYZO..', 'OOZYYZOO.', 'SOOZZOOS.', 'SSOOOOSS.', '.SSSSSS..'];

/* --------------------------------------------------------------- build */

/**
 * Every sprite the game draws up front, shaded once. Each sprite is
 * { canvas, white, width, height } (white: the hit-flash silhouette).
 */
export function buildSprites() {
  const npcs = {};
  for (const [id, n] of Object.entries(NPCS)) {
    if (NPC_ROWS_HANDMADE[id]) {
      const sp = personSprite(NPC_ROWS_HANDMADE[id], HANDMADE_RAMPS[id], { hair: id === 'wren' ? 'A' : 'H' });
      const h = HANDMADE_PEOPLE[id];
      if (h) sp.person = personOf(h.look, h.colors, { gear: h.gear ?? null, extra: h.extra ?? null });
      npcs[id] = { front: [sp] };
    }
    else npcs[id] = { front: [heroSprite({ ...n.look, id: `npc-${id}` }, n.look.gear?.chest ? n.look.gear : null)] };
  }
  const violet = ['#1c1430', '#2e2050', '#463478', '#6a52a8', '#9a84d8'];
  const ice = ['#2a5a9a', '#4a8ac8', '#7ab8e8', '#b0e0ff', '#eaffff'];
  const enemies = {
    slime: SLIME.map((rows) => shade(rows, { G: violet }, opts())),
    wolf: WOLF_LEGS.map((legs) => shade([...WOLF_TOP, ...legs], { A: ramp('#5a5a6a'), R: RAMPS.ember, B: RAMPS.bone, M: RAMPS.bone, N: ['#101018', '#181820', '#202028', '#282830', '#303038'], D: ramp('#3a3a48') }, opts({ ...FLAT, O: '#ffb347' }))),
    wisp: WISP.map((rows) => shade(rows, { P: ['#2a7a9a', '#3fb0c8', '#6ad8e0', '#a6f0ec', '#e8fff8'] }, opts({ ...FLAT, E: '#0e2030' }))),
    lampwight: LAMPWIGHT_HEM.map((hem) => shade([...LAMPWIGHT_TOP, ...hem], { R: ['#120c1c', '#1e1430', '#2c2046', '#3e2e5e', '#56447a'], N: RAMPS.steel, Q: ['#1a2a40', '#244060', '#2e5a80', '#4a7aa0', '#7ab0d0'], C: RAMPS.gold, B: RAMPS.bone, X: RAMPS.bone }, opts())),
    thornling: THORNLING.map((rows) => shade(rows, { G: ramp('#4a7a34'), K: RAMPS.bone, B: RAMPS.wood, R: RAMPS.blood }, opts())),
    mossback: [shade(MOSSBACK, { M: ramp('#4a8a4a'), G: ramp('#8ac050'), S: ramp('#6a6a5a'), K: RAMPS.bone, B: ramp('#3a3a34') }, opts())],
    burrowmole: MOLE.map((rows) => shade(rows, { B: ramp('#7a5a44'), P: ramp('#e0a090'), N: ramp('#d06070'), C: RAMPS.bone }, opts())),
    hornet: HORNET.map((rows) => shade(rows, { Y: ramp('#f0c030'), K: ['#140c08', '#1e140c', '#2a1c12', '#3a2a1a', '#4a3a28'] }, opts({ ...FLAT, W: '#dff4ff' }))),
    thornboar: BOAR_L.map((rows) => shade(mirror(rows), { B: ramp('#7a4a34'), K: ramp('#5a8a3a'), T: ramp('#5a3424'), P: ramp('#c08070'), W: RAMPS.bone, D: ramp('#3a2a20') }, opts())),
    shroomkin: [shade(SHROOM, { R: ramp('#d04a3a'), S: ramp('#e8c8a0'), F: ramp('#f0e0c0'), G: ramp('#5aa04a'), B: RAMPS.wood }, opts({ ...FLAT, W: '#fff4e0' }))],
    gnarlroot: [shade(GNARLROOT, { G: ramp('#4a8a3a'), L: ramp('#f0a0c0'), B: ramp('#6a4a32'), D: ramp('#1a1010'), M: ramp('#5a8a4a') }, opts({ ...FLAT, Y: '#ffe060' }))],
    shardling: SHARDLING.map((rows) => shade(rows, { I: ice }, opts({ ...FLAT, U: '#ffffff', E: '#1a3a6a' }))),
    icefang: WOLF_LEGS.map((legs) => shade([...ICEFANG_TOP, ...legs], { A: ramp('#c8d8e8'), I: ice, R: ramp('#9ad0f0'), B: RAMPS.bone, M: RAMPS.bone, N: ramp('#2a3a5a'), D: ramp('#6a7a9a') }, opts({ ...FLAT, O: '#7ae8ff' }))),
    frostbat: FROSTBAT.map((rows) => shade(rows, { W: ramp('#5a8ac0'), B: ramp('#3a4a6a'), K: RAMPS.bone }, opts({ ...FLAT, W: null, E: '#9ae8ff' }))),
    cinderling: CINDERLING.map((rows) => shade(rows, { O: RAMPS.ember, D: ['#140c0c', '#1e1210', '#2a1a14', '#3a2418', '#4a2e1c'] }, opts({ ...FLAT, E: '#fff4a0', Y: '#ffe060' }))),
    golem: [shade(GOLEM, { S: ramp('#3a3438', { contrast: 0.16 }) }, opts({ ...FLAT, L: '#ff8a2a', Y: '#ffe060' }))],
    salamander: SALAMANDER_L.map((rows) => shade(mirror(rows), { R: ramp('#c03a24'), Y: RAMPS.gold, K: RAMPS.blood, C: RAMPS.bone }, opts({ ...FLAT, E: '#ffe060' }))),
    tyrant: [shade(TYRANT, { H: RAMPS.bone, W: ramp('#4a2030'), R: ramp('#5a1e1a'), B: RAMPS.ember, D: ['#0c0606', '#140a08', '#1c0e0a', '#24120c', '#2c160e'], K: RAMPS.bone, C: RAMPS.bone }, opts({ ...FLAT, W: null, Y: '#ffe060' }))]
  };
  // People-shaped monsters: a person figure each, in monster colours.
  for (const [kind, m] of Object.entries(MONSTER_PEOPLE)) {
    const rows = personRows(m.look);
    const sp = personSprite(rows, lookRamps(m.look, m.gear), { bald: m.look.hair === 'bald' && !m.gear.head?.hidesHair, flat: m.flat ?? FLAT });
    sp.person = personOf(m.look, lookColors(m.look, m.gear), { hostile: true, eyeGlow: MONSTER_EYES[kind] ?? '#ff5a3a' });
    enemies[kind] = [sp];
  }
  // How thick each is made (half, in metres), and the ones drawn from the side.
  const depth = { slime: 0.32, wisp: 0.2, lampwight: 0.38, thornling: 0.24, mossback: 0.5, burrowmole: 0.32, hornet: 0.16, shroomkin: 0.28, gnarlroot: 0.6, shardling: 0.22, frostbat: 0.12, cinderling: 0.24, golem: 0.55, tyrant: 0.55, rimeguard: 0.3, acolyte: 0.3, matron: 0.3 };
  for (const [k, frames] of Object.entries(enemies)) for (const f of frames) f.depth = depth[k] ?? 0.25;
  for (const k of ['wolf', 'icefang', 'thornboar', 'salamander']) for (const f of enemies[k]) Object.assign(f, { depth: k === 'thornboar' ? 0.32 : 0.2, profile: true });
  // What glows on each (lit from within: eyes, cores, magma cracks, lanterns), 0…1.
  const glows = {
    slime: { W: 0.5, V: 0.6 }, wolf: { O: 1, R: 0.35 }, wisp: { P: 0.5, E: 0 }, lampwight: { Q: 0.3, U: 0.55, V: 0.75, C: 0.2 }, shroomkin: { W: 0.2 },
    gnarlroot: { Y: 1.1, L: 0.3 }, shardling: { U: 1, I: 0.04 }, icefang: { O: 1, I: 0.06 }, frostbat: { E: 1 }, cinderling: { O: 0.06, E: 1, Y: 0.7, D: 0 },
    golem: { L: 1.3, Y: 1.3 }, salamander: { Y: 0.55, E: 1 }, tyrant: { B: 0.85, Y: 1.3 }, acolyte: { E: 1, W: 0.12 }, matron: { E: 0.7, W: 0.12 }, rimeguard: { W: 0.12 }
  };
  for (const [k, frames] of Object.entries(enemies)) for (const f of frames) if (glows[k]) f.glow = glows[k];
  const gather = {
    herb: shadeSprite(HERB, { G: ramp('#3a6a3a'), O: RAMPS.ember }, opts()),
    sunpetal: shadeSprite(SUNPETAL, { Y: RAMPS.gold, O: RAMPS.ember, G: ramp('#4a8a3a') }, opts()),
    frostlily: shadeSprite(FROSTLILY, { U: ice, V: ramp('#5ab0f0'), G: ramp('#3a6a7a') }, opts()),
    emberstone: shadeSprite(EMBERSTONE, { O: RAMPS.ember, S: ramp('#3a3438') }, opts())
  };
  for (const g of Object.values(gather)) g.depth = 0.06;
  return { npcs, enemies, herb: gather.herb, gather };
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

/* --------------------------------------------------------------- icons */

/** Item icons, 16 × 16: M the item's colour, S steel, G gold, W wood, L a glint, D dark. */
const ICONS = {
  shortsword: ['............LS..', '...........LSS..', '..........LSS...', '.........MSS....', '........MSS.....', '.......MSS......', '......MSS.......', '..G..MSS........', '...GMSS.........', '....GS..........', '...WGG..........', '..WW..G.........', '.WW.............', 'GG..............'],
  longsword: ['.............LS.', '............LSS.', '...........MSS..', '..........MSS...', '.........MSS....', '........MSS.....', '.......MSS......', '......MSS.......', '..G..MSS........', '...GMSS.........', '....GS..........', '...WGG..........', '..WW..G.........', '.WW.............', 'GG..............'],
  dagger: ['................', '................', '................', '..........LS....', '.........MSS....', '........MSS.....', '.......MSS......', '..G...MSS.......', '...G.MSS........', '....GSS.........', '...WGG..........', '..WW..G.........', '.GG.............'],
  axe: ['.........MMM....', '........MMMMM...', '.......MMMLMMM..', '.......MMMMMMM..', '........MMWMM...', '..........W.....', '.........W......', '........W.......', '.......W........', '......W.........', '.....W..........', '....W...........', '...W............', '..WW............'],
  mace: ['..........S.S...', '.........MMMM...', '........SMMLMS..', '.........MMMM...', '........S.WM.S..', '.........W......', '........W.......', '.......W........', '......W.........', '.....W..........', '....W...........', '...WW...........', '..GG............'],
  hammer: ['.......MMMMMM...', '.......MMMLMM...', '.......MMMMMM...', '..........W.....', '.........W......', '........W.......', '.......W........', '......W.........', '.....W..........', '....W...........', '...WW...........', '..GG............'],
  spear: ['.............LS.', '............MSS.', '...........MSS..', '..........GSG...', '.........W......', '........W.......', '.......W........', '......W.........', '.....W..........', '....W...........', '...W............', '..W.............', '.W..............'],
  staff: ['..........LL....', '.........LMML...', '.........MMMM...', '..........MM....', '..........WG....', '.........W......', '........W.......', '.......W........', '......W.........', '.....W..........', '....W...........', '...W............', '..W.............', '.W..............'],
  bow: ['....MM..........', '.....MM....D....', '......MD..D.....', '.......MDD......', '.......DMM......', '......D..M......', '.....D...M......', '....D....M......', '...D.....M......', '..D.....MM......', '.D.....MM.......', '......MM........', '.....MM.........'],
  buckler: ['.....SSSSSS.....', '...SSMMMMMMSS...', '..SMMMMMMMMMMS..', '.SMMMMMMMMMMMMS.', '.SMMMMGGGMMMMMS.', 'SMMMMGGLGGMMMMMS', 'SMMMMGLGGGMMMMMS', 'SMMMMGGGGGMMMMMS', '.SMMMMGGGMMMMMS.', '.SMMMMMMMMMMMMS.', '..SMMMMMMMMMMS..', '...SSMMMMMMSS...', '.....SSSSSS.....'],
  kite: ['..SSSSSSSSSSSS..', '..SMMMMMMMMMMS..', '..SMMMMGGMMMMS..', '..SMMMMGGMMMMS..', '..SMMGGGGGGMMS..', '..SMMMMGGMMMMS..', '..SMMMMGGMMMMS..', '...SMMMGGMMMS...', '...SMMMMMMMMS...', '....SMMMMMMS....', '.....SMMMMS.....', '......SMMS......', '.......SS.......'],
  tower: ['.SSSSSSSSSSSSSS.', '.SMMMMMMMMMMMMS.', '.SMSSSSSSSSSSMS.', '.SMSMMMMMMMMSMS.', '.SMSMMMGGMMMSMS.', '.SMSMMGGGGMMSMS.', '.SMSMMMGGMMMSMS.', '.SMSMMMMMMMMSMS.', '.SMSMMMMMMMMSMS.', '.SMSSSSSSSSSSMS.', '.SMMMMMMMMMMMMS.', '.SSSSSSSSSSSSSS.'],
  tome: ['................', '...DMMMMMMMMMG..', '..DMMMMMMMMMMG..', '..DMMMGGGMMMMG..', '..DMMGMMMGMMMG..', '..DMMGMLMGMMMG..', '..DMMMGGGMMMMG..', '..DMMMMMMMMMMG..', '..DMMMMMMMMMMG..', '..DWWWWWWWWWWG..', '..DDDDDDDDDDDD..'],
  quiver: ['....LL.LL.......', '....SS.SS.SS....', '....WW.WW.SS....', '...MMMMMMMWW....', '...MGMMMMMMM....', '...MMMMMMMMM....', '...MMMMMGMMM....', '...MMMMMMMMM....', '...MGMMMMMMM....', '...MMMMMMMMM....', '....MMMMMMM.....'],
  hood: ['......MMMM......', '....MMMMMMMM....', '...MMMMMMMMMM...', '..MMMMMMMMMMMM..', '..MMMDDDDDDMMM..', '..MMDDDDDDDDMM..', '..MMDDDDDDDDMM..', '..MMMDDDDDDMMM..', '.MMMMMDDDDMMMMM.', 'MMMMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMMM'],
  cap: ['..........LL....', '.........LGG....', '........GG......', '.....MMMGMM.....', '...MMMMMMMMMM...', '..MMMMMMMMMMMM..', '..MMMMMMMMMMMM..', '.WWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWW'],
  wizard: ['.........MMM....', '........MMM.....', '.......MMMM.....', '......MMMMM.....', '......MMMMMM....', '.....MMMMLMM....', '.....MMMMMMMM...', '....MMMMMMMMM...', '....GGGGGGGGGG..', '...MMMMMMMMMMMM.', 'MMMMMMMMMMMMMMMM', '.MMMMMMMMMMMMMM.'],
  circlet: ['................', '................', '.......LL.......', '......GMMG......', '.GGGGGGMMGGGGGG.', 'G..............G', 'G..............G', '.G............G.', '..GGGGGGGGGGGG..'],
  open: ['.....MMMMMM.....', '...MMMMMMMMMM...', '..MMMMLMMMMMMM..', '.MMMMMMMMMMMMMM.', '.MMMMMMMMMMMMMM.', '.GGGGGGGGGGGGGG.', '.MM....MM....MM.', '.MM....MM....MM.', '.MM....MM....MM.', '.MM..........MM.'],
  horned: ['L..............L', 'WL............LW', '.WW..MMMMMM..WW.', '..WWMMMMMMMMWW..', '..MMMMLMMMMMMM..', '.MMMMMMMMMMMMMM.', '.GGGGGGGGGGGGGG.', '.MM....MM....MM.', '.MM....MM....MM.', '.MM..........MM.'],
  full: ['.......GG.......', '.....MMGGMM.....', '...MMMMMMMMMM...', '..MMMMLMMMMMMM..', '..MMMMMMMMMMMM..', '..MMDDDDDDDDMM..', '..MMMMMMMMMMMM..', '..MMMMDMMDMMMM..', '..MMMMDMMDMMMM..', '..MMMMMMMMMMMM..', '...MMMMMMMMMM...'],
  tunic: ['...MMM....MMM...', '..MMMMMMMMMMMM..', '.MMMMMMMMMMMMMM.', 'MMMMMMMMMMMMMMMM', 'MMM.MMMMMMMM.MMM', 'MM..MMMMMMMM..MM', '....MMMMMMMM....', '....WWWGWWWW....', '....MMMMMMMM....', '....MMMMMMMM....', '....MMMMMMMM....'],
  robe: ['...MMM....MMM...', '..MMMMGGGGMMMM..', '.MMMMMMGGMMMMMM.', 'MMMMMMMGGMMMMMMM', 'MMM.MMMGGMMM.MMM', 'MM..MMMGGMMM..MM', '....MMMGGMMM....', '...MMMMGGMMMM...', '...MMMMGGMMMM...', '..MMMMMGGMMMMM..', '..MMMMMMMMMMMM..', '.MMMMMMMMMMMMMM.'],
  jerkin: ['...MMM....MMM...', '..MMMMWWWWMMMM..', '.MMMMMMWWMMMMMM.', 'MMMMMMMWWMMMMMMM', 'MMM.MMMWWMMM.MMM', 'MM..MMMGWMMM..MM', '....MMMWWMMM....', '....DDDGDDDD....', '....MMMMMMMM....', '....MMMMMMMM....'],
  mail: ['...MMM....MMM...', '..MLMMMMMMMMLM..', '.MMMMMMMMMMMMMM.', 'MMMLMMMMMMMMLMMM', 'MMM.MMLMMLMM.MMM', 'MM..MMMMMMMM..MM', '....MLMMMMLM....', '....WWWGWWWW....', '....MMMMMMMM....', '....MLMMMMLM....'],
  plate: ['.MMMMM....MMMMM.', 'MMMLMMMMMMMMLMMM', 'MMMMMMGGGGMMMMMM', '.MMMMMMGGMMMMMM.', '.MM.MMMMMMMM.MM.', '.MM.MMLMMLMM.MM.', '....MMMMMMMM....', '....GGGGGGGG....', '....MMMMMMMM....', '....MM.MM.MM....'],
  gloves: ['................', '..M.M.M.........', '..M.M.M.M.......', '..MMMMMMM.......', '..MMMMMMM.M.....', '..MMMMMMMMM.....', '..MMMMMMMM......', '...MMMMMM.......', '...GGGGGG.......', '...WWWWWW.......'],
  gauntlets: ['..S.S.S.........', '..M.M.M.M.......', '..MSMSMSM.......', '..MMMMMMM.S.....', '..MMLMMMMMM.....', '..MMMMMMMM......', '...MMMMMM.......', '..GGGGGGGG......', '..MMMMMMMM......', '..MMMMMMMM......'],
  boots: ['................', '...MMMM.........', '...MMMM.........', '...MMMM.........', '...MMMM.........', '...GGGG.........', '...MMMM.........', '...MMMMMM.......', '..MMMMMMMMM.....', '..DDDDDDDDD.....'],
  greaves: ['...SSSS.........', '...MMMM.........', '...MLMM.........', '...MMMM.........', '..GGGGGG........', '...MMMM.........', '...MMMMMM.......', '..MMMMMMMMM.....', '..SSSSSSSSS.....'],
  ring: ['................', '................', '.......LL.......', '......MMMM......', '.......MM.......', '.....GG..GG.....', '....G......G....', '....G......G....', '....G......G....', '.....GG..GG.....', '.......GG.......'],
  amulet: ['...G........G...', '....G......G....', '.....G....G.....', '......G..G......', '.......GG.......', '......GGGG......', '.....GMMMMG.....', '.....GMLMMG.....', '.....GMMMMG.....', '......GMMG......', '.......GG.......'],
  potion: ['......WWWW......', '......DDDD......', '.......LL.......', '.......MM.......', '.....MMMMMM.....', '....MMMMMMMM....', '...MMLMMMMMMM...', '...MMMMMMMMMM...', '...MMMMMMMMMM...', '....MMMMMMMM....', '.....MMMMMM.....'],
  bread: ['................', '................', '.....MMMMMM.....', '...MMMLMMMMMM...', '..MMMMMMMMMMMM..', '.MMWMMWMMWMMMMM.', '.MMMMMMMMMMMMMM.', '.MMMMMMMMMMMMMM.', '..DDDDDDDDDDDD..'],
  stew: ['.......L..L.....', '......L..L......', '.......L..L.....', '..SSSSSSSSSSSS..', '..SMMMMMMMMMMS..', '..SMMWMMMLMMMS..', '...SMMMMMMMMS...', '...SSSSSSSSSS...', '....SSSSSSSS....'],
  scroll: ['................', '..WWWWWWWWWWWW..', '.WMMMMMMMMMMMMW.', '..MMMMMMMMMMMM..', '..MDDDDDDDDMMM..', '..MMMMMMMMMMMM..', '..MDDDDDDMMMMM..', '..MMMMMMMMMMMM..', '..MDDDDDDDDDMM..', '.WMMMMMMMMMMMMW.', '..WWWWWWWWWWWW..']
};
const ICON_OF_BASE = { shortsword: 'shortsword', longsword: 'longsword', dagger: 'dagger', axe: 'axe', mace: 'mace', hammer: 'hammer', spear: 'spear', staff: 'staff', bow: 'bow', buckler: 'buckler', kite: 'kite', tower: 'tower', tome: 'tome', quiver: 'quiver', hood: 'hood', cap: 'cap', wizard: 'wizard', circlet: 'circlet', openhelm: 'open', hornhelm: 'horned', greathelm: 'full', tunic: 'tunic', robe: 'robe', jerkin: 'jerkin', mail: 'mail', plate: 'plate', gloves: 'gloves', gauntlets: 'gauntlets', boots: 'boots', greaves: 'greaves', ring: 'ring', amulet: 'amulet' };

const iconCache = new Map();
/**
 * A pixel icon for a bag entry (an item in its own colour, a glint for rare
 * and better; a consumable in its colour), as a canvas (cached).
 */
export function iconCanvas(entry) {
  const isItem = Boolean(entry?.base);
  const kind = isItem ? ICON_OF_BASE[entry.base] : CONSUMABLES[entry?.kind]?.icon ?? 'potion';
  const color = isItem ? entry.color : CONSUMABLES[entry?.kind]?.color ?? '#ff5a6a';
  const key = `${kind}|${color}|${entry?.rarity ?? ''}`;
  let c = iconCache.get(key);
  if (c) return c;
  const glint = isItem && RARITIES[entry.rarity]?.glow;
  const metal = BASES[entry?.base]?.slot === 'weapon' && !['staff', 'bow'].includes(entry.base);
  const ramps = {
    M: ramp(color), S: RAMPS.steel, G: glint ? ramp(RARITIES[entry.rarity].color) : RAMPS.gold, W: ramp('#b88050'), D: ['#140c18', '#1e1424', '#2a1c30', '#36243c', '#422c48'],
    L: glint ? ramp(lighter(RARITIES[entry.rarity].color, 0.4)) : metal ? RAMPS.steel : ramp(lighter(color, 0.5))
  };
  c = shadeSprite(ICONS[kind] ?? ICONS.potion, ramps, { scale: 2 }).canvas;
  iconCache.set(key, c);
  return c;
}

/** Skill icons, 12 × 12, each in its own colours. */
const SKILL_ICONS = {
  lunge: [['............', '.........SS.', '........SLS.', '.......SLS..', '..YY..SLS...', '.YY..SLS....', 'YY..SLS.....', '.YY.GS......', '..YYW.......', '...W.G......', '..W.........', '.W..........'], { S: RAMPS.steel, L: RAMPS.ice, Y: RAMPS.gold, G: RAMPS.gold, W: RAMPS.wood }],
  whirl: [['....SSSS....', '..SS....SS..', '.S..LLLL..S.', 'S..L....L..S', 'S.L..SS..L.S', 'S.L.S..S.L.S', 'S.L.S....L.S', 'S..L.S..L..S', '.S..LLLL..S.', '..SS....SS..', '....SSSS..S.', '.........SSS'], { S: RAMPS.ice, L: RAMPS.steel }],
  cleave: [['......OOOO..', '....OOYYOOO.', '...OYY..YO..', '..OY......O.', '.OY...SS....', '.O...SLS....', 'O...SLS.....', 'O..SLS......', '..GSS.......', '.GWG........', '.W..........', 'W...........'], { O: RAMPS.ember, Y: RAMPS.gold, S: RAMPS.steel, L: RAMPS.bone, G: RAMPS.gold, W: RAMPS.wood }],
  fire: [['.....O......', '....OO......', '....OOO..O..', '...OOYOO.O..', '..OOYYYOOO..', '..OYYWYYOO..', '.OOYWWWYOO..', '.OYYWWWYYO..', '.OOYYWYYOO..', '..OOYYYOO...', '...OOOOO....', '............'], { O: RAMPS.ember, Y: RAMPS.gold, W: RAMPS.bone }],
  bash: [['............', '..SSSSSSSS..', '..SMMMMMMS..', '..SMMGGMMS..', '..SMGGGGMS..', '..SMMGGMMS..', '...SMMMMS...', '....SMMS....', 'Y....SS....Y', '.Y........Y.', 'Y.Y......Y.Y', '............'], { S: RAMPS.steel, M: ramp('#3a5a9a'), G: RAMPS.gold, Y: RAMPS.gold }],
  guard: [['.....YY.....', '...YYYYYY...', '..Y.SSSS.Y..', '.Y.SMMMMS.Y.', 'Y.SMMGGMMS.Y', 'Y.SMGGGGMS.Y', 'Y.SMMGGMMS.Y', '.Y.SMMMMS.Y.', '..Y.SMMS.Y..', '...Y.SS.Y...', '....YYYY....', '............'], { S: RAMPS.steel, M: ramp('#3a5a9a'), G: RAMPS.gold, Y: ramp('#ffe9a0') }],
  totem: [['....GGGG....', '...GLGGLG...', '....GGGG....', '....WWWW....', '...WYWWYW...', '....WWWW....', '....WDDW....', '....WWWW....', '.G..WWWW..G.', 'GLG.WWWW.GLG', '.G.WWWWWW.G.', '..WWWWWWWW..'], { G: RAMPS.poison, L: ramp('#ffe0f0'), W: RAMPS.wood, Y: RAMPS.gold, D: ramp('#2a1a14') }],
  quake: [['.....SS.....', '....SMMS....', '....SMMS....', '.....WW.....', '.....WW.....', '.....WW.....', '..R..WW..R..', '.R.R.WW.R.R.', 'BBBBRBBRBBBB', 'BBRBBBBBBRBB', 'BRBBBRRBBBRB', 'BBBBBBBBBBBB'], { S: RAMPS.steel, M: RAMPS.steel, W: RAMPS.wood, R: RAMPS.ember, B: ramp('#6a5040') }],
  nova: [['.....U......', '..U..U..U...', '...U.U.U....', '....UUU.....', 'UUUUUWUUUUU.', '....UUU.....', '...U.U.U....', '..U..U..U...', '.....U......', '............', '............', '............'], { U: RAMPS.ice, W: RAMPS.bone }],
  blink: [['....PPPP....', '..PP....PP..', '.P..VVVV..P.', 'P..V....V..P', 'P.V..WW..V.P', 'P.V.W..W.V.P', 'P.V.W..W.V.P', 'P.V..WW..V.P', 'P..V....V..P', '.P..VVVV..P.', '..PP....PP..', '....PPPP....'], { P: RAMPS.violet, V: ramp('#c890ff'), W: RAMPS.bone }],
  lance: [['..........UW', '.........UUU', '........UUU.', '.......UUU..', '......UUU...', '.....UUU....', '....UUU.....', '...UUU......', '..UUU.......', '.UUU........', 'UU..........', 'U...........'], { U: RAMPS.ice, W: RAMPS.bone }],
  blizzard: [['..CCCCCCCC..', '.CCCCCCCCCC.', 'CCCCCCCCCCCC', '.CCCCCCCCCC.', '...U..U..U..', '..U..U..U...', '...U..U..U..', '..U..U..U...', '.U..U..U..U.', '..U..U..U...', '...U..U..U..', '............'], { C: ramp('#8aa0c0'), U: RAMPS.ice }],
  volley: [['.........SS.', '.......SS...', '.....SS.....', '..WWWWWWWWSS', '.....SS.....', '.......SS...', '.........SS.', '............', '..WWWWWWWWSS', '............', '..WWWWWWWWSS', '............'], { S: RAMPS.steel, W: RAMPS.wood }],
  trap: [['............', '............', '..S.S..S.S..', '..SSS..SSS..', '.SSSSSSSSSS.', 'SS.SSSSSS.SS', 'S..SS..SS..S', 'S..SS..SS..S', '.GGGGGGGGGG.', 'GG.G.GG.G.GG', '.G..G..G..G.', '............'], { S: RAMPS.steel, G: RAMPS.poison }],
  rollshot: [['..YYYY......', '.Y....Y.....', 'Y......Y....', 'Y...........', 'Y.......WWWS', '.Y......WWSS', '..YYY.......', '............', '..WWWWWWWSS.', '........SS..', '.......S....', '............'], { Y: RAMPS.gold, W: RAMPS.wood, S: RAMPS.steel }],
  rain: [['..C.C..C.C..', '.CCCCCCCCCC.', '............', '.S..S..S..S.', '.W..W..W..W.', '.W..W..W..W.', '..S..S..S...', '..W..W..W...', '..W..W..W...', '............', 'BBBBBBBBBBBB', '............'], { C: ramp('#8aa0c0'), S: RAMPS.steel, W: RAMPS.wood, B: ramp('#6a5040') }],
  potionHp: [['....WWWW....', '....DDDD....', '.....MM.....', '...MMMMMM...', '..MMMMMMMM..', '.MMLMMMMMMM.', '.MMMMMMMMMM.', '.MMMMMMMMMM.', '..MMMMMMMM..', '...MMMMMM...', '............', '............'], { M: ramp('#ff5a6a'), W: RAMPS.bone, D: RAMPS.wood, L: RAMPS.bone }],
  potionMp: [['....WWWW....', '....DDDD....', '.....MM.....', '...MMMMMM...', '..MMMMMMMM..', '.MMLMMMMMMM.', '.MMMMMMMMMM.', '.MMMMMMMMMM.', '..MMMMMMMM..', '...MMMMMM...', '............', '............'], { M: ramp('#5a8aff'), W: RAMPS.bone, D: RAMPS.wood, L: RAMPS.bone }],
  food: [['............', '............', '....MMMMM...', '..MMMLMMMMM.', '.MMMMMMMMMMM', 'MMWMMWMMWMMM', 'MMMMMMMMMMMM', 'MMMMMMMMMMMM', '.DDDDDDDDDD.', '............', '............', '............'], { M: ramp('#d8a050'), W: ramp('#f0d8a0'), L: RAMPS.bone, D: RAMPS.wood }]
};
const skillCache = new Map();
/** A pixel icon for a skill (or 'potionHp', 'potionMp', 'food'), as a canvas. */
export function skillIcon(id) {
  let c = skillCache.get(id);
  if (c) return c;
  const [rows, ramps] = SKILL_ICONS[id] ?? SKILL_ICONS.fire;
  c = shadeSprite(rows, ramps, { scale: 4 }).canvas;
  skillCache.set(id, c);
  return c;
}

/** A canvas as an image URL (for <img> in the HTML panels), cached. */
const urlCache = new WeakMap();
export function canvasUrl(c) {
  let u = urlCache.get(c);
  if (!u) {
    if (c.convertToBlob && !c.toDataURL) {
      const d = document.createElement('canvas');
      d.width = c.width;
      d.height = c.height;
      d.getContext('2d').drawImage(c, 0, 0);
      u = d.toDataURL();
    } else u = c.toDataURL();
    urlCache.set(c, u);
  }
  return u;
}
