/**
 * Lanternwood — the hero's side of a fight: the basic attack of whatever
 * weapon is held (a sword's sweeps, a dagger's jabs, an axe's heavy arcs, a
 * spear's thrusts, a staff's bolts, a bow's shots), the four skills of each
 * class, the roll, potions and food, missiles, lingering zones (a blizzard,
 * arrow rain, a healing totem, a snare), taking hits, and what a kill gives:
 * XP, gold and loot (each player rolls their own). A mixin on the game.
 */
import * as THREE from 'three';
import * as R from './rules.js';
import { FxBillboard } from './gfx.js';
import { iconCanvas } from './sprites.js';
import { lootBeam } from './props.js';

const TAU = Math.PI * 2;
const HERO_R = 0.42;
const dirOf = (a) => [Math.sin(a), Math.cos(a)];
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
const ICE_RAMP = ['#0e1a3a', '#14306a', '#1e5a94', '#2a86c8', '#4ab0e8', '#7fd8ff', '#b8f0ff', '#e8fcff', '#ffffff'];
const ARCANE_RAMP = ['#1a0e3a', '#2a1a6a', '#4a2a9a', '#6a44c8', '#8a6ae8', '#b09aff', '#d8c8ff', '#f0e8ff', '#ffffff'];
const STRIKE_COLORS = [new THREE.Color(2.4, 2.1, 1.4), new THREE.Color(1.3, 2.1, 2.6), new THREE.Color(2.8, 1.4, 0.5), new THREE.Color(2.2, 2.4, 1.2)];

export const CombatMixin = {
  /** Run something a moment from now (on the game's clock, so pauses and hit-stops hold it). */
  _later(delay, fn) {
    this.pending.push({ at: this.t + delay, fn });
  },

  _canAct() {
    return this.mode === 'play' && !this.overlay && !this.dialogue.open && this.hv.roll <= 0 && !this.hv.dash;
  },

  get weaponType() {
    return R.BASES[this.hero.equip.weapon?.base]?.wtype ?? 'fists';
  },

  /** Turn toward a foe close in front (a little aim help). */
  _aim(range, cone) {
    const near = this._nearestEnemy(range, cone);
    if (near) this.heroPos.face = Math.atan2(near.x - this.heroPos.x, near.z - this.heroPos.z);
    return near;
  },

  _nearestEnemy(range, cone = Math.PI) {
    let best = null, bd = Infinity;
    const [fx, fz] = dirOf(this.heroPos.face);
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'burrowed') continue;
      const dx = e.x - this.heroPos.x, dz = e.z - this.heroPos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.def.radius) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1))));
      if (ang > cone / 2) continue;
      if (d < bd) [bd, best] = [d, e];
    }
    return best;
  },

  /** Foes in an arc in front of (x, z) facing `face`. */
  _foesInArc(x, z, face, range, arc) {
    const [gx, gz] = dirOf(face);
    return this.enemies.filter((e) => {
      if (!e.alive || e.state === 'burrowed') return false;
      const dx = e.x - x, dz = e.z - z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.def.radius) return false;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * gx + dz * gz) / (d || 1))));
      return ang <= arc / 2 || d < 0.9;
    });
  },

  _foesInRadius(x, z, r) {
    return this.enemies.filter((e) => e.alive && e.state !== 'burrowed' && Math.hypot(e.x - x, e.z - z) <= r + e.def.radius);
  },

  /**
   * The hero hits a foe: damage from attack (× spell power for spells), a
   * crit chance, life steal; shown at once. Alone or hosting, it lands for
   * real; as a guest it is sent to the host, who owns the monster's health.
   */
  _hitFoe(e, mult, knock, { spell = false, effect = null, effectT = 0, from = this.heroPos } = {}) {
    if (!e.alive) return;
    const s = this.stats;
    const { amount, crit } = R.damage(s.atk * (spell ? s.spell : 1), e.st?.def ?? e.def.def, mult, Math.random, s.crit);
    const dx = e.x - from.x, dz = e.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    const kx = (dx / d) * knock * 3, kz = (dz / d) * knock * 3;
    this.hud.number(String(amount), crit ? 'crit' : 'hit', { x: e.x, y: e.actor.height + 0.4, z: e.z });
    this.fx(crit ? 'impacts/crit-hit' : 'impacts/hit-spark', e.x - Math.sin(this.camYaw) * 0.3, e.actor.height * 0.45, e.z - Math.cos(this.camYaw) * 0.3, { pxm: crit ? 70 : 52, color: 1.8, speed: 1.5, flip: Math.random() < 0.5 });
    this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035);
    this.shake = Math.max(this.shake, crit ? 0.22 : 0.1);
    this.comboHits = (this.comboHits ?? 0) + 1;
    this.comboHitT = 1.6;
    this.hud.combo?.(this.comboHits);
    if (s.leech) this.hero.hp = Math.min(s.maxHp, this.hero.hp + amount * s.leech);
    if (effect === 'stun') this.fx('status/stunned', e.x, e.actor.height + 0.1, e.z, { pxm: 50, color: 1.4 });
    if (this.net?.isGuest) {
      this.net.hit(e, amount, crit, kx, kz, effect, effectT);
      e.hp = Math.max(1, e.hp - amount);
      e.actor.flash = 0.1;
      e.reel = 1;
    } else this._applyDamage(e, amount, crit, kx, kz, effect, effectT, null, 'me');
  },

  /* -------------------------------------------------------- basic attack */

  /** The basic attack (Space / click): the held weapon's combo — strikes chain if pressed in time. */
  basic() {
    if (!this._canAct() || this.cd.basic > 0) return;
    const combo = R.comboFor(this.weaponType);
    const chain = this.t < (this.comboUntil ?? 0) ? (this.comboStage ?? 0) % combo.length : 0;
    const st = combo[chain];
    const stage = chain + 1;
    this.comboStage = stage;
    this.cd.basic = st.cd;
    this.comboUntil = this.t + st.dur + 0.45;
    const color = STRIKE_COLORS[chain % STRIKE_COLORS.length];
    if (st.proj) {
      const target = this._aim(st.range, Math.PI * 0.5);
      void target;
      this.hv.attack = st.dur * 0.7;
      this.hv.swing = { pose: st.pose, t: 0, dur: st.dur, color };
      const loose = st.proj === 'arrow' ? st.dur * (st.pose === 'power' ? 0.72 : 0.55) : st.dur * 0.4;
      this._later(loose, () => {
        if (this.mode !== 'play') return;
        const n = st.count ?? 1;
        for (let i = 0; i < n; i++) {
          const a = this.heroPos.face + (n > 1 ? (i - (n - 1) / 2) * st.spread : 0);
          const [dx, dz] = dirOf(a);
          const tip = this.heroActor.tip;
          const y = st.proj === 'bolt' ? Math.max(0.9, Math.min(1.8, tip.y)) : 1.15;
          this._projectile(st.proj, this.heroPos.x + dx * 0.6, y, this.heroPos.z + dz * 0.6, dx, dz, st.speed, { owner: 'me', mult: st.mult, pierce: Boolean(st.pierce), life: st.range / st.speed, spell: st.proj === 'bolt', knock: 2.5 });
        }
        if (st.proj === 'bolt') this.fx('arcane/mana-burst', this.heroActor.tip.x, this.heroActor.tip.y - 0.4, this.heroActor.tip.z, { pxm: 140, color: 1.2, speed: 2.4 });
      });
      this.net?.mine({ k: 'swing', p: st.pose });
      return;
    }
    this._aim(Math.max(3.4, st.range + 0.6), Math.PI * 0.9);
    this.hv.attack = st.dur * 0.8;
    this.hv.swing = { pose: st.pose, t: 0, dur: st.dur, color };
    const [fx, fz] = dirOf(this.heroPos.face);
    if (st.lunge) {
      this.hv.kx += fx * st.lunge;
      this.hv.kz += fz * st.lunge;
    }
    const heavy = ['smash', 'heavyR', 'heavyL'].includes(st.pose);
    this._later(st.dur * (heavy ? 0.55 : 0.4), () => {
      if (this.mode !== 'play') return;
      const thrust = ['thrust', 'stab', 'jabR', 'jabL'].includes(st.pose);
      this._slashArc(this.heroPos.face, st.arc, st.range + 0.1, false, st.pose === 'smash' ? 3 : st.pose === 'sweepL' || st.pose === 'heavyL' ? 2 : 1, thrust);
      this.net?.mine({ k: 'arc', f: Math.round(this.heroPos.face * 100) / 100, a: Math.round(st.arc * 100) / 100, r: st.range, s: st.pose === 'smash' ? 3 : 1, th: thrust ? 1 : 0 });
      const hits = this._foesInArc(this.heroPos.x, this.heroPos.z, this.heroPos.face, st.range, st.arc);
      for (const e of hits) this._hitFoe(e, st.mult, st.knock);
      if (st.pose === 'smash') {
        const [gx, gz] = dirOf(this.heroPos.face);
        this.fx('impacts/ground-slam', this.heroPos.x + gx * 1.6, 0.05, this.heroPos.z + gz * 1.6, { pxm: 60, color: 1.3, speed: 1.6 });
        this.shake = Math.max(this.shake, hits.length ? 0.45 : 0.28);
      }
    });
    this.net?.mine({ k: 'swing', p: st.pose });
  },

  /* ------------------------------------------------------------- skills */

  /** The skill on key 1–4 of the hero's class. */
  castSkill(key) {
    const id = R.skillOnKey(this.hero.cls, key);
    if (!id || !this._canAct()) return;
    const sk = R.SKILLS[id];
    const ok = R.canCast(id, this.hero.mp, this.cd[id] ?? 0);
    if (!ok.ok) {
      if (ok.reason === 'resource') this.hud.toast(this.stats.resource === 'energy' ? 'Not enough energy' : 'Not enough mana', 'warn');
      return;
    }
    if (sk.kind === 'bash' && !this.hero.equip.offhand) {
      this.hud.toast('You need a shield for that', 'warn');
      return;
    }
    this.hero.mp -= sk.cost;
    this.cd[id] = sk.cd;
    const h = this.heroPos;
    const pose = (p, dur) => {
      this.hv.pose = { id: p, t: 0, dur };
      this.hv.attack = Math.max(this.hv.attack, dur * 0.8);
    };
    const face = () => dirOf(h.face);
    this.net?.mine({ k: 'skill', id });
    switch (id) {
      case 'lunge': {
        this._aim(sk.range, Math.PI * 0.5);
        const [dx, dz] = face();
        pose('lunge', 0.34);
        this.hv.dash = { t: 0, dur: 0.24, dx, dz, speed: sk.range / 0.24, hit: new Set(), sk };
        this.fx('moves/dash-strike', h.x + dx * 2, 0.3, h.z + dz * 2, { pxm: 44, color: 1.4, speed: 1.6 });
        break;
      }
      case 'whirl':
        this.hv.attack = 0.35;
        this.hv.spin = 0.4;
        this._slashArc(h.face, TAU, sk.radius, true);
        this.fx('melee/spin-slash', h.x, 0.15, h.z, { pxm: 40, color: 1.2, speed: 1.4 });
        this.shake = Math.max(this.shake, 0.25);
        for (const e of this._foesInRadius(h.x, h.z, sk.radius)) this._hitFoe(e, sk.mult, sk.knock);
        break;
      case 'cleave':
        this._aim(sk.range, Math.PI * 0.7);
        pose('overhead', 0.55);
        this._later(0.3, () => {
          const [dx, dz] = face();
          this.fx('melee/heavy-cleave', h.x + dx * 1.6, 0.2, h.z + dz * 1.6, { pxm: 36, color: 1.5, speed: 1.5 });
          this.fx('fire/fire-breath', h.x + dx * 2.4, 0.1, h.z + dz * 2.4, { pxm: 30, color: 1.4, speed: 1.6, palette: FIRE_RAMP });
          this._slashArc(h.face, sk.arc, sk.range, false, 3);
          this.shake = Math.max(this.shake, 0.35);
          for (const e of this._foesInArc(h.x, h.z, h.face, sk.range, sk.arc)) this._hitFoe(e, sk.mult, sk.knock, { spell: true, effect: 'burn', effectT: sk.burn });
          this.net?.mine({ k: 'fx', id: 'fire/fire-breath', x: h.x + dx * 2.4, z: h.z + dz * 2.4, p: 30 });
        });
        break;
      case 'fireball': {
        this._aim(sk.range, Math.PI * 0.45);
        const [dx, dz] = face();
        this.hv.attack = 0.18;
        this.hv.cast = 0.32;
        this._projectile('fire', h.x + dx * 0.7, 1.0, h.z + dz * 0.7, dx, dz, sk.speed, { owner: 'me', mult: sk.mult, spell: true, radius: sk.radius, knock: sk.knock, life: sk.range / sk.speed });
        break;
      }
      case 'bash':
        this._aim(sk.range + 1, Math.PI * 0.6);
        pose('bash', 0.4);
        this._later(0.15, () => {
          const hits = this._foesInArc(h.x, h.z, h.face, sk.range, sk.arc);
          for (const e of hits) this._hitFoe(e, sk.mult, sk.knock, { effect: 'stun', effectT: sk.stun });
          const [dx, dz] = face();
          this.fx('impacts/shield-block', h.x + dx * 1.2, 0.9, h.z + dz * 1.2, { pxm: 46, color: 1.5, speed: 1.4 });
          this.shake = Math.max(this.shake, hits.length ? 0.35 : 0.15);
        });
        break;
      case 'guard':
        this.buffs.guard = sk.time;
        this.fx('holy/divine-shield', h.x, 0, h.z + 0.05, { pxm: 44, color: 1.3, speed: 1.2 });
        // Foes close by turn on the guard (the host's monsters read it from the party too).
        if (!this.net?.isGuest) for (const e of this._foesInRadius(h.x, h.z, sk.taunt)) {
          e.target = { id: 'me', x: h.x, z: h.z };
          if (e.state === 'idle' || e.state === 'return') e.state = 'chase';
        }
        break;
      case 'totem':
        pose('plant', 0.5);
        this._zone({ kind: 'totem', x: h.x + dirOf(h.face)[0] * 1.2, z: h.z + dirOf(h.face)[1] * 1.2, r: sk.radius, life: sk.time, tick: 1, heal: sk.heal, owner: 'me' });
        break;
      case 'quake':
        pose('slam', 0.6);
        this._later(0.42, () => {
          this.fx('impacts/ground-slam', h.x, 0.05, h.z, { pxm: 30, color: 1.2, speed: 1.4 });
          this.fx('nature/quake', h.x, 0, h.z, { pxm: 26, additive: false, color: 0.9, speed: 1.4 });
          this.shake = Math.max(this.shake, 0.5);
          for (const e of this._foesInRadius(h.x, h.z, sk.radius)) this._hitFoe(e, sk.mult, sk.knock, { effect: 'slow', effectT: sk.slowT });
          this.net?.mine({ k: 'fx', id: 'impacts/ground-slam', x: h.x, z: h.z, p: 30 });
        });
        break;
      case 'nova':
        pose('nova', 0.45);
        this.fx('ice/frost-nova', h.x, 0, h.z, { pxm: 24, color: 1.3, speed: 1.3, palette: ICE_RAMP });
        this.shake = Math.max(this.shake, 0.25);
        for (const e of this._foesInRadius(h.x, h.z, sk.radius)) this._hitFoe(e, sk.mult, sk.knock, { spell: true, effect: 'slow', effectT: sk.slowT });
        break;
      case 'blink': {
        pose('cast', 0.3);
        const [dx, dz] = face();
        this.fx('arcane/blink-out', h.x, 0, h.z, { pxm: 40, color: 1.4, palette: ARCANE_RAMP });
        let best = [h.x, h.z];
        for (let d = sk.range; d > 0.5; d -= 0.5) {
          const [nx, nz] = R.resolveCollision(h.x + dx * d, h.z + dz * d, HERO_R, this._nearSolids(h.x + dx * d, h.z + dz * d), this.realmDef.radius);
          if (Math.hypot(nx - (h.x + dx * d), nz - (h.z + dz * d)) < 0.05) {
            best = [nx, nz];
            break;
          }
        }
        [h.x, h.z] = best;
        this.hv.inv = Math.max(this.hv.inv, 0.3);
        this.fx('arcane/blink-in', h.x, 0, h.z, { pxm: 40, color: 1.4, palette: ARCANE_RAMP });
        break;
      }
      case 'lance': {
        this._aim(sk.range, Math.PI * 0.4);
        pose('thrust', 0.32);
        const [dx, dz] = face();
        this._later(0.1, () => this._projectile('lance', h.x + dx * 0.8, 1.2, h.z + dz * 0.8, dx, dz, sk.speed, { owner: 'me', mult: sk.mult, spell: true, pierce: true, knock: sk.knock, life: sk.range / sk.speed, effect: 'slow', effectT: 1 }));
        break;
      }
      case 'blizzard':
      case 'rain': {
        const t = this._aim(sk.range + 2, Math.PI * 0.6);
        const [dx, dz] = face();
        const d = t ? Math.min(sk.range, Math.hypot(t.x - h.x, t.z - h.z)) : sk.range * 0.7;
        pose(id === 'blizzard' ? 'raise' : 'skyshot', 0.5);
        this._zone({ kind: id, x: h.x + dx * d, z: h.z + dz * d, r: sk.radius, life: sk.time, tick: sk.tick, mult: sk.mult, slow: sk.slow, slowT: sk.slowT, owner: 'me', spell: id === 'blizzard' });
        break;
      }
      case 'volley':
        this._aim(sk.range, Math.PI * 0.5);
        pose('draw', 0.4);
        this._later(0.22, () => {
          for (let i = 0; i < sk.count; i++) {
            const a = h.face + (i - (sk.count - 1) / 2) * (sk.spread / (sk.count - 1));
            const [dx, dz] = dirOf(a);
            this._projectile('arrow', h.x + dx * 0.6, 1.15, h.z + dz * 0.6, dx, dz, sk.speed, { owner: 'me', mult: sk.mult, knock: sk.knock, life: sk.range / sk.speed });
          }
        });
        break;
      case 'trap':
        pose('plant', 0.45);
        this._zone({ kind: 'trap', x: h.x, z: h.z, r: sk.radius, life: sk.life, tick: 0.1, mult: sk.mult, root: sk.root, owner: 'me' });
        break;
      case 'rollshot': {
        const [fx, fz] = face();
        this.hv.roll = R.ABILITIES.roll.time;
        this.hv.rdx = -fx;
        this.hv.rdz = -fz;
        this.hv.rollFace = h.face;
        this.fx('spawn/poof', h.x, 0, h.z, { pxm: 140, additive: false, color: 0.7, speed: 2.4 });
        this._later(R.ABILITIES.roll.time + 0.02, () => {
          if (this.mode !== 'play') return;
          this._aim(sk.range, Math.PI * 0.5);
          this.hv.swing = { pose: 'power', t: 0.72, dur: 0.3, color: STRIKE_COLORS[3] };
          const [dx, dz] = dirOf(h.face);
          this._projectile('arrow', h.x + dx * 0.6, 1.15, h.z + dz * 0.6, dx, dz, sk.speed, { owner: 'me', mult: sk.mult, pierce: true, knock: 4, life: sk.range / sk.speed });
        });
        break;
      }
      default:
    }
  },

  roll() {
    if (this.mode !== 'play' || this.overlay || this.dialogue.open || this.cd.roll > 0 || this.hv.roll > 0) return;
    const a = R.ABILITIES.roll;
    const [mx, mz] = this._moveInput();
    let dx, dz;
    if (mx || mz) [dx, dz] = [mx, mz];
    else [dx, dz] = dirOf(this.heroPos.face);
    this.heroPos.face = Math.atan2(dx, dz);
    this.hv.roll = a.time;
    this.hv.rdx = dx;
    this.hv.rdz = dz;
    this.hv.rollFace = null;
    this.cd.roll = a.cd;
    this.fx('spawn/poof', this.heroPos.x, 0, this.heroPos.z, { pxm: 140, additive: false, color: 0.7, speed: 2.4 });
  },

  /** Potions: no cooldown — each press drinks one, if there is one. */
  drink(kind) {
    if (this.mode !== 'play' || this.dialogue.open) return;
    const r = R.drinkPotion(this.hero, kind);
    if (!r.ok) {
      this.hud.toast(kind === 'hp' ? 'No health potions — a trader sells them' : 'No mana potions — a trader sells them', 'warn');
      return;
    }
    const p = { x: this.heroPos.x, y: 1.9, z: this.heroPos.z };
    this.hud.number(`+${r.restored}`, kind === 'hp' ? 'heal' : 'mana', p);
    if (kind === 'hp') this.fx('holy/heal', this.heroPos.x, 0, this.heroPos.z + 0.05, { pxm: 46, color: 1.5, speed: 1.6 });
    else this.fx('arcane/mana-burst', this.heroPos.x, 0.1, this.heroPos.z + 0.05, { pxm: 80, color: 1.3, speed: 1.6 });
    this._refreshBag?.();
  },

  /** Use a consumable from the bag (food, scrolls, potions). */
  use(kind) {
    if (this.mode !== 'play') return;
    if (kind === 'hp' || kind === 'mp') return this.drink(kind);
    const r = R.useConsumable(this.hero, kind);
    if (!r.ok) return;
    if (r.effect === 'regen') {
      this.buffs.regen = { rate: r.amount / r.time, t: r.time };
      this.hud.log(`${R.CONSUMABLES[kind].name}: healing over ${r.time} s`);
      this.fx('holy/heal', this.heroPos.x, 0, this.heroPos.z + 0.05, { pxm: 56, color: 1.2, speed: 1.2 });
    } else if (r.effect === 'fury' || r.effect === 'ward') {
      this.buffs[r.effect] = r.time;
      this.hud.toast(r.effect === 'fury' ? '<b>Fury</b> — +30 % attack for 30 s' : '<b>Warding</b> — +40 % defence for 30 s', 'gold');
      this.fx(r.effect === 'fury' ? 'status/rage' : 'holy/blessing', this.heroPos.x, 0.2, this.heroPos.z, { pxm: 40, color: 1.3 });
    } else if (r.effect === 'return') {
      this.travel(this.realm, { toWaystone: true });
    }
    this._refreshBag?.();
  },

  /** Eat the best food in the bag (key 7). */
  eat() {
    const food = ['stew', 'bread'].find((k) => R.countOf(this.hero.bag, k) > 0);
    if (!food) return this.hud.toast('No food in your bag', 'warn');
    this.use(food);
  },

  /* ---------------------------------------------------------- visuals */

  _slashArc(face, arc, radius, full, stage = 1, thrust = false, at = this.heroPos) {
    const SEG = 28;
    const geo = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    const inner = radius * (full ? 0.62 : thrust ? 0.3 : 0.72);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const a = -arc / 2 + arc * u;
      for (const [r, v] of [[inner, 0], [radius, 1]]) {
        pos.push(Math.sin(a) * r, 0, Math.cos(a) * r);
        uv.push(u, v);
      }
      if (i < SEG) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: this.arcTex, color: new THREE.Color(full ? '#a8e8ff' : '#fff0c8').multiplyScalar(full ? 0.8 : 1.2), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(at.x, 0.85, at.z);
    m.rotation.set(0, face, 0);
    if (!full && stage === 2) m.scale.x = -1;
    if (!full && stage === 3) m.rotateZ(Math.PI / 2);
    m.rotateX(full ? 0 : stage === 3 ? 0 : stage === 2 ? 0.25 : -0.25);
    m.renderOrder = 6;
    geo.setDrawRange(0, 0);
    this.scene.add(m);
    this.effects.push({ arc: m, t: 0, life: full ? 0.38 : 0.26, seg: SEG, full, fx: { dispose: () => { geo.dispose(); mat.dispose(); m.removeFromParent(); } } });
  },

  /* ---------------------------------------------------------- missiles */

  /**
   * A missile. `owner` 'me' (it hurts monsters), 'foe' (it hurts heroes — for
   * real alone or hosting, only drawn as a guest), 'peer' (another player's, drawn only).
   */
  _projectile(kind, x, y, z, dx, dz, speed, { owner = 'me', from = null, life = 3, pierce = false, mult = 1, radius = 0, knock = 3, spell = false, effect = null, effectT = 0 } = {}) {
    const g = this._missileMesh(kind);
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(dx, dz);
    this.scene.add(g);
    const p = { kind, owner, from, x, y, z, dx, dz, speed, life, pierce, mult, radius, knock, spell, effect, effectT, group: g, hit: new Set() };
    this.projectiles.push(p);
    if (owner === 'me' && this.net) this.net.mine({ k: 'proj', kind, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, a: Math.round(Math.atan2(dx, dz) * 100) / 100, s: speed, l: Math.round(life * 10) / 10 });
    return p;
  },

  _dropProjectile(p) {
    p.group.traverse((o) => {
      if (o.isMesh && o.material && !o.userData.shared) o.material.dispose?.();
      if (o.isSprite) o.material.dispose();
    });
    p.group.removeFromParent();
  },

  updateProjectiles(dt) {
    const simulate = !this.net?.isGuest;
    this.projectiles = this.projectiles.filter((p) => {
      p.x += p.dx * p.speed * dt;
      p.z += p.dz * p.speed * dt;
      p.life -= dt;
      p.group.position.set(p.x, p.y + Math.sin(this.t * 20) * 0.03, p.z);
      if (p.group.userData.glow) p.group.userData.glow.material.rotation += dt * 4;
      let hit = p.life <= 0;
      if (!hit) for (const s of this._nearSolids(p.x, p.z)) if (s.r > 0.3 && Math.hypot(p.x - s.x, p.z - s.z) < s.r + 0.1) hit = true;
      if (p.owner === 'me' || p.owner === 'peer') {
        if (!hit) {
          for (const e of this.enemies) {
            if (!e.alive || e.state === 'burrowed' || p.hit.has(e) || Math.hypot(e.x - p.x, e.z - p.z) > 0.55 + e.def.radius) continue;
            p.hit.add(e);
            if (p.owner === 'me') {
              if (p.kind === 'fire') {
                hit = true;
                break;
              }
              this._hitFoe(e, p.mult, p.knock, { spell: p.spell, effect: p.effect, effectT: p.effectT, from: { x: p.x - p.dx, z: p.z - p.dz } });
              if (p.kind === 'lance') this.fx('ice/ice-shatter', e.x, 0.6, e.z, { pxm: 50, color: 1.4, palette: ICE_RAMP });
            }
            if (!p.pierce) {
              hit = true;
              break;
            }
          }
        }
        if (hit && p.kind === 'fire') {
          if (p.owner === 'me') for (const e of this._foesInRadius(p.x, p.z, p.radius)) this._hitFoe(e, p.mult, p.knock, { spell: true, from: { x: p.x, z: p.z } });
          this.fx('explosions/small-explosion', p.x, 0, p.z, { pxm: 80, color: 1.3, speed: 2.6, palette: FIRE_RAMP });
        }
        if (hit && p.kind === 'bolt') this.fx('impacts/hit-spark', p.x, p.y, p.z, { pxm: 60, color: 1.6, palette: ARCANE_RAMP });
      } else if (!hit) {
        // A monster's missile: alone or hosting, it hurts whoever it reaches; as a guest it only flies.
        for (const h of simulate ? this._heroes() : [{ id: 'me', x: this.heroPos.x, z: this.heroPos.z }]) {
          if (Math.hypot(h.x - p.x, h.z - p.z) > 0.75) continue;
          if (simulate && p.from) this._foeHits(p.from, h, p.from.def.boss ? 0.7 : 1);
          hit = true;
          break;
        }
      }
      if (hit) this._dropProjectile(p);
      return !hit;
    });
    // The newest fireball lights the world as it flies.
    const fb = [...this.projectiles].reverse().find((p) => p.kind === 'fire' || p.kind === 'fireorb');
    if (fb) {
      this.projLight.position.set(fb.x, fb.y, fb.z);
      this.projLight.intensity = 14;
    } else this.projLight.intensity = Math.max(0, this.projLight.intensity - dt * 60);
  },

  /* -------------------------------------------------------------- zones */

  /** A lingering area: a blizzard or arrow rain (damage ticks), a totem (heals), a snare (waits). */
  _zone(z) {
    const zone = { ...z, t: 0, acc: 0, fx: [] };
    if (z.kind === 'totem') {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(this.totemGeo, this.totemMat);
      const top = new THREE.Mesh(this.totemTopGeo, this.totemTopMat);
      top.position.y = 1.5;
      g.add(pole, top);
      g.position.set(z.x, 0, z.z);
      g.traverse((o) => (o.castShadow = true));
      this.scene.add(g);
      zone.mesh = g;
      zone.light = new THREE.PointLight('#7aff9a', 8, 8, 1.8);
      zone.light.position.set(z.x, 1.8, z.z);
      this.scene.add(zone.light);
      this.fx('nature/healing-bloom', z.x, 0, z.z, { pxm: 30, color: 1.3 });
    } else if (z.kind === 'trap') {
      const m = new THREE.Mesh(this.trapGeo, this.trapMat);
      m.position.set(z.x, 0.06, z.z);
      this.scene.add(m);
      zone.mesh = m;
    } else if (z.kind === 'blizzard') {
      this.fx('ice/blizzard-vortex', z.x, 0, z.z, { pxm: 16, color: 1.2, speed: 0.9, palette: ICE_RAMP });
    }
    // A ring shows where it reaches.
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: { totem: '#6aff8a', trap: '#ffd27a', blizzard: '#8ae8ff', rain: '#ffe0a0' }[z.kind] ?? '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.position.set(z.x, 0.05, z.z);
    ring.scale.setScalar(z.r);
    ring.renderOrder = 3;
    this.scene.add(ring);
    zone.ring = ring;
    this.zones.push(zone);
    if (z.owner === 'me') this.net?.mine({ k: 'zone', kind: z.kind, x: Math.round(z.x * 10) / 10, z: Math.round(z.z * 10) / 10, r: z.r, l: z.life, heal: z.heal ?? 0 });
    return zone;
  },

  updateZones(dt) {
    this.zones = this.zones.filter((z) => {
      z.t += dt;
      z.acc += dt;
      z.ring.material.opacity = 0.35 + 0.2 * Math.sin(this.t * 4);
      const tick = z.acc >= z.tick;
      if (tick) z.acc = 0;
      if (z.kind === 'totem') {
        z.mesh.children[1].rotation.y += dt * 2;
        z.light.intensity = 6 + Math.sin(this.t * 3) * 2;
        // It heals whoever stands near: every player heals themselves from their own copy.
        if (tick && this.mode === 'play' && Math.hypot(this.heroPos.x - z.x, this.heroPos.z - z.z) < z.r) {
          const amt = Math.round(this.stats.maxHp * z.heal);
          if (this.hero.hp < this.stats.maxHp) {
            this.hero.hp = Math.min(this.stats.maxHp, this.hero.hp + amt);
            this.hud.number(`+${amt}`, 'heal', { x: this.heroPos.x, y: 1.9, z: this.heroPos.z });
          }
          if (Math.random() < 0.5) this.fx('holy/heal', this.heroPos.x, 0, this.heroPos.z + 0.05, { pxm: 56, color: 1.1, speed: 1.6 });
        }
      } else if (z.kind === 'trap' && z.owner === 'me') {
        const caught = this._foesInRadius(z.x, z.z, z.r);
        if (caught.length) {
          this.fx('nature/root-snare', z.x, 0, z.z, { pxm: 34, color: 1.3 });
          for (const e of caught) this._hitFoe(e, z.mult, 0, { effect: 'root', effectT: z.root, from: z });
          z.t = z.life;
        }
      } else if ((z.kind === 'blizzard' || z.kind === 'rain') && tick) {
        const rx = z.x + (Math.random() - 0.5) * z.r * 1.4, rz = z.z + (Math.random() - 0.5) * z.r * 1.4;
        if (z.kind === 'blizzard') this.fx('ice/snowflake-burst', rx, 0.2, rz, { pxm: 60, color: 1.3, palette: ICE_RAMP });
        else this._fallingArrow(rx, rz);
        if (z.owner === 'me') for (const e of this._foesInRadius(z.x, z.z, z.r)) this._hitFoe(e, z.mult, 0.5, { spell: z.spell, effect: z.slow ? 'slow' : null, effectT: z.slowT ?? 0, from: z });
      }
      if (z.t >= z.life) {
        z.ring.material.dispose();
        z.ring.removeFromParent();
        z.mesh?.removeFromParent();
        z.light?.dispose();
        z.light?.removeFromParent();
        return false;
      }
      return true;
    });
  },

  _fallingArrow(x, z) {
    const g = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    g.rotation.x = Math.PI / 2;
    g.position.set(x, 8, z);
    this.scene.add(g);
    this.effects.push({ fall: g, t: 0, life: 0.35, fx: { dispose: () => g.removeFromParent() } });
  },

  /* ----------------------------------------------------------- the hero hurt */

  /**
   * The hero is hit. Rolling, dashing and the moment after a hit are safe; a
   * raised guard takes 60 % off; a shield may block half. Returns what was taken.
   */
  hurtHero(amount, fromX, fromZ, crit = false, { chill = 0 } = {}) {
    if (this.mode !== 'play' || this.hv.inv > 0 || this.hv.roll > 0 || this.hv.dash) return 0;
    let amt = amount;
    if (this.buffs.guard > 0) amt *= 1 - R.SKILLS.guard.reduce;
    if (Math.random() < this.stats.block) {
      amt *= 0.5;
      this.hud.number('Block', 'block', { x: this.heroPos.x, y: 2.1, z: this.heroPos.z });
      this.fx('impacts/shield-block', this.heroPos.x, 1, this.heroPos.z, { pxm: 56, color: 1.4 });
    }
    amt = Math.max(1, Math.round(amt));
    this.hero.hp -= amt;
    this.hv.inv = 0.45;
    this.hv.hurtT = 0;
    this.hv.hurt = 1;
    this.heroActor.flash = 0.12;
    if (chill) this.chillT = 2;
    const dx = this.heroPos.x - fromX, dz = this.heroPos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    const push = this.buffs.guard > 0 ? 3 : 9;
    this.hv.kx += (dx / d) * push;
    this.hv.kz += (dz / d) * push;
    this.hurtFx = 1;
    this.shake = Math.max(this.shake, crit ? 0.4 : 0.25);
    this.hud.number(String(amt), 'hurt', { x: this.heroPos.x, y: 1.9, z: this.heroPos.z });
    if (this.hero.hp <= 0) this.die();
    return amt;
  },

  die() {
    this.hero.hp = 0;
    this.mode = 'dead';
    this.deadT = 0;
    this.hud.toast(this.realm === 'lanternwood' ? 'You fall… the Hearthlight calls you back.' : 'You fall… the waystone calls you back.', 'warn');
  },

  _respawn() {
    const lost = R.deathPenalty(this.hero);
    const L = this.realmDef;
    if (this.realm === 'lanternwood') [this.heroPos.x, this.heroPos.z] = [0, 4];
    else [this.heroPos.x, this.heroPos.z] = [L.start.x, L.start.z];
    this.heroPos.face = Math.PI;
    this.camYaw = 0;
    this._snapCamera();
    if (!this.net?.isGuest) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (!this.net?.room) {
          e.state = 'return';
          e.tele = null;
        }
      }
      if (this.boss?.alive && !this.net?.room) this.boss.hp = this.boss.maxHp;
    }
    this.mode = 'play';
    this.post.fade = 0;
    this.hud.log(`You wake by the ${this.realm === 'lanternwood' ? 'fire' : 'waystone'}. ${lost ? `${lost} gold lost in the dark.` : ''}`);
    this.save();
  },

  /* -------------------------------------------------------------- kills */

  /**
   * A monster died (here, or — in a party — anywhere the host saw it in this
   * realm): XP, gold, quest progress, and this player's own loot roll.
   */
  _onKill(ev) {
    const def = R.ENEMIES[ev.kind];
    if (!def || this.mode === 'title') return;
    const weak = ev.summoned || ev.small;
    const drops = R.rollDrops(ev.kind, Math.random, { elite: Boolean(ev.elite) });
    if (weak) {
      drops.gold = Math.floor(drops.gold / 2);
      drops.xp = Math.round(drops.xp * 0.4);
      drops.crystals = 0;
    }
    this.hero.kills += 1;
    const { levels } = R.gainXp(this.hero, drops.xp);
    const name = ev.elite ? '<b>a hero monster</b>' : def.name;
    this.hud.log(`${name} driven off · +${drops.xp} XP`);
    if (def.boss) {
      this.fx('shadow/dark-explosion', ev.x, 0, ev.z, { pxm: 40, additive: true, color: 1.5 });
      this.shake = 0.8;
      this.state.bosses[ev.kind] = true;
      if (ev.kind === 'lampwight') this.state.bossDefeated = true;
      this.hud.boss(null);
      this.hud.toast(`<b>${def.name} is undone.</b>`, 'gold');
    } else this.fx('spawn/poof', ev.x, 0, ev.z, { pxm: 70, additive: false, color: 0.8, speed: 1.6 });
    const spot = (i) => [ev.x + Math.cos(i * 2.3) * 0.9, ev.z + Math.sin(i * 2.3) * 0.9];
    let n = 0;
    if (drops.gold) this._drop('gold', drops.gold, ...spot(n++));
    for (let i = 0; i < drops.crystals; i++) this._drop('crystal', 1, ...spot(n++));
    if (drops.potion) this._drop('potion', drops.potion, ...spot(n++));
    if (!weak || def.boss) {
      const tier = def.boss ? 'boss' : ev.elite ? 'elite' : 'normal';
      const loot = R.rollLoot({ level: def.level, tier, cls: this.hero.cls });
      for (const it of loot.items) this._dropItem(it, ...spot(n++));
      for (const c of loot.consumables) this._dropItem(c, ...spot(n++));
    }
    for (const id of R.questEvent(this.state.quests, 'kill', ev.kind)) this._questReady(id);
    if (ev.elite) for (const id of R.questEvent(this.state.quests, 'elite', this.realm)) this._questReady(id);
    if (levels) this._levelUp(levels);
  },

  _drop(kind, amount, x, z) {
    const f = new FxBillboard(this.pickupFx[kind], { pxm: kind === 'gold' ? 34 : 52, color: 0.95 });
    f.owner = false;
    f.mesh.position.set(x, 0.05, z);
    this.scene.add(f.mesh);
    this.drops.push({ kind, amount, x, z, fx: f, t: 0 });
  },

  /** An item (or a stack) on the ground: its pixel icon turning, a beam of its rarity's colour for rare and better. */
  _dropItem(entry, x, z) {
    const tex = new THREE.CanvasTexture(iconCanvas(entry));
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.setScalar(0.75);
    sprite.position.set(x, 0.5, z);
    this.scene.add(sprite);
    const rarity = entry.base ? R.RARITIES[entry.rarity] : null;
    let beam = null;
    if (rarity?.glow) {
      beam = lootBeam(rarity.color, entry.rarity === 'rare' ? 0.6 : entry.rarity === 'epic' ? 0.85 : 1.15);
      beam.group.position.set(x, 0, z);
      this.scene.add(beam.group);
      if (entry.rarity !== 'rare') this.fx('pickups/collect-burst', x, 0.3, z, { pxm: 40, color: 1.5 });
    }
    this.drops.push({ kind: 'item', entry, x, z, sprite, tex, beam, t: 0, id: Math.random().toString(36).slice(2) });
  },

  _disposeDrop(d) {
    if (d.fx) d.fx.dispose();
    if (d.sprite) {
      d.sprite.material.dispose();
      d.tex.dispose();
      d.sprite.removeFromParent();
    }
    d.beam?.dispose();
  },

  updateDrops(dt) {
    const hx = this.heroPos.x, hz = this.heroPos.z;
    this.drops = this.drops.filter((d) => {
      d.t += dt;
      const dist = Math.hypot(hx - d.x, hz - d.z);
      if (d.kind === 'item') {
        d.sprite.position.set(d.x, 0.55 + Math.sin(d.t * 3 + d.x) * 0.08 + Math.max(0, 0.5 - d.t) * Math.sin(d.t * 12) * 0.4, d.z);
        if (d.beam) d.beam.material.opacity = 0.65 + Math.sin(d.t * 4) * 0.25;
        if (d.t > 0.5 && dist < 1.1 && this.mode === 'play') {
          const r = R.addToBag(this.hero.bag, d.entry.base ? d.entry : { ...d.entry });
          if (r.ok) {
            const label = d.entry.base ? `<span style="color:${R.RARITIES[d.entry.rarity].color}">${d.entry.name}</span>` : `${R.CONSUMABLES[d.entry.kind].name}${d.entry.n > 1 ? ` ×${d.entry.n}` : ''}`;
            this.hud.log(`Picked up ${label}`);
            if (d.entry.base && ['epic', 'legendary'].includes(d.entry.rarity)) this.hud.toast(`<small>${R.RARITIES[d.entry.rarity].name} find!</small><b style="color:${R.RARITIES[d.entry.rarity].color}">${d.entry.name}</b>`, 'loot');
            this.fx('pickups/collect-burst', d.x, 0.3, d.z, { pxm: 50, color: 1.4 });
            this._disposeDrop(d);
            this._refreshBag?.();
            return false;
          }
          if (!d.warned) {
            d.warned = true;
            this.hud.toast('Your bag is full — sell or drop something (I)', 'warn');
          }
        }
        if (d.t > 300) {
          this._disposeDrop(d);
          return false;
        }
        return true;
      }
      if (d.t > 0.4 && dist < 3.2) {
        const k = Math.min(1, dt * 9);
        d.x += (hx - d.x) * k;
        d.z += (hz - d.z) * k;
      }
      d.fx.mesh.position.set(d.x, 0.05 + Math.max(0, 0.5 - d.t) * Math.sin(d.t * 12) * 0.4, d.z);
      if (d.t > 0.4 && dist < 0.9 && this.mode === 'play') {
        if (d.kind === 'gold') {
          this.hero.gold += d.amount;
          this.hud.number(`+${d.amount}g`, 'gold', { x: hx, y: 1.7, z: hz });
        } else if (d.kind === 'crystal') {
          this.hero.crystals += 1;
          this.hud.number('+1 crystal', 'crystal', { x: hx, y: 1.7, z: hz });
        } else {
          R.addToBag(this.hero.bag, { kind: d.amount, n: 1 });
          this.hud.log(d.amount === 'hp' ? 'Found a health potion' : 'Found a mana potion');
        }
        d.fx.dispose();
        return false;
      }
      if (d.t > 60) {
        d.fx.dispose();
        return false;
      }
      return true;
    });
  },

  _levelUp(levels) {
    this.fx('ui/level-up', this.heroPos.x, 0, this.heroPos.z + 0.1, { pxm: 64, color: 1.5 });
    const s = R.statsOf(this.hero);
    this.hud.toast(`<b>Level ${this.hero.level}!</b> Health ${s.maxHp} · Attack ${s.atk}${levels > 1 ? ` (+${levels} levels)` : ''}`, 'gold');
  },

  wrapAngle: wrap
};
