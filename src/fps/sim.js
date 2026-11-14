import { TEAM_SIZE, WIN_ROUNDS, HALF, TIME, MONEY, PLAYER, WEAPONS, GEAR, SKILL, lossPay } from './rules.js';
import { SITES, SPAWNS, NODES, HOLDS, nearestNode, route, clear, rayBoxes, sees } from './map.js';

/**
 * A match of Breachline: ten players (you and nine bots, or all bots), their
 * movement and shots, the rounds, the money and the charge. No drawing and
 * no browser here — `step(dt, input)` moves everything on and returns what
 * happened (`events`), so the same rules run in the game and in the tests.
 *
 * Directions: x east, z south, y up. A player's `yaw` turns left as it
 * grows; yaw 0 looks north (−z), the way a camera does.
 */

const NAMES = ['Vex', 'Marrow', 'Tally', 'Quill', 'Brisk', 'Onyx', 'Sable', 'Juno', 'Rook', 'Flint', 'Pike', 'Wren'];
const rad = (deg) => (deg * Math.PI) / 180;
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class Match {
  /**
   * `humans` seats people from the start: `[{ name, squad }]` (squad 0 or 1).
   * Without it, `human` seats one person (`name`) in squad 0.
   * @param {{ seed?: number, team?: 'atk'|'def', skill?: 'easy'|'normal'|'hard', name?: string, human?: boolean, humans?: { name: string, squad?: number }[] }} [options]
   */
  constructor({ seed = 1, team = 'atk', skill = 'normal', name = 'You', human = true, humans = null } = {}) {
    this.seed = seed >>> 0 || 1;
    this.skill = SKILL[skill] ?? SKILL.normal;
    this.time = 0;
    this.round = 0;
    this.score = [0, 0];
    this.streak = [0, 0]; // rounds lost in a row, by squad
    // Squad 0 is the human's. Which squad attacks swaps at the half.
    this.attackers = team === 'atk' ? 0 : 1;
    this.players = [];
    for (let i = 0; i < TEAM_SIZE * 2; i++) {
      const squad = i < TEAM_SIZE ? 0 : 1;
      this.players.push({ id: i, name: NAMES[(i + this.seed) % NAMES.length], bot: true, squad, money: MONEY.start, kills: 0, deaths: 0, primary: null, secondary: 'sidearm', armor: 0, helmet: false, kit: false, alive: false });
    }
    this.events = [];
    this.charge = null;
    this.over = null;
    /** The people seated from the start, in the order they were given. */
    this.seated = (humans ?? (human ? [{ name, squad: 0 }] : [])).map((h) => this.seat(h.squad ?? 0, h.name));
    this._newRound();
  }

  /** A person takes a bot's place in a squad (the one they ask for, if it has a bot left). Returns their player, or null when the match is full of people. */
  seat(squad, name) {
    const p = this.players.find((q) => q.bot && q.squad === squad) ?? this.players.find((q) => q.bot);
    if (!p) return null;
    Object.assign(p, { bot: false, name: String(name || 'Player').slice(0, 24), botName: p.name });
    return p;
  }

  /** A person leaves: a bot plays on in their place. */
  unseat(p) {
    if (!p || p.bot) return;
    Object.assign(p, { bot: true, name: p.botName ?? p.name, target: null, path: [], wp: null, goal: null });
  }

  rand() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  sideOf(squad) {
    return squad === this.attackers ? 'atk' : 'def';
  }

  get me() {
    return this.players[0];
  }

  living(side) {
    return this.players.filter((p) => p.alive && this.sideOf(p.squad) === side);
  }

  /* ------------------------------------------------------------- rounds */

  _newRound() {
    this.round++;
    this.phase = 'buy';
    this.timer = TIME.buy;
    this.charge = null;
    this.plan = { site: this.rand() < 0.5 ? 'A' : 'B' };
    this.alarm = null;
    const places = { atk: 0, def: 0 };
    for (const p of this.players) {
      const side = this.sideOf(p.squad);
      const [x, z] = SPAWNS[side][places[side]++ % SPAWNS[side].length];
      // Whoever lived keeps what they carried; whoever fell starts again with a sidearm.
      if (!p.alive) Object.assign(p, { primary: null, secondary: 'sidearm', armor: 0, helmet: false, kit: false });
      Object.assign(p, { alive: true, hp: PLAYER.hp, x, z, y: 0, vy: 0, yaw: side === 'atk' ? -Math.PI / 2 : Math.PI / 2, pitch: 0, slot: p.primary ? 1 : 2, cool: 0, reloading: 0, kick: 0, using: 0, moving: false, scoped: false, hasCharge: false, target: null, path: [], wp: null, goal: null, stuck: 0, burst: 0, rest: 0, look: null });
      p.ammo = {};
      for (const w of [p.primary, p.secondary]) if (w) p.ammo[w] = WEAPONS[w].mag;
    }
    for (const p of this.players) if (p.bot) this._botBuy(p);
    // The charge goes to one of the Raiders.
    const raiders = this.living('atk');
    raiders[Math.floor(this.rand() * raiders.length)].hasCharge = true;
    // Wardens split: two for each site, one in the middle.
    this.living('def').forEach((p, i) => (p.post = ['A', 'B', 'A', 'B', 'mid'][i % 5]));
    // Raiders each prefer a lane, so they don't all walk in a line.
    this.living('atk').forEach((p, i) => (p.avoid = new Set([['N2', 'S2'], ['M2'], ['M2', 'S2'], ['N2'], []][i % 5])));
    this.events.push({ type: 'phase', phase: 'buy', round: this.round });
  }

  _endRound(squad, reason) {
    if (this.phase === 'after' || this.phase === 'over') return;
    this.score[squad]++;
    const loser = 1 - squad;
    this.streak[squad] = 0;
    this.streak[loser]++;
    for (const p of this.players) p.money = Math.min(MONEY.max, p.money + (p.squad === squad ? MONEY.win : lossPay(this.streak[loser])));
    this.phase = 'after';
    this.timer = TIME.after;
    this.events.push({ type: 'round', winner: squad, side: this.sideOf(squad), reason, score: [...this.score] });
  }

  _afterRound() {
    if (this.score[0] >= WIN_ROUNDS || this.score[1] >= WIN_ROUNDS) {
      this.phase = 'over';
      this.over = { winner: this.score[0] > this.score[1] ? 0 : 1, score: [...this.score] };
      this.events.push({ type: 'over', ...this.over });
      return;
    }
    if (this.round === HALF) {
      // Change ends: the other squad attacks, and everyone starts again from the same purse.
      this.attackers = 1 - this.attackers;
      this.streak = [0, 0];
      for (const p of this.players) Object.assign(p, { money: MONEY.start, alive: false });
      this.events.push({ type: 'half' });
    }
    this._newRound();
  }

  /* -------------------------------------------------------------- buying */

  /** Buy a weapon or gear in the pause before a round. Returns why not, or null. */
  buy(p, item) {
    if (this.phase !== 'buy') return 'The round has begun';
    const w = WEAPONS[item];
    const g = GEAR[item];
    if (!w && !g) return 'No such thing';
    const price = (w ?? g).price - (item === 'helmet' && p.armor >= 100 && !p.helmet ? GEAR.vest.price : 0);
    if (g?.team && g.team !== this.sideOf(p.squad)) return 'Not for your side';
    if (item === 'vest' && p.armor >= 100) return 'Your vest is whole';
    if (item === 'helmet' && p.helmet && p.armor >= 100) return 'You have that';
    if (item === 'kit' && p.kit) return 'You have that';
    if (w && (p.primary === item || p.secondary === item)) return 'You have that';
    if (p.money < price) return 'Not enough money';
    p.money -= price;
    if (w) {
      if (w.slot === 1) p.primary = item;
      else p.secondary = item;
      p.ammo[item] = w.mag;
      p.slot = w.slot;
    } else if (item === 'kit') p.kit = true;
    else {
      p.armor = 100;
      if (item === 'helmet') p.helmet = true;
    }
    this.events.push({ type: 'buy', id: p.id, item });
    return null;
  }

  _botBuy(p) {
    const side = this.sideOf(p.squad);
    const want = p.money >= 4100 ? (this.rand() < 0.15 ? 'longwatch' : side === 'atk' ? 'vantage' : 'kestrel') : p.money >= 2100 ? (this.rand() < 0.3 ? 'gavel' : 'wasp') : null;
    if (want && !p.primary) this.buy(p, want);
    if (p.money >= 1000 && !p.helmet) this.buy(p, 'helmet');
    else if (p.money >= 650 && p.armor < 100) this.buy(p, 'vest');
    if (side === 'def' && p.money >= 600 && !p.kit) this.buy(p, 'kit');
    if (!p.primary && p.money >= 900 && p.secondary === 'sidearm' && this.rand() < 0.5) this.buy(p, 'ram');
  }

  /* ------------------------------------------------------------ weapons */

  weaponOf(p) {
    return p.slot === 1 && p.primary ? p.primary : p.secondary;
  }

  _reload(p) {
    const id = this.weaponOf(p);
    if (p.reloading > 0 || p.ammo[id] >= WEAPONS[id].mag) return;
    p.reloading = WEAPONS[id].reload;
    p.scoped = false;
    this.events.push({ type: 'reload', id: p.id });
  }

  /** One pull of the trigger: a ray (or eight) from the eye; the first enemy it meets before a wall is hit. `error` adds degrees of aim (bots). */
  _fire(p, error = 0) {
    const id = this.weaponOf(p);
    const w = WEAPONS[id];
    if (p.cool > 0 || p.reloading > 0) return false;
    if (!p.ammo[id]) {
      this._reload(p);
      return false;
    }
    p.ammo[id]--;
    p.cool = 60 / w.rpm;
    const spread = w.spread + p.kick + (p.moving ? 1.6 : 0) + (p.y > 0.05 ? 3 : 0) + (w.unscoped && !p.scoped ? w.unscoped : 0) + error;
    p.kick = Math.min(6, p.kick + w.kick);
    const foes = this.players.filter((q) => q.alive && q.squad !== p.squad);
    for (let n = 0; n < (w.pellets ?? 1); n++) {
      // A little off true, evenly inside a cone.
      const off = rad(spread) * Math.sqrt(this.rand());
      const around = this.rand() * Math.PI * 2;
      const yaw = p.yaw + (Math.cos(around) * off) / Math.max(0.3, Math.cos(p.pitch));
      const pitch = p.pitch + Math.sin(around) * off;
      const dx = -Math.sin(yaw) * Math.cos(pitch);
      const dy = Math.sin(pitch);
      const dz = -Math.cos(yaw) * Math.cos(pitch);
      const ox = p.x;
      const oy = p.y + PLAYER.eye;
      const oz = p.z;
      let far = rayBoxes(ox, oy, oz, dx, dy, dz, w.range);
      let hit = null;
      let head = false;
      for (const q of foes) {
        // The head: a ball. The body: an upright cylinder.
        const hx = q.x - ox;
        const hy = q.y + 1.6 - oy;
        const hz = q.z - oz;
        const along = hx * dx + hy * dy + hz * dz;
        if (along > 0 && along < far && hx * hx + hy * hy + hz * hz - along * along < 0.22 * 0.22) {
          far = along;
          hit = q;
          head = true;
          continue;
        }
        const a = dx * dx + dz * dz;
        if (a < 1e-9) continue;
        const b = -2 * (hx * dx + hz * dz);
        const c = hx * hx + hz * hz - 0.38 * 0.38;
        const disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        const at = oy + dy * t - q.y;
        if (t > 0 && t < far && at > 0.2 && at < 1.4) {
          far = t;
          hit = q;
          head = false;
        }
      }
      this.events.push({ type: 'shot', id: p.id, weapon: id, from: [ox, oy, oz], to: [ox + dx * far, oy + dy * far, oz + dz * far], hit: hit?.id ?? null, head });
      if (hit) this._hurt(hit, p, w.dmg * (1 - 0.3 * Math.min(1, far / w.range)) * (head ? w.head * (hit.helmet ? 0.6 : 1) : 1), id, head);
    }
    return true;
  }

  _hurt(q, by, amount, weapon, head) {
    if (!q.alive) return;
    let dmg = amount;
    if (q.armor > 0 && (!head || q.helmet)) {
      const soak = Math.min(q.armor / 0.6, dmg * 0.5);
      q.armor = Math.max(0, q.armor - soak * 0.6);
      dmg -= soak;
    }
    dmg = Math.max(1, Math.round(dmg));
    q.hp -= dmg;
    this.events.push({ type: 'hurt', id: q.id, by: by.id, amount: dmg, head });
    // Being shot tells a bot where the shooter is.
    if (q.bot && !q.target) {
      q.target = by.id;
      q.reactAt = this.time + this.skill.react * 0.6;
    }
    if (q.hp > 0) return;
    q.hp = 0;
    q.alive = false;
    q.deaths++;
    by.kills++;
    by.money = Math.min(MONEY.max, by.money + MONEY.kill);
    if (q.hasCharge) {
      q.hasCharge = false;
      this.charge = { x: q.x, z: q.z, state: 'dropped' };
    }
    this.events.push({ type: 'kill', by: by.id, who: q.id, weapon, head });
  }

  /* --------------------------------------------------------------- step */

  /**
   * Move the match on by `dt` seconds. `input` is the human's (player 0's),
   * or a Map of player id → input when several people play: `f` and `s`
   * (forward and sideways, −1 to 1), `yaw` and `pitch` (where they look),
   * `fire` (held), `shoot` (pressed this step), `reload`, `use` (held),
   * `jump`, `slot` (1 or 2), `scope`. Returns the events of this step.
   */
  step(dt, input = {}) {
    this.events = [];
    if (this.phase === 'over') return this.events;
    this.time += dt;
    this.timer -= dt;
    if (this.phase === 'buy' && this.timer <= 0) {
      this.phase = 'live';
      this.timer = TIME.round;
      this.events.push({ type: 'phase', phase: 'live' });
    } else if (this.phase === 'after' && this.timer <= 0) {
      this._afterRound();
      return this.events;
    }
    const live = this.phase === 'live' || this.phase === 'planted';
    for (const p of this.players) {
      if (!p.alive) continue;
      p.cool = Math.max(0, p.cool - dt);
      p.kick = Math.max(0, p.kick - dt * 5);
      if (p.reloading > 0) {
        p.reloading -= dt;
        if (p.reloading <= 0) p.ammo[this.weaponOf(p)] = WEAPONS[this.weaponOf(p)].mag;
      }
      const cmd = p.bot ? this._think(p, dt, live) : this._human(p, input instanceof Map ? input.get(p.id) ?? {} : p.id === 0 ? input : {});
      // Looking.
      p.yaw = cmd.yaw;
      p.pitch = Math.max(-1.45, Math.min(1.45, cmd.pitch));
      if (cmd.slot && cmd.slot !== p.slot && (cmd.slot === 2 || p.primary)) {
        p.slot = cmd.slot;
        p.reloading = 0;
        p.scoped = false;
        p.cool = Math.max(p.cool, 0.35);
      }
      p.scoped = Boolean(cmd.scope && WEAPONS[this.weaponOf(p)].zoom && p.reloading <= 0);
      if (!live) {
        p.moving = false;
        continue;
      }
      // Walking: forward and sideways from where they face; boxes stop them, one axis at a time (so they slide along walls).
      const using = cmd.use && this._use(p, dt);
      if (!using) p.using = 0;
      const w = WEAPONS[this.weaponOf(p)];
      const speed = PLAYER.speed * w.move * (p.scoped ? 0.5 : 1) * (using ? 0 : 1);
      const len = Math.hypot(cmd.f, cmd.s);
      const f = len > 1 ? cmd.f / len : cmd.f;
      const s = len > 1 ? cmd.s / len : cmd.s;
      const vx = (-Math.sin(p.yaw) * f + Math.cos(p.yaw) * s) * speed;
      const vz = (-Math.cos(p.yaw) * f - Math.sin(p.yaw) * s) * speed;
      const nx = p.x + vx * dt;
      const nz = p.z + vz * dt;
      const bx = p.x;
      const bz = p.z;
      if (clear(nx, p.z, PLAYER.radius)) p.x = nx;
      if (clear(p.x, nz, PLAYER.radius)) p.z = nz;
      p.moving = Math.hypot(p.x - bx, p.z - bz) > speed * dt * 0.3 && len > 0.1;
      if (cmd.jump && p.y <= 0) p.vy = PLAYER.jump;
      if (p.y > 0 || p.vy > 0) {
        p.y += p.vy * dt;
        p.vy -= PLAYER.gravity * dt;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
        }
      }
      if (cmd.reload) this._reload(p);
      if (!using && (WEAPONS[this.weaponOf(p)].auto ? cmd.fire : cmd.shoot)) this._fire(p, cmd.error ?? 0);
      // A dropped charge is picked up by the first Raider to walk over it.
      if (this.charge?.state === 'dropped' && this.sideOf(p.squad) === 'atk' && Math.hypot(p.x - this.charge.x, p.z - this.charge.z) < 1.2) {
        this.charge = null;
        p.hasCharge = true;
        this.events.push({ type: 'pickup', id: p.id });
      }
    }
    if (live) this._judge();
    return this.events;
  }

  _human(p, input) {
    return { f: input.f ?? 0, s: input.s ?? 0, yaw: input.yaw ?? p.yaw, pitch: input.pitch ?? p.pitch, fire: Boolean(input.fire), shoot: Boolean(input.shoot), reload: Boolean(input.reload), use: Boolean(input.use), jump: Boolean(input.jump), slot: input.slot, scope: Boolean(input.scope) };
  }

  /** Setting the charge (a Raider carrying it, standing in a site) or disarming it (a Warden beside it): hold, and it takes time. */
  _use(p, dt) {
    const side = this.sideOf(p.squad);
    if (side === 'atk' && p.hasCharge && this.phase === 'live') {
      const site = Object.entries(SITES).find(([, s]) => Math.hypot(p.x - s.x, p.z - s.z) < s.r);
      if (!site || p.y > 0) return false;
      p.using += dt;
      if (p.using >= TIME.plant) {
        p.hasCharge = false;
        p.using = 0;
        p.money = Math.min(MONEY.max, p.money + MONEY.plant);
        this.charge = { x: p.x, z: p.z, state: 'planted', site: site[0], by: p.id };
        this.phase = 'planted';
        this.timer = TIME.fuse;
        this.events.push({ type: 'plant', site: site[0], id: p.id });
      }
      return true;
    }
    if (side === 'def' && this.charge?.state === 'planted' && Math.hypot(p.x - this.charge.x, p.z - this.charge.z) < 1.7) {
      p.using += dt;
      if (p.using >= (p.kit ? TIME.defuseKit : TIME.defuse)) {
        p.using = 0;
        p.money = Math.min(MONEY.max, p.money + MONEY.defuse);
        this.charge.state = 'safe';
        this.events.push({ type: 'defused', id: p.id });
        this._endRound(p.squad, 'defused');
      }
      return true;
    }
    return false;
  }

  /** Has the round been won? */
  _judge() {
    const atk = this.living('atk').length;
    const def = this.living('def').length;
    const raiders = this.attackers;
    if (this.phase === 'planted') {
      if (this.timer <= 0) {
        this.events.push({ type: 'boom', x: this.charge.x, z: this.charge.z });
        // Whoever is standing near goes with it.
        for (const p of this.players) if (p.alive && Math.hypot(p.x - this.charge.x, p.z - this.charge.z) < 9) Object.assign(p, { alive: false, hp: 0 });
        this.charge.state = 'gone';
        this._endRound(raiders, 'detonated');
      } else if (!def) this._endRound(raiders, 'eliminated');
      return;
    }
    if (!atk) this._endRound(1 - raiders, 'eliminated');
    else if (!def) this._endRound(raiders, 'eliminated');
    else if (this.timer <= 0) this._endRound(1 - raiders, 'time');
  }

  /* ---------------------------------------------------------------- bots */

  /** What a bot does this step: where it looks, where it walks, whether it shoots. */
  _think(p, dt, live) {
    const cmd = { f: 0, s: 0, yaw: p.yaw, pitch: p.pitch, fire: false, shoot: false, reload: false, use: false, jump: false, slot: p.primary ? 1 : 2, scope: false, error: 0 };
    if (!live) return cmd;
    const side = this.sideOf(p.squad);
    const eye = p.y + PLAYER.eye;
    // Who can it see? The nearest enemy in front of it (or very close), with nothing solid between.
    let seen = null;
    let seenD = Infinity;
    for (const q of this.players) {
      if (!q.alive || q.squad === p.squad) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d > 85 || d >= seenD) continue;
      const bearing = Math.atan2(-(q.x - p.x), -(q.z - p.z));
      if (d > 5 && Math.abs(turn(p.yaw, bearing)) > rad(75) && p.target !== q.id) continue;
      if (!sees(p.x, eye, p.z, q.x, q.y + 1.3, q.z) && !sees(p.x, eye, p.z, q.x, q.y + 1.62, q.z)) continue;
      seen = q;
      seenD = d;
    }
    if (seen) {
      if (p.target !== seen.id) {
        p.target = seen.id;
        // Someone holding an angle is quicker than someone walking into it.
        p.reactAt = this.time + this.skill.react * (0.75 + this.rand() * 0.6) * (side === 'def' && !p.moving ? 0.7 : 1);
      }
      // A Warden who sees Raiders near a site calls it: the others come.
      if (side === 'def' && this.phase === 'live') {
        const near = Object.entries(SITES).map(([k, v]) => [k, Math.hypot(seen.x - v.x, seen.z - v.z)]).sort((a, b) => a[1] - b[1])[0];
        if (near[1] < 26 && (!this.alarm || this.alarm.site !== near[0] || this.time - this.alarm.at > 6)) this.alarm = { site: near[0], at: this.time };
      }
      p.lastSeen = { x: seen.x, z: seen.z, at: this.time };
    } else if (p.target != null) {
      const t = this.players[p.target];
      // Lost sight: go and look where they were, for a little while.
      if (!t?.alive || this.time - (p.lastSeen?.at ?? 0) > 3) p.target = null;
    }
    const w = WEAPONS[this.weaponOf(p)];
    const busy = this._botUse(p, side, Boolean(seen));
    const holding = side === 'def' && this.phase === 'live' && p.hp > 55;
    if (seen && !busy) {
      // Turn to them (not instantly), and once reacted and on aim, shoot in short bursts.
      const aimY = seen.y + (this.skill === SKILL.hard || this.rand() < 0.25 ? 1.5 : 1.15);
      const wantYaw = Math.atan2(-(seen.x - p.x), -(seen.z - p.z));
      const wantPitch = Math.atan2(aimY - eye, seenD);
      const rate = rad(420) * dt;
      cmd.yaw = p.yaw + Math.max(-rate, Math.min(rate, turn(p.yaw, wantYaw)));
      cmd.pitch = p.pitch + Math.max(-rate, Math.min(rate, wantPitch - p.pitch));
      const onAim = Math.abs(turn(cmd.yaw, wantYaw)) < rad(4) && Math.abs(cmd.pitch - wantPitch) < rad(4);
      cmd.scope = Boolean(w.zoom) && seenD > 12;
      if (this.time >= (p.reactAt ?? 0) && onAim) {
        if (p.rest > 0) p.rest -= dt;
        else {
          cmd.error = this.skill.error * (0.5 + this.rand()) * (seenD > 30 ? 1.25 : 1) * (holding ? 0.95 : 1);
          cmd.fire = true;
          cmd.shoot = p.cool <= 0;
          if (p.cool <= 0 && ++p.burst >= this.skill.burst + Math.floor(this.rand() * 3)) {
            p.burst = 0;
            p.rest = 0.25 + this.rand() * 0.35;
          }
        }
      }
      // Don't stand still to be shot: step from side to side; close in with a shotgun or SMG.
      // (A Warden at their post stands firm instead, and shoots straighter for it, until hurt.)
      if (holding && Math.floor(this.time * 0.8 + p.id) % 3 !== 0) cmd.s = 0;
      else if (Math.floor(this.time * 1.4 + p.id) % 2 === 0) cmd.s = 0.7;
      else cmd.s = -0.7;
      if (w.range < 50 && seenD > 9) cmd.f = 0.8;
      if (w.zoom) cmd.s = 0;
      return cmd;
    }
    if (busy) {
      cmd.use = true;
      return cmd;
    }
    if (!p.ammo[this.weaponOf(p)] || (p.ammo[this.weaponOf(p)] < w.mag * 0.4 && p.reloading <= 0)) cmd.reload = true;
    // Where to? Pick a place by what the round needs, and walk the way there.
    const goal = this._botGoal(p, side);
    if (goal.key !== p.goal) {
      p.goal = goal.key;
      p.path = goal.node ? route(nearestNode(p.x, p.z), goal.node, p.avoid).map((k) => ({ x: NODES[k][0] + (this.rand() - 0.5) * 1.2, z: NODES[k][1] + (this.rand() - 0.5) * 1.2 })) : [];
      if (goal.point) p.path.push(goal.point);
      // Skip the first place if it is behind us.
      if (p.path.length > 1 && Math.hypot(p.path[0].x - p.x, p.path[0].z - p.z) < 2.5) p.path.shift();
    }
    while (p.path.length && Math.hypot(p.path[0].x - p.x, p.path[0].z - p.z) < 0.9) p.path.shift();
    const next = p.path[0];
    if (next) {
      const wantYaw = Math.atan2(-(next.x - p.x), -(next.z - p.z));
      const rate = rad(300) * dt;
      // Checking where someone was last seen: face there instead.
      const face = p.target != null && p.lastSeen ? Math.atan2(-(p.lastSeen.x - p.x), -(p.lastSeen.z - p.z)) : wantYaw;
      cmd.yaw = p.yaw + Math.max(-rate, Math.min(rate, turn(p.yaw, face)));
      cmd.pitch = p.pitch * 0.9;
      // Walk toward the place whichever way we face.
      const rel = turn(cmd.yaw, wantYaw);
      cmd.f = Math.cos(rel);
      cmd.s = -Math.sin(rel);
      // Stuck against a corner? Sidestep, then find the way again.
      const moved = Math.hypot(p.x - (p.was?.x ?? p.x), p.z - (p.was?.z ?? p.z));
      p.stuck = moved < PLAYER.speed * dt * 0.25 ? p.stuck + dt : 0;
      if (p.stuck > 0.6) {
        cmd.s = p.id % 2 ? 1 : -1;
        cmd.jump = true;
        if (p.stuck > 1.6) {
          p.goal = null;
          p.stuck = 0;
        }
      }
    } else {
      // Arrived: hold, and sweep slowly the way trouble would come from.
      const watch = goal.watch ?? [40, 30];
      const base = Math.atan2(-(watch[0] - p.x), -(watch[1] - p.z));
      const want = base + Math.sin(this.time * 0.7 + p.id * 1.7) * rad(38);
      cmd.yaw = p.yaw + Math.max(-rad(140) * dt, Math.min(rad(140) * dt, turn(p.yaw, want)));
      cmd.pitch = p.pitch * 0.9;
      // Now and then, move to another spot.
      if (this.rand() < dt / 7) p.goal = null;
    }
    p.was = { x: p.x, z: p.z };
    return cmd;
  }

  /** Should this bot be setting or disarming the charge right now? */
  _botUse(p, side, seen) {
    if (side === 'atk' && p.hasCharge && this.phase === 'live') {
      const s = SITES[this.plan.site];
      return Math.hypot(p.x - s.x, p.z - s.z) < s.r - 1.5 && (!seen || p.using > 1.5);
    }
    if (side === 'def' && this.charge?.state === 'planted' && Math.hypot(p.x - this.charge.x, p.z - this.charge.z) < 1.5) {
      // With the fuse nearly out there is no time to fight first.
      const need = (p.kit ? TIME.defuseKit : TIME.defuse) - p.using;
      return !seen || this.timer < need + 1.5 || p.using > need * 0.5;
    }
    return false;
  }

  /** The place a bot should be heading for, as { key (what it is doing), node or point, watch }. */
  _botGoal(p, side) {
    const pick = (list) => list[(p.id + Math.floor(this.time / 9) + this.round) % list.length];
    if (side === 'atk') {
      if (this.charge?.state === 'dropped') {
        // The nearest Raider goes back for it.
        const near = this.living('atk').sort((a, b) => Math.hypot(a.x - this.charge.x, a.z - this.charge.z) - Math.hypot(b.x - this.charge.x, b.z - this.charge.z))[0];
        if (near === p) return { key: 'fetch', node: nearestNode(this.charge.x, this.charge.z), point: { x: this.charge.x, z: this.charge.z } };
      }
      const site = this.charge?.site ?? this.plan.site;
      if (p.hasCharge) return { key: `plant${site}`, node: site, watch: [50, 30] };
      if (this.phase === 'planted') return { key: `guard${site}:${pick(HOLDS[site])}`, node: pick(HOLDS[site]), watch: [72, 30] };
      return { key: `push${site}:${pick(HOLDS[site].slice(0, 3))}`, node: pick(HOLDS[site].slice(0, 3)), watch: [72, 30] };
    }
    if (this.charge?.state === 'planted') return { key: 'disarm', node: this.charge.site, point: { x: this.charge.x + 0.6, z: this.charge.z }, watch: [40, 30] };
    // A call for help, a couple of seconds old (word has to travel): leave your post for that site.
    const called = this.alarm && this.time - this.alarm.at > 0.6 && this.time - this.alarm.at < 25 ? this.alarm.site : null;
    const post = called ?? p.post ?? 'mid';
    return { key: `hold${post}:${pick(HOLDS[post])}`, node: pick(HOLDS[post]), watch: [30, post === 'A' ? 12 : post === 'B' ? 48 : 30] };
  }
}
