import {
  TICK, CELL, STATS, FACTIONS, MAX_SUPPLY, START_SHARDS, START_WORKERS, CARRY, MINE_TIME, MAX_QUEUE,
  trainsOf, isUnitType, isBuildingType
} from './rules.js';
import { generateMap, OPEN, rng } from './map.js';
import { FlowFields } from './flow.js';
import { ComputerPlayer } from './ai.js';

/**
 * Shardfront's simulation: the whole match, step by step, with no drawing in
 * it. It runs at a fixed 20 steps a second from a seed, and players change it
 * only through `command()` — applied at the start of the next step — so two
 * machines given the same seed and the same commands play the same match
 * (what a shared, lockstep match will need).
 *
 * Entities: `unit`, `building` and `node` (a crystal), all in `entities`
 * (by id, in the order made — the order everything is updated in).
 */

const BUCKET = 6; // spatial-hash cell, in world units
const SIGHT_EVERY = 4; // steps between vision updates
const ALERT_GAP = 8 / TICK; // steps between "under attack" alerts
const LEASH = 26; // how far an idle unit chases before going back

export class Sim {
  /**
   * @param {{ seed?: number|string, size?: string,
   *   players: Array<{ faction: string, team?: number, name?: string, ai?: string|null }> }} options
   *   `ai` is a difficulty ('easy'|'normal'|'hard') for a computer player, or null for a person.
   */
  constructor({ seed = 1, size = 'huge', players }) {
    if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error('2 to 4 players');
    this.seed = seed;
    this.map = generateMap({ seed, size, players: players.length });
    this.n = this.map.n;
    this.tick = 0;
    this.rand = rng(`${seed}:sim`);
    this.entities = new Map();
    this.nextId = 1;
    this.pending = [];
    this.projectiles = [];
    this.events = [];
    this.recordEvents = false;
    this.over = null;
    this.groupSerial = 0;
    this.occ = new Int32Array(this.n * this.n);
    this.flows = new FlowFields(this.n, (i) => this.map.block[i] === OPEN && this.occ[i] === 0);
    this.hash = new Map();
    this.players = players.map((p, seat) => ({
      seat,
      faction: FACTIONS[p.faction] ? p.faction : 'league',
      team: p.team ?? seat,
      name: p.name ?? `Player ${seat + 1}`,
      ai: p.ai ?? null,
      shards: START_SHARDS,
      used: 0,
      cap: 0,
      alive: true,
      vision: new Uint8Array(this.n * this.n),
      explored: new Uint8Array(this.n * this.n),
      lastAlert: -Infinity,
      lastAttacked: null,
      stats: { gathered: 0, spent: 0, made: 0, lost: 0, killed: 0, built: 0 }
    }));

    for (const node of this.map.nodes) {
      const e = this._add({ kind: 'node', type: 'node', owner: -1, cx: node.cx, cz: node.cz, x: (node.cx + 0.5) * CELL, z: (node.cz + 0.5) * CELL, amount: node.amount, max: node.amount, size: 1, x0: node.cx, z0: node.cz, radius: CELL / 2 });
      this.occ[node.cz * this.n + node.cx] = e.id;
    }
    for (const p of this.players) {
      const start = this.map.starts[p.seat];
      const core = this._building(p.seat, 'core', start.cx - 2, start.cz - 2, true);
      for (let i = 0; i < START_WORKERS; i++) {
        const spot = this._spawnSpot(core, null, i);
        this._unit(p.seat, 'worker', spot.x, spot.z);
      }
    }
    this.computers = this.players.filter((p) => p.ai).map((p) => new ComputerPlayer(this, p.seat, p.ai));
    this._supply();
    this._vision();
  }

  /* ------------------------------------------------------------ helpers */

  cellIndex(x, z) {
    const n = this.n;
    const cx = Math.max(0, Math.min(n - 1, Math.floor(x / CELL)));
    const cz = Math.max(0, Math.min(n - 1, Math.floor(z / CELL)));
    return cz * n + cx;
  }

  passable(i) {
    return this.map.block[i] === OPEN && this.occ[i] === 0;
  }

  hostile(a, b) {
    return a >= 0 && b >= 0 && this.players[a].team !== this.players[b].team;
  }

  stats(e) {
    return STATS[this.players[e.owner].faction][e.type];
  }

  get(id) {
    const e = this.entities.get(id);
    return e && !e.dead ? e : null;
  }

  unitsOf(seat) {
    const out = [];
    for (const e of this.entities.values()) if (e.kind === 'unit' && e.owner === seat && !e.dead) out.push(e);
    return out;
  }

  buildingsOf(seat) {
    const out = [];
    for (const e of this.entities.values()) if (e.kind === 'building' && e.owner === seat && !e.dead) out.push(e);
    return out;
  }

  nodes() {
    const out = [];
    for (const e of this.entities.values()) if (e.kind === 'node' && !e.dead) out.push(e);
    return out;
  }

  /** Edge-to-edge distance from a unit to anything (a building or a crystal is a square). */
  gap(a, b) {
    if (b.kind === 'unit') return Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius;
    const half = (b.size * CELL) / 2;
    const dx = Math.max(Math.abs(a.x - b.x) - half, 0);
    const dz = Math.max(Math.abs(a.z - b.z) - half, 0);
    return Math.hypot(dx, dz) - (a.kind === 'unit' ? a.radius : (a.size * CELL) / 2 - CELL / 2);
  }

  _add(e) {
    e.id = this.nextId++;
    e.dead = false;
    this.entities.set(e.id, e);
    return e;
  }

  _event(e) {
    if (!this.recordEvents) return;
    this.events.push(e);
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
  }

  /** What the drawing reads since it last asked. */
  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  _unit(seat, type, x, z) {
    const s = STATS[this.players[seat].faction][type];
    const u = this._add({
      kind: 'unit', type, owner: seat, x, z, px: x, pz: z, angle: 0, hp: s.hp, maxHp: s.hp, radius: s.radius, armor: s.armor,
      order: { type: 'idle' }, cooldown: 0, carry: 0, mineT: 0, target: null, lastHurt: -Infinity, moved: 0, still: 0
    });
    u.angle = Math.atan2(this.map.size / 2 - x, this.map.size / 2 - z);
    this.players[seat].stats.made++;
    return u;
  }

  _building(seat, type, x0, z0, built = false) {
    const s = STATS[this.players[seat].faction][type];
    const b = this._add({
      kind: 'building', type, owner: seat, x0, z0, size: s.size,
      x: (x0 + s.size / 2) * CELL, z: (z0 + s.size / 2) * CELL,
      hp: built ? s.hp : Math.max(1, Math.round(s.hp * 0.1)), maxHp: s.hp, armor: s.armor, radius: (s.size * CELL) / 2,
      built, progress: built ? 1 : 0, queue: [], rally: null, cooldown: 0, attended: -1, seen: 1 << seat, lastHurt: -Infinity
    });
    for (let z = z0; z < z0 + s.size; z++) for (let x = x0; x < x0 + s.size; x++) this.occ[z * this.n + x] = b.id;
    this.flows.reset();
    // Anyone standing there steps aside.
    for (const u of this.entities.values()) {
      if (u.kind !== 'unit' || u.dead) continue;
      const c = this.cellIndex(u.x, u.z);
      if (this.occ[c] !== b.id) continue;
      const spot = this._spawnSpot(b, { x: u.x, z: u.z }, 0);
      u.x = u.px = spot.x;
      u.z = u.pz = spot.z;
    }
    return b;
  }

  /** The cells around a building or crystal that can be walked on. */
  ring(e) {
    const n = this.n;
    const out = [];
    for (let z = e.z0 - 1; z <= e.z0 + e.size; z++) {
      for (let x = e.x0 - 1; x <= e.x0 + e.size; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        if (x >= e.x0 && x < e.x0 + e.size && z >= e.z0 && z < e.z0 + e.size) continue;
        const i = z * n + x;
        if (this.passable(i)) out.push(i);
      }
    }
    return out;
  }

  /** A free spot next to a building, nearest `toward` (or its front), the `k`-th one. */
  _spawnSpot(b, toward, k = 0) {
    const n = this.n;
    const aim = toward ?? { x: b.x, z: b.z + 100 };
    for (let r = 1; r < 12; r++) {
      const cells = [];
      for (let z = b.z0 - r; z <= b.z0 + b.size - 1 + r; z++) {
        for (let x = b.x0 - r; x <= b.x0 + b.size - 1 + r; x++) {
          if (x < 0 || z < 0 || x >= n || z >= n) continue;
          const edge = x === b.x0 - r || x === b.x0 + b.size - 1 + r || z === b.z0 - r || z === b.z0 + b.size - 1 + r;
          if (!edge || !this.passable(z * n + x)) continue;
          cells.push([x, z]);
        }
      }
      if (cells.length > k) {
        cells.sort((a, c) => Math.hypot((a[0] + 0.5) * CELL - aim.x, (a[1] + 0.5) * CELL - aim.z) - Math.hypot((c[0] + 0.5) * CELL - aim.x, (c[1] + 0.5) * CELL - aim.z));
        const [x, z] = cells[k];
        return { x: (x + 0.5) * CELL, z: (z + 0.5) * CELL };
      }
      k -= cells.length;
    }
    return { x: b.x, z: b.z + b.size * CELL };
  }

  /** The nearest walkable cell to a point (searching outward a little). */
  _openCellNear(x, z) {
    const n = this.n;
    const c = this.cellIndex(x, z);
    if (this.passable(c)) return c;
    const cx = c % n;
    const cz = (c / n) | 0;
    for (let r = 1; r < 24; r++) {
      let best = -1;
      let bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x2 = cx + dx;
          const z2 = cz + dz;
          if (x2 < 0 || z2 < 0 || x2 >= n || z2 >= n) continue;
          const i = z2 * n + x2;
          const d = dx * dx + dz * dz;
          if (d < bestD && this.passable(i)) {
            bestD = d;
            best = i;
          }
        }
      }
      if (best >= 0) return best;
    }
    return c;
  }

  /** Can this player put a building there (its top-left cell)? */
  canPlace(seat, type, x0, z0) {
    const s = STATS[this.players[seat].faction][type];
    if (!s || s.kind !== 'building') return false;
    const n = this.n;
    if (x0 < 1 || z0 < 1 || x0 + s.size > n - 1 || z0 + s.size > n - 1) return false;
    // Keep clear of crystals: a core well clear (so workers have room), others a cell.
    const margin = type === 'core' ? 3 : 1;
    for (let z = z0 - margin; z < z0 + s.size + margin; z++) {
      for (let x = x0 - margin; x < x0 + s.size + margin; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        const inside = x >= x0 && x < x0 + s.size && z >= z0 && z < z0 + s.size;
        const i = z * n + x;
        if (inside && (this.map.block[i] !== OPEN || this.occ[i])) return false;
        if (!inside && this.occ[i] && this.entities.get(this.occ[i])?.kind === 'node') return false;
      }
    }
    return true;
  }

  /** Whether the player has what a building or unit needs (a finished building of the kind it needs). */
  unlocked(seat, type) {
    const s = STATS[this.players[seat].faction][type];
    if (!s) return false;
    const needs = s.kind === 'building' ? s.needs : s.from;
    if (!needs) return true;
    return this.buildingsOf(seat).some((b) => b.type === needs && b.built);
  }

  /* ----------------------------------------------------------- commands */

  /** A player's order, applied at the start of the next step. */
  command(seat, cmd) {
    if (this.over || !this.players[seat]?.alive) return;
    this.pending.push({ seat, ...cmd });
  }

  _apply({ seat, ...cmd }) {
    const p = this.players[seat];
    if (!p?.alive) return;
    if (cmd.type === 'surrender') {
      this._eliminate(seat);
      return;
    }
    const mine = (id) => {
      const e = this.get(id);
      return e && e.owner === seat ? e : null;
    };
    const units = (cmd.ids ?? []).map(mine).filter((e) => e?.kind === 'unit');
    const buildings = (cmd.ids ?? []).map(mine).filter((e) => e?.kind === 'building');
    const group = ++this.groupSerial;
    const near = 1.2 + Math.sqrt(units.length) * 1.3;
    const at = (x, z) => ({ x: Math.max(1, Math.min(this.map.size - 1, Number(x) || 0)), z: Math.max(1, Math.min(this.map.size - 1, Number(z) || 0)) });

    switch (cmd.type) {
      case 'move':
      case 'amove': {
        const point = at(cmd.x, cmd.z);
        for (const u of units) this._order(u, { type: cmd.type, ...point, group, near });
        break;
      }
      case 'stop':
        for (const u of units) this._order(u, { type: 'idle' });
        break;
      case 'hold':
        for (const u of units) this._order(u, { type: 'hold' });
        break;
      case 'attack': {
        const target = this.get(cmd.target);
        if (!target || target.kind === 'node') break;
        for (const u of units) if (u.type !== 'worker' || this.hostile(seat, target.owner)) this._order(u, { type: 'attack', target: target.id });
        break;
      }
      case 'gather': {
        const node = this.get(cmd.node);
        if (!node || node.kind !== 'node') break;
        for (const u of units) if (u.type === 'worker') this._order(u, { type: 'gather', node: node.id });
        break;
      }
      case 'smart':
        this._smart(seat, units, buildings, cmd, group, near);
        break;
      case 'build': {
        const worker = units.find((u) => u.type === 'worker');
        const s = STATS[p.faction][cmd.building];
        if (!worker || !s || s.kind !== 'building') break;
        const x0 = cmd.cx | 0;
        const z0 = cmd.cz | 0;
        if (!this.unlocked(seat, cmd.building) || !this.canPlace(seat, cmd.building, x0, z0) || p.shards < s.cost) break;
        p.shards -= s.cost;
        p.stats.spent += s.cost;
        this._order(worker, { type: 'build', building: cmd.building, x0, z0, paid: s.cost, back: worker.order.type === 'gather' || worker.order.type === 'return' ? worker.order.node ?? worker.lastNode : null });
        break;
      }
      case 'repair': {
        const target = this.get(cmd.target);
        if (!target || target.owner !== seat || target.kind !== 'building') break;
        for (const u of units) if (u.type === 'worker') this._order(u, { type: target.built ? 'repair' : 'construct', target: target.id });
        break;
      }
      case 'train': {
        const b = mine(cmd.building);
        if (!b || b.kind !== 'building' || !b.built || !trainsOf(b.type).includes(cmd.unit)) break;
        const s = STATS[p.faction][cmd.unit];
        if (b.queue.length >= MAX_QUEUE || p.shards < s.cost || p.used + s.supply > p.cap) break;
        p.shards -= s.cost;
        p.stats.spent += s.cost;
        p.used += s.supply;
        b.queue.push({ type: cmd.unit, t: 0 });
        break;
      }
      case 'cancel': {
        const b = mine(cmd.building);
        if (!b || b.kind !== 'building') break;
        if (!b.built) {
          // Cancel a building going up: most of its cost back.
          p.shards += Math.floor(STATS[p.faction][b.type].cost * 0.75);
          this._kill(b, -1, { quiet: true });
          break;
        }
        const job = b.queue.pop();
        if (job) {
          const s = STATS[p.faction][job.type];
          p.shards += s.cost;
          p.used -= s.supply;
        }
        break;
      }
      case 'rally': {
        const point = at(cmd.x, cmd.z);
        const node = cmd.node ? this.get(cmd.node) : null;
        for (const b of buildings) b.rally = { ...point, node: node?.kind === 'node' ? node.id : null };
        break;
      }
      default:
        break;
    }
  }

  /** A right-click: what it means depends on what is under it and who is asked. */
  _smart(seat, units, buildings, cmd, group, near) {
    const target = cmd.target ? this.get(cmd.target) : null;
    const point = { x: Math.max(1, Math.min(this.map.size - 1, Number(cmd.x) || 0)), z: Math.max(1, Math.min(this.map.size - 1, Number(cmd.z) || 0)) };
    if (target) point.x = target.x, point.z = target.z;
    const f = FACTIONS[this.players[seat].faction];
    for (const b of buildings) b.rally = { ...point, node: target?.kind === 'node' ? target.id : null };
    for (const u of units) {
      if (target?.kind === 'node') {
        this._order(u, u.type === 'worker' ? { type: 'gather', node: target.id } : { type: 'move', ...point, group, near });
      } else if (target && this.hostile(seat, target.owner)) {
        this._order(u, { type: 'attack', target: target.id });
      } else if (target?.kind === 'building' && target.owner === seat && u.type === 'worker') {
        if (!target.built && f.builds === 'attend') this._order(u, { type: 'construct', target: target.id });
        else if (u.carry > 0 && STATS[f.id][target.type].dropOff && target.built) this._order(u, { type: 'return', node: u.lastNode });
        else if (f.repair && target.built && target.hp < target.maxHp) this._order(u, { type: 'repair', target: target.id });
        else this._order(u, { type: 'move', ...point, group, near });
      } else {
        this._order(u, { type: 'move', ...point, group, near });
      }
    }
  }

  _order(u, order) {
    u.order = order;
    u.target = order.type === 'attack' ? order.target : null;
    u.still = 0;
    u.moved = 0;
    u.lineOk = false;
    u.mineT = 0;
    if (order.type !== 'gather' && order.type !== 'return' && order.type !== 'build') u.lastNode = u.lastNode ?? null;
    // A worker sent away from building gets its money back if it never started.
    return u;
  }

  /* --------------------------------------------------------------- step */

  /** One step (TICK seconds) of the match. */
  step() {
    if (this.over) return;
    for (const ai of this.computers) ai.update();
    const orders = this.pending;
    this.pending = [];
    for (const cmd of orders) this._apply(cmd);

    this._rehash();
    for (const e of this.entities.values()) {
      if (e.dead) continue;
      if (e.kind === 'unit') this._unitStep(e);
      else if (e.kind === 'building') this._buildingStep(e);
    }
    this._separate();
    this._projectiles();
    this._sweep();
    this._supply();
    if (this.tick % SIGHT_EVERY === 0) this._vision();
    this._checkEnd();
    this.tick++;
  }

  _rehash() {
    this.hash.clear();
    for (const e of this.entities.values()) {
      if (e.dead || e.kind === 'node') continue;
      const k = Math.floor(e.x / BUCKET) + Math.floor(e.z / BUCKET) * 4096;
      let list = this.hash.get(k);
      if (!list) this.hash.set(k, (list = []));
      list.push(e);
    }
  }

  /** Everything (units and buildings) within `r` of a point. */
  near(x, z, r) {
    const out = [];
    const reach = r + 6; // a core's half-width, so big buildings are found by their edge
    const x0 = Math.floor((x - reach) / BUCKET);
    const x1 = Math.floor((x + reach) / BUCKET);
    const z0 = Math.floor((z - reach) / BUCKET);
    const z1 = Math.floor((z + reach) / BUCKET);
    for (let bz = z0; bz <= z1; bz++) {
      for (let bx = x0; bx <= x1; bx++) {
        const list = this.hash.get(bx + bz * 4096);
        if (list) for (const e of list) if (!e.dead) out.push(e);
      }
    }
    return out;
  }

  /** The best enemy for `u` within `r` (edge to edge): fighters first, then the nearest. */
  _enemyNear(u, r, s) {
    let best = null;
    let bestScore = Infinity;
    for (const e of this.near(u.x, u.z, r)) {
      if (!this.hostile(u.owner, e.owner)) continue;
      const g = this.gap(u, e);
      if (g > r) continue;
      if (s.minRange && g < s.minRange) continue;
      let score = g;
      if (e.kind === 'building') score += e.type === 'tower' ? 2 : 10;
      else if (e.type === 'worker') score += 3;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  _unitStep(u) {
    const s = STATS[this.players[u.owner].faction][u.type];
    u.px = u.x;
    u.pz = u.z;
    if (u.cooldown > 0) u.cooldown -= TICK;
    this._regen(u);
    const o = u.order;
    const think = (this.tick + u.id) % 4 === 0;

    switch (o.type) {
      case 'idle':
      case 'hold': {
        if (u.type === 'worker' || !think) break;
        const reach = o.type === 'hold' ? s.range : Math.max(s.range, s.sight * 0.85);
        const enemy = this._enemyNear(u, reach, s);
        if (enemy) {
          if (o.type === 'hold') {
            u.target = enemy.id;
            this._fireAt(u, enemy, s);
          } else {
            u.order = { type: 'attack', target: enemy.id, auto: true, home: { x: u.x, z: u.z } };
            u.target = enemy.id;
          }
        }
        if (o.type === 'hold' && u.target) {
          const t = this.get(u.target);
          if (t && this.gap(u, t) <= s.range) this._fireAt(u, t, s);
        }
        break;
      }
      case 'move': {
        const done = this._walk(u, s, o.x, o.z, `p:${this._goalCell(o)}`, () => [this._goalCell(o)], o);
        if (done) this._order(u, { type: 'idle' });
        break;
      }
      case 'amove': {
        let t = u.target ? this.get(u.target) : null;
        if (t && (!this.hostile(u.owner, t.owner) || this.gap(u, t) > s.sight + 4)) t = u.target = null;
        if (!t && think) {
          const enemy = this._enemyNear(u, Math.max(s.range, s.sight * 0.85), s);
          if (enemy) u.target = (t = enemy).id;
        }
        if (t) {
          this._engage(u, s, t);
          break;
        }
        const done = this._walk(u, s, o.x, o.z, `p:${this._goalCell(o)}`, () => [this._goalCell(o)], o);
        if (done) this._order(u, { type: 'idle' });
        break;
      }
      case 'attack': {
        const t = this.get(o.target);
        if (!t) {
          if (o.auto && o.home) this._order(u, { type: 'idle' });
          else this._order(u, { type: 'idle' });
          break;
        }
        if (o.auto && o.home && Math.hypot(u.x - o.home.x, u.z - o.home.z) > LEASH) {
          this._order(u, { type: 'move', x: o.home.x, z: o.home.z, group: 0, near: 1.5 });
          break;
        }
        // A smarter pick while auto-fighting: whoever is shooting at us up close.
        if (o.auto && think && t.kind === 'building') {
          const enemy = this._enemyNear(u, Math.max(s.range, 8), s);
          if (enemy && enemy.kind === 'unit') o.target = u.target = enemy.id;
        }
        this._engage(u, s, this.get(o.target) ?? t);
        break;
      }
      case 'gather':
        this._gather(u, s);
        break;
      case 'return':
        this._return(u, s);
        break;
      case 'build':
        this._build(u, s);
        break;
      case 'construct':
      case 'repair': {
        const b = this.get(o.target);
        if (!b || (o.type === 'construct' && b.built) || (o.type === 'repair' && b.hp >= b.maxHp)) {
          this._afterBuild(u);
          break;
        }
        if (this.gap(u, b) > 1.1) {
          this._walk(u, s, b.x, b.z, `e:${b.id}`, () => this.ring(b), null);
          break;
        }
        this._face(u, b.x, b.z);
        if (o.type === 'construct') b.attended = this.tick;
        else b.hp = Math.min(b.maxHp, b.hp + 14 * TICK);
        break;
      }
      default:
        this._order(u, { type: 'idle' });
    }
  }

  _regen(e) {
    const regen = FACTIONS[this.players[e.owner].faction].regen;
    if (regen && e.hp < e.maxHp && (e.kind === 'unit' || e.built)) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * regen * TICK);
  }

  _goalCell(o) {
    if (o.cell == null) o.cell = this._openCellNear(o.x, o.z);
    return o.cell;
  }

  /** Close in on a target and fire when in range. */
  _engage(u, s, t) {
    const g = this.gap(u, t);
    if (g <= s.range && !(s.minRange && g < s.minRange)) {
      this._fireAt(u, t, s);
      return;
    }
    if (s.minRange && g < s.minRange) {
      // Too close to fire: back off.
      const dx = u.x - t.x;
      const dz = u.z - t.z;
      const l = Math.hypot(dx, dz) || 1;
      this._stepToward(u, s, u.x + (dx / l) * 4, u.z + (dz / l) * 4);
      return;
    }
    const key = t.kind === 'unit' ? `p:${this.cellIndex(t.x, t.z)}` : `e:${t.id}`;
    this._walk(u, s, t.x, t.z, key, () => (t.kind === 'unit' ? [this.cellIndex(t.x, t.z)] : this.ring(t)), null);
  }

  _face(u, x, z) {
    if (Math.abs(x - u.x) + Math.abs(z - u.z) > 0.01) u.angle = Math.atan2(x - u.x, z - u.z);
  }

  _fireAt(u, t, s) {
    this._face(u, t.x, t.z);
    if (u.cooldown > 0) return;
    u.cooldown = s.cooldown;
    this._shoot(u.owner, u, t, s.damage, s.splash ?? 0, u.type);
  }

  _shoot(owner, from, t, damage, splash, kind) {
    const dist = Math.hypot(from.x - t.x, from.z - t.z);
    const melee = (kind === 'heavy' || kind === 'raider' && this.players[owner].faction !== 'league' || kind === 'worker');
    if (melee) {
      this._damage(t, damage, owner);
      this._event({ type: 'hit', x: t.x, z: t.z, owner, kind });
      return;
    }
    const speed = kind === 'siege' ? 22 : 55;
    this.projectiles.push({ owner, x: from.x, z: from.z, tx: t.x, tz: t.z, target: t.id, t: 0, dur: Math.max(0.05, dist / speed), damage, splash, kind });
    this._event({ type: 'shot', from: from.id, x: from.x, z: from.z, tx: t.x, tz: t.z, dur: Math.max(0.05, dist / speed), owner, kind, faction: this.players[owner].faction });
  }

  _projectiles() {
    const keep = [];
    for (const p of this.projectiles) {
      p.t += TICK;
      const t = this.get(p.target);
      if (t) {
        p.tx = t.x;
        p.tz = t.z;
      }
      if (p.t < p.dur) {
        keep.push(p);
        continue;
      }
      if (p.splash) {
        for (const e of this.near(p.tx, p.tz, p.splash)) {
          if (!this.hostile(p.owner, e.owner)) continue;
          const d = e.kind === 'unit' ? Math.hypot(e.x - p.tx, e.z - p.tz) - e.radius : this.gap({ kind: 'unit', x: p.tx, z: p.tz, radius: 0 }, e);
          if (d <= p.splash) this._damage(e, d <= p.splash / 3 ? p.damage : p.damage * 0.5, p.owner);
        }
        this._event({ type: 'blast', x: p.tx, z: p.tz, r: p.splash, owner: p.owner });
      } else if (t) {
        this._damage(t, p.damage, p.owner);
      }
    }
    this.projectiles = keep;
  }

  _damage(e, amount, by) {
    if (e.dead) return;
    const dealt = Math.max(1, amount - (e.armor ?? 0));
    e.hp -= dealt;
    e.lastHurt = this.tick;
    const p = this.players[e.owner];
    if (p) {
      p.lastAttacked = { tick: this.tick, x: e.x, z: e.z };
      if (this.tick - p.lastAlert > ALERT_GAP) {
        p.lastAlert = this.tick;
        this._event({ type: 'alert', seat: e.owner, x: e.x, z: e.z, what: e.kind });
      }
    }
    // Hurt and idle: answer back.
    if (e.kind === 'unit' && e.order.type === 'idle' && e.type !== 'worker' && by >= 0) {
      const s = this.stats(e);
      const enemy = this._enemyNear(e, Math.max(s.range, s.sight), s);
      if (enemy) e.order = { type: 'attack', target: enemy.id, auto: true, home: { x: e.x, z: e.z } };
    }
    if (e.hp <= 0) this._kill(e, by);
  }

  _kill(e, by, { quiet = false } = {}) {
    if (e.dead) return;
    e.dead = true;
    e.hp = 0;
    if (e.owner >= 0) {
      this.players[e.owner].stats.lost += quiet ? 0 : 1;
      if (by >= 0 && by !== e.owner) this.players[by].stats.killed++;
    }
    if (e.kind === 'building' || e.kind === 'node') {
      for (let z = e.z0; z < e.z0 + e.size; z++) for (let x = e.x0; x < e.x0 + e.size; x++) if (this.occ[z * this.n + x] === e.id) this.occ[z * this.n + x] = 0;
      this.flows.reset();
      if (e.kind === 'building') {
        // Paid-for training is lost with it; supply comes back.
        for (const job of e.queue) this.players[e.owner].used -= STATS[this.players[e.owner].faction][job.type].supply;
        e.queue = [];
      }
    }
    this._event({ type: 'death', id: e.id, kind: e.kind, unitType: e.type, owner: e.owner, x: e.x, z: e.z, size: e.size ?? 1, quiet });
  }

  _sweep() {
    for (const [id, e] of this.entities) if (e.dead) this.entities.delete(id);
  }

  /* -------------------------------------------------------------- moving */

  /**
   * Walk toward (x, z): straight when the way is clear, else down the flow
   * field `key`. Returns true on arrival (only when `group` is given, which
   * says how close is close enough).
   */
  _walk(u, s, x, z, key, goals, group) {
    const d = Math.hypot(x - u.x, z - u.z);
    if (group) {
      if (d <= group.near) return true;
      // Bumping into a groupmate who has already arrived counts as arriving.
      if (d <= group.near * 2.5 && group.group) {
        for (const o of this.near(u.x, u.z, 3)) {
          if (o === u || o.kind !== 'unit' || o.owner !== u.owner || o.arrived !== group.group) continue;
          if (Math.hypot(o.x - u.x, o.z - u.z) <= o.radius + u.radius + 0.6) {
            u.arrived = group.group;
            return true;
          }
        }
      }
      u.still = u.moved < 0.02 ? u.still + 1 : 0;
      if (u.still > 30 && d <= group.near * 4) {
        u.arrived = group.group;
        return true;
      }
      if (u.still > 160) return true; // stuck for good
    }
    if ((this.tick + u.id) % 6 === 0) u.lineOk = d < 36 && this._clearLine(u.x, u.z, x, z);
    let ax = x;
    let az = z;
    if (!u.lineOk) {
      const field = this.flows.field(key, goals);
      const i = this.cellIndex(u.x, u.z);
      if (field[i] === Infinity && this.passable(i)) {
        if (group) return true; // can't get there from here
        u.still++;
        return false;
      }
      const j = this.flows.next(field, i);
      if (j >= 0) {
        ax = ((j % this.n) + 0.5) * CELL;
        az = (((j / this.n) | 0) + 0.5) * CELL;
      }
    }
    const before = { x: u.x, z: u.z };
    this._stepToward(u, s, ax, az, d);
    u.moved = Math.hypot(u.x - before.x, u.z - before.z);
    if (group && d <= group.near) u.arrived = group.group;
    return false;
  }

  _stepToward(u, s, ax, az, limit = Infinity) {
    const dx = ax - u.x;
    const dz = az - u.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-3) return;
    const step = Math.min(s.speed * TICK, l, limit);
    const nx = u.x + (dx / l) * step;
    const nz = u.z + (dz / l) * step;
    this._face(u, ax, az);
    this._place(u, nx, nz);
  }

  /** Move a unit, sliding along walls instead of into them. */
  _place(u, nx, nz) {
    const here = this.cellIndex(u.x, u.z);
    const ok = (x, z) => {
      if (x < CELL || z < CELL || x > this.map.size - CELL || z > this.map.size - CELL) return false;
      const c = this.cellIndex(x, z);
      return this.passable(c) || (c === here && !this.passable(here)) || !this.passable(here);
    };
    if (ok(nx, nz)) {
      u.x = nx;
      u.z = nz;
    } else if (ok(nx, u.z)) {
      u.x = nx;
    } else if (ok(u.x, nz)) {
      u.z = nz;
    }
  }

  _clearLine(x0, z0, x1, z1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (CELL * 0.5));
    for (let i = 1; i < steps; i++) {
      const c = this.cellIndex(x0 + ((x1 - x0) * i) / steps, z0 + ((z1 - z0) * i) / steps);
      if (!this.passable(c)) return false;
    }
    return true;
  }

  /** Units push each other apart; workers at work pass through each other. */
  _separate() {
    for (const list of this.hash.values()) {
      for (const a of list) {
        if (a.kind !== 'unit' || a.dead) continue;
        const busyA = a.order.type === 'gather' || a.order.type === 'return';
        for (const b of this.near(a.x, a.z, 3)) {
          if (b.id <= a.id || b.kind !== 'unit' || b.dead) continue;
          const busyB = b.order.type === 'gather' || b.order.type === 'return';
          if (busyA && busyB) continue;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          const overlap = a.radius + b.radius - d;
          if (overlap <= 0) continue;
          const nx = d > 1e-4 ? dx / d : Math.cos(a.id);
          const nz = d > 1e-4 ? dz / d : Math.sin(a.id);
          const movingA = a.order.type !== 'idle' && a.order.type !== 'hold';
          const movingB = b.order.type !== 'idle' && b.order.type !== 'hold';
          let wa = 0.5;
          if (movingA && !movingB) wa = 0.2;
          else if (!movingA && movingB) wa = 0.8;
          if (a.order.type === 'hold') wa = 0;
          if (b.order.type === 'hold') wa = 1;
          const push = Math.min(overlap, 0.6);
          this._place(a, a.x - nx * push * wa, a.z - nz * push * wa);
          this._place(b, b.x + nx * push * (1 - wa), b.z + nz * push * (1 - wa));
        }
      }
    }
  }

  /* ------------------------------------------------------------- working */

  _gather(u, s) {
    const o = u.order;
    if (u.carry >= CARRY) {
      this._order(u, { type: 'return', node: o.node });
      return;
    }
    let node = this.get(o.node);
    if (!node) {
      node = this._nodeNear(u.x, u.z, 30);
      if (!node) {
        this._order(u, { type: 'idle' });
        return;
      }
      o.node = node.id;
    }
    u.lastNode = node.id;
    if (this.gap(u, node) > 1.0) {
      u.mineT = 0;
      this._walk(u, s, node.x, node.z, `e:${node.id}`, () => this.ring(node), null);
      return;
    }
    this._face(u, node.x, node.z);
    u.mineT += TICK;
    if (u.mineT < MINE_TIME) return;
    u.mineT = 0;
    const take = Math.min(CARRY, node.amount);
    node.amount -= take;
    u.carry = take;
    if (node.amount <= 0) this._kill(node, -1, { quiet: true });
    this._order(u, { type: 'return', node: node.id });
  }

  _nodeNear(x, z, r) {
    let best = null;
    let bestD = r;
    for (const e of this.entities.values()) {
      if (e.kind !== 'node' || e.dead) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  _dropOff(u) {
    let best = null;
    let bestD = Infinity;
    for (const b of this.entities.values()) {
      if (b.kind !== 'building' || b.dead || b.owner !== u.owner || !b.built || !STATS[this.players[b.owner].faction][b.type].dropOff) continue;
      const d = Math.hypot(b.x - u.x, b.z - u.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  _return(u, s) {
    const o = u.order;
    if (!u.carry) {
      this._order(u, { type: 'gather', node: o.node });
      return;
    }
    const b = this._dropOff(u);
    if (!b) {
      this._order(u, { type: 'idle' });
      return;
    }
    if (this.gap(u, b) > 1.0) {
      this._walk(u, s, b.x, b.z, `e:${b.id}`, () => this.ring(b), null);
      return;
    }
    const p = this.players[u.owner];
    p.shards += u.carry;
    p.stats.gathered += u.carry;
    this._event({ type: 'deliver', x: u.x, z: u.z, owner: u.owner, amount: u.carry });
    u.carry = 0;
    const node = this.get(o.node) ?? this._nodeNear(u.x, u.z, 34);
    if (node) this._order(u, { type: 'gather', node: node.id });
    else this._order(u, { type: 'idle' });
  }

  _build(u, s) {
    const o = u.order;
    const p = this.players[u.owner];
    const st = STATS[p.faction][o.building];
    const cx = (o.x0 + st.size / 2) * CELL;
    const cz = (o.z0 + st.size / 2) * CELL;
    const half = (st.size * CELL) / 2;
    const gap = Math.hypot(Math.max(Math.abs(u.x - cx) - half, 0), Math.max(Math.abs(u.z - cz) - half, 0)) - u.radius;
    if (gap > 1.2) {
      const key = `b:${o.x0},${o.z0},${st.size}`;
      this._walk(u, s, cx, cz, key, () => this._siteRing(o.x0, o.z0, st.size), null);
      if (u.still > 120) this._refund(u);
      return;
    }
    if (!this.canPlace(u.owner, o.building, o.x0, o.z0)) {
      this._refund(u);
      return;
    }
    const b = this._building(u.owner, o.building, o.x0, o.z0, false);
    p.stats.built++;
    this._event({ type: 'placed', id: b.id, owner: u.owner, x: b.x, z: b.z });
    if (FACTIONS[p.faction].builds === 'attend') this._order(u, { type: 'construct', target: b.id, back: o.back });
    else this._afterBuild(u, o.back);
  }

  _siteRing(x0, z0, size) {
    const out = [];
    const n = this.n;
    for (let z = z0 - 1; z <= z0 + size; z++) {
      for (let x = x0 - 1; x <= x0 + size; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        if (x >= x0 && x < x0 + size && z >= z0 && z < z0 + size) continue;
        if (this.passable(z * n + x)) out.push(z * n + x);
      }
    }
    return out;
  }

  _refund(u) {
    const o = u.order;
    if (o.paid) {
      this.players[u.owner].shards += o.paid;
      this.players[u.owner].stats.spent -= o.paid;
    }
    this._event({ type: 'cant-build', owner: u.owner, x: u.x, z: u.z });
    this._afterBuild(u, o.back);
  }

  /** Done building: back to the crystals it came from, if any. */
  _afterBuild(u, back = u.order.back) {
    const node = back ? this.get(back) : null;
    this._order(u, node ? { type: 'gather', node: node.id } : { type: 'idle' });
  }

  _buildingStep(b) {
    const p = this.players[b.owner];
    const s = STATS[p.faction][b.type];
    this._regen(b);
    if (!b.built) {
      const self = FACTIONS[p.faction].builds === 'self';
      if (self || b.attended >= this.tick - 1) {
        const step = TICK / s.time;
        b.progress = Math.min(1, b.progress + step);
        b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * step);
        if (b.progress >= 1) {
          b.built = true;
          this._event({ type: 'built', id: b.id, owner: b.owner, x: b.x, z: b.z, building: b.type });
        }
      }
      return;
    }
    if (b.queue.length) {
      const job = b.queue[0];
      job.t += TICK;
      const us = STATS[p.faction][job.type];
      if (job.t >= us.time) {
        b.queue.shift();
        const spot = this._spawnSpot(b, b.rally, 0);
        const u = this._unit(b.owner, job.type, spot.x, spot.z);
        this._event({ type: 'trained', id: u.id, owner: b.owner, unitType: job.type });
        if (b.rally) {
          const node = b.rally.node ? this.get(b.rally.node) : null;
          if (node && u.type === 'worker') this._order(u, { type: 'gather', node: node.id });
          else this._order(u, { type: u.type === 'worker' ? 'move' : 'amove', x: b.rally.x, z: b.rally.z, group: ++this.groupSerial, near: 2.5 });
        } else if (u.type === 'worker') {
          const node = this._nodeNear(b.x, b.z, 30);
          if (node) this._order(u, { type: 'gather', node: node.id });
        }
      }
    }
    if (s.damage) {
      if (b.cooldown > 0) b.cooldown -= TICK;
      if (b.cooldown <= 0 && (this.tick + b.id) % 2 === 0) {
        let t = b.target ? this.get(b.target) : null;
        if (!t || this.gap(b, t) > s.range) {
          t = null;
          let bestD = Infinity;
          for (const e of this.near(b.x, b.z, s.range + 2)) {
            if (!this.hostile(b.owner, e.owner)) continue;
            const g = this.gap(b, e);
            const score = g + (e.kind === 'building' ? 20 : 0);
            if (g <= s.range && score < bestD) {
              bestD = score;
              t = e;
            }
          }
          b.target = t?.id ?? null;
        }
        if (t) {
          b.cooldown = s.cooldown;
          this._shoot(b.owner, b, t, s.damage, 0, 'tower');
        }
      }
    }
  }

  /* ------------------------------------------------------------ bookkeeping */

  _supply() {
    for (const p of this.players) {
      p.cap = 0;
      p.used = 0;
    }
    for (const e of this.entities.values()) {
      if (e.dead || e.owner < 0) continue;
      const p = this.players[e.owner];
      const s = STATS[p.faction][e.type];
      if (e.kind === 'unit') p.used += s.supply;
      else if (e.kind === 'building') {
        if (e.built) p.cap += s.supply;
        for (const job of e.queue) p.used += STATS[p.faction][job.type].supply;
      }
    }
    for (const p of this.players) p.cap = Math.min(MAX_SUPPLY, p.cap);
  }

  _vision() {
    const n = this.n;
    for (const p of this.players) p.vision.fill(0);
    for (const e of this.entities.values()) {
      if (e.dead || e.owner < 0) continue;
      const p = this.players[e.owner];
      const s = STATS[p.faction][e.type];
      const r = Math.ceil((e.kind === 'building' && !e.built ? 6 : s.sight) / CELL);
      const cx = Math.floor(e.x / CELL);
      const cz = Math.floor(e.z / CELL);
      for (let dz = -r; dz <= r; dz++) {
        const z = cz + dz;
        if (z < 0 || z >= n) continue;
        const w = Math.floor(Math.sqrt(r * r - dz * dz));
        const row = z * n;
        for (let x = Math.max(0, cx - w); x <= Math.min(n - 1, cx + w); x++) p.vision[row + x] = 1;
      }
    }
    // Allies share what they see.
    for (const p of this.players) {
      for (const q of this.players) {
        if (q === p || q.team !== p.team) continue;
        for (let i = 0; i < n * n; i++) if (q.vision[i]) p.vision[i] = 1;
      }
    }
    for (const p of this.players) {
      for (let i = 0; i < n * n; i++) if (p.vision[i]) p.explored[i] = 1;
    }
    for (const e of this.entities.values()) {
      if (e.kind !== 'building' || e.dead) continue;
      const c = this.cellIndex(e.x, e.z);
      for (const p of this.players) if (p.vision[c]) e.seen |= 1 << p.seat;
    }
  }

  /** Whether `seat` can see this entity now. */
  visible(seat, e) {
    if (e.owner === seat) return true;
    const p = this.players[seat];
    if (e.kind === 'building' || e.kind === 'node') {
      const r = Math.floor(e.size / 2);
      for (const [dx, dz] of [[0, 0], [-r, -r], [r, r], [-r, r], [r, -r]]) if (p.vision[this.cellIndex(e.x + dx * CELL, e.z + dz * CELL)]) return true;
      return false;
    }
    return Boolean(p.vision[this.cellIndex(e.x, e.z)]);
  }

  _eliminate(seat) {
    const p = this.players[seat];
    if (!p.alive) return;
    p.alive = false;
    for (const e of this.entities.values()) if (e.owner === seat && !e.dead) this._kill(e, -1, { quiet: true });
    this._event({ type: 'eliminated', seat });
  }

  _checkEnd() {
    const hasBuilding = new Set();
    for (const e of this.entities.values()) if (e.kind === 'building' && !e.dead) hasBuilding.add(e.owner);
    for (const p of this.players) if (p.alive && !hasBuilding.has(p.seat)) this._eliminate(p.seat);
    const teams = new Set(this.players.filter((p) => p.alive).map((p) => p.team));
    if (teams.size <= 1) {
      const team = teams.size ? [...teams][0] : null;
      this.over = { team, tick: this.tick, winners: this.players.filter((p) => p.team === team).map((p) => p.seat) };
      this._event({ type: 'over', ...this.over });
    }
  }

  /** A short fingerprint of the match, to check two runs stayed the same. */
  fingerprint() {
    let h = 2166136261;
    const mix = (v) => {
      h ^= Math.round(v * 100) | 0;
      h = Math.imul(h, 16777619);
    };
    mix(this.tick);
    for (const e of this.entities.values()) {
      mix(e.id);
      mix(e.x);
      mix(e.z);
      mix(e.hp);
    }
    for (const p of this.players) mix(p.shards);
    return (h >>> 0).toString(16);
  }

  /** Game seconds so far. */
  get seconds() {
    return this.tick * TICK;
  }
}

export { isUnitType, isBuildingType };
