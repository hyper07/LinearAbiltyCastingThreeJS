/**
 * Default motion + cast accent from weapon weight class.
 * Individual weapons can still override any field.
 */

/** @typedef {'light'|'medium'|'heavy'|'magic'|'gun'|'bow'} WeaponWeight */

/** @param {WeaponWeight} weight */
export function motionForWeight(weight) {
  switch (weight) {
    case 'light':
      return { moveSpeed: 4.6, sprintMultiplier: 2.0, armSwing: 0.88, armTuck: 0.32 };
    case 'heavy':
      return { moveSpeed: 3.2, sprintMultiplier: 1.45, runLean: 0.2, armCarry: 0.28, armSwing: 0.62 };
    case 'magic':
      return { moveSpeed: 4.0, armCarry: 0.14, armSwing: 0.72 };
    case 'gun':
      return { moveSpeed: 3.85, runLean: 0.22, armCarry: 0.24, armSwing: 0.7 };
    case 'bow':
      return { moveSpeed: 4.1, armSwing: 0.6, armTuck: 0.22 };
    case 'medium':
    default:
      return { moveSpeed: 4.0, armSwing: 0.78 };
  }
}

/** @param {WeaponWeight} weight */
export function castingForWeight(weight) {
  switch (weight) {
    case 'light':
      return { castBlendIn: 0.07, castLean: 0.36, castRecoil: 0.1, castSettle: 3.2 };
    case 'heavy':
      return { castLean: 0.2, castRecoil: 0.38, castSettle: 1.5 };
    case 'magic':
      return { castLean: 0.32, castRecoil: 0.11, castBlendIn: 0.1, castSettle: 3.0 };
    case 'gun':
      return { castLean: 0.22, castRecoil: 0.28, castSettle: 1.8 };
    case 'bow':
      return { castLean: 0.28, castRecoil: 0.12, castBlendIn: 0.11 };
    case 'medium':
    default:
      return { castLean: 0.38, castRecoil: 0.18, castSettle: 2.4 };
  }
}

/**
 * @param {object} entry raw arsenal row
 */
export function applyWeaponTuning(entry) {
  const weight = entry.weight ?? 'medium';
  return {
    ...entry,
    motionOverrides: { ...motionForWeight(weight), ...entry.motionOverrides },
    castingOverrides: { ...castingForWeight(weight), ...entry.castingOverrides }
  };
}
