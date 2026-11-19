/**
 * The hunter's side of the fight. A greatblade — a three-swing combo on the
 * left button, a heavy overhead on the right, held to charge through three
 * levels — that dulls as it bites and is honed back with a whetstone; a bow
 * — quick shots, or held to draw through three charge levels, aimed at the
 * mouse pointer (Lanternwood's aim maths) — arrows that fly and stick; a
 * dodge roll with a moment of invulnerability; sheathing; healing with no
 * cooldown. Blows land with hit-stop, sparks, a crescent of light, a number,
 * a shake; the monster's parts take damage and break. The monster's blows
 * knock the hunter down, its roar makes them cover their ears.
 */
import * as THREE from 'three';
import { WEAPONS, HUNTER, SHARP_MAX, sharpnessLevel, wearBlade, blowDamage, damagePart, GNARLHORN, MONSTER_ATTACKS, hurtHunter, staminaStep, canPay, ITEMS, takeItem, count } from './rules.js';
import { snapToFoe, headingTo } from '../hd2d/aim.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DODGE = { time: 0.6, speed: 7.2, iFrom: 0.04, iTo: 0.42 };

export class HuntCombat {
  /** `g`: the game (hunter, kit, monster, wildlife, vfx, sfx, sound, hud, follow, camera, bag). */
  constructor(g) {
    this.g = g;
    this.hp = HUNTER.hp;
    this.hpMax = HUNTER.hp;
    this.lag = HUNTER.hp;
    this.st = HUNTER.stamina;
    this.stMax = HUNTER.stamina;
    this.sharp = SHARP_MAX;
    this.state = 'free';
    this.t = 0;
    this.move = null;
    this.queued = null;
    this.charge = 0;
    this.chargeLv = 0;
    this.held = { LMB: false, RMB: false };
    this.heal = 0;
    this.iframe = 0;
    this.stop = 0;
    this.shake = 0;
    this.arrows = [];
    this.aim = null;
    this.aiming = false;
    this.dead = false;
    this.downT = 0;
  }

  get weapon() {
    return this.g.kit.weapon;
  }

  get W() {
    return WEAPONS[this.weapon];
  }

  get busy() {
    return this.state !== 'free';
  }

  vitals() {
    return { hp: this.hp, hpMax: this.hpMax, lag: this.lag, st: this.st, stMax: this.stMax };
  }

  /* ------------------------------------------------------------ input */

  press(btn) {
    const g = this.g;
    if (this.dead || g.riding) return;
    this.held[btn] = true;
    if (btn === 'Space') return this.dodge();
    if (this.state === 'down' || this.state === 'cower' || this.state === 'gather') return;
    if (this.weapon === 'greatblade') {
      if (btn === 'LMB') this._queue('light');
      if (btn === 'RMB') {
        if (this.state === 'free' || (this.state === 'attack' && this._late())) this._beginCharge();
        else this.queued = 'heavy';
      }
    } else {
      if (btn === 'LMB') this._beginDraw();
      if (btn === 'RMB') this.aiming = true;
    }
  }

  release(btn) {
    this.held[btn] = false;
    if (this.weapon === 'greatblade' && btn === 'RMB' && this.state === 'charge') this._releaseCharge();
    if (this.weapon === 'bow') {
      if (btn === 'LMB' && this.state === 'draw') this._loose();
      if (btn === 'RMB') this.aiming = false;
    }
  }

  setAim(p) {
    this.aim = p;
  }

  _late() {
    return this.move && this.t > this.move.time * 0.55;
  }

  _queue(kind) {
    if (this.state === 'free') return this._swing(kind === 'light' ? 'light1' : 'heavy');
    if (this.state === 'attack') this.queued = kind;
  }

  _draw() {
    const k = this.g.kit;
    if (k.sheathed) {
      k.sheathe(false);
      this.g.sfx.raise?.();
    }
  }

  /** Face the pointer (snapped to a foe near it), or keep the heading. */
  _faceAim(maxSnap = 1.8) {
    const h = this.g.hunter;
    const foes = this.g.targets();
    let to = this.aim;
    if (to) {
      const f = snapToFoe(to, foes, maxSnap);
      if (f) to = { x: f.x, z: f.z };
      if (Math.hypot(to.x - h.pos.x, to.z - h.pos.z) > 0.5) h.yaw = headingTo({ x: h.pos.x, z: h.pos.z }, to);
    }
  }

  _swing(id, chargeLv = 0) {
    const W = this.W;
    const m = W.moves[id];
    if (!m) return;
    this._draw();
    this._faceAim();
    this.state = 'attack';
    this.move = { ...m, id, chargeLv, struck: false };
    this.t = 0;
    this.queued = null;
    const a = this.g.kit.actor;
    a.act(m.clip, { loop: false, fade: 0.08, speed: m.speed * (m.clip === 'Overhead' ? 1.15 : 1), upper: false });
    this.g.sfx.swing(id === 'light3' || id === 'heavy' || id === 'charged' ? 1.4 : 1);
    // A small step into the blow.
    const h = this.g.hunter;
    h.force = { vx: Math.sin(h.yaw) * 2.2, vz: Math.cos(h.yaw) * 2.2, t: 0.18, yaw: h.yaw };
  }

  _beginCharge() {
    this._draw();
    this._faceAim();
    this.state = 'charge';
    this.charge = 0;
    this.chargeLv = 0;
    this.g.kit.actor.act('PowerUp', { loop: true, fade: 0.12, speed: 0.8 });
  }

  _releaseCharge() {
    const lv = this.chargeLv;
    if (lv === 0) return this._swing('heavy');
    this._swing('charged', lv);
  }

  _beginDraw() {
    if (this.state !== 'free') return;
    this._draw();
    this.state = 'draw';
    this.charge = 0;
    this.chargeLv = 0;
    this.g.kit.actor.act('Draw', { loop: true, fade: 0.1, speed: 0.7, upper: true });
    this.g.sfx.draw?.();
  }

  _loose() {
    const lv = Math.max(0, this.chargeLv);
    const W = this.W;
    const m = W.moves[lv ? 'charged' : 'shot'];
    if (lv >= 2 && !canPay(this.st, W.chargeStamina)) this.chargeLv = 1;
    if (lv >= 2) this.st = Math.max(0, this.st - W.chargeStamina);
    this.state = 'attack';
    this.move = { ...m, id: 'shot', chargeLv: lv, struck: false, time: 0.42 };
    this.t = 0;
    this.g.kit.actor.act('Shoot', { loop: false, fade: 0.05, speed: 2.4, upper: true });
    this._shootArrow(lv);
  }

  dodge() {
    const g = this.g;
    if (this.state === 'down' || this.state === 'dodge' || this.dead) return;
    if (!canPay(this.st, HUNTER.dodgeCost)) return g.sfx.denied();
    if (this.state === 'attack' && this.t < (this.move?.time ?? 0) * 0.35) return;
    this.st = Math.max(0, this.st - HUNTER.dodgeCost);
    const h = g.hunter;
    const inp = g.lastInput ?? { x: 0, z: 0 };
    let yaw = h.yaw;
    if (Math.hypot(inp.x, inp.z) > 0.1) {
      const cy = g.follow.heading();
      const s = Math.sin(cy);
      const c = Math.cos(cy);
      yaw = Math.atan2(-inp.x * c + inp.z * s, inp.x * s + inp.z * c);
    }
    this.state = 'dodge';
    this.t = 0;
    this.move = null;
    h.force = { vx: Math.sin(yaw) * DODGE.speed, vz: Math.cos(yaw) * DODGE.speed, t: DODGE.time * 0.8, yaw };
    g.kit.actor.act('Roll', { loop: false, fade: 0.06, speed: 1.35 });
    g.sfx.roll?.();
  }

  /** An item from the bar: drink, hone, eat. No cooldown — only the bag's count. */
  use(id) {
    const g = this.g;
    if (this.dead || this.state === 'down' || g.riding && id === 'whetstone') return false;
    const it = ITEMS[id];
    if (!it?.use) return false;
    if (!takeItem(g.bag, id, 1)) {
      g.sfx.denied();
      return false;
    }
    g.hud?.flashItem(id);
    if (it.use.heal) {
      this.heal += this.hpMax * it.use.heal;
      this.healRate = (this.hpMax * it.use.heal) / it.use.over;
      g.sfx.potion();
      if (!g.riding) g.kit.actor.act('Drink', { loop: false, fade: 0.1, speed: 2.2, upper: true });
      g.vfx.burst(g.hunter.pos.clone().add(V(0, 1.2, 0)), 14, [0.6, 2.2, 0.8], { speed: 1.6, life: 0.8, size: 0.09, gravity: -1.5 });
    } else if (it.use.sharpen) {
      if (this.state !== 'free') {
        g.bag.push({ id, n: 1 });
        return false;
      }
      this.state = 'item';
      this.t = 0;
      this.itemT = 1.5;
      this.onItem = () => {
        this.sharp = SHARP_MAX;
        g.hud.log('whetstone', 1, 'Honed');
      };
      g.kit.actor.act('Sharpen', { loop: true, fade: 0.15, speed: 1.4 });
    } else if (it.use.stamina) {
      this.st = this.stMax;
      g.sfx.potion();
      if (!g.riding) g.kit.actor.act('Drink', { loop: false, fade: 0.1, speed: 2.2, upper: true });
    }
    return true;
  }

  /* ------------------------------------------------------------ hitting */

  /** A blow lands now: everything in reach and arc in front takes it. */
  _strike() {
    const g = this.g;
    const h = g.hunter;
    const m = this.move;
    const W = this.W;
    const fwd = V(Math.sin(h.yaw), 0, Math.cos(h.yaw));
    const centre = h.pos.clone().add(V(0, 1.0, 0)).addScaledVector(fwd, m.reach * 0.55);
    const chargeK = W.chargeMult[m.chargeLv] ?? 1;
    g.vfx.slash(h.pos.clone().add(V(0, 1.1, 0)).addScaledVector(fwd, 0.5), h.yaw, { radius: m.reach, arc: m.arc, tilt: m.id === 'light2' ? -0.6 : m.id.includes('light1') ? 0.3 : 1.2, color: m.chargeLv ? [3, 2.2, 1.0] : [2.4, 2.4, 2.2], life: 0.18 });
    let landed = false;
    // The monster: the part nearest the blade's sweep.
    const mon = g.monster;
    if (mon?.brain.alive) {
      const d = Math.hypot(mon.brain.x - h.pos.x, mon.brain.z - h.pos.z);
      if (d < m.reach + 9) {
        // Sample along the arc for the nearest part within reach.
        let best = null;
        for (let k = -2; k <= 2; k++) {
          const a = h.yaw + (k / 2) * (m.arc / 2);
          for (const reach of [m.reach * 0.6, m.reach]) {
            for (const y of [0.6, 1.4, 2.4]) {
              const p = h.pos.clone().add(V(Math.sin(a) * reach, y, Math.cos(a) * reach));
              const hit = mon.view.partAt(p, 0.6);
              if (hit && !hit.miss && (!best || hit.dist < best.dist)) best = { ...hit, p };
            }
          }
        }
        if (best) {
          landed = true;
          this._hitMonster(best.part, best.p, { attack: W.attack, mv: m.mv, charge: chargeK, kind: 'cut', heavy: m.chargeLv > 0 || m.id === 'light3' || m.id === 'heavy' });
        }
      }
    }
    // Small game.
    for (const t of g.wildlife?.targets ?? []) {
      const dx = t.x - h.pos.x;
      const dz = t.z - h.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > m.reach + t.r) continue;
      const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - h.yaw), Math.cos(Math.atan2(dx, dz) - h.yaw)));
      if (ang > m.arc / 2 + 0.3) continue;
      landed = true;
      const dmg = Math.round(W.attack * m.mv * chargeK * sharpnessLevel(this.sharp).mult);
      const p = V(t.x, g.world.colliders.height(t.x, t.z) + 0.6, t.z);
      g.vfx.hit(p, { dir: fwd, blood: [1.4, 0.2, 0.1] });
      g.sfx.impact('beast');
      g.hudNumber(p, dmg, '');
      if (g.wildlife.damage(t, dmg, { x: h.pos.x, z: h.pos.z })) g.onCritterDown(t);
    }
    if (landed) {
      this.stop = m.chargeLv ? 0.12 : m.id === 'light3' || m.id === 'heavy' ? 0.09 : 0.06;
      this._shake(m.chargeLv ? 0.55 : 0.3);
    }
    void centre;
  }

  /** Damage to the monster at a part: zone, sharpness, breaks, the look and sound of it. */
  _hitMonster(part, p, { attack, mv, charge = 1, kind = 'cut', heavy = false }) {
    const g = this.g;
    const mon = g.monster;
    const P = GNARLHORN.parts[part];
    let sharp = 1;
    let bounce = false;
    if (kind === 'cut') {
      const w = wearBlade(this.sharp, P.hard);
      sharp = sharpnessLevel(this.sharp).mult;
      this.sharp = w.points;
      bounce = w.bounce;
    }
    const { amount, crit } = blowDamage({ attack, mv, charge, sharp, zone: (kind === 'cut' ? P.cut : P.shot) * (bounce ? 0.4 : 1), crit: 0.08 });
    const fwd = p.clone().sub(g.hunter.pos).setY(0).normalize();
    if (bounce) {
      g.vfx.sparksAt(p, 22, [2.4, 2.0, 1.2], { dir: fwd.clone().negate(), speed: 9 });
      g.sfx.block();
      if (this.state === 'attack') {
        this.move.time = Math.min(this.move.time, this.t + 0.25);
        g.kit.actor.act('Hit', { loop: false, fade: 0.05, speed: 1.8, upper: true });
      }
    } else {
      g.vfx.hit(p, { dir: fwd, heavy, crit, blood: [1.2, 0.15, 0.08] });
      g.sfx.impact('beast', crit, heavy);
    }
    g.hudNumber(p, amount, crit ? 'crit' : bounce ? 'weak' : '');
    mon.view.hit();
    g.monsterHit(part, amount, p, { bounce });
  }

  /* ------------------------------------------------------------ arrows */

  _shootArrow(lv) {
    const g = this.g;
    const h = g.hunter;
    const from = h.pos.clone().add(V(0, 1.45, 0)).add(V(Math.sin(h.yaw), 0, Math.cos(h.yaw)).multiplyScalar(0.5));
    let to = this.aim ? V(this.aim.x, this.aim.y ?? from.y, this.aim.z) : from.clone().add(V(Math.sin(h.yaw) * 40, 0, Math.cos(h.yaw) * 40));
    const f = this.aim ? snapToFoe(this.aim, g.targets(), 2.2) : null;
    if (f) to = f.aimPoint ? f.aimPoint() : V(f.x, (f.y ?? g.world.colliders.height(f.x, f.z)) + 1, f.z);
    const dir = to.clone().sub(from).normalize();
    h.yaw = Math.atan2(dir.x, dir.z);
    const n = WEAPONS.bow.pierce[lv] ?? 1;
    const spreads = lv >= 3 ? [-0.06, 0, 0.06] : [0];
    for (const s of spreads) {
      const d = dir.clone().applyAxisAngle(V(0, 1, 0), s);
      const mesh = g.vfx.arrowMesh();
      mesh.position.copy(from);
      g.scene.add(mesh);
      this.arrows.push({ p: from.clone(), v: d.multiplyScalar(lv ? 78 : 64), life: 0, mesh, lv, pierce: n, hit: new Set() });
    }
    g.sfx.bow?.(lv ? 1.3 : 1);
  }

  _arrows(dt) {
    const g = this.g;
    const W = WEAPONS.bow;
    for (const a of this.arrows) {
      a.life += dt;
      const p0 = a.p.clone();
      a.v.y -= 6 * dt;
      a.p.addScaledVector(a.v, dt);
      a.mesh.position.copy(a.p);
      a.mesh.lookAt(a.p.clone().add(a.v));
      if (a.stuck) continue;
      // Along the step: the monster's parts, then small game, then the ground.
      const mon = g.monster;
      const steps = 4;
      for (let i = 1; i <= steps && !a.done; i++) {
        const q = p0.clone().lerp(a.p, i / steps);
        if (mon?.brain.alive && !a.hit.has('mon')) {
          const hit = mon.view.partAt(q, 0.2);
          if (hit && !hit.miss) {
            a.hit.add('mon');
            this._hitMonster(hit.part, q, { attack: W.attack, mv: W.moves.shot.mv, charge: W.chargeMult[a.lv], kind: 'shot', heavy: a.lv >= 2 });
            if (--a.pierce <= 0) a.done = true;
          }
        }
        for (const t of g.wildlife?.targets ?? []) {
          if (a.hit.has(t)) continue;
          if (Math.hypot(t.x - q.x, t.z - q.z) < t.r && q.y < g.world.colliders.height(t.x, t.z) + 1.6) {
            a.hit.add(t);
            const dmg = Math.round(W.attack * W.moves.shot.mv * W.chargeMult[a.lv] * 1.4);
            g.vfx.hit(q, { blood: [1.4, 0.2, 0.1] });
            g.hudNumber(q, dmg, '');
            if (g.wildlife.damage(t, dmg, { x: g.hunter.pos.x, z: g.hunter.pos.z })) g.onCritterDown(t);
            if (--a.pierce <= 0) a.done = true;
          }
        }
        if (q.y < g.world.colliders.height(q.x, q.z)) {
          a.stuck = true;
          a.v.set(0, 0, 0);
          a.p.copy(q);
          g.vfx.smokeAt(q, 2, [0.4, 0.35, 0.3], { size: 0.2, life: 0.5, speed: 0.4 });
        }
      }
      if (a.done) {
        a.life = 99;
      }
    }
    this.arrows = this.arrows.filter((a) => {
      const keep = a.life < (a.stuck ? 6 : 2.5);
      if (!keep) {
        a.mesh.removeFromParent();
      }
      return keep;
    });
  }

  /* ------------------------------------------------------------ being hit */

  /** The monster's blow reaches the hunter (already checked for range). */
  hit(attack, { enraged = false, from, damage = null } = {}) {
    const g = this.g;
    if (this.dead) return;
    if (this.iframe > 0 || (this.state === 'dodge' && this.t > DODGE.iFrom && this.t < DODGE.iTo)) {
      g.vfx.burst(g.hunter.pos.clone().add(V(0, 1, 0)), 10, [2, 2.4, 2.6], { speed: 3, life: 0.3, size: 0.1, gravity: 0 });
      return;
    }
    if (g.riding) g.dismount(true);
    if (attack === 'roar') {
      if (this.state === 'down') return;
      this.state = 'cower';
      this.t = 0;
      this.move = null;
      g.kit.actor.act('Cower', { loop: true, fade: 0.1, speed: 1.4 });
      return;
    }
    const A = MONSTER_ATTACKS[attack];
    const dmg = damage ?? hurtHunter(A, { enraged });
    this.hp = Math.max(0, this.hp - dmg);
    this.iframe = 0.6;
    g.hud.hurt(0.5 + dmg / 60);
    g.sfx.hurt();
    this._shake(0.6);
    const h = g.hunter;
    const away = from ? Math.atan2(h.pos.x - from.x, h.pos.z - from.z) : h.yaw + Math.PI;
    if (this.hp <= 0) return this._faint();
    if (A.knock && damage == null) {
      this.state = 'down';
      this.t = 0;
      this.move = null;
      h.force = { vx: Math.sin(away) * 9, vz: Math.cos(away) * 9, t: 0.45, yaw: away + Math.PI, still: true };
      g.kit.actor.act('Knock', { loop: false, fade: 0.05, speed: 1.2, clamp: true });
    } else {
      this.state = 'hurt';
      this.t = 0;
      this.move = null;
      h.force = { vx: Math.sin(away) * 3, vz: Math.cos(away) * 3, t: 0.2 };
      g.kit.actor.act('Hit', { loop: false, fade: 0.05, speed: 1.5 });
    }
    if (this.hp < this.hpMax * 0.35) g.bark('down');
  }

  _faint() {
    const g = this.g;
    this.dead = true;
    this.state = 'dead';
    this.t = 0;
    g.kit.actor.act('Die', { loop: false, fade: 0.1, clamp: true });
    g.hud.banner('You fainted', 'Your companions carry you back to camp', { secs: 4 });
    g.music?.calm();
    g.music?.cue('defeat');
  }

  _shake(k) {
    if (this.g.reducedMotion) k *= 0.3;
    this.shake = Math.max(this.shake, k);
  }

  /* ------------------------------------------------------------ the frame */

  /** Returns the world's dt (hit-stop slows it for a moment). */
  update(dt) {
    const g = this.g;
    const a = g.kit.actor;
    const h = g.hunter;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.iframe = Math.max(0, this.iframe - dt);
    let wdt = dt;
    if (this.stop > 0) {
      this.stop -= dt;
      wdt = dt * 0.05;
    }
    // Health: healing flows in; the red lag drains after.
    if (this.heal > 0) {
      const k = Math.min(this.heal, (this.healRate ?? 60) * dt);
      this.heal -= k;
      this.hp = Math.min(this.hpMax, this.hp + k);
    }
    this.lag = this.lag > this.hp ? Math.max(this.hp, this.lag - 40 * dt) : this.hp;
    const sprinting = !g.riding && g.lastInput?.sprint && h.speed > 5 && this.state === 'free';
    if (this.state === 'free' || this.state === 'draw' || sprinting) this.st = staminaStep(this.st, dt, { sprinting, max: this.stMax });
    if (this.st <= 1) h.speedCap = 4.6;
    else h.speedCap = 7.2;
    this.t += wdt;
    h.moveScale = 1;
    h.aimYaw = null;
    switch (this.state) {
      case 'attack': {
        const m = this.move;
        h.moveScale = this.weapon === 'bow' ? 0.6 : 0.08;
        if (!m.struck && this.t >= m.time * m.hit && this.weapon !== 'bow') {
          m.struck = true;
          this._strike();
        }
        // Chain: a press late in the move goes the moment it can.
        if (this.queued && this.t > m.time * 0.6 && this.weapon === 'greatblade') {
          const next = this.queued === 'heavy' ? 'heavy' : m.next;
          if (this.queued === 'heavy' && this.held.RMB) this._beginCharge();
          else this._swing(next);
          break;
        }
        if (this.t >= m.time) {
          this.state = 'free';
          this.move = null;
          a.rest(0.25);
        }
        break;
      }
      case 'charge': {
        h.moveScale = 0;
        this.charge += wdt;
        const lv = this.W.charge.reduce((acc, at, i) => (this.charge >= at ? i : acc), 0);
        if (lv > this.chargeLv) {
          this.chargeLv = lv;
          g.vfx.burst(h.pos.clone().add(V(0, 1.2, 0)), 10 + lv * 6, [2.6, 1.8 + lv * 0.2, 0.6], { speed: 2.5, life: 0.4, size: 0.12, gravity: 0 });
          g.sfx.charge?.();
        }
        this._faceAim();
        if (this.charge > this.W.charge[3] + 0.8) this._releaseCharge();
        break;
      }
      case 'draw': {
        h.moveScale = 0.45;
        this.charge += wdt;
        this.chargeLv = this.W.charge.reduce((acc, at, i) => (this.charge >= at ? i : acc), 0);
        if (this.aim) h.aimYaw = headingTo({ x: h.pos.x, z: h.pos.z }, this.aim);
        this.st = Math.max(0, this.st - (this.chargeLv >= 2 ? 6 : 0) * dt);
        break;
      }
      case 'dodge': {
        if (this.t > DODGE.time) {
          this.state = 'free';
          a.rest(0.2);
        }
        break;
      }
      case 'hurt': {
        h.moveScale = 0.2;
        if (this.t > 0.55) {
          this.state = 'free';
          a.rest(0.2);
        }
        break;
      }
      case 'down': {
        h.moveScale = 0;
        if (this.t > 1.1 && !this.gettingUp) {
          this.gettingUp = true;
          a.act('GetUp', { loop: false, fade: 0.15, speed: 1.6 });
          this.iframe = 1.0;
        }
        if (this.t > 2.0) {
          this.gettingUp = false;
          this.state = 'free';
          a.rest(0.2);
        }
        break;
      }
      case 'cower': {
        h.moveScale = 0;
        if (this.t > 1.5) {
          this.state = 'free';
          a.rest(0.2);
        }
        break;
      }
      case 'item': {
        h.moveScale = 0.15;
        if (this.t > this.itemT) {
          this.state = 'free';
          a.rest(0.2);
          this.onItem?.();
          this.onItem = null;
        }
        break;
      }
      case 'gather': {
        h.moveScale = 0;
        if (this.t > this.itemT) {
          this.state = 'free';
          a.rest(0.25);
          this.onItem?.();
          this.onItem = null;
        }
        break;
      }
      case 'dead': {
        h.moveScale = 0;
        if (this.t > 4.5) {
          this.dead = false;
          this.state = 'free';
          this.hp = this.hpMax;
          this.lag = this.hpMax;
          this.st = this.stMax;
          a.rest(0.1);
          g.backToCamp();
        }
        break;
      }
      default:
        break;
    }
    // Bow aiming: the body turns to the pointer while drawing or aiming.
    if (this.weapon === 'bow' && (this.aiming || this.state === 'draw') && this.aim && !g.riding) h.aimYaw = headingTo({ x: h.pos.x, z: h.pos.z }, this.aim);
    this._arrows(wdt);
    return wdt;
  }

  /** Start a timed action (gathering, carving): `clip` plays, `then` when it's done. */
  doing(clip, secs, then, speed = 1) {
    if (this.state !== 'free' || this.dead) return false;
    this.state = 'gather';
    this.t = 0;
    this.itemT = secs;
    this.onItem = then;
    this.g.kit.sheathe(true);
    this.g.kit.actor.act(clip, { loop: true, fade: 0.15, speed });
    return true;
  }

  dispose() {
    for (const a of this.arrows) a.mesh.removeFromParent();
  }
}

export { count };
