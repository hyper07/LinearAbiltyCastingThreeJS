/**
 * The game side of AI Arcademia — the fun, not the record: coins, XP and
 * the buddy's level, hats bought, stickers collected, daily quests, the
 * streak flame, chests opened and puzzle bosses cheered up. Kept in this
 * browser per player (the learning record itself is progress.js, on the
 * server when signed in). Pure functions are exported for the tests.
 */
import { BUDDIES, HATS } from './world/figures.js';
import { t } from './i18n/index.js';

const KEY = (who) => `arcademia.game.${who}`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayBefore = (day) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The buddy's level for an amount of XP: level n needs 60·n·(n−1)/2 XP. */
export function levelOf(xp) {
  let n = 1;
  while (xp >= (60 * (n + 1) * n) / 2) n++;
  const from = (60 * n * (n - 1)) / 2, to = (60 * (n + 1) * n) / 2;
  return { level: n, into: xp - from, need: to - from };
}

/** Stickers and quests read their words from the current language (ui.js sticker.* / dq.*). */
const sticker = (id, emoji) => ({
  id,
  emoji,
  get name() {
    return t(`sticker.${id}`);
  },
  get what() {
    return t(`sticker.${id}.what`);
  }
});
const quest = (id, goal, icon) => ({
  id,
  goal,
  icon,
  get text() {
    return t(`dq.${id}`);
  }
});
export const STICKERS = [
  sticker('first-quest', '🌱'),
  sticker('three-stars', '🌟'),
  sticker('combo-5', '🔥'),
  sticker('combo-10', '☄️'),
  sticker('math-5', '🔢'),
  sticker('history-5', '🏺'),
  sticker('physics-5', '🧲'),
  sticker('floor-2', '🍎'),
  sticker('floor-4', '💎'),
  sticker('floor-7', '🏔️'),
  sticker('boss', '😊'),
  sticker('boss-3', '🏆'),
  sticker('chest', '🧰'),
  sticker('streak-3', '📅'),
  sticker('streak-7', '🗓️'),
  sticker('dress-up', '🎩'),
  sticker('arcade', '🕹️'),
  sticker('level-5', '⭐'),
  sticker('gem-1', '💎'),
  sticker('gem-9', '👑'),
  sticker('curious', '🔔')
];

const QUEST_POOL = [
  quest('lesson', 1, '📘'),
  quest('right', 8, '✅'),
  quest('combo', 4, '🔥'),
  quest('stars', 3, '⭐'),
  quest('arcade', 1, '🕹️'),
  quest('math', 1, '🔢'),
  quest('history', 1, '🏛️'),
  quest('physics', 1, '🔭')
];
/** Today's three quests, the same all day (seeded by the date). */
export function dailyQuests(day) {
  let h = 0;
  for (const ch of day) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const pool = [...QUEST_POOL];
  const out = [pool.splice(0, 1)[0]]; // always "finish a lesson"
  for (let i = 0; i < 2; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out.map((q) => ({ ...q, have: 0, claimed: false }));
}

const fresh = () => ({ v: 1, gems: {}, toys: {}, buddy: null, coins: 0, xp: 0, hats: ['none', 'party'], stickers: {}, daily: null, streak: { last: null, count: 0 }, chests: {}, bosses: {}, bestCombo: 0, counts: { math: 0, history: 0, physics: 0 }, arcadeBest: {} });

export class GameState {
  constructor(who = 'guest') {
    this.who = who;
    this.listeners = new Set();
    try {
      this.s = { ...fresh(), ...(JSON.parse(localStorage.getItem(KEY(who))) ?? {}) };
      this.s.gems ??= {};
      this.s.toys ??= {};
    } catch {
      this.s = fresh();
    }
    this._rollDay();
  }
  onChange(fn) {
    this.listeners.add(fn);
  }
  save() {
    try {
      localStorage.setItem(KEY(this.who), JSON.stringify(this.s));
    } catch {
      /* private mode: the fun isn't kept */
    }
    for (const fn of this.listeners) fn(this);
  }
  _rollDay() {
    const d = today();
    if (this.s.daily?.day !== d) this.s.daily = { day: d, quests: dailyQuests(d) };
  }

  get buddy() {
    return this.s.buddy;
  }
  setBuddy(b) {
    this.s.buddy = { species: BUDDIES.some((x) => x.id === b.species) ? b.species : 'fox', color: b.color, hat: this.s.hats.includes(b.hat) ? b.hat : 'none' };
    this.save();
  }
  get level() {
    return levelOf(this.s.xp);
  }

  /**
   * Something happened; returns what it earned: { coins, xp, stickers[], levelUp }.
   * kinds: right (combo), wrong, reading, lesson (stars, subject), chest, boss, arcade (score)
   */
  event(kind, data = {}) {
    this._rollDay();
    const before = this.level.level;
    const got = { coins: 0, xp: 0, stickers: [], levelUp: false };
    const sticker = (id) => {
      if (this.s.stickers[id]) return;
      this.s.stickers[id] = Date.now();
      got.stickers.push(STICKERS.find((x) => x.id === id));
    };
    const quest = (id, n = 1, set = false) => {
      for (const q of this.s.daily.quests) if (q.id === id) q.have = set ? Math.max(q.have, n) : q.have + n;
    };
    if (kind === 'right') {
      got.coins += 2 + (data.combo >= 5 ? 3 : data.combo >= 3 ? 1 : 0);
      got.xp += 10;
      quest('right');
      quest('combo', data.combo, true);
      this.s.bestCombo = Math.max(this.s.bestCombo, data.combo);
      if (data.combo >= 5) sticker('combo-5');
      if (data.combo >= 10) sticker('combo-10');
    } else if (kind === 'reading') got.xp += 5;
    else if (kind === 'lesson') {
      got.coins += 10 * data.stars;
      got.xp += 30;
      quest('lesson');
      quest('stars', data.newStars ?? data.stars);
      quest(data.subject);
      this.s.counts[data.subject] = (this.s.counts[data.subject] ?? 0) + 1;
      sticker('first-quest');
      if (data.stars === 3) sticker('three-stars');
      if (this.s.counts[data.subject] >= 5) sticker(`${data.subject}-5`);
      // The streak: days in a row with a finished lesson.
      const d = today();
      if (this.s.streak.last !== d) {
        this.s.streak.count = this.s.streak.last === dayBefore(d) ? this.s.streak.count + 1 : 1;
        this.s.streak.last = d;
      }
      if (this.s.streak.count >= 3) sticker('streak-3');
      if (this.s.streak.count >= 7) sticker('streak-7');
    } else if (kind === 'chest') {
      if (this.s.chests[data.floor]) return got;
      this.s.chests[data.floor] = Date.now();
      got.coins += 25 + data.floor * 5;
      sticker('chest');
    } else if (kind === 'boss') {
      if (!this.s.bosses[data.floor]) {
        got.coins += 60;
        got.xp += 80;
      }
      this.s.bosses[data.floor] = Date.now();
      sticker('boss');
      if (Object.keys(this.s.bosses).length >= 3) sticker('boss-3');
    } else if (kind === 'arcade') {
      got.coins += Math.min(20, data.score);
      got.xp += Math.min(40, data.score * 2);
      quest('arcade');
      this.s.arcadeBest[data.game] = Math.max(this.s.arcadeBest[data.game] ?? 0, data.score);
      if (data.score >= 10) sticker('arcade');
    } else if (kind === 'gem') {
      if (this.s.gems[data.id]) return got;
      this.s.gems[data.id] = Date.now();
      got.coins += 10;
      got.xp += 15;
      sticker('gem-1');
      if (Object.keys(this.s.gems).length >= 9) sticker('gem-9');
    } else if (kind === 'toy') {
      if (this.s.toys[data.id]) return got;
      this.s.toys[data.id] = Date.now();
      got.coins += 2;
      if (Object.keys(this.s.toys).length >= 8) sticker('curious');
    } else if (kind === 'floor') {
      if (data.floor >= 2) sticker('floor-2');
      if (data.floor >= 4) sticker('floor-4');
      if (data.floor >= 7) sticker('floor-7');
    }
    this.s.coins += got.coins;
    this.s.xp += got.xp;
    const after = this.level.level;
    if (after > before) {
      got.levelUp = after;
      if (after >= 5) sticker('level-5');
    }
    this.save();
    return got;
  }

  get streak() {
    const d = today();
    const s = this.s.streak;
    return s.last === d || s.last === dayBefore(d) ? s.count : 0;
  }
  get quests() {
    this._rollDay();
    return this.s.daily.quests;
  }
  /** Claim a finished daily quest: 15 coins. */
  claim(id) {
    const q = this.quests.find((x) => x.id === id);
    if (!q || q.claimed || q.have < q.goal) return 0;
    q.claimed = true;
    this.s.coins += 15;
    this.save();
    return 15;
  }
  buyHat(id) {
    const hat = HATS.find((h) => h.id === id);
    if (!hat || this.s.hats.includes(id)) return true;
    if (this.s.coins < hat.cost) return false;
    this.s.coins -= hat.cost;
    this.s.hats.push(id);
    this.s.stickers['dress-up'] ??= Date.now();
    this.save();
    return true;
  }
}
