/**
 * The minds, as pure state machines (no three.js) so the tests can drive them:
 *
 *  - MonsterBrain: the Gnarlhorn. It roams between its haunts (leaving
 *    tracks), lingers, notices the hunter, roars, and fights — telegraphed
 *    bites, tail sweeps and charges, a roar that staggers — turns enraged at
 *    low health, limps off to its den to sleep when weakened, wakes if
 *    disturbed, and dies.
 *  - Tracker: the hunter's tracking — footprints and marks found, the scout
 *    flies' level, and whether the monster is tracked (shown on the map).
 *  - MountBrain: the mount — called by a whistle, waiting, ridden at a walk,
 *    trot or gallop, jumping, and following the path on its own.
 */
import { GNARLHORN, MONSTER_ATTACKS, monsterMood } from './rules.js';

const TAU = Math.PI * 2;
export const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
const headingTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);

/* ------------------------------------------------------------------ the monster */

export const MONSTER_SPEED = { walk: 2.3, run: 6.2, rage: 7.6, limp: 1.6, charge: 15 };
export const NOTICE = { near: 26, sight: 48, forget: 80, forgetTime: 12 };

export class MonsterBrain {
  /**
   * @param {{ areas: {x,z,r,id}[], den: {x,z}, start?: number, rand?: () => number, def?: object }} o
   */
  constructor({ areas, den, start = 0, rand = Math.random, def = GNARLHORN }) {
    this.def = def;
    this.areas = areas;
    this.den = den;
    this.rand = rand;
    const a = areas[start];
    this.x = a.x;
    this.z = a.z;
    this.yaw = 0;
    this.speed = 0;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.state = 'linger';
    this.t = 0;
    this.stateT = 0;
    this.area = start;
    this.lingerFor = 10;
    this.goal = null;
    this.attack = null;
    this.cool = 0;
    this.lastSeen = 0;
    this.enraged = false;
    this.fled = false;
    this.roared = false;
    this.recent = [];
    this.parts = {};
    this.broken = [];
    this.trackDist = 0;
    this.chargeHeading = 0;
    this.roarCool = 20;
  }

  get frac() {
    return this.hp / this.maxHp;
  }

  get limping() {
    return this.state !== 'dead' && this.frac <= this.def.fleeAt;
  }

  get alive() {
    return this.state !== 'dead';
  }

  _set(state) {
    this.state = state;
    this.stateT = 0;
  }

  /**
   * One step. `w`: { hunter: { x, z, alive, hidden? }, walkable?(x, z) → bool }.
   * Returns this step's events.
   */
  update(dt, w) {
    const ev = [];
    if (this.state === 'dead') return ev;
    this.t += dt;
    this.stateT += dt;
    this.cool = Math.max(0, this.cool - dt);
    this.roarCool = Math.max(0, this.roarCool - dt);
    this.recent = this.recent.filter((r) => this.t - r.t < 6);
    const h = w.hunter;
    const dh = h ? dist(this.x, this.z, h.x, h.z) : Infinity;
    const toH = h ? headingTo(this.x, this.z, h.x, h.z) : 0;
    const facing = Math.abs(wrap(toH - this.yaw));
    const sees = h && h.alive && (dh < NOTICE.near || (dh < NOTICE.sight && facing < 1.2));
    let want = 0;
    let wantYaw = this.yaw;
    let turnRate = 1.6;
    switch (this.state) {
      case 'linger': {
        if (this.stateT > this.lingerFor) {
          this._pickGoal();
          this._set('roam');
        }
        if (sees) this._alert(ev);
        break;
      }
      case 'roam': {
        const g = this.goal;
        wantYaw = headingTo(this.x, this.z, g.x, g.z);
        want = this.limping ? MONSTER_SPEED.limp : MONSTER_SPEED.walk;
        if (dist(this.x, this.z, g.x, g.z) < (g.r ?? 6) * 0.5) {
          this.area = g.i ?? this.area;
          this.lingerFor = 14 + this.rand() * 20;
          this._set('linger');
          ev.push({ type: 'arrive', area: this.areas[this.area]?.id });
        }
        if (sees) this._alert(ev);
        break;
      }
      case 'alert': {
        wantYaw = toH;
        turnRate = 2.4;
        if (this.stateT > 1.0 && !this.roared) {
          this.roared = true;
          this._begin('roar', ev, h);
        } else if (this.stateT > 1.0) this._set('engage');
        break;
      }
      case 'engage': {
        if (!h || !h.alive) {
          this._set('linger');
          this.lingerFor = 6;
          break;
        }
        if (sees || dh < NOTICE.forget) this.lastSeen = this.t;
        if (this.t - this.lastSeen > NOTICE.forgetTime) {
          ev.push({ type: 'lose' });
          this._pickGoal();
          this._set('roam');
          break;
        }
        // Weak: limp off to the den.
        if (this.frac <= this.def.fleeAt && !this.fled) {
          this.fled = true;
          this.goal = { x: this.den.x, z: this.den.z, r: 6, den: true };
          ev.push({ type: 'flee' });
          this._set('flee');
          break;
        }
        wantYaw = toH;
        turnRate = this.enraged ? 2.6 : 2.0;
        const pick = this.cool <= 0 ? this._choose(dh, facing) : null;
        if (pick) this._begin(pick, ev, h);
        else if (dh > 5.5) want = this.enraged ? MONSTER_SPEED.rage : MONSTER_SPEED.run;
        else if (dh < 3.5) want = -1.2;
        break;
      }
      case 'attack': {
        const a = this.attack;
        const A = MONSTER_ATTACKS[a.id];
        a.t += dt;
        const speedK = this.enraged ? 1.25 : 1;
        if (a.phase === 'windup') {
          // Track the hunter while winding up (less as the blow nears).
          if (h && a.id !== 'roar') {
            wantYaw = toH;
            turnRate = a.id === 'charge' ? 3 : 1.4;
          }
          if (a.t >= A.windup / speedK) {
            a.phase = 'active';
            a.t = 0;
            if (a.id === 'charge') this.chargeHeading = this.yaw;
            ev.push({ type: 'strike', attack: a.id, x: this.x, z: this.z, yaw: this.yaw });
          }
        } else if (a.phase === 'active') {
          if (a.id === 'charge') {
            want = MONSTER_SPEED.charge * (this.limping ? 0.7 : 1);
            wantYaw = this.chargeHeading;
            turnRate = 0.5;
            if (h && dh < 8) {
              wantYaw = this.chargeHeading + Math.max(-0.4, Math.min(0.4, wrap(toH - this.chargeHeading)));
            }
          }
          if (a.t >= A.active) {
            a.phase = 'recover';
            a.t = 0;
          }
        } else if (a.t >= A.recover / speedK) {
          this.attack = null;
          this.cool = (this.enraged ? 0.5 : 1.0) + this.rand() * (this.enraged ? 0.9 : 1.4);
          this._set('engage');
        }
        break;
      }
      case 'stagger': {
        if (this.stateT > 2.6) this._set(this.fled && this.frac <= this.def.fleeAt ? 'flee' : 'engage');
        break;
      }
      case 'flee': {
        const g = this.goal;
        wantYaw = headingTo(this.x, this.z, g.x, g.z);
        want = MONSTER_SPEED.limp * 1.25;
        if (dist(this.x, this.z, g.x, g.z) < 5) {
          ev.push({ type: 'sleep' });
          this._set('rest');
        }
        break;
      }
      case 'rest': {
        // Sleeps it off: a little health back, then up again.
        this.hp = Math.min(this.maxHp * (this.def.fleeAt + 0.1), this.hp + this.maxHp * 0.004 * dt);
        if (this.stateT > 70) {
          ev.push({ type: 'wake' });
          this._pickGoal();
          this._set('roam');
        }
        break;
      }
    }
    // Turn and move.
    const d = wrap(wantYaw - this.yaw);
    const rate = turnRate * (this.limping ? 0.7 : 1);
    this.yaw = wrap(this.yaw + Math.max(-rate * dt, Math.min(rate * dt, d)));
    if (want > 0 && Math.abs(d) > 1.4 && this.state !== 'attack') want *= 0.3;
    const accel = this.state === 'attack' ? 10 : 3;
    this.speed += (want - this.speed) * Math.min(1, dt * accel);
    const nx = this.x + Math.sin(this.yaw) * this.speed * dt;
    const nz = this.z + Math.cos(this.yaw) * this.speed * dt;
    if (!w.walkable || w.walkable(nx, nz)) {
      const moved = dist(this.x, this.z, nx, nz);
      this.x = nx;
      this.z = nz;
      this.trackDist += moved;
      if (this.trackDist > 9 && (this.state === 'roam' || this.state === 'flee')) {
        this.trackDist = 0;
        ev.push({ type: 'track', x: this.x, z: this.z, yaw: this.yaw });
      }
    } else {
      this.speed *= 0.3;
      if (this.state === 'roam') this.yaw = wrap(this.yaw + 0.8);
      if (this.attack?.id === 'charge' && this.attack.phase === 'active') this.attack.t = MONSTER_ATTACKS.charge.active;
    }
    return ev;
  }

  _alert(ev) {
    ev.push({ type: 'notice' });
    this.lastSeen = this.t;
    this._set('alert');
  }

  _pickGoal() {
    const n = this.areas.length;
    const i = n > 1 ? (this.area + 1 + (Math.floor(this.rand() * (n - 1)) % (n - 1))) % n : 0;
    const a = this.areas[i];
    this.goal = { x: a.x, z: a.z, r: a.r, i };
  }

  /** What to do at this distance and angle: bite up close in front, sweep the tail at the sides, charge from afar, sometimes roar. */
  _choose(dh, facing) {
    const opts = [];
    if (dh < 6.5 && facing < 0.9) opts.push(['bite', 4]);
    if (dh < 8.5 && facing > 1.0) opts.push(['tail', 5]);
    if (dh < 7.5 && facing < 0.9) opts.push(['tail', 1]);
    if (dh > 11 && dh < 34 && facing < 0.5) opts.push(['charge', this.enraged ? 3 : 2]);
    if (this.roarCool <= 0 && dh < 20) opts.push(['roar', 1]);
    if (!opts.length) return null;
    const total = opts.reduce((a, [, w]) => a + w, 0);
    let x = this.rand() * total;
    for (const [id, w] of opts) if ((x -= w) < 0) return id;
    return opts[0][0];
  }

  _begin(id, ev, h) {
    this.attack = { id, phase: 'windup', t: 0 };
    if (id === 'roar') this.roarCool = 22 + this.rand() * 10;
    this._set('attack');
    ev.push({ type: 'windup', attack: id, x: this.x, z: this.z, yaw: this.yaw, tx: h?.x, tz: h?.z });
  }

  /**
   * It is hit: `amount` health. Returns events — enraged, a stagger, waking,
   * death. (Part breaks are rules.damagePart, the caller adds 'break'.)
   */
  damage(amount, { stagger = false } = {}) {
    const ev = [];
    if (this.state === 'dead') return ev;
    this.hp = Math.max(0, this.hp - amount);
    this.recent.push({ t: this.t, a: amount });
    if (this.hp <= 0) {
      this._set('dead');
      this.attack = null;
      this.speed = 0;
      ev.push({ type: 'death' });
      return ev;
    }
    if (!this.enraged && monsterMood(this.frac, this.def) !== 'calm') {
      this.enraged = true;
      ev.push({ type: 'enrage' });
      this.roarCool = 0;
    }
    if (this.state === 'rest') {
      ev.push({ type: 'wake' });
      this.roared = true;
      this._begin('roar', ev, null);
      return ev;
    }
    if (['linger', 'roam'].includes(this.state)) {
      ev.push({ type: 'notice' });
      this.lastSeen = this.t;
      this._set('alert');
    }
    this.lastSeen = this.t;
    const burst = this.recent.reduce((a, r) => a + r.a, 0);
    if ((stagger || burst >= this.def.staggerAt) && this.state !== 'stagger') {
      this.recent = [];
      this.attack = null;
      this._set('stagger');
      ev.push({ type: 'stagger' });
    }
    return ev;
  }
}

/* ------------------------------------------------------------------ tracking */

export const TRACK_GOAL = 3;

export class Tracker {
  constructor() {
    this.marks = [];
    this.found = 0;
    this.spotted = false;
  }

  /** A new mark (a footprint, a scratch on a tree). Old ones fade: only the newest `keep` stay. */
  add(x, z, { kind = 'print', yaw = 0, keep = 40 } = {}) {
    const m = { x, z, kind, yaw, found: false, id: (this._id = (this._id ?? 0) + 1) };
    this.marks.push(m);
    while (this.marks.length > keep) this.marks.shift();
    return m;
  }

  /** The nearest unfound mark within `r` of a point. */
  nearest(x, z, r = 3) {
    let best = null;
    let bd = r;
    for (const m of this.marks) {
      if (m.found) continue;
      const d = dist(x, z, m.x, m.z);
      if (d < bd) [best, bd] = [m, d];
    }
    return best;
  }

  /** Investigate a mark: one more toward tracking. Returns true when that completes the tracking. */
  collect(m) {
    if (!m || m.found) return false;
    m.found = true;
    this.found++;
    return this.found === TRACK_GOAL;
  }

  get tracked() {
    return this.found >= TRACK_GOAL || this.spotted;
  }

  /** Where the scout flies lead: the monster once tracked, else the nearest unfound mark. */
  lead(hx, hz, monster) {
    if (this.tracked && monster) return { x: monster.x, z: monster.z, monster: true };
    let best = null;
    let bd = Infinity;
    for (const m of this.marks) {
      if (m.found) continue;
      const d = dist(hx, hz, m.x, m.z);
      if (d < bd) [best, bd] = [m, d];
    }
    return best ? { x: best.x, z: best.z, mark: best } : null;
  }
}

/* ------------------------------------------------------------------ the mount */

export const GAITS = [
  { id: 'stand', v: 0 },
  { id: 'walk', v: 2.4 },
  { id: 'trot', v: 6.2 },
  { id: 'gallop', v: 13 }
];
export const MOUNT = { callDist: 28, arrive: 3.2, jumpV: 7.2, gravity: 20, turn: [2.4, 2.0, 1.55, 1.1] };

export class MountBrain {
  constructor() {
    this.state = 'away';
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.speed = 0;
    this.gait = 0;
    this.vy = 0;
    this.y = 0;
    this.air = false;
    this.auto = false;
  }

  /** The whistle: it comes running from behind the hunter, out of sight; or, if it's near, trots over. */
  call(hx, hz, hyaw, rand = Math.random) {
    if (this.state === 'ridden') return false;
    if (this.state === 'away' || dist(this.x, this.z, hx, hz) > 60) {
      const a = hyaw + Math.PI + (rand() - 0.5) * 0.8;
      this.x = hx + Math.sin(a) * MOUNT.callDist;
      this.z = hz + Math.cos(a) * MOUNT.callDist;
      this.yaw = headingTo(this.x, this.z, hx, hz);
    }
    this.state = 'coming';
    return true;
  }

  canMount(hx, hz) {
    return (this.state === 'waiting' || this.state === 'coming') && dist(this.x, this.z, hx, hz) < 3.4;
  }

  mount() {
    this.state = 'ridden';
    this.gait = 0;
    this.speed = 0;
  }

  dismount() {
    if (this.state !== 'ridden') return false;
    this.state = 'waiting';
    this.gait = 0;
    this.auto = false;
    return true;
  }

  /**
   * One step.
   *  - coming: run to the hunter `h` and stop beside them;
   *  - ridden: `input` { forward (−1…1), steer (−1…1), gallop, jump, auto }, `pathHeading`
   *    (where the path leads, for auto) — the gait steps up and down, the turn rate falls with speed.
   * `ground(x, z)` the height, `walkable(x, z, fromX, fromZ)` whether it can go there.
   */
  update(dt, { h, input = {}, pathHeading = null, ground = () => 0, walkable = () => true }) {
    const ev = [];
    let want = 0;
    let wantYaw = this.yaw;
    let turn = 3;
    if (this.state === 'coming') {
      const d = dist(this.x, this.z, h.x, h.z);
      wantYaw = headingTo(this.x, this.z, h.x, h.z);
      want = d > 12 ? GAITS[3].v * 0.85 : d > MOUNT.arrive ? GAITS[2].v * Math.min(1, d / 8) + 1 : 0;
      if (d <= MOUNT.arrive) {
        this.state = 'waiting';
        ev.push({ type: 'arrive' });
      }
    } else if (this.state === 'ridden') {
      this.auto = Boolean(input.auto) && pathHeading != null;
      if (this.auto) {
        this.gait = input.gallop ? 3 : Math.max(2, this.gait === 3 ? 3 : 2);
        wantYaw = pathHeading;
        turn = 2.2;
      } else {
        const f = input.forward ?? 0;
        if (f > 0.1) this.gait = input.gallop ? 3 : Math.max(1, Math.min(2, this.gait === 3 ? 2 : this.gait + (this.gait < 2 ? 1 : 0)));
        else if (f < -0.1) this.gait = 0;
        else if (this.gait > 0 && !input.cruise) this.gait = 0;
        wantYaw = this.yaw - (input.steer ?? 0) * 1.2;
        turn = MOUNT.turn[this.gait];
      }
      want = GAITS[this.gait].v;
      if ((input.forward ?? 0) < -0.1 && this.speed < 0.6) want = -1.3;
      if (input.jump && !this.air) {
        this.air = true;
        this.vy = MOUNT.jumpV;
        ev.push({ type: 'jump' });
      }
    } else {
      want = 0;
    }
    const d = wrap(wantYaw - this.yaw);
    const k = this.air ? 0.25 : 1;
    this.yaw = wrap(this.yaw + Math.max(-turn * dt * k, Math.min(turn * dt * k, d)));
    const accel = want > this.speed ? (this.gait === 3 ? 2.4 : 3.2) : 5;
    this.speed += (want - this.speed) * Math.min(1, dt * accel * (this.air ? 0.1 : 1));
    const nx = this.x + Math.sin(this.yaw) * this.speed * dt;
    const nz = this.z + Math.cos(this.yaw) * this.speed * dt;
    if (walkable(nx, nz, this.x, this.z)) {
      this.x = nx;
      this.z = nz;
    } else if (!this.air) {
      // Blocked (too steep, a wall): stop short, as a beast would.
      if (this.speed > 7) ev.push({ type: 'balk' });
      this.speed *= 0.2;
    }
    const g = ground(this.x, this.z);
    if (this.air) {
      this.vy -= MOUNT.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= g && this.vy < 0) {
        this.y = g;
        this.air = false;
        ev.push({ type: 'land', hard: Math.min(1, -this.vy / 12) });
      }
    } else this.y = g;
    return ev;
  }
}
