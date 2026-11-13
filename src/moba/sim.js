import {
  TICK, MAP, CHAMPIONS, ITEMS, MINIONS, TOWERS, CAMPS, GOLD, XP, XP_TO, MAX_LEVEL, RESPAWN, WAVE_EVERY, FIRST_WAVE,
  PASSIVE_GOLD, START_GOLD, SHOP_RANGE, XP_RANGE, RECALL_TIME, BLINK, MEND, baseStats, BUILDS, SKILL_ORDER
} from './rules.js';
import { BASES, LANES, LANE_ORDER, lanePoint, towerSpots, CAMP_SPOTS, findPath, walkable, nearestWalkable, clearLine } from './map.js';
import { Bot } from './bots.js';

/**
 * A Lanebreak match: ten champions (people or bots), minion waves down
 * three lanes, towers, jungle camps — everything but the drawing. It runs
 * at 20 steps a second. In a shared match the host's browser runs it and
 * the others send it their commands; `snapshot()` is what everyone draws.
 *
 * Commands (one champion's, by its seat):
 *   move {x,z} · attack {target} · amove {x,z} · stop · cast {slot, x, z, target}
 *   blink {x,z} · mend · recall · buy {item} · sell {index} · rank {slot}
 */

const ENEMY = { blue: 'red', red: 'blue' };
const LEASH = 14;
const ASSIST_WINDOW = 10;
const VISION_CELL = 4;
const VN = MAP / VISION_CELL;
const SIGHT = { champ: 24, minion: 12, tower: 22, camp: 0 };

export class MobaSim {
  /**
   * @param {{ seats: Array<{ champ: string, team: 'blue'|'red', name?: string, bot?: string|null }>, seed?: number }} options
   *   `bot` is a difficulty for a bot seat, null for a person's.
   */
  constructor({ seats, seed = 1 }) {
    this.tick = 0;
    this.time = 0;
    this.seed = seed;
    this.entities = new Map();
    this.nextId = 1;
    this.pending = [];
    this.shots = []; // missiles: autos and skillshots
    this.zones = []; // areas waiting to land or lingering
    this.events = [];
    this.over = null;
    this.nextWave = FIRST_WAVE;
    this.waveCount = 0;
    this.provoked = new Map(); // champion id → tick it last hit an enemy champion
    this.vision = { blue: new Uint8Array(VN * VN), red: new Uint8Array(VN * VN) };
    this.score = { blue: { kills: 0, towers: 0 }, red: { kills: 0, towers: 0 } };
    this.boon = { blue: 0, red: 0 };

    for (const t of towerSpots()) {
      const s = TOWERS[t.tier];
      this._add({ type: 'tower', team: t.team, lane: t.lane, tier: t.tier, x: t.at[0], z: t.at[1], hp: s.hp, maxHp: s.hp, radius: t.tier === 'core' ? 4 : 2, armor: s.armor, mr: s.mr, cd: 0, target: null, streak: 0 });
    }
    for (const c of CAMP_SPOTS) this._spawnCamp(c);
    this.seats = seats.map((seat, i) => this._champion(i, seat));
    this.bots = this.seats.filter((c) => c.bot).map((c) => new Bot(this, c));
    this._vision();
  }

  /* ------------------------------------------------------------ helpers */

  _add(e) {
    e.id = this.nextId++;
    e.dead = false;
    e.px = e.x;
    e.pz = e.z;
    e.angle = e.angle ?? 0;
    e.fx = { slow: 0, slowUntil: 0, stunUntil: 0, rootUntil: 0 };
    e.shield = 0;
    e.shieldUntil = 0;
    e.act = 'idle';
    e.actAt = 0;
    this.entities.set(e.id, e);
    return e;
  }

  get(id) {
    const e = this.entities.get(id);
    return e && !e.dead ? e : null;
  }

  _event(e) {
    this.events.push({ ...e, at: this.time });
    if (this.events.length > 800) this.events.splice(0, this.events.length - 800);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  gap(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius;
  }

  hostile(a, b) {
    if (a.team === 'neutral' || b.team === 'neutral') return a.team !== b.team;
    return a.team !== b.team;
  }

  /** Whether a tower (or the core) can be hurt yet: the one before it in its lane is down. */
  targetable(e) {
    if (e.dead) return false;
    if (e.type === 'champ') return !e.respawnAt;
    if (e.type !== 'tower') return true;
    const ours = [...this.entities.values()].filter((t) => t.type === 'tower' && t.team === e.team && !t.dead);
    if (e.tier === 'outer') return true;
    if (e.tier === 'inner') return !ours.some((t) => t.tier === 'outer' && t.lane === e.lane);
    if (e.tier === 'base') return LANE_ORDER.some((lane) => !ours.some((t) => t.lane === lane && t.tier === 'inner')) ;
    return !ours.some((t) => t.tier === 'base');
  }

  visibleTo(team, e) {
    if (e.team === team) return true;
    const cx = Math.max(0, Math.min(VN - 1, Math.floor(e.x / VISION_CELL)));
    const cz = Math.max(0, Math.min(VN - 1, Math.floor(e.z / VISION_CELL)));
    return Boolean(this.vision[team][cz * VN + cx]);
  }

  champions() {
    return this.seats;
  }

  /* --------------------------------------------------------- champions */

  _champion(slot, seat) {
    const def = CHAMPIONS[seat.champ] ?? CHAMPIONS.brakka;
    const [sx, sz] = BASES[seat.team].spawn;
    const c = this._add({
      type: 'champ', slot, champ: def.id, team: seat.team, name: seat.name ?? def.name, bot: seat.bot ?? null,
      x: sx + (slot % 5) - 2, z: sz - (slot % 5) + 2, radius: 0.8,
      level: 1, xp: 0, gold: START_GOLD, items: [], ranks: [0, 0, 0, 0], points: 1, cds: [0, 0, 0, 0],
      buffs: [], order: { type: 'idle' }, attackCd: 0, windup: null, respawnAt: 0, recall: null, dash: null, pendingCast: null,
      blinkAt: 0, mendAt: 0, kda: { k: 0, d: 0, a: 0 }, cs: 0, hurtBy: new Map(), lastHurt: -99, lane: seat.lane ?? def.lane
    });
    this._recalc(c);
    c.hp = c.maxHp;
    c.mana = c.maxMana;
    c.angle = seat.team === 'blue' ? Math.PI * 0.75 : -Math.PI * 0.25;
    return c;
  }

  /** A champion's stats now: level, items, buffs, slows. */
  _recalc(c) {
    const s = baseStats(c.champ, c.level);
    for (const id of c.items) for (const [k, v] of Object.entries(ITEMS[id].stats)) s[k] = (s[k] ?? 0) + v;
    if (this.boon[c.team] > this.time) {
      s.ad += CAMPS.warden.boon.ad;
      s.ap += CAMPS.warden.boon.ap;
    }
    let asBonus = 0;
    let msBonus = 0;
    for (const b of c.buffs) {
      if (b.as) asBonus += b.as;
      if (b.ms) msBonus += b.ms;
      if (b.ad) s.ad += b.ad;
      if (b.armor) s.armor += b.armor;
      if (b.lifesteal) s.lifesteal += b.lifesteal;
    }
    s.as = Math.min(2.5, s.as * (1 + asBonus));
    const slow = c.fx.slowUntil > this.time ? c.fx.slow : 0;
    s.ms = s.ms * (1 + msBonus) * (1 - slow);
    const ratio = c.maxHp ? c.hp / c.maxHp : 1;
    const manaRatio = c.maxMana ? c.mana / c.maxMana : 1;
    c.stats = s;
    c.maxHp = Math.round(s.hp);
    c.maxMana = Math.round(s.mana);
    if (c.hp != null) c.hp = Math.min(c.maxHp, c.hp != null && c.maxHp ? ratio * c.maxHp : c.maxHp);
    if (c.mana != null) c.mana = Math.min(c.maxMana, manaRatio * c.maxMana);
    c.armor = s.armor;
    c.mr = s.mr;
  }

  /* --------------------------------------------------------- commands */

  /** A command for seat `seat` (its ability, if any, is `cmd.slot`), applied at the next step. */
  command(seat, cmd) {
    if (this.over || !cmd || typeof cmd !== 'object') return;
    this.pending.push({ seat, cmd });
  }

  _apply({ seat, cmd }) {
    const slot = seat;
    const c = this.seats[seat];
    if (!c) return;
    const at = (x, z) => [Math.max(1, Math.min(MAP - 1, Number(x) || 0)), Math.max(1, Math.min(MAP - 1, Number(z) || 0))];
    switch (cmd.type) {
      case 'buy': {
        const item = ITEMS[cmd.item];
        if (!item || c.items.length >= 6 || c.gold < item.cost || !this.inShop(c)) return;
        c.gold -= item.cost;
        c.items.push(cmd.item);
        this._recalc(c);
        this._event({ type: 'buy', slot, item: cmd.item });
        return;
      }
      case 'sell': {
        const id = c.items[cmd.index | 0];
        if (!id || !this.inShop(c)) return;
        c.items.splice(cmd.index | 0, 1);
        c.gold += Math.floor(ITEMS[id].cost * 0.6);
        this._recalc(c);
        return;
      }
      case 'rank': {
        const i = cmd.slot | 0;
        if (c.points <= 0 || i < 0 || i > 3 || c.ranks[i] >= this.maxRank(c, i)) return;
        c.ranks[i]++;
        c.points--;
        return;
      }
      default:
        break;
    }
    if (c.respawnAt) return;
    const stunned = c.fx.stunUntil > this.time;
    switch (cmd.type) {
      case 'move': {
        // A stun doesn't drop the order: it's walked once the stun wears off.
        if (c.dash) return;
        const [x, z] = at(cmd.x, cmd.z);
        this._cancelRecall(c);
        c.pendingCast = null;
        c.order = { type: 'move', path: findPath(c.x, c.z, x, z), i: 0 };
        return;
      }
      case 'amove': {
        const [x, z] = at(cmd.x, cmd.z);
        this._cancelRecall(c);
        c.order = { type: 'amove', x, z, path: findPath(c.x, c.z, x, z), i: 0 };
        return;
      }
      case 'attack': {
        const t = this.get(cmd.target);
        if (!t || !this.hostile(c, t)) return;
        this._cancelRecall(c);
        c.pendingCast = null;
        c.order = { type: 'attack', target: t.id };
        return;
      }
      case 'stop':
        c.order = { type: 'idle' };
        c.pendingCast = null;
        c.windup = null;
        return;
      case 'cast':
        if (stunned) return;
        this._cancelRecall(c);
        this._cast(c, cmd.slot | 0, { x: Number(cmd.x) || c.x, z: Number(cmd.z) || c.z, target: cmd.target ?? null });
        return;
      case 'blink': {
        if (stunned || this.time < c.blinkAt) return;
        const [x, z] = at(cmd.x, cmd.z);
        const d = Math.hypot(x - c.x, z - c.z) || 1;
        const k = Math.min(BLINK.range, d) / d;
        const [nx, nz] = nearestWalkable(c.x + (x - c.x) * k, c.z + (z - c.z) * k);
        this._event({ type: 'blink', id: c.id, from: [c.x, c.z], to: [nx, nz] });
        c.x = c.px = nx;
        c.z = c.pz = nz;
        c.blinkAt = this.time + BLINK.cooldown;
        c.order = { type: 'idle' };
        this._cancelRecall(c);
        return;
      }
      case 'mend':
        if (this.time < c.mendAt) return;
        this._heal(c, MEND.heal + MEND.perLevel * c.level, c);
        c.buffs.push({ ms: 0.3, until: this.time + 1.5 });
        c.mendAt = this.time + MEND.cooldown;
        this._event({ type: 'mend', id: c.id });
        return;
      case 'recall':
        if (c.recall || c.dash) return;
        c.order = { type: 'idle' };
        c.recall = { until: this.time + RECALL_TIME };
        c.act = 'recall';
        this._event({ type: 'recall', id: c.id });
        return;
      default:
        return;
    }
  }

  maxRank(c, i) {
    if (i === 3) return c.level >= 16 ? 3 : c.level >= 11 ? 2 : c.level >= 6 ? 1 : 0;
    return Math.min(5, Math.ceil(c.level / 2));
  }

  inShop(c) {
    const [fx, fz] = BASES[c.team].fountain;
    return Boolean(c.respawnAt) || Math.hypot(c.x - fx, c.z - fz) <= SHOP_RANGE;
  }

  _cancelRecall(c) {
    if (c.recall) {
      c.recall = null;
      c.act = 'idle';
      this._event({ type: 'recall-cancel', id: c.id });
    }
  }

  /* ------------------------------------------------------------- casting */

  /** Try to cast ability `i` at a point (or a unit); out of range for a unit: walk there first. */
  _cast(c, i, aim) {
    const ab = CHAMPIONS[c.champ].abilities[i];
    const rank = c.ranks[i];
    if (!ab || !rank || c.cds[i] > 0 || c.mana < ab.cost || c.dash) return false;
    const r = (v) => (Array.isArray(v) ? v[Math.min(v.length - 1, rank - 1)] : v ?? 0);
    let target = null;
    if (ab.kind === 'target') {
      target = this.get(aim.target);
      if (!target && ab.team === 'enemy') target = this._nearestTo(aim.x, aim.z, (e) => this.hostile(c, e) && this.targetable(e) && e.type !== 'tower', 4);
      if (!target && ab.team === 'ally') target = this._nearestTo(aim.x, aim.z, (e) => e.type === 'champ' && e.team === c.team && !e.respawnAt, 4) ?? c;
      if (!target || (ab.team === 'enemy' ? !this.hostile(c, target) : target.team !== c.team)) return false;
      if (this.gap(c, target) > ab.range) {
        c.pendingCast = { i, target: target.id };
        c.order = { type: 'chase', target: target.id };
        return false;
      }
    }
    c.pendingCast = null;
    c.mana -= ab.cost;
    const haste = c.stats.haste ?? 0;
    c.cds[i] = r(ab.cd) * (100 / (100 + haste));
    const dx = aim.x - c.x;
    const dz = aim.z - c.z;
    const len = Math.hypot(dx, dz) || 1;
    const dir = [dx / len, dz / len];
    c.angle = Math.atan2(dir[0], dir[1]);
    c.act = 'cast';
    c.actAt = this.time;
    const power = { damage: r(ab.damage) + (ab.ad ?? 0) * c.stats.ad + (ab.ap ?? 0) * c.stats.ap, heal: r(ab.heal) + (ab.ap ?? 0) * c.stats.ap, shield: r(ab.shield) + (ab.ap ?? 0) * c.stats.ap + (ab.hpRatio ?? 0) * c.maxHp };
    const hit = { ab, power, rank, r };
    const clampTo = (range) => {
      const k = Math.min(range, len) / len;
      return [c.x + dx * k, c.z + dz * k];
    };
    switch (ab.kind) {
      case 'shot':
        this.shots.push({ kind: 'skill', owner: c.id, team: c.team, x: c.x, z: c.z, dx: dir[0], dz: dir[1], speed: ab.speed, left: ab.range, width: ab.width, pierce: Boolean(ab.pierce), hit, struck: new Set(), champ: c.champ, slot: i });
        break;
      case 'area': {
        const [x, z] = clampTo(ab.range);
        this.zones.push({ owner: c.id, team: c.team, x, z, radius: ab.radius, landAt: this.time + (ab.delay ?? 0), until: this.time + (ab.delay ?? 0) + (ab.duration ?? 0), nextTick: 0, hit, champ: c.champ, slot: i, landed: false });
        break;
      }
      case 'nova':
        this._burst(c, c.x, c.z, ab.radius, hit);
        break;
      case 'dash': {
        const [x, z] = clampTo(ab.range);
        const [tx, tz] = nearestWalkable(x, z);
        c.dash = { tx, tz, speed: ab.speed, hit: ab.damage ? hit : null, struck: new Set() };
        c.order = { type: 'idle' };
        c.act = 'dash';
        break;
      }
      case 'blink': {
        const [x, z] = clampTo(ab.range);
        const [nx, nz] = nearestWalkable(x, z);
        this._event({ type: 'blink', id: c.id, from: [c.x, c.z], to: [nx, nz] });
        c.x = c.px = nx;
        c.z = c.pz = nz;
        break;
      }
      case 'target':
        if (ab.team === 'ally') this._help(c, target, hit);
        else this._strike(c, target, hit);
        break;
      case 'self':
        this._help(c, c, hit);
        break;
      default:
        break;
    }
    this._event({ type: 'cast', id: c.id, slot: i, champ: c.champ, kind: ab.kind, x: aim.x, z: aim.z, target: target?.id ?? null });
    return true;
  }

  /** An ability's harm on one enemy. */
  _strike(c, t, { ab, power }) {
    let dmg = power.damage;
    if (ab.missing && t.maxHp) dmg *= 1 + ab.missing * (1 - t.hp / t.maxHp) * 2;
    if (dmg > 0) this._damage(t, dmg, ab.type ?? 'magic', c);
    if (t.dead) return;
    if (ab.slow) this._slow(t, ab.slow.amount, ab.slow.time);
    if (ab.stun && t.type !== 'tower') t.fx.stunUntil = Math.max(t.fx.stunUntil, this.time + ab.stun);
    if (ab.root && t.type !== 'tower') t.fx.rootUntil = Math.max(t.fx.rootUntil, this.time + ab.root);
    if (ab.pull && t.type !== 'tower') {
      const dx = c.x - t.x;
      const dz = c.z - t.z;
      const d = Math.hypot(dx, dz) || 1;
      const k = Math.max(0, (d - c.radius - t.radius - 0.5) / d);
      const [nx, nz] = nearestWalkable(t.x + dx * k, t.z + dz * k);
      t.x = nx;
      t.z = nz;
      if (t.order) t.order = { type: 'idle' };
    }
    if (ab.heal && c.type === 'champ') this._heal(c, power.heal, c);
  }

  /** An ability's help on one friend: heal, shield, buff. */
  _help(c, t, { ab, power, r }) {
    if (power.heal > 0) this._heal(t, power.heal, c);
    if (power.shield > 0) {
      t.shield = power.shield;
      t.shieldUntil = this.time + 3;
    }
    if (ab.buff && t.type === 'champ') {
      const b = { until: this.time + ab.buff.time };
      for (const k of ['as', 'ms', 'ad', 'armor', 'lifesteal']) if (ab.buff[k] != null) b[k] = r(ab.buff[k]);
      t.buffs.push(b);
      this._recalc(t);
    }
  }

  /** Everything in a circle: enemies take the hit, friends (for a helping ability) the help. */
  _burst(c, x, z, radius, hit) {
    for (const e of this.entities.values()) {
      if (e.dead || (e.type === 'champ' && e.respawnAt)) continue;
      if (Math.hypot(e.x - x, e.z - z) - e.radius > radius) continue;
      if (hit.ab.team === 'ally') {
        if (e.type === 'champ' && e.team === c.team) this._help(c, e, hit);
      } else if (this.hostile(c, e) && this.targetable(e) && e.type !== 'tower') {
        this._strike(c, e, hit);
      }
    }
  }

  _slow(t, amount, time) {
    if (t.fx.slowUntil < this.time || amount >= t.fx.slow) {
      t.fx.slow = amount;
      t.fx.slowUntil = this.time + time;
    }
  }

  _heal(t, amount, by) {
    if (t.dead || amount <= 0) return;
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    if (t.hp - before >= 1) this._event({ type: 'heal', id: t.id, amount: Math.round(t.hp - before), by: by?.id });
  }

  _nearestTo(x, z, test, within) {
    let best = null;
    let bestD = within;
    for (const e of this.entities.values()) {
      if (e.dead || !test(e)) continue;
      const d = Math.hypot(e.x - x, e.z - z) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------- damage */

  /** Hurt `t` by `amount` of `type` ('physical' | 'magic' | 'true') from `src`. */
  _damage(t, amount, type, src) {
    if (t.dead || (t.type === 'champ' && t.respawnAt) || !this.targetable(t)) return 0;
    let dmg = amount;
    if (type === 'physical') dmg *= 100 / (100 + Math.max(0, t.armor ?? 0));
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, t.mr ?? 0));
    dmg = Math.max(1, dmg);
    if (t.shield > 0 && t.shieldUntil > this.time) {
      const soak = Math.min(t.shield, dmg);
      t.shield -= soak;
      dmg -= soak;
    }
    t.hp -= dmg;
    const champSrc = src?.type === 'champ' ? src : null;
    if (t.type === 'champ') {
      t.lastHurt = this.time;
      if (champSrc) {
        t.hurtBy.set(champSrc.id, this.time);
        this.provoked.set(champSrc.id, this.time);
      }
      this._cancelRecall(t);
    }
    if (champSrc && champSrc.stats.lifesteal && type === 'physical') this._heal(champSrc, dmg * champSrc.stats.lifesteal, champSrc);
    if (t.type === 'camp' && src && !t.aggro) t.aggro = src.id;
    if (t.type === 'camp' && src) t.aggro = t.aggro ?? src.id;
    this._event({ type: 'hit', id: t.id, amount: Math.round(dmg), kind: type, by: src?.id ?? null });
    if (t.hp <= 0) this._die(t, src);
    return dmg;
  }

  _die(t, src) {
    t.hp = 0;
    const killer = src?.type === 'champ' ? src : null;
    if (t.type === 'champ') {
      t.respawnAt = this.time + RESPAWN(t.level);
      t.kda.d++;
      t.order = { type: 'idle' };
      t.dash = null;
      t.recall = null;
      t.buffs = [];
      t.act = 'dead';
      t.actAt = this.time;
      const assists = [...t.hurtBy.entries()].filter(([id, at]) => this.time - at < ASSIST_WINDOW && id !== killer?.id).map(([id]) => this.get(id)).filter((c) => c && c.team !== t.team);
      t.hurtBy.clear();
      const team = killer?.team ?? assists[0]?.team ?? ENEMY[t.team];
      this.score[team].kills++;
      if (killer) {
        killer.kda.k++;
        this._gold(killer, GOLD.kill, t);
      }
      for (const a of assists) {
        a.kda.a++;
        this._gold(a, Math.round(GOLD.assist / Math.max(1, assists.length)) + 50, t);
      }
      this._shareXp(t, XP.kill + XP.killPerLevel * t.level, team);
      this._event({ type: 'kill', victim: t.slot, killer: killer?.slot ?? null, assists: assists.map((a) => a.slot), by: src?.type ?? null, team });
      return;
    }
    t.dead = true;
    if (t.type === 'minion') {
      if (killer) {
        killer.cs++;
        this._gold(killer, GOLD[t.kind], t);
      }
      this._shareXp(t, XP[t.kind], ENEMY[t.team]);
    } else if (t.type === 'camp') {
      const def = CAMPS[t.kind];
      if (killer) {
        this._gold(killer, def.gold, t);
        killer.cs += 4;
      }
      this._shareXp(t, def.xp, killer?.team ?? null);
      if (t.kind === 'warden' && killer) {
        this.boon[killer.team] = this.time + CAMPS.warden.boon.time;
        for (const c of this.seats) if (c.team === killer.team) this._recalc(c);
        this._event({ type: 'boon', team: killer.team });
      }
      const spot = t.spot;
      this.later = this.later ?? [];
      this.later.push({ at: this.time + def.respawn, run: () => this._spawnCamp(spot) });
    } else if (t.type === 'tower') {
      const team = ENEMY[t.team];
      this.score[team].towers++;
      for (const c of this.seats) if (c.team === team) this._gold(c, GOLD.tower, null);
      if (killer) this._gold(killer, GOLD.towerLocal, t);
      this._event({ type: 'tower', team: t.team, tier: t.tier, lane: t.lane, x: t.x, z: t.z });
      if (t.tier === 'core') {
        this.over = { winner: team, time: this.time };
        this._event({ type: 'over', winner: team });
      }
    }
    this._event({ type: 'death', id: t.id, kind: t.type, x: t.x, z: t.z });
  }

  _gold(c, amount, from) {
    c.gold += amount;
    this._event({ type: 'gold', slot: c.slot, amount, x: from?.x ?? c.x, z: from?.z ?? c.z });
  }

  /** Experience for every champion of `team` near the death (split, a little extra for sharing). */
  _shareXp(t, amount, team) {
    const near = this.seats.filter((c) => !c.respawnAt && (!team || c.team === team) && c.team !== t.team && Math.hypot(c.x - t.x, c.z - t.z) <= XP_RANGE);
    if (!near.length) return;
    const each = (amount * (near.length > 1 ? 1.25 : 1)) / near.length;
    for (const c of near) this._xp(c, each);
  }

  _xp(c, amount) {
    if (c.level >= MAX_LEVEL) return;
    c.xp += amount;
    while (c.level < MAX_LEVEL && c.xp >= XP_TO[c.level + 1]) {
      c.level++;
      c.points++;
      const hpBefore = c.maxHp;
      this._recalc(c);
      c.hp = Math.min(c.maxHp, c.hp + (c.maxHp - hpBefore));
      this._event({ type: 'level', slot: c.slot, level: c.level });
    }
  }

  /* ----------------------------------------------------------- the step */

  step() {
    if (this.over) return;
    this.time = this.tick * TICK;
    for (const bot of this.bots) bot.update();
    const cmds = this.pending;
    this.pending = [];
    for (const cmd of cmds) this._apply(cmd);

    if (this.time >= this.nextWave) this._wave();
    if (this.later?.length) {
      const due = this.later.filter((l) => l.at <= this.time);
      this.later = this.later.filter((l) => l.at > this.time);
      for (const l of due) l.run();
    }
    const second = this.tick % 20 === 0;
    for (const e of this.entities.values()) {
      if (e.dead) continue;
      e.px = e.x;
      e.pz = e.z;
      if (e.shield > 0 && e.shieldUntil < this.time) e.shield = 0;
      if (e.type === 'champ') this._champStep(e, second);
      else if (e.type === 'minion') this._minionStep(e);
      else if (e.type === 'tower') this._towerStep(e);
      else if (e.type === 'camp') this._campStep(e);
    }
    this._separate();
    this._shotsStep();
    this._zonesStep();
    for (const [id, e] of this.entities) if (e.dead) this.entities.delete(id);
    if (this.tick % 4 === 0) this._vision();
    this.tick++;
  }

  _wave() {
    this.waveCount++;
    this.nextWave += WAVE_EVERY;
    const siege = this.waveCount % 3 === 0;
    const grow = Math.floor(this.time / 60); // minions grow a little each minute
    for (const team of ['blue', 'red']) {
      for (const lane of LANE_ORDER) {
        const kinds = ['melee', 'melee', 'melee', ...(siege ? ['siege'] : []), 'caster', 'caster', 'caster'];
        kinds.forEach((kind, i) => {
          const t = team === 'blue' ? 0.05 : 0.95;
          const [x, z] = lanePoint(lane, t);
          const s = MINIONS[kind];
          const hp = s.hp + s.perWave * grow;
          const path = team === 'blue' ? LANES[lane] : [...LANES[lane]].reverse();
          this._add({
            type: 'minion', kind, team, lane, x: x + (i % 3) * 0.8 - 0.8, z: z + Math.floor(i / 3) * 0.8, hp, maxHp: hp,
            radius: s.radius, armor: s.armor, mr: s.mr, path, wp: 1, cd: 0, target: null, damage: s.damage + grow * 1.5
          });
        });
      }
    }
  }

  /* -------------------------------------------------------- champion step */

  _champStep(c, second) {
    const t = this.time;
    if (c.respawnAt) {
      if (t >= c.respawnAt) {
        c.respawnAt = 0;
        const [sx, sz] = BASES[c.team].spawn;
        c.x = c.px = sx;
        c.z = c.pz = sz;
        c.hp = c.maxHp;
        c.mana = c.maxMana;
        c.act = 'idle';
        c.order = { type: 'idle' };
        this._event({ type: 'respawn', id: c.id });
      }
      return;
    }
    for (let i = 0; i < 4; i++) if (c.cds[i] > 0) c.cds[i] = Math.max(0, c.cds[i] - TICK);
    if (c.attackCd > 0) c.attackCd -= TICK;
    const before = c.buffs.length;
    c.buffs = c.buffs.filter((b) => b.until > t);
    if (c.buffs.length !== before || this.tick % 10 === 0) this._recalc(c);
    if (second) {
      if (t >= FIRST_WAVE) c.gold += PASSIVE_GOLD;
      c.hp = Math.min(c.maxHp, c.hp + c.stats.regen / 5);
      c.mana = Math.min(c.maxMana, c.mana + c.stats.manaRegen);
    }
    // The fountain: home heals fast and burns intruders.
    for (const team of ['blue', 'red']) {
      const [fx, fz] = BASES[team].fountain;
      const d = Math.hypot(c.x - fx, c.z - fz);
      if (d < 12) {
        if (team === c.team) {
          c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.12 * TICK);
          c.mana = Math.min(c.maxMana, c.mana + c.maxMana * 0.12 * TICK);
        } else {
          this._damage(c, 600 * TICK, 'true', null);
          if (c.respawnAt) return;
        }
      }
    }
    if (c.recall) {
      if (t >= c.recall.until) {
        const [sx, sz] = BASES[c.team].spawn;
        this._event({ type: 'recalled', id: c.id, from: [c.x, c.z] });
        c.x = c.px = sx;
        c.z = c.pz = sz;
        c.recall = null;
        c.act = 'idle';
      }
      return;
    }
    if (c.dash) {
      this._dashStep(c);
      return;
    }
    if (c.fx.stunUntil > t) {
      c.windup = null;
      return;
    }
    if (c.windup) {
      c.windup.t -= TICK;
      if (c.windup.t <= 0) {
        const target = this.get(c.windup.target);
        c.windup = null;
        if (target && this.targetable(target) && this.gap(c, target) <= c.stats.range + 1.5) this._autoHit(c, target);
      }
      return;
    }
    const o = c.order;
    if (c.pendingCast) {
      const target = this.get(c.pendingCast.target);
      if (!target || !this.targetable(target)) c.pendingCast = null;
      else if (this.gap(c, target) <= CHAMPIONS[c.champ].abilities[c.pendingCast.i].range) {
        this._cast(c, c.pendingCast.i, { x: target.x, z: target.z, target: target.id });
        c.order = { type: 'idle' };
        return;
      } else {
        this._walk(c, target.x, target.z);
        return;
      }
    }
    switch (o.type) {
      case 'move':
        if (this._follow(c, o)) c.order = { type: 'idle' };
        break;
      case 'chase':
      case 'attack': {
        const target = this.get(o.target);
        if (!target || !this.targetable(target) || (target.type === 'champ' && !this.visibleTo(c.team, target))) {
          c.order = { type: 'idle' };
          break;
        }
        this._fight(c, target);
        break;
      }
      case 'amove': {
        const target = this._acquire(c, c.stats.range + 4);
        if (target) {
          this._fight(c, target);
          break;
        }
        if (this._follow(c, o)) c.order = { type: 'idle' };
        break;
      }
      default: {
        // Idle: hit whatever enemy comes into reach.
        const target = this._acquire(c, c.stats.range + 0.5);
        if (target && !c.bot) this._fight(c, target, false);
        else c.act = 'idle';
      }
    }
  }

  /** Attack `target`: walk into range, wind up, hit. */
  _fight(c, target, chase = true) {
    const range = c.stats.range;
    if (this.gap(c, target) > range) {
      if (chase) this._walk(c, target.x, target.z);
      return;
    }
    c.angle = Math.atan2(target.x - c.x, target.z - c.z);
    if (c.attackCd > 0) {
      if (c.act !== 'attack' || this.time - c.actAt > 0.5) c.act = 'idle';
      return;
    }
    c.attackCd = 1 / c.stats.as;
    c.windup = { target: target.id, t: Math.min(0.3, 0.25 / c.stats.as) };
    c.act = 'attack';
    c.actAt = this.time;
  }

  _autoHit(c, target) {
    const dmg = c.stats.ad;
    if (c.stats.ranged) {
      this.shots.push({ kind: 'auto', owner: c.id, team: c.team, x: c.x, z: c.z, target: target.id, speed: 32, damage: dmg, type: 'physical', champ: c.champ });
    } else {
      this._damage(target, dmg, 'physical', c);
    }
    this._event({ type: 'attack', id: c.id, target: target.id, ranged: c.stats.ranged });
  }

  /** The nearest enemy it may attack within `r`: champions it can see, minions, monsters, towers. */
  _acquire(c, r) {
    let best = null;
    let bestD = r;
    for (const e of this.entities.values()) {
      if (e.dead || !this.hostile(c, e) || !this.targetable(e)) continue;
      if (e.type === 'champ' && !this.visibleTo(c.team, e)) continue;
      if (e.type === 'camp' && !e.aggro) continue; // camps only if already fighting
      const d = this.gap(c, e) + (e.type === 'tower' ? 3 : 0);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  _dashStep(c) {
    const d = c.dash;
    const dx = d.tx - c.x;
    const dz = d.tz - c.z;
    const l = Math.hypot(dx, dz);
    const step = d.speed * TICK;
    if (d.hit && !d.hit.ab.radius) {
      // A charge: stops at the first enemy it meets.
      for (const e of this.entities.values()) {
        if (e.dead || !this.hostile(c, e) || !this.targetable(e) || e.type === 'tower' || d.struck.has(e.id)) continue;
        if (Math.hypot(e.x - c.x, e.z - c.z) < c.radius + e.radius + 0.6) {
          d.struck.add(e.id);
          this._strike(c, e, d.hit);
          c.dash = null;
          c.act = 'idle';
          return;
        }
      }
    }
    if (l <= step) {
      c.x = d.tx;
      c.z = d.tz;
      c.dash = null;
      c.act = 'idle';
      if (d.hit?.ab.radius) this._burst(c, c.x, c.z, d.hit.ab.radius, d.hit);
      return;
    }
    const nx = c.x + (dx / l) * step;
    const nz = c.z + (dz / l) * step;
    c.angle = Math.atan2(dx, dz);
    if (!walkable(nx, nz)) {
      c.dash = null;
      c.act = 'idle';
      return;
    }
    c.x = nx;
    c.z = nz;
  }

  /** Walk straight toward a point (or path around walls when they're in the way). */
  _walk(e, x, z) {
    if (e.fx.rootUntil > this.time || e.fx.stunUntil > this.time) return;
    if (!clearLine(e.x, e.z, x, z)) {
      // Around the wall: keep a path to the moving target, refreshed now and then.
      if (!e.chasePath || this.tick - e.chasePath.at > 10 || e.chasePath.i >= e.chasePath.path.length) e.chasePath = { path: findPath(e.x, e.z, x, z), i: 0, at: this.tick };
      const p = e.chasePath.path[e.chasePath.i];
      if (p && this._stepTo(e, p[0], p[1])) e.chasePath.i++;
      return;
    }
    e.chasePath = null;
    this._stepTo(e, x, z);
  }

  /** Follow an order's path; true when at its end. */
  _follow(e, o) {
    const p = o.path?.[o.i];
    if (!p) return true;
    if (this._stepTo(e, p[0], p[1])) o.i++;
    return o.i >= o.path.length;
  }

  /** One step toward a point; true when there. */
  _stepTo(e, x, z) {
    if (e.fx.rootUntil > this.time || e.fx.stunUntil > this.time) return false;
    const dx = x - e.x;
    const dz = z - e.z;
    const l = Math.hypot(dx, dz);
    const speed = e.type === 'champ' ? e.stats.ms : (MINIONS[e.kind]?.speed ?? CAMPS[e.kind]?.speed ?? 5) * (e.fx.slowUntil > this.time ? 1 - e.fx.slow : 1);
    const step = speed * TICK;
    e.act = 'run';
    if (l <= step) {
      e.x = x;
      e.z = z;
      return true;
    }
    e.angle = Math.atan2(dx, dz);
    const nx = e.x + (dx / l) * step;
    const nz = e.z + (dz / l) * step;
    if (walkable(nx, nz)) {
      e.x = nx;
      e.z = nz;
    } else if (walkable(nx, e.z)) e.x = nx;
    else if (walkable(e.x, nz)) e.z = nz;
    return false;
  }

  /* ------------------------------------------------------------ minions */

  _minionStep(m) {
    const s = MINIONS[m.kind];
    if (m.cd > 0) m.cd -= TICK;
    if (m.fx.stunUntil > this.time) return;
    if ((this.tick + m.id) % 3 === 0 || !this.get(m.target)) m.target = this._minionTarget(m, s)?.id ?? null;
    const t = this.get(m.target);
    if (t) {
      if (this.gap(m, t) <= s.range) {
        m.angle = Math.atan2(t.x - m.x, t.z - m.z);
        if (m.cd <= 0) {
          m.cd = s.cooldown;
          m.act = 'attack';
          m.actAt = this.time;
          if (m.kind === 'melee') this._damage(t, m.damage, 'physical', m);
          else this.shots.push({ kind: 'auto', owner: m.id, team: m.team, x: m.x, z: m.z, target: t.id, speed: 24, damage: m.damage, type: 'physical', minion: m.kind });
        } else if (this.time - m.actAt > 0.5) m.act = 'idle';
        return;
      }
      this._walk(m, t.x, t.z);
      return;
    }
    const p = m.path[m.wp];
    if (!p) return;
    if (this._stepTo(m, p[0] + ((m.id % 5) - 2) * 0.5, p[1] + ((m.id % 3) - 1) * 0.5)) m.wp = Math.min(m.path.length - 1, m.wp + 1);
    if (Math.hypot(m.x - p[0], m.z - p[1]) < 3) m.wp = Math.min(m.path.length, m.wp + 1);
  }

  /** A minion's pick: whoever just hurt a friendly champion nearby, else the nearest minion, then buildings, then champions. */
  _minionTarget(m, s) {
    let best = null;
    let bestScore = Infinity;
    for (const e of this.entities.values()) {
      if (e.dead || !this.hostile(m, e) || e.team === 'neutral' || !this.targetable(e)) continue;
      const d = this.gap(m, e);
      if (d > s.sight) continue;
      let score = d;
      if (e.type === 'champ') {
        const angered = this.time - (this.provoked.get(e.id) ?? -99) < 2 && d < 9;
        score += angered ? -20 : 12;
      } else if (e.type === 'tower') score += 6;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  /* -------------------------------------------------------------- towers */

  _towerStep(t) {
    const s = TOWERS[t.tier];
    if (!s.damage) return;
    if (t.cd > 0) t.cd -= TICK;
    let target = this.get(t.target);
    if (!target || this.gap(t, target) > s.range || !this.targetable(target)) {
      target = null;
      t.streak = 0;
    }
    // A champion who hurts one of ours under the tower becomes the target.
    for (const c of this.seats) {
      if (c.team === t.team || c.respawnAt) continue;
      if (this.time - (this.provoked.get(c.id) ?? -99) < 1 && this.gap(t, c) <= s.range && this.visibleTo(t.team, c)) {
        const victimNear = this.seats.some((f) => f.team === t.team && !f.respawnAt && this.time - f.lastHurt < 1 && this.gap(t, f) <= s.range + 2);
        if (victimNear && target?.id !== c.id) {
          target = c;
          t.streak = 0;
        }
      }
    }
    if (!target) {
      let bestScore = Infinity;
      for (const e of this.entities.values()) {
        if (e.dead || e.team === t.team || e.team === 'neutral' || e.type === 'tower' || !this.targetable(e)) continue;
        const d = this.gap(t, e);
        if (d > s.range) continue;
        const score = d + (e.type === 'champ' ? 30 : 0);
        if (score < bestScore) {
          bestScore = score;
          target = e;
        }
      }
    }
    t.target = target?.id ?? null;
    if (target && t.cd <= 0) {
      t.cd = 1;
      // Each hit in a row on a champion hurts more.
      const mult = target.type === 'champ' ? 1 + Math.min(3, t.streak) * 0.3 : target.type === 'minion' ? (target.kind === 'siege' ? 0.6 : 1.4) : 1;
      if (target.type === 'champ') t.streak++;
      this.shots.push({ kind: 'auto', owner: t.id, team: t.team, x: t.x, z: t.z, y: 6, target: target.id, speed: 30, damage: s.damage * mult, type: 'physical', tower: true });
    }
  }

  /* --------------------------------------------------------------- camps */

  _spawnCamp(spot) {
    const def = CAMPS[spot.kind];
    const e = this._add({ type: 'camp', kind: spot.kind, team: 'neutral', x: spot.at[0], z: spot.at[1], home: [...spot.at], hp: def.hp, maxHp: def.hp, radius: spot.kind === 'warden' ? 2.2 : 1.2, armor: def.armor, mr: def.mr, cd: 0, aggro: null, spot });
    this._event({ type: 'camp', kind: spot.kind, x: e.x, z: e.z });
    return e;
  }

  _campStep(m) {
    const def = CAMPS[m.kind];
    if (m.cd > 0) m.cd -= TICK;
    const home = Math.hypot(m.x - m.home[0], m.z - m.home[1]);
    let t = m.aggro ? this.get(m.aggro) : null;
    if (t && (t.respawnAt || home > LEASH || Math.hypot(t.x - m.home[0], t.z - m.home[1]) > LEASH + 4)) t = null;
    if (!t) {
      m.aggro = null;
      if (home > 0.5) {
        this._stepTo(m, m.home[0], m.home[1]);
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.2 * TICK);
      } else {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.05 * TICK);
        m.act = 'idle';
      }
      return;
    }
    if (m.fx.stunUntil > this.time) return;
    if (this.gap(m, t) > def.range) {
      this._walk(m, t.x, t.z);
      return;
    }
    m.angle = Math.atan2(t.x - m.x, t.z - m.z);
    if (m.cd <= 0) {
      m.cd = 1.5;
      m.act = 'attack';
      m.actAt = this.time;
      this._damage(t, def.damage * (1 + this.time / 600), 'physical', m);
    }
  }

  /* ----------------------------------------------------- missiles, areas */

  _shotsStep() {
    const keep = [];
    for (const s of this.shots) {
      if (s.kind === 'auto') {
        const t = this.get(s.target);
        if (!t || (t.type === 'champ' && t.respawnAt)) continue;
        const dx = t.x - s.x;
        const dz = t.z - s.z;
        const l = Math.hypot(dx, dz);
        const step = s.speed * TICK;
        if (l <= step + t.radius) {
          const src = this.get(s.owner) ?? { type: s.tower ? 'tower' : 'minion', team: s.team };
          this._damage(t, s.damage, s.type, src);
          continue;
        }
        s.x += (dx / l) * step;
        s.z += (dz / l) * step;
        keep.push(s);
        continue;
      }
      // A skillshot: straight on until it hits or runs out.
      const step = s.speed * TICK;
      const owner = this.get(s.owner) ?? { id: s.owner, type: 'champ', team: s.team, stats: { ad: 0, ap: 0 }, x: s.x, z: s.z };
      let done = false;
      for (let k = 0; k < 2 && !done; k++) {
        s.x += s.dx * step * 0.5;
        s.z += s.dz * step * 0.5;
        s.left -= step * 0.5;
        for (const e of this.entities.values()) {
          if (e.dead || s.struck.has(e.id) || e.team === s.team || e.type === 'tower' || !this.targetable(e)) continue;
          if (Math.hypot(e.x - s.x, e.z - s.z) > e.radius + s.width) continue;
          s.struck.add(e.id);
          this._strike(owner, e, s.hit);
          this._event({ type: 'shot-hit', x: s.x, z: s.z, champ: s.champ, slot: s.slot });
          if (!s.pierce) {
            done = true;
            break;
          }
        }
      }
      if (!done && s.left > 0 && s.x > 0 && s.z > 0 && s.x < MAP && s.z < MAP) keep.push(s);
    }
    this.shots = keep;
  }

  _zonesStep() {
    const keep = [];
    for (const z of this.zones) {
      if (this.time < z.landAt) {
        keep.push(z);
        continue;
      }
      const owner = this.get(z.owner) ?? { id: z.owner, type: 'champ', team: z.team, stats: { ad: 0, ap: 0 }, x: z.x, z: z.z };
      if (!z.landed) {
        z.landed = true;
        this._event({ type: 'land', x: z.x, z: z.z, radius: z.radius, champ: z.champ, slot: z.slot });
        if (z.hit.ab.team === 'ally' || !z.hit.ab.duration) this._burst(owner, z.x, z.z, z.radius, z.hit);
      }
      if (z.hit.ab.duration && this.time >= z.nextTick) {
        z.nextTick = this.time + 0.5;
        this._burst(owner, z.x, z.z, z.radius, z.hit);
      }
      if (this.time < z.until) keep.push(z);
    }
    this.zones = keep;
  }

  /** Units push each other apart a little (champions slide past minions). */
  _separate() {
    const list = [...this.entities.values()].filter((e) => !e.dead && (e.type === 'minion' || (e.type === 'champ' && !e.respawnAt) || e.type === 'camp'));
    const cell = 4;
    const grid = new Map();
    for (const e of list) {
      const k = Math.floor(e.x / cell) + Math.floor(e.z / cell) * 64;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(e);
    }
    for (const a of list) {
      const gx = Math.floor(a.x / cell);
      const gz = Math.floor(a.z / cell);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (const b of grid.get(gx + dx + (gz + dz) * 64) ?? []) {
            if (b.id <= a.id) continue;
            const ddx = b.x - a.x;
            const ddz = b.z - a.z;
            const d = Math.hypot(ddx, ddz);
            const min = (a.radius + b.radius) * (a.type === 'champ' || b.type === 'champ' ? 0.6 : 0.9);
            if (d >= min || d < 1e-4) continue;
            const push = (min - d) * 0.5;
            const nx = ddx / d;
            const nz = ddz / d;
            const wa = a.type === 'champ' && b.type !== 'champ' ? 0.2 : b.type === 'champ' && a.type !== 'champ' ? 0.8 : 0.5;
            if (!a.dash && walkable(a.x - nx * push * wa * 2, a.z - nz * push * wa * 2)) {
              a.x -= nx * push * wa * 2;
              a.z -= nz * push * wa * 2;
            }
            if (!b.dash && walkable(b.x + nx * push * (1 - wa) * 2, b.z + nz * push * (1 - wa) * 2)) {
              b.x += nx * push * (1 - wa) * 2;
              b.z += nz * push * (1 - wa) * 2;
            }
          }
        }
      }
    }
  }

  _vision() {
    for (const team of ['blue', 'red']) {
      const v = this.vision[team];
      v.fill(0);
      for (const e of this.entities.values()) {
        if (e.dead || e.team !== team || (e.type === 'champ' && e.respawnAt)) continue;
        const r = Math.ceil((SIGHT[e.type] ?? 0) / VISION_CELL);
        if (!r) continue;
        const cx = Math.floor(e.x / VISION_CELL);
        const cz = Math.floor(e.z / VISION_CELL);
        for (let dz = -r; dz <= r; dz++) {
          const z = cz + dz;
          if (z < 0 || z >= VN) continue;
          const w = Math.floor(Math.sqrt(r * r - dz * dz));
          for (let x = Math.max(0, cx - w); x <= Math.min(VN - 1, cx + w); x++) v[z * VN + x] = 1;
        }
      }
      // Home is always seen.
      const [bx, bz] = BASES[team].fountain;
      for (let z = 0; z < VN; z++) for (let x = 0; x < VN; x++) if (Math.hypot((x + 0.5) * VISION_CELL - bx, (z + 0.5) * VISION_CELL - bz) < 30) v[z * VN + x] = 1;
    }
  }

  /* ---------------------------------------------------------- snapshot */

  /**
   * What everyone draws: every entity's place and state, every champion's
   * details, missiles and areas, the score. Plain data, small enough to
   * send ten times a second.
   */
  snapshot() {
    const ents = [];
    for (const e of this.entities.values()) {
      if (e.dead) continue;
      const row = { i: e.id, k: e.type, tm: e.team, x: e.x, z: e.z, a: e.angle, hp: Math.max(0, Math.round(e.hp)), mh: Math.round(e.maxHp), act: e.act, aa: e.actAt };
      if (e.type === 'minion') row.kind = e.kind;
      else if (e.type === 'camp') row.kind = e.kind;
      else if (e.type === 'tower') {
        row.tier = e.tier;
        row.lane = e.lane;
        row.tg = e.target;
        row.inv = !this.targetable(e);
      } else if (e.type === 'champ') {
        row.s = e.slot;
        if (e.respawnAt) row.dead = true;
      }
      if (e.shield > 0 && e.shieldUntil > this.time) row.sh = Math.round(e.shield);
      if (e.fx.stunUntil > this.time) row.st = 1;
      else if (e.fx.rootUntil > this.time) row.rt = 1;
      if (e.fx.slowUntil > this.time) row.sl = 1;
      ents.push(row);
    }
    const champs = this.seats.map((c) => ({
      s: c.slot, i: c.id, name: c.name, champ: c.champ, team: c.team, bot: Boolean(c.bot), level: c.level, xp: Math.round(c.xp),
      gold: Math.floor(c.gold), items: [...c.items], ranks: [...c.ranks], points: c.points, cds: c.cds.map((v) => Math.round(v * 10) / 10),
      hp: Math.max(0, Math.round(c.hp)), mh: c.maxHp, mana: Math.round(c.mana), mm: c.maxMana, kda: { ...c.kda }, cs: c.cs,
      respawn: c.respawnAt ? Math.max(0, Math.ceil(c.respawnAt - this.time)) : 0, recall: c.recall ? Math.max(0, c.recall.until - this.time) : 0,
      blink: Math.max(0, Math.ceil(c.blinkAt - this.time)), mend: Math.max(0, Math.ceil(c.mendAt - this.time)),
      st: { ad: Math.round(c.stats.ad), ap: Math.round(c.stats.ap), armor: Math.round(c.stats.armor), mr: Math.round(c.stats.mr), as: Math.round(c.stats.as * 100) / 100, ms: Math.round(c.stats.ms * 10) / 10, range: c.stats.range },
      shop: this.inShop(c)
    }));
    return {
      tick: this.tick,
      t: this.time,
      ents,
      champs,
      shots: this.shots.map((s) => ({ x: s.x, z: s.z, k: s.kind, champ: s.champ ?? null, slot: s.slot ?? null, tower: Boolean(s.tower), team: s.team })),
      zones: this.zones.map((z) => ({ x: z.x, z: z.z, r: z.radius, champ: z.champ, slot: z.slot, land: Math.max(0, z.landAt - this.time), until: Math.max(0, z.until - this.time), team: z.team, ally: z.hit.ab.team === 'ally' })),
      score: { blue: { ...this.score.blue }, red: { ...this.score.red } },
      boon: { blue: Math.max(0, Math.ceil(this.boon.blue - this.time)), red: Math.max(0, Math.ceil(this.boon.red - this.time)) },
      over: this.over
    };
  }
}

export { BUILDS, SKILL_ORDER };
