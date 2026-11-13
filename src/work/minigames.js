/**
 * The work game's mini-games, made from a seed and scored on the server
 * (the browser gets the puzzle, never the answer):
 *
 *   triage      put five tasks in order: the most urgent first
 *               (priority = people affected ÷ hours left)
 *   spot-error  a small table where the total is wrong in one or two rows:
 *               pick the rows whose total does not add up
 *   estimate    a number to work out from a short story (growth, a budget);
 *               points by how close the answer is
 *
 * `make(kind, seed, role)` → { public, secret }; `score(kind, secret, answer)` → 0–100.
 */

const rng = (seed) => {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 2 ** 32;
  };
};
const pick = (r, list) => list[Math.floor(r() * list.length)];

const TASKS = {
  support: ['Refund request', 'Login problem', 'Broken order', 'Billing question', 'App crash report', 'Missing delivery', 'Password reset', 'Complaint about a late reply'],
  operations: ['Truck delay', 'Stock running low', 'Warehouse safety check', 'Supplier invoice', 'Late shipment', 'Machine repair', 'Shift swap', 'Inventory count'],
  people: ['New hire paperwork', 'Team conflict', 'Training sign-ups', 'Payroll question', 'Interview schedule', 'Safety training', 'Holiday requests', 'Office move'],
  sales: ['Big client renewal', 'New lead follow-up', 'Price question', 'Contract signature', 'Demo request', 'Unhappy customer', 'Trade show booth', 'Quote update'],
  marketing: ['Ad campaign launch', 'Website typo', 'Social post approval', 'Newsletter', 'Event invitation', 'Product photo shoot', 'Survey results', 'Press release review']
};

export const MINIGAMES = {
  triage: { name: 'Triage', how: 'Put the tasks in order: most urgent first. Urgency = people affected ÷ hours left.' },
  'spot-error': { name: 'Spot the error', how: 'Each row should add up: A + B = Total. Pick every row where it does not.' },
  estimate: { name: 'Quick estimate', how: 'Work out the number. Closer answers score more.' }
};

export function make(kind, seed, role = 'support') {
  const r = rng(`${kind}:${seed}`);
  if (kind === 'triage') {
    const pool = [...(TASKS[role] ?? TASKS.support)];
    const items = [];
    for (let i = 0; i < 5; i++) {
      const label = pool.splice(Math.floor(r() * pool.length), 1)[0];
      items.push({ id: `t${i}`, label, people: 1 + Math.floor(r() * 120), hours: 1 + Math.floor(r() * 48) });
    }
    const order = [...items].sort((a, b) => b.people / b.hours - a.people / a.hours).map((t) => t.id);
    return { public: { kind, how: MINIGAMES.triage.how, items }, secret: { order } };
  }
  if (kind === 'spot-error') {
    const labels = pick(r, [['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ['North', 'South', 'East', 'West', 'Online', 'Stores'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']]);
    const rows = labels.map((label, i) => {
      const a = 100 + Math.floor(r() * 900);
      const b = 100 + Math.floor(r() * 900);
      return { id: `r${i}`, label, a, b, total: a + b };
    });
    const wrong = new Set();
    const count = 1 + Math.floor(r() * 2);
    while (wrong.size < count) wrong.add(Math.floor(r() * rows.length));
    for (const i of wrong) rows[i].total += pick(r, [-100, -10, -9, 9, 10, 100, 90, -90]);
    return { public: { kind, how: MINIGAMES['spot-error'].how, rows }, secret: { wrong: [...wrong].map((i) => rows[i].id) } };
  }
  // estimate
  const story = pick(r, ['growth', 'budget', 'units']);
  if (story === 'growth') {
    const base = 1000 * (2 + Math.floor(r() * 9));
    const pct = pick(r, [5, 10, 15, 20, 25]);
    const months = 2 + Math.floor(r() * 2);
    const answer = Math.round(base * (1 + pct / 100) ** months);
    return { public: { kind, how: MINIGAMES.estimate.how, question: `The app has ${base.toLocaleString('en-US')} users and grows ${pct}% a month. About how many users after ${months} months?`, unit: 'users' }, secret: { answer } };
  }
  if (story === 'budget') {
    const budget = 1000 * (10 + Math.floor(r() * 40));
    const spent = [0.2, 0.25, 0.3, 0.35][Math.floor(r() * 4)];
    const extra = 100 * (5 + Math.floor(r() * 30));
    const answer = Math.round(budget * (1 - spent) - extra);
    return { public: { kind, how: MINIGAMES.estimate.how, question: `The team budget is $${budget.toLocaleString('en-US')}. ${Math.round(spent * 100)}% is already spent, and a $${extra.toLocaleString('en-US')} bill is due. How much is left after paying it?`, unit: 'dollars' }, secret: { answer } };
  }
  const perHour = 10 + Math.floor(r() * 40);
  const hours = 6 + Math.floor(r() * 5);
  const workers = 2 + Math.floor(r() * 5);
  return { public: { kind, how: MINIGAMES.estimate.how, question: `Each worker packs ${perHour} boxes an hour. ${workers} workers work ${hours} hours. How many boxes in total?`, unit: 'boxes' }, secret: { answer: perHour * hours * workers } };
}

export function score(kind, secret, answer) {
  if (kind === 'triage') {
    const got = Array.isArray(answer?.order) ? answer.order.map(String) : [];
    if (got.length !== secret.order.length || new Set(got).size !== got.length || got.some((id) => !secret.order.includes(id))) return 0;
    // Pairs in the right order (Kendall), as a share.
    let agree = 0;
    let pairs = 0;
    for (let i = 0; i < got.length; i++) {
      for (let j = i + 1; j < got.length; j++) {
        pairs++;
        if (secret.order.indexOf(got[i]) < secret.order.indexOf(got[j])) agree++;
      }
    }
    return Math.round((agree / pairs) * 100);
  }
  if (kind === 'spot-error') {
    const picked = new Set(Array.isArray(answer?.rows) ? answer.rows.map(String) : []);
    const wrong = new Set(secret.wrong);
    const hits = [...picked].filter((id) => wrong.has(id)).length;
    const false_ = picked.size - hits;
    return Math.max(0, Math.round(((hits - false_) / wrong.size) * 100));
  }
  const value = Number(answer?.value);
  if (!Number.isFinite(value)) return 0;
  const off = Math.abs(value - secret.answer) / Math.max(1, Math.abs(secret.answer));
  return off <= 0.01 ? 100 : off <= 0.05 ? 85 : off <= 0.1 ? 70 : off <= 0.2 ? 45 : off <= 0.35 ? 20 : 0;
}
