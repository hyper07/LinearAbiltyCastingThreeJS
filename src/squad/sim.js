import { CLASSES, FOES, WAVES, BREAK, UPGRADES, MEDKIT, DIFFICULTY, REACTOR, HERO, SENTRY, HEAL_PAD, upgradeCost } from './rules.js';
import { REACTOR_AT, PAD, RIFTS, SPAWN, clear, way, crossesWall, inside } from './map.js';

/**
 * A game of Bastion Squad: four soldiers (people, or bots in empty seats),
 * the dead that come in waves, the reactor between them. No drawing and no
 * browser: `step(dt, orders)` moves everything on and records what happened
 * (`events`); `snapshot()` is what a screen needs. The host's browser runs
 * it (or the only player's); others send orders and draw the snapshots.
 *
 * Orders, by seat: { t: 'move'|'amove', x, z } · { t: 'attack', id } ·
 * { t: 'stop' } · { t: 'hold' } · { t: 'skill', n: 0–2, x, z, id } ·
 * { t: 'buy', key } · { t: 'medkit' }.
 */

const turnTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const facing = (dx, dz) => Math.atan2(dx, dz);

export class Game {
  /**
   * @param {{ seats: { cls: string, name: string, bot?: boolean }[], difficulty?: string, seed?: number }} options
   */
  constructor({ seats, difficulty = 'veteran', seed = 1 }) {
    this.diff = DIFFICULTY[difficulty] ?? DIFFICULTY.veteran;
    this.difficulty = difficulty;
    this.seed = seed >>> 0 || 1;
    this.t = 0;
    this.nextId = 1;
    this.events = [];
    this.people = seats.filter((s) => !s.bot).length || 1;
    this.heroes = seats.map((s, slot) => this._newHero(s, slot));
    this.foes = [];
    this.sentries = [];
    this.fields = [];
    this.mines = [];
    this.reactor = { hp: REACTOR.hp, max: REACTOR.hp };
    this.lives = this.diff.lives;
    this.wave = 0; // waves done
    this.phase = 'break';
    this.timer = BREAK.first;
    this.queue = [];
    this.over = null;
  }

  rand() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  _newHero(seat, slot) {
    const def = CLASSES[seat.cls] ?? CLASSES.rifleman;
    const [x, z] = SPAWN[slot % SPAWN.length];
    return {
      i: this.nextId++,
      slot,
      cls: seat.cls in CLASSES ? seat.cls : 'rifleman',
      name: seat.name,
      bot: Boolean(seat.bot),
      x,
      z,
      a: Math.PI,
      hp: def.hp,
      max: def.hp,
      level: 1,
      xp: 0,
      credits: 120,
      upg: Object.fromEntries(Object.keys(UPGRADES).map((k) => [k, 0])),
      medkits: 1,
      cd: [0, 0, 0],
      buffs: {},
      order: { t: 'stop' },
      path: [],
      cool: 0,
      act: 'idle',
      aa: 0,
      down: false,
      downAt: 0,
      respawnAt: null,
      lift: 0,
      kills: 0,
      healed: 0,
      think: 0
    };
  }

  /* ------------------------------------------------------------ helpers */

  get living() {
    return this.heroes.filter((h) => !h.down);
  }

  heroStat(h) {
    const def = CLASSES[h.cls];
    const lvl = 1 + HERO.level.growth * (h.level - 1);
    const lock = h.buffs.lockdown > this.t;
    return {
      dmg: def.gun.dmg * (1 + 0.12 * h.upg.damage) * lvl * (lock ? 1.5 : 1),
      rate: def.gun.rate * (1 + 0.08 * h.upg.rate) * (h.buffs.focus > this.t ? 1.5 : 1),
      range: def.gun.range,
      armor: def.armor + h.upg.armor + (lock ? 8 : 0),
      max: Math.round(def.hp * (1 + 0.12 * h.upg.vitality) * lvl),
      speed: lock ? 0 : def.speed * (h.buffs.sprint > this.t ? 1.6 : 1),
      power: 1 + 0.12 * h.upg.power,
      haste: 1 - 0.07 * h.upg.haste
    };
  }

  foeStat(f) {
    const def = FOES[f.kind];
    return { dmg: def.dmg * this.diff.dmg * (1 + 0.04 * this.wave), armor: def.armor };
  }

  _find(id) {
    return this.heroes.find((h) => h.i === id) ?? this.foes.find((f) => f.i === id) ?? this.sentries.find((s) => s.i === id) ?? null;
  }

  /** Walk a body towards (x, z) by up to `step` metres, sliding along what blocks it. */
  _walk(e, x, z, step, r = 0.5) {
    const dx = x - e.x;
    const dz = z - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) return 0;
    const k = Math.min(step, d) / d;
    const nx = e.x + dx * k;
    const nz = e.z + dz * k;
    const bx = e.x;
    const bz = e.z;
    if (clear(nx, nz, r)) {
      e.x = nx;
      e.z = nz;
    } else if (clear(nx, e.z, r)) e.x = nx;
    else if (clear(e.x, nz, r)) e.z = nz;
    e.a += turnTo(e.a, facing(dx, dz)) * 0.35;
    return Math.hypot(e.x - bx, e.z - bz);
  }

  /** Hurt a hero, a sentry or the reactor. */
  _harm(target, amount, from) {
    if (target === this.reactor) {
      this.reactor.hp = Math.max(0, this.reactor.hp - amount);
      return;
    }
    if (target.down || target.hp <= 0) return;
    const armor = target.slot != null ? this.heroStat(target).armor : 0;
    const dmg = Math.max(amount * 0.25, amount - armor);
    target.hp -= dmg;
    this.events.push({ t: 'hit', id: target.i, amount: Math.round(dmg) });
    if (target.hp > 0) return;
    if (target.slot != null) {
      Object.assign(target, { hp: 0, down: true, downAt: this.t, lift: 0, act: 'down', order: { t: 'stop' }, path: [] });
      target.respawnAt = this.lives > 0 ? this.t + HERO.respawn(this.wave) : null;
      this.events.push({ t: 'down', id: target.i, by: from?.i });
    } else {
      this.sentries = this.sentries.filter((s) => s !== target);
      this.events.push({ t: 'wreck', id: target.i });
    }
  }

  /** Hurt one of the dead; credits and experience to whoever did it. */
  _strike(f, amount, by, kind = 'shot') {
    if (f.hp <= 0) return;
    const dmg = Math.max(amount * 0.3, amount - this.foeStat(f).armor);
    f.hp -= dmg;
    this.events.push({ t: 'hurt', id: f.i, amount: Math.round(dmg), kind });
    if (f.hp > 0) return;
    const def = FOES[f.kind];
    this.foes = this.foes.filter((x) => x !== f);
    this.events.push({ t: 'kill', id: f.i, kind: f.kind, by: by?.i, x: f.x, z: f.z, boss: Boolean(def.boss) });
    const owner = by?.slot != null ? by : by?.owner != null ? this.heroes.find((h) => h.i === by.owner) : null;
    for (const h of this.heroes) {
      const mine = h === owner;
      h.credits += Math.round(def.bounty * (mine ? 1 : 0.3));
      if (!h.down && (mine || Math.hypot(h.x - f.x, h.z - f.z) < 22)) this._gain(h, def.xp * (mine ? 1 : 0.5));
    }
    if (owner) owner.kills++;
  }

  _gain(h, xp) {
    h.xp += xp;
    while (h.level < HERO.level.max && h.xp >= HERO.level.xp(h.level)) {
      h.xp -= HERO.level.xp(h.level);
      h.level++;
      const max = this.heroStat(h).max;
      h.hp = Math.min(max, h.hp + max * 0.3);
      h.max = max;
      this.events.push({ t: 'level', id: h.i, level: h.level });
    }
  }

  _heal(h, amount, by) {
    if (h.down || amount <= 0) return 0;
    const max = this.heroStat(h).max;
    const got = Math.min(amount, max - h.hp);
    h.hp += got;
    if (by && got > 0) by.healed = (by.healed ?? 0) + got;
    return got;
  }

  _blast(x, z, r, dmg, by, kind) {
    this.events.push({ t: 'blast', x, z, r, kind });
    for (const f of [...this.foes]) if (Math.hypot(f.x - x, f.z - z) < r + FOES[f.kind].size * 0.15) this._strike(f, dmg, by, kind);
  }

  /* ------------------------------------------------------------- orders */

  order(slot, o) {
    const h = this.heroes[slot];
    if (!h || this.over) return;
    if (o.t === 'buy') return this._buy(h, o.key);
    if (o.t === 'medkit') return this._medkit(h);
    if (h.down) return;
    if (o.t === 'skill') return this._skill(h, o.n, o);
    if (o.t === 'move' || o.t === 'amove') {
      h.order = { t: o.t, x: +o.x, z: +o.z };
      h.path = way(h.x, h.z, +o.x, +o.z);
    } else if (o.t === 'attack') {
      h.order = { t: 'attack', id: o.id };
      h.path = [];
    } else if (o.t === 'stop' || o.t === 'hold') {
      h.order = { t: o.t };
      h.path = [];
    }
  }

  _buy(h, key) {
    if (key === 'medkit') {
      if (h.medkits >= MEDKIT.carry || h.credits < MEDKIT.cost) return false;
      h.credits -= MEDKIT.cost;
      h.medkits++;
      return true;
    }
    const u = UPGRADES[key];
    if (!u || h.upg[key] >= u.max) return false;
    const cost = upgradeCost(key, h.upg[key]);
    if (h.credits < cost) return false;
    h.credits -= cost;
    h.upg[key]++;
    const max = this.heroStat(h).max;
    if (key === 'vitality') h.hp += max - h.max;
    h.max = max;
    this.events.push({ t: 'bought', id: h.i, key });
    return true;
  }

  _medkit(h) {
    if (h.down || h.medkits <= 0 || h.hp >= h.max) return;
    h.medkits--;
    this._heal(h, h.max * MEDKIT.heal, h);
    this.events.push({ t: 'heal', id: h.i, x: h.x, z: h.z, kind: 'medkit' });
  }

  _skill(h, n, o) {
    const def = CLASSES[h.cls].skills[n];
    if (!def || h.cd[n] > this.t) return false;
    const st = this.heroStat(h);
    const reach = (x, z) => {
      const d = Math.hypot(x - h.x, z - h.z);
      const k = def.range && d > def.range ? def.range / d : 1;
      return [h.x + (x - h.x) * k, h.z + (z - h.z) * k];
    };
    const [tx, tz] = def.target === 'ground' ? reach(+o.x || h.x, +o.z || h.z) : [h.x, h.z];
    let used = true;
    switch (def.id) {
      case 'focus':
        h.buffs.focus = this.t + 6;
        break;
      case 'sprint':
        h.buffs.sprint = this.t + 4;
        break;
      case 'lockdown':
        h.buffs.lockdown = this.t + 6;
        h.path = [];
        break;
      case 'frag':
        this._blast(tx, tz, def.radius, def.power * st.power, h, 'frag');
        break;
      case 'rocket': {
        // Down the line to the first of the dead it meets, or to its end.
        const dx = tx - h.x;
        const dz = tz - h.z;
        const len = Math.hypot(dx, dz) || 1;
        let at = [tx, tz];
        for (let s = 1; s < len; s += 0.5) {
          const px = h.x + (dx / len) * s;
          const pz = h.z + (dz / len) * s;
          if (this.foes.some((f) => Math.hypot(f.x - px, f.z - pz) < 0.6 + FOES[f.kind].size * 0.15)) {
            at = [px, pz];
            break;
          }
        }
        this.events.push({ t: 'rocket', id: h.i, x: at[0], z: at[1] });
        this._blast(at[0], at[1], def.radius, def.power * st.power, h, 'rocket');
        break;
      }
      case 'taunt':
        for (const f of this.foes) if (Math.hypot(f.x - h.x, f.z - h.z) < def.radius) Object.assign(f, { taunt: h.i, tauntUntil: this.t + 4, target: h.i });
        this.events.push({ t: 'taunt', id: h.i, r: def.radius });
        break;
      case 'mend': {
        const ally = (o.id && this.heroes.find((x) => x.i === o.id && !x.down && Math.hypot(x.x - h.x, x.z - h.z) <= def.range)) || h;
        this._heal(ally, def.power * st.power, h);
        this.events.push({ t: 'heal', id: ally.i, by: h.i, x: ally.x, z: ally.z, kind: 'mend' });
        break;
      }
      case 'field':
        this.fields.push({ i: this.nextId++, x: tx, z: tz, r: def.radius, heal: def.power * st.power, until: this.t + 7, owner: h.i });
        break;
      case 'revive': {
        const lifted = this.heroes.filter((x) => x.down && Math.hypot(x.x - h.x, x.z - h.z) < def.radius);
        for (const x of lifted) this._lift(x, 0.5);
        this.events.push({ t: 'pulse', id: h.i, r: def.radius });
        used = true;
        break;
      }
      case 'turret': {
        if (!clear(tx, tz, 0.8)) return false;
        const mine = this.sentries.filter((s) => s.owner === h.i);
        if (mine.length >= SENTRY.max) this.sentries = this.sentries.filter((s) => s !== mine[0]);
        this.sentries.push({ i: this.nextId++, owner: h.i, x: tx, z: tz, a: h.a, hp: SENTRY.hp * st.power, max: SENTRY.hp * st.power, until: this.t + SENTRY.life, cool: 0, aa: 0 });
        this.events.push({ t: 'build', id: h.i, x: tx, z: tz });
        break;
      }
      case 'mines':
        for (let k = 0; k < 3; k++) {
          const ang = (k / 3) * Math.PI * 2 + this.rand();
          this.mines.push({ i: this.nextId++, x: tx + Math.cos(ang) * 1.8, z: tz + Math.sin(ang) * 1.8, owner: h.i, power: def.power * st.power, r: def.radius, arm: this.t + 0.8 });
        }
        break;
      case 'repair': {
        const amount = def.power * st.power;
        if (Math.hypot(REACTOR_AT.x - h.x, REACTOR_AT.z - h.z) < def.radius + REACTOR_AT.r) this.reactor.hp = Math.min(this.reactor.max, this.reactor.hp + amount);
        for (const s of this.sentries) if (Math.hypot(s.x - h.x, s.z - h.z) < def.radius) s.hp = Math.min(s.max, s.hp + amount);
        for (const x of this.heroes) if (Math.hypot(x.x - h.x, x.z - h.z) < def.radius) this._heal(x, amount * 0.3, h);
        this.events.push({ t: 'repair', id: h.i, r: def.radius });
        break;
      }
      default:
        used = false;
    }
    if (!used) return false;
    h.cd[n] = this.t + def.cd * st.haste;
    h.act = 'cast';
    h.aa++;
    this.events.push({ t: 'skill', id: h.i, n, skill: def.id, x: tx, z: tz });
    return true;
  }

  _lift(h, share) {
    if (!h.down) return;
    const max = this.heroStat(h).max;
    Object.assign(h, { down: false, hp: max * share, max, lift: 0, respawnAt: null, act: 'idle' });
    this.events.push({ t: 'lift', id: h.i });
  }

  /* --------------------------------------------------------------- step */

  step(dt, orders = new Map()) {
    this.events = [];
    if (this.over) return this.events;
    this.t += dt;
    for (const [slot, list] of orders) for (const o of list) this.order(slot, o);
    this._waves(dt);
    for (const h of this.heroes) {
      if (h.bot) this._bot(h, dt);
      this._hero(h, dt);
    }
    for (const s of this.sentries) this._sentry(s, dt);
    this.sentries = this.sentries.filter((s) => s.until > this.t);
    for (const f of [...this.foes]) this._foe(f, dt);
    this._crowd();
    this._ground(dt);
    this._judge();
    return this.events;
  }

  _waves(dt) {
    if (this.phase === 'break') {
      this.timer -= dt;
      if (this.timer <= 0) this._startWave();
      return;
    }
    // Feed the wave in: one of the dead every so often from each open rift, bosses last.
    this.spawnCool = (this.spawnCool ?? 0) - dt;
    if (this.queue.length && this.spawnCool <= 0 && this.foes.length < 150) {
      const next = this.queue.shift();
      this._spawn(next.kind, next.rift);
      this.spawnCool = FOES[next.kind].boss ? 0 : Math.max(0.12, 0.5 - this.wave * 0.02) / this.openRifts().length;
    }
    if (!this.queue.length && !this.foes.length) {
      this.wave++;
      const bonus = 60 + this.wave * 20;
      for (const h of this.heroes) h.credits += bonus;
      if (WAVES[this.wave - 1] && Object.keys(WAVES[this.wave - 1]).some((k) => FOES[k].boss)) this.lives++;
      this.events.push({ t: 'cleared', wave: this.wave, bonus });
      if (this.wave >= WAVES.length) {
        this.over = { won: true, wave: this.wave };
        this.events.push({ t: 'over', won: true });
        return;
      }
      this.phase = 'break';
      this.timer = BREAK.between;
    }
  }

  openRifts() {
    return RIFTS.filter((r) => this.wave + 1 >= r.from);
  }

  _startWave() {
    const plan = WAVES[this.wave];
    const more = 1 + 0.25 * (this.people - 1);
    const rifts = this.openRifts();
    const list = [];
    const bosses = [];
    for (const [kind, n] of Object.entries(plan)) {
      const count = FOES[kind].boss ? n : Math.round(n * more);
      for (let k = 0; k < count; k++) (FOES[kind].boss ? bosses : list).push(kind);
    }
    // Mixed, not in blocks; the bosses at the end.
    for (let k = list.length - 1; k > 0; k--) {
      const j = Math.floor(this.rand() * (k + 1));
      [list[k], list[j]] = [list[j], list[k]];
    }
    this.queue = [...list, ...bosses].map((kind, k) => ({ kind, rift: rifts[k % rifts.length] }));
    this.phase = 'wave';
    this.spawnCool = 0;
    this.events.push({ t: 'wave', wave: this.wave + 1, boss: bosses[0] ?? null });
  }

  _spawn(kind, rift, at = null) {
    const def = FOES[kind];
    const hp = def.hp * this.diff.hp * (1 + 0.3 * (this.people - 1)) * (1 + 0.06 * this.wave);
    const [x, z] = at ?? [rift.x + (this.rand() - 0.5) * 4, rift.z + (this.rand() - 0.5) * 4];
    const f = { i: this.nextId++, kind, x, z, a: 0, hp, max: hp, path: rift ? rift.path.slice(1) : [], target: null, cool: 0, act: 'rise', aa: 0, rise: this.t + 1.2, slamAt: this.t + (def.slam?.every ?? 0), summonAt: this.t + (def.summon?.every ?? 0) };
    this.foes.push(f);
    if (def.boss) this.events.push({ t: 'boss', id: f.i, kind });
    return f;
  }

  /* -------------------------------------------------------------- heroes */

  _hero(h, dt) {
    const st = this.heroStat(h);
    h.max = st.max;
    if (h.down) {
      // Waiting: a life brings them back at the reactor; or a teammate lifts them.
      if (h.respawnAt != null && this.t >= h.respawnAt && this.lives > 0) {
        this.lives--;
        const [x, z] = SPAWN[h.slot % SPAWN.length];
        Object.assign(h, { x, z, down: false, hp: st.max, respawnAt: null, act: 'idle', lift: 0 });
        this.events.push({ t: 'respawn', id: h.i });
      } else if (h.respawnAt == null && this.lives > 0) h.respawnAt = this.t + HERO.respawn(this.wave);
      const helper = this.heroes.find((o) => !o.down && o !== h && Math.hypot(o.x - h.x, o.z - h.z) < 2.2 && !o.moving);
      h.lift = helper ? h.lift + dt : Math.max(0, h.lift - dt);
      if (h.lift >= HERO.liftTime) this._lift(h, 0.4);
      return;
    }
    h.cool -= dt;
    // The pad in the compound heals whoever stands on it.
    if (Math.hypot(h.x - PAD.x, h.z - PAD.z) < 4) this._heal(h, 30 * dt);
    // Where to go: along the path of a move, or after the target of an attack.
    let target = null;
    if (h.order.t === 'attack') {
      target = this.foes.find((f) => f.i === h.order.id) ?? null;
      if (!target) h.order = { t: 'stop' };
    }
    const enemyInRange = () => this._nearestFoe(h.x, h.z, st.range);
    let moving = false;
    if (h.order.t === 'move' || (h.order.t === 'amove' && !enemyInRange())) {
      moving = this._follow(h, st.speed * dt);
      if (!h.path.length) h.order = { t: 'stop' };
    } else if (target && Math.hypot(target.x - h.x, target.z - h.z) > st.range) {
      if (!h.chase || this.t > h.chase) {
        h.path = way(h.x, h.z, target.x, target.z);
        h.chase = this.t + 0.5;
      }
      moving = this._follow(h, st.speed * dt);
    }
    h.moving = moving;
    // Shooting: never while moving; at the target, or else whatever is nearest within reach.
    if (!moving && !h.down) {
      const aim = target && Math.hypot(target.x - h.x, target.z - h.z) <= st.range ? target : h.order.t === 'move' ? null : enemyInRange();
      if (aim) {
        h.a += turnTo(h.a, facing(aim.x - h.x, aim.z - h.z)) * Math.min(1, dt * 14);
        if (h.cool <= 0) {
          h.cool = 1 / st.rate;
          h.act = 'shoot';
          h.aa++;
          this.events.push({ t: 'shot', id: h.i, to: aim.i });
          this._strike(aim, st.dmg, h);
        }
      } else if (CLASSES[h.cls].aura && h.cool <= -0.3) {
        // A Medic not shooting tends to the most hurt within reach.
        const aura = CLASSES[h.cls].aura;
        const hurt = this.heroes.filter((o) => !o.down && o.hp < this.heroStat(o).max && Math.hypot(o.x - h.x, o.z - h.z) < aura.range).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
        if (hurt && this._heal(hurt, aura.heal * st.power * dt, h) > 0) {
          h.act = 'heal';
          if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) this.events.push({ t: 'tend', id: h.i, to: hurt.i });
        } else h.act = 'idle';
      } else if (h.cool < -0.3) h.act = 'idle';
    } else h.act = moving ? 'run' : h.act;
  }

  _follow(h, step) {
    if (!h.path.length || step <= 0) return false;
    const [x, z] = h.path[0];
    const moved = this._walk(h, x, z, step, 0.5);
    if (Math.hypot(h.x - x, h.z - z) < 0.4) h.path.shift();
    // Stuck on something: give up the order.
    h.stuck = moved < step * 0.2 ? (h.stuck ?? 0) + 1 : 0;
    if (h.stuck > 20) {
      h.path = [];
      h.stuck = 0;
    }
    h.act = 'run';
    return moved > 0.001;
  }

  _nearestFoe(x, z, range) {
    let best = null;
    let bestD = range;
    for (const f of this.foes) {
      if (f.rise > this.t) continue;
      const d = Math.hypot(f.x - x, f.z - z) - FOES[f.kind].size * 0.12;
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  _sentry(s, dt) {
    s.cool -= dt;
    const aim = this._nearestFoe(s.x, s.z, SENTRY.gun.range);
    if (!aim) return;
    s.a += turnTo(s.a, facing(aim.x - s.x, aim.z - s.z)) * Math.min(1, dt * 10);
    if (s.cool > 0) return;
    s.cool = 1 / SENTRY.gun.rate;
    s.aa++;
    this.events.push({ t: 'shot', id: s.i, to: aim.i, sentry: true });
    this._strike(aim, SENTRY.gun.dmg * (1 + 0.04 * this.wave), s);
  }

  /* ---------------------------------------------------------------- the dead */

  _foe(f, dt) {
    const def = FOES[f.kind];
    if (f.rise > this.t) return;
    f.cool -= dt;
    // Who to go for: a taunter; else a soldier or sentry close by; else the reactor along their road.
    if (f.taunt && f.tauntUntil > this.t) f.target = f.taunt;
    else if (!f.think || this.t > f.think) {
      f.think = this.t + 0.5;
      const aggro = def.ranged ? 13 : 10;
      let best = null;
      let bestD = aggro;
      for (const t of [...this.living, ...this.sentries]) {
        const d = Math.hypot(t.x - f.x, t.z - f.z);
        if (d < bestD && (d < 4 || !crossesWall(f.x, f.z, t.x, t.z))) {
          best = t;
          bestD = d;
        }
      }
      f.target = best?.i ?? null;
    }
    const target = f.target ? this.heroes.find((h) => h.i === f.target && !h.down) ?? this.sentries.find((s) => s.i === f.target) : null;
    const speed = def.speed * (def.boss ? 1 : 1) * dt;
    const reach = def.range + (target ? 0.5 : REACTOR_AT.r);
    const [gx, gz] = target ? [target.x, target.z] : f.path.length ? f.path[0] : [REACTOR_AT.x, REACTOR_AT.z];
    const dist = Math.hypot(gx - f.x, gz - f.z);
    // Bosses: a slam that throws back everything round them, and the dead they call up.
    if (def.slam && this.t >= f.slamAt) {
      f.slamAt = this.t + def.slam.every;
      const near = this.living.filter((h) => Math.hypot(h.x - f.x, h.z - f.z) < def.slam.radius);
      if (near.length) {
        this.events.push({ t: 'slam', id: f.i, x: f.x, z: f.z, r: def.slam.radius });
        for (const h of near) this._harm(h, def.slam.dmg * this.diff.dmg, f);
        f.act = 'slam';
        f.aa++;
      }
    }
    if (def.summon && this.t >= f.summonAt) {
      f.summonAt = this.t + def.summon.every;
      for (let k = 0; k < def.summon.count; k++) this._spawn(def.summon.kind, null, [f.x + (this.rand() - 0.5) * 6, f.z + (this.rand() - 0.5) * 6]).path = [];
      this.events.push({ t: 'summon', id: f.i });
      f.act = 'summon';
      f.aa++;
    }
    if (!target && !f.path.length && Math.hypot(REACTOR_AT.x - f.x, REACTOR_AT.z - f.z) <= reach + 0.3) return this._swing(f, this.reactor, REACTOR_AT);
    if (target && dist <= reach) return this._swing(f, target, target);
    if (!target && f.path.length && dist < 1) {
      f.path.shift();
      return;
    }
    // Walking: round walls by the gates whenever one is in the way.
    if (crossesWall(f.x, f.z, gx, gz)) {
      if (!f.detour?.length || this.t > f.detourAt) {
        f.detour = way(f.x, f.z, gx, gz);
        f.detourAt = this.t + 1;
      }
      const [dx, dz] = f.detour[0];
      this._walk(f, dx, dz, speed, 0.4 + def.size * 0.08);
      if (Math.hypot(f.x - dx, f.z - dz) < 0.6) f.detour.shift();
    } else this._walk(f, gx, gz, speed, 0.4 + def.size * 0.08);
    f.act = 'walk';
    // Not getting anywhere for two seconds (caught on a rock, pressed in a crowd): skip to the next
    // place on the road, or step aside.
    const moved = Math.hypot(f.x - (f.wasX ?? f.x), f.z - (f.wasZ ?? f.z));
    f.stuck = moved < speed * 0.15 ? (f.stuck ?? 0) + dt : 0;
    f.wasX = f.x;
    f.wasZ = f.z;
    if (f.stuck > 2) {
      f.stuck = 0;
      if (!target && f.path.length) f.path.shift();
      else {
        const ang = this.rand() * Math.PI * 2;
        if (clear(f.x + Math.cos(ang) * 1.5, f.z + Math.sin(ang) * 1.5, 0.4)) {
          f.x += Math.cos(ang) * 1.5;
          f.z += Math.sin(ang) * 1.5;
        }
      }
      f.detour = null;
    }
  }

  _swing(f, target, at) {
    const def = FOES[f.kind];
    f.a += turnTo(f.a, facing(at.x - f.x, at.z - f.z)) * 0.4;
    if (f.cool > 0) {
      if (f.act === 'walk') f.act = 'idle';
      return;
    }
    f.cool = 1 / def.rate;
    f.act = 'attack';
    f.aa++;
    if (def.ranged) this.events.push({ t: 'bolt', id: f.i, to: target === this.reactor ? 'reactor' : target.i });
    this._harm(target, this.foeStat(f).dmg, f);
  }

  /** The dead keep a little apart, so a crowd reads as a crowd. */
  _crowd() {
    const list = this.foes;
    for (let a = 0; a < list.length; a++) {
      const p = list[a];
      if (p.rise > this.t) continue;
      const pr = 0.35 + FOES[p.kind].size * 0.12;
      for (let b = a + 1; b < list.length; b++) {
        const q = list[b];
        const dx = q.x - p.x;
        const dz = q.z - p.z;
        if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue;
        const min = pr + 0.35 + FOES[q.kind].size * 0.12;
        const d = Math.hypot(dx, dz);
        if (d >= min || d < 1e-4) continue;
        const push = (min - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        if (clear(p.x - nx * push, p.z - nz * push, 0.3)) {
          p.x -= nx * push;
          p.z -= nz * push;
        }
        if (clear(q.x + nx * push, q.z + nz * push, 0.3)) {
          q.x += nx * push;
          q.z += nz * push;
        }
      }
    }
  }

  /** Healing fields and mines. */
  _ground(dt) {
    this.fields = this.fields.filter((f) => f.until > this.t);
    for (const f of this.fields) {
      const by = this.heroes.find((h) => h.i === f.owner);
      for (const h of this.heroes) if (Math.hypot(h.x - f.x, h.z - f.z) < f.r) this._heal(h, f.heal * dt, by);
    }
    for (const m of [...this.mines]) {
      if (m.arm > this.t) continue;
      if (this.foes.some((f) => f.rise <= this.t && Math.hypot(f.x - m.x, f.z - m.z) < 1.6)) {
        this.mines = this.mines.filter((x) => x !== m);
        this._blast(m.x, m.z, m.r, m.power, { owner: m.owner }, 'mine');
      }
    }
  }

  _judge() {
    if (this.reactor.hp <= 0) {
      this.over = { won: false, wave: this.wave, why: 'reactor' };
      this.events.push({ t: 'over', won: false, why: 'reactor' });
    } else if (!this.living.length && this.lives <= 0) {
      this.over = { won: false, wave: this.wave, why: 'squad' };
      this.events.push({ t: 'over', won: false, why: 'squad' });
    }
  }

  /* ---------------------------------------------------------------- bots */

  /** A bot soldier: hold its gate in a wave, heal and shop in the quiet, lift the fallen, use its skills sensibly. */
  _bot(h, dt) {
    if (h.down || this.t < h.think) return;
    h.think = this.t + 0.4;
    const st = this.heroStat(h);
    const skills = CLASSES[h.cls].skills;
    const ready = (n) => h.cd[n] <= this.t;
    const near = (r) => this.foes.filter((f) => f.rise <= this.t && Math.hypot(f.x - h.x, f.z - h.z) < r);
    const cluster = (r, min) => {
      for (const f of near(skills[1]?.range ?? 14)) if (this.foes.filter((g) => Math.hypot(g.x - f.x, g.z - f.z) < r).length >= min) return f;
      return null;
    };
    if (h.hp < h.max * 0.3 && h.medkits) this._medkit(h);
    // A fallen teammate close by and no swarm on top of them: go and lift them.
    const fallen = this.heroes.find((o) => o.down && Math.hypot(o.x - h.x, o.z - h.z) < 18 && near(6).length < 4);
    if (fallen) {
      if (h.cls === 'medic' && ready(2) && Math.hypot(fallen.x - h.x, fallen.z - h.z) < 10) return this._skill(h, 2, {});
      if (Math.hypot(fallen.x - h.x, fallen.z - h.z) > 1.5) this.order(h.slot, { t: 'move', x: fallen.x, z: fallen.z + 1 });
      else h.order = { t: 'hold' };
      return;
    }
    // Skills.
    switch (h.cls) {
      case 'medic': {
        const hurt = this.living.filter((o) => o.hp < o.max * 0.55 && Math.hypot(o.x - h.x, o.z - h.z) < 12).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
        if (hurt && ready(0)) this._skill(h, 0, { id: hurt.i });
        const group = this.living.filter((o) => o.hp < o.max * 0.8 && Math.hypot(o.x - h.x, o.z - h.z) < 10);
        if (group.length >= 2 && ready(1)) this._skill(h, 1, { x: group[0].x, z: group[0].z });
        break;
      }
      case 'rifleman': {
        const c = cluster(4.5, 4);
        if (c && ready(1)) this._skill(h, 1, { x: c.x, z: c.z });
        if (near(st.range).length >= 6 && ready(0)) this._skill(h, 0, {});
        break;
      }
      case 'gunner': {
        if (near(10).length >= 6 && ready(0)) this._skill(h, 0, {});
        const c = cluster(3.5, 4);
        if (c && ready(1)) this._skill(h, 1, { x: c.x, z: c.z });
        const weak = this.living.find((o) => o !== h && o.hp < o.max * 0.35 && near(30).some((f) => f.target === o.i));
        if (weak && ready(2)) this._skill(h, 2, {});
        break;
      }
      case 'engineer': {
        const gate = this._post(h);
        if (this.phase === 'wave' && ready(0) && this.sentries.filter((s) => s.owner === h.i).length < SENTRY.max) this._skill(h, 0, { x: gate[0] + (this.rand() - 0.5) * 3, z: gate[1] + (this.rand() - 0.5) * 3 });
        const c = cluster(3, 3);
        if (c && ready(1)) this._skill(h, 1, { x: c.x, z: c.z });
        if (ready(2) && (this.reactor.hp < this.reactor.max * 0.7 || this.sentries.some((s) => s.hp < s.max * 0.5)) && Math.hypot(REACTOR_AT.x - h.x, REACTOR_AT.z - h.z) < 14) this._skill(h, 2, {});
        break;
      }
      default:
    }
    // Where to stand.
    if (this.phase === 'break') {
      // Shop: what makes the most difference, in order.
      for (const key of ['damage', 'vitality', 'armor', 'rate', 'power', 'damage', 'haste', 'vitality']) this._buy(h, key);
      if (h.medkits < 2) this._buy(h, 'medkit');
      const [px, pz] = h.hp < h.max * 0.95 ? [PAD.x + (h.slot - 1.5) * 1.2, PAD.z] : this._post(h);
      if (Math.hypot(px - h.x, pz - h.z) > 1.5 && h.order.t === 'stop') this.order(h.slot, { t: 'move', x: px, z: pz });
      return;
    }
    // In a wave: hold the post; if the dead are inside the compound, go to the reactor.
    const breach = this.foes.find((f) => inside(f.x, f.z) && Math.hypot(f.x - REACTOR_AT.x, f.z - REACTOR_AT.z) < 18);
    const [px, pz] = breach ? [breach.x, breach.z] : this._post(h);
    const d = Math.hypot(px - h.x, pz - h.z);
    if (d > (breach ? st.range * 0.8 : 3) && !near(st.range).length) this.order(h.slot, { t: 'amove', x: px, z: pz });
    else if (h.order.t === 'move') h.order = { t: 'amove', x: px, z: pz };
  }

  /** A bot's post: just inside one of the gates the dead come to, a different one for each. */
  _post(h) {
    const inner = { north: [70, 54], east: [86, 70], west: [54, 70], southeast: [70, 86] };
    const open = this.openRifts();
    return inner[open[h.slot % open.length].id];
  }

  /* ---------------------------------------------------------- the picture */

  snapshot() {
    const r1 = (v) => Math.round(v * 100) / 100;
    return {
      t: r1(this.t),
      phase: this.phase,
      wave: this.wave,
      waves: WAVES.length,
      timer: r1(this.timer),
      left: this.queue.length + this.foes.length,
      lives: this.lives,
      reactor: { hp: Math.round(this.reactor.hp), max: this.reactor.max },
      over: this.over,
      difficulty: this.difficulty,
      heroes: this.heroes.map((h) => ({ i: h.i, slot: h.slot, cls: h.cls, name: h.name, bot: h.bot, hp: Math.round(h.hp), max: Math.round(h.max), level: h.level, xp: Math.round(h.xp), next: HERO.level.xp(h.level), credits: h.credits, upg: h.upg, medkits: h.medkits, cd: h.cd.map((c) => r1(Math.max(0, c - this.t))), down: h.down, lift: r1(h.lift), respawn: h.respawnAt != null ? r1(Math.max(0, h.respawnAt - this.t)) : null, kills: h.kills, healed: Math.round(h.healed ?? 0), buffs: Object.fromEntries(Object.entries(h.buffs).filter(([, v]) => v > this.t).map(([k, v]) => [k, r1(v - this.t)])) })),
      ents: [
        ...this.heroes.map((h) => ({ i: h.i, k: 'hero', slot: h.slot, cls: h.cls, x: r1(h.x), z: r1(h.z), a: r1(h.a), act: h.down ? 'down' : h.act, aa: h.aa, hp: Math.round(h.hp), max: Math.round(h.max) })),
        ...this.foes.map((f) => ({ i: f.i, k: 'foe', kind: f.kind, x: r1(f.x), z: r1(f.z), a: r1(f.a), act: f.rise > this.t ? 'rise' : f.act, aa: f.aa, hp: Math.round(f.hp), max: Math.round(f.max) })),
        ...this.sentries.map((s) => ({ i: s.i, k: 'sentry', owner: s.owner, x: r1(s.x), z: r1(s.z), a: r1(s.a), aa: s.aa, hp: Math.round(s.hp), max: Math.round(s.max), left: r1(s.until - this.t) }))
      ],
      fields: this.fields.map((f) => ({ i: f.i, x: r1(f.x), z: r1(f.z), r: f.r, left: r1(f.until - this.t) })),
      mines: this.mines.map((m) => ({ i: m.i, x: r1(m.x), z: r1(m.z) }))
    };
  }
}
