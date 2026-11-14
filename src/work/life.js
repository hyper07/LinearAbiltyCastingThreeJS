import { PEOPLE, TIERS, ACTIVITIES, SCENES, ENDINGS } from './lifeStory.js';

/**
 * The rules of Work Life's "Life" side: a life in days of three parts
 * (morning, afternoon, evening), each spent on something that moves what
 * you are — energy, mood, health, skill, how sociable you are, and money —
 * and who you are close to. Between them, scenes happen; what you choose,
 * and what you have in you at that moment, decide how they turn out and
 * what can happen later. Every 28 days a season ends and is given a name.
 *
 * Pure functions over a plain state object, so the server decides and saves
 * it and the browser only shows it. Life has its own pocket money: it never
 * touches the wallet that the stock game invests.
 */

export const PARTS = ['Morning', 'Afternoon', 'Evening'];
export const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SEASON = 28;
export const STATS = {
  energy: { name: 'Energy', icon: '⚡', color: '#ffc93c' },
  mood: { name: 'Mood', icon: '🙂', color: '#ff5da2' },
  health: { name: 'Health', icon: '❤', color: '#ff7a59' },
  skill: { name: 'Skill', icon: '🎓', color: '#38b6ff' },
  social: { name: 'Social', icon: '🫶', color: '#2fd3a0' }
};
const RENT = 95;
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** A new life: day 1, a Monday morning. */
export function newLife(seed = 1) {
  return {
    v: 1, seed: seed >>> 0 || 1, n: 0, day: 1, part: 0,
    stats: { energy: 70, mood: 60, health: 55, skill: 8, social: 20, money: 160 },
    people: Object.fromEntries(Object.keys(PEOPLE).map((id) => [id, id === 'mum' ? 40 : id === 'jun' ? 25 : 0])),
    flags: {}, seen: {}, sceneToday: 0, scene: null, last: null, review: null, seasons: [], log: []
  };
}

/** A safe copy of a saved life (or a new one if it cannot be read). */
export function cleanLife(raw, seed = 1) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1 || !raw.stats) return newLife(seed);
  const s = { ...newLife(raw.seed ?? seed), ...raw };
  for (const k of Object.keys(newLife().stats)) s.stats[k] = Number.isFinite(raw.stats[k]) ? (k === 'money' ? Math.round(raw.stats[k]) : clamp(raw.stats[k])) : newLife().stats[k];
  s.people = Object.fromEntries(Object.keys(PEOPLE).map((id) => [id, clamp(Number(raw.people?.[id]) || 0)]));
  s.day = Math.max(1, raw.day | 0);
  s.part = clamp(raw.part | 0, 0, 3);
  if (s.scene && !SCENES.some((x) => x.id === s.scene)) s.scene = null;
  return s;
}

/** The next number between 0 and 1 in this life's own sequence (so the same choices give the same life). */
function roll(s) {
  let t = (s.seed + (s.n++ + 1) * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const weekdayOf = (day) => (day - 1) % 7;
export const isWeekend = (day) => weekdayOf(day) >= 5;
export const tierOf = (v) => [...TIERS].reverse().find(([min]) => v >= min)[1];

/** Change what you are and who you are close to. Returns what really changed, for showing. */
function apply(s, fx = {}, scale = 1) {
  const done = { stats: {}, people: {} };
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'people' || k === 'flag') continue;
    if (!(k in s.stats)) continue;
    // Good things come smaller when you are worn out; costs are costs.
    // …and what you are already good at grows more slowly (the last steps are the long ones).
    const slow = v > 0 && (k === 'skill' || k === 'health' || k === 'social') ? 1 - s.stats[k] / 125 : 1;
    const d = v > 0 && k !== 'money' && k !== 'energy' ? Math.max(s.stats[k] < 70 ? 1 : 0, Math.round(v * scale * slow)) : Math.round(v);
    const before = s.stats[k];
    s.stats[k] = k === 'money' ? before + d : clamp(before + d);
    if (s.stats[k] !== before) done.stats[k] = s.stats[k] - before;
  }
  for (const [id, v] of Object.entries(fx.people ?? {})) {
    if (!(id in s.people)) continue;
    const before = s.people[id];
    s.people[id] = clamp(before + v);
    if (s.people[id] !== before) done.people[id] = s.people[id] - before;
  }
  if (fx.flag) s.flags[fx.flag] = s.day;
  return done;
}

/** What you can do with this part of the day. */
export function activitiesFor(s) {
  if (s.scene || s.review || s.part >= 3) return [];
  const work = !isWeekend(s.day) && s.part < 2;
  return ACTIVITIES.filter((a) => (a.when === 'work') === work && (!a.weekday || !isWeekend(s.day))).map((a) => {
    const why = a.cost && s.stats.money < a.cost ? `Needs ${a.cost} in your pocket` : (a.fx.energy ?? 0) < -10 && s.stats.energy + a.fx.energy < 0 ? 'Too tired for that' : null;
    return { id: a.id, name: a.name, icon: a.icon, text: a.text, scene: a.scene, cost: a.cost ?? 0, fx: a.fx, locked: why };
  });
}

/** Whether a scene may happen now. */
function mayHappen(s, sc) {
  const w = sc.when ?? {};
  if (s.seen[sc.id] != null && (!sc.again || s.day - s.seen[sc.id] < sc.again)) return false;
  if (w.day && s.day < w.day) return false;
  if (w.weekday === 'work' && isWeekend(s.day)) return false;
  if (w.weekday === 'weekend' && !isWeekend(s.day)) return false;
  // `part` counts what has been done today, so a morning scene comes once the morning is spent.
  if (w.slot != null && s.part - 1 !== w.slot) return false;
  if (w.flag && !s.flags[w.flag]) return false;
  if (w.not && s.flags[w.not]) return false;
  for (const [id, v] of Object.entries(w.aff ?? {})) if ((s.people[id] ?? 0) < v) return false;
  for (const [k, [lo, hi]] of Object.entries(w.stat ?? {})) if (s.stats[k] < lo || s.stats[k] > hi) return false;
  return true;
}

/** Start a scene, if one is due: the stories with a place in the order first, the small things after. */
function maybeScene(s) {
  if (s.scene || s.sceneToday >= (isWeekend(s.day) ? 2 : 1)) return;
  const ready = SCENES.filter((sc) => mayHappen(s, sc));
  if (!ready.length) return;
  const story = ready.filter((sc) => !sc.again);
  // A story waiting to be told is told; a small thing happens about one day in three.
  const pick = story.length ? story[0] : roll(s) < 0.34 ? ready[Math.floor(roll(s) * ready.length)] : null;
  if (!pick) return;
  s.scene = pick.id;
  s.sceneToday++;
  s.seen[pick.id] = s.day;
}

/** Spend this part of the day on something. Returns why not, or null. */
export function act(s, id) {
  const a = activitiesFor(s).find((x) => x.id === id);
  if (!a) return s.scene ? 'Something is happening — answer it first' : s.part >= 3 ? 'The day is done. Sleep on it' : 'You can\'t do that now';
  if (a.locked) return a.locked;
  // Worn out or low, you get less from the same hours.
  const scale = s.stats.energy < 25 ? 0.5 : s.stats.mood < 25 ? 0.7 : s.stats.energy > 75 && s.stats.mood > 60 ? 1.15 : 1;
  const done = apply(s, { ...a.fx, money: (a.fx.money ?? 0) - (a.cost ?? 0) }, scale);
  s.last = { kind: 'activity', id: a.id, name: a.name, icon: a.icon, place: a.scene, part: PARTS[s.part], done, tired: scale < 1 };
  s.part++;
  maybeScene(s);
  return null;
}

const meets = (s, need = {}) => Object.entries(need.stat ?? {}).every(([k, v]) => s.stats[k] >= v) && Object.entries(need.aff ?? {}).every(([id, v]) => (s.people[id] ?? 0) >= v) && (need.money == null || s.stats.money >= need.money);

/** Answer the scene in front of you. Returns why not, or null. */
export function choose(s, index) {
  const sc = SCENES.find((x) => x.id === s.scene);
  const c = sc?.choices[index | 0];
  if (!c) return 'There is nothing to answer';
  const ok = meets(s, c.need);
  const out = ok ? c.ok : c.no;
  const done = apply(s, out.fx);
  s.last = { kind: 'scene', id: sc.id, title: sc.title, place: sc.place, cast: sc.cast, choice: c.t, ok, lines: out.lines, done };
  s.log.push({ day: s.day, scene: sc.id, choice: index | 0, ok });
  if (s.log.length > 120) s.log.shift();
  s.scene = null;
  return null;
}

/** How a season is remembered. */
export function endingOf(s) {
  const e = ENDINGS.find((x) => x.when(s));
  return { id: e.id, title: e.title, text: e.text };
}

/**
 * End the day (any parts left are slept through). Sleep gives back energy —
 * more if you are healthy — and your mood drifts back toward ordinary. On
 * Sundays the week is settled: the rent goes out. Every 28th day the season
 * is given its name. Returns why not, or null.
 */
export function sleep(s) {
  if (s.scene) return 'Something is happening — answer it first';
  if (s.review) return 'Read how the season went first';
  const skipped = 3 - s.part;
  // What you don't keep up slips a little each day: fitness, and the people you haven't seen.
  const night = { energy: Math.round(30 + s.stats.health * 0.2 + skipped * 8), mood: Math.round((55 - s.stats.mood) * 0.25), health: s.stats.energy < 15 ? -4 : -1, social: -1 };
  const done = apply(s, night);
  let week = null;
  if (weekdayOf(s.day) === 6) {
    apply(s, { money: -RENT });
    week = { rent: RENT, money: s.stats.money };
    if (s.stats.money < 0) apply(s, { mood: -8 });
  }
  if (s.day % SEASON === 0) {
    const e = endingOf(s);
    s.review = { season: s.seasons.length + 1, ...e, stats: { ...s.stats }, people: { ...s.people } };
    s.seasons.push({ season: s.review.season, id: e.id, title: e.title, day: s.day });
  }
  s.last = { kind: 'night', done, week, day: s.day };
  s.day++;
  s.part = 0;
  s.sceneToday = 0;
  // Some things are waiting when you wake.
  if (!s.review) maybeScene(s);
  return null;
}

/** Close the season's review and carry on. */
export function nextSeason(s) {
  if (!s.review) return 'No season has just ended';
  s.review = null;
  maybeScene(s);
  return null;
}

const fill = (text, ctx) => String(text).replace(/\{(company|role|title|name)\}/g, (_, k) => ctx[k] ?? '');

/**
 * What the browser shows: where you are in the week, what you are, who you
 * know, what you can do now, the scene in front of you (with its words
 * filled in), and what just happened.
 * @param {{ company?: string, role?: string, title?: string, name?: string }} [ctx] the job and the name to speak of
 */
export function viewOf(s, ctx = {}) {
  const c = { company: 'Lumen Works', role: 'associate', title: 'Junior', name: 'you', ...Object.fromEntries(Object.entries(ctx).filter(([, v]) => v)) };
  const lines = (list) => list.map((l) => ({ who: l.who, name: l.who ? PEOPLE[l.who].name : null, text: fill(l.text, c), mood: l.mood }));
  const sc = SCENES.find((x) => x.id === s.scene);
  return {
    day: s.day, week: Math.ceil(s.day / 7), weekday: WEEK[weekdayOf(s.day)], weekend: isWeekend(s.day), part: s.part, partName: PARTS[s.part] ?? 'Night',
    season: s.seasons.length + (s.review ? 0 : 1), seasonDay: ((s.day - 1) % SEASON) + 1, seasonLength: SEASON,
    job: { company: c.company, role: c.role, title: c.title },
    stats: s.stats,
    people: Object.entries(PEOPLE).map(([id, p]) => ({ id, name: p.name, role: p.role, look: p.look, closeness: s.people[id], tier: tierOf(s.people[id]), met: s.people[id] > 0 || id === 'mum' || id === 'jun' || id === 'mina' || id === 'alvarez' })),
    activities: activitiesFor(s),
    scene: sc ? { id: sc.id, title: sc.title, place: sc.place, cast: sc.cast.map((id) => ({ id, name: PEOPLE[id].name, look: PEOPLE[id].look })), lines: lines(sc.lines), choices: sc.choices.map((ch) => ({ text: fill(ch.t, c), hard: Boolean(ch.need) })) } : null,
    last: s.last ? { ...s.last, lines: s.last.lines ? lines(s.last.lines) : undefined, cast: s.last.cast?.map((id) => ({ id, name: PEOPLE[id].name, look: PEOPLE[id].look })) } : null,
    review: s.review,
    seasons: s.seasons,
    canSleep: !s.scene && !s.review
  };
}
