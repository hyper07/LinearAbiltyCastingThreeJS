import { EventEmitter } from '../utils/EventEmitter.js';

/** The inventory actions the server re-runs with the same rules (server/game/authority.js `_op`). */
const OPS = ['move', 'equip', 'unequipGear', 'unequip', 'read', 'useBagUpgrade', 'usePotion', 'setSlot', 'clearSlot', 'sell'];

/**
 * Keeps the browser's character in step with the server's.
 *
 * Signed in, the server owns the character. The browser still runs every
 * inventory action itself the moment the player makes it (the same code,
 * src/items/Profile.js, runs on both sides), so nothing waits on the
 * network — and sends the action to the server along with the fingerprint
 * the result should have (`Profile#digest`). The server applies it, checks
 * it, and answers with its own fingerprint. They match unless something
 * was refused, raced, or tampered with; then the browser takes the server's
 * copy. Editing the character in the browser's console therefore changes
 * nothing that lasts.
 *
 * Requests go one at a time, in order, so the server sees the actions in
 * the order they happened. Consecutive inventory actions travel together.
 *
 * Emits `blocked` (message), `resynced`, `error` (message).
 */
export class ProfileSync extends EventEmitter {
  /** @param {import('../items/Profile.js').Profile} profile */
  constructor(profile) {
    super();
    this.profile = profile;
    this.active = false;
    /** The server's id for the fight being played (null: in the menu). */
    this.runId = null;
    this.queue = [];
    this.busy = false;
    this._resync = false;
    this._originals = null;
    /** The last fingerprints, for the tests and the status line. */
    this.lastServerDigest = null;
    this.drifts = 0;
  }

  /** Take over: the character is now the server's (`view`: { state, version, digest }). */
  attach(view) {
    const p = this.profile;
    p.storage = null;
    p.loadState(view.state);
    this.active = true;
    this.lastServerDigest = view.digest;
    this._wrap();
    // The class being played may not be on the server's copy yet: line them up.
    this.refresh();
  }

  /** Back to playing on this browser's own save. */
  detach() {
    this._unwrap();
    this.active = false;
    this.runId = null;
    this.queue.length = 0;
    try {
      this.profile.useStorage(typeof localStorage === 'undefined' ? null : localStorage);
    } catch {
      this.profile.useStorage(null);
    }
  }

  _wrap() {
    if (this._originals) return;
    const p = this.profile;
    this._originals = {};
    for (const op of OPS) {
      const original = p[op];
      this._originals[op] = original;
      p[op] = (...args) => {
        const before = p.digest();
        const result = original.apply(p, args);
        if (p.digest() !== before) this._enqueue('ops', { ops: [{ op, args: this._args(op, args) }] }, { expect: true, coalesce: true });
        return result;
      };
    }
  }

  _unwrap() {
    if (!this._originals) return;
    // The wrappers are the instance's own; removing them uncovers Profile's methods again.
    for (const op of Object.keys(this._originals)) delete this.profile[op];
    this._originals = null;
  }

  /** Arguments as the server takes them: the class made explicit where it matters. */
  _args(op, args) {
    const p = this.profile;
    if (op === 'read') return [args[0], args[1] ?? p.classId];
    if (op === 'setSlot') return [args[0], args[1], args[2] ?? p.classId];
    if (op === 'clearSlot') return [args[0], args[1] ?? p.classId];
    if (op === 'move') return [args[0], args[1], args[2] ?? null, args[3] ?? null];
    return args.slice(0, 4);
  }

  /* ------------------------------------------------------------------ */
  /* the queue                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * @param {string} path under /api/game/
   * @param {object|(() => object)} body built when sent (so a run id that is still on its way is filled in)
   * @param {{ expect?: boolean, coalesce?: boolean, apply?: boolean }} options
   *   expect: the browser already made this change; compare fingerprints
   *   apply:  the server's answer carries the character; take it
   */
  _enqueue(path, body, { expect = false, coalesce = false, apply = false } = {}) {
    if (!this.active) return Promise.resolve({ ok: false, error: 'Not signed in' });
    const digest = expect ? this.profile.digest() : null;
    const last = this.queue[this.queue.length - 1];
    if (coalesce && last?.path === 'ops' && last.coalesce && last.body.ops.length < 50) {
      last.body.ops.push(...body.ops);
      last.digest = digest;
      return last.promise;
    }
    const entry = { path, body, digest, expect, apply, coalesce };
    entry.promise = new Promise((resolve) => (entry.resolve = resolve));
    this.queue.push(entry);
    this._pump();
    return entry.promise;
  }

  async _pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length) {
      const entry = this.queue.shift();
      const body = typeof entry.body === 'function' ? entry.body() : entry.body;
      const r = await this._post(entry.path, { ...body, classId: this.profile.classId });
      if (!r.ok) {
        if (r.blocked) {
          this.emit('blocked', r.error);
          entry.resolve(r);
          break;
        }
        this._resync = true;
      } else if (entry.apply && r.state) {
        if (this.queue.length) this._resync = true;
        else this.profile.loadState(r.state);
      } else if (r.pending) {
        // Held until the host's report lands; the server's copy is right in a moment.
        this._later();
      } else if (entry.expect && r.digest && r.digest !== entry.digest) {
        this.drifts += 1;
        this._resync = true;
      }
      if (r.digest) this.lastServerDigest = r.digest;
      entry.resolve(r);
    }
    this.busy = false;
    if (this._resync && this.active) await this.refresh();
  }

  async _post(path, body) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`./api/game/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.emit('signedOut');
          return { ok: false, status: 401, error: data.error ?? 'Signed out' };
        }
        return response.ok ? { ok: true, ...data } : { ok: false, status: response.status, ...data };
      } catch {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    this.emit('error', 'The game server is not reachable');
    return { ok: false, offline: true, error: 'The game server is not reachable' };
  }

  /** Look again shortly (something is still being settled on the server). */
  _later() {
    clearTimeout(this._laterTimer);
    this._laterTimer = setTimeout(() => {
      if (this.active && !this.busy && !this.queue.length) this.refresh();
    }, 1500);
  }

  /** Take the server's copy of the character. */
  async refresh() {
    this._resync = false;
    try {
      const response = await fetch(`./api/game/state?classId=${encodeURIComponent(this.profile.classId)}`);
      if (!response.ok) return;
      const view = await response.json();
      // Only if nothing else is on its way: a queued action would be undone.
      if (this.queue.length || this.busy) {
        this._resync = true;
        return;
      }
      if (view.digest !== this.profile.digest()) this.profile.loadState(view.state);
      this.lastServerDigest = view.digest;
      this.emit('resynced');
    } catch {
      /* next time */
    }
  }

  /** Resolves once everything sent so far has been answered. */
  async settled() {
    while (this.busy || this.queue.length) await new Promise((r) => setTimeout(r, 20));
  }

  /* ------------------------------------------------------------------ */
  /* the fight                                                           */
  /* ------------------------------------------------------------------ */

  async startRun(level = null) {
    this.runId = null;
    const r = await this._enqueue('run/start', { level });
    if (r.ok) this.runId = r.runId;
    return r;
  }

  async joinRun(runId) {
    const r = await this._enqueue('run/join', { runId });
    if (r.ok) this.runId = r.runId;
    return r;
  }

  endRun() {
    const runId = this.runId;
    this.runId = null;
    return runId ? this._enqueue('run/end', { runId }) : Promise.resolve({ ok: true });
  }

  /** The host's kill (the XP is already added in the browser): the server rolls the loot. */
  kill(monster, kind, wave) {
    return this._enqueue('kill', () => ({ runId: this.runId, monster, kind, wave }), { expect: true });
  }

  /** A party member's share of the host's kill. */
  partyKill(monster) {
    return this._enqueue('party-kill', () => ({ runId: this.runId, monster }), { expect: true });
  }

  /** An item picked up (already in the browser's bag): the server decides if it is ours. */
  take(uid) {
    return this._enqueue('take', () => ({ runId: this.runId, uid }), { expect: true });
  }

  /** An item put down (already out of the browser's bag). */
  drop(uid) {
    return this._enqueue('drop', () => ({ runId: this.runId, uid }), { expect: true });
  }

  /** An NPC's gift, quest reward or study reward: made by the server. */
  npc(npc, action) {
    return this._enqueue('npc', () => ({ runId: this.runId, npc, action }), { apply: true });
  }

  shop(npc, wave) {
    return this._enqueue('shop', () => ({ runId: this.runId, npc, wave }));
  }

  buy(npc, offer) {
    return this._enqueue('buy', () => ({ runId: this.runId, npc, offer }), { apply: true });
  }
}
