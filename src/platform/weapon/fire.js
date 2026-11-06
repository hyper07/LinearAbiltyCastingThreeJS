/**
 * How each weapon attacks (left click).
 *
 * Melee weapons keep the class's swing kit (platform/attack). Everything else
 * fires, with one of five modes:
 *
 *   hitscan     a bullet: instant, along the aim, with a tracer; `pellets` for
 *               a shotgun, `pierce` for a round that goes through
 *   projectile  something that flies: arrow, rocket, grenade, thrown knife…
 *               (`speed`, `gravity` for an arc, `explode` radius, `returns`
 *               for a boomerang, `pierce`)
 *   beam        an instant line through everything (railgun, ion cannon, laser)
 *   cone        a short spray hitting everything in front (flamethrower)
 *   melee       the class's swings
 *
 * Common fields: damage, range (m), cooldown (s between shots), auto (keeps
 * firing while the button is held), burst (shots per pull), spread (radians),
 * mag + reload (s) for a magazine, knockback, status + duration, color (tracer
 * / glow), anim ('shoot1' one hand, 'shoot2' two hands, 'throw'), visual (the
 * projectile model).
 */

const PISTOL = { mode: 'hitscan', damage: 14, range: 24, cooldown: 0.3, spread: 0.02, mag: 12, reload: 1.1, knockback: 0.5, color: '#ffe9a0', anim: 'shoot1' };
const RIFLE = { mode: 'hitscan', damage: 10, range: 32, cooldown: 0.11, auto: true, spread: 0.035, mag: 30, reload: 1.6, knockback: 0.4, color: '#ffe9a0', anim: 'shoot2' };
const BOW = { mode: 'projectile', visual: 'arrow', damage: 22, range: 34, cooldown: 0.55, speed: 46, gravity: 3, knockback: 0.8, color: '#e8dcc0', anim: 'shoot2' };
const THROW = { mode: 'projectile', visual: 'knife', damage: 16, range: 22, cooldown: 0.38, speed: 32, gravity: 2, knockback: 0.6, color: '#d8dde6', anim: 'throw' };

/** Per-category defaults. Weapons override any field with their own `fire`. */
export const FIRE_BY_CATEGORY = {
  pistol: PISTOL,
  rifle: RIFLE,
  bow: BOW,
  throwing: THROW,
  heavy: { mode: 'projectile', visual: 'rocket', damage: 55, range: 34, cooldown: 1.6, speed: 26, explode: 3.2, mag: 1, reload: 1.6, knockback: 3, color: '#ffb060', anim: 'shoot2' }
};

/** Per-weapon tuning, keyed by weapon id. */
export const FIRE_BY_WEAPON = {
  /* pistols */
  revolver: { damage: 24, cooldown: 0.5, mag: 6, reload: 1.6, knockback: 1 },
  'hand-cannon': { damage: 32, cooldown: 0.75, mag: 7, knockback: 1.8, spread: 0.03 },
  smg: { damage: 7, cooldown: 0.085, auto: true, spread: 0.07, mag: 30, reload: 1.2, range: 20 },
  'machine-pistol': { damage: 6, cooldown: 0.07, auto: true, spread: 0.08, mag: 20, reload: 1.0, range: 18 },
  'dual-pistols': { damage: 12, cooldown: 0.17, mag: 24, reload: 1.5 },
  'plasma-pistol': { mode: 'projectile', visual: 'plasma', damage: 18, speed: 38, gravity: 0, cooldown: 0.32, mag: 0, color: '#44ccff', status: 'shock', duration: 0.2 },
  flintlock: { damage: 34, cooldown: 0.4, mag: 1, reload: 1.8, spread: 0.04, knockback: 1.6, color: '#ffd28a' },
  'harpoon-pistol': { mode: 'projectile', visual: 'harpoon', damage: 28, speed: 34, gravity: 1, cooldown: 0.5, mag: 1, reload: 1.2, pierce: 1, status: 'root', duration: 0.8, anim: 'shoot1' },

  /* rifles */
  carbine: { damage: 11, cooldown: 0.13, mag: 25 },
  'burst-rifle': { auto: false, burst: 3, damage: 12, cooldown: 0.45, spread: 0.02 },
  dmr: { auto: false, damage: 28, cooldown: 0.42, spread: 0.01, range: 40, mag: 10, pierce: 1 },
  'sniper-rifle': { auto: false, damage: 75, cooldown: 1.25, spread: 0, range: 52, mag: 5, reload: 2.2, pierce: 3, knockback: 2.5, color: '#fff6d0' },
  shotgun: { auto: false, pellets: 7, damage: 8, cooldown: 0.8, spread: 0.2, range: 13, mag: 6, reload: 2.0, knockback: 1.2 },
  'combat-shotgun': { auto: true, pellets: 6, damage: 7, cooldown: 0.38, spread: 0.22, range: 12, mag: 8, reload: 1.8, knockback: 1 },
  lmg: { damage: 9, cooldown: 0.085, spread: 0.06, mag: 80, reload: 3.2 },
  'plasma-rifle': { mode: 'projectile', visual: 'plasma', damage: 14, speed: 40, gravity: 0, cooldown: 0.13, mag: 40, color: '#55bbff' },
  'laser-rifle': { mode: 'beam', auto: false, damage: 20, cooldown: 0.28, range: 36, pierce: 2, mag: 20, color: '#ff4d6a' },
  'pulse-carbine': { mode: 'projectile', visual: 'plasma', auto: false, burst: 3, damage: 10, speed: 44, gravity: 0, cooldown: 0.4, color: '#7fe9c4' },
  musket: { auto: false, damage: 48, cooldown: 0.5, spread: 0.015, range: 36, mag: 1, reload: 2.4, knockback: 2.2, pierce: 1, color: '#ffd28a' },
  'lever-rifle': { auto: false, damage: 26, cooldown: 0.5, spread: 0.01, range: 38, mag: 8, reload: 2.4 },
  blunderbuss: { auto: false, pellets: 10, damage: 7, cooldown: 0.6, spread: 0.32, range: 9, mag: 1, reload: 2.0, knockback: 2.4, color: '#ffc070' },
  'harpoon-gun': { mode: 'projectile', visual: 'harpoon', auto: false, damage: 42, speed: 36, gravity: 1, cooldown: 0.6, mag: 1, reload: 1.6, pierce: 2, status: 'root', duration: 1.2 },
  blowgun: { mode: 'projectile', visual: 'dart', auto: false, damage: 8, speed: 40, gravity: 1.5, cooldown: 0.5, mag: 0, status: 'burn', duration: 3, color: '#9be37a', anim: 'shoot1' },

  /* bows */
  shortbow: { damage: 16, cooldown: 0.42, range: 30 },
  longbow: { damage: 30, cooldown: 0.75, range: 42, speed: 52, pierce: 1 },
  'compound-bow': { damage: 26, cooldown: 0.6, speed: 56, pierce: 1 },
  crossbow: { visual: 'bolt', damage: 34, cooldown: 0.9, speed: 60, gravity: 1, mag: 1, reload: 0.9 },
  'heavy-crossbow': { visual: 'bolt', damage: 52, cooldown: 1.3, speed: 64, gravity: 1, pierce: 2, knockback: 2.5, mag: 1, reload: 1.4 },
  'hand-crossbow': { visual: 'bolt', damage: 18, cooldown: 0.45, speed: 50, gravity: 1, mag: 5, reload: 1.4, anim: 'shoot1' },
  sling: { visual: 'stone', damage: 12, cooldown: 0.5, speed: 30, gravity: 6, knockback: 1.4, status: 'shock', duration: 0.25, anim: 'throw' },

  /* heavy */
  'grenade-launcher': { visual: 'grenade', damage: 45, speed: 19, gravity: 14, explode: 3, cooldown: 1.0, mag: 6, reload: 2.4, range: 26 },
  minigun: { mode: 'hitscan', auto: true, damage: 6, cooldown: 0.05, spread: 0.09, range: 28, explode: 0, mag: 200, reload: 3.6, knockback: 0.3, color: '#ffe9a0' },
  railgun: { mode: 'beam', damage: 65, cooldown: 1.8, range: 48, pierce: 99, explode: 0, mag: 0, knockback: 3, color: '#7fd0ff' },
  flamethrower: { mode: 'cone', auto: true, damage: 4, cooldown: 0.08, range: 7.5, spread: 0.45, explode: 0, mag: 100, reload: 2.5, knockback: 0.1, status: 'burn', duration: 2.5, color: '#ff8a3c' },
  'ion-cannon': { mode: 'beam', damage: 85, cooldown: 2.4, range: 44, pierce: 99, explode: 0, mag: 0, knockback: 4, color: '#c27bff' },

  /* throwing */
  'throwing-knives': { damage: 15, cooldown: 0.32 },
  shuriken: { visual: 'shuriken', pellets: 3, spread: 0.18, damage: 9, cooldown: 0.45, speed: 36, gravity: 0.5 },
  javelin: { visual: 'javelin', damage: 38, cooldown: 0.9, speed: 34, gravity: 7, pierce: 2, knockback: 2.2, range: 30 },
  boomerang: { visual: 'boomerang', damage: 18, cooldown: 0.9, speed: 24, gravity: 0, returns: true, pierce: 99, range: 16 },
  chakram: { visual: 'chakram', damage: 22, cooldown: 0.75, speed: 30, gravity: 0, returns: true, pierce: 99, range: 18, color: '#ffd23f' },
  'throwing-axe': { visual: 'axe', damage: 30, cooldown: 0.8, speed: 26, gravity: 6, knockback: 1.8 },
  bomb: { visual: 'bomb', damage: 50, cooldown: 1.2, speed: 16, gravity: 14, explode: 3.4, knockback: 3, range: 20 },
  'smoke-bomb': { visual: 'bomb', damage: 6, cooldown: 1.2, speed: 16, gravity: 14, explode: 4.5, status: 'chill', duration: 3, color: '#b8c0cc', knockback: 0.5, range: 20 }
};

/**
 * The fire profile for a weapon: its own tuning over its category's, or null
 * for a melee weapon (the class's swings).
 * @param {import('./WeaponDefinition.js').WeaponDefinition|null} weapon
 */
export function fireProfileOf(weapon) {
  if (!weapon) return null;
  const base = FIRE_BY_CATEGORY[weapon.category];
  const own = FIRE_BY_WEAPON[weapon.id];
  if (!base && !own) return null;
  return { ...(base ?? THROW), ...(own ?? {}), ...(weapon.fire ?? {}) };
}

/** One short line for the armory card: what it does in a fight. */
export function describeFire(fire) {
  if (!fire) return 'Melee — your class’s swings';
  const parts = [];
  const shots = fire.pellets > 1 ? `${fire.pellets}×${fire.damage}` : `${fire.damage}`;
  parts.push(`${shots} dmg`);
  const rate = 1 / Math.max(0.01, fire.cooldown);
  parts.push(rate >= 2 ? `${rate.toFixed(rate >= 10 ? 0 : 1)}/s` : `${fire.cooldown}s`);
  if (fire.burst > 1) parts.push(`${fire.burst}-round burst`);
  if (fire.auto) parts.push('auto');
  parts.push(`${fire.range} m`);
  if (fire.explode) parts.push(`${fire.explode} m blast`);
  if (fire.pierce >= 99) parts.push('pierces all');
  else if (fire.pierce) parts.push(`pierces ${fire.pierce}`);
  if (fire.returns) parts.push('returns');
  if (fire.status) parts.push(fire.status);
  if (fire.mag > 1) parts.push(`${fire.mag} rounds`);
  return parts.join(' · ');
}
