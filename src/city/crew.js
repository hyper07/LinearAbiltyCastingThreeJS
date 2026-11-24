import { SPECIES } from '../snowpuff/riders.js';

/**
 * Gangnam Jarani's riders: Snowpuff Peaks' plush animals (their names,
 * colours and accents from src/snowpuff/riders.js, read only), on hire
 * scooters in Seoul — each with a scooter in their own colours and a feel of
 * their own (`spec` changes scoot.js SCOOT). Girls and boys both: the field
 * always has some of each (botRiders in race.js).
 */
export const CREW = {
  bunny: { she: true, ko: '말로', scooter: '#ff6fb4', trim: '#ffffff', text: 'Never stops bouncing. Quick off the line; her long ears stream back at full speed.', spec: { accel: 3.0, leanRate: 5.6 } },
  pig: { she: true, ko: '피치스', scooter: '#3a86ff', trim: '#ffffff', text: 'Peachy and unflappable: brakes late, holds a wet corner better than anyone.', spec: { brake: 6.4, grip: 1.08 } },
  cat: { she: true, ko: '모찌', scooter: '#ffd23f', trim: '#2b2f3a', text: 'A tabby in a sunny bobble hat. Quickest through the turns.', spec: { maxLean: 0.64, leanRate: 6.2 } },
  fox: { ko: '핍', scooter: '#2ec4d6', trim: '#ffffff', text: 'A round orange fox with a huge fluffy tail. Loves a long straight and a boost.', spec: { boostTop: 9.2, drain: 0.18 } },
  bear: { ko: '토피', scooter: '#2f4a8a', trim: '#ffd166', text: 'A caramel bear in a mint scarf: steady, heavy, hard to knock off line.', spec: { accel: 2.4, cruise: 7.05 } },
  frog: { ko: '피클', scooter: '#6fcf4a', trim: '#ff7a33', text: 'A lime frog with a snack backpack. Hops kerbs like nobody else.', spec: { accel: 2.8, hop: 1.2 } },
  penguin: { ko: '페블', scooter: '#ff4b5c', trim: '#ffffff', text: 'A round penguin in a red bobble hat — never minds the rain.', spec: { grip: 1.1, leanRate: 4.8 } }
};

/** The order they're shown in: girls and boys mixed. */
export const CREW_ORDER = ['bunny', 'fox', 'cat', 'bear', 'pig', 'frog', 'penguin'];

/** A rider by id: Snowpuff's name and colours with our scooter and feel. */
export function rider(id) {
  const c = CREW[id] ?? CREW.fox;
  const sp = SPECIES[id] ?? SPECIES.fox;
  return { id: CREW[id] ? id : 'fox', name: sp.name, ko: c.ko, she: Boolean(c.she), text: c.text, color: sp.color, accent: sp.accent, scooter: c.scooter, trim: c.trim, spec: c.spec ?? {} };
}

/** Riders for the bots: from the roster, never yours, girls and boys both — the first bot is the other kind from you. */
export function botRiders(mine, n = 3, random = Math.random) {
  const others = CREW_ORDER.filter((c) => c !== mine).sort(() => random() - 0.5);
  const she = (c) => Boolean(CREW[c]?.she);
  const out = [];
  const first = others.find((c) => she(c) !== she(mine));
  if (first) out.push(first);
  // then alternate, so a field of four is never all one kind
  for (const c of others) {
    if (out.length >= n) break;
    if (out.includes(c)) continue;
    const want = !she(out[out.length - 1] ?? mine);
    const pick = others.find((o) => !out.includes(o) && she(o) === want) ?? c;
    out.push(pick);
  }
  return out.slice(0, n);
}
