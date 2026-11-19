/**
 * Everything that moves in the keep: the hero, the foes (bodies driven by
 * brains.js), projectiles, the two summons and pickups. Movement collides
 * with the tile map; ice is slippery, deep snow slow and printed with feet.
 */
import { HEROES, ENEMIES, SLIME, Combo, attackPhase, dashInvulnerable, heavyDamage, inArc, resolveHit, knockback, hitStopFor, shakeFor, rechargePips, gainEnergy, ENERGY, drink, splitSlime, angleDiff } from './rules.js';
import { makeBrain } from './brains.js';
import { sampleMask } from './map.js';
import { heroPose, foePose, drawPuppet } from './puppet.js';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------ movement */

export function blocked(level, x, y, r) {
  return level.isSolid(x - r, y - r * 0.7) || level.isSolid(x + r, y - r * 0.7) || level.isSolid(x - r, y + r * 0.7) || level.isSolid(x + r, y + r * 0.7);
}

/** Move a body by (dx, dy) against the walls, in small steps; true if it hit something. */
export function moveBody(b, dx, dy, level) {
  let bumped = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.15));
  for (let i = 0; i < steps; i++) {
    const nx = b.x + dx / steps;
    if (!blocked(level, nx, b.y, b.r)) b.x = nx;
    else {
      bumped = true;
      b.vx = 0;
    }
    const ny = b.y + dy / steps;
    if (!blocked(level, b.x, ny, b.r)) b.y = ny;
    else {
      bumped = true;
      b.vy = 0;
    }
  }
  return bumped;
}

export const surface = (level, x, y) => ({
  snow: sampleMask(level.masks.snow, level.masks.mw, level.masks.mh, x, y),
  ice: sampleMask(level.masks.ice, level.masks.mw, level.masks.mh, x, y)
});

/* ------------------------------------------------------------ the hero */

export class Hero {
  constructor(kind, x, y) {
    this.kind = kind;
    this.def = HEROES[kind];
    this.x = x;
    this.y = y;
    this.z = 0;
    this.r = 0.3;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.energy = 40;
    this.pips = this.def.ranged.pips;
    this.pipT = 0;
    this.potions = 3;
    this.combo = new Combo(this.def.combo);
    this.anim = 'idle';
    this.t = 0;
    this.aim = -Math.PI / 2;
    this.phase = 0;
    this.run = 0;
    this.flash = 0;
    this.invuln = 0;
    this.dashCool = 0;
    this.chill = 0;
    this.held = 0;
    this.charge = 0;
    this.dead = false;
    this.hits = new Set();
    this.stepT = 0;
    this.foot = 1;
    this.ghosts = [];
    this.lastSmear = -1;
  }

  get view() {
    return Math.sin(this.aim) > 0.35 ? 'b' : 'f';
  }

  get flip() {
    return Math.cos(this.aim) < 0;
  }

  get untouchable() {
    return this.invuln > 0 || (this.anim === 'dash' && dashInvulnerable(this.def.dash, this.t)) || this.dead;
  }

  setAnim(a) {
    this.anim = a;
    this.t = 0;
    this.hits.clear();
  }

  /**
   * One step. `inp`: mx, my, aim, attack (pressed), attackHeld, attackUp,
   * ranged, dash, summon, potion, interact (all pressed-this-frame flags).
   */
  update(dt, inp, game) {
    const D = this.def;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCool = Math.max(0, this.dashCool - dt);
    this.chill = Math.max(0, this.chill - dt);
    ({ pips: this.pips, timer: this.pipT } = rechargePips({ pips: this.pips, timer: this.pipT }, dt, D.ranged));
    this.energy = gainEnergy(this.energy, D.energy, ENERGY.perSecond * dt);
    if (this.dead) {
      this.vx *= Math.exp(-6 * dt);
      this.vy *= Math.exp(-6 * dt);
      moveBody(this, this.vx * dt, this.vy * dt, game.level);
      return;
    }
    if (inp.aim !== null && inp.aim !== undefined && !['dash', 'heavy'].includes(this.anim) && !(this.anim === 'attack' && this.t > 0.04)) this.aim = inp.aim;
    const sf = surface(game.level, this.x, this.y);
    const onIce = sf.ice > 0.5;
    // ---- actions that can start now
    const free = this.anim === 'idle' || this.anim === 'run';
    const cancellable = free || (this.anim === 'attack' && this.t > this.def.combo[this.combo.index]?.hit + 0.08) || this.anim === 'throw' && this.t > 0.18;
    if (inp.dash && this.dashCool <= 0 && (cancellable || this.anim === 'charge')) {
      const mag = Math.hypot(inp.mx, inp.my);
      const a = mag > 0.2 ? Math.atan2(inp.my, inp.mx) : this.aim;
      this.dashDir = a;
      if (mag > 0.2) this.aim = a;
      this.combo.reset();
      this.setAnim('dash');
      this.dashCool = D.dash.cooldown + D.dash.dur;
      game.sound.play('dash');
      game.fx.puff(this.x, this.y, { n: 8, speed: 2.4 });
    } else if (inp.potion) {
      const r = drink(this, D.potion.heal, this.maxHp);
      if (r.drank) {
        this.hp = r.hp;
        this.potions = r.potions;
        game.sound.play('potion');
        game.fx.text(this.x, this.y, 1.2, `+${D.potion.heal}`, { color: '#7aff9a', size: 24 });
        for (let i = 0; i < 10; i++) game.fx.add('star', this.x + (game.fx.r() - 0.5) * 0.6, this.y, { z: 0.2 + game.fx.r(), vz: 1.5, life: 0.7, size: 0.25, color: [0.8, 2.2, 1.0], vr: 3 });
        if (free) this.setAnim('drink');
      } else game.toast(this.potions <= 0 ? 'No draughts left' : 'Already whole', 1);
    } else if (inp.summon && (cancellable || this.anim === 'drink')) {
      if (this.energy >= D.summon.cost) {
        this.energy -= D.summon.cost;
        this.combo.reset();
        this.setAnim('cast');
        game.summon(this);
      } else {
        game.toast(`${D.summon.name} needs ${D.summon.cost} spark — land blows to gather it`, 1.4);
        game.sound.play('deny');
      }
    } else if (inp.ranged && cancellable) {
      if (this.pips > 0) {
        this.pips--;
        this.combo.reset();
        this.setAnim('throw');
        this.thrown = false;
      } else game.sound.play('deny');
    } else if (inp.interact && free) {
      game.interact(this);
    }
    // ---- attack button: tap for the combo, hold for the charged blow
    if (inp.attackHeld) this.held += dt;
    if (inp.attack && (free || this.anim === 'attack')) {
      this.held = 0;
      const step = this.combo.press(this.anim === 'attack' ? this.t : 0);
      if (step >= 0) this.startStep(step, game);
    }
    if (this.anim === 'attack') {
      const step = this.combo.tick(this.t);
      if (step >= 0) this.startStep(step, game);
    }
    if (inp.attackHeld && this.held > 0.26 && (free || (this.anim === 'attack' && this.t > this.def.combo[this.combo.index]?.hit + 0.05))) {
      this.combo.reset();
      this.setAnim('charge');
      game.sound.play('charge');
    }
    // ---- state behaviour
    let speed = D.speed * (this.chill > 0 ? 0.62 : 1) * (sf.snow > 0.7 ? 0.9 : 1);
    let want = { x: inp.mx, y: inp.my };
    const wm = Math.hypot(want.x, want.y);
    if (wm > 1) want = { x: want.x / wm, y: want.y / wm };
    let control = onIce ? 1.6 : 14;
    switch (this.anim) {
      case 'idle':
      case 'run':
        this.anim = wm > 0.1 ? 'run' : 'idle';
        break;
      case 'attack': {
        const st = D.combo[this.combo.index];
        speed *= 0.18;
        if (st && this.t >= st.hit && !this.struck) {
          this.struck = true;
          game.heroStrike(this, { dmg: st.dmg, reach: st.reach, arc: st.arc, push: st.push, weight: st.weight, angle: this.aim, step: this.combo.index, shock: st.shock });
        }
        if (this.combo.index < 0 || (st && this.t > st.dur && !this.combo.buffered)) {
          if (this.t > (st?.dur ?? 0)) this.setAnim('idle');
        }
        break;
      }
      case 'charge':
        speed *= 0.35;
        this.charge = Math.min(1, this.t / D.heavy.chargeFull);
        if (this.t > D.heavy.chargeFull && !this.chargedFx) {
          this.chargedFx = true;
          game.fx.ring(this.x, this.y, { r0: 1.4, r1: 0.4, life: 0.25, color: [2.4, 1.4, 0.5] });
          game.sound.play('charged');
        }
        if (game.fx.r() < dt * 20) game.fx.embers(this.x + (game.fx.r() - 0.5) * 0.6, this.y, 0.3, { n: 1, life: 0.5 });
        if (!inp.attackHeld) {
          const dmg = heavyDamage(D.heavy, this.t);
          this.chargedFx = false;
          if (dmg > 0) {
            this.heavyDmg = dmg;
            this.setAnim('heavy');
            this.struck = false;
            if (D.heavy.lunge) {
              this.vx = Math.cos(this.aim) * D.heavy.lunge;
              this.vy = Math.sin(this.aim) * D.heavy.lunge;
            }
            game.sound.play('heavy');
          } else this.setAnim('idle');
          this.held = 0;
        }
        break;
      case 'heavy':
        speed = 0;
        control = 3;
        if (this.t >= D.heavy.hit && !this.struck) {
          this.struck = true;
          game.heroStrike(this, { dmg: this.heavyDmg, reach: D.heavy.reach, arc: D.heavy.arc, push: D.heavy.push, weight: 'heavy', angle: this.aim, guardBreak: true, heavy: true });
        }
        if (this.t > D.heavy.dur) this.setAnim('idle');
        break;
      case 'dash': {
        const k = this.t / D.dash.dur;
        const s = D.dash.speed * (1 - k * 0.55);
        this.vx = Math.cos(this.dashDir) * s;
        this.vy = Math.sin(this.dashDir) * s;
        speed = 0;
        control = 0;
        if (Math.floor(this.t / 0.04) !== Math.floor((this.t - dt) / 0.04)) this.ghosts.push({ x: this.x, y: this.y, life: 0.22, t: 0, pose: heroPose(this.kind, this.animState(game.time)), flip: this.flip, view: this.view });
        if (this.t > D.dash.dur) {
          this.setAnim('idle');
          if (!onIce) {
            this.vx *= 0.3;
            this.vy *= 0.3;
          }
        }
        break;
      }
      case 'throw':
        speed *= 0.4;
        if (this.t > 0.13 && !this.thrown) {
          this.thrown = true;
          game.heroThrow(this);
        }
        if (this.t > 0.32) this.setAnim('idle');
        break;
      case 'cast':
        speed *= 0.2;
        if (this.t > 0.8) this.setAnim('idle');
        break;
      case 'drink':
        if (this.t > 0.5) this.setAnim('idle');
        break;
      case 'hurt':
        speed *= 0.3;
        if (this.t > 0.28) this.setAnim('idle');
        break;
      default:
        break;
    }
    // ---- move
    if (control > 0) {
      const k = 1 - Math.exp(-control * dt);
      this.vx += (want.x * speed - this.vx) * k;
      this.vy += (want.y * speed - this.vy) * k;
    }
    if (this.lunge > 0) this.lunge = Math.max(0, this.lunge - dt);
    moveBody(this, this.vx * dt, this.vy * dt, game.level);
    const sp = Math.hypot(this.vx, this.vy);
    this.run = Math.min(1, sp / D.speed);
    this.phase += sp * dt * 2.6;
    // Footprints and crunching snow; a skid of snow on ice.
    this.stepT += sp * dt;
    if (this.stepT > 0.42 && this.anim !== 'dash') {
      this.stepT = 0;
      this.foot = -this.foot;
      const a = Math.atan2(this.vy, this.vx);
      if (sf.snow > 0.42) {
        game.fx.print(this.x + Math.cos(a + Math.PI / 2) * 0.1 * this.foot, this.y + Math.sin(a + Math.PI / 2) * 0.1 * this.foot, a - Math.PI / 2);
        game.fx.puff(this.x, this.y, { n: 2, speed: 0.8, size: 0.2 });
        game.sound.play('step-snow');
      } else if (!onIce) game.sound.play('step');
    }
    // Sliding on ice: scratches behind you and a spray of shavings.
    const want2 = Math.hypot(want.x, want.y) * speed;
    if (onIce && sp > 1.6) {
      this.skidT = (this.skidT ?? 0) + dt;
      if (this.skidT > 0.045) {
        this.skidT = 0;
        game.fx.skid(this.x, this.y - 0.02, Math.atan2(this.vy, this.vx));
      }
      if (game.fx.r() < dt * (sp > want2 + 1 ? 40 : 12)) game.fx.frost(this.x, this.y, 0.05, { n: 1, speed: 1.5 });
      if (sp > want2 + 1.5 && game.fx.r() < dt * 20) game.fx.puff(this.x, this.y, { n: 1, speed: 0.8, size: 0.18, color: [0.9, 0.97, 1.08] });
    }
    for (const g of this.ghosts) g.t += dt;
    this.ghosts = this.ghosts.filter((g) => g.t < g.life);
  }

  startStep(i, game) {
    const st = this.def.combo[i];
    this.setAnim('attack');
    this.struck = false;
    this.vx += Math.cos(this.aim) * st.lunge;
    this.vy += Math.sin(this.aim) * st.lunge;
    game.sound.play(i === 2 ? 'swing-heavy' : 'swing');
  }

  hurt(hit, game) {
    if (this.untouchable) return false;
    this.hp = Math.max(0, this.hp - hit.dmg);
    this.flash = 1;
    this.invuln = 0.55;
    const kb = knockback(hit.push ?? 3, 1.4);
    this.vx = Math.cos(hit.angle) * kb;
    this.vy = Math.sin(hit.angle) * kb;
    if (hit.chill) this.chill = hit.chill;
    this.combo.reset();
    game.fx.text(this.x, this.y, 1.2, hit.dmg, { color: '#ff5a4a', size: 28 });
    game.fx.sparks(this.x, this.y, 0.6, { n: 8, angle: hit.angle, color: [2.2, 0.5, 0.4] });
    game.hitStop(0.06);
    game.shake(game.reduced ? 0 : 0.14);
    game.hurtPulse = 1;
    game.sound.play('hurt');
    if (this.hp <= 0) {
      this.dead = true;
      this.setAnim('dead');
      game.heroDied();
    } else if (!['dash', 'heavy'].includes(this.anim)) this.setAnim('hurt');
    return true;
  }

  animState(time) {
    const st = this.def.combo[this.combo.index];
    return { anim: this.anim === 'run' ? 'idle' : this.anim, t: this.t, step: this.combo.index, dur: this.def.dash.dur, run: this.run, phase: this.phase, charge: this.charge, time };
  }

  draw(stage, atlas, time) {
    const state = this.animState(time);
    let flip = this.flip;
    if (this.anim === 'heavy' && this.kind === 'warden') flip = Math.floor(this.t * 18) % 2 === 0;
    const pose = heroPose(this.kind, state);
    const chill = this.chill > 0 ? [0.75, 0.88, 1.25] : [1, 1, 1];
    const blink = this.invuln > 0 && this.anim !== 'dash' ? (Math.floor(time * 20) % 2 ? 0.45 : 1) : 1;
    drawPuppet(stage.sprites, atlas, this.kind, pose, { x: this.x, y: this.y, z: this.z, flip, view: this.view, flash: this.flash, tint: chill, alpha: blink, glow: this.anim === 'charge' ? this.charge * 0.25 * (0.6 + 0.4 * Math.sin(time * 30)) : 0 });
    for (const g of this.ghosts) {
      const k = g.t / g.life;
      drawPuppet(stage.sprites, atlas, this.kind, g.pose, { x: g.x, y: g.y, flip: g.flip, view: g.view, tint: [0.6, 0.8, 1.6], alpha: 0.35 * (1 - k), glow: 0.5 * (1 - k), key: g.y + 0.01 });
    }
  }
}

/* ------------------------------------------------------------ foes */

let SEED = 1;

export class Enemy {
  constructor(type, x, y, rand, extra = {}) {
    this.type = type;
    this.def = ENEMIES[type];
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = extra.size ?? 3;
    this.r = type === 'slime' ? SLIME[this.size].radius : this.def.radius;
    this.hp = type === 'slime' ? SLIME[this.size].hp : this.def.hp;
    this.maxHp = this.hp;
    this.mass = type === 'slime' ? 0.5 + this.size * 0.4 : this.def.mass;
    this.brain = makeBrain(type, rand, { size: this.size });
    this.face = -Math.PI / 2;
    this.flash = 0;
    this.hurtT = 0;
    this.dead = false;
    this.deadT = 0;
    this.seed = SEED++ * 1.7;
    this.phase = 0;
    this.run = 0;
    this.out = null;
    this.room = extra.room ?? null;
    this.contactCool = 0;
    this.home = { x, y };
  }

  get flip() {
    return Math.cos(this.face) < 0;
  }

  get guarding() {
    return this.type === 'sentinel' && this.brain.guarding;
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt * 7);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.contactCool = Math.max(0, this.contactCool - dt);
    if (this.dead) {
      this.deadT += dt;
      this.vx *= Math.exp(-5 * dt);
      this.vy *= Math.exp(-5 * dt);
      moveBody(this, this.vx * dt, this.vy * dt, game.level);
      return;
    }
    const hero = game.hero;
    const target = hero.dead ? { x: this.home.x, y: this.home.y - 30 } : hero;
    const sees = !hero.dead && game.level.sees(this.x, this.y + 0.3, hero.x, hero.y + 0.3);
    const self = { x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp, bumped: this.bumped };
    const o = this.brain.update(dt, { self, target, sees, now: game.time });
    this.out = o;
    this.bumped = false;
    if (o.face !== null && o.face !== undefined) this.face = o.face;
    if (this.type === 'slime') this.look = Math.atan2(target.y - this.y, target.x - this.x);
    // telegraphs on the floor
    if (o.tele) game.telegraph(this, o.tele);
    // the body
    let speed = this.def.speed;
    let control = 10;
    const st = this.brain.state;
    if (this.type === 'slime') {
      speed = 0;
      control = 4;
      if (st === 'air' && this.leap) {
        const k = Math.min(1, this.brain.t / this.leap.time);
        this.z = Math.sin(k * Math.PI) * (0.5 + this.size * 0.15);
        this.vx = this.leap.vx;
        this.vy = this.leap.vy;
        control = 0;
      } else this.z = 0;
    } else if (this.type === 'gorehorn' && st === 'charge') {
      speed = this.charge?.speed ?? 13;
      control = 30;
    } else if (this.type === 'gorehorn' && st === 'skid') {
      speed = 0;
      control = 2.5;
    } else if (this.type === 'jarl') {
      speed = this.brain.phase === 3 ? 2.6 : 1.9;
      if (st === 'leap' && o.air > 0 && this.leapFrom) {
        const k = o.air;
        const spot = this.brain.spot;
        this.x = this.leapFrom.x + (spot.x - this.leapFrom.x) * k;
        this.y = this.leapFrom.y + (spot.y - this.leapFrom.y) * k;
        this.z = Math.sin(k * Math.PI) * 4;
        speed = 0;
        control = 0;
        this.vx = 0;
        this.vy = 0;
      } else this.z = 0;
    }
    if (control > 0) {
      const ice = surface(game.level, this.x, this.y).ice > 0.5;
      const k = 1 - Math.exp(-(ice ? Math.min(control, 2) : control) * dt);
      this.vx += (o.move.x * speed - this.vx) * k;
      this.vy += (o.move.y * speed - this.vy) * k;
    }
    if (this.hurtT > 0 && this.type !== 'jarl') {
      // knockback carries
    }
    const bumped = moveBody(this, this.vx * dt, this.vy * dt, game.level);
    if (bumped) this.bumped = true;
    const sp = Math.hypot(this.vx, this.vy);
    this.run = Math.min(1, sp / Math.max(1, this.def.speed || 3));
    this.phase += sp * dt * (this.type === 'gorehorn' ? 2.2 : 3);
    // acts
    if (o.act) this.act(o.act, game);
    for (const ev of o.events) game.enemyEvent(this, ev);
    // contact damage
    if (o.contact && this.contactCool <= 0 && !hero.dead) {
      const d = Math.hypot(hero.x - this.x, hero.y - this.y);
      if (d < this.r + hero.r + 0.1 && (this.z < 0.6 || this.type === 'gorehorn')) {
        const dmg = this.type === 'slime' ? SLIME[this.size].contact : this.charge?.dmg ?? this.def.contact;
        const a = Math.atan2(hero.y - this.y, hero.x - this.x);
        if (hero.hurt({ dmg, angle: a, push: this.type === 'gorehorn' ? 12 : 4 }, game)) this.contactCool = 0.8;
      }
    }
    if (this.type === 'gorehorn' && st === 'charge' && game.fx.r() < dt * 30) game.fx.puff(this.x - Math.cos(this.face) * 0.5, this.y, { n: 1, speed: 1.5, size: 0.35 });
    if (this.type === 'gorehorn' && st === 'paw' && game.fx.r() < dt * 14) game.fx.puff(this.x + Math.cos(this.face) * 0.4, this.y, { n: 1, speed: 2, size: 0.25 });
    if (this.type === 'imp' && game.fx.r() < dt * 6) game.fx.embers(this.x, this.y, 0.7, { n: 1, life: 0.6, speed: 0.6 });
    if (o.breath) game.jarlBreath(this, o.breath, dt);
  }

  act(a, game) {
    this.lastAct = a.kind;
    const hero = game.hero;
    if (a.kind === 'ember') {
      game.sound.play('imp-throw');
      game.spawnProjectile({ kind: 'ember', team: 'foe', x: this.x + Math.cos(a.angle) * 0.3, y: this.y, z: 0.75, angle: a.angle, speed: a.speed, dmg: a.dmg, r: 0.18, life: 1.6, fire: true });
    } else if (a.kind === 'arrow') {
      game.sound.play('arrow');
      game.spawnProjectile({ kind: 'arrow', team: 'foe', x: this.x + Math.cos(a.angle) * 0.4, y: this.y, z: 0.6, angle: a.angle, speed: a.speed, dmg: a.dmg, r: 0.14, life: 1.4, chill: a.chill, frost: true });
    } else if (a.kind === 'shards') {
      game.sound.play('shards');
      for (let i = 0; i < a.count; i++) {
        const ang = a.angle + (i / (a.count - 1) - 0.5) * a.spread;
        game.spawnProjectile({ kind: 'shard', team: 'foe', x: this.x + Math.cos(ang) * 1.2, y: this.y, z: 1.2, angle: ang, speed: a.speed, dmg: a.dmg, r: 0.2, life: 1.2, frost: true });
      }
    } else if (a.kind === 'melee' || a.kind === 'bash') {
      game.sound.play(this.type === 'jarl' ? 'swing-heavy' : 'swing-foe');
      if (a.lunge) {
        this.vx = Math.cos(a.angle) * a.lunge;
        this.vy = Math.sin(a.angle) * a.lunge;
      }
      const reachX = this.x;
      const reachY = this.y;
      game.fx.smear(this.x, this.y, this.type === 'jarl' ? 1.6 : 0.6, a.angle, { frame: this.type === 'jarl' ? 1 : 0, dir: 1, size: a.reach, color: this.type === 'imp' ? [2, 0.9, 0.4] : [1.2, 1.3, 1.6], glow: [0.4, 0.5, 0.9], life: 0.18 });
      for (const t of [hero, ...game.summons]) {
        if (t.dead || t.gone) continue;
        if (inArc(reachX, reachY, a.angle, a.reach, a.arc, t.x, t.y, t.r ?? 0.3)) {
          if (t === hero) hero.hurt({ dmg: a.dmg, angle: a.angle, push: a.push }, game);
          else t.life = Math.min(t.life, 0.2);
        }
      }
    } else if (a.kind === 'leap' && this.type === 'slime') {
      // a slime hops: cover the distance in the air time
      const d = a.dist;
      this.leap = { vx: (Math.cos(a.angle) * d) / a.time, vy: (Math.sin(a.angle) * d) / a.time, time: a.time };
      game.sound.play('slime-hop', { size: this.size });
    } else if (a.kind === 'charge') {
      this.charge = { speed: a.speed, dmg: a.dmg };
      this.vx = Math.cos(a.angle) * a.speed;
      this.vy = Math.sin(a.angle) * a.speed;
      game.sound.play('roar-small');
    } else if (a.kind === 'slam') {
      game.slam(this, a);
    }
    if (this.type === 'jarl' && a.kind === 'leap') this.leapFrom = { x: this.x, y: this.y };
  }

  /** A blow lands. Returns the resolved hit (for numbers and sounds). */
  hurt(hit, game) {
    if (this.dead) return null;
    const res = resolveHit(hit, { guarding: this.guarding, guard: this.brain.guard, facing: this.face, broken: this.brain.broken ?? 0, stunned: this.brain.state === 'stunned' ? 1 : 0 });
    if (this.type === 'sentinel') {
      this.brain.guard = res.guard;
      if (res.broke) this.brain.breakGuard();
    }
    this.hp -= res.damage;
    this.flash = res.blocked ? 0.4 : 1;
    if (!res.blocked) {
      this.hurtT = 0.25;
      const kb = knockback(hit.push ?? 3, this.mass);
      if (this.type !== 'jarl' && !(this.type === 'gorehorn' && this.brain.state === 'charge')) {
        this.vx += Math.cos(hit.angle) * kb;
        this.vy += Math.sin(hit.angle) * kb;
      }
      this.brain.hurt(res.damage, { stagger: hit.weight === 'heavy' ? 0.4 : 0.2 });
    } else {
      this.vx += Math.cos(hit.angle) * 2;
      this.vy += Math.sin(hit.angle) * 2;
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.brain.die();
      this.killAngle = hit.angle;
    }
    return res;
  }

  draw(stage, atlas, time) {
    const pose = foePose(this.type, this, time);
    const scale = this.type === 'slime' ? [0, 0.55, 0.8, 1.15][this.size] : 1;
    const alpha = this.dead ? Math.max(0, 1 - Math.max(0, this.deadT - 0.35) / 0.45) : 1;
    let tint = [1, 1, 1];
    if (this.type === 'sentinel' && this.brain.state === 'broken') tint = [1.2, 1.05, 0.9];
    const view = 'f';
    const glow = this.type === 'jarl' && this.brain.state === 'roar' ? 0.25 : 0;
    drawPuppet(stage.sprites, atlas, this.type, pose, { x: this.x, y: this.y, z: this.z, flip: this.flip, view, flash: this.flash, alpha, scale, tint, glow });
  }
}

/* ------------------------------------------------------------ projectiles */

export class Projectile {
  constructor(o) {
    Object.assign(this, o);
    this.vx = Math.cos(o.angle) * o.speed;
    this.vy = Math.sin(o.angle) * o.speed;
    this.t = 0;
    this.hit = new Set();
    this.spin = 0;
  }

  update(dt, game) {
    this.t += dt;
    this.spin += dt * 22;
    const steps = Math.ceil((Math.hypot(this.vx, this.vy) * dt) / 0.2);
    for (let i = 0; i < steps && !this.gone; i++) {
      this.x += (this.vx * dt) / steps;
      this.y += (this.vy * dt) / steps;
      if (game.level.isSolid(this.x, this.y)) {
        game.projectileHitsWall(this);
        this.gone = true;
        break;
      }
      game.projectileTouch(this);
    }
    if (this.t > this.life) {
      this.gone = true;
      if (this.kind === 'axe' || this.kind === 'lance') game.fx.embers(this.x, this.y, this.z, { n: 4 });
    }
    // trails
    if (this.kind === 'ember' || this.kind === 'axe') game.fx.embers(this.x, this.y, this.z, { n: 1, life: 0.4, speed: 0.6, size: this.kind === 'axe' ? 0.08 : 0.06 });
    if (this.kind === 'lance' && game.fx.r() < 0.7) game.fx.add('ember', this.x, this.y, { z: this.z, life: 0.25, size: 0.09, size1: 0.01, color: [2.4, 1.8, 0.8] });
    if (this.frost && game.fx.r() < 0.5) game.fx.frost(this.x, this.y, this.z, { n: 1, speed: 0.6, life: 0.4 });
  }

  draw(stage, atlas) {
    const a = Math.atan2(this.vy, this.vx);
    if (this.kind === 'ember') {
      stage.fxAdd.push(atlas.get('proj/ember'), this.x, this.y + this.z, { w: 0.55, h: 0.55, color: [2.6, 1.5, 0.6] });
      stage.fxAdd.push(atlas.get('fx/glow'), this.x, this.y + this.z, { w: 1.1, h: 1.1, color: [1.2, 0.5, 0.15], alpha: 0.6 });
    } else if (this.kind === 'arrow') stage.fxMix.push(atlas.get('proj/arrow'), this.x, this.y + this.z, { rot: a, color: [1.3, 1.4, 1.7] });
    else if (this.kind === 'shard') stage.fxMix.push(atlas.get('proj/shard'), this.x, this.y + this.z, { rot: a, w: 1.0, h: 0.38, color: [1.3, 1.4, 1.8] });
    else if (this.kind === 'axe') {
      stage.fxMix.push(atlas.get('proj/axe'), this.x, this.y + this.z, { rot: -this.spin * Math.sign(this.vx || 1), color: [1.4, 1.3, 1.2] });
      stage.fxAdd.push(atlas.get('fx/glow'), this.x, this.y + this.z, { w: 1.0, h: 1.0, color: [1.0, 0.45, 0.12], alpha: 0.7 });
    } else if (this.kind === 'lance') {
      stage.fxAdd.push(atlas.get('proj/lance'), this.x, this.y + this.z, { rot: a, w: 1.6, h: 0.36, color: [2.4, 1.9, 1.0] });
      stage.fxAdd.push(atlas.get('fx/glow'), this.x, this.y + this.z, { w: 1.0, h: 1.0, color: [1.0, 0.7, 0.3], alpha: 0.6 });
    }
  }
}

/* ------------------------------------------------------------ summons */

export class Summon {
  constructor(kind, hero) {
    this.kind = kind;
    this.x = hero.x + Math.cos(hero.aim) * 0.8;
    this.y = hero.y + Math.sin(hero.aim) * 0.8;
    this.z = kind === 'moth' ? 1.3 : 0;
    this.vx = 0;
    this.vy = 0;
    this.r = 0.35;
    this.life = hero.def.summon.dur;
    this.max = this.life;
    this.cool = 0.3;
    this.t = 0;
    this.face = hero.aim;
    this.orbit = 0;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    this.cool = Math.max(0, this.cool - dt);
    const foes = game.enemies.filter((e) => !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 11);
    let best = null;
    let bd = 1e9;
    for (const e of foes) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (this.kind === 'hound') {
      let tx = game.hero.x - 0.8;
      let ty = game.hero.y - 0.4;
      if (best) {
        tx = best.x;
        ty = best.y;
      }
      const a = Math.atan2(ty - this.y, tx - this.x);
      const d = Math.hypot(tx - this.x, ty - this.y);
      const sp = d > 0.9 ? 8.5 : 0;
      this.vx += (Math.cos(a) * sp - this.vx) * Math.min(1, dt * 8);
      this.vy += (Math.sin(a) * sp - this.vy) * Math.min(1, dt * 8);
      if (Math.abs(this.vx) > 0.3) this.face = this.vx;
      moveBody(this, this.vx * dt, this.vy * dt, game.level);
      if (best && bd < 1.1 && this.cool <= 0) {
        this.cool = 0.5;
        this.lunge = 0.15;
        game.summonHit(this, best, 9, a);
      }
      if (game.fx.r() < dt * 40) game.fx.embers(this.x + (game.fx.r() - 0.5) * 0.6, this.y, 0.3 + game.fx.r() * 0.4, { n: 1, life: 0.5, speed: 0.8, size: 0.08 });
    } else {
      // the moth circles you and stings what comes near
      this.orbit += dt * 2.2;
      const hx = game.hero.x + Math.cos(this.orbit) * 1.5;
      const hy = game.hero.y + Math.sin(this.orbit) * 1.0;
      this.x += (hx - this.x) * Math.min(1, dt * 5);
      this.y += (hy - this.y) * Math.min(1, dt * 5);
      this.z = 1.3 + Math.sin(this.t * 4) * 0.15;
      if (best && bd < 5 && this.cool <= 0) {
        this.cool = 0.42;
        game.summonZap(this, best);
      }
      if (game.fx.r() < dt * 25) game.fx.add('ember', this.x + (game.fx.r() - 0.5) * 0.5, this.y, { z: this.z - 0.1, vz: -0.4, life: 0.8, size: 0.06, size1: 0.01, color: [2.4, 1.8, 0.7], grav: 0.4 });
    }
    if (this.life <= 0) {
      this.gone = true;
      game.fx.embers(this.x, this.y, this.z + 0.3, { n: 14, speed: 2 });
      game.fx.flash(this.x, this.y, { h: 1, r: 4, i: 2, life: 0.4 });
    }
  }

  get light() {
    const fade = Math.min(1, this.life / 0.8) * Math.min(1, this.t / 0.3);
    return this.kind === 'moth' ? { x: this.x, y: this.y, h: this.z + 0.5, r: 8.5, c: [1, 0.72, 0.35], i: 2.6 * fade, shadow: true } : { x: this.x, y: this.y, h: 0.9, r: 5.5, c: [1, 0.5, 0.18], i: 2.2 * fade, shadow: true };
  }

  draw(stage, atlas, time) {
    const fade = Math.min(1, this.life / 0.8) * Math.min(1, this.t / 0.25);
    if (this.kind === 'hound') {
      const f = atlas.get('summon/hound');
      const bob = Math.abs(Math.sin(time * 14)) * 0.08;
      stage.fxAdd.push(atlas.get('fx/glow'), this.x, this.y + 0.4, { w: 2.2, h: 1.6, color: [1.0, 0.4, 0.1], alpha: 0.5 * fade });
      stage.fxMix.push(f, this.x, this.y + 0.05 + bob, { ox: f.ox / f.w, oy: f.oy / f.h, flip: this.face < 0, color: [1.6, 1.3, 1.1], alpha: 0.95 * fade });
      stage.fxAdd.push(f, this.x, this.y + 0.05 + bob, { ox: f.ox / f.w, oy: f.oy / f.h, flip: this.face < 0, color: [0.8, 0.4, 0.1], alpha: 0.6 * fade });
    } else {
      const f = atlas.get(`summon/moth-${Math.floor(time * 16) % 2}`);
      stage.fxAdd.push(atlas.get('fx/glow'), this.x, this.y + this.z, { w: 2.8, h: 2.8, color: [1.1, 0.7, 0.25], alpha: 0.5 * fade });
      stage.fxMix.push(f, this.x, this.y + this.z, { w: f.w * 1.4, h: f.h * 1.4, color: [1.4, 1.25, 1.05], alpha: fade });
      stage.fxAdd.push(f, this.x, this.y + this.z, { w: f.w * 1.4, h: f.h * 1.4, color: [0.6, 0.4, 0.12], alpha: 0.5 * fade });
    }
  }
}

/* ------------------------------------------------------------ pickups */

export class Pickup {
  constructor(kind, x, y, rand) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    const a = rand() * TAU;
    const s = 1 + rand() * 2.5;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s * 0.7;
    this.z = 0.2;
    this.vz = 3 + rand() * 2;
    this.t = 0;
    this.r = 0.15;
  }

  update(dt, game) {
    this.t += dt;
    const h = game.hero;
    const d = Math.hypot(h.x - this.x, h.y - this.y);
    if (this.t > 0.45 && d < 2.6 && !h.dead) {
      const a = Math.atan2(h.y - this.y, h.x - this.x);
      const pull = 14 * (1 - d / 2.8);
      this.vx += Math.cos(a) * pull * dt * 4;
      this.vy += Math.sin(a) * pull * dt * 4;
    } else {
      this.vx *= Math.exp(-3 * dt);
      this.vy *= Math.exp(-3 * dt);
    }
    this.vz -= 14 * dt;
    this.z += this.vz * dt;
    if (this.z < 0) {
      this.z = 0;
      this.vz = Math.abs(this.vz) > 1.2 ? -this.vz * 0.4 : 0;
    }
    moveBody(this, this.vx * dt, this.vy * dt, game.level);
    if (this.t > 0.3 && d < 0.5 && !h.dead) {
      this.gone = true;
      game.collect(this);
    }
  }

  draw(stage, atlas, time) {
    const name = this.kind === 'gem' ? 'pickup/gem' : this.kind === 'orb' ? 'pickup/orb' : 'pickup/potion';
    const bob = this.z + (this.vz === 0 ? 0.06 + Math.sin(time * 4 + this.x) * 0.05 : 0);
    stage.sprites.push(atlas.get(name), this.x, this.y, { z: bob, rot: this.kind === 'gem' ? Math.sin(time * 3 + this.x) * 0.2 : 0, glow: 0.3 + 0.2 * Math.sin(time * 6 + this.y) });
  }
}
