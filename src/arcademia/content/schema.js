/**
 * AI Arcademia's lesson format, and the check every lesson must pass
 * (tests/unit/arcademia.test.mjs runs it over all of them).
 *
 * A lesson is plain data:
 *
 *   id        'h3-silk-road'  — /^[mhp][1-9]-[a-z0-9-]+$/, unique; first letter is the subject
 *   subject   'math' | 'history' | 'physics'
 *   floor     1..FLOOR_COUNT  (floor 1 ≈ age 6–7 … floor 7 ≈ age 12–13)
 *   title     short, kid-friendly
 *   topic     a short key for "worth practising" in the parents' report ('fractions', 'ancient-egypt')
 *   topicName how that topic reads to a parent ('Fractions', 'Ancient Egypt')
 *   blurb     one line for the lesson card
 *   realm     (optional) 'forest' (content/forest.js, the Great Tree), 'sea' (content/sea.js, the Lagoon)
 *             or 'desert' (content/desert.js, the Desert of the Pyramids); land if absent
 *   reading   2–4 cards: { title, text, emoji? } — big friendly text, one idea a card
 *   quiz      3–5 questions: { q, choices[2–4], answer (index), hint, explain }
 *             — or, for math, { gen, count } to draw them from a generator (math.js)
 *
 * And one interactive part, by subject:
 *
 *   math      board    the worked example written on the chalkboard: { gen } (math.js draws it)
 *             practice { kind: one of PRACTICE_KINDS, gen }
 *   history   dialogue { npc: { name, role, look (LOOKS), portrayal: 'generic'|'portrayal' },
 *                        intro, topics: [{ ask, answer }] (3–5), challenge: { q, choices, answer, explain }, farewell }
 *                        'portrayal' = an educational portrayal of a real person; the game labels it so
 *             timeline { title, events: [{ label, year (number, BCE negative), when (how it reads) }] } (4–6)
 *             artifact { model (ARTIFACTS), name, text }
 *   physics   sim      { id (SIMS), setup?: {...}, predict: { q, choices, answer, explain } }
 */

export const SUBJECTS = ['math', 'history', 'physics'];
export const SUBJECT_NAMES = { math: 'Math', history: 'History', physics: 'Physics' };
export const FLOOR_COUNT = 7;
/** The study worlds' realms (maps.js): each has its own lessons. */
export const REALM_IDS = ['land', 'forest', 'sea', 'desert'];

/** Costumes the history hall can dress a guide in (world/figures.js draws them). */
export const LOOKS = [
  'guide', 'stone-age', 'egypt', 'mesopotamia', 'greece', 'rome', 'china', 'silk-road', 'viking',
  'knight', 'castle-cook', 'maya', 'mali', 'printer', 'explorer', 'inventor', 'factory',
  'scientist', 'pilot', 'astronaut', 'nurse', 'farmer',
  // the sea islands
  'sailor', 'diver', 'wayfinder', 'keeper',
  // the Great Tree
  'ranger', 'botanist',
  // the Desert of the Pyramids
  'nile', 'scribe', 'caravan', 'archaeologist'
];

/** Objects the museum turntable can show (world/artifacts.js models them). */
export const ARTIFACTS = [
  'hand-axe', 'cave-painting', 'clay-tablet', 'pyramid', 'scarab', 'amphora', 'greek-column',
  'roman-arch', 'coin', 'scroll', 'silk-bolt', 'compass', 'viking-ship', 'helmet', 'castle',
  'printing-press', 'globe', 'telescope', 'steam-engine', 'lightbulb', 'telephone', 'airplane',
  'rocket', 'moon-boot', 'computer', 'abacus', 'sundial', 'wheel',
  // the sea islands
  'anchor', 'conch', 'ship-wheel', 'diving-helmet', 'pearl', 'message-bottle',
  // the Great Tree
  'acorn', 'pinecone', 'tree-ring', 'magnifier',
  // the Desert of the Pyramids
  'shadoof', 'senet', 'papyrus', 'salt-slab', 'cubit-rod', 'obelisk', 'rosetta-stone', 'astrolabe', 'manuscript',
  'golden-mask', 'temple-statue'
];

/**
 * Physics sims (lesson/sims.js) and the setup each one takes. Every sim
 * runs as: predict (the lesson's predict question) → watch → play.
 */
export const SIMS = {
  drop: { what: 'Drop two things at once, with air or in a vacuum.', setup: { objects: 'two of DROP_OBJECTS', air: "'toggle' | 'on' | 'off'", world: "'earth' | 'moon' (optional)" } },
  ramp: { what: 'A toy car rolls down a ramp onto different floors; tilt the ramp.', setup: { surfaces: 'two or three of RAMP_SURFACES' } },
  pendulum: { what: 'A swinging weight; change the string length and the weight.', setup: {} },
  lever: { what: 'A seesaw: place weights, move the pivot, make it balance.', setup: {} },
  magnet: { what: 'Bring a magnet to everyday things: which stick?', setup: { items: 'four to six of MAGNET_ITEMS' } },
  shadow: { what: 'Move a torch around a toy; watch its shadow grow and shrink.', setup: {} },
  circuit: { what: 'A battery, a bulb and a gap: bridge the gap with different things; a switch.', setup: { items: 'four to six of CIRCUIT_ITEMS' } },
  float: { what: 'Drop things into a tank of water: float or sink?', setup: { items: 'four to six of FLOAT_ITEMS' } },
  sound: { what: 'Pluck a ruler or string: shorter makes a higher note, harder makes a louder one.', setup: {} },
  states: { what: 'Heat or cool water: ice, liquid water, steam; a thermometer in °C.', setup: {} },
  orbit: { what: 'Launch a moon around a planet: too slow falls, too fast flies away.', setup: {} },
  mirror: { what: 'Turn a mirror to bounce a light beam onto a target; angle in equals angle out.', setup: {} },
  race: { what: 'Two carts race: set speed and time, see distance = speed × time.', setup: {} }
};
export const DROP_OBJECTS = ['ball', 'feather', 'paper', 'crumpled-paper', 'bowling-ball', 'hammer'];
export const RAMP_SURFACES = ['ice', 'wood', 'carpet', 'sand'];
/** true = a magnet attracts it. */
export const MAGNET_ITEMS = { 'paper-clip': true, 'iron-nail': true, 'steel-bolt': true, eraser: false, 'wooden-block': false, 'aluminium-can': false, 'glass-marble': false, 'plastic-toy': false, pencil: false, 'rubber-band': false };
/** true = it conducts electricity (the bulb lights). */
export const CIRCUIT_ITEMS = { 'copper-wire': true, 'paper-clip': true, 'aluminium-foil': true, 'iron-nail': true, 'rubber-band': false, 'wooden-stick': false, 'plastic-straw': false, 'paper-strip': false, eraser: false };
/** true = it floats in fresh water. */
export const FLOAT_ITEMS = { apple: true, 'wooden-block': true, cork: true, 'rubber-duck': true, 'ice-cube': true, 'candle-wax': true, stone: false, coin: false, key: false, 'glass-marble': false, 'metal-spoon': false };

export const PRACTICE_KINDS = ['count', 'numberline', 'place-value', 'column', 'array', 'pizza', 'balance', 'grid'];

const ID = /^([mhp])([1-9])-[a-z0-9-]+$/;
const LETTER = { m: 'math', h: 'history', p: 'physics' };

/** Problems with one question: [] when it is fine. */
export function questionProblems(q, where = 'question') {
  const out = [];
  if (!q || typeof q !== 'object') return [`${where}: not an object`];
  if (typeof q.q !== 'string' || q.q.trim().length < 3) out.push(`${where}: no question text`);
  if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) out.push(`${where}: 2–4 choices`);
  else {
    if (q.choices.some((c) => typeof c !== 'string' || !c.trim())) out.push(`${where}: a choice is empty`);
    if (new Set(q.choices.map((c) => String(c).trim().toLowerCase())).size !== q.choices.length) out.push(`${where}: two choices are the same`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) out.push(`${where}: answer is not one of the choices`);
  }
  if ('hint' in q || where.includes('quiz')) if (typeof q.hint !== 'string' || q.hint.trim().length < 3) out.push(`${where}: no hint`);
  if (typeof q.explain !== 'string' || q.explain.trim().length < 3) out.push(`${where}: no explanation`);
  return out;
}

/** Problems with one lesson: [] when it is well-formed. `gens` = the math generators by id. */
export function lessonProblems(lesson, { gens = {} } = {}) {
  const out = [];
  const m = ID.exec(lesson?.id ?? '');
  if (!m) return [`bad id ${lesson?.id}`];
  const at = lesson.id;
  if (LETTER[m[1]] !== lesson.subject) out.push(`${at}: subject does not match the id`);
  if (Number(m[2]) !== lesson.floor || lesson.floor < 1 || lesson.floor > FLOOR_COUNT) out.push(`${at}: floor does not match the id`);
  if (lesson.realm != null && !REALM_IDS.includes(lesson.realm)) out.push(`${at}: realm is one of ${REALM_IDS.join(', ')}`);
  for (const key of ['title', 'topic', 'topicName', 'blurb']) if (typeof lesson[key] !== 'string' || !lesson[key].trim()) out.push(`${at}: no ${key}`);
  if (!/^[a-z0-9-]+$/.test(lesson.topic ?? '')) out.push(`${at}: topic is a short key`);
  if (!Array.isArray(lesson.reading) || lesson.reading.length < 2 || lesson.reading.length > 4) out.push(`${at}: 2–4 reading cards`);
  else lesson.reading.forEach((c, i) => {
    if (typeof c.title !== 'string' || !c.title.trim() || typeof c.text !== 'string' || c.text.trim().length < 20) out.push(`${at}: reading card ${i + 1} needs a title and text`);
  });
  // The check.
  if (Array.isArray(lesson.quiz)) {
    if (lesson.quiz.length < 3 || lesson.quiz.length > 5) out.push(`${at}: 3–5 quiz questions`);
    lesson.quiz.forEach((q, i) => out.push(...questionProblems(q, `${at} quiz ${i + 1}`)));
  } else if (lesson.quiz?.gen) {
    if (!gens[lesson.quiz.gen]) out.push(`${at}: no generator ${lesson.quiz.gen}`);
    if (!(lesson.quiz.count >= 3 && lesson.quiz.count <= 5)) out.push(`${at}: 3–5 quiz questions`);
  } else out.push(`${at}: no quiz`);
  // The interactive part.
  if (lesson.subject === 'math') {
    if (!gens[lesson.board?.gen]) out.push(`${at}: the chalkboard needs a generator`);
    if (!PRACTICE_KINDS.includes(lesson.practice?.kind)) out.push(`${at}: practice kind`);
    if (!gens[lesson.practice?.gen]) out.push(`${at}: practice needs a generator`);
  }
  if (lesson.subject === 'history') {
    const d = lesson.dialogue;
    if (!d?.npc?.name || !d.npc.role || !LOOKS.includes(d.npc.look) || !['generic', 'portrayal'].includes(d.npc.portrayal)) out.push(`${at}: dialogue npc (name, role, look, portrayal)`);
    if (typeof d?.intro !== 'string' || typeof d?.farewell !== 'string') out.push(`${at}: dialogue intro and farewell`);
    if (!Array.isArray(d?.topics) || d.topics.length < 3 || d.topics.length > 5 || d.topics.some((t) => !t.ask || !t.answer)) out.push(`${at}: 3–5 dialogue topics`);
    out.push(...questionProblems(d?.challenge, `${at} challenge`));
    const ev = lesson.timeline?.events;
    if (!lesson.timeline?.title || !Array.isArray(ev) || ev.length < 4 || ev.length > 6) out.push(`${at}: timeline of 4–6 events`);
    else {
      if (ev.some((e) => !e.label || !Number.isFinite(e.year) || !e.when)) out.push(`${at}: each timeline event needs label, year, when`);
      if (new Set(ev.map((e) => e.year)).size !== ev.length) out.push(`${at}: timeline years must differ`);
    }
    if (!ARTIFACTS.includes(lesson.artifact?.model) || !lesson.artifact?.name || !lesson.artifact?.text) out.push(`${at}: artifact (model, name, text)`);
  }
  if (lesson.subject === 'physics') {
    const s = lesson.sim;
    if (!SIMS[s?.id]) out.push(`${at}: sim id`);
    else {
      const setup = s.setup ?? {};
      const listOk = (list, allowed, min, max) => Array.isArray(list) && list.length >= min && list.length <= max && list.every((x) => allowed.includes(x)) && new Set(list).size === list.length;
      if (s.id === 'drop' && !listOk(setup.objects ?? ['ball', 'feather'], DROP_OBJECTS, 2, 2)) out.push(`${at}: drop objects`);
      if (s.id === 'ramp' && !listOk(setup.surfaces ?? ['ice', 'wood', 'carpet'], RAMP_SURFACES, 2, 3)) out.push(`${at}: ramp surfaces`);
      if (s.id === 'magnet' && !listOk(setup.items, Object.keys(MAGNET_ITEMS), 4, 6)) out.push(`${at}: magnet items`);
      if (s.id === 'circuit' && !listOk(setup.items, Object.keys(CIRCUIT_ITEMS), 4, 6)) out.push(`${at}: circuit items`);
      if (s.id === 'float' && !listOk(setup.items, Object.keys(FLOAT_ITEMS), 4, 6)) out.push(`${at}: float items`);
    }
    out.push(...questionProblems(s?.predict, `${at} predict`));
  }
  return out;
}
