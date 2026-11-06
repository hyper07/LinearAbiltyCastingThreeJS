import { createWeapon } from './WeaponDefinition.js';
import { WEAPON_ARSENAL } from './arsenal.js';
import { applyWeaponTuning } from './tuning.js';

/** Every weapon in the arsenal, tuned and ready to register. */
export const DEFAULT_WEAPONS = WEAPON_ARSENAL.map((entry) =>
  createWeapon(entry.id, applyWeaponTuning(entry))
);

/** Quick lookup exports for loadouts that reference specific ids. */
export const unarmed = DEFAULT_WEAPONS.find((w) => w.id === 'unarmed');
export const arcaneWand = DEFAULT_WEAPONS.find((w) => w.id === 'arcane-wand');
export const arcaneStaff = DEFAULT_WEAPONS.find((w) => w.id === 'arcane-staff');
