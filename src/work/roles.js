/**
 * The work game's jobs: the roles a player can apply for, the career ladder,
 * pay, and the rules of the year. Game money is dollars (stored in cents);
 * a "game year" is 28 real days, so a career moves at a playable pace.
 */

export const ROLES = {
  engineer: { name: 'Software engineer', icon: '💻', pay: 1.15, deliverable: 'the release', games: ['spot-error', 'estimate'] },
  analyst: { name: 'Data analyst', icon: '📊', pay: 1.1, deliverable: 'the weekly report', games: ['spot-error', 'estimate'] },
  marketing: { name: 'Marketing specialist', icon: '📣', pay: 0.95, deliverable: 'the campaign plan', games: ['triage', 'estimate'] },
  sales: { name: 'Sales representative', icon: '🤝', pay: 1.0, deliverable: 'the client pitch', games: ['triage', 'estimate'] },
  support: { name: 'Customer support', icon: '🎧', pay: 0.8, deliverable: 'the customer replies', games: ['triage', 'spot-error'] },
  operations: { name: 'Operations coordinator', icon: '📦', pay: 0.9, deliverable: 'the shipping schedule', games: ['triage', 'estimate'] },
  finance: { name: 'Financial analyst', icon: '💵', pay: 1.05, deliverable: 'the budget', games: ['spot-error', 'estimate'] },
  people: { name: 'People & HR partner', icon: '🧑‍🤝‍🧑', pay: 0.9, deliverable: 'the team plan', games: ['triage', 'spot-error'] }
};
export const ROLE_IDS = Object.keys(ROLES);

/** The ladder: a title and a base yearly salary (dollars, before the role's factor). */
export const LEVELS = [
  { title: 'Intern', salary: 30_000 },
  { title: 'Junior', salary: 60_000 },
  { title: 'Associate', salary: 85_000 },
  { title: 'Senior', salary: 120_000 },
  { title: 'Lead', salary: 160_000 },
  { title: 'Manager', salary: 200_000 },
  { title: 'Director', salary: 280_000 }
];

export const YEAR_DAYS = 28; // a game year, in real days
export const QUARTER_DAYS = 7;
export const MISSIONS_PER_DAY = 3;
export const DAY_MS = 86_400_000;

/** Yearly salary for a role and level, in cents. */
export const salaryFor = (role, level) => Math.round(LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))].salary * (ROLES[role]?.pay ?? 1)) * 100;
export const titleOf = (role, level) => `${LEVELS[level]?.title ?? 'Intern'} ${ROLES[role]?.name ?? role}`;

/** A day's pay: the year's salary over the game year's days. */
export const dayPay = (salary) => Math.round(salary / YEAR_DAYS);

/**
 * The year's evaluation from the period's missions.
 * performance = 70% average score + 30% share of missions done (missed ones count 0 in the average).
 * @param {{ score: number|null, status: string }[]} missions
 */
export function evaluate(missions) {
  const due = missions.filter((m) => m.status !== 'open');
  if (!due.length) return { performance: 60, rating: 'meets', done: 0, total: 0 };
  const done = due.filter((m) => m.status === 'done');
  const avg = due.reduce((s, m) => s + (m.status === 'done' ? m.score ?? 0 : 0), 0) / due.length;
  const performance = Math.round(0.7 * avg + 0.3 * (done.length / due.length) * 100);
  return { performance, rating: ratingOf(performance), done: done.length, total: due.length };
}

export const ratingOf = (p) => (p >= 85 ? 'exceeds' : p >= 65 ? 'meets' : p >= 45 ? 'below' : 'unsatisfactory');
export const RATINGS = {
  exceeds: { label: 'Exceeds expectations', raise: 0.08, bonus: 0.1 },
  meets: { label: 'Meets expectations', raise: 0.03, bonus: 0.03 },
  below: { label: 'Needs improvement', raise: 0, bonus: 0 },
  unsatisfactory: { label: 'Unsatisfactory', raise: 0, bonus: 0 }
};

/**
 * What an evaluation does: a raise and bonus, a promotion after two strong
 * years in a row (or one at the top of the scale), a warning when below, and
 * being let go after two warnings in a row.
 */
export function outcome({ rating, performance, previous, warnings, level }) {
  const r = RATINGS[rating];
  const promote = level < LEVELS.length - 1 && (rating === 'exceeds' && (previous === 'exceeds' || performance >= 95));
  const warn = rating === 'below' || rating === 'unsatisfactory';
  const nextWarnings = warn ? warnings + 1 : 0;
  return { raise: r.raise, bonus: r.bonus, promote, warn, letGo: nextWarnings >= 2 || (rating === 'unsatisfactory' && warnings >= 1), warnings: nextWarnings };
}

/**
 * The chance a layoff reaches this player: lower with better work and more
 * years, never zero and never more than half.
 */
export function layoffRisk({ performance, years }) {
  const base = 0.35 - (performance - 50) / 250 - Math.min(3, years) * 0.03;
  return Math.max(0.03, Math.min(0.5, base));
}

/** Severance: ten days' pay, plus two for every game year. */
export const severance = (salary, years) => dayPay(salary) * (10 + 2 * Math.floor(years));

/** The offer from an interview score (0–100): a level, or no offer. */
export const offerLevel = (score) => (score >= 80 ? 2 : score >= 55 ? 1 : score >= 30 ? 0 : null);
