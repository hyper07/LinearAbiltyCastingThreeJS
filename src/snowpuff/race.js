/**
 * The race's rules, pure: who is where, pickups (stars, snowball piles,
 * shields), snowballs (aim, flight, hit, spin-out), the finish and the
 * standings, and the gentle rubber band that keeps the rivals close.
 *
 * A racer is a rider (physics.js) plus what the race keeps about it:
 *   { slot, id, name, species, human, rider, stars, ammo, shieldItem, shieldT,
 *     hits, bonks, finished, time, taken: Set, streak: [] }
 *
 * Stars and piles are personal (each racer has its own), so nothing about
 * them has to be agreed online.
 */
import { between, groundAt } from './course.js';

export const MAX_AMMO = 3;
export const SPINOUT = 1.2;
export const SHIELD_TIME = 5;
export const THROW_COOLDOWN = 0.6;
export const PILE_GIVES = 2;

export function newRacer({ slot, id = `ai${slot}`, name = 'Rider', species = 'fox', human = false, rider }) {
  return { slot, id, name, species, human, rider, stars: 0, ammo: 0, shieldItem: 0, shieldT: 0, throwCd: 0, hits: 0, bonks: 0, tricks: 0, best: '', finished: false, time: 0, taken: new Set(), streak: [] };
}

/* ------------------------------------------------------------------ standings */

/** Racers in race order: finished first by time, then the rest by distance. Returns a new array. */
export function standings(racers) {
  return [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.time - b.time;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.rider.s - a.rider.s;
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
  const left = Math.max(0, course.finish - racer.rider.s);
  return now + left / Math.max(9, racer.rider.speed);
}

/** Has this racer crossed the line in this step? Records the time once. */
export function checkFinish(racer, course, now) {
  if (racer.finished || racer.rider.s < course.finish) return false;
  racer.finished = true;
  racer.time = now;
  racer.rider.finished = true;
  return true;
}

/* ------------------------------------------------------------------ pickups */

/**
 * Stars, piles and shields within reach. Returns events
 * ({ type: 'star' | 'pile' | 'shield-item' | 'streak', id }).
 */
export function pickups(racer, course, now) {
  const r = racer.rider;
  const ev = [];
  if (racer.finished) return ev;
  const g = groundAt(course, r.s, r.lat);
  const above = r.y - g;
  for (const st of between(course.stars, r.s - 1.6, r.s + 1.6)) {
    if (racer.taken.has(st.id)) continue;
    if (Math.abs(st.lat - r.lat) > 1.5 || Math.abs(st.h - (above + 0.6)) > 1.7) continue;
    racer.taken.add(st.id);
    racer.stars += 1;
    racer.streak.push(now);
    while (racer.streak.length && now - racer.streak[0] > 2.6) racer.streak.shift();
    ev.push({ type: 'star', id: st.id, risky: Boolean(st.risky) });
    if (racer.streak.length >= 3) {
      racer.streak.length = 0;
      r.boost = Math.max(r.boost, 0.9);
      ev.push({ type: 'streak' });
    }
  }
  if (above < 1.4) {
    for (const p of between(course.piles, r.s - 1.8, r.s + 1.8)) {
      if (racer.taken.has(p.id)) continue;
      if (Math.abs(p.lat - r.lat) > 1.7) continue;
      if (p.kind === 'snow') {
        if (racer.ammo >= MAX_AMMO) continue;
        racer.taken.add(p.id);
        racer.ammo = Math.min(MAX_AMMO, racer.ammo + PILE_GIVES);
        ev.push({ type: 'pile', id: p.id });
      } else {
        if (racer.shieldItem) continue;
        racer.taken.add(p.id);
        racer.shieldItem = 1;
        ev.push({ type: 'shield-item', id: p.id });
      }
    }
  }
  return ev;
}

/* ------------------------------------------------------------------ snowballs */

/**
 * The rival a snowball would fly at: the nearest one ahead, inside a cone
 * around where you are heading, within 48 m. Null if nobody is there.
 */
export function pickTarget(thrower, racers, { range = 48, cone = 0.62 } = {}) {
  const t = thrower.rider;
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
  return racer.ammo > 0 && racer.throwCd <= 0 && racer.rider.tumble <= 0 && racer.rider.spinout <= 0 && !racer.finished;
}

/** Flight time of a lobbed snowball over `dist` metres. */
export const flightTime = (dist) => Math.max(0.32, Math.min(1.05, dist / 30));

/**
 * Throw: spends a snowball and returns the projectile (aimed at `target`, or
 * flung straight ahead when there is none).
 */
export function makeThrow(thrower, target, pid) {
  const t = thrower.rider;
  thrower.ammo -= 1;
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
export function applyHit(target) {
  if (target.shieldT > 0) {
    target.shieldT = 0;
    return false;
  }
  const r = target.rider;
  r.spinout = SPINOUT;
  r.speed *= 0.62;
  r.invuln = Math.max(r.invuln, 1.3);
  target.bonks += 1;
  return true;
}

/** Turn a held shield on (key 2). */
export function useShield(racer) {
  if (!racer.shieldItem || racer.shieldT > 0) return false;
  racer.shieldItem = 0;
  racer.shieldT = SHIELD_TIME;
  return true;
}

/** Timers that belong to the race, not the rider. */
export function tickRacer(racer, dt) {
  racer.throwCd = Math.max(0, racer.throwCd - dt);
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
