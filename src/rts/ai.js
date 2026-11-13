import { STATS, DIFFICULTIES, MAX_SUPPLY, TICK, CELL } from './rules.js';

/**
 * A computer player. It only sends commands — the same ones a person's
 * clicks send — so it can't do anything a person couldn't. Every so often
 * (by difficulty) it looks at its base and decides: workers to the crystals,
 * more workers, supply, buildings, an army, a new base, and when the army is
 * big enough, an attack on the nearest enemy it knows of. When its base is
 * hit, the army comes home.
 */
export class ComputerPlayer {
  constructor(sim, seat, difficulty = 'normal') {
    this.sim = sim;
    this.seat = seat;
    this.level = DIFFICULTIES[difficulty] ? difficulty : 'normal';
    this.d = DIFFICULTIES[this.level];
    this.every = Math.max(1, Math.round(this.d.think / TICK));
    this.attackAt = this.d.attackAt;
    this.attacking = null;
    this.waves = 0;
  }

  get p() {
    return this.sim.players[this.seat];
  }

  update() {
    const sim = this.sim;
    if (!this.p.alive || (sim.tick + this.seat * 7) % this.every !== 0) return;
    const units = sim.unitsOf(this.seat);
    const buildings = sim.buildingsOf(this.seat);
    const workers = units.filter((u) => u.type === 'worker');
    const army = units.filter((u) => u.type !== 'worker');
    const stats = STATS[this.p.faction];
    const count = (type) => buildings.filter((b) => b.type === type).length + workers.filter((w) => w.order.type === 'build' && w.order.building === type).length;
    const built = (type) => buildings.filter((b) => b.type === type && b.built);
    const building = (type) => buildings.some((b) => b.type === type && !b.built) || workers.some((w) => w.order.type === 'build' && w.order.building === type);
    const minutes = sim.seconds / 60;
    const cores = built('core');
    if (!cores.length && !buildings.some((b) => b.type === 'core')) {
      // No base left to work from: everyone fights.
      this._attack(army.concat(workers), true);
      return;
    }
    const home = cores[0] ?? buildings[0];
    // Crystals left by our bases: running low means it's time for a new base.
    const nodes = sim.nodes();
    const nearHome = nodes.filter((nd) => cores.some((c) => Math.hypot(c.x - nd.x, c.z - nd.z) < 30));
    const left = nearHome.reduce((n, nd) => n + nd.amount, 0);
    const site = minutes > 3 && count('core') < 5 ? this._freeSite(home) : null;
    const expand = Boolean(site) && !building('core') && (left < 2500 * Math.max(1, cores.length) || count('core') < 1 + Math.floor((minutes - 4) / 4));
    // Save for it: nothing but workers and urgent supply is bought until the base is down.
    this.reserve = expand ? stats.core.cost : 0;

    // Idle workers go to work: crystals by a base, else the nearest anywhere.
    for (const w of workers) {
      if (w.order.type !== 'idle') continue;
      const node = this._nodeFor(w, cores) ?? this._nodeFor(w, null);
      if (node) sim.command(this.seat, { type: 'gather', ids: [w.id], node: node.id });
    }
    if (expand && this.p.shards >= stats.core.cost) this._build('core', workers, home, { at: site });
    // Nothing left to mine and no money to move: everything attacks.
    if (!nodes.length && this.p.shards < stats.light.cost) {
      this._attack(army.concat(workers), true);
      return;
    }

    // More workers, up to what the bases can use.
    const queuedWorkers = cores.reduce((n, c) => n + c.queue.filter((j) => j.type === 'worker').length, 0);
    const wantWorkers = Math.min(this.d.workers * Math.max(1, cores.length), 60);
    for (const core of cores) {
      if (workers.length + queuedWorkers >= wantWorkers || core.queue.length >= 1) continue;
      if (this._afford('worker')) sim.command(this.seat, { type: 'train', building: core.id, unit: 'worker' });
    }

    // Supply before it runs out.
    const producers = built('barracks').length + built('workshop').length + cores.length;
    const room = this.p.cap - this.p.used;
    if (this.p.cap < MAX_SUPPLY && room < Math.min(10, 3 + producers * 2) && !building('depot') && (room < 3 || !this.reserve)) this._build('depot', workers, home);

    // Buildings, in order (not while saving for a new base).
    if (!this.reserve) {
      if (workers.length >= 8 && count('barracks') < 1) this._build('barracks', workers, home);
      else if (built('barracks').length && count('barracks') < Math.min(this.d.barracks + (this.p.shards > 600 ? 1 : 0), 1 + Math.floor(minutes / 3))) this._build('barracks', workers, home);
      if (built('barracks').length && minutes > 3.5 && count('workshop') < (this.level === 'hard' ? 2 : 1) && this.level !== 'easy') this._build('workshop', workers, home);
      if (built('barracks').length && minutes > 4 && count('tower') < this.d.towers) this._build('tower', workers, home, { front: true });
    }

    // The army.
    for (const b of buildings) {
      if (!b.built || b.queue.length >= 2 || (b.type !== 'barracks' && b.type !== 'workshop')) continue;
      const pick = this._unitFor(b.type, army);
      if (pick && this._afford(pick) && this.p.shards - STATS[this.p.faction][pick].cost >= this.reserve) sim.command(this.seat, { type: 'train', building: b.id, unit: pick });
    }

    this._fight(army, buildings);
  }

  _afford(type) {
    const s = STATS[this.p.faction][type];
    return this.p.shards >= s.cost && this.p.used + s.supply <= this.p.cap;
  }

  _unitFor(from, army) {
    const n = (t) => army.filter((u) => u.type === t).length;
    if (from === 'barracks') return n('raider') * 2 < n('light') ? 'raider' : 'light';
    return n('siege') * 2 < n('heavy') || n('heavy') === 0 ? (n('heavy') === 0 ? 'heavy' : 'siege') : 'heavy';
  }

  _nodeFor(w, cores) {
    let best = null;
    let bestD = Infinity;
    for (const node of this.sim.nodes()) {
      // Crystals near one of our bases, the closest to this worker.
      const near = !cores || cores.some((c) => Math.hypot(c.x - node.x, c.z - node.z) < 30);
      if (!near) continue;
      const d = Math.hypot(node.x - w.x, node.z - w.z);
      if (d < bestD) {
        bestD = d;
        best = node;
      }
    }
    return best;
  }

  /** The nearest base site with crystals and nobody's base on it. */
  _freeSite(home) {
    const sim = this.sim;
    let best = null;
    let bestD = Infinity;
    for (const site of sim.map.sites) {
      const x = (site.cx + 0.5) * CELL;
      const z = (site.cz + 0.5) * CELL;
      const occupied = [...sim.entities.values()].some((e) => e.kind === 'building' && !e.dead && Math.hypot(e.x - x, e.z - z) < 14);
      if (occupied) continue;
      const crystals = sim.nodes().some((nd) => Math.hypot(nd.x - x, nd.z - z) < 24);
      if (!crystals || !sim.canPlace(this.seat, 'core', site.cx - 2, site.cz - 2)) continue;
      const d = Math.hypot(x - home.x, z - home.z);
      if (d < bestD) {
        bestD = d;
        best = { x0: site.cx - 2, z0: site.cz - 2 };
      }
    }
    return best;
  }

  /** Put a building up near home: off the crystal line, a cell clear of others. */
  _build(type, workers, home, { at = null, front = false } = {}) {
    const sim = this.sim;
    const s = STATS[this.p.faction][type];
    if (this.p.shards < s.cost || !sim.unlocked(this.seat, type)) return false;
    const spot = at ?? this._spot(type, home, front);
    if (!spot) return false;
    const cx = (spot.x0 + s.size / 2) * CELL;
    const cz = (spot.z0 + s.size / 2) * CELL;
    let worker = null;
    let bestD = Infinity;
    for (const w of workers) {
      if (w.order.type === 'build' || w.order.type === 'construct') continue;
      const d = Math.hypot(w.x - cx, w.z - cz) + (w.carry ? 20 : 0);
      if (d < bestD) {
        bestD = d;
        worker = w;
      }
    }
    if (!worker) return false;
    sim.command(this.seat, { type: 'build', ids: [worker.id], building: type, cx: spot.x0, cz: spot.z0 });
    return true;
  }

  _spot(type, home, front) {
    const sim = this.sim;
    const s = STATS[this.p.faction][type];
    const n = sim.n;
    const hx = Math.floor(home.x / CELL);
    const hz = Math.floor(home.z / CELL);
    const nodes = sim.nodes().filter((nd) => Math.hypot(nd.x - home.x, nd.z - home.z) < 30);
    // Toward the middle of the map (for a tower), else anywhere around.
    const mid = n / 2;
    const toward = Math.atan2(mid - hz, mid - hx);
    // Sites already promised to a worker on its way: not those again.
    const promised = sim.unitsOf(this.seat).filter((w) => w.order.type === 'build').map((w) => ({ x0: w.order.x0, z0: w.order.z0, size: STATS[this.p.faction][w.order.building].size }));
    const clash = (x0, z0) => promised.some((p) => x0 < p.x0 + p.size + 1 && x0 + s.size + 1 > p.x0 && z0 < p.z0 + p.size + 1 && z0 + s.size + 1 > p.z0);
    for (let r = 5; r < 20; r++) {
      const steps = Math.max(8, r * 4);
      for (let k = 0; k < steps; k++) {
        const a = front ? toward + ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI) / steps : (k / steps) * Math.PI * 2 + this.seat;
        const x0 = Math.round(hx + Math.cos(a) * r - s.size / 2);
        const z0 = Math.round(hz + Math.sin(a) * r - s.size / 2);
        const cx = (x0 + s.size / 2) * CELL;
        const cz = (z0 + s.size / 2) * CELL;
        if (nodes.some((nd) => Math.hypot(nd.x - cx, nd.z - cz) < 9 + s.size)) continue;
        if (clash(x0, z0) || !sim.canPlace(this.seat, type, x0, z0) || !this._roomAround(x0, z0, s.size)) continue;
        return { x0, z0 };
      }
    }
    return null;
  }

  /** A cell of space around, so buildings don't wall the base in. */
  _roomAround(x0, z0, size) {
    const sim = this.sim;
    const n = sim.n;
    for (let z = z0 - 1; z <= z0 + size; z++) {
      for (let x = x0 - 1; x <= x0 + size; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) return false;
        if (sim.occ[z * n + x]) return false;
      }
    }
    return true;
  }

  _fight(army, buildings) {
    const sim = this.sim;
    const supply = army.reduce((n, u) => n + STATS[this.p.faction][u.type].supply, 0);
    const hit = this.p.lastAttacked;
    const underAttack = hit && sim.tick - hit.tick < 4 / TICK && buildings.some((b) => Math.hypot(b.x - hit.x, b.z - hit.z) < 30);
    if (underAttack && !this.attacking) {
      const free = army.filter((u) => u.order.type === 'idle' || u.order.type === 'move');
      if (free.length) sim.command(this.seat, { type: 'amove', ids: free.map((u) => u.id), x: hit.x, z: hit.z });
      return;
    }
    if (this.attacking) {
      if (army.length < 3) {
        // The wave is spent: build the next, bigger one.
        this.attacking = null;
        this.attackAt = Math.min(80, this.attackAt + this.d.grow);
        return;
      }
      this._attack(army);
      return;
    }
    if (supply >= this.attackAt) {
      this.waves++;
      this._attack(army);
    }
  }

  _attack(army, all = false) {
    const sim = this.sim;
    const target = this._target();
    if (!target) return;
    this.attacking = target;
    const send = all ? army : army.filter((u) => u.order.type === 'idle' || u.order.type === 'hold' || (u.order.type === 'amove' && Math.hypot(u.order.x - target.x, u.order.z - target.z) > 1));
    if (send.length) sim.command(this.seat, { type: 'amove', ids: send.map((u) => u.id), x: target.x, z: target.z });
  }

  /** The nearest enemy building it has seen — or, never having seen one, the nearest enemy start. */
  _target() {
    const sim = this.sim;
    const home = sim.buildingsOf(this.seat)[0] ?? sim.unitsOf(this.seat)[0];
    if (!home) return null;
    let best = null;
    let bestD = Infinity;
    for (const e of sim.entities.values()) {
      if (e.kind !== 'building' || e.dead || !sim.hostile(this.seat, e.owner) || !(e.seen & (1 << this.seat))) continue;
      const d = Math.hypot(e.x - home.x, e.z - home.z);
      if (d < bestD) {
        bestD = d;
        best = { x: e.x, z: e.z };
      }
    }
    if (best) return best;
    // Never seen one: the enemy starts not yet looked at, then any base site not yet looked at.
    const explored = this.p.explored;
    const unseen = (cx, cz) => !explored[cz * sim.n + cx];
    const spots = [
      ...sim.players.filter((p) => p.alive && sim.hostile(this.seat, p.seat)).map((p) => sim.map.starts[p.seat]),
      ...sim.map.sites
    ].filter((s) => unseen(s.cx, s.cz));
    for (const s of spots) {
      const x = (s.cx + 0.5) * CELL;
      const z = (s.cz + 0.5) * CELL;
      const d = Math.hypot(x - home.x, z - home.z);
      if (d < bestD) {
        bestD = d;
        best = { x, z };
      }
    }
    if (best) return best;
    // Everything looked at once: walk the sites in turn.
    const site = sim.map.sites[Math.floor(sim.tick / 600) % sim.map.sites.length];
    return { x: (site.cx + 0.5) * CELL, z: (site.cz + 0.5) * CELL };
  }
}
