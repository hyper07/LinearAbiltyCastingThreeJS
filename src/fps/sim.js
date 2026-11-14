import { TEAM_SIZE, WIN_ROUNDS, HALF, TIME, MONEY, PLAYER, WEAPONS, GEAR, SKILL, lossPay, weaponIn, canHold } from './rules.js';
import { getMap } from './map.js';

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
   * `map` is a map's id (map.js MAPS).
   * @param {{ seed?: number, team?: 'atk'|'def', skill?: 'easy'|'normal'|'hard', name?: string, human?: boolean, humans?: { name: string, squad?: number }[], map?: string }} [options]
   */
  constructor({ seed = 1, team = 'atk', skill = 'normal', name = 'You', human = true, humans = null, map = 'foundry' } = {}) {
    /** Which map: its boxes, sites, spawns and the ways bots walk (map.js). */
    this.map = getMap(map);
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
      this.players.push({ id: i, name: NAMES[(i + this.seed) % NAMES.length], bot: true, squad, money: MONEY.start, kills: 0, deaths: 0, primary: null, secondary: 'sidearm', armor: 0, helmet: false, kit: false, nades: { frag: 0, smoke: 0 }, melee: 'knife', alive: false });
    }
    this.events = [];
    this.charge = null;
    this.over = null;
    this.nades = []; // grenades in the air
    this.smokes = []; // smoke where it hangs
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
    this.nades = [];
    this.smokes = [];
    this.plan = this._makePlan();
    this.alarm = null;
    const places = { atk: 0, def: 0 };
    for (const p of this.players) {
      const side = this.sideOf(p.squad);
      const [x, z] = this.map.SPAWNS[side][places[side]++ % this.map.SPAWNS[side].length];
      // Whoever lived keeps what they carried; whoever fell starts again with a sidearm.
      if (!p.alive) Object.assign(p, { primary: null, secondary: 'sidearm', armor: 0, helmet: false, kit: false, nades: { frag: 0, smoke: 0 }, melee: 'knife' });
      Object.assign(p, { alive: true, hp: PLAYER.hp, x, z, y: 0, vy: 0, yaw: side === 'atk' ? -Math.PI / 2 : Math.PI / 2, pitch: 0, slot: p.primary ? 1 : 2, cool: 0, reloading: 0, kick: 0, using: 0, moving: false, scoped: false, zoomLevel: 0, hasCharge: false, target: null, path: [], wp: null, goal: null, stuck: 0, burst: 0, rest: 0, look: null, mf: 0, ms: 0, cover: null, heard: null, lastSeen: null, trade: 0, dodge: 1, dodgeUntil: 0 });
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
    this.living('atk').forEach((p, i) => (p.avoid = new Set(this.map.PLAN.lanes[i % this.map.PLAN.lanes.length])));
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
    if (w && (p.primary === item || p.secondary === item || (w.melee && (p.melee ?? 'knife') === item))) return 'You have that';
    if (w?.throw && p.nades[item] >= 1) return 'You have that';
    if (p.money < price) return 'Not enough money';
    p.money -= price;
    if (w?.throw) p.nades[item]++;
    else if (w?.melee) p.melee = item;
    else if (w) {
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
    return weaponIn(p);
  }

  _reload(p) {
    const id = this.weaponOf(p);
    if (!WEAPONS[id].mag) return;
    if (p.reloading > 0 || p.ammo[id] >= WEAPONS[id].mag) return;
    p.reloading = WEAPONS[id].reload;
    p.scoped = false;
    p.zoomLevel = 0;
    this.events.push({ type: 'reload', id: p.id });
  }

  /** One pull of the trigger: a ray (or eight) from the eye; the first enemy it meets before a wall is hit. `error` adds degrees of aim (bots). */
  _fire(p, error = 0) {
    const id = this.weaponOf(p);
    const w = WEAPONS[id];
    if (p.cool > 0 || p.reloading > 0) return false;
    if (w.melee) return this._stab(p);
    if (w.throw) {
      const sp = 17;
      return this._throw(p, id, -Math.sin(p.yaw) * Math.cos(p.pitch) * sp, Math.sin(p.pitch) * sp + 2.5, -Math.cos(p.yaw) * Math.cos(p.pitch) * sp);
    }
    if (!p.ammo[id]) {
      this._reload(p);
      return false;
    }
    p.ammo[id]--;
    p.cool = 60 / w.rpm;
    const spread = w.spread + p.kick + 1.6 * Math.min(1, (p.pace ?? 0) / (PLAYER.speed * 0.6)) + (p.y > 0.05 ? 3 : 0) + (w.unscoped && !p.scoped ? w.unscoped : 0) + error;
    p.kick = Math.min(6, p.kick + w.kick);
    this._noise(p, 45);
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
      let far = this.map.rayBoxes(ox, oy, oz, dx, dy, dz, w.range);
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

  _hurt(q, by, amount, weapon, head, { pierce = false } = {}) {
    if (!q.alive) return;
    let dmg = amount;
    if (!pierce && q.armor > 0 && (!head || q.helmet)) {
      const soak = Math.min(q.armor / 0.6, dmg * 0.5);
      q.armor = Math.max(0, q.armor - soak * 0.6);
      dmg -= soak;
    }
    dmg = Math.max(1, Math.round(dmg));
    q.hp -= dmg;
    this.events.push({ type: 'hurt', id: q.id, by: by.id, amount: dmg, head });
    // Being shot tells a bot where the shooter is.
    if (q.bot && !q.target && by.alive) {
      q.target = by.id;
      q.lastSeen = { x: by.x, z: by.z, at: this.time };
      q.reactAt = this.time + this.skill.react * 0.6;
    }
    if (q.hp > 0) return;
    q.hp = 0;
    q.alive = false;
    q.deaths++;
    by.kills++;
    by.money = Math.min(MONEY.max, by.money + (WEAPONS[weapon]?.bounty ?? MONEY.kill));
    // Teammates nearby go for whoever did it (a trade).
    for (const r of this.players) {
      if (!r.alive || !r.bot || r.squad !== q.squad || !by.alive) continue;
      if (Math.hypot(r.x - q.x, r.z - q.z) > 35) continue;
      r.lastSeen = { x: by.x, z: by.z, at: this.time };
      r.trade = this.time;
    }
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
      this.timer = (this.map.PLAN.round ?? TIME.round);
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
      // A bot's legs ease into a new direction over a tenth of a second, as a person's do: no snapping.
      if (p.bot) {
        const k = Math.min(1, dt * 14);
        p.mf = (p.mf ?? 0) + (cmd.f - (p.mf ?? 0)) * k;
        p.ms = (p.ms ?? 0) + (cmd.s - (p.ms ?? 0)) * k;
        cmd.f = Math.abs(p.mf) < 0.02 ? 0 : p.mf;
        cmd.s = Math.abs(p.ms) < 0.02 ? 0 : p.ms;
      }
      // Looking.
      p.yaw = cmd.yaw;
      p.pitch = Math.max(-1.45, Math.min(1.45, cmd.pitch));
      if (cmd.slot && cmd.slot !== p.slot && canHold(p, cmd.slot)) {
        p.slot = cmd.slot;
        p.reloading = 0;
        p.scoped = false;
        p.zoomLevel = 0;
        p.cool = Math.max(p.cool, cmd.slot === 3 ? 0.2 : 0.35);
      }
      // `scope` is how far in: 0 out, 1 the first step of zoom, 2 the second (where the scope has one).
      const zoom = WEAPONS[this.weaponOf(p)].zoom;
      p.zoomLevel = zoom && p.reloading <= 0 ? Math.min(zoom.length, Number(cmd.scope) || 0) : 0;
      p.scoped = p.zoomLevel > 0;
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
      if (this.map.clear(nx, p.z, PLAYER.radius)) p.x = nx;
      if (this.map.clear(p.x, nz, PLAYER.radius)) p.z = nz;
      p.moving = Math.hypot(p.x - bx, p.z - bz) > speed * dt * 0.3 && len > 0.1;
      // How fast they really go (for aim: nearly stopped is nearly steady).
      p.pace = dt > 0 ? Math.hypot(p.x - bx, p.z - bz) / dt : 0;
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
      // A press is kept a quarter of a second, so a click while the gun is still coming up is not lost.
      if (cmd.shoot) p.pressed = this.time;
      const auto = WEAPONS[this.weaponOf(p)].auto;
      const wants = auto ? cmd.fire : this.time - (p.pressed ?? -9) < 0.25;
      if (!using && wants && this._fire(p, cmd.error ?? 0) && !auto) p.pressed = -9;
      // A dropped charge is picked up by the first Raider to walk over it.
      if (this.charge?.state === 'dropped' && this.sideOf(p.squad) === 'atk' && Math.hypot(p.x - this.charge.x, p.z - this.charge.z) < 1.2) {
        this.charge = null;
        p.hasCharge = true;
        this.events.push({ type: 'pickup', id: p.id });
      }
    }
    if (live) {
      this._nadeStep(dt);
      this._planTick();
      this._judge();
    }
    return this.events;
  }

  _human(p, input) {
    return { f: input.f ?? 0, s: input.s ?? 0, yaw: input.yaw ?? p.yaw, pitch: input.pitch ?? p.pitch, fire: Boolean(input.fire), shoot: Boolean(input.shoot), reload: Boolean(input.reload), use: Boolean(input.use), jump: Boolean(input.jump), slot: input.slot, scope: Math.max(0, Math.min(2, Number(input.scope) || 0)) };
  }

  /** Setting the charge (a Raider carrying it, standing in a site) or disarming it (a Warden beside it): hold, and it takes time. */
  _use(p, dt) {
    const side = this.sideOf(p.squad);
    if (side === 'atk' && p.hasCharge && this.phase === 'live') {
      const site = Object.entries(this.map.SITES).find(([, s]) => Math.hypot(p.x - s.x, p.z - s.z) < s.r);
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

  /* ------------------------------------------------- knife and grenades */

  /** A knife stab at whoever is in reach in front; from behind it goes through anything. */
  _stab(p) {
    const id = this.weaponOf(p);
    const w = WEAPONS[id];
    p.cool = 60 / w.rpm;
    this.events.push({ type: 'slash', id: p.id });
    this._noise(p, 10);
    let best = null;
    let bestD = Infinity;
    for (const q of this.players) {
      if (!q.alive || q.squad === p.squad || Math.abs(q.y - p.y) > 1.2) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d > w.range || d >= bestD) continue;
      if (Math.abs(turn(p.yaw, Math.atan2(-(q.x - p.x), -(q.z - p.z)))) > rad(40)) continue;
      best = q;
      bestD = d;
    }
    if (!best) return true;
    // From behind: they face the way the knife comes from.
    const back = Math.abs(turn(best.yaw, Math.atan2(-(best.x - p.x), -(best.z - p.z)))) < rad(70);
    this._hurt(best, p, back ? w.back : w.dmg, id, false, { pierce: back });
    return true;
  }

  /** Let a grenade go with a velocity. */
  _throw(p, kind, vx, vy, vz) {
    if (!(p.nades[kind] > 0) || p.cool > 0) return false;
    p.nades[kind]--;
    p.cool = 0.6;
    this.nades.push({ kind, by: p.id, x: p.x, y: p.y + PLAYER.eye - 0.1, z: p.z, vx, vy, vz, fuse: WEAPONS[kind].fuse });
    this.events.push({ type: 'throw', id: p.id, kind });
    if (p.slot >= 4 && !canHold(p, p.slot)) p.slot = p.primary ? 1 : 2;
    return true;
  }

  /** A bot's throw: a lob to land at (tx, tz). */
  _lob(p, kind, tx, tz) {
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.max(1, Math.hypot(dx, dz));
    if (d > 42) return false;
    const h = p.y + PLAYER.eye - 0.1;
    const a = rad(d > 20 ? 42 : 32);
    const v = Math.min(24, Math.sqrt((PLAYER.gravity * d * d) / (2 * Math.cos(a) ** 2 * (d * Math.tan(a) + h))));
    return this._throw(p, kind, (dx / d) * v * Math.cos(a), v * Math.sin(a), (dz / d) * v * Math.cos(a));
  }

  _inBox(x, y, z) {
    for (const [bx, bz, w, d, h] of this.map.BOXES) if (y < h && x > bx - 0.08 && x < bx + w + 0.08 && z > bz - 0.08 && z < bz + d + 0.08) return true;
    return false;
  }

  /** Grenades in the air: they fall, bounce off what they meet, and go off. */
  _nadeStep(dt) {
    for (const n of this.nades) {
      n.fuse -= dt;
      n.vy -= PLAYER.gravity * dt;
      for (const ax of ['x', 'y', 'z']) {
        const v = `v${ax}`;
        const was = n[ax];
        n[ax] += n[v] * dt;
        if (ax === 'y' && n.y < 0.06) {
          n.y = 0.06;
          n.vy = Math.abs(n.vy) * 0.3;
          if (n.vy < 0.8) n.vy = 0;
          n.vx *= 0.7;
          n.vz *= 0.7;
        } else if (this._inBox(n.x, n.y, n.z)) {
          n[ax] = was;
          n[v] *= ax === 'y' ? -0.3 : -0.45;
          if (ax === 'y') {
            n.vx *= 0.7;
            n.vz *= 0.7;
          }
        }
      }
      if (n.fuse <= 0) {
        this._burst(n);
        n.done = true;
      }
    }
    this.nades = this.nades.filter((n) => !n.done);
    this.smokes = this.smokes.filter((s) => this.time < s.until);
  }

  _burst(n) {
    const w = WEAPONS[n.kind];
    const by = this.players[n.by];
    if (n.kind === 'smoke') {
      this.smokes.push({ x: n.x, z: n.z, r: w.radius, at: this.time, until: this.time + w.last });
      this.events.push({ type: 'smoke', x: n.x, z: n.z });
      return;
    }
    this.events.push({ type: 'blast', x: n.x, y: n.y, z: n.z });
    this._noise({ x: n.x, z: n.z, squad: -1 }, 50);
    for (const q of this.players) {
      if (!q.alive || q.squad === by.squad) continue;
      const d = Math.hypot(q.x - n.x, q.y + 1 - n.y, q.z - n.z);
      if (d > w.radius || !this.map.sees(n.x, n.y + 0.25, n.z, q.x, q.y + 1.1, q.z)) continue;
      this._hurt(q, by, w.dmg * (1 - d / w.radius) ** 1.3, 'frag', false);
    }
  }

  /** How much of a line of sight smoke hides: true when it is hidden. */
  _smoked(ax, ay, az, bx, by, bz) {
    for (const s of this.smokes) {
      const r = s.r * Math.min(1, (this.time - s.at) / 1.2) * Math.min(1, (s.until - this.time) / 2);
      if (r < 0.5) continue;
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (1.6 - ay) * dy + (s.z - az) * dz) / (dx * dx + dy * dy + dz * dz || 1e-9)));
      const px = ax + dx * t - s.x;
      const py = (ay + dy * t - 1.6) * 0.7;
      const pz = az + dz * t - s.z;
      if (px * px + py * py + pz * pz < r * r) return true;
    }
    return false;
  }

  /** Can one eye see another: nothing solid and no smoke between. */
  _see(ax, ay, az, bx, by, bz) {
    return this.map.sees(ax, ay, az, bx, by, bz) && !this._smoked(ax, ay, az, bx, by, bz);
  }

  /** A noise at a player (a shot, a stab, a blast): enemy bots within `far` turn to it. */
  _noise(p, far) {
    for (const q of this.players) {
      if (!q.bot || !q.alive || q.squad === p.squad || q.target != null) continue;
      if (Math.hypot(q.x - p.x, q.z - p.z) < far) q.heard = { x: p.x, z: p.z, at: this.time };
    }
  }

  /* ------------------------------------------------------ the team plan */

  /**
   * How the Raiders take this round: a `rush` (straight in), an `execute`
   * (gather at the two ways into a site, then go in together behind smoke),
   * or a `fake` (gather at the other site and make noise there first).
   */
  _makePlan() {
    const site = this.rand() < 0.5 ? 'A' : 'B';
    const r = this.rand();
    const style = r < 0.2 ? 'rush' : r < 0.4 ? 'fake' : 'execute';
    return { site, style, go: style === 'rush', faking: style === 'fake' ? (site === 'A' ? 'B' : 'A') : null, stagedAt: null, retakeGo: false };
  }

  _planTick() {
    const plan = this.plan;
    if (this.phase === 'live' && !plan.go) {
      const site = plan.faking ?? plan.site;
      const raiders = this.living('atk');
      const staged = raiders.filter((p) => this.map.PLAN.stage[site].some((k) => Math.hypot(p.x - this.map.NODES[k][0], p.z - this.map.NODES[k][1]) < 8)).length;
      if (staged >= Math.ceil(raiders.length * 0.6)) plan.stagedAt ??= this.time;
      const elapsed = (this.map.PLAN.round ?? TIME.round) - this.timer;
      const ready = plan.stagedAt != null && this.time - plan.stagedAt > (plan.faking ? 4 : 2);
      if (plan.faking && (ready || elapsed > 32)) {
        // The fake is done: a grenade into that site for the noise, then everyone to the real one.
        const noisy = raiders.find((p) => p.bot && p.nades.frag > 0);
        if (noisy) this._lob(noisy, 'frag', this.map.SITES[site].x, this.map.SITES[site].z);
        plan.faking = null;
        plan.stagedAt = null;
        plan.style = 'rush';
        plan.go = true;
      } else if (!plan.faking && (ready || elapsed > 40 || this.timer < 60)) {
        plan.go = true;
        this._utility('atk', this.map.PLAN.smokes[plan.site], this.map.HOLDS[plan.site].slice(0, 2));
      }
    }
    // Wardens take a site back together, behind smoke.
    if (this.phase === 'planted' && !plan.retakeGo) {
      const k = this.map.PLAN.retake[this.charge.site];
      const defs = this.living('def');
      const there = defs.filter((p) => Math.hypot(p.x - this.map.NODES[k][0], p.z - this.map.NODES[k][1]) < 9).length;
      if (there >= Math.min(2, defs.length) || this.timer < 22 || !this.living('atk').length) {
        plan.retakeGo = true;
        this._utility('def', this.map.PLAN.retakeSmokes[this.charge.site], [this.charge.site]);
      }
    }
  }

  /** A side's bots smoke `smokes` (points) and frag `frags` (node names), each from whoever is nearest and carries one. */
  _utility(side, smokes, frags) {
    const bots = this.living(side).filter((p) => p.bot);
    const throwFrom = (kind, x, z) => {
      const p = bots.filter((b) => b.nades[kind] > 0 && b.cool <= 0 && Math.hypot(b.x - x, b.z - z) < 40).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
      if (p) this._lob(p, kind, x + (this.rand() - 0.5) * 1.5, z + (this.rand() - 0.5) * 1.5);
    };
    for (const [x, z] of smokes) throwFrom('smoke', x, z);
    for (const k of frags) throwFrom('frag', this.map.NODES[k][0], this.map.NODES[k][1]);
  }

  /* ---------------------------------------------------------------- bots */

  /** How far a bot still has to walk along its path. */
  _pathLeft(p) {
    let d = 0;
    let [x, z] = [p.x, p.z];
    for (const w of p.path) {
      d += Math.hypot(w.x - x, w.z - z);
      [x, z] = [w.x, w.z];
    }
    return d;
  }

  /** Whether a straight walk from here to there is clear. */
  _walkable(x0, z0, x1, z1) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5);
    for (let i = 1; i <= n; i++) if (!this.map.clear(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, 0.45)) return false;
    return true;
  }

  /** The nearest spot within a short run that `enemy` cannot see: beside a box, on the far side from them. */
  _coverFrom(p, enemy) {
    let best = null;
    let bestD = Infinity;
    for (const [bx, bz, w, d, h] of this.map.BOXES) {
      if (h < 1.25) continue;
      const cx = bx + w / 2;
      const cz = bz + d / 2;
      if (Math.hypot(cx - p.x, cz - p.z) > 16 + Math.max(w, d) / 2) continue;
      for (const [x, z] of [[bx - 0.9, bz - 0.9], [bx + w + 0.9, bz - 0.9], [bx - 0.9, bz + d + 0.9], [bx + w + 0.9, bz + d + 0.9], [cx, bz - 0.9], [cx, bz + d + 0.9], [bx - 0.9, cz], [bx + w + 0.9, cz]]) {
        const dist = Math.hypot(x - p.x, z - p.z);
        if (dist >= bestD || dist > 14 || !this.map.clear(x, z, 0.45)) continue;
        if (this.map.sees(enemy.x, enemy.y + PLAYER.eye, enemy.z, x, 1.3, z)) continue;
        if (!this._walkable(p.x, p.z, x, z)) continue;
        best = { x, z };
        bestD = dist;
      }
    }
    return best;
  }

  /** Is there room to sidestep (`s` −1 left, 1 right)? */
  _room(p, s) {
    return this.map.clear(p.x + Math.cos(p.yaw) * s * 0.9, p.z - Math.sin(p.yaw) * s * 0.9, 0.45);
  }

  /** Walk towards a point whatever way we face (the command's f and s). */
  _toward(cmd, x, z, p) {
    const rel = turn(cmd.yaw, Math.atan2(-(x - p.x), -(z - p.z)));
    cmd.f = Math.cos(rel);
    cmd.s = -Math.sin(rel);
  }

  /** What a bot does this step: where it looks, where it walks, whether it shoots. */
  _think(p, dt, live) {
    const best = p.primary ? 1 : 2;
    const cmd = { f: 0, s: 0, yaw: p.yaw, pitch: p.pitch, fire: false, shoot: false, reload: false, use: false, jump: false, slot: p.slot === 3 ? best : p.slot, scope: 0, error: 0 };
    if (!live) return cmd;
    const side = this.sideOf(p.squad);
    const eye = p.y + PLAYER.eye;
    const sk = this.skill;
    // Who can it see? Enemies in front (or very close), with nothing solid or smoky between; it fights the nearest.
    let seen = null;
    let seenD = Infinity;
    const visible = [];
    for (const q of this.players) {
      if (!q.alive || q.squad === p.squad) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d > this.map.PLAN.sight) continue;
      const bearing = Math.atan2(-(q.x - p.x), -(q.z - p.z));
      if (d > 5 && Math.abs(turn(p.yaw, bearing)) > rad(75) && p.target !== q.id) continue;
      if (!this._see(p.x, eye, p.z, q.x, q.y + 1.3, q.z) && !this._see(p.x, eye, p.z, q.x, q.y + 1.62, q.z)) continue;
      visible.push(q);
      if (d < seenD) {
        seen = q;
        seenD = d;
      }
    }
    if (seen) {
      if (p.target !== seen.id) {
        p.target = seen.id;
        // Someone holding an angle is quicker than someone walking into it; the head, more often the better the bot.
        p.reactAt = this.time + sk.react * (0.75 + this.rand() * 0.6) * (!p.moving ? 0.75 : 1);
        p.aimHead = this.rand() < sk.head;
      }
      if (side === 'def' && this.phase === 'live') {
        const near = Object.entries(this.map.SITES).map(([k, v]) => [k, Math.hypot(seen.x - v.x, seen.z - v.z)]).sort((a, b) => a[1] - b[1])[0];
        if (near[1] < this.map.PLAN.alarm && (!this.alarm || this.alarm.site !== near[0] || this.time - this.alarm.at > 6)) this.alarm = { site: near[0], at: this.time };
      }
      p.lastSeen = { x: seen.x, z: seen.z, at: this.time };
      p.heard = null;
    } else if (p.target != null) {
      const t = this.players[p.target];
      if (!t?.alive || this.time - (p.lastSeen?.at ?? 0) > 3) p.target = null;
    }
    const id = this.weaponOf(p);
    const w = WEAPONS[id];
    const ammo = p.ammo[id] ?? 0;
    const busy = this._botUse(p, side, Boolean(seen));
    if (busy) {
      cmd.use = true;
      return cmd;
    }
    if (seen) return this._fight(p, cmd, seen, seenD, visible, side, dt);
    // Out of a fight. Reload while it is quiet; knife out to run a long way where nothing is about.
    const recent = (o, s) => o && this.time - o.at < s;
    const quiet = !recent(p.lastSeen, 6) && !recent(p.heard, 4);
    if (w.mag && (!ammo || (ammo < w.mag * 0.5 && quiet))) cmd.reload = true;
    // Lost them behind cover a moment ago: a grenade where they went.
    if (p.target != null && p.lastSeen && p.nades.frag > 0 && this.time - p.lastSeen.at > 1 && this.time - p.lastSeen.at < 2.5) {
      const d = Math.hypot(p.lastSeen.x - p.x, p.lastSeen.z - p.z);
      if (d > 8 && d < 30 && this.rand() < dt * 1.5) this._lob(p, 'frag', p.lastSeen.x, p.lastSeen.z);
    }
    const goal = this._botGoal(p, side);
    if (goal.key !== p.goal) {
      p.goal = goal.key;
      p.path = goal.node ? this.map.route(this.map.nearestNode(p.x, p.z), goal.node, p.avoid).map((k) => ({ x: this.map.NODES[k][0] + (this.rand() - 0.5) * 1.6, z: this.map.NODES[k][1] + (this.rand() - 0.5) * 1.6 })) : [];
      if (goal.point) p.path.push(goal.point);
      if (p.path.length > 1 && Math.hypot(p.path[0].x - p.x, p.path[0].z - p.z) < 2.5) p.path.shift();
    }
    while (p.path.length && Math.hypot(p.path[0].x - p.x, p.path[0].z - p.z) < 0.9) p.path.shift();
    // Cut corners: if the place after next is in a straight, clear line, go for it.
    if (p.path.length > 1 && Math.floor(this.time * 4 + p.id) % 4 === 0 && this._walkable(p.x, p.z, p.path[1].x, p.path[1].z)) p.path.shift();
    cmd.slot = quiet && !p.hasCharge && p.path.length > 1 && this._pathLeft(p) > 28 ? 3 : best;
    const next = p.path[0];
    // Where to look: a sound, or where someone was just seen; else ahead, where trouble would come from.
    const look = recent(p.heard, 3) ? p.heard : recent(p.lastSeen, 4) ? p.lastSeen : null;
    if (next) {
      const ahead = p.path[1] ?? next;
      const face = look ? Math.atan2(-(look.x - p.x), -(look.z - p.z)) : Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z));
      const rate = rad(look ? 420 : 280) * dt;
      cmd.yaw = p.yaw + Math.max(-rate, Math.min(rate, turn(p.yaw, face)));
      cmd.pitch = p.pitch * 0.9;
      this._toward(cmd, next.x, next.z, p);
      // Don't bunch up behind a teammate.
      for (const q of this.players) {
        if (q === p || !q.alive || q.squad !== p.squad) continue;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < 1.3 && d > 0.01) {
          const away = turn(cmd.yaw, Math.atan2(-(p.x - q.x), -(p.z - q.z)));
          cmd.s += -Math.sin(away) * 0.6;
        }
      }
      // Stuck against a corner? Sidestep and hop, then find the way again.
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
      // Arrived: hold, sweeping slowly the way trouble would come from (or towards a sound).
      const watch = look ? [look.x, look.z] : goal.watch ?? this.map.PLAN.watch.idle;
      const base = Math.atan2(-(watch[0] - p.x), -(watch[1] - p.z));
      const want = base + (look ? 0 : Math.sin(this.time * 0.7 + p.id * 1.7) * rad(32));
      cmd.yaw = p.yaw + Math.max(-rad(160) * dt, Math.min(rad(160) * dt, turn(p.yaw, want)));
      cmd.pitch = p.pitch * 0.9;
      if (this.rand() < dt / 8) p.goal = null;
    }
    p.was = { x: p.x, z: p.z };
    return cmd;
  }

  /**
   * A bot in a fight: turn onto the target and shoot in bursts, standing
   * still for each (a moving gun is a wild one) and sidestepping between;
   * rush in close with a shotgun or SMG; fall back behind cover to reload
   * or when hurt and losing; grenade a group.
   */
  _fight(p, cmd, seen, seenD, visible, side, dt) {
    const sk = this.skill;
    const best = p.primary ? 1 : 2;
    // A knife in hand and someone in reach: stab. Otherwise the gun.
    const stab = p.slot === 3 && seenD < 1.8;
    cmd.slot = stab ? 3 : best;
    const id = this.weaponOf(p);
    const w = WEAPONS[id];
    const ammo = p.ammo[id] ?? 0;
    const eye = p.y + PLAYER.eye;
    const aimY = seen.y + (p.aimHead ? 1.55 : 1.15);
    const wantYaw = Math.atan2(-(seen.x - p.x), -(seen.z - p.z));
    const wantPitch = Math.atan2(aimY - eye, seenD);
    const rate = rad(sk.turn) * dt;
    cmd.yaw = p.yaw + Math.max(-rate, Math.min(rate, turn(p.yaw, wantYaw)));
    cmd.pitch = p.pitch + Math.max(-rate, Math.min(rate, wantPitch - p.pitch));
    const onAim = Math.abs(turn(cmd.yaw, wantYaw)) < rad(3.5) && Math.abs(cmd.pitch - wantPitch) < rad(3.5);
    if (stab) {
      cmd.f = 1;
      cmd.shoot = onAim && p.cool <= 0;
      return cmd;
    }
    // Back to cover: empty, reloading, or hurt and outgunned (never with the charge in a site).
    const losing = p.hp < 40 && seen.hp > p.hp + 20;
    if ((!ammo || p.reloading > 0 || losing) && !(p.cover && this.time < p.cover.until)) {
      const c = this._coverFrom(p, seen);
      p.cover = c ? { ...c, until: this.time + 2.5 } : null;
    }
    if (p.cover && this.time < p.cover.until && Math.hypot(p.cover.x - p.x, p.cover.z - p.z) > 0.6) {
      this._toward(cmd, p.cover.x, p.cover.z, p);
      if (w.mag && ammo < w.mag) cmd.reload = true;
      return cmd;
    }
    if (!ammo) {
      cmd.reload = true;
      return cmd;
    }
    const close = seenD < 10 || w.range < 50;
    const holding = side === 'def' && this.phase === 'live' && p.hp > 55 && !close;
    cmd.scope = w.zoom && seenD > 10 ? (seenD > 45 ? w.zoom.length : 1) : 0;
    if (this.time >= (p.reactAt ?? 0) && onAim && p.reloading <= 0) {
      if (p.rest > 0) p.rest -= dt;
      else {
        cmd.error = sk.error * (0.5 + this.rand()) * (seenD > 30 ? 1.25 : 1);
        cmd.fire = true;
        cmd.shoot = p.cool <= 0;
        const burst = seenD > 30 ? Math.max(1, sk.burst - 2) : seenD > 15 ? sk.burst : sk.burst + 2;
        if (p.cool <= 0 && ++p.burst >= burst + Math.floor(this.rand() * 2)) {
          p.burst = 0;
          p.rest = 0.15 + this.rand() * 0.3 + (seenD > 30 ? 0.2 : 0);
        }
      }
    }
    // Moving in a fight: up close, weave and close in; at range, sidestep between bursts and
    // stand still to shoot. (The legs ease between these — see step() — so it never twitches.)
    const shooting = cmd.fire;
    if (this.time > p.dodgeUntil) {
      p.dodge = this.rand() < 0.5 ? -1 : 1;
      p.dodgeUntil = this.time + (close ? 0.3 + this.rand() * 0.4 : 0.35 + this.rand() * 0.45);
    }
    if (close) {
      cmd.s = p.dodge * 0.8;
      if (w.range < 50 && seenD > 4) cmd.f = 0.8;
    } else if (!shooting) cmd.s = p.dodge * (holding ? 0.5 : 1);
    // No room that way: stand, and pick again soon (rather than flipping back and forth each step).
    if (cmd.s && !this._room(p, Math.sign(cmd.s))) {
      cmd.s = 0;
      p.dodgeUntil = Math.min(p.dodgeUntil, this.time + 0.15);
    }
    if (w.zoom) cmd.f = 0;
    // Two or more of them close together, not too near: a grenade.
    if (p.nades.frag > 0 && visible.length >= 2 && seenD > 12 && seenD < 32 && this.rand() < dt * 0.8) {
      const [a, b] = visible;
      if (Math.hypot(a.x - b.x, a.z - b.z) < 5) this._lob(p, 'frag', (a.x + b.x) / 2, (a.z + b.z) / 2);
    }
    return cmd;
  }

  /** Should this bot be setting or disarming the charge right now? */
  _botUse(p, side, seen) {
    if (side === 'atk' && p.hasCharge && this.phase === 'live') {
      const s = this.map.SITES[this.plan.site];
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
    const plan = this.plan;
    // A teammate just fell nearby: go at whoever did it.
    if (p.trade && this.time - p.trade < 5 && p.lastSeen && !p.hasCharge && Math.hypot(p.lastSeen.x - p.x, p.lastSeen.z - p.z) < 35) {
      return { key: `trade${p.trade}`, node: this.map.nearestNode(p.lastSeen.x, p.lastSeen.z), point: { x: p.lastSeen.x, z: p.lastSeen.z }, watch: [p.lastSeen.x, p.lastSeen.z] };
    }
    if (side === 'atk') {
      if (this.charge?.state === 'dropped') {
        // The nearest Raider goes back for it.
        const near = this.living('atk').sort((a, b) => Math.hypot(a.x - this.charge.x, a.z - this.charge.z) - Math.hypot(b.x - this.charge.x, b.z - this.charge.z))[0];
        if (near === p) return { key: 'fetch', node: this.map.nearestNode(this.charge.x, this.charge.z), point: { x: this.charge.x, z: this.charge.z } };
      }
      if (this.phase === 'planted') {
        const site = this.charge.site;
        return { key: `guard${site}:${pick(this.map.HOLDS[site])}`, node: pick(this.map.HOLDS[site]), watch: this.map.PLAN.watch.guard };
      }
      if (!plan.go) {
        // Gather where this one comes in from, out of sight of the site.
        const site = plan.faking ?? plan.site;
        const stage = this.map.PLAN.stage[site][p.id % 2];
        return { key: `stage${site}:${stage}`, node: stage, watch: [this.map.SITES[site].x, this.map.SITES[site].z] };
      }
      const site = plan.site;
      if (p.hasCharge) return { key: `plant${site}`, node: site, watch: this.map.PLAN.watch.plant };
      return { key: `push${site}:${pick(this.map.HOLDS[site].slice(0, 3))}`, node: pick(this.map.HOLDS[site].slice(0, 3)), watch: this.map.PLAN.watch.guard };
    }
    if (this.charge?.state === 'planted') {
      const site = this.charge.site;
      const charge = [this.charge.x, this.charge.z];
      if (!plan.retakeGo) return { key: `regroup${site}`, node: this.map.PLAN.retake[site], watch: charge };
      // In together: the nearest disarms, the rest clear the site around them.
      const nearest = this.living('def').sort((a, b) => Math.hypot(a.x - charge[0], a.z - charge[1]) - Math.hypot(b.x - charge[0], b.z - charge[1]))[0];
      if (nearest === p || !this.living('atk').length) return { key: 'disarm', node: site, point: { x: charge[0] + 0.6, z: charge[1] }, watch: this.map.PLAN.watch.disarm };
      return { key: `clear${site}:${pick(this.map.HOLDS[site])}`, node: pick(this.map.HOLDS[site]), watch: this.map.PLAN.watch.disarm };
    }
    // A call for help, a couple of seconds old (word has to travel): leave your post for that site.
    const called = this.alarm && this.time - this.alarm.at > 0.6 && this.time - this.alarm.at < 25 ? this.alarm.site : null;
    const post = called ?? p.post ?? 'mid';
    return { key: `hold${post}:${pick(this.map.HOLDS[post])}`, node: pick(this.map.HOLDS[post]), watch: this.map.PLAN.watch.hold[post] };
  }

  /**
   * What a bot buys: by its part in the team (two riflers, an entry with a
   * shotgun or SMG, a scope, a heavy), and with the team — when the team is
   * short of money they all save together, buying only a better pistol.
   */
  _botBuy(p) {
    const side = this.sideOf(p.squad);
    const mates = this.players.filter((q) => q.squad === p.squad);
    const average = mates.reduce((s, q) => s + q.money, 0) / mates.length;
    const eco = average < 2600 && !p.primary;
    const role = ['rifle', 'entry', 'rifle', 'scope', 'heavy'][p.id % 5];
    if (!p.primary && !eco) {
      const wants = {
        rifle: side === 'atk' ? ['vantage', 'bulwark', 'sparrow', 'hornet', 'badger'] : ['kestrel', 'vantage', 'sparrow', 'hornet', 'badger'],
        entry: this.rand() < 0.5 ? ['ripsaw', 'hornet', 'gavel', 'wasp', 'badger'] : ['hornet', 'wasp', 'ripsaw', 'gavel', 'badger'],
        scope: [['longwatch', 'falcon', 'marksman', 'heron', 'sparrow'], ['ironpeak', 'longwatch', 'heron', 'sparrow'], ['marksman', 'falcon', 'heron', 'vantage'], ['heron', 'marksman', 'kestrel', 'sparrow']][Math.floor(this.rand() * 4)],
        heavy: this.rand() < 0.4 ? ['anvil', 'bulwark', 'vantage', 'sparrow'] : ['bulwark', 'vantage', 'sparrow', 'wasp']
      }[role];
      // The first it can afford and still wear armour; failing that, the first it can afford at all.
      const pick = wants.find((w) => p.money - WEAPONS[w].price >= 650) ?? wants.find((w) => p.money >= WEAPONS[w].price);
      if (pick) this.buy(p, pick);
    }
    if (eco && p.secondary === 'sidearm' && p.money >= 700) this.buy(p, this.rand() < 0.5 ? 'viper' : 'ram');
    if (p.money >= 1000 && !p.helmet && !eco) this.buy(p, 'helmet');
    else if (p.money >= (eco ? 1400 : 650) && p.armor < 100) this.buy(p, 'vest');
    if (side === 'def' && p.money >= 400 && !p.kit && !eco) this.buy(p, 'kit');
    // Money to spare: now and then a better blade.
    if (!eco && p.melee === 'knife' && p.money >= 2500 && this.rand() < 0.25) this.buy(p, ['karambit', 'machete', 'hatchet', 'fireaxe'][Math.floor(this.rand() * 4)]);
    if (!eco) {
      if (p.money >= 300 && (side === 'atk' || this.rand() < 0.5)) this.buy(p, 'smoke');
      if (p.money >= 300) this.buy(p, 'frag');
    }
  }
}
