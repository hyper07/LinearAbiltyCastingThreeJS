/**
 * Racing with friends, the pure part: the messages Snowpuff sends through
 * the party relay (server/realtime.js), compact state packing, and the
 * interpolation buffer that glides other riders between their 15 Hz states.
 * Tested in tests/unit/snowpuff.test.mjs; the socket side is net.js.
 *
 *   lobby   'sp-hi'    guest → host   { name, species, goggles }
 *           'sp-lobby' host → all     { mountain, members: [{ id, name, species, goggles }] }
 *   race    'sp-go'    host → all     { mountain, slots: [{ slot, id, name, species, goggles, human, kind }], at }
 *           'sp-st'    any → all      { k: packed rider state }   ~15 Hz (the host also sends 'sp-ai')
 *           'sp-ai'    host → all     { k: [packed, …] }          the AI rivals, ~15 Hz
 *           'sp-th'    thrower → all  { p: projectile }           a throw (everyone draws it)
 *           'sp-it'    user → all     { it: { k, id, from, … } }  a giant snowball rolled, ice dropped, a boost lit
 *           'sp-hit'   host → all     { p: id, target, ok, kind }  the host's call on a throw (or a giant snowball)
 *           'sp-fin'   any → host     { slot, time }
 *           'sp-res'   host → all     { order: [{ slot, time }] }  final standings
 */

import { cleanName } from './names.js';
import { cleanGoggle, randomGoggle } from './goggleList.js';
import { cleanBoard, randomBoard } from './boardList.js';

export const MSG = Object.freeze({
  hi: 'sp-hi',
  lobby: 'sp-lobby',
  go: 'sp-go',
  state: 'sp-st',
  ai: 'sp-ai',
  throw: 'sp-th',
  hit: 'sp-hit',
  fin: 'sp-fin',
  result: 'sp-res',
  item: 'sp-it'
});

export const SEND_HZ = 15;

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

const F_AIR = 1, F_TUMBLE = 2, F_SPIN = 4, F_TUCK = 8, F_SHIELD = 16, F_FIN = 32, F_WOBBLE = 64, F_BOOST = 128, F_SLIP = 256, F_ROLLED = 512, F_LIFT = 1024;

/** A racer's state as a short array (≈ 60 bytes of JSON). */
export function packState(racer) {
  const r = racer.rider;
  let flags = 0;
  if (r.air) flags |= F_AIR;
  if (r.tumble > 0) flags |= F_TUMBLE;
  if (r.spinout > 0) flags |= F_SPIN;
  if (r.tuck > 0.5) flags |= F_TUCK;
  if (racer.shieldT > 0) flags |= F_SHIELD;
  if (racer.finished) flags |= F_FIN;
  if (r.wobble > 0) flags |= F_WOBBLE;
  if (r.boost > 0) flags |= F_BOOST;
  if (r.slip > 0) flags |= F_SLIP;
  if (r.rolled > 0) flags |= F_ROLLED;
  if (racer.liftT > 0) flags |= F_LIFT;
  return [racer.slot, r2(r.s), r2(r.lat), r2(r.y), r3(r.yaw), r2(r.speed), flags, r2(r.spin), r2(r.flip), r2(r.edge), r2(r.charge), racer.ammo, racer.gifts ?? 0, r2(racer.time), racer.lap ?? 1];
}

/** The inverse of packState: a plain object (not a full racer). */
export function unpackState(a) {
  if (!Array.isArray(a) || a.length < 14) return null;
  const flags = a[6] | 0;
  return {
    slot: a[0] | 0, s: +a[1], lat: +a[2], y: +a[3], yaw: +a[4], speed: +a[5],
    air: Boolean(flags & F_AIR), tumble: Boolean(flags & F_TUMBLE), spinout: Boolean(flags & F_SPIN), tuck: Boolean(flags & F_TUCK),
    shield: Boolean(flags & F_SHIELD), finished: Boolean(flags & F_FIN), wobble: Boolean(flags & F_WOBBLE), boost: Boolean(flags & F_BOOST), slip: Boolean(flags & F_SLIP), rolled: Boolean(flags & F_ROLLED), lift: Boolean(flags & F_LIFT), lap: Math.max(1, Math.min(9, (a[14] | 0) || 1)),
    spin: +a[7], flip: +a[8], edge: +a[9], charge: +a[10], ammo: a[11] | 0, gifts: a[12] | 0, time: +a[13]
  };
}

/** A projectile for the wire (and back). */
export function packThrow(p) {
  return [p.id, p.from, p.target, r2(p.T), r2(p.s0), r2(p.lat0), r2(p.y0), r2(p.s1), r2(p.lat1)];
}
export function unpackThrow(a) {
  if (!Array.isArray(a) || a.length < 9) return null;
  return { id: String(a[0]), from: a[1] | 0, target: a[2] | 0, t: 0, T: +a[3], s0: +a[4], lat0: +a[5], y0: +a[6], s1: +a[7], lat1: +a[8] };
}

/** Clean up a lobby member record from the wire. */
export function cleanMember(m, species) {
  const name = cleanName(m?.name, 'Rider');
  return { id: String(m?.id ?? ''), name, species: species.includes(m?.species) ? m.species : species[0], goggles: cleanGoggle(m?.goggles), board: cleanBoard(m?.board) };
}

/**
 * Slots for a race: the humans first (host = slot 0), then AI rivals for the
 * empty places (up to `total`), each with a species no human took where possible.
 */
export function assignSlots(members, total, species, aiKinds = ['careful', 'reckless', 'thrower'], rand = Math.random) {
  const slots = members.slice(0, 4).map((m, i) => ({ slot: i, id: m.id, name: m.name, species: m.species, goggles: cleanGoggle(m.goggles), board: cleanBoard(m.board), human: true, kind: null }));
  const taken = new Set(slots.map((s) => s.species));
  const free = species.filter((s) => !taken.has(s));
  let i = 0;
  while (slots.length < total) {
    const sp = free.length ? free.shift() : species[(i + slots.length) % species.length];
    slots.push({ slot: slots.length, id: `ai${slots.length}`, name: null, species: sp, goggles: randomGoggle(rand), board: randomBoard(rand), human: false, kind: aiKinds[i % aiKinds.length] });
    i++;
  }
  return slots;
}

/**
 * Glide a remote rider between the states it sent: a short buffer, read
 * ~110 ms in the past, linear in between, held at the last one if late.
 */
export class InterpBuffer {
  constructor(delay = 0.11, keep = 20) {
    this.delay = delay;
    this.keep = keep;
    this.items = [];
  }

  push(t, state) {
    if (this.items.length && t <= this.items.at(-1).t) return;
    this.items.push({ t, state });
    if (this.items.length > this.keep) this.items.shift();
  }

  /** The state at time `now − delay`. Null until something arrived. */
  sample(now) {
    const items = this.items;
    if (!items.length) return null;
    const t = now - this.delay;
    if (t <= items[0].t) return items[0].state;
    for (let i = items.length - 1; i > 0; i--) {
      const a = items[i - 1], b = items[i];
      if (t >= a.t && t <= b.t) {
        const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
        return lerpState(a.state, b.state, u);
      }
    }
    // Late: extrapolate a little along the run, then hold.
    const last = items.at(-1);
    const ahead = Math.min(0.25, t - last.t);
    return { ...last.state, s: last.state.s + last.state.speed * ahead };
  }
}

const lerp = (a, b, u) => a + (b - a) * u;
function lerpAngle(a, b, u) {
  return a + (b - a) * u;
}

export function lerpState(a, b, u) {
  if (a.lap !== b.lap || a.lift !== b.lift || Math.abs(b.s - a.s) > 60) return { ...b }; // a new lap: no gliding back up the run
  return {
    ...b,
    s: lerp(a.s, b.s, u), lat: lerp(a.lat, b.lat, u), y: lerp(a.y, b.y, u), yaw: lerpAngle(a.yaw, b.yaw, u), speed: lerp(a.speed, b.speed, u),
    spin: b.air && a.air ? lerp(a.spin, b.spin, u) : b.spin, flip: b.air && a.air ? lerp(a.flip, b.flip, u) : b.flip, edge: lerp(a.edge, b.edge, u)
  };
}
