/**
 * The race's rules, pure: who is where, gift boxes and the items in them,
 * snowball piles, snowballs (aim, flight, hit, spin-out), the giant snowball,
 * dropped ice, shields and boosts, shoves and drafting between riders, the
 * finish and the standings, and the gentle rubber band that keeps rivals close.
 *
 * A racer is a rider (physics.js) plus what the race keeps about it:
 *   { slot, id, name, species, human, rider, slots: [{ kind, n }], ammo,
 *     shieldT, hits, bonks, bumps, gifts, tricks, lastHitBy, finished, time, taken: Set }
 *
 * Held items live in up to two slots (keys 1 and 2). Gifts and piles are
 * personal (each racer has its own) and what a gift holds comes from a hash
 * of the gift and the racer, so nothing about them has to be agreed online.
 */
import { between, groundAt, frameAt } from './course.js';

export const MAX_SLOTS = 2;
export const MAX_SNOWBALLS = 6;
export const SPINOUT = 1.2;
/** A snowball hit's face-plant, and how long a giant snowball keeps you squashed flat (stopped) (s). */
export const TUMBLE = 0.85;
export const FLAT = 1.0;
export const SHIELD_TIME = 5;
export const THROW_COOLDOWN = 0.5;
export const PILE_GIVES = 2;
export const ITEMS = ['snowballs', 'giant', 'shield', 'boost', 'ice'];

export function newRacer({ slot, id = `ai${slot}`, name = 'Rider', species = 'fox', human = false, rider }) {
  return { slot, id, name, species, human, rider, slots: [], ammo: 0, shieldT: 0, throwCd: 0, itemCd: 0, hits: 0, bonks: 0, bumps: 0, gifts: 0, tricks: 0, lastHitBy: -1, best: '', finished: false, time: 0, taken: new Set(), draft: 0, lap: 1, liftT: 0, liftTotal: 0 };
}

/* ------------------------------------------------------------------ standings */

/** Racers in race order: finished first by time, then the rest by distance. Returns a new array. */
export function standings(racers) {
  return [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.time - b.time;
    if (a.finished) return -1;
    if (b.finished) return 1;
    if ((a.lap ?? 1) !== (b.lap ?? 1)) return (b.lap ?? 1) - (a.lap ?? 1);
    return (b.liftT > 0 ? -1e6 + b.liftT : b.rider.s) - (a.liftT > 0 ? -1e6 + a.liftT : a.rider.s) || 0;
  });
}

/** 1 → "1st", 2 → "2nd" … */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * A gentle rubber band for an AI rider: a little more pull when it is far
 * behind the human it races, a little less when far ahead. ±7 % at most.
 */
export function rubberBand(aiS, humanS) {
  const gap = humanS - aiS; // + : the AI is behind
  return Math.max(0.93, Math.min(1.07, 1 + gap / 500));
}

/** The time a racer still on the course would probably finish in (for the podium after the cut-off). */
export function estimateFinish(racer, course, now) {
  const lapsLeft = Math.max(0, (course.laps ?? 1) - (racer.lap ?? 1));
  const left = Math.max(0, course.finish - (racer.liftT > 0 ? 0 : racer.rider.s)) + lapsLeft * course.finish;
  return now - (racer.liftTotal ?? 0) + left / Math.max(9, racer.rider.speed);
}

/** The chairlift ride back up between laps (s); you may skip it after LIFT_SKIP s. */
export const LIFT = 9;
export const LIFT_SKIP = 3;

/** Crossed the line with laps still to go? Then up the chairlift (true once, as it starts). */
export function checkLap(racer, course) {
  if (racer.finished || racer.liftT > 0 || racer.rider.s < course.finish || (racer.lap ?? 1) >= (course.laps ?? 1)) return false;
  racer.lap = (racer.lap ?? 1) + 1;
  racer.liftT = LIFT;
  racer.taken.clear(); // gifts restocked for the next lap
  return true;
}

/**
 * Ride the chairlift: true when it's over (put the racer back at the top).
 * The lift's time doesn't count toward the race time (so skipping is fair).
 */
export function tickLift(racer, dt, skip = false) {
  if (!(racer.liftT > 0)) return false;
  racer.liftTotal = (racer.liftTotal ?? 0) + dt;
  racer.liftT = skip && LIFT - racer.liftT >= LIFT_SKIP ? 0 : Math.max(0, racer.liftT - dt);
  return racer.liftT <= 0;
}

/** Has this racer crossed the line in this step? Records the time once. */
export function checkFinish(racer, course, now) {
  if (racer.finished || racer.liftT > 0 || racer.rider.s < course.finish || (racer.lap ?? 1) < (course.laps ?? 1)) return false;
  racer.finished = true;
  racer.time = now - (racer.liftTotal ?? 0);
  racer.rider.finished = true;
  return true;
}

/* ------------------------------------------------------------------ gifts, items, pickups */

const hashU = (a, b) => {
  let h = Math.imul(a | 0, 2654435761) ^ Math.imul((b | 0) + 0x9e37, 1597334677);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

/**
 * What's in a gift box for this racer: random, but kinder to the back of the
 * pack (place 0 = leading … 1 = last). Deterministic per gift and racer.
 */
export function rollGift(giftId, slot, place = 0.5) {
  const front = { snowballs: 45, shield: 25, ice: 20, boost: 6, giant: 4 };
  const back = { snowballs: 18, shield: 10, ice: 8, boost: 32, giant: 32 };
  const w = ITEMS.map((k) => front[k] + (back[k] - front[k]) * Math.max(0, Math.min(1, place)));
  let r = hashU(giftId, slot) * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < ITEMS.length; i++) {
    r -= w[i];
    if (r <= 0) return ITEMS[i];
  }
  return ITEMS[0];
}

/** Add an item to a racer's slots (snowballs stack). False if there's no room. */
export function giveItem(racer, kind, n = kind === 'snowballs' ? 3 : 1) {
  const have = racer.slots.find((x) => x.kind === kind && kind === 'snowballs');
  if (have) have.n = Math.min(MAX_SNOWBALLS, have.n + n);
  else if (racer.slots.length < MAX_SLOTS) racer.slots.push({ kind, n });
  else return false;
  syncAmmo(racer);
  return true;
}

function syncAmmo(racer) {
  racer.slots = racer.slots.filter((x) => x.n > 0);
  racer.ammo = racer.slots.find((x) => x.kind === 'snowballs')?.n ?? 0;
}

/**
 * Gift boxes and snowball piles within reach. `place` is 0 (leading) … 1 (last).
 * Returns events ({ type: 'gift', id, kind } | { type: 'pile', id }).
 */
export function pickups(racer, course, now, place = 0.5) {
  const r = racer.rider;
  const ev = [];
  if (racer.finished) return ev;
  const g = groundAt(course, r.s, r.lat);
  const above = r.y - g;
  for (const gf of between(course.gifts ?? [], r.s - 1.8, r.s + 1.8)) {
    if (racer.taken.has(gf.id)) continue;
    if (Math.abs(gf.lat - r.lat) > 1.6 || Math.abs(gf.h - (above + 0.6)) > 1.9) continue;
    if (racer.slots.length >= MAX_SLOTS && !racer.slots.some((x) => x.kind === 'snowballs')) continue;
    const kind = rollGift(gf.id, racer.slot, place);
    if (!giveItem(racer, kind)) continue;
    racer.taken.add(gf.id);
    racer.gifts += 1;
    ev.push({ type: 'gift', id: gf.id, kind });
  }
  if (above < 1.4) {
    for (const p of between(course.piles, r.s - 1.8, r.s + 1.8)) {
      if (racer.taken.has(p.id) || Math.abs(p.lat - r.lat) > 1.7) continue;
      if (!giveItem(racer, 'snowballs', PILE_GIVES)) continue;
      racer.taken.add(p.id);
      ev.push({ type: 'pile', id: p.id });
    }
  }
  return ev;
}

/** The item in slot i (0 or 1), or null. */
export const slotItem = (racer, i) => racer.slots[i] ?? null;

/**
 * Use slot i: spends one and says what happens ({ kind } — the caller throws,
 * rolls the giant snowball, drops the ice). Shields and boosts act here.
 */
export function useSlot(racer, i) {
  const it = racer.slots[i];
  if (!it || racer.finished || racer.itemCd > 0) return null;
  if (racer.rider.tumble > 0 || racer.rider.spinout > 0 || racer.rider.flat > 0) return null;
  if (it.kind === 'snowballs') return canThrow(racer) ? { kind: 'snowball' } : null;
  it.n -= 1;
  racer.itemCd = 0.35;
  if (it.kind === 'shield') {
    racer.shieldT = SHIELD_TIME;
  } else if (it.kind === 'boost') {
    racer.rider.boost = Math.max(racer.rider.boost, 1.7);
  }
  syncAmmo(racer);
  return { kind: it.kind };
}

/* ------------------------------------------------------------------ the giant snowball */

/** A giant snowball rolled from a racer: it runs down your lane, growing, and bowls riders over. */
export function newGiant(racer, id) {
  const r = racer.rider;
  // a little sideways nudge as it leaves your hands (from its id, so every peer rolls it alike)
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const nudge = (h & 1 ? 1 : -1) * (1.2 + (h >>> 1) % 5 * 0.15);
  return { id, from: racer.slot, s: r.s + 2.5, lat: r.lat, vl: r.speed * Math.sin(r.yaw) * 0.5 + nudge, v: Math.max(r.speed + 5, 17), rad: 0.85, t: 0, life: GIANT_LIFE, hit: new Set(), y: null, vy: 0, air: false, dist: 0, bump: 0 };
}

/** How long a giant snowball rolls before it breaks apart (s). */
export const GIANT_LIFE = 7;

/**
 * Roll it on over the real terrain — pure and deterministic (online peers
 * roll it the same way): gravity along the slope under it (faster on the
 * steeps, slower on the flats), the cross-slope swinging it up the berms and
 * back, the course bending away beneath it (so it drifts to the outside of
 * turns), bounces off the fences, little hops off rollers; it grows with the
 * distance rolled. `g.bump` counts bounces and landings (for a thump).
 * Returns false when it's done: smashed on a barrier (g.burstOn), broken
 * apart after GIANT_LIFE, or past the finish.
 */
export function rollGiant(g, course, dt) {
  const f = frameAt(course, g.s);
  g.t += dt;
  const ground = (s, l) => groundAt(course, s, l);
  if (g.y == null) {
    g.y = ground(g.s, g.lat);
    g.vyG = null;
  }
  if (!g.air) {
    const gs = ground(g.s + 0.6, g.lat) - ground(g.s - 0.6, g.lat);
    const gl = ground(g.s, g.lat + 0.6) - ground(g.s, g.lat - 0.6);
    g.v += (-9.8 * (gs / 1.2) / Math.sqrt(1 + (gs / 1.2) ** 2) * 0.9 - 0.0035 * g.v * g.v - 0.45) * dt;
    g.vl += (-9.8 * (gl / 1.2) / Math.sqrt(1 + (gl / 1.2) ** 2) * 0.75) * dt;
  }
  // the run bends beneath it; it keeps on straight, so it swings to the outside of the turn
  g.vl -= (f.curv ?? 0) * g.v * g.v * dt;
  g.vl *= Math.exp(-0.35 * dt);
  g.v = Math.max(4, Math.min(34, g.v));
  g.s += g.v * dt;
  g.lat += g.vl * dt;
  g.dist += Math.hypot(g.v, g.vl) * dt;
  // the fences at the run's edges (it can climb a berm a little first): a bounce
  const lim = f.width + 0.4 - g.rad * 0.6;
  if (Math.abs(g.lat) > lim) {
    const sd = Math.sign(g.lat);
    g.lat = sd * lim;
    if (g.vl * sd > 0) {
      g.vl = -g.vl * 0.55;
      g.v *= 0.94;
      g.bump++;
    }
  }
  // up and down: it follows the snow, but leaves it where the snow drops away faster than it can fall
  const gy = ground(g.s, g.lat);
  if (g.air) {
    g.vy -= 9.8 * dt;
    g.y += g.vy * dt;
    if (g.y <= gy) {
      g.y = gy;
      g.bump++;
      // how hard it meets the snow (the snow itself is sloping away under it)
      const vyGround = (ground(g.s + 0.5, g.lat) - ground(g.s - 0.5, g.lat)) * g.v;
      const impact = g.vy - vyGround;
      if (impact < -4) g.vy = vyGround - impact * 0.3;
      else {
        g.air = false;
        g.vyG = null;
      }
    }
  } else {
    const vyG = (gy - g.y) / Math.max(dt, 1e-4);
    if (g.vyG != null && vyG < g.vyG - 9.8 * dt * 2.4 && g.v > 12) {
      g.air = true;
      g.vy = g.vyG ?? 0;
      g.y += g.vy * dt;
    } else {
      g.y = gy;
      g.vyG = vyG;
    }
  }
  g.rad = Math.min(1.55, 0.85 + g.dist * 0.0055);
  if (g.t > g.life || g.s > course.finish + 20) return false;
  for (const o of between(course.obstacles, g.s - 1, g.s + 1)) {
    if (course.burst?.has(o.id)) continue;
    if (Math.abs(o.lat - g.lat) < o.w + g.rad * 0.7) {
      g.burstOn = o;
      return false;
    }
  }
  return true;
}

/** The racers a giant snowball runs into now (not its roller for the first second; each once). */
export function giantHits(g, racers, course) {
  const out = [];
  for (const rc of racers) {
    if (rc.finished || rc.gone || g.hit.has(rc.slot)) continue;
    if (rc.slot === g.from && g.t < 1.2) continue;
    const r = rc.rider;
    if (Math.abs(r.s - g.s) > g.rad + 0.6 || Math.abs(r.lat - g.lat) > g.rad + 0.55) continue;
    if (r.y - groundAt(course, r.s, r.lat) > g.rad * 1.8) continue; // jumped over it!
    g.hit.add(rc.slot);
    out.push(rc);
  }
  return out;
}

/** Bowled over by a giant snowball: squashed flat (a shield pops instead). */
export function applyBowl(target, fromSlot) {
  if (target.shieldT > 0) {
    target.shieldT = 0;
    return false;
  }
  const r = target.rider;
  // squashed pancake-flat on the snow (ears and board sticking out): stopped for a real second,
  // then a springy pop back up and off again at part of the old speed
  r.flat = FLAT;
  r.flatSpeed = r.speed * 0.6;
  r.speed = 0;
  r.invuln = Math.max(r.invuln, FLAT + 0.5);
  target.bonks += 1;
  target.lastHitBy = fromSlot;
  return true;
}

/** Drop a slippery ice patch behind you (it melts after `life` seconds of race time). */
export function dropIce(course, racer, now, id, life = 30) {
  const r = racer.rider;
  const p = { id, s: r.s - 5, lat: r.lat, len: 7, w: 4.5, until: now + life, from: racer.slot };
  course.dynIce.push(p);
  return p;
}

export function meltIce(course, now) {
  for (let i = course.dynIce.length - 1; i >= 0; i--) if (course.dynIce[i].until < now) course.dynIce.splice(i, 1);
}

/* ------------------------------------------------------------------ drafting */

/**
 * Riding close behind someone at speed: less drag. Returns the drag factor
 * (1 = none, down to 0.6) and remembers who you are tucked in behind.
 */
export function draftFactor(racer, racers) {
  const r = racer.rider;
  racer.draftBehind = null;
  if (r.air || r.speed < 11 || racer.finished) return 1;
  let best = 1;
  for (const o of racers) {
    if (o === racer || o.finished || o.gone || o.rider.air) continue;
    const ds = o.rider.s - r.s, dl = Math.abs(o.rider.lat - r.lat);
    if (ds < 2 || ds > 11 || dl > 1.5) continue;
    const k = 1 - (ds - 2) / 9;
    const f = 1 - 0.4 * k * (1 - dl / 1.5);
    if (f < best) {
      best = f;
      racer.draftBehind = o;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ snowballs */

/**
 * The rival a snowball would fly at: the nearest one ahead, inside a cone
 * around where you are heading, within 48 m. Null if nobody is there.
 */
export function pickTarget(thrower, racers, { range = 48, cone = 0.62, revenge = true } = {}) {
  const t = thrower.rider;
  // whoever hit you last, if they're near (ahead or behind): get them back!
  if (revenge && thrower.lastHitBy >= 0) {
    const o = racers.find((x) => x.slot === thrower.lastHitBy);
    if (o && !o.finished && !o.gone && Math.hypot(o.rider.s - t.s, o.rider.lat - t.lat) < 40 && Math.abs(o.rider.s - t.s) > 1.5) return o;
  }
  let best = null, bestD = Infinity;
  for (const o of racers) {
    if (o === thrower || o.finished) continue;
    const ds = o.rider.s - t.s, dl = o.rider.lat - t.lat;
    if (ds < 1.5 || ds > range) continue;
    const ang = Math.atan2(dl, ds) - t.yaw * 0.5;
    if (Math.abs(ang) > cone) continue;
    const d = Math.hypot(ds, dl);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export function canThrow(racer) {
  return racer.slots.some((x) => x.kind === 'snowballs' && x.n > 0) && racer.throwCd <= 0 && racer.rider.tumble <= 0 && racer.rider.spinout <= 0 && !(racer.rider.flat > 0) && !racer.finished;
}

/** Flight time of a lobbed snowball over `dist` metres. */
export const flightTime = (dist) => Math.max(0.32, Math.min(1.05, dist / 30));

/**
 * Throw: spends a snowball and returns the projectile (aimed at `target`, or
 * flung straight ahead when there is none).
 */
export function makeThrow(thrower, target, pid) {
  const t = thrower.rider;
  const sb = thrower.slots.find((x) => x.kind === 'snowballs');
  if (sb) sb.n -= 1;
  syncAmmo(thrower);
  thrower.throwCd = THROW_COOLDOWN;
  const dist = target ? Math.hypot(target.rider.s - t.s, target.rider.lat - t.lat) : 24;
  return {
    id: pid,
    from: thrower.slot,
    target: target ? target.slot : -1,
    t: 0,
    T: flightTime(dist),
    s0: t.s + 0.6, lat0: t.lat, y0: t.y + 1.0,
    // where it lands if nobody is there: ahead, along your heading
    s1: t.s + 24 * Math.cos(t.yaw) + t.speed * 0.8, lat1: t.lat + 24 * Math.sin(t.yaw)
  };
}

/** Can a snowball arriving now hit this racer? (Shields and big air make it miss.) */
export function hittable(target, course) {
  if (!target || target.finished) return false;
  const r = target.rider;
  if (target.shieldT > 0) return false;
  if (r.invuln > 0.9) return false;
  return r.y - groundAt(course, r.s, r.lat) < 2.4;
}

/** A snowball hit: a cute spin-out. Returns false if a shield took it instead. */
export function applyHit(target, fromSlot = -1) {
  if (target.shieldT > 0) {
    target.shieldT = 0;
    return false;
  }
  const r = target.rider;
  // a cartoon face-plant: pitched over the board's nose into the snow, a puff, and back up
  r.tumble = TUMBLE;
  r.tumbleLen = TUMBLE;
  r.tumbleSoft = true;
  r.speed *= 0.8;
  r.invuln = Math.max(r.invuln, 1.3);
  target.bonks += 1;
  target.lastHitBy = fromSlot;
  return true;
}

/** Turn a held shield on (key 2). */
export function useShield(racer) {
  const i = racer.slots.findIndex((x) => x.kind === 'shield');
  if (i < 0 || racer.shieldT > 0) return false;
  return Boolean(useSlot(racer, i));
}

/** Timers that belong to the race, not the rider. */
export function tickRacer(racer, dt) {
  racer.throwCd = Math.max(0, racer.throwCd - dt);
  racer.itemCd = Math.max(0, racer.itemCd - dt);
  racer.shieldT = Math.max(0, racer.shieldT - dt);
}

/**
 * Advance a projectile. Returns 'flying', or on arrival 'hit' / 'blocked' /
 * 'miss' (the caller applies the hit; online, only the host decides it).
 */
export function flyProjectile(p, dt) {
  p.t += dt;
  return p.t >= p.T ? 'arrived' : 'flying';
}

/** Where a projectile is now, in course space, for drawing: { s, lat, y }. */
export function projectilePos(p, racers, course, out = {}) {
  const u = Math.min(1, p.t / p.T);
  const tgt = p.target >= 0 ? racers.find((r) => r.slot === p.target) : null;
  const s1 = tgt ? tgt.rider.s : p.s1, lat1 = tgt ? tgt.rider.lat : p.lat1;
  const y1 = tgt ? tgt.rider.y + 0.75 : groundAt(course, p.s1, p.lat1);
  out.s = p.s0 + (s1 - p.s0) * u;
  out.lat = p.lat0 + (lat1 - p.lat0) * u;
  const dist = Math.hypot(s1 - p.s0, lat1 - p.lat0);
  out.y = p.y0 + (y1 - p.y0) * u + (1.2 + dist * 0.07) * 4 * u * (1 - u);
  return out;
}

/**
 * Soft rider–rider bumps: two riders that overlap are eased apart sideways
 * and share a little speed. Only riders this machine runs (`movable`) are moved.
 * Returns the pairs that touched (for a soft sound and a puff).
 */
export function separate(racers, movable = () => true) {
  const touched = [];
  for (let i = 0; i < racers.length; i++) {
    const A = racers[i], a = A.rider;
    if (A.gone) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const B = racers[j], b = B.rider;
      if (B.gone) continue;
      const ds = b.s - a.s, dl = b.lat - a.lat;
      if (Math.abs(ds) > 1.1 || Math.abs(dl) > 0.95 || Math.abs(a.y - b.y) > 1) continue;
      // side by side: whoever carves harder (and faster) shoves the other out
      const pa = Math.abs(a.edge ?? 0) + a.speed * 0.02 + (A.shieldT > 0 ? 1 : 0);
      const pb = Math.abs(b.edge ?? 0) + b.speed * 0.02 + (B.shieldT > 0 ? 1 : 0);
      const winner = pa >= pb ? A : B, loser = winner === A ? B : A;
      const push = (0.95 - Math.abs(dl)) * 0.5 + 0.03;
      const side = Math.sign(dl) || (i % 2 ? 1 : -1);
      const ma = movable(A), mb = movable(B);
      const la = winner === A ? 0.6 : 1.6, lb = winner === B ? 0.6 : 1.6;
      if (ma) a.lat -= side * push * la * (mb ? 1 : 1.6);
      if (mb) b.lat += side * push * lb * (ma ? 1 : 1.6);
      const avg = (a.speed + b.speed) / 2;
      if (ma) a.speed += (avg - a.speed) * 0.2;
      if (mb) b.speed += (avg - b.speed) * 0.2;
      if (movable(loser) && loser.rider.invuln <= 0) {
        loser.rider.wobble = Math.max(loser.rider.wobble, 0.35);
        loser.rider.speed *= 0.93;
      }
      touched.push([A, B, winner]);
    }
  }
  return touched;
}
