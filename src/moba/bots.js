import { CHAMPIONS, ITEMS, BUILDS, SKILL_ORDER, DIFFICULTIES, TICK, MINIONS } from './rules.js';
import { BASES, LANES, laneT, lanePoint, CAMP_SPOTS } from './map.js';

/**
 * A bot: plays a champion's seat when no person does. It sends the same
 * commands a person's clicks send. Every so often (by difficulty) it looks
 * around and picks one thing to do:
 *
 *   dead or at home   buy the next item of its build, spend skill points
 *   hurt              walk home, heal, recall when nobody is near
 *   a fight it wins   abilities and attacks on the weakest enemy in reach
 *   in lane           stay behind its minions, last-hit, poke, push towers
 *   jungle            clear its camps, go where an enemy is weak
 *   late (14 min+)    everyone groups and pushes mid
 */

const ENEMY = { blue: 'red', red: 'blue' };

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Bot {
  constructor(sim, champ) {
    this.sim = sim;
    this.c = champ;
    this.d = DIFFICULTIES[champ.bot] ?? DIFFICULTIES.normal;
    this.every = Math.max(1, Math.round(this.d.think / TICK));
    this.rand = seeded((sim.seed ?? 1) * 31 + champ.slot * 977);
    this.def = CHAMPIONS[champ.champ];
    this.build = BUILDS[this.def.role];
    this.lane = champ.lane;
    this.camp = 0;
    this.lastMove = null;
  }

  update() {
    const sim = this.sim;
    const c = this.c;
    if ((sim.tick + c.slot * 3) % this.every !== 0) return;
    this._levelUp();
    if (c.respawnAt) {
      this._shop();
      return;
    }
    if (sim.inShop(c)) this._shop();
    if (c.dash) return;

    const enemies = this._enemyChamps(16);
    const hp = c.hp / c.maxHp;
    const late = sim.time > 14 * 60;
    const home = BASES[c.team].fountain;
    const atHome = Math.hypot(c.x - home[0], c.z - home[1]) < 12;

    // Healing up at home: wait until nearly full.
    if (atHome && (hp < 0.9 || c.mana < c.maxMana * 0.6)) {
      this._idle();
      return;
    }
    if (c.recall) {
      if (enemies.some((e) => sim.gap(c, e) < 10)) this._go(home[0], home[1]);
      return;
    }
    // Hurt: get out.
    const danger = enemies.length >= 2 && hp < 0.45;
    if (hp < 0.28 / this.d.bravery || danger) {
      this._retreat(enemies, hp);
      return;
    }
    if (c.mana < c.maxMana * 0.12 && !enemies.length && c.gold > 600) {
      this._recallOrWalk(enemies);
      return;
    }
    // Spend a full purse at home.
    if (c.gold >= this._nextCost() + 250 && !enemies.length && hp < 0.75 && !late) {
      this._recallOrWalk(enemies);
      return;
    }

    // A fight worth taking?
    const target = this._pickFight(enemies);
    if (target) {
      this._fightChamp(target, enemies);
      return;
    }
    // The jungler helps mid until the camps are worth it (and goes home to heal before a camp).
    if (this.lane === 'jungle' && !late && sim.time > 70) {
      if (hp < 0.5) {
        this._recallOrWalk(enemies);
        return;
      }
      this._jungle();
      return;
    }
    if (this.lane === 'jungle' && !late) {
      this._laning('mid');
      return;
    }
    this._laning(late ? 'mid' : this.lane);
  }

  /* ---------------------------------------------------------- spending */

  _levelUp() {
    const c = this.c;
    if (c.points <= 0) return;
    // R when it can, then the order for this level, then whatever is left (one point a look).
    const want = [3, SKILL_ORDER[Math.min(SKILL_ORDER.length - 1, c.level - 1)], 0, 1, 2];
    const i = want.find((k) => c.ranks[k] < this.sim.maxRank(c, k));
    if (i != null) this.sim.command(c.slot, { type: 'rank', slot: i });
  }

  _nextCost() {
    const id = this.build[this.c.items.length];
    return id ? ITEMS[id].cost : Infinity;
  }

  _shop() {
    const c = this.c;
    const id = this.build[c.items.length];
    if (id && c.gold >= ITEMS[id].cost) this.sim.command(c.slot, { type: 'buy', item: id });
  }

  /* ------------------------------------------------------------ moving */

  _go(x, z, attack = false) {
    // Don't re-path to almost the same place every think.
    const last = this.lastMove;
    if (last && last.attack === attack && Math.hypot(last.x - x, last.z - z) < 2.5 && this.sim.tick - last.at < 40 && this.c.order.type !== 'idle') return;
    this.lastMove = { x, z, attack, at: this.sim.tick };
    this.sim.command(this.c.slot, { type: attack ? 'amove' : 'move', x, z });
  }

  _idle() {
    if (this.c.order.type !== 'idle') this.sim.command(this.c.slot, { type: 'stop' });
  }

  _retreat(enemies, hp) {
    const c = this.c;
    const sim = this.sim;
    const home = BASES[c.team].fountain;
    if (hp < 0.25 && c.mendAt <= sim.time) sim.command(c.slot, { type: 'mend' });
    const close = enemies.find((e) => sim.gap(c, e) < 5);
    if (close && hp < 0.2 && c.blinkAt <= sim.time) {
      const dx = home[0] - c.x;
      const dz = home[1] - c.z;
      const l = Math.hypot(dx, dz) || 1;
      sim.command(c.slot, { type: 'blink', x: c.x + (dx / l) * 8, z: c.z + (dz / l) * 8 });
      return;
    }
    // An escape ability (a blink or a dash with nothing to hit) toward home.
    if (close) {
      const i = this.def.abilities.findIndex((a, k) => (a.kind === 'blink' || (a.kind === 'dash' && !a.damage)) && this._ready(k));
      if (i >= 0) {
        const dx = home[0] - c.x;
        const dz = home[1] - c.z;
        const l = Math.hypot(dx, dz) || 1;
        sim.command(c.slot, { type: 'cast', slot: i, x: c.x + (dx / l) * 8, z: c.z + (dz / l) * 8 });
        return;
      }
    }
    this._recallOrWalk(enemies);
  }

  _recallOrWalk(enemies) {
    const c = this.c;
    const near = enemies.some((e) => this.sim.gap(c, e) < 14);
    const minionsNear = [...this.sim.entities.values()].some((e) => !e.dead && ((e.type === 'minion' && e.team !== c.team && this.sim.gap(c, e) < 9) || (e.type === 'camp' && e.aggro === c.id)));
    // Anything hitting us breaks a recall: walk until it stops.
    if (!near && !minionsNear && this.sim.time - c.lastHurt > 3) {
      this.sim.command(c.slot, { type: 'recall' });
      return;
    }
    const home = BASES[c.team].fountain;
    this._go(home[0], home[1]);
  }

  /* ------------------------------------------------------------ seeing */

  _enemyChamps(r) {
    const sim = this.sim;
    const c = this.c;
    return sim.seats.filter((e) => e.team !== c.team && !e.respawnAt && sim.visibleTo(c.team, e) && sim.gap(c, e) < r);
  }

  _allyChamps(r) {
    const sim = this.sim;
    const c = this.c;
    return sim.seats.filter((e) => e.team === c.team && !e.respawnAt && e !== c && sim.gap(c, e) < r);
  }

  /** Whether a point is under an enemy tower that still stands. */
  _underEnemyTower(x, z, pad = 0) {
    for (const t of this.sim.entities.values()) {
      if (t.type !== 'tower' || t.dead || t.team === this.c.team || t.tier === 'core') continue;
      if (Math.hypot(t.x - x, t.z - z) < 12 + t.radius + pad) return t;
    }
    return null;
  }

  /* ------------------------------------------------------------ fighting */

  /** The enemy champion to fight now, or null when it's not worth it. */
  _pickFight(enemies) {
    if (!enemies.length) return null;
    const c = this.c;
    const sim = this.sim;
    const allies = this._allyChamps(16);
    const mine = (c.hp / c.maxHp) * (1 + allies.length * 0.8) * (0.6 + c.level * 0.05) * this.d.bravery;
    let best = null;
    let bestScore = Infinity;
    let theirs = 0;
    for (const e of enemies) {
      theirs += (e.hp / e.maxHp) * (0.6 + e.level * 0.05);
      const score = e.hp + sim.gap(c, e) * 15;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (!best) return null;
    const towered = this._underEnemyTower(best.x, best.z, 1);
    // Not under their tower — unless it's a sure kill.
    if (towered && !(best.hp < c.stats.ad * 3 && c.hp > c.maxHp * 0.6)) return null;
    if (mine >= theirs * 0.95) return best;
    // Losing on paper: still poke from range when it's safe.
    if (best.hp / best.maxHp < 0.3 && c.hp / c.maxHp > 0.5) return best;
    return null;
  }

  _fightChamp(t, enemies) {
    if (this._useAbilities(t, enemies)) return;
    this.sim.command(this.c.slot, { type: 'attack', target: t.id });
  }

  _ready(i) {
    const c = this.c;
    const ab = this.def.abilities[i];
    return c.ranks[i] > 0 && c.cds[i] <= 0 && c.mana >= ab.cost;
  }

  /** Use one ability on (or for) the fight; true if one was used. */
  _useAbilities(t, enemies) {
    const c = this.c;
    const sim = this.sim;
    if (this.rand() > this.d.abilities) return false;
    const d = sim.gap(c, t);
    const order = t.hp / t.maxHp < 0.55 || enemies.length > 1 ? [3, 0, 1, 2] : [0, 1, 2, 3];
    for (const i of order) {
      if (!this._ready(i)) continue;
      const ab = this.def.abilities[i];
      if (i === 3 && t.hp / t.maxHp > 0.7 && enemies.length < 2 && ab.team !== 'ally') continue;
      const aim = this._lead(t, ab);
      switch (ab.kind) {
        case 'shot':
          if (d > ab.range - 1) continue;
          if (i === 3 && ab.range > 30 && t.hp > (ab.damage?.[0] ?? 300) * 1.4) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: aim[0], z: aim[1] });
          return true;
        case 'area':
          if (ab.team === 'ally') {
            if (c.hp / c.maxHp > 0.6 && !this._allyChamps(ab.range).some((a) => a.hp / a.maxHp < 0.5)) continue;
            sim.command(c.slot, { type: 'cast', slot: i, x: c.x, z: c.z });
            return true;
          }
          if (d > ab.range + ab.radius * 0.5) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: aim[0], z: aim[1] });
          return true;
        case 'nova':
          if (ab.team === 'ally') {
            if (!this._allyChamps(ab.radius).concat([c]).some((a) => a.hp / a.maxHp < 0.6)) continue;
          } else if (d > ab.radius - 0.5) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: c.x, z: c.z });
          return true;
        case 'target':
          if (ab.team === 'ally') {
            const friend = this._allyChamps(ab.range).concat([c]).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            if (!friend || friend.hp / friend.maxHp > 0.7) continue;
            sim.command(c.slot, { type: 'cast', slot: i, x: friend.x, z: friend.z, target: friend.id });
            return true;
          }
          if (d > ab.range + 3) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: t.x, z: t.z, target: t.id });
          return true;
        case 'self':
          if (ab.heal && c.hp / c.maxHp > 0.5) continue;
          if (d > c.stats.range + 4) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: c.x, z: c.z });
          return true;
        case 'dash':
          if (!ab.damage) continue; // a tumble is for running away
          if (d < c.stats.range + 1 || d > ab.range + 1 || this._underEnemyTower(t.x, t.z)) continue;
          sim.command(c.slot, { type: 'cast', slot: i, x: t.x, z: t.z });
          return true;
        default:
          continue;
      }
    }
    return false;
  }

  /** Where to aim at a moving target, as well as this bot aims. */
  _lead(t, ab) {
    const c = this.c;
    const vx = (t.x - t.px) / TICK;
    const vz = (t.z - t.pz) / TICK;
    const d = Math.hypot(t.x - c.x, t.z - c.z);
    const time = (ab.speed ? d / ab.speed : 0) + (ab.delay ?? 0);
    const err = (1 - this.d.aim) * (this.rand() - 0.5) * 6;
    return [t.x + vx * time * this.d.aim + err, t.z + vz * time * this.d.aim - err];
  }

  /* ------------------------------------------------------------- laning */

  _laning(lane) {
    const sim = this.sim;
    const c = this.c;
    const toward = c.team === 'blue' ? 1 : -1;
    // The front of our wave in this lane.
    let front = null;
    let frontT = toward > 0 ? -1 : 2;
    const theirs = [];
    for (const e of sim.entities.values()) {
      if (e.dead || e.type !== 'minion' || e.lane !== lane) continue;
      const { t } = laneT(lane, e.x, e.z);
      if (e.team === c.team) {
        if ((toward > 0 && t > frontT) || (toward < 0 && t < frontT)) {
          frontT = t;
          front = e;
        }
      } else if (sim.gap(c, e) < 16) theirs.push(e);
    }
    // Last hits first.
    const reach = c.stats.range + 3;
    const killable = theirs
      .filter((m) => sim.gap(c, m) < reach && m.hp <= c.stats.ad * (100 / (100 + MINIONS[m.kind].armor)) * (c.stats.ranged ? 1.25 : 1.1) + 8)
      .sort((a, b) => a.hp - b.hp)[0];
    if (killable && this.rand() < this.d.lastHit && !this._underEnemyTower(killable.x, killable.z)) {
      sim.command(c.slot, { type: 'attack', target: killable.id });
      return;
    }
    // Poke an enemy champion in reach with a spare ability.
    const enemies = this._enemyChamps(16);
    if (enemies.length && c.mana > c.maxMana * 0.5 && this.rand() < 0.35 * this.d.abilities) {
      const t = enemies[0];
      const i = [0, 1, 2].find((k) => this._ready(k) && this.def.abilities[k].kind === 'shot' && sim.gap(c, t) < this.def.abilities[k].range - 1);
      if (i != null && !this._underEnemyTower(t.x, t.z)) {
        const aim = this._lead(t, this.def.abilities[i]);
        sim.command(c.slot, { type: 'cast', slot: i, x: aim[0], z: aim[1] });
        return;
      }
    }
    // A tower our minions are hitting: hit it too.
    const tower = front ? this._underEnemyTower(front.x, front.z, 2) : null;
    if (tower && sim.targetable(tower) && front && sim.gap(front, tower) < 13 && !enemies.some((e) => e.hp > c.hp)) {
      sim.command(c.slot, { type: 'attack', target: tower.id });
      return;
    }
    if (front) {
      // Stand a little behind the front, a little off to the side.
      const t = laneT(lane, front.x, front.z).t - toward * 0.035;
      const [x, z] = lanePoint(lane, t);
      const side = ((c.slot % 2) * 2 - 1) * 2.5;
      const px = x + side;
      const pz = z - side;
      if (this._underEnemyTower(px, pz) && !(tower && sim.gap(front, tower) < 13)) {
        this._holdAtTower(lane);
        return;
      }
      // With enemy minions in reach and nothing to last-hit, push the wave a bit.
      const hit = theirs.filter((m) => sim.gap(c, m) < c.stats.range + 0.5).sort((a, b) => a.hp - b.hp)[0];
      if (hit && this.rand() < 0.4) {
        sim.command(c.slot, { type: 'attack', target: hit.id });
        return;
      }
      if (Math.hypot(c.x - px, c.z - pz) > 3) this._go(px, pz);
      return;
    }
    this._holdAtTower(lane);
  }

  /** No wave of ours here: wait by our furthest tower in this lane. */
  _holdAtTower(lane) {
    const c = this.c;
    const sim = this.sim;
    const toward = c.team === 'blue' ? 1 : -1;
    let best = null;
    let bestT = toward > 0 ? -1 : 2;
    for (const t of sim.entities.values()) {
      if (t.type !== 'tower' || t.dead || t.team !== c.team || t.lane !== lane) continue;
      const tt = laneT(lane, t.x, t.z).t;
      if ((toward > 0 && tt > bestT) || (toward < 0 && tt < bestT)) {
        bestT = tt;
        best = t;
      }
    }
    const t = best ? bestT - toward * 0.02 : toward > 0 ? 0.12 : 0.88;
    const [x, z] = lanePoint(lane, t);
    if (Math.hypot(c.x - x, c.z - z) > 3) this._go(x, z);
  }

  /* ------------------------------------------------------------- jungle */

  _jungle() {
    const sim = this.sim;
    const c = this.c;
    // A weak enemy in a lane nearby: go get them.
    for (const e of sim.seats) {
      if (e.team === c.team || e.respawnAt || !sim.visibleTo(c.team, e)) continue;
      if (e.hp / e.maxHp < 0.45 && Math.hypot(e.x - c.x, e.z - c.z) < 45 && !this._underEnemyTower(e.x, e.z) && c.hp / c.maxHp > 0.6) {
        this._go(e.x, e.z, true);
        return;
      }
    }
    const camps = CAMP_SPOTS.filter((s) => s.side === c.team || (s.kind === 'warden' && c.level >= 7));
    // The camp in front of us, if it's up.
    for (let k = 0; k < camps.length; k++) {
      const spot = camps[(this.camp + k) % camps.length];
      const alive = [...sim.entities.values()].find((e) => e.type === 'camp' && !e.dead && e.spot === spot);
      if (!alive) continue;
      this.camp = (this.camp + k) % camps.length;
      if (spot.kind === 'warden' && this._allyChamps(20).length < 1 && c.level < 11) continue;
      if (sim.gap(c, alive) < c.stats.range + 0.3) sim.command(c.slot, { type: 'attack', target: alive.id });
      else this._go(alive.x, alive.z);
      return;
    }
    // Nothing up: help the closest lane.
    this._laning(['top', 'mid', 'bot'][c.slot % 3]);
  }
}

export { ENEMY, LANES };
