/**
 * Stoneball: the match itself, with no three.js and no DOM — six cavemen,
 * one heavy stone, a fixed tick. Everything that decides the game lives
 * here (players, ball physics, goals, the clock, the AI), so a match can run
 * headless (tests) or, later, on a server.
 *
 *   const m = createMatch({ seed: 7, length: 180, teams: [{ control: 'human' }, { control: 'ai', skill: 'hard' }] });
 *   step(m, { [m.human.pid]: { mx: 1, mz: 0, sprint: true } });   // one tick (TICK seconds)
 *   m.events                                                          // what happened this tick
 *
 * Coordinates: the pitch lies along x (goals at x = ±PITCH.hx), across z,
 * y is up. Team 0 attacks +x, team 1 attacks −x. A facing angle `face`
 * points along (sin face, cos face) — the way a three.js model turned by
 * rotation.y = face looks.
 */

export const TICK = 1 / 60;
export const PITCH = { hx: 18, hz: 12, corner: 3, goalHalf: 2.6, bar: 2.1, depth: 1.7, post: 0.3, boxDepth: 5.5, boxHalf: 6, circle: 3.2 };
/** A heavy stone: low bounce, real rolling friction (roll + drag·speed), a little air drag. */
export const BALL = { r: 0.32, gravity: 22, bounce: 0.34, wall: 0.55, roll: 2.4, drag: 0.5, air: 0.06, hit: 12.5 };
export const PLAYER = { r: 0.42, run: 6.2, sprint: 8.8, accel: 36, reach: 0.95, carry: 0.8, turn: 11, drain: 0.3, regain: 0.15 };

/** How good a team's AI is: reaction (s), speed factor, aim spread (rad), keeper saving, tackling, shooting range. */
export const SKILLS = {
  easy: { react: 0.42, speed: 0.9, aim: 0.26, save: 0.46, tackle: 0.12, steal: 0.35, range: 10, pass: 0.45, shootP: 0.45 },
  normal: { react: 0.22, speed: 1, aim: 0.15, save: 0.64, tackle: 0.24, steal: 0.7, range: 12, pass: 0.65, shootP: 0.7 },
  hard: { react: 0.12, speed: 1.05, aim: 0.08, save: 0.76, tackle: 0.36, steal: 1.05, range: 14, pass: 0.8, shootP: 0.85 }
};

/** Leather outfits a tribe may wear. */
export const LEATHERS = [
  { id: 'tan', name: 'Tan Hide', tribe: 'Flint Clan', colour: '#c8955a', dark: '#7a5230' },
  { id: 'ochre', name: 'Red Ochre', tribe: 'Ember Clan', colour: '#9a3f27', dark: '#5a2116' },
  { id: 'woad', name: 'Woad Blue', tribe: 'River Clan', colour: '#4f7199', dark: '#2c4058' },
  { id: 'moss', name: 'Moss Green', tribe: 'Fern Clan', colour: '#6f8a3c', dark: '#3f5222' }
];
export const LENGTHS = [120, 180, 300];
export const HAIR = ['#2a1d14', '#3b2516', '#141110', '#6b3518', '#4a2f1d', '#8a5a2c'];
export const SKIN = ['#e9b48c', '#d79c72', '#b97a52', '#8e5a3a', '#f0c49e'];
const NAMES = ['Grok', 'Ugga', 'Thak', 'Mog', 'Brakk', 'Oona', 'Zug', 'Krag', 'Ruk', 'Dunga', 'Hrum', 'Flinta', 'Bogg', 'Ama', 'Tor', 'Gurr', 'Pib', 'Yaba'];
const ROLES = ['keeper', 'defender', 'forward'];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const sign = (v) => (v < 0 ? -1 : 1);

/** The match's own random stream (mulberry32 over state.seed): repeatable. */
export function rand(state) {
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The direction a team attacks along x. */
export const attackDir = (team) => (team === 0 ? 1 : -1);

/* ================================================================ setup */

/**
 * A new match. `teams[i]`: { leather (id), control: 'human' | 'ai' | 'idle', skill: 'easy' | 'normal' | 'hard' }.
 * One human team at most; its controlled caveman is `state.human.pid`.
 */
export function createMatch({ seed = 1, length = 180, golden = true, teams = [] } = {}) {
  const state = {
    seed: seed | 0 || 1,
    t: 0,
    tick: 0,
    length,
    clock: length,
    golden,
    overtime: false,
    phase: 'kickoff',
    phaseT: 1.4,
    kickoffTeam: 0,
    score: [0, 0],
    lastGoal: null,
    shotId: 0,
    events: [],
    teams: [0, 1].map((i) => {
      const t = teams[i] ?? {};
      const leather = LEATHERS.find((l) => l.id === t.leather) ?? LEATHERS[i];
      return { leather: leather.id, name: t.name ?? leather.tribe, colour: leather.colour, dark: leather.dark, control: t.control ?? 'ai', skill: SKILLS[t.skill] ? t.skill : 'normal' };
    }),
    players: [],
    ball: { x: 0, y: BALL.r, z: 0, vx: 0, vy: 0, vz: 0, owner: -1, lastTouch: -1, shot: 0, shotTeam: -1 },
    human: null
  };
  const names = NAMES.slice();
  for (let team = 0; team < 2; team++) {
    for (let k = 0; k < 3; k++) {
      const name = names.splice(Math.floor(rand(state) * names.length), 1)[0];
      state.players.push({
        id: team * 3 + k,
        team,
        role: ROLES[k],
        name,
        x: 0, z: 0, vx: 0, vz: 0,
        face: 0,
        stamina: 1,
        stun: 0, tackleT: 0, tackleCd: 0, dive: 0, diveV: 0, kickCd: 0, holding: 0,
        rolled: -1, rollOk: false,
        act: null, actT: 0, actN: 0,
        ai: { next: rand(state) * 0.2, tx: 0, tz: 0, sprint: false, hold: 0 },
        look: {
          hair: HAIR[Math.floor(rand(state) * HAIR.length)],
          skin: SKIN[Math.floor(rand(state) * SKIN.length)],
          beard: rand(state) < 0.55,
          shag: rand(state),
          wide: 0.94 + rand(state) * 0.16 + (k === 1 ? 0.06 : 0),
          tall: 0.92 + rand(state) * 0.14
        }
      });
    }
  }
  const humanTeam = state.teams.findIndex((t) => t.control === 'human');
  if (humanTeam >= 0) state.human = { team: humanTeam, pid: humanTeam * 3 + 2 };
  resetKickoff(state, 0);
  return state;
}

/** Everyone back to their half, the ball on the spot; `team` kicks off. */
export function resetKickoff(state, team) {
  state.kickoffTeam = team;
  state.phase = 'kickoff';
  state.phaseT = 1.4;
  const b = state.ball;
  Object.assign(b, { x: 0, y: BALL.r, z: 0, vx: 0, vy: 0, vz: 0, owner: -1, lastTouch: -1, shotTeam: -1 });
  for (const p of state.players) {
    const d = attackDir(p.team);
    const kicking = p.team === team;
    let u, z;
    if (p.role === 'keeper') [u, z] = [-PITCH.hx + 1.1, 0];
    else if (p.role === 'defender') [u, z] = [kicking ? -6 : -8, p.team === 0 ? 3 : -3];
    else [u, z] = kicking ? [-PLAYER.carry, 0] : [-PITCH.circle - 1, 0];
    Object.assign(p, { x: u * d, z, vx: 0, vz: 0, face: d > 0 ? Math.PI / 2 : -Math.PI / 2, stun: 0, tackleT: 0, dive: 0, kickCd: 0, holding: 0, act: null, actT: 0 });
    p.ai.next = 0;
  }
  const taker = state.players.find((p) => p.team === team && p.role === 'forward');
  b.owner = taker.id;
  b.lastTouch = taker.id;
  if (state.human && state.human.team === team) state.human.pid = taker.id;
  else if (state.human) state.human.pid = state.human.team * 3 + 2;
}

/* ================================================================ geometry */

/**
 * Inside the rounded-rectangle wall? Returns the inward normal and how far
 * something of radius `rad` at (x, z) pokes through, or null.
 */
export function wallContact(x, z, rad) {
  const ix = PITCH.hx - PITCH.corner, iz = PITCH.hz - PITCH.corner;
  const dx = x - clamp(x, -ix, ix), dz = z - clamp(z, -iz, iz);
  const d = Math.hypot(dx, dz);
  const lim = PITCH.corner - rad;
  if (d <= lim || d < 1e-9) return null;
  return { nx: -dx / d, nz: -dz / d, depth: d - lim };
}

/** Is (x, z) in the keeper's box of `team`? */
export function inBox(team, x, z, pad = 0) {
  const u = x * attackDir(team);
  return u < -PITCH.hx + PITCH.boxDepth + pad && Math.abs(z) < PITCH.boxHalf + pad;
}

/** How far a grounded stone rolls from speed v0 before it stops (the friction model, solved). */
export function stopDistance(v0) {
  const A = BALL.roll, K = BALL.drag;
  return v0 / K - (A / (K * K)) * Math.log(1 + (K * v0) / A);
}

/** The ground speed that carries the stone `dist` and a bit beyond (so it arrives still rolling). */
export function rollSpeed(dist, spare = 2.5) {
  const want = dist + spare;
  let lo = 0, hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (stopDistance(mid) < want) lo = mid;
    else hi = mid;
  }
  return clamp(hi, 5, 24);
}

/* ================================================================ actions */

function setAct(p, name, t) {
  p.act = name;
  p.actT = t;
  p.actN++;
}

function emit(state, type, extra = {}) {
  state.events.push({ type, t: state.t, ...extra });
}

/** Strike the stone from p's feet along (dx, dz) at `speed`, `lift` upward. */
export function kick(state, p, dx, dz, speed, lift = 0, kind = 'kick') {
  const b = state.ball;
  const n = Math.hypot(dx, dz) || 1;
  dx /= n;
  dz /= n;
  if (p.holding) {
    b.y = 0.9;
    p.holding = 0;
  }
  b.owner = -1;
  b.vx = dx * speed;
  b.vz = dz * speed;
  b.vy = lift;
  b.lastTouch = p.id;
  b.fromX = b.x;
  b.fromZ = b.z;
  b.shot = ++state.shotId;
  b.shotTeam = kind === 'shot' ? p.team : -1;
  p.kickCd = 0.32;
  p.face = Math.atan2(dx, dz);
  setAct(p, kind === 'pass' ? 'pass' : kind === 'throw' ? 'throw' : 'kick', 0.42);
  emit(state, kind, { pid: p.id, team: p.team, x: b.x, z: b.z, power: speed });
}

/** A shot by p (power 0…1) along (dx, dz), nudged onto the goal when it is roughly on target. */
export function shoot(state, p, dx, dz, power) {
  const b = state.ball;
  const d = attackDir(p.team);
  const gx = d * PITCH.hx;
  let n = Math.hypot(dx, dz);
  if (n < 0.1) [dx, dz, n] = [gx - b.x, -b.z, Math.hypot(gx - b.x, b.z)];
  dx /= n;
  dz /= n;
  // Aim help: if the line would pass near the goal, bend it inside the posts.
  if (dx * d > 0.25) {
    const t = (gx - b.x) / dx;
    const zHit = b.z + dz * t;
    if (Math.abs(zHit) < PITCH.goalHalf + 4) {
      const z = clamp(zHit, -(PITCH.goalHalf - 0.55), PITCH.goalHalf - 0.55);
      [dx, dz] = [gx - b.x, z - b.z];
    }
  }
  power = clamp(power, 0, 1);
  kick(state, p, dx, dz, 13 + power * 17, 1 + power * 5.5, 'shot');
}

/** The best teammate to pass to, preferring the way `pref` points (or forward). */
export function passTarget(state, p, pref = null) {
  const d = attackDir(p.team);
  let best = null, bestScore = -Infinity;
  for (const q of state.players) {
    if (q.team !== p.team || q === p) continue;
    const dx = q.x - p.x, dz = q.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.2 || dist > 30) continue;
    const forward = (dx * d) / dist;
    const align = pref ? (dx * pref[0] + dz * pref[1]) / (dist * (Math.hypot(pref[0], pref[1]) || 1)) : 0;
    let open = 3;
    for (const o of state.players) {
      if (o.team === p.team) continue;
      open = Math.min(open, segDist(o.x, o.z, p.x, p.z, q.x, q.z));
    }
    const score = align * 2.5 + forward * 1.1 + open * 0.8 - dist * 0.05 - (q.role === 'keeper' ? 2.5 : 0);
    if (score > bestScore) [best, bestScore] = [q, score];
  }
  return best;
}

/** Pass to q along the ground, leading a runner. */
export function passTo(state, p, q) {
  const b = state.ball;
  let tx = q.x, tz = q.z;
  for (let i = 0; i < 2; i++) {
    const dist = Math.hypot(tx - b.x, tz - b.z);
    const t = dist / Math.max(6, rollSpeed(dist) * 0.7);
    tx = clamp(q.x + q.vx * t, -PITCH.hx + 1, PITCH.hx - 1);
    tz = clamp(q.z + q.vz * t, -PITCH.hz + 1, PITCH.hz - 1);
  }
  const dist = Math.hypot(tx - b.x, tz - b.z);
  kick(state, p, tx - b.x, tz - b.z, rollSpeed(dist), dist > 16 ? 2.5 : 0.4, p.holding ? 'throw' : 'pass');
  state.ball.passTo = q.id;
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / L, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/* ================================================================ the tick */

const IDLE = Object.freeze({ mx: 0, mz: 0 });

/** Advance one tick. `inputs[pid]` drives a caveman (the human's, or anyone's in tests/netplay): { mx, mz, sprint, charge, shoot (0…1, on release), pass, tackle }. */
export function step(state, inputs = {}) {
  const dt = TICK;
  state.events = [];
  state.t += dt;
  state.tick++;

  if (state.phase === 'kickoff') {
    state.phaseT -= dt;
    holdBall(state);
    if (state.phaseT <= 0) {
      state.phase = 'play';
      state.kickoffAt = state.t;
      emit(state, 'whistle', { kind: 'kickoff' });
    }
    return state.events;
  }

  if (state.phase === 'play') {
    state.clock -= dt;
    if (state.clock <= 0) {
      state.clock = 0;
      if (state.score[0] !== state.score[1] || !state.golden || state.overtime) return finish(state);
      state.overtime = true;
      state.clock = 60;
      emit(state, 'golden');
    }
  }

  const playing = state.phase === 'play';
  // Alternate who moves first each tick, so neither team always sees the other's latest step.
  const order = state.tick % 2 ? state.players : [...state.players.slice(3), ...state.players.slice(0, 3)];
  for (const p of order) {
    let input = IDLE;
    if (playing) {
      const ctl = state.teams[p.team].control;
      // Given input wins (the human, or a remote player); otherwise the AI plays, unless the side is idle.
      if (inputs[p.id]) input = inputs[p.id];
      else if (state.human && p.id === state.human.pid) input = IDLE;
      else if (ctl === 'ai' || ctl === 'human') input = aiInput(state, p);
    }
    movePlayer(state, p, input, dt);
    if (playing) act(state, p, input);
  }
  separate(state);
  ballStep(state, dt);
  if (playing) {
    contacts(state);
    checkGoal(state);
    if (state.human) autoSwitch(state);
  }
  if (state.phase === 'goal') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.overtime) return finish(state);
      resetKickoff(state, state.kickoffTeam);
    }
  }
  return state.events;
}

function finish(state) {
  state.phase = 'end';
  state.phaseT = 0;
  const [a, b] = state.score;
  const winner = a === b ? -1 : a > b ? 0 : 1;
  state.winner = winner;
  for (const p of state.players) {
    p.vx = p.vz = 0;
    if (winner >= 0) setAct(p, p.team === winner ? 'cheer' : 'sad', 99);
  }
  emit(state, 'whistle', { kind: 'end' });
  emit(state, 'end', { winner });
  return state.events;
}

/** During the kick-off pause the taker keeps the stone at his feet. */
function holdBall(state) {
  const b = state.ball;
  const p = state.players[b.owner];
  if (!p) return;
  b.x = p.x + Math.sin(p.face) * PLAYER.carry;
  b.z = p.z + Math.cos(p.face) * PLAYER.carry;
  b.y = BALL.r;
  b.vx = b.vy = b.vz = 0;
}

function movePlayer(state, p, input, dt) {
  const skill = SKILLS[state.teams[p.team].skill];
  const human = state.human && p.id === state.human.pid;
  p.kickCd = Math.max(0, p.kickCd - dt);
  p.tackleCd = Math.max(0, p.tackleCd - dt);
  p.actT = Math.max(0, p.actT - dt);
  if (p.actT <= 0 && p.act && p.act !== 'cheer' && p.act !== 'sad') p.act = null;
  const owner = state.ball.owner === p.id;
  let mx = input.mx ?? 0, mz = input.mz ?? 0;
  const m = Math.hypot(mx, mz);
  if (m > 1) [mx, mz] = [mx / m, mz / m];
  const sprinting = Boolean(input.sprint) && p.stamina > 0.03 && m > 0.1;
  p.stamina = clamp(p.stamina + (sprinting ? -PLAYER.drain : PLAYER.regain) * dt, 0, 1);
  let top = (sprinting ? PLAYER.sprint : PLAYER.run) * (human ? 1 : skill.speed);
  if (owner) top *= human ? 0.94 : 0.9;
  if (input.charge) top *= 0.72;
  if (p.holding) top = 0;

  if (p.stun > 0) {
    p.stun -= dt;
    const k = Math.exp(-5 * dt);
    p.vx *= k;
    p.vz *= k;
  } else if (p.dive > 0) {
    p.dive -= dt;
    p.vx *= Math.exp(-1.5 * dt);
    p.vz = p.diveV * Math.max(0, p.dive / 0.55);
    if (p.dive <= 0) p.stun = 0.35; // up off the grass
  } else if (p.tackleT > 0) {
    p.tackleT -= dt;
    const sp = 10.5;
    p.vx = Math.sin(p.face) * sp;
    p.vz = Math.cos(p.face) * sp;
    if (p.tackleT <= 0) p.stun = 0.25;
  } else if (state.phase === 'play') {
    const wx = mx * top, wz = mz * top;
    let ax = wx - p.vx, az = wz - p.vz;
    const a = Math.hypot(ax, az);
    const lim = PLAYER.accel * dt;
    if (a > lim) [ax, az] = [(ax / a) * lim, (az / a) * lim];
    p.vx += ax;
    p.vz += az;
    const sp = Math.hypot(p.vx, p.vz);
    const b = state.ball;
    // Keepers keep their eyes on the stone; anyone standing about turns to watch it.
    const watch = !owner && ((p.role === 'keeper' && sp < 4.5) || sp < 0.6);
    if (watch || sp > 0.6) {
      const want = watch ? Math.atan2(b.x - p.x, b.z - p.z) : Math.atan2(p.vx, p.vz);
      const d = wrap(want - p.face);
      p.face = wrap(p.face + clamp(d, -PLAYER.turn * dt, PLAYER.turn * dt));
    }
  } else {
    const k = Math.exp(-6 * dt);
    p.vx *= k;
    p.vz *= k;
  }
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  const w = wallContact(p.x, p.z, PLAYER.r);
  if (w) {
    p.x += w.nx * w.depth;
    p.z += w.nz * w.depth;
    const vn = p.vx * w.nx + p.vz * w.nz;
    if (vn < 0) [p.vx, p.vz] = [p.vx - vn * w.nx, p.vz - vn * w.nz];
  }
}

function act(state, p, input) {
  const b = state.ball;
  if (p.stun > 0 || p.dive > 0) return;
  const owner = b.owner === p.id;
  if (input.shoot != null && input.shoot !== false) {
    const near = !owner && b.owner < 0 && p.kickCd <= 0 && b.y < 1.1 && Math.hypot(b.x - p.x, b.z - p.z) < PLAYER.reach * 1.45;
    if (owner || near) {
      const [dx, dz] = Math.hypot(input.mx ?? 0, input.mz ?? 0) > 0.2 ? [input.mx, input.mz] : [Math.sin(p.face), Math.cos(p.face)];
      if (input.aim) kick(state, p, input.aim[0], input.aim[1], input.speed ?? 22, input.lift ?? 2, 'shot');
      else shoot(state, p, dx, dz, Number(input.shoot));
      return;
    }
  }
  if (input.pass && owner) {
    const pref = Math.hypot(input.mx ?? 0, input.mz ?? 0) > 0.2 ? [input.mx, input.mz] : [Math.sin(p.face), Math.cos(p.face)];
    const q = input.to != null ? state.players[input.to] : passTarget(state, p, pref);
    if (q) passTo(state, p, q);
    return;
  }
  // At kick-off the other side keeps off until the stone has been played.
  const settled = state.t - (state.kickoffAt ?? -9) > 0.6 || p.team === state.kickoffTeam;
  if (input.tackle && !owner && p.tackleCd <= 0 && !p.holding && settled) {
    const m = Math.hypot(input.mx ?? 0, input.mz ?? 0);
    if (m > 0.2) p.face = Math.atan2(input.mx, input.mz);
    p.tackleT = 0.32;
    p.tackleCd = 1.1;
    setAct(p, 'tackle', 0.5);
    emit(state, 'lunge', { pid: p.id, x: p.x, z: p.z });
  }
}

/** Does a lunge win the stone? Better head-on than from behind. */
function tackleWins(state, t, v) {
  const headOn = -(Math.sin(t.face) * Math.sin(v.face) + Math.cos(t.face) * Math.cos(v.face));
  return rand(state) < 0.52 + headOn * 0.25;
}

/** Cavemen don't stand inside each other; a lunging one knocks the other down. */
function separate(state) {
  const ps = state.players;
  const b = state.ball;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], c = ps[j];
      const dx = c.x - a.x, dz = c.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = PLAYER.r * 2;
      if (d >= min + 0.25) continue;
      const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
      // A lunge into an opponent.
      for (const [t, v, s] of [[a, c, 1], [c, a, -1]]) {
        if (t.tackleT > 0 && t.team !== v.team && state.phase === 'play' && v.stun <= 0 && !v.holding) {
          const hadBall = b.owner === v.id;
          t.tackleT = 0;
          if (hadBall && !tackleWins(state, t, v)) {
            // He rides it: the tackler bounces off and sits down.
            t.stun = 0.55;
            t.vx *= -0.3;
            t.vz *= -0.3;
            setAct(t, 'stun', 0.6);
            emit(state, 'tackle', { pid: t.id, victim: v.id, won: false, x: v.x, z: v.z });
            continue;
          }
          v.stun = hadBall ? 0.6 : 0.4;
          v.vx += nx * s * 4.5;
          v.vz += nz * s * 4.5;
          setAct(v, 'stun', 0.6);
          t.stun = 0.15;
          if (hadBall) {
            b.owner = -1;
            const ang = t.face + (rand(state) - 0.5) * 0.8;
            b.vx = Math.sin(ang) * 4 + t.vx * 0.2;
            b.vz = Math.cos(ang) * 4 + t.vz * 0.2;
            b.lastTouch = t.id;
            v.kickCd = 0.6;
          }
          emit(state, 'tackle', { pid: t.id, victim: v.id, won: hadBall, x: v.x, z: v.z });
        }
      }
      if (d >= min) continue;
      const push = (min - d) / 2;
      const ka = a.holding ? 0 : 1, kc = c.holding ? 0 : 1;
      a.x -= nx * push * (ka + (1 - kc));
      a.z -= nz * push * (ka + (1 - kc));
      c.x += nx * push * (kc + (1 - ka));
      c.z += nz * push * (kc + (1 - ka));
    }
  }
}

function ballStep(state, dt) {
  const b = state.ball;
  const r = BALL.r;
  if (b.owner >= 0) {
    const p = state.players[b.owner];
    const reach = p.holding ? 0.45 : PLAYER.carry;
    const tx = p.x + Math.sin(p.face) * reach, tz = p.z + Math.cos(p.face) * reach;
    const ty = p.holding ? 0.95 : r;
    b.vx = p.vx + (tx - b.x) * 16;
    b.vz = p.vz + (tz - b.z) * 16;
    b.vy = (ty - b.y) * 16;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;
    if (!p.holding) b.y = r;
    if (state.phase === 'play' && !p.holding) {
      // The stone rolls at his feet, visibly: report its own speed as the carrier's.
      b.vx = p.vx;
      b.vz = p.vz;
      b.vy = 0;
    }
    return;
  }
  // Free: gravity, air, ground.
  const airborne = b.y > r + 1e-4 || b.vy > 0;
  if (airborne) {
    b.vy -= BALL.gravity * dt;
    const k = 1 - BALL.air * dt;
    b.vx *= k;
    b.vz *= k;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
  if (b.y < r) {
    b.y = r;
    if (b.vy < -2) {
      if (b.vy < -4) emit(state, 'thud', { x: b.x, z: b.z, power: -b.vy });
      b.vy = -b.vy * BALL.bounce;
      b.vx *= 0.86;
      b.vz *= 0.86;
    } else b.vy = 0;
  }
  if (b.y <= r + 1e-4 && b.vy === 0) {
    const s = Math.hypot(b.vx, b.vz);
    if (s > 0) {
      const s2 = Math.max(0, s - (BALL.roll + BALL.drag * s) * dt);
      b.vx *= s2 / s;
      b.vz *= s2 / s;
    }
  }
  ballWalls(state);
}

function ballWalls(state) {
  const b = state.ball;
  const r = BALL.r;
  const ax = Math.abs(b.x);
  const s = sign(b.x);
  // Posts: standing stones at the ends of each goal mouth.
  if (ax > PITCH.hx - 1 && b.y < PITCH.bar + r) {
    for (const pz of [-PITCH.goalHalf, PITCH.goalHalf]) {
      const dx = b.x - s * PITCH.hx, dz = b.z - pz;
      const d = Math.hypot(dx, dz);
      const min = PITCH.post + r;
      if (d < min && d > 1e-6) {
        const nx = dx / d, nz = dz / d;
        b.x += nx * (min - d);
        b.z += nz * (min - d);
        const vn = b.vx * nx + b.vz * nz;
        if (vn < 0) {
          b.vx -= (1 + BALL.wall) * vn * nx;
          b.vz -= (1 + BALL.wall) * vn * nz;
          if (-vn > 2) emit(state, 'post', { x: b.x, z: b.z, power: -vn });
        }
      }
    }
  }
  const mouth = Math.abs(b.z) < PITCH.goalHalf && b.y < PITCH.bar;
  if (ax > PITCH.hx - r && mouth) {
    if (ax > PITCH.hx) {
      // In the net: soft hide on three sides and above.
      const back = PITCH.hx + PITCH.depth - r;
      if (ax > back) {
        b.x = s * back;
        if (b.vx * s > 0) b.vx = -b.vx * 0.12;
        b.vz *= 0.6;
        b.vy *= 0.6;
      }
      if (Math.abs(b.z) > PITCH.goalHalf - r) {
        b.z = sign(b.z) * (PITCH.goalHalf - r);
        if (b.vz * sign(b.z) > 0) b.vz = -b.vz * 0.15;
      }
      if (b.y > PITCH.bar - r) {
        b.y = PITCH.bar - r;
        if (b.vy > 0) b.vy = -b.vy * 0.2;
      }
    }
    return;
  }
  // The crossbar's underside, from inside the mouth.
  if (ax > PITCH.hx - r && Math.abs(b.z) < PITCH.goalHalf && b.y >= PITCH.bar && b.y < PITCH.bar + r && b.vx * s > 0) {
    b.vx = -b.vx * 0.5;
    b.vy = -Math.abs(b.vy) * 0.5;
    emit(state, 'post', { x: b.x, z: b.z, power: Math.abs(b.vx) });
  }
  const w = wallContact(b.x, b.z, r);
  if (!w) return;
  b.x += w.nx * w.depth;
  b.z += w.nz * w.depth;
  const vn = b.vx * w.nx + b.vz * w.nz;
  if (vn < 0) {
    b.vx -= (1 + BALL.wall) * vn * w.nx;
    b.vz -= (1 + BALL.wall) * vn * w.nz;
    if (-vn > 3) emit(state, 'wall', { x: b.x, z: b.z, power: -vn });
  }
}

/** Who touches the free stone: control, a keeper's save, or a hard stone knocking a caveman back. */
function contacts(state) {
  const b = state.ball;
  if (b.owner >= 0) {
    stealCheck(state);
    return;
  }
  if (b.y > 2) return;
  const fast = Math.hypot(b.vx, b.vz) > BALL.hit;
  let best = null, bestD = Infinity;
  for (const p of state.players) {
    if (p.stun > 0 || p.kickCd > 0) continue;
    const keeperReach = p.role === 'keeper' && inBox(p.team, p.x, p.z, 0.5) ? (p.dive > 0 ? 1.55 : 1.15) : 0;
    const reach = Math.max(PLAYER.reach, keeperReach);
    // Feet control it below the knee-ish; a fast stone hits anything up to the shoulders; keepers reach high.
    const high = keeperReach ? 2 : fast ? 1.5 : 1;
    const d = Math.hypot(b.x - p.x, b.z - p.z);
    if (d < reach && d < bestD && b.y < high) [best, bestD] = [p, d];
  }
  if (!best) return;
  const p = best;
  const rvx = b.vx - p.vx, rvz = b.vz - p.vz;
  const rel = Math.hypot(rvx, rvz);
  const speed = Math.hypot(b.vx, b.vz);
  const keeper = p.role === 'keeper' && inBox(p.team, p.x, p.z, 0.5);
  if (keeper && speed > 7 && b.lastTouch >= 0 && state.players[b.lastTouch].team !== p.team) {
    // A shot at a keeper: one roll per shot.
    if (p.rolled !== b.shot) {
      p.rolled = b.shot;
      const skill = SKILLS[state.teams[p.team].skill];
      // Harder the faster it comes and the further he must reach; one hit straight at him is usually kept out.
      const straight = bestD < 0.75 ? 1.4 : 1;
      // From further out he sees it coming.
      const far = clamp(0.75 + Math.hypot(b.fromX - p.x, b.fromZ - p.z) / 32, 0.8, 1.25);
      const chance = clamp(skill.save * (1.6 - speed / 40) * straight * far + (p.dive > 0 ? 0.08 : 0), 0.08, 0.95);
      p.rollOk = rand(state) < chance;
    }
    if (!p.rollOk) return;
    if (speed < 16.5) catchBall(state, p);
    else {
      const d = attackDir(p.team);
      b.vx = Math.abs(b.vx) * 0.35 * d;
      b.vz = (rand(state) - 0.5) * 10 + b.vz * 0.2;
      b.vy = 3;
      b.lastTouch = p.id;
      p.kickCd = 0.4;
      emit(state, 'save', { pid: p.id, team: p.team, x: b.x, z: b.z, parry: true });
    }
    return;
  }
  if (keeper) {
    catchBall(state, p);
    return;
  }
  if (rel > BALL.hit) {
    // The stone hits him: it bounces off, he staggers.
    const nx = (b.x - p.x) / (bestD || 1), nz = (b.z - p.z) / (bestD || 1);
    const vn = rvx * nx + rvz * nz;
    if (vn < 0) {
      b.vx -= 1.35 * vn * nx;
      b.vz -= 1.35 * vn * nz;
    }
    b.vx *= 0.6;
    b.vz *= 0.6;
    b.lastTouch = p.id;
    p.vx += (rvx / rel) * 3.5;
    p.vz += (rvz / rel) * 3.5;
    p.stun = 0.3;
    p.kickCd = 0.2;
    setAct(p, 'stun', 0.6);
    emit(state, 'hit', { pid: p.id, x: p.x, z: p.z, power: rel });
    return;
  }
  const prevTeam = b.lastTouch >= 0 ? state.players[b.lastTouch].team : -1;
  b.owner = p.id;
  b.passTo = undefined;
  emit(state, 'control', { pid: p.id, team: p.team, steal: prevTeam >= 0 && prevTeam !== p.team });
  b.lastTouch = p.id;
}

function catchBall(state, p) {
  const b = state.ball;
  b.owner = p.id;
  b.lastTouch = p.id;
  p.holding = 1;
  p.vx = p.vz = 0;
  p.dive = 0;
  p.ai.hold = 0.8 + rand(state) * 0.7;
  setAct(p, 'catch', 0.5);
  emit(state, 'save', { pid: p.id, team: p.team, x: b.x, z: b.z, parry: false });
}

/** An opponent standing on the stone may nick it (no tackle needed). */
function stealCheck(state) {
  const b = state.ball;
  const o = state.players[b.owner];
  if (o.holding) {
    o.holding += TICK;
    // A keeper may hold the stone three seconds; then it is rolled out for him.
    if (o.holding > 3) {
      const q = passTarget(state, o, [attackDir(o.team), 0]);
      if (q) passTo(state, o, q);
      else kick(state, o, attackDir(o.team), 0, 16, 3, 'throw');
    }
    return;
  }
  for (const q of state.players) {
    if (q.team === o.team || q.stun > 0 || q.kickCd > 0) continue;
    const d = Math.hypot(b.x - q.x, b.z - q.z);
    if (q.tackleT > 0 && d < PLAYER.reach) {
      // A lunge through the stone knocks it loose (or he shields it and the lunge comes to nothing).
      q.tackleT = 0;
      if (!tackleWins(state, q, o)) {
        q.stun = 0.5;
        setAct(q, 'stun', 0.6);
        emit(state, 'tackle', { pid: q.id, victim: o.id, won: false, x: b.x, z: b.z });
        return;
      }
      b.owner = -1;
      const ang = q.face + (rand(state) - 0.5) * 0.9;
      b.vx = Math.sin(ang) * 5 + q.vx * 0.2;
      b.vz = Math.cos(ang) * 5 + q.vz * 0.2;
      b.lastTouch = q.id;
      o.kickCd = 0.6;
      q.tackleT = 0;
      emit(state, 'tackle', { pid: q.id, victim: o.id, won: true, x: b.x, z: b.z });
      return;
    }
    if (q.tackleT > 0) continue;
    if (d > PLAYER.r + BALL.r) continue;
    const human = state.human && q.id === state.human.pid;
    const rate = human ? 1.2 : SKILLS[state.teams[q.team].skill].steal;
    // Standing right on the stone (body in the way) nicks it far more often.
    if (rand(state) < rate * TICK * (d < 0.5 ? 4 : 1)) {
      b.owner = q.id;
      b.lastTouch = q.id;
      o.kickCd = 0.5;
      emit(state, 'control', { pid: q.id, team: q.team, steal: true });
      return;
    }
  }
}

function checkGoal(state) {
  const b = state.ball;
  if (Math.abs(b.x) < PITCH.hx + BALL.r || Math.abs(b.z) >= PITCH.goalHalf || b.y >= PITCH.bar) return;
  if (b.owner >= 0) {
    const p = state.players[b.owner];
    p.holding = 0;
    b.owner = -1;
  }
  const team = b.x > 0 ? 0 : 1;
  state.score[team]++;
  const toucher = state.players[b.lastTouch];
  const own = toucher ? toucher.team !== team : false;
  state.lastGoal = { team, pid: toucher?.id ?? -1, name: toucher?.name ?? '', own, t: state.t, clock: state.clock };
  state.phase = 'goal';
  state.phaseT = 3.4;
  state.kickoffTeam = 1 - team;
  for (const p of state.players) setAct(p, p.team === team ? 'cheer' : 'sad', 3.2);
  emit(state, 'goal', { team, pid: state.lastGoal.pid, own, x: b.x, z: b.z });
}

/* ================================================================ who the human plays */

/** Keep the human on the caveman nearest the stone (not the keeper), with a little stickiness. */
export function autoSwitch(state) {
  const h = state.human;
  const b = state.ball;
  const cur = state.players[h.pid];
  if (b.owner >= 0) {
    const o = state.players[b.owner];
    if (o.team === h.team) {
      if (o.role !== 'keeper') h.pid = o.id;
      return;
    }
  }
  if (b.owner < 0 && b.passTo != null && state.players[b.passTo].team === h.team && state.players[b.passTo].role !== 'keeper') {
    h.pid = b.passTo;
    return;
  }
  if (cur.tackleT > 0 || cur.kickCd > 0.1) return;
  const near = nearestOf(state, h.team, (p) => p.role !== 'keeper');
  const dCur = Math.hypot(cur.x - b.x, cur.z - b.z);
  const dNear = Math.hypot(near.x - b.x, near.z - b.z);
  if (near !== cur && dNear < dCur - 1.5) h.pid = near.id;
}

/** Q: hand control to the other outfield caveman. */
export function switchPlayer(state) {
  const h = state.human;
  if (!h) return;
  const others = state.players.filter((p) => p.team === h.team && p.role !== 'keeper' && p.id !== h.pid);
  const b = state.ball;
  others.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z));
  if (others[0] && state.ball.owner !== h.pid) h.pid = others[0].id;
}

function nearestOf(state, team, ok = () => true) {
  const b = state.ball;
  let best = null, bd = Infinity;
  for (const p of state.players) {
    if (p.team !== team || !ok(p)) continue;
    const d = Math.hypot(p.x - b.x, p.z - b.z);
    if (d < bd) [best, bd] = [p, d];
  }
  return best;
}

/* ================================================================ AI */

/** An AI caveman's input this tick: think every so often (reaction time), steer toward the plan between. */
export function aiInput(state, p) {
  const skill = SKILLS[state.teams[p.team].skill];
  const ai = p.ai;
  ai.next -= TICK;
  let action = null;
  if (ai.next <= 0) {
    ai.next = skill.react * (0.7 + rand(state) * 0.6) * (p.role === 'keeper' ? 0.5 : 1);
    action = think(state, p, skill);
  }
  if (p.holding) return action ?? IDLE;
  if (action && (action.shoot != null || action.pass || action.aim)) return action;
  const dx = ai.tx - p.x, dz = ai.tz - p.z;
  const d = Math.hypot(dx, dz);
  const k = d < 0.25 ? 0 : Math.min(1, d / 1.2);
  const input = { mx: d > 1e-6 ? (dx / d) * k : 0, mz: d > 1e-6 ? (dz / d) * k : 0, sprint: ai.sprint && p.stamina > 0.25 && d > 2 };
  if (action?.tackle) input.tackle = true;
  return input;
}

function think(state, p, skill) {
  const b = state.ball;
  const ai = p.ai;
  const d = attackDir(p.team);
  const owner = b.owner >= 0 ? state.players[b.owner] : null;
  ai.sprint = false;
  if (p.role === 'keeper') return keeperThink(state, p, skill, owner);
  if (owner === p) return carrierThink(state, p, skill);
  const mates = state.players.filter((q) => q.team === p.team && q.role !== 'keeper');
  const bu = b.x * d;
  if (owner && owner.team !== p.team && !owner.holding && p.tackleCd <= 0) {
    // Anyone close enough and facing him may go in for it.
    const dist = Math.hypot(owner.x - p.x, owner.z - p.z);
    const facing = ((owner.x - p.x) * Math.sin(p.face) + (owner.z - p.z) * Math.cos(p.face)) / (dist || 1);
    if (dist < 1.8 && facing > 0.5 && rand(state) < skill.tackle) {
      p.face = Math.atan2(owner.x - p.x, owner.z - p.z);
      return { tackle: true, mx: Math.sin(p.face), mz: Math.cos(p.face) };
    }
  }

  if (owner && owner.team === p.team) {
    // Support: the forward runs ahead into space, the defender holds back.
    const ou = owner.x * d;
    if (p.role === 'forward') {
      const u = clamp(ou + 6, -4, PITCH.hx - 3.5);
      const z = owner.z > 1 ? -3.5 : owner.z < -1 ? 3.5 : (p.z >= 0 ? 4 : -4);
      [ai.tx, ai.tz] = [u * d, z];
      ai.sprint = true;
    } else {
      const u = clamp(ou - 7, -PITCH.hx + 4, 3);
      [ai.tx, ai.tz] = [u * d, owner.z * 0.3];
    }
    return null;
  }

  // Loose stone or theirs: the nearest outfield caveman goes for it; the other covers.
  const lead = (q) => {
    const sp = PLAYER.run * skill.speed;
    const t = clamp(Math.hypot(b.x - q.x, b.z - q.z) / sp, 0, 1);
    return [b.x + b.vx * t * 0.8, b.z + b.vz * t * 0.8];
  };
  const keeper = state.players.find((q) => q.team === p.team && q.role === 'keeper');
  const keeperHas = keeper && inBox(p.team, b.x, b.z) && Math.hypot(keeper.x - b.x, keeper.z - b.z) < 3 && !owner;
  let chaser = null, cd = Infinity;
  for (const q of mates) {
    const [lx, lz] = lead(q);
    const dist = Math.hypot(lx - q.x, lz - q.z) + (q.stun > 0 ? 3 : 0);
    if (dist < cd) [chaser, cd] = [q, dist];
  }
  if (chaser === p && !keeperHas) {
    const [lx, lz] = lead(p);
    if (owner) {
      // Jockey: get goal-side of the carrier, in his path, and let him run into you.
      const gx = -d * PITCH.hx;
      const tg = Math.hypot(gx - lx, -lz) || 1;
      const gap = Math.hypot(owner.x - p.x, owner.z - p.z) > 3 ? 1.6 : 0.5;
      [ai.tx, ai.tz] = [lx + ((gx - lx) / tg) * gap, lz + (-lz / tg) * gap];
    } else [ai.tx, ai.tz] = [lx - d * 0.5, lz]; // from the goal side, so a touch sends it forward
    ai.sprint = Math.hypot(lx - p.x, lz - p.z) > 2.5;
    return null;
  }
  // Cover: between the stone and our goal.
  const gx = -d * PITCH.hx;
  const toGoal = Math.hypot(gx - b.x, -b.z) || 1;
  const off = p.role === 'defender' ? clamp(toGoal * 0.38, 3, 9) : 3.2;
  let tx = b.x + ((gx - b.x) / toGoal) * off;
  let tz = b.z + (-b.z / toGoal) * off;
  if (p.role === 'forward' && !owner) {
    // Hang a little upfield as an outlet.
    tx = clamp(bu + 4, -PITCH.hx + 6, PITCH.hx - 6) * d;
    tz = clamp(-b.z * 0.4, -6, 6);
  }
  if (p.role === 'defender') tx = d * Math.max(tx * d, -PITCH.hx + 2.2);
  [ai.tx, ai.tz] = [tx, tz];
  ai.sprint = owner != null && Math.hypot(tx - p.x, tz - p.z) > 4;
  return null;
}

function carrierThink(state, p, skill) {
  const ai = p.ai;
  const d = attackDir(p.team);
  const gx = d * PITCH.hx;
  const dg = Math.hypot(gx - p.x, -p.z);
  const u = p.x * d;
  // Kick-off: play it back to the defender first.
  if (state.t - (state.kickoffAt ?? -9) < 0.5 && p.role === 'forward') {
    const back = state.players.find((q) => q.team === p.team && q.role === 'defender');
    if (back) return { pass: true, to: back.id };
  }
  // Shoot?
  const angleOk = Math.abs(p.z) < PITCH.goalHalf + dg * 0.75;
  if (dg < skill.range && angleOk && (dg < 7.5 || rand(state) < skill.shootP)) {
    const keeper = state.players.find((q) => q.team !== p.team && q.role === 'keeper');
    const side = keeper.z > 0.25 ? -1 : keeper.z < -0.25 ? 1 : rand(state) < 0.5 ? -1 : 1;
    const az = side * (PITCH.goalHalf - 0.55);
    let ang = Math.atan2(gx - state.ball.x, az - state.ball.z);
    ang += (rand(state) - 0.5) * 2 * skill.aim;
    const speed = clamp(16 + dg * 0.75, 17, 27);
    return { aim: [Math.sin(ang), Math.cos(ang)], speed, lift: 1 + rand(state) * 2.6, shoot: 1 };
  }
  // Under pressure?
  let pressure = Infinity, presser = null;
  for (const o of state.players) {
    if (o.team === p.team) continue;
    const dx = o.x - p.x, dz = o.z - p.z;
    const dist = Math.hypot(dx, dz);
    const ahead = (dx * d) / (dist || 1);
    if (dist < 3 && (ahead > -0.2 || dist < 1.6) && dist < pressure) [pressure, presser] = [dist, o];
  }
  if (presser && rand(state) < skill.pass * (u < -6 ? 1.2 : 1)) {
    const q = passTarget(state, p, [d, 0]);
    if (q && (q.x - p.x) * d > -4) return { pass: true, to: q.id };
  }
  // Dribble at goal, stepping round whoever is in the way, away from the walls.
  let tx = gx - d * 1.5, tz = clamp(p.z * 0.5, -3.5, 3.5);
  const fx = tx - p.x, fz = tz - p.z;
  const fl = Math.hypot(fx, fz) || 1;
  let sx = 0, sz = 0;
  for (const o of state.players) {
    if (o.team === p.team) continue;
    const dx = o.x - p.x, dz = o.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 4.5 || (dx * fx + dz * fz) / (dist * fl) < 0.1) continue;
    const side = (dx * -fz + dz * fx) / fl > 0 ? -1 : 1; // which side of my line the opponent is
    const w = (4.5 - dist) * 1.3;
    sx += (-fz / fl) * side * w;
    sz += (fx / fl) * side * w;
  }
  tx = p.x + (fx / fl) * 4 + sx;
  tz = p.z + (fz / fl) * 4 + sz;
  tz = clamp(tz, -PITCH.hz + 2.2, PITCH.hz - 2.2);
  [ai.tx, ai.tz] = [tx, tz];
  ai.sprint = !presser && p.stamina > 0.45;
  return null;
}

function keeperThink(state, p, skill, owner) {
  const b = state.ball;
  const ai = p.ai;
  const d = attackDir(p.team);
  const gx = -d * PITCH.hx;
  if (owner === p) {
    // Holding: look up, then roll it out to the best-placed teammate.
    ai.hold -= skill.react * 0.5;
    if (ai.hold <= 0 || p.holding > 2.5) {
      const q = passTarget(state, p, [d, 0]);
      if (q) return { pass: true, to: q.id };
      return { aim: [d, 0], speed: 18, lift: 4, shoot: 1 };
    }
    return null;
  }
  // A shot coming? Read where it crosses my line; dive if it's out of reach.
  const toward = b.vx * -d;
  if (!owner && toward > 6 && b.y < PITCH.bar) {
    const t = (p.x - b.x) / b.vx;
    if (t > 0 && t < 0.9) {
      const zAt = b.z + b.vz * t;
      if (Math.abs(zAt) < PITCH.goalHalf + 0.8) {
        const dz = zAt - p.z;
        if (Math.abs(dz) > 0.75 && t < 0.55 && p.dive <= 0 && p.stun <= 0) {
          p.dive = 0.55;
          p.diveV = clamp(dz / 0.32, -9, 9);
          // Left of a caveman facing `face` is (cos face, −sin face).
          setAct(p, -Math.sin(p.face) * dz > 0 ? 'diveL' : 'diveR', 0.9);
          emit(state, 'dive', { pid: p.id });
        }
        [ai.tx, ai.tz] = [p.x, zAt];
        return null;
      }
    }
  }
  // Loose in my box: claim it.
  if (!owner && inBox(p.team, b.x, b.z, -0.5) && Math.hypot(b.vx, b.vz) < 9) {
    [ai.tx, ai.tz] = [b.x, b.z];
    ai.sprint = true;
    return null;
  }
  // Otherwise: on the line between the stone and the middle of the goal.
  const dx = b.x - gx, dz = b.z;
  const dist = Math.hypot(dx, dz) || 1;
  const out = clamp(0.9 + (dist < 12 ? (12 - dist) * 0.08 : 0), 0.9, 2);
  [ai.tx, ai.tz] = [gx + (dx / dist) * out, clamp((dz / dist) * out * 1.4, -(PITCH.goalHalf - 0.3), PITCH.goalHalf - 0.3)];
  return null;
}

/** Run a match headless for `seconds` (tests, previews); `inputs(state)` supplies the human's input each tick. */
export function simulate(state, seconds, inputs = () => ({})) {
  const ticks = Math.round(seconds / TICK);
  const events = [];
  for (let i = 0; i < ticks && state.phase !== 'end'; i++) events.push(...step(state, inputs(state)));
  return events;
}
