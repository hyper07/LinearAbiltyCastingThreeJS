/**
 * The creatures' minds, pure (no three.js): what a wild one feels about you
 * and what it does about it, and how a befriended one keeps you company.
 *
 * A wild creature carries three feelings — fear, curiosity and trust — and
 * a state that follows from them:
 *
 *   idle, wander, play   at home, not bothered (play: hops and spins, or
 *                        chases another of its kind)
 *   curious              you are near and quiet: it comes to look at you
 *   wary                 it heard something: it freezes and watches
 *   flee, hide           too much: it runs (or rolls, or flies) and keeps
 *                        out of sight a while
 *   seek, eat            it smelled a treat on the ground and goes for it
 *   ready                it trusts you enough to share a breath
 *   trust                the trust moment is on (the game holds it here)
 *   sleep                not its hour (the Lumoth comes out at dusk)
 *
 * Noise (how fast you go, sneaking or not) over distance against the
 * species' hearing raises fear; quiet company raises curiosity; treats it
 * likes raise trust, and trust dulls fear.
 */
import { SPECIES, alarmRate, treatReaction, awakeAt } from './rules.js';

export const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** Each gait's speeds (m/s): walking about, and running away. */
export const GAITS = {
  hop: { walk: 1.1, run: 4.6 },
  waddle: { walk: 0.8, run: 5.0 },
  fly: { walk: 1.2, run: 4.2 },
  trot: { walk: 1.3, run: 7.2 },
  bounce: { walk: 0.9, run: 3.4 },
  scurry: { walk: 1.0, run: 5.6 }
};

export class CreatureBrain {
  constructor({ species, home, roam = 10, seed = 1, id = null }) {
    this.species = species;
    this.def = SPECIES[species];
    this.id = id ?? `${species}-${seed}`;
    this.home = { x: home[0], z: home[1] };
    this.roam = roam;
    this.x = home[0];
    this.z = home[1];
    this.yaw = seed * 1.7;
    this.speed = 0;
    this.fear = 0;
    this.curiosity = 0;
    this.trust = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.wait = 1 + (seed % 3);
    this.target = null;
    this.treat = null;
    this.reaction = null;
    this.look = null;
    this.seen = false;
    this.r = (() => {
      let a = (seed * 2654435761) >>> 0 || 1;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    this.gait = GAITS[this.def.gait] ?? GAITS.hop;
  }

  set(state) {
    if (this.state === state) return;
    this.state = state;
    this.stateT = 0;
  }

  /** Is it out and about (not asleep, not hiding out of sight)? */
  get present() {
    return this.state !== 'sleep' && this.state !== 'gone';
  }

  /**
   * One tick. `ctx`: { player: { x, z, speed, noise, sneaking }, treats: [{ id, x, z, kind }],
   * calm (a Mistfawn in your party), hour, walkable(x, z), others: [brain] }.
   * Returns events: { type: 'startle' | 'curious' | 'eat' | 'ready' | 'calm' | 'hide' | 'wake' | 'sleep', … }.
   */
  update(dt, ctx) {
    const ev = [];
    const p = ctx.player;
    const def = this.def;
    this.stateT += dt;
    const awake = awakeAt(this.species, ctx.hour ?? 17.8);
    if (!awake) {
      if (this.state !== 'sleep') {
        this.set('sleep');
        ev.push({ type: 'sleep' });
      }
      this.speed = 0;
      return ev;
    }
    if (this.state === 'sleep') {
      this.set('idle');
      this.x = this.home.x;
      this.z = this.home.z;
      ev.push({ type: 'wake' });
    }
    if (this.state === 'friend') return ev;
    const dx = p ? p.x - this.x : 99;
    const dz = p ? p.z - this.z : 99;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    // Feelings.
    const trusting = Math.min(1, this.trust / Math.max(1, def.trust));
    if (p && this.state !== 'trust') {
      let a = alarmRate(this.species, { dist, noise: p.noise, calm: ctx.calm });
      // Crowding it without creeping is frightening too, unless it knows you.
      const space = 1.6 + def.shy * 2.4;
      if (dist < space && !p.sneaking && p.speed > 0.6) a += 0.9 * (1 - dist / space);
      this.fear += a * dt * 1.25 * (1 - trusting * 0.85);
    }
    const settle = p && dist < 8 && p.speed > 0.3 ? 0.1 : 0.28;
    this.fear = Math.max(0, this.fear - settle * dt);
    if (p && dist < 13 && p.noise < 0.2 && this.fear < 0.35) this.curiosity = Math.min(1, this.curiosity + dt * (0.18 + (1 - def.shy) * 0.3) * (ctx.calm ? 1.4 : 1));
    else this.curiosity = Math.max(0, this.curiosity - dt * 0.12);
    if (p && dist > 30) this.trust = Math.max(0, this.trust - dt * 0.6);
    // Frightened away?
    if (this.fear >= 1 && this.state !== 'flee' && this.state !== 'hide' && this.state !== 'trust') {
      this.set('flee');
      this.fleeFor = 2.4 + this.r() * 2;
      this.curiosity = 0;
      this.treat = null;
      ev.push({ type: 'startle' });
    }
    const walk = (tx, tz, speed, arrive = 0.4) => {
      const ddx = tx - this.x;
      const ddz = tz - this.z;
      const d = Math.hypot(ddx, ddz);
      if (d < arrive) {
        this.speed += (0 - this.speed) * Math.min(1, dt * 8);
        return true;
      }
      const want = Math.atan2(ddx, ddz);
      this.yaw = wrap(this.yaw + Math.max(-dt * 7, Math.min(dt * 7, wrap(want - this.yaw))));
      const s = speed * Math.min(1, d / 1.2 + 0.35);
      this.speed += (s - this.speed) * Math.min(1, dt * 5);
      this._step(dt, ctx);
      return false;
    };
    const face = (yaw, rate = 5) => {
      this.yaw = wrap(this.yaw + Math.max(-dt * rate, Math.min(dt * rate, wrap(yaw - this.yaw))));
      this.speed += (0 - this.speed) * Math.min(1, dt * 6);
    };
    // A treat on the ground it can smell?
    if (!this.treat && ['idle', 'wander', 'play', 'curious', 'wary', 'ready'].includes(this.state) && this.fear < 0.7) {
      let best = null;
      let bd = 15;
      for (const t of ctx.treats ?? []) {
        if (t.taken) continue;
        const d = Math.hypot(t.x - this.x, t.z - this.z);
        if (d < bd) {
          best = t;
          bd = d;
        }
      }
      if (best) {
        this.treat = best;
        this.set('seek');
      }
    }
    switch (this.state) {
      case 'idle':
        face(this.look ?? this.yaw, 2);
        if (this.stateT > this.wait) {
          const roll = this.r();
          if (roll < 0.22) this.set('play');
          else {
            const a = this.r() * Math.PI * 2;
            const r = Math.sqrt(this.r()) * this.roam;
            this.target = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
            this.set('wander');
          }
          this.wait = 1.5 + this.r() * 3.5;
        }
        this._curiousCheck(ev, dist);
        break;
      case 'wander':
        if (walk(this.target.x, this.target.z, this.gait.walk) || this.stateT > 12) this.set('idle');
        this._curiousCheck(ev, dist);
        break;
      case 'play': {
        // Spin and bound about the spot — or chase a friend of its kind.
        const mate = (ctx.others ?? []).find((o) => o !== this && o.species === this.species && o.present && Math.hypot(o.x - this.x, o.z - this.z) < 9);
        if (mate) walk(mate.x + Math.sin(this.stateT * 2) * 1.5, mate.z + Math.cos(this.stateT * 2) * 1.5, this.gait.walk * 1.8, 0.8);
        else {
          this.yaw = wrap(this.yaw + dt * 3.2);
          this.speed = this.gait.walk * 0.9;
          this._step(dt, ctx);
        }
        if (this.stateT > 2.4 + this.r() * 0.2) this.set('idle');
        this._curiousCheck(ev, dist);
        break;
      }
      case 'curious': {
        // Come to look: stop a little way off, watch, step back if you come on too fast.
        const stop = 2.6 + this.def.shy * 1.8;
        if (dist > stop + 0.4) walk(p.x - Math.sin(toPlayer) * stop, p.z - Math.cos(toPlayer) * stop, this.gait.walk * 0.8, 0.3);
        else face(toPlayer, 4);
        if (this.curiosity < 0.25 || dist > 18) this.set('idle');
        if (this.fear > 0.45) this.set('wary');
        this._readyCheck(ev);
        break;
      }
      case 'wary':
        face(toPlayer, 6);
        if (this.fear < 0.15 && this.stateT > 1.5) this.set(this.curiosity > 0.5 ? 'curious' : 'idle');
        this._readyCheck(ev);
        break;
      case 'flee': {
        // Away from you, curving toward home's side when it can.
        const away = Math.atan2(-dx, -dz) + Math.sin(this.stateT * 1.3) * 0.4;
        const tx = this.x + Math.sin(away) * 6;
        const tz = this.z + Math.cos(away) * 6;
        const homeD = Math.hypot(this.home.x - this.x, this.home.z - this.z);
        const pull = homeD > this.roam * 2.4 ? 0.6 : 0;
        walk(tx + (this.home.x - this.x) * pull * 0.2, tz + (this.home.z - this.z) * pull * 0.2, this.gait.run, 0.1);
        if (this.stateT > this.fleeFor && dist > Math.max(12, def.hearing * 0.7)) {
          this.set('hide');
          this.hideFor = 3 + this.r() * 4;
          ev.push({ type: 'hide' });
        }
        if (this.stateT > 9) {
          this.set('hide');
          this.hideFor = 4;
        }
        break;
      }
      case 'hide':
        face(toPlayer, 2);
        this.speed = 0;
        if (this.stateT > this.hideFor) {
          this.fear = Math.min(this.fear, 0.4);
          this.set('wary');
        }
        break;
      case 'seek': {
        const t = this.treat;
        if (!t || t.taken) {
          this.treat = null;
          this.set('idle');
          break;
        }
        if (walk(t.x, t.z, this.gait.walk * 1.4, 0.45)) {
          t.taken = this.id;
          this.set('eat');
          const r = treatReaction(this.species, t.kind);
          this.reaction = r.reaction;
          this.eating = t;
        }
        break;
      }
      case 'eat':
        face(this.yaw, 1);
        if (this.stateT > 1.7) {
          const r = treatReaction(this.species, this.eating.kind);
          this.trust = Math.max(0, this.trust + r.trust);
          if (r.reaction === 'dislike') this.fear = Math.min(0.9, this.fear + 0.25);
          else this.fear = 0;
          ev.push({ type: 'eat', treat: this.eating.kind, reaction: r.reaction, id: this.eating.id });
          this.eating = null;
          this.treat = null;
          this.set(r.reaction === 'dislike' ? 'wary' : 'curious');
          this.curiosity = r.reaction === 'dislike' ? 0.2 : 0.9;
          this._readyCheck(ev);
        }
        break;
      case 'ready':
        if (dist > 2.4) walk(p.x - Math.sin(toPlayer) * 2.2, p.z - Math.cos(toPlayer) * 2.2, this.gait.walk, 0.3);
        else face(toPlayer, 4);
        if (this.trust < this.def.trust * 0.8) this.set('curious');
        break;
      case 'trust':
        face(toPlayer, 3);
        this.fear = 0;
        break;
      default:
        break;
    }
    return ev;
  }

  _curiousCheck(ev, dist) {
    if (this.curiosity > 0.6 && dist < 13) {
      this.set('curious');
      ev.push({ type: 'curious' });
    } else if (this.fear > 0.5) this.set('wary');
    this._readyCheck(ev);
  }

  _readyCheck(ev) {
    if (this.garden) return;
    if (this.trust >= this.def.trust && this.state !== 'ready' && this.state !== 'trust' && this.fear < 0.5) {
      this.set('ready');
      ev.push({ type: 'ready' });
    }
  }

  /** Move by the current speed and heading, if the ground allows (else turn away). */
  _step(dt, ctx) {
    const nx = this.x + Math.sin(this.yaw) * this.speed * dt;
    const nz = this.z + Math.cos(this.yaw) * this.speed * dt;
    if (!ctx.walkable || ctx.walkable(nx, nz, this)) {
      this.x = nx;
      this.z = nz;
    } else {
      this.yaw = wrap(this.yaw + (this.r() < 0.5 ? 1.2 : -1.2));
      this.speed *= 0.5;
    }
  }

  /** The trust moment failed: a little shaken, some trust kept. */
  shaken() {
    this.trust *= 0.7;
    this.fear = 0.55;
    this.set('wary');
  }
}

/**
 * A befriended creature's mind: keep up with you in a loose fan behind,
 * catch up at a run (or appear at your side when left far behind), and
 * when you stop — sit, look about, and play with the others.
 */
export const SLOTS = [
  [-1.9, -1.5],
  [1.9, -1.7],
  [-0.9, -3.0]
];

export class FriendBrain {
  constructor({ species, slot = 0, x = 0, z = 0, uid = null }) {
    this.species = species;
    this.def = SPECIES[species];
    this.uid = uid;
    this.slot = slot;
    this.x = x;
    this.z = z;
    this.yaw = 0;
    this.speed = 0;
    this.state = 'follow';
    this.stateT = 0;
    this.task = null;
    this.idleT = 0;
    this.gait = GAITS[this.def.gait] ?? GAITS.hop;
  }

  set(s) {
    if (s !== this.state) {
      this.state = s;
      this.stateT = 0;
    }
  }

  /** Where this friend wants to be: its place in the fan behind you. */
  slotAt(p) {
    const [ox, oz] = SLOTS[this.slot % SLOTS.length];
    const c = Math.cos(p.yaw);
    const s = Math.sin(p.yaw);
    return { x: p.x + ox * c + oz * s, z: p.z - ox * s + oz * c };
  }

  /** Send it to do something at (x, z); `then` runs when it arrives. */
  doAt(x, z, kind, then) {
    this.task = { x, z, kind, then };
    this.set('task');
  }

  /**
   * One tick. `ctx`: { player: { x, z, yaw, speed }, friends: [FriendBrain], walkable }.
   * Returns events: { type: 'teleport' | 'arrive' | 'play' }.
   */
  update(dt, ctx) {
    const ev = [];
    const p = ctx.player;
    this.stateT += dt;
    const want = this.slotAt(p);
    const d = Math.hypot(want.x - this.x, want.z - this.z);
    const fromPlayer = Math.hypot(p.x - this.x, p.z - this.z);
    if (fromPlayer > 42 && this.state !== 'task') {
      // Left far behind: it catches up out of sight.
      this.x = want.x;
      this.z = want.z;
      this.yaw = p.yaw;
      ev.push({ type: 'teleport' });
    }
    const go = (tx, tz, speed) => {
      const dx = tx - this.x;
      const dz = tz - this.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 0.15) {
        this.speed *= Math.exp(-dt * 8);
        return true;
      }
      const yaw = Math.atan2(dx, dz);
      this.yaw = wrap(this.yaw + Math.max(-dt * 8, Math.min(dt * 8, wrap(yaw - this.yaw))));
      this.speed += (speed - this.speed) * Math.min(1, dt * 4);
      const step = Math.min(dd, this.speed * dt);
      const nx = this.x + Math.sin(this.yaw) * step;
      const nz = this.z + Math.cos(this.yaw) * step;
      if (!ctx.walkable || ctx.walkable(nx, nz, this)) {
        this.x = nx;
        this.z = nz;
      } else {
        // Blocked: slip sideways round it.
        const side = this.yaw + Math.PI / 2;
        const sx = this.x + Math.sin(side) * step;
        const sz = this.z + Math.cos(side) * step;
        if (!ctx.walkable || ctx.walkable(sx, sz, this)) {
          this.x = sx;
          this.z = sz;
        }
      }
      return dd < 0.4;
    };
    if (this.state === 'task' && this.task) {
      const t = this.task;
      if (go(t.x, t.z, this.gait.run * 0.8) || this.stateT > 8) {
        const then = t.then;
        this.task = null;
        this.set('follow');
        ev.push({ type: 'arrive', kind: t.kind });
        then?.();
      }
      return ev;
    }
    const moving = p.speed > 0.4;
    if (moving || d > 3.2) {
      this.idleT = 0;
      this.set('follow');
      // Keep up: faster the further behind it falls.
      const speed = Math.min(this.gait.run * 1.15, Math.max(p.speed * 1.05, d * 1.3));
      go(want.x, want.z, d > 0.6 ? speed : 0);
    } else {
      this.idleT += dt;
      if (this.state === 'follow' && this.idleT > 2.5) {
        // Play with a friend if there is one, else sit and look about.
        const other = (ctx.friends ?? []).find((f) => f !== this && f.state !== 'task');
        this.set(other && (this.slot + Math.floor(this.idleT)) % 3 === 0 ? 'play' : 'idle');
        if (this.state === 'play') {
          this.playWith = other;
          ev.push({ type: 'play' });
        }
      }
      if (this.state === 'play') {
        const o = this.playWith;
        const a = this.stateT * 2.2 + this.slot * 2.1;
        if (o) go(o.x + Math.sin(a) * 1.4, o.z + Math.cos(a) * 1.4, this.gait.walk * 2.2);
        if (this.stateT > 5) this.set('idle');
      } else {
        this.speed *= Math.exp(-dt * 6);
        const look = Math.atan2(p.x - this.x, p.z - this.z);
        this.yaw = wrap(this.yaw + Math.max(-dt * 2, Math.min(dt * 2, wrap(look - this.yaw))));
        if (this.stateT > 6) this.set('follow');
      }
    }
    return ev;
  }
}
