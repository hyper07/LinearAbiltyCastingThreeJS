import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { lessonProblems, ACTIVITIES } from '../../src/arcademia/content/schema.js';
import {
  sortsInto, mapRegions, regionAt, centreOf, compassFrom, bearing, MAP_PRESETS, MAP_DECOR, cipherFor, decodes, charsOf, GLYPHS,
  orderNext, fuelAfter, runRover, solveRover, countBlocks, onsets, judgeEcho, barGap, noteFreq, fractionOf, matchOrder, shuffled, rng
} from '../../src/arcademia/content/games.js';
import { DEMO_LESSONS } from '../fixtures/arcademia-activities.js';
import en from '../../src/arcademia/i18n/locales/en/index.js';

const KINDS = ['sort', 'maphunt', 'dig', 'countdown', 'rover', 'rhythm'];
const clone = (x) => JSON.parse(JSON.stringify(x));
/** A demo lesson with its game data changed by `fn`: → its problems. */
const problemsWith = (kind, fn) => {
  const l = clone(DEMO_LESSONS[kind]);
  fn(l[kind], l);
  return lessonProblems(l);
};
const has = (problems, re) => problems.some((p) => re.test(p));

test('activities: the six signature games are activity kinds, and each demo lesson passes the check', () => {
  for (const k of KINDS) {
    assert.ok(ACTIVITIES[k]?.check, k);
    assert.deepEqual(ACTIVITIES[k].steps, [k]);
    const l = DEMO_LESSONS[k];
    assert.deepEqual(l.activities, ['story', 'learn', k, 'challenge']);
    assert.deepEqual(lessonProblems(l), [], l.id);
  }
  // A kind's data missing altogether says what it needs.
  for (const k of KINDS) {
    const l = clone(DEMO_LESSONS[k]);
    delete l[k];
    assert.ok(has(lessonProblems(l), new RegExp(`needs ${k}`)), k);
  }
});

/* ---------------------------------------------------------------- sort */

test('sort: checks groups, items and the rule round', () => {
  assert.ok(sortsInto({ group: 'bird' }, 'bird') && !sortsInto({ group: 'bird' }, 'fish'));
  assert.ok(has(problemsWith('sort', (s) => (s.groups = s.groups.slice(0, 1))), /2–4 groups/));
  assert.ok(has(problemsWith('sort', (s) => (s.items[3].group = 'reptile')), /item 4's group "reptile"/));
  assert.ok(has(problemsWith('sort', (s) => (s.items[4].label = 'Rabbit')), /item labels must differ/));
  assert.ok(has(problemsWith('sort', (s) => (s.items = s.items.filter((i) => i.group !== 'fish'))), /group "fish" has no items/));
  assert.ok(has(problemsWith('sort', (s) => (s.items[2].given = false)), /group "fish" needs a given example/));
  assert.ok(has(problemsWith('sort', (s) => delete s.rule), /given items need a rule question/));
  assert.ok(has(problemsWith('sort', (s) => (s.rule.answer = 5)), /rule: answer is not the index/));
  assert.ok(has(problemsWith('sort', (s) => (s.groups[1].id = 'Bird!')), /group needs an id/));
  // Plain sorting (no rule, nothing given) is fine.
  assert.deepEqual(problemsWith('sort', (s) => {
    delete s.rule;
    for (const i of s.items) delete i.given;
  }), []);
});

/* ---------------------------------------------------------------- maphunt */

test('maphunt: the ready maps — every place is where its name is, taps find the topmost place, the compass points the way', () => {
  for (const [name, regions] of Object.entries(MAP_PRESETS)) {
    const rs = mapRegions(name);
    assert.equal(new Set(rs.map((r) => r.id)).size, rs.length, name);
    for (const r of rs) {
      assert.equal(regionAt(rs, centreOf(r)), r.id, `${name}: ${r.id}'s label sits on it`);
      assert.ok(en.games[`act.map.${r.id}`], `${r.id} has a name`);
    }
    assert.equal(regions.length, rs.length);
    // The little pictures sit on the map, never on a place's name.
    for (const [emoji, x, y] of MAP_DECOR[name]) {
      assert.ok(regionAt(rs, [x, y]), `${name}: ${emoji} is on the map`);
      assert.ok(rs.every((r) => Math.hypot(centreOf(r)[0] - x, centreOf(r)[1] - y) > 2.5), `${name}: ${emoji} clear of the names`);
    }
  }
  const world = mapRegions('world');
  assert.equal(regionAt(world, [5, 30]), 'pacific');
  assert.equal(regionAt(world, [96, 30]), 'pacific', 'the Pacific wraps round both edges');
  assert.equal(regionAt(world, [40, 40]), 'atlantic');
  assert.equal(regionAt(world, [55, 30]), 'africa', 'a continent is over the sea under it');
  assert.equal(regionAt(world, [50, 58]), 'antarctica');
  assert.equal(compassFrom([10, 30], [80, 30]), 'e');
  assert.equal(compassFrom([50, 50], [50, 10]), 'n');
  assert.equal(compassFrom([20, 20], [60, 50]), 'se');
  assert.equal(compassFrom([50, 30], [51, 31]), null, 'right next to it');
  assert.equal(Math.round(bearing([0, 0], [10, 0])), 90);
  // A custom map.
  const custom = mapRegions({ regions: [{ id: 'a', label: 'A', points: [[0, 0], [50, 0], [50, 60], [0, 60]] }, { id: 'b', label: 'B', kind: 'water', points: [[50, 0], [100, 0], [100, 60], [50, 60]] }] });
  assert.equal(regionAt(custom, [75, 20]), 'b');
  assert.equal(custom[1].kind, 'water');
});

test('maphunt: checks the map and the clues', () => {
  assert.ok(has(problemsWith('maphunt', (m) => (m.map = 'mars')), /map is one of world, island/));
  assert.ok(has(problemsWith('maphunt', (m) => (m.clues[0].region = 'atlantis')), /clue 1's region "atlantis" is not on the map/));
  assert.ok(has(problemsWith('maphunt', (m) => (m.clues[1].region = 'pacific')), /each clue looks for a different place/));
  assert.ok(has(problemsWith('maphunt', (m) => (m.clues = m.clues.slice(0, 1))), /2–6 clues/));
  assert.ok(has(problemsWith('maphunt', (m) => delete m.clues[2].hint), /clue 3 needs q and hint/));
  const island = { regions: [{ id: 'hill', label: 'The hill', points: [[10, 10], [40, 10], [25, 40]] }, { id: 'bay', label: 'The bay', kind: 'water', points: [[[50, 10], [90, 10], [70, 50]], [[0, 50], [10, 50], [5, 58]]] }] };
  assert.deepEqual(problemsWith('maphunt', (m) => {
    m.map = island;
    m.clues = [{ q: 'Where is the hill?', region: 'hill', hint: 'It is high up.' }, { q: 'Where is the bay?', region: 'bay', hint: 'Water!' }];
  }), []);
  assert.ok(has(problemsWith('maphunt', (m) => {
    m.map = clone(island);
    m.map.regions[0].points[1] = [140, 10];
    m.clues = [{ q: 'Where is the hill?', region: 'hill', hint: 'It is high up.' }, { q: 'Where is the bay?', region: 'bay', hint: 'Water!' }];
  }), /must fit the 100 × 60 map/));
  assert.ok(has(problemsWith('maphunt', (m) => (m.map = { regions: [{ id: 'x', label: 'X', points: [[1, 1]] }, { id: 'y', label: 'Y', points: [[1, 1], [2, 2], [3, 1]] }] })), /region 1 needs points/));
});

/* ---------------------------------------------------------------- dig */

test('dig: a symbol code for any language — every letter has one symbol, decoys for Latin, the same seed the same code', () => {
  const c = cipherFor('NILE', 7);
  assert.equal(c.code.length, 4);
  assert.deepEqual(c.code.map((x) => x.ch), ['N', 'I', 'L', 'E']);
  assert.equal(c.key.length, 6, 'four letters and two decoys');
  assert.equal(new Set(c.key.map((k) => k.sym)).size, c.key.length, 'every symbol different');
  for (const x of c.code) assert.equal(c.key.find((k) => k.ch === x.ch).sym, x.sym);
  assert.ok(c.key.every((k) => GLYPHS.includes(k.sym)));
  assert.deepEqual(cipherFor('NILE', 7), c);
  assert.ok(decodes(c, 0, 'N') && decodes(c, 0, 'n') && !decodes(c, 0, 'I'));
  // Repeated letters share their symbol; spaces stay spaces.
  const r = cipherFor('ra ra', 3);
  assert.equal(r.code[2].space, true);
  assert.equal(r.code[0].sym, r.code[3].sym);
  // Korean, Chinese, Japanese and digits.
  for (const msg of ['나일', '尼罗河', 'ナイル', '1922']) {
    const k = cipherFor(msg, 1);
    assert.deepEqual(k.code.map((x) => x.ch).join(''), msg);
    assert.ok(charsOf(msg).every((ch) => k.key.some((p) => p.ch === ch)), msg);
  }
  assert.equal(cipherFor('1922', 1).key.length, 3 + 2, 'digits get digit decoys');
  assert.equal(cipherFor('尼罗河', 1).key.length, 3, 'no decoys outside Latin letters and digits');
});

test('dig: checks the site and its finds', () => {
  assert.ok(has(problemsWith('dig', (d) => (d.w = 12)), /3–7 squares wide/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[0].at = [9, 9])), /find 1: at \[x, y\] inside the site/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[1].at = [1, 1])), /two finds in one square/));
  assert.ok(has(problemsWith('dig', (d) => delete d.finds[0].question), /find 1: needs a question or a decode puzzle/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[1].question = d.finds[0].question)), /find 2: needs a question or a decode puzzle \(one of them\)/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[1].decode.message = 'ABCDEFGHIJKLM')), /2–12 letters/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[1].decode.message = 'ABCDEFGHIJK')), /at most 10 different letters/));
  assert.ok(has(problemsWith('dig', (d) => (d.finds[0].question.choices = ['Water'])), /find 1 question: 2–4 choices/));
});

/* ---------------------------------------------------------------- countdown */

test('countdown: ordering, the fuel tank, and the checks', () => {
  const order = [5, 4, 3, 2, 1];
  assert.equal(orderNext(order, 0), 5);
  assert.equal(orderNext(order, 3), 2);
  assert.equal(fuelAfter(0, 3), 0);
  assert.equal(fuelAfter(2, 4), 0.5);
  assert.equal(fuelAfter(5, 3), 1);
  const s = shuffled(order, rng(4));
  assert.notDeepEqual(s, order, 'a shuffle is never the answer');
  assert.deepEqual([...s].sort(), [...order].sort());
  assert.ok(has(problemsWith('countdown', (c) => (c.target = 'pluto')), /target is one of moon, mars, orbit, stars/));
  assert.ok(has(problemsWith('countdown', (c) => (c.from = 20)), /from \(the last countdown\) is 3–10/));
  assert.ok(has(problemsWith('countdown', (c) => (c.steps[0].order = [1, 1, 2])), /the things to order must differ/));
  assert.ok(has(problemsWith('countdown', (c) => (c.steps[0].order = [1, 2])), /order 3–6 things/));
  assert.ok(has(problemsWith('countdown', (c) => (c.steps = c.steps.slice(0, 1))), /2–6 steps/));
  assert.ok(has(problemsWith('countdown', (c) => delete c.steps[1].explain), /step 2: no explanation/));
});

/* ---------------------------------------------------------------- rover */

const P = { w: 5, h: 4, start: [0, 3, 'E'], samples: [[3, 3]], rocks: [[1, 2]], blocks: ['forward', 'left', 'right', 'repeat'], max: 8, hint: 'Go!' };

test('rover: programs run block by block — moves, turns, loops, bumps, the edge, pick-ups, the goal', () => {
  // Straight there: driving over a sample collects it when there is no pick-up block.
  let r = runRover(P, ['forward', 'forward', 'forward']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.trace.map((s) => [s.x, s.y]), [[1, 3], [2, 3], [3, 3]]);
  assert.equal(r.trace[2].got, true);
  // A loop: repeat 3 × forward, each step knows its place inside the loop.
  r = runRover(P, [{ repeat: 3, do: ['forward'] }]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.trace.map((s) => s.at), [[0, 0], [0, 0], [0, 0]]);
  assert.equal(countBlocks([{ repeat: 3, do: ['forward', 'left'] }, 'forward']), 4);
  // Turns: left from east is north.
  r = runRover(P, ['left', 'forward']);
  assert.equal(r.trace[0].dir, 'N');
  assert.deepEqual([r.trace[1].x, r.trace[1].y], [0, 2]);
  assert.equal(r.reason, 'samples');
  assert.equal(r.left, 1);
  // A rock: it stops at the bump, and the failing block is the second forward inside the loop.
  r = runRover(P, ['left', 'right', 'left', 'forward', 'right', { repeat: 2, do: ['forward'] }]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'rock');
  assert.deepEqual(r.failAt, [5, 0]);
  assert.equal(r.trace.at(-1).ev, 'bump');
  // The edge of the map.
  r = runRover(P, ['right', 'forward']);
  assert.equal(r.reason, 'edge');
  assert.deepEqual(r.failAt, [1]);
  // With a pick-up block, samples must be picked up.
  const pick = { ...P, blocks: ['forward', 'pick'] };
  assert.equal(runRover(pick, ['forward', 'forward', 'forward']).reason, 'samples');
  r = runRover(pick, ['forward', 'forward', 'forward', 'pick']);
  assert.equal(r.ok, true);
  assert.equal(runRover(pick, ['pick']).trace[0].got, false, 'picking up nothing is fine, just empty');
  // A goal to end on.
  const home = { ...P, goal: [4, 3] };
  assert.equal(runRover(home, ['forward', 'forward', 'forward']).reason, 'goal');
  assert.equal(runRover(home, ['forward', 'forward', 'forward', 'forward']).ok, true);
  // Nested loops never run away: a step cap.
  assert.ok(runRover({ ...P, w: 8 }, [{ repeat: 9, do: ['left'] }], { maxSteps: 5 }).trace.length <= 5);
});

test('rover: the solver finds the shortest way, and the check refuses puzzles nobody can solve', () => {
  assert.deepEqual(solveRover(P), ['forward', 'forward', 'forward']);
  const walled = { ...P, rocks: [[1, 3], [0, 2]] };
  assert.equal(solveRover(walled), null);
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].rocks = [[1, 3], [0, 2]])), /no program can solve it/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].max = 3)), /needs 6 blocks but only 3 fit/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[1].program = [{ repeat: 4, do: ['forward'] }, 'pick'])), /already works/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[1].program = [{ repeat: 4, do: [{ repeat: 2, do: ['forward'] }] }])), /uses only its blocks/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].program = [{ repeat: 2, do: ['forward'] }])), /uses only its blocks/), 'no repeat block in the first puzzle');
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].rocks.push([0, 3]))), /a rock sits on the start/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].start = [0, 3, 'X'])), /start is \[x, y/));
  assert.ok(has(problemsWith('rover', (r) => (r.puzzles[0].blocks = ['left', 'jump'])), /blocks are some of/));
  // The demo's fix-the-bug puzzle: the bug is one forward too few.
  const fix = DEMO_LESSONS.rover.rover.puzzles[1];
  assert.equal(runRover(fix, fix.program).reason, 'samples');
  assert.equal(runRover(fix, [{ repeat: 4, do: ['forward'] }, 'pick']).ok, true);
});

/* ---------------------------------------------------------------- rhythm */

test('rhythm: note timing, the tap judge (with its friendly window), bars and bells', () => {
  assert.deepEqual(onsets([1, 1, 2]), [0, 1, 2]);
  assert.deepEqual(onsets([1, -1, 0.5, 0.5, 1]), [0, 2, 2.5, 3]);
  assert.deepEqual(onsets([-1, 1, 1]), [0, 1], 'a leading rest is dropped');
  const beat = 60000 / 90; // ≈ 667 ms
  const want = [0, beat, 2 * beat];
  assert.equal(judgeEcho([1, 1, 2], 90, want.map((x) => 5000 + x)).ok, true, 'any start time');
  assert.equal(judgeEcho([1, 1, 2], 90, [0, beat + 180, 2 * beat - 150]).ok, true, 'within a third of a beat');
  const late = judgeEcho([1, 1, 2], 90, [0, beat + 320, 2 * beat]);
  assert.equal(late.ok, false, 'half a beat late is a miss');
  assert.deepEqual(late.hits, [true, false, true]);
  assert.equal(judgeEcho([1, 1, 2], 90, [0, beat + 320, 2 * beat], 0.5).ok, true, 'a wider window for little ones');
  assert.equal(judgeEcho([1, 1, 2], 90, [0, beat]).ok, false, 'a note with no tap');
  assert.equal(judgeEcho([1, 1, 2], 90, [0, beat, 1.5 * beat, 2 * beat]).ok, true, 'one stray tap is forgiven');
  const many = judgeEcho([1, 1, 2], 90, [0, 0.5 * beat, beat, 1.5 * beat, 2 * beat]);
  assert.equal(many.ok, false, 'two stray taps are not');
  assert.equal(many.extra, 2);
  assert.equal(judgeEcho([1, 1], 90, []).ok, false);
  assert.equal(barGap([1, 1, 0]), 2);
  assert.equal(barGap([2, 0, 0.5, 0.5]), 1);
  assert.equal(barGap([0, -2, 1]), 1, 'rests count');
  assert.equal(fractionOf(4), '1');
  assert.equal(fractionOf(2), '1/2');
  assert.equal(fractionOf(0.5), '1/8');
  assert.equal(noteFreq('A4'), 440);
  assert.ok(Math.abs(noteFreq('C5') - 523.25) < 0.01);
  assert.ok(Math.abs(noteFreq('F#4') - 369.99) < 0.01);
  assert.equal(noteFreq('H2'), null);
  const order = matchOrder(3, 6, 42);
  assert.equal(order.length, 6);
  assert.ok(order.every((x, i) => x >= 0 && x < 3 && x !== order[i - 1]), 'never the same bell twice running');
  assert.deepEqual(matchOrder(3, 6, 42), order);
});

test('rhythm: checks each round', () => {
  assert.ok(has(problemsWith('rhythm', (r) => (r.tempo = 300)), /tempo is 60–160/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[0].mode = 'dance')), /mode is one of echo, notes, match/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[0].pattern = [1, 3])), /echo pattern is 2–8 note lengths/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[0].pattern = [-1, 1])), /starts with a note/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[0].tolerance = 0.9)), /tolerance/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[1].choices = [4, 1])), /the note that fills the gap \(2\) is not a choice/));
  assert.ok(has(problemsWith('rhythm', (r) => {
    r.rounds[1].pattern = [2, 1, 0];
    r.rounds[1].choices = [4, 2];
  }), /fills the gap \(1\) is not a choice/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[1].pattern = [2, 2, 0])), /the gap must be one note long/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[1].pattern = [1, 0, 0])), /one gap/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[2].pairs[1].note = 'C5')), /each pair rings a different note/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[2].pairs[1].note = 'Z9')), /each pair needs a label and a note/));
  assert.ok(has(problemsWith('rhythm', (r) => (r.rounds[2].pairs[1].color = 'blue')), /a colour is #rrggbb/));
});

/* ---------------------------------------------------------------- every string the games show exists */

test('activities: every UI string the games use is written (games.js), in English at least', () => {
  const dir = new URL('../../src/arcademia/lesson/games/', import.meta.url);
  const src = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const keys = new Set([...src.matchAll(/tr\(\s*'([a-z]+\.[A-Za-z0-9_.-]+)'/g)].map((m) => m[1]));
  for (const m of src.matchAll(/tr\(\s*[a-z]+\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/g)) keys.add(m[1]).add(m[2]);
  const strings = Object.assign({}, ...Object.values(en));
  const missing = [...keys].filter((k) => !(k in strings) && !(`${k}_other` in strings));
  assert.deepEqual(missing, []);
  assert.ok(keys.size > 100, `found ${keys.size} keys`);
  // The ones made up from data: directions, compass letters, targets, blocks, note names.
  for (const d of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'middle']) assert.ok(strings[`act.dir.${d}`]);
  for (const d of ['n', 'e', 's', 'w']) assert.ok(strings[`act.compass.${d}`]);
  for (const x of ['moon', 'mars', 'orbit', 'stars']) assert.ok(strings[`act.cd.target.${x}`]);
  for (const x of ['forward', 'left', 'right', 'repeat', 'pick']) assert.ok(strings[`act.rover.b.${x}`]);
  for (const x of ['whole', 'half', 'quarter', 'eighth']) assert.ok(strings[`act.rhythm.note.${x}`]);
});
