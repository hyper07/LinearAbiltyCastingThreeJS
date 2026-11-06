/**
 * Study questions for tutor NPCs.
 *
 * A parent sets a tutor up in the level editor: a subject (generated math,
 * or their own questions), a difficulty, and the rewards. The tutor then asks
 * one question at a time; a right answer pays out, a wrong one gets a second
 * try with a hint, and after that the answer is shown (and, with the AI on,
 * explained simply).
 *
 * The parent's own questions are written one per line:
 *
 *     Question | Answer | wrong answer, wrong answer | hint
 *
 * Only the question and answer are needed. With wrong answers the child picks
 * from buttons; without, they type. Several right answers can be given with a
 * slash: `colour/color`.
 */

export const SUBJECTS = {
  add: 'Addition',
  subtract: 'Subtraction',
  times: 'Times tables',
  mixed: 'Mixed math',
  custom: 'My own questions'
};

export const DIFFICULTIES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const STUDY_BONUSES = { none: 'Nothing', health: 'Health potion', focus: 'Focus potion', book: 'Skill book' };

const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/** Parse the parent's text box into questions. Lines without a `|` are skipped. */
export function parseQuestions(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .map(([q, a, wrong = '', hint = '']) => ({
      q,
      a,
      wrong: wrong
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean),
      hint
    }));
}

/** The questions back as text, for the editor's box. */
export function formatQuestions(list) {
  return (list ?? [])
    .map((x) => [x.q, x.a, (x.wrong ?? []).join(', '), x.hint ?? ''].join(' | ').replace(/( \| )+$/, ''))
    .join('\n');
}

/** Three wrong numbers close to the right one, never negative. */
function numberChoices(answer) {
  const options = new Set([answer]);
  const spread = Math.max(3, Math.round(answer * 0.25));
  for (let tries = 0; options.size < 4 && tries < 50; tries++) {
    const guess = answer + rand(-spread, spread);
    if (guess >= 0) options.add(guess);
  }
  return shuffle([...options].map(String));
}

function mathQuestion(subject, difficulty) {
  const kind = subject === 'mixed' ? ['add', 'subtract', 'times'][rand(0, 2)] : subject;
  const top = { easy: 10, medium: 20, hard: 100 }[difficulty] ?? 10;
  let q;
  let a;
  if (kind === 'times') {
    const table = { easy: 5, medium: 10, hard: 12 }[difficulty] ?? 5;
    const x = rand(1, table);
    const y = rand(1, 10);
    q = `What is ${x} × ${y}?`;
    a = x * y;
  } else if (kind === 'subtract') {
    const x = rand(1, top);
    const y = rand(0, x);
    q = `What is ${x} − ${y}?`;
    a = x - y;
  } else {
    const x = rand(0, top);
    const y = rand(0, top - x);
    q = `What is ${x} + ${y}?`;
    a = x + y;
  }
  return { q, a: String(a), choices: numberChoices(a), hint: '' };
}

/** Lower-case, no surrounding punctuation or extra spaces. */
const clean = (s) =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/^[\s"'.!?,]+|[\s"'.!?,]+$/g, '')
    .replace(/\s+/g, ' ');

/** Is `given` one of the accepted answers? Numbers compare as numbers. */
export function isCorrect(given, answer) {
  const g = clean(given);
  return String(answer)
    .split('/')
    .map(clean)
    .some((a) => a === g || (a !== '' && g !== '' && !Number.isNaN(+a) && +a === +g));
}

/** The first accepted answer, for showing the child. */
export const mainAnswer = (answer) => String(answer).split('/')[0].trim();

/**
 * One tutor's lessons during a run: which question is up, how many were
 * answered right, what the rewards are.
 */
export class StudySession {
  /** @param {object} study the NPC's `study` block from the level */
  constructor(study) {
    this.study = study;
    this.correct = 0;
    this.asked = 0;
    this.current = null;
    this.tries = 0;
    this._deck = [];
  }

  get hasQuestions() {
    return this.study.subject !== 'custom' || this.study.questions.length > 0;
  }

  /** The next question: `{ q, a, choices|null, hint }`. */
  next() {
    const s = this.study;
    if (s.subject === 'custom') {
      if (!s.questions.length) return null;
      // Every question once, in a shuffled order, then round again.
      if (!this._deck.length) this._deck = shuffle([...s.questions]);
      const item = this._deck.pop();
      const choices = item.wrong?.length ? shuffle([mainAnswer(item.a), ...item.wrong]) : null;
      this.current = { q: item.q, a: item.a, choices, hint: item.hint ?? '' };
    } else {
      this.current = mathQuestion(s.subject, s.difficulty);
    }
    this.tries = 0;
    this.asked += 1;
    return this.current;
  }

  /**
   * @returns {{ correct: boolean, final: boolean, bonus: boolean, question: object|null }}
   *   `final` — the question is over (right, or the second wrong try);
   *   `bonus` — this right answer earned the every-N bonus.
   */
  answer(given) {
    const q = this.current;
    if (!q) return { correct: false, final: true, bonus: false, question: null };
    this.tries += 1;
    if (isCorrect(given, q.a)) {
      this.correct += 1;
      this.current = null;
      const every = this.study.bonusEvery;
      return { correct: true, final: true, bonus: this.study.bonus !== 'none' && every > 0 && this.correct % every === 0, question: q };
    }
    const final = this.tries >= 2;
    if (final) this.current = null;
    return { correct: false, final, bonus: false, question: q };
  }
}
