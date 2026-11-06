import { settings, ELEMENT_META, CastShape } from '../config/settings.js';
import { tokens } from './similarity.js';
import { SKILL_INFO } from '../platform/skill/info.js';

/**
 * Fingerprints: what makes an asset *that* asset, for finding similar ones
 * (library/similarity.js). Categories say what kind of thing it is, numbers
 * how strong, words what it is about.
 */

const castOf = (meta) => (meta?.cast === CastShape.SELF ? 'self' : meta?.cast === CastShape.ZONE ? 'zone' : 'line');

/**
 * A skill, from its live settings (a registered skill) or from a design
 * (`{ name, base, description }` from the Class forge — numbers then come
 * from the skill it is built on).
 */
export function skillFingerprint(id, design = null) {
  const meta = ELEMENT_META[id] ?? {};
  const base = design?.base ?? meta.base ?? id;
  const baseMeta = ELEMENT_META[base] ?? meta;
  const combat = settings.combat[id] ?? settings.combat[base] ?? {};
  const ability = settings[id] ?? settings[base] ?? {};
  const rage = baseMeta.rage ?? 0;
  return {
    cat: {
      base,
      cast: castOf(baseMeta),
      status: combat.status ?? 'none',
      physical: Boolean(baseMeta.physical),
      rage: rage > 0 || baseMeta.rageOnCast ? 'builds' : rage < 0 ? 'spends' : 'none'
    },
    num: {
      damage: combat.damage ?? 0,
      cooldown: ability.cooldown ?? 0,
      range: ability.range ?? 0,
      area: combat.radius || ability.zoneRadius || combat.width || 0,
      duration: combat.duration ?? 0
    },
    text: tokens(design?.name ?? meta.label ?? id, design?.description ?? meta.description ?? SKILL_INFO[id] ?? SKILL_INFO[base] ?? '')
  };
}

/** A class: its fighting style, resource, armor, bonuses, and the skills it is built from. */
export function classFingerprint(spec, skills = []) {
  const b = spec.bonuses ?? {};
  return {
    cat: { style: spec.style ?? spec.id, resource: spec.resource ?? 'none', armorClass: spec.armorClass ?? 'cloth' },
    num: { health: b.health ?? 0, armor: b.armor ?? 0, speed: b.speed ?? 0, damage: b.damage ?? 0, crit: b.crit ?? 0 },
    text: tokens(spec.label ?? spec.name, spec.tagline, ...skills.map((s) => `${s.name ?? ''} base${s.base ?? ''}`))
  };
}

/** A piece of gear (a base or a unique). */
export function gearFingerprint(base, extra = {}) {
  return {
    cat: { kind: base.kind, group: base.group },
    num: { ...base.implicit, ...extra },
    text: tokens(base.label, base.group, base.kind)
  };
}

/** A weapon, with its fire profile when it has one. */
export function weaponFingerprint(weapon, fire) {
  return {
    cat: { category: weapon.category, mode: fire?.mode ?? 'melee', kind: weapon.weight ?? 'medium' },
    num: fire ? { damage: fire.damage, range: fire.range, rate: 1 / Math.max(0.05, fire.cooldown), mag: fire.mag ?? 0, pierce: Math.min(3, fire.pierce ?? 0), explode: fire.explode ?? 0 } : {},
    text: tokens(weapon.label, weapon.description)
  };
}

/** A level: its goal, look and what fights in it. */
export function levelFingerprint(level) {
  const rules = level.rules ?? {};
  const kinds = rules.kinds ?? {};
  return {
    cat: { goal: rules.goal ?? 'waves', time: level.world?.timeOfDay ?? 'day', theme: level.world?.ground ?? 'grass' },
    num: { waves: rules.count ?? 0, monsters: Object.values(kinds).reduce((a, b) => a + b, 0) },
    text: tokens(level.name, level.story?.intro?.title, level.story?.intro?.text, Object.keys(kinds).filter((k) => kinds[k] > 0).join(' '))
  };
}
