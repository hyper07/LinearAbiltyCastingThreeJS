/**
 * Gloamreach's monsters alive: each kind's model loaded once (polyfork's
 * rigged beasts and creatures — their materials upgraded the way the people's
 * are, tinted, with a hit flash and a dissolve), cloned per monster, and run
 * by a small mind:
 *
 *   idle → patrol (wander near home) → alert (notices you; a pack wakes
 *   together) → chase → wind-up (a tell: a pose, a sound, a mark on the
 *   ground that fills) → strike → recover → chase … → return (strayed past
 *   its leash: runs home, heals) ; hit reactions and staggers; stunned,
 *   frozen, rooted, slowed, burning; death (falls, then burns away into
 *   embers) and a respawn some time later, out of sight.
 *
 * Quadrupeds and spiders have no attack clips, so their attacks are posed
 * from their bones (a crouch and a lunge, jaws snapping, a rear-up); the
 * humanoids borrow Mesh2Motion's (ground pound, hook, roar, hit, death).
 */
import * as THREE from 'three';
import { loadTemplate, Actor } from './actors.js';
import { monsterDef, spawnList, chooseAttack, beyondLeash, RESPAWN, tierOf } from './bestiary.js';
import { monsterStats } from './rules.js';
import { characterMaterial } from './actors.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const HUMANOID_CLIPS = ['Smash', 'Swipe', 'Punch', 'Roar', 'Hit', 'Die'];

export class Monsters {
  constructor({ scene, world, bank, vfx }) {
    this.scene = scene;
    this.world = world;
    this.bank = bank;
    this.vfx = vfx;
    this.colliders = world.colliders;
    this.templates = {};
    this.list = [];
    this.events = [];
    this.t = 0;
  }

  async load(onProgress = () => {}) {
    const models = new Map();
    for (const s of spawnList()) {
      const d = monsterDef(s.type);
      if (d.model) models.set(d.model, d.rig);
    }
    let k = 0;
    await Promise.all([...models].map(async ([model, rig]) => {
      this.templates[model] = await loadTemplate(model, { detail: this.bank.noise(), borrow: rig === 'humanoid' ? HUMANOID_CLIPS : [], rim: 0.5 });
      onProgress(++k / models.size);
    }));
    for (const s of spawnList()) this.list.push(this._make(s));
  }

  /* ------------------------------------------------------------ making one */

  _make(s) {
    const def = monsterDef(s.type);
    const stats = monsterStats(def, s.level);
    const m = {
      id: s.id, type: s.type, def, level: s.level, group: s.group, stats,
      hp: stats.maxHp, maxHp: stats.maxHp, homeX: s.x, homeZ: s.z, x: s.x, z: s.z, y: this.colliders.height(s.x, s.z), yaw: Math.random() * TAU,
      state: 'idle', st: rnd(0.5, 3), alive: true, cd: new Map(), status: { stun: 0, freeze: 0, root: 0, slow: 0, slowT: 0, burn: 0, burnDps: 0 },
      elite: Boolean(def.elite), boss: Boolean(def.boss), tier: tierOf(def), r: def.radius * (def.scale ?? 1), name: def.name, title: def.title ?? '',
      vel: V(), knock: V(), flash: 0, flinch: 0, pose: { crouch: 0, lunge: 0, rear: 0, roar: 0, dead: 0 }, dissolve: 0, seen: false, engaged: 0,
      holder: new THREE.Group()
    };
    const tpl = def.model ? this.templates[def.model] : null;
    if (def.rig === 'wisp' || !tpl) this._wisp(m);
    else {
      const scale = def.scale ?? 1;
      const actor = new Actor(tpl, def.height ? { height: def.height * scale } : {});
      if (!def.height) {
        // Size quadrupeds by their length nose to tail.
        const box = new THREE.Box3().setFromObject(tpl.gltf.scene);
        const len = Math.max(box.max.z - box.min.z, box.max.x - box.min.x, 0.1);
        const s2 = (def.length * scale) / len;
        actor.model.scale.setScalar(s2);
        actor.scaleK = s2;
        actor.strides = Object.fromEntries(Object.entries(tpl.strides).map(([k2, v]) => [k2, v * s2]));
      }
      m.actor = actor;
      m.holder.add(actor.object);
      m.mats = [];
      const tint = new THREE.Color(...(def.tint ?? [1, 1, 1]));
      actor.model.traverse((o) => {
        if (!o.isMesh) return;
        const u = o.material.userData.char;
        if (!u) return;
        // A stronger rim than the villagers', so a monster reads against the dark of the woods.
        o.material = characterMaterial(o.material, { detail: u.tDetail.value, rim: def.family === 'spider' || def.family === 'fey' || def.family === 'wood' ? 1.4 : 0.9, fx: true });
        const fu = o.material.userData.char;
        fu.uTintMul.value.copy(tint);
        fu.uMetalK.value = 0.15;
        fu.uEdge.value.set(...(def.family === 'fey' || def.family === 'spider' ? [2.2, 0.8, 3.4] : [3.4, 1.3, 0.3]));
        m.mats.push(fu);
      });
      m.bones = actor.bones;
      // Bones we pose by hand go back to rest each frame before the clip (some clips leave them alone).
      m.posed = Object.values(actor.bones).filter((b) => /^(Head|Neck|Jaw|Spine|Tail|Abdomen|LeftFang|RightFang|(Left|Right)Leg\dHip)$/.test(b.name));
      m.rest = m.posed.map((b) => b.quaternion.clone());
    }
    if (m.elite || m.boss) {
      m.aura = this.vfx.glowDecal({ x: m.x, z: m.z, radius: m.r * 2.6, color: m.boss ? '#ff5a1a' : def.glow ?? '#ffb040', alpha: 0.45 });
    }
    m.holder.position.set(m.x, m.y, m.z);
    m.holder.rotation.y = m.yaw;
    this.scene.add(m.holder);
    return m;
  }

  /** A corrupted wisp: a dark heart in violet fire, shards circling it. */
  _wisp(m) {
    const g = m.holder;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 3), new THREE.MeshStandardMaterial({ color: 0x1a0820, emissive: 0xc040ff, emissiveIntensity: 2.2, roughness: 0.3 }));
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.5, 2.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    core.position.y = shell.position.y = m.def.fly;
    g.add(core, shell);
    m.wisp = { core, shell, shards: [] };
    const sm = new THREE.MeshStandardMaterial({ color: 0x2a1030, emissive: 0x9040ff, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.2 });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), sm);
      s.scale.set(0.6, 1.6, 0.6);
      g.add(s);
      m.wisp.shards.push(s);
    }
    m.mats = [];
  }

  /* ------------------------------------------------------------ queries */

  /** The living, for aiming and hitting. */
  alive() {
    return this.list.filter((m) => m.alive && m.state !== 'spawning');
  }

  near(p, r) {
    return this.list.filter((m) => m.alive && Math.hypot(m.x - p.x, m.z - p.z) < r + m.r);
  }

  /** The point to aim at on a monster (its chest). */
  centre(m) {
    const h = m.def.rig === 'wisp' ? m.def.fly : (m.def.height ?? m.def.length * 0.45) * (m.def.scale ?? 1) * (m.def.rig === 'humanoid' ? 0.55 : 0.6);
    return V(m.x, m.y + h, m.z);
  }

  /** How tall it stands (for bars over its head). */
  top(m) {
    if (m.def.rig === 'wisp') return m.y + m.def.fly + 0.6;
    return m.y + (m.def.height ?? m.def.length * 0.62) * (m.def.scale ?? 1) * (m.def.rig === 'drake' ? 0.7 : 1) + 0.25;
  }

  /* ------------------------------------------------------------ being hurt */

  /**
   * Damage a monster: { amount, crit, from (x, z of the blow), knock, stun,
   * freeze, slow, burn, heavy }. Returns true if it died.
   */
  damage(m, hit, hero) {
    if (!m.alive || m.state === 'spawning') return false;
    m.hp = Math.max(0, m.hp - hit.amount);
    m.flash = hit.crit ? 1.4 : 1;
    m.flinch = 1;
    m.engaged = 8;
    const dx = m.x - (hit.from?.x ?? m.x);
    const dz = m.z - (hit.from?.z ?? m.z);
    const d = Math.hypot(dx, dz) || 1;
    const resist = m.boss ? 0.1 : m.elite ? 0.35 : 1;
    if (hit.knock) m.knock.set((dx / d) * hit.knock * resist, 0, (dz / d) * hit.knock * resist);
    const s = m.status;
    if (hit.stun) s.stun = Math.max(s.stun, hit.stun * (m.boss ? 0.35 : m.elite ? 0.6 : 1));
    if (hit.freeze) s.freeze = Math.max(s.freeze, hit.freeze * (m.boss ? 0.3 : m.elite ? 0.6 : 1));
    if (hit.slow) {
      s.slow = Math.max(s.slow, hit.slow);
      s.slowT = Math.max(s.slowT, hit.slowT ?? 2);
    }
    if (hit.burn) {
      s.burn = Math.max(s.burn, hit.burnT ?? 3);
      s.burnDps = Math.max(s.burnDps, hit.burn);
    }
    if (m.hp <= 0) {
      this._die(m);
      return true;
    }
    // A heavy blow interrupts a common monster's wind-up.
    if ((hit.heavy || hit.stun) && !m.elite && !m.boss && m.state === 'windup') this._interrupt(m);
    if (m.actor && m.def.rig === 'humanoid' && (hit.heavy || hit.crit) && m.state !== 'windup' && m.state !== 'strike') m.actor.act('Hit', { loop: false, fade: 0.08, speed: 1.4 });
    if (['idle', 'patrol', 'return'].includes(m.state) && hero) this._alert(m, hero, true);
    return false;
  }

  _interrupt(m) {
    m.tele?.remove();
    m.tele = null;
    m.state = 'chase';
    m.st = 0.4;
    m.attack = null;
    m.pose.crouch = 0;
    m.pose.rear = 0;
    m.actor?.rest(0.15);
  }

  _die(m) {
    m.alive = false;
    m.tele?.remove();
    m.tele = null;
    m.state = 'dead';
    m.st = 0;
    m.dissolve = 0;
    m.respawnAt = this.t + RESPAWN[m.tier];
    if (m.actor) {
      if (m.def.rig === 'humanoid' && m.actor.act('Die', { loop: false, fade: 0.1, clamp: true })) m.clipDeath = true;
    }
    this.events.push({ type: 'death', m, at: this.centre(m) });
  }

  _alert(m, hero, hurt = false) {
    if (!['idle', 'patrol', 'return'].includes(m.state)) return;
    m.state = 'alert';
    m.st = hurt ? 0.15 : m.boss ? 1.4 : m.elite ? 0.9 : 0.45;
    m.target = hero;
    m.engaged = 10;
    this.events.push({ type: 'aggro', m });
    if (!hurt && m.actor && m.def.rig === 'humanoid' && (m.elite || m.boss)) m.actor.act('Roar', { loop: false, fade: 0.2 });
    if (m.group) for (const o of this.list) if (o !== m && o.group === m.group && o.alive) this._alert(o, hero, true);
  }

  /* ------------------------------------------------------------ the mind */

  /**
   * One step for every monster: `hero` { pos, alive, untouchable }; `hooks`
   * { hitHero(m, attack, opts), projectile(m, attack, from, to) }.
   */
  update(dt, t, hero, hooks, camera) {
    this.t = t;
    for (const m of this.list) {
      const dHero = hero ? Math.hypot(hero.pos.x - m.x, hero.pos.z - m.z) : Infinity;
      const far = Math.hypot(camera.position.x - m.x, camera.position.z - m.z);
      // Out of range: frozen in place (and hidden when far).
      m.holder.visible = far < Math.min(140, this.drawFar ?? Infinity) && m.state !== 'gone';
      if (m.aura) m.aura.mesh.visible = m.holder.visible && m.alive;
      if (m.state === 'gone') {
        if (t >= m.respawnAt && (!hero || dHero > 32)) this._respawn(m);
        continue;
      }
      if (far > 95 && m.state !== 'dead' && m.state !== 'return') continue;
      if (m.state === 'dead') {
        this._dying(m, dt);
        continue;
      }
      this._think(m, dt, hero, dHero, hooks);
      this._move(m, dt);
      this._animate(m, dt, t);
    }
  }

  _think(m, dt, hero, dist, hooks) {
    const def = m.def;
    const s = m.status;
    m.st -= dt;
    m.engaged = Math.max(0, m.engaged - dt);
    for (const k of ['stun', 'freeze', 'root']) s[k] = Math.max(0, s[k] - dt);
    if ((s.slowT -= dt) <= 0) s.slow = 0;
    if (s.burn > 0) {
      s.burn -= dt;
      m.burnAcc = (m.burnAcc ?? 0) + dt;
      if (m.burnAcc > 0.5) {
        m.burnAcc = 0;
        this.events.push({ type: 'burn', m, amount: Math.max(1, Math.round(s.burnDps * 0.5)) });
      }
    }
    if (m.state === 'spawning') {
      m.dissolve = Math.max(0, m.dissolve - dt * 0.9);
      for (const fu of m.mats) fu.uDissolve.value = m.dissolve;
      if (m.dissolve <= 0) {
        m.state = 'idle';
        m.st = 1;
      }
      return;
    }
    const heroOk = hero && hero.alive;
    const wantSpeed = (v) => v * (1 - s.slow) * (s.root > 0 ? 0 : 1);
    if (s.stun > 0 || s.freeze > 0) {
      m.want = 0;
      if (m.state === 'windup' || m.state === 'strike') this._interrupt(m);
      return;
    }
    switch (m.state) {
      case 'idle':
      case 'patrol': {
        if (heroOk && dist < def.aggro && !hero.hidden) {
          this._alert(m, hero);
          break;
        }
        if (m.state === 'idle') {
          m.want = 0;
          if (m.st <= 0) {
            const a = Math.random() * TAU;
            const r = Math.random() * def.roam;
            m.goal = V(m.homeX + Math.cos(a) * r, 0, m.homeZ + Math.sin(a) * r);
            m.state = 'patrol';
            m.st = 8;
          }
        } else {
          const dx = m.goal.x - m.x;
          const dz = m.goal.z - m.z;
          const d = Math.hypot(dx, dz);
          m.faceTo = Math.atan2(dx, dz);
          m.want = d > 0.6 ? wantSpeed(def.walk) : 0;
          if (d < 0.6 || m.st <= 0) {
            m.state = 'idle';
            m.st = rnd(2, 6);
          }
        }
        break;
      }
      case 'alert': {
        m.want = 0;
        if (heroOk) m.faceTo = Math.atan2(hero.pos.x - m.x, hero.pos.z - m.z);
        if (m.st <= 0) {
          m.state = 'chase';
          m.st = 0;
        }
        break;
      }
      case 'chase': {
        if (!heroOk || beyondLeash(m, def) || dist > def.leash * 1.4) {
          m.state = 'return';
          m.actor?.rest(0.3);
          break;
        }
        m.faceTo = Math.atan2(hero.pos.x - m.x, hero.pos.z - m.z);
        const reach = dist - m.r - 0.4;
        if (m.st <= 0) {
          const atk = chooseAttack(def, reach, (id) => (m.cd.get(id) ?? 0) <= this.t);
          if (atk) {
            this._windup(m, atk, hero);
            break;
          }
        }
        // Close in (wisps keep their distance).
        const keep = def.keepAway ?? 0;
        if (keep && reach < keep * 0.7) m.want = -wantSpeed(def.walk * 1.5);
        else m.want = reach > (keep || def.attacks[0].range * 0.7) ? wantSpeed(def.run) : 0;
        break;
      }
      case 'windup': {
        m.want = 0;
        const a = m.attack;
        const k = 1 - m.st / a.windup;
        // Track the hero until late in the tell, then commit.
        if (heroOk && k < 0.65 && a.kind !== 'charge') m.faceTo = Math.atan2(hero.pos.x - m.x, hero.pos.z - m.z);
        if (m.tele && a.kind !== 'aoe') this.vfx.placeDecal(m.tele, m.x, m.z, m.yaw, m.tele.radius);
        if (m.st <= 0) this._strike(m, hero, hooks);
        break;
      }
      case 'strike': {
        const a = m.attack;
        if (a.kind === 'charge') {
          m.want = 0;
          const sp = a.speed;
          m.vel.set(Math.sin(m.chargeYaw) * sp, 0, Math.cos(m.chargeYaw) * sp);
          if (heroOk && !m.hitDone && Math.hypot(hero.pos.x - m.x, hero.pos.z - m.z) < m.r + 0.9) {
            m.hitDone = true;
            hooks.hitHero(m, a, { from: { x: m.x, z: m.z }, knock: a.knock ?? 5 });
          }
        } else if (a.kind === 'breath') {
          m.want = 0;
          m.breathT = (m.breathT ?? 0) - dt;
          if (heroOk && dist > 2) {
            const want = Math.atan2(hero.pos.x - m.x, hero.pos.z - m.z);
            m.faceTo = m.yaw + THREE.MathUtils.clamp(wrap(want - m.yaw), -0.6 * dt, 0.6 * dt);
          }
          if (m.breathT <= 0) {
            m.breathT = a.tick;
            this.events.push({ type: 'breath', m });
            if (heroOk && dist < a.range && Math.abs(wrap(Math.atan2(hero.pos.x - m.x, hero.pos.z - m.z) - m.yaw)) < a.arc / 2) hooks.hitHero(m, a, { from: { x: m.x, z: m.z }, burn: true });
          }
        } else m.want = 0;
        if (m.st <= 0) {
          m.state = 'recover';
          m.st = a.kind === 'charge' ? 0.7 : 0.35 + (m.boss ? 0.3 : 0);
          m.vel.set(0, 0, 0);
          if (m.def.rig === 'drake') m.actor?.rest(0.4);
        }
        break;
      }
      case 'recover': {
        m.want = 0;
        if (m.st <= 0) {
          m.state = 'chase';
          m.st = rnd(0.15, 0.6);
          if (m.def.rig === 'humanoid') m.actor?.rest(0.25);
        }
        break;
      }
      case 'return': {
        const dx = m.homeX - m.x;
        const dz = m.homeZ - m.z;
        const d = Math.hypot(dx, dz);
        m.faceTo = Math.atan2(dx, dz);
        m.want = def.run;
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
        if (d < 1.5) {
          m.state = 'idle';
          m.st = 2;
          m.hp = m.maxHp;
          s.burn = 0;
        }
        break;
      }
    }
  }

  _windup(m, atk, hero) {
    m.state = 'windup';
    m.attack = atk;
    m.st = atk.windup;
    m.cd.set(atk.id, this.t + atk.cd + atk.windup);
    m.engaged = 10;
    // Where it will land, marked on the ground.
    const fy = m.yaw;
    if (atk.kind === 'melee') m.tele = this.vfx.telegraph({ x: m.x, z: m.z, radius: atk.range + m.r, yaw: fy, arc: atk.arc, time: atk.windup });
    else if (atk.kind === 'sweep') m.tele = this.vfx.telegraph({ x: m.x, z: m.z, radius: atk.radius, time: atk.windup });
    else if (atk.kind === 'breath') m.tele = this.vfx.telegraph({ x: m.x, z: m.z, radius: atk.range, yaw: fy, arc: atk.arc, time: atk.windup, color: '#ff7a1a' });
    else if (atk.kind === 'charge') m.tele = this.vfx.telegraph({ x: m.x, z: m.z, radius: atk.range, yaw: fy, arc: 0.22, time: atk.windup });
    else if (atk.kind === 'aoe') {
      const at = atk.at === 'target' && hero ? { x: hero.pos.x, z: hero.pos.z } : atk.at === 'front' ? { x: m.x + Math.sin(fy) * (m.r + atk.radius * 0.6), z: m.z + Math.cos(fy) * (m.r + atk.radius * 0.6) } : { x: m.x, z: m.z };
      m.aoeAt = [at];
      if (atk.count > 1 && hero) for (let i = 1; i < atk.count; i++) m.aoeAt.push({ x: hero.pos.x + rnd(-5, 5), z: hero.pos.z + rnd(-5, 5) });
      m.teles = m.aoeAt.map((p) => this.vfx.telegraph({ x: p.x, z: p.z, radius: atk.radius, time: atk.windup, color: atk.fire ? '#ff6a1a' : atk.poison ? '#8aff4a' : '#ff4a2a' }));
      m.tele = null;
    } else m.tele = null;
    if (m.actor && m.def.rig === 'humanoid' && atk.anim) {
      // Time the clip so its blow falls as the wind-up ends.
      const clip = m.actor.actions[atk.anim]?.getClip();
      const hitAt = { Smash: 0.55, Swipe: 0.45, Punch: 0.42, Roar: 0.3 }[atk.anim] ?? 0.5;
      const speed = clip ? Math.max(0.6, Math.min(2.2, (clip.duration * hitAt) / atk.windup)) : 1;
      m.actor.act(atk.anim, { loop: false, fade: 0.12, speed });
    }
    if (m.def.rig === 'drake' && atk.kind === 'breath') m.actor?.act('FireBreath', { loop: true, fade: 0.3, speed: 0.9 });
    this.events.push({ type: 'windup', m, attack: atk });
  }

  _strike(m, hero, hooks) {
    const a = m.attack;
    m.tele = null;
    m.state = 'strike';
    m.st = a.kind === 'charge' ? a.range / a.speed : a.kind === 'breath' ? a.time : 0.22;
    m.hitDone = false;
    m.pose.lunge = 1;
    const heroOk = hero && hero.alive;
    const from = { x: m.x, z: m.z };
    this.events.push({ type: 'strike', m, attack: a });
    if (a.kind === 'melee') {
      if (a.lunge) m.knock.set(Math.sin(m.yaw) * a.lunge * 2.2, 0, Math.cos(m.yaw) * a.lunge * 2.2);
      if (heroOk) {
        const dx = hero.pos.x - m.x;
        const dz = hero.pos.z - m.z;
        const d = Math.hypot(dx, dz);
        const ang = Math.abs(wrap(Math.atan2(dx, dz) - m.yaw));
        if (d < a.range + m.r + 0.5 && ang < a.arc / 2 + 0.25) hooks.hitHero(m, a, { from, poison: a.poison });
      }
    } else if (a.kind === 'charge') {
      m.chargeYaw = m.yaw;
    } else if (a.kind === 'proj') {
      const spread = a.spread ?? 1;
      for (let i = 0; i < spread; i++) {
        const off = spread > 1 ? (i - (spread - 1) / 2) * 0.22 : 0;
        hooks.projectile(m, a, this.centre(m), heroOk ? hero.pos.clone().add(V(0, 1.1, 0)) : null, off);
      }
    } else if (a.kind === 'aoe') {
      for (const p of m.aoeAt ?? []) {
        this.events.push({ type: 'aoe', m, attack: a, at: V(p.x, this.colliders.height(p.x, p.z), p.z) });
        if (heroOk && Math.hypot(hero.pos.x - p.x, hero.pos.z - p.z) < a.radius + 0.3) hooks.hitHero(m, a, { from: p, stun: a.stun, root: a.root, poison: a.poison, burn: a.fire, knock: 4 });
      }
      m.aoeAt = null;
    } else if (a.kind === 'sweep') {
      m.spin = 1;
      if (heroOk && Math.hypot(hero.pos.x - m.x, hero.pos.z - m.z) < a.radius + 0.3) hooks.hitHero(m, a, { from, knock: a.knock });
      this.events.push({ type: 'aoe', m, attack: a, at: V(m.x, m.y, m.z) });
    } else if (a.kind === 'breath') {
      m.breathT = 0;
    }
  }

  _move(m, dt) {
    const def = m.def;
    // Turn toward the wanted heading.
    if (m.faceTo != null && m.state !== 'strike' || (m.state === 'strike' && m.attack?.kind === 'breath')) {
      const rate = (m.boss ? 2.2 : m.def.rig === 'humanoid' ? 4 : 7) * (m.status.slow ? 1 - m.status.slow * 0.5 : 1);
      if (m.faceTo != null) m.yaw = wrap(m.yaw + THREE.MathUtils.clamp(wrap(m.faceTo - m.yaw), -rate * dt, rate * dt));
    }
    let vx = m.vel.x;
    let vz = m.vel.z;
    if (m.want) {
      vx = Math.sin(m.yaw) * m.want;
      vz = Math.cos(m.yaw) * m.want;
    } else if (m.state !== 'strike') {
      vx = 0;
      vz = 0;
    }
    vx += m.knock.x;
    vz += m.knock.z;
    m.knock.multiplyScalar(Math.exp(-dt * 7));
    // Keep apart from each other.
    for (const o of this.list) {
      if (o === m || !o.alive || o.state === 'gone') continue;
      const dx = m.x - o.x;
      const dz = m.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = m.r + o.r;
      if (d < min && d > 1e-4) {
        vx += (dx / d) * (min - d) * 6;
        vz += (dz / d) * (min - d) * 6;
      }
    }
    const [nx, nz] = this.colliders.move(m.x, m.z, vx * dt, vz * dt, Math.min(0.9, m.r * 0.8), m.y);
    m.speed = Math.hypot(nx - m.x, nz - m.z) / Math.max(dt, 1e-4);
    m.x = nx;
    m.z = nz;
    const ground = this.colliders.height(nx, nz);
    m.y += (ground - m.y) * Math.min(1, dt * 12);
    if (m.aura) this.vfx.placeDecal(m.aura, m.x, m.z, 0, m.aura.radius);
    void def;
  }

  /* ------------------------------------------------------------ looks */

  _animate(m, dt, t) {
    const p = m.pose;
    const frozen = m.status.freeze > 0;
    m.flash = Math.max(0, m.flash - dt * 9);
    m.flinch = Math.max(0, m.flinch - dt * 5);
    const k = m.state === 'windup' ? 1 - m.st / m.attack.windup : 0;
    p.crouch += ((m.state === 'windup' ? k : 0) - p.crouch) * Math.min(1, dt * 12);
    p.lunge = Math.max(0, p.lunge - dt * 4);
    for (const fu of m.mats) {
      const f = m.flash * m.flash * (m.boss ? 0.12 : m.elite ? 0.2 : 0.32);
      const burn = m.status.burn > 0 ? 0.06 + Math.sin(this.t * 20) * 0.03 : 0;
      fu.uFlash.value.setRGB(f + (frozen ? 0.04 : 0) + burn, f * 0.85 + (frozen ? 0.16 : 0) + burn * 0.35, f * 0.7 + (frozen ? 0.32 : 0));
    }
    m.holder.position.set(m.x, m.y, m.z);
    m.holder.rotation.set(0, m.yaw, 0);
    if (m.wisp) return this._animWisp(m, dt, t, k);
    const a = m.actor;
    a.mixer.timeScale = frozen ? 0 : m.status.stun > 0 ? 0.25 : 1;
    const moving = m.state === 'strike' && m.attack?.kind === 'charge' ? m.attack.speed : m.speed;
    a.move(moving);
    m.posed.forEach((b, i) => b.quaternion.copy(m.rest[i]));
    a.update(dt);
    // Posed from the bones: the tell and the blow.
    const b = m.bones;
    const rig = m.def.rig;
    if (rig === 'quad' || rig === 'drake') {
      const charge = m.attack?.kind === 'charge' && m.state === 'windup';
      const crouch = p.crouch;
      const lunge = p.lunge;
      if (b.Head) b.Head.rotation.x += crouch * (charge ? 0.45 : -0.25) + lunge * 0.35 - m.flinch * 0.4;
      if (b.Neck) b.Neck.rotation.x += crouch * (charge ? 0.3 : -0.35) + lunge * 0.4;
      if (b.Jaw) b.Jaw.rotation.x += Math.max(crouch * 0.4, lunge * 0.8) + (m.state === 'strike' && m.attack?.kind === 'breath' ? 0.7 : 0);
      if (b.Spine) b.Spine.rotation.x += -crouch * 0.12 + lunge * 0.1;
      if (b.Tail) b.Tail.rotation.y += Math.sin(t * 9) * 0.15 * crouch;
      m.holder.position.y -= crouch * 0.12 * (m.def.scale ?? 1);
      m.holder.rotation.x = -crouch * (charge ? -0.08 : 0.1) + lunge * 0.12;
      m.holder.rotation.z = Math.sin(t * 40) * 0.03 * m.flinch;
      if (m.spin > 0) {
        m.spin = Math.max(0, m.spin - dt * 2.4);
        m.holder.rotation.y += (1 - m.spin) * TAU;
      }
    } else if (rig === 'spider') {
      const rear = p.crouch;
      m.holder.rotation.x = -rear * 0.55 + p.lunge * 0.3;
      m.holder.position.y += rear * 0.25 * (m.def.scale ?? 1);
      for (const s of ['Left', 'Right']) {
        const leg = b[`${s}Leg1Hip`];
        if (leg) leg.rotation.x -= rear * 0.9 - p.lunge * 0.6;
        const leg2 = b[`${s}Leg2Hip`];
        if (leg2) leg2.rotation.x -= rear * 0.4;
      }
      if (b.LeftFang) b.LeftFang.rotation.y += p.lunge * 0.5;
      if (b.RightFang) b.RightFang.rotation.y -= p.lunge * 0.5;
      if (b.Abdomen) b.Abdomen.rotation.x += Math.sin(t * 3) * 0.05 + m.flinch * 0.2;
      m.holder.rotation.z = Math.sin(t * 40) * 0.04 * m.flinch;
    } else {
      // Humanoids: clips carry it; a flinch rocks the body.
      if (b.Spine) b.Spine.rotation.x -= m.flinch * 0.25;
      if (a.overlay && a.done() && m.state !== 'windup' && m.state !== 'strike') a.rest(0.3);
    }
  }

  _animWisp(m, dt, t, k) {
    const w = m.wisp;
    const bob = Math.sin(t * 2.2 + m.homeX) * 0.18;
    w.core.position.y = w.shell.position.y = m.def.fly + bob;
    const pulse = 1 + Math.sin(t * 6) * 0.08 + k * 0.6 + m.flash * 0.4;
    w.shell.scale.setScalar(pulse);
    w.core.material.emissiveIntensity = 2.2 + k * 3 + m.flash * 4;
    w.shards.forEach((s, i) => {
      const a = t * (2 + k * 6) + (i / w.shards.length) * TAU;
      const r = 0.55 - k * 0.25;
      s.position.set(Math.cos(a) * r, m.def.fly + bob + Math.sin(a * 2) * 0.12, Math.sin(a) * r);
      s.rotation.y = a;
    });
    if (Math.random() < dt * 30) this.vfx.burst(V(m.x, m.y + m.def.fly + bob, m.z), 1, [1.8, 0.5, 2.6], { speed: 0.6, life: 0.8, size: 0.14, gravity: -0.6, drag: 1 });
  }

  _dying(m, dt) {
    m.st += dt;
    const p = m.pose;
    if (m.wisp) {
      if (m.st < 0.05) {
        this.vfx.explode(V(m.x, m.y + m.def.fly, m.z), 1.6, { color: 'arcane' });
      }
      m.holder.scale.setScalar(Math.max(0.01, 1 - m.st * 3));
      if (m.st > 0.5) this._gone(m);
      return;
    }
    // Fall: the beasts roll onto their side; the humanoids play their death.
    p.dead = Math.min(1, p.dead + dt * 2.2);
    const e = 1 - (1 - p.dead) ** 3;
    if (!m.clipDeath) {
      m.holder.rotation.z = e * (m.def.rig === 'spider' ? 0.3 : Math.PI / 2) * (m.id.charCodeAt(1) % 2 ? 1 : -1);
      m.holder.position.y = m.y + (m.def.rig === 'spider' ? -0.1 : e * 0.05);
    }
    if (m.actor) {
      m.actor.mixer.timeScale = m.clipDeath ? 1 : Math.max(0, 1 - m.st * 3);
      m.posed.forEach((b, i) => b.quaternion.copy(m.rest[i]));
      m.actor.update(dt);
      if (m.def.rig === 'spider') for (const s of ['Left', 'Right']) for (let i = 1; i <= 4; i++) {
        const leg = m.bones[`${s}Leg${i}Hip`];
        if (leg) leg.rotation.z += (s === 'Left' ? -1 : 1) * (1 - (1 - p.dead) ** 3) * 0.9;
      }
    }
    // Then burn away into embers.
    if (m.st > 1.1) {
      m.dissolve = Math.min(1, m.dissolve + dt * 0.75);
      for (const fu of m.mats) fu.uDissolve.value = m.dissolve;
      if (Math.random() < dt * 40) {
        const c = this.centre(m);
        const sc = m.r * 1.5;
        this.vfx.burst(c.add(V(rnd(-sc, sc), rnd(-0.4, 0.4), rnd(-sc, sc))), 1, m.def.family === 'fey' || m.def.family === 'spider' ? [2, 0.8, 3] : [3, 1.3, 0.3], { speed: 0.8, life: 1.2, size: 0.1, gravity: -1.2 });
      }
    }
    if (m.dissolve >= 1) this._gone(m);
  }

  _gone(m) {
    m.state = 'gone';
    m.holder.visible = false;
    if (m.aura) m.aura.mesh.visible = false;
  }

  _respawn(m) {
    m.x = m.homeX;
    m.z = m.homeZ;
    m.y = this.colliders.height(m.x, m.z);
    m.hp = m.maxHp;
    m.alive = true;
    m.state = 'spawning';
    m.dissolve = 1;
    m.clipDeath = false;
    m.pose.dead = 0;
    m.status = { stun: 0, freeze: 0, root: 0, slow: 0, slowT: 0, burn: 0, burnDps: 0 };
    m.holder.visible = true;
    m.holder.scale.setScalar(1);
    m.holder.rotation.set(0, m.yaw, 0);
    m.actor?.rest(0);
    if (m.actor) for (const a of Object.values(m.actor.actions)) if (!m.actor.loco.includes(a.getClip().name)) a.stop();
    for (const fu of m.mats) fu.uDissolve.value = 1;
    this.events.push({ type: 'respawn', m });
  }

  /** Spawning: the dissolve runs backward (called through _think's 'spawning'). */
  postFrame() {
    for (const m of this.list) if (m.state === 'spawning') for (const fu of m.mats) fu.uDissolve.value = m.dissolve;
  }

  /** Everyone back home, healed (when the hero falls). */
  resetAll() {
    for (const m of this.list) {
      if (!m.alive) continue;
      m.tele?.remove();
      for (const t of m.teles ?? []) t.remove?.();
      m.tele = null;
      if (m.state !== 'idle' && m.state !== 'patrol') {
        m.state = 'return';
        m.actor?.rest(0.2);
      }
    }
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  dispose() {
    for (const m of this.list) {
      m.holder.removeFromParent();
      m.actor?.dispose();
      m.aura?.remove();
    }
  }
}
