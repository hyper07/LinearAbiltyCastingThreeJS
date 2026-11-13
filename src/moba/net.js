import { Session } from '../net/Session.js';
import { TICK } from './rules.js';

/**
 * Lanebreak together: the platform's party rooms (src/net/Session.js — a
 * join code, up to four people, messages relayed by the server). The
 * **host** runs the match (sim.js) in their browser; the others send their
 * commands to the host and draw what the host sends back ten times a
 * second. Bots fill the seats nobody takes. A guest who leaves becomes a bot.
 *
 * Messages (`t`):
 *   lb-lobby  host → all   who is in, their champion and team, the settings
 *   lb-pick   guest → host  my champion, team, ready
 *   lb-start  host → all   the seats and who plays which
 *   lb-cmd    guest → host  one command for my champion
 *   lb-snap   host → all   the match: a snapshot and the events since the last
 *   lb-end    host → all   the host closed the match
 */
export class MobaLink {
  constructor() {
    this.session = new Session();
    this.handlers = new Map();
    this.session.on('message', (msg) => this.handlers.get(msg.t)?.(msg));
    this.session.on('peer', () => this.handlers.get('peers')?.());
    this.session.on('left', (id) => this.handlers.get('left')?.(id));
    this.session.on('closed', () => this.handlers.get('closed')?.());
    this.session.on('disconnected', () => this.handlers.get('closed')?.());
  }

  on(type, fn) {
    this.handlers.set(type, fn);
    return this;
  }

  get id() {
    return this.session.id;
  }

  get code() {
    return this.session.room;
  }

  get isHost() {
    return this.session.isHost;
  }

  get inRoom() {
    return this.session.room != null;
  }

  peers() {
    return [...this.session.peers.values()];
  }

  async create(name) {
    await this.session.create(name || 'Player');
    return this.code;
  }

  async join(code, name) {
    await this.session.join(String(code).trim().toUpperCase(), name || 'Player');
    return this.code;
  }

  send(msg) {
    this.session.send(msg);
  }

  sendTo(id, msg) {
    this.session.sendTo(id, msg);
  }

  leave() {
    if (this.inRoom) this.session.leave();
  }
}

/** Round a snapshot's numbers, so it travels small. */
export function pack(snap) {
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    ...snap,
    t: r2(snap.t),
    ents: snap.ents.map((e) => ({ ...e, x: r2(e.x), z: r2(e.z), a: r2(e.a), aa: r2(e.aa) })),
    shots: snap.shots.map((s) => ({ ...s, x: r2(s.x), z: r2(s.z) })),
    zones: snap.zones.map((z) => ({ ...z, x: r2(z.x), z: r2(z.z), land: r2(z.land), until: r2(z.until) }))
  };
}

/**
 * Snapshots in time order, and the match at any moment between two of them
 * (positions and headings blended), drawn a little behind the newest so a
 * late one doesn't make things jump.
 */
export class Mirror {
  constructor({ delay = 0 } = {}) {
    this.buffer = [];
    this.delay = delay;
    this.clock = null;
  }

  push(snap) {
    if (this.buffer.length && snap.t <= this.buffer[this.buffer.length - 1].t) return;
    this.buffer.push(snap);
    if (this.buffer.length > 30) this.buffer.shift();
  }

  get latest() {
    return this.buffer[this.buffer.length - 1] ?? null;
  }

  /** Advance the drawing clock by `dt` (seconds) and return the blended match. */
  state(dt, alpha = null) {
    const n = this.buffer.length;
    if (!n) return null;
    const newest = this.buffer[n - 1];
    if (alpha != null) {
      // The host: blend its last two steps.
      const prev = this.buffer[n - 2] ?? newest;
      return blend(prev, newest, alpha);
    }
    const want = newest.t - this.delay;
    if (this.clock == null || Math.abs(this.clock - want) > 1) this.clock = want;
    else this.clock += dt + (want - this.clock) * 0.1;
    let a = this.buffer[0];
    let b = newest;
    for (let i = 0; i < n - 1; i++) {
      if (this.buffer[i].t <= this.clock && this.buffer[i + 1].t >= this.clock) {
        a = this.buffer[i];
        b = this.buffer[i + 1];
        break;
      }
    }
    const k = b.t > a.t ? Math.max(0, Math.min(1, (this.clock - a.t) / (b.t - a.t))) : 1;
    return blend(a, b, k);
  }
}

function blend(a, b, k) {
  if (a === b || k >= 1) return b;
  const before = new Map(a.ents.map((e) => [e.i, e]));
  const ents = b.ents.map((e) => {
    const p = before.get(e.i);
    if (!p || Math.hypot(p.x - e.x, p.z - e.z) > 8) return e; // a blink or a respawn: no gliding
    let da = e.a - p.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    return { ...e, x: p.x + (e.x - p.x) * k, z: p.z + (e.z - p.z) * k, a: p.a + da * k };
  });
  return { ...b, ents };
}

export const SNAP_EVERY = Math.round(0.1 / TICK);
