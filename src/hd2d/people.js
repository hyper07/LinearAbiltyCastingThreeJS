/**
 * Lanternwood's people as letter maps — pure (no canvas), so tests can check
 * them. A person is 16 letters wide and 19 tall, in the shape the rig cuts
 * into parts (voxel.js `voxelParts`): rows 0–9 the head, 10–15 the body with
 * the arms in the outer three columns, 16–18 the legs.
 *
 * personRows({ hair, eyes, beard, build, sex, outfit }) composes one from a
 * hair cut, a face, a build and an outfit. The letters (sprites.js gives each
 * a colour ramp): H hair · F skin · W/E eyes · R blush · D beard · C outer
 * cloth (sleeves, coat) · T tunic · G trim · B belt · A apron · J hands
 * (gloves) · L legs · S shoes.
 */

/** Hair cuts: the ten head rows, H for hair, F for face. */
export const HAIR = {
  short: [
    '......HHHH......', '....HHHHHHHH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHFFFFHHHH..',
    '..HHHFFFFFFHHH..', '..HFFFFFFFFFFH..', '..HFFFFFFFFFFH..', '...FFFFFFFFFF...', '....FFFFFFFF....'
  ],
  long: [
    '......HHHH......', '....HHHHHHHH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHFFFFFFHHH..',
    '.HHHFFFFFFFFHHH.', '.HHFFFFFFFFFFHH.', '.HHFFFFFFFFFFHH.', '.HHHFFFFFFFFHHH.', '.HHH.FFFFFF.HHH.'
  ],
  bun: [
    '......HHH.......', '.....HHHHH......', '....HHHHHHHH....', '..HHHHHHHHHHHH..', '..HHHFFFFFFHHH..',
    '..HHFFFFFFFFHH..', '..HFFFFFFFFFFH..', '..HFFFFFFFFFFH..', '...FFFFFFFFFF...', '....FFFFFFFF....'
  ],
  spiky: [
    '..H...H..H...H..', '..HH.HHHHHH.HH..', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHFFHFFHFFHH..',
    '..HFFFFFFFFFFH..', '..HFFFFFFFFFFH..', '..HFFFFFFFFFFH..', '...FFFFFFFFFF...', '....FFFFFFFF....'
  ],
  ponytail: [
    '......HHHH......', '....HHHHHHHH....', '...HHHHHHHHHHH..', '..HHHHHHHHHHHHH.', '..HHHHFFFFHHHHH.',
    '..HHFFFFFFFFHHH.', '..HFFFFFFFFFFHH.', '..HFFFFFFFFFFHH.', '...FFFFFFFFFF.HH', '....FFFFFFFF..H.'
  ],
  bob: [
    '.....HHHHHH.....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..',
    '..HHFFFFFFFFHH..', '..HHFFFFFFFFHH..', '..HHFFFFFFFFHH..', '..HHHFFFFFFHHH..', '....FFFFFFFF....'
  ],
  bald: [
    '................', '......FFFF......', '....FFFFFFFF....', '...FFFFFFFFFF...', '..FFFFFFFFFFFF..',
    '..FFFFFFFFFFFF..', '.FFFFFFFFFFFFFF.', '..FFFFFFFFFFFF..', '...FFFFFFFFFF...', '....FFFFFFFF....'
  ],
  curly: [
    '....HH.HH.HH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHHFFFFFFHHHH.',
    '.HHHFFFFFFFFHHH.', '..HFFFFFFFFFFH..', '..HFFFFFFFFFFH..', '...FFFFFFFFFF...', '....FFFFFFFF....'
  ]
};

/** Bodies: rows 10–15, by build. Arms in columns 0–2 and 13–15, hands (J) at their ends. */
const BODY = {
  broad: ['...CCGTTTTGCC...', '..CCCCTTTTCCCC..', '.CCCCTTTTTTCCCC.', '.CCCCTTTTTTCCCC.', '.CC.BBBGBBBB.CC.', '.JJ.TTTTTTTT.JJ.'],
  slim: ['....CCTTTTCC....', '...CCCTTTTCCC...', '.CC.CTTTTTTC.CC.', '.CC.CTTTTTTC.CC.', '.CC..BBGBBB..CC.', '.JJ..TTTTTT..JJ.']
};
/** Outfits change the middle of the body (an apron) or the legs (a robe or dress to the ankles). */
const LEGS = {
  plain: ['....LLL..LLL....', '....LLL..LLL....', '...SSSS..SSSS...'],
  robe: ['....CCC..CCC....', '....CCC..CCC....', '...SSSS..SSSS...'],
  dress: ['...TTTT..TTTT...', '....LLL..LLL....', '...SSSS..SSSS...']
};

/**
 * A person's letter map (19 rows of 16) from a look: hair, eyes ('wide',
 * 'narrow', 'dot'), beard (none, 'beard', 'stubble', 'moustache'), build
 * ('slim', 'broad'), sex ('f' gets a touch of blush), outfit ('tunic',
 * 'robe', 'dress', 'apron').
 */
export function personRows({ hair = 'short', eyes = 'wide', beard = null, build = 'broad', sex = 'm', outfit = 'tunic' } = {}) {
  const head = (HAIR[hair] ?? HAIR.short).map((r) => r.split(''));
  const setF = (y, x, ch) => {
    if (head[y][x] === 'F') head[y][x] = ch;
  };
  if (eyes === 'wide') {
    for (const x of [5, 9]) setF(6, x, 'W');
    for (const x of [6, 10]) setF(6, x, 'E');
    for (const x of [5, 6, 9, 10]) setF(7, x, 'E');
  } else if (eyes === 'narrow') {
    for (const x of [5, 6, 9, 10]) setF(7, x, 'E');
  } else {
    for (const x of [6, 9]) {
      setF(6, x, 'E');
      setF(7, x, 'E');
    }
  }
  if (sex === 'f') for (const x of [4, 11]) setF(8, x, 'R');
  if (beard === 'beard') {
    for (let x = 3; x <= 12; x++) setF(9, x, 'D');
    for (const x of [3, 4, 5, 10, 11, 12]) setF(8, x, 'D');
    for (const x of [2, 13]) setF(7, x, 'D');
  } else if (beard === 'stubble') {
    for (let x = 4; x <= 11; x++) setF(9, x, 'D');
  } else if (beard === 'moustache') {
    for (const x of [6, 7, 8, 9]) setF(8, x, 'D');
  }
  const body = (BODY[build] ?? BODY.broad).map((r) => r.split(''));
  if (outfit === 'apron') {
    for (let y = 2; y < 6; y++) for (let x = 5; x <= 10; x++) if (body[y][x] === 'T' || body[y][x] === 'B' || body[y][x] === 'G') body[y][x] = 'A';
    body[1][6] = body[1][9] = 'A';
  }
  if (outfit === 'robe') for (let y = 4; y < 6; y++) for (let x = 3; x <= 12; x++) if (body[y][x] === 'T') body[y][x] = 'C';
  const legs = LEGS[outfit === 'robe' ? 'robe' : outfit === 'dress' ? 'dress' : 'plain'];
  return [...head.map((r) => r.join('')), ...body.map((r) => r.join('')), ...legs];
}

/** The camp's first four people, drawn by hand (their legs added). */
const STAND = LEGS.plain;
export const NPC_ROWS_HANDMADE = {
  odile: [
    '.NNN..HHHH......', '.NYN.HHHHHH.....', '.NNNHHHHHHHH....', '..KHHHHHHHHHH...', '..KHHFFFFFFHH...', '..KHFFFFFFFFH...', '..KHFWEFFWEFH...', '..KHFEEFFEEFH...',
    '..K.FFFFFFFF....', '..K..FFRRFF.....', '..KCCCGTTGCCC...', '.CKCCCCTTCCCCC..', '.CFCCCCTTCCCCCC.', '.CKCCCCTTCCCCFC.', '.CKCBBBBBBBBCCC.', '.CKCCCCCCCCCCCC.', ...STAND
  ],
  wren: [
    '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '..AAAHHHHHHAAA..', '..AAHHFFFFHHAA..', '..AAHFFFFFFHAA..', '..AAFWEFFWEFAA..', '..AAFEEFFEEFAA..',
    '..AAAFFRRFFAAA..', '...AAAFFFFAAA...', '...TTTTTTTTTT...', '..TTTPPPPPPTTT..', '.TTTPPPPPPPPTTT.', '.TFTPPPPPPPPTFT.', '.TT.BBBBBGBB.TT.', '.TT.TPPPPPPT.TT.', ...STAND
  ],
  pell: [
    '................', '.....PPPPPP.....', '....PPPPPPPP....', '..AAAAAAAAAAAA..', '.AAAAAAAAAAAAAA.', '...HFFFFFFFFH...', '..QHFWEFFWEFHQ..', '..QHFEEFFEEFHQ..',
    '..QQFFFFFFFFQQ..', '..QQQHHHHHHQQQ..', '.QQCCCHHHHCCCQQ.', '.QQCCCCTTCCCCQQ.', '.QCCCCCTTCCCCCQ.', '.QFCCCCTTCCCCFQ.', '.QQCBBBGGBBBCQQ.', '..QCCCCCCCCCCQ..', ...STAND
  ],
  tamsin: [
    '................', '................', '.HH...HHHH...HH.', '.HHH.HHHHHH.HHH.', '.HHHHHHHHHHHHHH.', '..HHHFFFFFFHHH..', '..HHFWEFFWEFHH..', '...HFEEFFEEFH...',
    '...HFFRFFRFFH...', '....FFFFFFFF....', '....GGGGGGGG....', '...CCGGTTCCCC...', '..CCCCTTTTCCCC..', '..CFCCTTTTCCFC..', '...CCBBBBBBCC...', '...CCTTTTTTCC...', ...STAND
  ]
};

/** The walk frames' legs (front view): idle, step A, step B — the rig walks the idle one. */
export const LEG_FRAMES = [STAND];
