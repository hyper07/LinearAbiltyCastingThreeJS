import { PEOPLE, TIERS, ACTIVITIES, SCENES, ENDINGS } from './lifeStory.js';
import { MINIGAMES, make as makeTask, score as scoreTask } from './minigames.js';

/**
 * The rules of Work Life's "Life" side: a life in days of three parts
 * (morning, afternoon, evening), each spent on something that moves what
 * you are — energy, mood, health, skill, how sociable you are, and money —
 * and who you are close to. Between them, scenes happen; what you choose,
 * and what you have in you at that moment, decide how they turn out and
 * what can happen later. Every 28 days a season ends and is given a name.
 *
 * Life keeps the game's time (`tick`): a day is a game day, its three parts
 * a third of one each, and nothing can be skipped or hurried — one thing a
 * part, and the night comes on its own. The harder choices in a scene are
 * not just picked but done: a small task, and how well you do it (helped or
 * hindered by what you are) decides how the scene turns out.
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
    flags: {}, seen: {}, sceneToday: 0, scene: null, pending: null, spent: null, t0: null, last: null, review: null, seasons: [], log: []
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
  if (!s.scene) s.pending = null;
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
  // One thing a part of the day: once it is spent, the next part has to come round.
  if (s.scene || s.review || s.part >= 3 || s.spent === `${s.day}:${s.part}`) return [];
  const work = !isWeekend(s.day) && s.part < 2;
  return ACTIVITIES.filter((a) => (a.when === 'work') === work && (!a.weekday || !isWeekend(s.day)) && (!a.day || s.day >= a.day)).map((a) => {
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
  if (w.slot != null && s.part !== w.slot) return false;
  // Some scenes belong to a thing you do: they come only straight after it.
  if (w.after && !(s.last?.kind === 'activity' && s.last.id === w.after && s.spent === `${s.day}:${s.part}`)) return false;
  if (w.flag && !s.flags[w.flag]) return false;
  if (w.not && s.flags[w.not]) return false;
  for (const [id, v] of Object.entries(w.aff ?? {})) if ((s.people[id] ?? 0) < v) return false;
  for (const [k, [lo, hi]] of Object.entries(w.stat ?? {})) if (s.stats[k] < lo || s.stats[k] > hi) return false;
  return true;
}

/** Start a scene, if one is due: what belongs to what you just did first, then the stories in their order, then the small things. */
function maybeScene(s, most = isWeekend(s.day) ? 2 : 1) {
  if (s.scene || s.review) return;
  const ready = SCENES.filter((sc) => mayHappen(s, sc));
  if (!ready.length) return;
  // What belongs to the thing you just did happens there and then, whatever else the day has held.
  const here = ready.filter((sc) => sc.when?.after);
  if (!here.length && s.sceneToday >= most) return;
  const story = ready.filter((sc) => !sc.again && !sc.when?.after);
  // A story waiting to be told is told; a small thing happens about one day in three.
  const pick = here.length ? here.find((sc) => !sc.again) ?? here[Math.floor(roll(s) * here.length)] : story.length ? story[0] : roll(s) < 0.34 ? ready[Math.floor(roll(s) * ready.length)] : null;
  if (!pick) return;
  s.scene = pick.id;
  if (!pick.when?.after) s.sceneToday++;
  s.seen[pick.id] = s.day;
}

/** Spend this part of the day on something. Returns why not, or null. */
export function act(s, id) {
  const a = activitiesFor(s).find((x) => x.id === id);
  if (!a) return s.scene ? 'Something is happening — answer it first' : s.spent === `${s.day}:${s.part}` ? `You have spent this ${(PARTS[s.part] ?? 'part of the day').toLowerCase()}. The next part of the day comes in its own time` : 'You can\'t do that now';
  if (a.locked) return a.locked;
  // Worn out or low, you get less from the same hours.
  const scale = s.stats.energy < 25 ? 0.5 : s.stats.mood < 25 ? 0.7 : s.stats.energy > 75 && s.stats.mood > 60 ? 1.15 : 1;
  const done = apply(s, { ...a.fx, money: (a.fx.money ?? 0) - (a.cost ?? 0) }, scale);
  s.last = { kind: 'activity', id: a.id, name: a.name, icon: a.icon, place: a.scene, part: PARTS[s.part], done, tired: scale < 1 };
  s.spent = `${s.day}:${s.part}`;
  maybeScene(s);
  return null;
}

const meets = (s, need = {}) => Object.entries(need.stat ?? {}).every(([k, v]) => s.stats[k] >= v) && Object.entries(need.aff ?? {}).every(([id, v]) => (s.people[id] ?? 0) >= v) && (need.money == null || s.stats.money >= need.money);

/** The task a hard choice is settled by: by what it asks of you. Money and closeness are not tasks; they are simply so or not. */
const TASK_FOR = { energy: 'triage', health: 'triage', skill: 'spot-error', mood: 'estimate', social: 'estimate' };
function taskOf(choice) {
  const stat = Object.keys(choice.need?.stat ?? {})[0];
  return stat ? { kind: TASK_FOR[stat] ?? 'estimate', stat, need: choice.need.stat[stat] } : null;
}
/** The mark to reach on a task (of 100). What you are counts too: half a point for each point over (or under) what was asked. */
export const PASS = 60;

function settle(s, sc, index, ok, extra = {}) {
  const c = sc.choices[index];
  const out = ok ? c.ok : c.no;
  const done = apply(s, out.fx);
  s.last = { kind: 'scene', id: sc.id, title: sc.title, place: sc.place, cast: sc.cast, choice: c.t, ok, lines: out.lines, done, ...extra };
  s.log.push({ day: s.day, scene: sc.id, choice: index, ok });
  if (s.log.length > 120) s.log.shift();
  s.scene = null;
  s.pending = null;
}

/**
 * Answer the scene in front of you. An easy answer just happens. A hard one
 * is a task to do first (`s.pending`, then `task`) — or, where it turns on
 * money or on how close you are to someone, is simply so or not.
 * Returns why not, or null.
 */
export function choose(s, index) {
  const sc = SCENES.find((x) => x.id === s.scene);
  const i = index | 0;
  const c = sc?.choices[i];
  if (!c) return 'There is nothing to answer';
  if (s.pending) return 'Finish what you started first';
  const t = c.need ? taskOf(c) : null;
  if (t) {
    s.pending = { scene: sc.id, choice: i, kind: t.kind, stat: t.stat, need: t.need, seed: `life:${s.seed}:${sc.id}:${s.day}:${s.n++}` };
    return null;
  }
  settle(s, sc, i, meets(s, c.need));
  return null;
}

/** The task waiting to be done, as the browser may see it (the puzzle, never its answer). */
export function challengeOf(s) {
  if (!s.pending) return null;
  const made = makeTask(s.pending.kind, s.pending.seed, 'support');
  const sc = SCENES.find((x) => x.id === s.pending.scene);
  const edge = Math.round(Math.max(-20, Math.min(20, (s.stats[s.pending.stat] - s.pending.need) * 0.5)));
  return { kind: s.pending.kind, title: MINIGAMES[s.pending.kind].name, how: MINIGAMES[s.pending.kind].how, public: { ...made.public, kind: s.pending.kind }, choice: sc.choices[s.pending.choice].t, pass: PASS, stat: s.pending.stat, edge };
}

/** Do the task: your score, plus or minus what you had in you, decides how the scene turns out. Returns why not, or null. */
export function task(s, answer) {
  if (!s.pending) return 'There is no task to do';
  const sc = SCENES.find((x) => x.id === s.pending.scene);
  const made = makeTask(s.pending.kind, s.pending.seed, 'support');
  const score = scoreTask(s.pending.kind, made.secret, answer ?? {});
  const edge = Math.round(Math.max(-20, Math.min(20, (s.stats[s.pending.stat] - s.pending.need) * 0.5)));
  settle(s, sc, s.pending.choice, score + edge >= PASS, { score, edge, pass: PASS, task: MINIGAMES[s.pending.kind].name });
  return null;
}

/** How a season is remembered. */
export function endingOf(s) {
  const e = ENDINGS.find((x) => x.when(s));
  return { id: e.id, title: e.title, text: e.text };
}

/**
 * The night between two days: sleep gives back energy — more if you are
 * healthy, and for every part of the day you left empty — and your mood
 * drifts back toward ordinary. On Sundays the week is settled: the rent
 * goes out. Every 28th day the season is given its name.
 */
function night(s, idle = 0) {
  // What you don't keep up slips a little each day: fitness, and the people you haven't seen.
  const fx = { energy: Math.round(30 + s.stats.health * 0.2 + idle * 8), mood: Math.round((55 - s.stats.mood) * 0.25), health: s.stats.energy < 15 ? -4 : -1, social: -1 };
  const done = apply(s, fx);
  let week = null;
  if (weekdayOf(s.day) === 6) {
    apply(s, { money: -RENT });
    week = { rent: RENT, money: s.stats.money };
    if (s.stats.money < 0) apply(s, { mood: -8 });
  }
  if (s.day % SEASON === 0 && !s.review) {
    const e = endingOf(s);
    s.review = { season: s.seasons.length + 1, ...e, stats: { ...s.stats }, people: { ...s.people } };
    s.seasons.push({ season: s.review.season, id: e.id, title: e.title, day: s.day });
  }
  if (!s.scene) s.last = { kind: 'night', done, week, day: s.day };
  s.day++;
  s.sceneToday = 0;
}

/**
 * Bring a life up to the game's clock. `day` is the game's day (a number
 * that goes up by one each game day) and `part` the part of it now (0
 * morning, 1 afternoon, 2 evening). Days that went by are slept through, a
 * night each (at most two weeks of them are lived; a longer absence is just
 * a long time ago). Returns true if anything changed.
 */
export function tick(s, day, part) {
  const p = clamp(part | 0, 0, 2);
  const first = s.t0 == null;
  if (first) s.t0 = day - (s.day - 1);
  const target = day - s.t0 + 1;
  if (target === s.day && p === s.part && !first) return false;
  let nights = 0;
  while (s.day < target && nights < 14) {
    // A part left empty was rest; a scene left unanswered waits.
    const idle = s.spent?.startsWith(`${s.day}:`) ? 2 - Number(s.spent.split(':')[1] ?? 0) : 3;
    night(s, Math.max(0, Math.min(3, idle)));
    nights++;
  }
  if (s.day < target) {
    s.t0 += target - s.day;
  }
  s.part = p;
  // Some things are waiting when you wake, or when the afternoon comes round.
  maybeScene(s);
  return true;
}

/**
 * Something you did elsewhere (a task at work, an odd job) may set a scene
 * going: that is how the story moves on a day when you are busy. Returns
 * true if one began.
 */
export function nudge(s) {
  const before = s.scene;
  maybeScene(s, 3);
  return Boolean(s.scene && s.scene !== before);
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
    people: Object.entries(PEOPLE).map(([id, p]) => ({ id, name: p.name, role: p.role, look: p.look, closeness: s.people[id], tier: tierOf(s.people[id]), met: s.people[id] > 0 || id === 'mum' || id === 'jun' || id === 'mina' || id === 'alvarez' || s.log.some((x) => SCENES.find((sc) => sc.id === x.scene)?.cast.includes(id)) })),
    activities: activitiesFor(s),
    scene: sc ? { id: sc.id, title: sc.title, place: sc.place, cast: sc.cast.map((id) => ({ id, name: PEOPLE[id].name, look: PEOPLE[id].look })), lines: lines(sc.lines), choices: sc.choices.map((ch) => ({ text: fill(ch.t, c), hard: Boolean(ch.need) })) } : null,
    last: s.last ? { ...s.last, lines: s.last.lines ? lines(s.last.lines) : undefined, cast: s.last.cast?.map((id) => ({ id, name: PEOPLE[id].name, look: PEOPLE[id].look })) } : null,
    challenge: challengeOf(s),
    spent: s.spent === `${s.day}:${s.part}`,
    review: s.review,
    seasons: s.seasons
  };
}
