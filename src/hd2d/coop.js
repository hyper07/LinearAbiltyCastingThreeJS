/**
 * Lanternwood co-op, 2–4 players, over the platform's party relay
 * (src/net/Session.js → server/realtime.js at /ws — nothing new on the
 * server). One player makes a party (a five-letter code), the others join.
 *
 *  - The host runs the monsters, their attacks and deaths, and the realm the
 *    party is in; guests mirror the host's monsters and follow it through
 *    the waystones.
 *  - Every player runs their own hero and sends it (where, pose, class,
 *    gear, health) with the hits they land; the host applies the hits.
 *  - Quest progress stays each player's own; every kill in the realm counts
 *    for everyone there, and each player rolls their own loot.
 *
 * Messages (pure helpers and checks in netcode.js): 'ld-me' from everyone,
 * 'ld-tick' from the host, each about 12 times a second.
 */
import * as THREE from 'three';
import { Session } from '../net/Session.js';
import * as R from './rules.js';
import { NET_HZ, packFoe, packGear, readHero, readTick } from './netcode.js';
import { RigActor } from './rig.js';
import { heroSpriteFor } from './sprites.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export class Coop {
  constructor(game) {
    this.game = game;
    this.session = null;
    /** id → a remote player: their latest message, their figure, where they are drawn. */
    this.peers = new Map();
    this.out = [];
    this.mineEv = [];
    this.hits = [];
    this.sendT = 0;
    this.status = '';
  }

  get room() {
    return this.session?.room ?? null;
  }

  get isHost() {
    return Boolean(this.session?.room && this.session.isHost);
  }

  get isGuest() {
    return Boolean(this.session?.room && !this.session.isHost);
  }

  get myId() {
    return this.session?.id ?? null;
  }

  /** Players in this realm, counting me. */
  partySize() {
    return 1 + this.peersHere().length;
  }

  /** Remote players standing in my realm (with a recent message). */
  peersHere() {
    const now = performance.now();
    return [...this.peers.values()].filter((p) => p.realm === this.game.realm && now - p.at < 4000);
  }

  /* ---------------------------------------------------------- rooms */

  async open(how, code = '') {
    const g = this.game;
    this.close(false);
    const s = new Session();
    this.session = s;
    const name = g.account?.name ?? R.lookById(g.hero.look)?.name ?? 'Wayfarer';
    s.on('message', (msg) => this.receive(msg));
    s.on('peer', (p) => {
      g.hud.toast(`<b>${escapeHtml(p.name)}</b> joined the party`, 'quest');
      g.refreshParty?.();
    });
    s.on('left', (id, who) => {
      this._dropPeer(id);
      g.hud.toast(`${escapeHtml(who ?? 'A player')} left the party`);
      g.refreshParty?.();
    });
    s.on('closed', () => this._gone('The host closed the party.'));
    s.on('disconnected', () => this._gone('The connection to the party was lost.'));
    this.status = 'Connecting…';
    try {
      await (how === 'create' ? s.create(name) : s.join(code, name));
      this.status = '';
      if (s.isHost) {
        g.hud.toast(`<small>Party open</small><b>Code ${s.room}</b><span>Friends join with this code (P)</span>`, 'quest');
      } else {
        g.hud.toast(`<small>Joined</small><b>Party ${s.room}</b><span>The host's world: monsters and realm are theirs</span>`, 'quest');
        // A guest's world is the host's: drop our own monsters, wait for theirs.
        for (const e of g.enemies) g._disposeEnemy(e);
        g.enemies = [];
        g.boss = null;
      }
      g.refreshParty?.();
      return true;
    } catch (e) {
      this.session = null;
      this.status = e?.message ?? 'Could not reach the party server.';
      g.refreshParty?.();
      return false;
    }
  }

  _gone(text) {
    const wasGuest = this.isGuest || (this.session && !this.session.isHost);
    this.close(false);
    const g = this.game;
    g.hud.toast(text, 'warn');
    if (wasGuest && g.mode !== 'title') g._spawnRealmFoes();
    g.refreshParty?.();
  }

  /** Leave the party (alone again: a guest gets their own world back). */
  leave() {
    const wasGuest = this.isGuest;
    this.close(true);
    if (wasGuest) this.game._spawnRealmFoes();
    this.game.refreshParty?.();
  }

  close(say = true) {
    for (const id of [...this.peers.keys()]) this._dropPeer(id);
    const s = this.session;
    this.session = null;
    s?.close();
    if (say) this.status = '';
  }

  _dropPeer(id) {
    const p = this.peers.get(id);
    if (!p) return;
    p.actor?.dispose();
    this.peers.delete(id);
  }

  /* ---------------------------------------------------------- queueing */

  /** A world event (host only): sent with the next tick. */
  event(ev) {
    if (this.isHost) this.out.push(ev);
  }

  /** Something my hero did that others should see (a swing, a missile, a skill). */
  mine(ev) {
    if (this.room) this.mineEv.push(ev);
  }

  /** A hit I landed on one of the host's monsters. */
  hit(e, amount, crit, kx, kz, effect, effectT) {
    this.hits.push([e.nid, amount, crit ? 1 : 0, r1(kx), r1(kz), effect ?? null, r1(effectT ?? 0)]);
  }

  /* ---------------------------------------------------------- sending */

  update(dt) {
    if (!this.room) return;
    const g = this.game;
    this.sendT -= dt;
    if (this.sendT <= 0 && g.hero) {
      this.sendT = 1 / NET_HZ;
      this._sendMe();
      if (this.isHost) this._sendTick();
    }
    this._drawPeers(dt);
  }

  _sendMe() {
    const g = this.game;
    const hv = g.hv ?? {};
    const a = g.heroActor.act ?? {};
    const s = g.stats;
    this.session.send({
      t: 'ld-me',
      n: g.account?.name ?? R.lookById(g.hero.look)?.name ?? 'Wayfarer',
      c: g.hero.cls,
      lk: g.hero.look,
      lv: g.hero.level,
      hp: Math.round(g.hero.hp),
      mhp: s.maxHp,
      df: s.def,
      r: g.realm,
      x: r2(g.heroPos.x),
      z: r2(g.heroPos.z),
      f: r2(g.heroPos.face),
      a: [r2(a.move ?? 0), a.swing?.pose ?? 0, r2(a.swing?.t ?? 0), a.spin == null ? -1 : r2(a.spin), a.cast == null ? -1 : r2(a.cast), a.roll == null ? -1 : r2(a.roll), r2(a.hurt ?? 0), a.dead ? 1 : 0, a.pose?.id ?? 0, r2(a.pose?.t ?? 0), a.guard ? 1 : 0],
      g: packGear(g.gearLook),
      bq: ['lampwight'].filter((k) => g.state.quests[k]?.state === 'active'),
      h: this.hits.splice(0, 24),
      ev: this.mineEv.splice(0, 24)
    });
    void hv;
  }

  _sendTick() {
    const g = this.game;
    const guests = this.peersHere();
    const foes = g.enemies.filter((e) => e.alive && guests.some((p) => Math.hypot(p.x - e.x, p.z - e.z) < 75));
    this.session.send({ t: 'ld-tick', r: g.realm, f: foes.slice(0, 160).map(packFoe), ev: this.out.splice(0, 64) });
  }

  /* -------------------------------------------------------- receiving */

  receive(msg) {
    const g = this.game;
    if (g.mode === 'title' || g.closed) return;
    if (msg.t === 'ld-me') {
      const m = readHero(msg);
      if (!m) return;
      let p = this.peers.get(msg.from);
      const isNew = !p;
      if (!p) {
        p = { id: msg.from, dx: m.x, dz: m.z, dface: m.face };
        this.peers.set(msg.from, p);
      }
      Object.assign(p, m, { at: performance.now() });
      if (isNew) g.refreshParty?.();
      // Their hits on my monsters (I am the host) land for real.
      if (this.isHost && p.realm === g.realm) {
        for (const h of m.hits) {
          const e = g.enemies.find((x) => x.nid === h.nid && x.alive);
          if (e) g._applyDamage(e, h.amount, h.crit, h.kx, h.kz, h.effect, h.effectT, null, p.id, { x: p.x, z: p.z });
        }
      }
      if (p.realm === g.realm) for (const ev of m.events) this._peerEvent(p, ev);
      return;
    }
    if (msg.t === 'ld-tick' && msg.from === this.session?.host && this.isGuest) {
      const tick = readTick(msg);
      if (!tick) return;
      if (tick.realm !== g.realm) {
        g.travel(tick.realm, { follow: true });
        return;
      }
      this._mirror(tick.foes);
      for (const ev of tick.events) this._hostEvent(ev);
    }
  }

  /** The host's monsters, mirrored: new ones appear, known ones glide to where they are, missing ones go. */
  _mirror(foes) {
    const g = this.game;
    const seen = new Set();
    for (const f of foes) {
      seen.add(f.nid);
      let e = g.enemies.find((x) => x.nid === f.nid);
      if (!e) {
        e = g._spawnEnemy(f.kind, f.x, f.z, { nid: f.nid, elite: f.elite, mirror: true });
        e.mirror = true;
      }
      if (!e.alive) {
        e.alive = true;
        e.actor.group.visible = true;
        e.x = f.x;
        e.z = f.z;
      }
      e.netX = f.x;
      e.netZ = f.z;
      e.hp = f.hp;
      e.maxHp = f.maxHp;
      e.state = f.state;
      e.face = f.face;
      e.lift = f.lift;
      e.tele = f.tele;
      e.shield = f.shield;
      e.seenAt = performance.now();
      if (R.ENEMIES[f.kind].boss) g.boss = e;
    }
    for (const e of g.enemies) if (e.alive && !seen.has(e.nid) && performance.now() - (e.seenAt ?? 0) > 800) {
      e.alive = false;
      e.actor.group.visible = false;
      e.tele = null;
      g._drawTele(e);
    }
  }

  /** Mirrored monsters glide toward the host's positions between ticks. */
  updateMirrors(dt) {
    const g = this.game;
    const k = Math.min(1, dt * 12);
    for (const e of g.enemies) {
      if (!e.alive || e.netX == null) continue;
      const dx = e.netX - e.x, dz = e.netZ - e.z;
      e.vx = dx / Math.max(dt, 1e-3) * k;
      e.vz = dz / Math.max(dt, 1e-3) * k;
      if (Math.hypot(dx, dz) > 8) {
        e.x = e.netX;
        e.z = e.netZ;
      } else {
        e.x += dx * k;
        e.z += dz * k;
      }
      e.frameT += dt;
      e.actor.group.visible = e.state !== 'burrowed';
    }
  }

  _hostEvent(ev) {
    const g = this.game;
    const n = (v) => (Number.isFinite(v) ? v : 0);
    switch (ev.k) {
      case 'hurt':
        if (ev.to === this.myId) g.hurtHero(Math.max(0, Math.min(1e5, n(ev.amt))), n(ev.x), n(ev.z), ev.crit === 1, { chill: n(ev.chill) });
        break;
      case 'kill': {
        const e = g.enemies.find((x) => x.nid === ev.nid);
        if (e) {
          e.alive = false;
          e.actor.group.visible = false;
          e.tele = null;
          g._drawTele(e);
        }
        if (R.ENEMIES[ev.kind]) g._onKill({ ...ev, x: n(ev.x), z: n(ev.z) });
        if (R.ENEMIES[ev.kind]?.boss) g.boss = null;
        break;
      }
      case 'gone': {
        const e = g.enemies.find((x) => x.nid === ev.nid);
        if (e) {
          e.alive = false;
          e.actor.group.visible = false;
        }
        break;
      }
      case 'proj':
        if (['orb', 'shard', 'fireorb', 'spore'].includes(ev.kind)) g._projectile(ev.kind, n(ev.x), n(ev.y) || 1.2, n(ev.z), Math.sin(n(ev.a)), Math.cos(n(ev.a)), Math.min(40, n(ev.s)), { owner: 'foe', life: 3.2 });
        break;
      case 'fx':
        if (typeof ev.id === 'string' && g.fxReady(ev.id)) g.fx(ev.id, n(ev.x), 0, n(ev.z), { pxm: Math.max(10, Math.min(200, n(ev.p) || 40)), color: 1.3 });
        break;
      case 'warn':
        if (Array.isArray(ev.c)) g._warn(ev.c.slice(0, 12).map(([x, z, r]) => ({ x: n(x), z: n(z), r: Math.min(8, n(r)) })), Math.min(4, n(ev.t)), false);
        break;
      case 'boss':
        if (R.ENEMIES[ev.kind]) g.hud.toast(`<b>${R.ENEMIES[ev.kind].name} rises!</b>`, 'warn');
        break;
      default:
    }
  }

  /** Another player's swing, missile, skill or zone, drawn here. */
  _peerEvent(p, ev) {
    const g = this.game;
    const n = (v) => (Number.isFinite(v) ? v : 0);
    switch (ev.k) {
      case 'arc':
        g._slashArc(n(ev.f), Math.min(Math.PI * 2, n(ev.a)), Math.min(6, n(ev.r)), false, ev.s === 3 ? 3 : 1, ev.th === 1, { x: p.x, z: p.z });
        break;
      case 'proj':
        if (['fire', 'bolt', 'arrow', 'lance'].includes(ev.kind)) g._projectile(ev.kind, n(ev.x), n(ev.y) || 1.1, n(ev.z), Math.sin(n(ev.a)), Math.cos(n(ev.a)), Math.min(40, n(ev.s)), { owner: 'peer', life: Math.min(3, n(ev.l) || 1), pierce: ev.kind !== 'fire' && ev.kind !== 'bolt' });
        break;
      case 'zone':
        if (['totem', 'trap', 'blizzard', 'rain'].includes(ev.kind)) g._zone({ kind: ev.kind, x: n(ev.x), z: n(ev.z), r: Math.min(8, n(ev.r)), life: Math.min(30, n(ev.l)), tick: ev.kind === 'totem' ? 1 : 0.4, heal: Math.min(0.1, n(ev.heal)), owner: 'peer' });
        break;
      case 'fx':
        if (typeof ev.id === 'string' && g.fxReady(ev.id)) g.fx(ev.id, n(ev.x), 0, n(ev.z), { pxm: Math.max(10, Math.min(200, n(ev.p) || 40)), color: 1.3 });
        break;
      case 'skill': {
        const sk = R.SKILLS[ev.id];
        if (!sk) break;
        const fx = { whirl: 'melee/spin-slash', nova: 'ice/frost-nova', guard: 'holy/divine-shield', lunge: 'moves/dash-strike', bash: 'impacts/shield-block', blink: 'arcane/blink-in' }[ev.id];
        if (fx) g.fx(fx, p.x, 0.1, p.z, { pxm: 40, color: 1.3, speed: 1.4 });
        break;
      }
      default:
    }
  }

  /* ----------------------------------------------------------- figures */

  /** Other players' figures: their look and gear, gliding to where they are, posed as they are. */
  _drawPeers(dt) {
    const g = this.game;
    const light = new THREE.Color();
    for (const p of this.peers.values()) {
      const here = p.realm === g.realm && performance.now() - p.at < 4000;
      if (!p.actor) {
        p.actor = new RigActor({ shadow: 0.45 });
        g.scene.add(p.actor.group);
      }
      if (p.actor.group.parent !== g.scene) g.scene.add(p.actor.group);
      p.actor.group.visible = here;
      if (!here) continue;
      const key = JSON.stringify([p.look, packGear(p.gear)]);
      if (key !== p.gearKey) {
        p.gearKey = key;
        p.actor.show(heroSpriteFor(p.look, p.gear));
        p.actor.setGear(p.gear);
      }
      const k = Math.min(1, dt * 10);
      if (Math.hypot(p.x - p.dx, p.z - p.dz) > 10) [p.dx, p.dz] = [p.x, p.z];
      p.dx += (p.x - p.dx) * k;
      p.dz += (p.z - p.dz) * k;
      p.dface += g.wrapAngle(p.face - p.dface) * k;
      p.actor.group.position.set(p.dx, 0, p.dz);
      p.actor.facing = p.dface;
      p.actor.act = { ...p.act, swing: p.act.swing ? { pose: p.act.swing.pose, t: p.act.swing.t } : null, pose: p.act.pose ? { id: p.act.pose, t: p.act.poseT } : null };
      p.actor.update(dt, g.camYaw, g.world.lightAt(p.dx, p.dz, light));
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
