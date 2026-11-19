/**
 * What the child has done, kept in one place for the game: best stars per
 * lesson, readings finished, and a stream of events (readings, answers,
 * lessons, study time) for the parents' report.
 *
 * Signed in, the server is the source of truth (server/learningStore.js):
 * events are queued and sent; the stars that come back are the ones that
 * count. Signed out, the same data lives in this browser's localStorage,
 * and is offered to the account on sign-in.
 */
import { BEAT_MAX_SECONDS, IMPORT_MAX_EVENTS, buildReport, openFloors, starsFor } from './rules.js';
import { lessonById, quizLength } from './content/index.js';

const GUEST_KEY = 'arcademia.guest.v1';
const store = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(GUEST_KEY)) ?? null;
    } catch {
      return null;
    }
  },
  save(data) {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
  clear() {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* nothing to clear */
    }
  }
};
const blank = () => ({ stars: {}, reading: {}, events: [], pin: null, made: Date.now() });

async function api(path, init = {}) {
  const res = await fetch(`./api/learning${path}`, { cache: 'no-store', ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status, body });
  return body;
}

export class Progress {
  constructor({ account = null } = {}) {
    this.account = account;
    this.mode = account ? 'account' : 'guest';
    this.stars = {};
    this.reading = {};
    this.queue = [];
    this.pendingTime = {};
    this.listeners = new Set();
    this.guest = store.load() ?? blank();
    this.tz = new Date().getTimezoneOffset();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  _changed() {
    for (const fn of this.listeners) fn(this);
  }

  async load() {
    if (this.mode === 'account') {
      try {
        const p = await api('');
        this.stars = p.stars ?? {};
        this.reading = p.reading ?? {};
        this.imported = p.imported;
        await api('/events', { method: 'POST', body: JSON.stringify({ events: [], start: true, tz: this.tz }) }).catch(() => {});
      } catch (error) {
        // The server is out of reach: play on, kept on this device for now.
        this.mode = 'guest';
        this.offline = true;
      }
    }
    if (this.mode === 'guest') {
      this.stars = { ...this.guest.stars };
      this.reading = { ...this.guest.reading };
    }
    this._changed();
    return this;
  }

  get floorsOpen() {
    return openFloors(this.stars);
  }

  /** A guest's progress worth bringing into the account just signed in to. */
  get guestToImport() {
    if (this.mode !== 'account' || this.imported) return null;
    const g = this.guest;
    const n = Object.keys(g.stars).length + g.events.length;
    return n ? { lessons: Object.keys(g.stars).length, stars: Object.values(g.stars).reduce((a, b) => a + b, 0) } : null;
  }

  async importGuest() {
    const g = this.guest;
    const r = await api('/import', { method: 'POST', body: JSON.stringify({ stars: g.stars, events: g.events.slice(-IMPORT_MAX_EVENTS), tz: this.tz }) });
    this.stars = r.stars ?? this.stars;
    this.reading = r.reading ?? this.reading;
    this.imported = true;
    store.save({ ...blank(), pin: g.pin });
    this.guest = store.load() ?? blank();
    this._changed();
    return r;
  }
  async skipImport() {
    // Keep the guest data on this device, just stop asking this session.
    this.imported = true;
  }

  /* ---- recording ---- */

  reading_(lessonId) {
    this.reading[lessonId] = true;
    this._event({ kind: 'reading', lesson: lessonId });
  }
  answer(lessonId, correct) {
    this._event({ kind: 'answer', lesson: lessonId, correct: Boolean(correct) });
  }
  /** A finished check; returns the stars this run earned (the best is kept). */
  finish(lessonId, score) {
    const lesson = lessonById(lessonId);
    const total = quizLength(lesson);
    const stars = starsFor(score, total);
    this.stars[lessonId] = Math.max(this.stars[lessonId] ?? 0, stars);
    this._event({ kind: 'lesson', lesson: lessonId, score, total, stars });
    this.flush();
    this._changed();
    return stars;
  }
  /** Study time, counted while a lesson is open and the tab is in front. */
  tick(subject, dt) {
    this.pendingTime[subject] = (this.pendingTime[subject] ?? 0) + dt;
    const total = Object.values(this.pendingTime).reduce((a, b) => a + b, 0);
    if (total >= 45) this.flush();
  }

  _event(e) {
    const lesson = e.lesson ? lessonById(e.lesson) : null;
    const full = { ...e, at: Date.now(), subject: lesson?.subject ?? e.subject, topic: lesson?.topic };
    this.queue.push(full);
    if (this.queue.length >= 20) this.flush();
  }

  _drainTime() {
    const out = [];
    for (const [subject, s] of Object.entries(this.pendingTime)) {
      let left = Math.round(s);
      while (left > 0) {
        const take = Math.min(BEAT_MAX_SECONDS, left);
        out.push({ kind: 'time', subject, seconds: take, at: Date.now() });
        left -= take;
      }
    }
    this.pendingTime = {};
    return out;
  }

  async flush() {
    const events = [...this.queue, ...this._drainTime()];
    this.queue = [];
    if (!events.length) return;
    if (this.mode === 'account') {
      try {
        // Answers go before the lesson they belong to, so the server can count them.
        const r = await api('/events', { method: 'POST', body: JSON.stringify({ events: events.slice(0, 100), tz: this.tz }) });
        if (events.length > 100) this.queue.unshift(...events.slice(100));
        if (r.stars) {
          this.stars = r.stars;
          this._changed();
        }
      } catch (error) {
        if (error.status !== 400) this.queue.unshift(...events.filter((e) => e.kind !== 'time'));
      }
      return;
    }
    this.guest.events.push(...events);
    if (this.guest.events.length > IMPORT_MAX_EVENTS) this.guest.events.splice(0, this.guest.events.length - IMPORT_MAX_EVENTS);
    this.guest.stars = { ...this.stars };
    this.guest.reading = { ...this.reading };
    store.save(this.guest);
  }

  /* ---- parents ---- */

  async hasPin() {
    if (this.mode === 'account') return (await api('/parent')).hasPin;
    return Boolean(this.guest.pin);
  }

  /** Set (first time) or check the PIN. Resolves to true when the parent is in. */
  async unlock(pin) {
    if (this.mode === 'account') {
      const r = await api('/parent/pin', { method: 'POST', body: JSON.stringify({ pin }) });
      this.parentKey = r.parentKey;
      return true;
    }
    if (!/^\d{4}$/.test(pin)) throw new Error('The PIN is 4 digits');
    if (!this.guest.pin) {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
      this.guest.pin = { salt, hash: await pinHash(pin, salt) };
      store.save(this.guest);
      return true;
    }
    if ((await pinHash(pin, this.guest.pin.salt)) !== this.guest.pin.hash) throw Object.assign(new Error('That PIN is not right'), { status: 403 });
    return true;
  }

  async resetPin(password) {
    if (this.mode === 'account') return api('/parent/reset', { method: 'POST', body: JSON.stringify({ password }) });
    this.guest.pin = null;
    store.save(this.guest);
    return { ok: true };
  }

  /** The weekly report (and, signed in, the share link). */
  async report() {
    await this.flush();
    if (this.mode === 'account') {
      const r = await api('/report', { headers: { 'x-parent-key': this.parentKey ?? '' } });
      return { report: r.report, share: r.share, canShare: true };
    }
    return { report: buildReport({ events: this.guest.events, stars: this.stars, now: Date.now(), tzOffset: this.tz }), share: null, canShare: false };
  }

  async share(on) {
    const r = await api('/share', { method: on ? 'POST' : 'DELETE', headers: { 'x-parent-key': this.parentKey ?? '' }, ...(on ? { body: '{}' } : {}) });
    return r.share;
  }
}

/** A guest's PIN, hashed on this device (PBKDF2 where the browser has it). */
async function pinHash(pin, salt) {
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let r = 0; r < 20000; r++) for (const ch of salt + pin + r) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `f${(h >>> 0).toString(16)}`;
}
