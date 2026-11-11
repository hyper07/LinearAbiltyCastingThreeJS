import { settings } from '../config/settings.js';
import { Registry } from './Registry.js';
import {
  applyMotionProfile,
  CASTING_KEYS,
  MOTION_KEYS
} from './motion/MotionProfile.js';
import { kaykitRig } from './rig/KaykitRigAdapter.js';
import { mixamoRig } from './rig/MixamoRigAdapter.js';
import { DEFAULT_MOTIONS } from './motion/catalog.js';
import { DEFAULT_MOTION_DATASETS } from './motion/datasets.js';
import { DEFAULT_CHARACTERS } from './character/catalog.js';
import { DEFAULT_SKILLS, SKILL_BY_ABILITY } from './skill/catalog.js';
import { DEFAULT_WEAPONS } from './weapon/catalog.js';
import { DEFAULT_LOADOUTS } from './loadout/catalog.js';
import { abilityAtSlot, skillAtSlot } from './loadout/Loadout.js';
import { DEFAULT_ATTACKS } from './attack/catalog.js';
import { attackKitForCharacter } from './attack/characterAttacks.js';
import {
  getStoredAppearance,
  patchStoredAppearance,
  resetStoredAppearance
} from './appearance/store.js';

/**
 * Platform — the modular layer for characters, motion, skills and weapons.
 *
 * Content authors register definitions here; the game reads them at runtime.
 * The live editor still tunes `settings.character` — applying a character or
 * motion profile copies values there so sliders keep working.
 *
 * Quick start — add a new character:
 *
 *   platform.characters.register(createCharacter('knight', { … }));
 *   platform.setCharacter('knight');
 *
 * Quick start — add a new skill:
 *
 *   platform.skills.register(createSkill('fireball', { abilityId: 'meteor', … }));
 *   platform.loadouts.register(createLoadout('knight-kit', { skills: ['fireball', …] }));
 */
export class Platform {
  constructor() {
    this.motions = new Registry('motions');
    this.motionDatasets = new Registry('motionDatasets');
    this.characters = new Registry('characters');
    this.skills = new Registry('skills');
    this.weapons = new Registry('weapons');
    this.loadouts = new Registry('loadouts');
    this.attacks = new Registry('attacks');

    /** @type {import('./rig/MixamoRigAdapter.js').MixamoRigAdapter} */
    this.rigs = new Map([
      ['mixamo', mixamoRig],
      ['kaykit', kaykitRig]
    ]);

    this._activeCharacterId = null;
    this._activeLoadoutId = null;
    this._activeWeaponId = 'unarmed';
    this._bootstrapped = false;
  }

  /** Register bundled defaults. Safe to call more than once. */
  bootstrap() {
    if (this._bootstrapped) return this;
    this._bootstrapped = true;

    for (const motion of DEFAULT_MOTIONS) this.motions.register(motion.id, motion);
    for (const dataset of DEFAULT_MOTION_DATASETS) {
      this.motionDatasets.register(dataset.id, dataset);
    }
    for (const character of DEFAULT_CHARACTERS) this.characters.register(character.id, character);
    for (const skill of DEFAULT_SKILLS) this.skills.register(skill.id, skill);
    for (const weapon of DEFAULT_WEAPONS) this.weapons.register(weapon.id, weapon);
    for (const loadout of DEFAULT_LOADOUTS) this.loadouts.register(loadout.id, loadout);
    for (const attack of DEFAULT_ATTACKS) this.attacks.register(attack.id, attack);

    // A class with authored walk, run, strafe and jump clips (the old caster has none, so it uses the coded gait).
    this.setCharacter(this.characters.has('mage') ? 'mage' : 'caster');
    return this;
  }

  /** @param {string} rigId */
  getRig(rigId = 'mixamo') {
    return this.rigs.get(rigId) ?? mixamoRig;
  }

  /** @returns {object|null} */
  getActiveCharacter() {
    return this._activeCharacterId ? this.characters.get(this._activeCharacterId) : null;
  }

  /** @returns {object|null} */
  getActiveLoadout() {
    return this._activeLoadoutId ? this.loadouts.get(this._activeLoadoutId) : null;
  }

  /**
   * Switch the active character. Copies motion + casting params into
   * `settings.character` for live tuning.
   *
   * @param {string} characterId
   */
  setCharacter(characterId) {
    const character = this.characters.get(characterId);
    if (!character) {
      console.warn(`[Platform] unknown character "${characterId}"`);
      return this;
    }

    this._activeCharacterId = characterId;
    this._applyCharacterMotion(character);
    this._applyCharacterCasting(character);
    this.setLoadout(character.defaultLoadout ?? 'caster-default');
    return this;
  }

  /**
   * Switch the equipped skill + weapon set.
   *
   * @param {string} loadoutId
   */
  setLoadout(loadoutId) {
    const loadout = this.loadouts.get(loadoutId);
    if (!loadout) {
      console.warn(`[Platform] unknown loadout "${loadoutId}"`);
      return this;
    }

    this._activeLoadoutId = loadoutId;
    this._activeWeaponId = loadout.weapon ?? 'unarmed';
    this._applyWeapon(this._activeWeaponId);
    return this;
  }

  /**
   * Equip a weapon without changing the skill loadout.
   *
   * Re-applies the character's base motion first so weapon overrides do not
   * stack when switching between rifles and wands.
   *
   * @param {string} weaponId
   */
  setWeapon(weaponId) {
    if (!this.weapons.has(weaponId)) {
      console.warn(`[Platform] unknown weapon "${weaponId}"`);
      return this;
    }

    this._activeWeaponId = weaponId;
    const loadout = this.getActiveLoadout();
    if (loadout) loadout.weapon = weaponId;

    const character = this.getActiveCharacter();
    if (character) this._applyCharacterMotion(character);
    this._applyWeapon(weaponId);
    return this;
  }

  /** @returns {string} */
  getActiveWeaponId() {
    return this._activeWeaponId;
  }

  /** @returns {object|null} */
  getActiveWeapon() {
    return this.weapons.get(this._activeWeaponId) ?? null;
  }

  /**
   * @param {string} category
   * @returns {object[]}
   */
  getWeaponsByCategory(category) {
    return this.weapons.all().filter((w) => w.category === category);
  }

  /**
   * Resolve a hotbar slot to a skill definition.
   *
   * @param {number} slot 0-based
   */
  getSkillAtSlot(slot) {
    const loadout = this.getActiveLoadout();
    const skillId = skillAtSlot(loadout, slot);
    return skillId ? this.skills.get(skillId) : null;
  }

  /**
   * Resolve a hotbar slot to an ability id (for VFX + combat).
   *
   * @param {number} slot 0-based
   */
  getAbilityAtSlot(slot) {
    const loadout = this.getActiveLoadout();
    return abilityAtSlot(loadout, slot, this.skills);
  }

  /** Ordered ability ids for the active loadout — replaces hardcoded `ELEMENTS`. */
  getAbilitySlots() {
    const loadout = this.getActiveLoadout();
    if (!loadout?.skills?.length) return [];
    return loadout.skills
      .map((skillId) => this.skills.get(skillId)?.abilityId)
      .filter(Boolean);
  }

  /**
   * Resolve which body clip to play for an ability cast.
   *
   * @param {string} abilityId
   */
  getCastAnim(abilityId) {
    const skill = this.skills.find((s) => s.abilityId === abilityId);
    if (skill?.castAnim) return skill.castAnim;
    return SKILL_BY_ABILITY[abilityId]?.castAnim ?? settings[abilityId]?.castAnim ?? 'cast1';
  }

  /**
   * Build ELEMENT_META-style presentation from the active loadout.
   * Keeps HUD / aim / AI in sync with loadout skills.
   */
  getSkillMeta() {
    const loadout = this.getActiveLoadout();
    if (!loadout) return {};
    const meta = {};
    for (const skillId of loadout.skills) {
      const skill = this.skills.get(skillId);
      if (!skill) continue;
      meta[skill.abilityId] = {
        label: skill.label,
        accent: skill.accent,
        key: skill.key,
        hint: skill.hint,
        cast: skill.castShape !== 'line' ? skill.castShape : undefined
      };
    }
    return meta;
  }

  getMotionDataset(datasetId) {
    return datasetId ? this.motionDatasets.get(datasetId) : null;
  }

  /**
   * Direct-attack ids for a character — explicit list on the definition, else
   * the themed kit table.
   *
   * @param {string} [characterId] defaults to the active character
   */
  getAttackIds(characterId = this._activeCharacterId) {
    const character = characterId ? this.characters.get(characterId) : null;
    if (character?.attacks?.length) return character.attacks;
    return attackKitForCharacter(characterId ?? 'caster');
  }

  /**
   * Resolved attack definitions for a character.
   *
   * @param {string} [characterId]
   * @returns {import('./attack/AttackDefinition.js').AttackDefinition[]}
   */
  getCharacterAttacks(characterId = this._activeCharacterId) {
    return this.getAttackIds(characterId)
      .map((id) => this.attacks.get(id))
      .filter(Boolean);
  }

  /**
   * Pick a random direct attack for preview or combat variety.
   *
   * @param {string} [characterId]
   */
  pickRandomAttack(characterId = this._activeCharacterId) {
    const pool = this.getCharacterAttacks(characterId);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * @param {string} [characterId]
   * @returns {import('./appearance/Appearance.js').CharacterAppearance}
   */
  getAppearance(characterId = this._activeCharacterId) {
    const id = characterId ?? 'caster';
    return getStoredAppearance(id, this.characters.get(id));
  }

  /**
   * @param {Partial<import('./appearance/Appearance.js').CharacterAppearance>} patch
   * @param {string} [characterId]
   */
  setAppearance(patch, characterId = this._activeCharacterId) {
    const id = characterId ?? 'caster';
    return patchStoredAppearance(id, this.characters.get(id), patch);
  }

  /** @param {string} [characterId] */
  resetAppearance(characterId = this._activeCharacterId) {
    const id = characterId ?? 'caster';
    return resetStoredAppearance(id, this.characters.get(id));
  }

  /** Apply a motion profile by id onto `settings.character`. */
  applyMotion(motionId) {
    const profile = this.motions.get(motionId);
    if (!profile) return this;
    applyMotionProfile(profile, settings.character);
    return this;
  }

  /** @param {object} character */
  _applyCharacterMotion(character) {
    const profile = this.motions.get(character.motion);
    if (profile) applyMotionProfile(profile, settings.character, MOTION_KEYS);
  }

  /** @param {object} character */
  _applyCharacterCasting(character) {
    if (!character.casting) return;
    for (const key of CASTING_KEYS) {
      if (character.casting[key] !== undefined) {
        settings.character[key] = character.casting[key];
      }
    }
  }

  /** @param {string|null} weaponId */
  _applyWeapon(weaponId) {
    if (!weaponId) return;
    const weapon = this.weapons.get(weaponId);
    if (!weapon) return;

    if (weapon.motionOverrides && Object.keys(weapon.motionOverrides).length) {
      Object.assign(settings.character, weapon.motionOverrides);
    }
    if (weapon.castingOverrides && Object.keys(weapon.castingOverrides).length) {
      for (const key of CASTING_KEYS) {
        if (weapon.castingOverrides[key] !== undefined) {
          settings.character[key] = weapon.castingOverrides[key];
        }
      }
    }
  }
}

/** Singleton used by the app. Bootstrap once at startup. */
export const platform = new Platform();
