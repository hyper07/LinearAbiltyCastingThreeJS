/**
 * Ability sigils for the HUD — drawn inline so they inherit `currentColor` (the
 * slot's `--accent`) and need no image assets.
 *
 * A 100×100 box, stroke only, so the mark reads the same at 34px in the ability
 * slot as it does scaled up.
 */

const WRAP = (body) =>
  `<svg class="glyph-svg" viewBox="0 0 100 100" aria-hidden="true" fill="none"
     stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/**
 * Ice — a six-fold snowflake over a rising lance.
 *
 * Three axes at 60°, each with a pair of barbs, and a heavier vertical that runs
 * past the star into a point: the star says frost, the point says skillshot.
 */
const ICE = WRAP(`
  <path d="M50 12V88"/>
  <path d="M17.5 30.5L82.5 69.5"/>
  <path d="M82.5 30.5L17.5 69.5"/>
  <path d="M50 24L41 33M50 24L59 33"/>
  <path d="M50 76L41 67M50 76L59 67"/>
  <path d="M27.5 36.5L27.7 49.2M27.5 36.5L38.5 30.4"/>
  <path d="M72.5 63.5L72.3 50.8M72.5 63.5L61.5 69.6"/>
  <path d="M72.5 36.5L72.3 49.2M72.5 36.5L61.5 30.4"/>
  <path d="M27.5 63.5L27.7 50.8M27.5 63.5L38.5 69.6"/>
`);

/**
 * Thunder — a bolt struck through a pair of arcs.
 *
 * The zigzag is drawn on the same diagonal the cast travels on, and the two
 * open arcs behind it read as the discharge spreading off it. Stroke only, like
 * the snowflake, so the two slots sit at the same visual weight.
 */
const THUNDER = WRAP(`
  <path d="M60 10L30 52H49L40 90L72 45H52L60 10Z"/>
  <path d="M23 26C13 36 11 52 17 65"/>
  <path d="M84 34C90 47 88 63 78 73"/>
`);

/**
 * Meteor — a cracked ball trailing fire.
 *
 * The circle sits forward and low with three seams splitting it, and three
 * tapering streaks run back up the same diagonal the other two sigils are drawn
 * on, so the slot reads as "the rock, thrown" at 34px.
 */
const METEOR = WRAP(`
  <circle cx="62" cy="62" r="24"/>
  <path d="M46 45L58 58L52 72M74 46L66 60L79 72M58 84L64 70"/>
  <path d="M30 70L10 90M40 34L18 22M22 48L4 44"/>
`);

/**
 * Beam — a charge held in a bracket, firing a cone.
 *
 * The orb sits low-left where the other three sigils start their diagonal, two
 * open brackets behind it read as the hands holding it, and three tapering rays
 * open out to the upper right with a single wave threaded through them: the
 * column, and the coil wrapped around it.
 */
const BEAM = WRAP(`
  <circle cx="27" cy="66" r="11"/>
  <path d="M13 55C7 62 7 74 13 81"/>
  <path d="M40 79C47 73 47 61 40 55"/>
  <path d="M41 57L92 20M42 66L94 50M43 75L92 80"/>
  <path d="M46 63C56 49 64 71 74 57C82 46 88 52 93 46"/>
`);

/**
 * Snare — a ring with a bolt standing in it.
 *
 * The only sigil in the set built around a *circle you look into* rather than a
 * diagonal, because that is the one thing this slot has to say before anything
 * else: it is not a skillshot, it is a footprint. The ellipse is the boundary
 * seen in perspective, four arcs step around it where the rim current runs, and
 * the zigzag rises out of the middle.
 */
const SNARE = WRAP(`
  <ellipse cx="50" cy="70" rx="38" ry="15"/>
  <path d="M12 70L4 70M88 70L96 70M31 82L27 89M69 82L73 89"/>
  <path d="M56 18L38 46H50L44 68"/>
  <path d="M50 55L62 40H52L58 26"/>
`);

/**
 * Glacier — a crown of blades standing on a ring.
 *
 * The second sigil built around a *circle you look into*, because it is the
 * second far cast and that is the first thing the slot has to say. Where the
 * Snare stands one bolt in the middle of its ellipse, this one stands the ring
 * itself up: five blades of uneven height rising off the boundary with the
 * spire tallest in the middle, which is the silhouette the ability actually
 * makes.
 */
const GLACIER = WRAP(`
  <ellipse cx="50" cy="74" rx="38" ry="13"/>
  <path d="M9 70L13 41L21 66"/>
  <path d="M24 65L30 31L37 60"/>
  <path d="M42 61L50 15L58 61"/>
  <path d="M63 60L70 31L76 65"/>
  <path d="M79 66L87 41L91 70"/>
`);

/** Arc Chain — a bolt that bends twice, hopping between three points. */
const CHAIN = WRAP(`
  <circle cx="18" cy="70" r="7"/>
  <circle cx="50" cy="30" r="7"/>
  <circle cx="82" cy="68" r="7"/>
  <path d="M24 64L33 52L29 49L44 36"/>
  <path d="M56 36L64 48L60 51L76 62"/>
`);

/** Void Orb — a ringed sphere with arcs reaching out of it. */
const ORB = WRAP(`
  <circle cx="50" cy="50" r="17"/>
  <ellipse cx="50" cy="50" rx="31" ry="10" transform="rotate(-25 50 50)"/>
  <path d="M68 28L78 18L76 26L86 22"/>
  <path d="M30 74L22 84L23 76L13 80"/>
`);

/** Hailstorm — a cloud with stones falling out of it. */
const HAIL = WRAP(`
  <path d="M24 52C13 52 12 36 24 35C25 22 43 18 49 29C56 18 76 22 75 36C88 36 88 52 76 52Z"/>
  <path d="M30 62L27 70M50 62L47 74M70 62L67 70M40 76L37 86M60 76L57 86"/>
`);

/** Blink Strike — a figure's path broken by a jump, landing in a burst. */
const BLINK = WRAP(`
  <path d="M12 72H30M38 72H46" stroke-dasharray="2 8"/>
  <path d="M56 72H70"/>
  <circle cx="78" cy="48" r="10"/>
  <path d="M78 22V30M78 66V74M54 48H60M96 48H90M61 31L66 36M95 31L90 36M61 65L66 60M95 65L90 60"/>
`);

/* --- Barbarian skills --------------------------------------------------- */

/** Earthsplitter — an axe head striking down onto a crack that runs away. */
const SLAM = WRAP(`
  <path d="M30 14L52 44"/>
  <path d="M22 26C30 14 44 12 50 22L38 34C33 30 27 29 22 26Z"/>
  <path d="M50 52L58 62L54 70L64 78L60 88"/>
  <path d="M30 60H70" stroke-dasharray="3 7"/>
`);

/** Rampage — a charging shoulder with speed lines behind it. */
const RAMPAGE = WRAP(`
  <path d="M60 30C74 30 84 40 84 54C84 66 74 74 62 74H52L46 56L60 30Z"/>
  <path d="M14 40H38M20 52H40M14 64H38"/>
`);

/** Battle Roar — an open mouth with sound rings going out. */
const ROAR = WRAP(`
  <path d="M34 40L50 34L66 40L60 62H40Z"/>
  <path d="M42 48L58 48"/>
  <path d="M22 30C14 42 14 58 22 70M78 30C86 42 86 58 78 70"/>
  <path d="M12 22C0 40 0 60 12 78M88 22C100 40 100 60 88 78"/>
`);

/** Skybreaker Leap — an arc through the air ending in an impact. */
const LEAP = WRAP(`
  <path d="M14 76C24 26 60 18 72 66" stroke-dasharray="3 7"/>
  <path d="M64 58L72 66L80 56"/>
  <path d="M56 82H88M62 74L56 66M82 74L88 66M72 70V62"/>
`);

/** Iron Tempest — two blades chasing each other round a circle. */
const TEMPEST = WRAP(`
  <path d="M50 18C70 18 82 30 82 50"/>
  <path d="M50 82C30 82 18 70 18 50"/>
  <path d="M74 36L82 50L88 38M26 64L18 50L12 62"/>
  <circle cx="50" cy="50" r="7"/>
`);

/** Worldbreaker — a fist on ground splitting three ways. */
const QUAKE = WRAP(`
  <path d="M36 18H64V40H36Z"/>
  <path d="M40 18V12M50 18V12M60 18V12"/>
  <path d="M14 56H86"/>
  <path d="M50 56L44 70L52 78L46 90M50 56L68 66L76 80M50 56L30 68L22 82"/>
`);

/** Keyed by the ids in `ELEMENTS`. */
export const ELEMENT_SIGILS = {
  ice: ICE,
  thunder: THUNDER,
  meteor: METEOR,
  beam: BEAM,
  snare: SNARE,
  glacier: GLACIER,
  chain: CHAIN,
  orb: ORB,
  hail: HAIL,
  blink: BLINK,
  slam: SLAM,
  rampage: RAMPAGE,
  roar: ROAR,
  leap: LEAP,
  tempest: TEMPEST,
  quake: QUAKE
};
