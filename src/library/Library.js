import { ELEMENT_META } from '../config/settings.js';
import { platform } from '../platform/index.js';
import { CLASS_SPECS } from '../platform/character/classes.js';
import { CLASS_TREES } from '../platform/skill/tree.js';
import { SKILL_INFO } from '../platform/skill/info.js';
import { fireProfileOf, describeFire } from '../platform/weapon/fire.js';
import { GEAR_BASES, GEAR_BASE_BY_ID, GEAR_UNIQUES, gearTypeLabel } from '../items/Gear.js';
import { classFingerprint, gearFingerprint, levelFingerprint, skillFingerprint, weaponFingerprint } from './fingerprints.js';

/**
 * The game's side of the shared content library (server/libraryStore.js).
 *
 * - `seedOfficial()` sends everything the game ships with — classes, skills,
 *   gear, weapons, campaign levels — as `official` assets, at start-up.
 * - `publishClass` / `publishLevel` save what a player made (`draft` or
 *   `shared`), with fingerprints so others find it.
 * - `similar(kind, fingerprint)` finds what already exists, so the Class
 *   forge can suggest an existing skill instead of making a near-copy.
 *
 * Everything goes through `/api/library`; when it is not there (a built game
 * without the dev server) every call quietly returns nothing.
 */

/** Levels that ship with the game (anything else in public/levels was made by a player). */
export const OFFICIAL_LEVELS = ['frost-hollow', 'thistledown', 'ember-ruins', 'the-wyrms-graveyard', 'dragons-keep', 'study-grove'];
export const OFFICIAL_AUTHOR = 'Gamory';
const NAME_KEY = 'elemental-arena.creator';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

async function api(path, options = {}) {
  try {
    const response = await fetch(`./api/library${path}`, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { error: data.error ?? `HTTP ${response.status}` };
    return data;
  } catch (error) {
    return { error: error.message, offline: true };
  }
}

export const library = {
  /** The name shown as the author of what you share. */
  get creator() {
    try {
      return localStorage.getItem(NAME_KEY) || 'Player';
    } catch {
      return 'Player';
    }
  },
  set creator(name) {
    try {
      localStorage.setItem(NAME_KEY, String(name).slice(0, 40));
    } catch {
      /* private mode */
    }
  },

  list: (params = {}) => api(`?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))}`),
  get: (id) => api(`/${encodeURIComponent(id)}`),
  save: (asset) => api('', { method: 'POST', body: asset }),
  setStatus: (id, status) => api(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
  remove: (id) => api(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  use: (id) => api(`/${encodeURIComponent(id)}/use`, { method: 'POST' }),
  /** @returns {Promise<{ id, kind, name, status, author, uses, score, parts }[]>} */
  async similar(kind, fingerprint, { exclude = [], limit = 5, min = 0.35 } = {}) {
    const r = await api('/similar', { method: 'POST', body: { kind, fingerprint, exclude, limit, min } });
    return r.similar ?? [];
  },

  /** Send the game's own content as official assets. */
  async seedOfficial(levels) {
    const assets = [...officialSkills(), ...officialClasses(), ...officialGear(), ...officialWeapons(), ...(await officialLevels(levels))];
    const r = await api('/seed', { method: 'POST', body: { assets } });
    return r.seeded ?? 0;
  },

  /**
   * Publish a Class-forge class and its new skills. Skills it reuses are
   * not copied — their `uses` count goes up instead.
   * @param {object} design a normalized design (ai/ClassDesigner.js)
   * @param {string[]} skillIds the ids its skills got (forge/ClassForge.js skillIds)
   * @param {'draft'|'shared'} status
   */
  async publishClass(design, skillIds, status = 'shared') {
    const author = design.author ?? this.creator;
    const skills = design.branches.flatMap((b) => b.skills);
    const results = [];
    for (const [i, skill] of skills.entries()) {
      const id = skillIds[i];
      if (skill.ref) {
        this.use(`skill:${skill.ref}`);
        continue;
      }
      results.push(
        this.save({
          id: `skill:${id}`, kind: 'skill', name: skill.name, summary: skill.description, author, status,
          parent: `skill:${skill.base}`,
          data: { id, name: skill.name, base: skill.base, color: skill.color, description: skill.description, resource: design.resource, fromClass: design.id },
          fingerprint: skillFingerprint(id, skill)
        })
      );
    }
    const spec = { id: design.id, label: design.name, tagline: design.tagline, style: design.style, resource: design.resource, armorClass: CLASS_SPECS.find((c) => c.id === design.style)?.armorClass, bonuses: design.bonuses };
    results.push(
      this.save({
        id: `class:${design.id}`, kind: 'class', name: design.name, summary: design.tagline ?? '', author, status,
        parent: `class:${design.style}`, data: design, fingerprint: classFingerprint(spec, skills)
      })
    );
    const done = await Promise.all(results);
    return done.at(-1);
  },

  /** Publish a level a player saved in the editor. */
  publishLevel(level, status = 'shared') {
    if (OFFICIAL_LEVELS.includes(level.id)) return Promise.resolve({ skipped: true });
    return this.save({
      id: `level:${level.id}`, kind: 'level', name: level.name ?? level.id, summary: level.story?.intro?.text?.slice(0, 280) ?? '',
      author: this.creator, status, data: { id: level.id, name: level.name }, fingerprint: levelFingerprint(level)
    });
  }
};

/* ---------------------------------------------------------------------- */
/* The official set                                                         */
/* ---------------------------------------------------------------------- */

function officialSkills() {
  return Object.keys(SKILL_INFO).map((id) => ({
    id: `skill:${id}`, kind: 'skill', name: ELEMENT_META[id]?.label ?? id, summary: SKILL_INFO[id], author: OFFICIAL_AUTHOR,
    data: { id, name: ELEMENT_META[id]?.label ?? id, base: id, color: ELEMENT_META[id]?.accent, description: SKILL_INFO[id] },
    fingerprint: skillFingerprint(id)
  }));
}

function officialClasses() {
  return CLASS_SPECS.filter((c) => !c.forged).map((c) => {
    const tree = CLASS_TREES[c.id];
    const skills = (tree?.branches ?? []).flatMap((b) => b.spells).map((id) => ({ name: ELEMENT_META[id]?.label, base: ELEMENT_META[id]?.base ?? id }));
    return {
      id: `class:${c.id}`, kind: 'class', name: c.label, summary: c.tagline ?? '', author: OFFICIAL_AUTHOR,
      data: { id: c.id, label: c.label, icon: c.icon, tagline: c.tagline, weapon: c.weapon, armorClass: c.armorClass, bonuses: c.bonuses, tree },
      fingerprint: classFingerprint({ ...c, style: c.id, resource: tree?.resource }, skills)
    };
  });
}

function officialGear() {
  const bases = GEAR_BASES.map((b) => ({
    id: `item:${b.id}`, kind: 'item', name: b.label, summary: gearTypeLabel(b), author: OFFICIAL_AUTHOR,
    data: { base: b.id, kind: b.kind, group: b.group, implicit: b.implicit }, fingerprint: gearFingerprint(b)
  }));
  const uniques = GEAR_UNIQUES.map((u) => {
    const base = GEAR_BASE_BY_ID[u.base];
    return {
      id: `item:unique-${slug(u.name)}`, kind: 'item', name: u.name, summary: `Unique ${gearTypeLabel(base).toLowerCase()}`, author: OFFICIAL_AUTHOR,
      data: { unique: u.name, base: u.base, stats: u.stats }, fingerprint: gearFingerprint(base, u.stats)
    };
  });
  return [...bases, ...uniques];
}

function officialWeapons() {
  return platform.weapons.all().map((w) => {
    const fire = fireProfileOf(w);
    return {
      id: `weapon:${w.id}`, kind: 'weapon', name: w.label, summary: `${w.description} — ${describeFire(fire)}`, author: OFFICIAL_AUTHOR,
      data: { id: w.id, category: w.category }, fingerprint: weaponFingerprint(w, fire)
    };
  });
}

async function officialLevels(levels) {
  const out = [];
  for (const id of OFFICIAL_LEVELS) {
    try {
      const level = await levels.load(id);
      out.push({
        id: `level:${id}`, kind: 'level', name: level.name ?? id, summary: level.story?.intro?.text?.slice(0, 280) ?? '', author: OFFICIAL_AUTHOR,
        data: { id, name: level.name }, fingerprint: levelFingerprint(level)
      });
    } catch {
      /* missing level file: skip */
    }
  }
  return out;
}
