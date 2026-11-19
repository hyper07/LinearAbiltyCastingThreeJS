/**
 * The hero's side of a fight (adapted from Lanternwood's combat.js to a
 * third-person world): the six skills on each hero's bar — the knight's
 * three-swing combo, shield wall, bash, charge, whirlwind and leap; the
 * ranger's quick and charged shots, multishot, roll, arrow rain and blast
 * arrow; the mage's firebolt, chain lightning, frost nova, blink, meteor and
 * ward — aimed at the mouse pointer (snapped to a monster near it) even while
 * backing away; arrows, bolts and the meteor in flight; hit-stop, damage
 * numbers, screen shake, sounds; taking hits (block, ward, dodge); potions
 * (no cooldown); experience and levels; loot on the ground, chests,
 * gold; dying and waking at the village well; and the save.
 */
import * as THREE from 'three';
import { SKILLS, SKILL_BAR, BAR_KEYS, nextComboStage, chargeMult } from './skills.js';
import { heroStats, rollDamage, blockedDamage, Cooldowns, canUseSkill, addXp, xpForKill, xpToNext } from './rules.js';
import { BASES, POTIONS, RARITIES, gearTotals, rollLoot, addToBag, takePotion, countOf, glows } from './items.js';
import { snapToFoe, clampToRange, headingTo } from '../hd2d/aim.js';
import { CHESTS, CHEST_VANISH, openPlaced, openChest, rewardChest, chestGone } from './chests.js';
import { buildItem } from './gearModels.js';
import { gearMaterial } from './gearMaterials.js';
import { WELL } from './map.js';
import { tierOf } from './bestiary.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const HERO_R = 0.45;
/** Which method plays each kind of skill. */
const HANDLERS = { cone: '_bash', dash: '_dash', spin: '_spin', leap: '_leap', arrow: '_arrowSkill', fan: '_fan', roll: '_roll', rain: '_rain', bolt: '_bolt', chain: '_chain', nova: '_nova', blink: '_blink', meteor: '_meteor', ward: '_ward' };
void HERO_R;

export class Combat {
  /**
   * `game` gives: hero, actor, rig, monsters, vfx, sfx, hud, world, scene,
   * camera, profile, onSave(), reducedMotion.
   */
  constructor(game, profile) {
    this.g = game;
    this.profile = profile;
    this.cls = profile.cls;
    this.cd = new Cooldowns();
    this.t = 0;
    this.projectiles = [];
    this.zones = [];
    this.loot = [];
    this.chests = [];
    this.pending = [];
    this.held = new Set();
    this.busy = 0;
    this.combo = { stage: -1, at: -9, queued: false };
    this.aim = null;
    this.aimTarget = null;
    this.aimHold = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.iframes = 0;
    this.ward = 0;
    this.wardT = 0;
    this.blocking = false;
    this.drawT = -1;
    this.dead = false;
    this.deadT = 0;
    this.stun = 0;
    this.slowT = 0;
    this.dots = [];
    this.inCombat = 0;
    this.recalc(true);
    this._placeChests();
  }

  /* ------------------------------------------------------------ stats */

  /** Work the hero's numbers out again (after gear or a level changes). */
  recalc(fill = false) {
    const p = this.profile;
    this.stats = heroStats(this.cls, p.level, gearTotals(p.equip));
    if (fill || this.hp == null) {
      this.hp = this.stats.maxHp;
      this.res = this.stats.maxRes;
    }
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.res = Math.min(this.res, this.stats.maxRes);
    this.g.hero.speedK = this.stats.speed;
  }

  get weapon() {
    return this.profile.equip.mainhand;
  }

  get wtype() {
    return BASES[this.weapon?.base]?.wtype ?? 'fists';
  }

  /* ------------------------------------------------------------ input */

  /** A bar key pressed: 'LMB', 'RMB', '1'…'4'. */
  press(key) {
    if (this.dead) return;
    this.held.add(key);
    this._try(key, true);
  }

  release(key) {
    this.held.delete(key);
    const s = this._skill(key);
    if (!s) return;
    if (s.kind === 'block') this._endBlock();
    if (s.kind === 'charge-arrow' && this.drawT >= 0) this._releaseShot(s);
  }

  _skill(key) {
    const id = SKILL_BAR[this.cls]?.[BAR_KEYS.indexOf(key)];
    return id ? SKILLS[id] : null;
  }

  /** Drink a potion: no cooldown, each press one. */
  drink(kind) {
    if (this.dead) return;
    const bag = this.profile.bag;
    if (!takePotion(bag, kind)) {
      this.g.hud?.toast(`No ${POTIONS[kind].name.toLowerCase()} left.`, 'muted');
      return;
    }
    const P = POTIONS[kind];
    if (kind === 'hp') {
      const before = this.hp;
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * P.restore);
      this.g.hud?.number(this._heroTop(), Math.round(this.hp - before), 'heal');
      this.dots = this.dots.filter((d) => d.kind !== 'poison');
    } else this.res = Math.min(this.stats.maxRes, this.res + this.stats.maxRes * P.restore);
    const p = this.g.hero.pos.clone().add(V(0, 1, 0));
    this.g.vfx.burst(p, 24, kind === 'hp' ? [2.6, 0.5, 0.6] : [0.6, 1.0, 2.8], { speed: 2, life: 0.9, size: 0.12, gravity: -2, up: 0.8 });
    this.g.vfx.ring(this.g.hero.pos, { radius: 1.2, color: kind === 'hp' ? [2, 0.4, 0.5] : [0.4, 0.8, 2.4], life: 0.4 });
    this.g.sfx?.potion();
    this.g.onChange?.();
  }

  /* ------------------------------------------------------------ aiming */

  /** The ground point under the pointer (or the screen's centre), from the game each frame. */
  setAim(point) {
    this.aim = point;
    const foes = this.g.monsters.alive();
    this.aimTarget = point ? snapToFoe(point, foes, 1.6) : null;
  }

  /** Where an attack goes: the snapped monster's centre, or the aim point, or straight ahead. */
  _aimPoint(range = 30) {
    const h = this.g.hero.pos;
    if (this.aimTarget?.alive) return { point: this.g.monsters.centre(this.aimTarget), target: this.aimTarget };
    if (this.aim) {
      const q = clampToRange(h, this.aim, range);
      return { point: V(q.x, this.g.world.colliders.height(q.x, q.z) + 1.0, q.z), target: null };
    }
    const y = this.g.hero.yaw;
    return { point: V(h.x + Math.sin(y) * range, h.y + 1, h.z + Math.cos(y) * range), target: null };
  }

  _faceAim(hold = 0.6) {
    const { point } = this._aimPoint();
    const yaw = headingTo(this.g.hero.pos, point);
    this.g.hero.aimYaw = yaw;
    this.aimHold = Math.max(this.aimHold, hold);
    return yaw;
  }

  /* ------------------------------------------------------------ skills */

  _try(key, fresh) {
    const s = this._skill(key);
    if (!s || this.stun > 0) return;
    if (s.kind === 'combo') return this._combo(s, fresh);
    if (s.kind === 'block') return this._startBlock(s);
    if (this.busy > 0 && !(s.kind === 'roll' && this.busy < 0.25)) {
      // Pressed during another move: remembered, and played the moment it ends.
      if (fresh) this.queued = { key, until: this.t + 0.8 };
      return;
    }
    const can = canUseSkill(s, { resource: this.res, now: this.t, cooldowns: this.cd, level: this.profile.level });
    if (!can.ok) {
      if (fresh && can.reason === 'resource') {
        this.g.hud?.toast(`Not enough ${this.stats.resource}.`, 'muted');
        this.g.sfx?.denied();
      }
      return;
    }
    if (s.kind === 'charge-arrow') return this._startDraw(s);
    this.res -= s.cost;
    this.cd.start(s.id, s.cd, this.t);
    this.inCombat = 6;
    this[HANDLERS[s.kind]]?.(s);
  }

  _anim(name, { dur = 0.6, upper = null, speed = null } = {}) {
    const a = this.g.actor;
    const clip = a.actions[name]?.getClip();
    const sp = speed ?? (clip ? Math.max(0.5, Math.min(3, clip.duration / dur)) : 1);
    const up = upper ?? this.g.hero.speed > 0.8;
    a.act(name, { loop: false, fade: 0.08, speed: sp, upper: up });
    this.animEnd = this.t + dur;
  }

  _later(delay, fn) {
    this.pending.push({ at: this.t + delay, fn });
  }

  /* -------------------- knight */

  _combo(s, fresh) {
    if (this.busy > 0) {
      if (fresh && this.busy < 0.3) this.combo.queued = true;
      return;
    }
    const wt = this.wtype;
    const heavy = wt === 'great' || wt === 'spear' || wt === 'mace';
    const fast = wt === 'dagger';
    const k = heavy ? 1.25 : fast ? 0.7 : 1;
    const stage = nextComboStage(s, this.combo.stage, this.t - this.combo.at);
    const st = s.stages[stage];
    const dur = st.dur * k / this.stats.speed;
    this.combo.stage = stage;
    this.combo.at = this.t + dur;
    this.combo.queued = false;
    this.busy = dur * 0.85;
    this.inCombat = 6;
    const yaw = this._faceAim(dur + 0.2);
    const upper = this.g.hero.speed > 1.2;
    this._anim(st.anim, { dur: dur * 1.05, upper });
    this.g.hero.moveScale = st.heavy ? 0.15 : 0.45;
    this.slowUntil = this.t + dur * 0.9;
    this.swing = { from: this.t + dur * (st.hit - 0.18), to: this.t + dur * (st.hit + 0.12) };
    this.g.sfx?.swing(st.heavy ? 1.3 : 1);
    this._later(dur * st.hit, () => {
      const reach = st.range * (heavy ? 1.15 : 1) + (wt === 'spear' ? 0.6 : 0);
      if (st.step) this._push(yaw, st.step * 5, 0.12);
      const hits = this._cone(yaw, reach, st.arc, st.mult * (heavy ? 1.25 : fast ? 0.75 : 1), { knock: st.knock, heavy: st.heavy });
      const p = this.g.hero.pos.clone().add(V(0, 1.15, 0)).add(V(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.6));
      const tilt = stage === 2 ? 1.25 : stage === 1 ? -0.35 : 0.35;
      this.g.vfx.slash(p, yaw, { radius: reach * 0.95, arc: st.arc * 0.95, tilt, reverse: stage === 1, color: this._slashColor(), life: st.heavy ? 0.26 : 0.18 });
      if (st.heavy) {
        this.g.vfx.smokeAt(this.g.hero.pos.clone().add(V(Math.sin(yaw) * 2, 0.1, Math.cos(yaw) * 2)), 6, [0.5, 0.45, 0.4], { size: 0.5, grow: 1.5, life: 0.8, speed: 2, up: 0.4 });
        this._shake(hits ? 0.35 : 0.15);
      }
    });
    this._later(dur * 0.9, () => {
      if (this.combo.queued || this.held.has('LMB')) this._combo(s, false);
    });
  }

  _slashColor() {
    const r = this.weapon?.rarity;
    return r === 'legendary' ? [3, 1.8, 0.6] : r === 'epic' ? [2.2, 1.2, 3] : r === 'rare' ? [1.4, 2, 3] : [2, 2, 2.1];
  }

  _startBlock() {
    if (this.busy > 0 || this.dead) return;
    this.blocking = true;
    this.g.actor.act('Block', { loop: true, fade: 0.12, upper: true, speed: 0.6 });
    this.g.sfx?.raise();
  }

  _endBlock() {
    if (!this.blocking) return;
    this.blocking = false;
    this.g.actor.rest(0.2);
  }

  _bash(s) {
    const yaw = this._faceAim(0.8);
    this.busy = s.dur;
    this.g.hero.moveScale = 0.1;
    this.slowUntil = this.t + s.dur;
    this._anim('Bash', { dur: s.dur, upper: false });
    this._later(s.dur * s.hit, () => {
      this._push(yaw, 6, 0.1);
      const hits = this._cone(yaw, s.range, s.arc, s.mult, { knock: s.knock, stun: s.stun, heavy: true, sound: 'bash' });
      const p = this.g.hero.pos.clone().add(V(Math.sin(yaw) * 1.2, 1.1, Math.cos(yaw) * 1.2));
      this.g.vfx.ring(p, { radius: 1.1, color: [1.6, 1.2, 0.6], life: 0.18, flat: false });
      this.g.vfx.sparksAt(p, 18, [2, 1.7, 1.2], { speed: 7, dir: V(Math.sin(yaw), 0, Math.cos(yaw)) });
      this._shake(hits ? 0.3 : 0.12);
    });
  }

  _dash(s) {
    const { point } = this._aimPoint(s.range);
    const h = this.g.hero;
    const yaw = headingTo(h.pos, point);
    const dist = Math.min(s.range, Math.hypot(point.x - h.pos.x, point.z - h.pos.z) + 1);
    const time = dist / s.speed;
    h.force = { vx: Math.sin(yaw) * s.speed, vz: Math.cos(yaw) * s.speed, t: time, yaw };
    h.aimYaw = yaw;
    this.aimHold = time + 0.2;
    this.busy = time + 0.15;
    this.iframes = time;
    this._anim('Charge', { dur: time + 0.25, upper: false });
    this.charging = { s, yaw, hit: new Set(), until: this.t + time };
    this.g.sfx?.charge();
  }

  _spin(s) {
    this.spinning = { s, until: this.t + s.time, next: this.t };
    this.busy = 0;
    this.g.actor.act('Whirl', { loop: true, fade: 0.1, upper: true, speed: 1.4 });
    this.g.sfx?.whirl(s.time);
  }

  _leap(s) {
    const h = this.g.hero;
    const q = clampToRange(h.pos, this.aim ?? { x: h.pos.x + Math.sin(h.yaw) * 6, z: h.pos.z + Math.cos(h.yaw) * 6 }, s.range);
    const yaw = headingTo(h.pos, q);
    const time = 0.62;
    h.force = { vx: (q.x - h.pos.x) / time, vz: (q.z - h.pos.z) / time, t: time, yaw, still: true };
    h.aimYaw = yaw;
    this.aimHold = time + 0.3;
    this.busy = time + 0.3;
    this.iframes = time;
    this.leap = { s, t0: this.t, time, at: q };
    this._anim('Slam', { dur: time + 0.25, upper: false });
    this.g.vfx.telegraph({ x: q.x, z: q.z, radius: s.radius, time, color: '#ffd070' });
    this.g.sfx?.swing(1.4);
  }

  /* -------------------- ranger */

  _arrow(s, { mult = s.mult, pierce = s.pierce, speed = s.speed, spread = 0, fire = s.fire, burst = s.burst, charge = 0 } = {}) {
    const h = this.g.hero;
    const from = this._bowPoint();
    const { point, target } = this._aimPoint(s.range);
    const dir = point.clone().sub(from);
    if (target) dir.y = point.y - from.y;
    else dir.y = Math.max(-0.4, Math.min(0.4, dir.y / Math.max(1, dir.length())) * dir.length());
    dir.normalize();
    if (spread) dir.applyAxisAngle(V(0, 1, 0), spread);
    const mesh = this.g.vfx.arrowMesh();
    mesh.position.copy(from);
    mesh.lookAt(from.clone().add(dir));
    if (charge > 0.6 || fire) mesh.scale.setScalar(1.15);
    this.projectiles.push({ kind: 'arrow', mesh, p: from.clone(), v: dir.multiplyScalar(speed), life: s.range / speed, mult, pierce, fire, burst, hit: new Set(), skill: s, charge, glow: charge > 0.6 ? [2.4, 2, 1] : fire ? [3, 1.2, 0.3] : null });
    void h;
  }

  _bowPoint() {
    const pts = this.g.rig?.weaponPoints();
    const h = this.g.hero;
    if (pts && this.wtype === 'bow') return pts.base.clone().lerp(pts.tip, 0.15);
    if (pts) return pts.tip.clone();
    return h.pos.clone().add(V(Math.sin(h.yaw) * 0.5, 1.4, Math.cos(h.yaw) * 0.5));
  }

  _arrowSkill(s) {
    this._faceAim(0.9);
    const dur = (s.dur ?? 0.4) / this.stats.speed;
    this.busy = dur * 0.75;
    this.slowUntil = this.t + dur;
    this.g.hero.moveScale = 0.7;
    this._anim(s.anim, { dur: dur * 1.3, upper: true });
    this._later(dur * 0.55, () => {
      this._faceAim(0.6);
      this._arrow(s);
      this.g.sfx?.bow();
    });
    if (s.id === 'quick') this._later(dur * 0.8, () => this.held.has('LMB') && this._try('LMB', false));
  }

  _startDraw(s) {
    if (this.busy > 0) return;
    this.drawT = 0;
    this.g.actor.act('Draw', { loop: true, fade: 0.12, upper: true, speed: 0.5 });
    this.g.sfx?.draw();
  }

  _releaseShot(s) {
    const held = this.drawT;
    this.drawT = -1;
    if (this.res < s.cost || !this.cd.ready(s.id, this.t)) {
      this.g.actor.rest(0.2);
      return;
    }
    this.res -= s.cost;
    this.cd.start(s.id, s.cd, this.t);
    this.inCombat = 6;
    this._faceAim(0.6);
    const m = chargeMult(s, held);
    const k = Math.min(1, held / s.chargeTime);
    this._arrow(s, { mult: m, pierce: true, speed: s.speed * (0.7 + k * 0.5), charge: k });
    this.g.actor.rest(0.15);
    this.g.sfx?.bow(1 + k * 0.6);
    if (k > 0.95) this._shake(0.12);
  }

  _fan(s) {
    this._faceAim(0.9);
    this.busy = s.dur;
    this.g.hero.moveScale = 0.6;
    this.slowUntil = this.t + s.dur;
    this._anim(s.anim, { dur: s.dur * 1.3, upper: true });
    this._later(s.dur * 0.55, () => {
      this._faceAim(0.6);
      for (let i = 0; i < s.count; i++) this._arrow(s, { spread: (i / (s.count - 1) - 0.5) * s.spread });
      this.g.sfx?.bow(0.8);
    });
  }

  _roll(s) {
    const h = this.g.hero;
    const inp = this.g.lastInput ?? { x: 0, z: 0 };
    let yaw;
    if (Math.hypot(inp.x, inp.z) > 0.1) {
      const c = this.g.follow.heading();
      yaw = Math.atan2(-inp.x * Math.cos(c) + inp.z * Math.sin(c), inp.x * Math.sin(c) + inp.z * Math.cos(c));
    } else yaw = wrap(h.yaw + Math.PI);
    const sp = s.range / s.time;
    h.force = { vx: Math.sin(yaw) * sp, vz: Math.cos(yaw) * sp, t: s.time, yaw };
    h.aimYaw = null;
    this.aimHold = 0;
    this.iframes = s.iframes;
    this.busy = s.time;
    this._endBlock();
    this.drawT = -1;
    this._anim('Roll', { dur: s.time + 0.1, upper: false });
    this.g.vfx.smokeAt(h.pos.clone(), 5, [0.6, 0.55, 0.45], { size: 0.4, grow: 1, life: 0.7, speed: 1.5, up: 0.3 });
    this.g.sfx?.roll();
  }

  _rain(s) {
    const h = this.g.hero;
    const q = clampToRange(h.pos, this.aim ?? { x: h.pos.x + Math.sin(h.yaw) * 8, z: h.pos.z + Math.cos(h.yaw) * 8 }, s.range);
    this._faceAim(0.8);
    this.busy = 0.45;
    this._anim('SkyShot', { dur: 0.6, upper: true });
    this.g.sfx?.bow(0.7);
    const mark = this.g.vfx.telegraph({ x: q.x, z: q.z, radius: s.radius, time: s.time + 0.4, color: '#ffd27a' });
    void mark;
    this._later(0.4, () => this.zones.push({ kind: 'rain', s, x: q.x, z: q.z, until: this.t + s.time, next: this.t }));
  }

  /* -------------------- mage */

  _bolt(s) {
    this._faceAim(0.8);
    const dur = s.dur / this.stats.speed;
    this.busy = dur * 0.8;
    this.slowUntil = this.t + dur;
    this.g.hero.moveScale = 0.75;
    this._anim('Cast', { dur: dur * 1.4, upper: true });
    this._later(dur * 0.45, () => {
      const from = this._bowPoint();
      const { point } = this._aimPoint(s.range);
      const dir = point.clone().sub(from).normalize();
      this.projectiles.push({ kind: 'bolt', p: from.clone(), v: dir.multiplyScalar(s.speed), life: s.range / s.speed, mult: s.mult, skill: s, hit: new Set(), spell: true });
      this.g.vfx.burst(from, 8, [3, 1.2, 0.3], { speed: 2, life: 0.25, size: 0.18 });
      this.g.sfx?.fire();
    });
    this._later(dur * 0.9, () => this.held.has('LMB') && this._try('LMB', false));
  }

  _chain(s) {
    this._faceAim(0.8);
    this.busy = s.dur;
    this.slowUntil = this.t + s.dur;
    this.g.hero.moveScale = 0.5;
    this._anim('Cast', { dur: s.dur * 1.3, upper: true });
    this._later(s.dur * 0.35, () => {
      const from = this._bowPoint();
      const foes = this.g.monsters.alive();
      const h = this.g.hero.pos;
      let first = this.aimTarget?.alive && Math.hypot(this.aimTarget.x - h.x, this.aimTarget.z - h.z) < s.range + 2 ? this.aimTarget : null;
      if (!first) {
        const { point } = this._aimPoint(s.range);
        first = foes.filter((m) => Math.hypot(m.x - h.x, m.z - h.z) < s.range).sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z))[0];
        if (first && Math.hypot(first.x - point.x, first.z - point.z) > 5) first = null;
      }
      this.g.sfx?.zap();
      if (!first) {
        const { point } = this._aimPoint(s.range);
        this.g.vfx.lightning(from, point, { life: 0.25 });
        this.g.vfx.sparksAt(point, 10, [1.4, 1.8, 3]);
        return;
      }
      const hit = new Set();
      let cur = first;
      let a = from;
      let mult = s.mult;
      for (let j = 0; j <= s.jumps && cur; j++) {
        const c = this.g.monsters.centre(cur);
        this.g.vfx.lightning(a, c, { life: 0.3 + j * 0.03, width: j === 0 ? 0.14 : 0.1 });
        this.g.vfx.sparksAt(c, 12, [1.4, 1.8, 3.2], { speed: 7 });
        this.g.vfx.burst(c, 1, [2, 2.4, 3.5], { speed: 0, life: 0.15, size: 1.2, gravity: 0 });
        this._damage(cur, mult, { spell: true, sound: 'zap', stun: 0.25, hitStop: j === 0 ? 0.05 : 0 });
        hit.add(cur);
        a = c;
        mult *= s.decay;
        cur = foes.filter((m) => m.alive && !hit.has(m) && Math.hypot(m.x - cur.x, m.z - cur.z) < s.jumpRange).sort((p, q) => Math.hypot(p.x - cur.x, p.z - cur.z) - Math.hypot(q.x - cur.x, q.z - cur.z))[0];
      }
      this.g.vfx.flash(from, 0x9ab8ff, 40, 0.2, 10);
    });
  }

  _nova(s) {
    this.busy = s.dur;
    this.g.hero.moveScale = 0.2;
    this.slowUntil = this.t + s.dur;
    this._anim('Nova', { dur: s.dur * 1.4, upper: false });
    this.g.sfx?.frost();
    this._later(s.dur * 0.4, () => {
      const h = this.g.hero.pos;
      this.g.vfx.ring(h, { radius: s.radius, color: [0.5, 1.3, 2.4], life: 0.55, width: 0.4 });
      this.g.vfx.ring(h.clone().add(V(0, 0.5, 0)), { radius: s.radius * 0.8, color: [0.7, 1.3, 2.0], life: 0.4 });
      this.g.vfx.glowDecal({ x: h.x, z: h.z, radius: s.radius, color: '#9ad8ff', alpha: 0.5, life: s.freeze });
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * TAU;
        const v = V(Math.sin(a), 0.15, Math.cos(a)).multiplyScalar(s.radius * 2.2);
        this.g.vfx.sparks.push({ p: h.clone().add(V(0, 0.4, 0)), v, life: 0, max: 0.45, color: [1.2, 2, 3], gravity: 2, width: 0.05 });
      }
      this.g.vfx.burst(h.clone().add(V(0, 0.8, 0)), 30, [1.2, 2.2, 3.2], { speed: 6, life: 0.7, size: 0.16, gravity: 3 });
      this.g.vfx.flash(h.clone().add(V(0, 1, 0)), 0x9ad8ff, 50, 0.35, 14);
      for (const m of this.g.monsters.near(h, s.radius)) this._damage(m, s.mult, { spell: true, freeze: s.freeze, sound: 'frost' });
      this._shake(0.2);
    });
  }

  _blink(s) {
    const h = this.g.hero;
    const col = this.g.world.colliders;
    const q = clampToRange(h.pos, this.aim ?? { x: h.pos.x + Math.sin(h.yaw) * s.range, z: h.pos.z + Math.cos(h.yaw) * s.range }, s.range);
    // Step along the way so walls and cliffs stop the blink.
    let x = h.pos.x;
    let z = h.pos.z;
    const n = 20;
    for (let i = 0; i < n; i++) [x, z] = col.move(x, z, (q.x - h.pos.x) / n, (q.z - h.pos.z) / n, 0.38, col.height(x, z));
    const from = h.pos.clone().add(V(0, 1, 0));
    this.g.vfx.burst(from, 40, [2, 1.1, 3.2], { speed: 3, life: 0.5, size: 0.14, gravity: -1 });
    this.g.vfx.ring(h.pos, { radius: 1.4, color: [1.8, 1, 3], life: 0.3 });
    const yaw = headingTo(h.pos, { x, z });
    h.place(x, z, Math.hypot(x - h.pos.x, z - h.pos.z) > 0.5 ? yaw : h.yaw);
    const to = h.pos.clone().add(V(0, 1, 0));
    this.g.vfx.lightning(from, to, { life: 0.2, color: [2, 1.2, 3.4], width: 0.08, forks: 0 });
    this.g.vfx.burst(to, 40, [2, 1.1, 3.2], { speed: 3, life: 0.5, size: 0.14, gravity: -1 });
    this.g.vfx.ring(h.pos, { radius: 1.6, color: [1.8, 1, 3], life: 0.35 });
    this.g.rig?.settle();
    this.iframes = 0.2;
    this.g.sfx?.blink();
  }

  _meteor(s) {
    const h = this.g.hero;
    const q = clampToRange(h.pos, this.aim ?? { x: h.pos.x + Math.sin(h.yaw) * 10, z: h.pos.z + Math.cos(h.yaw) * 10 }, s.range);
    this._faceAim(1.2);
    this.busy = s.dur;
    this.g.hero.moveScale = 0.15;
    this.slowUntil = this.t + s.dur;
    this._anim('CastBig', { dur: s.dur * 1.3, upper: false });
    const y = this.g.world.colliders.height(q.x, q.z);
    this.g.vfx.telegraph({ x: q.x, z: q.z, radius: s.radius, time: s.delay, color: '#ff8a2a' });
    const rock = this.g.vfx.rockMesh(1.1);
    const start = V(q.x - 8, y + 24, q.z - 5);
    rock.position.copy(start);
    this.g.sfx?.meteor();
    this.zones.push({ kind: 'meteor', s, x: q.x, z: q.z, y, rock, start, t0: this.t, until: this.t + s.delay });
  }

  _ward(s) {
    this.ward = this.stats.maxHp * s.absorb;
    this.wardT = s.time;
    this._anim('Nova', { dur: 0.6, upper: true });
    if (!this.wardMesh) {
      const m = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uK: { value: 1 } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform float uT; uniform float uK; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5); float hex = step(0.92, fract(vP.y * 9.0 + uT * 0.6)) * 0.35; float a = (f * 0.9 + hex * f + 0.04) * uK; gl_FragColor = vec4(vec3(1.4, 0.7, 2.6) * a, a); }',
        transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, toneMapped: false
      });
      this.wardMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 20), m);
      this.wardMesh.scale.set(1, 1.15, 1);
      this.g.scene.add(this.wardMesh);
    }
    this.wardMesh.visible = true;
    this.g.vfx.burst(this.g.hero.pos.clone().add(V(0, 1, 0)), 30, [1.8, 0.9, 3], { speed: 3, life: 0.6, size: 0.14, gravity: -1 });
    this.g.sfx?.ward();
  }

  /* ------------------------------------------------------------ hitting */

  /** Monsters within a cone in front: damage each once. Returns how many were hit. */
  _cone(yaw, range, arc, mult, opts = {}) {
    const h = this.g.hero.pos;
    let n = 0;
    for (const m of this.g.monsters.alive()) {
      const dx = m.x - h.x;
      const dz = m.z - h.z;
      const d = Math.hypot(dx, dz);
      if (d > range + m.r) continue;
      if (Math.abs(wrap(Math.atan2(dx, dz) - yaw)) > arc / 2 + Math.atan2(m.r, Math.max(d, 0.1))) continue;
      this._damage(m, mult, { ...opts, hitStop: opts.heavy ? 0.085 : 0.05 });
      n++;
    }
    return n;
  }

  /**
   * One blow on a monster: rolled from the hero's attack (and spell power),
   * crit, its armour. Numbers, sparks, hit-stop, a sound; kills give their due.
   */
  _damage(m, mult, { spell = false, knock = 0, stun = 0, freeze = 0, slow = 0, slowT = 0, burn = 0, heavy = false, hitStop = 0.04, sound = null, from = null, quiet = false } = {}) {
    if (!m.alive) return;
    this.lastHit = m;
    this.lastHitT = this.t;
    const st = this.stats;
    const base = st.atk + (spell ? st.spell * 1.4 : 0);
    const r = rollDamage({ base, mult, critChance: st.crit, critMult: st.critMult, armour: m.stats.armour, attackerLevel: this.profile.level });
    const h = this.g.hero.pos;
    const died = this.g.monsters.damage(m, { amount: r.amount, crit: r.crit, from: from ?? { x: h.x, z: h.z }, knock, stun, freeze, slow, slowT, burn: burn ? Math.max(1, Math.round(r.amount * 0.12)) : 0, burnT: burn, heavy: heavy || r.crit }, this);
    const c = this.g.monsters.centre(m);
    this.g.hud?.number(c.clone().add(V(rnd(-0.3, 0.3), 0.4, rnd(-0.3, 0.3))), r.amount, r.crit ? 'crit' : 'dmg');
    if (!quiet) {
      const dir = V(m.x - h.x, 0.3, m.z - h.z).normalize();
      const col = m.def.family === 'wood' ? [1.6, 1.2, 0.7] : m.def.family === 'fey' ? [2, 1, 3] : [2.2, 1.7, 1.1];
      this.g.vfx.hit(c, { color: col, dir, crit: r.crit, heavy, blood: m.def.family === 'beast' ? [0.6, 0.05, 0.03] : m.def.family === 'spider' ? [0.3, 0.8, 0.1] : null });
      this.g.sfx?.impact(m.def.family, r.crit, heavy);
    }
    if (st.leech) this.hp = Math.min(st.maxHp, this.hp + r.amount * st.leech);
    this.hitStop = Math.max(this.hitStop, (r.crit ? hitStop * 1.6 : hitStop) * (died ? 1.6 : 1));
    if (r.crit) this._shake(0.12);
    this.inCombat = 6;
    void sound;
    if (died) this._killed(m);
  }

  _killed(m) {
    const p = this.profile;
    const xp = xpForKill(m.level, p.level, { elite: m.elite, boss: m.boss });
    const ups = addXp(p, xp);
    this.g.hud?.number(this._heroTop().add(V(0, 0.3, 0)), `+${xp} xp`, 'xp');
    if (ups.length) this._levelUp(ups[ups.length - 1]);
    // The loot: rolled for this hero.
    const tier = tierOf(m.def);
    const drop = rollLoot({ tier: tier === 'normal' ? 'normal' : tier, level: m.level, cls: this.cls, family: m.def.family });
    const at = V(m.x, m.y, m.z);
    for (const it of tier === 'normal' ? drop.items : []) this._dropItem(it, at);
    for (const pot of drop.potions) this._dropPotion(pot.kind, at);
    this._dropGold(drop.gold, at);
    if (tier !== 'normal') {
      const c = rewardChest({ elite: m.elite, boss: m.boss }, { id: `r${m.id}${Math.round(this.t)}`, x: m.x + 1.5, z: m.z + 1.5, now: this.t });
      if (c) this._spawnChest(c);
      this.g.hud?.banner(m.boss ? `${m.name} has fallen` : `${m.name} is slain`, m.title, true);
      this._shake(m.boss ? 0.8 : 0.4);
    }
    this.g.onChange?.();
    this.save();
  }

  _levelUp(level) {
    this.recalc(true);
    const h = this.g.hero.pos;
    this.g.vfx.ring(h, { radius: 3, color: [3, 2.4, 1], life: 0.8, width: 0.3 });
    for (let i = 0; i < 60; i++) this.g.vfx.parts.push({ p: h.clone().add(V(rnd(-0.6, 0.6), rnd(0, 0.3), rnd(-0.6, 0.6))), v: V(rnd(-0.3, 0.3), rnd(3, 7), rnd(-0.3, 0.3)), life: 0, max: rnd(0.8, 1.6), size: rnd(0.08, 0.18), color: [3, 2.2, 0.9], gravity: 0, drag: 0.5, grow: 0 });
    this.g.vfx.flash(h.clone().add(V(0, 2, 0)), 0xffd070, 50, 0.8, 12);
    this.g.hud?.banner(`Level ${level}`, 'Your strength grows', true);
    this.g.sfx?.levelUp();
  }

  /* ------------------------------------------------------------ being hit */

  /** A monster's blow lands on the hero (from monsters.js). */
  hitHero(m, attack, { from = null, knock = 0, stun = 0, root = 0, poison = 0, burn = false } = {}) {
    if (this.dead) return;
    if (this.iframes > 0) {
      this.g.hud?.number(this._heroTop(), 'dodge', 'muted');
      return;
    }
    const st = this.stats;
    const r = rollDamage({ base: m.stats.atk, mult: attack.mult, critChance: m.stats.crit, critMult: 1.5, armour: st.armour, attackerLevel: m.level });
    const h = this.g.hero;
    const fromYaw = from ? Math.atan2(from.x - h.pos.x, from.z - h.pos.z) : h.yaw;
    const b = blockedDamage(r.amount, { blocking: this.blocking, facing: h.yaw, from: fromYaw, block: st.block });
    let amount = b.amount;
    if (this.ward > 0) {
      const take = Math.min(this.ward, amount);
      this.ward -= take;
      amount -= take;
      this.g.vfx.burst(h.pos.clone().add(V(0, 1.1, 0)), 10, [1.8, 0.9, 3], { speed: 3, life: 0.3, size: 0.12 });
      if (this.ward <= 0) this.wardT = 0;
    }
    this.hp -= amount;
    this.inCombat = 8;
    this.g.hud?.number(this._heroTop(), b.blocked ? `${amount} blocked` : amount, b.blocked ? 'block' : 'hurt');
    if (b.blocked) {
      const p = h.pos.clone().add(V(Math.sin(h.yaw) * 0.5, 1.2, Math.cos(h.yaw) * 0.5));
      this.g.vfx.sparksAt(p, 16, [2.4, 2, 1.4], { speed: 8 });
      this.g.sfx?.block();
      this.res = Math.max(0, this.res - 6);
    } else {
      this.g.hud?.hurt(Math.min(1, amount / st.maxHp * 4));
      this.g.sfx?.hurt();
      this._shake(Math.min(0.5, 0.15 + amount / st.maxHp));
      if (!this.busy && !this.blocking && this.drawT < 0) this.g.actor.act('Hit', { loop: false, fade: 0.06, upper: h.speed > 0.6, speed: 1.6 });
      if (knock && from) {
        const d = Math.hypot(h.pos.x - from.x, h.pos.z - from.z) || 1;
        h.force = { vx: (h.pos.x - from.x) / d * knock * 2, vz: (h.pos.z - from.z) / d * knock * 2, t: 0.18 };
      }
      if (stun) this.stun = Math.max(this.stun, stun);
      if (root) this.rootT = Math.max(this.rootT ?? 0, root);
      if (poison) this.dots.push({ kind: 'poison', dps: Math.max(1, m.stats.atk * 0.1), until: this.t + poison, next: this.t + 1 });
      if (burn) this.dots.push({ kind: 'burn', dps: Math.max(1, m.stats.atk * 0.12), until: this.t + 2, next: this.t + 0.5 });
      if (attack.slow) this.slowT = 2;
    }
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.hp = 0;
    this.dead = true;
    this.deadT = 0;
    this._endBlock();
    this.drawT = -1;
    this.spinning = null;
    this.dots = [];
    this.g.hero.aimYaw = null;
    this.g.hero.force = null;
    this.g.actor.twist = 0;
    this.g.actor.act('Die', { loop: false, fade: 0.1, clamp: true, upper: false });
    this.g.hud?.death(true);
    this.g.sfx?.death();
    this.g.monsters.resetAll();
  }

  _respawn() {
    this.dead = false;
    this.recalc(true);
    this.g.actor.rest(0);
    this.g.teleport(WELL.x + 2.4, WELL.z + 2.6, Math.PI * 0.75);
    this.g.hud?.death(false);
    this.g.vfx.ring(this.g.hero.pos, { radius: 2, color: [2.6, 2.2, 1.4], life: 0.8 });
    this.iframes = 2;
  }

  _heroTop() {
    return this.g.hero.pos.clone().add(V(0, 2.1, 0));
  }

  _push(yaw, speed, t) {
    const h = this.g.hero;
    if (h.force) return;
    h.force = { vx: Math.sin(yaw) * speed, vz: Math.cos(yaw) * speed, t, yaw };
  }

  _shake(k) {
    this.shake = Math.min(1, Math.max(this.shake, k * (this.g.reducedMotion ? 0.25 : 1)));
  }

  /* ------------------------------------------------------------ loot and chests */

  _dropItem(item, at) {
    const g = new THREE.Group();
    const model = buildItem(item);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(V()).length();
    model.scale.setScalar(Math.min(1.4, 0.9 / Math.max(0.2, size)) * (BASES[item.base].slot === 'head' ? 0.15 : 1));
    if (BASES[item.base].slot === 'head') model.scale.setScalar(0.13);
    g.add(model);
    const rar = RARITIES[item.rarity];
    if (item.rarity !== 'common') {
      // A pillar of the rarity's light.
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 4, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(rar.color).multiplyScalar(item.rarity === 'legendary' ? 2 : 1.3), transparent: true, opacity: item.rarity === 'uncommon' ? 0.14 : 0.24, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      beam.position.y = 2;
      g.add(beam);
    }
    const a = Math.random() * TAU;
    const r = rnd(0.6, 1.6);
    const x = at.x + Math.cos(a) * r;
    const z = at.z + Math.sin(a) * r;
    g.position.set(at.x, at.y + 1, at.z);
    this.g.scene.add(g);
    this.loot.push({ kind: 'item', item, obj: g, model, x, z, y: this.g.world.colliders.height(x, z), t0: this.t, from: at.clone(), spin: Math.random() * TAU });
  }

  _dropPotion(kind, at) {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), gearMaterial('gem', POTIONS[kind].color, { glowK: 0.6 }));
    glass.position.y = 0.12;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.09, 10), gearMaterial('gem', '#e8f0ff', { glowK: 0.1 }));
    neck.position.y = 0.25;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), gearMaterial('wood', '#8a6440'));
    cork.position.y = 0.31;
    g.add(glass, neck, cork);
    this._toss(g, at, { kind: 'potion', potion: kind });
  }

  _dropGold(n, at) {
    if (n <= 0) return;
    const g = new THREE.Group();
    const m = gearMaterial('polish', '#e8b552');
    for (let i = 0; i < Math.min(9, 2 + Math.round(n / 8)); i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), m);
      c.position.set(rnd(-0.12, 0.12), i * 0.013, rnd(-0.12, 0.12));
      c.rotation.set(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2));
      g.add(c);
    }
    this._toss(g, at, { kind: 'gold', gold: n });
  }

  _toss(g, at, data) {
    const a = Math.random() * TAU;
    const r = rnd(0.5, 1.4);
    const x = at.x + Math.cos(a) * r;
    const z = at.z + Math.sin(a) * r;
    g.position.copy(at);
    this.g.scene.add(g);
    this.loot.push({ ...data, obj: g, x, z, y: this.g.world.colliders.height(x, z), t0: this.t, from: at.clone(), spin: 0 });
  }

  _pickup(l) {
    const p = this.profile;
    if (l.kind === 'gold') {
      p.gold += l.gold;
      this.g.hud?.toast(`+${l.gold} gold`, 'gold');
      this.g.sfx?.coins();
    } else if (l.kind === 'potion') {
      const r = addToBag(p.bag, { kind: l.potion, n: 1 });
      if (!r.ok) return this._full(l);
      this.g.hud?.toast(POTIONS[l.potion].name, 'potion', null, POTIONS[l.potion].color);
      this.g.sfx?.pickup();
    } else {
      const r = addToBag(p.bag, l.item);
      if (!r.ok) return this._full(l);
      this.g.hud?.toast(l.item.name, 'item', l.item);
      this.g.sfx?.pickup(l.item.rarity);
    }
    l.obj.removeFromParent();
    l.gone = true;
    this.g.onChange?.();
    this.save();
    return true;
  }

  _full(l) {
    if (!l.warned) this.g.hud?.toast('Your bag is full.', 'muted');
    l.warned = true;
    return false;
  }

  _placeChests() {
    for (const c of CHESTS) {
      if (this.profile.opened.includes(c.id)) continue;
      this._spawnChest({ ...c, opened: false, placed: true });
    }
  }

  /** A chest: an iron-banded box whose lid lifts. */
  _spawnChest(c) {
    const g = new THREE.Group();
    const wood = gearMaterial('wood', c.tier === 'boss' ? '#5a2a1a' : '#6a4426');
    const iron = gearMaterial('metal', c.tier === 'boss' || c.tier === 'elite' ? '#e3b04a' : '#7a7e86', { rough: 0.45 });
    const s = c.tier === 'boss' ? 1.35 : c.tier === 'elite' ? 1.15 : 1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.62), wood);
    body.position.y = 0.275;
    const lid = new THREE.Group();
    lid.position.set(0, 0.55, -0.31);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 1.0, 16, 1, false, 0, Math.PI), wood);
    top.rotation.z = Math.PI / 2;
    top.position.z = 0.31;
    lid.add(top);
    for (const x of [-0.4, 0, 0.4]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.57, 0.66), iron);
      band.position.set(x, 0.275, 0);
      g.add(band);
      const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.07, 16, 1, true, 0, Math.PI), iron);
      lb.rotation.z = Math.PI / 2;
      lb.position.set(x, 0, 0.31);
      lid.add(lb);
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.06), iron);
    lock.position.set(0, 0.45, 0.33);
    g.add(body, lid, lock);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.scale.setScalar(s);
    const y = this.g.world.colliders.height(c.x, c.z);
    g.position.set(c.x, y, c.z);
    g.rotation.y = c.face ?? Math.random() * TAU;
    this.g.scene.add(g);
    const glow = this.g.vfx.glowDecal({ x: c.x, z: c.z, radius: 1.3 * s, color: c.tier === 'boss' ? '#ff9a2a' : '#ffd070', alpha: 0.35 });
    this.chests.push({ ...c, obj: g, lid, glow, y });
  }

  /** The nearest thing to use within reach: a chest (or null). */
  nearestChest(maxD = 2.4) {
    const h = this.g.hero.pos;
    let best = null;
    let bd = maxD;
    for (const c of this.chests) {
      if (c.opened) continue;
      const d = Math.hypot(c.x - h.x, c.z - h.z);
      if (d < bd) [best, bd] = [c, d];
    }
    return best;
  }

  openChest(c) {
    if (c.placed && !openPlaced(this.profile.opened, c.id)) return;
    if (!openChest(c, this.t)) return;
    const at = V(c.x, c.y + 0.6, c.z);
    const loot = rollLoot({ tier: c.tier === 'chest' ? 'chest' : c.tier, level: Math.max(this.profile.level, c.tier === 'boss' ? 10 : 3), cls: this.cls });
    this._later(0.35, () => {
      for (const it of loot.items) this._dropItem(it, at);
      for (const p of loot.potions) this._dropPotion(p.kind, at);
      this._dropGold(loot.gold, at);
      this.g.vfx.burst(at, 40, [3, 2.4, 1], { speed: 4, life: 0.9, size: 0.12, gravity: 3, up: 1.5 });
      this.g.vfx.flash(at.clone().add(V(0, 1, 0)), 0xffd070, 40, 0.6, 10);
    });
    this.g.sfx?.chest();
    this.save();
  }

  /* ------------------------------------------------------------ the frame */

  /**
   * One step. `dt` real seconds (the hit-stop slows the fight's own clock).
   * Returns the fight's dt for the game to use on monsters and the hero.
   */
  update(dt) {
    const stop = this.hitStop > 0;
    this.hitStop = Math.max(0, this.hitStop - dt);
    const fdt = stop ? dt * 0.06 : dt;
    this.t += fdt;
    const h = this.g.hero;
    const st = this.stats;
    // Regeneration (faster out of combat).
    this.inCombat = Math.max(0, this.inCombat - fdt);
    if (!this.dead) {
      this.hp = Math.min(st.maxHp, this.hp + st.hpRegen * (this.inCombat > 0 ? 1 : 4) * fdt);
      this.res = Math.min(st.maxRes, this.res + st.resRegen * (this.inCombat > 0 ? 1 : 2) * fdt);
    }
    this.busy = Math.max(0, this.busy - fdt);
    this.iframes = Math.max(0, this.iframes - fdt);
    this.stun = Math.max(0, this.stun - fdt);
    this.slowT = Math.max(0, this.slowT - fdt);
    if (this.rootT > 0) this.rootT -= fdt;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    // Pending (timed parts of skills).
    const due = this.pending.filter((p) => p.at <= this.t);
    this.pending = this.pending.filter((p) => p.at > this.t);
    for (const p of due) if (!this.dead) p.fn();
    // Dying and waking.
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 4) this._respawn();
      h.moveScale = 0;
      return fdt;
    }
    // Damage over time.
    for (const d of this.dots) {
      if (this.t >= d.next) {
        d.next += d.kind === 'burn' ? 0.5 : 1;
        const n = Math.round(d.dps * (d.kind === 'burn' ? 0.5 : 1));
        this.hp -= n;
        this.g.hud?.number(this._heroTop(), n, d.kind === 'poison' ? 'poison' : 'hurt');
        if (d.kind === 'burn') this.g.vfx.fire(h.pos.clone().add(V(0, 0.8, 0)), 4);
        else this.g.vfx.burst(h.pos.clone().add(V(0, 1, 0)), 3, [0.6, 1.8, 0.4], { speed: 1, life: 0.5, size: 0.1, gravity: -1 });
        if (this.hp <= 0) return this._die(), fdt;
      }
    }
    this.dots = this.dots.filter((d) => this.t < d.until);
    // Movement allowances while attacking.
    if (this.slowUntil && this.t > this.slowUntil) {
      this.slowUntil = 0;
      h.moveScale = 1;
    }
    if (this.blocking) h.moveScale = 0.42;
    else if (this.drawT >= 0) h.moveScale = 0.55;
    else if (!this.slowUntil) h.moveScale = 1;
    if (this.stun > 0 || this.rootT > 0) h.moveScale = 0;
    if (this.slowT > 0) h.moveScale *= 0.6;
    // Facing the aim while attacking or blocking or drawing.
    this.aimHold = Math.max(0, this.aimHold - fdt);
    if (this.blocking || this.drawT >= 0 || this.spinning) this._faceAim(0.3);
    if (this.aimHold <= 0 && !h.force) h.aimYaw = null;
    // A skill pressed during the last move goes now.
    if (this.queued && this.busy <= 0) {
      const q = this.queued;
      this.queued = null;
      if (this.t < q.until) this._try(q.key, true);
    }
    // Holding a button keeps attacking.
    for (const k of this.held) if (k === 'LMB' && this.busy <= 0) this._try('LMB', false);
    // A charged shot's draw.
    if (this.drawT >= 0) {
      this.drawT += fdt;
      const s = SKILLS.charged;
      const k = Math.min(1, this.drawT / s.chargeTime);
      if (k >= 1 && Math.random() < fdt * 20) this.g.vfx.burst(this._bowPoint(), 1, [2.6, 2.2, 1.2], { speed: 0.5, life: 0.3, size: 0.1, gravity: 0 });
    }
    // The knight's charge: bowl over what's in the way.
    if (this.charging) {
      const c = this.charging;
      for (const m of this.g.monsters.alive()) {
        if (c.hit.has(m) || Math.hypot(m.x - h.pos.x, m.z - h.pos.z) > m.r + c.s.width) continue;
        c.hit.add(m);
        this._damage(m, c.s.mult, { knock: c.s.knock, stun: c.s.stun, heavy: true, hitStop: 0.07 });
        this._shake(0.3);
        if (m.boss || m.elite) {
          h.force = null;
          c.until = this.t;
        }
      }
      if (Math.random() < 0.6) this.g.vfx.smokeAt(h.pos.clone(), 1, [0.55, 0.5, 0.42], { size: 0.4, grow: 1.2, life: 0.6, speed: 0.6, up: 0.3 });
      if (this.t >= c.until) {
        this.charging = null;
        this.g.actor.rest(0.2);
      }
    }
    // Whirlwind.
    if (this.spinning) {
      const s = this.spinning.s;
      h.spin += fdt * 14;
      h.moveScale = Math.min(h.moveScale, 0.6);
      if (this.t >= this.spinning.next) {
        this.spinning.next = this.t + s.tick;
        for (const m of this.g.monsters.near(h.pos, s.radius)) this._damage(m, s.mult, { knock: s.knock, hitStop: 0.02 });
        this.g.vfx.slash(h.pos.clone().add(V(0, 1.0, 0)), h.yaw + h.spin, { radius: s.radius * 0.9, arc: 3.6, color: this._slashColor(), life: 0.22 });
      }
      if (this.t >= this.spinning.until) {
        this.spinning = null;
        h.spin = 0;
        this.g.actor.rest(0.2);
      }
    }
    // The leap: up, over and down.
    if (this.leap) {
      const L = this.leap;
      const k = Math.min(1, (this.t - L.t0) / L.time);
      h.lift = Math.sin(k * Math.PI) * 2.4;
      if (k >= 1) {
        h.lift = 0;
        const s = L.s;
        this.leap = null;
        const p = V(L.at.x, this.g.world.colliders.height(L.at.x, L.at.z), L.at.z);
        this.g.vfx.explode(p.clone().add(V(0, 0.3, 0)), s.radius, { color: 'dust' });
        this.g.vfx.smokeAt(p, 14, [0.5, 0.45, 0.4], { size: 0.8, grow: 2.5, life: 1.3, speed: 4, up: 0.5 });
        this.g.vfx.ring(p, { radius: s.radius, color: [2.6, 2, 1.2], life: 0.5, width: 0.3 });
        for (const m of this.g.monsters.near(p, s.radius)) this._damage(m, s.mult, { knock: s.knock, stun: s.stun, heavy: true, hitStop: 0.1, from: p });
        this._shake(0.7);
        this.g.sfx?.slam();
      }
    }
    // The weapon's trail while it swings (and always while whirling).
    const sw = this.swing && this.t >= this.swing.from && this.t <= this.swing.to;
    if ((sw || this.spinning) && this.g.rig) {
      const pts = this.g.rig.weaponPoints();
      if (pts) this.g.vfx.trailPush('hero', pts.tip, pts.base, this.g.rig.trailColor, this.g.rig.trailStrength);
    }
    // The ward.
    if (this.wardT > 0) {
      this.wardT -= fdt;
      this.wardMesh.position.copy(h.pos).add(V(0, 1.0, 0));
      this.wardMesh.material.uniforms.uT.value = this.t;
      this.wardMesh.material.uniforms.uK.value = Math.min(1, this.wardT * 2) * (0.5 + 0.5 * Math.min(1, this.ward / (this.stats.maxHp * 0.2)));
      if (this.wardT <= 0) this.ward = 0;
    } else if (this.wardMesh) this.wardMesh.visible = false;
    this._projectiles(fdt);
    this._zones(fdt);
    this._lootFrame(dt);
    this._chestFrame(dt);
    // Glowing gear sheds motes.
    if (this.g.rig && Math.random() < 0.5) for (const m of this.g.rig.motes(1)) {
      const c = new THREE.Color(m.color ?? '#ffffff');
      this.g.vfx.burst(m.p, 1, [c.r * 2.2, c.g * 2.2, c.b * 2.2], { speed: 0.25, life: 0.9, size: 0.05, gravity: -0.4, drag: 2 });
    }
    // An animation that has run its course hands back to walking.
    const a = this.g.actor;
    if (a.overlay && !['Block', 'Draw', 'Whirl', 'JumpAir'].includes(a.overlay) && a.done() && this.t > (this.animEnd ?? 0)) a.rest(0.2);
    return fdt;
  }

  _projectiles(dt) {
    const foes = this.g.monsters.alive();
    const col = this.g.world.colliders;
    for (const p of this.projectiles) {
      const prev = p.p.clone();
      p.p.addScaledVector(p.v, dt);
      if (p.kind === 'arrow') p.v.y -= 2.5 * dt;
      p.life -= dt;
      if (p.mesh) {
        p.mesh.position.copy(p.p);
        p.mesh.lookAt(p.p.clone().add(p.v));
      }
      // Looks in flight.
      if (p.kind === 'bolt') {
        this.g.vfx.burst(p.p, 1, [3.4, 1.6, 0.4], { speed: 0, life: 0.06, size: 0.55, gravity: 0 });
        this.g.vfx.fire(p.p, 2, { size: 0.22, speed: 0.6, life: 0.35 });
      } else if (p.kind === 'mbolt') {
        this.g.vfx.burst(p.p, 1, p.color, { speed: 0, life: 0.06, size: 0.5, gravity: 0 });
        this.g.vfx.burst(p.p, 1, p.color, { speed: 0.6, life: 0.4, size: 0.12, gravity: 0 });
      } else if (p.glow) this.g.vfx.burst(p.p, 1, p.glow, { speed: 0.2, life: 0.25, size: 0.12, gravity: 0 });
      // The ground stops it.
      const ground = col.height(p.p.x, p.p.z);
      if (p.p.y < ground + 0.05 || p.life <= 0) {
        p.dead = true;
        if (p.kind === 'bolt') this._boltBurst(p, p.p);
        else if (p.kind === 'arrow' && p.burst) this._blast(p, p.p);
        else if (p.kind === 'arrow' && p.p.y < ground + 0.1) {
          this.g.vfx.smokeAt(p.p, 1, [0.5, 0.45, 0.4], { size: 0.2, grow: 0.6, life: 0.5, speed: 0.4, up: 0.2 });
          if (p.mesh) this.g.vfx.temp(p.mesh, 1.5);
          p.mesh = null;
        } else if (p.kind === 'mbolt') this.g.vfx.burst(p.p, 10, p.color, { speed: 3, life: 0.4, size: 0.1 });
        continue;
      }
      if (p.kind === 'mbolt') {
        const h = this.g.hero;
        const hp = h.pos.clone().add(V(0, 1, 0));
        if (distToSeg(hp, prev, p.p) < 0.65 && !this.dead) {
          p.dead = true;
          this.g.vfx.burst(p.p, 14, p.color, { speed: 4, life: 0.4, size: 0.12 });
          this.hitHero(p.m, p.attack, { from: { x: prev.x, z: prev.z }, poison: p.attack.poison });
          if (p.attack.slow) this.slowT = 2;
        }
        continue;
      }
      for (const m of foes) {
        if (p.hit.has(m) || !m.alive) continue;
        const c = this.g.monsters.centre(m);
        if (distToSeg(c, prev, p.p) > m.r + 0.25) continue;
        p.hit.add(m);
        if (p.kind === 'bolt') {
          this._boltBurst(p, p.p, m);
          p.dead = true;
          break;
        }
        if (p.burst) {
          this._blast(p, p.p);
          p.dead = true;
          break;
        }
        this._damage(m, p.mult, { knock: p.charge > 0.6 ? 3 : 0.8, heavy: p.charge > 0.8, hitStop: p.charge > 0.6 ? 0.06 : 0.025 });
        if (!p.pierce) {
          p.dead = true;
          if (p.mesh) {
            // The arrow sticks a moment where it struck.
            this.g.vfx.temp(p.mesh, 0.6);
            p.mesh = null;
          }
          break;
        }
      }
    }
    for (const p of this.projectiles) if (p.dead && p.mesh) p.mesh.removeFromParent();
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  _boltBurst(p, at, direct = null) {
    const s = p.skill;
    this.g.vfx.explode(at, s.splash, { color: 'fire' });
    this.g.vfx.fire(at, 10, { size: 0.4 });
    this.g.sfx?.boom(0.5);
    for (const m of this.g.monsters.near(at, s.splash)) this._damage(m, m === direct ? s.mult : s.mult * 0.5, { spell: true, burn: s.burn, quiet: m !== direct, hitStop: 0.04 });
  }

  _blast(p, at) {
    const s = p.skill;
    this.g.vfx.explode(at, s.burst, { color: 'fire' });
    this.g.vfx.glowDecal({ x: at.x, z: at.z, radius: s.burst * 0.9, color: '#ff5a1a', alpha: 0.5, life: 2 });
    this.g.sfx?.boom(0.8);
    this._shake(0.25);
    for (const m of this.g.monsters.near(at, s.burst)) this._damage(m, s.mult * s.burstMult, { burn: 3, knock: 3, hitStop: 0.05, from: at });
  }

  _zones(dt) {
    for (const z of this.zones) {
      if (z.kind === 'rain') {
        const s = z.s;
        // Arrows falling: streaks from the sky.
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * TAU;
          const r = Math.sqrt(Math.random()) * s.radius;
          const x = z.x + Math.cos(a) * r;
          const zz = z.z + Math.sin(a) * r;
          const y = this.g.world.colliders.height(x, zz);
          this.g.vfx.sparks.push({ p: V(x + 1.5, y + 9, zz + 0.8), v: V(-5, -30, -2.7), life: 0, max: 0.3, color: [1.2, 1.1, 0.9], gravity: 0, width: 0.03 });
          if (Math.random() < 0.3) this.g.vfx.smokeAt(V(x, y + 0.05, zz), 1, [0.5, 0.45, 0.4], { size: 0.2, grow: 0.5, life: 0.4, speed: 0.4, up: 0.2 });
        }
        if (this.t >= z.next) {
          z.next = this.t + s.tick;
          for (const m of this.g.monsters.near({ x: z.x, z: z.z }, s.radius)) this._damage(m, s.mult, { slow: s.slow, slowT: 1, hitStop: 0, quiet: Math.random() < 0.6 });
          this.g.sfx?.thunk();
        }
        if (this.t >= z.until) z.dead = true;
      } else if (z.kind === 'meteor') {
        const k = Math.min(1, (this.t - z.t0) / z.s.delay);
        const end = V(z.x, z.y, z.z);
        z.rock.position.lerpVectors(z.start, end, k * k);
        z.rock.rotation.x += dt * 4;
        z.rock.rotation.y += dt * 3;
        this.g.vfx.fire(z.rock.position, 6, { size: 0.9, speed: 1.2, life: 0.5 });
        this.g.vfx.smokeAt(z.rock.position, 1, [0.25, 0.2, 0.18], { size: 1, grow: 2, life: 1.2, speed: 0.4, up: 0.4, alpha: 0.5 });
        if (k >= 1) {
          z.dead = true;
          z.rock.removeFromParent();
          const s = z.s;
          this.g.vfx.explode(end.clone().add(V(0, 0.4, 0)), s.radius, { color: 'fire' });
          this.g.vfx.explode(end.clone().add(V(0, 1.4, 0)), s.radius * 0.6, { color: 'fire' });
          this.g.vfx.ring(end, { radius: s.radius * 1.6, color: [3, 1.4, 0.4], life: 0.6, width: 0.4 });
          this.g.vfx.glowDecal({ x: z.x, z: z.z, radius: s.radius, color: '#ff4a10', alpha: 0.75, life: s.burnTime + 0.6 });
          this.g.vfx.sparksAt(end.clone().add(V(0, 0.5, 0)), 50, [3, 1.4, 0.3], { speed: 16, life: 0.9, gravity: 12 });
          for (const m of this.g.monsters.near(end, s.radius)) this._damage(m, s.mult, { spell: true, knock: 6, stun: 0.6, heavy: true, hitStop: 0.12, from: end, burn: 3 });
          this._shake(0.9);
          this.g.sfx?.boom(1.4);
          this.zones.push({ kind: 'burn', s, x: z.x, z: z.z, until: this.t + s.burnTime, next: this.t + 0.5 });
        }
      } else if (z.kind === 'burn') {
        if (Math.random() < 0.7) {
          const a = Math.random() * TAU;
          const r = Math.sqrt(Math.random()) * z.s.radius;
          const x = z.x + Math.cos(a) * r;
          const zz = z.z + Math.sin(a) * r;
          this.g.vfx.fire(V(x, this.g.world.colliders.height(x, zz) + 0.1, zz), 2, { size: 0.35, speed: 0.8, life: 0.7 });
        }
        if (this.t >= z.next) {
          z.next = this.t + 0.5;
          for (const m of this.g.monsters.near({ x: z.x, z: z.z }, z.s.radius)) this._damage(m, z.s.burnMult, { spell: true, hitStop: 0, quiet: true });
        }
        if (this.t >= z.until) z.dead = true;
      }
    }
    this.zones = this.zones.filter((z) => !z.dead);
  }

  /** A monster's missile (from monsters.js). */
  monsterShot(m, attack, from, to, off = 0) {
    const target = to ?? from.clone().add(V(Math.sin(m.yaw), 0, Math.cos(m.yaw)).multiplyScalar(10));
    const dir = target.clone().sub(from).normalize();
    if (off) dir.applyAxisAngle(V(0, 1, 0), off);
    const c = new THREE.Color(attack.color ?? '#e070ff');
    this.projectiles.push({ kind: 'mbolt', m, attack, p: from.clone(), v: dir.multiplyScalar(attack.speed), life: (attack.range * 1.4) / attack.speed, color: [c.r * 2.4, c.g * 2.4, c.b * 2.4], hit: new Set() });
  }

  _lootFrame(dt) {
    const h = this.g.hero.pos;
    for (const l of this.loot) {
      if (l.gone) continue;
      const k = Math.min(1, (this.t - l.t0) / 0.6);
      const x = l.from.x + (l.x - l.from.x) * k;
      const z = l.from.z + (l.z - l.from.z) * k;
      const y = l.from.y + (l.y - l.from.y) * k + Math.sin(k * Math.PI) * 1.4;
      l.obj.position.set(x, y + (k >= 1 ? 0.25 + Math.sin(this.t * 2 + l.spin) * 0.05 : 0.3), z);
      if (l.model) {
        l.model.rotation.set(Math.PI / 2 * 0.85, this.t * 0.8 + l.spin, 0);
      } else l.obj.rotation.y += dt * 2;
      const d = Math.hypot(h.x - x, h.z - z);
      // Gold and potions drift to a hero close by; things to wear wait to be walked over.
      if (k >= 1 && l.kind !== 'item' && d < 4.5 && d > 0.5) {
        const pull = Math.min(1, dt * 6 / d);
        l.x += (h.x - l.x) * pull;
        l.z += (h.z - l.z) * pull;
        l.y = this.g.world.colliders.height(l.x, l.z);
        l.from.set(l.x, l.y, l.z);
      }
      if (k >= 1 && d < (l.kind === 'item' ? 1.8 : 0.9) && !this.dead) this._pickup(l);
      else if (l.warned && d > 2.5) l.warned = false;
    }
    this.loot = this.loot.filter((l) => !l.gone && this.t - l.t0 < 600);
  }

  _chestFrame(dt) {
    for (const c of this.chests) {
      if (c.opened) {
        const k = Math.min(1, (this.t - c.openedAt) / 0.5);
        c.lid.rotation.x = -k * 1.9;
        const sink = Math.max(0, this.t - c.openedAt - CHEST_VANISH + 0.8);
        c.obj.position.y = c.y - sink * 1.2;
        if (sink > 0 && Math.random() < 0.5) this.g.vfx.smokeAt(V(c.x, c.y + 0.1, c.z), 1, [0.5, 0.45, 0.4], { size: 0.5, grow: 1, life: 0.7, speed: 0.6, up: 0.3 });
      } else if (Math.random() < dt * 4) this.g.vfx.burst(V(c.x + rnd(-0.4, 0.4), c.y + 0.6, c.z + rnd(-0.3, 0.3)), 1, [2.6, 2, 0.8], { speed: 0.3, life: 1, size: 0.06, gravity: -0.6 });
      if (chestGone(c, this.t)) {
        c.gone = true;
        c.obj.removeFromParent();
        c.glow.remove();
      }
    }
    this.chests = this.chests.filter((c) => !c.gone);
  }

  /* ------------------------------------------------------------ HUD state */

  /** What the skill bar shows: per key, the skill, its cooldown fraction, and whether it can be paid for. */
  bar() {
    return BAR_KEYS.map((key) => {
      const s = this._skill(key);
      return { key, skill: s, cd: s ? this.cd.frac(s.id, this.t) : 0, left: s ? this.cd.left(s.id, this.t) : 0, afford: s ? this.res >= s.cost : false, active: (s?.kind === 'block' && this.blocking) || (s?.kind === 'charge-arrow' && this.drawT >= 0) || (s?.kind === 'spin' && this.spinning) };
    });
  }

  vitals() {
    const p = this.profile;
    return { hp: this.hp, maxHp: this.stats.maxHp, res: this.res, maxRes: this.stats.maxRes, resource: this.stats.resource, level: p.level, xp: p.xp, next: xpToNext(p.level), gold: p.gold, hpPots: countOf(p.bag, 'hp'), mpPots: countOf(p.bag, 'mp'), ward: this.ward, draw: this.drawT >= 0 ? Math.min(1, this.drawT / SKILLS.charged.chargeTime) : -1 };
  }

  save() {
    this.g.onSave?.();
  }

  dispose() {
    for (const p of this.projectiles) p.mesh?.removeFromParent();
    for (const l of this.loot) l.obj.removeFromParent();
    for (const c of this.chests) {
      c.obj.removeFromParent();
      c.glow.remove();
    }
    for (const z of this.zones) z.rock?.removeFromParent();
    this.wardMesh?.removeFromParent();
  }
}

/** Distance from point p to segment ab. */
function distToSeg(p, a, b) {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq())));
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

void glows;
