/**
 * Math: generators and lessons.
 *
 * Every generator takes a seeded random stream and returns one problem:
 *
 *   { q, choices, answer, hint, explain, data, board? }
 *
 * `data` holds the numbers, so a test can work the answer out again on its
 * own (tests/unit/arcademia.test.mjs); `board(data)` writes the worked
 * example on the chalkboard as a list of chalk steps (lesson/chalkboard.js):
 *
 *   { t: 'text', s, x, y, size?, c?, align? }     chalk letters, written left to right
 *   { t: 'line', pts: [[x, y], …], c? }           a hand-drawn line
 *   { t: 'circle', x, y, r, c?, fill? }           a ring, or a dot when filled
 *   { t: 'rect', x, y, w, h, c?, fill? }
 *   { t: 'hop', x1, x2, y, h, c? }                a jump arrow over a number line
 *   { t: 'pizza', x, y, r, parts, shaded, c? }    a pizza cut in equal slices
 *   { t: 'cross', x, y, s, c? }                   a cross-out
 *   { t: 'say', s }                               the teacher's line under the board
 *   { t: 'pause', ms }
 *
 * The board is 1600 × 800. Chalk colours: w white, y yellow, p pink, b blue, g green.
 */

/** mulberry32: the same seed gives the same questions everywhere. */
export function rng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, list) => list[Math.floor(r() * list.length)];

/**
 * Four choices round a numeric answer: near misses a child really makes,
 * never negative unless the answer may be, all different, shuffled.
 */
function numberChoices(r, answer, misses = [], { allowNegative = false, step = 1, decimals = 0 } = {}) {
  const fmt = (v) => (decimals ? Number(v).toFixed(decimals) : String(Math.round(v)));
  const out = [fmt(answer)];
  const add = (v) => {
    if (!Number.isFinite(v)) return;
    if (!allowNegative && v < 0) return;
    const s = fmt(v);
    if (!out.includes(s)) out.push(s);
  };
  for (const m of misses) if (out.length < 4) add(m);
  let k = 1;
  while (out.length < 4 && k < 40) {
    add(answer + step * k * (r() < 0.5 ? 1 : -1));
    add(answer + step * (k + 1));
    k++;
  }
  return shuffle(r, out.slice(0, 4), fmt(answer));
}
/** Shuffle choices, keeping track of the right one. */
function shuffle(r, choices, right) {
  const list = [...choices];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { choices: list, answer: list.indexOf(right) };
}

const THINGS = [
  ['🍎', 'apples'], ['⭐', 'stars'], ['🐟', 'fish'], ['🌸', 'flowers'], ['🍪', 'cookies'], ['🎈', 'balloons'], ['🐞', 'ladybirds'], ['🦆', 'ducks']
];

/* ---------------------------------------------------------- chalk helpers */

/** A number line from `lo` to `hi` across the board, ticks labelled. */
function numberLine(lo, hi, { y = 470, x0 = 140, x1 = 1460, every = 1, label = (v) => String(v) } = {}) {
  const steps = [{ t: 'line', pts: [[x0 - 30, y], [x1 + 30, y]] }];
  const span = hi - lo;
  const at = (v) => x0 + ((v - lo) / span) * (x1 - x0);
  for (let v = lo; v <= hi + 1e-9; v += every) {
    const vv = Math.round(v * 1000) / 1000;
    steps.push({ t: 'line', pts: [[at(vv), y - 14], [at(vv), y + 14]] });
    steps.push({ t: 'text', s: label(vv), x: at(vv), y: y + 58, size: 0.7, align: 'center' });
  }
  return { steps, at };
}
/** Digits in columns: each `rows` entry a number written right-aligned at `right`. */
function columns(rows, { right = 900, top = 200, gap = 120, digitW = 90, sign = '+' } = {}) {
  const steps = [];
  rows.forEach((n, i) => {
    const s = String(n);
    [...s].forEach((d, k) => steps.push({ t: 'text', s: d, x: right - (s.length - 1 - k) * digitW, y: top + i * gap, size: 1.3, align: 'center' }));
  });
  steps.push({ t: 'text', s: sign, x: right - 3 * digitW, y: top + (rows.length - 1) * gap, size: 1.3, align: 'center' });
  const lineY = top + (rows.length - 1) * gap + 45;
  steps.push({ t: 'line', pts: [[right - 3.4 * digitW, lineY], [right + 0.6 * digitW, lineY]] });
  return { steps, lineY, digitW, right };
}

/* ---------------------------------------------------------- generators */

export const GENERATORS = {
  /* ---- floor 1 ---- */
  count(r) {
    const n = int(r, 5, 20);
    const [emoji, name] = pick(r, THINGS);
    return {
      q: `How many ${name}? ${emoji.repeat(n)}`,
      ...numberChoices(r, n, [n + 1, n - 1, n + 2]),
      hint: 'Touch each one as you count. Count in fives if you can!',
      explain: `There are ${n} ${name}. Counting in fives: ${fives(n)}.`,
      data: { n, emoji, name }
    };
  },
  add10(r) {
    const a = int(r, 1, 8);
    const b = int(r, 1, 10 - a);
    const [emoji, name] = pick(r, THINGS);
    return {
      q: `${a} ${name} and ${b} more. How many now? (${a} + ${b})`,
      ...numberChoices(r, a + b, [a + b + 1, a + b - 1, a]),
      hint: `Start at ${a} on the number line and hop forward ${b}.`,
      explain: `${a} + ${b} = ${a + b}. From ${a}, hop ${b} times: you land on ${a + b}.`,
      data: { a, b, op: '+', emoji }
    };
  },
  sub10(r) {
    const a = int(r, 3, 10);
    const b = int(r, 1, a - 1);
    const [emoji, name] = pick(r, THINGS);
    return {
      q: `${a} ${name}. ${b} go away. How many are left? (${a} − ${b})`,
      ...numberChoices(r, a - b, [a - b + 1, a - b - 1, a + b]),
      hint: `Start at ${a} and hop back ${b}. Or cross out ${b} of them.`,
      explain: `${a} − ${b} = ${a - b}. Take ${b} away from ${a} and ${a - b} are left.`,
      data: { a, b, op: '-', emoji }
    };
  },
  /* ---- floor 2 ---- */
  'tens-ones'(r) {
    const tens = int(r, 1, 9);
    const ones = int(r, 0, 9);
    const n = tens * 10 + ones;
    if (r() < 0.5) {
      return {
        q: `Which number has ${tens} tens and ${ones} ones?`,
        ...numberChoices(r, n, [ones * 10 + tens, tens + ones, n + 10]),
        hint: 'The tens digit goes on the left, the ones digit on the right.',
        explain: `${tens} tens is ${tens * 10}, and ${ones} more ones makes ${n}.`,
        data: { tens, ones, n, ask: 'number' }
      };
    }
    return {
      q: `How many tens are in ${n}?`,
      ...numberChoices(r, tens, [ones, n, tens + 1].filter((v) => v !== tens)),
      hint: `Look at the left digit of ${n}.`,
      explain: `${n} is ${tens} tens and ${ones} ones, so it has ${tens} tens.`,
      data: { tens, ones, n, ask: 'tens' }
    };
  },
  'add-carry'(r) {
    let a, b;
    do {
      a = int(r, 12, 68);
      b = int(r, 11, 89 - a);
    } while ((a % 10) + (b % 10) < 10 || a + b > 99);
    const s = a + b;
    return {
      q: `Add them up: ${a} + ${b} = ?`,
      ...numberChoices(r, s, [s - 10, s + 10, s + 1]),
      hint: `Add the ones first: ${a % 10} + ${b % 10}. If you get 10 or more, carry 1 ten.`,
      explain: `Ones: ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}, write ${s % 10}, carry 1. Tens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)} + 1 = ${Math.floor(s / 10)}. So ${a} + ${b} = ${s}.`,
      data: { a, b, op: '+' }
    };
  },
  'skip-count'(r) {
    const by = pick(r, [2, 5, 10]);
    const start = by * int(r, 0, by === 10 ? 5 : 8);
    const seq = [0, 1, 2, 3].map((k) => start + k * by);
    const next = start + 4 * by;
    return {
      q: `What comes next? ${seq.join(', ')}, …`,
      ...numberChoices(r, next, [next + 1, next - by + 1, next + by]),
      hint: `How much bigger is each number than the one before?`,
      explain: `The numbers go up by ${by} each time: ${seq.at(-1)} + ${by} = ${next}.`,
      data: { by, start, next }
    };
  },
  /* ---- floor 3 ---- */
  times(r) {
    const a = int(r, 2, 10);
    const b = int(r, 2, 10);
    return {
      q: `${a} rows of ${b}. How many in all? (${a} × ${b})`,
      ...numberChoices(r, a * b, [a + b, a * b + a, a * b - b]),
      hint: `Count up in ${b}s, ${a} times.`,
      explain: `${a} × ${b} = ${a * b}: ${a} rows with ${b} in each row.`,
      data: { a, b, op: '×' }
    };
  },
  'sub-borrow'(r) {
    let a, b;
    do {
      a = int(r, 31, 98);
      b = int(r, 12, a - 5);
    } while (a % 10 >= b % 10);
    const d = a - b;
    return {
      q: `Take away: ${a} − ${b} = ?`,
      ...numberChoices(r, d, [d + 10, Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10)), d - 10]),
      hint: `You can't take ${b % 10} from ${a % 10}, so borrow 1 ten: ${a % 10} becomes ${(a % 10) + 10}.`,
      explain: `Borrow a ten: ${(a % 10) + 10} − ${b % 10} = ${((a % 10) + 10) - (b % 10)}. Tens: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${Math.floor(a / 10) - 1 - Math.floor(b / 10)}. So ${a} − ${b} = ${d}.`,
      data: { a, b, op: '-' }
    };
  },
  fractions(r) {
    const parts = pick(r, [2, 3, 4, 6, 8]);
    const shaded = int(r, 1, parts - 1);
    const right = `${shaded}/${parts}`;
    const opts = [right, `${parts - shaded}/${parts}`, `${shaded}/${parts + 1}`, `${parts}/${shaded}`];
    const unique = [...new Set(opts)];
    while (unique.length < 4) unique.push(`${shaded + unique.length}/${parts + 2}`);
    return {
      q: `A pizza is cut into ${parts} equal slices. ${shaded} ${shaded === 1 ? 'slice has' : 'slices have'} cheese. What fraction has cheese?`,
      ...shuffle(r, unique.slice(0, 4), right),
      hint: 'The bottom number is how many equal slices in all. The top number is how many we mean.',
      explain: `${shaded} out of ${parts} equal slices is ${right}.`,
      data: { parts, shaded }
    };
  },
  /* ---- floor 4 ---- */
  'mult-2x1'(r) {
    const a = int(r, 12, 49);
    const b = int(r, 3, 9);
    const p = a * b;
    const t = Math.floor(a / 10) * 10;
    return {
      q: `${a} × ${b} = ?`,
      ...numberChoices(r, p, [t * b + (a % 10), p + b, p - 10]),
      hint: `Split ${a} into ${t} and ${a % 10}. Multiply each by ${b}, then add.`,
      explain: `${t} × ${b} = ${t * b} and ${a % 10} × ${b} = ${(a % 10) * b}. ${t * b} + ${(a % 10) * b} = ${p}.`,
      data: { a, b, op: '×' }
    };
  },
  division(r) {
    const b = int(r, 2, 9);
    const q = int(r, 2, 9);
    const a = b * q;
    return {
      q: `Share ${a} sweets equally between ${b} friends. How many does each get? (${a} ÷ ${b})`,
      ...numberChoices(r, q, [q + 1, q - 1, a - b]),
      hint: `Which number times ${b} makes ${a}?`,
      explain: `${b} × ${q} = ${a}, so ${a} ÷ ${b} = ${q}. Each friend gets ${q}.`,
      data: { a, b, op: '÷' }
    };
  },
  'fraction-of'(r) {
    const d = pick(r, [2, 3, 4, 5, 10]);
    const n = int(r, 1, d - 1);
    const whole = d * int(r, 2, 10);
    const v = (whole / d) * n;
    return {
      q: `What is ${n}/${d} of ${whole}?`,
      ...numberChoices(r, v, [whole / d, whole - v, v + n]),
      hint: `First find 1/${d}: split ${whole} into ${d} equal groups.`,
      explain: `1/${d} of ${whole} is ${whole / d}. ${n}/${d} is ${n} of those groups: ${n} × ${whole / d} = ${v}.`,
      data: { n, d, whole }
    };
  },
  /* ---- floor 5 ---- */
  balance(r) {
    const x = int(r, 2, 15);
    const a = int(r, 2, 20);
    const b = x + a;
    return {
      q: `Balance the scale: x + ${a} = ${b}. What is x?`,
      ...numberChoices(r, x, [b + a, x + 1, a]),
      hint: `Take ${a} off both sides so the scale stays level.`,
      explain: `x + ${a} = ${b}. Take ${a} from both sides: x = ${b} − ${a} = ${x}.`,
      data: { a, b, x }
    };
  },
  decimals(r) {
    const a = int(r, 1, 6);
    const b = int(r, 1, 9 - a);
    const s = (a + b) / 10;
    return {
      q: `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ?`,
      ...numberChoices(r, s, [s + 0.1, s - 0.1, s + 0.2], { step: 0.1, decimals: 1 }),
      hint: `Count in tenths: ${a} tenths and ${b} more tenths.`,
      explain: `${a} tenths + ${b} tenths = ${a + b} tenths = ${s.toFixed(1)}.`,
      data: { a: a / 10, b: b / 10, s }
    };
  },
  area(r) {
    const w = int(r, 3, 12);
    const h = int(r, 2, 9);
    const askArea = r() < 0.6;
    const v = askArea ? w * h : 2 * (w + h);
    return {
      q: askArea ? `A rectangle is ${w} cm long and ${h} cm wide. What is its area?` : `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter?`,
      ...shuffle(r, unitChoices(r, v, askArea ? [2 * (w + h), w + h, v + w] : [w * h, w + h, v + 2], askArea ? 'cm²' : 'cm'), `${v} ${askArea ? 'cm²' : 'cm'}`),
      hint: askArea ? 'Area = length × width: count the squares inside.' : 'Perimeter = the distance all the way round: add all four sides.',
      explain: askArea ? `${w} × ${h} = ${v} squares, so the area is ${v} cm².` : `${w} + ${h} + ${w} + ${h} = ${v}, so the perimeter is ${v} cm.`,
      data: { w, h, ask: askArea ? 'area' : 'perimeter' }
    };
  },
  /* ---- floor 6 ---- */
  negatives(r) {
    const a = int(r, -9, 4);
    const b = int(r, 2, 9);
    const up = r() < 0.6;
    const v = up ? a + b : a - b;
    const fmt = (n) => (n < 0 ? `−${-n}` : String(n));
    const res = numberChoices(r, v, [up ? a - b : a + b, -v, v + 1], { allowNegative: true });
    return {
      q: `It is ${fmt(a)} °C. The temperature ${up ? 'rises' : 'falls'} by ${b} degrees. What is it now?`,
      choices: res.choices.map((c) => `${fmt(Number(c))} °C`),
      answer: res.answer,
      hint: `Start at ${fmt(a)} on the number line and move ${b} ${up ? 'up (right)' : 'down (left)'}.`,
      explain: `${fmt(a)} ${up ? '+' : '−'} ${b} = ${fmt(v)}. ${up ? 'Rising' : 'Falling'} ${b} degrees from ${fmt(a)} °C lands on ${fmt(v)} °C.`,
      data: { a, b, up }
    };
  },
  percent(r) {
    const p = pick(r, [10, 20, 25, 50, 75]);
    const whole = pick(r, [20, 40, 60, 80, 100, 120, 200]);
    const v = (whole * p) / 100;
    return {
      q: `What is ${p}% of ${whole}?`,
      ...numberChoices(r, v, [whole - v, p, v * 2].filter((x) => x !== v)),
      hint: p === 25 ? '25% is a quarter: divide by 4.' : p === 50 ? '50% is a half.' : p === 75 ? '75% is three quarters: find a quarter, then times 3.' : `10% is a tenth: divide by 10.${p === 20 ? ' Then double it.' : ''}`,
      explain: `${p}% means ${p} out of every 100. ${p}% of ${whole} = ${whole} × ${p} ÷ 100 = ${v}.`,
      data: { p, whole }
    };
  },
  /* ---- floor 7 ---- */
  'two-step'(r) {
    const x = int(r, 2, 12);
    const a = int(r, 2, 9);
    const b = int(r, 1, 20);
    const c = a * x + b;
    return {
      q: `Solve: ${a}x + ${b} = ${c}`,
      ...numberChoices(r, x, [(c - b) - a, c / a, x + 1].map((v) => Math.round(v))),
      hint: `Undo the + ${b} first (take ${b} from both sides), then undo the × ${a}.`,
      explain: `${a}x + ${b} = ${c} → ${a}x = ${c - b} → x = ${c - b} ÷ ${a} = ${x}.`,
      data: { a, b, c, x }
    };
  },
  squares(r) {
    const n = int(r, 2, 12);
    if (r() < 0.5) {
      return {
        q: `What is ${n}² (${n} squared)?`,
        ...numberChoices(r, n * n, [n * 2, n * n + n, (n + 1) * (n + 1)]),
        hint: `${n}² means ${n} × ${n}: a square with ${n} tiles on each side.`,
        explain: `${n}² = ${n} × ${n} = ${n * n}.`,
        data: { n, ask: 'square' }
      };
    }
    return {
      q: `What is the square root of ${n * n}? (√${n * n})`,
      ...numberChoices(r, n, [n * n / 2, n + 1, n - 1].map((v) => Math.round(v))),
      hint: `Which number times itself makes ${n * n}?`,
      explain: `${n} × ${n} = ${n * n}, so √${n * n} = ${n}.`,
      data: { n, ask: 'root' }
    };
  }
};

function unitChoices(r, v, misses, unit) {
  const out = [v, ...misses].filter((x, i, all) => x > 0 && all.indexOf(x) === i).slice(0, 4);
  let k = 1;
  while (out.length < 4) {
    if (!out.includes(v + k)) out.push(v + k);
    k++;
  }
  return out.map((x) => `${x} ${unit}`);
}
function fives(n) {
  const out = [];
  for (let v = 5; v <= n; v += 5) out.push(v);
  const rest = n - out.length * 5;
  return out.length ? `${out.join(', ')}${rest ? `, then ${rest} more makes ${n}` : ''}` : `1 to ${n}`;
}

/* ---------------------------------------------------------- chalkboard examples */

/** A worked example for a generator's problem, as chalk steps. */
export const BOARDS = {
  count({ n, emoji }) {
    const steps = [{ t: 'text', s: 'Counting in fives', x: 800, y: 110, size: 1.1, c: 'y', align: 'center' }, { t: 'say', s: `Let's count them. Groups of five make it quick!` }];
    for (let i = 0; i < n; i++) {
      const g = Math.floor(i / 5), k = i % 5;
      const x = 180 + g * 330 + k * 52, y = 360;
      if (k < 4) steps.push({ t: 'line', pts: [[x, y - 60], [x + 4, y + 60]] });
      else steps.push({ t: 'line', pts: [[x - 230, y + 40], [x + 10, y - 50]], c: 'y' });
      if (k === 4 || i === n - 1) steps.push({ t: 'text', s: String(i + 1), x: 180 + g * 330 + 100, y: 520, size: 0.9, c: 'p', align: 'center' });
    }
    steps.push({ t: 'say', s: `${fives(n)}. There are ${n}!` });
    steps.push({ t: 'text', s: `${n} ${emoji}`, x: 800, y: 680, size: 1.3, align: 'center' });
    return steps;
  },
  add10({ a, b }) {
    const { steps, at } = numberLine(0, 10, {});
    const out = [{ t: 'text', s: `${a} + ${b} = ?`, x: 800, y: 130, size: 1.4, align: 'center' }, { t: 'say', s: `Start at ${a}, then hop forward ${b}.` }, ...steps, { t: 'circle', x: at(a), y: 470, r: 20, c: 'y', fill: true }];
    for (let k = 0; k < b; k++) out.push({ t: 'hop', x1: at(a + k), x2: at(a + k + 1), y: 450, h: 70, c: 'p' });
    out.push({ t: 'circle', x: at(a + b), y: 470, r: 22, c: 'g', fill: true }, { t: 'say', s: `We land on ${a + b}.` }, { t: 'text', s: `${a} + ${b} = ${a + b}`, x: 800, y: 680, size: 1.4, c: 'y', align: 'center' });
    return out;
  },
  sub10({ a, b }) {
    const out = [{ t: 'text', s: `${a} − ${b} = ?`, x: 800, y: 130, size: 1.4, align: 'center' }, { t: 'say', s: `Draw ${a}, then cross out ${b}.` }];
    const x0 = 800 - ((a - 1) * 120) / 2;
    for (let i = 0; i < a; i++) out.push({ t: 'circle', x: x0 + i * 120, y: 380, r: 38 });
    for (let i = 0; i < b; i++) out.push({ t: 'cross', x: x0 + (a - 1 - i) * 120, y: 380, s: 44, c: 'p' });
    out.push({ t: 'say', s: `Count what's left: ${a - b}.` }, { t: 'text', s: `${a} − ${b} = ${a - b}`, x: 800, y: 640, size: 1.4, c: 'y', align: 'center' });
    return out;
  },
  'tens-ones'({ tens, ones, n }) {
    const out = [{ t: 'text', s: `${n} = ${tens} tens and ${ones} ones`, x: 800, y: 110, size: 1.1, align: 'center' }, { t: 'say', s: `A tall stick is ten. A little square is one.` }];
    for (let i = 0; i < tens; i++) {
      out.push({ t: 'rect', x: 200 + i * 70, y: 220, w: 40, h: 300, c: 'b' });
      for (let k = 1; k < 10; k++) out.push({ t: 'line', pts: [[200 + i * 70, 220 + k * 30], [240 + i * 70, 220 + k * 30]], c: 'b' });
    }
    for (let i = 0; i < ones; i++) out.push({ t: 'rect', x: 1000 + (i % 5) * 60, y: 400 + Math.floor(i / 5) * 60, w: 40, h: 40, c: 'y' });
    out.push({ t: 'text', s: `${tens}`, x: 650, y: 680, size: 1.6, c: 'b', align: 'center' }, { t: 'text', s: `${ones}`, x: 760, y: 680, size: 1.6, c: 'y', align: 'center' });
    out.push({ t: 'say', s: `${tens} tens and ${ones} ones make ${n}.` });
    return out;
  },
  'add-carry'({ a, b }) {
    const s = a + b;
    const c = columns([a, b], { right: 900, top: 230 });
    const out = [{ t: 'text', s: 'Column addition', x: 800, y: 90, size: 1, c: 'y', align: 'center' }, ...c.steps];
    const ones = (a % 10) + (b % 10);
    out.push({ t: 'say', s: `Ones first: ${a % 10} + ${b % 10} = ${ones}. Write ${ones % 10}, carry the 1.` });
    out.push({ t: 'text', s: String(ones % 10), x: c.right, y: c.lineY + 90, size: 1.3, c: 'g', align: 'center' });
    out.push({ t: 'text', s: '1', x: c.right - c.digitW, y: 160, size: 0.7, c: 'p', align: 'center' });
    out.push({ t: 'say', s: `Tens: ${Math.floor(a / 10)} + ${Math.floor(b / 10)} + the carried 1 = ${Math.floor(s / 10)}.` });
    out.push({ t: 'text', s: String(Math.floor(s / 10)), x: c.right - c.digitW, y: c.lineY + 90, size: 1.3, c: 'g', align: 'center' });
    out.push({ t: 'text', s: `${a} + ${b} = ${s}`, x: 1300, y: 700, size: 0.9, c: 'y', align: 'center' });
    return out;
  },
  'skip-count'({ by, start, next }) {
    const lo = start, hi = next;
    const { steps, at } = numberLine(lo, hi, { every: by });
    const out = [{ t: 'text', s: `Count in ${by}s`, x: 800, y: 130, size: 1.3, align: 'center' }, ...steps, { t: 'say', s: `Each hop is ${by}.` }];
    for (let v = lo; v < hi; v += by) out.push({ t: 'hop', x1: at(v), x2: at(v + by), y: 450, h: 90, c: v + by === hi ? 'g' : 'p' });
    out.push({ t: 'say', s: `${start + 3 * by} + ${by} = ${next}.` }, { t: 'circle', x: at(hi), y: 470, r: 22, c: 'g', fill: true });
    return out;
  },
  times({ a, b }) {
    const out = [{ t: 'text', s: `${a} × ${b}`, x: 800, y: 100, size: 1.3, align: 'center' }, { t: 'say', s: `${a} rows, ${b} in each row.` }];
    const gap = Math.min(70, 520 / Math.max(a, b));
    const x0 = 800 - ((b - 1) * gap) / 2, y0 = 190;
    for (let i = 0; i < a; i++) {
      for (let j = 0; j < b; j++) out.push({ t: 'circle', x: x0 + j * gap, y: y0 + i * gap, r: gap * 0.3, c: i % 2 ? 'b' : 'w', fill: true });
      out.push({ t: 'text', s: String((i + 1) * b), x: x0 + b * gap + 40, y: y0 + i * gap + 14, size: 0.6, c: 'y' });
    }
    out.push({ t: 'say', s: `Count in ${b}s: ${Array.from({ length: a }, (_, i) => (i + 1) * b).join(', ')}.` });
    out.push({ t: 'text', s: `${a} × ${b} = ${a * b}`, x: 800, y: 750, size: 1.1, c: 'y', align: 'center' });
    return out;
  },
  'sub-borrow'({ a, b }) {
    const d = a - b;
    const c = columns([a, b], { right: 900, top: 230, sign: '−' });
    const out = [{ t: 'text', s: 'Column subtraction', x: 800, y: 90, size: 1, c: 'y', align: 'center' }, ...c.steps];
    out.push({ t: 'say', s: `${a % 10} take away ${b % 10}? Not enough! Borrow a ten.` });
    out.push({ t: 'cross', x: c.right - c.digitW, y: 210, s: 34, c: 'p' }, { t: 'text', s: String(Math.floor(a / 10) - 1), x: c.right - c.digitW - 10, y: 150, size: 0.7, c: 'p', align: 'center' });
    out.push({ t: 'text', s: '1', x: c.right - 48, y: 150, size: 0.7, c: 'p', align: 'center' });
    out.push({ t: 'say', s: `${(a % 10) + 10} − ${b % 10} = ${(a % 10) + 10 - (b % 10)}.` });
    out.push({ t: 'text', s: String(d % 10), x: c.right, y: c.lineY + 90, size: 1.3, c: 'g', align: 'center' });
    out.push({ t: 'say', s: `Tens: ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${Math.floor(d / 10)}.` });
    if (d >= 10) out.push({ t: 'text', s: String(Math.floor(d / 10)), x: c.right - c.digitW, y: c.lineY + 90, size: 1.3, c: 'g', align: 'center' });
    out.push({ t: 'text', s: `${a} − ${b} = ${d}`, x: 1300, y: 700, size: 0.9, c: 'y', align: 'center' });
    return out;
  },
  fractions({ parts, shaded }) {
    return [
      { t: 'text', s: 'Fractions of a pizza', x: 800, y: 100, size: 1.1, c: 'y', align: 'center' },
      { t: 'say', s: `Cut the pizza into ${parts} equal slices.` },
      { t: 'pizza', x: 560, y: 420, r: 230, parts, shaded: 0 },
      { t: 'say', s: `Colour ${shaded} of them.` },
      { t: 'pizza', x: 560, y: 420, r: 230, parts, shaded, c: 'p' },
      { t: 'text', s: String(shaded), x: 1180, y: 360, size: 1.8, c: 'p', align: 'center' },
      { t: 'line', pts: [[1110, 400], [1250, 400]] },
      { t: 'text', s: String(parts), x: 1180, y: 520, size: 1.8, align: 'center' },
      { t: 'say', s: `${shaded} out of ${parts} slices: ${shaded}/${parts}.` }
    ];
  },
  'mult-2x1'({ a, b }) {
    const t = Math.floor(a / 10) * 10, o = a % 10;
    const W = 900, w1 = (W * t) / a;
    return [
      { t: 'text', s: `${a} × ${b} — the grid method`, x: 800, y: 90, size: 1, c: 'y', align: 'center' },
      { t: 'say', s: `Split ${a} into ${t} and ${o}.` },
      { t: 'rect', x: 350, y: 220, w: w1, h: 300 }, { t: 'rect', x: 350 + w1, y: 220, w: W - w1, h: 300 },
      { t: 'text', s: String(t), x: 350 + w1 / 2, y: 190, size: 0.9, align: 'center' }, { t: 'text', s: String(o), x: 350 + w1 + (W - w1) / 2, y: 190, size: 0.9, align: 'center' },
      { t: 'text', s: String(b), x: 300, y: 390, size: 0.9, align: 'center' },
      { t: 'say', s: `${t} × ${b} = ${t * b}, and ${o} × ${b} = ${o * b}.` },
      { t: 'text', s: String(t * b), x: 350 + w1 / 2, y: 390, size: 1.2, c: 'b', align: 'center' }, { t: 'text', s: String(o * b), x: 350 + w1 + (W - w1) / 2, y: 390, size: 1, c: 'p', align: 'center' },
      { t: 'say', s: `Add them: ${t * b} + ${o * b} = ${a * b}.` },
      { t: 'text', s: `${a} × ${b} = ${t * b} + ${o * b} = ${a * b}`, x: 800, y: 660, size: 1, c: 'y', align: 'center' }
    ];
  },
  division({ a, b }) {
    const q = a / b;
    const out = [{ t: 'text', s: `${a} ÷ ${b}: share into ${b} groups`, x: 800, y: 90, size: 1, c: 'y', align: 'center' }, { t: 'say', s: `Draw ${b} plates and deal the sweets one at a time.` }];
    const gw = 1400 / b;
    for (let g = 0; g < b; g++) out.push({ t: 'circle', x: 100 + gw * (g + 0.5), y: 400, r: Math.min(90, gw * 0.42) });
    for (let k = 0; k < q; k++) for (let g = 0; g < b; g++) {
      const ang = (k / q) * Math.PI * 2;
      const rr = Math.min(55, gw * 0.26);
      out.push({ t: 'circle', x: 100 + gw * (g + 0.5) + Math.cos(ang) * rr * (q > 1 ? 1 : 0), y: 400 + Math.sin(ang) * rr * (q > 1 ? 1 : 0), r: 10, c: 'p', fill: true });
    }
    out.push({ t: 'say', s: `Each plate has ${q}.` }, { t: 'text', s: `${a} ÷ ${b} = ${q}`, x: 800, y: 660, size: 1.3, c: 'y', align: 'center' });
    return out;
  },
  'fraction-of'({ n, d, whole }) {
    const per = whole / d, W = 1100, x0 = 250;
    const out = [{ t: 'text', s: `${n}/${d} of ${whole}`, x: 800, y: 110, size: 1.3, align: 'center' }, { t: 'say', s: `Draw a bar for ${whole}, cut into ${d} equal parts.` }, { t: 'rect', x: x0, y: 260, w: W, h: 120 }];
    for (let k = 1; k < d; k++) out.push({ t: 'line', pts: [[x0 + (W * k) / d, 260], [x0 + (W * k) / d, 380]] });
    for (let k = 0; k < d; k++) out.push({ t: 'text', s: String(per), x: x0 + (W * (k + 0.5)) / d, y: 340, size: 0.8, c: k < n ? 'p' : 'w', align: 'center' });
    out.push({ t: 'say', s: `Each part is ${whole} ÷ ${d} = ${per}. Take ${n} parts.` });
    out.push({ t: 'line', pts: [[x0, 420], [x0 + (W * n) / d, 420]], c: 'p' });
    out.push({ t: 'text', s: `${n} × ${per} = ${n * per}`, x: 800, y: 600, size: 1.3, c: 'y', align: 'center' });
    return out;
  },
  balance({ a, b, x }) {
    return [
      { t: 'text', s: `x + ${a} = ${b}`, x: 800, y: 100, size: 1.4, align: 'center' },
      { t: 'say', s: 'An equation is a balanced scale: both sides weigh the same.' },
      { t: 'line', pts: [[800, 560], [760, 640], [840, 640], [800, 560]] },
      { t: 'line', pts: [[400, 380], [1200, 380]] },
      { t: 'line', pts: [[800, 380], [800, 560]] },
      { t: 'rect', x: 430, y: 270, w: 110, h: 110, c: 'y' }, { t: 'text', s: 'x', x: 485, y: 345, size: 1, c: 'y', align: 'center' },
      { t: 'rect', x: 560, y: 300, w: 140, h: 80, c: 'b' }, { t: 'text', s: String(a), x: 630, y: 360, size: 0.8, c: 'b', align: 'center' },
      { t: 'rect', x: 940, y: 290, w: 200, h: 90, c: 'p' }, { t: 'text', s: String(b), x: 1040, y: 355, size: 0.9, c: 'p', align: 'center' },
      { t: 'say', s: `Take ${a} off both sides — it still balances.` },
      { t: 'cross', x: 630, y: 340, s: 60, c: 'p' },
      { t: 'text', s: `x = ${b} − ${a} = ${x}`, x: 800, y: 740, size: 1.2, c: 'y', align: 'center' }
    ];
  },
  decimals({ a, b, s }) {
    const { steps, at } = numberLine(0, 1, { every: 0.1, label: (v) => v.toFixed(1) });
    const out = [{ t: 'text', s: `${a.toFixed(1)} + ${b.toFixed(1)}`, x: 800, y: 130, size: 1.3, align: 'center' }, { t: 'say', s: 'Between 0 and 1 there are ten tenths.' }, ...steps, { t: 'circle', x: at(a), y: 470, r: 18, c: 'y', fill: true }];
    for (let k = 0; k < Math.round(b * 10); k++) out.push({ t: 'hop', x1: at(a + k / 10), x2: at(a + (k + 1) / 10), y: 450, h: 60, c: 'p' });
    out.push({ t: 'circle', x: at(s), y: 470, r: 20, c: 'g', fill: true }, { t: 'say', s: `${Math.round(a * 10)} tenths + ${Math.round(b * 10)} tenths = ${s.toFixed(1)}.` }, { t: 'text', s: `= ${s.toFixed(1)}`, x: 800, y: 680, size: 1.3, c: 'y', align: 'center' });
    return out;
  },
  area({ w, h, ask }) {
    const cell = Math.min(80, 900 / w, 440 / h);
    const x0 = 800 - (w * cell) / 2, y0 = 170;
    const out = [{ t: 'say', s: `A ${w} by ${h} rectangle, drawn in 1 cm squares.` }, { t: 'rect', x: x0, y: y0, w: w * cell, h: h * cell }];
    for (let i = 1; i < w; i++) out.push({ t: 'line', pts: [[x0 + i * cell, y0], [x0 + i * cell, y0 + h * cell]], c: 'b' });
    for (let j = 1; j < h; j++) out.push({ t: 'line', pts: [[x0, y0 + j * cell], [x0 + w * cell, y0 + j * cell]], c: 'b' });
    out.push({ t: 'text', s: `${w} cm`, x: 800, y: y0 - 20, size: 0.7, align: 'center' }, { t: 'text', s: `${h} cm`, x: x0 - 70, y: y0 + (h * cell) / 2, size: 0.7, align: 'center' });
    if (ask === 'area') out.push({ t: 'say', s: `Area: count the squares. ${h} rows of ${w} = ${w * h}.` }, { t: 'text', s: `Area = ${w} × ${h} = ${w * h} cm²`, x: 800, y: 740, size: 1, c: 'y', align: 'center' });
    else out.push({ t: 'say', s: `Perimeter: walk round the edge.` }, { t: 'line', pts: [[x0, y0], [x0 + w * cell, y0], [x0 + w * cell, y0 + h * cell], [x0, y0 + h * cell], [x0, y0]], c: 'p' }, { t: 'text', s: `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm`, x: 800, y: 740, size: 1, c: 'y', align: 'center' });
    return out;
  },
  negatives({ a, b, up }) {
    const v = up ? a + b : a - b;
    const lo = Math.min(-10, v), hi = Math.max(10, v);
    const fmt = (n) => (n < 0 ? `−${-n}` : String(n));
    const { steps, at } = numberLine(lo, hi, { every: 1, label: (n) => (n % 2 === 0 ? fmt(n) : '') });
    const out = [{ t: 'text', s: `${fmt(a)} ${up ? '+' : '−'} ${b}`, x: 800, y: 130, size: 1.3, align: 'center' }, { t: 'say', s: 'Numbers below zero sit to the left of 0.' }, ...steps, { t: 'circle', x: at(a), y: 470, r: 18, c: 'y', fill: true }];
    for (let k = 0; k < b; k++) out.push({ t: 'hop', x1: at(up ? a + k : a - k), x2: at(up ? a + k + 1 : a - k - 1), y: 450, h: 50, c: 'p' });
    out.push({ t: 'circle', x: at(v), y: 470, r: 20, c: 'g', fill: true }, { t: 'text', s: `= ${fmt(v)}`, x: 800, y: 680, size: 1.3, c: 'y', align: 'center' }, { t: 'say', s: `We land on ${fmt(v)}.` });
    return out;
  },
  percent({ p, whole }) {
    const out = [{ t: 'text', s: `${p}% of ${whole}`, x: 800, y: 100, size: 1.3, align: 'center' }, { t: 'say', s: 'Per cent means "out of 100". Here is a 100-square.' }];
    const c = 42, x0 = 590, y0 = 150;
    out.push({ t: 'rect', x: x0, y: y0, w: c * 10, h: c * 10 });
    for (let i = 1; i < 10; i++) out.push({ t: 'line', pts: [[x0 + i * c, y0], [x0 + i * c, y0 + 10 * c]], c: 'b' }, { t: 'line', pts: [[x0, y0 + i * c], [x0 + 10 * c, y0 + i * c]], c: 'b' });
    out.push({ t: 'rect', x: x0, y: y0, w: (c * 10 * p) / 100, h: c * 10, c: 'p', fill: true });
    out.push({ t: 'say', s: `${p} squares out of 100 are coloured.` }, { t: 'text', s: `${whole} × ${p} ÷ 100 = ${(whole * p) / 100}`, x: 800, y: 700, size: 1, c: 'y', align: 'center' });
    return out;
  },
  'two-step'({ a, b, c, x }) {
    return [
      { t: 'text', s: `${a}x + ${b} = ${c}`, x: 800, y: 140, size: 1.4, align: 'center' },
      { t: 'say', s: `Undo the adding first: take ${b} from both sides.` },
      { t: 'text', s: `${a}x = ${c} − ${b} = ${c - b}`, x: 800, y: 330, size: 1.2, c: 'b', align: 'center' },
      { t: 'say', s: `Now undo the times ${a}: divide both sides by ${a}.` },
      { t: 'text', s: `x = ${c - b} ÷ ${a} = ${x}`, x: 800, y: 500, size: 1.2, c: 'g', align: 'center' },
      { t: 'say', s: `Check: ${a} × ${x} + ${b} = ${a * x + b}. ✓` },
      { t: 'text', s: `check: ${a}×${x} + ${b} = ${c}`, x: 800, y: 680, size: 0.9, c: 'y', align: 'center' }
    ];
  },
  squares({ n, ask }) {
    const cell = Math.min(46, 480 / n), x0 = 260, y0 = 180;
    const out = [{ t: 'say', s: `A square ${n} tiles wide and ${n} tiles tall.` }, { t: 'rect', x: x0, y: y0, w: n * cell, h: n * cell }];
    for (let i = 1; i < n; i++) out.push({ t: 'line', pts: [[x0 + i * cell, y0], [x0 + i * cell, y0 + n * cell]], c: 'b' }, { t: 'line', pts: [[x0, y0 + i * cell], [x0 + n * cell, y0 + i * cell]], c: 'b' });
    out.push({ t: 'text', s: `${n}² = ${n} × ${n} = ${n * n}`, x: 1120, y: 360, size: 1.1, c: 'y', align: 'center' });
    if (ask === 'root') out.push({ t: 'say', s: `So the square root of ${n * n} is ${n}: the length of one side.` }, { t: 'text', s: `√${n * n} = ${n}`, x: 1120, y: 520, size: 1.3, c: 'g', align: 'center' });
    else out.push({ t: 'say', s: `Count the tiles: ${n * n}.` });
    return out;
  }
};

/** One problem from a generator, with its worked chalkboard steps. */
export function makeProblem(gen, seed) {
  const r = rng(seed);
  const p = GENERATORS[gen](r);
  return { ...p, gen, seed, topic: gen, board: BOARDS[gen]?.(p.data) ?? [] };
}

/** `count` questions for a quiz, all different. */
export function makeQuiz(gen, seed, count) {
  const out = [];
  const seen = new Set();
  for (let k = 0; out.length < count && k < count * 20; k++) {
    const p = makeProblem(gen, (seed + k * 7919) >>> 0);
    if (seen.has(p.q)) continue;
    seen.add(p.q);
    out.push(p);
  }
  return out;
}

/* ---------------------------------------------------------- lessons */

const L = (id, floor, title, topicName, blurb, gen, kind, reading, quizCount = 4) => ({
  id, subject: 'math', floor, title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz: { gen, count: quizCount }
});

export const MATH_LESSONS = [
  L('m1-counting', 1, 'Counting to 20', 'Counting', 'Count things one by one — and in fives!', 'count', 'count', [
    { title: 'One, two, three…', emoji: '👆', text: 'When we count, we touch each thing once and say one number for it. The last number we say is how many there are.' },
    { title: 'Counting in fives', emoji: '🖐️', text: 'You have five fingers on one hand. Counting in fives is fast: 5, 10, 15, 20!' },
    { title: 'Don\'t skip, don\'t double', emoji: '✅', text: 'Move each thing to one side as you count it. Then you never count one twice, and you never miss one.' }
  ], 5),
  L('m1-adding', 1, 'Adding up to 10', 'Adding within 10', 'Put two groups together and find how many.', 'add10', 'numberline', [
    { title: 'Adding means more', emoji: '➕', text: 'When we add, we put two groups together. 2 ducks and 3 more ducks make 5 ducks!' },
    { title: 'Hop on the number line', emoji: '🐸', text: 'Start at the first number. Hop forward once for each one you add. Where you land is the answer.' },
    { title: 'Swap them round', emoji: '🔄', text: '3 + 4 is the same as 4 + 3. Start with the bigger number — it means fewer hops!' }
  ], 5),
  L('m1-taking-away', 1, 'Taking away', 'Subtracting within 10', 'Some go away. How many are left?', 'sub10', 'numberline', [
    { title: 'Take away', emoji: '➖', text: 'When we take away, some things leave the group. 5 birds, 2 fly off: 3 birds are left.' },
    { title: 'Hop back', emoji: '🐸', text: 'On a number line, taking away means hopping back. Start at the big number and hop back.' },
    { title: 'Cross them out', emoji: '❌', text: 'Draw the things. Cross out the ones that go away. Count the ones that are left.' }
  ], 5),
  L('m2-tens-and-ones', 2, 'Tens and ones', 'Place value', 'What each digit in a number means.', 'tens-ones', 'place-value', [
    { title: 'Bundles of ten', emoji: '🥢', text: 'Ten sticks tied together make one ten. Numbers like 34 are 3 tens and 4 ones.' },
    { title: 'Where a digit sits', emoji: '🏠', text: 'In 52, the 5 is in the tens house — it means 50. The 2 is in the ones house — it means 2.' },
    { title: 'Swap and it changes', emoji: '🔁', text: '52 and 25 use the same digits, but they are very different numbers! Where a digit sits matters.' }
  ], 5),
  L('m2-carrying', 2, 'Adding with carrying', 'Column addition', 'Add big numbers in columns — and carry the ten.', 'add-carry', 'column', [
    { title: 'Line them up', emoji: '📏', text: 'Write the numbers one under the other. Ones under ones, tens under tens.' },
    { title: 'Ones first', emoji: '1️⃣', text: 'Always add the ones column first. If the ones make 10 or more, you have made a new ten!' },
    { title: 'Carry the ten', emoji: '🎒', text: 'Write the ones digit at the bottom. Carry the 1 ten to the top of the tens column, and add it in.' }
  ], 5),
  L('m2-skip-counting', 2, 'Skip counting', 'Counting in 2s, 5s and 10s', 'Count in twos, fives and tens.', 'skip-count', 'numberline', [
    { title: 'Big hops', emoji: '🦘', text: 'Skip counting means hopping more than one at a time. In twos: 2, 4, 6, 8, 10.' },
    { title: 'Fives and tens', emoji: '🖐️', text: 'Fives end in 5 or 0: 5, 10, 15, 20. Tens always end in 0: 10, 20, 30.' },
    { title: 'Why it helps', emoji: '💡', text: 'Skip counting is the first step to times tables. 3 hops of 5 is 15 — that is 3 × 5!' }
  ], 5),
  L('m3-times-tables', 3, 'Times tables as arrays', 'Times tables', 'Rows and columns show multiplication.', 'times', 'array', [
    { title: 'Rows of things', emoji: '🥚', text: 'An egg box has 2 rows of 6 eggs. That is 2 × 6 = 12 eggs. Rows and columns like this are called an array.' },
    { title: 'Turn it round', emoji: '🔄', text: 'Turn the array on its side and you get 6 rows of 2. Still 12! So 2 × 6 = 6 × 2.' },
    { title: 'Count in steps', emoji: '🪜', text: 'To find 4 × 5, count in fives four times: 5, 10, 15, 20.' }
  ]),
  L('m3-borrowing', 3, 'Subtracting with borrowing', 'Column subtraction', 'Take away in columns, borrowing a ten when you need it.', 'sub-borrow', 'column', [
    { title: 'Ones first again', emoji: '1️⃣', text: 'Line up the numbers and start with the ones. Top number take away bottom number.' },
    { title: 'Not enough ones?', emoji: '🤔', text: 'If the top ones digit is smaller, borrow one ten from the tens column. It turns into ten ones.' },
    { title: 'Check by adding', emoji: '✔️', text: 'Add your answer to the number you took away. You should get back to where you started.' }
  ]),
  L('m3-fractions', 3, 'Fractions of a pizza', 'Fractions', 'Halves, quarters and more — with pizza.', 'fractions', 'pizza', [
    { title: 'Equal parts', emoji: '🍕', text: 'A fraction is part of a whole. The parts must be equal — a fair share for everyone.' },
    { title: 'Top and bottom', emoji: '🔢', text: 'In 3/4, the bottom number (4) says how many equal parts. The top number (3) says how many we have.' },
    { title: 'More parts, smaller slices', emoji: '🔪', text: 'A pizza cut into 8 has smaller slices than one cut into 4. So 1/8 is less than 1/4.' }
  ]),
  L('m4-multiplying', 4, 'Multiplying bigger numbers', '2-digit × 1-digit', 'Split a number to multiply it.', 'mult-2x1', 'grid', [
    { title: 'Break it up', emoji: '🧩', text: 'Big numbers are easier in pieces. 23 is 20 and 3. So 23 × 4 is 20 × 4 plus 3 × 4.' },
    { title: 'The grid method', emoji: '🔲', text: 'Draw a box for each piece. Multiply in each box, then add the boxes together.' },
    { title: 'Estimate first', emoji: '🎯', text: '23 × 4 should be a bit more than 20 × 4 = 80. If your answer is 920, something went wrong!' }
  ]),
  L('m4-division', 4, 'Division is sharing', 'Division', 'Share things out fairly.', 'division', 'array', [
    { title: 'Fair shares', emoji: '🍬', text: 'Dividing means sharing equally. 12 sweets shared by 3 friends: everyone gets 4.' },
    { title: 'Opposite of times', emoji: '↔️', text: 'Division undoes multiplication. 3 × 4 = 12, so 12 ÷ 3 = 4 and 12 ÷ 4 = 3.' },
    { title: 'Use your tables', emoji: '📋', text: 'To find 35 ÷ 5, ask: what times 5 makes 35? It is 7.' }
  ]),
  L('m4-fraction-of', 4, 'Fractions of amounts', 'Fractions of amounts', 'Find 3/4 of 20 and more.', 'fraction-of', 'pizza', [
    { title: 'Find one part first', emoji: '1️⃣', text: 'To find 1/4 of 20, share 20 into 4 equal groups. Each group is 5.' },
    { title: 'Then take more parts', emoji: '✖️', text: '3/4 of 20 is 3 of those groups: 3 × 5 = 15.' },
    { title: 'Divide, then times', emoji: '💡', text: 'The rule: divide by the bottom number, then multiply by the top number.' }
  ]),
  L('m5-balancing', 5, 'Balancing equations', 'Equations', 'Find the mystery number x.', 'balance', 'balance', [
    { title: 'A balanced scale', emoji: '⚖️', text: 'An equation is like a balanced scale. Whatever is on the left weighs the same as the right.' },
    { title: 'Keep it fair', emoji: '🤝', text: 'You can take the same amount off both sides and it still balances. That is how we find x.' },
    { title: 'Check your x', emoji: '✔️', text: 'Put your answer back in. If x + 5 = 12 and x = 7, then 7 + 5 = 12. It works!' }
  ]),
  L('m5-decimals', 5, 'Tenths and decimals', 'Decimals', 'Numbers between whole numbers.', 'decimals', 'numberline', [
    { title: 'Smaller than one', emoji: '🔍', text: 'Between 0 and 1 there are ten tenths: 0.1, 0.2, 0.3 … up to 1.0. The dot is the decimal point.' },
    { title: 'Same as fractions', emoji: '🍫', text: '0.3 means 3 tenths, just like 3/10. A chocolate bar with 10 pieces — eat 3 and you ate 0.3 of it.' },
    { title: 'Adding tenths', emoji: '➕', text: '0.4 + 0.3 is 4 tenths + 3 tenths = 7 tenths = 0.7.' }
  ]),
  L('m5-area', 5, 'Area and perimeter', 'Area and perimeter', 'How much space inside, how far round the edge.', 'area', 'grid', [
    { title: 'Perimeter', emoji: '🚶', text: 'Perimeter is the distance all the way round a shape. Walk round a rectangle: add up all four sides.' },
    { title: 'Area', emoji: '🟩', text: 'Area is how much flat space a shape covers. We count it in squares, like square centimetres (cm²).' },
    { title: 'A shortcut', emoji: '✖️', text: 'For a rectangle, area = length × width. A 5 cm by 3 cm rectangle has an area of 15 cm².' }
  ]),
  L('m6-negatives', 6, 'Negative numbers', 'Negative numbers', 'Numbers below zero, like cold temperatures.', 'negatives', 'numberline', [
    { title: 'Below zero', emoji: '🥶', text: 'On a freezing day the thermometer can read −5 °C: five degrees below zero. Negative numbers are less than zero.' },
    { title: 'The number line goes both ways', emoji: '↔️', text: 'Negative numbers sit to the left of 0. The further left, the smaller the number: −8 is less than −2.' },
    { title: 'Moving up and down', emoji: '🌡️', text: 'If it is −3 °C and it warms up by 5 degrees, count right from −3: −2, −1, 0, 1, 2. It is now 2 °C.' }
  ]),
  L('m6-percentages', 6, 'Percentages', 'Percentages', 'Per cent means out of 100.', 'percent', 'grid', [
    { title: 'Out of a hundred', emoji: '💯', text: 'Per cent means "out of 100". 30% of a 100-square grid is 30 of its squares.' },
    { title: 'Handy ones to know', emoji: '🧠', text: '50% is a half, 25% is a quarter, 75% is three quarters and 10% is a tenth.' },
    { title: 'Finding a percentage', emoji: '🏷️', text: 'A 20% discount on £40: 10% of 40 is 4, so 20% is 8. You save £8 and pay £32.' }
  ]),
  L('m7-two-step-equations', 7, 'Two-step equations', 'Two-step equations', 'Undo operations in reverse order to solve for x.', 'two-step', 'balance', [
    { title: 'Wrapping and unwrapping', emoji: '🎁', text: 'In 3x + 4 = 19, x was multiplied by 3, then 4 was added. To solve it, unwrap in reverse: undo the +4 first, then the ×3.' },
    { title: 'Inverse operations', emoji: '↩️', text: 'Subtraction undoes addition; division undoes multiplication. Whatever you do to one side, do to the other so the balance holds.' },
    { title: 'Always check', emoji: '✔️', text: 'Substitute your answer back in: 3 × 5 + 4 = 19. If both sides match, your x is right.' }
  ], 5),
  L('m7-squares', 7, 'Squares and square roots', 'Squares and roots', 'Squaring a number, and working backwards.', 'squares', 'grid', [
    { title: 'Square numbers', emoji: '🟦', text: '5² ("5 squared") means 5 × 5 = 25. Arrange 25 tiles in a 5 by 5 square and you can see why it is called square.' },
    { title: 'Square roots', emoji: '🌱', text: 'The square root goes backwards: √25 asks "what number times itself makes 25?" The answer is 5 — the side of the square.' },
    { title: 'Know the first twelve', emoji: '🧠', text: '1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144. Knowing these makes roots, areas and Pythagoras much quicker later on.' }
  ], 5)
];
