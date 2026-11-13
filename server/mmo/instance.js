import { CLASSES, MOBS, NODES, ITEMS, GCD, RUN_SPEED, QUESTS } from '../../src/mmo/data.js';
import { ZONES, NPCS, walkableIn } from '../../src/mmo/world.js';
import { statsOf, killXp, addXp, give, take } from '../../src/mmo/rules.js';

/**
 * One copy of one zone, run by the server: the players in it (a party, or
 * one player alone), its monsters, its gathering nodes. Ten steps a second.
 * Players' bodies move where their browsers say, within reason (speed and
 * walls are checked); everything else — every hit, heal, cast, kill, loot
 * roll and experience point — is decided here.
 *
 * A player here is `{ client, ch }` + a body: `client.send(msg)` reaches
 * their browser, `client.ch` is their saved character, `client.dirty()`
 * asks for a save.
 */

const TICK = 0.1;
const AGGRO = 9;
const LEASH = 45;
const POTION_CD = 20;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Instance {
  constructor({ key, zone, onEmpty = () => {} }) {
    this.key = key;
    this.zone = zone;
    this.def = ZONES[zone];
    this.time = 0;
    this.nextId = 1;
    this.ents = new Map();
    this.players = new Map(); // charId → body
    this.out = []; // events everyone here sees, sent with the next snapshot
    this.tele = []; // telegraphs: boss attacks about to land
    this.onEmpty = onEmpty;
    this.emptySince = 0;
    for (const n of this.def.npcs) this._add({ kind: 'npc', npc: n.id, x: n.at[0], z: n.at[1], a: 0 });
    for (const group of this.def.nodes) for (const at of group.at) this._add({ kind: 'node', type: group.type, x: at[0], z: at[1], ready: true, respawnAt: 0 });
    this.def.spawns.forEach((s, gi) => {
      for (let i = 0; i < s.count; i++) this._spawnMob(s, gi);
    });
  }

  _add(e) {
    e.id = this.nextId++;
    this.ents.set(e.id, e);
    return e;
  }

  _spawnMob(spawn, group, at = null) {
    const def = MOBS[spawn.mob];
    const level = Math.round(rand(def.level[0], def.level[1]));
    const scale = 1 + (level - def.level[0]) * 0.15;
    let x = at?.[0] ?? spawn.at[0];
    let z = at?.[1] ?? spawn.at[1];
    if (!at) {
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * spawn.radius;
        const px = spawn.at[0] + Math.cos(a) * r;
        const pz = spawn.at[1] + Math.sin(a) * r;
        if (walkableIn(this.zone, px, pz, 1)) {
          x = px;
          z = pz;
          break;
        }
      }
    }
    return this._add({
      kind: 'mob', type: spawn.mob, level, x, z, a: Math.random() * 6, home: [x, z], spawn, group,
      hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), damage: def.damage * scale,
      radius: (def.scale ?? 1) * 0.8, state: 'idle', threat: new Map(), tagged: new Set(), swingAt: 0,
      stunUntil: 0, slow: 0, slowUntil: 0, mark: 0, markUntil: 0, taunt: null, dead: false, respawnAt: 0,
      boss: def.boss ? Object.fromEntries(Object.entries(def.boss).map(([k, v]) => [k, { ...v, next: (v.every ?? 0) * 0.6 }])) : null, enraged: false
    });
  }

  /* ------------------------------------------------------------- players */

  /** A player arrives (at `at`, or the zone's spawn). */
  addPlayer(client, at = null) {
    const ch = client.ch;
    const st = statsOf(ch);
    const [x, z] = at ?? (ch.zone === this.zone && walkableIn(this.zone, ch.x, ch.z) ? [ch.x, ch.z] : this.def.spawn);
    const body = this._add({
      kind: 'player', client, ch, charId: client.charId, name: ch.name, cls: ch.cls, x, z, a: 0,
      hp: Math.min(st.maxHp, ch.hp ?? st.maxHp), mana: Math.min(st.maxMana, ch.mana ?? st.maxMana), st,
      target: null, attacking: false, cast: null, gather: null, gcdUntil: 0, cds: {}, buffs: [], shield: 0,
      dead: (ch.hp ?? 1) <= 0, combatUntil: 0, swingAt: 0, potionAt: 0, movedAt: Date.now(), radius: 0.6
    });
    if (body.dead) body.hp = 0;
    ch.zone = this.zone;
    this.players.set(client.charId, body);
    this.emptySince = 0;
    client.body = body;
    client.instance = this;
    return body;
  }

  removePlayer(charId) {
    const p = this.players.get(charId);
    if (!p) return;
    this._keep(p);
    this.players.delete(charId);
    this.ents.delete(p.id);
    for (const m of this.ents.values()) if (m.kind === 'mob') m.threat.delete(p.id);
    if (!this.players.size) this.emptySince = this.time || 1e-6;
  }

  /** Copy the body's state into the saved character. */
  _keep(p) {
    p.ch.x = Math.round(p.x * 10) / 10;
    p.ch.z = Math.round(p.z * 10) / 10;
    p.ch.hp = Math.round(p.hp);
    p.ch.mana = Math.round(p.mana);
    p.ch.zone = this.zone;
  }

  /** Stats changed (level, gear): recompute, keeping the share of health. */
  refresh(p) {
    const k = p.hp / Math.max(1, p.st.maxHp);
    const m = p.mana / Math.max(1, p.st.maxMana);
    p.st = statsOf(p.ch);
    if (!p.dead) {
      p.hp = Math.max(1, Math.round(p.st.maxHp * k));
      p.mana = Math.round(p.st.maxMana * m);
    }
  }

  _say(p, ev) {
    p.client.send({ t: 'ev', ev: [ev] });
  }

  _err(p, text) {
    p.client.send({ t: 'error', text });
  }

  sameSide(a, b) {
    return a === b || (a.client.party && a.client.party === b.client.party);
  }

  /* ------------------------------------------------------------ commands */

  /** A command from a player's browser that happens in the world. */
  handle(p, msg) {
    switch (msg.t) {
      case 'move':
        return this._move(p, msg);
      case 'target': {
        const t = this.ents.get(msg.id);
        p.target = t && (t.kind === 'mob' || t.kind === 'player') ? t.id : null;
        if (!p.target) p.attacking = false;
        return;
      }
      case 'attack': {
        const t = this.ents.get(p.target);
        p.attacking = Boolean(msg.on) && t?.kind === 'mob' && !t.dead;
        return;
      }
      case 'skill':
        return this._skill(p, String(msg.id), msg.target);
      case 'stop':
        p.cast = null;
        p.gather = null;
        return;
      case 'gather':
        return this._startGather(p, msg.node);
      case 'use':
        return this._use(p, msg.slot | 0);
      case 'release':
        if (!p.dead) return;
        p.dead = false;
        p.hp = Math.round(p.st.maxHp * 0.5);
        p.mana = Math.round(p.st.maxMana * 0.5);
        [p.x, p.z] = this.def.graveyard;
        p.client.send({ t: 'correct', x: p.x, z: p.z });
        this.out.push({ type: 'respawn', id: p.id });
        return;
      default:
        return;
    }
  }

  _move(p, msg) {
    const x = Number(msg.x);
    const z = Number(msg.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const now = Date.now();
    const dt = Math.min(2, (now - p.movedAt) / 1000);
    const d = Math.hypot(x - p.x, z - p.z);
    if (p.dead || d > RUN_SPEED * 1.4 * dt + 1.2 || !walkableIn(this.zone, x, z, 0.3)) {
      if (d > 0.05) p.client.send({ t: 'correct', x: p.x, z: p.z });
      p.movedAt = now;
      return;
    }
    if (d > 0.3) {
      // Moving breaks a cast or a gather.
      if (p.cast) {
        p.cast = null;
        this.out.push({ type: 'cast-stop', id: p.id });
      }
      p.gather = null;
    }
    p.x = x;
    p.z = z;
    if (Number.isFinite(Number(msg.a))) p.a = Number(msg.a);
    p.movedAt = now;
  }

  _skill(p, id, targetId) {
    const def = CLASSES[p.cls].skills.find((s) => s.id === id);
    if (!def || p.ch.level < def.level || p.dead) return;
    if (p.cast) return this._err(p, 'Already casting');
    if (this.time < p.gcdUntil) return;
    if ((p.cds[id] ?? 0) > this.time) return this._err(p, `${def.name} isn't ready`);
    if (p.mana < def.cost) return this._err(p, `Not enough ${CLASSES[p.cls].resource.toLowerCase()}`);
    const target = this._resolveTarget(p, def, targetId);
    if (target === false) return;
    p.gcdUntil = this.time + GCD;
    if (def.cast) {
      p.cast = { id, target: target?.id ?? null, until: this.time + def.cast, total: def.cast };
      this.out.push({ type: 'cast', id: p.id, skill: id, time: def.cast });
      return;
    }
    this._resolve(p, def, target);
  }

  /** The target a skill needs, or false (with a message) if there isn't a good one. */
  _resolveTarget(p, def, targetId) {
    const t = this.ents.get(targetId ?? p.target) ?? null;
    const hostile = ['strike', 'bolt', 'area', 'taunt'].includes(def.kind);
    if (hostile) {
      if (!t || t.kind !== 'mob' || t.dead) return this._err(p, 'No enemy targeted'), false;
      const reach = def.kind === 'strike' ? p.st.range + t.radius + 0.6 : def.range;
      if (dist(p, t) > reach) return this._err(p, 'Out of range'), false;
      p.target = t.id;
      p.attacking = true;
      return t;
    }
    if (def.kind === 'heal') {
      const friend = t?.kind === 'player' && !t.dead && this.sameSide(p, t) ? t : p;
      if (dist(p, friend) > def.range) return this._err(p, 'Out of range'), false;
      return friend;
    }
    if (def.kind === 'revive') {
      if (!t || t.kind !== 'player' || !t.dead || !this.sameSide(p, t)) return this._err(p, 'Target a fallen friend'), false;
      if (dist(p, t) > def.range) return this._err(p, 'Out of range'), false;
      return t;
    }
    return null;
  }

  _resolve(p, def, target) {
    p.mana -= def.cost;
    if (def.cd) p.cds[def.id] = this.time + def.cd;
    const power = p.st.power;
    const amount = (base) => (base ?? 0) + power * (def.coef ?? 0);
    this.out.push({ type: 'skill', id: p.id, skill: def.id, target: target?.id ?? null, x: target?.x ?? p.x, z: target?.z ?? p.z });
    switch (def.kind) {
      case 'strike':
      case 'bolt':
        if (!target || target.dead) return;
        if (def.damage || def.coef) this._hurtMob(target, amount(def.damage), p, def.threat ?? 1);
        if (def.stun) target.stunUntil = this.time + def.stun;
        if (def.slow) {
          target.slow = def.slow.amount;
          target.slowUntil = this.time + def.slow.time;
        }
        if (def.mark) {
          target.mark = def.mark.more;
          target.markUntil = this.time + def.mark.time;
          this._aggro(target, p, 5);
        }
        return;
      case 'taunt': {
        if (!target || target.dead) return;
        const top = Math.max(0, ...target.threat.values());
        target.threat.set(p.id, top * 1.1 + 10);
        target.taunt = { by: p.id, until: this.time + 3 };
        if (target.state !== 'fight') target.state = 'fight';
        return;
      }
      case 'area': {
        const c = target ?? p;
        for (const m of this.ents.values()) if (m.kind === 'mob' && !m.dead && dist(m, c) <= def.radius + m.radius) this._hurtMob(m, amount(def.damage), p, def.threat ?? 1);
        return;
      }
      case 'nova':
        if (def.friendly) {
          for (const f of this.players.values()) if (!f.dead && this.sameSide(p, f) && dist(f, p) <= def.radius) this._heal(f, amount(def.heal), p);
        } else {
          for (const m of this.ents.values()) if (m.kind === 'mob' && !m.dead && dist(m, p) <= def.radius + m.radius) this._hurtMob(m, amount(def.damage), p, def.threat ?? 1);
        }
        return;
      case 'aura':
        if (def.buff) p.buffs.push({ ...def.buff, until: this.time + def.buff.time, id: def.id });
        if (def.shield) p.shield = Math.max(p.shield, amount(def.shield));
        return;
      case 'heal': {
        const t = target ?? p;
        if (def.heal) this._heal(t, amount(def.heal), p);
        if (def.shield) t.shield = Math.max(t.shield, amount(def.shield));
        if (def.hot) t.buffs.push({ id: def.id, hot: def.hot.heal + power * def.hot.coef, every: 2, next: this.time + 2, until: this.time + def.hot.time, by: p.id });
        return;
      }
      case 'blink': {
        const d = def.distance;
        let nx = p.x + Math.sin(p.a) * d;
        let nz = p.z + Math.cos(p.a) * d;
        for (let k = 0; k < 10 && !walkableIn(this.zone, nx, nz); k++) {
          nx = p.x + (nx - p.x) * 0.8;
          nz = p.z + (nz - p.z) * 0.8;
        }
        if (walkableIn(this.zone, nx, nz)) {
          p.x = nx;
          p.z = nz;
          p.client.send({ t: 'correct', x: nx, z: nz });
        }
        return;
      }
      case 'revive':
        if (!target?.dead) return;
        target.dead = false;
        target.hp = Math.round(target.st.maxHp * 0.4);
        target.mana = Math.round(target.st.maxMana * 0.4);
        this.out.push({ type: 'respawn', id: target.id });
        return;
      default:
        return;
    }
  }

  /* -------------------------------------------------------------- damage */

  _hurtMob(m, raw, p, threatMult = 1) {
    if (m.dead) return;
    const diff = m.level - p.ch.level;
    let dmg = raw * rand(0.9, 1.1) * (diff > 0 ? Math.max(0.4, 1 - diff * 0.1) : 1);
    if (m.markUntil > this.time) dmg *= 1 + m.mark;
    const crit = Math.random() < 0.1;
    if (crit) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));
    m.hp -= dmg;
    m.tagged.add(p.charId);
    p.combatUntil = this.time + 5;
    this._aggro(m, p, dmg * threatMult * (p.cls === 'vanguard' ? 1.5 : 1));
    this.out.push({ type: 'dmg', id: m.id, amount: dmg, by: p.id, crit });
    if (m.hp <= 0) this._killMob(m);
  }

  _aggro(m, p, amount) {
    m.threat.set(p.id, (m.threat.get(p.id) ?? 0) + amount);
    if (m.state === 'idle') {
      m.state = 'fight';
      // Its friends nearby join in.
      for (const o of this.ents.values()) {
        if (o.kind === 'mob' && !o.dead && o.state === 'idle' && o.group === m.group && dist(o, m) < 10) {
          o.state = 'fight';
          o.threat.set(p.id, 1);
        }
      }
    }
  }

  _heal(t, raw, by) {
    if (t.dead) return;
    const amount = Math.round(raw * rand(0.95, 1.05));
    const before = t.hp;
    t.hp = Math.min(t.st.maxHp, t.hp + amount);
    const done = Math.round(t.hp - before);
    if (done > 0) this.out.push({ type: 'heal', id: t.id, amount: done, by: by?.id });
    // Healing angers whatever is fighting the healed.
    if (by && done > 0) for (const m of this.ents.values()) if (m.kind === 'mob' && !m.dead && m.threat.has(t.id)) m.threat.set(by.id, (m.threat.get(by.id) ?? 0) + done * 0.4);
  }

  _hurtPlayer(p, raw, m) {
    if (p.dead) return;
    let dmg = raw * rand(0.85, 1.15) * (100 / (100 + p.st.armor * 1.5));
    for (const b of p.buffs) if (b.reduce) dmg *= 1 - b.reduce;
    dmg = Math.max(1, Math.round(dmg));
    if (p.shield > 0) {
      const soak = Math.min(p.shield, dmg);
      p.shield -= soak;
      dmg -= soak;
    }
    p.hp -= dmg;
    p.combatUntil = this.time + 5;
    this.out.push({ type: 'dmg', id: p.id, amount: dmg, by: m?.id ?? null });
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.cast = null;
      p.gather = null;
      p.attacking = false;
      p.buffs = [];
      for (const o of this.ents.values()) if (o.kind === 'mob') o.threat.delete(p.id);
      this.out.push({ type: 'death', id: p.id });
    }
  }

  _killMob(m) {
    m.dead = true;
    m.diedAt = this.time;
    m.hp = 0;
    m.state = 'dead';
    this.out.push({ type: 'death', id: m.id });
    const def = MOBS[m.type];
    // Everyone who fought it, and their party here.
    const winners = [...this.players.values()].filter((p) => [...m.tagged].some((cid) => {
      const t = this.players.get(cid);
      return t && (t === p || this.sameSide(t, p));
    }) && dist(p, m) < 90);
    const share = winners.length ? (1 + 0.15 * (winners.length - 1)) / winners.length : 0;
    for (const p of winners) {
      const ch = p.ch;
      const xp = Math.round(killXp(m.level, ch.level, def.elite) * share);
      const before = ch.level;
      if (xp) {
        const up = addXp(ch, xp);
        this._say(p, { type: 'xp', amount: xp });
        if (up) {
          this.refresh(p);
          p.hp = p.st.maxHp;
          p.mana = p.st.maxMana;
          this.out.push({ type: 'level', id: p.id, level: ch.level });
          this._say(p, { type: 'text', text: `You reached level ${ch.level}!${CLASSES[p.cls].skills.filter((s) => s.level > before && s.level <= ch.level).map((s) => ` New skill: ${s.name}.`).join('')}` });
        }
      }
      const gold = Math.round(rand(def.gold[0], def.gold[1]));
      ch.gold += gold;
      const got = [];
      for (const [item, chance] of def.loot) {
        if (Math.random() > chance) continue;
        if (give(ch, item, 1)) got.push(item);
        else this._say(p, { type: 'text', text: `Your bag is full — ${ITEMS[item].name} was left behind.` });
      }
      this._say(p, { type: 'loot', gold, items: got, from: def.name });
      // Kill quests.
      for (const [qid, have] of Object.entries(ch.quests.active)) {
        const q = QUESTS[qid];
        if (q.goal.kill === m.type && have < q.goal.count) {
          ch.quests.active[qid] = have + 1;
          this._say(p, { type: 'quest', id: qid, have: have + 1, need: q.goal.count });
        }
      }
      p.client.dirty();
    }
    if (!this.def.noRespawn) m.respawnAt = this.time + (m.spawn.respawn ?? (def.elite ? 120 : 30));
  }

  /* ---------------------------------------------------------- gathering */

  _startGather(p, nodeId) {
    const n = this.ents.get(nodeId);
    if (!n || n.kind !== 'node' || p.dead) return;
    if (!n.ready) return this._err(p, 'Nothing left to gather here yet');
    if (dist(p, n) > 4) return this._err(p, 'Too far away');
    const def = NODES[n.type];
    const skill = p.ch.skills[def.skill] ?? 1;
    if (skill < def.need) return this._err(p, `Needs ${def.skill} ${def.need} (you have ${skill})`);
    p.cast = null;
    p.gather = { node: n.id, until: this.time + def.time, total: def.time };
    this.out.push({ type: 'gather', id: p.id, time: def.time });
  }

  _finishGather(p) {
    const n = this.ents.get(p.gather.node);
    p.gather = null;
    if (!n?.ready || dist(p, n) > 5) return;
    const def = NODES[n.type];
    const count = 1 + (Math.random() < 0.35 ? 1 : 0);
    const got = give(p.ch, def.item, count);
    if (!got) return this._err(p, 'Your bag is full');
    n.ready = false;
    n.respawnAt = this.time + def.respawn;
    const skill = p.ch.skills[def.skill] ?? 1;
    let up = false;
    if (skill < 100 && skill < def.need + 50 && Math.random() < Math.max(0.15, 1 - (skill - def.need) / 50)) {
      p.ch.skills[def.skill] = skill + 1;
      up = true;
    }
    this._say(p, { type: 'gathered', item: def.item, n: got, skill: def.skill, level: p.ch.skills[def.skill], up });
    p.client.dirty();
  }

  _use(p, slot) {
    const s = p.ch.bag[slot];
    const use = s && ITEMS[s.item]?.use;
    if (!use || p.dead) return;
    if (this.time < p.potionAt) return this._err(p, 'Not again so soon');
    take(p.ch, s.item, 1);
    p.potionAt = this.time + POTION_CD;
    if (use.heal) this._heal(p, use.heal, null);
    if (use.mana) p.mana = Math.min(p.st.maxMana, p.mana + use.mana);
    p.client.dirty();
  }

  /* --------------------------------------------------------------- step */

  step() {
    this.time += TICK;
    const t = this.time;
    for (const p of this.players.values()) this._playerStep(p, t);
    for (const e of this.ents.values()) {
      if (e.kind === 'mob') this._mobStep(e, t);
      else if (e.kind === 'node' && !e.ready && t >= e.respawnAt) e.ready = true;
    }
    this._teleStep(t);
    if (!this.players.size && this.emptySince && t - this.emptySince > 60) this.onEmpty(this);
  }

  _playerStep(p, t) {
    if (p.dead) return;
    p.buffs = p.buffs.filter((b) => {
      if (b.hot && t >= b.next) {
        b.next = t + b.every;
        this._heal(p, b.hot, this.ents.get(b.by) ?? null);
      }
      return b.until > t;
    });
    const resting = t > p.combatUntil;
    p.hp = Math.min(p.st.maxHp, p.hp + (resting ? p.st.maxHp * 0.04 : 0) * TICK);
    p.mana = Math.min(p.st.maxMana, p.mana + (p.st.regen + (resting ? p.st.maxMana * 0.04 : 0)) * TICK);
    if (p.cast && t >= p.cast.until) {
      const def = CLASSES[p.cls].skills.find((s) => s.id === p.cast.id);
      const target = p.cast.target ? this.ents.get(p.cast.target) : null;
      p.cast = null;
      if (def && p.mana >= def.cost) {
        const again = this._resolveTarget(p, def, target?.id ?? null);
        if (again !== false) this._resolve(p, def, again);
      }
    }
    if (p.gather && t >= p.gather.until) this._finishGather(p);
    // Auto-attack.
    const m = p.attacking ? this.ents.get(p.target) : null;
    if (m?.kind === 'mob' && !m.dead && !p.cast && t >= p.swingAt) {
      const reach = p.st.ranged ? p.st.range : p.st.range + m.radius + 0.6;
      if (dist(p, m) <= reach) {
        p.swingAt = t + p.st.swing;
        p.a = Math.atan2(m.x - p.x, m.z - p.z);
        this.out.push({ type: 'swing', id: p.id, target: m.id, ranged: p.st.ranged });
        this._hurtMob(m, p.st.power * 0.7 + p.ch.level * 1.5, p, 1);
      }
    } else if (m?.dead) p.attacking = false;
  }

  _mobStep(m, t) {
    const def = MOBS[m.type];
    if (m.dead) {
      if (m.respawnAt && t >= m.respawnAt) {
        this.ents.delete(m.id);
        this._spawnMob(m.spawn, m.group);
      }
      return;
    }
    if (m.stunUntil > t) return;
    const speed = def.speed * (m.slowUntil > t ? 1 - m.slow : 1) * (m.state === 'return' ? 1.8 : 1);
    if (m.state === 'idle') {
      if (this.def.safe) return;
      for (const p of this.players.values()) {
        if (p.dead) continue;
        const reach = AGGRO + Math.max(-4, Math.min(4, m.level - p.ch.level));
        if (dist(p, m) < reach) {
          this._aggro(m, p, 1);
          break;
        }
      }
      return;
    }
    if (m.state === 'return') {
      const home = { x: m.home[0], z: m.home[1] };
      if (this._walk(m, home, speed)) {
        m.state = 'idle';
        m.hp = m.maxHp;
        m.tagged.clear();
        m.enraged = false;
      }
      return;
    }
    // Fighting: the most hated player still standing (a taunt overrides it).
    for (const id of [...m.threat.keys()]) {
      const p = this.ents.get(id);
      if (!p || p.dead || p.kind !== 'player') m.threat.delete(id);
    }
    let target = null;
    if (m.taunt && m.taunt.until > t) target = this.ents.get(m.taunt.by);
    if (!target || target.dead) {
      let top = -1;
      for (const [id, v] of m.threat) {
        if (v > top) {
          top = v;
          target = this.ents.get(id);
        }
      }
    }
    if (!target || Math.hypot(m.x - m.home[0], m.z - m.home[1]) > LEASH) {
      m.state = 'return';
      m.threat.clear();
      this.out.push({ type: 'reset', id: m.id });
      return;
    }
    m.target = target.id;
    if (m.boss) this._bossStep(m, target, t);
    const range = (def.range ?? 2.4) + target.radius;
    if (dist(m, target) > range) {
      this._walk(m, target, speed);
      return;
    }
    m.a = Math.atan2(target.x - m.x, target.z - m.z);
    if (t >= m.swingAt) {
      m.swingAt = t + 2;
      this.out.push({ type: 'swing', id: m.id, target: target.id, ranged: Boolean(def.ranged) });
      const more = m.enraged ? 1 + (m.boss?.enrage?.more ?? 0) : 1;
      this._hurtPlayer(target, m.damage * more, m);
    }
  }

  _bossStep(m, target, t) {
    const b = m.boss;
    if (b.enrage && !m.enraged && m.hp / m.maxHp < b.enrage.below) {
      m.enraged = true;
      this.out.push({ type: 'enrage', id: m.id });
    }
    if (b.slam && t >= b.slam.next) {
      b.slam.next = t + b.slam.every;
      this.tele.push({ id: this.nextId++, x: target.x, z: target.z, r: b.slam.radius, at: t + b.slam.windup, damage: b.slam.damage, from: m.id });
    }
    if (b.nova && t >= b.nova.next) {
      b.nova.next = t + b.nova.every;
      this.tele.push({ id: this.nextId++, x: m.x, z: m.z, r: b.nova.radius, at: t + b.nova.windup, damage: b.nova.damage, from: m.id, follow: true });
    }
    if (b.summon && t >= b.summon.next) {
      b.summon.next = t + b.summon.every;
      for (let i = 0; i < b.summon.count; i++) {
        const a = (i / b.summon.count) * Math.PI * 2;
        const add = this._spawnMob({ mob: b.summon.mob, at: [m.x, m.z], radius: 0, count: 1, respawn: 0 }, -1, [m.x + Math.cos(a) * 4, m.z + Math.sin(a) * 4]);
        add.spawn = { ...add.spawn, respawn: Infinity };
        add.home = [m.x, m.z];
        add.state = 'fight';
        add.threat.set(target.id, 1);
      }
      this.out.push({ type: 'summon', id: m.id });
    }
  }

  _teleStep(t) {
    const keep = [];
    for (const tl of this.tele) {
      const from = this.ents.get(tl.from);
      if (!from || from.dead) continue;
      if (tl.follow) {
        tl.x = from.x;
        tl.z = from.z;
      }
      if (t < tl.at) {
        keep.push(tl);
        continue;
      }
      for (const p of this.players.values()) if (!p.dead && Math.hypot(p.x - tl.x, p.z - tl.z) <= tl.r) this._hurtPlayer(p, tl.damage * (1 + (from.level - 10) * 0.05), from);
      this.out.push({ type: 'blast', x: tl.x, z: tl.z, r: tl.r });
    }
    this.tele = keep;
  }

  /** Walk an entity toward a point; true when there. */
  _walk(e, to, speed) {
    const dx = to.x - e.x;
    const dz = to.z - e.z;
    const l = Math.hypot(dx, dz);
    const step = speed * TICK;
    if (l <= step) {
      e.x = to.x;
      e.z = to.z;
      return true;
    }
    e.a = Math.atan2(dx, dz);
    const nx = e.x + (dx / l) * step;
    const nz = e.z + (dz / l) * step;
    if (walkableIn(this.zone, nx, nz, 0.4)) {
      e.x = nx;
      e.z = nz;
    } else {
      // Slide round a wall.
      const sx = e.x + (dz / l) * step;
      const sz = e.z - (dx / l) * step;
      if (walkableIn(this.zone, sx, sz, 0.4)) {
        e.x = sx;
        e.z = sz;
      }
    }
    return false;
  }

  /* ----------------------------------------------------------- snapshot */

  snapshot() {
    const ents = [];
    const r = (v) => Math.round(v * 100) / 100;
    for (const e of this.ents.values()) {
      if (e.kind === 'player') {
        ents.push({
          i: e.id, k: 'p', n: e.name, c: e.cls, l: e.ch.level, x: r(e.x), z: r(e.z), a: r(e.a), hp: Math.round(e.hp), mh: e.st.maxHp,
          mp: Math.round(e.mana), mm: e.st.maxMana, t: e.target, dead: e.dead || undefined, sh: e.shield > 0 ? Math.round(e.shield) : undefined,
          cast: e.cast ? { s: e.cast.id, left: r(e.cast.until - this.time), total: e.cast.total } : e.gather ? { s: 'gather', left: r(e.gather.until - this.time), total: e.gather.total } : undefined,
          party: e.client.party ?? undefined, buffs: e.buffs.length ? e.buffs.map((b) => b.id) : undefined, gcd: e.gcdUntil > this.time ? r(e.gcdUntil - this.time) : undefined,
          cds: Object.fromEntries(Object.entries(e.cds).filter(([, v]) => v > this.time).map(([k, v]) => [k, r(v - this.time)]))
        });
      } else if (e.kind === 'mob') {
        if (e.dead && this.time - e.diedAt > 5) continue; // a body lies there a moment, then it's gone until it rises again
        ents.push({ i: e.id, k: 'm', ty: e.type, l: e.level, x: r(e.x), z: r(e.z), a: r(e.a), hp: Math.max(0, Math.round(e.hp)), mh: e.maxHp, st: e.state, t: e.target ?? undefined, dead: e.dead || undefined, en: e.enraged || undefined });
      } else if (e.kind === 'node') {
        ents.push({ i: e.id, k: 'n', ty: e.type, x: e.x, z: e.z, ready: e.ready });
      } else if (e.kind === 'npc') {
        ents.push({ i: e.id, k: 'npc', npc: e.npc, x: e.x, z: e.z });
      }
    }
    return { t: r(this.time), zone: this.zone, ents, tele: this.tele.map((tl) => ({ i: tl.id, x: r(tl.x), z: r(tl.z), r: tl.r, left: r(tl.at - this.time) })) };
  }

  /** The NPC or station a player is standing by (within reach). */
  near(p, kind, id) {
    if (kind === 'npc') {
      const n = [...this.ents.values()].find((e) => e.kind === 'npc' && e.npc === id);
      return n && dist(p, n) <= 7 ? n : null;
    }
    if (kind === 'station') {
      const s = this.def.stations.find((x) => x.id === id);
      return s && Math.hypot(p.x - s.at[0], p.z - s.at[1]) <= 7 ? s : null;
    }
    if (kind === 'portal') {
      const s = this.def.portals.find((x) => x.id === id);
      return s && Math.hypot(p.x - s.at[0], p.z - s.at[1]) <= 6 ? s : null;
    }
    return null;
  }
}

export { NPCS };
