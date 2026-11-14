import { PLAYER, WEAPONS, weaponIn } from './rules.js';
import { getMap } from './map.js';

/**
 * Breachline over the wire. The server runs the match (sim.js) and sends
 * what it looks like — `pack(match)` — many times a second; each browser
 * keeps a `Mirror` of it, which has the same shape as a match where the
 * screen is concerned (players, phase, timer, score, the charge), so the
 * view and the HUD draw either without knowing which.
 */

const KEYS = ['id', 'name', 'bot', 'squad', 'money', 'kills', 'deaths', 'primary', 'secondary', 'armor', 'helmet', 'kit', 'alive', 'hp', 'x', 'y', 'z', 'yaw', 'pitch', 'slot', 'reloading', 'moving', 'scoped', 'hasCharge', 'using', 'nades', 'melee', 'zoomLevel'];
const round = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

/** A match, as sent: small arrays, numbers to two places. */
export function pack(match) {
  return {
    map: match.map.id,
    time: round(match.time),
    phase: match.phase,
    timer: round(match.timer),
    round: match.round,
    score: match.score,
    attackers: match.attackers,
    charge: match.charge ? { x: round(match.charge.x), z: round(match.charge.z), state: match.charge.state, site: match.charge.site } : null,
    over: match.over,
    nades: match.nades.map((n) => [round(n.x), round(n.y), round(n.z), n.kind]),
    smokes: match.smokes.map((s) => [round(s.x), round(s.z), s.r, round(s.at), round(s.until)]),
    players: match.players.map((p) => [...KEYS.map((k) => round(p[k])), p.ammo ?? {}])
  };
}

const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class Mirror {
  constructor() {
    this.players = [];
    this.phase = 'buy';
    this.timer = 0;
    this.time = 0;
    this.round = 1;
    this.score = [0, 0];
    this.attackers = 0;
    this.charge = null;
    this.over = null;
    this.nades = [];
    this.smokes = [];
    this.map = getMap('foundry');
  }

  sideOf(squad) {
    return squad === this.attackers ? 'atk' : 'def';
  }

  weaponOf(p) {
    return weaponIn(p);
  }

  living(side) {
    return this.players.filter((p) => p.alive && this.sideOf(p.squad) === side);
  }

  /** Take in what the server sent. Positions are kept aside (`to`) and eased towards in `frame`. */
  apply(snap, myId = null) {
    for (const k of ['time', 'phase', 'timer', 'round', 'score', 'attackers', 'charge', 'over']) this[k] = snap[k];
    if (snap.map && snap.map !== this.map.id) this.map = getMap(snap.map);
    this.nades = (snap.nades ?? []).map(([x, y, z, kind]) => ({ x, y, z, kind }));
    this.smokes = (snap.smokes ?? []).map(([x, z, r, at, until]) => ({ x, z, r, at, until }));
    snap.players.forEach((row, i) => {
      const p = (this.players[i] ??= {});
      const fresh = p.x == null;
      const was = p.alive;
      const to = {};
      KEYS.forEach((k, j) => {
        if (k === 'x' || k === 'y' || k === 'z' || k === 'yaw' || k === 'pitch') to[k] = row[j];
        else p[k] = row[j];
      });
      p.ammo = row[KEYS.length];
      p.to = to;
      // A new round puts everyone somewhere else: jump there, don't glide across the map.
      if (fresh || (p.alive && !was) || Math.hypot(to.x - p.x, to.z - p.z) > 4) Object.assign(p, to);
      else if (p.id === myId) {
        // Where I look is mine to say.
        p.y = to.y;
      }
    });
  }

  /**
   * Move the picture on between the server's words: everyone else eases to
   * where they were last said to be; I walk at once on my own keys (the same
   * rules as the server's) and am drawn gently back to where it has me.
   */
  frame(dt, myId, input) {
    this.timer -= dt;
    this.time += dt;
    const live = this.phase === 'live' || this.phase === 'planted';
    for (const p of this.players) {
      if (!p.to) continue;
      if (p.id === myId && p.alive) {
        p.yaw = input.yaw;
        p.pitch = input.pitch;
        if (live && !(input.use && p.using > 0)) {
          const w = WEAPONS[this.weaponOf(p)];
          const speed = PLAYER.speed * w.move * (p.scoped ? 0.5 : 1);
          const len = Math.hypot(input.f, input.s);
          const f = len > 1 ? input.f / len : input.f;
          const s = len > 1 ? input.s / len : input.s;
          const nx = p.x + (-Math.sin(p.yaw) * f + Math.cos(p.yaw) * s) * speed * dt;
          const nz = p.z + (-Math.cos(p.yaw) * f - Math.sin(p.yaw) * s) * speed * dt;
          if (this.map.clear(nx, p.z, PLAYER.radius)) p.x = nx;
          if (this.map.clear(p.x, nz, PLAYER.radius)) p.z = nz;
        }
        const k = Math.min(1, dt * 6);
        p.x += (p.to.x - p.x) * k;
        p.z += (p.to.z - p.z) * k;
        p.y += (p.to.y - p.y) * Math.min(1, dt * 20);
      } else {
        const k = Math.min(1, dt * 16);
        p.x += (p.to.x - p.x) * k;
        p.y += (p.to.y - p.y) * k;
        p.z += (p.to.z - p.z) * k;
        p.yaw += turn(p.yaw, p.to.yaw) * k;
        p.pitch += (p.to.pitch - p.pitch) * k;
      }
    }
  }
}
