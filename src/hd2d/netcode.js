/**
 * Lanternwood co-op — the messages, as pure functions (no DOM, no sockets),
 * so what goes over the wire is tested and nothing a peer sends can break the
 * game. The socket is the platform's party relay (src/net/Session.js →
 * server/realtime.js): it relays any `{ t, … }` between the members of a room.
 *
 * The host runs the monsters, their attacks and their deaths; every player
 * runs their own hero and sends it. Two messages, each about 12 times a second:
 *
 *   'ld-me'   every player → everyone: their hero (where, pose, gear, health),
 *             the hits they landed on monsters, and visual events (swings, skills)
 *   'ld-tick' host → everyone: the realm, every monster near a player, and
 *             events (who got hurt, what died, missiles, effects)
 */
import { ENEMIES, CLASSES, ELITE_AFFIXES, AFFIX_ORDER, REALMS, RARITIES } from './rules.js';

export const NET_HZ = 12;
const KINDS = Object.keys(ENEMIES);
const STATES = ['idle', 'chase', 'windup', 'strike', 'recover', 'return', 'burrowed', 'stunned', 'dead'];
const SHAPES = [null, 'circle', 'rect', 'cone'];

const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const str = (v, n = 24) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, n);
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : null);

/* -------------------------------------------------------------- foes */

/** A monster as a short array: id, kind, where, health, state, facing, height, elite, telegraph. */
export function packFoe(e) {
  const t = e.tele;
  return [
    e.nid, KINDS.indexOf(e.kind), r1(e.x), r1(e.z), Math.round(e.hp), Math.round(e.maxHp), STATES.indexOf(e.state), r2(e.face ?? 0), r1(e.lift ?? 0),
    t ? SHAPES.indexOf(t.shape) : 0, t ? r1(t.x) : 0, t ? r1(t.z) : 0, t ? r1(t.r) : 0, t ? r2(t.k) : 0, t ? r2(t.a ?? 0) : 0, t ? r1(t.len ?? 0) : 0,
    e.elite ? str(e.elite.name, 40) : 0, e.elite ? e.elite.affixes.map((a) => AFFIX_ORDER.indexOf(a)).join('') : 0, Math.round(e.shield ?? 0)
  ];
}

/** A packed monster read back (null if it is not a real one). */
export function unpackFoe(a) {
  if (!Array.isArray(a) || a.length < 9) return null;
  const kind = KINDS[a[1]];
  if (!kind || !Number.isInteger(a[0])) return null;
  const maxHp = clamp(fin(a[5], 1), 1, 1e6);
  const out = {
    nid: a[0], kind, x: clamp(fin(a[2]), -400, 400), z: clamp(fin(a[3]), -400, 400), hp: clamp(fin(a[4]), 0, maxHp), maxHp,
    state: STATES[a[6]] ?? 'idle', face: fin(a[7]), lift: clamp(fin(a[8]), -3, 12), tele: null, elite: null, shield: clamp(fin(a[18]), 0, 1e6)
  };
  const shape = SHAPES[a[9]];
  if (shape) out.tele = { shape, x: fin(a[10]), z: fin(a[11]), r: clamp(fin(a[12]), 0, 40), k: clamp(fin(a[13]), 0, 1), a: fin(a[14]), len: clamp(fin(a[15]), 0, 60) };
  if (a[16]) {
    const affixes = String(a[17] ?? '').split('').map((d) => AFFIX_ORDER[Number(d)]).filter((x) => ELITE_AFFIXES[x]);
    out.elite = { name: str(a[16], 40), affixes };
  }
  return out;
}

/* ------------------------------------------------------------ heroes */

/** The look of a hero's gear for others to draw: [weapon, offhand, head, chest, hands, feet]. */
export function packGear(look) {
  return [
    look.weapon && [look.weapon.shape, look.weapon.color, look.weapon.rarity, look.weapon.type, look.weapon.twoHanded ? 1 : 0],
    look.offhand && [look.offhand.shape, look.offhand.color, look.offhand.rarity, look.offhand.kind],
    look.head && [look.head.shape, look.head.color, look.head.rarity, look.head.hidesHair ? 1 : 0],
    look.chest && [look.chest.color, look.chest.weight, look.chest.rarity, look.chest.robe ? 1 : 0],
    look.cape && [look.cape.color, look.cape.hem],
    look.hands,
    look.feet
  ];
}

const rarityOk = (r) => (RARITIES[r] ? r : 'common');
const glow = (r) => RARITIES[r]?.glow ?? null;

/** A packed gear look read back, checked. */
export function unpackGear(a) {
  const look = { weapon: null, offhand: null, head: null, chest: null, cape: null, hands: null, feet: null, parts: [] };
  if (!Array.isArray(a)) return look;
  const [w, o, h, c, cape, hands, feet] = a;
  const WEAPONS = ['shortsword', 'longsword', 'dagger', 'axe', 'mace', 'hammer', 'spear', 'staff', 'bow'];
  if (Array.isArray(w) && WEAPONS.includes(w[0]) && hex(w[1])) look.weapon = { shape: w[0], type: WEAPONS.includes(w[3]) ? w[3] : w[0], color: w[1], rarity: rarityOk(w[2]), glow: glow(w[2]), twoHanded: w[4] === 1 };
  if (Array.isArray(o) && ['buckler', 'kite', 'tower', 'tome', 'quiver'].includes(o[0]) && hex(o[1])) look.offhand = { shape: o[0], color: o[1], rarity: rarityOk(o[2]), glow: glow(o[2]), kind: ['shield', 'tome', 'quiver'].includes(o[3]) ? o[3] : 'shield' };
  if (Array.isArray(h) && ['hood', 'cap', 'wizard', 'circlet', 'open', 'horned', 'full'].includes(h[0]) && hex(h[1])) look.head = { shape: h[0], color: h[1], rarity: rarityOk(h[2]), glow: glow(h[2]), hidesHair: h[3] === 1 };
  if (Array.isArray(c) && hex(c[0])) look.chest = { color: c[0], weight: ['light', 'medium', 'heavy'].includes(c[1]) ? c[1] : 'light', rarity: rarityOk(c[2]), glow: glow(c[2]), robe: c[3] === 1 };
  if (Array.isArray(cape) && hex(cape[0])) look.cape = { color: cape[0], hem: hex(cape[1]) };
  look.hands = hex(hands);
  look.feet = hex(feet);
  return look;
}

/**
 * A hero message ('ld-me') read back, checked: names and numbers clamped,
 * unknown classes and realms refused, at most 24 hits and 24 events.
 */
export function readHero(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (!CLASSES[msg.c] || !REALMS[msg.r]) return null;
  const a = Array.isArray(msg.a) ? msg.a : [];
  return {
    name: str(msg.n) || 'Wayfarer',
    cls: msg.c,
    look: str(msg.lk, 20),
    level: clamp(Math.floor(fin(msg.lv, 1)), 1, 99),
    hp: clamp(fin(msg.hp), 0, 1e6),
    maxHp: clamp(fin(msg.mhp, 1), 1, 1e6),
    def: clamp(fin(msg.df), 0, 1e5),
    realm: msg.r,
    x: clamp(fin(msg.x), -400, 400),
    z: clamp(fin(msg.z), -400, 400),
    face: fin(msg.f),
    act: { move: clamp(fin(a[0]), 0, 1), swing: a[1] ? { pose: str(a[1], 12), t: clamp(fin(a[2]), 0, 1) } : null, spin: a[3] == null || a[3] < 0 ? null : clamp(fin(a[3]), 0, 1), cast: a[4] == null || a[4] < 0 ? null : clamp(fin(a[4]), 0, 1), roll: a[5] == null || a[5] < 0 ? null : clamp(fin(a[5]), 0, 1), hurt: clamp(fin(a[6]), 0, 1), dead: a[7] === 1, pose: a[8] ? str(a[8], 12) : null, poseT: clamp(fin(a[9]), 0, 1), guard: a[10] === 1 },
    gear: unpackGear(msg.g),
    bossQuest: Array.isArray(msg.bq) ? msg.bq.filter((k) => ENEMIES[k]?.boss).slice(0, 4) : [],
    hits: readHits(msg.h),
    events: Array.isArray(msg.ev) ? msg.ev.slice(0, 24).filter((e) => e && typeof e === 'object' && typeof e.k === 'string') : []
  };
}

/**
 * Hits a player landed: [foeId, amount, crit, knockX, knockZ, effect, effectTime].
 * Amounts are capped (no one-shot cheats past what a hero can do).
 */
export function readHits(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const h of list.slice(0, 24)) {
    if (!Array.isArray(h) || !Number.isInteger(h[0])) continue;
    out.push({
      nid: h[0], amount: clamp(Math.round(fin(h[1])), 0, 20000), crit: h[2] === 1, kx: clamp(fin(h[3]), -40, 40), kz: clamp(fin(h[4]), -40, 40),
      effect: ['stun', 'slow', 'burn', 'root', null].includes(h[5] ?? null) ? (h[5] ?? null) : null, effectT: clamp(fin(h[6]), 0, 10)
    });
  }
  return out;
}

/** A host tick read back: the realm, the monsters, the events. */
export function readTick(msg) {
  if (!msg || typeof msg !== 'object' || !REALMS[msg.r]) return null;
  return {
    realm: msg.r,
    foes: Array.isArray(msg.f) ? msg.f.slice(0, 400).map(unpackFoe).filter(Boolean) : [],
    events: Array.isArray(msg.ev) ? msg.ev.slice(0, 64).filter((e) => e && typeof e === 'object' && typeof e.k === 'string') : [],
    full: Boolean(msg.full)
  };
}
