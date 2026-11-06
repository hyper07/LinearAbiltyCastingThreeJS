import { Color } from 'three';
import { settings, DEFAULT_SETTINGS, ELEMENTS, ELEMENT_META, CastShape } from '../config/settings.js';
import { ABILITY_TYPES } from '../abilities/AbilityManager.js';
import { ELEMENT_SIGILS } from '../ui/glyphs.js';
import { ELEMENT_NAMES } from '../items/Items.js';
import { platform } from '../platform/index.js';
import { createSkill } from '../platform/skill/SkillDefinition.js';
import { SKILL_BY_ABILITY } from '../platform/skill/catalog.js';
import { createLoadout } from '../platform/loadout/Loadout.js';
import { CLASS_SPECS, LOOKS, makeClassCharacter } from '../platform/character/classes.js';
import { CLASS_TREES } from '../platform/skill/tree.js';
import { CHARACTER_ATTACK_KITS } from '../platform/attack/characterAttacks.js';

/**
 * The Class forge: turns a class *design* (usually written by the AI — see
 * ai/ClassDesigner.js) into a playable class.
 *
 * A design never invents new code. Every skill is built on one of the game's
 * hand-made abilities (its `base`) and inherits its effect, its shape, its
 * timing and its damage rules; the design gives it a name, a description and
 * a colour, and the forge re-tints the base's effect to that colour. The class
 * itself borrows its moves (body motion, melee kit, weapon) from a built-in
 * class (`style`). That is what keeps generated content playable and balanced:
 * the model chooses from parts that are known to work.
 *
 * A design, as saved in public/classes/<id>.json:
 *
 *   { version, id, name, icon, tagline, look, style, color, resource: 'none'|'rage',
 *     bonuses: { health, armor, speed, damage, cooldown, crit },
 *     prompt,                      // what the player asked for
 *     branches: [ { name, skills: [ { name, base, color, description } ×2 ] } ×3 ] }
 */

/** The hand-made abilities a skill can be built on, with what each one does. */
export const SKILL_BASES = {
  ice: 'line — a field of crystals erupts along a line and chills (slows)',
  thunder: 'line — a fast lightning strike down a line; brief stun',
  meteor: 'line — a burning rock lobbed to the end of the line; big blast, burns',
  beam: 'line — a charged column of light that holds and burns a line',
  snare: 'far-cast circle — a trap that roots everything inside it',
  glacier: 'far-cast circle — a ring of blades that freezes everything inside',
  chain: 'line — a bolt that leaps from enemy to enemy, up to five',
  orb: 'line — a slow orb that zaps nearby enemies, then bursts',
  hail: 'far-cast circle — a storm that hits everything inside for four seconds',
  blink: 'line — teleport down the line, cutting through everything passed',
  slam: 'line, physical — a ground-splitting strike along a line',
  rampage: 'line, physical — a charge: the body rushes down the line, knocking enemies aside',
  roar: 'around self, physical — a shout: stun everything near, +25% damage for a while',
  leap: 'far-cast circle, physical — leap through the air and crash down',
  tempest: 'around self, physical — spin, hitting everything around for a few seconds',
  quake: 'far-cast circle, physical — the ground at the point cracks and keeps shaking'
};

/** Built-in classes a design can borrow its body motion, melee kit and weapon from. */
export const STYLES = ['knight', 'mage', 'barbarian', 'amazon', 'shadowblade', 'templar', 'bonecaller', 'wildwarden'];

/* ---------------------------------------------------------------------- */
/* Colour                                                                  */
/* ---------------------------------------------------------------------- */

const _from = new Color();
const _to = new Color();
const _hslRef = { h: 0, s: 0, l: 0 };
const _hslTo = { h: 0, s: 0, l: 0 };
const _hsl = { h: 0, s: 0, l: 0 };

/** Shortest signed distance between two hues on the 0..1 wheel. */
const hueDelta = (a, b) => ((((b - a) % 1) + 1.5) % 1) - 0.5;

/**
 * Re-tint a settings block toward the target colour, keeping each colour's own
 * lightness — so a white-hot core stays white-hot and a dark smoke stays dark,
 * while every glow takes the new hue. A multi-coloured effect (the beam's cyan
 * sheath and gold ribbons) keeps a little of its spread around the new hue
 * (SPREAD), rather than all of it — which would leave it looking like the
 * original.
 */
const SPREAD = 0.3;
function retint(block, reference, target) {
  _from.set(reference).getHSL(_hslRef);
  _to.set(target).getHSL(_hslTo);
  for (const [key, value] of Object.entries(block)) {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) continue;
    _from.set(value).getHSL(_hsl);
    const h = _hslTo.h + hueDelta(_hslRef.h, _hsl.h) * SPREAD;
    // Greys stay grey; coloured parts take the target's saturation, blended.
    const s = _hsl.s < 0.08 ? _hsl.s : Math.min(1, _hsl.s * 0.4 + _hslTo.s * 0.6);
    _from.setHSL(((h % 1) + 1) % 1, s, _hsl.l);
    block[key] = `#${_from.getHexString()}`;
  }
  return block;
}

/* ---------------------------------------------------------------------- */
/* Skills                                                                  */
/* ---------------------------------------------------------------------- */

/** An ability class that is `Base` in every way except its id and settings. */
function variantOf(Base, id) {
  return class ForgedAbility extends Base {
    constructor(context) {
      super(context);
      this.element = id;
      this.group.name = `Ability:${id}`;
    }

    // Read while the base constructor builds its shaders, so it has to be a getter.
    get config() {
      return settings[id];
    }
  };
}

/**
 * Register one forged skill everywhere a skill has to be known.
 * @param {{ id: string, name: string, base: string, color: string, description: string, tier: number }} skill
 * @param {'none'|'rage'} resource
 * @param {import('../abilities/AbilityManager.js').AbilityManager} abilities
 */
function registerSkill(skill, resource, abilities) {
  const { id, base } = skill;
  const baseMeta = ELEMENT_META[base];
  const block = structuredClone(DEFAULT_SETTINGS[base] ?? settings[base]);
  settings[id] = retint(block, settings[base].lightColor ?? baseMeta.accent, skill.color);
  DEFAULT_SETTINGS[id] = structuredClone(settings[id]);
  settings.combat[id] = structuredClone(DEFAULT_SETTINGS.combat?.[base] ?? settings.combat[base]);

  // Rage only means something to a Rage class: elsewhere a spender could never be cast.
  const meta = { ...baseMeta, label: skill.name, hint: skill.name, accent: skill.color, base, description: skill.description, key: undefined };
  if (resource === 'rage') {
    if (!meta.rage && !meta.rageOnCast) meta.rage = skill.tier === 1 ? 6 : -30;
  } else {
    delete meta.rage;
    delete meta.rageOnCast;
  }
  ELEMENT_META[id] = meta;
  if (!ELEMENTS.includes(id)) ELEMENTS.push(id);
  ELEMENT_SIGILS[id] = ELEMENT_SIGILS[base];
  ELEMENT_NAMES[id] = skill.name;

  const baseSkill = SKILL_BY_ABILITY[base];
  platform.skills.register(
    `forged-${id}`,
    createSkill(`forged-${id}`, {
      label: skill.name,
      abilityId: id,
      castAnim: baseSkill?.castAnim ?? 'cast1',
      castShape: meta.cast ?? CastShape.LINE,
      accent: skill.color,
      hint: skill.name,
      physical: Boolean(meta.physical)
    })
  );
  abilities?.registerType(id, variantOf(ABILITY_TYPES[base], id));
}

/* ---------------------------------------------------------------------- */
/* Classes                                                                 */
/* ---------------------------------------------------------------------- */

/** Skill ids of a design, branch by branch: `<classId>-1` … `<classId>-6`. */
export function skillIds(design) {
  return design.branches.flatMap((branch, b) => branch.skills.map((_, t) => `${design.id}-${b * 2 + t + 1}`));
}

/**
 * Make a design playable: its skills, tree, loadout and character.
 * Registering the same id again replaces the class (used by Save after edits).
 *
 * @param {object} design a normalized design (ClassDesigner.normalize)
 * @param {{ abilities?: import('../abilities/AbilityManager.js').AbilityManager }} deps
 */
export function registerForgedClass(design, { abilities } = {}) {
  const ids = skillIds(design);
  design.branches.forEach((branch, b) =>
    branch.skills.forEach((skill, t) =>
      registerSkill({ ...skill, id: ids[b * 2 + t], tier: t + 1 }, design.resource, abilities)
    )
  );

  const style = CLASS_SPECS.find((c) => c.id === design.style) ?? CLASS_SPECS[0];
  const spec = {
    id: design.id,
    label: design.name,
    icon: design.icon,
    tagline: design.tagline,
    weapon: style.weapon,
    motion: style.motion,
    casting: style.casting,
    looks: [LOOKS[design.look] ? design.look : style.looks[0], ...style.looks.filter((l) => l !== design.look)],
    tint: design.color,
    attacks: style.attacks,
    bonuses: { ...design.bonuses },
    armorClass: style.armorClass,
    series: 'Created',
    forged: true
  };
  const at = CLASS_SPECS.findIndex((c) => c.id === spec.id);
  if (at >= 0) CLASS_SPECS[at] = spec;
  else CLASS_SPECS.push(spec);

  CLASS_TREES[design.id] = {
    start: [ids[0], ids[2]],
    resource: design.resource === 'rage' ? 'rage' : undefined,
    branches: design.branches.map((branch, b) => ({
      id: `b${b + 1}`,
      label: branch.name,
      accent: branch.skills[0].color,
      spells: [ids[b * 2], ids[b * 2 + 1]]
    }))
  };

  CHARACTER_ATTACK_KITS[design.id] = CHARACTER_ATTACK_KITS[style.id];
  platform.loadouts.register(
    `class-${design.id}`,
    createLoadout(`class-${design.id}`, { label: design.name, skills: ids.map((id) => `forged-${id}`), weapon: style.weapon })
  );
  platform.characters.register(design.id, makeClassCharacter(spec));
  return spec;
}

/** Take a forged class out of the menu (its skills stay registered; harmless). */
export function unregisterForgedClass(id) {
  const at = CLASS_SPECS.findIndex((c) => c.id === id && c.forged);
  if (at >= 0) CLASS_SPECS.splice(at, 1);
  delete CLASS_TREES[id];
  platform.characters.unregister(id);
  platform.loadouts.unregister(`class-${id}`);
}

/* ---------------------------------------------------------------------- */
/* Storage                                                                 */
/* ---------------------------------------------------------------------- */

/** Saved classes (public/classes), in order. */
export async function listForgedClasses() {
  try {
    const response = await fetch('./classes/index.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.classes) ? data.classes : [];
  } catch {
    return [];
  }
}

export async function loadForgedClass(id) {
  const response = await fetch(`./classes/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`class "${id}" not found`);
  return response.json();
}

export async function saveForgedClass(design) {
  const response = await fetch(`./api/classes/${encodeURIComponent(design.id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(design)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      response.status === 404 || response.status === 405
        ? 'Saving only works while running `npm run dev`.'
        : body.error ?? `HTTP ${response.status}`
    );
  }
  return body.classes ?? [];
}

export async function deleteForgedClass(id) {
  const response = await fetch(`./api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
