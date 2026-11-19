import { randomBytes } from 'node:crypto';
import { RateLimiter, clientIp, json, pathOf, readJson } from './api/http.js';
import { hashPassword, verifyPassword } from './game/keys.js';
import { lessonById } from '../src/arcademia/content/index.js';
import {
  BEAT_MAX_SECONDS, DAY_MAX_ANSWERS, DAY_MAX_SECONDS, IMPORT_MAX_AGE_DAYS, IMPORT_MAX_DAY_SECONDS, IMPORT_MAX_EVENTS,
  LESSON_MIN_GAP_SECONDS, MAX_STARS, buildReport, clampTz, cleanEvent, dayOf, openFloors, starsFor
} from '../src/arcademia/rules.js';

/**
 * AI Arcademia's learning progress: the server is the source of truth for a
 * signed-in child. Guests keep the same data in their browser and may bring
 * it in once, on sign-in.
 *
 *   GET    /api/learning                    my stars, readings done, floors open
 *   POST   /api/learning/events             { events[], tz?, start? } — readings, answers, lessons, time
 *   POST   /api/learning/import             { stars{}, events[] } — a guest's progress, once per account
 *   GET    /api/learning/parent             { hasPin }
 *   POST   /api/learning/parent/pin         { pin } — sets it the first time, checks it after; → { parentKey }
 *   POST   /api/learning/parent/reset       { password } — the account's password clears a forgotten PIN
 *   GET    /api/learning/report             (x-parent-key) the weekly report and the share link
 *   POST   /api/learning/share              (x-parent-key) a new read-only link (the old one stops working)
 *   DELETE /api/learning/share              (x-parent-key) no link at all
 *   GET    /api/learning/shared/<token>     the weekly report, for whoever holds the link
 *
 * What a write may claim is checked here, not trusted:
 *   - stars are a lesson's best, 0–3, and never more than the right answers
 *     recorded for that lesson since its last finish allow;
 *   - study time is at most 90 s a heartbeat, never more than the time gone
 *     by since the last one, and at most 6 hours a day;
 *   - answers are capped per day; the same lesson finished twice inside 20 s counts once;
 *   - a parent PIN is 4 digits, stored as scrypt; 5 wrong tries lock it for 15 minutes.
 */

const PIN = /^\d{4}$/;
const TOKEN = /^[A-Za-z0-9_-]{20,40}$/;
const PARENT_MINUTES = 30;
const refuse = (message, status = 400) => Object.assign(new Error(message), { status });

export class LearningStore {
  /** @param {import('./db/database.js').Database} db */
  constructor(db, { now = () => Date.now() } = {}) {
    this.db = db;
    this.now = now;
    /** parentKey → { accountId, until } — a parent who typed the PIN, for half an hour. */
    this.parentKeys = new Map();
    /** accountId → { n, until } — wrong PINs. */
    this.wrongPins = new Map();
  }

  async profile(accountId) {
    let row = await this.db.one('SELECT * FROM learning_profile WHERE account_id = ?', [accountId]);
    if (row) return row;
    const now = this.now();
    await this.db.run('INSERT INTO learning_profile (account_id, created, updated) VALUES (?, ?, ?) ON CONFLICT (account_id) DO NOTHING', [accountId, now, now]);
    row = await this.db.one('SELECT * FROM learning_profile WHERE account_id = ?', [accountId]);
    return row;
  }

  /** My progress: best stars and readings per lesson, the floors open. */
  async progress(account) {
    const rows = await this.db.many('SELECT lesson_id, stars, reading_done, attempts FROM learning_lessons WHERE account_id = ?', [account.id]);
    const stars = {}, reading = {};
    for (const r of rows) {
      if (r.stars > 0) stars[r.lesson_id] = r.stars;
      if (r.reading_done) reading[r.lesson_id] = true;
    }
    const profile = await this.profile(account.id);
    return { stars, reading, floors: [...openFloors(stars)], imported: profile.imported };
  }

  async _today(accountId, tz, kind) {
    const now = this.now();
    const start = Date.parse(`${dayOf(now, tz)}T00:00:00Z`) + clampTz(tz) * 60000;
    if (kind === 'time') return Number((await this.db.one("SELECT COALESCE(SUM((data->>'seconds')::int), 0) AS s FROM learning_events WHERE account_id = ? AND kind = 'time' AND at >= ?", [accountId, start])).s);
    return Number((await this.db.one('SELECT COUNT(*) AS n FROM learning_events WHERE account_id = ? AND kind = ? AND at >= ?', [accountId, kind, start])).n);
  }

  async _insert(accountId, e) {
    const data = {};
    for (const k of ['correct', 'score', 'total', 'stars', 'seconds']) if (e[k] !== undefined) data[k] = e[k];
    await this.db.run('INSERT INTO learning_events (account_id, kind, lesson_id, subject, topic, data, at) VALUES (?, ?, ?, ?, ?, ?, ?)', [accountId, e.kind, e.lesson ?? null, e.subject, e.topic ?? null, JSON.stringify(data), e.at]);
  }

  async _lessonRow(accountId, lesson, now) {
    await this.db.run('INSERT INTO learning_lessons (account_id, lesson_id, subject, floor, first, last) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (account_id, lesson_id) DO NOTHING', [accountId, lesson.id, lesson.subject, lesson.floor, now, 0]);
    return this.db.one('SELECT * FROM learning_lessons WHERE account_id = ? AND lesson_id = ?', [accountId, lesson.id]);
  }

  /**
   * Record what happened. Each event is cleaned (rules.js cleanEvent) and
   * capped; what doesn't hold up is dropped, not an error.
   * @returns {{ accepted: number, stars: object, floors: number[], seconds: number }}
   */
  async record(account, { events = [], tz = null, start = false } = {}) {
    if (!Array.isArray(events) || events.length > 100) throw refuse('At most 100 events at a time');
    const now = this.now();
    const profile = await this.profile(account.id);
    const offset = tz == null ? profile.tz_offset : clampTz(tz);
    let accepted = 0;
    // Study time: what the clock allows since the last heartbeat, shared over this batch.
    const asked = events.filter((e) => e?.kind === 'time');
    let allowance = profile.last_beat ? Math.min(BEAT_MAX_SECONDS, Math.max(0, Math.round((now - Number(profile.last_beat)) / 1000) + 5)) : 5;
    if (asked.length) allowance = Math.min(allowance, Math.max(0, DAY_MAX_SECONDS - (await this._today(account.id, offset, 'time'))));
    let answersLeft = events.some((e) => e?.kind === 'answer') ? DAY_MAX_ANSWERS - (await this._today(account.id, offset, 'answer')) : 0;
    let seconds = 0;
    for (const raw of events) {
      const e = cleanEvent(raw, now);
      if (!e) continue;
      if (e.kind === 'time') {
        const take = Math.min(e.seconds, allowance);
        if (take <= 0) continue;
        allowance -= take;
        seconds += take;
        await this._insert(account.id, { ...e, seconds: take });
        accepted++;
        continue;
      }
      const lesson = lessonById(e.lesson);
      const row = await this._lessonRow(account.id, lesson, now);
      if (e.kind === 'reading') {
        if (!row.reading_done) await this.db.run('UPDATE learning_lessons SET reading_done = TRUE, last = GREATEST(last, ?) WHERE account_id = ? AND lesson_id = ?', [now, account.id, lesson.id]);
        await this._insert(account.id, e);
        accepted++;
      } else if (e.kind === 'answer') {
        if (answersLeft-- <= 0) continue;
        await this._insert(account.id, e);
        accepted++;
      } else if (e.kind === 'lesson') {
        const lastFinish = Number((await this.db.one("SELECT COALESCE(MAX(at), 0) AS t FROM learning_events WHERE account_id = ? AND kind = 'lesson' AND lesson_id = ?", [account.id, lesson.id])).t);
        if (lastFinish && now - lastFinish < LESSON_MIN_GAP_SECONDS * 1000) continue;
        // The score can't be more than the right answers recorded for this lesson since it was last finished (within two hours).
        const since = Math.max(lastFinish, now - 2 * 3600 * 1000);
        const right = Number((await this.db.one("SELECT COUNT(*) AS n FROM learning_events WHERE account_id = ? AND kind = 'answer' AND lesson_id = ? AND at >= ? AND (data->>'correct')::boolean", [account.id, lesson.id, since])).n);
        const score = Math.min(e.score, right);
        const stars = starsFor(score, e.total);
        await this.db.run('UPDATE learning_lessons SET stars = GREATEST(stars, ?), best_score = GREATEST(best_score, ?), attempts = attempts + 1, last = ? WHERE account_id = ? AND lesson_id = ?', [Math.min(MAX_STARS, stars), score, now, account.id, lesson.id]);
        await this._insert(account.id, { ...e, score, stars });
        accepted++;
      }
    }
    if (asked.length || start || seconds) await this.db.run('UPDATE learning_profile SET last_beat = ?, tz_offset = ?, updated = ? WHERE account_id = ?', [now, offset, now, account.id]);
    else if (tz != null) await this.db.run('UPDATE learning_profile SET tz_offset = ? WHERE account_id = ?', [offset, account.id]);
    const progress = await this.progress(account);
    return { accepted, seconds, stars: progress.stars, floors: progress.floors };
  }

  /**
   * A guest's progress, brought in once when they sign in. It can't be
   * checked like live play, so it is capped harder: known lessons only,
   * stars 0–3, the last 60 days, at most 3 hours of study a day.
   */
  async importGuest(account, { stars = {}, events = [], tz = null } = {}) {
    const profile = await this.profile(account.id);
    if (profile.imported) throw refuse('Progress from this device was already added to this account', 409);
    const now = this.now();
    const offset = tz == null ? profile.tz_offset : clampTz(tz);
    const oldest = now - IMPORT_MAX_AGE_DAYS * 86400000;
    const perDay = new Map();
    let accepted = 0;
    const list = (Array.isArray(events) ? events : []).slice(-IMPORT_MAX_EVENTS);
    for (const raw of list) {
      const at = Math.round(Number(raw?.at));
      if (!Number.isFinite(at) || at < oldest || at > now) continue;
      const e = cleanEvent(raw, at);
      if (!e) continue;
      if (e.kind === 'time') {
        const day = dayOf(at, offset);
        const used = perDay.get(day) ?? 0;
        const take = Math.min(e.seconds, IMPORT_MAX_DAY_SECONDS - used);
        if (take <= 0) continue;
        perDay.set(day, used + take);
        e.seconds = take;
      }
      await this._insert(account.id, e);
      accepted++;
    }
    for (const [id, value] of Object.entries(stars && typeof stars === 'object' ? stars : {}).slice(0, 500)) {
      const lesson = lessonById(id);
      const n = Math.max(0, Math.min(MAX_STARS, Math.round(Number(value) || 0)));
      if (!lesson || !n) continue;
      await this._lessonRow(account.id, lesson, now);
      await this.db.run('UPDATE learning_lessons SET stars = GREATEST(stars, ?), attempts = GREATEST(attempts, 1), last = GREATEST(last, ?) WHERE account_id = ? AND lesson_id = ?', [n, now, account.id, lesson.id]);
    }
    await this.db.run('UPDATE learning_profile SET imported = TRUE, tz_offset = ?, updated = ? WHERE account_id = ?', [offset, now, account.id]);
    return { accepted, ...(await this.progress(account)) };
  }

  /* ---- parents ---- */

  async hasPin(account) {
    return Boolean((await this.profile(account.id)).pin_hash);
  }

  /** Set the PIN (the first time) or check it; a parent key for half an hour either way. */
  async unlock(account, pin) {
    if (!PIN.test(String(pin ?? ''))) throw refuse('The PIN is 4 digits');
    const now = this.now();
    const wrong = this.wrongPins.get(account.id);
    if (wrong && wrong.until > now && wrong.n >= 5) throw refuse('Too many tries — wait 15 minutes', 429);
    const profile = await this.profile(account.id);
    if (!profile.pin_hash) {
      await this.db.run('UPDATE learning_profile SET pin_hash = ?, updated = ? WHERE account_id = ?', [await hashPassword(pin), now, account.id]);
    } else if (!(await verifyPassword(pin, profile.pin_hash))) {
      const w = wrong && wrong.until > now ? wrong : { n: 0, until: now + 15 * 60000 };
      w.n++;
      this.wrongPins.set(account.id, w);
      throw refuse('That PIN is not right', 403);
    }
    this.wrongPins.delete(account.id);
    const key = randomBytes(24).toString('base64url');
    this.parentKeys.set(key, { accountId: account.id, until: now + PARENT_MINUTES * 60000 });
    if (this.parentKeys.size > 10000) for (const [k, v] of this.parentKeys) if (v.until < now) this.parentKeys.delete(k);
    return { parentKey: key, created: !profile.pin_hash };
  }

  /** A forgotten PIN: the account's own password clears it. */
  async resetPin(account, password) {
    const row = await this.db.one('SELECT pass_hash FROM accounts WHERE id = ?', [account.id]);
    if (!row || !(await verifyPassword(String(password ?? ''), row.pass_hash))) throw refuse('That password is not right', 403);
    await this.db.run('UPDATE learning_profile SET pin_hash = NULL, updated = ? WHERE account_id = ?', [this.now(), account.id]);
    this.wrongPins.delete(account.id);
    return true;
  }

  parentOf(account, key) {
    const entry = this.parentKeys.get(String(key ?? ''));
    if (!entry || entry.until < this.now() || entry.accountId !== account.id) throw refuse('Type the parent PIN first', 403);
    return true;
  }

  async report(accountId) {
    const profile = await this.profile(accountId);
    const now = this.now();
    const rows = await this.db.many('SELECT kind, lesson_id, subject, topic, data, at FROM learning_events WHERE account_id = ? AND at >= ? ORDER BY at', [accountId, now - 16 * 86400000]);
    const events = rows.map((r) => ({ kind: r.kind, lesson: r.lesson_id, subject: r.subject, topic: r.topic, at: Number(r.at), ...(r.data ?? {}) }));
    // The streak may reach further back than the two weeks above: one row per active day.
    const days = await this.db.many("SELECT MIN(at) AS at FROM learning_events WHERE account_id = ? AND at < ? AND at >= ? GROUP BY FLOOR((at - ?) / 86400000)", [accountId, now - 16 * 86400000, now - 400 * 86400000, Number(profile.tz_offset) * 60000]);
    for (const d of days) events.unshift({ kind: 'streak', at: Number(d.at) });
    const stars = (await this.progress({ id: accountId })).stars;
    const report = buildReport({ events, stars, now, tzOffset: profile.tz_offset });
    return report;
  }

  async share(account, on) {
    const token = on ? randomBytes(18).toString('base64url') : null;
    await this.db.run('UPDATE learning_profile SET share_token = ?, share_created = ?, updated = ? WHERE account_id = ?', [token, on ? this.now() : null, this.now(), account.id]);
    return token;
  }

  async shareToken(account) {
    return (await this.profile(account.id)).share_token ?? null;
  }

  async shared(token) {
    if (!TOKEN.test(String(token ?? ''))) return null;
    const row = await this.db.one('SELECT account_id FROM learning_profile WHERE share_token = ?', [token]);
    return row ? this.report(row.account_id) : null;
  }
}

/**
 * The /api/learning routes.
 * @param {() => Promise<LearningStore>} getStore
 */
export function learningHandler(getStore, { authenticate = async () => null } = {}) {
  const writes = new RateLimiter(120, { burst: 40 });
  const pins = new RateLimiter(20, { burst: 8 });
  return async (req, res) => {
    const path = pathOf(req);
    if (path !== '/api/learning' && !path.startsWith('/api/learning/')) return false;
    const parts = path.slice('/api/learning'.length).split('/').filter(Boolean);
    try {
      const store = await getStore();
      const m = req.method;
      // The share link: no sign-in, only the token.
      if (m === 'GET' && parts[0] === 'shared' && parts.length === 2) {
        const report = await store.shared(decodeURIComponent(parts[1]));
        if (!report) return json(res, 404, { error: 'This link no longer works — ask for a new one.' }), true;
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        return json(res, 200, { report }), true;
      }
      const account = await authenticate(req);
      if (!account) throw refuse('Sign in first', 401);
      const body = async (limiter = writes) => {
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw refuse('JSON only', 415);
        if (!limiter.take(`a${account.id}`) || !limiter.take(clientIp(req))) throw refuse('Slow down', 429);
        return readJson(req, 512 * 1024);
      };
      const serial = (fn) => store.db.serial(fn);
      const parentKey = () => store.parentOf(account, req.headers['x-parent-key']);

      if (m === 'GET' && !parts.length) return json(res, 200, await store.progress(account)), true;
      if (m === 'POST' && parts[0] === 'events') {
        const b = await body();
        return json(res, 200, await serial(() => store.record(account, b))), true;
      }
      if (m === 'POST' && parts[0] === 'import') {
        const b = await body();
        return json(res, 200, await serial(() => store.importGuest(account, b))), true;
      }
      if (parts[0] === 'parent') {
        if (m === 'GET' && parts.length === 1) return json(res, 200, { hasPin: await store.hasPin(account) }), true;
        if (m === 'POST' && parts[1] === 'pin') {
          const b = await body(pins);
          return json(res, 200, await serial(() => store.unlock(account, b.pin))), true;
        }
        if (m === 'POST' && parts[1] === 'reset') {
          const b = await body(pins);
          return json(res, 200, { ok: await serial(() => store.resetPin(account, b.password)) }), true;
        }
      }
      if (m === 'GET' && parts[0] === 'report') {
        parentKey();
        res.setHeader('Cache-Control', 'no-store');
        return json(res, 200, { report: await store.report(account.id), share: await store.shareToken(account) }), true;
      }
      if (parts[0] === 'share' && (m === 'POST' || m === 'DELETE')) {
        if (m === 'POST') await body();
        parentKey();
        return json(res, 200, { share: await serial(() => store.share(account, m === 'POST')) }), true;
      }
      json(res, 404, { error: 'unknown route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, error?.status ?? (/too large/.test(message) ? 413 : /bad JSON/i.test(message) ? 400 : 500), { error: error?.status ? message : /too large|bad JSON/i.test(message) ? message : 'Server error' });
      if (!error?.status) console.error('[learning]', error);
    }
    return true;
  };
}
