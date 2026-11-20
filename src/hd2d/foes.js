/**
 * Lanternwood — the monsters: spawning (with hero monsters among them), the
 * AI of every behaviour, bosses with phases, telegraphs on the ground
 * (circles, lines, cones), their missiles, hits on heroes, deaths and loot.
 * Installed on the game as a mixin (`this` is the LanternwoodGame).
 *
 * Alone, or as the host of a party, the game runs this simulation; a guest
 * only mirrors the host's monsters (see coop.js) and runs none of it.
 */
import * as THREE from 'three';
import * as R from './rules.js';
import { RigActor } from './rig.js';
import { BeastActor } from './beasts.js';
import { SculptBeastActor } from './sculpt/beastActor.js';
import { isSculptedBeast } from './sculpt/beasts.js';
import { SCULPTED_FIGURES } from './sculpt/build.js';
import { MONSTER_PEOPLE } from './sprites.js';

const TAU = Math.PI * 2;
const HERO_R = 0.42;
const WISP_RAMP = ['#0e2a3a', '#14506a', '#1e7a94', '#2aa6b8', '#4ad0d8', '#7ff0ec', '#b8fff6', '#e8fffc', '#ffffff'];
const ICE_RAMP = ['#0e1a3a', '#14306a', '#1e5a94', '#2a86c8', '#4ab0e8', '#7fd8ff', '#b8f0ff', '#e8fcff', '#ffffff'];
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
const GREEN_RAMP = ['#0c2a14', '#14501e', '#1e7a2a', '#2aa63a', '#4ad05a', '#7ff08a', '#b8ffb8', '#e8ffe8', '#ffffff'];
/** Missile looks: [core colour, glow colour, size, fx palette]. */
const ORBS = { orb: ['#7ff0ff', '#4ad8ff', 0.17, WISP_RAMP], shard: ['#d8f8ff', '#7ad8ff', 0.15, ICE_RAMP], fireorb: ['#ffb050', '#ff6a2a', 0.2, FIRE_RAMP], spore: ['#c8ff8a', '#6ad04a', 0.15, GREEN_RAMP] };
const BOSS_SCALE = { lampwight: 1.4, gnarlroot: 1.35, tyrant: 1.55, matron: 1 };

const angDiff = (a, b) => Math.abs(((((a - b + Math.PI) % TAU) + TAU) % TAU) - Math.PI);

export const FoeMixin = {
  /* ---------------------------------------------------------- spawning */

  /** Every monster of the realm, fresh (alone or as host). */
  _spawnRealmFoes() {
    for (const e of this.enemies) this._disposeEnemy(e);
    this.enemies = [];
    this.boss = null;
    this._nid = 1;
    for (const s of R.realmSpawns(this.realm, this.world.solids)) this._spawnEnemy(s.kind, s.x, s.z, { elite: s.elite ?? null });
  },

  /** The 3D figure for a monster kind (people-shaped ones on joints). */
  _foeActor(kind, elite) {
    const def = R.ENEMIES[kind];
    const k = (elite ? 1.4 : 1) * (BOSS_SCALE[kind] ?? 1);
    let a;
    if (def.rig) {
      const m = MONSTER_PEOPLE[kind];
      a = new RigActor({ shadow: def.radius * 1.1, scale: m.scale * (elite ? 1.3 : 1) });
      a.show(this.sprites.enemies[kind][0]);
      a.setGear(m.gear);
    } else {
      const glow = { wisp: 0.4, lampwight: 0.25, shardling: 0.2, cinderling: 0.3, golem: 0.08, frostbat: 0.08, tyrant: 0.1 }[kind] ?? 0;
      const Actor = SCULPTED_FIGURES && isSculptedBeast(kind) ? SculptBeastActor : BeastActor;
      a = new Actor(kind, this.sprites.enemies[kind][0], { shadow: def.radius * (def.boss ? 1.2 : 0.95), glow, scale: k });
      // Heavy ones shake the ground a little as they walk.
      if (['golem', 'gnarlroot', 'tyrant', 'mossback'].includes(kind)) a.onStep = () => this._footDust(a.group.position.x, a.group.position.z, def.boss ? 2.2 : 1.5);
      else if (['wolf', 'icefang', 'thornboar', 'salamander'].includes(kind)) a.onStep = () => Math.random() < 0.5 && this._footDust(a.group.position.x, a.group.position.z, 0.8);
    }
    if (elite) a.glowColor = new THREE.Color(R.ELITE_AFFIXES[elite.affixes[0]]?.color ?? '#ffd27a').multiplyScalar(0.8);
    return a;
  },

  /**
   * A monster at (x, z). `elite` { name, affixes } makes it a hero monster;
   * `summoned` ones (a boss's adds, a splitter's halves) never respawn.
   */
  _spawnEnemy(kind, x, z, { summoned = false, elite = null, nid = null, small = false, mirror = false } = {}) {
    const def = R.ENEMIES[kind];
    if (!mirror && !elite && !summoned && !def.boss && Math.random() < 0.035) elite = { name: null, affixes: R.rollAffixes(Math.random, Math.random() < 0.25 ? 2 : 1), random: true };
    if (elite && !elite.name) elite.name = R.eliteName(kind, elite.affixes);
    const st = this._foeStats(kind, elite, small);
    const actor = this._foeActor(kind, elite);
    if (small) {
      actor.scale *= 0.7;
      actor.inner?.scale.setScalar(actor.scale);
      actor.body?.scale.setScalar(actor.scale);
    }
    actor.group.position.set(x, 0, z);
    this.scene.add(actor.group);
    const e = {
      nid: nid ?? this._nid++, kind, def, st, x, z, hx: x, hz: z, hp: st.hp, maxHp: st.hp, alive: true, state: 'idle', timer: Math.random() * 2, cd: 0, kx: 0, kz: 0, vx: 0, vz: 0,
      tx: x, tz: z, face: Math.random() * TAU, actor, frameT: Math.random(), respawn: 0, summoned, phase: 0, lastHit: 99, elite, shield: st.shield, shieldT: 0,
      slowT: 0, slowK: 0, stunT: 0, rootT: 0, burnT: 0, burnDps: 0, tele: null, lift: def.float ?? 0, target: null, retarget: 0, hitSet: null, auraT: 0, small
    };
    this.enemies.push(e);
    return e;
  },

  /** A monster's working numbers: its kind's, an elite's, a party-sized boss's. */
  _foeStats(kind, elite, small = false) {
    const d = R.ENEMIES[kind];
    let st = { hp: d.hp, atk: d.atk, def: d.def, speed: d.speed, windup: d.windup, cooldown: d.cooldown, shield: 0, split: 0, aura: 0, chill: 0, leech: 0, xp: d.xp };
    if (elite) st = { ...st, ...R.eliteStats(d, elite.affixes) };
    if (d.boss) st.hp = R.bossHp(kind, this.net?.partySize?.() ?? 1);
    if (small) st = { ...st, hp: Math.round(d.hp * 0.8), split: 0, shield: 0 };
    return st;
  },

  _disposeEnemy(e) {
    if (e.aura) {
      e.aura.geometry.dispose();
      e.aura.material.dispose();
      e.aura = null;
    }
    e.actor.dispose();
    this._clearTele(e);
    if (e.mound) {
      e.mound.removeFromParent();
      e.mound = null;
    }
  },

  /* -------------------------------------------------------- telegraphs */

  _teleMeshes(e) {
    if (e.tm) return e.tm;
    const mat = () => new THREE.MeshBasicMaterial({ color: e.def.attack === 'heal' ? '#5aff7a' : '#ff3a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide });
    const mk = (geo) => {
      const m = new THREE.Mesh(geo, mat());
      m.renderOrder = 3;
      m.visible = false;
      this.scene.add(m);
      return m;
    };
    e.tm = { ring: mk(this.ringGeo), disc: mk(this.discGeo), rect: mk(this.rectGeo), rectFill: mk(this.rectGeo), cone: mk(this.coneGeo(1)), coneFill: mk(this.coneGeo(1)) };
    return e.tm;
  },

  /** A unit cone sector (pointing +Z) of an arc, cached. */
  coneGeo(arc) {
    const key = Math.round(arc * 20) / 20;
    this._cones ??= new Map();
    let g = this._cones.get(key);
    if (!g) {
      g = new THREE.CircleGeometry(1, 28, -Math.PI / 2 - key / 2, key).rotateX(-Math.PI / 2);
      this._cones.set(key, g);
    }
    return g;
  },

  _clearTele(e) {
    if (!e.tm) return;
    for (const m of Object.values(e.tm)) {
      m.material.dispose();
      m.removeFromParent();
    }
    e.tm = null;
  },

  /** Draw a monster's telegraph (e.tele: { shape, x, z, r, k, a, len }) — or hide it. */
  _drawTele(e) {
    const t = e.alive ? e.tele : null;
    if (!t && !e.tm) return;
    const m = this._teleMeshes(e);
    for (const x of Object.values(m)) x.visible = false;
    if (!t) return;
    const pulse = 0.55 + 0.35 * Math.sin(this.t * 30);
    if (t.shape === 'circle') {
      m.ring.visible = m.disc.visible = true;
      m.ring.position.set(t.x, 0.05, t.z);
      m.disc.position.set(t.x, 0.045, t.z);
      m.ring.scale.setScalar(t.r);
      m.disc.scale.setScalar(Math.max(0.01, t.r * t.k));
      m.ring.material.opacity = pulse;
      m.disc.material.opacity = 0.35;
    } else if (t.shape === 'rect') {
      m.rect.visible = m.rectFill.visible = true;
      for (const [mesh, k, op] of [[m.rect, 1, 0.22 + pulse * 0.15], [m.rectFill, Math.max(0.01, t.k), 0.4]]) {
        mesh.position.set(t.x, 0.05, t.z);
        mesh.rotation.set(0, t.a, 0);
        mesh.scale.set(t.r * 2, 1, t.len * k);
        mesh.material.opacity = op;
      }
    } else if (t.shape === 'cone') {
      m.cone.geometry = m.coneFill.geometry = this.coneGeo(t.r);
      m.cone.visible = m.coneFill.visible = true;
      for (const [mesh, k, op] of [[m.cone, 1, 0.2 + pulse * 0.15], [m.coneFill, Math.max(0.01, t.k), 0.38]]) {
        mesh.position.set(t.x, 0.05, t.z);
        mesh.rotation.set(0, t.a, 0);
        mesh.scale.set(t.len * k, 1, t.len * k);
        mesh.material.opacity = op;
      }
    }
  },

  /* -------------------------------------------------------------- heroes */

  /** Everyone a monster can go for: this hero, and (as host) the party's in this realm. */
  _heroes() {
    const list = [];
    if (this.mode === 'play') list.push({ id: 'me', x: this.heroPos.x, z: this.heroPos.z, guard: this.buffs.guard > 0, def: this.stats.def });
    for (const p of this.net?.peersHere?.() ?? []) if (!p.act?.dead) list.push({ id: p.id, x: p.x, z: p.z, guard: p.act?.guard, def: p.def, remote: true });
    return list;
  },

  /** The hero a monster goes for: one standing guard close by, else the nearest it can see. */
  _pickTarget(e, heroes) {
    let best = null, bd = Infinity;
    for (const h of heroes) {
      const d = Math.hypot(h.x - e.x, h.z - e.z);
      const score = d - (h.guard && d < R.SKILLS.guard.taunt ? 100 : 0);
      if (score < bd && d < e.def.sight * (e.state === 'idle' ? 1 : 2.2)) {
        bd = score;
        best = h;
      }
    }
    return best;
  },

  /** Heroes inside a shape: { shape: circle|rect|cone, x, z, r, a, len }. */
  _heroesIn(shape) {
    return this._heroes().filter((h) => this._inShape(shape, h.x, h.z, HERO_R));
  },

  _inShape(s, x, z, pad = 0) {
    const dx = x - s.x, dz = z - s.z;
    if (s.shape === 'circle') return Math.hypot(dx, dz) < s.r + pad;
    if (s.shape === 'rect') {
      const fx = Math.sin(s.a), fz = Math.cos(s.a);
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      return along > -pad && along < s.len + pad && side < s.r + pad;
    }
    const d = Math.hypot(dx, dz);
    return d < s.len + pad && angDiff(Math.atan2(dx, dz), s.a) < s.r / 2;
  },

  /** A monster lands a blow on a hero: here, or (as host) sent to the player it hit. */
  _foeHits(e, h, mult = 1) {
    const { amount, crit } = R.damage(e.st.atk, h.def ?? 0, mult);
    if (h.id === 'me') {
      const dealt = this.hurtHero(amount, e.x, e.z, crit, { chill: e.st.chill });
      if (dealt && e.st.leech) e.hp = Math.min(e.maxHp, e.hp + dealt * e.st.leech);
    } else {
      this.net?.event({ k: 'hurt', to: h.id, amt: amount, crit: crit ? 1 : 0, x: Math.round(e.x * 10) / 10, z: Math.round(e.z * 10) / 10, chill: e.st.chill || 0 });
      if (e.st.leech) e.hp = Math.min(e.maxHp, e.hp + amount * e.st.leech);
    }
  },

  /** Strike every hero inside a shape. */
  _strikeShape(e, shape, mult = 1) {
    for (const h of this._heroesIn(shape)) this._foeHits(e, h, mult);
  },

  /* ----------------------------------------------------------------- AI */

  updateEnemies(dt) {
    const heroes = this._heroes();
    const here = [this.heroPos, ...heroes];
    const near = (e, r) => here.some((h) => Math.hypot(h.x - e.x, h.z - e.z) < r);
    for (const e of this.enemies) {
      const def = e.def;
      if (!e.alive) {
        if (e.summoned || def.boss) continue;
        e.respawn -= dt;
        if (e.respawn <= 0 && !near(e, 18)) this._respawnFoe(e);
        continue;
      }
      // Far from everyone: asleep (no thinking, nothing drawn) — the big maps stay cheap.
      const awake = near(e, 80) || def.boss;
      e.actor.group.visible = awake && e.state !== 'burrowed';
      if (!awake) continue;
      e.lastHit += dt;
      e.cd = Math.max(0, e.cd - dt);
      e.frameT += dt;
      e.timer -= dt;
      e.retarget -= dt;
      // Status: stunned, rooted, slowed, burning; an elite's ward comes back; a burning one scorches.
      e.stunT = Math.max(0, e.stunT - dt);
      e.rootT = Math.max(0, e.rootT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnAcc = (e.burnAcc ?? 0) + dt;
        if (e.burnAcc >= 0.5) {
          e.burnAcc = 0;
          this._applyDamage(e, Math.max(1, Math.round(e.burnDps * 0.5)), false, 0, 0, null, 0, 'burn');
          if (!e.alive) continue;
        }
      }
      if (e.st.shield && e.shield <= 0) {
        e.shieldT += dt;
        if (e.shieldT > 9) {
          e.shield = e.st.shield;
          e.shieldT = 0;
        }
      }
      if (e.st.aura) {
        e.auraT -= dt;
        if (e.auraT <= 0) {
          e.auraT = 1;
          for (const h of heroes) if (Math.hypot(h.x - e.x, h.z - e.z) < e.st.aura + HERO_R) this._foeHits(e, h, 0.25);
        }
      }
      if (e.retarget <= 0 || !e.target) {
        e.retarget = 0.4;
        const t = this._pickTarget(e, heroes);
        e.target = t;
      } else e.target = heroes.find((h) => h.id === e.target.id) ?? null;
      const T = e.target;
      const dx = T ? T.x - e.x : 0, dz = T ? T.z - e.z : 0;
      const dh = T ? Math.hypot(dx, dz) : Infinity;
      const home = Math.hypot(e.x - e.hx, e.z - e.hz);
      let mvx = 0, mvz = 0, speed = 0;
      const sp = e.st.speed * (e.slowT > 0 ? 1 - e.slowK : 1);
      if (e.stunT > 0) {
        if (e.state === 'windup' || e.state === 'strike') e.state = 'recover';
        e.tele = null;
      } else {
        switch (e.state) {
          case 'idle': {
            if (T) {
              e.state = 'chase';
              this.hud.number('!', 'alert', { x: e.x, y: e.actor.height + 0.5, z: e.z });
              break;
            }
            if (e.timer <= 0) {
              const a = Math.random() * TAU, r = Math.random() * 4;
              e.tx = e.hx + Math.cos(a) * r;
              e.tz = e.hz + Math.sin(a) * r;
              e.timer = 2 + Math.random() * 3;
            }
            const tx = e.tx - e.x, tz = e.tz - e.z, td = Math.hypot(tx, tz);
            if (td > 0.3) [mvx, mvz, speed] = [tx / td, tz / td, def.wander];
            break;
          }
          case 'chase': {
            if (!T || (home > def.leash && !def.boss)) {
              e.state = 'return';
              break;
            }
            [mvx, mvz, speed] = this._chaseMove(e, T, dx, dz, dh, sp);
            if (def.boss) this._bossThink(e, T, dh);
            else if (e.cd <= 0 && this._inReach(e, dh)) this._windup(e, T, dh);
            break;
          }
          case 'windup': {
            if (e.tele) e.tele.k = 1 - Math.max(0, e.timer) / e.wind;
            if (def.boss && T && e.move === 'breath') e.tele.a += Math.max(-1, Math.min(1, ((Math.atan2(dx, dz) - e.tele.a + 9 * Math.PI) % TAU) - Math.PI)) * dt * 0.8;
            if (def.attack === 'burrow' && e.tele) {
              e.tele.x = e.x;
              e.tele.z = e.z;
            }
            if (e.timer <= 0) this._strike(e, T);
            break;
          }
          case 'burrowed': {
            // Underground: race to the target, a mound of earth showing the way.
            if (T && dh > 0.8) [mvx, mvz, speed] = [dx / dh, dz / dh, sp * 2.3];
            if (!T || dh < 0.9 || e.timer <= 0) {
              e.state = 'windup';
              e.wind = e.timer = e.st.windup + 0.2;
              e.tele = { shape: 'circle', x: e.x, z: e.z, r: 2.2, k: 0 };
            }
            break;
          }
          case 'strike':
            [mvx, mvz, speed] = this._strikeMove(e, heroes, dt);
            if (e.timer <= 0) {
              e.state = 'recover';
              e.timer = e.st.cooldown + (def.attack === 'shield' ? 0.6 : 0);
              e.cd = e.st.cooldown;
              e.lift = def.float ?? 0;
            }
            break;
          case 'recover':
            if (e.timer <= 0) e.state = 'chase';
            break;
          case 'return': {
            const td = Math.hypot(e.hx - e.x, e.hz - e.z);
            if (T && home < def.leash * 0.8) e.state = 'chase';
            else if (td < 1) {
              e.state = 'idle';
              e.hp = e.maxHp;
            } else [mvx, mvz, speed] = [(e.hx - e.x) / td, (e.hz - e.z) / td, sp * 1.2];
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25 * dt);
            e.tele = null;
            break;
          }
          default:
        }
      }
      if (e.rootT > 0 || e.stunT > 0) speed = 0;
      // Move, knockback, keep apart from each other and out of the trees.
      let nx = e.x + (mvx * speed + e.kx) * dt;
      let nz = e.z + (mvz * speed + e.kz) * dt;
      e.kx *= Math.exp(-dt * 7);
      e.kz *= Math.exp(-dt * 7);
      e.vx = mvx * speed;
      e.vz = mvz * speed;
      if (speed > 0.3) e.face = Math.atan2(mvx, mvz);
      else if (T && e.state !== 'strike') e.face = Math.atan2(dx, dz);
      if (e.state !== 'burrowed') {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.state === 'burrowed') continue;
          const ox = nx - o.x, oz = nz - o.z;
          const od = Math.hypot(ox, oz), min = def.radius + o.def.radius;
          if (od < min && od > 0.001) {
            nx += (ox / od) * (min - od) * 0.5;
            nz += (oz / od) * (min - od) * 0.5;
          }
        }
      }
      const bound = this.realmDef.radius;
      if (!def.float) [nx, nz] = R.resolveCollision(nx, nz, def.radius * 0.8, this._nearSolids(nx, nz), bound);
      else [nx, nz] = R.resolveCollision(nx, nz, 0.3, [], bound);
      e.x = nx;
      e.z = nz;
    }
    this.updateBoss(dt);
    // Summoned helpers that are gone are removed for good.
    this.enemies = this.enemies.filter((e) => {
      if (e.summoned && !e.alive && (e.deadT = (e.deadT ?? 0) + dt) > 0.6) {
        this._disposeEnemy(e);
        return false;
      }
      return true;
    });
  },

  _respawnFoe(e) {
    const elite = e.elite?.random ? null : e.elite;
    if (e.elite?.random || (!e.elite && Math.random() < 0.035)) {
      // A different monster rises (maybe a hero monster): rebuild its figure.
      this._disposeEnemy(e);
      const n = this._spawnEnemy(e.kind, e.hx, e.hz, { elite, nid: e.nid });
      this.enemies.splice(this.enemies.indexOf(n), 1);
      Object.assign(e, n);
    }
    Object.assign(e, { alive: true, hp: e.st.hp, maxHp: e.st.hp, x: e.hx, z: e.hz, state: 'idle', timer: 1, kx: 0, kz: 0, shield: e.st.shield, stunT: 0, rootT: 0, slowT: 0, burnT: 0, tele: null });
    e.actor.group.visible = true;
    this.fx('spawn/poof', e.x, 0, e.z, { pxm: 90, additive: false, color: 0.7, speed: 1.8 });
    this.vfx?.dust(e.x, e.z, { n: 6, size: 0.7, alpha: 0.35, speed: 1.4 });
  },

  _inReach(e, dh) {
    const a = e.def.attack;
    if (a === 'burrow') return dh < 12 && dh > 2.5;
    if (a === 'heal') return true;
    return dh < e.def.reach + HERO_R;
  },

  /** How a monster closes in: casters keep their distance, swarms circle, packs flank. */
  _chaseMove(e, T, dx, dz, dh, sp) {
    const a = e.def.attack;
    if (e.def.keep) {
      if (dh < e.def.keep - 1) return [-dx / dh, -dz / dh, sp];
      if (dh > e.def.keep + 1.5) return [dx / dh, dz / dh, sp];
      const side = Math.sign(Math.sin(this.t * 0.7 + e.hx)) || 1;
      return [(-dz / dh) * side, (dx / dh) * side, sp * 0.5];
    }
    if (a === 'swarm' || a === 'swoop') {
      // Circle the target, darting in.
      const orbit = a === 'swoop' ? 5 : 2.6;
      const ang = Math.atan2(-dx, -dz) + Math.sin(this.t * 1.3 + e.nid) * 0.9;
      const gx = T.x + Math.sin(ang) * orbit - e.x, gz = T.z + Math.cos(ang) * orbit - e.z;
      const gd = Math.hypot(gx, gz) || 1;
      return [gx / gd, gz / gd, sp];
    }
    if (e.kind === 'icefang') {
      // The pack flanks: each comes at its own angle.
      const ang = Math.atan2(-dx, -dz) + ((e.nid % 3) - 1) * 0.9;
      const gx = T.x + Math.sin(ang) * 3 - e.x, gz = T.z + Math.cos(ang) * 3 - e.z;
      const gd = Math.hypot(gx, gz) || 1;
      if (dh > 4.5) return [gx / gd, gz / gd, sp];
    }
    const stop = e.def.boss ? 2.6 : a === 'charge' ? 7 : e.def.reach * 0.7;
    if (dh > stop) return [dx / dh, dz / dh, sp];
    return [0, 0, 0];
  },

  /** The tell before a blow: the shape of what is coming, drawn on the ground. */
  _windup(e, T, dh) {
    const def = e.def;
    const a = def.attack;
    const ang = Math.atan2(T.x - e.x, T.z - e.z);
    e.state = 'windup';
    e.wind = e.st.windup;
    e.face = ang;
    if (a === 'hop') {
      const d = Math.min(3.2, dh);
      e.tx = e.x + Math.sin(ang) * d;
      e.tz = e.z + Math.cos(ang) * d;
      e.tele = { shape: 'circle', x: e.tx, z: e.tz, r: 1.4, k: 0 };
    } else if (a === 'lunge' || a === 'swarm') {
      const len = a === 'swarm' ? 2.2 : 3.6;
      e.ldx = Math.sin(ang);
      e.ldz = Math.cos(ang);
      e.tele = { shape: 'rect', x: e.x, z: e.z, r: a === 'swarm' ? 0.5 : 0.75, a: ang, len, k: 0 };
    } else if (a === 'charge') {
      e.ldx = Math.sin(ang);
      e.ldz = Math.cos(ang);
      e.tele = { shape: 'rect', x: e.x, z: e.z, r: 1.15, a: ang, len: 13, k: 0 };
    } else if (a === 'orb') e.tele = { shape: 'circle', x: e.x, z: e.z, r: 0.9, k: 0 };
    else if (a === 'volley') e.tele = { shape: 'cone', x: e.x, z: e.z, r: 0.95, a: ang, len: 11, k: 0 };
    else if (a === 'shield') {
      e.tx = e.x + Math.sin(ang) * Math.min(def.reach * 0.75, dh);
      e.tz = e.z + Math.cos(ang) * Math.min(def.reach * 0.75, dh);
      e.tele = { shape: 'circle', x: e.tx, z: e.tz, r: 2.4, k: 0 };
    } else if (a === 'burrow') {
      // Down it goes; the tell comes when it surfaces under you.
      e.state = 'burrowed';
      e.timer = 2.4;
      e.tele = null;
      this.fx('explosions/dirt-explosion', e.x, 0, e.z, { pxm: 60, additive: false, color: 0.9, speed: 1.5 });
      return;
    } else if (a === 'heal') {
      const hurt = this.enemies.some((o) => o.alive && o !== e && o.hp < o.maxHp * 0.85 && Math.hypot(o.x - e.x, o.z - e.z) < 9);
      e.move = hurt ? 'heal' : 'spore';
      e.tele = hurt ? { shape: 'circle', x: e.x, z: e.z, r: 9, k: 0 } : { shape: 'circle', x: e.x, z: e.z, r: 0.8, k: 0 };
      if (!hurt && dh > def.reach + 2) {
        e.state = 'chase';
        e.cd = 0.5;
        e.tele = null;
        return;
      }
    } else if (a === 'swoop') {
      e.tx = T.x;
      e.tz = T.z;
      e.tele = { shape: 'circle', x: e.tx, z: e.tz, r: 1.7, k: 0 };
    } else if (a === 'bomb') {
      e.tele = { shape: 'circle', x: e.x, z: e.z, r: 2.9, k: 0 };
      e.actor.glow = 0.45;
    } else if (a === 'nova') e.tele = { shape: 'circle', x: e.x, z: e.z, r: 4.8, k: 0 };
    else if (a === 'pyre') {
      e.tx = T.x;
      e.tz = T.z;
      e.tele = { shape: 'circle', x: e.tx, z: e.tz, r: 2.3, k: 0 };
    }
    e.timer = e.wind;
  },

  /** The blow lands. */
  _strike(e, T) {
    const def = e.def;
    const a = def.attack;
    const tele = e.tele;
    e.tele = null;
    e.hitSet = new Set();
    const recover = () => {
      e.state = 'recover';
      e.timer = e.st.cooldown;
      e.cd = e.st.cooldown;
    };
    if (def.boss) return this._bossStrike(e, T, tele);
    if (a === 'hop') {
      e.state = 'strike';
      e.strikeT = e.timer = 0.38;
      e.sx = e.x;
      e.sz = e.z;
    } else if (a === 'lunge' || a === 'swarm' || a === 'charge') {
      e.state = 'strike';
      e.strikeT = e.timer = a === 'charge' ? 0.8 : a === 'swarm' ? 0.18 : 0.3;
      if (a === 'charge') this.fx('moves/dash-strike', e.x, 0.2, e.z, { pxm: 50, color: 1.2, speed: 1.4 });
    } else if (a === 'orb' || (a === 'heal' && e.move === 'spore')) {
      if (T) this._foeMissile(e, a === 'heal' ? 'spore' : 'orb', Math.atan2(T.x - e.x, T.z - e.z), 9);
      recover();
    } else if (a === 'volley') {
      if (T) for (let i = -2; i <= 2; i++) this._foeMissile(e, 'shard', tele.a + i * 0.2, 11);
      recover();
    } else if (a === 'shield' || a === 'nova' || a === 'pyre' || a === 'bomb') {
      this._strikeShape(e, tele, a === 'bomb' ? 1.3 : a === 'nova' ? 1.15 : 1);
      const fx = { shield: ['impacts/ground-slam', 46, false], nova: ['explosions/big-explosion', 30, true], pyre: ['fire/flame-pillar', 34, true], bomb: ['explosions/small-explosion', 34, true] }[a];
      this.fx(fx[0], tele.x, 0, tele.z, { pxm: fx[1], additive: fx[2], color: fx[2] ? 1.4 : 0.9, speed: 1.5, palette: a === 'nova' || a === 'pyre' ? FIRE_RAMP : undefined });
      this.shake = Math.max(this.shake, a === 'nova' || a === 'bomb' ? 0.45 : 0.3);
      this.net?.event({ k: 'fx', id: fx[0], x: tele.x, z: tele.z, p: fx[1] });
      if (a === 'bomb') {
        // It bursts — and is gone (no reward: catch them before they reach you).
        e.alive = false;
        e.state = 'dead';
        e.respawn = def.respawn;
        this._shatterFoe(e);
        this.vfx?.explosion(tele.x, 0.4, tele.z, { radius: 2.4, ground: [new THREE.Color('#3a2a26'), new THREE.Color('#5a4038')] });
        e.actor.group.visible = false;
        e.actor.glow = 0.45;
        this.net?.event({ k: 'gone', nid: e.nid });
        return;
      }
      recover();
      if (a === 'shield') e.timer += 0.6; // open to blows for a moment after the slam
    } else if (a === 'heal') {
      for (const o of this.enemies) {
        if (!o.alive || Math.hypot(o.x - e.x, o.z - e.z) > 9 || o.hp >= o.maxHp) continue;
        const amt = Math.round(o.maxHp * 0.25);
        o.hp = Math.min(o.maxHp, o.hp + amt);
        this.hud.number(`+${amt}`, 'heal', { x: o.x, y: o.actor.height + 0.4, z: o.z });
        this.fx('holy/heal', o.x, 0, o.z + 0.05, { pxm: 46, color: 1.3, speed: 1.6 });
      }
      this.net?.event({ k: 'fx', id: 'holy/heal-aoe', x: e.x, z: e.z, p: 30 });
      recover();
    } else if (a === 'swoop') {
      e.state = 'strike';
      e.strikeT = e.timer = 0.42;
      e.sx = e.x;
      e.sz = e.z;
      e.tx = tele.x;
      e.tz = tele.z;
    } else recover();
  },

  /** While a blow is under way: a hop, a lunge, a charge, a dive. */
  _strikeMove(e, heroes, dt) {
    const a = e.def.attack;
    const k = 1 - Math.max(0, e.timer) / e.strikeT;
    if (a === 'hop' || a === 'swoop') {
      e.x = e.sx + (e.tx - e.sx) * k;
      e.z = e.sz + (e.tz - e.sz) * k;
      e.lift = a === 'hop' ? Math.sin(k * Math.PI) * 1.1 : (e.def.float ?? 2) * (1 - Math.sin(k * Math.PI) * 0.85);
      if (e.timer <= dt) {
        this._strikeShape(e, { shape: 'circle', x: e.x, z: e.z, r: a === 'hop' ? 1.05 : 1.3 }, 1);
        this.fx('spawn/poof', e.x, 0, e.z, { pxm: 140, additive: false, color: 0.6, speed: 2.5 });
      }
      return [0, 0, 0];
    }
    // Lunges and charges: whoever they run through is hit, once.
    for (const h of heroes) {
      if (e.hitSet.has(h.id) || Math.hypot(h.x - e.x, h.z - e.z) > e.def.radius + HERO_R + 0.4) continue;
      e.hitSet.add(h.id);
      this._foeHits(e, h, a === 'charge' ? 1.3 : 1);
    }
    const v = a === 'charge' ? 17 : a === 'swarm' ? 13 : 15;
    return [e.ldx, e.ldz, v * (1 - k * 0.5)];
  },

  /* -------------------------------------------------------------- bosses */

  /** A boss picks its next move: close, it slams (or breathes, or novas); further off, its ranged moves. */
  _bossThink(e, T, dh) {
    if (e.cd > 0) return;
    const moves = e.def.moves;
    const close = moves.filter((m) => ['slam', 'nova', 'breath'].includes(m));
    const far = moves.filter((m) => ['volley', 'roots', 'rain', 'charge'].includes(m));
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const move = dh < 5.5 && close.length ? (Math.random() < 0.75 ? pick(close) : pick(far.length ? far : close)) : far.length ? pick(far) : pick(close);
    const ang = Math.atan2(T.x - e.x, T.z - e.z);
    e.state = 'windup';
    e.move = move;
    e.face = ang;
    e.wind = { slam: 1.15, nova: 1.2, breath: 1.0, volley: 0.9, roots: 1.1, rain: 1.2, charge: 1.0 }[move] * (e.phase >= 2 ? 0.85 : 1);
    e.timer = e.wind;
    e.extra = null;
    if (move === 'slam') {
      const reach = Math.min(2.4, dh);
      e.tele = { shape: 'circle', x: e.x + Math.sin(ang) * reach, z: e.z + Math.cos(ang) * reach, r: 3.4, k: 0 };
    } else if (move === 'nova') e.tele = { shape: 'circle', x: e.x, z: e.z, r: 6.5, k: 0 };
    else if (move === 'breath') e.tele = { shape: 'cone', x: e.x, z: e.z, r: 1.2, a: ang, len: 11, k: 0 };
    else if (move === 'volley') e.tele = { shape: 'cone', x: e.x, z: e.z, r: 1.1, a: ang, len: 9, k: 0 };
    else if (move === 'charge') {
      e.ldx = Math.sin(ang);
      e.ldz = Math.cos(ang);
      e.tele = { shape: 'rect', x: e.x, z: e.z, r: 1.8, a: ang, len: 16, k: 0 };
    } else {
      // Roots or rain: several circles round the target(s) — warnings everyone in the party sees.
      const n = 4 + e.phase;
      const pts = [];
      for (const h of this._heroes()) pts.push([h.x, h.z]);
      for (let i = pts.length; i < n; i++) pts.push([T.x + (Math.random() - 0.5) * 9, T.z + (Math.random() - 0.5) * 9]);
      e.extra = pts.map(([x, z]) => ({ shape: 'circle', x, z, r: move === 'roots' ? 2.0 : 2.4, k: 0 }));
      e.tele = null;
      this._warn(e.extra, e.wind);
    }
  },

  _bossStrike(e, T, tele) {
    const recover = (extra = 0) => {
      e.state = 'recover';
      e.timer = e.st.cooldown * (e.phase >= 2 ? 0.75 : 1) + extra;
      e.cd = e.st.cooldown * (e.phase >= 2 ? 0.75 : 1);
    };
    const kind = e.kind;
    const pal = kind === 'matron' ? ICE_RAMP : kind === 'gnarlroot' ? GREEN_RAMP : kind === 'tyrant' ? FIRE_RAMP : WISP_RAMP;
    const say = (id, x, z, p, extra = {}) => {
      this.fx(id, x, 0, z, { pxm: p, color: 1.4, speed: 1.4, palette: pal, ...extra });
      this.net?.event({ k: 'fx', id, x, z, p });
    };
    switch (e.move) {
      case 'slam':
        say('impacts/ground-slam', tele.x, tele.z, 46, { additive: false, color: 0.9, palette: undefined });
        this.shake = 0.55;
        this._strikeShape(e, tele, 1.25);
        return recover(0.4);
      case 'nova':
        say(kind === 'matron' ? 'ice/frost-nova' : 'explosions/big-explosion', e.x, e.z, 22);
        this.shake = 0.6;
        this._strikeShape(e, tele, 1.1);
        return recover(0.3);
      case 'breath':
        say(kind === 'tyrant' ? 'fire/fire-breath' : 'ice/frost-breath', e.x + Math.sin(tele.a) * 3, e.z + Math.cos(tele.a) * 3, 20);
        this._strikeShape(e, tele, 1.3);
        return recover(0.3);
      case 'volley': {
        const kindOf = kind === 'matron' ? 'shard' : kind === 'tyrant' ? 'fireorb' : 'orb';
        for (let i = -2; i <= 2; i++) this._foeMissile(e, kindOf, tele.a + i * 0.22, 10, 2.4);
        if (e.phase >= 1) for (let i = -2; i <= 2; i++) this._foeMissile(e, kindOf, tele.a + Math.PI + i * 0.3, 8, 2.4);
        return recover();
      }
      case 'charge':
        e.state = 'strike';
        e.strikeT = e.timer = 0.95;
        e.hitSet = new Set();
        say('moves/dash-strike', e.x, e.z, 40);
        return;
      case 'roots':
      case 'rain':
        for (const c of e.extra ?? []) {
          say(e.move === 'roots' ? 'nature/earth-spike' : kind === 'matron' ? 'ice/icicle-fall' : 'fire/meteor', c.x, c.z, e.move === 'roots' ? 40 : 30);
          this._strikeShape(e, c, 0.9);
        }
        this.shake = 0.45;
        e.extra = null;
        return recover(0.2);
      default:
        return recover();
    }
  },

  /** Boss upkeep: when it appears, its light, the bar, its phases (it calls helpers), a reset when everyone leaves. */
  updateBoss(dt) {
    const L = this.realmDef;
    const spec = this.realm === 'lanternwood' ? { kind: 'lampwight', x: L.boss.x, z: L.boss.z } : L.boss;
    if (!spec) return;
    const heroes = this._heroes();
    const dist = Math.min(...heroes.map((h) => Math.hypot(h.x - spec.x, h.z - spec.z)), Infinity);
    const wanted = spec.kind === 'lampwight' ? this._lampwightWanted() : !this._bossDownUntil || this.state.time > this._bossDownUntil;
    if (wanted && !this.boss && dist < 24) {
      this.boss = this._spawnEnemy(spec.kind, spec.x, spec.z);
      this.boss.state = 'chase';
      this.boss.hx = spec.x;
      this.boss.hz = spec.z;
      this.fx('shadow/dark-explosion', spec.x, 0, spec.z, { pxm: 40, color: 1.3 });
      this.shake = 0.6;
      this.hud.toast(`<b>${R.ENEMIES[spec.kind].name} rises!</b>`, 'warn');
      this.net?.event({ k: 'boss', kind: spec.kind });
    }
    const b = this.boss;
    if (!b?.alive) return;
    const frac = b.hp / b.maxHp;
    const phase = R.bossPhase(b.hp, b.maxHp);
    if (phase > b.phase) {
      b.phase = phase;
      const n = 1 + phase;
      for (let i = 0; i < n; i++) {
        const a = this.t + (i / n) * TAU;
        const w = this._spawnEnemy(b.def.summon, b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 4, { summoned: true });
        w.state = 'chase';
        this.fx('spawn/soul-rise', w.x, 0, w.z, { pxm: 48, color: 1.6, palette: WISP_RAMP });
      }
      this.hud.toast(`${b.def.name} calls for help!`, 'warn');
    }
    void frac;
    if (b.state === 'return') {
      b.state = 'chase';
      if (dist > 34) {
        b.x = spec.x;
        b.z = spec.z;
        b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.2 * dt);
      }
    }
    // Everyone gone far away: it settles back, healed.
    if (dist > 60) {
      b.leaveT = (b.leaveT ?? 0) + dt;
      if (b.leaveT > 8) {
        this._disposeEnemy(b);
        this.enemies.splice(this.enemies.indexOf(b), 1);
        this.boss = null;
      }
    } else b.leaveT = 0;
  },

  _lampwightWanted() {
    if (this.state.bosses.lampwight && !this.net?.room) return false;
    if (this.state.quests.lampwight.state === 'active') return true;
    return (this.net?.peersHere?.() ?? []).some((p) => p.bossQuest?.includes('lampwight'));
  },

  /* ------------------------------------------------------------ warnings */

  /** Circles on the ground that fill up before something lands there (shown to the whole party). */
  _warn(circles, life, send = true) {
    for (const c of circles) this.warnings.push({ x: c.x, z: c.z, r: c.r, t: 0, life });
    if (send) this.net?.event({ k: 'warn', c: circles.map((c) => [Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10, c.r]), t: life });
  },

  updateWarnings(dt) {
    this._warnPool ??= [];
    this.warnings = this.warnings.filter((w) => (w.t += dt) < w.life);
    while (this._warnPool.length < this.warnings.length) {
      const mk = (geo) => {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
        m.renderOrder = 3;
        this.scene.add(m);
        return m;
      };
      this._warnPool.push({ ring: mk(this.ringGeo), disc: mk(this.discGeo) });
    }
    this._warnPool.forEach((m, i) => {
      const w = this.warnings[i];
      m.ring.visible = m.disc.visible = Boolean(w);
      if (!w) return;
      m.ring.position.set(w.x, 0.05, w.z);
      m.disc.position.set(w.x, 0.045, w.z);
      m.ring.scale.setScalar(w.r);
      m.disc.scale.setScalar(Math.max(0.01, w.r * (w.t / w.life)));
      m.ring.material.opacity = 0.55 + 0.35 * Math.sin(this.t * 30);
      m.disc.material.opacity = 0.35;
    });
  },

  /* ------------------------------------------------------------ missiles */

  _foeMissile(e, kind, ang, speed, y = 1.2) {
    const p = this._projectile(kind, e.x, y, e.z, Math.sin(ang), Math.cos(ang), speed, { owner: 'foe', from: e, life: 3.2 });
    this.net?.event({ k: 'proj', kind, x: Math.round(e.x * 10) / 10, y, z: Math.round(e.z * 10) / 10, a: Math.round(ang * 100) / 100, s: speed });
    return p;
  },

  /** A missile's mesh: a glowing orb (by kind), an arrow, a lance of ice. */
  _missileMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'arrow' || kind === 'lance') {
      const geo = kind === 'arrow' ? this.arrowGeo : this.lanceGeo;
      const m = new THREE.Mesh(geo, kind === 'arrow' ? this.arrowMat : this.lanceMat);
      m.userData.shared = true;
      g.add(m);
      if (kind === 'lance') {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color('#7ad8ff').multiplyScalar(1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.scale.setScalar(1.2);
        g.add(glow);
        g.userData.glow = glow;
      }
      return g;
    }
    const [core, halo, size] = kind === 'fire' ? ['#ffb050', '#ff7a2a', 0.2] : kind === 'bolt' ? ['#c8a0ff', '#8a5aff', 0.16] : ORBS[kind] ?? ORBS.orb;
    const c = new THREE.Mesh(this.orbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(core).multiplyScalar(kind === 'fire' ? 3 : 2) }));
    c.scale.setScalar(size / 0.2);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(halo).multiplyScalar(1.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(size * 5.5);
    g.add(c, glow);
    g.userData.glow = glow;
    return g;
  },

  /* -------------------------------------------------------------- damage */

  /**
   * A hit on a monster (alone or as host: for real; as a guest: shown at once
   * and sent to the host). A shielded elite's ward soaks it first; a
   * shield-bearer facing the blow blocks most of it.
   */
  _applyDamage(e, amount, crit, kx, kz, effect = null, effectT = 0, cause = null, by = 'me', origin = null) {
    if (!e.alive) return;
    let amt = amount;
    const o = origin ?? (by === 'me' ? this.heroPos : null);
    if (e.def.attack === 'shield' && cause !== 'burn' && e.state !== 'recover' && e.stunT <= 0 && o) {
      const from = Math.atan2(o.x - e.x, o.z - e.z);
      if (angDiff(from, e.face) < Math.PI / 3) {
        amt = Math.max(1, Math.round(amt * 0.25));
        this.hud.number('Blocked', 'block', { x: e.x, y: e.actor.height + 0.6, z: e.z });
        this.fx('impacts/shield-block', e.x, e.actor.height * 0.5, e.z, { pxm: 60, color: 1.4, speed: 1.6 });
      }
    }
    if (e.shield > 0) {
      const soak = Math.min(e.shield, amt);
      e.shield -= soak;
      amt -= soak;
      if (e.shield <= 0) {
        e.shieldT = 0;
        this.fx('impacts/shield-block', e.x, e.actor.height * 0.5, e.z, { pxm: 50, color: 1.6 });
      }
    }
    e.hp -= amt;
    e.lastHit = 0;
    e.actor.flash = 0.12;
    if (o) e.actor.hitFrom?.(Math.atan2(o.x - e.x, o.z - e.z), e.def.boss ? 0.3 : crit ? 1.4 : 1);
    if (!e.def.boss) {
      e.kx += kx;
      e.kz += kz;
    } else {
      e.kx += kx * 0.15;
      e.kz += kz * 0.15;
    }
    if (e.state === 'idle' || e.state === 'return') e.state = 'chase';
    if (effect === 'stun' && !e.def.boss) e.stunT = Math.max(e.stunT, effectT);
    if (effect === 'stun' && e.def.boss) e.stunT = Math.max(e.stunT, effectT * 0.25);
    if (effect === 'slow') {
      e.slowT = Math.max(e.slowT, effectT);
      e.slowK = 0.5;
    }
    if (effect === 'root') e.rootT = Math.max(e.rootT, effectT);
    if (effect === 'burn') {
      e.burnT = Math.max(e.burnT, effectT);
      e.burnDps = Math.max(e.burnDps, amount * 0.25);
    }
    e.reel = 1;
    if (e.hp <= 0) this.killEnemy(e, by);
  },

  /** A monster breaks apart into its own blocks (they fly away from the last blow, bounce and settle). */
  _shatterFoe(e) {
    if (!this.vfx || !e.actor.group.visible) return;
    const pal = e.actor.palette?.() ?? [new THREE.Color('#8a7a6a')];
    const from = this.heroPos;
    const ang = Math.atan2(e.x - from.x, e.z - from.z);
    const glowC = { wisp: '#7ff0ff', cinderling: '#ffb040', shardling: '#bff4ff', golem: '#ff8a2a', lampwight: '#7ff0ff', tyrant: '#ff6a2a', gnarlroot: '#c8ff8a', acolyte: '#ffb040', matron: '#bff4ff' }[e.kind] ?? (e.elite ? R.ELITE_AFFIXES[e.elite.affixes[0]]?.color : null);
    this.vfx.shatterFigure(e.x, e.z, pal, { height: e.actor.height, scale: Math.max(0.8, e.actor.scale ?? 1), angle: ang, glowColor: glowC, big: Boolean(e.def.boss) });
    if (e.def.boss) {
      this.vfx.ring(e.x, e.z, { color: e.def.light ?? '#ffd27a', r0: 0.5, r1: 9, life: 0.9, width: 0.3 });
      this.vfx.flash(e.x, 2, e.z, e.def.light ?? '#ffd27a', 60, 0.8);
      this.pulse = Math.max(this.pulse ?? 0, 1);
    }
  },

  /** A monster dies: rewards for everyone in the party here (each rolls their own loot), splitting, the boss. */
  killEnemy(e, by = 'me') {
    e.alive = false;
    e.state = 'dead';
    e.respawn = e.def.respawn;
    this._shatterFoe(e);
    e.actor.group.visible = false;
    e.tele = null;
    this._drawTele(e);
    if (e.mound) e.mound.visible = false;
    const ev = { k: 'kill', nid: e.nid, kind: e.kind, x: Math.round(e.x * 10) / 10, z: Math.round(e.z * 10) / 10, elite: e.elite ? 1 : 0, boss: e.def.boss ? 1 : 0, summoned: e.summoned ? 1 : 0, small: e.small ? 1 : 0 };
    this.net?.event(ev);
    this._onKill(ev);
    // A splitter comes apart into smaller copies.
    if (e.st.split) {
      for (let i = 0; i < e.st.split; i++) {
        const a = (i / e.st.split) * TAU + 0.4;
        const s = this._spawnEnemy(e.kind, e.x + Math.cos(a) * 1.2, e.z + Math.sin(a) * 1.2, { summoned: true, small: true });
        s.state = 'chase';
      }
    }
    if (e.def.boss) {
      this.boss = null;
      this._bossDownUntil = this.state.time + e.def.respawn;
      if (e.kind === 'lampwight') {
        for (const o of this.enemies) if (o.alive && o.kind === 'wisp' && Math.hypot(o.x - e.x, o.z - e.z) < 30) {
          o.alive = false;
          o.state = 'dead';
          o.respawn = 120;
          o.actor.group.visible = false;
          this.fx('spawn/soul-rise', o.x, 0, o.z, { pxm: 48, color: 1.6, palette: WISP_RAMP });
          this.net?.event({ k: 'gone', nid: o.nid });
        }
      }
    }
  }
};
