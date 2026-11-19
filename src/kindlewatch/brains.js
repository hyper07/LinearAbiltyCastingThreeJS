/**
 * Kindlewatch's foes, as state machines. Pure: a brain reads what its body
 * senses and says what it wants — where to move, which way to face, what
 * telegraph to show, and the moment a blow or shot is released. The game
 * moves the bodies, checks walls and applies the blows.
 *
 *   const brain = makeBrain('imp', rand);
 *   const out = brain.update(dt, { self, target, sees, now });
 *   // out.move {x, y} (0…1 of full speed), out.face (radians), out.tele (a
 *   // shape to draw on the ground, k = 0…1 how close the blow is), out.act
 *   // (a released attack: { kind, …params }), out.events ([…]).
 *
 * Every attack is telegraphed: a wind-up you can see (and a ground shape for
 * most) before the blow is released.
 */
import { ENEMIES, SLIME, jarlPhase } from './rules.js';

const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dir = (a) => ({ x: Math.cos(a), y: Math.sin(a) });

class Brain {
  constructor(kind, rand) {
    this.kind = kind;
    this.rand = rand;
    this.state = 'idle';
    this.t = 0; // time in the current state
    this.cool = 0;
    this.aim = 0;
  }

  go(state) {
    this.state = state;
    this.t = 0;
  }

  /** Taking a blow: most foes flinch (not mid-blow if they're heavy). */
  hurt(amount, { stagger = 0.22 } = {}) {
    if (this.state === 'dead') return;
    if (stagger > 0 && this.canFlinch()) {
      this.go('hurt');
      this.hurtFor = stagger;
    }
  }

  canFlinch() {
    return !['charge', 'leap', 'roar'].includes(this.state);
  }

  die() {
    this.go('dead');
  }

  base(dt) {
    this.t += dt;
    this.cool = Math.max(0, this.cool - dt);
    return { move: { x: 0, y: 0 }, face: null, tele: null, act: null, events: [] };
  }
}

/* ------------------------------------------------------------ cinder imp */

/** Darts round you at a few tiles, then crouches glowing (0.55 s, a line toward you) and throws an ember; scratches if you get close. */
export class ImpBrain extends Brain {
  constructor(rand) {
    super('imp', rand);
    this.orbit = rand() < 0.5 ? 1 : -1;
    this.cool = 0.8 + rand() * 1.2;
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    switch (this.state) {
      case 'idle':
        if (sees && d < 10) this.go('alert');
        break;
      case 'alert':
        o.face = a;
        o.hop = Math.sin(Math.min(1, this.t / 0.4) * Math.PI);
        if (this.t > 0.4) this.go('dart');
        break;
      case 'dart': {
        o.face = a;
        // Hold a ring of 3–5 tiles round the target, sliding sideways, with bursts.
        const want = 4;
        const radial = (d - want) * 0.6;
        const side = this.orbit * (0.7 + 0.3 * Math.sin(this.t * 5));
        o.move = { x: Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * side, y: Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * side };
        const m = Math.hypot(o.move.x, o.move.y);
        if (m > 1) o.move = { x: o.move.x / m, y: o.move.y / m };
        if (this.rand() < dt * 0.6) this.orbit *= -1;
        if (d < 1.5 && this.cool <= 0) this.go('windScratch');
        else if (this.cool <= 0 && sees && d < 9) {
          this.aim = a;
          this.go('windThrow');
        }
        break;
      }
      case 'windThrow':
        // Track the target for most of the wind-up, then commit.
        if (this.t < 0.38) this.aim = a;
        o.face = this.aim;
        o.tele = { kind: 'line', angle: this.aim, len: Math.min(9, d + 1), width: 0.22, k: this.t / 0.55 };
        if (this.t >= 0.55) {
          o.act = { kind: 'ember', angle: this.aim, speed: 9.5, dmg: 8 };
          this.cool = 1.6 + this.rand() * 1.4;
          this.go('recover');
        }
        break;
      case 'windScratch':
        o.face = a;
        o.tele = { kind: 'arc', angle: a, r: 1.1, spread: 1.6, k: this.t / 0.32 };
        if (this.t >= 0.32) {
          o.act = { kind: 'melee', angle: a, reach: 1.15, arc: 1.8, dmg: 6, push: 2 };
          this.cool = 1.2;
          this.go('recover');
        }
        break;
      case 'recover':
        o.face = a;
        if (this.t > 0.4) this.go('dart');
        break;
      case 'hurt':
        if (this.t > (this.hurtFor ?? 0.22)) this.go('dart');
        break;
      default:
        break;
    }
    return o;
  }
}

/* ------------------------------------------------------------ rime slime */

/** Hops at you: squashes down (the wind-up, a ring where it will land), leaps, lands. Splits when it dies. */
export class SlimeBrain extends Brain {
  constructor(rand, size = 3) {
    super('slime', rand);
    this.size = size;
    this.cool = 0.3 + rand() * 0.8;
  }

  get squashTime() {
    return 0.32 + this.size * 0.06;
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    const hop = SLIME[this.size].hop;
    switch (this.state) {
      case 'idle':
        if (sees && d < 9) this.go('rest');
        break;
      case 'rest':
        o.face = a;
        if (this.t > 0.25 + this.cool) {
          this.aim = a + (this.rand() - 0.5) * 0.35;
          this.leap = Math.min(hop, Math.max(0.8, d));
          this.go('squash');
        }
        break;
      case 'squash':
        o.face = this.aim;
        o.squash = this.t / this.squashTime;
        o.tele = { kind: 'circle', x: self.x + Math.cos(this.aim) * this.leap, y: self.y + Math.sin(this.aim) * this.leap, r: SLIME[this.size].radius + 0.35, k: this.t / this.squashTime };
        if (this.t >= this.squashTime) {
          o.act = { kind: 'leap', angle: this.aim, dist: this.leap, time: 0.42 };
          this.go('air');
        }
        break;
      case 'air':
        o.face = this.aim;
        o.air = Math.min(1, this.t / 0.42);
        o.contact = true;
        if (this.t >= 0.42) {
          o.events.push({ kind: 'land' });
          this.cool = 0.25 + this.rand() * 0.5;
          this.go('rest');
        }
        break;
      case 'hurt':
        if (this.t > (this.hurtFor ?? 0.2)) this.go('rest');
        break;
      default:
        break;
    }
    return o;
  }

  canFlinch() {
    return this.state !== 'air';
  }
}

/* ------------------------------------------------------------ hollow sentinel */

/** Walks at you behind a raised tower shield; at close range lifts its blade (0.65 s, an arc on the floor) and chops — and is open while it recovers. Break its guard with charged blows. */
export class SentinelBrain extends Brain {
  constructor(rand) {
    super('sentinel', rand);
    this.guardMax = ENEMIES.sentinel.guard;
    this.guard = this.guardMax;
    this.broken = 0;
    this.cool = 0.5;
  }

  get guarding() {
    return ['idle', 'approach', 'hurt'].includes(this.state) && this.broken <= 0;
  }

  breakGuard() {
    this.broken = 2.0;
    this.guard = 0;
    this.go('broken');
  }

  canFlinch() {
    return this.state === 'recover' || this.state === 'broken' || this.state === 'approach';
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    this.broken = Math.max(0, this.broken - dt);
    // The guard mends slowly while it isn't broken.
    if (this.broken <= 0 && this.state !== 'broken') this.guard = Math.min(this.guardMax, this.guard + dt * 4);
    switch (this.state) {
      case 'idle':
        if (sees && d < 9) this.go('approach');
        break;
      case 'approach':
        o.face = a;
        if (d > 1.6) o.move = dir(a);
        if (d < 2.0 && this.cool <= 0) {
          this.aim = a;
          this.go(this.rand() < 0.3 ? 'windBash' : 'windChop');
        }
        break;
      case 'windChop':
        o.face = this.aim;
        o.tele = { kind: 'arc', angle: this.aim, r: 2.2, spread: 1.9, k: this.t / 0.68 };
        if (this.t >= 0.68) {
          o.act = { kind: 'melee', angle: this.aim, reach: 2.25, arc: 2.0, dmg: 17, push: 5 };
          this.go('recover');
        }
        break;
      case 'windBash':
        // A shield shove: a short lane, quick.
        o.face = this.aim;
        o.tele = { kind: 'line', angle: this.aim, len: 2.4, width: 0.9, k: this.t / 0.48 };
        if (this.t >= 0.48) {
          o.act = { kind: 'bash', angle: this.aim, reach: 2.0, arc: 1.4, dmg: 9, push: 9, lunge: 6 };
          this.go('recover');
        }
        break;
      case 'recover':
        o.face = this.aim;
        if (this.t > 0.7) {
          this.cool = 0.6 + this.rand() * 0.6;
          this.go('approach');
        }
        break;
      case 'broken':
        if (this.t > 2.0) {
          this.guard = this.guardMax * 0.5;
          this.go('approach');
        }
        break;
      case 'hurt':
        if (this.t > (this.hurtFor ?? 0.2)) this.go('approach');
        break;
      default:
        break;
    }
    return o;
  }
}

/* ------------------------------------------------------------ rimefletch archer */

/** Keeps six to nine tiles off, backs away when you close in, then draws (0.9 s, a frost line that locks on for the last quarter second) and looses a freezing arrow. */
export class ArcherBrain extends Brain {
  constructor(rand) {
    super('archer', rand);
    this.cool = 0.6 + rand();
    this.strafe = rand() < 0.5 ? 1 : -1;
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    switch (this.state) {
      case 'idle':
        if (sees && d < 12) this.go('keep');
        break;
      case 'keep': {
        o.face = a;
        const radial = d < 5 ? -1 : d > 9 ? 0.8 : 0;
        o.move = { x: Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * this.strafe * 0.45, y: Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * this.strafe * 0.45 };
        if (self.bumped) this.strafe *= -1;
        if (this.cool <= 0 && sees && d < 12) {
          this.aim = a;
          this.go('draw');
        }
        break;
      }
      case 'draw':
        if (this.t < 0.65) this.aim = a;
        o.face = this.aim;
        o.tele = { kind: 'line', angle: this.aim, len: 12, width: 0.12, k: this.t / 0.9, locked: this.t >= 0.65 };
        if (this.t >= 0.9) {
          o.act = { kind: 'arrow', angle: this.aim, speed: 15, dmg: 12, chill: 1.5 };
          this.cool = 1.6 + this.rand() * 1.0;
          this.go('loose');
        }
        break;
      case 'loose':
        o.face = this.aim;
        if (this.t > 0.45) {
          this.strafe = this.rand() < 0.5 ? 1 : -1;
          this.go('keep');
        }
        break;
      case 'hurt':
        if (this.t > (this.hurtFor ?? 0.22)) this.go('keep');
        break;
      default:
        break;
    }
    return o;
  }
}

/* ------------------------------------------------------------ gorehorn */

/** Stalks to a few tiles off, paws the snow (0.95 s, a lane locked in its last 0.3 s) and charges; a charge into a wall stuns it. Gores at close range. */
export class GorehornBrain extends Brain {
  constructor(rand) {
    super('gorehorn', rand);
    this.cool = 0.8 + rand();
  }

  canFlinch() {
    return this.state === 'stunned' || this.state === 'stalk';
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    switch (this.state) {
      case 'idle':
        if (sees && d < 10) this.go('stalk');
        break;
      case 'stalk':
        o.face = a;
        if (d > 6) o.move = { x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7 };
        else if (d < 3.2) o.move = { x: -Math.cos(a) * 0.5, y: -Math.sin(a) * 0.5 };
        if (d < 1.8 && this.cool <= 0) {
          this.aim = a;
          this.go('windGore');
        } else if (this.cool <= 0 && sees) {
          this.aim = a;
          this.go('paw');
        }
        break;
      case 'paw':
        if (this.t < 0.65) this.aim = a;
        o.face = this.aim;
        o.tele = { kind: 'line', angle: this.aim, len: 14, width: 1.2, k: this.t / 0.95, locked: this.t >= 0.65 };
        o.paw = true;
        if (this.t >= 0.95) {
          o.act = { kind: 'charge', angle: this.aim, speed: 13.5, time: 1.3, dmg: 22, push: 12 };
          this.go('charge');
        }
        break;
      case 'charge':
        o.face = this.aim;
        o.move = dir(this.aim);
        o.charging = true;
        o.contact = true;
        if (self.bumped) {
          o.events.push({ kind: 'crash' });
          this.go('stunned');
        } else if (this.t > 1.3) {
          this.cool = 1.2 + this.rand();
          this.go('skid');
        }
        break;
      case 'skid':
        o.face = this.aim;
        if (this.t > 0.55) this.go('stalk');
        break;
      case 'stunned':
        if (this.t > 1.8) {
          this.cool = 0.8;
          this.go('stalk');
        }
        break;
      case 'windGore':
        o.face = this.aim;
        o.tele = { kind: 'arc', angle: this.aim, r: 2.0, spread: 1.7, k: this.t / 0.5 };
        if (this.t >= 0.5) {
          o.act = { kind: 'melee', angle: this.aim, reach: 2.0, arc: 1.8, dmg: 16, push: 8 };
          this.cool = 1.4;
          this.go('skid');
        }
        break;
      case 'hurt':
        if (this.t > (this.hurtFor ?? 0.2)) this.go('stalk');
        break;
      default:
        break;
    }
    return o;
  }
}

/* ------------------------------------------------------------ the rime jarl */

/**
 * Hrimgar, the Rime Jarl: a frost giant in three phases.
 *   1 (over 2/3): maul slams (a circle) and sweeps (a cone).
 *   2: roars — every brazier in the hall gutters out — calls two slimes, adds
 *      an ice-shard volley (five lines) and a freezing breath (a long cone that
 *      lays ice and snuffs torches).
 *   3 (under 1/3): roars again and rages — faster, and leaps onto you (a
 *      shadow that follows you, then a shockwave).
 */
export class JarlBrain extends Brain {
  constructor(rand) {
    super('jarl', rand);
    this.phase = 1;
    this.cool = 1.2;
    this.lastMove = '';
  }

  canFlinch() {
    return false;
  }

  hurt() {}

  get pace() {
    return this.phase === 3 ? 0.78 : this.phase === 2 ? 0.9 : 1;
  }

  pick(d) {
    const pool = [];
    if (d < 3.6) pool.push('slam', 'slam', 'sweep');
    else pool.push('slam');
    if (this.phase >= 2) pool.push('shards', 'breath');
    if (this.phase >= 3 && d > 3) pool.push('leap', 'leap');
    const options = pool.filter((m) => m !== this.lastMove || pool.length === 1);
    const m = options[Math.floor(this.rand() * options.length)];
    this.lastMove = m;
    return m;
  }

  update(dt, { self, target, sees }) {
    const o = this.base(dt);
    const d = dist(self, target);
    const a = angTo(self, target);
    const phase = jarlPhase(self.hp, self.maxHp);
    if (phase > this.phase && this.state !== 'dead' && this.state !== 'idle') {
      this.phase = phase;
      this.go('roar');
      o.events.push({ kind: 'phase', phase });
    }
    const P = this.pace;
    switch (this.state) {
      case 'idle':
        if (sees && d < 13) {
          this.go('roar');
          o.events.push({ kind: 'wake' });
        }
        break;
      case 'roar':
        o.face = a;
        o.roar = Math.min(1, this.t / 0.5);
        if (this.t > 1.6) {
          if (this.phase === 2 && !this.called2) {
            this.called2 = true;
            o.events.push({ kind: 'snuff' }, { kind: 'summon', type: 'slime', size: 2, count: 2 });
          }
          if (this.phase === 3 && !this.called3) {
            this.called3 = true;
            o.events.push({ kind: 'enrage' }, { kind: 'summon', type: 'slime', size: 1, count: 3 });
          }
          this.cool = 0.4;
          this.go('walk');
        }
        break;
      case 'walk':
        o.face = a;
        if (d > 2.6) o.move = { x: Math.cos(a) * (this.phase === 3 ? 1.35 : 1), y: Math.sin(a) * (this.phase === 3 ? 1.35 : 1) };
        if (this.cool <= 0) {
          this.move = this.pick(d);
          this.aim = a;
          this.spot = { x: self.x + Math.cos(a) * Math.min(2.4, Math.max(1.4, d - 0.3)), y: self.y + Math.sin(a) * Math.min(2.4, Math.max(1.4, d - 0.3)) };
          if (this.move === 'leap') this.spot = { x: target.x, y: target.y };
          this.go(this.move);
        }
        break;
      case 'slam': {
        const wind = 1.0 * P;
        o.face = this.aim;
        o.raise = Math.min(1, this.t / wind);
        o.tele = { kind: 'circle', x: this.spot.x, y: this.spot.y, r: 2.5, k: this.t / wind };
        if (this.t >= wind) {
          o.act = { kind: 'slam', x: this.spot.x, y: this.spot.y, r: 2.5, dmg: 26, push: 10 };
          this.after(0.95);
        }
        break;
      }
      case 'sweep': {
        const wind = 0.8 * P;
        o.face = this.aim;
        o.raise = Math.min(1, this.t / wind) * 0.6;
        o.tele = { kind: 'arc', angle: this.aim, r: 3.6, spread: 2.2, k: this.t / wind };
        if (this.t >= wind) {
          o.act = { kind: 'melee', angle: this.aim, reach: 3.6, arc: 2.3, dmg: 20, push: 11 };
          this.after(0.8);
        }
        break;
      }
      case 'shards': {
        const wind = 0.95 * P;
        if (this.t < wind * 0.6) this.aim = a;
        o.face = this.aim;
        o.raise = 0.5;
        o.tele = { kind: 'fan', angle: this.aim, len: 11, count: 5, spread: 0.9, k: this.t / wind };
        if (this.t >= wind) {
          o.act = { kind: 'shards', angle: this.aim, count: 5, spread: 0.9, speed: 12, dmg: 11 };
          this.after(0.8);
        }
        break;
      }
      case 'breath': {
        const wind = 0.75 * P;
        if (this.t < wind) this.aim = a;
        else this.aim += Math.max(-0.5 * dt, Math.min(0.5 * dt, ((a - this.aim + Math.PI * 3) % TAU) - Math.PI));
        o.face = this.aim;
        o.tele = { kind: 'arc', angle: this.aim, r: 6.5, spread: 0.85, k: Math.min(1, this.t / wind), held: this.t >= wind };
        if (this.t >= wind) o.breath = { angle: this.aim, r: 6.5, spread: 0.85, dps: 14 };
        if (this.t >= wind + 1.3) this.after(0.9);
        break;
      }
      case 'leap': {
        const crouch = 0.55 * P;
        const air = 0.85;
        o.face = angTo(self, this.spot);
        if (this.t < crouch + air * 0.6) this.spot = { x: this.spot.x + (target.x - this.spot.x) * Math.min(1, dt * 3), y: this.spot.y + (target.y - this.spot.y) * Math.min(1, dt * 3) };
        o.tele = { kind: 'circle', x: this.spot.x, y: this.spot.y, r: 3.0, k: this.t / (crouch + air) };
        if (this.t < crouch) o.crouch = this.t / crouch;
        else if (!this.launched) {
          this.launched = true;
          o.act = { kind: 'leap', time: air };
        }
        if (this.t >= crouch) o.air = Math.min(1, (this.t - crouch) / air);
        if (this.t >= crouch + air) {
          this.launched = false;
          o.act = { kind: 'slam', x: this.spot.x, y: this.spot.y, r: 3.0, dmg: 28, push: 13, ring: true };
          o.events.push({ kind: 'land', x: this.spot.x, y: this.spot.y });
          this.after(1.0);
        }
        break;
      }
      case 'recover':
        o.face = this.aim;
        if (this.t > this.recoverFor) {
          this.cool = 0.35 * P;
          this.go('walk');
        }
        break;
      default:
        break;
    }
    return o;
  }

  after(rest) {
    this.recoverFor = rest * this.pace;
    this.go('recover');
  }
}

export function makeBrain(type, rand, extra = {}) {
  if (type === 'imp') return new ImpBrain(rand);
  if (type === 'slime') return new SlimeBrain(rand, extra.size ?? 3);
  if (type === 'sentinel') return new SentinelBrain(rand);
  if (type === 'archer') return new ArcherBrain(rand);
  if (type === 'gorehorn') return new GorehornBrain(rand);
  if (type === 'jarl') return new JarlBrain(rand);
  throw new Error(`no brain for ${type}`);
}
