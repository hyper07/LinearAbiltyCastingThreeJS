import { RANKS, RANK_ORDER, FORGE_REACH, UPGRADES, upgradeCost, FOES, GUARDIANS, TIER, BUILDINGS, BUILD_TIER, SHRINE_GIFTS, DIFFICULTY, ECON, CAMP, SUPPLY, COLORS } from './rules.js';
import { SIZE, STRUCTURES, GUARDS, KEYS, BASE, FORGE, PAD, SPAWN, GUNS, BARRACKS, HEART, Grid, inBase, foeDef, FIRST_DYNAMIC } from './map.js';

/**
 * A game of Grave Purge: up to four players' soldiers (people, or bots in
 * empty seats) against the dead's land. No drawing and no browser:
 * `step(dt, orders)` moves everything on and returns what happened;
 * `snapshot()` is what a screen needs. The host's browser runs it.
 *
 * Orders, by seat: { t: 'move'|'amove', ids, x, z } · { t: 'attack', ids, id }
 * · { t: 'stop'|'hold', ids } · { t: 'buy', n } · { t: 'forge', rank }
 * · { t: 'upgrade', key } · { t: 'give', to, n }.
 */

const facing = (dx, dz) => Math.atan2(dx, dz);

/**
 * Can this player raise `rank` at the Forge? `troops` are everyone's
 * soldiers ({ o, rank, x, z }); the ones it would use must stand within
 * reach of the Forge. Used by the game and by the screen (to say what is
 * missing).
 */
export function forgeCheck(troops, slot, ore, relics, rank) {
  const def = RANKS[rank];
  if (!def?.from) return { ok: false, why: 'Not a rank you raise' };
  if (def.one && troops.some((t) => t.o === slot && t.rank === rank)) return { ok: false, why: `One ${def.name} at a time` };
  const near = troops.filter((t) => t.o === slot && Math.hypot(t.x - FORGE.x, t.z - FORGE.z) < FORGE_REACH);
  const use = [];
  for (const [r, n] of Object.entries(def.from)) {
    const have = near.filter((t) => t.rank === r).slice(0, n);
    if (have.length < n) return { ok: false, why: `Bring ${n > 1 ? n + ' ' : 'a '}${RANKS[r].name}${n > 1 ? 's' : ''} to the Forge` };
    use.push(...have);
  }
  if (ore < def.ore) return { ok: false, why: `Needs ${def.ore} ore` };
  if ((def.relics ?? 0) > relics) return { ok: false, why: `Needs ${def.relics} relics` };
  return { ok: true, use };
}
const HASH = 8;

export class Purge {
  /**
   * @param {{ seats: { name: string, bot?: boolean }[], difficulty?: string, heroesOnly?: boolean, seed?: number }} options
   */
  constructor({ seats, difficulty = 'hard', heroesOnly = false, seed = 1 }) {
    this.diff = DIFFICULTY[difficulty] ?? DIFFICULTY.hard;
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : 'hard';
    this.heroesOnly = heroesOnly;
    this.seed = seed >>> 0 || 1;
    this.t = 0;
    this.left = this.diff.minutes * 60;
    this.speed = 1;
    this.events = [];
    this.nextId = FIRST_DYNAMIC;
    this.grid = new Grid();
    this.players = seats.map((s, slot) => ({ slot, name: s.name, bot: Boolean(s.bot), ore: ECON.start + (heroesOnly ? ECON.heroesOnly.bonus : 0), relics: 0, upg: { weapons: 0, armor: 0 }, kills: 0, earned: 0, color: COLORS[slot], free: 0, autoForge: true, brain: { mode: 'gather', at: 0 } }));
    this.troops = [];
    this.foes = [];
    this.ents = new Map();
    this.down = new Set(); // static ids (buildings, guards) that have fallen
    // The buildings.
    this.buildings = STRUCTURES.map((s) => {
      const def = BUILDINGS[s.type];
      const k = def.heart || def.key ? 1 : BUILD_TIER[s.tier];
      const max = Math.round(def.hp * k * this.diff.hp);
      const b = { i: s.id, k: 'bld', type: s.type, x: s.x, z: s.z, tier: s.tier, hp: max, max, cd: 0, spawnT: 10 + (s.id % 7) * 3, kids: [], alive: true, sealed: Boolean(def.heart), guard: s.guard };
      this.ents.set(b.i, b);
      return b;
    });
    // The guards.
    for (const g of GUARDS) this._foe(g.kind, g.x, g.z, { id: g.id, tier: g.tier, camp: g.camp, boss: g.boss });
    // The camp's guns.
    this.guns = GUNS.map((p) => {
      const g = { i: this.nextId++, k: 'gun', x: p.x, z: p.z, hp: CAMP.gunHp, max: CAMP.gunHp, cd: 0, a: 0 };
      this.ents.set(g.i, g);
      return g;
    });
    // Everyone starts with soldiers.
    for (const p of this.players) {
      if (heroesOnly) this._troop(p.slot, 'veteran');
      else for (let n = 0; n < 4; n++) this._troop(p.slot, 'recruit');
    }
    this.shrines = 0;
    this.nodes = 0;
    this.keysLeft = KEYS.length;
    this.raidT = this.diff.raid + 120;
    this.raids = 0;
    this.fallen = 0;
    this.stipendT = ECON.every;
    this.paths = 0;
    this.over = null;
  }

  rand() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ------------------------------------------------------------- making */

  _troop(slot, rank, at = null) {
    const def = RANKS[rank];
    const n = this.troops.filter((t) => t.o === slot).length;
    const a = (n * 2.4) % (Math.PI * 2);
    const [x, z] = this.grid.open((at?.x ?? SPAWN.x) + Math.cos(a) * (1 + (n % 5)), (at?.z ?? SPAWN.z) + Math.sin(a) * (1 + (n % 5)));
    const t = { i: this.nextId++, k: 'troop', rank, o: slot, x, z, a: Math.PI, hp: 0, max: 0, cd: 0, order: { t: 'idle' }, path: null, tgt: null, act: 'idle', aa: 0, kills: 0 };
    t.max = this.troopStat(t).hp;
    t.hp = t.max;
    this.troops.push(t);
    this.ents.set(t.i, t);
    return t;
  }

  _foe(kind, x, z, { id = null, tier = 1, camp = -1, boss = false, raid = false, home = null } = {}) {
    const def = foeDef(kind);
    const guardian = Boolean(GUARDIANS[kind]);
    const k = guardian ? { hp: 1, dmg: 1, bounty: 1 } : TIER[tier];
    [x, z] = this.grid.open(x, z);
    const max = Math.round(def.hp * k.hp * this.diff.hp);
    const f = {
      i: id ?? this.nextId++, k: 'foe', kind, x, z, a: Math.PI * 2 * ((x * 7 + z) % 1), hp: max, max, tier, camp, boss: boss || guardian,
      dmg: def.dmg * k.dmg * this.diff.dmg, bounty: Math.round(def.bounty * k.bounty), home: home ?? { x, z }, awake: raid, raid, tgt: null, cd: 0, path: null, repath: 0,
      act: 'idle', aa: 0, look: (id ?? 0) % 10 * 0.05, slam: def.slam?.every ?? 0, summon: def.summon?.every ?? 0, static: id != null
    };
    this.foes.push(f);
    this.ents.set(f.i, f);
    return f;
  }

  /** A soldier's numbers now: rank, the owner's upgrades, the shrines broken. */
  troopStat(t) {
    const def = RANKS[t.rank];
    const p = this.players[t.o];
    const lifted = def.tier >= 1;
    let range = def.gun.range;
    let hp = def.hp;
    let dmg = def.gun.dmg * (1 + 0.08 * p.upg.weapons);
    if (lifted) {
      for (const g of SHRINE_GIFTS) {
        if (this.shrines < g.at) continue;
        range += g.range ?? 0;
        hp *= 1 + (g.hp ?? 0);
        dmg *= 1 + (g.dmg ?? 0);
      }
    }
    return { hp: Math.round(hp), dmg, rate: def.gun.rate, range, splash: def.gun.splash ?? 0, armor: def.armor + p.upg.armor, speed: def.speed };
  }

  /* -------------------------------------------------------------- orders */

  order(slot, o) {
    const p = this.players[slot];
    if (!p || this.over) return;
    const mine = (ids) => (Array.isArray(ids) ? ids : []).map((i) => this.ents.get(i)).filter((t) => t && t.k === 'troop' && t.o === slot && t.hp > 0);
    if (o.t === 'move' || o.t === 'amove') this._send(mine(o.ids), o.t, Number(o.x), Number(o.z));
    else if (o.t === 'patrol') {
      // Back and forth between where each stands and the point, fighting whatever comes.
      const list = mine(o.ids);
      const from = list.map((t) => ({ x: t.x, z: t.z }));
      this._send(list, 'amove', Number(o.x), Number(o.z));
      list.forEach((t, k) => (t.order = { t: 'patrol', a: from[k], b: { x: t.order.x, z: t.order.z } }));
    } else if (o.t === 'heal') this._send(mine(o.ids), 'move', PAD.x, PAD.z);
    else if (o.t === 'toForge') this._send(mine(o.ids), 'move', FORGE.x + 1.5, FORGE.z - 1);
    else if (o.t === 'attack') {
      const target = this.ents.get(o.id);
      if (!target || target.hp <= 0 || target.k === 'troop' || target.k === 'gun' || target.sealed) return;
      for (const t of mine(o.ids)) {
        t.order = { t: 'attack', id: target.i };
        t.tgt = target.i;
        t.path = null;
      }
    } else if (o.t === 'stop' || o.t === 'hold') {
      for (const t of mine(o.ids)) {
        t.order = { t: o.t === 'hold' ? 'hold' : 'idle' };
        t.path = null;
        t.tgt = null;
      }
    } else if (o.t === 'buy') this._buy(p, Math.max(1, Math.min(10, Number(o.n) || 1)));
    else if (o.t === 'forge') this.forge(slot, o.rank);
    else if (o.t === 'upgrade') {
      const u = UPGRADES[o.key];
      if (!u || p.upg[o.key] >= u.max) return;
      const cost = upgradeCost(o.key, p.upg[o.key]);
      if (p.ore < cost) return;
      p.ore -= cost;
      p.upg[o.key]++;
      this.events.push({ t: 'upgrade', o: slot, key: o.key, level: p.upg[o.key] });
    } else if (o.t === 'autoForge') {
      p.autoForge = Boolean(o.on);
    } else if (o.t === 'give') {
      const to = this.players[o.to];
      const n = Math.min(p.ore, Math.max(0, Math.floor(Number(o.n) || 0)));
      if (!to || to === p || !n) return;
      p.ore -= n;
      to.ore += n;
      this.events.push({ t: 'give', o: slot, to: to.slot, n });
    }
  }

  /** Send soldiers somewhere: one way found for the group, each keeping its place in it. */
  _send(troops, how, x, z) {
    if (!troops.length || !Number.isFinite(x) || !Number.isFinite(z)) return;
    x = Math.max(1, Math.min(SIZE - 1, x));
    z = Math.max(1, Math.min(SIZE - 1, z));
    const cx = troops.reduce((s, t) => s + t.x, 0) / troops.length;
    const cz = troops.reduce((s, t) => s + t.z, 0) / troops.length;
    const shared = this.grid.path(cx, cz, x, z);
    troops.forEach((t, k) => {
      // A loose block round the point: rows of five, 1.6 m apart.
      const row = Math.floor(k / 5);
      const col = (k % 5) - 2;
      const [gx, gz] = this.grid.open(x + col * 1.6, z + row * 1.6 - 1.6);
      t.order = { t: how, x: gx, z: gz };
      t.tgt = null;
      if (shared && this.grid.line(t.x, t.z, shared[0][0], shared[0][1])) t.path = [...shared.slice(0, -1), [gx, gz]];
      else t.path = this.grid.path(t.x, t.z, gx, gz) ?? [[gx, gz]];
    });
  }

  _buy(p, n) {
    const rank = this.heroesOnly ? 'veteran' : 'recruit';
    const cost = this.heroesOnly ? RANKS.veteran.ore + RANKS.recruit.cost : RANKS.recruit.cost;
    for (let k = 0; k < n; k++) {
      if (p.ore < cost || this.troops.filter((t) => t.o === p.slot).length >= SUPPLY) return;
      p.ore -= cost;
      const t = this._troop(p.slot, rank, BARRACKS);
      this.events.push({ t: 'made', o: p.slot, id: t.i, rank });
    }
  }

  /** What a player could raise at the Forge now, and what stops them if not. */
  canForge(slot, rank) {
    const p = this.players[slot];
    return p ? forgeCheck(this.troops, slot, p.ore, p.relics, rank) : { ok: false, why: 'No such player' };
  }

  forge(slot, rank) {
    const can = this.canForge(slot, rank);
    if (!can.ok) return false;
    const p = this.players[slot];
    const def = RANKS[rank];
    p.ore -= def.ore;
    p.relics -= def.relics ?? 0;
    for (const t of can.use) this._remove(t);
    const made = this._troop(slot, rank, FORGE);
    made.fresh = true;
    this.events.push({ t: 'forge', o: slot, id: made.i, rank, x: FORGE.x, z: FORGE.z, from: can.use.map((t) => t.i) });
    return made;
  }

  /**
   * The Forge raises by itself: a soldier walked into its ring and standing
   * there is raised to the highest rank it can make (with whatever else of
   * the owner's stands in the ring), once there is the ore and the relics.
   */
  _autoForge(dt) {
    this.forgeT = (this.forgeT ?? 0) - dt;
    if (this.forgeT > 0) return;
    this.forgeT = 0.5;
    for (const p of this.players) {
      if (p.bot || !p.autoForge) continue;
      // One rank a visit: a soldier just raised must step out of the ring and back in for the next.
      for (const t of this.troops) if (t.fresh && t.o === p.slot && Math.hypot(t.x - FORGE.x, t.z - FORGE.z) >= FORGE_REACH) t.fresh = false;
      const ring = this.troops.filter((t) => t.o === p.slot && !t.fresh && Math.hypot(t.x - FORGE.x, t.z - FORGE.z) < FORGE_REACH && !t.path?.length && t.order.t !== 'move');
      if (!ring.length) continue;
      for (const rank of ['paragon', 'phantom', 'vanguard', 'veteran']) {
        const def = RANKS[rank];
        const main = Object.keys(def.from).sort((a, b) => RANKS[b].tier - RANKS[a].tier)[0];
        if (!ring.some((t) => t.rank === main)) continue;
        if (def.one && this.troops.some((t) => t.o === p.slot && t.rank === rank)) continue;
        if (!forgeCheck(ring, p.slot, p.ore, p.relics, rank).ok) continue;
        const can = forgeCheck(ring, p.slot, p.ore, p.relics, rank);
        const from = can.use.map((t) => t.i);
        p.ore -= def.ore;
        p.relics -= def.relics ?? 0;
        for (const t of can.use) this._remove(t);
        const made = this._troop(p.slot, rank, FORGE);
        made.fresh = true;
        this.events.push({ t: 'forge', o: p.slot, id: made.i, rank, x: FORGE.x, z: FORGE.z, auto: true, from });
        break;
      }
    }
  }

  _remove(e) {
    this.ents.delete(e.i);
    if (e.k === 'troop') this.troops.splice(this.troops.indexOf(e), 1);
    else if (e.k === 'foe') this.foes.splice(this.foes.indexOf(e), 1);
  }

  /* ---------------------------------------------------------------- step */

  step(dt, orders = new Map()) {
    this.events = [];
    if (this.over) return this.events;
    for (const [slot, list] of orders) for (const o of list) this.order(slot, o);
    this.t += dt;
    this.left -= dt;
    this.paths = 0;
    this._hash();
    for (const p of this.players) if (p.bot) this._bot(p, dt);
    this._economy(dt);
    this._autoForge(dt);
    for (const t of [...this.troops]) this._troopStep(t, dt);
    for (const f of [...this.foes]) this._foeStep(f, dt);
    for (const b of this.buildings) if (b.alive) this._building(b, dt);
    for (const g of this.guns) this._gun(g, dt);
    this._raids(dt);
    if (this.left <= 0 && !this.over) this._end(false, 'time');
    return this.events;
  }

  /** Who is where: a hash of 8-metre cells for soldiers and for the dead. */
  _hash() {
    this.th = new Map();
    this.fh = new Map();
    const put = (h, e) => {
      const key = ((e.x / HASH) | 0) * 1000 + ((e.z / HASH) | 0);
      let list = h.get(key);
      if (!list) h.set(key, (list = []));
      list.push(e);
    };
    for (const t of this.troops) put(this.th, t);
    for (const g of this.guns) if (g.hp > 0) put(this.th, g);
    for (const f of this.foes) if (f.awake || f.raid) put(this.fh, f);
  }

  _near(h, x, z, r, fn) {
    const c0 = ((x - r) / HASH) | 0;
    const c1 = ((x + r) / HASH) | 0;
    const r0 = ((z - r) / HASH) | 0;
    const r1 = ((z + r) / HASH) | 0;
    for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) for (const e of h.get(i * 1000 + j) ?? []) fn(e);
  }

  _nearestTroop(x, z, r) {
    let best = null;
    let bd = r;
    this._near(this.th, x, z, r, (e) => {
      if (e.hp <= 0) return;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) {
        best = e;
        bd = d;
      }
    });
    return best;
  }

  _economy(dt) {
    this.stipendT -= dt;
    if (this.stipendT <= 0) {
      this.stipendT += ECON.every;
      const n = Math.round(ECON.stipend + ECON.grow * (this.t / 60));
      for (const p of this.players) p.ore += n;
      this.events.push({ t: 'stipend', n });
    }
    // Nobody left and nothing to buy with: a free Recruit now and then.
    for (const p of this.players) {
      if (this.troops.some((t) => t.o === p.slot) || p.ore >= RANKS.recruit.cost) continue;
      p.free += dt;
      if (p.free > 20) {
        p.free = 0;
        this._troop(p.slot, 'recruit', BARRACKS);
      }
    }
  }

  /* ------------------------------------------------------------- soldiers */

  _troopStep(t, dt) {
    const s = this.troopStat(t);
    t.cd = Math.max(0, t.cd - dt);
    // The camp heals; the pad in its middle heals fast.
    if (inBase(t.x, t.z) && t.hp < t.max) t.hp = Math.min(t.max, t.hp + t.max * (Math.hypot(t.x - PAD.x, t.z - PAD.z) < CAMP.padReach ? CAMP.padHeal : CAMP.heal) * dt);
    const o = t.order;
    let target = t.tgt != null ? this.ents.get(t.tgt) : null;
    if (target && (target.hp <= 0 || !this.ents.has(target.i) || target.sealed)) target = t.tgt = null;
    // Look for a fight unless told just to walk.
    if (!target && o.t !== 'move' && t.cd <= 0.05) {
      const reach = o.t === 'hold' ? s.range : s.range + (o.t === 'idle' ? 4 : 3);
      target = this._foeNear(t.x, t.z, reach);
      t.tgt = target?.i ?? null;
    }
    if (o.t === 'attack' && !target) t.order = { t: 'idle' };
    if (target) {
      const d = Math.hypot(target.x - t.x, target.z - t.z) - (target.k === 'bld' ? BUILDINGS[target.type].r : 0.4);
      if (d <= s.range) {
        t.a = facing(target.x - t.x, target.z - t.z);
        t.act = 'aim';
        if (t.cd <= 0) {
          t.cd = 1 / s.rate;
          t.aa++;
          this.events.push({ t: 'shot', id: t.i, to: target.i, big: RANKS[t.rank].tier >= 2 });
          if (s.splash) {
            this.events.push({ t: 'blast', x: target.x, z: target.z, r: s.splash });
            const hit = [];
            this._near(this.fh, target.x, target.z, s.splash + 1, (f) => Math.hypot(f.x - target.x, f.z - target.z) < s.splash && f !== target && hit.push(f));
            for (const f of hit) this._hurt(f, s.dmg * 0.5, t);
          }
          this._hurt(target, s.dmg, t);
        }
        return;
      }
      if (o.t === 'hold') {
        t.tgt = null;
        t.act = 'idle';
        return;
      }
      // Close in.
      if (!t.chase || t.chase.id !== target.i || this.t > t.chase.at) {
        t.chase = { id: target.i, at: this.t + 1 };
        t.path = this.grid.line(t.x, t.z, target.x, target.z) ? [[target.x, target.z]] : this.paths++ < 10 ? this.grid.path(t.x, t.z, target.x, target.z) : t.path;
      }
      this._walk(t, s.speed, dt);
      return;
    }
    if (o.t === 'patrol') {
      if (!t.path?.length) {
        [o.a, o.b] = [o.b, o.a];
        t.path = this.paths++ < 10 ? this.grid.path(t.x, t.z, o.b.x, o.b.z) ?? [[o.b.x, o.b.z]] : null;
      }
      if (t.path?.length) this._walk(t, s.speed, dt);
      return;
    }
    if ((o.t === 'move' || o.t === 'amove') && t.path?.length) {
      this._walk(t, s.speed, dt);
      if (!t.path?.length) t.order = { t: 'idle' };
      return;
    }
    if (o.t === 'move' || o.t === 'amove') t.order = { t: 'idle' };
    t.act = 'idle';
    this._spread(t, dt);
  }

  /** The nearest of the dead (or their building) within reach of a point. */
  _foeNear(x, z, r) {
    let best = null;
    let bd = r;
    this._near(this.fh, x, z, r, (f) => {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < bd && f.hp > 0) {
        best = f;
        bd = d;
      }
    });
    if (best) return best;
    // Sleeping guards and buildings in reach count too.
    for (const f of this.foes) {
      if (f.awake || Math.abs(f.x - x) > r || Math.abs(f.z - z) > r) continue;
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < bd) {
        best = f;
        bd = d;
      }
    }
    if (best) return best;
    for (const b of this.buildings) {
      if (!b.alive || b.sealed || Math.abs(b.x - x) > r + 5 || Math.abs(b.z - z) > r + 5) continue;
      const d = Math.hypot(b.x - x, b.z - z) - BUILDINGS[b.type].r;
      if (d < bd) {
        best = b;
        bd = d;
      }
    }
    return best;
  }

  /** Along the path; round anything that blocks; apart from friends. */
  _walk(e, speed, dt) {
    const next = e.path?.[0];
    if (!next) {
      e.act = 'idle';
      return;
    }
    const dx = next[0] - e.x;
    const dz = next[1] - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) {
      e.path.shift();
      return;
    }
    const step = Math.min(d, speed * dt);
    const nx = e.x + (dx / d) * step;
    const nz = e.z + (dz / d) * step;
    if (!this.grid.blocked(nx, nz)) [e.x, e.z] = [nx, nz];
    else if (!this.grid.blocked(nx, e.z)) e.x = nx;
    else if (!this.grid.blocked(e.x, nz)) e.z = nz;
    else e.path = null;
    e.a = facing(dx, dz);
    e.act = 'run';
    this._spread(e, dt);
  }

  /** Step apart from anyone standing on top of you. */
  _spread(e, dt) {
    const h = e.k === 'troop' ? this.th : this.fh;
    const r = e.k === 'troop' ? 0.9 * RANKS[e.rank].scale : 0.8 * (foeDef(e.kind).size / 1.8);
    let px = 0;
    let pz = 0;
    this._near(h, e.x, e.z, r + 1, (o) => {
      if (o === e || o.k === 'gun') return;
      const dx = e.x - o.x;
      const dz = e.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) {
        px += (dx / d) * (r - d);
        pz += (dz / d) * (r - d);
      } else if (d <= 1e-4) px += 0.1;
    });
    if (!px && !pz) return;
    const k = Math.min(1, dt * 6);
    const nx = e.x + px * k;
    const nz = e.z + pz * k;
    if (!this.grid.blocked(nx, nz)) [e.x, e.z] = [nx, nz];
  }

  /* ------------------------------------------------------------- the dead */

  _wake(f) {
    if (f.awake) return;
    f.awake = true;
    f.since = this.t;
    // The whole camp wakes with it.
    if (f.camp >= 0) for (const o of this.foes) if (o.camp === f.camp && !o.awake) {
      o.awake = true;
      o.since = this.t;
    }
  }

  _foeStep(f, dt) {
    const def = foeDef(f.kind);
    f.cd = Math.max(0, f.cd - dt);
    if (!f.awake) {
      // Asleep: an eye open every half second for soldiers coming near.
      f.look -= dt;
      if (f.look > 0) return;
      f.look = 0.5;
      if (f.hp < f.max && !f.boss) f.hp = Math.min(f.max, f.hp + f.max * 0.01 * 0.5);
      if (this._nearestTroop(f.x, f.z, (def.ranged ? def.range : 6) + 5)) this._wake(f);
      return;
    }
    let target = f.tgt != null ? this.ents.get(f.tgt) : null;
    if (target && target.hp <= 0) target = f.tgt = null;
    const fromHome = Math.hypot(f.x - f.home.x, f.z - f.home.z);
    // Too far from home: give up and walk back (raiders never do).
    if (!f.raid && fromHome > (f.boss ? 26 : 34)) {
      f.tgt = null;
      target = null;
      f.leaving = true;
    }
    if (f.leaving && fromHome < 2) f.leaving = false;
    if (!target && !f.leaving) {
      target = this._nearestTroop(f.x, f.z, f.raid ? 18 : 16);
      f.tgt = target?.i ?? null;
    }
    // Bosses: a slam round them, or raising more dead.
    if (def.slam && target) {
      f.slam -= dt;
      if (f.slam <= 0 && Math.hypot(target.x - f.x, target.z - f.z) < def.slam.radius) {
        f.slam = def.slam.every;
        f.aa++;
        f.act = 'slam';
        this.events.push({ t: 'slam', id: f.i, x: f.x, z: f.z, r: def.slam.radius });
        const hit = [];
        this._near(this.th, f.x, f.z, def.slam.radius + 1, (e) => Math.hypot(e.x - f.x, e.z - f.z) < def.slam.radius && hit.push(e));
        for (const e of hit) this._hurt(e, def.slam.dmg * this.diff.dmg, f);
        return;
      }
    }
    if (def.summon && target) {
      f.summon -= dt;
      if (f.summon <= 0) {
        f.summon = def.summon.every;
        f.aa++;
        f.act = 'summon';
        for (let n = 0; n < def.summon.count; n++) {
          const a = (n / def.summon.count) * Math.PI * 2;
          const s = this._foe(def.summon.kind, f.x + Math.cos(a) * 3, f.z + Math.sin(a) * 3, { tier: Math.max(2, f.tier), home: f.home });
          s.awake = true;
        }
        this.events.push({ t: 'summon', id: f.i, x: f.x, z: f.z });
        return;
      }
    }
    if (target) {
      const reach = def.range + (target.k === 'gun' ? 1.5 : 0.4);
      const d = Math.hypot(target.x - f.x, target.z - f.z);
      if (d <= reach) {
        f.a = facing(target.x - f.x, target.z - f.z);
        if (f.cd <= 0) {
          f.cd = 1 / def.rate;
          f.aa++;
          f.act = 'attack';
          if (def.ranged) this.events.push({ t: 'bolt', id: f.i, to: target.i });
          this._hurt(target, f.dmg, f);
        }
        return;
      }
      f.repath -= dt;
      if (f.repath <= 0 || !f.path?.length) {
        f.repath = 1 + (f.i % 5) * 0.1;
        f.path = this.grid.line(f.x, f.z, target.x, target.z) ? [[target.x, target.z]] : this.paths++ < 14 ? this.grid.path(f.x, f.z, target.x, target.z) : f.path;
      }
      this._walk(f, def.speed, dt);
      return;
    }
    if (f.raid) {
      // A wave: to where it was sent (where its crypt fell), then on to the camp.
      const goal = f.goal ?? PAD;
      if (f.goal && Math.hypot(f.x - goal.x, f.z - goal.z) < 6) {
        f.goal = null;
        f.path = null;
      }
      if (!f.path?.length) f.path = (this.paths++ < 14 ? this.grid.path(f.x, f.z, goal.x, goal.z) : null) ?? [[goal.x, goal.z]];
      this._walk(f, def.speed, dt);
      return;
    }
    // Nothing to fight: home, and back to sleep there.
    if (fromHome > 1.5) {
      if (!f.path?.length || f.repath <= 0) {
        f.repath = 2;
        f.path = this.grid.line(f.x, f.z, f.home.x, f.home.z) ? [[f.home.x, f.home.z]] : this.paths++ < 14 ? this.grid.path(f.x, f.z, f.home.x, f.home.z) : null;
      }
      f.repath -= dt;
      this._walk(f, def.speed, dt);
      return;
    }
    f.act = 'idle';
    if (this.t - (f.since ?? 0) > 4) {
      f.awake = false;
      f.leaving = false;
      f.look = 0.5;
    }
  }

  /* ------------------------------------------------------------ buildings */

  _building(b, dt) {
    const def = BUILDINGS[b.type];
    b.cd = Math.max(0, b.cd - dt);
    if (b.sealed && this.keysLeft <= 0) {
      b.sealed = false;
      this.events.push({ t: 'heart' });
    }
    if (def.shoots && b.cd <= 0) {
      const target = this._nearestTroop(b.x, b.z, def.shoots.range + BUILDINGS[b.type].r);
      if (target) {
        b.cd = 1 / def.shoots.rate;
        this.events.push({ t: 'bolt', id: b.i, to: target.i, tower: true });
        this._hurt(target, def.shoots.dmg * (def.key || def.heart ? 1 : BUILD_TIER[b.tier]) * this.diff.dmg, b);
      }
    }
    if (def.spawns) {
      b.kids = b.kids.filter((id) => this.ents.has(id));
      b.spawnT -= dt;
      if (b.spawnT <= 0) {
        b.spawnT = def.spawns.every;
        // Only while soldiers are about: no hordes piling up unseen.
        if (b.kids.length < def.spawns.keep && this._nearestTroop(b.x, b.z, 45)) {
          const kind = def.spawns.kinds[Math.floor(this.rand() * def.spawns.kinds.length)];
          const a = this.rand() * Math.PI * 2;
          const f = this._foe(kind, b.x + Math.cos(a) * (BUILDINGS[b.type].r + 2), b.z + Math.sin(a) * (BUILDINGS[b.type].r + 2), { tier: b.tier, home: { x: b.x + Math.cos(a) * 5, z: b.z + Math.sin(a) * 5 } });
          f.awake = true;
          f.since = this.t;
          b.kids.push(f.i);
          this.events.push({ t: 'rise', id: f.i });
        }
      }
    }
  }

  _gun(g, dt) {
    if (g.hp <= 0) {
      // A broken gun is mended by the camp in a minute.
      g.down = (g.down ?? 0) + dt;
      if (g.down > 60) {
        g.hp = g.max;
        g.down = 0;
      }
      return;
    }
    g.hp = Math.min(g.max, g.hp + g.max * 0.01 * dt);
    g.cd = Math.max(0, g.cd - dt);
    if (g.cd > 0) return;
    const f = this._foeNearAwake(g.x, g.z, CAMP.gun.range);
    if (!f) return;
    g.cd = 1 / CAMP.gun.rate;
    g.a = facing(f.x - g.x, f.z - g.z);
    this.events.push({ t: 'shot', id: g.i, to: f.i, big: true });
    this._hurt(f, CAMP.gun.dmg, g);
  }

  _foeNearAwake(x, z, r) {
    let best = null;
    let bd = r;
    this._near(this.fh, x, z, r, (f) => {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < bd) {
        best = f;
        bd = d;
      }
    });
    return best;
  }

  /**
   * Waves. Every few minutes the dead come for the camp, from the crypt
   * nearest it, more each time. And every crypt, ossuary, shrine or soul
   * node that falls is answered: the nearest crypts still standing send a
   * wave to where it fell (then on to the camp).
   */
  _raids(dt) {
    this.raidT -= dt;
    if (this.raidT > 0) return;
    this.raidT = this.diff.raid;
    const from = this.buildings.filter((b) => b.alive && BUILDINGS[b.type].spawns).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    if (!from) return;
    this.raids++;
    const count = Math.min(16, 3 + this.raids + Math.floor(this.fallen / 6));
    this._wave([from], count, null);
    this.events.push({ t: 'raid', wave: this.raids, x: from.x, z: from.z, n: count });
  }

  /** A wave of `count` from these buildings (shared out), sent to `goal` (or straight at the camp). */
  _wave(from, count, goal) {
    for (let n = 0; n < count; n++) {
      const b = from[n % from.length];
      const kinds = BUILDINGS[b.type].spawns.kinds;
      const a = (n / count) * Math.PI * 2 + this.rand();
      const f = this._foe(kinds[Math.floor(this.rand() * kinds.length)], b.x + Math.cos(a) * (BUILDINGS[b.type].r + 3), b.z + Math.sin(a) * (BUILDINGS[b.type].r + 3), { tier: b.tier, raid: true, home: { x: PAD.x, z: PAD.z } });
      f.goal = goal ? { x: goal.x + Math.cos(a) * 3, z: goal.z + Math.sin(a) * 3 } : null;
      f.since = this.t;
    }
  }

  /** A building of the dead has fallen: the crypts nearby answer. */
  _wrath(b) {
    const def = BUILDINGS[b.type];
    if (!(def.spawns || def.key)) return;
    const near = this.buildings.filter((o) => o.alive && BUILDINGS[o.type].spawns && Math.hypot(o.x - b.x, o.z - b.z) < 110).sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z)).slice(0, 2);
    if (!near.length) return;
    const count = Math.min(12, 2 + Math.round(b.tier * 1.5) + (def.key ? 2 : 0));
    this._wave(near, count, { x: b.x, z: b.z });
    this.events.push({ t: 'wrath', x: b.x, z: b.z, n: count, from: near.map((o) => [o.x, o.z]), type: b.type });
  }

  /* --------------------------------------------------------------- harm */

  _hurt(target, amount, by) {
    if (target.hp <= 0) return;
    const armor = target.k === 'troop' ? this.troopStat(target).armor : target.k === 'foe' ? foeDef(target.kind).armor : target.k === 'bld' ? BUILDINGS[target.type].armor : 0;
    const dmg = Math.max(amount * 0.25, amount - armor);
    if (target.sealed) return;
    target.hp -= dmg;
    if (target.k === 'foe') {
      if (!target.awake) this._wake(target);
      if (by.k === 'troop' && (target.tgt == null || this.rand() < 0.2)) target.tgt = by.i;
    }
    if (target.hp > 0) return;
    target.hp = 0;
    if (target.k === 'troop') this._fallTroop(target, by);
    else if (target.k === 'foe') this._fallFoe(target, by);
    else if (target.k === 'bld') this._fallBuilding(target, by);
    else if (target.k === 'gun') this.events.push({ t: 'gunDown', id: target.i });
  }

  _pay(by, n, x, z) {
    const owner = by?.k === 'troop' ? this.players[by.o] : null;
    if (!owner) {
      // The camp's guns share it round.
      for (const p of this.players) p.ore += Math.round(n / this.players.length);
      return;
    }
    owner.ore += n;
    owner.earned += n;
    owner.kills++;
    by.kills++;
    this.events.push({ t: 'ore', o: owner.slot, n, x, z });
  }

  _fallTroop(t, by) {
    this._remove(t);
    this.events.push({ t: 'kill', id: t.i, troop: true, o: t.o, rank: t.rank });
  }

  _fallFoe(f, by) {
    this._remove(f);
    if (f.static) this.down.add(f.i);
    this._pay(by, f.bounty, f.x, f.z);
    this.events.push({ t: 'kill', id: f.i, by: by?.i });
    if (GUARDIANS[f.kind]?.king) this._end(true, 'king');
    else if (f.boss) this.events.push({ t: 'guardian', kind: f.kind });
  }

  _fallBuilding(b, by) {
    const def = BUILDINGS[b.type];
    b.alive = false;
    this.ents.delete(b.i);
    this.down.add(b.i);
    this.grid.free(b.i);
    const k = def.key || def.heart ? 1 : BUILD_TIER[b.tier];
    this._pay(by, Math.round(def.bounty * k), b.x, b.z);
    for (const p of this.players) p.relics += def.relics ?? 0;
    this.events.push({ t: 'fall', id: b.i, type: b.type, x: b.x, z: b.z, relics: def.relics ?? 0 });
    this.fallen++;
    this._wrath(b);
    if (def.key) {
      this.keysLeft--;
      if (b.type === 'shrine') {
        this.shrines++;
        const gift = SHRINE_GIFTS.find((g) => g.at === this.shrines);
        // Health gifts: everyone's health goes up with their most.
        for (const t of this.troops) {
          const before = t.max;
          t.max = this.troopStat(t).hp;
          t.hp = Math.min(t.max, t.hp + (t.max - before));
        }
        this.events.push({ t: 'shrine', n: this.shrines, text: gift?.text ?? '' });
      } else this.nodes++;
    }
    if (def.heart) {
      // The Heart falls: the king rises from it.
      const king = this._foe('king', HEART.x, HEART.z + 7, { tier: 4, home: { x: HEART.x, z: HEART.z } });
      king.awake = true;
      king.since = this.t;
      this.events.push({ t: 'king', id: king.i });
    }
  }

  _end(won, why) {
    this.over = { won, why };
    this.events.push({ t: 'over', won, why });
  }

  /* ---------------------------------------------------------------- bots */

  /**
   * A bot player: buys Recruits, raises them at the Forge, upgrades, and
   * takes its army out to the nearest thing it can beat — all bots pick
   * the same, so they fight together. Home to heal when hurt.
   */
  _bot(p, dt) {
    const b = p.brain;
    b.at -= dt;
    if (b.at > 0) return;
    b.at = 0.8 + (p.slot % 3) * 0.1;
    const mine = this.troops.filter((t) => t.o === p.slot);
    // Money: Recruits to ten, then raise, then upgrades.
    const count = (r) => mine.filter((t) => t.rank === r).length;
    const plan = this._botPlan(p, mine, count);
    if (plan && p.ore >= RANKS[plan].ore * 0.8) {
      const can = this.canForge(p.slot, plan);
      if (can.ok) this.forge(p.slot, plan);
      else {
        // Send what the Forge needs over to it.
        const needs = Object.entries(RANKS[plan].from);
        const send = [];
        for (const [r, n] of needs) send.push(...mine.filter((t) => t.rank === r).slice(0, n));
        const away = send.filter((t) => Math.hypot(t.x - FORGE.x, t.z - FORGE.z) >= FORGE_REACH - 2);
        for (const t of away) this._send([t], 'move', FORGE.x + 2, FORGE.z - 1);
        for (const t of send) t.forging = true;
      }
    }
    const recruits = count('recruit');
    if (recruits < (mine.length < 8 ? 8 : 4) && mine.length < SUPPLY && p.ore >= RANKS.recruit.cost + (plan && plan !== 'veteran' ? RANKS[plan].ore * 0.5 : 0)) this._buy(p, 1);
    const reserve = plan ? RANKS[plan].ore : 0;
    for (const key of p.upg.weapons <= p.upg.armor ? ['weapons', 'armor'] : ['armor', 'weapons']) {
      const cost = upgradeCost(key, p.upg[key]);
      if (p.ore - cost > (p.ore > 8000 ? 0 : reserve + 300) && p.upg[key] < UPGRADES[key].max && mine.length >= 4) this.order(p.slot, { t: 'upgrade', key });
    }
    // The army: everyone not on the way to the Forge.
    const forging = plan && p.ore >= RANKS[plan].ore * 0.8;
    const army = mine.filter((t) => !t.forging || !forging);
    for (const t of mine) if (!forging) t.forging = false;
    if (!army.length) return;
    const hp = army.reduce((s, t) => s + t.hp, 0);
    const max = army.reduce((s, t) => s + t.max, 0);
    // Strength: the whole team's (bots go out together), damage a second × health.
    const power = this.troops.reduce((s, t) => {
      const st = this.troopStat(t);
      return s + (st.dmg * st.rate * t.hp) / 100;
    }, 0);
    const cx = army.reduce((s, t) => s + t.x, 0) / army.length;
    const cz = army.reduce((s, t) => s + t.z, 0) / army.length;
    if (b.mode === 'out' && (hp < max * 0.4 || army.length < Math.max(2, b.size * 0.4))) {
      b.mode = 'home';
      this._send(army, 'move', PAD.x, PAD.z);
      return;
    }
    if (b.mode === 'home') {
      if (hp >= max * 0.92 || army.every((t) => inBase(t.x, t.z) && t.hp >= t.max * 0.9)) b.mode = 'gather';
      else {
        if (army.some((t) => !inBase(t.x, t.z) && !t.path?.length)) this._send(army.filter((t) => !inBase(t.x, t.z)), 'move', PAD.x, PAD.z);
        return;
      }
    }
    const goal = this._botGoal(power);
    if (!goal) {
      b.mode = 'gather';
      if (army.some((t) => !inBase(t.x, t.z) && !t.path?.length && !t.tgt)) this._send(army.filter((t) => !inBase(t.x, t.z)), 'move', PAD.x, PAD.z);
      return;
    }
    if (b.mode === 'gather') {
      b.mode = 'out';
      b.size = army.length;
      b.goal = goal.i;
    }
    if (b.goal !== goal.i || army.some((t) => t.order.t === 'idle' && !t.tgt && Math.hypot(t.x - goal.x, t.z - goal.z) > 10)) {
      b.goal = goal.i;
      // Gather on the way if strung out, then on.
      const spread = Math.max(...army.map((t) => Math.hypot(t.x - cx, t.z - cz)));
      if (spread > 18 && !inBase(cx, cz)) this._send(army, 'amove', cx, cz);
      else this._send(army, 'amove', goal.x + 3, goal.z + 3);
    }
  }

  /** What a bot raises next (or nothing). */
  _botPlan(p, mine, count) {
    // A body of Veterans first (cheap strength), then saving for the next rank up.
    if (count('recruit') && count('veteran') < 10) return 'veteran';
    if (count('phantom') && !count('paragon') && p.relics >= RANKS.paragon.relics) return 'paragon';
    if (count('vanguard') && count('veteran') >= 2 && p.relics >= RANKS.phantom.relics && !count('phantom') && !count('paragon')) return 'phantom';
    if (!count('vanguard') && !count('phantom') && !count('paragon') && count('veteran')) return 'vanguard';
    if (count('recruit') && count('veteran') < 8) return 'veteran';
    return null;
  }

  /** Where the bots go: the nearest building (or the king) they are strong enough for. */
  _botGoal(power) {
    const king = this.foes.find((f) => GUARDIANS[f.kind]?.king);
    if (king) return king;
    const NEED = [0, 0, 500, 9000, 30000];
    const can = power > NEED[4] ? 4 : power > NEED[3] ? 3 : power > NEED[2] ? 2 : 1;
    let best = null;
    let bd = Infinity;
    // Nothing left that easy: the next band up only when nearly strong enough for it; else stay and build up.
    const left = this.buildings.some((b) => b.alive && !b.sealed && b.tier <= can);
    if (!left && can < 4 && power < NEED[can + 1] * 0.7) return null;
    const top = Math.min(4, left ? can : can + 1);
    for (const b of this.buildings) {
      if (!b.alive || b.sealed || b.tier > top) continue;
      // Key buildings and the Heart only once strong; the rest by distance from the camp.
      const def = BUILDINGS[b.type];
      if ((def.key && top < b.tier + 1 && b.tier < 4 && top === can) || (def.heart && top < 4)) continue;
      const d = Math.hypot(b.x - SPAWN.x, b.z - SPAWN.z) - (def.key ? 25 : 0);
      if (d < bd) {
        best = b;
        bd = d;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------- snapshot */

  /**
   * What a screen needs: soldiers, the dead that are awake (or near a
   * soldier), damaged buildings' health, and what has fallen (the rest
   * stands where the map says).
   */
  snapshot() {
    const near = (e) => {
      for (const t of this.troops) if (Math.abs(t.x - e.x) < 60 && Math.abs(t.z - e.z) < 60) return true;
      return false;
    };
    const ents = [];
    for (const t of this.troops) ents.push({ i: t.i, k: 'troop', rank: t.rank, o: t.o, x: +t.x.toFixed(2), z: +t.z.toFixed(2), a: +t.a.toFixed(2), hp: Math.ceil(t.hp), max: t.max, act: t.act, aa: t.aa });
    for (const f of this.foes) {
      if (!f.awake && f.static && !(f.hp < f.max && near(f))) continue;
      if (!f.awake && !f.static && !near(f)) continue;
      ents.push({ i: f.i, k: 'foe', kind: f.kind, x: +f.x.toFixed(2), z: +f.z.toFixed(2), a: +f.a.toFixed(2), hp: Math.ceil(f.hp), max: f.max, act: f.act, aa: f.aa, tier: f.tier });
    }
    for (const g of this.guns) ents.push({ i: g.i, k: 'gun', x: g.x, z: g.z, a: +g.a.toFixed(2), hp: Math.ceil(g.hp), max: g.max });
    const hurt = [];
    for (const b of this.buildings) if (b.alive && b.hp < b.max) hurt.push([b.i, Math.ceil(b.hp), b.max]);
    return {
      t: +this.t.toFixed(3),
      left: Math.max(0, this.left),
      speed: this.speed,
      difficulty: this.difficulty,
      heroesOnly: this.heroesOnly,
      shrines: this.shrines,
      nodes: this.nodes,
      keysLeft: this.keysLeft,
      raids: this.raids,
      raidIn: this.raidT,
      players: this.players.map((p) => ({ slot: p.slot, name: p.name, bot: p.bot, autoForge: p.autoForge, ore: Math.floor(p.ore), relics: p.relics, upg: { ...p.upg }, kills: p.kills, earned: p.earned, color: p.color, army: this.troops.filter((t) => t.o === p.slot).length })),
      ents,
      hurt,
      down: [...this.down],
      over: this.over
    };
  }
}
