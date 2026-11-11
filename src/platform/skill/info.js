import { settings, ELEMENT_META, CastShape } from '../../config/settings.js';
import { SKILL_MAX_RANK, SKILL_RANK } from '../../items/Items.js';
import { levelCooldownFactor, manaCost } from '../../game/progression.js';

/**
 * What a skill does, in words — for the skill tree's detail card.
 *
 * The prose is written here; every number comes from the live settings
 * (settings[id] for the cast, settings.combat[id] for the hit), so the card
 * stays true when a skill is tuned. Skills made in the Class forge carry
 * their own description (ELEMENT_META[id].description) and inherit the
 * numbers of the skill they are built on.
 */
export const SKILL_INFO = {
  ice: 'A lance of frost bursts out of the ground along the line, a field of crystals that slows everything it catches.',
  thunder: 'A bolt of lightning races down the line in an instant and leaves everything it touches stunned for a moment.',
  meteor: 'A burning rock is lobbed to the end of the line and lands with a huge blast that throws monsters back and sets them alight.',
  beam: 'Gathers light in the hands, then releases a column that holds along the line, burning through everything in it.',
  snare: 'A ring of violet lightning springs shut where you aim; everything inside is rooted to the spot.',
  glacier: 'A crown of ice blades rises around the point you choose and freezes everything inside solid.',
  chain: 'A golden bolt that leaps from monster to monster, a little weaker with every jump.',
  orb: 'A slow orb of void drifts down the line, zapping the nearest monsters as it passes, then bursts at the end.',
  hail: 'A storm cloud gathers over the circle and hammers it with hail for several seconds.',
  blink: 'Vanish and reappear further down the line, cutting through everything you pass.',
  slam: 'Strike the ground so hard it splits along the line. Builds Rage for every monster hit.',
  rampage: 'Charge down the line, bowling monsters aside. Builds Rage for every monster hit.',
  roar: 'A war cry that stuns everything close and fills you with fury: +25% damage for a while. Builds Rage.',
  leap: 'Leap through the air to the point you choose and crash down on everything there. Costs Rage.',
  tempest: 'Spin with your weapon out, hitting everything around you for a few seconds as you move. Costs Rage.',
  quake: 'Crack the ground at the point you choose; it keeps shaking, hitting and slowing everything on it. Costs Rage.'
};

const STATUS = {
  chill: (s) => `Slows for ${s} s`,
  shock: (s) => `Stuns for ${s} s`,
  root: (s) => `Roots in place for ${s} s`,
  freeze: (s) => `Freezes solid for ${s} s`,
  burn: (s) => `Burns for ${s} s`
};

const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** How it is aimed, in a few words. */
export function castLabel(element) {
  const cast = ELEMENT_META[element]?.cast;
  if (cast === CastShape.SELF) return 'Around you';
  if (cast === CastShape.ZONE) return 'Far-cast circle';
  return 'Line skillshot';
}

/**
 * Everything the detail card shows, at a rank (default: the rank given).
 * @param {string} element
 * @param {number} rank 0 = not learned (shown as rank 1)
 * @param {{ level?: number, rage?: boolean }} [who] the character's level (cooldowns shrink with it) and whether it fights with Rage (no mana)
 */
export function skillDetails(element, rank, { level = 1, rage = false } = {}) {
  const meta = ELEMENT_META[element] ?? {};
  const base = meta.base ?? element;
  const ability = settings[element] ?? {};
  const combat = settings.combat[element] ?? {};
  const at = Math.max(1, rank);
  const dmgMul = (r) => 1 + (r - 1) * (SKILL_RANK.damage / 100);
  const cdMul = (r) => Math.max(0.4, 1 - ((r - 1) * SKILL_RANK.cooldown) / 100);
  const damage = (r) => Math.round((combat.damage ?? 0) * dmgMul(r));
  const cooldown = (r) => round((ability.cooldown ?? 0) * cdMul(r) * levelCooldownFactor(level), 2);
  const mana = (r) => manaCost(element, r, { rage });

  const cast = meta.cast;
  const area = combat.radius || ability.zoneRadius;
  let reach;
  if (cast === CastShape.SELF) reach = `${area ?? 0} m around you`;
  else if (cast === CastShape.ZONE) reach = `${area ?? 0} m circle, up to ${ability.range ?? 0} m away`;
  else reach = `${ability.range ?? 0} m line${combat.width ? `, ${combat.width} m wide` : ''}`;

  const effects = [];
  if (combat.kind === 'chain') effects.push(`Jumps to ${combat.jumps} more monsters within ${combat.jumpRange} m (−${Math.round((1 - combat.falloff) * 100)}% per jump)`);
  if (combat.kind === 'orb') effects.push(`Zaps ${combat.targets} monsters within ${combat.reach} m every ${combat.tick} s, then bursts for ${combat.burst}`);
  if (combat.kind === 'storm') effects.push(`Hits every ${combat.tick} s for ${combat.lasts} s${combat.follow ? ', moving with you' : ''}`);
  if (combat.splash) effects.push(`Splashes ${combat.splash} m around each hit`);
  if (combat.status && combat.duration) effects.push(STATUS[combat.status]?.(combat.duration) ?? `${combat.status} for ${combat.duration} s`);
  if (combat.shatter > 1) effects.push(`×${combat.shatter} damage to frozen monsters (shatters them)`);
  if (combat.knockback >= 3) effects.push('Throws monsters back');
  if (base === 'roar') effects.push('+25% damage for you while it lasts');
  if (base === 'blink' || base === 'rampage' || base === 'leap') effects.push('Moves you');
  if (meta.rage > 0) effects.push(`+${meta.rage} Rage per monster hit`);
  if (meta.rage < 0) effects.push(`Costs ${-meta.rage} Rage`);
  if (!rage) effects.push(`Costs ${mana(at)} mana`);
  if (meta.rageOnCast) effects.push(`+${meta.rageOnCast} Rage when used`);

  return {
    name: meta.label ?? element,
    accent: meta.accent ?? '#ffffff',
    description: meta.description ?? SKILL_INFO[element] ?? SKILL_INFO[base] ?? '',
    physical: Boolean(meta.physical),
    cast: castLabel(element),
    reach,
    damage: damage(at),
    cooldown: cooldown(at),
    mana: rage ? 0 : mana(at),
    next: rank >= 1 && rank < SKILL_MAX_RANK ? { damage: damage(rank + 1), cooldown: cooldown(rank + 1), mana: rage ? 0 : mana(rank + 1) } : null,
    effects
  };
}
