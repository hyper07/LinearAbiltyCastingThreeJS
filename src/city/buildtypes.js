/**
 * What a Seoul building near the bike course is, from what the building
 * register knows (its use, height and footprint), and who rents it — rules
 * from knowledge/seoul-buildings.md §2–4. Pure functions, no three.js, so
 * the tests can check them.
 *
 * Six types:
 *   shop       상가 근생: 4–7 floors over shops, tile/granite/render front, plain sides
 *   office     office tower: dark glass between white aluminium fins (BLDG_4)
 *   glass      glass tower: a curtain wall with its floors showing (BLDG_5)
 *   concrete   older concrete office: white/grey bands and ribbon windows
 *   villa      다세대/빌라: red or beige brick, small windows with grilles, piloti parking
 *   apartment  apartment slab: white, glazed balconies, a big number near the top
 */

/** A small seeded random (0–1), the same for every racer. */
export function rng(seed) {
  let h = (Math.floor(seed * 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000003) / 1000003;
  };
}

export const TYPES = ['shop', 'office', 'glass', 'concrete', 'villa', 'apartment'];

/**
 * A building's type from the register: `kind` is tiles.js's use (0 house · 1 apartment · 2 shop ·
 * 3 office · 4 public · 5 industry · 6 other), `h` metres, `area` its footprint in m², `seed` 0–1.
 */
export function buildingType({ kind, h, area = 200, seed = 0.5 }) {
  if (kind === 1) return h > 24 ? 'apartment' : 'villa';
  if (kind === 0) {
    if (h > 24) return 'apartment';
    return h <= 14 && seed < 0.78 ? 'villa' : 'shop';
  }
  // A long low hall (a market, a depot, a school) is plain concrete.
  if (h < 15 && area > 2500) return 'concrete';
  if (kind === 4) return 'concrete';
  if (kind === 5) return h < 12 ? 'shop' : 'concrete';
  if (h >= 60) return seed < 0.5 ? 'glass' : 'office';
  if (kind === 3) {
    if (h < 17) return 'shop';
    return seed < 0.45 ? 'office' : seed < 0.7 && h >= 30 ? 'glass' : 'concrete';
  }
  if (h < 25) return 'shop';
  return seed < 0.4 ? 'concrete' : seed < 0.75 || h < 30 ? 'office' : 'glass';
}

/** Wall finishes (the photo textures in facades.js). */
export const FINISHES = ['granite-grey', 'granite-beige', 'tile-white', 'tile-small', 'render', 'brick-red', 'brick-beige', 'concrete'];

const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

/**
 * How a building of a type is built (metres): ground-floor and upper floor heights, its front's finish
 * and the plainer finish of its sides, its windows, its parapet; seeded so neighbours differ.
 */
export function typeSpec(type, seed) {
  const r = rng(seed * 7.13 + TYPES.indexOf(type));
  switch (type) {
    case 'shop': {
      const finish = pick(r, ['granite-grey', 'granite-grey', 'granite-beige', 'tile-white', 'tile-small', 'render', 'brick-beige', 'render']);
      return { type, groundH: 4.2 + r() * 0.3, floorH: 3.3 + r() * 0.3, finish, side: pick(r, ['render', 'concrete', 'render']), windows: r() < 0.4 ? 'band' : 'punched', winW: 1.5 + r() * 0.8, winH: 1.5 + r() * 0.2, sill: 0.9, parapet: 1.0 + r() * 0.2, signs: true };
    }
    case 'villa': {
      const finish = pick(r, ['brick-red', 'brick-red', 'brick-red', 'brick-beige', 'render']);
      return { type, groundH: 2.8, floorH: 2.8, finish, side: finish, windows: 'punched', winW: 1.2 + r() * 0.5, winH: 1.2 + r() * 0.15, sill: 0.9, parapet: 0.9, piloti: r() < 0.55, grilles: true, signs: false };
    }
    case 'office':
      return { type, groundH: 5.0, floorH: 3.8, finish: 'fin', side: 'fin', windows: 'curtain', bay: 1.5 + r() * 0.4, parapet: 0.8, signs: false, top: true };
    case 'glass':
      return { type, groundH: 5.5, floorH: 3.9, finish: 'glass', side: 'glass', windows: 'curtain', bay: 1.5, parapet: 0, signs: false, top: r() < 0.7 };
    case 'concrete': {
      const finish = pick(r, ['concrete', 'render', 'tile-white', 'granite-grey']);
      return { type, groundH: 4.2, floorH: 3.5, finish, side: r() < 0.5 ? finish : 'concrete', windows: 'band', winH: 1.7, sill: 0.95, parapet: 1.0, signs: r() < 0.7, bandSides: r() < 0.5 };
    }
    case 'apartment':
    default:
      return { type: 'apartment', groundH: 2.8, floorH: 2.8, finish: 'render', side: 'render', windows: 'balcony', parapet: 1.2, signs: false };
  }
}

/** How many floors a building of height `h` has, and the upper floors' height so they fill it exactly. */
export function floorsOf(h, spec) {
  const upper = Math.max(0, Math.round((h - spec.groundH) / spec.floorH));
  const n = Math.max(1, upper + 1);
  const floorH = upper ? (h - spec.groundH) / upper : spec.floorH;
  return { n, floorH: Math.max(2.4, Math.min(5, floorH)), groundH: Math.min(h, spec.groundH) };
}

/**
 * Who is on which floor (seoul-buildings §4): the business word, by floor. 1F: shops you walk into;
 * 2F: clinics, salons, PC rooms, karaoke, academies, restaurants; 3F up: academies, clinics, offices,
 * churches, study cafes.
 */
export const WORDS = {
  ground: ['편의점', '카페', '약국', '김밥', '치킨', '베이커리', '부동산', '휴대폰', '분식', '꽃집', '안경', '세탁소', '정육점', '반찬가게', '국밥', '호프', '마트', '떡집'],
  second: ['치과', '미용실', 'PC방', '노래방', '학원', '식당', '한의원', '네일', '당구장'],
  upper: ['학원', '의원', '사무소', '교회', '스터디카페', '필라테스', '세무회계', '태권도', '피아노', '영어', '수학', '내과', '피부과', '요가']
};
/** Made-up names to go in front of the word (no real businesses). */
export const PREFIXES = ['하늘', '바른', '별빛', '푸른', '한빛', '새봄', '다온', '해오름', '온누리', '미소', '행복', '우리', '늘봄', '소망', '은하', '가온', '다솜', '라온', '한결', '참'];
/** Tower names for the big letters at the top: generic, our own. */
export const TOWERS = ['한빛타워', '미래빌딩', '대성빌딩', '청운타워', '새한생명', '동원빌딩', '세종타워', '가람빌딩'];

/**
 * The sign catalogue: every name a sign can show, in a fixed order (so the sign atlases and the
 * tenants agree). `floor` 1 for shops, 2 for second-floor businesses, 3 for higher ones.
 */
export function signNames() {
  const out = [];
  const r = rng(0.4242);
  const add = (word, floor, count) => {
    for (let k = 0; k < count; k++) {
      const prefix = PREFIXES[Math.floor(r() * PREFIXES.length)];
      const name = word === '편의점' ? `${prefix} 24시 편의점` : word.length >= 4 ? `${prefix} ${word}` : `${prefix}${word}`;
      if (!out.some((e) => e.name === name)) out.push({ name, word, floor });
    }
  };
  for (const w of WORDS.ground) add(w, 1, 3);
  for (const w of WORDS.second) add(w, 2, 3);
  for (const w of WORDS.upper) add(w, 3, 2);
  return out;
}

/**
 * Split a shopfront `len` metres long into shops: their [start, end] along it, with a pier
 * (`pier` m) between each and at both ends. Shops are 4–9 m; a short front is one shop.
 */
export function shopUnits(len, r, pier = 0.45) {
  const inner = len - pier;
  if (inner < 2.5) return [];
  const count = Math.max(1, Math.round(inner / (4.5 + r() * 3)));
  const units = [];
  // Unequal widths, so a row of shops doesn't look stamped.
  const weights = Array.from({ length: count }, () => 0.75 + r() * 0.5);
  const total = weights.reduce((s, w) => s + w, 0);
  let s = pier;
  for (const w of weights) {
    const width = (inner * w) / total - pier;
    units.push([s, s + width]);
    s += width + pier;
  }
  return units;
}

/**
 * The tenants of a shop building: one name (catalogue index) per shop on 1F, and one tenant on each
 * floor from 2F up to `maxFloor` (1-based floors). Floor-plausible: a shop word on 1F, a 2F word on 2F, an
 * upper word above. Some upper floors are empty or just offices with no sign (null).
 */
export function tenants(catalogue, r, shops, floors, maxFloor = 6) {
  const byFloor = (f) => catalogue.map((e, i) => [e, i]).filter(([e]) => e.floor === Math.min(3, f)).map(([, i]) => i);
  const used = new Set();
  const choose = (f) => {
    const list = byFloor(f);
    for (let k = 0; k < 6; k++) {
      const i = list[Math.floor(r() * list.length)];
      if (!used.has(catalogue[i].word)) {
        used.add(catalogue[i].word);
        return i;
      }
    }
    return list[Math.floor(r() * list.length)];
  };
  const ground = Array.from({ length: shops }, () => choose(1));
  const upper = [];
  for (let f = 2; f <= Math.min(floors, maxFloor); f++) upper.push(r() < (f <= 3 ? 0.92 : 0.7) ? choose(f) : null);
  return { ground, upper };
}
