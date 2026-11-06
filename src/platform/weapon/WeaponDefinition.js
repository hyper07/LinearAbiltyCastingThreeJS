/**
 * Weapon categories for the armory UI and gameplay grouping.
 */
export const WEAPON_CATEGORIES = Object.freeze({
  UNARMED: 'unarmed',
  MAGIC: 'magic',
  SWORD: 'sword',
  AXE: 'axe',
  POLEARM: 'polearm',
  KNIFE: 'knife',
  PISTOL: 'pistol',
  RIFLE: 'rifle',
  BOW: 'bow',
  HEAVY: 'heavy'
});

/** Display order and labels for the armory tabs. */
export const WEAPON_CATEGORY_META = [
  { id: WEAPON_CATEGORIES.MAGIC, label: 'Magic', glyph: '✦' },
  { id: WEAPON_CATEGORIES.SWORD, label: 'Swords', glyph: '⚔' },
  { id: WEAPON_CATEGORIES.AXE, label: 'Axes & Blunt', glyph: '⛨' },
  { id: WEAPON_CATEGORIES.POLEARM, label: 'Polearms', glyph: '↑' },
  { id: WEAPON_CATEGORIES.KNIFE, label: 'Knives', glyph: '†' },
  { id: WEAPON_CATEGORIES.PISTOL, label: 'Pistols', glyph: '◎' },
  { id: WEAPON_CATEGORIES.RIFLE, label: 'Rifles', glyph: '⌖' },
  { id: WEAPON_CATEGORIES.BOW, label: 'Bows', glyph: '⊹' },
  { id: WEAPON_CATEGORIES.HEAVY, label: 'Heavy', glyph: '◈' },
  { id: WEAPON_CATEGORIES.UNARMED, label: 'Unarmed', glyph: '○' }
];

/**
 * @typedef {object} WeaponDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} category
 * @property {string} [visual]         procedural mesh recipe id
 * @property {string} [description]
 * @property {string} [model]          asset path, null = procedural
 * @property {string} attachPoint
 * @property {string} [attachSecondary] second hand for dual wield
 * @property {string} [weight]         tuning class: light, medium, heavy, magic, gun, bow
 * @property {object} [motionOverrides]
 * @property {object} [castingOverrides]
 * @property {Record<string, number>} [skillModifiers]
 */

/**
 * @param {string} id
 * @param {Partial<WeaponDefinition>} data
 * @returns {WeaponDefinition}
 */
export function createWeapon(id, data) {
  return {
    id,
    label: data.label ?? id,
    category: data.category ?? WEAPON_CATEGORIES.UNARMED,
    visual: data.visual ?? id,
    description: data.description ?? '',
    model: data.model ?? null,
    attachPoint: data.attachPoint ?? 'handR',
    attachSecondary: data.attachSecondary ?? null,
    weight: data.weight ?? 'medium',
    motionOverrides: data.motionOverrides ?? {},
    castingOverrides: data.castingOverrides ?? {},
    skillModifiers: data.skillModifiers ?? {},
    ...data
  };
}

/** @param {string} category */
export function categoryGlyph(category) {
  return WEAPON_CATEGORY_META.find((c) => c.id === category)?.glyph ?? '•';
}
