import { settings } from '../../config/settings.js';

/**
 * Build a read-only stat sheet for the menu — motion, combat skills, and attacks.
 *
 * @param {import('../Platform.js').Platform} platform
 * @param {string} characterId
 * @param {string} [weaponId]
 */
export function deriveCharacterStats(platform, characterId, weaponId) {
  const character = platform.characters.get(characterId);
  const weapon = platform.weapons.get(weaponId ?? platform.getActiveWeaponId());
  const motion = platform.motions.get(character?.motion);
  const loadout = platform.loadouts.get(character?.defaultLoadout);

  const moveSpeed = motion?.moveSpeed ?? settings.character.moveSpeed;
  const walkSpeed = moveSpeed * (motion?.walkMultiplier ?? settings.character.walkMultiplier);
  const sprintSpeed = moveSpeed * (motion?.sprintMultiplier ?? settings.character.sprintMultiplier);

  const skills = (loadout?.skills ?? [])
    .map((skillId) => platform.skills.get(skillId))
    .filter(Boolean)
    .map((skill) => {
      const ability = settings[skill.abilityId] ?? {};
      const combat = settings.combat?.[skill.abilityId] ?? {};
      return {
        id: skill.id,
        label: skill.label,
        key: skill.key,
        accent: skill.accent,
        shape: skill.castShape,
        abilityId: skill.abilityId,
        range: ability.range ?? 0,
        minRange: ability.minRange ?? 0,
        cooldown: ability.cooldown ?? 0,
        damage: combat.damage ?? 0,
        status: combat.status ?? null
      };
    });

  const attacks = platform.getCharacterAttacks(characterId).map((attack) => ({
    id: attack.id,
    label: attack.label,
    damage: attack.damage,
    range: attack.range,
    cooldown: attack.cooldown,
    accent: attack.accent
  }));

  return {
    character: character?.label ?? characterId,
    series: character?.series ?? '',
    weapon: weapon?.label ?? 'Unarmed',
    weaponCategory: weapon?.category ?? '',
    motion: motion?.label ?? character?.motion ?? '—',
    moveSpeed,
    walkSpeed,
    sprintSpeed,
    jumpHeight: motion?.jumpHeight ?? settings.character.jumpHeight,
    health: settings.combat?.playerHealth ?? 100,
    turnRate: character?.casting?.turnRate ?? settings.character.turnRate,
    skills,
    attacks
  };
}
