/**
 * How a Hearthvale character looks: a body style for its class, a build,
 * a hat and a cape on or off, and an outfit colour. Pure data (the server
 * checks it; the browser draws it — bodies.js).
 *
 * The bodies are the KayKit Adventurers and Skeletons (CC0). That pack has
 * no separate male and female bodies, so the choice here is by style and
 * build, not by gender.
 */

/** Body styles a class may wear: each brings the weapons that class fights with. */
export const STYLES = {
  vanguard: [
    { id: 'knight', name: 'Knight', body: 'Knight', show: ['1H_Sword', 'Round_Shield'], attack: '1H_Melee_Attack_Chop' },
    { id: 'raider', name: 'Raider', body: 'Barbarian', show: ['1H_Axe', 'Barbarian_Round_Shield'], attack: '1H_Melee_Attack_Chop' },
    { id: 'revenant', name: 'Revenant', body: 'Skeleton_Warrior', show: [], attack: '1H_Melee_Attack_Slice_Horizontal' }
  ],
  ranger: [
    { id: 'scout', name: 'Scout', body: 'Rogue', show: ['2H_Crossbow'], attack: '2H_Ranged_Shoot' },
    { id: 'stalker', name: 'Stalker', body: 'Rogue_Hooded', show: ['2H_Crossbow'], attack: '2H_Ranged_Shoot' },
    { id: 'bonehunter', name: 'Bone hunter', body: 'Skeleton_Rogue', show: [], attack: 'Throw' }
  ],
  arcanist: [
    { id: 'wizard', name: 'Wizard', body: 'Mage', show: ['2H_Staff'], attack: 'Spellcast_Shoot' },
    { id: 'trickster', name: 'Trickster', body: 'Rogue_Hooded', show: ['Throwable'], attack: 'Spellcast_Shoot' },
    { id: 'lich', name: 'Lich', body: 'Skeleton_Mage', show: [], attack: 'Spellcast_Shoot' }
  ],
  mender: [
    { id: 'cleric', name: 'Cleric', body: 'Mage', show: ['1H_Wand', 'Spellbook'], attack: 'Spellcast_Shoot' },
    { id: 'herbalist', name: 'Herbalist', body: 'Rogue', show: ['Throwable'], attack: 'Spellcast_Shoot' },
    { id: 'spirit', name: 'Kind spirit', body: 'Skeleton_Mage', show: [], attack: 'Spellcast_Shoot' }
  ]
};

export const BUILDS = {
  slender: { name: 'Slender', wide: 0.88, tall: 1.03 },
  medium: { name: 'Medium', wide: 1, tall: 1 },
  sturdy: { name: 'Sturdy', wide: 1.14, tall: 0.98 },
  small: { name: 'Small', wide: 0.92, tall: 0.86 },
  tall: { name: 'Tall', wide: 1, tall: 1.12 }
};

/** Outfit colours: a tint over the body's own colours (white leaves them as made). */
export const TINTS = [
  ['#ffffff', 'As made'], ['#ffb3b3', 'Rose'], ['#ffd08a', 'Amber'], ['#fff3a0', 'Sun'], ['#b6f0a8', 'Leaf'],
  ['#9fe8e0', 'Sea'], ['#a8c8ff', 'Sky'], ['#c9b0ff', 'Violet'], ['#ffb0e6', 'Blossom'], ['#b8b8c8', 'Ash']
];

/** Meshes that are a hat (or helmet or hood) and a cape, by name. */
export const HAT = /_(Hat|Helmet|Hood)$/;
export const CAPE = /_(Cape|Cloak)$/;

/** A look, checked: anything unknown becomes the class's default. */
export function cleanLook(cls, raw = {}) {
  const styles = STYLES[cls] ?? STYLES.vanguard;
  return {
    style: styles.some((s) => s.id === raw?.style) ? raw.style : styles[0].id,
    build: BUILDS[raw?.build] ? raw.build : 'medium',
    tint: TINTS.some(([hex]) => hex === raw?.tint) ? raw.tint : '#ffffff',
    hat: raw?.hat !== false,
    cape: raw?.cape !== false
  };
}

/** Everything the drawing needs for a class and a look. */
export function lookOf(cls, look) {
  const l = cleanLook(cls, look);
  const style = (STYLES[cls] ?? STYLES.vanguard).find((s) => s.id === l.style);
  return { ...l, body: style.body, show: style.show, attack: style.attack, styleName: style.name, wide: BUILDS[l.build].wide, tall: BUILDS[l.build].tall };
}
