/**
 * Race courses on Seoul's real roads. A course is planned, not drawn: four
 * points are set round a famous place, each is moved onto the nearest big
 * road, and the course goes from each to the next by the best way on the
 * road network — big roads preferred, no street used twice — closing into a
 * loop. The same roads always give the same course, so everyone in a race
 * plans the same one without it being sent.
 *
 * A road here is { pts: Float32Array [x0, z0, x1, z1, …], width, cls } in
 * world metres (x east, z south), as SeoulGame reads them from roads.bin.
 */

/**
 * The bike courses, by level (LEVELS below). Easy: loops of 2–3 km (two to three minutes a lap) on
 * Seoul's boulevards and avenues — two or more lanes each way, long straights and sweeping bends,
 * few hard corners, a long run from the start. Medium: narrower avenues and a little of the
 * residential lanes, 6–10 hard corners, a hill, a short cut or two. Hard: tight two-lane streets
 * and residential lanes, square corners to drift, hills, golmok short cuts. Each with a character
 * of its own: an island in the river, palace avenues, a market, a hill road with a view, the
 * towers of Gangnam, print shops, ironworks, a fairground, the run down from Namsan Tower. The
 * golmok (alleys.bin, scripts/geo/seoul-alleys.mjs) are the short cuts. Centres are world metres
 * from City Hall; `r` is how far out the loop is drawn; `kind` is what the map picker calls it.
 * A course with `via` goes through those points in order (planViaCourse); with `open` it runs from
 * the first to the last — a point-to-point race, its finish line below its start.
 */
export const BIKE_COURSES = [
  { id: 'gwanghwamun', level: 'easy', name: 'Gwanghwamun Avenues', ko: '광화문', x: 159, z: -818, r: 350, kind: 'Avenue', text: 'Ten lanes past the palace gate and the glass towers of Jongno, under the mountains.' },
  { id: 'dongdaemun', level: 'easy', name: 'Dongdaemun Market', ko: '동대문', x: 2263, z: 475, r: 350, kind: 'Market', text: 'Round the old East Gate and the night markets, buses and delivery scooters everywhere.' },
  { id: 'namsan', level: 'easy', name: 'Namsan Hill Road', ko: '남산 소월로', x: 350, z: 1650, r: 350, kind: 'Hill', text: 'Sowol-ro winds along the side of Namsan under the tower, the city spread out below.' },
  { id: 'hongdae', level: 'easy', name: 'Hongdae Boulevards', ko: '홍대', x: -4801, z: 1355, r: 450, kind: 'Avenue', text: 'Wide roads round the university quarter, buskers and cafes, and a golmok short cut through it.' },
  { id: 'yeouido', level: 'easy', name: 'Yeouido Riverside', ko: '여의도', x: -4400, z: 4300, r: 350, kind: 'River', text: 'The island in the Han: long straight boulevards between the river parks and the finance towers.' },
  { id: 'cheongnyangni', level: 'easy', name: 'Cheongnyangni Market', ko: '청량리', x: 5675, z: -1807, r: 350, kind: 'Market', text: 'Past the fruit and herb stalls of Gyeongdong Market and the station: long straights, two big corners.' },
  { id: 'teheran', level: 'easy', name: 'Teheran-ro Towers', ko: '테헤란로', x: 7150, z: 6300, r: 350, kind: 'Towers', text: 'Between the office towers of Gangnam: eight lanes, four big corners.' },
  { id: 'jamsil', level: 'easy', name: 'Jamsil Tower Loop', ko: '잠실', x: 11000, z: 5650, r: 350, kind: 'Towers', text: 'Under the tallest tower in Korea — the shortest, fastest loop.' },
  { id: 'seochon', level: 'medium', name: 'Seochon Palace Lanes', ko: '서촌', x: -656, z: -1468, r: 320, kind: 'Hanok', text: 'West of Gyeongbokgung under Inwangsan: avenues and hanok lanes, a climb, square corners and two golmok short cuts.' },
  { id: 'seongsu', level: 'medium', name: 'Seongsu Brick Works', ko: '성수', x: 6700, z: 2300, r: 280, kind: 'Factory', text: 'Red-brick factories turned cafés and workshops: a grid of square corners, delivery trucks and lanes.' },
  {
    id: 'jamsilpark', level: 'medium', name: 'Jamsil Fairground', ko: '잠실 놀이공원', x: 11200, z: 6000, r: 350, kind: 'Fairground',
    text: 'Round Seokchon Lake under the tallest tower in Korea, past a fairground of our own: a wooden coaster, a drop tower, a big wheel, a carousel and a pirate ship.',
    via: [[10800, 5890], [11120, 6380], [11480, 6050], [11425, 5790], [11575, 5745], [11560, 5625]],
    // the fairground: on the lake side of Seokchonhosu-ro (left of the way the course runs there)
    fair: { at: [11300, 6215], side: -1 }
  },
  { id: 'euljiro', level: 'hard', name: 'Euljiro Print Alleys', ko: '을지로', x: 1287, z: -25, r: 330, kind: 'Alleys', text: 'Print shops and tool stalls on tight two-lane streets: square corner after square corner — drift them.' },
  { id: 'mullae', level: 'hard', name: 'Mullae Ironworks', ko: '문래', x: -7377, z: 5575, r: 330, kind: 'Workshops', text: 'Metal workshops and rolling shutters: narrow lanes, parked trucks, sparks of welding and a golmok short cut.' },
  { id: 'haebangchon', level: 'hard', name: 'Haebangchon Hill Lanes', ko: '해방촌', x: 801, z: 2417, r: 320, kind: 'Hill', text: 'Steep lanes under Namsan: up and over the hill, tight corners at the top, and down again.' },
  {
    id: 'namsandown', level: 'hard', name: 'Namsan Tower Downhill', ko: '남산 다운힐', x: 600, z: 1500, r: 400, kind: 'Downhill',
    text: 'From the plaza under Namsan Tower down Namsan\'s winding park road and Sowol-ro to the city below — one way, all downhill: brake before the bends.',
    via: [[1150, 1689], [894, 1787], [762, 1950], [592, 1709], [371, 1554], [169, 1332], [269, 1237], [-85, 1146]],
    // (the park road meets Sowol-ro a few metres short of it, and Sowol-ro's northbound carriageway has a gap in the map)
    links: [[[370.8, 1553.9], [359.1, 1561.0]], [[168.6, 1332.3], [207.6, 1296.0]]],
    open: true, small: true, minWidth: 7, mountain: true
  },
  // The zig-zags (`zigzag`): through the local streets round a landmark — secondary, tertiary and
  // residential roads one lane each way or one-way, never narrower than ZIG_MIN_WIDTH (the golmok are the
  // short cuts), the big straight arterials only to cross or for a short link — corner after corner, left
  // and right in turn, through points of their own.
  {
    id: 'heritage', level: 'medium', name: 'Gwanghwamun Heritage Run', ko: '광화문 역사 코스', x: -200, z: -350, r: 400, kind: 'Palace', zigzag: true,
    text: 'Round the heart of old Seoul: down Sejong-daero past the square, the Sejong Center and Cheonggye Plaza to Seoul Plaza, along Deoksugung\'s stone-wall road and up through Jeongdong, back by Saemunan-ro and round in front of the Gwanghwamun gate.',
    // (drawn along the big roads where the run goes; with the traffic: down the square's west side, up its east)
    // (its stone-wall road is narrower than a zig-zag's lanes, and kept for being what it is: `minRoad`)
    roads: 'avenues', beside: 0.5, max: 4000, startAt: [-77, -880], minRoad: 4,
    via: [[-60, -850], [-77, -700], [-77, -150], [-210, 157], [-395, 0], [-330, -260], [-310, -400], [-200, -428], [-60, -600]]
  },
  {
    id: 'banpo', level: 'medium', name: 'Banpo Riverside', ko: '반포 한강', x: 2450, z: 6300, r: 400, kind: 'River', zigzag: true,
    text: 'The Jamwon and Banpo side streets down to the Han, the bridges strung across the water: a riverside run, then back through the apartment lanes.',
    via: [[2491, 5940], [2581, 6155], [2570, 6595], [2320, 6636], [2418, 6016]]
  },
  {
    id: 'yeouido63', level: 'medium', name: 'Yeouido 63 Lanes', ko: '여의도 63', x: -3950, z: 4950, r: 400, kind: 'Towers', zigzag: true,
    text: 'The back streets of Yeouido between the river and the park, the golden 63 Building over the rooftops at every turn.',
    via: [[-4268, 5172], [-4269, 4782], [-3951, 4737], [-3768, 4971], [-3959, 5179]]
  },
  {
    id: 'bukak', level: 'hard', name: 'Bukak Skyway', ko: '북악스카이웨이', x: 100, z: -3950, r: 450, kind: 'Mountain', zigzag: true,
    text: 'The old skyway along the ridge of Bugaksan, Bukhansan\'s granite peaks to the north: hairpin after hairpin through the pines, over the top by Palgakjeong and down toward Buam-dong — one way.',
    via: [[805, -4460], [740, -4600], [650, -4420], [500, -4290], [409, -4100], [180, -3885], [-190, -3800], [-300, -3720], [-450, -3700], [-320, -3480], [-440, -3345], [-640, -3400]],
    open: true, mountain: true, max: 4200
  },
  {
    id: 'skytower', level: 'hard', name: 'Jamsil Sky Tower', ko: '잠실 타워', x: 11380, z: 6500, r: 400, kind: 'Towers', zigzag: true,
    text: 'The lanes of Songpa south of Seokchon Lake, the 555 m Sky Tower filling the sky to the north: tight corners, one after another.',
    minRoad: 7,
    via: [[11555, 6608], [11298, 6674], [11157, 6470], [11153, 6377], [11333, 6196], [11603, 6241], [11714, 6492]]
  },
  // The hill roads (`mountain`, one way like the Bukak Skyway): two-lane roads that cars use, up and over
  // Seoul's inner mountains on their real slopes — long linked bends, hairpins, the city opening up below.
  {
    id: 'inwangsan', level: 'hard', name: 'Inwangsan Skyway', ko: '인왕산 스카이웨이', x: -1050, z: -2100, r: 450, kind: 'Mountain', zigzag: true,
    text: 'Down from Buam-dong to Changuimun, the old city wall\'s north-west gate, then along Inwangsan\'s granite flank on the old skyway and down toward Sajik-dong — Gyeongbokgung and the towers of downtown opening up below. One way.',
    via: [[-714, -3167], [-852, -3072], [-1003, -2978], [-1061, -2753], [-1243, -2300], [-1426, -1940], [-1386, -1617], [-1234, -1225], [-1093, -1085]],
    open: true, mountain: true, max: 4200
  },
  {
    id: 'samcheong', level: 'hard', name: 'Samcheong–Bukchon Downhill', ko: '삼청·북촌 다운힐', x: 450, z: -2100, r: 450, kind: 'Downhill', zigzag: true,
    text: 'From the mouth of the Samcheong tunnel high under Bugaksan, down Samcheong Park\'s hairpins through the woods, a jink across the top of Bukchon by Waryong Park, then down Bukchon-ro between the hanok roofs to Anguk, Changdeokgung\'s woods off to the left. One way.',
    via: [[385, -3014], [312, -2915], [404, -2918], [486, -2842], [537, -2751], [468, -2721], [379, -2785], [342, -2701], [400, -2609], [399, -2503], [332, -2422], [334, -2296], [392, -2321], [491, -2366], [505, -2279], [593, -2269], [652, -2235], [672, -2173], [642, -2080], [638, -1894], [633, -1723], [628, -1531], [649, -1390], [699, -1248], [731, -1172]],
    open: true, mountain: true, max: 4200
  },
  {
    id: 'arirang', level: 'hard', name: 'Arirang Pass Downhill', ko: '아리랑고개 다운힐', x: 1500, z: -3800, r: 550, kind: 'Ridge', zigzag: true,
    text: 'The Bukak Skyway\'s eastern half: along the ridge east of Palgakjeong, across the Seongbuk-dong pass, then down through the pines in long linked bends and two hairpins toward Arirang-gogae, the north-east of the city spread out below. One way.',
    via: [[1290, -4143], [1477, -4084], [1711, -3974], [2015, -3922], [2173, -3579], [2475, -3239], [2464, -3417], [2567, -3669], [2789, -3776], [2940, -3874]],
    open: true, mountain: true, max: 4200
  },
  // The landmark runs: laid out so a landmark (skyline.js) stands ahead down their straights. `ring`: a
  // loop round a place rather than a level's shape — its points snap to the carriageway going its way,
  // as a zig-zag's do.
  {
    // (a figure eight: its two loops meet on Yulgok-ro in front of the Gwanghwamun gate — the 200 m from the gate's
    // junction to Samcheong-ro ridden twice, the same way: first turning up round the palace, then on along Yulgok-ro
    // — `eight` lets the plan use it twice; a rider's place is looked for just round where it was, race.js, so it stays on the pass it is on)
    id: 'gyeongbok8', level: 'medium', name: 'Gyeongbokgung Figure Eight', ko: '경복궁 8자 코스', x: 0, z: -1150, r: 590, kind: 'Palace', ring: true, eight: true,
    text: 'A figure eight crossed in front of the Gwanghwamun gate: up Sejong-daero past Admiral Yi and King Sejong to the gate, round Gyeongbokgung\'s walls — up Samcheong-ro, along the front of Cheong Wa Dae under Bugaksan, down Hyoja-ro — back across the gate\'s junction, then east along Yulgok-ro, down Ujeongguk-ro past Jogyesa and back along Jongno.',
    roads: 'avenues', beside: 0.2, max: 5200, startAt: [-56, -470],
    // (Hyoja-ro's foot to Sajik-ro's eastbound carriageway: the left turn the map leaves out)
    links: [[[-322.5, -1058.1], [-321, -1043.2]]],
    via: [[-56, -560], [20, -1035], [160, -1200], [200, -1600], [140, -1900], [-100, -1940], [-300, -1930], [-372, -1700], [-345, -1250], [-250, -1030], [20, -1035], [250, -1058], [441, -950], [445, -600], [200, -445], [-40, -445]]
  },
  {
    id: 'noryangjin', level: 'medium', name: 'Noryangjin 63 View', ko: '노량진 63 전망', x: -3200, z: 6250, r: 450, kind: 'Hill', ring: true,
    text: 'Across the Han from Yeouido: a long run north down Jangseungbaegi-ro straight at the golden 63 Building over the river, along Noryangjin-ro, then up and down the winding hill streets of Noryangjin-dong.',
    via: [[-3345, 6450], [-3340, 5960], [-3150, 5900], [-2975, 5950], [-2975, 6150], [-3100, 6250], [-3090, 6480], [-3200, 6600]]
  },
  {
    id: 'songpa', level: 'hard', name: 'Songpa Sky Lanes', ko: '송파 스카이 골목', x: 11300, z: 7100, r: 450, kind: 'Towers', zigzag: true,
    text: 'The lanes of Songpa south of the Sky Tower: square corner after square corner, left and right in turn, and on every run north the 555 m tower rising over the rooftops ahead.',
    minRoad: 7,
    via: [[11055, 7053], [11466, 6898], [11543, 7189], [11489, 7300], [11257, 7346]]
  }
];
/** The courses of a level, in order. */
export const coursesOf = (level) => BIKE_COURSES.filter((c) => (c.level ?? 'easy') === level);
/** Kept for anything that still asks for "the courses". */
export const COURSES = BIKE_COURSES;

/** How much a metre of each class of road costs a car: big roads are preferred, small ones avoided. */
const COST = [0.75, 0.7, 0.8, 1.0, 1.6, 4, 9, 9];
/**
 * …and a bike at 70 km/h: never the motorway, rarely the trunk roads; the
 * wide city roads cheapest (room to race and to pass), the small streets a
 * little dearer and the narrow ones much dearer (`narrow`: how much more a
 * metre costs for each metre under 6 m wide) — so the main loop races the
 * roads, and the narrowest golmok are left for the short cuts
 * (planShortcuts) a bold rider can take.
 */
export const BIKE_COST = Object.assign([Infinity, 2.2, 1.0, 1.05, 1.3, 7, 9, 12], {
  narrow: 0.9,
  // (the wrong way down a one-way road: never, in practice)
  against: 60,
  // a road two lanes or more each way: much cheaper — the main loop races the boulevards
  wide: 0.5,
  // a flyover or a bridge's deck: only if there's no other way
  bridge: 2.5,
  // a slip road (a main road narrower than 6.5 m: a link between two, one lane between kerbs)
  link: 2.5
});
/**
 * Turning costs a racer: metres of road a turn of `a` radians at a junction is worth — a gentle
 * bend nearly nothing, a 90° corner a long way round (and harder still past 60°), a turn-round never.
 */
export function turnCost(a) {
  const t = Math.abs(a);
  if (t > 2.4) return 1e5;
  return 25 * t * t + (t > Math.PI / 3 ? 60 : 0) + (t > 1.4 ? 40 : 0);
}
/**
 * The three levels a course can be, and what each asks of the planner and of the race.
 *   easy    the boulevards: two lanes or more each way, long straights, few hard corners
 *   medium  narrower avenues (one or two lanes each way), more corners (6–10 over 60°), a hill or
 *           two, a short cut or two, more traffic
 *   hard    tight two-lane streets and residential lanes, square corners you drift round, hills,
 *           golmok short cuts, parked cars, busy oncoming traffic
 * `traffic` scales the cars about; `oncoming` is how many to keep coming the other way down the
 * course's own two-way roads; `along` how many going the riders' way up the course ahead, in their
 * lanes; `parked` cars per km along the kerb; `stops` buses per km standing at their stops; `bots`
 * the three bots' skills; `items` how much more the last-placed odds lean on a harder level (0–1).
 * (Easy busier but fair, Medium busy, Hard packed.)
 */
export const LEVELS = {
  easy: { id: 'easy', name: 'Easy', ko: '쉬움', stars: 1, color: '#2fbf71', traffic: 1.2, oncoming: 15, along: 8, parked: 2, stops: 1.2, bots: [0.86, 0.89, 0.92], items: 0 },
  medium: { id: 'medium', name: 'Medium', ko: '보통', stars: 2, color: '#ffa928', traffic: 1.3, oncoming: 21, along: 11, parked: 7, stops: 1, bots: [0.89, 0.93, 0.97], items: 0.5 },
  hard: { id: 'hard', name: 'Hard', ko: '어려움', stars: 3, color: '#ff4b3e', traffic: 1.4, oncoming: 26, along: 14, parked: 12, scooters: 10, stops: 0.6, dense: true, bots: [0.93, 0.97, 1.01], items: 1 }
};
export const LEVEL_ORDER = ['easy', 'medium', 'hard'];
/**
 * The traffic on a zig-zag's local streets (one lane each way, parked cars already at the kerb): lighter
 * than on its level's avenues, so a corner isn't a jam — `${level}-local`, the level traffic.js is handed
 * for a zig-zag (race.js), hidden from the level tabs (not enumerable).
 */
for (const [id, t] of Object.entries({
  medium: { traffic: 0.6, oncoming: 3, along: 2, parked: 0, scooters: 0, stops: 0 },
  hard: { traffic: 0.7, oncoming: 4, along: 3, parked: 0, scooters: 0, stops: 0, dense: false }
})) Object.defineProperty(LEVELS, `${id}-local`, { value: { ...LEVELS[id], ...t, id: `${id}-local` }, enumerable: false });

/** A bike's costs on avenues: the wide roads no longer much cheaper, the narrower ones fine. */
const MEDIUM_COST = Object.assign([Infinity, 3, 1.0, 1.0, 1.05, 1.7, 9, 12], { narrow: 0.25, against: 60, wide: 0.95, bridge: 2.5, link: 1.6 });
/** …and in the tight streets: the boulevards dear, the two-lane roads and residential lanes cheap, the alleys still for the short cuts. */
const HARD_COST = Object.assign([Infinity, 6, 2.2, 1.4, 1.0, 1.0, 9, 12], { narrow: 0.05, against: 60, wide: 1.8, bridge: 3, link: 1.3 });

/**
 * …and on the zig-zags: the neighbourhood streets — secondary, tertiary and residential roads, one lane
 * each way or one-way — cheapest; the big straight arterials (trunk and primary roads, two lanes or more
 * each way) dear, to cross or for a short link only; the alleys left to the short cuts.
 */
const ZIG_COST = Object.assign([Infinity, 8, 3.5, 1.15, 1.0, 1.0, 9, 12], { narrow: 0, against: 60, wide: 2, bridge: 2, link: 1.5 });
/** The narrowest street a zig-zag's main line takes (m): narrower is a golmok, for the short cuts. */
export const ZIG_MIN_WIDTH = 8;

/** Corners (a sum over the turns, `per` each and `sharp` more per radian past 60°), and `each` for every one out of [lo, hi]. */
const cornerScore = (st, per, sharp, [lo, hi], each = 140) => st.turns.reduce((t, x) => t + (x.angle > Math.PI / 3 ? per + (x.angle - Math.PI / 3) * sharp : x.angle > 0.7 ? per * 0.25 : 0), 0) + each * Math.max(0, lo - st.sharp, st.sharp - hi);

/**
 * How the planner plans for each level: the costs on the streets, what a turn at a junction costs,
 * which small streets the main loop may use, where its points snap, and what makes a loop better.
 * Lower is better.
 */
const PROFILE = {
  easy: {
    costs: BIKE_COST,
    turn: turnCost,
    small: false,
    snap: (n) => (n.wide ? 0 : 260) + (n.cls <= 1 ? 300 : 0),
    // the wide roads, few corners (a 90° junction is a stop at 70 km/h), long straights, a long run from the start
    score: (st, { narrow }) => 1800 * (1 - st.wide) + 3000 * st.small + 2500 * narrow + st.turns.reduce((t, x) => t + (x.angle > Math.PI / 3 ? 90 + (x.angle - Math.PI / 3) * 160 : x.angle > 0.7 ? 25 : 0), 0) - Math.min(700, st.longest) * 0.35 - Math.min(350, st.firstCorner) * 0.4,
    shortcut: 90
  },
  medium: {
    costs: MEDIUM_COST,
    turn: (a) => turnCost(a) * 0.45,
    small: 'lanes',
    snap: (n) => (n.wide ? 120 : 0) + (n.cls <= 1 ? 400 : 0) + (n.cls >= 5 ? 200 : 0),
    // avenues, not boulevards: about half wide, a little of the residential lanes; 6–10 corners over
    // 60°; still a fair run from the start
    score: (st) => 2200 * Math.max(0, st.wide - 0.55) + 900 * Math.max(0, 0.15 - st.wide) + 2500 * Math.max(0, st.small - 0.35) + cornerScore(st, -40, 30, [6, 10], 260) - Math.min(500, st.longest) * 0.2 - Math.min(220, st.firstCorner) * 0.6,
    shortcut: 160
  },
  // The zig-zag courses (`zigzag`, through points of their own): the main line on the local streets
  // (ZIG_COST), none narrower than ZIG_MIN_WIDTH, turns cheap — the points set the slalom, the search
  // only joins them.
  zigzag: {
    costs: ZIG_COST,
    turn: (a) => turnCost(a) * 0.3,
    small: 'lanes',
    minWidth: ZIG_MIN_WIDTH
  },
  hard: {
    costs: HARD_COST,
    turn: (a) => turnCost(a) * 0.2,
    small: 'lanes',
    snap: (n) => (n.wide ? 300 : 0) + (n.cls <= 2 ? 200 : 0),
    // the narrow streets, square corners (about 8–14 over 60°), a straight to start on
    score: (st, { narrow }) => 1600 * st.wide - 600 * Math.min(0.6, narrow) + cornerScore(st, -60, 20, [8, 14], 220) - 120 * Math.min(8, st.square) - Math.min(160, st.firstCorner) * 0.8,
    shortcut: 220,
    shortcuts: 3
  }
};

/**
 * The room the buildings really leave a small street (the map gives most no width, 6.2 m by default, and
 * some are a service lane squeezed behind a row of shops): each piece of a small street in the graph
 * made as narrow as the walls either side of its middle — so a zig-zag's main line keeps to the streets
 * a car and a rider really pass in.
 */
export function measureRoom(nodes, walls) {
  if (!walls) return nodes;
  for (let ai = 0; ai < nodes.length; ai++) {
    const a = nodes[ai];
    for (const e of a.adj) {
      if (e.cls < 5 || e.roomed) continue;
      const b = nodes[e.to];
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const rx = -(b.z - a.z) / L;
      const rz = (b.x - a.x) / L;
      let room = Infinity;
      for (const t of [0.25, 0.5, 0.75]) {
        const x = a.x + (b.x - a.x) * t + rx * (e.shift ?? 0);
        const z = a.z + (b.z - a.z) * t + rz * (e.shift ?? 0);
        room = Math.min(room, walls.ray(x, z, rx, rz, 6) + walls.ray(x, z, -rx, -rz, 6));
      }
      // (a lane the map gives no width — SMALL_WIDTH's 6.2 m — is as wide as its buildings leave it, up to 9 m)
      e.width = e.width === 6.2 ? Math.min(9, room) : Math.min(e.width, room);
      e.roomed = true;
      const back = b.adj.find((f) => f.to === ai && f.cls === e.cls);
      if (back && !back.roomed) {
        back.width = e.width;
        back.roomed = true;
      }
    }
  }
  return nodes;
}

/** A road with a point at least every `step` metres along it (its own points kept). */
export function densify(r, step) {
  const p = r.pts;
  const out = [p[0], p[1]];
  for (let i = 2; i < p.length; i += 2) {
    const L = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    const n = Math.ceil(L / step);
    for (let k = 1; k < n; k++) out.push(p[i - 2] + ((p[i] - p[i - 2]) * k) / n, p[i - 1] + ((p[i + 1] - p[i - 1]) * k) / n);
    out.push(p[i], p[i + 1]);
  }
  return out.length === p.length ? r : { ...r, pts: Float32Array.from(out) };
}

/** Small streets: what a course point's class says it is (5 residential, 6 alley, 7 pedestrian). */
export const isSmall = (cls) => cls >= 5;
const key = (x, z) => `${Math.round(x * 2)}|${Math.round(z * 2)}`;

/**
 * The road network near a place, as a graph: nodes where roads' points are, edges along them.
 * With `walls` (walls.js: the buildings' footprints), a street whose line runs through a building
 * is moved a little to the side to the gap between them (`shift`, metres to its right) if that
 * clears it, and otherwise left out: the map's alleys don't always agree with its buildings, and a
 * race must never be routed through one.
 */
export function buildGraph(roads, cx, cz, reach, costs = COST, walls = null, { short = false } = {}) {
  const nodes = [];
  const index = new Map();
  const node = (x, z) => {
    const k = key(x, z);
    let id = index.get(k);
    if (id == null) {
      id = nodes.length;
      index.set(k, id);
      nodes.push({ x, z, adj: [], cls: 9, width: 0 });
    }
    return id;
  };
  for (const r of roads) {
    if (!Number.isFinite(costs[r.cls] ?? 1.4)) continue;
    const n = r.pts.length / 2;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const x = r.pts[i * 2];
      const z = r.pts[i * 2 + 1];
      if (Math.abs(x - cx) > reach || Math.abs(z - cz) > reach) {
        prev = null;
        continue;
      }
      const id = node(x, z);
      if (prev != null && prev !== id) {
        const a = nodes[prev];
        const b = nodes[id];
        // (`short`: a piece of road under 6 m long is never left out — the zig-zags' junctions, where a
        // road's first few metres cross a building's corner on the map)
        const shift = walls && !(short && Math.hypot(a.x - b.x, a.z - b.z) < 6) ? clearShift(walls, a.x, a.z, b.x, b.z) : 0;
        if (shift == null) {
          prev = id;
          continue;
        }
        const len = Math.hypot(a.x - b.x, a.z - b.z);
        const oneway = Boolean(r.oneway);
        const wide = isWide([0, 0, r.width, r.cls, oneway ? 1 : 0]);
        const cost = len * (costs[r.cls] ?? 1.4) * (1 + Math.max(0, 6 - (r.width || 6)) * (costs.narrow ?? 0)) * (shift ? 1.15 : 1) * (wide ? costs.wide ?? 1 : 1) * (r.bridge ? costs.bridge ?? 1 : 1) * (!isSmall(r.cls) && (r.width || 8) < 6.5 ? costs.link ?? 1 : 1);
        // A one-way road (its points run the way the traffic goes): a bike goes with the traffic — the
        // wrong way costs `against` times as much (so a loop uses the other carriageway back).
        a.adj.push({ to: id, len, cost, width: r.width, cls: r.cls, oneway, wide, road: r, shift });
        b.adj.push({ to: prev, len, cost: cost * (oneway ? costs.against ?? 1 : 1), width: r.width, cls: r.cls, oneway, wide, against: oneway, road: r, shift: -shift });
        for (const nd of [a, b]) {
          nd.cls = Math.min(nd.cls, r.cls);
          nd.width = Math.max(nd.width, r.width);
          if (wide) nd.wide = true;
        }
      }
      prev = id;
    }
  }
  return nodes;
}

/**
 * Does the street from a to b run clear of the buildings? 0 if it does; else the sideways shift
 * (metres to the right of a→b, up to 2.25) that clears it; null if none does. Its ends (2.5 m
 * each) aren't asked: a junction's corner may clip a building's.
 */
export function clearShift(walls, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 6) return walls.inside((ax + bx) / 2, (az + bz) / 2) ? null : 0;
  const ux = (bx - ax) / len;
  const uz = (bz - az) / len;
  const rx = -uz;
  const rz = ux;
  const cut = Math.min(2.5, len * 0.25);
  const x0 = ax + ux * cut;
  const z0 = az + uz * cut;
  const x1 = bx - ux * cut;
  const z1 = bz - uz * cut;
  for (const o of [0, 0.75, -0.75, 1.5, -1.5, 2.25, -2.25]) {
    if (walls.insideAlong(x0 + rx * o, z0 + rz * o, x1 + rx * o, z1 + rz * o) <= 0.3) return o;
  }
  return null;
}

/** A small heap for the search. */
class Heap {
  constructor() {
    this.a = [];
  }
  push(item, p) {
    const a = this.a;
    a.push([p, item]);
    for (let i = a.length - 1; i > 0; ) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top?.[1];
  }
  get size() {
    return this.a.length;
  }
}

/** The best way from one node to another; `used` edges (from earlier legs) cost far more, so a loop doesn't double back. */
function path(nodes, from, to, used) {
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const heap = new Heap();
  dist[from] = 0;
  heap.push(from, 0);
  while (heap.size) {
    const u = heap.pop();
    if (u === to) break;
    for (const e of nodes[u].adj) {
      const penalty = used.has(`${u}>${e.to}`) || used.has(`${e.to}>${u}`) ? 25 : 1;
      const d = dist[u] + e.cost * penalty;
      if (d < dist[e.to]) {
        dist[e.to] = d;
        prev[e.to] = u;
        heap.push(e.to, d);
      }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const out = [to];
  while (out[0] !== from) out.unshift(prev[out[0]]);
  return out;
}

/** Every directed edge of the graph numbered: edges of node i are off[i] … off[i + 1] − 1. */
function edgeIndex(nodes) {
  if (nodes._off) return nodes._off;
  const off = new Int32Array(nodes.length + 1);
  for (let i = 0; i < nodes.length; i++) off[i + 1] = off[i] + nodes[i].adj.length;
  const tail = new Int32Array(off[nodes.length]);
  for (let i = 0; i < nodes.length; i++) for (let k = off[i]; k < off[i + 1]; k++) tail[k] = i;
  Object.defineProperty(nodes, '_off', { value: off, enumerable: false });
  Object.defineProperty(nodes, '_tail', { value: tail, enumerable: false });
  return off;
}

/**
 * The best way from one node to another for a racer: a search over the streets' directed edges, so
 * every turn at a junction costs what turnCost says (a straight run through a crossroads is free, a
 * 90° corner dear, a turn-round never) — the loop keeps to the long straights and sweeping bends.
 * `inHead` is the way it arrives at `from` (the leg before), so the join between legs is turned
 * too. `used` edges cost far more. The small streets are left out (`small`: not) — they are
 * for the short cuts; so is going against a one-way road (unless not `strict`). Returns { route (the nodes), head (the way it arrives) }, or null.
 */
export function pathTurning(nodes, from, to, used, inHead = null, { turn = turnCost, small = false, strict = true, minWidth = 0 } = {}) {
  // (`small`: false — none of the small streets; 'lanes' — the residential lanes, not the alleys; true — all;
  // `minWidth`: no small street narrower than that)
  const shut = (e) => (strict && e.against) || (small === 'lanes' ? e.cls > 5 : !small && isSmall(e.cls)) || (minWidth > 0 && e.cls >= 5 && e.width < minWidth);
  const off = edgeIndex(nodes);
  const tail = nodes._tail;
  const E = off[nodes.length];
  const dist = new Float64Array(E).fill(Infinity);
  const prev = new Int32Array(E).fill(-1);
  const hd = new Float64Array(E);
  for (let i = 0; i < nodes.length; i++) {
    for (let k = off[i]; k < off[i + 1]; k++) {
      const e = nodes[i].adj[k - off[i]];
      hd[k] = Math.atan2(nodes[e.to].x - nodes[i].x, nodes[e.to].z - nodes[i].z);
    }
  }
  const angle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const step = (u, e) => e.cost * (used.has(`${u}>${e.to}`) || used.has(`${e.to}>${u}`) ? 25 : 1);
  const heap = new Heap();
  for (let k = off[from]; k < off[from + 1]; k++) {
    const e = nodes[from].adj[k - off[from]];
    if (shut(e)) continue;
    const d = step(from, e) + (inHead == null ? 0 : turn(angle(inHead, hd[k])));
    if (d < dist[k]) {
      dist[k] = d;
      heap.push(k, d);
    }
  }
  let end = -1;
  const done = new Uint8Array(E);
  while (heap.size) {
    const id = heap.pop();
    if (done[id]) continue;
    done[id] = 1;
    const u = tail[id];
    const v = nodes[u].adj[id - off[u]].to;
    if (v === to) {
      end = id;
      break;
    }
    for (let k = off[v]; k < off[v + 1]; k++) {
      const e = nodes[v].adj[k - off[v]];
      if (e.to === u || shut(e)) continue;
      const d = dist[id] + step(v, e) + turn(angle(hd[id], hd[k]));
      if (d < dist[k]) {
        dist[k] = d;
        prev[k] = id;
        heap.push(k, d);
      }
    }
  }
  if (end < 0) return null;
  const out = [];
  for (let id = end; id >= 0; id = prev[id]) out.push(nodes[tail[id]].adj[id - off[tail[id]]].to);
  out.push(from);
  out.reverse();
  return { route: out, head: hd[end] };
}

/**
 * The node on a big road nearest a point (the biggest road class found within reach wins);
 * for a bike, a junction on any street but the biggest roads.
 */
function snap(nodes, x, z, reach, bike = false) {
  let best = -1;
  let bestScore = Infinity;
  nodes.forEach((n, i) => {
    if (n.adj.length < (bike ? 3 : 2)) return;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d > reach) return;
    const score = bike ? d + (n.cls <= 1 ? 250 : 0) : d + n.cls * 90;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Evenly spaced points along a polyline, every `step` metres. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az, aw] = pts[i - 1];
    const [bx, bz, bw, bc] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= len) {
      out.push(bc == null ? [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, Math.max(aw, bw)] : [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, bw, bc, pts[i][4] ?? 0]);
      t += step;
    }
    carry = len - (t - step);
  }
  return out;
}

/**
 * Cut hairpins out of a loop of points: where it turns right round (up one
 * side of a divided road and back down the other), trim back both ways while
 * the two sides run close together, and join the ends.
 */
function cutHairpins(points) {
  const pts = points.slice();
  const heading = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  for (let guard = 0; guard < 50; guard++) {
    const n = pts.length;
    let pin = -1;
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 2 + n) % n];
      const b = pts[i];
      const c = pts[(i + 2) % n];
      const t = heading(b, c) - heading(a, b);
      if (Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3) {
        pin = i;
        break;
      }
    }
    if (pin < 0 || n < 40) break;
    let k = 1;
    while (k < n / 4 && Math.hypot(pts[(pin - k + n) % n][0] - pts[(pin + k) % n][0], pts[(pin - k + n) % n][1] - pts[(pin + k) % n][1]) < 30) k++;
    // Drop pin−k+1 … pin+k−1 (going round the loop's end if need be).
    const drop = new Set();
    for (let d = -k + 1; d <= k - 1; d++) drop.add((pin + d + n) % n);
    const kept = pts.filter((_, i) => !drop.has(i));
    pts.length = 0;
    pts.push(...kept);
  }
  return pts;
}

/**
 * A route of nodes made into a loop of racing points: spurs cut out, each point with the width,
 * class and one-way of the street leading to it, evenly spaced, hairpins trimmed. Returns
 * { points, s, length, route } or a reason it is no loop (a string).
 */
function loopOf(nodes, route, step, { min = 1400, max = 3400, besideOk = null } = {}) {
  // Cut out spurs — out along a street and straight back the same way (a dead end, or round an
  // anchor): a race must never turn round on itself. The route is a loop, so look round the join too.
  const loop = route.slice(0, -1);
  for (let guard = 0; guard < loop.length * 2 && loop.length > 8; guard++) {
    const m = loop.length;
    const at = loop.findIndex((id, i) => loop[(i + 2) % m] === id);
    if (at < 0) break;
    const drop = [(at + 1) % m, (at + 2) % m].sort((x, y) => y - x);
    for (const d of drop) loop.splice(d, 1);
  }
  route = [...loop, loop[0]];
  // (where two streets join the same two points, the one a racer would take: the cheapest)
  const edge = (a, b) => nodes[a].adj.reduce((best, e) => (e.to === b && (!best || e.cost < best.cost) ? e : best), null);
  const pts = route.map((id, i) => {
    const e = edge(route[Math.max(0, i - 1)], route[Math.max(1, i)]) ?? edge(route[i], route[i + 1]) ?? { width: 8, cls: 4 };
    return [nodes[id].x, nodes[id].z, e.width || 8, e.cls ?? 4, e.oneway ? (e.against ? -1 : 1) : 0];
  });
  const points = resample(cutHairpins(resample(pts, step).slice(0, -1)).concat([resample(pts, step)[0]]), step).slice(0, -1);
  const { s, length } = alongLine(points);
  if (length < min || length > max) return `length ${length.toFixed(0)}`;
  const seen = new Map();
  let back = 0;
  route.forEach((id, i) => {
    if (seen.has(id) && i - seen.get(id) > 2) back++;
    seen.set(id, i);
  });
  if (back > route.length * 0.12) return `back ${back}/${route.length}`;
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  const m = points.length;
  const pins = points.filter((b, i) => {
    const t = head(b, points[(i + 2) % m]) - head(points[(i - 2 + m) % m], b);
    return Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3;
  }).length;
  if (pins) return `hairpins ${pins}`;
  // Not out along one carriageway of a divided road and back down the other: the loop must not run
  // beside itself (a point with another, well round the course from it, within 40 m).
  const cell = 40;
  const grid = new Map();
  points.forEach((p, i) => {
    const k = `${Math.floor(p[0] / cell)}|${Math.floor(p[1] / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  let beside = 0;
  points.forEach((p, i) => {
    const ci = Math.floor(p[0] / cell);
    const cj = Math.floor(p[1] / cell);
    for (let a = ci - 1; a <= ci + 1; a++) {
      for (let b = cj - 1; b <= cj + 1; b++) {
        for (const j of grid.get(`${a}|${b}`) ?? []) {
          const apart = Math.abs(s[i] - s[j]);
          if (Math.min(apart, length - apart) > 150 && Math.hypot(points[j][0] - p[0], points[j][1] - p[1]) < 40) {
            beside++;
            return;
          }
        }
      }
    }
  });
  if (beside > m * (besideOk ?? 0.06)) return `beside ${beside}/${m}`;
  return { points, s, length, route };
}

/**
 * A bike course: a loop on the boulevards. Three or four points round the place, each on the
 * nearest road two lanes or more each way, joined by the best way for a racer (pathTurning: wide
 * roads cheap, small streets dear, every corner priced, one-way roads only with their traffic),
 * and of all the loops tried the one that best keeps to the wide roads, with the fewest sharp
 * corners, the longest straights and a long run from the start, near the length wanted. The
 * golmok are left for the short cuts.
 */
function planBikeCourse(roads, def, { step, why, walls, target, strict = true }) {
  const prof = def.zigzag ? PROFILE.zigzag : PROFILE[def.level ?? 'easy'] ?? PROFILE.easy;
  // (a zig-zag's streets with a point every 20 m at least, so each of its own points snaps onto the carriageway it is on)
  if (def.zigzag) roads = roads.map((r) => (r.cls <= 5 ? densify(r, 20) : r));
  if (def.via) return planViaCourse(roads, def, { step, why, walls, prof });
  const nodes = buildGraph(roads, def.x, def.z, def.r * (def.reach ?? 3), prof.costs, walls);
  const snapWide = (x, z, reach) => {
    let best = -1;
    let bestScore = Infinity;
    nodes.forEach((n, i) => {
      if (n.adj.length < 2 || n.cls >= (prof.small ? 6 : 5) || n.cls <= 0) return;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d > reach) return;
      const score = d + prof.snap(n);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  };
  const cands = [];
  const tried = new Set();
  for (const count of [4, 3]) {
    for (const turn0 of [0, Math.PI / 8, Math.PI / 4, (3 * Math.PI) / 8, Math.PI / 2, (5 * Math.PI) / 8]) {
      if (count === 4 && turn0 >= Math.PI / 2) continue;
      for (const scale of [0.4, 0.55, 0.75, 1, 1.25, 1.5]) {
        const R = def.r * scale;
        const anchors = [];
        for (let k = 0; k < count; k++) {
          const a = turn0 + (def.spin ?? 0) + (k * Math.PI * 2) / count;
          anchors.push(snapWide(def.x + Math.cos(a) * R, def.z + Math.sin(a) * R, Math.max(140, R * 0.75)));
        }
        if (anchors.some((a) => a < 0) || new Set(anchors).size < count) {
          why?.push(`anchors ${anchors}`);
          continue;
        }
        const sig = anchors.join(',');
        if (tried.has(sig)) continue;
        tried.add(sig);
        const used = new Set();
        const route = [anchors[0]];
        let inHead = null;
        let ok = true;
        for (let k = 0; k < count; k++) {
          const leg = pathTurning(nodes, anchors[k], anchors[(k + 1) % count], used, inHead, { strict, turn: prof.turn, small: prof.small });
          if (!leg) {
            why?.push(`no way ${k}`);
            ok = false;
            break;
          }
          inHead = leg.head;
          for (let i = 1; i < leg.route.length; i++) {
            used.add(`${leg.route[i - 1]}>${leg.route[i]}`);
            route.push(leg.route[i]);
          }
        }
        if (!ok) continue;
        const loop = loopOf(nodes, route, step, { min: def.min ?? 1700, max: def.max ?? 3400 });
        if (typeof loop === 'string') {
          why?.push(loop);
          continue;
        }
        const started = startOnBigRoad({ id: def.id, ...loop });
        const st = courseStats(started);
        const against = loop.points.filter((p) => p[4] === -1).length / loop.points.length;
        const narrow = loop.points.filter((p) => (p[2] ?? 8) < 6.5).length / loop.points.length;
        const score = Math.abs(loop.length - target) * 0.35 + 8000 * against + prof.score(st, { narrow });
        cands.push({ id: def.id, points: loop.points, s: loop.s, length: loop.length, score, graph: { nodes, route: loop.route } });
      }
    }
  }
  // (no loop keeps every one-way road the right way here — the map's carriageways don't join up: the
  // best that goes against one as little as it can)
  if (!cands.length) return strict ? planBikeCourse(roads, def, { step, why, walls, target, strict: false }) : null;
  cands.sort((a, b) => a.score - b.score);
  // A loop with a golmok short cut or two beats one without (among the few best): try them.
  if (walls) {
    for (const c of cands.slice(0, 8)) {
      const started = startOnBigRoad(c);
      Object.defineProperty(started, 'graph', { enumerable: false, value: c.graph });
      c.score -= prof.shortcut * Math.min(prof.shortcuts ?? 2, planShortcuts(started, { walls }).length);
    }
  }
  const best = cands.slice(0, 8).reduce((a, b) => (b.score < a.score ? b : a));
  delete best.score;
  Object.defineProperty(best, 'graph', { enumerable: false, value: best.graph });
  return best;
}

/**
 * A course through points of its own (`def.via`: [[x, z], …] in order) — a loop round a lake, a run
 * down a hill: each point snapped to the nearest street the course may use, joined leg by leg the
 * racer's way (pathTurning) — back to the first (a loop), or, with `def.open`, from the first to the
 * last: a point-to-point run, its start up top and its finish line below. `def.small` which small
 * streets it may use (as pathTurning's); `def.minWidth` widens narrow streets on it (a park road two
 * lanes wide that the map gives no width); `def.links` short pieces of street the map is missing
 * ([[x, z], [x, z]] each: where a park road meets a main road a few metres short of it).
 * Returns { points, s, length, open?, graph } or null.
 */
function planViaCourse(roads, def, { step, why, walls, prof }) {
  const small = def.small ?? prof.small;
  // (on a zig-zag a link is across a junction between a side road and the far carriageway of a divided one: a main road's piece)
  const links = (def.links ?? []).map(([a, b]) => (def.zigzag ? { pts: Float32Array.of(a[0], a[1], b[0], b[1]), width: 9, cls: 4, link: true } : { pts: Float32Array.of(a[0], a[1], b[0], b[1]), width: def.minWidth ?? 6, cls: 5, small: true, link: true }));
  // (`roads: 'avenues'`: a course drawn along the big roads too — the Gwanghwamun run's — priced as Medium's avenues)
  const nodes = buildGraph(links.length ? roads.concat(links) : roads, def.x, def.z, def.r * (def.reach ?? 3), def.roads === 'avenues' ? MEDIUM_COST : def.costs ?? prof.costs, walls, { short: Boolean(def.zigzag) });
  // (on a zig-zag, a small street is as wide as its buildings let it be)
  if (def.zigzag) measureRoom(nodes, walls);
  const minWidth = def.minRoad ?? prof.minWidth ?? 0;
  const allowed = (cls, width = 9) => (small === true ? cls <= 7 : small === 'lanes' ? cls <= 5 : cls < 5) && cls >= 1 && !(cls >= 5 && width < minWidth);
  // (a zig-zag's point snaps to the carriageway going its way: from the point before it to the one after)
  const snapTo = ([x, z], k) => {
    const v = def.via;
    const before = v[k - 1] ?? (def.open ? v[k] : v.at(-1));
    const after = v[k + 1] ?? (def.open ? v[k] : v[0]);
    const wx = after[0] - before[0];
    const wz = after[1] - before[1];
    let best = -1;
    let bd = Infinity;
    nodes.forEach((n, i) => {
      if (!n.adj.some((e) => allowed(e.cls, e.width))) return;
      let d = Math.hypot(n.x - x, n.z - z);
      if ((def.zigzag || def.ring) && n.adj.every((e) => !allowed(e.cls, e.width) || e.oneway)) {
        const fwd = n.adj.filter((e) => allowed(e.cls, e.width) && !e.against);
        if (fwd.length && fwd.every((e) => (nodes[e.to].x - n.x) * wx + (nodes[e.to].z - n.z) * wz < 0)) d += 30;
      }
      if (d < bd) [bd, best] = [d, i];
    });
    return bd < 120 ? best : -1;
  };
  const anchors = def.via.map(snapTo);
  if (anchors.some((a) => a < 0)) {
    why?.push(`via ${anchors}`);
    return null;
  }
  const legs = def.open ? anchors.length - 1 : anchors.length;
  for (const strict of [true, false]) {
    const used = new Set();
    const route = [anchors[0]];
    let inHead = null;
    let ok = true;
    for (let k = 0; k < legs && ok; k++) {
      const leg = pathTurning(nodes, anchors[k], anchors[(k + 1) % anchors.length], used, inHead, { strict, turn: prof.turn, small, minWidth });
      if (!leg) {
        why?.push(`no way ${k}${strict ? '' : ' (loose)'}`);
        ok = false;
        break;
      }
      inHead = leg.head;
      let len = 0;
      for (let i = 1; i < leg.route.length; i++) {
        // (`eight`: a figure eight may run a stretch twice, the same way — where its two loops meet)
        if (!def.eight) used.add(`${leg.route[i - 1]}>${leg.route[i]}`);
        route.push(leg.route[i]);
        len += Math.hypot(nodes[leg.route[i]].x - nodes[leg.route[i - 1]].x, nodes[leg.route[i]].z - nodes[leg.route[i - 1]].z);
      }
      // (why a plan fails: each leg's length — with `def.debug`, its streets too)
      why?.push(`leg ${k}: ${Math.round(len)} m${def.debug ? ` ${leg.route.map((i) => `${Math.round(nodes[i].x)},${Math.round(nodes[i].z)}`).join(' ')}` : ''}`);
    }
    if (!ok) continue;
    const widen = (p) => (def.minWidth && (p[2] ?? 8) < def.minWidth ? [p[0], p[1], def.minWidth, p[3], p[4]] : p);
    if (def.open) {
      const edge = (a, b) => nodes[a].adj.reduce((best, e) => (e.to === b && (!best || e.cost < best.cost) ? e : best), null);
      const pts = route.map((id, i) => {
        const e = edge(route[Math.max(0, i - 1)], route[Math.max(1, i)]) ?? { width: 8, cls: 4 };
        return [nodes[id].x, nodes[id].z, e.width || 8, e.cls ?? 4, e.oneway ? (e.against ? -1 : 1) : 0];
      });
      const points = resample(pts, step).map(widen);
      const { s, length } = alongLine(points, true);
      if (length < (def.min ?? 1200) || length > (def.max ?? 4000)) {
        why?.push(`length ${Math.round(length)}`);
        return null;
      }
      return Object.defineProperty({ id: def.id, points, s, length, open: true }, 'graph', { enumerable: false, value: { nodes, route } });
    }
    // (`beside`: how much of it may run beside itself — up one side of a square and back down the other)
    const loop = loopOf(nodes, route, step, { min: def.min ?? 1700, max: def.max ?? 3600, besideOk: def.beside });
    if (typeof loop === 'string') {
      why?.push(loop);
      continue;
    }
    const points = loop.points.map(widen);
    // (`startAt`: where its start line is to be — the course's nearest point — not where startOnBigRoad would put it)
    return Object.defineProperty({ id: def.id, points, s: loop.s, length: loop.length, ...(def.startAt ? { startAt: def.startAt } : {}) }, 'graph', { enumerable: false, value: { nodes, route: loop.route } });
  }
  return null;
}

/**
 * Plan a course round a place. Returns { points: [[x, z, width]], s (distance
 * at each point), length } or null when no loop could be made there.
 *
 * With `bike` (the bike race): the loop is short (1.4–3.4 km, about 2.3 wanted),
 * never on a motorway, mostly on roads wide enough to race, and each point
 * also says what it is on: [x, z, width, class (5+ is a small street), one-way
 * (1 with the traffic, −1 against it, 0 a two-way road)].
 */
export function planCourse(roads, def, { step = 6, why = null, bike = false, walls = null, target = def.target ?? (bike ? 2500 : 4200) } = {}) {
  // (a bike also rides the alleys: those that stop just short of a road, joined to it)
  if (bike) return planBikeCourse(joinAlleys(roads, { reach: def.joinReach ?? 6 }), def, { step, why, walls, target });
  const nodes = buildGraph(roads, def.x, def.z, def.r * (def.reach ?? 3), bike ? BIKE_COST : COST, walls);
  let best = null;
  const cands = [];
  for (const turn of [Math.PI / 4, 0, Math.PI / 8, (3 * Math.PI) / 8, Math.PI / 6]) {
    for (const scale of [0.45, 0.6, 0.8, 1, 1.25]) {
      const R = def.r * scale;
      const anchors = [0, 1, 2, 3].map((k) => snap(nodes, def.x + Math.cos(turn + (k * Math.PI) / 2) * R, def.z + Math.sin(turn + (k * Math.PI) / 2) * R, bike ? Math.max(120, R * 0.7) : Math.max(250, R * 0.9), bike));
      if (anchors.some((a) => a < 0) || new Set(anchors).size < 4) {
        why?.push(`anchors ${anchors}`);
        continue;
      }
      const used = new Set();
      const route = [anchors[0]];
      let ok = true;
      for (let k = 0; k < 4; k++) {
        const leg = path(nodes, anchors[k], anchors[(k + 1) % 4], used);
        if (!leg) {
          why?.push(`no way ${k}`);
          ok = false;
          break;
        }
        for (let i = 1; i < leg.length; i++) {
          used.add(`${leg[i - 1]}>${leg[i]}`);
          route.push(leg[i]);
        }
      }
      if (!ok) continue;
      // Cut out spurs — out along a street and straight back the same way (a dead end, or round an
      // anchor): a race must never turn round on itself. The route is a loop, so look round the join too.
      const loop = route.slice(0, -1);
      for (let guard = 0; guard < loop.length * 2 && loop.length > 8; guard++) {
        const m = loop.length;
        const at = loop.findIndex((id, i) => loop[(i + 2) % m] === id);
        if (at < 0) break;
        const drop = [(at + 1) % m, (at + 2) % m].sort((x, y) => y - x);
        for (const d of drop) loop.splice(d, 1);
      }
      route.length = 0;
      route.push(...loop, loop[0]);
      // Each point: where it is, and (for a bike) the width and class of the street that leads to it.
      const edge = (a, b) => nodes[a].adj.find((e) => e.to === b);
      const pts = route.map((id, i) => {
        if (!bike) return [nodes[id].x, nodes[id].z, nodes[id].width || 10];
        const e = edge(route[Math.max(0, i - 1)], route[Math.max(1, i)]) ?? edge(route[i], route[i + 1]) ?? { width: 8, cls: 4 };
        // (and whether it is one carriageway of a one-way road, ridden with its traffic: 1; against it: −1)
        return [nodes[id].x, nodes[id].z, e.width || 8, e.cls ?? 4, e.oneway ? (e.against ? -1 : 1) : 0];
      });
      const points = resample(cutHairpins(resample(pts, step).slice(0, -1)).concat([resample(pts, step)[0]]), step).slice(0, -1);
      const s = [0];
      for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      const length = s.at(-1) + Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]);
      // A course worth racing: not a dash round one block, not a tour of the city.
      if (length < (def.min ?? (bike ? 1400 : 1800)) || length > (def.max ?? (bike ? 3400 : 9000))) {
        why?.push(`length ${length.toFixed(0)}`);
        continue;
      }
      // Too much doubling back (a street used both ways) and it isn't a loop.
      const seen = new Map();
      let back = 0;
      route.forEach((id, i) => {
        if (seen.has(id) && i - seen.get(id) > 2) back++;
        seen.set(id, i);
      });
      if (back > route.length * 0.12) {
        why?.push(`back ${back}/${route.length}`);
        continue;
      }
      // Any turn-round left (one the cutting could not undo) and it is no race course.
      const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
      const m = points.length;
      const pins = points.filter((b, i) => {
        const t = head(b, points[(i + 2) % m]) - head(points[(i - 2 + m) % m], b);
        return Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3;
      }).length;
      if (pins) {
        why?.push(`hairpins ${pins}`);
        continue;
      }
      // The loop nearest the length wanted wins — for a bike, one mostly on roads you can race with an
      // alley or two in it, and few hard corners (each a stop at 70 km/h).
      let score = Math.abs(length - target);
      if (bike) {
        // The main loop on roads you can race: a little of the wider small streets is fine, the narrow
        // golmok are for the short cuts.
        const small = points.filter((p) => isSmall(p[3])).length / points.length;
        score += 2200 * Math.max(0, small - 0.3);
        score += 60 * sharpTurns(points);
        // and narrow: every point under 4.6 m wide is a pinch
        score += 30 * points.filter((p) => (p[2] ?? 8) < 4.6).length;
      }
      const cand = { id: def.id, points, s, length, score, graph: { nodes, route: route.slice() } };
      cands.push(cand);
      if (!best || score < best.score) best = cand;
    }
  }
  // A bike loop with a golmok short cut or two beats one without (among the few best): try them.
  if (bike && walls && cands.length > 1) {
    cands.sort((a, b) => a.score - b.score);
    for (const c of cands.slice(0, 12)) {
      const started = startOnBigRoad(c);
      Object.defineProperty(started, 'graph', { enumerable: false, value: c.graph });
      c.score -= 180 * Math.min(2, planShortcuts(started, { walls }).length);
    }
    best = cands.slice(0, 12).reduce((a, b) => (b.score < a.score ? b : a));
  }
  if (best) delete best.score;
  // (the graph and route, for the short cuts: not part of the course itself)
  if (best) Object.defineProperty(best, 'graph', { enumerable: false, value: best.graph });
  return best;
}

/**
 * Whether a course point is on a road with two or more lanes each way: a one-way carriageway (half
 * of a divided road) 2 lanes wide, or a two-way road 4 lanes wide (3.25 m a lane, from the map's
 * lane count or its width) — never a small street.
 */
export function isWide(p) {
  if (isSmall(p[3] ?? 4)) return false;
  return p[4] ? (p[2] ?? 0) >= 7.4 : (p[2] ?? 0) >= 13.5;
}

/**
 * A local street, as the zig-zag courses race them: a secondary, tertiary or residential road (or a
 * lane at least ZIG_MIN_WIDTH wide), not one of the big arterials two lanes or more each way.
 */
export const isLocal = (p) => (p[3] ?? 4) >= 3 && (p[3] ?? 4) <= 6 && !isWide(p) && (p[2] ?? 6) >= ZIG_MIN_WIDTH;

/**
 * The turns a loop makes, each { i, angle } — the heading change from the 24 m before a point to
 * the 24 m after it, one per bend (its sharpest point).
 */
export function turnsOf(points, { over = 4, min = 0.5, open = false } = {}) {
  const m = points.length;
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  const at = (i) => points[open ? Math.max(0, Math.min(m - 1, i)) : ((i % m) + m) % m];
  const ang = new Float64Array(m);
  const sgn = new Int8Array(m);
  for (let i = 0; i < m; i++) {
    // (a line with ends: no turn at its ends, nor from its end round to its start)
    if (open && (i < over || i > m - 1 - over)) continue;
    const t = head(at(i), at(i + over)) - head(at(i - over), at(i));
    const a = Math.atan2(Math.sin(t), Math.cos(t));
    ang[i] = Math.abs(a);
    sgn[i] = Math.sign(a);
  }
  const out = [];
  for (let i = 0; i < m; i++) {
    if (ang[i] < min) continue;
    let peak = true;
    for (let k = -over; k <= over && peak; k++) if (k && (ang[(i + k + m) % m] > ang[i] || (ang[(i + k + m) % m] === ang[i] && k < 0))) peak = false;
    // (`dir`: which way — +1 a turn to the left as seen from above with north up, −1 to the right; only the change matters)
    if (peak) out.push({ i, angle: ang[i], dir: sgn[i] });
  }
  return out;
}

/**
 * What a course is like to ride: the share of its points on roads two lanes or more each way
 * (`wide`), on small streets (`small`), its turns sharper than 60° (`sharp`) and 80° (`square`),
 * its longest straight and the run from the start to the first corner (metres; a corner here is
 * more than 30°).
 */
export function courseStats(c) {
  // (a point-to-point course: only what is raced, from its start line to its finish)
  const open = Boolean(c.open);
  const i0 = open ? c.startI ?? 0 : 0;
  const i1 = open ? c.finishI ?? c.points.length - 1 : c.points.length - 1;
  const all = turnsOf(c.points, { open });
  const turns = all.filter((t) => t.i >= i0 && t.i <= i1);
  const pts = c.points.slice(i0, i1 + 1);
  const m = pts.length;
  const sharp = turns.filter((t) => t.angle > Math.PI / 3).length;
  const square = turns.filter((t) => t.angle > (80 * Math.PI) / 180).length;
  const bends = turnsOf(c.points, { min: Math.PI / 6, open }).map((t) => t.i).filter((i) => i >= i0 && i <= i1).sort((a, b) => a - b);
  const S = c.s ?? alongLine(c.points).s;
  let longest = 0;
  for (let k = 0; k < bends.length; k++) {
    const a = bends[k];
    const b = bends[(k + 1) % bends.length];
    if (open && k === bends.length - 1) {
      longest = Math.max(longest, S[bends[0]] - S[i0], S[i1] - S[a]);
      continue;
    }
    const d = b > a ? S[b] - S[a] : c.length - S[a] + S[b];
    longest = Math.max(longest, d);
  }
  if (!bends.length) longest = c.length;
  // Zig-zag: how often a corner (over 40°) turns the other way from the one before it (round the loop's join too).
  const corners = turns.filter((t) => t.angle > 0.7);
  let switches = 0;
  for (let k = open ? 1 : 0; k < corners.length; k++) if (corners.length > 1 && corners[k].dir !== corners[(k - 1 + corners.length) % corners.length].dir) switches++;
  return { wide: pts.filter(isWide).length / m, small: pts.filter((p) => isSmall(p[3] ?? 4)).length / m, local: pts.filter(isLocal).length / m, sharp, square, switches, longest, firstCorner: bends.length ? S[bends[0]] - S[i0] : c.length, turns };
}

/** How many hard corners (more than about 70° within 36 m) a loop of points has. */
export function sharpTurns(points) {
  const m = points.length;
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  let n = 0;
  let last = -99;
  for (let i = 0; i < m; i++) {
    const t = head(points[i], points[(i + 3) % m]) - head(points[(i - 3 + m) % m], points[i]);
    if (Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 1.2 && i - last > 6) {
      n++;
      last = i;
    }
  }
  return n;
}

/**
 * Where a racer is along the course: the point nearest them, searched a little
 * behind and ahead of where they were last (so a course that crosses itself
 * is followed the right way). Returns { i, off } — index, and how far off the line.
 */
export function locate(course, x, z, near = null) {
  const n = course.points.length;
  let best = -1;
  let bestD = Infinity;
  const look = (i) => {
    const p = course.points[((i % n) + n) % n];
    const d = Math.hypot(p[0] - x, p[1] - z);
    if (d < bestD) {
      bestD = d;
      best = ((i % n) + n) % n;
    }
  };
  if (near == null) for (let i = 0; i < n; i++) look(i);
  else for (let i = near - 15; i <= near + 60; i++) look(i);
  return { i: best, off: bestD };
}

/**
 * Start a loop where a grid of four fits: the straightest stretch of the
 * widest road on it (never in an alley), with a long run to the first corner
 * (a pack at 70 km/h needs room to string out). Returns the course turned
 * round so that point is index 0 (distances counted again from there).
 */
export function startOnBigRoad(course) {
  const pts = course.points;
  const n = pts.length;
  if (course.startAt) {
    const [ax, az] = course.startAt;
    let at = 0;
    pts.forEach((p, i) => {
      if (Math.hypot(p[0] - ax, p[1] - az) < Math.hypot(pts[at][0] - ax, pts[at][1] - az)) at = i;
    });
    const points = pts.slice(at).concat(pts.slice(0, at));
    return { ...course, points, s: alongLine(points).s };
  }
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 6 + n) % n];
    const b = pts[i];
    const c = pts[(i + 6) % n];
    const t = head(b, c) - head(a, b);
    const bend = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
    // Wide, straight, and the grid behind it (a few points back) on the same road.
    let narrow = Infinity;
    for (let k = -5; k <= 3; k++) narrow = Math.min(narrow, pts[(i + k + n) % n][2] ?? 8);
    // how far to the first corner (more than ~30°), up to 240 m
    let run = 0;
    while (run < 40) {
      const k = i + run;
      const u = head(pts[(k - 3 + n) % n], pts[k % n]) - head(pts[k % n], pts[(k + 3) % n]);
      if (Math.abs(Math.atan2(Math.sin(u), Math.cos(u))) > 0.5) break;
      run++;
    }
    const score = narrow - bend * 20 - (isSmall(pts[i][3] ?? 4) ? 50 : 0) + Math.min(run, 30) * 1.2;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  const points = pts.slice(best).concat(pts.slice(0, best));
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return { ...course, points, s };
}

/**
 * Move a line of course points (a loop, or `open` — a short cut) sideways into the gap between the
 * buildings where the map's street and its buildings disagree: each point goes where it has the
 * most room either side (up to 3 m off; a point already clear of the walls by its street's
 * half-width stays put), and the moves are smoothed so the line stays a line. Returns new points.
 */
export function centreLine(points, walls, { open = false, reach = 3 } = {}) {
  const n = points.length;
  if (!walls || n < 3) return points;
  const at = (i) => points[open ? Math.max(0, Math.min(n - 1, i)) : ((i % n) + n) % n];
  const right = (i) => {
    const a = at(i - 1);
    const b = at(i + 1);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  };
  // How much room a point has: how far to the nearer wall, sideways (up to half the width and a bit).
  // (over a few metres along the street, so a gap across it — a side alley — isn't taken for its line)
  const roomAt = (x, z, rx, rz, half) => {
    let room = Infinity;
    for (const a of [-2, 0, 2]) {
      const px = x - rz * a;
      const pz = z + rx * a;
      if (walls.inside(px, pz)) return -1;
      room = Math.min(room, walls.ray(px, pz, rx, rz, half + 1.5), walls.ray(px, pz, -rx, -rz, half + 1.5));
    }
    return room;
  };
  const want = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const half = (p[2] ?? 6) / 2;
    const [rx, rz] = right(i);
    const here = roomAt(p[0], p[1], rx, rz, half);
    // (a main road's line is its middle, the double yellow: only moved if a wall is right on it — a
    // road drawn wider than the gap between its buildings keeps its middle, or riders keeping right
    // would be over the centre line)
    if (here >= (isSmall(p[3] ?? 5) ? half - 0.3 : Math.min(half - 0.3, 2.5))) continue;
    let best = 0;
    let bestScore = here;
    for (let o = -reach; o <= reach + 1e-6; o += 0.25) {
      const r = roomAt(p[0] + rx * o, p[1] + rz * o, rx, rz, half);
      const score = r - Math.abs(o) * 0.12;
      if (r >= 0 && score > bestScore + 0.05) {
        bestScore = score;
        best = o;
      }
    }
    want[i] = best;
  }
  // Smoothed: each moves the most of its own and its neighbours' (so a point between two that move, moves too).
  const out = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let wsum = 0;
    for (let k = -2; k <= 2; k++) {
      const j = open ? Math.max(0, Math.min(n - 1, i + k)) : (((i + k) % n) + n) % n;
      const w = 3 - Math.abs(k);
      sum += want[j] * w;
      wsum += w;
    }
    let o = Math.abs(want[i]) > Math.abs(sum / wsum) ? want[i] : sum / wsum;
    // (the ends of a short cut stay where they join the course)
    if (open && (i === 0 || i === n - 1)) o = 0;
    const [rx, rz] = right(i);
    const p = points[i].slice();
    p[0] += rx * o;
    p[1] += rz * o;
    out.push(p);
  }
  // Moved into a building after all that (a bad bit of map): back where it was.
  for (let i = 0; i < n; i++) if (walls.inside(out[i][0], out[i][1]) && !walls.inside(points[i][0], points[i][1])) out[i] = points[i].slice();
  return out;
}

/**
 * The room each point has between the walls: for each, metres clear to its left and to its right
 * (up to its street's half-width and 2 m more — a pavement), as one array [left0, right0, left1, …].
 */
export function roomOf(points, walls, { open = false } = {}) {
  const n = points.length;
  const room = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const half = (p[2] ?? 6) / 2;
    const a = points[open ? Math.max(0, i - 1) : (i - 1 + n) % n];
    const b = points[open ? Math.min(n - 1, i + 1) : (i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const rx = -(b[1] - a[1]) / L;
    const rz = (b[0] - a[0]) / L;
    room[i * 2] = walls ? walls.ray(p[0], p[1], -rx, -rz, half + 2) : half + 2;
    room[i * 2 + 1] = walls ? walls.ray(p[0], p[1], rx, rz, half + 2) : half + 2;
  }
  return room;
}

/** Distances along a line of points (and its whole length, back to the start if a loop). */
export function alongLine(points, open = false) {
  const s = [0];
  for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const length = s.at(-1) + (open ? 0 : Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]));
  return { s, length };
}

/**
 * Short cuts: the narrowest golmok that leave the course and join it again further on, shorter
 * than the course between — a bold rider's line (tight walls, a tight turn in), a cautious one
 * keeps to the road. Each is { id, from, to (course indices it leaves and joins at), points (open,
 * from the course's point `from` to its point `to`), s, length, span (the course's metres it cuts
 * out), saves, width (its narrowest), roads (the streets it runs down) }. Never across the start
 * line, never two over the same stretch. Needs the course's graph (planCourse).
 */
export function planShortcuts(course, { max = 2, narrowest = 6.5, pinch = 4.7, step = 6, walls = null, why = null } = {}) {
  const g = course.graph;
  if (!g) return [];
  const { nodes } = g;
  const pts = course.points;
  const n = pts.length;
  const L = course.length;
  const S = course.s;
  // The course points by 10 m square, for "how near the course is this".
  const cell = 10;
  const grid = new Map();
  pts.forEach((p, i) => {
    const k = `${Math.floor(p[0] / cell)}|${Math.floor(p[1] / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const nearest = (x, z) => {
    let best = -1;
    let bd = Infinity;
    const ci = Math.floor(x / cell);
    const cj = Math.floor(z / cell);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        for (const k of grid.get(`${i}|${j}`) ?? []) {
          const d = Math.hypot(pts[k][0] - x, pts[k][1] - z);
          if (d < bd) {
            bd = d;
            best = k;
          }
        }
      }
    }
    return { i: best, d: bd };
  };
  // The nodes on the course (where a short cut may leave or join it), and those just beside it.
  const on = new Map();
  const beside = new Uint8Array(nodes.length);
  nodes.forEach((nd, id) => {
    if (!nd.adj.length) return;
    const q = nearest(nd.x, nd.z);
    if (q.i < 0) return;
    if (q.d < 4.5) on.set(id, q.i);
    else if (q.d < 6) beside[id] = 1;
  });
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  const turnBy = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
  const courseDir = (k) => head(pts[(((k - 2) % n) + n) % n], pts[(k + 2) % n]);
  const found = [];
  for (const [a, ka] of on) {
    if (ka < 10 || ka > n - 20) continue;
    // Out along the narrow streets (never against a one-way), up to 450 m, until the course is met again.
    const dist = new Map([[a, 0]]);
    const prev = new Map();
    const heap = new Heap();
    heap.push(a, 0);
    while (heap.size) {
      const u = heap.pop();
      const du = dist.get(u);
      for (const e of nodes[u].adj) {
        if (e.against || !isSmall(e.cls) || e.width > narrowest) continue;
        const v = e.to;
        const d = du + e.len;
        if (d > 450 || d >= (dist.get(v) ?? Infinity)) continue;
        if (on.has(v)) {
          if (u === a) continue;
          // Back on the course: a short cut, if it goes the course's way.
          const kb = on.get(v);
          const span = S[kb] - S[ka];
          if (kb <= ka || kb > n - 8 || span < 40 || span > L * 0.45) {
            why?.push(kb <= ka ? 'backward' : kb > n - 8 ? 'line' : span < 40 ? 'short' : 'long');
            continue;
          }
          const way = [v, u];
          while (way.at(-1) !== a) way.push(prev.get(way.at(-1)));
          way.reverse();
          found.push({ a, b: v, ka, kb, way, len: d, span });
          continue;
        }
        if (beside[v]) continue;
        dist.set(v, d);
        prev.set(v, u);
        heap.push(v, d);
      }
    }
  }
  const out = [];
  const edge = (a, b) => nodes[a].adj.find((e) => e.to === b);
  for (const f of found) {
    // Worth the risk, but not a race-winner by itself: 15–230 m saved.
    if (f.span - f.len < Math.max(15, f.span * 0.1) || f.span - f.len > 230) {
      why?.push('saves');
      continue;
    }
    const ws = [];
    for (let i = 1; i < f.way.length; i++) ws.push(edge(f.way[i - 1], f.way[i]));
    const width = Math.min(...ws.map((e) => e.width));
    // (mostly golmok: at least 40% of it, or its narrowest, no wider than `pinch`)
    const tight = ws.reduce((t, e) => t + (e.width <= pinch ? e.len : 0), 0) / f.len;
    if (width > pinch || tight < 0.4) {
      why?.push('wide');
      continue;
    }
    // In off the course and back on at no more than a hard corner (never a turn-round).
    const first = nodes[f.way[1]];
    const last = nodes[f.way.at(-2)];
    if (turnBy(courseDir(f.ka), head([nodes[f.a].x, nodes[f.a].z], [first.x, first.z])) > 1.95) continue;
    if (turnBy(head([last.x, last.z], [nodes[f.b].x, nodes[f.b].z]), courseDir(f.kb)) > 1.95) continue;
    // Its points: from the course's point, along the golmok, to the course's point.
    const raw = [[pts[f.ka][0], pts[f.ka][1], ws[0].width, ws[0].cls, 0]];
    for (let i = 1; i < f.way.length - 1; i++) {
      const nd = nodes[f.way[i]];
      raw.push([nd.x, nd.z, ws[i - 1].width, ws[i - 1].cls, 0]);
    }
    raw.push([pts[f.kb][0], pts[f.kb][1], ws.at(-1).width, ws.at(-1).cls, 0]);
    let points = resample(raw, step);
    if (Math.hypot(points.at(-1)[0] - raw.at(-1)[0], points.at(-1)[1] - raw.at(-1)[1]) > 1.5) points.push(raw.at(-1).slice());
    else points[points.length - 1] = raw.at(-1).slice();
    if (walls) points = centreLine(points, walls, { open: true, reach: 2 });
    // No turn-round inside it either.
    let pin = false;
    for (let i = 2; i < points.length - 2; i++) if (turnBy(head(points[i - 2], points[i]), head(points[i], points[i + 2])) > 2.2) pin = true;
    if (pin) continue;
    // Not a lane running alongside the course (most of it well away from the course's line).
    const by = points.slice(2, -2).filter((p) => nearest(p[0], p[1]).d < 9).length;
    if (by > Math.max(2, (points.length - 4) * 0.35)) continue;
    const { s, length } = alongLine(points, true);
    out.push({ from: f.ka, to: f.kb, points, s, length, span: f.span, saves: f.span - length, width, roads: new Set(ws.map((e) => e.road.joined ?? e.road)), score: (f.span - length) * (1 + Math.max(0, 4.7 - width) * 0.4) });
  }
  // The best few, each over a stretch of its own (with room between).
  out.sort((x, y) => y.score - x.score || x.from - y.from);
  const kept = [];
  for (const c of out) {
    if (kept.length >= max) break;
    if (c.saves < 15) continue;
    if (kept.some((k) => c.from < k.to + 12 && k.from < c.to + 12)) continue;
    kept.push(c);
  }
  kept.sort((x, y) => x.from - y.from);
  return kept.map((c, k) => {
    delete c.score;
    return { id: `${course.id}-sc${k}`, ...c };
  });
}

/**
 * A planned course made ready to race: started where a grid fits (startOnBigRoad), moved into the
 * gaps between the buildings (centreLine), its short cuts found, and the room each point has
 * between the walls (roomOf) — the same everywhere for the same streets and buildings.
 */
export function finishCourse(planned, { walls = null, shortcuts = true } = {}) {
  if (planned.open) return finishOpen(planned, { walls });
  let c = startOnBigRoad(planned);
  if (walls) {
    const points = centreLine(c.points, walls);
    const { s, length } = alongLine(points);
    c = { ...c, points, s, length };
  }
  Object.defineProperty(c, 'graph', { enumerable: false, value: planned.graph });
  c.shortcuts = shortcuts ? planShortcuts(c, { walls }) : [];
  c.room = roomOf(c.points, walls);
  for (const sc of c.shortcuts) sc.room = roomOf(sc.points, walls, { open: true });
  return c;
}

/** Room behind the start line of a point-to-point course for the grid, and past its finish to stop in (m). */
export const OPEN_LEAD = 26;
export const OPEN_RUNOUT = 90;

/**
 * A point-to-point course made ready to race: moved into the gaps between the buildings, and its
 * start and finish lines placed — `startI` a little way in (the grid stands on the road behind it)
 * and `finishI` a run-out short of the end. Its `length` is the race: from line to line; `s` is
 * still measured from its first point. No short cuts.
 */
function finishOpen(planned, { walls = null } = {}) {
  const points = walls ? centreLine(planned.points, walls, { open: true }) : planned.points;
  const { s } = alongLine(points, true);
  const total = s.at(-1);
  const startI = Math.max(1, s.findIndex((v) => v >= OPEN_LEAD));
  let finishI = s.findIndex((v) => v >= total - OPEN_RUNOUT);
  if (finishI <= startI) finishI = points.length - 1;
  const c = { ...planned, points, s, open: true, startI, finishI, total, length: s[finishI] - s[startI] };
  Object.defineProperty(c, 'graph', { enumerable: false, value: planned.graph });
  c.shortcuts = [];
  c.room = roomOf(points, walls, { open: true });
  return c;
}

/**
 * Small streets that stop just short of the road they lead onto (or run a little way into it):
 * the map's alleys and its roads were drawn by different hands, so an alley's end is not always
 * a point of the road. Each such end (one no other street shares) within reach of another street
 * is carried on to the nearest point of that street's line, and that point added to the street —
 * so the alley meets the road at its middle, and the course can turn from one into the other.
 * Returns new roads (copies of the ones it changed); the rest are as they were.
 */
export function joinAlleys(roads, { reach = 6 } = {}) {
  const keyOf = (x, z) => key(x, z);
  const count = new Map();
  for (const r of roads) for (let i = 0; i < r.pts.length; i += 2) {
    const k = keyOf(r.pts[i], r.pts[i + 1]);
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  // Every street's segments by 20 m square.
  const cell = 20;
  const grid = new Map();
  roads.forEach((r, ri) => {
    for (let i = 2; i < r.pts.length; i += 2) {
      const ax = r.pts[i - 2];
      const az = r.pts[i - 1];
      const bx = r.pts[i];
      const bz = r.pts[i + 1];
      const seen = new Set();
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (cell / 2)));
      for (let s = 0; s <= steps; s++) {
        const k = `${Math.floor((ax + ((bx - ax) * s) / steps) / cell)}|${Math.floor((az + ((bz - az) * s) / steps) / cell)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([ri, i / 2 - 1]);
      }
    }
  });
  const adds = new Map(); // road index → [{ seg, t, x, z }]
  const ends = new Map(); // road index → { start?: [x, z], end?: [x, z] }
  roads.forEach((r, ri) => {
    if (!isSmall(r.cls)) return;
    const n = r.pts.length / 2;
    if (n < 2) return;
    for (const which of ['start', 'end']) {
      const i = which === 'start' ? 0 : n - 1;
      const x = r.pts[i * 2];
      const z = r.pts[i * 2 + 1];
      if ((count.get(keyOf(x, z)) ?? 0) > 1) continue;
      // which way the street runs out at this end
      const j = which === 'start' ? 1 : n - 2;
      const ox = x - r.pts[j * 2];
      const oz = z - r.pts[j * 2 + 1];
      const ol = Math.hypot(ox, oz) || 1;
      let best = null;
      const ci = Math.floor(x / cell);
      const cj = Math.floor(z / cell);
      for (let a = ci - 1; a <= ci + 1; a++) {
        for (let b = cj - 1; b <= cj + 1; b++) {
          for (const [rj, seg] of grid.get(`${a}|${b}`) ?? []) {
            if (rj === ri) continue;
            const q = roads[rj];
            const ax = q.pts[seg * 2];
            const az = q.pts[seg * 2 + 1];
            const bx = q.pts[seg * 2 + 2];
            const bz = q.pts[seg * 2 + 3];
            const ex = bx - ax;
            const ez = bz - az;
            const L2 = ex * ex + ez * ez || 1e-9;
            const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
            const fx = ax + ex * t;
            const fz = az + ez * t;
            const d = Math.hypot(fx - x, fz - z);
            // Within reach of the other street's edge — and ahead of the alley's end, or right on it (not back along it).
            const ahead = ((fx - x) * ox + (fz - z) * oz) / ol;
            if (d > (q.width || 6) / 2 + reach || (d > 1.5 && ahead < d * 0.3)) continue;
            if (!best || d < best.d) best = { d, rj, seg, t, x: fx, z: fz };
          }
        }
      }
      if (!best) continue;
      if (!adds.has(best.rj)) adds.set(best.rj, []);
      adds.get(best.rj).push(best);
      if (!ends.has(ri)) ends.set(ri, {});
      ends.get(ri)[which] = [best.x, best.z];
    }
  });
  if (!adds.size && !ends.size) return roads;
  return roads.map((r, ri) => {
    const add = adds.get(ri);
    const end = ends.get(ri);
    if (!add && !end) return r;
    const pts = [];
    const n = r.pts.length / 2;
    if (end?.start) pts.push(end.start[0], end.start[1]);
    for (let i = 0; i < n; i++) {
      pts.push(r.pts[i * 2], r.pts[i * 2 + 1]);
      for (const a of (add ?? []).filter((q) => q.seg === i && q.t > 0 && q.t < 1).sort((p, q) => p.t - q.t)) pts.push(a.x, a.z);
    }
    if (end?.end) pts.push(end.end[0], end.end[1]);
    // (points that fell right on one already there: once)
    const clean = [pts[0], pts[1]];
    for (let i = 2; i < pts.length; i += 2) if (Math.hypot(pts[i] - clean.at(-2), pts[i + 1] - clean.at(-1)) > 0.3) clean.push(pts[i], pts[i + 1]);
    return { ...r, pts: Float32Array.from(clean), joined: r };
  });
}
